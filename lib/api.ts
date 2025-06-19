'use client';

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
  const url = `${BASE_URL}${endpoint}`;
  console.log('API Request URL:', url);
  console.log('API Request Options:', options);
  
  const response = await fetch(url, applyDefaults(options));
  
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
      } catch (e) {
        console.error('Could not read error response body');
      }
    }
    
    await handleAPIError(response);
  }
  
  // Handle empty responses
  const text = await response.text();
  const result = text ? JSON.parse(text) : {} as T;
  console.log('API Response:', result);
  return result;
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