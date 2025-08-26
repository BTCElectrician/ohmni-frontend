# Frontend Voice Recording Implementation - Phase 1

## Objective
Add voice recording capability to the existing microphone button in ChatInput.tsx. User clicks mic, records speech up to 5 minutes, recording auto-transcribes via backend API, and populates the chat input field.

## File Changes Required

### 1. NEW FILE: `services/audioService.ts`
Create this file at `/services/audioService.ts`

**Requirements:**
- Import `getAccessToken` from `@/lib/auth/getAccessToken`
- Create a class `AudioService` with private singleton pattern
- Private properties:
  - `mediaRecorder?: MediaRecorder`
  - `chunks: BlobPart[] = []`
  - `stream?: MediaStream`
  - `mimeType: string = 'audio/webm'`
  - `lastBlob: Blob | null = null` (enables retry after network error)

**Public Methods:**

`async startRecording(): Promise<void>`
- Request microphone permission via `navigator.mediaDevices.getUserMedia({ audio: true })`
- Test MIME types in order: `['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/m4a', 'audio/ogg;codecs=opus']`
- Use first supported type via `MediaRecorder.isTypeSupported(type)`
- If none supported, throw `Error('Voice recording not supported in this browser.')`
- Create MediaRecorder with selected MIME type
- Clear chunks array, set `this.mimeType`
- Set up `ondataavailable` handler: `(e) => { if (e.data?.size) this.chunks.push(e.data) }`
- Call `mediaRecorder.start(250)` for 250ms timeslice
- Store stream reference

`async stopRecording(): Promise<Blob>`
- Return Promise that resolves when recorder fully stops
- Guard: if not recording, throw `Error('No active recording')`
- In promise: set up `onstop` handler that creates Blob from chunks
- Stop all stream tracks via `stream.getTracks().forEach(t => t.stop())`
- Store blob in `this.lastBlob` for potential retry
- Clear internal references
- Call `mediaRecorder.stop()`
- Return the final Blob (resolved in onstop handler to ensure all chunks flushed)

`getAudioBlob(): Blob | null`
- Return `this.lastBlob` if available (enables retry transcription if network fails)

`async sendToTranscription(blob: Blob): Promise<{ text: string; language?: string; durationSec?: number }>`
- Get access token via `await getAccessToken()`
- Create FormData
- Determine file extension from mimeType:
  ```typescript
  const ext = this.mimeType.includes('webm') ? 'webm' 
    : this.mimeType.includes('mp4') ? 'm4a'  // iOS often records as mp4 but backend expects m4a
    : this.mimeType.includes('ogg') ? 'ogg' 
    : 'webm'
  ```
- Append blob as File with name `voice.${ext}`
- Create AbortController with 30 second timeout:
  ```typescript
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)
  ```
- POST to `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/voice/transcribe`
- Include Authorization header if token exists (don't set Content-Type; browser sets multipart boundary)
- Pass `signal: controller.signal` in fetch options
- Clear timeout on success: `clearTimeout(timeoutId)`
- Parse response JSON
- **Handle the wrapped response format:**
  ```typescript
  if (result.success && result.data?.text) {
    return {
      text: result.data.text,
      language: result.data.language,
      durationSec: result.data.duration
    }
  }
  ```
- **Add rate limit handling:**
  ```typescript
  if (response.status === 429) {
    throw new Error('Rate limit exceeded. Please wait a moment before recording again.')
  }
  ```
- Throw error if no text in response
- Return `{ text, language?, durationSec? }`

**Export:**
- `export const audioService = new AudioService()`

**Implementation Notes:**
- MediaRecorder requires secure context (HTTPS in production)
- Avoid window-referencing at top-level of module; only inside methods (SSR safety)
- Some browsers (iOS Safari) may only support audio/mp4
- **Updated MIME type list with iOS-friendly formats for better compatibility**

**Alternative Implementation (Simplified Version):**
```typescript
// services/audioService.ts
class AudioService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  async startRecording(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Use audio/webm if supported, but Chrome might still report video/webm
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
      ? 'audio/webm' 
      : 'video/webm';
    
    this.mediaRecorder = new MediaRecorder(stream, { mimeType });
    this.audioChunks = [];

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start();
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(new Blob([], { type: 'audio/webm' }));
        return;
      }

      // CRITICAL: Wait for onstop to get all chunks!
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.audioChunks, { 
          type: this.mediaRecorder?.mimeType || 'audio/webm' 
        });
        
        // Clean up
        this.mediaRecorder?.stream.getTracks().forEach(track => track.stop());
        this.mediaRecorder = null;
        this.audioChunks = [];
        
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  async sendToTranscription(blob: Blob): Promise<{ text: string }> {
    const formData = new FormData();
    formData.append('audio', blob, 'voice.webm');

    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/voice/transcribe`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`, // Or get from your auth context
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Transcription failed: ${error}`);
    }

    return response.json();
  }
}

