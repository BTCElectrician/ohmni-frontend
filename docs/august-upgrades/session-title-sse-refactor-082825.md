# Product Requirements Document: Session Title Updates via SSE

## Executive Summary

Eliminate unnecessary API polling for chat session titles by consuming them directly from the SSE (Server-Sent Events) stream that the backend already provides. This will reduce network requests by ~75% and provide instant title updates (<100ms) instead of the current 5-8 second delay.

**Status**: ✅ **Green light with architectural improvements** - Implementation ready

## Problem Statement

### Current State
- Frontend polls `/api/chat/sessions` multiple times after sending first message (at 5s and 8s intervals)
- Users experience a 5-8 second delay before seeing auto-generated session titles
- Unnecessary network traffic (2-3 extra requests per new chat)
- Poor UX with delayed visual feedback

### Root Cause
The backend generates session titles immediately but the frontend doesn't know when they're ready, so it blindly polls on a timer.

## Solution Overview

### High-Level Approach
1. Backend already includes session title in SSE `complete` event ✅ (deployed)
2. Frontend will capture this title from the stream
3. Update Zustand store and React Query cache directly
4. Remove all polling code
5. Add cross-tab synchronization via localStorage

### Benefits
- **Instant feedback**: Titles appear immediately when generated
- **Reduced load**: 75% fewer `/api/chat/sessions` requests
- **Better UX**: No more waiting for titles to "pop in"
- **Cross-tab sync**: Multiple tabs stay synchronized without network calls
- **Clean architecture**: Services remain UI-agnostic with event-driven updates

## Architectural Decisions

### Critical Design Principles

1. **Services remain UI-agnostic**: Services (chatService.ts) publish events and update Zustand, but do NOT depend on React Query. UI layer (Sidebar) is responsible for updating query cache, preserving separation of concerns.

2. **Event-driven cache updates**: Using CustomEvent and localStorage for cross-tab sync avoids introducing a shared cache "manager" and keeps the change set small and localized.

3. **SSR Safety**: All window/localStorage usage must be behind `typeof window !== 'undefined'` guards to avoid SSR surprises.

4. **Optional fallback**: Feature flag `NEXT_PUBLIC_SSE_TITLE_FALLBACK` provides a safety net if backend occasionally omits fields (default: false).

## Technical Implementation

### 1. Update TypeScript Types

**File:** `types/api.ts`  
**Location:** SSEEventType definition near bottom of file  
**Why:** Enables type-safe consumption of the new fields from SSE

```typescript
export type SSEEventType = 
  | { type: 'content'; content: string }
  | { type: 'message'; message: ChatMessage }
  | { type: 'error'; error: string }
  | { 
      type: 'config'; 
      deep_reasoning?: boolean;
      model?: string;
      remaining_deep_reasoning?: number;
      remaining_nuclear?: number;
    }
  | { type: 'vision_start'; message: string }
  | { type: 'vision_result'; content: string }
  | { 
      type: 'complete'; 
      message?: string;
      session_title?: string;    // NEW
      session_id?: string;       // NEW
      message_count?: number;    // NEW
    };
```

**Side effects:** None; backwards-compatible. If backend omits fields, types remain optional.

### 2. Add Event Constants

**File:** `lib/events.ts`  
**Location:** Add after existing export  
**Why:** Avoid lib coupling to React Query/Zustand; keep coordination via events

```typescript
export const SESSION_UPDATED_EVENT = 'session-updated'; 
export const SESSION_TITLE_UPDATED_EVENT = 'session-title-updated';        // NEW
export const SESSION_TITLE_STORAGE_KEY = 'ohmni:session-title-updated';    // NEW
```

### 3. Update SSE Handler (Service Layer)

**File:** `services/chatService.ts`  
**Why:** Centralizes logic so both streamVisionResponse and searchCode can call it without duplicating code. Does not introduce direct React Query dependency into services.

#### Add imports at top:
```typescript
import { useChatStore } from '@/store/chatStore';
import { SESSION_TITLE_UPDATED_EVENT, SESSION_TITLE_STORAGE_KEY } from '@/lib/events';
```

