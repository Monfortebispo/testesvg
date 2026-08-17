const assert=require('assert');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const vm=require('vm');
const cp=require('child_process');
const {ROOT}=require('./helpers/browser-sandbox');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,p))).digest('hex');

const html=read('index.html'),ui=read('assets/js/ui/vg-operations-2-v30.js'),h360=read('assets/js/modules/hotel-360-v30.js'),score=read('assets/js/modules/operational-score-v28.js'),rh=read('assets/js/modules/revenue-hub-v30.js'),sw=read('service-worker.js');
for(const f of ['assets/js/ui/vg-operations-2-v30.js','assets/js/modules/hotel-360-v30.js','assets/js/modules/operational-score-v28.js','assets/js/modules/revenue-hub-v30.js'])cp.execFileSync(process.execPath,['--check',path.join(ROOT,f)],{stdio:'pipe'});

assert(html.includes('id="view-hotel360"')&&html.includes('id="hotel360Root"'),'V30 deve criar Hotel 360º');
assert(html.includes('id="view-revenuehub"')&&html.includes('v30RevenuePanel-current')&&html.includes('v30RevenuePanel-forecast')&&html.includes('v30RevenuePanel-scenarios'),'V30 deve criar Revenue & Forecast unificado');
assert(html.includes('assets/css/vg-operations-2-v30.css')&&html.includes('vg-operations-2-v30.js'),'recursos V30 devem estar ligados');
assert(html.includes('<button class="sb-nav-btn" id="nav-fichahotel" onclick="setView(\'fichahotel\')"><span class="sb-nav-icon">📝</span> Comentários Fecho do Mês</button>'),'Comentários Fecho do Mês deve manter entrada própria, sem perder a funcionalidade original');
assert.strictEqual(sha('assets/js/modules/ficha-hotel.js'),'2779d6f5cbfcedb672f037494ee54847a16aec2247f5a0594346e3e6c4963dc7','V30 não pode alterar o módulo Ficha do Hotel');
assert(ui.includes("group('Início & Hotéis',['resumo','hoteis','fichahotel'])")&&ui.includes('Hotel 360º')&&ui.includes('Revenue & Forecast'),'menu deve incluir Hotéis e Comentários Fecho do Mês');
assert(ui.includes("legacyHidden")&&ui.includes("'alertas'")&&ui.includes("'analyticalassistant'"),'Alertas clássicos e Assistente devem sair do menu principal, não do produto');
assert(ui.includes('Perguntar aos dados')&&ui.includes('analyticalAssistant?.open'),'Assistente deve tornar-se ação transversal no topo');
assert(rh.includes("current:'revenueint'")&&rh.includes("forecast:'forecast'")&&rh.includes("scenarios:'scenariocompare'"),'Revenue Hub deve reutilizar os três módulos existentes');
assert(h360.includes('causeAnalysis')&&h360.includes('Objetivos &amp; plano de recuperação')&&h360.includes('openForPriority'),'Hotel 360 deve incluir causa e planos ligados a Ações');
assert(score.includes("settings','score-v30")&&score.includes('DEFAULT_WEIGHTS')&&score.includes('dimensionScores'),'Score deve ser explicável e pesos partilhados');
assert(ui.includes('buildDirectionHome')&&ui.includes('buildHotelHome'),'Home deve diferir por perfil');
assert(/vg-operations-shell-v32-[2-9]/.test(sw)&&sw.includes('/assets/js/modules/hotel-360-v30.js')&&sw.includes('/assets/js/modules/operational-score-v28.js')&&sw.includes('/assets/js/modules/revenue-hub-v30.js')&&sw.includes('/assets/js/ui/vg-operations-2-v30.js')&&sw.includes('/assets/css/vg-operations-2-v30.css'),'PWA deve incluir shell V30');
assert(read('netlify/functions/dashboard-sessao.js').includes('marketStoreKey')&&read('netlify/functions/dashboard-sessao.js').includes('market/brasil'),'V31 pode alterar backend apenas para isolar mercados; funcionalidades V30 permanecem');

// Teste funcional mínimo do Score: normalização dos pesos e cálculo determinístico.
const sandbox={window:{VG:{shared:{get:async()=>({data:null}),post:async()=>({ok:true})},events:{emit(){}}}},console,Date,Math,Number,String,Object,Array,JSON,Promise,setTimeout,clearTimeout};sandbox.window.window=sandbox.window;sandbox.window.vgAuthCurrent=()=>({role:'direcao'});vm.createContext(sandbox);vm.runInContext(score,sandbox,{filename:'operational-score-v28.js'});const api=sandbox.window.VG.operationalScore;
const weights=api.normalizeWeights({financial:1,revenue:1,efficiency:1,reputation:1,execution:1,data:1});const total=Object.values(weights).reduce((a,b)=>a+b,0);assert(Math.abs(total-100)<0.001,'pesos devem ser normalizados a 100%');
const model={available:true,hotel:'TESTE',kpis:[{id:'revenue',delta:5,target:{value:5},region:4},{id:'gopMargin',value:30,target:{value:25},region:24},{id:'occupancy',value:80,target:{value:78},region:75},{id:'adr',value:120,target:{value:115},region:110},{id:'revpar',value:96,target:null,region:82},{id:'costRatio',value:70,target:{value:72},region:73},{id:'personnelRatio',value:30,target:{value:32},region:33}],forecast:{available:true,gap:2},reputation:{gri:88,response:95},actionInfo:{active:[],overdue:[]},quality:{critical:0,attention:0}};
const result=api.calculate(model);assert(result.available&&result.score>=70&&result.score<=100,'score deve responder a desempenho favorável');assert(Object.keys(result.dimensions).length===6,'score deve expor seis dimensões');
console.log('✓ V30: simplificação, Hotéis recuperado, Comentários preservados, Hotel 360, Score, causa, planos, Revenue Hub e Home por perfil');
