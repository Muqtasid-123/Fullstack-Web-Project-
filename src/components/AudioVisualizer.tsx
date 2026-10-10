import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isRecording: boolean;
  isPlaying?: boolean;
  className?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  analyser,
  isRecording,
  isPlaying = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let bufferLength = 64;
    let dataArray = new Uint8Array(bufferLength);

    if (analyser) {
      analyser.fftSize = 128;
      bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
    }

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      if (isRecording && analyser) {
        analyser.getByteFrequencyData(dataArray);
      } else if (isPlaying) {
        // Simulated rhythmic playback wave
        const now = Date.now() / 200;
        for (let i = 0; i < bufferLength; i++) {
          const wave = Math.sin(now + i * 0.3) * 0.5 + 0.5;
          const harmonic = Math.cos(now * 1.5 + i * 0.2) * 0.3;
          dataArray[i] = Math.floor(Math.max(10, Math.min(240, (wave + harmonic) * 180)));
        }
      } else {
        // Idle gentle breathing baseline
        const now = Date.now() / 800;
        for (let i = 0; i < bufferLength; i++) {
          const val = 12 + Math.sin(now + i * 0.15) * 6;
          dataArray[i] = Math.floor(val);
        }
      }

      const barWidth = (width / bufferLength) * 1.8;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height * 0.9 + 4;
        const y = (height - barHeight) / 2;

        // Gradient from amber-500 to orange-400
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        if (isRecording) {
          gradient.addColorStop(0, '#f97316'); // orange-500
          gradient.addColorStop(1, '#ef4444'); // red-500
        } else if (isPlaying) {
          gradient.addColorStop(0, '#38bdf8'); // sky-400
          gradient.addColorStop(1, '#6366f1'); // indigo-500
        } else {
          gradient.addColorStop(0, '#64748b'); // slate-500
          gradient.addColorStop(1, '#334155'); // slate-700
        }

        ctx.fillStyle = gradient;
        // Rounded bar caps
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, Math.max(2, barWidth - 2), barHeight, 2);
        } else {
          ctx.rect(x, y, Math.max(2, barWidth - 2), barHeight);
        }
        ctx.fill();

        x += barWidth + 1;
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyser, isRecording, isPlaying]);

  return (
    <div className={`relative overflow-hidden rounded-lg bg-slate-900/80 border border-slate-800 ${className}`}>
      <canvas
        ref={canvasRef}
        width={420}
        height={64}
        className="w-full h-full block"
      />
    </div>
  );
};
