const assert=require('assert');
const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const {ROOT,createSandbox,load}=require('./helpers/browser-sandbox');

const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(ROOT,'service-worker.js'),'utf8');
const mobile=fs.readFileSync(path.join(ROOT,'assets/js/ui/mobile-pwa.js'),'utf8');
const search=fs.readFileSync(path.join(ROOT,'assets/js/ui/global-search.js'),'utf8');
const jsPath=path.join(ROOT,'assets/js/modules/hotel-performance-v23.js');
const cssPath=path.join(ROOT,'assets/css/hotel-performance-v23.css');
cp.execFileSync(process.execPath,['--check',jsPath],{stdio:'pipe'});
assert(fs.existsSync(cssPath),'CSS da Performance V23 deve existir');
assert(html.includes('nav-hotelperformance')&&html.includes('view-hotelperformance')&&html.includes('hotel-performance-v23.js')&&html.includes('hotel-performance-v23.css'),'V23 deve estar ligada ao menu, vista, JS e CSS');
assert(sw.includes('vg-operations-shell-v32')&&sw.includes('/assets/js/modules/hotel-performance-v23.js')&&sw.includes('/assets/css/hotel-performance-v23.css'),'PWA deve incluir V23 no shell estático');
assert(mobile.includes('data-view="hotel360"'),'V30 deve expor a Performance através do Hotel 360º no mobile');
assert(search.includes("type:'performance'")&&search.includes('hotelPerformance?.openHotel'),'Pesquisa Global deve abrir a V23 por hotel');

