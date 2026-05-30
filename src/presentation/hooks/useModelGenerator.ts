import { useCallback, useRef, useState } from 'react'
import type { Model, ParameterValue } from '../../shared/types'
import { generateModel, type GenerateModelDeps } from '../../application/useCases/generateModel'
import { exportStl } from '../../application/useCases/exportStl'

interface CancelableBuilder {
  cancelPending: () => void
}

function hasCancelableBuilder(value: unknown): value is CancelableBuilder {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.cancelPending === 'function'
}

export interface UseModelGeneratorReturn {
  stlBuffer: ArrayBuffer | null
  secondaryStlBuffer: ArrayBuffer | null
  svgString: string | null
  pngDataUrl: string | null
  pixCopiaCola: string | null
  imageDownloadLabel: string | null
  isLoading: boolean
  error: string | null
  generate: () => Promise<void>
  download: () => void
  downloadSecondary: () => void
  downloadSvg: () => void
  downloadImage: () => void
}

async function fileToImageData(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('Canvas 2D not available'))
        return
      }
      ctx.drawImage(img, 0, 0)
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height))
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

export function useModelGenerator(
  model: Model | undefined,
  values: Record<string, ParameterValue>,
  imageFile: File | null,
  deps: GenerateModelDeps,
): UseModelGeneratorReturn {
  const [stlBuffer, setStlBuffer] = useState<ArrayBuffer | null>(null)
  const [secondaryStlBuffer, setSecondaryStlBuffer] = useState<ArrayBuffer | null>(null)
  const [svgString, setSvgString] = useState<string | null>(null)
  const [pngDataUrl, setPngDataUrl] = useState<string | null>(null)
  const [pixCopiaCola, setPixCopiaCola] = useState<string | null>(null)
  const [imageDownloadLabel, setImageDownloadLabel] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const stlRef = useRef<ArrayBuffer | null>(null)
  const secondaryStlRef = useRef<ArrayBuffer | null>(null)
  const svgRef = useRef<string | null>(null)
  const pngRef = useRef<string | null>(null)
  const imageDownloadFileNameRef = useRef<string | null>(null)
  const imageDownloadMimeTypeRef = useRef<string | null>(null)
  const generationIdRef = useRef(0)

  const generate = useCallback(async () => {
    if (!model) return
    if (hasCancelableBuilder(deps.geometryBuilder)) deps.geometryBuilder.cancelPending()
    const generationId = generationIdRef.current + 1
    generationIdRef.current = generationId

    setIsLoading(true)
    setError(null)

    try {
      let imageData: ImageData | undefined
      if (imageFile) imageData = await fileToImageData(imageFile)

      const result = await generateModel(model, values, imageData, deps)
      if (generationId !== generationIdRef.current) return

      if (result.status === 'success') {
        setStlBuffer(result.geometry ?? null)
        stlRef.current = result.geometry ?? null
        setSecondaryStlBuffer(result.secondaryGeometry ?? null)
        secondaryStlRef.current = result.secondaryGeometry ?? null
        setSvgString(result.svgString ?? null)
        svgRef.current = result.svgString ?? null
        setPngDataUrl(result.pngDataUrl ?? null)
        pngRef.current = result.pngDataUrl ?? null
        setPixCopiaCola(result.pixCopiaCola ?? null)
        setImageDownloadLabel(result.downloadLabel ?? null)
        imageDownloadFileNameRef.current = result.downloadFileName ?? null
        imageDownloadMimeTypeRef.current = result.downloadMimeType ?? null
      } else {
        setError(result.error ?? 'Erro desconhecido na geração.')
      }
    } catch (err) {
      if (generationId !== generationIdRef.current) return
      setError(err instanceof Error ? err.message : 'Erro inesperado.')
    } finally {
      if (generationId === generationIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [model, values, imageFile, deps])

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

  const downloadImage = useCallback(() => {
    if (!pngRef.current || !model) return
    const a = document.createElement('a')
    a.href = pngRef.current
    a.download = imageDownloadFileNameRef.current ?? `${model.slug}.png`
    a.type = imageDownloadMimeTypeRef.current ?? 'image/png'
    a.click()
  }, [model])

  return { stlBuffer, secondaryStlBuffer, svgString, pngDataUrl, pixCopiaCola, imageDownloadLabel, isLoading, error, generate, download, downloadSecondary, downloadSvg, downloadImage }
}
