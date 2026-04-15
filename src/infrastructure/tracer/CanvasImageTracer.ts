import type { IImageTracer, TraceResult } from '../../application/ports/IImageTracer'

// 4-connectivity directions: E, S, W, N (clockwise, no diagonals)
// Using only cardinal directions guarantees the traced polygon never has
// diagonal moves, which eliminates self-intersections in concave shapes.
const CW4: [number, number][] = [
  [1, 0], [0, 1], [-1, 0], [0, -1],
]

function toBinaryGrid(data: Uint8ClampedArray, w: number, h: number, threshold: number): Uint8Array {
  const bin = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]
    const a = data[i * 4 + 3]
    const gray = (r * 299 + g * 587 + b * 114) / 1000
    bin[i] = a > 128 && gray < threshold ? 1 : 0
  }
  return bin
}

// Moore-Neighbor boundary tracing with 4-connectivity (Jacob's stopping criterion simplified).
// 4-connectivity (N/S/E/W only) produces axis-aligned steps — no diagonal edges —
// so the resulting polygon is always simple (no self-intersections).
function mooreTrace(bin: Uint8Array, w: number, h: number): [number, number][] {
  let sx = -1, sy = -1
  outerLoop: for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (bin[y * w + x]) { sx = x; sy = y; break outerLoop }
    }
  }
  if (sx < 0) return []

  const result: [number, number][] = []
  let cx = sx, cy = sy
  let back = 2 // first pixel found scanning left→right; last background was West (index 2)

  for (let iter = 0; iter < w * h; iter++) {
    result.push([cx, cy])

    let moved = false
    for (let i = 1; i <= 4; i++) {
      const d = (back + i) % 4
      const nx = cx + CW4[d][0]
      const ny = cy + CW4[d][1]
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
      if (bin[ny * w + nx]) {
        back = (d + 2) % 4 // opposite of movement direction
        cx = nx
        cy = ny
        moved = true
        break
      }
    }

    if (!moved || (cx === sx && cy === sy)) break
  }

  return result
}

// Ramer-Douglas-Peucker path simplification
function simplifyRDP(pts: [number, number][], epsilon: number): [number, number][] {
  if (pts.length < 3) return pts
  const [x1, y1] = pts[0]
  const [x2, y2] = pts[pts.length - 1]
  const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)

  let maxDist = 0
  let maxIdx = 0
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i]
    const dist = len > 0
      ? Math.abs((y2 - y1) * px - (x2 - x1) * py + x2 * y1 - y2 * x1) / len
      : Math.sqrt((px - x1) ** 2 + (py - y1) ** 2)
    if (dist > maxDist) { maxDist = dist; maxIdx = i }
  }

  if (maxDist > epsilon) {
    const left = simplifyRDP(pts.slice(0, maxIdx + 1), epsilon)
    const right = simplifyRDP(pts.slice(maxIdx), epsilon)
    return [...left.slice(0, -1), ...right]
  }

  return [pts[0], pts[pts.length - 1]]
}

function toPathData(points: [number, number][]): string {
  if (!points.length) return ''
  return 'M ' + points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ') + ' Z'
}

export class CanvasImageTracer implements IImageTracer {
  async trace(imageData: ImageData, threshold: number): Promise<TraceResult> {
    const { width, height, data } = imageData
    const bin = toBinaryGrid(data, width, height, threshold)
    const contour = mooreTrace(bin, width, height)
    // Simplify: epsilon = 1.5px, giving clean paths without too many points
    const simplified = simplifyRDP(contour, 1.5)
    const pathData = toPathData(simplified)
    return { pathData, width, height }
  }
}
