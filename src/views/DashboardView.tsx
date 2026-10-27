import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Filter,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  FileSpreadsheet,
  Layers,
  Search,
  X,
  FileText,
  Printer,
  ChevronDown,
  ChevronUp,
  Radio,
  SlidersHorizontal,
  Zap,
  ArrowUpDown,
  Users,
} from 'lucide-react';
import {
  ChartDefinition,
  DashboardFilter,
  Dataset,
  ExecutiveInsights,
  KpiMetric,
} from '../types';
import { formatKpiValue } from '../services/dashboardGenerator';
import { exportToCsv, printExecutiveReport } from '../services/exportService';
import { EmployeeDetailsTable } from '../components/EmployeeDetailsTable';

interface DashboardViewProps {
  activeDataset: Dataset | null;
  kpis: KpiMetric[];
  charts: ChartDefinition[];
  filters: DashboardFilter[];
  activeFilterValues: Record<string, string>;
  onFilterChange: (filterId: string, value: string) => void;
  onResetFilters: () => void;
  // Search & advanced filtering
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  numericRanges: Record<string, { min?: number; max?: number }>;
  onNumericRangeChange: (colName: string, min?: number, max?: number) => void;
  onClearNumericRange: (colName: string) => void;
  // Real-time telemetry
  isRealtimeActive?: boolean;
  onToggleRealtime?: () => void;
  lastSyncTime?: string;
  liveEventsCount?: number;
  onTriggerLiveEvent?: () => void;
  // Standard actions
  insights?: ExecutiveInsights;
  onRefreshDashboard: () => void;
  isRefreshing: boolean;
  totalFilteredRows: number;
  objectiveSummary?: string;
}

