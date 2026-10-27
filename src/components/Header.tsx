import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Download,
  Upload,
  Search,
  Radio,
  Clock,
  Play,
  Pause,
  Zap,
  Activity,
  Layers,
  X,
} from 'lucide-react';
import { ActiveTab } from './Sidebar';
import { Dataset, RealtimeConfig } from '../types';

export interface HeaderProps {
  activeTab: ActiveTab;
  activeDataset: Dataset | null;
  onUploadClick: () => void;
  onRefreshClick: () => void;
  onExportClick: () => void;
  isRefreshing?: boolean;
  // Global search
  globalSearchQuery: string;
  onGlobalSearchChange: (q: string) => void;
  // Real-time monitoring
  realtimeConfig: RealtimeConfig;
  onToggleRealtime: () => void;
  onChangeRealtimeInterval: (sec: number) => void;
  onTriggerLiveEvent: () => void;
  onToggleLiveFeedDrawer: () => void;
  liveFeedDrawerOpen: boolean;
}

const TAB_TITLES: Record<ActiveTab, { title: string; subtitle: string }> = {
  overview: {
    title: 'Workspace Overview',
    subtitle: 'Define business objectives, upload datasets, and orchestrate automated insights',
  },
  'data-workspace': {
    title: 'Data Workspace',
    subtitle: 'Upload files, inspect schemas, audit quality, and manage column inclusion',
  },
  dashboards: {
    title: 'Interactive Dashboards',
    subtitle: 'Dynamic KPIs, visualisations, and dataset-aware multidimensional filters',
  },
  'sql-lab': {
    title: 'SQL Query Lab',
    subtitle: 'Interactive SQL console, AI query generation, and in-memory execution',
  },
  'ai-analyst': {
    title: 'AI Data Analyst',
    subtitle: 'Grounded natural language answers backed by validated calculations and queries',
  },
  history: {
    title: 'Data History',
    subtitle: 'Archived analysis sessions, saved SQL queries, and audit logs',
  },
  settings: {
    title: 'Settings & Security',
    subtitle: 'Data governance, query limits, privacy controls, and data source connectors',
  },
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  activeDataset,
  onUploadClick,
  onRefreshClick,
  onExportClick,
  isRefreshing = false,
  globalSearchQuery,
  onGlobalSearchChange,
  realtimeConfig,
  onToggleRealtime,
  onChangeRealtimeInterval,
  onTriggerLiveEvent,
  onToggleLiveFeedDrawer,
  liveFeedDrawerOpen,
}) => {
  const meta = TAB_TITLES[activeTab];
  const [secondsSinceSync, setSecondsSinceSync] = useState(0);

  // Counter tracking seconds since last sync
  useEffect(() => {
    const timer = setInterval(() => {
      if (realtimeConfig.lastSyncTime) {
        const diff = Math.floor((Date.now() - new Date(realtimeConfig.lastSyncTime).getTime()) / 1000);
        setSecondsSinceSync(Math.max(0, diff));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [realtimeConfig.lastSyncTime]);

  return (
    <header className="h-16 bg-white border-b border-[#E5E7EB] px-6 flex items-center justify-between shrink-0 gap-4">
      {/* View Title */}
      <div className="flex flex-col min-w-0">
        <h1 className="text-sm sm:text-base font-semibold text-[#111827] tracking-tight flex items-center gap-2 truncate">
          <span>{meta.title}</span>
          {activeDataset && (
            <span className="text-[11px] font-normal text-[#4B5563] bg-gray-100 px-2 py-0.5 rounded border border-[#E5E7EB] truncate max-w-[160px]">
              {activeDataset.name}
            </span>
          )}
        </h1>
        <p className="text-[11px] text-[#4B5563] hidden lg:block truncate">{meta.subtitle}</p>
      </div>

      {/* Universal Search Bar */}
      <div className="relative max-w-xs w-full hidden md:block">
        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
        <input
          type="text"
          value={globalSearchQuery}
          onChange={(e) => onGlobalSearchChange(e.target.value)}
          placeholder="Filter workspace & records..."
          className="w-full text-xs pl-8 pr-7 py-1.5 bg-gray-50/70 border border-[#E5E7EB] rounded-md text-[#111827] placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
        />
        {globalSearchQuery && (
          <button
            onClick={() => onGlobalSearchChange('')}
            className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Real-Time Monitoring Controls & Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {activeDataset && (
          <>
            {/* Real-Time Monitoring Widget */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#E5E7EB] rounded-md text-xs shadow-2xs">
              <button
                onClick={onToggleRealtime}
                className={`flex items-center gap-1.5 font-medium transition-colors ${
                  realtimeConfig.enabled ? 'text-emerald-700' : 'text-[#4B5563] hover:text-[#111827]'
                }`}
                title={realtimeConfig.enabled ? 'Pause real-time telemetry stream' : 'Activate live real-time telemetry'}
              >
                {realtimeConfig.enabled ? (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                )}
                <span className="hidden sm:inline font-semibold text-[11px]">
                  {realtimeConfig.enabled ? 'LIVE' : 'Snapshot'}
                </span>
              </button>

              {realtimeConfig.enabled && (
                <div className="flex items-center gap-1 pl-1 border-l border-[#E5E7EB]">
                  <select
                    value={realtimeConfig.intervalSeconds}
                    onChange={(e) => onChangeRealtimeInterval(Number(e.target.value))}
                    className="text-[10px] font-mono bg-transparent text-[#4B5563] focus:outline-none cursor-pointer"
                    title="Ingestion polling interval"
                  >
                    <option value={3}>3s</option>
                    <option value={5}>5s</option>
                    <option value={10}>10s</option>
                    <option value={30}>30s</option>
                  </select>
                </div>
              )}

              <span className="text-[10px] text-gray-400 hidden xl:inline">
                {secondsSinceSync === 0 ? 'just now' : `${secondsSinceSync}s ago`}
              </span>

              {/* Fast event injector button */}
              {realtimeConfig.enabled && (
                <button
                  onClick={onTriggerLiveEvent}
                  className="ml-1 p-0.5 text-blue-600 hover:text-blue-800 rounded"
                  title="Inject live transaction event immediately"
                >
                  <Zap className="w-3 h-3 fill-blue-600" />
                </button>
              )}
            </div>

            {/* Live Activity Stream Drawer Toggle */}
            <button
              onClick={onToggleLiveFeedDrawer}
              className={`p-1.5 text-xs font-medium rounded-md border transition-colors flex items-center gap-1 ${
                liveFeedDrawerOpen
                  ? 'bg-blue-50 text-[#2563EB] border-[#2563EB]'
                  : 'bg-white text-[#4B5563] border-[#E5E7EB] hover:bg-gray-50'
              }`}
              title="Toggle Live Event Stream Activity Drawer"
            >
              <Activity className="w-3.5 h-3.5" />
              {realtimeConfig.eventsCount > 0 && (
                <span className="text-[10px] bg-blue-100 text-[#2563EB] font-bold px-1 rounded-full">
                  {realtimeConfig.eventsCount}
                </span>
              )}
            </button>

            {/* Refresh Button */}
            <button
              onClick={onRefreshClick}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#4B5563] bg-white border border-[#E5E7EB] rounded-md hover:bg-gray-50 hover:text-[#111827] transition-colors disabled:opacity-50"
              title="Manual refresh: recalculate queries & KPIs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#2563EB]' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Export Button */}
            <button
              onClick={onExportClick}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#4B5563] bg-white border border-[#E5E7EB] rounded-md hover:bg-gray-50 hover:text-[#111827] transition-colors"
              title="Export report or dataset"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </>
        )}

        <button
          onClick={onUploadClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-md transition-colors shadow-xs"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Upload</span>
        </button>
      </div>
    </header>
  );
};
