---
name: Deploy first + documentar junto
description: Sempre mergear develop→main após feature E documentar no mesmo PR
type: feedback
originSessionId: 7c100e83-ac8d-4d06-9628-c081741764ed
---
**Regra 1:** Ao finalizar uma branch e mergear em develop, sempre mergear develop→main em seguida — antes de começar qualquer nova branch.

**Regra 2:** Documentação (PLANO.md + .claude/memory/project_state.md + .claude/memory/ sync) vai no MESMO PR da feature — não em branch separada.

**Why:** 
- Site (GitHub Pages) fica sempre atualizado com o código mais recente
- Docs separados criam overhead de PRs extras e ficam atrasados
- Um PR com código + docs é mais rastreável e atômico

**How to apply:**
1. Feature concluída e testada
2. Atualizar PLANO.md (tabela de status + histórico)
3. Atualizar .claude/memory/project_state.md
4. Sincronizar: `cp ~/.claude/projects/.../memory/*.md .claude/memory/`
5. git add docs/ .claude/memory/ — commitar junto com o código
6. PR → develop → main
