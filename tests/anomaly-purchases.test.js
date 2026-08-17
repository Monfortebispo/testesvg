const assert = require('assert');
const { createSandbox, load } = require('./helpers/browser-sandbox');
const sb=createSandbox({selectedHotels:new Set(['A','B','C']),getActiveHotels(){return ['A','B','C'];}});
load('assets/js/core/00-runtime.js',sb);
const cd={
  meta:{meses:[202604,202605,202606,202607]},
  dic:{hoteis:['','A','B','C'],art:['','CAFÉ'],fam:['','COMIDAS']},
  A:[[1,0,1,0,0,1,1000,100]],
  PM:[
    [1,1,1,0,1000,100],[1,1,1,1,1050,100],[1,1,1,2,1000,100],[1,1,1,3,1500,100],
    [1,1,2,3,1000,100],[1,1,3,3,1100,100]
  ]
};
sb.window.cdGetData=()=>cd;
load('assets/js/modules/anomaly-detection.js',sb);
const rows=sb.window.VG.anomalies.detectPurchasePrices(['A','B','C'],sb.window.VG.anomalies.SENSITIVITY.balanced);
assert(rows.some(r=>r.hotel==='A'&&r.type==='price'));
const r=rows.find(x=>x.hotel==='A');
assert(r.evidence.currentPrice===15);
assert(r.evidence.portfolioMedian===11);
assert(r.amount>=399&&r.amount<=401);
assert(r.detail.includes('CAFÉ'));
console.log('✓ anomalias de compras: preço F&B mensal vs histórico e portefólio');
