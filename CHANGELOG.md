# Modification Log

## 2026-08-26

### Ingatlanhirdetési és welcome e-mail sablonok

- Added five built-in, editable Hungarian marketing email templates for new property announcements, price updates, viewing invitations, new property seekers, and new sellers/partners.
- Made all built-in templates available from the manual Marketing Emails send flow; custom copies remain removable while factory templates remain safely restorable.
- Updated the manual sender to render the selected template's own variables with examples, and to fall back to the recipient's email prefix when no greeting name is entered.
- Grouped the editable welcome templates separately in the Marketing Emails admin page so they can be found and manually sent without searching through listing campaigns.
- Added a toggleable automatic client-welcome email setting, enabled by default; it controls post-registration welcome delivery without disabling essential magic-link sign-in emails.
- Added the editable Client Portal Welcome template for first-time magic-link client registrations, alongside the existing password-registration welcome template.

### Internet Archive integration

- Added an opt-in Internet Archive / Wayback Machine integration for public property listings.
- When enabled, published listings are submitted after publication and subsequent public updates; local or otherwise non-public URLs are never sent.
- Recorded snapshot-request success or failure in the related Property activity log.

### Admin account settings

- Added a dedicated Admin → Saját fiók page with editable display name, account email visibility, and secure current-password-verified password changes.
- Added account endpoints that correctly update the active admin credential for both standard admin accounts and dual client-plus-admin accounts.
- Fixed the admin account endpoints being registered before the admin router instance was initialized, which caused server error responses instead of JSON.

### Invoicing

- Made the invoice client-account filter searchable by client email, with account names available as autocomplete hints.

### Theme templates

- Reframed the theme editor around curated style templates and tucked the granular color, typography, and UI controls behind an explicit advanced-editor action.
- Added Aero Glass, Electric Glow, and Warm Estate templates alongside the existing SPS visual presets.

### Portal invitations

- Added active portal-invitation status and expiry visibility to customer rows.
- Prevented single and bulk portal invitation dispatch while a customer's latest unused invitation remains valid; a new invite is allowed after use or expiry.
- Fixed the customer-list and invitation checks for installations with an older `magic_links` schema by deriving the active invitation from its expiry timestamp instead of relying on an optional creation-time column.

### Vision section

- Made the public Vision headline responsive to the entered text length, retaining the large display treatment for short copy while reducing long headlines to a balanced, readable size.

### Cookie consent and registry

- Added an administrator-managed cookie and browser-storage catalog, seeded with the currently used consent, language, theme, and public-cache entries.
- Added per-entry consent classification (essential, necessary-only, or full-consent) and made the visitor popup show each active entry's purpose, storage, provider, retention, and required/optional status.
- Enforced the visitor decision technically: optional preference, analytics, and marketing browser-storage keys are cleared on withdrawal; public language/theme persistence is prevented without preference consent; and a shared consent-gated script loader is available for future analytics or marketing integrations.
- Applied the same preference-consent check to the early HTML theme bootstrap so it cannot read a public theme preference before the application starts.
- Moved the Google Analytics and Ahrefs scripts out of `index.html`; they now load only after analytics consent and are removed with their known client-side storage when that consent is withdrawn.
- Moved detailed cookie preferences out of the compact banner into a dedicated modal, with draft selections applied only when the visitor saves them.

### Local demo administrator

- Added an idempotent local-only demo superadmin account when the application uses a file-based development database.
- Displayed the demo credentials and a one-click form-fill action on the admin login page only in local demo mode; remote Turso and production environments return no test-account data.
- Added English, Hungarian, German, Spanish, and French translations for the local test-account panel.
- Used the authenticated local browser audit to find and localize residual referral conversion-rate and team invitation empty-state copy that the source-only audit had missed.

### Database translation refresh

- Prevented browser and Vercel edge caches from serving stale public translation dictionaries after database edits.
- Rotated the client translation-cache namespace while preserving fast cached startup, then forced a fresh database response on every page load and manual translation reload.

### Admin email-settings localization

- Replaced 75 unique static email-settings strings with translation keys across templates, sender configuration, test delivery, DNS guidance, logs, and quick previews.
- Completed five-language coverage for the Resend status header, template navigation, catalog search, loading/empty states, variables, sender and domain configuration, live tests, DNS guidance, logs, quick previews, editor actions, confirmations, and runtime feedback.
- Added targeted local-database synchronization for the consolidated email-settings translation set.

### Admin site-settings modal localization

- Completed five-language localization for general settings, storage providers, Appwrite diagnostics, HTTP 413 infrastructure guidance, Cloudflare R2, contact forms, Hero/About content, and Google-review automation.
- Removed 57 inline English translation fallbacks, localized runtime diagnostic/save failures, and added database synchronization for the consolidated settings-modal translation set.

## 2026-08-25

### Admin site-settings modal localization groundwork

- Replaced 76 unique static settings-modal strings with translation keys across general settings, storage diagnostics, contact content, hero/about content, and review automation.
- Completed five-language coverage for general settings, branding/SEO/contact navigation, footer metadata, version labels, and social-link guidance; remaining sections are being migrated incrementally.

### Admin team-management localization groundwork

- Replaced 101 unique static team-management strings with translation keys across invitations, members, teams, template previews, and account dialogs.
- Completed five-language coverage for the overview, invitation table, teams, members, template preview, invitation/account dialogs, member editor, confirmations, validation, and runtime feedback.
- Added database synchronization for the consolidated team-management translation set.

### Admin referrals page localization groundwork

- Replaced 121 unique static referral-management strings with translation keys across the overview, logs, tiers, rewards, settings, and reward dialogs.
- Completed the English, Hungarian, German, Spanish, and French dictionaries for the overview, logs, tiers, rewards, settings, editor dialogs, confirmations, and runtime feedback.
- Added database synchronization for the consolidated referrals-page translation set and throttled/key-extraction modes to the localization helper.

### Admin portfolio page localization

- Completed five-language coverage for portfolio tabs, category management, search, confirmations, table headings, empty states, success feedback, and API failure messages.
- Added localized unnamed-category handling and database synchronization for the portfolio page translation set.

### Admin portfolio editor modal localization

- Localized portfolio details, gallery cover, SEO preview, counters, validation, upload progress and failure states across all five supported languages.
- Added database synchronization for the portfolio editor modal translation set and removed its remaining inline interface copy.

### Admin embedded-video modal localization

- Localized video-category assignment, URL detection, previews, poster uploads, metadata placeholders, validation, and fallback titles across all five supported languages.
- Added accessible labels for the modal close action, players, posters, and thumbnails.

### Admin gallery media-card localization

- Localized filename validation, optimized-file controls, media typing, metadata editing, fallback descriptions, and video preview labels across all five supported languages.
- Added accessible labels for media previews and icon-only actions, and localized storage filename synchronization errors.

### Admin image gallery manager localization

- Localized gallery filters, upload guidance, filename restructuring, video-poster generation, bulk media typing, pagination, feedback, and empty states across all five supported languages.
- Replaced mixed Hungarian and English runtime processing messages with parameterized translation keys.

### Admin portfolio sortable-card localization

- Localized portfolio-card media badges, tooltips, fallback labels, publishing controls, and quick-edit actions across all five supported languages.
- Added accessible labels to icon-only save, cancel, and delete actions and corrected translated category rendering.

### Admin portfolio gallery localization

- Completed five-language localization for gallery counters, media and status filters, bulk actions, selection counts, and empty states.
- Replaced the remaining inline selection and empty-result messages with database-backed translation keys.

### Admin portfolio category modal localization

- Completed five-language localization for the portfolio-category editor, including headers, hierarchy fields, slug guidance, validation, accessibility labels, and actions.
- Corrected parent-category rendering so translated content is displayed directly instead of being treated as another translation key.

### Admin social links page localization

- Localized the social-link tree controls, tooltips, group states, empty/loading states, success feedback, and API error fallbacks across all five supported languages.
- Added a targeted local-database synchronization script for the page translation set.

### Admin social node modal localization

- Localized the social-node editor's placeholders, accessibility label, preview defaults, platform presets, suggested badges, group icons, and color preset tooltips across all five supported languages.
- Added a targeted local-database synchronization script for the modal translation set.

### Admin extra service modal localization

- Replaced static add-on modal copy, option lists, role labels, icon tooltips, placeholders, hints, and runtime save errors with translation keys.
- Added reviewed English, Hungarian, German, Spanish, and French translations plus a targeted local-database synchronization script.

