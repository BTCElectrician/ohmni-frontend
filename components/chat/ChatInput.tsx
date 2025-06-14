'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, Zap } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onFileUpload?: (file: File) => void;
  onVoiceRecord?: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function ChatInput({
  onSendMessage,
  onFileUpload,
  onVoiceRecord,
  isStreaming,
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [deepThinking, setDeepThinking] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (message.trim() && !disabled && !isStreaming) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
  };

  const handleVoiceRecord = () => {
    if (onVoiceRecord) {
      setIsRecording(!isRecording);
      onVoiceRecord();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-dark-bg via-dark-bg to-transparent">
      <div className="max-w-[780px] mx-auto">
        <form
          onSubmit={handleSubmit}
          className="glass-card p-4 border-electric-blue/30 shadow-2xl"
        >
          {/* Deep Thinking Toggle */}
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={deepThinking}
                onChange={(e) => setDeepThinking(e.target.checked)}
                className="w-4 h-4 rounded border-electric-blue/30 bg-surface-elevated checked:bg-electric-blue"
              />
              <span className="text-sm text-text-secondary flex items-center gap-1">
                <Zap className="w-4 h-4" />
                Deep thinking mode
              </span>
            </label>
          </div>

          {/* Input Area */}
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about electrical codes, safety, or construction..."
                className="w-full min-h-[60px] max-h-[200px] p-3 pr-12 bg-surface-elevated border border-border-subtle rounded-lg text-text-primary placeholder-text-secondary resize-none focus:border-electric-blue focus:outline-none focus:ring-2 focus:ring-electric-blue/20"
                disabled={disabled || isStreaming}
                rows={1}
              />
              
              {/* Character count */}
              <div className="absolute bottom-3 right-3 text-xs text-text-secondary">
                {message.length}/2000
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {/* File Upload */}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept="image/*,.pdf"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isStreaming}
                className="p-3 rounded-lg bg-surface-elevated border border-border-subtle text-text-secondary hover:text-electric-blue hover:border-electric-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              {/* Voice Record */}
              <button
                type="button"
                onClick={handleVoiceRecord}
                disabled={disabled || isStreaming}
                className={`p-3 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  isRecording
                    ? 'bg-red-500 border-red-500 text-white animate-pulse'
                    : 'bg-surface-elevated border-border-subtle text-text-secondary hover:text-electric-blue hover:border-electric-blue'
                }`}
              >
                <Mic className="w-5 h-5" />
              </button>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!message.trim() || disabled || isStreaming}
                className="p-3 rounded-lg bg-electric-blue text-white hover:bg-electric-glow transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 