const BLUE_PALETTE = ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#1D4ED8', '#1E40AF', '#64748B'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  activeDataset,
  kpis,
  charts,
  filters,
  activeFilterValues,
  onFilterChange,
  onResetFilters,
  searchQuery,
  onSearchQueryChange,
  numericRanges,
  onNumericRangeChange,
  onClearNumericRange,
  isRealtimeActive = false,
  onToggleRealtime,
  lastSyncTime,
  liveEventsCount = 0,
  onTriggerLiveEvent,
  insights,
  onRefreshDashboard,
  isRefreshing,
  totalFilteredRows,
  objectiveSummary,
}) => {
  const [activeTab, setActiveTab] = useState<'visuals' | 'employees' | 'insights' | 'table'>('visuals');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [tablePage, setTablePage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const pageSize = 15;

  const activeFilterCount =
    Object.values(activeFilterValues).filter((v) => v && v !== 'ALL').length +
    (searchQuery.trim() ? 1 : 0) +
    Object.keys(numericRanges).length;

  // Numeric columns available for range filtering
  const numericColumns = React.useMemo(() => {
    if (!activeDataset) return [];
    return activeDataset.columns.filter(
      (c) => (c.type === 'number' || c.type === 'currency') && c.min !== undefined && c.max !== undefined
    );
  }, [activeDataset]);

  // Filtered and sorted rows for the record table view
  const tableRows = React.useMemo(() => {
    if (!activeDataset) return [];
    let rows = [...activeDataset.rows];

    // Apply categorical filters
    filters.forEach((f) => {
      const selected = activeFilterValues[f.id];
      if (selected && selected !== 'ALL') {
        rows = rows.filter((r) => String(r[f.columnName]) === selected);
      }
    });

    // Apply numeric range filters
    Object.entries(numericRanges).forEach(([colName, range]) => {
      if (range.min !== undefined) {
        rows = rows.filter((r) => Number(r[colName]) >= range.min!);
      }
      if (range.max !== undefined) {
        rows = rows.filter((r) => Number(r[colName]) <= range.max!);
      }
    });

    // Apply dashboard search query
    const effectiveSearch = (tableSearch || searchQuery).trim().toLowerCase();
    if (effectiveSearch) {
      rows = rows.filter((r) =>
        Object.values(r).some((v) => String(v).toLowerCase().includes(effectiveSearch))
      );
    }

    // Apply sorting
    if (sortColumn) {
      rows.sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        return sortDirection === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return rows;
  }, [activeDataset, filters, activeFilterValues, numericRanges, tableSearch, searchQuery, sortColumn, sortDirection]);

  const totalTablePages = Math.ceil(tableRows.length / pageSize) || 1;
  const paginatedTableRows = tableRows.slice((tablePage - 1) * pageSize, tablePage * pageSize);

  const handleSort = (colName: string) => {
    if (sortColumn === colName) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(colName);
      setSortDirection('asc');
    }
  };

  const handleExportData = () => {
    if (!activeDataset) return;
    exportToCsv(tableRows, `${activeDataset.name.replace(/\.[^/.]+$/, '')}_filtered_export.csv`);
  };

  if (!activeDataset) {
    return (
      <div className="max-w-5xl mx-auto py-16 px-4 text-center">
        <div className="p-8 bg-white rounded-lg border border-[#E5E7EB] shadow-xs max-w-md mx-auto">
          <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h2 className="text-sm font-semibold text-[#111827]">No dataset loaded</h2>
          <p className="text-xs text-[#4B5563] mt-1">
            Please upload a dataset or select an enterprise template from the Overview page to generate your dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Real-time Monitoring & Objective Header Bar */}
      <div className="p-4 bg-white rounded-lg border border-[#E5E7EB] shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 mt-0.5 border border-blue-100">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider">
                Analytical Objective
              </span>
              {isRealtimeActive ? (
                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.2 rounded border border-emerald-200 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Real-time Ingestion Stream Active
                </span>
              ) : (
                <span className="text-[10px] bg-gray-100 text-[#4B5563] px-1.5 py-0.2 rounded border border-[#E5E7EB]">
                  Snapshot Mode
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-[#111827] mt-0.5">
              {objectiveSummary || 'Standard multidimensional dataset evaluation and monitoring.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onToggleRealtime && (
            <button
              onClick={onToggleRealtime}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                isRealtimeActive
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-white text-[#4B5563] border-[#E5E7EB] hover:bg-gray-50'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${isRealtimeActive ? 'text-emerald-600' : 'text-gray-400'}`} />
              <span>{isRealtimeActive ? 'Pause Stream' : 'Live Stream'}</span>
            </button>
          )}

          {isRealtimeActive && onTriggerLiveEvent && (
            <button
              onClick={onTriggerLiveEvent}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#2563EB] bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
              title="Simulate instant telemetry record"
            >
              <Zap className="w-3.5 h-3.5 fill-[#2563EB]" />
              <span>Inject Event</span>
            </button>
          )}

          <button
            onClick={() => printExecutiveReport({} as any)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#4B5563] bg-white border border-[#E5E7EB] rounded-md hover:bg-gray-50"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>
          <button
            onClick={handleExportData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#4B5563] bg-white border border-[#E5E7EB] rounded-md hover:bg-gray-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Dataset-Aware Multidimensional Filters & Search */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#2563EB]" />
            <span className="text-xs font-semibold text-[#111827] uppercase tracking-wider">
              Search & Filters
            </span>
            {activeFilterCount > 0 && (
              <span className="text-[10px] bg-blue-100 text-[#2563EB] font-bold px-1.5 py-0.2 rounded-full">
                {activeFilterCount} Active
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-[#4B5563]">
              Scope:{' '}
              <strong className="text-[#111827]">
                {totalFilteredRows.toLocaleString()} of {activeDataset.rows.length.toLocaleString()}
              </strong>{' '}
              records
            </span>
            {activeFilterCount > 0 && (
              <button
                onClick={onResetFilters}
                className="text-xs text-[#2563EB] hover:underline font-medium inline-flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset All</span>
              </button>
            )}
          </div>
        </div>

        {/* Search input + Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Quick Search */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-[#4B5563] block">
              Search within data
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="Filter by keyword..."
                className="w-full text-xs pl-7 pr-2 py-1.5 bg-white border border-[#E5E7EB] rounded-md text-[#111827] focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          {/* Categorical Dropdowns */}
          {filters.map((filter) => {
            const currentVal = activeFilterValues[filter.id] || 'ALL';
            return (
              <div key={filter.id} className="space-y-1">
                <label className="text-[11px] font-medium text-[#4B5563] block capitalize truncate">
                  {filter.label}
                </label>
                <select
                  value={currentVal}
                  onChange={(e) => onFilterChange(filter.id, e.target.value)}
                  className="w-full text-xs py-1.5 px-2 bg-white border border-[#E5E7EB] rounded-md text-[#111827] focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="ALL">All {filter.label}s</option>
                  {filter.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

        {/* Advanced Numeric Sliders Toggle */}
        {numericColumns.length > 0 && (
          <div className="pt-2 border-t border-[#E5E7EB]">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="text-xs text-[#2563EB] hover:underline font-medium inline-flex items-center gap-1"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{showAdvancedFilters ? 'Hide Numeric Range Filters' : '+ Numerical Range Filters (Min / Max)'}</span>
            </button>

            {showAdvancedFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-3 bg-gray-50/70 p-3 rounded-md border border-[#E5E7EB] mt-2">
                {numericColumns.slice(0, 3).map((col) => {
                  const currentRange = numericRanges[col.name] || {};
                  return (
                    <div key={col.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-[#111827]">{col.name.replace(/_/g, ' ')}</span>
                        {currentRange.min !== undefined && (
                          <button
                            onClick={() => onClearNumericRange(col.name)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            &times; clear
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder={`Min (${col.min})`}
                          value={currentRange.min ?? ''}
                          onChange={(e) =>
                            onNumericRangeChange(
                              col.name,
                              e.target.value ? Number(e.target.value) : undefined,
                              currentRange.max
                            )
                          }
                          className="w-1/2 text-xs p-1.5 bg-white border border-[#E5E7EB] rounded text-[#111827]"
                        />
                        <span className="text-gray-400 text-xs">-</span>
                        <input
                          type="number"
                          placeholder={`Max (${col.max})`}
                          value={currentRange.max ?? ''}
                          onChange={(e) =>
                            onNumericRangeChange(
                              col.name,
                              currentRange.min,
                              e.target.value ? Number(e.target.value) : undefined
                            )
                          }
                          className="w-1/2 text-xs p-1.5 bg-white border border-[#E5E7EB] rounded text-[#111827]"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Active Filter Pills Bar */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2">
            <span className="text-[11px] text-[#4B5563] font-medium mr-1">Active:</span>
            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-50 text-[#2563EB] border border-blue-200">
                <span>Keyword: "{searchQuery}"</span>
                <button onClick={() => onSearchQueryChange('')} className="hover:opacity-75">
                  &times;
                </button>
              </span>
            )}
            {filters.map((f) => {
              const val = activeFilterValues[f.id];
              if (!val || val === 'ALL') return null;
              return (
                <span
                  key={f.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 text-[#111827] border border-[#E5E7EB]"
                >
                  <span className="font-semibold">{f.label}:</span>
                  <span>{val}</span>
                  <button onClick={() => onFilterChange(f.id, 'ALL')} className="hover:text-red-500">
                    &times;
                  </button>
                </span>
              );
            })}
            {Object.entries(numericRanges).map(([col, range]) => (
              <span
                key={col}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 text-[#111827] border border-[#E5E7EB]"
              >
                <span className="font-semibold">{col}:</span>
                <span>
                  {range.min ?? '*'} to {range.max ?? '*'}
                </span>
                <button onClick={() => onClearNumericRange(col)} className="hover:text-red-500">
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Dynamic KPI Cards Section with Live Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.id}
            className="p-5 bg-white rounded-lg border border-[#E5E7EB] shadow-xs relative overflow-hidden transition-all hover:border-gray-300"
          >
            <div className="flex items-center justify-between text-xs text-[#4B5563]">
              <span className="font-semibold uppercase tracking-wider text-[11px] truncate">
                {kpi.title}
              </span>
              <div className="flex items-center gap-1.5">
                {isRealtimeActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" title="Live streaming metric"></span>
                )}
                {kpi.status === 'alert' ? (
                  <span className="w-2 h-2 rounded-full bg-red-500" title="Exceeds threshold"></span>
                ) : kpi.status === 'warning' ? (
                  <span className="w-2 h-2 rounded-full bg-amber-500" title="Watch item"></span>
                ) : kpi.status === 'positive' ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Favorable"></span>
                ) : null}
              </div>
            </div>

            <div className="text-2xl font-bold text-[#111827] mt-2 tracking-tight flex items-baseline gap-2">
              <span>{formatKpiValue(kpi.value, kpi.format)}</span>
              {kpi.changePercent !== undefined && kpi.changePercent !== 0 && (
                <span
                  className={`text-xs font-semibold flex items-center ${
                    kpi.changePercent > 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {kpi.changePercent > 0 ? (
                    <TrendingUp className="w-3 h-3 mr-0.5" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-0.5" />
                  )}
                  {Math.abs(kpi.changePercent).toFixed(1)}%
                </span>
              )}
            </div>

            <div className="mt-2 text-[11px] text-[#4B5563] truncate" title={kpi.rationale || kpi.calculation}>
              {kpi.rationale || `Formula: ${kpi.calculation}`}
            </div>
          </div>
        ))}
      </div>

      {/* Tab Navigation for Dashboard Views */}
      <div className="border-b border-[#E5E7EB] flex flex-wrap items-center gap-6 text-xs font-medium">
        <button
          onClick={() => setActiveTab('visuals')}
          className={`py-3 border-b-2 transition-colors ${
            activeTab === 'visuals'
              ? 'border-[#2563EB] text-[#2563EB]'
              : 'border-transparent text-[#4B5563] hover:text-[#111827]'
          }`}
        >
          Visual Analytics ({charts.length})
        </button>
        <button
          onClick={() => setActiveTab('employees')}
          className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'employees'
              ? 'border-[#2563EB] text-[#2563EB]'
              : 'border-transparent text-[#4B5563] hover:text-[#111827]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Employee Details Table</span>
          <span className="font-mono bg-blue-50 text-[#2563EB] px-1.5 py-0.2 rounded text-[10px] font-bold border border-blue-200">
            {tableRows.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('insights')}
          className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'insights'
              ? 'border-[#2563EB] text-[#2563EB]'
              : 'border-transparent text-[#4B5563] hover:text-[#111827]'
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5" />
          <span>Insights & Recommendations</span>
        </button>
        <button
          onClick={() => setActiveTab('table')}
          className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'table'
              ? 'border-[#2563EB] text-[#2563EB]'
              : 'border-transparent text-[#4B5563] hover:text-[#111827]'
          }`}
        >
          <span>Record Drill-Down</span>
          <span className="font-mono bg-gray-100 text-[#4B5563] px-1.5 py-0.2 rounded text-[10px]">
            {tableRows.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Visual Charts */}
      {activeTab === 'visuals' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {charts.map((chart) => (
              <div
                key={chart.id}
                className="bg-white rounded-lg border border-[#E5E7EB] p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-[#111827] uppercase tracking-wider">
                      {chart.title}
                    </h3>
                    <span className="text-[10px] text-gray-400 font-mono uppercase">
                      {chart.chartType}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#4B5563] mt-1">{chart.purpose}</p>
                </div>

                <div className="h-64 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    {chart.chartType === 'line' ? (
                      <LineChart data={chart.data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis
                          dataKey={chart.xAxisKey}
                          tick={{ fontSize: 11, fill: '#4B5563' }}
                          tickLine={false}
                          axisLine={{ stroke: '#E2E8F0' }}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#4B5563' }}
                          tickLine={false}
                          axisLine={{ stroke: '#E2E8F0' }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            borderColor: '#E2E8F0',
                            fontSize: 12,
                            borderRadius: 6,
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                        {chart.series.map((s, idx) => (
                          <Line
                            key={s.dataKey}
                            type="monotone"
                            dataKey={s.dataKey}
                            name={s.name}
                            stroke={s.color || BLUE_PALETTE[idx % BLUE_PALETTE.length]}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        ))}
                      </LineChart>
                    ) : chart.chartType === 'pie' ? (
                      <PieChart>
                        <Pie
                          data={chart.data}
                          dataKey={chart.series[0]?.dataKey || 'value'}
                          nameKey={chart.xAxisKey}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={45}
                          paddingAngle={2}
                          label={({ name, percent }: { name?: string; percent?: number }) =>
                            `${name ?? ''} (${((percent ?? 0) * 100).toFixed(0)}%)`
                          }
                          labelLine={false}
                        >
                          {chart.data.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={BLUE_PALETTE[index % BLUE_PALETTE.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            borderColor: '#E2E8F0',
                            fontSize: 12,
                            borderRadius: 6,
                          }}
                        />
                      </PieChart>
                    ) : (
                      <BarChart data={chart.data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis
                          dataKey={chart.xAxisKey}
                          tick={{ fontSize: 11, fill: '#4B5563' }}
                          tickLine={false}
                          axisLine={{ stroke: '#E2E8F0' }}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#4B5563' }}
                          tickLine={false}
                          axisLine={{ stroke: '#E2E8F0' }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            borderColor: '#E2E8F0',
                            fontSize: 12,
                            borderRadius: 6,
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                        {chart.series.map((s, idx) => (
                          <Bar
                            key={s.dataKey}
                            dataKey={s.dataKey}
                            name={s.name}
                            fill={s.color || BLUE_PALETTE[idx % BLUE_PALETTE.length]}
                            radius={[3, 3, 0, 0]}
                          />
                        ))}
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Insights & Recommendations */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          {insights ? (
            <>
              {/* Key Findings */}
              <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 shadow-xs">
                <h3 className="text-xs font-semibold text-[#111827] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2563EB]" />
                  <span>Key Analytical Findings</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insights.keyFindings.map((finding, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-md border border-[#E5E7EB] bg-gray-50/50 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#111827]">{finding.title}</span>
                          <span className="text-xs font-bold text-[#2563EB] font-mono">{finding.metric}</span>
                        </div>
                        <p className="text-xs text-[#4B5563] mt-2">{finding.description}</p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-[#E5E7EB]/50 text-[10px] text-gray-400">
                        Evidence confirmed via SQL aggregation
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trends & Patterns + Anomalies */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 shadow-xs">
                  <h3 className="text-xs font-semibold text-[#111827] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>Trends & Patterns</span>
                  </h3>
                  <ul className="space-y-2 text-xs text-[#4B5563]">
                    {insights.trendsAndPatterns.map((t, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 shadow-xs">
                  <h3 className="text-xs font-semibold text-[#111827] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>Exceptions & Anomalies</span>
                  </h3>
                  <ul className="space-y-2 text-xs text-[#4B5563]">
                    {insights.anomaliesAndQuality.map((a, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Business Risks */}
              <div className="bg-white rounded-lg border border-red-200 bg-red-50/20 p-6 shadow-xs">
                <h3 className="text-xs font-semibold text-red-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>Identified Business Risks</span>
                </h3>
                <ul className="space-y-2 text-xs text-[#4B5563]">
                  {insights.businessRisks.map((r, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-[#111827]">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0"></span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actionable Recommendations */}
              <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 shadow-xs">
                <h3 className="text-xs font-semibold text-[#111827] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-[#2563EB]" />
                  <span>Recommended Next Steps & Strategic Actions</span>
                </h3>

                <div className="space-y-3">
                  {insights.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-md border border-[#E5E7EB] bg-white hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#111827]">{rec.action}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded uppercase font-semibold ${
                            rec.priority === 'HIGH'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {rec.priority} Priority
                        </span>
                      </div>
                      <p className="text-xs text-[#4B5563] mt-1.5">
                        <strong className="text-[#111827]">Rationale:</strong> {rec.rationale}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center bg-white border border-[#E5E7EB] rounded-lg">
              <p className="text-xs text-[#4B5563]">
                Insights report is currently computing. Click "Refresh" or trigger analysis from Overview to generate.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Employee Details Table */}
      {activeTab === 'employees' && (
        <EmployeeDetailsTable rows={tableRows} tableName={activeDataset.tableName} />
      )}

      {/* TAB 4: Record Drill-Down Table with Sorting & Highlights */}
      {activeTab === 'table' && (
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => {
                  setTableSearch(e.target.value);
                  setTablePage(1);
                }}
                placeholder="Search filtered table records..."
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-[#E5E7EB] rounded-md text-[#111827] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-[#4B5563]">
                Click column headers to sort &bull; {tableRows.length} matching records
              </span>
              <button
                onClick={handleExportData}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#4B5563] bg-white border border-[#E5E7EB] rounded-md hover:bg-gray-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <div className="border border-[#E5E7EB] rounded-md overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 border-b border-[#E5E7EB] text-[#4B5563] font-semibold select-none">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center border-r border-[#E5E7EB]">#</th>
                  {activeDataset.columns
                    .filter((c) => c.includedInAnalysis)
                    .map((col) => {
                      const isSorted = sortColumn === col.name;
                      return (
                        <th
                          key={col.name}
                          onClick={() => handleSort(col.name)}
                          className="py-2.5 px-3 font-medium whitespace-nowrap cursor-pointer hover:bg-gray-100/70 transition-colors"
                          title="Click to sort by this column"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{col.name}</span>
                            {isSorted ? (
                              sortDirection === 'asc' ? (
                                <ChevronUp className="w-3 h-3 text-[#2563EB]" />
                              ) : (
                                <ChevronDown className="w-3 h-3 text-[#2563EB]" />
                              )
                            ) : (
                              <ArrowUpDown className="w-2.5 h-2.5 text-gray-300" />
                            )}
                          </div>
                        </th>
                      );
                    })}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-[#111827]">
                {paginatedTableRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-2 px-3 text-center text-gray-400 font-mono text-[11px] border-r border-[#E5E7EB]">
                      {(tablePage - 1) * pageSize + idx + 1}
                    </td>
                    {activeDataset.columns
                      .filter((c) => c.includedInAnalysis)
                      .map((col) => {
                        const cellVal = row[col.name];
                        const textStr = cellVal !== null && cellVal !== undefined ? String(cellVal) : '';
                        const isMatch =
                          (tableSearch || searchQuery).trim() &&
                          textStr.toLowerCase().includes((tableSearch || searchQuery).trim().toLowerCase());

                        return (
                          <td
                            key={col.name}
                            className={`py-2 px-3 whitespace-nowrap font-mono text-[11px] ${
                              isMatch ? 'bg-amber-50 font-semibold text-amber-900' : ''
                            }`}
                          >
                            {cellVal !== null && cellVal !== undefined ? (
                              textStr
                            ) : (
                              <span className="text-gray-300 italic">null</span>
                            )}
                          </td>
                        );
                      })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalTablePages > 1 && (
            <div className="flex items-center justify-between text-xs text-[#4B5563] pt-2">
              <button
                disabled={tablePage <= 1}
                onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 border border-[#E5E7EB] rounded-md hover:bg-gray-50 disabled:opacity-40"
              >
                &larr; Previous
              </button>
              <span>
                Page {tablePage} of {totalTablePages} ({tableRows.length} total rows)
              </span>
              <button
                disabled={tablePage >= totalTablePages}
                onClick={() => setTablePage((p) => Math.min(totalTablePages, p + 1))}
                className="px-3 py-1 border border-[#E5E7EB] rounded-md hover:bg-gray-50 disabled:opacity-40"
              >
                Next &rarr;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
