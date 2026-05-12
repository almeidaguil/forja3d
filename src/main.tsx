import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { createAppDependencies } from './app/dependencies'

const GITHUB_PAGES_REDIRECT_KEY = 'forja3d.redirect'

function restoreGithubPagesRedirect(): void {
  const redirectPath = sessionStorage.getItem(GITHUB_PAGES_REDIRECT_KEY)
  if (!redirectPath) return

  sessionStorage.removeItem(GITHUB_PAGES_REDIRECT_KEY)
  window.history.replaceState(null, '', redirectPath)
}

restoreGithubPagesRedirect()

const dependencies = createAppDependencies()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App dependencies={dependencies} />
  </StrictMode>,
)
