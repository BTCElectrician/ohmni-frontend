'use client';

import { signOut } from 'next-auth/react';
import { getAccessToken } from './auth/getAccessToken';

// Always use the full backend URL
const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://ohmni-backend.onrender.com';
console.log('API BASE_URL configured as:', BASE_URL);

export class APIError extends Error {
  constructor(
    public status: number,
    public message: string,
    public details?: unknown
  ) {
    super(message);
  }
}



export async function apiRequest<T = unknown>(
  endpoint: string, 
  options: RequestInit = {},
  skipAuth = false  // Escape hatch for gradual migration
): Promise<T> {
  // Get auth token unless explicitly skipped
  const token = skipAuth ? null : await getAccessToken();
  
  // Build headers with auth token if available
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const url = `${BASE_URL}${endpoint}`;
  console.log('API Request URL:', url);
  console.log('API Request Options:', { ...options, headers });
  
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: token ? 'omit' : 'include', // Use bearer OR cookies, not both
    mode: 'cors',
  });
  
  // EXPERT TWEAK: 401 interceptor for auto-logout
  if (response.status === 401 && !skipAuth) {
    await signOut({ redirect: true, callbackUrl: '/login' });
    throw new Error('Authentication required');
  }
  
  if (!response.ok) {
    console.error('API Error Response:', {
      status: response.status,
      statusText: response.statusText,
      url: url
    });
    
    // For 500 errors, try to get the error details
    if (response.status === 500) {
      try {
        const errorText = await response.text();
        console.error('Backend 500 Error Details:', errorText);
      } catch {
        console.error('Could not read error response body');
      }
    }
    
    await handleAPIError(response);
  }
  
  // Handle empty responses
  const text = await response.text();
  if (!text) {
    return {} as T;
  }
  
  const result = JSON.parse(text);
  console.log('API Response:', result);
  
  // Auto-unwrap standardized responses
  // If response has 'success' field, it's using the new format
  if (result && typeof result === 'object' && 'success' in result) {
    if (result.success === false) {
      throw new APIError(
        response.status,
        result.error || 'Request failed',
        result
      );
    }
    // Return the data field if it exists, otherwise return the whole result
    return (result.data !== undefined ? result.data : result) as T;
  }
  
  // For legacy responses without 'success' field, return as-is
  return result as T;
}

// Updated convenience methods to support skipAuth parameter
export const api = {
  get: <T = unknown>(endpoint: string, options?: RequestInit & { skipAuth?: boolean }) => {
    const { skipAuth, ...restOptions } = options || {};
    return apiRequest<T>(endpoint, { ...restOptions, method: 'GET' }, skipAuth);
  },
  
  post: <T = unknown>(endpoint: string, data?: unknown, options?: RequestInit & { skipAuth?: boolean }) => {
    const { skipAuth, ...restOptions } = options || {};
    return apiRequest<T>(endpoint, {
      ...restOptions,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }, skipAuth);
  },
  
  put: <T = unknown>(endpoint: string, data?: unknown, options?: RequestInit & { skipAuth?: boolean }) => {
    const { skipAuth, ...restOptions } = options || {};
    return apiRequest<T>(endpoint, {
      ...restOptions,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }, skipAuth);
  },
  
  delete: <T = unknown>(endpoint: string, options?: RequestInit & { skipAuth?: boolean }) => {
    const { skipAuth, ...restOptions } = options || {};
    return apiRequest<T>(endpoint, { ...restOptions, method: 'DELETE' }, skipAuth);
  },
}; 

// Add streaming support for SSE endpoints
export async function streamRequest(
  endpoint: string,
  options: RequestInit = {},
  skipAuth = false
): Promise<Response> {
  // Get auth token unless explicitly skipped
  const token = skipAuth ? null : await getAccessToken();
  
  // Build headers with auth token if available
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  
  // Add SSE header for streaming endpoints
  if (endpoint.includes('/stream') || endpoint.includes('/search-code')) {
    headers['Accept'] = 'text/event-stream';
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: token ? 'omit' : 'include',
    mode: 'cors',
  });
  
  // Handle 401 for streaming requests
  if (response.status === 401 && !skipAuth) {
    await signOut({ redirect: true, callbackUrl: '/login' });
    throw new Error('Authentication required');
  }
  
  return response;
}

// Add error handling utility
export async function handleAPIError(response: Response): Promise<never> {
  const contentType = response.headers.get('content-type');
  let error: { message?: string } = { message: 'Unknown error' };
  
  if (contentType && contentType.includes('application/json')) {
    try {
      error = await response.json();
    } catch {
      // Failed to parse JSON error
    }
  }
  
  throw new APIError(
    response.status,
    error.message || response.statusText,
    error
  );
} 