export default new AudioService();
```

**Note:** The simplified version above provides a basic implementation that can be used as a starting point. The full implementation above includes additional features like MIME type detection, iOS compatibility, rate limiting, and proper error handling that should be used for production.

### 2. MODIFY: `components/chat/ChatInput.tsx`

**Add Imports (top of file):**
```typescript
import { audioService } from '@/services/audioService'
import { AlertCircle } from 'lucide-react'  // Add to existing lucide imports
import toast from 'react-hot-toast'  // For neutral/info toasts
```

**Add State Variables and Refs (in component body):**
```typescript
const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'processing' | 'error'>('idle')
const [recordingMs, setRecordingMs] = useState(0)
const [isMicSupported, setIsMicSupported] = useState<boolean>(true)
const recordingStartRef = useRef<number | null>(null)
const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)  // Use ReturnType to avoid NodeJS.Timeout mismatch
const MAX_RECORDING_MS = 5 * 60 * 1000 // 5 minutes
const MIN_RECORDING_MS = 500 // 0.5 seconds
```

**Add Feature Detection (useEffect):**
```typescript
useEffect(() => {
  const supported = typeof window !== 'undefined' && 'MediaRecorder' in window
  setIsMicSupported(supported)
}, [])
```

**Add Helper Function:**
```typescript
function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000)
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}
```

**Add Recording Handlers:**

```typescript
async function handleStartRecording() {
  if (!isMicSupported) {
    toast.error('Voice recording not supported in this browser.')
    setRecordingState('error')
    setTimeout(() => setRecordingState('idle'), 3000)
    return
  }

  try {
    await audioService.startRecording()
    setRecordingState('recording')
    recordingStartRef.current = Date.now()
    
    durationTimerRef.current = setInterval(() => {
      if (!recordingStartRef.current) return
      const elapsed = Date.now() - recordingStartRef.current
      setRecordingMs(elapsed)
      if (elapsed >= MAX_RECORDING_MS) {
        toast('Maximum recording time reached. Processing...', { icon: '⏱️' })
        handleStopRecording()
      }
    }, 100)
  } catch (e) {
    const msg = e instanceof Error && /denied|permission/i.test(e.message)
      ? 'Microphone access denied. Please enable in browser settings.'
      : (e instanceof Error ? e.message : 'Unable to start recording')
    toastFromApiError(new Error(msg))
    setRecordingState('error')
    setTimeout(() => setRecordingState('idle'), 3000)
  }
}

async function handleStopRecording() {
  if (durationTimerRef.current) {
    clearInterval(durationTimerRef.current)
    durationTimerRef.current = null
  }
  
  const elapsed = recordingStartRef.current ? Date.now() - recordingStartRef.current : 0
  
  if (elapsed < MIN_RECORDING_MS) {
    // Cancel without producing useless blob
    try { 
      await audioService.stopRecording().catch(() => {}) 
    } catch {}
    setRecordingMs(0)
    recordingStartRef.current = null
    setRecordingState('idle')
    toast.error('Recording too short. Hold for at least half a second.')
    return
  }
  
  setRecordingState('processing')
  
  try {
    const blob = await audioService.stopRecording()
    const { text } = await audioService.sendToTranscription(blob)
    setMessage(prev => prev ? `${prev} ${text}` : text)
    
    // Reset all state
    setRecordingState('idle')
    setRecordingMs(0)
    recordingStartRef.current = null
  } catch (e) {
    // **Updated error handling with specific rate limit message:**
    const errorMessage = e instanceof Error 
      ? (e.message.includes('Rate limit') 
        ? 'Too many recordings. Please wait a moment.' 
        : 'Failed to transcribe. Please check your connection.')
      : 'Failed to transcribe. Please check your connection.'
    
    toast.error(errorMessage)
    setRecordingState('error')
    setTimeout(() => setRecordingState('idle'), 3000)
  }
}

