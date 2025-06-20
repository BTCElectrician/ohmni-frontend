'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function useAuth() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = async (email: string, password: string, remember: boolean = false) => {
    setIsLoading(true)
    setError(null)

    try {
      const { signIn } = await import('next-auth/react')
      
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error === 'CredentialsSignin' ? 'Invalid email or password' : result.error)
        return false
      }

      if (result?.ok) {
        if (remember) {
          localStorage.setItem('rememberMe', 'true')
          localStorage.setItem('rememberedEmail', email)
        } else {
          localStorage.removeItem('rememberMe')
          localStorage.removeItem('rememberedEmail')
        }

        router.push('/')
        return true
      }

      return false
    } catch (err) {
      console.error('Login error:', err)
      setError('An unexpected error occurred')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    const { signOut } = await import('next-auth/react')
    await signOut({ redirect: true, callbackUrl: '/login' })
  }

  return {
    user: session?.user,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading' || isLoading,
    error,
    login,
    logout,
  }
} 