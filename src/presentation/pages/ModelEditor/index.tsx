import { getModelBySlug } from '../../../data'
import { Button } from '../../components/ui'

interface ModelEditorProps {
  slug: string
  onBack: () => void
}

export function ModelEditor({ slug, onBack }: ModelEditorProps) {
  const model = getModelBySlug(slug)

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
    <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-12">
      <div className="mb-6">
        <Button onClick={onBack} variant="ghost" className="mb-4">
          ← Voltar
        </Button>
        <h1 className="text-2xl font-bold text-white">{model.title}</h1>
        <p className="text-zinc-400 mt-1">{model.description}</p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 flex items-center justify-center min-h-64">
        <p className="text-zinc-500 text-sm">Editor em desenvolvimento — em breve aqui estará o formulário de parâmetros e o preview 3D.</p>
      </div>
    </main>
  )
}
