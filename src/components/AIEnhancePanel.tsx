import React, { useState } from 'react';
import {
  Sparkles,
  FileText,
  CheckSquare,
  ClipboardList,
  Wand2,
  Globe,
  HelpCircle,
  Copy,
  Check,
  Loader2,
  X,
  Zap,
} from 'lucide-react';
import { EnhanceTask } from '../types';

interface AIEnhancePanelProps {
  transcript: string;
  groqApiKey: string;
  isOpen: boolean;
  onClose: () => void;
}

const TASKS: { id: EnhanceTask; title: string; desc: string; icon: any }[] = [
  {
    id: 'summary',
    title: 'Executive Summary',
    desc: 'High-signal 3-sentence summary and 4 key bullet points',
    icon: FileText,
  },
  {
    id: 'meeting_notes',
    title: 'Formal Meeting Minutes',
    desc: 'Structured Agenda, Discussion, Decisions & Action Items',
    icon: ClipboardList,
  },
  {
    id: 'action_items',
    title: 'Action Item Checklist',
    desc: 'Extract deliverables, assignees & priority checklists',
    icon: CheckSquare,
  },
  {
    id: 'polish',
    title: 'Polish & Speech Cleanup',
    desc: 'Eliminate spoken fillers ("um", "uh") and fix grammar',
    icon: Wand2,
  },
  {
    id: 'translate',
    title: 'Multilingual Translation',
    desc: 'Translate transcript into 12+ international languages',
    icon: Globe,
  },
  {
    id: 'qa',
    title: 'Q&A / Key Insights',
    desc: 'Generate interactive question & answer cards',
    icon: HelpCircle,
  },
];

const TARGET_LANGS = [
  'Spanish',
  'French',
  'German',
  'Japanese',
  'Chinese (Mandarin)',
  'Italian',
  'Portuguese',
  'Arabic',
  'Hindi',
  'Russian',
  'Dutch',
  'Korean',
];

export const AIEnhancePanel: React.FC<AIEnhancePanelProps> = ({
  transcript,
  groqApiKey,
  isOpen,
  onClose,
}) => {
  const [activeTask, setActiveTask] = useState<EnhanceTask>('summary');
  const [targetLanguage, setTargetLanguage] = useState('Spanish');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const handleRunTask = async (taskToRun: EnhanceTask = activeTask) => {
    setIsLoading(true);
    setErrorMessage(null);
    setResult(null);
    setLatencyMs(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (groqApiKey) {
        headers['x-groq-api-key'] = groqApiKey;
      }

      const res = await fetch('/api/enhance', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          transcript,
          task: taskToRun,
          targetLanguage,
          customInstruction: customPrompt,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process AI enhancement');
      }

      setResult(data.result);
      setLatencyMs(data.elapsedMs);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during inference');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="flex flex-col w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Groq Audio Intelligence Studio
              </h3>
              <p className="text-xs text-slate-400">
                Powered by Llama 3.3 70B on Groq LPUs
              </p>
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

        {/* Task Grid Selector */}
        <div className="p-6 border-b border-slate-800/80 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {TASKS.map((task) => {
              const Icon = task.icon;
              const isSelected = activeTask === task.id;
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => {
                    setActiveTask(task.id);
                    handleRunTask(task.id);
                  }}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-orange-950/40 border-orange-700/60 shadow-xs'
                      : 'bg-slate-950/60 hover:bg-slate-800/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-orange-400' : 'text-slate-400'}`} />
                    <span className="text-xs font-semibold text-slate-200">
                      {task.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {task.desc}
                  </p>
                </button>
              );
            })}
          </div>

          {activeTask === 'translate' && (
            <div className="flex items-center gap-3 mt-4 p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
              <Globe className="w-4 h-4 text-orange-400 shrink-0" />
              <label className="text-xs font-medium text-slate-300">
                Target Language:
              </label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-orange-500"
              >
                {TARGET_LANGS.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleRunTask('translate')}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-500 rounded-lg ml-auto transition-colors cursor-pointer"
              >
                Translate Now
              </button>
            </div>
          )}
        </div>

        {/* Output Area */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-950/40 min-h-[220px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
              <p className="text-xs font-medium">
                Groq LPU streaming inference in progress...
              </p>
            </div>
          ) : errorMessage ? (
            <div className="p-4 bg-red-950/40 border border-red-800 rounded-xl text-xs text-red-300">
              <p className="font-semibold text-red-200">Enhancement Failed</p>
              <p className="mt-1">{errorMessage}</p>
              <button
                type="button"
                onClick={() => handleRunTask()}
                className="mt-3 px-3 py-1 bg-red-900/60 hover:bg-red-800 rounded-md text-red-100 transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : result ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-200 capitalize">
                    {activeTask.replace('_', ' ')}
                  </span>
                  {latencyMs && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="flex items-center gap-1 font-mono text-amber-400">
                        <Zap className="w-3 h-3" />
                        {latencyMs}ms
                      </span>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-700 transition-colors cursor-pointer"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Output</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl text-xs leading-relaxed text-slate-200 whitespace-pre-wrap font-sans">
                {result}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center text-xs text-slate-500">
              <Sparkles className="w-8 h-8 text-slate-700 mb-2" />
              <p>Select any intelligence action above to analyze the transcript</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
