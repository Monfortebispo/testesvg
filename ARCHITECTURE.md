# Arquitetura — V35.6 · Navegação e experiência Governanta

A Pesquisa Global é a única dona do atalho `Ctrl/Cmd + K`. A command palette histórica permanece apenas como código de compatibilidade, sem atalho concorrente.

O Hotel 360º mantém 8 tabs válidos e `efficiency` é uma rota de primeira classe para `VG.unitEconomics.hotel360Html()`.

No perfil `governanta`, `operations-domains-v33.js` monta diretamente o módulo nativo sem o hero analítico. Dentro do Shadow DOM, `#app.hidden` vence explicitamente a regra normal de `#app`, deixando apenas `#govMode`. O host recebe `hk35-governanta`, ocupa o viewport e o scroll externo é reposto no topo. O scroll vertical necessário passa a existir somente dentro de `.gov-body`.

A folha `responsive-desktop-v35_6.css` é carregada pelo HTML e também incluída no shell estático do Service Worker.

---

# Arquitetura — V35.4 · RBAC e âmbito multi-hotel

A V35.4 introduz um modelo RBAC simples e explícito na sessão central. Cada utilizador tem `role`, `hotels[]` e `modules[]`. A Direção de Operações recebe os curingas `hotels:["*"]` e `modules:["*"]`; os restantes perfis recebem listas concretas.

## Fronteiras de autorização

1. `auth-client.js` controla navegação, filtros e âmbito visual.
2. `dashboard-sessao.js` normaliza perfis, migra contas antigas, persiste hotéis/módulos e rejeita recursos operacionais quando o módulo não está autorizado.
3. Endpoints sensíveis como `hk-store.js` e `custos-ab-store.js` voltam a validar sessão, módulo e âmbito de hotel no servidor.
4. Housekeeping converte o perfil central `governanta` para a sessão operacional `Governanta` e abre o modo mobile.
5. Módulos que antes usavam apenas `user.hotel` foram atualizados para trabalhar com `hotels[]`, mantendo `hotel` como primeiro hotel apenas para retrocompatibilidade.

A ocultação de um botão não é considerada controlo de segurança; a autorização relevante deve existir também no endpoint que persiste ou devolve dados.

---

## Histórico da arquitetura V35.3

## Princípio

A V35.3 mantém a arquitetura da V35 e reforça as fronteiras entre UI e servidor. A interface deixa de ser a única camada de autorização para Housekeeping e Custos & Compras A&B.

## Hotéis

A chave canónica da ficha (`profileKey`) é a identidade estável. O nome apresentado pode ser editado sem mudar essa identidade. A gravação envia `expectedUpdatedAt`; o backend compara com a versão atual e devolve conflito 409 em caso de edição concorrente. A região é selecionada a partir das regiões canónicas existentes.

## Housekeeping

`netlify/functions/hk-store.js` filtra e funde dados server-side:

- Direção/Admin: leitura e escrita global;
- Compras: leitura global, sem escrita de inventário;
- perfis de hotel: apenas o hotel da sessão;
- campos de aprovação e reabertura não podem ser forjados por perfis restritos.

A sincronização histórica com `inventariovg.netlify.app` valida explicitamente 3 campanhas / 2 fechadas / 1 aberta antes de marcar a migração como concluída e cria backup pré-merge.

## Custos & Compras A&B

`netlify/functions/custos-ab-store.js` aplica autorização server-side. Configuração global e operações administrativas ficam restritas a Direção/Admin/Compras. Utilizadores de hotel recebem apenas estruturas compatíveis com o seu hotel e, quando permitido, apenas conseguem fundir a sua própria previsão.

## Documentos

Os metadados continuam separados dos bytes. `ops-document-content` é o endpoint binário autenticado; o servidor deriva o MIME a partir da extensão permitida do nome do ficheiro e devolve `nosniff`. O limite continua 3,5 MB por ficheiro devido ao transporte base64 no pedido.

## Performance

`compras-ab-native-v35.js` e `housekeeping-native-v35.js` deixaram de fazer parte do primeiro paint e do precache inicial. `operations-domains-v33.js` carrega cada módulo dinamicamente quando a vista correspondente é aberta. Depois de pedidos uma vez, o Service Worker pode mantê-los como fallback offline através da estratégia network-first já existente.

