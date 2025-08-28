# Implementation Plan: Fix Duplicate Session Requests
## For Cursor AI Agent Execution

### CRITICAL: Read This First
- This plan fixes duplicate API calls to `/api/chat/sessions`
- Current: 4 requests per page load
- Target: 1 request per page load
- Approach: Remove redundant manual fetching, trust React Query
- **DO NOT** create new files unless explicitly stated
- **DO NOT** add features, only remove redundant code

---

## Phase 1: Fix ChatSidebar (PRIORITY - Do This First)

### File: `components/chat/ChatSidebar.tsx`

#### Step 1.1: Remove These Imports
```typescript
// DELETE these lines:
import { ChatService } from '@/services/chatService';
```

#### Step 1.2: Remove Manual Service Instance
```typescript
// DELETE this line (near top of component):
const chatService = new ChatService();
```

#### Step 1.3: Remove loadSessions Function
```typescript
// DELETE this entire function:
const loadSessions = useCallback(async () => {
  try {
    setIsLoadingSessions(true);
    
    if (isQuerySuccess && queriedSessions) {
      console.log('Using React Query sessions:', queriedSessions);
      setSessions(queriedSessions);
    } else {
      console.log('Loading sessions (manual fallback)...');
      const data = await chatService.getSessions();
      console.log('Loaded sessions (manual fallback):', data);
      setSessions(data);
    }
  } catch (error) {
    console.error('Failed to load sessions:', error);
    toast.error('Failed to load chat sessions');
  } finally {
    setIsLoadingSessions(false);
  }
}, [isQuerySuccess, queriedSessions, setSessions, chatService]);
```

#### Step 1.4: Remove loadSessions useEffect
```typescript
// DELETE this entire useEffect:
useEffect(() => {
  loadSessions();
}, [loadSessions]);
```

#### Step 1.5: Remove Local Loading State
```typescript
// DELETE this line:
const [isLoadingSessions, setIsLoadingSessions] = useState(false);
```

#### Step 1.6: Simplify to Use React Query Only
```typescript
// REPLACE the component logic with this simplified version:
export function ChatSidebar({ 
  isCollapsed, 
  onToggle, 
  className 
}: ChatSidebarProps) {
  // React Query handles all fetching
  const { 
    data: sessions = [], 
    isLoading,
    error,
    refetch 
  } = useChatSessions();
  
  // Get UI state from Zustand
  const currentSessionId = useChatStore(state => state.currentSessionId);
  const setCurrentSessionId = useChatStore(state => state.setCurrentSessionId);
  
  // Create new session handler (keep existing)
  const handleNewSession = async () => {
    // Keep existing implementation
  };
  
  // Delete session handler (keep existing)
  const handleDeleteSession = async (id: string) => {
    // Keep existing implementation
  };
  
  // Let React Query handle loading state
  if (isLoading) {
    return (
      <div className={className}>
        <LoadingSpinner />
        <p>Loading sessions...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={className}>
        <p>Failed to load sessions</p>
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }
  
  return (
    <div className={className}>
      {/* Keep existing JSX, but use 'sessions' from React Query */}
      {sessions.map(session => (
        <SessionItem
          key={session.id}
          session={session}
          isActive={session.id === currentSessionId}
          onClick={() => setCurrentSessionId(session.id)}
          onDelete={() => handleDeleteSession(session.id)}
        />
      ))}
    </div>
  );
}
```

---

## Phase 2: Clean Up Zustand Store

### File: `store/chatStore.ts`

#### Step 2.1: Remove Session Server State
```typescript
// In the ChatStore interface, DELETE these lines:
sessions: ChatSession[];
setSessions: (sessions: ChatSession[]) => void;
```

#### Step 2.2: Remove from Initial State
```typescript
// In the create() function, DELETE these lines:
sessions: [],
setSessions: (sessions) => set({ sessions }),
```

