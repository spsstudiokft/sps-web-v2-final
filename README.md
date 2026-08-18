# SPS Studio — Real Estate Visual Marketing CMS & Client Portal

A production-ready, high-performance CMS, public showcase portfolio, and dedicated client portal built for real estate and architectural photography studios. Powered by **React 19**, **Vite**, **Tailwind CSS v4**, **Express**, and **Turso (LibSQL SQLite)**.

---

## 🌟 Overview & Architecture

SPS Studio is an all-in-one studio management platform designed for architectural photographers, media production teams, and real estate marketing agencies. It pairs an ultra-fast public portfolio with an admin management console and a secure client portal for project deliverables, asset downloads, and transactional communication.

### High-Level Architecture
- **Frontend SPA**: React 19 single-page app bundled with Vite, styled with Tailwind CSS v4 and Motion animations.
- **AERO/GLOW Design System**: Responsive blue-white ambient lighting, section-aware imagery, accessible light/dark palettes, frosted-glass cards, modals, navigation, authentication, and client/admin workspaces.
- **Backend API**: Express RESTful API with modular route handlers (`/api/admin/*`, `/api/client/*`, `/api/*`).
- **Database Layer**: LibSQL / Turso SQLite with local fallback (`local.db`) for lightweight development and edge/serverless scaling in production.
- **Media Engine**: Modular object storage supporting Cloudflare R2 (S3-compatible via `@aws-sdk/client-s3`) and Appwrite Storage with secure multipart uploads.
- **Email Engine**: Resend API integration with transactional email templates, live multi-device visual previewer, and token interpolation.
- **AI Services**: Google Gemini (`@google/genai`) for automated multi-language translation and localized content generation.

---

## 🚀 Key Features

### 📸 Public Portfolio & Studio Showcase
- **Hero & Featured Gallery**: Spotlight high-value architectural shoots and property portfolios.
- **Category Filter & Search**: Interactive filtering across photography, aerial drone, 3D virtual tours, and cinematic video.
- **Lightbox & Gallery Viewer**: Full-screen high-resolution media previews with responsive touch navigation.
- **Services & Pricing Showcase**: Dynamic tier cards with package feature lists, pricing models, and instant booking CTAs.
- **Collapsible FAQs & Social Hub**: Grouped questions with instant search, plus verified studio social media links.
- **Interactive Contact & Booking**: Lead capture form with automatic admin notifications and client auto-reply confirmations.

### 🔐 Client Portal & Project Management
- **Passwordless Magic Link & Password Sign-In**: Secure client authentication via email magic link or traditional credentials.
- **Self-Service Client Registration**: Onboarding flow with client profile setup and welcome emails.
- **Interactive Project Tracker**: Milestone progression (Booked → Scheduled → Shooting → Editing → Delivered).
- **Deliverable Galleries & Asset Downloads**: High-resolution image/video galleries with direct full-resolution download links.
- **Direct Studio Messaging**: In-portal project inquiries and revision requests linked directly to the studio admin.

### 🛠️ Admin Management Dashboard
- **Portfolio & Gallery CMS**: Multi-image uploads, drag-and-drop sorting (`@dnd-kit`), category management, and keyword tagging.
- **Projects & Client Accounts**: Create client accounts, link projects, update delivery milestones, and upload final deliverables.
- **Services & Pricing Manager**: Manage service offerings, highlight featured tiers, and update pricing schedules.
- **FAQ & Knowledge Base Manager**: Organize questions into custom categories with quick reordering.
- **Inquiry & Lead CRM**: Status tracking (`new`, `contacted`, `converted`, `archived`) with contact details and notes.
- **Social Media Link Manager**: Manage brand handles across 20+ platforms with FontAwesome and Lucide icons.

### ✉️ Resend Email Engine & Template Editor
- **Configurable Sender Profiles**: Set custom `from_name`, `from_email`, `reply_to`, and admin alert addresses.
- **Transactional Template Catalog**: Pre-built system templates covering:
  - Password Reset & Account Recovery (`password_reset`)
  - Magic Link Passwordless Sign-In (`magic_link_login`)
  - Magic Link Account Registration (`magic_link_signup`)
  - Client Welcome & Portal Activation (`account_verification`)
  - Project Milestone & Delivery Updates (`project_update`)
  - Gallery Ready & Media Notification (`gallery_ready`)
  - Admin Alert on New Inquiry (`inquiry_received`)
  - Client Inquiry Confirmation Auto-Reply (`inquiry_confirmation`)
  - System Diagnostic & Deliverability Test (`test_email`)
- **Visual Template Editor**: Dual-format HTML and plain-text editors, token insertion palette (`{{user_name}}`, `{{project_name}}`, `{{studio_name}}`), live responsive preview (Desktop, Mobile 375px, Plain-Text), and direct test email dispatch.
- **Delivery Activity Logs**: Real-time delivery tracking with message IDs and status filters.

### 🌐 Multi-Language (i18n) & AI Translation
- **5 Core Languages**: English (`en`), Hungarian (`hu`), German (`de`), Spanish (`es`), French (`fr`).
- **AI-Powered Translation**: Automated string translation using Google Gemini API.
- **Custom Overrides**: Granular manual translation management from the admin dashboard.