function handleVoiceRecordClick() {
  switch(recordingState) {
    case 'idle':
    case 'error':
      handleStartRecording()
      break
    case 'recording':
      handleStopRecording()
      break
    case 'processing':
      // No-op
      break
  }
}
```

**Replace Microphone Button (in "Left side - Icon buttons" section):**
```jsx
<button
  type="button"
  onClick={handleVoiceRecordClick}
  disabled={disabled || isStreaming || isProcessingFile || recordingState === 'processing' || !isMicSupported}
  className={`p-2.5 rounded-lg transition-all ${
    !isMicSupported
      ? 'bg-[#2d3748]/50 text-[#4a5568] cursor-not-allowed'
      : recordingState === 'recording'
      ? 'bg-red-500/20 text-red-400 ring-2 ring-red-400/30 animate-pulse'
      : recordingState === 'processing'
      ? 'bg-yellow-500/20 text-yellow-400 cursor-not-allowed'
      : recordingState === 'error'
      ? 'bg-red-500/10 text-red-400'
      : 'bg-[#2d3748]/50 text-[#4a5568] hover:text-[#718096] hover:bg-[#2d3748]/70'
  }`}
  title={
    !isMicSupported
      ? 'Voice recording not supported in this browser.'
      : recordingState === 'recording'
      ? `Stop recording (${formatDuration(MAX_RECORDING_MS - recordingMs)} remaining)`
      : recordingState === 'processing'
      ? 'Transcribing audio...'
      : 'Start voice recording (max 5 minutes)'
  }
>
  <Mic className="w-5 h-5" />
</button>
```

**Add Duration Display (immediately after mic button):**
```jsx
{recordingState === 'recording' && (
  <span className="ml-2 text-sm text-red-400 font-mono animate-pulse">
    {formatDuration(recordingMs)}
  </span>
)}
```

**Add Status Indicators (in existing absolute -top-8 container):**
```jsx
{recordingState === 'processing' && (
  <div className="flex items-center gap-2 text-sm text-yellow-500 animate-fadeInUp">
    <Mic className="w-4 h-4 animate-pulse" />
    <span>Transcribing audio...</span>
  </div>
)}
{recordingState === 'error' && (
  <div className="flex items-center gap-2 text-sm text-red-500 animate-fadeInUp">
    <AlertCircle className="w-4 h-4" />
    <span>Recording failed. Try again.</span>
  </div>
)}
```

**Update Disabled States:**

Text input:
```jsx
disabled={disabled || isStreaming || isProcessingFile || recordingState === 'recording' || recordingState === 'processing'}
```

File upload input and button:
```jsx
disabled={disabled || isStreaming || isProcessingFile || recordingState !== 'idle'}
```

Reasoning/Mode toggles:
```jsx
disabled={disabled || isStreaming || !!selectedFile || recordingState !== 'idle'}
```

Send button:
```jsx
disabled={(!message.trim() && !selectedFile) || disabled || isStreaming || isProcessingFile || recordingState !== 'idle'}
```

**Add Cleanup on Unmount:**
```typescript
useEffect(() => {
  return () => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current)
    }
    if (recordingState === 'recording') {
      audioService.stopRecording().catch(() => {})
    }
  }
}, [recordingState])
```

**Remove Deprecated Code:**
- Remove `isRecording` state
- Remove `handleVoiceRecord` function
- Keep `onVoiceRecord?: () => void` prop for backward compatibility but mark as deprecated

## Backend Integration Updates

### Response Format Changes
The backend now returns a wrapped response format that must be handled:

```typescript
// Old format (not used)
{ text: string, language?: string, duration?: number }

