---
name: Mergear para main antes da próxima feature
description: Sempre mergear develop→main antes de iniciar nova branch/feature/fix
type: feedback
originSessionId: 7c100e83-ac8d-4d06-9628-c081741764ed
---
**Regra:** Ao finalizar uma branch e mergear em develop, sempre mergear develop→main em seguida — antes de começar qualquer nova branch ou feature.

**Why:** Garante que o site (GitHub Pages) está sempre funcionando com o código mais recente. Código em develop mas não em main = produto desatualizado ao vivo.

**How to apply:** Fluxo obrigatório: branch → PR → develop → main → próxima branch.
