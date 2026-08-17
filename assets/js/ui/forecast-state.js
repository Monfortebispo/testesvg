// ==========================================================
// Aviso de previsão/orçamento — consolidado na v5
// Atualização por eventos de estado, sem wrappers de funções globais.
// ==========================================================
(function(){
  'use strict';
  let installed=false;
  const MONTHS=['','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const qs=(s,root)=>(root||document).querySelector(s);
  const qsa=(s,root)=>Array.from((root||document).querySelectorAll(s));
  const curYear=()=>window.VG?.state?.currentYear?.() || String(new Date().getFullYear());
  const prevYear=()=>window.VG?.state?.previousYear?.() || String(Number(curYear())-1);

  function storeMonths(){
    try { return Object.keys(typeof STORE!=='undefined'?STORE:{}).map(Number).filter(Boolean).sort((a,b)=>a-b); }
    catch(e){ return []; }
  }
  function selectedMonths(){
    const fromState=window.VG?.state?.selectedMonths?.();
    if(fromState && fromState.length) return fromState;
    const active=[];
    qsa('.sb-mes-btn.active, #gfbMesBtns button.active').forEach(function(btn){
      let m=Number(((btn.id||'').match(/(\d{1,2})$/)||[])[1]);
      if(!m){ const low=btn.textContent.toLowerCase(); MONTHS.forEach((n,i)=>{ if(i&&low.includes(n.toLowerCase())) m=i; }); }
      if(m) active.push(m);
    });
    return active.length?Array.from(new Set(active)).sort((a,b)=>a-b):storeMonths();
  }
  function monthHasRealCurrent(m){
    try {
      const store=(typeof STORE!=='undefined'?STORE:{})[Number(m)];
      if(!store || store['__orc_forecast__']) return false;
      const y=curYear();
      return (store.hotel_list||[]).some(function(h){
        const v=store.hotels_ops?.[h]?.['Receita Total']?.[y];
        return v!=null && Number(v)>0;
      });
    } catch(e){ return false; }
  }
  function monthIsForecast(m){
    m=Number(m); if(!m || monthHasRealCurrent(m)) return false;
    const now=new Date(), y=Number(curYear()), currentY=now.getFullYear(), currentM=now.getMonth()+1;
    const notClosedByDate=currentY<y ? true : (currentY===y ? m>=currentM : false);
    const fixedBudget=m>=7;
    return notClosedByDate || fixedBudget;
  }
  function insertAfter(ref,node){ if(ref?.parentNode) ref.parentNode.insertBefore(node,ref.nextSibling); }
  function ensureTopPill(){
    let pill=qs('#v17ForecastTopbarPill'); if(pill) return pill;
    pill=document.createElement('div'); pill.id='v17ForecastTopbarPill'; pill.className='v17-prev-top-pill'; pill.textContent='⚠ Previsão';
    (qs('.topbar-right')||qs('.topbar-center')||qs('.topbar'))?.appendChild(pill); return pill;
  }
  function ensureWarning(){
    let box=qs('#v17ForecastWarning'); if(box) return box;
    box=document.createElement('div'); box.id='v17ForecastWarning'; box.className='v17-prev-warning'; box.setAttribute('role','status'); box.setAttribute('aria-live','polite');
    box.innerHTML='<div class="ico">⚠</div><div><div class="title">Período com previsão</div><div class="txt" id="v17ForecastWarningText"></div></div>';
    const gfb=qs('#globalFilterBar'), main=qs('.main'); if(gfb) insertAfter(gfb,box); else if(main) main.insertBefore(box,main.firstChild); else document.body.insertBefore(box,document.body.firstChild);
    return box;
  }
  function ensureOrcNote(){
    const view=qs('#view-orcamento'); if(!view) return null;
    let note=qs('#v17ForecastOrcNote'); if(!note){ note=document.createElement('div'); note.id='v17ForecastOrcNote'; note.className='v17-prev-orc-note'; view.insertBefore(note,view.firstChild); }
    note.textContent='Atenção: julho a dezembro são previsão/orçamento. Regra aplicada: receitas = '+prevYear()+' × 1,05; custos = '+prevYear()+' × 1,08.';
    return note;
  }
  function badgeMonthButtons(months){
    qsa('.v17-prev-month-badge').forEach(b=>b.remove());
    qsa('.sb-mes-btn, #gfbMesBtns button, .mes-btn').forEach(function(btn){
      let m=Number(((btn.id||'').match(/(\d{1,2})$/)||[])[1]);
      if(!m){ const low=btn.textContent.toLowerCase(); MONTHS.forEach((n,i)=>{ if(i&&low.includes(n.toLowerCase())) m=i; }); }
      if(m && months.includes(m) && !btn.textContent.includes('Prev.')){
        const b=document.createElement('span'); b.className='v17-prev-month-badge'; b.textContent='Prev.'; btn.appendChild(b);
      }
    });
  }
  function update(){
    const months=Array.from(new Set(selectedMonths().filter(monthIsForecast))).sort((a,b)=>a-b), has=months.length>0;
    const box=ensureWarning(), txt=qs('#v17ForecastWarningText'), pill=ensureTopPill(), note=ensureOrcNote();
    box?.classList.toggle('visible',has); pill?.classList.toggle('visible',has);
    note?.classList.toggle('visible',has && selectedMonths().some(m=>Number(m)>=7));
    badgeMonthButtons(months);
    if(txt&&has){
      const labels=months.map(m=>MONTHS[m]||String(m)).join(', '), hasBudget=months.some(m=>Number(m)>=7);
      let msg='Está a visualizar '+labels+'. Estes valores não devem ser tratados como fecho real.';
      msg+=hasBudget ? ' Para julho a dezembro aplica-se a regra de orçamento: receitas = '+prevYear()+' × 1,05 e custos = '+prevYear()+' × 1,08.' : ' O mês em curso/futuro ainda está aberto e pode mudar.';
      txt.textContent=msg;
    }
  }
  let timer=null;
  function schedule(delay=80){ clearTimeout(timer); timer=setTimeout(update,delay); }
  function install(){
    if(installed) return; installed=true;
    ensureTopPill(); ensureWarning(); ensureOrcNote();
    window.VG?.events?.on('state:changed',()=>schedule(60));
    document.addEventListener('click',function(ev){ if(ev.target?.closest?.('.sb-mes-btn,#gfbMesBtns button,.mes-btn,.sb-nav-btn')) schedule(100); },true);
    document.addEventListener('change',()=>schedule(120),true);
    update(); setTimeout(update,500); setTimeout(update,1500);
    window.vgUpdateForecastWarning=update;
    console.info('[VG v5] Aviso de previsão consolidado carregado.');
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install); else install();
})();
