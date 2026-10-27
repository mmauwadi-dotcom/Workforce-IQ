import { ChartDefinition, DashboardFilter, Dataset, KpiMetric } from '../types';
import { executeSqlQuery } from './sqlEngine';

export interface DashboardGenerationResult {
  kpis: KpiMetric[];
  charts: ChartDefinition[];
  filters: DashboardFilter[];
  activeFilterValues: Record<string, string>;
  totalFilteredRows: number;
}

// Format numbers according to KPI type
export function formatKpiValue(val: any, format: KpiMetric['format']): string {
  if (val === null || val === undefined) return 'N/A';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
  if (isNaN(num)) return String(val);

  if (format === 'currency') {
    if (Math.abs(num) >= 1_000_000) {
      return `$${(num / 1_000_000).toFixed(2)}M`;
    }
    if (Math.abs(num) >= 1_000) {
      return `$${(num / 1_000).toFixed(1)}k`;
    }
    return `$${num.toLocaleString()}`;
  }

  if (format === 'percent') {
    return `${num.toFixed(1)}%`;
  }

  if (format === 'number') {
    return num % 1 === 0 ? num.toLocaleString() : num.toFixed(2);
  }

  return String(val);
}

// Generate dataset-aware dashboard filters
export async function buildDashboardFilters(dataset: Dataset): Promise<DashboardFilter[]> {
  const filters: DashboardFilter[] = [];
  const includedCols = dataset.columns.filter((c) => c.includedInAnalysis);

  // Pick categorical columns with 2 to 25 distinct values
  const filterCandidates = includedCols.filter(
    (c) => (c.type === 'category' || c.type === 'boolean' || c.type === 'date') && c.distinctCount >= 2 && c.distinctCount <= 25
  );

  for (const col of filterCandidates.slice(0, 4)) {
    try {
      const sql = `SELECT DISTINCT \`${col.name}\` AS val FROM \`${dataset.tableName}\` WHERE \`${col.name}\` IS NOT NULL ORDER BY val ASC;`;
      const res = await executeSqlQuery(sql);
      if (res.rows && res.rows.length > 0) {
        const options = res.rows.map((r) => ({
          label: String(r.val),
          value: String(r.val),
        }));
        filters.push({
          id: `filter_${col.name}`,
          columnName: col.name,
          label: col.name.replace(/_/g, ' '),
          options,
          selectedValue: 'ALL',
        });
      }
    } catch (e) {
      console.warn(`Could not build filter for ${col.name}`, e);
    }
  }

  return filters;
}

