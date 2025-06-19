import { useSession } from 'next-auth/react';

export function useAccessToken(): string | null {
  const { data: session } = useSession();
  return session?.accessToken ?? null;
} 