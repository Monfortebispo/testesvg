const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const path=require('path');

const code=fs.readFileSync(path.join(__dirname,'../assets/js/modules/operational-summary-pdf-v32_6.js'),'utf8');
let auth={name:'Pedro Teste',role:'direcao',hotel:'*'};
const context={
  console,
  Date,
  setTimeout,
  YR_PREV:2025,
  YR_CUR:2026,
  STORE:{},
  window:{},
};
context.window=context;
context.vgAuthCurrent=()=>auth;
context.VG={
  market:{
    id:()=> 'iberia',
    def:()=>({id:'iberia',label:'PT + ES',flag:'PT+ES',currency:'EUR',symbol:'€',locale:'pt-PT',regions:{lisboa:['OPERA'],norte:['PORTO']},regionLabels:{lisboa:'Lisboa & Ilhas',norte:'Norte e Centro'}}),
    isCurrentHotel:h=>h!=='FORTALEZA',
    formatMoney:(v,d=0)=>`€ ${Number(v).toFixed(d)}`
  },
  events:{on:()=>{}}
};
function hotelData(rev,rooms,disp,gop,cost,energy){return {
  'Receita Total':{2025:rev*.9,2026:rev},
  'Receita Alojamento':{2025:rev*.54,2026:rev*.6},
  Disponiveis:{2025:disp,2026:disp},Ocupados:{2025:rooms*.9,2026:rooms},
  'GOP COM SEDE':{2025:gop*.9,2026:gop},'GOP SEM SEDE':{2025:gop*.95,2026:gop*1.05}
};}
function costData(cost,energy){return {TOTAIS:{2025:cost*.9,2026:cost},ENERGIA:{2025:energy*.9,2026:energy}};}
for(let m=1;m<=3;m++){
  context.STORE[m]={mes:m,yr_prev:2025,yr_cur:2026,hotel_list:['OPERA','PORTO','FORTALEZA'],hotels_ops:{
    OPERA:hotelData(100000*m,70*m,100*m,40000*m,50000*m,700*m),
    PORTO:hotelData(80000*m,60*m,90*m,30000*m,42000*m,600*m),
    FORTALEZA:hotelData(900000*m,500*m,700*m,300000*m,500000*m,9000*m)
  },hotels_costs:{
    OPERA:costData(50000*m,700*m),PORTO:costData(42000*m,600*m),FORTALEZA:costData(500000*m,9000*m)
  }};
}
vm.createContext(context);
vm.runInContext(code,context,{filename:'operational-summary-pdf-v32_6.js'});
const api=context.VG.operationalSummaryPdf;
assert(api,'API v32.6 deve existir');
let r=api.buildReport({month:3,scope:'all'});
assert.strictEqual(r.available,true);
assert.deepStrictEqual(Array.from(r.months),[1,2,3]);
assert.strictEqual(r.hotels.length,2,'não pode misturar Brasil em PT+ES');
assert(!r.hotels.includes('FORTALEZA'));
const op=r.rows.find(x=>x.hotel==='OPERA');
assert.strictEqual(op.recC,600000,'receita deve acumular Jan-Mar');
assert(Math.abs(op.occC-70)<1e-9,'ocupação deve ser ponderada por quartos acumulados');
assert(Math.abs(op.adrC-(360000/420))<1e-9,'ADR deve usar receita alojamento / ocupados acumulados');
assert.strictEqual(op.gopC,240000,'GOP com sede deve somar os meses');
assert(Math.abs(op.energyOccC-(4200/420))<1e-9,'energia/quarto ocupado deve usar volumes acumulados');

r=api.buildReport({month:3,scope:'regions',regions:['lisboa']});
assert.deepStrictEqual(Array.from(r.hotels),['OPERA']);
assert.strictEqual(r.groups.length,1);
assert.strictEqual(r.groups[0].label,'Lisboa & Ilhas');
const html=api.reportHtml(r);
assert(html.includes('@page{size:A3 landscape'),'PDF deve ser horizontal A3');
assert(html.includes('data:image/png;base64,'),'PDF deve incorporar o logótipo');
assert(html.includes('Vila Galé Hotéis'),'PDF deve identificar a marca');
assert(html.includes('Janeiro - Março 2026'),'período deve ser acumulado ao mês escolhido');

// lacuna mensal deve ficar explicitamente marcada
const feb=context.STORE[2];delete context.STORE[2];
r=api.buildReport({month:3,scope:'all'});
assert.deepStrictEqual(Array.from(r.missing),[2]);
assert(api.reportHtml(r).includes('acumulado incompleto'));
context.STORE[2]=feb;

// perfis restritos nunca podem obter outro hotel
const AuthPrev=auth;auth={name:'Diretor Ópera',role:'diretor',hotel:'OPERA'};
r=api.buildReport({month:3,scope:'all'});
assert.deepStrictEqual(Array.from(r.hotels),['OPERA']);
auth=AuthPrev;

console.log('✓ Operational Summary PDF v32.6: acumulado, geografia, regiões, logo e segurança validados.');
