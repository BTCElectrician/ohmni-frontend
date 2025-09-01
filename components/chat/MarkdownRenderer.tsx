/* eslint-disable @typescript-eslint/no-unused-vars */
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import Image from 'next/image';
import 'highlight.js/styles/github-dark.css';
import { ReactNode } from 'react';
import React from 'react';

interface MarkdownRendererProps {
  content: string;
  isUser?: boolean;
}

// Helper function to detect if a table is a material list or checklist
const isMaterialListOrChecklist = (tableContent: string): boolean => {
  const materialListIndicators = [
    'quantity', 'item', 'size', 'type', 'notes', 'material',
    'task', 'priority', 'area', 'room', 'needed',
    'copy-paste material list', 'checklist', 'materials needed',
    'pvc conduit', 'awg cu', 'concrete', 'ground rod',
    'switchboard', 'cable', 'conductor', 'electrical',
    'high', 'medium', 'low', 'final', 'critical'
  ];
  
  const lowercaseContent = tableContent.toLowerCase();
  
  // Check for material list patterns
  const hasMaterialListPattern = materialListIndicators.some(indicator => 
    lowercaseContent.includes(indicator)
  );
  
  // Check for table structures that look like material lists
  const hasTableStructure = (
    lowercaseContent.includes('|') && 
    (lowercaseContent.includes('ft') || lowercaseContent.includes('in') || lowercaseContent.includes('×'))
  );
  
  // Check for nuclear mode electrical content
  const hasElectricalContent = [
    'amp', 'volt', 'wire', 'breaker', 'panel', 'conduit', 'cable',
    'electrical', 'circuit', 'phase', 'neutral', 'ground'
  ].some(term => lowercaseContent.includes(term));
  
  return hasMaterialListPattern || hasTableStructure || hasElectricalContent;
};

