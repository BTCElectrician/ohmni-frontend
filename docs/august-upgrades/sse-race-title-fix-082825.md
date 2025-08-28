# SSE Title Race Condition Fix - Implementation PRD

## Problem Statement
When users navigate to chat and type directly (without clicking "New Chat"), the session auto-creates but the title fails to update because the SSE complete event fires before the sidebar's event listeners mount (due to dynamic import of Resizable container).

## Solution Overview
Move title update listener to parent component (ChatPage) so it's always ready before streaming starts, add microtask wait to ensure state updates, and add localStorage rehydration as safety net.

## Implementation Instructions

### File 1: `app/chat/page.tsx`

#### Step 1.1: Add imports at the top
```typescript
// ADD these imports after existing imports
import { SESSION_TITLE_UPDATED_EVENT, SESSION_TITLE_STORAGE_KEY } from '@/lib/events';
```

#### Step 1.2: Add global listener useEffect
Find the existing `useEffect` that checks authentication status. **AFTER** that effect, add this new useEffect:

```typescript
// ADD this entire useEffect block after the authentication check useEffect
useEffect(() => {
  const onTitle = (e: Event) => {
    const detail = (e as CustomEvent<{ sessionId: string; title: string; message_count?: number }>).detail;
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

  // Rehydrate any title update that might have fired before listeners mounted
  try {
    const raw = localStorage.getItem(SESSION_TITLE_STORAGE_KEY);
    if (raw) {
      const { sessionId, title, message_count, timestamp } = JSON.parse(raw);
      // Apply if recent (last 30s) to avoid stale overrides on reloads
      if (sessionId && title && (!timestamp || Date.now() - timestamp < 30000)) {
        queryClient.setQueryData<ChatSession[]>(['chat-sessions'], (old) =>
          Array.isArray(old)
            ? old.map((s) =>
                s.id === sessionId
                  ? { ...s, name: title, message_count: message_count ?? s.message_count }
                  : s
              )
            : old
        );
      }
    }
  } catch {
    // ignore parse errors
  }

  return () => {
    window.removeEventListener(SESSION_TITLE_UPDATED_EVENT, onTitle);
  };
}, [queryClient]);
```

#### Step 1.3: Update sendMessage function
Find the `sendMessage` function. In the section where it creates a new session (inside the `if (!currentSession)` block), add a microtask wait:

```typescript
// FIND this block in sendMessage:
if (!currentSession) {
  try {
    console.log('No current session, creating new one...');
    setIsCreatingNewSession(true);
    const session = await chatService.createSession('New Chat');
    console.log('New session created:', session);

    if (!session || !session.id) {
      throw new Error('Failed to create session - invalid response');
    }

    // Ensure state is set BEFORE streaming begins
    setCurrentSession(session);
    
    // ADD THIS LINE - Microtask wait to let effects/listeners flush
    await new Promise((res) => setTimeout(res, 0));

    await sendMessageWithSession(session.id, content, useDeepReasoning, useNuclear, useCodeSearch);
    // ... rest of existing code
```

#### Step 1.4: Update sendMessageWithFile function
Find the `sendMessageWithFile` function. In the section where it creates a new session, add the same microtask wait:

```typescript
// FIND this block in sendMessageWithFile:
if (!currentSession) {
  try {
    setIsCreatingNewSession(true);
    const session = await chatService.createSession('New Chat');
    setCurrentSession(session);
    
    // ADD THIS LINE - Microtask wait here too
    await new Promise((res) => setTimeout(res, 0));

    await sendMessageWithFileToSession(session.id, content, file);
    // ... rest of existing code
```

### File 2: `components/chat/ChatSidebar.tsx`

#### Step 2.1: Add localStorage rehydration
Find the existing `useEffect` hooks in the ChatSidebar component. Add this new useEffect **AFTER** the existing ones:

```typescript
// ADD this entire useEffect block
useEffect(() => {
  try {
    const raw = localStorage.getItem(SESSION_TITLE_STORAGE_KEY);
    if (!raw) return;
    const { sessionId, title, message_count, timestamp } = JSON.parse(raw);
    // Optional TTL: only apply if recent (<= 30s)
    if (sessionId && title && (!timestamp || Date.now() - timestamp < 30000)) {
      queryClient.setQueryData<ChatSession[]>(['chat-sessions'], (old) =>
        Array.isArray(old)
          ? old.map((s) =>
              s.id === sessionId
                ? { ...s, name: title, message_count: message_count ?? s.message_count }
                : s
            )
          : old
      );
    }
  } catch {
    // ignore parse errors
  }
}, [queryClient]);
```

## Testing Checklist

### Deployment Steps
1. Make the above changes to both files
2. Commit with message: `fix: resolve SSE title race condition for auto-created sessions`
3. Push to main branch
4. Wait for Vercel auto-deployment

### Test Scenarios
1. **Auto-create path** (PRIMARY FIX TARGET)
   - Navigate from home to chat
   - Type message directly without clicking "New Chat"
   - Title should appear instantly when response completes

2. **Manual create path** (should still work)
   - Click "New Chat" button
   - Send message
   - Title should appear instantly

3. **All chat modes**
   - Regular chat → Title updates
   - Deep reasoning → Title updates
   - Nuclear mode → Title updates
   - Vision/image → Title updates
   - Code search → Title updates

4. **Multi-tab sync**
   - Open chat in two browser tabs
   - Send message in one tab
   - Title should sync to other tab

### Success Criteria
- NO polling requests to `/api/chat/sessions` after sending messages
- Titles appear instantly (<100ms) after SSE complete event
- Both session creation paths behave identically
- No console errors
- Multi-tab sync works

## Rollback Plan
If issues occur:
1. Revert the commit
2. Push to main
3. Vercel will auto-deploy previous version
4. Total rollback time: < 2 minutes

## Notes
- The constants `SESSION_TITLE_UPDATED_EVENT` and `SESSION_TITLE_STORAGE_KEY` already exist in `lib/events.ts`
- The 30-second TTL on localStorage prevents stale data while preserving cross-tab sync
- The microtask wait ensures React state updates flush before streaming begins
- This fix is backwards compatible - no backend changes needed