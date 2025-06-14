# Ultimate Front-End Migration Guide
## Complete Migration from Flask/Jinja2 to React/Next.js

**Documentation Checksum:**
```bash
✅ Auth paths corrected
✅ BASE_URL env var added  
✅ SSE TODO added
✅ Notes DB warning added
✅ CORS reminder added
```

This document contains **every single detail** needed to recreate the front-end of your ABCO AI construction/electrical assistant platform in React/Next.js with Tailwind CSS and shadcn/ui components.

---

## 🎨 Design System & Theme

### Color Palette
```css
/* Primary ABCO Theme Colors */
:root {
  --bg-nav: #081827;           /* ABCO Navy */
  --accent-blue: #3B82F6;      /* Lightning hover/border */
  --brand-blue: #3333cc;       /* Primary action buttons */
  --txt-light: #e2e2e2;        /* Light text for dark backgrounds */
  
  /* Electric Blue Owl Palette for Chat */
  --electric-blue: #149DEA;
  --electric-glow: #1EB8FF;
  --deep-navy: #0A1E33;
  --dark-bg: #020B18;
  --bg-primary: #020B18;
  --bg-secondary: #0A1E33;
  --surface-elevated: #11263F;
  --border-subtle: #1B4674;
  --accent-primary: #149DEA;
  --accent-hover: #1EB8FF;
  --accent-glow: #9FEBF8;
  --text-primary: #F0F6FC;
  --text-secondary: #A0B4CC;
  --user-bubble: #0C7BD1;
  
  /* Legacy Support Colors */
  --primary-color: #e67e22;
  --secondary-color: #34495e;
  --primary-light: #4545dd;
  --secondary-light: #99ddff;
  --accent-color: #3B82F6;
  --accent-light: #2222aa;
  --background-color: #e6f2ff;
  --background-light: #f0f8ff;
  --text-color: #212529;
  --text-light: #6c757d;
  --danger-color: #e74c3c;
  --success-color: #2ecc71;
  --warning-color: #f1c40f;
  --info-color: #66ccff;
}
```

### Typography
```css
/* Fonts Used */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@500;600;700&family=Poppins:wght@400;500;600;700&display=swap');

/* Font Stack */
font-family: 'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;

/* Brand Typography */
.brand-name {
  font-weight: 700;
  font-family: 'Montserrat', sans-serif;
  color: #ffffff;
  font-size: 1.1rem;
  line-height: 1.1;
  letter-spacing: 0.5px;
}

.brand-subtitle {
  font-weight: 500;
  font-family: 'Montserrat', sans-serif;
  color: #66ccff;
  font-size: 0.8rem;
  line-height: 1.1;
}
```

---

## 📱 Page Components & Templates

### 1. Layout Template (Base Component)
**Purpose**: Main layout wrapper with header, navigation, and footer
**Key Features**:
- Fixed header with height: 56px
- Responsive navigation
- Theme color injection from environment variables
- Cache-busted asset loading
- Toast notification system

**Header Structure**:
```jsx
// Header Component
<header className="topbar fixed top-0 left-0 right-0 w-full z-100 h-14 bg-[#081827] border-b-2 border-[#3B82F6] shadow-lg">
  <div className="flex items-center justify-between px-4 h-full">
    {/* Left Section */}
    <div className="flex items-center gap-3">
      {/* Sidebar Toggle (conditionally rendered) */}
      {pathname !== '/ohmni' && (
        <button id="sidebarToggle" className="text-white">
          <BarsIcon className="w-4 h-4" />
        </button>
      )}
      
      {/* Brand Container */}
      <div className="flex flex-col justify-center">
        <div className="brand-name font-bold font-montserrat text-white text-lg leading-tight tracking-wide">
          ABCO AI
        </div>
        <div className="brand-subtitle font-medium font-montserrat text-[#66ccff] text-xs leading-tight">
          Electrical Construction
        </div>
      </div>
    </div>

    {/* Navigation */}
    <nav className="main-nav flex items-center">
      <Link href="/ohmni" className="nav-link">Home</Link>
      <Link href="/construction" className="nav-link">Construction Management</Link>
      <Link href="/chat" className="nav-link">Chat</Link>
    </nav>

    {/* Right Section */}
    <div className="flex items-center gap-3">
      <button id="queueBtn" className="text-white">
        <LightBulbIcon className="w-4 h-4" />
      </button>
      {user ? (
        <Link href="/logout" className="nav-link">Logout</Link>
      ) : (
        <Link href="/login" className="nav-link">Login</Link>
      )}
    </div>
  </div>
</header>
```

