// ==========================================================
// VG OPERATIONS 2.0 / V30 — REVENUE & FORECAST HUB
// Une Revenue Intelligence, Forecast & Cenários e Comparação de Cenários.
// As views legadas continuam no código para compatibilidade, mas deixam o menu.
// ==========================================================
(function(){
  'use strict';
  window.VG=window.VG||{};
  if(window.VG.revenueHub?.version>=30.3)return;
  const state={tab:'current',mounted:false};
  const MAP={current:'revenueint',forecast:'forecast',scenarios:'scenariocompare'};
  const LABEL={current:'Situação atual',forecast:'Forecast',scenarios:'Cenários'};
  function panel(id){return document.getElementById('v30RevenuePanel-'+id);}
  function source(id){return document.getElementById('view-'+id);}
  function mount(){
    if(state.mounted)return;const root=document.getElementById('revenueHubRoot');if(!root)return;
    for(const [tab,id] of Object.entries(MAP)){
      const p=panel(tab),s=source(id);if(!p||!s)continue;
      // V30.3: preservar o wrapper original (#view-revenueint/#view-forecast/
      // #view-scenariocompare). Os estilos históricos são intencionalmente
      // scoped a estes IDs; mover apenas os filhos retirava todo o layout.
      s.classList.remove('tab-content','active');
      s.classList.add('v30-embedded-view');
      s.dataset.v30Embedded=tab;
      s.removeAttribute?.('hidden');
      s.style.display='';
      if(s.parentNode!==p)p.appendChild(s);
    }
    state.mounted=true;
  }
  function renderActive(){
    try{if(state.tab==='current'&&typeof window.riRender==='function')window.riRender();}catch(e){console.warn('Revenue Hub RI',e);}
    try{if(state.tab==='forecast'&&typeof window.forecastRender==='function')window.forecastRender();}catch(e){console.warn('Revenue Hub Forecast',e);}
    try{if(state.tab==='scenarios'&&typeof window.scenarioComparisonRender==='function')window.scenarioComparisonRender();}catch(e){console.warn('Revenue Hub Cenários',e);}
  }
  function setTab(tab){
    if(!MAP[tab])tab='current';state.tab=tab;mount();
    document.querySelectorAll('#revenueHubRoot [data-rh-tab]').forEach(b=>b.classList.toggle('active',b.dataset.rhTab===tab));
    document.querySelectorAll('#revenueHubRoot .v30-revenue-panel').forEach(p=>p.classList.toggle('active',p.id==='v30RevenuePanel-'+tab));
    requestAnimationFrame(()=>{renderActive();window.VG?.performance?.resizeVisibleCharts?.();});
  }
  function render(){mount();setTab(state.tab);}
  function open(tab='current'){state.tab=MAP[tab]?tab:'current';if(typeof window.__VG_V30_ORIGINAL_SET_VIEW__==='function')window.__VG_V30_ORIGINAL_SET_VIEW__('revenuehub');else window.setView?.('revenuehub');setTimeout(render,20);}
  function tabForLegacy(v){return v==='forecast'?'forecast':v==='scenariocompare'?'scenarios':'current';}
  function init(){const root=document.getElementById('revenueHubRoot');if(!root)return;root.querySelectorAll('[data-rh-tab]').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.rhTab)));mount();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.VG.revenueHub={version:30.3,state,mount,render,setTab,open,tabForLegacy};
})();