// Helper function to convert table row data to bullet points
const formatTableRowAsBulletPoint = (cells: string[]): ReactNode => {
  // Common patterns for material lists and checklists
  if (cells.length >= 2) {
    const [first, second, ...rest] = cells;
    
    // Material list format: Quantity | Item | Size/Type | Notes
    if (cells.length >= 3) {
      const quantity = first?.trim();
      const item = second?.trim();
      const details = rest.join(' | ').trim();
      
      return (
        <div className="flex items-start gap-2 py-1">
          <span className="text-electric-blue font-mono text-sm flex-shrink-0">•</span>
          <div className="flex-1">
            <span className="font-semibold text-text-primary">{quantity}</span>
            <span className="mx-2 text-text-secondary">×</span>
            <span className="text-text-primary">{item}</span>
            {details && (
              <span className="text-text-secondary ml-2">({details})</span>
            )}
          </div>
        </div>
      );
    }
    
    // Checklist format: Task | Priority or Area | Task
    return (
      <div className="flex items-start gap-2 py-1">
        <span className="text-electric-blue font-mono text-sm flex-shrink-0">•</span>
        <div className="flex-1">
          <span className="font-semibold text-text-primary">{first}</span>
          <span className="text-text-secondary ml-2">— {second}</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex items-start gap-2 py-1">
      <span className="text-electric-blue font-mono text-sm flex-shrink-0">•</span>
      <span className="text-text-primary">{cells[0]}</span>
    </div>
  );
};

export function MarkdownRenderer({ content, isUser = false }: MarkdownRendererProps) {
  // ✅ FIX: Ensure ReactMarkdown always receives a string
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
          // Enhanced table rendering with material list/checklist detection
          table: ({ node, children, ...props }) => {
            // Check if this is a material list or checklist based on surrounding content
            const isMaterialTable = isMaterialListOrChecklist(safeContent);
            
            if (isMaterialTable) {
              // For material lists, we'll use a custom bullet-point format
              // Process the table content and convert to bullet points
              const tableContent = React.Children.toArray(children);
              const rows = tableContent.filter(child => 
                React.isValidElement(child) && child.type === 'tbody'
              ).flatMap(tbody => {
                if (React.isValidElement(tbody) && tbody.props.children) {
                  return React.Children.toArray(tbody.props.children);
                }
                return [];
              }).filter(child => 
                React.isValidElement(child) && child.type === 'tr'
              );
              
              return (
                <div className="my-6 p-4 bg-surface-elevated/30 rounded-lg border border-electric-blue/20">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-electric-blue text-lg">📋</span>
                    <span className="text-electric-blue font-semibold text-sm">
                      Material List / Checklist
                    </span>
                  </div>
                  <div className="space-y-2">
                    {rows.map((row, index) => {
                      if (React.isValidElement(row) && row.props.children) {
                        const cells = React.Children.toArray(row.props.children)
                          .filter(child => React.isValidElement(child) && child.type === 'td')
                          .map(cell => {
                            if (React.isValidElement(cell) && cell.props.children) {
                              return React.Children.toArray(cell.props.children).join(' ');
                            }
                            return '';
                          });
                        
                        return (
                          <div key={index} className="flex items-start gap-2 py-1">
                            <span className="text-electric-blue font-mono text-sm flex-shrink-0">•</span>
                            <div className="flex-1">
                              {cells.length >= 2 ? (
                                <>
                                  <span className="font-semibold text-text-primary">{cells[0]}</span>
                                  <span className="mx-2 text-text-secondary">×</span>
                                  <span className="text-text-primary">{cells[1]}</span>
                                  {cells.length > 2 && (
                                    <span className="text-text-secondary ml-2">({cells.slice(2).join(' | ')})</span>
                                  )}
                                </>
                              ) : (
                                <span className="text-text-primary">{cells[0]}</span>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              );
            }
            
            // Standard table rendering for non-material lists
            return (
              <div className="overflow-x-auto my-4 rounded-lg border border-border-subtle">
                <table className="min-w-full table-auto" {...props}>
                  {children}
                </table>
              </div>
            );
          },
          
          // Custom thead for material lists
          thead: ({ node, children, ...props }) => {
            const isMaterialTable = isMaterialListOrChecklist(safeContent);
            
            if (isMaterialTable) {
              // Hide the table header for material lists
              return null;
            }
            
            return (
              <thead className="bg-surface-elevated" {...props}>
                {children}
              </thead>
            );
          },
          
          // Custom tbody for material lists
          tbody: ({ node, children, ...props }) => {
            const isMaterialTable = isMaterialListOrChecklist(safeContent);
            
            if (isMaterialTable) {
              // For material lists, we need to process the children differently
              // Don't render tbody at all for material lists - let the tr components handle it
              return null;
            }
            
            return <tbody {...props}>{children}</tbody>;
          },
          
          // Custom tr for material lists
          tr: ({ node, children, ...props }) => {
            const isMaterialTable = isMaterialListOrChecklist(safeContent);
            
            if (isMaterialTable) {
              // For material lists, convert to bullet points outside the table structure
              // We'll handle this in the table component itself
              return null;
            }
            
            return <tr {...props}>{children}</tr>;
          },
          
          // Standard table headers
          th: ({ node, ...props }) => (
            <th className="px-4 py-2 text-left text-sm font-semibold text-text-primary border-b border-border-subtle" {...props} />
          ),
          
          // Custom td for material lists
          td: ({ node, children, ...props }) => {
            const isMaterialTable = isMaterialListOrChecklist(safeContent);
            
            if (isMaterialTable) {
              // For material lists, collect cell content and format as bullet points
              return (
                <span className="table-cell-content" {...props}>
                  {children}
                </span>
              );
            }
            
            return (
              <td className="px-4 py-2 text-sm border-b border-border-subtle" {...props}>
                {children}
              </td>
            );
          },
          
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
        {safeContent}
      </ReactMarkdown>
    </div>
  );
} 