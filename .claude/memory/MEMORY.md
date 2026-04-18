# MEMORY — Forja3D

- [Perfil do projeto](project_overview.md) — stack, repo, deploy, arquitetura em camadas
- [Regras de git e conta](git_rules.md) — conta almeidaguil, branches protegidas, PR obrigatório
- [Estado atual e bloqueante P0](project_state.md) — OpenSCAD ok, tracer Moore-Neighbor 8-conectividade quebra polígonos côncavos
- [Soluções para P0 (tracer)](p0_solutions.md) — 4-conectividade (rápido), Potrace (médio), manifold-3d (robusto)
- [Arquitetura de camadas](architecture_rules.md) — Clean Arch + limites de importação por camada
- [Feedback: idioma e convenções](feedback_conventions.md) — código em inglês, commits/docs em PT, sem console.log
- [Feedback: disciplina de commits](feedback_commit_discipline.md) — build + lint OK antes de qualquer commit; proibido WIP ou código quebrado
- [Feedback: testar antes de commitar](feedback_test_before_commit.md) — testar no browser (clicar "Gerar Preview") antes de qualquer commit/push/PR
- [Feedback: deploy first](feedback_deploy_first.md) — sempre mergear develop→main antes de iniciar próxima branch
- [Feedback: reutilizar fontes](feedback_fonts.md) — usar as 19 TTF de public/fonts/ em qualquer modelo que precise de texto
