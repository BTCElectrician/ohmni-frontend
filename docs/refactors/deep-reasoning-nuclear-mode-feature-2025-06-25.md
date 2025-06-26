# Complete Frontend Refactor Plan - Deep Reasoning & Nuclear Features (Updated)

## Overview
This plan adds both deep reasoning (Brain) and nuclear (o3) functionality to the existing chat interface without breaking any current functionality. All changes are additive and backwards compatible. Both features are available to ALL users with daily quotas.

## Prerequisites
- Backend must have deep reasoning and nuclear endpoints deployed
- Backend includes `remaining_nuclear` in config SSE events (confirmed ✅)
- Error code strings are stable (confirmed ✅)
- No database changes required
- No breaking changes to existing chat flow
- Both features available to all users (no role restrictions)

## Design Rules

| Button | Icon | Label | Payload | Backend Field | Error Code | Daily Limit |
|--------|------|-------|---------|---------------|------------|-------------|
| Brain | 🧠 | Deep Reasoning | `deep_reasoning: true` | `remaining_deep_reasoning` | `deep_reasoning_limit_exceeded` | 50/day |
| Nuclear | ☢️ | Nuclear Mode | `preferred_model: "o3"` | `remaining_nuclear` | `nuclear_limit_exceeded` | 5/day |

**Important**: Brain and Nuclear are mutually exclusive - only one can be active at a time.

## Complete Step-by-Step Implementation

### Step 1: Update Type Definitions
**File**: `types/api.ts`

Add to existing types (DO NOT modify existing fields):

```typescript
// Add to ChatMessage interface (extends existing)
export interface ChatMessage {
  // ... existing fields remain unchanged ...
  metadata?: {
    deep_reasoning?: boolean;
    nuclear_mode?: boolean;           // RENAMED from nuclear_reasoning
    model_used?: string;
    reasoning_remaining?: number;
    nuclear_remaining?: number;
  };
}

// Add new type for enhanced responses with discriminated union
export type SSEEventType = 
  | { type: 'content'; content: string }
  | { type: 'message'; message: ChatMessage }
  | { type: 'error'; error: string }
  | { 
      type: 'config'; 
      deep_reasoning?: boolean;
      model?: string;
      remaining_deep_reasoning?: number;
      remaining_nuclear?: number;
    };

// Add type for offline queue
export interface QueuedChatAction {
  id: string;
  endpoint: string;
  method: string;
  data: {
    content: string;
    deep_reasoning?: boolean;
    preferred_model?: string;
  };
  timestamp: number;
}

// Add new type for enhanced responses
export interface ChatResponseMetadata {
  deep_reasoning?: boolean;
  preferred_model?: string;
  remaining_deep_reasoning?: number;
  remaining_nuclear?: number;
}
```

### Step 2: Import Required Icons (Alphabetized)
**File**: `components/chat/ChatInput.tsx`

Add to the existing imports at the top of the file:

```typescript
import { Brain, Mic, Paperclip, Radiation, Send } from 'lucide-react';
// Note: Icons are alphabetized to prevent lint issues
```

### Step 3: Update Chat Service for Both Features
**File**: `services/chatService.ts`

Modify the `sendMessage` method to accept both reasoning flags with proper type safety:

```typescript
async sendMessage(
  sessionId: string, 
  content: string, 
  onChunk?: (text: string) => void,
  useDeepReasoning: boolean = false,
  useNuclear: boolean = false
): Promise<ChatMessage> {
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  
  try {
    // Enforce mutual exclusivity
    if (useDeepReasoning && useNuclear) {
      console.warn('Cannot use Brain and Nuclear together - prioritizing Nuclear');
      useDeepReasoning = false;
    }
    
    console.log('Sending message - Deep:', useDeepReasoning, 'Nuclear:', useNuclear);
    
    // Build request body
    const body: any = { content };
    if (useDeepReasoning) body.deep_reasoning = true;
    if (useNuclear) body.preferred_model = 'o3';
    
    const response = await streamRequest(
      `/api/chat/sessions/${sessionId}/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new APIError(response.status, response.statusText);
    }

    reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let messageBuffer = '';
    let lastMessage: ChatMessage | null = null;
    let configData: Extract<SSEEventType, { type: 'config' }> | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data: SSEEventType = JSON.parse(line.slice(6));
            
            switch (data.type) {
              case 'config':
                // Store configuration data
                configData = data;
                console.log('Config received:', configData);
                break;
              case 'content':
                messageBuffer += data.content;
                onChunk?.(data.content);
                break;
              case 'message':
                lastMessage = data.message;
                break;
              case 'error':
                throw new Error(data.error);
            }
          } catch (e) {
            if (e instanceof Error && e.message.includes('application context')) {
              console.warn('Backend context error (auto-naming may be affected):', e.message);
            } else {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    }

    // Return the complete message with metadata
    return lastMessage || {
      id: 'temp-' + Date.now(),
      sessionId: sessionId,
      role: 'assistant',
      content: messageBuffer,
      timestamp: new Date(),
      metadata: configData ? {
        deep_reasoning: configData.deep_reasoning || false,
        nuclear_mode: configData.model === 'o3',  // Renamed from nuclear_reasoning
        model_used: configData.model,
        reasoning_remaining: configData.remaining_deep_reasoning,
        nuclear_remaining: configData.remaining_nuclear
      } : undefined
    };
  } catch (error) {
    console.error('Failed to send message:', error);
    throw error;
  } finally {
    // Always release the reader lock
    if (reader) {
      try {
        reader.releaseLock();
      } catch (e) {
        console.warn('Failed to release reader lock:', e);
      }
    }
  }
}
```

### Step 4: Update ChatInput Interface
**File**: `components/chat/ChatInput.tsx`

Update the props interface to support both reasoning parameters:

```typescript
interface ChatInputProps {
  onSendMessage: (message: string, useDeepReasoning?: boolean, useNuclear?: boolean) => void;
  onFileUpload?: (file: File) => void;
  onVoiceRecord?: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}
