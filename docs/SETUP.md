# Guia de Configuração — Forja3D

Guia completo para instalar, executar e compilar o Forja3D no macOS, Linux e Windows.

---

## Checklist de primeiro setup

Se você está configurando o ambiente pela primeira vez, siga esta ordem:

- [ ] Instalar nvm + Node 22 (seção 1)
- [ ] Clonar o repositório (seção 2)
- [ ] `nvm use` dentro do diretório (usa `.nvmrc` automaticamente)
- [ ] `git config --local` para identidade pessoal (seção 3)
- [ ] `npm install` (seção 4)
- [ ] Adicionar `GITHUB_TOKEN` ao `~/.zshrc` (seção 9)
- [ ] Abrir no VS Code → aceitar extensões recomendadas (seção 10)
- [ ] `npm run dev` e verificar http://localhost:5173/forja3d/

---

## Pré-requisitos

Você precisa das seguintes ferramentas instaladas antes de clonar o projeto:

| Ferramenta | Versão | Finalidade |
|---|---|---|
| **Git** | 2.x+ | Controle de versão |
| **nvm** | qualquer | Gerenciador de versões do Node.js |
| **Node.js** | 22.x (via nvm) | Runtime JavaScript |
| **npm** | 10.x+ (incluso no Node.js) | Gerenciador de pacotes |

> O projeto inclui `.nvmrc` com `22`. Após instalar o nvm, um simples `nvm use` dentro do diretório usa a versão correta automaticamente — sem precisar lembrar qual versão usar.

---

## 1. Instalar os pré-requisitos

### macOS

**Opção A — nvm (recomendado)**

nvm gerencia múltiplas versões do Node sem poluir o sistema:

```bash
# Instalar nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Recarregar o shell
source ~/.zshrc

# Instalar e usar Node 22
nvm install 22
nvm use 22
```

Para ativar o nvm automaticamente ao entrar em diretórios com `.nvmrc`, adicione ao final do `~/.zshrc`:

```bash
# Auto-switch Node version via .nvmrc
autoload -U add-zsh-hook
load-nvmrc() {
  local node_version="$(nvm version)"
  local nvmrc_path="$(nvm_find_nvmrc)"
  if [ -n "$nvmrc_path" ]; then
    local nvmrc_node_version=$(nvm version "$(cat "${nvmrc_path}")")
    if [ "$nvmrc_node_version" = "N/A" ]; then
      nvm install
    elif [ "$nvmrc_node_version" != "$node_version" ]; then
      nvm use
    fi
  fi
}
add-zsh-hook chpwd load-nvmrc
load-nvmrc
```

Depois `source ~/.zshrc` — a partir daí, `cd forja3d` já troca para Node 22 automaticamente.

**Opção B — Homebrew**

Se você não tiver o Homebrew instalado:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Então instale Git e Node.js:
```bash
brew install git
brew install node@22
```

**Opção C — Instaladores oficiais**
- Git: https://git-scm.com/download/mac
- Node.js LTS: https://nodejs.org/

Verificar:
```bash
git --version    # git version 2.x.x
node --version   # v22.x.x
npm --version    # 10.x.x or higher
```

---

### Linux (Ubuntu / Debian)

```bash
# Instalar nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc

# Instalar Node 22
nvm install 22
nvm use 22

# Instalar Git
sudo apt update && sudo apt install -y git

# Verificar
git --version
node --version
npm --version
```

**Outras distribuições (Fedora / RHEL):**
```bash
sudo dnf install -y git
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

**Outras distribuições (Arch):**
```bash
sudo pacman -S git nvm
```

---

### Windows

**Opção A — winget (Windows 10+)**

Abra o **PowerShell** como Administrador:
```powershell
winget install Git.Git
winget install OpenJS.NodeJS.LTS
```

Após instalar, feche e reabra o terminal.

**Opção B — NVM para Windows** (recomendado)

Baixe e instale em https://github.com/coreybutler/nvm-windows/releases, então:
```powershell
nvm install 22
nvm use 22
```

**Opção C — Instaladores oficiais**
- Git: https://git-scm.com/download/win — selecione "Git Bash" e "Git from the command line"
- Node.js: https://nodejs.org/ — marque "Add to PATH"

Verificar (no Git Bash ou PowerShell):
```bash
git --version
node --version
npm --version
```

---

## 2. Clonar o repositório

```bash
git clone https://github.com/almeidaguil/forja3d.git
cd forja3d
```

Se você usa nvm com auto-switch, a versão Node correta é aplicada automaticamente ao entrar no diretório.

---

## 3. Configurar identidade git (apenas conta pessoal)

Este projeto usa uma identidade git **local** para evitar mistura com contas de trabalho ou globais. Execute estes comandos dentro do diretório do projeto:

```bash
git config --local user.name "Guilherme Almeida"
git config --local user.email "almeida.guilherme37@gmail.com"
```

Verifique se foi aplicado:
```bash
git config --local user.name
git config --local user.email
```

> Essas configurações afetam apenas este repositório e não alteram seu git config global.

---

## 4. Instalar dependências

```bash
# Garantir a versão correta do Node (necessário se não usa auto-switch)
nvm use