#### Add helper function (module-scope, NOT inside class):
```typescript
function applyTitleFromComplete(data: { 
  session_title?: string; 
  session_id?: string; 
  message_count?: number 
}) {
  if (!data?.session_title || !data?.session_id) return;

  const store = useChatStore.getState();
  const current = store.currentSession;
  if (!current || current.id !== data.session_id) return;

  if (data.session_title !== current.name) {
    // 1) Update Zustand store session in-place
    store.setCurrentSession({
      ...current,
      name: data.session_title,
      message_count: data.message_count ?? current.message_count,
    });

    // 2) Notify same-tab listeners (e.g., sidebar) without a network call
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(SESSION_TITLE_UPDATED_EVENT, {
          detail: {
            sessionId: current.id,
            title: data.session_title,
            message_count: data.message_count,
          },
        })
      );

      // 3) Cross-tab propagation via localStorage
      try {
        localStorage.setItem(
          SESSION_TITLE_STORAGE_KEY,
          JSON.stringify({
            sessionId: current.id,
            title: data.session_title,
            message_count: data.message_count,
            ts: Date.now(),
          })
        );
      } catch {
        // Storage unavailable or quota exceeded — safe to ignore
      }
    }
  }
}
```

#### Update streamVisionResponse switch statement:
**Location:** Inside frame processing, switch (data.type)

```typescript
// FROM:
case 'complete':
  console.log('Stream completed');
  break;

// TO:
case 'complete':
  applyTitleFromComplete(data as any); // type narrowed by SSEEventType
  break;
```

#### Update searchCode switch statement:
**Location:** In searchCode streaming loop, inside switch (data.type)

```typescript
// FROM:
case 'complete':
  console.log('Code search completed');
  break;

// TO:
case 'complete':
  applyTitleFromComplete(data as any);
  break;
```

**Side effects:** None in SSR if guarded. ChatService is consumed by client components already; this addition remains client-only.

### 4. Update Sidebar Component (UI Layer)

**File:** `components/chat/ChatSidebar.tsx`  
**Why:** Keeps list in sync immediately without invalidating/refetching

#### Add imports:
```typescript
import { SESSION_UPDATED_EVENT, SESSION_TITLE_UPDATED_EVENT, SESSION_TITLE_STORAGE_KEY } from '@/lib/events';
import type { ChatSession } from '@/types/api';
import { useQueryClient } from '@tanstack/react-query'; // already imported
```

#### Add same-tab event handler:
```typescript
useEffect(() => {
  const onTitle = (e: Event) => {
    const detail = (e as CustomEvent<{ 
      sessionId: string; 
      title: string; 
      message_count?: number 
    }>).detail;
    
    if (!detail?.sessionId || !detail.title) return;

    queryClient.setQueryData<ChatSession[]>(['chat-sessions'], (old) =>
      Array.isArray(old)
        ? old.map((s) =>
            s.id === detail.sessionId
              ? { ...s, name: detail.title, message_count: detail.message_count ?? s.message_count }
              : s
          )
        : old
    );
  };

  window.addEventListener(SESSION_TITLE_UPDATED_EVENT, onTitle);
  return () => window.removeEventListener(SESSION_TITLE_UPDATED_EVENT, onTitle);
}, [queryClient]);
```

#### Add cross-tab sync handler:
```typescript
useEffect(() => {
  const onStorage = (e: StorageEvent) => {
    if (e.key !== SESSION_TITLE_STORAGE_KEY || !e.newValue) return;
    
    try {
      const { sessionId, title, message_count } = JSON.parse(e.newValue);
      if (!sessionId || !title) return;

      queryClient.setQueryData<ChatSession[]>(['chat-sessions'], (old) =>
        Array.isArray(old)
          ? old.map((s) =>
              s.id === sessionId
                ? { ...s, name: title, message_count: message_count ?? s.message_count }
                : s
            )
          : old
      );
    } catch {
      // Ignore parse error
    }
  };

  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}, [queryClient]);
```

**Side effects:** None; listeners are cleaned up on unmount. setQueryData avoids re-fetches.

### 5. Remove Polling Code

**File:** `app/chat/page.tsx`  
**Why:** Title will be applied from SSE complete events. Removing timers eliminates redundant network requests.

#### Remove imports:
```typescript
// DELETE THIS LINE:
import { SESSION_UPDATED_EVENT } from '@/lib/events';
```

