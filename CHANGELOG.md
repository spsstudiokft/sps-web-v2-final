# Modification Log

## 2026-09-06

### [Updated] Crawler access

- Added explicit crawler policies for major search, AI, and social-preview bots. Crawlers arriving through either public hostname receive the same safe public-route access and the canonical `www.spsstudio.hu` sitemap.
- Aligned the server-rendered crawler HTML layer with those policies, so GPTBot, ChatGPT-User, and LinkedIn's preview crawler receive the same crawlable public-page snapshots as search bots.

### [Updated] Translation audit coverage

- Replaced the admin-only regex localization scan with an AST-based audit covering every public, authentication, client-portal, admin, and shared React surface, including visible JSX text and translatable `placeholder`, `title`, `aria-label`, and `alt` attributes while excluding content already passed through the translation runtime.
- Localized the complete admin calendar surface, including event tooltips, recurrence and status labels, accessibility text, validation feedback, and the full create/edit dialog in every supported locale.

## 2026-09-04

### [Fixed] Typography consistency

- Extended the crawler-facing SEO layer from the homepage to sitemap-backed public detail pages, including real internal navigation links and per-page canonical metadata. Human requests bypass database work and receive the unchanged SPA shell, preventing crawler rendering from affecting normal routing. Added a repeatable SEO crawler-route audit.
- Added centralized canonical URL management for indexable public pages, aligned browser canonical and Open Graph URLs with the canonical production host, and extended the sitemap with the Open Source, installer, and active campaign landing-page URLs. Private, transactional, and campaign thank-you routes remain excluded from indexing.
- Made the unlisted Lou Goossens Easter egg page safe at narrow mobile widths: the bitmap scales within the available viewport, compact header controls no longer compete for space, and long developer-note headings wrap without horizontal overflow.
- Fixed public-navbar and admin-sidebar language selectors resetting immediately to the default locale when preference-cookie consent is absent. Both selectors now use the same enabled-language list and retain the chosen locale for the active session.
- Audited Vercel's split serverless API handlers against the full local router. Campaign, public push, and exit-coupon routes now have matching production mounts; public handlers initialize pending database migrations before accessing schema-backed data; and dedicated admin handlers enforce the same menu permissions as the local API. Added a repeatable `npm run audit:vercel-routes` parity check to catch future production-only route omissions before deployment without blocking the preview build.
- Added the missing Vercel rewrite for nested public health endpoints, restoring production access to `/api/health/lou` and other routes below `/api/health`.
- Enforced Plus Jakarta Sans as the single display and body font across the public site, installer page, admin interface, and portals; legacy theme records can no longer load Playfair Display or another heading font.
- Fixed strict TypeScript inference in the public inquiry endpoint by explicitly typing selected plan IDs and bonus-code lookup collections, removing the three `unknown`-to-`string` build failures.
- Registered the exit-coupon admin and public routers in Vercel's split serverless entrypoints, fixing the production-only `404` for `/api/admin/exit-coupons/config`; configuration reads now also initialize the issue-tracking schema.
- Replaced the generic device glyphs on the PWA installer guidance with recognisable Android, Chrome, Apple, Safari, Windows, and macOS platform logos.
- Routed admin client-feedback notifications directly into the matching persistent chat tray without changing the workspace sidebar state; legacy notifications now open the most recent client conversation instead of the retired feedback page.
- Added per-user notification archive and irreversible delete controls to both admin and client portal notification panels, with recipient-scoped API authorization and archived items removed from the active list.
- Added a dedicated Archived tab to notification panels, including a restore action that moves an archived item back to the active feed.
- Closed the notification popover before opening its irreversible-delete confirmation, preventing two active-looking overlays at once.

### [Updated] Unified notification feedback

- Redesigned shared action toasts and confirmation dialogs as tone-aware blurred glass surfaces, with matching success, error, warning, information, and destructive-action color treatments.
- Added motion-aware toast entrance, icon-pop, glass-shine, and graceful exit animations, with a reduced-motion fallback.
- Extended the shared light-sweep treatment to confirmation dialogs, with a matching glass-dialog entrance animation.
- Added live unread-message badges to minimized chat trays and to the workspace Chat selector in both expanded and collapsed sidebar states.
- Added transient typing indicators, recipient-delivered and recipient-read states, and full date-and-time message timestamps to client and staff chats.
- Opening a workspace conversation now immediately clears that conversation's local unread indicator while the server records the read state.
- Added a mobile workspace chat launcher and full-screen conversation switcher, including client/staff tabs, internal-chat creation, unread badges, message states, and safe-area-aware input controls.
- Localized all newly added workspace-chat and client-help UI copy through the database-backed translation manager, then synchronized the full key set across supported locales.

### [New] Separate installable portal PWAs

- Added separately scoped Admin, Client Portal and Property Manager PWA manifests and service workers with isolated cache namespaces.
- Kept authenticated API responses out of offline caches while retaining each portal's app-shell fallback.
- Added the public `/installers` page with separate portal launch cards and Android, Apple and desktop installation guidance.

### [Fixed] Mobile legal documents

- Made legal-document modal content independently scrollable within the mobile dynamic viewport while keeping the header and close control accessible.

### [New] Unlinked Lou Goossens Easter egg endpoint

- Added the public, raw-JSON-only `GET /api/health/lou` endpoint with a selected filmography reference; it has no website UI consumer or navigation entry.
- Expanded the unlinked endpoint with a professional biography and a raw monochrome name bitmap grid, without introducing a website UI dependency.
- Added the intentionally unlisted `/easter-lg` visual companion page, including a rendered bitmap name, professional portrait attribution, biography, and selected credits; its URL and noindex metadata are exposed by the raw endpoint without adding a navigation or sitemap entry. The previous address redirects to the new route for existing known links.
- Added a bilingual developer note to the unlisted visual companion page, explaining the personal tribute and congratulating visitors who discovered it independently.
- Added the endpoint-provided research sources as clickable links to the unlisted companion page, and positioned the portrait alongside the biography content.
- Removed the duplicate conventional name heading so the bitmap is the page's sole name treatment.
- Made the bilingual developer note an accessible collapsible section.
- Added a Hungarian-English switcher to the unlisted companion page, localizing the biography, professional labels, selected-work media types, source heading, and developer note.
- Removed the duplicate Client Feedback entry from the admin sidebar; client conversations remain available in the persistent workspace chat panel.
- Unified the desktop admin side panels: the left navigation now uses the workspace-style edge toggle and compact closed rail, both navigation surfaces share animated hover and active states, and their scrollbars are visually hidden while remaining scrollable.
- Restored icon-only navigation in the compact left sidebar rail, retaining active states, tooltips, and scrolling access to every permitted main menu entry.
- Standardized every expanded admin navigation group on the Overview card treatment: glass-backed blue border, compact group header, individually surfaced links, and a reinforced active-row indicator.
- Reduced navigation-group emphasis to match the original Overview treatment, retaining its subtle glass border while removing the stronger category glow and nested-card styling.
- Made the navigation-group glass fill hover-only, leaving the default group surface transparent.
- Added multi-package and bundle selection to the public inquiry calculator, including combined server-validated pricing, persisted package selections, and coupon-adjusted totals.
- Localized the multi-package contact-calculator labels, package/bundle badges, subtotal, and currency-compatibility message in the supported language dictionaries.
- Added an unlisted, superadmin-only `/admin/developer/api-docs` reference page with SPS Studio styling, searchable endpoint-family operations, method and access badges, clipboard route copying, and noindex safeguards.

### [Fixed] Translation default synchronization

- Filled accidentally blank default translation records during normal synchronization without replacing non-empty administrator-managed translations.

### [New] Persistent admin workspace chat sidebar

- Added a collapsible, persistent right-side admin workspace with Chat and Analytics selectors.
- Reused the existing client-feedback conversations in the customer chat tab and added server-authorized direct internal staff conversations, messages, unread counts, and recipient notifications.
- Added draggable-style chat trays that can be minimized beside the workspace and remain available while navigating between admin pages.

### [Fixed] Admin workspace chat layering

- Isolated the right workspace and its open chat trays above dashboard drag-and-drop layers, preventing card handles and comparable background controls from rendering over conversations.
- Anchored open and minimized chat trays flush to the admin viewport edge and hid the adjacent main-content scrollbar without disabling scrolling.
- Scoped lazy-loading feedback to the changing admin content outlet and retained workspace chat state in the browser session, so route changes do not reload the right sidebar or open conversations.

### [Updated] Dashboard quick actions

- Converted dashboard quick actions to in-place modal launchers for client accounts, projects, portfolio items, calendar entries, and payment requests, removing route navigation from these creation workflows.

### [Updated] Admin settings information architecture

- Reorganized the settings dashboard into responsive category navigation, contextual group summaries, and a structured bento-card layout for clearer scanning at every viewport size.
- Added named nested subcategories with separated setting tiles; configurable groups retain their dedicated editor modals, while complex management tools remain inline.
- Made every modal-backed settings tile clickable and keyboard-operable, with an explicit open state in its header.
- Replaced the dense settings overview with compact, single-purpose quick-setting tiles; each supported setting now opens in its dedicated modal.
- Prevented hidden legacy settings panels from mounting in the background and issuing duplicate administration API requests.
- Fixed the compact settings page crash by importing the contact-settings icon used by its quick tile.
- Wrapped each Settings modal subsetting tab in a collapsible accordion section to reduce visual density while preserving the existing save flow.
- Fixed the shared compact-settings modal close action by importing its close icon.

### [Fixed] Internal calendar current-time guide

- Rendered the live time guide as one continuous overlay across the entire weekly schedule, rather than only inside the current day's column.

### [Updated] Admin Navigation Information Architecture

- Reorganized the admin sidebar into Overview, Finance, Clients & Sales, Production, Website Content, Marketing & Campaigns, and Administration while retaining the current visual system, role filters, and active-state behaviour.
- Moved analytics, client feedback, campaigns, finance, website content, and team controls into their relevant working groups so related tasks are no longer scattered across the sidebar.
- Added deliberate spacing between expanded group headers and their first navigation item for a clearer sidebar hierarchy.

### [Updated] Simplified Website Palette Controls

- Removed the standalone Theme & Branding Studio from the admin navigation and redirected legacy theme-editor links to Settings.
- Limited editable styling to the public website's light and dark base colours; typography, UI-shape settings, shadows, saved theme libraries, and the admin-panel theme are no longer exposed for editing.

### [New] Public Open Source Directory

- Added a configurable public Open Source page that lists non-forked, active public GitHub repositories for a selected organization or user, including project metadata, topics, stars, forks, and last-update information.
- Added Superadmin-only configuration under Settings → Content & SEO and a cached server-side GitHub proxy; an optional `GITHUB_TOKEN` can raise the public GitHub API rate limit without exposing it to visitors.
- Added repository detail pages with safely rendered README documentation and a root-level CHANGELOG or HISTORY file when available.
- Added category-aware changelog styling: New uses a plus, Fixed a key, Updated a return-arrow circle, and Removed a minus for every change entry.

### [Fixed] Adaptive Public Navigation

- Prevented desktop menu labels from wrapping before the navigation shell widens; width is now calculated from the actual brand and one-line menu content, then contracts again whenever it fits the original width.
- Moved the full desktop navigation to the mobile drawer below 1360px, preserving intentional spacing between the SPS Studio brand and menu rather than compressing the desktop row.

### [New] Campaign Landing Pages and Coupon Delivery

- Added admin-managed public campaign landing pages with editable external slugs, campaign content, background image URL, CTA destinations, discount terms, and activation state.
- Added the requested lead form, a branded thank-you view with copyable personal coupon code, customer-only coupon email delivery, and admin-side submission tracking without admin email notifications.
- Issued campaign coupons are one-time, expire on the campaign schedule, and are bound server-side to the email address that claimed them.

### [Updated] Campaign Admin Interface Consistency

- Rebuilt the campaign manager around the existing admin page header, cards, controls, data-table styling, and modal patterns for a consistent portal experience.

### [Updated] Campaign Public Visual System

- Restyled both campaign and thank-you pages to use the public site's Plus Jakarta Sans typography, cinematic title treatment, Aero dark palette, glass cards, form interaction states, and primary/secondary CTA language.
- Matched the supplied campaign references more closely with full-screen property photography, a centered narrow form composition, reference-style coupon panel, thank-you header, benefit row, and onward-navigation area.
- Added the complete reference thank-you content set: four icon-led coupon terms, website and optional webshop CTAs, email/contact/Instagram follow-up links, and SPS Studio closing line.
- Completed the campaign-form reference details, including the Hungarian phone prefix treatment, visual select markers, and a directional primary CTA affordance.
- Added animated coupon-copy confirmation and provider-aware inbox opening for Gmail, Outlook/Hotmail/Live, Yahoo, and other configured email addresses.
- Moved the coupon copy confirmation into the coupon field itself, temporarily replacing the displayed code with an animated confirmation label.
- Kept the reference-style secondary webshop CTA visible for every campaign; its admin-configured destination overrides the safe public-site fallback.
- Switched campaign form contact-field icons to Font Awesome for consistency with the public site's icon set.

### [Fixed] Campaign Form Field Alignment

- Removed decorative pseudo-elements that compressed and visually shifted the phone and selection fields, restoring a consistent input grid.
- Reset campaign field icons from absolute-style transforms to flex alignment and normalized select sizing, line-height, padding, and option colors to match text inputs.
- Corrected the campaign editor modal layout so only the form body scrolls, while the header and save/cancel actions remain inside the viewport.

### [New] Dedicated Campaign Coupon Email Template

- Added a campaign-specific transactional email template derived from the existing coupon layout, with Hungarian campaign copy, personal code, discount, expiry, and campaign CTA tokens.
- Clarified in the campaign coupon email that the code can be used on both the SPS Studio website and webshop.

### [Updated] Campaign-Assigned Coupon Codes

- Added campaign support for assigning an existing active custom coupon; assigned campaigns distribute that code without generating a replacement campaign coupon.

### [Fixed] Campaign Coupon Email Retry

### [Fixed] Campaign Administration Actions
- Activated the current local server build so campaign activation changes reach the new API endpoint.
- Disabled the delete action in the campaign list when the campaign already has recorded leads; the server continues to enforce this protection as well.
- Restored the campaign editor: the primary create action and per-campaign edit control now open the full configuration modal.

