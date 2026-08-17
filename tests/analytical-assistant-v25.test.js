const assert=require('assert');
const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const {ROOT,createSandbox,load}=require('./helpers/browser-sandbox');

const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(ROOT,'service-worker.js'),'utf8');
const mobile=fs.readFileSync(path.join(ROOT,'assets/js/ui/mobile-pwa.js'),'utf8');
const search=fs.readFileSync(path.join(ROOT,'assets/js/ui/global-search.js'),'utf8');
const jsPath=path.join(ROOT,'assets/js/modules/analytical-assistant-v25.js');
const cssPath=path.join(ROOT,'assets/css/analytical-assistant-v25.css');
cp.execFileSync(process.execPath,['--check',jsPath],{stdio:'pipe'});
assert(fs.existsSync(cssPath),'CSS do Assistente V25 deve existir');
assert(html.includes('nav-analyticalassistant')&&html.includes('view-analyticalassistant')&&html.includes('analytical-assistant-v25.js')&&html.includes('analytical-assistant-v25.css'),'V25 deve estar ligada ao menu, vista, JS e CSS');
assert(sw.includes('vg-operations-shell-v32')&&sw.includes('/assets/js/modules/analytical-assistant-v25.js')&&sw.includes('/assets/css/analytical-assistant-v25.css'),'PWA deve incluir o Assistente V25 no shell estático');
assert(mobile.includes('data-action="assistant"'),'mobile deve expor o Assistente Analítico');
assert(search.includes("type:'assistant'")&&search.includes('analyticalAssistant?.open'),'Pesquisa Global deve encontrar e abrir o Assistente');

const RAW={
  hotel_list:['OPERA','ESTORIL','SINTRA'],
  hotels_ops:{
    OPERA:{'Ocupados':{'2025':500,'2026':550}},
    ESTORIL:{'Ocupados':{'2025':600,'2026':720}},
    SINTRA:{'Ocupados':{'2025':400,'2026':360}}
  },
  hotels_costs:{
    OPERA:{PESSOAL:{'2025':30000,'2026':39000}},
    ESTORIL:{PESSOAL:{'2025':40000,'2026':44000}},
    SINTRA:{PESSOAL:{'2025':25000,'2026':25500}}
  },hotels_rev:{}
};
function makeModel(h){
  const vals={
    OPERA:{revenue:[120000,20],gop:[36000,-10],gopMargin:[30,-5],occupancy:[55,5],adr:[110,3],revpar:[60.5,8],costRatio:[70,4],personnelRatio:[32.5,5]},
    ESTORIL:{revenue:[160000,8],gop:[48000,5],gopMargin:[30,1],occupancy:[72,12],adr:[115,6],revpar:[82.8,15],costRatio:[68,-2],personnelRatio:[27.5,-1]},
    SINTRA:{revenue:[90000,-12],gop:[18000,-30],gopMargin:[20,-8],occupancy:[45,-10],adr:[105,-4],revpar:[47.25,-14],costRatio:[80,8],personnelRatio:[28.3,3]}
  }[h];
  const labels={revenue:'Receita',gop:'GOP com sede',gopMargin:'Margem GOP',occupancy:'Ocupação',adr:'ADR',revpar:'RevPAR',costRatio:'Custos / Receita',personnelRatio:'Pessoal / Receita'};
  const kpis=Object.entries(vals).map(([id,[value,delta]])=>({id,label:labels[id],value,display:String(value),delta,deltaDisplay:(delta>=0?'+':'')+delta+(['occupancy','gopMargin','costRatio','personnelRatio'].includes(id)?' p.p.':'%'),region:null,target:null}));
  return {available:true,hotel:h,kpis,status:{label:h==='SINTRA'?'Crítico':'Atenção',level:h==='SINTRA'?'critical':'attention'},risks:[{title:h==='SINTRA'?'GOP em queda':'Acompanhar margem'}],opportunities:[{title:'Oportunidade ADR'}],forecast:{available:true,month:9,monthLabel:'Setembro',forecast:h==='ESTORIL'?82:h==='OPERA'?70:58,target:h==='ESTORIL'?80:75,gap:h==='ESTORIL'?2:h==='OPERA'?-5:-17,confidence:{score:80}},actionInfo:{active:[],overdue:[]}};
}
const sb=createSandbox({RAW,YR_CUR:'2026',YR_PREV:'2025'});
sb.window.vgAuthCurrent=()=>({user:'dir',name:'Direção',role:'direcao',hotel:'*'});sb.vgAuthCurrent=sb.window.vgAuthCurrent;
sb.window.VG={
  util:{escapeHtml:v=>String(v),monthName:m=>({9:'Setembro'})[m]||String(m)},state:{currentYear:()=> '2026'},events:{on(){}},performance:{schedule:(k,fn)=>fn()},
  hotelPerformance:{allHotels:()=>['OPERA','ESTORIL','SINTRA'],buildModel:makeModel},
  forecast:{buildBase(h,m){const x=makeModel(h).forecast;return {available:true,forecastOcc:x.forecast,target:x.target,confidence:{score:80}};}},
  actions:{ensureLoaded:async()=>{},all:()=>[{id:'1',hotel:'OPERA',status:'open',dueDate:'2026-08-01',sourceTitle:'Validar custos',ownerName:'Diretor'}],isOverdue:a=>a.dueDate<'2026-08-14'},
  agenda:{ensureLoaded:async()=>{}},anomalies:{build:()=>({rows:[{hotel:'SINTRA',severity:'red',title:'GOP atípico',detail:'Desvio face ao histórico',amount:5000}]})}
};sb.VG=sb.window.VG;
sb.window.cdGetData=()=>({meta:{meses:[202607,202608]},dic:{art:['','Água','Café'],forn:['','Fornecedor A'],hoteis:['','OPERA','ESTORIL','SINTRA']},PM:[[1,1,1,0,100,100],[1,1,1,1,130,100],[2,1,2,0,200,100],[2,1,2,1,210,100]]});sb.cdGetData=sb.window.cdGetData;
load('assets/js/modules/analytical-assistant-v25.js',sb);
const api=sb.window.VG.analyticalAssistant;
assert(api&&api.version===25,'API V25 deve existir');
assert.strictEqual(api.findMonth('forecast abaixo da meta em setembro'),9,'deve interpretar meses em português');
assert.deepStrictEqual(Array.from(api.findHotels('Compara Opera e Estoril')),['OPERA','ESTORIL'],'deve identificar hotéis na pergunta');

