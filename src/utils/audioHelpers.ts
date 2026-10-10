import { SampleRecording, TranscriptionSegment } from '../types';

/**
 * Format seconds into mm:ss.SS format (e.g. 02:45.30)
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00.00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 100);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(2, '0')}`;
}

/**
 * Format seconds into mm:ss (e.g. 01:24)
 */
export function formatTimestamp(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Format bytes into human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format time to SRT timecode: 00:01:23,456
 */
function toSrtTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

/**
 * Format time to VTT timecode: 00:01:23.456
 */
function toVttTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

/**
 * Convert segments array to SRT subtitle format string
 */
export function exportToSRT(segments: TranscriptionSegment[]): string {
  return segments
    .map((seg, idx) => {
      return `${idx + 1}\n${toSrtTime(seg.start)} --> ${toSrtTime(seg.end)}\n${seg.text.trim()}\n`;
    })
    .join('\n');
}

/**
 * Convert segments array to WebVTT subtitle format string
 */
export function exportToVTT(segments: TranscriptionSegment[]): string {
  const body = segments
    .map((seg, idx) => {
      return `${idx + 1}\n${toVttTime(seg.start)} --> ${toVttTime(seg.end)}\n${seg.text.trim()}\n`;
    })
    .join('\n');
  return `WEBVTT\n\n${body}`;
}

/**
 * Download text or blob content as a local file
 */
export function downloadFile(content: string | Blob, filename: string, mimeType: string = 'text/plain'): void {
  const blob = typeof content === 'string' ? new Blob([content], { type: mimeType }) : content;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Generate a synthetic WAV audio file with harmonic speech tones so users
 * can test transcription instantly without needing an external audio file.
 */
export function createSyntheticAudioBlob(durationSeconds: number = 4): Blob {
  const sampleRate = 44100;
  const numChannels = 1;
  const numFrames = Math.floor(sampleRate * durationSeconds);
  const buffer = new ArrayBuffer(44 + numFrames * 2);
  const view = new DataView(buffer);

  // Write WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numFrames * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * numChannels * 2, true); // ByteRate
  view.setUint16(32, numChannels * 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(36, 'data');
  view.setUint32(40, numFrames * 2, true);

  // Write synthetic speech-like acoustic formants
  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate;
    // modulated acoustic harmonics
    const f1 = 220; // fundamental pitch
    const envelope = Math.sin((Math.PI * t) / durationSeconds);
    const formant =
      0.6 * Math.sin(2 * Math.PI * f1 * t) +
      0.25 * Math.sin(2 * Math.PI * (f1 * 2) * t) +
      0.15 * Math.sin(2 * Math.PI * (f1 * 3) * t);
    
    // add small speech cadence modulation
    const speechCadence = Math.sin(2 * Math.PI * 4 * t) > 0 ? 1 : 0.4;
    const sample = Math.max(-1, Math.min(1, formant * envelope * speechCadence * 0.4));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Pre-configured realistic sample transcripts for instant preview & demonstration
 */
export const SAMPLE_RECORDINGS: SampleRecording[] = [
  {
    id: 'sample-ai-inference',
    title: 'Keynote: Low-Latency AI on Groq LPUs',
    speaker: 'Engineering Director',
    durationSeconds: 18.5,
    category: 'Technology',
    description: 'Technical presentation explaining deterministic compute and Whisper audio throughput on Groq LPUs.',
    sampleText: 'Welcome everyone. Today we are demonstrating Whisper Large v3 running on Groq Language Processing Units. By executing neural network weights in a single deterministic instruction cycle, Groq delivers transcription latencies under 400 milliseconds for 30 seconds of audio. This enables truly conversational voice interfaces without awkward pauses.',
    segments: [
      {
        id: 0,
        seek: 0,
        start: 0.0,
        end: 4.8,
        text: 'Welcome everyone. Today we are demonstrating Whisper Large v3 running on Groq Language Processing Units.',
      },
      {
        id: 1,
        seek: 0,
        start: 4.8,
        end: 11.2,
        text: 'By executing neural network weights in a single deterministic instruction cycle, Groq delivers transcription latencies under 400 milliseconds for 30 seconds of audio.',
      },
      {
        id: 2,
        seek: 0,
        start: 11.2,
        end: 18.5,
        text: 'This enables truly conversational voice interfaces without awkward pauses or network bottlenecks.',
      },
    ],
  },
  {
    id: 'sample-sprint-standup',
    title: 'Daily Engineering Standup & Release Review',
    speaker: 'Sprint Lead & Backend Dev',
    durationSeconds: 22.0,
    category: 'Product Team',
    description: 'Sprint planning sync covering API token caching, audio stream chunking, and frontend latency.',
    sampleText: 'Quick update on sprint item 14. I merged the multi-part audio streaming handler this morning. The WebSocket proxy is now deployed to staging, and we cut transcription round-trip latency by 35%. Next on my list is adding automatic retry logic when token rate limits are approached, plus exporting SRT subtitle files for video creators.',
    segments: [
      {
        id: 0,
        seek: 0,
        start: 0.0,
        end: 5.4,
        text: 'Quick update on sprint item 14. I merged the multi-part audio streaming handler this morning.',
      },
      {
        id: 1,
        seek: 0,
        start: 5.4,
        end: 12.8,
        text: 'The WebSocket proxy is now deployed to staging, and we cut transcription round-trip latency by 35%.',
      },
      {
        id: 2,
        seek: 0,
        start: 12.8,
        end: 22.0,
        text: 'Next on my list is adding automatic retry logic when token rate limits are approached, plus exporting SRT subtitle files for video creators.',
      },
    ],
  },
  {
    id: 'sample-clinical-notes',
    title: 'Clinical Patient Consultation Dictation',
    speaker: 'Dr. Sarah Mitchell, MD',
    durationSeconds: 16.2,
    category: 'Healthcare & Med',
    description: 'Medical consultation notes dictation with clinical terminology and prescription details.',
    sampleText: 'Patient is a 45-year-old male presenting with intermittent sinus headaches and mild seasonal rhinitis. Vital signs are within normal limits: blood pressure 118 over 76, pulse 72. Recommending fluticasone propionate nasal spray 50 micrograms daily and hydration. Follow-up scheduled in three weeks.',
    segments: [
      {
        id: 0,
        seek: 0,
        start: 0.0,
        end: 6.2,
        text: 'Patient is a 45-year-old male presenting with intermittent sinus headaches and mild seasonal rhinitis.',
      },
      {
        id: 1,
        seek: 0,
        start: 6.2,
        end: 11.5,
        text: 'Vital signs are within normal limits: blood pressure 118 over 76, pulse 72.',
      },
      {
        id: 2,
        seek: 0,
        start: 11.5,
        end: 16.2,
        text: 'Recommending fluticasone propionate nasal spray 50 micrograms daily and hydration. Follow-up scheduled in three weeks.',
      },
    ],
  },
];
