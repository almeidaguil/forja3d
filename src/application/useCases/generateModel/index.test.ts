import { describe, expect, it } from 'vitest'
import { generateModel, type GenerateModelDeps } from './index'
import type { ExtrudeConfig, IGeometryBuilder } from '../../ports/IGeometryBuilder'
import type { IQrAssetExporter } from '../../ports/IQrAssetExporter'
import type { IQrContentBuilder, QrContentBuildOptions } from '../../ports/IQrContentBuilder'
import type { IImageTracer } from '../../ports/IImageTracer'
import type { Model } from '../../../shared/types'

class CapturingGeometryBuilder implements IGeometryBuilder {
  readonly calls: ExtrudeConfig[] = []

  build(config: ExtrudeConfig): ArrayBuffer {
    this.calls.push(config)
    return new ArrayBuffer(8)
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
})