### [Updated] Campaign Thank-You Page
- Rebuilt the coupon presentation with a glowing discount ticket, a clearly dominant primary CTA, a smaller secondary webshop CTA, and the campaign visual glow treatment.
- Attached an SVG-shaped, perforated discount ticket to the coupon field edge for a more authentic voucher presentation.
- Replaced the thank-you and action icons with the matching Font Awesome treatment and a single enlarged circular checkmark.
- Simplified the thank-you panel surface and added a subtle hover shine instead of a persistent raised background.

### [Fixed] Campaign Editor Access
- Restored a visible labeled Edit action for each campaign in the administration list.

### [Updated] Campaign Editor Modal
- Restored the SPS Studio admin visual system for the campaign editor, including the glass surface, focused fields, fixed action bar, and branded close control.

### [Fixed] Campaign Admin Layout
- Applied the standard responsive admin page padding to the campaign landing page management view.

### [Updated] Campaign Form Surface
- Removed the permanent raised campaign form treatment, retaining only hover shine and full-field focus highlighting for text inputs and selects.

### [New] Campaign Translation Management
- Added campaign landing and thank-you page copy to the Translation Manager under the Campaign landing pages group.
- Connected all public campaign labels, form fields, consent text, coupon details, CTAs, and thank-you messages to the database-backed translation keys.

### [Fixed] Admin Notification Panel
- Rendered the notification panel above the sidebar layer and isolated its pointer events, preventing it from closing immediately after opening.
- Clamped its horizontal position to the viewport so the complete panel remains visible from the sidebar trigger.

### [New] Offline Portal Push Notifications
- Added browser and mobile Web Push delivery for portal notifications, including an offline service worker and per-device subscriptions.
- Connected new admin and client portal notifications to push delivery while retaining the in-app notification history.
- Added project creation, project changes, timeline milestones, progress updates, gallery delivery, portfolio publication, and linked portfolio-update notifications.
- Added admin and offline push alerts for recorded invoice payments and newly submitted colleague payment requests, with direct links to the relevant budget view.
- Added a portal notification for the requesting colleague when their payment request is reviewed.

### [Updated] Notification Audience Layers

- Separated notification delivery into independent admin, client, and anonymous-public browser layers.
- Added account-free public opt-in for maintenance, incident, and general service-status alerts; anonymous subscriptions are not tied to a user account or email address.
- Added a Superadmin-only public alert broadcast endpoint for these service communications.

### [New] Configurable WhatsApp Chat

- Added an optional floating WhatsApp chat bubble for public pages, including campaign and public invoice views.
- Added Superadmin-only WhatsApp number, opening message, and enabled-state management under Settings → Contact & Email.

### [Updated] Floating Contact Controls

- Raised the WhatsApp chat bubble above the bottom status widget so both controls remain accessible.

### [Updated] Public Navigation Layout

- Preserved the established default navigation width and expand it only when the rendered menu content would otherwise overflow, while keeping a viewport-safe maximum width.

### [Fixed] Facebook Social Icon

- Corrected the Facebook Font Awesome brand definition and made known platform values take precedence over legacy generic icon fallbacks.

### [New] Exit-Intent Coupon Recovery

- Added an optional, exit-intent-only public coupon modal that issues one tracked, one-time code per browser visitor.
- Each issued code receives a cryptographically random 5–25% discount and configurable 1–90 day validity.
- Added a marketing administration view for Superadmin activation and expiry configuration, plus the full issued-code and redemption-tracking list.

### [Fixed] Exit Coupon Typography

- Applied the active public body and heading font settings to the exit-intent coupon modal.

### [Updated] Exit Coupon Frequency Control

- Replaced the browser-storage frequency marker with first-party cookies and added configurable repeat thresholds by elapsed days or new visits.

### [Fixed] Push Permission Enrollment
- Requested notification permission directly from the notification-button click and revalidated already approved devices, ensuring subscriptions can be created for offline delivery.

- Existing campaign claims with a failed or locally logged email delivery now retry the dedicated campaign email instead of silently returning the previously issued coupon.

### [New] Admin-Managed Custom Bonus Codes

- Added Shopify-style reusable bonus codes with configurable percentage or fixed discounts, currency, availability dates, usage limits, activation controls, and a redemption audit trail.
- Added secure client-side code redemption against the account owner's open invoices, with server-side ownership, currency, expiry, activation, and usage-limit validation.

### [Fixed] Custom Bonus Code Local Migration

- Run the custom bonus-code schema migration even when an existing local database already has the legacy initialization marker.

### [Updated] Contact Quote Bonus-Code Preview

- Added a live custom bonus-code field to the public contact quote calculator, showing validity, discount terms, estimated savings, and the discounted gross estimate before submission.
- Expanded the contact quote calculator to accept up to three distinct custom bonus codes and calculate their combined savings in entry order.
- Display combined coupon savings directly in the estimated gross total, retaining the original amount as a struck-through reference.

### [Updated] Custom Bonus Code Management

- Added modal-based create and edit workflows, protected deletion for unused codes, and full server-side CRUD validation for custom bonus codes.

## 2026-09-03

### [New] Gmail-Compatible Email Template

- Added a standalone SPS Studio HTML email template with the existing dark header, logo area, blue CTA, support line, and branded footer for use in Gmail-compatible send workflows.

### Shopify SPS Blue kategóriás összehasonlító

- Added an optional, interactive comparison section with configurable category tabs, selectable project thumbnails, per-example RAW/SPS Edit imagery, touch and keyboard-accessible before/after sliders, and editable benefits.
- Shortened the section and preset name to comply with Shopify's 25-character schema-name limit, ensuring it appears in the Add section picker.
- Included the new comparison section in the home-page template in a disabled state, so it is always visible in the theme editor sidebar after the updated theme is uploaded.
- Removed that static template registration after it prevented Shopify from recognizing the Home page in the uploaded draft; the comparison remains a reusable optional section.
- Rebuilt the comparison section schema with Shopify's minimal preset structure and explicitly targeted it to the Home page after Shopify omitted the first version from the Add section picker.
- Updated the SPS Compare gallery so category selection also filters the thumbnail gallery, keeping each category's RAW/SPS Edit examples separate.
- Reworked the gallery editor so each category is its own independently editable block, with an individual title and up to five dedicated RAW/SPS Edit image pairs.
- Raised the SPS Compare gallery category limit from four to twelve independently editable category galleries.

### Shopify SPS statistics

- Raised the statistic block limit from four to twelve, retained a four-column desktop and two-column mobile layout for additional rows, and added house, clock, download, chart, and check icon choices.

### Shopify SPS community testimonials

- Replaced the single community testimonial display with an editable testimonial-block carousel featuring arrows, progress dots, optional auto-advance, reduced-motion support, and a legacy fallback for existing themes.

### Shopify footer links

- Added editable Social link and Legal link footer blocks with real URL fields, safe external handling for social destinations, and linked-text styling while retaining legacy text as a fallback.

### Shopify brand lockup

- Added a configurable static text lockup beside the uploaded theme logo in both the header and footer, retaining the existing text-only SPS mark as the no-logo fallback.
- Fixed the Shopify theme-information schema identifier so the Brand, Colors, and Typography groups are recognized and displayed in Theme settings instead of only the fallback Theme style panel.

### Shopify theme colors and typography

- Connected the global Colors and Typography values to the SPS Blue design tokens; changing background, surface, text, muted text, primary, border, or font settings now changes the rendered storefront rather than unused legacy variables.

### Shopify product compatibility

- Added a product-template compatibility module driven by product metafields for creative software, operating systems, tested camera brands/models, package contents, and guarantees, with platform and software badges plus responsive camera groups.
- Added the compatibility module to the default product template so it is discoverable in the product editor without manually adding the section.
- Made the compatibility module accept both the documented metafield keys and the existing `custom.custom_*` product metafield keys, so current product data renders without recreating definitions.

### Shopify product media sizing

- Constrained the product-media frame to a responsive editorial aspect ratio, so the product image ends with the purchase panel instead of continuing beneath its assurance divider; mobile receives a taller image ratio for legibility.

### Shopify home-page quick product panel

- Added an accessible right-side quick product panel for homepage product-card image clicks, with an overlay, Escape/close controls, product summary, add-to-cart action, purchase assurances, and a route to the full product page.
- The panel reads the same software, operating-system, package-content, guarantee, and tested-camera metafields as the product compatibility section, including existing `custom.custom_*` keys; it becomes a full-width drawer on mobile.

### Shopify product-card cart controls

- Replaced the wrapping product-card “Add to cart” copy with a consistently sized cart-plus icon button, preserving a translated screen-reader label and adding visible focus and hover states across home and collection grids.

### Shopify typography baseline

- Restored Plus Jakarta Sans as the SPS Blue default by preventing Shopify’s default Assistant picker value from overriding the website font; selecting a different font in Theme settings still deliberately overrides it.

## 2026-09-02

### [New] Open-Source License

- Added an MIT `LICENSE` file and updated the project documentation to reflect the repository's open-source licensing.
- Added a GitHub warning callout at the top of the README to disclose that the repository contains machine-generated code.
- Added a Contributor Covenant 2.1 Code of Conduct and linked it from the README.

### [New] Local Development Logs

- Moved local development-server output and error logs into the dedicated, ignored `logs/` directory.

### [Updated] Shopify SPS Storefront Composition

- Rebuilt the Aero Glow homepage into an SPS-coloured, commerce-first storefront with a promotional strip, full-bleed editorial hero, category gallery, five-column featured-products band, metrics, lead capture, social gallery, and refined footer.
- Preserved theme-editor ownership of images, collections, copy, links, and form labels so the composition is fully configurable without code edits.

### [Updated] Shopify SPS Blue Baseline

- Renamed the theme to SPS Blue and replaced the default Aero Glow visual treatment with a flat SPS-blue baseline, leaving future glow enhancements as an optional layer.

### [Fixed] Shopify Promotional Header CTA

- Restored the promotional-bar button even when no custom destination has been selected in Shopify. It now safely links to the product catalogue by default, while the theme editor's custom link still takes precedence.

## 2026-09-01

### [New] Google Analytics Admin Dashboard

- Added a server-side GA4 dashboard in the admin panel with user, session, page-view, new-user, top-page, and acquisition-channel summaries.
- The integration uses a Google service account and property ID stored only in server environment variables; the UI presents safe setup guidance until configured.

### [Fixed] Local Database Connection

- Switched local development to the existing `file:local.db` database so the local server no longer depends on an unavailable remote Turso connection.

### [New] SPS RAW VIP Platform

- Added a switchable, VIP-only SPS RAW short-form behind-the-scenes video feed and a separate admin panel for publishing, ordering, editing, and removing videos.

### [New] Unified Notifications and Confirmations

- Added an application-wide toast and confirmation-dialog foundation with consistent SPS Studio styling, status colors, keyboard focus, and modal behavior.
- Replaced every remaining native browser confirmation prompt with the shared asynchronous confirmation dialog across admin, client, and property-management workflows.

### [New] Internal Portal Notifications

- Added persistent, account-scoped in-app notifications to both the admin panel and client portal, including unread counters, individual or bulk read actions, and automatic refresh.
- Linked feedback conversations to the notification center: new client messages alert each eligible admin, while an admin reply alerts only the client who owns that conversation.
- Fixed notification popovers to stay inside the viewport on both portals, selecting the available opening direction and constraining the scrollable message area.
- Removed the outside-click close handler that caused the notification panel to close immediately after opening; the bell toggle and notification selection now control closing.

### [New] Client Feedback Conversations

- Added client-owned feedback conversations with separate threads, status tracking, unread state, and live-style polling for new messages.
- Added an admin feedback inbox to view each client separately, reply, and manage conversations through open, pending, resolved, and closed states.

### [New] Client Bonus-Code Redemption

- Connected available referral and bonus vouchers to client accounts: clients can now select one of their own outstanding invoices and redeem eligible percentage, fixed-discount, or account-credit codes.
- Added server-side ownership, expiry, currency, invoice-ownership, and availability checks; successful redemptions update the invoice discount or payment balance and record the voucher against that invoice.

### [Fixed] Sitemap Canonical URL Audit

- Aligned property sitemap eligibility with the public property-detail endpoint: listings whose linked Property is archived are no longer emitted as URLs that resolve to a public 404 and client-side homepage redirect.

### [New] Admin Dashboard Quick Actions

- Added a permission-aware quick-actions panel to the admin dashboard for creating a client, project, or portfolio item and opening calendar or payment-request workflows.
- Added direct create-query handling on the client, project, and portfolio pages so dashboard create actions open the respective form immediately.

### [New] Stripe Test Billing

- Added server-side Stripe Checkout for unpaid invoice balances, using only `STRIPE_SECRET_KEY` test credentials and server-authoritative amount calculations.
- Added a durable Superadmin Stripe enable/disable setting; checkout and return confirmation are blocked when disabled or no valid `sk_test_` key is available.
- Added Stripe-return verification and idempotent payment recording so sandbox payments update the existing invoice balance and status.

### [New] Shopify Aero Glow Theme

- Added a standalone Shopify Online Store 2.0 theme in `shopify-aero-glow-theme`, using the existing blue glass, cyan glow, rounded-card visual system.
- Included editable homepage modules plus product, collection, cart, search, page, collection-list, and 404 templates with native Shopify Liquid commerce flows.
- Kept the stylesheet as a normal Shopify asset and moved editable theme colors and font declarations into the Liquid layout head, ensuring the uploaded theme serves its CSS correctly.
- Switched the font preload to Shopify's `preload_tag`; the official Theme Check now reports no offenses across all 33 theme files.
- Added resilient aero color and type fallbacks, conditional setting overrides, and Shopify-supported default font selections so a newly uploaded theme retains readable header, navigation, and CTA contrast.
- Increased the rich-content eyebrow spacing and replaced the placeholder cart glyph with an accessible inline SVG icon and compact quantity badge.
- Added Aero Glow implementations for contact, blog, article, password-protected storefront, gift-card, and legacy customer account templates, including account activation, password reset, orders, and addresses.
- Added Shopify's modern `shopify-account` header component for stores using new customer accounts; static and policy content remains covered by the shared page template.

