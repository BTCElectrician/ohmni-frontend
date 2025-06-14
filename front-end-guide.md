front-end-guide.md
77.22 KB •2,826 lines
•
Formatting may be inconsistent from source
# Complete ABCO AI Frontend Implementation Guide
## From Zero to Production-Ready Application

---

## Table of Contents
1. [Project Setup & Initial Configuration](#1-project-setup--initial-configuration)
2. [Environment Setup & Core Dependencies](#2-environment-setup--core-dependencies)
3. [Design System & Theme Configuration](#3-design-system--theme-configuration)
4. [Authentication System](#4-authentication-system)
5. [Layout Components](#5-layout-components)
6. [Home Page Implementation](#6-home-page-implementation)
7. [Chat Interface](#7-chat-interface)
8. [Construction Management Page](#8-construction-management-page)
9. [File Upload & Voice Recording](#9-file-upload--voice-recording)
10. [PWA & Offline Support](#10-pwa--offline-support)
11. [Deployment to Production](#11-deployment-to-production)

---

## 1. Project Setup & Initial Configuration

### Step 1.1: Create the Next.js Project

Open your terminal and run these commands:

```bash
# Create the project with TypeScript and Tailwind CSS
npx create-next-app@latest abco-ai-frontend --typescript --tailwind --app --use-npm

# Navigate into the project
cd abco-ai-frontend

# Open in your code editor (VS Code example)
code .
```

When prompted during setup:
- ✅ Would you like to use TypeScript? **Yes**
- ✅ Would you like to use ESLint? **Yes**
- ✅ Would you like to use Tailwind CSS? **Yes**
- ✅ Would you like to use `src/` directory? **No**
- ✅ Would you like to use App Router? **Yes**
- ✅ Would you like to customize the default import alias? **No**

### Step 1.2: Install Essential Dependencies

```bash
# Core dependencies for our app
npm install @tanstack/react-query@5.51.1 zustand@4.5.2 next-auth@4.24.7 next-pwa@5.6.0

# UI components library
npm install @radix-ui/react-slot@1.1.0 class-variance-authority@0.7.0 clsx@2.1.1 tailwind-merge@2.4.0

# Icons
npm install lucide-react@0.400.0

# Additional utilities
npm install axios@1.7.2 date-fns@3.6.0
```

### Step 1.3: Clean Up Default Files

Delete these default Next.js files (we'll create our own):
- `app/page.tsx`
- `app/globals.css` (we'll replace this)
- `public/next.svg`
- `public/vercel.svg`

---

## 2. Environment Setup & Core Dependencies

### Step 2.1: Create Environment Variables

Create a `.env.local` file in your project root:

```env
# Backend API
NEXT_PUBLIC_BACKEND_URL=https://ohmni-backend.onrender.com

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-generate-with-openssl-rand-base64-32

# Company Theme Colors
NEXT_PUBLIC_COMPANY_PRIMARY_COLOR=#e67e22
NEXT_PUBLIC_COMPANY_SECONDARY_COLOR=#34495e
```

### Step 2.2: Create TypeScript Type Definitions

Create `types/api.ts`:

```typescript
// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Authentication Types
export interface User {
  id: string;
  email: string;
  fullname: string;
  username: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
  message?: string;
}

// Chat Types
export interface ChatSession {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  messages_count: number;
  is_starred?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sessionId: string;
}

// File Upload Types
export interface UploadedFile {
  id: string;
  filename: string;
  size: number;
  type: string;
  url?: string;
  uploaded_at: string;
}

// Knowledge Base Types
export interface ElectricalTip {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
  source: string;
}
```

### Step 2.3: Setup API Client

Create `lib/api.ts`:

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
  const session = await getSession();
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  // Add Authorization header if we have a token
  if (session?.accessToken) {
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${session.accessToken}`
    };
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new APIError(
        response.status, 
        error.message || response.statusText, 
        error
      );
    }
    
    // Handle empty responses
    const text = await response.text();
    return text ? JSON.parse(text) : {} as T;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
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

---

## 3. Design System & Theme Configuration

### Step 3.1: Create Global Styles

Replace `app/globals.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Import Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@500;600;700&family=Poppins:wght@400;500;600;700&display=swap');

@layer base {
  :root {
    /* ABCO Navy Theme */
    --bg-nav: #081827;
    --accent-blue: #3B82F6;
    --brand-blue: #3333cc;
    --txt-light: #e2e2e2;
    
    /* Electric Blue Owl Theme */
    --electric-blue: #149DEA;
    --electric-glow: #1EB8FF;
    --deep-navy: #0A1E33;
    --dark-bg: #020B18;
    --bg-primary: #020B18;
    --bg-secondary: #0A1E33;
    --surface-elevated: #11263F;
    --border-subtle: #1B4674;
    --accent-primary: #149DEA;
    --accent-hover: #1EB8FF;
    --accent-glow: #9FEBF8;
    --text-primary: #F0F6FC;
    --text-secondary: #A0B4CC;
    --user-bubble: #0C7BD1;
    
    /* Legacy Colors */
    --primary-color: #e67e22;
    --secondary-color: #34495e;
    --primary-light: #4545dd;
    --secondary-light: #99ddff;
    --accent-color: #3B82F6;
    --accent-light: #2222aa;
    --background-color: #e6f2ff;
    --background-light: #f0f8ff;
    --text-color: #212529;
    --text-light: #6c757d;
    --danger-color: #e74c3c;
    --success-color: #2ecc71;
    --warning-color: #f1c40f;
    --info-color: #66ccff;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    font-family: 'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background-color: var(--dark-bg);
    color: var(--text-primary);
    line-height: 1.6;
  }
}

@layer components {
  /* Brand Typography */
  .brand-name {
    @apply font-bold font-montserrat text-white text-lg leading-tight tracking-wide;
  }

  .brand-subtitle {
    @apply font-medium font-montserrat text-[#66ccff] text-xs leading-tight;
  }

  /* Navigation Links */
  .nav-link {
    @apply text-[#e2e2e2] hover:text-white transition-colors duration-200 px-4 py-2 rounded hover:bg-white/10;
  }

  /* Buttons */
  .btn-primary {
    @apply bg-gradient-to-r from-[#0C7BD1] to-[#1EB8FF] text-white px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200;
  }

  .btn-secondary {
    @apply bg-[#11263F] text-white px-6 py-3 rounded-lg font-medium border border-[#149DEA]/30 hover:bg-[#1B4674] transition-all duration-200;
  }

  /* Forms */
  .form-label {
    @apply block text-white mb-2 font-medium;
  }

  .form-control {
    @apply w-full p-3 rounded-lg bg-[#11263F] border border-[#149DEA]/30 text-white placeholder-[#A0B4CC] focus:border-[#149DEA] focus:outline-none focus:ring-2 focus:ring-[#149DEA]/20 transition-all duration-200;
  }

  /* Cards */
  .glass-card {
    @apply bg-[#0A1E33]/70 border border-[#149DEA]/40 rounded-lg backdrop-blur-sm;
  }

  /* Animations */
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes pulseEffect {
    0% { opacity: 0.05; }
    50% { opacity: 0.15; }
    100% { opacity: 0.08; }
  }

  .animate-fadeInUp {
    animation: fadeInUp 0.6s ease-out forwards;
  }

  .animate-pulseEffect {
    animation: pulseEffect 8s infinite alternate;
  }
}

@layer utilities {
  /* Text Shadows */
  .text-glow {
    text-shadow: 0 0 15px rgba(20, 157, 234, 0.6);
  }

  /* Custom Scrollbar */
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: var(--bg-secondary);
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: var(--border-subtle);
    border-radius: 4px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: var(--accent-primary);
  }
}
```

### Step 3.2: Configure Tailwind

Update `tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'abco-navy': '#081827',
        'electric-blue': '#149DEA',
        'electric-glow': '#1EB8FF',
        'deep-navy': '#0A1E33',
        'dark-bg': '#020B18',
        'surface-elevated': '#11263F',
        'border-subtle': '#1B4674',
        'text-primary': '#F0F6FC',
        'text-secondary': '#A0B4CC',
      },
      fontFamily: {
        'poppins': ['Poppins', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
        'montserrat': ['Montserrat', 'sans-serif'],
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'pulse-effect': 'pulseEffect 8s infinite alternate',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};

export default config;
```

### Step 3.3: Add Static Assets

Create the following directory structure and add placeholder files:

```
public/
├── images/
│   ├── abco-logo.png
│   ├── abco-new-sleak.png
│   ├── abco-watercolor.png
│   ├── blue-ohmni-owl.png
│   ├── ohmni-blue-owl-lightning.png
│   ├── owl-lab.png
│   ├── owl-mini-blueprint.png
│   ├── owl-upload-final.png
│   └── perfect-thorr-chatbot.png
└── favicon.ico
```

**Note**: For now, create placeholder images or use temporary images. You'll replace these with the actual ABCO assets later.

---

## 4. Authentication System

### Step 4.1: Configure NextAuth

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

### Step 4.2: Create Session Provider

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

### Step 4.3: Create Auth Hooks

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

### Step 4.4: Create Login Page

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

### Step 4.5: Create Register Page

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

## 5. Layout Components

### Step 5.1: Create Header Component

Create `components/layout/Header.tsx`:

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, LightbulbIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

export function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Don't show header on auth pages
  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-50 h-14 bg-abco-navy border-b-2 border-accent-blue shadow-lg">
      <div className="flex items-center justify-between px-4 h-full">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          {pathname !== '/' && (
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-white md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          
          {/* Brand Container */}
          <Link href="/" className="flex flex-col justify-center">
            <div className="brand-name">ABCO AI</div>
            <div className="brand-subtitle">Electrical Construction</div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center">
          <Link href="/" className="nav-link">Home</Link>
          <Link href="/construction" className="nav-link">Construction Management</Link>
          <Link href="/chat" className="nav-link">Chat</Link>
        </nav>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          <button className="text-white hover:text-electric-blue transition-colors">
            <LightbulbIcon className="w-5 h-5" />
          </button>
          
          {user ? (
            <button onClick={logout} className="nav-link">
              Logout
            </button>
          ) : (
            <Link href="/login" className="nav-link">
              Login
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <nav className="md:hidden bg-abco-navy border-t border-accent-blue/20 px-4 py-2">
          <Link href="/" className="block nav-link py-2">Home</Link>
          <Link href="/construction" className="block nav-link py-2">Construction Management</Link>
          <Link href="/chat" className="block nav-link py-2">Chat</Link>
        </nav>
      )}
    </header>
  );
}
```

### Step 5.2: Create Footer Component

Create `components/layout/Footer.tsx`:

```typescript
import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="bg-abco-navy text-txt-light p-8 mt-auto">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="nav-col">
          <h6 className="text-sm font-semibold mb-4 uppercase tracking-wide">LINKS</h6>
          <ul className="space-y-2">
            <li>
              <Link href="/" className="hover:text-white transition-colors">
                Home
              </Link>
            </li>
            <li>
              <Link href="/chat" className="hover:text-white transition-colors">
                Chat
              </Link>
            </li>
            <li>
              <Link href="/construction" className="hover:text-white transition-colors">
                Construction
              </Link>
            </li>
          </ul>
        </div>

        <div className="logo-col flex justify-center items-center">
          <Image
            src="/images/abco-new-sleak.png"
            alt="ABCO logo"
            width={150}
            height={60}
            className="h-16 w-auto"
          />
        </div>

        <div className="res-col">
          <h6 className="text-sm font-semibold mb-4 uppercase tracking-wide">RESOURCES</h6>
          <ul className="space-y-2">
            <li>
              <Link href="#" className="hover:text-white transition-colors">
                NEC Code
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:text-white transition-colors">
                Standards
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:text-white transition-colors">
                Safety
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="text-center mt-8 pt-4 border-t border-gray-600">
        <small>&copy;2025 ABCO Electrical Construction and Design LLC</small>
      </div>
    </footer>
  );
}
```

### Step 5.3: Create Root Layout

Update `app/layout.tsx`:

```typescript
import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Providers } from '@/components/providers/SessionProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'ABCO AI - Electrical Construction Assistant',
  description: 'AI-powered assistant for electrical contractors',
  manifest: '/manifest.json',
  themeColor: '#081827',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Providers>
          <Header />
          <main className="flex-1 pt-14">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
```

### Step 5.4: Create Protected Route Middleware

Create `middleware.ts` in the root directory:

```typescript
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ['/chat/:path*', '/construction/:path*'],
};
```

---

## 6. Home Page Implementation

### Step 6.1: Create Feature Card Component

Create `components/home/FeatureCard.tsx`:

```typescript
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  href: string;
  buttonText: string;
  delay?: string;
  isUpload?: boolean;
}

export function FeatureCard({
  icon,
  title,
  description,
  href,
  buttonText,
  delay = '0s',
  isUpload = false,
}: FeatureCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    if (isUpload) {
      e.preventDefault();
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (isUpload) {
      const files = Array.from(e.dataTransfer.files);
      // TODO: Handle file upload
      console.log('Files dropped:', files);
    }
  };

  const content = (
    <div
      className={`feature-card glass-card p-6 text-center transform transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${
        isDragging ? 'border-electric-blue scale-105' : ''
      }`}
      style={{ animationDelay: delay }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="icon-wrapper mb-4 flex justify-center">
        <Image
          src={icon}
          alt={title}
          width={80}
          height={80}
          className="opacity-90 hover:opacity-100 transition-opacity"
        />
      </div>
      
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-text-secondary mb-4">{description}</p>
      
      <button className="btn-primary text-sm px-4 py-2">
        {buttonText}
      </button>
    </div>
  );

  if (isUpload) {
    return <div className="animate-fadeInUp">{content}</div>;
  }

  return (
    <Link href={href} className="block animate-fadeInUp">
      {content}
    </Link>
  );
}
```

### Step 6.2: Create Home Page

Create `app/page.tsx`:

```typescript
'use client';

import { useSession } from 'next-auth/react';
import { FeatureCard } from '@/components/home/FeatureCard';

export default function HomePage() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(' ')[0];

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

---

## 7. Chat Interface

### Step 7.1: Create Chat Store

Create `store/chatStore.ts`:

```typescript
import { create } from 'zustand';
import { ChatSession, ChatMessage } from '@/types/api';

interface ChatStore {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  
  // Actions
  setSessions: (sessions: ChatSession[]) => void;
  setCurrentSession: (session: ChatSession | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, content: string) => void;
  setIsLoading: (loading: boolean) => void;
  setIsStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  sessions: [],
  currentSession: null,
  messages: [],
  isLoading: false,
  isStreaming: false,
  error: null,
  
  setSessions: (sessions) => set({ sessions }),
  setCurrentSession: (session) => set({ currentSession: session }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),
  updateMessage: (id, content) => set((state) => ({
    messages: state.messages.map((msg) =>
      msg.id === id ? { ...msg, content } : msg
    ),
  })),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
  setError: (error) => set({ error }),
  reset: () => set({
    sessions: [],
    currentSession: null,
    messages: [],
    isLoading: false,
    isStreaming: false,
    error: null,
  }),
}));
```

### Step 7.2: Create Chat Service

Create `services/chatService.ts`:

```typescript
import { api } from '@/lib/api';
import { ChatSession, ChatMessage } from '@/types/api';

export class ChatService {
  // Session management
  async getSessions(): Promise<ChatSession[]> {
    return api.get('/api/chat/sessions');
  }

  async createSession(name?: string): Promise<ChatSession> {
    return api.post('/api/chat/sessions', { name });
  }

  async getSession(id: string): Promise<ChatSession> {
    return api.get(`/api/chat/sessions/${id}`);
  }

  async deleteSession(id: string): Promise<void> {
    return api.delete(`/api/chat/sessions/${id}`);
  }

  async renameSession(id: string, name: string): Promise<ChatSession> {
    return api.put(`/api/chat/sessions/${id}/rename`, { name });
  }

  async bulkDeleteSessions(ids: string[]): Promise<void> {
    return api.post('/api/chat/sessions/bulk-delete', { ids });
  }

  // Messages
  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    return api.get(`/api/chat/sessions/${sessionId}/messages`);
  }

  async sendMessage(sessionId: string, message: string): Promise<ChatMessage> {
    return api.post('/api/chat/message', { 
      session_id: sessionId, 
      message 
    });
  }

  // Streaming chat
  async streamMessage(
    sessionId: string, 
    message: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/${sessionId}/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await import('next-auth/react')).getSession()?.accessToken}`,
          },
          body: JSON.stringify({ message }),
        }
      );

      if (!response.ok) {
        throw new Error(`Stream error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Stream not available');

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                onChunk(data.content);
              }
            } catch (e) {
              // Handle non-JSON data
              const content = line.slice(6);
              if (content && content !== '[DONE]') {
                onChunk(content);
              }
            }
          }
        }
      }

      onComplete();
    } catch (error) {
      onError(error as Error);
    }
  }
}

export const chatService = new ChatService();
```

### Step 7.3: Create Chat Sidebar Component

Create `components/chat/ChatSidebar.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { PlusCircle, Folder, Star, Trash2, Edit2 } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { chatService } from '@/services/chatService';
import { ChatSession } from '@/types/api';

export function ChatSidebar() {
  const { sessions, currentSession, setSessions, setCurrentSession } = useChatStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

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

  const createNewChat = async () => {
    try {
      const session = await chatService.createSession('New Chat');
      setSessions([session, ...sessions]);
      setCurrentSession(session);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const selectSession = (session: ChatSession) => {
    setCurrentSession(session);
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Delete this chat session?')) return;

    try {
      await chatService.deleteSession(id);
      setSessions(sessions.filter(s => s.id !== id));
      
      if (currentSession?.id === id) {
        setCurrentSession(null);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  return (
    <div className="w-[230px] min-w-[230px] bg-deep-navy border-r border-electric-blue/20 text-text-secondary flex flex-col h-full overflow-y-auto custom-scrollbar">
      {/* Fixed Top Section */}
      <div className="flex-shrink-0">
        {/* New Chat Button */}
        <button
          onClick={createNewChat}
          className="m-3 flex items-center gap-3 w-[calc(100%-1.5rem)] p-3 bg-transparent border border-electric-blue/30 rounded-lg text-text-primary hover:bg-surface-elevated transition-colors"
        >
          <PlusCircle className="w-5 h-5" />
          <span>New chat</span>
        </button>
        
        {/* Starred Section */}
        <div className="mb-0 pb-0">
          <div className="text-xs font-semibold text-text-secondary px-3 py-2 uppercase tracking-wide">
            Starred
          </div>
          <div className="px-2 mb-0">
            <div className="text-sm text-text-secondary/70 text-center py-2">
              No starred conversations
            </div>
          </div>
        </div>
        
        {/* Projects Section */}
        <div className="mb-0 pb-0">
          <div className="text-xs font-semibold text-text-secondary px-3 py-2 uppercase tracking-wide">
            Projects
          </div>
          <div className="px-2 mb-0">
            <button className="w-full flex items-center gap-3 p-2 rounded hover:bg-surface-elevated transition-colors">
              <Folder className="w-4 h-4" />
              <span className="text-sm">My Jobs</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Scrollable Chats Section */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="text-xs font-semibold text-text-secondary px-3 py-2 uppercase tracking-wide flex-shrink-0">
          Chats
        </div>
        <div className="flex-1 overflow-y-auto px-2 min-h-0">
          {isLoading ? (
            <div className="text-sm text-text-secondary/70 text-center py-3">
              Loading...
            </div>
          ) : sessions.length > 0 ? (
            sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => selectSession(session)}
                className={`group w-full flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                  currentSession?.id === session.id
                    ? 'bg-surface-elevated'
                    : 'hover:bg-surface-elevated'
                }`}
              >
                <span className="text-sm truncate flex-1">{session.name}</span>
                <button
                  onClick={(e) => deleteSession(session.id, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          ) : (
            <div className="text-sm text-text-secondary/70 text-center py-3">
              No chat sessions yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Step 7.4: Create Chat Message Component

Create `components/chat/ChatMessage.tsx`:

```typescript
import { ChatMessage as ChatMessageType } from '@/types/api';
import { useSession } from 'next-auth/react';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { data: session } = useSession();
  const isUser = message.role === 'user';

  return (
    <div className={`message-wrapper mb-6 ${isUser ? 'flex justify-end' : ''}`}>
      <div
        className={`message max-w-[80%] p-4 rounded-lg ${
          isUser
            ? 'bg-user-bubble text-white'
            : 'bg-surface-elevated text-text-primary border border-border-subtle'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div
              className={`w-8 h-8 rounded flex items-center justify-center text-sm font-medium ${
                isUser ? 'bg-white/20' : 'bg-electric-blue/20'
              }`}
            >
              {isUser
                ? session?.user?.name?.slice(0, 2).toUpperCase() || 'U'
                : 'AI'}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium mb-1 opacity-80">
              {isUser ? 'You' : 'OHMNI Oracle'}
            </div>
            <div className="prose prose-invert max-w-none">
              {message.content}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Step 7.5: Create Chat Input Component

Create `components/chat/ChatInput.tsx`:

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, Zap } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onFileUpload?: (file: File) => void;
  onVoiceRecord?: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function ChatInput({
  onSendMessage,
  onFileUpload,
  onVoiceRecord,
  isStreaming,
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [deepThinking, setDeepThinking] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (message.trim() && !disabled && !isStreaming) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
  };

  const handleVoiceRecord = () => {
    if (onVoiceRecord) {
      setIsRecording(!isRecording);
      onVoiceRecord();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-dark-bg via-dark-bg to-transparent">
      <div className="max-w-[780px] mx-auto">
        <form
          onSubmit={handleSubmit}
          className="glass-card p-4 border-electric-blue/30 shadow-2xl"
        >
          {/* Deep Thinking Toggle */}
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={deepThinking}
                onChange={(e) => setDeepThinking(e.target.checked)}
                className="w-4 h-4 rounded border-electric-blue/30 bg-surface-elevated checked:bg-electric-blue"
              />
              <span className="text-sm text-text-secondary flex items-center gap-1">
                <Zap className="w-4 h-4" />
                Deep thinking mode
              </span>
            </label>
          </div>

          {/* Input Area */}
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about electrical codes, safety, or construction..."
                className="w-full min-h-[60px] max-h-[200px] p-3 pr-12 bg-surface-elevated border border-border-subtle rounded-lg text-text-primary placeholder-text-secondary resize-none focus:border-electric-blue focus:outline-none focus:ring-2 focus:ring-electric-blue/20"
                disabled={disabled || isStreaming}
                rows={1}
              />
              
              {/* Character count */}
              <div className="absolute bottom-3 right-3 text-xs text-text-secondary">
                {message.length}/2000
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {/* File Upload */}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept="image/*,.pdf"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isStreaming}
                className="p-3 rounded-lg bg-surface-elevated border border-border-subtle text-text-secondary hover:text-electric-blue hover:border-electric-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              {/* Voice Record */}
              <button
                type="button"
                onClick={handleVoiceRecord}
                disabled={disabled || isStreaming}
                className={`p-3 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  isRecording
                    ? 'bg-red-500 border-red-500 text-white animate-pulse'
                    : 'bg-surface-elevated border-border-subtle text-text-secondary hover:text-electric-blue hover:border-electric-blue'
                }`}
              >
                <Mic className="w-5 h-5" />
              </button>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!message.trim() || disabled || isStreaming}
                className="p-3 rounded-lg bg-electric-blue text-white hover:bg-electric-glow transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### Step 7.6: Create Main Chat Page

Create `app/chat/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { chatService } from '@/services/chatService';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatMessage as ChatMessageType } from '@/types/api';

const PROMPT_SUGGESTIONS = [
  { icon: '⚡', text: 'Explain electrical load calculations for a 2000 sq ft residential building' },
  { icon: '🛡️', text: 'Help me understand OSHA requirements for scaffolding on a commercial project' },
  { icon: '📋', text: 'Draft a project plan timeline for kitchen renovation with electrical work' },
  { icon: '♻️', text: 'What are the best practices for managing construction waste?' },
];

export default function ChatPage() {
  const {
    currentSession,
    messages,
    isStreaming,
    setMessages,
    addMessage,
    updateMessage,
    setIsStreaming,
  } = useChatStore();

  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (currentSession) {
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [currentSession]);

  const loadMessages = async () => {
    if (!currentSession) return;

    try {
      const data = await chatService.getMessages(currentSession.id);
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const sendMessage = async (content: string) => {
    if (!currentSession) {
      // Create a new session if none exists
      try {
        const session = await chatService.createSession('New Chat');
        // Update store will trigger re-render and load messages
        return;
      } catch (error) {
        console.error('Failed to create session:', error);
        return;
      }
    }

    // Add user message
    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
      sessionId: currentSession.id,
    };
    addMessage(userMessage);

    // Create AI message placeholder
    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: ChatMessageType = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      sessionId: currentSession.id,
    };
    addMessage(aiMessage);
    setStreamingMessageId(aiMessageId);
    setIsStreaming(true);

    // Stream the response
    try {
      await chatService.streamMessage(
        currentSession.id,
        content,
        (chunk) => {
          // Update the AI message with streaming content
          updateMessage(aiMessageId, (prev) => prev + chunk);
        },
        () => {
          // Streaming complete
          setIsStreaming(false);
          setStreamingMessageId(null);
        },
        (error) => {
          console.error('Streaming error:', error);
          updateMessage(aiMessageId, 'Sorry, I encountered an error processing your request.');
          setIsStreaming(false);
          setStreamingMessageId(null);
        }
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsStreaming(false);
      setStreamingMessageId(null);
    }
  };

  const handlePromptClick = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-dark-bg">
      {/* Sidebar */}
      <ChatSidebar />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        {/* Content Container */}
        <div className="chat-content bg-dark-bg relative overflow-hidden flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center custom-scrollbar">
          {/* Background Effect */}
          <div
            className="absolute inset-0 opacity-[0.07] z-0 pointer-events-none"
            style={{
              backgroundImage: "url('/images/ohmni-blue-owl-lightning.png')",
              backgroundSize: 'cover',
            }}
          />

          {/* Messages Container */}
          <div className="relative z-10 w-full max-w-[780px] mx-auto p-5 pb-[180px]">
            <div className="chat-messages w-full">
              {/* Prompt Suggestions (shows when no messages) */}
              {messages.length === 0 && (
                <div className="glass-card p-6 mb-6">
                  <h3 className="text-xl font-semibold text-white mb-4">
                    Suggested Prompts
                  </h3>
                  <div className="space-y-3">
                    {PROMPT_SUGGESTIONS.map((prompt, index) => (
                      <button
                        key={index}
                        onClick={() => handlePromptClick(prompt.text)}
                        className="w-full text-left p-3 rounded-lg bg-surface-elevated hover:bg-border-subtle transition-colors group"
                      >
                        <span className="mr-3 text-xl">{prompt.icon}</span>
                        <span className="text-text-secondary group-hover:text-text-primary">
                          {prompt.text}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Messages */}
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}

              {/* Streaming Indicator */}
              {isStreaming && streamingMessageId && (
                <div className="text-center text-text-secondary text-sm animate-pulse">
                  OHMNI Oracle is thinking...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fixed Footer with Input */}
        <ChatInput
          onSendMessage={sendMessage}
          isStreaming={isStreaming}
          disabled={!currentSession && messages.length === 0}
        />
      </div>
    </div>
  );
}
```

---

## 8. Construction Management Page

### Step 8.1: Create Integration Card Component

Create `components/construction/IntegrationCard.tsx`:

```typescript
import { Check, ExternalLink } from 'lucide-react';

interface IntegrationCardProps {
  title: string;
  description: string;
  features: string[];
  learnMoreUrl: string;
}

export function IntegrationCard({
  title,
  description,
  features,
  learnMoreUrl,
}: IntegrationCardProps) {
  return (
    <div className="glass-card p-6 hover:border-electric-blue transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-2xl font-semibold text-white">{title}</h3>
        <span className="bg-yellow-500/20 text-yellow-300 text-xs px-2 py-1 rounded">
          Coming Soon
        </span>
      </div>
      
      <p className="text-text-secondary mb-4">{description}</p>
      
      <ul className="space-y-2 mb-4">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            <Check className="w-5 h-5 text-electric-blue flex-shrink-0 mt-0.5" />
            <span className="text-text-secondary text-sm">{feature}</span>
          </li>
        ))}
      </ul>
      
      <a
        href={learnMoreUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-electric-blue hover:text-electric-glow transition-colors"
      >
        Learn more
        <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  );
}
```

### Step 8.2: Create Construction Management Page

Create `app/construction/page.tsx`:

```typescript
'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { IntegrationCard } from '@/components/construction/IntegrationCard';

export default function ConstructionPage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-dark-bg relative overflow-hidden">
      {/* Background Effect */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: "url('/images/ohmni-blue-owl-lightning.png')",
          backgroundSize: 'cover',
        }}
      />

      <div className="relative z-10 max-w-[1000px] mx-auto p-8">
        {/* Title Section */}
        <div className="text-center mb-12">
          <h1 className="text-white text-4xl font-bold mb-4 text-glow">
            Construction Management Integration
          </h1>
          <p className="text-text-secondary text-xl max-w-[700px] mx-auto mb-6">
            Connect your AI assistant with popular construction management software
          </p>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 btn-primary"
          >
            <ArrowLeft className="w-5 h-5" />
            Return to Chat
          </Link>
        </div>

        {/* Integration Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          <IntegrationCard
            title="Procore"
            description="Connect with Procore to manage all your construction projects, tasks, documents, and resources."
            features={[
              'Project management and overview',
              'Task assignment and tracking',
              'Document access and management',
              'Resource allocation and scheduling',
            ]}
            learnMoreUrl="https://www.procore.com/"
          />

          <IntegrationCard
            title="Fieldwire"
            description="Integrate with Fieldwire to streamline field operations, task management, and drawing access."
            features={[
              'Field operations management',
              'Task creation and assignment',
              'Drawing and plan access',
              'Field reporting and documentation',
            ]}
            learnMoreUrl="https://www.fieldwire.com/"
          />

          <IntegrationCard
            title="BuilderTrend"
            description="Connect with BuilderTrend for comprehensive project management and client communication."
            features={[
              'Customer management',
              'Project scheduling',
              'Budget tracking',
              'Photo and file sharing',
            ]}
            learnMoreUrl="https://buildertrend.com/"
          />

          <div className="glass-card p-6 flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-2xl font-semibold text-white mb-2">
                More Integrations
              </h3>
              <p className="text-text-secondary">
                Additional construction management tools coming soon...
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 9. File Upload & Voice Recording

### Step 9.1: Create File Upload Hook

Create `hooks/useFileUpload.ts`:

```typescript
import { useState } from 'react';
import { useSession } from 'next-auth/react';

interface UploadProgress {
  percentage: number;
  loaded: number;
  total: number;
}

export function useFileUpload() {
  const { data: session } = useSession();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (file: File): Promise<any> => {
    if (!session?.accessToken) {
      throw new Error('Authentication required');
    }

    // Validate file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Please upload an image or PDF file');
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('File size must be less than 10MB');
    }

    setIsUploading(true);
    setError(null);
    setProgress(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          setProgress({
            percentage,
            loaded: event.loaded,
            total: event.total,
          });
        }
      });

      const response = await new Promise((resolve, reject) => {
        xhr.open('POST', `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/upload`);
        xhr.setRequestHeader('Authorization', `Bearer ${session.accessToken}`);

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(formData);
      });

      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  const reset = () => {
    setProgress(null);
    setError(null);
  };

  return {
    uploadFile,
    isUploading,
    progress,
    error,
    reset,
  };
}
```

### Step 9.2: Create Voice Recording Hook

Create `hooks/useVoiceRecording.ts`:

```typescript
import { useState, useRef, useCallback } from 'react';

export function useVoiceRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setError(null);
      
      // Start duration timer
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 100);
      
    } catch (err) {
      setError('Microphone permission denied');
      console.error('Failed to start recording:', err);
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current) {
        reject(new Error('No recording in progress'));
        return;
      }
      
      const mediaRecorder = mediaRecorderRef.current;
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        
        // Stop all tracks
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        
        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        setIsRecording(false);
        setDuration(0);
        mediaRecorderRef.current = null;
        
        resolve(blob);
      };
      
      mediaRecorder.stop();
    });
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setIsRecording(false);
    setDuration(0);
    chunksRef.current = [];
  }, []);

  return {
    isRecording,
    duration,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
```

---

## 10. PWA & Offline Support

### Step 10.1: Create Web App Manifest

Create `public/manifest.json`:

```json
{
  "name": "ABCO AI - Electrical Construction Assistant",
  "short_name": "ABCO AI",
  "description": "AI-powered assistant for electrical contractors",
  "theme_color": "#081827",
  "background_color": "#020B18",
  "display": "standalone",
  "orientation": "portrait",
  "scope": "/",
  "start_url": "/",
  "icons": [
    {
      "src": "/images/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/images/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/images/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/images/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/images/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/images/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/images/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/images/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### Step 10.2: Configure Next-PWA

Create `next.config.js`:

```javascript
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
          maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
        },
      },
    },
    {
      urlPattern: /^https:\/\/ohmni-backend\.onrender\.com\/api\/chat\/sessions$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'sessions-cache',
        networkTimeoutSeconds: 5,
      },
    },
    {
      urlPattern: /\.(png|jpg|jpeg|svg|gif|webp)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['ohmni-backend.onrender.com'],
  },
};

module.exports = withPWA(nextConfig);
```

### Step 10.3: Create Offline Queue Hook

Create `hooks/useOfflineQueue.ts`:

```typescript
import { useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface QueuedRequest {
  id: string;
  endpoint: string;
  method: string;
  body?: any;
  timestamp: number;
}

const QUEUE_KEY = 'abco_offline_queue';

export function useOfflineQueue() {
  const { data: session } = useSession();

  const queueRequest = useCallback((request: Omit<QueuedRequest, 'id' | 'timestamp'>) => {
    const queued: QueuedRequest = {
      ...request,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };

    const existing = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    localStorage.setItem(QUEUE_KEY, JSON.stringify([...existing, queued]));

    // Show notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('ABCO AI - Offline Mode', {
        body: 'Your request will be sent when connection is restored',
        icon: '/images/icon-192x192.png',
      });
    }
  }, []);

  const processQueue = useCallback(async () => {
    if (!session?.accessToken) return;

    const queue: QueuedRequest[] = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    if (queue.length === 0) return;

    const processed: string[] = [];

    for (const request of queue) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${request.endpoint}`, {
          method: request.method,
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: request.body ? JSON.stringify(request.body) : undefined,
        });

        processed.push(request.id);
      } catch (error) {
        console.error('Failed to process queued request:', error);
        break; // Stop processing on failure
      }
    }

    // Remove processed requests
    const remaining = queue.filter(r => !processed.includes(r.id));
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));

    if (processed.length > 0) {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('ABCO AI - Back Online', {
          body: `Synced ${processed.length} offline requests`,
          icon: '/images/icon-192x192.png',
        });
      }
    }
  }, [session?.accessToken]);

  useEffect(() => {
    const handleOnline = () => {
      processQueue();
    };

    window.addEventListener('online', handleOnline);
    
    // Process queue on mount if online
    if (navigator.onLine) {
      processQueue();
    }

    return () => window.removeEventListener('online', handleOnline);
  }, [processQueue]);

  return {
    queueRequest,
    isOffline: !navigator.onLine,
  };
}
```

---

## 11. Deployment to Production

### Step 11.1: Prepare for Deployment

1. **Generate Production Environment Variables**:
```bash
# Generate a secure NEXTAUTH_SECRET
openssl rand -base64 32
```

2. **Update `.env.production`**:
```env
NEXT_PUBLIC_BACKEND_URL=https://ohmni-backend.onrender.com
NEXTAUTH_URL=https://your-app-name.vercel.app
NEXTAUTH_SECRET=your-generated-secret-here
```

### Step 11.2: Deploy to Vercel

1. **Install Vercel CLI**:
```bash
npm i -g vercel
```

2. **Deploy**:
```bash
# In your project directory
vercel

# Follow the prompts:
# - Set up and deploy: Y
# - Which scope: Your account
# - Link to existing project: N
# - Project name: abco-ai-frontend
# - Directory: ./
# - Build Command: (default)
# - Output Directory: (default)
# - Development Command: (default)
```

3. **Set Environment Variables in Vercel Dashboard**:
- Go to https://vercel.com/dashboard
- Select your project
- Go to Settings → Environment Variables
- Add all variables from `.env.production`

### Step 11.3: Configure Backend CORS

**CRITICAL**: Update your Flask backend to accept requests from your Vercel domain:

1. In your Render dashboard, add environment variable:
```
FRONTEND_VERCEL_URL=https://your-app-name.vercel.app
```

2. Trigger a redeploy on Render

### Step 11.4: Post-Deployment Checklist

- [ ] Frontend loads without errors
- [ ] Login/Register functionality works
- [ ] JWT tokens are properly handled
- [ ] Chat interface connects to backend
- [ ] File uploads work correctly
- [ ] PWA installs on mobile devices
- [ ] Offline mode queues requests
- [ ] All API endpoints respond correctly
- [ ] No CORS errors in console

---

## Final Testing & Verification

### Desktop Testing:
1. Open Chrome DevTools
2. Check Network tab for any failed requests
3. Check Console for any errors
4. Test all major features

### Mobile Testing:
1. Open on mobile browser
2. Add to home screen
3. Test offline functionality
4. Verify responsive design

### Performance Testing:
1. Run Lighthouse audit
2. Check Core Web Vitals
3. Verify image optimization
4. Test loading times

---

## Troubleshooting Guide

### Common Issues:

**1. Authentication Not Working**
- Verify NEXTAUTH_SECRET is set
- Check backend /api/auth/login endpoint
- Ensure cookies are enabled

**2. CORS Errors**
- Backend must have your Vercel URL in allowed origins
- Check for trailing slashes in URLs
- Verify headers are correct

**3. Chat Not Streaming**
- SSE endpoint must be implemented in backend
- Check for proxy/firewall blocking SSE
- Verify authentication headers

**4. File Upload Failing**
- Check file size limits
- Verify multipart/form-data support
- Ensure proper authentication

---

## Congratulations! 🎉

You've successfully built and deployed the ABCO AI frontend application. The app is now ready for electricians to use in the field, with offline support, real-time chat, and all the features they need to work more efficiently.

**Next Steps:**
1. Gather user feedback
2. Monitor error logs
3. Optimize performance based on usage
4. Add new features as needed

Remember: This is an MVP designed to scale. As you grow from 100 to 10,000+ users, the architecture will support your growth.

Built by electricians. Powered by AI. 🚀