---

# Arquitetura — VG Operations 2.0 v30

## Princípio

A V30 é uma camada de consolidação sobre a arquitetura modular existente. Não reescreve as fontes de verdade de P&L, Revenue, Ações, Documentos, Aprovações ou Cenários.

O objetivo é reduzir a fragmentação de UX e acrescentar inteligência executiva reutilizando APIs e modelos já validados.

## Ficha do Hotel — contrato de imutabilidade

A Ficha do Hotel é uma exceção deliberada à consolidação:

- `#nav-fichahotel` permanece como item próprio do menu;
- `#view-fichahotel` permanece como vista própria;
- `assets/js/modules/ficha-hotel.js` não é modificado;
- Hotel 360º apenas referencia/abre a Ficha, não a substitui.

O teste V30 verifica o SHA-256 do módulo para impedir alterações acidentais.

## Novos módulos

### `assets/js/modules/operational-score-v28.js`

API: `VG.operationalScore`

Responsabilidades:

- calcular Score 0–100 por seis dimensões;
- normalizar pesos para 100%;
- carregar/gravar configuração partilhada em `settings-score-v30`;
- expor decomposição e dimensão mais forte/fraca.

Apenas Direção/Admin pode guardar pesos, recorrendo à proteção server-side já existente do recurso `settings`.

### `assets/js/modules/hotel-360-v30.js`

API: `VG.hotel360`

Responsabilidades:

- consumir `VG.hotelPerformance.buildModel()`;
- apresentar visão executiva e separadores por domínio;
- integrar Score;
- construir ponte explicativa da variação de GOP;
- detetar gaps de metas/Forecast;
- criar Ações de recuperação através de `VG.actions.openForPriority()`.

Não persiste uma segunda cópia de KPIs.

### `assets/js/modules/revenue-hub-v30.js`

API: `VG.revenueHub`

Cria a experiência `Revenue & Forecast` e reutiliza fisicamente as interfaces legadas:

- `view-revenueint`;
- `view-forecast`;
- `view-scenariocompare`.

As funções originais `riRender`, `forecastRender` e `scenarioComparisonRender` continuam a executar a lógica.

### `assets/js/ui/vg-operations-2-v30.js`

API: `VG.operations2`

Responsabilidades:

- reorganizar o menu principal;
- manter vistas legadas sem as expor como opções primárias;
- redirecionar rotas antigas para as novas experiências agregadas;
- criar o botão transversal `Perguntar aos dados`;
- renderizar Home específica por perfil.

## Score Operacional

Pesos por defeito:

```text
Financeiro  25
Revenue     20
Eficiência  15
Reputação   15
Execução    15
Dados       10
```

Cada dimensão produz 0–100 a partir de sinais existentes. O score final é a média ponderada normalizada.

Estados:

```text
< 60   Crítico
< 75   Atenção
< 88   Bom
>= 88  Muito bom
```

O Score é um indicador executivo explicável, não uma nota contabilística ou avaliação individual de gestão.

## Análise automática de causa

A ponte de GOP usa os valores P&L disponíveis por hotel e período:

```text
ΔGOP oficial com sede
= ΔReceita
- ΔPessoal
- ΔEnergia
- ΔManutenção
- ΔComidas
- ΔBebidas
- ΔOperacionais
- ΔMarketing
- ΔOutros custos
+ residual de sede/reconciliação
```

O residual garante reconciliação com o GOP oficial. A interface identifica claramente o método como explicativo/estimado.

## Planos de recuperação

Não existe novo armazenamento. Cada gap relevante cria/consulta Ações existentes com `sourceKey` estável:

```text
recovery:<HOTEL>:<METRICA>:<ANO>
```

Assim permanecem disponíveis responsável, prazo, estado, comentários, histórico, permissões e auditoria já implementados na Gestão de Ações.

## Revenue & Forecast

A nova vista `#view-revenuehub` funciona como orquestrador visual. Não duplica os cálculos de:

- Revenue Intelligence;
- Forecast V12;
- Comparação de Cenários V29.

Rotas antigas são encaminhadas para o separador correspondente, preservando compatibilidade com links/atalhos.

