import { api } from '@/lib/api';
import { ChatSession, ChatMessage } from '@/types/api';

export class ChatService {
  // Session management
  async getSessions(): Promise<ChatSession[]> {
    try {
      return await api.get('/api/chat/sessions');
    } catch (error) {
      console.warn('Chat sessions endpoint not implemented yet:', error);
      return [];
    }
  }

  async createSession(name?: string): Promise<ChatSession> {
    try {
      // Verify we have auth before making the request
      // Use dynamic import to avoid client-only module in server builds
      const { getSession } = await import('next-auth/react');
      const session = await getSession();
      if (!(session as any)?.accessToken) {
        throw new Error('Authentication required. Please log in.');
      }
      
      return await api.post('/api/chat/sessions', { name });
    } catch (error) {
      console.error('Failed to create chat session:', error);
      // For now, still return a mock session for graceful degradation
      // but rethrow the error so calling code can handle auth failures
      if (error instanceof Error && error.message.includes('Authentication required')) {
        throw error;
      }
      // Return a mock session for other errors (backend not available, etc.)
      return {
        id: Date.now().toString(),
        name: name || 'New Chat',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        messages_count: 0
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
      console.warn('Chat messages endpoint not implemented yet:', error);
      return [];
    }
  }

  async sendMessage(sessionId: string, message: string): Promise<ChatMessage> {
    try {
      return await api.post('/api/chat/message', { 
        session_id: sessionId, 
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
      // Use dynamic import to avoid client-only module in server builds
      const { getSession } = await import('next-auth/react');
      const session = await getSession();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/${sessionId}/stream`,
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