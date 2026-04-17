import type { ExtrudeConfig, GeometryMode, IGeometryBuilder } from '../../application/ports/IGeometryBuilder'

/** Minimal shape of the OpenSCAD WASM instance we use */
interface OpenSCADInstance {
  renderToStl(code: string): Promise<string>
  // Raw Emscripten module — available in openscad-wasm-prebuilt for --enable=manifold
  getInstance?(): {
    FS: { writeFile(path: string, data: string): void; readFile(path: string, opts: { encoding: string }): string; unlink(path: string): void }
    callMain(args: string[]): number
  }
}

type Pt = [number, number]

/**
 * Parse the simple "M x y L x y ... Z" path produced by CanvasImageTracer.
 */
function parseSimplePath(d: string): Pt[] {
  const pts: Pt[] = []
  const nums = d.replace(/[MLZ]/gi, ' ').trim().split(/[\s,]+/).filter(Boolean)
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = parseFloat(nums[i])
    const y = parseFloat(nums[i + 1])
    if (!isNaN(x) && !isNaN(y)) pts.push([x, y])
  }
  return pts
}

/**
 * Convert ASCII STL text to a binary ArrayBuffer.
 *
 * The ThreePreview and exportStl functions both expect ArrayBuffer (binary STL).
 * openscad-wasm-prebuilt's renderToStl() returns ASCII STL, so we parse it
 * and write the standard 80-byte header + triangle data format.
 */
function asciiStlToArrayBuffer(ascii: string): ArrayBuffer {
  const lines = ascii.split('\n')
  const triangles: Array<{ normal: [number, number, number]; vertices: [number, number, number][] }> = []
  let currentNormal: [number, number, number] = [0, 0, 0]
  let currentVertices: [number, number, number][] = []

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line.startsWith('facet normal')) {
      const parts = line.split(/\s+/)
      currentNormal = [parseFloat(parts[2]), parseFloat(parts[3]), parseFloat(parts[4])]
      currentVertices = []
    } else if (line.startsWith('vertex')) {
      const parts = line.split(/\s+/)
      currentVertices.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])])
    } else if (line.startsWith('endfacet')) {
      triangles.push({ normal: currentNormal, vertices: currentVertices })
    }
  }

  // Binary STL format: 80-byte header + 4-byte triangle count + 50 bytes per triangle
  const numTriangles = triangles.length
  const bufferSize = 80 + 4 + numTriangles * 50
  const buffer = new ArrayBuffer(bufferSize)
  const view = new DataView(buffer)

  // Header (80 bytes of zeros)
  // Triangle count
  view.setUint32(80, numTriangles, true)

  let offset = 84
  for (const tri of triangles) {
    // Normal
    view.setFloat32(offset, tri.normal[0], true); offset += 4
    view.setFloat32(offset, tri.normal[1], true); offset += 4
    view.setFloat32(offset, tri.normal[2], true); offset += 4
    // 3 vertices
    for (const v of tri.vertices) {
      view.setFloat32(offset, v[0], true); offset += 4
      view.setFloat32(offset, v[1], true); offset += 4
      view.setFloat32(offset, v[2], true); offset += 4
    }
    // Attribute byte count (unused)
    view.setUint16(offset, 0, true); offset += 2
  }

  return buffer
}

/**
 * Format polygon points as an OpenSCAD points array literal.
 * E.g., [[0,0],[10,0],[10,10],[0,10]]
 */
function scadPoints(pts: Pt[]): string {
  return '[' + pts.map(([x, y]) => `[${x.toFixed(4)},${y.toFixed(4)}]`).join(',') + ']'
}

/* ------------------------------------------------------------------ */
/*  CookieCad-style profile defaults                                  */
/* ------------------------------------------------------------------ */

const DEFAULT_TIP_WIDTH = 0.4        // mm - cutting tip at the very bottom
const DEFAULT_CHAMFER_HEIGHT = 2     // mm - height of the taper section
const DEFAULT_CHAMFER_STEPS = 4      // number of discrete layers in the taper
const DEFAULT_BLADE_THICKNESS = 0.8  // mm - wall thickness of the straight blade
const DEFAULT_BASE_WIDTH = 4         // mm - width of the handle/base ring
const DEFAULT_BASE_HEIGHT = 3.5      // mm - height of the handle/base ring
const DEFAULT_BLADE_DEPTH = 12.5     // mm - total cutter height (chamfer + blade + handle)

const DEFAULT_STAMP_IMPRINT_HEIGHT = 3    // mm - solid stamp face plate
const DEFAULT_STAMP_BACK_HEIGHT = 4.5     // mm - raised ring on stamp back
const DEFAULT_STAMP_CUTTER_TOLERANCE = 0.9 // mm - gap so stamp fits inside cutter