## Navegação e descoberta

O menu principal é reduzido. As vistas avançadas/legadas continuam presentes no DOM e podem ser acedidas por command palette/Pesquisa Global quando aplicável.

Notificações permanecem no topo e o Assistente Analítico passa a ser transversal.

## Home por perfil

A Home usa as mesmas permissões já aplicadas ao resto da aplicação:

- Direção/Admin pode agregar portefólio;
- Diretor/Assistente é limitado ao hotel associado.

Não é criado um endpoint adicional.

## PWA e versão

- Version guard: build `30.0`;
- Service worker: `vg-operations-shell-v30`;
- shell network-first quando online;
- `/.netlify/` continua network-only;
- novos assets V30 estão no precache estático.

## Backend

`netlify/functions/dashboard-sessao.js` é byte-a-byte igual ao da V29.1.

A V30 usa recursos já existentes:

- `settings-score-v30` através do recurso genérico `settings`;
- Ações para planos de recuperação;
- modelos e endpoints já existentes para restantes dados.


## V30.1 — Correção da navegação
A reconstrução do menu preserva agora todos os botões antes de remover os grupos antigos. Isto corrige os grupos vazios vistos na V30. A Ficha do Hotel permanece independente e o respetivo módulo não foi alterado.


## V30.3 — Correções consolidadas
- O Portefólio da Home respeita o filtro ativo de região/hotéis.
- A Ponte do GOP apresenta contribuição económica: menos custo melhora GOP (verde), mais custo deteriora (vermelho), independentemente do sinal contabilístico da rubrica.
- Revenue & Forecast incorpora as views originais completas, preservando os IDs usados pelos estilos e pelos renderizadores legados.
- Ficha do Hotel e backend não foram alterados.

## V31 — Camada de mercado

A dimensão `market` passa a anteceder hotel/ano/mês no modelo de contexto:

```text
market -> hotel -> ano -> mês
```

Mercados iniciais:

```text
iberia  -> PT+ES -> EUR
brasil  -> BR     -> BRL
```

`assets/js/core/07-markets-v31.js` mantém um banco de sessão por mercado e expõe `VG.market` para identificação de hotéis, moeda, regiões, formatação, mudança de contexto e separação de snapshots mistos.

### Persistência

Compatibilidade retroativa foi priorizada:

- Iberia usa as chaves Blob históricas sem prefixo;
- Brasil usa `market/brasil/<legacy-key>` nos recursos genéricos;
- Ações/Agenda/Documentos/Aprovações/Cenários mantêm os prefixes existentes e armazenam `market` em cada registo;
- listas e operações server-side filtram/validam `market`;
- migrações antigas de `localStorage` são executadas apenas em Iberia, impedindo que configurações/fichas PT+ES sejam publicadas no namespace Brasil.

### Moeda

`VG.market.formatMoney()` e `VG.market.formatMoneyCompact()` são a fonte transversal para EUR/BRL. Nenhum agregado financeiro deve atravessar mercados. A V31 não contém taxa de câmbio nem conversão automática.

### Dados mistos

O snapshot local continua compatível com os globais legados (`STORE`, `REP_STORE`, `OCC_SNAPSHOTS`, etc.), mas apenas o mercado ativo é projetado nesses globais. `MARKETS_V31` transporta os dois bancos quando a sessão é persistida/restaurada.

### Permissões

O frontend limita a seleção pelo hotel associado e o backend aplica a mesma regra. Recursos globais de autenticação/administração continuam globais; recursos operacionais e dados são market-scoped.

### V31.2 — isolamento de estado visual
O runtime `07-markets-v31.js` passa a tratar a troca de mercado como uma fronteira de estado também ao nível do DOM. Modelos derivados, cards, Ficha, Central, gráficos e contexto do mercado anterior são invalidados antes do restauro do novo banco. `02-navigation-kpis.js` sincroniza o estado de ausência de P&L mesmo quando `RAW` é nulo, evitando que o retorno antecipado de `refreshAll()` preserve HTML antigo.

## V32 — City Ledger & Eficiência / Unit Economics

