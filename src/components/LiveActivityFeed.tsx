import React from 'react';
import { X, Activity, Zap, Trash2, ArrowUpRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { LiveEvent } from '../types';

interface LiveActivityFeedProps {
  isOpen: boolean;
  onClose: () => void;
  events: LiveEvent[];
  onClearEvents: () => void;
  onInjectEvent: () => void;
  isStreaming: boolean;
}

export const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({
  isOpen,
  onClose,
  events,
  onClearEvents,
  onInjectEvent,
  isStreaming,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-white border-l border-[#E5E7EB] shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="h-16 px-4 border-b border-[#E5E7EB] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#2563EB]" />
          <div>
            <h3 className="text-xs font-semibold text-[#111827] uppercase tracking-wider">
              Live Activity Stream
            </h3>
            <p className="text-[11px] text-[#4B5563]">
              {isStreaming ? (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Real-time telemetry connected
                </span>
              ) : (
                'Monitoring paused'
              )}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Action controls */}
      <div className="p-3 bg-gray-50 border-b border-[#E5E7EB] flex items-center justify-between gap-2">
        <button
          onClick={onInjectEvent}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-white text-[#2563EB] border border-[#2563EB] hover:bg-blue-50 rounded"
        >
          <Zap className="w-3 h-3 fill-[#2563EB]" />
          <span>Inject Event</span>
        </button>

        {events.length > 0 && (
          <button
            onClick={onClearEvents}
            className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-600"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear ({events.length})</span>
          </button>
        )}
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#E5E7EB] p-2">
        {events.length > 0 ? (
          events.map((evt) => (
            <div key={evt.id} className="p-3 hover:bg-gray-50/70 rounded transition-colors text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                    evt.type === 'alert'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-blue-50 text-[#2563EB] border-blue-200'
                  }`}
                >
                  {evt.type === 'alert' ? 'High Impact' : 'Data Ingestion'}
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {new Date(evt.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs text-[#111827] font-medium leading-snug">{evt.summary}</p>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#4B5563]">
            <Activity className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-xs font-medium text-[#111827]">No live events recorded yet</p>
            <p className="text-[11px] text-[#4B5563] mt-1">
              Turn on Live Monitoring in the top bar or click "Inject Event" to simulate real-time ingestion.
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-gray-50 border-t border-[#E5E7EB] text-[10px] text-[#4B5563] text-center">
        Incoming events are written directly to in-memory SQL tables and trigger instant dashboard updates.
      </div>
    </div>
  );
};