#### Remove state:
```typescript
// DELETE THIS LINE:
const [hasFirstMessage, setHasFirstMessage] = useState(false);
```

#### Remove constants:
```typescript
// DELETE THESE LINES:
const TITLE_REFRESH_DELAY = {
  INITIAL: 5000,
  RETRY: 8000
};
```

#### Remove from window 'new-chat-created' effect:
```typescript
// DELETE THIS LINE:
setHasFirstMessage(false);
```

#### Remove from sendMessageWithFileToSession:
Remove computation and logging of `isFirstMessage` and the entire block that sets `hasFirstMessage(true)` and schedules `queryClient.invalidateQueries`.

#### Remove from sendMessageWithSession:
Remove computation and logging of `isFirstMessage` and the entire block that sets `hasFirstMessage(true)` and schedules timers.

Example of block to DELETE:
```typescript
// DELETE this entire block:
if (isFirstMessage) {
  setHasFirstMessage(true);
  setTimeout(() => {
    queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
    window.dispatchEvent(new Event(SESSION_UPDATED_EVENT));
  }, TITLE_REFRESH_DELAY.INITIAL);

  if (useDeepReasoning || useNuclear) {
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
    }, TITLE_REFRESH_DELAY.RETRY);
  }
}
```

### 6. Optional Safety Fallback (Defensive)

**File:** `.env.local` (optional)  
**Purpose:** Safety net if backend occasionally omits title fields

```env
# Optional: Enable fallback polling if SSE title missing (default: false)
NEXT_PUBLIC_SSE_TITLE_FALLBACK=false
```

If enabled, add a single fallback invalidation after 8s as a safety net. This is NOT required per design but provides a kill switch if issues arise.

## Testing Requirements

### Functional Testing

#### Basic Flow
- [ ] Create new chat session
- [ ] Send first message
- [ ] Title updates instantly (no 5-8 second delay)
- [ ] Network tab shows NO extra `/api/chat/sessions` requests
- [ ] Console shows no errors

#### Feature Coverage
- [ ] Regular text chat: Title updates on complete
- [ ] Image upload with vision: Title updates after analysis
- [ ] Deep reasoning (brain button): Title updates
- [ ] Nuclear model: Title updates
- [ ] Code search: Title updates

#### Edge Cases
- [ ] Multiple browser tabs: Title syncs across tabs
- [ ] Rapid message sending: No title flapping or race conditions
- [ ] Existing sessions: Continue to work normally
- [ ] Session switching: Titles remain stable
- [ ] SSR pages: No hydration errors

### Performance Testing
- [ ] Title update latency: <100ms from SSE complete event
- [ ] Network requests: 75% reduction in `/api/chat/sessions` calls
- [ ] Memory: No leaks from event listeners
- [ ] CPU: No excessive re-renders

### Cross-Browser Testing
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers (iOS Safari, Chrome Android)

## Success Metrics

### Primary Metrics
- **API Request Reduction**: ≥75% fewer `/api/chat/sessions` calls
- **Title Update Speed**: From 5-8 seconds → <100ms
- **User Satisfaction**: Immediate visual feedback
- **Zero Breaking Changes**: All existing functionality preserved

### Secondary Metrics
- **Error Rate**: No increase in console errors
- **Memory Usage**: No increase in baseline memory
- **Cross-tab Sync**: 100% consistency across tabs
- **Code Maintainability**: Clear separation of concerns preserved

## Deployment Plan

### Prerequisites
- [x] Backend SSE changes deployed (already complete)
- [ ] Frontend TypeScript types updated
- [ ] Event handling code implemented
- [ ] Polling code removed
- [ ] Testing complete
- [ ] Code review passed

### Deployment Steps
1. **Stage 1**: Deploy to staging environment
2. **Stage 2**: QA validation (30 minutes)
3. **Stage 3**: Deploy to production
4. **Stage 4**: Monitor metrics for 1 hour
5. **Stage 5**: Confirm success or rollback

### Monitoring
- Watch for console errors in browser logs
- Monitor `/api/chat/sessions` request volume
- Track session title update latency
- Check memory usage patterns
- Verify cross-tab sync functionality

## Rollback Plan

If issues arise, rollback is simple and safe:

