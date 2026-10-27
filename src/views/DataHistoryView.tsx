import React, { useState } from 'react';
import {
  History,
  Trash2,
  Edit2,
  Download,
  BarChart3,
  Check,
  X,
  FileSpreadsheet,
  FileText,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { AnalysisSession } from '../types';
import { exportSessionToJson, exportToCsv } from '../services/exportService';

interface DataHistoryViewProps {
  sessions: AnalysisSession[];
  onOpenSession: (session: AnalysisSession) => void;
  onRenameSession: (id: string, newName: string) => void;
  onDeleteSession: (id: string) => void;
}

export const DataHistoryView: React.FC<DataHistoryViewProps> = ({
  sessions,
  onOpenSession,
  onRenameSession,
  onDeleteSession,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const startEdit = (session: AnalysisSession) => {
    setEditingId(session.id);
    setEditName(session.name);
  };

  const saveEdit = (id: string) => {
    if (editName.trim()) {
      onRenameSession(id, editName.trim());
    }
    setEditingId(null);
  };

  const handleExportSession = (session: AnalysisSession) => {
    exportSessionToJson(session);
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB]">
          <div>
            <h2 className="text-base font-semibold text-[#111827]">Analysis Session History</h2>
            <p className="text-xs text-[#4B5563] mt-0.5">
              Review, rename, reopen, or export historical analysis sessions and verified KPI definitions.
            </p>
          </div>
          <span className="text-xs text-[#4B5563] font-medium bg-gray-100 px-2.5 py-1 rounded">
            {sessions.length} Saved {sessions.length === 1 ? 'Session' : 'Sessions'}
          </span>
        </div>

        {sessions.length > 0 ? (
          <div className="divide-y divide-[#E5E7EB] mt-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="py-4 px-3 hover:bg-gray-50/70 rounded-md transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    {editingId === session.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="text-xs p-1 bg-white border border-[#2563EB] rounded text-[#111827] focus:outline-none"
                        />
                        <button
                          onClick={() => saveEdit(session.id)}
                          className="text-emerald-600 hover:text-emerald-700"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-[#111827]">{session.name}</h3>
                        <button
                          onClick={() => startEdit(session)}
                          className="text-gray-400 hover:text-[#2563EB] transition-colors"
                          title="Rename session"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 uppercase font-medium">
                      {session.status}
                    </span>
                  </div>

                  <p className="text-xs text-[#4B5563] line-clamp-2">
                    <strong className="text-[#111827]">Objective:</strong> {session.objective.objective}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#4B5563] pt-1">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-gray-400" /> {session.datasetName} ({session.rowCount} rows)
                    </span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1">
                      <BarChart3 className="w-3.5 h-3.5 text-gray-400" /> {session.kpis.length} KPIs, {session.charts.length} Charts
                    </span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" /> {new Date(session.updatedAt).toLocaleDateString()} {new Date(session.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleExportSession(session)}
                    className="p-1.5 text-[#4B5563] hover:text-[#111827] bg-white border border-[#E5E7EB] rounded hover:bg-gray-50 text-xs inline-flex items-center gap-1"
                    title="Export session JSON"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Export</span>
                  </button>

                  <button
                    onClick={() => onDeleteSession(session.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 bg-white border border-[#E5E7EB] rounded hover:bg-red-50 text-xs"
                    title="Delete session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onOpenSession(session)}
                    className="px-3 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded text-xs font-medium inline-flex items-center gap-1 transition-colors"
                  >
                    <span>Reopen Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <History className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-[#111827]">No analysis sessions saved</h3>
            <p className="text-xs text-[#4B5563] mt-1 max-w-sm mx-auto">
              Analyses generated from the Overview page are automatically archived here for historical benchmarking and auditing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
