'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/store/chatStore';
import { chatService } from '@/services/chatService';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatMessage as ChatMessageType, ChatSession } from '@/types/api';
// import ApiDebug from '@/components/debug/ApiDebug';
import { toastFromApiError, toastSuccess } from '@/lib/toast-helpers';
import { useQueryClient } from '@tanstack/react-query';
import { Sparkles, Menu, X } from 'lucide-react';
import Image from 'next/image';
import { SESSION_UPDATED_EVENT } from '@/lib/events';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/client-resizable';
import { useMediaQuery } from '@/app/hooks/useMediaQuery';

// Title refresh delays - conservative timing that works for all current and future models
const TITLE_REFRESH_DELAY = {
  INITIAL: 5000,  // 5 seconds - works for all models (regular, reasoning, nuclear, future models)
  RETRY: 8000     // 8 seconds - backup check for any slow models
};

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
  
  // FIX: Default prompts to OFF, load from localStorage if available
  const [showPrompts, setShowPrompts] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('showChatPrompts');
      return saved === 'true'; // Only true if explicitly set
    }
    return false; // Default to OFF
  });
  const [hasFirstMessage, setHasFirstMessage] = useState(false);
  
  // Sidebar size persistence
  const [sidebarSize, setSidebarSize] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chatSidebarSize');
      return saved ? parseInt(saved) : 20; // Default 20% for desktop
    }
    return 20;
  });

  // Mobile sidebar toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Media queries
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');

  // Calculate responsive defaults
  const getDefaultSize = () => {
    if (isMobile) return 0; // Hidden on mobile by default
    if (isTablet) return 25; // 25% on tablet
    return sidebarSize; // User preference on desktop
  };

  // Persist size changes
  const handleResize = (sizes: number[]) => {
    if (!isMobile && sizes[0] > 0) {
      setSidebarSize(sizes[0]);
      localStorage.setItem('chatSidebarSize', sizes[0].toString());
    }
  };
  
  // Persist preference when it changes
  useEffect(() => {
    localStorage.setItem('showChatPrompts', showPrompts.toString());
  }, [showPrompts]);
  
  // Track quota changes to reduce toast noise
  const lastQuotaRef = useRef<{ deep?: number; nuclear?: number }>({});

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Cmd/Ctrl + B to toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        if (isMobile) {
          setIsSidebarOpen(!isSidebarOpen);
        }
      }
      
      // Escape to close sidebar on mobile
      if (e.key === 'Escape' && isMobile && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isMobile, isSidebarOpen]);

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

  useEffect(() => {
    const handleNewChatCreated = () => {
      console.log('New chat created via sidebar - resetting hasFirstMessage');
      setMessages([]);
      setShowPrompts(true);
      // FIX: Reset hasFirstMessage when new chat is created via sidebar
      setHasFirstMessage(false);
    };
    window.addEventListener('new-chat-created', handleNewChatCreated);
    return () => {
      window.removeEventListener('new-chat-created', handleNewChatCreated);
    };
  }, [setMessages]);

  // Show prompts only for new chats, hide for existing chats
  useEffect(() => {
    if (messages.length === 0 && !currentSession) {
      setShowPrompts(true);
    } else if (messages.length > 0) {
      setShowPrompts(false);
    }
  }, [messages.length, currentSession]);

  const selectSession = useCallback((session: ChatSession) => {
    setCurrentSession(session);
    // FIX: Ensure prompts are hidden when selecting existing session
    setShowPrompts(false);
  }, [setCurrentSession]);

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
        
        // FIX: Reset hasFirstMessage for new session
        console.log('Creating new session - resetting hasFirstMessage to false');
        setHasFirstMessage(false);
        
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

  const sendMessageWithFile = async (content: string, file: File): Promise<void> => {
    // Hide prompts when sending file (same as regular messages)
    setShowPrompts(false);
    
    if (!currentSession) {
      // Create session if needed (same as regular sendMessage)
      try {
        setIsCreatingNewSession(true);
        const session = await chatService.createSession('New Chat');
        
        // FIX: Reset hasFirstMessage for new session
        console.log('Creating new session (file upload) - resetting hasFirstMessage to false');
        setHasFirstMessage(false);
        
        setCurrentSession(session);
        await sendMessageWithFileToSession(session.id, content, file);
        setIsCreatingNewSession(false);
        // FIX: Invalidate sessions to refresh sidebar
        queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
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
    // Track first message properly - check if this is the first message for this session
    const isFirstMessage = !hasFirstMessage;
    console.log('sendMessageWithFileToSession - isFirstMessage:', isFirstMessage, 'hasFirstMessage:', hasFirstMessage, 'messages.length:', messages.length);
    
    try {
      // 1. Upload file and add user message
      const userMessage = await chatService.sendMessageWithFile(
        sessionId,
        content,
        file
      );
      
      addMessage(userMessage);
      
      // 2. Create AI message placeholder
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
      
      // 3. Trigger vision analysis streaming
      try {
        const aiResponse = await chatService.streamVisionAnalysis(
          sessionId,
          content,
          (chunk: string) => {
            updateMessage(tempAiMessageId, (prev) => prev + chunk);
          }
        );
        
        // 4. Update with final content if needed
        if (aiResponse.content && !aiResponse.content.includes('Message sent successfully')) {
          updateMessage(tempAiMessageId, aiResponse.content);
        }
        
        // 5. Handle metadata (quotas) if present
        if (aiResponse.metadata?.reasoning_remaining !== undefined) {
          toastSuccess(`Deep reasoning uses remaining today: ${aiResponse.metadata.reasoning_remaining}`);
        }
        
        // FIX: Refresh sessions to ensure title appears
        if (isFirstMessage) {
          console.log('First message detected (vision upload) - setting up title refresh timers');
          setHasFirstMessage(true);
          
          setTimeout(() => {
            console.log('Refreshing sessions to pick up auto-generated title...');
            queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
            
            // Dispatch custom event for sidebar
            window.dispatchEvent(new Event(SESSION_UPDATED_EVENT));
          }, TITLE_REFRESH_DELAY.INITIAL);
          
          // Add a second check for any slow models
          setTimeout(() => {
            console.log('Second refresh for vision upload title...');
            queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
          }, TITLE_REFRESH_DELAY.RETRY);
        }
        
      } catch (error) {
        console.error('Vision analysis failed:', error);
        updateMessage(tempAiMessageId, 'Sorry, I couldn\'t analyze the image. Please try again.');
        toastFromApiError(error);
      } finally {
        setIsStreaming(false);
        setStreamingMessageId(null);
      }
      
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
    // Track first message properly - check if this is the first message for this session
    const isFirstMessage = !hasFirstMessage;
    console.log('sendMessageWithSession - isFirstMessage:', isFirstMessage, 'hasFirstMessage:', hasFirstMessage, 'messages.length:', messages.length);
    
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
      
      // First message session refresh - extended timeout for reasoning models
      if (isFirstMessage) {
        console.log('First message detected - setting up title refresh timers');
        setHasFirstMessage(true);
        
        // Use conservative timeout that works for all models
        const refreshDelay = TITLE_REFRESH_DELAY.INITIAL;
        
        setTimeout(() => {
          console.log('Refreshing sessions to pick up auto-generated title...');
          queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
          
          // Dispatch custom event for sidebar
          window.dispatchEvent(new Event(SESSION_UPDATED_EVENT));
        }, refreshDelay);
        
        // Add a second check for reasoning models
        if (useDeepReasoning || useNuclear) {
          setTimeout(() => {
            console.log('Second refresh for reasoning model title...');
            queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
          }, TITLE_REFRESH_DELAY.RETRY);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Handle backend's standardized error codes
      let errorMessage = 'Connection lost while generating the answer. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('rate_limit') || error.message.includes('quota') || error.message.includes('limit')) {
          errorMessage = 'You\'ve reached your daily limit for this model. Please try again tomorrow.';
        } else if (error.message.includes('timeout') || error.message.includes('timeout_error')) {
          errorMessage = 'The request took too long. Please try again.';
        } else if (error.message.includes('network_error')) {
          errorMessage = 'Network connection was interrupted. Please try again.';
        } else if (error.message.includes('model_error')) {
          errorMessage = 'The AI model encountered an error. Please try again.';
        }
      }
      
      updateMessage(tempAiMessageId, errorMessage);
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
    <div className="flex h-[calc(100vh-3.5rem)] bg-dark-bg relative">
      {/* Mobile Menu Toggle */}
      {isMobile && (
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute top-4 left-4 z-50 p-2 bg-surface-elevated rounded-lg border border-border-subtle hover:bg-electric-blue/20 transition-colors md:hidden"
          aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      )}

      <ResizablePanelGroup 
        direction="horizontal" 
        onLayout={handleResize}
        className="h-full"
      >
        {/* Sidebar Panel */}
        <ResizablePanel
          defaultSize={getDefaultSize()}
          minSize={isMobile ? 0 : 15} // 15% minimum on desktop
          maxSize={isMobile ? 100 : 35} // Full width on mobile, 35% max on desktop
          collapsible={true}
          collapsedSize={0}
          className={isMobile && !isSidebarOpen ? 'hidden' : ''}
        >
          <ChatSidebar selectSession={selectSession} />
        </ResizablePanel>
        
        {/* Resize Handle - Hidden on mobile */}
        {!isMobile && (
          <ResizableHandle 
            className="w-1 bg-border-subtle hover:bg-electric-blue/50 active:bg-electric-blue transition-colors cursor-col-resize focus:outline-none focus:ring-2 focus:ring-electric-blue relative group"
            aria-label="Resize sidebar"
          >
            {/* Visual indicator on hover */}
            <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-electric-blue/20 transition-colors" />
          </ResizableHandle>
        )}
        
        {/* Main Content Panel */}
        <ResizablePanel defaultSize={isMobile ? 100 : (100 - getDefaultSize())}>
          <div className="flex-1 flex flex-col overflow-hidden relative min-w-0 h-full">
            {/* Sign Out Button - Adjust position for mobile */}
            <button
              onClick={handleLogout}
              className={`absolute top-4 ${isMobile ? 'right-4' : 'right-4'} z-50 px-4 py-2 text-sm bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 hover:border-red-400/50 text-red-300 hover:text-red-200 rounded-lg transition-all duration-200 backdrop-blur-sm`}
            >
              Sign Out
            </button>

            {/* Mobile Overlay */}
            {isMobile && isSidebarOpen && (
              <div 
                className="absolute inset-0 bg-black/50 z-40 md:hidden"
                onClick={() => setIsSidebarOpen(false)}
              />
            )}

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
                      Your electrical backup brain—always knows the answer, always has your back.
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
                  <div>Ohmni Oracle is thinking...</div>
                  {/* Show extended time warning for slower models */}
                  {(messages.some(m => m.metadata?.nuclear_mode) || 
                    messages.some(m => m.metadata?.deep_reasoning)) && (
                    <div className="text-xs mt-1 opacity-70">
                      Advanced models may take longer to respond
                    </div>
                  )}
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
          autoSendOnFileSelect={false}   // Disabled so users can type custom prompts
          isStreaming={isStreaming}
          disabled={false}
        />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

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