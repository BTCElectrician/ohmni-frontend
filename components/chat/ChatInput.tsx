'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Brain, Mic, Paperclip, Radiation, Send, X, Image as ImageIcon, DatabaseZap } from 'lucide-react';
import Image from 'next/image';
import { visionService } from '@/services/visionService';
import { toastFromApiError, toastSuccess } from '@/lib/toast-helpers';
import audioService from '@/services/audioService';
import toast from 'react-hot-toast';
import { sanitizeQuery } from '@/lib/sanitizeQuery';
import { VoiceRecordingIndicator } from './VoiceRecordingIndicator';

// Configuration constants
const MAX_RECORDING_DURATION_SECONDS = parseInt(
  process.env.NEXT_PUBLIC_MAX_RECORDING_DURATION_SECONDS || '300', // 5 minutes default
  10
);

interface ChatInputProps {
  onSendMessage: (message: string, useDeepReasoning?: boolean, useNuclear?: boolean, useCodeSearch?: boolean) => void;
  onSendMessageWithFile?: (message: string, file: File) => Promise<void>;

  isStreaming: boolean;
  disabled?: boolean;
  autoSendOnFileSelect?: boolean;
}

export function ChatInput({
  onSendMessage,
  onSendMessageWithFile,
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
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'transcribing'>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);


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
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (recordingState === 'recording') {
        audioService.stopRecording().catch(() => {});
      }
    };
  }, [recordingState]);

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



  // Voice recording handlers
  const handleStartRecording = async () => {
    try {
      // Set UI state immediately for instant feedback
      setRecordingState('recording');
      setRecordingDuration(0);
      
      // Start duration timer immediately
      const localStartTime = Date.now();
      const timer = setInterval(() => {
        // Calculate duration based on local start time
        const duration = Math.floor((Date.now() - localStartTime) / 1000);
        console.log('Timer update:', duration); // Debug log
        setRecordingDuration(duration);

        // Auto-stop after configured duration
        if (duration >= MAX_RECORDING_DURATION_SECONDS) {
          handleStopRecording();
        }
      }, 1000); // Changed to 1 second intervals for clearer updates
      
      recordingIntervalRef.current = timer;
      
      // Start the actual recording
      await audioService.startRecording();
      
      // Verify recording started
      if (!audioService.isRecording()) {
        // Rollback UI state if recording failed
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
        setRecordingState('idle');
        setRecordingDuration(0);
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
      
      // Get auth token - need to import getSession from next-auth/react
      const { getSession } = await import('next-auth/react');
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
        setMessage(prevInput => {
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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-6">
      {/* Recording timer overlay */}
      <VoiceRecordingIndicator
        isRecording={recordingState === 'recording'}
        durationSeconds={recordingDuration}
      />
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
                    ? "Search ABCO database..." 
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
                  onClick={handleVoiceRecordClick}
                  disabled={recordingState === 'transcribing'}
                  className={`p-2.5 rounded-lg transition-all ${
                    recordingState === 'idle' && "hover:bg-gray-100 dark:hover:bg-gray-800"
                  } ${
                    recordingState === 'recording' && "bg-red-500 text-white animate-pulse"
                  } ${
                    recordingState === 'transcribing' && "bg-blue-500 text-white opacity-50"
                  } ${
                    recordingState === 'idle' && "bg-[#2d3748]/50 text-[#4a5568] hover:text-[#718096] hover:bg-[#2d3748]/70"
                  }`}
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

                {/* File Upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept="image/*"
                  capture="environment" // Opens camera on mobile
                  className="hidden"
                  disabled={disabled || isStreaming || isProcessingFile}
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

                {/* ABCO Database Search Toggle */}
                <button
                  type="button"
                  onClick={toggleCodeSearch}
                  disabled={disabled || isStreaming || !!selectedFile}
                                     className={`p-2.5 rounded-lg transition-all ${
                     codeSearchMode
                       ? 'bg-green-600/20 text-green-600 ring-2 ring-green-600/30'
                       : 'bg-[#2d3748]/50 text-[#4a5568] hover:text-[#718096] hover:bg-[#2d3748]/70'
                   } disabled:opacity-50 disabled:cursor-not-allowed`}
                  data-testid="toggle-abco-db"
                  aria-pressed={codeSearchMode}
                  aria-label={
                    selectedFile
                      ? 'Not available with images'
                      : codeSearchMode
                        ? 'Searching ABCO database'
                        : 'Enable ABCO database'
                  }
                  title={
                    selectedFile
                      ? 'Not available with images'
                      : codeSearchMode
                        ? 'Searching ABCO database'
                        : 'Enable ABCO database'
                  }
                >
                  <DatabaseZap className={`w-5 h-5 ${codeSearchMode ? 'animate-pulse' : ''}`} />
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
              {recordingState === 'transcribing' && (
                <div className="flex items-center gap-2 text-sm text-yellow-500 animate-fadeInUp">
                  <Mic className="w-4 h-4 animate-pulse" />
                  <span>Transcribing audio...</span>
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
                <div
                  className="flex items-center gap-2 text-sm text-green-600 animate-fadeInUp"
                  data-testid="abco-db-status"
                >
                  <DatabaseZap className="w-4 h-4 animate-pulse" />
                  <span>Searching ABCO database</span>
                  {/* SR-only live region for screen readers */}
                  <span className="sr-only" aria-live="polite">Searching ABCO database</span>
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