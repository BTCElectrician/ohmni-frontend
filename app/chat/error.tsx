'use client';

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center bg-dark-bg">
      <div className="text-center glass-card p-8 max-w-md">
        <h2 className="text-2xl font-bold text-white mb-4">
          Something went wrong!
        </h2>
        <p className="text-text-secondary mb-6">
          {error.message || 'An unexpected error occurred'}
        </p>
        <button 
          onClick={reset} 
          className="btn-primary"
        >
          Try again
        </button>
      </div>
    </div>
  );
} 