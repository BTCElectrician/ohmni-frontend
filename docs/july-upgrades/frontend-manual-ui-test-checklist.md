# Ohmni Frontend Manual UI Test Checklist (Chat UI Fixes)

**Git Context:**  
_Current feature branch: `fix/frontend-chat-ui-issues`  
Not yet merged to `main` as of July 2025.  
See commit history and PR for details.  
After QA, merge this branch to main and update this checklist as needed._

_Prompt: This checklist documents the manual QA for fixes implemented as part of the July 10th, 2025 refactor plan. See: `docs/july-upgrades/frontend-issues-post-prompt-refactor-july-10-2025.md`. All items in sections 1 and 2 have been tested and are complete._

_Last updated: July 2025_

This checklist covers all critical manual tests for the chat UI after the July 2025 fixes. Use this as a QA script or as a prompt to resume future work.

---

## 1. Pills Default to OFF (Fix #4)
- [x] Clear localStorage: DevTools → Application → Local Storage → Clear
- [x] Refresh page (Cmd+R)
- [x] **Verify:** Pills are NOT visible by default
- [x] Click sparkle button (top-right when no messages)
- [x] **Verify:** Pills appear when toggled ON
- [x] Refresh page
- [x] **Verify:** Pills stay ON (localStorage persistence)
- [x] Toggle OFF
- [x] **Verify:** Pills disappear and stay OFF after refresh

## 2. Pills in Old Chats (Fix #3)
- [x] Toggle pills ON (if not already)
- [x] Send a message: "Hello, test message"
- [x] **Verify:** Pills disappear after sending message
- [x] Click "New chat" in sidebar
- [x] **Verify:** Pills show in new chat (if toggled ON)
- [x] Go back to the old chat with messages
- [x] **Verify:** Pills do NOT reappear in existing chat

## 3. Vision Upload Chat Title & History (Fix #1)
- [x] Create new chat
- [x] Upload an image (drag & drop or click upload)
- [x] Add text: "What's in this image?"
- [x] Send
- [x] **Verify:** Chat appears in sidebar IMMEDIATELY (no refresh needed)
- [x] Wait 2-3 seconds
- [x] **Verify:** Chat title updates from "New Chat" to AI-generated title
- [x] Try with another image in same chat
- [x] **Verify:** Still works for subsequent uploads

## 4. Auto-Chat Title for Reasoning Models (Fix #2)
- [x] Create new chat
- [x] Toggle Deep Reasoning ON
- [x] Send message: "Explain quantum physics"
- [x] **Verify:** Chat appears in sidebar immediately
- [x] Wait 4-6 seconds (longer for reasoning models)
- [x] **Verify:** Title generates without refresh
- [x] Try with Nuclear mode
- [x] **Verify:** Same behavior with extended timeout

## 5. Cross-Component Integration
- [x] Upload image → verify sidebar updates
- [x] Send reasoning message → verify sidebar updates
- [x] Navigate between chats → verify pills behave correctly
- [x] Toggle pills in different states → verify persistence
- [x] **Verify:** No console errors in DevTools

---

## Success Criteria
- [x] Pills default to OFF
- [x] Pills hide in existing chats
- [x] Vision uploads appear in sidebar instantly
- [x] Reasoning titles generate with proper timeouts
- [x] LocalStorage persistence works
- [x] No console errors

---

**Use this checklist as a prompt for future QA, regression testing, or to resume a conversation with your AI assistant.** 