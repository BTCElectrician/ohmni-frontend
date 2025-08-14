# Frontend Context

## Directory Structure

```
├── Frontend Context/
│   ├── types/api.ts
│   ├── lib/
│   │   └── files.ts
│   ├── .env.example
│   └── tailwind.config.js
```

## File Descriptions

### `types/api.ts`
TypeScript type definitions for API interfaces and data structures used throughout the frontend application.

### `lib/files.ts`
Helper functions for file handling and URL normalization:
- `toAttachmentFromFilePath`: Converts backend file paths to frontend attachment objects
- Handles both absolute URLs and relative paths
- Integrates with Next.js image configuration

### `.env.example`
Example environment variables file that serves as a template for local development configuration. Contains placeholder values for required environment variables.

**Note:** Currently, no `.env` file exists in the project. A `.env.example` file should be created with the following typical environment variables:

```bash
# Backend API Configuration
NEXT_PUBLIC_BACKEND_URL=http://localhost:5001

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Azure Services (if applicable)
AZURE_OPENAI_API_KEY=your-azure-openai-key
AZURE_SEARCH_ENDPOINT=your-azure-search-endpoint
AZURE_SEARCH_KEY=your-azure-search-key

# Other Configuration
NODE_ENV=development
```

**Port Configuration Summary:**
- **Frontend (Next.js):** `localhost:3000` (default Next.js dev server)
- **Backend (Flask):** `localhost:5001` (local development)
- **Backend (Production):** `localhost:5000` (Gunicorn/Render deployment)

**Backend Integration Details:**
- **CORS:** Configured for `localhost:3000` with credentials support
- **Authentication:** JWT tokens via `Authorization: Bearer <token>` header
- **API Structure:** `/api/*` endpoints (no version prefix)
- **File Upload:** 20MB limit, supports images, documents, audio, archives
  - Images are displayed via `file_path` from backend or local blob URLs
  - Backend returns `file_path` in `/uploads/**` directory
  - Frontend configured to handle both local and production image URLs
- **Health Check:** `GET /health` or `GET /api/health`

### `tailwind.config.js`
Tailwind CSS configuration file that defines custom design tokens, theme extensions, and utility class configurations for the application's styling system.

## Usage

This directory contains essential configuration and type definition files that establish the foundation for the frontend application's development environment and type safety.
