# SPS Studio — Real Estate Visual Marketing CMS & Client Portal

A production-ready, high-performance CMS, public showcase portfolio, and dedicated client portal built for real estate and architectural photography studios. Powered by **React 19**, **Vite**, **Tailwind CSS v4**, **Express**, and **Turso (LibSQL SQLite)**.

---

## 🌟 Overview & Architecture

SPS Studio is an all-in-one studio management platform designed for architectural photographers, media production teams, and real estate marketing agencies. It pairs an ultra-fast public portfolio with an admin management console and a secure client portal for project deliverables, asset downloads, and transactional communication.

### High-Level Architecture
- **Frontend SPA**: React 19 single-page app bundled with Vite, styled with Tailwind CSS v4 and Motion animations.
- **AERO/GLOW Design System**: Responsive blue-white ambient lighting, section-aware imagery, accessible light/dark palettes, frosted-glass cards, modals, navigation, authentication, and client/admin workspaces.
- **Backend API**: Express REST API with modular public, authentication, admin, client, billing, media, and automation routers.
- **Vercel Runtime**: Domain-isolated Vercel Functions for public content, authentication, administration, client delivery, budgets, invoices, payment requests, referrals, public billing links, and system health, with shared application bootstrap and function-specific duration settings.
- **Database Layer**: LibSQL / Turso SQLite with local fallback (`local.db`) for lightweight development and edge/serverless scaling in production.
- **Media Engine**: Cloudflare R2 multipart and direct browser-to-Appwrite uploads, structured filenames, automatic sub-10 MB JPEG derivatives, video thumbnails, watermark rendering, storage lifecycle cleanup, and ZIP delivery.
- **Email Engine**: Resend API integration with transactional email templates, live multi-device visual previewer, and token interpolation.

---

## 🚀 Key Features

### 📸 Public Portfolio & Studio Showcase
- **Hero & Featured Gallery**: Spotlight high-value architectural shoots and property portfolios using optimized display assets instead of full-resolution masters.
- **Category Filter & Search**: Interactive filtering across photography, aerial drone, 3D virtual tours, and cinematic video.
- **Lightbox & Gallery Viewer**: Full-screen high-resolution media previews with responsive touch navigation.
- **Services & Pricing Showcase**: Dynamic tier cards with package feature lists, pricing models, and instant booking CTAs.
- **Collapsible FAQs & Social Hub**: Grouped questions with instant search, plus verified studio social media links.
- **Interactive Contact & Booking**: Guided lead capture with required property city, optional address, travel-distance pricing from Hódmezővásárhely, package/add-on calculator, structured estimate persistence, admin alert, and client confirmation.
- **Consent & Legal Modals**: Cookie-gated inquiry form plus database-backed Privacy Policy, Terms, Cookie Policy, and Legal Notice documents rendered from formatted admin content.
- **Adaptive Navigation**: Services and Portfolio links disappear automatically when no published content exists.
- **Mixed Portfolio Conveyor**: Gallery media is randomized across marquee rows and avoids adjacent images from the same portfolio whenever possible.
- **Four Media Rows**: Separate randomized rows for standard photography, drone video, interior walkthrough video, and drone photography, using an alternating left/right motion pattern.

### 🔐 Client Portal & Project Management
- **Passwordless Magic Link & Password Sign-In**: Secure client authentication via email magic link or traditional credentials.
- **Self-Service Client Registration**: Onboarding flow with client profile setup and welcome emails.
- **Interactive Project Tracker**: Milestone progression (Booked → Scheduled → Shooting → Editing → Delivered).
- **PIN-Protected Deliverable Galleries**: Individual and multi-select ZIP downloads with rotating four-digit PINs, forgotten-PIN email recovery, locked-preview watermarking, and right-click-safe delivery.
- **Original & Optimized Downloads**: Separate full-resolution and optimized-image categories with identical authorization and watermark rules.
- **Video & Image Previewing**: Generated video frame thumbnails, project preview images, attached-gallery counts, and full-size media modals.
- **Direct Studio Messaging**: In-portal project inquiries and revision requests linked directly to the studio admin.

