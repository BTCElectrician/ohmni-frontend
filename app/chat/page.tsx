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

const PROMPT_SUGGESTIONS = [
  { icon: '⚡', text: 'Explain electrical load calculations for a 2000 sq ft residential building' },
  { icon: '🛡️', text: 'Help me understand OSHA requirements for scaffolding on a commercial project' },
  { icon: '📋', text: 'Draft a project plan timeline for kitchen renovation with electrical work' },
  { icon: '♻️', text: 'What are the best practices for managing construction waste?' },
];

export default function ChatPage() {
  const { status } = useSession();
  const router = useRouter();
  const {
    currentSession,
    messages,
    isStreaming,
    setMessages,
    addMessage,
    updateMessage,
    setIsStreaming,
    setCurrentSession,
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
        const session = await chatService.createSession('New Chat');
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
            // Show error toast or alert for other errors
            alert('Failed to start chat. Please try again.');
          }
        }
        return;
      }
    }

    sendMessageWithSession(currentSession.id, content);
  };

  const sendMessageWithSession = async (sessionId: string, content: string) => {
    // Add user message
    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
      sessionId: sessionId,
    };
    addMessage(userMessage);

    // Create AI message placeholder
    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: ChatMessageType = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      sessionId: sessionId,
    };
    addMessage(aiMessage);
    setStreamingMessageId(aiMessageId);
    setIsStreaming(true);

    // Try sending the message
    try {
      const response = await chatService.sendMessage(sessionId, content);
      updateMessage(aiMessageId, response.content || 'Message sent successfully!');
      setIsStreaming(false);
      setStreamingMessageId(null);
    } catch (error) {
      console.error('Failed to send message:', error);
      updateMessage(aiMessageId, 'Sorry, I encountered an error processing your request.');
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
    </div>
  );
} 