// VG Operations V35 — Compras & A&B nativo (reconstruído a partir da ferramenta original)
(function(){
'use strict';
window.VG=window.VG||{};
if(window.VG.comprasNative35?.version>=35.0)return;
async function ensureXLSX35(){
  if(window.XLSX?.utils) return window.XLSX;
  if(window.VG?.performance?.ensureXLSX){
    await window.VG.performance.ensureXLSX();
    if(window.XLSX?.utils) return window.XLSX;
  }
  throw new Error('Biblioteca SheetJS não carregou.');
}
const AB35_TEMPLATE="<div id=\"app\" class=\"on ab35-shell\">\n  <div class=\"ab35-top\">\n    <div class=\"ab35-title\"><b>Custos &amp; Compras A&amp;B</b><span>Módulo nativo VG Operations · lógica da ferramenta original</span></div>\n    <div class=\"ab35-meta\" id=\"tbMeta\">A preparar dados…</div>\n    <select class=\"inp\" id=\"anoSel\" onchange=\"mudarAno()\" style=\"display:none\"></select>\n    <div class=\"ab35-user\"><span id=\"tbAvatar\">VG</span><div><b id=\"tbUserName\">—</b><small id=\"tbUserRole\">—</small></div></div>\n  </div>\n  <div class=\"ab35-scopebar\">\n    <div><b>Região</b><div id=\"regBtns\" class=\"ab35-filterbuttons\"></div></div>\n    <div><b>Tipologia</b><div id=\"tipBtns\" class=\"ab35-filterbuttons\"></div></div>\n    <div class=\"ab35-sync\" id=\"sbSync\">—</div>\n  </div>\n  <div class=\"ab35-nav\"><span class=\"ab35-nav-section\">Análise</span><button class=\"nav-btn on\" data-view=\"resumo\" onclick=\"setView('resumo',this)\"><span class=\"ic\">◪</span>Resumo</button><button class=\"nav-btn\" data-view=\"evolucao\" onclick=\"setView('evolucao',this)\"><span class=\"ic\">◵</span>Evolução Mensal</button><button class=\"nav-btn\" data-view=\"subfam\" onclick=\"setView('subfam',this)\"><span class=\"ic\">▤</span>Sub-Famílias</button><button class=\"nav-btn\" data-view=\"artigos\" onclick=\"setView('artigos',this)\"><span class=\"ic\">≣</span>Detalhe Artigos</button><button class=\"nav-btn\" data-view=\"hotel\" onclick=\"setView('hotel',this)\"><span class=\"ic\">⌂</span>Análise Hotel</button><button class=\"nav-btn\" data-view=\"invart\" onclick=\"setView('invart',this)\"><span class=\"ic\">▥</span>Inventário Artigos</button><button class=\"nav-btn\" data-view=\"recbeb\" onclick=\"setView('recbeb',this)\"><span class=\"ic\">◔</span>Receitas</button><button class=\"nav-btn\" data-view=\"stock\" onclick=\"setView('stock',this)\"><span class=\"ic\">▦</span>Stock & Internos</button><button class=\"nav-btn\" data-view=\"comentarios\" onclick=\"setView('comentarios',this)\"><span class=\"ic\">✎</span>Comentários</button><span class=\"ab35-nav-section\">Compras — decidir</span><button class=\"nav-btn\" data-view=\"encomenda\" onclick=\"setView('encomenda',this)\"><span class=\"ic\">▶</span>Sugestão de Encomenda</button><button class=\"nav-btn\" data-view=\"excessos\" onclick=\"setView('excessos',this)\"><span class=\"ic\">▦</span>Excessos de Stock</button><span class=\"ab35-nav-section\">Compras — diagnóstico</span><button class=\"nav-btn\" data-view=\"previsao\" onclick=\"setView('previsao',this)\"><span class=\"ic\">◈</span>Previsão (€ e unidades)</button><button class=\"nav-btn\" data-view=\"acomp\" onclick=\"setView('acomp',this)\"><span class=\"ic\">◎</span>Previsto vs. Real</button><button class=\"nav-btn\" data-view=\"roomnights\" onclick=\"setView('roomnights',this)\"><span class=\"ic\">☾</span>Roomnights</button><span id=\"adminCap\" class=\"ab35-nav-section\" style=\"display:none\">Administração</span><button class=\"nav-btn\" data-view=\"carregar\" id=\"navCarregar\" onclick=\"setView('carregar',this)\" style=\"display:none\"><span class=\"ic\">⇪</span>Carregar Dados</button><button class=\"nav-btn\" data-view=\"setup\" id=\"navSetup\" onclick=\"setView('setup',this)\" style=\"display:none\"><span class=\"ic\">⚙</span>Regiões &amp; Auditoria</button></div>\n  <div id=\"main\">\n RESUMO \n<section class=\"view on\" id=\"view-resumo\">\n<div class=\"view-head\"><h2>Resumo de Indicadores</h2><span class=\"vh-sub\" id=\"resumoSub\"></span></div>\n<div class=\"cards\" id=\"resumoCards\"></div>\n<div class=\"panel\">\n<h3>Rácios por hotel <span class=\"tag\" id=\"resumoRegTag\"></span></h3>\n<div class=\"p-tools\">\n<button class=\"chip on\" id=\"rzModoConsumo\" onclick=\"rzModo('consumo')\">Rácio de Consumo</button>\n<button class=\"chip\" id=\"rzModoCompras\" onclick=\"rzModo('compras')\">Rácio de Compras</button>\n<span style=\"flex:1\"></span>\n<select class=\"inp\" id=\"rzPeriodo\" onchange=\"renderResumo()\"></select>\n</div>\n<div class=\"tbl-wrap\" id=\"resumoTbl\" style=\"max-height:520px;overflow-y:auto\"></div>\n<div class=\"legend\">\n<span><i style=\"background:var(--ok)\"></i>Dentro do objetivo</span>\n<span><i style=\"background:var(--warn)\"></i>Em vigilância</span>\n<span><i style=\"background:var(--bad)\"></i>Acima do limite (Comidas ≥ 40% · Bebidas ≥ 25%)</span>\n<span>Δ vs. média do ano anterior (coluna MÉDIA do ficheiro)</span>\n</div>\n</div>\n<div class=\"panel\">\n<h3>Food cost (consumo) por hotel</h3>\n<div class=\"chart-box\"><canvas id=\"chartResumo\"></canvas></div>\n</div>\n</section>\n EVOLUÇÃO \n<section class=\"view\" id=\"view-evolucao\">\n<div class=\"view-head\"><h2>Evolução Mensal</h2><span class=\"vh-sub\">Rácios de consumo mês a mês vs. média do ano anterior</span></div>\n<div class=\"panel\">\n<div class=\"p-tools\">\n<button class=\"chip on\" id=\"evTipoFood\" onclick=\"evTipo('food')\">Food Cost</button>\n<button class=\"chip\" id=\"evTipoBev\" onclick=\"evTipo('bev')\">Beverage Cost</button>\n<span style=\"flex:1\"></span>\n<select class=\"inp\" id=\"evHotelSel\" onchange=\"renderEvolucao()\"></select>\n</div>\n<div class=\"chart-box\"><canvas id=\"chartEvolucao\"></canvas></div>\n</div>\n<div class=\"panel\">\n<h3>Heatmap · hotéis × meses</h3>\n<div class=\"tbl-wrap\" id=\"evHeatmap\" style=\"max-height:560px;overflow-y:auto\"></div>\n<div class=\"legend\"><span>Cor: verde = abaixo da média do ano anterior nesse mês · vermelho = acima do limite (Comidas 40% · Bebidas 25%)</span></div>\n</div>\n</section>\n SUB-FAMÍLIAS \n<section class=\"view\" id=\"view-subfam\">\n<div class=\"view-head\"><h2>Sub-Famílias</h2><span class=\"vh-sub\">Custo por couvert / por pax, acumulado do ano</span></div>\n<div class=\"panel\">\n<div class=\"p-tools\">\n<button class=\"chip on\" id=\"sfComC\" onclick=\"sfModo('couvert')\">Comidas · €/Couvert</button>\n<button class=\"chip\" id=\"sfComPA\" onclick=\"sfModo('couvertPA')\">Comidas · €/Couvert+PA</button>\n<button class=\"chip\" id=\"sfBeb\" onclick=\"sfModo('bebidas')\">Bebidas · €/Pax</button>\n<span style=\"flex:1\"></span>\n<select class=\"inp\" id=\"sfPeriodo\" onchange=\"renderSubfam()\"></select>\n</div>\n<div class=\"tbl-wrap\" id=\"sfTbl\" style=\"max-height:600px;overflow-y:auto\"></div>\n<div class=\"legend\"><span>Cor por linha: comparação com a mediana do portefólio nessa sub-família (vermelho ≥ +30%)</span></div>\n</div>\n</section>\n ARTIGOS \n<section class=\"view\" id=\"view-artigos\">\n<div class=\"view-head\"><h2>Detalhe de Artigos</h2><span class=\"vh-sub\">Consumo (€) por artigo e hotel</span></div>\n<div class=\"panel\">\n<div class=\"p-tools\">\n<select class=\"inp\" id=\"arTipo\" onchange=\"arSubfamOptions();renderArtigos()\">\n<option value=\"com\">Comidas</option><option value=\"beb\">Bebidas</option>\n</select>\n<select class=\"inp\" id=\"arMes\" onchange=\"renderArtigos()\"></select>\n<select class=\"inp\" id=\"arSubfam\" onchange=\"renderArtigos()\"></select>\n<input class=\"inp\" id=\"arFiltro\" oninput=\"renderArtigos()\" placeholder=\"Filtrar artigo…\" style=\"min-width:160px\"/>\n</div>\n<div class=\"tbl-wrap\" id=\"arTbl\" style=\"max-height:600px;overflow-y:auto\"></div>\n<div class=\"note\">Valores de consumo em euros. A linha de totais da sub-família inclui compras e inventário do período.</div>\n</div>\n</section>\n ANÁLISE HOTEL \n<section class=\"view\" id=\"view-hotel\">\n<div class=\"view-head\"><h2>Análise Hotel</h2><span class=\"vh-sub\">Benchmark individual vs. média geral e vs. região</span></div>\n<div class=\"panel\">\n<div class=\"p-tools\">\n<select class=\"inp\" id=\"ahHotel\" onchange=\"renderHotel()\"></select>\n<span class=\"tag\" id=\"ahRegTag\"></span>\n</div>\n<div class=\"tbl-wrap\" id=\"ahTbl\"></div>\n</div>\n<div class=\"grid2\">\n<div class=\"panel\"><h3>Evolução mensal do hotel</h3><div class=\"chart-box sm\"><canvas id=\"chartHotelEv\"></canvas></div></div>\n<div class=\"panel\"><h3>Custo por couvert vs. mediana do portefólio</h3><div class=\"chart-box sm\"><canvas id=\"chartHotelSf\"></canvas></div></div>\n</div>\n<div class=\"panel\">\n<h3>Comentário automático <span class=\"tag\">gerado pela ferramenta</span></h3>\n<div class=\"p-tools\">\n<select class=\"inp\" id=\"ahMesAuto\" onchange=\"renderHotelAuto()\"></select>\n<button class=\"btn ghost\" onclick=\"copiarTexto(window.AB35Root.getElementById('ahAutoTexto').innerText)\">⧉ Copiar</button>\n</div>\n<div class=\"cm-card\" style=\"border-color:var(--line)\"><div class=\"cm-text\" id=\"ahAutoTexto\"></div></div>\n</div>\n<div class=\"panel\"><h3>Comentários do Excel</h3><div class=\"cm-grid\" id=\"ahComentarios\"></div></div>\n</section>\n STOCK \n<section class=\"view\" id=\"view-stock\">\n<div class=\"view-head\"><h2>Stock &amp; Consumos Internos</h2><span class=\"vh-sub\" id=\"stockSub\"></span></div>\n<div class=\"cards\" id=\"stockCards\"></div>\n<div class=\"panel\">\n<h3>Por hotel</h3>\n<div class=\"tbl-wrap\" id=\"stockTbl\" style=\"max-height:560px;overflow-y:auto\"></div>\n<div class=\"legend\"><span>Peso do stock: inventário final sobre compras acumuladas · CI = consumos internos · Refeitório = custo estimado do refeitório de pessoal</span></div>\n</div>\n</section>\n COMENTÁRIOS \n<section class=\"view\" id=\"view-comentarios\">\n<div class=\"view-head\"><h2>Comentários dos Hotéis</h2><span class=\"vh-sub\">Notas mensais dos diretores / F&amp;B</span></div>\n<div class=\"panel\">\n<div class=\"p-tools\">\n<button class=\"chip on\" id=\"cmModoAuto\" onclick=\"cmModo('auto')\">⚡ Análise automática</button>\n<button class=\"chip\" id=\"cmModoManual\" onclick=\"cmModo('manual')\">✎ Comentários do Excel</button>\n<select class=\"inp\" id=\"cmMes\" onchange=\"renderComentarios()\"></select>\n<input class=\"inp\" id=\"cmFiltro\" oninput=\"renderComentarios()\" placeholder=\"Filtrar hotel ou texto…\" style=\"min-width:200px\"/>\n<span style=\"flex:1\"></span>\n<button class=\"btn ghost\" id=\"cmCopiarTodos\" onclick=\"copiarTodosComentarios()\">⧉ Copiar todos (briefing)</button>\n</div>\n<div class=\"note\" id=\"cmNota\" style=\"margin:-4px 0 12px\"></div>\n<div class=\"cm-grid\" id=\"cmGrid\"></div>\n</div>\n</section>\n GRUPOS & ROTAÇÃO \n<section class=\"view\" id=\"view-grupos\">\n<div class=\"view-head\"><h2>Grupos &amp; Rotação</h2><span class=\"vh-sub\">Família › Sub-família › Grupo · stock inicial, compras, inventário e consumo acumulados</span></div>\n<div class=\"panel\">\n<div class=\"p-tools\">\n<select class=\"inp\" id=\"grHotel\" onchange=\"renderGrupos()\"></select>\n<select class=\"inp\" id=\"grFam\" onchange=\"grSubOptions();renderGrupos()\"></select>\n<select class=\"inp\" id=\"grSub\" onchange=\"renderGrupos()\"></select>\n<select class=\"inp\" id=\"grBase\" onchange=\"renderGrupos()\" title=\"Ritmo de consumo para a cobertura\">\n<option value=\"ult\">Cobertura: último mês</option>\n<option value=\"u3\">Cobertura: últimos 3 meses</option>\n<option value=\"acu\">Cobertura: média do ano</option>\n</select>\n<select class=\"inp\" id=\"grMet\" onchange=\"renderGrupos()\">\n<option value=\"cons\">Consumo (€)</option>\n<option value=\"cp\">Compras (€)</option>\n<option value=\"inv\">Inventário final (€)</option>\n<option value=\"cob\">Cobertura de stock (meses)</option>\n</select>\n</div>\n<div class=\"tbl-wrap\" id=\"grTbl\" style=\"max-height:620px;overflow-y:auto\"></div>\n<div class=\"legend\"><span><b>Cobertura</b> = quantos meses o inventário atual (fecho do último mês) dura ao ritmo de consumo escolhido na caixa «Cobertura»: último mês (por defeito), últimos 3 meses, ou média do ano. Consumo real das abas mensais, repartido pelos grupos na proporção do inventário. Passe o rato na célula para ver o inventário. Amarelo ≥ 2 meses · vermelho ≥ 3 (inventário ≥ 100 €).</span></div>\n</div>\n</section>\n INVENTÁRIO ARTIGOS \n<section class=\"view\" id=\"view-invart\">\n<div class=\"view-head\"><h2>Inventário por Artigo</h2><span class=\"vh-sub\">Stock inicial, compras acumuladas, inventário final e rotação</span></div>\n<div class=\"panel\">\n<div class=\"p-tools\">\n<select class=\"inp\" id=\"iaHotel\" onchange=\"renderInvArt()\"></select>\n<select class=\"inp\" id=\"iaBase\" onchange=\"renderInvArt()\" title=\"Ritmo de consumo usado para calcular a cobertura\">\n<option value=\"ult\">Consumo do último mês</option>\n<option value=\"u3\">Média dos últimos 3 meses</option>\n<option value=\"acu\">Média do ano (acumulado)</option>\n</select>\n<select class=\"inp\" id=\"iaOrd\" onchange=\"renderInvArt()\">\n<option value=\"inv\">Ordenar por inventário final</option>\n<option value=\"cob\">Ordenar por cobertura</option>\n<option value=\"cons\">Ordenar por consumo</option>\n</select>\n<input class=\"inp\" id=\"iaFiltro\" oninput=\"renderInvArt()\" placeholder=\"Filtrar artigo…\" style=\"min-width:150px\"/>\n<label style=\"font-size:11px;color:var(--text-3)\"><input id=\"iaSo\" onchange=\"renderInvArt()\" type=\"checkbox\"/> só stock parado (≥ 2 meses)</label>\n</div>\n<div class=\"tbl-wrap\" id=\"iaTbl\" style=\"max-height:620px;overflow-y:auto\"></div>\n<div class=\"legend\"><span>Clica num artigo para comparar a sua cobertura entre os hotéis da seleção. <b>Inventário final</b> = o stock que existe <b>agora</b> (fecho do último mês com dados). <b>Cobertura</b> = quantos meses esse stock dura ao ritmo de consumo que escolheres na caixa «Consumo»: por defeito o <b>último mês</b> (o mais útil para decidir hoje), ou média dos últimos 3 meses, ou média do ano. Consumo real das abas mensais, repartido por artigo na proporção do inventário da sua sub-família. Só para inventário ≥ 100 €. Amarelo ≥ 2 meses · vermelho ≥ 3.</span></div>\n</div>\n<div class=\"panel\" id=\"iaDetalhe\" style=\"display:none\"></div>\n</section>\n RECEITAS (comidas / bebidas) \n<section class=\"view\" id=\"view-recbeb\">\n<div class=\"view-head\"><h2>Receitas</h2><span class=\"vh-sub\" id=\"rbSub\"></span></div>\n<div class=\"panel\">\n<div class=\"p-tools\">\n<select class=\"inp\" id=\"rbTipo\" onchange=\"renderRecBeb()\">\n<option value=\"beb\">Bebidas</option>\n<option value=\"com\">Comidas</option>\n</select>\n<span class=\"note\" id=\"rbNota\" style=\"margin:0\"></span>\n</div>\n<div class=\"tbl-wrap\" id=\"rbTbl\" style=\"max-height:640px;overflow-y:auto\"></div>\n</div>\n</section>\n CONFERÊNCIA P&L \n<section class=\"view\" id=\"view-conf\">\n<div class=\"view-head\"><h2>Conferência com o P&amp;L</h2><span class=\"vh-sub\" id=\"cfSub\"></span></div>\n<div class=\"cards\" id=\"cfCards\"></div>\n<div class=\"panel\">\n<h3>Diferenças por hotel <span class=\"tag\">P&amp;L − ficheiro de custos</span></h3>\n<div class=\"tbl-wrap\" id=\"cfTbl\" style=\"max-height:600px;overflow-y:auto\"></div>\n<div class=\"legend\"><span>Vermelho: diferença ≥ 1 000 € ou ≥ 1% · Amarelo: ≥ 200 € ou ≥ 0,2%. Diferenças positivas = valor no P&amp;L superior ao apurado no ficheiro.</span></div>\n</div>\n</section>\n PREVISÃO DE COMPRAS \n<section class=\"view\" id=\"view-previsao\">\n<div class=\"view-head\"><h2>Previsão</h2><span class=\"vh-sub\" id=\"pvSub\"></span></div>\n<div class=\"guia diag\"><span class=\"gi\">◈</span><span><b>Para perceber, não para decidir.</b> Mostra o consumo que se estima para os próximos meses, em euros ou em quantidades (usa o seletor). Para decidir compras, vai a «Sugestão de Encomenda». A previsão é sempre uma aproximação com margem de erro.</span></div>\n<div id=\"pvAviso\"></div>\n<div class=\"cards\" id=\"pvCards\"></div>\n<div class=\"panel\" id=\"pvRupturaPanel\" style=\"display:none;border-color:rgba(224,86,86,.4)\">\n<h3 style=\"color:var(--bad)\">⚠ Risco de rutura no próximo mês</h3>\n<p class=\"note\" style=\"margin:0 0 10px\">Artigos cujo stock atual não cobre o consumo previsto do próximo mês (ao ritmo e ocupação previstos). Ponto de partida — confirmar com a operação.</p>\n<div class=\"tbl-wrap\" id=\"pvRuptura\" style=\"max-height:280px;overflow-y:auto\"></div>\n</div>\n<div class=\"panel\" id=\"pvCenarioPanel\">\n<h3>Cenário <span class=\"tag\">ajusta e vê o impacto na hora</span></h3>\n<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:18px\">\n<div>\n<label style=\"font-size:11px;color:var(--text-3);display:block;margin-bottom:4px\">Ocupação (roomnights) <b id=\"pvOcupLbl\" style=\"color:var(--gold-soft)\">0%</b></label>\n<input id=\"pvOcup\" max=\"30\" min=\"-30\" oninput=\"onCenario()\" step=\"1\" style=\"width:100%\" type=\"range\" value=\"0\"/>\n<div style=\"font-size:10px;color:var(--text-3);display:flex;justify-content:space-between\"><span>−30%</span><span>base</span><span>+30%</span></div>\n</div>\n<div>\n<label style=\"font-size:11px;color:var(--text-3);display:block;margin-bottom:4px\">Preço de compra (€/roomnight) <b id=\"pvPrecoLbl\" style=\"color:var(--gold-soft)\">0%</b></label>\n<input id=\"pvPreco\" max=\"20\" min=\"-20\" oninput=\"onCenario()\" step=\"1\" style=\"width:100%\" type=\"range\" value=\"0\"/>\n<div style=\"font-size:10px;color:var(--text-3);display:flex;justify-content:space-between\"><span>−20%</span><span>base</span><span>+20%</span></div>\n</div>\n</div>\n<div style=\"margin-top:14px\">\n<label style=\"font-size:11px;color:var(--text-3);display:block;margin-bottom:6px\">Ajuste fino de roomnights por mês (edita o total previsto do portefólio para cada mês do horizonte):</label>\n<div id=\"pvBnEdit\" style=\"display:flex;gap:10px;flex-wrap:wrap\"></div>\n</div>\n<div class=\"p-tools\" style=\"margin-top:12px\">\n<button class=\"btn ghost\" onclick=\"resetCenario()\">↺ Repor cenário base</button>\n<span class=\"note\" id=\"pvCenarioResumo\"></span>\n</div>\n</div>\n<div class=\"panel\">\n<div class=\"p-tools\">\n<select class=\"inp\" id=\"pvHotel\" onchange=\"renderPrevisao()\"></select>\n<select class=\"inp\" id=\"pvUnidade\" onchange=\"renderPrevisao()\" title=\"Ver a previsão em euros ou em unidades reais\">\n<option value=\"eur\">Em euros (€)</option>\n<option value=\"qtd\">Em quantidades (unidades)</option>\n</select>\n<select class=\"inp\" id=\"pvHoriz\" onchange=\"renderPrevisao()\">\n<option value=\"3\">Próximos 3 meses</option>\n<option value=\"resto\">Resto do ano</option>\n<option value=\"tudo\">Todo o futuro disponível</option>\n</select>\n<select class=\"inp\" id=\"pvTipo\" onchange=\"pvSubOptions();renderPrevisao()\">\n<option value=\"com\">Comidas</option><option value=\"beb\">Bebidas</option>\n</select>\n<select class=\"inp\" id=\"pvNivel\" onchange=\"renderPrevisao()\">\n<option value=\"sub\">Por sub-família</option>\n<option value=\"art\">Por artigo</option>\n</select>\n<select class=\"inp\" id=\"pvSub\" onchange=\"renderPrevisao()\" style=\"display:none\"></select>\n<span style=\"flex:1\"></span>\n<button class=\"btn ghost\" onclick=\"copiarPrevisao()\">⧉ Copiar lista</button>\n<button class=\"btn ghost\" onclick=\"pdfPrevisao()\">⬇ Gerar PDF</button>\n<button class=\"btn\" onclick=\"emailPrevisao()\">✉ Email ao diretor</button>\n</div>\n<div class=\"tbl-wrap\" id=\"pvTbl\" style=\"max-height:600px;overflow-y:auto\"></div>\n<div class=\"legend\" id=\"pvLegenda\"><span>Método misto: €/roomnight do ano corrente por artigo, modulado pela forma sazonal do ano anterior, aplicado às roomnights previstas de cada mês. Valores em custo de consumo estimado (€). <b>A previsão é sempre uma aproximação com margem de erro</b> (validada em ~8%).</span></div>\n</div>\n<div class=\"panel\"><h3>Total previsto por mês</h3><div class=\"chart-box sm\"><canvas id=\"chartPrevisao\"></canvas></div></div>\n</section>\n ROOMNIGHTS \n<section class=\"view\" id=\"view-roomnights\">\n<div class=\"view-head\"><h2>Roomnights</h2><span class=\"vh-sub\">Room nights por hotel, ano e mês — passado e futuro</span></div>\n<div id=\"bnAviso\"></div>\n<div class=\"panel\">\n<div class=\"p-tools\">\n<select class=\"inp\" id=\"bnAno\" onchange=\"renderRoomnights()\"></select>\n<select class=\"inp\" id=\"bnSeg\" onchange=\"renderRoomnights()\">\n<option value=\"total\">Total</option>\n<option value=\"ind\">Individual</option>\n<option value=\"grp\">Grupo</option>\n<option value=\"drhp\">DRHP</option>\n</select>\n</div>\n<div class=\"tbl-wrap\" id=\"bnTbl\" style=\"max-height:600px;overflow-y:auto\"></div>\n<div class=\"legend\"><span>Fonte: ficheiro de ocupação (quartos ocupados/room nights). Anos futuros refletem reservas já registadas — crescem à medida que as reservas entram.</span></div>\n</div>\n</section>\n EXCESSOS DE STOCK \n<section class=\"view\" id=\"view-excessos\">\n<div class=\"view-head\"><h2>Excessos de Stock</h2><span class=\"vh-sub\" id=\"exSub\"></span></div>\n<div id=\"exAviso\"></div>\n<div class=\"cards\" id=\"exCards\"></div>\n<div class=\"panel\">\n<div class=\"p-tools\">\n<select class=\"inp\" id=\"exHotel\" onchange=\"renderExcessos()\"></select>\n<label style=\"font-size:11px;color:var(--text-3)\">Cobertura acima de:\n            <select class=\"inp\" id=\"exLimite\" onchange=\"renderExcessos()\" style=\"padding:5px 7px\">\n<option value=\"2\">2 meses</option>\n<option selected=\"\" value=\"3\">3 meses</option>\n<option value=\"4\">4 meses</option>\n<option value=\"6\">6 meses</option>\n</select>\n</label>\n<label style=\"font-size:11px;color:var(--text-3)\">Base de consumo:\n            <select class=\"inp\" id=\"exBase\" onchange=\"renderExcessos()\" style=\"padding:5px 7px\">\n<option value=\"ult\">último mês</option>\n<option selected=\"\" value=\"u3\">últimos 3 meses</option>\n<option value=\"acu\">média do ano</option>\n</select>\n</label>\n<select class=\"inp\" id=\"exOrd\" onchange=\"renderExcessos()\">\n<option value=\"stock\">Ordenar por stock parado</option>\n<option value=\"cob\">Ordenar por cobertura</option>\n</select>\n<input class=\"inp\" id=\"exFiltro\" oninput=\"renderExcessos()\" placeholder=\"Filtrar artigo…\" style=\"min-width:150px\"/>\n<span style=\"flex:1\"></span>\n<button class=\"btn ghost\" onclick=\"copiarExcessos()\">⧉ Copiar</button>\n</div>\n<div class=\"tbl-wrap\" id=\"exTbl\" style=\"max-height:620px;overflow-y:auto\"></div>\n<div class=\"legend\"><span>Artigos com <b>stock a mais</b>: o inventário atual (fim do último mês) dura mais do que o limite escolhido ao ritmo de consumo recente. <b>Cobertura</b> = stock atual ÷ consumo/mês; «sem giro» = tem stock mas sem consumo recente. Consumo calculado por balanço de stock (compras + transferências − variação de inventário). Ignora restos irrisórios (&lt; 5 unidades). Requer o ficheiro de quantidades com TIPO.</span></div>\n</div>\n</section>\n QUANTIDADES POR ARTIGO \n<section class=\"view\" id=\"view-quantidades\">\n<div class=\"view-head\"><h2>Quantidades por Artigo</h2><span class=\"vh-sub\" id=\"qtSub\"></span></div>\n<div id=\"qtAviso\"></div>\n<div class=\"cards\" id=\"qtCards\"></div>\n<div class=\"panel\">\n<div class=\"p-tools\">\n<select class=\"inp\" id=\"qtHotel\" onchange=\"renderQuantidades()\"></select>\n<select class=\"inp\" id=\"qtPeriodo\" onchange=\"renderQuantidades()\"></select>\n<select class=\"inp\" id=\"qtModo\" onchange=\"renderQuantidades()\">\n<option value=\"consumo\">Consumo real (histórico)</option>\n<option value=\"previsao\">Previsão (meses futuros)</option>\n</select>\n<input class=\"inp\" id=\"qtFiltro\" oninput=\"renderQuantidades()\" placeholder=\"Filtrar artigo…\" style=\"min-width:160px\"/>\n<span style=\"flex:1\"></span>\n<button class=\"btn ghost\" onclick=\"copiarQuantidades()\">⧉ Copiar</button>\n</div>\n<div class=\"tbl-wrap\" id=\"qtTbl\" style=\"max-height:620px;overflow-y:auto\"></div>\n<div class=\"legend\"><span>Quantidades em unidades reais (kg, litros, caixas…, conforme o nome do artigo). No modo <b>Previsão</b>, aplica-se quantidade/roomnight × roomnights previstas, com sazonalidade — método idêntico ao da previsão em €.</span></div>\n</div>\n</section>\n SUGESTÃO DE ENCOMENDA \n<section class=\"view\" id=\"view-encomenda\">\n<div class=\"view-head\"><h2>Sugestão de Encomenda</h2><span class=\"vh-sub\" id=\"enSub\"></span></div>\n<div class=\"guia decidir\"><span class=\"gi\">▶</span><span><b>É aqui que decides o que comprar.</b> A conta já está feita: consumo previsto + margem de segurança − stock atual, em euros e em quantidades. Antes de encomendar, espreita «Excessos de Stock» para não comprares o que já tens a mais.</span></div>\n<div id=\"enAviso\"></div>\n<div class=\"panel\" style=\"border-color:var(--line)\">\n<div style=\"display:flex;gap:10px;align-items:center;font-size:12px;color:var(--warn)\">\n<span style=\"font-size:18px\">⚠</span>\n<span>Estes valores são um <b>ponto de partida</b> calculado a partir do histórico e das roomnights previstas. Não são uma ordem de compra — validem sempre com o conhecimento da operação (eventos, reservas de grupo, promoções) antes de encomendar.</span>\n</div>\n</div>\n<div class=\"cards\" id=\"enCards\"></div>\n<div class=\"panel\">\n<div class=\"p-tools\">\n<select class=\"inp\" id=\"enHotel\" onchange=\"renderEncomenda()\"></select>\n<select class=\"inp\" id=\"enMes\" onchange=\"renderEncomenda()\"></select>\n<select class=\"inp\" id=\"enTipo\" onchange=\"renderEncomenda()\">\n<option value=\"both\">Comidas + Bebidas</option>\n<option value=\"com\">Só Comidas</option>\n<option value=\"beb\">Só Bebidas</option>\n</select>\n<label style=\"font-size:11px;color:var(--text-3)\">Stock segurança:\n            <select class=\"inp\" id=\"enSeg\" onchange=\"renderEncomenda()\" style=\"padding:5px 7px\">\n<option value=\"7\">1 semana</option>\n<option value=\"10\">10 dias</option>\n<option value=\"14\">2 semanas</option>\n<option value=\"0\">nenhum</option>\n</select>\n</label>\n<label style=\"font-size:11px;color:var(--text-3)\"><input checked=\"\" id=\"enSoNec\" onchange=\"renderEncomenda()\" type=\"checkbox\"/> só o que é preciso encomendar</label>\n<label style=\"font-size:11px;color:var(--text-3)\"><input checked=\"\" id=\"enUnid\" onchange=\"renderEncomenda()\" type=\"checkbox\"/> incluir quantidades (unidades)</label>\n<span style=\"flex:1\"></span>\n<button class=\"btn ghost\" onclick=\"copiarEncomenda()\">⧉ Copiar lista</button>\n<button class=\"btn ghost\" onclick=\"pdfEncomenda()\">⬇ Gerar PDF</button>\n<button class=\"btn\" onclick=\"emailEncomenda()\">✉ Enviar por email</button>\n</div>\n<div class=\"tbl-wrap\" id=\"enTbl\" style=\"max-height:600px;overflow-y:auto\"></div>\n<div class=\"legend\"><span><b>A encomendar</b> = consumo previsto do mês + stock de segurança − stock atual (nunca negativo). O stock atual é o inventário do fecho do último mês com dados. Ajusta o cenário (ocupação/preço) na vista Previsão — reflete-se aqui.</span></div>\n</div>\n</section>\n PREVISTO VS REAL \n<section class=\"view\" id=\"view-acomp\">\n<div class=\"view-head\"><h2>Previsto vs. Real</h2><span class=\"vh-sub\">Acompanhamento e calibração das previsões</span></div>\n<div id=\"acAviso\"></div>\n<div class=\"panel\" id=\"acGuardarPanel\">\n<h3>Guardar previsão do mês</h3>\n<p class=\"note\" style=\"margin:0 0 10px\">Guarda a previsão de um mês para, quando o consumo real desse mês estiver disponível, comparar e medir o desvio. As previsões guardadas são partilhadas com todos os utilizadores.</p>\n<div class=\"p-tools\">\n<select class=\"inp\" id=\"acGuardarMes\"></select>\n<button class=\"btn\" onclick=\"guardarPrevisaoMes()\">💾 Guardar previsão deste mês</button>\n</div>\n</div>\n<div class=\"cards\" id=\"acCards\"></div>\n<div class=\"panel\">\n<h3>Desvios por mês guardado</h3>\n<p class=\"note\" style=\"margin:0 0 10px\">O erro médio por hotel é a média dos desvios <b>absolutos</b> de cada hotel — não deixa um erro para cima num hotel cancelar um erro para baixo noutro. Clica num mês para ver o detalhe hotel a hotel.</p>\n<div class=\"tbl-wrap\" id=\"acTbl\" style=\"max-height:400px;overflow-y:auto\"></div>\n</div>\n<div class=\"panel\" id=\"acDetalhe\" style=\"display:none\"></div>\n</section>\n CARREGAR \n<section class=\"view\" id=\"view-carregar\">\n<div class=\"view-head\"><h2>Carregar Dados</h2><span class=\"vh-sub\">Ficheiro Custos_A_B_PT (Excel mensal acumulado)</span></div>\n<div class=\"panel\">\n<div class=\"drop\" id=\"dropZone\" onclick=\"window.AB35Root.getElementById('fileInput').click()\">\n<div style=\"font-size:26px;margin-bottom:8px\">⇪</div>\n          Arrasta o ficheiro <b>Custos_A_B_PT_MMYYYY.xlsx</b> para aqui, ou clica para escolher.\n          <input accept=\".xlsx,.xlsm\" id=\"fileInput\" onchange=\"handleFile(this.files[0])\" style=\"display:none\" type=\"file\"/>\n</div>\n<div class=\"prog\" id=\"loadProg\"></div>\n<div class=\"p-tools\" style=\"margin-top:14px\">\n<button class=\"btn\" disabled=\"\" id=\"btnPublicar\" onclick=\"publicarDados()\">☁ Publicar custos para todos</button>\n<button class=\"btn ghost\" onclick=\"recarregarCloud(true)\">↺ Recarregar dados publicados</button>\n</div>\n<div class=\"note\">Cada ficheiro de custos é guardado pelo seu ano (detetado automaticamente). Publicar substitui apenas os dados desse ano; os restantes anos ficam intactos.</div>\n</div>\n<div class=\"panel\">\n<h3>Roomnights / Ocupação <span class=\"tag\">para previsão</span></h3>\n<div class=\"drop\" id=\"dropBn\" onclick=\"window.AB35Root.getElementById('fileBn').click()\">\n<div style=\"font-size:22px;margin-bottom:6px\">☾</div>\n          Arrasta o ficheiro de <b>ocupação (room nights por hotel/ano/mês)</b>, ou clica para escolher.\n          <input accept=\".xlsx,.xlsm\" id=\"fileBn\" onchange=\"handleFileBn(this.files[0])\" style=\"display:none\" type=\"file\"/>\n</div>\n<div class=\"prog\" id=\"bnProg\"></div>\n<div class=\"p-tools\" style=\"margin-top:12px\">\n<button class=\"btn\" disabled=\"\" id=\"btnPubBn\" onclick=\"publicarRoomnights()\">☁ Publicar roomnights</button>\n</div>\n<div class=\"note\">As roomnights são a base de toda a previsão de compras. Uma única publicação cobre todos os anos do ficheiro (2025, 2026, 2027…).</div>\n</div>\n<div class=\"panel\">\n<h3>Histórico anual de custos <span class=\"tag\">sazonalidade</span></h3>\n<div class=\"note\" style=\"margin-bottom:10px\">Para a previsão captar a forma sazonal de cada artigo, publica também o mapa de custos <b>completo do ano anterior</b>. É opcional — sem ele, a sazonalidade usa apenas as roomnights.</div>\n<div class=\"drop\" id=\"dropHist\" onclick=\"window.AB35Root.getElementById('fileHist').click()\">\n<div style=\"font-size:22px;margin-bottom:6px\">↺</div>\n          Arrasta o mapa de custos do <b>ano anterior completo</b> (ex.: Custos_A_B_2025), ou clica.\n          <input accept=\".xlsx,.xlsm\" id=\"fileHist\" onchange=\"handleFileHist(this.files[0])\" style=\"display:none\" type=\"file\"/>\n</div>\n<div class=\"prog\" id=\"histProg\"></div>\n<div class=\"p-tools\" style=\"margin-top:12px\">\n<button class=\"btn\" disabled=\"\" id=\"btnPubHist\" onclick=\"publicarHist()\">☁ Publicar histórico</button>\n</div>\n</div>\n<div class=\"panel\">\n<h3>Quantidades por artigo <span class=\"tag\">previsão em unidades</span></h3>\n<div class=\"note\" style=\"margin-bottom:10px\">Ficheiro com a aba <b>«Pivot livre»</b> (quantidades por artigo, hotel e mês). Carrega o <b>ano completo anterior uma vez</b> e o <b>ano corrente</b> à medida que avança (substitui-se). Guardado por ano — funciona perpetuamente. <b>Mantém sempre a mesma configuração da pivot</b> (mesmos campos nas linhas e colunas).</div>\n<div class=\"drop\" id=\"dropQtd\" onclick=\"window.AB35Root.getElementById('fileQtd').click()\">\n<div style=\"font-size:22px;margin-bottom:6px\">⚖</div>\n          Arrasta o ficheiro de <b>quantidades (Pivot livre)</b>, ou clica para escolher.\n          <input accept=\".xlsx,.xlsm\" id=\"fileQtd\" onchange=\"handleFileQtd(this.files[0])\" style=\"display:none\" type=\"file\"/>\n</div>\n<div class=\"prog\" id=\"qtdProg\"></div>\n<div class=\"p-tools\" style=\"margin-top:12px\">\n<button class=\"btn\" disabled=\"\" id=\"btnPubQtd\" onclick=\"publicarQtd()\">☁ Publicar quantidades</button>\n</div>\n<div class=\"note\">Ativa a previsão e a encomenda em <b>unidades reais</b> (kg, litros, caixas…), além de €.</div>\n</div>\n</section>\n SETUP \n<section class=\"view\" id=\"view-setup\">\n<div class=\"view-head\"><h2>Setup</h2><span class=\"vh-sub\">Regiões e auditoria integradas na sessão da Dashboard</span></div>\n<div class=\"panel\"><h3>Acessos</h3><p class=\"note\">Os utilizadores e permissões são geridos pela autenticação única da VG Operations. Este módulo não mantém um segundo login.</p><span id=\"usersCount\" hidden></span><div id=\"usersGrid\" hidden></div></div>\n<div class=\"panel\">\n<h3>Regiões — afetação de hotéis</h3>\n<p class=\"note\" style=\"margin:0 0 10px\">As alterações sobrepõem o mapeamento por defeito e são partilhadas com todos os utilizadores.</p>\n<div class=\"au-grid\" id=\"regioesEditor\"></div>\n<div class=\"p-tools\" style=\"margin-top:12px\">\n<button class=\"btn\" onclick=\"saveRegioes()\">💾 Guardar regiões</button>\n<button class=\"btn ghost\" onclick=\"resetRegioes()\">↺ Repor por defeito</button>\n</div>\n</div>\n<div class=\"panel\">\n<h3>Auditoria recente</h3>\n<div class=\"tbl-wrap\" id=\"auditTbl\" style=\"max-height:300px;overflow-y:auto\"></div>\n</div>\n</section>\n</div>\n  <div class=\"tb-user\" style=\"display:none\"><b id=\"tbUserRoleCompat\"></b></div>\n</div>\n<div class=\"modal-bg\" id=\"userModalBg\"><div class=\"modal\" id=\"userModal\"></div></div>\n<div class=\"toast\" id=\"toast\"></div>";
let AB35_HOST=null,AB35_SHADOW=null,AB35_INIT=null,AB35_MARKET=null;
function ab35DashUser(){try{return window.vgAuthCurrent?.()||null}catch(e){return null}}
function ab35Norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/^VILA GALE\s+/,'').replace(/^VG\s+/,'').replace(/\s+/g,' ').trim();}
function ab35Role(u){const r=String(u?.role||'').toLowerCase();return ['admin','direcao'].includes(r)?'DO':r==='diretor'?'DIRETOR':r==='assistente'?'ASSISTENTE':r==='compras'?'DO':'ASSISTENTE';}
function ab35CurrentMarket(){try{return window.VG?.market?.id?.()||'iberia'}catch(e){return'iberia'}}
function ab35MarketAllows(h){try{return !window.VG?.market?.isCurrentHotel||window.VG.market.isCurrentHotel(h)}catch(e){return true}}
function ab35ProfileAllows(h){const u=ab35DashUser();if(!u||['direcao','admin'].includes(String(u.role||'').toLowerCase()))return true;const hs=Array.isArray(u.hotels)?u.hotels:(u.hotel&&u.hotel!=='*'?[u.hotel]:[]);return hs.some(x=>ab35Norm(h)===ab35Norm(x));}