### 🛠️ Admin Management Dashboard
- **Portfolio & Gallery CMS**: Multi-image uploads, drag-and-drop sorting (`@dnd-kit`), localized names/categories, automatic optimized-media creation, category management, and keyword tagging.
- **Section Media Management**: Public-section images and backgrounds can be replaced from the admin panel without code changes.
- **Projects & Client Accounts**: Create client accounts, link projects, update delivery milestones, and upload final deliverables.
- **Services & Pricing Manager**: Manage service offerings, highlight featured tiers, and update pricing schedules.
- **FAQ & Knowledge Base Manager**: Organize questions into custom categories with quick reordering.
- **Inquiry & Lead CRM**: Status tracking (`new`, `contacted`, `converted`, `archived`) with contact details and notes.
- **Social Media Link Manager**: Manage brand handles across 20+ platforms with FontAwesome and Lucide icons.
- **Legal Document Editor**: Full-page WYSIWYG editing for all public legal documents with formatted modal rendering.
- **Team & Invitation Management**: Team grouping, role-aware members, invitation resend/revoke, and verification-code-protected direct admin onboarding.
- **Marketing Email Workspace**: Create multiple reusable marketing templates and manually dispatch them to chosen recipients.

### 💳 Finance, Invoices & Payment Requests
- **Budget Manager**: Categorized income/expense entries, audit history, status management, summaries, and shared default-currency configuration.
- **Client-Linked Invoices**: Email-based client association, public printable invoices, payment confirmation, receipts, and paid-record portal visibility.
- **Paid Invoice Archival**: Confirmed invoices cannot receive duplicate payment requests and can be archived manually by administrators.
- **Payment Request Workflow**: Superadmin approval, denial, hold, editable categories, linked budget/invoice records, and status-specific email notifications.
- **Currency-Aware Dashboards**: Budget, invoice/payment, and payment-request totals use the configured default currency.

### ✉️ Resend Email Engine & Template Editor
- **Configurable Sender Profiles**: Set custom `from_name`, `from_email`, `reply_to`, and admin alert addresses.
- **Email Header Branding**: Transactional and marketing email layouts can use the uploaded header logo, logo with studio name, or studio name only, with the website header mode as the initial fallback.
- **Transactional Template Catalog**: Pre-built system templates covering:
  - Password Reset & Account Recovery (`password_reset`)
  - Magic Link Passwordless Sign-In (`magic_link_login`)
  - Magic Link Account Registration (`magic_link_signup`)
  - Client Welcome & Portal Activation (`account_verification`)
  - Project Milestone & Delivery Updates (`project_update`)
  - Gallery Ready & Media Notification (`gallery_ready`)
  - Gallery PIN Recovery (`gallery_pin_recovery`)
  - Google Review Request & Reminders (`google_review_request`)
  - Admin Alert on New Inquiry (`inquiry_received`)
  - Client Inquiry Confirmation Auto-Reply (`inquiry_confirmation`)
  - Admin Account Verification Code (`admin_account_verification_code`)
  - Invoice Payment Request & Receipt (`invoice_payment_request`, `invoice_payment_receipt`)
  - Payment Request Approval/Approved/Denied/Hold templates
  - System Diagnostic & Deliverability Test (`test_email`)
- **Visual Template Editor**: Full-page HTML and plain-text editing, editable header/footer text and token defaults, token insertion palette, desktop/mobile/plain-text preview, and direct test dispatch.
- **Inquiry Estimate Tokens**: Contact emails expose package, verified base price, selected items, calculated fees, currency, and estimated total in HTML and text formats.
- **Canonical Links**: Transactional action URLs are generated from `APP_URL`, not the transient serverless request hostname.
- **Review Automation**: Review requests are scheduled after gallery delivery and stop automatically after the tracked Google review link is clicked.
- **Delivery Activity Logs**: Real-time delivery tracking with message IDs and status filters.

### 🌐 Multi-Language (i18n) & AI Translation
- **5 Core Languages**: English (`en`), Hungarian (`hu`), German (`de`), Spanish (`es`), French (`fr`).
- **AI-Powered Translation**: Automated string translation using Google Gemini API.
- **Custom Overrides**: Granular manual translation management from the admin dashboard.
- **Coverage Auditing**: Public, admin, finance, email, cookie, and client-portal keys can be audited and synchronized with database translations.
- **Localization Groups**: Translation-manager entries are grouped by their owning interface for easier editing.

