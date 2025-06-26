import { ChatMessage as ChatMessageType } from '@/types/api';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { MarkdownRenderer } from './MarkdownRenderer';
import { CopyButton } from './CopyButton';
import { Brain, Zap } from 'lucide-react';

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
        <div className="flex flex-col">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {isUser ? (
                <div className="w-8 h-8 rounded flex items-center justify-center text-sm font-medium bg-white/20">
                  {session?.user?.name?.slice(0, 2).toUpperCase() || 'U'}
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full overflow-hidden bg-electric-blue/20 flex items-center justify-center border-2 border-electric-blue shadow-md">
                  <Image
                    src="/images/owl-mini-blueprint.png"
                    alt="OHMNI Oracle"
                    width={40}
                    height={40}
                    className="object-contain"
                  />
                </div>
              )}
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
              
              {/* Mode indicators - only show for AI messages */}
              {!isUser && message.metadata?.deep_reasoning && (
                <div className="flex items-center gap-2 mt-3 text-xs text-electric-blue/70">
                  <Brain className="w-3 h-3" />
                  <span>Deep reasoning • Model: {message.metadata.model_used || 'Advanced'}</span>
                  {message.metadata.reasoning_remaining !== undefined && (
                    <span className="ml-auto">
                      {message.metadata.reasoning_remaining} uses remaining today
                    </span>
                  )}
                </div>
              )}

              {!isUser && message.metadata?.nuclear_mode && (
                <div className="flex items-center gap-2 mt-3 text-xs text-red-600/70">
                  <Zap className="w-3 h-3" />
                  <span>Nuclear mode • Model: {message.metadata.model_used || 'o3'}</span>
                  {message.metadata.nuclear_remaining !== undefined && (
                    <span className="ml-auto text-red-500">
                      ⚠️ {message.metadata.nuclear_remaining} nuclear uses left today
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 