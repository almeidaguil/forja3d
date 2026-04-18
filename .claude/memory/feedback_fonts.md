---
name: Reutilizar fontes existentes em public/fonts/
description: Novos modelos que precisam de fontes devem usar as 19 TTF já em public/fonts/
type: feedback
originSessionId: 7c100e83-ac8d-4d06-9628-c081741764ed
---
**Regra:** Qualquer feature que precise de fontes (letreiro, tag, plaquinha, etc.) deve reutilizar as 19 fontes TTF já em `public/fonts/` — sem baixar novas.

**Why:** As fontes já estão no repo, bundladas e funcionando. Reuso evita aumentar o tamanho do projeto desnecessariamente.

**How to apply:**
- Usar `KEYCHAIN_FONTS` de `OpenScadGeometryBuilder.ts` — já exportado
- Usar `getFontData(fontKey)` — já implementado e com cache
- Usar `FontPickerField` em `ParameterForm` — já implementado (ativo para `param.key === 'fontKey'`)
- Para um novo modelo, basta adicionar `fontKey` como parâmetro `select` no JSON do modelo
