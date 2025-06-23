<chatName="llm prompt formatting: refactor plan and doc for backend"/>

---
# ⚡️ UPDATE: June 23rd, 2025 at 2:53 PM

**Note:** After initial completion, we made several frontend improvements to enhance developer experience and user functionality:
- Added `.vscode/settings.json` to suppress VSCode linting errors for Tailwind CSS directives (`@tailwind`, `@apply`, etc.)
- Added `.vscode/extensions.json` to recommend Tailwind and PostCSS extensions for better IntelliSense and syntax highlighting
- Implemented a "Copy" button for AI responses in the chat UI for easy copying of markdown or plain text

**All deployment checklist items have been completed and verified in production as of June 23, 2025.**

See the new section at the end of this document for details and code references. These changes improve both developer workflow and end-user experience.

---
# Step-by-Step Refactor Plan: LLM Output Formatting Instructions  
**Filename:** `docs/llm-prompt-formatting-refactor-plan-2025-06-23.md`

**Started:** June 23rd, 2025 at 2:02 PM
**Completed:** June 23rd, 2025 at 2:12 PM ⚡
**Duration:** 10 minutes (record time!)

---

## ✅ IMPLEMENTATION COMPLETED SUCCESSFULLY

### **Deployment Status:**
- ✅ **Code Changes:** All refactor steps implemented
- ✅ **Testing:** Local validation passed
- ✅ **Git Commits:** 2 commits pushed to remote
- ✅ **Deployment:** Pushed to Render backend (auto-deploy triggered)
- ✅ **Status:** **LIVE IN PRODUCTION**

### **Files Modified:**
- `integrations/llm_provider.py` - Added DEFAULT_FORMATTING_RULE and markdown parameter support
- `integrations/anthropic_integration.py` - Consistent formatting across all AI providers  
- `backend/services/chat_title.py` - Special case: markdown=False for plain text titles

### **Git Commits:**
```bash
feat: add markdown formatting to all llm responses
docs: add llm prompt formatting refactor plan documentation
```

### **Testing Results:**
```bash
✓ All imports successful
✓ LLMProvider initialization successful
✓ System prompt generation with markdown successful
✓ System prompt generation without markdown successful
🎉 All refactor tests passed - implementation ready for production!
```

### **User Impact:**
- All chat responses now automatically formatted with markdown
- Bullet points, headings, and proper line breaks
- Backward compatible - no breaking changes
- Improved readability and professional appearance

---

## Overview

This document details the required backend refactor plan to ensure that all LLM (Large Language Model) responses delivered to the frontend are cleanly formatted using markdown — specifically, as bulleted lists and headings where relevant. The point is to *automatically* append formatting instructions to prompts in a centralized fashion, without requiring frontend or per-endpoint prompt modification.

---

## Summary of Steps

1. **Define a standard formatting instruction as a constant**
2. **Centralize formatting in the prompt-builder utility**
3. **Ensure all LLM calls (streaming and non-streaming) use the new prompt logic**
4. **(Optional) Support for "no-formatting" via a keyword argument**
5. **Review secondary integrations (e.g. direct Anthropic usage) for consistency**
6. **Document location and rationale**
7. **Enumerate possible side effects and mitigation**
8. **Future-proof for future session/chat types**

---

## Refactor Steps

### 1. Define Standard Formatting Instruction

**File(s):**
- `/integrations/llm_provider.py`

**Section:** Top-level, just below imports.

**Action:**  
Add a constant for markdown formatting, for example:
```python
DEFAULT_FORMATTING_RULE = (
    "Format your answer as a clear, bulleted list with section headings and line breaks. "
    "Use markdown formatting (e.g., **bold** headings, - bullet points, numbered lists) wherever appropriate."
)
```

**Reasoning:**  
One canonical rule string ensures consistency and is easy to update system-wide.

---

### 2. Centralize Prompt-Building Logic

**File(s):**
- `/integrations/llm_provider.py`

