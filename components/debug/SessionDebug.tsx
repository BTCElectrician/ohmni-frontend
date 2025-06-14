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