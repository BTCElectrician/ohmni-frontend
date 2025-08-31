# Frontend SSE Parser Fix for Code Search

## Problem Summary
- **Backend**: Working correctly, properly handles `answer: null` and falls back to `results`
- **Frontend**: Too strict in parsing SSE events, expects JSON with `type` field
- **Solution**: Make frontend parser accept multiple formats

## File to Modify
`services/chatService.ts`

## Find and Replace Instructions

### Step 1: Locate the SSE Parser
Find this code in the `searchCode()` function (around lines 150-180):

```typescript
// FIND THIS BLOCK:
frame.split('\n').forEach(line => {
  if (line.startsWith('data: ')) {
    try {
      const jsonStr = line.slice(6).trim();
      if (!jsonStr) return;
      
      const data = JSON.parse(jsonStr);
      switch (data.type) {
        case 'content':
          messageBuffer += data.content;
          onChunk?.(data.content);
          break;
        case 'complete':
          applyTitleFromComplete(data);
          break;
        case 'error':
          throw new Error(data.error || 'Search error occurred');
        default:
          console.warn('Unknown SSE event type:', data.type);
      }
    } catch (e) {
      console.error('Failed to parse SSE data:', e, 'Line:', line);
      // Continue processing other lines
    }
  }
});
```

### Step 2: Replace with Flexible Parser
Replace the ENTIRE block above with:

```typescript
// REPLACE WITH THIS FLEXIBLE PARSER:
frame.split('\n').forEach(line => {
  if (line.startsWith('data: ')) {
    const jsonStr = line.slice(6).trim();
    if (!jsonStr) return;
    
    try {
      // Attempt to parse as JSON
      const data = JSON.parse(jsonStr);
      
      // Check if it's a properly formatted event with type
      if (data.type) {
        switch (data.type) {
          case 'content':
            if (data.content) {
              messageBuffer += data.content;
              onChunk?.(data.content);
            }
            break;
            
          case 'complete':
            applyTitleFromComplete(data);
            break;
            
          case 'error':
            console.error('Search error:', data.error);
            throw new Error(data.error || 'Search error occurred');
            
          default:
            console.warn('Unknown event type:', data.type);
            // If unknown type has content, use it
            if (data.content) {
              messageBuffer += data.content;
              onChunk?.(data.content);
            }
        }
      } 
      // Handle JSON without type field
      else if (typeof data === 'object' && data !== null) {
        // Check for direct content field
        if (data.content) {
          messageBuffer += data.content;
          onChunk?.(data.content);
        }
        // Check for results array (from Azure Function)
        else if (data.results && Array.isArray(data.results)) {
          data.results.forEach(result => {
            if (result.content) {
              messageBuffer += result.content + '\n';
              onChunk?.(result.content + '\n');
            }
          });
        }
        // Unknown object structure - stringify it
        else {
          const content = JSON.stringify(data);
          messageBuffer += content;
          onChunk?.(content);
        }
      }
      // Handle primitive JSON values (strings, numbers)
      else {
        messageBuffer += String(data);
        onChunk?.(String(data));
      }
      
    } catch (parseError) {
      // Not JSON - treat as raw text content
      console.log('Processing raw text SSE:', jsonStr.substring(0, 100));
      messageBuffer += jsonStr;
      onChunk?.(jsonStr);
    }
  }
});
```

### Step 3: Add Debug Flag (Optional)
At the top of the `searchCode` function, add:

```typescript
// Add after function declaration:
const DEBUG_SSE = process.env.NODE_ENV === 'development';

if (DEBUG_SSE) {
  console.log('🔍 Code search started:', message);
}
```

### Step 4: Update Error Message
Find this section near the end of `searchCode`:

```typescript
// FIND:
if (!messageBuffer && !errorOccurred) {
  throw new Error('No results received from search');
}

// REPLACE WITH:
if (!messageBuffer && !errorOccurred) {
  console.error('❌ No content received from code search stream');
  throw new Error('No results received from code search. Please try again.');
}
```

## What This Fix Does

1. **Maintains compatibility**: Still works perfectly with properly formatted SSE events
2. **Adds flexibility**: Accepts JSON without `type`, raw results arrays, and plain text
3. **Better error handling**: Logs issues without breaking the stream
4. **Handles edge cases**: 
   - Backend sending raw NEC results
   - Azure Function response structure
   - Plain text fallback

## Testing Instructions

1. Open browser DevTools (F12)
2. Go to Console tab
3. Try a code search: "What does the code say about GFCI protection?"
4. Watch for:
   - 🔍 "Code search started" message
   - Any "Processing raw text SSE" messages
   - Successful results appearing in chat

## Success Criteria

✅ Code search returns results instead of "temporarily unavailable"  
✅ No JSON parse errors in console  
✅ Results appear in the chat interface  
✅ Console shows what format is being processed  

## Rollback

If issues occur, revert `services/chatService.ts` to previous version using git:
```bash
git checkout -- services/chatService.ts
```