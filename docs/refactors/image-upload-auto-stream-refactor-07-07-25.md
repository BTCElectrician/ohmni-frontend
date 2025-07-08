<chatName="FrontEnd Vision Stream AutoSend Refactor"/>

Front-End Refactor Plan – Close the “Upload ⇒ Stream” Gap
=========================================================

Objective  
Ensure that immediately after an image is uploaded the client fires the POST `/api/chat/sessions/{sessionId}/stream` request (vision analysis) without any extra user action. Build the change so it is:

• Opt-in (via prop) for simple rollback  
• Maintains existing UI/UX for plain-text messages  
• Leaves future room for multi-file support

--------------------------------------------------------------------
1. Architectural Decisions
--------------------------------------------------------------------
A. Responsibility  
   • Keep streaming trigger inside `ChatInput` (presentation layer) so higher-level pages remain unaware of mime details.  
   • Upload logic stays in `visionService`; analysis streaming stays in `chatService`. `ChatInput` merely orchestrates them.

B. Prop-Driven Behaviour  
   • New prop `autoSendOnFileSelect?: boolean` (default `true`) to toggle the automatic send.  
   • Container (`ChatPage`) explicitly passes the flag to document intent.

C. Single-File Focus  
   • Current UI only shows one preview. No change until multi-file feature is requested.

--------------------------------------------------------------------
2. File-by-File Work List
--------------------------------------------------------------------
1) components/chat/ChatInput.tsx  
   a. Interface update  
      ```ts
      interface ChatInputProps {
        onSendMessage: (msg: string, useDeep?: boolean, useNuclear?: boolean) => void;
        onSendMessageWithFile?: (msg: string, file: File) => Promise<void>;
        autoSendOnFileSelect?: boolean;      // NEW – defaults to true
        ...
      }
      ```  
   b. Default props (near function signature or via default param):  
      `autoSendOnFileSelect = true`

   c. `handleFileSelect` additions (end of try{}):  
      ```ts
      if (autoSendOnFileSelect && onSendMessageWithFile) {
        await onSendMessageWithFile(
          '',            // empty text → “Please analyse this image” logic exists upstream
          optimizedFile  // renamed var
        );
        clearSelectedFile();   // keep existing preview cleanup
      }
      ```

   d. Remove the “auto-clear” path from `handleSubmit` that was previously handling the double-click scenario – keep as safeguard but add early-return comment to show it is rarely hit when `autoSendOnFileSelect=true`.

   e. Disable conditions:  
      – Remove `|| !!selectedFile` from “Send” button disable logic because the file might be present while stream is in progress.  
      – Similarly update the PaperClip button to allow re-selection once previous stream finished (`isStreaming === false`).

2) app/chat/page.tsx  
   a. Pass the flag explicitly:  
      ```tsx
      <ChatInput
        onSendMessage={sendMessage}
        onSendMessageWithFile={sendMessageWithFile}
        autoSendOnFileSelect   // boolean shorthand = true
        isStreaming={isStreaming}
      />
      ```

   b. No other change – `sendMessageWithFile` is already implemented and triggers `chatService.streamVisionAnalysis`.

3) types/api.ts  – No change (just verify `ChatMessage.attachments[]` already supports image).

4) Optional DX upgrade – components/chat/ChatInput.tsx  
   • Add a visual “Uploading…” badge to bottom status indicators to convey background activity when `autoSendOnFileSelect` fires and `isProcessingFile` is true.

--------------------------------------------------------------------
3. Implementation Steps (chronological)
--------------------------------------------------------------------
Step-1: Update prop typings in `ChatInput` and all call-sites (search: `<ChatInput`).  
Step-2: Refactor `handleFileSelect` to:  
   • await optimisation  
   • create preview  
   • if `autoSendOnFileSelect`, immediately call parent callback  
Step-3: Remove obsolete conditionals around Send button and Paper-clip.  
Step-4: Propagate `autoSendOnFileSelect` from `ChatPage`.  
Step-5: Manual QA – confirm in DevTools Network:  
   1. POST `/upload`  
   2. POST `/stream` (200 / text-event-stream) fires automatically.  
Step-6: Update documentation (`docs/setup-guide/api_integration_guide.md`, File Upload section) – one sentence describing auto-send behaviour.

--------------------------------------------------------------------
4. Code Snippet – Handle File Select (illustrative)
--------------------------------------------------------------------
```ts
const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
  const raw = e.target.files?.[0];
  if (!raw) return;
  resetInputRef();

  const { valid, error } = visionService.validateFile(raw);
  if (!valid) {
    toastFromApiError(new Error(error!));
    return;
  }

  setIsProcessingFile(true);
  try {
    const optimised = await visionService.optimizeImage(raw);
    const preview = visionService.createPreviewUrl(optimised);
    setSelectedFile(optimised);
    setPreviewUrl(preview);

    // 🔗 NEW — trigger vision analysis immediately
    if (autoSendOnFileSelect && onSendMessageWithFile) {
      await onSendMessageWithFile(
        '',          // empty caption → service fills default text
        optimised
      );
      clearSelectedFile();     // wipe local state after streaming starts
    }
  } catch (err) {
    toastFromApiError(err);
  } finally {
    setIsProcessingFile(false);
  }
}, [autoSendOnFileSelect, onSendMessageWithFile]);
```

--------------------------------------------------------------------
5. Potential Side Effects & Mitigations
--------------------------------------------------------------------
• Duplicate streams if user selects multiple files quickly  
  – `isProcessingFile` gate already blocks second select; keep it.  
• Deep/Nuclear flags disabled while image is selected (unchanged).  
• Offline queueing — still works because `sendMessageWithFile` route stays identical; if offline, actions are queued via `chatStore.queueAction`.

--------------------------------------------------------------------
6. Deliverables Checklist
--------------------------------------------------------------------
☐ Commit with message `feat(chat): auto-send vision stream after image upload`  
☐ Updated `ChatInput` code, prop interface, and call-sites  
☐ Updated docs section (optional)  
☐ Screenshot / video of DevTools demonstrating automatic `/stream` call  

Hand this plan to the developer; all changes are isolated to UI layer, no backend or type-schema migrations required.