# PRD — Swap Book Icon to DatabaseZap + ABCO DB Copy (Frontend-only, one-file)

**Owner:** Frontend
**Repo:** `ohmni-frontend` (Next.js 15, React 19, TS strict)
**Scope:** UI-only; single file change to `components/chat/ChatInput.tsx`
**Risk:** Low (no backend/store changes)
**Goal:** Visually represent the new multi-index “company database” search with icon+copy updates, small toast, and a11y/testing hooks—without altering existing behavior or network paths.

---

## 1. Design Overview & Architecture

### Problem

The current “code search mode” shows a **book** icon and NEC-specific copy. We now search multiple indexes (company database). The UI should reflect this.

### Goals

* Replace **BookOpenText** with **DatabaseZap** icon wherever the ChatInput toggle/status renders.
* Update copy:

  * Tooltip/status: **“ABCO database mode”**
  * Placeholder when active: **“Search ABCO database…”**
  * One-off toast on enable: **“Searching ABCO database…”**
* Keep existing boolean `codeSearchMode` and call path unchanged.
* Add a11y (`aria-pressed`, `aria-label`) and stable test ids.

### High-level Flow (FE-only)

User clicks the existing code-search toggle in `ChatInput` →

* We keep toggling `codeSearchMode`.
* UI swaps to DatabaseZap + new copy.
* Toast fires once on enable (deduped by id).
* No state/store/backend/function changes. Works offline by design.

### Data Contracts

None changed (no API calls or new types).

### Security/Offline/Performance

* **Security:** No secrets, no new endpoints.
* **Offline-first:** Same behavior; state is local; no additional IO.
* **Perf:** Zero extra network calls; negligible render cost.

---

## 2. Module Structure & Interactions

### Files Touched

* `ohmni-frontend/components/chat/ChatInput.tsx` (only)

### Dependencies

* `lucide-react` must include `DatabaseZap` (v0.267.0+). If missing, update to latest.
* `react-hot-toast` provider must already be mounted (it is in current app).

### Feature Gates

* None. This is a safe, UI-only swap.

---

## 3. Implementation Details & Code

### Commands

If needed (only if DatabaseZap is missing):

```bash
# From ohmni-frontend
npm i -E lucide-react@latest
```

### Single Patch (apply exactly)

**File:** `ohmni-frontend/components/chat/ChatInput.tsx`

```diff
--- a/components/chat/ChatInput.tsx
+++ b/components/chat/ChatInput.tsx
@@
-'use client';
+'use client';
 
 import { useState, useRef, useCallback, useEffect } from 'react';
-import { Brain, Mic, Paperclip, Radiation, Send, X, Image as ImageIcon, BookOpenText } from 'lucide-react';
+import { Brain, Mic, Paperclip, Radiation, Send, X, Image as ImageIcon, DatabaseZap } from 'lucide-react';
 import Image from 'next/image';
 import { visionService } from '@/services/visionService';
 import { toastFromApiError, toastSuccess } from '@/lib/toast-helpers';
 import audioService from '@/services/audioService';
 import toast from 'react-hot-toast';
 import { sanitizeQuery } from '@/lib/sanitizeQuery';
@@
   const toggleCodeSearch = () => {
     const newState = !codeSearchMode;
     setCodeSearchMode(newState);
     if (newState) {
       setDeepThinking(false);
       setNuclearThinking(false);
+      // Ephemeral confirmation when enabling ABCO DB mode (dedupe by id)
+      toast.dismiss('abco-db-on');
+      toast('Searching ABCO database…', { id: 'abco-db-on', icon: '🗄️' });
     }
   };
@@
               placeholder={
                 selectedFile 
                   ? "Add a message about this image (optional)..." 
                   : codeSearchMode 
-                    ? "Search NEC code..." 
+                    ? "Search ABCO database..." 
                     : "Type your message here..."
               }
               className="w-full bg-transparent text-white placeholder-[#4a5568] focus:outline-none text-[15px] px-6 pt-5 pb-14"
               disabled={disabled || isStreaming || isProcessingFile}
             />
@@
-                {/* Code Search Toggle */}
+                {/* ABCO Database Mode Toggle */}
                 <button
                   type="button"
                   onClick={toggleCodeSearch}
                   disabled={disabled || isStreaming || !!selectedFile}
                   className={`p-2.5 rounded-lg transition-all ${
                     codeSearchMode
                       ? 'bg-orange-600/20 text-orange-600 ring-2 ring-orange-600/30'
                       : 'bg-[#2d3748]/50 text-[#4a5568] hover:text-[#718096] hover:bg-[#2d3748]/70'
                   } disabled:opacity-50 disabled:cursor-not-allowed`}
-                  title={selectedFile ? 'Not available with images' : codeSearchMode ? 'Code search mode active' : 'Search NEC code'}
+                  data-testid="toggle-abco-db"
+                  aria-pressed={codeSearchMode}
+                  aria-label={
+                    selectedFile
+                      ? 'Not available with images'
+                      : codeSearchMode
+                        ? 'ABCO database mode active'
+                        : 'Enable ABCO database mode'
+                  }
+                  title={
+                    selectedFile
+                      ? 'Not available with images'
+                      : codeSearchMode
+                        ? 'ABCO database mode active'
+                        : 'Enable ABCO database mode'
+                  }
                 >
-                  <BookOpenText className={`w-5 h-5 ${codeSearchMode ? 'animate-pulse' : ''}`} />
+                  <DatabaseZap className={`w-5 h-5 ${codeSearchMode ? 'animate-pulse' : ''}`} />
                 </button>
               </div>
@@
-              {codeSearchMode && !selectedFile && (
-                <div className="flex items-center gap-2 text-sm text-orange-600 animate-fadeInUp">
-                  <BookOpenText className="w-4 h-4 animate-pulse" />
-                  <span>Code search mode active</span>
-                </div>
-              )}
+              {codeSearchMode && !selectedFile && (
+                <div
+                  className="flex items-center gap-2 text-sm text-orange-600 animate-fadeInUp"
+                  data-testid="abco-db-status"
+                >
+                  <DatabaseZap className="w-4 h-4 animate-pulse" />
+                  <span>ABCO database mode</span>
+                  {/* SR-only live region so screen readers hear the change even if toast is missed */}
+                  <span className="sr-only" aria-live="polite">ABCO database mode enabled</span>
+                </div>
+              )}
```

