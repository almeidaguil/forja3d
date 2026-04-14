# Guia de Configuração — Forja3D

Guia completo para instalar, executar e compilar o Forja3D no macOS, Linux e Windows.

---

## Pré-requisitos

Você precisa das seguintes ferramentas instaladas antes de clonar o projeto:

| Ferramenta | Versão | Finalidade |
|---|---|---|
| **Git** | 2.x+ | Controle de versão |
| **Node.js** | 20.x LTS ou superior | Runtime JavaScript |
| **npm** | 10.x+ (incluso no Node.js) | Gerenciador de pacotes |

---

## 1. Instalar os pré-requisitos

### macOS

**Opção A — Homebrew (recomendado)**

Se você não tiver o Homebrew instalado:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Então instale Git e Node.js:
```bash
brew install git
brew install node
```

**Opção B — Instaladores oficiais**
- Git: baixe em https://git-scm.com/download/mac
- Node.js: baixe o instalador LTS em https://nodejs.org/

Verificar:
```bash
git --version    # git version 2.x.x
node --version   # v20.x.x or higher
npm --version    # 10.x.x or higher
```

---

### Linux (Ubuntu / Debian)

```bash
# Atualizar lista de pacotes
sudo apt update

# Instalar Git
sudo apt install -y git

# Instalar Node.js 20.x via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar
git --version
node --version
npm --version
```

**Outras distribuições (Fedora / RHEL):**
```bash
sudo dnf install -y git
sudo dnf module install -y nodejs:20
```

**Outras distribuições (Arch):**
```bash
sudo pacman -S git nodejs npm
```

---

### Windows

**Opção A — winget (Gerenciador de Pacotes do Windows, Windows 10+)**

Abra o **PowerShell** como Administrador:
```powershell
winget install Git.Git
winget install OpenJS.NodeJS.LTS
```

Após instalar, feche e reabra o terminal.

**Opção B — Instaladores oficiais**
- Git: baixe em https://git-scm.com/download/win — durante a instalação, selecione "Git Bash" e "Git from the command line"
- Node.js: baixe o instalador LTS em https://nodejs.org/ — marque "Add to PATH" durante a instalação

**Opção C — NVM para Windows** (recomendado se você gerencia múltiplas versões do Node)

Baixe e instale em https://github.com/coreybutler/nvm-windows/releases, então:
```powershell
nvm install 20
nvm use 20
```

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

---

## 3. Configurar identidade git (apenas conta pessoal)

Este projeto usa uma identidade git **local** para evitar mistura com contas de trabalho ou globais. Execute estes comandos dentro do diretório do projeto:

```bash
git config --local user.name "Your Name"
git config --local user.email "your@email.com"
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

## 8. Fluxo de branches

Nunca trabalhe diretamente em `main`. Sempre crie uma branch:

```bash
# Começar a partir de develop
git checkout develop
git pull origin develop

# Criar sua branch
git checkout -b feature/my-feature

# Trabalhar, commitar, enviar
git add .
git commit -m "feat(scope): description"
git push origin feature/my-feature

# Abrir um Pull Request para develop no GitHub
```

Veja [AGENTS.md](../AGENTS.md) para convenções de mensagem de commit.

---

## Solução de problemas

### `node: command not found` após instalação (Windows)

Feche e reabra o terminal após instalar o Node.js. Se estiver usando Git Bash, reinicie-o.

### Porta 5173 já em uso

O Vite tentará automaticamente a próxima porta disponível. Verifique a saída do terminal para a URL real.

### Arquivos WASM não carregam no desenvolvimento

Se os assets do OpenSCAD WASM falharem ao carregar, certifique-se de que seu navegador permite WebAssembly. A maioria dos navegadores modernos suporta por padrão.

### npm install falha com erros de permissão (Linux/macOS)

**Não** use `sudo npm install`. Em vez disso, corrija as permissões do npm:
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Problema de terminações de linha no Windows (CRLF vs LF)

O projeto usa terminações de linha LF. No Windows, configure o git antes de clonar:
```bash
git config --global core.autocrlf input
```

---

## 9. Configurar MCPs para Claude Code (opcional, recomendado)

O projeto inclui um arquivo `.mcp.json` na raiz com quatro servidores MCP pré-configurados para uso com Claude Code. Eles melhoram significativamente a qualidade das respostas de IA ao trabalhar neste projeto.

### O que cada MCP faz

| MCP | Benefício |
|---|---|
| **context7** | Busca documentação atualizada de Three.js, React, TypeScript em tempo real — elimina alucinações de API |
| **github** | Acessa issues, PRs e releases do repositório diretamente no chat |
| **sequential-thinking** | Raciocínio estruturado passo a passo para decisões complexas de arquitetura |
| **fetch** | Busca documentação externa, specs de formato (STL, SVG, 3MF) |

### Ativar os MCPs no Claude Code

Os MCPs `context7`, `sequential-thinking` e `fetch` não precisam de credenciais e funcionam imediatamente após ativação.

**1. Ative o projeto no Claude Code:**
```bash
cd /caminho/para/forja3d
claude  # O Claude Code lê .mcp.json automaticamente ao abrir o projeto
```

**2. Configure o MCP do GitHub** (necessita de token):

Gere um Personal Access Token no GitHub:
- Acesse: GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
- Permissões necessárias: `Contents: Read`, `Issues: Read/Write`, `Pull requests: Read/Write`

Substitua o placeholder no `.mcp.json`:
```json
"GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_seu_token_aqui"
```

> **Atenção:** não faça commit com um token real. Adicione ao `.gitignore` se necessário, ou use variável de ambiente do sistema.

**Alternativa segura — variável de ambiente:**

No macOS/Linux, exporte o token no seu shell antes de abrir o Claude Code:
```bash
export GITHUB_TOKEN=ghp_seu_token_aqui
claude
```

E no `.mcp.json`, altere para referenciar a variável (sintaxe aceita pelo Claude Code):
```json
"GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
```

### Verificar se os MCPs estão ativos

No Claude Code, use o comando `/mcp` para listar os servidores conectados.

---

## Configuração do editor (recomendado)

**VS Code** com as seguintes extensões:

| Extensão | Finalidade |
|---|---|
| ESLint | Feedback de lint inline |
| Prettier | Formatação automática |
| Tailwind CSS IntelliSense | Autocompletar nomes de classes |
| TypeScript (built-in) | Verificação de tipos |

Instalar todas de uma vez:
```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
```