**Footer Structure**:
```jsx
// Footer Component
<footer className="footer-main bg-[#081827] text-[#e2e2e2] p-8">
  <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
    <div className="nav-col">
      <h6 className="text-sm font-semibold mb-4">LINKS</h6>
      <ul className="space-y-2">
        <li><Link href="/ohmni">Home</Link></li>
        <li><Link href="/chat">Chat</Link></li>
        <li><Link href="/construction">Construction</Link></li>
      </ul>
    </div>

    <div className="logo-col flex justify-center">
      <img src="/images/abco-new-sleak.png" alt="ABCO logo" className="h-16" />
    </div>

    <div className="res-col">
      <h6 className="text-sm font-semibold mb-4">RESOURCES</h6>
      <ul className="space-y-2">
        <li><Link href="#">NEC Code</Link></li>
        <li><Link href="#">Standards</Link></li>
        <li><Link href="#">Safety</Link></li>
      </ul>
    </div>
  </div>

  <div className="copyright text-center mt-8 pt-4 border-t border-gray-600">
    <small>&copy;2025 ABCO Electrical Construction and Design LLC</small>
  </div>
</footer>
```

### 2. Authentication Layout (Auth Pages)
**Purpose**: Simplified layout for login/register pages
**Key Features**:
- No navigation (intentionally empty nav block)
- Fullscreen background
- Centered content

```jsx
// AuthLayout Component
<div className="min-h-screen flex items-center justify-center bg-[#020B18] relative overflow-hidden">
  {/* Background overlay */}
  <div className="absolute inset-0 bg-gradient-to-br from-[#071629]/60 to-[#0A1E33]/50 z-10" />
  
  {/* Content */}
  <div className="relative z-20 w-full max-w-md p-8">
    {children}
  </div>
</div>
```

### 3. Home Page (ohmni_home.html)
**Purpose**: Main landing page with feature cards
**Key Features**:
- Watercolor background with electric overlay
- 2x2 grid of interactive feature cards
- Custom owl icons with glow effects
- Animated card entrance
- Personalized welcome message

```jsx
// Home Page Component
<section className="hero relative flex-grow w-full min-h-[calc(100vh-110px)] bg-cover bg-center bg-no-repeat flex items-center justify-center overflow-hidden" 
         style={{backgroundImage: "url('/images/abco-watercolor.png')"}}>
  
  {/* Electric overlay with blue tint */}
  <div className="absolute inset-0 bg-gradient-to-br from-[#071629]/60 to-[#0A1E33]/50 z-10" />
  
  {/* Animated electric lines effect */}
  <div className="absolute inset-0 opacity-15 pointer-events-none z-20 animate-pulse"
       style={{
         backgroundImage: "url('/images/ohmni-blue-owl-lightning.png')",
         backgroundSize: 'cover',
         animation: 'pulseEffect 8s infinite alternate'
       }} />

  {/* Welcome Card */}
  <div className="relative z-30 w-[90%] max-w-[800px] p-10 bg-[#0A1E33]/70 border border-[#149DEA]/40 rounded-lg shadow-2xl backdrop-blur-sm">
    
    {/* Welcome Heading */}
    <h1 className="text-4xl text-white mb-3 font-bold text-center" 
        style={{textShadow: '0 0 15px rgba(20, 157, 234, 0.6)'}}>
      Welcome{user?.fullname && `, ${user.fullname.split(' ')[0]}`}!
    </h1>
    
    {/* Feature Grid */}
    <div className="grid grid-cols-2 gap-5 mt-4">
      
      {/* Chatbot Card */}
      <FeatureCard
        icon="/images/perfect-thorr-chatbot.png"
        title="Chatbot"
        description="Ask NEC questions in seconds."
        href="/chat"
        buttonText="Open Chatbot"
        delay="0.1s"
      />
      
      {/* Construction Management Card */}
      <FeatureCard
        icon="/images/owl-mini-blueprint.png"
        title="Construction Management"
        description="Track projects and resources."
        href="/construction"
        buttonText="Open Tool"
        delay="0.2s"
      />
      
      {/* Upload Drawing Card */}
      <FeatureCard
        icon="/images/owl-upload-final.png"
        title="Upload Drawing"
        description="Analyze plans and specs."
        href="#"
        buttonText="Upload Now"
        delay="0.3s"
        isUpload={true}
      />
      
      {/* Prefab Lab Card */}
      <FeatureCard
        icon="/images/owl-lab.png"
        title="Prefab Lab"
        description="Calculate assembly times."
        href="#"
        buttonText="Start Prefab"
        delay="0.4s"
      />
      
    </div>
    
    {/* Footer Tagline */}
    <p className="footer-tagline mt-12 mb-0 text-center text-[#a0b4cc] italic text-base pt-5 border-t border-[#1EB8FF]/20">
      "Built by electricians. Powered by AI."
    </p>
  </div>
</section>
```

