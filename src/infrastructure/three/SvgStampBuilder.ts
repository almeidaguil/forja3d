import * as THREE from 'three'
import { STLExporter } from 'three/addons/exporters/STLExporter.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { ExtrudeConfig, IGeometryBuilder } from '../../application/ports/IGeometryBuilder'

type Pt = [number, number]

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
 * Builds a rubber-stamp geometry: flat rectangular base plate with the traced
 * design extruded as a solid raised area on top.
 *
 * Winding-order strategy (critical for correct normals):
 * - mooreTrace produces CW winding in SVG Y-down space.
 * - Negating Y (SVG→Three.js) alone keeps CW → top-face normals point -Z (dark).
 * - Fix: reverse the point array before negating Y → CCW in Three.js Y-up space
 *   → top-face normals point +Z (bright, visible from camera). ✓
 * - Mirror (negate X) also reverses winding; reverse again to restore CCW. ✓
 */
export class SvgStampBuilder implements IGeometryBuilder {
  build(config: ExtrudeConfig): ArrayBuffer {
    const { pathData, targetSize = 60, depth = 5, stampRelief = 3, mirror = true } = config
    if (!pathData) throw new Error('SvgStampBuilder requires pathData')

    const pxPts = parseSimplePath(pathData)
    if (pxPts.length < 3) throw new Error('Insufficient path points for stamp geometry')

    const xs = pxPts.map(([x]) => x)
    const ys = pxPts.map(([, y]) => y)
    const maxDimPx = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
    if (maxDimPx === 0) throw new Error('Degenerate path (zero bounding box)')

    const mmPerPx = targetSize / maxDimPx

    // Reverse + negate Y: converts CW SVG winding → CCW Three.js winding
    // so ExtrudeGeometry top-face normals point +Z (visible from above).
    let pts: Pt[] = [...pxPts]
      .reverse()
      .map(([x, y]) => [x * mmPerPx, -y * mmPerPx])

    // Mirror: negate X (reverses winding CW) then reverse again (back to CCW)
    if (mirror) {
      pts = pts.map(([x, y]): Pt => [-x, y]).reverse()
    }

    const shape = new THREE.Shape()
    shape.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1])
    shape.closePath()

    // Extrude upward: z = 0 (plate top) → z = stampRelief (design top)
    const designGeo = new THREE.ExtrudeGeometry(shape, { depth: stampRelief, bevelEnabled: false })

    // Position base plate directly under the design (z = -depth → 0)
    designGeo.computeBoundingBox()
    const bbox = designGeo.boundingBox!
    const cx = (bbox.min.x + bbox.max.x) / 2
    const cy = (bbox.min.y + bbox.max.y) / 2
    const span = Math.max(bbox.max.x - bbox.min.x, bbox.max.y - bbox.min.y) * 1.1

    const plateGeo = new THREE.BoxGeometry(span, span, depth)
    plateGeo.translate(cx, cy, -depth / 2)

    // Merge (toNonIndexed ensures compatible attribute layouts)
    const merged = mergeGeometries([plateGeo.toNonIndexed(), designGeo.toNonIndexed()], false)
    if (!merged) throw new Error('Failed to merge stamp geometries')

    // Center in XY — no more transforms, geometry is already in Three.js space
    merged.computeBoundingBox()
    const center = new THREE.Vector3()
    merged.boundingBox!.getCenter(center)
    merged.translate(-center.x, -center.y, 0)

    const mesh = new THREE.Mesh(merged)
    const stlData = new STLExporter().parse(mesh, { binary: true }) as DataView
    const raw = stlData.buffer
    if (!(raw instanceof ArrayBuffer)) throw new Error('Unexpected SharedArrayBuffer from STLExporter')
    return raw.slice(stlData.byteOffset, stlData.byteOffset + stlData.byteLength)
  }
}
