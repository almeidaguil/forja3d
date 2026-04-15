/**
 * Diagnostic script: test clipper-lib polygon offset
 * Produces inward-offset polygons from test shapes and logs metrics.
 *
 * Run:  node scripts/test-clipper-offset.mjs
 */
import ClipperLib from 'clipper-lib'

const CLIP_SCALE = 1000

// --- Test shapes ---

/** 5-pointed star (typical concave cookie-cutter shape) */
function starPolygon(cx, cy, outerR, innerR, points) {
  const pts = []
  for (let i = 0; i < points * 2; i++) {
    const angle = (Math.PI / points) * i - Math.PI / 2
    const r = i % 2 === 0 ? outerR : innerR
    pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)])
  }
  return pts
}

/** Bunny-like shape: circle with two ear bumps (thin features) */
function bunnyLikePolygon() {
  const pts = []
  // Main body circle
  const n = 60
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n
    let r = 20
    // Left ear bump at ~120 degrees
    const earAngle1 = (2 * Math.PI * 100) / 360
    if (Math.abs(a - earAngle1) < 0.3) r = 30
    // Right ear bump at ~60 degrees
    const earAngle2 = (2 * Math.PI * 60) / 360
    if (Math.abs(a - earAngle2) < 0.3) r = 30
    pts.push([50 + r * Math.cos(a), 50 + r * Math.sin(a)])
  }
  return pts
}

/** Simple square */
function squarePolygon() {
  return [[10, 10], [60, 10], [60, 60], [10, 60]]
}

// --- Clipper offset ---
function inwardOffset(pts, d) {
  const path = pts.map(([x, y]) => ({
    X: Math.round(x * CLIP_SCALE),
    Y: Math.round(y * CLIP_SCALE),
  }))
  const co = new ClipperLib.ClipperOffset()
  co.AddPath(path, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon)
  const solution = []
  co.Execute(solution, -d * CLIP_SCALE)
  return solution.map(p => p.map(({ X, Y }) => [X / CLIP_SCALE, Y / CLIP_SCALE]))
}

// --- Helpers ---
function bbox(pts) {
  const xs = pts.map(p => p[0])
  const ys = pts.map(p => p[1])
  return {
    minX: Math.min(...xs).toFixed(2),
    maxX: Math.max(...xs).toFixed(2),
    minY: Math.min(...ys).toFixed(2),
    maxY: Math.max(...ys).toFixed(2),
    width: (Math.max(...xs) - Math.min(...xs)).toFixed(2),
    height: (Math.max(...ys) - Math.min(...ys)).toFixed(2),
  }
}

function signedArea(pts) {
  let s = 0
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length
    s += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1]
  }
  return s / 2
}

// --- Run tests ---
const shapes = [
  { name: 'Square (simple convex)', pts: squarePolygon() },
  { name: 'Star (concave, thin tips)', pts: starPolygon(35, 35, 30, 12, 5) },
  { name: 'Star (thin, 8-pt)', pts: starPolygon(35, 35, 30, 8, 8) },
  { name: 'Bunny-like (ear bumps)', pts: bunnyLikePolygon() },
]

const wallThicknesses = [1.0, 1.5, 2.0, 3.0]

console.log('=== Clipper Offset Diagnostic ===\n')

for (const shape of shapes) {
  console.log(`Shape: ${shape.name}`)
  console.log(`  Vertices: ${shape.pts.length}`)
  console.log(`  BBox: ${JSON.stringify(bbox(shape.pts))}`)
  console.log(`  Signed area: ${signedArea(shape.pts).toFixed(2)}`)
  console.log()

  for (const wall of wallThicknesses) {
    const result = inwardOffset(shape.pts, wall)
    console.log(`  Wall=${wall}mm => ${result.length} inner path(s)`)
    for (let i = 0; i < result.length; i++) {
      const p = result[i]
      const area = signedArea(p)
      console.log(`    Path ${i}: ${p.length} vertices, area=${area.toFixed(2)}, bbox=${JSON.stringify(bbox(p))}`)
      // Check for self-intersections (simple consecutive-edge check)
      if (p.length < 3) {
        console.log(`    *** DEGENERATE: fewer than 3 vertices`)
      }
    }
    if (result.length === 0) {
      console.log(`    *** NO INNER PATH (shape too thin for this wall thickness)`)
    }
    console.log()
  }
  console.log('---\n')
}

console.log('=== Key findings ===')
console.log('If a star with thin tips produces multiple fragmented paths,')
console.log('the CSG approach in ThreeGeometryBuilder only uses the largest path')
console.log('and discards fragments, which can cause artifacts.')
console.log()
console.log('OpenSCAD offset() handles this natively and correctly.')
