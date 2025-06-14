# Next.js Authentication Refactor Guide - Complete Implementation

## 🎯 Objective
Connect the Next.js frontend authentication to the existing Flask backend API deployed at `https://ohmni-backend.onrender.com`. This is a **FRONTEND-ONLY** task - no backend modifications required.

## 📋 Pre-Implementation Checklist
- [x] Environment variables verified in `.env.local`
- [ ] NextAuth v5 beta (`^5.0.0-beta.28`) confirmed in `package.json`
- [ ] Development server stopped (will restart after changes)

---

## 🔧 Implementation Steps

### Step 1: Create NextAuth TypeScript Declaration File

**File to Create**: `/Users/collin/Desktop/ohmni-frontend/types/next-auth.d.ts`

**Complete File Content**:
```typescript
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    user: {
      id: string;
    } & DefaultSession['user'];
  }

  interface User {
    accessToken?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    id: string;
  }
}
```

**Verification**: TypeScript should recognize `session.accessToken` without errors after this file is created.

---

### Step 2: Document Flask API Response Types

**File to Modify**: `/Users/collin/Desktop/ohmni-frontend/types/api.ts`

**Add these interfaces at the end of the existing file**:
```typescript
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
```

---

### Step 3: Update NextAuth Route Handler

**File to Modify**: `/Users/collin/Desktop/ohmni-frontend/app/api/auth/[...nextauth]/route.ts`

**Current Content** (lines 1-3):
```typescript
import NextAuth from 'next-auth'
import { authOptions } from '@/app/lib/auth'

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

**New Complete File Content**:
```typescript
import NextAuth from 'next-auth'
import { authOptions } from '@/app/lib/auth'

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

**Note**: No changes needed here - the auth configuration is in `app/lib/auth.ts`

---

### Step 4: Verify Auth Configuration

**File to Review**: `/Users/collin/Desktop/ohmni-frontend/app/lib/auth.ts`

**Verify this section uses the correct Flask endpoint** (lines 18-29):
```typescript
const response = await fetch(
  `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
    }),
  }
)
```

**Status**: ✅ Already correct - no changes needed

---

### Step 5: Handle Missing Chat Sessions Endpoint

**File to Modify**: `/Users/collin/Desktop/ohmni-frontend/components/chat/ChatSidebar.tsx`

**Find this function** (approximately lines 18-27):
```typescript
const loadSessions = async () => {
  try {
    const data = await chatService.getSessions();
    setSessions(data);
  } catch (error) {
    console.error('Failed to load sessions:', error);
  } finally {
    setIsLoading(false);
  }
};
```

**Replace with**:
```typescript
const loadSessions = async () => {
  try {
    const data = await chatService.getSessions();
    setSessions(data);
  } catch (error) {
    console.error('Failed to load sessions:', error);
    // Handle case where Flask endpoint doesn't exist yet
    setSessions([]);
    // Optional: Show a toast or notification to user
    // toast.info('Chat history will be available once you start a conversation');
  } finally {
    setIsLoading(false);
  }
};
```

---

### Step 6: Clean Up Redundant Comment

**File to Modify**: `/Users/collin/Desktop/ohmni-frontend/services/chatService.ts`

**Find this section** (approximately line 56):
```typescript
headers: {
  'Content-Type': 'application/json',
  // You may need to add Authorization header here if required
},
```

**Remove the comment** so it looks like:
```typescript
headers: {
  'Content-Type': 'application/json',
},
```

**Note**: The authorization header is actually being added correctly later in the function via dynamic import.

---

### Step 7: Add Session Debug Component (Development Only)

**File to Create**: `/Users/collin/Desktop/ohmni-frontend/components/debug/SessionDebug.tsx`

**Complete File Content**:
```typescript
'use client';

import { useSession } from 'next-auth/react';

