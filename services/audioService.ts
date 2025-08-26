import { getAccessToken } from '@/lib/auth/getAccessToken'

interface TranscriptionResponse {
  text: string
  language?: string
  durationSec?: number
}

class AudioService {
  private mediaRecorder?: MediaRecorder
  private chunks: BlobPart[] = []
  private stream?: MediaStream
  private mimeType: string = 'audio/webm'
  private lastBlob: Blob | null = null

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
    this.mediaRecorder = new MediaRecorder(stream, { mimeType: supportedType })
    this.stream = stream
    this.chunks = []
    
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data?.size) {
        this.chunks.push(e.data)
      }
    }
    
    this.mediaRecorder.start(250) // 250ms timeslice
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'))
        return
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mimeType })
        this.lastBlob = blob
        
        // Clean up
        this.mediaRecorder = undefined
        this.chunks = []
        
        resolve(blob)
      }

      // Stop all stream tracks
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop())
        this.stream = undefined
      }

      this.mediaRecorder.stop()
    })
  }

  getAudioBlob(): Blob | null {
    return this.lastBlob
  }

  async sendToTranscription(blob: Blob): Promise<TranscriptionResponse> {
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
}

export const audioService = new AudioService()
