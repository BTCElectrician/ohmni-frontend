import type { ChatMessage } from '@/types/api';

const BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? '').replace(/\/$/, '');

export function toAttachmentFromFilePath(
  filePath: string
): NonNullable<ChatMessage['attachments']>[number] {
  // If already absolute URL, use as-is
  if (filePath.startsWith('http')) {
    return {
      type: 'image',
      url: filePath,
      filename: filePath.split('/').pop() ?? 'file'
    };
  }
  
  // Otherwise build from BASE_URL
  const clean = filePath.startsWith('/') ? filePath : `/${filePath}`;
  const fileName = clean.split('/').pop() ?? 'file';
  
  return {
    type: 'image',
    url: `${BASE_URL}${clean}`,
    filename: fileName,
  };
}
