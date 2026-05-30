import type { Model, ParameterValue, GenerationResult } from '../../../shared/types'
import type { IImageTracer } from '../../ports/IImageTracer'
import type { IImageConverter, ImageFormat } from '../../ports/IImageConverter'
import type { GeometryMode, IGeometryBuilder } from '../../ports/IGeometryBuilder'
import type { IQrAssetExporter } from '../../ports/IQrAssetExporter'
import type { IQrContentBuilder } from '../../ports/IQrContentBuilder'
import { fillEnclosedRegions } from '../../services/imageProcessing'

export interface GenerateModelDeps {
  imageTracer: IImageTracer
  geometryBuilder: IGeometryBuilder
  heightmapBuilder?: IGeometryBuilder
  potraceBuilder?: IGeometryBuilder
  qrBuilder?: IGeometryBuilder
  qrContentBuilder?: IQrContentBuilder
  qrAssetExporter?: IQrAssetExporter
  imageConverter?: IImageConverter
}

function extractDepth(values: Record<string, ParameterValue>): number {
  if (typeof values.cutterHeight === 'number') return values.cutterHeight
  if (typeof values.baseHeight === 'number' && typeof values.reliefHeight === 'number') {
    return values.baseHeight + values.reliefHeight
  }
  if (typeof values.depth === 'number') return values.depth
  return 10
}

const IMAGE_CONVERTER_FORMATS = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'bmp'] as const satisfies readonly ImageFormat[]

const IMAGE_CONVERTER_MIME_TYPES: Record<ImageFormat, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
}

