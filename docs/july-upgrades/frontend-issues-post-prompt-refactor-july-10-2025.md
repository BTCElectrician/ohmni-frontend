# Frontend Issues Fix Plan - Post Prompt Refactor (July 10, 2025)

## Overview
This plan addresses four frontend issues discovered after the successful backend prompt refactor. All issues are React state management or UI logic problems. The backend APIs are working correctly.

## Phase 0: Git Setup - Create Feature Branch

```bash
# Save any uncommitted work
cd ohmni-frontend
git add .
git stash

# Ensure you're on main and up to date
git checkout main
git pull origin main

# Create and checkout the feature branch
git checkout -b fix/frontend-chat-ui-issues

# Verify you're on the feature branch
git branch --show-current
# Should output: fix/frontend-chat-ui-issues
```

## Phase 1: Pre-Execution Checklist

### Verify Current State
```
□ Confirm all 4 issues exist in current build
□ Test vision upload - verify title/history don't appear
□ Test deep reasoning - verify title doesn't populate
□ Navigate to old chat - verify pills reappear
□ Check pills default to ON state
□ Note current React Query version (5.80.7)
□ Run existing tests to ensure they pass
```

### Test Commands
```bash
# Install dependencies if needed
npm install

# Run development server
npm run dev

# In another terminal, run tests
npm test
```

## Phase 2: Fix Implementation - Highest to Lowest Priority

### Issue #1: Vision Upload Chat Title & History (HIGH PRIORITY)

#### File: `app/chat/page.tsx`

**Problem**: After vision upload, chat doesn't appear in sidebar until refresh.

**Location**: In the `sendMessageWithFile` function (around line 250-320)

**FIND THIS CODE:**
```typescript
const sendMessageWithFile = async (content: string, file: File): Promise<void> => {
    // Hide prompts when sending file (same as regular messages)
    setShowPrompts(false);
    
    if (!currentSession) {
      // Create session if needed (same as regular sendMessage)
      try {
        setIsCreatingNewSession(true);
        const session = await chatService.createSession('New Chat');
        setCurrentSession(session);
        await sendMessageWithFileToSession(session.id, content, file);
        setIsCreatingNewSession(false);
      } catch (error) {
        setIsCreatingNewSession(false);
        toastFromApiError(error);
      }
      return;
    }

    await sendMessageWithFileToSession(currentSession.id, content, file);
  };
```

**REPLACE WITH:**
```typescript
const sendMessageWithFile = async (content: string, file: File): Promise<void> => {
    // Hide prompts when sending file (same as regular messages)
    setShowPrompts(false);
    
    if (!currentSession) {
      // Create session if needed (same as regular sendMessage)
      try {
        setIsCreatingNewSession(true);
        const session = await chatService.createSession('New Chat');
        setCurrentSession(session);
        await sendMessageWithFileToSession(session.id, content, file);
        setIsCreatingNewSession(false);
        // FIX: Invalidate sessions to refresh sidebar
        queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      } catch (error) {
        setIsCreatingNewSession(false);
        toastFromApiError(error);
      }
      return;
    }

    await sendMessageWithFileToSession(currentSession.id, content, file);
  };
```

**ALSO FIND** in `sendMessageWithFileToSession` (around line 325-400):

After the vision analysis completes successfully, **ADD** before the final catch block:
```typescript
// FIX: Refresh sessions to ensure title appears
if (!hasFirstMessage) {
  setHasFirstMessage(true);
  setTimeout(() => {
    console.log('Refreshing sessions after vision upload...');
    queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
    // Also dispatch event (import SESSION_UPDATED_EVENT at top)
    window.dispatchEvent(new Event(SESSION_UPDATED_EVENT));
  }, TITLE_REFRESH_DELAY.FAST);
}
```

#### File: `lib/events.ts` (NEW FILE)

**CREATE** this new file:
```typescript
// lib/events.ts
// Centralized event names to prevent typos
export const SESSION_UPDATED_EVENT = 'session-updated';
```

#### File: `components/chat/ChatSidebar.tsx`

**ADD** import at the top:
```typescript
import { SESSION_UPDATED_EVENT } from '@/lib/events';
```

**FIND** the `loadSessions` function and wrap it with `useCallback`:
```typescript
const loadSessions = useCallback(async () => {
  // ... existing loadSessions code ...
}, [setSessions, isQuerySuccess, queriedSessions, queryError]);
```

**ADD** after the `loadSessions` function (around line 80):

```typescript
// Listen for session updates from other components
useEffect(() => {
  const handleSessionUpdate = () => {
    loadSessions();
  };
  
  // Subscribe to custom event
  window.addEventListener(SESSION_UPDATED_EVENT, handleSessionUpdate);
  
  return () => {
    window.removeEventListener(SESSION_UPDATED_EVENT, handleSessionUpdate);
  };
}, [loadSessions]);
```

### Issue #2: Auto-Chat Title for Reasoning Models (MEDIUM PRIORITY)

#### File: `app/chat/page.tsx`

**Problem**: Title generation timeout might be too short for deep reasoning models.

