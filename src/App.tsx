import { useState } from 'react'
import { Home } from './presentation/pages/Home'
import { ModelEditor } from './presentation/pages/ModelEditor'
import { APP_NAME } from './shared/constants'

type Route =
  | { page: 'home' }
  | { page: 'editor'; slug: string }

export default function App() {
  const [route, setRoute] = useState<Route>({ page: 'home' })

  return (
    <div className="flex flex-col min-h-svh bg-zinc-950">
      <nav className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => setRoute({ page: 'home' })}
          className="text-xl font-bold text-white tracking-tight hover:text-orange-400 transition-colors"
        >
          {APP_NAME}
        </button>
        <a
          href="https://github.com/almeidaguil/forja3d"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-400 hover:text-zinc-100 text-sm transition-colors"
        >
          GitHub
        </a>
      </nav>

      {route.page === 'home' && (
        <Home onSelectModel={(slug) => setRoute({ page: 'editor', slug })} />
      )}

      {route.page === 'editor' && (
        <ModelEditor
          slug={route.slug}
          onBack={() => setRoute({ page: 'home' })}
        />
      )}

      <footer className="border-t border-zinc-800 px-6 py-4 text-center text-xs text-zinc-600">
        {APP_NAME} — gerador de modelos 3D paramétricos
      </footer>
    </div>
  )
}
