import type { IQrContentBuilder, QrContentBuildOptions } from '../../application/ports/IQrContentBuilder'
import { buildPixPayload } from './PixPayloadBuilder'
import type { PixKeyType } from './PixPayloadBuilder'

const PIX_KEY_TYPES = ['cpf', 'cnpj', 'email', 'phone', 'random'] as const

function isPixKeyType(value: string): value is PixKeyType {
  return PIX_KEY_TYPES.some((type) => type === value)
}

export class QrContentBuilder implements IQrContentBuilder {
  build(options: QrContentBuildOptions): string {
    if (options.type === 'pix') {
      return buildPixPayload({
        key: options.content,
        keyType: isPixKeyType(options.pixKeyType) ? options.pixKeyType : 'email',
        value: options.value,
        identifier: options.identifier,
        description: options.description,
      })
    }

    if (options.type === 'wifi') {
      const [ssid, password, security = 'WPA'] = options.content.split('|')
      return `WIFI:T:${security};S:${ssid};P:${password};;`
    }

    if (options.type === 'whatsapp') {
      const phone = options.content.replace(/\D/g, '')
      return `https://wa.me/${phone}`
    }

    if (options.type === 'url') {
      return options.content.startsWith('http') ? options.content : `https://${options.content}`
    }

    return options.content
  }
}
