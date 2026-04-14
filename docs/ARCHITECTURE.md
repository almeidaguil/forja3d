# Architecture — Forja3D

## Overview

Forja3D follows **Clean Architecture** (Robert C. Martin) combined with **Domain-Driven Design** principles. The goal is a codebase where business rules are independent of UI frameworks, rendering libraries, and hosting constraints.

---

## Layer diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Presentation (React, Three.js canvas, Tailwind)                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Application (Use Cases)                                │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │  Domain (Entities, Value Objects, Interfaces)   │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  │  Infrastructure (WASM, Three.js, Canvas, File I/O)      │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

Dependency rule: **arrows point inward only**. Inner layers know nothing about outer layers.

---

## Domain layer (`src/domain/`)

The heart of the application. Contains pure TypeScript — no framework, no library imports.

### Key entities and value objects

#### `Model`
Represents a generatable 3D model template.

```typescript
interface Model {
  id: string
  slug: string
  title: string
  category: ModelCategory
  parameters: ParameterSchema[]
  renderStrategy: RenderStrategy
}
```

#### `Parameter`
Describes a single configurable input for a model.

```typescript
type ParameterType = 'string' | 'number' | 'boolean' | 'select' | 'color' | 'image'

interface ParameterSchema {
  key: string
  type: ParameterType
  label: string
  default: ParameterValue
  min?: number        // for 'number'
  max?: number        // for 'number'
  step?: number       // for 'number'
  options?: string[]  // for 'select'
}
```

#### `GenerationResult`
Result returned by any generation use case.

```typescript
interface GenerationResult {
  status: 'success' | 'error'
  geometry?: ArrayBuffer  // STL binary data
  error?: string
}
```

#### `RenderStrategy`
Discriminated union that tells the application layer which renderer to use.

```typescript
type RenderStrategy =
  | { type: 'openscad'; scadTemplate: string }
  | { type: 'three-extrude'; svgSource: 'image' | 'builtin'; builtinShape?: BuiltinShape }
```

---

## Application layer (`src/application/`)

Contains use cases. Each use case is a single class or function with a clear input/output contract. No React, no UI.

### Use cases

#### `generateModel`
Dispatches to the correct renderer based on the model's `RenderStrategy`.
- Calls `IOpenScadRenderer` for `openscad` strategy
- Calls `IThreeGeometryBuilder` for `three-extrude` strategy

#### `traceImage`
Accepts a raw image file, runs it through the image tracer, returns an SVG path string.
- Calls `IImageTracer` port

#### `exportStl`
Accepts a Three.js `BufferGeometry` and returns a binary STL `ArrayBuffer`.
- Calls `IStlExporter` port

### Ports (interfaces defined here, implemented in infrastructure)

```typescript
interface IOpenScadRenderer {
  compile(scadCode: string): Promise<ArrayBuffer>
}

interface IImageTracer {
  trace(imageData: ImageData): Promise<string>  // returns SVG path string
}

interface IThreeGeometryBuilder {
  buildFromSvgPath(path: string, params: ExtrudeParams): BufferGeometry
  buildFromScad(scadCode: string): Promise<BufferGeometry>
}

interface IStlExporter {
  export(geometry: BufferGeometry): ArrayBuffer
}
```

---

## Infrastructure layer (`src/infrastructure/`)

Implements the ports. Has knowledge of external libraries (Three.js, OpenSCAD WASM, Canvas API).

### Adapters

| Adapter | Port | Technology |
|---|---|---|
| `OpenScadWasmRenderer` | `IOpenScadRenderer` | `openscad-wasm-prebuilt` |
| `CanvasImageTracer` | `IImageTracer` | Canvas API + contour tracing |
| `ThreeGeometryBuilder` | `IThreeGeometryBuilder` | Three.js `ExtrudeGeometry`, `TextGeometry` |
| `ThreeStlExporter` | `IStlExporter` | Three.js `STLExporter` |

### Image tracing strategy

Two options evaluated for V1:

1. **Canvas API + manual contour**: threshold the image to black/white, run a marching-squares algorithm to extract the outline polygon. Fast, zero extra dependencies, but lower quality for complex shapes.

2. **Potrace (npm)**: higher quality vectorization but requires running in a Worker since it's CPU-intensive. Better for production quality.

**Decision**: Start with Canvas API + marching-squares for speed. Upgrade to Potrace in a Web Worker when quality becomes a concern (document in V2_ROADMAP if needed).

---

## Presentation layer (`src/presentation/`)

React components and hooks. Components are "dumb" — they receive data and dispatch events. All logic lives in hooks, which call application use cases.

### Key hooks

- `useModelGenerator(model, params)` — calls `generateModel` use case, manages loading/error state
- `useImageTracer(file)` — calls `traceImage` use case, returns SVG path
- `useModelViewer(geometry)` — initializes Three.js scene, updates geometry

### Component rules

- Components render only what hooks provide
- No use case imports inside `.tsx` files
- Three.js canvas is wrapped in `ModelViewer` component with its own imperative ref logic

---

## Data layer (`src/data/models/`)

JSON files, one per model type. Define the model's metadata, parameter schemas, and render strategy. This is the source of truth for what models exist and how they behave.

Example (`cookie-cutter.json`):

```json
{
  "id": "cookie-cutter",
  "slug": "cookie-cutter",
  "title": "Cookie Cutter",
  "category": "cutters",
  "renderStrategy": {
    "type": "three-extrude",
    "svgSource": "image"
  },
  "parameters": [
    { "key": "cutterHeight", "type": "number", "label": "Height (mm)", "default": 20, "min": 10, "max": 50, "step": 1 },
    { "key": "wallThickness", "type": "number", "label": "Wall thickness (mm)", "default": 2, "min": 1, "max": 5, "step": 0.5 },
    { "key": "outlineOffset", "type": "number", "label": "Outline offset (mm)", "default": 3, "min": 0, "max": 10, "step": 0.5 },
    { "key": "color", "type": "color", "label": "Preview color", "default": "#e07b54" }
  ]
}
```

---

## Architecture Decision Records (ADRs)

Stored in `docs/adr/`. Format: `NNNN-title.md`.

| # | Decision | Status |
|---|---|---|
| [0001](adr/0001-client-side-only.md) | All rendering is client-side (no backend in V1) | Accepted |
| [0002](adr/0002-openscad-wasm.md) | Use OpenSCAD WASM for parametric text/geometry models | Accepted |
| [0003](adr/0003-three-extrude-for-images.md) | Use Three.js ExtrudeGeometry for image-based models | Accepted |
| [0004](adr/0004-canvas-tracer-v1.md) | Use Canvas API contour tracing over Potrace for V1 | Accepted |

---

## Technology constraints

| Constraint | Reason |
|---|---|
| No backend in V1 | Hosted on GitHub Pages (static only) |
| No authentication in V1 | Personal use, no user management needed |
| No 3MF export in V1 | STL is sufficient; 3MF is a V2 concern |
| No i18n in V1 | Single language (PT-BR); i18n is a V2 concern |
| No payment in V1 | Personal use only; Stripe integration is V2 |
