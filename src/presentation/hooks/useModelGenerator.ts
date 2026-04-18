import { useCallback, useRef, useState } from 'react'
import type { Model, ParameterValue } from '../../shared/types'
import { CanvasImageTracer } from '../../infrastructure/tracer/CanvasImageTracer'
import { OpenScadGeometryBuilder } from '../../infrastructure/openscad/OpenScadGeometryBuilder'
import { HeightmapStampBuilder } from '../../infrastructure/three/HeightmapStampBuilder'
import { PotraceStampBuilder } from '../../infrastructure/three/PotraceStampBuilder'
import { QrCodeGeometryBuilder } from '../../infrastructure/three/QrCodeGeometryBuilder'
import { generateModel } from '../../application/useCases/generateModel'
import { exportStl } from '../../application/useCases/exportStl'

export interface UseModelGeneratorReturn {
  stlBuffer: ArrayBuffer | null
  secondaryStlBuffer: ArrayBuffer | null
  svgString: string | null
  pngDataUrl: string | null
  pixCopiaCola: string | null
  isLoading: boolean
  error: string | null
  generate: () => Promise<void>
  download: () => void
  downloadSecondary: () => void
  downloadSvg: () => void
  downloadPng: () => void
}

// Adapters are instantiated once per hook instance (stable references)
const tracer = new CanvasImageTracer()
const builder = new OpenScadGeometryBuilder()
const heightmapBuilder = new HeightmapStampBuilder()
const potraceBuilder = new PotraceStampBuilder()
const qrBuilder = new QrCodeGeometryBuilder()

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
  const [secondaryStlBuffer, setSecondaryStlBuffer] = useState<ArrayBuffer | null>(null)
  const [svgString, setSvgString] = useState<string | null>(null)
  const [pngDataUrl, setPngDataUrl] = useState<string | null>(null)
  const [pixCopiaCola, setPixCopiaCola] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const stlRef = useRef<ArrayBuffer | null>(null)
  const secondaryStlRef = useRef<ArrayBuffer | null>(null)
  const svgRef = useRef<string | null>(null)
  const pngRef = useRef<string | null>(null)

  const generate = useCallback(async () => {
    if (!model) return
    setIsLoading(true)
    setError(null)

    try {
      let imageData: ImageData | undefined
      if (imageFile) imageData = await fileToImageData(imageFile)

      const result = await generateModel(model, values, imageData, {
        imageTracer: tracer,
        geometryBuilder: builder,
        heightmapBuilder,
        potraceBuilder,
        qrBuilder,
      })

      if (result.status === 'success' && result.geometry) {
        setStlBuffer(result.geometry)
        stlRef.current = result.geometry
        setSecondaryStlBuffer(result.secondaryGeometry ?? null)
        secondaryStlRef.current = result.secondaryGeometry ?? null
        setSvgString(result.svgString ?? null)
        svgRef.current = result.svgString ?? null
        setPngDataUrl(result.pngDataUrl ?? null)
        pngRef.current = result.pngDataUrl ?? null
        setPixCopiaCola(result.pixCopiaCola ?? null)
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
    exportStl(stlRef.current, `${model.slug}-cortador.stl`)
  }, [model])

  const downloadSecondary = useCallback(() => {
    if (!secondaryStlRef.current || !model) return
    exportStl(secondaryStlRef.current, `${model.slug}-carimbo.stl`)
  }, [model])

  const downloadSvg = useCallback(() => {
    if (!svgRef.current || !model) return
    const blob = new Blob([svgRef.current], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${model.slug}.svg`; a.click()
    URL.revokeObjectURL(url)
  }, [model])

  const downloadPng = useCallback(() => {
    if (!pngRef.current || !model) return
    const a = document.createElement('a')
    a.href = pngRef.current; a.download = `${model.slug}.png`; a.click()
  }, [model])

  return { stlBuffer, secondaryStlBuffer, svgString, pngDataUrl, pixCopiaCola, isLoading, error, generate, download, downloadSecondary, downloadSvg, downloadPng }
}