### Fee rule editor localization

- Localized the fee-rule editor's calculation types, distance tiers, thresholds, plan restrictions, simulator, status controls, help text, placeholders, and validation feedback across all five supported languages.

### Pricing fees tab localization

- Completed five-language localization for fee-rule filters, types, badges, calculations, status actions, notifications, empty states, and deletion confirmation.

### Pricing add-ons tab localization

- Completed five-language localization for the Pricing add-ons tab, including filters, empty states, price and billing badges, visibility/status actions, notifications, and deletion confirmation.

### Pricing editor modal localization

- Localized the Pricing editor modal's remaining component builder, billing, bundle-value, feature, quantity, and accessibility copy across all five supported languages.
- Removed embedded English UI fallbacks and localized runtime catalog fallback names while preserving editable pricing content defaults.

### Pricing admin page localization

- Removed embedded English fallbacks from the Pricing admin page so its complete existing translation registry is authoritative.
- Added five-language labels for bundle item types and unnamed tier/service entries, and replaced runtime English error fallbacks with existing localized messages.

### Themes admin localization

- Localized the remaining Themes admin tooltips and runtime save, update, create, and delete errors across all five supported languages.
- Localized generated custom-theme names/descriptions and the imported-theme fallback name instead of storing English-only copy.

### Visual Ideas admin localization

- Completed the Visual Ideas admin page localization by adding translated load/save errors and delete-card accessibility text in all five supported languages.
- Removed embedded Hungarian and English UI fallbacks so the page now consistently uses the translation registry and database.

### Projects admin localization

- Completed the Projects admin page translation set in English, Hungarian, German, Spanish, and French, including statuses, empty states, errors, portfolio fallbacks, and the timeline action.
- Replaced the remaining static tooltip and runtime-only English fallbacks with translation keys.

### Admin panel existing translation wiring

- Replaced 252 static admin-panel labels, placeholders, titles, and accessible labels across 52 pages and modals with their already available translation keys.
- Added reusable AST-based audit and migration scripts to distinguish existing-key matches from genuinely new admin translation copy and safely wire existing records into React components.
- Extended the admin localization audit with per-file key, missing-locale, English-fallback, and remaining-static-copy counts.
- Preserved reactive language switching by adding `useLanguage().tUi` only at component scope; verified the resulting client bundle with a production build.

### Admin translation audit and editor

- Localized the translation editor's controls, filters, pagination, database actions, confirmations, and result messages with dedicated English and Hungarian keys.
- Added a reusable admin static-copy audit command that reports untranslated JSX text and literal accessibility attributes by module and line.
- Completed every file-backed locale dictionary with safe English fallback values, added the missing common publish/title keys, and kept raw translation keys from leaking into partially translated locales.
- Synchronized missing hardcoded translations into the local database without overwriting existing editor customizations; all five locales now have equal key counts with no missing records, placeholder mismatches, or JSON-shaped values.

### Budget manager localization

- Replaced the remaining static budget-manager copy with translation keys across the financial page header, notifications, filters, table, Kanban view, charts, statistics, consolidated admin banner, entry editor, preferences, and audit-log modal.
- Added complete English and Hungarian financial labels for date presets, statuses, actions, empty states, help text, validation feedback, and all predefined income/expense categories; German, Spanish, and French continue to receive the module's complete English fallback instead of raw keys.
- Centralized translation of stored legacy budget category values so existing database records remain unchanged while their labels follow the selected interface language.

### Admin list performance

- Added backward-compatible server-side pagination, server filtering, and compact pagination controls to the CRM customer/lead, contact submission, project, property listing, budget, and invoice admin views, limiting each request and rendered list to 24–25 records.
- Limited the sortable admin portfolio gallery to 24 mounted cards per page while retaining the complete dataset for global filtering and ordering, reducing drag-and-drop DOM and media work.
- Added window-count metadata to paginated LibSQL queries while preserving the original unpaginated response formats for existing callers and modal data sources.

### Public homepage performance

- Reduced hero paint cost by eliminating the duplicated background image and generated noise layer, replaced the portfolio's large blur filter with a radial gradient, capped each marquee row to eight representative previews, and instantiate video players only on actual hover while preserving existing Appwrite/WebP media URLs.

### Shared internal calendar

- Separated calendar event titles from automatically created project and portfolio-gallery names, with an independently required and editable linked-resource name.
- Moved all-day entries into a dedicated sticky lane below the day headers, keeping them visible independently of vertical timeline scrolling.
- Expanded the scrollable timeline to the full 00:00–24:00 day, converted team assignment to a compact dropdown multiselect, kept modal actions permanently visible, and added a translucent blurred hover-detail surface.
- Added multi-member assignment for calendar entries and tasks, with active admin-role selection, visible assignee details, and independent reminder-email delivery to every assigned team member.
- Simplified calendar cards to title-only display and added a full-data hover preview, while removing the competing admin-page scrollbar that caused unreliable vertical timeline scrolling.
- Fixed the calendar to fill the available admin viewport with its own responsive scroll area, sticky day/time headers, automatic scroll to the current hour, and a live Notion-style current-time indicator.
- Added server-side calendar reminder emails with an editable transactional template, retry-safe delivery queue, local background worker, and authenticated Vercel cron processing so reminders work while the admin page is closed.
- Added simple events, reminders, completable tasks, all-day scheduling, and daily/weekly/monthly recurring entries alongside project and portfolio creation.
- Added a creation choice to each new calendar event: automatically create either an internal project or an unpublished portfolio gallery draft.
- Added a dedicated Notion Calendar-inspired weekly team calendar to the admin menu.
- Added click-and-drag time selection that creates a shared event and an automatically linked internal project.
- Made all team events visible to every admin-portal user while enforcing owner-only editing and deletion on the server.
- Added week navigation, a mini month picker, current-time highlighting, event colours, details, and direct links to linked projects.

### Financial role access

- Fixed the production dashboard's obsolete `/api/admin/budget/entries` request by using the Vercel-routed `/api/admin/budgets` endpoint and its `{ entries }` response shape; roles without budget access no longer request or display that dashboard card.
- Restricted editors to the Payment Requests financial view, removed Budget Manager and invoicing selectors from their sidebar and page header, normalized direct financial links to Payment Requests, and enforced the restriction on the related APIs.

### CRM route compatibility

- Added backward-compatible CRM list aliases so cached or older clients requesting `/api/admin/crm/leads` or `/api/admin/crm/customers` are normalized to the supported lead/customer types instead of receiving HTTP 400.

### Serverless media restructuring

- Removed duplicate temporary-disk writes from gallery batch restructuring: downloaded videos and generated image variants now upload directly from memory to R2/Appwrite, preventing Vercel `/tmp` exhaustion (`ENOSPC`) while preserving sequential processing.

## 2026-08-24

### Portfolio admin translations

- Added reusable Portfolio Manager UI translation keys and localized the gallery controls and external-video modal, including validation and confirmation messages.

### Business object chain and deletion safety

- Added optional project references to projects, invoices, budget entries, and payment requests, plus an optional property reference on invoices.
- Made client selection mandatory for new and updated projects; the project editor now offers the selected client's properties.
- Protected client, property, project, invoice, and budget deletion when linked operational or financial records exist, preserving the financial audit trail.
- Reconciled legacy single-value client property/listing data into the normalized tables without duplicate inserts, and added a read-only business-relation integrity report.
- Added project-aware financial editing: invoices can select a client-owned project and property, while budgets and payment requests can select a project.
- Corrected payment-request creation so its explicit pending status is persisted alongside the selected invoice and project links.
- Validated payment-request invoice, budget, and project links as a single business chain; approval now preserves the project on its budget outcome.
- Extended the relation audit to detect invoice-property, payment-request, and gallery-link inconsistencies.
- Aligned fresh-database table definitions with the migrations, so project and property relationship columns are available from first startup.

### Property Core

- Added independent, archivable Properties with optional many-client ownership and linked every listing to a Property.
- Preserved legacy property and listing records during the migration; archived Properties now automatically hide their listings from the public catalog.
- Added Property profile fields and a consolidated detail endpoint; new projects can create a client-linked Property while preventing duplicate active addresses.
- Added an admin Property detail page and automatic activity records for Property archiving and Listing lifecycle changes.
- Added archive and restore controls to the Property detail page, with the refreshed activity timeline visible immediately after each action.

### Customer 360

