# Testes automáticos — VG Dashboard v19

A suite corre sem dados reais, sem Internet e sem acesso aos Netlify Blobs de produção.

## Executar

```bash
npm test
```

## Suites principais

- `actions-management.test.js` — responsáveis, prazos, atrasos, estados e fechos das ações.
- `anomaly-detection.test.js` — mediana/MAD, eficiência, custo × atividade, performance e decisão.
- `anomaly-purchases.test.js` — preços F&B do último mês disponível vs histórico recente e portefólio.
- `anomaly-operations.test.js` — integração dos sinais de anomalia na Central de Operações.
- `benchmarking.test.js` — ponderação regional, pares, STLY, metas/orçamento e percentis.
- `data-center.test.js` — cobertura das fontes, backups e rollback local.
- `forecast-scenarios.test.js` / `forecast-integration-v12.test.js` — forecast financeiro e integração RI.
- `global-search-v19.test.js` — Ctrl/Cmd+K, pesquisa sem acentos, índice multi-módulo, Compras, comentários, metas e permissões de Auditoria.
- `governance.test.js` — trilho server-side, diferenças e proteção de credenciais.
- `performance-v18.test.js` — defer, XLSX lazy, renderização por vista e precache concorrente.
- `pwa-mobile.test.js` — manifest, instalação, navegação mobile e cache segura.
- `import.test.js` — parser real do P&L, anos dinâmicos e indicadores oficiais.
- `kpi-data-quality.test.js` — GOP, ADR, ocupação, custos e validações.
- `operations-center.test.js` — prioridades, risco, oportunidades e ligação às ações.
- `revenue-decision.test.js` / `revenue-targets-v9.test.js` — Revenue Intelligence e metas.
- `runtime.test.js` — `VG.events`, `VG.state`, versão e utilitários.
- `security.test.js` — autenticação, revogação e permissões server-side.
- `structure.test.js` — sintaxe, recursos, módulos atuais e ausência de patches/credenciais antigas.
- `targets-rules.test.js` — persistência e precedência de Metas & Regras.

## Integração automática

`.github/workflows/vg-dashboard-tests.yml` corre os testes em push/pull request para `main`.

`netlify.toml` executa `npm test` antes do deploy. Um teste falhado impede a publicação desse deploy.

- `backup-recovery.test.js`: snapshots v17, exclusões de segurança, cópia pré-reposição, restore e eliminação.
