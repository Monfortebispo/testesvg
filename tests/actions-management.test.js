const assert = require('assert');
const { createSandbox, load } = require('./helpers/browser-sandbox');

(async()=>{
  const rows=[
    {id:'a1',hotel:'OPERA',sourceKey:'s1',sourceTitle:'GOP baixo',status:'progress',ownerUser:'rsa',ownerName:'Ricardo Sá',dueDate:'2000-01-01',updatedAt:'2026-08-14T09:00:00Z'},
    {id:'a2',hotel:'ESTORIL',sourceKey:'s2',sourceTitle:'Ocupação',status:'open',ownerUser:'',ownerName:'',dueDate:'2999-01-01',updatedAt:'2026-08-14T08:00:00Z'},
    {id:'a3',hotel:'OPERA',sourceKey:'s3',sourceTitle:'Receita',status:'resolved',ownerUser:'rsa',ownerName:'Ricardo Sá',dueDate:'',resolvedAt:new Date().toISOString(),updatedAt:'2026-08-14T07:00:00Z'}
  ];
  const s=createSandbox();
  load('assets/js/core/00-runtime.js',s);
  s.window.vgAuthToken=()=> 'token';
  s.window.vgAuthCurrent=()=>({user:'pmonforte',name:'Pedro',role:'direcao',hotel:'*'});
  s.window.VG.shared={
    async get(resource){
      if(resource==='ops-actions')return {data:rows};
      if(resource==='assignees')return {data:[]};
      throw new Error('resource inesperado '+resource);
    },
    async post(){throw new Error('post não esperado');}
  };
  load('assets/js/modules/actions-management.js',s);
  await s.window.VG.actions.ensureLoaded(true);
  const st=s.window.VG.actions.stats(['OPERA','ESTORIL']);
  assert.strictEqual(st.open,2);
  assert.strictEqual(st.overdue,1);
  assert.strictEqual(st.unassigned,1);
  assert.strictEqual(st.progress,1);
  assert.strictEqual(st.resolvedWeek,1);
  assert.strictEqual(s.window.VG.actions.findForSource('s1').id,'a1');
  assert.strictEqual(s.window.VG.actions.watch(['OPERA','ESTORIL'],5)[0].id,'a1','fora do prazo deve aparecer primeiro');
  assert.strictEqual(s.window.VG.actions.canManage('ESTORIL'),true,'Direção pode gerir qualquer hotel');
  console.log('✓ ações: carregamento, estados, atrasos, responsáveis e prioridades');
})().catch(err=>{console.error(err.stack||err);process.exit(1);});
