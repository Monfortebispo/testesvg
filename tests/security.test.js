const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { ROOT } = require('./helpers/browser-sandbox');

function clone(v){ return v == null ? v : JSON.parse(JSON.stringify(v)); }
function loadHandler(){
  const data = new Map();
  const store = {
    async get(key){ return clone(data.get(key)); },
    async setJSON(key, value){ data.set(key, clone(value)); },
    async list(options={}){ const prefix=String(options.prefix||''); return {blobs:[...data.keys()].filter(k=>String(k).startsWith(prefix)).map(key=>({key,etag:'test'}))}; }
  };
  const blobs = { getStore(){ return store; }, connectLambda(){} };
  const module = { exports: {} };
  const sandbox = {
    module, exports: module.exports,
    require(name){
      if (name === '@netlify/blobs') return blobs;
      if (name === 'crypto') return require('crypto');
      return require(name);
    },
    Buffer, URL, URLSearchParams, TextEncoder: global.TextEncoder,
    console, process, Date, Math, Number, String, Object, Array, JSON, Promise,
    setTimeout, clearTimeout
  };
  vm.createContext(sandbox);
  const src = fs.readFileSync(path.join(ROOT,'netlify/functions/dashboard-sessao.js'),'utf8');
  vm.runInContext(src, sandbox, { filename: 'dashboard-sessao.js' });
  return { handler: module.exports.handler, data };
}
function event(method, resource, body, token, key, ip='1.1.1.1'){
  return {
    httpMethod: method,
    queryStringParameters: { resource, ...(key !== undefined ? { key: String(key) } : {}) },
    headers: { ...(token ? { authorization: 'Bearer ' + token } : {}), 'x-nf-client-connection-ip': ip },
    body: body === undefined ? '' : JSON.stringify(body),
    isBase64Encoded: false
  };
}
async function call(handler, ...args){
  const r = await handler(event(...args));
  let json = {}; try { json = JSON.parse(r.body || '{}'); } catch(e) {}
  return { ...r, json };
}

