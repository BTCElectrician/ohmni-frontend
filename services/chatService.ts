import { api, streamRequest, APIError } from '@/lib/api';
import { ChatSession, ChatMessage, SSEEventType } from '@/types/api';
import { visionService } from './visionService';
import { sanitizeQuery } from '@/lib/sanitizeQuery';

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

  private async streamVisionResponse(
    sessionId: string, 
    content: string, 
    onChunk?: (text: string) => void,
    useDeepReasoning: boolean = false,
    useNuclear: boolean = false
  ): Promise<ChatMessage> {
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let retryCount = 0;
    const maxRetries = 2;
    const retryDelay = 1000; // Start with 1 second
    
    // Sanitize the content before sending to backend
    const cleanContent = sanitizeQuery(content);
    
    // Debug logging (remove after testing)
    if (content !== cleanContent) {
      console.warn('Message content contained invalid characters and was cleaned');
      console.log('Original content length:', content.length);
      console.log('Clean content length:', cleanContent.length);
    }
    
    while (retryCount <= maxRetries) {
      try {
        // Enforce mutual exclusivity
        if (useDeepReasoning && useNuclear) {
          console.warn('Cannot use Brain and Nuclear together - prioritizing Nuclear');
          useDeepReasoning = false;
        }
        
        console.log('Sending message - Deep:', useDeepReasoning, 'Nuclear:', useNuclear);
        if (retryCount > 0) {
          console.log(`Retry attempt ${retryCount} of ${maxRetries}`);
        }
        
        // Build request body
        const body: {
          content: string;
          deep_reasoning?: boolean;
          preferred_model?: string;
        } = { content: cleanContent };
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
          // Try to get error message from response body
          let errorMessage = response.statusText;
          try {
            // Clone the response so we can read it as text
            const clonedResponse = response.clone();
            const errorText = await clonedResponse.text();
            
            // Try to parse as JSON
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.error || errorData.message || response.statusText;
            } catch {
              // If not JSON, use the text directly if it's not empty
              if (errorText.trim()) {
                errorMessage = errorText;
              }
            }
          } catch {
            // If all parsing fails, use status text
          }
          console.error('Stream request failed:', response.status, errorMessage);
          throw new APIError(response.status, errorMessage);
        }

        reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let messageBuffer = '';
        let lastMessage: ChatMessage | null = null;
        let configData: {
          deep_reasoning?: boolean;
          model?: string;
          remaining_deep_reasoning?: number;
          remaining_nuclear?: number;
        } | null = null;
        
        // Add buffer for incomplete JSON data
        let buffer = '';

        while (true) {
          try {
            const { done, value } = await reader.read();
            if (done) break;

            // Accumulate data in buffer
            buffer += decoder.decode(value, { stream: true });

            // Process complete JSON frames only
            let split;
            while ((split = buffer.indexOf('\n\n')) !== -1) {
              const frame = buffer.slice(0, split);  // Extract full JSON frame
              buffer = buffer.slice(split + 2);      // Keep remaining data in buffer

              // Process each line in the complete frame
              frame.split('\n').forEach(line => {
                if (line.startsWith('data: ')) {
                  try {
                    const data: SSEEventType = JSON.parse(line.slice(6));
                    
                    switch (data.type) {
                      case 'config':
                        // Store configuration data - use parsed JSON object directly
                        const parsedData = JSON.parse(line.slice(6));
                        configData = {
                          deep_reasoning: parsedData.deep_reasoning,
                          model: parsedData.model,
                          remaining_deep_reasoning: parsedData.remaining_deep_reasoning,
                          remaining_nuclear: parsedData.remaining_nuclear
                        };
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
                      case 'vision_start':
                        // Show "Analyzing image..." indicator to user
                        // Maybe update UI state to show loading spinner
                        console.log('Vision analysis started');
                        break;
                      case 'vision_result':
                        // Display the vision analysis result
                        // This contains the text extracted from the image
                        console.log('Vision analysis:', data.content);
                        // Update UI to show the analysis
                        if (data.content) {
                          messageBuffer += data.content;
                          onChunk?.(data.content);
                        }
                        break;
                      case 'complete':
                        // Stream is finished, clean up any loading states
                        // Maybe close the stream or update UI
                        console.log('Stream completed');
                        break;
                    }
                  } catch (e) {
                    if (e instanceof Error && e.message.includes('application context')) {
                      console.warn('Backend context error (auto-naming may be affected):', e.message);
                    } else {
                      console.error('Failed to parse SSE data:', e);
                    }
                  }
                }
              });
            }
          } catch (readError) {
            // Handle read errors (connection issues)
            console.error('Stream read error:', readError);
            throw readError;
          }
        }

        // If we got here, the stream completed successfully
        // Return the complete message with metadata
        return lastMessage || {
          id: 'temp-' + Date.now(),
          sessionId: sessionId,
          role: 'assistant',
          content: messageBuffer,
          timestamp: new Date(),
          metadata: configData ? {
            deep_reasoning: (configData as {deep_reasoning?: boolean})?.deep_reasoning || false,
            nuclear_mode: (configData as {model?: string})?.model === 'o3',  // Renamed from nuclear_reasoning
            model_used: (configData as {model?: string})?.model,
            reasoning_remaining: (configData as {remaining_deep_reasoning?: number})?.remaining_deep_reasoning,
            nuclear_remaining: (configData as {remaining_nuclear?: number})?.remaining_nuclear
          } : undefined
        };
      } catch (error) {
        console.error('Streaming error:', error);
        
        // Always release the reader lock on error
        if (reader) {
          try {
            reader.releaseLock();
          } catch (e) {
            console.warn('Failed to release reader lock:', e);
          }
          reader = undefined;
        }
        
        // Check if we should retry - now using backend's standardized error codes
        const isConnectionError = error instanceof Error && (
          error.message.includes('network_error') ||
          error.message.includes('peer closed connection') ||
          error.message.includes('RemoteProtocolError') ||
          error.message.includes('incomplete chunked read') ||
          error.message.includes('network')
        );
        
        // Don't retry rate limit errors - backend handles those
        const isRateLimitError = error instanceof Error && 
          error.message.includes('rate_limit');
        
        if (isConnectionError && !isRateLimitError && retryCount < maxRetries) {
          retryCount++;
          const delay = retryDelay * Math.pow(2, retryCount - 1); // Exponential backoff
          console.log(`Connection error, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue; // Retry the request
        }
        
        // If not retryable or max retries reached, throw a user-friendly error
        if (isConnectionError) {
          throw new Error(
            useDeepReasoning 
              ? 'Connection lost while using Deep Reasoning model. This can happen with complex queries. Please try again.'
              : useNuclear
              ? 'Connection lost while using Nuclear model. Please try again.'
              : 'Connection lost during AI response. Please try again.'
          );
        }
        
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
    
    // This should never be reached, but TypeScript needs a return
    throw new Error('Maximum retry attempts exceeded');
  }

  async sendMessage(
    sessionId: string, 
    content: string, 
    onChunk?: (text: string) => void,
    useDeepReasoning: boolean = false,
    useNuclear: boolean = false
  ): Promise<ChatMessage> {
    // Simply delegate to the private streaming method
    return this.streamVisionResponse(sessionId, content, onChunk, useDeepReasoning, useNuclear);
  }

  async searchCode(
    sessionId: string,
    query: string,
    onChunk?: (text: string) => void
  ): Promise<ChatMessage> {
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    
    try {
      // Sanitize the query before sending to backend
      const cleanQuery = sanitizeQuery(query);
      
      // Debug logging (remove after testing)
      if (query !== cleanQuery) {
        console.warn('Query contained invalid characters and was cleaned');
        console.log('Original query length:', query.length);
        console.log('Clean query length:', cleanQuery.length);
      }
      
      console.log('Searching NEC code:', cleanQuery);
      
      const response = await streamRequest(
        `/api/chat/sessions/${sessionId}/search-code`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: cleanQuery }),
        }
      );

      if (!response.ok) {
        let errorMessage = response.statusText;
        try {
          const errorText = await response.text();
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || response.statusText;
        } catch {
          // Use status text if parsing fails
        }
        
        // Special handling for 404 (endpoint not implemented yet)
        if (response.status === 404) {
          throw new Error('NEC code search is not yet implemented on the backend. Please try again later.');
        }
        
        throw new APIError(response.status, errorMessage);
      }

      reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let messageBuffer = '';
      
      // Add buffer for incomplete JSON data
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Accumulate data in buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete JSON frames only
        let split;
        while ((split = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, split);  // Extract full JSON frame
          buffer = buffer.slice(split + 2);      // Keep remaining data in buffer

          // Process each line in the complete frame
          frame.split('\n').forEach(line => {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6).trim();
                // Skip empty lines
                if (!jsonStr) return;
                
                const data = JSON.parse(jsonStr);
                
                switch (data.type) {
                  case 'content':
                    messageBuffer += data.content;
                    onChunk?.(data.content);
                    break;
                  case 'complete':
                    console.log('Code search completed');
                    break;
                  case 'error':
                    throw new Error(data.error);
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e, 'Line:', line);
                // Continue processing other lines instead of breaking
              }
            }
          });
        }
      }

      // Return the complete message
      return {
        id: 'temp-' + Date.now(),
        sessionId: sessionId,
        role: 'assistant',
        content: messageBuffer,
        timestamp: new Date(),
        metadata: {
          code_search: true
        }
      };
    } catch (error) {
      console.error('Code search error:', error);
      throw error;
    } finally {
      if (reader) {
        try {
          reader.releaseLock();
        } catch (e) {
          console.warn('Failed to release reader lock:', e);
        }
      }
    }
  }

  async sendMessageWithFile(
    sessionId: string,
    content: string,
    file: File
  ): Promise<ChatMessage> {
    // Sanitize the content before sending to backend
    const cleanContent = sanitizeQuery(content);
    
    // Debug logging (remove after testing)
    if (content !== cleanContent) {
      console.warn('File message content contained invalid characters and was cleaned');
      console.log('Original content length:', content.length);
      console.log('Clean content length:', cleanContent.length);
    }
    
    // Upload the file
    const uploadResponse = await visionService.uploadToChat(
      sessionId,
      file,
      cleanContent
    );
    
    // Create user message with attachment info
    // Note: Backend doesn't return user_message_id, so we generate one
    const userMessage: ChatMessage = {
      id: uploadResponse.file_info?.file_id || `temp-${Date.now()}`,
      sessionId: sessionId,
      role: 'user',
      content: cleanContent || 'Please analyze this image',
      timestamp: new Date(),
      attachments: [{
        type: 'image',
        url: URL.createObjectURL(file), // Create local preview since backend doesn't provide one
        filename: uploadResponse.file_info?.filename || file.name,
        size: uploadResponse.file_info?.file_size || file.size
      }]
    };
    
    return userMessage;
  }
  
  // New method specifically for triggering vision streaming after upload
  async streamVisionAnalysis(
    sessionId: string,
    content: string,
    onChunk?: (text: string) => void,
    useDeepReasoning: boolean = false,
    useNuclear: boolean = false
  ): Promise<ChatMessage> {
    // Call the streaming endpoint which should pick up the pending image
    return this.streamVisionResponse(
      sessionId,
      content || 'Please analyze this image',
      onChunk,
      useDeepReasoning,
      useNuclear
    );
  }
}

export const chatService = new ChatService(); 