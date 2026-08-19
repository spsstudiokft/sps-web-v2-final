# Modification Log

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

- Corrected localized portfolio names and categories in admin cards and category selectors so translated values render instead of serialized objects or translation keys.
- Portfolio updates now compare the previous and saved gallery media sets and delete removed originals, optimized images, thumbnails, posters, and previews from storage.
- Full and bulk portfolio deletion use the same storage cleanup path before database removal.
- Added URL-based Appwrite bucket/file detection so older objects not present in `media_uploads` can also be removed safely.
- Cleared stale `media_url` and `thumbnail_url` references when their corresponding gallery items are removed.

### Public showcase and visual fixes

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
