# Simple Dashboard Button Implementation

## File to Modify: `components/chat/ChatSidebar.tsx`

### Step 1: Add Import
Add `Home` to your existing lucide-react imports (around line 3):

```tsx
import { PlusCircle, Folder, Trash2, PencilIcon, Home } from 'lucide-react';
```

### Step 2: Add the Dashboard Button
Find the "New Chat Button" section (around line 195) and add this RIGHT BEFORE it:

```tsx
{/* Dashboard Button - NEW */}
<button
  onClick={() => window.location.href = '/'}
  className="m-3 mb-2 flex items-center gap-3 w-[calc(100%-1.5rem)] p-3 bg-transparent border border-border-subtle rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated/50 transition-colors"
>
  <Home className="w-5 h-5" />
  <span>Dashboard</span>
</button>

{/* New Chat Button - EXISTING (update margin) */}
<button
  onClick={createNewChat}
  className="mx-3 mb-3 flex items-center gap-3 w-[calc(100%-1.5rem)] p-3 bg-transparent border border-electric-blue/30 rounded-lg text-text-primary hover:bg-surface-elevated transition-colors"
>
  <PlusCircle className="w-5 h-5" />
  <span>New chat</span>
</button>
```

### Step 3: Update New Chat Button Margin
Change the New Chat button's className from `m-3` to `mx-3 mb-3` to maintain proper spacing.

## Complete Change Summary:
1. Import `Home` icon
2. Add Dashboard button with home icon
3. Use `window.location.href = '/'` for navigation (simpler than Link component)
4. Style it like the other sidebar buttons (but slightly more subtle)
5. Adjust New Chat button margin

## Result:
```
┌─────────────────────┐
│ 🏠 Dashboard        │  ← Takes you home
│ ➕ New chat         │  
├─────────────────────┤
│ STARRED             │
│ ...                 │
```

That's it! Total changes: ~10 lines of code.