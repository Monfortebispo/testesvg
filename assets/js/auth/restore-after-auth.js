
(function(){
  var _vgRestoreStarted = false;
  function runRestore(){
    if (_vgRestoreStarted) return; // corre só uma vez (DOMContentLoaded ou load, o que vier primeiro)
    _vgRestoreStarted = true;
    // Rede de segurança passiva: só fecha o espelho se algo ficar mesmo preso (60s).
    // O fecho normal acontece quando o carregamento real termina (idbAutoRestore/fetchSharedData).
    try { setTimeout(function(){ if (typeof vgFinishStartup === 'function') vgFinishStartup(); }, 60000); } catch(e){}
    try { if (typeof window.currentRegion === 'undefined') window.currentRegion = 'todos'; } catch(e) {}
    // Mostra indicador de carregamento enquanto o restauro decorre
    try { if (typeof vgShowLoading === 'function') vgShowLoading('A obter dados…', 'A ligar ao servidor partilhado e a carregar os meses.'); } catch(e){}
    // Await idbAutoRestore so it completes before the visibility fallback runs
    if (typeof idbAutoRestore === 'function') {
      idbAutoRestore().then(function() {
        // After IDB restore completes, ensure the latest available month is visible
        try {
          if (typeof STORE !== 'undefined' && typeof selectedMeses !== 'undefined') {
            var avail = Object.keys(STORE).map(Number).filter(function(x){ return x > 0; });
            if (avail.length > 0 && selectedMeses.size === 0) {
              selectedMeses.add(Math.max.apply(null, avail));
              if (typeof buildMesButtons === 'function') buildMesButtons();
              if (typeof applyMesSelection === 'function') applyMesSelection();
            }
          }
        } catch(e2) { console.warn('Fallback de visibilidade falhou', e2); }
        try { if (typeof vgFinishStartup === 'function') vgFinishStartup(); } catch(e3){}
      }).catch(function(e) {
        console.warn('Restauro automático falhou', e);
        try { if (typeof vgFinishStartup === 'function') vgFinishStartup(); } catch(e3){}
      });
    } else {
      try { if (typeof vgFinishStartup === 'function') vgFinishStartup(); } catch(e){}
    }
    var _skip_embedded_fallback = true; // handled in .then() above
    // Garantir o mês mais recente visível mesmo sem sessão (só se idbAutoRestore não tratou)
    if (typeof _skip_embedded_fallback === 'undefined') {
      try {
        if (typeof STORE !== 'undefined' && typeof selectedMeses !== 'undefined' && typeof buildMesButtons === 'function') {
          var avail = Object.keys(STORE).map(Number).filter(function(x){ return x > 0; });
          if (avail.length > 0 && selectedMeses.size === 0) {
            selectedMeses.add(Math.max.apply(null, avail));
          }
          buildMesButtons();
          if (selectedMeses.size > 0 && typeof applyMesSelection === 'function') applyMesSelection();
        }
      } catch(e) { console.warn('Carregamento de visibilidade falhou', e); }
    }
    // Re-init agenda se for a view actual
    try {
      if (typeof currentView !== 'undefined' && currentView === 'agenda' && typeof calInit === 'function') calInit();
    } catch(e) {}
  }
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(runRestore, 700); });
  window.addEventListener('load', function(){ setTimeout(runRestore, 1000); });
})();