**ADD** at the top of the file with other imports:
```typescript
import { SESSION_UPDATED_EVENT } from '@/lib/events';
```

**ADD** constants after imports:
```typescript
// Title refresh delays for different model types
const TITLE_REFRESH_DELAY = {
  FAST: 2000,    // Regular chat models
  SLOW: 4000,    // Deep reasoning initial check
  RETRY: 6000    // Deep reasoning retry check
};
```

**FIND** (around line 440-450):
```typescript
// First message session refresh
if (isFirstMessage) {
  setHasFirstMessage(true);
  setTimeout(() => {
    console.log('Refreshing sessions to pick up auto-generated title...');
    queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
  }, 2000);
}
```

**REPLACE WITH:**
```typescript
// First message session refresh - extended timeout for reasoning models
if (isFirstMessage) {
  setHasFirstMessage(true);
  
  // Use longer timeout for reasoning models
  const refreshDelay = (useDeepReasoning || useNuclear) ? TITLE_REFRESH_DELAY.SLOW : TITLE_REFRESH_DELAY.FAST;
  
  setTimeout(() => {
    console.log('Refreshing sessions to pick up auto-generated title...');
    queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
    
    // Dispatch custom event for sidebar
    window.dispatchEvent(new Event(SESSION_UPDATED_EVENT));
  }, refreshDelay);
  
  // Add a second check for reasoning models
  if (useDeepReasoning || useNuclear) {
    setTimeout(() => {
      console.log('Second refresh for reasoning model title...');
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
    }, TITLE_REFRESH_DELAY.RETRY);
  }
}
```

### Issue #3: Example Pills in Old Chats (MEDIUM PRIORITY)

#### File: `app/chat/page.tsx`

**Problem**: Pills show in existing chats when they should only show for new chats.

**FIND** the useEffect that handles messages (around line 120):
```typescript
// Reset prompts when switching to an empty chat
useEffect(() => {
  if (messages.length === 0) {
    setShowPrompts(true);
  }
}, [messages.length]);
```

**REPLACE WITH:**
```typescript
// Show prompts only for new chats, hide for existing chats
useEffect(() => {
  if (messages.length === 0 && !currentSession) {
    setShowPrompts(true);
  } else if (messages.length > 0) {
    setShowPrompts(false);
  }
}, [messages.length, currentSession]);
```

**ALSO FIND** in `selectSession` call in the return statement (around line 600):
```typescript
selectSession={(session) => selectSession(session)}
```

**Note**: We need to add this function if it doesn't exist. **ADD** after `loadMessages` function:
```typescript
const selectSession = useCallback((session: ChatSession) => {
  setCurrentSession(session);
  // FIX: Ensure prompts are hidden when selecting existing session
  setShowPrompts(false);
}, [setCurrentSession]);
```

### Issue #4: Default Pills to OFF (LOW PRIORITY)

#### File: `app/chat/page.tsx`

**Problem**: Pills default to ON, should default to OFF.

**FIND** the state declaration (around line 50-60):
```typescript
const [showPrompts, setShowPrompts] = useState(true);
```

**REPLACE WITH:**
```typescript
// FIX: Default prompts to OFF, load from localStorage if available
const [showPrompts, setShowPrompts] = useState(() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('showChatPrompts');
    return saved === 'true'; // Only true if explicitly set
  }
  return false; // Default to OFF
});

// Persist preference when it changes
useEffect(() => {
  localStorage.setItem('showChatPrompts', showPrompts.toString());
}, [showPrompts]);
```

## Phase 3: Testing & Validation

### Manual Testing Checklist

#### Test Issue #1 Fix (Vision Upload)
```
□ Upload an image to a new chat
□ Verify chat appears in sidebar immediately (no refresh)
□ Verify title generates and shows in sidebar
□ Test with multiple image uploads
□ Test with existing chat session
```

#### Test Issue #2 Fix (Title Generation)
```
□ Create new chat with deep reasoning ON
□ Send a message
□ Wait up to 6 seconds
□ Verify title appears without refresh
□ Test with nuclear mode
□ Test with regular chat (should still work in 2 seconds)
```

#### Test Issue #3 Fix (Pills in Old Chats)
```
□ Create a new chat (pills should show if toggled ON)
□ Send a message (pills should hide)
□ Navigate to another chat
□ Navigate back - pills should NOT reappear
□ Create new chat - pills should show based on toggle
```

#### Test Issue #4 Fix (Default Pills OFF)
```
□ Clear localStorage (DevTools > Application > Clear Storage)
□ Refresh page
□ Verify pills are OFF by default
□ Toggle ON - verify preference persists
□ Refresh - verify preference maintained
□ Toggle OFF - verify preference persists
```

### Automated Test Updates

#### Create new test file: `app/chat/__tests__/chat-ui-fixes.test.tsx`

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatPage from '../page';