### [New] Shopify Fulfillment Request Notification

- Added an SPS Studio-branded Shopify Fulfillment Request email source with dynamic service, order, fulfillment-line, shipping-address, note, and configured-logo support, plus copy/paste subject and setup notes.
- Added the matching customer-facing Shopify Order Confirmation email source with order-status CTA, product summary, totals, discounts, delivery method, addresses, and configured-logo support.
- Added a safe SPS Studio visual override for Shopify's full generated Order Confirmation template so its split-cart, tracking, payment-term, transaction, and policy-attachment logic can remain intact.
- Added a complete copy/paste-ready `.liquid` version of the supplied Shopify Order Confirmation source, verified to retain all original Liquid logic outside the SPS visual style block.
- Added an SPS Studio-styled full Liquid version of the supplied Shopify Draft Order Invoice template, retaining its original payment-term and inventory-reservation logic.

### [Updated] Shopify Navigation Motion

- Updated Shopify desktop navigation links with the client-portal-inspired glass sweep, cyan glow underline, responsive hover lift, active state, and reduced-motion fallback.

### [Updated] Shopify Commerce Emphasis

- Added quick add-to-cart actions, sale and sold-out states, vendor metadata, and clearer product-card purchase affordances.
- Added an editable homepage commerce-benefits strip and product-detail purchase assurances to make the Aero Glow theme feel explicitly commerce-led while retaining its visual system.
- Refined the homepage commerce benefits into elevated individual trust cards and softened the hero-to-content transition for a less technical, more premium storefront presentation.

### [Fixed] Shopify Cart and Responsive Refinements

- Added a dedicated, padded cart-update action area so the update button no longer rests against the cart card edge.
- Corrected mobile hero spacing and floating benefit-card borders that were being overridden by older responsive strip styles.

### [Fixed] Shopify Theme Visual Audit

- Fixed the rich-content image-position setting so the configured right-side layout now renders correctly on desktop while retaining the intended mobile reading order.
- Normalized placeholder-media sizing and added Aero Glow styling for Shopify's accelerated checkout control.
- Restored the shared visually-hidden utility so assistive labels no longer create unintended visible spacing in forms.

### [New] Shopify Theme Localization

- Added the missing English and Hungarian storefront translation keys for commerce actions, empty states, product details, search, contact forms, customer authentication, password pages, blog and gift-card copy.
- Replaced the corresponding hard-coded customer-facing template copy with Shopify translation filters, including count and named-value interpolation.

### [Updated] Shopify Contact Layout

- Applied dedicated contact-section spacing, aligned the introduction with the form card, and increased the form card's internal padding for a more balanced contact layout.

### [New] Shopify Before and After Module

- Added an editable Aero Glow Before / After image-comparison section with image upload controls, responsive styling, a keyboard-accessible range control, and a full-size clipped before layer that preserves image alignment while dragging.

### [Updated] Shopify Commerce Home Redesign

- Added the Aero Glow commerce-first homepage system: promotional bar, editorial category showcase, featured-product band, store metrics, newsletter capture, and editable social gallery.
- Kept every image- and link-dependent module editable through the Shopify theme editor while retaining the existing blue-glass visual identity.

### [Fixed] Legacy Contact URL Indexing

- Added explicit permanent redirects for both `/contact` and `/contact/` to the homepage contact section, preventing the legacy standalone URL from remaining a valid indexable page.

## 2026-08-31

### [Updated] Changelog Language Convention

- New changelog entries are written in English using concise, past-tense descriptions. Historical Hungarian entries are retained unchanged for traceability.

### [Updated] Mobile Public Website Layout

- Reworked the compact header so language and theme controls move into the navigation drawer on narrow screens, preserving space for the brand, account control, and menu button.
- Constrained the mobile logo and flex layout to prevent header collisions on small devices.
- Set public inquiry form controls to a 16px mobile font size to prevent automatic iOS page zoom when an input receives focus.

### [Updated] Mobile Scroll Rendering Performance

- Disabled section reveal animations on touch and narrow-screen devices so fast scrolling never exposes transparent, apparently unloaded sections.
- Kept desktop section content visible during its entrance transition, eliminating blank states while retaining a subtle positional reveal.
- Increased mobile prefetch distance for portfolio, pricing, and FAQ data so interactive content is ready before the user reaches its section.
- Forced lightweight rendering for every viewport up to 767 px instead of relying on inconsistent mobile pointer detection.
- Disabled mobile `content-visibility` placeholders and the fixed ambient blur so fast flick scrolling cannot expose an unpainted section frame.

### [Removed] Maintenance Script Cleanup

- Removed historical one-off translation fixes and data generators, stale reports, and the temporary MFA test from `scripts`.
- Retained the translation migration and audit tools used by the project npm commands: full i18n audit, admin static-text audit, comparison audit, existing-key wiring, and manual translation migration.

### [Fixed] Translation Database Loading and Missing-Key Reporting

- Normalized locale codes and translation keys during loading, preventing inconsistent casing or surrounding whitespace from appearing as empty locale dictionaries.
- Updated the admin translation editor to calculate missing keys only after a successful database response; failed loads show a clear state and retry action instead of falsely reporting thousands of missing keys.
- Switched translation status reporting to the server-side missing-key report so the admin UI reflects the actual database state.

### [Fixed] Admin Account Error Handling

- Updated the admin profile and password pages to handle platform-level non-JSON errors safely. They now show the actual HTTP failure state instead of a misleading `Unexpected token` parsing error.

### [Fixed] Vercel Module Resolution

- Fixed the server-side media utility import so Vercel's native ESM runtime resolves `mediaUtils`. The missing extension could previously prevent every API function using the shared `utils` helper from starting.

### [New] One-Page Organic Search Indexing

- Preserved the public one-page experience while serving search crawlers a database-backed semantic HTML snapshot of homepage content, services, portfolio, pricing, and FAQ data.
- Standardized `robots.txt` and the sitemap on the `https://www.spsstudio.hu` canonical domain in Vercel environments, preventing redirected non-www URLs from entering the sitemap.
- Set the document language to Hungarian to match the default public content.
- Added Google Video Sitemap entries for public portfolio videos, including playback URL, thumbnail, title, and description.
- Routed the homepage through a cache-safe renderer so crawlers cannot receive a cached SPA shell instead of the semantic page snapshot.
- Expanded the crawler snapshot to cover Vision, About, visual ideas, testimonials, and all published public portfolio, pricing, and FAQ records.
- Renamed the production SPA shell after Vite builds because Vercel gives a physical `index.html` precedence over homepage rewrites; `/` now reliably reaches the cache-safe renderer.

## 2026-08-30

### [Updated] Price List Net Prices and VAT Labels

- All public price-list amounts are displayed as net prices, with a clear notice in the section header that final invoices include 27% VAT.
- Package and fixed-price add-on cards now show “Net price · +27% VAT” directly below the price.
- The same cards now also show the VAT-inclusive gross total in a separate row while retaining the net amount as the primary price.

### [Fixed] Portfolio Marquee Clickability

- The visual duplicate cards in the infinite portfolio marquee now open the same gallery by touch or mouse click. Previously, they behaved as decoration after the marquee looped, leaving the visible image unclickable.
- Duplicate cards remain outside the keyboard focus order and do not start separate video playback, so the fix does not increase media or focus overhead.

### [Fixed] Public Routes, SEO, and Inquiry Data Integrity

- The legacy `/contact/` route now redirects to the contact section, with a permanent Vercel redirect. Client-side error pages use `noindex, follow` so they do not appear in search results.
- Inquiry totals, add-ons, and fee items are recalculated on the server from the active price list. The browser sends only the selected package and add-ons and is never treated as a price source.
- Percentage-based fees are calculated from the net subtotal of the selected package and add-ons in both the web calculator and the server.
- Public property and changelog pages received dedicated SEO titles and descriptions, and the changelog was added to the sitemap.
- Core static labels in the property catalogue and detail pages now use the translation layer; the accidentally duplicated `/auth/verify` route was removed.

### [Updated] Inquiry Email VAT Breakdown

- New-inquiry emails to administrators and automatic client confirmations now show the estimated net amount, 27% VAT, and estimated gross total separately.
- The server calculates VAT and the gross amount from the stored net estimate, so both emails always use the same breakdown.
- Both template editors now provide net amount, VAT rate, VAT amount, and gross-total tokens; `{{estimated_total}}` remains as a net-price compatibility alias.
- Database templates that have not been manually edited automatically use the new breakdown; already customized templates are not overwritten.

### [Updated] Price Calculator VAT Breakdown

- The contact form's live estimate now shows the net amount, 27% VAT, and estimated gross total payable in separate rows.
- The calculator's collapsed header also shows the estimated gross total while detail rows remain traceable at net prices.

### [Updated] Homepage Animation and Portfolio Performance

- Pricing-card filtering now supports multiple cards entering and leaving at once, removing the `mode="wait"` warning and delayed transitions.
- The portfolio marquee switches to a static, touch-scrollable strip for smaller collections; animated rows create fewer internal card duplicates.
- Cards in the visual-only second marquee row are not focusable, do not start video playback, and do not register with the global video manager.
- Previously fixed English status and type labels for Pricing add-ons now come from the translation layer for all five supported languages.

### [Fixed] Legal Document Modal Animation

- Fixed the visual jump when closing legal-document modals: the Motion transition no longer conflicts with the CSS entrance animation applied to all dialogs.

### [Updated] Email Delivery Log

- The admin email-delivery log is no longer limited to the latest 50 events. The server now provides stable pagination in batches of 100 with a total count, and the interface can load additional events.

### [New] Editable Client Portal Help

- Added a dedicated Help page to the client portal, presenting expandable topics with descriptions, optional helper images, and ordered steps.
- Added a “Client Portal Help” editor under the admin FAQ and help section. Topics can be created, reordered, hidden, or deleted, with multiple steps and image uploads or URLs per topic.
- Help publication can be enabled or disabled centrally; the client API returns only visible, server-sanitized topics.

### [Fixed] Final Project Gallery PIN Email

- Fixed the image/video count in the `gallery_ready` email: the system now counts individual media items actually present in linked galleries rather than linked portfolio entries.
- Older portfolio entries that contain a single media item remain included in the sent summary.

### [Updated] Synology Media Library Session

- Fixed File Station's 119 (“SID not found”) response: the media library now uses Synology's documented SID-based login and does not mix session-cookie and `_sid` forwarding.
- Following successful NAS-side reproduction, read-only folder listing no longer requests or forwards a CSRF `SynoToken`; it is required only for later modifying operations.
- The shared media library now supports direct uploads to the open, authorized folder. The server rechecks every target-folder permission, never overwrites an existing file, and shows a Vercel-compatible 4 MB one-shot upload limit.
- Expiring direct Synology download links can be requested for media-library files, so download data does not pass through Vercel. Administrators can also save per-folder Synology File Request links for direct browser-to-NAS large-file uploads.
- A new subfolder can now be created within the current authorized folder; the server validates forbidden name characters and path permissions.
- Direct Synology File Request links are stored per folder in the database and updated on collision, with immediate read-back verification. The nearest parent-folder link is also available from subfolders.
- Fixed Synology download-link validity by using the complete original public URL returned by the Sharing API, preserving the QuickConnect/DDNS hostname and sharing token.
- Added a separate Docker NAS download-gateway integration: Vercel issues an HMAC-signed file path valid for five minutes, and the NAS container validates it before streaming a direct attachment response. The QuickConnect sharing page remains a configuration-free fallback.

### [Updated] Visual Email Template Editor

- The email-template modal now has a default visual editing view: the message body can be formatted directly with heading, bold/italic, quote, list, link, and text-color tools.
- Variables can also be inserted at the visual canvas's current cursor position. The result saves to the existing server-sanitized HTML field, while advanced HTML and plain-text editors remain available.

### [Updated] Safe Local Turso Usage

- The local development server no longer starts scheduled email or calendar-reminder processing by default, even when `.env` points to a production Turso database. In local environments this requires the explicit `ENABLE_LOCAL_BACKGROUND_WORKERS=1` flag.

## 2026-08-29

### [New] Synology Shared Media Library API Foundation

- Added a server-side Synology Drive / File Station API layer for shared-media-library status, authorized folders, and folder browsing.
- Server-side access is limited to Superadmin, Admin, and Editor roles; editors can access only folders explicitly assigned through environment variables.
- NAS credentials remain exclusively in server-side environment variables.
- Added an admin Shared Media Library page that browses only folders authorized for the current user; uploads and sharing were not included in this initial step.
- Missing Synology configuration or a temporarily unavailable NAS now produces a clear unavailable state without attempting file operations.
- The environment-variable example now demonstrates multiple folders and editor assignment by email or internal user ID.
- Administrators can manage editor folder permissions from the Shared Media Library page; saved database rules take precedence and can be reset to the environment JSON.
- Initial Synology folder listing is limited to 200 items, avoiding full loading for large media roots; network timeouts now display targeted error messages.
- Fixed the portal-invitation reminder cron on older Turso databases: the missing reminder column is created automatically and idempotently before execution.
- Synology File Station API requests now use a structured POST body, keeping the service password out of URL parameters and using the NAS proxy's POST route for file listing.
- Initial root-folder listing is limited to 50 items with basic file data to avoid costly file-size and timestamp metadata requests.
- The Synology authentication-session name now uses File Station's `FileStation` value for API compatibility.
- The integration uses direct File Station listing; separate API-route discovery was removed because some NAS proxies do not expose that discovery endpoint externally.
- DSM 7 File Station listing now uses Synology's indicated JSON parameter format and the login `SynoToken`, which protected DSM APIs may require.
- File Station sessions now forward the DSM-issued session cookie in API requests as well as the optional `_sid` identifier.
- Media-library errors now include the concrete DSM API code, allowing targeted diagnosis of File Station rejections after connection.
- Synology/Cloudflare HTTP errors now return short, truncated response text, helping distinguish the source of File Station 403 blocks.
- Fixed the Synology File Station folder-listing 400 error: sort fields now use the plain `name` and `asc` values required by DSM alongside the JSON-formatted folder path.

## 2026-08-28

### [New] Client Portal Invitations with Coupon Codes

