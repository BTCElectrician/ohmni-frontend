'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'
import { authOptions } from '@/app/lib/auth'

interface ProvidersProps {
  children: ReactNode
}

export function SessionProvider({ children }: ProvidersProps) {
  return (
    <NextAuthSessionProvider session={null}>
      {children}
    </NextAuthSessionProvider>
  )
} 