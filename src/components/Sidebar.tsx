import React from 'react';
import {
  LayoutDashboard,
  Database,
  BarChart3,
  Terminal,
  Bot,
  History,
  Settings,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { Dataset } from '../types';

export type ActiveTab =
  | 'overview'
  | 'data-workspace'
  | 'dashboards'
  | 'sql-lab'
  | 'ai-analyst'
  | 'history'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  activeDataset: Dataset | null;
  allDatasets: Dataset[];
  onSelectDataset: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  activeDataset,
  allDatasets,
  onSelectDataset,
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'data-workspace', label: 'Data Workspace', icon: Database },
    { id: 'dashboards', label: 'Dashboards', icon: BarChart3 },
    { id: 'sql-lab', label: 'SQL Query Lab', icon: Terminal },
    { id: 'ai-analyst', label: 'AI Data Analyst', icon: Bot },
    { id: 'history', label: 'Data History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <aside className="w-64 bg-white border-r border-[#E5E7EB] flex flex-col h-screen shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-[#2563EB] flex items-center justify-center text-white font-semibold text-sm tracking-tight shadow-xs">
            IQ
          </div>
          <div>
            <div className="font-semibold text-base text-[#111827] tracking-tight leading-none">
              WorkforceIQ
            </div>
            <div className="text-[11px] text-[#4B5563] mt-1 font-medium tracking-normal">
              Enterprise Analytics
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-[#4B5563] uppercase">
          Workspace
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors text-left ${
                isActive
                  ? 'bg-blue-50 text-[#2563EB] border-l-3 border-[#2563EB]'
                  : 'text-[#4B5563] hover:text-[#111827] hover:bg-gray-50'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-[#2563EB]' : 'text-[#4B5563]'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Dataset Context Widget */}
      <div className="p-3 border-t border-[#E5E7EB] bg-gray-50/50">
        <div className="px-1 pb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#4B5563] uppercase tracking-wider">
            Active Dataset
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Ready
          </span>
        </div>

        {activeDataset ? (
          <div className="p-2.5 bg-white rounded border border-[#E5E7EB] shadow-xs">
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
              <span className="text-xs font-semibold text-[#111827] truncate" title={activeDataset.name}>
                {activeDataset.name}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-[#4B5563]">
              <span>Table: <code className="text-[#111827] font-mono">{activeDataset.tableName}</code></span>
              <span className="font-medium text-[#111827]">{activeDataset.rows.length.toLocaleString()} rows</span>
            </div>

            {allDatasets.length > 1 && (
              <div className="mt-2 pt-2 border-t border-[#E5E7EB]">
                <label className="text-[10px] text-[#4B5563] block mb-1">Switch Dataset:</label>
                <select
                  value={activeDataset.id}
                  onChange={(e) => onSelectDataset(e.target.value)}
                  className="w-full text-xs py-1 px-1.5 bg-white border border-[#E5E7EB] rounded text-[#111827] focus:outline-none focus:border-[#2563EB]"
                >
                  {allDatasets.map((ds) => (
                    <option key={ds.id} value={ds.id}>
                      {ds.name} ({ds.rows.length} rows)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 bg-white rounded border border-dashed border-[#E5E7EB] text-center">
            <p className="text-xs text-[#4B5563]">No dataset loaded</p>
            <button
              onClick={() => onSelectTab('data-workspace')}
              className="mt-1.5 text-xs text-[#2563EB] font-medium hover:underline inline-flex items-center gap-1"
            >
              Upload file to start &rarr;
            </button>
          </div>
        )}

        <div className="mt-3 flex items-center gap-1.5 px-1 text-[11px] text-[#4B5563]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Read-only SQL Sandbox</span>
        </div>
      </div>
    </aside>
  );
};
