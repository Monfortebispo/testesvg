const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const cp=require('child_process');
const {ROOT,createSandbox,load}=require('./helpers/browser-sandbox');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');

const uiRel='assets/js/ui/vg-operations-2-v30.js';
const hRel='assets/js/modules/hotel-360-v30.js';
const rRel='assets/js/modules/revenue-hub-v30.js';
const ui=read(uiRel),h360=read(hRel),rh=read(rRel),css=read('assets/css/vg-operations-2-v30.css'),guard=read('assets/js/core/06-version-guard-v29_1.js'),sw=read('service-worker.js');
for(const f of [uiRel,hRel,rRel])cp.execFileSync(process.execPath,['--check',path.join(ROOT,f)],{stdio:'pipe'});

// 1) Portefólio deve usar exatamente o conjunto filtrado, não todos os hotéis.
assert(ui.includes("typeof getActiveHotels==='function'"),'V30.3 deve usar getActiveHotels no Portefólio');
assert(ui.includes('const hs=portfolioHotels()'),'Home da Direção deve construir modelos apenas com hotéis filtrados');
const ps=createSandbox({
  activeRegion:'lisboa',
  getActiveHotels(){return ['OPERA'];},
  window:{VG:{
    hotelPerformance:{allHotels:()=>['OPERA','ESTORIL'],buildModel:h=>({available:true,hotel:h,status:{level:h==='OPERA'?'critical':'stable',label:'x',reasons:['teste']},actionInfo:{overdue:[]},forecast:{revenueAtRisk:h==='OPERA'?1000:9999}})},
    operationalScore:{calculate:()=>({available:true,score:80})},events:{on(){}},notifications:{open(){}}
  },vgAuthCurrent:()=>({role:'direcao'})}
});
ps.document.readyState='loading';
load(uiRel,ps);
assert.deepStrictEqual(Array.from(ps.window.VG.operations2.portfolioHotels()),['OPERA'],'portfolioHotels deve devolver apenas filtro ativo');
const portfolioHtml=ps.window.VG.operations2.buildDirectionHome();
assert(portfolioHtml.includes('Portefólio · Lisboa'),'Home deve identificar o âmbito regional ativo');
assert(portfolioHtml.includes('OPERA')&&!portfolioHtml.includes('ESTORIL'),'prioridades não podem incluir hotel fora do filtro');
assert(portfolioHtml.includes('€1K')&&!portfolioHtml.includes('€10K'),'Receita em risco deve ser agregada apenas no filtro');

// 2) Ponte do GOP: magnitude da despesa, independente do sinal contabilístico.
assert(h360.includes('return prev-cur;'),'impacto de custo deve ser despesa anterior - despesa atual');
const hs=createSandbox({
  RAW:{
    hotel_list:['TESTE'],
    hotels_ops:{TESTE:{'Receita Total':{'2025':1000,'2026':1000},'GOP COM SEDE':{'2025':500,'2026':620}}},
    hotels_costs:{TESTE:{'MANUTENÇÃO':{'2025':-500,'2026':-380},'TOTAIS':{'2025':-500,'2026':-380}}},hotels_rev:{}
  },
  YR_PREV:'2025',YR_CUR:'2026',
  window:{VG:{events:{on(){}},kpi:{gop:(hotel,year,data)=>data.hotels_ops[hotel]['GOP COM SEDE'][year]},hotelPerformance:{metric:()=>null}},vgAuthCurrent:()=>({role:'direcao'})}
});
hs.document.readyState='loading';
load(hRel,hs);
const ha=hs.window.VG.hotel360;
assert.strictEqual(ha.expenseImpact(-500,-380,-1),120,'custos negativos: gastar menos 120 deve melhorar GOP +120');
assert.strictEqual(ha.expenseImpact(500,380,1),120,'custos positivos: gastar menos 120 deve melhorar GOP +120');
assert.strictEqual(ha.expenseImpact(-500,-620,-1),-120,'gastar mais 120 deve deteriorar GOP -120');
const bridge=ha.causeAnalysis('TESTE');
const maintenance=bridge.items.find(x=>x.id==='maintenance');
assert(maintenance&&maintenance.impact===120,'Manutenção -500 → -380 deve aparecer como contribuição +120 no GOP');
assert(/Custo inferior/.test(maintenance.detail),'ponte deve explicar que o custo é inferior ao ano anterior');
assert(/Verde melhora o GOP/.test(bridge.method),'legenda/método deve explicitar semântica das cores');

// 3) Revenue Hub deve preservar os wrappers com IDs usados pelo CSS original.
assert(!rh.includes('while(s.firstChild)'),'V30.3 não pode esvaziar as views legadas');
assert(rh.includes("s.classList.remove('tab-content','active')")&&rh.includes("s.classList.add('v30-embedded-view')"),'wrappers originais devem ser embebidos completos');
assert(rh.includes('p.appendChild(s)'),'Revenue Hub deve mover a view original, não apenas os filhos');
assert(css.includes('.v30-revenue-panel>.v30-embedded-view{display:block!important'),'CSS deve tornar a view embebida visível');

class CL{constructor(...x){this.s=new Set(x)}add(...x){x.forEach(v=>this.s.add(v))}remove(...x){x.forEach(v=>this.s.delete(v))}contains(x){return this.s.has(x)}toggle(x,on){if(on===undefined)on=!this.s.has(x);on?this.s.add(x):this.s.delete(x)}}
function src(id){return {id,classList:new CL('tab-content','active'),dataset:{},style:{display:'none'},children:[{id:id+'-child'}],parentNode:null,removeAttribute(){},};}
function pnl(id){return {id,classList:new CL(),children:[],appendChild(n){this.children.push(n);n.parentNode=this;}};}
const sources={revenueint:src('view-revenueint'),forecast:src('view-forecast'),scenariocompare:src('view-scenariocompare')};
const panels={current:pnl('v30RevenuePanel-current'),forecast:pnl('v30RevenuePanel-forecast'),scenarios:pnl('v30RevenuePanel-scenarios')};
const root={querySelectorAll(){return []}};
const doc={readyState:'loading',getElementById(id){if(id==='revenueHubRoot')return root;if(id.startsWith('view-'))return sources[id.slice(5)]||null;if(id.startsWith('v30RevenuePanel-'))return panels[id.slice('v30RevenuePanel-'.length)]||null;return null;},querySelectorAll(){return []},addEventListener(){}};
const rw={VG:{},document:doc,requestAnimationFrame:fn=>fn()};rw.window=rw;
const rs={window:rw,document:doc,console,requestAnimationFrame:rw.requestAnimationFrame,setTimeout,clearTimeout};vm.createContext(rs);vm.runInContext(rh,rs,{filename:rRel});
rs.window.VG.revenueHub.mount();
for(const [tab,id] of Object.entries({current:'revenueint',forecast:'forecast',scenarios:'scenariocompare'})){
  assert.strictEqual(panels[tab].children[0],sources[id],`painel ${tab} deve conter wrapper original`);
  assert.strictEqual(sources[id].children.length,1,`conteúdo de ${id} deve permanecer dentro do wrapper`);
  assert(sources[id].classList.contains('v30-embedded-view')&&!sources[id].classList.contains('tab-content'),`${id} deve preservar ID mas deixar de ser tab-content global`);
}

assert(/const BUILD='32\.[3-9]'/.test(guard),'build guard mantém identificador estável e updateViaCache:none');
assert(sw.includes("vg-operations-shell-v32"),'service worker deve usar cache V30.3');
console.log('✓ V30.3: Portefólio filtrado, Ponte GOP semântica e Revenue Hub visual preservados');
