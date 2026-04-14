# AGENTS.md — Forja3D

Instruções para agentes de IA. **Leia este arquivo primeiro**, depois abra o arquivo do seu papel específico.

---

## Qual é o seu papel?

Identifique a tarefa e adote **apenas** o papel correspondente:

| Tarefa recebida | Papel | Arquivo |
|---|---|---|
| "Decida como implementar X", "Crie a interface para Y", "Avalie a arquitetura" | Arquiteto | [docs/agents/architect.md](docs/agents/architect.md) |
| "Implemente X", "Corrija o bug Y", "Adicione a feature Z" | Desenvolvedor | [docs/agents/developer.md](docs/agents/developer.md) |
| "Revise este código", "Verifique a qualidade", "Há problemas aqui?" | Revisor | [docs/agents/reviewer.md](docs/agents/reviewer.md) |
| "Atualize os docs", "Sincronize o PLANO.md", "Explique o projeto" | Documentador | [docs/agents/documenter.md](docs/agents/documenter.md) |

> **Nunca misture papéis em uma mesma sessão.** Se a tarefa exige dois papéis (ex: implementar e documentar), complete um por vez.

---

## Regras globais — todos os papéis

### Git (inegociável)
- **Nunca** commite diretamente em `main` ou `develop`
- **Nunca** faça `git merge` local em `main` ou `develop` — branches protegidas só aceitam PR
- Sempre crie branch: `feature/`, `fix/`, `docs/`, `chore/`
- Fluxo: `branch` → **PR para `develop`** → **PR para `main`** (tudo via GitHub)
- Abra PRs com `gh pr create` — nunca merge manual local em branches protegidas
- Conta local configurada: `almeidaguil` / `almeida.guilherme37@gmail.com`
  - Nunca use a conta global (é de trabalho — MercadoLibre)
  - Verifique com `git config --local user.email` antes do primeiro commit

### Commits — Conventional Commits (obrigatório via Husky)
```
<tipo>(<escopo>): <assunto em português>
```
Tipos aceitos: `feat` `fix` `docs` `refactor` `test` `chore` `style` `ci`

### Idioma
- Código (variáveis, funções, tipos, interfaces): **inglês**
- Comentários, commits, documentação: **português**

### Limites de camada (arquitetura limpa)
```
domain       → zero dependências externas
application  → só importa de domain
infrastructure → importa de domain e application (implementa ports)
presentation → só importa de application (nunca de infrastructure diretamente)
shared       → pode ser importado por qualquer camada
```

---

## Contexto do projeto

- **Stack:** React 19 + TypeScript + Vite 8 + Tailwind CSS v4
- **Rendering:** OpenSCAD WASM (modelos com texto/geometria) + Three.js ExtrudeGeometry (imagem→3D)
- **Deploy:** GitHub Pages — totalmente estático, sem backend na V1
- **Repositório:** https://github.com/almeidaguil/forja3d
- **Caminho local:** `/Users/guisalmeida/Documents/Pessoal/forja3d`

Para contexto completo leia nesta ordem:
1. `docs/PLANO.md` — estado atual, o que foi feito, próximos passos
2. `docs/ARCHITECTURE.md` — diagrama de camadas, ports, adapters, ADRs
3. `docs/V2_ROADMAP.md` — o que vem depois (não implemente antes da hora)

---

## MCPs disponíveis neste projeto

O arquivo `.mcp.json` na raiz configura os servidores MCP. Após ativar (veja `docs/SETUP.md`):

| MCP | Quando usar |
|---|---|
| `context7` | Buscar docs atualizadas de Three.js, React 19, TypeScript — sem alucinar APIs |
| `github` | Criar issues, consultar PRs, verificar releases do repo |
| `sequential-thinking` | Raciocinar passo a passo sobre decisões complexas antes de agir |
| `fetch` | Buscar documentação externa, specs de formato (STL, 3MF, SVG) |

---

## V2 — consciência obrigatória

A V2 adicionará auth, créditos, Stripe e backend. Ao trabalhar em qualquer feature:
- Verifique se há implicação de V2
- Registre em `docs/V2_ROADMAP.md` se houver
- Deixe `// V2: <nota>` no código quando relevante
- **Nunca** implemente infraestrutura de V2 em código de V1
