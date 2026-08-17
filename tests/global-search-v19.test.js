const assert=require('assert');
const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const {ROOT,createSandbox,load}=require('./helpers/browser-sandbox');

const jsPath=path.join(ROOT,'assets/js/ui/global-search.js');
const cssPath=path.join(ROOT,'assets/css/global-search.css');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const js=fs.readFileSync(jsPath,'utf8');
const css=fs.readFileSync(cssPath,'utf8');
const sw=fs.readFileSync(path.join(ROOT,'service-worker.js'),'utf8');
cp.execFileSync(process.execPath,['--check',jsPath],{stdio:'pipe'});

assert(html.includes('assets/js/ui/global-search.js')&&html.includes('assets/css/global-search.css'),'Pesquisa Global deve estar ligada ao HTML');
assert(js.includes("e.ctrlKey||e.metaKey")&&js.includes("toLowerCase()==='k'"),'Ctrl/Cmd+K deve abrir a pesquisa');
assert(js.includes('VG.search={version:19'),'API VG.search v19 deve existir');
assert(css.includes('#vgGlobalSearch')&&css.includes('.vg-search-mobile-trigger'),'pesquisa deve ter command palette e acesso mobile');
assert(sw.includes('/assets/js/ui/global-search.js')&&sw.includes('/assets/css/global-search.css'),'PWA deve pré-cachear apenas os recursos estáticos da pesquisa');
assert(!/password|passwordhash|passwordsalt|authToken|vg_auth_token/i.test(js),'Pesquisa Global não deve indexar credenciais');

const s=createSandbox({
  RAW:{
    hotel_list:['ESTORIL','OPERA'],
    hotels_ops:{
      ESTORIL:{'Receita Total':{'2026':120000},Ocupados:{'2026':800},Disponiveis:{'2026':1000},ADR:{'2026':150}},
      OPERA:{'Receita Total':{'2026':100000},Ocupados:{'2026':700},Disponiveis:{'2026':1000},ADR:{'2026':142}}
    },
    hotels_costs:{ESTORIL:{TOTAIS:{'2026':90000}},OPERA:{TOTAIS:{'2026':82000}}},hotels_rev:{}
  },
  HS_SHARED_CACHE:{ESTORIL:{comments:{'2026':{'7':{gop_com_sede:'Rever custo de energia e escala de pessoal'}}}}},
  window:{
    vgAuthCurrent:()=>({user:'pmonforte',name:'Pedro',role:'direcao',hotel:'*'}),
    vgDataCenterHistory:()=>[{source:'pnl_month',sourceName:'P&L mensal',fileName:'P_L_Julho.xlsx',summary:'Julho carregado',createdAt:'2026-08-14T10:00:00Z'}],
    vgGovernanceRows:()=>[{action:'Metas atualizadas',name:'Pedro',category:'Metas',resource:'targets-rules',detail:'Ocupação Estoril',serverTs:'2026-08-14T10:00:00Z'}],
    cdGetData:()=>({meta:{meses:[202607]},dic:{hoteis:['','ESTORIL'],art:['','Água Mineral 50cl'],forn:['','Fornecedor XPTO']},PM:[[1,1,1,0,120,60]]})
  }
});
s.window.VG={
  util:{escapeHtml:v=>String(v)},
  state:{selectedMonths:()=>[7],currentYear:()=> '2026'},
  kpi:{
    gop:(h)=>h==='ESTORIL'?30000:18000,
    gopPct:(h)=>h==='ESTORIL'?25:18,
    occupancy:(h)=>h==='ESTORIL'?80:70,
    adr:(h)=>h==='ESTORIL'?150:142,
    revpar:(h)=>h==='ESTORIL'?120:99.4,
    totalCosts:(h)=>h==='ESTORIL'?90000:82000
  },
  actions:{all:()=>[{id:'a1',title:'Rever escala housekeeping',hotel:'ESTORIL',status:'open',assigneeName:'Diretor',dueDate:'2026-08-20'}]},
  targetsRules:{
    getConfig:()=>({rules:{occ_low:{enabled:true,value:75,severity:'warning'}},targets:{ESTORIL:{'2026':{'7':{occupancy:85}}}}}),
    ruleDefs:[{id:'occ_low',label:'Ocupação mínima'}],targetDefs:[{id:'occupancy',label:'Ocupação'}]
  }
};
s.VG=s.window.VG;
load('assets/js/ui/global-search.js',s);
const idx=s.window.VG.search.buildIndex();
assert(idx.some(x=>x.type==='hotel'&&x.title==='ESTORIL'),'deve indexar hotéis');
assert(idx.some(x=>x.type==='kpi'&&/Ocupação/.test(x.title)),'deve indexar KPIs canónicos');
assert(idx.some(x=>x.type==='action'&&/housekeeping/i.test(x.title)),'deve indexar ações');
assert(idx.some(x=>x.type==='article'&&/Água Mineral/.test(x.title)),'deve indexar artigos de compras');
assert(idx.some(x=>x.type==='supplier'&&/Fornecedor XPTO/.test(x.title)),'deve indexar fornecedores');
assert(idx.some(x=>x.type==='comment'&&/energia/i.test(x.subtitle)),'deve indexar comentários carregados da Ficha');
assert(idx.some(x=>x.type==='target'),'deve indexar metas/regras');
assert(idx.some(x=>x.type==='data'&&/P&L mensal/.test(x.title)),'deve indexar histórico do Centro de Dados');
assert(idx.some(x=>x.type==='governance'),'Direção deve poder pesquisar auditoria já autorizada');
const agua=s.window.VG.search.run('agua mineral');
assert(agua.some(x=>x.type==='article'),'pesquisa deve ser insensível a acentos');
const est=s.window.VG.search.run('estoril ocupacao');
assert(est.some(x=>x.type==='kpi'&&/Ocupação/.test(x.title)),'consulta composta hotel + KPI deve encontrar o indicador');
console.log('✓ pesquisa global v19: Ctrl+K, índice multi-módulo, acentos, permissões e PWA');

// Um perfil não-Direção nunca recebe itens de Auditoria, mesmo que uma função externa tente fornecê-los.
const d=createSandbox({
  RAW:{hotel_list:['ESTORIL'],hotels_ops:{ESTORIL:{}},hotels_costs:{},hotels_rev:{}},
  window:{vgAuthCurrent:()=>({user:'diretor',name:'Diretor',role:'diretor',hotel:'ESTORIL'}),vgGovernanceRows:()=>[{action:'Evento reservado',detail:'Não deve aparecer'}]}
});
d.window.VG={util:{escapeHtml:v=>String(v)},state:{selectedMonths:()=>[],currentYear:()=> '2026'},kpi:{},actions:{all:()=>[]},targetsRules:{getConfig:()=>({rules:{},targets:{}}),ruleDefs:[],targetDefs:[]}};d.VG=d.window.VG;
load('assets/js/ui/global-search.js',d);
assert(!d.window.VG.search.buildIndex().some(x=>x.type==='governance'),'perfis não-Direção não podem indexar Auditoria');
