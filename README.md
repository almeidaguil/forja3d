# Forja3D

**Forja3D** é um gerador de modelos 3D paramétricos que roda diretamente no navegador. Sem instalação, sem cadastro — tudo funciona no cliente.

## O que faz

O Forja3D permite criar modelos 3D personalizados e prontos para impressão, ajustando parâmetros ou enviando imagens. Baixe o arquivo `.stl` e envie direto para o seu fatiador.

### Tipos de modelos disponíveis

| Categoria | Descrição |
|---|---|
| **Cortadores de Biscoito** | Envie qualquer imagem e gere um cortador a partir do contorno |
| **Carimbos** | Converta o contorno de uma imagem em um carimbo 3D com relevo |
| **Chaveiros** | Chaveiros personalizados com texto e formas customizáveis |
| **Letreiros** | Letreiros 3D em camadas com fontes e dimensões configuráveis |
| **Letras Grandes** | Letras e nomes em 3D para decoração |

### Funcionalidades

- **Imagem para 3D**: envie um PNG ou JPG e o Forja3D traça o contorno automaticamente
- **Preview 3D em tempo real**: veja o modelo renderizado com cor antes de baixar
- **Totalmente paramétrico**: controle dimensões, espessura, margem, fonte e mais
- **Sem backend**: toda a renderização roda no cliente via WebAssembly e Three.js
- **Exportação STL**: baixe arquivos `.stl` compatíveis com qualquer fatiador

## Stack técnica

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) — camada de UI
- [Vite](https://vitejs.dev/) — ferramenta de build e servidor de desenvolvimento
- [Three.js](https://threejs.org/) — renderização e preview 3D
- [OpenSCAD WASM](https://openscad.org/) — compilação paramétrica de modelos no navegador
- [Potrace](https://potrace.sourceforge.net/) — vetorização de imagens para modelos baseados em imagem
- [Tailwind CSS](https://tailwindcss.com/) — estilização
- [GitHub Pages](https://pages.github.com/) — hospedagem

## Arquitetura

O projeto segue os princípios de **Arquitetura Limpa** e **Domain-Driven Design**:

```
src/
├── domain/           # Lógica de negócio central — entidades, objetos de valor, serviços de domínio
├── application/      # Casos de uso — orquestra a lógica de domínio
├── infrastructure/   # Adaptadores externos — OpenSCAD WASM, Three.js, traçador de imagem
├── presentation/     # Componentes React, páginas, hooks
└── shared/           # Tipos e utilitários transversais
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

# Visualizar build de produção
npm run preview
```

Veja o [Guia de Instalação](docs/SETUP.md) para instruções detalhadas em macOS, Linux e Windows.

## Deploy

O projeto é publicado automaticamente no [GitHub Pages](https://almeidaguil.github.io/forja3d/) a cada push na `main` via GitHub Actions.

Para publicar manualmente:

```bash
npm run build && npm run deploy
```

## Fluxo de branches

| Branch | Finalidade |
|---|---|
| `main` | Estável, pronto para produção. Protegida — sem commits diretos. |
| `develop` | Integração. Branches de feature são mergeadas aqui. |
| `feature/<nome>` | Novas funcionalidades ou melhorias |
| `fix/<nome>` | Correções de bugs |

Todos os commits seguem a especificação [Conventional Commits](https://www.conventionalcommits.org/).

## Licença

MIT
