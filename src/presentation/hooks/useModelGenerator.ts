import { useCallback, useRef, useState } from 'react'
import type { Model, ParameterValue } from '../../shared/types'
import { CanvasImageTracer } from '../../infrastructure/tracer/CanvasImageTracer'
import { OpenScadGeometryBuilder } from '../../infrastructure/openscad/OpenScadGeometryBuilder'
import { HeightmapStampBuilder } from '../../infrastructure/three/HeightmapStampBuilder'
import { PotraceStampBuilder } from '../../infrastructure/three/PotraceStampBuilder'
import { generateModel } from '../../application/useCases/generateModel'
import { exportStl } from '../../application/useCases/exportStl'

export interface UseModelGeneratorReturn {
  stlBuffer: ArrayBuffer | null
  isLoading: boolean
  error: string | null
  generate: () => Promise<void>
  download: () => void
}

// Adapters are instantiated once per hook instance (stable references)
const tracer = new CanvasImageTracer()
const builder = new OpenScadGeometryBuilder()
const heightmapBuilder = new HeightmapStampBuilder()
const potraceBuilder = new PotraceStampBuilder()

async function fileToImageData(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas 2D not available')); return }
      ctx.drawImage(img, 0, 0)
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height))
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

export function useModelGenerator(
  model: Model | undefined,
  values: Record<string, ParameterValue>,
  imageFile: File | null,
): UseModelGeneratorReturn {
  const [stlBuffer, setStlBuffer] = useState<ArrayBuffer | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Keep a stable ref for latest stlBuffer to avoid stale closure in download
  const stlRef = useRef<ArrayBuffer | null>(null)

  const generate = useCallback(async () => {
    if (!model) return
    setIsLoading(true)
    setError(null)

    try {
      let imageData: ImageData | undefined
      if (imageFile) imageData = await fileToImageData(imageFile)

      const result = await generateModel(model, values, imageData, { imageTracer: tracer, geometryBuilder: builder, heightmapBuilder, potraceBuilder })

      if (result.status === 'success' && result.geometry) {
        setStlBuffer(result.geometry)
        stlRef.current = result.geometry
      } else {
        setError(result.error ?? 'Erro desconhecido na geração.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.')
    } finally {
      setIsLoading(false)
    }
  }, [model, values, imageFile])

  const download = useCallback(() => {
    if (!stlRef.current || !model) return
    exportStl(stlRef.current, `${model.slug}.stl`)
  }, [model])

  return { stlBuffer, isLoading, error, generate, download }
}