### City Ledger & Gestão de Cobranças
- Fonte contabilística canónica: aba `Listagem` do Excel City Ledger. As restantes abas do workbook são vistas/agregações reconstruídas pela aplicação.
- Apenas linhas cujo campo `HOTEL` pertence à lista oficial do mercado ativo são aceites. Entidades corporativas que não são hotéis ficam fora; a coluna `ENTIDADE` continua livre para representar qualquer devedor/cliente.
- Vencimento operacional: `DATA_DOCUMENTO + 30 dias`. O aging histórico usa `DATA_REGISTO` do snapshot como data de referência.
- Snapshots, blocos de faturas e diligências são guardados separadamente em Netlify Blobs, com namespace de mercado.
- Diligências são append-only e registam utilizador/data-hora server-side, meio, contacto, descrição, resposta, estado, promessa e próxima diligência.
- Importações são reservadas à Direção; Diretores/Assistentes leem e registam diligências apenas no hotel associado.
- Créditos (saldo negativo) são apresentados em separado e não são somados à dívida.

### Eficiência & Unit Economics
- Evolução do antigo método ABC, mantendo o módulo legado no código mas expondo uma experiência consolidada nova.
- Numeradores: custos totais e famílias (Pessoal, Energia, Manutenção, Comidas, Bebidas, A&B, Marketing, Operacionais, Comunicações), receitas (Total, Alojamento, A&B, complementar) e GOP com sede.
- Bases de atividade: quarto disponível, quarto ocupado, dormida, hóspede/cliente e chegada.
- Agregados de portefólio são ponderados: soma do numerador / soma da atividade, nunca média simples entre hotéis.
- Semântica de variação: em custos unitários menos é melhor; em receita/GOP unitários mais é melhor.
- Respeita integralmente o mercado ativo e a moeda contextual (EUR/BRL).


## V33 — Domínios operacionais integrados

A camada V33 não duplica autenticação, geografia ou catálogo de hotéis. Os novos módulos consomem `VG.market`, o perfil autenticado e os globais operacionais existentes.

### Reputação
O JSON semanal é normalizado para o `REP_STORE` legado, preservando os gráficos ReviewPro existentes. A camada semestral mantém origem/tipo separados (`painel`, `resultados`, `concorrencia`, `respostas`, `semantica_resultados`, `semantica_mencoes`) para impedir mistura metodológica entre horizontes.

### Receita detalhada e A&B
`RD_STORE` continua a ser o livro de snapshots de receita detalhada. A área A&B lê os mapas de Compras e liga artigos vendidos às receitas técnicas quando existe correspondência normalizada. O consumo por balanço usa `inventário inicial + compras - inventário final`.

### Housekeeping
O stock têxtil é um livro-razão: `base física + entradas - quebras ± acertos`. O par oficial é `índice × vestido 100%` quando essa parametrização existe. A sugestão dinâmica aplica o forecast de ocupação com piso de segurança, sem alterar o par oficial. Diferenças de contagem física exigem justificação.

### Persistência e recuperação
Direção pode persistir os estados partilhados `ops-housekeeping`, `ops-ab` e `ops-reputation-semester`; estes recursos entram no sistema de auditoria e snapshots de recuperação. Utilizadores de hotel permanecem limitados ao âmbito autorizado.


## V33.1 — UX de integração e City Ledger

- `assets/js/modules/city-ledger-v32.js`: mantém compatibilidade V32 mas adiciona estado `filterClients[]`, filtro multi-entidade por hotel e limpeza global.
- `assets/js/ui/vg-operations-2-v30.js`: expõe os domínios V33 no grupo `Operação Integrada` e no lançador do Resumo.
- `assets/js/core/06-version-guard-v29_1.js` + `service-worker.js`: build 33.1, network-first e diagnóstico dos novos módulos.

## V34.0 — paridade funcional, lazy loading e domínios operacionais

### Micro-módulos same-origin
Para os dois módulos operacionais onde a paridade funcional com ferramentas já validadas é prioritária, a V34 usa páginas same-origin dedicadas, integradas na shell da Dashboard:

```text
/integrated/housekeeping/index.html
/integrated/custos-ab/index.html
```

Não são links para aplicações Netlify externas. A shell continua a controlar autenticação e âmbito. As páginas detetam `window.parent.vgAuthCurrent()` (ou `window.opener`) e criam uma sessão interna transitória compatível com os papéis originais, sem pedir um segundo login. A ferramenta isolada continua funcional quando aberta diretamente.

