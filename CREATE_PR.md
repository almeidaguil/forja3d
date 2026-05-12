# Criar Pull Request

Este arquivo é um lembrete operacional genérico. Ele não representa uma PR específica.

## Fluxo

```bash
npm run build
npm run lint
git status --short
git push origin <branch>
gh pr create --base develop --head <branch>
```

Depois do merge em `develop`, a promoção para produção acontece por PR separado:

```bash
gh pr create --base main --head develop \
  --title "chore(release): promover develop para main" \
  --body "Deploy das alterações acumuladas em develop para produção."
```

## Checklist

- [ ] Branch não é `main` nem `develop`.
- [ ] `npm run build` passa.
- [ ] `npm run lint` passa.
- [ ] Commits usam Conventional Commits em português.
- [ ] PR aponta para `develop`.
- [ ] Deploy final acontece apenas após PR de `develop` para `main`.
