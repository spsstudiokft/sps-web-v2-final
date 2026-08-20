# Modification Log

## 2026-08-20 — Hungarian translation completion

- Translated 100 remaining English admin and customer-facing strings in the Hungarian dictionary, including branding, customer invitations, FAQ categories, leads, settings, and contact submissions.

## 2026-08-20 — Translation language section markers

- Marked the starting point of each English, Hungarian, German, Spanish, and French translation section in `src/lib/translations.ts`.

## 2026-08-20 — Required privacy and terms acceptance for contact inquiries

- Added separate required checkboxes for the Privacy Policy and Terms and Conditions to the public contact form.
- Each policy name opens its current public legal document, and the contact API now rejects submissions that do not include both acceptances.

## 2026-08-20 — Deleted default team no longer returns

- Removed the database startup seed and automatic member/invitation reassignment for the `Main Studio` team.
- Administrators can now delete that team permanently; it is not recreated when the server initializes again.

## 2026-08-20 — Font Awesome-only social tree icons

- Standardized every social-tree platform glyph on Font Awesome Brands across the admin tree, editor previews, public social popup, footer, and Coming Soon page.
- Removed the remaining Lucide brand-icon imports from the shared social renderer and marked rendered glyphs with a consistent Font Awesome icon-family contract.
- Kept non-brand concepts such as groups, website, email, and phone on Font Awesome Solid, and switched LinkedIn to the correctly proportioned `linkedin-in` brand glyph.

## 2026-08-19 — Social brand icon rendering fix

- Reworked the shared social icon renderer to use a stable square wrapper and explicit SVG sizing across the footer, Coming Soon page, social popup, and admin previews.
- Switched Facebook to the correct standalone `f` brand glyph so it no longer appears as an incorrectly nested or distorted emblem inside rounded controls.
- Added compatibility aliases for legacy Font Awesome/platform values such as `facebook-f`, `facebook-square`, `fb`, `linkedin-in`, `youtube-play`, and `telegram-plane`.

## 2026-08-19 — Admin-controlled Coming Soon mode

- Added a Coming Soon configuration card to Site & System Settings with multilingual title/description, target date, enable switch, footer/social visibility controls, blur strength, and overlay opacity.
- Added direct Appwrite/R2 upload support for optimized background images and MP4/WebM background videos, including progress, preview, direct URL, replacement, and removal controls.
- Added a responsive Aero Coming Soon experience with theme-aware branding, blurred image/video backdrop, live days/hours/minutes/seconds countdown, configured social-tree links, and the existing public footer.
- Added an uncached lightweight public configuration endpoint so enabling or disabling the mode is reflected immediately without loading the full homepage dataset.
- Scoped the mode to public marketing routes (home, portfolio galleries, and properties) while keeping admin, client portal, advertiser manager, authentication, invitations, invoices, and error pages accessible.
- Added editable Coming Soon translations for English, Hungarian, German, Spanish, and French.

## 2026-08-19 — Context-aware Aero error pages

- Added responsive, light/dark-aware 401, 403, 404, 500, and 503 pages matching the public Aero visual system.
- Unknown public, admin, and client routes now render a real 404 view instead of silently redirecting to the homepage; nested admin/client 404s remain inside their respective layouts.
- Protected areas continue to redirect unauthenticated visitors to the correct login, while authenticated users with an invalid role now receive a 403 page.
- Added a route-level React error boundary for unexpected rendering failures and status-aware errors for missing portfolio galleries, property listings, and unavailable public invoices.
- Added editable error-page translations for all five supported locales.

## 2026-08-19 — Section media and property translation completion

- Replaced the section media editor's identity translation callback and hard-coded Hungarian labels with editable `admin.section_media.*` translation keys.
- Added complete English, Hungarian, German, Spanish, and French values for section names, image controls, positions, overlays, defaults, and upload previews.
- Synchronized all missing built-in translation rows, including the recently added property-listing navigation and client account settings keys, into the translation database without overwriting existing admin customizations.

## 2026-08-19 — Built-in section image previews

- Section media cards now display their hard-coded public-site background or content image before an admin uploads an override.
- Built-in previews are clearly labelled and remain separate from saved media, so they do not incorrectly mark a section as configured or expose a clear action.

## 2026-08-19 — Section image upload pipeline fix

- Replaced section background/content-image uploads through the legacy 5 MB branding endpoint with the direct Appwrite/R2 media pipeline.
- Section images now use the configured storage provider without sending image bytes through the Vercel serverless function and automatically prefer the generated optimized image URL.
- Resolved the UI/server mismatch where section cards accepted files up to 15 MB but the branding endpoint rejected anything above 5 MB.
- Improved branding-upload error parsing so non-JSON and HTTP 413 responses no longer collapse into the generic `Upload failed` message.