- Administrators can now send client invitations in standard or coupon-code mode; the code is also linked to the secure registration URL.
- Added a fully editable “Client Portal Invitation with Coupon Code” email template with its own `{{coupon_code}}` token.

### [New] Automatic VIP Coupon and Zero-Value Financial Entries

- Coupon-code portal invitations now create a unique, single-use VIP welcome coupon automatically; successful registration adds the reward to VIP benefits.
- Budget-entry amounts are optional: blank values save as zero-value, free, or in-kind entries.
- Fixed the Express/TypeScript type for automatic administrator-issued VIP coupons.
- Fixed a missing portal-invitation status-icon import and a button variant that blocked the invoice-module build.

### [New] Portal Invitation Expiry Reminder

- The system sends a one-time reminder after approximately 36 hours for unactivated, 48-hour client-portal invitations; it is sent only for valid, unused links.
- The reminder has a separate editable email template and runs through the existing Vercel cron.

### [New] Manually Issued VIP Coupon Email

- VIP coupons manually issued by administrators now arrive by email with their code, discount, description, and expiry date.
- “VIP Coupon Assigned by Admin” is available as a separate editable email template.
- The VIP-coupon email appears in the existing notification-template category and conforms to the template system's types.

### [Fixed] Invitation Delivery Feedback

- The portal-invitation modal now closes only after successful delivery; errors or an existing active invitation are shown directly in the modal.
- Fixed the Turso/LibSQL-compatible active-invitation check for standard and bulk delivery.
- VIP portal invitations now safely create the coupons table at runtime, preventing missing-migration failures on existing Turso databases.

### [New] Optional Project Client

- Projects can be created without a client assignment as standalone internal workspaces; a property can be linked to a clientless project later, after selecting a client.

### [New] Optional About-Section Video

- The About-section image frame can now display an optional MP4, WebM, or MOV video with rounded corners and the existing hover animation.
- Administrators can select a 9:16 portrait or 16:9 landscape aspect ratio for the uploaded video.
- The About video plays with sound only when initiated by the visitor; autoplay is disabled.
- The video has its own minimal play/pause control and a fixed 50% volume.

### [Updated] Localized Public Invoice and Light Branding

- The public invoice page's complete client-facing interface was localized, including payment status, line items, amounts, receipts, and payment feedback.
- The invoice header now uses the light-mode header logo from branding settings, ensuring the correct SPS logo appears in printable views.
- Public invoices render in the active website language (EN/HU/DE/ES/FR), with their own language selector and `lang` URL parameter; the header shows the studio name beside the light logo.

### [Updated] VIP Program Pause

- When the VIP invitation program is paused, the client portal shows a dedicated informational state and hides actions for new invitations, discounts, and rewards.
- The registration invite-code field indicates the pause, and the server does not create referrals, coupons, or rewards or permit new invitation emails.

### [Fixed] Client registration coupon code

- Elevated the optional coupon/invite-code entry into a clear, benefit-led registration card and made the expanded input visually distinct, while preserving the existing referral validation and registration flow.

### [Fixed] Shared button type compatibility

- Restored the shared button component's `outline` variant and explicit children support, resolving its TypeScript errors across client registration and other existing button uses.

### [New] Account security email notifications

- Added editable transactional templates and live delivery for successful account registration, two-factor authentication enable/disable events, and completed password resets with a new password.
- Applied the account-registration confirmation to both completed magic-link and password registrations while respecting the existing client welcome-email setting.

### [New] Public changelog and feature announcements

- Added an admin-managed public `/changelog` page with publishable release notes, release types, summaries, and detailed descriptions.
- Added configurable one-time feature announcements that display as either a modal or a lower-page banner after publication.

### [Updated] Public header layering

- Raised the navigation layer above the announcement bar so the account sign-in dropdown remains fully visible and clickable.

### [Updated] Client portal sidebar interactions

- Matched the client portal navigation hover and active states to the admin sidebar's accent rail, highlight sweep, icon glow, and horizontal motion while retaining the client palette.

## 2026-08-27

### [Fixed] Public Data Loading Resilience

- Isolated the optional testimonial query from the core homepage bootstrap, so an older database without the new testimonials table can no longer prevent settings, portfolio, services, pricing, and FAQ content from loading.

### [Fixed] Testimonial Schema Migration

- Added an idempotent testimonial-table guard for public and admin endpoints, so independently started serverless functions create the new optional table before reading or updating it.

### [Fixed] MFA Verification Compatibility

- Narrowed the shared OTP verification result to a TOTP result before storing its replay-protection time step, restoring TypeScript build compatibility without weakening authenticator-code validation.

### [New] Hero Gallery

- Added an editable hero image gallery to the existing Section Media settings, using the same direct-storage upload pipeline, accepted image formats, and optimized variants as other section media.
- Hero images now accept source files up to 1 GB, matching the portfolio image limit, while the upload flow automatically generates and uses a browser-facing variant below 10 MB.
- Added 2, 2.5, and 3 second cross-fade controls; the hero retains its existing blur, readability overlay, and side/bottom fade while each gallery image is active.
- Preload and decode the incoming hero image before transition, then layer the outgoing image above it for the full 800 ms cross-fade, preventing a black frame between gallery images.
- Kept the hero readability and side/bottom fade layer above both cross-fading images, including the outgoing layer, so the established dark left-side treatment remains visible throughout the transition.
- Replaced CSS background-image slides with fully covering, preloaded image elements, eliminating uncovered background gaps while the two hero images cross-fade.
- Stabilized the parsed hero-gallery references across slideshow state updates so the active and outgoing layers are not remounted or have their cross-fade timer cancelled mid-transition.
- Switched the hero-gallery opacity handoff to a GSAP timeline: the current and preloaded-next images now animate from 1→0 and 0→1 at the same timeline position, with cleanup when the component is reset or unmounted.

### [Updated] Public Scroll-Animation Performance

- Replaced the continuous CSS view-timeline section reveal with a single GSAP ScrollTrigger reveal per opted-in public section; each reveal animates only opacity and transform once, then stops observing work for that section.
- Migrated the simple About, Vision, Featured Work, Visual Ideas, and testimonial section entrances from individual Motion viewport observers to the shared GSAP controller.
- Added the shared GSAP reveal to Services, Portfolio, Pricing, Contact, and FAQ, removing redundant root-level Motion viewport observers while preserving their interactive child animations.
- Removed the per-card Motion viewport/stagger observers from Services, Portfolio headers and galleries, and the Pricing-card grid; GSAP now owns the once-only section entrance while CSS continues to handle lightweight hover feedback.
- Kept interactive Motion animations for modals, accordions, form feedback, and filter changes, where they are event-driven rather than continuously scroll-driven.
- Preserved existing single hero background settings as a compatible first gallery image until additional images are added.
- Optimized gallery rendering so only the current and preloaded-next slides stay mounted (with one short-lived outgoing layer during a cross-fade); animation pauses in background tabs and honors reduced-motion preferences.

### [Updated] Client Portal Navigation

- Reworked the client portal into an admin-style, structured left sidebar with an account section and clear navigation for projects, invoices, referrals, property listings, and settings.
- Added a touch-friendly mobile header and off-canvas menu, with large controls, backdrop dismissal, active-page states, and automatic closing after navigation.

### [New] Public Testimonials

- Added a public “What They Say About Us” testimonial section directly before the FAQ; it appears automatically once at least one published testimonial exists.
- Added an admin testimonial manager with create, edit, publish/draft, ordering, and deletion controls, available under the FAQ menu.
- Added protected admin and public API endpoints plus the persistent testimonials table and homepage bootstrap delivery.

### [New] Team Roles

- Added Video Editor, Real-estate Agent, and Advertiser roles to team-member creation, invitations, invitation acceptance, filters, badges, and editing.
- Added server-side role validation, login recognition, and menu authorization for the new roles, with configurable default access profiles in admin settings.
- Added localized role labels and invitation descriptions in English, Hungarian, German, Spanish, and French.

### [New] Two-Factor Authentication Foundation

- Added portal-scoped authentication-factor, challenge, recovery-code, and security-event database foundations for separate client and admin identities.
- Added short-lived pre-authentication sessions, hashed eight-digit email challenges, five-minute expiry, single-use verification, attempt limits, resend cooldown, and hourly account limits.
- Added email verification and resend endpoints that issue the normal session JWT only after the second step succeeds and record the authentication method in the token.
- Integrated a reusable email-code verification screen into both admin and client password-login flows without automatically enabling 2FA for existing accounts.
- Added optional email-2FA controls to client and admin account settings; enabling requires email-code ownership verification, while disabling requires the current portal-specific password followed by an email code.
- Separated login, enrollment, and disable challenges cryptographically and in the database so a settings challenge cannot be exchanged for a login session.
- Added authentication security-event records for challenge delivery, failed and successful code checks, factor changes, and failed disable-password checks.
- Restored the declared BotID dependency in the local workspace, verified a complete production client/server build, and confirmed that the configured Resend account accepts non-simulated transactional delivery for the 2FA rollout.
- Confirmed successful inbox delivery of the live Resend test message, completing the sender-configuration and domain-delivery verification step.
- Added explicit five-locale validation feedback to admin and client password-login forms when the email address or password is missing, replacing the previously silent-looking native required-field block.
- Prevented Vercel BotID client/server verification from running on localhost test servers, where its generated script route resolves to SPA HTML, and added visible admin-login progress plus a 15-second timeout error.
- Replaced the temporary plain 2FA email with a centrally editable `auth_2fa_code` authentication template using the standard SPS branded header, configured logo, responsive card layout, security notice, footer, text fallback, preview data, and documented template tokens.
- Added `docs/TWO_FACTOR_AUTH_TODO.md` with completed, partial, pending, verification, and rollout work for email confirmation, TOTP/QR enrollment, recovery, and session lifecycle.
- Added optional RFC 6238 authenticator-app verification for both admin and client account contexts, using six-digit 30-second codes with a maximum one-step clock window and database-backed replay prevention.
- Added password-protected QR enrollment rendered entirely in the browser, a manual setup key, first-code activation, and AES-256-GCM encryption of authenticator secrets with a dedicated `MFA_ENCRYPTION_KEY` in production.
- Added ten show-once, downloadable recovery codes after enrollment; only keyed hashes are stored, codes are consumed atomically, and recovery-code login is available after the password step.
- Made an enrolled authenticator the primary login factor while preserving independently optional email OTP, and added password-plus-authenticator protected TOTP removal with recovery-code cleanup.
- Verified production client and server bundles plus an isolated integration flow for encrypted-at-rest secrets, activation, replay rejection, recovery-code generation, and single-use recovery consumption.
- Split 2FA login policy into three persistent portal-specific modes: email only, authenticator only, and combined password → authenticator/recovery → email verification; factor removal safely falls back to the remaining available method.
- Updated the shared login challenge UI to continue a combined sign-in across both verification screens and record every completed method in the final session authentication-method claim.
- Enabled a browser-compatible local `.txt` download for the ten show-once recovery codes immediately after authenticator enrollment.
- Added an isolated mode-persistence check covering all three policies and safe fallback when one combined-mode factor is removed.

## 2026-08-26

### [New] Property-Listing and Welcome Email Templates

- Added five built-in, editable Hungarian marketing email templates for new property announcements, price updates, viewing invitations, new property seekers, and new sellers/partners.
- Made all built-in templates available from the manual Marketing Emails send flow; custom copies remain removable while factory templates remain safely restorable.
- Updated the manual sender to render the selected template's own variables with examples, and to fall back to the recipient's email prefix when no greeting name is entered.
- Grouped the editable welcome templates separately in the Marketing Emails admin page so they can be found and manually sent without searching through listing campaigns.
- Added a toggleable automatic client-welcome email setting, enabled by default; it controls post-registration welcome delivery without disabling essential magic-link sign-in emails.
- Added the editable Client Portal Welcome template for first-time magic-link client registrations, alongside the existing password-registration welcome template.

### [New] Internet Archive Integration

- Added an opt-in Internet Archive / Wayback Machine integration for public property listings.
- When enabled, published listings are submitted after publication and subsequent public updates; local or otherwise non-public URLs are never sent.
- Recorded snapshot-request success or failure in the related Property activity log.

### [Updated] Admin Account Settings

- Added a dedicated Admin → My Account page with editable display name, account email visibility, and secure current-password-verified password changes.
- Added account endpoints that correctly update the active admin credential for both standard admin accounts and dual client-plus-admin accounts.
- Fixed the admin account endpoints being registered before the admin router instance was initialized, which caused server error responses instead of JSON.

### [Updated] Invoicing

- Made the invoice client-account filter searchable by client email, with account names available as autocomplete hints.

### [Fixed] Budget Refresh Reliability

- Marked all private Budget API responses as non-cacheable and made the client request fresh entries, summaries, settings, and administrator data after every save.
- Budget entry creation and editing now wait for the refreshed list and analytics totals before completing, so new expenses appear in the table and update cashflow metrics immediately.
- Fixed Budget totals and analytics for mixed-currency entries: all stored entry currencies are now converted to the administrator's selected display currency before aggregation, rather than being silently excluded when they differ from the budget default.
- Extended the shared administrator exchange-rate feed to cover every currency available in Budget entry creation, including CAD and AUD.

### [New] Theme Templates

- Reframed the theme editor around curated style templates and tucked the granular color, typography, and UI controls behind an explicit advanced-editor action.
- Added Aero Glass, Electric Glow, and Warm Estate templates alongside the existing SPS visual presets.

### [Updated] Portal Invitations

- Added active portal-invitation status and expiry visibility to customer rows.
- Prevented single and bulk portal invitation dispatch while a customer's latest unused invitation remains valid; a new invite is allowed after use or expiry.
- Fixed the customer-list and invitation checks for installations with an older `magic_links` schema by deriving the active invitation from its expiry timestamp instead of relying on an optional creation-time column.

### [Updated] Vision Section

- Made the public Vision headline responsive to the entered text length, retaining the large display treatment for short copy while reducing long headlines to a balanced, readable size.

### [Fixed] Vercel Image Optimization

