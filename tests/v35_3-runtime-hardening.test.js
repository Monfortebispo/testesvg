const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const ROOT=path.resolve(__dirname,'..');
function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function b64url(buf){return Buffer.from(buf).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');}
function token(secret,sub,roleVersion=1){const payload=b64url(Buffer.from(JSON.stringify({sub,exp:Math.floor(Date.now()/1000)+3600,av:roleVersion})));const sig=b64url(crypto.createHmac('sha256',secret).update(payload).digest());return payload+'.'+sig;}
function loadEsmFunction(rel,seed={}){
  const stores=new Map();
  function ns(name){if(!stores.has(name))stores.set(name,new Map());return stores.get(name);}
  for(const [name,entries] of Object.entries(seed))for(const [k,v] of Object.entries(entries))ns(name).set(k,clone(v));
  const blobs={getStore({name}){const d=ns(name);return {async get(k){return clone(d.get(k));},async setJSON(k,v){d.set(k,clone(v));},async delete(k){d.delete(k);},async list({prefix='' }={}){return {blobs:[...d.keys()].filter(k=>String(k).startsWith(prefix)).map(key=>({key}))};}};}};
  let src=fs.readFileSync(path.join(ROOT,rel),'utf8');
  src=src.replace(/import\s+\{\s*getStore\s*\}\s+from\s+['"]@netlify\/blobs['"];?/,"const {getStore}=require('@netlify/blobs');");
  src=src.replace(/import\s+crypto\s+from\s+['"]node:crypto['"];?/,"const crypto=require('node:crypto');");
  src=src.replace(/export\s+default\s+async\s*\(req\)\s*=>\s*\{/, 'module.exports.handler=async(req)=>{');
  src=src.replace(/export\s+const\s+config\s*=\s*\{[\s\S]*?\};?\s*$/m,'');
  const module={exports:{}},sandbox={module,exports:module.exports,require(n){if(n==='@netlify/blobs')return blobs;return require(n);},Buffer,URL,Request,Response,Headers,console,Date,Math,Number,String,Object,Array,JSON,Promise,setTimeout,clearTimeout};
  vm.createContext(sandbox);vm.runInContext(src,sandbox,{filename:rel});return {handler:module.exports.handler,stores,ns};
}
function req(method,url,tok,body){return new Request(url,{method,headers:{...(tok?{Authorization:'Bearer '+tok}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});}
(async()=>{
  const secret=crypto.randomBytes(32),secretB64=secret.toString('base64');
  const users={admin:{name:'Admin',role:'direcao',hotel:'*',active:true,authVersion:1},dir:{name:'Diretor Opera',role:'diretor',hotel:'VG Opera',active:true,authVersion:1},buy:{name:'Compras',role:'compras',hotel:'*',active:true,authVersion:1}};
  const authSeed={'_auth-secret-v1':{value:secretB64},users};
  const adminTok=token(secret,'admin'),dirTok=token(secret,'dir'),buyTok=token(secret,'buy');

  const hkDb={users:[{id:'x',password:'secret'}],hoteis:[{id:'13',nome:'VG Opera'},{id:'12',nome:'VG Estoril'}],campanhas:[{id:'c1',nome:'Outubro 2026',fechada:false}],invent:{c1:{'13':{aprovado:false,linhas:[{cat:'Lençol',cama:'90 x 200',medida:'180 x 300',existencias:10}]},'12':{aprovado:false,linhas:[{cat:'Lençol',cama:'90 x 200',medida:'180 x 300',existencias:20}]}}},log:[{id:'l1',user:'Admin'}],meta:{}};
  const hk=loadEsmFunction('netlify/functions/hk-store.js',{'vg-dashboard-operacoes':authSeed,'vg-hk-inventario':{'vg_hk_inventario_v1':hkDb}});
  let r=await hk.handler(req('GET','https://x/.netlify/functions/hk-store?key=vg_hk_inventario_v1',dirTok));let j=await r.json();
  assert.strictEqual(r.status,200);assert.deepStrictEqual(j.data.hoteis.map(x=>x.id),['13'],'Diretor recebe apenas o hotel da sessão');assert.deepStrictEqual(Object.keys(j.data.invent.c1),['13']);assert.deepStrictEqual(j.data.users,[]);
  const submitted=clone(j.data);submitted.invent.c1['13'].linhas[0].existencias=15;submitted.invent.c1['13'].aprovado=true;submitted.invent.c1['12']={aprovado:true,linhas:[{existencias:999}]};
  r=await hk.handler(req('POST','https://x/.netlify/functions/hk-store',dirTok,{key:'vg_hk_inventario_v1',data:submitted}));assert.strictEqual(r.status,200);
  let stored=hk.ns('vg-hk-inventario').get('vg_hk_inventario_v1');assert.strictEqual(stored.invent.c1['13'].linhas[0].existencias,15);assert.strictEqual(stored.invent.c1['13'].aprovado,false,'Diretor não pode forjar aprovação');assert.strictEqual(stored.invent.c1['12'].linhas[0].existencias,20,'Diretor não altera outro hotel');
  r=await hk.handler(req('POST','https://x/.netlify/functions/hk-store',buyTok,{key:'vg_hk_inventario_v1',data:{campanhas:[]}}));j=await r.json();assert.strictEqual(r.status,200);assert.strictEqual(j.readOnly,true);assert.strictEqual(hk.ns('vg-hk-inventario').get('vg_hk_inventario_v1').campanhas.length,1);

  const ab=loadEsmFunction('netlify/functions/custos-ab-store.js',{'vg-dashboard-operacoes':authSeed,'vg-custos-ab':{previsoes:{'2026-10':{ano:2026,mes:10,porHotel:{'VG Opera':100,'VG Estoril':200}}},regioes:{'VG Opera':'Lisboa & Ilhas'}}});
  r=await ab.handler(req('POST','https://x/api/shared',dirTok,{action:'get',key:'previsoes'}));j=await r.json();assert.strictEqual(r.status,200);assert.deepStrictEqual(Object.keys(j.data['2026-10'].porHotel),['VG Opera'],'previsões são filtradas por hotel no servidor');
  r=await ab.handler(req('POST','https://x/api/shared',dirTok,{action:'set',key:'previsoes',data:{'2026-10':{ano:2026,mes:10,porHotel:{'VG Opera':150,'VG Estoril':999}}}}));assert.strictEqual(r.status,200);stored=ab.ns('vg-custos-ab').get('previsoes');assert.strictEqual(stored['2026-10'].porHotel['VG Opera'],150);assert.strictEqual(stored['2026-10'].porHotel['VG Estoril'],200,'previsão de outro hotel é preservada');
  r=await ab.handler(req('POST','https://x/api/shared',dirTok,{action:'set',key:'regioes',data:{x:1}}));assert.strictEqual(r.status,403,'Diretor não publica configuração global A&B');
  r=await ab.handler(req('POST','https://x/api/shared',buyTok,{action:'set',key:'regioes',data:{'VG Opera':'Lisboa & Ilhas'}}));assert.strictEqual(r.status,200,'Compras pode publicar configuração A&B');
  console.log('✓ V35.3 runtime: permissões server-side HK/A&B validadas por hotel e perfil');
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
