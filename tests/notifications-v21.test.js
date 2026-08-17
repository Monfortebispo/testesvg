const assert=require('assert');
const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const {ROOT,createSandbox,load}=require('./helpers/browser-sandbox');

const jsPath=path.join(ROOT,'assets/js/ui/notifications-v21.js');
const cssPath=path.join(ROOT,'assets/css/notifications-v21.css');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const js=fs.readFileSync(jsPath,'utf8');
const css=fs.readFileSync(cssPath,'utf8');
const sw=fs.readFileSync(path.join(ROOT,'service-worker.js'),'utf8');
const mobile=fs.readFileSync(path.join(ROOT,'assets/js/ui/mobile-pwa.js'),'utf8');
cp.execFileSync(process.execPath,['--check',jsPath],{stdio:'pipe'});

assert(html.includes('assets/js/ui/notifications-v21.js')&&html.includes('assets/css/notifications-v21.css'),'V21 deve estar ligada ao HTML');
assert(js.includes('VG.notifications={version:21'),'API VG.notifications v21 deve existir');
assert(css.includes('#vgNotifications')&&css.includes('.vg-notif-trigger'),'deve existir centro e sino de notificações');
assert(sw.includes("vg-operations-shell-v32")&&sw.includes('/assets/js/ui/notifications-v21.js')&&sw.includes('/assets/css/notifications-v21.css'),'PWA deve pré-cachear apenas a interface estática V21');
assert(mobile.includes("data-action=\"notifications\"")&&mobile.includes('vgMobileNotificationBadge'),'mobile deve abrir notificações e mostrar badge');
assert(!/fetch\s*\(|PushManager|pushManager|resource=notifications/i.test(js),'V21 não deve criar backend/push externo para notificações');
assert(!/passwordhash|passwordsalt|vg_auth_token|authorization/i.test(js),'estado local de notificações não pode conter credenciais');

function memoryStorage(){const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]||null,get length(){return m.size;}};}
const storage=memoryStorage();
const s=createSandbox({
  localStorage:storage,
  ALERT_RULES:[
    {id:'gop_low',severity:'red',label:'GOP abaixo do mínimo',check:h=>h==='ESTORIL'},
    {id:'energy_hi',severity:'orange',label:'Energia elevada',check:h=>h==='ESTORIL'}
  ],
  validateDashboardData:()=>[{hotel:'ESTORIL',severity:'red',code:'bad-gop',message:'GOP inconsistente'}],
  window:{
    vgAuthCurrent:()=>({user:'pedro',name:'Pedro',role:'direcao',hotel:'*'}),
    getActiveHotels:()=>['ESTORIL'],
    vgDataCenterSources:()=>[{id:'pnl_month',level:'stale',label:'Desatualizado',meta:{name:'P&L mensal'},history:{createdAt:'2026-06-01T10:00:00Z'}}]
  }
});
s.document.readyState='loading';
s.window.localStorage=storage;
s.window.VG={
  util:{escapeHtml:v=>String(v)},
  actions:{
    all:()=>[{id:'a1',title:'Validar provisão',hotel:'ESTORIL',status:'open',dueDate:'2026-08-10',ownerName:'Diretor',ownerUser:'diretor'}],
    isOverdue:()=>true,openById(){}
  },
  revenue:{getDecisionSnapshot:()=>({available:true,risks:[{hotel:'ESTORIL',month:8,monthLabel:'Agosto',severity:'red',score:130,eurRisk:60000,gap:12,urgency:80,forecast:72,target:84,summary:'Forecast 72% vs objetivo 84% · €60K em risco'}]})},
  anomalies:{getDecisionSnapshot:()=>({available:true,priorities:[{hotel:'ESTORIL',severity:'red',score:110,title:'Custo de pessoal fora do padrão',reasons:['Rácio acima do histórico'],anomalyId:'an1',type:'efficiency'}]})}
};
s.VG=s.window.VG;
load('assets/js/ui/notifications-v21.js',s);
const rows=s.window.VG.notifications.build();
const cats=new Set(rows.map(x=>x.category));
for(const c of ['action','performance','revenue','anomaly','data'])assert(cats.has(c),`deve gerar categoria ${c}`);
assert.strictEqual(rows.filter(x=>x.category==='performance'&&x.hotel==='ESTORIL').length,1,'regras operacionais do mesmo hotel devem ser agregadas');
assert.strictEqual(rows.filter(x=>x.category==='anomaly'&&x.hotel==='ESTORIL').length,1,'anomalias devem ser agregadas por hotel');
assert(rows.some(x=>x.category==='action'&&x.level==='urgent'),'ação fora do prazo deve ser urgente');
assert(rows.some(x=>x.category==='revenue'&&x.level==='urgent'),'risco Revenue material deve ser urgente');
const before=s.window.VG.notifications.counts().unread;
const first=rows[0];s.window.VG.notifications.markRead(first.id);
assert(s.window.VG.notifications.counts().unread<before,'marcar como lida deve reduzir o badge');
s.window.VG.notifications.snooze(rows[1].id);
assert(!s.window.VG.notifications.visible().some(x=>x.id===rows[1].id),'adiar 24h deve retirar temporariamente o sinal');

// Um Diretor só recebe o hotel associado, mesmo que as APIs locais contenham outros hotéis.
const d=createSandbox({
  localStorage:memoryStorage(),
  ALERT_RULES:[{id:'occ_low',severity:'red',label:'Ocupação baixa',check:()=>true}],
  validateDashboardData:()=>[],
  window:{vgAuthCurrent:()=>({user:'dir-est',name:'Diretor',role:'diretor',hotel:'ESTORIL'}),getActiveHotels:()=>['ESTORIL','OPERA']}
});
d.document.readyState='loading';d.window.localStorage=d.localStorage;
d.window.VG={util:{escapeHtml:v=>String(v)},actions:{all:()=>[{id:'e',title:'Estoril',hotel:'ESTORIL',status:'open',dueDate:'2026-08-10'},{id:'o',title:'Opera',hotel:'OPERA',status:'open',dueDate:'2026-08-10'}],isOverdue:()=>true},revenue:{getDecisionSnapshot:()=>({available:false,risks:[]})},anomalies:{getDecisionSnapshot:()=>({available:false,priorities:[]})}};d.VG=d.window.VG;
load('assets/js/ui/notifications-v21.js',d);
const dr=d.window.VG.notifications.build();
assert(dr.length>0&&dr.every(x=>!x.hotel||x.hotel==='ESTORIL'||x.hotel==='Portefólio'),'Diretor não pode receber notificações de outros hotéis');
console.log('✓ notificações v21: prioridade, agregação, categorias, âmbito, leitura/snooze, PWA e segurança');
