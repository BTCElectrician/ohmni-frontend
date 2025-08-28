# Fix SSE Title Field Name Mismatch

## Problem
localStorage writes `ts` but rehydration code reads `timestamp`, causing titles to not appear until refresh.

## Files to Modify
1. `app/chat/page.tsx`
2. `components/chat/ChatSidebar.tsx`

---

## File 1: `app/chat/page.tsx`

### Find this useEffect block that handles SESSION_TITLE_UPDATED_EVENT:
```typescript
useEffect(() => {
  const onTitle = (e: Event) => {
    // ... existing onTitle code ...
  };

  window.addEventListener(SESSION_TITLE_UPDATED_EVENT, onTitle);

  // Rehydrate any title update that might have fired before listeners mounted
  try {
    const raw = localStorage.getItem(SESSION_TITLE_STORAGE_KEY);
    if (raw) {
      const { sessionId, title, message_count, timestamp } = JSON.parse(raw);
      // Apply if recent (last 30s) to avoid stale overrides on reloads
      if (sessionId && title && (!timestamp || Date.now() - timestamp < 30000)) {
        // ... rest of rehydration logic ...
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

### Replace the ENTIRE useEffect with:
```typescript
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
      const parsed = JSON.parse(raw);
      const { sessionId, title, message_count } = parsed;
      const ts = parsed.ts ?? parsed.timestamp; // FIX: accept both field names

      // Apply if recent (last 30s) to avoid stale overrides on reloads
      if (sessionId && title && (!ts || Date.now() - ts < 30000)) {
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

---

## File 2: `components/chat/ChatSidebar.tsx`

### Change 1: Find the storage event listener useEffect
Look for:
```typescript
useEffect(() => {
  const onStorage = (e: StorageEvent) => {
    if (e.key !== SESSION_TITLE_STORAGE_KEY || !e.newValue) return;
    
    try {
      const { sessionId, title, message_count, timestamp } = JSON.parse(e.newValue);
      if (!sessionId || !title) return;

      // Optional TTL filter
      if (timestamp && Date.now() - timestamp > 30000) return;
      // ... rest of logic ...
    } catch {
      // Ignore parse error
    }
  };

  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}, [queryClient]);
```

### Replace with:
```typescript
useEffect(() => {
  const onStorage = (e: StorageEvent) => {
    if (e.key !== SESSION_TITLE_STORAGE_KEY || !e.newValue) return;
    
    try {
      const parsed = JSON.parse(e.newValue);
      const { sessionId, title, message_count } = parsed;
      const ts = parsed.ts ?? parsed.timestamp; // FIX: accept both field names
      if (!sessionId || !title) return;

      // Optional TTL filter (keeps behavior consistent with rehydration)
      if (ts && Date.now() - ts > 30000) return;

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

### Change 2: Find the local rehydration useEffect
Look for:
```typescript
useEffect(() => {
  try {
    const raw = localStorage.getItem(SESSION_TITLE_STORAGE_KEY);
    if (!raw) return;
    const { sessionId, title, message_count, timestamp } = JSON.parse(raw);
    // Optional TTL: only apply if recent (<= 30s)
    if (sessionId && title && (!timestamp || Date.now() - timestamp < 30000)) {
      // ... rest of logic ...
    }
  } catch {
    // ignore parse errors
  }
}, [queryClient]);
```

### Replace with:
```typescript
useEffect(() => {
  try {
    const raw = localStorage.getItem(SESSION_TITLE_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const { sessionId, title, message_count } = parsed;
    const ts = parsed.ts ?? parsed.timestamp; // FIX: accept both field names

    // Optional TTL: only apply if recent (<= 30s)
    if (sessionId && title && (!ts || Date.now() - ts < 30000)) {
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

---

## Summary of Changes

All changes use the same pattern:
```typescript
// OLD (broken):
const { sessionId, title, message_count, timestamp } = JSON.parse(raw);
if (sessionId && title && (!timestamp || Date.now() - timestamp < 30000))
// NEW (fixed):
const parsed = JSON.parse(raw);
const { sessionId, title, message_count } = parsed;
const ts = parsed.ts ?? parsed.timestamp; // Accept both field names
if (sessionId && title && (!ts || Date.now() - ts < 30000))
```

## Testing
After applying these changes:
1. Navigate from home → chat (don't click "New Chat")
2. Type message directly
3. Title should appear instantly when response completes
4. Refresh page - title should persist