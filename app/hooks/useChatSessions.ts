'use client';

import { useQuery } from '@tanstack/react-query';
import { ChatSession } from '@/types/api';
import { useSession } from 'next-auth/react';

export function useChatSessions() {
  const { status } = useSession();

  return useQuery<ChatSession[]>({
    queryKey: ['chat-sessions'],
    queryFn: async () => {
      const { ChatService } = await import('@/services/chatService');
      const chatService = new ChatService();
      return chatService.getSessions();
    },
    staleTime: 60 * 1000,        // Consider fresh for 60 seconds
    gcTime: 5 * 60 * 1000,       // Keep in cache for 5 minutes
    enabled: status === 'authenticated', // ✅ only run if logged in
    retry: (failureCount, error) => {
      // Don't retry auth errors
      if (error instanceof Error && error.message.includes('Authentication')) return false;
      // Don't retry 4xx errors
      if (error instanceof Error && error.message.includes('4')) return false;
      // Retry others up to 3 times
      return failureCount < 3;
    },
    // Handle offline scenarios
    networkMode: 'offlineFirst',
  });
} 