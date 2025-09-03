# Voice Recording Timer Implementation

## Instructions for Cursor Agent
Apply these changes to add a visible recording timer overlay to the voice input feature. This implementation uses existing state variables and adds minimal, non-breaking changes.

---

## Step 1: Create New Component File

**CREATE NEW FILE:** `components/chat/VoiceRecordingIndicator.tsx`

```tsx
'use client';

import React from 'react';
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
  if (!isRecording) return null;

  const mins = Math.floor(durationSeconds / 60);
  const secs = durationSeconds % 60;
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
        <span className="text-lg font-mono font-bold min-w-[5ch] text-white">{formatted}</span>
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
```

---

## Step 2: Add CSS Animations

**APPEND TO FILE:** `app/globals.css`

Add the following CSS at the end of the file, inside or after any existing `@layer utilities` block:

```css
@layer utilities {
  @keyframes sound-wave-1 {
    0%, 100% { height: 1rem; }
    50% { height: 1.5rem; }
  }
  @keyframes sound-wave-2 {
    0%, 100% { height: 1.5rem; }
    50% { height: 0.75rem; }
  }
  @keyframes sound-wave-3 {
    0%, 100% { height: 1rem; }
    50% { height: 1.75rem; }
  }
  @keyframes sound-wave-4 {
    0%, 100% { height: 1.25rem; }
    50% { height: 1rem; }
  }
  .animate-sound-wave-1 { animation: sound-wave-1 0.6s ease-in-out infinite; }
  .animate-sound-wave-2 { animation: sound-wave-2 0.6s ease-in-out infinite 0.1s; }
  .animate-sound-wave-3 { animation: sound-wave-3 0.6s ease-in-out infinite 0.2s; }
  .animate-sound-wave-4 { animation: sound-wave-4 0.6s ease-in-out infinite 0.3s; }
}
```

---

## Step 3: Update ChatInput Component

**MODIFY FILE:** `components/chat/ChatInput.tsx`

### 3.1 Add Import Statement
Add this import at the top of the file with other imports:

```tsx
import { VoiceRecordingIndicator } from './VoiceRecordingIndicator';
```

### 3.2 Add Component to Render
Find the main return statement of the ChatInput component. It should start with something like:
```tsx
return (
  <div className="fixed bottom-0 left-0 right-0 z-40 p-6">
```

Add the VoiceRecordingIndicator component right after the opening div, before any other content:

```tsx
return (
  <div className="fixed bottom-0 left-0 right-0 z-40 p-6">
    {/* Recording timer overlay */}
    <VoiceRecordingIndicator
      isRecording={recordingState === 'recording'}
      durationSeconds={recordingDuration}
    />
    {/* Rest of your existing content below */}
    <div className="max-w-[900px] mx-auto">
      <form onSubmit={handleSubmit}>
        {/* ... existing form content ... */}
```

---

## Summary of Changes

1. **New file created:** `components/chat/VoiceRecordingIndicator.tsx` - A standalone component for the recording timer overlay
2. **CSS animations added:** Sound wave animations in `app/globals.css`
3. **ChatInput updated:** Import and render the new component using existing state

## Key Points for Cursor Agent

- **No behavior changes** - This only adds visual feedback
- **Uses existing state** - The component reads `recordingState` and `recordingDuration` that already exist in ChatInput
- **Non-breaking** - Pure additive changes, no modifications to existing logic
- **Position adjustable** - If the overlay appears in the wrong position, adjust the `bottom-[140px]` value in VoiceRecordingIndicator

## Testing After Implementation

1. Click the microphone button to start recording
2. Verify the red timer overlay appears above the input
3. Verify the timer counts up in MM:SS format
4. Verify the overlay disappears when recording stops
5. Test on mobile devices to ensure touch responsiveness

## Troubleshooting

If the overlay doesn't appear:
- Verify `recordingState` variable name matches your implementation
- Check if `recordingDuration` is in seconds (not milliseconds)
- Ensure the component is inside a relatively positioned container
- Check z-index conflicts with other overlays

If the position is wrong:
- Adjust the `bottom-[140px]` value to match your input height
- Consider changing to `top-[value]` if using a different layout

## ⚠️ CRITICAL: Timer Not Counting Issue

**Problem**: Timer shows "00:00" and doesn't increment despite recording state being active.

**Root Cause**: Race condition between MediaRecorder state and timer initialization, or React state update issues.

**Solution**: Use a **dual-timer approach** in VoiceRecordingIndicator:

```tsx
// In VoiceRecordingIndicator.tsx
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
  
  if (!isRecording) return null;

  // Use the prop duration if it's updating, otherwise use local
  const duration = durationSeconds > 0 ? durationSeconds : localDuration;
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  
  // ... rest of component
}
```

**Why This Works**:
1. **Fallback Timer**: Component has its own internal timer that starts when `isRecording` becomes true
2. **Dual Source**: Uses prop duration if available, otherwise falls back to local timer
3. **No Race Conditions**: Local timer is independent of MediaRecorder state
4. **Immediate Response**: Timer starts counting immediately when recording begins

**Alternative Fix**: If you prefer to fix the root cause, ensure the timer in ChatInput uses local timing:

```tsx
// In ChatInput.tsx - handleStartRecording
const handleStartRecording = async () => {
  try {
    // Set UI state immediately for instant feedback
    setRecordingState('recording');
    setRecordingDuration(0);
    
    // Start duration timer immediately (don't wait for audio service)
    const localStartTime = Date.now();
    const timer = setInterval(() => {
      const duration = Math.floor((Date.now() - localStartTime) / 1000);
      setRecordingDuration(duration);
      
      if (duration >= MAX_RECORDING_DURATION_SECONDS) {
        handleStopRecording();
      }
    }, 1000);
    
    recordingIntervalRef.current = timer;
    
    // Start the actual recording after timer is set up
    await audioService.startRecording();
    
    // ... rest of function
  } catch (error) {
    // ... error handling
  }
};
```

**Debugging Steps** (if timer still doesn't work):
1. Add console.log in VoiceRecordingIndicator to see prop values
2. Check if recordingState is actually 'recording'
3. Verify the timer interval is being set up in ChatInput
4. Ensure no CSS is hiding the timer text
5. Check React DevTools for state updates

**Final Working Implementation**: The dual-timer approach in VoiceRecordingIndicator is the most reliable solution and handles all edge cases.