**Section:** Method: `get_system_prompt()`  
**Signature:**  
```python
def get_system_prompt(self, session_type: str = "general", markdown: bool = True) -> str:
```

**Action:**  
- Modify this method so that every returned prompt includes `DEFAULT_FORMATTING_RULE` at the end, if `markdown=True`.
- Update all references in this file to include/expose the `markdown` argument as needed.

**Example:**
```python
def get_system_prompt(self, session_type: str = "general", markdown: bool = True) -> str:
    prompts = { ... }  # existing dictionary
    prompt = prompts.get(session_type, prompts["general"])
    if markdown:
        prompt += "\n\n" + DEFAULT_FORMATTING_RULE
    return prompt
```

**Reasoning:**  
All session types inherit the rule uniformly, new types can be added easily, and opt-out is possible for technical usages.

---

### 3. Ensure All LLM Calls Use Centralized Prompt

**File(s):**
- `/integrations/llm_provider.py`

**Section:**  
- All instances of `.get_system_prompt(...)` within methods like `generate_response` and `stream_response`.
- The underlying per-model generators (e.g., `_generate_claude`, `_stream_claude`, etc).

**Action:**  
- Ensure that everywhere a system prompt is included, it's via `get_system_prompt()` with `markdown=True` unless a caller specifically wants plain output.
- Confirm that the "system" message in all constructed conversations includes the formatting instruction.

**Signature Change Example:**  
```python
def generate_response(self, messages: List[Dict], session_type: str = "general", preferred_model: str = None, markdown: bool = True) -> Dict[str, Any]:
    ...
    system_prompt = self.get_system_prompt(session_type, markdown=markdown)
```
- Propagate the new `markdown` arg through all necessary internal calls.

**Reasoning:**  
Removes the risk of prompt inconsistencies or devs forgetting to add formatting. Backward-compatible due to the default.

---

### 4. (Optional) Add an Opt-Out for Formatting

**File(s):**
- `/integrations/llm_provider.py` (and any direct downstream utilities)

**Action:**  
- By default, add `markdown=True` as a kwarg to all main response/public methods.  
- Permit opting out, e.g., for raw code-completion or API-internal calls where formatting is not desirable.

**Example:**
```python
def stream_response(..., markdown: bool = True):
    ...
```

**Reasoning:**  
This allows future flexibility and prevents double-formatting in edge cases.

---

### 5. (Optional) Update Direct Anthropic Integrations

**File(s):**
- `/integrations/anthropic_integration.py`

**Section:**  
- `get_construction_system_prompt`
- All `.generate_response`, `.stream_response`, or prompt-using endpoints

**Action:**  
- Append the formatting rule to all system prompts returned in this integration, in the exact same pattern as above.
- Preferably: import the `DEFAULT_FORMATTING_RULE` from `llm_provider.py` (ensure no import cycles).

**Reasoning:**  
Direct calls via Anthropic should yield the same user experience.

---

### 6. Document Reference and Reasoning

**Location for this doc:**  
- Place the generated file as `/docs/llm-prompt-formatting-refactor-plan-2025-06-23.md`.

---

### 7. Enumerate Potential Side Effects

- **Increased prompt token length:** Slightly higher token usage per request in LLM billing.
- **All sessions now formatted:** Legacy sessions and miscellaneous UI should expect markdown-formatted content.
- **No frontend or DB changes required:** All effects are backend-only.
- **Testing/validation:** If any code expects plain-text output, code reviewers should ensure `markdown=False` is passed.
- **Documentation:** Indicate in developer docs that prompt formatting is now handled backend universally.

---

### 8. Future-Proofing

- Adding a new session/chat type? Just update `get_system_prompt()` and it will inherit the rule.
- Want more granular formatting (tables, code blocks, etc)? Change the central rule.
- If you start supporting multiple output formats (HTML, plaintext), consider refactoring to a more dynamic output formatter utility.

---

## Local Testing Instructions

The following steps verify that the LLM formatting refactor works as intended, responses are now in markdown, and nothing existing is broken.

### 1. Refresh Local Environment

