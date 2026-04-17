import * as THREE from 'three'
import { STLExporter } from 'three/addons/exporters/STLExporter.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import Potrace from 'potrace'
import type { ExtrudeConfig, IGeometryBuilder } from '../../application/ports/IGeometryBuilder'

type Pt = [number, number]

// ── Bézier cubic sampler ──────────────────────────────────────────────────────

function sampleCubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, steps: number): Pt[] {
  const pts: Pt[] = []
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const s = 1 - t
    pts.push([
      s ** 3 * p0[0] + 3 * s ** 2 * t * p1[0] + 3 * s * t ** 2 * p2[0] + t ** 3 * p3[0],
      s ** 3 * p0[1] + 3 * s ** 2 * t * p1[1] + 3 * s * t ** 2 * p2[1] + t ** 3 * p3[1],
    ])
  }
  return pts
}

/**
 * Parses an SVG path `d` attribute with M, L, C, Z commands into subpaths.
 * Each M starts a new subpath. Bézier cubics are sampled into polylines.
 */
function parseSvgPath(d: string, bezierSteps: number): Pt[][] {
  const subpaths: Pt[][] = []
  let current: Pt[] = []
  let cx = 0, cy = 0

  const tokens = d.match(/[MLCZmlcz][^MLCZmlcz]*/g) ?? []
  for (const token of tokens) {
    const cmd = token[0]
    const nums = token.slice(1).trim().split(/[\s,]+/).filter(Boolean).map(Number)

    if (cmd === 'M' || cmd === 'm') {
      if (current.length > 1) subpaths.push(current)
      current = []
      cx = cmd === 'M' ? nums[0] : cx + nums[0]
      cy = cmd === 'M' ? nums[1] : cy + nums[1]
      current.push([cx, cy])
      // Implicit L after M
      for (let i = 2; i + 1 < nums.length; i += 2) {
        cx = cmd === 'M' ? nums[i] : cx + nums[i]
        cy = cmd === 'M' ? nums[i + 1] : cy + nums[i + 1]
        current.push([cx, cy])
      }
    } else if (cmd === 'L' || cmd === 'l') {
      for (let i = 0; i + 1 < nums.length; i += 2) {
        cx = cmd === 'L' ? nums[i] : cx + nums[i]
        cy = cmd === 'L' ? nums[i + 1] : cy + nums[i + 1]
        current.push([cx, cy])
      }
    } else if (cmd === 'C' || cmd === 'c') {
      for (let i = 0; i + 5 < nums.length; i += 6) {
        const p0: Pt = [cx, cy]
        const p1: Pt = cmd === 'C' ? [nums[i], nums[i + 1]] : [cx + nums[i], cy + nums[i + 1]]
        const p2: Pt = cmd === 'C' ? [nums[i + 2], nums[i + 3]] : [cx + nums[i + 2], cy + nums[i + 3]]
        const p3: Pt = cmd === 'C' ? [nums[i + 4], nums[i + 5]] : [cx + nums[i + 4], cy + nums[i + 5]]
        current.push(...sampleCubic(p0, p1, p2, p3, bezierSteps))
        cx = p3[0]; cy = p3[1]
      }
    }
    // Z: close — Three.js handles closing automatically
  }
  if (current.length > 1) subpaths.push(current)
  return subpaths
}

// ── Winding helpers ───────────────────────────────────────────────────────────

/** Signed area via shoelace. Positive = CCW in Y-up, Negative = CW */
function signedArea(pts: Pt[]): number {
  let a = 0
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1])
  }
  return a / 2
}

/** Ray-casting point-in-polygon test */
function pointInPolygon(px: number, py: number, pts: Pt[]): boolean {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j]
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/**
 * Converts subpaths to Three.js Shapes with holes using nesting-depth classification.
 *
 * Potrace uses fill-rule="evenodd" and traces ALL contours in the same winding
 * direction. After Y-flip, all areas are negative (CW in Y-up), so sign of area
 * cannot distinguish externals from holes. Instead, nesting depth is used:
 *   depth 0, 2, 4... → filled region (external/relief)
 *   depth 1, 3, 5... → hole (white region inside a filled region)
 *
 * Nesting depth of path P = number of other paths (sorted by |area| desc) that
 * contain a representative point of P via ray-casting.
 */
