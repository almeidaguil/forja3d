# V2 Roadmap — Forja3D

This document tracks everything that needs to be designed, built, or migrated when evolving Forja3D from a static client-side tool (V1) into a full product with authentication, payments, and a backend.

Update this document whenever a V1 decision has a V2 implication. Also look for `// V2:` comments in the source code.

---

## V1 → V2 transition summary

| Area | V1 (current) | V2 (target) |
|---|---|---|
| Hosting | GitHub Pages (static) | Vercel / Railway + backend API |
| Rendering | Client-side (OpenSCAD WASM + Three.js) | Server-side (Node.js + OpenSCAD binary) |
| Authentication | None | Google OAuth / email (Auth.js or Supabase) |
| User data | None | User profile, saved models, history |
| Payments | None | Stripe Checkout + credit system |
| File storage | None (direct download) | S3 (or Supabase Storage) for generated files |
| Model catalog | Static JSON files in repo | Database (Postgres) via API |
| Preview format | STL only | STL + 3MF |
| Languages | PT-BR only | PT-BR, EN-US, ES |
| Analytics | None | PostHog or Plausible |

---

## Backend API

V2 requires a REST (or tRPC) API. Proposed endpoints:

```
GET  /api/models              → list all models with metadata
GET  /api/models/:slug        → get single model config and parameters
POST /api/generate            → compile model server-side, return file URL
GET  /api/user/me             → authenticated user profile
GET  /api/user/history        → user's generation history
POST /api/credits/checkout    → create Stripe Checkout session
POST /api/webhooks/stripe     → handle Stripe payment events
```

### V1 impact

The `generateModel` use case in `src/application/useCases/generateModel/` must be designed so the rendering step is swappable. In V1 it calls `IOpenScadRenderer` (WASM). In V2, it should call `IOpenScadRenderer` backed by an HTTP call to `/api/generate`. No application or domain code should change — only the infrastructure adapter.

**Action required in V1**: Ensure `IOpenScadRenderer` interface is stable and not tightly coupled to WASM internals.

---

## Authentication

V2 users must register and log in before generating models beyond a free tier.

### Recommended stack

- **Auth.js** (formerly NextAuth) if migrating to Next.js
- **Supabase Auth** if staying with a plain Vite + separate backend architecture
- **Clerk** as a managed alternative (faster to ship)

### V1 impact

No auth code should exist in V1. However, the routing structure in `src/presentation/pages/` should be designed to accommodate protected routes in V2.

**Action required in V1**: Use a `router` abstraction (React Router or TanStack Router) so that auth guards can be added without rewriting page structure.

---

## Credit system

Each model generation costs credits. Users buy credit packs via Stripe.

### Data model

```
User {
  id
  email
  credits: number
  stripeCustomerId: string
}

GenerationJob {
  id
  userId
  modelSlug
  parameters: JSON
  status: 'pending' | 'done' | 'error'
  outputUrl: string
  creditsCharged: number
  createdAt: datetime
}

CreditPack {
  id
  credits: number
  priceUsd: number
  stripeProductId: string
}
```

### Credit cost per model (proposed)

| Model type | Credits |
|---|---|
| Simple parametric (keychain, sign) | 1 |
| Image-based (cookie cutter, stamp) | 1 |
| Complex multi-part | 2 |

### V1 impact

The `GenerationResult` domain type should include a `creditsRequired` field so the UI can show it without a backend call. In V1 this will be hardcoded; in V2 it comes from the API.

**Action required in V1**: Add `creditsRequired: number` to the `Model` entity even though it's unused in V1.

---

## Server-side rendering

V1 uses OpenSCAD WASM in the browser. V2 will compile OpenSCAD on the server for:
- Faster generation (native binary vs. WASM)
- Better error reporting
- Ability to serve cached results

### Migration path

