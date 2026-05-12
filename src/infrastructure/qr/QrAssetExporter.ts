import QRCode from 'qrcode'
import type { IQrAssetExporter } from '../../application/ports/IQrAssetExporter'

export class QrAssetExporter implements IQrAssetExporter {
  async toSvg(content: string): Promise<string> {
    return QRCode.toString(content, { type: 'svg', margin: 2 })
  }

  async toPngDataUrl(content: string): Promise<string> {
    return QRCode.toDataURL(content, { margin: 2, width: 512 })
  }
}
