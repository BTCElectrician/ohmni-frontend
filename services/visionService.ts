import { UploadResponse } from '@/types/api';
import { getAccessToken } from '@/lib/auth/getAccessToken';

export class VisionService {
  private readonly MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
  private readonly ACCEPTED_TYPES = [
    'image/jpeg',
    'image/png', 
    'image/webp',
    'image/heic'
  ];

  /**
   * Validates file before upload
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    if (!this.ACCEPTED_TYPES.includes(file.type)) {
      // Special handling for HEIC
      if (file.name.toLowerCase().endsWith('.heic')) {
        // iOS sometimes reports HEIC as empty type
        return { valid: true };
      }
      return { 
        valid: false, 
        error: 'Please upload a JPEG, PNG, WebP, or HEIC image' 
      };
    }

    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return { 
        valid: false, 
        error: `Image is ${sizeMB}MB. Maximum size is 20MB` 
      };
    }

    return { valid: true };
  }

  /**
   * Optimizes image dimensions to prevent token overflow
   */
  async optimizeImage(file: File): Promise<File> {
    const MAX_DIMENSION = 3200;
    
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      img.onload = async () => {
        URL.revokeObjectURL(objectUrl);
        
        // Check if optimization needed
        if (img.width <= MAX_DIMENSION && img.height <= MAX_DIMENSION) {
          resolve(file);
          return;
        }
        
        // Create canvas for resizing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file); // Fallback if canvas not supported
          return;
        }
        
        // Calculate new dimensions
        const scale = Math.min(
          MAX_DIMENSION / img.width,
          MAX_DIMENSION / img.height
        );
        canvas.width = Math.floor(img.width * scale);
        canvas.height = Math.floor(img.height * scale);
        
        // Draw and resize
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Convert back to file
        canvas.toBlob((blob) => {
          if (blob) {
            const optimizedFile = new File(
              [blob], 
              file.name.replace(/\.[^.]+$/, '.jpg'), // Force JPEG
              { type: 'image/jpeg' }
            );
            resolve(optimizedFile);
          } else {
            resolve(file); // Fallback to original
          }
        }, 'image/jpeg', 0.9);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file); // Fallback to original on error
      };
      
      img.src = objectUrl;
    });
  }

  /**
   * Creates a local preview URL for immediate display
   */
  createPreviewUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  /**
   * Uploads image to chat session
   */
  async uploadToChat(
    sessionId: string,
    file: File,
    message?: string
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (message) {
      formData.append('message', message);
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/sessions/${sessionId}/upload`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await getAccessToken()}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }
}

export const visionService = new VisionService(); 