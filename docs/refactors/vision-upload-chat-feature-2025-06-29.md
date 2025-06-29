# Frontend Implementation Plan - Vision Upload Feature

## AI Agent Implementation Guide
This is a complete, step-by-step implementation plan for adding image upload functionality to the OHMNI chat interface. Follow each step in order to safely implement this feature without breaking existing functionality.

**Status**: Ready for implementation  
**Backend**: Already deployed and tested on Render  
**Frontend**: To be implemented on this Vercel-deployed Next.js app  
**Estimated Time**: 9-13 hours  
**Risk Level**: Medium (modifies core chat components)  

## Overview
Implement image upload functionality in the chat interface, allowing electricians to upload drawings/photos and receive AI analysis within their conversation flow. The backend is deployed and ready at the endpoints specified below.

## Backend Integration Points (Already Deployed)

### Upload Endpoint
- **URL**: `POST /api/chat/sessions/{session_id}/upload`
- **Headers**: `Authorization: Bearer {token}`
- **Body**: multipart/form-data
  - `file` (required): image file
  - `message` (optional): custom prompt, defaults to "Please analyze this image"
- **Response**: 
  ```json
  {
    "message": "Upload successful, analysis will begin shortly",
    "user_message_id": "msg_123",
    "file_info": {
      "filename": "20240629_143022_panel.jpg",
      "size": 2048576,
      "type": "image/jpeg"
    },
    "preview_url": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  }
  ```

### Streaming Analysis
- Analysis comes through existing SSE endpoint: `/api/chat/sessions/{id}/stream`
- New event type: `{'type': 'vision_start', 'message': 'Analyzing image...'}`

## Git Setup & Pre-Implementation Checklist

### Branch Creation and Setup

⚠️ **CRITICAL**: Never commit directly to main. Always use the feature branch.

```bash
# 1. Ensure you're on the latest main branch
git checkout main
git pull origin main

# 2. Create and checkout the feature branch
git checkout -b feature/vision-upload-chat

# 3. Verify branch creation
git branch --show-current
# Should output: feature/vision-upload-chat

# 4. Push the branch to remote to establish tracking
git push -u origin feature/vision-upload-chat

# 5. Double-check you're NOT on main before making changes
git branch --show-current
# Should NOT show "main"
```

### Pre-Implementation Verification
Before starting implementation, verify these critical items:

- [ ] **Backend Endpoint Check**: Test that vision endpoints are live
  ```bash
  # Test health endpoint (should return 200)
  curl https://ohmni-backend.onrender.com/api/health
  ```
- [ ] **Local Environment**: Ensure `.env.local` has correct backend URL
  ```
  NEXT_PUBLIC_BACKEND_URL=https://ohmni-backend.onrender.com
  NEXTAUTH_URL=http://localhost:3000
  NEXTAUTH_SECRET=your-secret-here
  ```
- [ ] **Dependencies Up to Date**: 
  ```bash
  npm install
  npm run dev
  ```
- [ ] **Current App Working**: Test login and basic chat functionality
- [ ] **TypeScript Compiling**: 
  ```bash
  npm run type-check
  ```

### Implementation Order & Testing Strategy
Follow this exact order to minimize breaking changes:

1. **Types First** (Task 1) - No breaking changes
2. **Services** (Tasks 2, 4) - Isolated new code
3. **Store Updates** (Task 3) - Backward compatible
4. **UI Components** (Tasks 5, 6) - Test in isolation
5. **Integration** (Tasks 7, 8) - Wire everything together

After each task, run:
```bash
npm run type-check  # Ensure no TypeScript errors
npm run dev         # Test locally
```

## Implementation Tasks

### Task 1: Update Types
**File: `/types/api.ts`**

Add these types to support vision features:

```typescript
// Add to existing types
export interface VisionAnalysis {
  id: string;
  analysis: string;
  timestamp: string; // ISO string from backend
  metadata?: {
    drawing_type?: string;
    confidence?: number;
    file_info?: {
      filename: string;
      size: number;
      type: string;
    };
  };
}

// Extend ChatMessage to support attachments
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sessionId: string;
  metadata?: {
    deep_reasoning?: boolean;
    nuclear_mode?: boolean;
    model_used?: string;
    reasoning_remaining?: number;
    nuclear_remaining?: number;
  };
  // ADD THIS:
  attachments?: {
    type: 'image' | 'pdf'; // Future-proof with discriminated union
    url?: string; // Base64 or temporary URL
    filename: string;
    size?: number;
    analysis?: VisionAnalysis;
  }[];
}

// Add file upload response type
export interface UploadResponse {
  message: string;
  user_message_id: string;
  file_info: {
    filename: string;
    size: number;
    type: string;
  };
  preview_url: string; // Base64 data URL
}

// Extend SSEEventType for vision
export type SSEEventType = 
  | { type: 'content'; content: string }
  | { type: 'message'; message: ChatMessage }
  | { type: 'error'; error: string }
  | { type: 'config'; deep_reasoning?: boolean; model?: string; remaining_deep_reasoning?: number; remaining_nuclear?: number; }
  | { type: 'vision_start'; message: string }; // ADD THIS
```

