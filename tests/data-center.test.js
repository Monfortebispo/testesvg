const assert = require('assert');
const { createSandbox, load } = require('./helpers/browser-sandbox');

const sb = createSandbox({
  STORE: { 7:{ hotel_list:['OPERA','ESTORIL'], yr_cur:'2026', yr_prev:'2025' } },
  STORE_ACUM: { 7:{ hotel_list:['OPERA','ESTORIL'] } },
  OCC_SNAPSHOTS: [{id:1,label:'14/08/2026, 10:00',loadedAt:'2026-08-14T09:00:00Z',ts:1,data:{OPERA:{},ESTORIL:{}}}],
  PIU_SNAPSHOTS: [{label:'Jul 2025',data:{OPERA:{}},ts:1}],
  REP_STORE: { OPERA:[{gri:85,week:'2026-W32'}] },
  rtSelected: new Set(['OPERA']),
  IG_SNAPSHOTS: [{id:1,loadedAt:'2026-08-14T09:00:00Z',months:{'JULHO 2026':{OPERA:{posts:4}}}}],
  HOTEIS_XLSX: { OPERA:{nome:'VG Ópera'} },
  cdGetData(){ return { meta:{meses:[202607],n:120}, G:[1,2] }; },
  cdSetData(v){ sb._cd=v; },
  PNL_MESES: {7:'Julho'},
  validateDashboardData(){ return []; },
  buildMesButtons(){}, applyMesSelection(){}, updateYearGlobals(){}, occSortSnapshots(){}, occUpdateUI(){},
  piuSaveToDB(){}, piuRefreshChips(){}, piuPopulateHotelSel(){}, piuRender(){}, rtRender(){}, igUpdateUI(){}, hoteisFiltrar(){}
});
load('assets/js/modules/data-center.js', sb);

const sources = sb.window.vgDataCenterSources();
assert(sources.find(x=>x.id==='pnl_month').present);
assert.strictEqual(sources.find(x=>x.id==='pnl_month').count,1);
assert(sources.find(x=>x.id==='occupancy').coverage.includes('2 hotéis'));
assert(sources.find(x=>x.id==='reputation').coverage.includes('1 hotéis'));
assert(sources.find(x=>x.id==='purchases').coverage.includes('1 mês'));

const backup = sb.window.vgDataCenterCapture('pnl_month',7);
assert.strictEqual(backup.source,'pnl_month');
assert.deepStrictEqual(JSON.parse(JSON.stringify(backup.payload.hotel_list)),['OPERA','ESTORIL']);

// rollback sintético: o mês tinha uma versão anterior apenas com OPERA
sb.window.vgDataCenterApplyBackup({source:'pnl_month',key:'7',payload:{hotel_list:['OPERA'],yr_cur:'2026',yr_prev:'2025'},selected:[7]});
assert.deepStrictEqual(JSON.parse(JSON.stringify(sb.STORE[7].hotel_list)),['OPERA']);
assert(sb.selectedMeses.has(7));

// acumulado: rollback também deve repor/remover o mês mensal que o acumulado possa ter criado
sb.STORE[8]={hotel_list:['OPERA','ESTORIL']};
sb.STORE_ACUM[8]={hotel_list:['OPERA','ESTORIL']};
sb.window.vgDataCenterApplyBackup({source:'pnl_accum',key:'8',payload:null,monthlyPayload:null,selected:[7]});
assert.strictEqual(sb.STORE_ACUM[8],undefined);
assert.strictEqual(sb.STORE[8],undefined);
assert.deepStrictEqual([...sb.selectedMeses],[7]);

// compras também pode ser reposta quando o snapshot cabe no limite
sb.window.vgDataCenterApplyBackup({source:'purchases',payload:{meta:{meses:[202606],n:20},G:[]}});
assert.strictEqual(sb._cd.meta.n,20);

console.log('✓ centro de dados: fontes, cobertura, backups e rollback local');
