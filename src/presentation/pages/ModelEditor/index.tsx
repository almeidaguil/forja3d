import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, JSX } from 'react'
import { getModelBySlug } from '../../../data'
import { Button } from '../../components/ui'
import { ParameterForm } from '../../components/ParameterForm'
import { useParameterForm } from '../../hooks/useParameterForm'
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from '../../../shared/constants'
import type { Model, ParameterValue } from '../../../shared/types'

interface ModelEditorProps {
  slug: string
  onBack: () => void
}

interface ImageUploadProps {
  imageFile: File | null
  onFileSelect: (file: File | null) => void
}

function useImagePreview(file: File | null): string | null {
  // Cria a URL apenas quando o arquivo muda (não em todo render)
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  // Revoga a URL anterior quando ela muda ou o componente desmonta
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  return url
}

function ImageUpload({ imageFile, onFileSelect }: ImageUploadProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const previewUrl = useImagePreview(imageFile)

  function handleFileChange(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    if (!ACCEPTED_IMAGE_TYPES.some((t) => t === file.type)) {
      setError('Formato não suportado. Use PNG, JPG ou WEBP.')
      return
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError('Imagem muito grande. Máximo: 5 MB.')
      return
    }
    setError(null)
    onFileSelect(file)
  }

  return (
    <div className="space-y-2">
      <span className="text-sm text-zinc-300">Imagem de referência</span>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-xl border-2 border-dashed border-zinc-700 hover:border-orange-500 p-6 flex flex-col items-center gap-2 transition-colors"
      >
        {previewUrl
          ? <img src={previewUrl} alt="preview da imagem selecionada" className="max-h-40 object-contain rounded" />
          : <>
              <span className="text-zinc-400 text-sm">Clique para selecionar uma imagem</span>
              <span className="text-zinc-600 text-xs">PNG, JPG, WEBP — máx. 5 MB</span>
            </>
        }
      </button>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        onChange={handleFileChange}
        className="sr-only"
      />
    </div>
  )
}

interface FormPanelProps {
  model: Model
  values: Record<string, ParameterValue>
  imageFile: File | null
  needsImage: boolean
  onValueChange: (key: string, value: ParameterValue) => void
  onImageChange: (file: File | null) => void
}

function FormPanel({ model, values, imageFile, needsImage, onValueChange, onImageChange }: FormPanelProps): JSX.Element {
  return (
    <div className="space-y-6 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Parâmetros</h2>
      {needsImage && (
        <ImageUpload imageFile={imageFile} onFileSelect={onImageChange} />
      )}
      <ParameterForm parameters={model.parameters} values={values} onChange={onValueChange} />
      <Button className="w-full" disabled>
        Gerar e Baixar STL
      </Button>
    </div>
  )
}

function PreviewPanel(): JSX.Element {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 flex items-center justify-center min-h-96 lg:min-h-full">
      <div className="text-center space-y-3">
        <div className="w-20 h-20 rounded-xl bg-zinc-800 mx-auto flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path d="M16 4L28 11V21L16 28L4 21V11L16 4Z" stroke="#52525b" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M16 4V28M4 11L28 11M4 21L28 21" stroke="#3f3f46" strokeWidth="1" />
          </svg>
        </div>
        <p className="text-zinc-600 text-sm">Preview 3D — próxima etapa</p>
      </div>
    </div>
  )
}

export function ModelEditor({ slug, onBack }: ModelEditorProps): JSX.Element {
  const model = getModelBySlug(slug)
  const { values, imageFile, setValue, setImageFile } = useParameterForm(model?.parameters ?? [])
  const needsImage =
    model?.renderStrategy.type === 'three-extrude' &&
    model.renderStrategy.svgSource === 'image'

  if (!model) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">Modelo não encontrado.</p>
          <Button onClick={onBack} variant="secondary">Voltar</Button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-8">
      <Button onClick={onBack} variant="ghost" className="mb-6">&#8592; Voltar</Button>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{model.title}</h1>
        <p className="text-zinc-400 mt-1 text-sm">{model.description}</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6">
        <FormPanel
          model={model}
          values={values}
          imageFile={imageFile}
          needsImage={needsImage}
          onValueChange={setValue}
          onImageChange={setImageFile}
        />
        <PreviewPanel />
      </div>
    </main>
  )
}
