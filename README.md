# Forja3D

**Forja3D** is a browser-based parametric 3D model generator for 3D printing. No installation required, no account needed — everything runs directly in your browser.

## What it does

Forja3D lets you create customized, print-ready 3D models by adjusting parameters or uploading images. Download your model as an `.stl` file and send it straight to your slicer.

### Available model types

| Category | Description |
|---|---|
| **Cookie Cutters** | Upload any image and generate a precise cookie cutter from its silhouette |
| **Stamps** | Convert image outlines into 3D stamps (raised or recessed relief) |
| **Keychains** | Personalized keychains with custom text and shapes |
| **Word Signs** | Layered 3D signs with customizable fonts and dimensions |
| **Big Letters** | Large standalone letters and names for decoration |

### Features

- **Image-to-3D**: Upload a PNG or JPG image and Forja3D traces its outline automatically
- **Live 3D preview**: See your model rendered in real time, with color, before downloading
- **Fully parametric**: Control dimensions, thickness, border offset, font, and more
- **No backend required**: All rendering runs client-side via WebAssembly and Three.js
- **STL export**: Download print-ready `.stl` files compatible with any slicer

## Tech stack

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) — UI layer
- [Vite](https://vitejs.dev/) — build tool and dev server
- [Three.js](https://threejs.org/) — 3D rendering and preview
- [OpenSCAD WASM](https://openscad.org/) — parametric model compilation in the browser
- [Potrace](https://potrace.sourceforge.net/) — bitmap-to-vector tracing for image-based models
- [Tailwind CSS](https://tailwindcss.com/) — styling
- [GitHub Pages](https://pages.github.com/) — hosting

## Architecture

The project follows **Clean Architecture** and **Domain-Driven Design** principles:

```
src/
├── domain/           # Core business logic — entities, value objects, domain services
├── application/      # Use cases — orchestrates domain logic
├── infrastructure/   # External adapters — OpenSCAD WASM, Three.js, image tracer
├── presentation/     # React components, pages, hooks
└── shared/           # Cross-cutting types and utilities
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full architectural documentation.

## Running locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

The project deploys automatically to [GitHub Pages](https://almeidaguil.github.io/forja3d/) on every push to `main` via GitHub Actions.

To deploy manually:

```bash
npm run build && npm run deploy
```

## Branch strategy

| Branch | Purpose |
|---|---|
| `main` | Stable, production-ready. Protected — no direct commits. |
| `develop` | Integration branch. Merge features here before `main`. |
| `feature/<name>` | New features or enhancements |
| `fix/<name>` | Bug fixes |

All commits follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

## License

MIT
