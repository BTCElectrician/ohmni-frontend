PRD: Restore Markdown Table Rendering (Remove Custom Table Overrides)

Summary
Markdown tables are not rendering in chat messages due to custom table overrides in MarkdownRenderer.tsx that sometimes return null for table structure (thead/tbody/tr). We will remove these overrides and let ReactMarkdown render tables with default behavior, while keeping simple th/td styling and other enhancements (code, links, lists, images).

Problem Statement
- Users paste valid markdown tables, but the UI displays nothing.
- Root cause: MarkdownRenderer.tsx overrides for table/thead/tbody/tr rely on “material list” detection and can return null, effectively suppressing table rendering.

Goals
- Tables render reliably across the whole chat app via default ReactMarkdown behavior.
- Preserve existing styling for table cells and other markdown enhancements (code blocks, links, lists, images).
- Avoid regression in other chat features (streaming updates, SSE, attachments).

Non-Goals
- No special conversion of tables to “material list” bullet formats.
- No changes to chat rendering logic outside of MarkdownRenderer.tsx.

Scope
- A single-file change to components/chat/MarkdownRenderer.tsx:
  - Remove the custom table, thead, tbody, and tr renderers.
  - Keep cell styling via th and td.
  - Keep existing code/links/lists/image overrides.
  - Remove unused material-list helpers.

Technical Approach
- Delete all custom table-structure overrides.
- Retain th/td with Tailwind styling.
- Keep remark-gfm and rehype-highlight intact for tables and code highlighting.
- Ensure the component continues to accept and render content as string safely.

Implementation Details

Files to change
- components/chat/MarkdownRenderer.tsx

Edits
- Replace the current file content with the following simplified, safe version:

```tsx
/* eslint-disable @typescript-eslint/no-unused-vars */
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

interface MarkdownRendererProps {
  content: string;
  isUser?: boolean;
}

export function MarkdownRenderer({ content, isUser = false }: MarkdownRendererProps) {
  // Ensure ReactMarkdown always receives a string
  const safeContent = typeof content === 'string' ? content : '';
  
  return (
    <div className={`prose chat-prose max-w-none ${
      isUser
        ? 'prose-invert prose-p:text-white prose-headings:text-white prose-strong:text-white prose-code:text-white'
        : 'prose-invert prose-blue'
    }`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Keep simple header/cell styling
          th: ({ node, ...props }) => (
            <th
              className="px-4 py-2 text-left text-sm font-semibold text-text-primary border-b border-border-subtle"
              {...props}
            />
          ),
          td: ({ node, children, ...props }) => (
            <td className="px-4 py-2 text-sm border-b border-border-subtle" {...props}>
              {children}
            </td>
          ),

          // Enhanced code blocks
          pre: ({ node, ...props }) => (
            <pre className="bg-deep-navy border border-border-subtle rounded-lg p-4 overflow-x-auto my-3 text-sm" {...props} />
          ),
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

          // Enhanced lists with better spacing and styling
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside space-y-2 my-3 ml-4" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside space-y-2 my-3 ml-4" {...props} />
          ),
          li: ({ node, children, ...props }) => (
            <li className="text-text-primary leading-relaxed" {...props}>
              {children}
            </li>
          ),

          // Task list checkboxes
          input: ({ node, ...props }) => {
            if ((props as React.InputHTMLAttributes<HTMLInputElement>).type === 'checkbox') {
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

          // Images with proper sizing (native img for unknown dimensions)
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          img: ({ node, src, alt, ...props }) => {
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
        {safeContent}
      </ReactMarkdown>
    </div>
  );
}
```

Notes
- The previous “material-list/checklist” helpers and table overrides are intentionally removed. This restores reliable table rendering.
- Tailwind prose table styling already exists in app/globals.css and remains effective.

Acceptance Criteria
- Given a message containing a Markdown table, when rendered in the chat, then the table is visible with headers and rows, scrollable if necessary, and not blank.
- Non-table markdown (lists, headers, code blocks) continues to render correctly.
- No console errors from MarkdownRenderer in dev tools.
- No regression in ChatMessage, streaming updates, or attachments.

Test Plan
- Manual:
  1) Send assistant output with a simple markdown table:
     | Qty | Item | Notes |
     | --- | ---- | ----- |
     | 2   | 1" PVC Conduit | Outdoor |
     | 150 | 12 AWG CU | THHN |
     Confirm visible in chat.
  2) Paste a larger table; ensure it renders and is horizontally scrollable if overflow occurs.
  3) Verify code blocks, lists, links, images still render properly.
  4) Verify normal chat streaming responses still update live.
- Regression:
  - Verify chat with and without attachments.
  - Verify deep/nuclear indicators still render (unrelated to markdown).

Performance and Risk
- Performance impact: negligible or improved (less custom logic to run).
- Risk: Low. We’re reverting to default ReactMarkdown table rendering.
- Mitigation: Quick rollback by re-adding the previous file if needed.

Rollout
- Apply change, run:
  - npm run type-check
  - npm run dev and smoke test the table scenarios above.
- No environment changes required.

Rollback Plan
- Revert MarkdownRenderer.tsx to prior version.

Owner
- Frontend team

Dependencies
- None beyond existing packages (react-markdown, remark-gfm, rehype-highlight).

Please apply the above file replacement. I can help validate after it’s live.

<chatName="PRD to restore Markdown table rendering by removing table overrides"/>