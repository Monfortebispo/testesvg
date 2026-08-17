const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const ROOT=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const hotels=read('assets/js/modules/hoteis.js'),server=read('netlify/functions/dashboard-sessao.js'),nav=read('assets/js/ui/navigation-shell.js'),html=read('index.html'),sw=read('service-worker.js'),pkg=require('../package.json');

// Regressão explícita do erro reportado em produção: "Assignment to constant variable".
const saveFn=hotels.slice(hotels.indexOf('async function hoteisSaveEditor'),hotels.indexOf('async function hoteisLoadSharedProfiles'));
assert(saveFn.includes('let d=Object.assign'),'o registo editável do hotel tem de ser mutável depois da resposta do servidor');
assert(!saveFn.includes('const d=Object.assign'),'não pode regressar o const que causava Assignment to constant variable');
assert(saveFn.includes('expectedUpdatedAt:HOTEIS_PROFILE_META[sk]?.updatedAt||\'\''),'editor deve enviar controlo otimista de concorrência');
assert(hotels.includes('function htRegionSelect'),'Região deve ser escolhida de valores canónicos e não ficar apenas como texto livre');

// Coerência de versão e lazy-load dos módulos pesados.
assert.strictEqual(pkg.version,'35.6.0');
assert(html.includes('content="35.6"')&&html.includes('V35.6 · Navegação & Governanta'),'HTML e badge devem identificar V35.6');
assert(sw.includes("const CACHE_NAME = 'vg-operations-shell-v35-6'"),'Service Worker deve usar cache V35.6');
assert(!html.includes('src="assets/js/modules/compras-ab-native-v35.js"')&&!html.includes('src="assets/js/modules/housekeeping-native-v35.js"'),'A&B e HK devem carregar apenas quando abertos');

// Histórico HK: não declarar sucesso sem as 3 campanhas conhecidas (2 fechadas + 1 aberta).
assert(nav.includes('HK_MIN_CAMPAIGNS=3')&&nav.includes('HK_MIN_CLOSED=2')&&nav.includes('HK_MIN_OPEN=1'),'migração HK deve validar 3 campanhas / 2 fechadas / 1 aberta');
assert(nav.includes('legacyMergeV353')&&nav.includes('vg_hk_backup_pre_v353_'),'merge HK deve ser marcado e criar backup prévio');
assert(nav.includes('hkMergeLines')&&nav.includes('hkMergeInventory'),'histórico deve fundir linhas/movimentos, não substituir cegamente o inventário');

function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function loadHandler(){
  const data=new Map();
  const store={
    async get(key,opts={}){const v=data.get(key);if(v===undefined)return null;if(opts.type==='text')return typeof v==='string'?v:JSON.stringify(v);if(opts.type==='json'){if(typeof v==='string'){try{return JSON.parse(v)}catch(e){return v}}return clone(v);}return clone(v);},
    async setJSON(key,value){data.set(key,clone(value));},async set(key,value){data.set(key,String(value));},async delete(key){data.delete(key);},
    async list(options={}){const prefix=String(options.prefix||'');return{blobs:[...data.keys()].filter(k=>String(k).startsWith(prefix)).map(key=>({key,etag:'e-'+key}))};}
  };
  const module={exports:{}};
  const sandbox={module,exports:module.exports,require(name){if(name==='@netlify/blobs')return{getStore(){return store},connectLambda(){}};if(name==='crypto')return require('crypto');return require(name);},Buffer,URL,URLSearchParams,TextEncoder:global.TextEncoder,console,process,Date,Math,Number,String,Object,Array,JSON,Promise,setTimeout,clearTimeout};
  vm.createContext(sandbox);vm.runInContext(server,sandbox,{filename:'dashboard-sessao.js'});return{handler:module.exports.handler,data};
}
function ev(method,resource,body,token,key,ip='10.20.30.40'){return{httpMethod:method,queryStringParameters:{resource,...(key!==undefined&&key!==null?{key:String(key)}:{})},headers:{...(token?{authorization:'Bearer '+token}:{}),'x-nf-client-connection-ip':ip},body:body===undefined?'':JSON.stringify(body),isBase64Encoded:false};}
async function call(handler,...args){const r=await handler(ev(...args));let json={};try{json=JSON.parse(r.body||'{}')}catch(e){}return{...r,json};}

(async()=>{
  const {handler,data}=loadHandler();
  data.set('users',{dir353:{user:'dir353',name:'Diretor Ópera',pass:'Hotel353Pass!',role:'diretor',hotel:'OPERA',active:true}});
  let r=await call(handler,'POST','auth-login',{user:'dir353',password:'Hotel353Pass!'});assert.strictEqual(r.statusCode,200);const tok=r.json.token;

  // Guardar e voltar a guardar uma ficha deve funcionar; uma cópia obsoleta deve dar 409.
  r=await call(handler,'POST','ops-hotel-profile-save',{key:'VG Opera',hotel:'Hotel Vila Galé Ópera',data:{nome:'Hotel Vila Galé Ópera',morada:'Morada A'},static:{regiao:'Lisboa & Ilhas'}},tok);
  assert.strictEqual(r.statusCode,200);const first=r.json.data;assert(first.updatedAt);
  r=await call(handler,'POST','ops-hotel-profile-save',{key:'VG Opera',hotel:'Hotel Vila Galé Ópera',data:{nome:'Hotel Vila Galé Ópera',morada:'Morada B'},static:{regiao:'Lisboa & Ilhas'},expectedUpdatedAt:first.updatedAt},tok);
  assert.strictEqual(r.statusCode,200,'guardar a versão corrente da ficha deve funcionar');const second=r.json.data;assert.notStrictEqual(second.updatedAt,first.updatedAt);
  r=await call(handler,'POST','ops-hotel-profile-save',{key:'VG Opera',hotel:'Hotel Vila Galé Ópera',data:{nome:'Hotel Vila Galé Ópera',morada:'Morada obsoleta'},static:{regiao:'Lisboa & Ilhas'},expectedUpdatedAt:first.updatedAt},tok);
  assert.strictEqual(r.statusCode,409,'uma ficha obsoleta deve ser rejeitada em vez de sobrescrever outra sessão');

  // O nome/extensão do ficheiro é a fonte de verdade do MIME; bytes têm de sair intactos.
  const raw=Buffer.from('%PDF-1.7\nVG V35.3 document test\n','utf8'),b64=raw.toString('base64');
  r=await call(handler,'POST','ops-document-save',{hotel:'OPERA',title:'PDF robusto',category:'report',linkType:'hotel',fileName:'relatorio.pdf',mime:'text/html',size:raw.length,contentBase64:b64},tok);
  assert.strictEqual(r.statusCode,200);const doc=r.json.data;assert.strictEqual(doc.mime,'application/pdf','MIME do browser não pode transformar PDF em outro tipo');
  r=await call(handler,'GET','ops-document-content',undefined,tok,doc.id);
  assert.strictEqual(r.statusCode,200);assert.strictEqual(r.headers['Content-Type'],'application/pdf');assert.strictEqual(r.isBase64Encoded,true);assert(Buffer.from(r.body,'base64').equals(raw),'endpoint binário deve devolver exatamente os bytes guardados');

  console.log('✓ V35.3: gravação de hotéis, concorrência, MIME documental, bytes e robustez de versão validados');
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
