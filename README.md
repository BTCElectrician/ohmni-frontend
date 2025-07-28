# Ohmni Frontend

A modern, responsive frontend application for ABCO AI's document intelligence platform, designed for field electricians with offline-capable features.

## Features

- **Modern UI** with Tailwind CSS and custom electric blue theme
- **Responsive design** optimized for mobile field work
- **TypeScript support** with strict type checking
- **Next.js 15.3.3** with App Router
- **React Query** for data fetching and caching
- **Zustand** for state management
- **NextAuth 5.0.0-beta.28** for authentication
- **Real-time chat** with SSE streaming
- **Vision/Image analysis** with AI-powered document processing
- **NEC code search** with Azure AI Search integration
- **Deep Reasoning & Nuclear modes** for advanced AI analysis
- **Resizable chat sidebar** with React Resizable Panels
- **Offline-capable** workflow with React Query hydration

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm 9.x or later

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/ohmni-frontend.git
cd ohmni-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Configure your backend URL and NextAuth secret
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
ohmni-frontend/
├── app/                    # Next.js app directory (App Router)
│   ├── api/               # API routes
│   │   └── auth/          # NextAuth configuration
│   ├── chat/              # Chat interface pages
│   ├── components/        # App-specific components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions
│   ├── login/             # Authentication pages
│   ├── register/          # Registration pages
│   └── types/             # TypeScript types
├── components/            # Shared UI components
│   ├── chat/             # Chat interface components
│   ├── debug/            # Development tools
│   ├── home/             # Landing page components
│   └── ui/               # Reusable UI components
├── services/             # API service layer
│   ├── chatService.ts    # Chat session management
│   └── visionService.ts  # Image analysis pipeline
├── store/                # Zustand state management
│   └── chatStore.ts      # Chat state and offline queue
├── lib/                  # Core utilities
│   └── api/              # API client utilities
├── types/                # Global TypeScript types
└── docs/                 # Project documentation
```

## Design System

The project uses a comprehensive design system with the following features:

- **Custom color palette** with electric blue theme (`--electric-blue`, `--deep-navy`, `--surface-elevated`)
- **Typography system** with Poppins, Inter, and Montserrat fonts
- **Tailwind CSS** with custom animations (`tailwindcss-animate`)
- **Reusable component classes** with class-variance-authority
- **Custom animations** and transitions for smooth UX
- **Responsive design utilities** optimized for mobile field work
- **Dark theme** with CSS custom properties

## Authentication

The application uses **NextAuth 5.0.0-beta.28** with the App Router pattern:

- **Credentials provider** for email/password authentication
- **JWT strategy** with custom callbacks for access token management
- **App Router configuration** in `auth.ts` with handlers export
- **Custom session types** with access token integration
- **Protected routes** with middleware-based authentication

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:prod` - Build with environment validation skipped
- `npm run start` - Start production server
- `npm run lint` - Run ESLint with zero warnings policy
- `npm run type-check` - Run TypeScript compilation check
- `npm run test` - Run tests (placeholder until test framework is added)

### Code Style

- Follow TypeScript best practices with strict type checking
- Use functional components with hooks
- Follow the project's component structure
- Use Tailwind CSS for styling with custom design tokens
- Write meaningful commit messages
- **Zero ESLint warnings** enforced in CI/CD

### Quick Decisions

- New API endpoint? → `app/api/` or `services/` for the client
- New reusable UI? → `components/ui/`
- Page-specific component? → `app/[page]/components/`
- Business logic? → Backend API (never in frontend)
- Auth logic? → `lib/auth/` or use existing hooks

### Don't Do This

- ❌ Direct database connections in frontend
- ❌ Business logic in components
- ❌ `any` types in TypeScript
- ❌ Storing sensitive data in Zustand

### Key Dependencies

- **Next.js 15.3.3** - React framework with App Router
- **React 19.1.0** - Latest React with concurrent features
- **NextAuth 5.0.0-beta.28** - Authentication framework
- **@tanstack/react-query** - Data fetching and caching
- **Zustand** - Lightweight state management
- **React Resizable Panels** - Resizable sidebar components
- **Lucide React** - Icon library
- **React Hot Toast** - Toast notifications
- **React Markdown** - Markdown rendering with syntax highlighting
- **Tailwind CSS** - Utility-first CSS framework

### CI/CD

This project uses **npm** as the standard package manager. All CI/CD workflows are configured to use npm commands.

For deployment guidelines and requirements, see our [CI/CD Deployment Checklist](.cursor/rules/ci-deploy.mdc).

The project includes automated CI checks that run on every push and pull request:
- **Linting** with zero warnings policy
- **TypeScript compilation** check
- **Production build** validation
- **Basic smoke tests**

### 🗂️ Folder Cheat-Sheet
| Path | What lives here | Typical changes |
|------|-----------------|-----------------|
| app/ | Next.js App Router pages and API routes | When adding new pages, API endpoints, or app-specific components |
| components/ | Shared UI components organized by feature | When creating reusable components or updating component architecture |
| services/ | API service layer for backend communication | When adding new API integrations or modifying data fetching logic |
| store/ | Zustand state management and offline queue | When updating global state, adding new stores, or modifying offline behavior |
| lib/ | Core utilities, API client, and helper functions | When adding utility functions, API wrappers, or authentication helpers |
| types/ | Global TypeScript type definitions | When adding new interfaces, API response types, or extending existing types |
| docs/ | Project documentation and technical guides | When updating deployment guides, refactor documentation, or adding setup instructions |
| public/ | Static assets like images and icons | When adding new images, icons, or other static files |
| .github/ | CI/CD workflows and GitHub configuration | When updating build processes, deployment rules, or GitHub-specific settings |
| .cursor/ | Cursor IDE rules and development guidelines | When updating coding standards, linting rules, or development practices |
| .vscode/ | VS Code workspace settings and extensions | When configuring editor settings or adding recommended extensions |

**Usage**: Add new rows when creating top-level directories for new features or architectural changes. Update existing rows when folder purposes change or when reorganizing the project structure.

## License

This project is proprietary and confidential. 