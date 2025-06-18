# NextAuth v5 Beta Migration - Authentication Fix

## Refactor Name: `AUTH_V5_MIGRATION_FIX`

## Purpose
Fix authentication errors (AuthError, ClientFetchError, blank screen after login) by migrating from NextAuth v4 to v5 beta with proper Flask backend integration.

## Prerequisites
- Existing Next.js project with broken NextAuth v4 setup
- Flask backend at `https://ohmni-backend.onrender.com`
- Environment variables properly configured

## Implementation Steps

### Step 1: Create Root Auth Configuration
**File:** `auth.ts` (in project root, NOT in app directory)
```typescript
// auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";

// Extend the built-in session/token types
declare module "next-auth" {
  interface Session {
    accessToken?: string;
  }
  interface User {
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
  }
}

export const config: NextAuthConfig = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
              }),
            }
          );

          const data = await res.json();

          if (res.ok && data.access_token) {
            return {
              id: data.user?.id || credentials.email,
              name: data.user?.fullname || data.user?.username,
              email: data.user?.email || credentials.email,
              accessToken: data.access_token,
            };
          }

          // Return null if auth fails
          return null;
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const { 
  handlers: { GET, POST }, 
  auth, 
  signIn, 
  signOut 
} = NextAuth(config);
```

### Step 2: Update Route Handler
**File:** `app/api/auth/[...nextauth]/route.ts`
```typescript
// app/api/auth/[...nextauth]/route.ts
export { GET, POST } from "@/auth";
```

### Step 3: Update Authentication Hook
**File:** `app/hooks/useAuth.ts`
```typescript
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, password: string, remember: boolean = false) => {
    setIsLoading(true);
    setError(null);

    try {
      // Note: In client components, we still use next-auth/react's signIn
      const { signIn } = await import('next-auth/react');
      
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error === 'CredentialsSignin' ? 'Invalid email or password' : result.error);
        return false;
      }

      if (result?.ok) {
        if (remember) {
          localStorage.setItem('rememberMe', 'true');
          localStorage.setItem('rememberedEmail', email);
        } else {
          localStorage.removeItem('rememberMe');
          localStorage.removeItem('rememberedEmail');
        }

        router.push('/chat');
        return true;
      }

      return false;
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    const { signOut } = await import('next-auth/react');
    await signOut({ redirect: true, callbackUrl: '/login' });
  };

  return {
    user: session?.user,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading' || isLoading,
    error,
    login,
    logout,
  };
}
```

### Step 4: Create Middleware (NEW FILE)
**File:** `middleware.ts` (in project root - same level as package.json)
```typescript
// middleware.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Define public routes that don't need authentication
  const publicRoutes = ['/login', '/register', '/reset-password'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // Define protected routes that need authentication
  const protectedRoutes = ['/chat', '/construction', '/profile'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // Get response object
  const response = NextResponse.next();

  // Add online/offline detection headers
  // This helps the client know the user's connection status
  response.headers.set('X-Online-Status', 'online');
  
  // Placeholder for offline handling
  // TODO: In the future, we can check if user is offline and:
  // - Serve cached content
  // - Add special headers for offline mode
  // - Route to offline-specific pages
  
  // Example offline detection (to be implemented with service worker):
  // if (req.headers.get('X-Offline-Mode') === 'true') {
  //   response.headers.set('X-Online-Status', 'offline');
  //   response.headers.set('X-Cache-Strategy', 'cache-first');
  // }

  // Redirect to login if trying to access protected route without auth
  if (isProtectedRoute && !isLoggedIn) {
    const newUrl = new URL("/login", req.nextUrl.origin);
    // Preserve the original URL they were trying to access
    newUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(newUrl);
  }

  // Redirect to home if trying to access auth pages while logged in
  if (isPublicRoute && isLoggedIn && pathname !== '/reset-password') {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  return response;
});

export const config = {
  // Run middleware on all routes except static files and API routes
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)",
  ],
};
```

