# Ohmni Frontend

A modern, responsive frontend application for ABCO AI's document intelligence platform.

## Features

- Modern UI with Tailwind CSS
- Responsive design
- TypeScript support
- Next.js 15
- React Query for data fetching
- Zustand for state management

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

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
ohmni-frontend/
├── app/                # Next.js app directory
│   ├── components/    # React components
│   ├── lib/          # Utility functions
│   ├── types/        # TypeScript types
│   └── hooks/        # Custom React hooks
├── public/           # Static assets
└── styles/          # Global styles
```

## Design System

The project uses a custom design system with the following features:

- Custom color palette with electric blue theme
- Typography system with Poppins, Inter, and Montserrat fonts
- Reusable component classes
- Custom animations and transitions
- Responsive design utilities

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint with max warnings enforcement
- `npm run type-check` - Run TypeScript compilation check
- `npm run test` - Run tests (placeholder until test framework is added)

### Code Style

- Follow TypeScript best practices
- Use functional components with hooks
- Follow the project's component structure
- Use Tailwind CSS for styling
- Write meaningful commit messages

### CI/CD

This project uses **npm** as the standard package manager (not pnpm or yarn). All CI/CD workflows are configured to use npm commands.

For deployment guidelines and requirements, see our [CI/CD Deployment Checklist](.cursor/rules/ci-deploy.mdc).

The project includes automated CI checks that run on every push and pull request:
- Linting with zero warnings policy
- TypeScript compilation check
- Production build validation
- Basic smoke tests

## License

This project is proprietary and confidential. 