### 🎨 Branding, Theming & Granular SEO
- **Adaptive Logo System**: Header and footer logo management with distinct light and dark theme assets.
- **Independent Theme Modes**: The public website/client experience and admin dashboard keep separate light/dark preferences and apply their own theme variables when navigating between areas.
- **Favicon & Brand Identity**: Custom browser favicon, studio metadata, and copyright configuration.
- **SEO & Social Share Cards**: Open Graph (OG) tags, Twitter cards, meta descriptions, canonical URLs, and Google Search Console verification.

### ⚡ Public Performance & Accessibility

- **Batched Public Bootstrap**: Settings, portfolio, services, pricing, add-ons, fee rules, and FAQs load through one LibSQL/Turso batch instead of repeated component-level queries.
- **Layered Caching**: Short-lived server memory, Vercel CDN `stale-while-revalidate`, browser HTTP, and session caches reduce repeat database work.
- **Fast Vercel Cold Starts**: Read-only public functions skip schema migration work during cold starts, while admin and write-capable functions retain full database initialization.
- **Immutable Build Assets**: Fingerprinted Vite assets receive a one-year immutable cache policy, and public image assets use browser/CDN revalidation windows.
- **Route-Level Code Splitting**: Admin, finance, authentication, and client-portal pages are loaded only when their routes are opened; public visitors do not download those modules during startup.
- **Mobile Touch Portfolio**: Mobile portfolio rows are static by default and remain horizontally touch-scrollable, avoiding continuous marquee work and duplicate media cards on handheld devices.
- **Progressive Mobile Media**: Mobile gallery rows mount cards in small batches and assign image/video-poster sources only near the viewport, preventing decode bursts when the portfolio section enters the screen.
- **Adaptive Image Delivery**: Public portfolio cards and lightboxes use responsive `srcset` candidates backed by Appwrite's cached JPEG preview transformations (with Unsplash URL support), so each screen downloads an appropriately sized display asset without proxying bytes through Vercel; failed transformations fall back to the stored optimized image.
- **Stored Card Derivatives**: New image uploads also create a dedicated 840 px JPEG card asset in object storage; cards use this file directly, while existing media uses a standardized, preconnected 640 px Appwrite preview path until regenerated.
- **Progressive Gallery Loading**: The lightbox immediately displays the stored card thumbnail as a blurred placeholder and crossfades to the larger optimized image after it has decoded.
- **Adaptive Low-End Mode**: Low-memory/low-core devices, constrained connections, data-saver mode, and reduced-motion preferences receive fewer blur/3D effects and deferred off-screen rendering.
- **Critical Media Loading**: The hero background is preloaded while optimized portfolio derivatives are prefetched only when device and connection conditions allow it.
- **Accessible Light Theme**: Public light-mode body, muted, primary, accent, placeholder, border, and focus colors use higher-contrast values, including explicit text colors over photographic sections.

---

## 🛠️ Tech Stack & Dependencies

| Category | Technology |
|---|---|
| **Frontend Framework** | React 19, React Router v7 |
| **Styling & Animation** | Tailwind CSS v4, Motion (`motion/react`) |
| **Icons & UI** | Lucide React, FontAwesome SVG Icons, `@dnd-kit` |
| **Backend & Server** | Express 4, Node.js (ESM / CommonJS bundle) |
| **Database** | LibSQL (`@libsql/client`), Turso SQLite |
| **Storage Providers** | AWS S3 SDK (Cloudflare R2), Appwrite Web SDK + `node-appwrite` |
| **Email Service** | Resend (`resend`) |
| **Security & Auth** | JSON Web Tokens (`jsonwebtoken`), Bcrypt (`bcryptjs`) |
| **Build & Tooling** | Vite 6, ESBuild, TypeScript 5.8, TSX |

---

## ⚙️ Installation & Local Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm 10** (the repository and Vercel deployment use `package-lock.json`, `npm ci`, and `npm run build`)

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

# Turso SQLite Database (the legacy TURSO_* aliases are also accepted)
DATABASE_URL=file:local.db
DATABASE_AUTH_TOKEN=

