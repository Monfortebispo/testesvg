const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const pkg=require('../package.json'),html=read('index.html'),js=read('assets/js/modules/operations-domains-v33.js'),css=read('assets/css/operations-domains-v33.css'),nav=read('assets/js/ui/vg-operations-2-v30.js'),search=read('assets/js/ui/global-search.js'),pdf=read('assets/js/modules/pdf-export.js'),ig=read('assets/js/modules/instagram.js'),server=read('netlify/functions/dashboard-sessao.js'),sw=read('service-worker.js'),seed=require('../assets/data/operations-seed-v33.json');
assert(Number(pkg.version.split('.')[0])>=35,'package deve identificar V35 ou superior');
for(const id of ['view-receitasdet','view-ab','view-housekeeping'])assert(html.includes(`id="${id}"`),`view V33 em falta: ${id}`);
assert(html.includes('operations-domains-v33.js')&&html.includes('operations-domains-v33.css'),'index deve carregar módulo/CSS V33');
assert((nav.includes("button('receitasdet'")||html.includes('id="nav-receitasdet"'))&&(nav.includes("button('ab'")||html.includes('id="nav-ab"'))&&(nav.includes("button('housekeeping'")||html.includes('id="nav-housekeeping"')),'navegação deve expor os três novos domínios');
assert(nav.includes("group('Operação Integrada',['receitasdet','ab','housekeeping','reputacao'])")&&nav.includes("group('Qualidade & Comunicação',['instagram'])"),'grupos operacionais V33.1 devem estar visíveis e integrados');
assert(search.includes("title:'Receita Detalhada'")&&search.includes("title:'Compras & A&B'")&&search.includes("title:'Housekeeping"),'pesquisa global deve encontrar novos domínios');

// Reputação: melhor dos três mundos.
for(const token of ['Visão Executiva','Semanal','Semestral','Hotel','Executivo','Unidades','Departamentos','Semântica','Concorrência','Respostas','Menções','Comparar'])assert(js.includes(token),`reputação integrada deve incluir ${token}`);
for(const role of ['Indexes Evolution','My Establishments','Reviews / Competition','Reviews Management Responses','Semantic / Results','Reviews / Results'])assert(js.includes(role),`reconhecimento semestral deve cobrir ${role}`);
assert(js.includes("window.VG.shared.get(resource,'state')")&&js.includes("ops-reputation-semester")&&js.includes("ops-ab")&&js.includes("ops-housekeeping"),'novos domínios devem restaurar estado partilhado');
assert(server.includes('ops-reputation-semester-')&&server.includes('ops-ab-')&&server.includes('ops-housekeeping-')&&server.includes('buildVersion:"35.6"'),'backup/auditoria deve conhecer recursos V33');

// Housekeeping V35: módulo nativo reconstruído, sem iframe/segundo login.
const hkExact=read('assets/js/modules/housekeeping-native-v35.js');
for(const c of ['Fim de vida','Mancha/nódoa','Desaparecido/roubo','Dano de lavagem','Outro'])assert(hkExact.includes(c),`causa HK em falta: ${c}`);
for(const t of ['Campanhas de inventário','Projeção de compra','Mapa de quebras','Alertas de rutura','Registo de alterações'])assert(hkExact.includes(t),`função HK original em falta: ${t}`);
assert(hkExact.includes('hk35SessionFromDashboard')&&hkExact.includes('vgAuthCurrent'),'Housekeeping deve reutilizar sessão da Dashboard');
assert(!hkExact.includes('integrated/housekeeping/index.html'),'Housekeeping V35 não pode voltar a iframe/standalone');

// Seeds reais fornecidos pelo utilizador.
assert.strictEqual(seed.weeklyReputation.reports.length,310,'seed semanal deve preservar 310 relatórios');
assert(seed.technicalLibrary.recipes.length>=200&&seed.technicalLibrary.products.length>=35&&seed.technicalLibrary.beveragePriceMatrix.length>=40,'biblioteca técnica deve preservar receitas/produtos/preços');
assert.strictEqual(seed.detailedRevenue[0].rows.length,693,'exemplo de receita detalhada deve preservar 693 linhas');
assert(/período não identificado/i.test(seed.detailedRevenue[0].periodLabel||seed.detailedRevenue[0].label||''),'não se deve inventar período na receita detalhada');
assert.strictEqual(seed.housekeepingSeed.hotels.length,50,'seed HK deve preservar hotéis do módulo original');
assert.strictEqual(seed.housekeepingSeed.catalog.categorias.length,25,'seed HK deve preservar 25 categorias');
assert.strictEqual(seed.housekeepingSeed.catalog.categorias.reduce((n,c)=>n+(c.linhas||[]).length,0),121,'seed HK deve preservar 121 linhas categoria/cama/medida');
assert.strictEqual(Object.keys(seed.housekeepingSeed.vestido100).length,32,'parametrização vestido 100% deve estar integrada');

// Receita detalhada + A&B + fichas técnicas.
for(const t of ['Ponto de venda','Família','Subfamília','Grupo','Artigo','Consumo Teórico','Inteligência','Fichas Técnicas'])assert(js.includes(t),`integração comercial/A&B deve incluir ${t}`);
const abExact=read('assets/js/modules/compras-ab-native-v35.js');assert(abExact.includes('Evolução Mensal'),'A&B deve manter motor analítico');assert(abExact.includes('Sugestão de Encomenda')&&abExact.includes('Excessos de Stock')&&abExact.includes('Previsto vs. Real'),'A&B original completo deve estar reconstruído como módulo nativo');assert(!abExact.includes('integrated/custos-ab/index.html'),'A&B V35 não pode voltar a iframe/standalone');

// PDF/cabeçalhos e Instagram: correções da auditoria anterior.
assert(pdf.includes('<th>Δ €</th><th>Δ %</th>'),'Resumo PDF deve separar variação absoluta e percentual');
const kpiHeader=(pdf.match(/const th = `<tr><th>Hotel<\/th><th>Occ[\s\S]*?<\/tr>`;/)||[])[0]||'';
assert.strictEqual((kpiHeader.match(/<th>/g)||[]).length,25,'tabela KPI PDF deve ter 25 cabeçalhos para 25 colunas');
assert(pdf.includes('Rank VG')&&pdf.includes('pdf-logo')&&pdf.includes('alt="Vila Galé"'),'PDF deve corrigir reputação e branding');
assert(ig.includes('Sem dados')&&ig.includes('growthValid'),'Instagram deve distinguir ausência de dados de queda real para zero');

// PWA e Ficha Hotel protegida.
assert(sw.includes("const CACHE_NAME = 'vg-operations-shell-v35-6'")&&sw.includes('/assets/js/modules/operations-domains-v33.js')&&!sw.includes('/assets/js/modules/compras-ab-native-v35.js')&&!sw.includes('/assets/js/modules/housekeeping-native-v35.js'),'PWA V35 deve cachear os módulos nativos');
const ficha=read('assets/js/modules/ficha-hotel.js');assert.strictEqual(crypto.createHash('sha256').update(ficha).digest('hex'),'2779d6f5cbfcedb672f037494ee54847a16aec2247f5a0594346e3e6c4963dc7','Ficha do Hotel deve permanecer byte-a-byte inalterada');
assert(css.includes('.od-subtabs')&&css.includes('.od-toolbar'),'UI semestral deve ter navegação/filtros próprios');
assert(html.includes('V35.6 · Navegação & Governanta')&&nav.includes('Novos módulos já disponíveis'),'V35.6 deve ser imediatamente identificável após deploy');
console.log('✓ V35.6: integração nativa e retrocompatibilidade V33 auditadas');