- Added Vercel Image Optimization configuration restricted to public Appwrite Storage image URLs, with responsive widths, permitted quality levels, AVIF/WebP output, and a one-day minimum cache lifetime.
- Routed public portfolio cards, portfolio views, and property-listing cards, detail images, and gallery thumbnails through Vercel's production image endpoint while preserving Appwrite previews during local development.
- Kept videos, download URLs, SVG files, and non-Appwrite external images outside the new Vercel image path; a client-side fallback restores the original image if optimization is unavailable.
- Added an administrator-controlled public image-delivery mode: Vercel optimization remains the default, while Appwrite preview mode restores the prior direct image path across public portfolios and property listings.

### [Updated] Cookie Consent and Registry

- Added an administrator-managed cookie and browser-storage catalog, seeded with the currently used consent, language, theme, and public-cache entries.
- Added per-entry consent classification (essential, necessary-only, or full-consent) and made the visitor popup show each active entry's purpose, storage, provider, retention, and required/optional status.
- Enforced the visitor decision technically: optional preference, analytics, and marketing browser-storage keys are cleared on withdrawal; public language/theme persistence is prevented without preference consent; and a shared consent-gated script loader is available for future analytics or marketing integrations.
- Applied the same preference-consent check to the early HTML theme bootstrap so it cannot read a public theme preference before the application starts.
- Moved the Google Analytics and Ahrefs scripts out of `index.html`; they now load only after analytics consent and are removed with their known client-side storage when that consent is withdrawn.
- Moved detailed cookie preferences out of the compact banner into a dedicated modal, with draft selections applied only when the visitor saves them.
- Matched the cookie-preferences modal to the banner with the same blue-washed glass treatment in light and dark themes.
- Expanded the catalog with all currently used public and authenticated browser-storage keys, Google Analytics cookies, and the Ahrefs analytics script; authenticated-only entries remain hidden from the public catalog.
- Added a persisted, administrator-run infrastructure audit that records the site's detected Vercel/Cloudflare response markers and cookie names only; it never stores cookie values and does not add unverified entries to the public catalog automatically.
- Added Vercel Web Analytics and Speed Insights to public pages behind analytics consent, including removal of their injected scripts and client queues if that consent is withdrawn; both services are listed in the public cookie catalog as analytics scripts with no persistent cookie.
- Kept the deployment dependency workflow npm-only by synchronizing `package-lock.json` for the Vercel packages and removing the conflicting pnpm lockfile that made Vercel select pnpm.
- Added the official `botid` npm dependency and npm lockfile entry so the next Vercel build can enable the project-specific BotID setup.
- Connected Vercel BotID Basic protection to public contact, registration, passwordless login, password login, and password-reset requests, with the documented Vercel proxy rewrites and server-side verification.

### [New] Public Pricing Category Selector

- Normalized legacy plan category values for the Plans/Bundles selector, reset an unavailable filter safely, and gave newly selected category cards their own enter/exit animation so they render reliably after switching.

### [New] Local Demo Administrator

- Added an idempotent local-only demo superadmin account when the application uses a file-based development database.
- Displayed the demo credentials and a one-click form-fill action on the admin login page only in local demo mode; remote Turso and production environments return no test-account data.
- Added English, Hungarian, German, Spanish, and French translations for the local test-account panel.
- Used the authenticated local browser audit to find and localize residual referral conversion-rate and team invitation empty-state copy that the source-only audit had missed.

### [Fixed] Database Translation Refresh

- Prevented browser and Vercel edge caches from serving stale public translation dictionaries after database edits.
- Rotated the client translation-cache namespace while preserving fast cached startup, then forced a fresh database response on every page load and manual translation reload.

### [Updated] Admin Email-Settings Localization

- Replaced 75 unique static email-settings strings with translation keys across templates, sender configuration, test delivery, DNS guidance, logs, and quick previews.
- Completed five-language coverage for the Resend status header, template navigation, catalog search, loading/empty states, variables, sender and domain configuration, live tests, DNS guidance, logs, quick previews, editor actions, confirmations, and runtime feedback.
- Added targeted local-database synchronization for the consolidated email-settings translation set.

### [Updated] Admin Site-Settings Modal Localization

- Completed five-language localization for general settings, storage providers, Appwrite diagnostics, HTTP 413 infrastructure guidance, Cloudflare R2, contact forms, Hero/About content, and Google-review automation.
- Removed 57 inline English translation fallbacks, localized runtime diagnostic/save failures, and added database synchronization for the consolidated settings-modal translation set.

## 2026-08-25

### [Updated] Admin site-settings modal localization groundwork

- Replaced 76 unique static settings-modal strings with translation keys across general settings, storage diagnostics, contact content, hero/about content, and review automation.
- Completed five-language coverage for general settings, branding/SEO/contact navigation, footer metadata, version labels, and social-link guidance; remaining sections are being migrated incrementally.

### [Updated] Admin team-management localization groundwork

- Replaced 101 unique static team-management strings with translation keys across invitations, members, teams, template previews, and account dialogs.
- Completed five-language coverage for the overview, invitation table, teams, members, template preview, invitation/account dialogs, member editor, confirmations, validation, and runtime feedback.
- Added database synchronization for the consolidated team-management translation set.

### [Updated] Admin referrals page localization groundwork

- Replaced 121 unique static referral-management strings with translation keys across the overview, logs, tiers, rewards, settings, and reward dialogs.
- Completed the English, Hungarian, German, Spanish, and French dictionaries for the overview, logs, tiers, rewards, settings, editor dialogs, confirmations, and runtime feedback.
- Added database synchronization for the consolidated referrals-page translation set and throttled/key-extraction modes to the localization helper.

### [Updated] Admin portfolio page localization

- Completed five-language coverage for portfolio tabs, category management, search, confirmations, table headings, empty states, success feedback, and API failure messages.
- Added localized unnamed-category handling and database synchronization for the portfolio page translation set.

### [Updated] Admin portfolio editor modal localization

- Localized portfolio details, gallery cover, SEO preview, counters, validation, upload progress and failure states across all five supported languages.
- Added database synchronization for the portfolio editor modal translation set and removed its remaining inline interface copy.

### [Updated] Admin embedded-video modal localization

- Localized video-category assignment, URL detection, previews, poster uploads, metadata placeholders, validation, and fallback titles across all five supported languages.
- Added accessible labels for the modal close action, players, posters, and thumbnails.

### [Updated] Admin gallery media-card localization

- Localized filename validation, optimized-file controls, media typing, metadata editing, fallback descriptions, and video preview labels across all five supported languages.
- Added accessible labels for media previews and icon-only actions, and localized storage filename synchronization errors.

### [Updated] Admin image gallery manager localization

- Localized gallery filters, upload guidance, filename restructuring, video-poster generation, bulk media typing, pagination, feedback, and empty states across all five supported languages.
- Replaced mixed Hungarian and English runtime processing messages with parameterized translation keys.

### [Updated] Admin portfolio sortable-card localization

- Localized portfolio-card media badges, tooltips, fallback labels, publishing controls, and quick-edit actions across all five supported languages.
- Added accessible labels to icon-only save, cancel, and delete actions and corrected translated category rendering.

### [Updated] Admin portfolio gallery localization

- Completed five-language localization for gallery counters, media and status filters, bulk actions, selection counts, and empty states.
- Replaced the remaining inline selection and empty-result messages with database-backed translation keys.

### [Updated] Admin portfolio category modal localization

- Completed five-language localization for the portfolio-category editor, including headers, hierarchy fields, slug guidance, validation, accessibility labels, and actions.
- Corrected parent-category rendering so translated content is displayed directly instead of being treated as another translation key.

### [Updated] Admin social links page localization

- Localized the social-link tree controls, tooltips, group states, empty/loading states, success feedback, and API error fallbacks across all five supported languages.
- Added a targeted local-database synchronization script for the page translation set.

### [Updated] Admin social node modal localization

- Localized the social-node editor's placeholders, accessibility label, preview defaults, platform presets, suggested badges, group icons, and color preset tooltips across all five supported languages.
- Added a targeted local-database synchronization script for the modal translation set.

### [Updated] Admin extra service modal localization

- Replaced static add-on modal copy, option lists, role labels, icon tooltips, placeholders, hints, and runtime save errors with translation keys.
- Added reviewed English, Hungarian, German, Spanish, and French translations plus a targeted local-database synchronization script.

### [Updated] Fee rule editor localization

- Localized the fee-rule editor's calculation types, distance tiers, thresholds, plan restrictions, simulator, status controls, help text, placeholders, and validation feedback across all five supported languages.

### [Updated] Pricing fees tab localization

- Completed five-language localization for fee-rule filters, types, badges, calculations, status actions, notifications, empty states, and deletion confirmation.

### [Updated] Pricing add-ons tab localization

- Completed five-language localization for the Pricing add-ons tab, including filters, empty states, price and billing badges, visibility/status actions, notifications, and deletion confirmation.

### [Updated] Pricing editor modal localization

- Localized the Pricing editor modal's remaining component builder, billing, bundle-value, feature, quantity, and accessibility copy across all five supported languages.
- Removed embedded English UI fallbacks and localized runtime catalog fallback names while preserving editable pricing content defaults.

### [Updated] Pricing Admin Page Localization

- Removed embedded English fallbacks from the Pricing admin page so its complete existing translation registry is authoritative.
- Added five-language labels for bundle item types and unnamed tier/service entries, and replaced runtime English error fallbacks with existing localized messages.

### [Updated] Themes admin localization

- Localized the remaining Themes admin tooltips and runtime save, update, create, and delete errors across all five supported languages.
- Localized generated custom-theme names/descriptions and the imported-theme fallback name instead of storing English-only copy.

### [Updated] Visual Ideas admin localization

- Completed the Visual Ideas admin page localization by adding translated load/save errors and delete-card accessibility text in all five supported languages.
- Removed embedded Hungarian and English UI fallbacks so the page now consistently uses the translation registry and database.

### [Updated] Projects admin localization

- Completed the Projects admin page translation set in English, Hungarian, German, Spanish, and French, including statuses, empty states, errors, portfolio fallbacks, and the timeline action.
- Replaced the remaining static tooltip and runtime-only English fallbacks with translation keys.

### [Updated] Admin panel existing translation wiring

- Replaced 252 static admin-panel labels, placeholders, titles, and accessible labels across 52 pages and modals with their already available translation keys.
- Added reusable AST-based audit and migration scripts to distinguish existing-key matches from genuinely new admin translation copy and safely wire existing records into React components.
- Extended the admin localization audit with per-file key, missing-locale, English-fallback, and remaining-static-copy counts.
- Preserved reactive language switching by adding `useLanguage().tUi` only at component scope; verified the resulting client bundle with a production build.

### [Updated] Admin translation audit and editor

- Localized the translation editor's controls, filters, pagination, database actions, confirmations, and result messages with dedicated English and Hungarian keys.
- Added a reusable admin static-copy audit command that reports untranslated JSX text and literal accessibility attributes by module and line.
- Completed every file-backed locale dictionary with safe English fallback values, added the missing common publish/title keys, and kept raw translation keys from leaking into partially translated locales.
- Synchronized missing hardcoded translations into the local database without overwriting existing editor customizations; all five locales now have equal key counts with no missing records, placeholder mismatches, or JSON-shaped values.

### [Updated] Budget manager localization

- Replaced the remaining static budget-manager copy with translation keys across the financial page header, notifications, filters, table, Kanban view, charts, statistics, consolidated admin banner, entry editor, preferences, and audit-log modal.
- Added complete English and Hungarian financial labels for date presets, statuses, actions, empty states, help text, validation feedback, and all predefined income/expense categories; German, Spanish, and French continue to receive the module's complete English fallback instead of raw keys.
- Centralized translation of stored legacy budget category values so existing database records remain unchanged while their labels follow the selected interface language.

### [New] Admin list performance

- Added backward-compatible server-side pagination, server filtering, and compact pagination controls to the CRM customer/lead, contact submission, project, property listing, budget, and invoice admin views, limiting each request and rendered list to 24–25 records.
- Limited the sortable admin portfolio gallery to 24 mounted cards per page while retaining the complete dataset for global filtering and ordering, reducing drag-and-drop DOM and media work.
- Added window-count metadata to paginated LibSQL queries while preserving the original unpaginated response formats for existing callers and modal data sources.

### [Updated] Public homepage performance

- Reduced hero paint cost by eliminating the duplicated background image and generated noise layer, replaced the portfolio's large blur filter with a radial gradient, capped each marquee row to eight representative previews, and instantiate video players only on actual hover while preserving existing Appwrite/WebP media URLs.

### [Updated] Shared internal calendar

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

### [Fixed] Financial role access

- Fixed the production dashboard's obsolete `/api/admin/budget/entries` request by using the Vercel-routed `/api/admin/budgets` endpoint and its `{ entries }` response shape; roles without budget access no longer request or display that dashboard card.
- Restricted editors to the Payment Requests financial view, removed Budget Manager and invoicing selectors from their sidebar and page header, normalized direct financial links to Payment Requests, and enforced the restriction on the related APIs.

### [New] CRM route compatibility

- Added backward-compatible CRM list aliases so cached or older clients requesting `/api/admin/crm/leads` or `/api/admin/crm/customers` are normalized to the supported lead/customer types instead of receiving HTTP 400.

### [Fixed] Serverless Media Restructuring

- Removed duplicate temporary-disk writes from gallery batch restructuring: downloaded videos and generated image variants now upload directly from memory to R2/Appwrite, preventing Vercel `/tmp` exhaustion (`ENOSPC`) while preserving sequential processing.

## 2026-08-24

### [New] Portfolio admin translations

- Added reusable Portfolio Manager UI translation keys and localized the gallery controls and external-video modal, including validation and confirmation messages.

### [New] Business Object Chain and Deletion Safety

- Added optional project references to projects, invoices, budget entries, and payment requests, plus an optional property reference on invoices.
- Made client selection mandatory for new and updated projects; the project editor now offers the selected client's properties.
- Protected client, property, project, invoice, and budget deletion when linked operational or financial records exist, preserving the financial audit trail.
- Reconciled legacy single-value client property/listing data into the normalized tables without duplicate inserts, and added a read-only business-relation integrity report.
- Added project-aware financial editing: invoices can select a client-owned project and property, while budgets and payment requests can select a project.
- Corrected payment-request creation so its explicit pending status is persisted alongside the selected invoice and project links.
- Validated payment-request invoice, budget, and project links as a single business chain; approval now preserves the project on its budget outcome.
- Extended the relation audit to detect invoice-property, payment-request, and gallery-link inconsistencies.
- Aligned fresh-database table definitions with the migrations, so project and property relationship columns are available from first startup.

