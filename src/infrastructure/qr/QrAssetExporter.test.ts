import { describe, expect, it } from 'vitest'
import { QrAssetExporter } from './QrAssetExporter'
import { QrContentBuilder } from './QrContentBuilder'

describe('QrAssetExporter', () => {
  it('exporta SVG de QR sem fundo preenchido para preservar os módulos vetoriais', async () => {
    const exporter = new QrAssetExporter()

    const svg = await exporter.toSvg('https://forja3d.test')

    expect(svg).toContain('<svg')
    expect(svg).toContain('<rect')
    expect(svg).toContain('fill="#000000"')
    expect(svg).not.toContain('fill="#ffffff"')
    expect(svg).not.toContain('<path')
  })

  it('mantém PNG como data URL', async () => {
    const exporter = new QrAssetExporter()

    const dataUrl = await exporter.toPngDataUrl('https://forja3d.test')

    expect(dataUrl).toMatch(/^data:image\/png;base64,/)
  })

  it('exporta SVG vetorial para QR genérico e Pix', async () => {
    const exporter = new QrAssetExporter()
    const contentBuilder = new QrContentBuilder()
    const contents = [
      contentBuilder.build({ type: 'url', content: 'https://forja3d.test', pixKeyType: 'email' }),
      contentBuilder.build({ type: 'pix', content: 'teste@pix.com', pixKeyType: 'email' }),
    ]

    const svgs = await Promise.all(contents.map((content) => exporter.toSvg(content)))

    for (const svg of svgs) {
      expect(svg).toContain('<rect')
      expect(svg).not.toContain('fill="#ffffff"')
      expect(svg).not.toContain('<path')
    }
  })
})