/* =====================================================================
   VG · Custos A&B — constantes e estado
===================================================================== */
'use strict';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MES_SUF = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

/* Mapa de regiões — idêntico ao VG Dashboard. Hotéis não listados caem em "Sede & Outros". */
const REGIOES_DEFAULT = {
 'ALBACORA':'Algarve','AMPALIUS':'Algarve','ATLANTICO':'Algarve','CERRO ALAGOA':'Algarve','LAGOS':'Algarve',
 'MARINA':'Algarve','NAUTICO':'Algarve','TAVIRA':'Algarve','COLLECTION PRAIA':'Algarve','ISLA CANELA':'Algarve',
 'CASCAIS':'Lisboa & Ilhas','ESTORIL':'Lisboa & Ilhas','ERICEIRA':'Lisboa & Ilhas','OPERA':'Lisboa & Ilhas',
 'COLLECTION PALACIO DOS ARCOS':'Lisboa & Ilhas','COLLECTION SINTRA':'Lisboa & Ilhas','COLLECTION S. MIGUEL':'Lisboa & Ilhas',
 'SANTA CRUZ':'Lisboa & Ilhas','NEP KIDS':'Lisboa & Ilhas',
 'PORTO':'Norte e Centro','PORTO RIBEIRA':'Norte e Centro','COIMBRA':'Norte e Centro','COLLECTION BRAGA':'Norte e Centro',
 'COLLECTION DOURO':'Norte e Centro','DOURO VINEYARDS':'Norte e Centro','COLLECTION SERRA DA ESTRELA':'Norte e Centro',
 'COLLECTION FIGUEIRA DA FOZ':'Norte e Centro','COLLECTION TOMAR':'Norte e Centro',
 'COLLECTION PONTE DE LIMA VINEYARDS':'Norte e Centro',
 'EVORA':'Alentejo','CASAS DE ELVAS':'Alentejo','COLLECTION ELVAS':'Alentejo','COLLECTION ALTER REAL':'Alentejo',
 'COLLECTION MONTE DO VILAR':'Alentejo','ALENTEJO VINEYARDS':'Alentejo'
};
const REG_OUTROS = 'Sede & Outros';
const REG_LISTA  = ['Norte e Centro','Lisboa & Ilhas','Alentejo','Algarve'];

/* Limiares (conforme notas do próprio ficheiro Excel) */
const LIM_FOOD = 0.40, LIM_BEV = 0.25;
const VIG_FOOD = 0.33, VIG_BEV = 0.20;

const AB35_USERS_DISABLED = [];

let DATA = null;            // dataset ativo (ver estrutura em parseWorkbook)
let USERS = null;           // lista de utilizadores (Netlify Blobs)
let REGIOES = {...REGIOES_DEFAULT};
let CURRENT_USER = null;
let selectedRegion = 'Todos';
let selectedTip = 'Todas';
let selectedAno = null;      // ano da publicação em visualização
let ANOS = [];               // anos com publicação disponível
let ROOMNIGHTS = null;        // dataset de ocupação (roomnights) partilhado
let DATA_HIST = null;        // dataset de custos do ano anterior (para sazonalidade)
let QTD = null;              // quantidades do ano selecionado (Pivot livre)
let QTD_ANOS = [];           // anos com quantidades publicadas
let rzModoAtual = 'consumo';
let evTipoAtual = 'food';
let sfModoAtual = 'couvert';
const CHARTS = {};

/* =====================================================================
   Utilitários
===================================================================== */
const $ = id => window.AB35Root.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const isNum = v => typeof v === 'number' && isFinite(v);
function fmtPct(v, dec){ if(!isNum(v)) return '—'; return (v*100).toFixed(dec===undefined?1:dec).replace('.',',') + '%'; }
function fmtEur(v, dec){ if(!isNum(v)) return '—'; return v.toLocaleString('pt-PT',{minimumFractionDigits:dec===undefined?0:dec, maximumFractionDigits:dec===undefined?0:dec}) + ' €'; }
function fmtNum(v){ if(!isNum(v)) return '—'; return v.toLocaleString('pt-PT'); }
function media(arr){ const a = arr.filter(isNum); return a.length ? a.reduce((s,v)=>s+v,0)/a.length : null; }
function mediana(arr){ const a = arr.filter(isNum).sort((x,y)=>x-y); if(!a.length) return null; const m = Math.floor(a.length/2); return a.length%2 ? a[m] : (a[m-1]+a[m])/2; }
function soma(arr){ const a = arr.filter(isNum); return a.length ? a.reduce((s,v)=>s+v,0) : 0; }
function toast(msg){ const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(()=>t.classList.remove('on'), 3500); }
function regiaoDe(h){ return REGIOES[h] || REG_OUTROS; }
function tipologiasDe(h){
  if(!DATA || !DATA.tipologias) return [];
  return Object.keys(DATA.tipologias).filter(t => DATA.tipologias[t].indexOf(h) >= 0);
}
function hoteisAtivos(){
  if(!DATA) return [];
  return DATA.hoteis.filter(h =>
    (selectedRegion==='Todos' || regiaoDe(h)===selectedRegion) &&
    (selectedTip==='Todas' || tipologiasDe(h).indexOf(selectedTip) >= 0));
}
function semClass(v, lim, vig){ if(!isNum(v)) return 'mut'; if(v >= lim) return 'bad'; if(v >= vig) return 'warn'; return 'ok'; }
function heatColor(v, ref, lim){
  /* verde abaixo da referência, amarelo entre referência e limite, vermelho acima do limite */
  if(!isNum(v)) return 'transparent';
  if(isNum(lim) && v >= lim) return 'rgba(224,86,86,.30)';
  if(isNum(ref)){
    if(v <= ref) return 'rgba(61,189,125,'+Math.min(.30, .08 + (ref-v)*1.6).toFixed(2)+')';
    return 'rgba(224,168,50,'+Math.min(.30, .08 + (v-ref)*1.6).toFixed(2)+')';
  }
  return 'transparent';
}
function anoRef(){
  /* ano de referência da coluna MÉDIA do próprio ficheiro (ex.: "MÉDIA (2025)") */
  const l = ((DATA||{}).raciosMensais||{}).food ? (DATA.raciosMensais.food.mediaLabel||'') : '';
  const m = /(\d{4})/.exec(l);
  if(m) return m[1];
  return DATA && DATA.meta && DATA.meta.ano ? String(DATA.meta.ano - 1) : 'ano anterior';
}
function refLbl(){ return 'Média '+anoRef(); }
function destroyChart(id){ if(CHARTS[id]){ CHARTS[id].destroy(); delete CHARTS[id]; } }
function mkChart(id, cfg){ destroyChart(id); const el = $(id); if(!el || typeof Chart==='undefined') return; CHARTS[id] = new Chart(el.getContext('2d'), cfg); }


/* =====================================================================
   Netlify Blobs — sincronização partilhada
===================================================================== */
const API_URL = '/api/shared';
async function apiCall(action, key, data, timeoutMs){
  const ctrl = new AbortController();
  const t = setTimeout(()=>ctrl.abort(), timeoutMs || 20000);
  try{
    const headers={'content-type':'application/json'};
    const authToken=typeof window.vgAuthToken==='function'?window.vgAuthToken():'';
    if(authToken) headers.Authorization='Bearer '+authToken;
    const r = await fetch(API_URL, { method:'POST', headers,
      body: JSON.stringify({action, key, data}), signal: ctrl.signal });
    clearTimeout(t);
    if(!r.ok) throw new Error('HTTP '+r.status+' em '+action+':'+key);
    const j = await r.json();
    if(j.error) throw new Error(j.error);
    return j.data;
  } finally { clearTimeout(t); }
}
async function apiRetry(action, key, data, tries){
  let last;
  for(let i=0;i<(tries||3);i++){
    try{ return await apiCall(action, key, data); }
    catch(e){ last = e; await new Promise(r=>setTimeout(r, 700*(i+1))); }
  }
  throw last;
}
/* fetch paralelo com limite de concorrência */
async function fetchChunks(keys, onProgress){
  const out = {};
  let i = 0, done = 0;
  const worker = async () => {
    while(i < keys.length){
      const k = keys[i++];
      out[k] = await apiRetry('get', k);
      done++; if(onProgress) onProgress(done, keys.length);
    }
  };
  await Promise.all([0,1,2,3].slice(0, Math.min(4, keys.length)).map(worker));
  return out;
}

/* =====================================================================
   Autenticação e utilizadores
===================================================================== */
async function loadUsers(){
  try{
    const u = await apiRetry('get', 'users', null, 2);
    USERS = Array.isArray(u) && u.length ? u : [...AB35_USERS_DISABLED];
    if(!Array.isArray(u) || !u.length){ try{ await apiCall('set','users',USERS); }catch(e){} }
  } catch(e){
    USERS = [...AB35_USERS_DISABLED];   // sem rede: permite entrar com o seed local
  }
}
async function doLogin(){
  const login = $('loginUser').value.trim().toLowerCase();
  const pass  = $('loginPass').value;
  $('loginMsg').textContent = 'A verificar…';
  if(!USERS) await loadUsers();
  const u = USERS.find(x => String(x.login).toLowerCase() === login && String(x.pass) === pass && Number(x.ativo) === 1);
  if(!u){ $('loginMsg').textContent = 'Credenciais inválidas ou utilizador inativo.'; return; }
  CURRENT_USER = u;
  sessionStorage.setItem('vgcab_user', JSON.stringify({login:u.login, ts:Date.now()}));
  $('loginMsg').textContent = '';
  entrar();
  audit('login','Sessão iniciada');
}
function entrar(){
  $('loginOverlay').style.display = 'none';
  $('app').classList.add('on');
  $('tbUserName').textContent = CURRENT_USER.nome || CURRENT_USER.login;
  $('tbAvatar').textContent = (CURRENT_USER.nome || CURRENT_USER.login).slice(0,1).toUpperCase();
  $('tbUserRole').textContent = roleLabel(CURRENT_USER.role) + (CURRENT_USER.hotel ? ' · '+CURRENT_USER.hotel : '');
  const isDO = CURRENT_USER.role === 'DO';
  $('adminCap').style.display = isDO ? '' : 'none';
  $('navCarregar').style.display = isDO ? '' : 'none';
  $('navSetup').style.display = isDO ? '' : 'none';
  buildRegBtns();
  buildTipBtns();
  recarregarCloud(false);
}
function roleLabel(r){ return r==='DO' ? 'Direção de Operações' : r==='DIRETOR' ? 'Diretor' : 'Assistente de Direção'; }
function doLogout(){
  sessionStorage.removeItem('vgcab_user');
  CURRENT_USER = null;
  $('app').classList.remove('on');
  $('loginOverlay').style.display = 'flex';
  $('loginPass').value = '';
}
async function loadLocalExtras(){
  try{ const bn = await idbGet('roomnights'); if(bn && !ROOMNIGHTS) ROOMNIGHTS = bn; }catch(e){}
  try{ const h = await idbGet('hist'); if(h && !DATA_HIST) DATA_HIST = h; }catch(e){}
  try{ const qa = await idbGet('qtd_anos_local'); }catch(e){}
}
async function tryRestoreSession(){
  const s = sessionStorage.getItem('vgcab_user');
  if(!s) return;
  try{
    const {login} = JSON.parse(s);
    await loadUsers();
    const u = USERS.find(x => x.login === login && Number(x.ativo) === 1);
    if(u){ CURRENT_USER = u; entrar(); }
  }catch(e){}
}
async function audit(acao, detalhe){
  try{
    const a = (await apiCall('get','audit')) || [];
    a.unshift({ ts:new Date().toISOString(), user:CURRENT_USER ? CURRENT_USER.login : '?', acao, detalhe });
    await apiCall('set','audit', a.slice(0,200));
  }catch(e){}
}

/* =====================================================================
   PARSER do ficheiro Custos_A_B_PT_MMYYYY.xlsx
   Lê os valores tal como estão nas abas de resumo do Excel (não reconstrói).
===================================================================== */
/*PARSER-START*/
function shGrid(wb, name){
  const ws = wb.Sheets[name];
  if(!ws) return null;
  return XLSX.utils.sheet_to_json(ws, { header:1, raw:true, defval:null });
}
function findCell(grid, pred, maxR){
  for(let r=0; r<Math.min(grid.length, maxR||grid.length); r++){
    const row = grid[r] || [];
    for(let c=0; c<row.length; c++){
      if(pred(row[c], r, c)) return {r, c};
    }
  }
  return null;
}
const trimU = v => (typeof v === 'string' ? v.trim() : v);
function n(v){ return (typeof v === 'number' && isFinite(v)) ? v : null; }

function parseWorkbook(wb, fileName){
  const D = { meta:{}, hoteis:[], resumo:{}, total:{}, comparativo:{}, raciosMensais:{food:{},bev:{}},
              resumoGeral:{}, mensal:{com:{},beb:{}}, acumulado:{com:null,beb:null}, diversos:{}, comentarios:{} };
  const avisos = [];

  /* --- meta a partir do nome do ficheiro --- */
  const m = /(\d{2})[-_ ]?(\d{4})/.exec(fileName || '');
  D.meta.ficheiro = fileName || '';
  D.meta.mes = m ? parseInt(m[1],10) : null;
  let anoNome = m ? parseInt(m[2],10) : NaN;
  D.meta._anoNome = (anoNome >= 2020 && anoNome <= 2100) ? anoNome : null;
  if(!(D.meta.mes >= 1 && D.meta.mes <= 12)) D.meta.mes = null;
  D.meta.ano = null; // definido abaixo, depois de ler a coluna MÉDIA
  D.meta.geradoEm = new Date().toISOString();

  /* --- RESUMO - INDICADORES (bloco 1 + comparativo) --- */
  const gi = shGrid(wb, 'RESUMO - INDICADORES');
  if(!gi) throw new Error('Aba "RESUMO - INDICADORES" não encontrada.');
  let a = findCell(gi, v => trimU(v) === 'Hotel');
  if(!a) throw new Error('Cabeçalho "Hotel" não encontrado em RESUMO - INDICADORES.');
  for(let r = a.r+1; r < gi.length; r++){
    const h = trimU((gi[r]||[])[a.c]);
    if(!h) break;
    if(h === 'TOTAL'){
      const row = gi[r];
      D.total = { fcCompras:n(row[a.c+1]), fcConsumo:n(row[a.c+2]), bcCompras:n(row[a.c+3]), bcConsumo:n(row[a.c+4]),
                  clientes:n(row[a.c+5]), consumoPax:n(row[a.c+6]), stockPax:n(row[a.c+7]), pesoStock:n(row[a.c+8]) };
      break;
    }
    if(h === 'Conferência') break;
    const row = gi[r];
    D.hoteis.push(h);
    D.resumo[h] = { fcCompras:n(row[a.c+1]), fcConsumo:n(row[a.c+2]), bcCompras:n(row[a.c+3]), bcConsumo:n(row[a.c+4]),
                    clientes:n(row[a.c+5]), consumoPax:n(row[a.c+6]), stockPax:n(row[a.c+7]), pesoStock:n(row[a.c+8]) };
  }
  /* comparativo: segundo "Hotel" depois de "COMPARATIVO" */
  const comp = findCell(gi, v => typeof v === 'string' && v.indexOf('COMPARATIVO') === 0);
  if(comp){
    let b = null;
    for(let r = comp.r; r < gi.length && !b; r++){
      const row = gi[r] || [];
      for(let c = 0; c < row.length; c++) if(trimU(row[c]) === 'Hotel'){ b = {r, c}; break; }
    }
    if(b){
      for(let r = b.r+1; r < gi.length; r++){
        const h = trimU((gi[r]||[])[b.c]);
        if(!h || h === 'TOTAL' || h === 'Conferência') break;
        const row = gi[r];
        D.comparativo[h] = {
          com: { receita:n(row[b.c+1]), compras:n(row[b.c+2]), racioCompras:n(row[b.c+3]), consumo:n(row[b.c+4]), inventario:n(row[b.c+5]), racioConsumo:n(row[b.c+6]) },
          beb: { receita:n(row[b.c+8]), compras:n(row[b.c+9]), racioCompras:n(row[b.c+10]), consumo:n(row[b.c+11]), inventario:n(row[b.c+12]), racioConsumo:n(row[b.c+13]) }
        };
      }
    }
  }
  if(!D.hoteis.length) throw new Error('Nenhum hotel encontrado em RESUMO - INDICADORES.');

  /* --- RÁCIOS MÊS A MÊS --- */
  const gr = shGrid(wb, 'RÁCIOS MÊS A MÊS');
  if(gr){
    const bloco = (titulo) => {
      const t = findCell(gr, v => trimU(v) === titulo);
      if(!t) return null;
      let hd = null;
      for(let r = t.r; r < Math.min(gr.length, t.r+6) && !hd; r++){
        const row = gr[r] || [];
        for(let c = 0; c < row.length; c++) if(trimU(row[c]) === 'Meses'){ hd = {r, c}; break; }
      }
      if(!hd) return null;
      const hdRow = gr[hd.r];
      const hotCols = [];
      for(let c = hd.c+1; c < hdRow.length; c++){
        const v = trimU(hdRow[c]);
        if(!v || String(v).indexOf('MÉDIA') === 0) break;
        hotCols.push({h:v, c});
      }
      const out = { media2025:[], hoteis:{}, mediaLabel: String(trimU(hdRow[hd.c-1]) || '') };
      hotCols.forEach(x => out.hoteis[x.h] = []);
      for(let i = 0; i < 12; i++){
        const row = gr[hd.r+1+i] || [];
        out.media2025.push(n(row[hd.c-1]));
        hotCols.forEach(x => out.hoteis[x.h].push(n(row[x.c])));
      }
      return out;
    };
    D.raciosMensais.food = bloco('FOOD COST') || {media2025:[],hoteis:{}};
    D.raciosMensais.bev  = bloco('BEVERAGE COST') || {media2025:[],hoteis:{}};
  } else avisos.push('Aba RÁCIOS MÊS A MÊS não encontrada.');
  /* Ano do ficheiro: a coluna MÉDIA refere o ano anterior, logo ano = média+1 */
  const lblMed = (D.raciosMensais.food && D.raciosMensais.food.mediaLabel) || '';
  const mMed = /(\d{4})/.exec(lblMed);
  const anoMedia = mMed ? parseInt(mMed[1],10) + 1 : null;
  D.meta.ano = (anoMedia && anoMedia >= 2020 && anoMedia <= 2100) ? anoMedia
             : (D.meta._anoNome || new Date().getFullYear());

  /* --- RESUMO GERAL (custo por couvert / pax por sub-família) --- */
  const gg = shGrid(wb, 'RESUMO GERAL');
  if(gg){
    const anchor = findCell(gg, v => trimU(v) === 'CUSTO COMIDAS/COUVERT');
    if(anchor){
      const hdRow = gg[anchor.r];
      const hotCols = [];
      for(let c = anchor.c+1; c < hdRow.length; c++){
        const v = trimU(hdRow[c]);
        if(!v) break;
        hotCols.push({h:v, c});
      }
      const lerBloco = (r0, stopFn) => {
        const out = {};
        for(let r = r0; r < gg.length; r++){
          const lbl = trimU((gg[r]||[])[anchor.c]);
          if(stopFn(lbl, r)) break;
          if(!lbl) continue;
          out[lbl] = {};
          hotCols.forEach(x => out[lbl][x.h] = n((gg[r]||[])[x.c]));
        }
        return out;
      };
      const idxOf = (titulo) => { const f = findCell(gg, v => trimU(v) === titulo); return f ? f.r : -1; };
      const iCouvPA = idxOf('CUSTO COMIDAS/COUVERT + PA');
      const iTotCom = idxOf('CUSTO TOTAL COMIDAS');
      const iBebPax = idxOf('CUSTO BEBIDAS / PAX');
      const iTotBeb = idxOf('CUSTO TOTAL BEBIDAS');
      const iFood   = idxOf('FOOD COST');
      D.resumoGeral.couvert   = lerBloco(anchor.r+1, (l,r) => r >= (iCouvPA>0?iCouvPA:gg.length));
      D.resumoGeral.couvertPA = iCouvPA>0 ? lerBloco(iCouvPA+1, (l,r) => r >= (iTotCom>0?iTotCom:gg.length)) : {};
      if(iTotCom>0){
        const b = lerBloco(iTotCom+1, (l,r) => r >= (iBebPax>0?iBebPax:gg.length));
        D.resumoGeral.totalComidas = b;
      }
      if(iBebPax>0){
        D.resumoGeral.bebidasPax = lerBloco(iBebPax+1, (l,r) => r >= (iTotBeb>0?iTotBeb:gg.length));
      }
      if(iTotBeb>0){
        D.resumoGeral.totalBebidas = lerBloco(iTotBeb+1, (l,r) => r >= (iFood>0?iFood:iTotBeb+6));
      }
    } else avisos.push('Âncora CUSTO COMIDAS/COUVERT não encontrada em RESUMO GERAL.');
  } else avisos.push('Aba RESUMO GERAL não encontrada.');

  /* --- abas mensais + acumulado (Comidas_XXX / Bebidas_XXX) --- */
  const parseConsumo = (name) => {
    const g = shGrid(wb, name);
    if(!g) return null;
    const a2 = findCell(g, v => trimU(v) === 'ARTIGOS', 8);
    if(!a2) return null;
    const hdRow = g[a2.r];
    const hotCols = [];
    for(let c = a2.c+1; c < hdRow.length; c++){
      const v = trimU(hdRow[c]);
      if(!v) break;
      if(v === 'TOTAL'){ hotCols.push({h:'TOTAL', c}); break; }
      hotCols.push({h:v, c});
    }
    const TOTAIS = ['Total Consumo','Peso no Custo','Custo por Couvert','Custo por Couvert+PA','Total Compras','Total Inventário'];
    const out = { subfams:{}, ordem:[] };
    let atual = null;
    let temDados = false;
    for(let r = a2.r+1; r < g.length; r++){
      const row = g[r] || [];
      const lbl = trimU(row[a2.c]);
      if(!lbl) continue;
      const primeiraCel = row[hotCols.length ? hotCols[0].c : a2.c+1];
      if(typeof primeiraCel === 'string' && primeiraCel.trim() === hotCols[0].h){
        atual = lbl;
        out.subfams[atual] = { artigos:{}, ordemArtigos:[], totais:{} };
        out.ordem.push(atual);
        continue;
      }
      if(!atual) continue;
      const vals = {};
      hotCols.forEach(x => vals[x.h] = n(row[x.c]));
      if(TOTAIS.indexOf(lbl) >= 0){
        out.subfams[atual].totais[lbl] = vals;
      } else {
        out.subfams[atual].artigos[lbl] = vals;
        out.subfams[atual].ordemArtigos.push(lbl);
        if(Object.values(vals).some(v => isNum(v) && Math.abs(v) > 0.005)) temDados = true;
      }
    }
    return temDados ? out : null;
  };
  for(let i = 0; i < 12; i++){
    const c = parseConsumo('Comidas_'+MES_SUF[i]);
    const b = parseConsumo('Bebidas_'+MES_SUF[i]);
    if(c) D.mensal.com[i+1] = c;
    if(b) D.mensal.beb[i+1] = b;
  }
  D.acumulado.com = parseConsumo('Acumulado - Comidas');
  D.acumulado.beb = parseConsumo('Acumulado Bebidas');
  const mesesComDados = Object.keys(D.mensal.com).map(Number);
  D.meta.mesesComDados = mesesComDados.sort((a2b,b2)=>a2b-b2);
  if(!D.meta.mes && mesesComDados.length) D.meta.mes = Math.max.apply(null, mesesComDados);

  /* --- DADOS DIVERSOS --- */
  const gd = shGrid(wb, 'DADOS DIVERSOS');
  if(gd){
    const hd = findCell(gd, v => trimU(v) === D.hoteis[0], 4);
    if(hd){
      const hdRow = gd[hd.r];
      const hotCols = [];
      for(let c = hd.c; c < hdRow.length; c++){
        const v = trimU(hdRow[c]);
        if(!v) break;
        hotCols.push({h:v, c});
      }
      const QUERO = { 'PA':'pa','COUVERTS':'couverts','DORMIDAS':'dormidas',
        'CONSUMOS INTERNOS COMIDAS':'ciCom','CONSUMOS INTERNOS BEBIDAS':'ciBeb',
        'REFEITÓRIO COMIDAS':'refCom','REFEITÓRIO BEBIDAS':'refBeb',
        'RECEITAS COMIDAS':'recCom','RECEITAS BEBIDAS (TOTAL)':'recBeb' };
      for(let r = hd.r+1; r < gd.length; r++){
        const lbl = trimU((gd[r]||[])[0]);
        const key = QUERO[lbl];
        if(!key || D.diversos[key]) continue;
        const vals = {};
        hotCols.forEach(x => vals[x.h] = n((gd[r]||[])[x.c]));
        D.diversos[key] = vals;
      }
    }
  } else avisos.push('Aba DADOS DIVERSOS não encontrada.');

  /* --- Comentários Hotel ---
     A aba está organizada em blocos repetidos de 2 meses:
       HOTEL | JANEIRO | FEVEREIRO ... HOTEL | MARÇO | ABRIL ... etc.
     Cada linha "HOTEL" abre um novo bloco com os meses das colunas seguintes.
     Alguns hotéis aparecem com nomes antigos — normalizamos para os nomes canónicos. */
  const gc = shGrid(wb, 'Comentários Hotel');
  if(gc){
    const canonico = (nome) => {
      const up = String(nome).toUpperCase().trim();
      const hit = D.hoteis.find(x => x.toUpperCase() === up);
      if(hit) return hit;
      const hitCol = D.hoteis.find(x => x.toUpperCase() === 'COLLECTION ' + up);
      if(hitCol) return hitCol;
      return nome;
    };
    let mesCols = null, hCol = 0;
    for(let r = 0; r < gc.length; r++){
      const row = gc[r] || [];
      const iHot = row.findIndex(v => trimU(v) === 'HOTEL');
      if(iHot >= 0){
        hCol = iHot;
        mesCols = [];
        for(let c = iHot+1; c < row.length; c++){
          const v = trimU(row[c]);
          if(v) mesCols.push({mes:String(v).toUpperCase(), c});
        }
        continue;
      }
      if(!mesCols) continue;
      const h = trimU(row[hCol]);
      if(!h) continue;
      const hc2 = canonico(h);
      if(!D.comentarios[hc2]) D.comentarios[hc2] = {};
      mesCols.forEach(x => {
        const t = trimU(row[x.c]);
        if(t) D.comentarios[hc2][x.mes] = String(t);
      });
    }
  }

  /* --- Tipologias (abas de segmento) --- */
  const canon = (nome) => {
    const up = String(nome).toUpperCase().trim();
    if(D.hoteis.indexOf(up) >= 0) return up;
    const c = D.hoteis.find(x => x === 'COLLECTION ' + up);
    return c || up;
  };
  const TIP_SHEETS = [
    ['Resumo 4 Estrelas - AI','4★ AI'],
    ['Resumo 4 Estrelas - Resorts','4★ Resorts'],
    ['Resumo - 4 Estrelas - Especiais','4★ Especiais'],
    ['Resumo - 4 Estrelas - Cidade','4★ Cidade'],
    ['Resumo - Collection e Sintra','Collection']
  ];
  D.tipologias = {};
  TIP_SHEETS.forEach(([sheet, nome]) => {
    const g = shGrid(wb, sheet);
    if(!g) return;
    const a3 = findCell(g, v => trimU(v) === 'CUSTO COMIDAS/COUVERT', 8);
    if(!a3) return;
    const hs = [];
    const row = g[a3.r];
    for(let c = a3.c+1; c < row.length; c++){
      const v = trimU(row[c]);
      if(!v || String(v).indexOf('MÉDIA') === 0) break;
      hs.push(canon(v));
    }
    if(hs.length) D.tipologias[nome] = hs;
  });

  /* --- Detalhe de consumo (Família / Sub-família / Grupo) --- */
  D.detalhe = null;
  const gdt = shGrid(wb, 'Detalhe de consumo');
  if(gdt){
    const fa = findCell(gdt, v => trimU(v) === 'FAMILIA', 8);
    if(fa){
      const hotRow = gdt[fa.r-1] || [];
      const blocos = [];
      for(let c = 0; c < hotRow.length; c++) if(trimU(hotRow[c])) blocos.push({h:trimU(hotRow[c]), c});
      const linhas = [];
      let famAtual = null, subAtual = null;
      for(let r = fa.r+1; r < gdt.length; r++){
        const row = gdt[r] || [];
        const fam = trimU(row[fa.c]), sub = trimU(row[fa.c+1]), grp = trimU(row[fa.c+2]);
        if(typeof grp !== 'string' || !grp) continue;
        if(typeof fam === 'string' && fam) famAtual = fam;
        if(typeof sub === 'string' && sub) subAtual = sub;
        const vals = {};
        blocos.forEach(b => { vals[b.h] = [n(row[b.c]), n(row[b.c+1]), n(row[b.c+2]), n(row[b.c+3])]; });
        linhas.push({fam:famAtual, sub:subAtual, grupo:grp, vals});
      }
      if(linhas.length) D.detalhe = { linhas };
    }
  }

  /* --- Inventários e compras por artigo --- */
  const lerMatrizArtigos = (sheet) => {
    const g = shGrid(wb, sheet);
    if(!g) return null;
    const hd = findCell(g, v => trimU(v) === D.hoteis[0], 4);
    if(!hd) return null;
    const hdRow = g[hd.r];
    const cols = [];
    for(let c = hd.c; c < hdRow.length; c++){ const v = trimU(hdRow[c]); if(!v) break; cols.push({h:v, c}); }
    const out = {};
    for(let r = hd.r+1; r < g.length; r++){
      const lbl = trimU((g[r]||[])[0]);
      if(!lbl || typeof lbl !== 'string') continue;
      if(String(lbl).toLowerCase().indexOf('total') === 0) continue;
      out[lbl] = {};
      cols.forEach(x => out[lbl][x.h] = n((g[r]||[])[x.c]));
    }
    return out;
  };
  D.artStock = {
    ini: lerMatrizArtigos('INVENTÁRIO INICIAL'),
    compras: lerMatrizArtigos('COMPRAS'),
    fim: lerMatrizArtigos('INVENTÁRIO FINAL')
  };

  /* --- DADOS DIVERSOS completo (valores do MÊS corrente do ficheiro) + conferências --- */
  D.diversosAll = [];
  D.conferencias = {};
  if(gd){
    const hd2 = findCell(gd, v => trimU(v) === D.hoteis[0], 4);
    if(hd2){
      const hdRow2 = gd[hd2.r];
      const cols2 = [];
      for(let c = hd2.c; c < hdRow2.length; c++){ const v = trimU(hdRow2[c]); if(!v) break; cols2.push({h:v, c}); }
      const ler = (row) => { const vals = {}; cols2.forEach(x => vals[x.h] = n(row[x.c])); return vals; };
      for(let r = hd2.r+1; r < gd.length; r++){
        const row = gd[r] || [];
        const lbl = trimU(row[0]);
        if(!lbl || typeof lbl !== 'string') continue;
        D.diversosAll.push({label:lbl, vals:ler(row)});
        if(lbl.indexOf('CONFERENCIA') === 0){
          const rowPl = gd[r+1] || [], rowDif = gd[r+2] || [];
          const key = lbl.indexOf('COMPRAS COMIDAS')>=0 ? 'comprasCom' : lbl.indexOf('COMPRAS BEBIDAS')>=0 ? 'comprasBeb'
                    : lbl.indexOf('RECEITAS COMIDAS')>=0 ? 'recCom' : lbl.indexOf('RECEITAS BEBIDAS')>=0 ? 'recBeb' : null;
          if(key) D.conferencias[key] = { fich:ler(row), pl:ler(rowPl), dif:ler(rowDif) };
        }
      }
    }
  }

  D.meta.avisos = avisos;
  return D;
}
/*PARSER-END*/
/*BN-PARSER-START*/
function parseOcupacao(wb){
  const MN = {jan:1,fev:2,mar:3,abr:4,mai:5,jun:6,jul:7,ago:8,set:9,out:10,nov:11,dez:12};
  const parseSheet = (sheetName) => {
    const ws = wb.Sheets[sheetName];
    if(!ws) return null;
    const g = XLSX.utils.sheet_to_json(ws, {header:1, raw:true, defval:null});
    let hi = -1;
    for(let r=0;r<Math.min(g.length,20);r++){
      const row = (g[r]||[]).map(v => typeof v==='string'?v.trim().toUpperCase():v);
      if(row.indexOf('HOTEL') >= 0){ hi = r; break; }
    }
    if(hi < 0) return null;
    const hdr = g[hi];
    let anocol = -1;
    for(let c=0;c<hdr.length;c++) if(typeof hdr[c]==='string' && hdr[c].trim().toUpperCase()==='ANO'){ anocol = c; break; }
    const mescol = {};
    hdr.forEach((v,c) => { if(typeof v==='string'){ const k = v.trim().toLowerCase().slice(0,3); if(MN[k]) mescol[c] = MN[k]; } });
    const out = {}; let cur = null;
    for(let r=hi+1;r<g.length;r++){
      const row = g[r]||[];
      const h = (typeof row[0]==='string' && row[0].trim()) ? row[0].trim() : null;
      if(h) cur = h;
      if(cur === null || anocol < 0) continue;
      const av = row[anocol];
      if(typeof av !== 'number' || av < 2020 || av > 2035) continue;
      const ano = Math.round(av);
      out[cur] = out[cur] || {};
      out[cur][ano] = {};
      Object.keys(mescol).forEach(c => { const v = row[c]; out[cur][ano][mescol[c]] = (typeof v==='number' && isFinite(v)) ? v : 0; });
    }
    return out;
  };
  const names = wb.SheetNames;
  const total = parseSheet(names[0]);
  if(!total) throw new Error('Não foi encontrada a tabela de roomnights (cabeçalho HOTEL/ANO/meses) na primeira aba.');
  const ind = names[1] ? parseSheet(names[1]) : null;
  const grp = names[2] ? parseSheet(names[2]) : null;
  const drhp = names[3] ? parseSheet(names[3]) : null;
  const anos = [...new Set(Object.values(total).flatMap(o => Object.keys(o).map(Number)))].sort((a,b)=>a-b);
  return { total, ind, grp, drhp, anos, hoteis: Object.keys(total), geradoEm: new Date().toISOString() };
}
/*BN-PARSER-END*/
/*QTD-PARSER-START*/
/* Parser da aba "Pivot livre" do ficheiro de quantidades.
   Deteta automaticamente dois formatos:
   (A) SEM tipo (antigo): linhas de artigo com uma única quantidade agregada.
   (B) COM tipo (novo): blocos por TIPO (COMPRA / INVENTARIO / TRANSFERENCIA ENTRADA/SAIDA),
       cada um com os seus artigos. Nesse caso calcula o CONSUMO real por balanço de stock:
       consumo[m] = compras + transf.entrada + transf.saída(neg) − (inv[m] − inv[m−1]).
   Saída comum: { ano, hoteis, meses, artigos:{ART:{HOTEL:{mes:qtd}}}, unidades, nArtigos, formato }
   No formato COM tipo acrescenta ainda: inventario (nível de stock fim de mês) e tipos (movimentos crus). */
