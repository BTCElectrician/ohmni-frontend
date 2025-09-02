'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useAuth } from '@/app/hooks/useAuth'
import { Eye, EyeOff } from 'lucide-react'

// Render ApiDebug only on the client to avoid SSR/hydration issues
const ApiDebug = dynamic(() => import('@/components/debug/ApiDebug'), { ssr: false })

export default function LoginPage() {
  const { login, isLoading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    // Check for remembered email
    const remembered = localStorage.getItem('rememberMe') === 'true'
    const rememberedEmail = localStorage.getItem('rememberedEmail')
    
    if (remembered && rememberedEmail) {
      setEmail(rememberedEmail)
      setRememberMe(true)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await login(email, password, rememberMe)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg relative overflow-hidden" suppressHydrationWarning>
      <ApiDebug />
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

      {/* Glassmorphism Card */}
      <div className="relative z-30 w-full max-w-md p-4">
        <div className="glass-card p-8 bg-black/60 backdrop-blur-md rounded-2xl shadow-2xl border border-electric-blue/30">
          <h2 className="text-center uppercase mb-2 text-accent-blue text-3xl font-extrabold tracking-wider drop-shadow-lg">
            OHMNI ORACLE
          </h2>
          <p className="text-center italic mb-6 text-text-secondary text-base">
            {`"We handle it all, the rest is just decor."`}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-control w-full py-3 pl-4 pr-12 rounded-lg bg-[#181f2a]/80 text-white placeholder:text-text-secondary border border-border-subtle focus:border-electric-blue focus:ring-2 focus:ring-electric-blue/30 transition"
                placeholder="Enter your email"
                required
                disabled={isLoading}
                autoComplete="email"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-electric-blue">
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-mail"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg>
              </span>
            </div>

            {/* Password Field */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-control w-full py-3 pl-4 pr-12 rounded-lg bg-[#181f2a]/80 text-white placeholder:text-text-secondary border border-border-subtle focus:border-electric-blue focus:ring-2 focus:ring-electric-blue/30 transition"
                placeholder="Enter your password"
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-electric-blue focus:outline-none"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
              </button>
            </div>

            {/* Remember Me */}
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-5 h-5 mr-2 accent-electric-blue rounded border border-border-subtle focus:ring-2 focus:ring-electric-blue/30"
                disabled={isLoading}
                id="rememberMe"
              />
              <label htmlFor="rememberMe" className="text-white text-sm select-none cursor-pointer">
                Remember Me
              </label>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded mb-2 text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 text-lg font-bold rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>

            <div className="flex justify-between mt-3 text-sm">
              <Link href="/register" className="text-electric-blue hover:text-electric-glow transition">
                New user? Register here
              </Link>
              <Link href="/reset-password" className="text-electric-blue hover:text-electric-glow transition">
                Forgot password?
              </Link>
            </div>
          </form>

          <p className="mt-8 text-center text-text-secondary italic text-sm">
            Built by electricians. Powered by AI.
          </p>
        </div>
      </div>
    </div>
  )
} 