```

### Step 5: Add State and Logic to ChatInput Component
**File**: `components/chat/ChatInput.tsx`

Add nuclear state and mutual exclusivity logic with accessibility:

```typescript
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
  const [nuclearThinking, setNuclearThinking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (message.trim() && !disabled && !isStreaming) {
      onSendMessage(message.trim(), deepThinking, nuclearThinking);
      setMessage('');
      setDeepThinking(false);
      setNuclearThinking(false);
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
    <div className="fixed bottom-0 left-0 right-0 z-40 p-6">
      <div className="max-w-[900px] mx-auto">
        <form onSubmit={handleSubmit}>
          {/* Main container */}
          <div className="relative bg-[#1a2332]/90 backdrop-blur-sm rounded-2xl border border-[#2d3748]/50 shadow-xl">
            {/* Mode indicators - Responsive positioning */}
            <div className="absolute -top-8 left-0 right-0 flex items-center gap-4 px-6 pointer-events-none">
              {deepThinking && (
                <div className="flex items-center gap-2 text-sm text-electric-blue animate-fadeInUp">
                  <Brain className="w-4 h-4 animate-pulse" />
                  <span>Deep thinking mode active</span>
                </div>
              )}

              {nuclearThinking && (
                <div className="flex items-center gap-2 text-sm text-red-600 font-semibold animate-fadeInUp">
                  <Radiation className="w-4 h-4 animate-pulse" />
                  <span>☢️ Nuclear mode active - Expensive!</span>
                </div>
              )}
            </div>

            {/* Responsive banner for small viewports */}
            <style jsx>{`
              @media (max-height: 500px) {
                .absolute.-top-8 {
                  top: 100%;
                  transform: translateY(-1.5rem);
                }
              }
            `}</style>

            {/* Input field */}
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message here..."
              className="w-full bg-transparent text-white placeholder-[#4a5568] focus:outline-none text-[15px] px-6 pt-5 pb-14"
              disabled={disabled || isStreaming}
              aria-label="Chat message input"
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
                  aria-label={isRecording ? 'Stop recording' : 'Start voice recording'}
                >
                  <Mic className="w-5 h-5" />
                </button>

                {/* File Upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept="image/*,.pdf"
                  className="hidden"
                  aria-label="Upload file"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || isStreaming}
                  className="p-2.5 rounded-lg bg-[#2d3748]/50 text-[#4a5568] hover:text-[#718096] hover:bg-[#2d3748]/70 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Attach file"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                {/* Deep Thinking Toggle */}
                <button
                  type="button"
                  onClick={toggleDeepThinking}
                  disabled={disabled || isStreaming}
                  className={`p-2.5 rounded-lg transition-all ${
                    deepThinking
                      ? 'bg-electric-blue/20 text-electric-blue ring-2 ring-electric-blue/30'
                      : 'bg-[#2d3748]/50 text-[#4a5568] hover:text-[#718096] hover:bg-[#2d3748]/70'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={deepThinking ? 'Deep reasoning mode active (50/day)' : 'Enable deep reasoning mode'}
                  aria-label={deepThinking ? 'Disable deep reasoning mode' : 'Enable deep reasoning mode (50 uses per day)'}
                  aria-pressed={deepThinking}
                >
                  <Brain className={`w-5 h-5 ${deepThinking ? 'animate-pulse' : ''}`} />
                </button>

                {/* Nuclear Mode Toggle */}
                <button
                  type="button"
                  onClick={toggleNuclear}
                  disabled={disabled || isStreaming}
                  className={`p-2.5 rounded-lg transition-all ${
                    nuclearThinking
                      ? 'bg-red-600/20 text-red-600 ring-2 ring-red-600/30'
                      : 'bg-[#2d3748]/50 text-[#4a5568] hover:text-[#718096] hover:bg-[#2d3748]/70'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={nuclearThinking ? 'Nuclear mode active - o3 model (5/day)' : 'Enable nuclear mode (most powerful)'}
                  aria-label={nuclearThinking ? 'Disable nuclear mode' : 'Enable nuclear mode - o3 model (5 uses per day)'}
                  aria-pressed={nuclearThinking}
                >
                  <Radiation className={`w-5 h-5 ${nuclearThinking ? 'animate-pulse' : ''}`} />
                </button>
              </div>

              {/* Right side - Send button */}
              <button
                type="submit"
                disabled={!message.trim() || disabled || isStreaming}
                className="p-2.5 text-[#4a5568] hover:text-[#718096] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send message"
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
```

### Step 6: Update Chat Page Message Handling
**File**: `app/chat/page.tsx`

Update message handling with proper cache keys and quota tracking:

```typescript
// Add state for tracking first message
const [hasFirstMessage, setHasFirstMessage] = useState(false);

// Update the sendMessage function signature
const sendMessage = async (
  content: string, 
  useDeepReasoning: boolean = false,
  useNuclear: boolean = false
) => {
  if (!currentSession) {
    try {
      console.log('No current session, creating new one...');
      const session = await chatService.createSession('New Chat');
      console.log('New session created:', session);
      
      if (!session || !session.id) {
        throw new Error('Failed to create session - invalid response');
      }
      
      setCurrentSession(session);
      sendMessageWithSession(session.id, content, useDeepReasoning, useNuclear);
      return;
    } catch (error) {
      console.error('Failed to create session:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Authentication required')) {
          router.push('/login?error=session_expired');
        } else {
          toastFromApiError(error);
        }
      } else {
        toastFromApiError(new Error('Failed to start chat. Please try again.'));
      }
      return;
    }
  }

  sendMessageWithSession(currentSession.id, content, useDeepReasoning, useNuclear);
};

// Track quota changes to reduce toast noise
const lastQuotaRef = useRef<{ deep?: number; nuclear?: number }>({});

// Update sendMessageWithSession
const sendMessageWithSession = async (
  sessionId: string, 
  content: string,
  useDeepReasoning: boolean = false,
  useNuclear: boolean = false
) => {
  // Track first message properly
  const isFirstMessage = !hasFirstMessage;
  if (!hasFirstMessage && messages.length > 0) {
    setHasFirstMessage(true);
  }
  
  // Add user message immediately for better UX
  const userMessage: ChatMessageType = {
    id: Date.now().toString(),
    role: 'user',
    content,
    timestamp: new Date(),
    sessionId: sessionId,
    metadata: useNuclear 
      ? { nuclear_mode: true }
      : useDeepReasoning 
        ? { deep_reasoning: true } 
        : undefined
  };
  addMessage(userMessage);

  // Create AI message placeholder
  const tempAiMessageId = (Date.now() + 1).toString();
  const aiMessagePlaceholder: ChatMessageType = {
    id: tempAiMessageId,
    role: 'assistant',
    content: '',
    timestamp: new Date(),
    sessionId: sessionId,
  };
  addMessage(aiMessagePlaceholder);
  setStreamingMessageId(tempAiMessageId);
  setIsStreaming(true);

  try {
    const aiResponse = await chatService.sendMessage(
      sessionId, 
      content, 
      undefined,
      useDeepReasoning,
      useNuclear
    );
    
    updateMessage(tempAiMessageId, aiResponse.content || 'Message sent successfully!');
    
    // Show quota information only if it changed
    if (aiResponse.metadata?.reasoning_remaining !== undefined && 
        aiResponse.metadata.reasoning_remaining !== lastQuotaRef.current.deep) {
      lastQuotaRef.current.deep = aiResponse.metadata.reasoning_remaining;
      toastSuccess(`Deep reasoning uses remaining today: ${aiResponse.metadata.reasoning_remaining}`);
    }
    
    if (aiResponse.metadata?.nuclear_remaining !== undefined && 
        aiResponse.metadata.nuclear_remaining !== lastQuotaRef.current.nuclear) {
      lastQuotaRef.current.nuclear = aiResponse.metadata.nuclear_remaining;
      toastSuccess(`Nuclear uses remaining today: ${aiResponse.metadata.nuclear_remaining}`);
    }
    
    setIsStreaming(false);
    setStreamingMessageId(null);
    
    // Invalidate with proper cache key
    if (currentSession) {
      queryClient.invalidateQueries({ 
        queryKey: ['messages', sessionId, useDeepReasoning, useNuclear] 
      });
      loadMessages();
    }
    
    // First message session refresh
    if (isFirstMessage) {
      setHasFirstMessage(true);
      setTimeout(() => {
        console.log('Refreshing sessions to pick up auto-generated title...');
        queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      }, 2000);
    }
  } catch (error) {
    console.error('Failed to send message:', error);
    updateMessage(tempAiMessageId, 'Sorry, I encountered an error processing your request.');
    toastFromApiError(error);
    setIsStreaming(false);
    setStreamingMessageId(null);
  }
};
```

### Step 7: Update Error Handling
**File**: `lib/toast-helpers.ts`

Update with Sentry support and improved error messages:

```typescript
import toast from 'react-hot-toast';
// Import Sentry if available
// import * as Sentry from '@sentry/nextjs';

export const toastFromApiError = (error: unknown) => {
  if (error instanceof Error) {
    // Log to Sentry if available
    // if (typeof Sentry !== 'undefined') {
    //   Sentry.addBreadcrumb({
    //     category: 'api.error',
    //     message: error.message,
    //     level: 'error',
    //   });
    // }
    
    // Deep reasoning quota error
    if (error.message.includes('deep_reasoning_limit_exceeded')) {
      toast.error('Daily deep reasoning limit reached (50/day). Using standard model.', {
        duration: 4000,
        icon: '🧠',
      });
    } 
    // Nuclear mode quota error
    else if (error.message.includes('nuclear_limit_exceeded')) {
      toast.error('Daily nuclear limit reached (5/day). This is an expensive model!', {
        duration: 5000,
        icon: '☢️',
      });
    }
    // Standard errors
    else if (error.message.includes('401') || error.message.includes('Authentication')) {
      toast.error('Session expired. Please log in again.');
    } else if (error.message.includes('Network')) {
      toast.error('Connection lost. Please check your internet.');
    } else {
      toast.error(error.message);
    }
  } else {
    toast.error('An unexpected error occurred');
  }
};

export const toastSuccess = (message: string) => {
  toast.success(message, {
    duration: 3000,
    position: 'bottom-right',
    style: {
      background: '#10B981',
      color: '#fff',
    },
  });
};
```

### Step 8: Add Visual Indicators to Chat Messages
**File**: `components/chat/ChatMessage.tsx`

Import icons and add visual indicators:

```typescript
import { ChatMessage as ChatMessageType } from '@/types/api';
import { useSession } from 'next-auth/react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { CopyButton } from './CopyButton';
import { Brain, Radiation } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { data: session } = useSession();
  const isUser = message.role === 'user';

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
              <div
                className={`w-8 h-8 rounded flex items-center justify-center text-sm font-medium ${
                  isUser ? 'bg-white/20' : 'bg-electric-blue/20'
                }`}
              >
                {isUser
                  ? session?.user?.name?.slice(0, 2).toUpperCase() || 'U'
                  : 'AI'}
              </div>
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
              <MarkdownRenderer content={message.content} isUser={isUser} />
              
              {/* Mode indicators - only show for AI messages */}
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
    </div>
  );
}
```

### Step 9: Update Offline Queue Support
**File**: `store/chatStore.ts`

Add support for reasoning flags in offline queue:

```typescript
import { create } from 'zustand';
import { ChatSession, ChatMessage, QueuedChatAction } from '@/types/api';

