import * as THREE from 'three'
import { STLExporter } from 'three/addons/exporters/STLExporter.js'
import type { ExtrudeConfig, IGeometryBuilder } from '../../application/ports/IGeometryBuilder'

type V3 = THREE.Vector3

// Bilinear-interpolated pixel darkness: 0 = white/transparent, 1 = black/opaque
function sampleDarkness(d: Uint8ClampedArray, w: number, h: number, u: number, v: number): number {
  const uc = Math.max(0, Math.min(1, u))
  const vc = Math.max(0, Math.min(1, v))
  const fx = uc * (w - 1)
  const fy = vc * (h - 1)
  const x0 = Math.floor(fx), y0 = Math.floor(fy)
  const x1 = Math.min(x0 + 1, w - 1), y1 = Math.min(y0 + 1, h - 1)
  const tx = fx - x0, ty = fy - y0

  const px = (x: number, y: number): number => {
    const i = (y * w + x) * 4
    const gray = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000
    return (1 - gray / 255) * (d[i + 3] / 255)
  }

  return px(x0, y0) * (1 - tx) * (1 - ty) +
         px(x1, y0) * tx * (1 - ty) +
         px(x0, y1) * (1 - tx) * ty +
         px(x1, y1) * tx * ty
}

// Build top (stamp relief) and bottom (flat) vertex grids.
// Pixels darker than `threshold` (0–1) are raised to reliefH; lighter pixels are flat (z=0).
function buildGrids(
  img: ImageData, res: number, size: number,
  baseH: number, reliefH: number, threshold: number, mirror: boolean,
): [V3[][], V3[][]] {
  const { data, width, height } = img
  const top: V3[][] = [], bot: V3[][] = []
  for (let row = 0; row <= res; row++) {
    top.push([]); bot.push([])
    for (let col = 0; col <= res; col++) {
      const u = col / res
      const v = row / res
      const dark = sampleDarkness(data, width, height, mirror ? 1 - u : u, v)
      const x = (u - 0.5) * size
      const y = (v - 0.5) * size
      top[row].push(new THREE.Vector3(x, y, dark > threshold ? reliefH : 0))
      bot[row].push(new THREE.Vector3(x, y, -baseH))
    }
  }
  return [top, bot]
}

function tri(arr: number[], a: V3, b: V3, c: V3): void {
  arr.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
}

// Top face — normal ≈ +Z, CCW winding from above
function addTopFace(arr: number[], t: V3[][], res: number): void {
  for (let r = 0; r < res; r++)
    for (let c = 0; c < res; c++) {
      tri(arr, t[r][c], t[r][c + 1], t[r + 1][c + 1])
      tri(arr, t[r][c], t[r + 1][c + 1], t[r + 1][c])
    }
}

// Bottom face — normal -Z, reversed winding from top
function addBottomFace(arr: number[], b: V3[][], res: number): void {
  for (let r = 0; r < res; r++)
    for (let c = 0; c < res; c++) {
      tri(arr, b[r][c], b[r + 1][c + 1], b[r][c + 1])
      tri(arr, b[r][c], b[r + 1][c], b[r + 1][c + 1])
    }
}

// Front wall (row=0) — normal -Y
function addFrontWall(arr: number[], t: V3[][], b: V3[][], res: number): void {
  for (let c = 0; c < res; c++) {
    tri(arr, b[0][c], b[0][c + 1], t[0][c + 1])
    tri(arr, b[0][c], t[0][c + 1], t[0][c])
  }
}

// Back wall (row=res) — normal +Y
function addBackWall(arr: number[], t: V3[][], b: V3[][], res: number): void {
  for (let c = 0; c < res; c++) {
    tri(arr, b[res][c], t[res][c], t[res][c + 1])
    tri(arr, b[res][c], t[res][c + 1], b[res][c + 1])
  }
}

// Left wall (col=0) — normal -X
function addLeftWall(arr: number[], t: V3[][], b: V3[][], res: number): void {
  for (let r = 0; r < res; r++) {
    tri(arr, b[r][0], t[r][0], t[r + 1][0])
    tri(arr, b[r][0], t[r + 1][0], b[r + 1][0])
  }
}

// Right wall (col=res) — normal +X
function addRightWall(arr: number[], t: V3[][], b: V3[][], res: number): void {
  for (let r = 0; r < res; r++) {
    tri(arr, b[r][res], t[r + 1][res], t[r][res])
    tri(arr, b[r][res], b[r + 1][res], t[r + 1][res])
  }
}

function toSTL(posArr: number[]): ArrayBuffer {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3))
  geo.computeVertexNormals()
  const stlData = new STLExporter().parse(new THREE.Mesh(geo), { binary: true }) as DataView
  const raw = stlData.buffer
  if (!(raw instanceof ArrayBuffer)) throw new Error('Unexpected SharedArrayBuffer from STLExporter')
  return raw.slice(stlData.byteOffset, stlData.byteOffset + stlData.byteLength)
}

/**
 * Builds a manifold heightmap stamp mesh.
 * Top face: pixel darkness drives vertex Z (dark = raised).
 * Sides + bottom: flat walls, fully closed (watertight) mesh.
 */
export class HeightmapStampBuilder implements IGeometryBuilder {
  build(config: ExtrudeConfig): ArrayBuffer {
    const { imageData, targetSize = 60, depth = 5, stampRelief = 3, stampResolution = 80, stampThreshold = 0.35, mirror = true } = config
    if (!imageData) throw new Error('HeightmapStampBuilder requires imageData')

    const res = Math.max(5, Math.min(200, stampResolution))
    const [top, bot] = buildGrids(imageData, res, targetSize, depth, stampRelief, stampThreshold, mirror)

    const posArr: number[] = []
    addTopFace(posArr, top, res)
    addBottomFace(posArr, bot, res)
    addFrontWall(posArr, top, bot, res)
    addBackWall(posArr, top, bot, res)
    addLeftWall(posArr, top, bot, res)
    addRightWall(posArr, top, bot, res)

    return toSTL(posArr)
  }
}
