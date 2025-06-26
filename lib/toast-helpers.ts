import toast from 'react-hot-toast';
// Import Sentry if available
// import * as Sentry from '@sentry/nextjs';

export const toastFromApiError = (error: unknown) => {
  if (error instanceof Error) {
    // Log to Sentry if available
    // if (typeof Sentry !== 'undefined') {
    //   Sentry.addBreadcrumb({
    //     category: 'api.error',
    //     message: error.message,
    //     level: 'error',
    //   });
    // }
    
    // Deep reasoning quota error
    if (error.message.includes('deep_reasoning_limit_exceeded')) {
      toast.error('Daily deep reasoning limit reached (50/day). Using standard model.', {
        duration: 4000,
        icon: '🧠',
      });
    } 
    // Nuclear mode quota error
    else if (error.message.includes('nuclear_limit_exceeded')) {
      toast.error('Daily nuclear limit reached (5/day). This is an expensive model!', {
        duration: 5000,
        icon: '☢️',
      });
    }
    // Temporary handler for generic 429 errors
    else if (error.message.includes('429')) {
      toast.error('Rate limit reached. The backend team is implementing quota tracking. Try again later!', {
        duration: 5000,
        icon: '⚠️',
      });
    }
    // Standard errors
    else if (error.message.includes('401') || error.message.includes('Authentication')) {
      toast.error('Session expired. Please log in again.');
    } else if (error.message.includes('Network')) {
      toast.error('Connection lost. Please check your internet.');
    } else {
      toast.error(error.message);
    }
  } else {
    toast.error('An unexpected error occurred');
  }
};

export const toastSuccess = (message: string) => {
  toast.success(message, {
    duration: 3000,
    position: 'bottom-right',
    style: {
      background: '#10B981',
      color: '#fff',
    },
  });
}; 