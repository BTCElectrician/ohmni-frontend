import { getSession } from 'next-auth/react';
import type { AuthApiResponse } from '@/types/api';

export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  
  if (!session?.accessToken) {
    return null;
  }
  
  // Check if token needs refresh (example: check exp claim)
  // This depends on your JWT structure
  try {
    const payload = JSON.parse(atob(session.accessToken.split('.')[1]));
    const exp = payload.exp * 1000; // Convert to milliseconds
    
    if (Date.now() > exp - 5 * 60 * 1000) { // Refresh 5 min before expiry
      // Call refresh endpoint
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        const apiRes: AuthApiResponse = await response.json();
        if (apiRes.data?.access_token) {
          return apiRes.data.access_token;
        }
      }
    }
  } catch (e) {
    console.error('Token refresh error:', e);
  }
  
  return session.accessToken;
} 