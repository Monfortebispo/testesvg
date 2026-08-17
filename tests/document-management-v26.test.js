const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const cp=require('child_process');
const {ROOT,createSandbox,load}=require('./helpers/browser-sandbox');

const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(ROOT,'service-worker.js'),'utf8');
const jsPath=path.join(ROOT,'assets/js/modules/document-management-v26.js');
const serverPath=path.join(ROOT,'netlify/functions/dashboard-sessao.js');
const server=fs.readFileSync(serverPath,'utf8');
const search=fs.readFileSync(path.join(ROOT,'assets/js/ui/global-search.js'),'utf8');
const mobile=fs.readFileSync(path.join(ROOT,'assets/js/ui/mobile-pwa.js'),'utf8');
cp.execFileSync(process.execPath,['--check',jsPath],{stdio:'pipe'});
cp.execFileSync(process.execPath,['--check',serverPath],{stdio:'pipe'});
assert(html.includes('Gestão de Documentos')&&html.includes('document-management-v26.js')&&html.includes('document-management-v26.css'),'V26 deve estar ligada ao HTML');
assert(sw.includes('vg-operations-shell-v32')&&sw.includes('document-management-v26.js')&&sw.includes('document-management-v26.css'),'PWA deve incluir shell V26');
assert(server.includes('DOCUMENT_META_PREFIX = "ops-doc-meta/"')&&server.includes('resource === "ops-document-save"')&&server.includes('resource === "ops-document-file"')&&server.includes('resource === "ops-document-content"'),'backend deve ter endpoints próprios e download binário de documentos');
assert(server.includes('"ops-doc-meta/","ops-doc-data/"')&&server.includes('return "Documentos"'),'Backup deve proteger metadados e conteúdo dos documentos');
assert(search.includes("type:'document'")&&search.includes('buildDocuments(arr)'),'Pesquisa Global deve indexar documentos');
assert(mobile.includes('data-view="documents"'),'mobile deve expor Gestão de Documentos');

// API frontend básica e âmbito local.
const s=createSandbox();
s.window.vgAuthCurrent=()=>({user:'dir_opera',name:'Diretor Ópera',role:'diretor',hotel:'OPERA'});
s.window.VG={util:{escapeHtml:v=>String(v)},events:{emit(){},on(){}},shared:{},actions:{all:()=>[]},agenda:{all:()=>[]}};s.VG=s.window.VG;s.document.readyState='loading';
load('assets/js/modules/document-management-v26.js',s);
assert(s.window.VG.documents.version>=26.2);
assert(s.window.VG.documents.maxFileBytes>=3*1024*1024&&s.window.VG.documents.maxFileBytes<4*1024*1024);
s.window.VG.documents.state.rows=[{id:'d1',hotel:'OPERA',title:'Auditoria HACCP',category:'audit',linkType:'hotel',fileName:'haccp.pdf',size:100,updatedAt:new Date().toISOString()}];
assert.strictEqual(s.window.VG.documents.searchItems()[0].title,'Auditoria HACCP');

