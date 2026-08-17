const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const {ROOT}=require('./helpers/browser-sandbox');
function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function loadHandler(){
 const data=new Map();
 const store={
  async get(key,opts={}){const v=data.get(key);if(v===undefined)return null;if(opts.type==='text')return typeof v==='string'?v:JSON.stringify(v);if(opts.type==='json'){if(typeof v==='string'){try{return JSON.parse(v);}catch(e){return v;}}return clone(v);}return typeof v==='string'?v:JSON.stringify(v);},
  async setJSON(key,value){data.set(key,clone(value));},
  async set(key,value){data.set(key,String(value));},
  async delete(key){data.delete(key);},
  async list(options={}){const prefix=String(options.prefix||'');return {blobs:[...data.keys()].filter(k=>String(k).startsWith(prefix)).map(key=>({key,etag:'etag-'+key}))};}
 };
 const blobs={getStore(){return store;},connectLambda(){}};const module={exports:{}};
 const sandbox={module,exports:module.exports,require(name){if(name==='@netlify/blobs')return blobs;if(name==='crypto')return require('crypto');return require(name);},Buffer,URL,URLSearchParams,TextEncoder:global.TextEncoder,console,process,Date,Math,Number,String,Object,Array,JSON,Promise,setTimeout,clearTimeout};
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(ROOT,'netlify/functions/dashboard-sessao.js'),'utf8'),sandbox,{filename:'dashboard-sessao.js'});return{handler:module.exports.handler,data};
}
function ev(method,resource,body,token,key,ip='2.2.2.2'){return{httpMethod:method,queryStringParameters:{resource,...(key!==undefined?{key:String(key)}:{})},headers:{...(token?{authorization:'Bearer '+token}:{}),'x-nf-client-connection-ip':ip},body:body===undefined?'':JSON.stringify(body),isBase64Encoded:false};}
async function call(handler,...args){const r=await handler(ev(...args));let json={};try{json=JSON.parse(r.body||'{}')}catch(e){}return{...r,json};}
(async()=>{
 const {handler,data}=loadHandler();
 data.set('users',{
  admin17:{user:'admin17',name:'Admin V17',pass:'AdminTeste2027',role:'direcao',hotel:'*',active:true},
  dir17:{user:'dir17',name:'Diretor V17',pass:'DiretorTeste2027',role:'diretor',hotel:'OPERA',active:true}
 });
 let r=await call(handler,'POST','auth-login',{user:'admin17',password:'AdminTeste2027'});assert.strictEqual(r.statusCode,200);const admin=r.json.token;
 r=await call(handler,'POST','auth-login',{user:'dir17',password:'DiretorTeste2027'},null,null,'2.2.2.3');assert.strictEqual(r.statusCode,200);const director=r.json.token;
 // Estado operacional inicial a proteger.
 data.set('index',{meses:[7],hoteis:['OPERA'],updatedAt:'2027-08-01'});
 data.set('mes-7',{hotel_list:['OPERA'],hotels_rev:{OPERA:{2027:100}}});
 data.set('settings-regions',{version:1,regions:{lisboa:['OPERA']}});
 data.set('targets-rules',{version:1,rules:{gop_low:{value:25}},targets:{}});
 data.set('ops-action/action_a',{id:'action_a',hotel:'OPERA',status:'open'});
 data.set('_audit-event/private',{secret:'nao copiar'});
 data.set('audit',[{action:'legacy'}]);

 r=await call(handler,'POST','recovery-create',{note:'Antes do teste'},director);assert.strictEqual(r.statusCode,403,'Diretor de hotel não cria backup global');
 r=await call(handler,'POST','recovery-create',{note:'Antes do teste'},admin);assert.strictEqual(r.statusCode,200,'Direção cria snapshot');
 const snap=r.json.data;assert(snap.id&&snap.items>=5);assert.strictEqual(snap.note,'Antes do teste');
 const manifest=data.get('_recovery-snapshot/'+snap.id);assert(manifest&&manifest.entries.length===snap.items);
 assert(!manifest.entries.some(e=>e.key==='users'||e.key==='audit'||e.key.startsWith('_audit-event')),'snapshot não inclui segurança/auditoria');

 r=await call(handler,'GET','recovery-list',undefined,director);assert.strictEqual(r.statusCode,403);
 r=await call(handler,'GET','recovery-list',undefined,admin);assert.strictEqual(r.statusCode,200);assert(r.json.data.some(x=>x.id===snap.id));assert(!('entries' in r.json.data[0]),'listagem não devolve mapa interno dos blobs');
 r=await call(handler,'GET','_recovery-snapshot/'+snap.id,undefined,admin);assert.strictEqual(r.statusCode,403,'blobs de backup internos não são expostos genericamente');

 // Alterar o estado depois do backup.
 data.set('mes-7',{hotel_list:['OPERA'],hotels_rev:{OPERA:{2027:999}}});
 data.set('mes-8',{hotel_list:['OPERA'],hotels_rev:{OPERA:{2027:888}}});
 data.set('settings-regions',{version:2,regions:{lisboa:['OPERA','ESTORIL']}});
 const usersBefore=JSON.stringify(data.get('users'));
 r=await call(handler,'POST','recovery-restore',{id:snap.id,confirmation:'nao'},admin);assert.strictEqual(r.statusCode,400,'reposição exige confirmação explícita');
 r=await call(handler,'POST','recovery-restore',{id:snap.id,confirmation:'REPOR'},admin);assert.strictEqual(r.statusCode,200,'Direção repõe snapshot');assert(r.json.safetySnapshot&&r.json.safetySnapshot.id,'reposição cria cópia automática do estado atual');
 // store.set guarda texto; simular leitura JSON como a função faria.
 const mes7=typeof data.get('mes-7')==='string'?JSON.parse(data.get('mes-7')):data.get('mes-7');
 const regions=typeof data.get('settings-regions')==='string'?JSON.parse(data.get('settings-regions')):data.get('settings-regions');
 assert.strictEqual(mes7.hotels_rev.OPERA[2027],100,'valor anterior foi restaurado');
 assert.strictEqual(regions.version,1,'configuração anterior foi restaurada');
 assert(!data.has('mes-8'),'blobs operacionais criados depois do snapshot são removidos numa reposição global');
 assert.strictEqual(JSON.stringify(data.get('users')),usersBefore,'utilizadores/credenciais não são restaurados por snapshots operacionais');

 r=await call(handler,'GET','recovery-list',undefined,admin);assert.strictEqual(r.statusCode,200);assert(r.json.data.some(x=>x.id===r.json.data.find(x=>x.kind==='pre_restore')?.id),'snapshot pré-reposição fica disponível');
 const safetyRows=r.json.data.filter(x=>x.kind==='pre_restore');assert(safetyRows.length>=1);
 const safetyId=safetyRows[0].id;
 r=await call(handler,'POST','recovery-delete',{id:safetyId,confirmation:'errado'},admin);assert.strictEqual(r.statusCode,400);
 r=await call(handler,'POST','recovery-delete',{id:safetyId,confirmation:'APAGAR'},admin);assert.strictEqual(r.statusCode,200,'snapshot pode ser eliminado com confirmação');
 assert(!data.has('_recovery-snapshot/'+safetyId));

 const gov=[...data.entries()].filter(([k])=>k.startsWith('_audit-event/')).map(([,v])=>typeof v==='string'?JSON.parse(v):v);
 assert(gov.some(x=>x.category==='Backup'&&x.action==='Snapshot criado'));
 assert(gov.some(x=>x.category==='Backup'&&x.action==='Versão reposta'&&x.severity==='critical'));
 console.log('✓ backup/recuperação: snapshots server-side, exclusões de segurança, safety copy, restore e delete');
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
