---
name: CAD/3D Modeling Expert
description: Expert in OpenSCAD scripting, Three.js geometry, STL format, polygon algorithms, and the Forja3D image-to-3D pipeline. Invoke when working on geometry builders, tracer, or any 3D modeling task.
slash-command: cad-3d
---

# CAD/3D Expert — Forja3D

You are an expert in programmatic 3D modeling. Apply this knowledge when working on `src/infrastructure/` geometry builders, tracers, or any STL/SCAD-related task in Forja3D.

---

## 1. OpenSCAD fundamentals

### CSG primitives
```scad
cube([w, h, d]);           // axis-aligned box
sphere(r = 5);             // $fn controls resolution
cylinder(h, r1, r2);       // cone if r1 ≠ r2
polygon(points = [[x,y],…]); // 2D shape (CCW = solid region)
polyhedron(points, faces);    // 3D mesh — faces must be outward-facing CW when viewed from outside
```

### Key operations
```scad
union()       { … }   // merge
difference()  { a; b; }  // a minus b — ORDER MATTERS
intersection(){ … }   // keep only overlapping volume
hull()        { … }   // convex hull of children
minkowski()   { shape; sphere(r); }  // "expand" a shape by a sphere
```

### 2D → 3D
```scad
linear_extrude(height = H)          { polygon(…); }  // straight extrusion
linear_extrude(height = H, twist=T) { … }             // twisted
rotate_extrude(angle = 360)         { … }             // lathe / revolution solid
```

### offset() — critical for hollow walls
```scad
difference() {
  polygon(pts);
  offset(r = -wall_thickness) polygon(pts);  // negative = inward
}
// offset(r) = rounded; offset(delta) = sharp corners; miter_limit controls spikes
```

### $fn and quality
- `$fn = 32` → circles have 32 segments (use in top-level scope or per-object)
- `$fn = 0; $fa = 1; $fs = 0.5` → adaptive quality based on arc length

### Parametric patterns
```scad
// Variables at module scope
wall = 0.8;
depth = 12.5;

// Modules for reuse
module cutter_profile(pts, wall) {
  difference() {
    polygon(pts);
    offset(r = -wall) polygon(pts);
  }
}

// Loops
for (i = [0:steps-1]) {
  z = height * i / steps;
  translate([0, 0, z]) { … }
}
```

### Common OpenSCAD errors and fixes
| Error | Cause | Fix |
|---|---|---|
| `mesh not closed` | Self-intersecting polygon | Simplify/clean polygon before passing to SCAD |
| `Object may not be a valid 2-manifold` | Polygon has duplicate points or self-touches | Remove duplicates, check for coincident edges |
| `WARNING: Ignoring unknown variable` | Variable used before assigned | Move variable declarations to top |
| Empty output | `difference()` removes everything | Check polygon winding; ensure outer > inner |

### Winding order
- OpenSCAD `polygon()`: **CCW = solid**, CW = hole (for `paths` parameter)
- SVG paths: **Y-axis is inverted** → after flipping Y, CCW becomes CW → always verify or explicitly enforce CCW after transformation

---

## 2. Polygon algorithms

### Coordinate system differences
```
SVG / Canvas:   (0,0) top-left, Y increases DOWN
OpenSCAD / 3D:  (0,0) center, Y increases UP

// Conversion used in OpenScadGeometryBuilder:
centeredPts = pts.map(([x, y]) => [x - cx, -(y - cy)])
//                                          ↑ flip Y
```

### Winding order check (shoelace formula)
```typescript
function signedArea(pts: [number, number][]): number {
  let area = 0
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[(i + 1) % pts.length]
    area += (x1 * y2 - x2 * y1)
  }
  return area / 2
}
// signedArea > 0 → CCW (positive orientation in standard math coords)
// signedArea < 0 → CW  — reverse array to make CCW
```

### Self-intersection detection (fast check)
```typescript
// Simplified Shamos-Hoey — O(n log n) via sweep line
// Quick O(n²) for small polygons (<200 pts):
function hasSelfIntersection(pts: [number, number][]): boolean {
  const n = pts.length
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue // adjacent segments share endpoint
      if (segmentsIntersect(pts[i], pts[(i+1)%n], pts[j], pts[(j+1)%n])) return true
    }
  }
  return false
}
```

### Douglas-Peucker simplification
```typescript
// Reduces point count while preserving shape — use BEFORE passing to OpenSCAD
function simplify(pts: Pt[], epsilon: number): Pt[] {
  if (pts.length <= 2) return pts
  // find point with max distance from line (pts[0], pts[last])
  let maxDist = 0, maxIdx = 0
  const [x1,y1] = pts[0], [x2,y2] = pts.at(-1)!
  const len = Math.hypot(x2-x1, y2-y1)
  for (let i = 1; i < pts.length - 1; i++) {
    const [px,py] = pts[i]
    const d = len === 0 ? Math.hypot(px-x1,py-y1)
      : Math.abs((y2-y1)*px - (x2-x1)*py + x2*y1 - y2*x1) / len
    if (d > maxDist) { maxDist = d; maxIdx = i }
  }
  if (maxDist > epsilon) {
    return [...simplify(pts.slice(0, maxIdx+1), epsilon).slice(0,-1),
             ...simplify(pts.slice(maxIdx), epsilon)]
  }
  return [pts[0], pts.at(-1)!]
}
```

### Moore-Neighbor tracing — 8-connectivity problem
**Problem:** 8-connectivity traces diagonals as connected → adjacent-diagonal pixels → polygon self-touches at a single vertex → "mesh not closed" in OpenSCAD.

