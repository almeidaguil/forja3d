# Guia de Configuração — Forja3D

Este guia cobre instalação, execução local, validação, fluxo de branches e deploy da V1.

## Pré-Requisitos

| Ferramenta | Versão | Uso |
|---|---|---|
| Git | 2.x+ | Controle de versão |
| Node.js | 22.x | Runtime do projeto |
| npm | 10.x+ | Dependências e scripts |
| GitHub CLI | Atual | Criar PRs e consultar GitHub |

O projeto inclui `.nvmrc` com `22`.

## Primeiro Setup

```bash
git clone https://github.com/almeidaguil/forja3d.git
cd forja3d
nvm use
npm install
```

Configure a identidade local do Git dentro do repositório:

```bash
git config --local user.name "Guilherme Almeida"
git config --local user.email "almeida.guilherme37@gmail.com"
```

Verifique:

```bash
git config --local user.name
git config --local user.email
```

## Windows

Com NVM para Windows:

```powershell
nvm install 22
nvm use 22
node --version
npm --version
```

Com winget:

```powershell
winget install Git.Git
winget install OpenJS.NodeJS.LTS
```

Feche e reabra o terminal após instalar.

## macOS e Linux

Instale nvm:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

Reabra o shell ou carregue seu perfil e instale o Node:

```bash
nvm install 22
nvm use 22
```

## Executar Localmente

```bash
npm run dev
```

URL esperada:

```text
http://localhost:5173/forja3d/
```

Se a porta 5173 estiver ocupada, o Vite informa a próxima porta disponível.

## Build e Preview

```bash
npm run build
npm run preview
```

O build gera `dist/`. O preview normalmente fica em:

```text
http://localhost:4173/forja3d/
```

## Lint

```bash
npm run lint
```

Antes de qualquer commit, rode sempre:

```bash
npm run build
npm run lint
```

## Scripts

| Script | Comando |
|---|---|
| Desenvolvimento | `npm run dev` |
| Build de produção | `npm run build` |
| Lint | `npm run lint` |
| Preview local | `npm run preview` |
| Deploy manual para `gh-pages` | `npm run deploy` |
| Preparar Husky | `npm run prepare` |

O deploy oficial da V1 usa GitHub Actions, não o script manual.

## Fluxo de Branches

Nunca commite diretamente em `main` ou `develop`.

Fluxo:

```text
branch de trabalho → PR para develop → PR de develop para main → deploy automático
```

Prefixos aceitos:

- `feature/`
- `fix/`
- `docs/`
- `chore/`

Exemplo:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/nome-da-feature
```

Commits seguem Conventional Commits em português:

```bash
git commit -m "feat(editor): adicionar roteamento por url"
git commit -m "docs(plano): sincronizar estado do projeto"
```

## Criar PR

Depois de validar build e lint:

```bash
git push origin feature/nome-da-feature
gh pr create --base develop --head feature/nome-da-feature
```

Quando `develop` estiver pronto para produção:

```bash
gh pr create --base main --head develop \
  --title "chore(release): promover develop para main" \
  --body "Deploy das alterações acumuladas em develop para produção."
```

Nunca faça merge local em `main` ou `develop`.

## Deploy

O deploy automático roda em push para `main`:

1. GitHub Actions executa `npm ci`.
2. Executa `npm run build`.
3. Publica `dist/` no GitHub Pages.

Workflow: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)

Site: https://almeidaguil.github.io/forja3d/

## Ambiente de IA e MCPs

O arquivo `.mcp.json` configura:

| MCP | Uso |
|---|---|
| `context7` | Documentação atualizada de bibliotecas |
| `github` | Issues, PRs e releases |
| `sequential-thinking` | Decisões complexas |
| `fetch` | Documentação externa e specs |

Para GitHub MCP, configure `GITHUB_TOKEN` no ambiente local. Nunca commite tokens.

## VS Code

O projeto inclui:

- `.editorconfig`
- `.vscode/settings.json`
- `.vscode/extensions.json`

Ao abrir no VS Code, aceite as extensões recomendadas.

## Solução de Problemas

### `node` ou `npm` não encontrado no Windows

Feche e reabra o terminal. Se usa NVM para Windows:

```powershell
nvm use 22
```

### Dependências quebradas

```bash
npm install
```

Se ainda houver problema, remova `node_modules` e reinstale.

### Assets WASM não carregam

Confirme que está usando um navegador moderno com WebAssembly habilitado e rode pelo Vite, não abrindo `index.html` diretamente.

### Git usa conta errada

Verifique a configuração local:

```bash
git config --local user.email
```

O e-mail esperado é:

```text
almeida.guilherme37@gmail.com
```