### Task 2: Create Vision Service
**File: `/services/visionService.ts`** (NEW)

```typescript
import { UploadResponse } from '@/types/api';
import { api } from '@/lib/api';
import { getAccessToken } from '@/lib/auth/getAccessToken';

export class VisionService {
  private readonly MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
  private readonly ACCEPTED_TYPES = [
    'image/jpeg',
    'image/png', 
    'image/webp',
    'image/heic'
  ];

  /**
   * Validates file before upload
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    if (!this.ACCEPTED_TYPES.includes(file.type)) {
      // Special handling for HEIC
      if (file.name.toLowerCase().endsWith('.heic')) {
        // iOS sometimes reports HEIC as empty type
        return { valid: true };
      }
      return { 
        valid: false, 
        error: 'Please upload a JPEG, PNG, WebP, or HEIC image' 
      };
    }

    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return { 
        valid: false, 
        error: `Image is ${sizeMB}MB. Maximum size is 20MB` 
      };
    }

    return { valid: true };
  }

  /**
   * Optimizes image dimensions to prevent token overflow
   */
  async optimizeImage(file: File): Promise<File> {
    const MAX_DIMENSION = 3200;
    
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      img.onload = async () => {
        URL.revokeObjectURL(objectUrl);
        
        // Check if optimization needed
        if (img.width <= MAX_DIMENSION && img.height <= MAX_DIMENSION) {
          resolve(file);
          return;
        }
        
        // Create canvas for resizing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file); // Fallback if canvas not supported
          return;
        }
        
        // Calculate new dimensions
        const scale = Math.min(
          MAX_DIMENSION / img.width,
          MAX_DIMENSION / img.height
        );
        canvas.width = Math.floor(img.width * scale);
        canvas.height = Math.floor(img.height * scale);
        
        // Draw and resize
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Convert back to file
        canvas.toBlob((blob) => {
          if (blob) {
            const optimizedFile = new File(
              [blob], 
              file.name.replace(/\.[^.]+$/, '.jpg'), // Force JPEG
              { type: 'image/jpeg' }
            );
            resolve(optimizedFile);
          } else {
            resolve(file); // Fallback to original
          }
        }, 'image/jpeg', 0.9);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file); // Fallback to original on error
      };
      
      img.src = objectUrl;
    });
  }

  /**
   * Creates a local preview URL for immediate display
   */
  createPreviewUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  /**
   * Uploads image to chat session
   */
  async uploadToChat(
    sessionId: string,
    file: File,
    message?: string
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (message) {
      formData.append('message', message);
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/sessions/${sessionId}/upload`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await getAccessToken()}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }
}

export const visionService = new VisionService();
```

### Task 3: Update Store for Offline Support
**File: `/store/chatStore.ts`**

Update the QueuedChatAction interface to support files:

```typescript
export interface QueuedChatAction {
  id: string;
  endpoint: string;
  method: string;
  data: {
    content: string;
    deep_reasoning?: boolean;
    preferred_model?: string;
    file?: File; // ADD THIS for offline file queueing
  };
  timestamp: number;
}
```

### Task 4: Update Chat Service
**File: `/services/chatService.ts`**

Add method to handle messages with files:

```typescript
// Add to ChatService class:

async sendMessageWithFile(
  sessionId: string,
  content: string,
  file: File,
  onChunk?: (text: string) => void
): Promise<ChatMessage> {
  // First, upload the file
  const uploadResponse = await visionService.uploadToChat(
    sessionId,
    file,
    content
  );
  
  // The user message is already created by backend
  // Now we just listen to the SSE stream for the AI response
  
  // Create a temporary message with the attachment for immediate display
  const userMessage: ChatMessage = {
    id: uploadResponse.user_message_id,
    sessionId: sessionId,
    role: 'user',
    content: content || 'Please analyze this image',
    timestamp: new Date(),
    attachments: [{
      type: 'image',
      url: uploadResponse.preview_url,
      filename: uploadResponse.file_info.filename,
      size: uploadResponse.file_info.size
    }]
  };
  
  // Return the user message - streaming will handle the AI response
  return userMessage;
}
```

### Task 5: Update Chat Input Component
**File: `/components/chat/ChatInput.tsx`**

```typescript
'use client';

