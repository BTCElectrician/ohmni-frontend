'use client';

import { useState, useEffect, useCallback } from 'react';
import { Folder, Trash2, PencilIcon, Home, MessageSquareText } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { chatService } from '@/services/chatService';
import { ChatSession } from '@/types/api';
import { useChatSessions } from '@/app/hooks/useChatSessions';
import { toastFromApiError, toastSuccess } from '@/lib/toast-helpers';
import { useQueryClient } from '@tanstack/react-query';
import { SESSION_UPDATED_EVENT } from '@/lib/events';
import toast from 'react-hot-toast';

// Editable Session Name Component
function EditableSessionName({ 
  session, 
  onUpdate
}: { 
  session: ChatSession, 
  onUpdate: (id: string, name: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(session.name);

  // Update local name when session prop changes
  useEffect(() => {
    setName(session.name);
  }, [session.name]);

  const handleSave = async () => {
    if (name.trim() && name !== session.name) {
      try {
        await onUpdate(session.id, name.trim());
        toastSuccess('Session renamed successfully');
      } catch (error) {
        console.error('Failed to rename session:', error);
        toastFromApiError(error);
        setName(session.name); // Revert on error
      }
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setName(session.name);
      setIsEditing(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0 group">
      {isEditing ? (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-b border-electric-blue/50 focus:outline-none focus:border-electric-blue text-sm text-text-primary px-1 py-0.5"
          autoFocus
          maxLength={255}
        />
      ) : (
        <span 
          className="flex-1 truncate cursor-pointer hover:text-electric-blue text-sm transition-colors"
          onDoubleClick={() => setIsEditing(true)}
          title={session.name}
          aria-label={`Chat session: ${session.name}. Double-click to rename.`}
        >
          {session.name}
        </span>
      )}
      <button
        onClick={() => setIsEditing(!isEditing)}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-surface-elevated rounded transition-all duration-200"
        title="Rename session"
      >
        <PencilIcon className="w-3 h-3 text-text-secondary hover:text-electric-blue" />
      </button>
    </div>
  );
}

export function ChatSidebar({ selectSession: onSelectSession }: { selectSession?: (session: ChatSession) => void }) {
  const { sessions, currentSession, setSessions, setCurrentSession } = useChatStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  // PHASE 1: React Query enhancement (optional)
  // If this fails, we'll fall back to the existing manual loading
  const { 
    data: queriedSessions, 
    isLoading: isQueryLoading, 
    error: queryError,
    isSuccess: isQuerySuccess 
  } = useChatSessions();

  const loadSessions = useCallback(async () => {
    // PHASE 1: Prefer React Query data if available
    if (isQuerySuccess && queriedSessions) {
      console.log('Using React Query sessions:', queriedSessions);
      setSessions(queriedSessions);
      setError(null);
      setIsLoading(false);
      return;
    }
    
    // PHASE 1: If React Query failed, fall back to manual loading
    if (queryError) {
      console.log('React Query failed, falling back to manual loading:', queryError);
    }
    
    try {
      setError(null);
      const data = await chatService.getSessions();
      console.log('Loaded sessions (manual fallback):', data);
      setSessions(data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      setError('Unable to load chat history due to backend issue');
      toastFromApiError(error);
      // Set empty sessions so UI still works
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, [setSessions, isQuerySuccess, queriedSessions, queryError]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Listen for session updates from other components
  useEffect(() => {
    const handleSessionUpdate = () => {
      loadSessions();
    };
    
    // Subscribe to custom event
    window.addEventListener(SESSION_UPDATED_EVENT, handleSessionUpdate);
    
    return () => {
      window.removeEventListener(SESSION_UPDATED_EVENT, handleSessionUpdate);
    };
  }, [loadSessions]);

  const createNewChat = async () => {
    try {
      setError(null);
      const session = await chatService.createSession('New Chat');
      setSessions([session, ...sessions]);
      setCurrentSession(session);
      // FIX: Clear messages and show prompts in main chat page
      window.dispatchEvent(new Event('new-chat-created'));
    } catch (error) {
      console.error('Failed to create session:', error);
      setError('Unable to create new chat due to backend issue');
      toastFromApiError(error);
    }
  };

  const selectSession = (session: ChatSession) => {
    if (onSelectSession) {
      onSelectSession(session);
    } else {
      setCurrentSession(session);
    }
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Delete this chat session?')) return;

    try {
      await chatService.deleteSession(id);
      setSessions(sessions.filter(s => s.id !== id));
      
      if (currentSession?.id === id) {
        setCurrentSession(null);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      setError('Unable to delete chat due to backend issue');
      toastFromApiError(error);
    }
  };

  // Session rename handler
  const handleRenameSession = async (sessionId: string, newName: string) => {
    try {
      await chatService.updateSession(sessionId, { name: newName });
      // Update local state immediately for better UX
      setSessions(sessions.map(s => 
        s.id === sessionId ? { ...s, name: newName } : s
      ));
      // Also update current session if it's the one being renamed
      if (currentSession?.id === sessionId) {
        setCurrentSession({ ...currentSession, name: newName });
      }
      // React Query will automatically refetch and update the UI
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
    } catch (error) {
      console.error('Failed to rename session:', error);
      throw error; // Let the EditableSessionName component handle the error display
    }
  };

  return (
    <div className="w-full bg-deep-navy border-r border-electric-blue/20 text-text-secondary flex flex-col h-full min-h-0 overflow-hidden">
      {/* Fixed Top Section */}
      <div className="flex-shrink-0">
        {/* Home Button - NEW */}
        <button
          onClick={() => window.location.href = '/'}
          className="m-3 mb-2 flex items-center gap-3 w-[calc(100%-1.5rem)] p-3 bg-transparent border border-border-subtle rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated/50 transition-colors"
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </button>

        {/* New Chat Button - EXISTING (update margin) */}
        <button
          onClick={createNewChat}
          className="mx-3 mb-3 flex items-center gap-3 w-[calc(100%-1.5rem)] p-3 bg-transparent border border-electric-blue/30 rounded-lg text-text-primary hover:bg-surface-elevated transition-colors"
        >
          <MessageSquareText className="w-5 h-5" />
          <span>New chat</span>
        </button>
        
        {/* Error Banner */}
        {error && (
          <div className="mx-3 mb-3 p-2 bg-red-500/20 border border-red-400/30 rounded-lg text-red-300 text-xs">
            {error}
          </div>
        )}
        
        {/* Starred Section */}
        <div className="mb-0 pb-0">
          <div className="text-xs font-semibold text-text-secondary px-3 py-2 uppercase tracking-wide">
            Starred
          </div>
          <div className="px-2 mb-0">
            <div className="text-sm text-text-secondary/70 text-center py-2">
              No starred conversations
            </div>
          </div>
        </div>
        
        {/* Projects Section */}
        <div className="mb-0 pb-0">
          <div className="text-xs font-semibold text-text-secondary px-3 py-2 uppercase tracking-wide">
            Projects
          </div>
          <div className="px-2 mb-0">
            <button 
              onClick={() => toast('Coming soon! 🚧', { 
                icon: '📋',
                position: 'top-left',
                style: {
                  background: '#1e293b',
                  color: '#e2e8f0',
                  border: '1px solid #475569',
                  fontSize: '14px',
                  padding: '12px 16px',
                  marginLeft: '20px'
                }
              })}
              className="w-full flex items-center gap-3 p-2 rounded hover:bg-surface-elevated transition-colors"
            >
              <Folder className="w-4 h-4" />
              <span className="text-sm">My Jobs</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Scrollable Chats Section */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="text-xs font-semibold text-text-secondary px-3 py-2 uppercase tracking-wide flex-shrink-0">
          Chats
        </div>
        <div className="flex-1 overflow-y-auto px-2 min-h-0 custom-scrollbar">
          {(isLoading || isQueryLoading) ? (
            <div className="text-sm text-text-secondary/70 text-center py-3">
              Loading...
            </div>
          ) : error ? (
            <div className="text-sm text-red-400 text-center py-3">
              Backend issue preventing<br />chat history from loading
            </div>
          ) : sessions.length > 0 ? (
            <div className="pb-6">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => selectSession(session)}
                  className={`group w-full flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                    currentSession?.id === session.id
                      ? 'bg-surface-elevated'
                      : 'hover:bg-surface-elevated'
                  }`}
                >
                  <EditableSessionName 
                    session={session}
                    onUpdate={handleRenameSession}
                  />
                  <button
                    onClick={(e) => deleteSession(session.id, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-red-400 ml-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-text-secondary/70 text-center py-3">
              No chat sessions yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 