Backends:

```text
/.netlify/functions/hk-store   -> Netlify Blob vg-hk-inventario
/api/shared                    -> Netlify Blob vg-custos-ab
```

### Reputação semanal
`weeklyReputation.reports[].sources` é a fonte da tabela GRI por origem. Não se reconstrói uma média artificial entre Booking/Expedia/Google/Tripadvisor; são mostrados os valores trazidos por cada relatório semanal.

### Receituário e consumo teórico
A biblioteca técnica usa paginação client-side e detalhe modal. O matching entre venda e receita técnica é deliberadamente conservador:

```text
normalização exata do nome
OR alias explicitamente configurado
```

Não existe correspondência por substring. Linhas sem correspondência permanecem numa lista de exceções e não entram no custo/consumo teórico.

### Buffets & Ementas
`state.buffet` guarda as linhas importadas, fonte e filtros. O importador aceita grelhas Excel tabulares e procura cabeçalhos equivalentes a Hotel/Unidade, Refeição/Serviço, Prato/Artigo/Item/Descrição/Receita, Categoria/Grupo/Família, Quantidade/Capitação, Unidade, Pax/Pessoas/Couvert, Custo, Observação e Versão/Vigência. A ligação a fichas técnicas é exata pelo nome normalizado.

### Lazy loading
O ficheiro `assets/data/operations-seed-v33.json` é grande e não é descarregado no arranque. `ensureIntegratedData()` carrega-o apenas quando o utilizador entra em `reputacao`, `receitasdet` ou `ab`. O iframe de Housekeeping não depende do seed integrado.

### PDF
O botão `opsPdfAccumBtn` chama `operationalSummaryPdfOpen()` e o `index.html` carrega explicitamente:

```text
assets/js/modules/operational-summary-pdf-v32_6.js
assets/css/operational-summary-pdf-v32_6.css
```

O formato do resumo acumulado é A3 landscape com branding Vila Galé. O export geral continua A4 landscape, com cabeçalhos corrigidos e rodapé institucional próprio.

### Compatibilidade
A API pública histórica `VG.domains33` é mantida por compatibilidade com a navegação, mas o `version` interno passa a `34.0`. A Ficha do Hotel/Comentários Fecho do Mês continua protegida e não é alterada.

### Mapeamento manual validado de artigos
A exceção `artigo vendido sem ficha exata` pode ser resolvida pelo utilizador através de uma associação explícita `artigo normalizado -> ficha técnica`. O mapa é guardado em `state.ab.recipeMap`, entra na persistência A&B e é sempre apresentado como `Mapeamento validado`. Esta associação é distinta dos aliases controlados e impede que a camada de consumo teórico volte a introduzir matching difuso.


## V35.0 — arquitetura nativa dos módulos operacionais

`assets/js/modules/compras-ab-native-v35.js` e `assets/js/modules/housekeeping-native-v35.js` são módulos diretos da Dashboard. Cada um cria um ShadowRoot apenas para isolamento de CSS/IDs; não existe documento HTML secundário, iframe ou navegação para outra aplicação. A lógica de negócio provém das ferramentas originais e foi adaptada a `vgAuthCurrent()` e `VG.market`. Os backends Netlify existentes (`/api/shared` e `/.netlify/functions/hk-store`) continuam como persistência operacional.

O módulo A&B mantém a navegação complementar da plataforma (Fichas Técnicas, Consumo Teórico, Buffets & Ementas e Inteligência), enquanto a área `Custos & Compras` monta o novo motor nativo. Housekeeping monta diretamente o novo motor de inventário têxtil.

### Segurança/persistência dos módulos V35
`compras-ab-native-v35.js` comunica com `/api/shared` e `housekeeping-native-v35.js` com `/.netlify/functions/hk-store`, enviando o Bearer token da sessão principal. As duas functions validam a assinatura HMAC, expiração e `authVersion` contra `vg-dashboard-operacoes`. O Shadow DOM serve apenas para isolamento visual/DOM: os módulos continuam no mesmo documento, sessão e ciclo de vida da Dashboard.