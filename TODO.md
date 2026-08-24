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
- [x] Helyi end-to-end ellenőrzés: ügyfél → ingatlan → projekt → galéria → költség → számla → Payment Request lánc, projekt- és számlakapcsolattal.
- [x] Payment Request–számla–projekt és Payment Request–költség kapcsolat konzisztencia-ellenőrzése, jóváhagyáskori projektörökléssel.
- [x] Kapcsolati audit kibővítése számla–ingatlan, Payment Request–számla/költség és galéria árva kapcsolatokra.
- [x] Új, üres adatbázis sémája is tartalmazza a konszolidált projekt- és ingatlankapcsolatokat.
- [ ] A régi mezők UI-ból való teljes kivezetése, az adatok kézi ellenőrzése után.

## 1. Property Core – az ingatlan legyen önálló központi objektum

- [x] Önálló `Property` modell és több ügyfélhez rendelhető `property_clients` kapcsolat.
- [x] Egy Property-hez több Listing kapcsolható; a régi hirdetések automatikusan saját Property-t kaptak.
- [x] Property archiválási API és Listing külön láthatóság-/aktiváláskapcsoló.
- [x] Archivált Property hirdetése nem jelenik meg publikus oldalon, de a Property és a korábbi Listing rekordok megmaradnak.
- [ ] Property- és Listing-specifikus mezők teljes fizikai szétbontása a régi hirdetési adatok kézi ellenőrzése után.
- [x] Property adatlap backend: alapadat-mezők, kapcsolati listák és activity timeline tárolás.
- [x] Projektből új Property létrehozása cím-alapú duplikációvédelemmel és kompatibilis ügyfélkapcsolattal.
- [x] Önálló admin Property adatlap kapcsolati listákkal és automatikus Property activity timeline eseményekkel.
