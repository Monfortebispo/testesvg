// ==========================================================
// VG DASHBOARD V29 — COMPARAÇÃO DE CENÁRIOS
// Guarda premissas por hotel/mês e compara até 4 cenários
// sobre a base atual do Forecast & Cenários V12.
// ==========================================================
(function(){
  'use strict';
  window.VG=window.VG||{};
  if(window.VG.scenarioComparison?.version>=29)return;

  const MONTHS=['','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const DEFAULT_ADJ={occDelta:0,adrPct:0,otherRevenuePct:0,personnelPct:0,otherCostPct:0};
  const LIMITS={occDelta:[-20,20],adrPct:[-30,30],otherRevenuePct:[-30,30],personnelPct:[-20,20],otherCostPct:[-20,20]};
  const state={loaded:false,loading:null,fetchedAt:0,rows:[],hotel:'',month:new Date().getMonth()+1,selected:new Set(),editing:null,draft:null};
  const REFRESH_MS=20000;

  const esc=v=>window.VG?.util?.escapeHtml?window.VG.util.escapeHtml(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null;};
  const fmt=(v,d=1)=>v==null||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString('pt-PT',{minimumFractionDigits:d,maximumFractionDigits:d});
  const eur=(v,d=0)=>v==null?'—':(window.VG?.market?.formatMoney?window.VG.market.formatMoney(v,d,true):'€ '+fmt(v,d));
  const pct=(v,d=1)=>v==null?'—':fmt(v,d)+'%';
  const signed=(v,d=1,suffix='')=>v==null?'—':`${Number(v)>=0?'+':''}${fmt(v,d)}${suffix}`;
  const currentUser=()=>{try{return typeof window.vgAuthCurrent==='function'?window.vgAuthCurrent():null;}catch(e){return null;}};
  const isDirection=()=>{const u=currentUser();return !!u&&['direcao','admin'].includes(u.role);};
  const currentYear=()=>{try{return String(typeof YR_CUR!=='undefined'?YR_CUR:(window.VG?.state?.currentYear?.()||new Date().getFullYear()));}catch(e){return String(new Date().getFullYear());}};

  function clamp(v,a,b){const x=Number(v)||0;return Math.max(a,Math.min(b,x));}
  function cleanAdjustments(input){
    const out={};
    Object.keys(DEFAULT_ADJ).forEach(k=>{const [a,b]=LIMITS[k];out[k]=clamp(input?.[k]??0,a,b);});
    return out;
  }
  function allHotels(){
    const u=currentUser();if(!u)return [];
    if(!isDirection()){const hs=typeof window.vgAuthHotels==='function'?window.vgAuthHotels():(Array.isArray(u.hotels)?u.hotels:(u.hotel?[u.hotel]:[]));if(hs.length)return hs;}
    let rows=[];
    try{if(typeof RAW!=='undefined'&&RAW)rows=rows.concat(RAW.hotel_list||Object.keys(RAW.hotels_ops||{}));}catch(e){}
    try{const a=typeof window.getActiveHotels==='function'?window.getActiveHotels():[];if(Array.isArray(a))rows=rows.concat(a);}catch(e){}
    rows=rows.concat(state.rows.map(x=>x.hotel).filter(Boolean));
    return [...new Set(rows.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'pt'));
  }
  function canManageHotel(h){const u=currentUser();if(!u)return false;if(isDirection())return true;if(typeof window.vgAuthCanAccessHotel==='function')return window.vgAuthCanAccessHotel(h);return (Array.isArray(u.hotels)?u.hotels:[u.hotel]).some(x=>norm(h)===norm(x));}
  function baseFor(h,m){try{return window.VG?.forecast?.buildBase?.(h,Number(m))||{available:false,reason:'Motor de Forecast indisponível.'};}catch(e){return {available:false,reason:e.message||'Falha no Forecast.'};}}
  function calculate(base,adj){try{return base?.available?window.VG?.forecast?.calculateScenario?.(base,cleanAdjustments(adj)):null;}catch(e){return null;}}
  function baselineSnapshot(base){
    if(!base?.available)return null;
    return {
      forecastOcc:num(base.forecastOcc),target:num(base.target),adrBase:num(base.adrBase),baseRevenue:num(base.baseRevenue),
      personnelRatio:num(base.personnelRatio),otherCostRatio:num(base.otherCostRatio),sedeRatio:num(base.sedeRatio),
      availableRN:num(base.availableRN),referenceYear:String(base.refYear||''),source:String(base.source||''),latestAt:String(base.latestAt||'')
    };
  }
  function resultSnapshot(result){
    if(!result)return null;
    const keys=['occ','rn','adr','lodging','nonRoom','revenue','personnel','otherCosts','costs','sedeEffect','gop','gopPct','revpar','trevpar'];
    const out={};keys.forEach(k=>{const v=num(result[k]);if(v!=null)out[k]=v;});return out;
  }
  function changedBaseline(saved,current){
    if(!saved||!current)return false;
    const tol={forecastOcc:.15,target:.15,adrBase:.5,baseRevenue:5,availableRN:.5,personnelRatio:.001,otherCostRatio:.001,sedeRatio:.001};
    for(const [k,t] of Object.entries(tol)){
      const a=num(saved[k]),b=num(current[k]);if(a==null&&b==null)continue;if(a==null||b==null||Math.abs(a-b)>t)return true;
    }
    return String(saved.latestAt||'')!==String(current.latestAt||'') || String(saved.referenceYear||'')!==String(current.referenceYear||'');
  }
  function scenarioView(row,base){
    const current=calculate(base,row.adjustments||{});
    return {row,current,stale:changedBaseline(row.baseline,baselineSnapshot(base)),captured:row.captured||null};
  }

  async function ensureLoaded(force){
    if(!currentUser())return state.rows;
    if(!force&&state.loaded&&Date.now()-state.fetchedAt<REFRESH_MS)return state.rows;
    if(state.loading)return state.loading;
    state.loading=(async()=>{
      try{
        const r=await window.VG?.shared?.get?.('ops-scenarios');
        if(Array.isArray(r?.data))state.rows=r.data.filter(Boolean);
        state.loaded=true;state.fetchedAt=Date.now();
        window.VG?.events?.emit?.('scenarios:changed',{reason:'loaded',count:state.rows.length});
      }catch(e){console.warn('Comparação de Cenários: carregamento falhou',e);}
      finally{state.loading=null;}
      return state.rows;
    })();
    return state.loading;
  }
  function periodRows(){return state.rows.filter(r=>norm(r.hotel)===norm(state.hotel)&&Number(r.month)===Number(state.month)&&String(r.year||'')===currentYear()).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));}
  function normalizeSelection(){
    const valid=new Set(periodRows().map(x=>x.id));
    [...state.selected].forEach(id=>{if(!valid.has(id))state.selected.delete(id);});
    if(!state.selected.size)periodRows().slice(0,3).forEach(r=>state.selected.add(r.id));
    while(state.selected.size>4)state.selected.delete([...state.selected][0]);
  }
  function setPeriod(h,m){state.hotel=String(h||state.hotel||'');state.month=Math.max(1,Math.min(12,Number(m)||1));state.selected.clear();normalizeSelection();render();}
  function selectScenario(id,on){
    if(on){if(state.selected.size>=4){window.showToast?.('Podes comparar no máximo 4 cenários de cada vez.',true);render();return;}state.selected.add(id);}else state.selected.delete(id);
    renderComparison();renderSavedList();
  }

  function comparisonData(){
    const base=baseFor(state.hotel,state.month);if(!base.available)return {base,columns:[]};
    normalizeSelection();
    const baseResult=calculate(base,DEFAULT_ADJ);
    const columns=[{id:'base',name:'Forecast Base',description:'Base atual do V12',adjustments:{...DEFAULT_ADJ},current:baseResult,stale:false,isBase:true}];
    for(const id of state.selected){const row=state.rows.find(x=>x.id===id);if(row)columns.push({id:row.id,name:row.name,description:row.description||'',adjustments:row.adjustments||{},...scenarioView(row,base)});}
    return {base,columns};
  }
  function deltaClass(v,invert){if(v==null||Math.abs(v)<1e-9)return 'neutral';const good=invert?v<0:v>0;return good?'good':'bad';}
  function metricRow(label,key,format,invert=false){
    const model=comparisonData(),cols=model.columns;if(!cols.length)return '';
    const baseVal=cols[0].current?.[key];
    return `<tr><th>${esc(label)}</th>${cols.map((c,i)=>{const v=c.current?.[key];let delta='';if(i>0&&v!=null&&baseVal!=null){const d=v-baseVal;delta=`<small class="${deltaClass(d,invert)}">${format==='pct'?signed(d,1,' p.p.'):format==='eur'?((d>=0?'+':'-')+eur(Math.abs(d),0)):signed(d,1)}</small>`;}const out=format==='pct'?pct(v,1):format==='eur2'?eur(v,2):format==='eur'?eur(v,0):fmt(v,0);return `<td><strong>${out}</strong>${delta}</td>`;}).join('')}</tr>`;
  }
  function highlightSummary(cols,base){
    if(cols.length<2)return '<div class="sc29-empty-mini">Seleciona cenários guardados para comparar.</div>';
    const actual=cols.slice(1).filter(c=>c.current);
    if(!actual.length)return '';
    const maxBy=k=>actual.reduce((best,c)=>!best||Number(c.current?.[k])>Number(best.current?.[k])?c:best,null);
    const minBy=k=>actual.reduce((best,c)=>!best||Number(c.current?.[k])<Number(best.current?.[k])?c:best,null);
    const g=maxBy('gop'),r=maxBy('revenue'),cost=minBy('costs');
    let target=null;if(base?.target!=null){target=actual.filter(c=>c.current?.occ>=base.target).sort((a,b)=>Number(b.current?.gop)-Number(a.current?.gop))[0]||null;}
    return `<div class="sc29-highlights">
      <div><span>Maior GOP</span><strong>${esc(g?.name||'—')}</strong><small>${g?eur(g.current.gop,0):'—'}</small></div>
      <div><span>Maior Receita</span><strong>${esc(r?.name||'—')}</strong><small>${r?eur(r.current.revenue,0):'—'}</small></div>
      <div><span>Menor custo</span><strong>${esc(cost?.name||'—')}</strong><small>${cost?eur(cost.current.costs,0):'—'}</small></div>
      <div><span>Meta OCC cumprida</span><strong>${esc(target?.name||'Nenhum')}</strong><small>${base?.target!=null?pct(base.target,1):'Sem meta'}</small></div>
    </div><div class="sc29-note">Os destaques são comparações por métrica, não uma recomendação automática. Receita, margem, custos e ocupação podem apontar para cenários diferentes.</div>`;
  }
  function renderComparison(){
    const host=document.getElementById('sc29Comparison');if(!host)return;
    const {base,columns}=comparisonData();
    if(!base.available){host.innerHTML=`<div class="sc29-empty"><strong>Sem base suficiente para comparar.</strong><span>${esc(base.reason||'Carrega P&L e Ocupação para o período.')}</span></div>`;return;}
    host.innerHTML=`${highlightSummary(columns,base)}
      <div class="sc29-table-wrap"><table class="sc29-table"><thead><tr><th>Métrica</th>${columns.map(c=>`<th><span>${esc(c.name)}</span>${c.stale?'<em>Base alterada</em>':''}</th>`).join('')}</tr></thead><tbody>
      ${metricRow('Ocupação','occ','pct')}${metricRow('ADR','adr','eur2')}${metricRow('Receita','revenue','eur')}${metricRow('GOP com sede estimado','gop','eur')}${metricRow('Margem GOP','gopPct','pct')}${metricRow('RevPAR','revpar','eur2')}${metricRow('TRevPAR','trevpar','eur2')}${metricRow('Pessoal','personnel','eur',true)}${metricRow('Outros custos','otherCosts','eur',true)}${metricRow('Custos totais','costs','eur',true)}
      </tbody></table></div>
      <div class="sc29-assumptions">${columns.map(c=>`<article><strong>${esc(c.name)}</strong><span>OCC ${signed(c.adjustments?.occDelta||0,1,' p.p.')}</span><span>ADR ${signed(c.adjustments?.adrPct||0,1,'%')}</span><span>Receita comp. ${signed(c.adjustments?.otherRevenuePct||0,1,'%')}</span><span>Pessoal ${signed(c.adjustments?.personnelPct||0,1,'%')}</span><span>Outros custos ${signed(c.adjustments?.otherCostPct||0,1,'%')}</span>${c.stale?'<small>Recalculado sobre uma base diferente da existente quando foi gravado.</small>':''}</article>`).join('')}</div>`;
  }
  function renderSavedList(){
    const host=document.getElementById('sc29Saved');if(!host)return;normalizeSelection();const rows=periodRows();
    if(!rows.length){host.innerHTML='<div class="sc29-empty-mini">Ainda não existem cenários guardados para este hotel/mês.</div>';return;}
    host.innerHTML=rows.map(r=>`<article class="sc29-saved ${state.selected.has(r.id)?'selected':''}">
      <label class="sc29-check"><input type="checkbox" ${state.selected.has(r.id)?'checked':''} onchange="scenarioCompareSelect('${esc(r.id)}',this.checked)"><span></span></label>
      <div class="sc29-saved-main"><strong>${esc(r.name)}</strong><span>${esc(r.description||'Sem descrição')}</span><small>${esc(r.updatedBy?.name||r.updatedBy?.user||r.createdBy?.name||'')} · ${r.updatedAt?new Date(r.updatedAt).toLocaleString('pt-PT'):''}</small></div>
      <div class="sc29-saved-actions"><button type="button" onclick="scenarioCompareEdit('${esc(r.id)}')">Editar</button><button type="button" onclick="scenarioCompareDelete('${esc(r.id)}')">Eliminar</button></div>
    </article>`).join('');
  }
  function render(){
    const root=document.getElementById('scenarioComparisonRoot');if(!root)return;
    const hotels=allHotels();if(!state.hotel||!hotels.some(h=>norm(h)===norm(state.hotel)))state.hotel=hotels[0]||'';
    normalizeSelection();
    root.innerHTML=`<div class="sc29-head"><div><div class="sc29-eyebrow">Comparação de Cenários · V29</div><h2>Guardar alternativas. Comparar decisões.</h2><p>Compara premissas financeiras e operacionais lado a lado usando o mesmo motor do Forecast & Cenários V12.</p></div><div class="sc29-head-actions"><button type="button" class="sc29-btn secondary" onclick="scenarioCompareRefresh()">↻ Atualizar</button><button type="button" class="sc29-btn primary" onclick="scenarioCompareNew()">＋ Novo cenário</button></div></div>
      <div class="sc29-controls"><label>Hotel<select onchange="scenarioComparePeriod(this.value,null)">${hotels.map(h=>`<option value="${esc(h)}" ${norm(h)===norm(state.hotel)?'selected':''}>${esc(h)}</option>`).join('')}</select></label><label>Mês<select onchange="scenarioComparePeriod(null,this.value)">${MONTHS.slice(1).map((m,i)=>`<option value="${i+1}" ${i+1===Number(state.month)?'selected':''}>${esc(m)}</option>`).join('')}</select></label><div class="sc29-period"><span>Período</span><strong>${MONTHS[state.month]} ${esc(currentYear())}</strong></div></div>
      <div class="sc29-grid"><section class="sc29-panel"><div class="sc29-panel-head"><div><strong>Cenários guardados</strong><span>Seleciona até quatro.</span></div><span>${periodRows().length} cenário(s)</span></div><div id="sc29Saved"></div></section><section class="sc29-panel wide"><div class="sc29-panel-head"><div><strong>Comparação lado a lado</strong><span>Todos os cenários são recalculados sobre a base atual.</span></div></div><div id="sc29Comparison"></div></section></div>`;
    renderSavedList();renderComparison();
    if(state.draft){const d=state.draft;state.draft=null;setTimeout(()=>openEditor(null,d),0);}
  }
  async function renderPage(){render();await ensureLoaded(false);render();}

  function editor(){
    let m=document.getElementById('sc29Editor');if(m)return m;
    m=document.createElement('div');m.id='sc29Editor';m.className='sc29-modal';m.innerHTML=`<div class="sc29-modal-panel" role="dialog" aria-modal="true"><div class="sc29-modal-head"><div><strong id="sc29EditorTitle">Novo cenário</strong><span id="sc29EditorMeta"></span></div><button type="button" data-close>✕</button></div><form id="sc29Form"><div class="sc29-form"><label>Nome<input id="sc29Name" maxlength="100" required placeholder="Ex.: Ambicioso com controlo de custos"></label><label>Descrição<textarea id="sc29Description" rows="3" maxlength="1200" placeholder="Hipótese, objetivo ou contexto da decisão."></textarea></label><div class="sc29-form-grid"><label>Ocupação vs forecast <span>p.p.</span><input id="sc29Occ" type="number" min="-20" max="20" step="0.5"></label><label>ADR <span>%</span><input id="sc29Adr" type="number" min="-30" max="30" step="0.5"></label><label>Receita complementar <span>%</span><input id="sc29OtherRev" type="number" min="-30" max="30" step="0.5"></label><label>Custo de pessoal <span>%</span><input id="sc29Personnel" type="number" min="-20" max="20" step="0.5"></label><label>Outros custos <span>%</span><input id="sc29OtherCost" type="number" min="-20" max="20" step="0.5"></label></div><div class="sc29-presets"><button type="button" data-preset="conservative">Conservador</button><button type="button" data-preset="base">Base</button><button type="button" data-preset="upside">Ambicioso</button><button type="button" data-preset="efficiency">Eficiência</button></div><div id="sc29EditorPreview"></div><div id="sc29FormStatus"></div></div><div class="sc29-modal-foot"><button type="button" class="sc29-btn secondary" data-close>Cancelar</button><button type="submit" class="sc29-btn primary">Guardar cenário</button></div></form></div>`;document.body.appendChild(m);
    m.addEventListener('click',e=>{if(e.target===m||e.target.closest('[data-close]'))m.classList.remove('open');const p=e.target.closest('[data-preset]');if(p){const presets=window.VG?.forecast?.presets||{};fillAdjustments(presets[p.dataset.preset]||DEFAULT_ADJ);updateEditorPreview();}});
    m.querySelector('#sc29Form').addEventListener('submit',saveFromEditor);
    ['sc29Occ','sc29Adr','sc29OtherRev','sc29Personnel','sc29OtherCost'].forEach(id=>m.querySelector('#'+id).addEventListener('input',updateEditorPreview));
    return m;
  }
  function readAdjustments(){return cleanAdjustments({occDelta:document.getElementById('sc29Occ')?.value,adrPct:document.getElementById('sc29Adr')?.value,otherRevenuePct:document.getElementById('sc29OtherRev')?.value,personnelPct:document.getElementById('sc29Personnel')?.value,otherCostPct:document.getElementById('sc29OtherCost')?.value});}
  function fillAdjustments(a){a=cleanAdjustments(a);document.getElementById('sc29Occ').value=a.occDelta;document.getElementById('sc29Adr').value=a.adrPct;document.getElementById('sc29OtherRev').value=a.otherRevenuePct;document.getElementById('sc29Personnel').value=a.personnelPct;document.getElementById('sc29OtherCost').value=a.otherCostPct;}
  function updateEditorPreview(){const host=document.getElementById('sc29EditorPreview');if(!host)return;const base=baseFor(state.hotel,state.month),s=calculate(base,readAdjustments());host.innerHTML=!s?'<div class="sc29-empty-mini">Sem base para pré-visualizar.</div>':`<div class="sc29-preview"><div><span>Ocupação</span><strong>${pct(s.occ,1)}</strong></div><div><span>Receita</span><strong>${eur(s.revenue,0)}</strong></div><div><span>GOP</span><strong>${eur(s.gop,0)}</strong></div><div><span>GOP%</span><strong>${pct(s.gopPct,1)}</strong></div></div>`;}
  function openEditor(row,prefill){
    if(!canManageHotel(state.hotel)){window.showToast?.('Sem permissões para criar cenários deste hotel.',true);return;}
    state.editing=row||null;const m=editor(),a=prefill?.adjustments||row?.adjustments||DEFAULT_ADJ;
    document.getElementById('sc29EditorTitle').textContent=row?'Editar cenário':'Novo cenário';document.getElementById('sc29EditorMeta').textContent=`${state.hotel} · ${MONTHS[state.month]} ${currentYear()}`;
    document.getElementById('sc29Name').value=prefill?.name||row?.name||'';document.getElementById('sc29Description').value=prefill?.description||row?.description||'';document.getElementById('sc29FormStatus').textContent='';fillAdjustments(a);updateEditorPreview();m.classList.add('open');setTimeout(()=>document.getElementById('sc29Name')?.focus(),20);
  }
  async function saveFromEditor(e){
    e.preventDefault();const status=document.getElementById('sc29FormStatus'),base=baseFor(state.hotel,state.month);if(!base.available){status.textContent='Sem base de Forecast para este hotel/mês.';return;}
    const adjustments=readAdjustments(),result=calculate(base,adjustments),name=document.getElementById('sc29Name').value.trim(),description=document.getElementById('sc29Description').value.trim();
    if(name.length<2){status.textContent='Indica um nome para o cenário.';return;}
    const payload={id:state.editing?.id||'',expectedUpdatedAt:state.editing?.updatedAt||'',hotel:state.hotel,year:currentYear(),month:Number(state.month),name,description,adjustments,baseline:baselineSnapshot(base),captured:resultSnapshot(result)};
    try{status.textContent='A guardar…';const r=await window.VG.shared.post('ops-scenario-save','',payload);if(!r?.data)throw new Error('Resposta inválida.');const i=state.rows.findIndex(x=>x.id===r.data.id);if(i>=0)state.rows[i]=r.data;else state.rows.unshift(r.data);state.selected.add(r.data.id);while(state.selected.size>4)state.selected.delete([...state.selected][0]);document.getElementById('sc29Editor').classList.remove('open');state.editing=null;render();window.VG.events?.emit?.('scenarios:changed',{reason:'saved',id:r.data.id});window.showToast?.('Cenário guardado.');}catch(err){status.textContent=err.message||String(err);}
  }
  function edit(id){const r=state.rows.find(x=>x.id===id);if(r)openEditor(r);}
  async function remove(id){const r=state.rows.find(x=>x.id===id);if(!r||!canManageHotel(r.hotel))return;if(!confirm(`Eliminar o cenário “${r.name}”?`))return;try{await window.VG.shared.post('ops-scenario-delete','',{id:r.id,expectedUpdatedAt:r.updatedAt});state.rows=state.rows.filter(x=>x.id!==r.id);state.selected.delete(r.id);render();window.VG.events?.emit?.('scenarios:changed',{reason:'deleted',id:r.id});window.showToast?.('Cenário eliminado.');}catch(e){window.showToast?.('Erro ao eliminar: '+e.message,true);}}
  async function refresh(){await ensureLoaded(true);render();}
  async function openFor(opts={}){await ensureLoaded(false);if(opts.hotel)state.hotel=opts.hotel;if(opts.month)state.month=Number(opts.month)||state.month;state.selected.clear();window.setView?.('scenariocompare');setTimeout(render,20);}
  async function openFromForecast(input={}){await ensureLoaded(false);const s=window.VG?.forecast?.getState?.()||{};state.hotel=input.hotel||s.hotel||state.hotel;state.month=Number(input.month||s.month||state.month);state.selected.clear();state.draft={name:input.name||'',description:input.description||'',adjustments:cleanAdjustments(input.adjustments||s.adjustments||DEFAULT_ADJ)};window.setView?.('scenariocompare');setTimeout(render,20);}
  function searchItems(){return state.rows.map(r=>({id:r.id,title:r.name,hotel:r.hotel,month:Number(r.month)||null,year:r.year,subtitle:`${MONTHS[Number(r.month)]||r.month} ${r.year} · ${r.description||'Cenário guardado'}`,value:'Cenário',keywords:[r.description,'comparacao scenario forecast',Object.entries(r.adjustments||{}).map(([k,v])=>`${k} ${v}`).join(' ')].filter(Boolean).join(' ')}));}

  window.VG.scenarioComparison={version:29,state,ensureLoaded,render:renderPage,all:()=>state.rows.slice(),searchItems,openFor,openFromForecast,baselineSnapshot,resultSnapshot,changedBaseline,cleanAdjustments};
  window.scenarioComparisonRender=renderPage;
  window.scenarioCompareRefresh=refresh;
  window.scenarioCompareNew=()=>openEditor(null);
  window.scenarioCompareEdit=edit;
  window.scenarioCompareDelete=remove;
  window.scenarioCompareSelect=selectScenario;
  window.scenarioComparePeriod=(h,m)=>setPeriod(h||state.hotel,m||state.month);
  window.scenarioCompareFromForecast=()=>openFromForecast({});
  window.VG?.events?.on?.('market:before-change',()=>{state.rows=[];state.loaded=false;state.fetchedAt=0;state.loading=null;state.hotel='';state.selected.clear();});
  window.VG?.events?.on?.('market:changed',()=>ensureLoaded(true).then(()=>{try{renderPage();}catch(e){}}));
})();
