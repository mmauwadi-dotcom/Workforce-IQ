import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  Copy,
  Sparkles,
  Check,
  AlertCircle,
  Clock,
  Database,
  Download,
  Bookmark,
  ShieldCheck,
  Code2,
} from 'lucide-react';
import { Dataset, SqlHistoryItem, SqlQueryResult } from '../types';
import { executeSqlQuery } from '../services/sqlEngine';
import { generateSqlApi } from '../services/apiClient';
import { exportQueryResultToCsv } from '../services/exportService';

interface SqlQueryLabViewProps {
  activeDataset: Dataset | null;
  savedQueries: SqlHistoryItem[];
  onSaveQuery: (item: SqlHistoryItem) => void;
  onDeleteSavedQuery: (id: string) => void;
}

export const SqlQueryLabView: React.FC<SqlQueryLabViewProps> = ({
  activeDataset,
  savedQueries,
  onSaveQuery,
  onDeleteSavedQuery,
}) => {
  const [sqlInput, setSqlInput] = useState('');
  const [naturalLanguageQuestion, setNaturalLanguageQuestion] = useState('');
  const [explanation, setExplanation] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<SqlQueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isGeneratingSql, setIsGeneratingSql] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resultPage, setResultPage] = useState(1);
  const pageSize = 15;

  // Initialize with a default query when dataset changes
  useEffect(() => {
    if (activeDataset && !sqlInput) {
      const defaultSql = `SELECT * FROM \`${activeDataset.tableName}\` LIMIT 15;`;
      setSqlInput(defaultSql);
      setExplanation(`Retrieves the first 15 records from table ${activeDataset.tableName}.`);
    }
  }, [activeDataset]);

  const handleRunQuery = async () => {
    if (!sqlInput.trim()) return;
    setIsExecuting(true);
    setQueryResult(null);
    setResultPage(1);

    const result = await executeSqlQuery(sqlInput);
    setQueryResult(result);
    setIsExecuting(false);

    // Save to query history if successful
    if (!result.error && activeDataset) {
      onSaveQuery({
        id: `query_${Date.now()}`,
        sql: sqlInput.trim(),
        explanation: explanation || 'User-executed custom query',
        executedAt: new Date().toISOString(),
        rowCount: result.rowCount,
        executionTimeMs: result.executionTimeMs,
        success: true,
      });
    }
  };

  const handleGenerateSql = async () => {
    if (!activeDataset) return;
    if (!naturalLanguageQuestion.trim()) return;

    setIsGeneratingSql(true);
    try {
      const resp = await generateSqlApi({
        question: naturalLanguageQuestion,
        tableName: activeDataset.tableName,
        schema: activeDataset.columns.map((c) => ({
          name: c.name,
          type: c.type,
          description: c.inferredDescription,
        })),
        sampleRows: activeDataset.rows.slice(0, 3),
      });

      if (resp.sql) {
        setSqlInput(resp.sql);
        setExplanation(resp.explanation);
      }
    } catch (err: any) {
      console.warn('Fallback to local SQL generator:', err);
      // Local fallback
      const cat = activeDataset.columns.find((c) => c.type === 'category')?.name || activeDataset.columns[0]?.name;
      const num = activeDataset.columns.find((c) => c.type === 'number' || c.type === 'currency')?.name;
      const fallback = `SELECT \`${cat}\`, COUNT(*) AS Volume${num ? `, ROUND(AVG(\`${num}\`), 2) AS Avg_${num}` : ''} FROM \`${activeDataset.tableName}\` GROUP BY \`${cat}\` ORDER BY Volume DESC LIMIT 20;`;
      setSqlInput(fallback);
      setExplanation(`Aggregates volume by ${cat} and computes benchmarks from available records.`);
    } finally {
      setIsGeneratingSql(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlInput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearSql = () => {
    setSqlInput('');
    setExplanation(null);
    setQueryResult(null);
  };

  // Pagination for query results
  const totalResultPages = queryResult ? Math.ceil(queryResult.rows.length / pageSize) || 1 : 1;
  const paginatedResultRows = queryResult ? queryResult.rows.slice((resultPage - 1) * pageSize, resultPage * pageSize) : [];

  if (!activeDataset) {
    return (
      <div className="max-w-5xl mx-auto py-16 px-4 text-center">
        <div className="p-8 bg-white rounded-lg border border-[#E5E7EB] shadow-xs max-w-md mx-auto">
          <Database className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h2 className="text-sm font-semibold text-[#111827]">No active dataset</h2>
          <p className="text-xs text-[#4B5563] mt-1">
            Please upload a dataset or select an enterprise template to run SQL queries in the lab.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* AI Query Generator Input */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-[#2563EB]" />
          <h2 className="text-xs font-semibold text-[#111827] uppercase tracking-wider">
            AI SQL Query Generator
          </h2>
          <span className="text-[10px] text-[#4B5563] bg-gray-100 px-2 py-0.5 rounded font-mono">
            Table: {activeDataset.tableName}
          </span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={naturalLanguageQuestion}
            onChange={(e) => setNaturalLanguageQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerateSql()}
            placeholder="e.g. Find the top 5 departments by attrition count and calculate their average overtime hours"
            className="flex-1 text-xs p-2.5 bg-white border border-[#E5E7EB] rounded-md text-[#111827] focus:outline-none focus:border-[#2563EB]"
          />
          <button
            onClick={handleGenerateSql}
            disabled={isGeneratingSql || !naturalLanguageQuestion.trim()}
            className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-medium rounded-md shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
          >
            {isGeneratingSql ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate SQL</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Interactive SQL Editor */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-xs overflow-hidden">
        {/* Editor Toolbar */}
        <div className="p-3 bg-gray-50 border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-[#4B5563]">
            <Code2 className="w-4 h-4 text-[#2563EB]" />
            <span>SQL Console (AlaSQL Engine)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySql}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#4B5563] bg-white border border-[#E5E7EB] rounded hover:bg-gray-50"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleClearSql}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#4B5563] bg-white border border-[#E5E7EB] rounded hover:bg-gray-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
            <button
              onClick={handleRunQuery}
              disabled={isExecuting || !sqlInput.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded shadow-xs transition-colors disabled:opacity-50"
            >
              {isExecuting ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Play className="w-3.5 h-3.5 fill-white" />
              )}
              <span>Run Query</span>
            </button>
          </div>
        </div>

        {/* Textarea Editor */}
        <div className="p-4 bg-white">
          <textarea
            rows={5}
            value={sqlInput}
            onChange={(e) => setSqlInput(e.target.value)}
            spellCheck={false}
            className="w-full text-xs font-mono p-3 bg-gray-50 border border-[#E5E7EB] rounded-md text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] leading-relaxed"
            placeholder="SELECT * FROM tableName WHERE ... GROUP BY ... ORDER BY ... LIMIT 20;"
          />
        </div>

        {/* Plain English Explanation */}
        {explanation && (
          <div className="px-4 pb-4">
            <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-md text-xs text-[#111827]">
              <strong className="text-[#2563EB] font-semibold">Query Explanation: </strong>
              {explanation}
            </div>
          </div>
        )}

        {/* Query Execution Status */}
        <div className="px-4 py-2.5 bg-gray-50 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#4B5563]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              Read-only Security Enforced
            </span>
            {queryResult && !queryResult.error && (
              <span className="flex items-center gap-1 text-[#4B5563]">
                <Clock className="w-3.5 h-3.5" />
                Execution time: <strong className="text-[#111827]">{queryResult.executionTimeMs} ms</strong>
              </span>
            )}
          </div>

          {queryResult && !queryResult.error && (
            <span className="font-medium text-[#111827]">
              {queryResult.rowCount.toLocaleString()} row(s) returned
            </span>
          )}
        </div>
      </div>

      {/* Error Output */}
      {queryResult?.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Query Execution Blocked or Failed:</div>
            <div className="mt-1 font-mono text-[11px] text-red-800">{queryResult.error}</div>
            <div className="mt-2 text-[#4B5563]">
              Tip: Verify table and column names in the Data Workspace tab. Destructive queries (DROP, DELETE, UPDATE) are prohibited in WorkforceIQ.
            </div>
          </div>
        </div>
      )}

      {/* Query Results Table */}
      {queryResult && !queryResult.error && (
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <div>
              <h3 className="text-xs font-semibold text-[#111827] uppercase tracking-wider">
                Query Results
              </h3>
              <p className="text-[11px] text-[#4B5563] mt-0.5">
                Showing {(resultPage - 1) * pageSize + 1}–
                {Math.min(resultPage * pageSize, queryResult.rows.length)} of {queryResult.rowCount} rows
              </p>
            </div>

            <button
              onClick={() => exportQueryResultToCsv(queryResult, 'sql_query_result')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#4B5563] bg-white border border-[#E5E7EB] rounded-md hover:bg-gray-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Result CSV</span>
            </button>
          </div>

          <div className="border border-[#E5E7EB] rounded-md overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 border-b border-[#E5E7EB] text-[#4B5563] font-semibold">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center border-r border-[#E5E7EB]">#</th>
                  {queryResult.columns.map((col) => (
                    <th key={col} className="py-2.5 px-3 font-medium whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-[#111827]">
                {paginatedResultRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-2 px-3 text-center text-gray-400 font-mono text-[11px] border-r border-[#E5E7EB]">
                      {(resultPage - 1) * pageSize + idx + 1}
                    </td>
                    {queryResult.columns.map((col) => (
                      <td key={col} className="py-2 px-3 whitespace-nowrap font-mono text-[11px]">
                        {row[col] !== null && row[col] !== undefined
                          ? String(row[col])
                          : <span className="text-gray-300 italic">null</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalResultPages > 1 && (
            <div className="flex items-center justify-between text-xs text-[#4B5563] pt-2">
              <button
                disabled={resultPage <= 1}
                onClick={() => setResultPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 border border-[#E5E7EB] rounded-md hover:bg-gray-50 disabled:opacity-40"
              >
                &larr; Previous
              </button>
              <span>
                Page {resultPage} of {totalResultPages}
              </span>
              <button
                disabled={resultPage >= totalResultPages}
                onClick={() => setResultPage((p) => Math.min(totalResultPages, p + 1))}
                className="px-3 py-1 border border-[#E5E7EB] rounded-md hover:bg-gray-50 disabled:opacity-40"
              >
                Next &rarr;
              </button>
            </div>
          )}
        </div>
      )}

      {/* Saved Queries / Query History */}
      {savedQueries.length > 0 && (
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-semibold text-[#111827] uppercase tracking-wider flex items-center gap-2">
            <Bookmark className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Saved Query History ({savedQueries.length})</span>
          </h3>

          <div className="divide-y divide-[#E5E7EB] border border-[#E5E7EB] rounded-md">
            {savedQueries.slice(0, 5).map((q) => (
              <div
                key={q.id}
                className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="max-w-2xl">
                  <div className="font-mono text-xs text-[#111827] truncate font-semibold">
                    {q.sql}
                  </div>
                  <div className="text-[11px] text-[#4B5563] mt-0.5 truncate">
                    {q.explanation} &bull; {q.rowCount} rows &bull; {q.executionTimeMs} ms
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSqlInput(q.sql);
                      setExplanation(q.explanation);
                    }}
                    className="px-2.5 py-1 text-xs text-[#2563EB] hover:bg-blue-50 rounded font-medium"
                  >
                    Load Query
                  </button>
                  <button
                    onClick={() => onDeleteSavedQuery(q.id)}
                    className="text-gray-400 hover:text-red-500 text-xs px-1"
                  >
                    &times;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
