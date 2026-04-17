/**
 * Testa o CanvasImageTracer (4-conectividade) contra formas côncavas.
 *
 * Valida:
 * 1. O tracer produz pontos para cada forma de teste
 * 2. O polígono gerado NÃO tem auto-interseções (critério de poligono simples)
 *
 * Execução:  node scripts/test-tracer.mjs
 */

// ─── Tracer (replica de src/infrastructure/tracer/CanvasImageTracer.ts) ────────

// 4-connectivity: E, S, W, N — sem diagonais
const CW4 = [[1, 0], [0, 1], [-1, 0], [0, -1]]

function mooreTrace(bin, w, h) {
  let sx = -1, sy = -1
  outer: for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (bin[y * w + x]) { sx = x; sy = y; break outer }
    }
  }
  if (sx < 0) return []

  const result = []
  let cx = sx, cy = sy
  let back = 2 // West

  for (let iter = 0; iter < w * h; iter++) {
    result.push([cx, cy])
    let moved = false
    for (let i = 1; i <= 4; i++) {
      const d = (back + i) % 4
      const nx = cx + CW4[d][0]
      const ny = cy + CW4[d][1]
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
      if (bin[ny * w + nx]) {
        back = (d + 2) % 4
        cx = nx; cy = ny
        moved = true; break
      }
    }
    if (!moved || (cx === sx && cy === sy)) break
  }
  return result
}

function simplifyRDP(pts, epsilon) {
  if (pts.length < 3) return pts
  const [x1, y1] = pts[0]
  const [x2, y2] = pts[pts.length - 1]
  const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
  let maxDist = 0, maxIdx = 0
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

// ─── Detecção de auto-interseção ─────────────────────────────────────────────

function cross2d(ax, ay, bx, by) {
  return ax * by - ay * bx
}

// Retorna true se os segmentos AB e CD se cruzam (exclusivo nos endpoints)
function segmentsIntersect([ax, ay], [bx, by], [cx, cy], [dx, dy]) {
  const d1x = bx - ax, d1y = by - ay
  const d2x = dx - cx, d2y = dy - cy
  const denom = cross2d(d1x, d1y, d2x, d2y)
  if (Math.abs(denom) < 1e-10) return false // paralelos

  const t = cross2d(cx - ax, cy - ay, d2x, d2y) / denom
  const u = cross2d(cx - ax, cy - ay, d1x, d1y) / denom

  // Interseção estrita (exclui endpoints compartilhados entre arestas adjacentes)
  const eps = 1e-9
  return t > eps && t < 1 - eps && u > eps && u < 1 - eps
}

function hasSelfIntersection(pts) {
  const n = pts.length
  if (n < 4) return false
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n]
    // Só compara com arestas não-adjacentes
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue // aresta de fechamento é adjacente à primeira
      const c = pts[j], d = pts[(j + 1) % n]
      if (segmentsIntersect(a, b, c, d)) return true
    }
  }
  return false
}

// ─── Formas de teste ──────────────────────────────────────────────────────────

function makeBin(rows) {
  const h = rows.length
  const w = rows[0].length
  const bin = new Uint8Array(w * h)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      bin[y * w + x] = rows[y][x]
  return { bin, w, h }
}

const shapes = {
  // Forma simples convexa (quadrado 5x5)
  'quadrado': makeBin([
    [0,0,0,0,0,0,0],
    [0,1,1,1,1,1,0],
    [0,1,1,1,1,1,0],
    [0,1,1,1,1,1,0],
    [0,1,1,1,1,1,0],
    [0,1,1,1,1,1,0],
    [0,0,0,0,0,0,0],
  ]),

  // Forma em C (côncava — o maior problema com 8-conectividade)
  'C-shape': makeBin([
    [0,0,0,0,0,0,0,0,0],
    [0,1,1,1,1,1,1,1,0],
    [0,1,1,1,1,1,1,1,0],
    [0,1,1,0,0,0,0,0,0],
    [0,1,1,0,0,0,0,0,0],
    [0,1,1,1,1,1,1,1,0],
    [0,1,1,1,1,1,1,1,0],
    [0,0,0,0,0,0,0,0,0],
  ]),

  // Forma em U (côncava)
  'U-shape': makeBin([
    [0,0,0,0,0,0,0,0,0],
    [0,1,1,0,0,0,1,1,0],
    [0,1,1,0,0,0,1,1,0],
    [0,1,1,0,0,0,1,1,0],
    [0,1,1,0,0,0,1,1,0],
    [0,1,1,1,1,1,1,1,0],
    [0,1,1,1,1,1,1,1,0],
    [0,0,0,0,0,0,0,0,0],
  ]),

  // Estrela simples (reentrâncias em todos os lados)
  'estrela': makeBin([
    [0,0,0,1,0,0,0],
    [0,0,1,1,1,0,0],
    [0,1,0,1,0,1,0],
    [1,1,1,1,1,1,1],
    [0,1,0,1,0,1,0],
    [0,0,1,1,1,0,0],
    [0,0,0,1,0,0,0],
  ]),

  // Forma com pescoço estreito (simula silhueta de animal)
  'pescoço-estreito': makeBin([
    [0,0,0,0,0,0,0,0,0,0],
    [0,1,1,1,1,1,1,1,1,0],
    [0,1,1,1,1,1,1,1,1,0],
    [0,0,0,0,1,1,0,0,0,0],
    [0,0,0,0,1,1,0,0,0,0],
    [0,0,0,1,1,1,1,0,0,0],
    [0,0,1,1,1,1,1,1,0,0],
    [0,0,0,0,0,0,0,0,0,0],
  ]),
}

// ─── Execução dos testes ─────────────────────────────────────────────────────

let passed = 0, failed = 0

for (const [name, { bin, w, h }] of Object.entries(shapes)) {
  const raw = mooreTrace(bin, w, h)
  const pts = simplifyRDP(raw, 1.5)

  const selfIntersects = hasSelfIntersection(pts)
  const hasPoints = pts.length >= 3

  const ok = hasPoints && !selfIntersects
  const status = ok ? '✅ PASSOU' : '❌ FALHOU'
  const detail = !hasPoints
    ? `pontos insuficientes: ${pts.length}`
    : selfIntersects
      ? `auto-interseção detectada (${pts.length} pts)`
      : `${pts.length} pontos, polígono simples`

  console.log(`${status}  ${name.padEnd(20)} ${detail}`)
  ok ? passed++ : failed++
}

console.log(`\n${passed}/${passed + failed} testes passaram`)
if (failed > 0) process.exit(1)