function ops(rec25,rec26,aloj25,aloj26,occ25,occ26,disp25,disp26,gop25,gop26){return{
  'Receita Total':{'2025':rec25,'2026':rec26},'Receita Alojamento':{'2025':aloj25,'2026':aloj26},
  'Ocupados':{'2025':occ25,'2026':occ26},'Disponiveis':{'2025':disp25,'2026':disp26},'GOP COM SEDE':{'2025':gop25,'2026':gop26}
};}
const RAW={hotel_list:['OPERA','ESTORIL'],hotels_ops:{OPERA:ops(100000,120000,50000,66000,500,600,1000,1000,30000,42000),ESTORIL:ops(150000,160000,75000,80000,700,740,1000,1000,40000,43000)},hotels_costs:{OPERA:{TOTAIS:{'2025':70000,'2026':78000},PESSOAL:{'2025':30000,'2026':34000}},ESTORIL:{TOTAIS:{'2025':110000,'2026':117000},PESSOAL:{'2025':48000,'2026':50000}}},hotels_rev:{}};
const sb=createSandbox({RAW,selectedMeses:new Set([8]),STORE:{8:{hotels_ops:RAW.hotels_ops,hotels_costs:RAW.hotels_costs}},REGIOES:{lisboa:['OPERA','ESTORIL']}});
sb.window.vgAuthCurrent=()=>({user:'dir_opera',name:'Diretor Ópera',role:'diretor',hotel:'OPERA'});
sb.vgAuthCurrent=sb.window.vgAuthCurrent;
sb.window.VG={
  util:{escapeHtml:v=>String(v),monthName:m=>({8:'Agosto'})[m]||String(m)},
  state:{selectedMonths:()=>[8],currentYear:()=> '2026'},events:{on(){}},performance:{schedule:(k,fn)=>fn()},
  kpi:{gop:(h,y,d)=>Number(d.hotels_ops[h]['GOP COM SEDE'][y]),totalCosts:(h,y,d)=>Number(d.hotels_costs[h].TOTAIS[y])},
  benchmark:{
    metricHotel(h,id,y='2026'){
      const op=RAW.hotels_ops[h],c=RAW.hotels_costs[h],rec=op['Receita Total'][y],occ=op.Ocupados[y],disp=op.Disponiveis[y],aloj=op['Receita Alojamento'][y];
      if(id==='revenueGrowth')return (op['Receita Total']['2026']/op['Receita Total']['2025']-1)*100;
      if(id==='gopMargin')return op['GOP COM SEDE'][y]/rec*100;if(id==='occupancy')return occ/disp*100;if(id==='adr')return aloj/occ;if(id==='revpar')return aloj/disp;if(id==='costRatio')return c.TOTAIS[y]/rec*100;if(id==='personnelRatio')return c.PESSOAL[y]/rec*100;return null;
    },
    targetFor(h,id){const vals={revenueGrowth:10,gopMargin:30,occupancy:65,adr:110,revpar:70,costRatio:70,personnelRatio:30};return vals[id]!=null?{value:vals[id],source:'Teste'}:null;},
    summary(h){return {hotel:h,region:'lisboa',regionName:'Lisboa & Ilhas',regionalPercentile:72,portfolioPercentile:68,winsRegion:5,totalRegion:7,winsPortfolio:4,totalPortfolio:7,targetsMet:4,totalTargets:7,strongest:{label:'Receita',advRegion:8,unit:'%'},biggestGap:{label:'Ocupação',advRegion:-5,unit:'%'},rows:[
      {id:'revenueGrowth',region:8,winR:true,winT:true},{id:'gopMargin',region:31,winR:true,winT:true},{id:'occupancy',region:70,winR:false,winT:false},{id:'adr',region:105,winR:true,winT:false},{id:'revpar',region:73,winR:false,winT:false},{id:'costRatio',region:68,winR:true,winT:true},{id:'personnelRatio',region:29,winR:true,winT:true}
    ]};},leagueRows:()=>[{hotel:'OPERA',score:72},{hotel:'ESTORIL',score:55}]},
  forecast:{buildBase(){return {available:true,occNow:60,forecastOcc:62,target:75,trend:1.2,confidence:{score:78,label:'Boa',cls:'good'},baseScenario:{revenue:130000,gop:41000,gopPct:31.54,adr:112,revpar:69}};}},
  revenue:{getHotelMonthForecast:()=>({available:true,revenueAtRisk:42000}),getDecisionSnapshot:()=>({opportunities:[{hotel:'OPERA',title:'Pickup positivo',sub:'Procura a acelerar',value:'+4,0 pp'}]})},
  anomalies:{build:()=>({rows:[{hotel:'OPERA',severity:'positive',title:'ADR favorável',detail:'Acima do padrão',amount:3000,type:'performance'}]})},
  actions:{all:()=>[{id:'a1',hotel:'OPERA',status:'open',dueDate:'2000-01-01',sourceTitle:'Validar margem',ownerName:'Diretor Ópera'}],isOverdue:a=>a.status!=='resolved'&&a.dueDate<'2026-08-14',statusMeta:()=>({label:'Em análise',cls:'open'})}
};
sb.VG=sb.window.VG;
sb.ALERT_RULES=[{id:'occ_low',severity:'red',label:'Ocupação baixa',check:h=>h==='OPERA'}];
sb.alertRuleLabel=r=>r.label;
sb.validateDashboardData=()=>[{severity:'orange',hotel:'OPERA',code:'ADR_MISMATCH',message:'ADR a validar.'}];
load('assets/js/modules/hotel-performance-v23.js',sb);
const api=sb.window.VG.hotelPerformance;
assert(api&&api.version===23,'API V23 deve estar exposta');
const m=api.buildModel('ESTORIL');
assert.strictEqual(m.hotel,'OPERA','Diretor deve ficar limitado à própria unidade');
assert.strictEqual(m.status.level,'critical','alerta vermelho/ação vencida/forecast devem produzir estado crítico');
assert.strictEqual(m.forecast.gap,-13,'gap de forecast deve reutilizar a base do Forecast V12');
assert.strictEqual(m.benchmarkInfo.rank,1,'ranking regional deve vir do Benchmarking');
assert(m.kpis.some(x=>x.id==='revenue'&&x.value===120000),'Receita deve vir do P&L canónico');
assert(m.kpis.some(x=>x.id==='occupancy'&&Math.abs(x.value-60)<0.001),'Ocupação deve reutilizar KPI/benchmark');
assert(m.actionInfo.overdue.length===1,'ação vencida deve aparecer na visão executiva');
assert(m.opportunities.some(x=>x.title==='Pickup positivo'),'oportunidade Revenue deve ser integrada');
assert(!Object.prototype.hasOwnProperty.call(m,'score'),'V23 não deve antecipar o Score Operacional da V28');
assert.doesNotThrow(()=>api.render());
console.log('✓ performance v23: visão por hotel, permissões, KPIs canónicos, forecast, benchmark, riscos, ações e sem score paralelo');
