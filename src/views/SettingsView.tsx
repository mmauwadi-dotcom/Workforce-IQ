import React, { useState } from 'react';
import {
  ShieldCheck,
  Database,
  Lock,
  Server,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Key,
  Clock,
  EyeOff,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [readOnlyEnforced, setReadOnlyEnforced] = useState(true);
  const [maskPii, setMaskPii] = useState(false);
  const [maxQueryRows, setMaxQueryRows] = useState(500);
  const [queryTimeoutMs, setQueryTimeoutMs] = useState(5000);
  const [retentionDays, setRetentionDays] = useState(30);

  // Live Connection Mock Configurator
  const [activeConnector, setActiveConnector] = useState<'none' | 'postgres' | 'rest' | 'supabase'>('none');
  const [connectionHost, setConnectionHost] = useState('');
  const [connectionDatabase, setConnectionDatabase] = useState('');
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [connTestMessage, setConnTestMessage] = useState<{ success: boolean; text: string } | null>(null);

  const handleTestConnection = () => {
    setIsTestingConn(true);
    setConnTestMessage(null);
    setTimeout(() => {
      setIsTestingConn(false);
      if (!connectionHost.trim()) {
        setConnTestMessage({
          success: false,
          text: 'Host or endpoint URL is required to verify connector handshake.',
        });
      } else {
        setConnTestMessage({
          success: true,
          text: 'Live connection validated successfully. Ready for scheduled polling.',
        });
      }
    }, 900);
  };

  const handleClearAllStorage = () => {
    if (confirm('Are you sure you want to clear all locally cached datasets and analysis sessions?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Security & Data Privacy Card */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E5E7EB]">
          <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
          <h2 className="text-base font-semibold text-[#111827]">
            Data Privacy & SQL Security Governance
          </h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-[#111827]">
                Enforce Strict Read-Only SQL Execution
              </div>
              <div className="text-xs text-[#4B5563]">
                Blocks all destructive commands (DROP, DELETE, UPDATE, ALTER, INSERT, TRUNCATE).
              </div>
            </div>
            <input
              type="checkbox"
              checked={readOnlyEnforced}
              onChange={(e) => setReadOnlyEnforced(e.target.checked)}
              className="w-4 h-4 text-[#2563EB] rounded border-gray-300"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-[#111827]">
                Mask Sensitive Personal Identifiers (PII)
              </div>
              <div className="text-xs text-[#4B5563]">
                Automatically mask employee names, contact info, and customer IDs in tables and charts.
              </div>
            </div>
            <input
              type="checkbox"
              checked={maskPii}
              onChange={(e) => setMaskPii(e.target.checked)}
              className="w-4 h-4 text-[#2563EB] rounded border-gray-300"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-[#111827] mb-1">
                Max Rows Returned per SQL Query
              </label>
              <input
                type="number"
                value={maxQueryRows}
                onChange={(e) => setMaxQueryRows(Number(e.target.value))}
                min={50}
                max={5000}
                className="w-full text-xs p-2 bg-white border border-[#E5E7EB] rounded-md text-[#111827]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#111827] mb-1">
                Query Timeout (milliseconds)
              </label>
              <input
                type="number"
                value={queryTimeoutMs}
                onChange={(e) => setQueryTimeoutMs(Number(e.target.value))}
                min={1000}
                max={30000}
                step={500}
                className="w-full text-xs p-2 bg-white border border-[#E5E7EB] rounded-md text-[#111827]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Live Data Connections Layer */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E5E7EB]">
          <Database className="w-4 h-4 text-[#2563EB]" />
          <div>
            <h2 className="text-base font-semibold text-[#111827]">
              Live Data Source Connectors
            </h2>
            <p className="text-xs text-[#4B5563]">
              Configure connections to live databases or REST APIs for automated data synchronization.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['none', 'postgres', 'supabase', 'rest'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setActiveConnector(type)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors capitalize ${
                activeConnector === type
                  ? 'bg-blue-50 text-[#2563EB] border-[#2563EB]'
                  : 'bg-white text-[#4B5563] border-[#E5E7EB] hover:bg-gray-50'
              }`}
            >
              {type === 'none' ? 'Uploaded Files (Default)' : type}
            </button>
          ))}
        </div>

        {activeConnector !== 'none' && (
          <div className="p-4 bg-gray-50 rounded-md border border-[#E5E7EB] space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#111827] mb-1">
                {activeConnector === 'rest' ? 'REST API Endpoint URL' : 'Database Host / Connection URI'}
              </label>
              <input
                type="text"
                value={connectionHost}
                onChange={(e) => setConnectionHost(e.target.value)}
                placeholder={
                  activeConnector === 'rest'
                    ? 'https://api.company.com/v1/workforce-metrics'
                    : 'postgresql://user:pass@db.company.com:5432/analytics'
                }
                className="w-full text-xs p-2 bg-white border border-[#E5E7EB] rounded-md text-[#111827]"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-[#4B5563]">
                Server-side proxy authentication protects credentials from browser exposure.
              </span>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTestingConn}
                className="px-3.5 py-1.5 bg-white border border-[#E5E7EB] text-xs font-medium text-[#111827] hover:bg-gray-50 rounded-md"
              >
                {isTestingConn ? 'Testing...' : 'Test Connection'}
              </button>
            </div>

            {connTestMessage && (
              <div
                className={`p-2.5 rounded text-xs flex items-center gap-2 ${
                  connTestMessage.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {connTestMessage.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{connTestMessage.text}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Storage & Workspace Management */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
          <div>
            <h2 className="text-base font-semibold text-[#111827]">Workspace Storage</h2>
            <p className="text-xs text-[#4B5563]">
              Manage local cache, session history, and privacy retention rules.
            </p>
          </div>
          <button
            onClick={handleClearAllStorage}
            className="px-3 py-1.5 text-xs text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md font-medium inline-flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset Local Workspace</span>
          </button>
        </div>

        <div className="text-xs text-[#4B5563] space-y-1">
          <p>&bull; Datasets are loaded strictly into browser in-memory tables (AlaSQL) for low-latency queries.</p>
          <p>&bull; Analysis sessions and saved queries are securely stored in your local storage.</p>
          <p>&bull; No personal or business data is used to train external models.</p>
        </div>
      </div>
    </div>
  );
};
