const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const cp=require('child_process');
const {ROOT,createSandbox,load}=require('./helpers/browser-sandbox');

const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(ROOT,'service-worker.js'),'utf8');
const jsPath=path.join(ROOT,'assets/js/modules/operational-agenda-v22.js');
const cssPath=path.join(ROOT,'assets/css/operational-agenda-v22.css');
const serverPath=path.join(ROOT,'netlify/functions/dashboard-sessao.js');
const server=fs.readFileSync(serverPath,'utf8');
const notifications=fs.readFileSync(path.join(ROOT,'assets/js/ui/notifications-v21.js'),'utf8');
const search=fs.readFileSync(path.join(ROOT,'assets/js/ui/global-search.js'),'utf8');
const mobile=fs.readFileSync(path.join(ROOT,'assets/js/ui/mobile-pwa.js'),'utf8');
cp.execFileSync(process.execPath,['--check',jsPath],{stdio:'pipe'});
cp.execFileSync(process.execPath,['--check',serverPath],{stdio:'pipe'});
assert(html.includes('Agenda Operacional')&&html.includes('operational-agenda-v22.js')&&html.includes('operational-agenda-v22.css'),'V22 deve estar ligada à Agenda');
assert(sw.includes('vg-operations-shell-v32')&&sw.includes('/assets/js/modules/operational-agenda-v22.js')&&sw.includes('/assets/css/operational-agenda-v22.css'),'PWA deve incluir shell estático da Agenda V22');
assert(server.includes('AGENDA_PREFIX = "ops-agenda/"')&&server.includes('resource === "ops-agenda-save"')&&server.includes('resource === "ops-agenda-delete"'),'backend deve ter endpoints próprios da Agenda');
assert(server.includes('"ops-agenda/"')&&server.includes('return "Agenda"'),'Backup V17 deve passar a proteger eventos da Agenda');
assert(notifications.includes("agenda:{label:'Agenda'")&&notifications.includes('function buildAgenda(out,scope)'),'Notificações V21 devem integrar compromissos V22 sem duplicar Ações');
assert(search.includes("['agenda','Agenda']")&&search.includes("type:'event'"),'Pesquisa Global deve indexar eventos da Agenda');
assert(mobile.includes('data-view="agenda"'),'mobile deve expor Agenda Operacional no menu de decisão');

// Modelo frontend: ações com prazo entram automaticamente e um Diretor só vê o âmbito autorizado.
const s=createSandbox();
s.window.vgAuthCurrent=()=>({user:'dir_opera',name:'Diretor Ópera',role:'diretor',hotel:'OPERA'});
s.document.readyState='loading';
s.window.VG={
  util:{escapeHtml:v=>String(v)},events:{on(){},emit(){}},shared:{},
  actions:{all:()=>[
    {id:'a1',hotel:'OPERA',sourceTitle:'Fechar provisão',status:'open',dueDate:'2000-01-01',ownerUser:'dir_opera',ownerName:'Diretor Ópera'},
    {id:'a2',hotel:'ESTORIL',sourceTitle:'Outro hotel',status:'open',dueDate:'2999-01-01',ownerUser:'outro',ownerName:'Outro'}
  ]}
};s.VG=s.window.VG;
load('assets/js/modules/operational-agenda-v22.js',s);
s.window.VG.agenda.state.manual=[
  {id:'e1',hotel:'OPERA',title:'Auditoria Compras',type:'audit',date:'2999-05-10',ownerUser:'dir_opera',ownerName:'Diretor Ópera'},
  {id:'e2',hotel:'ESTORIL',title:'Visita Estoril',type:'visit',date:'2999-05-11',ownerUser:'outro'}
];
const model=s.window.VG.agenda.buildModel();
assert(model.rows.some(x=>x.id==='action:a1'&&x.type==='action'),'prazo de ação deve entrar automaticamente');
assert(model.rows.some(x=>x.id==='e1'),'evento manual do próprio hotel deve entrar');
assert(!model.rows.some(x=>x.id==='e2'||x.id==='action:a2'),'Diretor não deve ver eventos não atribuídos de outro hotel');
assert(model.stats.overdue>=1,'ação ativa vencida deve contar como atrasada');
assert.strictEqual(s.window.VG.agenda.canCreateHotel('OPERA'),true);
assert.strictEqual(s.window.VG.agenda.canCreateHotel('ESTORIL'),false);

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
function ev(method,resource,body,token,key,ip='3.3.3.3'){return{httpMethod:method,queryStringParameters:{resource,...(key!==undefined?{key:String(key)}:{})},headers:{...(token?{authorization:'Bearer '+token}:{}),'x-nf-client-connection-ip':ip},body:body===undefined?'':JSON.stringify(body),isBase64Encoded:false};}
async function call(handler,...args){const r=await handler(ev(...args));let json={};try{json=JSON.parse(r.body||'{}')}catch(e){}return{...r,json};}

