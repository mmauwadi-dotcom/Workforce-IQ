export type ColumnDataType =
  | 'number'
  | 'currency'
  | 'percentage'
  | 'date'
  | 'category'
  | 'identifier'
  | 'boolean'
  | 'text';

export interface ColumnProfile {
  name: string;
  type: ColumnDataType;
  inferredDescription: string;
  nullCount: number;
  distinctCount: number;
  sampleValues: (string | number | boolean)[];
  min?: number | string;
  max?: number | string;
  mean?: number;
  isPrimaryKeyCandidate?: boolean;
  includedInAnalysis: boolean;
}

export interface DataQualityReport {
  totalRows: number;
  totalColumns: number;
  duplicateRows: number;
  missingCells: number;
  missingPercentage: number;
  potentialIssues: {
    column?: string;
    issue: string;
    severity: 'low' | 'medium' | 'high';
    remediation: string;
  }[];
  primaryKeyCandidate?: string;
}

export interface Dataset {
  id: string;
  name: string;
  sourceType: 'csv' | 'excel' | 'json' | 'connected';
  uploadedAt: string;
  sheetNames?: string[];
  selectedSheet?: string;
  columns: ColumnProfile[];
  rows: Record<string, any>[];
  qualityReport: DataQualityReport;
  tableName: string; // SQL safe table identifier
}

export interface BusinessObjective {
  objective: string;
  businessQuestions?: string;
  targetsOrRules?: string;
  reportingPeriod?: string;
  timestamp: string;
}

export interface KpiMetric {
  id: string;
  title: string;
  value: number | string;
  unit?: string;
  format: 'number' | 'currency' | 'percent' | 'text';
  changePercent?: number;
  trend?: 'up' | 'down' | 'neutral';
  calculation: string;
  rationale?: string;
  status?: 'normal' | 'warning' | 'alert' | 'positive';
}

export interface ChartSeries {
  dataKey: string;
  name: string;
  color?: string;
}

export interface ChartDefinition {
  id: string;
  title: string;
  chartType: 'bar' | 'stacked_bar' | 'line' | 'area' | 'pie' | 'scatter' | 'histogram' | 'table';
  xAxisKey: string;
  yAxisKey?: string;
  series: ChartSeries[];
  data: Record<string, any>[];
  purpose: string;
  description?: string;
}

export interface DashboardFilter {
  id: string;
  columnName: string;
  label: string;
  options: { label: string; value: string }[];
  selectedValue: string; // 'ALL' or specific value
}

export interface ExecutiveInsights {
  keyFindings: {
    title: string;
    metric: string;
    description: string;
    impact: 'HIGH' | 'MEDIUM' | 'POSITIVE';
  }[];
  trendsAndPatterns: string[];
  anomaliesAndQuality: string[];
  businessRisks: string[];
  recommendations: {
    action: string;
    rationale: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  }[];
}

export interface SqlQueryResult {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  executionTimeMs: number;
  error?: string;
}

export interface SqlHistoryItem {
  id: string;
  sql: string;
  explanation: string;
  executedAt: string;
  rowCount: number;
  executionTimeMs: number;
  success: boolean;
  error?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  suggestedSql?: string;
  executedQueryResult?: SqlQueryResult;
  followUpQuestions?: string[];
  limitations?: string;
}

export interface AnalysisSession {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  datasetName: string;
  datasetId: string;
  rowCount: number;
  columnCount: number;
  objective: BusinessObjective;
  kpis: KpiMetric[];
  charts: ChartDefinition[];
  insights?: ExecutiveInsights;
  savedSqlQueries: SqlHistoryItem[];
  chatHistory: ChatMessage[];
  status: 'completed' | 'in_progress' | 'failed';
}

export interface ProposedJoin {
  leftDatasetId: string;
  rightDatasetId: string;
  leftColumn: string;
  rightColumn: string;
  relationshipType: 'one-to-one' | 'one-to-many' | 'many-to-many';
  confidenceScore: number;
  explanation: string;
  confirmed: boolean;
}

export interface LiveEvent {
  id: string;
  timestamp: string;
  type: 'insert' | 'update' | 'alert';
  summary: string;
  record: Record<string, any>;
}

export interface RealtimeConfig {
  enabled: boolean;
  intervalSeconds: number;
  lastSyncTime: string;
  autoSimulate: boolean;
  eventsCount: number;
}

export interface NumericFilterRange {
  columnName: string;
  label: string;
  min: number;
  max: number;
  currentMin: number;
  currentMax: number;
}
