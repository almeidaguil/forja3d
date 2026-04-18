import type { Model } from '../shared/types'
import cookieCutter from './models/cookie-cutter.json'
import stamp from './models/stamp.json'
import keychain from './models/keychain.json'
import qrPix from './models/qr-pix.json'
import qrCode from './models/qr-code.json'

// V2: replace with IModelRepository backed by /api/models
export const models: Model[] = [
  cookieCutter as Model,
  stamp as Model,
  keychain as Model,
  qrPix as Model,
  qrCode as Model,
]

export function getModelBySlug(slug: string): Model | undefined {
  return models.find((m) => m.slug === slug)
}
