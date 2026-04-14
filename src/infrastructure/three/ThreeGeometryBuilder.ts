import * as THREE from 'three'
import { STLExporter } from 'three/addons/exporters/STLExporter.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { ExtrudeConfig, GeometryMode, IGeometryBuilder } from '../../application/ports/IGeometryBuilder'

type Pt = [number, number]

// Parse the simple "M x y L x y ... Z" path produced by CanvasImageTracer
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

function normalize(v: Pt): Pt { const l = Math.sqrt(v[0] ** 2 + v[1] ** 2); return l > 0 ? [v[0] / l, v[1] / l] : [0, 0] }

/**
 * Inward polygon offset for a CW polygon in SVG Y-down coordinates.
 *
 * Inward normal for CW / Y-down: rotate edge 90° CCW → [-ey, ex]
 *
 * Uses BEVEL join (move each vertex d mm along the bisector of the two adjacent
 * inward normals). Unlike miter join, bevel join never exceeds d mm displacement,
 * so the inner path can never self-intersect — critical for concave shapes like
 * a cookie-cutter outline with a narrow neck.
 */
function offsetPolygon(pts: Pt[], d: number): Pt[] {
  const n = pts.length
  return pts.map((curr, i) => {
    const prev = pts[(i - 1 + n) % n]
    const next = pts[(i + 1) % n]

    const e1 = normalize([curr[0] - prev[0], curr[1] - prev[1]])
    const e2 = normalize([next[0] - curr[0], next[1] - curr[1]])

    // Inward normals for CW / Y-down: [-ey, ex]
    const in1: Pt = [-e1[1], e1[0]]
    const in2: Pt = [-e2[1], e2[0]]

    // Bevel join: move vertex d mm along the bisector direction
    const bisector = normalize([in1[0] + in2[0], in1[1] + in2[1]])
    return [curr[0] + bisector[0] * d, curr[1] + bisector[1] * d]
  })
}

/**
 * Build a THREE.Shape from an outer boundary and an optional hole.
 *
 * Winding convention (Y-down pixel / mm space):
 *   Outer path from tracer: CW in Y-down = CCW in standard math (positive shoelace area)
 *   → correct winding for Three.js / earcut outer shape ✓
 *
 *   Inner path from offsetPolygon: also CW in Y-down = CCW in standard math
 *   → earcut requires holes to be CW in standard math, so we REVERSE before passing ✓
 */
function buildShape(outer: Pt[], hole: Pt[]): THREE.Shape {
  const shape = new THREE.Shape()
  shape.moveTo(outer[0][0], outer[0][1])
  for (let i = 1; i < outer.length; i++) shape.lineTo(outer[i][0], outer[i][1])
  shape.closePath()

  if (hole.length >= 3) {
    const holePath = new THREE.Path()
    holePath.moveTo(hole[0][0], hole[0][1])
    for (let i = 1; i < hole.length; i++) holePath.lineTo(hole[i][0], hole[i][1])
    holePath.closePath()
    shape.holes.push(holePath)
  }
  return shape
}

export class ThreeGeometryBuilder implements IGeometryBuilder {
  build(config: ExtrudeConfig): ArrayBuffer {
    const {
      pathData,
      targetSize,
      depth,
      wallThickness = 1.5,
      mode = 'solid' as GeometryMode,
      stampDepth = depth,  // stamp same height as cutter by default
    } = config

    // --- Parse path and scale to mm ---
    const pxPts = parseSimplePath(pathData)
    if (pxPts.length < 3) throw new Error('Insufficient path points for geometry')

    const xs = pxPts.map(([x]) => x)
    const ys = pxPts.map(([, y]) => y)
    const maxDimPx = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
    if (maxDimPx === 0) throw new Error('Degenerate path (zero bounding box)')

    const mmPerPx = targetSize / maxDimPx
    const outerMm: Pt[] = pxPts.map(([x, y]) => [x * mmPerPx, y * mmPerPx])

    // --- Build geometry in mm ---
    let geometry: THREE.BufferGeometry

    if (mode === 'cutter' || mode === 'cutter-stamp') {
      // Inner path: offset inward by wallThickness (bevel join, never self-intersects)
      const innerMm = offsetPolygon(outerMm, wallThickness)
      // Reverse inner path → CW in standard math = correct for earcut hole
      const innerHole = [...innerMm].reverse()

      // Piece 1: hollow cutter ring
      const ringShape = buildShape(outerMm, innerHole)
      const ringGeom = new THREE.ExtrudeGeometry(ringShape, { depth, bevelEnabled: false })

      if (mode === 'cutter-stamp') {
        // Piece 2: stamp — the inner contour extruded as a solid disc
        // Outer boundary = inner offset path → fits inside the ring with wallThickness gap
        // Height = stampDepth (same as ring by default, user can adjust later)
        const stampShape = buildShape(innerMm, [])
        const stampGeom = new THREE.ExtrudeGeometry(stampShape, { depth: stampDepth, bevelEnabled: false })

        // Place stamp to the right of the ring with a 5 mm gap
        const xMin = Math.min(...outerMm.map(([x]) => x))
        const xMax = Math.max(...outerMm.map(([x]) => x))
        stampGeom.translate(xMax - xMin + 5, 0, 0)

        geometry = mergeGeometries([ringGeom, stampGeom])
      } else {
        geometry = ringGeom
      }
    } else {
      // solid mode (stamp model, etc.)
      const shape = buildShape(outerMm, [])
      geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false })
    }

    // Flip Y (SVG Y-down → Three.js Y-up) then center XY
    geometry.applyMatrix4(new THREE.Matrix4().makeScale(1, -1, 1))
    geometry.computeBoundingBox()
    const center = new THREE.Vector3()
    geometry.boundingBox!.getCenter(center)
    geometry.translate(-center.x, -center.y, 0)

    // Export binary STL
    const mesh = new THREE.Mesh(geometry)
    const stlData = new STLExporter().parse(mesh, { binary: true }) as DataView
    const raw = stlData.buffer
    if (!(raw instanceof ArrayBuffer)) throw new Error('Unexpected SharedArrayBuffer from STLExporter')
    return raw.slice(stlData.byteOffset, stlData.byteOffset + stlData.byteLength)
  }
}
