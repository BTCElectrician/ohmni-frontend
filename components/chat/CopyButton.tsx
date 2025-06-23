import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  className?: string;
}

export function CopyButton({ text, className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`group flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-all duration-200 
        ${copied 
          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
          : 'bg-surface-elevated hover:bg-electric-blue/20 text-text-secondary hover:text-electric-blue border border-border-subtle hover:border-electric-blue/30'
        } ${className}`}
      title={copied ? 'Copied!' : 'Copy message'}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          <span className="font-medium">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" />
          <span className="font-medium">Copy</span>
        </>
      )}
    </button>
  );
} 