interface ChatStore {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  offlineQueue: QueuedChatAction[];
  
  // Actions
  setSessions: (sessions: ChatSession[]) => void;
  setCurrentSession: (session: ChatSession | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, content: string | ((prev: string) => string)) => void;
  setIsLoading: (loading: boolean) => void;
  setIsStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;
  queueAction: (action: QueuedChatAction) => void;
  clearQueue: () => void;
  reset: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  sessions: [],
  currentSession: null,
  messages: [],
  isLoading: false,
  isStreaming: false,
  error: null,
  offlineQueue: [],
  
  setSessions: (sessions) => set({ sessions }),
  setCurrentSession: (session) => set({ currentSession: session }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),
  updateMessage: (id, content) => set((state) => ({
    messages: state.messages.map((msg) =>
      msg.id === id ? { ...msg, content: typeof content === 'function' ? content(msg.content) : content } : msg
    ),
  })),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
  setError: (error) => set({ error }),
  queueAction: (action) => set((state) => ({
    offlineQueue: [...state.offlineQueue, action]
  })),
  clearQueue: () => set({ offlineQueue: [] }),
  reset: () => set({
    sessions: [],
    currentSession: null,
    messages: [],
    isLoading: false,
    isStreaming: false,
    error: null,
    offlineQueue: [],
  }),
}));
```

### Step 10: Update Tailwind Configuration
**File**: `tailwind.config.ts`

Add safelist for dynamic classes:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    // Ensure these dynamic classes survive purge
    'bg-electric-blue/20',
    'text-electric-blue',
    'ring-electric-blue/30',
    'bg-red-600/20',
    'text-red-600',
    'ring-red-600/30',
    'text-red-500',
    'animate-pulse',
    'animate-fadeInUp',
  ],
  theme: {
    extend: {
      colors: {
        'abco-navy': '#081827',
        'electric-blue': '#149DEA',
        'electric-glow': '#1EB8FF',
        'deep-navy': '#0A1E33',
        'dark-bg': '#020B18',
        'surface-elevated': '#11263F',
        'border-subtle': '#1B4674',
        'text-primary': '#F0F6FC',
        'text-secondary': '#A0B4CC',
      },
      fontFamily: {
        'poppins': ['Poppins', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
        'montserrat': ['Montserrat', 'sans-serif'],
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'pulse-effect': 'pulseEffect 8s infinite alternate',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};

export default config;
```

