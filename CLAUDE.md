# Forja3D — Claude Code Instructions

## Project
Web app that generates parametric 3D models (cookie cutters, stamps, keychains) in the browser and exports STL for 3D printing.

- **Stack:** React 19 + TypeScript + Vite + Tailwind CSS v4
- **3D engine:** OpenSCAD WASM (`openscad-wasm-prebuilt`) for STL generation; Three.js for preview
- **Deploy:** GitHub Pages (client-side only, no backend)
- **Repo:** https://github.com/almeidaguil/forja3d

## Architecture (Clean Arch)
```
src/
  domain/          ← pure entities, no external deps
  application/     ← use cases + ports (interfaces)
  infrastructure/  ← adapters: OpenSCAD, Three.js, Canvas tracer
  presentation/    ← React (pages, components, hooks)
  shared/          ← global types, constants
  data/            ← JSON model configs (cookie-cutter, stamp, keychain)
```

**Import rule:** outer layers may import inner; inner layers must never import outer.

## Code conventions
- Language: TypeScript strict mode
- Comments and commit messages: Portuguese (pt-BR)
- Code identifiers: English
- No `console.log` in committed code
- Run `npm run build && npm run lint` before committing

## CAD/3D expert slash command
For deep CAD/3D tasks, invoke `/cad-3d` to load the full expert context covering:
- OpenSCAD scripting, CSG, `offset()`, `linear_extrude`, parametric patterns
- Polygon algorithms: winding order, self-intersection, Douglas-Peucker simplification
- Moore-Neighbor tracing issues and fixes (4-connectivity, Potrace)
- STL binary format, Three.js geometry patterns
- Forja3D data flow: image → polygon → SCAD → STL

## Known issues
- **P0:** `CanvasImageTracer` uses 8-connectivity Moore-Neighbor → self-intersecting polygons → OpenSCAD "mesh not closed" error on concave shapes
- Fix options: 4-connectivity tracer, or replace with Potrace library

## Key files
- `src/infrastructure/openscad/OpenScadGeometryBuilder.ts` — main SCAD code generator
- `src/infrastructure/tracer/CanvasImageTracer.ts` — image-to-polygon (broken for concave)
- `src/infrastructure/three/HeightmapStampBuilder.ts` — stamp preview
- `src/application/useCases/generateModel/index.ts` — main use case
- `src/presentation/hooks/useModelGenerator.ts` — React hook
