import React from 'react';
import { History, Trash2, Clock, FileText, ChevronRight, X, ArrowUpRight } from 'lucide-react';
import { TranscriptionRecord } from '../types';
import { formatTimestamp } from '../utils/audioHelpers';

interface HistoryDrawerProps {
  isOpen: boolean;
  records: TranscriptionRecord[];
  activeRecordId?: string;
  onClose: () => void;
  onSelectRecord: (record: TranscriptionRecord) => void;
  onDeleteRecord: (id: string) => void;
  onClearAll: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  records,
  activeRecordId,
  onClose,
  onSelectRecord,
  onDeleteRecord,
  onClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-xs">
      <div className="flex flex-col w-full max-w-md h-full bg-slate-900 border-l border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-orange-400" />
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Transcription History</h3>
              <p className="text-xs text-slate-400">{records.length} saved sessions</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of records */}
        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-2.5">
          {records.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center text-xs text-slate-500">
              <Clock className="w-8 h-8 text-slate-700 mb-2" />
              <p>No previous transcriptions found.</p>
              <p className="mt-1 text-slate-600">Your completed speech conversions will appear here.</p>
            </div>
          ) : (
            records.map((rec) => {
              const isActive = rec.id === activeRecordId;
              const dateStr = new Date(rec.timestamp).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={rec.id}
                  onClick={() => {
                    onSelectRecord(rec);
                    onClose();
                  }}
                  className={`group flex items-start justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isActive
                      ? 'bg-orange-950/30 border-orange-700/60 shadow-xs'
                      : 'bg-slate-950/50 hover:bg-slate-800/60 border-slate-800'
                  }`}
                >
                  <div className="flex-1 pr-3">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
                      <span>{dateStr}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums text-slate-300">
                        {formatTimestamp(rec.audioDurationSeconds)}
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-slate-200 group-hover:text-orange-300 line-clamp-1 transition-colors">
                      {rec.title || rec.filename}
                    </h4>
                    <p className="mt-1 text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {rec.text}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 self-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteRecord(rec.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-md transition-all cursor-pointer"
                      title="Delete record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {records.length > 0 && (
          <div className="flex items-center justify-between px-6 py-3 bg-slate-950 border-t border-slate-800 text-xs">
            <button
              type="button"
              onClick={onClearAll}
              className="text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
            >
              Clear All History
            </button>
            <span className="text-slate-600">Saved in browser storage</span>
          </div>
        )}
      </div>
    </div>
  );
};
