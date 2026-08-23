# Frontend

Next.js App Router frontend for Macro & Market.

## Responsibilities

- Render application UI
- Manage client-side state and interactions
- Call backend APIs through typed service modules

## Environment

- Copy `.env.example` to `.env.local`
- Set `NEXT_PUBLIC_API_BASE_URL` to your backend URL (default: `http://127.0.0.1:8000`)

## Folder conventions

- `app/` route entrypoints and layouts
- `components/` reusable UI components
- `lib/` framework-agnostic helper functions
- `hooks/` custom React hooks
- `services/` API client modules
- `types/` shared TypeScript types and interfaces
- `styles/` global styles and design tokens
