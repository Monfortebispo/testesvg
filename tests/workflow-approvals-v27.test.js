const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const cp=require('child_process');
const {ROOT,createSandbox,load}=require('./helpers/browser-sandbox');

const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(ROOT,'service-worker.js'),'utf8');
const serverPath=path.join(ROOT,'netlify/functions/dashboard-sessao.js');
const server=fs.readFileSync(serverPath,'utf8');
const search=fs.readFileSync(path.join(ROOT,'assets/js/ui/global-search.js'),'utf8');
const mobile=fs.readFileSync(path.join(ROOT,'assets/js/ui/mobile-pwa.js'),'utf8');
const notifications=fs.readFileSync(path.join(ROOT,'assets/js/ui/notifications-v21.js'),'utf8');
const documents=fs.readFileSync(path.join(ROOT,'assets/js/modules/document-management-v26.js'),'utf8');
const jsPath=path.join(ROOT,'assets/js/modules/workflow-approvals-v27.js');

cp.execFileSync(process.execPath,['--check',jsPath],{stdio:'pipe'});
cp.execFileSync(process.execPath,['--check',serverPath],{stdio:'pipe'});

assert(html.includes('Workflow de Aprovações')&&html.includes('workflow-approvals-v27.js')&&html.includes('workflow-approvals-v27.css'),'V27 deve estar ligada ao HTML');
assert(sw.includes('vg-operations-shell-v32')&&sw.includes('workflow-approvals-v27.js')&&sw.includes('workflow-approvals-v27.css'),'PWA deve incluir shell V27');
assert(server.includes('APPROVAL_PREFIX = "ops-approval/"')&&server.includes('resource === "ops-approval-save"')&&server.includes('resource === "ops-approval-decide"'),'backend deve ter endpoints próprios de aprovação');
assert(server.includes('"ops-approval/"')&&server.includes('return "Aprovações"'),'Backup deve proteger aprovações');
assert(search.includes("type:'approval'")&&search.includes('buildApprovals(arr)'),'Pesquisa Global deve indexar aprovações');
assert(mobile.includes('data-view="approvals"'),'mobile deve expor Aprovações');
assert(notifications.includes("approval:{label:'Aprovações'")&&notifications.includes('buildApprovals(out,scope)'),'Notificações deve incluir aprovações');
assert(documents.includes("approval:'Pedido de Aprovação'"),'Documentos devem poder ligar-se a aprovações');

// API frontend mínima.
const s=createSandbox();
s.window.vgAuthCurrent=()=>({user:'dir27',name:'Diretor Ópera',role:'diretor',hotel:'OPERA'});
s.window.VG={util:{escapeHtml:v=>String(v)},events:{emit(){},on(){}},shared:{},actions:{all:()=>[]},agenda:{all:()=>[]},documents:{all:()=>[]}};s.VG=s.window.VG;s.document.readyState='loading';
load('assets/js/modules/workflow-approvals-v27.js',s);
assert.strictEqual(s.window.VG.approvals.version,27);
s.window.VG.approvals.state.rows=[{id:'a27',hotel:'OPERA',title:'Meta de ocupação setembro',type:'target',priority:'high',status:'pending',requesterUser:'dir27',requesterName:'Diretor Ópera',updatedAt:new Date().toISOString()}];
assert.strictEqual(s.window.VG.approvals.searchItems()[0].title,'Meta de ocupação setembro');

function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function loadHandler(){
  const data=new Map();
  const store={
    async get(key,opts={}){const v=data.get(key);if(v===undefined)return null;if(opts.type==='text')return typeof v==='string'?v:JSON.stringify(v);if(opts.type==='json'){if(typeof v==='string'){try{return JSON.parse(v)}catch(e){return v}}return clone(v);}return clone(v);},
    async setJSON(key,value){data.set(key,clone(value));},
    async set(key,value){data.set(key,String(value));},
    async delete(key){data.delete(key);},
    async list(options={}){const prefix=String(options.prefix||'');return{blobs:[...data.keys()].filter(k=>String(k).startsWith(prefix)).map(key=>({key,etag:'e-'+key}))};}
  };
  const module={exports:{}};
  const sandbox={module,exports:module.exports,require(name){if(name==='@netlify/blobs')return{getStore(){return store},connectLambda(){}};if(name==='crypto')return require('crypto');return require(name);},Buffer,URL,URLSearchParams,TextEncoder:global.TextEncoder,console,process,Date,Math,Number,String,Object,Array,JSON,Promise,setTimeout,clearTimeout};
  vm.createContext(sandbox);vm.runInContext(server,sandbox,{filename:'dashboard-sessao.js'});return{handler:module.exports.handler,data};
}
function ev(method,resource,body,token,key,ip='7.7.7.7'){return{httpMethod:method,queryStringParameters:{resource,...(key!==undefined&&key!==null?{key:String(key)}:{})},headers:{...(token?{authorization:'Bearer '+token}:{}),'x-nf-client-connection-ip':ip},body:body===undefined?'':JSON.stringify(body),isBase64Encoded:false};}
async function call(handler,...args){const r=await handler(ev(...args));let json={};try{json=JSON.parse(r.body||'{}')}catch(e){}return{...r,json};}