function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function loadHandler(){
  const data=new Map();
  const store={
    async get(key,opts={}){const v=data.get(key);if(v===undefined)return null;if(opts.type==='text')return typeof v==='string'?v:JSON.stringify(v);if(opts.type==='json'){if(typeof v==='string'){try{return JSON.parse(v)}catch(e){return v}}return clone(v);}return clone(v);},
    async setJSON(key,value){data.set(key,clone(value));},async set(key,value){data.set(key,String(value));},async delete(key){data.delete(key);},
    async list(options={}){const prefix=String(options.prefix||'');return{blobs:[...data.keys()].filter(k=>String(k).startsWith(prefix)).map(key=>({key,etag:'e-'+key}))};}
  };
  const module={exports:{}};const sandbox={module,exports:module.exports,require(name){if(name==='@netlify/blobs')return{getStore(){return store},connectLambda(){}};if(name==='crypto')return require('crypto');return require(name);},Buffer,URL,URLSearchParams,TextEncoder:global.TextEncoder,console,process,Date,Math,Number,String,Object,Array,JSON,Promise,setTimeout,clearTimeout};
  vm.createContext(sandbox);vm.runInContext(server,sandbox,{filename:'dashboard-sessao.js'});return{handler:module.exports.handler,data};
}
function ev(method,resource,body,token,key,ip='5.5.5.5'){return{httpMethod:method,queryStringParameters:{resource,...(key!==undefined&&key!==null?{key:String(key)}:{})},headers:{...(token?{authorization:'Bearer '+token}:{}),'x-nf-client-connection-ip':ip},body:body===undefined?'':JSON.stringify(body),isBase64Encoded:false};}
async function call(handler,...args){const r=await handler(ev(...args));let json={};try{json=JSON.parse(r.body||'{}')}catch(e){}return{...r,json};}

