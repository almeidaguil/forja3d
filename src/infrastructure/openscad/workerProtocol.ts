export interface OpenScadRenderRequest {
  id: number
  scadCode: string
  fontData?: ArrayBuffer
}

export interface OpenScadRenderSuccess {
  id: number
  ok: true
  geometry: ArrayBuffer
}

export interface OpenScadRenderFailure {
  id: number
  ok: false
  error: string
}

export type OpenScadRenderResponse = OpenScadRenderSuccess | OpenScadRenderFailure

export interface OpenScadCancelRequest {
  type: 'cancel'
  id: number
}

export function normalizeWorkerError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  if (typeof error === 'string' && error.trim()) {
    return error
  }
  return 'Falha ao gerar STL no worker OpenSCAD.'
}
