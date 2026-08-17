// ==========================================================
// Ferramentas operacionais transversais — consolidadas na v5
// Ferramentas operacionais transversais, sem wrappers de funções globais.
// ==========================================================
(function(){
  'use strict';
  let booted=false;
  const qs=(sel,root)=>(root||document).querySelector(sel);
  const qsa=(sel,root)=>Array.from((root||document).querySelectorAll(sel));

  function toast(msg,bad){
    try { if(typeof window.showToast==='function') return window.showToast(msg,!!bad); } catch(e){}
    (bad?console.error:console.log)(msg);
  }

  function safeSetView(view){
    try { if(typeof window.setView==='function') window.setView(view); }
    catch(e){ console.error('[VG v5] erro ao mudar vista',e); }
  }

  function ensureCuaPanel(){
    const view=qs('#view-cua');
    if(!view || qs('#v17CuaPanel')) return;
    const panel=document.createElement('div');
    panel.id='v17CuaPanel';
    panel.className='v17-cua-panel';
    panel.innerHTML=''+
      '<div class="v17-cua-head">'+
        '<div><div class="v17-cua-title">Custo / Actividade — leitura operacional</div>'+
        '<div class="v17-cua-desc">Atalhos para chegar rapidamente aos desvios por hotel, rubrica e artigo. A lógica de cálculo original foi mantida.</div></div>'+
        '<div class="v17-cua-actions">'+
          '<button type="button" data-tab="resumo">Resumo</button>'+
          '<button type="button" data-tab="ranking">Ranking hotéis</button>'+
          '<button type="button" data-tab="rubrica">Rubricas</button>'+
          '<button type="button" data-action="artigos" class="primary">Artigos com desvio</button>'+
        '</div></div>';
    view.insertBefore(panel,view.firstChild);
    panel.addEventListener('click',function(ev){
      const btn=ev.target.closest('button'); if(!btn) return;
      const tab=btn.getAttribute('data-tab');
      if(tab && typeof window.cuaSetTab==='function'){
        try { window.cuaSetTab(tab); } catch(e){ console.warn('[VG v5] CUA tab',e); }
      }
      if(btn.getAttribute('data-action')==='artigos'){
        safeSetView('cua');
        setTimeout(function(){
          try {
            if(typeof window.cuaAnswerArtigos==='function') return window.cuaAnswerArtigos();
            if(typeof window.cuaPerguntar==='function') return window.cuaPerguntar('artigos com desvio');
          } catch(e){ console.warn('[VG v5] artigos com desvio',e); }
          toast('Não encontrei a função de artigos com desvio nesta versão.',true);
        },180);
      }
    });
  }

  function enhanceChartDefaults(){
    try {
      if(!window.Chart || !window.Chart.defaults) return;
      window.Chart.defaults.font=window.Chart.defaults.font||{};
      window.Chart.defaults.font.family="'Plus Jakarta Sans', Arial, sans-serif";
      window.Chart.defaults.font.size=12;
      window.Chart.defaults.plugins=window.Chart.defaults.plugins||{};
      window.Chart.defaults.plugins.legend=window.Chart.defaults.plugins.legend||{};
      window.Chart.defaults.plugins.legend.labels=window.Chart.defaults.plugins.legend.labels||{};
      window.Chart.defaults.plugins.legend.labels.boxWidth=10;
      window.Chart.defaults.plugins.legend.labels.boxHeight=10;
      window.Chart.defaults.plugins.tooltip=window.Chart.defaults.plugins.tooltip||{};
      window.Chart.defaults.plugins.tooltip.padding=10;
      window.Chart.defaults.plugins.tooltip.titleFont={size:12,weight:'700'};
      window.Chart.defaults.plugins.tooltip.bodyFont={size:12};
    } catch(e){ console.warn('[VG v5] Chart defaults',e); }
  }

  function syncSessionInputs(){
    qsa('input[type="file"]').forEach(function(input){
      const acc=input.getAttribute('accept')||'';
      if(acc==='.json') input.setAttribute('accept','.json,.zip');
    });
    qsa('label.sb-action-btn').forEach(function(label){
      if(label.textContent.indexOf('Importar sessão (.json)')>=0){
        label.childNodes.forEach(function(n){
          if(n.nodeType===3 && n.nodeValue.indexOf('Importar sessão')>=0) n.nodeValue=' Importar sessão (.json/.zip) ';
        });
      }
    });
  }

  function boot(){
    if(booted) return; booted=true;
    ensureCuaPanel();
    enhanceChartDefaults();
    syncSessionInputs();
    if(window.VG?.events){
      VG.events.on('state:changed',function(){ ensureCuaPanel(); });
    }
    console.info('[VG v5] Ferramentas operacionais consolidadas carregadas.');
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
