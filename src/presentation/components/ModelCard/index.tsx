import type { Model } from '../../../shared/types'
import { Badge } from '../ui'
import { CATEGORY_LABELS } from '../../../shared/constants'

interface ModelCardProps {
  model: Model
  onClick: (slug: string) => void
}

const CATEGORY_COLORS: Record<string, string> = {
  cutters: 'bg-orange-500/10 text-orange-400',
  stamps: 'bg-blue-500/10 text-blue-400',
  keychains: 'bg-yellow-500/10 text-yellow-400',
  signs: 'bg-purple-500/10 text-purple-400',
  letters: 'bg-green-500/10 text-green-400',
}

export function ModelCard({ model, onClick }: ModelCardProps) {
  return (
    <button
      onClick={() => onClick(model.slug)}
      className="group flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-left transition-all hover:border-zinc-600 hover:bg-zinc-800/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
    >
      <div
        className="h-36 w-full rounded-lg flex items-center justify-center text-4xl"
        style={{ backgroundColor: `${model.parameters.find(p => p.key === 'color')?.default}22` }}
      >
        <ModelIcon category={model.category} />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-zinc-100 group-hover:text-white leading-tight">
            {model.title}
          </h3>
          <Badge className={CATEGORY_COLORS[model.category]}>
            {CATEGORY_LABELS[model.category] ?? model.category}
          </Badge>
        </div>
        <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2">
          {model.description}
        </p>
      </div>
    </button>
  )
}

function ModelIcon({ category }: { category: string }) {
  const icons: Record<string, string> = {
    cutters: '🍪',
    stamps: '🔖',
    keychains: '🔑',
    signs: '🪧',
    letters: '🔤',
  }
  return <span>{icons[category] ?? '📦'}</span>
}
