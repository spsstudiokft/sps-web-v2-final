export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiOperation = {
  method: ApiMethod | string;
  path: string;
  summary: string;
  access: "Public" | "Authenticated" | "Admin" | "Superadmin" | "Client" | "Property client";
};

export type ApiSection = {
  id: string;
  title: string;
  description: string;
  operations: ApiOperation[];
};

// This is a safe operational reference: it documents route families and their
// supported actions, never credentials, internal implementation details, or secrets.
export const apiDocumentation: ApiSection[] = [
  {
    id: "system",
    title: "System & setup",
    description: "Health checks, first-run initialization and operational status.",
    operations: [
      { method: "GET", path: "/api/health", summary: "Returns the service health status.", access: "Public" },
      { method: "GET", path: "/api/health/lou", summary: "Returns the unlinked Lou Goossens JSON tribute payload.", access: "Public" },
      { method: "GET", path: "/api/status-summary", summary: "Returns the public operational status summary.", access: "Public" },
      { method: "GET", path: "/api/setup/status", summary: "Checks whether initial application setup is required.", access: "Public" },
      { method: "POST", path: "/api/setup", summary: "Completes the initial application and administrator setup.", access: "Public" },
      { method: "GET", path: "/api/development/demo-accounts", summary: "Returns local-development demo account data when development mode allows it.", access: "Public" },
    ],
  },
  {
    id: "authentication",
    title: "Authentication & security",
    description: "Login, registration, invitations, recovery, magic links and two-factor authentication.",
    operations: [
      { method: "POST", path: "/api/auth/login", summary: "Authenticates an admin or staff user and starts a session.", access: "Public" },
      { method: "POST", path: "/api/auth/register", summary: "Creates a client account when registration is enabled.", access: "Public" },
      { method: "POST", path: "/api/auth/magic-link", summary: "Requests a passwordless sign-in link.", access: "Public" },
      { method: "POST", path: "/api/auth/verify-magic-link", summary: "Verifies a passwordless sign-in token.", access: "Public" },
      { method: "POST", path: "/api/auth/forgot-password", summary: "Requests a password reset token.", access: "Public" },
      { method: "POST", path: "/api/auth/reset-password", summary: "Sets a new password from a valid reset token.", access: "Public" },
      { method: "GET", path: "/api/invitations/validate", summary: "Validates an invitation token before acceptance.", access: "Public" },
      { method: "POST", path: "/api/invitations/accept", summary: "Accepts an invitation and creates or activates the account.", access: "Public" },
      { method: "GET|PUT|POST", path: "/api/auth/2fa/*", summary: "Reads and changes 2FA status, login mode, TOTP and email factors.", access: "Authenticated" },
      { method: "POST", path: "/api/property-auth/login", summary: "Authenticates a property-listing account.", access: "Public" },
    ],
  },
  {
    id: "public-content",
    title: "Public website data",
    description: "Read-only website content, configuration, SEO, listings and contact-form services.",
    operations: [
      { method: "GET", path: "/api/public/bootstrap", summary: "Returns the public application bootstrap payload.", access: "Public" },
      { method: "GET", path: "/api/public/settings", summary: "Returns approved public site settings.", access: "Public" },
      { method: "GET", path: "/api/public/translations[?locale]", summary: "Returns UI translation dictionaries or one locale.", access: "Public" },
      { method: "GET", path: "/api/public/services|pricing|extra-services|fee-rules", summary: "Returns published services, plans, add-ons and fee rules.", access: "Public" },
      { method: "GET", path: "/api/public/portfolio[/:slug]", summary: "Returns published portfolio entries and individual details.", access: "Public" },
      { method: "GET", path: "/api/public/properties[/:id]", summary: "Returns public property listings and details.", access: "Public" },
      { method: "GET", path: "/api/public/faqs|faq-categories|testimonials|categories", summary: "Returns published support and marketing content.", access: "Public" },
      { method: "GET", path: "/api/public/social-links[/*]|info-bar|legal-documents|cookie-catalog", summary: "Returns public navigation, announcement, legal and cookie data.", access: "Public" },
      { method: "GET", path: "/api/public/sitemap.xml|robots.txt|seo-home", summary: "Provides crawler-oriented sitemap, robots and semantic homepage output.", access: "Public" },
      { method: "GET", path: "/api/public/open-source[/:repository]", summary: "Returns published open-source repository metadata and documents.", access: "Public" },
      { method: "POST", path: "/api/public/contact", summary: "Creates an inquiry, validates pricing and coupons, and triggers configured notifications.", access: "Public" },
      { method: "GET", path: "/api/public/bonus-codes/preview", summary: "Previews valid discount-code effects for the inquiry calculator.", access: "Public" },
    ],
  },
  {
    id: "campaigns",
    title: "Campaigns, coupons & public push",
    description: "Campaign landing pages, coupon issuance, exit intent and anonymous maintenance subscriptions.",
    operations: [
      { method: "GET|POST", path: "/api/public/campaigns/:slug", summary: "Reads a public campaign and submits a campaign lead.", access: "Public" },
      { method: "GET|POST", path: "/api/public/exit-coupons/*", summary: "Reads exit-coupon configuration and records a coupon claim.", access: "Public" },
      { method: "GET|POST", path: "/api/public/push/*", summary: "Reads the public VAPID key and manages anonymous push subscriptions.", access: "Public" },
      { method: "GET", path: "/api/public/referrals/program-status|validate-code/:code", summary: "Returns referral-program state and validates a referral code.", access: "Public" },
      { method: "GET|POST|PUT|PATCH|DELETE", path: "/api/admin/campaigns/*", summary: "Creates, edits, activates, reviews submissions for, and deletes campaigns.", access: "Admin" },
      { method: "GET|PUT", path: "/api/admin/exit-coupons/config", summary: "Reads or changes exit-coupon configuration.", access: "Admin" },
      { method: "GET", path: "/api/admin/exit-coupons/issues", summary: "Lists issued exit coupons and their tracking data.", access: "Admin" },
    ],
  },
  {
    id: "client-portal",
    title: "Client portal",
    description: "Client-facing account data, project delivery, feedback, referrals, invoices and properties.",
    operations: [
      { method: "GET|PATCH|PUT", path: "/api/client/settings/*", summary: "Reads and updates client profile and password settings.", access: "Client" },
      { method: "GET", path: "/api/client/dashboard|projects|invoices|properties|links", summary: "Returns client-scoped dashboard and account resources.", access: "Client" },
      { method: "POST", path: "/api/client/projects/:projectId/galleries/*", summary: "Unlocks, previews, resends PINs for, or downloads client gallery assets.", access: "Client" },
      { method: "GET|POST", path: "/api/client/feedback/conversations[/:id/messages]", summary: "Lists, creates and exchanges client feedback messages.", access: "Client" },
      { method: "POST", path: "/api/client/bonus-codes/redeem|rewards/redeem", summary: "Redeems available bonus codes or referral rewards.", access: "Client" },
      { method: "GET|POST", path: "/api/client/referrals/*", summary: "Reads referral profile and sends an invitation email.", access: "Client" },
      { method: "GET|POST", path: "/api/client/push/*", summary: "Reads VAPID configuration and manages client push subscriptions.", access: "Client" },
      { method: "GET|PATCH", path: "/api/client/notifications/*", summary: "Lists and marks client portal notifications as read.", access: "Client" },
      { method: "GET", path: "/api/client/sps-raw/*", summary: "Checks VIP access and returns the SPS RAW feed when permitted.", access: "Client" },
    ],
  },
  {
    id: "admin-core",
    title: "Admin workspace & content",
    description: "Core administration, CMS resources, operational settings and team access.",
    operations: [
      { method: "GET|POST|PUT|PATCH|DELETE", path: "/api/admin/services|pricing|extra-services|fee-rules", summary: "Manages service catalog, pricing plans, bundles, extras and fee rules.", access: "Admin" },
      { method: "GET|POST|PUT|PATCH|DELETE", path: "/api/admin/portfolio|projects|customers|clients|leads", summary: "Manages portfolio, projects, customer records, client accounts and leads.", access: "Admin" },
      { method: "GET|POST|PUT|PATCH|DELETE", path: "/api/admin/properties|property-listings", summary: "Manages properties, listing accounts, access and published listing data.", access: "Admin" },
      { method: "GET|POST|PUT|PATCH|DELETE", path: "/api/admin/faqs|faq-categories|testimonials|visual-ideas", summary: "Manages public knowledge-base and marketing content.", access: "Admin" },
      { method: "GET|PUT", path: "/api/admin/settings|legal-documents|cookie-catalog|social-links", summary: "Reads and updates public site settings, legal content, cookies and social navigation.", access: "Admin" },
      { method: "GET|POST|PUT|PATCH|DELETE", path: "/api/admin/team|users|role-menu-permissions", summary: "Manages team accounts, roles, access and menu permissions.", access: "Admin" },
      { method: "GET|POST", path: "/api/admin/translations/*", summary: "Lists, edits, scans and synchronizes application translations.", access: "Admin" },
      { method: "GET|POST|PUT|PATCH", path: "/api/admin/notifications|public-notifications|push/*", summary: "Manages portal notifications, broadcasts and admin push subscriptions.", access: "Admin" },
    ],
  },
  {
    id: "admin-finance",
    title: "Finance, invoices & referrals",
    description: "Budgeting, invoices, payments, Stripe sandbox configuration and referral administration.",
    operations: [
      { method: "GET|POST|PUT|DELETE", path: "/api/admin/budgets/*", summary: "Manages budget entries, summaries, settings and audit logs.", access: "Admin" },
      { method: "GET|POST|PUT|PATCH|DELETE", path: "/api/admin/invoices/*", summary: "Creates, sends, updates, archives and records payments for invoices.", access: "Admin" },
      { method: "GET|PUT", path: "/api/admin/invoices/stripe-settings", summary: "Reads or changes the Stripe invoice-payment configuration.", access: "Admin" },
      { method: "GET|POST|PUT|DELETE", path: "/api/admin/payment-requests/*", summary: "Manages payment requests, categories, review state and attachments.", access: "Admin" },
      { method: "GET|POST|PUT|PATCH|DELETE", path: "/api/admin/referrals/*", summary: "Manages referral relationships, custom codes, rewards, tiers and settings.", access: "Admin" },
      { method: "GET|POST", path: "/api/public/invoices/:id/*", summary: "Reads a public invoice and initiates or confirms Stripe checkout payment.", access: "Public" },
    ],
  },
  {
    id: "admin-integrations",
    title: "Media, integrations & internal tools",
    description: "Media pipeline, Appwrite, Synology, analytics, WhatsApp, email and internal collaboration.",
    operations: [
      { method: "GET|POST|PUT|DELETE", path: "/api/admin/media-library/*", summary: "Browses, uploads, organizes and shares managed media assets.", access: "Admin" },
      { method: "POST", path: "/api/admin/media/upload/*", summary: "Runs direct, multipart, chunked and Appwrite-backed media upload workflows.", access: "Admin" },
      { method: "GET|POST", path: "/api/admin/storage/*", summary: "Diagnoses and tests configured storage integrations.", access: "Admin" },
      { method: "GET|PUT", path: "/api/admin/whatsapp-settings|open-source-settings", summary: "Reads and updates superadmin-managed public integration settings.", access: "Superadmin" },
      { method: "GET", path: "/api/admin/google-analytics|exchange-rates", summary: "Returns embedded analytics and configured currency exchange rates.", access: "Admin" },
      { method: "GET|POST", path: "/api/admin/workspace-chat/*|client-feedback/*", summary: "Lists and exchanges internal-staff and client-feedback chat messages.", access: "Admin" },
      { method: "GET|POST|PATCH|DELETE", path: "/api/admin/sps-raw/*", summary: "Manages SPS RAW availability and post publication.", access: "Admin" },
      { method: "GET|POST|PUT", path: "/api/admin/marketing-emails/*", summary: "Manages email templates, delivery configuration and marketing-email history.", access: "Admin" },
    ],
  },
];

export const apiAccessExplanation: Record<ApiOperation["access"], string> = {
  Public: "No account token is required. Abuse protection may still apply.",
  Authenticated: "A valid authenticated session token is required.",
  Admin: "A valid administrator session and the relevant menu permission are required.",
  Superadmin: "A valid superadmin session is required.",
  Client: "A valid client-portal session is required.",
  "Property client": "A valid property-listing account session is required.",
};
