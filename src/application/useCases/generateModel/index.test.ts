import { beforeAll, describe, expect, it } from 'vitest'
import { generateModel, type GenerateModelDeps } from './index'
import type { ExtrudeConfig, IGeometryBuilder } from '../../ports/IGeometryBuilder'
import type { IQrAssetExporter } from '../../ports/IQrAssetExporter'
import type { IQrContentBuilder, QrContentBuildOptions } from '../../ports/IQrContentBuilder'
import type { IImageTracer } from '../../ports/IImageTracer'
import type { ConvertImageOptions, IImageConverter } from '../../ports/IImageConverter'
import type { Model } from '../../../shared/types'

class CapturingGeometryBuilder implements IGeometryBuilder {
  readonly calls: ExtrudeConfig[] = []
  readonly output: ArrayBuffer

  constructor(byteLength = 8) {
    this.output = new ArrayBuffer(byteLength)
  }

  build(config: ExtrudeConfig): ArrayBuffer {
    this.calls.push(config)
    return this.output
  }
}

class CapturingImageTracer implements IImageTracer {
  readonly calls: Array<{ imageData: ImageData; threshold: number }> = []
  private readonly pathData: string

  constructor(pathData = 'M 0 0 L 10 0 L 10 10 Z') {
    this.pathData = pathData
  }

  async trace(imageData: ImageData, threshold: number) {
    this.calls.push({ imageData, threshold })
    return { pathData: this.pathData, width: imageData.width, height: imageData.height }
  }
}

class CapturingQrContentBuilder implements IQrContentBuilder {
  readonly calls: QrContentBuildOptions[] = []

  build(options: QrContentBuildOptions): string {
    this.calls.push(options)
    return `content:${options.type}:${options.content}`
  }
}

class FakeQrAssetExporter implements IQrAssetExporter {
  async toSvg(content: string): Promise<string> {
    return `<svg>${content}</svg>`
  }

  async toPngDataUrl(content: string): Promise<string> {
    return `data:image/png;base64,${content}`
  }
}

class FakeImageConverter implements IImageConverter {
  readonly calls: ConvertImageOptions[] = []

  async convert(_imageData: ImageData, options: ConvertImageOptions): Promise<ArrayBuffer> {
    this.calls.push(options)
    if (options.format === 'svg') return new TextEncoder().encode('<svg><path d="M0 0H10V1H0Z"/></svg>').buffer
    return new TextEncoder().encode('converted').buffer
  }
}

const unusedImageTracer: IImageTracer = {
  async trace() {
    return { pathData: '', width: 0, height: 0 }
  },
}

const unusedGeometryBuilder: IGeometryBuilder = {
  build() {
    return new ArrayBuffer(0)
  },
}

beforeAll(() => {
  if (typeof ImageData !== 'undefined') return

  class TestImageData {
    readonly data: Uint8ClampedArray
    readonly width: number
    readonly height: number

    constructor(data: Uint8ClampedArray, width: number, height: number) {
      this.data = data
      this.width = width
      this.height = height
    }
  }

  globalThis.ImageData = TestImageData as typeof ImageData
})

function createImageData(): ImageData {
  return new ImageData(new Uint8ClampedArray([
    255, 255, 255, 0,
    0, 0, 0, 255,
    0, 0, 0, 255,
    255, 255, 255, 0,
  ]), 2, 2)
}

function createQrModel(slug = 'qr-code'): Model {
  return {
    id: slug,
    slug,
    title: 'QR Code',
    description: 'Teste',
    category: 'signs',
    renderStrategy: { type: 'three-qr' },
    parameters: [],
    creditsRequired: 1,
  }
}

function createDeps(): GenerateModelDeps & {
  qrBuilder: CapturingGeometryBuilder
  qrContentBuilder: CapturingQrContentBuilder
} {
  const qrBuilder = new CapturingGeometryBuilder()
  const qrContentBuilder = new CapturingQrContentBuilder()

  return {
    imageTracer: unusedImageTracer,
    geometryBuilder: unusedGeometryBuilder,
    qrBuilder,
    qrContentBuilder,
    qrAssetExporter: new FakeQrAssetExporter(),
  }
}

