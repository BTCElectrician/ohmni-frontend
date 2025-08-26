'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Brain, Mic, Paperclip, Radiation, Send, X, Image as ImageIcon, BookOpenText, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { visionService } from '@/services/visionService';
import { toastFromApiError, toastSuccess } from '@/lib/toast-helpers';
import { audioService } from '@/services/audioService';
import toast from 'react-hot-toast';
import { sanitizeQuery } from '@/lib/sanitizeQuery';

interface ChatInputProps {
  onSendMessage: (message: string, useDeepReasoning?: boolean, useNuclear?: boolean, useCodeSearch?: boolean) => void;
  onSendMessageWithFile?: (message: string, file: File) => Promise<void>;
  onVoiceRecord?: () => void; // @deprecated - Voice recording now handled internally
  isStreaming: boolean;
  disabled?: boolean;
  autoSendOnFileSelect?: boolean;
}

export function ChatInput({
  onSendMessage,
  onSendMessageWithFile,
  onVoiceRecord,
  isStreaming,
  disabled = false,
  autoSendOnFileSelect = true,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [deepThinking, setDeepThinking] = useState(false);
  const [nuclearThinking, setNuclearThinking] = useState(false);
  const [codeSearchMode, setCodeSearchMode] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Voice recording state
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'processing' | 'error'>('idle');
  const [recordingMs, setRecordingMs] = useState(0);
  const [isMicSupported, setIsMicSupported] = useState<boolean>(true);
  const recordingStartRef = useRef<number | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const MAX_RECORDING_MS = 5 * 60 * 1000; // 5 minutes
  const MIN_RECORDING_MS = 500; // 0.5 seconds

  // Feature detection for microphone support
  useEffect(() => {
    const supported = typeof window !== 'undefined' && 'MediaRecorder' in window;
    setIsMicSupported(supported);
  }, []);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
      if (recordingState === 'recording') {
        audioService.stopRecording().catch(() => {});
      }
    };
  }, [recordingState]);

  // Add this useEffect for safety timeout when stuck in processing
  useEffect(() => {
    let resetTimeout: ReturnType<typeof setTimeout> | null = null
    
    if (recordingState === 'processing') {
      // Safety timeout - if stuck in processing for too long, force reset
      resetTimeout = setTimeout(() => {
        console.error('Transcription timeout - force resetting state')
        setRecordingState('idle')
        setRecordingMs(0)
        recordingStartRef.current = null
        toast.error('Transcription timed out. Please try again.')
      }, 35000)  // 35 seconds (5 seconds more than fetch timeout)
    }
    
    return () => {
      if (resetTimeout) {
        clearTimeout(resetTimeout)
      }
    }
  }, [recordingState])

  // Add this useEffect for safety timeout when stuck in processing
  useEffect(() => {
    let resetTimeout: ReturnType<typeof setTimeout> | null = null
    
    if (recordingState === 'processing') {
      // Safety timeout - if stuck in processing for too long, force reset
      resetTimeout = setTimeout(() => {
        console.error('Transcription timeout - force resetting state')
        setRecordingState('idle')
        setRecordingMs(0)
        recordingStartRef.current = null
        toast.error('Transcription timed out. Please try again.')
      }, 35000)  // 35 seconds (5 seconds more than fetch timeout)
    }
    
    return () => {
      if (resetTimeout) {
        clearTimeout(resetTimeout)
      }
    }
  }, [recordingState])

  // Mutual exclusivity handlers
  const toggleDeepThinking = () => {
    const newState = !deepThinking;
    setDeepThinking(newState);
    if (newState) {
      setNuclearThinking(false);
      setCodeSearchMode(false);
    }
  };
  
  const toggleNuclear = () => {
    const newState = !nuclearThinking;
    setNuclearThinking(newState);
    if (newState) {
      setDeepThinking(false);
      setCodeSearchMode(false);
    }
  };

  const toggleCodeSearch = () => {
    const newState = !codeSearchMode;
    setCodeSearchMode(newState);
    if (newState) {
      setDeepThinking(false);
      setNuclearThinking(false);
    }
  };

  const clearSelectedFile = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
  }, [previewUrl]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Validate file
    const validation = visionService.validateFile(file);
    if (!validation.valid) {
      toastFromApiError(new Error(validation.error!));
      return;
    }

    setIsProcessingFile(true);

    try {
      // Show HEIC conversion notice
      if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
        toastSuccess('HEIC image will be converted for analysis');
      }

      // Optimize large images
      const optimizedFile = await visionService.optimizeImage(file);
      
      // Create preview
      const preview = visionService.createPreviewUrl(optimizedFile);
      
      setSelectedFile(optimizedFile);
      setPreviewUrl(preview);
      
      // Show file info
      const sizeMB = (optimizedFile.size / (1024 * 1024)).toFixed(1);
      toastSuccess(`Image ready: ${optimizedFile.name} (${sizeMB}MB)`);

      // 🔗 NEW — trigger vision analysis immediately if auto-send is enabled
      if (autoSendOnFileSelect && onSendMessageWithFile) {
        await onSendMessageWithFile(
          message.trim() || 'Please analyze this image',
          optimizedFile
        );
        clearSelectedFile();     // wipe local state after streaming starts
        setMessage('');
        setDeepThinking(false);
        setNuclearThinking(false);
      }
    } catch (error) {
      console.error('File processing error:', error);
      toastFromApiError(error);
    } finally {
      setIsProcessingFile(false);
    }
  }, [autoSendOnFileSelect, message, onSendMessageWithFile, clearSelectedFile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((!message.trim() && !selectedFile) || disabled || isStreaming) {
      return;
    }

    // If we have a file, use the file upload handler
    // Note: This is rarely hit when autoSendOnFileSelect=true, but kept as safeguard
    if (selectedFile && onSendMessageWithFile) {
      await onSendMessageWithFile(
        message.trim() || 'Please analyze this image',
        selectedFile
      );
      clearSelectedFile();
    } else if (message.trim()) {
      // Pass code search state
      onSendMessage(message.trim(), deepThinking, nuclearThinking, codeSearchMode);
    }
    
    setMessage('');
    setDeepThinking(false);
    setNuclearThinking(false);
    setCodeSearchMode(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Helper function for formatting duration
  function formatDuration(ms: number): string {
    const s = Math.floor(ms / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  // Voice recording handlers
  async function handleStartRecording() {
    if (!isMicSupported) {
      toast.error('Voice recording not supported in this browser.');
      setRecordingState('error');
      setTimeout(() => setRecordingState('idle'), 3000);
      return;
    }

    try {
      await audioService.startRecording();
      setRecordingState('recording');
      recordingStartRef.current = Date.now();
      
      // Call legacy callback if provided (backward compatibility)
      onVoiceRecord?.();
      
      durationTimerRef.current = setInterval(() => {
        if (!recordingStartRef.current) return;
        const elapsed = Date.now() - recordingStartRef.current;
        setRecordingMs(elapsed);
        if (elapsed >= MAX_RECORDING_MS) {
          toast('Maximum recording time reached. Processing...', { icon: '⏱️' });
          handleStopRecording();
        }
      }, 100);
    } catch (e) {
      const msg = e instanceof Error && /denied|permission/i.test(e.message)
        ? 'Microphone access denied. Please enable in browser settings.'
        : (e instanceof Error ? e.message : 'Unable to start recording');
      toastFromApiError(new Error(msg));
      setRecordingState('error');
      setTimeout(() => setRecordingState('idle'), 3000);
    }
  }

  async function handleStopRecording() {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    
    const elapsed = recordingStartRef.current ? Date.now() - recordingStartRef.current : 0;
    
    if (elapsed < MIN_RECORDING_MS) {
      try { 
        await audioService.stopRecording().catch(() => {}) 
      } catch {}
      setRecordingMs(0);
      recordingStartRef.current = null;
      setRecordingState('idle');
      toast.error('Recording too short. Hold for at least half a second.');
      return;
    }
    
    setRecordingState('processing');
    
    try {
      const blob = await audioService.stopRecording();
      console.log('Got audio blob, size:', blob.size);
      
      const { text } = await audioService.sendToTranscription(blob);
      console.log('Got transcription:', text.substring(0, 50) + '...');
      
      // Append to existing message or set new message
      setMessage(prev => prev ? `${prev} ${text}` : text);
      
      // Reset all state
      setRecordingState('idle');
      setRecordingMs(0);
      recordingStartRef.current = null;
    } catch (e) {
      console.error('Recording/transcription error:', e);
      
      const errorMessage = e instanceof Error 
        ? (e.message.includes('Rate limit') 
          ? 'Too many recordings. Please wait a moment.' 
          : e.message.includes('timeout')
          ? 'Request timed out. Please try again.'
          : 'Failed to transcribe. Please check your connection.')
        : 'Failed to transcribe. Please check your connection.';
      
      toast.error(errorMessage);
      setRecordingState('error');
      setRecordingMs(0);
      recordingStartRef.current = null;
      
      // Auto-reset from error state after 3 seconds
      setTimeout(() => {
        if (recordingState === 'error') {
          setRecordingState('idle');
        }
      }, 3000);
    }
  }

  function handleVoiceRecordClick() {
    switch(recordingState) {
      case 'idle':
      case 'error':
        handleStartRecording();
        break;
      case 'recording':
        handleStopRecording();
        break;
      case 'processing':
        // No-op
        break;
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-6">
      <div className="max-w-[900px] mx-auto">
        <form onSubmit={handleSubmit}>
          {/* Image Preview */}
          {selectedFile && previewUrl && (
            <div className="mb-3 animate-fadeInUp">
              <div className="relative inline-block">
                <Image
                  src={previewUrl}
                  alt="Preview"
                  width={200}
                  height={128}
                  className="max-h-32 max-w-xs rounded-lg border border-border-subtle shadow-lg object-cover"
                />
                <button
                  type="button"
                  onClick={clearSelectedFile}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  <ImageIcon className="w-3 h-3 inline mr-1" />
                  {selectedFile.name}
                </div>
              </div>
            </div>
          )}

          {/* Main container */}
          <div className="relative bg-[#1a2332]/90 backdrop-blur-sm rounded-2xl border border-[#2d3748]/50 shadow-xl">
            {/* Input field */}
            <input
              value={message}
              onChange={(e) => {
                const rawValue = e.target.value;
                const cleanValue = sanitizeQuery(rawValue);
                
                // Debug logging (remove after testing)
                if (rawValue !== cleanValue) {
                  console.warn('Input contained invalid characters and was cleaned');
                  console.log('Raw value length:', rawValue.length);
                  console.log('Clean value length:', cleanValue.length);
                }
                
                setMessage(cleanValue);
              }}
              onPaste={(e) => {
                e.preventDefault();
                
                const pastedText = e.clipboardData.getData('text');
                const cleanText = sanitizeQuery(pastedText);
                
                // Insert clean text at cursor position
                const input = e.target as HTMLInputElement;
                const start = input.selectionStart ?? 0;
                const end = input.selectionEnd ?? 0;
                
                const newValue = message.substring(0, start) + 
                               cleanText + 
                               message.substring(end);
                
                setMessage(newValue);
                
                // Set cursor position after pasted text
                setTimeout(() => {
                  input.setSelectionRange(start + cleanText.length, start + cleanText.length);
                }, 0);
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedFile 
                  ? "Add a message about this image (optional)..." 
                  : codeSearchMode 
                    ? "Search NEC code..." 
                    : "Type your message here..."
              }
              className="w-full bg-transparent text-white placeholder-[#4a5568] focus:outline-none text-[15px] px-6 pt-5 pb-14"
              disabled={disabled || isStreaming || isProcessingFile}
            />

            {/* Bottom row with icons */}
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 pb-3">
              {/* Left side - Icon buttons */}
              <div className="flex items-center gap-1">
                {/* Voice Record */}
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
                {recordingState === 'recording' && (
                  <span className="ml-2 text-sm text-red-400 font-mono animate-pulse">
                    {formatDuration(recordingMs)}
                  </span>
                )}

                {/* File Upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept="image/*"
                  capture="environment" // Opens camera on mobile
                  className="hidden"
                  disabled={disabled || isStreaming || isProcessingFile || recordingState !== 'idle'}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || isStreaming || isProcessingFile}
                  className={`p-2.5 rounded-lg transition-all ${
                    selectedFile
                      ? 'bg-green-500/20 text-green-400'
                      : isProcessingFile
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-[#2d3748]/50 text-[#4a5568] hover:text-[#718096] hover:bg-[#2d3748]/70'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={selectedFile ? 'Image selected' : 'Upload image'}
                >
                  <Paperclip className={`w-5 h-5 ${isProcessingFile ? 'animate-pulse' : ''}`} />
                </button>

                {/* Deep Thinking Toggle - disabled when file selected */}
                <button
                  type="button"
                  onClick={toggleDeepThinking}
                  disabled={disabled || isStreaming || !!selectedFile}
                  className={`p-2.5 rounded-lg transition-all ${
                    deepThinking
                      ? 'bg-electric-blue/20 text-electric-blue ring-2 ring-electric-blue/30'
                      : 'bg-[#2d3748]/50 text-[#4a5568] hover:text-[#718096] hover:bg-[#2d3748]/70'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={selectedFile ? 'Not available with images' : deepThinking ? 'Deep reasoning mode active (50/day)' : 'Enable deep reasoning mode'}
                >
                  <Brain className={`w-5 h-5 ${deepThinking ? 'animate-pulse' : ''}`} />
                </button>

                {/* Nuclear Mode Toggle - disabled when file selected */}
                <button
                  type="button"
                  onClick={toggleNuclear}
                  disabled={disabled || isStreaming || !!selectedFile}
                  className={`p-2.5 rounded-lg transition-all ${
                    nuclearThinking
                      ? 'bg-red-600/20 text-red-600 ring-2 ring-red-600/30'
                      : 'bg-[#2d3748]/50 text-[#4a5568] hover:text-[#718096] hover:bg-[#2d3748]/70'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={selectedFile ? 'Not available with images' : nuclearThinking ? 'Nuclear mode active - o3 model (5/day)' : 'Enable nuclear mode (most powerful)'}
                >
                  <Radiation className={`w-5 h-5 ${nuclearThinking ? 'animate-pulse' : ''}`} />
                </button>

                {/* Code Search Toggle */}
                <button
                  type="button"
                  onClick={toggleCodeSearch}
                  disabled={disabled || isStreaming || !!selectedFile}
                  className={`p-2.5 rounded-lg transition-all ${
                    codeSearchMode
                      ? 'bg-orange-600/20 text-orange-600 ring-2 ring-orange-600/30'
                      : 'bg-[#2d3748]/50 text-[#4a5568] hover:text-[#718096] hover:bg-[#2d3748]/70'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={selectedFile ? 'Not available with images' : codeSearchMode ? 'Code search mode active' : 'Search NEC code'}
                >
                  <BookOpenText className={`w-5 h-5 ${codeSearchMode ? 'animate-pulse' : ''}`} />
                </button>
              </div>

              {/* Right side - Send button */}
              <button
                type="submit"
                disabled={(!message.trim() && !selectedFile) || disabled || isStreaming || isProcessingFile}
                className="p-2.5 rounded-lg transition-all transform active:scale-95 active:bg-electric-blue/20 text-[#4a5568] hover:text-electric-blue hover:bg-[#2d3748]/70 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>

            {/* Status indicators */}
            <div className="absolute -top-8 left-0 right-0 flex items-center gap-4 px-6 pointer-events-none">
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
              
              {deepThinking && !selectedFile && (
                <div className="flex items-center gap-2 text-sm text-electric-blue animate-fadeInUp">
                  <Brain className="w-4 h-4 animate-pulse" />
                  <span>Deep thinking mode active</span>
                </div>
              )}

              {nuclearThinking && !selectedFile && (
                <div className="flex items-center gap-2 text-sm text-red-600 font-semibold animate-fadeInUp">
                  <Radiation className="w-4 h-4 animate-pulse" />
                  <span>☢️ Nuclear mode active - Expensive!</span>
                </div>
              )}

              {codeSearchMode && !selectedFile && (
                <div className="flex items-center gap-2 text-sm text-orange-600 animate-fadeInUp">
                  <BookOpenText className="w-4 h-4 animate-pulse" />
                  <span>Code search mode active</span>
                </div>
              )}

              {isProcessingFile && (
                <div className="flex items-center gap-2 text-sm text-yellow-500 animate-fadeInUp">
                  <ImageIcon className="w-4 h-4 animate-pulse" />
                  <span>Processing image...</span>
                </div>
              )}

              {autoSendOnFileSelect && isProcessingFile && (
                <div className="flex items-center gap-2 text-sm text-blue-500 animate-fadeInUp">
                  <Send className="w-4 h-4 animate-pulse" />
                  <span>Auto-sending for analysis...</span>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}