# Forja3D — Claude Code Instructions

## Projeto
Web app que gera modelos 3D paramétricos (cortadores, carimbos, chaveiros, QR Code Pix) diretamente no browser e exporta STL para impressão 3D.

- **Stack:** React 19 + TypeScript + Vite 8 + Tailwind CSS v4
- **3D:** OpenSCAD WASM para cortador/chaveiro; Potrace + Three.js para carimbo; Three.js para QR Code
- **Deploy:** GitHub Pages (client-side only, sem backend na V1)
- **Repo:** https://github.com/almeidaguil/forja3d

## Arquitetura (Clean Arch)
```
src/
  domain/          ← entidades puras, zero deps externas
  application/     ← casos de uso + ports (interfaces) + services
  infrastructure/  ← adaptadores: OpenSCAD, Three.js, Potrace, QR, tracer
  presentation/    ← React (páginas, componentes, hooks)
  shared/          ← tipos globais, constantes
  data/            ← JSON de configuração dos modelos
public/fonts/      ← 19 TTFs para OpenSCAD WASM (sem CDN)
```

**Import rule:** camadas externas importam internas; internas NUNCA importam externas.

## Modelos em produção
| Modelo | Slug | Estratégia | Status |
|---|---|---|---|
| Cortador de Biscoito | `cookie-cutter` | `three-extrude` + OpenSCAD WASM | ✅ |
| Carimbo | `stamp` | `potrace-stamp` + Three.js | ✅ |
| Chaveiro com Texto | `keychain` | `openscad` template | ✅ |
| QR Code Pix | `qr-pix` | `three-qr` + Three.js | ✅ |

## Convenções
- Código em inglês; comentários, commits e docs em português (pt-BR)
- Zero `console.log` em código commitado
- `npm run build && npm run lint` antes de qualquer commit
- Fluxo: branch → PR → develop → main (nunca commit direto)
- **Após cada feature:** atualizar PLANO.md + memory no mesmo PR

## Slash commands disponíveis
- `/cad-3d` — expert em OpenSCAD, STL, algoritmos de polígono, MakerWorld

## Documentação viva
- `docs/PLANO.md` — estado atual, histórico, próximos passos
- `docs/ARCHITECTURE.md` — diagrama de camadas, ADRs
- `.claude/memory/` — memórias persistentes para contexto entre sessões
- `docs/agents/` — instruções de papel para cada agente especializado