// Build SQL WHERE clause from active filters, search query, and numeric ranges
export function buildFilterWhereClause(
  filters: DashboardFilter[],
  activeValues: Record<string, string>,
  searchQuery?: string,
  searchableCols: string[] = [],
  numericRanges?: Record<string, { min?: number; max?: number }>
): string {
  const conditions: string[] = [];

  // Categorical filters
  filters.forEach((f) => {
    const val = activeValues[f.id];
    if (val && val !== 'ALL') {
      const safeVal = val.replace(/'/g, "''");
      conditions.push(`\`${f.columnName}\` = '${safeVal}'`);
    }
  });

  // Numeric range filters
  if (numericRanges) {
    Object.entries(numericRanges).forEach(([colName, range]) => {
      if (range.min !== undefined && !isNaN(range.min)) {
        conditions.push(`\`${colName}\` >= ${range.min}`);
      }
      if (range.max !== undefined && !isNaN(range.max)) {
        conditions.push(`\`${colName}\` <= ${range.max}`);
      }
    });
  }

  // Universal text search filter across multiple columns
  if (searchQuery && searchQuery.trim() && searchableCols.length > 0) {
    const cleanSearch = searchQuery.trim().replace(/'/g, "''").toLowerCase();
    const searchConditions = searchableCols.map(
      (col) => `LOWER(CAST(\`${col}\` AS STRING)) LIKE '%${cleanSearch}%'`
    );
    conditions.push(`(${searchConditions.join(' OR ')})`);
  }

  return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
}

// Generate Dashboard (KPIs, Charts, Data)
export async function generateDynamicDashboard(
  dataset: Dataset,
  objectiveText: string,
  filters: DashboardFilter[],
  activeFilterValues: Record<string, string>,
  searchQuery?: string,
  numericRanges?: Record<string, { min?: number; max?: number }>,
  previousKpis?: KpiMetric[]
): Promise<DashboardGenerationResult> {
  const tableName = dataset.tableName;
  const cols = dataset.columns.filter((c) => c.includedInAnalysis);
  const searchableCols = cols
    .filter((c) => c.type === 'category' || c.type === 'identifier' || c.type === 'text')
    .map((c) => c.name);

  const whereClause = buildFilterWhereClause(
    filters,
    activeFilterValues,
    searchQuery,
    searchableCols,
    numericRanges
  );

  // 1. Total filtered count
  const countRes = await executeSqlQuery(`SELECT COUNT(*) AS total_count FROM \`${tableName}\` ${whereClause};`);
  const totalFilteredRows = countRes.rows?.[0]?.total_count || 0;

  const kpis: KpiMetric[] = [];
  const charts: ChartDefinition[] = [];
  const colNames = cols.map((c) => c.name);

  // Helper column finders
  const findCol = (predicate: (name: string) => boolean) =>
    cols.find((c) => predicate(c.name.toLowerCase()));

  // Previous KPI lookup for computing delta changes
  const getPreviousKpiValue = (id: string): number | null => {
    if (!previousKpis) return null;
    const prev = previousKpis.find((k) => k.id === id);
    if (!prev) return null;
    const num = typeof prev.value === 'number' ? prev.value : parseFloat(String(prev.value).replace(/[^0-9.-]+/g, ''));
    return isNaN(num) ? null : num;
  };

  const computeDelta = (id: string, currentVal: number) => {
    const prev = getPreviousKpiValue(id);
    if (prev === null || prev === 0) return { changePercent: undefined, trend: 'neutral' as const };
    const pct = ((currentVal - prev) / prev) * 100;
    return {
      changePercent: Math.round(pct * 10) / 10,
      trend: pct > 0 ? ('up' as const) : pct < 0 ? ('down' as const) : ('neutral' as const),
    };
  };

  // 1. Total Records / Headcount
  const isWorkforce = colNames.some((n) => /employee|attrition|tenure|absent|salary/i.test(n));
  const isFinance = colNames.some((n) => /revenue|profit|cogs|budget|variance|margin|expense/i.test(n));
  const isSales = colNames.some((n) => /deal|pipeline|stage|win_rate|probability/i.test(n));

  const volumeDelta = computeDelta('kpi_volume', totalFilteredRows);
  kpis.push({
    id: 'kpi_volume',
    title: isWorkforce ? 'Total Headcount' : isFinance ? 'Reported Records' : isSales ? 'Total Deals in Scope' : 'Total Records',
    value: totalFilteredRows,
    format: 'number',
    changePercent: volumeDelta.changePercent,
    trend: volumeDelta.trend,
    calculation: `COUNT(*) ${whereClause}`,
    status: 'normal',
    rationale: 'Active sample volume in filtered scope',
  });

  // Calculate domain-specific KPIs based on actual columns
  if (isWorkforce) {
    // Attrition Rate
    const attritionCol = findCol((n) => /attrition/i.test(n));
    if (attritionCol) {
      const attRes = await executeSqlQuery(
        `SELECT COUNT(*) AS att_count FROM \`${tableName}\` ${whereClause ? `${whereClause} AND` : 'WHERE'} (\`${attritionCol.name}\` = 'Yes' OR \`${attritionCol.name}\` = '1' OR \`${attritionCol.name}\` = true);`
      );
      const attCount = attRes.rows?.[0]?.att_count || 0;
      const attRate = totalFilteredRows > 0 ? (attCount / totalFilteredRows) * 100 : 0;
      const attDelta = computeDelta('kpi_attrition_rate', attRate);

      kpis.push({
        id: 'kpi_attrition_rate',
        title: 'Attrition Rate',
        value: attRate,
        format: 'percent',
        changePercent: attDelta.changePercent,
        trend: attDelta.trend,
        status: attRate > 15 ? 'alert' : attRate > 8 ? 'warning' : 'positive',
        calculation: `(COUNT(Attrition = 'Yes') / COUNT(*)) * 100`,
        rationale: 'Proportion of staff who have left the organisation in this reporting period',
      });
    }

    // Average Tenure
    const tenureCol = findCol((n) => /tenure/i.test(n));
    if (tenureCol) {
      const tenureRes = await executeSqlQuery(
        `SELECT ROUND(AVG(\`${tenureCol.name}\`), 1) AS avg_tenure FROM \`${tableName}\` ${whereClause};`
      );
      const avgTenure = tenureRes.rows?.[0]?.avg_tenure || 0;
      kpis.push({
        id: 'kpi_avg_tenure',
        title: 'Average Tenure',
        value: `${avgTenure} yrs`,
        format: 'text',
        calculation: `AVG(\`${tenureCol.name}\`)`,
        rationale: 'Average length of service in years',
      });
    }

    // Average Monthly Salary
    const salaryCol = findCol((n) => /monthly_salary|salary|annual_salary/i.test(n));
    if (salaryCol) {
      const salRes = await executeSqlQuery(
        `SELECT ROUND(AVG(\`${salaryCol.name}\`), 0) AS avg_sal, ROUND(SUM(\`${salaryCol.name}\`), 0) AS sum_sal FROM \`${tableName}\` ${whereClause};`
      );
      const avgSal = salRes.rows?.[0]?.avg_sal || 0;
      const salDelta = computeDelta('kpi_avg_salary', avgSal);
      kpis.push({
        id: 'kpi_avg_salary',
        title: `Average ${salaryCol.name.replace(/_/g, ' ')}`,
        value: avgSal,
        format: 'currency',
        changePercent: salDelta.changePercent,
        trend: salDelta.trend,
        calculation: `AVG(\`${salaryCol.name}\`)`,
        rationale: 'Benchmark compensation across evaluated employee cohort',
      });
    }

    // Absenteeism / Overtime
    const overtimeCol = findCol((n) => /overtime/i.test(n));
    if (overtimeCol) {
      const otRes = await executeSqlQuery(
        `SELECT ROUND(AVG(\`${overtimeCol.name}\`), 1) AS avg_ot FROM \`${tableName}\` ${whereClause};`
      );
      const avgOt = otRes.rows?.[0]?.avg_ot || 0;
      kpis.push({
        id: 'kpi_avg_overtime',
        title: 'Avg Overtime Hours',
        value: `${avgOt} hrs`,
        format: 'text',
        calculation: `AVG(\`${overtimeCol.name}\`)`,
        status: avgOt > 10 ? 'warning' : 'normal',
        rationale: 'Workload indicator correlated with retention pressure',
      });
    }
  } else if (isFinance) {
    const revCol = findCol((n) => /revenue|sales_amount/i.test(n));
    const profitCol = findCol((n) => /profit/i.test(n));
    const varianceCol = findCol((n) => /variance/i.test(n));
    const opexCol = findCol((n) => /opex|operating_expenses|cost/i.test(n));

    if (revCol) {
      const revRes = await executeSqlQuery(
        `SELECT ROUND(SUM(\`${revCol.name}\`), 0) AS total_rev FROM \`${tableName}\` ${whereClause};`
      );
      const totalRev = revRes.rows?.[0]?.total_rev || 0;
      const revDelta = computeDelta('kpi_total_rev', totalRev);
      kpis.push({
        id: 'kpi_total_rev',
        title: `Total ${revCol.name.replace(/_/g, ' ')}`,
        value: totalRev,
        format: 'currency',
        changePercent: revDelta.changePercent,
        trend: revDelta.trend,
        calculation: `SUM(\`${revCol.name}\`)`,
      });
    }

    if (profitCol) {
      const profitRes = await executeSqlQuery(
        `SELECT ROUND(SUM(\`${profitCol.name}\`), 0) AS total_profit FROM \`${tableName}\` ${whereClause};`
      );
      kpis.push({
        id: 'kpi_total_profit',
        title: `Total Gross Profit`,
        value: profitRes.rows?.[0]?.total_profit || 0,
        format: 'currency',
        calculation: `SUM(\`${profitCol.name}\`)`,
        status: 'positive',
      });
    }

    if (varianceCol) {
      const varRes = await executeSqlQuery(
        `SELECT ROUND(SUM(\`${varianceCol.name}\`), 0) AS total_var FROM \`${tableName}\` ${whereClause};`
      );
      const val = varRes.rows?.[0]?.total_var || 0;
      kpis.push({
        id: 'kpi_variance',
        title: 'Budget Variance',
        value: val,
        format: 'currency',
        status: val >= 0 ? 'positive' : 'alert',
        calculation: `SUM(\`${varianceCol.name}\`)`,
        rationale: 'Net difference between actual achievement and targeted budget',
      });
    }

    if (opexCol) {
      const opexRes = await executeSqlQuery(
        `SELECT ROUND(SUM(\`${opexCol.name}\`), 0) AS total_opex FROM \`${tableName}\` ${whereClause};`
      );
      kpis.push({
        id: 'kpi_opex',
        title: 'Operating Expenses',
        value: opexRes.rows?.[0]?.total_opex || 0,
        format: 'currency',
        calculation: `SUM(\`${opexCol.name}\`)`,
      });
    }
  } else if (isSales) {
    const dealValCol = findCol((n) => /deal_value|deal_size|value|amount/i.test(n));
    const stageCol = findCol((n) => /stage/i.test(n));

    if (dealValCol) {
      const pipeRes = await executeSqlQuery(
        `SELECT ROUND(SUM(\`${dealValCol.name}\`), 0) AS total_pipe, ROUND(AVG(\`${dealValCol.name}\`), 0) AS avg_deal FROM \`${tableName}\` ${whereClause};`
      );
      const totalPipe = pipeRes.rows?.[0]?.total_pipe || 0;
      const pipeDelta = computeDelta('kpi_pipeline', totalPipe);
      kpis.push({
        id: 'kpi_pipeline',
        title: 'Total Pipeline Value',
        value: totalPipe,
        format: 'currency',
        changePercent: pipeDelta.changePercent,
        trend: pipeDelta.trend,
        calculation: `SUM(\`${dealValCol.name}\`)`,
      });
      kpis.push({
        id: 'kpi_avg_deal',
        title: 'Average Deal Size',
        value: pipeRes.rows?.[0]?.avg_deal || 0,
        format: 'currency',
        calculation: `AVG(\`${dealValCol.name}\`)`,
      });
    }

    if (stageCol) {
      const wonRes = await executeSqlQuery(
        `SELECT COUNT(*) AS won_cnt FROM \`${tableName}\` ${whereClause ? `${whereClause} AND` : 'WHERE'} (\`${stageCol.name}\` = 'Closed Won' OR \`${stageCol.name}\` = 'Won');`
      );
      const wonCnt = wonRes.rows?.[0]?.won_cnt || 0;
      const winRate = totalFilteredRows > 0 ? (wonCnt / totalFilteredRows) * 100 : 0;
      kpis.push({
        id: 'kpi_win_rate',
        title: 'Closed-Won Win Rate',
        value: winRate,
        format: 'percent',
        status: winRate > 30 ? 'positive' : 'warning',
        calculation: `(COUNT(Closed Won) / Total Deals) * 100`,
      });
    }
  } else {
    // Generic fallback for any structured dataset
    const numCols = cols.filter((c) => c.type === 'number' || c.type === 'currency');
    for (const numCol of numCols.slice(0, 3)) {
      const res = await executeSqlQuery(
        `SELECT ROUND(SUM(\`${numCol.name}\`), 2) AS col_sum, ROUND(AVG(\`${numCol.name}\`), 2) AS col_avg FROM \`${tableName}\` ${whereClause};`
      );
      if (res.rows?.[0]) {
        kpis.push({
          id: `kpi_${numCol.name}_avg`,
          title: `Avg ${numCol.name.replace(/_/g, ' ')}`,
          value: res.rows[0].col_avg || 0,
          format: numCol.type === 'currency' ? 'currency' : 'number',
          calculation: `AVG(\`${numCol.name}\`)`,
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // 2. Interactive Charts Generation
  // -------------------------------------------------------------------------

  // Primary Category Breakdown Chart (Bar Chart)
  const catCol = cols.find((c) => c.type === 'category' && c.distinctCount >= 2 && c.distinctCount <= 15);
  const primaryNumeric = cols.find((c) => c.type === 'number' || c.type === 'currency');

  if (catCol) {
    let sql = '';
    let metricTitle = 'Count';
    if (primaryNumeric) {
      sql = `SELECT \`${catCol.name}\` AS label, COUNT(*) AS Record_Count, ROUND(AVG(\`${primaryNumeric.name}\`), 2) AS Average_Metric FROM \`${tableName}\` ${whereClause} GROUP BY \`${catCol.name}\` ORDER BY Record_Count DESC LIMIT 10;`;
      metricTitle = `Average ${primaryNumeric.name.replace(/_/g, ' ')}`;
    } else {
      sql = `SELECT \`${catCol.name}\` AS label, COUNT(*) AS Record_Count FROM \`${tableName}\` ${whereClause} GROUP BY \`${catCol.name}\` ORDER BY Record_Count DESC LIMIT 10;`;
    }

    const res = await executeSqlQuery(sql);
    if (res.rows && res.rows.length > 0) {
      charts.push({
        id: 'chart_category_breakdown',
        title: `Volume & Distribution by ${catCol.name.replace(/_/g, ' ')}`,
        chartType: 'bar',
        xAxisKey: 'label',
        series: [
          { dataKey: 'Record_Count', name: 'Records / Count', color: '#2563EB' },
          ...(primaryNumeric ? [{ dataKey: 'Average_Metric', name: metricTitle, color: '#60A5FA' }] : []),
        ],
        data: res.rows,
        purpose: `Compare categorical distribution and performance across ${catCol.name}`,
      });
    }
  }

  // Time Series Trend Chart (Line Chart) if Date Column exists
  const dateCol = cols.find((c) => c.type === 'date' || /month|date|period|year/i.test(c.name));
  if (dateCol) {
    let trendSql = '';
    if (primaryNumeric) {
      trendSql = `SELECT \`${dateCol.name}\` AS period, COUNT(*) AS Volume, ROUND(SUM(\`${primaryNumeric.name}\`), 2) AS Total_Value FROM \`${tableName}\` ${whereClause} GROUP BY \`${dateCol.name}\` ORDER BY period ASC LIMIT 15;`;
    } else {
      trendSql = `SELECT \`${dateCol.name}\` AS period, COUNT(*) AS Volume FROM \`${tableName}\` ${whereClause} GROUP BY \`${dateCol.name}\` ORDER BY period ASC LIMIT 15;`;
    }

    const trendRes = await executeSqlQuery(trendSql);
    if (trendRes.rows && trendRes.rows.length > 1) {
      charts.push({
        id: 'chart_timeline_trend',
        title: `Reporting Trend across ${dateCol.name.replace(/_/g, ' ')}`,
        chartType: 'line',
        xAxisKey: 'period',
        series: [
          { dataKey: 'Volume', name: 'Volume', color: '#1D4ED8' },
          ...(primaryNumeric ? [{ dataKey: 'Total_Value', name: `Total ${primaryNumeric.name.replace(/_/g, ' ')}`, color: '#3B82F6' }] : []),
        ],
        data: trendRes.rows,
        purpose: 'Analyze timeline trends, velocity, and seasonality',
      });
    }
  }

  // Secondary Cross-Tab / Composition (Pie Chart)
  const secondaryCat = cols.find((c) => (c.type === 'category' || c.type === 'boolean') && c.name !== catCol?.name && c.distinctCount >= 2 && c.distinctCount <= 6);
  if (secondaryCat) {
    const pieSql = `SELECT \`${secondaryCat.name}\` AS name, COUNT(*) AS value FROM \`${tableName}\` ${whereClause} GROUP BY \`${secondaryCat.name}\` ORDER BY value DESC;`;
    const pieRes = await executeSqlQuery(pieSql);
    if (pieRes.rows && pieRes.rows.length > 0) {
      charts.push({
        id: 'chart_composition_pie',
        title: `Composition by ${secondaryCat.name.replace(/_/g, ' ')}`,
        chartType: 'pie',
        xAxisKey: 'name',
        series: [{ dataKey: 'value', name: 'Share' }],
        data: pieRes.rows,
        purpose: `Part-to-whole categorical comparison for ${secondaryCat.name}`,
      });
    }
  }

  // Comparative Multi-Metric Bar Chart (replaces scatter plot)
  const numericCols = cols.filter((c) => c.type === 'number' || c.type === 'currency');
  if (numericCols.length >= 2) {
    const num1 = numericCols[0];
    const num2 = numericCols[1];
    // Find a grouping dimension such as Role, Department, Category, or Status
    const dimCol = cols.find(
      (c) => c.type === 'category' && c.name !== catCol?.name && c.distinctCount >= 2 && c.distinctCount <= 12
    ) || catCol;

    if (dimCol) {
      const barSql = `SELECT \`${dimCol.name}\` AS label, ROUND(AVG(\`${num1.name}\`), 2) AS Metric_1, ROUND(AVG(\`${num2.name}\`), 2) AS Metric_2 FROM \`${tableName}\` ${whereClause} GROUP BY \`${dimCol.name}\` ORDER BY Metric_1 DESC LIMIT 10;`;
      const barRes = await executeSqlQuery(barSql);
      if (barRes.rows && barRes.rows.length > 0) {
        charts.push({
          id: 'chart_comparative_metrics_bar',
          title: `Comparative Breakdown: ${num1.name.replace(/_/g, ' ')} & ${num2.name.replace(/_/g, ' ')} by ${dimCol.name.replace(/_/g, ' ')}`,
          chartType: 'bar',
          xAxisKey: 'label',
          series: [
            { dataKey: 'Metric_1', name: `Avg ${num1.name.replace(/_/g, ' ')}`, color: '#2563EB' },
            { dataKey: 'Metric_2', name: `Avg ${num2.name.replace(/_/g, ' ')}`, color: '#60A5FA' },
          ],
          data: barRes.rows,
          purpose: `Compare relative averages of ${num1.name} and ${num2.name} across ${dimCol.name}`,
        });
      }
    }
  }

  return {
    kpis,
    charts,
    filters,
    activeFilterValues,
    totalFilteredRows,
  };
}
