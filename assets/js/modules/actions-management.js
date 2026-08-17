// ==========================================================
// VG DASHBOARD v8 — GESTÃO DE AÇÕES OPERACIONAIS
// Ações persistidas individualmente em Netlify Blobs.
// ==========================================================
(function(){
  'use strict';

  const REFRESH_MS = 30000;
  const STATUS = {
    open:     {label:'Em análise', cls:'open'},
    progress: {label:'Em curso', cls:'progress'},
    waiting:  {label:'A aguardar', cls:'waiting'},
    resolved: {label:'Resolvido', cls:'resolved'}
  };
  let cache = [];
  let loaded = false;
  let fetchedAt = 0;
  let loadingPromise = null;
  let assignees = [];
  let assigneesLoaded = false;
  let editContext = null;

  function esc(v){ return window.VG?.util?.escapeHtml ? window.VG.util.escapeHtml(v) : String(v ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function norm(v){ return String(v||'').trim().toUpperCase(); }
  function currentUser(){ try{return typeof window.vgAuthCurrent==='function'?window.vgAuthCurrent():null;}catch(e){return null;} }
  function clone(v){ return v==null?v:JSON.parse(JSON.stringify(v)); }
  function todayISO(){ const d=new Date(); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); }
  function dateLabel(v){ if(!v)return 'Sem prazo'; const d=new Date(v+'T12:00:00'); return isNaN(d)?v:d.toLocaleDateString('pt-PT',{day:'2-digit',month:'2-digit',year:'numeric'}); }
  function dateTimeLabel(v){ if(!v)return '—'; const d=new Date(v); return isNaN(d)?v:d.toLocaleString('pt-PT',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
  function statusMeta(v){ return STATUS[v]||STATUS.open; }
  function isActive(a){ return a && a.status!=='resolved'; }
  function isOverdue(a){ return isActive(a) && !!a.dueDate && a.dueDate < todayISO(); }
  function byUpdated(a,b){ return String(b?.updatedAt||b?.createdAt||'').localeCompare(String(a?.updatedAt||a?.createdAt||'')); }
  function byUrgency(a,b){
    const aw=isOverdue(a)?0:a.dueDate?1:2, bw=isOverdue(b)?0:b.dueDate?1:2;
    if(aw!==bw)return aw-bw;
    if(a.dueDate&&b.dueDate&&a.dueDate!==b.dueDate)return a.dueDate.localeCompare(b.dueDate);
    return byUpdated(a,b);
  }

  async function ensureLoaded(force){
    const token = typeof window.vgAuthToken==='function' ? window.vgAuthToken() : '';
    if(!token) return cache;
    if(!force && loaded && Date.now()-fetchedAt<REFRESH_MS) return cache;
    if(loadingPromise) return loadingPromise;
    loadingPromise=(async()=>{
      try{
        const r=await window.VG.shared.get('ops-actions');
        cache=Array.isArray(r?.data)?r.data.filter(Boolean).sort(byUpdated):[];
        loaded=true; fetchedAt=Date.now();
        window.VG.events?.emit('actions:changed',{reason:'loaded',count:cache.length});
        return cache;
      }catch(e){
        console.warn('Não foi possível carregar as ações operacionais.',e);
        return cache;
      }finally{ loadingPromise=null; }
    })();
    return loadingPromise;
  }

  async function ensureAssignees(force){
    if(!force&&assigneesLoaded)return assignees;
    try{
      const r=await window.VG.shared.get('assignees');
      assignees=Array.isArray(r?.data)?r.data.filter(x=>x&&x.active!==false):[];
      assigneesLoaded=true;
    }catch(e){ console.warn('Não foi possível carregar responsáveis.',e); }
    return assignees;
  }

  function all(){ return cache.slice(); }
  function findForSource(sourceKey){
    if(!sourceKey)return null;
    const rows=cache.filter(a=>a.sourceKey===sourceKey).sort((a,b)=>{
      if(isActive(a)!==isActive(b))return isActive(a)?-1:1;
      return byUpdated(a,b);
    });
    return rows[0]||null;
  }
  function findById(id){ return cache.find(a=>a.id===id)||null; }
  function canManage(actionOrHotel){
    const u=currentUser(); if(!u)return false;
    if(u.role==='direcao'||u.role==='admin')return true;
    const a=typeof actionOrHotel==='object'?actionOrHotel:null;
    const hotel=a?a.hotel:actionOrHotel;
    if(typeof window.vgAuthCanAccessHotel==='function'?window.vgAuthCanAccessHotel(hotel):(Array.isArray(u.hotels)?u.hotels:[u.hotel]).some(x=>norm(hotel)===norm(x)))return true;
    return !!a && String(a.ownerUser||'').toLowerCase()===String(u.user||'').toLowerCase();
  }

  function stats(hotels){
    const set=new Set((hotels||[]).map(norm));
    const rows=cache.filter(a=>!set.size||set.has(norm(a.hotel)));
    const active=rows.filter(isActive);
    const since=Date.now()-7*86400000;
    return {
      total:rows.length,
      open:active.length,
      unassigned:active.filter(a=>!a.ownerUser).length,
      overdue:active.filter(isOverdue).length,
      progress:active.filter(a=>a.status==='progress').length,
      waiting:active.filter(a=>a.status==='waiting').length,
      resolvedWeek:rows.filter(a=>a.status==='resolved'&&a.resolvedAt&&new Date(a.resolvedAt).getTime()>=since).length
    };
  }
  function watch(hotels,limit=5){
    const set=new Set((hotels||[]).map(norm));
    return cache.filter(a=>isActive(a)&&(!set.size||set.has(norm(a.hotel)))).sort(byUrgency).slice(0,limit);
  }

  function replaceAction(action){
    const i=cache.findIndex(a=>a.id===action.id);
    if(i>=0)cache[i]=action; else cache.push(action);
    cache.sort(byUpdated); loaded=true; fetchedAt=Date.now();
    window.VG.events?.emit('actions:changed',{reason:'saved',action:clone(action)});
  }

  function filteredAssignees(hotel,existing){
    const u=currentUser();
    if(!u)return [];
    if(u.role==='direcao'||u.role==='admin')return assignees.slice();
    return assignees.filter(x=>{const hs=Array.isArray(x.hotels)&&x.hotels.length?x.hotels:(x.hotel?[x.hotel]:[]);return String(x.user)===String(u.user)||hs.some(h=>norm(h)===norm(hotel))||String(x.user)===String(existing?.ownerUser||'');});
  }
  function fillOwnerSelect(hotel,existing){
    const el=document.getElementById('opsActionOwner'); if(!el)return;
    const rows=filteredAssignees(hotel,existing);
    el.innerHTML='<option value="">— Sem responsável —</option>'+rows.map(x=>`<option value="${esc(x.user)}">${esc(x.name)}${x.hotel&&x.hotel!=='*'?' · '+esc(x.hotel):''}</option>`).join('');
    el.value=existing?.ownerUser||'';
  }
  function historyHtml(action){
    const rows=(action?.history||[]).slice().reverse();
    if(!rows.length)return '<div class="ops-action-history-empty">Ainda não existe histórico.</div>';
    const typeLabel={created:'Criada',updated:'Alteração',comment:'Comentário'};
    return rows.map(h=>`<div class="ops-action-history-item">
      <div class="ops-action-history-dot ${esc(h.type||'updated')}"></div>
      <div><div class="ops-action-history-top"><strong>${esc(h.name||h.user||'Utilizador')}</strong><span>${esc(typeLabel[h.type]||'Atualização')} · ${esc(dateTimeLabel(h.ts))}</span></div><div class="ops-action-history-text">${esc(h.detail||'')}</div></div>
    </div>`).join('');
  }
  function sourceText(ctx){
    const reasons=(ctx?.priority?.reasons||ctx?.action?.sourceReasons||[]).slice(0,4);
    return reasons.length?reasons.join(' · '):(ctx?.priority?.title||ctx?.action?.sourceTitle||'Ação operacional');
  }

  async function openEditor(ctx){
    editContext=ctx||{};
    await Promise.all([ensureLoaded(false),ensureAssignees(false)]);
    if(editContext.action?.id) editContext.action=findById(editContext.action.id)||editContext.action;
    const p=editContext.priority||{};
    const a=editContext.action||null;
    const hotel=p.hotel||a?.hotel||'';
    const modal=document.getElementById('opsActionModal'); if(!modal)return;
    document.getElementById('opsActionModalTitle').textContent=a?'Gerir ação':'Criar ação';
    document.getElementById('opsActionHotel').textContent=hotel||'—';
    document.getElementById('opsActionSource').textContent=sourceText(editContext);
    document.getElementById('opsActionDue').value=a?.dueDate||'';
    document.getElementById('opsActionStatus').value=a?.status||'open';
    document.getElementById('opsActionComment').value='';
    document.getElementById('opsActionHistory').innerHTML=historyHtml(a);
    fillOwnerSelect(hotel,a);
    const editable=canManage(a||hotel);
    ['opsActionOwner','opsActionDue','opsActionStatus','opsActionComment'].forEach(id=>{const el=document.getElementById(id);if(el)el.disabled=!editable;});
    const save=document.getElementById('opsActionSave'); if(save){save.style.display=editable?'inline-flex':'none';save.disabled=false;save.textContent=a?'Guardar alterações':'Criar ação';}
    const perm=document.getElementById('opsActionPermission'); if(perm){perm.textContent=editable?'':'Consulta apenas — não tem permissão para alterar esta ação.';perm.style.display=editable?'none':'block';}
    modal.style.display='flex';
  }

  async function openForPriority(priority){
    await ensureLoaded(false);
    const action=findForSource(priority?.sourceKey);
    return openEditor({priority,action});
  }
  async function openById(id){
    await ensureLoaded(false);
    const action=findById(id); if(!action)return;
    return openEditor({action});
  }
  function closeEditor(){ const m=document.getElementById('opsActionModal'); if(m)m.style.display='none'; editContext=null; }

  async function saveEditor(){
    if(!editContext)return;
    const p=editContext.priority||{};
    const a=editContext.action||null;
    const hotel=p.hotel||a?.hotel||'';
    if(!canManage(a||hotel)){window.showToast?.('Sem permissão para alterar esta ação.',true);return;}
    const btn=document.getElementById('opsActionSave'); if(btn){btn.disabled=true;btn.textContent='A guardar…';}
    const payload={
      id:a?.id||'', expectedUpdatedAt:a?.updatedAt||'', hotel,
      sourceKey:p.sourceKey||a?.sourceKey||'', sourceTitle:p.title||a?.sourceTitle||'Prioridade operacional',
      sourceType:p.kind||a?.sourceType||'operational', sourceReasons:(p.reasons||a?.sourceReasons||[]), severity:p.severity||a?.severity||'orange',
      ownerUser:document.getElementById('opsActionOwner')?.value||'', dueDate:document.getElementById('opsActionDue')?.value||'',
      status:document.getElementById('opsActionStatus')?.value||'open', comment:document.getElementById('opsActionComment')?.value||''
    };
    try{
      const r=await window.VG.shared.post('ops-action-save',null,payload);
      if(!r?.data)throw new Error('Resposta inválida ao guardar a ação.');
      replaceAction(r.data);
      editContext={priority:p,action:r.data};
      document.getElementById('opsActionComment').value='';
      document.getElementById('opsActionHistory').innerHTML=historyHtml(r.data);
      fillOwnerSelect(hotel,r.data);
      if(btn)btn.textContent='Guardar alterações';
      window.vgAuthAudit?.('Ação operacional',hotel,`${r.data.status==='resolved'?'Resolvida':'Atualizada'}: ${r.data.sourceTitle||'prioridade'}`);
      window.showToast?.('Ação guardada e partilhada.');
      renderBoard();
    }catch(e){
      console.warn('Guardar ação',e);
      window.showToast?.(String(e.message||e).includes('alterada por outro')?'A ação foi entretanto alterada. Reabra-a para atualizar.':'Não foi possível guardar a ação: '+(e.message||e),true);
      if(String(e.message||e).includes('alterada por outro')){ await ensureLoaded(true); closeEditor(); }
    }finally{if(btn)btn.disabled=false;}
  }

  function boardRows(){
    const status=document.getElementById('opsActionsFilterStatus')?.value||'active';
    const hotel=document.getElementById('opsActionsFilterHotel')?.value||'';
    const q=norm(document.getElementById('opsActionsSearch')?.value||'');
    return cache.filter(a=>{
      if(status==='active'&&!isActive(a))return false;
      if(status!=='all'&&status!=='active'&&a.status!==status)return false;
      if(hotel&&a.hotel!==hotel)return false;
      if(q&&!norm([a.hotel,a.sourceTitle,a.ownerName,(a.sourceReasons||[]).join(' ')].join(' ')).includes(q))return false;
      return true;
    }).sort(byUrgency);
  }
  function boardRowHtml(a){
    const sm=statusMeta(a.status); const overdue=isOverdue(a);
    return `<div class="ops-action-board-row ${overdue?'overdue':''}">
      <div><strong>${esc(a.hotel)}</strong><span class="ops-action-source-small">${esc(a.sourceTitle||'Ação operacional')}</span></div>
      <div>${a.ownerName?esc(a.ownerName):'<span class="ops-action-missing">Sem responsável</span>'}</div>
      <div class="${overdue?'ops-action-due-over':''}">${esc(dateLabel(a.dueDate))}${overdue?'<small>Fora do prazo</small>':''}</div>
      <div><span class="ops-action-status ${sm.cls}">${esc(sm.label)}</span></div>
      <div><button class="ops-btn" onclick="VG.actions.openById('${esc(a.id)}')">Abrir</button></div>
    </div>`;
  }
  function renderBoard(){
    const modal=document.getElementById('opsActionsModal'); if(!modal||modal.style.display==='none')return;
    const hotels=[...new Set(cache.map(a=>a.hotel).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt'));
    const sel=document.getElementById('opsActionsFilterHotel');
    if(sel){const old=sel.value;sel.innerHTML='<option value="">Todos os hotéis</option>'+hotels.map(h=>`<option>${esc(h)}</option>`).join('');sel.value=hotels.includes(old)?old:'';}
    const rows=boardRows(); const box=document.getElementById('opsActionsBoard');
    if(box)box.innerHTML=rows.length?rows.map(boardRowHtml).join(''):'<div class="ops-action-board-empty">Sem ações para os filtros selecionados.</div>';
    const s=stats([]); const meta=document.getElementById('opsActionsBoardMeta');
    if(meta)meta.textContent=`${s.open} abertas · ${s.overdue} fora do prazo · ${s.unassigned} sem responsável · ${s.resolvedWeek} resolvidas nos últimos 7 dias`;
  }
  async function openBoard(){
    const m=document.getElementById('opsActionsModal'); if(!m)return;
    m.style.display='flex';
    const box=document.getElementById('opsActionsBoard'); if(box)box.innerHTML='<div class="ops-action-board-empty">A carregar ações…</div>';
    await ensureLoaded(true); renderBoard();
  }
  function closeBoard(){ const m=document.getElementById('opsActionsModal'); if(m)m.style.display='none'; }

  window.VG=window.VG||{};
  window.VG.actions={
    ensureLoaded,ensureAssignees,all,assignees:()=>assignees.slice(),findForSource,findById,stats,watch,statusMeta,isOverdue,canManage,
    openForPriority,openById,openBoard,closeBoard,closeEditor,saveEditor,renderBoard
  };
  window.opsActionsOpen=()=>openBoard();
  window.opsActionsClose=()=>closeBoard();
  window.opsActionClose=()=>closeEditor();
  window.opsActionSave=()=>saveEditor();
  window.opsActionsRenderBoard=()=>renderBoard();
  window.VG?.events?.on?.('market:before-change',()=>{cache=[];loaded=false;fetchedAt=0;loadingPromise=null;});
  window.VG?.events?.on?.('market:changed',()=>ensureLoaded(true).then(()=>{try{renderBoard();}catch(e){}}));
})();
