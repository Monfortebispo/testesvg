const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(root,'assets/js/modules/city-ledger-v32.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/css/city-ledger-v32.css'),'utf8');
assert(js.includes("filterClients:[]"),'City Ledger deve manter seleção multi-cliente');
assert(js.includes('function selectedClientKeys()')&&js.includes('new Set(clients)'),'filtro deve aceitar uma ou várias entidades');
assert(js.includes('Clientes / Entidades')&&js.includes('data-cl-client-check'),'detalhe do hotel deve listar entidades/clientes selecionáveis');
assert(js.includes('data-cl-client-clear')&&js.includes('Todos os clientes'),'deve ser fácil regressar a todas as entidades');
assert(js.includes('data-cl-clear-filters')&&js.includes('clearFilters(false)'),'deve existir limpeza global de filtros');
assert(js.includes("state.filterHotel=e.target.value;state.filterClient='';state.filterClients=[]"),'mudar hotel deve limpar seleção de entidades');
assert(css.includes('.cl-client-filter')&&css.includes('.cl-clear-filters'),'UI do filtro multi-entidade deve estar estilizada');
assert(js.includes("release:'34.0'"),'City Ledger deve identificar a revisão 34.0');
console.log('✓ City Ledger V34.0: filtro multi-entidade + limpeza rápida auditados');

const vm=require('vm');
const sandbox={console,URL,Date,setTimeout,clearTimeout,window:{VG:{util:{escapeHtml:v=>String(v)},market:{id:()=> 'iberia',def:()=>({label:'PT + ES',symbol:'€',currency:'EUR',locale:'pt-PT'}),canonicalHotel:h=>h,hotelMarket:()=> 'iberia'}},vgAuthCurrent:()=>({role:'direcao',name:'Teste'})},document:{readyState:'complete',addEventListener:()=>{}},currentView:'resumo'};
sandbox.window.window=sandbox.window;sandbox.window.document=sandbox.document;sandbox.window.setTimeout=setTimeout;sandbox.window.clearTimeout=clearTimeout;
vm.runInNewContext(js,sandbox,{filename:'city-ledger-v32.js'});
const api=sandbox.window.VG.cityLedger;
api.state.rows=[
 {hotel:'COLLECTION SINTRA',clientKey:'iberia|A',entity:'Cliente A',clientCode:'A',currency:'EUR',balance:100,bucket:'d31_60',creditStatus:'',accountingDocument:'FT1'},
 {hotel:'COLLECTION SINTRA',clientKey:'iberia|B',entity:'Cliente B',clientCode:'B',currency:'EUR',balance:200,bucket:'d31_60',creditStatus:'',accountingDocument:'FT2'},
 {hotel:'ESTORIL',clientKey:'iberia|A',entity:'Cliente A',clientCode:'A',currency:'EUR',balance:300,bucket:'d31_60',creditStatus:'',accountingDocument:'FT3'}
];
api.state.filterHotel='COLLECTION SINTRA';api.state.filterClients=['iberia|A','iberia|B'];
assert.deepStrictEqual(Array.from(api.filteredRows(),r=>r.accountingDocument),['FT1','FT2'],'multi-seleção deve filtrar duas entidades apenas no hotel atual');
api.state.filterClients=['iberia|B'];assert.deepStrictEqual(Array.from(api.filteredRows(),r=>r.accountingDocument),['FT2'],'seleção simples no novo filtro deve funcionar');
api.state.filterClient='iberia|A';assert.deepStrictEqual(Array.from(api.filteredRows(),r=>r.accountingDocument),['FT1'],'seleção direta/legacy deve sobrepor uma seleção múltipla anterior');api.state.filterClient='';
assert.strictEqual(api.clientOptionsForHotel().length,2,'lista de clientes deve respeitar o hotel selecionado');
api.clearFilters(false);assert.strictEqual(api.state.filterHotel,'');assert.strictEqual(api.state.filterClients.length,0);assert.strictEqual(api.filteredRows().length,3,'limpar filtros deve recuperar todas as entidades e hotéis');
console.log('✓ City Ledger V34.0 runtime sintético: multi-seleção e limpeza funcionais');
