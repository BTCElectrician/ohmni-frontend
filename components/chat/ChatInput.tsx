'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Brain, Mic, Paperclip, Radiation, Send, X, Image as ImageIcon } from 'lucide-react';
import { visionService } from '@/services/visionService';
import { toastFromApiError, toastSuccess } from '@/lib/toast-helpers';

interface ChatInputProps {
  onSendMessage: (message: string, useDeepReasoning?: boolean, useNuclear?: boolean) => void;
  onSendMessageWithFile?: (message: string, file: File) => Promise<void>;
  onVoiceRecord?: () => void;
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
  const [isRecording, setIsRecording] = useState(false);
  const [deepThinking, setDeepThinking] = useState(false);
  const [nuclearThinking, setNuclearThinking] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Mutual exclusivity handlers
  const toggleDeepThinking = () => {
    const newState = !deepThinking;
    setDeepThinking(newState);
    if (newState) setNuclearThinking(false);
  };
  
  const toggleNuclear = () => {
    const newState = !nuclearThinking;
    setNuclearThinking(newState);
    if (newState) setDeepThinking(false);
  };

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
  }, [autoSendOnFileSelect, message, onSendMessageWithFile]);

  const clearSelectedFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
  };

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
      // Regular text message
      onSendMessage(message.trim(), deepThinking, nuclearThinking);
    }
    
    setMessage('');
    setDeepThinking(false);
    setNuclearThinking(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleVoiceRecord = () => {
    if (onVoiceRecord) {
      setIsRecording(!isRecording);
      onVoiceRecord();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-6">
      <div className="max-w-[900px] mx-auto">
        <form onSubmit={handleSubmit}>
          {/* Image Preview */}
          {selectedFile && previewUrl && (
            <div className="mb-3 animate-fadeInUp">
              <div className="relative inline-block">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-32 max-w-xs rounded-lg border border-border-subtle shadow-lg"
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
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selectedFile ? "Add a message about this image (optional)..." : "Type your message here..."}
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
                  onClick={handleVoiceRecord}
                  disabled={disabled || isStreaming}
                  className={`p-2.5 rounded-lg transition-all ${
                    isRecording
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-[#2d3748]/50 text-[#4a5568] hover:text-[#718096] hover:bg-[#2d3748]/70'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <Mic className="w-5 h-5" />
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