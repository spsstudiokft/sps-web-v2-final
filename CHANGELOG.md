# Modification Log

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
