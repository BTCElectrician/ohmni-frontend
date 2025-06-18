# API Authentication Token Fix

## Refactor Name: `API_AUTH_TOKEN_FIX`

## Purpose
Fix 401 Unauthorized errors in chat and other API calls by properly passing NextAuth v5 JWT tokens to the Flask backend.

## Problem Statement
After migrating to NextAuth v5, API requests fail with 401 errors because:
- The JWT token is stored at `session.accessToken` (new location)
- The `apiRequest()` helper wasn't updated to read from this new location
- Backend rejects requests without valid `Authorization: Bearer <token>` header

## Root Cause
```
ChatService.createSession() → apiRequest() → Missing Auth Header → 401 Error
```

## Implementation

### Step 1: Update API Request Helper
**File:** `lib/api.ts`

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
  // Get the session with JWT token from NextAuth v5
  const session = await getSession();
  
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
  if ((session as any)?.accessToken) {
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${(session as any).accessToken}`
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

### Step 2: Add Error Handling to Chat Service
**File:** `services/chatService.ts`

Add error handling to gracefully handle auth failures:

```typescript
async createSession(name?: string): Promise<ChatSession> {
  try {
    // Verify we have auth before making the request
    const session = await getSession();
    if (!session?.accessToken) {
      throw new Error('Authentication required. Please log in.');
    }
    
    return api.post('/api/chat/sessions', { name: name || 'New Chat' });
  } catch (error) {
    console.error('Failed to create chat session:', error);
    throw error;
  }
}
```

### Step 3: Add Error UI Handling
**File:** `app/chat/page.tsx`

Update the `sendMessage` function to handle errors gracefully:

```typescript
const sendMessage = async (content: string) => {
  if (!currentSession) {
    try {
      const session = await chatService.createSession('New Chat');
      // Update store will trigger re-render and load messages
      return;
    } catch (error) {
      console.error('Failed to create session:', error);
      
      // Show user-friendly error
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Authentication')) {
          // Redirect to login if auth failed
          router.push('/login?error=session_expired');
        } else {
          // Show error toast or alert
          alert('Failed to start chat. Please try again.');
        }
      }
      return;
    }
  }
  
  // ... rest of the message sending logic
};
```

### Step 4: Debug Verification
Add temporary debug logging to verify the fix:

```typescript
// In any component using the API
import { useSession } from 'next-auth/react';

export default function SomeComponent() {
  const { data: session } = useSession();
  
  useEffect(() => {
    console.log('Session debug:', {
      hasSession: !!session,
      hasAccessToken: !!(session as any)?.accessToken,
      tokenPreview: (session as any)?.accessToken?.substring(0, 20) + '...'
    });
  }, [session]);
  
  // ... rest of component
}
```

## Verification Steps

1. **Clear Browser Cache**
   - Clear all cookies and localStorage for your domain
   - Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)

2. **Check Network Tab**
   - Open DevTools → Network tab
   - Trigger a chat action
   - Look for `/api/chat/sessions` POST request
   - Verify it has `Authorization: Bearer eyJ...` header

3. **Check Console**
   - Should see "Making request to: https://ohmni-backend.onrender.com/api/chat/sessions"
   - Should NOT see "No access token available"
   - Should NOT see 401 errors

4. **Test Chat Flow**
   - Login fresh
   - Navigate to /chat
   - Type a message and send
   - Should create session and send message successfully

## Additional Backend CORS Check

If still getting CORS errors after this fix, verify Flask backend has:

```python
from flask_cors import CORS

CORS(app, 
     resources={r"/api/*": {"origins": ["http://localhost:3000", "https://your-vercel-app.vercel.app"]}},
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization"]
)
```

## Files Modified
- `lib/api.ts` - Added auth header and better error handling
- `services/chatService.ts` - Added auth validation
- `app/chat/page.tsx` - Added error UI handling

## Related Issues
- Depends on: `AUTH_V5_MIGRATION_FIX`
- Fixes: Chat 401 errors, API authentication failures
- Enables: All authenticated API calls

## Success Criteria
- ✅ No more 401 errors in chat
- ✅ Authorization header present in all API requests
- ✅ Chat sessions create successfully
- ✅ Messages send without errors
- ✅ Graceful error handling for auth failures

## ADDENDUM: Additional Fixes Required

After implementing the above plan, we discovered additional issues that need to be addressed:

### Issue 1: Server-Side Rendering Conflict
**Problem:** Static import of `next-auth/react` in `lib/api.ts` causes React fiber stack trace errors because client-only modules can't be bundled in server-side code.

**Solution:** Make the API helper environment-aware with dynamic imports:

```typescript
// lib/api.ts - Remove static import and use dynamic imports
// ❌ Remove this line:
// import { getSession } from 'next-auth/react';

// ✅ Add environment detection:
const isBrowser = () => typeof window !== "undefined";

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
  
  // ... rest of function remains the same
}
```

### Issue 2: Dynamic Imports in Services
**Problem:** `services/chatService.ts` also had static imports that needed to be converted.

**Solution:** Update all `getSession` usage to use dynamic imports:

```typescript
// services/chatService.ts
// ❌ Remove static import:
// import { getSession } from 'next-auth/react';

// ✅ Use dynamic imports in methods:
async createSession(name?: string): Promise<ChatSession> {
  try {
    // Use dynamic import to avoid client-only module in server builds
    const { getSession } = await import('next-auth/react');
    const session = await getSession();
    // ... rest of method
  }
}

async streamMessage(...) {
  try {
    // Use dynamic import to avoid client-only module in server builds
    const { getSession } = await import('next-auth/react');
    const session = await getSession();
    // ... rest of method
  }
}
```

### Issue 3: Component Export/Import Mismatch
**Problem:** If using the debug component, ensure export/import patterns match.

**Solution:** 
```typescript
// components/debug/SessionDebug.tsx exports as default
export default function SessionDebug() { ... }

// app/layout.tsx should import as default (not named)
import SessionDebug from '@/components/debug/SessionDebug'  // ✅ Correct
// NOT: import { SessionDebug } from '@/components/debug/SessionDebug'  // ❌ Wrong
```

### Issue 4: Cache Clearing Required
**Problem:** After making these changes, stale cached imports can cause continued errors.

**Solution:** Clear Next.js cache and restart:
```bash
rm -rf .next
npm run dev
```

### Updated Success Criteria
- ✅ No more 401 errors in chat
- ✅ Authorization header present in all API requests
- ✅ Chat sessions create successfully
- ✅ Messages send without errors
- ✅ Graceful error handling for auth failures
- ✅ **No React fiber stack trace errors on page load**
- ✅ **Works in both client and server-side rendering contexts**
- ✅ **Debug component loads without import errors**

## Key Lessons Learned
1. **Universal modules** (used by both client and server) cannot statically import client-only libraries
2. **Dynamic imports** are essential when code needs to run in both environments
3. **Cache clearing** is critical after making module-level changes
4. **Export/import patterns** must match exactly to avoid React rendering errors

This refactor requires both the original auth token fixes AND the additional environment-aware changes to work properly.