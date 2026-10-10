import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, ArrowRight, AlertCircle, Volume2 } from 'lucide-react';
import { AudioVisualizer } from './AudioVisualizer';
import { formatDuration } from '../utils/audioHelpers';

interface LiveRecorderProps {
  onAudioReady: (blob: Blob, durationSeconds: number) => void;
  isTranscribing: boolean;
}

export const LiveRecorder: React.FC<LiveRecorderProps> = ({
  onAudioReady,
  isTranscribing,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Clean up resources on unmount
  useEffect(() => {
    return () => {
      stopTracks();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [audioUrl]);

  const stopTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startRecording = async () => {
    setMicError(null);
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordDuration(0);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Setup Web Audio Analyser
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Select supported mimeType
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        } else {
          mimeType = '';
        }
      }

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: finalType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };

      mediaRecorder.start(100); // 100ms chunk slices
      setIsRecording(true);
      setIsPaused(false);

      const startTime = Date.now();
      timerIntervalRef.current = window.setInterval(() => {
        setRecordDuration((Date.now() - startTime) / 1000);
      }, 50);
    } catch (err: any) {
      console.error('Error starting microphone recording:', err);
      let msg = 'Unable to access microphone. Please check browser permissions.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Microphone permission was denied. Please allow microphone access in your browser bar.';
      } else if (err.name === 'NotFoundError') {
        msg = 'No microphone input device detected.';
      }
      setMicError(msg);
      setIsRecording(false);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      const resumeStart = Date.now() - recordDuration * 1000;
      timerIntervalRef.current = window.setInterval(() => {
        setRecordDuration((Date.now() - resumeStart) / 1000);
      }, 50);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    stopTracks();
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsRecording(false);
    setIsPaused(false);
  };

  const resetRecording = () => {
    stopRecording();
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordDuration(0);
    setIsPlayingPreview(false);
    setPreviewProgress(0);
  };

  const togglePreviewPlay = () => {
    if (!previewAudioRef.current) return;
    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.play().catch(console.error);
      setIsPlayingPreview(true);
    }
  };

  const handleAudioTimeUpdate = () => {
    if (previewAudioRef.current && recordDuration > 0) {
      const current = previewAudioRef.current.currentTime;
      setPreviewProgress((current / recordDuration) * 100);
    }
  };

  const handleAudioEnded = () => {
    setIsPlayingPreview(false);
    setPreviewProgress(0);
  };

  const handleProceedToTranscribe = () => {
    if (audioBlob) {
      onAudioReady(audioBlob, recordDuration);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-6 bg-slate-900/70 border border-slate-800 rounded-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Live Microphone Studio</h3>
            <p className="text-xs text-slate-400">High-fidelity voice capture with Web Audio acoustic metering</p>
          </div>
        </div>

        {/* Live Status indicator */}
        <div className="flex items-center gap-2">
          {isRecording ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-red-400 bg-red-950/60 border border-red-800/40 rounded-md">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {isPaused ? 'Paused' : 'Recording'}
            </span>
          ) : audioBlob ? (
            <span className="px-2.5 py-1 text-xs font-medium text-emerald-400 bg-emerald-950/50 border border-emerald-800/30 rounded-md">
              Audio Captured
            </span>
          ) : (
            <span className="px-2.5 py-1 text-xs text-slate-400 bg-slate-800/50 border border-slate-700/40 rounded-md">
              Standby
            </span>
          )}
        </div>
      </div>

      {micError && (
        <div className="flex items-start gap-2.5 p-3.5 bg-red-950/40 border border-red-800/50 rounded-lg text-xs text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
          <div className="flex-1">
            <p className="font-medium text-red-200">Microphone Access Error</p>
            <p className="mt-0.5 text-red-300/90">{micError}</p>
          </div>
        </div>
      )}

      {/* Visualizer & Timer Display */}
      <div className="flex flex-col gap-3">
        <AudioVisualizer
          analyser={analyserRef.current}
          isRecording={isRecording && !isPaused}
          isPlaying={isPlayingPreview}
          className="h-20"
        />

        <div className="flex items-center justify-between px-3 py-2 bg-slate-950/60 border border-slate-800/70 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Volume2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Acoustic Monitor</span>
            <span aria-hidden="true">·</span>
            <span>44.1 kHz Studio PCM</span>
          </div>
          <div className="text-base font-mono tabular-nums font-semibold tracking-wider text-orange-400">
            {formatDuration(recordDuration)}
          </div>
        </div>
      </div>

      {/* Recording Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
        {!isRecording && !audioBlob && (
          <button
            type="button"
            onClick={startRecording}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-500 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Mic className="w-4 h-4" />
            Start Recording
          </button>
        )}

        {isRecording && (
          <div className="flex items-center gap-2">
            {isPaused ? (
              <button
                type="button"
                onClick={resumeRecording}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                Resume
              </button>
            ) : (
              <button
                type="button"
                onClick={pauseRecording}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5 text-amber-400" />
                Pause
              </button>
            )}

            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Finish Recording
            </button>
          </div>
        )}

        {audioBlob && !isRecording && (
          <div className="flex flex-wrap items-center justify-between w-full gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePreviewPlay}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors cursor-pointer"
              >
                {isPlayingPreview ? (
                  <>
                    <Pause className="w-3.5 h-3.5 text-sky-400" />
                    Pause Playback
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    Listen Preview
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={resetRecording}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors cursor-pointer"
                title="Discard and record again"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Re-record
              </button>
            </div>

            <button
              type="button"
              onClick={handleProceedToTranscribe}
              disabled={isTranscribing}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-50 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <span>Transcribe with Groq</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {audioUrl && (
        <audio
          ref={previewAudioRef}
          src={audioUrl}
          onTimeUpdate={handleAudioTimeUpdate}
          onEnded={handleAudioEnded}
          className="hidden"
        />
      )}
    </div>
  );
};
