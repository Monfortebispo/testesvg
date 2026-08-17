// ==========================================================
// VG OPERATIONS 2.0 v30 — PWA / MOBILE
// Navegação móvel, instalação PWA e cache da aplicação estática.
// Não guarda respostas da API/Netlify no service worker.
// ==========================================================
(function(){
  'use strict';
  if(window.__VG_MOBILE_PWA_V30__) return;
  window.__VG_MOBILE_PWA_V30__=true;

  const MOBILE='(max-width: 820px)';
  let deferredInstall=null;
  let lastView='resumo';
  let badgeTimer=null;

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function isMobile(){return !!window.matchMedia && window.matchMedia(MOBILE).matches;}
  function standalone(){return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone===true;}
  function qs(id){return document.getElementById(id);}
  function activeView(){return document.querySelector('.tab-content.active')?.id?.replace(/^view-/,'') || (typeof currentView!=='undefined'?currentView:'resumo') || 'resumo';}
  function authUser(){try{return typeof window.vgAuthCurrent==='function'?window.vgAuthCurrent():null;}catch(e){return null;}}

  function createUI(){
    if(qs('vgMobileNav')) return;
    const nav=document.createElement('nav');
    nav.id='vgMobileNav'; nav.setAttribute('aria-label','Navegação móvel VG Operations');
    nav.innerHTML=`
      <button class="vg-mnav-btn" data-view="resumo" type="button"><span class="vg-mnav-icon">⬛</span><span>Central</span></button>
      <button class="vg-mnav-btn" data-view="hotel360" type="button"><span class="vg-mnav-icon">🏨</span><span>Hotéis</span></button>
      <button class="vg-mnav-btn" data-action="actions" type="button"><span class="vg-mnav-icon">✓</span><span>Ações</span><span class="vg-mnav-badge" id="vgMobileActionBadge"></span></button>
      <button class="vg-mnav-btn" data-action="notifications" type="button"><span class="vg-mnav-icon">🔔</span><span>Alertas</span><span class="vg-mnav-badge" id="vgMobileNotificationBadge"></span></button>
      <button class="vg-mnav-btn" data-action="more" type="button"><span class="vg-mnav-icon">•••</span><span>Mais</span></button>`;
    document.body.appendChild(nav);

    const more=document.createElement('div');
    more.id='vgMobileMore'; more.setAttribute('aria-hidden','true');
    more.innerHTML=`<div class="vg-mobile-sheet" role="dialog" aria-modal="true" aria-label="Mais opções">
      <div class="vg-mobile-sheet-handle"></div>
      <div class="vg-mobile-sheet-head"><div><strong>VG Operations</strong><span id="vgMobileUserLine">Acesso rápido</span></div><button type="button" class="vg-mobile-sheet-close" aria-label="Fechar">✕</button></div>
      <div class="vg-mobile-group-title">Decidir e agir</div>
      <div class="vg-mobile-grid">
        <button class="vg-mobile-link primary" data-view="hotel360" type="button"><i>🏨</i><span>Hotel 360º<small>Visão integrada da unidade</small></span></button>
        <button class="vg-mobile-link primary" data-view="hoteis" type="button"><i>🏨</i><span>Hotéis<small>Características e fichas técnicas</small></span></button>
        <button class="vg-mobile-link primary" data-view="fichahotel" type="button"><i>📝</i><span>Comentários Fecho do Mês<small>KPIs e comentários</small></span></button>
        <button class="vg-mobile-link primary" data-view="revenuehub" type="button"><i>🔭</i><span>Revenue &amp; Forecast<small>Situação, forecast e cenários</small></span></button>
        <button class="vg-mobile-link" data-view="anomalies" type="button"><i>⚠</i><span>Anomalias<small>Desvios automáticos</small></span></button>
        <button class="vg-mobile-link" data-action="actions" type="button"><i>✓</i><span>Ações<small>Responsáveis e prazos</small></span></button>
        <button class="vg-mobile-link primary" data-view="agenda" type="button"><i>📅</i><span>Agenda<small>Eventos e compromissos</small></span></button>
        <button class="vg-mobile-link primary" data-view="automaticreports" type="button"><i>📄</i><span>Relatórios<small>Hotel, região e consolidado</small></span></button>
        <button class="vg-mobile-link primary" data-view="documents" type="button"><i>🗂️</i><span>Documentos<small>Relatórios, atas e auditorias</small></span></button>
        <button class="vg-mobile-link primary" data-view="approvals" type="button"><i>✅</i><span>Aprovações<small>Pedidos e decisões</small></span></button>
        <button class="vg-mobile-link primary" data-view="cityledger" type="button"><i>💳</i><span>City Ledger<small>Cobranças e diligências</small></span></button>
      </div>
      <div class="vg-mobile-group-title">Analisar</div>
      <div class="vg-mobile-grid">
        <button class="vg-mobile-link primary" data-action="assistant" type="button"><i>✦</i><span>Assistente<small>Pergunta aos dados</small></span></button>
        <button class="vg-mobile-link" data-view="benchmark" type="button"><i>◎</i><span>Benchmark<small>Hotel vs pares</small></span></button>
        <button class="vg-mobile-link" data-view="unitEconomics" type="button"><i>⚡</i><span>Eficiência<small>Custos e receitas por atividade</small></span></button>
        <button class="vg-mobile-link" data-view="pl" type="button"><i>📊</i><span>P&amp;L<small>Resultado mensal</small></span></button>
        <button class="vg-mobile-link" data-view="ocupacao" type="button"><i>🛏</i><span>Ocupação<small>Atual e futura</small></span></button>
        <button class="vg-mobile-link" data-view="compras" type="button"><i>🧾</i><span>Compras<small>Artigos e preços</small></span></button>
        <button class="vg-mobile-link" data-view="datacenter" type="button"><i>🗄️</i><span>Dados<small>Qualidade e cargas</small></span></button>
        <button class="vg-mobile-link vg-mobile-governance" data-view="governance" type="button"><i>🛡️</i><span>Auditoria<small>Alterações e governação</small></span></button>
        <button class="vg-mobile-link vg-mobile-governance" data-view="backup" type="button"><i>💾</i><span>Backup<small>Versões e recuperação</small></span></button>
      </div>
      <div class="vg-mobile-group-title">Aplicação</div>
      <div class="vg-mobile-grid">
        <button class="vg-mobile-link full" data-action="sync" type="button"><i>↻</i><span>Atualizar dados<small id="vgMobileSyncLine">Sincronizar Blobs e estado</small></span></button>
        <button class="vg-mobile-link full" id="vgMobileInstallLink" data-action="install" type="button"><i>⬇</i><span>Instalar VG Operations<small>Adicionar ao ecrã principal</small></span></button>
      </div>
    </div>`;
    document.body.appendChild(more);

    const banner=document.createElement('div');
    banner.id='vgMobileInstall';
    banner.innerHTML='<div class="vg-install-mark">VG</div><div class="vg-install-copy"><strong>Instalar VG Operations</strong><span>Abre como aplicação e fica disponível no ecrã inicial.</span></div><button class="vg-install-btn" type="button">Instalar</button><button class="vg-install-dismiss" type="button" aria-label="Agora não">✕</button>';
    document.body.appendChild(banner);

    const sync=document.createElement('div');
    sync.id='vgMobileSyncToast';
    sync.innerHTML='<span class="vg-sync-dot"></span><span id="vgMobileSyncToastText">Dados atualizados.</span>';
    document.body.appendChild(sync);

    nav.addEventListener('click',handleNavClick);
    more.addEventListener('click',e=>{
      if(e.target===more || e.target.closest('.vg-mobile-sheet-close')) closeMore();
      const b=e.target.closest('[data-view],[data-action]'); if(b) handleButton(b);
    });
    banner.querySelector('.vg-install-btn').addEventListener('click',installApp);
    banner.querySelector('.vg-install-dismiss').addEventListener('click',()=>{hideInstall();try{sessionStorage.setItem('vg_pwa_install_dismissed','1');}catch(e){}});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMore();});
    updateInstallVisibility(); updateUserLine(); updateActive();
  }

  function handleNavClick(e){const b=e.target.closest('[data-view],[data-action]');if(b)handleButton(b);}
  function handleButton(b){
    const view=b.dataset.view,action=b.dataset.action;
    if(view){go(view);return;}
    if(action==='actions'){closeMore();if(typeof window.opsActionsOpen==='function')window.opsActionsOpen();return;}
    if(action==='notifications'){closeMore();window.VG?.notifications?.open?.();return;}
    if(action==='assistant'){closeMore();window.VG?.analyticalAssistant?.open?.();return;}
    if(action==='more'){openMore();return;}
    if(action==='sync'){syncNow();return;}
    if(action==='install'){installApp();return;}
  }
  function go(view){closeMore();try{if(typeof window.setView==='function')window.setView(view);}catch(e){console.warn('Navegação mobile',e);}window.scrollTo({top:0,behavior:'smooth'});setTimeout(updateActive,20);}
  function openMore(){if(!isMobile())return;updateUserLine();updateSyncLine();const x=qs('vgMobileMore');if(x){x.classList.add('open');x.setAttribute('aria-hidden','false');document.body.classList.add('vg-mobile-sheet-open');}}
  function closeMore(){const x=qs('vgMobileMore');if(x){x.classList.remove('open');x.setAttribute('aria-hidden','true');document.body.classList.remove('vg-mobile-sheet-open');}}
  function updateActive(){
    const v=activeView();lastView=v;
    document.querySelectorAll('#vgMobileNav .vg-mnav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===v));
    if(!['resumo','hotel360'].includes(v)){const more=qs('vgMobileNav')?.querySelector('[data-action="more"]');more?.classList.add('active');}
  }
  function updateUserLine(){const u=authUser(),hs=u?(Array.isArray(u.hotels)?u.hotels:(u.hotel&&u.hotel!=='*'?[u.hotel]:[])):[];const line=qs('vgMobileUserLine');if(line)line.textContent=u?(u.name||u.user)+(hs.length?(hs.length<=2?' · '+hs.join(' · '):' · '+hs.length+' hotéis'):''):'Acesso rápido';document.querySelectorAll('.vg-mobile-governance').forEach(el=>el.style.display=(u&&(u.role==='direcao'||u.role==='admin'))?'':'none');if(typeof window.vgAuthApplyMenuPermissions==='function')window.vgAuthApplyMenuPermissions();}

  function showSync(text,offline){const x=qs('vgMobileSyncToast'),t=qs('vgMobileSyncToastText');if(!x)return;if(t)t.textContent=text;x.classList.toggle('offline',!!offline);x.classList.add('show');clearTimeout(showSync._t);showSync._t=setTimeout(()=>x.classList.remove('show'),3200);}
  function updateSyncLine(){const el=qs('vgMobileSyncLine');if(!el)return;let val='Sincronizar Blobs e estado';try{const ts=localStorage.getItem('vg_mobile_last_sync_v17');if(ts){const d=new Date(ts);if(!isNaN(d))val='Última sincronização '+d.toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'});}}catch(e){}el.textContent=val;}
  async function syncNow(){
    closeMore();
    if(!navigator.onLine){showSync('Sem ligação. A aplicação continua disponível, mas os dados não podem ser atualizados.',true);return;}
    showSync('A sincronizar dados…');
    try{
      if(typeof window.fetchSharedData==='function') await window.fetchSharedData(true);
      if(window.VG?.actions?.ensureLoaded) await window.VG.actions.ensureLoaded(true);
      if(window.VG?.agenda?.ensureLoaded) await window.VG.agenda.ensureLoaded(true);
      if(window.VG?.approvals?.ensureLoaded) await window.VG.approvals.ensureLoaded(true);
      const now=new Date();try{localStorage.setItem('vg_mobile_last_sync_v17',now.toISOString());}catch(e){}
      updateSyncLine();await updateActionBadge();try{await window.VG?.notifications?.refresh?.(true);}catch(e){}showSync('Dados atualizados · '+now.toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'}));
    }catch(e){console.warn('Sincronização mobile falhou',e);showSync('Não foi possível concluir a sincronização.',true);}
  }

  async function updateActionBadge(){
    const badge=qs('vgMobileActionBadge');if(!badge)return;
    try{
      if(!authUser()||!window.VG?.actions){badge.classList.remove('show');return;}
      await window.VG.actions.ensureLoaded(false);
      const s=window.VG.actions.stats(window.VG.actions.all());
      const n=Number(s.overdue)||0;
      badge.textContent=n>99?'99+':String(n);badge.classList.toggle('show',n>0);
    }catch(e){badge.classList.remove('show');}
  }

  async function installApp(){
    closeMore();
    if(standalone()){showSync('VG Operations já está instalada.');return;}
    if(deferredInstall){
      deferredInstall.prompt();
      try{await deferredInstall.userChoice;}catch(e){}
      deferredInstall=null;hideInstall();updateInstallVisibility();return;
    }
    const ios=/iphone|ipad|ipod/i.test(navigator.userAgent||'');
    showSync(ios?'No Safari: Partilhar → Adicionar ao ecrã principal.':'No Chrome: menu ⋮ → Adicionar ao ecrã principal.');
  }
  function hideInstall(){qs('vgMobileInstall')?.classList.remove('show');}
  function updateInstallVisibility(){
    const link=qs('vgMobileInstallLink');if(link)link.style.display=standalone()?'none':'';
    let dismissed=false;try{dismissed=sessionStorage.getItem('vg_pwa_install_dismissed')==='1';}catch(e){}
    if(isMobile()&&!standalone()&&deferredInstall&&!dismissed)qs('vgMobileInstall')?.classList.add('show');else hideInstall();
  }

  function observeViews(){
    const obs=new MutationObserver(muts=>{if(muts.some(m=>m.type==='attributes'&&m.attributeName==='class'))updateActive();});
    document.querySelectorAll('.tab-content').forEach(el=>obs.observe(el,{attributes:true,attributeFilter:['class']}));
  }
  function registerServiceWorker(){
    if(!('serviceWorker' in navigator)||!/^https?:$/.test(location.protocol))return;
    window.addEventListener('load',()=>navigator.serviceWorker.register(window.__VG_SW_URL__||'/service-worker.js?vg=35.8',{scope:'/',updateViaCache:'none'}).then(reg=>{
      reg.update().catch(()=>{});
      if(reg.waiting) reg.waiting.postMessage({type:'SKIP_WAITING'});
    }).catch(e=>console.warn('Service worker não registado',e)));
    navigator.serviceWorker.addEventListener('controllerchange',()=>{try{sessionStorage.setItem('vg_sw_updated_v30','1');}catch(e){}});
  }

  function wireEvents(){
    window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;updateInstallVisibility();});
    window.addEventListener('appinstalled',()=>{deferredInstall=null;hideInstall();updateInstallVisibility();showSync('VG Operations instalada.');});
    window.addEventListener('online',()=>showSync('Ligação recuperada. Podes atualizar os dados.'));
    window.addEventListener('offline',()=>showSync('Sem ligação. Modo offline da aplicação ativo.',true));
    window.matchMedia?.(MOBILE).addEventListener?.('change',()=>{closeMore();updateInstallVisibility();updateActive();});
    window.addEventListener('resize',()=>{if(!isMobile())closeMore();});
  }

  function init(){
    createUI();observeViews();wireEvents();registerServiceWorker();updateActive();updateSyncLine();
    setTimeout(updateActionBadge,1200);
    badgeTimer=setInterval(updateActionBadge,60000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();

  window.vgMobileGo=go;
  window.vgMobileMoreOpen=openMore;
  window.vgMobileMoreClose=closeMore;
  window.vgMobileSync=syncNow;
  window.vgInstallApp=installApp;
})();
