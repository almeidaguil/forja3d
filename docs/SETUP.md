# Setup Guide — Forja3D

Complete guide to install, run, and build Forja3D on macOS, Linux, and Windows.

---

## Prerequisites

You need the following tools installed before cloning the project:

| Tool | Version | Purpose |
|---|---|---|
| **Git** | 2.x+ | Version control |
| **Node.js** | 20.x LTS or higher | JavaScript runtime |
| **npm** | 10.x+ (comes with Node.js) | Package manager |

---

## 1. Install prerequisites

### macOS

**Option A — Homebrew (recommended)**

If you don't have Homebrew installed:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Then install Git and Node.js:
```bash
brew install git
brew install node
```

**Option B — Official installers**
- Git: download from https://git-scm.com/download/mac
- Node.js: download the LTS installer from https://nodejs.org/

Verify:
```bash
git --version    # git version 2.x.x
node --version   # v20.x.x or higher
npm --version    # 10.x.x or higher
```

---

### Linux (Ubuntu / Debian)

```bash
# Update package list
sudo apt update

# Install Git
sudo apt install -y git

# Install Node.js 20.x via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
git --version
node --version
npm --version
```

**Other distros (Fedora / RHEL):**
```bash
sudo dnf install -y git
sudo dnf module install -y nodejs:20
```

**Other distros (Arch):**
```bash
sudo pacman -S git nodejs npm
```

---

### Windows

**Option A — winget (Windows Package Manager, Windows 10+)**

Open **PowerShell** as Administrator:
```powershell
winget install Git.Git
winget install OpenJS.NodeJS.LTS
```

After installing, close and reopen your terminal.

**Option B — Official installers**
- Git: download from https://git-scm.com/download/win — during install, select "Git Bash" and "Git from the command line"
- Node.js: download the LTS installer from https://nodejs.org/ — check "Add to PATH" during install

**Option C — NVM for Windows** (recommended if you manage multiple Node versions)

Download and install from https://github.com/coreybutler/nvm-windows/releases, then:
```powershell
nvm install 20
nvm use 20
```

Verify (in Git Bash or PowerShell):
```bash
git --version
node --version
npm --version
```

---

## 2. Clone the repository

```bash
git clone https://github.com/almeidaguil/forja3d.git
cd forja3d
```

---

## 3. Configure git identity (personal account only)

This project uses a **local** git identity to avoid mixing with work or global accounts. Run these commands inside the project directory:

```bash
git config --local user.name "Your Name"
git config --local user.email "your@email.com"
```

Verify it was applied:
```bash
git config --local user.name
git config --local user.email
```

> These settings only affect this repository and do not change your global git config.

---

## 4. Install dependencies

```bash
npm install
```

This installs all packages listed in `package.json`, including Three.js, OpenSCAD WASM, Tailwind CSS, and dev tooling.

---

## 5. Run the development server

```bash
npm run dev
```

The app will be available at: **http://localhost:5173/forja3d/**

The dev server supports **Hot Module Replacement (HMR)** — changes to source files reflect in the browser instantly without a full reload.

---

## 6. Build for production

```bash
npm run build
```

The output is placed in the `dist/` directory. This is what gets deployed to GitHub Pages.

To preview the production build locally before deploying:
```bash
npm run preview
```

The preview will be at: **http://localhost:4173/forja3d/**

---

## 7. Deploy to GitHub Pages

Deployment happens automatically via GitHub Actions on every push to `main`. See [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

To deploy manually:
```bash
npm run build
npm run deploy
```

> You must have push access to the `almeidaguil/forja3d` repository.

---

## 8. Branch workflow

Never work directly on `main`. Always create a branch:

```bash
# Start from develop
git checkout develop
git pull origin develop

# Create your branch
git checkout -b feature/my-feature

# Work, commit, push
git add .
git commit -m "feat(scope): description"
git push origin feature/my-feature

# Open a Pull Request to develop on GitHub
```

See [AGENTS.md](../AGENTS.md) for commit message conventions.

---

## Troubleshooting

### `node: command not found` after install (Windows)

Close and reopen the terminal after installing Node.js. If using Git Bash, restart it.

### Port 5173 already in use

Vite will automatically try the next available port. Check the terminal output for the actual URL.

### WASM files not loading in dev

If OpenSCAD WASM assets fail to load, ensure your browser allows WebAssembly. Most modern browsers support it by default.

### npm install fails with permission errors (Linux/macOS)

Do **not** use `sudo npm install`. Instead, fix npm's permissions:
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Windows line endings issue (CRLF vs LF)

The project uses LF line endings. On Windows, configure git before cloning:
```bash
git config --global core.autocrlf input
```

---

## Editor setup (recommended)

**VS Code** with the following extensions:

| Extension | Purpose |
|---|---|
| ESLint | Inline lint feedback |
| Prettier | Auto-formatting |
| Tailwind CSS IntelliSense | Class name autocomplete |
| TypeScript (built-in) | Type checking |

Install all at once:
```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
```
