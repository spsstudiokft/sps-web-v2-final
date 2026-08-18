# SPS Studio - Architecture & Structure Documentation

This document serves as the source of truth for the SPS Studio project's architecture, folder structure, and core flows. It provides guidance for future updates and feature extensions.

## 1. High-Level Architecture

The project is a mono-repo built with Vercel deployment in mind. It consists of:
- **Frontend**: A React SPA powered by Vite, handling both the public-facing portfolio website and the protected Admin Panel.
- **Backend**: An Express.js server providing RESTful APIs for public content fetching, authentication, and admin content management.
- **Database**: Turso (LibSQL / SQLite) for low-latency queries, suitable for serverless environments.

## 2. Directory Structure

```text
/
├── api/
│   └── index.ts               # Vercel serverless entry point for Express API
├── docs/
│   └── website-structure.md   # This documentation file
├── src/
│   ├── components/            # Reusable React components
│   │   ├── admin/             # Admin-specific components (Sidebar, PageHeader, forms)
│   │   ├── public/            # Public site components (Hero, Portfolio, Contact, etc.)
│   │   └── ui/                # Shared UI primitives (Button, Input, Card, Label)
│   ├── contexts/
│   │   └── AuthContext.tsx    # JWT-based Authentication state
│   ├── lib/
│   │   ├── types.ts           # Shared TypeScript interfaces & types
│   │   └── utils.ts           # Utility functions (e.g., Tailwind class merging `cn()`)
│   ├── pages/                 # Full-page route components
│   │   ├── admin/             # Protected admin views (Dashboard, Settings, Portfolio, Contacts)
│   │   ├── AdminLogin.tsx     # Admin login screen
│   │   ├── AdminSetup.tsx     # First-time setup wizard
│   │   └── PublicHome.tsx     # Main public portfolio entry
│   ├── server/
│   │   └── api.ts             # Express REST API routes and business logic
│   ├── App.tsx                # Main React router and layout configuration
│   ├── db.ts                  # Database client initialization and schema migrations
│   └── index.css              # Global styles and Tailwind configuration
├── package.json               # Dependencies and build scripts
├── server.ts                  # Local development server entry point
├── vercel.json                # Vercel rewrite configuration for full-stack routing
└── vite.config.ts             # Vite bundler configuration
```

## 3. Core Flows

### Authentication & First-Time Setup
- **First-Time Setup**: If the `users` table is empty, requests to the backend return `isSetupComplete: false`. The frontend redirects visitors from `/admin` to `/admin/setup`. The user provides an email and password to create the first admin account and seed default site settings.
- **Login Flow**: Admins authenticate via `/admin/login`. The server verifies the bcrypt-hashed password and returns a signed JWT.
- **Auth Context**: The frontend `AuthContext` stores the JWT in `localStorage` and attaches it to authenticated requests via the `Authorization` header.

### Content Management Flow
- **Data Flow**: Admins manage content (Settings, Portfolio, Contacts) via protected `src/pages/admin/*` views. Data changes are pushed to `/api/admin/*` endpoints, which write to Turso.
- **Public Fetching**: The `PublicHome` and its subcomponents (Hero, Portfolio, etc.) fetch published data via unauthenticated `/api/public/*` endpoints.

### Database (Turso / LibSQL)
The `src/db.ts` file manages the connection. During local dev, it uses a local file (`local.db`); on Vercel, it uses the remote Turso instance.
- `users`: Hashed admin credentials.
- `settings`: Key-value store for dynamic site copy (Hero text, contact info).
- `portfolio_items`: JSON-based image arrays and metadata for gallery projects.
- `categories`: Taxonomies for portfolio filtering.
- `contact_submissions`: Inquiries submitted via the public contact form.

## 4. Development Guidance & Extension Rules

- **Shared UI Primitives**: Always reuse components from `src/components/ui/` (e.g., `Button`, `Input`, `Card`). If a new generalized UI element is needed, add it there, not inside a specific page.
- **Component Modularity**: Keep page components thin. Extract complex sections into domain-specific components (e.g., `<PortfolioForm />` in `src/components/admin/`).
- **Styling**: Stick to Tailwind utility classes. Do not create new `.css` files unless absolutely necessary. Use `cn()` from `src/lib/utils.ts` for dynamic class merging.
- **Routing**: `App.tsx` handles frontend routing. Protected routes must be wrapped with the `<ProtectedRoute>` wrapper to enforce authentication.
- **Backend Endpoint Additions**: When adding new functionality, place public reads in `/api/public/*` and administrative commands in `/api/admin/*` with JWT middleware verification.
- **Database Schema Updates**: Add new table creation queries into the `setupDatabase` routine within `src/db.ts` to ensure automatic seeding.
