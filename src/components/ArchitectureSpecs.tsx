import React from 'react';
import { Cpu, Zap, Server, Shield, Layers, Code, ArrowRight } from 'lucide-react';

export const ArchitectureSpecs: React.FC = () => {
  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto py-6">
      {/* Intro */}
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold tracking-tight text-slate-100">
          Full-Stack Audio Architecture & Groq LPU Benchmarks
        </h2>
        <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
          GroqScribe bridges native browser audio capture with high-throughput Express streaming and
          deterministic Language Processing Units (LPUs) executing OpenAI Whisper Large v3 models.
        </p>
      </div>

      {/* 3-Tier Pipeline Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-400 mb-2">
              <Layers className="w-4 h-4" />
              <span>01. Browser Layer</span>
            </div>
            <h4 className="text-sm font-semibold text-slate-200">Acoustic Web Audio API</h4>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Real-time Web Audio API <code className="text-slate-300">AnalyserNode</code> calculates FFT frequency bins
              at 44.1 kHz. Hardware-accelerated Canvas renders live speech cadences with zero dropped frames.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono">
            PCM Opus / WAV · 100ms Chunks
          </div>
        </div>

        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-400 mb-2">
              <Server className="w-4 h-4" />
              <span>02. Express Backend</span>
            </div>
            <h4 className="text-sm font-semibold text-slate-200">Streaming Proxy Engine</h4>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Express 4 backend with in-memory <code className="text-slate-300">Multer</code> buffers files up to 25 MB.
              Proxies multipart payload directly to Groq endpoints without writing unencrypted audio to disk.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono">
            Node.js 22 · Native Fetch & FormData
          </div>
        </div>

        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-400 mb-2">
              <Cpu className="w-4 h-4" />
              <span>03. LPU Processing</span>
            </div>
            <h4 className="text-sm font-semibold text-slate-200">Groq Whisper Engine</h4>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Deterministic SRAM interconnects eliminate GPU memory stalls, achieving up to 216x real-time factor
              with sub-second word-level timestamp alignment and multi-lingual transcription.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono">
            Whisper Large v3 · Llama 3.3 70B
          </div>
        </div>
      </div>

      {/* Model Comparison Matrix */}
      <div className="flex flex-col gap-3 p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
        <h3 className="text-sm font-semibold text-slate-200">Supported Groq Audio Inference Models</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 uppercase text-[11px]">
                <th className="py-2.5 px-3">Model Name</th>
                <th className="py-2.5 px-3">Primary Strength</th>
                <th className="py-2.5 px-3">Languages</th>
                <th className="py-2.5 px-3">Relative Speed</th>
                <th className="py-2.5 px-3">Word Timestamps</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              <tr>
                <td className="py-3 px-3 font-mono text-orange-400 font-medium">whisper-large-v3</td>
                <td className="py-3 px-3">Highest multilingual accuracy & technical vocabulary</td>
                <td className="py-3 px-3">99+ Languages</td>
                <td className="py-3 px-3 font-mono tabular-nums text-slate-200">~15x - 25x Real-Time</td>
                <td className="py-3 px-3 text-emerald-400">Supported</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-mono text-orange-400 font-medium">whisper-large-v3-turbo</td>
                <td className="py-3 px-3">Ultra-low latency with minimal accuracy degradation</td>
                <td className="py-3 px-3">99+ Languages</td>
                <td className="py-3 px-3 font-mono tabular-nums text-slate-200">~40x - 65x Real-Time</td>
                <td className="py-3 px-3 text-emerald-400">Supported</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-mono text-orange-400 font-medium">distil-whisper-large-v3-en</td>
                <td className="py-3 px-3">Fastest high-throughput English speech processing</td>
                <td className="py-3 px-3">English Only</td>
                <td className="py-3 px-3 font-mono tabular-nums text-slate-200">~80x - 120x Real-Time</td>
                <td className="py-3 px-3 text-emerald-400">Supported</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
