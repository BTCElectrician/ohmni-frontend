'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface VoiceRecordingIndicatorProps {
  isRecording: boolean;
  durationSeconds: number;
  className?: string;
}

export function VoiceRecordingIndicator({
  isRecording,
  durationSeconds,
  className,
}: VoiceRecordingIndicatorProps) {
  // Use local state as a fallback
  const [localDuration, setLocalDuration] = useState(0);
  
  useEffect(() => {
    if (isRecording) {
      const startTime = Date.now();
      const timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setLocalDuration(elapsed);
      }, 1000);
      
      return () => clearInterval(timer);
    } else {
      setLocalDuration(0);
    }
  }, [isRecording]);
  
  // Debug log
  console.log('[VoiceRecordingIndicator] Props vs Local:', { 
    propsDuration: durationSeconds, 
    localDuration,
    isRecording 
  });
  
  if (!isRecording) return null;

  // Use the prop duration if it's updating, otherwise use local
  const duration = durationSeconds > 0 ? durationSeconds : localDuration;
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div
      className={cn(
        // Position above the input bar; adjust bottom if your input height changes
        'absolute bottom-[140px] left-1/2 -translate-x-1/2 z-50',
        'bg-red-600 text-white rounded-full px-5 py-2.5 shadow-2xl',
        'flex items-center gap-3',
        'animate-in fade-in slide-in-from-bottom-2 duration-200',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={`Recording: ${formatted}`}
    >
      {/* Pulsing dot */}
      <div className="relative">
        <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
        <div className="absolute inset-0 w-2.5 h-2.5 bg-white rounded-full animate-ping" />
      </div>

      {/* Label + Timer */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider">Recording</span>
        <span 
          key={durationSeconds} 
          className="text-lg font-mono font-bold min-w-[5ch] text-white"
        >
          {formatted}
        </span>
      </div>

      {/* Sound wave bars */}
      <div className="hidden sm:flex items-end gap-1 ml-1">
        <div className="w-1 bg-white/90 animate-sound-wave-1" style={{ height: '1rem' }} />
        <div className="w-1 bg-white/90 animate-sound-wave-2" style={{ height: '1.5rem' }} />
        <div className="w-1 bg-white/90 animate-sound-wave-3" style={{ height: '1rem' }} />
        <div className="w-1 bg-white/90 animate-sound-wave-4" style={{ height: '1.25rem' }} />
      </div>
    </div>
  );
}