# JWT Authentication Secret
JWT_SECRET=your_super_secret_jwt_key_change_in_production

# Google Gemini API (Optional - for AI translations)
GEMINI_API_KEY=

# Media Storage Configuration: "r2", "appwrite", or "local"
MEDIA_PROVIDER=appwrite

# Appwrite direct browser upload
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=
APPWRITE_API_KEY=
APPWRITE_BUCKET_ID=

# R2 alternative
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
- The information bar, incident widget, contact cards, pricing cards, legal modals, cookie banner, dropdowns, and both authenticated workspaces use the same frosted-glass surface and constrained shine treatment.
- Portfolio conveyors use rounded edge masks, pause the hovered row, show idle video frames, and start video playback only on hover to reduce memory use.
- Mobile Hero and Contact layouts constrain intrinsic grid/form widths, wrap long localized content, and remain within narrow viewports.
- FAQ and portfolio category labels resolve localized JSON fields before rendering, so serialized translation objects never appear in the public interface.

---

## Gallery Delivery Model

1. An administrator links one or more portfolio galleries to a client project.
2. The gallery-ready email sends the project link and a random four-digit download PIN.
3. Before PIN verification, preview and downloaded images are rendered with a continuous “Courtesy of SPS Studio” watermark.
4. A verified PIN unlocks original and optimized deliverables for the project gallery.
5. Clients may download one item or select multiple items for server-generated ZIP delivery.
6. Requesting a forgotten PIN sends the editable recovery template and rotates the PIN immediately.

Large file bytes do not pass through Vercel during normal Appwrite upload. The browser receives a short-lived server-created upload session, transfers directly to the configured bucket, and the API registers the completed object and metadata. Image uploads automatically create a high-quality JPEG display/download derivative below 10 MB while retaining the original master. Removing gallery media or deleting a portfolio also removes its original and derived objects from the configured bucket, including recognizable legacy Appwrite objects that predate upload tracking.

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
4. When using Appwrite, configure the bucket permissions/CORS and the alphanumeric server-upload label expected by the direct-upload session.
5. Deploy — Vercel uses the routes in `vercel.json` to create separate domain functions.

| Function | Routes | Default maximum duration |
|---|---|---:|
| `api/public.ts` | Public content, contact form, travel calculator | 60 s |
| `api/auth.ts` | Authentication, registration, invitations, setup | 60 s |
| `api/admin.ts` | Admin CMS, teams, email, media control | 300 s |
| `api/client.ts` | Client portal, gallery authorization and downloads | 300 s |
| `api/budgets.ts` | Budget records, settings and audit logs | 120 s |
| `api/invoices.ts` | Administrative invoice workflows | 120 s |
| `api/payment-requests.ts` | Payment requests, uploads and approvals | 300 s |
| `api/referrals.ts` | Administrative referral program workflows | 120 s |
| `api/public-invoices.ts` | Public invoice views and payment intent notifications | 60 s |
| `api/public-referrals.ts` | Public referral-code validation | 60 s |
| `api/system.ts` | Health and external status summary | 30 s |

Every active API prefix has an explicit rewrite. The previous all-in-one `api/index.ts` compatibility Function was removed so Vercel no longer packages the complete backend a second time.

`APP_URL` must contain the canonical public origin (for example `https://studio.example.com`) without an application path. It is used for magic links, invitations, invoice links, gallery links, review tracking, and all other transactional email actions.

---

## 🔒 Security & Data Privacy

- **Stateless Authentication**: Signed JWT tokens stored in browser local storage and validated with server-side middleware.
- **Password Hashing**: Strong one-way password hashing via `bcryptjs` with salt rounds.
- **Direct Object-Storage Uploads**: Large Appwrite and R2 uploads bypass the Vercel request body and read-only deployment filesystem.
- **Gallery Access Control**: Rotating PINs, attempt tracking, authorization checks, watermarking, and ownership validation protect client deliverables.
- **Transactional Sanitization**: HTML escaping and script-tag sanitization on customized email templates.
- **Admin Verification Codes**: Direct password account creation for invited administrators requires a random, expiring, single-use email code.

---

## 📄 License

This project is proprietary software developed for **SPS Studio**. All rights reserved.
