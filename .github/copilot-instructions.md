# Forja3D — GitHub Copilot Instructions

## Project overview
Forja3D is a browser-based parametric 3D model generator (cookie cutters, stamps, keychains) that exports STL for 3D printing. Client-side only (GitHub Pages), no backend.

- **Stack:** React 19 + TypeScript + Vite + Tailwind CSS v4
- **3D:** OpenSCAD WASM for mesh generation; Three.js for browser preview
- **Architecture:** Clean Architecture — `domain → application → infrastructure → presentation`

## Code conventions
- TypeScript strict mode throughout
- Identifiers in English; comments and commit messages in Portuguese (pt-BR)
- No `console.log` in committed code
- Run `npm run build && npm run lint` before committing

## Architecture layers and import rules
```
domain/         ← entities only, zero external deps
application/    ← use cases, port interfaces
infrastructure/ ← adapters (OpenSCAD, Three.js, Canvas, tracers)
presentation/   ← React components, hooks, pages
shared/         ← global types and constants
data/           ← JSON model configs
```
Inner layers must never import outer layers.

---

## CAD/3D Expert Knowledge

### OpenSCAD fundamentals
```scad
// 2D primitives
polygon(points = [[x,y], …]);         // CCW = solid region

// 2D → 3D
linear_extrude(height = H) { polygon(pts); }
rotate_extrude(angle = 360) { … }

// CSG operations
union()        { a; b; }   // merge
difference()   { a; b; }   // a minus b (ORDER MATTERS)
intersection() { a; b; }   // overlap only
hull()         { a; b; }   // convex hull
minkowski()    { shape; sphere(r); }  // expand shape

// Hollow wall from polygon — the core pattern in Forja3D
difference() {
  polygon(pts);
  offset(r = -wall_thickness) polygon(pts);
}
// offset(r) = rounded corners; offset(delta) = sharp corners
```

### OpenSCAD errors → causes → fixes
| Error | Cause | Fix |
|---|---|---|
| `mesh not closed` | Self-intersecting polygon | Simplify/clean polygon before SCAD |
| `Object may not be a valid 2-manifold` | Duplicate points or self-touching edges | Remove duplicates, fix winding |
| Empty output from `difference()` | Outer polygon smaller than inner | Check polygon scale and winding |

### Winding order rules
- OpenSCAD `polygon()`: **CCW = solid**, CW = hole
- SVG/Canvas: Y-axis is inverted (Y increases downward)
- After flipping Y: CCW in SVG becomes CCW in OpenSCAD — verify with shoelace formula

```typescript
function signedArea(pts: [number, number][]): number {
  let area = 0
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[(i + 1) % pts.length]
    area += x1 * y2 - x2 * y1
  }
  return area / 2
  // > 0 → CCW (correct for OpenSCAD solid)
  // < 0 → CW  (reverse array to fix)
}
```

### Polygon algorithms
```typescript
// Douglas-Peucker simplification — use before passing to OpenSCAD
function simplify(pts: Pt[], epsilon: number): Pt[] {
  if (pts.length <= 2) return pts
  const [x1, y1] = pts[0], [x2, y2] = pts.at(-1)!
  const len = Math.hypot(x2 - x1, y2 - y1)
  let maxDist = 0, maxIdx = 0
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i]
    const d = len === 0 ? Math.hypot(px - x1, py - y1)
      : Math.abs((y2 - y1) * px - (x2 - x1) * py + x2 * y1 - y2 * x1) / len
    if (d > maxDist) { maxDist = d; maxIdx = i }
  }
  if (maxDist > epsilon)
    return [...simplify(pts.slice(0, maxIdx + 1), epsilon).slice(0, -1),
             ...simplify(pts.slice(maxIdx), epsilon)]
  return [pts[0], pts.at(-1)!]
}
```

### Moore-Neighbor tracing — known P0 bug
**Problem:** 8-connectivity includes diagonals → self-touching vertices → OpenSCAD "mesh not closed" on concave shapes.

**Fix options:**
1. **4-connectivity** — trace only N/E/S/W. Produces staircase on 45° edges but no self-intersections.
2. **Potrace** — `import Potrace from 'potrace'`. Converts bitmap to smooth Bézier paths, far cleaner polygons.
3. **Post-process** — detect and remove duplicate/self-touching vertices after tracing.

### STL binary format (80 + 4 + 50×n bytes)
```
[80 bytes]  header text
[4 bytes]   uint32 LE  — triangle count
per triangle:
  [12 bytes] 3× float32 LE — normal (x, y, z)
  [12 bytes] 3× float32 LE — vertex 1
  [12 bytes] 3× float32 LE — vertex 2
  [12 bytes] 3× float32 LE — vertex 3
  [2 bytes]  uint16 LE     — attribute byte count (0)
```

### Three.js geometry patterns
```typescript
// Extrude polygon for preview
const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)))
const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false })

// Load binary STL ArrayBuffer
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
const geometry = new STLLoader().parse(arrayBuffer)
geometry.computeVertexNormals()
```

---

## Forja3D data flow
```
Image upload
  → CanvasImageTracer.trace()     — bitmap → SVG path string "M x y L x y … Z"
  → OpenScadGeometryBuilder.build()
      parseSimplePath()           — path string → Pt[] (pixels)
      scale to mm                 — targetSize / maxDimPx
      center + flip Y             — SVG Y-down → OpenSCAD Y-up
      generateCutterScad()        — build SCAD code with 3-layer CookieCad profile
      OpenSCAD WASM renderToStl() — SCAD → ASCII STL
      asciiStlToArrayBuffer()     — ASCII → binary ArrayBuffer
  → useModelGenerator hook
      ThreePreview                — 3D preview in canvas
      download link               — binary STL file
```

## CookieCad 3-layer profile (cookie cutter)
```
Z
│  ┌──────────────┐  ← Handle/base  (baseWidth=4mm, baseHeight=3.5mm)
│  ├─┐        ┌─┤  ← Blade wall   (bladeThickness=0.8mm)
│  │ │        │ │  ← Straight section
│  │  \      /  │  ← Chamfer taper (tipWidth=0.4 → 0.8mm over chamferHeight=2mm)
└──┴───────────┴──  ← Cutting tip  (tipWidth=0.4mm)
```

## Key files
| File | Role |
|---|---|
| `src/infrastructure/openscad/OpenScadGeometryBuilder.ts` | SCAD code generator + STL converter |
| `src/infrastructure/tracer/CanvasImageTracer.ts` | Image → polygon (P0: 8-connectivity bug) |
| `src/infrastructure/three/HeightmapStampBuilder.ts` | Heightmap stamp via Three.js |
| `src/application/useCases/generateModel/index.ts` | Orchestrates the model generation |
| `src/presentation/hooks/useModelGenerator.ts` | React hook for UI state |
| `src/data/*.json` | Parametric model configs (cookie-cutter, stamp, keychain) |