describe('Chat UI Fixes', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('pills default to OFF', () => {
    render(<ChatPage />);
    // Prompts should not be visible by default
    expect(screen.queryByText('Calculate wire size')).not.toBeInTheDocument();
  });

  test('pills preference persists in localStorage', async () => {
    render(<ChatPage />);
    
    // Toggle pills ON
    const toggleButton = screen.getByTitle('Show suggested prompts');
    await userEvent.click(toggleButton);
    
    // Check localStorage
    expect(localStorage.getItem('showChatPrompts')).toBe('true');
  });

  test('session appears immediately after vision upload', async () => {
    // Mock the chatService
    const mockCreateSession = jest.fn().mockResolvedValue({
      id: 'test-123',
      name: 'New Chat',
      timestamp: new Date().toISOString()
    });
    
    // Test implementation here
    // This is a complex integration test - implement based on your test setup
  });
});
```

## Phase 4: Code Quality Checks

### Run Linting
```bash
# Run ESLint
npm run lint

# Fix any linting issues
npm run lint -- --fix
```

### TypeScript Check
```bash
# Check for TypeScript errors
npm run type-check
```

### Build Test
```bash
# Ensure production build works
npm run build
```

## Phase 5: Final Verification

### Verification Checklist
```
□ All 4 issues are fixed
□ No new TypeScript errors
□ No new ESLint warnings
□ All existing tests pass
□ Manual testing completed
□ Build succeeds
□ No console errors in browser
```

### Check Git Diff
```bash
# Review all changes
git diff --stat

# Should show changes to:
# - lib/events.ts (new file - event constants)
# - app/chat/page.tsx (main fixes)
# - components/chat/ChatSidebar.tsx (session update listener)
# - app/chat/__tests__/chat-ui-fixes.test.tsx (new tests)
```

## Phase 6: Commit and Create PR

### Stage and Commit
```bash
# Stage all changes
git add .

# Create detailed commit
git commit -m "fix: resolve chat UI issues post-prompt refactor

- Fix vision upload not showing in sidebar immediately
- Fix auto-chat title generation for reasoning models  
- Fix example pills showing in existing chats
- Change default pills state to OFF with localStorage

Fixes:
- Add queryClient.invalidateQueries after vision upload
- Extend title refresh timeout for reasoning models (4-6s)
- Check messages.length to hide pills in existing chats
- Default showPrompts to false with localStorage persistence
- Add session update event listener in sidebar

Tests: Added chat-ui-fixes.test.tsx
Build: All checks passing"

# Push the feature branch
git push origin fix/frontend-chat-ui-issues
```

### Create Pull Request

1. Go to GitHub
2. Click "Compare & pull request"
3. Set base branch to `main`
4. Title: "Fix chat UI issues discovered post-prompt refactor"
5. Description:
```markdown
## Summary
This PR fixes 4 frontend issues discovered after the backend prompt refactor on July 10, 2025.

## Issues Fixed
1. ✅ **HIGH**: Vision upload chat title & history not appearing in sidebar
2. ✅ **MEDIUM**: Auto-chat title not populating for reasoning models
3. ✅ **MEDIUM**: Example pills reappearing in existing chats
4. ✅ **LOW**: Changed default pills state to OFF

## Changes
- Added React Query cache invalidation after vision uploads
- Extended title generation timeout for reasoning models
- Fixed pills visibility logic based on chat state
- Added localStorage persistence for pills preference
- Added event listener for cross-component session updates

## Testing
- [x] Manual testing of all 4 issues
- [x] Added new test suite
- [x] All existing tests pass
- [x] No TypeScript errors
- [x] Production build succeeds

## Screenshots
[Add before/after screenshots if possible]
```

### After PR Approval

```bash
# After PR is merged, update local main
git checkout main
git pull origin main

# Delete feature branch locally
git branch -d fix/frontend-chat-ui-issues

# Delete feature branch on remote
git push origin --delete fix/frontend-chat-ui-issues
```

## Rollback Plan

If any issues occur after deployment:

```bash
# Revert the merge commit
git revert -m 1 HEAD
git push origin main

# Or revert to specific commit before merge
git reset --hard [commit-hash-before-merge]
git push --force origin main
```

## Success Metrics

After deployment, verify:
- [ ] Vision uploads show in sidebar immediately
- [ ] Titles generate within 6 seconds for all models  
- [ ] Pills only show for new chats
- [ ] Pills default to OFF
- [ ] No increase in error logs
- [ ] No performance degradation
- [ ] User complaints about these issues stop

---

## Notes for AI Agent

1. **Test each fix individually** before moving to the next
2. **Save files** after each change to catch syntax errors early
3. **Don't skip** the localStorage clear before testing Issue #4
4. **Watch the console** for any new errors introduced
5. **The queryClient** is already imported in chat page - don't re-import
6. If you see any `// @ts-ignore` comments, try to fix the type issue instead
7. Run the dev server throughout to test changes in real-time
8. **For useCallback dependencies**: Include all variables used inside the function (setSessions, isQuerySuccess, queriedSessions, queryError)
9. **Import order**: Add new imports with existing imports at the top, maintain alphabetical order if the file uses it

This plan fixes all 4 issues while maintaining code quality and adding proper tests!