# Instalar dependências
npm install
```

Isso instala todos os pacotes listados em `package.json`, incluindo Three.js, OpenSCAD WASM, Tailwind CSS e ferramentas de desenvolvimento.

---

## 5. Executar o servidor de desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em: **http://localhost:5173/forja3d/**

O servidor de desenvolvimento suporta **Hot Module Replacement (HMR)** — alterações nos arquivos fonte refletem no navegador instantaneamente, sem recarregamento completo.

---

## 6. Compilar para produção

```bash
npm run build
```

O resultado é colocado no diretório `dist/`. É isso que é implantado no GitHub Pages.

Para visualizar a build de produção localmente antes de implantar:
```bash
npm run preview
```

O preview estará em: **http://localhost:4173/forja3d/**

---

## 7. Implantar no GitHub Pages

A implantação acontece automaticamente via GitHub Actions a cada push para `main`. Veja [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

Para implantar manualmente:
```bash
npm run build
npm run deploy
```

> Você precisa ter acesso de push ao repositório `almeidaguil/forja3d`.

---

## 8. Fluxo de branches (com Pull Requests)

Nunca trabalhe diretamente em `main` ou `develop`. As duas branches são protegidas — só aceitam merge via Pull Request.

### Fluxo completo

```bash
# 1. Partir sempre de develop atualizado
git checkout develop
git pull origin develop

# 2. Criar branch com prefixo correto
git checkout -b feature/my-feature
# prefixos aceitos: feature/ fix/ docs/ chore/ refactor/ style/ test/ ci/

# 3. Implementar, commitar seguindo Conventional Commits
git add src/path/to/changed/file.ts
git commit -m "feat(editor): adicionar formulário de parâmetros"

# 4. Enviar a branch para o GitHub
git push origin feature/my-feature

# 5. Abrir PR para develop via gh CLI
gh pr create --base develop \
  --title "feat(editor): adicionar formulário de parâmetros" \
  --body "$(cat <<'EOF'
## O que mudou
- Componente ParameterForm dinâmico baseado em Model.parameters[]
- Suporte a tipos: text, number, boolean, select, color, image

## Como testar
- [ ] Abrir http://localhost:5173/forja3d/
- [ ] Clicar em um modelo → verificar formulário renderizado
EOF
)"
```

### Promover develop → main

Após acumular features em `develop`, abrir PR para `main`:

```bash
gh pr create --base main --head develop \
  --title "chore(release): promover develop para main" \
  --body "Deploy das features acumuladas em develop para produção."
```

> **Regra absoluta:** nunca use `git merge` local em `main` ou `develop`. Sempre PR.

Veja [AGENTS.md](../AGENTS.md) para convenções de mensagem de commit.

---

## 9. Configurar ambiente de IA (Claude Code + MCPs)

O projeto inclui `.mcp.json` na raiz com quatro servidores MCP pré-configurados para Claude Code.
**Claude Code lê este arquivo automaticamente** ao abrir o projeto — sem instalação manual dos pacotes.

### Como funciona

```
Claude Code abre o diretório do projeto
  → lê .mcp.json automaticamente
  → inicia cada servidor com npx -y (baixa o pacote na primeira execução)
  → MCPs ficam disponíveis durante toda a sessão