(async()=>{
  const compare=await api.interpret('Compara Opera e Estoril');
  assert.strictEqual(compare.kind,'compare');assert(compare.rows.some(r=>r.Indicador==='GOP'),'comparação deve conter GOP');
  const det=await api.interpret('Quais são os 2 hotéis com maior deterioração do GOP?');
  assert.strictEqual(det.kind,'deterioration');assert.strictEqual(det.rows[0].Hotel,'SINTRA','Sintra deve ter a maior deterioração do GOP no cenário');
  const forecast=await api.interpret('Que hotéis têm forecast abaixo da meta em setembro?');
  assert.strictEqual(forecast.kind,'forecast');assert(forecast.rows.some(r=>r.Hotel==='OPERA')&&forecast.rows.some(r=>r.Hotel==='SINTRA')&&!forecast.rows.some(r=>r.Hotel==='ESTORIL'),'forecast deve filtrar apenas abaixo da meta');
  const eff=await api.interpret('Onde os custos de pessoal cresceram acima da atividade?');
  assert.strictEqual(eff.kind,'efficiency');assert(eff.rows.some(r=>r.Hotel==='OPERA'),'deve comparar crescimento de pessoal com quartos ocupados');
  const pur=await api.interpret('Que artigo aumentou mais de preço?');
  assert.strictEqual(pur.kind,'purchases');assert.strictEqual(pur.rows[0].Artigo,'Água');assert(pur.summary.includes('preços médios ponderados'),'não deve chamar último preço de fatura ao preço mensal agregado');
  const unknown=await api.interpret('Qual é a cor favorita do hotel?');
  assert.strictEqual(unknown.kind,'help');assert(unknown.summary.includes('não inventar')||unknown.summary.includes('não consegui')||unknown.title.includes('Não consegui'),'pergunta fora do modelo deve ser recusada sem alucinar');
  sb.window.vgAuthCurrent=()=>({user:'d1',role:'diretor',hotel:'OPERA'});
  sb.window.VG.hotelPerformance.allHotels=()=>['OPERA'];
  assert.deepStrictEqual(Array.from(api.allowedHotels()),['OPERA'],'permissões devem limitar o assistente ao hotel autorizado');
  console.log('✓ V25: linguagem natural, comparação, rankings, forecast, eficiência, compras, rastreabilidade e permissões');
})().catch(e=>{console.error(e);process.exit(1);});
