import React, { useState, useRef } from 'react';
import { UploadCloud, FileAudio, Music, Sparkles, Check, AlertCircle, ArrowRight, Play, Pause } from 'lucide-react';
import { formatBytes, formatDuration, SAMPLE_RECORDINGS, createSyntheticAudioBlob } from '../utils/audioHelpers';
import { SampleRecording } from '../types';

interface FileUploaderProps {
  onFileSelected: (file: File | Blob, name: string, durationSeconds: number) => void;
  onSampleSelected: (sample: SampleRecording) => void;
  isTranscribing: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelected,
  onSampleSelected,
  isTranscribing,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFile = (file: File) => {
    setErrorMessage(null);

    // Limit is 25MB for Groq Whisper
    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage(`File exceeds Groq's 25 MB limit (${formatBytes(file.size)}). Please choose a shorter or compressed audio clip.`);
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Detect duration via Audio element
    const tempAudio = new Audio(url);
    tempAudio.onloadedmetadata = () => {
      setAudioDuration(tempAudio.duration || 0);
    };
    tempAudio.onerror = () => {
      // Audio metadata couldn't be parsed directly by browser (e.g. specialized flac/opus), default to estimate
      setAudioDuration(0);
    };
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setAudioDuration(0);
    setIsPlayingPreview(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const togglePreviewPlay = () => {
    if (!audioPreviewRef.current) return;
    if (isPlayingPreview) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPreviewRef.current.play().catch(console.error);
      setIsPlayingPreview(true);
    }
  };

  const handleUploadSubmit = () => {
    if (selectedFile) {
      onFileSelected(selectedFile, selectedFile.name, audioDuration);
    }
  };

  const handleGenerateSynthTest = () => {
    const synthBlob = createSyntheticAudioBlob(5);
    const synthFile = new File([synthBlob], 'synthetic_speech_test.wav', { type: 'audio/wav' });
    processFile(synthFile);
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-slate-900/70 border border-slate-800 rounded-xl">
      {/* Upload Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !selectedFile && fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-all ${
          selectedFile
            ? 'border-slate-700 bg-slate-950/40 cursor-default'
            : isDragging
            ? 'border-orange-500 bg-orange-950/20 cursor-copy'
            : 'border-slate-800 hover:border-slate-700 bg-slate-950/30 hover:bg-slate-950/50 cursor-pointer'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.flac,.aac,.mp4,.mpeg"
          onChange={handleFileChange}
          className="hidden"
        />

        {!selectedFile ? (
          <div className="flex flex-col items-center text-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700/80 text-orange-400">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">
                Drag and drop your audio file here, or{' '}
                <span className="text-orange-400 underline underline-offset-2">browse files</span>
              </p>
              <div className="flex items-center justify-center gap-2 mt-1.5 text-xs text-slate-500">
                <span>MP3, WAV, M4A, WEBM, FLAC, OGG</span>
                <span aria-hidden="true">·</span>
                <span>Max 25 MB</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col w-full gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 shrink-0">
                  <FileAudio className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-100 truncate max-w-sm">
                    {selectedFile.name}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span>{formatBytes(selectedFile.size)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {audioDuration > 0 ? formatDuration(audioDuration) : 'Calculating duration...'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {previewUrl && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePreviewPlay();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors cursor-pointer"
                  >
                    {isPlayingPreview ? (
                      <>
                        <Pause className="w-3.5 h-3.5 text-sky-400" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 text-emerald-400" />
                        Preview
                      </>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile();
                  }}
                  className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                >
                  Remove
                </button>
              </div>
            </div>

            {previewUrl && (
              <audio
                ref={audioPreviewRef}
                src={previewUrl}
                onEnded={() => setIsPlayingPreview(false)}
                className="hidden"
              />
            )}

            <div className="flex justify-end pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUploadSubmit();
                }}
                disabled={isTranscribing}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-50 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <span>Transcribe Audio File</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="flex items-start gap-2.5 p-3.5 bg-red-950/40 border border-red-800/50 rounded-lg text-xs text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
          <div className="flex-1">
            <p className="font-medium text-red-200">File Error</p>
            <p className="mt-0.5 text-red-300/90">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Preset Demo Samples Library */}
      <div className="flex flex-col gap-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Instant Demo Library (No Audio File Required)</span>
          </div>
          <button
            type="button"
            onClick={handleGenerateSynthTest}
            className="text-xs text-slate-400 hover:text-orange-400 underline underline-offset-2 transition-colors cursor-pointer"
          >
            Generate Acoustic Test Tone
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SAMPLE_RECORDINGS.map((sample) => (
            <div
              key={sample.id}
              onClick={() => onSampleSelected(sample)}
              className="group flex flex-col justify-between p-3.5 bg-slate-950/50 hover:bg-slate-800/50 border border-slate-800/80 hover:border-slate-700 rounded-lg transition-all cursor-pointer text-left"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>{sample.category}</span>
                  <span className="font-mono tabular-nums text-slate-400">{sample.durationSeconds}s</span>
                </div>
                <h5 className="text-xs font-semibold text-slate-200 group-hover:text-orange-300 line-clamp-1 transition-colors">
                  {sample.title}
                </h5>
                <p className="mt-1 text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {sample.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-800/60 text-[11px] text-slate-400">
                <span className="truncate max-w-[120px]">{sample.speaker}</span>
                <span className="font-medium text-orange-400 group-hover:translate-x-0.5 transition-transform">
                  Load & Transcribe →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
