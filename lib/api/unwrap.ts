import type { ApiResponse } from '@/types/api';

/**
 * Centralized helper to unwrap API responses and handle errors consistently
 * @param res - The fetch Response object
 * @returns The unwrapped data from the ApiResponse
 * @throws Error with appropriate message if the response contains an error
 */
export async function unwrapApiResponse<T>(res: Response): Promise<T> {
  const apiRes: ApiResponse<T> = await res.json();
  
  if (!res.ok || apiRes.error) {
    throw new Error(apiRes.error ?? apiRes.message ?? res.statusText);
  }
  
  if (!apiRes.data) {
    throw new Error('Malformed API response: missing data');
  }
  
  return apiRes.data;
} 