- Added a consolidated customer profile with account metadata, calculated project and financial KPIs, a unified activity timeline, financial summaries, and per-property operational and financial context.
- Added CRM-managed VIP status and an optional custom price-list label, available in the customer editor and Customer 360 profile.

### Admin currency conversion

- Added a global admin display-currency selector and a cached Frankfurter reference-rate proxy; Customer 360 financial values now convert from their stored currency without changing accounting records.

### Public homepage performance

- Removed duplicate hero and eager portfolio-media preloads, preventing startup image-decoding contention and reducing first-load jank.
- Kept only small pricing and FAQ previews in the bootstrap response; their complete datasets now load near the relevant section without altering Appwrite image handling.
- Fixed the public-home runtime failure caused by the deferred pricing and FAQ loading flag not being passed into its components.

### About and cookie glass blur

- Restored the frosted blur surface behind the About copy and reinforced the cookie banner and cookie-settings backdrop blur directly in the rendered components so production CSS optimisation cannot remove it.

### Sidebar footer controls

- Fixed the Sign Out button incorrectly treating its click event as an expired-session request.
- Unified the language selector with the sidebar menu treatment and restored stable hover animation for all footer controls without blocking clicks.

### Dashboard operational cards

- Added reorderable and toggleable payment-request status, project-status, and recent-project cards to the Admin Dashboard.
- Added a superadmin-only recent-client-accounts card, backed by the existing protected client-management data.

### Dashboard clock and calendar preferences

- Added persistent 12/24-hour clock formatting and Monday/Sunday week-start options to the Dashboard card manager.

### Personalizable Admin Dashboard

- Added clock, monthly calendar, and persistent personal-notes cards to the Admin Dashboard.
- Made every dashboard card sortable with drag and drop, aligned to a consistent card size, and added a card manager for toggling individual cards on or off.

### Facebook icon namespace compatibility

- Normalized legacy `fa-fab-facebook`, `fa-fab-facebook-f`, and `fa-fab-f` style social-icon values to the Facebook brand icon, so existing saved settings render correctly.

### Toggleable Hero production-areas card

- Added a Site Settings switch for the complete Hero Production Areas card, keeping its Photography, Cinematic film, and Drone & aerial entries together.
- Left the card enabled by default and added a TODO marker for future menu-item configuration.

### Invoice client-account filter

- Added an invoice filter for selecting a client account by its linked email address, backed by the existing CRM and client-portal lookup.
- Applied the selected client filter to both the invoice list and invoice summary figures.

### Unified Admin tab selectors

- Standardized the visual states of tab selectors across Admin pages and modals, including legacy underline controls.
- Active tabs now use the same primary filled state, while inactive tabs share consistent rounded hover and keyboard-focus feedback.

### Hero image readability overlay

- Added a dedicated Hero image readability slider to Site Settings, including an explicit percentage and contrast guidance.
- The dark overlay now applies to both uploaded and built-in Hero backgrounds, keeping foreground copy readable on bright photos.
- Added an independent 0–24 px Hero background blur control that leaves foreground copy and controls sharp.

### Stable sidebar footer controls

- Prevented the Admin sidebar's bottom controls from shifting on hover or visible keyboard focus, eliminating the pointer/focus "shake" while preserving their existing styling.

### Categorized Site Settings modal

- Reworked the Site Settings modal into Site & Brand, Content & SEO, and Contact & Email categories with focused sub-tabs, retaining all existing fields and save behaviour.

### Team and pricing page spacing

- Added responsive outer spacing and a shared maximum content width to Team & Admin Invitations and Pricing & Packages, aligning both pages with the rest of the Admin workspace.
- Matched the exact `p-4 sm:p-8` spacing convention used by the primary wide Admin pages.

### Admin responsive layout audit

- Corrected the Team & Admin Invitations tab row so its three controls stack cleanly on narrow screens instead of causing horizontal overflow and clipped labels.

### Categorized Site Settings workspace

- Grouped the Site Settings workspace into focused Site & Brand, Content & SEO, Contact & Email, and Legal & Access tabs while retaining every existing settings card and editor flow.

### Categorized Admin navigation tabs

- Reorganized the Admin sidebar into compact, collapsible category tabs for Dashboard & Finance, Content, Users & Clients, and Settings & System.
- The category containing the active page opens automatically, while the existing role-based menu and direct-route permissions remain unchanged.

### Team login and activity tracking

- Fixed team-member login timestamps across password login, magic-link login, invitation activation, client registration, and property-account login.
- Added throttled last-activity tracking for authenticated requests and displayed it separately from the last successful login in Team & Invitations.
- Moved the timestamp schema updates into the always-run lightweight migration phase so existing databases receive them before authentication begins.

### Backfill missing video posters

- Added an Admin Gallery action that generates and saves poster frames for existing direct-upload video items without posters, while leaving existing manual and embedded-video thumbnails untouched.

### Automatic video poster frames

- Video uploads now extract a representative frame in the browser, upload it as a poster image, and automatically use it for the gallery item and portfolio feature cover.
- If a browser cannot decode a particular video codec, the video upload still completes normally and remains editable with an optional manual poster.

### Persistent background media uploads

- Moved the media upload queue and its live status window to the application root, so uploads and progress remain available while navigating away from Admin pages.
- Extended reuse of the direct Appwrite upload session for long-running, backgrounded upload batches to avoid unnecessary session recreation.

### Automatic error-page redirect

- All application error pages now display a three-second countdown and automatically return visitors to the homepage.

### Session-end portal chooser

- Added a dedicated session-end screen for automatic sign-outs, allowing users to choose Admin or Client login and highlighting the portal used most recently.
- Stored the last successful portal context for password, magic-link, and registration-based sign-ins, while keeping manual logout behaviour unchanged.

### Info bar category colours and single dismiss

- The public info bar now renders each announcement using its configured category background and text colours instead of a fixed blue override.
- Dismissing one announcement now closes the complete rotating info bar for the applicable session or permanent dismissal scope.

### Gallery item-type selector layout

- Reworked the per-item gallery type selector into a responsive two-column grid, keeping every option inside its media card without horizontal overflow.

### Superadmin-managed admin menu permissions

- Added a polished role-permission manager to Site Settings so Superadmins can choose each Admin, Editor, and Viewer menu/page access level.
- Centralized menu access rules with safe defaults, persistent database configuration, sidebar filtering, direct-route 403 protection, and server-side API enforcement; Superadmins retain unrestricted access.

## 2026-08-20

### SEO-complete dynamic sitemap and robots policy

- Expanded `/sitemap.xml` with the public properties index, enabled property detail pages, published portfolio pages, image sitemap entries, canonical public URLs, validated last-modified dates, crawl priorities, and refresh hints.
- Added a dynamic `/robots.txt` that points crawlers to the canonical sitemap and excludes private admin, client, authentication, invitation, invoice, API, and listing-management areas.

### Sitemap production routing fix

- Added a sitemap route alias for Vercel's rewritten request path so `/sitemap.xml` no longer returns a 404 in production.

### Hungarian translation completion

- Translated 100 remaining English admin and customer-facing strings in the Hungarian dictionary, including branding, customer invitations, FAQ categories, leads, settings, and contact submissions.

### Translation language section markers

- Marked the starting point of each English, Hungarian, German, Spanish, and French translation section in `src/lib/translations.ts`.

### Required privacy and terms acceptance for contact inquiries

- Added separate required checkboxes for the Privacy Policy and Terms and Conditions to the public contact form.
- Each policy name opens its current public legal document, and the contact API now rejects submissions that do not include both acceptances.

### Deleted default team no longer returns

- Removed the database startup seed and automatic member/invitation reassignment for the `Main Studio` team.
- Administrators can now delete that team permanently; it is not recreated when the server initializes again.

### Font Awesome-only social tree icons

- Standardized every social-tree platform glyph on Font Awesome Brands across the admin tree, editor previews, public social popup, footer, and Coming Soon page.
- Removed the remaining Lucide brand-icon imports from the shared social renderer and marked rendered glyphs with a consistent Font Awesome icon-family contract.
- Kept non-brand concepts such as groups, website, email, and phone on Font Awesome Solid, and switched LinkedIn to the correctly proportioned `linkedin-in` brand glyph.

### Team invitations and role display reliability

