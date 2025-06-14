# API Integration Patterns

## TypeScript Types

### Define Strong Types for All API Responses
```typescript
// types/api.ts
import { type ReactNode } from 'react';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  status?: number;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    fullname: string;
    username: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sessionId: string;
  metadata?: Record<string, unknown>;
}

export interface ElectricalTip {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
  source: string;
  createdAt?: Date;
  updatedAt?: Date;
}
```

## Authentication Flow

### 1. Login with Type Safety
```typescript
// pages/api/auth/[...nextauth].ts
import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import type { AuthResponse } from '@/types/api'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      credentials: {
        email: { type: 'email' },
        password: { type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }

        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          })
          
          const data: AuthResponse = await res.json()
          
          if (res.ok && data.access_token) {
            return {
              id: data.user.id,
              email: data.user.email,
              name: data.user.fullname,
              accessToken: data.access_token,
            }
          }
          
          throw new Error(data.message || 'Invalid credentials')
        } catch (error) {
          console.error('Auth error:', error)
          throw new Error('Authentication failed')
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      return session
    }
  }
}

export default NextAuth(authOptions)

## Chat Implementation

### 2. Streaming Chat Messages with Session Validation
```typescript
// hooks/useChat.ts
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useCallback } from 'react'
import type { ChatMessage } from '@/types/api'

export function useStreamingChat(sessionId: string) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const sendMessage = useCallback(async (content: string) => {
    // Validate session before making API call
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    
    if (!session?.accessToken) {
      setError('Authentication required. Please log in again.')
      return
    }
    
    setError(null)
    setIsStreaming(true)
    
    // Add user message immediately
    const userMessage: ChatMessage = { 
      id: Date.now().toString(),
      role: 'user', 
      content, 
      timestamp: new Date(),
      sessionId 
    }
    setMessages(prev => [...prev, userMessage])
    
    try {
      // Start streaming AI response
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/${sessionId}/stream`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: content }),
      })
      
      if (!response.ok) {
        throw new Error(`Chat error: ${response.statusText}`)
      }
      
      // Handle SSE stream
      const reader = response.body?.getReader()
      if (!reader) throw new Error('Stream not available')
      
      const decoder = new TextDecoder()
      let aiMessage: ChatMessage = { 
        id: Date.now().toString(),
        role: 'assistant', 
        content: '', 
        timestamp: new Date(),
        sessionId 
      }
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        aiMessage.content += chunk
        setMessages(prev => [...prev.slice(0, -1), { ...aiMessage }])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
      // Remove the user message on error
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setIsStreaming(false)
    }
  }, [session, status, sessionId, router])
  
  return { messages, sendMessage, isStreaming, error }
}
```

## Knowledge Base Integration

### 3. Searching Electrical Knowledge
```typescript
// services/knowledge.ts
export class KnowledgeService {
  async searchTips(query: string) {
    return apiRequest('/api/knowledge/search', {
      method: 'POST',
      body: JSON.stringify({ query })
    })
  }
  
  async getTipsByCategory(category: string) {
    return apiRequest(`/api/knowledge/categories/${category}`)
  }
  
  async enhancePrompt(userQuestion: string) {
    const tips = await this.searchTips(userQuestion)
    return {
      question: userQuestion,
      context: tips.map(tip => tip.content).join('\n'),
      sources: tips.map(tip => ({ id: tip.id, title: tip.title }))
    }
  }
}
```

## File Upload

### 4. Handling File Uploads with Progress and Error Feedback
```typescript
// components/FileUpload.tsx
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { toast } from '@/components/ui/use-toast'

interface UploadResponse {
  id: string;
  filename: string;
  size: number;
  type: string;
  url?: string;
}

export function FileUpload({ onUploadComplete }: { onUploadComplete: (data: UploadResponse) => void }) {
  const { data: session } = useSession()
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  
  const uploadFile = async (file: File) => {
    if (!session?.accessToken) {
      toast({
        title: "Authentication required",
        description: "Please log in to upload files",
        variant: "destructive"
      })
      return
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image or PDF file",
        variant: "destructive"
      })
      return
    }
    
    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive"
      })
      return
    }
    
    setUploading(true)
    setProgress(0)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const xhr = new XMLHttpRequest()
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100)
          setProgress(percentComplete)
        }
      })
      
      const response = await new Promise<UploadResponse>((resolve, reject) => {
        xhr.open('POST', `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/upload`)
        xhr.setRequestHeader('Authorization', `Bearer ${session.accessToken}`)
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText))
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`))
          }
        }
        
        xhr.onerror = () => reject(new Error('Network error during upload'))
        xhr.send(formData)
      })
      
      toast({
        title: "Upload successful",
        description: `${file.name} uploaded successfully`,
      })
      
      onUploadComplete(response)
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }
  
  return {
    uploadFile,
    uploading,
    progress
  }
}
```

## Error Handling Pattern

### 5. Consistent Error Management
```typescript
// lib/api-error.ts
export class APIError extends Error {
  constructor(
    public status: number,
    public message: string,
    public details?: any
  ) {
    super(message)
  }
}