#### Step 2.3: Keep Only UI State
```typescript
// The store should now only contain:
interface ChatStore {
  // UI State (keep these)
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  
  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;
  
  draftMessage: string;
  setDraftMessage: (message: string) => void;
  
  // Offline queue (keep for offline support)
  offlineQueue: QueuedMessage[];
  addToOfflineQueue: (message: QueuedMessage) => void;
  clearOfflineQueue: () => void;
}
```

---

## Phase 3: Update Components Using Removed Store Properties

### Find and Replace in All Components

#### Step 3.1: Search for Session Access
```bash
# Run this search to find all usages:
grep -r "useChatStore.*sessions" --include="*.tsx" --include="*.ts"
```

#### Step 3.2: Replace Store Sessions with React Query
For each file found, replace:

```typescript
// OLD - DELETE:
const sessions = useChatStore(state => state.sessions);

// NEW - ADD:
import { useChatSessions } from '@/hooks/useChatSessions';
const { data: sessions = [] } = useChatSessions();
```

#### Step 3.3: Remove setSessions Calls
For each file found, replace:

```typescript
// OLD - DELETE:
const setSessions = useChatStore(state => state.setSessions);
setSessions(newSessions);

// NEW - ADD:
// Just invalidate React Query to refetch
import { useQueryClient } from '@tanstack/react-query';
const queryClient = useQueryClient();
queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
```

---

## Validation Steps

### Step 1: Check Network Tab
1. Open Chrome DevTools → Network tab
2. Filter by "sessions"
3. Refresh the page
4. **Expected**: Only 1 request to `/api/chat/sessions`
5. **If you see 2 in dev**: That's React StrictMode (normal)
6. **If you see 3+**: Implementation incomplete

### Step 2: Test Basic Functionality
- [ ] Sessions load on page refresh
- [ ] Can click between sessions
- [ ] Can create new session
- [ ] Can delete session
- [ ] No console errors

### Step 3: Check React Query DevTools
```bash
# Install if not present:
npm install @tanstack/react-query-devtools
```

Add to `QueryProvider.tsx`:
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Inside QueryClientProvider:
<ReactQueryDevtools initialIsOpen={false} />
```

Check that `['chat-sessions']` query shows:
- Status: "success"
- Fetch count: 1
- Last fetch: recent timestamp

---

## Rollback Plan (If Needed)

If something breaks after these changes:

```bash
# Revert Phase 1 (ChatSidebar changes)
git checkout -- components/chat/ChatSidebar.tsx

# Revert Phase 2 (Store changes)
git checkout -- store/chatStore.ts

# Or revert everything
git reset --hard HEAD
```

---

## Expected Results

### Before Fix
- 4 requests to `/api/chat/sessions` on page load
- Redundant state in React Query + Zustand
- Complex loading states
- ~45KB unnecessary data transfer

### After Fix
- 1 request to `/api/chat/sessions` on page load
- Single source of truth (React Query)
- Simple, predictable loading states
- 75% reduction in API calls

---

## Common Pitfalls to Avoid

1. **DO NOT** add new features during this refactor
2. **DO NOT** change the UI/UX behavior
3. **DO NOT** modify the backend
4. **DO NOT** change React Query configuration
5. **DO NOT** create new hooks or components

---

## Implementation Order

1. **First**: Complete Phase 1 (ChatSidebar.tsx)
2. **Test**: Verify reduction in API calls
3. **Then**: Complete Phase 2 (chatStore.ts)
4. **Test**: Verify everything still works
5. **Finally**: Complete Phase 3 (update other components)
6. **Deploy**: This is safe for production

---

## Success Criteria

✅ Only 1 request to `/api/chat/sessions` in production  
✅ No console errors  
✅ All existing functionality works  
✅ Code is simpler (removed ~50 lines)  
✅ React Query is single source of truth for sessions  

---

## Notes for Cursor AI

- Follow the steps in exact order
- Do not optimize or refactor beyond what's specified
- If uncertain, choose the simpler option
- Preserve all existing functionality
- Test after each phase before proceeding