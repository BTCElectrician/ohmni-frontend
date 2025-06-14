# Frontend Quick Reference

## 🚀 Quick Setup
```bash
npx create-next-app@latest abco-ai-frontend --typescript --tailwind --app
cd abco-ai-frontend
npm install @tanstack/react-query@^5.80.7 @tanstack/react-query-devtools@^5.80.7 zustand@^4.5.2 next-auth next-pwa
npm install @radix-ui/react-slot class-variance-authority clsx tailwind-merge
npm run dev
```

## 🚢 Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel

# Or connect GitHub repo for automatic deployments:
# 1. Push code to GitHub
# 2. Import project at vercel.com
# 3. Auto-deploys on every push to main
```

## 🔑 Environment Variables (.env.local)
```env
# Backend API
NEXT_PUBLIC_BACKEND_URL=https://ohmni-backend.onrender.com

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-generate-one

# Optional Theme
NEXT_PUBLIC_COMPANY_PRIMARY_COLOR=#e67e22
NEXT_PUBLIC_COMPANY_SECONDARY_COLOR=#34495e
```

### Vercel Environment Variables
When deploying to Vercel, add these in the dashboard:
- `NEXT_PUBLIC_BACKEND_URL`: https://ohmni-backend.onrender.com
- `NEXTAUTH_URL`: https://your-app.vercel.app
- `NEXTAUTH_SECRET`: [generate a secure secret]

## 📡 Backend API Reference
- **Base URL**: https://ohmni-backend.onrender.com
- **Docs**: See DEPLOYMENT_STATUS.md for all endpoints
- **Auth**: Bearer token in Authorization header
- **Content-Type**: application/json

## 🎯 MVP Features Priority
1. **Authentication** (Week 1)
   - Login/Register/Logout
   - JWT token management
   - Protected routes

2. **Chat Interface** (Week 1-2)
   - Message input/display
   - SSE streaming responses
   - Session management
   - File upload

3. **Knowledge Base Integration** (Week 2)
   - Search electrical tips
   - Enhance AI responses
   - Display source attribution

4. **Mobile PWA** (Week 2-3)
   - Offline support
   - Install prompt
   - Service worker

## 🏗️ Project Structure
```
/app
  /(auth)
    /login
    /register
  /(dashboard)
    /layout.tsx    # Protected layout
    /chat
    /projects
/components
  /ui             # shadcn components
  /chat
  /auth
/lib
  /api.ts         # API client with auth
  /auth.ts        # NextAuth config
/services
  /api            # API service layer
  /knowledge      # Knowledge base queries
/hooks
  /useAuth.ts
  /useChat.ts
/types
  /api.ts         # TypeScript interfaces
```

## 💡 Key Implementation Notes

### API Client Pattern
```typescript
// lib/api.ts
export async function apiRequest(endpoint: string, options = {}) {
  const session = await getSession();
  
  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${session?.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  return response.json();
}
```

### Knowledge Base Integration
```typescript
// NEVER do this (direct DB access):
// ❌ const tips = await mongoClient.db('electrical').collection('tips').find()

// ALWAYS do this (through API):
// ✅ const tips = await apiRequest('/api/knowledge/search', { 
//      method: 'POST',
//      body: JSON.stringify({ query: 'wire pulling' })
//    });
```

## 🚨 Common Pitfalls to Avoid
1. **Never** put database credentials in frontend
2. **Never** make direct database connections
3. **Always** check DEPLOYMENT_STATUS.md first
4. **Always** handle offline scenarios
5. **Always** show loading states

## 📱 Testing Checklist
- [ ] Works on mobile devices
- [ ] Handles poor connectivity
- [ ] Offline mode functions
- [ ] JWT refresh works
- [ ] Error states display properly