const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const ROOT=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const pkg=require('../package.json'),html=read('index.html'),auth=read('assets/js/auth/auth-client.js'),server=read('netlify/functions/dashboard-sessao.js'),hkjs=read('assets/js/modules/housekeeping-native-v35.js'),nav=read('assets/js/ui/navigation-shell.js'),search=read('assets/js/ui/global-search.js'),responsive=read('assets/css/responsive-desktop-v35_6.css');
assert.strictEqual(pkg.version,'35.8.0','V35.8 deve estar identificada no package');
assert(html.includes('value="governanta"')&&html.includes('value="chefe_recepcao"'),'Setup deve criar Governanta e Chefe de Receção');
assert(html.includes('vgHotelAccessWrap')&&html.includes('vgModuleAccessWrap'),'Setup deve permitir escolher vários hotéis e menus por utilizador');
assert(auth.includes("governanta:['housekeeping']")&&auth.includes("chefe_recepcao:['resumo'"),'perfis recomendados devem existir no cliente');
assert(auth.includes('window.vgAuthCanAccessHotel')&&auth.includes('window.vgAuthCanAccessModule')&&auth.includes('applyMenuPermissions'),'cliente deve impor âmbito de hotéis e menus');
assert(server.includes('"governanta","chefe_recepcao"')&&server.includes('rec.hotels = hotels')&&server.includes('rec.modules = modules'),'backend deve persistir perfil, hotéis e módulos');
assert(server.includes('DIRECTION_ONLY_MODULES')&&server.includes('if(requiredModule&&!userCanModule'),'servidor deve validar módulos e reservar governação à DO');
assert(hkjs.includes("r==='governanta')return'Governanta'")&&hkjs.includes('abrirModoGovernanta')&&hkjs.includes('Registar quebras')&&hkjs.includes('Contagem física'),'Governanta deve entrar no modo mobile original');
assert(nav.includes('vgAuthCanAccessModule')&&search.includes('vgAuthCanAccessModule'),'command palette e pesquisa global devem respeitar menus atribuídos');
assert(responsive.includes('@media (max-width:1650px)')&&responsive.includes('@media (max-width:1180px)')&&responsive.includes('overflow-x:hidden')&&responsive.includes('overflow-x:auto!important'),'V35.8 deve adaptar desktop 125%/150% sem scroll horizontal global e manter scroll local nas tabelas');

