const assert=require('assert');
const fs=require('fs');
const path=require('path');
const {ROOT,createSandbox,load}=require('./helpers/browser-sandbox');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const code=read('assets/js/core/07-markets-v31.js');
const nav=read('assets/js/core/02-navigation-kpis.js');
const css=read('assets/css/markets-v31.css');

assert(code.includes('function resetMarketDerivedUi()'),'V31.2 deve limpar leituras derivadas do geografia anterior');
assert(code.includes('function syncMarketDataUi()'),'V31.2 deve sincronizar estado visual com dados do mercado');
assert(code.includes("document.body?.classList.toggle('vg-market-no-pnl',!hasPnl)"),'V31.2 deve marcar mercado sem P&L');
assert(code.includes("document.body?.classList.toggle('vg-market-empty',!hasAny)"),'V31.2 deve distinguir mercado totalmente vazio');
assert(code.includes("if(hh&&!hasPnl)hh.textContent='0'"),'contador do topo deve ir a zero quando mercado não tem P&L');
assert(code.includes("if(hm&&!hasPnl)hm.textContent='—'"),'período do topo não pode herdar o mês do geografia anterior');
assert(code.includes("['hsCards','hsInsights','hsTableBody','hsHistory'"),'Ficha deve ser limpa externamente sem alterar ficha-hotel.js');
assert(code.includes("window.VG.operations.lastModel=null"),'modelo da Central não pode sobreviver à troca de mercado');
assert(nav.includes("if(!RAW) { try{window.VG?.market?.syncMarketDataUi?.();}catch(e){} return; }"),'refreshAll deve sincronizar o vazio em vez de deixar DOM antigo');
assert(css.includes('body.vg-market-no-pnl #contextPanel{display:none!important}'),'painel lateral com KPIs antigos deve desaparecer sem P&L');
assert(css.includes('body.vg-market-no-pnl #view-resumo.active'),'Resumo antigo deve ficar oculto sem P&L');
assert(css.includes('body.vg-market-no-pnl #view-fichahotel.active'),'Ficha antiga deve ficar oculta sem P&L');
assert(css.includes('body.vg-market-no-pnl #view-hotel360.active'),'Hotel 360 antigo deve ficar oculto sem P&L');

const ficha=read('assets/js/modules/ficha-hotel.js');
assert.strictEqual(require('crypto').createHash('sha256').update(ficha).digest('hex'),'2779d6f5cbfcedb672f037494ee54847a16aec2247f5a0594346e3e6c4963dc7','Ficha do Hotel deve permanecer byte-a-byte intacta');

const s=createSandbox();
// classList observável para validar estado vazio
const classes=new Set();
s.document.body.classList={add:x=>classes.add(x),remove:x=>classes.delete(x),toggle(x,on){if(on)classes.add(x);else classes.delete(x);return !!on;},contains:x=>classes.has(x)};
s.REP_STORE={};s.OCC_SNAPSHOTS=[];s.PIU_SNAPSHOTS=[];s.IG_SNAPSHOTS=[];s.RD_STORE=[];s.RAW=null;s.STORE={};
const els={};
function el(id){if(!els[id])els[id]={innerHTML:'OLD',textContent:'OLD',value:'OLD',style:{},querySelector(sel){if(sel==='h2')return els.emptyH2||(els.emptyH2={textContent:''});if(sel==='p')return els.emptyP||(els.emptyP={innerHTML:''});return null;}};return els[id];}
s.document.getElementById=id=>el(id);
load('assets/js/core/07-markets-v31.js',s);
s.window.VG.market.state.current='brasil';
const out=s.window.VG.market.syncMarketDataUi();
assert.strictEqual(out.hasPnl,false);assert.strictEqual(out.hasAny,false);
assert(classes.has('vg-market-no-pnl')&&classes.has('vg-market-empty'),'geografia vazia deve ativar isolamento visual');
assert.strictEqual(el('headerHotels').textContent,'0');
assert.strictEqual(el('headerMes').textContent,'—');
assert(els.emptyH2.textContent.includes('Brasil'),'empty state deve identificar o geografia Brasil');
assert(els.emptyP.innerHTML.includes('não é usada nesta análise'),'mensagem deve garantir separação da geografia anterior');

console.log('✓ V31.2: geografia vazia não herda KPIs, Central, Ficha ou contexto de PT+ES');
