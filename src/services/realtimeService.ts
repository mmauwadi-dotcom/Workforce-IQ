import alasql from 'alasql';
import { Dataset, LiveEvent } from '../types';

// Generate a realistic new event for the active dataset schema
export function generateSyntheticEvent(dataset: Dataset): LiveEvent {
  const existingRows = dataset.rows;
  if (!existingRows || existingRows.length === 0) {
    throw new Error('Dataset has no records to base live event on.');
  }

  // Pick a random reference row to base realistic distributions on
  const baseRow = existingRows[Math.floor(Math.random() * existingRows.length)];
  const newRecord: Record<string, any> = { ...baseRow };

  const idCol = dataset.columns.find((c) => c.type === 'identifier');
  const dateCol = dataset.columns.find((c) => c.type === 'date');
  const now = new Date();
  const timestampStr = now.toISOString();

  // Generate unique ID
  if (idCol) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    newRecord[idCol.name] = `${idCol.name.slice(0, 3).toUpperCase()}-${randomSuffix}`;
  }

  // Set current date
  if (dateCol) {
    newRecord[dateCol.name] = timestampStr.slice(0, 10);
  }

  // Detect dataset domain and create realistic live variation
  const cols = dataset.columns.map((c) => c.name.toLowerCase());
  const isWorkforce = cols.some((c) => /employee|attrition|tenure|absent|salary/i.test(c));
  const isFinance = cols.some((c) => /revenue|profit|cogs|budget|variance|margin|expense/i.test(c));
  const isSales = cols.some((c) => /deal|pipeline|stage|win_rate|probability/i.test(c));
  const isSupport = cols.some((c) => /ticket|sla|csat|resolution/i.test(c));

  let summary = '';
  let eventType: LiveEvent['type'] = 'insert';

  if (isWorkforce) {
    const names = ['Jordan Lee', 'Taylor Morgan', 'Alex Chen', 'Casey Rivera', 'Samir Khan', 'Morgan Bailey'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const depts = ['Engineering', 'Sales', 'Customer Success', 'Product', 'Marketing', 'Finance'];
    const dept = depts[Math.floor(Math.random() * depts.length)];

    const nameCol = dataset.columns.find((c) => /name|full_name/i.test(c.name));
    if (nameCol) newRecord[nameCol.name] = randomName;

    const deptCol = dataset.columns.find((c) => /department/i.test(c.name));
    if (deptCol) newRecord[deptCol.name] = dept;

    const salaryCol = dataset.columns.find((c) => /salary/i.test(c.name));
    if (salaryCol && typeof newRecord[salaryCol.name] === 'number') {
      newRecord[salaryCol.name] = Math.round(newRecord[salaryCol.name] * (0.95 + Math.random() * 0.15));
    }

    const overtimeCol = dataset.columns.find((c) => /overtime/i.test(c.name));
    if (overtimeCol) {
      newRecord[overtimeCol.name] = Math.floor(Math.random() * 22);
    }

    summary = `New workforce record: ${randomName} added in ${dept} (${newRecord[idCol?.name || ''] || 'ID: Active'}).`;
  } else if (isFinance) {
    const revCol = dataset.columns.find((c) => /revenue/i.test(c.name));
    const profitCol = dataset.columns.find((c) => /profit/i.test(c.name));
    const varianceCol = dataset.columns.find((c) => /variance/i.test(c.name));

    if (revCol && typeof newRecord[revCol.name] === 'number') {
      const added = Math.round(35000 + Math.random() * 45000);
      newRecord[revCol.name] = added;
      if (profitCol) newRecord[profitCol.name] = Math.round(added * 0.42);
      if (varianceCol) newRecord[varianceCol.name] = Math.round(added * 0.08);
      summary = `Live revenue transaction: +$${added.toLocaleString()} logged in ${newRecord.Business_Unit || 'Unit'}.`;
    } else {
      summary = `New financial journal entry recorded at ${now.toLocaleTimeString()}.`;
    }
  } else if (isSales) {
    const stages = ['Discovery', 'Proposal Shared', 'Security Review', 'Negotiation', 'Closed Won'];
    const stage = stages[Math.floor(Math.random() * stages.length)];
    const dealCol = dataset.columns.find((c) => /deal_value|deal_size|value|amount/i.test(c.name));
    const stageCol = dataset.columns.find((c) => /stage/i.test(c.name));
    const value = dealCol && typeof newRecord[dealCol.name] === 'number'
      ? Math.round(20000 + Math.random() * 80000)
      : 45000;

    if (stageCol) newRecord[stageCol.name] = stage;
    if (dealCol) newRecord[dealCol.name] = value;

    eventType = stage === 'Closed Won' ? 'alert' : 'insert';
    summary = `Pipeline update: Deal ${newRecord[idCol?.name || ''] || ''} moved to "${stage}" ($${value.toLocaleString()}).`;
  } else if (isSupport) {
    const csatCol = dataset.columns.find((c) => /csat/i.test(c.name));
    if (csatCol) newRecord[csatCol.name] = [4, 5, 5, 3, 5][Math.floor(Math.random() * 5)];
    summary = `Live support incident resolved with CSAT ${newRecord[csatCol?.name || ''] || 5}/5.`;
  } else {
    // Generic modification
    dataset.columns.forEach((col) => {
      if (col.type === 'number' && typeof newRecord[col.name] === 'number') {
        newRecord[col.name] = Math.round(newRecord[col.name] * (0.9 + Math.random() * 0.2) * 100) / 100;
      }
    });
    summary = `Live telemetry event ingested into table "${dataset.tableName}".`;
  }

  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: timestampStr,
    type: eventType,
    summary,
    record: newRecord,
  };
}

// Ingest an event directly into the dataset and in-memory SQL database
export function ingestLiveEventIntoDataset(dataset: Dataset, event: LiveEvent): Dataset {
  const updatedRows = [event.record, ...dataset.rows];

  try {
    // Insert row into in-memory AlaSQL table
    if (alasql.tables[dataset.tableName]) {
      alasql.tables[dataset.tableName].data.unshift(event.record);
    }
  } catch (err) {
    console.warn(`Could not push into AlaSQL table ${dataset.tableName}:`, err);
  }

  return {
    ...dataset,
    rows: updatedRows,
    qualityReport: {
      ...dataset.qualityReport,
      totalRows: updatedRows.length,
    },
  };
}
