const assert=require('assert');
const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const {ROOT,createSandbox,load}=require('./helpers/browser-sandbox');
const rel='assets/js/modules/city-ledger-v32.js';
cp.execFileSync(process.execPath,['--check',path.join(ROOT,rel)],{stdio:'pipe'});
const s=createSandbox();s.document.readyState='loading';
s.window.VG.market={
  id:()=> 'iberia',
  def:(m='iberia')=>m==='brasil'?{id:'brasil',label:'Brasil',currency:'BRL',symbol:'R$',locale:'pt-BR',hotels:['FORTALEZA'],regions:{cidade:['FORTALEZA']}}:{id:'iberia',label:'PT + ES',currency:'EUR',symbol:'€',locale:'pt-PT',regions:{lisboa:['OPERA','ESTORIL']}},
  canonicalHotel:h=>String(h||'').trim(),
  hotelMarket:h=>String(h||'').toUpperCase()==='FORTALEZA'?'brasil':'iberia',
  detectHotels:hs=>hs.filter(h=>String(h).toUpperCase()==='FORTALEZA').length>hs.length/2?'brasil':'iberia'
};
s.window.vgAuthCurrent=()=>({user:'dir',name:'Direção',role:'direcao',hotel:'*'});
load(rel,s);
const api=s.window.VG.cityLedger;
assert(api&&api.version===32,'API City Ledger V32 deve existir');

const source=fs.readFileSync(path.join(ROOT,rel),'utf8');
assert(source.includes("filterCreditStatus:''"),'City Ledger deve manter estado do filtro por situação de crédito');
assert(source.includes('clFilterCreditStatus'),'UI deve incluir filtro por situação de crédito');
assert(source.includes("state.filterCreditStatus==='__EMPTY__'"),'filtro deve permitir documentos sem situação de crédito');
assert(source.includes('setTimeout(renderBody,90)'),'pesquisa deve atualizar apenas o corpo, sem recriar o campo de pesquisa');
assert(source.includes('buildSummary(filteredRows()'),'resumo/hotéis devem respeitar os filtros ativos');
const H=['DATA_REGISTO','HOTEL','ID_HOTEL','DATA_DOCUMENTO','TIPO_DOCUMENTO','NUM_DOCUMENTO','NUM_DOCUMENTO_CONTABILIDADE','ENTIDADE','EMAIL_ENTIDADE','EMAIL_ENT_FINANCEIRO','MOEDA','PAIS_ENTIDADE','VALOR_DOCUMENTO','VALOR_PAGO','SALDO','VOUCHER','AGING_BANDA','AGING_DIAS','SITUACAO_CREDITO','PLAFOND_EUROS','COD_ENTIDADE'];
const row=(hotel,date,doc,entity,saldo,valor=saldo,pago=0,moeda='EURO')=>['15/08/2026',hotel,'1',date,'FT',doc,doc,entity,'a@b.pt','fin@b.pt',moeda,'PT',valor,pago,saldo,'V1','','','APROVADO',50000,'C1'];
const aoa=[['título'],H,
  row('OPERA','01/08/2026','FT-1','Cliente A',1000), // vence 31/08 => a vencer em 15/08
  row('OPERA','01/07/2026','FT-2','Cliente A',2000), // vence 31/07 => 15 dias
  row('ESTORIL','01/04/2026','FT-3','Cliente B',3000), // vence 01/05 => 106 dias
  row('VG INTERNACIONAL','01/01/2026','FT-X','Ignorar',99999), // não é hotel oficial
  row('FORTALEZA','01/01/2026','FT-BR','Cliente BR',999,'999',0,'REAIS'), // outro mercado
  row('OPERA','01/06/2026','NC-1','Cliente A',-250,-250,0)
];
const parsed=api.normalizeAoa(aoa,'iberia','City_Ledger_PT.xlsm');
assert.strictEqual(parsed.snapshotDate,'2026-08-15','snapshot deve usar DATA_REGISTO');
assert.strictEqual(parsed.rows.length,4,'deve manter apenas hotéis oficiais PT+ES, incluindo crédito');
assert(!parsed.rows.some(r=>r.hotel==='VG INTERNACIONAL'),'entidades não-hotel na coluna HOTEL devem ser ignoradas');
assert(!parsed.rows.some(r=>r.hotel==='FORTALEZA'),'outro mercado deve ser excluído');
const a=parsed.rows.find(r=>r.accountingDocument==='FT-1'),b=parsed.rows.find(r=>r.accountingDocument==='FT-2'),c=parsed.rows.find(r=>r.accountingDocument==='FT-3');
assert.strictEqual(a.dueDate,'2026-08-31');assert(a.daysOverdue<0&&a.bucket==='notDue','vencimento é documento +30 dias');
assert.strictEqual(b.dueDate,'2026-07-31');assert.strictEqual(b.daysOverdue,15);assert.strictEqual(b.bucket,'d1_30');
assert(c.daysOverdue>90&&c.bucket==='d91_180','fatura antiga deve cair no aging de vencimento real');
const sum=api.buildSummary(parsed.rows,parsed.snapshotDate);
assert.strictEqual(sum.debt,6000,'dívida não deve incluir créditos');
assert.strictEqual(sum.credits,-250,'créditos ficam separados');
assert.strictEqual(sum.byBucket.notDue,1000);assert.strictEqual(sum.byBucket.d1_30,2000);assert.strictEqual(sum.byBucket.d91_180,3000);
assert.strictEqual(api.debt(parsed.rows.find(r=>r.balance<0)),0,'saldo negativo não é dívida');
assert.strictEqual(api.credit(parsed.rows.find(r=>r.balance<0)),-250,'saldo negativo é crédito');
console.log('✓ V32 City Ledger: Listagem, hotéis oficiais, vencimento +30 dias, aging real, detalhe de fatura e créditos separados');