### [New] Property Core

- Added independent, archivable Properties with optional many-client ownership and linked every listing to a Property.
- Preserved legacy property and listing records during the migration; archived Properties now automatically hide their listings from the public catalog.
- Added Property profile fields and a consolidated detail endpoint; new projects can create a client-linked Property while preventing duplicate active addresses.
- Added an admin Property detail page and automatic activity records for Property archiving and Listing lifecycle changes.
- Added archive and restore controls to the Property detail page, with the refreshed activity timeline visible immediately after each action.

### [New] Customer 360

- Added a consolidated customer profile with account metadata, calculated project and financial KPIs, a unified activity timeline, financial summaries, and per-property operational and financial context.
- Added CRM-managed VIP status and an optional custom price-list label, available in the customer editor and Customer 360 profile.

### [New] Admin currency conversion

- Added a global admin display-currency selector and a cached Frankfurter reference-rate proxy; Customer 360 financial values now convert from their stored currency without changing accounting records.

### [Fixed] Public Homepage Performance

- Removed duplicate hero and eager portfolio-media preloads, preventing startup image-decoding contention and reducing first-load jank.
- Kept only small pricing and FAQ previews in the bootstrap response; their complete datasets now load near the relevant section without altering Appwrite image handling.
- Fixed the public-home runtime failure caused by the deferred pricing and FAQ loading flag not being passed into its components.

### [Fixed] About and cookie glass blur

- Restored the frosted blur surface behind the About copy and reinforced the cookie banner and cookie-settings backdrop blur directly in the rendered components so production CSS optimisation cannot remove it.

### [Fixed] Sidebar footer controls

- Fixed the Sign Out button incorrectly treating its click event as an expired-session request.
- Unified the language selector with the sidebar menu treatment and restored stable hover animation for all footer controls without blocking clicks.

### [Fixed] Dashboard operational cards

- Added reorderable and toggleable payment-request status, project-status, and recent-project cards to the Admin Dashboard.
- Added a superadmin-only recent-client-accounts card, backed by the existing protected client-management data.

### [Fixed] Dashboard clock and calendar preferences

- Added persistent 12/24-hour clock formatting and Monday/Sunday week-start options to the Dashboard card manager.

### [Fixed] Personalizable Admin Dashboard

- Added clock, monthly calendar, and persistent personal-notes cards to the Admin Dashboard.
- Made every dashboard card sortable with drag and drop, aligned to a consistent card size, and added a card manager for toggling individual cards on or off.

### [Fixed] Facebook icon namespace compatibility

- Normalized legacy `fa-fab-facebook`, `fa-fab-facebook-f`, and `fa-fab-f` style social-icon values to the Facebook brand icon, so existing saved settings render correctly.

### [Fixed] Toggleable Hero production-areas card

- Added a Site Settings switch for the complete Hero Production Areas card, keeping its Photography, Cinematic film, and Drone & aerial entries together.
- Left the card enabled by default and added a TODO marker for future menu-item configuration.

### [Fixed] Invoice client-account filter

- Added an invoice filter for selecting a client account by its linked email address, backed by the existing CRM and client-portal lookup.
- Applied the selected client filter to both the invoice list and invoice summary figures.

### [Fixed] Unified Admin tab selectors

- Standardized the visual states of tab selectors across Admin pages and modals, including legacy underline controls.
- Active tabs now use the same primary filled state, while inactive tabs share consistent rounded hover and keyboard-focus feedback.

### [Fixed] Hero image readability overlay

- Added a dedicated Hero image readability slider to Site Settings, including an explicit percentage and contrast guidance.
- The dark overlay now applies to both uploaded and built-in Hero backgrounds, keeping foreground copy readable on bright photos.
- Added an independent 0–24 px Hero background blur control that leaves foreground copy and controls sharp.

### [Fixed] Stable sidebar footer controls

- Prevented the Admin sidebar's bottom controls from shifting on hover or visible keyboard focus, eliminating the pointer/focus "shake" while preserving their existing styling.

### [Fixed] Categorized Site Settings modal

- Reworked the Site Settings modal into Site & Brand, Content & SEO, and Contact & Email categories with focused sub-tabs, retaining all existing fields and save behaviour.

### [Fixed] Team and pricing page spacing

- Added responsive outer spacing and a shared maximum content width to Team & Admin Invitations and Pricing & Packages, aligning both pages with the rest of the Admin workspace.
- Matched the exact `p-4 sm:p-8` spacing convention used by the primary wide Admin pages.

### [Fixed] Admin responsive layout audit

- Corrected the Team & Admin Invitations tab row so its three controls stack cleanly on narrow screens instead of causing horizontal overflow and clipped labels.

### [Fixed] Categorized Site Settings workspace

- Grouped the Site Settings workspace into focused Site & Brand, Content & SEO, Contact & Email, and Legal & Access tabs while retaining every existing settings card and editor flow.

### [Fixed] Categorized Admin navigation tabs

- Reorganized the Admin sidebar into compact, collapsible category tabs for Dashboard & Finance, Content, Users & Clients, and Settings & System.
- The category containing the active page opens automatically, while the existing role-based menu and direct-route permissions remain unchanged.

### [Fixed] Team login and activity tracking

- Fixed team-member login timestamps across password login, magic-link login, invitation activation, client registration, and property-account login.
- Added throttled last-activity tracking for authenticated requests and displayed it separately from the last successful login in Team & Invitations.
- Moved the timestamp schema updates into the always-run lightweight migration phase so existing databases receive them before authentication begins.

### [Fixed] Backfill missing video posters

- Added an Admin Gallery action that generates and saves poster frames for existing direct-upload video items without posters, while leaving existing manual and embedded-video thumbnails untouched.

### [Fixed] Automatic video poster frames

- Video uploads now extract a representative frame in the browser, upload it as a poster image, and automatically use it for the gallery item and portfolio feature cover.
- If a browser cannot decode a particular video codec, the video upload still completes normally and remains editable with an optional manual poster.

### [Fixed] Persistent background media uploads

- Moved the media upload queue and its live status window to the application root, so uploads and progress remain available while navigating away from Admin pages.
- Extended reuse of the direct Appwrite upload session for long-running, backgrounded upload batches to avoid unnecessary session recreation.

### [Fixed] Automatic error-page redirect

- All application error pages now display a three-second countdown and automatically return visitors to the homepage.

### [Fixed] Session-end portal chooser

- Added a dedicated session-end screen for automatic sign-outs, allowing users to choose Admin or Client login and highlighting the portal used most recently.
- Stored the last successful portal context for password, magic-link, and registration-based sign-ins, while keeping manual logout behaviour unchanged.

### [Fixed] Info bar category colours and single dismiss

- The public info bar now renders each announcement using its configured category background and text colours instead of a fixed blue override.
- Dismissing one announcement now closes the complete rotating info bar for the applicable session or permanent dismissal scope.

### [New] Gallery item-type selector layout

- Reworked the per-item gallery type selector into a responsive two-column grid, keeping every option inside its media card without horizontal overflow.

### [New] Superadmin-managed admin menu permissions

- Added a polished role-permission manager to Site Settings so Superadmins can choose each Admin, Editor, and Viewer menu/page access level.
- Centralized menu access rules with safe defaults, persistent database configuration, sidebar filtering, direct-route 403 protection, and server-side API enforcement; Superadmins retain unrestricted access.

## 2026-08-20

### [Updated] SEO-complete dynamic sitemap and robots policy

- Expanded `/sitemap.xml` with the public properties index, enabled property detail pages, published portfolio pages, image sitemap entries, canonical public URLs, validated last-modified dates, crawl priorities, and refresh hints.
- Added a dynamic `/robots.txt` that points crawlers to the canonical sitemap and excludes private admin, client, authentication, invitation, invoice, API, and listing-management areas.

### [New] Sitemap production routing fix

- Added a sitemap route alias for Vercel's rewritten request path so `/sitemap.xml` no longer returns a 404 in production.

### [Updated] Hungarian translation completion

- Translated 100 remaining English admin and customer-facing strings in the Hungarian dictionary, including branding, customer invitations, FAQ categories, leads, settings, and contact submissions.

### [Updated] Translation language section markers

- Marked the starting point of each English, Hungarian, German, Spanish, and French translation section in `src/lib/translations.ts`.

### [New] Required privacy and terms acceptance for contact inquiries

- Added separate required checkboxes for the Privacy Policy and Terms and Conditions to the public contact form.
- Each policy name opens its current public legal document, and the contact API now rejects submissions that do not include both acceptances.

### [Removed] Deleted default team no longer returns

- Removed the database startup seed and automatic member/invitation reassignment for the `Main Studio` team.
- Administrators can now delete that team permanently; it is not recreated when the server initializes again.

### [Updated] Font Awesome-only social tree icons

- Standardized every social-tree platform glyph on Font Awesome Brands across the admin tree, editor previews, public social popup, footer, and Coming Soon page.
- Removed the remaining Lucide brand-icon imports from the shared social renderer and marked rendered glyphs with a consistent Font Awesome icon-family contract.
- Kept non-brand concepts such as groups, website, email, and phone on Font Awesome Solid, and switched LinkedIn to the correctly proportioned `linkedin-in` brand glyph.

### [Fixed] Team invitations and role display reliability

- Fixed the team member query so existing legacy `superadmin`, `super_admin`, uppercase, Admin, Editor, and Viewer role values are normalized and displayed consistently.
- Added a dedicated Superadmin badge and role filter instead of incorrectly rendering unknown roles as Editor.
- Hardened invitation and member loading against malformed/non-JSON error responses, and restricted Viewer accounts from creating invitations.
- Protected Superadmin role assignment, editing, and deletion while preserving at least one active administrative account.
- Normalized accepted invitation roles server-side to prevent invalid stored role values from being activated.

### [Fixed] Role-aware admin navigation

- Added one shared admin route permission map for Superadmin, Admin, Editor, and Viewer accounts.
- Superadmin and Admin retain complete management access; Editors receive operational content, CRM, marketing, and scoped finance access; Viewers see only read-oriented dashboard and content sections.
- Hid unauthorized sidebar entries and added matching embedded 403 protection for direct admin URLs, including restricted invoice tabs.
- Normalized legacy role spellings before menu and route permission checks.

### [Fixed] Client and admin dual-account invitations

- Existing active client email addresses can now receive and accept admin-panel invitations instead of being rejected as existing team members.
- Added independent secondary admin role, password, active status, workspace, and team fields so accepting an admin invitation does not overwrite the client portal identity or password.
- Admin and client login now explicitly select their account context while continuing to use the same email address.
- Team member listings and admin authorization recognize secondary admin access records.

### [Fixed] Editable team categories

- Added inline rename, save, cancel, and delete controls to every team category in Team Management.
- Renaming a category also refreshes assigned member workspace labels.
- Empty categories can be deleted directly; categories with assigned members remain protected until their members are moved.

### [Fixed] Team category rename compatibility

- Fixed team category renaming on databases created by older deployments where optional team metadata columns may be missing.
- Rename operations now update the required name field first and synchronize member, secondary-admin, and pending-invitation workspace labels safely.
- Duplicate category names return an actionable 409 response instead of a generic 500 error.

## 2026-08-19

### [Updated] Social brand icon rendering fix

- Reworked the shared social icon renderer to use a stable square wrapper and explicit SVG sizing across the footer, Coming Soon page, social popup, and admin previews.
- Switched Facebook to the correct standalone `f` brand glyph so it no longer appears as an incorrectly nested or distorted emblem inside rounded controls.
- Added compatibility aliases for legacy Font Awesome/platform values such as `facebook-f`, `facebook-square`, `fb`, `linkedin-in`, `youtube-play`, and `telegram-plane`.

### [New] Admin-controlled Coming Soon mode

- Added a Coming Soon configuration card to Site & System Settings with multilingual title/description, target date, enable switch, footer/social visibility controls, blur strength, and overlay opacity.
- Added direct Appwrite/R2 upload support for optimized background images and MP4/WebM background videos, including progress, preview, direct URL, replacement, and removal controls.
- Added a responsive Aero Coming Soon experience with theme-aware branding, blurred image/video backdrop, live days/hours/minutes/seconds countdown, configured social-tree links, and the existing public footer.
- Added an uncached lightweight public configuration endpoint so enabling or disabling the mode is reflected immediately without loading the full homepage dataset.
- Scoped the mode to public marketing routes (home, portfolio galleries, and properties) while keeping admin, client portal, advertiser manager, authentication, invitations, invoices, and error pages accessible.
- Added editable Coming Soon translations for English, Hungarian, German, Spanish, and French.

### [New] Context-aware Aero error pages

- Added responsive, light/dark-aware 401, 403, 404, 500, and 503 pages matching the public Aero visual system.
- Unknown public, admin, and client routes now render a real 404 view instead of silently redirecting to the homepage; nested admin/client 404s remain inside their respective layouts.
- Protected areas continue to redirect unauthenticated visitors to the correct login, while authenticated users with an invalid role now receive a 403 page.
- Added a route-level React error boundary for unexpected rendering failures and status-aware errors for missing portfolio galleries, property listings, and unavailable public invoices.
- Added editable error-page translations for all five supported locales.

### [Updated] Section media and property translation completion

- Replaced the section media editor's identity translation callback and hard-coded Hungarian labels with editable `admin.section_media.*` translation keys.
- Added complete English, Hungarian, German, Spanish, and French values for section names, image controls, positions, overlays, defaults, and upload previews.
- Synchronized all missing built-in translation rows, including the recently added property-listing navigation and client account settings keys, into the translation database without overwriting existing admin customizations.

### [Updated] Built-in section image previews

- Section media cards now display their hard-coded public-site background or content image before an admin uploads an override.
- Built-in previews are clearly labelled and remain separate from saved media, so they do not incorrectly mark a section as configured or expose a clear action.

### [Updated] Section image upload pipeline fix