### 4. Chat Interface (chat.html)
**Purpose**: Main conversational AI interface
**Key Features**:
- Sidebar with chat sessions and projects
- Claude-style centered messages
- Floating input box
- Deep thinking toggle
- Voice recording
- File upload
- Project management integration

**Sidebar Structure**:
```jsx
// Chat Sidebar Component
<div className="chat-sidebar w-[230px] min-w-[230px] bg-[#0A1E33] border-r border-[#149DEA]/20 text-[#A0B4CC] flex flex-col h-full overflow-y-auto">
  
  {/* Fixed Top Section */}
  <div className="flex-shrink-0">
    {/* New Chat Button */}
    <button className="new-chat-item m-3 flex items-center gap-3 w-full p-3 bg-transparent border border-[#149DEA]/30 rounded-lg text-[#F0F6FC] hover:bg-[#11263F] transition-colors">
      <PlusCircleIcon className="w-5 h-5" />
      <span>New chat</span>
    </button>
    
    {/* Starred Section */}
    <div className="mb-0 pb-0">
      <div className="text-xs font-semibold text-[#A0B4CC] px-3 py-2 uppercase tracking-wide">
        Starred
      </div>
      <div className="px-2 mb-0">
        <div className="text-sm text-[#A0B4CC]/70 text-center py-2">No starred conversations</div>
      </div>
    </div>
    
    {/* Projects Section */}
    <div className="mb-0 pb-0">
      <div className="text-xs font-semibold text-[#A0B4CC] px-3 py-2 uppercase tracking-wide">
        Projects
      </div>
      <div className="px-2 mb-0">
        <button className="sidebar-item w-full flex items-center gap-3 p-2 rounded hover:bg-[#11263F] transition-colors">
          <FolderIcon className="w-4 h-4" />
          <span>My Jobs</span>
        </button>
      </div>
    </div>
  </div>
  
  {/* Scrollable Chats Section */}
  <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
    <div className="text-xs font-semibold text-[#A0B4CC] px-3 py-2 uppercase tracking-wide flex-shrink-0">
      Chats
    </div>
    <div className="flex-1 overflow-y-auto px-2 min-h-0">
      {chatSessions.length > 0 ? (
        chatSessions.map(session => (
          <ChatSessionItem key={session.id} session={session} />
        ))
      ) : (
        <div className="text-sm text-[#A0B4CC]/70 text-center py-3">No chat sessions yet</div>
      )}
    </div>
  </div>
  
  {/* Fixed Footer */}
  <div className="sidebar-footer flex-shrink-0 p-3 border-t border-[#149DEA]/20">
    <div className="flex items-center gap-3">
      <div className="user-avatar w-8 h-8 bg-[#149DEA] rounded text-white text-sm flex items-center justify-center">
        {user?.username?.slice(0, 2).toUpperCase()}
      </div>
      <span className="text-sm">{user?.username}</span>
    </div>
  </div>
</div>
```