### Sanity Checks (Cursor should verify)

* `lucide-react` includes `DatabaseZap`. If import fails, run the install command above.
* Search & clean any leftover copy in the repo (no functional changes):

  * `"Search NEC code..."`, `"Code search mode active"`, `BookOpenText`
    Only this file is required for now; do not refactor names (keep `codeSearchMode`).

### Commit/PR

* **Branch:** `feat/ui-abco-db-toggle`
* **Commit msg:** `feat(ui): swap BookOpenText -> DatabaseZap, ABCO DB copy + toast (ChatInput only)`
* **PR title:** `Swap book icon to DatabaseZap + ABCO DB copy (one-file, UI-only)`
* **Labels:** `ui`, `low-risk`, `a11y`

---

## 4. Usage Examples & Integration

**Expected UI behavior after merge**

* When `codeSearchMode` is enabled:

  * Toggle button shows **DatabaseZap** (animated pulse as before).
  * Tooltip/aria reads **“ABCO database mode active”**.
  * Input placeholder becomes **“Search ABCO database…”**.
  * A toast appears once: **“Searching ABCO database…”**.
  * Status row under the bar shows **DatabaseZap** + **“ABCO database mode”**.

**No changes** to:

* SSE handling, backend routing, or multi-index selection logic.
* Voice input, file attach flows, or hotkeys.

---

## 5. Testing, Validation & Rollout

### Unit / Component (Vitest + React Testing Library)

*Add only if you already test ChatInput; otherwise rely on E2E below.*

```ts
// pseudo-outline
it('shows ABCO placeholder and status when toggled on', async () => {
  render(<ChatInput />);
  const btn = screen.getByTestId('toggle-abco-db');
  await user.click(btn);
  expect(btn).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByPlaceholderText('Search ABCO database...')).toBeInTheDocument();
  expect(screen.getByTestId('abco-db-status')).toBeVisible();
});
```

### E2E (Playwright) — Recommended

```ts
test('ABCO DB mode toggle updates UI and toast', async ({ page }) => {
  await page.getByTestId('toggle-abco-db').click();
  await expect(page.getByTestId('abco-db-status')).toBeVisible();
  await expect(page.getByPlaceholder('Search ABCO database...')).toBeVisible();
  // Optional: if toast container exposes role=alert
  await expect(page.getByText('Searching ABCO database…')).toBeVisible();
});
```

### Acceptance Criteria

* ✅ Book icon replaced by **DatabaseZap** in ChatInput toggle and status row.
* ✅ Placeholder shows **“Search ABCO database…”** when active.
* ✅ One-off toast appears on enable; subsequent enables don’t stack (deduped by id).
* ✅ Toggle has `aria-pressed` and descriptive `aria-label`.
* ✅ No regressions to message send, voice input, file attach, or SSE streaming.

### Rollout Plan

1. Create branch, apply patch, run `npm run build && npm run lint`.
2. If `DatabaseZap` missing, update `lucide-react` as noted.
3. Run existing unit/E2E tests; add the small E2E above if helpful.
4. Merge to `main`; Vercel preview sanity-check:

   * Toggle on/off; confirm toast, placeholder, and status.
5. Promote to production.

### Rollback Plan

* Revert the single commit or `git checkout` the previous version of `ChatInput.tsx`.
* No migrations or config changes to undo.

---

### Notes / Non-Goals

* Do **not** rename `codeSearchMode` or alter backend query behavior.
* No new Zustand store, no new components, no CSS framework changes.
* Future (optional): refactor to `dbSearchMode` or move to a shared badge component, but **out of scope** here.

---

That’s everything Cursor needs to apply the refactor safely in one shot.
