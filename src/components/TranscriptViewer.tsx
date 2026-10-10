import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Copy,
  Check,
  Search,
  Download,
  Edit3,
  AlignLeft,
  ListFilter,
  Volume2,
  Clock,
  Sparkles,
  Zap,
  RotateCcw,
  FileCode,
  Share2
} from 'lucide-react';
import { TranscriptionSegment, TranscriptionRecord } from '../types';
import { formatTimestamp, formatDuration, exportToSRT, exportToVTT, downloadFile } from '../utils/audioHelpers';

interface TranscriptViewerProps {
  record: TranscriptionRecord;
  audioBlob?: Blob | null;
  onUpdateText: (newText: string) => void;
  onOpenEnhance: () => void;
}

export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
  record,
  audioBlob,
  onUpdateText,
  onOpenEnhance,
}) => {
  const [viewMode, setViewMode] = useState<'segments' | 'prose'>('segments');
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(record.text);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Audio Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(record.audioDurationSeconds || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(record.audioUrl || null);

  useEffect(() => {
    setEditedText(record.text);
  }, [record.text]);

  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [audioBlob]);

  // Track active segment based on current audio playback time
  useEffect(() => {
    if (!record.segments || record.segments.length === 0) {
      setActiveSegmentIndex(null);
      return;
    }
    const idx = record.segments.findIndex(
      (s) => currentTime >= s.start && currentTime <= s.end
    );
    setActiveSegmentIndex(idx !== -1 ? idx : null);
  }, [currentTime, record.segments]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const seekTo = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      setCurrentTime(seconds);
      if (!isPlaying) {
        audioRef.current.play().catch(console.error);
        setIsPlaying(true);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const cycleSpeed = () => {
    const rates = [1, 1.25, 1.5, 2, 0.75];
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length;
    const newRate = rates[nextIndex];
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  };

  const handleCopy = (content: string, type: string) => {
    navigator.clipboard.writeText(content);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
    onUpdateText(editedText);
  };

  // Word count & metric calculations
  const wordCount = record.text.trim() ? record.text.trim().split(/\s+/).length : 0;
  const charCount = record.text.length;
  const realTimeMultiplier = record.audioDurationSeconds > 0 && record.elapsedMs > 0
    ? (record.audioDurationSeconds / (record.elapsedMs / 1000)).toFixed(1)
    : null;

  // Filter segments for search
  const segments = record.segments || [];
  const filteredSegments = segments.filter((s) =>
    searchQuery ? s.text.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  return (
    <div className="flex flex-col gap-4 bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
      {/* Audio Header & Playback Bar */}
      <div className="flex flex-col p-4 bg-slate-950/80 border-b border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              disabled={!audioUrl}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white shadow-sm transition-transform active:scale-95 cursor-pointer"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-100 truncate max-w-md">
                  {record.title || record.filename}
                </h3>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                <span className="font-mono tabular-nums text-slate-200">
                  {formatTimestamp(currentTime)}
                </span>
                <span>/</span>
                <span className="font-mono tabular-nums text-slate-400">
                  {formatTimestamp(duration)}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-slate-500 text-[11px]">{record.model}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cycleSpeed}
              className="px-2.5 py-1 text-xs font-mono font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-md transition-colors cursor-pointer"
            >
              {playbackRate}x
            </button>

            <button
              type="button"
              onClick={onOpenEnhance}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-200 bg-orange-950/50 hover:bg-orange-900/50 border border-orange-800/60 rounded-md transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              <span>AI Intelligence</span>
            </button>
          </div>
        </div>

        {/* Audio scrubber */}
        <div className="flex items-center gap-3 mt-3">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.05"
            value={currentTime}
            onChange={(e) => seekTo(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
        </div>

        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        )}
      </div>

      {/* Speed & Performance Metrics Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-2.5 bg-slate-900/30 border-b border-slate-800 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Inference Latency:</span>
            <span className="font-mono tabular-nums font-semibold text-slate-200">
              {record.elapsedMs}ms
            </span>
          </div>

          {realTimeMultiplier && (
            <div className="hidden sm:flex items-center gap-1.5">
              <span>Throughput:</span>
              <span className="font-mono tabular-nums font-semibold text-emerald-400">
                {realTimeMultiplier}x Real-Time
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span>Words:</span>
            <span className="font-mono tabular-nums font-medium text-slate-300">
              {wordCount}
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative flex items-center min-w-[200px]">
          <Search className="absolute left-2.5 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1 text-xs bg-slate-950 border border-slate-800 rounded-md text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {/* Toolbar: Views & Export Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5">
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('segments')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              viewMode === 'segments'
                ? 'bg-slate-800 text-slate-100'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Timestamp Segments</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('prose')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              viewMode === 'prose'
                ? 'bg-slate-800 text-slate-100'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlignLeft className="w-3.5 h-3.5" />
            <span>Continuous Text</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
              isEditing
                ? 'bg-orange-950/60 border-orange-800 text-orange-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Done Editing' : 'Edit'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleCopy(record.text, 'text')}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-md transition-colors cursor-pointer"
          >
            {copiedType === 'text' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy Text</span>
          </button>

          <div className="relative group">
            <button
              type="button"
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-md transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:flex flex-col w-40 p-1 bg-slate-900 border border-slate-800 rounded-lg shadow-xl z-20 text-xs">
              <button
                type="button"
                onClick={() => downloadFile(record.text, `${record.filename || 'transcript'}.txt`)}
                className="w-full text-left px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md cursor-pointer"
              >
                Plain Text (.txt)
              </button>
              <button
                type="button"
                onClick={() => downloadFile(`# ${record.title}\n\n${record.text}`, `${record.filename || 'transcript'}.md`)}
                className="w-full text-left px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md cursor-pointer"
              >
                Markdown (.md)
              </button>
              {record.segments && record.segments.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => downloadFile(exportToSRT(record.segments!), `${record.filename || 'transcript'}.srt`, 'application/x-subrip')}
                    className="w-full text-left px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md cursor-pointer"
                  >
                    Subtitles (.srt)
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadFile(exportToVTT(record.segments!), `${record.filename || 'transcript'}.vtt`, 'text/vtt')}
                    className="w-full text-left px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md cursor-pointer"
                  >
                    WebVTT (.vtt)
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => downloadFile(JSON.stringify(record, null, 2), `${record.filename || 'transcript'}.json`, 'application/json')}
                className="w-full text-left px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md cursor-pointer"
              >
                JSON Payload (.json)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-5 pb-5">
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              rows={12}
              className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-sm leading-relaxed text-slate-200 focus:outline-none focus:border-orange-500 font-sans resize-y"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditedText(record.text);
                  setIsEditing(false);
                }}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-500 rounded-md"
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : viewMode === 'segments' ? (
          <div className="flex flex-col gap-2 max-h-[460px] overflow-y-auto pr-1">
            {filteredSegments.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No segments match "{searchQuery}"
              </div>
            ) : (
              filteredSegments.map((segment, idx) => {
                const isActive = activeSegmentIndex === segment.id;
                return (
                  <div
                    key={segment.id || idx}
                    onClick={() => seekTo(segment.start)}
                    className={`group flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-orange-950/30 border-orange-800/70 shadow-xs'
                        : 'bg-slate-950/40 hover:bg-slate-900/60 border-slate-800/80 hover:border-slate-700/80'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        seekTo(segment.start);
                      }}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono tabular-nums shrink-0 transition-colors ${
                        isActive
                          ? 'bg-orange-500 text-slate-950 font-bold'
                          : 'bg-slate-900 text-slate-400 group-hover:text-orange-400 group-hover:bg-slate-800'
                      }`}
                      title="Click to seek audio"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>{formatTimestamp(segment.start)}</span>
                    </button>

                    <div className="flex-1 text-xs leading-relaxed text-slate-200">
                      {searchQuery ? (
                        highlightText(segment.text, searchQuery)
                      ) : (
                        segment.text
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(segment.text, `seg-${segment.id}`);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-slate-300 transition-opacity"
                      title="Copy segment text"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl max-h-[460px] overflow-y-auto">
            <div className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">
              {searchQuery ? highlightText(record.text, searchQuery) : record.text}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper to highlight matching keywords safely
function highlightText(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'));
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={index} className="bg-amber-500/30 text-amber-200 px-0.5 rounded">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
