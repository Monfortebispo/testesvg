const assert = require('assert');
const { createSandbox, load } = require('./helpers/browser-sandbox');

function month(aRevenue,aPersonnel,aEnergy,aMaint,aOcc,aDisp,aRoomRev,aGop,bRevenue=110000,cRevenue=112000){
  return {
    hotels_ops:{
      A:{'Receita Total':{'2025':100000,'2026':aRevenue},'Ocupados':{'2025':600,'2026':aOcc},'Disponiveis':{'2025':1000,'2026':aDisp},'Receita Alojamento':{'2025':60000,'2026':aRoomRev},'GOP COM SEDE':{'2025':30000,'2026':aGop}},
      B:{'Receita Total':{'2025':100000,'2026':bRevenue},'Ocupados':{'2025':600,'2026':650},'Disponiveis':{'2025':1000,'2026':1000},'Receita Alojamento':{'2025':60000,'2026':71500},'GOP COM SEDE':{'2025':30000,'2026':36000}},
      C:{'Receita Total':{'2025':100000,'2026':cRevenue},'Ocupados':{'2025':600,'2026':660},'Disponiveis':{'2025':1000,'2026':1000},'Receita Alojamento':{'2025':60000,'2026':73920},'GOP COM SEDE':{'2025':30000,'2026':38000}}
    },
    hotels_costs:{
      A:{PESSOAL:{'2025':20000,'2026':aPersonnel},ENERGIA:{'2025':8000,'2026':aEnergy},MANUTENCAO:{'2025':5000,'2026':aMaint},COMIDAS:{'2025':7000,'2026':7000},BEBIDAS:{'2025':3000,'2026':3000}},
      B:{PESSOAL:{'2025':20000,'2026':22000},ENERGIA:{'2025':8000,'2026':8500},MANUTENCAO:{'2025':5000,'2026':5200}},
      C:{PESSOAL:{'2025':20000,'2026':22500},ENERGIA:{'2025':8000,'2026':8600},MANUTENCAO:{'2025':5000,'2026':5300}}
    },hotels_rev:{}
  };
}

const STORE={
  1:month(100000,20000,8000,5000,600,1000,60000,30000),
  2:month(101000,20200,8100,5000,605,1000,61000,30200),
  3:month(99000,19800,7900,5100,595,1000,59500,29500),
  4:month(102000,20500,8200,5200,610,1000,62000,31000),
  5:month(80000,40000,17000,6000,480,1000,46000,8000,110000,115000)
};
const sb=createSandbox({
  STORE, RAW:STORE[5], YR_PREV:'2025',YR_CUR:'2026', selectedMeses:new Set([5]), selectedHotels:new Set(['A','B','C']),
  getActiveHotels(){return ['A','B','C'];}
});
load('assets/js/core/00-runtime.js',sb);
sb.window.VG.kpi={gop(h,y,data){return Number(data.hotels_ops[h]?.['GOP COM SEDE']?.[y]??0);}};
load('assets/js/modules/anomaly-detection.js',sb);
const api=sb.window.VG.anomalies;
assert.strictEqual(api.median([1,4,2,3]),2.5);
assert(api.robustZ(40,[20,20.1,19.9,20.2])>3);
const model=api.build({month:5,sensitivity:'balanced',hotels:['A','B','C']});
assert(model.negative.some(x=>x.hotel==='A'&&x.type==='efficiency'&&x.metric==='personnel'));
assert(model.negative.some(x=>x.hotel==='A'&&x.type==='activity'&&x.metric==='personnel'));
assert(model.negative.some(x=>x.hotel==='A'&&x.type==='performance'&&x.metric==='revenue'));
assert(model.negative.some(x=>x.hotel==='A'&&x.type==='performance'&&x.metric==='gop'));
assert(model.critical>=1);
assert(model.impact>10000);
const snap=api.getDecisionSnapshot(['A','B','C']);
assert(snap.priorities.some(x=>x.hotel==='A'&&x.kind==='anomaly'));
assert.doesNotThrow(()=>api.render());
console.log('✓ anomalias: mediana/MAD, eficiência, custo×atividade, performance e decisão');
