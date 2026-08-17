const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const cp=require('child_process');
const {ROOT}=require('./helpers/browser-sandbox');

const rel='assets/js/modules/hotel-360-v30.js';
const code=fs.readFileSync(path.join(ROOT,rel),'utf8');
cp.execFileSync(process.execPath,['--check',path.join(ROOT,rel)],{stdio:'pipe'});

assert(code.includes("const state={hotel:'',tab:'overview',hydrating:false,hydrated:false}"),'Hotel 360 deve controlar hidratação concluída');
assert(code.includes('if(state.hydrated||state.hydrating)return;'),'Hotel 360 não pode iniciar hidratação repetida a cada render');
assert(code.includes('state.hydrated=true'),'Hotel 360 deve marcar dependências como hidratadas');
assert(code.includes("addEventListener('change',e=>selectHotel(e.target.value))"),'seletor de hotel deve chamar função estável de alteração');
assert(code.includes("addEventListener('click',()=>selectTab(b.dataset.v30Tab))"),'tabs do Hotel 360 devem chamar função estável de alteração');

let loads={actions:0,approvals:0,documents:0,score:0};
let scheduled=0;
const events={on(){}};
const window={
  VG:{
    events,
    actions:{ensureLoaded:async()=>{loads.actions++;}},
    approvals:{ensureLoaded:async()=>{loads.approvals++;}},
    documents:{ensureLoaded:async()=>{loads.documents++;}},
    operationalScore:{ensureConfig:async()=>{loads.score++;}}
  },
  vgAuthCurrent:()=>({role:'direcao'}),
};
window.window=window;
const sandbox={window,document:{getElementById(){return null;}},console,Date,Math,Number,String,Object,Array,JSON,Promise,Set,Map,Intl,currentView:'hotel360',setTimeout(fn){scheduled++;return scheduled;},clearTimeout(){},RAW:{hotels_ops:{},hotels_costs:{}},YR_CUR:'2026',YR_PREV:'2025'};
vm.createContext(sandbox);
vm.runInContext(code,sandbox,{filename:rel});
const api=window.VG.hotel360;
api.state.hotel='TESTE';

(async()=>{
  await Promise.all([api.hydrate('TESTE'),api.hydrate('TESTE')]);
  assert.deepStrictEqual(loads,{actions:1,approvals:1,documents:1,score:1},'duas chamadas concorrentes devem carregar dependências uma única vez');
  assert.strictEqual(scheduled,1,'primeira hidratação deve agendar apenas um render final');
  await api.hydrate('TESTE');
  assert.deepStrictEqual(loads,{actions:1,approvals:1,documents:1,score:1},'hidratação concluída não deve repetir carregamentos');
  assert.strictEqual(scheduled,1,'hidratação concluída não pode criar ciclo infinito de render');
  api.selectHotel('OUTRO HOTEL');
  assert.strictEqual(api.state.hotel,'OUTRO HOTEL','seletor deve alterar hotel mesmo com root ainda não montado');
  api.selectTab('finance');
  assert.strictEqual(api.state.tab,'finance','tab Financeiro deve ficar ativa');
  api.selectTab('revenue');
  assert.strictEqual(api.state.tab,'revenue','tab Revenue deve ficar ativa');
  console.log('✓ V30.2: Hotel 360 hidrata uma vez; seletor e tabs alteram estado sem serem substituídos continuamente');
})().catch(e=>{console.error(e);process.exit(1);});
