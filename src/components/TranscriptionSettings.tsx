import React from 'react';
import { Sliders, Languages, Cpu, Info, FileText } from 'lucide-react';
import { TranscriptionOptions, GroqWhisperModel } from '../types';

interface TranscriptionSettingsProps {
  options: TranscriptionOptions;
  onChange: (updated: Partial<TranscriptionOptions>) => void;
}

const LANGUAGES = [
  { code: 'auto', name: 'Auto Detect Language' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'it', name: 'Italian (Italiano)' },
  { code: 'pt', name: 'Portuguese (Português)' },
  { code: 'zh', name: 'Chinese (Mandarin)' },
  { code: 'ja', name: 'Japanese (日本語)' },
  { code: 'ko', name: 'Korean (한국어)' },
  { code: 'hi', name: 'Hindi (हिन्दी)' },
  { code: 'ar', name: 'Arabic (العربية)' },
  { code: 'ru', name: 'Russian (Русский)' },
  { code: 'nl', name: 'Dutch (Nederlands)' },
  { code: 'pl', name: 'Polish (Polski)' },
  { code: 'tr', name: 'Turkish (Türkçe)' },
  { code: 'sv', name: 'Swedish (Svenska)' },
];

export const TranscriptionSettings: React.FC<TranscriptionSettingsProps> = ({
  options,
  onChange,
}) => {
  return (
    <div className="flex flex-col gap-5 p-5 bg-slate-900/50 border border-slate-800 rounded-xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Sliders className="w-3.5 h-3.5 text-orange-400" />
          <span>Inference Engine & Settings</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Cpu className="w-3.5 h-3.5 text-slate-400" />
          <span>Groq LPU Acceleration</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Model Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-300">
            Groq Whisper Model
          </label>
          <select
            value={options.model}
            onChange={(e) => onChange({ model: e.target.value as GroqWhisperModel })}
            className="w-full px-3 py-2 text-xs font-medium bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-orange-500 transition-colors"
          >
            <option value="whisper-large-v3">whisper-large-v3 (Highest Accuracy)</option>
            <option value="whisper-large-v3-turbo">whisper-large-v3-turbo (Ultra-Fast)</option>
            <option value="distil-whisper-large-v3-en">distil-whisper-large-v3-en (English Optimized)</option>
          </select>
          <p className="text-[11px] text-slate-500">
            {options.model === 'whisper-large-v3'
              ? 'Multi-lingual benchmark standard with timestamp alignment'
              : options.model === 'whisper-large-v3-turbo'
              ? 'Distilled for sub-second responses with minimal memory footprint'
              : 'Optimized high-throughput English speech model'}
          </p>
        </div>

        {/* Task Mode (Transcribe vs Translate) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-300">
            Task Action
          </label>
          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => onChange({ mode: 'transcribe' })}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                options.mode === 'transcribe'
                  ? 'bg-slate-800 text-slate-100 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Transcribe
            </button>
            <button
              type="button"
              onClick={() => onChange({ mode: 'translate' })}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                options.mode === 'translate'
                  ? 'bg-orange-600/90 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Translate → EN
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            {options.mode === 'transcribe'
              ? 'Preserves exact spoken language verbatim'
              : 'Directly translates foreign audio into English'}
          </p>
        </div>

        {/* Spoken Language */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-300">
            Audio Language
          </label>
          <select
            value={options.language}
            disabled={options.mode === 'translate'}
            onChange={(e) => onChange({ language: e.target.value })}
            className="w-full px-3 py-2 text-xs font-medium bg-slate-950 border border-slate-800 rounded-lg text-slate-200 disabled:opacity-50 focus:outline-none focus:border-orange-500 transition-colors"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500">
            Specifying the language reduces latency by skipping initial language identification
          </p>
        </div>
      </div>

      {/* Advanced Prompt Bias & Temperature */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/60">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-300">
              Prompt & Jargon Guidance (Optional)
            </label>
            <span className="text-[11px] text-slate-500">Biases vocabulary</span>
          </div>
          <input
            type="text"
            placeholder="e.g. Groq, Whisper, PyTorch, Kubernetes, API endpoints..."
            value={options.prompt}
            onChange={(e) => onChange({ prompt: e.target.value })}
            className="px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-300">
              Sampling Temperature
            </label>
            <span className="text-xs font-mono tabular-nums text-orange-400">
              {options.temperature.toFixed(1)}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={options.temperature}
            onChange={(e) => onChange({ temperature: parseFloat(e.target.value) })}
            className="w-full accent-orange-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>0.0 (Strict / Accurate)</span>
            <span>1.0 (Creative / Flexible)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
