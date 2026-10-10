import React, { useState, useEffect } from 'react';
import {
  Mic,
  UploadCloud,
  Sparkles,
  Zap,
  Clock,
  History,
  Layers,
  FileAudio,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { LiveRecorder } from './components/LiveRecorder';
import { FileUploader } from './components/FileUploader';
import { TranscriptionSettings } from './components/TranscriptionSettings';
import { TranscriptViewer } from './components/TranscriptViewer';
import { AIEnhancePanel } from './components/AIEnhancePanel';
import { ApiKeyModal } from './components/ApiKeyModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { ArchitectureSpecs } from './components/ArchitectureSpecs';
import {
  TranscriptionOptions,
  TranscriptionRecord,
  SampleRecording,
  GroqWhisperModel,
} from './types';
import { createSyntheticAudioBlob } from './utils/audioHelpers';

const DEFAULT_OPTIONS: TranscriptionOptions = {
  model: 'whisper-large-v3',
  mode: 'transcribe',
  language: 'auto',
  temperature: 0.0,
  prompt: '',
  responseFormat: 'verbose_json',
};

export default function App() {
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('groq_api_key') || '';
  });
  const [hasServerKey, setHasServerKey] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'studio' | 'history' | 'specs'>('studio');
  const [inputMode, setInputMode] = useState<'record' | 'upload'>('record');
  const [options, setOptions] = useState<TranscriptionOptions>(DEFAULT_OPTIONS);

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeProgress, setTranscribeProgress] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [currentRecord, setCurrentRecord] = useState<TranscriptionRecord | null>(null);
  const [currentAudioBlob, setCurrentAudioBlob] = useState<Blob | null>(null);

  const [history, setHistory] = useState<TranscriptionRecord[]>(() => {
    try {
      const saved = localStorage.getItem('groq_transcripts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modals
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isEnhanceModalOpen, setIsEnhanceModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  // Check server health and default env key
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.hasServerApiKey) {
          setHasServerKey(true);
        }
      })
      .catch((err) => {
        console.warn('Backend health check warning:', err);
      });
  }, []);

  // Save history to localStorage
  const saveRecordToHistory = (record: TranscriptionRecord) => {
    setHistory((prev) => {
      const filtered = prev.filter((r) => r.id !== record.id);
      const updated = [record, ...filtered].slice(0, 30); // max 30 records
      try {
        localStorage.setItem('groq_transcripts', JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not persist full history to localStorage:', e);
      }
      return updated;
    });
  };

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('groq_api_key', key);
  };

  const handleDeleteHistoryRecord = (id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      localStorage.setItem('groq_transcripts', JSON.stringify(updated));
      return updated;
    });
    if (currentRecord?.id === id) {
      setCurrentRecord(null);
      setCurrentAudioBlob(null);
    }
  };

  const handleClearAllHistory = () => {
    setHistory([]);
    localStorage.removeItem('groq_transcripts');
    setCurrentRecord(null);
    setCurrentAudioBlob(null);
  };

  // Perform actual Groq speech-to-text API call via backend Express proxy
  const performTranscription = async (
    blob: Blob,
    filename: string,
    durationSeconds: number
  ) => {
    if (!apiKey && !hasServerKey) {
      setErrorMessage(
        'A Groq API Key is required to convert speech. Please click "Configure Groq Key" in the top bar.'
      );
      setIsKeyModalOpen(true);
      return;
    }

    setIsTranscribing(true);
    setTranscribeProgress('Uploading audio to Groq Whisper LPU engine...');
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', blob, filename);
      formData.append('model', options.model);
      formData.append('response_format', options.responseFormat);
      if (options.language && options.language !== 'auto') {
        formData.append('language', options.language);
      }
      if (options.temperature > 0) {
        formData.append('temperature', String(options.temperature));
      }
      if (options.prompt) {
        formData.append('prompt', options.prompt);
      }

      const headers: Record<string, string> = {};
      if (apiKey) {
        headers['x-groq-api-key'] = apiKey;
      }

      const endpoint = options.mode === 'translate' ? '/api/translate-audio' : '/api/transcribe';
      setTranscribeProgress('Executing ultra-fast neural speech recognition...');

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || `Transcription failed with code ${res.status}`);
      }

      const text = json.data?.text || '';
      const segments = json.data?.segments || [];
      const newRecord: TranscriptionRecord = {
        id: 'rec_' + Date.now(),
        title: filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
        filename,
        timestamp: Date.now(),
        audioDurationSeconds: durationSeconds || json.data?.duration || 0,
        elapsedMs: json.elapsedMs || 0,
        model: json.model || options.model,
        task: options.mode,
        language: json.data?.language || options.language,
        text,
        segments,
      };

      setCurrentRecord(newRecord);
      setCurrentAudioBlob(blob);
      saveRecordToHistory(newRecord);
      setTranscribeProgress(null);
    } catch (err: any) {
      console.error('Transcription error:', err);
      setErrorMessage(err.message || 'An error occurred during speech-to-text processing');
    } finally {
      setIsTranscribing(false);
      setTranscribeProgress(null);
    }
  };

  const handleAudioReady = (blob: Blob, durationSeconds: number) => {
    performTranscription(blob, `live_recording_${Date.now()}.wav`, durationSeconds);
  };

  const handleFileSelected = (file: File | Blob, name: string, durationSeconds: number) => {
    performTranscription(file, name, durationSeconds);
  };

  // Instant demo loading with synthetic audio so user can preview everything immediately
  const handleSampleSelected = (sample: SampleRecording) => {
    const synthBlob = createSyntheticAudioBlob(sample.durationSeconds);
    const demoRecord: TranscriptionRecord = {
      id: 'demo_' + sample.id + '_' + Date.now(),
      title: sample.title,
      filename: `${sample.id}.wav`,
      timestamp: Date.now(),
      audioDurationSeconds: sample.durationSeconds,
      elapsedMs: 385,
      model: options.model,
      task: 'transcribe',
      language: 'en',
      text: sample.sampleText,
      segments: sample.segments,
    };
    setCurrentRecord(demoRecord);
    setCurrentAudioBlob(synthBlob);
    saveRecordToHistory(demoRecord);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-orange-500/30 selection:text-orange-200">
      {/* Navigation Top Bar conforming to Section 2 contract */}
      <Navbar
        hasKey={Boolean(apiKey || hasServerKey)}
        onOpenKeyModal={() => setIsKeyModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* Banner with generated studio soundwave asset */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/60 shadow-xl">
          <div className="relative h-44 sm:h-52 w-full overflow-hidden">
            <img
              src="/src/assets/images/soundwave_audio_studio_1791615341310.jpg"
              alt="GroqScribe Audio Studio"
              className="w-full h-full object-cover object-center filter brightness-85"
              referrerPolicy="no-referrer"
            />
            {/* Scrim overlay conforming to Section 1.F */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/30" />
            
            <div className="absolute bottom-4 left-6 right-6 flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 text-xs font-semibold text-orange-400 tracking-wide uppercase mb-1">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Sub-Second Speech Intelligence</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white text-balance">
                  High-Speed Speech to Text with Groq Whisper LPUs
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-300 line-clamp-2 leading-relaxed">
                  Convert live microphone dictations and high-resolution audio files into timestamped,
                  multilingual transcripts with real-time word alignment and AI summaries.
                </p>
              </div>

              <div className="hidden sm:flex items-center gap-3 shrink-0">
                <div className="flex flex-col items-end text-xs">
                  <span className="text-slate-400">Processing Latency</span>
                  <span className="font-mono tabular-nums text-sm font-bold text-orange-400">&lt; 400ms</span>
                </div>
                <div className="h-8 w-px bg-slate-700/60" />
                <div className="flex flex-col items-end text-xs">
                  <span className="text-slate-400">Inference Throughput</span>
                  <span className="font-mono tabular-nums text-sm font-bold text-emerald-400">Up to 216x Real-Time</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Global Error Banner if any */}
        {errorMessage && (
          <div className="flex items-start justify-between gap-3 p-4 bg-red-950/50 border border-red-800 rounded-xl text-xs text-red-200">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-100">Transcription Alert</p>
                <p className="mt-0.5 text-red-300">{errorMessage}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-200 cursor-pointer font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab Routing */}
        {activeTab === 'specs' ? (
          <ArchitectureSpecs />
        ) : activeTab === 'history' ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-semibold text-slate-100">Transcription Records</h2>
                <p className="text-xs text-slate-400">Past audio conversions stored locally</p>
              </div>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllHistory}
                  className="text-xs text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                >
                  Clear All ({history.length})
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 bg-slate-900/40 border border-slate-800 rounded-xl">
                No past transcripts available. Start dictating in the Studio tab.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {history.map((rec) => (
                  <div
                    key={rec.id}
                    onClick={() => {
                      setCurrentRecord(rec);
                      setActiveTab('studio');
                    }}
                    className="p-4 bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 rounded-xl cursor-pointer transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span className="font-mono text-orange-400">{rec.model}</span>
                        <span className="font-mono tabular-nums">{rec.audioDurationSeconds}s</span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-200 line-clamp-1">
                        {rec.title}
                      </h4>
                      <p className="mt-1 text-xs text-slate-400 line-clamp-3 leading-relaxed">
                        {rec.text}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800 text-[11px] text-slate-500">
                      <span>{new Date(rec.timestamp).toLocaleDateString()}</span>
                      <span className="text-orange-400 font-medium">Open in Studio →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Active Studio Tab */
          <div className="flex flex-col gap-6">
            {/* Input Mode Selector Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 bg-slate-900/60 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setInputMode('record')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    inputMode === 'record'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  <span>Live Microphone</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('upload')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    inputMode === 'upload'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>File Upload & Samples</span>
                </button>
              </div>

              <div className="flex items-center gap-2 px-3 text-xs text-slate-400">
                <span className="hidden sm:inline">Active Model:</span>
                <span className="font-mono text-orange-400 font-medium">{options.model}</span>
              </div>
            </div>

            {/* Input Panels */}
            {inputMode === 'record' ? (
              <LiveRecorder
                onAudioReady={handleAudioReady}
                isTranscribing={isTranscribing}
              />
            ) : (
              <FileUploader
                onFileSelected={handleFileSelected}
                onSampleSelected={handleSampleSelected}
                isTranscribing={isTranscribing}
              />
            )}

            {/* Inference Engine Settings */}
            <TranscriptionSettings
              options={options}
              onChange={(updated) => setOptions((prev) => ({ ...prev, ...updated }))}
            />

            {/* Loading Indicator during active transcription */}
            {isTranscribing && (
              <div className="flex flex-col items-center justify-center p-8 bg-slate-900/60 border border-slate-800 rounded-xl gap-3 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
                <p className="text-sm font-semibold text-slate-200">
                  {transcribeProgress || 'Processing audio stream...'}
                </p>
                <p className="text-xs text-slate-400 max-w-sm">
                  Leveraging deterministic LPUs for near-instant inference and word-level alignment
                </p>
              </div>
            )}

            {/* Active Transcript Display */}
            {currentRecord && !isTranscribing && (
              <TranscriptViewer
                record={currentRecord}
                audioBlob={currentAudioBlob}
                onUpdateText={(newText) => {
                  setCurrentRecord((prev) => {
                    if (!prev) return null;
                    const updated = { ...prev, text: newText };
                    saveRecordToHistory(updated);
                    return updated;
                  });
                }}
                onOpenEnhance={() => setIsEnhanceModalOpen(true)}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 px-6 py-4 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">GroqScribe</span>
            <span aria-hidden="true">·</span>
            <span>Production Speech-to-Text Studio</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <button
              type="button"
              onClick={() => setIsKeyModalOpen(true)}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              API Credentials
            </button>
            <a
              href="https://console.groq.com/docs/speech-text"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-200 transition-colors"
            >
              Groq Whisper Docs
            </a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ApiKeyModal
        apiKey={apiKey}
        hasServerKey={hasServerKey}
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        onSaveKey={handleSaveApiKey}
      />

      {currentRecord && (
        <AIEnhancePanel
          transcript={currentRecord.text}
          groqApiKey={apiKey}
          isOpen={isEnhanceModalOpen}
          onClose={() => setIsEnhanceModalOpen(false)}
        />
      )}

      <HistoryDrawer
        isOpen={isHistoryDrawerOpen}
        records={history}
        activeRecordId={currentRecord?.id}
        onClose={() => setIsHistoryDrawerOpen(false)}
        onSelectRecord={(rec) => {
          setCurrentRecord(rec);
          setActiveTab('studio');
        }}
        onDeleteRecord={handleDeleteHistoryRecord}
        onClearAll={handleClearAllHistory}
      />
    </div>
  );
}
