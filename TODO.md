# Project TODO

## Vercel build and Function optimization

- [ ] Measure dependency installation, frontend build, Function bundling, checking, and deployment durations separately in Vercel Build Diagnostics.
- [ ] Extract dedicated public and authentication routers so `api/public.ts` and `api/auth.ts` no longer import the same combined API module.
- [x] Audit every `/api` route, then remove the full `api/index.ts` compatibility fallback without breaking existing URLs.
- [ ] Ensure heavy server dependencies such as Sharp, AWS SDK, Appwrite server SDK, and billing modules are imported only by Functions that use them.
- [ ] Add a Vercel-specific frontend-only build command so the unused local `dist/server.cjs` bundle is not generated during deployment.
- [ ] Analyze Function output sizes with Vercel build diagnostics and confirm that static media or unrelated modules are not included in server bundles.
- [ ] Compare cold and cached deployment times before and after the refactor.
- [x] Bundle-check all public, authentication, admin, client, budget, invoice, payment-request, referral, upload, email, public-billing, and system Function entry points after restructuring.
- [ ] Confirm that the refactor improves or preserves public cold-start latency as well as reducing build time.

Target: reduce the current approximately two-minute Vercel deployment while preserving the existing split Function behavior and API compatibility.

## 0. Alapok – adatmodell és jelenlegi rendszer konszolidációja

- [x] `Client → Property → Project` kapcsolat: a projekthez kötelező ügyfél, opcionális ügyfélhez tartozó ingatlan kapcsolható.
- [x] Projekt–galéria kapcsolat: a meglévő `project_portfolio_items` kapcsolótábla használata megmaradt.
- [x] Számla, költség és Payment Request opcionálisan projekthez kapcsolható az adatmodellben.
- [x] Törlési védelem: ügyfél, ingatlan, projekt, számla és költség nem törölhető, ha kapcsolódó üzleti/pénzügyi rekordot veszélyeztetne.
- [x] Legacy `property_address` / `advertisement_link` értékek idempotens átvezetése a normalizált ingatlan- és linktáblákba.
- [x] Hiányzó vagy inkonzisztens üzleti kapcsolatok olvasható auditja: `GET /api/admin/business-relations/audit`.
- [x] Kapcsolatellenőrzés számla-, költség- és Payment Request-mentéskor.
- [x] Projekt- és ingatlanválasztás a pénzügyi szerkesztőkben: számla, költség és Payment Request.
- [ ] A régi mezők UI-ból való teljes kivezetése, az adatok kézi ellenőrzése után.
