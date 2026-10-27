import Papa from 'papaparse';
import { AnalysisSession, SqlQueryResult } from '../types';

// Export arbitrary table rows to CSV download
export function exportToCsv(data: Record<string, any>[], filename: string): void {
  if (!data || data.length === 0) {
    alert('No data available to export.');
    return;
  }

  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export SQL query results to CSV
export function exportQueryResultToCsv(result: SqlQueryResult, queryTitle: string): void {
  const safeTitle = queryTitle.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  exportToCsv(result.rows, `query_result_${safeTitle || 'export'}.csv`);
}

// Export complete Analysis Session to JSON
export function exportSessionToJson(session: AnalysisSession): void {
  const jsonStr = JSON.stringify(session, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `workforceiq_session_${session.name.replace(/\s+/g, '_')}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Open printable formatted report in print preview
export function printExecutiveReport(session: AnalysisSession): void {
  window.print();
}
