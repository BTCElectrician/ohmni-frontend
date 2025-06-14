- /abco-ai-frontend/**

# Cursor Rules for Ohmni Frontend

## 🎯 Project Structure Rules

### Directory Organization
- Keep all components in `/components` directory
- Group related components in subdirectories (e.g., `/components/chat`, `/components/auth`)
- Store all API-related code in `/services/api`
- Keep types in `/types` directory
- Store hooks in `/hooks` directory
- Keep utility functions in `/lib` directory

### File Naming Conventions
- Use PascalCase for React components (e.g., `ChatMessage.tsx`)
- Use camelCase for utility files (e.g., `apiClient.ts`)
- Use kebab-case for page routes (e.g., `chat-history.tsx`)
- Add `.test.ts` or `.test.tsx` suffix for test files

## 💻 Code Style Rules

### TypeScript
- Always use TypeScript for new files
- Define interfaces for all API responses
- Use strict type checking
- Avoid using `any` type
- Use proper type imports/exports

### React Components
- Use functional components with hooks
- Implement proper prop typing
- Use React Query for server state
- Use Zustand for client state
- Follow the container/presenter pattern when needed

### Styling
- Use Tailwind CSS for styling
- Follow the shadcn/ui component patterns
- Keep styles close to components
- Use CSS modules for complex styling
- Follow mobile-first responsive design

## 🔒 Security Rules

### Authentication
- Never store tokens in localStorage
- Use NextAuth.js for authentication
- Implement proper token refresh logic
- Use protected routes for authenticated content
- Handle authentication errors gracefully

### API Calls
- Never expose API keys in frontend code
- Use environment variables for sensitive data
- Implement proper error handling
- Use proper CORS settings
- Validate all user inputs

## 🚀 Performance Rules

### Code Optimization
- Implement proper code splitting
- Use dynamic imports for large components
- Optimize images using Next.js Image component
- Implement proper caching strategies
- Use React.memo for expensive renders

### PWA Features
- Implement proper service worker
- Handle offline scenarios
- Use proper caching strategies
- Implement background sync
- Handle push notifications properly

## 📝 Documentation Rules

### Code Documentation
- Document complex functions with JSDoc
- Add comments for non-obvious code
- Keep documentation up to date
- Document component props
- Document API endpoints

### Git Commit Rules
- Use conventional commit messages
- Reference issue numbers in commits
- Keep commits focused and atomic
- Write clear commit messages
- Follow the commit message format:
  ```
  type(scope): description
  
  [optional body]
  [optional footer]
  ```

## 🧪 Testing Rules

### Unit Tests
- Write tests for critical components
- Test error scenarios
- Mock API calls
- Test authentication flows
- Test PWA features

### Integration Tests
- Test component interactions
- Test API integration
- Test authentication flows
- Test offline scenarios
- Test mobile responsiveness

## 🔄 State Management Rules

### Server State
- Use React Query for server state
- Implement proper caching
- Handle loading states
- Handle error states
- Implement proper invalidation

### Client State
- Use Zustand for client state
- Keep state minimal
- Implement proper persistence
- Handle state updates properly
- Use proper selectors

## 📱 Mobile Rules

### Responsive Design
- Test on multiple devices
- Use proper viewport meta tags
- Implement proper touch targets
- Handle orientation changes
- Test offline functionality

### PWA Features
- Implement proper manifest
- Handle app installation
- Implement proper caching
- Handle push notifications
- Test offline functionality

## 🚨 Error Handling Rules

### API Errors
- Handle network errors
- Handle authentication errors
- Handle validation errors
- Show proper error messages
- Implement retry logic

### UI Errors
- Show proper loading states
- Show proper error states
- Handle edge cases
- Implement proper fallbacks
- Test error scenarios

## 🔍 Code Review Rules

### Review Process
- Review for security issues
- Review for performance issues
- Review for accessibility
- Review for mobile responsiveness
- Review for PWA features

### Quality Checks
- Check for TypeScript errors
- Check for linting errors
- Check for test coverage
- Check for documentation
- Check for performance issues - /abco-ai-frontend/**
