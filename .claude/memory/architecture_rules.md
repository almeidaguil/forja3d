---
name: Arquitetura Clean Architecture — limites de camada
description: Regras de importação entre camadas do projeto (domain/application/infrastructure/presentation)
type: feedback
originSessionId: 7bb87f33-c75b-4886-98cb-59cbe0253db7
---
**Limites de importação (inegociável):**
```
domain       → zero dependências externas (TypeScript puro)
application  → só importa de domain (ports/interfaces aqui)
infrastructure → implementa ports de application; pode usar libs externas
presentation → só importa de application (nunca de infrastructure diretamente)
shared       → pode ser importado por qualquer camada
```

**Regras de componentes React:**
- Componentes são "burros" — recebem props, disparam eventos via hooks
- Toda lógica fica nos hooks (`useModelGenerator`, `useParameterForm`, etc.)
- Hooks chamam casos de uso da `application/` — nunca adaptadores diretamente

**Porta do cortador:** `src/application/ports/IGeometryBuilder.ts` — toda implementação (OpenSCAD, Three.js) deve respeitar essa interface.

**Builder ativo para cookie-cutter:** `OpenScadGeometryBuilder` (em `src/infrastructure/openscad/`). O `ThreeGeometryBuilder` ainda existe mas não é mais o builder principal.

**Nota sobre renderStrategy:** `cookie-cutter.json` tem `"type": "three-extrude"` mas o builder injetado em `useModelGenerator` é `OpenScadGeometryBuilder`. O JSON não reflete a implementação atual — isso é débito técnico aceito na V1.

**Why:** Clean Architecture garante que mudar de OpenSCAD para manifold-3d (V2) exige só trocar o adapter, sem tocar em React.
**How to apply:** Ao implementar qualquer feature, verificar a camada correta antes de criar o arquivo.
