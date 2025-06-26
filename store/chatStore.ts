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