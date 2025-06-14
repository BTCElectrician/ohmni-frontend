# Phase 1: Project Setup & Initial Configuration

## Overview
This phase sets up the Next.js project foundation with TypeScript, Tailwind CSS, and essential dependencies.

---

## Expected Dependency Versions

After setup, your package.json should have these versions:
- **Next.js:** ^15.3.3
- **React:** ^19.1.0
- **React DOM:** ^19.1.0
- **@tanstack/react-query:** ^5.80.7
- **@tanstack/react-query-devtools:** ^5.80.7
- **Zustand:** ^4.5.2
- **TypeScript:** ^5.x
- **Tailwind CSS:** ^3.4.1

---

## Step 1.1: Create the Next.js Project

Open your terminal and run these commands:

```bash
# Create the project with TypeScript and Tailwind CSS
npx create-next-app@latest abco-ai-frontend --typescript --tailwind --app --use-npm

# Navigate into the project
cd abco-ai-frontend

# Open in your code editor (VS Code example)
code .
```

When prompted during setup:
- ✅ Would you like to use TypeScript? **Yes**
- ✅ Would you like to use ESLint? **Yes**
- ✅ Would you like to use Tailwind CSS? **Yes**
- ✅ Would you like to use `src/` directory? **No**
- ✅ Would you like to use App Router? **Yes**
- ✅ Would you like to customize the default import alias? **No**

---

## Step 1.2: Install Essential Dependencies

```bash
# Core dependencies for our app
npm install @tanstack/react-query@^5.80.7 @tanstack/react-query-devtools@^5.80.7 zustand@^4.5.2 next-auth@4.24.7 next-pwa@5.6.0

# UI components library
npm install @radix-ui/react-slot@1.1.0 class-variance-authority@0.7.0 clsx@2.1.1 tailwind-merge@2.4.0

# Icons
npm install lucide-react@0.400.0

# Additional utilities
npm install axios@1.7.2 date-fns@3.6.0
```

**Note:** Next.js 15.3.3, React 19.1.0, React DOM 19.1.0, TypeScript 5.x, and Tailwind CSS 3.4.1 will be automatically installed with the correct versions when you create the Next.js project in Step 1.1.

---

## Step 1.3: Clean Up Default Files

Delete these default Next.js files (we'll create our own):
- `app/page.tsx`
- `app/globals.css` (we'll replace this)
- `public/next.svg`
- `public/vercel.svg`

---

## Expected Dependency Versions

After setup, your package.json should have these versions:
- **Next.js:** ^15.3.3
- **React:** ^19.1.0
- **React DOM:** ^19.1.0
- **@tanstack/react-query:** ^5.80.7
- **@tanstack/react-query-devtools:** ^5.80.7
- **Zustand:** ^4.5.2
- **TypeScript:** ^5.x
- **Tailwind CSS:** ^3.4.1

---

## Verification Checklist

After completing Phase 1, you should have:
- [ ] A new Next.js project created with TypeScript and Tailwind
- [ ] All essential dependencies installed
- [ ] Default files cleaned up
- [ ] Project opens in your code editor
- [ ] Verify correct versions with `npm list` (Next.js 15.3.3, React 19.1.0, @tanstack/react-query 5.80.7, etc.)

---

## Next Phase
Once Phase 1 is complete, proceed to Phase 2: Environment Setup & Core Dependencies