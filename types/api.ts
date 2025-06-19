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
  details?: any;
} 