### Step 5: Update Home Page
**File:** `app/page.tsx`
```typescript
'use client';

import { useSession } from 'next-auth/react';
import { FeatureCard } from '@/components/home/FeatureCard';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const firstName = session?.user?.name?.split(' ')[0];

  useEffect(() => {
    // Redirect to login if not authenticated
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <section 
      className="hero relative flex-grow w-full min-h-[calc(100vh-110px)] bg-cover bg-center bg-no-repeat flex items-center justify-center overflow-hidden"
      style={{ backgroundImage: "url('/images/abco-watercolor.png')" }}
    >
      {/* Electric overlay with blue tint */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#071629]/60 to-deep-navy/50 z-10" />
      
      {/* Animated electric lines effect */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none z-20 animate-pulseEffect"
        style={{
          backgroundImage: "url('/images/ohmni-blue-owl-lightning.png')",
          backgroundSize: 'cover',
        }}
      />

      {/* Welcome Card */}
      <div className="relative z-30 w-[90%] max-w-[800px] p-10 glass-card">
        {/* Welcome Heading */}
        <h1 className="text-4xl text-white mb-3 font-bold text-center text-glow">
          Welcome{firstName && `, ${firstName}`}!
        </h1>
        
        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
          <FeatureCard
            icon="/images/perfect-thorr-chatbot.png"
            title="Chatbot"
            description="Ask NEC questions in seconds."
            href="/chat"
            buttonText="Open Chatbot"
            delay="0.1s"
          />
          
          <FeatureCard
            icon="/images/owl-mini-blueprint.png"
            title="Construction Management"
            description="Track projects and resources."
            href="/construction"
            buttonText="Open Tool"
            delay="0.2s"
          />
          
          <FeatureCard
            icon="/images/owl-upload-final.png"
            title="Upload Drawing"
            description="Analyze plans and specs."
            href="#"
            buttonText="Upload Now"
            delay="0.3s"
            isUpload={true}
          />
          
          <FeatureCard
            icon="/images/owl-lab.png"
            title="Prefab Lab"
            description="Calculate assembly times."
            href="#"
            buttonText="Start Prefab"
            delay="0.4s"
          />
        </div>
        
        {/* Footer Tagline */}
        <p className="footer-tagline mt-12 mb-0 text-center text-text-secondary italic text-base pt-5 border-t border-electric-glow/20">
          "Built by electricians. Powered by AI."
        </p>
      </div>
    </section>
  );
}
```

### Step 6: Clean Cache and Restart
**Commands to run in terminal:**
```bash
# Remove build cache
rm -rf .next

# Remove node modules cache
rm -rf node_modules/.cache

# Restart development server
npm run dev
```

### Step 7: Environment Variables Check
**File:** `.env.local`
```env
# Backend API
NEXT_PUBLIC_BACKEND_URL=https://ohmni-backend.onrender.com

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Generate a secret with: openssl rand -base64 32
```

## Verification Steps

1. **Check Providers Endpoint**: Navigate to `http://localhost:3000/api/auth/providers`
   - Should return JSON response, not a 500 error
   - Should show credentials provider

2. **Test Login Flow**:
   - Clear browser cache and cookies
   - Navigate to `/login`
   - Enter valid credentials
   - Should redirect to `/chat` on success
   - Should show error message on failure

3. **Test Protected Routes**:
   - While logged out, try accessing `/chat`
   - Should redirect to `/login`
   - After login, should be able to access `/chat`

4. **Test Logout**:
   - Click logout button
   - Should redirect to `/login`
   - Should not be able to access protected routes

## Files to Delete (if they exist)

- `app/lib/auth.ts` (replaced by root `auth.ts`)
- `pages/api/auth/[...nextauth].ts` (if using pages directory)
- Any duplicate auth configuration files

## Expected Behavior After Implementation

1. No more `AuthError` or `ClientFetchError` messages
2. No blank screen after registration/login
3. Proper redirects to `/chat` after successful login
4. Protected routes properly secured
5. Clean session management with JWT tokens from Flask backend

## Notes for AI Agent

- The `auth.ts` file MUST be in the project root, not in the `app` directory
- Import paths use `@/auth` for the root auth file
- Client components still use `next-auth/react` for `useSession` and client-side `signIn`/`signOut`
- The middleware uses the new `auth()` function from the root auth file
- All protected routes should be listed in the middleware matcher
- Environment variables must be properly set before testing
- Clear all caches after implementation to avoid stale module errors