describe('generateModel three-qr', () => {
  it('normaliza Link para url e gera STL, SVG e PNG', async () => {
    const deps = createDeps()

    const result = await generateModel(createQrModel(), {
      qrType: 'Link',
      qrContent: ' exemplo.com ',
      targetSize: 55,
      depth: 4,
      stampRelief: 2,
      qrShowBase: false,
    }, undefined, deps)

    expect(result.status).toBe('success')
    expect(result.geometry).toBeInstanceOf(ArrayBuffer)
    expect(result.svgString).toBe('<svg>content:url:exemplo.com</svg>')
    expect(result.pngDataUrl).toBe('data:image/png;base64,content:url:exemplo.com')
    expect(result.pixCopiaCola).toBeUndefined()
    expect(deps.qrBuilder.calls[0]).toMatchObject({
      qrType: 'url',
      qrContent: 'exemplo.com',
      targetSize: 55,
      depth: 4,
      stampRelief: 2,
      qrShowBase: false,
    })
    expect(deps.qrContentBuilder.calls[0]).toMatchObject({
      type: 'url',
      content: 'exemplo.com',
      pixKeyType: 'email',
    })
  })

  it('normaliza Texto para text e preserva o conteúdo aparado', async () => {
    const deps = createDeps()

    const result = await generateModel(createQrModel(), {
      qrType: 'Texto',
      qrContent: ' Olá Forja3D ',
    }, undefined, deps)

    expect(result.status).toBe('success')
    expect(deps.qrBuilder.calls[0]).toMatchObject({
      qrType: 'text',
      qrContent: 'Olá Forja3D',
    })
    expect(result.svgString).toBe('<svg>content:text:Olá Forja3D</svg>')
  })

  it('monta conteúdo Wi-Fi a partir dos campos dedicados', async () => {
    const deps = createDeps()

    const result = await generateModel(createQrModel(), {
      qrType: 'Wi-Fi',
      wifiSsid: 'Forja',
      wifiPassword: 'senha-secreta',
      wifiSecurity: 'Sem senha',
    }, undefined, deps)

    expect(result.status).toBe('success')
    expect(deps.qrBuilder.calls[0]).toMatchObject({
      qrType: 'wifi',
      qrContent: 'Forja|senha-secreta|nopass',
    })
    expect(deps.qrContentBuilder.calls[0]).toMatchObject({
      type: 'wifi',
      content: 'Forja|senha-secreta|nopass',
    })
  })

  it('retorna erro quando Wi-Fi não tem SSID', async () => {
    const deps = createDeps()

    const result = await generateModel(createQrModel(), {
      qrType: 'Wi-Fi',
      wifiPassword: 'senha-secreta',
    }, undefined, deps)

    expect(result).toEqual({ status: 'error', error: 'Informe o nome da rede Wi-Fi.' })
    expect(deps.qrBuilder.calls).toHaveLength(0)
    expect(deps.qrContentBuilder.calls).toHaveLength(0)
  })

  it('gera Pix copia e cola quando o tipo é Pix', async () => {
    const deps = createDeps()

    const result = await generateModel(createQrModel('qr-pix'), {
      qrContent: 'pix@example.com',
      qrPixKeyType: 'email',
      qrValue: 12.5,
      qrIdentifier: 'pedido-42',
      qrDescription: 'Pedido 42',
    }, undefined, deps)

    expect(result.status).toBe('success')
    expect(result.pixCopiaCola).toBe('content:pix:pix@example.com')
    expect(deps.qrBuilder.calls[0]).toMatchObject({
      qrType: 'pix',
      qrContent: 'pix@example.com',
      qrPixKeyType: 'email',
      qrValue: 12.5,
      qrIdentifier: 'pedido-42',
      qrDescription: 'Pedido 42',
    })
    expect(deps.qrContentBuilder.calls[0]).toMatchObject({
      type: 'pix',
      content: 'pix@example.com',
      pixKeyType: 'email',
      value: 12.5,
      identifier: 'pedido-42',
      description: 'Pedido 42',
    })
  })

  it('retorna erro quando as dependências de QR não estão disponíveis', async () => {
    const result = await generateModel(createQrModel(), {
      qrType: 'Link',
      qrContent: 'exemplo.com',
    }, undefined, {
      imageTracer: unusedImageTracer,
      geometryBuilder: unusedGeometryBuilder,
    })

    expect(result).toEqual({ status: 'error', error: 'QrCodeGeometryBuilder não disponível.' })
  })
})

