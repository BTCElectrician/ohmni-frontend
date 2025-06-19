import { api } from '@/lib/api';
import { ChatSession, ChatMessage } from '@/types/api';
import { getSession } from 'next-auth/react';

export class ChatService {
  // Session management
  async getSessions(): Promise<ChatSession[]> {
    try {
      return await api.get('/api/chat/sessions');
    } catch (error) {
      console.warn('Chat sessions endpoint error:', error);
      return [];
    }
  }

  async createSession(name?: string): Promise<ChatSession> {
    try {
      // Verify we have auth before making the request
      const session = await getSession();
      if (!(session as any)?.accessToken) {
        throw new Error('Authentication required. Please log in.');
      }
      
      // Backend expects 'name' parameter, not 'title'
      const response = await api.post('/api/chat/sessions', { 
        name: name || 'New Chat' 
      });
      
      return response;
    } catch (error) {
      console.error('Failed to create chat session:', error);
      
      // For auth errors, rethrow so calling code can handle
      if (error instanceof Error && error.message.includes('Authentication required')) {
        throw error;
      }
      
      // For other errors, return a mock session for graceful degradation
      // Use proper field names that match our updated interface
      return {
        id: Date.now().toString(), // Convert to string to match backend expectation
        name: name || 'New Chat',
        timestamp: new Date().toISOString(), // Use 'timestamp' not 'created_at'
        message_count: 0 // Use 'message_count' not 'messages_count'
      };
    }
  }

  async getSession(id: string): Promise<ChatSession> {
    try {
      return await api.get(`/api/chat/sessions/${id}`);
    } catch (error) {
      console.error('Failed to get chat session:', error);
      throw error;
    }
  }

  async deleteSession(id: string): Promise<void> {
    try {
      await api.delete(`/api/chat/sessions/${id}`);
    } catch (error) {
      console.error('Failed to delete chat session:', error);
      throw error;
    }
  }

  async renameSession(id: string, name: string): Promise<ChatSession> {
    try {
      return await api.put(`/api/chat/sessions/${id}/rename`, { name });
    } catch (error) {
      console.error('Failed to rename chat session:', error);
      throw error;
    }
  }

  async bulkDeleteSessions(ids: string[]): Promise<void> {
    try {
      await api.post('/api/chat/sessions/bulk-delete', { ids });
    } catch (error) {
      console.error('Failed to bulk delete sessions:', error);
      throw error;
    }
  }

  // Messages
  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
      return await api.get(`/api/chat/sessions/${sessionId}/messages`);
    } catch (error) {
      console.warn('Chat messages endpoint error:', error);
      return [];
    }
  }

  async sendMessage(sessionId: string, message: string): Promise<ChatMessage> {
    try {
      // Use the correct endpoint format that the backend expects
      return await api.post(`/api/chat/${sessionId}/messages`, { 
        message 
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
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
      const session = await getSession();
      const response = await fetch(
        process.env.NODE_ENV === 'development'
    ? `/backend/api/chat/${sessionId}/stream`
    : `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/${sessionId}/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...((session as any)?.accessToken && {
              'Authorization': `Bearer ${(session as any).accessToken}`
            })
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
      console.error('Streaming error:', error);
      onError(error as Error);
    }
  }
}

export const chatService = new ChatService(); 