import React from 'react'
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { SessionProvider } from './components/providers/SessionProvider'
import { QueryProvider } from './components/providers/QueryProvider'
import { Toaster } from 'react-hot-toast'

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
          <QueryProvider>
            <main className="min-h-screen bg-dark-bg text-text-primary">
              {children}
            </main>
            <Toaster 
              position="bottom-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1F2937',
                  color: '#F3F4F6',
                  border: '1px solid #374151',
                },
                error: {
                  style: {
                    background: '#991B1B',
                    color: '#FEE2E2',
                  },
                },
                success: {
                  style: {
                    background: '#166534',
                    color: '#BBF7D0',
                  },
                },
              }}
            />
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  )
} 