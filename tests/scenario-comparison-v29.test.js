const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const index=read('index.html'),server=read('netlify/functions/dashboard-sessao.js'),sw=read('service-worker.js'),forecast=read('assets/js/modules/forecast-scenarios.js'),search=read('assets/js/ui/global-search.js'),mobile=read('assets/js/ui/mobile-pwa.js'),core=read('assets/js/core/02-navigation-kpis.js'),moduleText=read('assets/js/modules/scenario-comparison-v29.js');
function ok(v,m){assert(v,m)}
ok(index.includes('view-scenariocompare')&&index.includes('scenario-comparison-v29.js')&&index.includes('scenario-comparison-v29.css'),'V29 deve estar ligada no index');
ok(index.includes('nav-scenariocompare'),'V29 deve estar na navegação lateral');
ok(core.includes("currentView === 'scenariocompare'")&&core.includes('scenarioComparisonRender'),'refreshAll deve renderizar V29');
ok(forecast.includes('getState')&&forecast.includes('scenarioCompareFromForecast'),'Forecast V12 deve expor estado e atalho para o comparador');
ok(sw.includes('vg-operations-shell-v32')&&sw.includes('scenario-comparison-v29.js')&&sw.includes('scenario-comparison-v29.css'),'PWA deve incluir shell V29');
ok(search.includes("type:'scenario'")&&search.includes('buildScenarios(arr)'),'Pesquisa Global deve indexar cenários');
ok(mobile.includes('data-view="revenuehub"'),'V30 deve expor Comparação de Cenários dentro de Revenue & Forecast no mobile');
ok(server.includes('const SCENARIO_PREFIX = "ops-scenario/"')&&server.includes('resource === "ops-scenario-save"')&&server.includes('resource === "ops-scenario-delete"'),'backend deve ter endpoints próprios V29');
ok(server.includes('return "Cenários"')&&server.includes('"ops-scenario/"'),'Backup deve proteger cenários');

// API frontend mínima e deteção de base alterada.
const sandbox={window:{VG:{util:{escapeHtml:v=>String(v)},events:{emit(){}}}},document:{getElementById(){return null},createElement(){return {addEventListener(){},querySelector(){return null}}},body:{appendChild(){}}},console,Date,Math,Number,String,Object,Array,JSON,Set,Promise,confirm(){return true}};sandbox.window.window=sandbox.window;sandbox.window.document=sandbox.document;sandbox.window.vgAuthCurrent=()=>({user:'dir29',name:'Diretor',role:'diretor',hotel:'OPERA'});sandbox.window.VG.forecast={buildBase(){return {available:true}},calculateScenario(){return {}},presets:{}};vm.createContext(sandbox);vm.runInContext(moduleText,sandbox,{filename:'scenario-comparison-v29.js'});
assert.strictEqual(sandbox.window.VG.scenarioComparison.version,29);
assert.deepStrictEqual(JSON.parse(JSON.stringify(sandbox.window.VG.scenarioComparison.cleanAdjustments({occDelta:2,adrPct:3}))),{occDelta:2,adrPct:3,otherRevenuePct:0,personnelPct:0,otherCostPct:0});
assert.strictEqual(sandbox.window.VG.scenarioComparison.changedBaseline({forecastOcc:80,adrBase:100,baseRevenue:1000,availableRN:100,personnelRatio:.2,otherCostRatio:.5,sedeRatio:0,referenceYear:'2026',latestAt:'x'},{forecastOcc:82,adrBase:100,baseRevenue:1000,availableRN:100,personnelRatio:.2,otherCostRatio:.5,sedeRatio:0,referenceYear:'2026',latestAt:'x'}),true);

