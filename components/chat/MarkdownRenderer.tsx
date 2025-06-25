/* eslint-disable @typescript-eslint/no-unused-vars */
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import Image from 'next/image';
import 'highlight.js/styles/github-dark.css';

interface MarkdownRendererProps {
  content: string;
  isUser?: boolean;
}

export function MarkdownRenderer({ content, isUser = false }: MarkdownRendererProps) {
  return (
    <div className={`prose max-w-none ${
      isUser 
        ? 'prose-invert prose-p:text-white prose-headings:text-white prose-strong:text-white prose-code:text-white' 
        : 'prose-invert prose-blue'
    }`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Tables with mobile-friendly scrolling
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-4 rounded-lg border border-border-subtle">
              <table className="min-w-full table-auto" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-surface-elevated" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="px-4 py-2 text-left text-sm font-semibold text-text-primary border-b border-border-subtle" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-4 py-2 text-sm border-b border-border-subtle" {...props} />
          ),
          
          // Enhanced code blocks
          pre: ({ node, ...props }) => (
            <pre className="bg-deep-navy border border-border-subtle rounded-lg p-4 overflow-x-auto my-3 text-sm" {...props} />
          ),
          
          // Inline code styling
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          code({ node, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;
            return isInline ? (
              <code className="bg-electric-blue/20 text-electric-glow rounded px-1.5 py-0.5 text-sm font-mono" {...props}>
                {children}
              </code>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          
          // External links
          a: ({ node, href, children, ...props }) => {
            const isExternal = href?.startsWith('http');
            return (
              <a 
                href={href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                className="text-electric-blue hover:text-electric-glow underline decoration-electric-blue/30 hover:decoration-electric-glow transition-colors"
                {...props}
              >
                {children}
              </a>
            );
          },
          
          // Blockquotes for warnings/notes
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-electric-blue pl-4 my-4 italic text-text-secondary bg-surface-elevated/50 py-2 rounded-r" {...props} />
          ),
          
          // Lists with proper spacing
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside space-y-2 my-3 ml-4" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside space-y-2 my-3 ml-4" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="text-text-primary" {...props} />
          ),
          
          // Task list checkboxes
          input: ({ node, ...props }) => {
            if (props.type === 'checkbox') {
              return (
                <input 
                  className="mr-2 rounded border-electric-blue/50 bg-surface-elevated checked:bg-electric-blue focus:ring-electric-blue/50 cursor-pointer"
                  disabled={false}
                  {...props} 
                />
              );
            }
            return <input {...props} />;
          },
          
          // Horizontal rules
          hr: ({ node, ...props }) => (
            <hr className="my-6 border-border-subtle" {...props} />
          ),
          
          // Images with proper sizing
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          img: ({ node, src, alt, ...props }) => {
            // Exception: Using native img for markdown-rendered content
            // because we don't know image dimensions ahead of time.
            // This is user-generated content from markdown where Next/Image 
            // would require fixed dimensions or complex handling.
            // eslint-disable-next-line @next/next/no-img-element
            return (
              <img 
                src={src} 
                alt={alt || ''} 
                className="rounded-lg max-w-full h-auto my-4" 
                {...props} 
              />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
} 