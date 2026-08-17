// ==========================================================
// VG DASHBOARD V27 — WORKFLOW DE APROVAÇÕES
// Pedidos formais por hotel com decisão da Direção, histórico,
// concorrência otimista, auditoria server-side e ligações operacionais.
// ==========================================================
(function(){
  'use strict';
  window.VG=window.VG||{};
  if(window.VG.approvals?.version>=27)return;

  const TYPES={
    target:'Meta / objetivo',
    configuration:'Configuração',
    operational:'Decisão operacional',
    exception:'Exceção / autorização',
    document:'Documento',
    decision:'Outra decisão'
  };
  const PRIORITY={normal:'Normal',high:'Alta',critical:'Crítica'};
  const STATUS={pending:'Pendente',approved:'Aprovado',rejected:'Rejeitado',cancelled:'Cancelado'};
  const LINK_TYPES={hotel:'Hotel',action:'Ação',document:'Documento',agenda:'Evento da Agenda',target:'Meta / regra'};
  const state={loaded:false,loading:null,fetchedAt:0,rows:[],assignees:[],hotel:'',status:'pending',type:'all',query:'',editing:null,focusId:''};
  const REFRESH_MS=20000;

  const esc=v=>window.VG?.util?.escapeHtml?window.VG.util.escapeHtml(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
  const currentUser=()=>{try{return typeof window.vgAuthCurrent==='function'?window.vgAuthCurrent():null;}catch(e){return null;}};
  const isDirection=()=>{const u=currentUser();return !!u&&['direcao','admin'].includes(u.role);};
  const fmtDate=v=>{if(!v)return '—';const d=new Date(v);return isNaN(d)?String(v):d.toLocaleString('pt-PT',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});};
  const fmtDateOnly=v=>{if(!v)return '—';const d=new Date(String(v).length<=10?String(v)+'T12:00:00':v);return isNaN(d)?String(v):d.toLocaleDateString('pt-PT',{day:'2-digit',month:'2-digit',year:'numeric'});};
  const daysUntil=v=>{if(!v)return null;const d=new Date(String(v)+'T12:00:00');if(isNaN(d))return null;const t=new Date();t.setHours(12,0,0,0);return Math.ceil((d-t)/86400000);};
  const canCreateHotel=h=>{const u=currentUser();if(!u)return false;if(isDirection())return true;if(typeof window.vgAuthCanAccessHotel==='function')return window.vgAuthCanAccessHotel(h);return (Array.isArray(u.hotels)?u.hotels:[u.hotel]).some(x=>norm(h)===norm(x));};
  const isRequester=r=>norm(r?.requesterUser)===norm(currentUser()?.user);
  const canEdit=r=>r?.status==='pending'&&(isDirection()||isRequester(r));
  const canCancel=r=>r?.status==='pending'&&(isDirection()||isRequester(r));
  const canDecide=r=>{const u=currentUser();if(!u||!isDirection()||r?.status!=='pending')return false;return !r.approverUser||norm(r.approverUser)===norm(u.user);};

  function allHotels(){
    const u=currentUser();if(!u)return [];
    if(!isDirection()){const hs=typeof window.vgAuthHotels==='function'?window.vgAuthHotels():(Array.isArray(u.hotels)?u.hotels:(u.hotel?[u.hotel]:[]));if(hs.length)return hs;}
    let rows=[];
    try{if(typeof RAW!=='undefined'&&RAW)rows=(RAW.hotel_list||Object.keys(RAW.hotels_ops||{})).filter(Boolean);}catch(e){}
    try{if(typeof window.getActiveHotels==='function'){const a=window.getActiveHotels();if(Array.isArray(a))rows=rows.concat(a);}}catch(e){}
    try{if(typeof REGIOES!=='undefined'&&REGIOES)rows=rows.concat(Object.values(REGIOES).flat().filter(Boolean));}catch(e){}
    rows=rows.concat(state.rows.map(x=>x.hotel).filter(Boolean));
    return [...new Set(rows)].sort((a,b)=>String(a).localeCompare(String(b),'pt'));
  }
  function approvers(){
    return state.assignees.filter(x=>x&&x.active!==false&&['direcao','admin'].includes(x.role))
      .sort((a,b)=>String(a.name||a.user).localeCompare(String(b.name||b.user),'pt'));
  }

  async function ensureLoaded(force){
    if(!currentUser())return state.rows;
    if(!force&&state.loaded&&Date.now()-state.fetchedAt<REFRESH_MS)return state.rows;
    if(state.loading)return state.loading;
    state.loading=(async()=>{
      const jobs=[
        window.VG?.shared?.get?.('ops-approvals'),
        window.VG?.shared?.get?.('assignees')
      ];
      if(window.VG?.actions?.ensureLoaded)jobs.push(window.VG.actions.ensureLoaded(false));
      if(window.VG?.agenda?.ensureLoaded)jobs.push(window.VG.agenda.ensureLoaded(false));
      if(window.VG?.documents?.ensureLoaded)jobs.push(window.VG.documents.ensureLoaded(false));
      try{
        const r=await Promise.allSettled(jobs);
        state.rows=r[0]?.status==='fulfilled'&&Array.isArray(r[0].value?.data)?r[0].value.data.filter(Boolean):state.rows;
        state.assignees=r[1]?.status==='fulfilled'&&Array.isArray(r[1].value?.data)?r[1].value.data.filter(Boolean):state.assignees;
        state.loaded=true;state.fetchedAt=Date.now();
        window.VG.events?.emit?.('approvals:changed',{reason:'loaded',count:state.rows.length});
      }catch(e){console.warn('Aprovações: carregamento falhou',e);}
      finally{state.loading=null;}
      return state.rows;
    })();
    return state.loading;
  }

  function filtered(){
    const q=norm(state.query),h=norm(state.hotel);
    return state.rows.filter(r=>{
      if(h&&norm(r.hotel)!==h)return false;
      if(state.status!=='all'&&r.status!==state.status)return false;
      if(state.type!=='all'&&r.type!==state.type)return false;
      if(q&&!norm([r.title,r.description,r.hotel,r.requesterName,r.approverName,r.linkLabel,r.decisionNote,TYPES[r.type],PRIORITY[r.priority],STATUS[r.status]].filter(Boolean).join(' ')).includes(q))return false;
      return true;
    }).sort((a,b)=>{
      const rank={critical:3,high:2,normal:1};
      if(a.status==='pending'&&b.status!=='pending')return -1;if(b.status==='pending'&&a.status!=='pending')return 1;
      return (rank[b.priority]||0)-(rank[a.priority]||0)||String(b.updatedAt||'').localeCompare(String(a.updatedAt||''));
    });
  }
  function stats(){
    const rows=state.rows,u=currentUser();
    const pending=rows.filter(x=>x.status==='pending');
    return {
      pending:pending.length,
      mine:pending.filter(x=>!x.approverUser||norm(x.approverUser)===norm(u?.user)).filter(()=>isDirection()).length,
      critical:pending.filter(x=>x.priority==='critical').length,
      decided7:rows.filter(x=>['approved','rejected'].includes(x.status)&&Date.now()-Date.parse(x.decisionAt||x.updatedAt||0)<7*864e5).length
    };
  }
  function dueLabel(r){
    if(r.status!=='pending'||!r.dueDate)return '';
    const d=daysUntil(r.dueDate);
    if(d==null)return '';
    if(d<0)return `${Math.abs(d)} dia(s) fora do prazo`;
    if(d===0)return 'Decisão hoje';
    if(d===1)return 'Decisão amanhã';
    return `Prazo ${fmtDateOnly(r.dueDate)}`;
  }

  function render(){
    const root=document.getElementById('approvalsRoot');if(!root)return;
    const s=stats(),rows=filtered();
    const hotelOpts=allHotels().map(h=>`<option value="${esc(h)}" ${state.hotel===h?'selected':''}>${esc(h)}</option>`).join('');
    root.innerHTML=`
      <div class="ap-head"><div><div class="ap-kicker">V27 · Governação de decisões</div><h2>Workflow de Aprovações</h2><p>Pedidos formais, decisão da Direção e histórico verificável por hotel.</p></div><button class="ap-btn primary" id="apNew" type="button">＋ Novo pedido</button></div>
      <div class="ap-kpis"><div><span>Pendentes</span><strong>${s.pending}</strong></div><div><span>À minha decisão</span><strong>${s.mine}</strong></div><div><span>Críticos pendentes</span><strong>${s.critical}</strong></div><div><span>Decididos 7 dias</span><strong>${s.decided7}</strong></div></div>
      <div class="ap-toolbar"><select id="apHotel"><option value="">Todos os hotéis</option>${hotelOpts}</select><select id="apStatus"><option value="all">Todos os estados</option>${Object.entries(STATUS).map(([k,v])=>`<option value="${k}" ${state.status===k?'selected':''}>${esc(v)}</option>`).join('')}</select><select id="apType"><option value="all">Todos os tipos</option>${Object.entries(TYPES).map(([k,v])=>`<option value="${k}" ${state.type===k?'selected':''}>${esc(v)}</option>`).join('')}</select><input id="apSearch" type="search" value="${esc(state.query)}" placeholder="Pesquisar pedido, hotel, requerente…"><button class="ap-btn" id="apRefresh" type="button">↻ Atualizar</button></div>
      <div class="ap-list">${rows.length?rows.map(cardHtml).join(''):'<div class="ap-empty"><strong>Sem pedidos neste filtro.</strong><span>Cria um pedido ou altera os filtros.</span></div>'}</div>`;
    bind();
    if(state.focusId){setTimeout(()=>document.querySelector(`.ap-card[data-id="${CSS.escape(state.focusId)}"]`)?.scrollIntoView?.({behavior:'smooth',block:'center'}),40);state.focusId='';}
  }

  function cardHtml(r){
    const due=dueLabel(r),decision=r.status==='approved'?'Aprovado':r.status==='rejected'?'Rejeitado':'';
    return `<article class="ap-card ${esc(r.status)} ${esc(r.priority)}" data-id="${esc(r.id)}">
      <div class="ap-state"><span class="ap-status ${esc(r.status)}">${esc(STATUS[r.status]||r.status)}</span><span class="ap-priority ${esc(r.priority)}">${esc(PRIORITY[r.priority]||r.priority)}</span></div>
      <div class="ap-main"><div class="ap-title">${esc(r.title||'Pedido')}</div><div class="ap-meta">${esc(r.hotel||'—')} · ${esc(TYPES[r.type]||r.type)} · Pedido por ${esc(r.requesterName||r.requesterUser||'—')}</div>
      <div class="ap-desc">${esc(r.description||'Sem descrição')}</div>
      <div class="ap-foot">${r.linkLabel?`<span>Ligação: ${esc(r.linkLabel)}</span>`:''}${r.approverName?`<span>Aprovador: ${esc(r.approverName)}</span>`:'<span>Aprovador: Direção</span>'}${due?`<span class="${due.includes('fora')?'late':''}">${esc(due)}</span>`:''}${decision?`<span>${decision} ${esc(fmtDate(r.decisionAt))}</span>`:''}</div></div>
      <div class="ap-actions"><button class="ap-btn" data-action="detail" type="button">Detalhe</button>${canEdit(r)?'<button class="ap-btn" data-action="edit" type="button">Editar</button>':''}${canDecide(r)?'<button class="ap-btn approve" data-action="approve" type="button">Aprovar</button><button class="ap-btn reject" data-action="reject" type="button">Rejeitar</button>':''}${canCancel(r)?'<button class="ap-btn danger" data-action="cancel" type="button">Cancelar</button>':''}</div>
    </article>`;
  }
  function bind(){
    document.getElementById('apNew')?.addEventListener('click',()=>openEditor());
    document.getElementById('apRefresh')?.addEventListener('click',async()=>{await ensureLoaded(true);render();});
    document.getElementById('apHotel')?.addEventListener('change',e=>{state.hotel=e.target.value;render();});
    document.getElementById('apStatus')?.addEventListener('change',e=>{state.status=e.target.value;render();});
    document.getElementById('apType')?.addEventListener('change',e=>{state.type=e.target.value;render();});
    document.getElementById('apSearch')?.addEventListener('input',e=>{state.query=e.target.value;render();});
    document.querySelector('.ap-list')?.addEventListener('click',e=>{
      const b=e.target.closest('[data-action]'),card=e.target.closest('[data-id]');if(!b||!card)return;
      const r=state.rows.find(x=>x.id===card.dataset.id);if(!r)return;
      const a=b.dataset.action;if(a==='detail')openDetail(r);if(a==='edit')openEditor(r);if(a==='approve')openDecision(r,'approve');if(a==='reject')openDecision(r,'reject');if(a==='cancel')cancelRequest(r);
    });
  }

  function editorModal(){
    let m=document.getElementById('apEditorModal');if(m)return m;
    m=document.createElement('div');m.id='apEditorModal';m.className='ap-modal';m.innerHTML=`<div class="ap-modal-panel" role="dialog" aria-modal="true"><div class="ap-modal-head"><div><strong id="apEditorTitle">Novo pedido</strong><span>A decisão fica registada na Auditoria & Governação.</span></div><button class="ap-x" type="button">✕</button></div><form id="apForm"><div class="ap-form-grid">
      <label>Hotel<select id="apEditHotel" required></select></label>
      <label>Tipo<select id="apEditType">${Object.entries(TYPES).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join('')}</select></label>
      <label class="wide">Título<input id="apEditTitle" maxlength="240" required></label>
      <label>Prioridade<select id="apEditPriority">${Object.entries(PRIORITY).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join('')}</select></label>
      <label>Decisão até<input id="apEditDue" type="date"></label>
      <label>Aprovador<select id="apEditApprover"></select></label>
      <label>Associar a<select id="apEditLinkType">${Object.entries(LINK_TYPES).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join('')}</select></label>
      <label id="apEditLinkWrap">Referência<select id="apEditLinkId"></select><input id="apEditTargetRef" maxlength="240" placeholder="Ex.: Ocupação Setembro 2026" style="display:none"></label>
      <label class="wide">Justificação / decisão pedida<textarea id="apEditDescription" rows="5" maxlength="3000" required placeholder="Explica o que deve ser aprovado, porquê e qual o impacto esperado."></textarea></label>
      </div><div class="ap-modal-foot"><span id="apFormStatus"></span><button class="ap-btn" data-close type="button">Cancelar</button><button class="ap-btn primary" type="submit">Submeter</button></div></form></div>`;
    document.body.appendChild(m);
    m.addEventListener('click',e=>{if(e.target===m||e.target.closest('.ap-x')||e.target.closest('[data-close]'))closeEditor();});
    m.querySelector('#apEditHotel').addEventListener('change',refreshLinkChoices);
    m.querySelector('#apEditLinkType').addEventListener('change',refreshLinkChoices);
    m.querySelector('#apForm').addEventListener('submit',saveFromForm);
    return m;
  }
  function linkChoices(hotel,type){
    if(type==='hotel'||type==='target')return [];
    if(type==='action'){try{return (window.VG?.actions?.all?.()||[]).filter(x=>norm(x.hotel)===norm(hotel)).map(x=>({id:x.id,label:x.sourceTitle||x.title||x.id}));}catch(e){return [];}}
    if(type==='agenda'){try{return (window.VG?.agenda?.all?.()||[]).filter(x=>x.source!=='action'&&norm(x.hotel)===norm(hotel)).map(x=>({id:x.id,label:[x.title,x.date].filter(Boolean).join(' · ')}));}catch(e){return [];}}
    if(type==='document'){try{return (window.VG?.documents?.all?.()||[]).filter(x=>norm(x.hotel)===norm(hotel)).map(x=>({id:x.id,label:x.title||x.fileName||x.id}));}catch(e){return [];}}
    return [];
  }
  function refreshLinkChoices(){
    const h=document.getElementById('apEditHotel')?.value||'',t=document.getElementById('apEditLinkType')?.value||'hotel';
    const wrap=document.getElementById('apEditLinkWrap'),sel=document.getElementById('apEditLinkId'),target=document.getElementById('apEditTargetRef');if(!wrap||!sel||!target)return;
    wrap.style.display=t==='hotel'?'none':'';
    target.style.display=t==='target'?'':'none';sel.style.display=t==='target'?'none':'';
    const rows=linkChoices(h,t),current=state.editing?.linkType===t?state.editing.linkId:'';
    sel.innerHTML='<option value="">Selecionar…</option>'+rows.map(x=>`<option value="${esc(x.id)}" ${String(x.id)===String(current)?'selected':''}>${esc(x.label)}</option>`).join('');
    target.value=t==='target'?(state.editing?.linkType==='target'?state.editing.linkId||'':''):'';
  }
  async function openEditor(r){
    await ensureLoaded(false);state.editing=r||null;const m=editorModal(),u=currentUser(),hotels=allHotels();
    document.getElementById('apEditorTitle').textContent=r?'Editar pedido':'Novo pedido de aprovação';
    const h=document.getElementById('apEditHotel');h.innerHTML=hotels.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');h.value=r?.hotel||(!isDirection()?u?.hotel:'')||hotels[0]||'';h.disabled=!!r&&!isDirection();
    document.getElementById('apEditType').value=r?.type||'operational';document.getElementById('apEditTitle').value=r?.title||'';document.getElementById('apEditPriority').value=r?.priority||'normal';document.getElementById('apEditDue').value=r?.dueDate||'';document.getElementById('apEditDescription').value=r?.description||'';document.getElementById('apEditLinkType').value=r?.linkType||'hotel';
    const aps=document.getElementById('apEditApprover');aps.innerHTML='<option value="">Direção — qualquer aprovador</option>'+approvers().map(x=>`<option value="${esc(x.user)}">${esc(x.name||x.user)}</option>`).join('');aps.value=r?.approverUser||'';
    document.getElementById('apFormStatus').textContent='';refreshLinkChoices();m.classList.add('open');
  }
  function closeEditor(){document.getElementById('apEditorModal')?.classList.remove('open');state.editing=null;}
  async function saveFromForm(e){
    e.preventDefault();const st=document.getElementById('apFormStatus'),old=state.editing;
    try{
      const hotel=document.getElementById('apEditHotel').value,title=document.getElementById('apEditTitle').value.trim(),type=document.getElementById('apEditType').value,priority=document.getElementById('apEditPriority').value,dueDate=document.getElementById('apEditDue').value,approverUser=document.getElementById('apEditApprover').value,linkType=document.getElementById('apEditLinkType').value,description=document.getElementById('apEditDescription').value.trim();
      const linkId=linkType==='hotel'?'':linkType==='target'?document.getElementById('apEditTargetRef').value.trim():document.getElementById('apEditLinkId').value;
      if(!hotel||!title||!description)throw new Error('Hotel, título e justificação são obrigatórios.');if(!canCreateHotel(hotel))throw new Error('Sem permissões para este hotel.');if(linkType!=='hotel'&&!linkId)throw new Error('Indica a referência a associar.');
      st.textContent='A submeter…';
      const payload={id:old?.id||'',expectedUpdatedAt:old?.updatedAt||'',hotel,title,type,priority,dueDate,approverUser,linkType,linkId,description};
      const res=await window.VG.shared.post('ops-approval-save','',payload);if(!res?.data)throw new Error('Resposta inválida do servidor.');
      const i=state.rows.findIndex(x=>x.id===res.data.id);if(i>=0)state.rows[i]=res.data;else state.rows.unshift(res.data);state.fetchedAt=Date.now();state.loaded=true;closeEditor();render();window.VG.events?.emit?.('approvals:changed',{reason:'saved',id:res.data.id});window.showToast?.('✓ Pedido submetido para aprovação');
    }catch(err){if(st)st.textContent=err.message||String(err);}
  }

  function detailModal(){
    let m=document.getElementById('apDetailModal');if(m)return m;
    m=document.createElement('div');m.id='apDetailModal';m.className='ap-modal';m.innerHTML='<div class="ap-modal-panel detail" role="dialog" aria-modal="true"><div class="ap-modal-head"><div><strong id="apDetailTitle">Pedido</strong><span id="apDetailMeta"></span></div><button class="ap-x" type="button">✕</button></div><div id="apDetailBody" class="ap-detail-body"></div><div class="ap-modal-foot"><button class="ap-btn" data-close type="button">Fechar</button></div></div>';document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m||e.target.closest('.ap-x')||e.target.closest('[data-close]'))m.classList.remove('open');});return m;
  }
  function openDetail(r){
    const m=detailModal();document.getElementById('apDetailTitle').textContent=r.title||'Pedido';document.getElementById('apDetailMeta').textContent=`${r.hotel||''} · ${STATUS[r.status]||r.status}`;
    const hist=Array.isArray(r.history)?r.history.slice().reverse():[];
    document.getElementById('apDetailBody').innerHTML=`<div class="ap-detail-grid"><div><span>Tipo</span><strong>${esc(TYPES[r.type]||r.type)}</strong></div><div><span>Prioridade</span><strong>${esc(PRIORITY[r.priority]||r.priority)}</strong></div><div><span>Pedido por</span><strong>${esc(r.requesterName||r.requesterUser||'—')}</strong></div><div><span>Aprovador</span><strong>${esc(r.approverName||'Direção')}</strong></div><div><span>Submetido</span><strong>${esc(fmtDate(r.createdAt))}</strong></div><div><span>Decisão até</span><strong>${esc(fmtDateOnly(r.dueDate))}</strong></div></div><div class="ap-detail-section"><span>Pedido / justificação</span><p>${esc(r.description||'—')}</p></div>${r.linkLabel?`<div class="ap-detail-section"><span>Ligação</span><p>${esc(r.linkLabel)}</p></div>`:''}${r.decisionNote?`<div class="ap-detail-section decision ${esc(r.status)}"><span>Decisão</span><p>${esc(r.decisionNote)}</p><small>${esc(r.decisionBy?.name||'')} · ${esc(fmtDate(r.decisionAt))}${r.selfApprovalException?' · Aprovação excecional pelo próprio requerente':''}</small></div>`:''}<div class="ap-detail-section"><span>Histórico</span><div class="ap-history">${hist.length?hist.map(x=>`<div><b>${esc(fmtDate(x.ts))}</b><span>${esc(x.name||x.user||'')} · ${esc(x.detail||x.type||'')}</span></div>`).join(''):'<em>Sem histórico.</em>'}</div></div>`;
    m.classList.add('open');
  }

  function decisionModal(){
    let m=document.getElementById('apDecisionModal');if(m)return m;
    m=document.createElement('div');m.id='apDecisionModal';m.className='ap-modal';m.innerHTML=`<div class="ap-modal-panel small" role="dialog" aria-modal="true"><div class="ap-modal-head"><div><strong id="apDecisionTitle">Decidir pedido</strong><span id="apDecisionMeta"></span></div><button class="ap-x" type="button">✕</button></div><form id="apDecisionForm"><div class="ap-decision-body"><label>Fundamentação / comentário<textarea id="apDecisionNote" rows="5" maxlength="2400" placeholder="Regista a fundamentação da decisão."></textarea></label><label class="ap-self" id="apSelfWrap"><input id="apSelfOverride" type="checkbox"> Aprovação excecional pelo próprio requerente <small>Exige justificação detalhada e ficará destacada na auditoria.</small></label><div id="apDecisionStatus"></div></div><div class="ap-modal-foot"><button class="ap-btn" data-close type="button">Cancelar</button><button class="ap-btn" id="apDecisionSubmit" type="submit">Confirmar</button></div></form></div>`;document.body.appendChild(m);
    m.addEventListener('click',e=>{if(e.target===m||e.target.closest('.ap-x')||e.target.closest('[data-close]'))m.classList.remove('open');});
    m.querySelector('#apDecisionForm').addEventListener('submit',submitDecision);return m;
  }
  let decisionContext=null;
  function openDecision(r,decision){
    decisionContext={r,decision};const m=decisionModal();const self=isRequester(r);
    document.getElementById('apDecisionTitle').textContent=decision==='approve'?'Aprovar pedido':'Rejeitar pedido';document.getElementById('apDecisionMeta').textContent=`${r.hotel} · ${r.title}`;
    document.getElementById('apDecisionNote').value='';document.getElementById('apDecisionStatus').textContent='';document.getElementById('apSelfWrap').style.display=self?'flex':'none';document.getElementById('apSelfOverride').checked=false;
    const btn=document.getElementById('apDecisionSubmit');btn.textContent=decision==='approve'?'Confirmar aprovação':'Confirmar rejeição';btn.className='ap-btn '+(decision==='approve'?'approve':'reject');m.classList.add('open');
  }
  async function submitDecision(e){
    e.preventDefault();if(!decisionContext)return;const {r,decision}=decisionContext,st=document.getElementById('apDecisionStatus'),note=document.getElementById('apDecisionNote').value.trim(),overrideSelf=document.getElementById('apSelfOverride').checked;
    try{
      if(decision==='reject'&&note.length<5)throw new Error('Indica o motivo da rejeição.');if(isRequester(r)&&(!overrideSelf||note.length<20))throw new Error('Para decidir o próprio pedido é necessária aprovação excecional e justificação com pelo menos 20 caracteres.');
      st.textContent='A registar decisão…';const res=await window.VG.shared.post('ops-approval-decide','',{id:r.id,expectedUpdatedAt:r.updatedAt,decision,note,overrideSelf});if(!res?.data)throw new Error('Resposta inválida.');
      const i=state.rows.findIndex(x=>x.id===r.id);if(i>=0)state.rows[i]=res.data;document.getElementById('apDecisionModal').classList.remove('open');decisionContext=null;render();window.VG.events?.emit?.('approvals:changed',{reason:'decided',id:r.id,status:res.data.status});window.showToast?.(decision==='approve'?'✓ Pedido aprovado':'Pedido rejeitado');
    }catch(err){st.textContent=err.message||String(err);}
  }
  async function cancelRequest(r){
    if(!confirm(`Cancelar o pedido “${r.title}”?`))return;
    try{const res=await window.VG.shared.post('ops-approval-cancel','',{id:r.id,expectedUpdatedAt:r.updatedAt});if(res?.data){const i=state.rows.findIndex(x=>x.id===r.id);if(i>=0)state.rows[i]=res.data;}render();window.VG.events?.emit?.('approvals:changed',{reason:'cancelled',id:r.id});window.showToast?.('Pedido cancelado');}catch(e){window.showToast?.('Erro ao cancelar: '+e.message,true);}
  }

  async function openById(id){await ensureLoaded(false);state.status='all';state.type='all';state.hotel='';state.query='';state.focusId=id||'';window.setView?.('approvals');setTimeout(()=>{render();const r=state.rows.find(x=>x.id===id);if(r)openDetail(r);},30);}
  async function openFor(opts={}){await ensureLoaded(false);state.hotel=opts.hotel||'';state.status=opts.status||'all';state.type=opts.type||'all';state.query=opts.query||'';window.setView?.('approvals');setTimeout(render,0);}
  function all(){return state.rows.slice();}
  function searchItems(){return state.rows.map(r=>({id:r.id,title:r.title,hotel:r.hotel,subtitle:[STATUS[r.status],TYPES[r.type],r.requesterName,r.approverName].filter(Boolean).join(' · '),value:STATUS[r.status]||r.status,keywords:[r.description,r.linkLabel,r.decisionNote,PRIORITY[r.priority]].filter(Boolean).join(' ')}));}
  async function renderPage(){render();await ensureLoaded(false);render();}
  function pendingForCurrentUser(){const u=currentUser();return state.rows.filter(r=>r.status==='pending'&&isDirection()&&(!r.approverUser||norm(r.approverUser)===norm(u?.user)));}

  window.VG.approvals={version:27,state,ensureLoaded,render:renderPage,all,stats,openById,openFor,searchItems,pendingForCurrentUser,TYPES,PRIORITY,STATUS,canDecide};
  window.VG?.events?.on?.('market:before-change',()=>{state.rows=[];state.loaded=false;state.fetchedAt=0;state.loading=null;state.hotel='';});
  window.VG?.events?.on?.('market:changed',()=>ensureLoaded(true).then(()=>{try{renderPage();}catch(e){}}));
  window.approvalsRender=renderPage;window.approvalsOpen=openFor;
})();
