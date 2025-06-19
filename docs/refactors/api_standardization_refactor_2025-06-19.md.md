# API Standardization & CORS Fix Implementation Guide
**Date:** June 19, 2025  
**Filename:** `API_STANDARDIZATION_REFACTOR_2025-06-19.md`

## 🎯 Overview
This guide standardizes all API calls through `lib/api.ts` to fix CORS errors and authentication failures. Follow each step exactly to avoid breaking existing functionality.

---

## 📁 Step 1: Enhance lib/api.ts with Streaming Support

**File:** `/lib/api.ts`  
**Action:** ADD the following function AFTER the existing `api` object (around line 65)

```typescript
// Add this AFTER the existing api object, before the closing of the file
export async function streamRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  try {
    const session = await getSession();
    
    // Build headers with proper merging
    const headers: HeadersInit = {
      ...options.headers,
    };
    
    // Only add Content-Type for non-GET requests and if not already set
    if (options.method !== 'GET' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    
    // Add SSE header for streaming endpoints
    if (endpoint.includes('/stream')) {
      headers['Accept'] = 'text/event-stream';
    }
    
    // Add authorization if available
    if ((session as any)?.accessToken) {
      headers['Authorization'] = `Bearer ${(session as any).accessToken}`;
    }
    
    const config: RequestInit = {
      ...options,
      credentials: 'include',
      mode: 'cors',
      headers,
    };

    const url = `${BASE_URL}${endpoint}`;
    return fetch(url, config);
  } catch (error) {
    console.error('Failed to get session for stream request:', error);
    // Continue without auth if session fails
    const url = `${BASE_URL}${endpoint}`;
    return fetch(url, {
      ...options,
      credentials: 'include',
      mode: 'cors',
    });
  }
}
```

**Also ADD** this small improvement to the existing `apiRequest` function (around line 25):

```typescript
// In apiRequest function, REPLACE the headers construction with:
const headers: HeadersInit = {
  ...options.headers,
};

// Only add Content-Type for non-GET requests
if (options.method !== 'GET' && !headers['Content-Type']) {
  headers['Content-Type'] = 'application/json';
}

const config: RequestInit = {
  ...options,
  headers: {
    ...headers,
    ...((session as any)?.accessToken && {
      'Authorization': `Bearer ${(session as any).accessToken}`
    })
  },
};
```

---

## 📁 Step 2: Fix Authentication Service

**File:** `/app/lib/auth.ts`  
**Action:** REPLACE the authorize function's fetch call

**FIND** (around lines 35-41):
```typescript
const loginUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login`;
console.log('🔑 Attempting login to:', loginUrl);

const res = await fetch(loginUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
  credentials: 'include',
  mode: 'cors',
});
```

**REPLACE WITH:**
```typescript
// Import at the top of the file if not already present
// import { apiRequest } from '@/lib/api';

console.log('🔑 Attempting login via API utility');