- Fixed the team member query so existing legacy `superadmin`, `super_admin`, uppercase, Admin, Editor, and Viewer role values are normalized and displayed consistently.
- Added a dedicated Superadmin badge and role filter instead of incorrectly rendering unknown roles as Editor.
- Hardened invitation and member loading against malformed/non-JSON error responses, and restricted Viewer accounts from creating invitations.
- Protected Superadmin role assignment, editing, and deletion while preserving at least one active administrative account.
- Normalized accepted invitation roles server-side to prevent invalid stored role values from being activated.

### Role-aware admin navigation

- Added one shared admin route permission map for Superadmin, Admin, Editor, and Viewer accounts.
- Superadmin and Admin retain complete management access; Editors receive operational content, CRM, marketing, and scoped finance access; Viewers see only read-oriented dashboard and content sections.
- Hid unauthorized sidebar entries and added matching embedded 403 protection for direct admin URLs, including restricted invoice tabs.
- Normalized legacy role spellings before menu and route permission checks.

### Client and admin dual-account invitations

- Existing active client email addresses can now receive and accept admin-panel invitations instead of being rejected as existing team members.
- Added independent secondary admin role, password, active status, workspace, and team fields so accepting an admin invitation does not overwrite the client portal identity or password.
- Admin and client login now explicitly select their account context while continuing to use the same email address.
- Team member listings and admin authorization recognize secondary admin access records.

### Editable team categories

- Added inline rename, save, cancel, and delete controls to every team category in Team Management.
- Renaming a category also refreshes assigned member workspace labels.
- Empty categories can be deleted directly; categories with assigned members remain protected until their members are moved.

### Team category rename compatibility

- Fixed team category renaming on databases created by older deployments where optional team metadata columns may be missing.
- Rename operations now update the required name field first and synchronize member, secondary-admin, and pending-invitation workspace labels safely.
- Duplicate category names return an actionable 409 response instead of a generic 500 error.

## 2026-08-19

### Social brand icon rendering fix

- Reworked the shared social icon renderer to use a stable square wrapper and explicit SVG sizing across the footer, Coming Soon page, social popup, and admin previews.
- Switched Facebook to the correct standalone `f` brand glyph so it no longer appears as an incorrectly nested or distorted emblem inside rounded controls.
- Added compatibility aliases for legacy Font Awesome/platform values such as `facebook-f`, `facebook-square`, `fb`, `linkedin-in`, `youtube-play`, and `telegram-plane`.

### Admin-controlled Coming Soon mode

- Added a Coming Soon configuration card to Site & System Settings with multilingual title/description, target date, enable switch, footer/social visibility controls, blur strength, and overlay opacity.
- Added direct Appwrite/R2 upload support for optimized background images and MP4/WebM background videos, including progress, preview, direct URL, replacement, and removal controls.
- Added a responsive Aero Coming Soon experience with theme-aware branding, blurred image/video backdrop, live days/hours/minutes/seconds countdown, configured social-tree links, and the existing public footer.
- Added an uncached lightweight public configuration endpoint so enabling or disabling the mode is reflected immediately without loading the full homepage dataset.
- Scoped the mode to public marketing routes (home, portfolio galleries, and properties) while keeping admin, client portal, advertiser manager, authentication, invitations, invoices, and error pages accessible.
- Added editable Coming Soon translations for English, Hungarian, German, Spanish, and French.

### Context-aware Aero error pages

- Added responsive, light/dark-aware 401, 403, 404, 500, and 503 pages matching the public Aero visual system.
- Unknown public, admin, and client routes now render a real 404 view instead of silently redirecting to the homepage; nested admin/client 404s remain inside their respective layouts.
- Protected areas continue to redirect unauthenticated visitors to the correct login, while authenticated users with an invalid role now receive a 403 page.
- Added a route-level React error boundary for unexpected rendering failures and status-aware errors for missing portfolio galleries, property listings, and unavailable public invoices.
- Added editable error-page translations for all five supported locales.

### Section media and property translation completion

- Replaced the section media editor's identity translation callback and hard-coded Hungarian labels with editable `admin.section_media.*` translation keys.
- Added complete English, Hungarian, German, Spanish, and French values for section names, image controls, positions, overlays, defaults, and upload previews.
- Synchronized all missing built-in translation rows, including the recently added property-listing navigation and client account settings keys, into the translation database without overwriting existing admin customizations.

### Built-in section image previews

- Section media cards now display their hard-coded public-site background or content image before an admin uploads an override.
- Built-in previews are clearly labelled and remain separate from saved media, so they do not incorrectly mark a section as configured or expose a clear action.

### Section image upload pipeline fix

- Replaced section background/content-image uploads through the legacy 5 MB branding endpoint with the direct Appwrite/R2 media pipeline.
- Section images now use the configured storage provider without sending image bytes through the Vercel serverless function and automatically prefer the generated optimized image URL.
- Resolved the UI/server mismatch where section cards accepted files up to 15 MB but the branding endpoint rejected anything above 5 MB.
- Improved branding-upload error parsing so non-JSON and HTTP 413 responses no longer collapse into the generic `Upload failed` message.

### Client property-listing media upload authorization

- Fixed Vercel property-client image uploads returning `Forbidden: Admin access required` from `/api/admin/media/upload/*`.
- Added a shared upload authorization middleware used by both the full Node server and the Vercel admin function.
- Limited the exception strictly to media-upload routes and require a valid `property-listings` scope plus a matching, active linked listing account for property-client sessions.
- Preserved normal admin-role and active-account validation for every admin request, including uploads.

### Unified property-site and client-manager design

- Replaced the separate property-page navbar with the same responsive Header component used by the public homepage, including configured light/dark logos, brand display mode, language selector, theme switch, account menu, and mobile drawer.
- Made homepage section links route correctly from standalone property, login, and manager pages instead of targeting missing local anchors.
- Added a shared property-site shell with the public ambient background treatment and footer for `/properties`, property login, and the authenticated listing manager.
- Redesigned the property login as a responsive branded two-panel experience with clearer authentication guidance and mobile-first form controls.
- Redesigned the client listing manager header, search/status toolbar, loading/empty states, listing cards, publication badges, and actions to match the public Aero visual language in both themes.

### Immediate public property visibility

- Disabled browser and Vercel CDN caching for the public property list and detail endpoints so newly enabled listings appear immediately instead of leaving a cached empty catalog visible.
- Forced the `/properties` client to bypass its HTTP cache whenever it loads or revisits the catalog.
- Verified against the production API that the enabled listing exists and identified the previous response as an aged Vercel cache hit.

### Vercel property login and manager routing

- Added the missing `/api/property-auth/*` Vercel rewrite to the authentication serverless function, fixing the text 404 response that caused the `Unexpected token 'T'` JSON parsing error.
- Added a dedicated `/api/property-manager/*` serverless function and rewrite with the same scoped-token and active-account checks as the full Node server.
- Hardened the property login and manager clients against non-JSON infrastructure responses so they now show an actionable message instead of leaking a JSON parser exception.

### Public property catalog and advertiser contact

- Added the public `/properties` catalog and `/properties/:id` detail routes for enabled property listings.
- Added responsive property cards with optimized thumbnail media, title, price, description, sale/rental and status labels, plus icon badges for enabled amenity switches.
- Added full listing galleries, structured property facts, equipment details, and direct email contact with the linked advertiser or administrative creator.
- Added cached read-only public listing API endpoints that never return disabled listings and prefer optimized media over original uploads.
- Replaced the former disabled “Coming soon” navigation item with a working Properties link on desktop and mobile.
- Added an admin listing-page switch that controls whether the Properties link appears in the main navigation while keeping `/properties` directly accessible.

### Linked listing-account deletion integrity

- Extended admin client deletion to remove the linked property-listing account, all owned listings, and their tracked original/optimized/thumbnail media before deleting the portal user.
- Prevented orphaned listing-account and ownership records when a migrated client is removed.

### English property-manager URLs

- Added `/property-listings/login` as the canonical direct property-account login URL.
- Added `/property-listings/manager` as the canonical protected listing-manager URL.
- Kept the previous Hungarian paths as redirect-only compatibility aliases so existing bookmarks remain valid.

### Dedicated property-manager email/password login

