import type { Model, ParameterValue, GenerationResult } from '../../../shared/types'
import type { IImageTracer } from '../../ports/IImageTracer'
import type { GeometryMode, IGeometryBuilder } from '../../ports/IGeometryBuilder'
import { fillEnclosedRegions } from '../../services/imageProcessing'

interface GenerateModelDeps {
  imageTracer: IImageTracer
  geometryBuilder: IGeometryBuilder
  heightmapBuilder?: IGeometryBuilder
  potraceBuilder?: IGeometryBuilder
  qrBuilder?: IGeometryBuilder
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
      const tipWidth      = typeof values.tipWidth      === 'number' ? values.tipWidth      : undefined
      const chamferHeight = typeof values.chamferHeight === 'number' ? values.chamferHeight : undefined
      const baseWidth     = typeof values.baseWidth     === 'number' ? values.baseWidth     : undefined
      const baseHeight    = typeof values.baseHeight    === 'number' ? values.baseHeight    : undefined

      if (mode === 'cutter-stamp' && deps.potraceBuilder) {
        // Generate cutter (OpenSCAD) + stamp (Potrace) in parallel — two separate STLs
        const stampRelief  = typeof values.stampRelief  === 'number'  ? values.stampRelief  : 2
        const stampThreshold = typeof values.threshold  === 'number'  ? values.threshold    : 128
        const turdSize     = typeof values.turdSize     === 'number'  ? values.turdSize     : 4
        const bezierSteps  = typeof values.bezierSteps  === 'number'  ? values.bezierSteps  : 12
        const mirror       = typeof values.mirror       === 'boolean' ? values.mirror       : true

        // Stamp must fit inside the cutter's inner opening (= silhouette at targetSize).
        // Apply tolerance per side so FDM inaccuracy (~±0.2mm) doesn't cause tight fit.
        const STAMP_TOLERANCE_PER_SIDE = 0.4  // mm
        const stampTargetSize = Math.max(20, targetSize - 2 * STAMP_TOLERANCE_PER_SIDE)

        const [cutterGeometry, stampGeometry] = await Promise.all([
          deps.geometryBuilder.build({
            pathData: traced.pathData, targetSize, depth, wallThickness,
            mode: 'cutter', tipWidth, chamferHeight, baseWidth, baseHeight,
          }),
          deps.potraceBuilder.build({
            pathData: '', imageData, targetSize: stampTargetSize,
            depth: 4, stampRelief, mirror,
            threshold: stampThreshold, turdSize, bezierSteps,
          }),
        ])
        return { status: 'success', geometry: cutterGeometry, secondaryGeometry: stampGeometry }
      }

      const geometry = await deps.geometryBuilder.build({
        pathData: traced.pathData, targetSize, depth, wallThickness,
        mode, tipWidth, chamferHeight, baseWidth, baseHeight,
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

  if (renderStrategy.type === 'potrace-stamp') {
    if (!imageData) return { status: 'error', error: 'Selecione uma imagem antes de gerar.' }
    if (!deps.potraceBuilder) return { status: 'error', error: 'PotraceStampBuilder não disponível.' }

    const targetSize   = typeof values.targetSize   === 'number'  ? values.targetSize   : 60
    const depth        = typeof values.baseHeight   === 'number'  ? values.baseHeight   : 5
    const stampRelief  = typeof values.reliefHeight === 'number'  ? values.reliefHeight : 2
    const mirror       = typeof values.mirror       === 'boolean' ? values.mirror       : true
    const threshold    = typeof values.threshold    === 'number'  ? values.threshold    : 128
    const turdSize     = typeof values.turdSize     === 'number'  ? values.turdSize     : 4
    const bezierSteps  = typeof values.bezierSteps  === 'number'  ? values.bezierSteps  : 12

    const geometry = await deps.potraceBuilder.build({
      pathData: '', imageData, targetSize, depth, stampRelief,
      mirror, threshold, turdSize, bezierSteps,
    })
    return { status: 'success', geometry }
  }

  if (renderStrategy.type === 'three-qr') {
    if (!deps.qrBuilder) return { status: 'error', error: 'QrCodeGeometryBuilder não disponível.' }
    if (!values.qrContent) return { status: 'error', error: 'Informe a chave Pix ou conteúdo do QR.' }

    const targetSize    = typeof values.targetSize    === 'number' ? values.targetSize    : 50
    const depth         = typeof values.depth         === 'number' ? values.depth         : 3
    const stampRelief   = typeof values.stampRelief   === 'number' ? values.stampRelief   : 1.5
    const qrType        = typeof values.qrType        === 'string' ? values.qrType        : 'pix'
    const qrContent     = typeof values.qrContent     === 'string' ? values.qrContent     : ''
    const qrPixKeyType  = typeof values.qrPixKeyType  === 'string' ? values.qrPixKeyType  : 'email'
    const qrValue       = typeof values.qrValue       === 'number' && values.qrValue > 0 ? values.qrValue : undefined
    const qrIdentifier  = typeof values.qrIdentifier  === 'string' && values.qrIdentifier ? values.qrIdentifier : undefined
    const qrDescription = typeof values.qrDescription === 'string' && values.qrDescription ? values.qrDescription : undefined

    const qrShowBase = typeof values.qrShowBase === 'boolean' ? values.qrShowBase : true

    const geometry = await deps.qrBuilder.build({
      pathData: '', targetSize, depth, stampRelief,
      qrType, qrContent, qrPixKeyType, qrValue, qrIdentifier, qrDescription, qrShowBase,
    })

    // Also generate SVG and PNG for digital download
    const QRCode = await import('qrcode')
    const { buildPixPayload } = await import('../../../infrastructure/qr/PixPayloadBuilder')
    const content = qrType === 'pix'
      ? buildPixPayload({ key: qrContent, keyType: qrPixKeyType as import('../../../infrastructure/qr/PixPayloadBuilder').PixKeyType, value: qrValue, identifier: qrIdentifier, description: qrDescription })
      : qrContent

    const svgString  = await QRCode.toString(content, { type: 'svg', margin: 2 })
    const pngDataUrl = await QRCode.toDataURL(content, { margin: 2, width: 512 })

    // pixCopiaCola allows the user to paste the payload in their bank app to test before printing
    const pixCopiaCola = qrType === 'pix' ? content : undefined

    return { status: 'success', geometry, svgString, pngDataUrl, pixCopiaCola }
  }

  if (renderStrategy.type === 'openscad') {
    const scadTemplate = renderStrategy.scadTemplate ?? ''
    if (!scadTemplate) return { status: 'error', error: 'scadTemplate não definido no modelo.' }

    const geometry = await deps.geometryBuilder.build({
      pathData: '', targetSize: 0, depth: 0,
      scadTemplate,
      templateParams: {
        text:         values.text         ?? 'Forja3D',
        text2:        values.text2        ?? '',
        fontSize:     values.fontSize     ?? 8,
        shape:        values.shape        ?? 'retangular_arredondado',
        thickness:    values.thickness    ?? 4,
        textDepth:    values.textDepth    ?? 1.5,
        padding:      values.padding      ?? 4,
        holeDiameter: values.holeDiameter ?? 6,
        addNfc:       values.addNfc       ?? false,
        fontKey:      values.fontKey      ?? 'NotoSans',
      },
    })
    return { status: 'success', geometry }
  }

  return { status: 'error', error: `Estratégia "${renderStrategy.type}" ainda não implementada.` }
}