try {
  const data = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  
  // apiRequest already parses JSON, so we have the data directly
  console.log('✅ Login response:', data);
  
  if (data.access_token) {
    return {
      id: data.user?.id || email,
      email: data.user?.email || email,
      name: data.user?.fullname || data.user?.username,
      accessToken: data.access_token,
    };
  }
  
  throw new Error(data.message || 'Invalid credentials');
} catch (error) {
  console.error('❌ Login error:', error);
  throw new Error(error instanceof Error ? error.message : 'Authentication failed');
}
```

**Note:** Remove the entire `const data = await res.json()` block since `apiRequest` handles JSON parsing.

---

## 📁 Step 3: Clean Up Chat Service

**File:** `/services/chatService.ts`  
**Action:** UPDATE the streamMessage method

**FIND** (around lines 70-95):
```typescript
async streamMessage(
  sessionId: string, 
  message: string,
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): Promise<void> {
  try {
    const response = await fetch(
      process.env.NODE_ENV === 'development'
        ? `/backend/api/chat/${sessionId}/stream`
        : `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/${sessionId}/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // You may need to add Authorization header here if required
        },
        body: JSON.stringify({ message }),
      }
    );
```

**REPLACE WITH:**
```typescript
// Add import at top of file if not present
// import { streamRequest } from '@/lib/api';

async streamMessage(
  sessionId: string, 
  message: string,
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): Promise<void> {
  try {
    const response = await streamRequest(`/api/chat/${sessionId}/stream`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
```

**Note:** Keep the rest of the function unchanged - only replace the fetch call.

---

## 📁 Step 4: Update Other Services (Non-blocking but recommended)

### 4.1 Fix File Upload Hook

**File:** `/app/hooks/useFileUpload.ts` (if exists)  
**Action:** Replace direct URL usage

**FIND patterns like:**
```typescript
`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/upload`
```

**REPLACE WITH streamRequest for XHR-based uploads:**
```typescript
// For FormData uploads, create a helper in the hook:
const uploadUrl = process.env.NODE_ENV === 'development' 
  ? '/backend/api/upload' 
  : `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/upload`;

// Or better, extend api.ts with a formDataRequest helper
```

### 4.2 Add Error Wrapper to api.ts

**File:** `/lib/api.ts`  
**Action:** ADD error handling utility at the end

```typescript
// Add at the end of api.ts
export async function handleAPIError(response: Response): Promise<never> {
  const contentType = response.headers.get('content-type');
  let error: any = { message: 'Unknown error' };
  
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

// Update apiRequest to use it:
// In apiRequest, replace the error handling with:
if (!response.ok) {
  await handleAPIError(response);
}
```

---

## 🔧 Step 5: Verify Next.js Proxy Configuration

**File:** `/next.config.js`  
**Action:** VERIFY proxy rewrites exist

```javascript
// Ensure this exists in next.config.js
module.exports = {
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: 'https://ohmni-backend.onrender.com/:path*',
      },
    ];
  },
  // ... other config
};
```

---

## ✅ Testing Checklist

After implementing ALL changes:

1. **Clear browser cache and localStorage**
2. **Restart Next.js dev server**
3. **Test in order:**
   - [ ] Login works without CORS errors in dev
   - [ ] Chat sessions load properly
   - [ ] Chat streaming works (SSE events received)
   - [ ] File upload works (if implemented)
   - [ ] No console errors about CORS
   - [ ] JWT tokens in Authorization headers

---

## 🚨 Rollback Plan

If anything breaks:
1. Git stash or commit your changes
2. Test each file change individually
3. The most likely issue is import statements - ensure all imports are added
4. Check browser Network tab for actual request URLs

---

## 📝 Environment Variables

**Development (.env.local):**
```env
# Can be empty or omitted - uses proxy
NEXT_PUBLIC_BACKEND_URL=
```

**Production (.env.production):**
```env
NEXT_PUBLIC_BACKEND_URL=https://ohmni-backend.onrender.com
```

---

## 🎯 Summary

This refactor:
1. ✅ Fixes CORS by using Next.js proxy in development
2. ✅ Standardizes all API calls through one utility
3. ✅ Maintains SSE streaming functionality
4. ✅ Improves error handling consistency
5. ✅ Prepares codebase for production deployment

**Estimated time:** 30-45 minutes  
**Risk level:** Low (improves stability)  
**Breaking changes:** None (same API contract)

---

## 🔄 Option B: Isomorphic API + Single-Auth Guard (Recommended Enhancement)

This mini-refactor removes browser-only dependencies from `lib/api.ts`, making it safe for server/edge usage while ensuring proper auth header handling.

### Step B1: Create Client-Side Token Accessor

**File:** `/app/hooks/useAccessToken.ts` (CREATE NEW FILE)  
**Action:** Create this new hook

```typescript
import { useSession } from 'next-auth/react';

export function useAccessToken(): string | null {
  const { data } = useSession();      // browser-only
  return (data as any)?.accessToken ?? null;
}
```

### Step B2: Make lib/api.ts Isomorphic

**File:** `/lib/api.ts`  
**Action:** Remove browser dependencies and add smart defaults

**1. DELETE this import:**
```typescript
import { getSession } from 'next-auth/react';
```

**2. ADD this helper function BEFORE `apiRequest`:**
```typescript
function applyDefaults(options: RequestInit = {}): RequestInit {
  const headers: HeadersInit = { ...options.headers };

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
```

**3. REPLACE the entire `apiRequest` function with:**
```typescript
export async function apiRequest<T = any>(
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
```

**4. REPLACE the entire `streamRequest` function with:**
```typescript
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
```

### Step B3: Update All API Call Sites

**File:** `/services/chatService.ts`  
**Action:** Pass token from component level

**ADD import at top:**
```typescript
// Note: Token must be passed from component that uses this service
```

**UPDATE the streamMessage method signature:**
```typescript
async streamMessage(
  sessionId: string, 
  message: string,
  token: string | null,  // ADD THIS PARAMETER
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): Promise<void> {
  try {
    const response = await streamRequest(`/api/chat/${sessionId}/stream`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: JSON.stringify({ message }),
    });
```

**File:** `/app/chat/page.tsx`  
**Action:** Use the token hook

**ADD import:**
```typescript
import { useAccessToken } from '@/app/hooks/useAccessToken';
```

**In the component, ADD:**
```typescript
const token = useAccessToken();
```

**UPDATE the streamMessage call:**
```typescript
await chatService.streamMessage(
  currentSession.id,
  content,
  token,  // PASS TOKEN HERE
  (chunk) => {
    // ... existing code
  },
  // ... rest of parameters
);
```

### Step B4: Update Auth Service

**File:** `/app/lib/auth.ts`  
**Action:** No token needed for login (uses credentials)

The existing refactor already handles this correctly - no additional changes needed.

### ✅ Benefits of Option B

1. **Server-Safe**: Can be used in React Server Components
2. **Edge-Ready**: Works in Vercel Edge Functions
3. **Single Auth**: Never sends both cookies AND bearer token
4. **Future-Proof**: Ready for App Router's server components
5. **Type-Safe**: Token explicitly passed where needed

### 📊 Test Matrix for Option B

| Scenario | Expected Result |
|----------|-----------------|
| Server component calls `apiRequest` | ✅ Works (no browser APIs) |
| Client with token | ✅ Bearer header only, no cookies |
| Client without token | ✅ Cookies only, no auth header |
| SSE streaming | ✅ Proper Accept header |
| Mixed environments | ✅ No CORS or double-auth errors |

**Impact:** ~40 lines changed, zero new dependencies