## Testing Checklist

### Basic Functionality
- [ ] Chat works normally without any toggles
- [ ] Existing messages display correctly
- [ ] Authentication still works
- [ ] Offline queue persists reasoning flags

### Brain Mode Testing
- [ ] Brain button shows active state when clicked
- [ ] Deep reasoning flag sent in request
- [ ] Config event parsed correctly with discriminated union
- [ ] Quota displayed in response
- [ ] Error shown when limit hit (50/day)
- [ ] Visual indicator shows on AI message
- [ ] Accessible with keyboard navigation
- [ ] aria-label and aria-pressed work correctly

### Nuclear Mode Testing
- [ ] Nuclear button shows active state when clicked
- [ ] `preferred_model: "o3"` sent in request
- [ ] Red warning theme displays
- [ ] Quota displayed in response
- [ ] Error shown when limit hit (5/day)
- [ ] Visual indicator shows on AI message
- [ ] Warning clearly indicates expense

### Mutual Exclusivity
- [ ] Clicking Brain deactivates Nuclear
- [ ] Clicking Nuclear deactivates Brain
- [ ] Only one mode can be active at a time
- [ ] Correct flag sent based on active mode

### Error Handling
- [ ] Quota exceeded errors display correctly
- [ ] Stream reader properly released on error
- [ ] Network errors still handled
- [ ] Authentication errors still handled
- [ ] Sentry breadcrumbs logged (if configured)

