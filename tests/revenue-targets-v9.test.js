const assert = require('assert');
const { createSandbox, load } = require('./helpers/browser-sandbox');

(async()=>{
  const months26=Array(12).fill(null), months25=Array(12).fill(null), older26=Array(12).fill(null);
  months26[8]=75; older26[8]=74; months25[8]=70;
  const snaps=[
    {label:'07/08',loadedAt:'2026-08-07T10:00:00Z',data:{'HOTEL A':{'2026':older26,'2025':months25}}},
    {label:'14/08',loadedAt:'2026-08-14T10:00:00Z',data:{'HOTEL A':{'2026':months26,'2025':months25}}}
  ];
  const RAW={hotel_list:['HOTEL A'],hotels_ops:{'HOTEL A':{ADR:{'2026':100,'2025':95}}},hotels_costs:{},hotels_rev:{}};
  const s=createSandbox({RAW,YR_PREV:'2025',YR_CUR:'2026',OCC_SNAPSHOTS:snaps,HOTEIS_XLSX:{'HOTEL A':{nome:'HOTEL A',totalQ:100}},adrOficial(h,y){return RAW.hotels_ops[h]?.ADR?.[String(y)]??null;},occ(){return null;}});
  load('assets/js/core/00-runtime.js',s);
  s.window.VG.shared={async get(resource){return {data:{rules:{ri_occ_delta:{enabled:true,value:3,severity:'orange'}},targets:{'HOTEL A':{'2026':{'9':{occupancy:85}}}}}};},async post(){}};
  load('assets/js/modules/targets-rules.js',s);
  await s.window.VG.targetsRules.load(true);
  load('assets/js/modules/revenue-intelligence.js',s);
  const out=s.window.VG.revenue.getDecisionSnapshot(['HOTEL A']);
  assert(out.risks.length>=1);
  assert(Math.abs(out.risks[0].target-85)<0.01,'meta explícita de ocupação deve ter prioridade no RI');
  console.log('✓ revenue intelligence v9: meta explícita por hotel/mês sobrepõe fallback LY + pp');
})().catch(err=>{console.error(err.stack||err);process.exit(1);});
