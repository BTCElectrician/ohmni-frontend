import { api, streamRequest } from '@/lib/api';
import { ChatSession, ChatMessage } from '@/types/api';
import { getSession } from 'next-auth/react';

export class ChatService {
  // Helper to get auth headers
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const session = await getSession();
    if (session?.accessToken) {
      return { Authorization: `Bearer ${session.accessToken}` };
    }
    return {};
  }

  // Session management
  async getSessions(): Promise<ChatSession[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await api.get<{
        sessions: ChatSession[];
        total: number;
        pages: number;
        current_page: number;
      }>('/api/chat/sessions', { headers });
      
      console.log('Sessions response:', response);
      
      // Extract sessions array from paginated response
      return response.sessions || [];
    } catch (error) {
      console.warn('Chat sessions endpoint error:', error);
      return [];
    }
  }

  async createSession(name?: string): Promise<ChatSession> {
    try {
      const headers = await this.getAuthHeaders();
      console.log('Creating session with headers:', headers);
      
      // Backend expects 'name' parameter, not 'title'
      const response = await api.post<{
        message: string;
        session: ChatSession;
      }>('/api/chat/sessions', { 
        name: name || 'New Chat' 
      }, { headers });
      
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
      const headers = await this.getAuthHeaders();
      return await api.get<ChatSession>(`/api/chat/sessions/${id}`, { headers });
    } catch (error) {
      console.error('Failed to get chat session:', error);
      throw error;
    }
  }

  async deleteSession(id: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      await api.delete<void>(`/api/chat/sessions/${id}`, { headers });
    } catch (error) {
      console.error('Failed to delete chat session:', error);
      throw error;
    }
  }

  async renameSession(id: string, name: string): Promise<ChatSession> {
    try {
      const headers = await this.getAuthHeaders();
      return await api.put<ChatSession>(`/api/chat/sessions/${id}/rename`, { name }, { headers });
    } catch (error) {
      console.error('Failed to rename chat session:', error);
      throw error;
    }
  }

  async bulkDeleteSessions(ids: string[]): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      await api.post<void>('/api/chat/sessions/bulk-delete', { ids }, { headers });
    } catch (error) {
      console.error('Failed to bulk delete sessions:', error);
      throw error;
    }
  }

  // Messages
  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await api.get<{
        messages: ChatMessage[];
        total: number;
        pages: number;
        current_page: number;
      }>(`/api/chat/sessions/${sessionId}/messages`, { headers });
      
      console.log('Messages response:', response);
      
      // Extract messages array from paginated response
      return response.messages || [];
    } catch (error) {
      console.warn('Chat messages endpoint error:', error);
      return [];
    }
  }

  async sendMessage(sessionId: string, message: string): Promise<ChatMessage> {
    try {
      console.log('Sending message to session:', sessionId);
      
      // Validate sessionId
      if (!sessionId || sessionId === 'undefined') {
        throw new Error('Invalid session ID');
      }
      
      const headers = await this.getAuthHeaders();
      console.log('Auth headers:', headers);
      
      // Backend expects 'content' field, not 'message'
      // Use the correct endpoint path without 'sessions'
      const response = await api.post<{
        user_message: ChatMessage;
        ai_message: ChatMessage;
      }>(`/api/chat/${sessionId}/messages`, { 
        content: message  // Changed from 'message' to 'content'
      }, { headers });
      
      console.log('Message sent successfully:', response);
      
      // Return the AI message since that's what we want to display
      return response.ai_message;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  // Streaming chat
  async streamMessage(
    sessionId: string, 
    message: string,
    token: string | null,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      const response = await streamRequest(`/api/chat/${sessionId}/stream`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: JSON.stringify({ message }),
      });

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