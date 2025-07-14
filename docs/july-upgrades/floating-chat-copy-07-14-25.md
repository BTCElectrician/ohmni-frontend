# Floating Copy Button Implementation Steps

## Step 1: Add relative positioning to assistant messages

Find this line:
```tsx
className={`message max-w-[80%] p-4 rounded-lg ${
  isUser
    ? 'bg-user-bubble text-white'
    : 'bg-surface-elevated text-text-primary border border-border-subtle'
}`}
```

Change it to:
```tsx
className={`message max-w-[80%] p-4 rounded-lg ${
  isUser
    ? 'bg-user-bubble text-white'
    : 'bg-surface-elevated text-text-primary border border-border-subtle'
} ${!isUser ? 'relative' : ''}`}
```

## Step 2: Remove the copy button from the header

Find and DELETE these lines:
```tsx
{!isUser && (
  <CopyButton text={message.content} />
)}
```

## Step 3: Add the floating copy button

Add this code AFTER the closing `</div>` of the content section (after the mode indicators, before the closing div of the message container):

```tsx
{/* FLOATING COPY BUTTON - Only for assistant messages */}
{!isUser && (
  <div className="sticky bottom-4 float-right mr-2 mt-4 z-10">
    <CopyButton 
      text={message.content} 
      className="shadow-lg bg-surface-elevated/95 backdrop-blur-sm border-2 border-border-subtle hover:border-electric-blue/50 min-w-[100px]"
    />
  </div>
)}
```

## Location Guide
The floating button should be placed:
- INSIDE the message container div (the one with relative positioning)
- AFTER all the message content (markdown, attachments, mode indicators)
- BEFORE the closing `</div>` of the message container