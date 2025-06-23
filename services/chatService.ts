import { api, streamRequest, APIError } from '@/lib/api';
import { ChatSession, ChatMessage } from '@/types/api';

export class ChatService {
  // Sessions
  async getSessions(): Promise<ChatSession[]> {
    try {
      const response = await api.get<{
        sessions: ChatSession[];
        total: number;
        pages: number;
        current_page: number;
      }>('/api/chat/sessions'); // Removed skipAuth - using centralized auth
      
      console.log('Sessions response:', response);
      
      // Backend returns paginated response with sessions array
      return response.sessions || [];
    } catch (error) {
      console.error('Failed to get chat sessions:', error);
      return [];
    }
  }

  async createSession(name?: string): Promise<ChatSession> {
    try {
      console.log('Creating session with centralized auth');
      
      // Backend expects 'name' parameter, not 'title'
      const response = await api.post<{
        message: string;
        session: ChatSession;
      }>('/api/chat/sessions', { 
        name: name || 'New Chat' 
      }); // Removed skipAuth - using centralized auth
      
      console.log('Created session response:', response);
      
      // Extract the session from the wrapped response
      const session = response.session;
      
      // Verify the session has an id
      if (!session || !session.id) {
        console.error('Session response missing id:', response);
        throw new Error('Invalid session response - missing session or id');
      }
      
      return session;
    } catch (error) {
      console.error('Failed to create chat session:', error);
      
      // For auth errors, rethrow so calling code can handle
      if (error instanceof Error && error.message.includes('Authentication required')) {
        throw error;
      }
      
      // Don't return a mock session - let the error bubble up
      throw error;
    }
  }

  async getSession(id: string): Promise<ChatSession> {
    try {
      return await api.get<ChatSession>(`/api/chat/sessions/${id}`); // Removed skipAuth
    } catch (error) {
      console.error('Failed to get chat session:', error);
      throw error;
    }
  }

  async deleteSession(id: string): Promise<void> {
    try {
      const response = await api.delete<{
        message: string;
      }>(`/api/chat/sessions/${id}`); // Removed skipAuth
      
      console.log('Delete session response:', response);
      
      // The backend should return a success message
      if (response && response.message) {
        console.log('Session deleted:', response.message);
      }
    } catch (error) {
      console.error('Failed to delete chat session:', error);
      throw error;
    }
  }

  async updateSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession> {
    try {
      return await api.put<ChatSession>(`/api/chat/sessions/${id}`, updates); // Removed skipAuth
    } catch (error) {
      console.error('Failed to update chat session:', error);
      throw error;
    }
  }

  // Messages
  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
      const response = await api.get<{
        messages: ChatMessage[];
        total: number;
        pages: number;
        current_page: number;
      }>(`/api/chat/sessions/${sessionId}/messages`); // Removed skipAuth
      
      console.log('Messages response:', response);
      
      // Extract messages array from paginated response
      return response.messages || [];
    } catch (error) {
      console.warn('Chat messages endpoint error:', error);
      return [];
    }
  }

  async sendMessage(sessionId: string, content: string, onChunk?: (text: string) => void): Promise<ChatMessage> {
    try {
      console.log('Sending message with centralized auth');
      
      const response = await streamRequest(
        `/api/chat/sessions/${sessionId}/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content }),
        }
        // Removed skipAuth - using centralized auth
      );

      if (!response.ok) {
        throw new APIError(response.status, response.statusText);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let messageBuffer = '';
      let lastMessage: ChatMessage | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'content') {
                messageBuffer += data.content;
                onChunk?.(data.content);
              } else if (data.type === 'message') {
                lastMessage = data.message;
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (e) {
              // Silently handle Flask backend context errors during auto-naming
              // These don't affect the core chat functionality
              if (e instanceof Error && e.message.includes('application context')) {
                console.warn('Backend context error (auto-naming may be affected):', e.message);
              } else {
                console.error('Failed to parse SSE data:', e);
              }
            }
          }
        }
      }

      // Return the complete message or construct one from the buffer
      return lastMessage || {
        id: 'temp-' + Date.now(),
        sessionId: sessionId,
        role: 'assistant',
        content: messageBuffer,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }
}

export const chatService = new ChatService(); 