### 🎨 Branding, Theming & Granular SEO
- **Adaptive Logo System**: Header and footer logo management with distinct light and dark theme assets.
- **Favicon & Brand Identity**: Custom browser favicon, studio metadata, and copyright configuration.
- **SEO & Social Share Cards**: Open Graph (OG) tags, Twitter cards, meta descriptions, canonical URLs, and Google Search Console verification.

---

## 🛠️ Tech Stack & Dependencies

| Category | Technology |
|---|---|
| **Frontend Framework** | React 19, React Router v7 |
| **Styling & Animation** | Tailwind CSS v4, Motion (`motion/react`) |
| **Icons & UI** | Lucide React, FontAwesome SVG Icons, `@dnd-kit` |
| **Backend & Server** | Express 4, Node.js (ESM / CommonJS bundle) |
| **Database** | LibSQL (`@libsql/client`), Turso SQLite |
| **Storage Providers** | AWS S3 SDK (`@aws-sdk/client-s3` for Cloudflare R2), Appwrite (`node-appwrite`) |
| **Email Service** | Resend (`resend`) |
| **AI Integration** | Google GenAI SDK (`@google/genai`) |
| **Security & Auth** | JSON Web Tokens (`jsonwebtoken`), Bcrypt (`bcryptjs`) |
| **Build & Tooling** | Vite 6, ESBuild, TypeScript 5.8, TSX |

---

## ⚙️ Installation & Local Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **pnpm** / **yarn**

### 2. Clone and Install Dependencies
```bash
git clone https://github.com/your-org/sps-studio.git
cd sps-studio
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory (refer to `.env.example`):

```env
# Application URL (used for email links and CORS)
APP_URL=http://localhost:3000

# Optional local server port (defaults to 3000)
PORT=3000

# Turso SQLite Database (use local SQLite for development)
TURSO_DATABASE_URL=file:local.db
TURSO_AUTH_TOKEN=

# JWT Authentication Secret
JWT_SECRET=your_super_secret_jwt_key_change_in_production

# Google Gemini API (Optional - for AI translations)
GEMINI_API_KEY=

# Media Storage Configuration (Optional: "r2" or "appwrite")
MEDIA_PROVIDER=r2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_DOMAIN=

# Resend Email Integration (Optional - simulation mode used if omitted)
RESEND_API_KEY=
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_FROM_NAME=SPS Studio
RESEND_REPLY_TO=contact@spsstudio.com
```

### 4. Start Development Server
```bash
npm run dev
```
The server starts on `http://localhost:3000` by default. Set `PORT` when that port is occupied, for example `$env:PORT='3003'; npm run dev` in PowerShell.

### 5. Initial First-Time Setup Wizard
1. Open your browser and navigate to `http://localhost:3000`.
2. If no admin account exists, the application will automatically route you to the **Admin Setup Wizard** (`/admin/setup`).
3. Create your primary administrator account (Email & Password).
4. Log in at `/admin/login` to access the full CMS, configure branding, and publish portfolio galleries.

---

## 📖 Available Scripts

- `npm run dev`: Boots the full-stack application in development mode with `tsx`.
- `npm run build`: Compiles the React frontend via `vite build` and bundles `server.ts` into `dist/server.cjs` via `esbuild`.
- `npm run start`: Starts the production CommonJS server from `dist/server.cjs`.
- `npm run migrate:translations`: Seeds and synchronizes static localization dictionaries with the database.
- `npm run audit:i18n`: Audits translation-key coverage across the application.

---

## Visual System

- Public sections use locally stored, photography-themed background images and a smooth ambient side glow that adapts to the currently visible section.
- Admin and client cards, grids, tables, sidebars, forms, authentication screens, and modal surfaces share the same frosted-glass language.
- Light and dark modes use separate surface and text values to preserve readable WCAG-oriented contrast.
- Motion is reduced automatically when the operating system requests reduced animation.
- Source image masters are kept in `png-k/`; web-served copies live in `public/images/`.

---

## 🚢 Production Deployment

### Deployment with Cloud Run or Docker
The project compiles into a single, self-contained server file (`dist/server.cjs`) and static assets (`dist/`):
```bash
npm run build
npm run start
```

### Deployment with Vercel or Serverless Platforms
1. Create a remote database on [Turso](https://turso.tech) and obtain your `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.
2. Connect your Git repository to Vercel.
3. Configure the required environment variables (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET`, `APP_URL`, `RESEND_API_KEY`, etc.).
4. Deploy — the build script will automatically prepare the static bundle and server entry points.

---

## 🔒 Security & Data Privacy

- **Stateless Authentication**: Signed JWT tokens stored in browser local storage and validated with server-side middleware.
- **Password Hashing**: Strong one-way password hashing via `bcryptjs` with salt rounds.
- **Strict File Upload Verification**: In-memory file buffer processing with allowed MIME-type whitelisting (`image/jpeg`, `image/png`, `image/webp`, `image/svg+xml`, `image/x-icon`).
- **Transactional Sanitization**: HTML escaping and script-tag sanitization on customized email templates.

---

## 📄 License

This project is proprietary software developed for **SPS Studio**. All rights reserved.
