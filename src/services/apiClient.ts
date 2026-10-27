// API client communicating with WorkforceIQ backend /api/ai routes

export async function interpretObjectiveApi(payload: {
  objective: string;
  businessQuestions?: string;
  targets?: string;
  schema: any[];
  sampleRows: any[];
  rowCount: number;
}) {
  const res = await fetch('/api/ai/interpret-objective', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to interpret objective: ${res.statusText}`);
  }
  return await res.json();
}

export async function generateSqlApi(payload: {
  question: string;
  tableName: string;
  schema: any[];
  sampleRows: any[];
}) {
  const res = await fetch('/api/ai/generate-sql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to generate SQL: ${res.statusText}`);
  }
  return await res.json();
}

export async function askAnalystApi(payload: {
  question: string;
  tableName: string;
  schema: any[];
  queryResults?: any;
  history?: any[];
}) {
  const res = await fetch('/api/ai/ask-analyst', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to query AI analyst: ${res.statusText}`);
  }
  return await res.json();
}

export async function generateInsightsApi(payload: {
  objective: string;
  kpis: any[];
  topAggregates: any[];
  schema: any[];
  tableName: string;
}) {
  const res = await fetch('/api/ai/generate-insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to generate insights: ${res.statusText}`);
  }
  return await res.json();
}