**Chat Main Area**:
```jsx
// Chat Main Component
<div className="chat-main flex-1 flex flex-col overflow-hidden relative min-w-0">
  
  {/* Content Container */}
  <div className="chat-content bg-[#020B18] relative overflow-hidden flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center">
    
    {/* Background Effect */}
    <div className="absolute inset-0 opacity-7 z-0 pointer-events-none"
         style={{
           backgroundImage: "url('/images/ohmni-blue-owl-lightning.png')",
           backgroundSize: 'cover'
         }} />
    
    {/* Messages Container */}
    <div className="centered-content-wrapper relative z-10 w-full max-w-[780px] mx-auto p-5 pb-[120px]">
      <div className="chat-messages w-full">
        
        {/* Prompt Suggestions (shows when no messages) */}
        {messages.length === 0 && (
          <div className="prompt-card bg-[#11263F] border border-[#149DEA]/30 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-white mb-4">Suggested Prompts</h3>
            <div className="space-y-3">
              <PromptItem 
                icon="⚡" 
                text="Explain electrical load calculations for a 2000 sq ft residential building" 
              />
              <PromptItem 
                icon="🛡️" 
                text="Help me understand OSHA requirements for scaffolding on a commercial project" 
              />
              <PromptItem 
                icon="📋" 
                text="Draft a project plan timeline for kitchen renovation with electrical work" 
              />
              <PromptItem 
                icon="♻️" 
                text="What are the best practices for managing construction waste?" 
              />
            </div>
          </div>
        )}
        
        {/* Chat Messages */}
        {messages.map(message => (
          <ChatMessage key={message.id} message={message} />
        ))}
        
      </div>
    </div>
  </div>
  
  {/* Fixed Footer with Input */}
  <ChatFooter />
</div>
```

### 5. Construction Management Page
**Purpose**: Integration hub for construction management software
**Key Features**:
- Integration cards for Procore, Fieldwire, BuilderTrend
- "Coming Soon" badges
- Feature lists with checkmarks
- Hover animations
- Return to chat button

```jsx
// Construction Management Component
<div className="construction-container max-w-[1000px] mx-auto p-8">
  
  {/* Title Section */}
  <div className="title-section text-center mb-12">
    <h1 className="text-white text-4xl font-bold mb-4" 
        style={{textShadow: '0 0 15px rgba(20, 157, 234, 0.6)'}}>
      Construction Management Integration
    </h1>
    <p className="text-[#a0b4cc] text-xl max-w-[700px] mx-auto mb-6">
      Connect your AI assistant with popular construction management software
    </p>
    <div className="return-button">
      <Link href="/chat" className="btn-return inline-flex items-center gap-2 bg-gradient-to-r from-[#0C7BD1] to-[#1EB8FF] text-white px-7 py-3 rounded-lg font-medium text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all">
        <ArrowLeftIcon className="w-5 h-5" />
        Return to Chat
      </Link>
    </div>
  </div>
  
  {/* Integration Grid */}
  <div className="integration-grid grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
    
    <IntegrationCard
      title="Procore"
      description="Connect with Procore to manage all your construction projects, tasks, documents, and resources."
      features={[
        "Project management and overview",
        "Task assignment and tracking", 
        "Document access and management",
        "Resource allocation and scheduling"
      ]}
      learnMoreUrl="https://www.procore.com/"
    />
    
    <IntegrationCard
      title="Fieldwire"
      description="Integrate with Fieldwire to streamline field operations, task management, and drawing access."
      features={[
        "Field operations management",
        "Task creation and assignment",
        "Drawing and plan access", 
        "Field reporting and documentation"
      ]}
      learnMoreUrl="https://www.fieldwire.com/"
    />
    
    <IntegrationCard
      title="BuilderTrend"
      description="Connect with BuilderTrend for comprehensive project management and client communication."
      features={[
        "Customer management",
        "Project scheduling",
        "Budget tracking",
        "Photo and file sharing"
      ]}
      learnMoreUrl="https://buildertrend.com/"
    />
    
  </div>
</div>
```

### 6. Login Page
**Purpose**: User authentication with ultra-visible remember me checkbox
**Key Features**:
- Red remember me section with massive styling
- Form validation
- Links to register and password reset

