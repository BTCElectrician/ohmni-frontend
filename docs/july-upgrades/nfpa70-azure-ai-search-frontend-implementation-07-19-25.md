# NFPA 70 Azure AI Search Frontend Implementation Guide
**Date**: July 19, 2025  
**Feature**: Add NFPA 70 (NEC) code search via Azure AI Search to chat interface  
**Risk Level**: Low (additive changes only)  
**Backend Status**: Already deployed on Render  

## Feature Branch Workflow

```bash
# Create and checkout feature branch
git checkout -b feature/nec-code-search

# After implementation and testing
git add .
git commit -m "feat: add NEC code search with book icon toggle"

# Push to remote
git push origin feature/nec-code-search

# After verification, merge to main
git checkout main
git pull origin main
git merge feature/nec-code-search
git push origin main
```

## Implementation Steps

### Step 1: Update ChatInput Component

**FILE**: `components/chat/ChatInput.tsx`

```typescript
// 1. Add BookOpenText to imports (line ~2)
import { Brain, Mic, Paperclip, Radiation, Send, X, Image as ImageIcon, BookOpenText } from 'lucide-react';

// 2. Add state for code search mode (after line ~23)
const [codeSearchMode, setCodeSearchMode] = useState(false);

// 3. Add toggle handler (after toggleNuclear function ~38)
const toggleCodeSearch = () => {
  const newState = !codeSearchMode;
  setCodeSearchMode(newState);
  if (newState) {
    setDeepThinking(false);
    setNuclearThinking(false);
  }
};

// 4. Update mutual exclusivity in existing toggles (modify ~30-40)
const toggleDeepThinking = () => {
  const newState = !deepThinking;
  setDeepThinking(newState);
  if (newState) {
    setNuclearThinking(false);
    setCodeSearchMode(false); // ADD THIS LINE
  }
};

const toggleNuclear = () => {
  const newState = !nuclearThinking;
  setNuclearThinking(newState);
  if (newState) {
    setDeepThinking(false);
    setCodeSearchMode(false); // ADD THIS LINE
  }
};

// 5. Update placeholder text logic (modify ~260)
placeholder={
  selectedFile 
    ? "Add a message about this image (optional)..." 
    : codeSearchMode 
      ? "Search NEC code..." 
      : "Type your message here..."
}

// 6. Add Book button after Nuclear button (after line ~310)
{/* Code Search Toggle */}
<button
  type="button"
  onClick={toggleCodeSearch}
  disabled={disabled || isStreaming || !!selectedFile}
  className={`p-2.5 rounded-lg transition-all ${
    codeSearchMode
      ? 'bg-orange-600/20 text-orange-600 ring-2 ring-orange-600/30'
      : 'bg-[#2d3748]/50 text-[#4a5568] hover:text-[#718096] hover:bg-[#2d3748]/70'
  } disabled:opacity-50 disabled:cursor-not-allowed`}
  title={selectedFile ? 'Not available with images' : codeSearchMode ? 'Code search mode active' : 'Search NEC code'}
>
  <BookOpenText className={`w-5 h-5 ${codeSearchMode ? 'animate-pulse' : ''}`} />
</button>

// 7. Add status indicator (modify status indicators section ~355)
{codeSearchMode && !selectedFile && (
  <div className="flex items-center gap-2 text-sm text-orange-600 animate-fadeInUp">
    <BookOpenText className="w-4 h-4 animate-pulse" />
    <span>Code search mode active</span>
  </div>
)}

// 8. Reset code search mode after submit (in handleSubmit ~95)
setMessage('');
setDeepThinking(false);
setNuclearThinking(false);
setCodeSearchMode(false); // ADD THIS LINE
```

### Step 2: Update Chat Page to Handle Code Search

**FILE**: `app/chat/page.tsx`

```typescript
// 1. Add code search parameter to sendMessage function (modify ~340)
const sendMessage = async (
  content: string, 
  useDeepReasoning: boolean = false,
  useNuclear: boolean = false,
  useCodeSearch: boolean = false  // ADD THIS PARAMETER
) => {
  // Hide prompts once user starts chatting
  setShowPrompts(false);
  
  if (!currentSession) {
    // ... existing session creation code ...
    await sendMessageWithSession(session.id, content, useDeepReasoning, useNuclear, useCodeSearch);
    return;
  }

  sendMessageWithSession(currentSession.id, content, useDeepReasoning, useNuclear, useCodeSearch);
};

// 2. Update sendMessageWithSession to handle code search (modify ~420)
const sendMessageWithSession = async (
  sessionId: string, 
  content: string,
  useDeepReasoning: boolean = false,
  useNuclear: boolean = false,
  useCodeSearch: boolean = false  // ADD THIS PARAMETER
) => {
  // ... existing code ...
  
  try {
    // ADD: Handle code search differently
    if (useCodeSearch) {
      const aiResponse = await chatService.searchCode(
        sessionId,
        content,
        (chunk: string) => {
          updateMessage(tempAiMessageId, (prev) => prev + chunk);
        }
      );
    } else {
      // Existing chat flow
      const aiResponse = await chatService.sendMessage(
        sessionId, 
        content, 
        (chunk: string) => {
          updateMessage(tempAiMessageId, (prev) => prev + chunk);
        },
        useDeepReasoning,
        useNuclear
      );
    }
    
    // ... rest of existing code ...
  } catch (error) {
    // ... existing error handling ...
  }
};

// 3. Update ChatInput onSendMessage prop to include code search (modify ~780)
<ChatInput
  onSendMessage={(message, useDeep, useNuclear, useCodeSearch) => 
    sendMessage(message, useDeep, useNuclear, useCodeSearch)
  }
  onSendMessageWithFile={sendMessageWithFile}
  autoSendOnFileSelect={false}
  isStreaming={isStreaming}
  disabled={false}
/>
```

