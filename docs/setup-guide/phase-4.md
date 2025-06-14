# Phase 4: Authentication System

## Overview
This phase implements the complete authentication system using NextAuth.js with JWT tokens from the Flask backend.

---

## Step 4.1: Configure NextAuth

Create `app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { AuthResponse } from '@/types/api';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        try {
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
          );

          const data: AuthResponse = await response.json();

          if (response.ok && data.access_token) {
            return {
              id: data.user?.id || credentials.email,
              email: data.user?.email || credentials.email,
              name: data.user?.fullname || data.user?.username,
              accessToken: data.access_token,
            };
          }

          throw new Error(data.message || 'Invalid credentials');
        } catch (error) {
          console.error('Auth error:', error);
          throw new Error(error instanceof Error ? error.message : 'Authentication failed');
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.accessToken = user.accessToken;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }: any) {
      session.accessToken = token.accessToken;
      session.user.id = token.id;
      return session;
    }
  },
  pages: {
    signIn: '/login',
    signOut: '/logout',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

---

## Step 4.2: Create Session Provider

Create `components/providers/SessionProvider.tsx`:

```typescript
'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}
```

---

## Step 4.3: Create Auth Hooks

Create `hooks/useAuth.ts`:

```typescript
import { useSession, signIn, signOut } from 'next-auth/react';
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
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        return false;
      }

      // Handle remember me
      if (remember) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('rememberedEmail');
      }

      router.push('/chat');
      return true;
    } catch (err) {
      setError('An unexpected error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
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

---

## Step 4.4: Create Login Page

Create `app/login/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const { login, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    // Check for remembered email
    const remembered = localStorage.getItem('rememberMe') === 'true';
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    
    if (remembered && rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password, rememberMe);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg relative overflow-hidden">
      {/* Background overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#071629]/60 to-deep-navy/50 z-10" />
      
      {/* Electric lines effect */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none z-20 animate-pulseEffect"
        style={{
          backgroundImage: "url('/images/ohmni-blue-owl-lightning.png')",
          backgroundSize: 'cover',
        }}
      />

      {/* Login Form */}
      <div className="relative z-30 w-full max-w-md p-8">
        <div className="glass-card p-8">
          <h2 className="text-center uppercase mb-2 text-accent-blue text-2xl font-bold tracking-wider">
            OHMNI ORACLE
          </h2>
          <p className="text-center italic mb-6 text-text-secondary">
            "We handle it all, the rest is just decor."
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="form-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-control"
                required
                disabled={isLoading}
              />
            </div>

            <div className="mb-4">
              <label className="form-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-control"
                required
                disabled={isLoading}
              />
            </div>

            {/* ULTRA VISIBLE REMEMBER ME */}
            <div className="bg-red-500 p-4 rounded-lg my-5 text-center border-4 border-white shadow-lg">
              <label 
                className="text-white text-2xl font-extrabold uppercase tracking-widest flex items-center justify-center cursor-pointer"
                style={{ textShadow: '2px 2px 4px #000000' }}
              >
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-9 h-9 mr-5 border-4 border-white cursor-pointer"
                  disabled={isLoading}
                />
                REMEMBER ME
              </label>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded mb-4">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 text-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>

            <div className="flex justify-between mt-3">
              <Link href="/register" className="text-electric-blue hover:text-electric-glow">
                New user? Register here
              </Link>
              <Link href="/reset-password" className="text-electric-blue hover:text-electric-glow">
                Forgot password?
              </Link>
            </div>
          </form>

          <hr className="my-4 border-border-subtle" />
          <p className="text-center text-sm text-text-secondary">
            Built by electricians. Powered by AI.
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

## Step 4.5: Create Register Page

Create `app/register/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    fullname: '',
    password: '',
    confirmPassword: '',
    companyCode: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/api/auth/register', {
        email: formData.email,
        username: formData.username,
        fullname: formData.fullname,
        password: formData.password,
        company_code: formData.companyCode || undefined,
      });

      router.push('/login?registered=true');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#071629]/60 to-deep-navy/50 z-10" />
      
      <div className="relative z-30 w-full max-w-md p-8">
        <div className="glass-card p-8">
          <h2 className="text-center uppercase mb-6 text-accent-blue text-2xl font-bold tracking-wider">
            Create Account
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-control"
                required
                disabled={isLoading}
              />
            </div>

            <div className="mb-4">
              <label className="form-label">Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="form-control"
                required
                disabled={isLoading}
              />
            </div>

            <div className="mb-4">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                name="fullname"
                value={formData.fullname}
                onChange={handleChange}
                className="form-control"
                required
                disabled={isLoading}
              />
            </div>

            <div className="mb-4">
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-control"
                required
                disabled={isLoading}
              />
            </div>

            <div className="mb-4">
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="form-control"
                required
                disabled={isLoading}
              />
            </div>

            <div className="mb-4">
              <label className="form-label">Company Access Code (Optional)</label>
              <input
                type="text"
                name="companyCode"
                value={formData.companyCode}
                onChange={handleChange}
                className="form-control"
                placeholder="Enter if provided by your company"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded mb-4">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 text-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>

            <div className="text-center mt-4">
              <Link href="/login" className="text-electric-blue hover:text-electric-glow">
                Already have an account? Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
```

---

## File Structure After Phase 4

```
abco-ai-frontend/
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts
│   ├── login/
│   │   └── page.tsx
│   └── register/
│       └── page.tsx
├── components/
│   └── providers/
│       └── SessionProvider.tsx
├── hooks/
│   └── useAuth.ts
└── ...existing files
```

---

## Verification Checklist

After completing Phase 4, you should have:
- [ ] NextAuth configured with JWT strategy
- [ ] Login page with ULTRA VISIBLE red Remember Me checkbox
- [ ] Register page with optional company code
- [ ] Session provider wrapper component
- [ ] useAuth hook for authentication logic
- [ ] Proper TypeScript typing throughout
- [ ] Redirects working (login → chat, logout → login)

---

## Dependencies Used in This Phase
- **next-auth:** ^4.24.7 (installed in Phase 1)
- **React:** ^19.1.0
- **TypeScript:** ^5.x
- **Next.js:** ^15.3.3 for routing

---

## Key Features Implemented
- JWT token authentication with Flask backend
- Remember Me functionality with localStorage
- Session persistence for 30 days
- Error handling and loading states
- Protected route redirects
- Company access code support

---

## Next Phase
Once Phase 4 is complete, proceed to Phase 5: Layout Components (Header/Footer)