- Added a direct `/ingatlanos/bejelentkezes` login page and `/api/property-auth/login` endpoint for previously migrated property-listing accounts.
- The login validates the migrated email against the linked portal user's current bcrypt password and requires password sign-in to be enabled; magic-link users must add a password before migration.
- Added a separate 12-hour `property_client` JWT with a strict `property-listings` scope and independent `property_listing_token` storage, so signing into the property manager does not replace the client-portal session.
- Moved listing management behind `/api/property-manager` and blocked normal client-portal tokens from all listing CRUD operations.
- Removed direct switching from the client portal. The portal now only performs and reports the one-time migration; users subsequently sign in through the dedicated property-manager login.
- Every property-manager request revalidates both the linked listing account and original portal user as active, while scoped sessions are rejected by unrelated client/admin endpoints.

### Linked client property-listing accounts

- Added a separate `property_listing_accounts` table linked one-to-one to existing client-portal users, with an idempotent one-time migration that copies the registered email address and display name.
- Added a client-portal migration gateway and an explicit transition into a dedicated personal property-listing manager; reverse migration/switching remains reserved for the later phase.
- Clients can create, edit, enable/disable, search, upload optimized images for, and delete their own listings with the same data model and form capabilities as administrators.
- Enforced owner-scoped API queries on every client listing read/write/delete operation so a linked account cannot access another owner's listing.
- Added restricted listing-media upload authorization for active linked client accounts without granting access to other admin endpoints; existing admin/editor/viewer/superadmin upload behavior is preserved.
- Added listing ownership, creator user, and creator role fields. Admin listing cards now show who created each listing and which linked account owns it.
- Client display-name changes synchronize to the linked listing account while the original portal and listing-account records remain separate.
- Added the client navigation entry in English, Hungarian, German, Spanish, and French; the public property website remains locked.

### Admin property listing and management system

- Added a dedicated admin Property Listings area with searchable responsive cards, listing status/type badges, edit/delete actions, and an independent publication switch.
- Added a production-safe `property_listings` schema and authenticated admin CRUD endpoints for core details, pricing, dimensions, room counts, description, construction details, orientation, view, bathroom/WC arrangement, multiple heating types, amenities, media, and visibility.
- Added a screen-bounded create/edit modal with basic and detailed sections, yes/no amenity controls, dropdowns, multi-select heating options, image management, and live upload progress.
- Property images use the existing direct-to-storage uploader and automatically create optimized/thumbnail variants; cancelling before save does not upload selected files.
- Removing images while editing or deleting an entire listing also removes tracked original, optimized, and thumbnail media from storage.
- The public real-estate page remains locked and unchanged; only enabled listings are prepared for its later implementation.
- Added the property-listing navigation label in English, Hungarian, German, Spanish, and French.

### Client settings endpoint production migration fix

- Moved the client profile/password/TFA compatibility columns into the lightweight migration phase that always runs before the initialized-database fast path.
- Fixed existing Vercel/Turso databases returning `Failed to load account settings` because the settings endpoint selected columns that had not been added after an earlier initialization.
- Added a rolling-deployment compatibility query so the registered email address remains available while additive schema migration finishes.
- Reduced repeated Turso cold-start migration traffic by checking the user schema once and batching only genuinely missing columns.

### Admin client account creation date display

- Fixed SQLite UTC timestamps being interpreted as local timestamps in the admin client portal list.
- Account creation now shows a stable localized date and time in the Budapest timezone, with safe handling for missing, invalid, ISO, and numeric timestamp values.
- Zero-valued timestamps are treated as missing data, preventing the Unix epoch (`1970-01-01`) from appearing as an account creation date.

### Client account change notification emails

- Added an editable `client_account_changed` security email template to the admin email template manager.
- Client display-name changes, password changes, and first-password setup for magic-link accounts now send a security notification email.
- Notifications include a safe change summary, timestamp, request IP address, and direct account-settings link; passwords are never included.
- Unchanged profile submissions do not produce duplicate notification emails.

### Client account settings and password onboarding

- Added a dedicated `/client/settings` portal page and responsive navigation entry for profile and account-security management.
- Clients can save a 2–100 character display name; the authenticated session updates immediately, future password/magic-link sessions include the name, and admin client search/list/detail responses now expose it independently from the CRM name.
- Added authenticated profile read/update endpoints and password-management logic with the existing strong-password policy and bcrypt cost 12.
- Password-based clients must verify their current password before changing it, cannot reuse the same password, and receive clear validation errors.
- Magic-link-created clients can add their first known password without supplying the random internal placeholder, while retaining magic-link sign-in as an alternative.
- Added `password_auth_enabled`, `password_updated_at`, and reserved `tfa_enabled` account fields, plus a one-time compatibility migration that identifies existing magic-link-created accounts.
- Added a disabled two-factor authentication settings card and API status contract so TFA enrollment can be added later without redesigning account settings.
- Added editable English, Hungarian, German, Spanish, and French translation keys; the existing missing-key synchronizer persists them to the database during setup.

### Client password-registration email audit

- Prevented duplicate public signup/login magic-link emails with a synchronous client submit lock plus an atomic 45-second server-side idempotency window keyed by normalized email and link type.
- Only the request that inserts the fresh magic-link record may dispatch an email; Vercel retries and simultaneous instances now return success without generating or sending a second token.
- Failed provider deliveries remove their unused idempotency record so a legitimate retry is not blocked.
- Audited the public client password-registration path separately from the already verified admin invitation/magic-link workflow.
- Fixed unreliable Vercel delivery by awaiting the registration welcome email before returning the successful authentication response instead of starting fire-and-forget work after account creation.
- Added the dedicated, independently editable `client_password_registration` onboarding template with branded HTML/plain-text bodies, login CTA, registration method/date, registered email, studio, and support tokens.
- Kept account creation successful when the email provider reports a delivery failure, while recording the delivery result in email logs and returning a non-sensitive delivery status with the registration response.
- Preserved the existing `account_verification` template and admin invitation workflow unchanged.

### Persistent admin gallery background uploads

- Portfolio records can now be created and saved before any gallery media is attached, providing the persistent gallery id required for subsequent background uploads.
- Published-but-empty portfolio records remain available in the admin CMS but are excluded from the public portfolio and its navigation until they receive media.
- Moved saved portfolio-gallery image and video uploads into an AdminLayout-level background queue so transfers continue when the editor modal closes or the administrator navigates to another admin page.
- Added a persistent floating upload monitor with queued, active, completed, failed, per-file progress, and gallery context states.
- Completed uploads are attached to the saved portfolio immediately through a dedicated authenticated endpoint, preventing successful bucket uploads from becoming orphaned when the portfolio page unmounts.
- Kept uploads sequential across batches to protect Appwrite/R2 endpoints from avoidable concurrent rate-limit pressure, and added a browser-tab close warning while transfers are active.
- New, not-yet-saved portfolio records retain the foreground workflow because no persistent gallery id exists until their first save.

### Vercel build pipeline optimization

- Split the frontend and standalone Express server builds into explicit `build:client` and `build:server` tasks while preserving the complete local/standalone `npm run build` workflow.
- Added a Vercel-specific build task that emits only the Vite frontend because Vercel packages the `api/*.ts` serverless entrypoints independently.
- Removed the unused standalone `dist/server.cjs` bundle and its source map from Vercel build output, avoiding roughly 3.8 MB of redundant generated deployment artifacts and an unnecessary server bundling pass on every deployment.
- Removed the unused direct `uuid` and `zod` dependencies from the npm manifest and lockfile, reducing installation and dependency-tracing work without changing application behavior.
- Regenerated `package-lock.json` from a clean npm state after dependency pruning so optional Tailwind WASI packages (`@emnapi/core` and `@emnapi/wasi-threads`) remain represented and Vercel's strict `npm ci` validation succeeds.

### Portfolio media lifecycle, optimized delivery, and showcase refinements

### Upload and storage reliability

- Replaced repeated client-side Appwrite account-session creation with short-lived API-key-authenticated upload sessions to avoid the per-IP and per-user session endpoint rate limit during multi-file and video uploads.
- Kept gallery transfers direct from the browser to Appwrite so Vercel does not proxy large file bodies, and added retry handling for temporary rate-limit responses.
- Changed gallery uploads to run sequentially with clearer per-file and overall progress feedback.
- Added automatic optimized-image creation during upload: each image retains its original master and receives a high-quality JPEG derivative constrained below 10 MB, with adaptive dimensions and quality when needed.
- Preserved optimized JPEG delivery for client downloads while using derivatives for admin and public previews to prevent large source images from slowing the interface.

### Email branding

- Added an email-header branding selector for uploaded logo only, uploaded logo with studio name, or studio name only.
- Connected transactional, marketing, preview, and test-email layouts to the uploaded light header logo, with the dark logo as fallback and the public header mode used until an email-specific mode is saved.

