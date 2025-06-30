# Frontend Vision Streaming - Safe Refactor Plan

## 🎯 Objective
Fix image upload flow to trigger vision analysis by calling the streaming endpoint after file upload. This is a **production-safe refactor** that maintains backward compatibility.

## ⚠️ Production Safety Requirements
- No breaking changes to existing text chat functionality
- Maintain all current error handling
- Preserve existing UI behavior during refactor
- Test each step before moving to next

## 📋 Pre-flight Checklist
- [ ] Current text chat is working in production
- [ ] Image upload shows user message with preview
- [ ] Backend `/upload` endpoint is confirmed working
- [ ] Backend `/stream` endpoint handles `pending_image_id`

## 🔧 Step-by-Step Refactor

### Step 1: Add Private Streaming Helper to ChatService
**File**: `services/chatService.ts`

**Why**: We need to reuse the existing streaming logic without duplicating code.

**Add this private method** (copy exact logic from existing `sendMessage` method):
```typescript
private async streamVisionResponse(
  sessionId: string, 
  content: string, 
  onChunk?: (text: string) => void,
  useDeepReasoning: boolean = false,
  useNuclear: boolean = false
): Promise<ChatMessage> {
  // COPY ENTIRE BODY from existing sendMessage() method
  // Just change the name from sendMessage to streamVisionResponse
  // Keep all error handling, reader cleanup, SSE parsing - everything
}
```

### Step 2: Update sendMessageWithFile Method
**File**: `services/chatService.ts`

**Current signature** (keep for backward compatibility):
```typescript
async sendMessageWithFile(
  sessionId: string,
  content: string,
  file: File
): Promise<ChatMessage>
```

**New signature with streaming support**:
```typescript
async sendMessageWithFile(
  sessionId: string,
  content: string,
  file: File,
  onChunk?: (text: string) => void  // NEW optional parameter
): Promise<ChatMessage>
```

**Update the method body**:
```typescript
async sendMessageWithFile(
  sessionId: string,
  content: string,
  file: File,
  onChunk?: (text: string) => void
): Promise<ChatMessage> {
  // 1. Keep existing upload logic exactly as-is
  const uploadResponse = await visionService.uploadToChat(
    sessionId,
    file,
    content
  );
  
  // 2. Keep existing user message creation
  const userMessage: ChatMessage = {
    id: uploadResponse.user_message_id,
    sessionId: sessionId,
    role: 'user',
    content: content || 'Please analyze this image',
    timestamp: new Date(),
    attachments: [{
      type: 'image',
      url: uploadResponse.preview_url,
      filename: uploadResponse.file_info.filename,
      size: uploadResponse.file_info.size
    }]
  };
  
  // 3. NEW: Trigger the streaming endpoint for AI response
  try {
    const aiMessage = await this.streamVisionResponse(
      sessionId,
      content || 'Please analyze this image',
      onChunk,
      false,  // useDeepReasoning - hardcoded for now
      false   // useNuclear - hardcoded for now
    );
    
    // Return the AI message (frontend already has the user message)
    return aiMessage;
  } catch (error) {
    console.error('Vision streaming failed:', error);
    throw error;
  }
}
```

### Step 3: Update Chat Page to Handle Streaming
**File**: `app/chat/page.tsx`

**Find the `sendMessageWithFileToSession` function** and update it:

```typescript
const sendMessageWithFileToSession = async (
  sessionId: string,
  content: string,
  file: File
) => {
  try {
    // 1. Add user message (existing code - keep as-is)
    const userMessage = await chatService.sendMessageWithFile(
      sessionId,
      content,
      file
    );
    
    addMessage(userMessage);
    
    // 2. NEW: Create AI message placeholder
    const tempAiMessageId = (Date.now() + 1).toString();
    const aiMessagePlaceholder: ChatMessageType = {
      id: tempAiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      sessionId: sessionId,
    };
    addMessage(aiMessagePlaceholder);
    setStreamingMessageId(tempAiMessageId);
    setIsStreaming(true);
    
    // 3. NEW: Call service again with streaming callback
    try {
      const aiResponse = await chatService.sendMessageWithFile(
        sessionId,
        content,
        file,
        (chunk: string) => {
          updateMessage(tempAiMessageId, (prev) => prev + chunk);
        }
      );
      
      // 4. Update with final content if needed
      if (aiResponse.content) {
        updateMessage(tempAiMessageId, aiResponse.content);
      }
      
      // 5. Handle metadata (quotas) if present
      if (aiResponse.metadata?.reasoning_remaining !== undefined) {
        toastSuccess(`Deep reasoning uses remaining today: ${aiResponse.metadata.reasoning_remaining}`);
      }
      
    } catch (error) {
      console.error('Vision analysis failed:', error);
      updateMessage(tempAiMessageId, 'Sorry, I couldn\'t analyze the image. Please try again.');
      toastFromApiError(error);
    } finally {
      setIsStreaming(false);
      setStreamingMessageId(null);
    }
    
  } catch (error) {
    console.error('Failed to send image:', error);
    toastFromApiError(error);
  }
};
```

### Step 4: Fix Double Message Issue
Since we're now calling `sendMessageWithFile` twice (once for user, once for AI), we need to adjust:

**Option A - Minimal Change** (Recommended):
Keep calling it twice but only return user message first time:

```typescript
// First call - just upload, don't stream
const userMessage = await chatService.sendMessageWithFile(
  sessionId, content, file
  // No onChunk callback = no streaming
);

// Second call - with streaming
const aiMessage = await chatService.sendMessageWithFile(
  sessionId, content, file,
  (chunk) => updateMessage(tempAiId, prev => prev + chunk)
);
```

**Option B - Refactor Service** (More work):
Change service to return `{ user: ChatMessage, ai: ChatMessage }` - but this breaks backward compatibility.

## 🧪 Testing Plan

### Test 1: Existing Text Chat
1. Send a regular text message
2. Verify streaming works
3. Verify deep/nuclear modes work
4. **Expected**: No change in behavior

### Test 2: Basic Image Upload
1. Upload an image without text
2. **Expected**: 
   - User message appears with image preview
   - AI message starts streaming immediately
   - Vision analysis appears in response

### Test 3: Image Upload with Text
1. Upload image with custom message
2. **Expected**: Same as Test 2 but with custom user text

### Test 4: Error Handling
1. Upload invalid file type
2. Upload oversized file
3. Disconnect internet after upload
4. **Expected**: Appropriate error messages

### Test 5: Multiple Images
1. Upload image, wait for response
2. Upload another image
3. **Expected**: Each works independently

## 🚨 Rollback Plan
If issues arise:
1. Remove the streaming call from `sendMessageWithFile`
2. Revert `sendMessageWithFileToSession` to original
3. No database changes needed
4. No backend changes needed

## 📝 Post-Deployment Checklist
- [ ] Monitor error logs for vision-related failures
- [ ] Check if users report missing AI responses after image upload
- [ ] Verify no impact on text-only chat performance
- [ ] Confirm image previews still display correctly

## 💡 Future Enhancements (Not Now)
- Add deep/nuclear mode support for images
- Show "Analyzing image..." specific loading state
- Add image type detection (blueprint vs photo)
- Support multiple images in one message

## 🎯 Success Criteria
- Image uploads trigger immediate AI analysis
- No regression in text chat functionality  
- Error handling remains robust
- Production deployment requires zero backend changes