// New format (current backend)
{ 
  success: boolean, 
  data: { 
    text: string, 
    language?: string, 
    duration?: number 
  } 
}
```

### Rate Limiting Support
Added specific handling for 429 status codes with user-friendly messages:

```typescript
if (response.status === 429) {
  throw new Error('Rate limit exceeded. Please wait a moment before recording again.')
}
```

### iOS Compatibility Improvements
Updated MIME type support to better handle iOS Safari recordings:

```typescript
const mimeTypes = [
  'audio/webm;codecs=opus',
  'audio/webm', 
  'audio/mp4',  // iOS Safari records as this
  'audio/m4a',  // Alternative iOS format
  'audio/ogg;codecs=opus'
]
```

### Enhanced Error Messages
Improved error handling with specific messages for different failure scenarios:

```typescript
const errorMessage = e instanceof Error 
  ? (e.message.includes('Rate limit') 
    ? 'Too many recordings. Please wait a moment.' 
    : 'Failed to transcribe. Please check your connection.')
  : 'Failed to transcribe. Please check your connection.'
```

## Required Changes to Frontend Implementation

### 1. UPDATE: services/audioService.ts - sendToTranscription method
Change the response parsing to handle the wrapped format:

```typescript
async sendToTranscription(blob: Blob): Promise<{ text: string; language?: string; durationSec?: number }> {
  const token = await getAccessToken()
  const formData = new FormData()
  
  // Determine extension from MIME type
  const ext = this.mimeType.includes('webm') ? 'webm' 
    : this.mimeType.includes('mp4') ? 'm4a'  // iOS often records as mp4 but backend expects m4a
    : this.mimeType.includes('ogg') ? 'ogg' 
    : 'webm'
  
  formData.append('audio', new File([blob], `voice.${ext}`, { type: this.mimeType }))
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)
  
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/voice/transcribe`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: formData,
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment before recording again.')
      }
      throw new Error(`Transcription failed: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    // Handle the wrapped response format
    if (result.success && result.data?.text) {
      return {
        text: result.data.text,
        language: result.data.language,
        durationSec: result.data.duration
      }
    }
    
    throw new Error('Invalid response format from transcription service')
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}
```

### 2. UPDATE: services/audioService.ts - Add m4a to MIME types
Update the MIME type array in startRecording to better support iOS:

```typescript
async startRecording(): Promise<void> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  
  // Updated MIME type list with iOS-friendly formats
  const mimeTypes = [
    'audio/webm;codecs=opus',
    'audio/webm', 
    'audio/mp4',  // iOS Safari records as this
    'audio/m4a',  // Alternative iOS format
    'audio/ogg;codecs=opus'
  ]
  
  const supportedType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type))
  if (!supportedType) {
    throw new Error('Voice recording not supported in this browser.')
  }
  
  this.mimeType = supportedType
  // ... rest of the method stays the same
}
```

### 3. UPDATE: components/chat/ChatInput.tsx - Better rate limit handling
Update the error handling in handleStopRecording to show specific message for rate limits:

```typescript
async function handleStopRecording() {
  // ... existing code ...
  
  try {
    const blob = await audioService.stopRecording()
    const { text } = await audioService.sendToTranscription(blob)
    setMessage(prev => prev ? `${prev} ${text}` : text)
    
    // Reset all state
    setRecordingState('idle')
    setRecordingMs(0)
    recordingStartRef.current = null
  } catch (e) {
    const errorMessage = e instanceof Error 
      ? (e.message.includes('Rate limit') 
        ? 'Too many recordings. Please wait a moment.' 
        : 'Failed to transcribe. Please check your connection.')
      : 'Failed to transcribe. Please check your connection.'
    
    toast.error(errorMessage)
    setRecordingState('error')
    setTimeout(() => setRecordingState('idle'), 3000)
  }
}
```

### Summary of Changes

✅ Response format: Updated to handle result.data.text instead of result.text
✅ Rate limiting: Added 429 status check with user-friendly message
✅ iOS support: Added m4a handling for better iOS compatibility
✅ Error messages: Specific message for rate limit vs network errors

### No Changes Needed For

- Max file size (10MB is plenty for 5 minutes of audio)
- Model change (backend handles this, frontend doesn't care)
- The core recording flow remains exactly the same

The frontend is now ready to integrate with the live backend! These are minimal, surgical changes that maintain all the existing functionality while matching the actual API contract.

## Error Handling Requirements

1. **Microphone Permission Denied**
   - Detected via regex test: `/denied|permission/i.test(e.message)`
   - Show toast: "Microphone access denied. Please enable in browser settings."
   - Set recordingState to 'error'
   - Reset to 'idle' after 3 seconds

2. **Network Error During Transcription**
   - Show toast: "Failed to transcribe. Please check your connection."
   - Keep the audio blob via `audioService.getAudioBlob()` for potential retry
   - Reset to 'idle' after 3 seconds

3. **Rate Limit Exceeded**
   - **NEW:** Detected via 429 status code
   - Show toast: "Too many recordings. Please wait a moment."
   - Reset to 'idle' after 3 seconds

4. **MediaRecorder Not Supported**
   - Detect on mount via feature detection
   - Show toast: "Voice recording not supported in this browser."
   - Disable mic button permanently with appropriate styling

5. **Recording Too Short**
   - Show toast: "Recording too short. Hold for at least half a second."
   - Immediately ready for new recording

6. **Auto-stop at 5 Minutes**
   - Automatically stop and process
   - Show toast: "Maximum recording time reached. Processing..." with ⏱️ icon
   - User can immediately start new recording after processing

7. **Upload Timeout**
   - 30-second timeout via AbortController
   - Show standard network error message if timeout occurs

## Browser Compatibility Notes

- Requires HTTPS in production (microphone API requirement)
- Test MIME type support (Safari may differ from Chrome)
- **Enhanced iOS support with m4a format handling**
- Handle browsers without MediaRecorder gracefully via feature detection
- Mobile Safari may require user gesture for first recording
- Use `ReturnType<typeof setInterval>` for browser compatibility

## State Flow

```
idle → [user clicks mic] → recording → [user clicks stop OR 5 min limit] → processing → [success] → idle
                                    ↓                                            ↓
                                [error] → error → [3 sec] → idle            [error] → error → [3 sec] → idle
