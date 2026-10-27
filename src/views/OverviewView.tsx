import React, { useState } from 'react';
import {
  Upload,
  Sparkles,
  ArrowRight,
  Database,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Clock,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { AnalysisSession, BusinessObjective, Dataset } from '../types';
import { BENCHMARK_DATASETS, BenchmarkDatasetInfo } from '../services/benchmarkDatasets';

interface OverviewViewProps {
  activeDataset: Dataset | null;
  recentSessions: AnalysisSession[];
  onUploadClick: () => void;
  onGenerateAnalysis: (objective: BusinessObjective) => void;
  onSelectBenchmark: (benchmark: BenchmarkDatasetInfo) => void;
  onOpenSession: (session: AnalysisSession) => void;
  isAnalyzing: boolean;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  activeDataset,
  recentSessions,
  onUploadClick,
  onGenerateAnalysis,
  onSelectBenchmark,
  onOpenSession,
  isAnalyzing,
}) => {
  const [objectiveText, setObjectiveText] = useState('');
  const [businessQuestions, setBusinessQuestions] = useState('');
  const [targetsOrRules, setTargetsOrRules] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDataset) {
      setValidationError('Please upload a dataset or select an enterprise benchmark first.');
      return;
    }
    if (!objectiveText.trim()) {
      setValidationError('Please describe your business objective or problem to analyze.');
      return;
    }

    setValidationError(null);
    onGenerateAnalysis({
      objective: objectiveText.trim(),
      businessQuestions: businessQuestions.trim() || undefined,
      targetsOrRules: targetsOrRules.trim() || undefined,
      timestamp: new Date().toISOString(),
    });
  };

  const handleBenchmarkClick = (bm: BenchmarkDatasetInfo) => {
    setObjectiveText(bm.defaultObjective);
    onSelectBenchmark(bm);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Welcome Hero */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-8 shadow-xs">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-50 text-[#2563EB] text-xs font-medium mb-3 border border-blue-100">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Powered Workforce & Enterprise Analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#111827] tracking-tight">
            Welcome to WorkforceIQ
          </h1>
          <p className="mt-2 text-base text-[#4B5563]">
            Turn your business data into actionable insights.
          </p>
          <p className="mt-1 text-sm text-[#4B5563]">
            Upload datasets in Excel, CSV, or JSON format. Define your business objective in plain English, and let WorkforceIQ automatically profile columns, generate SQL queries, and construct interactive dashboards.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={onUploadClick}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#2563EB] text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors shadow-xs"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Dataset</span>
            </button>
            <span className="text-xs text-[#4B5563]">
              Supports Excel (.xlsx, .xls), CSV (.csv), JSON (.json)
            </span>
          </div>
        </div>
      </div>

      {/* Analysis Generator Section */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB]">
          <div>
            <h2 className="text-base font-semibold text-[#111827]">
              Define Business Objective
            </h2>
            <p className="text-xs text-[#4B5563] mt-0.5">
              Explain what you want to investigate. WorkforceIQ will validate column availability and orchestrate the analysis.
            </p>
          </div>
          {activeDataset ? (
            <div className="flex items-center gap-2 px-2.5 py-1 bg-blue-50 text-[#2563EB] text-xs font-medium rounded border border-blue-100">
              <Database className="w-3.5 h-3.5" />
              <span className="truncate max-w-[200px]">{activeDataset.name}</span>
              <span className="text-blue-400">({activeDataset.rows.length} rows)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>No dataset active</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-1.5">
              Describe your business objective or problem <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={objectiveText}
              onChange={(e) => setObjectiveText(e.target.value)}
              placeholder="e.g. Analyse employee attrition and identify the departments with the highest turnover, overtime pressure, and tenure disparities."
              className="w-full text-sm p-3 bg-white border border-[#E5E7EB] rounded-md text-[#111827] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB]"
            />
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-[#2563EB] font-medium hover:underline inline-flex items-center gap-1"
            >
              <span>{showAdvanced ? 'Hide optional business rules' : '+ Add key business questions & targets (Optional)'}</span>
            </button>
          </div>

          {showAdvanced && (
            <div className="p-4 bg-gray-50 rounded-md border border-[#E5E7EB] space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#111827] mb-1">
                  Key business questions (Optional)
                </label>
                <input
                  type="text"
                  value={businessQuestions}
                  onChange={(e) => setBusinessQuestions(e.target.value)}
                  placeholder="e.g. Which roles have retention rates under 85%? Is overtime correlated with resignations?"
                  className="w-full text-xs p-2.5 bg-white border border-[#E5E7EB] rounded-md text-[#111827] placeholder:text-gray-400 focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#111827] mb-1">
                  KPI targets, reporting periods, or business rules (Optional)
                </label>
                <input
                  type="text"
                  value={targetsOrRules}
                  onChange={(e) => setTargetsOrRules(e.target.value)}
                  placeholder="e.g. Target attrition < 10%; reporting year 2026; exclude contractors"
                  className="w-full text-xs p-2.5 bg-white border border-[#E5E7EB] rounded-md text-[#111827] placeholder:text-gray-400 focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>
          )}

          {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-[#4B5563]">
              Calculations and charts will be executed strictly on the active dataset.
            </span>
            <button
              type="submit"
              disabled={isAnalyzing}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 shadow-xs"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Analyzing Data...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Analysis</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Enterprise Benchmark Datasets (For Quick 1-Click Evaluation) */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-[#111827]">
              Sample Enterprise Datasets
            </h2>
            <p className="text-xs text-[#4B5563]">
              Test WorkforceIQ across workforce, finance, sales, and operations without needing your own file ready.
            </p>
          </div>
          <span className="text-xs text-[#4B5563] font-medium bg-gray-100 px-2 py-0.5 rounded">
            4 Templates
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {BENCHMARK_DATASETS.map((bm) => {
            const isCurrentlyActive = activeDataset?.name.includes(bm.title.slice(0, 10));
            return (
              <div
                key={bm.id}
                onClick={() => handleBenchmarkClick(bm)}
                className={`p-4 rounded-lg border text-left cursor-pointer transition-all ${
                  isCurrentlyActive
                    ? 'border-[#2563EB] bg-blue-50/40 ring-1 ring-[#2563EB]'
                    : 'border-[#E5E7EB] bg-white hover:border-gray-300 hover:bg-gray-50/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider">
                    {bm.category}
                  </span>
                  <span className="text-[11px] text-[#4B5563] font-mono">
                    {bm.rowCount} rows
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-[#111827] mt-1">
                  {bm.title}
                </h3>
                <p className="text-xs text-[#4B5563] mt-1 line-clamp-2">
                  {bm.description}
                </p>
                <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#E5E7EB]/60">
                  <div className="flex flex-wrap gap-1">
                    {bm.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[10px] text-[#4B5563] bg-gray-100 px-1.5 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-[#2563EB] font-medium inline-flex items-center gap-1">
                    Load <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Analysis Sessions / Results */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 shadow-xs">
        <h2 className="text-base font-semibold text-[#111827] mb-1">
          Recent Analysis Results
        </h2>
        <p className="text-xs text-[#4B5563] mb-4">
          Saved analysis sessions, calculated KPIs, and generated dashboards.
        </p>

        {recentSessions.length > 0 ? (
          <div className="divide-y divide-[#E5E7EB]">
            {recentSessions.slice(0, 5).map((session) => (
              <div
                key={session.id}
                onClick={() => onOpenSession(session)}
                className="py-3 px-2 flex items-center justify-between hover:bg-gray-50 rounded-md cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 border border-blue-100">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-[#111827]">
                      {session.name}
                    </h3>
                    <p className="text-[11px] text-[#4B5563] line-clamp-1">
                      {session.objective.objective}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                      <span>{session.datasetName}</span>
                      <span>&bull;</span>
                      <span>{session.rowCount} rows</span>
                      <span>&bull;</span>
                      <span>{new Date(session.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#2563EB] font-medium inline-flex items-center gap-1">
                    Open <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center border border-dashed border-[#E5E7EB] rounded-lg">
            <BarChart3 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-[#111827]">No analysis results generated yet</p>
            <p className="text-[11px] text-[#4B5563] mt-1 max-w-sm mx-auto">
              Upload a dataset above or pick an enterprise template, define your objective, and click "Generate Analysis" to build your first dashboard.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