## 2026-08-19 — Client property-listing media upload authorization

- Fixed Vercel property-client image uploads returning `Forbidden: Admin access required` from `/api/admin/media/upload/*`.
- Added a shared upload authorization middleware used by both the full Node server and the Vercel admin function.
- Limited the exception strictly to media-upload routes and require a valid `property-listings` scope plus a matching, active linked listing account for property-client sessions.
- Preserved normal admin-role and active-account validation for every admin request, including uploads.

## 2026-08-19 — Unified property-site and client-manager design

- Replaced the separate property-page navbar with the same responsive Header component used by the public homepage, including configured light/dark logos, brand display mode, language selector, theme switch, account menu, and mobile drawer.
- Made homepage section links route correctly from standalone property, login, and manager pages instead of targeting missing local anchors.
- Added a shared property-site shell with the public ambient background treatment and footer for `/properties`, property login, and the authenticated listing manager.
- Redesigned the property login as a responsive branded two-panel experience with clearer authentication guidance and mobile-first form controls.
- Redesigned the client listing manager header, search/status toolbar, loading/empty states, listing cards, publication badges, and actions to match the public Aero visual language in both themes.

## 2026-08-19 — Immediate public property visibility

- Disabled browser and Vercel CDN caching for the public property list and detail endpoints so newly enabled listings appear immediately instead of leaving a cached empty catalog visible.
- Forced the `/properties` client to bypass its HTTP cache whenever it loads or revisits the catalog.
- Verified against the production API that the enabled listing exists and identified the previous response as an aged Vercel cache hit.

## 2026-08-19 — Vercel property login and manager routing

- Added the missing `/api/property-auth/*` Vercel rewrite to the authentication serverless function, fixing the text 404 response that caused the `Unexpected token 'T'` JSON parsing error.
- Added a dedicated `/api/property-manager/*` serverless function and rewrite with the same scoped-token and active-account checks as the full Node server.
- Hardened the property login and manager clients against non-JSON infrastructure responses so they now show an actionable message instead of leaking a JSON parser exception.

## 2026-08-19 — Public property catalog and advertiser contact

- Added the public `/properties` catalog and `/properties/:id` detail routes for enabled property listings.
- Added responsive property cards with optimized thumbnail media, title, price, description, sale/rental and status labels, plus icon badges for enabled amenity switches.
- Added full listing galleries, structured property facts, equipment details, and direct email contact with the linked advertiser or administrative creator.
- Added cached read-only public listing API endpoints that never return disabled listings and prefer optimized media over original uploads.
- Replaced the former disabled “Coming soon” navigation item with a working Properties link on desktop and mobile.
- Added an admin listing-page switch that controls whether the Properties link appears in the main navigation while keeping `/properties` directly accessible.

## 2026-08-19 — Linked listing-account deletion integrity

- Extended admin client deletion to remove the linked property-listing account, all owned listings, and their tracked original/optimized/thumbnail media before deleting the portal user.
- Prevented orphaned listing-account and ownership records when a migrated client is removed.

## 2026-08-19 — English property-manager URLs

- Added `/property-listings/login` as the canonical direct property-account login URL.
- Added `/property-listings/manager` as the canonical protected listing-manager URL.
- Kept the previous Hungarian paths as redirect-only compatibility aliases so existing bookmarks remain valid.

## 2026-08-19 — Dedicated property-manager email/password login

- Added a direct `/ingatlanos/bejelentkezes` login page and `/api/property-auth/login` endpoint for previously migrated property-listing accounts.
- The login validates the migrated email against the linked portal user's current bcrypt password and requires password sign-in to be enabled; magic-link users must add a password before migration.
- Added a separate 12-hour `property_client` JWT with a strict `property-listings` scope and independent `property_listing_token` storage, so signing into the property manager does not replace the client-portal session.
- Moved listing management behind `/api/property-manager` and blocked normal client-portal tokens from all listing CRUD operations.
- Removed direct switching from the client portal. The portal now only performs and reports the one-time migration; users subsequently sign in through the dedicated property-manager login.
- Every property-manager request revalidates both the linked listing account and original portal user as active, while scoped sessions are rejected by unrelated client/admin endpoints.

## 2026-08-19 — Linked client property-listing accounts

