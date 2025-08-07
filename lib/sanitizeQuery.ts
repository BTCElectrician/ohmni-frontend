/**
 * Sanitizes a query string by removing NULL characters and other control characters
 * that can cause backend errors when copy-pasted from Word, PDF, or other sources.
 * 
 * @param query - The raw query string that may contain NULL characters
 * @returns Clean query string with NULL characters removed
 */
export const sanitizeQuery = (query: string): string => {
  if (!query || typeof query !== 'string') return '';
  
  // Remove NULL characters and other control characters
  // \0 = NULL character (0x00)
  // \u0000-\u001F = Control characters (0x00-0x1F)
  // \u007F = Delete character (0x7F)
  return query.replace(/[\0\u0000-\u001F\u007F]/g, '');
};

/**
 * Sanitizes a query and provides debug information
 * @param query - The raw query string
 * @returns Object with clean query and debug info
 */
export const sanitizeQueryWithDebug = (query: string) => {
  if (!query || typeof query !== 'string') {
    return {
      cleanQuery: '',
      wasModified: false,
      originalLength: 0,
      cleanLength: 0
    };
  }
  
  const cleanQuery = sanitizeQuery(query);
  const wasModified = query !== cleanQuery;
  
  return {
    cleanQuery,
    wasModified,
    originalLength: query.length,
    cleanLength: cleanQuery.length
  };
};