describe('generateModel openscad', () => {
  it('repassa os parâmetros do Porta Tag NFC para o template OpenSCAD', async () => {
    const geometryBuilder = new CapturingGeometryBuilder()
    const model: Model = {
      id: 'nfc-tag-keychain',
      slug: 'nfc-tag-keychain',
      title: 'Porta Tag NFC',
      description: 'Teste',
      category: 'keychains',
      renderStrategy: { type: 'openscad', scadTemplate: 'nfc-tag-keychain' },
      parameters: [],
      creditsRequired: 1,
    }

    const result = await generateModel(model, {
      text: 'VIP',
      shape: 'Escudo',
      nfcMountMode: 'Recesso para adesivo/resina',
      width: 48,
      height: 62,
      thickness: 4.5,
      textDepth: 1.4,
      fontSize: 9,
      holeDiameter: 5.5,
      nfcDiameter: 25,
      nfcClearance: 0.6,
      cavityDepth: 1.3,
      coverThickness: 0.9,
      topCoverThickness: 0.8,
      epoxyBorder: false,
      borderHeight: 1.6,
      fontKey: 'Roboto',
    }, undefined, {
      imageTracer: unusedImageTracer,
      geometryBuilder,
    })

    expect(result.status).toBe('success')
    expect(geometryBuilder.calls[0]).toMatchObject({
      scadTemplate: 'nfc-tag-keychain',
      templateParams: {
        text: 'VIP',
        shape: 'Escudo',
        nfcMountMode: 'Recesso para adesivo/resina',
        width: 48,
        height: 62,
        thickness: 4.5,
        textDepth: 1.4,
        fontSize: 9,
        holeDiameter: 5.5,
        nfcDiameter: 25,
        nfcClearance: 0.6,
        cavityDepth: 1.3,
        coverThickness: 0.9,
        topCoverThickness: 0.8,
        epoxyBorder: false,
        borderHeight: 1.6,
        fontKey: 'Roboto',
      },
    })
  })

  it('repassa parametros do chaveiro de texto para o template OpenSCAD', async () => {
    const geometryBuilder = new CapturingGeometryBuilder()
    const model: Model = {
      id: 'keychain',
      slug: 'keychain',
      title: 'Chaveiro',
      description: 'Teste',
      category: 'keychains',
      renderStrategy: { type: 'openscad', scadTemplate: 'keychain' },
      parameters: [],
      creditsRequired: 1,
    }

    const result = await generateModel(model, {
      text: 'LUA',
      text2: '2026',
      fontSize: 10,
      shape: 'circle',
      thickness: 5,
      textDepth: 1.2,
      padding: 6,
      holeDiameter: 4,
      addNfc: true,
      fontKey: 'Montserrat',
    }, undefined, {
      imageTracer: unusedImageTracer,
      geometryBuilder,
    })

    expect(result.status).toBe('success')
    expect(geometryBuilder.calls[0]).toMatchObject({
      scadTemplate: 'keychain',
      templateParams: {
        text: 'LUA',
        text2: '2026',
        fontSize: 10,
        shape: 'circle',
        thickness: 5,
        textDepth: 1.2,
        padding: 6,
        holeDiameter: 4,
        addNfc: true,
        fontKey: 'Montserrat',
      },
    })
  })
})

