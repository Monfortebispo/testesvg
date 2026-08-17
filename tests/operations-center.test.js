const assert = require('assert');
const { createSandbox, load } = require('./helpers/browser-sandbox');

const RAW = {
  hotel_list: ['HOTEL A','HOTEL B'],
  hotels_ops: {
    'HOTEL A': {
      'Receita Total': {'2026':100000,'2027':85000},
      ADR: {'2026':100,'2027':92},
      Ocupados: {'2026':600,'2027':420}, Disponiveis: {'2026':1000,'2027':1000}
    },
    'HOTEL B': {
      'Receita Total': {'2026':100000,'2027':120000},
      ADR: {'2026':100,'2027':110},
      Ocupados: {'2026':700,'2027':790}, Disponiveis: {'2026':1000,'2027':1000}
    }
  },
  hotels_costs: {}, hotels_rev: {}
};
const s = createSandbox({
  RAW, YR_PREV:'2026', YR_CUR:'2027',
  STORE: {1:{},2:{}},
  selectedHotels: new Set(RAW.hotel_list), selectedMeses: new Set([1,2]),
  getActiveHotels(){ return RAW.hotel_list.slice(); },
  ALERT_RULES: [
    {id:'rev_drop',label:'Receita caiu > 10% vs ano anterior',severity:'red',check:h=>h==='HOTEL A'}
  ],
  validateDashboardData(){ return []; },
  gopPct(h,y){ return h==='HOTEL B' ? (y==='2027'?28:22) : 8; },
  occ(h,y){ const d=RAW.hotels_ops[h]; return d.Ocupados[y]/d.Disponiveis[y]*100; },
  adr(h,y){ return RAW.hotels_ops[h].ADR[y]; }
});
load('assets/js/core/00-runtime.js', s);
s.window.VG.actions = {
  findForSource(key){ return key.includes('HOTEL A') ? {id:'act1',status:'progress',ownerName:'Responsável',dueDate:'2027-08-20'} : null; },
  stats(){ return {open:2,unassigned:1,overdue:1,progress:1,resolvedWeek:3}; },
  watch(){ return [{id:'act1',hotel:'HOTEL A',status:'progress',ownerName:'Responsável',dueDate:'2027-08-20'}]; },
  statusMeta(){ return {label:'Em curso',cls:'progress'}; },
  isOverdue(){ return false; }, canManage(){ return true; }
};
s.window.VG.revenue = {
  getDecisionSnapshot(){
    return {
      available:true,totalRisk:42000,label:'Snapshot 14/08',
      risks:[{hotel:'HOTEL A',month:9,monthLabel:'Set',forecast:58,target:72,eurRisk:42000,severity:'red',score:190,summary:'Forecast abaixo do objetivo',action:'Rever pricing e canais.'}],
      opportunities:[]
    };
  }
};
load('assets/js/ui/operations-center.js', s);
const model=s.window.opsBuildModel();
assert.strictEqual(model.hotels.length,2);
assert.strictEqual(model.critical,1);
assert.strictEqual(model.totalRisk,42000);
assert(model.priorities.some(p=>p.kind==='mixed'&&p.hotel==='HOTEL A'));
assert(model.priorities.find(p=>p.hotel==='HOTEL A').reasons.length>=2);
assert(model.opportunities.some(o=>o.hotel==='HOTEL B'&&o.kind==='Receita'));
assert(model.opportunities.some(o=>o.hotel==='HOTEL B'&&o.kind==='Margem'));
const pa=model.priorities.find(p=>p.hotel==='HOTEL A');
assert(pa.sourceKey.includes('HOTEL A'));
assert.strictEqual(pa.actionRecord.id,'act1');
assert.strictEqual(model.actionStats.overdue,1);
assert.strictEqual(model.actionWatch.length,1);
console.log('✓ central de operações: prioridades, risco, oportunidades e ligação a ações');
