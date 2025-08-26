import { getAccessToken } from '@/lib/auth/getAccessToken'

interface TranscriptionResponse {
  text: string
  language?: string
  durationSec?: number
}

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
