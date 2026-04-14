# AGENTS.md — Forja3D

Instructions for AI agents working on this codebase.

---

## Project overview

**Forja3D** is a browser-based parametric 3D model generator built with React + TypeScript + Vite. It runs entirely client-side — no backend, no authentication in V1. All 3D model generation happens via OpenSCAD WASM or Three.js geometry.

See [README.md](README.md) for the user-facing description.

---

## Architecture rules (non-negotiable)

This project follows **Clean Architecture** + **Domain-Driven Design**. Respect these layer boundaries strictly:

```
domain → has no dependencies on any other layer
application → depends only on domain
infrastructure → depends on domain and application (implements interfaces)
presentation → depends on application (never on infrastructure directly)
shared → depended on by all layers
```

- **Never** import infrastructure directly from presentation
- **Never** import React from domain or application layers
- **Never** put business logic inside React components — use application use cases
- Interfaces (ports) are defined in `application/` or `domain/`; implementations (adapters) are in `infrastructure/`

---

## Folder structure

```
src/
├── domain/
│   ├── model/              # Model entity, value objects
│   ├── parameter/          # Parameter types and validation
│   └── generation/         # GenerationResult, GenerationStatus
├── application/
│   └── useCases/
│       ├── generateModel/  # Orchestrates WASM/Three.js generation
│       ├── traceImage/     # Orchestrates image → SVG tracing
│       └── exportStl/      # STL export logic
├── infrastructure/
│   ├── openscad/           # OpenSCAD WASM adapter
│   ├── tracer/             # Image tracing adapter (Potrace/canvas)
│   ├── three/              # Three.js geometry builder and STL exporter
│   └── storage/            # File I/O helpers
├── presentation/
│   ├── components/
│   │   ├── ModelViewer/    # Three.js canvas component
│   │   ├── ParameterForm/  # Dynamic parameter form
│   │   ├── ImageUpload/    # Drag-and-drop image input
│   │   ├── ModelCard/      # Model listing card
│   │   └── ui/             # Generic UI primitives (Button, Input, etc.)
│   ├── pages/
│   │   ├── Home/           # Model catalog page
│   │   └── ModelEditor/    # Editor page with form + preview
│   └── hooks/              # Custom React hooks (useModelGenerator, etc.)
├── shared/
│   ├── types/              # Global TypeScript types
│   ├── utils/              # Pure utility functions
│   └── constants/          # App-wide constants
└── data/
    └── models/             # JSON configs for each available model
```

---

## Code standards

### General
- Language: **TypeScript** — strict mode, no `any`
- Style: **Tailwind CSS** — no inline styles, no CSS modules
- Follow **Clean Code** principles: functions do one thing, clear naming, no magic numbers
- Maximum function length: 30 lines. Break down if longer
- No commented-out code — delete it
- No `console.log` in production code — use a logger or remove

### Naming conventions
- Files: `camelCase.ts` for modules, `PascalCase.tsx` for React components
- Directories: `camelCase/`
- Interfaces: prefix with `I` only for ports/adapters (e.g., `IModelRenderer`)
- Types: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`

### React components
- Functional components only — no class components
- Each component in its own directory with an `index.tsx`
- Props typed with a named interface in the same file
- No logic beyond rendering and event delegation inside components — delegate to hooks

### Domain
- Entities are immutable value objects where possible
- Validate at entity construction, not at use-site
- Domain layer must have zero external dependencies

---

## Git workflow

**Never commit directly to `main` or `develop`.**

| Branch | Purpose |
|---|---|
| `main` | Protected. Only merged from `develop` via PR after review. |
| `develop` | Integration. Merge feature branches here. |
| `feature/<name>` | New features |
| `fix/<name>` | Bug fixes |
| `docs/<name>` | Documentation-only changes |
| `chore/<name>` | Tooling, deps, config |

### Commit messages — Conventional Commits

Format: `<type>(<scope>): <subject>`

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `style`

Examples:
```
feat(cookie-cutter): add image upload and contour tracing
fix(model-viewer): correct camera position on model update
docs(architecture): add ADR for Three.js geometry approach
refactor(domain): extract parameter validation to value object
```

---

## V2 awareness

As you work on V1 features, always check if your implementation has implications for V2. If it does:
- Note it in the relevant section of [docs/V2_ROADMAP.md](docs/V2_ROADMAP.md)
- Leave a `// V2: <note>` comment near the relevant code

V2 will introduce: authentication, credit system, server-side rendering, Stripe payments. Design V1 code to be replaceable, not rewritten.

---

## Key technical decisions

1. **No backend in V1** — all rendering is client-side (OpenSCAD WASM + Three.js)
2. **OpenSCAD WASM** — for parametric models with text/geometry (keychains, signs)
3. **Three.js ExtrudeGeometry** — for image-based models (cookie cutters, stamps); faster than WASM
4. **Potrace / Canvas API** — for image-to-SVG tracing in the browser
5. **STL export** — via Three.js `STLExporter`; 3MF support is a V2 concern
6. **GitHub Pages** — static hosting, no server required

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full ADR details.

---

## Testing guidelines (future)

- Unit tests: Vitest — domain and application layers only
- No tests for infrastructure adapters in V1 (too tightly coupled to WASM/Three.js)
- No snapshot tests — behavior tests only
- Test file next to the module: `model.test.ts` alongside `model.ts`

---

## What to avoid

- Do not add backend code, servers, or environment variables pointing to external APIs in V1
- Do not add authentication code in V1
- Do not use `any` in TypeScript — use `unknown` and narrow types
- Do not import heavy dependencies in the domain layer
- Do not put `.scad` file content inline in components — keep in `src/data/models/`