- Added a separate `property_listing_accounts` table linked one-to-one to existing client-portal users, with an idempotent one-time migration that copies the registered email address and display name.
- Added a client-portal migration gateway and an explicit transition into a dedicated personal property-listing manager; reverse migration/switching remains reserved for the later phase.
- Clients can create, edit, enable/disable, search, upload optimized images for, and delete their own listings with the same data model and form capabilities as administrators.
- Enforced owner-scoped API queries on every client listing read/write/delete operation so a linked account cannot access another owner's listing.
- Added restricted listing-media upload authorization for active linked client accounts without granting access to other admin endpoints; existing admin/editor/viewer/superadmin upload behavior is preserved.
- Added listing ownership, creator user, and creator role fields. Admin listing cards now show who created each listing and which linked account owns it.
- Client display-name changes synchronize to the linked listing account while the original portal and listing-account records remain separate.
- Added the client navigation entry in English, Hungarian, German, Spanish, and French; the public property website remains locked.

## 2026-08-19 — Admin property listing and management system

- Added a dedicated admin Property Listings area with searchable responsive cards, listing status/type badges, edit/delete actions, and an independent publication switch.
- Added a production-safe `property_listings` schema and authenticated admin CRUD endpoints for core details, pricing, dimensions, room counts, description, construction details, orientation, view, bathroom/WC arrangement, multiple heating types, amenities, media, and visibility.
- Added a screen-bounded create/edit modal with basic and detailed sections, yes/no amenity controls, dropdowns, multi-select heating options, image management, and live upload progress.
- Property images use the existing direct-to-storage uploader and automatically create optimized/thumbnail variants; cancelling before save does not upload selected files.
- Removing images while editing or deleting an entire listing also removes tracked original, optimized, and thumbnail media from storage.
- The public real-estate page remains locked and unchanged; only enabled listings are prepared for its later implementation.
- Added the property-listing navigation label in English, Hungarian, German, Spanish, and French.

## 2026-08-19 — Client settings endpoint production migration fix

- Moved the client profile/password/TFA compatibility columns into the lightweight migration phase that always runs before the initialized-database fast path.
- Fixed existing Vercel/Turso databases returning `Failed to load account settings` because the settings endpoint selected columns that had not been added after an earlier initialization.
- Added a rolling-deployment compatibility query so the registered email address remains available while additive schema migration finishes.
- Reduced repeated Turso cold-start migration traffic by checking the user schema once and batching only genuinely missing columns.

## 2026-08-19 — Admin client account creation date display

- Fixed SQLite UTC timestamps being interpreted as local timestamps in the admin client portal list.
- Account creation now shows a stable localized date and time in the Budapest timezone, with safe handling for missing, invalid, ISO, and numeric timestamp values.
- Zero-valued timestamps are treated as missing data, preventing the Unix epoch (`1970-01-01`) from appearing as an account creation date.

## 2026-08-19 — Client account change notification emails

- Added an editable `client_account_changed` security email template to the admin email template manager.
- Client display-name changes, password changes, and first-password setup for magic-link accounts now send a security notification email.
- Notifications include a safe change summary, timestamp, request IP address, and direct account-settings link; passwords are never included.
- Unchanged profile submissions do not produce duplicate notification emails.

## 2026-08-19 — Client account settings and password onboarding

- Added a dedicated `/client/settings` portal page and responsive navigation entry for profile and account-security management.
- Clients can save a 2–100 character display name; the authenticated session updates immediately, future password/magic-link sessions include the name, and admin client search/list/detail responses now expose it independently from the CRM name.
- Added authenticated profile read/update endpoints and password-management logic with the existing strong-password policy and bcrypt cost 12.
- Password-based clients must verify their current password before changing it, cannot reuse the same password, and receive clear validation errors.
- Magic-link-created clients can add their first known password without supplying the random internal placeholder, while retaining magic-link sign-in as an alternative.
- Added `password_auth_enabled`, `password_updated_at`, and reserved `tfa_enabled` account fields, plus a one-time compatibility migration that identifies existing magic-link-created accounts.
- Added a disabled two-factor authentication settings card and API status contract so TFA enrollment can be added later without redesigning account settings.
- Added editable English, Hungarian, German, Spanish, and French translation keys; the existing missing-key synchronizer persists them to the database during setup.

## 2026-08-19 — Client password-registration email audit

