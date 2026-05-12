import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router'
import { Home } from './presentation/pages/Home'
import { ModelEditor } from './presentation/pages/ModelEditor'
import { APP_NAME } from './shared/constants'
import type { AppDependencies } from './app/dependencies'

function getRouterBasename(): string | undefined {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '')
  return basename || undefined
}

interface AppProps {
  dependencies: AppDependencies
}

function EditorRoute({ dependencies }: AppProps) {
  const { slug } = useParams()
  const navigate = useNavigate()

  return (
    <ModelEditor
      slug={slug ?? ''}
      onBack={() => navigate('/')}
      modelGeneratorDeps={dependencies.modelGenerator}
    />
  )
}

export default function App({ dependencies }: AppProps) {
  const logoSrc = `${import.meta.env.BASE_URL}logo.svg`

  return (
    <BrowserRouter basename={getRouterBasename()}>
      <div className="flex flex-col min-h-svh bg-zinc-950">
        <nav className="border-b border-zinc-800 px-6 py-3 flex items-center justify-between">
          <Link
            to="/"
            className="hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded"
            aria-label={APP_NAME}
          >
            <img src={logoSrc} alt={APP_NAME} className="h-8 w-auto" />
          </Link>
          <a
            href="https://github.com/almeidaguil/forja3d"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-zinc-100 text-sm transition-colors"
          >
            GitHub
          </a>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/editor/:slug" element={<EditorRoute dependencies={dependencies} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <footer className="border-t border-zinc-800 px-6 py-4 text-center text-xs text-zinc-600">
          {APP_NAME} — gerador de modelos 3D paramétricos
        </footer>
      </div>
    </BrowserRouter>
  )
}