export async function handleAPIError(response: Response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }))
    throw new APIError(response.status, error.message || response.statusText, error)
  }
  return response
}

// Usage with React Query
export function useNotes() {
  return useQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/notes`, {
        headers: { 'Authorization': `Bearer ${session?.accessToken}` }
      })
      await handleAPIError(response)
      return response.json()
    },
    retry: (failureCount, error) => {
      if (error instanceof APIError && error.status === 401) return false
      return failureCount < 3
    }
  })
}
```

## Offline Support

### 6. Service Worker Setup for Offline Functionality
```typescript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/ohmni-backend\.onrender\.com\/api\/knowledge/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'knowledge-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60 // 1 week
        }
      }
    },
    {
      urlPattern: /^https:\/\/ohmni-backend\.onrender\.com\/api\/chat\/sessions$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'sessions-cache',
        networkTimeoutSeconds: 5
      }
    }
  ]
})

module.exports = withPWA({
  // your Next.js config
})

// hooks/useOfflineQueue.ts
import { useEffect } from 'react'
import { toast } from '@/components/ui/use-toast'

interface QueuedRequest {
  id: string;
  endpoint: string;
  method: string;
  body?: any;
  timestamp: number;
}

export function useOfflineQueue() {
  const queueRequest = (request: Omit<QueuedRequest, 'id' | 'timestamp'>) => {
    const queued: QueuedRequest = {
      ...request,
      id: Date.now().toString(),
      timestamp: Date.now()
    }
    
    const existing = JSON.parse(localStorage.getItem('offlineQueue') || '[]')
    localStorage.setItem('offlineQueue', JSON.stringify([...existing, queued]))
    
    toast({
      title: "Offline mode",
      description: "Your request will be sent when connection is restored",
    })
  }
  
  const processQueue = async () => {
    const queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]')
    if (queue.length === 0) return
    
    const session = await getSession()
    if (!session?.accessToken) return
    
    for (const request of queue) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${request.endpoint}`, {
          method: request.method,
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: request.body ? JSON.stringify(request.body) : undefined
        })
        
        // Remove from queue on success
        const updatedQueue = queue.filter((r: QueuedRequest) => r.id !== request.id)
        localStorage.setItem('offlineQueue', JSON.stringify(updatedQueue))
      } catch (error) {
        console.error('Failed to process queued request:', error)
        break // Stop processing on failure
      }
    }
  }
  
  useEffect(() => {
    const handleOnline = () => {
      toast({
        title: "Back online",
        description: "Syncing offline changes...",
      })
      processQueue()
    }
    
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])
  
  return { queueRequest, isOffline: !navigator.onLine }
}
```

## Remember: All Data Through the API
The frontend should NEVER:
- Connect directly to PostgreSQL
- Connect directly to MongoDB  
- Store database credentials
- Bypass the Flask API

The frontend should ALWAYS:
- Use the Flask API endpoints
- Include JWT authentication
- Handle errors gracefully
- Work offline when possible
- Validate session tokens before API calls
- Provide user-friendly error messages
- Cache appropriately for offline use