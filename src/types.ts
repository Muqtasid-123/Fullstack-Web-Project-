export interface TranscriptionSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens?: number[];
  temperature?: number;
  avg_logprob?: number;
  compression_ratio?: number;
  no_speech_prob?: number;
}

export interface TranscriptionResponse {
  text: string;
  task?: 'transcribe' | 'translate';
  language?: string;
  duration?: number;
  segments?: TranscriptionSegment[];
}

export interface TranscriptionRecord {
  id: string;
  title: string;
  timestamp: number;
  filename: string;
  audioDurationSeconds: number;
  elapsedMs: number;
  model: string;
  text: string;
  task: 'transcribe' | 'translate';
  language?: string;
  segments?: TranscriptionSegment[];
  enhancedResults?: {
    [key in EnhanceTask]?: string;
  };
  audioUrl?: string; // object URL or data URL if cached
}

export type EnhanceTask =
  | 'summary'
  | 'action_items'
  | 'meeting_notes'
  | 'polish'
  | 'translate'
  | 'qa'
  | 'custom';

export type GroqWhisperModel =
  | 'whisper-large-v3'
  | 'whisper-large-v3-turbo'
  | 'distil-whisper-large-v3-en';

export interface TranscriptionOptions {
  model: GroqWhisperModel;
  mode: 'transcribe' | 'translate';
  language: string;
  temperature: number;
  prompt: string;
  responseFormat: 'verbose_json' | 'json' | 'text';
}

export interface SampleRecording {
  id: string;
  title: string;
  speaker: string;
  durationSeconds: number;
  description: string;
  category: string;
  sampleText: string;
  segments: TranscriptionSegment[];
}
