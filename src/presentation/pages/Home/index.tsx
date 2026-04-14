import { models } from '../../../data'
import { ModelCard } from '../../components/ModelCard'
import { APP_NAME, CATEGORY_LABELS } from '../../../shared/constants'
import type { ModelCategory } from '../../../shared/types'

interface HomeProps {
  onSelectModel: (slug: string) => void
}

const CATEGORIES: ModelCategory[] = ['cutters', 'stamps', 'keychains', 'signs', 'letters']

export function Home({ onSelectModel }: HomeProps) {
  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-12">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
          {APP_NAME}
        </h1>
        <p className="text-zinc-400 text-lg max-w-xl mx-auto">
          Gere modelos 3D paramétricos direto no navegador. Personalize, visualize e baixe o STL pronto para imprimir.
        </p>
      </header>

      {CATEGORIES.map((category) => {
        const categoryModels = models.filter((m) => m.category === category)
        if (categoryModels.length === 0) return null

        return (
          <section key={category} className="mb-12">
            <h2 className="text-lg font-semibold text-zinc-300 mb-4 uppercase tracking-wider text-sm">
              {CATEGORY_LABELS[category]}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryModels.map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  onClick={onSelectModel}
                />
              ))}
            </div>
          </section>
        )
      })}
    </main>
  )
}
