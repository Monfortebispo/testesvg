// ==========================================================
// VG DASHBOARD — RUNTIME INTERNO v13
// Namespace mínimo para eventos e utilitários transversais.
// Mantém compatibilidade com as funções globais existentes.
// ==========================================================
(function(){
  'use strict';
  const VG = window.VG = window.VG || {};
  const bus = new EventTarget();

  VG.version = '13.0';
  window.SHARED_API_URL = window.SHARED_API_URL || '/.netlify/functions/dashboard-sessao';
  VG.shared = VG.shared || { endpoint: window.SHARED_API_URL };
  VG.events = VG.events || {
    on(name, handler){ bus.addEventListener(name, handler); return () => bus.removeEventListener(name, handler); },
    once(name, handler){ bus.addEventListener(name, handler, {once:true}); },
    emit(name, detail){ bus.dispatchEvent(new CustomEvent(name, {detail: detail || {}})); }
  };

  VG.state = VG.state || {
    changed(reason, detail){
      VG.events.emit('state:changed', Object.assign({reason: reason || 'unknown', at: Date.now()}, detail || {}));
    },
    currentYear(){
      try { if (typeof YR_CUR !== 'undefined' && YR_CUR) return String(YR_CUR); } catch(e){}
      return String(new Date().getFullYear());
    },
    previousYear(){
      try { if (typeof YR_PREV !== 'undefined' && YR_PREV) return String(YR_PREV); } catch(e){}
      return String(Number(VG.state.currentYear()) - 1);
    },
    selectedMonths(){
      try { if (typeof selectedMeses !== 'undefined' && selectedMeses && selectedMeses.size) return Array.from(selectedMeses).map(Number).filter(Boolean).sort((a,b)=>a-b); } catch(e){}
      try { return Object.keys(typeof STORE !== 'undefined' ? STORE : {}).map(Number).filter(Boolean).sort((a,b)=>a-b); } catch(e){ return []; }
    }
  };

  VG.util = VG.util || {
    clone(value){ return value == null ? value : JSON.parse(JSON.stringify(value)); },
    monthName(month){
      const names=['','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
      return names[Number(month)] || String(month);
    },
    escapeHtml(value){
      return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }
  };
})();
