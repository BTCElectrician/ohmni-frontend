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
        // Recording start time is now set before starting
      };

      this.mediaRecorder.onerror = (event: Event) => {
        console.error('[AudioService] MediaRecorder error:', event);
        this.cleanup();
      };

      // Set recording start time immediately before starting
      this.recordingStartTime = Date.now();

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
