---
name: Testar antes de commit/push/merge
description: Regra inegociável — nunca commitar, pushar ou abrir PR sem testar a feature no browser
type: feedback
originSessionId: 7c100e83-ac8d-4d06-9628-c081741764ed
---
**Regra:** Nunca fazer commit, push ou merge antes de testar a feature funcionando no browser.

**Why:** Claude subiu código quebrado (FlatStampBuilder pixelado, erro WASM no cortador) sem testar visualmente. O build e lint passando NÃO é suficiente — é preciso abrir o browser, interagir com a feature e confirmar que funciona de ponta a ponta.

**How to apply:**
- Para qualquer mudança que afete UI, comportamento de geração 3D ou configuração Vite: abrir o browser, navegar até a feature, clicar "Gerar Preview" e confirmar o resultado antes de qualquer commit
- Build + lint são condição necessária mas não suficiente
- Se não for possível testar visualmente (sem server), dizer explicitamente ao usuário ao invés de assumir que funciona
