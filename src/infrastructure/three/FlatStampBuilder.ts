import * as THREE from 'three'
import { STLExporter } from 'three/addons/exporters/STLExporter.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { ExtrudeConfig, IGeometryBuilder } from '../../application/ports/IGeometryBuilder'

// Bilinear-interpolated darkness: 0 = white, 1 = black
function sampleDarkness(d: Uint8ClampedArray, w: number, h: number, u: number, v: number): number {
  const uc = Math.max(0, Math.min(1, u))
  const vc = Math.max(0, Math.min(1, v))
  const fx = uc * (w - 1), fy = vc * (h - 1)
  const x0 = Math.floor(fx), y0 = Math.floor(fy)
  const x1 = Math.min(x0 + 1, w - 1), y1 = Math.min(y0 + 1, h - 1)
  const tx = fx - x0, ty = fy - y0
  const px = (x: number, y: number): number => {
    const i = (y * w + x) * 4
    const gray = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000
    return (1 - gray / 255) * (d[i + 3] / 255)
  }
  return px(x0, y0) * (1 - tx) * (1 - ty) + px(x1, y0) * tx * (1 - ty) +
         px(x0, y1) * (1 - tx) * ty + px(x1, y1) * tx * ty
}

/**
 * Builds a stamp geometry with correct flat faces and vertical walls.
 *
 * Strategy: for each raised grid cell we emit:
 *   - A flat TOP quad at z = stampRelief (+Z normal, always visible from camera)
 *   - A vertical SIDE WALL on each edge that borders a non-raised cell
 *
 * This avoids diagonal "ramp" triangles at transitions, which have tilted normals
 * that appear dark in the preview. All top faces are flat → bright and correct.
 *
 * The base plate is a BoxGeometry (z = -depth … 0). The raised design sits on top.
 */
export class FlatStampBuilder implements IGeometryBuilder {
  build(config: ExtrudeConfig): ArrayBuffer {
    const {
      imageData, targetSize = 60, depth = 5, stampRelief = 3,
      stampResolution = 120, stampThreshold = 0.5, mirror = true,
    } = config
    if (!imageData) throw new Error('FlatStampBuilder requires imageData')

    const res = Math.max(5, Math.min(200, stampResolution))
    const { data, width, height } = imageData
    const size = targetSize

    // Sample cell centres to determine which cells are raised
    const raised = new Uint8Array(res * res)
    for (let r = 0; r < res; r++) {
      for (let c = 0; c < res; c++) {
        const u = (c + 0.5) / res
        const v = (r + 0.5) / res
        const dark = sampleDarkness(data, width, height, mirror ? 1 - u : u, v)
        raised[r * res + c] = dark > stampThreshold ? 1 : 0
      }
    }

    const R = (r: number, c: number): boolean =>
      r >= 0 && r < res && c >= 0 && c < res && raised[r * res + c] === 1

    // World-space x/y for grid line at col/row index
    const gx = (col: number): number => (col / res - 0.5) * size
    const gy = (row: number): number => (row / res - 0.5) * size
    const Z = stampRelief

    const posArr: number[] = []

    const push3 = (a: [number, number, number]) => posArr.push(a[0], a[1], a[2])
    const tri = (
      a: [number, number, number],
      b: [number, number, number],
      c: [number, number, number],
    ) => { push3(a); push3(b); push3(c) }

    for (let r = 0; r < res; r++) {
      for (let c = 0; c < res; c++) {
        if (!R(r, c)) continue

        const x0 = gx(c), x1 = gx(c + 1)
        const y0 = gy(r), y1 = gy(r + 1)

        // ── TOP face (flat at z=Z, normal +Z) ──────────────────────────────
        // CCW when viewed from +Z: (x0,y0) → (x1,y0) → (x1,y1) → (x0,y1)
        tri([x0, y0, Z], [x1, y0, Z], [x1, y1, Z])
        tri([x0, y0, Z], [x1, y1, Z], [x0, y1, Z])

        // ── SIDE WALLS (only on edges adjacent to non-raised cells) ────────

        // North edge (y = y0, faces -Y direction)
        // Normal −Y: pattern BL,BR,TR + BL,TR,TL
        if (!R(r - 1, c)) {
          tri([x0, y0, 0], [x1, y0, 0], [x1, y0, Z])
          tri([x0, y0, 0], [x1, y0, Z], [x0, y0, Z])
        }
        // South edge (y = y1, faces +Y direction)
        // Normal +Y: pattern BL,TR,BR + BL,TL,TR
        if (!R(r + 1, c)) {
          tri([x0, y1, 0], [x1, y1, Z], [x1, y1, 0])
          tri([x0, y1, 0], [x0, y1, Z], [x1, y1, Z])
        }
        // West edge (x = x0, faces -X direction)
        // Normal −X: pattern BL,TR,BR + BL,TL,TR
        if (!R(r, c - 1)) {
          tri([x0, y0, 0], [x0, y1, Z], [x0, y1, 0])
          tri([x0, y0, 0], [x0, y0, Z], [x0, y1, Z])
        }
        // East edge (x = x1, faces +X direction)
        // Normal +X: pattern BL,BR,TR + BL,TR,TL
        if (!R(r, c + 1)) {
          tri([x1, y0, 0], [x1, y1, 0], [x1, y1, Z])
          tri([x1, y0, 0], [x1, y1, Z], [x1, y0, Z])
        }
      }
    }

    // Design geometry
    const designGeo = new THREE.BufferGeometry()
    designGeo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3))
    designGeo.computeVertexNormals()

    // Base plate: z = -depth … 0
    const plateGeo = new THREE.BoxGeometry(size * 1.05, size * 1.05, depth)
    plateGeo.translate(0, 0, -depth / 2)

    // Strip UV from plate so both geometries have the same attribute layout
    // (position + normal only — UV not needed for STL export)
    const plateNonIndexed = plateGeo.toNonIndexed()
    plateNonIndexed.deleteAttribute('uv')

    const merged = mergeGeometries([plateNonIndexed, designGeo], false)
    if (!merged) throw new Error('Failed to merge stamp geometries')

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