import { useState, useRef, useCallback } from 'react';
import { Brain, Mic, Paperclip, Radiation, Send, X, Image as ImageIcon } from 'lucide-react';
import { visionService } from '@/services/visionService';
import { toastFromApiError, toastSuccess } from '@/lib/toast-helpers';

interface ChatInputProps {
  onSendMessage: (message: string, useDeepReasoning?: boolean, useNuclear?: boolean) => void;
  onSendMessageWithFile?: (message: string, file: File) => void;
  onFileUpload?: (file: File) => void;
  onVoiceRecord?: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function ChatInput({
  onSendMessage,
  onSendMessageWithFile,
  onFileUpload,
  onVoiceRecord,
  isStreaming,
  disabled = false,
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
    } catch (error) {
      console.error('File processing error:', error);
      toastFromApiError(error);
    } finally {
      setIsProcessingFile(false);
    }
  }, []);

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
                  disabled={disabled || isStreaming || isProcessingFile || !!selectedFile}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || isStreaming || isProcessingFile || !!selectedFile}
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
                className="p-2.5 text-[#4a5568] hover:text-[#718096] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### Task 6: Update Chat Message Component
**File: `/components/chat/ChatMessage.tsx`**

Add support for displaying image attachments:

```typescript
import { ChatMessage as ChatMessageType } from '@/types/api';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { MarkdownRenderer } from './MarkdownRenderer';
import { CopyButton } from './CopyButton';
import { Brain, Radiation, ImageIcon, Maximize2 } from 'lucide-react';
import { useState } from 'react';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { data: session } = useSession();
  const isUser = message.role === 'user';
  const [showFullImage, setShowFullImage] = useState(false);

  return (
    <div className={`message-wrapper mb-6 ${isUser ? 'flex justify-end' : ''}`}>
      <div
        className={`message max-w-[80%] p-4 rounded-lg ${
          isUser
            ? 'bg-user-bubble text-white'
            : 'bg-surface-elevated text-text-primary border border-border-subtle'
        }`}
      >
        <div className="flex flex-col">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {isUser ? (
                <div className="w-8 h-8 rounded flex items-center justify-center text-sm font-medium bg-white/20">
                  {session?.user?.name?.slice(0, 2).toUpperCase() || 'U'}
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full overflow-hidden bg-electric-blue/20 flex items-center justify-center border-2 border-electric-blue shadow-md">
                  <Image
                    src="/images/owl-mini-blueprint.png"
                    alt="OHMNI Oracle"
                    width={40}
                    height={40}
                    className="object-contain"
                  />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-medium opacity-80">
                  {isUser ? 'You' : 'OHMNI Oracle'}
                </div>
                {!isUser && (
                  <CopyButton text={message.content} />
                )}
              </div>

              {/* Image Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="mb-3">
                  {message.attachments.map((attachment, index) => (
                    <div key={index} className="relative group">
                      {attachment.type === 'image' && attachment.url && (
                        <>
                          <div 
                            className="relative overflow-hidden rounded-lg border border-border-subtle cursor-pointer"
                            onClick={() => setShowFullImage(true)}
                          >
                            <img
                              src={attachment.url}
                              alt={attachment.filename}
                              className="max-w-full max-h-[400px] object-contain"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                              <Maximize2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary">
                            <ImageIcon className="w-3 h-3" />
                            <span>{attachment.filename}</span>
                            {attachment.size && (
                              <span>({(attachment.size / 1024 / 1024).toFixed(1)}MB)</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <MarkdownRenderer content={message.content} isUser={isUser} />
              
              {/* Mode indicators */}
              {!isUser && message.metadata?.deep_reasoning && (
                <div className="flex items-center gap-2 mt-3 text-xs text-electric-blue/70">
                  <Brain className="w-3 h-3" />
                  <span>Deep reasoning • Model: {message.metadata.model_used || 'Advanced'}</span>
                  {message.metadata.reasoning_remaining !== undefined && (
                    <span className="ml-auto">
                      {message.metadata.reasoning_remaining} uses remaining today
                    </span>
                  )}
                </div>
              )}

              {!isUser && message.metadata?.nuclear_mode && (
                <div className="flex items-center gap-2 mt-3 text-xs text-red-600/70">
                  <Radiation className="w-3 h-3" />
                  <span>Nuclear mode • Model: {message.metadata.model_used || 'o3'}</span>
                  {message.metadata.nuclear_remaining !== undefined && (
                    <span className="ml-auto text-red-500">
                      ☢️ {message.metadata.nuclear_remaining} nuclear uses left today
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Full Image Modal */}
      {showFullImage && message.attachments?.[0]?.url && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowFullImage(false)}
        >
          <img
            src={message.attachments[0].url}
            alt={message.attachments[0].filename}
            className="max-w-full max-h-full object-contain"
          />
          <button
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors"
            onClick={() => setShowFullImage(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}
```

