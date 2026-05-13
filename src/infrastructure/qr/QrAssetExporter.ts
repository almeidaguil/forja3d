import QRCode from 'qrcode'
import type { IQrAssetExporter } from '../../application/ports/IQrAssetExporter'

const SVG_MARGIN_MODULES = 2

export class QrAssetExporter implements IQrAssetExporter {
  async toSvg(content: string): Promise<string> {
    const qrData = QRCode.create(content, { errorCorrectionLevel: 'M' })
    const { data, size } = qrData.modules
    const viewBoxSize = size + SVG_MARGIN_MODULES * 2
    const rects: string[] = []

    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        if (!data[row * size + col]) continue
        rects.push(
          `<rect x="${col + SVG_MARGIN_MODULES}" y="${row + SVG_MARGIN_MODULES}" width="1" height="1"/>`,
        )
      }
    }

    return [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" shape-rendering="crispEdges">`,
      '<g fill="#000000">',
      ...rects,
      '</g>',
      '</svg>',
    ].join('')
  }

  async toPngDataUrl(content: string): Promise<string> {
    return QRCode.toDataURL(content, { margin: 2, width: 512 })
  }
}