```jsx
// Login Component
<div className="login-wrapper max-w-md mx-auto p-8 bg-[#0A1E33]/70 border border-[#149DEA]/40 rounded-lg backdrop-blur-sm">
  
  <h2 className="text-center uppercase mb-2 text-[#3B82F6] text-2xl font-bold tracking-wider">
    OHMNI ORACLE
  </h2>
  <p className="text-center italic mb-6 text-[#a0b4cc]">
    "We handle it all, the rest is just decor."
  </p>

  <form onSubmit={handleLogin}>
    <div className="mb-4">
      <label className="form-label block text-white mb-2">Email</label>
      <input 
        type="email"
        className="form-control w-full p-3 rounded bg-[#11263F] border border-[#149DEA]/30 text-white"
        required
      />
    </div>

    <div className="mb-4">
      <label className="form-label block text-white mb-2">Password</label>
      <input 
        type="password"
        className="form-control w-full p-3 rounded bg-[#11263F] border border-[#149DEA]/30 text-white"
        required
      />
    </div>

    {/* ULTRA VISIBLE REMEMBER ME */}
    <div className="bg-red-500 p-4 rounded-lg my-5 text-center border-4 border-white shadow-lg">
      <label className="text-white text-2xl font-extrabold uppercase tracking-widest flex items-center justify-center cursor-pointer"
             style={{textShadow: '2px 2px 4px #000000'}}>
        <input 
          type="checkbox"
          name="remember_me"
          className="w-9 h-9 mr-5 border-4 border-white cursor-pointer"
        />
        REMEMBER ME
      </label>
    </div>

    <button 
      type="submit"
      className="btn-primary w-full py-3 text-xl bg-gradient-to-r from-[#0C7BD1] to-[#1EB8FF] text-white rounded font-semibold hover:shadow-lg transform hover:-translate-y-1 transition-all"
    >
      Sign In
    </button>

    <div className="flex justify-between mt-3">
      <Link href="/register" className="text-[#149DEA] hover:text-[#1EB8FF]">
        New user? Register here
      </Link>
      <Link href="/reset-password-request" className="text-[#149DEA] hover:text-[#1EB8FF]">
        Forgot password?
      </Link>
    </div>
  </form>

  <hr className="my-4 border-[#149DEA]/30" />
  <p className="text-center text-sm text-[#a0b4cc]">
    Built by electricians. Powered by AI.
  </p>
</div>
```

### 7. Register Page
**Purpose**: New user registration
**Key Features**:
- Email, username, full name, password fields
- Company access code (optional)
- Form validation with error display

### 8. 404 Error Page
**Purpose**: Handle page not found errors
**Key Features**:
- Error container with actions
- Home and Chat buttons

---

## 🎯 Static Assets Inventory

### Images Directory (`/static/images/`)
**Core Brand Assets**:
- `abco-logo.png` - Main company logo
- `abco-new-sleak.png` - Sleek version for footer
- `abco-watercolor.png` - Background watercolor office image
- `favicon.svg` - Site favicon

**Owl Icon Collection** (Custom electrical-themed owls):
- `blue-ohmni-owl.png` - Basic blue owl
- `faded-owl-ohmni.png` - Faded version
- `mini-thor-owl.png` - Thor-themed owl
- `ohmni-blue-owl-lightning.png` - Main lightning owl (used as bg effect)
- `owl-lab.png` - Laboratory/prefab themed owl
- `owl-mini-blueprint.png` - Construction/blueprint themed owl  
- `owl-upload-final.png` - File upload themed owl
- `perfect-thorr-chatbot.png` - Main chatbot icon

**Optimized Images**:
- `images/optimized/` - Contains optimized versions for performance

### CSS Directory (`/static/css/`)
**Core Stylesheets**:
- `style.css` - Main global styles with header/footer/layout
- `chat.css` - Complete chat interface styling with electric theme
- `home.css` - Home page specific styles with animations
- `auth.css` - Authentication pages styling
- `construction.css` - Construction management page styles
- `_theme.css` - Theme variables and color definitions
- `custom-remember.css` - Ultra-visible remember me checkbox styles