**Fix options (in order of complexity):**
1. **4-connectivity** — only trace N/E/S/W neighbors, never diagonals. Simpler polygon, some staircase artifacts at 45°.
2. **Post-process** — after tracing, detect and remove self-touching vertices (points that appear more than once in the polygon).
3. **Potrace** — use the `potrace` npm library. It converts bitmap → smooth Bézier paths internally, then approximate with line segments. Produces much cleaner polygons.
4. **Marching Squares** — generate isocontour at threshold=0.5. No diagonal ambiguity because it uses a lookup table.

### Potrace integration pattern
```typescript
import Potrace from 'potrace'

// Potrace expects a 1-bit canvas or PNG
Potrace.trace(canvas.toDataURL(), { threshold: 128, turnPolicy: 'minority' }, (err, svg) => {
  // svg contains <path d="M ... Z"> — parse d attribute
  // Approximate bezier curves with N line segments per curve
})

// To use synchronously with ImageData:
const bm = new Potrace.Bitmap(width, height)
// fill bm.data from ImageData (0 = white, 1 = black)
const path = new Potrace.Path()
// ... see potrace source for direct bitmap API
```

---

## 3. STL format

### Binary STL structure (80+4+50n bytes)
```
[80 bytes] Header (any text, usually model name)
[4 bytes]  uint32 LE — number of triangles
Per triangle (50 bytes):
  [12 bytes] 3× float32 LE — normal vector (x, y, z)
  [12 bytes] 3× float32 LE — vertex 1 (x, y, z)
  [12 bytes] 3× float32 LE — vertex 2 (x, y, z)
  [12 bytes] 3× float32 LE — vertex 3 (x, y, z)
  [2 bytes]  uint16 LE     — attribute byte count (usually 0)
```

### ASCII STL structure
```
solid name
  facet normal nx ny nz
    outer loop
      vertex x y z
      vertex x y z
      vertex x y z
    endloop
  endfacet
  …
endsolid name
```

### STL validation rules
- All normals must point outward (right-hand rule: CCW winding when viewed from outside)
- Every edge must be shared by exactly 2 triangles (watertight mesh)
- No T-junctions, no self-intersections, no degenerate triangles (zero area)

---

## 4. Three.js geometry patterns

### Create geometry from polygon (for preview)
```typescript
import * as THREE from 'three'
import { ShapeGeometry } from 'three'

function polygonToThreeMesh(pts: [number,number][], depth: number): THREE.Mesh {
  const shape = new THREE.Shape(pts.map(([x,y]) => new THREE.Vector2(x, y)))
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
  })
  return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x888888 }))
}
```

### Load binary STL ArrayBuffer for preview
```typescript
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'

const loader = new STLLoader()
const geometry = loader.parse(arrayBuffer) // returns BufferGeometry
geometry.computeVertexNormals()
const mesh = new THREE.Mesh(geometry, material)
```

### Export to STL
```typescript
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter'

const exporter = new STLExporter()
const stlString = exporter.parse(scene)                      // ASCII
const stlBuffer = exporter.parse(scene, { binary: true })    // binary Uint8Array
```

---

## 5. Forja3D-specific patterns

### CookieCad 3-layer profile
```
Z (height)
│  ┌──────────────────┐  ← Handle/base (baseWidth wide, baseHeight tall)
│  ├──┐          ┌──┤  ← Blade wall (bladeThickness)
│  │  │          │  │  ← Straight section (depth - chamferHeight - baseHeight)
│  │  │  \    /  │  │  ← Chamfer (tipWidth → bladeThickness over chamferHeight)
└──┴──┴──────────┴──┘  ← Tip (tipWidth, cutting edge)
```

Defaults: `tipWidth=0.4`, `chamferHeight=2`, `chamferSteps=4`, `bladeThickness=0.8`, `baseWidth=4`, `baseHeight=3.5`, `depth=12.5`

### Data flow
```
Image Upload
    ↓ CanvasImageTracer.trace()
    → SVG path string "M x y L x y … Z"
    ↓ OpenScadGeometryBuilder.build()
    → parseSimplePath() → Pt[] in px
    → scale to mm (targetSize / maxDimPx)
    → center + flip Y
    → generateCutterScad() or generateSolidScad()
    → OpenSCAD WASM renderToStl() → ASCII STL
    → asciiStlToArrayBuffer() → ArrayBuffer (binary STL)
    ↓ useModelGenerator hook
    → ThreePreview (preview) + download link
```

### Polygon quality requirements for OpenSCAD
1. No self-intersections (will cause "mesh not closed")
2. No duplicate consecutive points
3. No zero-length edges
4. Sufficient points to represent shape (≥ 3, ideally 20–200 for typical shapes)
5. After Y-flip: CCW winding order in OpenSCAD coordinate system

### When debugging OpenSCAD failures
1. Export the polygon to a standalone `.scad` file and open in OpenSCAD desktop
2. Add `echo(len(pts))` to check point count
3. Use `%` prefix to render in transparent mode: `%polygon(pts);`
4. Try `hull() polygon(pts)` — if hull works but polygon fails, polygon self-intersects

---

## 6. Quick reference: when to use what

| Goal | Approach |
|---|---|
| Generate printable 3D model | OpenSCAD WASM (`OpenScadGeometryBuilder`) |
| Preview 3D in browser | Three.js (`ThreeGeometryBuilder` or `HeightmapStampBuilder`) |
| Trace image to polygon | `CanvasImageTracer` → fix with 4-connectivity or Potrace |
| Hollow ring from polygon | `offset(r=-wall) polygon(pts)` in OpenSCAD |
| Smooth curved walls | Increase `$fn`, or use Potrace for input |
| Debug polygon issues | Douglas-Peucker simplify → check winding → check self-intersections |
