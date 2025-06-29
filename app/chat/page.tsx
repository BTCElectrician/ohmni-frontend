'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/store/chatStore';
import { chatService } from '@/services/chatService';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatMessage as ChatMessageType } from '@/types/api';
// import ApiDebug from '@/components/debug/ApiDebug';
import { toastFromApiError, toastSuccess } from '@/lib/toast-helpers';
import { useQueryClient } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import Image from 'next/image';

const PROMPT_SUGGESTIONS = [
  { 
    icon: '⚡', 
    text: 'Calculate wire size for 100A subpanel 150ft away',
    category: 'calculations'
  },
  { 
    icon: '🛡️', 
    text: 'NEC code for kitchen receptacle spacing',
    category: 'code'
  },
  { 
    icon: '🔍', 
    text: 'Troubleshoot flickering lights in bathroom',
    category: 'troubleshooting'
  },
  { 
    icon: '🧮', 
    text: 'Material list for 200A service upgrade',
    category: 'planning'
  },
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
  } = useChatStore();

  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [isCreatingNewSession, setIsCreatingNewSession] = useState(false);
  const [showPrompts, setShowPrompts] = useState(true);
  const [hasFirstMessage, setHasFirstMessage] = useState(false);
  
  // Track quota changes to reduce toast noise
  const lastQuotaRef = useRef<{ deep?: number; nuclear?: number }>({});

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
      // Don't load messages if we're in the middle of creating a new session
      // This prevents overwriting the first message
      if (!isCreatingNewSession) {
        loadMessages();
      }
    } else {
      setMessages([]);
    }
  }, [currentSession, setMessages, loadMessages, isCreatingNewSession]);

  // Reset prompts when switching to an empty chat
  useEffect(() => {
    if (messages.length === 0) {
      setShowPrompts(true);
    }
  }, [messages.length]);

  const sendMessage = async (
    content: string, 
    useDeepReasoning: boolean = false,
    useNuclear: boolean = false
  ) => {
    // Hide prompts once user starts chatting
    setShowPrompts(false);
    
    if (!currentSession) {
      // Create a new session if none exists
      try {
        console.log('No current session, creating new one...');
        setIsCreatingNewSession(true); // Set flag before creating session
        const session = await chatService.createSession('New Chat');
        console.log('New session created:', session);
        
        // Verify session has an id
        if (!session || !session.id) {
          throw new Error('Failed to create session - invalid response');
        }
        
        // Set the session in the store so it can be used immediately
        setCurrentSession(session);
        // Now send the message with the new session
        await sendMessageWithSession(session.id, content, useDeepReasoning, useNuclear);
        setIsCreatingNewSession(false); // Clear flag after message is sent
        return;
      } catch (error) {
        console.error('Failed to create session:', error);
        setIsCreatingNewSession(false); // Clear flag on error too
        
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

    sendMessageWithSession(currentSession.id, content, useDeepReasoning, useNuclear);
  };

  const sendMessageWithFile = async (content: string, file: File) => {
    if (!currentSession) {
      // Create session if needed (same as regular sendMessage)
      try {
        setIsCreatingNewSession(true);
        const session = await chatService.createSession('New Chat');
        setCurrentSession(session);
        await sendMessageWithFileToSession(session.id, content, file);
        setIsCreatingNewSession(false);
      } catch (error) {
        setIsCreatingNewSession(false);
        toastFromApiError(error);
      }
      return;
    }

    await sendMessageWithFileToSession(currentSession.id, content, file);
  };

  const sendMessageWithFileToSession = async (
    sessionId: string,
    content: string,
    file: File
  ) => {
    try {
      // Add user message with file
      const userMessage = await chatService.sendMessageWithFile(
        sessionId,
        content,
        file
      );
      
      // Add to messages immediately
      addMessage(userMessage);
      
      // The AI response will come through the existing SSE stream
      // No additional handling needed here
      
    } catch (error) {
      console.error('Failed to send image:', error);
      toastFromApiError(error);
    }
  };

  const sendMessageWithSession = async (
    sessionId: string, 
    content: string,
    useDeepReasoning: boolean = false,
    useNuclear: boolean = false
  ) => {
    // Track first message properly
    const isFirstMessage = !hasFirstMessage;
    if (!hasFirstMessage && messages.length > 0) {
      setHasFirstMessage(true);
    }
    
    // Add user message immediately for better UX
    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
      sessionId: sessionId,
      metadata: useNuclear 
        ? { nuclear_mode: true }
        : useDeepReasoning 
          ? { deep_reasoning: true } 
          : undefined
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
      const aiResponse = await chatService.sendMessage(
        sessionId, 
        content, 
        (chunk: string) => {
          // Update message content as chunks arrive
          updateMessage(tempAiMessageId, (prev) => prev + chunk);
        },
        useDeepReasoning,
        useNuclear
      );
      
      // The message content should already be updated via streaming
      // Only update if there's additional content or metadata
      if (!aiResponse.content) {
        updateMessage(tempAiMessageId, 'Message sent successfully!');
      }
      
      // Show quota information only if it changed
      if (aiResponse.metadata?.reasoning_remaining !== undefined && 
          aiResponse.metadata.reasoning_remaining !== lastQuotaRef.current.deep) {
        lastQuotaRef.current.deep = aiResponse.metadata.reasoning_remaining;
        toastSuccess(`Deep reasoning uses remaining today: ${aiResponse.metadata.reasoning_remaining}`);
      }
      
      if (aiResponse.metadata?.nuclear_remaining !== undefined && 
          aiResponse.metadata.nuclear_remaining !== lastQuotaRef.current.nuclear) {
        lastQuotaRef.current.nuclear = aiResponse.metadata.nuclear_remaining;
        toastSuccess(`Nuclear uses remaining today: ${aiResponse.metadata.nuclear_remaining}`);
      }
      
      // Log response metadata for debugging
      if (aiResponse.metadata) {
        console.log('Response metadata:', aiResponse.metadata);
      }
      
      setIsStreaming(false);
      setStreamingMessageId(null);
      
      // Invalidate with proper cache key
      if (currentSession) {
        queryClient.invalidateQueries({ 
          queryKey: ['messages', sessionId, useDeepReasoning, useNuclear] 
        });
        loadMessages();
      }
      
      // First message session refresh
      if (isFirstMessage) {
        setHasFirstMessage(true);
        setTimeout(() => {
          console.log('Refreshing sessions to pick up auto-generated title...');
          queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
        }, 2000);
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
        {/* Sign Out Button - Top Right */}
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
            className="absolute inset-0 opacity-[0.03] z-0 pointer-events-none"
            style={{
              backgroundImage: "url('/images/ohmni-blue-owl-lightning.png')",
              backgroundSize: 'cover',
            }}
          />

          {/* Messages Container */}
          <div className="relative z-10 w-full max-w-[780px] mx-auto p-5 pb-[180px]">
            <div className="chat-messages w-full">
              {/* Empty State with Prompts */}
              {messages.length === 0 && showPrompts && (
                <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fadeInUp">
                  {/* Welcome Message */}
                  <div className="text-center mb-8">
                    <div className="flex items-center justify-center mb-4">
                      <Image 
                        src="/images/perfect-thorr-chatbot.png" 
                        alt="Ohmni Oracle Owl" 
                        width={60} 
                        height={60}
                        className="animate-pulse"
                      />
                    </div>
                    <h3 className="text-4xl font-extrabold font-montserrat tracking-wide text-electric-blue drop-shadow-[0_2px_12px_rgba(20,157,234,0.5)] mb-2">
                      Ohmni Oracle
                    </h3>
                    <p className="text-text-secondary">
                      Your electrical brain boost—get instant answers, powered by AI.
                    </p>
                  </div>

                  {/* Prompt Pills - Vertical List */}
                  <div className="flex flex-col gap-3 items-center w-full max-w-lg">
                    {PROMPT_SUGGESTIONS.map((prompt, index) => (
                      <button
                        key={index}
                        onClick={() => handlePromptClick(prompt.text)}
                        className="group flex items-center gap-3 w-full px-5 py-3.5 rounded-xl bg-surface-elevated hover:bg-electric-blue/10 border border-border-subtle hover:border-electric-blue/40 transition-all duration-200 hover:translate-x-1"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <span className="text-electric-blue group-hover:text-electric-glow transition-colors text-xl flex-shrink-0">
                          {prompt.icon}
                        </span>
                        <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors text-left">
                          {prompt.text}
                        </span>
                        <svg className="w-4 h-4 text-text-secondary/50 group-hover:text-electric-blue ml-auto flex-shrink-0 transition-all group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ))}
                  </div>

                  {/* Quick tip */}
                  <div className="mt-8 text-center text-xs text-text-secondary/70">
                    <p>💡 Tip: You can also type your own question below</p>
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
                  Ohmni Oracle is thinking...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating Prompt Trigger (when messages exist) */}
        {messages.length > 0 && (
          <button
            onClick={() => setShowPrompts(!showPrompts)}
            className="absolute top-20 right-6 p-2 rounded-lg bg-surface-elevated hover:bg-electric-blue/20 border border-border-subtle hover:border-electric-blue/50 transition-all duration-200 group"
            title="Show suggested prompts"
          >
            <Sparkles className="w-5 h-5 text-text-secondary group-hover:text-electric-blue" />
          </button>
        )}

        {/* Quick Prompts Bar (when messages exist and showPrompts is true) */}
        {messages.length > 0 && showPrompts && (
          <div className="absolute bottom-[140px] left-0 right-0 px-6 z-30">
            <div className="max-w-[900px] mx-auto">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {PROMPT_SUGGESTIONS.slice(0, 3).map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handlePromptClick(prompt.text)}
                    className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-elevated/90 hover:bg-electric-blue/20 border border-border-subtle hover:border-electric-blue/50 transition-all duration-200 text-sm backdrop-blur-sm"
                  >
                    <span className="text-electric-blue text-base">{prompt.icon}</span>
                    <span className="text-text-secondary whitespace-nowrap">{prompt.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Fixed Footer with Input */}
        <ChatInput
          onSendMessage={sendMessage}
          onSendMessageWithFile={sendMessageWithFile}
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