### Portfolio data and media cleanup

- Fixed the admin customer editor's remaining `null.trim()` failure in the full CRM update route by normalizing every optional customer field before persistence.
- Customer-editor saves now atomically synchronize the complete property and listing-link collections, use the linked portal user as the canonical owner when present, and remove stale duplicate CRM/portal rows so newly added addresses appear in both admin and client views.
- Replaced raw customer security-audit action codes and JSON blobs in the admin detail view with readable event titles, labelled fields, normalized statuses and booleans, wrapped reason text, and a taller responsive history panel; all new audit copy is available in English, Hungarian, German, Spanish, and French and synchronized to the editable translation database.
- Fixed new client-property creation and editing when legacy or incomplete records contain a `null` property name, address, metadata, or request body; client and admin endpoints now normalize values before trimming and return address validation instead of a runtime exception.
- Corrected localized portfolio names and categories in admin cards and category selectors so translated values render instead of serialized objects or translation keys.
- Portfolio updates now compare the previous and saved gallery media sets and delete removed originals, optimized images, thumbnails, posters, and previews from storage.
- Full and bulk portfolio deletion use the same storage cleanup path before database removal.
- Added URL-based Appwrite bucket/file detection so older objects not present in `media_uploads` can also be removed safely.
- Cleared stale `media_url` and `thumbnail_url` references when their corresponding gallery items are removed.

### Public showcase and visual fixes

- Fixed Social Tree group/link creation and editing with null-safe request normalization, validated parent groups, normalized platform/icon identifiers, and explicit create responses.
- Restored the missing Social Tree header controls by passing them through the supported `PageHeader.action` slot instead of the ignored `actions` prop; Add Group and Add Social Link are now always visible and expand appropriately on mobile.
- Rebuilt the Social Tree add/edit modal as a viewport-bounded flex layout with fixed header/actions, an independently scrollable form body, compact mobile spacing, responsive selectors, and full-width mobile buttons so no fields or save controls extend beyond the screen.
- Corrected the Social Tree update route's LibSQL `Value` inference by explicitly normalizing persisted node type and URL values to strings before URL validation, restoring strict TypeScript/Vercel deployment compatibility.
- Unified social icon rendering across the admin tree, editor preview, public popup, and footer; legacy FontAwesome-style identifiers now resolve correctly, unknown stored icons fall back to the selected platform, missing group icons are supported, and card text colors are no longer overridden by hardcoded inline brand colors.
- Optimized the mobile Visual Ideas section with contained, non-blurred, transition-free cards and deferred grid painting, reducing main-thread and compositing work while the section is visible.
- Corrected mobile Portfolio gesture handling so horizontal gallery interaction no longer captures vertical page scrolling; disabled smooth-scroll work, fixed mobile background attachment, and contained each row's paint area.
- Reduced mobile Portfolio media pressure by mounting two cards per row initially, adding further cards in smaller batches, using a lighter viewport observer, and showing image posters instead of initializing video decoders during touch scrolling.
- Added the admin-managed “Miről lehet jó ingatlan vizuált készíteni?” section directly before pricing, with a responsive five-column desktop grid, a hard 15-card/three-row limit, localized title and description fields, ordering controls, visibility control, and no public navigation entry.
- Integrated the new section into the existing section-background media manager while excluding it from scroll-driven navigation and page-title state.
- Added unified content-aware rendering for Services, Portfolio, Pricing, Visual Ideas, and FAQ: empty or fully hidden sections and their desktop/mobile/floating navigation anchors are no longer rendered.
- Removed legacy public fallback cards that kept empty Services and FAQ sections visible, and added per-card visibility controls to Visual Ideas.
- The homepage interactive portfolio and its lightbox now prefer optimized image derivatives instead of raw full-resolution files.
- Portfolio marquee cards no longer expose individual image titles or filenames; they identify the portfolio and category instead.
- Randomized each portfolio marquee row on load and, when possible, prevented media from the same gallery from appearing consecutively.
- Constrained the Additional Services card shine layer to the card's positioned, rounded bounds so the animation no longer crosses the page.
- Added admin-managed media/background controls for public website sections.
- Restored the portfolio marquee direction pattern to left, right, left while retaining randomized card ordering.
- Added the `drone_photo` media category throughout individual/bulk admin controls, filtering, structured filenames, localized labels, and a randomized fourth public “Drone Photography” row moving right.
- Corrected mobile Hero intrinsic sizing, long localized headline wrapping, full-width CTA alignment, and narrow-screen production-card layout.
- Corrected the same intrinsic-width overflow pattern throughout the mobile Contact grid, form card, selectors, date inputs, pricing summaries, and consent controls.
- Fixed public FAQ category badges so multilingual JSON values resolve to the active-language label instead of rendering serialized objects.
- Reworked the public light-mode palette with measured high-contrast body, muted, primary, accent, placeholder, border, and focus colors; also corrected secondary text over dark Hero, Portfolio, Contact, and Footer imagery.
- Corrected the light-theme Portfolio header by replacing the generic pale glass panel with a section-specific dark glass surface and high-contrast white/cyan heading content.
- Split public and admin light/dark state into independent `public-theme-mode` and `admin-theme-mode` preferences; route-aware theme scope now switches the corresponding mode, configuration, CSS variables, and document color scheme without changing the other area.

### Public loading and low-end device performance

- Removed the floating section-navigation rail from mobile layouts and made the primary mobile navbar permanently visible; desktop scroll-aware navbar hiding and floating navigation remain unchanged.
- Aligned `package.json#packageManager` with the pnpm 10.x generator expected by the version 9 lockfile and supported by Vercel, removing the pnpm 11 lockfile mismatch during deployment.
- Disabled automatic portfolio marquee animation for every mobile viewport and replaced each row with a single, non-duplicated horizontal touch-scroll track with scroll snapping.
- Hid the desktop marquee play/pause control on mobile, while preserving the randomized card order and desktop left/right animation pattern.
- Changed all coarse-pointer mobile viewports to the lightweight public rendering path, disabling unnecessary motion and expensive ambient effects by default.
- Limited each mobile portfolio row to four initially mounted cards and progressively appends four more only as the visitor scrolls toward the row end.
- Prevented off-screen mobile gallery images and video posters from receiving a media source until their card approaches the viewport, avoiding simultaneous network and decode bursts when the section appears.
- Added provider-aware responsive image URL generation for Appwrite and Unsplash, including cached Appwrite JPEG preview resizing, quality controls, and screen-aware `srcset`/`sizes` candidates.
- Applied adaptive image delivery to public portfolio cards, video posters, full lightbox images, and lightbox thumbnails without routing image bytes through Vercel Functions.
- Corrected missing portfolio-card images caused by Appwrite returning HTTP 500 for WebP preview output; responsive previews now request the verified JPEG format and automatically retry the stored optimized image if any transformation fails.
- Added a dedicated 840 px JPEG card derivative during new image uploads and stores its URL as the gallery thumbnail, removing runtime proxy generation from newly uploaded portfolio cards.
- Standardized legacy mobile proxy requests on one 640 px cache key and preconnects the browser to detected media origins before the portfolio approaches the viewport.
- Added a Facebook-style blur-up placeholder to portfolio lightbox images, using the small stored thumbnail until the larger optimized image finishes loading and decoding.
- Switched dependency installation and Vercel builds from pnpm to npm, with a single npm lockfile and deterministic `npm ci` installs.
- Pinned npm to the Vercel-supported 10.x line and documented that any legacy Vercel dashboard `pnpm install` override must be disabled or changed to `npm ci --no-audit --no-fund`.
- Removed the unused Google GenAI SDK and redundant Sharp/UUID stub type packages, eliminating their transitive deprecation warnings.
- Added version-pinned npm install-script approvals for the required esbuild and protobufjs lifecycle scripts, and silenced esbuild's non-actionable server bundle size marker.
- Updated every generated email header to prefer the uploaded dark-background logo variant on the blue header, retaining the light-background logo as a compatibility fallback.
- Added authenticated client-portal project timelines with ordered milestones, status indicators, due dates, and timestamped project updates; timeline records are batch-loaded only for projects owned by the signed-in client.
- Added stable, unique slugs for every existing and future portfolio gallery, including an automatic database backfill and unique index.
- Added standalone `/portfolio/:slug` gallery pages with all associated media, responsive optimized previews, lightbox access, localized content, canonical/Open Graph metadata, ImageGallery JSON-LD, and an automatically generated `/sitemap.xml`.
- Added a localized “Open full gallery” action to the public portfolio lightbox so visitors and crawlers can reach the dedicated gallery URL.
- Moved the public portfolio lightbox into a document-level portal with full-viewport high-strength backdrop blur, scroll locking, reliable stacking, and centered mobile/desktop positioning.
- Replaced native controls on directly hosted portfolio videos with branded play/pause, seek, elapsed-time, mute, volume, and fullscreen controls that remain touch-accessible on mobile.
- Fixed unreliable Vercel watermark rendering by generating locked client previews from stored optimized derivatives, normalizing EXIF rotation, and replacing the font/filter-sensitive SVG pattern with explicit renderer-safe repeated marks.
- Replaced watermark text glyph rendering with embedded font-independent vector paths, preventing missing-font stripe artifacts in Vercel-generated images.
- Added the uploaded dark-background header logo to generated watermarks and introduced a translucent contrast badge plus stronger dual-tone text edging for reliable visibility on both dark and light photographs.
- Extended protected right-click saving to every image card on dedicated public portfolio-gallery pages, using the same optimized, server-generated logo watermark as the homepage lightbox.
- Kept public lightbox images clean during viewing and converted right-click into an on-demand server-generated watermarked JPG download; drag-save remains suppressed.
- Removed full schema migration/setup work from the read-only Vercel public function cold-start path; admin, authentication, client, billing, and fallback functions retain database initialization.
- Added dedicated browser and Vercel CDN cache controls for the public bootstrap response, including stale-on-error delivery during temporary database outages.
- Added one-year immutable caching for fingerprinted Vite assets and revalidation caching for bundled public images.
- Added `/api/public/bootstrap`, which returns settings, portfolio, services, pricing, add-ons, fee rules, FAQs, and FAQ categories from one LibSQL/Turso read batch.
- Removed duplicate component-level startup requests by sharing bootstrap pricing, service, add-on, fee, and FAQ data across the public page.
- Added request coalescing plus short-lived server-memory, Vercel CDN, browser, and session caching for public datasets.
- Added composite database indexes for the published/sorted portfolio, service, pricing, add-on, fee-rule, FAQ, and FAQ-category access patterns.
- Added route-level lazy loading for admin, finance, authentication, invoice, and client-portal modules; the main startup JavaScript decreased from approximately 2.59 MB to 870 KB (about 600 KB to 230 KB gzip).
- Added hero-image preload and conditional optimized portfolio-image prefetching that respects constrained devices and connections.
- Added automatic lightweight rendering for low-memory/low-core mobile devices, data-saver or slow connections, and reduced-motion users.
- Fixed pricing cards remaining transparent on mobile when lightweight `content-visibility` prevented their viewport animation from completing; lite mode now renders pricing immediately with a CSS visibility fallback, tighter card spacing, responsive padding, and a compact three-column filter bar.
- In lightweight mode, portfolio marquees become non-duplicated touch-scroll rows, continuous GPU effects and costly blur/3D layers are disabled, Motion animations are reduced, and off-screen public sections use deferred rendering.