### JavaScript Directory (`/static/js/`)
**Core Scripts**:
- `main.js` - Global functionality, theme initialization, UI setup
- `chat.js` - Complete chat interface logic, messaging, session management
- `home.js` - Home page animations and feature card interactions
- `voice-recorder.js` - Voice recording functionality
- `file-upload.js` - File upload and drag-drop handling
- `construction.js` - Construction page enhancements and animations

---

## 🔧 Key JavaScript Functions & Features

### Chat Functionality (`chat.js`)
**Core Features**:
- Session management (create, load, delete, rename)
- Real-time messaging with WebSocket-like updates
- Bulk session deletion with confirmation modal
- Project integration and management
- Deep thinking mode toggle
- Voice message recording and processing
- File upload with drag-and-drop
- Prompt suggestions with auto-fill

**Key Functions**:
```javascript
// Essential chat functions to implement in React
// Note: Chat APIs are pending backend implementation
async function createNewChat() {
  return apiRequest('/api/chat/sessions', { method: 'POST' })
}

async function loadChatSession(sessionId) {
  return apiRequest(`/api/chat/sessions/${sessionId}`)
}

async function sendMessage(sessionId, message) {
  return apiRequest('/api/chat/message', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, message })
  })
}

async function loadChatSessions() {
  return apiRequest('/api/chat/sessions')
}

async function deleteChatSession(sessionId) {
  return apiRequest(`/api/chat/sessions/${sessionId}`, { method: 'DELETE' })
}

async function renameChatSession(sessionId, newName) {
  return apiRequest(`/api/chat/sessions/${sessionId}/rename`, {
    method: 'PUT',
    body: JSON.stringify({ name: newName })
  })
}

// File upload using existing endpoint
async function handleFileUpload(file) {
  const formData = new FormData()
  formData.append('file', file)
  
  const session = await getSession()
  return fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session?.accessToken}`
    },
    body: formData
  })
}

// Voice recording - NOT YET IMPLEMENTED on backend
function startVoiceRecording() {
  // TODO: Connect to /api/process-audio when implemented
}

function toggleDeepThinking() {
  // Client-side state management
}
```

### Voice Recording (`voice-recorder.js`)
**Features**:
- Hold-to-record functionality
- Real-time recording timer
- Audio chunk collection and blob creation
- Automatic transcription sending to backend
- Visual feedback during recording

### File Upload (`file-upload.js`)
**Features**:
- Drag and drop interface
- Image preview functionality
- Progress tracking
- File type validation
- Error handling and user feedback

---

## 🎨 Animation & Interaction Details

### Home Page Animations
```css
/* Feature card entrance animation */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Electric pulse effect for background */
@keyframes pulseEffect {
  0% { opacity: 0.05; }
  50% { opacity: 0.15; }
  100% { opacity: 0.08; }
}

/* Feature card hover states */
.feature-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3), 
              0 0 20px rgba(30, 184, 255, 0.4);
  border-color: rgba(30, 184, 255, 0.7);
}
```

### Chat Interface Interactions
```css
/* Message hover effects */
.message:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(20, 157, 234, 0.25);
}

/* Floating input focus states */
.input-container:focus-within {
  border-color: var(--electric-blue);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4),
              0 0 15px rgba(20, 157, 234, 0.3);
}
```

---

## 🔄 Cache Busting & Performance

### Implementation Details
The current system uses dynamic cache busting with timestamps:
```javascript
// Cache buster function (to implement in Next.js)
function get_cache_buster() {
  return "1.0.0." + Date.now();
}

