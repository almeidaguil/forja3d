---
name: Regras de git e conta GitHub
description: Conta almeidaguil (pessoal), branches protegidas, PR obrigatório para main e develop
type: feedback
originSessionId: 7bb87f33-c75b-4886-98cb-59cbe0253db7
---
**Sempre usar a conta local `almeidaguil`** — nunca a global (MercadoLibre).
- Verificar antes do primeiro commit: `git config --local user.email`
- Email: `almeida.guilherme37@gmail.com`

**Branches protegidas:** `main` e `develop` — NUNCA commitar ou fazer merge local nelas.
- Fluxo: `feature/xxx` → PR para `develop` → PR para `main`
- Usar: `gh pr create --base develop ...`

**Conventional Commits obrigatório** (enforced por Husky+commitlint):
```
<tipo>(<escopo>): <assunto em português>
```
Tipos: `feat|fix|docs|refactor|test|chore|style|ci`

**Why:** Branches `main` e `develop` têm proteção no GitHub; merge local é rejeitado. Conta global é do MercadoLibre — commits pessoais não devem misturar contas.
**How to apply:** Em qualquer sessão, verificar a conta local antes de commitar. Nunca usar `git merge` local em branches protegidas.