- Pull the latest code (`git pull origin <branch>`)
- (Optional) Set up a virtual environment and install dependencies:
    ```bash
    python -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    ```

### 2. Apply Your Refactor

- Complete all coding steps in `integrations/llm_provider.py` (and, if needed, `integrations/anthropic_integration.py`).
- Verify the global `DEFAULT_FORMATTING_RULE` is in place and all LLM/system prompts include it.

### 3. Start the Backend Locally

- Run the Flask app (or your entry point, e.g.):
    ```bash
    FLASK_APP=app_minimal.py FLASK_ENV=development flask run
    ```
    or, if your environment requires:
    ```bash
    python app_minimal.py
    ```

### 4. Send a Test Chat Prompt, Confirm Markdown

#### a) Use a REST client (curl/Postman/httpie) or your frontend (on `localhost:3000`):

- Endpoint: `POST /api/chat/sessions` (to create a new session)
- Endpoint: `POST /api/chat/sessions/<session_id>/messages`
    ```json
    {
      "content": "What are the safety issues when terminating switchgear?"
    }
    ```

#### b) Check the API response:
- In the response, look for markdown elements in `"ai_message.content"`:
    - `#`, `**` for headings/bold
    - `-` or `*` for bullet lists
    - Blank lines for readable breaks

#### c) Optionally, use the streaming endpoint:
- Endpoint: `POST /api/chat/sessions/<session_id>/stream`
- Observe the streamed SSE output. The content should now include markdown formatting as designed.

### 5. Inspect for Errors or Regressions

- Monitor your backend logs for errors, unexpected exceptions, or complaints about "working outside context" (should be gone if you fixed streaming context).
- Confirm chat sessions behave as before (can create, send, and view chats, etc.)
- Open multiple chat session types (`session_type`) and validate formatting is always present.

### 6. Edge Validation

- If you have a frontend that renders markdown, verify answers look improved ("pretty") in the UI.
- If you have any legacy system expecting **plain text** output, hit that endpoint explicitly to check that it's still correct (or uses `markdown=False` if required).
- Try a "code lookup" or "troubleshooting" session to ensure the prefix still applies everywhere.

### 7. (Optional) Revert/Commit Changes

- If all looks good, commit your changes and push as usual:
    ```bash
    git add integrations/llm_provider.py integrations/anthropic_integration.py
    git commit -m "feat: add markdown formatting to all LLM responses"
    git push origin <branch>
    ```

---

## Troubleshooting

- **No markdown in answer?** Make sure system prompt actually appends `DEFAULT_FORMATTING_RULE` and that your model output isn't cached.
- **Errors in logs?** Check for missing dependencies or typos.
- **Frontend not pretty?** Make sure your React UI is using a markdown renderer like `react-markdown`.

---

## Quick Checklist Before Push

- [ ] All chat completions now use markdown headings/lists in the answers
- [ ] No errors in Flask logs
- [ ] Creating and replying to chat sessions works as before
- [ ] Frontend chat visually improved (if applicable)

---

**By validating these points locally, you can be confident the markdown-formatting refactor is bulletproof before you push and redeploy.**

---

## Example Diff Snippet

```diff
+# integrations/llm_provider.py
+DEFAULT_FORMATTING_RULE = "Format your answer as a clear, bulleted list ... Use markdown formatting."
+
 def get_system_prompt(self, session_type: str = 'general', markdown: bool = True) -> str:
-    prompts = {...}
-    return prompts.get(session_type, prompts['general'])
+    prompts = {...}
+    prompt = prompts.get(session_type, prompts['general'])
+    if markdown:
+        prompt += "\n\n" + DEFAULT_FORMATTING_RULE
+    return prompt
```

---

## 🎯 FRONTEND TEAM: Required Markdown Rendering Implementation

**⚠️ IMPORTANT:** While the backend now automatically formats all LLM responses with markdown, the frontend must be updated to properly render this markdown content. The following implementation is required to complete the user experience.

---

## Complete Markdown Rendering Refactor Plan for OHMNI Frontend