### Vercel serverless architecture

- Split the combined billing Function into independent budget, invoice, payment-request, and referral Functions with domain-specific duration limits.
- Moved public invoice routes and public referral-code validation into dedicated read-oriented Functions.
- Extracted health and incident-status endpoints into a lightweight system Function that does not run database initialization.
- Removed public invoice/referral imports from the general public/auth router bundle and restored their mounts explicitly in the local full-server router.
- Removed the all-in-one `api/index.ts` compatibility Function and its catch-all rewrite after auditing every active API prefix, preventing Vercel from packaging the complete backend again on every deployment.

### Pricing bundles

- Bundle cards now hydrate referenced base tiers from current catalog data rather than retaining stale embedded snapshots.
- Expanded tier content shows the complete, current feature list and included items without truncation.

### Verification

- All 11 Vercel Function entry points were bundled independently after the serverless domain split, alongside successful production frontend and full local-server bundles.
- Production Vite builds and server ESBuild bundles completed successfully after the portfolio, upload, storage, pricing, and public-interface changes.

## 2026-08-18 — Platform expansion, client delivery, finance, email automation, and Vercel architecture

### Public website and AERO/GLOW visual consistency

- Added independent header and footer brand-display controls for logo only, logo with the studio name, or studio name only, including live branding previews and localized admin labels.
- Extended the frosted-glass AERO/GLOW theme to the information bar, incident widget, contact information cards, pricing elements, authentication menus, and dark-mode dropdowns.
- Added and corrected reusable shine effects on contact cards and pricing cards while constraining animation overflow and card-radius clipping.
- Corrected desktop hero-image positioning, including the dark-mode composition.
- Added rounded edge masking to the animated portfolio rows so cards enter and leave without hard rectangular cuts.
- Portfolio videos now display extracted/random preview frames while idle, start only on hover, and pause the hovered conveyor row without removing continuous row animation.
- Services and Portfolio navigation entries are now data-aware in the desktop, mobile, and floating navigation; empty unpublished sections no longer produce dead menu links.
- Added the admin- and client-portal entries to the public account dropdown.
- Added editable footer social links, website-version badge, AI-generated-code disclosure, and the configurable “Created with React & love in Hungary” attribution.
- Added the active public design to the branding/theme editor.

### Contact form, pricing estimate, and travel calculation

- Bundle cards now resolve referenced tiers from the current pricing catalog instead of stale embedded snapshots; expanding a tier shows its complete current feature and included-item content without text truncation, and pricing endpoints bypass stale browser/CDN caches.
- Reordered the inquiry journey to collect identity, property city/address, and preferred photography time before package selection, add-ons, estimate, message, and submission.
- Property city is now required before package/add-on interaction and is clearly identified as an input for the travel and final-price calculation; property address remains optional.
- Added automatic round-trip travel-distance calculation from Hódmezővásárhely and integrated distance fee rules into the live package estimate.
- Standardized input-group spacing, responsive gaps, card padding, helper text, and error-state layout throughout the form.
- Contact submissions persist package, add-on, calculated fee, distance, total, and currency data.
- Both inquiry email templates now include a structured package summary, database-verified base price, selected items, calculated fees, explanations, currency, and estimated total in HTML and text form.
- Added editable inquiry-template tokens for package price, selected-item rows/text, calculated-fee rows/text, currency, and final estimate; existing customized templates inherit newly introduced token definitions without being overwritten.
- Updated the preferred-date label to “When I would like the photography” consistently in the public form and admin interface.

### Cookie consent and legal content

- Added a frosted-glass cookie banner with preference controls, localized text, translation-manager keys, and a direct Cookie Policy action.
- The contact form remains locked until the required cookie consent has been granted.
- Added database-backed Privacy Policy, Terms and Conditions, Cookie Policy, and Legal Notice documents.
- Added full-page WYSIWYG editing with formatting tools in the admin panel and rendered formatted document modals on the public website.
- Added footer links that open the corresponding public legal-document modals.

### Client authentication, accounts, and project portal

- Added direct password registration and login alongside magic-link authentication for client and admin workflows.
- Corrected client account creation, magic-link registration/login, invitation handling, and active-account validation.
- Strengthened direct admin account creation with a random, single-use email verification code and an editable verification-code template.
- Corrected team invitation template selection, team-member creation, team assignment, invitation resend/revoke, and account verification flows.
- Fixed project preview images, attached-gallery counts, and invoice/customer matching by normalized email address in the client portal.
- Archived paid invoices remain visible to clients as paid records while admins can manually archive completed invoices.

### Secure gallery delivery and downloads

- Added project-gallery downloads to the client portal, including individual selection, multi-select, and generated ZIP archives.
- Added four-digit gallery PIN delivery in the gallery-ready email, PIN verification, forgotten-PIN resend, and automatic PIN rotation on every resend.
- Locked downloads receive a server-generated continuous “Courtesy of SPS Studio” marketplace-style watermark; unlocked downloads return originals.
- Added right-click protection and watermarked save behavior for locked previews.
- Added video frame thumbnails and a large-image/lightbox modal in client galleries.
- Added a separate optimized-image download category for project images below the configured delivery threshold, using the same PIN and watermark policy.
- Removed the obsolete gallery-level type selector because media type is managed per gallery item.
- Corrected structured gallery filenames so restructuring updates both the bucket object name and database metadata.

### Portfolio and media storage performance

