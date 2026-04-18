# Forja3D — GitHub Copilot Instructions

## Projeto
Web app para gerar modelos 3D paramétricos no browser e exportar STL para impressão 3D. Client-side only (GitHub Pages), sem backend na V1.

- **Stack:** React 19 + TypeScript strict + Vite 8 + Tailwind CSS v4
- **3D:** OpenSCAD WASM + Potrace + Three.js
- **Repo:** https://github.com/almeidaguil/forja3d

## Arquitetura (Clean Architecture)
```
src/domain/          ← entidades puras (zero deps externas)
src/application/     ← casos de uso + ports + services
src/infrastructure/  ← adaptadores (OpenSCAD, Three.js, Potrace, QR)
src/presentation/    ← React (páginas, componentes, hooks)
src/shared/          ← tipos globais
public/fonts/        ← 19 TTFs para OpenSCAD WASM
```
**Regra:** outer layers importam inner; inner NUNCA importam outer.

## Modelos em produção
| Slug | Estratégia | Tecnologia |
|---|---|---|
| `cookie-cutter` | `three-extrude` | OpenSCAD WASM — cortador com perfil CookieCad |
| `stamp` | `potrace-stamp` | Potrace multi-path → Three.js ExtrudeGeometry |
| `keychain` | `openscad` template | OpenSCAD WASM + 19 fontes TTF locais |
| `qr-pix` | `three-qr` | EMV BR Code + Three.js BoxGeometry por módulo |

## Convenções
- Código em **inglês**; comentários e commits em **português (pt-BR)**
- TypeScript strict — zero `any`, zero `as` agressivo
- Zero `console.log` em código commitado
- `npm run build && npm run lint` antes de qualquer commit
- Componentes React não importam infrastructure — usam hooks

## Novas features de texto/fonte
Usar as 19 fontes TTF de `public/fonts/` — não baixar novas.
- `KEYCHAIN_FONTS` em `OpenScadGeometryBuilder.ts` — lista exportada
- `getFontData(fontKey)` — fetch + cache por sessão
- `FontPickerField` em `ParameterForm` — ativo para `param.key === 'fontKey'`

## Pipeline principal (cortador)
```
ImageData → fillEnclosedRegions() → CanvasImageTracer → path SVG
→ OpenScadGeometryBuilder (opening morfológico + CCW) → WASM → STL
```

## Pipeline carimbo
```
ImageData → PotraceStampBuilder → Potrace multi-path → Three.js holes → STL
```