```

## Testing Checklist

- [ ] Mic button starts/stops recording with visual feedback
- [ ] Duration counter shows mm:ss format
- [ ] Recording stops automatically at 5:00
- [ ] Transcribed text appears in input field
- [ ] Can edit transcribed text before sending
- [ ] Recording shorter than 0.5s shows error
- [ ] All other inputs disabled while recording/processing
- [ ] Error states show appropriate messages
- [ ] Can immediately start new recording after auto-stop
- [ ] Browser permission prompt handled gracefully
- [ ] MediaRecorder not supported shows disabled button
- [ ] Works on mobile devices (iOS Safari, Chrome Android)
- [ ] 30-second timeout on transcription upload works
- [ ] Cleanup on component unmount stops recording
- [ ] **NEW:** Rate limit errors show appropriate message
- [ ] **NEW:** iOS Safari recordings work correctly with m4a format
- [ ] **NEW:** Backend response format is properly parsed

## Performance Constraints

- Keep audio chunks in memory (no IndexedDB for Phase 1)
- 5 minutes audio ≈ 3-5MB memory usage
- Upload timeout: 30 seconds (enforced via AbortController)
- Show progress only for processing state, not upload progress
- MediaRecorder timeslice: 250ms for responsive chunk handling

## TypeScript Considerations

- Use `ReturnType<typeof setInterval>` instead of `NodeJS.Timeout`
- All MediaRecorder usage in client components only
- Service module avoids top-level window references (SSR safety)
- Optional interface for formal typing:
  ```typescript
  interface TranscriptionResponse {
    text: string
    language?: string
    durationSec?: number
  }
  ```

## Excluded from Phase 1

- Streaming transcription (Phase 2)
- Pause/resume recording
- Audio waveform visualization
- Local audio playback before sending
- Saving recordings locally
- Background recording (if user navigates away, recording stops)
- Retry UI for failed transcriptions (blob is preserved for future enhancement)