- Portfolio gallery deletion now removes every tracked original, thumbnail, poster, preview, and optimized asset from Appwrite, R2, or local storage before deleting database records; failed storage cleanup prevents a false-success gallery deletion.
- Reduced portfolio memory pressure by preventing all videos from autoplaying while keeping motion-rich portfolio rows and hover playback.
- Added direct browser-to-Appwrite upload sessions for large/chunked media so Vercel does not buffer files or write to its read-only deployment filesystem.
- Added Appwrite upload registration, public URL construction, bucket diagnostics, and alphanumeric upload-label handling independent of Appwrite user authentication.
- Retained R2 multipart support and moved Vercel-only temporary work to the writable system temporary directory.
- Removed obsolete root-level patch and manual test scripts after verifying they were unreferenced development artifacts.

### Finance, invoices, budgets, and payment requests

- Removed automatic demo budget-entry and payment-request seeding, and added narrowly matched legacy-demo cleanup so deleted sample finance data cannot reappear while genuine records remain untouched.
- Corrected invoice-to-client association and portal visibility using normalized email matching.
- Added paid-invoice behavior that disables repeat payment requests and replaces the action with manual archival.
- Updated downloadable/printable invoices to use a print-safe version of the email visual language.
- Corrected invoice and payment-email rendering and exposed the relevant templates in the email editor.
- Added superadmin CRUD management for payment-request categories.
- Added default-currency configuration and applied it to budget, invoice/payment, and payment-request summary cards.
- Fixed budget-entry persistence and “Budget entry not found” update failures.
- Corrected payment email conditionals and beneficiary-account token handling.

### Email system and automation

- Expanded the editable transactional-template catalog with gallery PIN recovery, admin verification, invoice/payment, payment-request status, and Google review templates.
- Removed internal template names from rendered email bodies.
- Exposed editable header/footer text and all textual template tokens while preserving token aliases and conditional rendering.
- Added milestone and project-update email delivery from the admin project timeline.
- Added Google review campaigns after `gallery_ready`: 1 hour, +3 hours, +1 day, +5 days, and +10 days; clicking the tracked review link cancels remaining reminders.
- Added reusable, database-backed marketing email templates with manual recipient dispatch from the admin panel.
- Corrected marketing-template creation and missing admin translation values.
- All generated email action URLs now use canonical `APP_URL`; the request host is only a local-development fallback.

### Localization and translation management

- Audited public, admin, client-portal, budget, invoice/payment, and payment-request UI strings and repaired missing or invalid translation keys.
- Added missing database translation records and expanded the translation manager to include client-portal and newly introduced cookie/contact strings.
- Reorganized localization dropdown groups so editable strings appear under their owning product area.
- Added English, Hungarian, German, Spanish, and French contact travel/calculator guidance.

### Vercel and server architecture

- Fixed Node/TypeScript build issues across Express response/request types, LibSQL client typing, Node crypto, Sharp imports, AWS S3 clients, referral unions, and ESM translation imports.
- Removed runtime creation of `/var/task/uploads`; Vercel uses writable temporary storage only for short-lived processing.
- Split the Vercel API into domain functions: `public`, `auth`, `admin`, `client`, and `billing`, with `index` retained as a compatibility fallback.
- Added shared Vercel CORS, body parsing, database bootstrap, error handling, and extracted authentication middleware.
- Routed budgets, invoices, payment requests, and referrals to the isolated billing function and assigned function-specific duration settings.
- Added canonical application URL resolution and forwarded-host fallback handling.
- Production frontend, local server, and each Vercel function entry were independently bundled and verified.

### Verification

- Repeated Vite production builds completed successfully after the public UI, contact, localization, and email changes.
- Server and individual Vercel function bundles completed successfully with ESBuild.
- Targeted TypeScript checks passed for the Vercel entry points, shared bootstrap, contact API, and email template pipeline.

## 2026-08-17 — AERO/GLOW design integration for 2.0

### Visual foundation

- `src/index.css` — integrated the complete blue-white AERO/GLOW design system, section-aware ambient gradients, themed photographic section backgrounds, frosted-glass surfaces, responsive breakpoints, reduced-motion handling, and separate light/dark WCAG-oriented color variables.
- `public/images/*.png` — added four locally served thematic backgrounds for hero, services, portfolio, contact, authentication, and workspace surfaces.
- `png-k/*.png` — retained standalone source copies of the four generated image assets in the project root.

### Shared UI and workspaces

- `src/components/ui/Card.tsx` — added the shared `aero-ui-card` glass surface hook.
- `src/components/ui/Button.tsx` — added the shared animated `aero-ui-button` hook.
- `src/components/ui/Input.tsx` and `Textarea.tsx` — added the accessible animated `aero-ui-input` hook.
- `src/components/AdminLayout.tsx` — applied the themed admin workspace and translucent content layer without changing routes or authorization.
- `src/components/ClientLayout.tsx` — applied the client glass workspace, responsive spacing, animated navigation items, and active-page semantics while retaining the new projects, invoices, and referrals navigation.
- `src/components/admin/Sidebar.tsx` — applied frosted sidebar styling, glow hover highlighting, active states, submenu styling, and danger-action treatment while retaining all 2.0 permissions and routes.

### Public and authentication surfaces

- `src/pages/PublicHome.tsx` — added stable intersection-based active-section tracking and a smooth ambient color layer; retained the new Pricing section and all existing content/API flows.
- `src/pages/AdminLogin.tsx`, `AdminSetup.tsx` — added the photography-themed admin authentication background.
- `src/pages/ClientLogin.tsx`, `ClientRegister.tsx`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`, `VerifyMagicLinkPage.tsx` — added the matching client authentication design.

### Development reliability and documentation

- `server.ts` — replaced the fixed port with `process.env.PORT` support while retaining port `3000` as the default.
- `README.md` — documented the design system, image locations, i18n audit script, and configurable local port.

### Verification

- Installed all declared dependencies successfully.
- Production build completed successfully before and after the design integration.
- Public home, portfolio, pricing, contact, FAQ, social modal, and initial admin setup rendered in the local browser.
- Browser console contained no warning or error entries on the inspected public view.
- The existing production APIs, Turso/local LibSQL selection, storage providers, email integration, and external connections were not removed or replaced.

### Color consistency follow-up

- Locked public, admin, client, and authentication chrome to separate WCAG-oriented AERO light/dark palettes so legacy database theme colors cannot reintroduce an amber primary color.
- Converted non-semantic public purple, violet, amber, and orange accents to blue/cyan equivalents.
- Retained orange/yellow for genuine warning, incident, overdue, and attention states where color communicates status.
- Recolored the announcement bar to a blue-cyan gradient and replaced the hero's amber key light with a cyan rim light.

### Exact original-design synchronization

- Replaced the generic 2.0 hero markup with the original cinematic hero structure, including its exact full-height composition, locally served background image, title treatment, CTA buttons, Production Scope glass card, service rows, noise layer, and footer metadata.
- Synchronized the original Vision, About, Services, FAQ, and Footer component structures and animation timings.
- Restored the original `aero-header` and `aero-nav` header surfaces while preserving the 2.0 Pricing navigation, information bar, theme control, and role-aware account menu.
- Applied the original Portfolio image-section framing to the 2.0 animated marquee implementation instead of removing its new media functionality.
- Applied the original Contact glass-form, animated input, and submit-button classes while retaining plan selection, add-ons, fee calculations, availability fields, map, and all 2.0 submission data.
- Locked public, admin, client, and authentication headings and body copy to the original Plus Jakarta Sans stack; removed the unintended Playfair Display override loaded from the new database theme.
- Disabled automatic opening of the social popup so the initial page state matches the original site.
- Compared the original site on port 3002 and the advanced site on port 3003 using rendered computed styles. Hero height, corner radius, title size/weight, Production Scope surface, CTA dimensions, and core typography now match the original values.

### Contact contrast and portfolio conveyor fix

- Forced the Contact section's left-column heading and information text to the original near-white values in dark mode; the rendered heading now resolves to `rgb(247, 252, 255)`.
- Added the missing continuous left/right marquee keyframes used by the advanced portfolio rows.
- Portfolio rows now start moving automatically as seamless duplicated-track conveyors.
- Removed automatic hover/touch pausing and the competing reduced-motion mode from this showcase; only the explicit Stop/Continue conveyor button changes playback.
- Verified live transforms over time, confirmed an unchanged transform while paused, and confirmed movement resumes after continuing.
