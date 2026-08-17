const assert=require('assert');
const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const {ROOT,createSandbox,load}=require('./helpers/browser-sandbox');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');

const marketRel='assets/js/core/07-markets-v31.js';
const market=read(marketRel),backend=read('netlify/functions/dashboard-sessao.js'),html=read('index.html'),sw=read('service-worker.js');
for(const f of [marketRel,'netlify/functions/dashboard-sessao.js','service-worker.js'])cp.execFileSync(process.execPath,['--check',path.join(ROOT,f)],{stdio:'pipe'});

assert(html.includes('assets/css/markets-v31.css')&&html.includes('assets/js/core/07-markets-v31.js'),'V31 deve ligar CSS e runtime de mercados');
assert(sw.includes("vg-operations-shell-v32")&&sw.includes('/assets/css/markets-v31.css')&&sw.includes('/assets/js/core/07-markets-v31.js'),'PWA deve pré-cachear shell V31');
assert(backend.includes('marketStoreKey')&&backend.includes('market/brasil/')&&backend.includes('userMarketServer'),'backend deve isolar blobs e acesso por mercado');
assert(backend.includes('O seu perfil não tem acesso a esta geografia'),'backend deve bloquear utilizador de hotel que tente trocar geografia manualmente');
assert(backend.includes('itemMarket(x)===marketId(market)'),'listas operacionais devem ser filtradas por mercado');

const s=createSandbox();s.document.readyState='loading';load(marketRel,s);const api=s.window.VG.market;
assert(api&&api.version>=31.2,'API VG.market v31.2 deve existir');
assert.strictEqual(api.BR_HOTELS.length,13,'Brasil deve iniciar com 13 hotéis identificados no P&L');
assert.strictEqual(api.hotelMarket('FORTALEZA'),'brasil');
assert.strictEqual(api.hotelMarket('COLLECTION AMAZÔNIA'),'brasil');
assert.strictEqual(api.hotelMarket('COLLECTION AMAZONIA'),'brasil','variante sem acento deve ser reconhecida');
assert.strictEqual(api.hotelMarket('ESTORIL'),'iberia');
assert.deepStrictEqual(Array.from(api.DEFINITIONS.brasil.regions.cidade),['FORTALEZA','PAULISTA','RIO DE JANEIRO','SALVADOR']);
assert.strictEqual(api.DEFINITIONS.brasil.regions.resorts.length,6);
assert.strictEqual(api.DEFINITIONS.brasil.regions.collection.length,3);

api.state.current='brasil';
assert.strictEqual(api.symbol(),'R$');assert.strictEqual(api.currency(),'BRL');
assert(api.formatMoney(1234.5,2,true).includes('R$'),'Brasil deve formatar dinheiro em R$');
api.state.current='iberia';assert.strictEqual(api.symbol(),'€');assert.strictEqual(api.currency(),'EUR');

const mixed={
  STORE:{7:{hotel_list:['ESTORIL','FORTALEZA'],hotels_ops:{ESTORIL:{x:1},FORTALEZA:{x:2}},hotels_costs:{ESTORIL:{},FORTALEZA:{}},hotels_rev:{ESTORIL:{},FORTALEZA:{}}}},STORE_ACUM:{},
  REP_STORE:{ESTORIL:[{hotel:'ESTORIL',gri:90}],FORTALEZA:[{hotel:'FORTALEZA',gri:91}]},rtSelected:['ESTORIL','FORTALEZA'],
  OCC_SNAPSHOTS:[{id:1,data:{ESTORIL:{occ:80},FORTALEZA:{occ:70}}}],PIU_SNAPSHOTS:[],
  IG_SNAPSHOTS:[{id:2,months:{'2026-07':{ESTORIL:{seguidores:1},FORTALEZA:{seguidores:2}}}}],
  NOTAS_STORE:{ESTORIL:'PT',FORTALEZA:'BR'},
  HOTEIS_XLSX:{e:{hotel:'ESTORIL'},f:{hotel:'FORTALEZA'}},RD_STORE:[{id:3,rows:[{hotel:'ESTORIL'},{hotel:'FORTALEZA'}]}],
  CD_STORE:{dic:{hoteis:['','FORTALEZA']},G:[]},selectedMeses:[7]
};
const br=api.filterSnapshot(mixed,'brasil'),ib=api.filterSnapshot(mixed,'iberia');
assert.deepStrictEqual(Array.from(br.STORE[7].hotel_list),['FORTALEZA']);
assert.deepStrictEqual(Array.from(ib.STORE[7].hotel_list),['ESTORIL']);
assert.deepStrictEqual(Object.keys(br.REP_STORE),['FORTALEZA']);
assert.deepStrictEqual(Object.keys(ib.REP_STORE),['ESTORIL']);
assert.deepStrictEqual(Object.keys(br.OCC_SNAPSHOTS[0].data),['FORTALEZA']);
assert.deepStrictEqual(Object.keys(ib.OCC_SNAPSHOTS[0].data),['ESTORIL']);
assert.deepStrictEqual(Object.keys(br.IG_SNAPSHOTS[0].months['2026-07']),['FORTALEZA']);
assert.strictEqual(br.NOTAS_STORE.FORTALEZA,'BR');assert.strictEqual(ib.NOTAS_STORE.ESTORIL,'PT');
assert(br.CD_STORE&&ib.CD_STORE===null,'Compras BR não podem contaminar PT+ES');
assert.strictEqual(api.detectDataset(mixed.STORE[7]),'iberia','empate misto permanece no mercado atual/legado por segurança');
assert.strictEqual(api.detectHotels(['FORTALEZA','SALVADOR','ESTORIL']),'brasil');

const bench=read('assets/js/modules/benchmarking.js'),rd=read('assets/js/modules/receitas-detalhe.js'),core=read('assets/js/core/03-persistence-sharing.js');
assert(!bench.includes("filter(h=>!(typeof isBrasil"),'Benchmarking não pode excluir Brasil de forma hardcoded');
assert(rd.includes('VG.market.isCurrentHotel'),'Receitas detalhadas devem obedecer ao mercado ativo');
assert(core.includes("'&market='"),'API partilhada deve enviar contexto market em cada pedido');
assert(core.includes('sharedLegacyMigrationAllowed'),'V31 deve impedir que dados locais históricos PT+ES sejam migrados automaticamente para Brasil');
assert(core.includes('const legacyHotels=sharedLegacyMigrationAllowed()?hsLegacyHotels():[]'),'Ficha local antiga não pode contaminar o namespace Brasil');
const ficha=read('assets/js/modules/ficha-hotel.js');
assert.strictEqual(require('crypto').createHash('sha256').update(ficha).digest('hex'),'2779d6f5cbfcedb672f037494ee54847a16aec2247f5a0594346e3e6c4963dc7','V31 deve manter Ficha do Hotel byte-a-byte inalterada');
assert(market.includes("if(type==='eur2')return formatMoney")&&market.includes("if(type==='eur')return formatMoney"),'V31 deve adaptar a moeda da Ficha externamente, sem editar o seu módulo');
const occ=read('assets/js/modules/ocupacao.js');
for(const h of ['FORTALEZA','SALVADOR','RIO DE JANEIRO','COLLECTION AMAZÔNIA'])assert(occ.includes(h),`Ocupação deve reconhecer ${h}`);

console.log('✓ V31: PT+ES/BR, 13 hotéis BR, EUR/BRL, snapshots mistos, Blobs e permissões isolados');