```

### MCPs configurados

| MCP | Ativação | Benefício |
|---|---|---|
| **context7** | Automática | Docs atualizadas de Three.js, React 19, TypeScript — previne alucinações de API |
| **sequential-thinking** | Automática | Raciocínio estruturado passo a passo para decisões arquiteturais |
| **fetch** | Automática | Busca specs externas (STL, SVG, 3MF) e documentação de APIs |
| **github** | Requer token | Acessa issues, PRs e releases do repositório diretamente no chat |

Os três primeiros funcionam imediatamente — nenhuma configuração adicional.

### Setup do token do GitHub (uma vez só)

**Passo 1 — Gerar o Personal Access Token:**

- Acesse: GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens**
- Repository access: `almeidaguil/forja3d`
- Permissões mínimas:
  - `Contents`: Read
  - `Issues`: Read and Write
  - `Pull requests`: Read and Write

**Passo 2 — Adicionar ao shell de forma permanente:**

```bash
# Abrir o arquivo de perfil do shell
nano ~/.zshrc
```

Adicione ao final do arquivo:
```bash
export GITHUB_TOKEN="ghp_seu_token_aqui"
```

Recarregar:
```bash
source ~/.zshrc
```

**Passo 3 — Verificar:**
```bash
echo $GITHUB_TOKEN   # deve exibir o token
```

O `.mcp.json` já está configurado para ler `${GITHUB_TOKEN}` — nenhuma outra configuração necessária.

> **Segurança:** o token fica apenas no seu shell local (`~/.zshrc`). O repositório referencia via `${GITHUB_TOKEN}` e nunca expõe o valor real. Nunca faça commit de um token em texto plano.

### Abrir o projeto com Claude Code

```bash
cd /Users/guisalmeida/Documents/Pessoal/forja3d
claude
```

### Verificar MCPs ativos

Dentro do Claude Code, execute:
```
/mcp
```

Você deve ver `context7`, `sequential-thinking`, `fetch` e `github` listados como conectados.

### Troubleshooting de MCPs

**GitHub MCP mostra erro de autenticação:**
```bash
echo $GITHUB_TOKEN   # se vazio, o token não foi carregado
source ~/.zshrc      # recarregar o perfil
```

**MCP não aparece na lista `/mcp`:**
```bash
# Certifique-se de abrir o Claude Code a partir do diretório do projeto
cd /Users/guisalmeida/Documents/Pessoal/forja3d
claude

# Verificar se .mcp.json existe na raiz
ls .mcp.json
```

**npx lento na primeira execução:** é normal — o pacote do MCP está sendo baixado. As execuções subsequentes são instantâneas (cache local do npx).

---

## 10. Configuração do editor (VS Code)

### Extensões recomendadas

O arquivo `.vscode/extensions.json` já lista as extensões recomendadas. Ao abrir o projeto no VS Code, uma notificação aparece automaticamente perguntando se deseja instalá-las.

Para instalar manualmente:
```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension EditorConfig.EditorConfig
```

| Extensão | Finalidade |
|---|---|
| ESLint | Feedback de lint inline + fix automático ao salvar |
| Prettier | Formatação automática |
| Tailwind CSS IntelliSense | Autocompletar nomes de classes |
| TypeScript Nightly | Verificação de tipos mais recente |
| EditorConfig | Aplica `.editorconfig` (indentação, encoding, newline) |

### Configurações automáticas

O arquivo `.vscode/settings.json` já configura:
- **ESLint fix ao salvar** (`source.fixAll.eslint`) — corrige lint automaticamente
- **TypeScript** — usa o compilador do projeto (`node_modules/typescript/lib`)
- **Tailwind** — autocompletar em `clsx()` e `cn()` além de classes inline
- **Exclusão do `dist/`** da árvore de arquivos e busca

---

## Solução de problemas

### `node: command not found` após instalação (Windows)

Feche e reabra o terminal após instalar o Node.js. Se estiver usando Git Bash, reinicie-o.

### Porta 5173 já em uso

O Vite tentará automaticamente a próxima porta disponível. Verifique a saída do terminal para a URL real.

### Arquivos WASM não carregam no desenvolvimento

Se os assets do OpenSCAD WASM falharem ao carregar, certifique-se de que seu navegador permite WebAssembly. A maioria dos navegadores modernos suporta por padrão.

### `npm install` falha com erros de permissão (Linux/macOS)

**Não** use `sudo npm install`. Use nvm — ele instala Node no diretório home do usuário, eliminando problemas de permissão.

### Problema de terminações de linha no Windows (CRLF vs LF)

O projeto usa terminações de linha LF (definido no `.editorconfig`). No Windows, configure o git antes de clonar:
```bash
git config --global core.autocrlf input
```