- Replaced section background/content-image uploads through the legacy 5 MB branding endpoint with the direct Appwrite/R2 media pipeline.
- Section images now use the configured storage provider without sending image bytes through the Vercel serverless function and automatically prefer the generated optimized image URL.
- Resolved the UI/server mismatch where section cards accepted files up to 15 MB but the branding endpoint rejected anything above 5 MB.
- Improved branding-upload error parsing so non-JSON and HTTP 413 responses no longer collapse into the generic `Upload failed` message.

### [Fixed] Client property-listing media upload authorization

- Fixed Vercel property-client image uploads returning `Forbidden: Admin access required` from `/api/admin/media/upload/*`.
- Added a shared upload authorization middleware used by both the full Node server and the Vercel admin function.
- Limited the exception strictly to media-upload routes and require a valid `property-listings` scope plus a matching, active linked listing account for property-client sessions.
- Preserved normal admin-role and active-account validation for every admin request, including uploads.

### [Updated] Unified property-site and client-manager design

- Replaced the separate property-page navbar with the same responsive Header component used by the public homepage, including configured light/dark logos, brand display mode, language selector, theme switch, account menu, and mobile drawer.
- Made homepage section links route correctly from standalone property, login, and manager pages instead of targeting missing local anchors.
- Added a shared property-site shell with the public ambient background treatment and footer for `/properties`, property login, and the authenticated listing manager.
- Redesigned the property login as a responsive branded two-panel experience with clearer authentication guidance and mobile-first form controls.
- Redesigned the client listing manager header, search/status toolbar, loading/empty states, listing cards, publication badges, and actions to match the public Aero visual language in both themes.

### [Updated] Immediate public property visibility

- Disabled browser and Vercel CDN caching for the public property list and detail endpoints so newly enabled listings appear immediately instead of leaving a cached empty catalog visible.
- Forced the `/properties` client to bypass its HTTP cache whenever it loads or revisits the catalog.
- Verified against the production API that the enabled listing exists and identified the previous response as an aged Vercel cache hit.

### [New] Vercel property login and manager routing

- Added the missing `/api/property-auth/*` Vercel rewrite to the authentication serverless function, fixing the text 404 response that caused the `Unexpected token 'T'` JSON parsing error.
- Added a dedicated `/api/property-manager/*` serverless function and rewrite with the same scoped-token and active-account checks as the full Node server.
- Hardened the property login and manager clients against non-JSON infrastructure responses so they now show an actionable message instead of leaking a JSON parser exception.

### [New] Public property catalog and advertiser contact

- Added the public `/properties` catalog and `/properties/:id` detail routes for enabled property listings.
- Added responsive property cards with optimized thumbnail media, title, price, description, sale/rental and status labels, plus icon badges for enabled amenity switches.
- Added full listing galleries, structured property facts, equipment details, and direct email contact with the linked advertiser or administrative creator.
- Added cached read-only public listing API endpoints that never return disabled listings and prefer optimized media over original uploads.
- Replaced the former disabled “Coming soon” navigation item with a working Properties link on desktop and mobile.
- Added an admin listing-page switch that controls whether the Properties link appears in the main navigation while keeping `/properties` directly accessible.

### [Fixed] Linked Listing-Account Deletion Integrity

- Extended admin client deletion to remove the linked property-listing account, all owned listings, and their tracked original/optimized/thumbnail media before deleting the portal user.
- Prevented orphaned listing-account and ownership records when a migrated client is removed.

### [New] English property-manager URLs

- Added `/property-listings/login` as the canonical direct property-account login URL.
- Added `/property-listings/manager` as the canonical protected listing-manager URL.
- Kept the previous Hungarian paths as redirect-only compatibility aliases so existing bookmarks remain valid.

### [New] Dedicated property-manager email/password login

- Added a direct `/ingatlanos/bejelentkezes` login page and `/api/property-auth/login` endpoint for previously migrated property-listing accounts.
- The login validates the migrated email against the linked portal user's current bcrypt password and requires password sign-in to be enabled; magic-link users must add a password before migration.
- Added a separate 12-hour `property_client` JWT with a strict `property-listings` scope and independent `property_listing_token` storage, so signing into the property manager does not replace the client-portal session.
- Moved listing management behind `/api/property-manager` and blocked normal client-portal tokens from all listing CRUD operations.
- Removed direct switching from the client portal. The portal now only performs and reports the one-time migration; users subsequently sign in through the dedicated property-manager login.
- Every property-manager request revalidates both the linked listing account and original portal user as active, while scoped sessions are rejected by unrelated client/admin endpoints.

### [New] Linked client property-listing accounts

- Added a separate `property_listing_accounts` table linked one-to-one to existing client-portal users, with an idempotent one-time migration that copies the registered email address and display name.
- Added a client-portal migration gateway and an explicit transition into a dedicated personal property-listing manager; reverse migration/switching remains reserved for the later phase.
- Clients can create, edit, enable/disable, search, upload optimized images for, and delete their own listings with the same data model and form capabilities as administrators.
- Enforced owner-scoped API queries on every client listing read/write/delete operation so a linked account cannot access another owner's listing.
- Added restricted listing-media upload authorization for active linked client accounts without granting access to other admin endpoints; existing admin/editor/viewer/superadmin upload behavior is preserved.
- Added listing ownership, creator user, and creator role fields. Admin listing cards now show who created each listing and which linked account owns it.
- Client display-name changes synchronize to the linked listing account while the original portal and listing-account records remain separate.
- Added the client navigation entry in English, Hungarian, German, Spanish, and French; the public property website remains locked.

### [New] Admin property listing and management system

- Added a dedicated admin Property Listings area with searchable responsive cards, listing status/type badges, edit/delete actions, and an independent publication switch.
- Added a production-safe `property_listings` schema and authenticated admin CRUD endpoints for core details, pricing, dimensions, room counts, description, construction details, orientation, view, bathroom/WC arrangement, multiple heating types, amenities, media, and visibility.
- Added a screen-bounded create/edit modal with basic and detailed sections, yes/no amenity controls, dropdowns, multi-select heating options, image management, and live upload progress.
- Property images use the existing direct-to-storage uploader and automatically create optimized/thumbnail variants; cancelling before save does not upload selected files.
- Removing images while editing or deleting an entire listing also removes tracked original, optimized, and thumbnail media from storage.
- The public real-estate page remains locked and unchanged; only enabled listings are prepared for its later implementation.
- Added the property-listing navigation label in English, Hungarian, German, Spanish, and French.

### [Updated] Client settings endpoint production migration fix

- Moved the client profile/password/TFA compatibility columns into the lightweight migration phase that always runs before the initialized-database fast path.
- Fixed existing Vercel/Turso databases returning `Failed to load account settings` because the settings endpoint selected columns that had not been added after an earlier initialization.
- Added a rolling-deployment compatibility query so the registered email address remains available while additive schema migration finishes.
- Reduced repeated Turso cold-start migration traffic by checking the user schema once and batching only genuinely missing columns.

### [Fixed] Admin client account creation date display

- Fixed SQLite UTC timestamps being interpreted as local timestamps in the admin client portal list.
- Account creation now shows a stable localized date and time in the Budapest timezone, with safe handling for missing, invalid, ISO, and numeric timestamp values.
- Zero-valued timestamps are treated as missing data, preventing the Unix epoch (`1970-01-01`) from appearing as an account creation date.

### [New] Client account change notification emails

- Added an editable `client_account_changed` security email template to the admin email template manager.
- Client display-name changes, password changes, and first-password setup for magic-link accounts now send a security notification email.
- Notifications include a safe change summary, timestamp, request IP address, and direct account-settings link; passwords are never included.
- Unchanged profile submissions do not produce duplicate notification emails.

### [New] Client account settings and password onboarding

- Added a dedicated `/client/settings` portal page and responsive navigation entry for profile and account-security management.
- Clients can save a 2–100 character display name; the authenticated session updates immediately, future password/magic-link sessions include the name, and admin client search/list/detail responses now expose it independently from the CRM name.
- Added authenticated profile read/update endpoints and password-management logic with the existing strong-password policy and bcrypt cost 12.
- Password-based clients must verify their current password before changing it, cannot reuse the same password, and receive clear validation errors.
- Magic-link-created clients can add their first known password without supplying the random internal placeholder, while retaining magic-link sign-in as an alternative.
- Added `password_auth_enabled`, `password_updated_at`, and reserved `tfa_enabled` account fields, plus a one-time compatibility migration that identifies existing magic-link-created accounts.
- Added a disabled two-factor authentication settings card and API status contract so TFA enrollment can be added later without redesigning account settings.
- Added editable English, Hungarian, German, Spanish, and French translation keys; the existing missing-key synchronizer persists them to the database during setup.

### [Fixed] Client password-registration email audit

- Prevented duplicate public signup/login magic-link emails with a synchronous client submit lock plus an atomic 45-second server-side idempotency window keyed by normalized email and link type.
- Only the request that inserts the fresh magic-link record may dispatch an email; Vercel retries and simultaneous instances now return success without generating or sending a second token.
- Failed provider deliveries remove their unused idempotency record so a legitimate retry is not blocked.
- Audited the public client password-registration path separately from the already verified admin invitation/magic-link workflow.
- Fixed unreliable Vercel delivery by awaiting the registration welcome email before returning the successful authentication response instead of starting fire-and-forget work after account creation.
- Added the dedicated, independently editable `client_password_registration` onboarding template with branded HTML/plain-text bodies, login CTA, registration method/date, registered email, studio, and support tokens.
- Kept account creation successful when the email provider reports a delivery failure, while recording the delivery result in email logs and returning a non-sensitive delivery status with the registration response.
- Preserved the existing `account_verification` template and admin invitation workflow unchanged.

### [Updated] Persistent admin gallery background uploads

- Portfolio records can now be created and saved before any gallery media is attached, providing the persistent gallery id required for subsequent background uploads.
- Published-but-empty portfolio records remain available in the admin CMS but are excluded from the public portfolio and its navigation until they receive media.
- Moved saved portfolio-gallery image and video uploads into an AdminLayout-level background queue so transfers continue when the editor modal closes or the administrator navigates to another admin page.
- Added a persistent floating upload monitor with queued, active, completed, failed, per-file progress, and gallery context states.
- Completed uploads are attached to the saved portfolio immediately through a dedicated authenticated endpoint, preventing successful bucket uploads from becoming orphaned when the portfolio page unmounts.
- Kept uploads sequential across batches to protect Appwrite/R2 endpoints from avoidable concurrent rate-limit pressure, and added a browser-tab close warning while transfers are active.
- New, not-yet-saved portfolio records retain the foreground workflow because no persistent gallery id exists until their first save.

### [New] Vercel build pipeline optimization

- Split the frontend and standalone Express server builds into explicit `build:client` and `build:server` tasks while preserving the complete local/standalone `npm run build` workflow.
- Added a Vercel-specific build task that emits only the Vite frontend because Vercel packages the `api/*.ts` serverless entrypoints independently.
- Removed the unused standalone `dist/server.cjs` bundle and its source map from Vercel build output, avoiding roughly 3.8 MB of redundant generated deployment artifacts and an unnecessary server bundling pass on every deployment.
- Removed the unused direct `uuid` and `zod` dependencies from the npm manifest and lockfile, reducing installation and dependency-tracing work without changing application behavior.
- Regenerated `package-lock.json` from a clean npm state after dependency pruning so optional Tailwind WASI packages (`@emnapi/core` and `@emnapi/wasi-threads`) remain represented and Vercel's strict `npm ci` validation succeeds.

### [Updated] Portfolio media lifecycle, optimized delivery, and showcase refinements

### [Updated] Upload and storage reliability

- Replaced repeated client-side Appwrite account-session creation with short-lived API-key-authenticated upload sessions to avoid the per-IP and per-user session endpoint rate limit during multi-file and video uploads.
- Kept gallery transfers direct from the browser to Appwrite so Vercel does not proxy large file bodies, and added retry handling for temporary rate-limit responses.
- Changed gallery uploads to run sequentially with clearer per-file and overall progress feedback.
- Added automatic optimized-image creation during upload: each image retains its original master and receives a high-quality JPEG derivative constrained below 10 MB, with adaptive dimensions and quality when needed.
- Preserved optimized JPEG delivery for client downloads while using derivatives for admin and public previews to prevent large source images from slowing the interface.

### [New] Email branding

- Added an email-header branding selector for uploaded logo only, uploaded logo with studio name, or studio name only.
- Connected transactional, marketing, preview, and test-email layouts to the uploaded light header logo, with the dark logo as fallback and the public header mode used until an email-specific mode is saved.

### [Fixed] Portfolio Data and Media Cleanup

- Fixed the admin customer editor's remaining `null.trim()` failure in the full CRM update route by normalizing every optional customer field before persistence.
- Customer-editor saves now atomically synchronize the complete property and listing-link collections, use the linked portal user as the canonical owner when present, and remove stale duplicate CRM/portal rows so newly added addresses appear in both admin and client views.
- Replaced raw customer security-audit action codes and JSON blobs in the admin detail view with readable event titles, labelled fields, normalized statuses and booleans, wrapped reason text, and a taller responsive history panel; all new audit copy is available in English, Hungarian, German, Spanish, and French and synchronized to the editable translation database.
- Fixed new client-property creation and editing when legacy or incomplete records contain a `null` property name, address, metadata, or request body; client and admin endpoints now normalize values before trimming and return address validation instead of a runtime exception.
- Corrected localized portfolio names and categories in admin cards and category selectors so translated values render instead of serialized objects or translation keys.
- Portfolio updates now compare the previous and saved gallery media sets and delete removed originals, optimized images, thumbnails, posters, and previews from storage.
- Full and bulk portfolio deletion use the same storage cleanup path before database removal.
- Added URL-based Appwrite bucket/file detection so older objects not present in `media_uploads` can also be removed safely.
- Cleared stale `media_url` and `thumbnail_url` references when their corresponding gallery items are removed.

### [Fixed] Public showcase and visual fixes

