const assert = require('assert');
const { createSandbox, load } = require('./helpers/browser-sandbox');

function ops(rec25,rec26,aloj25,aloj26,occ25,occ26,disp25,disp26,gop25,gop26){
  return {
    'Receita Total':{'2025':rec25,'2026':rec26},
    'Receita Alojamento':{'2025':aloj25,'2026':aloj26},
    'Ocupados':{'2025':occ25,'2026':occ26},
    'Disponiveis':{'2025':disp25,'2026':disp26},
    'GOP COM SEDE':{'2025':gop25,'2026':gop26}
  };
}
const sb=createSandbox({
  RAW:{
    hotel_list:['A','B','C'],
    hotels_ops:{
      A:ops(100000,120000,50000,66000,500,600,1000,1000,30000,42000),
      B:ops(200000,210000,100000,115500,1000,1100,2000,2000,50000,52500),
      C:ops(300000,330000,150000,180000,1500,1800,3000,3000,75000,99000)
    },
    hotels_costs:{
      A:{TOTAIS:{'2025':70000,'2026':78000},PESSOAL:{'2025':30000,'2026':33000}},
      B:{TOTAIS:{'2025':150000,'2026':157500},PESSOAL:{'2025':65000,'2026':69000}},
      C:{TOTAIS:{'2025':225000,'2026':231000},PESSOAL:{'2025':90000,'2026':96000}}
    }, hotels_rev:{}
  },
  REGIOES:{lisboa:['A','B'],norte:['C'],alentejo:[],algarve:[]},
  selectedMeses:new Set([8]),
  selectedHotels:new Set(['A','B','C']),
  STORE:{8:{
    hotels_ops:{
      A:ops(100000,120000,50000,66000,500,600,1000,1000,30000,42000),
      B:ops(200000,210000,100000,115500,1000,1100,2000,2000,50000,52500),
      C:ops(300000,330000,150000,180000,1500,1800,3000,3000,75000,99000)
    },
    hotels_costs:{
      A:{TOTAIS:{'2025':70000,'2026':78000},PESSOAL:{'2025':30000,'2026':33000}},
      B:{TOTAIS:{'2025':150000,'2026':157500},PESSOAL:{'2025':65000,'2026':69000}},
      C:{TOTAIS:{'2025':225000,'2026':231000},PESSOAL:{'2025':90000,'2026':96000}}
    }
  }},
  PNL_MESES:{8:'Agosto'},
  ORC_REVENUE_FACTOR:1.05,ORC_COST_FACTOR:1.08
});
sb.window.VG={
  kpi:{
    gop(h,y,data){ return Number(data.hotels_ops[h]?.['GOP COM SEDE']?.[y]??0); },
    totalCosts(h,y,data){ return Number(data.hotels_costs[h]?.TOTAIS?.[y]??0); }
  },
  targetsRules:{
    getTarget(h,metric,month,year){
      if(h==='A'&&month===8&&String(year)==='2026'&&metric==='occupancy')return 65;
      if(h==='A'&&month===8&&String(year)==='2026'&&metric==='revenueGrowth')return 10;
      return null;
    },
    rule(id,def){
      const vals={gop_margin_min:30,personnel_ratio_max:30,ri_occ_delta:2};
      return {enabled:true,value:vals[id]??def};
    }
  }, events:{on(){}}
};
load('assets/js/modules/benchmarking.js',sb);
const bm=sb.window.VG.benchmark;

assert.strictEqual(bm.hotelRegion('A'),'lisboa');
assert.deepStrictEqual(JSON.parse(JSON.stringify(bm.regionHotels('A',true))),['B']);

// Ocupação regional A+B deve ser ponderada: 1700 / 3000 = 56,6667%, não média simples 57,5%.
const occ=bm.metricGroup(['A','B'],'occupancy','2026');
assert(Math.abs(occ-56.6666667)<0.001);

// ADR regional ponderado: (66k+115,5k)/(600+1100)=106,7647.
const adr=bm.metricGroup(['A','B'],'adr','2026');
assert(Math.abs(adr-106.7647059)<0.001);

assert(Math.abs(bm.metricHotel('A','revenueGrowth')-20)<0.001);
assert(Math.abs(bm.targetFor('A','revenueGrowth').value-10)<0.001);
assert.strictEqual(bm.targetFor('A','occupancy').value,65);
assert.strictEqual(bm.targetFor('A','gopMargin').value,30);

const s=bm.summary('A');
assert.strictEqual(s.regionName,'Lisboa & Ilhas');
assert.strictEqual(s.totalRegion,7);
assert(s.winsRegion>=4);
assert(s.totalTargets>=5);
assert(s.regionalPercentile>50);

const league=bm.leagueRows('A');
assert.strictEqual(league.length,2);
assert(league.some(x=>x.hotel==='A'));
assert(league.some(x=>x.hotel==='B'));
assert.doesNotThrow(()=>sb.window.benchmarkRender());

console.log('✓ benchmarking: ponderação, peers, STLY, metas/orçamento e percentis');
