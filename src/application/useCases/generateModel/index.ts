import type { Model, ParameterValue, GenerationResult } from '../../../shared/types'
import type { IImageTracer } from '../../ports/IImageTracer'
import type { GeometryMode, IGeometryBuilder } from '../../ports/IGeometryBuilder'
import { fillEnclosedRegions } from '../../services/imageProcessing'

interface GenerateModelDeps {
  imageTracer: IImageTracer
  geometryBuilder: IGeometryBuilder
  heightmapBuilder?: IGeometryBuilder
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
      const filled = fillEnclosedRegions(imageData, threshold)
      const traced = await deps.imageTracer.trace(filled, threshold)

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
    if (!deps.heightmapBuilder) return { status: 'error', error: 'HeightmapStampBuilder não disponível.' }

    const targetSize = typeof values.targetSize === 'number' ? values.targetSize : 60
    const depth = typeof values.baseHeight === 'number' ? values.baseHeight : 5
    const stampRelief = typeof values.reliefHeight === 'number' ? values.reliefHeight : 3
    const stampResolution = typeof values.stampResolution === 'number' ? values.stampResolution : 80
    const mirror = typeof values.mirror === 'boolean' ? values.mirror : true

    const geometry = await deps.heightmapBuilder.build({ pathData: '', targetSize, depth, stampRelief, stampResolution, mirror, imageData })
    return { status: 'success', geometry }
  }

  return { status: 'error', error: `Estratégia "${renderStrategy.type}" ainda não implementada.` }
}
