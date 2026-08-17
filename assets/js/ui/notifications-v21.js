// ==========================================================
// VG DASHBOARD V21 — NOTIFICAÇÕES INTELIGENTES
// Centro de notificações contextual, sem novo backend.
// Agrega sinais já autorizados/canónicos e guarda apenas
// preferências/estado de leitura local por utilizador.
// ==========================================================
(function(){
  'use strict';
  window.VG=window.VG||{};
  if(window.VG.notifications?.version>=21)return;

  const LEVEL={urgent:{label:'Urgente',weight:200},important:{label:'Importante',weight:100},info:{label:'Informativo',weight:20}};
  const CATEGORY={
    action:{label:'Ações',icon:'✓'},
    agenda:{label:'Agenda',icon:'📅'},
    performance:{label:'Performance',icon:'◎'},
    revenue:{label:'Revenue',icon:'↗'},
    anomaly:{label:'Anomalias',icon:'⚠'},
    data:{label:'Dados',icon:'▦'},
    approval:{label:'Aprovações',icon:'✅'}
  };
  const DEFAULT_PREFS={urgent:true,important:true,info:false,deviceAlerts:false,categories:{action:true,agenda:true,performance:true,revenue:true,anomaly:true,data:true,approval:true}};
  const state={open:false,filter:'all',category:'all',items:[],visible:[],refreshing:false,ready:false,lastBuildAt:0,timer:null,baselineNative:false};

  const esc=v=>window.VG?.util?.escapeHtml?window.VG.util.escapeHtml(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const authUser=()=>{try{return typeof window.vgAuthCurrent==='function'?window.vgAuthCurrent():null;}catch(e){return null;}};
  const isDirection=()=>{const u=authUser();return !!u&&['direcao','admin'].includes(u.role);};
  const today=()=>new Date().toISOString().slice(0,10);
  const now=()=>Date.now();
  const parseDate=v=>{if(!v)return null;const d=new Date(String(v).length<=10?String(v)+'T12:00:00':v);return isNaN(d)?null:d;};
  const daysUntil=v=>{const d=parseDate(v);if(!d)return null;return Math.ceil((d.getTime()-Date.now())/86400000);};
  const fmtDate=v=>{const d=parseDate(v);return d?d.toLocaleDateString('pt-PT',{day:'2-digit',month:'2-digit'}):'—';};
  const fmtMoney=v=>Number.isFinite(Number(v))?(window.VG?.market?.formatMoney?window.VG.market.formatMoney(v,0,true):'€ '+Math.round(Number(v)).toLocaleString('pt-PT')):'—';
  const shortHotel=h=>String(h||'').replace('COLLECTION ','C. ');
  const userKey=()=>norm(authUser()?.user||'anon').replace(/[^a-z0-9_-]+/g,'_')||'anon';
  const storageKey=()=>`vg_notifications_v21_${userKey()}`;

  function loadStore(){
    let s={};try{s=JSON.parse(localStorage.getItem(storageKey())||'{}')||{};}catch(e){}
    return {
      prefs:{...DEFAULT_PREFS,...(s.prefs||{}),categories:{...DEFAULT_PREFS.categories,...(s.prefs?.categories||{})}},
      read:s.read&&typeof s.read==='object'?s.read:{},
      dismissed:s.dismissed&&typeof s.dismissed==='object'?s.dismissed:{},
      snooze:s.snooze&&typeof s.snooze==='object'?s.snooze:{},
      native:s.native&&typeof s.native==='object'?s.native:{}
    };
  }
  function saveStore(s){try{localStorage.setItem(storageKey(),JSON.stringify(s));}catch(e){}}
  function prefs(){return loadStore().prefs;}
  function stableId(parts){return parts.map(x=>norm(x).replace(/\|/g,'/')).join('|');}
  function add(out,n){
    if(!n||!n.title||!n.category)return;
    n.level=LEVEL[n.level]?n.level:'important';
    n.category=CATEGORY[n.category]?n.category:'performance';
    n.hotel=n.hotel||'';
    n.id=n.id||stableId([n.category,n.hotel,n.title,n.signature||'']);
    n.score=(LEVEL[n.level].weight||0)+(Number(n.score)||0);
    n.detail=String(n.detail||'').trim();
    n.actionLabel=n.actionLabel||'Abrir';
    out.push(n);
  }
  function scopedHotels(){
    const u=authUser();if(!u)return [];
    if(!isDirection()){const hs=typeof window.vgAuthHotels==='function'?window.vgAuthHotels():(Array.isArray(u.hotels)?u.hotels:(u.hotel?[u.hotel]:[]));if(hs.length)return hs;}
    try{if(typeof window.getActiveHotels==='function'){const h=window.getActiveHotels();if(Array.isArray(h)&&h.length)return h.slice();}}catch(e){}
    try{if(typeof RAW!=='undefined'&&Array.isArray(RAW?.hotel_list))return RAW.hotel_list.slice();}catch(e){}
    return [];
  }
  function hotelAllowed(h,scope){if(!h||h==='Portefólio')return true;return !scope.size||scope.has(norm(h));}

  function buildActions(out,scope){
    const api=window.VG?.actions;if(!api?.all)return;
    for(const a of api.all()||[]){
      if(!hotelAllowed(a.hotel,scope))continue;
      if(['resolved','cancelled','closed'].includes(String(a.status||'').toLowerCase()))continue;
      const du=daysUntil(a.dueDate),overdue=api.isOverdue?.(a)??(du!=null&&du<0);
      if(!overdue && (du==null||du>2))continue;
      const level=overdue?'urgent':'important';
      const when=overdue?`${Math.abs(du||0)} dia(s) fora do prazo`:du===0?'Vence hoje':du===1?'Vence amanhã':`Vence em ${du} dias`;
      add(out,{category:'action',level,hotel:a.hotel,title:a.title||a.subject||'Ação operacional',detail:[when,a.ownerName||a.assigneeName||'Sem responsável',a.status].filter(Boolean).join(' · '),score:overdue?80:50,signature:[a.id,a.status,a.dueDate,a.ownerUser].join(':'),id:stableId(['action',a.id,a.status,a.dueDate,a.ownerUser||'']),actionLabel:'Gerir ação',open:()=>api.openById?.(a.id)});
    }
  }

  function buildAgenda(out,scope){
    const api=window.VG?.agenda;if(!api?.all)return;
    for(const e of api.all()||[]){
      if(!e||e.source==='action'||!e.date||!hotelAllowed(e.hotel,scope))continue;
      const du=daysUntil(e.date);if(du==null||du<0||du>1)continue;
      const type=api.TYPES?.[e.type]?.label||'Evento';
      const when=du===0?'Hoje':'Amanhã';
      const urgent=du===0&&e.type==='deadline';
      add(out,{category:'agenda',level:urgent?'urgent':'important',hotel:e.hotel,title:`${shortHotel(e.hotel)} · ${e.title||type}`,detail:[when,e.startTime||'',type,e.ownerName||''].filter(Boolean).join(' · '),score:urgent?85:(du===0?65:45),signature:[e.id,e.date,e.startTime,e.updatedAt].join(':'),id:stableId(['agenda',e.id,e.date,e.startTime||'']),actionLabel:'Abrir Agenda',open:()=>{window.setView?.('agenda');setTimeout(()=>api.openById?.(e.id),30);}});
    }
  }

  function buildOperational(out,scope){
    let rules;try{rules=typeof ALERT_RULES!=='undefined'?ALERT_RULES:null;}catch(e){rules=null;}if(!Array.isArray(rules))return;
    for(const h of scopedHotels()){
      if(!hotelAllowed(h,scope))continue;
      const active=[];
      for(const r of rules){try{if(r.check(h))active.push(r);}catch(e){}}
      if(!active.length)continue;
      const red=active.filter(r=>r.severity==='red');
      const level=red.length?'urgent':'important';
      const labels=active.slice(0,4).map(r=>{try{return typeof alertRuleLabel==='function'?alertRuleLabel(r,h):(r.label||r.id);}catch(e){return r.label||r.id;}});
      add(out,{category:'performance',level,hotel:h,title:`${shortHotel(h)} · ${red.length?'Desvio crítico':'Desvio a acompanhar'}`,detail:labels.join(' · ')+(active.length>4?` · +${active.length-4} sinal(is)`:''),score:red.length*30+active.length*8,signature:active.map(r=>r.id+':'+r.severity).sort().join(','),actionLabel:'Ver alertas',open:()=>window.setView?.('alertas')});
    }
  }

  function buildRevenue(out,scope){
    const api=window.VG?.revenue;if(!api?.getDecisionSnapshot)return;
    let snap;try{snap=api.getDecisionSnapshot(scopedHotels());}catch(e){return;}if(!snap?.available)return;
    const best=new Map();
    for(const r of snap.risks||[]){
      if(!hotelAllowed(r.hotel,scope))continue;
      const prev=best.get(r.hotel);if(!prev||Number(r.score||0)>Number(prev.score||0))best.set(r.hotel,r);
    }
    for(const r of best.values()){
      const urgent=r.severity==='red'||Number(r.eurRisk||0)>=50000||Number(r.gap||0)>10;
      // Evita ruído: Revenue moderado só entra quando o risco é material.
      if(!urgent && Number(r.eurRisk||0)<15000 && Number(r.urgency||0)<55)continue;
      add(out,{category:'revenue',level:urgent?'urgent':'important',hotel:r.hotel,title:`${shortHotel(r.hotel)} · Revenue ${r.monthLabel||''}`.trim(),detail:r.summary||`Forecast abaixo do objetivo · ${fmtMoney(r.eurRisk)} em risco`,score:Number(r.score||0),signature:[r.month,r.target,r.forecast,Math.round(Number(r.eurRisk||0)/1000)].join(':'),actionLabel:'Abrir Revenue',open:()=>window.setView?.('revenueint')});
    }
  }

  function buildAnomalies(out,scope){
    const api=window.VG?.anomalies;if(!api?.getDecisionSnapshot)return;
    let snap;try{snap=api.getDecisionSnapshot(scopedHotels());}catch(e){return;}if(!snap?.available)return;
    const best=new Map();
    for(const r of snap.priorities||[]){
      if(!hotelAllowed(r.hotel,scope))continue;
      const key=r.hotel||'Portefólio',prev=best.get(key);if(!prev||Number(r.score||0)>Number(prev.score||0))best.set(key,r);
    }
    for(const r of best.values()){
      if(r.severity!=='red'&&Number(r.score||0)<80)continue;
      add(out,{category:'anomaly',level:r.severity==='red'?'urgent':'important',hotel:r.hotel,title:`${shortHotel(r.hotel)} · ${r.title||'Anomalia'}`,detail:(r.reasons||[]).slice(0,2).join(' · '),score:Number(r.score||0),signature:r.anomalyId||[r.type,r.title,r.amount].join(':'),actionLabel:r.type==='price'?'Abrir Compras':'Ver anomalias',open:()=>window.setView?.(r.type==='price'?'compras':'anomalies')});
    }
  }

  function buildData(out,scope){
    // Qualidade crítica por hotel/portefólio, agregada para evitar uma notificação por erro.
    try{
      if(typeof validateDashboardData==='function'&&typeof RAW!=='undefined'&&RAW){
        const grouped=new Map();
        for(const x of validateDashboardData(RAW)||[]){
          if(x.severity!=='red'||!hotelAllowed(x.hotel,scope))continue;
          const h=x.hotel||'Portefólio';if(!grouped.has(h))grouped.set(h,[]);grouped.get(h).push(x);
        }
        for(const [h,rows] of grouped){add(out,{category:'data',level:'urgent',hotel:h,title:`${shortHotel(h)} · Incoerência crítica de dados`,detail:rows.slice(0,3).map(x=>x.message).join(' · ')+(rows.length>3?` · +${rows.length-3} erro(s)`:''),score:100+rows.length*10,signature:rows.map(x=>x.code||x.message).sort().join(','),actionLabel:'Abrir Centro de Dados',open:()=>window.setView?.('datacenter')});}
      }
    }catch(e){}
    // Fontes desatualizadas/falhadas: só Direção recebe avisos de governação global de dados.
    if(!isDirection())return;
    try{
      const rows=typeof window.vgDataCenterSources==='function'?window.vgDataCenterSources():[];
      const bad=(rows||[]).filter(x=>['warn','stale'].includes(x.level));
      if(bad.length)add(out,{category:'data',level:bad.some(x=>x.label==='Última carga falhou')?'urgent':'important',hotel:'Portefólio',title:'Centro de Dados · fontes a validar',detail:bad.slice(0,4).map(x=>`${x.meta?.name||x.id}: ${x.label}`).join(' · ')+(bad.length>4?` · +${bad.length-4}`:''),score:70+bad.length*5,signature:bad.map(x=>x.id+':'+x.level+':'+(x.history?.createdAt||'')).sort().join(','),actionLabel:'Ver Centro de Dados',open:()=>window.setView?.('datacenter')});
    }catch(e){}
  }


  function buildApprovals(out,scope){
    const api=window.VG?.approvals;if(!api?.all)return;const u=authUser();
    for(const r of api.all()||[]){
      if(!r||!hotelAllowed(r.hotel,scope))continue;
      if(r.status==='pending'&&isDirection()&&(!r.approverUser||norm(r.approverUser)===norm(u?.user))){
        const du=daysUntil(r.dueDate),urgent=r.priority==='critical'||(du!=null&&du<=0);
        add(out,{category:'approval',level:urgent?'urgent':'important',hotel:r.hotel,title:`${shortHotel(r.hotel)} · Aprovação pendente`,detail:[r.title,r.requesterName||r.requesterUser,r.dueDate?(du<0?`${Math.abs(du)} dia(s) fora do prazo`:`até ${fmtDate(r.dueDate)}`):'',r.priority==='critical'?'prioridade crítica':''].filter(Boolean).join(' · '),score:urgent?95:65,signature:[r.id,r.updatedAt,r.priority,r.dueDate].join(':'),actionLabel:'Decidir',open:()=>api.openById?.(r.id)});
      } else if(['approved','rejected'].includes(r.status)&&norm(r.requesterUser)===norm(u?.user)){
        const age=Date.now()-Date.parse(r.decisionAt||r.updatedAt||0);if(!Number.isFinite(age)||age>72*3600000)continue;
        add(out,{category:'approval',level:r.status==='rejected'?'important':'info',hotel:r.hotel,title:`${shortHotel(r.hotel)} · Pedido ${r.status==='approved'?'aprovado':'rejeitado'}`,detail:[r.title,r.decisionBy?.name,r.decisionNote].filter(Boolean).join(' · '),score:r.status==='rejected'?55:25,signature:[r.id,r.status,r.decisionAt].join(':'),actionLabel:'Ver decisão',open:()=>api.openById?.(r.id)});
      }
    }
  }

  function build(){
    const u=authUser();if(!u){state.items=[];state.visible=[];return [];}const out=[],scope=new Set(scopedHotels().map(norm));
    buildActions(out,scope);buildAgenda(out,scope);buildOperational(out,scope);buildRevenue(out,scope);buildAnomalies(out,scope);buildData(out,scope);buildApprovals(out,scope);
    // Deduplicação exata e ordenação executiva.
    const m=new Map();for(const n of out){const p=m.get(n.id);if(!p||n.score>p.score)m.set(n.id,n);}
    state.items=[...m.values()].sort((a,b)=>b.score-a.score||String(a.hotel).localeCompare(String(b.hotel),'pt'));
    state.lastBuildAt=Date.now();return state.items.slice();
  }

  function readAgeLimit(n){return n.level==='urgent'?24*3600000:n.level==='important'?72*3600000:7*86400000;}
  function isUnread(n,s){const t=Number(s.read[n.id]||0);return !t||(Date.now()-t)>readAgeLimit(n);}
  function isSnoozed(n,s){const t=Number(s.snooze[n.id]||0);if(t&&t>Date.now())return true;if(t){delete s.snooze[n.id];saveStore(s);}return false;}
  function isDismissed(n,s){return !!s.dismissed[n.id];}
  function allowed(n,p){return !!p[n.level]&&p.categories?.[n.category]!==false;}
  function visibleItems(){
    const s=loadStore(),p=s.prefs;
    let rows=state.items.filter(n=>allowed(n,p)&&!isDismissed(n,s)&&!isSnoozed(n,s));
    if(state.filter!=='all')rows=rows.filter(n=>n.level===state.filter);
    if(state.category!=='all')rows=rows.filter(n=>n.category===state.category);
    state.visible=rows;return rows;
  }
  function counts(){
    const s=loadStore(),p=s.prefs;const rows=state.items.filter(n=>allowed(n,p)&&!isDismissed(n,s)&&!isSnoozed(n,s));
    return {total:rows.length,unread:rows.filter(n=>isUnread(n,s)).length,urgent:rows.filter(n=>n.level==='urgent').length,important:rows.filter(n=>n.level==='important').length,unreadUrgent:rows.filter(n=>n.level==='urgent'&&isUnread(n,s)).length};
  }

  function updateBadges(){
    const c=counts(),n=c.unread;for(const id of ['vgNotificationBadge','vgMobileNotificationBadge']){const b=document.getElementById(id);if(!b)continue;b.textContent=n>99?'99+':String(n);b.classList.toggle('show',n>0);b.classList.toggle('urgent',c.unreadUrgent>0);}
    const top=document.getElementById('vgNotificationsTrigger');if(top)top.title=n?`${n} notificação(ões) por ler`:'Sem notificações por ler';
  }

  function render(){
    const root=document.getElementById('vgNotifications');if(!root)return;const s=loadStore(),p=s.prefs,c=counts(),rows=visibleItems();
    const byCat=Object.entries(CATEGORY).map(([id,x])=>`<button class="vg-notif-chip ${state.category===id?'active':''}" data-cat="${id}">${x.icon} ${x.label}</button>`).join('');
    const items=rows.length?rows.map(n=>itemHtml(n,s)).join(''):`<div class="vg-notif-empty"><b>Sem notificações para estes filtros.</b><span>Os sinais voltam a aparecer se a condição mudar ou se uma situação urgente permanecer ativa após o período de relembrete.</span></div>`;
    root.querySelector('.vg-notif-kpis').innerHTML=`<div class="urgent"><span>Urgentes</span><strong>${c.urgent}</strong></div><div><span>Importantes</span><strong>${c.important}</strong></div><div><span>Por ler</span><strong>${c.unread}</strong></div>`;
    root.querySelector('.vg-notif-levels').innerHTML=`<button data-level="all" class="${state.filter==='all'?'active':''}">Todas</button><button data-level="urgent" class="${state.filter==='urgent'?'active':''}">Urgentes</button><button data-level="important" class="${state.filter==='important'?'active':''}">Importantes</button>`;
    root.querySelector('.vg-notif-cats').innerHTML=`<button class="vg-notif-chip ${state.category==='all'?'active':''}" data-cat="all">Tudo</button>${byCat}`;
    root.querySelector('.vg-notif-list').innerHTML=items;
    root.querySelector('#vgNotifDeviceToggle').checked=!!p.deviceAlerts;
    root.querySelector('#vgNotifInfoToggle').checked=!!p.info;
    for(const cat of Object.keys(CATEGORY)){const el=root.querySelector(`[data-pref-cat="${cat}"]`);if(el)el.checked=p.categories?.[cat]!==false;}
    const perm=root.querySelector('#vgNotifPermission');if(perm){const support='Notification'in window;perm.textContent=!support?'Alertas do dispositivo indisponíveis neste browser':Notification.permission==='granted'?'Permissão do dispositivo ativa':Notification.permission==='denied'?'Permissão bloqueada no browser':'Ativar alertas urgentes no dispositivo';perm.disabled=!support||Notification.permission==='denied';}
    root.querySelector('.vg-notif-meta').textContent=`${scopedHotels().length} hotel(is) no âmbito atual · atualizado ${new Date(state.lastBuildAt||Date.now()).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})}`;
    updateBadges();
  }

  function itemHtml(n,s){
    const unread=isUnread(n,s),cat=CATEGORY[n.category],level=LEVEL[n.level];
    return `<article class="vg-notif-item ${n.level} ${unread?'unread':''}" data-id="${esc(n.id)}"><div class="vg-notif-icon">${cat.icon}</div><div class="vg-notif-main"><div class="vg-notif-topline"><span class="vg-notif-level ${n.level}">${level.label}</span><span>${esc(cat.label)}</span>${n.hotel?`<span>${esc(shortHotel(n.hotel))}</span>`:''}${unread?'<i>Novo</i>':''}</div><strong>${esc(n.title)}</strong><p>${esc(n.detail)}</p><div class="vg-notif-actions"><button data-open="${esc(n.id)}">${esc(n.actionLabel)}</button><button class="soft" data-snooze="${esc(n.id)}">Adiar 24h</button><button class="ghost" data-dismiss="${esc(n.id)}" title="Ocultar até a situação mudar">Ocultar</button></div></div></article>`;
  }

  function ensureUI(){
    if(document.getElementById('vgNotifications'))return;
    const overlay=document.createElement('div');overlay.id='vgNotifications';overlay.setAttribute('aria-hidden','true');overlay.innerHTML=`<section class="vg-notif-panel" role="dialog" aria-modal="true" aria-label="Notificações Inteligentes"><header><div><span>VG Operations · V21</span><h2>Notificações Inteligentes</h2><small class="vg-notif-meta">A analisar sinais…</small></div><div class="vg-notif-head-actions"><button id="vgNotifMarkAll">Marcar lidas</button><button class="close" id="vgNotifClose" aria-label="Fechar">✕</button></div></header><div class="vg-notif-kpis"></div><div class="vg-notif-levels"></div><div class="vg-notif-cats"></div><div class="vg-notif-body"><div class="vg-notif-list"></div><aside class="vg-notif-settings"><h3>Preferências</h3><label><input type="checkbox" id="vgNotifDeviceToggle"> Alertas urgentes no dispositivo</label><button id="vgNotifPermission" type="button">Ativar alertas urgentes no dispositivo</button><label><input type="checkbox" id="vgNotifInfoToggle"> Mostrar informativos</label><h4>Categorias</h4>${Object.entries(CATEGORY).map(([id,x])=>`<label><input type="checkbox" data-pref-cat="${id}"> ${x.icon} ${x.label}</label>`).join('')}<div class="vg-notif-note">Os alertas do dispositivo funcionam enquanto a VG Operations estiver aberta ou em segundo plano. A V21 não envia dados empresariais para serviços externos de push.</div></aside></div></section>`;document.body.appendChild(overlay);
    overlay.addEventListener('click',e=>{
      if(e.target===overlay||e.target.closest('#vgNotifClose')){close();return;}
      const l=e.target.closest('[data-level]');if(l){state.filter=l.dataset.level||'all';render();return;}
      const c=e.target.closest('[data-cat]');if(c){state.category=c.dataset.cat||'all';render();return;}
      const o=e.target.closest('[data-open]');if(o){openItem(o.dataset.open);return;}
      const sn=e.target.closest('[data-snooze]');if(sn){snooze(sn.dataset.snooze);return;}
      const d=e.target.closest('[data-dismiss]');if(d){dismiss(d.dataset.dismiss);return;}
    });
    overlay.querySelector('#vgNotifMarkAll').addEventListener('click',markAllRead);
    overlay.querySelector('#vgNotifDeviceToggle').addEventListener('change',e=>setPref('deviceAlerts',!!e.target.checked));
    overlay.querySelector('#vgNotifInfoToggle').addEventListener('change',e=>setPref('info',!!e.target.checked));
    overlay.querySelectorAll('[data-pref-cat]').forEach(el=>el.addEventListener('change',e=>setCategoryPref(e.target.dataset.prefCat,!!e.target.checked)));
    overlay.querySelector('#vgNotifPermission').addEventListener('click',requestDevicePermission);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.open)close();});
  }
  function installTrigger(){
    if(document.getElementById('vgNotificationsTrigger'))return;const right=document.querySelector('.topbar-right');if(!right)return;
    const b=document.createElement('button');b.id='vgNotificationsTrigger';b.type='button';b.className='vg-notif-trigger';b.innerHTML='<span class="vg-notif-bell">🔔</span><span class="vg-notif-trigger-label">Notificações</span><b id="vgNotificationBadge"></b>';b.addEventListener('click',()=>open());right.insertBefore(b,right.firstChild);
  }
  function installCentralShortcut(){
    const actions=document.querySelector('#opsCenter .ops-head-actions');if(!actions||document.getElementById('opsNotificationsBtn'))return;const b=document.createElement('button');b.id='opsNotificationsBtn';b.className='ops-btn';b.textContent='Notificações';b.onclick=()=>open();actions.insertBefore(b,actions.firstChild);
  }

  function open(){if(!authUser())return;ensureUI();installTrigger();state.open=true;const el=document.getElementById('vgNotifications');el.classList.add('open');el.setAttribute('aria-hidden','false');document.body.classList.add('vg-notifications-open');refresh(true).then(render);}
  function close(){state.open=false;const el=document.getElementById('vgNotifications');el?.classList.remove('open');el?.setAttribute('aria-hidden','true');document.body.classList.remove('vg-notifications-open');}
  function find(id){return state.items.find(n=>n.id===id);}
  function markRead(id){const s=loadStore();s.read[id]=Date.now();saveStore(s);updateBadges();}
  function markAllRead(){const s=loadStore(),t=Date.now();for(const n of state.items)s.read[n.id]=t;saveStore(s);render();}
  function dismiss(id){const s=loadStore();s.dismissed[id]=Date.now();saveStore(s);state.open?render():updateBadges();}
  function snooze(id){const s=loadStore();s.snooze[id]=Date.now()+24*3600000;saveStore(s);state.open?render():updateBadges();}
  function openItem(id){const n=find(id);if(!n)return;markRead(id);close();try{n.open?.();}catch(e){console.warn('Notificação: navegação falhou',e);}}
  function setPref(key,value){const s=loadStore();s.prefs[key]=value;saveStore(s);if(key==='deviceAlerts'&&value)requestDevicePermission();state.open?render():updateBadges();}
  function setCategoryPref(cat,value){const s=loadStore();s.prefs.categories=s.prefs.categories||{};s.prefs.categories[cat]=value;saveStore(s);state.open?render():updateBadges();}

  async function requestDevicePermission(){
    if(!('Notification'in window))return false;
    let p=Notification.permission;if(p==='default'){try{p=await Notification.requestPermission();}catch(e){}}
    const s=loadStore();s.prefs.deviceAlerts=p==='granted';saveStore(s);render();return p==='granted';
  }
  function nativeAlerts(){
    if(!('Notification'in window)||Notification.permission!=='granted'||!document.hidden)return;
    const s=loadStore();if(!s.prefs.deviceAlerts)return;
    const urgent=state.items.filter(n=>n.level==='urgent'&&allowed(n,s.prefs)&&!isDismissed(n,s)&&!isSnoozed(n,s));
    if(!state.baselineNative){for(const n of urgent)s.native[n.id]=Date.now();state.baselineNative=true;saveStore(s);return;}
    let changed=false;
    for(const n of urgent){if(s.native[n.id])continue;try{const x=new Notification(`VG Operations · ${n.hotel||CATEGORY[n.category].label}`,{body:n.title+(n.detail?' — '+n.detail:''),tag:'vg-'+n.id,renotify:false,icon:'assets/icons/vg-ops-192.png'});x.onclick=()=>{window.focus?.();open();};s.native[n.id]=Date.now();changed=true;}catch(e){}}
    if(changed)saveStore(s);
  }

  async function refresh(force){
    if(state.refreshing)return state.items;if(!authUser()){state.items=[];updateBadges();return [];}if(!force&&Date.now()-state.lastBuildAt<25000)return state.items;
    state.refreshing=true;
    try{
      try{await window.VG?.actions?.ensureLoaded?.(false);}catch(e){}
      try{await window.VG?.approvals?.ensureLoaded?.(false);}catch(e){}
      if(isDirection()){try{if(typeof window.dcLoadHistory==='function')await window.dcLoadHistory(false);}catch(e){}}
      build();state.ready=true;updateBadges();nativeAlerts();if(state.open)render();return state.items;
    }finally{state.refreshing=false;}
  }

  function init(){
    ensureUI();installTrigger();installCentralShortcut();setTimeout(()=>refresh(true),1400);state.timer=setInterval(()=>refresh(false),60000);
    window.VG?.events?.on?.('actions:changed',()=>setTimeout(()=>refresh(true),50));
    window.VG?.events?.on?.('approvals:changed',()=>setTimeout(()=>refresh(true),50));
    window.VG?.events?.on?.('state:changed',()=>setTimeout(()=>refresh(true),120));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(false);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();

  window.VG.notifications={version:21,build,refresh,open,close,counts,prefs,markAllRead,markRead,dismiss,snooze,requestDevicePermission,items:()=>state.items.slice(),visible:visibleItems};
  window.vgNotificationsOpen=open;window.vgNotificationsClose=close;window.vgNotificationsRefresh=refresh;
})();
