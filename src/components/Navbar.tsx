import React from 'react';
import { Key, Mic, FileText, Sparkles, Layers } from 'lucide-react';

interface NavbarProps {
  hasKey: boolean;
  onOpenKeyModal: () => void;
  activeTab: 'studio' | 'history' | 'specs';
  setActiveTab: (tab: 'studio' | 'history' | 'specs') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  hasKey,
  onOpenKeyModal,
  activeTab,
  setActiveTab,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-2 shrink-0">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('studio');
          }}
          className="text-lg font-bold tracking-tight text-slate-100 hover:text-white whitespace-nowrap shrink-0 transition-colors"
        >
          GroqScribe
        </a>
        <span className="text-[11px] font-mono text-orange-400 font-semibold px-1.5 py-0.5 rounded bg-orange-950/60 border border-orange-800/40">
          LPU Whisper
        </span>
      </div>

      {/* Zone 2: 4 clean single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
        <button
          type="button"
          onClick={() => setActiveTab('studio')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'studio' ? 'text-slate-100 font-semibold underline underline-offset-4 decoration-orange-500' : ''
          }`}
        >
          Studio
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'history' ? 'text-slate-100 font-semibold underline underline-offset-4 decoration-orange-500' : ''
          }`}
        >
          Transcripts
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('specs')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'specs' ? 'text-slate-100 font-semibold underline underline-offset-4 decoration-orange-500' : ''
          }`}
        >
          Architecture
        </button>
        <a
          href="https://groq.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
        >
          Groq Cloud
        </a>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onOpenKeyModal}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Key className={`w-3.5 h-3.5 ${hasKey ? 'text-emerald-400' : 'text-orange-400'}`} />
          <span>{hasKey ? 'Groq Key Active' : 'Configure Groq Key'}</span>
        </button>
      </div>
    </header>
  );
};
