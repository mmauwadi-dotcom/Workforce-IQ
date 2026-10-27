import React, { useState, useEffect, useRef } from 'react';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { Header } from './components/Header';
import { LiveActivityFeed } from './components/LiveActivityFeed';
import { OverviewView } from './views/OverviewView';
import { DataWorkspaceView } from './views/DataWorkspaceView';
import { DashboardView } from './views/DashboardView';
import { SqlQueryLabView } from './views/SqlQueryLabView';
import { AiAnalystView } from './views/AiAnalystView';
import { DataHistoryView } from './views/DataHistoryView';
import { SettingsView } from './views/SettingsView';

import {
  AnalysisSession,
  BusinessObjective,
  ChatMessage,
  Dataset,
  ExecutiveInsights,
  KpiMetric,
  ChartDefinition,
  DashboardFilter,
  SqlHistoryItem,
  LiveEvent,
  RealtimeConfig,
} from './types';
import { registerDatasetTable } from './services/sqlEngine';
import {
  buildDashboardFilters,
  generateDynamicDashboard,
} from './services/dashboardGenerator';
import {
  generateSyntheticEvent,
  ingestLiveEventIntoDataset,
} from './services/realtimeService';
import {
  interpretObjectiveApi,
  generateInsightsApi,
} from './services/apiClient';
import {
  getSavedSessions,
  saveSession,
  deleteSession,
  renameSession,
  getSavedSqlQueries,
  saveSqlQuery,
  deleteSqlQuery,
} from './services/storageService';
import { exportSessionToJson, printExecutiveReport } from './services/exportService';
import { BenchmarkDatasetInfo } from './services/benchmarkDatasets';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [allDatasets, setAllDatasets] = useState<Dataset[]>([]);
  const [activeDataset, setActiveDataset] = useState<Dataset | null>(null);

  // Search & Filter state
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [numericRanges, setNumericRanges] = useState<Record<string, { min?: number; max?: number }>>({});

  // Analysis / Dashboard state
  const [currentObjective, setCurrentObjective] = useState<BusinessObjective | null>(null);
  const [kpis, setKpis] = useState<KpiMetric[]>([]);
  const [charts, setCharts] = useState<ChartDefinition[]>([]);
  const [filters, setFilters] = useState<DashboardFilter[]>([]);
  const [activeFilterValues, setActiveFilterValues] = useState<Record<string, string>>({});
  const [totalFilteredRows, setTotalFilteredRows] = useState<number>(0);
  const [insights, setInsights] = useState<ExecutiveInsights | undefined>(undefined);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Real-time live monitoring state
  const [realtimeConfig, setRealtimeConfig] = useState<RealtimeConfig>({
    enabled: false,
    intervalSeconds: 5,
    lastSyncTime: new Date().toISOString(),
    autoSimulate: true,
    eventsCount: 0,
  });
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [liveFeedDrawerOpen, setLiveFeedDrawerOpen] = useState(false);

  // Persistence
  const [savedSessions, setSavedSessions] = useState<AnalysisSession[]>([]);
  const [savedSqlQueries, setSavedSqlQueries] = useState<SqlHistoryItem[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // Keep ref for active dataset & filters in interval closures
  const activeDatasetRef = useRef<Dataset | null>(null);
  activeDatasetRef.current = activeDataset;
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const activeFilterValuesRef = useRef(activeFilterValues);
  activeFilterValuesRef.current = activeFilterValues;
  const globalSearchRef = useRef(globalSearchQuery);
  globalSearchRef.current = globalSearchQuery;
  const numericRangesRef = useRef(numericRanges);
  numericRangesRef.current = numericRanges;
  const currentObjectiveRef = useRef(currentObjective);
  currentObjectiveRef.current = currentObjective;

  // Load history on initial mount
  useEffect(() => {
    setSavedSessions(getSavedSessions());
    setSavedSqlQueries(getSavedSqlQueries());
  }, []);

  // When a dataset is loaded or selected, register it in SQL engine
  const handleDatasetLoaded = async (newDataset: Dataset) => {
    try {
      registerDatasetTable(newDataset);
      setAllDatasets((prev) => {
        const filtered = prev.filter((d) => d.id !== newDataset.id);
        return [newDataset, ...filtered];
      });
      setActiveDataset(newDataset);

      // Initialize dataset filters
      const builtFilters = await buildDashboardFilters(newDataset);
      setFilters(builtFilters);
      setActiveFilterValues({});
      setNumericRanges({});

      // Update sync time
      setRealtimeConfig((prev: RealtimeConfig) => ({
        ...prev,
        lastSyncTime: new Date().toISOString(),
      }));
    } catch (err) {
      console.error('Error registering dataset:', err);
    }
  };

  const handleSelectDataset = async (datasetId: string) => {
    const found = allDatasets.find((d) => d.id === datasetId);
    if (found) {
      setActiveDataset(found);
      registerDatasetTable(found);
      const builtFilters = await buildDashboardFilters(found);
      setFilters(builtFilters);
      setActiveFilterValues({});
      setNumericRanges({});
      setRealtimeConfig((prev: RealtimeConfig) => ({
        ...prev,
        lastSyncTime: new Date().toISOString(),
      }));
    }
  };

  const handleRemoveDataset = (datasetId: string) => {
    setAllDatasets((prev) => {
      const remaining = prev.filter((d) => d.id !== datasetId);
      if (activeDataset?.id === datasetId) {
        setActiveDataset(remaining[0] || null);
        if (remaining[0]) {
          registerDatasetTable(remaining[0]);
        }
      }
      return remaining;
    });
  };

  const handleToggleColumnInclusion = (columnName: string) => {
    if (!activeDataset) return;
    const updatedCols = activeDataset.columns.map((c) => {
      if (c.name === columnName) {
        return { ...c, includedInAnalysis: !c.includedInAnalysis };
      }
      return c;
    });
    const updatedDataset: Dataset = { ...activeDataset, columns: updatedCols };
    setActiveDataset(updatedDataset);
    registerDatasetTable(updatedDataset);
  };

  const handleSelectSheet = (sheetName: string) => {
    if (!activeDataset) return;
    const updated: Dataset = { ...activeDataset, selectedSheet: sheetName };
    setActiveDataset(updated);
  };

  // 1-Click Benchmark Selection
  const handleSelectBenchmark = (benchmark: BenchmarkDatasetInfo) => {
    const ds = benchmark.generateData();
    handleDatasetLoaded(ds);
  };

  // Orchestrate End-to-End Analysis Workflow
  const handleGenerateAnalysis = async (objective: BusinessObjective) => {
    if (!activeDataset) return;
    setIsAnalyzing(true);
    setCurrentObjective(objective);

    try {
      // 1. Interpret objective & validate columns via Server Gemini API
      try {
        await interpretObjectiveApi({
          objective: objective.objective,
          businessQuestions: objective.businessQuestions,
          targets: objective.targetsOrRules,
          schema: activeDataset.columns.map((c) => ({
            name: c.name,
            type: c.type,
            description: c.inferredDescription,
          })),
          sampleRows: activeDataset.rows.slice(0, 3),
          rowCount: activeDataset.rows.length,
        });
      } catch (err) {
        console.warn('Interpret objective API fallback used', err);
      }

      // 2. Build dataset filters
      const builtFilters = await buildDashboardFilters(activeDataset);
      setFilters(builtFilters);
      const initialFilterValues: Record<string, string> = {};
      builtFilters.forEach((f) => {
        initialFilterValues[f.id] = 'ALL';
      });
      setActiveFilterValues(initialFilterValues);

      // 3. Execute queries and build dynamic dashboard
      const dashResult = await generateDynamicDashboard(
        activeDataset,
        objective.objective,
        builtFilters,
        initialFilterValues,
        globalSearchQuery,
        numericRanges
      );

      setKpis(dashResult.kpis);
      setCharts(dashResult.charts);
      setTotalFilteredRows(dashResult.totalFilteredRows);

      // 4. Generate executive insights report
      let execInsights: ExecutiveInsights | undefined = undefined;
      try {
        const topAggregates = dashResult.charts[0]?.data?.slice(0, 5) || [];
        execInsights = await generateInsightsApi({
          objective: objective.objective,
          kpis: dashResult.kpis,
          topAggregates,
          schema: activeDataset.columns,
          tableName: activeDataset.tableName,
        });
      } catch (err) {
        console.warn('Insights generation fallback:', err);
      }
      setInsights(execInsights);

      // 5. Create and save Analysis Session
      const session: AnalysisSession = {
        id: `sess_${Date.now()}`,
        name: `${activeDataset.name.replace(/\.[^/.]+$/, '')} Analysis`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        datasetName: activeDataset.name,
        datasetId: activeDataset.id,
        rowCount: activeDataset.rows.length,
        columnCount: activeDataset.columns.length,
        objective,
        kpis: dashResult.kpis,
        charts: dashResult.charts,
        insights: execInsights,
        savedSqlQueries: [],
        chatHistory: [],
        status: 'completed',
      };

      saveSession(session);
      setSavedSessions(getSavedSessions());

      // Transition to Dashboards view
      setActiveTab('dashboards');
    } catch (err: any) {
      console.error('Analysis failed:', err);
      alert(`Analysis failed: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Re-calculate dashboard on filter change
  const handleFilterChange = async (filterId: string, value: string) => {
    if (!activeDataset) return;
    const updatedValues = { ...activeFilterValues, [filterId]: value };
    setActiveFilterValues(updatedValues);

    const dashResult = await generateDynamicDashboard(
      activeDataset,
      currentObjective?.objective || 'General analysis',
      filters,
      updatedValues,
      globalSearchQuery,
      numericRanges
    );

    setKpis(dashResult.kpis);
    setCharts(dashResult.charts);
    setTotalFilteredRows(dashResult.totalFilteredRows);
  };

  // Re-calculate on search query change
  const handleSearchChange = async (query: string) => {
    setGlobalSearchQuery(query);
    if (!activeDataset) return;

    const dashResult = await generateDynamicDashboard(
      activeDataset,
      currentObjective?.objective || 'General analysis',
      filters,
      activeFilterValues,
      query,
      numericRanges
    );

    setKpis(dashResult.kpis);
    setCharts(dashResult.charts);
    setTotalFilteredRows(dashResult.totalFilteredRows);
  };

  // Numeric range filters
  const handleNumericRangeChange = async (colName: string, min?: number, max?: number) => {
    if (!activeDataset) return;
    const updated = {
      ...numericRanges,
      [colName]: { min, max },
    };
    if (min === undefined && max === undefined) {
      delete updated[colName];
    }
    setNumericRanges(updated);

    const dashResult = await generateDynamicDashboard(
      activeDataset,
      currentObjective?.objective || 'General analysis',
      filters,
      activeFilterValues,
      globalSearchQuery,
      updated
    );

    setKpis(dashResult.kpis);
    setCharts(dashResult.charts);
    setTotalFilteredRows(dashResult.totalFilteredRows);
  };

  const handleClearNumericRange = async (colName: string) => {
    const updated = { ...numericRanges };
    delete updated[colName];
    setNumericRanges(updated);

    if (!activeDataset) return;
    const dashResult = await generateDynamicDashboard(
      activeDataset,
      currentObjective?.objective || 'General analysis',
      filters,
      activeFilterValues,
      globalSearchQuery,
      updated
    );

    setKpis(dashResult.kpis);
    setCharts(dashResult.charts);
    setTotalFilteredRows(dashResult.totalFilteredRows);
  };

  const handleResetFilters = async () => {
    if (!activeDataset) return;
    const resetValues: Record<string, string> = {};
    filters.forEach((f) => {
      resetValues[f.id] = 'ALL';
    });
    setActiveFilterValues(resetValues);
    setGlobalSearchQuery('');
    setNumericRanges({});

    const dashResult = await generateDynamicDashboard(
      activeDataset,
      currentObjective?.objective || 'General analysis',
      filters,
      resetValues,
      '',
      {}
    );

    setKpis(dashResult.kpis);
    setCharts(dashResult.charts);
    setTotalFilteredRows(dashResult.totalFilteredRows);
  };

  // Manual or Scheduled Refresh of analysis
  const handleRefreshDashboard = async () => {
    if (!activeDataset) return;
    setIsRefreshing(true);
    try {
      const dashResult = await generateDynamicDashboard(
        activeDataset,
        currentObjective?.objective || 'General analysis',
        filters,
        activeFilterValues,
        globalSearchQuery,
        numericRanges,
        kpis
      );
      setKpis(dashResult.kpis);
      setCharts(dashResult.charts);
      setTotalFilteredRows(dashResult.totalFilteredRows);
      setRealtimeConfig((prev: RealtimeConfig) => ({
        ...prev,
        lastSyncTime: new Date().toISOString(),
      }));
    } finally {
      setIsRefreshing(false);
    }
  };

  // Real-time live ingestion step
  const triggerSingleLiveEvent = async () => {
    const ds = activeDatasetRef.current;
    if (!ds || ds.rows.length === 0) return;

    try {
      const event = generateSyntheticEvent(ds);
      const updatedDs = ingestLiveEventIntoDataset(ds, event);

      setActiveDataset(updatedDs);
      setLiveEvents((prev: LiveEvent[]) => [event, ...prev.slice(0, 49)]);
      setRealtimeConfig((prev: RealtimeConfig) => ({
        ...prev,
        lastSyncTime: new Date().toISOString(),
        eventsCount: prev.eventsCount + 1,
      }));

      // Recalculate dashboard with live data
      const dashResult = await generateDynamicDashboard(
        updatedDs,
        currentObjectiveRef.current?.objective || 'General analysis',
        filtersRef.current,
        activeFilterValuesRef.current,
        globalSearchRef.current,
        numericRangesRef.current,
        kpis
      );

      setKpis(dashResult.kpis);
      setCharts(dashResult.charts);
      setTotalFilteredRows(dashResult.totalFilteredRows);
    } catch (err) {
      console.warn('Real-time event ingestion error:', err);
    }
  };

  // Real-time Polling / Streaming Interval
  useEffect(() => {
    if (!realtimeConfig.enabled || !activeDataset) return;

    const intervalMs = Math.max(2, realtimeConfig.intervalSeconds) * 1000;
    const timer = setInterval(() => {
      triggerSingleLiveEvent();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [realtimeConfig.enabled, realtimeConfig.intervalSeconds, activeDataset?.id]);

  const handleToggleRealtime = () => {
    setRealtimeConfig((prev: RealtimeConfig) => ({
      ...prev,
      enabled: !prev.enabled,
      lastSyncTime: new Date().toISOString(),
    }));
  };

  const handleChangeRealtimeInterval = (sec: number) => {
    setRealtimeConfig((prev: RealtimeConfig) => ({
      ...prev,
      intervalSeconds: sec,
    }));
  };

  // Reopen past session
  const handleOpenSession = (session: AnalysisSession) => {
    setCurrentObjective(session.objective);
    setKpis(session.kpis);
    setCharts(session.charts);
    setInsights(session.insights);
    setChatHistory(session.chatHistory || []);
    setActiveTab('dashboards');
  };

  const handleRenameSession = (id: string, newName: string) => {
    renameSession(id, newName);
    setSavedSessions(getSavedSessions());
  };

  const handleDeleteSession = (id: string) => {
    deleteSession(id);
    setSavedSessions(getSavedSessions());
  };

  // Save SQL query from lab
  const handleSaveSqlQuery = (item: SqlHistoryItem) => {
    saveSqlQuery(item);
    setSavedSqlQueries(getSavedSqlQueries());
  };

  const handleDeleteSavedQuery = (id: string) => {
    deleteSqlQuery(id);
    setSavedSqlQueries(getSavedSqlQueries());
  };

  // AI Chat Messages
  const handleSendChatMessage = (msg: ChatMessage) => {
    setChatHistory((prev) => [...prev, msg]);
  };

  const handleClearChat = () => {
    setChatHistory([]);
  };

  const handleOpenInSqlLab = (sql: string) => {
    setActiveTab('sql-lab');
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans antialiased text-[#111827]">
      {/* 1. Left-hand Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        activeDataset={activeDataset}
        allDatasets={allDatasets}
        onSelectDataset={handleSelectDataset}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 2. Top Navigation Bar with Search & Real-Time Monitoring */}
        <Header
          activeTab={activeTab}
          activeDataset={activeDataset}
          onUploadClick={() => setActiveTab('data-workspace')}
          onRefreshClick={handleRefreshDashboard}
          onExportClick={() => {
            if (activeDataset) {
              exportSessionToJson({
                id: `export_${Date.now()}`,
                name: `${activeDataset.name} Export`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                datasetName: activeDataset.name,
                datasetId: activeDataset.id,
                rowCount: activeDataset.rows.length,
                columnCount: activeDataset.columns.length,
                objective: currentObjective || {
                  objective: 'Full analysis export',
                  timestamp: new Date().toISOString(),
                },
                kpis,
                charts,
                insights,
                savedSqlQueries,
                chatHistory,
                status: 'completed',
              });
            }
          }}
          isRefreshing={isRefreshing}
          globalSearchQuery={globalSearchQuery}
          onGlobalSearchChange={handleSearchChange}
          realtimeConfig={realtimeConfig}
          onToggleRealtime={handleToggleRealtime}
          onChangeRealtimeInterval={handleChangeRealtimeInterval}
          onTriggerLiveEvent={triggerSingleLiveEvent}
          onToggleLiveFeedDrawer={() => setLiveFeedDrawerOpen(!liveFeedDrawerOpen)}
          liveFeedDrawerOpen={liveFeedDrawerOpen}
        />

        {/* 3. Main Content Views */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'overview' && (
            <OverviewView
              activeDataset={activeDataset}
              recentSessions={savedSessions}
              onUploadClick={() => setActiveTab('data-workspace')}
              onGenerateAnalysis={handleGenerateAnalysis}
              onSelectBenchmark={handleSelectBenchmark}
              onOpenSession={handleOpenSession}
              isAnalyzing={isAnalyzing}
            />
          )}

          {activeTab === 'data-workspace' && (
            <DataWorkspaceView
              activeDataset={activeDataset}
              allDatasets={allDatasets}
              onDatasetLoaded={handleDatasetLoaded}
              onRemoveDataset={handleRemoveDataset}
              onToggleColumnInclusion={handleToggleColumnInclusion}
              onSelectDataset={handleSelectDataset}
              onSelectSheet={handleSelectSheet}
            />
          )}

          {activeTab === 'dashboards' && (
            <DashboardView
              activeDataset={activeDataset}
              kpis={kpis}
              charts={charts}
              filters={filters}
              activeFilterValues={activeFilterValues}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
              searchQuery={globalSearchQuery}
              onSearchQueryChange={handleSearchChange}
              numericRanges={numericRanges}
              onNumericRangeChange={handleNumericRangeChange}
              onClearNumericRange={handleClearNumericRange}
              isRealtimeActive={realtimeConfig.enabled}
              onToggleRealtime={handleToggleRealtime}
              lastSyncTime={realtimeConfig.lastSyncTime}
              liveEventsCount={realtimeConfig.eventsCount}
              onTriggerLiveEvent={triggerSingleLiveEvent}
              insights={insights}
              onRefreshDashboard={handleRefreshDashboard}
              isRefreshing={isRefreshing}
              totalFilteredRows={totalFilteredRows}
              objectiveSummary={currentObjective?.objective}
            />
          )}

          {activeTab === 'sql-lab' && (
            <SqlQueryLabView
              activeDataset={activeDataset}
              savedQueries={savedSqlQueries}
              onSaveQuery={handleSaveSqlQuery}
              onDeleteSavedQuery={handleDeleteSavedQuery}
            />
          )}

          {activeTab === 'ai-analyst' && (
            <AiAnalystView
              activeDataset={activeDataset}
              chatHistory={chatHistory}
              onSendMessage={handleSendChatMessage}
              onClearHistory={handleClearChat}
              onOpenInSqlLab={handleOpenInSqlLab}
            />
          )}

          {activeTab === 'history' && (
            <DataHistoryView
              sessions={savedSessions}
              onOpenSession={handleOpenSession}
              onRenameSession={handleRenameSession}
              onDeleteSession={handleDeleteSession}
            />
          )}

          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Live Ingestion Event Stream Drawer */}
      <LiveActivityFeed
        isOpen={liveFeedDrawerOpen}
        onClose={() => setLiveFeedDrawerOpen(false)}
        events={liveEvents}
        onClearEvents={() => setLiveEvents([])}
        onInjectEvent={triggerSingleLiveEvent}
        isStreaming={realtimeConfig.enabled}
      />
    </div>
  );
}

export default App;
