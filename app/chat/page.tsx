'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/store/chatStore';
import { chatService } from '@/services/chatService';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatMessage as ChatMessageType } from '@/types/api';
// import ApiDebug from '@/components/debug/ApiDebug';
import { toastFromApiError } from '@/lib/toast-helpers';
import { useQueryClient } from '@tanstack/react-query';

const PROMPT_SUGGESTIONS = [
  { icon: '⚡', text: 'Explain electrical load calculations for a 2000 sq ft residential building' },
  { icon: '🛡️', text: 'Help me understand OSHA requirements for scaffolding on a commercial project' },
  { icon: '📋', text: 'Draft a project plan timeline for kitchen renovation with electrical work' },
  { icon: '♻️', text: 'What are the best practices for managing construction waste?' },
];

export default function ChatPage() {
  const { status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    currentSession,
    messages,
    isStreaming,
    setMessages,
    addMessage,
    updateMessage,
    setIsStreaming,
    setCurrentSession,
    sessions,
  } = useChatStore();

  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const loadMessages = useCallback(async () => {
    if (!currentSession) return;

    try {
      const data = await chatService.getMessages(currentSession.id);
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages:', error);
      toastFromApiError(error);
    }
  }, [currentSession, setMessages]);

  useEffect(() => {
    if (currentSession) {
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [currentSession, setMessages, loadMessages]);

  const sendMessage = async (content: string) => {
    if (!currentSession) {
      // Create a new session if none exists
      try {
        console.log('No current session, creating new one...');
        const session = await chatService.createSession('New Chat');
        console.log('New session created:', session);
        
        // Verify session has an id
        if (!session || !session.id) {
          throw new Error('Failed to create session - invalid response');
        }
        
        // Set the session in the store so it can be used immediately
        setCurrentSession(session);
        // Now send the message with the new session
        sendMessageWithSession(session.id, content);
        return;
      } catch (error) {
        console.error('Failed to create session:', error);
        
        // Show user-friendly error
        if (error instanceof Error) {
          if (error.message.includes('Authentication required')) {
            // Redirect to login if auth failed
            router.push('/login?error=session_expired');
          } else {
            // Show error toast for other errors
            toastFromApiError(error);
          }
        } else {
          toastFromApiError(new Error('Failed to start chat. Please try again.'));
        }
        return;
      }
    }

    sendMessageWithSession(currentSession.id, content);
  };

  const sendMessageWithSession = async (sessionId: string, content: string) => {
    // Check if this is the first message for auto-refresh functionality
    const isFirstMessage = messages.length === 0;
    
    // Add user message immediately for better UX
    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
      sessionId: sessionId,
    };
    addMessage(userMessage);

    // Create AI message placeholder with a temporary ID
    const tempAiMessageId = (Date.now() + 1).toString();
    const aiMessagePlaceholder: ChatMessageType = {
      id: tempAiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      sessionId: sessionId,
    };
    addMessage(aiMessagePlaceholder);
    setStreamingMessageId(tempAiMessageId);
    setIsStreaming(true);

    try {
      // Send message and get AI response
      const aiResponse = await chatService.sendMessage(sessionId, content);
      
      // Update the placeholder with the actual AI response
      // The backend returns the complete AI message with its own ID
      updateMessage(tempAiMessageId, aiResponse.content || 'Message sent successfully!');
      
      // Optionally, we could replace the entire message with the backend version
      // This would ensure we have the correct ID, timestamp, model info, etc.
      // But for now, just updating the content is sufficient
      
      setIsStreaming(false);
      setStreamingMessageId(null);
      
      // Reload messages to ensure we're in sync with backend
      // This will get both the user and AI messages with correct IDs
      if (currentSession) {
        loadMessages();
      }
      
      // If this was the first message, refresh sessions after a delay
      // to pick up the AI-generated title
      if (isFirstMessage) {
        setTimeout(() => {
          console.log('Refreshing sessions to pick up auto-generated title...');
          queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
        }, 2000); // Give backend time to generate and save title
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      updateMessage(tempAiMessageId, 'Sorry, I encountered an error processing your request.');
      toastFromApiError(error);
      setIsStreaming(false);
      setStreamingMessageId(null);
    }
  };

  const handlePromptClick = (prompt: string) => {
    sendMessage(prompt);
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-dark-bg">
      {/* Sidebar */}
      <ChatSidebar />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        {/* Logout Button - Top Right */}
        <button
          onClick={handleLogout}
          className="absolute top-4 right-4 z-50 px-4 py-2 text-sm bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 hover:border-red-400/50 text-red-300 hover:text-red-200 rounded-lg transition-all duration-200 backdrop-blur-sm"
        >
          Sign Out
        </button>

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
          disabled={false}
        />
      </div>

      {/* Debug Section */}
      {/* <ApiDebug /> */}
      
      {/* Session Debug Info */}
      {/* <div className="fixed bottom-4 left-4 bg-black/80 text-white p-4 rounded-lg shadow-lg z-50 max-w-md text-xs">
        <h3 className="font-bold mb-2">Session Debug</h3>
        <div className="space-y-1">
          <p><span className="text-yellow-400">Auth Status:</span> {status}</p>
          <p><span className="text-yellow-400">Current Session ID:</span> {currentSession?.id || 'None'}</p>
          <p><span className="text-yellow-400">Current Session Name:</span> {currentSession?.name || 'None'}</p>
          <p><span className="text-yellow-400">Total Sessions:</span> {sessions.length}</p>
          <p><span className="text-yellow-400">Is Streaming:</span> {isStreaming ? 'Yes' : 'No'}</p>
          <p><span className="text-yellow-400">Messages Count:</span> {messages.length}</p>
        </div>
        {currentSession && (
          <div className="mt-2 bg-gray-800 p-2 rounded">
            <pre className="text-xs overflow-x-auto">
              {JSON.stringify(currentSession, null, 2)}
            </pre>
          </div>
        )}
      </div> */}
    </div>
  );
} 