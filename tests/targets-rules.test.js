const assert = require('assert');
const vm = require('vm');
const { createSandbox, load } = require('./helpers/browser-sandbox');

(async()=>{
  const cfg={
    version:1,
    rules:{
      gop_low:{enabled:true,value:18,severity:'red'},
      occ_low:{enabled:true,value:35,severity:'orange'},
      rev_drop:{enabled:true,value:12,severity:'red'},
      adr_drop:{enabled:true,value:6,severity:'orange'},
      ri_occ_delta:{enabled:true,value:3,severity:'orange'}
    },
    targets:{'HOTEL A':{'2026':{'8':{occupancy:82,gopPct:30,revenueGrowthPct:5,adrGrowthPct:2}}}}
  };
  const s=createSandbox({selectedMeses:new Set([8]),YR_PREV:'2025',YR_CUR:'2026'});
  load('assets/js/core/00-runtime.js',s);
  s.window.VG.shared={
    async get(resource){assert.strictEqual(resource,'targets-rules');return {data:cfg};},
    async post(){throw new Error('post não esperado');}
  };
  load('assets/js/modules/targets-rules.js',s);
  await s.window.VG.targetsRules.load(true);
  assert.strictEqual(s.window.VG.targetsRules.ruleValue('gop_low'),18);
  assert.strictEqual(s.window.VG.targetsRules.getTarget('HOTEL A','occupancy',8,'2026'),82);
  assert.strictEqual(s.window.VG.targetsRules.periodTarget('HOTEL A','gopPct'),30);
  assert.strictEqual(s.window.VG.targetsRules.effectiveThreshold('gop_low','HOTEL A','gopPct'),30,'meta específica deve sobrepor regra global');

  // Integração com alertas reais: meta mensal específica deve ser usada.
  s.RAW={hotel_list:['HOTEL A'],hotels_ops:{'HOTEL A':{'Receita Total':{'2025':100,'2026':104}}},hotels_costs:{'HOTEL A':{PESSOAL:{'2026':20},ENERGIA:{'2026':2},'MANUTENÇÃO':{'2026':2}}},hotels_rev:{}};
  s.n=v=>Number(v)||0;
  s.gop=(h,y)=>y==='2026'?25:22;
  s.gopPct=(h,y)=>y==='2026'?25:22;
  s.occ=(h,y)=>y==='2026'?80:78;
  s.adr=(h,y)=>y==='2026'?101:y==='2025'?100:null;
  load('assets/js/modules/analysis-tools.js',s);
  const rows=vm.runInContext(`ALERT_RULES.filter(r=>r.check('HOTEL A')).map(r=>({id:r.id,label:alertRuleLabel(r,'HOTEL A')}))`,s);
  assert(rows.some(r=>r.id==='gop_low'),'GOP 25% deve ficar abaixo da meta específica de 30%');
  assert(rows.some(r=>r.id==='occ_low'),'Ocupação 80% deve ficar abaixo da meta específica de 82%');
  assert(rows.some(r=>r.id==='rev_drop'),'Receita +4% deve ficar abaixo da meta específica de +5%');
  assert(rows.some(r=>r.id==='adr_drop'),'ADR +1% deve ficar abaixo da meta específica de +2%');
  assert(rows.find(r=>r.id==='gop_low').label.includes('meta'));

  console.log('✓ metas & regras: persistência, prioridade da meta específica e integração com alertas');
})().catch(err=>{console.error(err.stack||err);process.exit(1);});
