// @vitest-environment happy-dom

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useModelGenerator } from './useModelGenerator'
import type { GenerateModelDeps } from '../../application/useCases/generateModel'
import type { IGeometryBuilder } from '../../application/ports/IGeometryBuilder'
import type { IImageTracer } from '../../application/ports/IImageTracer'
import type { IQrAssetExporter } from '../../application/ports/IQrAssetExporter'
import type { IQrContentBuilder } from '../../application/ports/IQrContentBuilder'
import type { Model } from '../../shared/types'

const geometryBuilder: IGeometryBuilder = {
  build() {
    return new ArrayBuffer(8)
  },
}

const imageTracer: IImageTracer = {
  async trace() {
    return { pathData: '', width: 0, height: 0 }
  },
}

const qrContentBuilder: IQrContentBuilder = {
  build() {
    return 'https://forja3d.test'
  },
}

const qrAssetExporter: IQrAssetExporter = {
  async toSvg() {
    return '<svg />'
  },
  async toPngDataUrl() {
    return 'data:image/png;base64,test'
  },
}

const qrModel: Model = {
  id: 'qr-code',
  slug: 'qr-code',
  title: 'QR Code',
  description: 'Teste',
  category: 'signs',
  renderStrategy: { type: 'three-qr' },
  parameters: [],
  creditsRequired: 1,
}

describe('useModelGenerator', () => {
  it('repassa todas as dependências necessárias para gerar QR', async () => {
    const deps: GenerateModelDeps = {
      imageTracer,
      geometryBuilder,
      qrBuilder: geometryBuilder,
      qrContentBuilder,
      qrAssetExporter,
    }
    const onError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const { result } = renderHook(() => (
      useModelGenerator(qrModel, { qrType: 'Link', qrContent: 'forja3d.test' }, null, deps)
    ))

    await act(async () => {
      await result.current.generate()
    })

    expect(result.current.error).toBeNull()
    expect(result.current.stlBuffer).toBeInstanceOf(ArrayBuffer)
    expect(result.current.svgString).toBe('<svg />')
    expect(result.current.pngDataUrl).toBe('data:image/png;base64,test')

    onError.mockRestore()
  })

  it('cancela geracao anterior quando uma nova geracao e iniciada', async () => {
    const cancelPending = vi.fn()
    const delayedBuilder: IGeometryBuilder & { cancelPending: () => void } = {
      cancelPending,
      async build() {
        await new Promise((resolve) => setTimeout(resolve, 20))
        return new ArrayBuffer(8)
      },
    }
    const deps: GenerateModelDeps = {
      imageTracer,
      geometryBuilder: delayedBuilder,
      qrBuilder: delayedBuilder,
      qrContentBuilder,
      qrAssetExporter,
    }

    const { result } = renderHook(() => (
      useModelGenerator(qrModel, { qrType: 'Link', qrContent: 'forja3d.test' }, null, deps)
    ))

    await act(async () => {
      void result.current.generate()
      void result.current.generate()
      await new Promise((resolve) => setTimeout(resolve, 60))
    })

    expect(cancelPending).toHaveBeenCalledTimes(2)
    expect(result.current.error).toBeNull()
  })
})
