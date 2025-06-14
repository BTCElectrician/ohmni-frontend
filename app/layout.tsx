import React from 'react'
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { SessionProvider } from './components/providers/SessionProvider'
import { SessionDebug } from '@/components/debug/SessionDebug'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Ohmni Frontend',
  description: 'ABCO AI Application Frontend',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          <main className="min-h-screen bg-dark-bg text-text-primary">
            {children}
          </main>
          <SessionDebug />
        </SessionProvider>
      </body>
    </html>
  )
} 