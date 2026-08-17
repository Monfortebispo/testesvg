const assert=require('assert');
const {createSandbox,load}=require('./helpers/browser-sandbox');
function ops(){return {
  'Receita Total':{'2025':100000},
  'Receita Alojamento':{'2025':60000},
  Ocupados:{'2025':600}, Disponiveis:{'2025':900},
  ADR:{'2025':100}, 'GOP COM SEDE':{'2025':25000}
};}
const m25=Array(12).fill(null),old26=Array(12).fill(null),new26=Array(12).fill(null);
m25[8]=70;old26[8]=48;new26[8]=50;
const snaps=[
 {label:'07/08',loadedAt:'2026-08-07T10:00:00Z',data:{'HOTEL A':{'2026':old26,'2025':m25}}},
 {label:'14/08',loadedAt:'2026-08-14T10:00:00Z',data:{'HOTEL A':{'2026':new26,'2025':m25}}}
];
const STORE={9:{hotels_ops:{'HOTEL A':ops()},hotels_costs:{'HOTEL A':{TOTAIS:{'2025':70000},PESSOAL:{'2025':20000}}},hotels_rev:{}}};
const RAW={hotel_list:['HOTEL A'],hotels_ops:{'HOTEL A':ops()},hotels_costs:{'HOTEL A':{TOTAIS:{'2025':70000},PESSOAL:{'2025':20000}}},hotels_rev:{}};
const sb=createSandbox({RAW,STORE,OCC_SNAPSHOTS:snaps,HOTEIS_XLSX:{'HOTEL A':{nome:'HOTEL A',totalQ:30}},ORC_REVENUE_FACTOR:1.05,ORC_COST_FACTOR:1.08,
  adrOficial(h,y,data){return Number(data?.hotels_ops?.[h]?.ADR?.[String(y)]||0)||null;},
  occ(){return null;}
});
load('assets/js/core/00-runtime.js',sb);
sb.window.VG.kpi={
  adr(h,y,data){return Number(data?.hotels_ops?.[h]?.ADR?.[String(y)]||0)||null;},
  occupancy(h,y,data){const o=Number(data?.hotels_ops?.[h]?.Ocupados?.[String(y)]||0),d=Number(data?.hotels_ops?.[h]?.Disponiveis?.[String(y)]||0);return d?o/d*100:null;},
  totalCosts(h,y,data){return Number(data?.hotels_costs?.[h]?.TOTAIS?.[String(y)]||0);},
  gop(h,y,data){return Number(data?.hotels_ops?.[h]?.['GOP COM SEDE']?.[String(y)]||0)||null;}
};
sb.window.VG.targetsRules={
  getTarget(h,metric,m,y){if(h==='HOTEL A'&&Number(m)===9&&String(y)==='2026'){if(metric==='occupancy')return 72;if(metric==='adrGrowthPct')return 4;if(metric==='revenueGrowthPct')return 5;}return null;},
  ruleValue(){return null;}
};
sb.window.vgTargetValue=(h,metric,m,y)=>sb.window.VG.targetsRules.getTarget(h,metric,m,y);
sb.window.vgRuleConfig=()=>({enabled:true,value:2});
load('assets/js/modules/revenue-intelligence.js',sb);
load('assets/js/modules/forecast-scenarios.js',sb);
const ri=sb.window.VG.revenue.getHotelMonthForecast('HOTEL A',9);
assert.strictEqual(ri.available,true);
assert(Math.abs(ri.trend-2)<0.01);
assert(Math.abs(ri.forecast-62)<0.05,'forecast deve usar 2 pp/semana durante 6 semanas');
assert.strictEqual(ri.target,72);
const base=sb.window.VG.forecast.buildBase('HOTEL A',9);
assert.strictEqual(base.available,true);
assert.strictEqual(base.refYear,'2025');
assert(Math.abs(base.adrBase-104)<0.001);
assert.strictEqual(base.availableRN,900);
assert(Math.abs(base.forecastOcc-62)<0.05);
assert(base.baseScenario.revenue>90000&&base.baseScenario.revenue<105000);
assert(base.baseScenario.gop>0);
assert(base.confidence.score>=50);
console.log('✓ forecast v12: RI, metas, STLY, ADR, receita e GOP integrados');
