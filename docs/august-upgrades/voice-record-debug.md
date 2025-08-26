# Frontend Voice Recording Fix Instructions

## Fix 1: Complete AudioService Implementation

### File: `frontend/services/audioService.ts`

**REPLACE THE ENTIRE FILE CONTENT WITH:**

```typescript
class AudioService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private recordingStartTime: number = 0;
  private recordingPromise: Promise<void> | null = null;

  async startRecording(): Promise<void> {
    try {
      // Reset state
      this.audioChunks = [];
      
      // Request microphone permission
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });

      // Check for MediaRecorder support
      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder not supported in this browser');
      }

      // Determine supported MIME type - Chrome often uses video/webm for audio
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = 'video/webm'; // Chrome fallback
      }

      // Create MediaRecorder with the stream
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        audioBitsPerSecond: 128000
      });

      // CRITICAL: Set up data collection
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstart = () => {
        this.recordingStartTime = Date.now();
      };

      this.mediaRecorder.onerror = (event: Event) => {
        console.error('[AudioService] MediaRecorder error:', event);
        this.cleanup();
      };

      // Start recording with 100ms chunks
      this.mediaRecorder.start(100);
      
      // Wait a moment to ensure recording has started
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (this.mediaRecorder.state !== 'recording') {
        throw new Error('Failed to start recording');
      }
      
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
          reject(new Error('No active recording'));
          return;
        }

        // Set up the stop handler BEFORE calling stop()
        this.mediaRecorder.onstop = () => {
          // Create blob from all collected chunks
          const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
          const audioBlob = new Blob(this.audioChunks, { type: mimeType });
          
          // Cleanup resources
          this.cleanup();
          
          // Resolve with the blob
          if (audioBlob.size > 0) {
            resolve(audioBlob);
          } else {
            reject(new Error('No audio data recorded'));
          }
        };

        // Now stop the recording
        this.mediaRecorder.stop();
        
        // Safety timeout in case stop event doesn't fire
        setTimeout(() => {
          if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.cleanup();
            reject(new Error('Recording stop timeout'));
          }
        }, 3000);
        
      } catch (error) {
        this.cleanup();
        reject(error);
      }
    });
  }

  private cleanup(): void {
    // Stop all audio tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
      });
      this.stream = null;
    }
    
    // Clear recorder and chunks
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.recordingStartTime = 0;
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording' || false;
  }

  getRecordingDuration(): number {
    if (!this.isRecording() || this.recordingStartTime === 0) {
      return 0;
    }
    return Math.floor((Date.now() - this.recordingStartTime) / 1000);
  }

  async sendToTranscription(audioBlob: Blob, token: string): Promise<string> {
    try {
      const formData = new FormData();
      // CRITICAL: Backend expects 'audio' as the key, not 'file'
      formData.append('audio', audioBlob, `recording-${Date.now()}.webm`);
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://ohmni-backend.onrender.com';
      const response = await fetch(`${backendUrl}/api/voice/transcribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Transcription failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Handle the standardized response format
      if (result.success && result.data) {
        return result.data.text || '';
      } else if (result.text) {
        // Fallback for direct response
        return result.text;
      } else if (result.transcription) {
        // Legacy format
        return result.transcription;
      }
      
      throw new Error('Invalid transcription response format');
      
    } catch (error) {
      console.error('[AudioService] Transcription failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
const audioService = new AudioService();
export default audioService;
```

## Fix 2: Update ChatInput Component Voice Handling

### File: `frontend/app/components/chat/ChatInput.tsx`

**FIND the voice recording handlers section and REPLACE with:**

```typescript
const handleStartRecording = async () => {
  try {
    // Start the actual recording FIRST
    await audioService.startRecording();
    
    // Only update UI if recording actually started
    if (audioService.isRecording()) {
      setRecordingState('recording');
      recordingStartRef.current = Date.now();
      setRecordingDuration(0);
      
      // Start duration timer
      const timer = setInterval(() => {
        const duration = audioService.getRecordingDuration();
        setRecordingDuration(duration);
        
        // Auto-stop after 60 seconds
        if (duration >= 60) {
          handleStopRecording();
        }
      }, 100);
      
      recordingIntervalRef.current = timer;
    } else {
      throw new Error('Failed to start recording');
    }
  } catch (error) {
    console.error('Failed to start recording:', error);
    setRecordingState('idle');
    
    // Show user-friendly error
    if (error instanceof Error) {
      if (error.message.includes('Permission')) {
        toast.error('Microphone permission denied. Please allow microphone access.');
      } else if (error.message.includes('not supported')) {
        toast.error('Voice recording is not supported in your browser.');
      } else {
        toast.error('Failed to start recording. Please try again.');
      }
    }
  }
};

const handleStopRecording = async () => {
  try {
    // Clear the duration timer
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    
    // Update UI to show transcribing
    setRecordingState('transcribing');
    
    // Stop recording and get the audio blob
    const audioBlob = await audioService.stopRecording();
    
    if (!audioBlob || audioBlob.size === 0) {
      throw new Error('No audio recorded');
    }
    
    // Get auth token
    const session = await getSession();
    const token = session?.accessToken;
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    // Set a timeout for transcription
    const transcriptionTimeout = setTimeout(() => {
      console.error('Transcription timeout - force resetting state');
      setRecordingState('idle');
      toast.error('Transcription timed out. Please try again.');
    }, 35000); // 35 second timeout
    
    // Send to transcription
    const transcribedText = await audioService.sendToTranscription(audioBlob, token);
    
    // Clear timeout on success
    clearTimeout(transcriptionTimeout);
    
    if (transcribedText) {
      // Add transcribed text to input
      setInput(prevInput => {
        const newInput = prevInput ? `${prevInput} ${transcribedText}` : transcribedText;
        return newInput;
      });
      
      toast.success('Voice transcribed successfully');
    } else {
      throw new Error('No transcription received');
    }
    
    // Reset state
    setRecordingState('idle');
    setRecordingDuration(0);
    
  } catch (error) {
    console.error('Recording/transcription error:', error);
    setRecordingState('idle');
    setRecordingDuration(0);
    
    if (error instanceof Error) {
      if (error.message.includes('No audio')) {
        toast.error('No audio was recorded. Please try again.');
      } else if (error.message.includes('Authentication')) {
        toast.error('Please sign in to use voice recording.');
      } else {
        toast.error('Failed to process recording. Please try again.');
      }
    }
  }
};

const handleVoiceRecordClick = () => {
  if (recordingState === 'idle') {
    handleStartRecording();
  } else if (recordingState === 'recording') {
    handleStopRecording();
  }
  // Do nothing if transcribing
};
```

## Fix 3: Ensure Proper State Variables

### File: `frontend/app/components/chat/ChatInput.tsx`

**FIND the state declarations at the top of the component and ENSURE these exist:**

```typescript
const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'transcribing'>('idle');
const [recordingDuration, setRecordingDuration] = useState(0);
const recordingStartRef = useRef<number>(0);
const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
```

## Fix 4: Import AudioService Correctly

### File: `frontend/app/components/chat/ChatInput.tsx`

**FIND the imports section and ENSURE:**

```typescript
import audioService from '@/services/audioService';
import { getSession } from 'next-auth/react';
import { toast } from 'sonner'; // or whatever toast library you use
```

## Fix 5: Update Voice Button UI (Optional but Recommended)

### File: `frontend/app/components/chat/ChatInput.tsx`

**FIND the microphone button JSX and UPDATE to show recording state:**

```tsx
<button
  onClick={handleVoiceRecordClick}
  disabled={recordingState === 'transcribing'}
  className={cn(
    "p-2 rounded-lg transition-all",
    recordingState === 'idle' && "hover:bg-gray-100 dark:hover:bg-gray-800",
    recordingState === 'recording' && "bg-red-500 text-white animate-pulse",
    recordingState === 'transcribing' && "bg-blue-500 text-white opacity-50"
  )}
  type="button"
  aria-label={
    recordingState === 'idle' ? 'Start recording' : 
    recordingState === 'recording' ? 'Stop recording' : 
    'Transcribing...'
  }
>
  <Mic className="w-5 h-5" />
  {recordingState === 'recording' && recordingDuration > 0 && (
    <span className="ml-2 text-xs">{recordingDuration}s</span>
  )}
</button>
```

## Testing Instructions

After applying these fixes:

1. **Test in browser console first:**
```javascript
// Check if MediaRecorder is supported
console.log('MediaRecorder supported:', typeof MediaRecorder !== 'undefined');

// Test microphone permission
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(() => console.log('✅ Mic access works'))
  .catch(e => console.error('❌ Mic access failed:', e));
```

2. **Click the microphone button and verify:**
- Browser asks for microphone permission (first time only)
- Button turns red and pulses when recording
- Duration counter increments
- Clicking again stops and transcribes
- Transcribed text appears in input field

3. **Check Network tab:**
- Should see POST to `/api/voice/transcribe`
- Should return 200 with transcribed text

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| No mic permission prompt | Check HTTPS, clear site permissions |
| Recording doesn't start | Check console for MediaRecorder errors |
| No transcription | Verify JWT token is valid |
| Empty audio blob | Ensure chunks are being collected |
| CORS errors | Backend should allow your frontend origin |

## Summary of Changes

1. ✅ Proper MediaRecorder initialization with stream
2. ✅ `ondataavailable` handler to collect chunks
3. ✅ `onstop` handler to create final blob
4. ✅ Correct FormData key ('audio' not 'file')
5. ✅ Proper error handling and user feedback
6. ✅ State management that reflects actual recording state
7. ✅ Duration tracking and display
8. ✅ Timeout protection (35s for transcription)
9. ✅ Auto-stop after 60 seconds
10. ✅ Visual feedback for all states (idle/recording/transcribing)