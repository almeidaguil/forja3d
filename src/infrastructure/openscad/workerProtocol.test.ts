import { describe, expect, it } from 'vitest'
import type { OpenScadRenderResponse } from './workerProtocol'
import { normalizeWorkerError } from './workerProtocol'

describe('workerProtocol', () => {
  it('normaliza erro desconhecido para mensagem padrao', () => {
    expect(normalizeWorkerError(null)).toBe('Falha ao gerar STL no worker OpenSCAD.')
  })

  it('preserva mensagem de erro valida', () => {
    expect(normalizeWorkerError(new Error('falha de render'))).toBe('falha de render')
    expect(normalizeWorkerError('erro customizado')).toBe('erro customizado')
  })

  it('mantem union de resposta tipada', () => {
    const response: OpenScadRenderResponse = { id: 1, ok: true, geometry: new ArrayBuffer(4) }
    expect(response.ok).toBe(true)
  })
})