### Task 7: Update Chat Page
**File: `/app/chat/page.tsx`**

Add the file upload handler to the chat page:

```typescript
// Add to imports
import { visionService } from '@/services/visionService';

// Inside the ChatPage component, add:

const sendMessageWithFile = async (content: string, file: File) => {
  if (!currentSession) {
    // Create session if needed (same as regular sendMessage)
    try {
      setIsCreatingNewSession(true);
      const session = await chatService.createSession('New Chat');
      setCurrentSession(session);
      await sendMessageWithFileToSession(session.id, content, file);
      setIsCreatingNewSession(false);
    } catch (error) {
      setIsCreatingNewSession(false);
      toastFromApiError(error);
    }
    return;
  }

  await sendMessageWithFileToSession(currentSession.id, content, file);
};

const sendMessageWithFileToSession = async (
  sessionId: string,
  content: string,
  file: File
) => {
  try {
    // Add user message with file
    const userMessage = await chatService.sendMessageWithFile(
      sessionId,
      content,
      file
    );
    
    // Add to messages immediately
    addMessage(userMessage);
    
    // The AI response will come through the existing SSE stream
    // No additional handling needed here
    
  } catch (error) {
    console.error('Failed to send image:', error);
    toastFromApiError(error);
  }
};

// Update the ChatInput component props:
<ChatInput
  onSendMessage={sendMessage}
  onSendMessageWithFile={sendMessageWithFile} // ADD THIS
  isStreaming={isStreaming}
  disabled={false}
/>
```

### Task 8: Integration with React Query
**File: `/app/chat/page.tsx`**

Add React Query mutation for better state management:

```typescript
import { useMutation } from '@tanstack/react-query';

// Inside ChatPage component:
const uploadMutation = useMutation({
  mutationFn: async ({ file, content }: { file: File; content: string }) => {
    if (!currentSession) throw new Error('No session');
    return visionService.uploadToChat(currentSession.id, file, content);
  },
  onSuccess: (data) => {
    // Invalidate messages to refresh
    queryClient.invalidateQueries(['messages', currentSession?.id]);
  },
  onError: (error) => {
    toastFromApiError(error);
  }
});

// Use in sendMessageWithFile:
const sendMessageWithFile = async (content: string, file: File) => {
  await uploadMutation.mutateAsync({ file, content });
};
```

## Testing Checklist

### Local Development Testing

#### 1. Initial Setup Test
```bash
# Start the development server
npm run dev

# In another terminal, watch for TypeScript errors
npm run type-check -- --watch

# Open browser to http://localhost:3000
# Login with test credentials
```

#### 2. Component Isolation Testing
Test each component in isolation before integration:

```bash
# Create a test page at app/test-vision/page.tsx for component testing
# This allows testing ChatInput with file upload without breaking main chat
```

#### 3. File Upload Testing Script
Create test images for comprehensive testing:
```bash
# Create test-images directory
mkdir public/test-images

# Download various test images (or use your own)
# - test-small.jpg (< 1MB)
# - test-large.jpg (> 20MB)
# - test-heic.heic (for iOS testing)
# - test-invalid.txt (wrong type)
```

#### 4. Browser Testing Commands
```bash
# Test in different browsers
# Chrome
open -a "Google Chrome" http://localhost:3000/chat

# Safari (for iOS simulation)
open -a Safari http://localhost:3000/chat

# Firefox
open -a Firefox http://localhost:3000/chat
```

#### 5. Mobile Testing
```bash
# Get your local IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# Access from mobile device on same network
# http://YOUR_LOCAL_IP:3000/chat
```

### Manual Testing Checklist

#### File Upload
- [ ] Click paperclip button opens file picker
- [ ] On iOS/iPad: Shows "Take Photo", "Photo Library", "Browse" options
- [ ] Can select JPEG, PNG, WebP images
- [ ] HEIC images show conversion notice
- [ ] Files over 20MB show error toast
- [ ] Invalid file types show error toast

#### Image Preview
- [ ] Selected image shows preview thumbnail
- [ ] Preview shows filename overlay
- [ ] Can remove image with X button
- [ ] Preview clears after sending