// Applied to all static assets
<link rel="stylesheet" href={`/css/style.css?v=${cache_buster}`} />
<script src={`/js/main.js?v=${cache_buster}`}></script>
```

---

## 📋 Form Components & Validation

### Key Form Elements
**Login Form**:
- Email field with validation
- Password field
- Ultra-visible remember me checkbox (red background, large text)
- Submit button with gradient styling

**Registration Form**:
- Email, username, full name, password, confirm password
- Optional company access code
- Real-time validation feedback
- Error message display

**Chat Input**:
- Auto-resizing textarea
- Send button with disabled state management
- File upload button
- Voice recording button
- Deep thinking toggle

---

## 🚀 Responsive Design Breakpoints

### Mobile Considerations
```css
@media (max-width: 768px) {
  .feature-grid {
    grid-template-columns: 1fr; /* Single column on mobile */
  }
  
  .chat-sidebar {
    position: fixed; /* Overlay on mobile */
    transform: translateX(-100%); /* Hidden by default */
  }
  
  .construction-container {
    padding: 1.5rem; /* Reduced padding */
  }
}
```

---

## 🔌 Integration Points

### Backend API Endpoints

**Authentication APIs**:
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login (returns JWT)
- `POST /api/auth/logout` - User logout
- `POST /api/auth/reset-password-request` - Password reset request

**Health Check**:
- `GET /api/healthz` - Health check endpoint

**Notes CRUD** (⚠️ **Production Warning**: Currently in-memory only `_FAKE_DB`. Move to Redis or Postgres before launch):
- `GET /api/notes` - List all notes
- `GET /api/notes/:id` - Get specific note
- `POST /api/notes` - Create new note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note

**File Upload APIs**:
- `POST /api/upload` - File upload endpoint

**Chat APIs** (TODO: Implementation pending):
- `GET /api/chat/sessions` - Get all chat sessions
- `POST /api/chat/sessions` - Create new session
- `GET /api/chat/sessions/:id` - Get specific session
- `DELETE /api/chat/sessions/:id` - Delete session
- `PUT /api/chat/sessions/:id/rename` - Rename session
- `POST /api/chat/sessions/bulk-delete` - Delete multiple sessions
- `POST /api/chat/message` - Send message

**Audio/Voice APIs** (NOT YET IMPLEMENTED — backend work required):
- `POST /api/process-audio` - Voice message processing
- `POST /api/voice-transcription` - Voice transcription

**Server-Sent Events** (TODO):
```javascript
// TODO: Implement createEventSource() that connects to
// `${NEXT_PUBLIC_BACKEND_URL}/api/stream/chat/<session_id>`
// once the Flask SSE endpoint is finished.
```

---

## 📝 Environment Variables & Configuration

### Required Environment Variables

**Next.js Frontend (.env.local)**:
```env
# Backend API Base URL
NEXT_PUBLIC_BACKEND_URL=https://<your-render-service>.onrender.com

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key

# Company Theme Colors (optional)
NEXT_PUBLIC_COMPANY_PRIMARY_COLOR=#e67e22
NEXT_PUBLIC_COMPANY_SECONDARY_COLOR=#34495e
```

**Flask Backend Environment Variables**:
```env
# Database
DATABASE_URL=postgresql://...

# Session Management  
SESSION_SECRET=your-secret-key

# CORS Configuration
FRONTEND_VERCEL_URL=https://your-vercel-app.vercel.app

# External API Keys (as needed)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=...
AZURE_COGNITIVE_SERVICES_KEY=...
```

**⚠️ Important**: All API calls should use `process.env.NEXT_PUBLIC_BACKEND_URL + <endpoint>` format.

---

## 🔐 NextAuth.js Configuration

### Setup NextAuth with Credentials Provider

Create `pages/api/auth/[...nextauth].js` (or `app/api/auth/[...nextauth]/route.js` for App Router):

```javascript
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export default NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          })

          const data = await response.json()

          if (response.ok && data.access_token) {
            return {
              id: data.user?.id || data.email,
              email: data.user?.email || credentials.email,
              name: data.user?.fullname || data.user?.username,
              accessToken: data.access_token,
            }
          }
          return null
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken
      return session
    }
  },
  pages: {
    signIn: '/login',
    signUp: '/register',
  },
  session: {
    strategy: 'jwt',
  },
})
```

### API Client with Auth Headers

Create a custom fetch wrapper that automatically includes the JWT token:

```javascript
// lib/api.js
import { getSession } from 'next-auth/react'

export async function apiRequest(endpoint, options = {}) {
  const session = await getSession()
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  // Add Authorization header if we have a token
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${endpoint}`, config)
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`)
  }
  
  return response.json()
}

// Usage examples:
// const notes = await apiRequest('/api/notes')
// const newNote = await apiRequest('/api/notes', { method: 'POST', body: JSON.stringify(noteData) })
```

### React Query Integration

```javascript
// lib/hooks/useAuth.js
import { useSession } from 'next-auth/react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { apiRequest } from '../api'

