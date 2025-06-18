import type { ApiResponse } from '../types/api';

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

// Helper to detect we're in the browser
const isBrowser = () => typeof window !== "undefined";

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
  let accessToken: string | undefined;

  // Get the session with JWT token - environment-aware
  if (isBrowser()) {
    // Client side - use getSession from next-auth/react
    const { getSession } = await import("next-auth/react");
    const session = await getSession();
    accessToken = (session as any)?.accessToken;
  } else {
    // Server side - use auth() from the root auth file
    const { auth } = await import("@/auth");
    const session = await auth();
    accessToken = (session as any)?.accessToken;
  }
  
  const config: RequestInit = {
    ...options,
    credentials: 'include',  // Important for cookies
    mode: 'cors',           // Explicit CORS mode
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  // Add Authorization header if we have a token
  if (accessToken) {
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${accessToken}`
    };
  } else {
    console.warn('No access token available for request:', endpoint);
  }

  try {
    const url = `${BASE_URL}${endpoint}`;
    console.log('Making request to:', url);
    
    const response = await fetch(url, config);
    
    if (!response.ok) {
      // Handle both JSON and text error responses
      const text = await response.text();
      const error = text.startsWith('{') 
        ? JSON.parse(text) 
        : { message: text };
      
      console.error('API Error:', response.status, error);
      
      throw new APIError(
        response.status, 
        error.message || response.statusText, 
        error
      );
    }
    
    // Handle empty responses (204 No Content or non-JSON)
    if (response.status === 204 || 
        !response.headers.get("content-type")?.includes("application/json")) {
      return null as T;
    }
    
    return response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    console.error('Network error:', error);
    throw new APIError(500, 'Network error', error);
  }
}

// Convenience methods with proper typing
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