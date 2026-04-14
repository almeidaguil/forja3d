import * as THREE from 'three'
import { STLExporter } from 'three/addons/exporters/STLExporter.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
// @ts-expect-error clipper-lib has no TypeScript declarations
import ClipperLib from 'clipper-lib'
import { Brush, Evaluator, SUBTRACTION, ADDITION } from 'three-bvh-csg'
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

const CLIP_SCALE = 1000

/**
 * Robust inward polygon offset using ClipperLib.ClipperOffset.
 * Returns an array of result paths (may be multiple when thin features split).
 */
function inwardOffset(pts: Pt[], d: number): Pt[][] {
  const path = pts.map(([x, y]) => ({
    X: Math.round(x * CLIP_SCALE),
    Y: Math.round(y * CLIP_SCALE),
  }))
  const co = new ClipperLib.ClipperOffset()
  co.AddPath(path, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon)
  const solution: Array<Array<{ X: number; Y: number }>> = []
  co.Execute(solution, -d * CLIP_SCALE)
  return solution.map(p => p.map(({ X, Y }) => [X / CLIP_SCALE, Y / CLIP_SCALE] as Pt))
}

function polyArea(pts: Pt[]): number {
  let s = 0
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length
    s += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1]
  }
  return Math.abs(s) / 2
}

/** Extrude a closed polygon into a solid THREE.BufferGeometry */
function extrudeSolid(pts: Pt[], depth: number): THREE.BufferGeometry {
  const shape = new THREE.Shape()
  shape.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1])
  shape.closePath()
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false })
}

/** Create a Brush from a polygon extrusion, ready for CSG operations */
function makeBrush(pts: Pt[], depth: number, zOffset = 0): Brush {
  const geo = extrudeSolid(pts, depth)
  if (zOffset !== 0) geo.translate(0, 0, zOffset)
  const brush = new Brush(geo)
  brush.updateMatrixWorld()
  return brush
}

/**
 * CSG subtraction: extrude outer and inner polygons as solids, then subtract.
 * The inner solid is made slightly taller (±0.1mm) to guarantee a clean boolean
 * cut at both caps without coplanar-face precision issues.
 */
function csgSubtract(evaluator: Evaluator, outerPts: Pt[], innerPts: Pt[], depth: number): THREE.BufferGeometry {
  const outerBrush = makeBrush(outerPts, depth)
  const innerBrush = makeBrush(innerPts, depth + 0.2, -0.1)
  return evaluator.evaluate(outerBrush, innerBrush, SUBTRACTION).geometry
}

export class ThreeGeometryBuilder implements IGeometryBuilder {
  build(config: ExtrudeConfig): ArrayBuffer {
    const {
      pathData,
      targetSize,
      depth,
      wallThickness = 1.5,
      mode = 'solid' as GeometryMode,
      stampDepth = 3,
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
    const evaluator = new Evaluator()

    if (mode === 'cutter' || mode === 'cutter-stamp') {
      const innerPaths = inwardOffset(outerMm, wallThickness)
      const mainInner = [...innerPaths].sort((a, b) => polyArea(b) - polyArea(a))[0] ?? []

      if (mainInner.length < 3) {
        // Fallback: no usable inner path → extrude solid
        geometry = extrudeSolid(outerMm, depth)
      } else {
        // CSG: outer solid minus inner solid = clean hollow ring.
        // No earcut holes, no cap hacks, no spike artifacts.
        const ringGeo = csgSubtract(evaluator, outerMm, mainInner, depth)

        if (mode === 'cutter-stamp') {
          // Stamp = solid base disc (stampDepth) with the ring outline raised
          // above it by ridgeHeight. This creates visible embossing detail.
          const ridgeHeight = 1.5

          // Ring outline extends full stamp height (base + ridge)
          const ringDetailGeo = csgSubtract(evaluator, outerMm, mainInner, stampDepth + ridgeHeight)
          const ringBrush = new Brush(ringDetailGeo)
          ringBrush.updateMatrixWorld()

          // Solid base disc fills the interior up to stampDepth
          const baseBrush = makeBrush(outerMm, stampDepth)

          // Union: base fills the ring's interior at z=0..stampDepth,
          // ring walls extend above at z=stampDepth..(stampDepth+ridgeHeight)
          const stampGeo = evaluator.evaluate(baseBrush, ringBrush, ADDITION).geometry

          // Place stamp to the right of the ring with a 5 mm gap
          const xMin = Math.min(...outerMm.map(([x]) => x))
          const xMax = Math.max(...outerMm.map(([x]) => x))
          stampGeo.translate(xMax - xMin + 5, 0, 0)

          geometry = mergeGeometries([ringGeo, stampGeo])
        } else {
          geometry = ringGeo
        }
      }
    } else {
      // Solid mode
      geometry = extrudeSolid(outerMm, depth)
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
