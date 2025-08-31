import { ChatMessage as ChatMessageType } from '@/types/api';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { MarkdownRenderer } from './MarkdownRenderer';
import { CopyButton } from './CopyButton';
import { Brain, Radiation, ImageIcon, Maximize2, X } from 'lucide-react';
import { useState } from 'react';
import React from 'react';
import { toAttachmentFromFilePath } from '@/lib/files';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { data: session } = useSession();
  const isUser = message.role === 'user';
  const [showFullImage, setShowFullImage] = useState(false);

  // Normalize attachments before rendering
  const normalizedAttachments = React.useMemo(() => {
    if (message.attachments && message.attachments.length > 0) {
      return message.attachments;
    }
    if (message.file_path) {
      return [toAttachmentFromFilePath(message.file_path)];
    }
    return [];
  }, [message.attachments, message.file_path]);

  return (
    <div className={`message-wrapper mb-6 ${isUser ? 'flex justify-end' : ''}`}>
      <div
        className={`message max-w-[80%] p-4 rounded-lg ${
          isUser
            ? 'bg-user-bubble text-white'
            : 'bg-surface-elevated text-text-primary border border-border-subtle'
        } ${!isUser ? 'relative' : ''}`}
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
                  {isUser ? 'You' : 'Ohmni Oracle'}
                </div>
              </div>

              {/* Image Attachments */}
              {normalizedAttachments.length > 0 && (
                <div className="mb-3">
                  {normalizedAttachments.map((attachment, index) => (
                    <div key={index} className="relative group">
                      {attachment.type === 'image' && attachment.url && (
                        <>
                          <div 
                            className="relative overflow-hidden rounded-lg border border-border-subtle cursor-pointer"
                            onClick={() => setShowFullImage(true)}
                          >
                            <Image
                              src={attachment.url}
                              alt={attachment.filename}
                              width={800}
                              height={400}
                              className="max-w-full max-h-[400px] object-contain"
                              style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '400px' }}
                              unoptimized
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                              <Maximize2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary">
                            <ImageIcon className="w-3 h-3" />
                            <span>{attachment.filename}</span>
                            {attachment.size && (
                              <span>({(attachment.size / 1024 / 1024).toFixed(1)}MB)</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Markdown Content */}
              <div className="chat-markdown-content">
                <MarkdownRenderer content={message.content ?? ''} isUser={isUser} />
              </div>
              
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
                  <Radiation className="w-3 h-3" />
                  <span>Nuclear mode • Model: {message.metadata.model_used || 'o3'}</span>
                  {message.metadata.nuclear_remaining !== undefined && (
                    <span className="ml-auto text-red-500">
                      ☢️ {message.metadata.nuclear_remaining} nuclear uses left today
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FLOATING COPY BUTTON - Only for assistant messages */}
        {!isUser && (
          <div className="sticky bottom-4 float-right mr-2 mt-4 z-10">
            <CopyButton 
              text={message.content ?? ''} 
              className="shadow-lg bg-surface-elevated/95 backdrop-blur-sm border-2 border-border-subtle hover:border-electric-blue/50 min-w-[100px]"
            />
          </div>
        )}
      </div>

      {/* Full Image Modal */}
      {showFullImage && normalizedAttachments[0]?.url && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowFullImage(false)}
        >
          <Image
            src={normalizedAttachments[0].url}
            alt={normalizedAttachments[0].filename}
            width={1920}
            height={1080}
            className="max-w-full max-h-full object-contain"
            style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%' }}
            unoptimized
          />
          <button
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors"
            onClick={() => setShowFullImage(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
} 