describe('generateModel image models', () => {
  function createImageModel(mode: Model['renderStrategy']): Model {
    return {
      id: 'image-model',
      slug: 'image-model',
      title: 'Modelo com Imagem',
      description: 'Teste',
      category: 'cutters',
      renderStrategy: mode,
      parameters: [],
      creditsRequired: 1,
    }
  }

  it('gera cortador simples com imagem rastreada', async () => {
    const imageTracer = new CapturingImageTracer()
    const geometryBuilder = new CapturingGeometryBuilder()
    const imageData = createImageData()

    const result = await generateModel(createImageModel({ type: 'three-extrude', svgSource: 'image' }), {
      threshold: 100,
      targetSize: 72,
      cutterHeight: 11,
      wallThickness: 1.6,
      mode: 'Cortador',
      tipWidth: 0.5,
      chamferHeight: 2,
      baseWidth: 4,
      baseHeight: 3,
    }, imageData, {
      imageTracer,
      geometryBuilder,
    })

    expect(result).toMatchObject({ status: 'success', geometry: geometryBuilder.output })
    expect(imageTracer.calls[0].threshold).toBe(100)
    expect(geometryBuilder.calls[0]).toMatchObject({
      pathData: 'M 0 0 L 10 0 L 10 10 Z',
      targetSize: 72,
      depth: 11,
      wallThickness: 1.6,
      mode: 'cutter',
      tipWidth: 0.5,
      chamferHeight: 2,
      baseWidth: 4,
      baseHeight: 3,
    })
  })

  it('retorna erro quando modelo de imagem nao recebe imagem', async () => {
    const result = await generateModel(createImageModel({ type: 'three-extrude', svgSource: 'image' }), {}, undefined, {
      imageTracer: new CapturingImageTracer(),
      geometryBuilder: new CapturingGeometryBuilder(),
    })

    expect(result).toEqual({ status: 'error', error: 'Selecione uma imagem antes de gerar.' })
  })

  it('retorna erro quando nao detecta contorno no cortador', async () => {
    const result = await generateModel(createImageModel({ type: 'three-extrude', svgSource: 'image' }), {}, createImageData(), {
      imageTracer: new CapturingImageTracer(''),
      geometryBuilder: new CapturingGeometryBuilder(),
    })

    expect(result).toEqual({ status: 'error', error: 'Não foi possível detectar um contorno na imagem.' })
  })

  it('gera cortador e carimbo como STLs separados', async () => {
    const imageTracer = new CapturingImageTracer()
    const geometryBuilder = new CapturingGeometryBuilder(8)
    const potraceBuilder = new CapturingGeometryBuilder(16)
    const imageData = createImageData()

    const result = await generateModel(createImageModel({ type: 'three-extrude', svgSource: 'image' }), {
      mode: 'Cortador + Carimbo',
      targetSize: 80,
      cutterHeight: 12,
      wallThickness: 1.8,
      threshold: 140,
      stampRelief: 2.5,
      turdSize: 6,
      bezierSteps: 14,
      mirror: false,
    }, imageData, {
      imageTracer,
      geometryBuilder,
      potraceBuilder,
    })

    expect(result).toMatchObject({
      status: 'success',
      geometry: geometryBuilder.output,
      secondaryGeometry: potraceBuilder.output,
    })
    expect(geometryBuilder.calls[0]).toMatchObject({
      targetSize: 80,
      depth: 12,
      wallThickness: 1.8,
      mode: 'cutter',
    })
    expect(potraceBuilder.calls[0]).toMatchObject({
      pathData: '',
      imageData,
      targetSize: 79.2,
      depth: 4,
      stampRelief: 2.5,
      mirror: false,
      threshold: 140,
      turdSize: 6,
      bezierSteps: 14,
    })
  })

  it('gera carimbo heightmap legado com parametros de relevo', async () => {
    const heightmapBuilder = new CapturingGeometryBuilder()
    const imageData = createImageData()

    const result = await generateModel(createImageModel({ type: 'three-heightmap', svgSource: 'image' }), {
      targetSize: 65,
      baseHeight: 4,
      reliefHeight: 2,
      stampResolution: 90,
      mirror: false,
    }, imageData, {
      imageTracer: unusedImageTracer,
      geometryBuilder: unusedGeometryBuilder,
      heightmapBuilder,
    })

    expect(result).toMatchObject({ status: 'success', geometry: heightmapBuilder.output })
    expect(heightmapBuilder.calls[0]).toMatchObject({
      pathData: '',
      targetSize: 65,
      depth: 4,
      stampRelief: 2,
      stampResolution: 90,
      mirror: false,
      imageData,
    })
  })

  it('gera carimbo Potrace com parametros de vetorizacao', async () => {
    const potraceBuilder = new CapturingGeometryBuilder()
    const imageData = createImageData()

    const result = await generateModel(createImageModel({ type: 'potrace-stamp', svgSource: 'image' }), {
      targetSize: 55,
      baseHeight: 3,
      reliefHeight: 1.5,
      mirror: false,
      threshold: 160,
      turdSize: 8,
      bezierSteps: 18,
    }, imageData, {
      imageTracer: unusedImageTracer,
      geometryBuilder: unusedGeometryBuilder,
      potraceBuilder,
    })

    expect(result).toMatchObject({ status: 'success', geometry: potraceBuilder.output })
    expect(potraceBuilder.calls[0]).toMatchObject({
      pathData: '',
      imageData,
      targetSize: 55,
      depth: 3,
      stampRelief: 1.5,
      mirror: false,
      threshold: 160,
      turdSize: 8,
      bezierSteps: 18,
    })
  })

  it('retorna erro quando builder Potrace nao esta disponivel', async () => {
    const result = await generateModel(createImageModel({ type: 'potrace-stamp', svgSource: 'image' }), {}, createImageData(), {
      imageTracer: unusedImageTracer,
      geometryBuilder: unusedGeometryBuilder,
    })

    expect(result).toEqual({ status: 'error', error: 'PotraceStampBuilder não disponível.' })
  })
})