function buildShapes(subpaths: Pt[][], mmPerPx: number, mirror: boolean): THREE.Shape[] {
  const transformed = subpaths.map(pts => {
    let converted: Pt[] = pts.map(([x, y]) => [(mirror ? -x : x) * mmPerPx, -y * mmPerPx])
    // Mirror negates X which reverses winding; reverse points to keep CCW after mirror
    if (mirror) converted = converted.reverse()
    return { pts: converted, area: signedArea(converted) }
  })

  // Sort by |area| descending so parent paths always come before their children
  const sorted = [...transformed].sort((a, b) => Math.abs(b.area) - Math.abs(a.area))

  // Calculate nesting depth: count how many larger paths contain this path's midpoint
  const depths = sorted.map((path, i) => {
    const mid = path.pts[Math.floor(path.pts.length / 2)]
    let depth = 0
    for (let j = 0; j < i; j++) {
      if (pointInPolygon(mid[0], mid[1], sorted[j].pts)) depth++
    }
    return depth
  })

  // Separate into externals (even depth) and holes (odd depth)
  // Three.js Shape requires CCW winding (area > 0 in Y-up); reverse CW paths
  const externals: Array<{ pts: Pt[]; area: number; index: number }> = []
  const holes: Array<{ pts: Pt[]; depth: number; index: number }> = []

  sorted.forEach((path, i) => {
    if (depths[i] % 2 === 0) {
      // External: ensure CCW winding for THREE.Shape
      const pts = path.area < 0 ? [...path.pts].reverse() : path.pts
      externals.push({ pts, area: Math.abs(path.area), index: i })
    } else {
      // Hole: ensure CW winding for THREE.Path (area < 0)
      const pts = path.area > 0 ? [...path.pts].reverse() : path.pts
      holes.push({ pts, depth: depths[i], index: i })
    }
  })

  // Build THREE.Shape for each external and attach its holes
  // Parent of a hole = external with smallest |area| that contains the hole's midpoint
  return externals.map(ext => {
    const shape = new THREE.Shape(ext.pts.map(([x, y]) => new THREE.Vector2(x, y)))

    for (const hole of holes) {
      const mid = hole.pts[Math.floor(hole.pts.length / 2)]
      if (pointInPolygon(mid[0], mid[1], ext.pts)) {
        // Check no smaller external also contains this hole (i.e. ext is the direct parent)
        const hasCloserParent = externals.some(
          other => other.area < ext.area && pointInPolygon(mid[0], mid[1], other.pts)
        )
        if (!hasCloserParent) {
          shape.holes.push(new THREE.Path(hole.pts.map(([x, y]) => new THREE.Vector2(x, y))))
        }
      }
    }
    return shape
  })
}

// ── ImageData → PNG Buffer ────────────────────────────────────────────────────

async function imageDataToBlobUrl(img: ImageData): Promise<string> {
  const canvas = new OffscreenCanvas(img.width, img.height)
  const ctx = canvas.getContext('2d')!
  ctx.putImageData(img, 0, 0)
  const blob = await canvas.convertToBlob({ type: 'image/png' })
  return URL.createObjectURL(blob)
}

// ── Potrace trace ─────────────────────────────────────────────────────────────

