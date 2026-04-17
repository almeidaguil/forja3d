import type { Model, ParameterValue, GenerationResult } from '../../../shared/types'
import type { IImageTracer } from '../../ports/IImageTracer'
import type { GeometryMode, IGeometryBuilder } from '../../ports/IGeometryBuilder'

interface GenerateModelDeps {
  imageTracer: IImageTracer
  geometryBuilder: IGeometryBuilder
  heightmapBuilder?: IGeometryBuilder
}

/**
 * Flood-fills enclosed background regions so the tracer receives a solid
 * silhouette instead of just outline strokes.
 *
 * Algorithm:
 * 1. Build a binary grid (dark = foreground).
 * 2. BFS from every border pixel that is background, marking reachable cells.
 * 3. Any background cell NOT reachable from the border is enclosed → paint it black.
 */
function fillEnclosedBackground(img: ImageData, threshold: number): ImageData {
  const { width: w, height: h, data } = img
  const bin = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2], a = data[i * 4 + 3]
    const gray = (r * 299 + g * 587 + b * 114) / 1000
    bin[i] = a > 128 && gray < threshold ? 1 : 0
  }

  // Dilate foreground by 1 pixel (4-connectivity) to close tiny gaps in the
  // outline before flood-fill. Without this, a single missing pixel in the
  // stroke lets the BFS leak into the interior and skip the fill.
  const dilated = new Uint8Array(bin)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (bin[y * w + x]) {
        if (x > 0)     dilated[y * w + x - 1] = 1
        if (x < w - 1) dilated[y * w + x + 1] = 1
        if (y > 0)     dilated[(y - 1) * w + x] = 1
        if (y < h - 1) dilated[(y + 1) * w + x] = 1
      }
    }
  }

  const reachable = new Uint8Array(w * h)
  const stack: number[] = []
  for (let x = 0; x < w; x++) {
    if (!dilated[x]) stack.push(x)
    if (!dilated[(h - 1) * w + x]) stack.push((h - 1) * w + x)
  }
  for (let y = 0; y < h; y++) {
    if (!dilated[y * w]) stack.push(y * w)
    if (!dilated[y * w + w - 1]) stack.push(y * w + w - 1)
  }
  while (stack.length) {
    const idx = stack.pop()!
    if (idx < 0 || idx >= w * h || reachable[idx] || dilated[idx]) continue
    reachable[idx] = 1
    const x = idx % w
    if (x > 0) stack.push(idx - 1)
    if (x < w - 1) stack.push(idx + 1)
    stack.push(idx - w, idx + w)
  }

  const newData = new Uint8ClampedArray(data)
  for (let i = 0; i < w * h; i++) {
    if (!bin[i] && !reachable[i]) {
      newData[i * 4] = 0; newData[i * 4 + 1] = 0
      newData[i * 4 + 2] = 0; newData[i * 4 + 3] = 255
    }
  }
  return new ImageData(newData, w, h)
}

function extractDepth(values: Record<string, ParameterValue>): number {
  if (typeof values.cutterHeight === 'number') return values.cutterHeight
  if (typeof values.baseHeight === 'number' && typeof values.reliefHeight === 'number') {
    return values.baseHeight + values.reliefHeight
  }
  if (typeof values.depth === 'number') return values.depth
  return 10
}

export async function generateModel(
  model: Model,
  values: Record<string, ParameterValue>,
  imageData: ImageData | undefined,
  deps: GenerateModelDeps,
): Promise<GenerationResult> {
  const { renderStrategy } = model

  if (renderStrategy.type === 'three-extrude') {
    if (renderStrategy.svgSource === 'image') {
      if (!imageData) return { status: 'error', error: 'Selecione uma imagem antes de gerar.' }

      const threshold = typeof values.threshold === 'number' ? values.threshold : 128
      const traced = await deps.imageTracer.trace(imageData, threshold)

      if (!traced.pathData) return { status: 'error', error: 'Não foi possível detectar um contorno na imagem.' }

      const targetSize = typeof values.targetSize === 'number' ? values.targetSize : 70
      const depth = extractDepth(values)
      const wallThickness = typeof values.wallThickness === 'number' ? values.wallThickness : undefined

      // Map the "Tipo" select parameter to the geometry mode
      let mode: GeometryMode = 'solid'
      if (values.mode === 'Cortador') mode = 'cutter'
      else if (values.mode === 'Cortador + Carimbo') mode = 'cutter-stamp'

      // CookieCad-style profile parameters (optional, builder uses defaults)
      const tipWidth = typeof values.tipWidth === 'number' ? values.tipWidth : undefined
      const chamferHeight = typeof values.chamferHeight === 'number' ? values.chamferHeight : undefined
      const baseWidth = typeof values.baseWidth === 'number' ? values.baseWidth : undefined
      const baseHeight = typeof values.baseHeight === 'number' ? values.baseHeight : undefined

      const geometry = await deps.geometryBuilder.build({
        pathData: traced.pathData,
        targetSize,
        depth,
        wallThickness,
        mode,
        tipWidth,
        chamferHeight,
        baseWidth,
        baseHeight,
      })
      return { status: 'success', geometry }
    }
  }

  if (renderStrategy.type === 'three-heightmap') {
    if (!imageData) return { status: 'error', error: 'Selecione uma imagem antes de gerar.' }
    if (!deps.heightmapBuilder) return { status: 'error', error: 'StampBuilder não disponível.' }

    // Fill enclosed background BEFORE sampling so the rabbit's white interior
    // becomes foreground — giving a solid silhouette, not just outline strokes.
    const tracingThreshold = typeof values.threshold === 'number' ? values.threshold * 2.55 : 128
    const stampThreshold = typeof values.threshold === 'number' ? values.threshold / 100 : 0.5
    const filledImage = fillEnclosedBackground(imageData, tracingThreshold)

    const targetSize = typeof values.targetSize === 'number' ? values.targetSize : 60
    const depth = typeof values.baseHeight === 'number' ? values.baseHeight : 5
    const stampRelief = typeof values.reliefHeight === 'number' ? values.reliefHeight : 3
    const stampResolution = typeof values.stampResolution === 'number' ? values.stampResolution : 120
    const mirror = typeof values.mirror === 'boolean' ? values.mirror : true

    const geometry = await deps.heightmapBuilder.build({
      pathData: '', targetSize, depth, stampRelief, stampResolution, stampThreshold, mirror,
      imageData: filledImage,
    })
    return { status: 'success', geometry }
  }

  return { status: 'error', error: `Estratégia "${renderStrategy.type}" ainda não implementada.` }
}