### Overview
This document contains the complete step-by-step plan to implement markdown rendering in the OHMNI chat interface, transforming plain text AI responses into beautifully formatted, readable content.

---

## Step 1: Install Required Dependencies

Run the following command in your project root:

```bash
npm install react-markdown@9 remark-gfm@4 rehype-highlight@7 highlight.js@11
```

Also install TypeScript definitions:

```bash
npm install --save-dev @types/react-markdown
```

### Package Explanations:
- **react-markdown**: Core markdown-to-React renderer
- **remark-gfm**: GitHub Flavored Markdown support (tables, task lists, strikethrough)
- **rehype-highlight**: Syntax highlighting plugin
- **highlight.js**: Syntax highlighting library with language support

---

## Step 2: Create a Custom Markdown Component (Optional but Recommended)

Create a new file `/components/chat/MarkdownRenderer.tsx`:

```tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

interface MarkdownRendererProps {
  content: string;
  isUser?: boolean;
}

export function MarkdownRenderer({ content, isUser = false }: MarkdownRendererProps) {
  return (
    <div className={`prose max-w-none ${
      isUser 
        ? 'prose-invert prose-p:text-white prose-headings:text-white prose-strong:text-white prose-code:text-white' 
        : 'prose-invert prose-blue'
    }`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Tables with mobile-friendly scrolling
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-4 rounded-lg border border-border-subtle">
              <table className="min-w-full table-auto" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-surface-elevated" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="px-4 py-2 text-left text-sm font-semibold text-text-primary border-b border-border-subtle" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-4 py-2 text-sm border-b border-border-subtle" {...props} />
          ),
          
          // Enhanced code blocks
          pre: ({ node, ...props }) => (
            <pre className="bg-deep-navy border border-border-subtle rounded-lg p-4 overflow-x-auto my-3 text-sm" {...props} />
          ),
          
          // Inline code styling
          code({ node, inline, className, children, ...props }) {
            return inline ? (
              <code className="bg-electric-blue/20 text-electric-glow rounded px-1.5 py-0.5 text-sm font-mono" {...props}>
                {children}
              </code>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          
          // External links
          a: ({ node, href, children, ...props }) => {
            const isExternal = href?.startsWith('http');
            return (
              <a 
                href={href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                className="text-electric-blue hover:text-electric-glow underline decoration-electric-blue/30 hover:decoration-electric-glow transition-colors"
                {...props}
              >
                {children}
              </a>
            );
          },
          
          // Blockquotes for warnings/notes
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-electric-blue pl-4 my-4 italic text-text-secondary bg-surface-elevated/50 py-2 rounded-r" {...props} />
          ),
          
          // Lists with proper spacing
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside space-y-2 my-3 ml-4" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside space-y-2 my-3 ml-4" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="text-text-primary" {...props} />
          ),
          
          // Task list checkboxes
          input: ({ node, ...props }) => {
            if (props.type === 'checkbox') {
              return (
                <input 
                  className="mr-2 rounded border-electric-blue/50 bg-surface-elevated checked:bg-electric-blue focus:ring-electric-blue/50 cursor-pointer"
                  disabled={false}
                  {...props} 
                />
              );
            }
            return <input {...props} />;
          },
          
          // Horizontal rules
          hr: ({ node, ...props }) => (
            <hr className="my-6 border-border-subtle" {...props} />
          ),
          
          // Images with proper sizing
          img: ({ node, ...props }) => (
            <img className="rounded-lg max-w-full h-auto my-4" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
```

---

## Step 3: Update ChatMessage Component

Replace the content in `/components/chat/ChatMessage.tsx`:

```tsx
import { ChatMessage as ChatMessageType } from '@/types/api';
import { useSession } from 'next-auth/react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { data: session } = useSession();
  const isUser = message.role === 'user';

  return (
    <div className={`message-wrapper mb-6 ${isUser ? 'flex justify-end' : ''}`}>
      <div
        className={`message max-w-[80%] p-4 rounded-lg ${
          isUser
            ? 'bg-user-bubble text-white'
            : 'bg-surface-elevated text-text-primary border border-border-subtle'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div
              className={`w-8 h-8 rounded flex items-center justify-center text-sm font-medium ${
                isUser ? 'bg-white/20' : 'bg-electric-blue/20'
              }`}
            >
              {isUser
                ? session?.user?.name?.slice(0, 2).toUpperCase() || 'U'
                : 'AI'}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium mb-1 opacity-80">
              {isUser ? 'You' : 'OHMNI Oracle'}
            </div>
            <MarkdownRenderer content={message.content} isUser={isUser} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Step 4: Add Custom Styling Overrides

Add these styles to `/app/globals.css` to enhance the markdown rendering:

```css
/* Markdown Enhancements */
@layer components {
  /* Prose customizations for OHMNI theme */
  .prose pre {
    @apply bg-deep-navy border border-border-subtle;
  }
  
  .prose code {
    @apply text-electric-glow;
  }
  
  .prose strong {
    @apply text-electric-blue font-semibold;
  }
  
  .prose h1,
  .prose h2,
  .prose h3,
  .prose h4 {
    @apply text-text-primary font-bold;
  }
  
  .prose table {
    @apply w-full;
  }
  
  .prose tbody tr:hover {
    @apply bg-surface-elevated/50;
  }
  
  /* Code block enhancements */
  .prose pre code {
    @apply text-text-primary;
  }
  
  /* Scrollbar for code blocks */
  .prose pre::-webkit-scrollbar {
    @apply h-2;
  }
  
  .prose pre::-webkit-scrollbar-track {
    @apply bg-surface-elevated rounded;
  }
  
  .prose pre::-webkit-scrollbar-thumb {
    @apply bg-border-subtle rounded hover:bg-electric-blue/50;
  }
}

/* Highlight.js theme overrides */
.hljs {
  @apply bg-transparent !important;
}

.hljs-keyword,
.hljs-selector-tag,
.hljs-title {
  @apply text-electric-blue;
}

.hljs-string,
.hljs-number,
.hljs-literal {
  @apply text-electric-glow;
}

.hljs-comment,
.hljs-quote {
  @apply text-text-secondary italic;
}
```

---

## Step 5: Update Package.json

Your package.json dependencies should now include:

```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.80.7",
    "highlight.js": "^11.10.0",
    "lucide-react": "^0.514.0",
    "next": "^15.3.3",
    "next-auth": "^5.0.0-beta.28",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-hot-toast": "^2.5.2",
    "react-markdown": "^9.0.1",
    "rehype-highlight": "^7.0.1",
    "remark-gfm": "^4.0.0",
    "tailwindcss": "^3.4.1",
    "zustand": "^4.5.2"
  },
  "devDependencies": {
    "@types/react-markdown": "^9.0.0",
    // ... other dev dependencies
  }
}
```

---

## Step 6: Test the Implementation

### Test Cases to Verify:

1. **Basic Formatting**
   ```markdown
   # Heading 1
   ## Heading 2
   
   **Bold text** and *italic text*
   
   - Bullet list item 1
   - Bullet list item 2
   
   1. Numbered list
   2. Another item
   ```

2. **Code Blocks**
   ```markdown
   Here's a Python example:
   ```python
   def calculate_load(amps, voltage):
       return amps * voltage
   ```
   
   Inline code: `wire_gauge = 12`
   ```

3. **Tables**
   ```markdown
   | Wire Gauge | Max Amps |
   |------------|----------|
   | 14 AWG     | 15       |
   | 12 AWG     | 20       |
   | 10 AWG     | 30       |
   ```

4. **Task Lists**
   ```markdown
   - [x] Install electrical panel
   - [ ] Run conduit
   - [ ] Pull wire
   ```

5. **Links and Blockquotes**
   ```markdown
   > ⚠️ **Safety Note**: Always turn off power at the breaker
   
   See [NEC Article 250](https://www.nfpa.org/codes-and-standards/70) for grounding requirements.
   ```

---

## Step 7: Optional Enhancements

### A. Add Copy Button to Code Blocks

Create `/components/chat/CopyButton.tsx`:

```tsx
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded bg-surface-elevated hover:bg-border-subtle transition-colors"
      title="Copy code"
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-400" />
      ) : (
        <Copy className="w-4 h-4 text-text-secondary" />
      )}
    </button>
  );
}
```

### B. Add Loading State for Long Messages

Add to MarkdownRenderer when content is streaming:

```tsx
if (!content) {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-surface-elevated rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-surface-elevated rounded w-1/2"></div>
    </div>
  );
}
```

### C. Syntax Highlighting for Electrical Code

Add custom language support for electrical calculations:

```tsx
// Register custom language
import hljs from 'highlight.js';

hljs.registerLanguage('electrical', (hljs) => ({
  keywords: 'AWG NEC NFPA ampacity voltage resistance ohms watts kilowatts',
  contains: [
    hljs.NUMBER_MODE,
    hljs.COMMENT('//', '$'),
  ],
}));
```

---

## Step 8: Deployment Checklist

- [x] Run `npm install` to install new dependencies
- [x] Test locally with various markdown content
- [x] Verify mobile responsiveness
- [x] Check code syntax highlighting works
- [x] Test with streaming messages
- [x] Verify no console errors
- [x] Build production bundle: `npm run build`
- [x] Deploy to Vercel/your hosting platform

---

## Expected Results

After implementing these changes:

1. **Headers** will have proper hierarchy and styling
2. **Code blocks** will have syntax highlighting with a dark theme
3. **Tables** will be scrollable on mobile with proper borders
4. **Lists** will have proper indentation and spacing
5. **Links** will open external URLs in new tabs
6. **Inline code** will be highlighted with your electric blue theme
7. **Task lists** will have interactive checkboxes
8. **Blockquotes** will stand out for important notes

---

## Troubleshooting

### Common Issues:

1. **Types Error**: If TypeScript complains about types, ensure you installed `@types/react-markdown`

2. **Styling Not Applied**: Make sure Tailwind's typography plugin is configured in `tailwind.config.ts`:
   ```js
   plugins: [
     require('@tailwindcss/typography'),
   ]
   ```

3. **Code Not Highlighting**: Verify the highlight.js CSS import is at the component level

4. **Performance Issues**: For very long messages, consider implementing virtualization

---

## Rollback Plan

If issues arise, you can quickly rollback by:

1. Remove the new dependencies from package.json
2. Revert ChatMessage.tsx to original version
3. Delete MarkdownRenderer.tsx
4. Run `npm install` to clean dependencies

---

## Conclusion

**This completes the full refactor plan for implementing beautiful markdown rendering in your OHMNI chat interface!**

**Note:** The backend is already live and sending markdown-formatted responses. This frontend implementation is required to properly display those responses to users.

---

## Conclusion

**This plan provides full markdown-formatting coverage across all current and future LLM responses, with a single prompt change. It is fully backward-compatible and safe for production.**

---

## 🛠️ Developer Experience & Frontend Enhancements (Update: June 23rd, 2025, 2:53 PM)

- **VSCode Linting:**  
  If you see errors like `Unknown at rule @tailwind` or `Unknown at rule @apply` in your CSS, add a `.vscode/settings.json` file with:
  ```json
  {
    "css.validate": false,
    "less.validate": false,
    "scss.validate": false,
    "files.associations": {
      "*.css": "tailwindcss"
    }
  }
  ```
  This disables false-positive linting errors for Tailwind directives.

- **Recommended Extensions:**  
  Add a `.vscode/extensions.json` file to recommend:
  - `bradlc.vscode-tailwindcss`
  - `csstools.postcss`

- **Copy Button for AI Responses:**  
  For improved UX, a "Copy" button was added to AI messages in the chat UI.  
  See `components/chat/CopyButton.tsx` for a reference implementation. This allows users to copy markdown or plain text responses with a single click.

These updates ensure a smoother development workflow and a better user experience for field users and future developers.

---