1. In V1, `OpenScadWasmRenderer` implements `IOpenScadRenderer` using WASM
2. In V2, create `OpenScadApiRenderer` that POSTs the SCAD code to `/api/generate` and returns the STL blob
3. Inject the correct adapter via dependency injection at the app root
4. No use case or domain code changes

### V1 impact

Keep `.scad` templates as pure strings — no WASM-specific APIs embedded in them.

---

## File storage

V1 generates STL in memory and triggers a browser download immediately. V2 must:
- Store generated files in S3 / Supabase Storage
- Associate files with user accounts
- Allow re-download from user history

### V1 impact

The `exportStl` use case should return an `ArrayBuffer`. In V1, the presentation layer triggers `URL.createObjectURL()` to download it. In V2, the use case will instead call `IFileStorage.upload()`. Keep download logic in the presentation layer, not in the use case.

---

## 3MF export

V1 exports STL only. V2 should also support 3MF (better color information, supports multi-material slicers like Bambu Studio).

### V1 impact

The `IStlExporter` port should be renamed to `IModelExporter` with a `format` parameter, or an additional `IThreeMfExporter` port should be added alongside it.

---

## Internationalization (i18n)

V2 targets PT-BR, EN-US, and ES.

### Recommended library: `react-i18next`

### V1 impact

All user-facing strings in V1 should live in component props or constants, never hardcoded inline in JSX. This makes extraction to translation keys straightforward in V2.

**Action required in V1**: Never hardcode display strings inline. Use a `label` prop or a shared constants file.

---

## Analytics

V2 will track:
- Which models are most generated
- Conversion rate (preview → download → purchase)
- Error rates per model

### Recommended: PostHog (open source, self-hostable) or Plausible (privacy-first)

### V1 impact

None. Do not add analytics tracking in V1.

---

## Model catalog — database migration

V1 models are defined as static JSON files in `src/data/models/`. V2 will serve them from a database.

### Migration path

1. V1 JSON files become the seed data for the database
2. The `IModelRepository` port (to be defined in V1's application layer) will have:
   - V1 implementation: reads from `src/data/models/*.json`
   - V2 implementation: fetches from `/api/models`
3. No domain or use case code changes on migration

**Action required in V1**: Define and use an `IModelRepository` interface in the application layer. Do not import JSON files directly in components.

---

## Infrastructure / hosting

### V2 target architecture

```
Browser → Vercel (frontend, Next.js or SPA)
       → Railway / Render (API server, Node.js)
              → Postgres (user data, model catalog, jobs)
              → S3 / Supabase Storage (generated STL/3MF files)
              → Stripe (payments)
              → Google OAuth (auth)
```

### Domain / custom URL

Register a custom domain (e.g., `forja3d.com`) and point it to Vercel. Configure DNS before V2 launch.

---

## V2 launch checklist (future reference)

- [ ] Backend API implemented and deployed
- [ ] Authentication working (Google OAuth + email)
- [ ] Credit system implemented
- [ ] Stripe Checkout tested end-to-end
- [ ] S3 storage for generated files
- [ ] STL + 3MF export
- [ ] PT-BR, EN-US, ES translations complete
- [ ] Custom domain configured
- [ ] Analytics set up
- [ ] Error monitoring (Sentry or similar) set up
- [ ] Rate limiting on API endpoints
- [ ] Terms of service and privacy policy pages
- [ ] Cookie banner (LGPD / GDPR)

---

## Notes from V1 development

> This section is updated as V1 is built. Each entry references the relevant source file and describes the V2 implication.

| Date | File | Note |
|---|---|---|
| 2026-04-14 | `src/application/useCases/generateModel/` | `IOpenScadRenderer` interface must remain stable for V2 HTTP adapter swap |
| 2026-04-14 | `src/domain/model/` | Add `creditsRequired: number` to `Model` entity — unused in V1, required in V2 |
| 2026-04-14 | `src/infrastructure/three/ThreeStlExporter` | Rename port to `IModelExporter` before V2 to accommodate 3MF |