/* ------------------------------------------------------------------ */
/*  SCAD code generators                                               */
/* ------------------------------------------------------------------ */

/**
 * Generate OpenSCAD code for a cookie-cutter with CookieCad-style profile.
 *
 * Cross-section (used UPSIDE DOWN - handle on top, sharp edge at bottom):
 *
 *     +-------------+   <- Handle/base: baseWidth wide x baseHeight tall
 *     +---+     +---+
 *         |     |       <- Blade wall: bladeThickness thick
 *         |     |       <- Straight section
 *         |  /  |       <- Chamfer/taper: chamferHeight tall
 *         +-+           <- Tip: tipWidth wide
 *
 * Wall strategy: morphological opening (erode→dilate) applied to both outer and inner
 * polygons in 2D before linear_extrude. The opening removes thin protrusions
 * (whisker/detail artifacts from the tracer) that cause CGAL "mesh not closed"
 * when the self-touching segments in the extruded solid prevent Nef conversion.
 * Main features (ears, face) are much wider than the opening radius and are preserved.
 */

/**
 * Returns SCAD for the INNER boundary of the cutter ring — the cleaned silhouette.
 * Uses morphological opening (erode then dilate) to remove thin protrusions
 * (whisker/detail artifacts) that cause CGAL "mesh not closed".
 * The inner boundary defines the exact cookie shape.
 */
function scadInner(m: number): string {
  return `offset(r = ${m.toFixed(4)}, $fn = 16) offset(r = ${(-m).toFixed(4)}, $fn = 16) polygon(points = pts)`
}

/**
 * Returns SCAD for the OUTER boundary of the cutter ring — silhouette expanded outward.
 * Positive offset is always clean (no self-intersections), no sanitization needed.
 * The outer boundary is silhouette + expansion, so the wall extends OUTWARD.
 */
function scadOuter(expansion: number): string {
  return `offset(r = ${expansion.toFixed(4)}, $fn = 32) polygon(points = pts)`
}

function generateCutterScad(
  pts: Pt[],
  depth: number,
  bladeThickness: number,
  tipWidth: number,
  chamferHeight: number,
  chamferSteps: number,
  baseWidth: number,
  baseHeight: number,
): string {
  const points = scadPoints(pts)
  const bladeHeight = depth - chamferHeight - baseHeight
  const safeBladeHeight = Math.max(0.01, bladeHeight)
  // Opening radius to sanitize inner polygon (removes whisker artifacts < ~1mm wide)
  const m = 0.5

  const chamferLines: string[] = []
  for (let i = 0; i < chamferSteps; i++) {
    // Wall expands OUTWARD from silhouette: tipWidth at tip → bladeThickness at blade
    const wall = tipWidth + (bladeThickness - tipWidth) * (i / chamferSteps)
    const zOffset = chamferHeight * (i / chamferSteps)
    const layerHeight = chamferHeight / chamferSteps
    chamferLines.push(`  // Chamfer step ${i + 1}/${chamferSteps} (wall=${wall.toFixed(3)}mm)`)
    chamferLines.push(`  translate([0, 0, ${zOffset.toFixed(4)}])`)
    chamferLines.push(`    linear_extrude(height = ${layerHeight.toFixed(4)})`)
    chamferLines.push(`      difference() {`)
    chamferLines.push(`        ${scadOuter(wall)};`)
    chamferLines.push(`        ${scadInner(m)};`)
    chamferLines.push(`      }`)
    chamferLines.push('')
  }

  return `
// Cookie cutter with CookieCad-style profile - generated by Forja3D
// Wall extends OUTWARD from silhouette — inner edge = exact cookie shape.
// Profile: tip (tipWidth outward) -> blade (bladeThickness outward) -> base (baseWidth outward)
$fn = 32;

pts = ${points};

union() {
  // --- Layer 1: Chamfer/taper at cutting edge (bottom) ---
  // Gradually transitions from tipWidth (${tipWidth}mm) to bladeThickness (${bladeThickness}mm)
${chamferLines.join('\n')}

  // --- Layer 2: Straight blade wall ---
  translate([0, 0, ${chamferHeight.toFixed(4)}])
    linear_extrude(height = ${safeBladeHeight.toFixed(4)})
      difference() {
        ${scadOuter(bladeThickness)};
        ${scadInner(m)};
      }

  // --- Layer 3: Handle/base at top (wider ring extending outward for grip) ---
  translate([0, 0, ${(depth - baseHeight).toFixed(4)}])
    linear_extrude(height = ${baseHeight.toFixed(4)})
      difference() {
        ${scadOuter(baseWidth)};
        ${scadInner(m)};
      }
}
`
}