### Performance & UX
- [ ] React Query cache keys prevent collisions
- [ ] Toast notifications don't spam on repeated responses
- [ ] Responsive banner positioning on small screens
- [ ] Touch targets remain 44px minimum
- [ ] Bundle size impact minimal

## Environment Variables

Add to `.env.local`:
```bash
# Feature flag for advanced modes
NEXT_PUBLIC_ENABLE_ADVANCED_MODES=true
```

Add to `.env.example`:
```bash
# Feature flag for advanced AI modes (brain/nuclear)
# Set to 'true' to enable deep reasoning and nuclear mode buttons
NEXT_PUBLIC_ENABLE_ADVANCED_MODES=false
```

## Rollback Plan

If issues arise, you can disable features without removing code:

1. **Quick disable**: Set `NEXT_PUBLIC_ENABLE_ADVANCED_MODES=false`
2. **Feature flag check in ChatInput**:
   ```typescript
   {process.env.NEXT_PUBLIC_ENABLE_ADVANCED_MODES === 'true' && (
     <>
       {/* Brain button */}
       {/* Nuclear button */}
     </>
   )}
   ```

## Deployment Checklist

- [ ] Bump version in package.json (e.g., 0.1.0 → 0.2.0)
- [ ] Run `npm run lint` - no errors
- [ ] Run `npm run typecheck` - no errors
- [ ] Update .env.example with feature flag
- [ ] Test on real mobile device (44px touch targets)
- [ ] Enable feature flag in staging first
- [ ] Monitor error rates in production
- [ ] Document quota limits in user help docs

## Success Criteria

- ✅ Existing chat functionality unchanged
- ✅ Both buttons toggle correctly with mutual exclusivity
- ✅ Correct payloads sent to backend
- ✅ Response metadata parsed and displayed
- ✅ Quota information shown to users
- ✅ Appropriate error messages for quota limits
- ✅ Visual feedback for active modes
- ✅ Fully accessible with screen readers
- ✅ Offline support maintained
- ✅ No TypeScript errors
- ✅ No console errors in production
- ✅ All users can access both features

## Notes

1. **Incremental implementation** - Test each step before proceeding
2. **Console logging** - Remove for production build
3. **Backwards compatibility** - All parameters have defaults
4. **Error recovery** - Basic chat works even if SSE parsing fails
5. **Visual clarity** - Users always know which mode is active
6. **Cost awareness** - Nuclear mode clearly indicates expense
7. **Accessibility** - Full keyboard and screen reader support
8. **Performance** - Minimal bundle size impact from icons
9. **Icon choice** - Radiation symbol (☢️) chosen over lightning (⚡) for better visual metaphor and universal recognition of nuclear/atomic power

## Why Radiation Icon?

The radiation icon (☢️) is superior to the lightning bolt for Nuclear Mode because:
- **Universal Recognition** - The radiation symbol is globally understood as representing nuclear/atomic power
- **Better Visual Weight** - The three-segment design is more visually distinct
- **Appropriate Warning** - The radiation symbol inherently conveys caution/expense
- **Theme Consistency** - Works better with the red color scheme for "dangerous/expensive" operations

This completes the production-ready refactor plan with all improvements incorporated.