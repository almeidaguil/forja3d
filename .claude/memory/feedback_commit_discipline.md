---
name: Regra de commit — só com código funcionando
description: Nunca commitar sem rodar build e lint antes; proibido commits WIP ou com erros
type: feedback
originSessionId: 7bb87f33-c75b-4886-98cb-59cbe0253db7
---
**Antes de qualquer commit, obrigatório:**
```bash
npm run build && npm run lint
```

- `build` falhou → não commitar, corrigir primeiro
- `lint` com erros → não commitar
- Commits "WIP", "de progresso" ou com código quebrado são proibidos
- Cada commit deve representar um estado funcional e completo da feature/correção

**Why:** O usuário explicitamente pediu essa regra após commits desnecessários ou com erros serem criados.
**How to apply:** Em toda sessão, rodar `npm run build && npm run lint` antes de qualquer `git commit`, sem exceção.
