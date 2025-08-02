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

export interface AuthPayload {
  access_token: string;
  user: User;
  message?: string;
}

// Convenient aliases for wrapped auth responses
export type AuthApiResponse = ApiResponse<AuthPayload>;
export type RegisterApiResponse = ApiResponse<{ user: User }>;

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

// Vision Analysis Types
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
    code_search?: boolean;
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

// File Upload Types
export interface UploadedFile {
  id: string;
  filename: string;
  size: number;
  type: string;
  url?: string;
  uploaded_at: string;
}

// Add file upload response type - matches actual backend response
export interface UploadResponse {
  message: string;
  file: {
    id: string;
    file_path: string;
    extracted_text?: string;
    analysis_metadata?: {
      ai_analysis?: {
        analysis: string;
        model_used: string;
        success: boolean;
      };
      analyzed_at?: string;
    };
    azure_search_indexed?: boolean;
    created_at?: string;
  };
  file_info: {
    file_id: string;
    filename: string;
    file_size: number;
    file_type: string;
    mime_type: string;
  };
  // Note: Backend doesn't return user_message_id or preview_url
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
    }
  | { type: 'vision_start'; message: string }
  | { type: 'vision_result'; content: string }
  | { type: 'complete'; message?: string };

// Add a specific type for config events to avoid type issues
export interface ConfigEvent {
  type: 'config';
  deep_reasoning?: boolean;
  model?: string;
  remaining_deep_reasoning?: number;
  remaining_nuclear?: number;
}

// Add type for offline queue
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

// Add new type for enhanced responses
export interface ChatResponseMetadata {
  deep_reasoning?: boolean;
  preferred_model?: string;
  remaining_deep_reasoning?: number;
  remaining_nuclear?: number;
} 