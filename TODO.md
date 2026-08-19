# Project TODO

## Vercel build and Function optimization

- [ ] Measure dependency installation, frontend build, Function bundling, checking, and deployment durations separately in Vercel Build Diagnostics.
- [ ] Extract dedicated public and authentication routers so `api/public.ts` and `api/auth.ts` no longer import the same combined API module.
- [ ] Audit every `/api` route, then remove or minimize the full `api/index.ts` compatibility fallback without breaking existing URLs.
- [ ] Ensure heavy server dependencies such as Sharp, AWS SDK, Appwrite server SDK, Google GenAI, and billing modules are imported only by Functions that use them.
- [ ] Add a Vercel-specific frontend-only build command so the unused local `dist/server.cjs` bundle is not generated during deployment.
- [ ] Analyze Function output sizes with Vercel build diagnostics and confirm that static media or unrelated modules are not included in server bundles.
- [ ] Compare cold and cached deployment times before and after the refactor.
- [ ] Verify all public, authentication, admin, client, billing, upload, email, and fallback routes after restructuring.
- [ ] Confirm that the refactor improves or preserves public cold-start latency as well as reducing build time.

Target: reduce the current approximately two-minute Vercel deployment while preserving the existing split Function behavior and API compatibility.