(async()=>{
  const { handler, data } = loadHandler();
  // Contas exclusivamente sintéticas. A suite nunca depende de passwords reais/seed do projeto.
  data.set('users', {
    test_admin: { user:'test_admin', name:'Admin Teste', pass:'AdminTeste2027', role:'direcao', hotel:'*', active:true },
    test_dir: { user:'test_dir', name:'Diretor Teste', pass:'DiretorTeste2027', role:'diretor', hotel:'OPERA', active:true }
  });

  let r = await call(handler,'GET','index');
  assert.strictEqual(r.statusCode,401,'dados partilhados exigem autenticação');

  r = await call(handler,'POST','auth-login',{user:'test_admin',password:'AdminTeste2027'},null,null,'10.0.0.1');
  assert.strictEqual(r.statusCode,200);
  const oldAdminToken = r.json.token;
  assert(oldAdminToken);
  assert.strictEqual(r.json.user.role,'direcao');
  assert(!('passwordHash' in r.json.user));

  r = await call(handler,'GET','_auth-secret-v1',undefined,oldAdminToken);
  assert.strictEqual(r.statusCode,403,'blobs internos nunca podem sair pela API genérica');

  r = await call(handler,'GET','users',undefined,oldAdminToken);
  assert.strictEqual(r.statusCode,200);
  assert(!('passwordHash' in r.json.data.test_admin));
  assert(!('passwordSalt' in r.json.data.test_admin));
  assert(!('pass' in r.json.data.test_admin));
  assert(data.get('users').test_admin.passwordHash,'password antiga deve ser migrada para scrypt no Blob simulado');

  r = await call(handler,'POST','auth-change-password',{oldPassword:'AdminTeste2027',newPassword:'VGsecure2027'},oldAdminToken);
  assert.strictEqual(r.statusCode,200);
  const adminToken = r.json.token;
  r = await call(handler,'GET','index',undefined,oldAdminToken);
  assert.strictEqual(r.statusCode,401,'alterar password deve revogar a sessão antiga');
  r = await call(handler,'GET','index',undefined,adminToken);
  assert.strictEqual(r.statusCode,200);

  r = await call(handler,'POST','auth-login',{user:'test_dir',password:'DiretorTeste2027'},null,null,'10.0.0.2');
  assert.strictEqual(r.statusCode,200);
  const directorToken = r.json.token;
  assert.strictEqual(r.json.user.hotel,'OPERA');
  r = await call(handler,'GET','users',undefined,directorToken);
  assert.strictEqual(r.statusCode,403);
  r = await call(handler,'POST','settings',{x:1},directorToken,'regions');
  assert.strictEqual(r.statusCode,403);
  r = await call(handler,'POST','targets-rules',{rules:{gop_low:{enabled:true,value:25,severity:'red'}}},directorToken);
  assert.strictEqual(r.statusCode,403,'Diretor não pode alterar Metas & Regras globais');
  r = await call(handler,'POST','hotelsheet',{comment:'ok'},directorToken,'OPERA');
  assert.strictEqual(r.statusCode,200);
  r = await call(handler,'POST','hotelsheet',{comment:'não'},directorToken,'ESTORIL');
  assert.strictEqual(r.statusCode,403);
  r = await call(handler,'POST','mes',{x:1},directorToken,'7');
  assert.strictEqual(r.statusCode,403);

  // v8 — ações operacionais: listagem, permissões por hotel, atribuição e histórico no servidor.
  r = await call(handler,'GET','assignees',undefined,directorToken);
  assert.strictEqual(r.statusCode,200);
  assert(Array.isArray(r.json.data));
  assert(r.json.data.some(x=>x.user==='test_dir'));
  assert(!('passwordHash' in r.json.data[0]));

  r = await call(handler,'POST','ops-action-save',{
    hotel:'OPERA',sourceKey:'central|2027|8|OPERA|op:gop_low',sourceTitle:'Margem GOP baixa',sourceType:'operational',
    sourceReasons:['GOP < 20%'],severity:'red',ownerUser:'test_dir',dueDate:'2027-08-20',status:'progress',comment:'Plano iniciado.'
  },directorToken);
  assert.strictEqual(r.statusCode,200,'Diretor pode criar ação no próprio hotel');
  const actionId=r.json.data.id;
  assert(actionId);
  assert.strictEqual(r.json.data.ownerUser,'test_dir');
  assert(r.json.data.history.some(h=>h.type==='created'));
  assert(r.json.data.history.some(h=>h.type==='comment'&&h.user==='test_dir'));

  r = await call(handler,'POST','ops-action-save',{hotel:'ESTORIL',sourceKey:'x',sourceTitle:'Teste',status:'open'},directorToken);
  assert.strictEqual(r.statusCode,403,'Diretor não pode criar ação noutro hotel');

  r = await call(handler,'GET','ops-actions',undefined,directorToken);
  assert.strictEqual(r.statusCode,200);
  assert(r.json.data.some(a=>a.id===actionId));
  const current=r.json.data.find(a=>a.id===actionId);
  r = await call(handler,'POST','ops-action/'+actionId,{status:'resolved'},adminToken);
  assert.strictEqual(r.statusCode,403,'nem a Direção pode contornar o histórico escrevendo diretamente no blob da ação');
  r = await call(handler,'POST','ops-action-save',{
    id:actionId,expectedUpdatedAt:current.updatedAt,hotel:'OPERA',ownerUser:'test_dir',dueDate:'2027-08-21',status:'resolved',comment:'Concluído.'
  },directorToken);
  assert.strictEqual(r.statusCode,200);
  assert.strictEqual(r.json.data.status,'resolved');
  assert(r.json.data.resolvedAt);
  assert(r.json.data.history.some(h=>h.detail==='Concluído.'));

  r = await call(handler,'POST','ops-action-save',{
    id:actionId,expectedUpdatedAt:current.updatedAt,hotel:'OPERA',ownerUser:'test_dir',dueDate:'2027-08-22',status:'progress'
  },directorToken);
  assert.strictEqual(r.statusCode,409,'edição desatualizada deve ser rejeitada para preservar histórico concorrente');

  r = await call(handler,'POST','ops-action-save',{
    hotel:'ESTORIL',sourceKey:'central|2027|8|ESTORIL|op:occ_low',sourceTitle:'Ocupação baixa',sourceType:'operational',
    ownerUser:'test_dir',dueDate:'2027-08-25',status:'open',comment:'Atribuída pela Direção.'
  },adminToken);
  assert.strictEqual(r.statusCode,200);
  const assignedAction=r.json.data;
  r = await call(handler,'POST','ops-action-save',{
    id:assignedAction.id,expectedUpdatedAt:assignedAction.updatedAt,hotel:'ESTORIL',ownerUser:'test_dir',dueDate:'2027-08-25',status:'progress',comment:'Assumi a ação.'
  },directorToken);
  assert.strictEqual(r.statusCode,200,'responsável atribuído pode atualizar a ação mesmo fora do seu hotel');

  r = await call(handler,'POST','settings',{regions:{}},adminToken,'regions');
  assert.strictEqual(r.statusCode,200,'Direção pode escrever configurações globais');
  r = await call(handler,'POST','targets-rules',{version:1,rules:{gop_low:{enabled:true,value:25,severity:'red'}},targets:{}},adminToken);
  assert.strictEqual(r.statusCode,200,'Direção pode escrever Metas & Regras');
  r = await call(handler,'GET','targets-rules',undefined,directorToken);
  assert.strictEqual(r.statusCode,200,'utilizadores autenticados podem ler Metas & Regras');
  assert.strictEqual(r.json.data.rules.gop_low.value,25);

  // v10 — Centro de Dados: qualquer utilizador autenticado pode registar o carregamento,
  // mas apenas a Direção pode consultar o snapshot anterior usado para rollback.
  r = await call(handler,'POST','data-import-record',{
    record:{source:'pnl_month',sourceName:'P&L mensal',category:'Financeiro',fileName:'PL_Julho.xlsx',scope:'Julho',status:'success',action:'import',metrics:{month:7,hotels:3},duplicate:true},
    backup:{source:'pnl_month',key:'7',payload:{hotel_list:['OPERA']},selected:[7]}
  },directorToken);
  assert.strictEqual(r.statusCode,200,'utilizador autenticado pode registar importação');
  const directorImportId=r.json.data.id;
  assert(directorImportId);
  assert.strictEqual(r.json.data.user,'test_dir','identidade do carregamento é imposta pelo servidor');
  assert.strictEqual(r.json.data.backupAvailable,false,'Diretor de hotel não grava snapshots globais');
  assert(r.json.data.backupReason);

  r = await call(handler,'POST','data-import-record',{
    record:{source:'pnl_month',sourceName:'P&L mensal',category:'Financeiro',fileName:'PL_Julho_Direcao.xlsx',scope:'Julho',status:'success',action:'import',metrics:{month:7,hotels:3}},
    backup:{source:'pnl_month',key:'7',payload:{hotel_list:['OPERA']},selected:[7]}
  },adminToken);
  assert.strictEqual(r.statusCode,200);
  const importId=r.json.data.id;
  assert.strictEqual(r.json.data.backupAvailable,true);
  r = await call(handler,'GET','data-import-history',undefined,directorToken);
  assert.strictEqual(r.statusCode,200);
  assert(r.json.data.some(x=>x.id===importId));
  r = await call(handler,'GET','data-import-backup',undefined,directorToken,importId);
  assert.strictEqual(r.statusCode,403,'Diretor não pode obter snapshot para rollback global');
  r = await call(handler,'GET','data-import-backup',undefined,adminToken,importId);
  assert.strictEqual(r.statusCode,200,'Direção pode obter snapshot anterior');
  assert.strictEqual(r.json.data.source,'pnl_month');
  r = await call(handler,'POST','data-import-record',{record:{source:'pnl_month',status:'success',action:'rollback'}},directorToken);
  assert.strictEqual(r.statusCode,403,'Diretor não pode registar rollback global');
  r = await call(handler,'POST','data-import-record',{record:{source:'fonte_invalida',status:'success'}},adminToken);
  assert.strictEqual(r.statusCode,400,'Centro de Dados rejeita fontes arbitrárias');

  r = await call(handler,'POST','audit',{user:'falso',name:'Falso',action:'TESTE'},directorToken);
  assert.strictEqual(r.statusCode,200);
  const audit = data.get('audit');
  assert.strictEqual(audit[0].user,'test_dir','identidade da auditoria é imposta pelo servidor');
  assert.notStrictEqual(audit[0].name,'Falso');

  r = await call(handler,'POST','user-toggle',{user:'test_dir'},adminToken);
  assert.strictEqual(r.statusCode,200);
  assert.strictEqual(r.json.user.active,false);
  r = await call(handler,'GET','index',undefined,directorToken);
  assert.strictEqual(r.statusCode,401,'inativar utilizador deve invalidar sessão existente');

  console.log('✓ segurança: autenticação, migração, revogação e permissões server-side');
})().catch(err => { console.error(err.stack || err); process.exit(1); });
