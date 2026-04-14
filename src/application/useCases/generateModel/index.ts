import type { Model, ParameterValue, GenerationResult } from '../../../shared/types'
import type { IImageTracer } from '../../ports/IImageTracer'
import type { IGeometryBuilder } from '../../ports/IGeometryBuilder'

interface GenerateModelDeps {
  imageTracer: IImageTracer
  geometryBuilder: IGeometryBuilder
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

      const targetSize = typeof values.targetSize === 'number' ? values.targetSize : 80
      const depth = extractDepth(values)
      const wallThickness = typeof values.wallThickness === 'number' ? values.wallThickness : undefined

      const geometry = deps.geometryBuilder.build({ pathData: traced.pathData, targetSize, depth, wallThickness })
      return { status: 'success', geometry }
    }
  }

  return { status: 'error', error: `Estratégia "${renderStrategy.type}" ainda não implementada.` }
}
