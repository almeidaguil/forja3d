# Forja3D

**Forja3D** é um gerador de modelos 3D paramétricos que roda diretamente no navegador. Sem instalação, sem cadastro — tudo funciona no cliente.

## O que faz

O Forja3D permite criar modelos 3D personalizados e prontos para impressão, ajustando parâmetros ou enviando imagens. Baixe o arquivo `.stl` e envie direto para o seu fatiador.

### Modelos disponíveis

| Modelo | Descrição |
|---|---|
| **Cortador de Biscoito** | Envie qualquer imagem e gere um cortador a partir do contorno. Suporta modo Cortador ou Cortador + Carimbo (dois STLs). |
| **Carimbo** | Converta uma imagem em carimbo 3D com relevo real — olhos, nariz e detalhes internos preservados via Potrace. |
| **Chaveiro com Texto** | Chaveiro personalizado com 1 ou 2 linhas de texto, 19 fontes, borda decorativa, 3 formatos e slot NFC opcional. |
| **QR Code Pix** | Gere um QR Code Pix 3D para placa ou mesa. O cliente escaneia e paga direto pelo app do banco. Download em STL, SVG e PNG. |

### Funcionalidades

- **Imagem para 3D:** envie um PNG ou JPG — contorno extraído automaticamente para cortadores e carimbos
- **Carimbo detalhado:** Potrace vetoriza a imagem, preservando olhos, nariz e detalhes como relevo 3D real
- **19 fontes incluídas:** sans-serif, display e cursivas — picker visual mostra cada nome na própria fonte
- **QR Code Pix:** payload EMV BR Code gerado 100% no cliente, sem API de banco. Mostra o "copia-e-cola" para validar antes de imprimir
- **Preview 3D em tempo real:** veja o modelo renderizado antes de baixar
- **Download múltiplo:** STL (impressão 3D), SVG (laser/vetor) e PNG (papel) — dependendo do modelo
- **Sem backend:** toda a renderização roda no cliente via WebAssembly e Three.js
- **Exportação STL:** arquivos `.stl` compatíveis com Cura, PrusaSlicer e qualquer fatiador

## Stack técnica

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) — camada de UI
- [Vite](https://vitejs.dev/) — build e servidor de desenvolvimento
- [Three.js](https://threejs.org/) — preview 3D e builders de geometria
- [OpenSCAD WASM](https://openscad.org/) — renderização paramétrica no navegador (cortador, chaveiro, QR Code)
- [Potrace](https://potrace.sourceforge.net/) — vetorização de imagens para carimbos com relevo real
- [Tailwind CSS v4](https://tailwindcss.com/) — estilização
- [GitHub Pages](https://pages.github.com/) — hospedagem estática

## Arquitetura

O projeto segue **Arquitetura Limpa** + **Domain-Driven Design**:

```
src/
├── domain/           # Entidades e lógica de negócio pura
├── application/      # Casos de uso e ports (interfaces)
├── infrastructure/   # Adaptadores: OpenSCAD WASM, Three.js, Potrace, QR
├── presentation/     # Componentes React, páginas, hooks
└── shared/           # Tipos e constantes globais
```

Veja [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para a documentação arquitetural completa.

## Rodando localmente

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Build para produção
npm run build
```

Veja o [Guia de Instalação](docs/SETUP.md) para instruções detalhadas.

## Deploy

Publicado automaticamente no [GitHub Pages](https://almeidaguil.github.io/forja3d/) a cada push na `main` via GitHub Actions.

## Fluxo de branches

| Branch | Finalidade |
|---|---|
| `main` | Estável, pronto para produção. Protegida. |
| `develop` | Integração — branches de feature são mergeadas aqui antes de ir para main. |
| `feature/<nome>` | Novas funcionalidades |
| `fix/<nome>` | Correções de bugs |

Todos os commits seguem [Conventional Commits](https://www.conventionalcommits.org/).

## Licença

MIT