### Step 3: Update ChatInput Props Interface

**FILE**: `components/chat/ChatInput.tsx`

```typescript
// 1. Update interface (modify ~10)
interface ChatInputProps {
  onSendMessage: (
    message: string, 
    useDeepReasoning?: boolean, 
    useNuclear?: boolean,
    useCodeSearch?: boolean  // ADD THIS
  ) => void;
  onSendMessageWithFile?: (message: string, file: File) => Promise<void>;
  onVoiceRecord?: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  autoSendOnFileSelect?: boolean;
}

// 2. Update handleSubmit to pass code search state (modify ~100)
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if ((!message.trim() && !selectedFile) || disabled || isStreaming) {
    return;
  }

  if (selectedFile && onSendMessageWithFile) {
    await onSendMessageWithFile(
      message.trim() || 'Please analyze this image',
      selectedFile
    );
    clearSelectedFile();
  } else if (message.trim()) {
    // Pass code search state
    onSendMessage(message.trim(), deepThinking, nuclearThinking, codeSearchMode);
  }
  
  setMessage('');
  setDeepThinking(false);
  setNuclearThinking(false);
  setCodeSearchMode(false);
};
```

### Step 4: Add Code Search Service Method

**FILE**: `services/chatService.ts`

```typescript
// Add this method to the ChatService class (after sendMessage method ~250)
async searchCode(
  sessionId: string,
  query: string,
  onChunk?: (text: string) => void
): Promise<ChatMessage> {
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  
  try {
    console.log('Searching NEC code:', query);
    
    const response = await streamRequest(
      `/api/chat/sessions/${sessionId}/search-code`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      }
    );

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const errorText = await response.text();
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorData.message || response.statusText;
      } catch {
        // Use status text if parsing fails
      }
      throw new APIError(response.status, errorMessage);
    }

    reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let messageBuffer = '';
    let lastMessage: ChatMessage | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            switch (data.type) {
              case 'content':
                messageBuffer += data.content;
                onChunk?.(data.content);
                break;
              case 'complete':
                console.log('Code search completed');
                break;
              case 'error':
                throw new Error(data.error);
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', e);
          }
        }
      }
    }

    // Return the complete message
    return {
      id: 'temp-' + Date.now(),
      sessionId: sessionId,
      role: 'assistant',
      content: messageBuffer,
      timestamp: new Date(),
      metadata: {
        code_search: true
      }
    };
  } catch (error) {
    console.error('Code search error:', error);
    throw error;
  } finally {
    if (reader) {
      try {
        reader.releaseLock();
      } catch (e) {
        console.warn('Failed to release reader lock:', e);
      }
    }
  }
}
```

### Step 5: Update Types (Optional)

**FILE**: `types/api.ts`

```typescript
// Add to ChatMessage metadata type (modify ~55)
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sessionId: string;
  metadata?: {
    deep_reasoning?: boolean;
    nuclear_mode?: boolean;
    model_used?: string;
    reasoning_remaining?: number;
    nuclear_remaining?: number;
    code_search?: boolean;  // ADD THIS LINE
  };
  attachments?: {
    type: 'image' | 'pdf';
    url?: string;
    filename: string;
    size?: number;
    analysis?: VisionAnalysis;
  }[];
}
```

## Testing Checklist

### Local Testing
```bash
# Start development server
npm run dev

# Test scenarios:
```

1. **Basic Code Search**
   - [ ] Click book icon - turns orange
   - [ ] Placeholder changes to "Search NEC code..."
   - [ ] Type "grounding" and press Enter
   - [ ] Results appear in chat
   - [ ] Book icon automatically turns off after search

2. **Mutual Exclusivity**
   - [ ] Enable Brain mode, then click Book - Brain turns off
   - [ ] Enable Nuclear mode, then click Book - Nuclear turns off
   - [ ] Enable Book mode, then click Brain - Book turns off

3. **Context Preservation**
   - [ ] Have a conversation about panel installation
   - [ ] Use code search for "panel grounding"
   - [ ] Continue conversation - context is maintained

4. **Error Handling**
   - [ ] Search with empty query
   - [ ] Search with very long query (>200 chars)
   - [ ] Search when backend is unavailable

### Production Verification
```bash
# After deploying to Vercel
# Test all scenarios above on production URL
```

## Rollback Plan

If issues arise:
```bash
# Quick revert
git checkout main
git revert HEAD
git push origin main

# Vercel will auto-deploy the revert
```

## Environment Variables

No new environment variables needed - frontend already has:
- `NEXT_PUBLIC_BACKEND_URL` pointing to Render backend

## Monitoring

After deployment, monitor:
1. Vercel function logs for any errors
2. Browser console for client-side errors
3. Network tab to ensure proper SSE streaming

## Notes

- The orange color `#EA580C` matches Claude's orange (Tailwind's orange-600)
- Code search is disabled when file is selected (same as other modes)
- Auto-disables after search completes for better UX
- Preserves conversation context for follow-up questions
- Searches NFPA 70 content via Azure AI Search backend integration