(async()=>{
  const {handler,data}=loadHandler();
  data.set('users',{
    admin22:{user:'admin22',name:'Admin V22',pass:'AdminAgenda2027',role:'direcao',hotel:'*',active:true},
    dir22:{user:'dir22',name:'Diretor Ópera',pass:'DiretorAgenda2027',role:'diretor',hotel:'OPERA',active:true},
    est22:{user:'est22',name:'Diretor Estoril',pass:'EstorilAgenda2027',role:'diretor',hotel:'ESTORIL',active:true}
  });
  let r=await call(handler,'POST','auth-login',{user:'admin22',password:'AdminAgenda2027'});assert.strictEqual(r.statusCode,200);const admin=r.json.token;
  r=await call(handler,'POST','auth-login',{user:'dir22',password:'DiretorAgenda2027'},null,null,'3.3.3.4');assert.strictEqual(r.statusCode,200);const dir=r.json.token;

  r=await call(handler,'POST','ops-agenda-save',{hotel:'OPERA',title:'Auditoria Compras',type:'audit',date:'2027-08-20',startTime:'10:00',endTime:'12:00',ownerUser:'dir22',notes:'Validar armazém.'},dir);
  assert.strictEqual(r.statusCode,200,'Diretor pode criar evento no próprio hotel');const own=r.json.data;assert(own.id&&own.history.some(x=>x.type==='created'));
  r=await call(handler,'POST','ops-agenda-save',{hotel:'ESTORIL',title:'Visita indevida',type:'visit',date:'2027-08-21'},dir);
  assert.strictEqual(r.statusCode,403,'Diretor não cria evento noutro hotel');

  r=await call(handler,'POST','ops-agenda-save',{hotel:'ESTORIL',title:'Reunião Regional',type:'meeting',date:'2027-08-22',startTime:'15:00',ownerUser:'dir22'},admin);
  assert.strictEqual(r.statusCode,200);const assigned=r.json.data;
  r=await call(handler,'GET','ops-agenda',undefined,dir);assert.strictEqual(r.statusCode,200);
  assert(r.json.data.some(x=>x.id===own.id),'Diretor vê evento do próprio hotel');
  assert(r.json.data.some(x=>x.id===assigned.id),'Diretor vê evento de outro hotel quando está atribuído');

  const old=assigned.updatedAt;
  r=await call(handler,'POST','ops-agenda-save',{id:assigned.id,expectedUpdatedAt:old,hotel:'ESTORIL',title:'Reunião Regional',type:'meeting',date:'2027-08-22',startTime:'16:00',ownerUser:'dir22'},dir);
  assert.strictEqual(r.statusCode,200,'responsável pode atualizar evento atribuído');const updated=r.json.data;
  r=await call(handler,'POST','ops-agenda-save',{id:assigned.id,expectedUpdatedAt:updated.updatedAt,hotel:'CASCAIS',title:'Mover evento',type:'meeting',date:'2027-08-22',ownerUser:'dir22'},dir);
  assert.strictEqual(r.statusCode,403,'responsável fora do hotel não pode transferir o evento para outra unidade');
  r=await call(handler,'POST','ops-agenda-save',{id:assigned.id,expectedUpdatedAt:old,hotel:'ESTORIL',title:'Conflito',type:'meeting',date:'2027-08-22',ownerUser:'dir22'},dir);
  assert.strictEqual(r.statusCode,409,'edição concorrente deve ser rejeitada');
  r=await call(handler,'POST','ops-agenda/'+own.id,{title:'contorno'},admin);assert.strictEqual(r.statusCode,403,'não é permitido contornar o histórico escrevendo diretamente no blob');

  r=await call(handler,'POST','recovery-create',{note:'Agenda V22'},admin);assert.strictEqual(r.statusCode,200);
  const manifest=data.get('_recovery-snapshot/'+r.json.data.id);assert(manifest.entries.some(x=>String(x.key).startsWith('ops-agenda/')),'backup deve incluir Agenda Operacional');

  r=await call(handler,'POST','ops-agenda-delete',{id:own.id,expectedUpdatedAt:own.updatedAt},dir);assert.strictEqual(r.statusCode,200,'Diretor pode eliminar evento do próprio hotel');
  assert(!data.has('ops-agenda/'+own.id));
  const audit=[...data.entries()].filter(([k])=>String(k).startsWith('_audit-event/')).map(([,v])=>typeof v==='string'?JSON.parse(v):v);
  assert(audit.some(x=>x.category==='Agenda'&&x.action==='Evento operacional criado'));
  assert(audit.some(x=>x.category==='Agenda'&&x.action==='Evento operacional eliminado'));
  console.log('✓ agenda v22: calendário unificado, ações derivadas, permissões, concorrência, auditoria e backup');
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
