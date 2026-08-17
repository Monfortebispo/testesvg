const assert = require('assert');
const { createSandbox, load } = require('./helpers/browser-sandbox');

const months26 = Array(12).fill(null), months25 = Array(12).fill(null);
months26[8] = 48; // setembro 2026
months25[8] = 70; // setembro 2025 -> objetivo 72%
const older26 = Array(12).fill(null); older26[8] = 50;
const snaps = [
  {label:'07/08',loadedAt:'2026-08-07T10:00:00Z',data:{'HOTEL A':{'2026':older26,'2025':months25}}},
  {label:'14/08',loadedAt:'2026-08-14T10:00:00Z',data:{'HOTEL A':{'2026':months26,'2025':months25}}}
];
const RAW = {hotel_list:['HOTEL A'],hotels_ops:{'HOTEL A':{ADR:{'2026':100,'2025':95}}},hotels_costs:{},hotels_rev:{}};
const s=createSandbox({
  RAW, YR_PREV:'2025', YR_CUR:'2026', OCC_SNAPSHOTS:snaps,
  HOTEIS_XLSX:{'HOTEL A':{nome:'HOTEL A',totalQ:100}},
  adrOficial(h,y){ return RAW.hotels_ops[h]?.ADR?.[String(y)] ?? null; },
  occ(){ return null; }
});
load('assets/js/core/00-runtime.js',s);
load('assets/js/modules/revenue-intelligence.js',s);
const out=s.window.VG.revenue.getDecisionSnapshot(['HOTEL A']);
assert.strictEqual(out.available,true);
assert.strictEqual(out.label,'14/08');
assert(out.risks.length>=1,'deve detetar risco comercial real a partir dos snapshots');
assert(out.totalRisk>0,'revenue at risk deve ser positivo');
assert.strictEqual(out.risks[0].hotel,'HOTEL A');
assert(out.risks[0].target>=72-0.01 && out.risks[0].target<=72+0.01);
console.log('✓ revenue decision API: snapshots, objetivo e revenue at risk');