const QTD_TIPOS = ['COMPRA','INVENTARIO','TRANSFERENCIA ENTRADA','TRANSFERENCIA SAIDA'];
function _qtdEhTipo(s){ return QTD_TIPOS.indexOf(String(s).trim().toUpperCase()) >= 0; }
function _qtdLerCabecalho(g){
  /* ID_ANO */
  let ano = null;
  for(let r=0;r<Math.min(g.length,10);r++){
    const row = g[r]||[];
    for(let c=0;c<row.length;c++){
      if(typeof row[c]==='string' && row[c].trim().toUpperCase()==='ID_ANO'){
        const v = row[c+1];
        if(typeof v==='number') ano = Math.round(v);
        else { const m=/(\d{4})/.exec(String(v||'')); if(m) ano=+m[1]; }
      }
    }
    if(ano) break;
  }
  if(!ano) throw new Error('Não encontrei o ID_ANO na Pivot livre.');
  /* linha de meses e de hotéis */
  let rMes = -1;
  for(let r=0;r<Math.min(g.length,25);r++){
    const row = g[r]||[];
    const first = (row[0]!=null?String(row[0]).trim().toLowerCase():'');
    const nums = row.slice(1).filter(v => typeof v==='number' && v>=1 && v<=12).length;
    if((first==='artigos' || first==='') && nums >= 6){ rMes = r; break; }
  }
  if(rMes < 1) throw new Error('Não encontrei a linha de meses na Pivot livre.');
  const rowHot = g[rMes-1]||[], rowMes = g[rMes]||[];
  const colmap = {}; let curH = null;
  for(let c=1;c<rowHot.length;c++){
    const h = rowHot[c];
    if(h!=null && String(h).trim()!==''){
      if(/total/i.test(String(h))){ curH=null; continue; }
      curH = String(h).trim();
    }
    const m = rowMes[c];
    if(curH && typeof m==='number' && m>=1 && m<=12) colmap[c] = { h:curH, m:Math.round(m) };
  }
  return { ano, rMes, colmap };
}
function parseQuantidades(wb){
  const sheetName = wb.SheetNames.find(n => /pivot\s*livre/i.test(n)) || wb.SheetNames[0];
  const g = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {header:1, raw:true, defval:null});
  const { ano, rMes, colmap } = _qtdLerCabecalho(g);
  const hoteis = [...new Set(Object.values(colmap).map(x=>x.h))];
  const meses = [...new Set(Object.values(colmap).map(x=>x.m))].sort((a,b)=>a-b);
  const UNRE = /\b(KG|GR|LT|ML|CX|UND|UN|DOSE|PACK|L|DL|CL)\b/;
  const unidade = art => { const um = UNRE.exec(String(art).toUpperCase()); return um ? um[1] : ''; };

  /* detetar formato: existe um bloco de TIPO logo abaixo da linha de meses? */
  let comTipo = false;
  for(let r=rMes+1;r<Math.min(g.length,rMes+8);r++){
    const v=(g[r]||[])[0]; if(v && _qtdEhTipo(v)){ comTipo = true; break; }
  }

  if(!comTipo){
    /* ---- formato antigo: quantidade agregada por artigo ---- */
    const artigos = {}, unidades = {};
    for(let r=rMes+1;r<g.length;r++){
      const row = g[r]||[]; const nome = row[0];
      if(nome==null || String(nome).trim()==='' || /total/i.test(String(nome))) continue;
      const art = String(nome).trim();
      let tem = false; const porHotel = {};
      Object.keys(colmap).forEach(c => {
        const v = row[c];
        if(typeof v==='number' && v!==0){ const {h,m}=colmap[c]; porHotel[h]=porHotel[h]||{}; porHotel[h][m]=(porHotel[h][m]||0)+v; tem=true; }
      });
      if(tem){ artigos[art]=porHotel; unidades[art]=unidade(art); }
    }
    return { ano, hoteis, meses, artigos, unidades, nArtigos:Object.keys(artigos).length, formato:'simples' };
  }

  /* ---- formato com TIPO: ler blocos e calcular consumo por balanço ---- */
  const linhasTipo = [];
  for(let r=rMes+1;r<g.length;r++){ const v=(g[r]||[])[0]; if(v && _qtdEhTipo(v)) linhasTipo.push([r, String(v).trim().toUpperCase()]); }
  const blocos = linhasTipo.map((lt,idx)=>({ tipo:lt[1], ini:lt[0], fim: idx+1<linhasTipo.length?linhasTipo[idx+1][0]:g.length }));

  const dados = {}; QTD_TIPOS.forEach(t=>dados[t]={});
  const unidades = {}; const artigosSet = new Set();
  blocos.forEach(b=>{
    if(!dados[b.tipo]) return;
    for(let r=b.ini+1;r<b.fim;r++){
      const row=g[r]||[]; const nome=row[0];
      if(nome==null || String(nome).trim()==='' || _qtdEhTipo(nome) || /total\s*geral|^total$/i.test(String(nome).trim())) continue;
      const art=String(nome).trim();
      let tem=false; const porHotel={};
      Object.keys(colmap).forEach(c=>{
        const v=row[c];
        if(typeof v==='number' && v!==0){ const {h,m}=colmap[c]; porHotel[h]=porHotel[h]||{}; porHotel[h][m]=(porHotel[h][m]||0)+v; tem=true; }
      });
      if(tem){ dados[b.tipo][art]=porHotel; artigosSet.add(art); if(!(art in unidades)) unidades[art]=unidade(art); }
    }
  });

  /* consumo por balanço de stock */
  const consumo = {};
  artigosSet.forEach(art=>{
    consumo[art]={};
    hoteis.forEach(h=>{
      const comp=(dados['COMPRA'][art]||{})[h]||{};
      const inv =(dados['INVENTARIO'][art]||{})[h]||{};
      const tent=(dados['TRANSFERENCIA ENTRADA'][art]||{})[h]||{};
      const tsai=(dados['TRANSFERENCIA SAIDA'][art]||{})[h]||{};
      let invAnt=0; const serie={};
      meses.forEach(m=>{
        const ent=(comp[m]||0)+(tent[m]||0)+(tsai[m]||0);   /* tsai já vem negativo */
        const invM=(m in inv)?inv[m]:invAnt;
        const cons=ent-(invM-invAnt);
        if(Math.abs(cons)>0.0001) serie[m]=cons;
        invAnt=invM;
      });
      if(Object.keys(serie).length) consumo[art][h]=serie;
    });
    if(!Object.keys(consumo[art]).length) delete consumo[art];
  });

  return {
    ano, hoteis, meses,
    artigos: consumo,               /* "artigos" = consumo real calculado (compatível com o resto) */
    inventario: dados['INVENTARIO'],/* nível de stock fim de mês, por artigo/hotel */
    tipos: dados,                   /* movimentos crus por tipo */
    unidades,
    nArtigos: artigosSet.size,
    formato:'tipo'
  };
}
/*QTD-PARSER-END*/



/* =====================================================================
   IndexedDB — cache local do dataset
===================================================================== */
function idbOpen(){
  return new Promise((res, rej) => {
    const rq = indexedDB.open('vgcab', 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore('kv');
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  });
}
async function idbSet(k, v){
  try{ const db = await idbOpen();
    await new Promise((res,rej)=>{ const tx = db.transaction('kv','readwrite'); tx.objectStore('kv').put(v,k); tx.oncomplete=res; tx.onerror=()=>rej(tx.error); });
  }catch(e){}
}
async function idbGet(k){
  try{ const db = await idbOpen();
    return await new Promise((res,rej)=>{ const rq = db.transaction('kv').objectStore('kv').get(k); rq.onsuccess=()=>res(rq.result); rq.onerror=()=>rej(rq.error); });
  }catch(e){ return null; }
}

/* =====================================================================
   Carregamento de ficheiro + publicação partilhada
===================================================================== */
function prog(msg, cls){
  const p = $('loadProg');
  p.innerHTML += '<div class="'+(cls||'')+'">'+esc(msg)+'</div>';
  p.scrollTop = p.scrollHeight;
}
async function handleFile(file){
  if(!file) return;
  await ensureXLSX35();
  $('loadProg').innerHTML = '';
  prog('A ler '+file.name+' ('+(file.size/1024/1024).toFixed(1)+' MB)…');
  try{
    if(typeof XLSX === 'undefined') throw new Error('Biblioteca SheetJS não carregou (verificar acesso à internet/CDN).');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type:'array' });
    prog('Ficheiro aberto · '+wb.SheetNames.length+' abas. A interpretar…');
    const D = parseWorkbook(wb, file.name);
    DATA = D;
    prog('✔ '+D.hoteis.length+' hotéis · meses com dados: '+D.meta.mesesComDados.join(', '), 'ok');
    (D.meta.avisos||[]).forEach(a => prog('⚠ '+a, 'warn'));
    selectedAno = D.meta.ano;
    if(ANOS.indexOf(selectedAno) < 0){ ANOS.push(selectedAno); ANOS.sort((a,b)=>b-a); }
    buildAnoSel();
    await idbSet('dataset_'+selectedAno, D);
    $('btnPublicar').disabled = false;
    buildRegBtns();
    buildTipBtns();
    updateMeta();
    renderAll();
    toast('Dados carregados localmente. Publica para partilhar com todos.');
  }catch(e){
    prog('✖ Erro: '+(e && e.message || e), 'bad');
  }
}
['dropBn','fileBn','handleFileBn','dropHist','fileHist','handleFileHist'];
[['dropBn','handleFileBn'],['dropHist','handleFileHist'],['dropQtd','handleFileQtd']].forEach(([id, fn]) => {
  const el = window.AB35Root.getElementById(id);
  if(!el) return;
  ['dragover','dragenter'].forEach(ev => el.addEventListener(ev, e => { e.preventDefault(); el.classList.add('over'); }));
  ['dragleave','drop'].forEach(ev => el.addEventListener(ev, e => { e.preventDefault(); el.classList.remove('over'); }));
  el.addEventListener('drop', e => window[fn](e.dataTransfer.files[0]));
});
const dz = window.AB35Root.getElementById('dropZone');
if(dz){
  ['dragover','dragenter'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('over'); }));
  ['dragleave','drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('over'); }));
  dz.addEventListener('drop', e => handleFile(e.dataTransfer.files[0]));
}

/* lazy-load do fflate (só para inflar entradas individuais do ZIP) */
let _fflatePromise = null;
function carregarFflate(){
  if(window.fflate) return Promise.resolve();
  if(_fflatePromise) return _fflatePromise;
  const fontes = [
    'https://cdnjs.cloudflare.com/ajax/libs/fflate/0.8.2/umd/index.js',
    'https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js',
    'https://unpkg.com/fflate@0.8.2/umd/index.js'
  ];
  _fflatePromise = new Promise((resolve, reject) => {
    let i = 0;
    const tenta = () => {
      if(window.fflate) return resolve();
      if(i >= fontes.length) return reject(new Error('Não foi possível carregar o descompactador (fflate). Verifica a ligação à internet.'));
      const s = document.createElement('script');
      s.src = fontes[i++];
      s.onload = () => (window.fflate ? resolve() : tenta());
      s.onerror = () => tenta();
      document.head.appendChild(s);
    };
    tenta();
  });
  return _fflatePromise;
}
/* Extrai de um .xlsx APENAS as folhas e ficheiros de estrutura, descomprimindo fisicamente
   só essas entradas e ignorando a pivotCache (que pode ter GBs). Lê o índice do ZIP à mão.
   Devolve um workbook do SheetJS. Robusto para ficheiros gigantes que rebentariam a memória. */
async function lerXlsxSemPivotCache(arrayBuffer){
  await carregarFflate();
  const buf = new Uint8Array(arrayBuffer);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  /* End Of Central Directory (assinatura PK\\x05\\x06), procurada a partir do fim */
  let eocd = -1;
  for(let i = buf.length - 22; i >= 0 && i > buf.length - 22 - 65536; i--){
    if(dv.getUint32(i, true) === 0x06054b50){ eocd = i; break; }
  }
  if(eocd < 0) throw new Error('Ficheiro .xlsx inválido (sem índice ZIP).');
  const cdOffset = dv.getUint32(eocd + 16, true);
  const cdCount = dv.getUint16(eocd + 10, true);

  /* que entradas manter: folhas, estrutura e strings — tudo menos a pivotCache/pivotTable */
  const querer = n =>
    /worksheets\/sheet\d+\.xml$/.test(n) ||
    /^xl\/worksheets\/_rels\//.test(n) ||
    n === 'xl/workbook.xml' || n === 'xl/_rels/workbook.xml.rels' ||
    n === '[Content_Types].xml' || n === 'xl/sharedStrings.xml' ||
    n === 'xl/styles.xml' || n === 'xl/theme/theme1.xml' ||
    /^_rels\//.test(n);

  /* percorrer o Central Directory */
  let p = cdOffset; const wanted = {};
  for(let e = 0; e < cdCount; e++){
    if(dv.getUint32(p, true) !== 0x02014b50) break;
    const comp = dv.getUint16(p + 10, true);
    const compSize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const localOffset = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nameLen));
    if(querer(name)) wanted[name] = { comp, compSize, localOffset };
    p += 46 + nameLen + extraLen + commentLen;
  }

  /* descomprimir só as entradas escolhidas, lendo cada local header para o início dos dados */
  const out = {};
  for(const name in wanted){
    const w = wanted[name];
    const lh = w.localOffset;
    if(dv.getUint32(lh, true) !== 0x04034b50) continue;
    const nLen = dv.getUint16(lh + 26, true), xLen = dv.getUint16(lh + 28, true);
    const dataStart = lh + 30 + nLen + xLen;
    const raw = buf.subarray(dataStart, dataStart + w.compSize);
    out[name] = (w.comp === 0) ? raw : window.fflate.inflateSync(raw);
  }
  const rez = window.fflate.zipSync(out, { level: 0 });
  return XLSX.read(rez, { type: 'array' });
}
async function handleFileQtd(file){
  if(!file) return;
  await ensureXLSX35();
  $('qtdProg').innerHTML = '';
  const p = (m,c)=>{ $('qtdProg').innerHTML += '<div class="'+(c||'')+'">'+esc(m)+'</div>'; };
  p('A ler '+file.name+'…');
  try{
    const ab = await file.arrayBuffer();
    const mb = ab.byteLength/1024/1024;
    let wb;
    if(mb > 12){
      /* ficheiros grandes trazem uma pivot cache que pode ter GBs descomprimidos e
         rebentaria a memória. Extraímos cirurgicamente só as folhas, ignorando a cache. */
      p('Ficheiro grande ('+mb.toFixed(0)+' MB) — a extrair só as folhas (a ignorar a cache das tabelas dinâmicas)…');
      wb = await lerXlsxSemPivotCache(ab);
      p('Folhas extraídas sem a cache pesada.', 'ok');
    } else {
      wb = XLSX.read(new Uint8Array(ab), {type:'array'});
    }
    const Q = parseQuantidades(wb);
    QTD = Q;
    p('✔ Ano '+Q.ano+' · '+Q.hoteis.length+' hotéis · '+Q.nArtigos+' artigos · meses '+Q.meses.join(','), 'ok');
    if(Q.formato === 'tipo') p('✔ Formato com TIPO detetado: consumo calculado por balanço de stock; excessos de stock disponíveis.', 'ok');
    else p('Formato simples (sem TIPO): consumo aproximado. Para consumo real e excessos de stock, exporta com o campo TIPO nas linhas.', '');
    if(QTD_ANOS.indexOf(Q.ano) < 0){ QTD_ANOS.push(Q.ano); QTD_ANOS.sort((a,b)=>b-a); }
    await idbSet('qtd_'+Q.ano, Q);
    $('btnPubQtd').disabled = false;
    renderAll();
    toast('Quantidades de '+Q.ano+' carregadas. Publica para partilhar.');
  }catch(e){ p('✖ '+(e&&e.message||e), 'bad'); }
}
async function publicarQtd(){
  if(!QTD){ toast('Sem quantidades.'); return; }
  const b = $('btnPubQtd'); b.disabled = true;
  const ano = QTD.ano;
  try{
    /* guardar em pedaços por dimensão para caber nos limites do Blobs */
    const arts = Object.keys(QTD.artigos);
    const CH = 800;   // artigos por pedaço
    const nCh = Math.ceil(arts.length / CH);
    for(let i=0;i<nCh;i++){
      const slice = {};
      arts.slice(i*CH, (i+1)*CH).forEach(a => slice[a] = QTD.artigos[a]);
      await apiRetry('set', 'qtd_'+ano+'_art_'+i, slice);
    }
    /* inventário (nível de stock) em pedaços, só no formato com tipo */
    let nInv = 0;
    if(QTD.formato === 'tipo' && QTD.inventario){
      const invArts = Object.keys(QTD.inventario);
      nInv = Math.ceil(invArts.length / CH);
      for(let i=0;i<nInv;i++){
        const slice = {};
        invArts.slice(i*CH, (i+1)*CH).forEach(a => slice[a] = QTD.inventario[a]);
        await apiRetry('set', 'qtd_'+ano+'_inv_'+i, slice);
      }
    }
    await apiRetry('set', 'qtd_idx_'+ano, { ano, hoteis:QTD.hoteis, meses:QTD.meses, unidades:QTD.unidades, nCh, nInv, formato:QTD.formato||'simples', ts:new Date().toISOString(), by:CURRENT_USER.login });
    const anos = (await apiRetry('get','qtd_anos', null, 2).catch(()=>null)) || [];
    if(anos.indexOf(ano) < 0){ anos.push(ano); anos.sort((a,b)=>b-a); await apiRetry('set','qtd_anos', anos); }
    QTD_ANOS = anos;
    $('qtdProg').innerHTML += '<div class="ok">✔ Quantidades de '+ano+' publicadas ('+nCh+' pedaços).</div>';
    audit('publicar_qtd', 'ano '+ano+' · '+QTD.nArtigos+' artigos');
    toast('Quantidades de '+ano+' publicadas ☁');
  }catch(e){ $('qtdProg').innerHTML += '<div class="bad">✖ '+(e&&e.message||e)+'</div>'; }
  finally{ b.disabled = false; }
}
async function handleFileBn(file){
  if(!file) return;
  await ensureXLSX35();
  $('bnProg').innerHTML = '';
  const p = (m,c)=>{ $('bnProg').innerHTML += '<div class="'+(c||'')+'">'+esc(m)+'</div>'; };
  p('A ler '+file.name+'…');
  try{
    const wb = XLSX.read(await file.arrayBuffer(), {type:'array'});
    const O = parseOcupacao(wb);
    ROOMNIGHTS = O;
    p('✔ '+O.hoteis.length+' hotéis · anos: '+O.anos.join(', '), 'ok');
    await idbSet('roomnights', O);
    $('btnPubBn').disabled = false;
    renderAll();
    toast('Roomnights carregadas localmente. Publica para partilhar.');
  }catch(e){ p('✖ '+(e&&e.message||e), 'bad'); }
}
async function publicarRoomnights(){
  if(!ROOMNIGHTS){ toast('Sem roomnights.'); return; }
  const b = $('btnPubBn'); b.disabled = true;
  try{
    await apiRetry('set', 'roomnights', ROOMNIGHTS);
    $('bnProg').innerHTML += '<div class="ok">✔ Roomnights publicadas para todos.</div>';
    audit('publicar_bn', 'anos '+ROOMNIGHTS.anos.join(','));
    toast('Roomnights publicadas ☁');
  }catch(e){ $('bnProg').innerHTML += '<div class="bad">✖ '+(e&&e.message||e)+'</div>'; }
  finally{ b.disabled = false; }
}
async function handleFileHist(file){
  if(!file) return;
  await ensureXLSX35();
  $('histProg').innerHTML = '';
  const p = (m,c)=>{ $('histProg').innerHTML += '<div class="'+(c||'')+'">'+esc(m)+'</div>'; };
  p('A ler '+file.name+'…');
  try{
    const wb = XLSX.read(await file.arrayBuffer(), {type:'array'});
    const H = parseWorkbook(wb, file.name);
    DATA_HIST = H;
    p('✔ Ano '+H.meta.ano+' · '+H.meta.mesesComDados.length+' meses · '+H.hoteis.length+' hotéis', 'ok');
    await idbSet('hist', H);
    $('btnPubHist').disabled = false;
    renderAll();
    toast('Histórico carregado. Publica para partilhar.');
  }catch(e){ p('✖ '+(e&&e.message||e), 'bad'); }
}
async function publicarHist(){
  if(!DATA_HIST){ toast('Sem histórico.'); return; }
  const b = $('btnPubHist'); b.disabled = true;
  try{
    const ano = DATA_HIST.meta.ano;
    /* guardar em pedaços próprios (histórico usa só consumo por artigo, mas guardamos tudo) */
    const chunks = buildChunks(DATA_HIST);
    for(const k of Object.keys(chunks)) await apiRetry('set', 'hist_'+ano+'_'+k, chunks[k]);
    await apiRetry('set', 'hist_idx', { ano, chunkKeys:Object.keys(chunks), ts:new Date().toISOString() });
    $('histProg').innerHTML += '<div class="ok">✔ Histórico de '+ano+' publicado.</div>';
    audit('publicar_hist', 'ano '+ano);
    toast('Histórico publicado ☁');
  }catch(e){ $('histProg').innerHTML += '<div class="bad">✖ '+(e&&e.message||e)+'</div>'; }
  finally{ b.disabled = false; }
}

function buildChunks(D){
  const chunks = {};
  chunks['core'] = { meta:D.meta, hoteis:D.hoteis, resumo:D.resumo, total:D.total, comparativo:D.comparativo,
                     raciosMensais:D.raciosMensais, resumoGeral:D.resumoGeral, diversos:D.diversos, comentarios:D.comentarios,
                     tipologias:D.tipologias, diversosAll:D.diversosAll, conferencias:D.conferencias };
  if(D.detalhe) chunks['detalhe'] = D.detalhe;
  if(D.artStock && D.artStock.ini) chunks['artstock'] = D.artStock;
  if(D.acumulado.com) chunks['acu_com'] = D.acumulado.com;
  if(D.acumulado.beb) chunks['acu_beb'] = D.acumulado.beb;
  Object.keys(D.mensal.com).forEach(m => chunks['m_com_'+m] = D.mensal.com[m]);
  Object.keys(D.mensal.beb).forEach(m => chunks['m_beb_'+m] = D.mensal.beb[m]);
  return chunks;
}
async function publicarDados(){
  if(!DATA){ toast('Sem dados para publicar.'); return; }
  const btn = $('btnPublicar'); btn.disabled = true;
  const ano = DATA.meta.ano;
  try{
    prog('Ano detetado: '+ano+' — a publicação substitui integralmente os dados de '+ano+' e preserva os restantes anos.');
    const oldIdx = await apiRetry('get', 'idx_'+ano, null, 2).catch(()=>null);
    const chunks = buildChunks(DATA);
    const keys = Object.keys(chunks);
    prog('A publicar '+keys.length+' pedaços…');
    let done = 0;
    for(const k of keys){
      await apiRetry('set', 'chunk_'+ano+'_'+k, chunks[k]);
      done++;
      if(done % 5 === 0 || done === keys.length) prog('  · '+done+'/'+keys.length);
    }
    await apiRetry('set', 'idx_'+ano, { ts:new Date().toISOString(), by:CURRENT_USER.login, meta:DATA.meta, chunkKeys:keys });
    /* registar o ano no índice-mestre */
    const anos = (await apiRetry('get','anos', null, 2).catch(()=>null)) || [];
    if(anos.indexOf(ano) < 0){ anos.push(ano); anos.sort((a,b)=>b-a); await apiRetry('set','anos', anos); }
    ANOS = anos;
    /* limpar pedaços órfãos da publicação anterior deste ano */
    if(oldIdx && Array.isArray(oldIdx.chunkKeys)){
      const orfaos = oldIdx.chunkKeys.filter(k => keys.indexOf(k) < 0);
      for(const k of orfaos){ try{ await apiCall('del', 'chunk_'+ano+'_'+k); }catch(e){} }
      if(orfaos.length) prog('  · removidos '+orfaos.length+' pedaços antigos de '+ano);
    }
    selectedAno = ano;
    buildAnoSel();
    prog('✔ Publicação de '+ano+' concluída. Todos os utilizadores passam a ver estes dados.', 'ok');
    $('sbSync').textContent = 'Publicado '+ano+' · '+new Date().toLocaleString('pt-PT');
    audit('publicar', DATA.meta.ficheiro+' · ano '+ano+' · meses '+DATA.meta.mesesComDados.join(','));
    toast('Dados de '+ano+' publicados ☁');
  }catch(e){
    prog('✖ Falha na publicação: '+(e && e.message || e), 'bad');
  }finally{ btn.disabled = false; }
}
function buildAnoSel(){
  const sel = $('anoSel');
  if(!ANOS.length){ sel.style.display = 'none'; return; }
  sel.style.display = '';
  sel.innerHTML = ANOS.map(a => '<option value="'+a+'"'+(a===selectedAno?' selected':'')+'>'+a+'</option>').join('');
}
function mudarAno(){
  selectedAno = +$('anoSel').value;
  recarregarCloud(false);
}
async function recarregarCloud(manual){
  $('sbSync').textContent = 'A sincronizar…';
  try{
    const regs = await apiRetry('get','regioes', null, 2).catch(()=>null);
    REGIOES = Object.assign({}, REGIOES_DEFAULT, regs || {});
    /* anos disponíveis */
    ANOS = (await apiRetry('get','anos', null, 2).catch(()=>null)) || [];
    /* roomnights partilhadas */
    try{ const bn = await apiRetry('get','roomnights', null, 2); if(bn && bn.total) ROOMNIGHTS = bn; }catch(e){}
    /* quantidades (Pivot livre) do ano selecionado */
    try{
      QTD_ANOS = (await apiRetry('get','qtd_anos', null, 2).catch(()=>null)) || [];
      const anoQ = (selectedAno && QTD_ANOS.indexOf(selectedAno)>=0) ? selectedAno : QTD_ANOS[0];
      if(anoQ){
        const qidx = await apiRetry('get','qtd_idx_'+anoQ, null, 2);
        if(qidx && qidx.nCh){
          const artigos = {};
          for(let i=0;i<qidx.nCh;i++){
            const slice = await apiRetry('get','qtd_'+anoQ+'_art_'+i, null, 2).catch(()=>null);
            if(slice) Object.assign(artigos, slice);
          }
          const inventario = {};
          if(qidx.nInv){
            for(let i=0;i<qidx.nInv;i++){
              const slice = await apiRetry('get','qtd_'+anoQ+'_inv_'+i, null, 2).catch(()=>null);
              if(slice) Object.assign(inventario, slice);
            }
          }
          QTD = { ano:anoQ, hoteis:qidx.hoteis||[], meses:qidx.meses||[], unidades:qidx.unidades||{}, artigos, inventario, formato:qidx.formato||'simples', nArtigos:Object.keys(artigos).length };
        }
      }
    }catch(e){}
    /* histórico anual para sazonalidade */
    try{
      const hidx = await apiRetry('get','hist_idx', null, 2);
      if(hidx && hidx.chunkKeys){
        const hr = await fetchChunks(hidx.chunkKeys.map(k => 'hist_'+hidx.ano+'_'+k));
        const c = hr['hist_'+hidx.ano+'_core'] || {};
        const H = { meta:c.meta||{}, hoteis:c.hoteis||[], mensal:{com:{},beb:{}} };
        hidx.chunkKeys.forEach(k => { let mm=/^m_com_(\d+)$/.exec(k); if(mm) H.mensal.com[+mm[1]]=hr['hist_'+hidx.ano+'_'+k]; mm=/^m_beb_(\d+)$/.exec(k); if(mm) H.mensal.beb[+mm[1]]=hr['hist_'+hidx.ano+'_'+k]; });
        DATA_HIST = H;
      }
    }catch(e){}
    let pref = '';
    let idx = null;
    if(ANOS.length){
      if(!selectedAno || ANOS.indexOf(selectedAno) < 0) selectedAno = ANOS[0];
      pref = selectedAno + '_';
      idx = await apiRetry('get','idx_'+selectedAno, null, 2);
    } else {
      /* retrocompatibilidade: publicação antiga sem ano */
      idx = await apiRetry('get','idx', null, 2);
      if(idx && idx.meta && idx.meta.ano){ selectedAno = idx.meta.ano; ANOS = [selectedAno]; }
    }
    buildAnoSel();
    if(idx && idx.chunkKeys && idx.chunkKeys.length){
      const res0 = await fetchChunks(idx.chunkKeys.map(k => 'chunk_'+pref+k));
      const res = {};
      Object.keys(res0).forEach(k => res[k.replace('chunk_'+pref, 'chunk_')] = res0[k]);
      const core = res['chunk_core'] || {};
      const D = { meta:core.meta||{}, hoteis:core.hoteis||[], resumo:core.resumo||{}, total:core.total||{},
                  comparativo:core.comparativo||{}, raciosMensais:core.raciosMensais||{food:{},bev:{}},
                  resumoGeral:core.resumoGeral||{}, diversos:core.diversos||{}, comentarios:core.comentarios||{},
                  tipologias:core.tipologias||{}, diversosAll:core.diversosAll||[], conferencias:core.conferencias||{},
                  detalhe:res['chunk_detalhe']||null, artStock:res['chunk_artstock']||null,
                  mensal:{com:{},beb:{}}, acumulado:{com:res['chunk_acu_com']||null, beb:res['chunk_acu_beb']||null} };
      idx.chunkKeys.forEach(k => {
        let m = /^m_com_(\d+)$/.exec(k); if(m) D.mensal.com[+m[1]] = res['chunk_'+k];
        m = /^m_beb_(\d+)$/.exec(k);     if(m) D.mensal.beb[+m[1]] = res['chunk_'+k];
      });
      DATA = D;
      limparCacheAtivos();
      await idbSet('dataset_'+(selectedAno||'x'), D);
      $('sbSync').textContent = 'Sincronizado '+(selectedAno||'')+' · publicado por '+(idx.by||'?')+' em '+new Date(idx.ts).toLocaleString('pt-PT');
      if(manual) toast('Dados atualizados a partir da publicação.');
    } else {
      const local = await idbGet('dataset_'+(selectedAno||'x'));
      if(local) { DATA = local; $('sbSync').textContent = 'Sem publicação · a usar cache local'; }
      else { DATA = null; $('sbSync').textContent = 'Sem dados publicados'; }
    }
  }catch(e){
    const local = await idbGet('dataset_'+(selectedAno||'x'));
    if(local){ DATA = local; $('sbSync').textContent = 'Offline · cache local'; }
    else $('sbSync').textContent = 'Sem ligação e sem cache';
  }
  vg35RestrictDataset();
  buildRegBtns();
  buildTipBtns();
  updateMeta();
  renderAll();
}
function updateMeta(){
  if(!DATA){ $('tbMeta').textContent = 'Sem dados carregados'; return; }
  const mm = DATA.meta.mesesComDados || [];
  $('tbMeta').innerHTML = '<b>'+esc(DATA.meta.ficheiro||'')+'</b> · dados até <b>'+esc(MESES[(DATA.meta.mes||mm[mm.length-1]||1)-1])+' '+(DATA.meta.ano||'')+'</b> · '+DATA.hoteis.length+' hotéis';
}

