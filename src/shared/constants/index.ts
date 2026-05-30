export const APP_NAME = 'Forja3D'

export const CATEGORY_LABELS: Record<string, string> = {
  cutters: 'Cortadores',
  stamps: 'Carimbos',
  keychains: 'Chaveiros',
  signs: 'Letreiros',
  letters: 'Letras',
  utilities: 'Utilitários',
}

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp'] as const

export type AcceptedImageMimeType = (typeof ACCEPTED_IMAGE_TYPES)[number]
