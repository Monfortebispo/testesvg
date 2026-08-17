// ==========================================================
// CENTRO DE DADOS — V10
// Estado das fontes, histórico de carregamentos e rollback.
// ==========================================================
(function(){
  'use strict';
  if (window.__VG_DATA_CENTER_V10__) return;
  window.__VG_DATA_CENTER_V10__ = true;

  const DC_BACKUP_MAX_BYTES = 3.6 * 1024 * 1024; // deixa margem para o limite da Function
  let DC_HISTORY = [];
  let DC_LOADING = false;
  let DC_LOADED_AT = 0;

  const SOURCE_META = {
    pnl_month: { name:'P&L mensal', icon:'📊', category:'Financeiro' },
    pnl_accum: { name:'P&L acumulado', icon:'∑', category:'Financeiro' },
    occupancy: { name:'Ocupação', icon:'🛏', category:'Operacional' },
    occupancy_ref: { name:'Referência ocupação', icon:'↔', category:'Operacional' },
    reputation: { name:'Reputação', icon:'★', category:'Qualidade' },
    instagram: { name:'Instagram', icon:'📱', category:'Qualidade' },
    hotels: { name:'Fichas técnicas', icon:'🏨', category:'Informação' },
    purchases: { name:'Compras & Artigos', icon:'🧾', category:'Financeiro' },
    session: { name:'Sessão completa', icon:'⬡', category:'Sistema' }
  };

  function esc(v){
    return String(v==null?'':v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function clone(v){
    if (v == null) return v;
    try { return JSON.parse(JSON.stringify(v)); } catch(e) { return null; }
  }
  function auth(){ try { return typeof window.vgAuthCurrent==='function' ? window.vgAuthCurrent() : null; } catch(e){ return null; } }
  function isDirection(){ const u=auth(); return !!u && (u.role==='direcao'||u.role==='admin'); }
  function apiToken(){
    try {
      if (typeof window.vgAuthToken === 'function') return window.vgAuthToken() || '';
      return sessionStorage.getItem('vg_auth_token_v6') || '';
    } catch(e){ return ''; }
  }
  async function api(resource, options, key){
    let url=(window.SHARED_API_URL || '/.netlify/functions/dashboard-sessao')+'?resource='+encodeURIComponent(resource);
    if(key!==undefined&&key!==null) url+='&key='+encodeURIComponent(String(key));
    url+='&market='+encodeURIComponent(window.VG?.market?.id?.()||'iberia');
    const opts=Object.assign({},options||{});
    const headers=Object.assign({},opts.headers||{});
    const token=apiToken(); if(token) headers.Authorization='Bearer '+token;
    if(opts.body && !headers['Content-Type']) headers['Content-Type']='application/json';
    opts.headers=headers;
    const res=await fetch(url,opts);
    let body={}; try{ body=await res.json(); }catch(e){}
    if(!res.ok) throw new Error(body.error || ('HTTP '+res.status));
    return body;
  }

  function sizeOf(v){
    try { return new Blob([JSON.stringify(v)]).size; }
    catch(e){ try { return JSON.stringify(v).length; } catch(_){ return Infinity; } }
  }

  function capture(source, key){
    try {
      if(source==='pnl_month') return { source, key:String(key), payload: clone((typeof STORE!=='undefined' && Object.prototype.hasOwnProperty.call(STORE,key)) ? STORE[key] : null), selected: typeof selectedMeses!=='undefined' ? [...selectedMeses] : [] };
      if(source==='pnl_accum') return {
        source, key:String(key),
        payload: clone((typeof STORE_ACUM!=='undefined' && Object.prototype.hasOwnProperty.call(STORE_ACUM,key)) ? STORE_ACUM[key] : null),
        monthlyPayload: clone((typeof STORE!=='undefined' && Object.prototype.hasOwnProperty.call(STORE,key)) ? STORE[key] : null),
        selected: typeof selectedMeses!=='undefined' ? [...selectedMeses] : []
      };
      if(source==='occupancy') return { source, payload: clone(typeof OCC_SNAPSHOTS!=='undefined' ? OCC_SNAPSHOTS : []) };
      if(source==='occupancy_ref') return { source, payload: clone(typeof PIU_SNAPSHOTS!=='undefined' ? PIU_SNAPSHOTS : []) };
      if(source==='reputation') return { source, payload: clone(typeof REP_STORE!=='undefined' ? REP_STORE : {}), selected: typeof rtSelected!=='undefined' ? [...rtSelected] : [] };
      if(source==='instagram') return { source, payload: clone(typeof IG_SNAPSHOTS!=='undefined' ? IG_SNAPSHOTS : []) };
      if(source==='hotels') return { source, payload: clone(typeof HOTEIS_XLSX!=='undefined' ? HOTEIS_XLSX : {}) };
      if(source==='purchases') return { source, payload: clone(typeof cdGetData==='function' ? cdGetData() : null) };
      if(source==='session') return { source, payload: clone(typeof buildSessionSnapshot==='function' ? buildSessionSnapshot() : null) };
    } catch(e){ console.warn('Centro de Dados: não foi possível criar backup de '+source,e); }
    return null;
  }

  function recordPayload(info){
    const src=String(info?.source||'').trim();
    const meta=SOURCE_META[src] || {name:src||'Fonte',category:'Outro'};
    let backup=info?.before || null;
    let backupReason='';
    if(backup && sizeOf(backup)>DC_BACKUP_MAX_BYTES){ backup=null; backupReason='Snapshot anterior demasiado grande para rollback automático.'; }
    return {
      record:{
        source:src,
        sourceName:meta.name,
        category:meta.category,
        action:String(info?.action||'import'),
        status:String(info?.status||'success'),
        fileName:String(info?.fileName||''),
        fileSize:Number(info?.fileSize||0)||0,
        scope:String(info?.scope||''),
        summary:String(info?.summary||''),
        metrics:clone(info?.metrics||{}),
        warnings:Array.isArray(info?.warnings)?info.warnings.map(String).slice(0,12):[],
        duplicate:!!info?.duplicate,
        backupReason
      },
      backup
    };
  }

  async function recordImport(info){
    try {
      const payload=recordPayload(info||{});
      const out=await api('data-import-record',{method:'POST',body:JSON.stringify(payload)});
      if(out?.data){ DC_HISTORY.unshift(out.data); DC_HISTORY=dedupeHistory(DC_HISTORY).slice(0,250); DC_LOADED_AT=Date.now(); }
      render();
      return out?.data || null;
    } catch(e){ console.warn('Centro de Dados: histórico não foi gravado',e); return null; }
  }
  async function recordFailure(info){
    return recordImport(Object.assign({},info||{},{status:'error',before:null}));
  }

  function dedupeHistory(rows){
    const seen=new Set();
    return (rows||[]).filter(r=>{ const k=r&&r.id?String(r.id):JSON.stringify([r?.createdAt,r?.source,r?.fileName,r?.action]); if(seen.has(k))return false; seen.add(k); return true; });
  }

  async function loadHistory(force){
    if(DC_LOADING) return DC_HISTORY;
    if(!force && DC_LOADED_AT && Date.now()-DC_LOADED_AT<30000) return DC_HISTORY;
    DC_LOADING=true;
    try{
      const out=await api('data-import-history',{method:'GET'});
      DC_HISTORY=dedupeHistory(Array.isArray(out?.data)?out.data:[]);
      DC_LOADED_AT=Date.now();
    }catch(e){ console.warn('Centro de Dados: não foi possível carregar histórico',e); }
    finally{ DC_LOADING=false; render(); }
    return DC_HISTORY;
  }

  function latestHistory(source){ return DC_HISTORY.find(r=>r.source===source && r.status!=='error') || null; }
  function errorHistory(source){ return DC_HISTORY.find(r=>r.source===source && r.status==='error') || null; }
  function when(iso){
    if(!iso) return '—'; const d=new Date(iso); if(isNaN(d)) return '—';
    return d.toLocaleString('pt-PT',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
  }
  function ageDays(iso){ if(!iso) return null; const n=new Date(iso).getTime(); return isNaN(n)?null:Math.max(0,(Date.now()-n)/86400000); }

  function pnlCoverage(){
    const months=typeof STORE!=='undefined'?Object.keys(STORE).map(Number).filter(Boolean).sort((a,b)=>a-b):[];
    const hotels=new Set(); months.forEach(m=>(STORE[m]?.hotel_list||[]).forEach(h=>hotels.add(h)));
    const latest=months.length?months[months.length-1]:null;
    return { present:months.length>0, coverage:months.length?`${months.length} mês(es) · ${hotels.size} hotéis`:'Sem P&L mensal', detail:latest?`Último mês em memória: ${(typeof PNL_MESES!=='undefined'&&PNL_MESES[latest])||latest}`:'', count:months.length };
  }
  function pnlAccumCoverage(){
    const months=typeof STORE_ACUM!=='undefined'?Object.keys(STORE_ACUM).map(Number).filter(Boolean).sort((a,b)=>a-b):[];
    const latest=months.length?months[months.length-1]:null;
    return {present:months.length>0,coverage:months.length?`${months.length} acumulado(s)`:'Sem P&L acumulado',detail:latest?`Acumulado oficial até ${(typeof PNL_MESES!=='undefined'&&PNL_MESES[latest])||latest}`:'',count:months.length};
  }
  function occupancyCoverage(){
    const arr=typeof OCC_SNAPSHOTS!=='undefined'&&Array.isArray(OCC_SNAPSHOTS)?OCC_SNAPSHOTS:[];
    const last=arr.length?arr[arr.length-1]:null; const hotels=last?.data?Object.keys(last.data).length:0;
    const seen=new Set(), dup=[]; arr.forEach(s=>{const k=String(s.ts||s.label||'');if(seen.has(k))dup.push(k);else seen.add(k);});
    return {present:arr.length>0,coverage:arr.length?`${arr.length} snapshot(s) · ${hotels} hotéis`:'Sem ocupação',detail:last?`Último snapshot: ${last.label||when(last.loadedAt)}`:'',duplicates:dup.length};
  }
  function refCoverage(){
    const arr=typeof PIU_SNAPSHOTS!=='undefined'&&Array.isArray(PIU_SNAPSHOTS)?PIU_SNAPSHOTS:[];
    return {present:arr.length>0,coverage:arr.length?`${arr.length} referência(s)`:'Sem referência histórica',detail:arr.length?`Última: ${arr[arr.length-1].label||'—'}`:''};
  }
  function reputationCoverage(){
    const st=typeof REP_STORE!=='undefined'&&REP_STORE?REP_STORE:{}; const hotels=Object.keys(st); let entries=0; hotels.forEach(h=>entries+=(Array.isArray(st[h])?st[h].length:0));
    return {present:hotels.length>0,coverage:hotels.length?`${hotels.length} hotéis · ${entries} períodos`:'Sem reputação',detail:hotels.length?'Dados de reputação disponíveis para análise':''};
  }
  function instagramCoverage(){
    const arr=typeof IG_SNAPSHOTS!=='undefined'&&Array.isArray(IG_SNAPSHOTS)?IG_SNAPSHOTS:[]; const latest=arr.length?arr[arr.length-1]:null; const months=latest?.months?Object.keys(latest.months).length:0;
    const hotels=new Set(); if(latest?.months) Object.values(latest.months).forEach(x=>Object.keys(x||{}).forEach(h=>hotels.add(h)));
    return {present:arr.length>0,coverage:arr.length?`${months} mês(es) · ${hotels.size} hotéis`:'Sem Instagram',detail:latest?`Atualizado: ${when(latest.loadedAt)}`:''};
  }
  function hotelsCoverage(){
    const st=typeof HOTEIS_XLSX!=='undefined'&&HOTEIS_XLSX?HOTEIS_XLSX:{}; const n=Object.keys(st).length;
    return {present:n>0,coverage:n?`${n} fichas técnicas`:'Sem fichas técnicas',detail:n?'Informação operacional carregada':''};
  }
  function purchasesCoverage(){
    let d=null; try{d=typeof cdGetData==='function'?cdGetData():null;}catch(e){}
    const months=d?.meta?.meses?.length||0; const moves=d?.meta?.n || d?.meta?.movimentos || (Array.isArray(d?.G)?d.G.length:0);
    return {present:!!d,coverage:d?`${months} mês(es)${moves?` · ${Number(moves).toLocaleString('pt-PT')} registos`:''}`:'Sem compras',detail:d?.meta?.fonte?String(d.meta.fonte):''};
  }

  function sourceRows(){
    const qualityCount=(()=>{ try{return typeof validateDashboardData==='function'&&typeof RAW!=='undefined'&&RAW?(validateDashboardData(RAW)||[]).length:0;}catch(e){return 0;} })();
    const defs=[
      ['pnl_month',pnlCoverage()],['pnl_accum',pnlAccumCoverage()],['occupancy',occupancyCoverage()],['occupancy_ref',refCoverage()],['reputation',reputationCoverage()],['instagram',instagramCoverage()],['purchases',purchasesCoverage()],['hotels',hotelsCoverage()]
    ];
    return defs.map(([id,cov])=>{
      const h=latestHistory(id), err=errorHistory(id); const age=ageDays(h?.createdAt); let level='ok', label='OK';
      if(!cov.present){level='empty';label='Sem dados';}
      else if((cov.duplicates||0)>0 || (id==='pnl_month'&&qualityCount>0)){level='warn';label='Atenção';}
      else if(age!=null&&age>45){level='stale';label='Desatualizado';}
      if(err && (!h || String(err.createdAt)>String(h.createdAt))){level='warn';label='Última carga falhou';}
      return {id,meta:SOURCE_META[id],...cov,history:h,lastError:err,level,label,quality:id==='pnl_month'?qualityCount:0};
    });
  }

  function statSummary(rows){
    return {
      ok:rows.filter(x=>x.level==='ok').length,
      warn:rows.filter(x=>x.level==='warn'||x.level==='stale').length,
      empty:rows.filter(x=>x.level==='empty').length,
      rollbacks:DC_HISTORY.filter(x=>x.action==='rollback').length
    };
  }

  function render(){
    const root=document.getElementById('dcRoot'); if(!root) return;
    const rows=sourceRows(), stats=statSummary(rows);
    const latest=DC_HISTORY[0];
    root.innerHTML=`
      <div class="dc-head">
        <div><div class="dc-eyebrow">Governação de dados · V10</div><h2>Centro de Dados</h2><p>Estado das fontes, cobertura, histórico de carregamentos e recuperação de versões anteriores.</p></div>
        <div class="dc-head-actions"><button class="dc-btn" onclick="dcLoadHistory(true)">↻ Atualizar histórico</button></div>
      </div>
      <div class="dc-stats">
        <div class="dc-stat"><span>Fontes OK</span><strong>${stats.ok}</strong></div>
        <div class="dc-stat warn"><span>Atenção</span><strong>${stats.warn}</strong></div>
        <div class="dc-stat muted"><span>Sem dados</span><strong>${stats.empty}</strong></div>
        <div class="dc-stat"><span>Carregamentos registados</span><strong>${DC_HISTORY.length}</strong></div>
        <div class="dc-stat"><span>Última atividade</span><strong class="dc-stat-date">${latest?esc(when(latest.createdAt)):'—'}</strong></div>
      </div>
      <div class="dc-section-title"><div><strong>Estado das fontes</strong><span>O estado é calculado a partir dos dados atualmente carregados e do histórico registado desde a V10.</span></div></div>
      <div class="dc-source-grid">${rows.map(sourceCard).join('')}</div>
      <div class="dc-history-wrap">
        <div class="dc-section-title"><div><strong>Histórico de carregamentos</strong><span>Utilizador, ficheiro, âmbito, avisos e possibilidade de rollback quando existe snapshot anterior.</span></div>
          <div class="dc-history-tools"><select id="dcFilterSource" onchange="dcRenderHistory()"><option value="">Todas as fontes</option>${Object.entries(SOURCE_META).filter(([k])=>k!=='session').map(([k,m])=>`<option value="${esc(k)}">${esc(m.name)}</option>`).join('')}</select><input id="dcSearch" type="search" placeholder="Pesquisar ficheiro, utilizador, âmbito…" oninput="dcRenderHistory()"></div>
        </div>
        <div id="dcHistoryTable"></div>
      </div>`;
    renderHistory();
  }

  function sourceCard(r){
    const h=r.history; const note=h?`${when(h.createdAt)} · ${h.name||h.user||'—'}`:'Histórico começa na V10';
    const warning=[]; if(r.duplicates)warning.push(`${r.duplicates} snapshot(s) duplicado(s)`); if(r.quality)warning.push(`${r.quality} validação(ões) de dados`);
    return `<article class="dc-source ${esc(r.level)}">
      <div class="dc-source-top"><div class="dc-source-icon">${esc(r.meta.icon)}</div><div class="dc-source-title"><strong>${esc(r.meta.name)}</strong><span>${esc(r.meta.category)}</span></div><span class="dc-badge ${esc(r.level)}">${esc(r.label)}</span></div>
      <div class="dc-source-coverage">${esc(r.coverage)}</div>
      <div class="dc-source-detail">${esc(r.detail||'')}</div>
      ${warning.length?`<div class="dc-source-warning">⚠ ${esc(warning.join(' · '))}</div>`:''}
      <div class="dc-source-foot"><span>Última carga: ${esc(note)}</span>${h?.fileName?`<span class="dc-file" title="${esc(h.fileName)}">${esc(h.fileName)}</span>`:''}</div>
    </article>`;
  }

  function historyFiltered(){
    const sel=document.getElementById('dcFilterSource')?.value||''; const q=(document.getElementById('dcSearch')?.value||'').trim().toLowerCase();
    return DC_HISTORY.filter(r=>(!sel||r.source===sel)&&(!q||[r.fileName,r.name,r.user,r.scope,r.summary,r.sourceName].join(' ').toLowerCase().includes(q)));
  }
  function renderHistory(){
    const el=document.getElementById('dcHistoryTable'); if(!el)return;
    const rows=historyFiltered(); if(!rows.length){el.innerHTML='<div class="dc-empty">Ainda não existem carregamentos registados para este filtro.</div>';return;}
    el.innerHTML=`<div class="dc-table-scroll"><table class="dc-table"><thead><tr><th>Data</th><th>Fonte</th><th>Ficheiro / âmbito</th><th>Utilizador</th><th>Resultado</th><th>Rollback</th></tr></thead><tbody>${rows.slice(0,200).map(r=>{
      const status=r.status==='error'?'Erro':r.action==='rollback'?'Rollback':r.duplicate?'Atualização':'OK';
      const cls=r.status==='error'?'err':r.duplicate?'warn':'ok';
      const rb=isDirection()&&r.backupAvailable&&r.status!=='error'?`<button class="dc-rollback" onclick="dcRollback('${esc(r.id)}')">Reverter</button>`:(r.backupReason?`<span class="dc-no-rb" title="${esc(r.backupReason)}">Indisponível</span>`:'—');
      const warn=Array.isArray(r.warnings)&&r.warnings.length?`<div class="dc-row-warn">${esc(r.warnings.join(' · '))}</div>`:'';
      return `<tr><td>${esc(when(r.createdAt))}</td><td><strong>${esc(r.sourceName||SOURCE_META[r.source]?.name||r.source)}</strong></td><td><div class="dc-file-main">${esc(r.fileName||'—')}</div><div class="dc-scope">${esc(r.scope||r.summary||'')}</div>${warn}</td><td>${esc(r.name||r.user||'—')}</td><td><span class="dc-result ${cls}">${esc(status)}</span></td><td>${rb}</td></tr>`;
    }).join('')}</tbody></table></div>`;
  }

  async function rollback(id){
    if(!isDirection()){ showToast('Apenas a Direção pode reverter carregamentos.',true); return; }
    const rec=DC_HISTORY.find(x=>x.id===id); if(!rec){showToast('Registo não encontrado.',true);return;}
    if(!confirm(`Reverter o carregamento de ${rec.sourceName||rec.source}${rec.fileName?' ('+rec.fileName+')':''}?\n\nA versão anterior será restaurada e a sincronização partilhada será iniciada.`))return;
    try{
      const current=capture(rec.source, rec.scopeKey || rec.key || rec.metrics?.month);
      const out=await api('data-import-backup',{method:'GET'},id);
      if(!out?.data) throw new Error('Snapshot anterior não disponível.');
      applyBackup(out.data);
      if(typeof idbSaveAll==='function') await idbSaveAll();
      await recordImport({source:rec.source,action:'rollback',status:'success',fileName:rec.fileName,scope:'Rollback de '+(rec.scope||rec.fileName||rec.sourceName||rec.source),summary:'Reposição da versão anterior',before:current,metrics:{rollbackOf:id}});
      showToast('✓ Versão anterior restaurada · sincronização partilhada iniciada.');
      render();
    }catch(e){ console.error(e); showToast('Não foi possível reverter: '+e.message,true); }
  }

  function applyBackup(b){
    if(!b||!b.source) throw new Error('Backup inválido.');
    if(b.source==='pnl_month'){
      const k=Number(b.key); if(b.payload==null) delete STORE[k]; else STORE[k]=clone(b.payload);
      if(typeof selectedMeses!=='undefined'){ selectedMeses.clear(); (b.selected||[]).forEach(m=>selectedMeses.add(Number(m))); if(!selectedMeses.size&&Object.keys(STORE).length) selectedMeses.add(Math.max(...Object.keys(STORE).map(Number))); }
      if(typeof updateYearGlobals==='function')updateYearGlobals(); if(typeof buildMesButtons==='function')buildMesButtons(); if(typeof applyMesSelection==='function')applyMesSelection();
    } else if(b.source==='pnl_accum'){
      const k=Number(b.key);
      if(b.payload==null) delete STORE_ACUM[k]; else STORE_ACUM[k]=clone(b.payload);
      if(b.monthlyPayload==null) delete STORE[k]; else STORE[k]=clone(b.monthlyPayload);
      if(typeof selectedMeses!=='undefined'){ selectedMeses.clear(); (b.selected||[]).forEach(m=>selectedMeses.add(Number(m))); if(!selectedMeses.size&&Object.keys(STORE).length) selectedMeses.add(Math.max(...Object.keys(STORE).map(Number))); }
      if(typeof updateYearGlobals==='function')updateYearGlobals(); if(typeof buildMesButtons==='function')buildMesButtons(); if(typeof applyMesSelection==='function')applyMesSelection(); if(typeof hsRender==='function'&&currentView==='fichahotel')hsRender();
    } else if(b.source==='occupancy'){
      OCC_SNAPSHOTS=clone(b.payload||[]); if(typeof occSortSnapshots==='function')occSortSnapshots(); if(typeof occUpdateUI==='function')occUpdateUI();
    } else if(b.source==='occupancy_ref'){
      PIU_SNAPSHOTS=clone(b.payload||[]); if(typeof piuSaveToDB==='function')piuSaveToDB(); if(typeof piuRefreshChips==='function')piuRefreshChips(); if(typeof piuPopulateHotelSel==='function')piuPopulateHotelSel(); if(typeof piuRender==='function')piuRender();
    } else if(b.source==='reputation'){
      Object.keys(REP_STORE).forEach(k=>delete REP_STORE[k]); Object.assign(REP_STORE,clone(b.payload||{})); if(typeof rtSelected!=='undefined'){rtSelected.clear();(b.selected||[]).forEach(k=>rtSelected.add(k));} if(typeof rtRender==='function')rtRender();
    } else if(b.source==='instagram'){
      IG_SNAPSHOTS=clone(b.payload||[]); if(typeof igUpdateUI==='function')igUpdateUI();
    } else if(b.source==='hotels'){
      HOTEIS_XLSX=clone(b.payload||{}); if(typeof hoteisFiltrar==='function')hoteisFiltrar();
    } else if(b.source==='purchases'){
      if(typeof cdSetData==='function')cdSetData(clone(b.payload)); else throw new Error('Módulo de compras indisponível.'); if(currentView==='compras'&&typeof cdRender==='function')cdRender();
    } else if(b.source==='session'){
      if(typeof restoreFromSnapshot!=='function')throw new Error('Restauro de sessão indisponível.'); restoreFromSnapshot(clone(b.payload));
    } else throw new Error('Tipo de backup não suportado: '+b.source);
    try{ if(typeof refreshAll==='function')refreshAll(); }catch(e){}
    window.VG?.state?.changed('data-center-rollback',{source:b.source});
  }

  window.vgDataCenterCapture=capture;
  window.vgDataCenterRecord=recordImport;
  window.vgDataCenterRecordFailure=recordFailure;
  window.vgDataCenterApplyBackup=applyBackup;
  window.dcRender=render;
  window.dcRenderHistory=renderHistory;
  window.dcLoadHistory=async function(force){const r=await loadHistory(!!force);render();return r;};
  window.dcRollback=rollback;
  window.vgDataCenterHistory=()=>clone(DC_HISTORY);
  window.vgDataCenterSources=()=>clone(sourceRows());

  function init(){ if(apiToken()) loadHistory(false).catch(()=>{}); }
  window.VG?.events?.on?.('market:before-change',()=>{DC_HISTORY=[];DC_LOADED_AT=0;DC_LOADING=false;});
  window.VG?.events?.on?.('market:changed',()=>{if(apiToken())loadHistory(true).then(()=>render()).catch(()=>{});});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