export function SessionDebug() {
  const { data: session, status } = useSession();
  
  // Only show in development
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <div className="fixed bottom-4 right-4 max-w-md p-4 bg-black/80 text-white rounded-lg text-xs font-mono">
      <h3 className="font-bold mb-2 text-yellow-400">Session Debug</h3>
      <div className="space-y-1">
        <div>Status: <span className={status === 'authenticated' ? 'text-green-400' : 'text-red-400'}>{status}</span></div>
        {session && (
          <>
            <div>User: {session.user?.email}</div>
            <div>Token: {session.accessToken ? '✅ Present' : '❌ Missing'}</div>
          </>
        )}
      </div>
      <details className="mt-2">
        <summary className="cursor-pointer text-blue-400">Full Session Data</summary>
        <pre className="mt-2 text-[10px] overflow-auto max-h-40">
          {JSON.stringify({ status, session }, null, 2)}
        </pre>
      </details>
    </div>
  );
}
```

---

### Step 8: Add Session Debug to Layout (Temporary)

**File to Modify**: `/Users/collin/Desktop/ohmni-frontend/app/layout.tsx`

**Add import at the top**:
```typescript
import { SessionDebug } from '@/components/debug/SessionDebug';
```

**Find the body section** and add SessionDebug before the closing Providers tag:
```typescript
<Providers>
  <Header />
  <main className="flex-1 pt-14">
    {children}
  </main>
  <Footer />
  <SessionDebug />  {/* Add this line - Remove after testing */}
</Providers>
```

---

### Step 9: Create Chat Error Boundary

**File to Create**: `/Users/collin/Desktop/ohmni-frontend/app/chat/error.tsx`

**Complete File Content**:
```typescript
'use client';

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center bg-dark-bg">
      <div className="text-center glass-card p-8 max-w-md">
        <h2 className="text-2xl font-bold text-white mb-4">
          Something went wrong!
        </h2>
        <p className="text-text-secondary mb-6">
          {error.message || 'An unexpected error occurred'}
        </p>
        <button 
          onClick={reset} 
          className="btn-primary"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
```

---

### Step 10: Create Production Environment File

**File to Create**: `/Users/collin/Desktop/ohmni-frontend/.env.production`

**Complete File Content**:
```env
# Production environment variables
# Update NEXTAUTH_URL when you deploy to Vercel
NEXTAUTH_URL=https://your-app-name.vercel.app
NEXTAUTH_SECRET=your-production-secret-here
NEXT_PUBLIC_BACKEND_URL=https://ohmni-backend.onrender.com
```

**Note**: Remember to update `NEXTAUTH_URL` with your actual Vercel URL when deploying.

---

## 🧪 Testing Instructions

### 1. Restart Development Server
```bash
npm run dev
```

### 2. Test NextAuth Endpoint
Navigate to: `http://localhost:3000/api/auth/signin`
- Should show NextAuth's built-in signin page
- Should NOT show any errors

### 3. Test Login Flow
1. Go to `http://localhost:3000/login`
2. Enter valid credentials from your Flask database
3. Check Network tab for:
   - Request to `https://ohmni-backend.onrender.com/api/auth/login`
   - Response containing `access_token`
4. After successful login, should redirect to `/chat`

### 4. Verify Session Debug
- Look for yellow "Session Debug" box in bottom-right
- Should show:
  - Status: authenticated
  - User email
  - Token: ✅ Present

### 5. Test API Calls
1. Open Network tab
2. Navigate around the app
3. Check that API calls to Flask include:
   - `Authorization: Bearer eyJ...` header

### 6. Test Chat Page
- Should load without errors
- If chat sessions endpoint not implemented, should show empty state
- Should NOT crash the application

---

## 🚨 Troubleshooting

### "Session endpoint not found" Error
- **Cause**: Trying to call NextAuth route on Flask
- **Fix**: This implementation should resolve it

### "Invalid credentials" with Correct Password
- **Check**: User exists in Flask database
- **Try**: Create new user via Flask `/api/auth/register`

### TypeScript Errors on `session.accessToken`
- **Check**: `types/next-auth.d.ts` file exists
- **Try**: Restart TypeScript server in VS Code

### Chat Page Shows No Sessions
- **Expected**: Flask chat endpoints are pending implementation
- **Fix**: Already handled gracefully in Step 5

---

## 🎯 Success Criteria

After implementation, verify:
- [ ] Can log in with Flask credentials
- [ ] Session contains JWT token from Flask
- [ ] API calls include Authorization header
- [ ] No TypeScript errors on session properties
- [ ] Chat page loads (even if sessions are empty)
- [ ] Network tab shows authenticated API calls

---

## 🧹 Cleanup After Testing

1. Remove `SessionDebug` from layout
2. Remove the import for `SessionDebug` from layout
3. Optionally keep `components/debug/SessionDebug.tsx` for future debugging

---

## 📝 Notes for AI Agent

- All file paths are absolute from project root
- Line numbers are approximate but sections are clearly marked
- Use exact file content where provided
- Test after each major step
- The Flask backend is already deployed and working - do NOT attempt to modify it
- NextAuth version is `^5.0.0-beta.28` - do not change this
- If any import is not found, check the actual file structure first