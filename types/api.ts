// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Authentication Types
export interface User {
  id: string;
  email: string;
  fullname: string;
  username: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
  message?: string;
}

// Chat Types - Fixed to match backend ChatSession model
export interface ChatSession {
  id: string;
  name: string;
  timestamp: string;  // Backend uses 'timestamp' not 'created_at'
  last_message?: string;
  message_count: number; // Backend uses 'message_count' not 'messages_count'
  user_id?: string;
  project_id?: string;
  is_active?: boolean;
  // Removed updated_at - backend doesn't have this field
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sessionId: string;
  metadata?: {
    deep_reasoning?: boolean;
    nuclear_mode?: boolean;           // RENAMED from nuclear_reasoning
    model_used?: string;
    reasoning_remaining?: number;
    nuclear_remaining?: number;
  };
}

// File Upload Types
export interface UploadedFile {
  id: string;
  filename: string;
  size: number;
  type: string;
  url?: string;
  uploaded_at: string;
}

// Knowledge Base Types
export interface ElectricalTip {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
  source: string;
}

// Flask Authentication Response Types
export interface FlaskLoginResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    fullname?: string;
    username?: string;
  };
  message?: string;
  error?: string;
}

export interface FlaskRegisterResponse {
  message: string;
  user?: {
    id: string;
    email: string;
  };
}

// Flask Error Response
export interface FlaskErrorResponse {
  error: string;
  message?: string;
  details?: Record<string, unknown>;
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