function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function b64url(buf){return Buffer.from(buf).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');}
function token(secret,sub,av=1){const p=b64url(Buffer.from(JSON.stringify({sub,exp:Math.floor(Date.now()/1000)+3600,av})));return p+'.'+b64url(crypto.createHmac('sha256',secret).update(p).digest());}
function loadEsm(rel,seed={}){
  const stores=new Map();const ns=name=>{if(!stores.has(name))stores.set(name,new Map());return stores.get(name)};
  for(const [name,entries] of Object.entries(seed))for(const [k,v] of Object.entries(entries))ns(name).set(k,clone(v));
  const blobs={getStore({name}){const d=ns(name);return{async get(k){return clone(d.get(k));},async setJSON(k,v){d.set(k,clone(v));},async delete(k){d.delete(k);},async list({prefix=''}={}){return{blobs:[...d.keys()].filter(k=>String(k).startsWith(prefix)).map(key=>({key}))}}}}};
  let src=read(rel);src=src.replace(/import\s+\{\s*getStore\s*\}\s+from\s+['"]@netlify\/blobs['"];?/,"const {getStore}=require('@netlify/blobs');").replace(/import\s+crypto\s+from\s+['"]node:crypto['"];?/,"const crypto=require('node:crypto');").replace(/export\s+default\s+async\s*\(req\)\s*=>\s*\{/,'module.exports.handler=async(req)=>{').replace(/export\s+const\s+config\s*=\s*\{[\s\S]*?\};?\s*$/m,'');
  const module={exports:{}},sandbox={module,exports:module.exports,require(n){if(n==='@netlify/blobs')return blobs;return require(n)},Buffer,URL,Request,Response,Headers,console,Date,Math,Number,String,Object,Array,JSON,Promise,setTimeout,clearTimeout};vm.createContext(sandbox);vm.runInContext(src,sandbox,{filename:rel});return{handler:module.exports.handler,ns};
}
function req(method,url,tok,body){return new Request(url,{method,headers:{...(tok?{Authorization:'Bearer '+tok}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});}

function loadDashboard(){
  const data=new Map();const store={async get(k){return clone(data.get(k));},async setJSON(k,v){data.set(k,clone(v));},async set(k,v){data.set(k,String(v));},async delete(k){data.delete(k);},async list({prefix=''}={}){return{blobs:[...data.keys()].filter(k=>String(k).startsWith(prefix)).map(key=>({key,etag:'e'}))}}};
  const module={exports:{}},sandbox={module,exports:module.exports,require(n){if(n==='@netlify/blobs')return{getStore(){return store},connectLambda(){}};if(n==='crypto')return require('crypto');return require(n)},Buffer,URL,URLSearchParams,TextEncoder:global.TextEncoder,console,process,Date,Math,Number,String,Object,Array,JSON,Promise,setTimeout,clearTimeout};vm.createContext(sandbox);vm.runInContext(server,sandbox,{filename:'dashboard-sessao.js'});return{handler:module.exports.handler,data};
}
function dashEvent(method,resource,body,tok,key,ip='7.7.7.7'){return{httpMethod:method,queryStringParameters:{resource,...(key!==undefined?{key:String(key)}:{})},headers:{...(tok?{authorization:'Bearer '+tok}:{}),'x-nf-client-connection-ip':ip},body:body===undefined?'':JSON.stringify(body),isBase64Encoded:false};}
async function dashCall(handler,...args){const r=await handler(dashEvent(...args));let json={};try{json=JSON.parse(r.body||'{}')}catch(e){}return{...r,json};}
(async()=>{
  // Sessão central: a DO cria perfis, vários hotéis e menus específicos.
  const dash=loadDashboard();dash.data.set('users',{adm354:{user:'adm354',name:'DO Teste',pass:'Direcao3542027',role:'direcao',hotel:'*',active:true}});
  let dr=await dashCall(dash.handler,'POST','auth-login',{user:'adm354',password:'Direcao3542027'});assert.strictEqual(dr.statusCode,200);const adminTok=dr.json.token;
  dr=await dashCall(dash.handler,'POST','user-save',{user:'gov354',name:'Governanta Multi',password:'Governanta3542027',role:'governanta',hotels:['OPERA','ESTORIL'],modules:['housekeeping','governance']},adminTok);assert.strictEqual(dr.statusCode,200);
  dr=await dashCall(dash.handler,'POST','auth-login',{user:'gov354',password:'Governanta3542027'},null,null,'7.7.7.8');assert.strictEqual(dr.statusCode,200);assert.strictEqual(dr.json.user.role,'governanta');assert.deepStrictEqual(Array.from(dr.json.user.hotels),['OPERA','ESTORIL']);assert.deepStrictEqual(Array.from(dr.json.user.modules),['housekeeping'],'módulos exclusivos da DO devem ser removidos');
  dr=await dashCall(dash.handler,'POST','user-save',{user:'chief354',name:'Chefe Receção Multi',password:'ChefeRececao3542027',role:'chefe_recepcao',hotels:['OPERA','ESTORIL'],modules:['cityledger','documents']},adminTok);assert.strictEqual(dr.statusCode,200);
  dr=await dashCall(dash.handler,'POST','auth-login',{user:'chief354',password:'ChefeRececao3542027'},null,null,'7.7.7.9');assert.strictEqual(dr.statusCode,200);assert.strictEqual(dr.json.user.role,'chefe_recepcao');assert.deepStrictEqual(Array.from(dr.json.user.hotels),['OPERA','ESTORIL']);assert.deepStrictEqual(Array.from(dr.json.user.modules).sort(),['cityledger','documents']);

  const secret=crypto.randomBytes(32),authSecret={'_auth-secret-v1':{value:secret.toString('base64')}};
  const users={
    gov:{name:'Governanta Região',role:'governanta',hotel:'VG Opera',hotels:['VG Opera','VG Estoril'],modules:['housekeeping'],active:true,authVersion:1},
    chief:{name:'Chefe Receção',role:'chefe_recepcao',hotel:'VG Opera',hotels:['VG Opera','VG Estoril'],modules:['cityledger','documents'],active:true,authVersion:1},
    chiefab:{name:'Chefe Receção AB',role:'chefe_recepcao',hotel:'VG Opera',hotels:['VG Opera','VG Estoril'],modules:['ab'],active:true,authVersion:1}
  };
  const seedAuth={...authSecret,users};const govTok=token(secret,'gov'),chiefTok=token(secret,'chief'),chiefAbTok=token(secret,'chiefab');
  const db={hoteis:[{id:'13',nome:'VG Opera'},{id:'12',nome:'VG Estoril'},{id:'11',nome:'VG Cascais'}],campanhas:[{id:'c1',nome:'Outubro 2026',fechada:false}],invent:{c1:{'13':{aprovado:false,linhas:[{cat:'Lençol',existencias:10}]},'12':{aprovado:false,linhas:[{cat:'Lençol',existencias:20}]},'11':{aprovado:false,linhas:[{cat:'Lençol',existencias:30}]}}},users:[],log:[],meta:{}};
  const hk=loadEsm('netlify/functions/hk-store.js',{'vg-dashboard-operacoes':seedAuth,'vg-hk-inventario':{'vg_hk_inventario_v1':db}});
  let r=await hk.handler(req('GET','https://x/.netlify/functions/hk-store?key=vg_hk_inventario_v1',govTok));let j=await r.json();assert.strictEqual(r.status,200);assert.deepStrictEqual(j.data.hoteis.map(h=>h.id).sort(),['12','13'],'Governanta multi-hotel deve receber apenas os hotéis atribuídos');
  const submitted=clone(j.data);submitted.invent.c1['13'].linhas[0].existencias=15;submitted.invent.c1['13'].aprovado=true;r=await hk.handler(req('POST','https://x/.netlify/functions/hk-store',govTok,{key:'vg_hk_inventario_v1',data:submitted}));assert.strictEqual(r.status,200);let stored=hk.ns('vg-hk-inventario').get('vg_hk_inventario_v1');assert.strictEqual(stored.invent.c1['13'].linhas[0].existencias,15);assert.strictEqual(stored.invent.c1['13'].aprovado,false,'Governanta não pode forjar aprovação');assert.strictEqual(stored.invent.c1['11'].linhas[0].existencias,30,'Governanta não altera hotel fora do âmbito');
  r=await hk.handler(req('GET','https://x/.netlify/functions/hk-store?key=vg_hk_inventario_v1',chiefTok));assert.strictEqual(r.status,403,'Chefe de Receção sem menu Housekeeping não entra no módulo');

  const ab=loadEsm('netlify/functions/custos-ab-store.js',{'vg-dashboard-operacoes':seedAuth,'vg-custos-ab':{previsoes:{p:{porHotel:{'VG Opera':1,'VG Estoril':2,'VG Cascais':3}}}}});
  r=await ab.handler(req('POST','https://x/api/shared',chiefTok,{action:'get',key:'previsoes'}));assert.strictEqual(r.status,403,'Chefe de Receção sem A&B não acede ao backend A&B');
  r=await ab.handler(req('POST','https://x/api/shared',chiefAbTok,{action:'get',key:'previsoes'}));j=await r.json();assert.strictEqual(r.status,200);assert.deepStrictEqual(Object.keys(j.data.p.porHotel).sort(),['VG Estoril','VG Opera'],'Chefe de Receção com A&B vê apenas os hotéis atribuídos');
  console.log('✓ V35.8: acessos e responsividade desktop 125%/150% validados');
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