function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function loadHandler(){
  const data=new Map();const store={async get(key,opts={}){const v=data.get(key);if(v===undefined)return null;if(opts.type==='text')return typeof v==='string'?v:JSON.stringify(v);if(opts.type==='json'){if(typeof v==='string'){try{return JSON.parse(v)}catch(e){return v}}return clone(v)}return clone(v)},async setJSON(key,value){data.set(key,clone(value))},async set(key,value){data.set(key,String(value))},async delete(key){data.delete(key)},async list(options={}){const prefix=String(options.prefix||'');return{blobs:[...data.keys()].filter(k=>String(k).startsWith(prefix)).map(key=>({key,etag:'e-'+key}))}}};
  const mod={exports:{}};const sb={module:mod,exports:mod.exports,require(name){if(name==='@netlify/blobs')return{getStore(){return store},connectLambda(){}};if(name==='crypto')return require('crypto');return require(name)},Buffer,URL,URLSearchParams,TextEncoder:global.TextEncoder,console,process,Date,Math,Number,String,Object,Array,JSON,Promise,setTimeout,clearTimeout};vm.createContext(sb);vm.runInContext(server,sb,{filename:'dashboard-sessao.js'});return{handler:mod.exports.handler,data};
}
function ev(method,resource,body,token,key,ip='8.8.8.8'){return{httpMethod:method,queryStringParameters:{resource,...(key!=null?{key:String(key)}:{})},headers:{...(token?{authorization:'Bearer '+token}:{}),'x-nf-client-connection-ip':ip},body:body===undefined?'':JSON.stringify(body),isBase64Encoded:false};}
async function call(handler,...args){const r=await handler(ev(...args));let json={};try{json=JSON.parse(r.body||'{}')}catch(e){}return{...r,json};}
(async()=>{
  const {handler,data}=loadHandler();data.set('users',{dir29:{user:'dir29',name:'Diretor Ópera',pass:'Diretor292029',role:'diretor',hotel:'OPERA',active:true},est29:{user:'est29',name:'Diretor Estoril',pass:'Estoril292029',role:'diretor',hotel:'ESTORIL',active:true},adm29:{user:'adm29',name:'Direção',pass:'Admin292029',role:'direcao',hotel:'*',active:true}});
  let r=await call(handler,'POST','auth-login',{user:'dir29',password:'Diretor292029'});assert.strictEqual(r.statusCode,200);const dir=r.json.token;
  r=await call(handler,'POST','auth-login',{user:'est29',password:'Estoril292029'},null,null,'8.8.8.9');assert.strictEqual(r.statusCode,200);const est=r.json.token;
  r=await call(handler,'POST','auth-login',{user:'adm29',password:'Admin292029'},null,null,'8.8.8.10');assert.strictEqual(r.statusCode,200);const adm=r.json.token;
  const payload={hotel:'OPERA',year:2029,month:9,name:'Ambicioso controlado',description:'Mais ocupação e ADR com custo controlado.',adjustments:{occDelta:3,adrPct:4,otherRevenuePct:2,personnelPct:0,otherCostPct:-1},baseline:{forecastOcc:80,target:84,adrBase:120,baseRevenue:150000,availableRN:3000,personnelRatio:.25,otherCostRatio:.55,sedeRatio:.01,referenceYear:'2029',source:'P&L',latestAt:'2029-08-20T00:00:00Z'},captured:{occ:83,adr:124.8,revenue:165000,gop:33000,gopPct:20,costs:133650}};
  r=await call(handler,'POST','ops-scenario-save',payload,dir);assert.strictEqual(r.statusCode,200);const sc=r.json.data;assert(sc.id&&sc.hotel==='OPERA'&&sc.adjustments.occDelta===3);
  r=await call(handler,'POST','ops-scenario-save',{...payload,hotel:'ESTORIL',name:'Indevido'},dir);assert.strictEqual(r.statusCode,403,'Diretor não cria cenário noutro hotel');
  r=await call(handler,'POST','ops-scenario-save',{...payload,adjustments:{...payload.adjustments,adrPct:99}},dir);assert.strictEqual(r.statusCode,400,'ajustes fora dos limites devem ser rejeitados');
  r=await call(handler,'GET','ops-scenarios',undefined,dir);assert.strictEqual(r.statusCode,200);assert(r.json.data.some(x=>x.id===sc.id));
  r=await call(handler,'GET','ops-scenarios',undefined,est);assert.strictEqual(r.statusCode,200);assert(!r.json.data.some(x=>x.id===sc.id),'outro hotel não vê cenário');
  r=await call(handler,'GET','ops-scenario/'+sc.id,undefined,dir);assert.strictEqual(r.statusCode,403,'acesso direto ao Blob deve ser bloqueado');
  r=await call(handler,'POST','ops-scenario-save',{...payload,id:sc.id,expectedUpdatedAt:sc.updatedAt,name:'Ambicioso revisto'},dir);assert.strictEqual(r.statusCode,200);const sc2=r.json.data;
  r=await call(handler,'POST','ops-scenario-save',{...payload,id:sc.id,expectedUpdatedAt:sc.updatedAt,name:'Versão antiga'},dir);assert.strictEqual(r.statusCode,409,'concorrência otimista deve bloquear edição antiga');
  r=await call(handler,'POST','recovery-create',{note:'V29 cenários'},adm);assert.strictEqual(r.statusCode,200);const manifest=data.get('_recovery-snapshot/'+r.json.data.id);assert(manifest.entries.some(x=>String(x.key).startsWith('ops-scenario/')));assert.strictEqual(manifest.appVersion,'29');
  const audits=[...data.entries()].filter(([k])=>String(k).startsWith('_audit-event/')).map(([,v])=>typeof v==='string'?JSON.parse(v):v);assert(audits.some(x=>x.category==='Cenários'&&x.action==='Cenário criado'));
  r=await call(handler,'POST','ops-scenario-delete',{id:sc.id,expectedUpdatedAt:sc2.updatedAt},dir);assert.strictEqual(r.statusCode,200);assert(!data.has('ops-scenario/'+sc.id));
  console.log('✓ v29: cenários partilhados, âmbito, limites, concorrência, auditoria, backup e pesquisa');
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