/* =====================================================================
   Navegação e filtros de região
===================================================================== */
function setView(v, btn){
  window.AB35Root.querySelectorAll('.view').forEach(x => x.classList.remove('on'));
  const el = $('view-'+v); if(el) el.classList.add('on');
  window.AB35Root.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('on', b === btn || b.dataset.view === v));
  renderView(v);
}
function activeView(){
  const el = window.AB35Root.querySelector('.view.on');
  return el ? el.id.replace('view-','') : 'resumo';
}
function buildRegBtns(){
  const regs = ['Todos', ...REG_LISTA];
  if(DATA && DATA.hoteis.some(h => regiaoDe(h) === REG_OUTROS)) regs.push(REG_OUTROS);
  $('regBtns').innerHTML = regs.map(r =>
    '<button class="reg-btn'+(selectedRegion===r?' on':'')+'" onclick="setRegion(\''+r.replace(/'/g,"\\'")+'\')">'+esc(r)+'</button>').join('');
}
function setRegion(r){
  selectedRegion = r;
  buildRegBtns();
  renderAll();
}
function buildTipBtns(){
  const tips = ['Todas', ...(DATA && DATA.tipologias ? Object.keys(DATA.tipologias) : [])];
  $('tipBtns').innerHTML = tips.map(t =>
    '<button class="reg-btn'+(selectedTip===t?' on':'')+'" onclick="setTip(\''+t.replace(/'/g,"\\'")+'\')">'+esc(t)+'</button>').join('');
}
function setTip(t){
  selectedTip = t;
  buildTipBtns();
  renderAll();
}
function renderAll(){ renderView(activeView()); }
function renderView(v){
  if(!DATA && ['resumo','evolucao','subfam','artigos','hotel','stock','comentarios'].indexOf(v) >= 0){
    const el = $('view-'+v);
    if(el && !el.querySelector('.empty')){ /* mantém estrutura; mostra aviso na primeira panel */ }
  }
  try{
    if(v === 'resumo') renderResumo();
    else if(v === 'evolucao') renderEvolucao(true);
    else if(v === 'subfam') renderSubfam();
    else if(v === 'artigos') { arMesOptions(); arSubfamOptions(); renderArtigos(); }
    else if(v === 'hotel') { ahOptions(); renderHotel(); }
    else if(v === 'invart') { iaOptions(); renderInvArt(); }
    else if(v === 'recbeb') { rbOptions(); renderRecBeb(); }
    else if(v === 'previsao') { pvHotelOptions(); pvSubOptions(); renderPrevisao(); }
    else if(v === 'quantidades') { qtOptions(); renderQuantidades(); }
    else if(v === 'excessos') { exOptions(); renderExcessos(); }
    else if(v === 'encomenda') { enOptions(); renderEncomenda(); }
    else if(v === 'acomp') { acOptions(); renderAcomp(); }
    else if(v === 'roomnights') { rnAnoOptions(); renderRoomnights(); }
    else if(v === 'stock') renderStock();
    else if(v === 'comentarios') { cmOptions(); renderComentarios(); }
    else if(v === 'setup') renderSetup();
  }catch(e){ console.error('renderView', v, e); }
}
function semDados(elId){
  $(elId).innerHTML = '<div class="empty">Ainda não há dados publicados.<br>A Direção de Operações pode carregar o ficheiro Custos_A_B_PT em «Carregar Dados».</div>';
}

/* =====================================================================
   VISTA · Resumo
===================================================================== */
function aggRegiao(hs){
  /* agregado ponderado a partir do comparativo (receitas/compras/consumos em €) */
  const g = { recCom:0, cprCom:0, cnsCom:0, invCom:0, recBeb:0, cprBeb:0, cnsBeb:0, invBeb:0, clientes:0 };
  hs.forEach(h => {
    const c = DATA.comparativo[h]; const r = DATA.resumo[h];
    if(c){
      g.recCom += c.com.receita||0; g.cprCom += c.com.compras||0; g.cnsCom += c.com.consumo||0; g.invCom += c.com.inventario||0;
      g.recBeb += c.beb.receita||0; g.cprBeb += c.beb.compras||0; g.cnsBeb += c.beb.consumo||0; g.invBeb += c.beb.inventario||0;
    }
    if(r) g.clientes += r.clientes||0;
  });
  g.fcCompras = g.recCom ? g.cprCom/g.recCom : null;
  g.fcConsumo = g.recCom ? g.cnsCom/g.recCom : null;
  g.bcCompras = g.recBeb ? g.cprBeb/g.recBeb : null;
  g.bcConsumo = g.recBeb ? g.cnsBeb/g.recBeb : null;
  g.consumoPax = g.clientes ? (g.cnsCom+g.cnsBeb)/g.clientes : null;
  g.pesoStock = (g.cprCom+g.cprBeb) ? (g.invCom+g.invBeb)/(g.cprCom+g.cprBeb) : null;
  return g;
}
function mediaAnual(arr){ return media(arr||[]); }

function rzModo(m){
  rzModoAtual = m;
  $('rzModoConsumo').classList.toggle('on', m==='consumo');
  $('rzModoCompras').classList.toggle('on', m==='compras');
  renderResumo();
}
/* food/beverage cost de um hotel para um mês (das abas mensais) */
function racioMes(h, tp, m){
  const ds = (DATA.mensal[tp==='food'?'com':'beb']||{})[m]; if(!ds) return null;
  const cr = ds.subfams[tp==='food'?'CUSTOS & RECEITAS COMIDAS':'CUSTOS & RECEITAS BEBIDAS'];
  if(!cr) return null;
  const r = cr.artigos[tp==='food'?'Food Cost Consumo':'Beverage cost/consumo'];
  return r && isNum(r[h]) ? r[h] : null;
}
function renderResumo(){
  if(!DATA){ semDados('resumoCards'); $('resumoTbl').innerHTML=''; return; }
  periodoOptions('rzPeriodo');
  const periodo = ($('rzPeriodo') && $('rzPeriodo').value) || 'acu';
  const hs = hoteisAtivos();
  const g = aggRegiao(hs);
  $('resumoSub').textContent = (periodo==='acu' ? 'Acumulado '+(DATA.meta.ano||'')+' até '+MESES[(DATA.meta.mes||1)-1] : MESES[+periodo-1]+' '+(DATA.meta.ano||''))+' · '+hs.length+' hotéis';
  $('resumoRegTag').textContent = selectedRegion;
  $('resumoCards').innerHTML = [
    card('Food cost · consumo', fmtPct(g.fcConsumo), 'Compras: '+fmtPct(g.fcCompras), semClass(g.fcConsumo, LIM_FOOD, VIG_FOOD)),
    card('Beverage cost · consumo', fmtPct(g.bcConsumo), 'Compras: '+fmtPct(g.bcCompras), semClass(g.bcConsumo, LIM_BEV, VIG_BEV)),
    card('Nº clientes', fmtNum(g.clientes), 'Couverts + PA + dormidas', ''),
    card('Consumo / pax', fmtEur(g.consumoPax, 2), 'Comidas + bebidas', ''),
    card('Peso do stock', fmtPct(g.pesoStock), 'Inventário s/ compras', '')
  ].join('');

  const consumo = rzModoAtual === 'consumo';
  const mediaFood2025 = mediaAnual(DATA.raciosMensais.food.media2025);
  const mediaBev2025  = mediaAnual(DATA.raciosMensais.bev.media2025);
  const rlbl = refLbl();
  /* rácios por hotel: acumulado (do resumo) ou do mês escolhido */
  const fcDe = (h) => periodo==='acu' ? (consumo ? (DATA.resumo[h]||{}).fcConsumo : (DATA.resumo[h]||{}).fcCompras) : racioMes(h,'food',+periodo);
  const bcDe = (h) => periodo==='acu' ? (consumo ? (DATA.resumo[h]||{}).bcConsumo : (DATA.resumo[h]||{}).bcCompras) : racioMes(h,'bev',+periodo);
  const ordenados = [...hs].sort((x,y) => ((fcDe(y)??-1) - (fcDe(x)??-1)));
  let html = '<table class="tbl"><thead><tr><th>Hotel</th><th>Food cost '+(consumo?'consumo':'compras')+'</th><th>Δ '+anoRef()+'</th><th>Beverage cost '+(consumo?'consumo':'compras')+'</th><th>Δ '+anoRef()+'</th><th>Nº clientes</th><th>Consumo/pax</th><th>Stock/pax</th><th>Peso stock</th></tr></thead><tbody>';
  ordenados.forEach(h => {
    const r = DATA.resumo[h] || {};
    const fc = fcDe(h);
    const bc = bcDe(h);
    const dF = isNum(fc) && isNum(mediaFood2025) ? fc - mediaFood2025 : null;
    const dB = isNum(bc) && isNum(mediaBev2025) ? bc - mediaBev2025 : null;
    html += '<tr>'
      + '<td class="hname" onclick="irParaHotel(\''+h.replace(/'/g,"\\'")+'\')">'+esc(h)+'<span class="reg-tag">'+esc(regiaoDe(h))+'</span></td>'
      + '<td><span class="sem '+semClass(fc, LIM_FOOD, VIG_FOOD)+'">'+fmtPct(fc)+'</span></td>'
      + '<td>'+delta(dF)+'</td>'
      + '<td><span class="sem '+semClass(bc, LIM_BEV, VIG_BEV)+'">'+fmtPct(bc)+'</span></td>'
      + '<td>'+delta(dB)+'</td>'
      + '<td>'+fmtNum(r.clientes)+'</td>'
      + '<td>'+fmtEur(r.consumoPax,2)+'</td>'
      + '<td>'+fmtEur(r.stockPax,2)+'</td>'
      + '<td>'+fmtPct(r.pesoStock)+'</td>'
      + '</tr>';
  });
  const tot = selectedRegion === 'Todos' ? DATA.total : null;
  const gg = tot || g;
  html += '<tr class="total"><td>'+(tot ? 'TOTAL PT' : 'TOTAL '+esc(selectedRegion))+'</td>'
    + '<td>'+fmtPct(consumo?gg.fcConsumo:gg.fcCompras)+'</td><td></td>'
    + '<td>'+fmtPct(consumo?gg.bcConsumo:gg.bcCompras)+'</td><td></td>'
    + '<td>'+fmtNum(gg.clientes)+'</td><td>'+fmtEur(gg.consumoPax,2)+'</td>'
    + '<td>'+(tot?fmtEur(tot.stockPax,2):'—')+'</td><td>'+fmtPct(gg.pesoStock)+'</td></tr>';
  html += '</tbody></table>';
  $('resumoTbl').innerHTML = html;

  const labels = ordenados;
  const vals = labels.map(h => { const r = DATA.resumo[h]||{}; return ((consumo?r.fcConsumo:r.fcCompras)||0)*100; });
  mkChart('chartResumo', {
    type:'bar',
    data:{ labels, datasets:[
      { label:'Food cost '+(consumo?'consumo':'compras')+' (%)', data:vals,
        backgroundColor: vals.map(v => v>=LIM_FOOD*100 ? 'rgba(224,86,86,.75)' : v>=VIG_FOOD*100 ? 'rgba(224,168,50,.75)' : 'rgba(61,189,125,.7)'),
        borderRadius:4 },
      { label:rlbl+' PT', type:'line', data: labels.map(()=> (mediaFood2025||0)*100),
        borderColor:'#c9a24b', borderDash:[6,4], pointRadius:0, borderWidth:1.5 }
    ]},
    options:{ responsive:true, maintainAspectRatio:false,
      scales:{ x:{ ticks:{ maxRotation:70, minRotation:45, autoSkip:false } }, y:{ ticks:{ callback:v=>v+'%' } } },
      plugins:{ legend:{ labels:{ boxWidth:12 } }, tooltip:{ callbacks:{ label:c => c.dataset.label+': '+c.parsed.y.toFixed(1).replace('.',',')+'%' } } } }
  });
}
function card(label, value, note, cls){
  return '<div class="card'+(cls==='bad'?'':' gold')+'"><div class="c-label">'+esc(label)+'</div><div class="c-value" '+(cls==='bad'?'style="color:var(--bad)"':cls==='warn'?'style="color:var(--warn)"':'')+'>'+value+'</div><div class="c-note">'+esc(note)+'</div></div>';
}
function delta(d){
  if(!isNum(d)) return '<span class="delta neu">—</span>';
  const cls = d > 0.002 ? 'up' : d < -0.002 ? 'down' : 'neu';
  const sig = d > 0 ? '▲ +' : d < 0 ? '▼ ' : '';
  return '<span class="delta '+cls+'">'+sig+(d*100).toFixed(1).replace('.',',')+' p.p.</span>';
}
function irParaHotel(h){
  const btn = window.AB35Root.querySelector('.nav-btn[data-view="hotel"]');
  setView('hotel', btn);
  $('ahHotel').value = h;
  renderHotel();
}

/* =====================================================================
   VISTA · Evolução Mensal
===================================================================== */
function evTipo(t){
  evTipoAtual = t;
  $('evTipoFood').classList.toggle('on', t==='food');
  $('evTipoBev').classList.toggle('on', t==='bev');
  renderEvolucao(true);
}
function renderEvolucao(rebuildSel){
  if(!DATA){ semDados('evHeatmap'); return; }
  const src = DATA.raciosMensais[evTipoAtual] || {media2025:[],hoteis:{}};
  const hs = hoteisAtivos().filter(h => src.hoteis[h]);
  const lim = evTipoAtual==='food' ? LIM_FOOD : LIM_BEV;
  if(rebuildSel){
    const sel = $('evHotelSel');
    const cur = sel.value;
    sel.innerHTML = '<option value="__media">— Média simples da seleção —</option>'
      + hs.map(h => '<option>'+esc(h)+'</option>').join('');
    if([...sel.options].some(o => o.value === cur)) sel.value = cur;
  }
  const escolha = $('evHotelSel').value || '__media';
  const meses = DATA.meta.mesesComDados || [];
  const labels = MESES;
  const serie = escolha === '__media'
    ? MESES.map((_,i) => { const v = media(hs.map(h => (src.hoteis[h]||[])[i])); return isNum(v) ? v*100 : null; })
    : (src.hoteis[escolha]||[]).map(v => isNum(v) ? v*100 : null);
  mkChart('chartEvolucao', {
    type:'line',
    data:{ labels, datasets:[
      { label: escolha==='__media' ? 'Média '+selectedRegion : escolha, data:serie,
        borderColor:'#4f8fd8', backgroundColor:'rgba(79,143,216,.12)', fill:true, tension:.3, spanGaps:true, pointRadius:3 },
      { label:refLbl()+' PT', data:(src.media2025||[]).map(v => isNum(v)?v*100:null),
        borderColor:'#c9a24b', borderDash:[6,4], pointRadius:0, tension:.3, spanGaps:true },
      { label:'Limite '+(lim*100)+'%', data:MESES.map(()=>lim*100), borderColor:'rgba(224,86,86,.6)', borderDash:[2,3], pointRadius:0, borderWidth:1 }
    ]},
    options:{ responsive:true, maintainAspectRatio:false,
      scales:{ y:{ ticks:{ callback:v=>v+'%' } } },
      plugins:{ tooltip:{ callbacks:{ label:c => c.dataset.label+': '+(c.parsed.y==null?'—':c.parsed.y.toFixed(1).replace('.',',')+'%') } } } }
  });

  /* heatmap */
  let html = '<table class="tbl hm"><thead><tr><th>Hotel</th>';
  meses.forEach(m => html += '<th>'+MESES[m-1].slice(0,3)+'</th>');
  html += '<th>Média '+(DATA.meta.ano||'')+'</th></tr></thead><tbody>';
  hs.forEach(h => {
    html += '<tr><td class="hname" onclick="irParaHotel(\''+h.replace(/'/g,"\\'")+'\')">'+esc(h)+'</td>';
    const arr = src.hoteis[h]||[];
    meses.forEach(m => {
      const v = arr[m-1];
      const ref = (src.media2025||[])[m-1];
      html += '<td style="background:'+heatColor(v, ref, lim)+'">'+(isNum(v)?fmtPct(v,1):'·')+'</td>';
    });
    const mv = media(meses.map(m => arr[m-1]));
    html += '<td><b>'+fmtPct(mv)+'</b></td></tr>';
  });
  html += '<tr class="total"><td>'+refLbl()+' PT</td>';
  meses.forEach(m => html += '<td>'+fmtPct((src.media2025||[])[m-1])+'</td>');
  html += '<td>'+fmtPct(media(meses.map(m => (src.media2025||[])[m-1])))+'</td></tr>';
  html += '</tbody></table>';
  $('evHeatmap').innerHTML = html;
}

/* =====================================================================
   VISTA · Sub-Famílias
===================================================================== */
function sfModo(m){
  sfModoAtual = m;
  $('sfComC').classList.toggle('on', m==='couvert');
  $('sfComPA').classList.toggle('on', m==='couvertPA');
  $('sfBeb').classList.toggle('on', m==='bebidas');
  renderSubfam();
}
function periodoOptions(selId){
  if(!DATA) return;
  const sel = $(selId); if(!sel) return;
  const cur = sel.value;
  const meses = DATA.meta.mesesComDados || [];
  sel.innerHTML = '<option value="acu">Acumulado '+(DATA.meta.ano||'')+'</option>'
    + meses.map(m => '<option value="'+m+'">'+MESES[m-1]+'</option>').join('');
  if([...sel.options].some(o => o.value === cur)) sel.value = cur;
}
/* custo por couvert/pax de uma subfamília, para um mês (m) ou acumulado ('acu'), por hotel */
function custoUnitSubfam(sub, tipo, periodo){
  /* tipo: 'couvert' | 'couvertPA' | 'bebidas'. Devolve mapa hotel->valor. */
  const out = {};
  const tp = tipo==='bebidas' ? 'beb' : 'com';
  const meses = periodo==='acu' ? (DATA.meta.mesesComDados||[]) : [ +periodo ];
  DATA.hoteis.forEach(h => {
    let cons = 0, denom = 0;
    meses.forEach(m => {
      const ds = (DATA.mensal[tp]||{})[m]; if(!ds) return;
      const t = ds.subfams[sub] && ds.subfams[sub].totais['Total Consumo'];
      if(t && isNum(t[h])) cons += t[h];
      const cr = ds.subfams[tp==='com'?'CUSTOS & RECEITAS COMIDAS':'CUSTOS & RECEITAS BEBIDAS'];
      if(cr){
        const arts = cr.artigos;
        if(tipo==='bebidas'){ const d = arts['Dormidas']||arts['PAX']; if(d && isNum(d[h])) denom += d[h]; }
        else {
          const cv = arts['Couvert']; if(cv && isNum(cv[h])) denom += cv[h];
          if(tipo==='couvertPA'){ const pa = arts['Pequeno almoço (Incluído + passante)']; if(pa && isNum(pa[h])) denom += pa[h]; }
        }
      }
    });
    out[h] = denom > 0 ? cons/denom : null;
  });
  return out;
}
function renderSubfam(){
  if(!DATA){ semDados('sfTbl'); return; }
  periodoOptions('sfPeriodo');
  const periodo = ($('sfPeriodo') && $('sfPeriodo').value) || 'acu';
  const rg = DATA.resumoGeral || {};
  let mapa, subfams;
  if(periodo === 'acu'){
    mapa = sfModoAtual==='bebidas' ? rg.bebidasPax : sfModoAtual==='couvertPA' ? rg.couvertPA : rg.couvert;
    if(!mapa || !Object.keys(mapa).length){ $('sfTbl').innerHTML = '<div class="empty">Sem dados de sub-famílias.</div>'; return; }
    subfams = Object.keys(mapa);
  } else {
    /* mês específico: calcular a partir das abas mensais */
    const tp = sfModoAtual==='bebidas' ? 'beb' : 'com';
    const ds = (DATA.mensal[tp]||{})[+periodo];
    if(!ds){ $('sfTbl').innerHTML = '<div class="empty">Sem dados para '+MESES[+periodo-1]+'.</div>'; return; }
    subfams = ds.ordem.filter(s => s.indexOf('TOTAL')!==0 && s.indexOf('CUSTOS')!==0);
    mapa = {};
    subfams.forEach(sf => { mapa[sf] = custoUnitSubfam(sf, sfModoAtual, periodo); });
  }
  const hs = hoteisAtivos();
  let html = '<table class="tbl hm"><thead><tr><th>Sub-família</th><th>Mediana PT</th>';
  hs.forEach(h => html += '<th>'+esc(h)+'</th>');
  html += '</tr></thead><tbody>';
  subfams.forEach(sf => {
    const todos = DATA.hoteis.map(h => mapa[sf][h]).filter(v => isNum(v) && v > 0);
    const med = mediana(todos);
    html += '<tr><td>'+esc(sf)+'</td><td><b>'+fmtEur(med,2)+'</b></td>';
    hs.forEach(h => {
      const v = mapa[sf][h];
      let bg = 'transparent';
      if(isNum(v) && isNum(med) && med > 0 && v > 0){
        const ratio = v/med;
        if(ratio >= 1.3) bg = 'rgba(224,86,86,.30)';
        else if(ratio >= 1.12) bg = 'rgba(224,168,50,.22)';
        else if(ratio <= .85) bg = 'rgba(61,189,125,.20)';
      }
      html += '<td style="background:'+bg+'">'+(isNum(v)&&v!==0?fmtEur(v,2):'·')+'</td>';
    });
    html += '</tr>';
  });
  /* linha total */
  const totMapa = sfModoAtual==='bebidas'
    ? (rg.totalBebidas||{})['CUSTO BEBIDAS/ PAX']
    : (rg.totalComidas||{})[sfModoAtual==='couvertPA' ? 'Custo por Couvert+PA' : 'Custo por Couvert'];
  if(totMapa){
    const todosT = DATA.hoteis.map(h => totMapa[h]).filter(v => isNum(v) && v > 0);
    html += '<tr class="total"><td>TOTAL</td><td>'+fmtEur(mediana(todosT),2)+'</td>';
    hs.forEach(h => html += '<td>'+((isNum(totMapa[h])&&totMapa[h]!==0)?fmtEur(totMapa[h],2):'·')+'</td>');
    html += '</tr>';
  }
  html += '</tbody></table>';
  $('sfTbl').innerHTML = html;
}

/* =====================================================================
   VISTA · Detalhe Artigos
===================================================================== */
function arDataset(){
  const tipo = $('arTipo').value;
  const mes = $('arMes').value;
  if(mes === 'acu') return DATA.acumulado[tipo];
  return (DATA.mensal[tipo]||{})[+mes] || null;
}
function arMesOptions(){
  if(!DATA) return;
  const sel = $('arMes'); const cur = sel.value;
  const meses = DATA.meta.mesesComDados || [];
  sel.innerHTML = '<option value="acu">Acumulado '+(DATA.meta.ano||'')+'</option>'
    + meses.map(m => '<option value="'+m+'">'+MESES[m-1]+'</option>').join('');
  if([...sel.options].some(o => o.value === cur)) sel.value = cur;
}
function arSubfamOptions(){
  if(!DATA) return;
  const ds = arDataset();
  const sel = $('arSubfam'); const cur = sel.value;
  const subfams = ds ? ds.ordem.filter(s => s.indexOf('TOTAL') !== 0 && s.indexOf('CUSTOS') !== 0) : [];
  sel.innerHTML = '<option value="__all">Todas as sub-famílias</option>'
    + subfams.map(s => '<option>'+esc(s)+'</option>').join('');
  if([...sel.options].some(o => o.value === cur)) sel.value = cur;
}
function renderArtigos(){
  if(!DATA){ semDados('arTbl'); return; }
  const ds = arDataset();
  if(!ds){ $('arTbl').innerHTML = '<div class="empty">Sem dados para este período.</div>'; return; }
  const hs = hoteisAtivos();
  const filtro = ($('arFiltro').value||'').toLowerCase();
  const sfEscolha = $('arSubfam').value || '__all';
  const subfams = ds.ordem.filter(s => s.indexOf('TOTAL') !== 0 && s.indexOf('CUSTOS') !== 0)
                          .filter(s => sfEscolha === '__all' || s === sfEscolha);
  let html = '<table class="tbl"><thead><tr><th>Artigo</th>';
  hs.forEach(h => html += '<th>'+esc(h)+'</th>');
  html += '<th>Σ seleção</th><th>Total PT</th></tr></thead><tbody>';
  subfams.forEach(sf => {
    const bloco = ds.subfams[sf];
    const artigos = bloco.ordemArtigos.filter(a2 => !filtro || a2.toLowerCase().indexOf(filtro) >= 0);
    if(!artigos.length && filtro) return;
    html += '<tr class="total"><td>'+esc(sf)+'</td>'+hs.map(()=>'<td></td>').join('')+'<td></td><td></td></tr>';
    artigos.forEach(a2 => {
      const vals = bloco.artigos[a2];
      const linha = hs.map(h => vals[h]);
      const s = soma(linha);
      if(!filtro && s === 0 && !isNum(vals['TOTAL'])) return;
      if(!filtro && s === 0 && Math.abs(vals['TOTAL']||0) < 0.005) return;
      html += '<tr><td>'+esc(a2)+'</td>';
      hs.forEach(h => html += '<td>'+(isNum(vals[h])&&vals[h]!==0?fmtEur(vals[h]):'·')+'</td>');
      html += '<td><b>'+fmtEur(s)+'</b></td><td>'+fmtEur(vals['TOTAL'])+'</td></tr>';
    });
    /* totais do bloco */
    ['Total Consumo','Custo por Couvert','Total Compras','Total Inventário'].forEach(t => {
      const vals = bloco.totais[t];
      if(!vals) return;
      const eEuro = t !== 'Custo por Couvert';
      const s = eEuro ? soma(hs.map(h => vals[h])) : media(hs.map(h => vals[h]).filter(v => isNum(v)&&v>0));
      html += '<tr><td style="color:var(--gold-soft)">· '+esc(t)+'</td>';
      hs.forEach(h => html += '<td style="color:var(--gold-soft)">'+(isNum(vals[h])&&vals[h]!==0?fmtEur(vals[h], eEuro?0:2):'·')+'</td>');
      html += '<td style="color:var(--gold-soft)"><b>'+fmtEur(s, eEuro?0:2)+'</b></td><td style="color:var(--gold-soft)">'+fmtEur(vals['TOTAL'], eEuro?0:2)+'</td></tr>';
    });
  });
  html += '</tbody></table>';
  $('arTbl').innerHTML = html;
}

/* =====================================================================
   VISTA · Análise Hotel (generalização da "Análise ERICEIRA")
===================================================================== */
function ahOptions(){
  if(!DATA) return;
  const sel = $('ahHotel'); const cur = sel.value;
  sel.innerHTML = DATA.hoteis.map(h => '<option>'+esc(h)+'</option>').join('');
  if(cur && DATA.hoteis.indexOf(cur) >= 0) sel.value = cur;
  else if(CURRENT_USER && CURRENT_USER.hotel && DATA.hoteis.indexOf(CURRENT_USER.hotel) >= 0) sel.value = CURRENT_USER.hotel;
}
function abertos(){ return DATA.hoteis.filter(h => ((DATA.resumo[h]||{}).clientes||0) > 0); }
function renderHotel(){
  if(!DATA){ semDados('ahTbl'); return; }
  const h = $('ahHotel').value || DATA.hoteis[0];
  const reg = regiaoDe(h);
  const r = DATA.resumo[h] || {};
  const geral = abertos();
  const daReg = geral.filter(x => regiaoDe(x) === reg);
  const tips = tipologiasDe(h);
  const tip = tips[0] || null;
  const daTip = tip ? geral.filter(x => tipologiasDe(x).indexOf(tip) >= 0) : [];
  $('ahRegTag').textContent = 'Região: '+reg + (tip ? ' · Tipologia: '+tips.join(' + ') : '');
  const INDS = [
    {k:'fcCompras', lbl:'Food cost — compras', pct:1, inv:1, lim:LIM_FOOD, vig:VIG_FOOD},
    {k:'fcConsumo', lbl:'Food cost — consumo', pct:1, inv:1, lim:LIM_FOOD, vig:VIG_FOOD},
    {k:'bcCompras', lbl:'Beverage cost — compras', pct:1, inv:1, lim:LIM_BEV, vig:VIG_BEV},
    {k:'bcConsumo', lbl:'Beverage cost — consumo', pct:1, inv:1, lim:LIM_BEV, vig:VIG_BEV},
    {k:'consumoPax', lbl:'Consumo / pax (€)', pct:0, inv:1},
    {k:'stockPax', lbl:'Stock / pax (€)', pct:0, inv:1},
    {k:'pesoStock', lbl:'Peso do stock', pct:1, inv:1}
  ];
  let html = '<table class="tbl"><thead><tr><th>Indicador</th><th>'+esc(h)+'</th><th>Média geral</th><th>Δ vs geral</th><th>Média '+esc(reg)+'</th><th>Δ vs região</th>'+(tip?'<th>Média '+esc(tip)+'</th><th>Δ vs tipologia</th>':'')+'<th>Leitura</th></tr></thead><tbody>';
  INDS.forEach(ind => {
    const v = r[ind.k];
    const mg = media(geral.map(x => (DATA.resumo[x]||{})[ind.k]));
    const mr = media(daReg.map(x => (DATA.resumo[x]||{})[ind.k]));
    const mt = tip ? media(daTip.map(x => (DATA.resumo[x]||{})[ind.k])) : null;
    const dg = isNum(v)&&isNum(mg) ? v-mg : null;
    const dr = isNum(v)&&isNum(mr) ? v-mr : null;
    const dt = isNum(v)&&isNum(mt) ? v-mt : null;
    const fmt = ind.pct ? (x)=>fmtPct(x) : (x)=>fmtEur(x,2);
    const fmtD = ind.pct
      ? (d)=> !isNum(d) ? '—' : '<span class="delta '+(d>0.002?'up':d<-0.002?'down':'neu')+'">'+(d>0?'+':'')+(d*100).toFixed(1).replace('.',',')+' p.p.</span>'
      : (d)=> !isNum(d) ? '—' : '<span class="delta '+(d>0.02?'up':d<-0.02?'down':'neu')+'">'+(d>0?'+':'')+d.toFixed(2).replace('.',',')+' €</span>';
    let leitura = '—', cls = 'mut';
    if(isNum(v) && isNum(mg)){
      if(ind.lim && v >= ind.lim){ leitura = 'Acima do limite'; cls = 'bad'; }
      else if(v <= mg){ leitura = 'Melhor que a média geral'; cls = 'ok'; }
      else { leitura = 'Acima da média geral'; cls = 'warn'; }
    }
    html += '<tr><td>'+esc(ind.lbl)+'</td><td><b>'+fmt(v)+'</b></td><td>'+fmt(mg)+'</td><td>'+fmtD(dg)+'</td><td>'+fmt(mr)+'</td><td>'+fmtD(dr)+'</td>'+(tip?'<td>'+fmt(mt)+'</td><td>'+fmtD(dt)+'</td>':'')+'<td><span class="sem '+cls+'">'+leitura+'</span></td></tr>';
  });
  html += '</tbody></table>';
  $('ahTbl').innerHTML = html;

  /* gráfico evolução do hotel */
  const f = (DATA.raciosMensais.food.hoteis[h]||[]).map(v => isNum(v)?v*100:null);
  const b = (DATA.raciosMensais.bev.hoteis[h]||[]).map(v => isNum(v)?v*100:null);
  mkChart('chartHotelEv', {
    type:'line',
    data:{ labels:MESES, datasets:[
      { label:'Food cost', data:f, borderColor:'#4f8fd8', tension:.3, spanGaps:true, pointRadius:3 },
      { label:'Beverage cost', data:b, borderColor:'#3dbd7d', tension:.3, spanGaps:true, pointRadius:3 },
      { label:refLbl()+' food PT', data:(DATA.raciosMensais.food.media2025||[]).map(v=>isNum(v)?v*100:null), borderColor:'#c9a24b', borderDash:[6,4], pointRadius:0, spanGaps:true }
    ]},
    options:{ responsive:true, maintainAspectRatio:false, scales:{ y:{ ticks:{ callback:v=>v+'%' } } } }
  });

  /* gráfico sub-famílias vs mediana */
  const mapa = (DATA.resumoGeral||{}).couvert || {};
  const sfs = Object.keys(mapa);
  const valsH = sfs.map(sf => mapa[sf][h] || 0);
  const valsM = sfs.map(sf => mediana(DATA.hoteis.map(x => mapa[sf][x]).filter(v => isNum(v)&&v>0)) || 0);
  mkChart('chartHotelSf', {
    type:'bar',
    data:{ labels:sfs, datasets:[
      { label:esc(h)+' €/couvert', data:valsH, backgroundColor:'rgba(79,143,216,.75)', borderRadius:4 },
      { label:'Mediana PT', data:valsM, backgroundColor:'rgba(201,162,75,.55)', borderRadius:4 }
    ]},
    options:{ responsive:true, maintainAspectRatio:false, indexAxis:'y',
      scales:{ x:{ ticks:{ callback:v=>v+' €' } } } }
  });

  /* comentário automático */
  const selM = $('ahMesAuto');
  const meses = DATA.meta.mesesComDados || [];
  const curM = selM.value;
  selM.innerHTML = meses.map(m2 => '<option value="'+m2+'">'+MESES[m2-1]+'</option>').join('');
  selM.value = ([...selM.options].some(o => o.value === curM)) ? curM : String(meses[meses.length-1]||'');
  renderHotelAuto();

  /* comentários do hotel */
  const cm = DATA.comentarios[h] || DATA.comentarios[Object.keys(DATA.comentarios).find(k => k.toUpperCase() === h.toUpperCase())] || {};
  const keys = Object.keys(cm);
  $('ahComentarios').innerHTML = keys.length
    ? keys.map(m => '<div class="cm-card"><div class="cm-hotel">'+esc(h)+'</div><div class="cm-mes">'+esc(m)+'</div><div class="cm-text">'+esc(cm[m])+'</div></div>').join('')
    : '<div class="empty">Sem comentários registados para este hotel.</div>';
}

/* =====================================================================
   VISTA · Grupos & Rotação (Detalhe de consumo)
===================================================================== */
function nMesesDados(){ return Math.max(1, (DATA.meta.mesesComDados||[]).length); }
/* meses ativos de um hotel = meses com consumo total (comidas+bebidas) > 500 €.
   Evita distorcer a cobertura com meses de hotel fechado / baixa ocupação. */
const _mesesAtivosCache = {};
function mesesAtivosHotel(h){
  if(_mesesAtivosCache[h] !== undefined) return _mesesAtivosCache[h];
  let n = 0;
  (DATA.meta.mesesComDados||[]).forEach(m => {
    let s = 0;
    ['com','beb'].forEach(tp => {
      const ds = (DATA.mensal[tp]||{})[m]; if(!ds) return;
      ds.ordem.forEach(sf => {
        if(sf.indexOf('TOTAL')===0 || sf.indexOf('CUSTOS')===0) return;
        const t = ds.subfams[sf].totais['Total Consumo'];
        if(t && isNum(t[h])) s += t[h];
      });
    });
    if(s > 500) n++;
  });
  _mesesAtivosCache[h] = Math.max(1, n);
  return _mesesAtivosCache[h];
}
function mesesAtivosConjunto(hs){
  /* média ponderada simples: usa o máximo de meses ativos entre os hotéis da seleção */
  return Math.max(1, ...hs.map(mesesAtivosHotel));
}
/* limpar cache quando muda o dataset */
function limparCacheAtivos(){ for(const k in _mesesAtivosCache) delete _mesesAtivosCache[k]; _consSubCache = null; _artSubCache = null; _consSubMesCache = null; }
/* Consumo REAL acumulado por subfamília e hotel (das abas mensais, que são completas).
   A aba "Detalhe de consumo" só cobre ~1/4 do consumo real, por isso a cobertura de stock
   tem de usar este consumo, não o do Detalhe. Chave: SUBFAMILIA(maiusc)|HOTEL -> €. */
let _artSubCache = null;
function artigoParaSubfam(){
  if(_artSubCache) return _artSubCache;
  const map = {};
  ['com','beb'].forEach(tp => {
    (DATA.meta.mesesComDados||[]).forEach(m => {
      const ds = (DATA.mensal[tp]||{})[m]; if(!ds) return;
      ds.ordem.forEach(sf => {
        if(sf.indexOf('TOTAL')===0 || sf.indexOf('CUSTOS')===0) return;
        Object.keys(ds.subfams[sf].artigos||{}).forEach(a => { map[a.toUpperCase()] = sf.toUpperCase(); });
      });
    });
  });
  _artSubCache = map;
  return map;
}
let _consSubCache = null;
function consumoRealSubfam(){
  if(_consSubCache) return _consSubCache;
  const map = {};
  ['com','beb'].forEach(tp => {
    (DATA.meta.mesesComDados||[]).forEach(m => {
      const ds = (DATA.mensal[tp]||{})[m]; if(!ds) return;
      ds.ordem.forEach(sf => {
        if(sf.indexOf('TOTAL')===0 || sf.indexOf('CUSTOS')===0) return;
        const t = ds.subfams[sf].totais['Total Consumo']; if(!t) return;
        const key = sf.toUpperCase();
        map[key] = map[key] || {};
        DATA.hoteis.forEach(h => { if(isNum(t[h])) map[key][h] = (map[key][h]||0) + t[h]; });
      });
    });
  });
  _consSubCache = map;
  return map;
}
/* consumo mensal por subfamília, por MÊS individual: {SUBFAM: {mes: {hotel: €}}} */
let _consSubMesCache = null;
function consumoSubfamPorMes(){
  if(_consSubMesCache) return _consSubMesCache;
  const map = {};
  ['com','beb'].forEach(tp => {
    (DATA.meta.mesesComDados||[]).forEach(m => {
      const ds = (DATA.mensal[tp]||{})[m]; if(!ds) return;
      ds.ordem.forEach(sf => {
        if(sf.indexOf('TOTAL')===0 || sf.indexOf('CUSTOS')===0) return;
        const t = ds.subfams[sf].totais['Total Consumo']; if(!t) return;
        const key = sf.toUpperCase();
        map[key] = map[key] || {};
        map[key][m] = map[key][m] || {};
        DATA.hoteis.forEach(h => { if(isNum(t[h])) map[key][m][h] = t[h]; });
      });
    });
  });
  _consSubMesCache = map;
  return map;
}
/* consumo mensal real de uma subfamília para um conjunto de hotéis, segundo a base:
   'acu' = média dos meses ativos · 'u3' = média dos últimos 3 meses com dados · 'ult' = último mês com dados */
function consumoMensalSub(sub, hs, base){
  base = base || 'acu';
  const key = String(sub).toUpperCase();
  const meses = (DATA.meta.mesesComDados||[]).slice().sort((a,b)=>a-b);
  if(!meses.length) return null;
  if(base === 'ult'){
    const m = meses[meses.length-1];
    const mp = consumoSubfamPorMes()[key]; if(!mp || !mp[m]) return null;
    const s = soma(hs.map(h => mp[m][h]));
    return s > 0 ? s : null;
  }
  if(base === 'u3'){
    const ult3 = meses.slice(-3);
    const mp = consumoSubfamPorMes()[key]; if(!mp) return null;
    let tot = 0, n = 0;
    ult3.forEach(m => { if(mp[m]){ tot += soma(hs.map(h => mp[m][h])); n++; } });
    return n > 0 && tot > 0 ? tot/n : null;
  }
  /* acumulado: média sobre meses ativos */
  const map = consumoRealSubfam();
  const m2 = map[key]; if(!m2) return null;
  const totAcum = soma(hs.map(h => m2[h]));
  const nAtiv = mesesAtivosConjunto(hs);
  return totAcum > 0 ? totAcum / nAtiv : null;
}
function grHotelOptions(){
  if(!DATA) return;
  const sel = $('grHotel'); const cur = sel.value;
  sel.innerHTML = '<option value="__sel">Σ Hotéis da seleção atual</option>' + DATA.hoteis.map(h => '<option>'+esc(h)+'</option>').join('');
  if([...sel.options].some(o => o.value === cur)) sel.value = cur;
}
function grFamOptions(){
  if(!DATA || !DATA.detalhe) return;
  grHotelOptions();
  const sel = $('grFam'); const cur = sel.value;
  const fams = [...new Set(DATA.detalhe.linhas.map(l => l.fam))];
  sel.innerHTML = '<option value="__all">Todas as famílias</option>' + fams.map(f => '<option>'+esc(f)+'</option>').join('');
  if([...sel.options].some(o => o.value === cur)) sel.value = cur;
  grSubOptions();
}
function grSubOptions(){
  if(!DATA || !DATA.detalhe) return;
  const fam = $('grFam').value;
  const sel = $('grSub'); const cur = sel.value;
  const subs = [...new Set(DATA.detalhe.linhas.filter(l => fam==='__all' || l.fam===fam).map(l => l.sub))];
  sel.innerHTML = '<option value="__all">Todas as sub-famílias</option>' + subs.map(s => '<option>'+esc(s)+'</option>').join('');
  if([...sel.options].some(o => o.value === cur)) sel.value = cur;
}
function grBaseVal(){ return ($('grBase') && $('grBase').value) || 'ult'; }
function renderGrupos(){
  if(!DATA){ semDados('grTbl'); return; }
  const _met0 = $('grMet') ? $('grMet').value : 'cons';
  if($('grBase')) $('grBase').style.display = (_met0==='cob') ? '' : 'none';
  if(!DATA.detalhe){ $('grTbl').innerHTML = '<div class="empty">A aba «Detalhe de consumo» não foi encontrada no ficheiro publicado — voltar a carregar e publicar o Excel.</div>'; return; }
  const escolhaH = $('grHotel').value || '__sel';
  const hs = hoteisAtivos();
  const fam = $('grFam').value || '__all';
  const sub = $('grSub').value || '__all';
  const met = $('grMet').value || 'cons';
  const IDX = {si:0, cp:1, inv:2, cons:3};
  const nm = nMesesDados();
  const linhas = DATA.detalhe.linhas.filter(l => (fam==='__all'||l.fam===fam) && (sub==='__all'||l.sub===sub));
  $('grMet').style.display = escolhaH === '__sel' ? '' : 'none';

  /* ---- MODO HOTEL ÚNICO: todas as métricas lado a lado ---- */
  if(escolhaH !== '__sel'){
    const h = escolhaH;
    let ht = '<table class="tbl"><thead><tr><th>Grupo</th><th>Stock inicial</th><th>Compras</th><th>Inventário final</th><th>Consumo/mês (real)</th><th>% do consumo</th><th>Cobertura</th></tr></thead><tbody>';
    const consTotal = soma(linhas.map(l => (l.vals[h]||[])[IDX.cons]));
    let subAtual = null, acumSub = null;
    const fechaSub = () => {
      if(!acumSub) return '';
      const _cm = consumoMensalSub(acumSub.sub, [h], grBaseVal());
      const cob = (acumSub.inv >= 100 && isNum(_cm) && _cm > 20) ? acumSub.inv/_cm : null;
      return '<tr class="total"><td>Σ '+esc(acumSub.nome)+'</td><td>'+fmtEur(acumSub.si)+'</td><td>'+fmtEur(acumSub.cp)+'</td><td>'+fmtEur(acumSub.inv)+'</td><td>'+fmtEur(isNum(_cm)?_cm:0)+'</td><td>'+(consTotal>0?fmtPct(acumSub.cons/consTotal):'—')+'</td><td>'+(isNum(cob)?cob.toFixed(1).replace('.',',')+' m':'—')+'</td></tr>';
    };
    let corpo = '';
    linhas.forEach(l => {
      if(l.sub !== subAtual){
        corpo += fechaSub();
        subAtual = l.sub;
        acumSub = {nome:l.fam+' · '+l.sub, sub:l.sub, si:0, cp:0, inv:0, cons:0};
      }
      const v = l.vals[h] || [];
      const si = v[IDX.si]||0, cp = v[IDX.cp]||0, inv = v[IDX.inv]||0, cons = v[IDX.cons]||0;
      acumSub.si += si; acumSub.cp += cp; acumSub.inv += inv; acumSub.cons += cons;
      if(Math.abs(si)+Math.abs(cp)+Math.abs(inv)+Math.abs(cons) < 0.5) return;
      const consMsub = consumoMensalSub(l.sub, [h], grBaseVal());
      const invSub = linhas.filter(x => x.sub === l.sub).reduce((s,x)=>s+((x.vals[h]||[])[IDX.inv]||0), 0);
      const quota = invSub > 0 ? inv/invSub : 0;
      const consMgrupo = isNum(consMsub) ? consMsub * quota : null;
      const cob = (inv >= 100 && isNum(consMgrupo) && consMgrupo > 5) ? inv/consMgrupo : null;
      const cls = isNum(cob) ? (cob >= 3 ? 'bad' : cob >= 2 ? 'warn' : 'ok') : 'mut';
      corpo += '<tr><td>'+esc(l.grupo)+'</td><td>'+fmtEur(si)+'</td><td>'+fmtEur(cp)+'</td><td><b>'+fmtEur(inv)+'</b></td><td>'+fmtEur(isNum(consMgrupo)?consMgrupo:0)+'</td>'
        + '<td>'+(consTotal>0 && cons>0 ? fmtPct(cons/consTotal) : '·')+'</td>'
        + '<td><span class="sem '+cls+'">'+(isNum(cob)?cob.toFixed(1).replace('.',',')+' m':'—')+'</span></td></tr>';
    });
    corpo += fechaSub();
    $('grTbl').innerHTML = ht + corpo + '</tbody></table>';
    return;
  }
  let htmlT = '<table class="tbl hm"><thead><tr><th>Grupo</th><th>Σ seleção</th>';
  hs.forEach(h => htmlT += '<th>'+esc(h)+'</th>');
  htmlT += '</tr></thead><tbody>';
  let subAtual = null;
  linhas.forEach(l => {
    if(l.sub !== subAtual){
      subAtual = l.sub;
      htmlT += '<tr class="total"><td>'+esc(l.fam)+' · '+esc(l.sub)+'</td><td></td>'+hs.map(()=>'<td></td>').join('')+'</tr>';
    }
    const valDe = (h) => {
      const v = l.vals[h]; if(!v) return null;
      if(met === 'cob'){
        const inv = v[IDX.inv]||0;
        if(inv < 100) return null;                       // stock irrelevante
        /* consumo mensal real do grupo = consumo real da subfamília × quota do grupo no inventário da subfamília */
        const consMsub = consumoMensalSub(l.sub, [h], grBaseVal());
        if(!isNum(consMsub) || consMsub <= 20) return null;
        const invSub = DATA.detalhe.linhas.filter(x => x.sub === l.sub).reduce((s,x)=>s+((x.vals[h]||[])[IDX.inv]||0), 0);
        const quota = invSub > 0 ? inv/invSub : 0;
        const consMgrupo = consMsub * quota;
        return consMgrupo > 5 ? inv/consMgrupo : null;
      }
      return v[IDX[met]];
    };
    const vs = hs.map(valDe);
    const s = met==='cob' ? media(vs) : soma(vs);
    htmlT += '<tr><td>'+esc(l.grupo)+'</td><td><b>'+(met==='cob'?(isNum(s)?s.toFixed(1).replace('.',',')+' m':'—'):fmtEur(s))+'</b></td>';
    hs.forEach(h => {
      const v = valDe(h);
      let bg = 'transparent', txt = '·', title = '';
      if(met === 'cob'){
        const inv = (l.vals[h]||[])[IDX.inv]||0;
        if(isNum(v)){
          txt = v.toFixed(1).replace('.',',');
          title = 'Inventário '+fmtEur(inv)+' · '+mesesAtivosHotel(h)+' meses ativos';
          if(v >= 3) bg = 'rgba(224,86,86,.30)'; else if(v >= 2) bg = 'rgba(224,168,50,.22)';
        } else if(inv > 0){
          txt = '·'; title = 'Inventário '+fmtEur(inv)+' (baixo ou sem consumo)';
        }
      } else if(isNum(v) && Math.abs(v) >= 0.5){ txt = fmtEur(v); }
      htmlT += '<td style="background:'+bg+'"'+(title?' title="'+esc(title)+'"':'')+'>'+txt+'</td>';
    });
    htmlT += '</tr>';
  });
  htmlT += '</tbody></table>';
  $('grTbl').innerHTML = htmlT;
}

/* =====================================================================
   VISTA · Inventário por Artigo
===================================================================== */
function iaOptions(){
  if(!DATA) return;
  const sel = $('iaHotel'); const cur = sel.value;
  sel.innerHTML = '<option value="__sel">Σ Hotéis da seleção atual</option>' + DATA.hoteis.map(h => '<option>'+esc(h)+'</option>').join('');
  if([...sel.options].some(o => o.value === cur)) sel.value = cur;
}
function invArtLinha(art, hs, base){
  const g = (m) => soma(hs.map(h => ((DATA.artStock[m]||{})[art]||{})[h]));
  const si = g('ini'), cp = g('compras'), fim = g('fim');
  /* consumo mensal REAL: consumo da subfamília (abas mensais) × quota deste artigo no inventário da subfamília */
  const subMap = artigoParaSubfam();
  const sub = subMap[art.toUpperCase()];
  let consM = null;
  if(sub){
    const consMsub = consumoMensalSub(sub, hs, base);
    if(isNum(consMsub)){
      /* inventário total da subfamília nestes hotéis */
      let invSub = 0;
      Object.keys(DATA.artStock.fim||{}).forEach(a => { if((subMap[a.toUpperCase()]) === sub) invSub += soma(hs.map(h => (DATA.artStock.fim[a]||{})[h])); });
      const quota = invSub > 0 ? fim/invSub : 0;
      consM = consMsub * quota;
    }
  }
  const cob = (fim >= 100 && isNum(consM) && consM > 5) ? fim/consM : null;
  return {art, si, cp, fim, sub, consM, cob};
}
let iaArtigoSel = null;
function iaAbrirArtigo(art){
  iaArtigoSel = (iaArtigoSel === art) ? null : art;  // clicar de novo fecha
  renderInvArtDetalhe();
}
function renderInvArtDetalhe(){
  const box = $('iaDetalhe');
  if(!box) return;
  if(!iaArtigoSel){ box.style.display='none'; return; }
  const art = iaArtigoSel;
  const base = ($('iaBase') && $('iaBase').value) || 'ult';
  const hs = hoteisAtivos();
  const ultMes = Math.max(...(DATA.meta.mesesComDados||[1]));
  const baseLbl = base==='ult' ? 'consumo de '+MESES[ultMes-1] : base==='u3' ? 'média últimos 3 meses' : 'média do ano';
  /* calcular a linha do artigo por cada hotel individualmente */
  const linhas = hs.map(h => {
    const l = invArtLinha(art, [h], base);
    return { h, ...l };
  }).filter(x => x.fim > 0 || x.si > 0 || x.cp > 0);
  linhas.sort((a,b) => (b.cob??-1) - (a.cob??-1));
  const somaFim = soma(linhas.map(l=>l.fim)), somaCons = soma(linhas.map(l=>l.consM));
  let ht = '<h3>'+esc(art)+' <span class="tag">comparação entre hotéis · '+esc(selectedRegion)+(selectedTip!=='Todas'?' · '+selectedTip:'')+'</span></h3>';
  ht += '<p class="note" style="margin:0 0 10px">Cobertura ao ritmo de consumo: '+esc(baseLbl)+'. Ordenado da maior cobertura (mais stock parado) para a menor (risco de rutura).</p>';
  ht += '<div class="tbl-wrap" style="max-height:460px;overflow-y:auto"><table class="tbl"><thead><tr><th>Hotel</th><th>Stock inicial</th><th>Compras</th><th>Inventário final</th><th>Consumo/mês</th><th>Cobertura</th></tr></thead><tbody>';
  ht += '<tr class="total"><td>TOTAL ('+linhas.length+' hotéis)</td><td></td><td></td><td>'+fmtEur(somaFim)+'</td><td>'+fmtEur(somaCons)+'</td><td>'+(somaCons>0?(somaFim/somaCons).toFixed(1).replace('.',',')+' m':'—')+'</td></tr>';
  linhas.forEach(l => {
    const cls = isNum(l.cob) ? (l.cob >= 3 ? 'bad' : l.cob >= 2 ? 'warn' : 'ok') : 'mut';
    const cobTxt = isNum(l.cob) ? l.cob.toFixed(1).replace('.',',')+' m' : (l.fim < 100 ? '—' : 'baixo giro');
    ht += '<tr><td class="hname">'+esc(l.h)+'<span class="reg-tag">'+esc(regiaoDe(l.h))+'</span></td>'
      + '<td>'+fmtEur(l.si)+'</td><td>'+fmtEur(l.cp)+'</td><td><b>'+fmtEur(l.fim)+'</b></td><td>'+fmtEur(l.consM)+'</td>'
      + '<td><span class="sem '+cls+'">'+cobTxt+'</span></td></tr>';
  });
  ht += '</tbody></table></div>';
  ht += '<div class="p-tools" style="margin-top:10px"><button class="btn ghost" onclick="iaArtigoSel=null;renderInvArtDetalhe()">✕ Fechar detalhe</button></div>';
  box.innerHTML = ht;
  box.style.display = '';
  box.scrollIntoView({behavior:'smooth', block:'nearest'});
}
function renderInvArt(){
  if(!DATA){ semDados('iaTbl'); return; }
  if(!DATA.artStock || !DATA.artStock.ini){ $('iaTbl').innerHTML = '<div class="empty">Abas de inventário não encontradas no ficheiro publicado.</div>'; return; }
  const escolha = $('iaHotel').value || '__sel';
  const hs = escolha === '__sel' ? hoteisAtivos() : [escolha];
  const filtro = ($('iaFiltro').value||'').toLowerCase();
  const soParado = $('iaSo').checked;
  const ord = $('iaOrd').value || 'inv';
  const base = ($('iaBase') && $('iaBase').value) || 'ult';
  const artigos = new Set([...Object.keys(DATA.artStock.ini||{}), ...Object.keys(DATA.artStock.compras||{}), ...Object.keys(DATA.artStock.fim||{})]);
  let linhas = [...artigos].map(a => invArtLinha(a, hs, base))
    .filter(l => Math.abs(l.si)+Math.abs(l.cp)+Math.abs(l.fim) > 0.5)
    .filter(l => !filtro || l.art.toLowerCase().indexOf(filtro) >= 0)
    .filter(l => !soParado || (isNum(l.cob) && l.cob >= 2));
  linhas.sort((a,b) => ord==='cob' ? ((b.cob??-1)-(a.cob??-1)) : ord==='cons' ? ((b.consM||0)-(a.consM||0)) : (b.fim-a.fim));
  const tot = linhas.reduce((s,l)=>({si:s.si+l.si, cp:s.cp+l.cp, fim:s.fim+l.fim, consM:s.consM+(l.consM||0)}), {si:0,cp:0,fim:0,consM:0});
  const nAtiv = mesesAtivosConjunto(hs);
  const ultMes = Math.max(...(DATA.meta.mesesComDados||[1]));
  const baseLbl = base==='ult' ? 'consumo de '+MESES[ultMes-1] : base==='u3' ? 'média últimos 3 meses' : 'média do ano';
  let htmlT = '<table class="tbl"><thead><tr><th>Artigo</th><th>Sub-família</th><th>Stock inicial</th><th>Compras</th><th>Inventário final <span style="font-weight:400;color:var(--text-3)">(atual, fim de '+MESES[ultMes-1].slice(0,3)+')</span></th><th>Consumo/mês <span style="font-weight:400;color:var(--text-3)">('+esc(baseLbl)+')</span></th><th>Cobertura</th></tr></thead><tbody>';
  htmlT += '<tr class="total"><td>TOTAL ('+linhas.length+' artigos)</td><td></td><td>'+fmtEur(tot.si)+'</td><td>'+fmtEur(tot.cp)+'</td><td>'+fmtEur(tot.fim)+'</td><td>'+fmtEur(tot.consM)+'</td><td></td></tr>';
  linhas.forEach(l => {
    const cls = isNum(l.cob) ? (l.cob >= 3 ? 'bad' : l.cob >= 2 ? 'warn' : 'ok') : 'mut';
    const cobTxt = isNum(l.cob) ? l.cob.toFixed(1).replace('.',',')+' m' : (l.fim < 100 ? '—' : 'baixo giro');
    htmlT += '<tr><td class="hname" onclick="iaAbrirArtigo(\''+l.art.replace(/\\/g,"\\\\").replace(/'/g,"\\'")+'\')">'+esc(l.art)+'</td><td style="color:var(--text-3);font-size:10.5px">'+esc(l.sub||'—')+'</td><td>'+fmtEur(l.si)+'</td><td>'+fmtEur(l.cp)+'</td><td><b>'+fmtEur(l.fim)+'</b></td><td>'+fmtEur(l.consM)+'</td>'
      + '<td><span class="sem '+cls+'">'+cobTxt+'</span></td></tr>';
  });
  htmlT += '</tbody></table>';
  $('iaTbl').innerHTML = htmlT;
  renderInvArtDetalhe();
}

/* =====================================================================
   VISTA · Receitas de Bebidas (detalhe DADOS DIVERSOS, mês corrente)
===================================================================== */
const RB_MAINS = ['ÁGUAS','CERVEJAS','OUTRAS BEBIDAS','SUMOS E REFRIGERANTES','VINHOS','RECEITAS BEBIDAS (TOTAL)'];
/* labels do bloco de comidas na aba DADOS DIVERSOS */
const RB_COMIDAS = ['RECEITAS COMIDAS','CONSUMOS INTERNOS COMIDAS','REFEITÓRIO COMIDAS','COUVERTS'];
function rbOptions(){ /* seletor já é estático; nada a preencher dinamicamente por agora */ }
function renderRecBeb(){
  if(!DATA){ semDados('rbTbl'); return; }
  const all = DATA.diversosAll || [];
  if(!all.length){ $('rbTbl').innerHTML = '<div class="empty">Detalhe de DADOS DIVERSOS não disponível — voltar a publicar o ficheiro.</div>'; return; }
  const tipo = ($('rbTipo') && $('rbTipo').value) || 'beb';
  $('rbSub').textContent = 'Mês de '+MESES[(DATA.meta.mes||1)-1]+' '+(DATA.meta.ano||'')+' · '+selectedRegion+(selectedTip!=='Todas'?' · '+selectedTip:'');
  const hs = hoteisAtivos();

  if(tipo === 'beb'){
    if($('rbNota')) $('rbNota').textContent = 'Detalhe por categoria (águas, cervejas, vinhos, sumos…). Valores do mês do ficheiro; no fim, os ajustes (ofertas, AI, MP, suplementos).';
    const i0 = all.findIndex(x => x.label === 'RECEITAS BEBIDAS (TOTAL)');
    const i1 = all.findIndex(x => x.label.indexOf('CONFERENCIA') === 0);
    if(i0 < 0){ $('rbTbl').innerHTML = '<div class="empty">Bloco de receitas de bebidas não encontrado.</div>'; return; }
    const linhas = [all[i0], ...all.slice(i0+1, i1 < 0 ? undefined : i1)];
    let htmlT = '<table class="tbl"><thead><tr><th>Categoria</th><th>Σ seleção</th>';
    hs.forEach(h => htmlT += '<th>'+esc(h)+'</th>');
    htmlT += '</tr></thead><tbody>';
    linhas.forEach(l => {
      const s = soma(hs.map(h => l.vals[h]));
      const main = RB_MAINS.indexOf(l.label) >= 0;
      htmlT += '<tr'+(main?' class="total"':'')+'><td>'+(main?esc(l.label):'&nbsp;&nbsp;· '+esc(cap(l.label)))+'</td><td><b>'+fmtEur(s)+'</b></td>';
      hs.forEach(h => htmlT += '<td>'+(isNum(l.vals[h])&&Math.abs(l.vals[h])>=0.5?fmtEur(l.vals[h]):'·')+'</td>');
      htmlT += '</tr>';
    });
    htmlT += '</tbody></table>';
    $('rbTbl').innerHTML = htmlT;
    return;
  }

  /* ---- COMIDAS: receita, consumos internos, refeitório, couverts ---- */
  if($('rbNota')) $('rbNota').textContent = 'Receita de comidas e movimentos associados (consumos internos, refeitório, couverts). As comidas não têm detalhe por categoria como as bebidas.';
  const querC = lbl => RB_COMIDAS.some(k => String(lbl).toUpperCase().indexOf(k) === 0);
  const linhas = all.filter(x => querC(x.label));
  if(!linhas.length){ $('rbTbl').innerHTML = '<div class="empty">Bloco de comidas não encontrado na aba DADOS DIVERSOS.</div>'; return; }
  let htmlT = '<table class="tbl"><thead><tr><th>Rubrica</th><th>Σ seleção</th>';
  hs.forEach(h => htmlT += '<th>'+esc(h)+'</th>');
  htmlT += '</tr></thead><tbody>';
  linhas.forEach(l => {
    const s = soma(hs.map(h => l.vals[h]));
    const main = String(l.label).toUpperCase().indexOf('RECEITAS COMIDAS') === 0;
    htmlT += '<tr'+(main?' class="total"':'')+'><td>'+esc(cap(l.label))+'</td><td><b>'+fmtEur(s)+'</b></td>';
    hs.forEach(h => htmlT += '<td>'+(isNum(l.vals[h])&&Math.abs(l.vals[h])>=0.5?fmtEur(l.vals[h]):'·')+'</td>');
    htmlT += '</tr>';
  });
  htmlT += '</tbody></table>';
  $('rbTbl').innerHTML = htmlT;
}

/* =====================================================================
   VISTA · Conferência com o P&L
===================================================================== */
const CF_BLOCOS = [
  ['comprasCom','Compras Comidas'], ['comprasBeb','Compras Bebidas'],
  ['recCom','Receitas Comidas'], ['recBeb','Receitas Bebidas']
];
function cfClass(dif, base){
  const p = base ? Math.abs(dif)/Math.abs(base) : 0;
  if(Math.abs(dif) >= 1000 || p >= 0.01) return 'bad';
  if(Math.abs(dif) >= 200 || p >= 0.002) return 'warn';
  return 'ok';
}
function renderConf(){
  if(!DATA){ semDados('cfTbl'); $('cfCards').innerHTML=''; return; }
  const cf = DATA.conferencias || {};
  if(!Object.keys(cf).length){ $('cfTbl').innerHTML = '<div class="empty">Bloco de conferências não disponível — voltar a publicar o ficheiro.</div>'; $('cfCards').innerHTML=''; return; }
  const hs = hoteisAtivos();
  $('cfSub').textContent = 'Mês de '+MESES[(DATA.meta.mes||1)-1]+' '+(DATA.meta.ano||'')+' · valores do ficheiro vs. MAPA RESUMO (P&L)';
  $('cfCards').innerHTML = CF_BLOCOS.map(([k, lbl]) => {
    const b = cf[k]; if(!b) return '';
    const dif = soma(hs.map(h => b.dif[h]));
    const pl = soma(hs.map(h => b.pl[h]));
    const cls = cfClass(dif, pl);
    return '<div class="card"><div class="c-label">'+esc(lbl)+' · diferença total</div>'
      + '<div class="c-value" style="color:var(--'+(cls==='bad'?'bad':cls==='warn'?'warn':'ok')+')">'+fmtEur(dif)+'</div>'
      + '<div class="c-note">P&L: '+fmtEur(pl)+'</div></div>';
  }).join('');
  let htmlT = '<table class="tbl"><thead><tr><th>Hotel</th>';
  CF_BLOCOS.forEach(([k,lbl]) => htmlT += '<th>'+esc(lbl)+' Δ</th><th>Δ %</th>');
  htmlT += '</tr></thead><tbody>';
  const linhas = hs.map(h => {
    const difs = CF_BLOCOS.map(([k]) => {
      const b = cf[k]; if(!b) return {dif:null, pl:null};
      return {dif:b.dif[h], pl:b.pl[h]};
    });
    const score = difs.reduce((s,x)=>s+Math.abs(x.dif||0),0);
    return {h, difs, score};
  }).sort((a,b)=>b.score-a.score);
  linhas.forEach(({h, difs}) => {
    htmlT += '<tr><td class="hname" onclick="irParaHotel(\''+h.replace(/'/g,"\\'")+'\')">'+esc(h)+'<span class="reg-tag">'+esc(regiaoDe(h))+'</span></td>';
    difs.forEach(x => {
      if(!isNum(x.dif)){ htmlT += '<td>—</td><td>—</td>'; return; }
      const cls = cfClass(x.dif, x.pl);
      const p = x.pl ? x.dif/Math.abs(x.pl) : null;
      htmlT += '<td><span class="sem '+cls+'">'+fmtEur(x.dif)+'</span></td><td>'+(isNum(p)?fmtPct(p,2):'—')+'</td>';
    });
    htmlT += '</tr>';
  });
  htmlT += '</tbody></table>';
  $('cfTbl').innerHTML = htmlT;
}

function renderHotelAuto(){
  if(!DATA) return;
  const h = $('ahHotel').value || DATA.hoteis[0];
  const m = +($('ahMesAuto').value) || (DATA.meta.mesesComDados||[]).slice(-1)[0];
  if(!m){ $('ahAutoTexto').textContent = 'Sem meses com dados.'; return; }
  $('ahAutoTexto').textContent = gerarComentario(h, m).texto;
}

/* =====================================================================
   VISTA · Previsão de Compras
===================================================================== */
function pvHotelOptions(){
  if(!DATA) return;
  const sel = $('pvHotel'); const cur = sel.value;
  sel.innerHTML = '<option value="__sel">Σ Hotéis da seleção (região/tipologia)</option>' + DATA.hoteis.map(h => '<option>'+esc(h)+'</option>').join('');
  if([...sel.options].some(o => o.value === cur)) sel.value = cur;
  else if(CURRENT_USER && CURRENT_USER.hotel && DATA.hoteis.indexOf(CURRENT_USER.hotel) >= 0) sel.value = CURRENT_USER.hotel;
}
function pvSubOptions(){
  const nivel = $('pvNivel').value;
  $('pvSub').style.display = nivel === 'art' ? '' : 'none';
  if(nivel !== 'art' || !DATA) return;
  const tp = $('pvTipo').value;
  const ds = DATA.acumulado[tp] || (DATA.mensal[tp]||{})[ultimoMesDados()];
  const subs = ds ? ds.ordem.filter(s => s.indexOf('TOTAL') !== 0 && s.indexOf('CUSTOS') !== 0) : [];
  const sel = $('pvSub'); const cur = sel.value;
  sel.innerHTML = '<option value="__all">Todas as sub-famílias</option>' + subs.map(s => '<option>'+esc(s)+'</option>').join('');
  if([...sel.options].some(o => o.value === cur)) sel.value = cur;
}
function pvHorizonte(){
  const v = $('pvHoriz').value;
  return v === 'resto' ? horizonteRestoAno() : v === 'tudo' ? horizonteTudo() : horizonteN(3);
}
/* agrega previsão para um conjunto de hotéis */
function preverConjunto(hoteis, horizonte, tp){
  const acc = {};   // sf -> art -> {key->€}
  const bnMes = {};
  hoteis.forEach(h => {
    const p = preverArtigos(h, horizonte);
    horizonte.forEach(({ano,mes}) => { const k=ano+'-'+mes; bnMes[k]=(bnMes[k]||0)+((p.bnMes[k])||0); });
    Object.keys(p[tp]||{}).forEach(sf => {
      acc[sf] = acc[sf] || {};
      Object.keys(p[tp][sf]).forEach(a => {
        acc[sf][a] = acc[sf][a] || {};
        Object.keys(p[tp][sf][a]).forEach(k => { acc[sf][a][k] = (acc[sf][a][k]||0) + p[tp][sf][a][k]; });
      });
    });
  });
  return { acc, bnMes };
}
function renderPrevisao(){
  $('pvAviso').innerHTML = '';
  if(!DATA){ semDados('pvCards'); $('pvTbl').innerHTML=''; destroyChart('chartPrevisao'); return; }
  if(!temRoomnights()){
    $('pvCards').innerHTML=''; $('pvTbl').innerHTML='';
    $('pvAviso').innerHTML = '<div class="panel"><div class="empty">Ainda não há roomnights publicadas.<br>A Direção de Operações pode carregá-las em «Carregar Dados» → Roomnights / Ocupação.</div></div>';
    destroyChart('chartPrevisao'); return;
  }
  /* modo unidade: euros (default) ou quantidades reais */
  const unidade = ($('pvUnidade') && $('pvUnidade').value) || 'eur';
  /* o cenário (ocupação/preço) e o gráfico só se aplicam ao modo euros */
  if($('pvCenarioPanel')) $('pvCenarioPanel').style.display = (unidade==='qtd') ? 'none' : '';
  const chartWrap = window.AB35Root.querySelector('#view-previsao .chart-box');
  if(chartWrap && chartWrap.closest('.panel')) chartWrap.closest('.panel').style.display = (unidade==='qtd') ? 'none' : '';
  if(unidade === 'qtd'){ if($('pvRupturaPanel')) $('pvRupturaPanel').style.display='none'; renderPrevisaoQtd(); return; }
  const horizonte = pvHorizonte();
  if(!horizonte.length){
    $('pvCards').innerHTML=''; $('pvTbl').innerHTML='';
    $('pvAviso').innerHTML = '<div class="panel"><div class="empty">Não há meses futuros com roomnights previstas para este horizonte.</div></div>';
    destroyChart('chartPrevisao'); return;
  }
  const tp = $('pvTipo').value;
  const nivel = $('pvNivel').value;
  const escolhaH = $('pvHotel').value || '__sel';
  const hoteis = escolhaH === '__sel' ? hoteisAtivos() : [escolhaH];
  const histOn = !!(DATA_HIST && DATA_HIST.meta && DATA_HIST.meta.ano === DATA.meta.ano-1);
  $('pvSub').style.display = nivel === 'art' ? '' : 'none';

  const { acc, bnMes } = preverConjunto(hoteis, horizonte, tp);
  const keys = horizonte.map(x => x.ano+'-'+x.mes);
  const labels = horizonte.map(x => mesLabel(x.ano, x.mes));

  let totGeral = 0; const totMes = {};
  keys.forEach(k => totMes[k] = 0);
  Object.keys(acc).forEach(sf => Object.keys(acc[sf]).forEach(a => keys.forEach(k => { const v = acc[sf][a][k]||0; totGeral += v; totMes[k] += v; })));
  const bnTot = keys.reduce((s,k)=>s+(bnMes[k]||0),0);

  /* inputs de edição de roomnights por mês (total do portefólio da seleção) */
  const bnEditBox = $('pvBnEdit');
  if(bnEditBox){
    bnEditBox.innerHTML = horizonte.map(({ano,mes}) => {
      const k = ano+'-'+mes;
      const tot = Math.round(hoteis.reduce((s,h)=>s+bnAjustada(h,ano,mes),0));
      return '<div style="text-align:center"><div style="font-size:10px;color:var(--text-3);margin-bottom:3px">'+mesLabel(ano,mes)+'</div>'
        + '<input class="inp" style="width:84px;text-align:right;padding:5px 7px" type="number" value="'+tot+'" '
        + 'onchange="editarBnMes(\''+k+'\', +this.value)"></div>';
    }).join('');
  }
  const cenAtivo = SCENARIO.ocup!==1 || SCENARIO.preco!==1 || Object.keys(SCENARIO.bnEdit).length>0;
  $('pvCenarioResumo').textContent = cenAtivo
    ? 'Cenário ativo: ocupação '+((SCENARIO.ocup-1)*100>=0?'+':'')+Math.round((SCENARIO.ocup-1)*100)+'% · preço '+((SCENARIO.preco-1)*100>=0?'+':'')+Math.round((SCENARIO.preco-1)*100)+'%'+(Object.keys(SCENARIO.bnEdit).length?' · roomnights editadas manualmente':'')
    : 'Cenário base (sem ajustes).';
  const nomeSel = escolhaH==='__sel' ? (selectedRegion+(selectedTip!=='Todas'?' · '+selectedTip:'')) : escolhaH;
  $('pvSub').closest && 0;
  window.AB35Root.querySelector('#pvSub');
  const subEl = window.AB35Root.getElementById('pvSub');
  // subtítulo da vista
  const sub2 = window.AB35Root.querySelector('#view-previsao .vh-sub');
  if(sub2) sub2.textContent = nomeSel+' · '+labels[0]+' – '+labels[labels.length-1]+(histOn?' · método misto com histórico '+(DATA.meta.ano-1):' · base roomnights');

  $('pvCards').innerHTML = [
    card('Compras previstas ('+(tp==='com'?'comidas':'bebidas')+')', fmtEur(totGeral), labels[0]+' – '+labels[labels.length-1], ''),
    card('Roomnights previstas', fmtNum(bnTot), horizonte.length+' meses', ''),
    card('Custo médio / roomnight', fmtEur(bnTot>0?totGeral/bnTot:null,2), 'no horizonte', ''),
    card('Método', histOn?'Misto':'Roomnights', histOn?'sazonalidade '+(DATA.meta.ano-1):'sem histórico anual', '')
  ].join('');

  const subEsc = (nivel === 'art') ? (subEl.value || '__all') : null;
  let ht = '<table class="tbl"><thead><tr><th>'+(nivel==='art'?'Artigo':'Sub-família')+'</th>';
  labels.forEach(l => ht += '<th>'+l+'</th>');
  ht += '<th>Total</th></tr></thead><tbody>';

  if(nivel === 'sub'){
    const linhas = Object.keys(acc).map(sf => {
      const porMes = {}; let tot = 0;
      keys.forEach(k => { let s=0; Object.keys(acc[sf]).forEach(a => s += acc[sf][a][k]||0); porMes[k]=s; tot+=s; });
      return {sf, porMes, tot};
    }).filter(x => x.tot > 0.5).sort((a,b)=>b.tot-a.tot);
    linhas.forEach(l => {
      ht += '<tr><td class="hname">'+esc(l.sf)+'</td>';
      keys.forEach(k => ht += '<td>'+fmtEur(l.porMes[k])+'</td>');
      ht += '<td><b>'+fmtEur(l.tot)+'</b></td></tr>';
    });
  } else {
    const linhas = [];
    Object.keys(acc).forEach(sf => {
      if(subEsc !== '__all' && sf !== subEsc) return;
      Object.keys(acc[sf]).forEach(a => {
        const porMes = {}; let tot = 0;
        keys.forEach(k => { porMes[k]=acc[sf][a][k]||0; tot+=porMes[k]; });
        if(tot > 0.5) linhas.push({nome:sf+' / '+a, porMes, tot});
      });
    });
    linhas.sort((a,b)=>b.tot-a.tot);
    linhas.forEach(l => {
      ht += '<tr><td>'+esc(l.nome)+'</td>';
      keys.forEach(k => ht += '<td>'+fmtEur(l.porMes[k])+'</td>');
      ht += '<td><b>'+fmtEur(l.tot)+'</b></td></tr>';
    });
  }
  ht += '<tr class="total"><td>TOTAL</td>';
  keys.forEach(k => ht += '<td>'+fmtEur(totMes[k])+'</td>');
  ht += '<td>'+fmtEur(totGeral)+'</td></tr>';
  ht += '<tr class="total"><td>Roomnights</td>';
  keys.forEach(k => ht += '<td>'+fmtNum(bnMes[k])+'</td>');
  ht += '<td>'+fmtNum(bnTot)+'</td></tr>';
  ht += '</tbody></table>';
  $('pvTbl').innerHTML = ht;

  /* alertas de rutura: stock atual vs consumo previsto do 1º mês do horizonte */
  renderRuptura(hoteis, horizonte[0]);

  mkChart('chartPrevisao', {
    type:'bar',
    data:{ labels, datasets:[
      { label:'Compras previstas (€)', data:keys.map(k => totMes[k]||0), backgroundColor:'rgba(201,162,75,.7)', borderRadius:4, yAxisID:'y' },
      { label:'Roomnights', type:'line', data:keys.map(k => bnMes[k]||0), borderColor:'#4f8fd8', tension:.3, pointRadius:3, yAxisID:'y1' }
    ]},
    options:{ responsive:true, maintainAspectRatio:false,
      scales:{ y:{ position:'left', ticks:{ callback:v=>Math.round(v/1000)+'k€' } },
               y1:{ position:'right', grid:{ drawOnChartArea:false } } },
      plugins:{ tooltip:{ callbacks:{ label:c => c.dataset.label+': '+(c.dataset.label.indexOf('Bed')>=0?fmtNum(c.parsed.y):fmtEur(c.parsed.y)) } } } }
  });
}
function renderRuptura(hoteis, primeiro){
  const panel = $('pvRupturaPanel'); const box = $('pvRuptura');
  if(!primeiro || !panel){ if(panel) panel.style.display='none'; return; }
  const { ano, mes } = primeiro;
  /* previsão por artigo agregada */
  const acc = {};
  hoteis.forEach(h => {
    const pr = preverArtigos(h, [{ano, mes}]);
    ['com','beb'].forEach(tp => Object.keys(pr[tp]||{}).forEach(sf => Object.keys(pr[tp][sf]).forEach(a => {
      if(!ehArtigoCompravel(a)) return;
      const key = sf+'|'+a;
      acc[key] = acc[key] || {sf, a, prev:0};
      acc[key].prev += pr[tp][sf][a][ano+'-'+mes]||0;
    })));
  });
  const linhas = Object.values(acc).map(x => {
    const stock = stockAtualArtigo(x.a.toUpperCase(), hoteis);
    const cobertura = x.prev > 0 ? stock/x.prev : null;   // fração do mês que o stock cobre
    return { ...x, stock, cobertura };
  }).filter(x => x.prev >= 100 && isNum(x.cobertura) && x.cobertura < 0.5)  // stock cobre < metade do mês
    .sort((a,b) => a.cobertura - b.cobertura);
  if(!linhas.length){ panel.style.display='none'; return; }
  panel.style.display='';
  let ht = '<table class="tbl"><thead><tr><th>Artigo</th><th>Sub-família</th><th>Stock atual</th><th>Consumo previsto ('+mesLabel(ano,mes)+')</th><th>Cobertura</th></tr></thead><tbody>';
  linhas.slice(0,25).forEach(l => {
    const dias = Math.round(l.cobertura*30);
    ht += '<tr><td style="color:var(--bad)">'+esc(l.a)+'</td><td style="color:var(--text-3);font-size:10.5px">'+esc(l.sf)+'</td>'
      + '<td>'+fmtEur(l.stock)+'</td><td>'+fmtEur(l.prev)+'</td>'
      + '<td><span class="sem bad">~'+dias+' dias</span></td></tr>';
  });
  ht += '</tbody></table>';
  box.innerHTML = ht;
}
function onCenario(){
  const o = +$('pvOcup').value, p = +$('pvPreco').value;
  SCENARIO.ocup = 1 + o/100;
  SCENARIO.preco = 1 + p/100;
  $('pvOcupLbl').textContent = (o>0?'+':'')+o+'%';
  $('pvPrecoLbl').textContent = (p>0?'+':'')+p+'%';
  renderPrevisao();
}
function resetCenario(){
  SCENARIO = { ocup:1.0, preco:1.0, ocupMes:{}, bnEdit:{} };
  $('pvOcup').value = 0; $('pvPreco').value = 0;
  $('pvOcupLbl').textContent = '0%'; $('pvPrecoLbl').textContent = '0%';
  renderPrevisao();
}
/* aplica edição manual do total de roomnights de um mês, repartindo pelos hotéis
   na proporção das roomnights base (ajustadas por ocupação) desse mês */
function editarBnMes(km, novoTotal){
  const [ano, mes] = km.split('-').map(Number);
  const hoteis = hoteisAtivos();
  const base = {}; let baseTot = 0;
  hoteis.forEach(h => { const b = (bnDe(h,ano)[mes])||0; base[h] = b; baseTot += b; });
  /* limpar edições antigas deste mês */
  Object.keys(SCENARIO.bnEdit).forEach(k => { if(k.endsWith('|'+km)) delete SCENARIO.bnEdit[k]; });
  if(baseTot > 0 && isNum(novoTotal)){
    hoteis.forEach(h => { SCENARIO.bnEdit[h+'|'+km] = novoTotal * (base[h]/baseTot); });
  }
  renderPrevisao();
}
/* Previsão em QUANTIDADES (unidades reais), no mesmo layout da previsão em €.
   Usa preverQuantidadesHotel (consumo por balanço quando o ficheiro tem TIPO). */
function renderPrevisaoQtd(){
  destroyChart('chartPrevisao');
  if(!temQuantidades()){
    $('pvCards').innerHTML=''; $('pvTbl').innerHTML='';
    $('pvAviso').innerHTML = '<div class="panel"><div class="empty">Ainda não há quantidades publicadas.<br>Carrega o ficheiro da «Pivot livre» em «Carregar Dados» → Quantidades por artigo, para veres a previsão em unidades.</div></div>';
    return;
  }
  const horizonte = pvHorizonte();
  if(!horizonte.length){
    $('pvCards').innerHTML=''; $('pvTbl').innerHTML='';
    $('pvAviso').innerHTML = '<div class="panel"><div class="empty">Não há meses futuros com roomnights previstas para este horizonte.</div></div>';
    return;
  }
  const escolhaH = $('pvHotel').value || '__sel';
  const hoteis = (escolhaH === '__sel' ? hoteisAtivos() : [escolhaH]).filter(h => QTD.hoteis.indexOf(h)>=0);
  const keys = horizonte.map(x => x.ano+'-'+x.mes);
  const labels = horizonte.map(x => mesLabel(x.ano, x.mes));
  const nomeSel = escolhaH==='__sel' ? (selectedRegion+(selectedTip!=='Todas'?' · '+selectedTip:'')) : escolhaH;

  /* acumular previsão de quantidades por artigo e mês */
  const acc = {};   // artigo -> {key: qtd}
  hoteis.forEach(h => {
    const pr = preverQuantidadesHotel(h, horizonte);
    Object.keys(pr).forEach(art => {
      acc[art] = acc[art] || {};
      keys.forEach(k => { if(isNum(pr[art][k])) acc[art][k] = (acc[art][k]||0) + pr[art][k]; });
    });
  });
  const linhas = Object.keys(acc).map(art => {
    const porMes = {}; let tot=0;
    keys.forEach(k => { const v = acc[art][k]||0; porMes[k]=v; tot+=v; });
    return { art, un:QTD.unidades[art]||'', porMes, tot };
  }).filter(x => x.tot > 0).sort((a,b)=>b.tot-a.tot);

  const sub2 = window.AB35Root.querySelector('#view-previsao .vh-sub');
  if(sub2) sub2.textContent = nomeSel+' · '+labels[0]+' – '+labels[labels.length-1]+' · previsão em unidades';

  const totGeral = linhas.reduce((s,l)=>s+l.tot,0);
  $('pvCards').innerHTML = [
    card('Artigos previstos', fmtNum(linhas.length), 'em unidades', ''),
    card('Horizonte', labels[0]+' – '+labels[labels.length-1], horizonte.length+' meses', ''),
    card('Fonte', 'Quantidades '+QTD.ano, QTD.formato==='tipo'?'consumo por balanço':'consumo aproximado', '')
  ].join('');
  if($('pvLegenda')) $('pvLegenda').innerHTML = '<span>Previsão em <b>unidades reais</b> (kg, litros, caixas…). '+(QTD.formato==='tipo'?'Consumo calculado por balanço de stock.':'Consumo aproximado (ficheiro sem TIPO).')+' Aplica-se quantidade/roomnight × roomnights previstas, com sazonalidade. <b>A previsão é sempre uma aproximação com margem de erro.</b></span>';

  let ht = '<table class="tbl"><thead><tr><th>Artigo</th><th>Un.</th>';
  labels.forEach(l => ht += '<th>'+l+'</th>');
  ht += '<th>Total</th></tr></thead><tbody>';
  linhas.slice(0, 600).forEach(l => {
    ht += '<tr><td>'+esc(l.art)+'</td><td style="color:var(--text-3)">'+esc(l.un||'—')+'</td>';
    keys.forEach(k => ht += '<td>'+fmtQtd(l.porMes[k])+'</td>');
    ht += '<td><b>'+fmtQtd(l.tot)+'</b></td></tr>';
  });
  ht += '</tbody></table>';
  if(linhas.length > 600) ht += '<div class="note">A mostrar 600 de '+linhas.length+' artigos.</div>';
  if(!linhas.length) ht = '<div class="empty">Sem previsão de quantidades para esta seleção.</div>';
  $('pvTbl').innerHTML = ht;
}
function copiarPrevisao(){
  const t = $('pvTbl').innerText.replace(/\t/g,'; ');
  copiarTexto(t);
}
async function emailPrevisao(){
  if(!DATA || !temRoomnights()){ toast('Sem dados para gerar o email.'); return; }
  const escolhaH = $('pvHotel').value;
  if(escolhaH === '__sel' || !escolhaH){ toast('Escolhe um hotel específico para enviar o email.'); return; }
  const hz = pvHorizonte(); if(!hz.length){ toast('Sem meses futuros no horizonte.'); return; }
  const { ano, mes } = hz[0];
  const { assunto, corpo, corpoCurto } = construirEmailHotel(escolhaH, ano, mes, 7);
  let dest = await emailDoHotel(escolhaH);
  const resp = prompt('Email do diretor do '+escolhaH+':', dest || '');
  if(resp === null) return;
  dest = resp.trim();
  if(dest) guardarEmailHotel(escolhaH, dest);
  if(confirm('Gerar também o PDF da posição de compra para anexar ao email?\n\n(OK = gera o PDF e abre o email; depois arrasta o PDF para o email.)')){
    await descarregarPDF(escolhaH, ano, mes, 7);
  }
  await abrirEmail(dest, assunto, corpoCurto, corpo);
  audit('email_previsao', escolhaH+' · '+MESES[mes-1]+' '+ano);
}

/* =====================================================================
   VISTA · Roomnights
===================================================================== */
function rnAnoOptions(){
  if(!temRoomnights()) return;
  const sel = $('bnAno'); const cur = sel.value;
  sel.innerHTML = ROOMNIGHTS.anos.map(a => '<option>'+a+'</option>').join('');
  if([...sel.options].some(o => o.value === cur)) sel.value = cur;
}
function renderRoomnights(){
  $('bnAviso').innerHTML = '';
  if(!temRoomnights()){
    $('bnTbl').innerHTML = '';
    $('bnAviso').innerHTML = '<div class="panel"><div class="empty">Ainda não há roomnights publicadas.</div></div>';
    return;
  }
  const ano = +$('bnAno').value || ROOMNIGHTS.anos[ROOMNIGHTS.anos.length-1];
  const seg = $('bnSeg').value;
  const src = seg==='ind'?ROOMNIGHTS.ind : seg==='grp'?ROOMNIGHTS.grp : seg==='drhp'?ROOMNIGHTS.drhp : ROOMNIGHTS.total;
  if(!src){ $('bnTbl').innerHTML = '<div class="empty">Segmento não disponível neste ficheiro.</div>'; return; }
  const hs = hoteisAtivos().filter(h => src[h] && src[h][ano]);
  let ht = '<table class="tbl hm"><thead><tr><th>Hotel</th>';
  MESES.forEach(m => ht += '<th>'+m.slice(0,3)+'</th>');
  ht += '<th>Total</th></tr></thead><tbody>';
  const totMes = {};
  hs.forEach(h => {
    const o = src[h][ano] || {};
    let tot = 0;
    ht += '<tr><td class="hname">'+esc(h)+'</td>';
    for(let m=1;m<=12;m++){ const v = o[m]||0; tot+=v; totMes[m]=(totMes[m]||0)+v; ht += '<td>'+(v?fmtNum(v):'·')+'</td>'; }
    ht += '<td><b>'+fmtNum(tot)+'</b></td></tr>';
  });
  ht += '<tr class="total"><td>TOTAL</td>';
  let g=0; for(let m=1;m<=12;m++){ ht += '<td>'+fmtNum(totMes[m]||0)+'</td>'; g+=totMes[m]||0; }
  ht += '<td>'+fmtNum(g)+'</td></tr></tbody></table>';
  $('bnTbl').innerHTML = ht;
}

/* =====================================================================
   VISTA · Quantidades por Artigo
===================================================================== */
function qtOptions(){
  if(!temQuantidades()) return;
  const selH = $('qtHotel'); const curH = selH.value;
  selH.innerHTML = '<option value="__sel">Σ Hotéis da seleção</option>' + QTD.hoteis.map(h => '<option>'+esc(h)+'</option>').join('');
  if([...selH.options].some(o => o.value === curH)) selH.value = curH;
  const modo = $('qtModo').value;
  const selP = $('qtPeriodo'); const curP = selP.value;
  if(modo === 'consumo'){
    const meses = mesesQtd();
    selP.innerHTML = '<option value="acu">Acumulado '+QTD.ano+'</option>' + meses.map(m => '<option value="'+m+'">'+MESES[m-1]+' '+QTD.ano+'</option>').join('');
  } else {
    const fut = temRoomnights() ? mesesComRoomnightFuturas() : [];
    selP.innerHTML = fut.map(x => '<option value="'+x.ano+'-'+x.mes+'">'+MESES[x.mes-1]+' '+x.ano+'</option>').join('');
  }
  if([...selP.options].some(o => o.value === curP)) selP.value = curP;
}
function renderQuantidades(){
  $('qtAviso').innerHTML = '';
  if(!temQuantidades()){
    $('qtCards').innerHTML=''; $('qtTbl').innerHTML='';
    $('qtAviso').innerHTML = '<div class="panel"><div class="empty">Ainda não há quantidades publicadas.<br>Carrega o ficheiro da «Pivot livre» em «Carregar Dados» → Quantidades por artigo.</div></div>';
    return;
  }
  qtOptions();
  const modo = $('qtModo').value;
  const escolhaH = $('qtHotel').value || '__sel';
  const hs = escolhaH === '__sel' ? hoteisAtivos().filter(h => QTD.hoteis.indexOf(h)>=0) : [escolhaH];
  const filtro = ($('qtFiltro').value||'').trim().toUpperCase();
  const nomeSel = escolhaH==='__sel' ? (selectedRegion+(selectedTip!=='Todas'?' · '+selectedTip:'')) : escolhaH;

  let linhas = [];   // {art, un, qtd}
  if(modo === 'consumo'){
    const periodo = $('qtPeriodo').value || 'acu';
    const meses = periodo==='acu' ? mesesQtd() : [ +periodo ];
    $('qtSub').textContent = nomeSel+' · consumo '+(periodo==='acu'?'acumulado '+QTD.ano:MESES[+periodo-1]+' '+QTD.ano);
    Object.keys(QTD.artigos).forEach(art => {
      let q = 0;
      hs.forEach(h => { const o = (QTD.artigos[art]||{})[h]||{}; meses.forEach(m => { if(isNum(o[m])) q += o[m]; }); });
      if(q > 0) linhas.push({ art, un:QTD.unidades[art]||'', qtd:q });
    });
  } else {
    if(!temRoomnights()){ $('qtAviso').innerHTML='<div class="panel"><div class="empty">A previsão de quantidades precisa de roomnights publicadas.</div></div>'; $('qtCards').innerHTML=''; $('qtTbl').innerHTML=''; return; }
    const mv = $('qtPeriodo').value; if(!mv){ $('qtTbl').innerHTML='<div class="empty">Sem meses futuros.</div>'; $('qtCards').innerHTML=''; return; }
    const [ano, mes] = mv.split('-').map(Number);
    $('qtSub').textContent = nomeSel+' · previsão '+MESES[mes-1]+' '+ano;
    const acc = {};
    hs.forEach(h => { const pr = preverQuantidadesHotel(h, [{ano, mes}]); Object.keys(pr).forEach(art => { acc[art] = (acc[art]||0) + (pr[art][ano+'-'+mes]||0); }); });
    Object.keys(acc).forEach(art => { if(acc[art] > 0) linhas.push({ art, un:QTD.unidades[art]||'', qtd:acc[art] }); });
  }
  if(filtro) linhas = linhas.filter(l => l.art.toUpperCase().indexOf(filtro) >= 0);
  linhas.sort((a,b) => b.qtd - a.qtd);

  $('qtCards').innerHTML = [
    card('Artigos com movimento', fmtNum(linhas.length), modo==='consumo'?'consumo':'previsão', ''),
    card('Hotéis', String(hs.length), nomeSel, ''),
    card('Fonte', 'Pivot livre '+QTD.ano, QTD.nArtigos+' artigos no total', '')
  ].join('');

  let ht = '<table class="tbl"><thead><tr><th>Artigo</th><th>Unidade</th><th>Quantidade</th></tr></thead><tbody>';
  linhas.slice(0, 500).forEach(l => {
    ht += '<tr><td>'+esc(l.art)+'</td><td style="color:var(--text-3)">'+esc(l.un||'—')+'</td><td><b>'+fmtQtd(l.qtd)+'</b></td></tr>';
  });
  ht += '</tbody></table>';
  if(linhas.length > 500) ht += '<div class="note">A mostrar os 500 artigos com maior quantidade (de '+linhas.length+'). Usa o filtro para refinar.</div>';
  $('qtTbl').innerHTML = ht;
}
function fmtQtd(v){ if(!isNum(v)) return '—'; return v.toLocaleString('pt-PT', {minimumFractionDigits:0, maximumFractionDigits:1}); }
function copiarQuantidades(){ copiarTexto($('qtTbl').innerText.replace(/\t/g,'; ')); }

/* =====================================================================
   VISTA · Excessos de Stock (em quantidades, usa o inventário do ficheiro com TIPO)
===================================================================== */
function temInventarioQtd(){ return !!(QTD && QTD.formato === 'tipo' && QTD.inventario && Object.keys(QTD.inventario).length); }
function exOptions(){
  if(!temInventarioQtd()) return;
  const selH = $('exHotel'); const curH = selH.value;
  selH.innerHTML = '<option value="__sel">Σ Hotéis da seleção</option>' + QTD.hoteis.map(h => '<option>'+esc(h)+'</option>').join('');
  if([...selH.options].some(o => o.value === curH)) selH.value = curH;
}
/* stock atual (inventário do último mês disponível) de um artigo, para um conjunto de hotéis */
function stockAtualQtd(art, hs){
  const inv = QTD.inventario[art]; if(!inv) return 0;
  const ultMes = Math.max(...QTD.meses);
  let s = 0;
  hs.forEach(h => { const o = inv[h]; if(o){ /* último mês com valor <= ultMes */
    let mm = ultMes; while(mm>=1 && !(mm in o)) mm--; if(mm>=1 && isNum(o[mm])) s += o[mm]; }});
  return s;
}
/* consumo mensal (por balanço) de um artigo para um conjunto de hotéis, segundo a base */
function consumoQtdMensal(art, hs, base){
  const c = QTD.artigos[art]; if(!c) return null;
  const meses = QTD.meses.slice().sort((a,b)=>a-b);
  if(!meses.length) return null;
  const somaMes = m => soma(hs.map(h => (c[h]||{})[m]));
  if(base === 'ult'){
    let mm = Math.max(...meses); while(mm>=1 && somaMes(mm)===0) mm--;
    const v = somaMes(mm); return v>0 ? v : null;
  }
  if(base === 'u3'){
    const ult3 = meses.slice(-3); let tot=0, n=0;
    ult3.forEach(m => { const v = somaMes(m); if(v>0){ tot+=v; n++; } });
    return n>0 ? tot/n : null;
  }
  /* acumulado: média sobre meses com consumo positivo */
  let tot=0, n=0; meses.forEach(m => { const v=somaMes(m); if(v>0){ tot+=v; n++; } });
  return n>0 ? tot/n : null;
}
function renderExcessos(){
  $('exAviso').innerHTML = '';
  if(!temInventarioQtd()){
    $('exCards').innerHTML=''; $('exTbl').innerHTML='';
    $('exAviso').innerHTML = '<div class="panel"><div class="empty">Os excessos de stock em quantidades precisam do ficheiro de quantidades <b>com TIPO</b> (COMPRA / INVENTARIO / TRANSFERÊNCIAS).<br>Carrega-o em «Carregar Dados» → Quantidades por artigo.</div></div>';
    return;
  }
  exOptions();
  const escolhaH = $('exHotel').value || '__sel';
  const hs = escolhaH === '__sel' ? hoteisAtivos().filter(h => QTD.hoteis.indexOf(h)>=0) : [escolhaH];
  const limite = +$('exLimite').value;
  const base = $('exBase').value;
  const filtro = ($('exFiltro').value||'').trim().toUpperCase();
  const nomeSel = escolhaH==='__sel' ? (selectedRegion+(selectedTip!=='Todas'?' · '+selectedTip:'')) : escolhaH;
  const ultMes = Math.max(...QTD.meses);
  $('exSub').textContent = nomeSel+' · stock a fim de '+MESES[ultMes-1]+' '+QTD.ano+' · cobertura > '+limite+' meses';

  const ord = ($('exOrd') && $('exOrd').value) || 'stock';
  let linhas = [];
  Object.keys(QTD.inventario).forEach(art => {
    const stock = stockAtualQtd(art, hs);
    if(stock < 5) return;   /* ignora restos irrisórios de inventário (1-4 unidades) */
    const consMes = consumoQtdMensal(art, hs, base);
    const cob = (isNum(consMes) && consMes > 0) ? stock/consMes : (stock>0 ? Infinity : null);
    if(cob !== null && cob >= limite){
      linhas.push({ art, un:QTD.unidades[art]||'', stock, consMes: isNum(consMes)?consMes:0, cob });
    }
  });
  if(filtro) linhas = linhas.filter(l => l.art.toUpperCase().indexOf(filtro) >= 0);
  if(ord === 'cob') linhas.sort((a,b) => (b.cob===Infinity?1e9:b.cob) - (a.cob===Infinity?1e9:a.cob));
  else linhas.sort((a,b) => b.stock - a.stock);   /* por defeito: maior stock parado primeiro */

  const semGiro = linhas.filter(l => l.cob === Infinity || l.consMes <= 0).length;
  $('exCards').innerHTML = [
    card('Artigos com excesso', fmtNum(linhas.length), 'cobertura > '+limite+' meses', ''),
    card('Sem rotação', fmtNum(semGiro), 'stock sem consumo recente', ''),
    card('Hotéis', String(hs.length), nomeSel, '')
  ].join('');

  let ht = '<table class="tbl"><thead><tr><th>Artigo</th><th>Unidade</th><th>Stock atual</th><th>Consumo/mês</th><th>Cobertura</th></tr></thead><tbody>';
  linhas.slice(0, 500).forEach(l => {
    const cobTxt = l.cob===Infinity ? 'sem giro' : l.cob.toFixed(1).replace('.',',')+' m';
    const cls = (l.cob===Infinity || l.cob>=6) ? 'bad' : l.cob>=limite ? 'warn' : 'ok';
    ht += '<tr><td>'+esc(l.art)+'</td><td style="color:var(--text-3)">'+esc(l.un||'—')+'</td>'
      + '<td><b>'+fmtQtd(l.stock)+'</b></td><td>'+(l.consMes>0?fmtQtd(l.consMes):'—')+'</td>'
      + '<td><span class="sem '+cls+'">'+cobTxt+'</span></td></tr>';
  });
  ht += '</tbody></table>';
  if(linhas.length > 500) ht += '<div class="note">A mostrar 500 de '+linhas.length+' artigos. Usa o filtro para refinar.</div>';
  if(!linhas.length) ht = '<div class="empty">Nenhum artigo com cobertura acima de '+limite+' meses nesta seleção. 👍</div>';
  $('exTbl').innerHTML = ht;
}
function copiarExcessos(){ copiarTexto($('exTbl').innerText.replace(/\t/g,'; ')); }

/* =====================================================================
   VISTA · Sugestão de Encomenda
===================================================================== */
function enOptions(){
  if(!DATA) return;
  const selH = $('enHotel'); const curH = selH.value;
  selH.innerHTML = '<option value="__sel">Σ Hotéis da seleção</option>' + DATA.hoteis.map(h => '<option>'+esc(h)+'</option>').join('');
  if([...selH.options].some(o => o.value === curH)) selH.value = curH;
  else if(CURRENT_USER && CURRENT_USER.hotel && DATA.hoteis.indexOf(CURRENT_USER.hotel) >= 0) selH.value = CURRENT_USER.hotel;
  const selM = $('enMes'); const curM = selM.value;
  const fut = temRoomnights() ? mesesComRoomnightFuturas() : [];
  selM.innerHTML = fut.map(x => '<option value="'+x.ano+'-'+x.mes+'">'+MESES[x.mes-1]+' '+x.ano+'</option>').join('');
  if([...selM.options].some(o => o.value === curM)) selM.value = curM;
}
/* stock atual (inventário final) de um artigo para um conjunto de hotéis */
function stockAtualArtigo(artUpper, hs){ return soma(hs.map(h => ((DATA.artStock.fim||{})[artUpper]||{})[h])); }
function linhasEncomenda(hs, ano, mes, tipoFiltro, diasSeg){
  const p = {};
  hs.forEach(h => {
    const pr = preverArtigos(h, [{ano, mes}]);
    ['com','beb'].forEach(tp => {
      if(tipoFiltro !== 'both' && tipoFiltro !== tp) return;
      Object.keys(pr[tp]||{}).forEach(sf => {
        Object.keys(pr[tp][sf]).forEach(a => {
          if(!ehArtigoCompravel(a)) return;
          const key = sf+'|'+a+'|'+tp;
          p[key] = p[key] || {sf, a, tp, prev:0};
          p[key].prev += pr[tp][sf][a][ano+'-'+mes]||0;
        });
      });
    });
  });
  const fatorSeg = diasSeg/30;  // fração de mês
  const linhas = Object.values(p).map(x => {
    const stock = stockAtualArtigo(x.a.toUpperCase(), hs);
    const seg = x.prev * fatorSeg;
    const enc = Math.max(0, x.prev + seg - stock);
    return { sf:x.sf, a:x.a, tp:x.tp, prev:x.prev, stock, seg, enc };
  }).filter(x => x.prev >= 20);
  return linhas;
}
/* Encomenda em QUANTIDADES (unidades reais), do ficheiro de quantidades.
   Mesma lógica do valor mas SEM descontar stock (o inventário em unidades vem misturado):
   a encomendar = consumo previsto do mês + margem de segurança (dias/30). */
function linhasEncomendaQtd(hs, ano, mes, diasSeg){
  if(!temQuantidades() || !temRoomnights()) return [];
  const fatorSeg = 1 + (diasSeg/30);
  const acc = {};
  hs.forEach(h => {
    const pr = preverQuantidadesHotel(h, [{ano, mes}]);
    Object.keys(pr).forEach(art => { acc[art] = (acc[art]||0) + (pr[art][ano+'-'+mes]||0); });
  });
  return Object.keys(acc).map(art => {
    const prev = acc[art];
    return { art, un:QTD.unidades[art]||'', prev, enc: prev * fatorSeg };
  }).filter(x => x.prev > 0).sort((a,b)=>b.enc-a.enc);
}
function renderEncomenda(){
  $('enAviso').innerHTML = '';
  if(!DATA){ semDados('enCards'); $('enTbl').innerHTML=''; return; }
  if(!temRoomnights()){
    $('enCards').innerHTML=''; $('enTbl').innerHTML='';
    $('enAviso').innerHTML = '<div class="panel"><div class="empty">Sem roomnights publicadas — a sugestão de encomenda precisa da previsão de ocupação.</div></div>';
    return;
  }
  enOptions();
  const mv = $('enMes').value; if(!mv){ $('enTbl').innerHTML = '<div class="empty">Sem meses futuros com roomnights.</div>'; $('enCards').innerHTML=''; return; }
  const [ano, mes] = mv.split('-').map(Number);
  const escolhaH = $('enHotel').value || '__sel';
  const hs = escolhaH === '__sel' ? hoteisAtivos() : [escolhaH];
  const tipo = $('enTipo').value;
  const dias = +$('enSeg').value;
  const soNec = $('enSoNec').checked;
  const nomeSel = escolhaH==='__sel' ? (selectedRegion+(selectedTip!=='Todas'?' · '+selectedTip:'')) : escolhaH;
  $('enSub').textContent = nomeSel+' · '+MESES[mes-1]+' '+ano+' · stock de segurança '+dias+' dias';

  let linhas = linhasEncomenda(hs, ano, mes, tipo, dias);
  const totPrev = soma(linhas.map(l => l.prev));
  const totStock = soma(linhas.map(l => l.stock));
  const totEnc = soma(linhas.map(l => l.enc));
  const nEnc = linhas.filter(l => l.enc > 0).length;
  $('enCards').innerHTML = [
    card('A encomendar (total)', fmtEur(totEnc), nEnc+' artigos a repor', ''),
    card('Consumo previsto', fmtEur(totPrev), MESES[mes-1], ''),
    card('Stock atual', fmtEur(totStock), 'fecho do último mês', ''),
    card('Cobertura do stock', (totPrev>0?(totStock/totPrev*30/30).toFixed(1).replace('.',','):'—')+' mês', 'stock ÷ consumo previsto', '')
  ].join('');

  if(soNec) linhas = linhas.filter(l => l.enc > 0);
  linhas.sort((a,b) => b.enc - a.enc);

  let ht = '<table class="tbl"><thead><tr><th>Artigo</th><th>Sub-família</th><th>Consumo previsto</th><th>Stock atual</th><th>Stock segurança</th><th>A encomendar</th></tr></thead><tbody>';
  ht += '<tr class="total"><td>TOTAL ('+linhas.length+' artigos)</td><td></td><td>'+fmtEur(soma(linhas.map(l=>l.prev)))+'</td><td>'+fmtEur(soma(linhas.map(l=>l.stock)))+'</td><td>'+fmtEur(soma(linhas.map(l=>l.seg)))+'</td><td>'+fmtEur(soma(linhas.map(l=>l.enc)))+'</td></tr>';
  linhas.forEach(l => {
    const urgente = l.stock < l.prev*0.25;   // stock cobre menos de ~1 semana do previsto
    ht += '<tr><td'+(urgente?' style="color:var(--warn)"':'')+'>'+(urgente?'⚠ ':'')+esc(l.a)+'</td>'
      + '<td style="color:var(--text-3);font-size:10.5px">'+esc(l.sf)+'</td>'
      + '<td>'+fmtEur(l.prev)+'</td><td>'+fmtEur(l.stock)+'</td><td>'+fmtEur(l.seg)+'</td>'
      + '<td><b'+(l.enc>0?' style="color:var(--gold-soft)"':'')+'>'+fmtEur(l.enc)+'</b></td></tr>';
  });
  ht += '</tbody></table>';

  /* secção de quantidades (unidades reais) — encomenda por artigo do ficheiro de quantidades */
  const verUnid = $('enUnid') && $('enUnid').checked;
  if(verUnid && temQuantidades() && temRoomnights()){
    const ql = linhasEncomendaQtd(hs, ano, mes, dias);
    ht += '<div style="margin-top:20px"><h3 style="margin:0 0 4px">Encomenda por artigo em quantidades (unidades) — '+esc(MESES[mes-1])+' '+ano+'</h3>'
        + '<p class="note" style="margin:0 0 8px">A encomendar = consumo previsto + margem de segurança ('+dias+' dias). Em unidades reais (kg, litros, caixas…), do ficheiro de quantidades — nível de artigo detalhado, distinto da lista de € acima. Sem desconto de stock (o inventário em unidades não está isolado no ficheiro).</p>'
        + '<table class="tbl"><thead><tr><th>Artigo</th><th>Unidade</th><th>Consumo previsto</th><th>A encomendar</th></tr></thead><tbody>';
    ql.slice(0, 400).forEach(l => { ht += '<tr><td>'+esc(l.art)+'</td><td style="color:var(--text-3)">'+esc(l.un||'—')+'</td><td>'+fmtQtd(l.prev)+'</td><td><b style="color:var(--gold-soft)">'+fmtQtd(l.enc)+'</b></td></tr>'; });
    ht += '</tbody></table>';
    if(ql.length > 400) ht += '<div class="note">A mostrar 400 de '+ql.length+' artigos. Usa a vista «Quantidades por Artigo» para a lista completa.</div>';
    ht += '</div>';
  }

  $('enTbl').innerHTML = ht;
}
function copiarEncomenda(){ copiarTexto($('enTbl').innerText.replace(/\t/g,'; ')); }

/* email guardado por hotel (partilhado) */
async function emailDoHotel(h){
  try{ const m = await apiRetry('get','emails_diretores', null, 2); return (m && m[h]) || ''; }catch(e){ return ''; }
}
/* carrega o jsPDF só quando é preciso gerar um PDF */
let _jspdfPromise = null;
function carregarJsPDF(){
  if(window.jspdf && window.jspdf.jsPDF) return Promise.resolve();
  if(_jspdfPromise) return _jspdfPromise;
  _jspdfPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Não foi possível carregar o gerador de PDF (sem ligação?).'));
    document.head.appendChild(s);
  });
  return _jspdfPromise;
}
/* copia o texto de forma fiável (devolve true/false) */
async function copiarFiavel(t){
  try{ await navigator.clipboard.writeText(t); return true; }
  catch(e){
    try{ const ta=document.createElement('textarea'); ta.value=t; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.focus(); ta.select(); const ok=document.execCommand('copy'); ta.remove(); return ok; }
    catch(e2){ return false; }
  }
}
/* Abre o email. O corpo vai SEMPRE por clipboard (o mailto do Outlook ignora corpos longos).
   Abre o cliente com destinatário + assunto, e instrui o utilizador a colar (Ctrl+V). */
/* Gera o PDF de posição de compra para um hotel e mês. Devolve o objeto jsPDF (não grava). */
async function gerarPDFPosicao(h, ano, mes, dias){
  await carregarJsPDF();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:'pt', format:'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 44;                       // margem
  let y = M;
  const nomeMes = MESES[mes-1]+' '+ano;
  const GOLD = [176,141,74], DARK = [30,36,54], GREY = [110,120,140], LINE = [220,224,232];

  const nl = (n=14) => { y += n; if(y > doc.internal.pageSize.getHeight() - M){ doc.addPage(); y = M; } };
  const txt = (s, x, opt) => doc.text(String(s), (x==null?M:x), y, opt);

  /* cabeçalho */
  doc.setFillColor(...DARK); doc.rect(0, 0, W, 70, 'F');
  doc.setTextColor(...GOLD); doc.setFont('helvetica','bold'); doc.setFontSize(17);
  doc.text('VG · Custos A&B', M, 34);
  doc.setTextColor(255,255,255); doc.setFont('helvetica','normal'); doc.setFontSize(11);
  doc.text('Posição de compra — '+h, M, 52);
  doc.setTextColor(210,210,210); doc.setFontSize(9);
  doc.text(nomeMes, W-M, 52, {align:'right'});
  y = 94;

  /* aviso de cautela */
  doc.setTextColor(150,110,30); doc.setFont('helvetica','italic'); doc.setFontSize(8.5);
  const aviso = doc.splitTextToSize('Ponto de partida gerado automaticamente a partir do histórico e das roomnights previstas. Validar com o conhecimento da operação (eventos, reservas de grupo, promoções) antes de encomendar.', W-2*M);
  doc.text(aviso, M, y); y += aviso.length*11 + 8;

  /* situação do hotel */
  const r = DATA.resumo[h] || {};
  const bn = temRoomnights() ? bnDe(h, ano)[mes] : null;
  doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(...DARK);
  txt('Situação atual do hotel'); nl(16);
  doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(60,60,70);
  txt('Food cost (consumo): '+fmtPct(r.fcConsumo)+'      Beverage cost: '+fmtPct(r.bcConsumo), M); nl(13);
  if(isNum(bn)){ txt('Roomnights previstas para '+nomeMes+': '+fmtNum(bn), M); nl(13); }
  nl(6);

  /* previsão por família */
  const p = preverArtigos(h, [{ano, mes}]);
  const k = ano+'-'+mes;
  const porSub = {}; let totCom = 0, totBeb = 0;
  ['com','beb'].forEach(tp => Object.keys(p[tp]||{}).forEach(sf => {
    let s = 0; Object.keys(p[tp][sf]).forEach(a => { if(ehArtigoCompravel(a)) s += p[tp][sf][a][k]||0; });
    if(s>0){ porSub[sf] = (porSub[sf]||0)+s; if(tp==='com') totCom+=s; else totBeb+=s; }
  }));
  doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(...DARK);
  txt('Consumo previsto por família — '+nomeMes); nl(18);
  doc.setFontSize(9.5);
  const famOrd = Object.entries(porSub).sort((a,b)=>b[1]-a[1]);
  famOrd.forEach(([sf,v]) => {
    doc.setFont('helvetica','normal'); doc.setTextColor(60,60,70);
    txt(sf, M);
    doc.text(fmtEur(v), W-M, y, {align:'right'});
    nl(13);
  });
  doc.setDrawColor(...LINE); doc.line(M, y, W-M, y); nl(13);
  doc.setFont('helvetica','bold'); doc.setTextColor(...DARK);
  txt('Total comidas: '+fmtEur(totCom)+'    Total bebidas: '+fmtEur(totBeb), M);
  doc.text('TOTAL: '+fmtEur(totCom+totBeb), W-M, y, {align:'right'}); nl(20);

  /* sugestão de encomenda por artigo */
  const linhas = linhasEncomenda([h], ano, mes, 'both', dias).filter(x => x.enc > 0).sort((a,b)=>b.enc-a.enc);
  doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(...DARK);
  txt('Sugestão de encomenda por artigo'); nl(13);
  doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...GREY);
  txt('a encomendar = consumo previsto + stock de segurança ('+dias+' dias) − stock atual', M); nl(16);
  /* cabeçalho da tabela */
  doc.setFillColor(244,244,247); doc.rect(M, y-9, W-2*M, 16, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(...DARK);
  doc.text('Artigo', M+4, y); doc.text('Família', M+180, y);
  doc.text('Prev.', W-M-190, y, {align:'right'});
  doc.text('Stock', W-M-120, y, {align:'right'});
  doc.text('A encomendar', W-M-4, y, {align:'right'}); nl(15);
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
  let totEnc = 0;
  linhas.forEach((l, i) => {
    if(i % 2 === 0){ doc.setFillColor(250,250,252); doc.rect(M, y-9, W-2*M, 14, 'F'); }
    doc.setTextColor(40,40,50);
    doc.text(doc.splitTextToSize(l.a, 170)[0], M+4, y);
    doc.setTextColor(...GREY); doc.setFontSize(7.5);
    doc.text(doc.splitTextToSize(l.sf, 130)[0], M+180, y);
    doc.setFontSize(8.5); doc.setTextColor(40,40,50);
    doc.text(fmtEur(l.prev), W-M-190, y, {align:'right'});
    doc.text(fmtEur(l.stock), W-M-120, y, {align:'right'});
    doc.setFont('helvetica','bold'); doc.setTextColor(...DARK);
    doc.text(fmtEur(l.enc), W-M-4, y, {align:'right'});
    doc.setFont('helvetica','normal');
    totEnc += l.enc; nl(14);
  });
  doc.setDrawColor(...LINE); doc.line(M, y, W-M, y); nl(14);
  doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(...DARK);
  txt('TOTAL A ENCOMENDAR', M);
  doc.text(fmtEur(totEnc), W-M-4, y, {align:'right'}); nl(18);

  /* secção de encomenda em quantidades (unidades reais), se houver ficheiro de quantidades */
  if(temQuantidades() && temRoomnights()){
    const ql = linhasEncomendaQtd([h], ano, mes, dias);
    if(ql.length){
      if(y > doc.internal.pageSize.getHeight() - 120){ doc.addPage(); y = M; }
      doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(...DARK);
      txt('Encomenda por artigo em quantidades (unidades) — '+nomeMes); nl(13);
      doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...GREY);
      txt('A encomendar = consumo previsto + margem de segurança ('+dias+' dias). Unidades reais (kg, litros, caixas…).', M); nl(15);
      doc.setFillColor(244,244,247); doc.rect(M, y-9, W-2*M, 16, 'F');
      doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(...DARK);
      doc.text('Artigo', M+4, y); doc.text('Unidade', W-M-230, y, {align:'right'});
      doc.text('Prev.', W-M-120, y, {align:'right'}); doc.text('A encomendar', W-M-4, y, {align:'right'}); nl(15);
      doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
      ql.slice(0, 60).forEach((l, i) => {
        if(y > doc.internal.pageSize.getHeight() - M - 14){ doc.addPage(); y = M; }
        if(i % 2 === 0){ doc.setFillColor(250,250,252); doc.rect(M, y-9, W-2*M, 14, 'F'); }
        doc.setTextColor(40,40,50);
        doc.text(doc.splitTextToSize(l.art, 250)[0], M+4, y);
        doc.setTextColor(...GREY); doc.text(l.un||'—', W-M-230, y, {align:'right'});
        doc.text(fmtQtd(l.prev), W-M-120, y, {align:'right'});
        doc.setTextColor(40,40,50); doc.setFont('helvetica','bold');
        doc.text(fmtQtd(l.enc), W-M-4, y, {align:'right'}); doc.setFont('helvetica','normal');
        nl(14);
      });
      if(ql.length > 60){ doc.setTextColor(...GREY); doc.setFontSize(8); txt('(+'+(ql.length-60)+' artigos — lista completa na ferramenta)', M); nl(12); }
    }
  }

  /* rodapé */
  const np = doc.internal.getNumberOfPages();
  for(let i=1;i<=np;i++){
    doc.setPage(i);
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...GREY);
    doc.text('VG · Custos A&B — gerado em '+new Date().toLocaleDateString('pt-PT')+' — valores em custo estimado (€)', M, doc.internal.pageSize.getHeight()-20);
    doc.text(i+'/'+np, W-M, doc.internal.pageSize.getHeight()-20, {align:'right'});
  }
  return { doc, nomeFicheiro: 'Posicao_Compra_'+h.replace(/[^A-Za-z0-9]+/g,'_')+'_'+MES_SUF[mes-1]+ano+'.pdf' };
}
async function descarregarPDF(h, ano, mes, dias){
  try{
    toast('A gerar PDF…');
    const { doc, nomeFicheiro } = await gerarPDFPosicao(h, ano, mes, dias);
    doc.save(nomeFicheiro);
    toast('PDF gerado: '+nomeFicheiro);
    audit('pdf_posicao', h+' · '+MESES[mes-1]+' '+ano);
  }catch(e){ toast('Falha ao gerar PDF: '+(e&&e.message||e)); }
}
async function abrirEmail(dest, assunto, corpoCurto, corpoCompleto){
  /* o mailto leva o corpo CURTO (análise + famílias), que cabe e aparece preenchido no Outlook.
     a lista detalhada por artigo vai por clipboard, para colar. */
  const copiou = await copiarFiavel(corpoCompleto);
  const body = corpoCurto + (copiou ? '' : '\n\n[Não foi possível copiar a lista detalhada automaticamente.]');
  const href = 'mailto:'+encodeURIComponent(dest||'')+'?subject='+encodeURIComponent(assunto)+'&body='+encodeURIComponent(body);
  window.location.href = href;
  if(copiou) toast('Email aberto. A lista detalhada por artigo está copiada — cola com Ctrl+V onde indicado.');
  else toast('Email aberto com o resumo por família.');
}
async function guardarEmailHotel(h, email){
  try{ const m = (await apiRetry('get','emails_diretores', null, 2)) || {}; m[h] = email; await apiRetry('set','emails_diretores', m); }catch(e){}
}
/* constrói o texto do email para um hotel: análise + previsão por família e artigo */
function construirEmailHotel(h, ano, mes, dias){
  const L = [];
  const nomeMes = MESES[mes-1]+' '+ano;
  L.push('Estimado(a) Diretor(a) do '+h+',');
  L.push('');
  L.push('Segue a previsão de compras de A&B para '+nomeMes+', gerada automaticamente a partir do histórico e das roomnights previstas. É um ponto de partida — deve ser validada com o conhecimento da operação (eventos, reservas de grupo, promoções) antes de encomendar.');
  L.push('');

  /* --- análise do hotel (acumulado) --- */
  const r = DATA.resumo[h] || {};
  L.push('== SITUAÇÃO ATUAL DO HOTEL (acumulado '+(DATA.meta.ano||'')+') ==');
  L.push('- Food cost (consumo): '+fmtPct(r.fcConsumo)+'  |  Beverage cost: '+fmtPct(r.bcConsumo));
  const bn = temRoomnights() ? bnDe(h, ano)[mes] : null;
  if(isNum(bn)) L.push('- Roomnights previstas para '+nomeMes+': '+fmtNum(bn));
  L.push('');

  /* --- previsão por família --- */
  const p = preverArtigos(h, [{ano, mes}]);
  const k = ano+'-'+mes;
  const porSub = {}; let totCom = 0, totBeb = 0;
  ['com','beb'].forEach(tp => Object.keys(p[tp]||{}).forEach(sf => {
    let s = 0;
    Object.keys(p[tp][sf]).forEach(a => { if(ehArtigoCompravel(a)) s += p[tp][sf][a][k]||0; });
    if(s > 0){ porSub[sf] = (porSub[sf]||0) + s; if(tp==='com') totCom += s; else totBeb += s; }
  }));
  L.push('== CONSUMO PREVISTO POR FAMÍLIA — '+nomeMes+' ==');
  Object.entries(porSub).sort((a,b)=>b[1]-a[1]).forEach(([sf, v]) => L.push('- '+sf+': '+fmtEur(v)));
  L.push('');
  L.push('Total comidas: '+fmtEur(totCom)+'  |  Total bebidas: '+fmtEur(totBeb)+'  |  TOTAL: '+fmtEur(totCom+totBeb));
  L.push('');

  /* --- sugestão de encomenda por artigo (só o que é preciso repor) --- */
  const linhas = linhasEncomenda([h], ano, mes, 'both', dias).filter(x => x.enc > 0).sort((a,b)=>b.enc-a.enc);
  L.push('== SUGESTÃO DE ENCOMENDA POR ARTIGO (stock segurança '+dias+' dias) ==');
  L.push('(a encomendar = consumo previsto + stock segurança − stock atual)');
  L.push('');
  let totEnc = 0;
  linhas.forEach(l => { totEnc += l.enc; L.push('- '+l.a+' ['+l.sf+']: '+fmtEur(l.enc)); });
  L.push('');
  L.push('TOTAL A ENCOMENDAR: '+fmtEur(totEnc));
  L.push('');

  /* --- encomenda em quantidades (unidades reais), se houver ficheiro de quantidades --- */
  if(temQuantidades() && temRoomnights()){
    const ql = linhasEncomendaQtd([h], ano, mes, dias);
    if(ql.length){
      L.push('== ENCOMENDA POR ARTIGO EM QUANTIDADES (unidades) ==');
      L.push('(a encomendar = consumo previsto + margem de segurança '+dias+' dias; sem desconto de stock)');
      L.push('');
      ql.slice(0, 200).forEach(l => { L.push('- '+l.a+': '+fmtQtd(l.enc)+(l.un?' '+l.un:'')); });
      if(ql.length > 200) L.push('(+'+(ql.length-200)+' artigos — ver na ferramenta)');
      L.push('');
    }
  }
  L.push('---');
  L.push('Valores em custo estimado (€) e quantidades em unidades. Gerado por VG · Custos A&B.');

  /* versão CURTA (cabe no mailto do Outlook): análise + famílias, sem a lista longa de artigos */
  const S = [];
  S.push('Previsão de compras A&B — '+nomeMes+' (ponto de partida, validar com a operação).');
  S.push('');
  S.push('SITUAÇÃO: Food cost '+fmtPct(r.fcConsumo)+' | Beverage cost '+fmtPct(r.bcConsumo)+(isNum(bn)?' | Roomnights '+fmtNum(bn):''));
  S.push('');
  S.push('CONSUMO PREVISTO POR FAMÍLIA:');
  Object.entries(porSub).sort((a,b)=>b[1]-a[1]).forEach(([sf, v]) => S.push('- '+sf+': '+fmtEur(v)));
  S.push('TOTAL previsto: '+fmtEur(totCom+totBeb));
  S.push('');
  S.push('>> A lista detalhada por artigo (a encomendar) foi copiada para a área de transferência: cola aqui com Ctrl+V.');
  S.push('>> Se geraste o PDF da posição de compra, arrasta-o para este email como anexo.');

  return { assunto: 'Previsão de compras A&B — '+h+' — '+nomeMes, corpo: L.join('\n'), corpoCurto: S.join('\n') };
}
function pdfEncomenda(){
  if(!DATA || !temRoomnights()){ toast('Sem dados suficientes para o PDF.'); return; }
  const escolhaH = $('enHotel').value;
  if(escolhaH === '__sel' || !escolhaH){ toast('Escolhe um hotel específico para gerar o PDF.'); return; }
  const mv = $('enMes').value; if(!mv){ toast('Escolhe um mês.'); return; }
  const [ano, mes] = mv.split('-').map(Number);
  descarregarPDF(escolhaH, ano, mes, +$('enSeg').value);
}
function pdfPrevisao(){
  if(!DATA || !temRoomnights()){ toast('Sem dados suficientes para o PDF.'); return; }
  const escolhaH = $('pvHotel').value;
  if(escolhaH === '__sel' || !escolhaH){ toast('Escolhe um hotel específico para gerar o PDF.'); return; }
  const hz = pvHorizonte(); if(!hz.length){ toast('Sem meses futuros no horizonte.'); return; }
  descarregarPDF(escolhaH, hz[0].ano, hz[0].mes, 7);
}
async function emailEncomenda(){
  if(!DATA || !temRoomnights()){ toast('Sem dados suficientes para gerar o email.'); return; }
  const escolhaH = $('enHotel').value;
  if(escolhaH === '__sel' || !escolhaH){ toast('Escolhe um hotel específico para enviar o email (não a seleção agregada).'); return; }
  const mv = $('enMes').value; if(!mv){ toast('Escolhe um mês.'); return; }
  const [ano, mes] = mv.split('-').map(Number);
  const dias = +$('enSeg').value;
  const { assunto, corpo, corpoCurto } = construirEmailHotel(escolhaH, ano, mes, dias);
  let dest = await emailDoHotel(escolhaH);
  const resp = prompt('Email do diretor do '+escolhaH+':', dest || '');
  if(resp === null) return;
  dest = resp.trim();
  if(dest) guardarEmailHotel(escolhaH, dest);
  if(confirm('Gerar também o PDF da posição de compra para anexar ao email?\n\n(OK = gera o PDF e abre o email; depois arrasta o PDF para o email.)')){
    await descarregarPDF(escolhaH, ano, mes, dias);
  }
  await abrirEmail(dest, assunto, corpoCurto, corpo);
  audit('email_previsao', escolhaH+' · '+MESES[mes-1]+' '+ano);
}

/* =====================================================================
   VISTA · Previsto vs. Real
===================================================================== */
function acOptions(){
  if(!DATA) return;
  const sel = $('acGuardarMes'); const cur = sel.value;
  const fut = temRoomnights() ? mesesComRoomnightFuturas() : [];
  sel.innerHTML = fut.map(x => '<option value="'+x.ano+'-'+x.mes+'">'+MESES[x.mes-1]+' '+x.ano+'</option>').join('');
  if([...sel.options].some(o => o.value === cur)) sel.value = cur;
}
/* consumo real POR HOTEL de um mês (comidas+bebidas), se já existir nas abas mensais.
   Devolve {hotel: €} ou null se o mês ainda não fechou. */
function consumoRealMesPorHotel(ano, mes){
  if(ano !== DATA.meta.ano) return null;
  if((DATA.meta.mesesComDados||[]).indexOf(mes) < 0) return null;
  const out = {};
  DATA.hoteis.forEach(h => {
    let s = 0;
    ['com','beb'].forEach(tp => {
      const ds = (DATA.mensal[tp]||{})[mes]; if(!ds) return;
      ds.ordem.forEach(sf => {
        if(sf.indexOf('TOTAL')===0 || sf.indexOf('CUSTOS')===0) return;
        const t = ds.subfams[sf].totais['Total Consumo']; if(t && isNum(t[h])) s += t[h];
      });
    });
    out[h] = s;
  });
  return out;
}
async function guardarPrevisaoMes(){
  if(!DATA || !temRoomnights()){ toast('Sem dados para prever.'); return; }
  const mv = $('acGuardarMes').value; if(!mv){ toast('Escolhe um mês.'); return; }
  if(SCENARIO.ocup!==1 || SCENARIO.preco!==1 || Object.keys(SCENARIO.bnEdit).length){
    if(!confirm('Tens um cenário ativo (ocupação/preço ajustados). Para a comparação medir o modelo, o ideal é guardar com o cenário base. Guardar mesmo assim com o cenário atual?')) return;
  }
  const [ano, mes] = mv.split('-').map(Number);
  /* prever consumo total (comidas+bebidas) por hotel para esse mês, com o cenário atual */
  const porHotel = {};
  DATA.hoteis.forEach(h => {
    const pr = preverArtigos(h, [{ano, mes}]);
    let s = 0;
    ['com','beb'].forEach(tp => Object.keys(pr[tp]||{}).forEach(sf => Object.keys(pr[tp][sf]).forEach(a => { if(ehArtigoCompravel(a)) s += pr[tp][sf][a][ano+'-'+mes]||0; })));
    porHotel[h] = s;
  });
  const registo = { ano, mes, ts:new Date().toISOString(), by:CURRENT_USER.login,
                    cenario:{ocup:SCENARIO.ocup, preco:SCENARIO.preco}, porHotel };
  try{
    const todas = (await apiRetry('get','previsoes', null, 2)) || {};
    todas[ano+'-'+mes] = registo;
    await apiRetry('set','previsoes', todas);
    audit('guardar_previsao', MESES[mes-1]+' '+ano);
    toast('Previsão de '+MESES[mes-1]+' '+ano+' guardada.');
    renderAcomp();
  }catch(e){ toast('Falha ao guardar: '+(e&&e.message||e)); }
}
let acMesSel = null;  // mês selecionado para drill-down por hotel
async function renderAcomp(){
  $('acAviso').innerHTML = '';
  if(!DATA){ semDados('acCards'); $('acTbl').innerHTML=''; return; }
  acOptions();
  let todas = {};
  try{ todas = (await apiRetry('get','previsoes', null, 2)) || {}; }catch(e){}
  const chaves = Object.keys(todas).sort();
  const hs = hoteisAtivos();

  /* resumo por mês (para os cards e para a tabela-resumo) */
  const meses = chaves.map(k => {
    const reg = todas[k];
    const prev = soma(hs.map(h => reg.porHotel[h]||0));
    const realMap = consumoRealMesPorHotel(reg.ano, reg.mes);
    const real = realMap ? soma(hs.map(h => realMap[h]||0)) : null;
    /* erro médio ABSOLUTO por hotel (não deixa erros opostos cancelarem-se) */
    let mapeHot = null;
    if(realMap){
      const errs = hs.map(h => { const p = reg.porHotel[h]||0, r = realMap[h]||0; return (r>100) ? Math.abs(p-r)/r*100 : null; }).filter(isNum);
      mapeHot = errs.length ? media(errs) : null;
    }
    return { ano:reg.ano, mes:reg.mes, key:k, prev, real, mapeHot, by:reg.by };
  });
  const comReal = meses.filter(m => isNum(m.real) && m.real > 0);
  const mapeGlobal = comReal.length ? media(comReal.map(m => m.mapeHot).filter(isNum)) : null;

  $('acCards').innerHTML = [
    card('Previsões guardadas', String(meses.length), chaves.length?('desde '+MESES[todas[chaves[0]].mes-1]+' '+todas[chaves[0]].ano):'—', ''),
    card('Já com real disponível', String(comReal.length), 'meses comparáveis', ''),
    card('Erro médio por hotel', isNum(mapeGlobal)?mapeGlobal.toFixed(0)+'%':'—', 'média dos desvios absolutos', '')
  ].join('');

  if(!meses.length){ $('acTbl').innerHTML = '<div class="empty">Ainda não há previsões guardadas. Usa «Guardar previsão deste mês» acima, e volta quando o consumo real do mês estiver no ficheiro.</div>'; return; }

  /* tabela-resumo por mês, com botão para abrir o detalhe por hotel */
  meses.sort((a,b)=> (b.ano-a.ano)||(b.mes-a.mes));
  if(!acMesSel || !meses.find(m => m.key === acMesSel)){
    acMesSel = comReal.length ? comReal.sort((a,b)=>(b.ano-a.ano)||(b.mes-a.mes))[0].key
                              : meses.sort((a,b)=>(b.ano-a.ano)||(b.mes-a.mes))[0].key;
  }
  let ht = '<table class="tbl"><thead><tr><th>Mês</th><th>Previsto</th><th>Real</th><th>Desvio</th><th>Erro médio/hotel</th><th></th></tr></thead><tbody>';
  meses.forEach(m => {
    const temReal = isNum(m.real) && m.real > 0;
    const d = temReal ? m.real - m.prev : null;
    const dp = temReal ? d/m.real*100 : null;
    const cls = !isNum(m.mapeHot) ? 'mut' : m.mapeHot <= 10 ? 'ok' : m.mapeHot <= 20 ? 'warn' : 'bad';
    ht += '<tr'+(m.key===acMesSel?' style="background:rgba(201,162,75,.08)"':'')+'>'
      + '<td class="hname" onclick="acAbrir(\''+m.key+'\')">'+MESES[m.mes-1]+' '+m.ano+'</td>'
      + '<td>'+fmtEur(m.prev)+'</td>'
      + '<td>'+(temReal?fmtEur(m.real):'<span style="color:var(--warn)" title="O detalhe por hotel aparece quando este mês estiver fechado no ficheiro de custos">⏳ aguarda fecho do mês</span>')+'</td>'
      + '<td>'+(temReal?fmtEur(d)+' ('+(dp>0?'+':'')+dp.toFixed(0)+'%)':'—')+'</td>'
      + '<td><span class="sem '+cls+'">'+(isNum(m.mapeHot)?m.mapeHot.toFixed(0)+'%':'—')+'</span></td>'
      + '<td><button class="tb-btn" onclick="acAbrir(\''+m.key+'\')">'+(temReal?'ver hotéis ▾':'detalhe ▾')+'</button></td></tr>';
  });
  ht += '</tbody></table>';
  $('acTbl').innerHTML = ht;

  /* drill-down por hotel do mês selecionado */
  const box = $('acDetalhe');
  const sel = meses.find(m => m.key === acMesSel);
  if(sel && isNum(sel.real) && sel.real > 0){
    const reg = todas[sel.key];
    const realMap = consumoRealMesPorHotel(reg.ano, reg.mes);
    const linhas = hs.map(h => {
      const prev = reg.porHotel[h]||0, real = (realMap[h])||0;
      const d = real - prev, dp = real > 100 ? d/real*100 : null;
      return { h, prev, real, d, dp };
    }).filter(x => x.prev > 50 || x.real > 50)
      .sort((a,b) => Math.abs(b.dp??0) - Math.abs(a.dp??0));
    let h2 = '<h3>Detalhe por hotel — '+MESES[sel.mes-1]+' '+sel.ano+'</h3>';
    h2 += '<div class="tbl-wrap" style="max-height:520px;overflow-y:auto"><table class="tbl"><thead><tr><th>Hotel</th><th>Previsto</th><th>Real</th><th>Desvio</th><th>Desvio %</th></tr></thead><tbody>';
    linhas.forEach(l => {
      const cls = !isNum(l.dp) ? 'mut' : Math.abs(l.dp) <= 10 ? 'ok' : Math.abs(l.dp) <= 20 ? 'warn' : 'bad';
      h2 += '<tr><td class="hname">'+esc(l.h)+'<span class="reg-tag">'+esc(regiaoDe(l.h))+'</span></td>'
        + '<td>'+fmtEur(l.prev)+'</td><td>'+fmtEur(l.real)+'</td><td>'+fmtEur(l.d)+'</td>'
        + '<td><span class="sem '+cls+'">'+(isNum(l.dp)?(l.dp>0?'+':'')+l.dp.toFixed(0)+'%':'—')+'</span></td></tr>';
    });
    h2 += '</tbody></table></div><div class="legend"><span>Desvio &gt; 0 = consumo real acima do previsto (subestimámos). Ordenado pelos maiores desvios — são os hotéis onde a previsão precisa de mais ajuste manual.</span></div>';
    box.innerHTML = h2;
    box.style.display = '';
  } else if(sel){
    box.style.display = '';
    box.innerHTML = '<h3>Detalhe por hotel — '+MESES[sel.mes-1]+' '+sel.ano+'</h3>'
      + '<div class="empty">Este mês ainda não fechou, por isso ainda não há <b>consumo real</b> para comparar hotel a hotel.<br>'
      + 'O detalhe por hotel aparece automaticamente assim que carregares e publicares o mapa de custos com '+MESES[sel.mes-1]+' já incluído.<br><br>'
      + 'Previsão guardada para '+MESES[sel.mes-1]+': <b>'+fmtEur(sel.prev)+'</b> (podes ver a repartição por hotel na vista «Previsão de Compras»).</div>';
  } else {
    box.style.display = 'none';
  }
}
function acAbrir(key){ acMesSel = key; renderAcomp(); }

/* =====================================================================
   VISTA · Stock & Consumos Internos
===================================================================== */
function renderStock(){
  if(!DATA){ semDados('stockTbl'); $('stockCards').innerHTML=''; return; }
  const hs = hoteisAtivos();
  const dv = DATA.diversos || {};
  const g = aggRegiao(hs);
  const ciComT = soma(hs.map(h => (dv.ciCom||{})[h]));
  const ciBebT = soma(hs.map(h => (dv.ciBeb||{})[h]));
  const refT   = soma(hs.map(h => ((dv.refCom||{})[h]||0) + ((dv.refBeb||{})[h]||0)));
  const mesRef = MESES[(DATA.meta.mes||1)-1];
  $('stockSub').textContent = 'Inventários acumulados '+(DATA.meta.ano||'')+' · consumos internos e refeitório do mês de '+mesRef+' · '+selectedRegion+(selectedTip!=='Todas'?' · '+selectedTip:'');
  $('stockCards').innerHTML = [
    card('Inventário final', fmtEur(g.invCom + g.invBeb), 'Comidas: '+fmtEur(g.invCom)+' · Bebidas: '+fmtEur(g.invBeb), ''),
    card('Peso do stock', fmtPct(g.pesoStock), 'Inventário s/ compras acumuladas', ''),
    card('Consumos internos ('+mesRef+')', fmtEur(ciComT + ciBebT), 'Comidas: '+fmtEur(ciComT)+' · Bebidas: '+fmtEur(ciBebT), ''),
    card('Refeitório ('+mesRef+')', fmtEur(refT), 'Custo estimado comidas + bebidas', '')
  ].join('');

  const ordenados = [...hs].sort((x,y) => (((DATA.resumo[y]||{}).pesoStock)??-1) - (((DATA.resumo[x]||{}).pesoStock)??-1));
  let html = '<table class="tbl"><thead><tr><th>Hotel</th><th>Inventário comidas</th><th>Inventário bebidas</th><th>Peso stock</th><th>Stock/pax</th><th>CI comidas (mês)</th><th>CI bebidas (mês)</th><th>CI % s/ consumo acum.</th><th>Refeitório com. (mês)</th><th>Refeitório beb. (mês)</th></tr></thead><tbody>';
  ordenados.forEach(h => {
    const c = DATA.comparativo[h] || {com:{},beb:{}};
    const r = DATA.resumo[h] || {};
    const ciC = (dv.ciCom||{})[h], ciB = (dv.ciBeb||{})[h];
    const consumoTot = (c.com.consumo||0) + (c.beb.consumo||0);
    const ciPct = consumoTot > 0 && (isNum(ciC)||isNum(ciB)) ? ((ciC||0)+(ciB||0))/consumoTot : null;
    const pesoCls = isNum(r.pesoStock) ? (r.pesoStock >= .2 ? 'bad' : r.pesoStock >= .14 ? 'warn' : 'ok') : 'mut';
    html += '<tr>'
      + '<td class="hname" onclick="irParaHotel(\''+h.replace(/'/g,"\\'")+'\')">'+esc(h)+'<span class="reg-tag">'+esc(regiaoDe(h))+'</span></td>'
      + '<td>'+fmtEur(c.com.inventario)+'</td><td>'+fmtEur(c.beb.inventario)+'</td>'
      + '<td><span class="sem '+pesoCls+'">'+fmtPct(r.pesoStock)+'</span></td>'
      + '<td>'+fmtEur(r.stockPax,2)+'</td>'
      + '<td>'+fmtEur(ciC)+'</td><td>'+fmtEur(ciB)+'</td>'
      + '<td>'+fmtPct(ciPct)+'</td>'
      + '<td>'+fmtEur((dv.refCom||{})[h])+'</td><td>'+fmtEur((dv.refBeb||{})[h])+'</td>'
      + '</tr>';
  });
  html += '</tbody></table>';
  $('stockTbl').innerHTML = html;
}

/* =====================================================================
   MOTOR · Comentário automático (regras determinísticas)
   Gera, por hotel e mês, uma análise no estilo dos comentários manuais,
   a partir dos dados das abas mensais do próprio ficheiro.
===================================================================== */
/*FORECAST-START*/
/* ---- consumo mensal por artigo (€) para um hotel, no dataset ativo ou num dado dataset ----
   estrutura: {tipo:{subfam:{artigo:{mes:valor}}}} */
/* Linhas que NÃO são artigos de compra (aparecem nas subfamílias de bebidas). */
function ehArtigoCompravel(a){
  const s = String(a).trim();
  if(/^receita/i.test(s)) return false;
  if(/^custo (direto|por pax)/i.test(s)) return false;
  if(/receita por cliente/i.test(s)) return false;
  return true;
}
function consumoArtigosHotel(D, h){
  const out = {com:{}, beb:{}};
  ['com','beb'].forEach(tp => {
    (D.meta.mesesComDados||[]).forEach(m => {
      const ds = (D.mensal[tp]||{})[m]; if(!ds) return;
      ds.ordem.forEach(sf => {
        if(sf.indexOf('TOTAL') === 0 || sf.indexOf('CUSTOS') === 0) return;
        const arts = ds.subfams[sf].artigos || {};
        out[tp][sf] = out[tp][sf] || {};
        Object.keys(arts).forEach(a => {
          if(!ehArtigoCompravel(a)) return;
          const v = arts[a][h];
          if(isNum(v)){ out[tp][sf][a] = out[tp][sf][a] || {}; out[tp][sf][a][m] = v; }
        });
      });
    });
  });
  return out;
}
/* roomnights */
function bnDe(h, ano){ return (ROOMNIGHTS && ROOMNIGHTS.total[h] && ROOMNIGHTS.total[h][ano]) ? ROOMNIGHTS.total[h][ano] : {}; }
function bnSoma(h, ano, meses){ const o = bnDe(h,ano); return soma(meses.map(m => o[m])); }
function temRoomnights(){ return !!(ROOMNIGHTS && ROOMNIGHTS.total && Object.keys(ROOMNIGHTS.total).length); }

/* índice sazonal do mês (1 = média do ano) a partir das roomnights do ano indicado */
function idxSazonal(h, ano, mes){
  const src = bnDe(h, ano);
  const vals = Object.values(src);
  const mm = vals.filter(v => v > 0).length;   // meses ativos
  const tot = soma(vals);
  if(tot > 30 && mm > 0 && isNum(src[mes])) return src[mes] / (tot/mm);
  return isNum(src[mes]) && tot > 0 ? src[mes]/(tot/12) : 1;
}

/* ---- Previsão por artigo (método misto) ----
   nível €/roomnight do artigo = consumo acumulado do ano corrente ÷ roomnights acumuladas do ano corrente.
   Se existir histórico do ano anterior (DATA_HIST), usa-se a sua forma sazonal por artigo
   para modular o €/roomnight mês a mês; caso contrário usa a sazonalidade das roomnights.
   Previsão do mês = €/roomnight_base × sazonalidade × roomnights_previstas_do_mês. */
let SCENARIO = { ocup:1.0, preco:1.0, ocupMes:{}, bnEdit:{} };
function bnAjustada(h, ano, mes){
  let bn = (bnDe(h,ano)[mes])||0;
  const kh = h+'|'+ano+'-'+mes;
  if(SCENARIO.bnEdit && isNum(SCENARIO.bnEdit[kh])) bn = SCENARIO.bnEdit[kh];
  const km = ano+'-'+mes;
  const fOcup = (SCENARIO.ocupMes && isNum(SCENARIO.ocupMes[km])) ? SCENARIO.ocupMes[km] : SCENARIO.ocup;
  return bn * (isNum(fOcup)?fOcup:1);
}
function preverArtigos(h, horizonte){
  const anoC = DATA.meta.ano;
  const mesesD = DATA.meta.mesesComDados || [];
  const bnAcumC = bnSoma(h, anoC, mesesD);
  const consC = consumoArtigosHotel(DATA, h);
  const hist = (DATA_HIST && DATA_HIST.meta && (DATA_HIST.meta.ano === anoC-1)) ? DATA_HIST : null;
  const consH = hist ? consumoArtigosHotel(hist, h) : null;
  const mesesH = hist ? (hist.meta.mesesComDados||[]) : [];

  const res = {com:{}, beb:{}, bnMes:{}, base:{}, temNivel:{}};
  horizonte.forEach(({ano,mes}) => { res.bnMes[ano+'-'+mes] = bnAjustada(h, ano, mes); });

  ['com','beb'].forEach(tp => {
    Object.keys(consC[tp]).forEach(sf => {
      Object.keys(consC[tp][sf]).forEach(a => {
        const consAcum = soma(mesesD.map(m => (consC[tp][sf][a]||{})[m]));
        const rbn = bnAcumC > 30 ? (consAcum / bnAcumC) * ((SCENARIO && isNum(SCENARIO.preco))?SCENARIO.preco:1) : null;   // €/roomnight base × preço
        if(!isNum(rbn) || rbn <= 0) return;
        /* forma sazonal por artigo, se houver histórico do artigo */
        let sazArt = null;
        if(consH && consH[tp][sf] && consH[tp][sf][a]){
          const hm = consH[tp][sf][a];
          const bnH = bnDe(h, anoC-1);
          /* €/bn histórico por mês, normalizado à média */
          const ratios = mesesH.map(m => (bnH[m] > 5 && isNum(hm[m])) ? hm[m]/bnH[m] : null).filter(isNum);
          const mediaR = media(ratios);
          if(isNum(mediaR) && mediaR > 0){
            sazArt = {};
            mesesH.forEach(m => { if(bnH[m] > 5 && isNum(hm[m])) sazArt[m] = (hm[m]/bnH[m]) / mediaR; });
          }
        }
        const key0 = tp+'|'+sf+'|'+a;
        res.base[key0] = rbn;
        res[tp][sf] = res[tp][sf] || {};
        res[tp][sf][a] = res[tp][sf][a] || {};
        horizonte.forEach(({ano,mes}) => {
          const bn = bnAjustada(h, ano, mes);
          let fator = 1;
          if(sazArt && isNum(sazArt[mes])) fator = sazArt[mes];
          else fator = idxSazonal(h, anoC-1, mes) || 1;   // fallback: sazonalidade das roomnights do ano anterior
          res[tp][sf][a][ano+'-'+mes] = rbn * fator * bn;
        });
      });
    });
  });
  return res;
}

/* ---- Previsão de QUANTIDADES por artigo (do dataset QTD da Pivot livre) ----
   Método misto igual ao dos €: qtd/roomnight do ano corrente por artigo, aplicada às
   roomnights previstas do mês, modulada pela forma sazonal (histórico de quantidades se
   houver, senão sazonalidade das roomnights). Só usa hotéis com roomnights. */
function temQuantidades(){ return !!(QTD && QTD.artigos && Object.keys(QTD.artigos).length); }
function mesesQtd(){ return (QTD && QTD.meses) ? QTD.meses.slice().sort((a,b)=>a-b) : []; }
/* quantidade acumulada de um artigo/hotel nos meses com dados de QTD */
function qtdAcum(art, h, meses){
  const o = (QTD.artigos[art]||{})[h] || {};
  return soma(meses.map(m => o[m]));
}
function preverQuantidadesHotel(h, horizonte){
  const out = {};                 // artigo -> { 'ano-mes': qtd }
  if(!temQuantidades()) return out;
  const anoC = QTD.ano;
  const mesesD = mesesQtd();
  const bnAcum = bnSoma(h, anoC, mesesD);
  if(bnAcum <= 30) return out;     // sem base de roomnights fiável
  Object.keys(QTD.artigos).forEach(art => {
    const consAcum = qtdAcum(art, h, mesesD);
    if(consAcum <= 0) return;
    const qbn = consAcum / bnAcum;               // quantidade por roomnight
    horizonte.forEach(({ano,mes}) => {
      const bn = bnAjustada(h, ano, mes);
      const fator = idxSazonal(h, anoC-1, mes) || 1;
      const q = qbn * fator * bn;
      if(q > 0){ out[art] = out[art] || {}; out[art][ano+'-'+mes] = q; }
    });
  });
  return out;
}
/* preço médio de um artigo (€/unidade) = custo/quantidade, se ambos existirem no QTD.
   Como o QTD só traz quantidade, o preço vem por artigo do próprio ficheiro se publicado;
   caso não haja, devolve null (mostra só quantidade). */
function precoMedioArtigo(art, h){
  return (QTD.precos && QTD.precos[art] && isNum(QTD.precos[art][h])) ? QTD.precos[art][h] : null;
}
/* horizontes */
function ultimoMesDados(){ return Math.max(0, ...((DATA.meta.mesesComDados)||[0])); }
function mesesComRoomnightFuturas(){
  /* pares {ano,mes} futuros que têm roomnights previstas em pelo menos um hotel */
  if(!temRoomnights()) return [];
  const anoC = DATA.meta.ano, um = ultimoMesDados();
  const futuros = [];
  const addSeAtivo = (ano, mes) => {
    let tem = false;
    for(const h of DATA.hoteis){ if(((bnDe(h,ano)||{})[mes]||0) > 0){ tem = true; break; } }
    if(tem) futuros.push({ano, mes});
  };
  for(let m=um+1;m<=12;m++) addSeAtivo(anoC, m);
  (ROOMNIGHTS.anos||[]).filter(a => a > anoC).forEach(a => { for(let m=1;m<=12;m++) addSeAtivo(a, m); });
  return futuros;
}
function horizonteN(n){ return mesesComRoomnightFuturas().slice(0, n); }
function horizonteRestoAno(){ const anoC = DATA.meta.ano; return mesesComRoomnightFuturas().filter(x => x.ano === anoC); }
function horizonteTudo(){ return mesesComRoomnightFuturas(); }
function mesLabel(ano, mes){ return MESES[mes-1].slice(0,3)+'/'+String(ano).slice(2); }
/*FORECAST-END*/
/*ENGINE-START*/
function dadosMes(tipo, m, h){
  const ds = (DATA.mensal[tipo]||{})[m];
  if(!ds) return null;
  const crKey = tipo === 'com' ? 'CUSTOS & RECEITAS COMIDAS' : 'CUSTOS & RECEITAS BEBIDAS';
  const totKey = tipo === 'com' ? 'TOTAL COMIDAS CONSUMO' : 'TOTAL BEBIDAS CONSUMO';
  const cr = (ds.subfams[crKey]||{}).artigos || {};
  const tot = (ds.subfams[totKey]||{}) || {};
  const g = (map, key) => (map[key]||{})[h];
  const out = {
    receita: g(cr, tipo==='com' ? 'Receita TOTAL Comidas' : 'Receita TOTAL Bebidas'),
    custo:   g(cr, tipo==='com' ? 'Total Custo Comidas' : 'Total Custo Bebidas'),
    racio:   g(cr, tipo==='com' ? 'Food Cost Consumo' : 'Beverage cost/consumo'),
    ci:      g(cr, 'Consumo interno'),
    refeitorio: g(cr, 'Refeitório'),
    pa:      tipo==='com' ? g(cr, 'Pequeno almoço (Incluído + passante)') : null,
    couverts:tipo==='com' ? g(cr, 'Couvert') : null,
    dormidas:g(cr, 'Dormidas'),
    custoCouvert: tipo==='com' ? ((tot.totais||{})['Custo por Couvert']||{})[h] : null,
    subfams: {}
  };
  ds.ordem.forEach(sf => {
    if(sf.indexOf('TOTAL') === 0 || sf.indexOf('CUSTOS') === 0) return;
    const t = ds.subfams[sf].totais || {};
    out.subfams[sf] = {
      consumo: (t['Total Consumo']||{})[h],
      peso:    (t['Peso no Custo']||{})[h],
      couvert: (t['Custo por Couvert']||{})[h],
      artigos: ds.subfams[sf].artigos
    };
  });
  return out;
}
function pp(d){ return (d>0?'+':'')+ (d*100).toFixed(1).replace('.',',')+' p.p.'; }
function eur0(v){ return isNum(v) ? v.toLocaleString('pt-PT',{maximumFractionDigits:0})+' €' : '—'; }
function eur2(v){ return isNum(v) ? v.toLocaleString('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2})+' €' : '—'; }
function pctVar(atual, ant){ return (isNum(atual)&&isNum(ant)&&Math.abs(ant)>1) ? ' ('+(atual>=ant?'+':'')+(((atual-ant)/Math.abs(ant))*100).toFixed(0)+'%)' : ''; }
function cap(s){ return s ? s.charAt(0) + s.slice(1).toLowerCase() : s; }

function gerarComentario(h, m){
  const nomeMes = MESES[m-1];
  const com = dadosMes('com', m, h);
  const beb = dadosMes('beb', m, h);
  const comAnt = m > 1 ? dadosMes('com', m-1, h) : null;
  const bebAnt = m > 1 ? dadosMes('beb', m-1, h) : null;
  const semAtividade = (!com || ((com.receita||0) < 100 && (com.custo||0) < 100)) &&
                       (!beb || ((beb.receita||0) < 100 && (beb.custo||0) < 100));
  if(semAtividade) return { texto: 'Sem atividade de F&B registada em '+nomeMes+' (hotel encerrado ou dados por lançar).', flags: ['fechado'] };

  const flags = [];
  const paras = [];

  /* ---- COMIDAS ---- */
  if(com && isNum(com.racio)){
    let s = 'Rácio de comidas de '+fmtPct(com.racio)+' em '+nomeMes;
    if(comAnt && isNum(comAnt.racio)){
      const d = com.racio - comAnt.racio;
      s += ', '+(Math.abs(d) < 0.005 ? 'em linha com' : (d>0 ? 'um agravamento de '+pp(d)+' face a' : 'uma melhoria de '+pp(Math.abs(d)).replace('+','')+' face a'))+' '+MESES[m-2].toLowerCase();
      if(d >= 0.03) flags.push('food_subida');
    }
    const med = (DATA.raciosMensais.food.media2025||[])[m-1];
    if(isNum(med)) s += ' (média '+anoRef()+' do mês: '+fmtPct(med)+')';
    s += '.';
    if(com.racio >= LIM_FOOD){ s += ' Está acima do limite de referência de 40%.'; flags.push('food_limite'); }
    if(isNum(com.custoCouvert)){
      s += ' Custo por couvert de '+eur2(com.custoCouvert);
      if(comAnt && isNum(comAnt.custoCouvert)) s += ' ('+(com.custoCouvert>=comAnt.custoCouvert?'+':'')+(com.custoCouvert-comAnt.custoCouvert).toFixed(2).replace('.',',')+' € vs. mês anterior)';
      s += '.';
    }
    /* sub-famílias: peso e variações */
    const sfs = Object.keys(com.subfams).filter(sf => isNum(com.subfams[sf].consumo));
    const porPeso = [...sfs].filter(sf => isNum(com.subfams[sf].peso) && com.subfams[sf].peso > 0 && com.subfams[sf].peso <= 1)
                            .sort((a,b) => com.subfams[b].peso - com.subfams[a].peso).slice(0,2);
    if(porPeso.length) s += ' Maior peso no custo: '+porPeso.map(sf => cap(sf)+' ('+fmtPct(com.subfams[sf].peso,0)+')').join(' e ')+'.';
    if(comAnt){
      const deltas = sfs.map(sf => ({sf, d:(com.subfams[sf].consumo||0) - ((comAnt.subfams[sf]||{}).consumo||0), ant:(comAnt.subfams[sf]||{}).consumo}))
                        .filter(x => Math.abs(x.d) >= 150);
      const sobem = deltas.filter(x => x.d > 0).sort((a,b)=>b.d-a.d).slice(0,2);
      const desce = deltas.filter(x => x.d < 0).sort((a,b)=>a.d-b.d).slice(0,1);
      const partes = [];
      if(sobem.length) partes.push('subidas em '+sobem.map(x => cap(x.sf)+' (+'+eur0(x.d)+pctVar((com.subfams[x.sf]||{}).consumo, x.ant)+')').join(' e '));
      if(desce.length) partes.push('descida em '+desce.map(x => cap(x.sf)+' ('+eur0(x.d)+')').join(''));
      if(partes.length) s += ' Face ao mês anterior, '+partes.join('; ')+'.';
      /* artigos com maior agravamento */
      const artDeltas = [];
      sfs.forEach(sf => {
        const arts = com.subfams[sf].artigos || {};
        const antArts = ((comAnt.subfams[sf]||{}).artigos) || {};
        Object.keys(arts).forEach(a => {
          const d = (arts[a][h]||0) - ((antArts[a]||{})[h]||0);
          if(d >= 300) artDeltas.push({a, d});
        });
      });
      const topArt = artDeltas.sort((x,y)=>y.d-x.d).slice(0,3);
      if(topArt.length) s += ' Artigos com maior agravamento: '+topArt.map(x => cap(x.a)+' (+'+eur0(x.d)+')').join(', ')+'.';
    }
    paras.push(s);
  }

  /* ---- BEBIDAS ---- */
  if(beb && isNum(beb.racio)){
    let s = 'Rácio de bebidas de '+fmtPct(beb.racio);
    if(bebAnt && isNum(bebAnt.racio)){
      const d = beb.racio - bebAnt.racio;
      s += ' ('+pp(d)+' vs. '+MESES[m-2].toLowerCase()+')';
      if(d >= 0.03) flags.push('bev_subida');
    }
    const med = (DATA.raciosMensais.bev.media2025||[])[m-1];
    if(isNum(med)) s += ', com a média '+anoRef()+' do mês em '+fmtPct(med);
    s += '.';
    if(beb.racio >= LIM_BEV){ s += ' Acima do limite de referência de 25%.'; flags.push('bev_limite'); }
    if(beb.racio < 0){ s += ' O rácio negativo sugere acertos de inventário ou lançamentos a corrigir — verificar com o economato.'; flags.push('bev_negativo'); }
    if(bebAnt){
      const sfs = Object.keys(beb.subfams);
      const deltas = sfs.map(sf => ({sf, d:(beb.subfams[sf].consumo||0) - ((bebAnt.subfams[sf]||{}).consumo||0)})).filter(x => Math.abs(x.d) >= 120);
      const sobem = deltas.filter(x => x.d > 0).sort((a,b)=>b.d-a.d).slice(0,2);
      if(sobem.length) s += ' Subidas de consumo em '+sobem.map(x => cap(x.sf)+' (+'+eur0(x.d)+')').join(' e ')+'.';
    }
    paras.push(s);
  }

  /* ---- ATIVIDADE ---- */
  if(com && (isNum(com.couverts) || isNum(com.pa) || isNum(com.dormidas))){
    let s = 'Atividade do mês: '+[
      isNum(com.couverts) ? fmtNum(com.couverts)+' couverts' : null,
      isNum(com.pa) ? fmtNum(com.pa)+' PA' : null,
      isNum(com.dormidas) ? fmtNum(com.dormidas)+' dormidas' : null
    ].filter(Boolean).join(', ');
    if(comAnt && isNum(com.couverts) && isNum(comAnt.couverts) && comAnt.couverts > 0){
      const v = (com.couverts - comAnt.couverts)/comAnt.couverts;
      s += ' ('+(v>=0?'+':'')+(v*100).toFixed(0)+'% de couverts vs. mês anterior)';
    }
    s += '.';
    const ciTot = (com.ci||0) + ((beb||{}).ci||0);
    const custoTot = (com.custo||0) + ((beb||{}).custo||0);
    if(custoTot > 0 && ciTot/custoTot >= 0.08){
      s += ' Consumos internos com peso relevante ('+fmtPct(ciTot/custoTot)+' do custo do mês).';
      flags.push('ci_alto');
    }
    paras.push(s);
  }

  /* ---- BENCHMARK DE TIPOLOGIA (acumulado) ---- */
  const r = DATA.resumo[h] || {};
  const tipsH = tipologiasDe(h);
  if(tipsH.length && isNum(r.fcConsumo)){
    const tip = tipsH[0];
    const pares = DATA.tipologias[tip].filter(x => x !== h && ((DATA.resumo[x]||{}).clientes||0) > 0);
    const mTip = media(pares.map(x => (DATA.resumo[x]||{}).fcConsumo));
    if(isNum(mTip)){
      const d = r.fcConsumo - mTip;
      let s = 'No acumulado do ano, o food cost de consumo ('+fmtPct(r.fcConsumo)+') está '
        + (Math.abs(d) < 0.005 ? 'em linha com' : (d > 0 ? pp(d)+' acima da' : pp(Math.abs(d)).replace('+','')+' abaixo da'))
        + ' média dos hotéis '+tip+' ('+fmtPct(mTip)+').';
      if(d >= 0.03) flags.push('tip_acima');
      paras.push(s);
    }
  }

  /* ---- STOCK (acumulado + artigos parados) ---- */
  const notasStock = [];
  if(isNum(r.pesoStock) && r.pesoStock >= 0.18){
    notasStock.push('o inventário acumulado representa '+fmtPct(r.pesoStock)+' das compras do ano ('+eur2(r.stockPax)+'/pax)');
    flags.push('stock_alto');
  }
  if(DATA.artStock && DATA.artStock.ini){
    const parados = [];
    Object.keys(DATA.artStock.fim||{}).forEach(a => {
      const fim = (DATA.artStock.fim[a]||{})[h];
      if(!isNum(fim) || fim < 200) return;               // stock relevante
      const l = invArtLinha(a, [h], 'ult');
      if(isNum(l.cob) && l.cob >= 2.5) parados.push({a, fim, cob: l.cob});
    });
    parados.sort((x,y) => y.fim - x.fim);
    if(parados.length){
      notasStock.push('stock parado em '+parados.slice(0,3).map(x => cap(x.a)+' ('+eur0(x.fim)+', ~'+x.cob.toFixed(1).replace('.',',')+' meses de consumo)').join(', ')+(parados.length>3 ? ' e mais '+(parados.length-3)+' artigos' : ''));
      flags.push('stock_parado');
    }
  }
  if(notasStock.length) paras.push('Nota de stock: '+notasStock.join('; ')+' — avaliar rotação e níveis de encomenda.');

  /* ---- CONFERÊNCIA COM O P&L (mês corrente) ---- */
  if(m === DATA.meta.mes && DATA.conferencias && Object.keys(DATA.conferencias).length){
    const divs = [];
    [['comprasCom','compras de comidas'],['comprasBeb','compras de bebidas'],['recCom','receitas de comidas'],['recBeb','receitas de bebidas']].forEach(([k, lbl]) => {
      const b = DATA.conferencias[k]; if(!b) return;
      const dif = b.dif[h], pl = b.pl[h];
      const rel = isNum(pl) && pl !== 0 ? Math.abs(dif/pl) : 0;
      if(isNum(dif) && (Math.abs(dif) >= 1500 || (rel >= 0.03 && Math.abs(dif) >= 500)))
        divs.push(lbl+' ('+eur0(dif)+')');
    });
    if(divs.length){
      paras.push('Conferência com o P&L: diferenças relevantes em '+divs.join(', ')+' — validar lançamentos com o economato/contabilidade.');
      flags.push('conferencia');
    }
  }

  /* ---- LEITURA FINAL ---- */
  let leitura;
  if(flags.indexOf('food_limite') >= 0 && flags.indexOf('bev_limite') >= 0)
    leitura = 'Prioridade de atuação: ambos os rácios acima dos limites — rever fichas técnicas, preços de compra e controlo de porções, e validar inventários.';
  else if(flags.indexOf('food_limite') >= 0)
    leitura = 'Foco nas comidas: rever as sub-famílias e artigos destacados acima e validar o inventário de fim de mês.';
  else if(flags.indexOf('bev_limite') >= 0)
    leitura = 'Foco nas bebidas: rever ofertas, consumos internos e política de vinhos a copo.';
  else if(flags.indexOf('bev_negativo') >= 0)
    leitura = 'Corrigir os lançamentos de bebidas para que o rácio reflita a operação real.';
  else if(flags.indexOf('conferencia') >= 0)
    leitura = 'Resolver primeiro as diferenças de conferência com o P&L — os rácios podem estar distorcidos por lançamentos em falta.';
  else if(flags.indexOf('tip_acima') >= 0)
    leitura = 'Rácios dentro dos limites, mas acima dos pares da mesma tipologia — comparar fichas técnicas e preços de compra com esses hotéis.';
  else if(flags.indexOf('food_subida') >= 0 || flags.indexOf('bev_subida') >= 0)
    leitura = 'Rácios dentro dos limites mas em subida — acompanhar de perto no próximo fecho.';
  else
    leitura = 'Rácios dentro dos parâmetros — manter o controlo atual.';
  paras.push('Leitura DO: '+leitura);

  return { texto: paras.join('\n\n'), flags };
}
/*ENGINE-END*/
async function copiarTexto(t){
  try{ await navigator.clipboard.writeText(t); toast('Copiado para a área de transferência.'); }
  catch(e){
    const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy'); ta.remove(); toast('Copiado.');
  }
}
function copiarTodosComentarios(){
  if(!DATA) return;
  const m = +($('cmMes').value) || (DATA.meta.mesesComDados||[]).slice(-1)[0];
  const linhas = ['*VG · Custos A&B — '+MESES[m-1]+' '+(DATA.meta.ano||'')+' · '+selectedRegion+'*',''];
  hoteisAtivos().forEach(h => {
    if(cmModoAtual === 'auto'){
      linhas.push('*'+h+'*'); linhas.push(gerarComentario(h, m).texto.replace(/\n\n/g,'\n')); linhas.push('');
    } else {
      const cm = DATA.comentarios[h] || {};
      const t = cm[MESES[m-1].toUpperCase()];
      if(t){ linhas.push('*'+h+'*'); linhas.push(t); linhas.push(''); }
    }
  });
  copiarTexto(linhas.join('\n'));
}

/* =====================================================================
   VISTA · Comentários
===================================================================== */
let cmModoAtual = 'auto';
function cmModo(m){
  cmModoAtual = m;
  $('cmModoAuto').classList.toggle('on', m==='auto');
  $('cmModoManual').classList.toggle('on', m==='manual');
  cmOptions(); renderComentarios();
}
function cmOptions(){
  if(!DATA) return;
  const sel = $('cmMes'); const cur = sel.value;
  if(cmModoAtual === 'auto'){
    const meses = DATA.meta.mesesComDados || [];
    sel.innerHTML = meses.map(m => '<option value="'+m+'">'+MESES[m-1]+'</option>').join('');
    sel.value = ([...sel.options].some(o => o.value === cur)) ? cur : String(meses[meses.length-1]||'');
  } else {
    const mesesSet = new Set();
    Object.values(DATA.comentarios||{}).forEach(cm => Object.keys(cm).forEach(m => mesesSet.add(m)));
    const ordem = MESES.map(m => m.toUpperCase()).filter(m => mesesSet.has(m));
    const extra = [...mesesSet].filter(m => ordem.indexOf(m) < 0);
    sel.innerHTML = '<option value="__all">Todos os meses</option>'
      + [...ordem, ...extra].map(m => '<option>'+esc(m)+'</option>').join('');
    if([...sel.options].some(o => o.value === cur)) sel.value = cur;
  }
}
function cmCard(h, mesLbl, txt, auto){
  const btn = '<button class="tb-btn" style="float:right" onclick="copiarTexto(this.parentElement.querySelector(\'.cm-text\').innerText)">⧉</button>';
  return '<div class="cm-card">'+btn+'<div class="cm-hotel">'+esc(h)+'</div><div class="cm-mes">'+esc(mesLbl)+(auto?' · automático':'')+'</div><div class="cm-text">'+esc(txt)+'</div></div>';
}
function renderComentarios(){
  if(!DATA){ semDados('cmGrid'); return; }
  const hs = hoteisAtivos();
  const filtro = ($('cmFiltro').value||'').toLowerCase();
  const cards = [];
  if(cmModoAtual === 'auto'){
    const m = +($('cmMes').value) || (DATA.meta.mesesComDados||[]).slice(-1)[0];
    $('cmNota').textContent = 'Análise gerada automaticamente a partir dos dados do ficheiro (abas mensais, rácios e stock). Serve de base de trabalho — o diretor valida e ajusta antes de usar.';
    hs.forEach(h => {
      const g = gerarComentario(h, m);
      if(filtro && h.toLowerCase().indexOf(filtro) < 0 && g.texto.toLowerCase().indexOf(filtro) < 0) return;
      cards.push(cmCard(h, MESES[m-1]+' '+(DATA.meta.ano||''), g.texto, true));
    });
  } else {
    $('cmNota').textContent = '';
    const mes = $('cmMes').value || '__all';
    hs.forEach(h => {
      const cm = DATA.comentarios[h] || {};
      Object.keys(cm).forEach(mm => {
        if(mes !== '__all' && mm !== mes) return;
        const txt = cm[mm];
        if(filtro && h.toLowerCase().indexOf(filtro) < 0 && txt.toLowerCase().indexOf(filtro) < 0) return;
        cards.push(cmCard(h, mm, txt, false));
      });
    });
  }
  $('cmGrid').innerHTML = cards.length ? cards.join('') : '<div class="empty">Sem comentários para o filtro atual.</div>';
}

/* =====================================================================
   VISTA · Setup — utilizadores, regiões, auditoria
===================================================================== */
let umEditIdx = -1;
async function renderSetup(){
  if(!USERS) await loadUsers();
  const grid = $('usersGrid');
  grid.innerHTML = USERS.map((u,i) =>
    '<div class="au-row'+(Number(u.ativo)?'':' off')+'">'
    + '<div style="flex:1"><b>'+esc(u.nome||u.login)+'</b><div class="r">'+esc(u.login)+' · '+esc(roleLabel(u.role))+(u.hotel?' · '+esc(u.hotel):'')+'</div></div>'
    + '<button class="tb-btn" onclick="userModal('+i+')">✎</button>'
    + '</div>').join('');
  $('usersCount').textContent = USERS.length + ' utilizadores (' + USERS.filter(u=>Number(u.ativo)).length + ' ativos)';

  /* regiões */
  const hoteis = DATA ? DATA.hoteis : Object.keys(REGIOES_DEFAULT);
  const opts = [...REG_LISTA, REG_OUTROS];
  $('regioesEditor').innerHTML = hoteis.map(h =>
    '<div class="au-row"><div style="flex:1;font-size:10.5px">'+esc(h)+'</div>'
    + '<select class="inp" style="padding:4px 6px;font-size:10.5px" data-hotel="'+esc(h)+'">'
    + opts.map(r => '<option'+(regiaoDe(h)===r?' selected':'')+'>'+esc(r)+'</option>').join('')
    + '</select></div>').join('');

  /* auditoria */
  try{
    const a = (await apiCall('get','audit')) || [];
    $('auditTbl').innerHTML = '<table class="tbl"><thead><tr><th>Data</th><th>Utilizador</th><th>Ação</th><th>Detalhe</th></tr></thead><tbody>'
      + a.slice(0,60).map(x => '<tr><td style="text-align:left">'+new Date(x.ts).toLocaleString('pt-PT')+'</td><td style="text-align:left">'+esc(x.user)+'</td><td style="text-align:left">'+esc(x.acao)+'</td><td style="text-align:left">'+esc(x.detalhe||'')+'</td></tr>').join('')
      + '</tbody></table>';
  }catch(e){ $('auditTbl').innerHTML = '<div class="empty">Auditoria indisponível (sem ligação).</div>'; }
}
async function saveRegioes(){
  const novo = {};
  window.AB35Root.querySelectorAll('#regioesEditor select').forEach(s => { novo[s.dataset.hotel] = s.value; });
  REGIOES = Object.assign({}, REGIOES_DEFAULT, novo);
  try{ await apiRetry('set','regioes', novo); toast('Regiões guardadas e partilhadas.'); audit('regioes','Mapa de regiões atualizado'); }
  catch(e){ toast('Sem ligação — regiões só ficam nesta sessão.'); }
  buildRegBtns(); renderAll();
}
async function resetRegioes(){
  REGIOES = {...REGIOES_DEFAULT};
  try{ await apiRetry('del','regioes'); }catch(e){}
  toast('Regiões repostas por defeito.');
  renderSetup(); buildRegBtns(); renderAll();
}
function userModal(i){
  umEditIdx = (i === undefined) ? -1 : i;
  const u = umEditIdx >= 0 ? USERS[umEditIdx] : {nome:'',login:'',pass:'',role:'DIRETOR',hotel:'',ativo:1};
  $('umTitle').textContent = umEditIdx >= 0 ? 'Editar utilizador' : 'Novo utilizador';
  $('umNome').value = u.nome||''; $('umLogin').value = u.login||''; $('umPass').value = u.pass||'';
  $('umRole').value = u.role||'DIRETOR'; $('umAtivo').value = String(Number(u.ativo)?1:0);
  const hs = DATA ? DATA.hoteis : Object.keys(REGIOES_DEFAULT);
  $('umHotel').innerHTML = '<option value="">— (todos) —</option>' + hs.map(h => '<option'+(u.hotel===h?' selected':'')+'>'+esc(h)+'</option>').join('');
  $('umMsg').textContent = '';
  $('userModalBg').classList.add('on');
}
function closeModal(id){ $(id).classList.remove('on'); }
async function userSave(){
  const u = { nome:$('umNome').value.trim(), login:$('umLogin').value.trim().toLowerCase(),
              pass:$('umPass').value, role:$('umRole').value, hotel:$('umHotel').value, ativo:+$('umAtivo').value };
  if(!u.login || !u.pass){ $('umMsg').textContent = 'Login e password são obrigatórios.'; return; }
  const dup = USERS.findIndex((x,i) => x.login === u.login && i !== umEditIdx);
  if(dup >= 0){ $('umMsg').textContent = 'Já existe um utilizador com esse login.'; return; }
  if(umEditIdx >= 0) USERS[umEditIdx] = u; else USERS.push(u);
  try{
    await apiRetry('set','users', USERS);
    toast('Utilizador guardado.');
    audit('utilizador', (umEditIdx>=0?'Editado ':'Criado ')+u.login);
    closeModal('userModalBg');
    renderSetup();
  }catch(e){ $('umMsg').textContent = 'Falha ao guardar no servidor: '+(e && e.message || e); }
}

/* =====================================================================
   Arranque
===================================================================== */

function vg35RestrictDataset(){
  if(!DATA||!Array.isArray(DATA.hoteis))return;
  DATA.hoteis=DATA.hoteis.filter(h=>ab35MarketAllows(h)&&ab35ProfileAllows(h));
  if(CURRENT_USER&&CURRENT_USER.hotel&&!DATA.hoteis.some(h=>ab35Norm(h)===ab35Norm(CURRENT_USER.hotel))){const hit=DATA.hoteis.find(h=>ab35Norm(h)===ab35Norm(CURRENT_USER.hotel));if(hit)CURRENT_USER.hotel=hit;}
}
function ab35InstallDispatchers(){
  const fns={
    _qtdEhTipo: (typeof _qtdEhTipo==='function'?_qtdEhTipo:null),
    _qtdLerCabecalho: (typeof _qtdLerCabecalho==='function'?_qtdLerCabecalho:null),
    ab35CurrentMarket: (typeof ab35CurrentMarket==='function'?ab35CurrentMarket:null),
    ab35DashUser: (typeof ab35DashUser==='function'?ab35DashUser:null),
    ab35MarketAllows: (typeof ab35MarketAllows==='function'?ab35MarketAllows:null),
    ab35Mount: (typeof ab35Mount==='function'?ab35Mount:null),
    ab35Norm: (typeof ab35Norm==='function'?ab35Norm:null),
    ab35ProfileAllows: (typeof ab35ProfileAllows==='function'?ab35ProfileAllows:null),
    ab35Role: (typeof ab35Role==='function'?ab35Role:null),
    ab35Start: (typeof ab35Start==='function'?ab35Start:null),
    abertos: (typeof abertos==='function'?abertos:null),
    abrirEmail: (typeof abrirEmail==='function'?abrirEmail:null),
    acAbrir: (typeof acAbrir==='function'?acAbrir:null),
    acOptions: (typeof acOptions==='function'?acOptions:null),
    activeView: (typeof activeView==='function'?activeView:null),
    aggRegiao: (typeof aggRegiao==='function'?aggRegiao:null),
    ahOptions: (typeof ahOptions==='function'?ahOptions:null),
    anoRef: (typeof anoRef==='function'?anoRef:null),
    apiCall: (typeof apiCall==='function'?apiCall:null),
    apiRetry: (typeof apiRetry==='function'?apiRetry:null),
    arDataset: (typeof arDataset==='function'?arDataset:null),
    arMesOptions: (typeof arMesOptions==='function'?arMesOptions:null),
    arSubfamOptions: (typeof arSubfamOptions==='function'?arSubfamOptions:null),
    artigoParaSubfam: (typeof artigoParaSubfam==='function'?artigoParaSubfam:null),
    audit: (typeof audit==='function'?audit:null),
    bnAjustada: (typeof bnAjustada==='function'?bnAjustada:null),
    bnDe: (typeof bnDe==='function'?bnDe:null),
    bnSoma: (typeof bnSoma==='function'?bnSoma:null),
    buildAnoSel: (typeof buildAnoSel==='function'?buildAnoSel:null),
    buildChunks: (typeof buildChunks==='function'?buildChunks:null),
    buildRegBtns: (typeof buildRegBtns==='function'?buildRegBtns:null),
    buildTipBtns: (typeof buildTipBtns==='function'?buildTipBtns:null),
    cap: (typeof cap==='function'?cap:null),
    card: (typeof card==='function'?card:null),
    carregarFflate: (typeof carregarFflate==='function'?carregarFflate:null),
    carregarJsPDF: (typeof carregarJsPDF==='function'?carregarJsPDF:null),
    cfClass: (typeof cfClass==='function'?cfClass:null),
    closeModal: (typeof closeModal==='function'?closeModal:null),
    cmCard: (typeof cmCard==='function'?cmCard:null),
    cmModo: (typeof cmModo==='function'?cmModo:null),
    cmOptions: (typeof cmOptions==='function'?cmOptions:null),
    construirEmailHotel: (typeof construirEmailHotel==='function'?construirEmailHotel:null),
    consumoArtigosHotel: (typeof consumoArtigosHotel==='function'?consumoArtigosHotel:null),
    consumoMensalSub: (typeof consumoMensalSub==='function'?consumoMensalSub:null),
    consumoQtdMensal: (typeof consumoQtdMensal==='function'?consumoQtdMensal:null),
    consumoRealMesPorHotel: (typeof consumoRealMesPorHotel==='function'?consumoRealMesPorHotel:null),
    consumoRealSubfam: (typeof consumoRealSubfam==='function'?consumoRealSubfam:null),
    consumoSubfamPorMes: (typeof consumoSubfamPorMes==='function'?consumoSubfamPorMes:null),
    copiarEncomenda: (typeof copiarEncomenda==='function'?copiarEncomenda:null),
    copiarExcessos: (typeof copiarExcessos==='function'?copiarExcessos:null),
    copiarFiavel: (typeof copiarFiavel==='function'?copiarFiavel:null),
    copiarPrevisao: (typeof copiarPrevisao==='function'?copiarPrevisao:null),
    copiarQuantidades: (typeof copiarQuantidades==='function'?copiarQuantidades:null),
    copiarTexto: (typeof copiarTexto==='function'?copiarTexto:null),
    copiarTodosComentarios: (typeof copiarTodosComentarios==='function'?copiarTodosComentarios:null),
    custoUnitSubfam: (typeof custoUnitSubfam==='function'?custoUnitSubfam:null),
    dadosMes: (typeof dadosMes==='function'?dadosMes:null),
    delta: (typeof delta==='function'?delta:null),
    descarregarPDF: (typeof descarregarPDF==='function'?descarregarPDF:null),
    destroyChart: (typeof destroyChart==='function'?destroyChart:null),
    doLogin: (typeof doLogin==='function'?doLogin:null),
    doLogout: (typeof doLogout==='function'?doLogout:null),
    editarBnMes: (typeof editarBnMes==='function'?editarBnMes:null),
    ehArtigoCompravel: (typeof ehArtigoCompravel==='function'?ehArtigoCompravel:null),
    emailDoHotel: (typeof emailDoHotel==='function'?emailDoHotel:null),
    emailEncomenda: (typeof emailEncomenda==='function'?emailEncomenda:null),
    emailPrevisao: (typeof emailPrevisao==='function'?emailPrevisao:null),
    enOptions: (typeof enOptions==='function'?enOptions:null),
    entrar: (typeof entrar==='function'?entrar:null),
    eur0: (typeof eur0==='function'?eur0:null),
    eur2: (typeof eur2==='function'?eur2:null),
    evTipo: (typeof evTipo==='function'?evTipo:null),
    exOptions: (typeof exOptions==='function'?exOptions:null),
    fetchChunks: (typeof fetchChunks==='function'?fetchChunks:null),
    findCell: (typeof findCell==='function'?findCell:null),
    fmtEur: (typeof fmtEur==='function'?fmtEur:null),
    fmtNum: (typeof fmtNum==='function'?fmtNum:null),
    fmtPct: (typeof fmtPct==='function'?fmtPct:null),
    fmtQtd: (typeof fmtQtd==='function'?fmtQtd:null),
    gerarComentario: (typeof gerarComentario==='function'?gerarComentario:null),
    gerarPDFPosicao: (typeof gerarPDFPosicao==='function'?gerarPDFPosicao:null),
    grBaseVal: (typeof grBaseVal==='function'?grBaseVal:null),
    grFamOptions: (typeof grFamOptions==='function'?grFamOptions:null),
    grHotelOptions: (typeof grHotelOptions==='function'?grHotelOptions:null),
    grSubOptions: (typeof grSubOptions==='function'?grSubOptions:null),
    guardarEmailHotel: (typeof guardarEmailHotel==='function'?guardarEmailHotel:null),
    guardarPrevisaoMes: (typeof guardarPrevisaoMes==='function'?guardarPrevisaoMes:null),
    handleFile: (typeof handleFile==='function'?handleFile:null),
    handleFileBn: (typeof handleFileBn==='function'?handleFileBn:null),
    handleFileHist: (typeof handleFileHist==='function'?handleFileHist:null),
    handleFileQtd: (typeof handleFileQtd==='function'?handleFileQtd:null),
    heatColor: (typeof heatColor==='function'?heatColor:null),
    horizonteN: (typeof horizonteN==='function'?horizonteN:null),
    horizonteRestoAno: (typeof horizonteRestoAno==='function'?horizonteRestoAno:null),
    horizonteTudo: (typeof horizonteTudo==='function'?horizonteTudo:null),
    hoteisAtivos: (typeof hoteisAtivos==='function'?hoteisAtivos:null),
    iaAbrirArtigo: (typeof iaAbrirArtigo==='function'?iaAbrirArtigo:null),
    iaOptions: (typeof iaOptions==='function'?iaOptions:null),
    idbGet: (typeof idbGet==='function'?idbGet:null),
    idbOpen: (typeof idbOpen==='function'?idbOpen:null),
    idbSet: (typeof idbSet==='function'?idbSet:null),
    idxSazonal: (typeof idxSazonal==='function'?idxSazonal:null),
    invArtLinha: (typeof invArtLinha==='function'?invArtLinha:null),
    irParaHotel: (typeof irParaHotel==='function'?irParaHotel:null),
    lerXlsxSemPivotCache: (typeof lerXlsxSemPivotCache==='function'?lerXlsxSemPivotCache:null),
    limparCacheAtivos: (typeof limparCacheAtivos==='function'?limparCacheAtivos:null),
    linhasEncomenda: (typeof linhasEncomenda==='function'?linhasEncomenda:null),
    linhasEncomendaQtd: (typeof linhasEncomendaQtd==='function'?linhasEncomendaQtd:null),
    loadLocalExtras: (typeof loadLocalExtras==='function'?loadLocalExtras:null),
    loadUsers: (typeof loadUsers==='function'?loadUsers:null),
    media: (typeof media==='function'?media:null),
    mediaAnual: (typeof mediaAnual==='function'?mediaAnual:null),
    mediana: (typeof mediana==='function'?mediana:null),
    mesLabel: (typeof mesLabel==='function'?mesLabel:null),
    mesesAtivosConjunto: (typeof mesesAtivosConjunto==='function'?mesesAtivosConjunto:null),
    mesesAtivosHotel: (typeof mesesAtivosHotel==='function'?mesesAtivosHotel:null),
    mesesComRoomnightFuturas: (typeof mesesComRoomnightFuturas==='function'?mesesComRoomnightFuturas:null),
    mesesQtd: (typeof mesesQtd==='function'?mesesQtd:null),
    mkChart: (typeof mkChart==='function'?mkChart:null),
    mudarAno: (typeof mudarAno==='function'?mudarAno:null),
    n: (typeof n==='function'?n:null),
    nMesesDados: (typeof nMesesDados==='function'?nMesesDados:null),
    onCenario: (typeof onCenario==='function'?onCenario:null),
    parseOcupacao: (typeof parseOcupacao==='function'?parseOcupacao:null),
    parseQuantidades: (typeof parseQuantidades==='function'?parseQuantidades:null),
    parseWorkbook: (typeof parseWorkbook==='function'?parseWorkbook:null),
    pctVar: (typeof pctVar==='function'?pctVar:null),
    pdfEncomenda: (typeof pdfEncomenda==='function'?pdfEncomenda:null),
    pdfPrevisao: (typeof pdfPrevisao==='function'?pdfPrevisao:null),
    periodoOptions: (typeof periodoOptions==='function'?periodoOptions:null),
    pp: (typeof pp==='function'?pp:null),
    precoMedioArtigo: (typeof precoMedioArtigo==='function'?precoMedioArtigo:null),
    preverArtigos: (typeof preverArtigos==='function'?preverArtigos:null),
    preverConjunto: (typeof preverConjunto==='function'?preverConjunto:null),
    preverQuantidadesHotel: (typeof preverQuantidadesHotel==='function'?preverQuantidadesHotel:null),
    prog: (typeof prog==='function'?prog:null),
    publicarDados: (typeof publicarDados==='function'?publicarDados:null),
    publicarHist: (typeof publicarHist==='function'?publicarHist:null),
    publicarQtd: (typeof publicarQtd==='function'?publicarQtd:null),
    publicarRoomnights: (typeof publicarRoomnights==='function'?publicarRoomnights:null),
    pvHorizonte: (typeof pvHorizonte==='function'?pvHorizonte:null),
    pvHotelOptions: (typeof pvHotelOptions==='function'?pvHotelOptions:null),
    pvSubOptions: (typeof pvSubOptions==='function'?pvSubOptions:null),
    qtOptions: (typeof qtOptions==='function'?qtOptions:null),
    qtdAcum: (typeof qtdAcum==='function'?qtdAcum:null),
    racioMes: (typeof racioMes==='function'?racioMes:null),
    rbOptions: (typeof rbOptions==='function'?rbOptions:null),
    recarregarCloud: (typeof recarregarCloud==='function'?recarregarCloud:null),
    refLbl: (typeof refLbl==='function'?refLbl:null),
    regiaoDe: (typeof regiaoDe==='function'?regiaoDe:null),
    renderAcomp: (typeof renderAcomp==='function'?renderAcomp:null),
    renderAll: (typeof renderAll==='function'?renderAll:null),
    renderArtigos: (typeof renderArtigos==='function'?renderArtigos:null),
    renderComentarios: (typeof renderComentarios==='function'?renderComentarios:null),
    renderConf: (typeof renderConf==='function'?renderConf:null),
    renderEncomenda: (typeof renderEncomenda==='function'?renderEncomenda:null),
    renderEvolucao: (typeof renderEvolucao==='function'?renderEvolucao:null),
    renderExcessos: (typeof renderExcessos==='function'?renderExcessos:null),
    renderGrupos: (typeof renderGrupos==='function'?renderGrupos:null),
    renderHotel: (typeof renderHotel==='function'?renderHotel:null),
    renderHotelAuto: (typeof renderHotelAuto==='function'?renderHotelAuto:null),
    renderInvArt: (typeof renderInvArt==='function'?renderInvArt:null),
    renderInvArtDetalhe: (typeof renderInvArtDetalhe==='function'?renderInvArtDetalhe:null),
    renderPrevisao: (typeof renderPrevisao==='function'?renderPrevisao:null),
    renderPrevisaoQtd: (typeof renderPrevisaoQtd==='function'?renderPrevisaoQtd:null),
    renderQuantidades: (typeof renderQuantidades==='function'?renderQuantidades:null),
    renderRecBeb: (typeof renderRecBeb==='function'?renderRecBeb:null),
    renderResumo: (typeof renderResumo==='function'?renderResumo:null),
    renderRoomnights: (typeof renderRoomnights==='function'?renderRoomnights:null),
    renderRuptura: (typeof renderRuptura==='function'?renderRuptura:null),
    renderSetup: (typeof renderSetup==='function'?renderSetup:null),
    renderStock: (typeof renderStock==='function'?renderStock:null),
    renderSubfam: (typeof renderSubfam==='function'?renderSubfam:null),
    renderView: (typeof renderView==='function'?renderView:null),
    resetCenario: (typeof resetCenario==='function'?resetCenario:null),
    resetRegioes: (typeof resetRegioes==='function'?resetRegioes:null),
    rnAnoOptions: (typeof rnAnoOptions==='function'?rnAnoOptions:null),
    roleLabel: (typeof roleLabel==='function'?roleLabel:null),
    rzModo: (typeof rzModo==='function'?rzModo:null),
    saveRegioes: (typeof saveRegioes==='function'?saveRegioes:null),
    semClass: (typeof semClass==='function'?semClass:null),
    semDados: (typeof semDados==='function'?semDados:null),
    setRegion: (typeof setRegion==='function'?setRegion:null),
    setTip: (typeof setTip==='function'?setTip:null),
    setView: (typeof setView==='function'?setView:null),
    sfModo: (typeof sfModo==='function'?sfModo:null),
    shGrid: (typeof shGrid==='function'?shGrid:null),
    soma: (typeof soma==='function'?soma:null),
    stockAtualArtigo: (typeof stockAtualArtigo==='function'?stockAtualArtigo:null),
    stockAtualQtd: (typeof stockAtualQtd==='function'?stockAtualQtd:null),
    temInventarioQtd: (typeof temInventarioQtd==='function'?temInventarioQtd:null),
    temQuantidades: (typeof temQuantidades==='function'?temQuantidades:null),
    temRoomnights: (typeof temRoomnights==='function'?temRoomnights:null),
    tipologiasDe: (typeof tipologiasDe==='function'?tipologiasDe:null),
    toast: (typeof toast==='function'?toast:null),
    tryRestoreSession: (typeof tryRestoreSession==='function'?tryRestoreSession:null),
    ultimoMesDados: (typeof ultimoMesDados==='function'?ultimoMesDados:null),
    updateMeta: (typeof updateMeta==='function'?updateMeta:null),
    userModal: (typeof userModal==='function'?userModal:null),
    userSave: (typeof userSave==='function'?userSave:null),
    vg35RestrictDataset: (typeof vg35RestrictDataset==='function'?vg35RestrictDataset:null)
  };
  window.__AB35_PREV=window.__AB35_PREV||{};
  for(const [name,fn] of Object.entries(fns)){
    if(typeof fn!=='function')continue;
    if(!(name in window.__AB35_PREV))window.__AB35_PREV[name]=window[name];
    const prev=window.__AB35_PREV[name];
    window[name]=function(...args){
      const ev=window.event,target=ev&&ev.target;const inRoot=!!(target&&window.AB35Root&&target.getRootNode&&target.getRootNode()===window.AB35Root);
      if(inRoot)return fn.apply(target,args);
      if(typeof prev==='function')return prev.apply(this,args);
      return fn.apply(this,args);
    };
  }
  try{Object.defineProperty(window,'iaArtigoSel',{configurable:true,get:()=>iaArtigoSel,set:v=>{iaArtigoSel=v;}});}catch(e){}
}
async function ab35Start(){
  const u=ab35DashUser()||{name:'Utilizador VG',user:'vg',role:'direcao',hotel:'*'};
  const hs=Array.isArray(u.hotels)?u.hotels:(u.hotel&&u.hotel!=='*'?[u.hotel]:[]);CURRENT_USER={nome:u.name||u.user||'Utilizador VG',login:u.user||u.login||'vg',role:ab35Role(u),hotel:hs.length===1?ab35Norm(hs[0]):'',hoteis:hs.map(ab35Norm),ativo:1};
  USERS=[CURRENT_USER];
  const isDO=CURRENT_USER.role==='DO';
  const el=id=>window.AB35Root.getElementById(id);
  if(el('tbUserName'))el('tbUserName').textContent=CURRENT_USER.nome;
  if(el('tbAvatar'))el('tbAvatar').textContent=(CURRENT_USER.nome||'VG').slice(0,1).toUpperCase();
  if(el('tbUserRole'))el('tbUserRole').textContent=roleLabel(CURRENT_USER.role)+(CURRENT_USER.hoteis?.length?(CURRENT_USER.hoteis.length<=2?' · '+CURRENT_USER.hoteis.join(' · '):' · '+CURRENT_USER.hoteis.length+' hotéis'):'');
  if(el('adminCap'))el('adminCap').style.display=isDO?'':'none';
  if(el('navCarregar'))el('navCarregar').style.display=isDO?'':'none';
  if(el('navSetup'))el('navSetup').style.display=isDO?'':'none';
  await loadLocalExtras();
  try{await recarregarCloud(false)}catch(e){console.warn('A&B nativo: sincronização inicial',e);}
  vg35RestrictDataset();buildRegBtns();buildTipBtns();updateMeta();
  const btn=window.AB35Root.querySelector('.nav-btn[data-view="resumo"]');setView('resumo',btn);
}
async function ab35Mount(container){
  if(!container)return;
  const mk=ab35CurrentMarket();
  if(AB35_HOST&&AB35_HOST.parentNode===container){if(AB35_MARKET!==mk){AB35_MARKET=mk;selectedRegion='Todos';selectedTip='Todas';AB35_INIT=recarregarCloud(false).then(()=>{vg35RestrictDataset();buildRegBtns();buildTipBtns();renderAll();});}return AB35_INIT;}
  container.innerHTML='';AB35_HOST=document.createElement('div');AB35_HOST.className='vg-native-module vg-compras-native-v35';container.appendChild(AB35_HOST);
  AB35_SHADOW=AB35_HOST.attachShadow({mode:'open'});window.AB35Root=AB35_SHADOW;AB35_MARKET=mk;
  AB35_SHADOW.innerHTML='<link rel="stylesheet" href="assets/css/compras-ab-native-v35.css">'+AB35_TEMPLATE;
  ab35InstallDispatchers();
  AB35_INIT=ab35Start();return AB35_INIT;
}
window.VG.comprasNative35={version:35.3,mount:ab35Mount,reload:()=>recarregarCloud(true),getRoot:()=>AB35_SHADOW,source:'custos-compras-main/index.html',architecture:'native-shadow-module'};
})();
