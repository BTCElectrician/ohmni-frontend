import { ChatMessage as ChatMessageType } from '@/types/api';
import { useSession } from 'next-auth/react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { CopyButton } from './CopyButton';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { data: session } = useSession();
  const isUser = message.role === 'user';

  return (
    <div className={`message-wrapper mb-6 ${isUser ? 'flex justify-end' : ''}`}>
      <div
        className={`message max-w-[80%] p-4 rounded-lg ${
          isUser
            ? 'bg-user-bubble text-white'
            : 'bg-surface-elevated text-text-primary border border-border-subtle'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div
              className={`w-8 h-8 rounded flex items-center justify-center text-sm font-medium ${
                isUser ? 'bg-white/20' : 'bg-electric-blue/20'
              }`}
            >
              {isUser
                ? session?.user?.name?.slice(0, 2).toUpperCase() || 'U'
                : 'AI'}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm font-medium opacity-80">
                {isUser ? 'You' : 'OHMNI Oracle'}
              </div>
              {!isUser && (
                <CopyButton text={message.content} />
              )}
            </div>
            <MarkdownRenderer content={message.content} isUser={isUser} />
          </div>
        </div>
      </div>
    </div>
  );
} 