export function useNotes() {
  return useQuery({
    queryKey: ['notes'],
    queryFn: () => apiRequest('/api/notes'),
  })
}

export function useCreateNote() {
  return useMutation({
    mutationFn: (noteData) => apiRequest('/api/notes', {
      method: 'POST',
      body: JSON.stringify(noteData),
    }),
  })
}
```

---

## 🎯 Migration Priority Order

### Phase 1: Core Layout & Navigation
1. Create base layout component with header/footer
2. Implement authentication layouts
3. Set up theme system with CSS variables
4. Create navigation components

### Phase 2: Authentication Flow
1. Login page with ultra-visible remember me
2. Registration page
3. Password reset pages
4. 404 error page

### Phase 3: Home & Landing
1. Home page with feature cards
2. Animated owl icons and background effects
3. Responsive grid layout

### Phase 4: Chat Interface
1. Sidebar with session management
2. Message display and input
3. Voice recording functionality
4. File upload system
5. Projects integration

### Phase 5: Construction Management
1. Integration cards layout
2. Feature lists and animations
3. External link handling

### Phase 6: Polish & Performance
1. All animations and micro-interactions
2. Mobile responsiveness
3. Performance optimization
4. Cache busting implementation

---

## 🚀 Deployment Instructions

### Frontend Deployment (Vercel)
1. Deploy your Next.js app to Vercel
2. Set environment variables in Vercel dashboard:
   ```env
   NEXT_PUBLIC_BACKEND_URL=https://<your-render-service>.onrender.com
   NEXTAUTH_URL=https://<your-vercel-app>.vercel.app
   NEXTAUTH_SECRET=your-production-secret
   ```

### Backend CORS Configuration
**⚠️ Critical**: After deploying to Vercel, you must update your Flask backend's CORS settings:

1. Set `FRONTEND_VERCEL_URL=https://<your-vercel-app>.vercel.app` in your Render environment variables
2. **Trigger a backend redeploy** on Render so the CORS configuration picks up the new frontend origin
3. Verify CORS is working by checking browser network tab for any CORS errors

### Deployment Checklist
- [ ] Frontend deployed to Vercel
- [ ] Environment variables set in Vercel
- [ ] `FRONTEND_VERCEL_URL` updated in Render
- [ ] Backend redeployed on Render
- [ ] CORS working (no console errors)
- [ ] Authentication flow working end-to-end
- [ ] API calls connecting successfully

---

## ✅ Verification Checklist

When migration is complete, verify:

**Visual Design**:
- [ ] Electric blue theme throughout
- [ ] Owl icons with glow effects
- [ ] Watercolor backgrounds where specified
- [ ] Proper typography (Poppins, Montserrat, Inter)
- [ ] Consistent spacing and sizing

**Functionality**:
- [ ] Chat session management
- [ ] Real-time messaging
- [ ] Voice recording (hold-to-record)
- [ ] File upload with drag-drop
- [ ] Project management integration
- [ ] Authentication flow
- [ ] Responsive mobile design

**Performance**:
- [ ] Cache busting on assets
- [ ] Optimized images
- [ ] Smooth animations
- [ ] Fast page loads

**Accessibility**:
- [ ] Proper ARIA labels
- [ ] Keyboard navigation
- [ ] Color contrast compliance
- [ ] Screen reader compatibility

---

This migration guide contains every detail needed to recreate your front-end. Each component, style, animation, and interaction has been documented with specific implementation details for React/Next.js with Tailwind CSS and shadcn/ui components.

## 📦 Package.json Configuration

```json
{
  "name": "ohmni-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15.3.3",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "@tanstack/react-query": "^5.80.7",
    "@tanstack/react-query-devtools": "^5.80.7",
    "zustand": "^4.5.2",
    "next-auth": "^5.0.0-beta.3",
    "next-pwa": "^5.6.0",
    "@radix-ui/react-slot": "^1.0.2",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.0.0",
    "@types/react": "^19.1.8",
    "@types/react-dom": "^19.1.6",
    "eslint-config-next": "^15.3.3"
  },
  "devDependencies": {
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.31",
    "eslint": "^8.56.0",
    "prettier": "^3.1.0"
  }
}
```