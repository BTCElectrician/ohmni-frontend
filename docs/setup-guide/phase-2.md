# Phase 2: Environment Setup & Core Dependencies

## Overview
This phase sets up environment variables, TypeScript type definitions, and the API client for communicating with the backend.

---

## Step 2.1: Create Environment Variables

Create a `.env.local` file in your project root:

```env
# Backend API
NEXT_PUBLIC_BACKEND_URL=https://ohmni-backend.onrender.com

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-generate-with-openssl-rand-base64-32

# Company Theme Colors
NEXT_PUBLIC_COMPANY_PRIMARY_COLOR=#e67e22
NEXT_PUBLIC_COMPANY_SECONDARY_COLOR=#34495e
```

**Note:** Generate a secure NEXTAUTH_SECRET with: `openssl rand -base64 32`

---

## Step 2.2: Create TypeScript Type Definitions

Create `types/api.ts`:

```typescript
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

// Chat Types
export interface ChatSession {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  messages_count: number;
  is_starred?: boolean;
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
```

---

## Step 2.3: Setup API Client

Create `lib/api.ts`:

```typescript
import { getSession } from 'next-auth/react';

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export class APIError extends Error {
  constructor(
    public status: number,
    public message: string,
    public details?: any
  ) {
    super(message);
  }
}

export async function apiRequest<T = any>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const session = await getSession();
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  // Add Authorization header if we have a token
  if (session?.accessToken) {
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${session.accessToken}`
    };
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new APIError(
        response.status, 
        error.message || response.statusText, 
        error
      );
    }
    
    // Handle empty responses
    const text = await response.text();
    return text ? JSON.parse(text) : {} as T;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(500, 'Network error', error);
  }
}

// Convenience methods
export const api = {
  get: <T = any>(endpoint: string, options?: RequestInit) => 
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),
  
  post: <T = any>(endpoint: string, data?: any, options?: RequestInit) => 
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),
  
  put: <T = any>(endpoint: string, data?: any, options?: RequestInit) => 
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),
  
  delete: <T = any>(endpoint: string, options?: RequestInit) => 
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};
```

---

## File Structure After Phase 2

```
abco-ai-frontend/
├── .env.local
├── types/
│   └── api.ts
├── lib/
│   └── api.ts
├── app/
├── public/
└── package.json
```

---

## Verification Checklist

After completing Phase 2, you should have:
- [ ] Created `.env.local` with backend URL and auth secrets
- [ ] Created `types/api.ts` with all TypeScript interfaces
- [ ] Created `lib/api.ts` with API client setup
- [ ] API client handles authentication tokens
- [ ] Error handling is properly typed
- [ ] All using TypeScript ^5.x strict typing (no 'any' unless necessary)

---

## Dependencies Used in This Phase
- **next-auth:** For session management (already installed in Phase 1)
- **TypeScript:** ^5.x for type definitions

---

## Next Phase
Once Phase 2 is complete, proceed to Phase 3: Design System & Theme Configuration