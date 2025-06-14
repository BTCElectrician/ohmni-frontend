# Phase 6: Chat Interface

## Overview
This phase implements the complete chat interface with sidebar, message display, and streaming support.

---

## Step 6.1: Create Chat Store

Create `store/chatStore.ts`:

```typescript
import { create } from 'zustand';
import { ChatSession, ChatMessage } from '@/types/api';

interface ChatStore {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  
  // Actions
  setSessions: (sessions: ChatSession[]) => void;
  setCurrentSession: (session: ChatSession | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, content: string) => void;
  setIsLoading: (loading: boolean) => void;
  setIsStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  sessions: [],
  currentSession: null,
  messages: [],
  isLoading: false,
  isStreaming: false,
  error: null,
  
  setSessions: (sessions) => set({ sessions }),
  setCurrentSession: (session) => set({ currentSession: session }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),
  updateMessage: (id, content) => set((state) => ({
    messages: state.messages.map((msg) =>
      msg.id === id ? { ...msg, content } : msg
    ),
  })),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
  setError: (error) => set({ error }),
  reset: () => set({
    sessions: [],
    currentSession: null,
    messages: [],
    isLoading: false,
    isStreaming: false,
    error: null,
  }),
}));
```

---

## Step 6.2: Create Chat Service

Create `services/chatService.ts`:

```typescript
import { api } from '@/lib/api';
import { ChatSession, ChatMessage } from '@/types/api';

export class ChatService {
  // Session management
  async getSessions(): Promise<ChatSession[]> {
    return api.get('/api/chat/sessions');
  }

  async createSession(name?: string): Promise<ChatSession> {
    return api.post('/api/chat/sessions', { name });
  }

  async getSession(id: string): Promise<ChatSession> {
    return api.get(`/api/chat/sessions/${id}`);
  }

  async deleteSession(id: string): Promise<void> {
    return api.delete(`/api/chat/sessions/${id}`);
  }

  async renameSession(id: string, name: string): Promise<ChatSession> {
    return api.put(`/api/chat/sessions/${id}/rename`, { name });
  }

  async bulkDeleteSessions(ids: string[]): Promise<void> {
    return api.post('/api/chat/sessions/bulk-delete', { ids });
  }

  // Messages
  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    return api.get(`/api/chat/sessions/${sessionId}/messages`);
  }

  async sendMessage(sessionId: string, message: string): Promise<ChatMessage> {
    return api.post('/api/chat/message', { 
      session_id: sessionId, 
      message 
    });
  }

  // Streaming chat
  async streamMessage(
    sessionId: string, 
    message: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/${sessionId}/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await import('next-auth/react')).getSession()?.accessToken}`,
          },
          body: JSON.stringify({ message }),
        }
      );

      if (!response.ok) {
        throw new Error(`Stream error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Stream not available');

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                onChunk(data.content);
              }
            } catch (e) {
              // Handle non-JSON data
              const content = line.slice(6);
              if (content && content !== '[DONE]') {
                onChunk(content);
              }
            }
          }
        }
      }

      onComplete();
    } catch (error) {
      onError(error as Error);
    }
  }
}

export const chatService = new ChatService();
```

---

## Step 6.3: Create Chat Sidebar Component

Create `components/chat/ChatSidebar.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { PlusCircle, Folder, Star, Trash2, Edit2 } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { chatService } from '@/services/chatService';
import { ChatSession } from '@/types/api';

export function ChatSidebar() {
  const { sessions, currentSession, setSessions, setCurrentSession } = useChatStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await chatService.getSessions();
      setSessions(data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewChat = async () => {
    try {
      const session = await chatService.createSession('New Chat');
      setSessions([session, ...sessions]);
      setCurrentSession(session);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const selectSession = (session: ChatSession) => {
    setCurrentSession(session);
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Delete this chat session?')) return;

    try {
      await chatService.deleteSession(id);
      setSessions(sessions.filter(s => s.id !== id));
      
      if (currentSession?.id === id) {
        setCurrentSession(null);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  return (
    <div className="w-[230px] min-w-[230px] bg-deep-navy border-r border-electric-blue/20 text-text-secondary flex flex-col h-full overflow-y-auto custom-scrollbar">
      {/* Fixed Top Section */}
      <div className="flex-shrink-0">
        {/* New Chat Button */}
        <button
          onClick={createNewChat}
          className="m-3 flex items-center gap-3 w-[calc(100%-1.5rem)] p-3 bg-transparent border border-electric-blue/30 rounded-lg text-text-primary hover:bg-surface-elevated transition-colors"
        >
          <PlusCircle className="w-5 h-5" />
          <span>New chat</span>
        </button>
        
        {/* Starred Section */}
        <div className="mb-0 pb-0">
          <div className="text-xs font-semibold text-text-secondary px-3 py-2 uppercase tracking-wide">
            Starred
          </div>
          <div className="px-2 mb-0">
            <div className="text-sm text-text-secondary/70 text-center py-2">
              No starred conversations
            </div>
          </div>
        </div>
        
        {/* Projects Section */}
        <div className="mb-0 pb-0">
          <div className="text-xs font-semibold text-text-secondary px-3 py-2 uppercase tracking-wide">
            Projects
          </div>
          <div className="px-2 mb-0">
            <button className="w-full flex items-center gap-3 p-2 rounded hover:bg-surface-elevated transition-colors">
              <Folder className="w-4 h-4" />
              <span className="text-sm">My Jobs</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Scrollable Chats Section */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="text-xs font-semibold text-text-secondary px-3 py-2 uppercase tracking-wide flex-shrink-0">
          Chats
        </div>
        <div className="flex-1 overflow-y-auto px-2 min-h-0">
          {isLoading ? (
            <div className="text-sm text-text-secondary/70 text-center py-3">
              Loading...
            </div>
          ) : sessions.length > 0 ? (
            sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => selectSession(session)}
                className={`group w-full flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                  currentSession?.id === session.id
                    ? 'bg-surface-elevated'
                    : 'hover:bg-surface-elevated'
                }`}
              >
                <span className="text-sm truncate flex-1">{session.name}</span>
                <button
                  onClick={(e) => deleteSession(session.id, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          ) : (
            <div className="text-sm text-text-secondary/70 text-center py-3">
              No chat sessions yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Step 6.4: Create Chat Message Component

Create `components/chat/ChatMessage.tsx`:

```typescript
import { ChatMessage as ChatMessageType } from '@/types/api';
import { useSession } from 'next-auth/react';

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
            <div className="text-sm font-medium mb-1 opacity-80">
              {isUser ? 'You' : 'OHMNI Oracle'}
            </div>
            <div className="prose prose-invert max-w-none">
              {message.content}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Step 6.5: Create Chat Input Component

Create `components/chat/ChatInput.tsx`:

```typescript
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
```

---

## Step 6.6: Create Main Chat Page

Create `app/chat/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { chatService } from '@/services/chatService';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatMessage as ChatMessageType } from '@/types/api';

const PROMPT_SUGGESTIONS = [
  { icon: '⚡', text: 'Explain electrical load calculations for a 2000 sq ft residential building' },
  { icon: '🛡️', text: 'Help me understand OSHA requirements for scaffolding on a commercial project' },
  { icon: '📋', text: 'Draft a project plan timeline for kitchen renovation with electrical work' },
  { icon: '♻️', text: 'What are the best practices for managing construction waste?' },
];

export default function ChatPage() {
  const {
    currentSession,
    messages,
    isStreaming,
    setMessages,
    addMessage,
    updateMessage,
    setIsStreaming,
  } = useChatStore();

  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (currentSession) {
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [currentSession]);

  const loadMessages = async () => {
    if (!currentSession) return;

    try {
      const data = await chatService.getMessages(currentSession.id);
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const sendMessage = async (content: string) => {
    if (!currentSession) {
      // Create a new session if none exists
      try {
        const session = await chatService.createSession('New Chat');
        // Update store will trigger re-render and load messages
        return;
      } catch (error) {
        console.error('Failed to create session:', error);
        return;
      }
    }

    // Add user message
    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
      sessionId: currentSession.id,
    };
    addMessage(userMessage);

    // Create AI message placeholder
    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: ChatMessageType = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      sessionId: currentSession.id,
    };
    addMessage(aiMessage);
    setStreamingMessageId(aiMessageId);
    setIsStreaming(true);

    // Stream the response
    try {
      await chatService.streamMessage(
        currentSession.id,
        content,
        (chunk) => {
          // Update the AI message with streaming content
          updateMessage(aiMessageId, (prev) => prev + chunk);
        },
        () => {
          // Streaming complete
          setIsStreaming(false);
          setStreamingMessageId(null);
        },
        (error) => {
          console.error('Streaming error:', error);
          updateMessage(aiMessageId, 'Sorry, I encountered an error processing your request.');
          setIsStreaming(false);
          setStreamingMessageId(null);
        }
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsStreaming(false);
      setStreamingMessageId(null);
    }
  };

  const handlePromptClick = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-dark-bg">
      {/* Sidebar */}
      <ChatSidebar />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        {/* Content Container */}
        <div className="chat-content bg-dark-bg relative overflow-hidden flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center custom-scrollbar">
          {/* Background Effect */}
          <div
            className="absolute inset-0 opacity-[0.07] z-0 pointer-events-none"
            style={{
              backgroundImage: "url('/images/ohmni-blue-owl-lightning.png')",
              backgroundSize: 'cover',
            }}
          />

          {/* Messages Container */}
          <div className="relative z-10 w-full max-w-[780px] mx-auto p-5 pb-[180px]">
            <div className="chat-messages w-full">
              {/* Prompt Suggestions (shows when no messages) */}
              {messages.length === 0 && (
                <div className="glass-card p-6 mb-6">
                  <h3 className="text-xl font-semibold text-white mb-4">
                    Suggested Prompts
                  </h3>
                  <div className="space-y-3">
                    {PROMPT_SUGGESTIONS.map((prompt, index) => (
                      <button
                        key={index}
                        onClick={() => handlePromptClick(prompt.text)}
                        className="w-full text-left p-3 rounded-lg bg-surface-elevated hover:bg-border-subtle transition-colors group"
                      >
                        <span className="mr-3 text-xl">{prompt.icon}</span>
                        <span className="text-text-secondary group-hover:text-text-primary">
                          {prompt.text}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Messages */}
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}

              {/* Streaming Indicator */}
              {isStreaming && streamingMessageId && (
                <div className="text-center text-text-secondary text-sm animate-pulse">
                  OHMNI Oracle is thinking...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fixed Footer with Input */}
        <ChatInput
          onSendMessage={sendMessage}
          isStreaming={isStreaming}
          disabled={!currentSession && messages.length === 0}
        />
      </div>
    </div>
  );
}
```

---

## File Structure After Phase 6

```
abco-ai-frontend/
├── app/
│   ├── chat/
│   │   └── page.tsx
│   └── ...existing files
├── components/
│   ├── chat/
│   │   ├── ChatSidebar.tsx
│   │   ├── ChatMessage.tsx
│   │   └── ChatInput.tsx
│   └── ...existing folders
├── store/
│   └── chatStore.ts
├── services/
│   └── chatService.ts
└── ...existing files
```

---

## Verification Checklist

After completing Phase 6, you should have:
- [ ] Chat store with Zustand managing state
- [ ] Chat service handling API calls and streaming
- [ ] Sidebar with session management
- [ ] Message display with user/AI differentiation
- [ ] Input area with file upload and voice recording buttons
- [ ] Deep thinking mode toggle
- [ ] Streaming support for AI responses
- [ ] Prompt suggestions when no messages exist
- [ ] Responsive layout with proper scrolling

---

## Dependencies Used in This Phase
- **React:** ^19.1.0 (hooks, components)
- **Next.js:** ^15.3.3 (routing)
- **Zustand:** ^4.5.2 (state management)
- **lucide-react:** ^0.400.0 (icons)
- **next-auth:** ^4.24.7 (session management)
- **TypeScript:** ^5.x

---

## Key Features Implemented
- Real-time chat with streaming responses
- Session management (create, delete, switch)
- Auto-resizing textarea input
- Character count display
- Deep thinking mode toggle
- File upload and voice recording placeholders
- Prompt suggestions for new chats
- Responsive sidebar with sections

---

## Next Phase
Once Phase 6 is complete, proceed to Phase 7: Construction Management Page or Phase 8: File Upload & Voice Recording