(async()=>{
  const {handler,data}=loadHandler();
  data.set('users',{
    reviewer27:{user:'reviewer27',name:'Revisor Direção',pass:'Reviewer272027',role:'direcao',hotel:'*',active:true},
    admin27:{user:'admin27',name:'Outra Direção',pass:'Admin272027',role:'direcao',hotel:'*',active:true},
    dir27:{user:'dir27',name:'Diretor Ópera',pass:'Diretor272027',role:'diretor',hotel:'OPERA',active:true},
    est27:{user:'est27',name:'Diretor Estoril',pass:'Estoril272027',role:'diretor',hotel:'ESTORIL',active:true}
  });
  let r=await call(handler,'POST','auth-login',{user:'dir27',password:'Diretor272027'});assert.strictEqual(r.statusCode,200);const dir=r.json.token;
  r=await call(handler,'POST','auth-login',{user:'reviewer27',password:'Reviewer272027'},null,null,'7.7.7.8');assert.strictEqual(r.statusCode,200);const reviewer=r.json.token;
  r=await call(handler,'POST','auth-login',{user:'admin27',password:'Admin272027'},null,null,'7.7.7.9');assert.strictEqual(r.statusCode,200);const admin=r.json.token;
  r=await call(handler,'POST','auth-login',{user:'est27',password:'Estoril272027'},null,null,'7.7.7.10');assert.strictEqual(r.statusCode,200);const est=r.json.token;

  r=await call(handler,'POST','ops-approval-save',{hotel:'OPERA',title:'Alterar meta de ocupação',description:'Solicito validação da meta de setembro devido ao novo forecast.',type:'target',priority:'high',dueDate:'2027-08-25',approverUser:'reviewer27',linkType:'target',linkId:'Ocupação Setembro 2027'},dir);
  assert.strictEqual(r.statusCode,200,'Diretor deve poder submeter pedido no próprio hotel');const req=r.json.data;
  assert(req.id&&req.status==='pending'&&req.approverUser==='reviewer27'&&req.linkLabel.includes('Ocupação'));

  r=await call(handler,'POST','ops-approval-save',{hotel:'ESTORIL',title:'Pedido indevido',description:'Não deve ser possível criar noutro hotel.',type:'decision',priority:'normal',linkType:'hotel'},dir);
  assert.strictEqual(r.statusCode,403,'Diretor não cria pedido noutro hotel');

  r=await call(handler,'GET','ops-approvals',undefined,dir);assert.strictEqual(r.statusCode,200);assert(r.json.data.some(x=>x.id===req.id));
  r=await call(handler,'GET','ops-approvals',undefined,est);assert.strictEqual(r.statusCode,200);assert(!r.json.data.some(x=>x.id===req.id),'outro hotel não deve ver pedido');
  r=await call(handler,'POST','ops-approval/'+req.id,{status:'approved'},admin);assert.strictEqual(r.statusCode,403,'acesso direto ao blob deve ser bloqueado');

  // Atribuição explícita: outra Direção não pode decidir.
  r=await call(handler,'POST','ops-approval-decide',{id:req.id,expectedUpdatedAt:req.updatedAt,decision:'approve',note:'Aprovação por pessoa errada.'},admin);
  assert.strictEqual(r.statusCode,403);
  r=await call(handler,'POST','ops-approval-decide',{id:req.id,expectedUpdatedAt:req.updatedAt,decision:'approve',note:'Meta revista e coerente com o forecast validado.'},reviewer);
  assert.strictEqual(r.statusCode,200);const approved=r.json.data;assert.strictEqual(approved.status,'approved');assert.strictEqual(approved.decisionBy.user,'reviewer27');

  // Documento pode ser associado a uma aprovação.
  const content=Buffer.from('evidencia-aprovacao').toString('base64');
  r=await call(handler,'POST','ops-document-save',{hotel:'OPERA',title:'Evidência da decisão',category:'evidence',linkType:'approval',linkId:req.id,fileName:'evidencia.txt',mime:'text/plain',size:Buffer.from('evidencia-aprovacao').length,contentBase64:content},dir);
  assert.strictEqual(r.statusCode,200);assert(r.json.data.linkLabel.includes('Alterar meta de ocupação'));

  // Conflito de edição.
  r=await call(handler,'POST','ops-approval-save',{hotel:'OPERA',title:'Nova exceção',description:'Pedido temporário para testar concorrência.',type:'exception',priority:'normal',linkType:'hotel'},dir);
  assert.strictEqual(r.statusCode,200);const req2=r.json.data;
  r=await call(handler,'POST','ops-approval-save',{id:req2.id,expectedUpdatedAt:req2.updatedAt,hotel:'OPERA',title:'Nova exceção atualizada',description:'Pedido atualizado com informação adicional.',type:'exception',priority:'high',linkType:'hotel'},dir);
  assert.strictEqual(r.statusCode,200);const req2b=r.json.data;
  r=await call(handler,'POST','ops-approval-save',{id:req2.id,expectedUpdatedAt:req2.updatedAt,hotel:'OPERA',title:'Versão antiga',description:'Tentativa com versão antiga.',type:'exception',priority:'normal',linkType:'hotel'},dir);
  assert.strictEqual(r.statusCode,409,'edição concorrente deve ser rejeitada');

  // Cancelamento pelo requerente.
  r=await call(handler,'POST','ops-approval-cancel',{id:req2.id,expectedUpdatedAt:req2b.updatedAt},dir);assert.strictEqual(r.statusCode,200);assert.strictEqual(r.json.data.status,'cancelled');

  // Autoaprovação da Direção só com exceção explícita e justificação longa.
  r=await call(handler,'POST','ops-approval-save',{hotel:'OPERA',title:'Decisão excecional da Direção',description:'Pedido criado pela própria Direção para testar segregação.',type:'decision',priority:'critical',linkType:'hotel'},reviewer);
  assert.strictEqual(r.statusCode,200);const self=r.json.data;
  r=await call(handler,'POST','ops-approval-decide',{id:self.id,expectedUpdatedAt:self.updatedAt,decision:'approve',note:'Curta'},reviewer);assert.strictEqual(r.statusCode,403);
  r=await call(handler,'POST','ops-approval-decide',{id:self.id,expectedUpdatedAt:self.updatedAt,decision:'approve',note:'Aprovação excecional documentada por inexistência de outro aprovador disponível.',overrideSelf:true},reviewer);
  assert.strictEqual(r.statusCode,200);assert.strictEqual(r.json.data.selfApprovalException,true);

  // Backup deve incluir aprovações.
  r=await call(handler,'POST','recovery-create',{note:'Workflow V27'},admin);assert.strictEqual(r.statusCode,200);
  const manifest=data.get('_recovery-snapshot/'+r.json.data.id);assert(manifest.entries.some(x=>String(x.key).startsWith('ops-approval/')),'backup deve incluir aprovações');assert.strictEqual(manifest.appVersion,'29');

  const audit=[...data.entries()].filter(([k])=>String(k).startsWith('_audit-event/')).map(([,v])=>typeof v==='string'?JSON.parse(v):v);
  assert(audit.some(x=>x.category==='Aprovações'&&x.action==='Pedido de aprovação submetido'));
  assert(audit.some(x=>x.category==='Aprovações'&&x.action==='Pedido aprovado'));
  assert(audit.some(x=>x.selfApprovalException===true||x.after?.selfApprovalException===true||String(x.detail||'').includes('APROVAÇÃO EXCECIONAL')),'autoaprovação excecional deve ficar destacada na auditoria');

  console.log('✓ workflow v27: submissão, âmbito, aprovador, decisão, concorrência, autoaprovação excecional, documentos, auditoria e backup');
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
