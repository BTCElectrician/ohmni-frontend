import toast from 'react-hot-toast';

// EXPERT TWEAK: Consistent error handling
export const toastFromApiError = (error: unknown) => {
  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes('401') || error.message.includes('Authentication')) {
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