/**
 * Generate OpenSCAD code for cutter + stamp combo with CookieCad-style profile.
 *
 * CUTTER: same layered profile as generateCutterScad.
 * STAMP: solid base plate + raised ring outline on top.
 *   - The stamp is offset inward by stampCutterTolerance so it fits inside the cutter.
 *   - Placed to the right of the cutter with a gap.
 */
function generateCutterStampScad(
  pts: Pt[],
  depth: number,
  bladeThickness: number,
  tipWidth: number,
  chamferHeight: number,
  chamferSteps: number,
  baseWidth: number,
  baseHeight: number,
  stampImprintHeight: number,
  stampBackHeight: number,
  stampCutterTolerance: number,
): string {
  const points = scadPoints(pts)
  const bladeHeight = Math.max(0.01, depth - chamferHeight - baseHeight)
  const m = 0.5 // same opening radius as standalone cutter

  const chamferLines: string[] = []
  for (let i = 0; i < chamferSteps; i++) {
    const wall = tipWidth + (bladeThickness - tipWidth) * (i / chamferSteps)
    const zOffset = chamferHeight * (i / chamferSteps)
    const layerHeight = chamferHeight / chamferSteps
    chamferLines.push(`  // Chamfer step ${i + 1}/${chamferSteps} (wall=${wall.toFixed(3)}mm)`)
    chamferLines.push(`  translate([0, 0, ${zOffset.toFixed(4)}])`)
    chamferLines.push(`    linear_extrude(height = ${layerHeight.toFixed(4)})`)
    chamferLines.push(`      difference() {`)
    chamferLines.push(`        ${scadOuter(wall)};`)
    chamferLines.push(`        ${scadInner(m)};`)
    chamferLines.push(`      }`)
    chamferLines.push('')
  }

  const xs = pts.map(([x]) => x)
  const stampOffset = (Math.max(...xs) - Math.min(...xs) + 5).toFixed(2)

  return `
// Cookie cutter + stamp with CookieCad-style profile - generated by Forja3D
$fn = 32;

pts = ${points};

// --- Cutter (left) ---
union() {
  // Layer 1: Chamfer/taper at cutting edge (bottom)
${chamferLines.join('\n')}

  // Layer 2: Straight blade wall
  translate([0, 0, ${chamferHeight.toFixed(4)}])
    linear_extrude(height = ${bladeHeight.toFixed(4)})
      difference() {
        ${scadOuter(bladeThickness)};
        ${scadInner(m)};
      }

  // Layer 3: Handle/base at top
  translate([0, 0, ${(depth - baseHeight).toFixed(4)}])
    linear_extrude(height = ${baseHeight.toFixed(4)})
      difference() {
        ${scadOuter(baseWidth)};
        ${scadInner(m)};
      }
}

// --- Stamp (right) ---
// Stamp = cleaned inner silhouette shrunk by stampCutterTolerance so it fits inside cutter.
translate([${stampOffset}, 0, 0]) {
  // Solid base (stamp face) — shrunk by tolerance to fit inside cutter opening
  linear_extrude(height = ${stampImprintHeight.toFixed(4)})
    offset(r = ${(-stampCutterTolerance).toFixed(4)}, $fn = 32)
      ${scadInner(m)};

  // Raised ring on back (handle)
  translate([0, 0, ${stampImprintHeight.toFixed(4)}])
    linear_extrude(height = ${stampBackHeight.toFixed(4)})
      difference() {
        offset(r = ${(-stampCutterTolerance).toFixed(4)}, $fn = 32)
          ${scadInner(m)};
        offset(r = ${(-(stampCutterTolerance + bladeThickness)).toFixed(4)}, $fn = 32)
          ${scadInner(m)};
      }
}
`
}

/**
 * Generate OpenSCAD code for a solid extrusion.
 */
function generateSolidScad(pts: Pt[], depth: number): string {
  const points = scadPoints(pts)
  return `
// Solid extrusion generated by Forja3D
$fn = 32;

linear_extrude(height = ${depth.toFixed(2)}) {
  polygon(points = ${points});
}
`
}

/**
 * OpenSCAD WASM-based geometry builder.
 *
 * Uses OpenSCAD's robust CSG kernel (CGAL/Manifold) to produce correct
 * hollow rings from arbitrary 2D polygons. This completely bypasses the
 * earcut triangulation and three-bvh-csg issues that plague the Three.js approach.
 */
export class OpenScadGeometryBuilder implements IGeometryBuilder {
  private modulePromise: Promise<typeof import('openscad-wasm-prebuilt')> | null = null