- Prevented duplicate public signup/login magic-link emails with a synchronous client submit lock plus an atomic 45-second server-side idempotency window keyed by normalized email and link type.
- Only the request that inserts the fresh magic-link record may dispatch an email; Vercel retries and simultaneous instances now return success without generating or sending a second token.
- Failed provider deliveries remove their unused idempotency record so a legitimate retry is not blocked.
- Audited the public client password-registration path separately from the already verified admin invitation/magic-link workflow.
- Fixed unreliable Vercel delivery by awaiting the registration welcome email before returning the successful authentication response instead of starting fire-and-forget work after account creation.
- Added the dedicated, independently editable `client_password_registration` onboarding template with branded HTML/plain-text bodies, login CTA, registration method/date, registered email, studio, and support tokens.
- Kept account creation successful when the email provider reports a delivery failure, while recording the delivery result in email logs and returning a non-sensitive delivery status with the registration response.
- Preserved the existing `account_verification` template and admin invitation workflow unchanged.

## 2026-08-19 — Persistent admin gallery background uploads

- Portfolio records can now be created and saved before any gallery media is attached, providing the persistent gallery id required for subsequent background uploads.
- Published-but-empty portfolio records remain available in the admin CMS but are excluded from the public portfolio and its navigation until they receive media.
- Moved saved portfolio-gallery image and video uploads into an AdminLayout-level background queue so transfers continue when the editor modal closes or the administrator navigates to another admin page.
- Added a persistent floating upload monitor with queued, active, completed, failed, per-file progress, and gallery context states.
- Completed uploads are attached to the saved portfolio immediately through a dedicated authenticated endpoint, preventing successful bucket uploads from becoming orphaned when the portfolio page unmounts.
- Kept uploads sequential across batches to protect Appwrite/R2 endpoints from avoidable concurrent rate-limit pressure, and added a browser-tab close warning while transfers are active.
- New, not-yet-saved portfolio records retain the foreground workflow because no persistent gallery id exists until their first save.

## 2026-08-19 — Vercel build pipeline optimization

- Split the frontend and standalone Express server builds into explicit `build:client` and `build:server` tasks while preserving the complete local/standalone `npm run build` workflow.
- Added a Vercel-specific build task that emits only the Vite frontend because Vercel packages the `api/*.ts` serverless entrypoints independently.
- Removed the unused standalone `dist/server.cjs` bundle and its source map from Vercel build output, avoiding roughly 3.8 MB of redundant generated deployment artifacts and an unnecessary server bundling pass on every deployment.
- Removed the unused direct `uuid` and `zod` dependencies from the npm manifest and lockfile, reducing installation and dependency-tracing work without changing application behavior.
- Regenerated `package-lock.json` from a clean npm state after dependency pruning so optional Tailwind WASI packages (`@emnapi/core` and `@emnapi/wasi-threads`) remain represented and Vercel's strict `npm ci` validation succeeds.

## 2026-08-19 — Portfolio media lifecycle, optimized delivery, and showcase refinements

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
## 2026-08-20 — Team invitations and role display reliability

- Fixed the team member query so existing legacy `superadmin`, `super_admin`, uppercase, Admin, Editor, and Viewer role values are normalized and displayed consistently.
- Added a dedicated Superadmin badge and role filter instead of incorrectly rendering unknown roles as Editor.
- Hardened invitation and member loading against malformed/non-JSON error responses, and restricted Viewer accounts from creating invitations.
- Protected Superadmin role assignment, editing, and deletion while preserving at least one active administrative account.
- Normalized accepted invitation roles server-side to prevent invalid stored role values from being activated.
## 2026-08-20 — Role-aware admin navigation

- Added one shared admin route permission map for Superadmin, Admin, Editor, and Viewer accounts.
- Superadmin and Admin retain complete management access; Editors receive operational content, CRM, marketing, and scoped finance access; Viewers see only read-oriented dashboard and content sections.
- Hid unauthorized sidebar entries and added matching embedded 403 protection for direct admin URLs, including restricted invoice tabs.
- Normalized legacy role spellings before menu and route permission checks.
## 2026-08-20 — Client and admin dual-account invitations

- Existing active client email addresses can now receive and accept admin-panel invitations instead of being rejected as existing team members.
- Added independent secondary admin role, password, active status, workspace, and team fields so accepting an admin invitation does not overwrite the client portal identity or password.
- Admin and client login now explicitly select their account context while continuing to use the same email address.
- Team member listings and admin authorization recognize secondary admin access records.
## 2026-08-20 — Editable team categories

- Added inline rename, save, cancel, and delete controls to every team category in Team Management.
- Renaming a category also refreshes assigned member workspace labels.
- Empty categories can be deleted directly; categories with assigned members remain protected until their members are moved.
## 2026-08-20 — Team category rename compatibility

- Fixed team category renaming on databases created by older deployments where optional team metadata columns may be missing.
- Rename operations now update the required name field first and synchronize member, secondary-admin, and pending-invitation workspace labels safely.
- Duplicate category names return an actionable 409 response instead of a generic 500 error.