(async()=>{
  const {handler,data}=loadHandler();
  data.set('users',{
    admin26:{user:'admin26',name:'Admin V26',pass:'AdminDocs2027',role:'direcao',hotel:'*',active:true},
    dir26:{user:'dir26',name:'Diretor Ópera',pass:'DiretorDocs2027',role:'diretor',hotel:'OPERA',active:true},
    est26:{user:'est26',name:'Diretor Estoril',pass:'EstorilDocs2027',role:'diretor',hotel:'ESTORIL',active:true}
  });
  let r=await call(handler,'POST','auth-login',{user:'admin26',password:'AdminDocs2027'});assert.strictEqual(r.statusCode,200);const admin=r.json.token;
  r=await call(handler,'POST','auth-login',{user:'dir26',password:'DiretorDocs2027'},null,null,'5.5.5.6');assert.strictEqual(r.statusCode,200);const dir=r.json.token;

  // V35.2: ficha de hotel totalmente editável e partilhada
  r=await call(handler,'POST','ops-hotel-profile-save',{key:'VG Opera',hotel:'Hotel Vila Galé Ópera',data:{nome:'Hotel Vila Galé Ópera',estrelas:4,morada:'Rua teste',contacts:[{role:'Director',nome:'Teste'}],rests:[{nome:'Restaurante',cap:100}],distances:[{label:'Aeroporto',val:'10 km'}]},static:{regiao:'Lisboa & Ilhas',url:'https://example.test'}},dir);
  assert.strictEqual(r.statusCode,200,'Diretor deve editar a ficha do próprio hotel mesmo com nome completo');
  r=await call(handler,'GET','ops-hotel-profiles',undefined,dir);assert.strictEqual(r.statusCode,200);assert(r.json.data.some(x=>x.key==='VG Opera'&&x.data.contacts[0].nome==='Teste'));
  r=await call(handler,'POST','ops-hotel-profile-save',{key:'VG Estoril',hotel:'Hotel Vila Galé Estoril',data:{nome:'Hotel Vila Galé Estoril'},static:{}},dir);assert.strictEqual(r.statusCode,403,'Diretor não deve editar outro hotel');

  // criar ação que será associada ao documento
  r=await call(handler,'POST','ops-action-save',{hotel:'OPERA',sourceKey:'v26',sourceTitle:'Fechar auditoria',sourceType:'operational',ownerUser:'dir26',dueDate:'2027-08-25',status:'open'},dir);assert.strictEqual(r.statusCode,200);const action=r.json.data;
  const content=Buffer.from('conteudo-pdf-simulado').toString('base64');
  r=await call(handler,'POST','ops-document-save',{hotel:'OPERA',title:'Relatório Auditoria',category:'audit',linkType:'action',linkId:action.id,tags:'HACCP, agosto',description:'Relatório final',fileName:'auditoria.pdf',mime:'application/pdf',size:Buffer.from('conteudo-pdf-simulado').length,contentBase64:content},dir);
  assert.strictEqual(r.statusCode,200,'Diretor pode adicionar documento ao próprio hotel');const doc=r.json.data;assert(doc.id&&doc.linkLabel.includes('Fechar auditoria'));assert(data.has('ops-doc-meta/'+doc.id)&&data.has('ops-doc-data/'+doc.id));

  r=await call(handler,'POST','ops-document-save',{hotel:'ESTORIL',title:'Indevido',category:'report',linkType:'hotel',fileName:'x.pdf',mime:'application/pdf',size:1,contentBase64:Buffer.from('x').toString('base64')},dir);
  assert.strictEqual(r.statusCode,403,'Diretor não adiciona documentos noutro hotel');
  r=await call(handler,'POST','ops-document-save',{hotel:'OPERA',title:'Executável',category:'other',linkType:'hotel',fileName:'malware.exe',mime:'application/octet-stream',size:1,contentBase64:Buffer.from('x').toString('base64')},dir);
  assert.strictEqual(r.statusCode,400,'formatos executáveis devem ser rejeitados');

  r=await call(handler,'GET','ops-documents',undefined,dir);assert.strictEqual(r.statusCode,200);assert(r.json.data.some(x=>x.id===doc.id));
  r=await call(handler,'GET','ops-document-file',undefined,dir,doc.id);assert.strictEqual(r.statusCode,200);assert.strictEqual(r.json.data.contentBase64,content);
  r=await call(handler,'GET','ops-document-content',undefined,dir,doc.id);assert.strictEqual(r.statusCode,200);assert.strictEqual(r.isBase64Encoded,true);assert.strictEqual(Buffer.from(r.body,'base64').toString(),'conteudo-pdf-simulado');
  r=await call(handler,'POST','ops-doc-meta/'+doc.id,{title:'contorno'},admin);assert.strictEqual(r.statusCode,403,'não deve ser possível contornar auditoria por acesso direto ao blob');

  // concorrência e atualização sem substituir ficheiro
  r=await call(handler,'POST','ops-document-save',{id:doc.id,expectedUpdatedAt:doc.updatedAt,hotel:'OPERA',title:'Relatório Auditoria Final',category:'audit',linkType:'action',linkId:action.id,tags:'HACCP'},dir);assert.strictEqual(r.statusCode,200);const updated=r.json.data;assert.strictEqual(data.get('ops-doc-data/'+doc.id),content,'editar metadados não apaga o ficheiro');
  r=await call(handler,'POST','ops-document-save',{id:doc.id,expectedUpdatedAt:doc.updatedAt,hotel:'OPERA',title:'Conflito',category:'audit',linkType:'action',linkId:action.id},dir);assert.strictEqual(r.statusCode,409,'edição concorrente deve ser rejeitada');

  r=await call(handler,'POST','recovery-create',{note:'Documentos V26'},admin);assert.strictEqual(r.statusCode,200);const manifest=data.get('_recovery-snapshot/'+r.json.data.id);assert(manifest.entries.some(x=>String(x.key).startsWith('ops-doc-meta/'))&&manifest.entries.some(x=>String(x.key).startsWith('ops-doc-data/')),'backup deve incluir documento e metadados');

  r=await call(handler,'POST','ops-document-delete',{id:doc.id,expectedUpdatedAt:updated.updatedAt},dir);assert.strictEqual(r.statusCode,200);assert(!data.has('ops-doc-meta/'+doc.id)&&!data.has('ops-doc-data/'+doc.id));
  const audit=[...data.entries()].filter(([k])=>String(k).startsWith('_audit-event/')).map(([,v])=>typeof v==='string'?JSON.parse(v):v);
  assert(audit.some(x=>x.category==='Documentos'&&x.action==='Documento adicionado'));assert(audit.some(x=>x.category==='Documentos'&&x.action==='Documento eliminado'));
  console.log('✓ documentos v26: upload seguro, associações, permissões, concorrência, pesquisa, auditoria e backup');
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
