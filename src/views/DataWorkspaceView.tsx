import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  FileCode,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  Search,
  Eye,
  CheckSquare,
  Square,
  Link2,
  Trash2,
  ArrowRight,
  Filter,
  Database,
} from 'lucide-react';
import { Dataset, ColumnProfile, ProposedJoin } from '../types';
import {
  parseCsvFile,
  parseExcelFile,
  parseJsonFile,
  detectDatasetRelationships,
} from '../services/dataProcessor';

interface DataWorkspaceViewProps {
  activeDataset: Dataset | null;
  allDatasets: Dataset[];
  onDatasetLoaded: (dataset: Dataset) => void;
  onRemoveDataset: (id: string) => void;
  onToggleColumnInclusion: (columnName: string) => void;
  onSelectDataset: (id: string) => void;
  onSelectSheet: (sheetName: string) => void;
}

export const DataWorkspaceView: React.FC<DataWorkspaceViewProps> = ({
  activeDataset,
  allDatasets,
  onDatasetLoaded,
  onRemoveDataset,
  onToggleColumnInclusion,
  onSelectDataset,
  onSelectSheet,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchPreview, setSearchPreview] = useState('');
  const [previewPage, setPreviewPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'preview' | 'dictionary' | 'quality' | 'joins'>('preview');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewPageSize = 15;

  const handleFile = async (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);

    const ext = file.name.split('.').pop()?.toLowerCase();
    try {
      if (ext === 'csv') {
        const dataset = await parseCsvFile(file);
        onDatasetLoaded(dataset);
      } else if (ext === 'xlsx' || ext === 'xls') {
        const { dataset } = await parseExcelFile(file);
        onDatasetLoaded(dataset);
      } else if (ext === 'json') {
        const dataset = await parseJsonFile(file);
        onDatasetLoaded(dataset);
      } else {
        throw new Error(
          `Unsupported file format ".${ext}". Please upload an Excel (.xlsx, .xls), CSV (.csv), or JSON (.json) file.`
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Filter preview rows by search
  const filteredPreviewRows = React.useMemo(() => {
    if (!activeDataset) return [];
    if (!searchPreview.trim()) return activeDataset.rows;
    const term = searchPreview.toLowerCase();
    return activeDataset.rows.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(term))
    );
  }, [activeDataset, searchPreview]);

  const totalPreviewPages = Math.ceil(filteredPreviewRows.length / previewPageSize) || 1;
  const paginatedRows = filteredPreviewRows.slice(
    (previewPage - 1) * previewPageSize,
    previewPage * previewPageSize
  );

  // Multi-dataset relationships
  const proposedJoins: ProposedJoin[] = React.useMemo(() => {
    if (allDatasets.length < 2 || !activeDataset) return [];
    const others = allDatasets.filter((d) => d.id !== activeDataset.id);
    const joins: ProposedJoin[] = [];
    others.forEach((other) => {
      joins.push(...detectDatasetRelationships(activeDataset, other));
    });
    return joins;
  }, [allDatasets, activeDataset]);

  const [confirmedJoins, setConfirmedJoins] = useState<Record<string, boolean>>({});

  const toggleConfirmJoin = (key: string) => {
    setConfirmedJoins((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`bg-white rounded-lg border-2 border-dashed p-8 text-center transition-all ${
          isDragging ? 'border-[#2563EB] bg-blue-50/50' : 'border-[#E5E7EB] hover:border-gray-300'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
          accept=".csv,.xlsx,.xls,.json"
          className="hidden"
        />

        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center mb-3">
            <Upload className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-semibold text-[#111827]">
            {activeDataset ? 'Upload Additional Dataset or Replace File' : 'Upload Business Dataset'}
          </h2>
          <p className="text-xs text-[#4B5563] mt-1 max-w-md">
            Drag and drop your spreadsheet or data file here, or click to browse.
          </p>

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-medium rounded-md shadow-xs transition-colors disabled:opacity-50"
            >
              {isProcessing ? 'Processing File...' : 'Select File from Computer'}
            </button>
          </div>

          <div className="mt-4 flex items-center gap-4 text-[11px] text-[#4B5563]">
            <span className="flex items-center gap-1">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Excel (.xlsx, .xls)
            </span>
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-blue-600" /> CSV (.csv)
            </span>
            <span className="flex items-center gap-1">
              <FileCode className="w-3.5 h-3.5 text-amber-600" /> JSON (.json)
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 max-w-xl mx-auto flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Multi-dataset Selector Bar */}
      {allDatasets.length > 0 && (
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#2563EB]" />
            <span className="text-xs font-semibold text-[#111827]">Loaded Datasets ({allDatasets.length}):</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {allDatasets.map((ds) => {
              const isSelected = activeDataset?.id === ds.id;
              return (
                <div
                  key={ds.id}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs border transition-colors ${
                    isSelected
                      ? 'bg-blue-50 text-[#2563EB] border-[#2563EB] font-medium'
                      : 'bg-gray-50 text-[#4B5563] border-[#E5E7EB] hover:bg-gray-100'
                  }`}
                >
                  <button onClick={() => onSelectDataset(ds.id)} className="flex items-center gap-1.5">
                    <span>{ds.name}</span>
                    <span className="text-[10px] opacity-75 font-mono">({ds.rows.length}r)</span>
                  </button>
                  {allDatasets.length > 1 && (
                    <button
                      onClick={() => onRemoveDataset(ds.id)}
                      className="text-gray-400 hover:text-red-500 ml-1"
                      title="Remove dataset"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dataset Details & Exploration */}
      {activeDataset ? (
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-xs overflow-hidden">
          {/* Header Summary */}
          <div className="p-6 border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-semibold text-[#111827]">{activeDataset.name}</h3>
                <span className="text-[11px] font-mono bg-gray-100 text-[#4B5563] px-2 py-0.5 rounded border border-[#E5E7EB]">
                  table: {activeDataset.tableName}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-[#4B5563]">
                <span>{activeDataset.rows.length.toLocaleString()} total rows</span>
                <span>&bull;</span>
                <span>{activeDataset.columns.length} columns</span>
                <span>&bull;</span>
                <span>Uploaded {new Date(activeDataset.uploadedAt).toLocaleTimeString()}</span>
              </div>
            </div>

            {/* Excel Sheet Selector */}
            {activeDataset.sheetNames && activeDataset.sheetNames.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#4B5563]">Worksheet:</span>
                <select
                  value={activeDataset.selectedSheet}
                  onChange={(e) => onSelectSheet(e.target.value)}
                  className="text-xs py-1.5 px-2 bg-white border border-[#E5E7EB] rounded-md text-[#111827] focus:outline-none focus:border-[#2563EB]"
                >
                  {activeDataset.sheetNames.map((sheet) => (
                    <option key={sheet} value={sheet}>
                      {sheet}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Sub Navigation Tabs */}
          <div className="border-b border-[#E5E7EB] px-6 flex items-center gap-6 text-xs font-medium">
            <button
              onClick={() => setActiveTab('preview')}
              className={`py-3 border-b-2 transition-colors ${
                activeTab === 'preview'
                  ? 'border-[#2563EB] text-[#2563EB]'
                  : 'border-transparent text-[#4B5563] hover:text-[#111827]'
              }`}
            >
              Data Preview ({filteredPreviewRows.length})
            </button>
            <button
              onClick={() => setActiveTab('dictionary')}
              className={`py-3 border-b-2 transition-colors ${
                activeTab === 'dictionary'
                  ? 'border-[#2563EB] text-[#2563EB]'
                  : 'border-transparent text-[#4B5563] hover:text-[#111827]'
              }`}
            >
              Data Dictionary & Column Selection ({activeDataset.columns.length})
            </button>
            <button
              onClick={() => setActiveTab('quality')}
              className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'quality'
                  ? 'border-[#2563EB] text-[#2563EB]'
                  : 'border-transparent text-[#4B5563] hover:text-[#111827]'
              }`}
            >
              <span>Quality Audit</span>
              {activeDataset.qualityReport.potentialIssues.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-700 text-[10px] flex items-center justify-center font-bold">
                  {activeDataset.qualityReport.potentialIssues.length}
                </span>
              )}
            </button>
            {allDatasets.length > 1 && (
              <button
                onClick={() => setActiveTab('joins')}
                className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'joins'
                    ? 'border-[#2563EB] text-[#2563EB]'
                    : 'border-transparent text-[#4B5563] hover:text-[#111827]'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Multi-Dataset Joins ({proposedJoins.length})</span>
              </button>
            )}
          </div>

          {/* Tab 1: Data Preview */}
          {activeTab === 'preview' && (
            <div className="p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    value={searchPreview}
                    onChange={(e) => {
                      setSearchPreview(e.target.value);
                      setPreviewPage(1);
                    }}
                    placeholder="Search preview rows..."
                    className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-[#E5E7EB] rounded-md text-[#111827] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div className="text-xs text-[#4B5563]">
                  Showing {(previewPage - 1) * previewPageSize + 1}–
                  {Math.min(previewPage * previewPageSize, filteredPreviewRows.length)} of{' '}
                  {filteredPreviewRows.length} rows
                </div>
              </div>

              <div className="border border-[#E5E7EB] rounded-md overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 border-b border-[#E5E7EB] text-[#4B5563] font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center border-r border-[#E5E7EB]">#</th>
                      {activeDataset.columns
                        .filter((c) => c.includedInAnalysis)
                        .map((col) => (
                          <th key={col.name} className="py-2.5 px-3 font-medium whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span>{col.name}</span>
                              <span className="text-[10px] text-gray-400 font-normal lowercase">
                                [{col.type}]
                              </span>
                            </div>
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] text-[#111827]">
                    {paginatedRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-2 px-3 text-center text-gray-400 font-mono text-[11px] border-r border-[#E5E7EB]">
                          {(previewPage - 1) * previewPageSize + idx + 1}
                        </td>
                        {activeDataset.columns
                          .filter((c) => c.includedInAnalysis)
                          .map((col) => (
                            <td key={col.name} className="py-2 px-3 whitespace-nowrap font-mono text-[11px]">
                              {row[col.name] !== null && row[col.name] !== undefined
                                ? String(row[col.name])
                                : <span className="text-gray-300 italic">null</span>}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPreviewPages > 1 && (
                <div className="flex items-center justify-between text-xs text-[#4B5563] pt-2">
                  <button
                    disabled={previewPage <= 1}
                    onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 border border-[#E5E7EB] rounded-md hover:bg-gray-50 disabled:opacity-40"
                  >
                    &larr; Previous
                  </button>
                  <span>
                    Page {previewPage} of {totalPreviewPages}
                  </span>
                  <button
                    disabled={previewPage >= totalPreviewPages}
                    onClick={() => setPreviewPage((p) => Math.min(totalPreviewPages, p + 1))}
                    className="px-3 py-1 border border-[#E5E7EB] rounded-md hover:bg-gray-50 disabled:opacity-40"
                  >
                    Next &rarr;
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Data Dictionary & Column Toggles */}
          {activeTab === 'dictionary' && (
            <div className="p-6 space-y-4">
              <div className="text-xs text-[#4B5563] flex items-center justify-between">
                <span>
                  Toggle columns to include or exclude from SQL queries and dashboard generation without modifying the source file.
                </span>
                <span className="font-medium text-[#111827]">
                  {activeDataset.columns.filter((c) => c.includedInAnalysis).length} of{' '}
                  {activeDataset.columns.length} columns active
                </span>
              </div>

              <div className="border border-[#E5E7EB] rounded-md overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 border-b border-[#E5E7EB] text-[#4B5563] font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">Include</th>
                      <th className="py-2.5 px-3">Column Name</th>
                      <th className="py-2.5 px-3">Inferred Type</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Missing Values</th>
                      <th className="py-2.5 px-3">Unique Values</th>
                      <th className="py-2.5 px-3">Sample Values</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {activeDataset.columns.map((col) => {
                      const missingPct = Math.round((col.nullCount / activeDataset.rows.length) * 100);
                      return (
                        <tr
                          key={col.name}
                          className={`hover:bg-gray-50/70 transition-colors ${
                            !col.includedInAnalysis ? 'bg-gray-50/40 text-gray-400' : 'text-[#111827]'
                          }`}
                        >
                          <td className="py-2 px-3 text-center">
                            <button
                              onClick={() => onToggleColumnInclusion(col.name)}
                              className="text-[#2563EB] hover:opacity-80"
                            >
                              {col.includedInAnalysis ? (
                                <CheckSquare className="w-4 h-4 text-[#2563EB]" />
                              ) : (
                                <Square className="w-4 h-4 text-gray-300" />
                              )}
                            </button>
                          </td>
                          <td className="py-2 px-3 font-semibold font-mono text-[11px] flex items-center gap-1.5">
                            <span>{col.name}</span>
                            {col.isPrimaryKeyCandidate && (
                              <span className="text-[10px] text-amber-700 bg-amber-50 px-1 rounded border border-amber-200">
                                PK
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider border ${
                                col.type === 'number' || col.type === 'currency'
                                  ? 'bg-blue-50 text-[#2563EB] border-blue-200'
                                  : col.type === 'date'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : col.type === 'category'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : col.type === 'percentage'
                                  ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                                  : 'bg-gray-100 text-[#4B5563] border-gray-200'
                              }`}
                            >
                              {col.type}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-[#4B5563]">{col.inferredDescription}</td>
                          <td className="py-2 px-3">
                            <span className={missingPct > 20 ? 'text-amber-600 font-medium' : 'text-[#4B5563]'}>
                              {col.nullCount} ({missingPct}%)
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px]">{col.distinctCount}</td>
                          <td className="py-2 px-3 font-mono text-[11px] text-[#4B5563] max-w-xs truncate">
                            {col.sampleValues.slice(0, 3).join(', ')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Data Quality Audit */}
          {activeTab === 'quality' && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-[#E5E7EB]">
                  <div className="text-[11px] font-semibold text-[#4B5563] uppercase">Completeness</div>
                  <div className="text-xl font-semibold text-[#111827] mt-1">
                    {(100 - activeDataset.qualityReport.missingPercentage).toFixed(1)}%
                  </div>
                  <div className="text-[11px] text-[#4B5563] mt-0.5">
                    {activeDataset.qualityReport.missingCells} null values
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-[#E5E7EB]">
                  <div className="text-[11px] font-semibold text-[#4B5563] uppercase">Duplicate Rows</div>
                  <div className="text-xl font-semibold text-[#111827] mt-1">
                    {activeDataset.qualityReport.duplicateRows}
                  </div>
                  <div className="text-[11px] text-[#4B5563] mt-0.5">Identical records across columns</div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-[#E5E7EB]">
                  <div className="text-[11px] font-semibold text-[#4B5563] uppercase">Primary Key Candidate</div>
                  <div className="text-sm font-semibold text-[#111827] mt-1.5 font-mono truncate">
                    {activeDataset.qualityReport.primaryKeyCandidate || 'None detected'}
                  </div>
                  <div className="text-[11px] text-[#4B5563] mt-0.5">Unique row identifier</div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-[#E5E7EB]">
                  <div className="text-[11px] font-semibold text-[#4B5563] uppercase">Audit Issues</div>
                  <div className="text-xl font-semibold text-[#111827] mt-1">
                    {activeDataset.qualityReport.potentialIssues.length}
                  </div>
                  <div className="text-[11px] text-[#4B5563] mt-0.5">Potential anomalies flagged</div>
                </div>
              </div>

              {activeDataset.qualityReport.potentialIssues.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-[#111827] uppercase tracking-wider">
                    Identified Quality Flags
                  </h4>
                  <div className="divide-y divide-[#E5E7EB] border border-[#E5E7EB] rounded-md">
                    {activeDataset.qualityReport.potentialIssues.map((issue, i) => (
                      <div key={i} className="p-3.5 flex items-start gap-3 bg-white">
                        <AlertTriangle
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            issue.severity === 'high'
                              ? 'text-red-500'
                              : issue.severity === 'medium'
                              ? 'text-amber-500'
                              : 'text-blue-500'
                          }`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {issue.column && (
                              <span className="font-mono text-xs font-semibold text-[#111827]">
                                {issue.column}
                              </span>
                            )}
                            <span className="text-xs text-[#111827]">{issue.issue}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded uppercase font-semibold ${
                                issue.severity === 'high'
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {issue.severity}
                            </span>
                          </div>
                          <p className="text-xs text-[#4B5563] mt-1">
                            <span className="font-medium text-[#111827]">Remediation:</span>{' '}
                            {issue.remediation}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    Zero high-severity data quality issues detected. All columns conform to inferred schema types.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Multi-Dataset Joins */}
          {activeTab === 'joins' && allDatasets.length > 1 && (
            <div className="p-6 space-y-4">
              <div className="text-xs text-[#4B5563]">
                WorkforceIQ automatically inspects matching identifiers across uploaded datasets.
                Relationships are proposed for your confirmation before executing combined SQL queries.
              </div>

              {proposedJoins.length > 0 ? (
                <div className="space-y-3">
                  {proposedJoins.map((join, idx) => {
                    const key = `${join.leftDatasetId}_${join.rightDatasetId}_${join.leftColumn}`;
                    const isConfirmed = confirmedJoins[key] || false;
                    const rightDs = allDatasets.find((d) => d.id === join.rightDatasetId);

                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-lg border transition-colors ${
                          isConfirmed
                            ? 'bg-blue-50/30 border-[#2563EB]'
                            : 'bg-white border-[#E5E7EB]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-semibold text-[#111827]">
                            <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                              {activeDataset.tableName}.{join.leftColumn}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-[#2563EB]" />
                            <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                              {rightDs?.tableName}.{join.rightColumn}
                            </span>
                            <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {join.relationshipType}
                            </span>
                          </div>

                          <button
                            onClick={() => toggleConfirmJoin(key)}
                            className={`px-3 py-1 text-xs font-medium rounded-md border transition-colors ${
                              isConfirmed
                                ? 'bg-[#2563EB] text-white border-[#2563EB]'
                                : 'bg-white text-[#4B5563] border-[#E5E7EB] hover:bg-gray-50'
                            }`}
                          >
                            {isConfirmed ? 'Join Confirmed' : 'Confirm Join'}
                          </button>
                        </div>
                        <p className="text-xs text-[#4B5563] mt-2">{join.explanation}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center border border-dashed border-[#E5E7EB] rounded-lg">
                  <p className="text-xs text-[#4B5563]">
                    No unambiguous key relationships detected between "{activeDataset.name}" and other loaded datasets.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-12 text-center shadow-xs">
          <Database className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-[#111827]">No active dataset</h3>
          <p className="text-xs text-[#4B5563] mt-1 max-w-sm mx-auto">
            Upload a spreadsheet or CSV above, or switch to the Overview tab to load one of the enterprise benchmark datasets.
          </p>
        </div>
      )}
    </div>
  );
};