#### Upload Process
- [ ] Progress indicator shows during processing
- [ ] Brain/Nuclear modes disabled with image
- [ ] Upload completes successfully
- [ ] User message appears with image

#### Chat Display
- [ ] Image displays in chat at reasonable size (max 400px height)
- [ ] Click image to view full size
- [ ] AI analysis appears as assistant message
- [ ] Streaming works normally

#### Error Handling
- [ ] Network errors show toast
- [ ] Backend errors display properly
- [ ] Can retry after error
- [ ] Session expires redirect to login

#### Mobile/iPad Specific
- [ ] Camera capture works
- [ ] Touch targets are 44px minimum
- [ ] Images optimize for mobile data
- [ ] Offline shows appropriate message

### Troubleshooting Common Issues

#### TypeScript Errors
```bash
# If you see "useEffect is not defined"
# Add to ChatInput.tsx imports:
import { useState, useRef, useCallback, useEffect } from 'react';

# If you see "Property 'attachments' does not exist"
# Make sure you've updated types/api.ts first (Task 1)
```

#### Build Errors
```bash
# Clear Next.js cache if build fails
rm -rf .next
npm run build
```

#### API Connection Issues
```bash
# Verify backend is accessible
curl -I https://ohmni-backend.onrender.com/api/health

# Check your .env.local file
cat .env.local | grep BACKEND_URL
```

#### Image Not Displaying
```javascript
// Check browser console for CSP errors
// Verify base64 string is valid
// Check if preview URL was revoked too early
```

### Console Testing
Monitor browser console for errors during testing:
```javascript
// Check for any console errors
// Look for failed API calls
// Verify no memory leaks from blob URLs
// Check WebSocket/SSE connections remain stable
```

### Performance Testing
```bash
# Run Lighthouse audit
# 1. Open Chrome DevTools
# 2. Go to Lighthouse tab
# 3. Run audit on chat page with images

# Check bundle size impact
npm run build
# Note the build output size before and after changes
```

## Performance Considerations

1. **Image Optimization**: Large images are resized client-side to max 3200px
2. **Preview URLs**: Use blob URLs for immediate display, cleanup on unmount
3. **Base64 Handling**: Backend provides base64 for persistence, but large strings impact performance
4. **React Query**: Caches upload results to prevent duplicate requests

## Security Considerations

1. **File Validation**: Type and size checked client-side and server-side
2. **Token Handling**: Uses existing auth flow with bearer tokens
3. **Session Validation**: Backend verifies session ownership
4. **Filename Sanitization**: Backend uses secure_filename

## Future Enhancements (Not in MVP)

- Multiple image upload support
- PDF document support
- Drag-and-drop upload
- Image annotation tools
- Progress bar for upload percentage
- Retry failed uploads automatically

## Deployment & Final Steps

### Pre-Merge Checklist
Before merging to main, ensure:

- [ ] All TypeScript errors resolved (`npm run type-check`)
- [ ] Build succeeds (`npm run build`)
- [ ] All manual tests pass
- [ ] No console errors in development
- [ ] Feature works on mobile devices
- [ ] Code reviewed by team member
- [ ] Documentation updated if needed

### Vercel Preview Deployment
```bash
# 1. Push your feature branch
git add .
git commit -m "feat(chat): add image upload functionality for vision analysis"
git push origin feature/vision-upload-chat

# 2. Vercel will automatically create a preview deployment
# Check the PR for the preview URL
# Test the feature on the preview deployment
```

### Merge Process
```bash
# 1. Ensure feature branch is up to date
git checkout main
git pull origin main
git checkout feature/vision-upload-chat
git merge main

# 2. Resolve any conflicts if they exist
# 3. Run final tests
npm run type-check
npm run build
npm test

# 4. Push and create PR
git push origin feature/vision-upload-chat

# 5. After PR approval and merge
git checkout main
git pull origin main
git branch -d feature/vision-upload-chat
```

### Post-Deployment Verification
After Vercel deploys to production:

1. Test upload on production URL
2. Monitor error tracking (if configured)
3. Check performance metrics
4. Verify mobile functionality
5. Test with real electrician scenarios

### Rollback Plan
If issues occur after deployment:

```bash
# Vercel allows instant rollback to previous deployment
# Go to Vercel dashboard > Project > Deployments
# Click "..." menu on previous stable deployment
# Select "Promote to Production"
```

## Implementation Time Estimate

1. Types and service setup: 1-2 hours
2. Vision service implementation: 2 hours
3. Chat input updates: 2-3 hours
4. Message display updates: 1-2 hours
5. Chat page integration: 1 hour
6. Testing and refinement: 2-3 hours

**Total: 9-13 hours**