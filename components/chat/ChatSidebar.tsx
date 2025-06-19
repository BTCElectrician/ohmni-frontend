'use client';

import { useState, useEffect, useCallback } from 'react';
import { PlusCircle, Folder, Trash2 } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { chatService } from '@/services/chatService';
import { ChatSession } from '@/types/api';

export function ChatSidebar() {
  const { sessions, currentSession, setSessions, setCurrentSession } = useChatStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      setError(null);
      const data = await chatService.getSessions();
      setSessions(data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      setError('Unable to load chat history due to backend issue');
      // Set empty sessions so UI still works
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, [setSessions]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const createNewChat = async () => {
    try {
      setError(null);
      const session = await chatService.createSession('New Chat');
      setSessions([session, ...sessions]);
      setCurrentSession(session);
    } catch (error) {
      console.error('Failed to create session:', error);
      setError('Unable to create new chat due to backend issue');
    }
  };

  const selectSession = (session: ChatSession) => {
    setCurrentSession(session);
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
    }
  };

  return (
    <div className="w-[230px] min-w-[230px] bg-deep-navy border-r border-electric-blue/20 text-text-secondary flex flex-col h-full overflow-y-auto custom-scrollbar">
      {/* Fixed Top Section */}
      <div className="flex-shrink-0">
        {/* New Chat Button */}
        <button
          onClick={createNewChat}
          className="m-3 flex items-center gap-3 w-[calc(100%-1.5rem)] p-3 bg-transparent border border-electric-blue/30 rounded-lg text-text-primary hover:bg-surface-elevated transition-colors"
        >
          <PlusCircle className="w-5 h-5" />
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
            <button className="w-full flex items-center gap-3 p-2 rounded hover:bg-surface-elevated transition-colors">
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
        <div className="flex-1 overflow-y-auto px-2 min-h-0">
          {isLoading ? (
            <div className="text-sm text-text-secondary/70 text-center py-3">
              Loading...
            </div>
          ) : error ? (
            <div className="text-sm text-red-400 text-center py-3">
              Backend issue preventing<br />chat history from loading
            </div>
          ) : sessions.length > 0 ? (
            sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => selectSession(session)}
                className={`group w-full flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                  currentSession?.id === session.id
                    ? 'bg-surface-elevated'
                    : 'hover:bg-surface-elevated'
                }`}
              >
                <span className="text-sm truncate flex-1">{session.name}</span>
                <button
                  onClick={(e) => deleteSession(session.id, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
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