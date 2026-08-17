// ==========================================================
// VG DASHBOARD V26 — GESTÃO DE DOCUMENTOS
// Documentos partilhados por hotel, ligados a ações/eventos.
// Conteúdo é servido apenas após autenticação e nunca cacheado no SW.
// ==========================================================
(function(){
  'use strict';
  window.VG=window.VG||{};
  if(window.VG.documents?.version>=26.2)return;

  const MAX_FILE_BYTES=3.5*1024*1024;
  const CATEGORIES={report:'Relatório',audit:'Auditoria',minutes:'Ata',procedure:'Procedimento',evidence:'Evidência',other:'Outro'};
  const LINK_TYPES={hotel:'Hotel',action:'Ação',agenda:'Evento da Agenda',approval:'Pedido de Aprovação'};
  const ALLOWED_EXT=new Set(['pdf','doc','docx','xls','xlsx','png','jpg','jpeg','webp','txt','csv']);
  const state={loaded:false,loading:null,fetchedAt:0,rows:[],hotel:'',category:'all',linkType:'all',query:'',editing:null};
  const REFRESH_MS=30000;
  const esc=v=>window.VG?.util?.escapeHtml?window.VG.util.escapeHtml(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
  const currentUser=()=>{try{return typeof window.vgAuthCurrent==='function'?window.vgAuthCurrent():null;}catch(e){return null;}};
  const isDirection=()=>{const u=currentUser();return !!u&&['direcao','admin'].includes(u.role);};
  const fmtDate=v=>{if(!v)return '—';const d=new Date(v);return isNaN(d)?String(v):d.toLocaleString('pt-PT',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});};
  const fmtSize=n=>{n=Number(n)||0;if(n<1024)return `${n} B`;if(n<1024*1024)return `${(n/1024).toFixed(0)} KB`;return `${(n/(1024*1024)).toFixed(1)} MB`;};
  const extOf=n=>String(n||'').split('.').pop().toLowerCase();
  const canManageHotel=h=>{const u=currentUser();if(!u)return false;if(isDirection())return true;if(typeof window.vgAuthCanAccessHotel==='function')return window.vgAuthCanAccessHotel(h);return (Array.isArray(u.hotels)?u.hotels:[u.hotel]).some(x=>norm(h)===norm(x));};

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

  async function ensureLoaded(force){
    if(!currentUser())return state.rows;
    if(!force&&state.loaded&&Date.now()-state.fetchedAt<REFRESH_MS)return state.rows;
    if(state.loading)return state.loading;
    state.loading=(async()=>{
      try{
        const jobs=[window.VG?.shared?.get?.('ops-documents')];
        if(window.VG?.actions?.ensureLoaded)jobs.push(window.VG.actions.ensureLoaded(false));
        if(window.VG?.agenda?.ensureLoaded)jobs.push(window.VG.agenda.ensureLoaded(false));
        const r=await Promise.allSettled(jobs);
        const docs=r[0]?.status==='fulfilled'?r[0].value:null;
        state.rows=Array.isArray(docs?.data)?docs.data.filter(Boolean):[];
        state.loaded=true;state.fetchedAt=Date.now();
        window.VG.events?.emit?.('documents:changed',{reason:'loaded',count:state.rows.length});
      }catch(e){console.warn('Documentos: carregamento falhou',e);}
      finally{state.loading=null;}
      return state.rows;
    })();
    return state.loading;
  }

  function filtered(){
    const q=norm(state.query),h=norm(state.hotel);
    return state.rows.filter(r=>{
      if(h&&norm(r.hotel)!==h)return false;
      if(state.category!=='all'&&r.category!==state.category)return false;
      if(state.linkType!=='all'&&r.linkType!==state.linkType)return false;
      if(q&&!norm([r.title,r.hotel,r.fileName,r.tags,r.linkLabel,r.description,CATEGORIES[r.category],LINK_TYPES[r.linkType]].filter(Boolean).join(' ')).includes(q))return false;
      return true;
    });
  }
  function stats(){const rows=filtered();return{total:rows.length,hotels:new Set(rows.map(x=>norm(x.hotel)).filter(Boolean)).size,recent:rows.filter(x=>Date.now()-Date.parse(x.updatedAt||x.createdAt||0)<7*864e5).length,size:rows.reduce((s,x)=>s+(Number(x.size)||0),0)};}

  function iconFor(r){const e=extOf(r.fileName);if(e==='pdf')return 'PDF';if(['doc','docx'].includes(e))return 'DOC';if(['xls','xlsx','csv'].includes(e))return 'XLS';if(['png','jpg','jpeg','webp'].includes(e))return 'IMG';return 'FILE';}
  function render(){
    const root=document.getElementById('documentsRoot');if(!root)return;
    const s=stats(),rows=filtered();
    const hotelOpts=allHotels().map(h=>`<option value="${esc(h)}" ${state.hotel===h?'selected':''}>${esc(h)}</option>`).join('');
    root.innerHTML=`
      <div class="doc-head"><div><div class="doc-kicker">V26 · Repositório operacional</div><h2>Gestão de Documentos</h2><p>Relatórios, atas, auditorias e evidências associados ao hotel, a uma ação ou a um evento.</p></div><button class="doc-btn primary" id="docNewBtn" type="button">＋ Adicionar documento</button></div>
      <div class="doc-kpis"><div><span>Documentos</span><strong>${s.total}</strong></div><div><span>Hotéis</span><strong>${s.hotels}</strong></div><div><span>Atualizados 7 dias</span><strong>${s.recent}</strong></div><div><span>Volume filtrado</span><strong>${esc(fmtSize(s.size))}</strong></div></div>
      <div class="doc-toolbar"><select id="docFilterHotel"><option value="">Todos os hotéis</option>${hotelOpts}</select><select id="docFilterCategory"><option value="all">Todas as categorias</option>${Object.entries(CATEGORIES).map(([k,v])=>`<option value="${k}" ${state.category===k?'selected':''}>${esc(v)}</option>`).join('')}</select><select id="docFilterLink"><option value="all">Todas as ligações</option>${Object.entries(LINK_TYPES).map(([k,v])=>`<option value="${k}" ${state.linkType===k?'selected':''}>${esc(v)}</option>`).join('')}</select><input id="docSearch" type="search" value="${esc(state.query)}" placeholder="Pesquisar título, ficheiro, hotel, etiqueta…"><button class="doc-btn" id="docRefresh" type="button">↻ Atualizar</button></div>
      <div class="doc-list">${rows.length?rows.map(rowHtml).join(''):'<div class="doc-empty"><strong>Sem documentos neste filtro.</strong><span>Adiciona o primeiro documento ou altera os filtros.</span></div>'}</div>`;
    bind();
  }
  function rowHtml(r){
    const can=canManageHotel(r.hotel);return `<article class="doc-card" data-id="${esc(r.id)}"><div class="doc-file-icon ${esc(iconFor(r).toLowerCase())}">${esc(iconFor(r))}</div><div class="doc-main"><div class="doc-title-line"><strong>${esc(r.title||r.fileName)}</strong><span class="doc-category">${esc(CATEGORIES[r.category]||'Outro')}</span></div><div class="doc-meta">${esc(r.hotel||'—')} · ${esc(LINK_TYPES[r.linkType]||'Hotel')}${r.linkLabel?` · ${esc(r.linkLabel)}`:''}</div><div class="doc-file-line">${esc(r.fileName)} · ${esc(fmtSize(r.size))}${r.tags?` · ${esc(r.tags)}`:''}</div>${r.description?`<div class="doc-description">${esc(r.description)}</div>`:''}<div class="doc-updated">Atualizado ${esc(fmtDate(r.updatedAt||r.createdAt))} por ${esc(r.updatedBy?.name||r.createdBy?.name||'—')}</div></div><div class="doc-actions"><button class="doc-btn" data-action="open" type="button">Abrir</button><button class="doc-btn" data-action="download" type="button">Descarregar</button>${can?`<button class="doc-btn" data-action="edit" type="button">Editar</button><button class="doc-btn danger" data-action="delete" type="button">Eliminar</button>`:''}</div></article>`;
  }
  function bind(){
    document.getElementById('docNewBtn')?.addEventListener('click',()=>openEditor());
    document.getElementById('docRefresh')?.addEventListener('click',async()=>{await ensureLoaded(true);render();});
    document.getElementById('docFilterHotel')?.addEventListener('change',e=>{state.hotel=e.target.value;render();});
    document.getElementById('docFilterCategory')?.addEventListener('change',e=>{state.category=e.target.value;render();});
    document.getElementById('docFilterLink')?.addEventListener('change',e=>{state.linkType=e.target.value;render();});
    document.getElementById('docSearch')?.addEventListener('input',e=>{state.query=e.target.value;const box=document.querySelector('.doc-list');const rows=filtered();if(box)box.innerHTML=rows.length?rows.map(rowHtml).join(''):'<div class="doc-empty"><strong>Sem documentos neste filtro.</strong><span>Altera a pesquisa ou os filtros.</span></div>';});
    document.querySelector('.doc-list')?.addEventListener('click',e=>{const b=e.target.closest('[data-action]'),card=e.target.closest('[data-id]');if(!b||!card)return;const r=state.rows.find(x=>x.id===card.dataset.id);if(!r)return;const a=b.dataset.action;if(a==='open')openFile(r,true);if(a==='download')openFile(r,false);if(a==='edit')openEditor(r);if(a==='delete')remove(r);});
  }

  function modal(){
    let m=document.getElementById('docModal');if(m)return m;
    m=document.createElement('div');m.id='docModal';m.className='doc-modal';m.innerHTML=`<div class="doc-modal-panel" role="dialog" aria-modal="true"><div class="doc-modal-head"><div><strong id="docModalTitle">Adicionar documento</strong><span>Máximo 3,5 MB por ficheiro</span></div><button class="doc-x" type="button">✕</button></div><form id="docForm"><div class="doc-form-grid"><label>Hotel<select id="docHotel" required></select></label><label>Categoria<select id="docCategory">${Object.entries(CATEGORIES).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join('')}</select></label><label class="wide">Título<input id="docTitle" maxlength="240" required></label><label>Associar a<select id="docLinkType">${Object.entries(LINK_TYPES).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join('')}</select></label><label id="docLinkWrap">Referência<select id="docLinkId"></select></label><label class="wide">Etiquetas<input id="docTags" maxlength="300" placeholder="ex.: HACCP, julho, administração"></label><label class="wide">Descrição<textarea id="docDescription" maxlength="1200" rows="3"></textarea></label><label class="wide">Ficheiro<input id="docFile" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.webp,.txt"><small id="docCurrentFile"></small></label></div><div class="doc-modal-foot"><span id="docFormStatus"></span><button class="doc-btn" data-close type="button">Cancelar</button><button class="doc-btn primary" type="submit">Guardar</button></div></form></div>`;document.body.appendChild(m);
    m.addEventListener('click',e=>{if(e.target===m||e.target.closest('.doc-x')||e.target.closest('[data-close]'))closeEditor();});
    m.querySelector('#docHotel').addEventListener('change',refreshLinkChoices);m.querySelector('#docLinkType').addEventListener('change',refreshLinkChoices);m.querySelector('#docForm').addEventListener('submit',saveFromForm);return m;
  }
  function linkChoices(hotel,type){
    if(type==='hotel')return [];
    if(type==='action'){try{return (window.VG?.actions?.all?.()||[]).filter(x=>norm(x.hotel)===norm(hotel)).map(x=>({id:x.id,label:x.sourceTitle||x.title||x.id}));}catch(e){return [];}}
    if(type==='agenda'){try{return (window.VG?.agenda?.all?.()||[]).filter(x=>x.source!=='action'&&norm(x.hotel)===norm(hotel)).map(x=>({id:x.id,label:[x.title,x.date].filter(Boolean).join(' · ')}));}catch(e){return [];}}
    if(type==='approval'){try{return (window.VG?.approvals?.all?.()||[]).filter(x=>norm(x.hotel)===norm(hotel)).map(x=>({id:x.id,label:[x.title,x.status].filter(Boolean).join(' · ')}));}catch(e){return [];}}
    return [];
  }
  function refreshLinkChoices(){const h=document.getElementById('docHotel')?.value||'',t=document.getElementById('docLinkType')?.value||'hotel',sel=document.getElementById('docLinkId'),wrap=document.getElementById('docLinkWrap');if(!sel||!wrap)return;wrap.style.display=t==='hotel'?'none':'';const rows=linkChoices(h,t);const current=state.editing?.linkType===t?state.editing.linkId:'';sel.innerHTML='<option value="">Selecionar…</option>'+rows.map(x=>`<option value="${esc(x.id)}" ${String(current)===String(x.id)?'selected':''}>${esc(x.label)}</option>`).join('');}
  async function openEditor(r){
    try{await window.VG?.approvals?.ensureLoaded?.(false);}catch(e){}
    await ensureLoaded(false);state.editing=r||null;const m=modal(),u=currentUser();
    document.getElementById('docModalTitle').textContent=r?'Editar documento':'Adicionar documento';
    const h=document.getElementById('docHotel');h.innerHTML=allHotels().map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');h.value=r?.hotel||(!isDirection()?u?.hotel:'')||allHotels()[0]||'';h.disabled=!!r&&!isDirection();
    document.getElementById('docCategory').value=r?.category||'report';document.getElementById('docTitle').value=r?.title||'';document.getElementById('docLinkType').value=r?.linkType||'hotel';document.getElementById('docTags').value=r?.tags||'';document.getElementById('docDescription').value=r?.description||'';document.getElementById('docFile').value='';document.getElementById('docCurrentFile').textContent=r?`Atual: ${r.fileName} · ${fmtSize(r.size)}. Seleciona outro ficheiro apenas para o substituir.`:'Formatos: PDF, Word, Excel, CSV, imagens e TXT.';document.getElementById('docFormStatus').textContent='';refreshLinkChoices();m.classList.add('open');
  }
  function closeEditor(){document.getElementById('docModal')?.classList.remove('open');state.editing=null;}
  function fileToBase64(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||'').split(',')[1]||'');reader.onerror=()=>reject(reader.error||new Error('Erro ao ler ficheiro'));reader.readAsDataURL(file);});}
  async function saveFromForm(e){
    e.preventDefault();const status=document.getElementById('docFormStatus');const file=document.getElementById('docFile').files?.[0]||null;const old=state.editing;
    try{
      const hotel=document.getElementById('docHotel').value,title=document.getElementById('docTitle').value.trim(),category=document.getElementById('docCategory').value,linkType=document.getElementById('docLinkType').value,linkId=linkType==='hotel'?'':document.getElementById('docLinkId').value;
      if(!hotel||!title)throw new Error('Hotel e título são obrigatórios.');if(!canManageHotel(hotel))throw new Error('Sem permissões para este hotel.');if(linkType!=='hotel'&&!linkId)throw new Error('Seleciona a referência a associar.');
      if(!old&&!file)throw new Error('Seleciona um ficheiro.');if(file){if(file.size>MAX_FILE_BYTES)throw new Error('O ficheiro excede 3,5 MB.');if(!ALLOWED_EXT.has(extOf(file.name)))throw new Error('Formato de ficheiro não permitido.');}
      status.textContent='A guardar…';const payload={id:old?.id||'',expectedUpdatedAt:old?.updatedAt||'',hotel,title,category,linkType,linkId,tags:document.getElementById('docTags').value.trim(),description:document.getElementById('docDescription').value.trim()};
      if(file){payload.fileName=file.name;payload.mime=file.type||'application/octet-stream';payload.size=file.size;payload.contentBase64=await fileToBase64(file);}
      const res=await window.VG.shared.post('ops-document-save','',payload);if(!res?.data)throw new Error('Resposta inválida do servidor.');
      const idx=state.rows.findIndex(x=>x.id===res.data.id);if(idx>=0)state.rows[idx]=res.data;else state.rows.unshift(res.data);state.fetchedAt=Date.now();state.loaded=true;closeEditor();render();window.VG.events?.emit?.('documents:changed',{reason:'saved',id:res.data.id});window.showToast?.('✓ Documento guardado');
    }catch(err){if(status)status.textContent=err.message||String(err);}
  }
  function documentPreviewModal(){let m=document.getElementById('docPreviewModal');if(m)return m;m=document.createElement('div');m.id='docPreviewModal';m.style.cssText='display:none;position:fixed;inset:0;z-index:1800;background:rgba(2,6,23,.72);padding:18px;backdrop-filter:blur(4px)';m.innerHTML='<div style="height:calc(100vh - 36px);max-width:1180px;margin:auto;background:#fff;border-radius:14px;overflow:hidden;display:flex;flex-direction:column"><div style="height:48px;display:flex;align-items:center;gap:10px;padding:0 14px;border-bottom:1px solid #e5e7eb;color:#111827"><strong id="docPreviewTitle" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Documento</strong><button id="docPreviewDownload" type="button" class="doc-btn">Descarregar</button><button id="docPreviewClose" type="button" class="doc-btn">✕</button></div><div id="docPreviewBody" style="flex:1;min-height:0;background:#f3f4f6;display:flex;align-items:center;justify-content:center"></div></div>';document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m||e.target.closest('#docPreviewClose')){const old=m.dataset.url;if(old)URL.revokeObjectURL(old);m.dataset.url='';m.style.display='none';document.getElementById('docPreviewBody').innerHTML='';}});return m;}
  async function fetchDocumentBlob(r){
    const url=window.VG?.shared?.url?.('ops-document-content',r.id);if(!url)throw new Error('Endpoint de documentos indisponível.');
    const token=typeof window.vgAuthToken==='function'?(window.vgAuthToken()||''):'';if(!token)throw new Error('Sessão não iniciada.');
    const res=await fetch(url,{method:'GET',headers:{Authorization:'Bearer '+token},cache:'no-store'});
    if(!res.ok){let msg='HTTP '+res.status;try{const j=await res.json();if(j?.error)msg=j.error;}catch(e){}throw new Error(msg);}
    const blob=await res.blob();if(!blob.size)throw new Error('O ficheiro está vazio.');return {blob,fileName:r.fileName||'documento',mime:res.headers.get('content-type')||r.mime||blob.type||'application/octet-stream'};
  }
  function triggerBlobDownload(blob,fileName){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=fileName||'documento';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);}
  function showDocumentPreview(r,blob,mime){const m=documentPreviewModal(),body=document.getElementById('docPreviewBody'),title=document.getElementById('docPreviewTitle'),dl=document.getElementById('docPreviewDownload');const old=m.dataset.url;if(old)URL.revokeObjectURL(old);const url=URL.createObjectURL(blob);m.dataset.url=url;title.textContent=r.title||r.fileName||'Documento';dl.onclick=()=>triggerBlobDownload(blob,r.fileName);if(mime==='application/pdf'||String(mime).includes('pdf'))body.innerHTML=`<iframe title="${esc(r.title||r.fileName)}" src="${url}" style="width:100%;height:100%;border:0;background:#fff"></iframe>`;else if(String(mime).startsWith('image/'))body.innerHTML=`<img alt="${esc(r.title||r.fileName)}" src="${url}" style="max-width:100%;max-height:100%;object-fit:contain">`;else if(String(mime).startsWith('text/')){blob.text().then(t=>{body.innerHTML=`<pre style="align-self:stretch;margin:0;padding:18px;overflow:auto;white-space:pre-wrap;color:#111827;background:#fff;font:13px/1.45 ui-monospace,monospace">${esc(t)}</pre>`;});}else{body.innerHTML='<div style="padding:24px;text-align:center;color:#374151"><strong>Este formato não tem pré-visualização no browser.</strong><br><span>Use “Descarregar” para abrir no programa adequado.</span></div>';}m.style.display='block';}
  function base64ToBlob(base64,mime){const bin=atob(base64),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return new Blob([bytes],{type:mime||'application/octet-stream'});}
  async function openFile(r,preview){
    try{window.showToast?.('A obter documento…');const d=await fetchDocumentBlob(r);if(preview)showDocumentPreview(r,d.blob,d.mime);else triggerBlobDownload(d.blob,d.fileName);}
    catch(e){window.showToast?.('Erro ao obter documento: '+(e.message||e),true);console.error('Documento '+(r?.id||''),e);}
  }
  async function remove(r){if(!canManageHotel(r.hotel))return;if(!confirm(`Eliminar definitivamente “${r.title||r.fileName}”?`))return;try{await window.VG.shared.post('ops-document-delete','',{id:r.id,expectedUpdatedAt:r.updatedAt});state.rows=state.rows.filter(x=>x.id!==r.id);render();window.VG.events?.emit?.('documents:changed',{reason:'deleted',id:r.id});window.showToast?.('Documento eliminado');}catch(e){window.showToast?.('Erro ao eliminar: '+e.message,true);}}

  async function openFor(opts={}){await ensureLoaded(false);state.hotel=opts.hotel||'';state.linkType=opts.linkType||'all';state.query=opts.query||'';if(typeof window.setView==='function')window.setView('documents');setTimeout(render,0);}
  function all(){return state.rows.slice();}
  function searchItems(){return state.rows.map(r=>({id:r.id,title:r.title||r.fileName,hotel:r.hotel,subtitle:[CATEGORIES[r.category],r.fileName,r.linkLabel].filter(Boolean).join(' · '),keywords:[r.tags,r.description,r.fileName,LINK_TYPES[r.linkType]].filter(Boolean).join(' ')}));}
  async function renderPage(){render();await ensureLoaded(false);render();}
  window.VG.documents={version:26.2,state,ensureLoaded,render:renderPage,all,searchItems,openFor,categories:CATEGORIES,maxFileBytes:MAX_FILE_BYTES};
  window.VG?.events?.on?.('market:before-change',()=>{state.rows=[];state.loaded=false;state.fetchedAt=0;state.loading=null;state.hotel='';});
  window.VG?.events?.on?.('market:changed',()=>ensureLoaded(true).then(()=>{try{renderPage();}catch(e){}}));
  window.documentManagementRender=renderPage;window.documentManagementOpen=openFor;
})();
