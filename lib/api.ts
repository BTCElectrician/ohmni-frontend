'use client';

// Use proxy in development to avoid CORS issues
const BASE_URL = process.env.NODE_ENV === 'development' 
  ? '/backend'  // This will be proxied to the backend
  : process.env.NEXT_PUBLIC_BACKEND_URL;

export class APIError extends Error {
  constructor(
    public status: number,
    public message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

function applyDefaults(options: RequestInit = {}): RequestInit {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  // Auto JSON content-type (non-GET only)
  if (options.method !== 'GET' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const hasBearer = Boolean(headers['Authorization']);

  return {
    ...options,
    credentials: hasBearer ? 'omit' : 'include', // cookie OR bearer, never both
    mode: 'cors',
    headers,
  };
}

export async function apiRequest<T = unknown>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, applyDefaults(options));
  
  if (!response.ok) {
    await handleAPIError(response);
  }
  
  // Handle empty responses
  const text = await response.text();
  return text ? JSON.parse(text) : {} as T;
}

// Convenience methods with proper typing
export const api = {
  get: <T = unknown>(endpoint: string, options?: RequestInit) => 
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),
  
  post: <T = unknown>(endpoint: string, data?: unknown, options?: RequestInit) => 
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),
  
  put: <T = unknown>(endpoint: string, data?: unknown, options?: RequestInit) => 
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),
  
  delete: <T = unknown>(endpoint: string, options?: RequestInit) => 
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
}; 

// Add streaming support for SSE endpoints
export async function streamRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  // Add SSE header for streaming endpoints
  if (endpoint.includes('/stream')) {
    options.headers = { 
      ...options.headers, 
      Accept: 'text/event-stream' 
    };
  }
  
  return fetch(`${BASE_URL}${endpoint}`, applyDefaults(options));
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