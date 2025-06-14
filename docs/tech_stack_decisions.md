# Tech Stack Decisions

## Why This Architecture?

Based on developer consultation and project requirements for field electricians with real-time and offline needs:

### Current Stack Assessment
**Flask + HTML/JS**: Great for prototyping but faces production challenges:
- Limited real-time capabilities without custom WebSocket/SSE work
- Harder to build modern, mobile-optimized, offline-ready UIs
- Not scalable for dynamic, interactive experiences

### Recommended Hybrid Stack

## Frontend Stack (What We're Building)
- **Framework**: Next.js 15.3.3 on Vercel
  - Responsive, fast, PWA-capable
  - Edge-optimized deployment
  - Built-in image optimization
  - App Router for modern React patterns
  
- **Core Dependencies**:
  - React 19.1.0
  - React DOM 19.1.0
  - TypeScript 5.x
  - Tailwind CSS 3.4.1
  
- **Styling**: Tailwind CSS + shadcn/ui
  - Utility-first for rapid development
  - Component library for consistency
  - Mobile-responsive by default
  
- **State Management**: 
  - React Query (TanStack Query) 5.80.7
  - Zustand 4.5.2
  - No direct database connections
  
- **Authentication**: NextAuth.js
  - JWT tokens from Flask backend
  - Secure session management
  - Protected routes
  
- **PWA Features**: next-pwa
  - Offline capability
  - Background sync
  - Push notifications

## Backend Stack (Already Built & Deployed)
- **API**: Flask (Python)
- **URL**: https://ohmni-backend.onrender.com
- **Database**: PostgreSQL (primary)
- **Knowledge Base**: MongoDB (electrical tips/tricks)
- **Hosting**: Render.com with auto-deploy
- **Real-time**: Server-Sent Events (SSE)
- **AI Models**: Anthropic Claude, OpenAI GPT

## Data Flow Architecture
```
User → Next.js Frontend → Flask API → Databases/AI Services
         ↓                    ↓
      Vercel             Render.com
```

## Why This Separation?
1. **Security**: Database credentials never exposed to frontend
2. **Scalability**: Frontend and backend scale independently  
3. **Flexibility**: Multiple frontends can use same API
4. **Reliability**: API versioning and backwards compatibility
5. **Development**: Teams can work in parallel

## Deployment Strategy
- **Frontend**: Vercel
  - Automatic deployments from GitHub
  - Global CDN for fast loading
  - Serverless functions for API routes
  - Built-in analytics and performance monitoring
  - Free tier perfect for MVP (~100 users)
  - Scales automatically with traffic
  
- **Backend**: Render.com
  - Already deployed at https://ohmni-backend.onrender.com
  - Auto-deploy from main branch
  - Managed PostgreSQL database
  - Simpler than Azure for current scale
  
- **Future**: Can add Azure for enterprise integrations when needed

## Vercel-Specific Benefits
- **Edge Functions**: API routes run at edge locations closest to users
- **Image Optimization**: Automatic image resizing and WebP conversion
- **Preview Deployments**: Every PR gets its own preview URL
- **Performance Analytics**: Core Web Vitals tracking built-in
- **Zero Config**: Works out of the box with Next.js