describe('generateModel image-converter', () => {
  const imageData = {
    width: 1,
    height: 1,
    data: new Uint8ClampedArray([0, 0, 0, 255]),
  } as ImageData

  function createImageConverterModel(): Model {
    return {
      id: 'image-converter',
      slug: 'image-converter',
      title: 'Conversor de Imagens',
      description: 'Teste',
      category: 'utilities',
      renderStrategy: { type: 'image-converter', imageProcessing: 'canvas' },
      parameters: [],
      creditsRequired: 1,
    }
  }

  it('retorna sucesso com arquivo convertido mesmo sem STL', async () => {
    const imageConverter = new FakeImageConverter()

    const result = await generateModel(createImageConverterModel(), {
      outputFormat: 'webp',
      quality: 120,
      scale: 10,
      exportAsStl: false,
    }, imageData, {
      imageTracer: unusedImageTracer,
      geometryBuilder: unusedGeometryBuilder,
      imageConverter,
    })

    expect(result.status).toBe('success')
    expect(result.geometry).toBeUndefined()
    expect(result.pngDataUrl).toMatch(/^blob:/)
    expect(result.downloadFileName).toBe('image-converter.webp')
    expect(result.downloadMimeType).toBe('image/webp')
    expect(result.downloadLabel).toBe('Baixar WEBP (imagem)')
    expect(imageConverter.calls[0]).toMatchObject({
      format: 'webp',
      quality: 1,
      scale: 4,
    })
  })

  it('rejeita formato sem encoder real na V1', async () => {
    const result = await generateModel(createImageConverterModel(), {
      outputFormat: 'pdf',
    }, imageData, {
      imageTracer: unusedImageTracer,
      geometryBuilder: unusedGeometryBuilder,
      imageConverter: new FakeImageConverter(),
    })

    expect(result).toEqual({ status: 'error', error: 'Formato não suportado: pdf' })
  })

  it('gera SVG com path vetorial para slicers', async () => {
    const imageConverter = new FakeImageConverter()

    const result = await generateModel(createImageConverterModel(), {
      outputFormat: 'svg',
    }, imageData, {
      imageTracer: unusedImageTracer,
      geometryBuilder: unusedGeometryBuilder,
      imageConverter,
    })

    expect(result.status).toBe('success')
    expect(result.svgString).toContain('<path d="M0 0H10V1H0Z"')
    expect(result.svgString).not.toContain('<image')
    expect(result.downloadFileName).toBe('image-converter.svg')
    expect(imageConverter.calls[0]).toMatchObject({ format: 'svg' })
  })
})