- Fixed Social Tree group/link creation and editing with null-safe request normalization, validated parent groups, normalized platform/icon identifiers, and explicit create responses.
- Restored the missing Social Tree header controls by passing them through the supported `PageHeader.action` slot instead of the ignored `actions` prop; Add Group and Add Social Link are now always visible and expand appropriately on mobile.
- Rebuilt the Social Tree add/edit modal as a viewport-bounded flex layout with fixed header/actions, an independently scrollable form body, compact mobile spacing, responsive selectors, and full-width mobile buttons so no fields or save controls extend beyond the screen.
- Corrected the Social Tree update route's LibSQL `Value` inference by explicitly normalizing persisted node type and URL values to strings before URL validation, restoring strict TypeScript/Vercel deployment compatibility.
- Unified social icon rendering across the admin tree, editor preview, public popup, and footer; legacy FontAwesome-style identifiers now resolve correctly, unknown stored icons fall back to the selected platform, missing group icons are supported, and card text colors are no longer overridden by hardcoded inline brand colors.
- Optimized the mobile Visual Ideas section with contained, non-blurred, transition-free cards and deferred grid painting, reducing main-thread and compositing work while the section is visible.
- Corrected mobile Portfolio gesture handling so horizontal gallery interaction no longer captures vertical page scrolling; disabled smooth-scroll work, fixed mobile background attachment, and contained each row's paint area.
- Reduced mobile Portfolio media pressure by mounting two cards per row initially, adding further cards in smaller batches, using a lighter viewport observer, and showing image posters instead of initializing video decoders during touch scrolling.
- Added the admin-managed “What Makes a Good Real-Estate Visual?” section directly before pricing, with a responsive five-column desktop grid, a hard 15-card/three-row limit, localized title and description fields, ordering controls, visibility control, and no public navigation entry.
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

### [Fixed] Public Loading and Low-End Device Performance

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

### [New] Vercel serverless architecture

- Split the combined billing Function into independent budget, invoice, payment-request, and referral Functions with domain-specific duration limits.
- Moved public invoice routes and public referral-code validation into dedicated read-oriented Functions.
- Extracted health and incident-status endpoints into a lightweight system Function that does not run database initialization.
- Removed public invoice/referral imports from the general public/auth router bundle and restored their mounts explicitly in the local full-server router.
- Removed the all-in-one `api/index.ts` compatibility Function and its catch-all rewrite after auditing every active API prefix, preventing Vercel from packaging the complete backend again on every deployment.

### [Updated] Pricing bundles

- Bundle cards now hydrate referenced base tiers from current catalog data rather than retaining stale embedded snapshots.
- Expanded tier content shows the complete, current feature list and included items without truncation.

### [Updated] Verification

- All 11 Vercel Function entry points were bundled independently after the serverless domain split, alongside successful production frontend and full local-server bundles.
- Production Vite builds and server ESBuild bundles completed successfully after the portfolio, upload, storage, pricing, and public-interface changes.

## 2026-08-18 — Platform expansion, client delivery, finance, email automation, and Vercel architecture

### [New] Public website and AERO/GLOW visual consistency

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

### [Updated] Contact form, pricing estimate, and travel calculation

- Bundle cards now resolve referenced tiers from the current pricing catalog instead of stale embedded snapshots; expanding a tier shows its complete current feature and included-item content without text truncation, and pricing endpoints bypass stale browser/CDN caches.
- Reordered the inquiry journey to collect identity, property city/address, and preferred photography time before package selection, add-ons, estimate, message, and submission.
- Property city is now required before package/add-on interaction and is clearly identified as an input for the travel and final-price calculation; property address remains optional.
- Added automatic round-trip travel-distance calculation from Hódmezővásárhely, Hungary, and integrated distance fee rules into the live package estimate.
- Standardized input-group spacing, responsive gaps, card padding, helper text, and error-state layout throughout the form.
- Contact submissions persist package, add-on, calculated fee, distance, total, and currency data.
- Both inquiry email templates now include a structured package summary, database-verified base price, selected items, calculated fees, explanations, currency, and estimated total in HTML and text form.
- Added editable inquiry-template tokens for package price, selected-item rows/text, calculated-fee rows/text, currency, and final estimate; existing customized templates inherit newly introduced token definitions without being overwritten.
- Updated the preferred-date label to “When I would like the photography” consistently in the public form and admin interface.

### [New] Cookie consent and legal content

- Added a frosted-glass cookie banner with preference controls, localized text, translation-manager keys, and a direct Cookie Policy action.
- The contact form remains locked until the required cookie consent has been granted.
- Added database-backed Privacy Policy, Terms and Conditions, Cookie Policy, and Legal Notice documents.
- Added full-page WYSIWYG editing with formatting tools in the admin panel and rendered formatted document modals on the public website.
- Added footer links that open the corresponding public legal-document modals.

### [New] Client authentication, accounts, and project portal

- Added direct password registration and login alongside magic-link authentication for client and admin workflows.
- Corrected client account creation, magic-link registration/login, invitation handling, and active-account validation.
- Strengthened direct admin account creation with a random, single-use email verification code and an editable verification-code template.
- Corrected team invitation template selection, team-member creation, team assignment, invitation resend/revoke, and account verification flows.
- Fixed project preview images, attached-gallery counts, and invoice/customer matching by normalized email address in the client portal.
- Archived paid invoices remain visible to clients as paid records while admins can manually archive completed invoices.

### [New] Secure gallery delivery and downloads

- Added project-gallery downloads to the client portal, including individual selection, multi-select, and generated ZIP archives.
- Added four-digit gallery PIN delivery in the gallery-ready email, PIN verification, forgotten-PIN resend, and automatic PIN rotation on every resend.
- Locked downloads receive a server-generated continuous “Courtesy of SPS Studio” marketplace-style watermark; unlocked downloads return originals.
- Added right-click protection and watermarked save behavior for locked previews.
- Added video frame thumbnails and a large-image/lightbox modal in client galleries.
- Added a separate optimized-image download category for project images below the configured delivery threshold, using the same PIN and watermark policy.
- Removed the obsolete gallery-level type selector because media type is managed per gallery item.
- Corrected structured gallery filenames so restructuring updates both the bucket object name and database metadata.

### [Updated] Portfolio and media storage performance

- Portfolio gallery deletion now removes every tracked original, thumbnail, poster, preview, and optimized asset from Appwrite, R2, or local storage before deleting database records; failed storage cleanup prevents a false-success gallery deletion.
- Reduced portfolio memory pressure by preventing all videos from autoplaying while keeping motion-rich portfolio rows and hover playback.
- Added direct browser-to-Appwrite upload sessions for large/chunked media so Vercel does not buffer files or write to its read-only deployment filesystem.
- Added Appwrite upload registration, public URL construction, bucket diagnostics, and alphanumeric upload-label handling independent of Appwrite user authentication.
- Retained R2 multipart support and moved Vercel-only temporary work to the writable system temporary directory.
- Removed obsolete root-level patch and manual test scripts after verifying they were unreferenced development artifacts.

### [Fixed] Finance, Invoices, Budgets, and Payment Requests

- Removed automatic demo budget-entry and payment-request seeding, and added narrowly matched legacy-demo cleanup so deleted sample finance data cannot reappear while genuine records remain untouched.
- Corrected invoice-to-client association and portal visibility using normalized email matching.
- Added paid-invoice behavior that disables repeat payment requests and replaces the action with manual archival.
- Updated downloadable/printable invoices to use a print-safe version of the email visual language.
- Corrected invoice and payment-email rendering and exposed the relevant templates in the email editor.
- Added superadmin CRUD management for payment-request categories.
- Added default-currency configuration and applied it to budget, invoice/payment, and payment-request summary cards.
- Fixed budget-entry persistence and “Budget entry not found” update failures.
- Corrected payment email conditionals and beneficiary-account token handling.

### [Updated] Email system and automation

- Expanded the editable transactional-template catalog with gallery PIN recovery, admin verification, invoice/payment, payment-request status, and Google review templates.
- Removed internal template names from rendered email bodies.
- Exposed editable header/footer text and all textual template tokens while preserving token aliases and conditional rendering.
- Added milestone and project-update email delivery from the admin project timeline.
- Added Google review campaigns after `gallery_ready`: 1 hour, +3 hours, +1 day, +5 days, and +10 days; clicking the tracked review link cancels remaining reminders.
- Added reusable, database-backed marketing email templates with manual recipient dispatch from the admin panel.
- Corrected marketing-template creation and missing admin translation values.
- All generated email action URLs now use canonical `APP_URL`; the request host is only a local-development fallback.

### [Updated] Localization and translation management

- Audited public, admin, client-portal, budget, invoice/payment, and payment-request UI strings and repaired missing or invalid translation keys.
- Added missing database translation records and expanded the translation manager to include client-portal and newly introduced cookie/contact strings.
- Reorganized localization dropdown groups so editable strings appear under their owning product area.
- Added English, Hungarian, German, Spanish, and French contact travel/calculator guidance.

### [Fixed] Vercel and server architecture

- Fixed Node/TypeScript build issues across Express response/request types, LibSQL client typing, Node crypto, Sharp imports, AWS S3 clients, referral unions, and ESM translation imports.
- Removed runtime creation of `/var/task/uploads`; Vercel uses writable temporary storage only for short-lived processing.
- Split the Vercel API into domain functions: `public`, `auth`, `admin`, `client`, and `billing`, with `index` retained as a compatibility fallback.
- Added shared Vercel CORS, body parsing, database bootstrap, error handling, and extracted authentication middleware.
- Routed budgets, invoices, payment requests, and referrals to the isolated billing function and assigned function-specific duration settings.
- Added canonical application URL resolution and forwarded-host fallback handling.
- Production frontend, local server, and each Vercel function entry were independently bundled and verified.

### [Updated] Verification

- Repeated Vite production builds completed successfully after the public UI, contact, localization, and email changes.
- Server and individual Vercel function bundles completed successfully with ESBuild.
- Targeted TypeScript checks passed for the Vercel entry points, shared bootstrap, contact API, and email template pipeline.

## 2026-08-17 — AERO/GLOW design integration for 2.0

### [Updated] Visual foundation

- `src/index.css` — integrated the complete blue-white AERO/GLOW design system, section-aware ambient gradients, themed photographic section backgrounds, frosted-glass surfaces, responsive breakpoints, reduced-motion handling, and separate light/dark WCAG-oriented color variables.
- `public/images/*.png` — added four locally served thematic backgrounds for hero, services, portfolio, contact, authentication, and workspace surfaces.
- `png-k/*.png` — retained standalone source copies of the four generated image assets in the project root.

### [Updated] Shared UI and workspaces

- `src/components/ui/Card.tsx` — added the shared `aero-ui-card` glass surface hook.
- `src/components/ui/Button.tsx` — added the shared animated `aero-ui-button` hook.
- `src/components/ui/Input.tsx` and `Textarea.tsx` — added the accessible animated `aero-ui-input` hook.
- `src/components/AdminLayout.tsx` — applied the themed admin workspace and translucent content layer without changing routes or authorization.
- `src/components/ClientLayout.tsx` — applied the client glass workspace, responsive spacing, animated navigation items, and active-page semantics while retaining the new projects, invoices, and referrals navigation.
- `src/components/admin/Sidebar.tsx` — applied frosted sidebar styling, glow hover highlighting, active states, submenu styling, and danger-action treatment while retaining all 2.0 permissions and routes.

### [Updated] Public and authentication surfaces

- `src/pages/PublicHome.tsx` — added stable intersection-based active-section tracking and a smooth ambient color layer; retained the new Pricing section and all existing content/API flows.
- `src/pages/AdminLogin.tsx`, `AdminSetup.tsx` — added the photography-themed admin authentication background.
- `src/pages/ClientLogin.tsx`, `ClientRegister.tsx`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`, `VerifyMagicLinkPage.tsx` — added the matching client authentication design.

### [Updated] Development reliability and documentation

- `server.ts` — replaced the fixed port with `process.env.PORT` support while retaining port `3000` as the default.
- `README.md` — documented the design system, image locations, i18n audit script, and configurable local port.

### [Updated] Verification

- Installed all declared dependencies successfully.
- Production build completed successfully before and after the design integration.
- Public home, portfolio, pricing, contact, FAQ, social modal, and initial admin setup rendered in the local browser.
- Browser console contained no warning or error entries on the inspected public view.
- The existing production APIs, Turso/local LibSQL selection, storage providers, email integration, and external connections were not removed or replaced.

### [Updated] Color consistency follow-up

- Locked public, admin, client, and authentication chrome to separate WCAG-oriented AERO light/dark palettes so legacy database theme colors cannot reintroduce an amber primary color.
- Converted non-semantic public purple, violet, amber, and orange accents to blue/cyan equivalents.
- Retained orange/yellow for genuine warning, incident, overdue, and attention states where color communicates status.
- Recolored the announcement bar to a blue-cyan gradient and replaced the hero's amber key light with a cyan rim light.

### [Updated] Exact original-design synchronization

- Replaced the generic 2.0 hero markup with the original cinematic hero structure, including its exact full-height composition, locally served background image, title treatment, CTA buttons, Production Scope glass card, service rows, noise layer, and footer metadata.
- Synchronized the original Vision, About, Services, FAQ, and Footer component structures and animation timings.
- Restored the original `aero-header` and `aero-nav` header surfaces while preserving the 2.0 Pricing navigation, information bar, theme control, and role-aware account menu.
- Applied the original Portfolio image-section framing to the 2.0 animated marquee implementation instead of removing its new media functionality.
- Applied the original Contact glass-form, animated input, and submit-button classes while retaining plan selection, add-ons, fee calculations, availability fields, map, and all 2.0 submission data.
- Locked public, admin, client, and authentication headings and body copy to the original Plus Jakarta Sans stack; removed the unintended Playfair Display override loaded from the new database theme.
- Disabled automatic opening of the social popup so the initial page state matches the original site.
- Compared the original site on port 3002 and the advanced site on port 3003 using rendered computed styles. Hero height, corner radius, title size/weight, Production Scope surface, CTA dimensions, and core typography now match the original values.

### [Updated] Contact contrast and portfolio conveyor fix

- Forced the Contact section's left-column heading and information text to the original near-white values in dark mode; the rendered heading now resolves to `rgb(247, 252, 255)`.
- Added the missing continuous left/right marquee keyframes used by the advanced portfolio rows.
- Portfolio rows now start moving automatically as seamless duplicated-track conveyors.
- Removed automatic hover/touch pausing and the competing reduced-motion mode from this showcase; only the explicit Stop/Continue conveyor button changes playback.
- Verified live transforms over time, confirmed an unchanged transform while paused, and confirmed movement resumes after continuing.