  /**
   * Lazy-loads the openscad-wasm-prebuilt module (~11 MB) on first use,
   * enabling Vite to code-split it into a separate chunk.
   * The module is cached, but a fresh OpenSCAD instance is created per render
   * because the Emscripten runtime only supports one callMain() per instance.
   */
  private async createInstance(): Promise<OpenSCADInstance> {
    if (!this.modulePromise) {
      this.modulePromise = import('openscad-wasm-prebuilt')
    }
    const mod = await this.modulePromise
    return mod.createOpenSCAD()
  }

  async build(config: ExtrudeConfig): Promise<ArrayBuffer> {
    const {
      pathData,
      targetSize,
      depth = DEFAULT_BLADE_DEPTH,
      wallThickness = DEFAULT_BLADE_THICKNESS,
      mode = 'solid' as GeometryMode,
      tipWidth = DEFAULT_TIP_WIDTH,
      chamferHeight = DEFAULT_CHAMFER_HEIGHT,
      chamferSteps = DEFAULT_CHAMFER_STEPS,
      baseWidth = DEFAULT_BASE_WIDTH,
      baseHeight = DEFAULT_BASE_HEIGHT,
      stampImprintHeight = DEFAULT_STAMP_IMPRINT_HEIGHT,
      stampBackHeight = DEFAULT_STAMP_BACK_HEIGHT,
      stampCutterTolerance = DEFAULT_STAMP_CUTTER_TOLERANCE,
    } = config

    // --- Parse path and scale to mm ---
    let pxPts = parseSimplePath(pathData)
    // The tracer pushes the start point twice (once at start, once when the loop closes).
    // Remove the duplicate trailing point to prevent a zero-length closing edge that
    // causes CGAL to fail with "mesh not closed".
    if (
      pxPts.length > 1 &&
      pxPts[0][0] === pxPts[pxPts.length - 1][0] &&
      pxPts[0][1] === pxPts[pxPts.length - 1][1]
    ) {
      pxPts = pxPts.slice(0, -1)
    }
    if (pxPts.length < 3) throw new Error('Insufficient path points for geometry')

    const xs = pxPts.map(([x]) => x)
    const ys = pxPts.map(([, y]) => y)
    const maxDimPx = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
    if (maxDimPx === 0) throw new Error('Degenerate path (zero bounding box)')

    const mmPerPx = targetSize / maxDimPx
    const mmPts: Pt[] = pxPts.map(([x, y]) => [x * mmPerPx, y * mmPerPx])

    // Flip Y (SVG Y-down -> OpenSCAD Y-up) and center
    const yMin = Math.min(...mmPts.map(([, y]) => y))
    const yMax = Math.max(...mmPts.map(([, y]) => y))
    const xMin = Math.min(...mmPts.map(([x]) => x))
    const xMax = Math.max(...mmPts.map(([x]) => x))
    const cxMm = (xMin + xMax) / 2
    const cyMm = (yMin + yMax) / 2

    const centeredPts: Pt[] = mmPts.map(([x, y]) => [
      x - cxMm,
      -(y - cyMm), // flip Y
    ])

    // Ensure CCW winding — OpenSCAD CGAL requires CCW for exterior polygon rings.
    // The tracer produces CW in SVG (Y-down) space; after negating Y the polygon
    // remains CW in the standard Y-up coordinate system → CGAL treats it as a
    // hole and the extruded solid becomes non-manifold ("mesh not closed").
    // Shoelace area < 0 means CW; reverse to make it CCW.
    {
      let area = 0
      for (let i = 0; i < centeredPts.length; i++) {
        const j = (i + 1) % centeredPts.length
        area += centeredPts[i][0] * centeredPts[j][1] - centeredPts[j][0] * centeredPts[i][1]
      }
      if (area < 0) centeredPts.reverse()
    }

    // --- Generate OpenSCAD code ---
    let scadCode: string
    if (mode === 'cutter') {
      scadCode = generateCutterScad(
        centeredPts, depth, wallThickness,
        tipWidth, chamferHeight, chamferSteps,
        baseWidth, baseHeight,
      )
    } else if (mode === 'cutter-stamp') {
      scadCode = generateCutterStampScad(
        centeredPts, depth, wallThickness,
        tipWidth, chamferHeight, chamferSteps,
        baseWidth, baseHeight,
        stampImprintHeight, stampBackHeight, stampCutterTolerance,
      )
    } else {
      scadCode = generateSolidScad(centeredPts, depth)
    }

    // --- Render with OpenSCAD WASM ---
    // Each render gets a fresh instance (Emscripten limitation: one callMain per instance)
    const instance = await this.createInstance()
    const asciiStl = await instance.renderToStl(scadCode)

    if (!asciiStl || asciiStl.trim().length === 0) {
      throw new Error('OpenSCAD produced empty output. The polygon may be invalid.')
    }

    // Convert ASCII STL to binary ArrayBuffer
    return asciiStlToArrayBuffer(asciiStl)
  }
}