function isImageConverterOutputFormat(value: string): value is ImageFormat {
  return IMAGE_CONVERTER_FORMATS.some((format) => format === value)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function getImageDownloadLabel(format: ImageFormat): string {
  const label = format === 'jpg' ? 'JPG' : format.toUpperCase()
  return `Baixar ${label} (imagem)`
}


function normalizeQrType(value: ParameterValue | undefined): string {
  if (value === 'Texto') return 'text'
  if (value === 'Link') return 'url'
  if (value === 'Wi-Fi') return 'wifi'
  return typeof value === 'string' ? value : 'pix'
}

function normalizeWifiSecurity(value: ParameterValue | undefined): string {
  if (value === 'Sem senha') return 'nopass'
  return typeof value === 'string' ? value : 'WPA'
}

function buildOpenScadTemplateParams(
  template: string,
  values: Record<string, ParameterValue>,
): Record<string, unknown> {
  if (template === 'nfc-tag-keychain') {
    return {
      text: values.text ?? 'SCAN',
      shape: values.shape ?? 'Quadrado arredondado',
      nfcMountMode: values.nfcMountMode ?? 'Bolso interno (pausa)',
      width: values.width ?? 45,
      height: values.height ?? 58,
      thickness: values.thickness ?? 4,
      textDepth: values.textDepth ?? 1.2,
      fontSize: values.fontSize ?? 8,
      holeDiameter: values.holeDiameter ?? 5,
      nfcDiameter: values.nfcDiameter ?? 25,
      nfcClearance: values.nfcClearance ?? 0.4,
      cavityDepth: values.cavityDepth ?? 1.2,
      coverThickness: values.coverThickness ?? 0.8,
      topCoverThickness: values.topCoverThickness ?? 0.8,
      epoxyBorder: values.epoxyBorder ?? true,
      borderHeight: values.borderHeight ?? 1.2,
      fontKey: values.fontKey ?? 'NotoSans',
    }
  }
  if (template === 'phone-stand') {
    return {
      deviceWidth: values.deviceWidth ?? 75,
      deviceThickness: values.deviceThickness ?? 10,
      standAngle: values.standAngle ?? 65,
      baseDepth: values.baseDepth ?? 90,
      lipHeight: values.lipHeight ?? 12,
      cableSlotWidth: values.cableSlotWidth ?? 14,
      wallThickness: values.wallThickness ?? 4,
    }
  }

  return {
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
  }
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
    if (!deps.qrContentBuilder) return { status: 'error', error: 'QrContentBuilder não disponível.' }
    if (!deps.qrAssetExporter) return { status: 'error', error: 'QrAssetExporter não disponível.' }

    const targetSize    = typeof values.targetSize    === 'number' ? values.targetSize    : 50
    const depth         = typeof values.depth         === 'number' ? values.depth         : 3
    const stampRelief   = typeof values.stampRelief   === 'number' ? values.stampRelief   : 1.5
    const qrType        = normalizeQrType(values.qrType)
    const qrPixKeyType  = typeof values.qrPixKeyType  === 'string' ? values.qrPixKeyType  : 'email'
    const qrValue       = typeof values.qrValue       === 'number' && values.qrValue > 0 ? values.qrValue : undefined
    const qrIdentifier  = typeof values.qrIdentifier  === 'string' && values.qrIdentifier ? values.qrIdentifier : undefined
    const qrDescription = typeof values.qrDescription === 'string' && values.qrDescription ? values.qrDescription : undefined
    const qrShowBase = typeof values.qrShowBase === 'boolean' ? values.qrShowBase : true
    const rawContent = typeof values.qrContent === 'string' ? values.qrContent.trim() : ''
    const wifiSsid = typeof values.wifiSsid === 'string' ? values.wifiSsid.trim() : ''
    const wifiPassword = typeof values.wifiPassword === 'string' ? values.wifiPassword : ''
    const wifiSecurity = normalizeWifiSecurity(values.wifiSecurity)

    if (qrType === 'wifi' && !wifiSsid) {
      return { status: 'error', error: 'Informe o nome da rede Wi-Fi.' }
    }
    if (qrType !== 'wifi' && !rawContent) {
      return { status: 'error', error: 'Informe o conteúdo do QR Code.' }
    }

    const qrContent = qrType === 'wifi'
      ? `${wifiSsid}|${wifiPassword}|${wifiSecurity}`
      : rawContent

    const geometry = await deps.qrBuilder.build({
      pathData: '', targetSize, depth, stampRelief,
      qrType, qrContent, qrPixKeyType, qrValue, qrIdentifier, qrDescription, qrShowBase,
    })

    const content = deps.qrContentBuilder.build({
      type: qrType,
      content: qrContent,
      pixKeyType: qrPixKeyType,
      value: qrValue,
      identifier: qrIdentifier,
      description: qrDescription,
    })

    const svgString = await deps.qrAssetExporter.toSvg(content)
    const pngDataUrl = await deps.qrAssetExporter.toPngDataUrl(content)

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
      templateParams: buildOpenScadTemplateParams(scadTemplate, values),
    })
    return { status: 'success', geometry }
  }

  if (renderStrategy.type === 'image-converter') {
    if (!imageData) return { status: 'error', error: 'Selecione uma imagem antes de converter.' }
    if (!deps.imageConverter) return { status: 'error', error: 'ImageConverterAdapter não disponível.' }

    const outputFormat = typeof values.outputFormat === 'string' ? values.outputFormat : 'png'
    const quality = clamp(typeof values.quality === 'number' ? values.quality / 100 : 0.85, 0.1, 1)
    const scale = clamp(typeof values.scale === 'number' ? values.scale : 1, 0.5, 4)
    const exportAsStl = typeof values.exportAsStl === 'boolean' ? values.exportAsStl : false

    if (!isImageConverterOutputFormat(outputFormat)) {
      return { status: 'error', error: `Formato não suportado: ${outputFormat}` }
    }

    const result: GenerationResult = {
      status: 'success',
      downloadFileName: `${model.slug}.${outputFormat === 'jpeg' ? 'jpg' : outputFormat}`,
      downloadMimeType: IMAGE_CONVERTER_MIME_TYPES[outputFormat],
      downloadLabel: getImageDownloadLabel(outputFormat),
    }

    const convertedData = await deps.imageConverter.convert(imageData, {
      format: outputFormat,
      quality,
      scale,
    })

    if (outputFormat === 'svg') {
      result.svgString = new TextDecoder().decode(convertedData)
    } else {
      const blob = new Blob([convertedData], { type: IMAGE_CONVERTER_MIME_TYPES[outputFormat] })
      const url = URL.createObjectURL(blob)
      result.pngDataUrl = url
    }

    // V2: Opcionalmente gerar STL também (reutilizar estratégia do cortador)
    if (exportAsStl) {
      const threshold = typeof values.stlThreshold === 'number' ? values.stlThreshold : 128
      const stlHeight = typeof values.stlHeight === 'number' ? values.stlHeight : 5

      try {
        const filled = fillEnclosedRegions(imageData, threshold)
        const traced = await deps.imageTracer.trace(filled, threshold)

        if (traced.pathData) {
          result.geometry = await deps.geometryBuilder.build({
            pathData: traced.pathData,
            targetSize: 70,
            depth: stlHeight,
            mode: 'solid',
          })
        }
      } catch {
        // A geracao de STL e opcional; a conversao de imagem continua se falhar.
      }
    }

    return result
  }

  return { status: 'error', error: `Estratégia "${renderStrategy.type}" ainda não implementada.` }
}