### Quick Rollback (< 2 minutes)
1. Revert the SSE handler changes in `chatService.ts`
2. Restore the setTimeout polling code in `app/chat/page.tsx`
3. Deploy hotfix
4. Backend continues sending extra fields (harmless)

### Feature Flag Rollback (Optional)
If fallback was implemented:
1. Set `NEXT_PUBLIC_SSE_TITLE_FALLBACK=true` in environment
2. Redeploy or use runtime config
3. Single fallback poll will activate as safety net

### No Data Migration
- No database changes
- No API contract changes
- No data loss risk

## Risk Assessment

### Low Risk
- **Backward Compatible**: Backend changes already deployed and stable
- **Additive Only**: We're consuming extra fields, not changing existing behavior
- **Graceful Degradation**: If SSE fields missing, nothing breaks
- **Easy Rollback**: Can revert to polling in minutes
- **Clean Architecture**: Services remain UI-agnostic

### Mitigations
- **TypeScript Safety**: Types prevent runtime errors
- **SSR Guards**: All browser APIs properly guarded
- **Event Cleanup**: Proper listener removal prevents leaks
- **Cross-tab Testing**: localStorage approach is battle-tested
- **Optional Fallback**: Feature flag for safety net if needed

## Dependencies and Imports

### New Dependencies
None required - all functionality uses existing packages

### Import Updates

#### services/chatService.ts
```typescript
+ import { useChatStore } from '@/store/chatStore';
+ import { SESSION_TITLE_UPDATED_EVENT, SESSION_TITLE_STORAGE_KEY } from '@/lib/events';
```

#### components/chat/ChatSidebar.tsx
```typescript
+ import { SESSION_UPDATED_EVENT, SESSION_TITLE_UPDATED_EVENT, SESSION_TITLE_STORAGE_KEY } from '@/lib/events';
+ import type { ChatSession } from '@/types/api';
  import { useQueryClient } from '@tanstack/react-query'; // already present
```

#### app/chat/page.tsx
```typescript
- import { SESSION_UPDATED_EVENT } from '@/lib/events'; // REMOVE
```

## Interfaces and Signatures

### New/Modified Interfaces

#### SSEEventType.complete (types/api.ts)
```typescript
{
  type: 'complete';
  message?: string;
  session_title?: string;    // NEW
  session_id?: string;       // NEW  
  message_count?: number;    // NEW
}
```

#### Helper Function (services/chatService.ts)
```typescript
function applyTitleFromComplete(data: { 
  session_title?: string; 
  session_id?: string; 
  message_count?: number 
}): void
```

## Timeline

- **Development**: 2 hours
- **Testing**: 1 hour
- **Code Review**: 30 minutes
- **Deployment**: 30 minutes
- **Monitoring**: 1 hour
- **Total**: ~5 hours

## Appendix

### A. Backend SSE Payload Structure
```json
{
  "type": "complete",
  "message_id": "uuid-here",
  "response_time": 2.5,
  "session_title": "Auto-generated title here",
  "session_id": "session-uuid",
  "message_count": 1
}
```

### B. Before/After Network Comparison

**Before (with polling)**:
```
[0s]   POST /api/chat/sessions/{id}/stream
[2s]   SSE complete event (ignored)
[5s]   GET /api/chat/sessions (poll #1)
[8s]   GET /api/chat/sessions (poll #2)
Total: 3 requests
```

**After (with SSE)**:
```
[0s]   POST /api/chat/sessions/{id}/stream
[2s]   SSE complete event (captured, title updated)
Total: 1 request
```

### C. Browser Compatibility
- Custom Events: All modern browsers
- localStorage: All modern browsers
- SSE: All modern browsers
- No polyfills required

### D. Non-Goals (Unchanged)
- No changes to backend contract beyond consuming optional fields
- No changes to authentication or middleware
- No changes to chat store API
- No new npm packages or dependencies

## Sign-offs

- [ ] Engineering Lead
- [ ] Frontend Engineer
- [ ] Backend Engineer (if backend changes needed)
- [ ] QA Lead
- [ ] Product Manager

---

*Document Version: 2.0*  
*Last Updated: Current*  
*Status: Green Light - Ready for Implementation*  
*Review Status: Validated by senior engineer with architectural improvements*