async function traceWithPotrace(img: ImageData, threshold: number, turdSize: number): Promise<string> {
  const url = await imageDataToBlobUrl(img)
  try {
    return await new Promise<string>((resolve, reject) => {
      const pt = new Potrace.Potrace({ threshold, turdSize, optCurve: true })
      pt.loadImage(url, (_, err) => {
        if (err) return reject(err)
        const svg = pt.getSVG()
        const match = svg.match(/\sd="([^"]+)"/)
        if (!match) return reject(new Error('Potrace: no path found in SVG output'))
        resolve(match[1])
      })
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

// ── Main builder ──────────────────────────────────────────────────────────────

/**
 * Generates a 3D rubber stamp geometry using Potrace vectorization.
 *
 * The image is traced to SVG paths (multi-path: external contours + internal holes).
 * External contours are extruded to full `stampRelief` height; holes are cut through.
 * The base plate sits below everything (z = -depth … 0).
 *
 * Result: a stamp that, when pressed into clay/dough, leaves an impression
 * of the original image design including internal details (eyes, nose, etc.).
 */
export class PotraceStampBuilder implements IGeometryBuilder {
  async build(config: ExtrudeConfig): Promise<ArrayBuffer> {
    const {
      imageData,
      targetSize = 60,
      depth = 5,
      stampRelief = 2,
      mirror = true,
      threshold = 128,
      turdSize = 4,
      bezierSteps = 12,
    } = config

    if (!imageData) throw new Error('PotraceStampBuilder requires imageData')

    // 1. Trace image to SVG path with Potrace
    const pathD = await traceWithPotrace(imageData, threshold, turdSize)

    // 2. Parse SVG path into subpaths (polylines)
    const subpaths = parseSvgPath(pathD, bezierSteps)
    if (subpaths.length === 0) throw new Error('Potrace produced no paths for this image')

    // 3. Scale + center: compute bounding box, derive mm/px ratio, center paths at origin
    const allX = subpaths.flat().map(([x]) => x)
    const allY = subpaths.flat().map(([, y]) => y)
    const minX = Math.min(...allX), maxX = Math.max(...allX)
    const minY = Math.min(...allY), maxY = Math.max(...allY)
    const maxDim = Math.max(maxX - minX, maxY - minY)
    if (maxDim === 0) throw new Error('Potrace: degenerate bounding box')
    const mmPerPx = targetSize / maxDim
    const cxPx = (minX + maxX) / 2
    const cyPx = (minY + maxY) / 2

    // Center subpaths at origin so the design aligns with the base plate (also at origin)
    const centeredSubpaths: [number, number][][] = subpaths.map(pts =>
      pts.map(([x, y]) => [x - cxPx, y - cyPx])
    )

    // 4. Build Three.js Shapes (external contours + holes)
    const shapes = buildShapes(centeredSubpaths, mmPerPx, mirror)
    if (shapes.length === 0) throw new Error('Potrace: no external contours found')

    // 5. Extrude design reliefs (z = 0 → stampRelief)
    const designGeos = shapes.map(shape =>
      new THREE.ExtrudeGeometry(shape, { depth: stampRelief, bevelEnabled: false })
    )

    // 6. Base plate follows the outer silhouette (not a rectangle).
    // Use the outermost contour (largest shape) without holes → solid base.
    // Extruded from z = -depth to z = 0 (the handle part below the stamp face).
    const outerPts = shapes[0].getPoints(12)
    const baseShape = new THREE.Shape(outerPts) // no holes — solid silhouette
    const plateGeo = new THREE.ExtrudeGeometry(baseShape, { depth, bevelEnabled: false })
    plateGeo.translate(0, 0, -depth) // shift so top = z=0, bottom = z=-depth

    // 7. Merge all geometries — all must have the same attribute set (position + normal only)
    const toNI = (g: THREE.BufferGeometry) => {
      const ni = g.index !== null ? g.toNonIndexed() : g
      ni.deleteAttribute('uv')
      return ni
    }
    const allGeos = [toNI(plateGeo), ...designGeos.map(toNI)]

    const merged = mergeGeometries(allGeos, false)
    if (!merged) throw new Error('PotraceStampBuilder: failed to merge geometries')

    // 8. Center in XY
    merged.computeBoundingBox()
    const center = new THREE.Vector3()
    merged.boundingBox!.getCenter(center)
    merged.translate(-center.x, -center.y, 0)
    merged.computeVertexNormals()

    const mesh = new THREE.Mesh(merged)
    const stlData = new STLExporter().parse(mesh, { binary: true }) as DataView
    const raw = stlData.buffer
    if (!(raw instanceof ArrayBuffer)) throw new Error('Unexpected SharedArrayBuffer from STLExporter')
    return raw.slice(stlData.byteOffset, stlData.byteOffset + stlData.byteLength)
  }
}
