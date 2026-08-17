// ==========================================================
// VG OPERATIONS 2.0 / V30 — PRODUTO CONSOLIDADO
// Simplifica navegação, cria Home por perfil e integra Hotel 360º / Revenue Hub.
// Regra de produto: os Comentários Fecho do Mês permanecem independentes; a página Hotéis volta a estar disponível.
// ==========================================================
(function(){
  'use strict';
  window.VG=window.VG||{};
  if(window.VG.operations2?.buildVersion>=34.0)return;
  const esc=v=>window.VG?.util?.escapeHtml?window.VG.util.escapeHtml(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const n=v=>{const x=Number(v);return Number.isFinite(x)?x:null;};
  const money=v=>window.VG?.market?.formatMoneyCompact?window.VG.market.formatMoneyCompact(v,2):(()=>{const x=n(v);if(x==null)return '—';const a=Math.abs(x),s=x<0?'-':'';if(a>=1e6)return `${s}€${(a/1e6).toLocaleString('pt-PT',{maximumFractionDigits:2})}M`;if(a>=1000)return `${s}€${(a/1000).toLocaleString('pt-PT',{maximumFractionDigits:0})}K`;return `${s}€${a.toLocaleString('pt-PT',{maximumFractionDigits:0})}`;})();
  const user=()=>{try{return typeof window.vgAuthCurrent==='function'?window.vgAuthCurrent():null;}catch(e){return null;}};
  const direction=()=>{const u=user();return !!u&&['direcao','admin'].includes(u.role);};
  const legacyHidden=['kpis','ocupacao','hotelperformance','revenueint','forecast','scenariocompare','costanalysis','cua','compare','ranking','sazonalidade','simulador','orcamento','alertas','analyticalassistant'];

  function button(id,icon,label,handler){const b=document.createElement('button');b.className='sb-nav-btn';b.id='nav-'+id;b.innerHTML=`<span class="sb-nav-icon">${icon}</span> ${label}`;b.addEventListener('click',handler);return b;}
  function group(label,ids){const g=document.createElement('div');g.className='sb-nav-group v30-nav-group';g.innerHTML=`<div class="sb-nav-group-label">${label}</div>`;for(const id of ids){const el=document.getElementById('nav-'+id);if(el){el.style.display='';g.appendChild(el);}}return g;}
  const v32MenuCompatibility=['receitas','custos','pl','unitEconomics','compras']; // ordem canónica V32 preservada para compatibilidade
  function simplifyNavigation(){
    const nav=document.querySelector('.sb-nav');if(!nav||nav.dataset.v30Version==='30.4')return;nav.dataset.v30='1';nav.dataset.v30Version='30.4';
    legacyHidden.forEach(id=>{const x=document.getElementById('nav-'+id);if(x)x.style.display='none';});
    let h360=document.getElementById('nav-hotel360');if(!h360){h360=button('hotel360','◉','Hotel 360º',()=>window.setView?.('hotel360'));}
    let rh=document.getElementById('nav-revenuehub');if(!rh){rh=button('revenuehub','◈','Revenue & Forecast',()=>window.setView?.('revenuehub'));}
    let act=document.getElementById('nav-actions-v30');if(!act){act=button('actions-v30','✓','Ações',()=>window.VG?.actions?.openBoard?.());}
    let rd33=document.getElementById('nav-receitasdet');if(!rd33){rd33=button('receitasdet','↗','Receita Detalhada',()=>window.setView?.('receitasdet'));}
    let ab33=document.getElementById('nav-ab');if(!ab33){ab33=button('ab','◫','Compras & A&B',()=>window.setView?.('ab'));}
    let hk33=document.getElementById('nav-housekeeping');if(!hk33){hk33=button('housekeeping','▦','Housekeeping',()=>window.setView?.('housekeeping'));}
    // V30.1: preservar os botões ANTES de remover os grupos antigos.
    // Na V30 os grupos eram eliminados primeiro, retirando também os botões do DOM;
    // os novos grupos ficavam assim apenas com os títulos.
    const preservedButtons=Array.from(nav.querySelectorAll('.sb-nav-btn'));
    preservedButtons.forEach(el=>nav.appendChild(el));
    nav.querySelectorAll('.sb-nav-group').forEach(g=>g.remove());
    nav.appendChild(group('Início & Hotéis',['resumo','hoteis','fichahotel']));
    document.getElementById('nav-fichahotel')?.after(h360);
    nav.appendChild(group('Gestão',['agenda','approvals','cityledger']));document.getElementById('nav-agenda')?.before(act);
    nav.appendChild(group('Análise',['receitas','receitasdet','custos','pl','unitEconomics','benchmark','anomalies']));document.getElementById('nav-pl')?.after(rh);
    nav.appendChild(group('Operação Integrada',['receitasdet','ab','housekeeping','reputacao']));
    nav.appendChild(group('Compras',['compras']));
    nav.appendChild(group('Qualidade & Comunicação',['instagram']));
    nav.appendChild(group('Suporte',['documents','automaticreports']));
    nav.appendChild(group('Administração',['datacenter','governance','backup','upload']));
    const legacy=document.createElement('div');legacy.id='v30LegacyNav';legacy.hidden=true;for(const id of legacyHidden){const x=document.getElementById('nav-'+id);if(x)legacy.appendChild(x);}nav.appendChild(legacy);window.vgAuthApplyMenuPermissions?.();
  }
  function installAssistantTop(){
    if(document.getElementById('v30TopAssistant'))return;const header=document.querySelector('header');if(!header)return;
    const b=document.createElement('button');b.id='v30TopAssistant';b.className='v30-top-assistant';b.type='button';b.innerHTML='✦ <span>Perguntar aos dados</span>';b.onclick=()=>window.VG?.analyticalAssistant?.open?.();
    const anchor=header.querySelector('.theme-dots');if(anchor)anchor.before(b);else header.appendChild(b);if(typeof window.vgAuthCanAccessModule==='function'&&window.vgAuthCurrent?.()&&!window.vgAuthCanAccessModule('analyticalassistant'))b.style.display='none';
  }
  function installSetViewRouter(){
    if(window.__VG_V30_ORIGINAL_SET_VIEW__||typeof window.setView!=='function')return;
    const original=window.setView.bind(window);window.__VG_V30_ORIGINAL_SET_VIEW__=original;
    window.setView=function(v){
      if(v==='recdet')v='receitasdet';
      if(v==='hotelperformance'){
        const h=window.VG?.hotelPerformance?.state?.hotel||window.VG?.hotel360?.state?.hotel||'';if(h&&window.VG?.hotel360)window.VG.hotel360.state.hotel=h;original('hotel360');hideEmpty();setTimeout(()=>window.VG?.hotel360?.render?.(),15);return;
      }
      if(['revenueint','forecast','scenariocompare'].includes(v)){
        const tab=window.VG?.revenueHub?.tabForLegacy?.(v)||(v==='forecast'?'forecast':v==='scenariocompare'?'scenarios':'current');if(window.VG?.revenueHub)window.VG.revenueHub.state.tab=tab;original('revenuehub');hideEmpty();setTimeout(()=>window.VG?.revenueHub?.render?.(),15);return;
      }
      original(v);if(v==='hotel360'){hideEmpty();setTimeout(()=>window.VG?.hotel360?.render?.(),15);}if(v==='revenuehub'){hideEmpty();setTimeout(()=>window.VG?.revenueHub?.render?.(),15);}if(['receitasdet','ab','housekeeping','reputacao'].includes(v)){hideEmpty();setTimeout(()=>window.VG?.domains33?.refresh?.(v),20);}if(v==='resumo')setTimeout(renderProfileHome,20);
    };
  }
  function hideEmpty(){const e=document.getElementById('emptyState');if(e){e.style.display='none';e.classList.add('agenda-hidden');}}
  function portfolioHotels(){
    const hp=window.VG?.hotelPerformance;
    try{
      if(typeof getActiveHotels==='function'){const active=getActiveHotels();if(Array.isArray(active))return active.slice();}
    }catch(e){}
    try{
      if(typeof RAW!=='undefined'&&Array.isArray(RAW?.hotel_list)&&typeof selectedHotels!=='undefined'&&selectedHotels?.has)return RAW.hotel_list.filter(h=>selectedHotels.has(h));
    }catch(e){}
    return hp?.allHotels?.()||[];
  }
  function portfolioScopeLabel(hotels){
    try{
      const market=window.VG?.market?.def?.();
      if(market){const r=typeof activeRegion!=='undefined'&&activeRegion?activeRegion:'todos';const rl=window.VG.market.regionLabel?.(r)||r;return r==='todos'?market.label:`${market.label} · ${rl}`;}
    }catch(e){}
    const labels={todos:'Todos',norte:'Norte',lisboa:'Lisboa',alentejo:'Alentejo',algarve:'Algarve'};
    try{if(typeof activeRegion!=='undefined'&&activeRegion&&labels[activeRegion])return labels[activeRegion];}catch(e){}
    return `${hotels.length} unidade${hotels.length===1?'':'s'} selecionada${hotels.length===1?'':'s'}`;
  }
  function buildDirectionHome(){
    const hp=window.VG?.hotelPerformance,sc=window.VG?.operationalScore;if(!hp?.buildModel)return '<div class="v30-home-empty">A preparar leitura executiva…</div>';
    const hs=portfolioHotels(),models=hs.map(h=>hp.buildModel(h)).filter(x=>x.available);let critical=0,attention=0,stable=0,overdue=0,totalRisk=0,scores=[];
    for(const m of models){if(m.status?.level==='critical')critical++;else if(m.status?.level==='attention')attention++;else stable++;overdue+=m.actionInfo?.overdue?.length||0;const s=sc?.calculate?.(m);if(s?.available)scores.push(s.score);if(n(m.forecast?.revenueAtRisk)>0)totalRisk+=m.forecast.revenueAtRisk;}
    const avg=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):null;const priority=models.slice().sort((a,b)=>(a.status?.level==='critical'?0:a.status?.level==='attention'?1:2)-(b.status?.level==='critical'?0:b.status?.level==='attention'?1:2)||(b.actionInfo?.overdue?.length||0)-(a.actionInfo?.overdue?.length||0)).slice(0,5);
    const scope=portfolioScopeLabel(hs);
    return `<section class="v30-profile-home direction"><header><div><span>VG Operations 2.0</span><h2>Portefólio${scope?` · ${esc(scope)}`:''}</h2><p>${hs.length} unidade${hs.length===1?'':'s'} no filtro atual · onde a Direção deve atuar primeiro.</p></div><button onclick="VG.notifications.open()">🔔 Notificações</button></header><div class="v30-home-kpis"><article class="critical"><span>Críticos</span><strong>${critical}</strong></article><article class="attention"><span>Atenção</span><strong>${attention}</strong></article><article><span>Estáveis</span><strong>${stable}</strong></article><article><span>Receita em risco</span><strong>${money(totalRisk)}</strong></article><article><span>Ações vencidas</span><strong>${overdue}</strong></article><article><span>Score médio</span><strong>${avg==null?'—':avg+'/100'}</strong></article></div><div class="v30-home-priority"><strong>Prioridades do portefólio</strong>${priority.length?priority.map(m=>{const s=sc?.calculate?.(m);return `<button data-v30-hotel="${esc(m.hotel)}"><span><b>${esc(m.hotel)}</b><small>${esc(m.status?.reasons?.[0]||m.status?.text||'')}</small></span><em>${s?.available?s.score+'/100':esc(m.status?.label||'—')}</em></button>`;}).join(''):'<div class="v30-home-ok">✓ Sem prioridades materiais no filtro atual.</div>'}</div></section>`;
  }
  function buildHotelHome(u){
    const hp=window.VG?.hotelPerformance,sc=window.VG?.operationalScore;if(!hp?.buildModel)return '<div class="v30-home-empty">A preparar hotel…</div>';const m=hp.buildModel(u.hotel);if(!m?.available)return '<div class="v30-home-empty">Sem dados suficientes para a unidade associada.</div>';const s=sc?.calculate?.(m),f=m.forecast||{},notifs=window.VG?.notifications?.items?.().filter(x=>!x.hotel||String(x.hotel).toUpperCase()===String(m.hotel).toUpperCase()).slice(0,3)||[];
    return `<section class="v30-profile-home hotel"><header><div><span>VG Operations 2.0</span><h2>${esc(m.hotel)}</h2><p>${esc(u.name||u.user||'')} · ${esc(m.status?.label||'')}</p></div><button data-v30-hotel="${esc(m.hotel)}">Abrir Hotel 360º →</button></header><div class="v30-home-kpis"><article class="${esc(s?.status||'')}"><span>Score</span><strong>${s?.available?s.score+'/100':'—'}</strong></article><article><span>Situação</span><strong>${esc(m.status?.label||'—')}</strong></article><article><span>Ações abertas</span><strong>${m.actionInfo?.active?.length||0}</strong></article><article class="critical"><span>Vencidas</span><strong>${m.actionInfo?.overdue?.length||0}</strong></article><article><span>Forecast OCC</span><strong>${n(f.forecast)==null?'—':f.forecast.toLocaleString('pt-PT',{maximumFractionDigits:1})+'%'}</strong></article><article><span>Gap meta</span><strong>${n(f.gap)==null?'—':(f.gap>=0?'+':'')+f.gap.toLocaleString('pt-PT',{maximumFractionDigits:1})+' p.p.'}</strong></article></div><div class="v30-home-priority"><strong>Assuntos que precisam de atenção</strong>${notifs.length?notifs.map(x=>`<button onclick="VG.notifications.open()"><span><b>${esc(x.title)}</b><small>${esc(x.detail||'')}</small></span><em>${x.level==='urgent'?'URGENTE':'VER'}</em></button>`).join(''):`<div class="v30-home-ok">✓ Sem notificações prioritárias neste momento.</div>`}</div></section>`;
  }
  function integratedLauncher(){return `<section class="v33-integrated-launcher"><header><div><span>V35.8 · Estável</span><strong>Novos módulos já disponíveis</strong><small>Reputação semanal/semestral, Receita Detalhada, Compras &amp; A&amp;B e Housekeeping têxtil.</small></div><em>ATIVO</em></header><div class="v33-launch-grid"><button data-v33-open="reputacao"><b>★</b><span>Reputação &amp; Guest Experience<small>Executiva · semanal · semestral · hotel</small></span></button><button data-v33-open="receitasdet"><b>↗</b><span>Receita Detalhada<small>PdV · família · grupo · artigo</small></span></button><button data-v33-open="ab"><b>◫</b><span>Compras &amp; A&amp;B<small>Custos · stock · fichas · inteligência</small></span></button><button data-v33-open="housekeeping"><b>▦</b><span>Housekeeping &amp; Têxtil<small>Inventário · quebras · campanhas · compras</small></span></button></div></section>`;}
  function renderProfileHome(){const root=document.getElementById('v30ProfileHomeRoot');if(!root)return;const u=user();if(!u){root.innerHTML='';return;}const multi=Array.isArray(u.hotels)&&u.hotels.filter(h=>h&&h!=='*').length>1;root.innerHTML=((direction()||multi)?buildDirectionHome():buildHotelHome(u))+integratedLauncher();root.querySelectorAll('[data-v30-hotel]').forEach(b=>b.addEventListener('click',()=>window.VG?.hotel360?.openFor?.(b.dataset.v30Hotel)));root.querySelectorAll('[data-v33-open]').forEach(b=>b.addEventListener('click',()=>window.setView?.(b.dataset.v33Open)));}
  function updateMobile(){
    const more=document.getElementById('vgMobileMore');if(!more)return;more.querySelectorAll('[data-view="hotelperformance"]').forEach(b=>{b.dataset.view='hotel360';b.querySelector('span')?.childNodes?.forEach?.(()=>{});const s=b.querySelector('span');if(s)s.innerHTML='Hotel 360º<small>Visão integrada da unidade</small>';});
    more.querySelectorAll('[data-view="forecast"],[data-view="scenariocompare"],[data-view="revenueint"]').forEach((b,i)=>{if(i===0){b.dataset.view='revenuehub';const s=b.querySelector('span');if(s)s.innerHTML='Revenue & Forecast<small>Situação, forecast e cenários</small>';}else b.style.display='none';});
    more.querySelectorAll('[data-view="alertas"]').forEach(b=>b.style.display='none');
    const addMobile=(view,icon,title,detail)=>{if(more.querySelector(`[data-view="${view}"]`))return;const b=document.createElement('button');b.type='button';b.dataset.view=view;b.innerHTML=`<b>${icon}</b><span>${title}<small>${detail}</small></span>`;b.addEventListener('click',()=>{window.setView?.(view);document.getElementById('vgMobileMorePanel')?.classList.remove('open');});more.appendChild(b);};
    addMobile('receitasdet','↗','Receita Detalhada','PdV, família, grupo e artigo');
    addMobile('ab','◫','Compras & A&B','Custos, stock, fichas técnicas e inteligência');
    addMobile('housekeeping','▦','Housekeeping','Inventário têxtil, quebras e campanhas');
  }
  function refreshAllV30(){renderProfileHome();updateMobile();window.vgAuthApplyMenuPermissions?.();}
  function init(){simplifyNavigation();installAssistantTop();installSetViewRouter();updateMobile();window.vgAuthApplyMenuPermissions?.();setTimeout(refreshAllV30,250);setTimeout(refreshAllV30,1600);window.VG?.operationalScore?.ensureConfig?.(false).then(()=>renderProfileHome());}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.VG.operations2={version:30.4,buildVersion:34.0,simplifyNavigation,renderProfileHome,refresh:refreshAllV30,portfolioHotels,portfolioScopeLabel,buildDirectionHome};
  window.VG.events?.on?.('state:changed',()=>{if(typeof currentView!=='undefined'&&currentView==='resumo')setTimeout(renderProfileHome,50);});
  window.VG.events?.on?.('actions:changed',()=>{if(typeof currentView!=='undefined'&&currentView==='resumo')setTimeout(renderProfileHome,50);});
  window.VG.events?.on?.('score-config:ready',()=>renderProfileHome());
  window.VG.events?.on?.('score-config:changed',()=>renderProfileHome());
})();
