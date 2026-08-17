// ==========================================================
// VG OPERATIONS 2.0 / V30 — HOTEL 360º
// Nova visão agregada. A Comentários Fecho do Mês original permanece intacta.
// Inclui Score V28, causa estimada e objetivos/planos de recuperação.
// ==========================================================
(function(){
  'use strict';
  window.VG=window.VG||{};
  if(window.VG.hotel360?.version>=30.3)return;
  const state={hotel:'',tab:'overview',hydrating:false,hydrated:false};
  const n=v=>{const x=Number(v);return Number.isFinite(x)?x:null;};
  const esc=v=>window.VG?.util?.escapeHtml?window.VG.util.escapeHtml(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=v=>String(v||'').trim().toUpperCase();
  const fmt=(v,d=1)=>n(v)==null?'—':Number(v).toLocaleString('pt-PT',{minimumFractionDigits:d,maximumFractionDigits:d});
  const money=v=>window.VG?.market?.formatMoneyCompact?window.VG.market.formatMoneyCompact(v,2):(()=>{const x=n(v);if(x==null)return '—';const a=Math.abs(x),s=x<0?'-':'';if(a>=1e6)return `${s}€${fmt(a/1e6,2)}M`;if(a>=1000)return `${s}€${fmt(a/1000,0)}K`;return `${s}€${fmt(a,0)}`;})();
  const pct=(v,d=1)=>n(v)==null?'—':`${fmt(v,d)}%`;
  const curSym=()=>window.VG?.market?.symbol?.()||'€';
  const signedMoney=v=>{const x=n(v);if(x==null)return '—';return `${x>=0?'+':''}${money(x)}`;};
  const user=()=>{try{return typeof window.vgAuthCurrent==='function'?window.vgAuthCurrent():null;}catch(e){return null;}};
  const isDirection=()=>{const u=user();return !!u&&['direcao','admin'].includes(u.role);};
  const year=()=>String(typeof YR_CUR!=='undefined'?YR_CUR:window.VG?.state?.currentYear?.()||new Date().getFullYear());
  const prevYear=()=>String(typeof YR_PREV!=='undefined'?YR_PREV:Number(year())-1);
  const op=(h,k,y)=>n(typeof RAW!=='undefined'?RAW?.hotels_ops?.[h]?.[k]?.[String(y)]:null);
  const cost=(h,k,y)=>n(typeof RAW!=='undefined'?RAW?.hotels_costs?.[h]?.[k]?.[String(y)]:null);
  const gop=(h,y)=>{try{return n(window.VG?.kpi?.gop?.(h,String(y),RAW));}catch(e){return op(h,'GOP COM SEDE',y);}};
  const allHotels=()=>window.VG?.hotelPerformance?.allHotels?.()||[];

  function model(h){
    const hp=window.VG?.hotelPerformance;if(!hp?.buildModel)return {available:false};
    let hotel=h||state.hotel;const u=user();if(u&&typeof window.vgAuthCanAccessHotel==='function'&&!['direcao','admin'].includes(u.role)&&!window.vgAuthCanAccessHotel(hotel)){const hs=window.VG?.hotelPerformance?.allHotels?.()||[];hotel=hs[0]||'';}
    const m=hp.buildModel(hotel);if(m?.hotel)state.hotel=m.hotel;return m;
  }
  function costConvention(h,cy,py){
    const anchors=[cost(h,'TOTAIS',cy),cost(h,'TOTAIS',py)].filter(v=>v!=null&&Math.abs(v)>0.5);
    if(!anchors.length)return 1;
    return anchors.reduce((a,b)=>a+b,0)<0?-1:1;
  }
  function expenseAmount(raw,sign){const x=n(raw);if(x==null)return null;return sign<0?-x:x;}
  function expenseImpact(prevRaw,curRaw,sign){
    const prev=expenseAmount(prevRaw,sign),cur=expenseAmount(curRaw,sign);
    if(prev==null||cur==null)return null;
    // Impacto no GOP: gastar menos é positivo; gastar mais é negativo.
    return prev-cur;
  }
  function causeAnalysis(h){
    const cy=year(),py=prevYear();const gCur=gop(h,cy),gPrev=gop(h,py),revCur=op(h,'Receita Total',cy),revPrev=op(h,'Receita Total',py);
    if(gCur==null||gPrev==null)return {available:false,items:[],text:'Sem dois períodos comparáveis para decompor a variação do GOP.'};
    const sign=costConvention(h,cy,py);
    const items=[];
    const push=(id,label,impact,source,detail='')=>{if(n(impact)!=null&&Math.abs(impact)>0.5)items.push({id,label,impact:Number(impact),source,detail});};
    const revImpact=(revCur??0)-(revPrev??0);
    push('revenue','Receita total',revImpact,'P&L · Receita Total',revImpact>=0?'Receita superior ao ano anterior':'Receita inferior ao ano anterior');
    const cats=[['personnel','Pessoal','PESSOAL'],['energy','Energia','ENERGIA'],['maintenance','Manutenção','MANUTENÇÃO'],['food','Comidas','COMIDAS'],['beverage','Bebidas','BEBIDAS'],['operational','Operacionais','OPERACIONAIS'],['marketing','Marketing','MARKETING']];
    let selectedImpact=0;
    for(const [id,label,key] of cats){
      const impact=expenseImpact(cost(h,key,py),cost(h,key,cy),sign);
      if(impact!=null)selectedImpact+=impact;
      push(id,label,impact,`P&L · ${key}`,impact==null?'':impact>=0?'Custo inferior ao ano anterior':'Custo superior ao ano anterior');
    }
    const totalImpact=expenseImpact(cost(h,'TOTAIS',py),cost(h,'TOTAIS',cy),sign);
    if(totalImpact!=null){const otherImpact=totalImpact-selectedImpact;push('othercosts','Outros custos',otherImpact,'P&L · restante custo total',otherImpact>=0?'Custo inferior ao ano anterior':'Custo superior ao ano anterior');}
    const gopDelta=gCur-gPrev;const explained=items.reduce((sum,x)=>sum+x.impact,0);
    push('reconciliation','Sede / reconciliação',gopDelta-explained,'Reconciliação para GOP com sede','Residual necessário para reconciliar a ponte com o GOP oficial');
    items.sort((a,b)=>Math.abs(b.impact)-Math.abs(a.impact));
    const occCur=window.VG?.hotelPerformance?.metric?.(h,'occupancy',cy),occPrev=window.VG?.hotelPerformance?.metric?.(h,'occupancy',py),adrCur=window.VG?.hotelPerformance?.metric?.(h,'adr',cy),adrPrev=window.VG?.hotelPerformance?.metric?.(h,'adr',py);
    const occD=n(occCur)!=null&&n(occPrev)!=null?occCur-occPrev:null,adrD=n(adrCur)!=null&&n(adrPrev)!=null&&adrPrev!==0?(adrCur-adrPrev)/Math.abs(adrPrev)*100:null;
    let text=`O GOP com sede ${gopDelta>=0?'melhorou':'deteriorou-se'} ${money(Math.abs(gopDelta))} face a ${py}.`;
    if(occD!=null||adrD!=null)text+=` Ocupação ${occD==null?'sem comparação':`${occD>=0?'subiu':'desceu'} ${fmt(Math.abs(occD),1)} p.p.`}; ADR ${adrD==null?'sem comparação':`${adrD>=0?'subiu':'desceu'} ${fmt(Math.abs(adrD),1)}%`}.`;
    return {available:true,gopDelta,items,text,costSign:sign,method:'Ponte explicativa do impacto no GOP: ΔReceita + poupança/aumento de custos por família + residual de reconciliação. Verde melhora o GOP; vermelho deteriora.'};
  }
  function objectives(m){
    if(!m?.available)return [];
    const out=[];
    for(const k of m.kpis||[]){const t=n(k?.target?.value),v=n(k?.id==='revenue'?k.delta:k.value);if(t==null||v==null)continue;const gap=k.lower?t-v:v-t;if(gap>=0)continue;out.push({id:k.id,label:k.label,current:v,target:t,gap:Math.abs(gap),lower:!!k.lower,source:k.target?.source||'Meta'});}
    if(m.forecast?.available&&n(m.forecast.target)!=null&&n(m.forecast.forecast)!=null&&m.forecast.forecast<m.forecast.target){out.unshift({id:'forecastOcc',label:`Forecast OCC · ${m.forecast.monthLabel||''}`.trim(),current:m.forecast.forecast,target:m.forecast.target,gap:m.forecast.target-m.forecast.forecast,lower:false,source:'Revenue / meta OCC'});}
    return out.slice(0,8);
  }
  function recoveryActions(m,obj){
    const all=m?.actionInfo?.active||[];const key=`recovery:${norm(m.hotel)}:${obj.id}:${year()}`;
    const linked=all.filter(a=>String(a.sourceKey||'').startsWith(key));return {key,linked};
  }
  async function createRecovery(metricId){
    const m=model();const obj=objectives(m).find(x=>x.id===metricId);if(!obj)return;
    const link=recoveryActions(m,obj);const unit=obj.id==='forecastOcc'||obj.id==='occupancy'||obj.id==='gopMargin'||obj.id==='costRatio'||obj.id==='personnelRatio'?'p.p.':obj.id==='adr'||obj.id==='revpar'?curSym():'%';
    const priority={hotel:m.hotel,sourceKey:link.key,kind:'recovery-plan',severity:'orange',title:`Plano de recuperação · ${obj.label}`,reasons:[`Atual: ${fmt(obj.current,1)}${unit}`,`Meta: ${fmt(obj.target,1)}${unit}`,`Gap a recuperar: ${fmt(obj.gap,1)}${unit}`,`Fonte: ${obj.source}`]};
    await window.VG?.actions?.openForPriority?.(priority);
  }
  function scoreCard(m){const s=window.VG?.operationalScore?.calculate?.(m);if(!s?.available)return '<div class="v30-score unavailable">Score indisponível</div>';
    const dims=Object.entries(s.dimensions).map(([id,v])=>`<button data-score-dim="${esc(id)}"><span>${esc(window.VG.operationalScore.LABELS[id]||id)}</span><strong>${v}</strong><i style="--score:${v}%"></i></button>`).join('');
    return `<section class="v30-score ${s.status}"><div class="v30-score-main"><span>Score Operacional</span><strong>${s.score}<small>/100</small></strong><em>${esc(s.statusLabel)}</em></div><div class="v30-score-dims">${dims}</div>${isDirection()?'<button class="v30-soft-btn" data-v30-cmd="score-config">Configurar pesos</button>':''}</section>`;
  }
  function kpiCards(m){return (m.kpis||[]).slice(0,8).map(k=>`<article class="v30-kpi"><span>${esc(k.label)}</span><strong>${esc(k.display)}</strong><small class="${n(k.delta)!=null&&k.delta<0&&!k.lower?'bad':n(k.delta)!=null&&k.delta>0&&k.lower?'bad':'good'}">${esc(k.deltaDisplay||'—')} vs ${esc(m.prevYear)}</small></article>`).join('');}
  function causeHtml(m){const c=causeAnalysis(m.hotel);if(!c.available)return `<div class="v30-empty">${esc(c.text)}</div>`;return `<div class="v30-cause-summary"><strong>${esc(c.text)}</strong><small>${esc(c.method)}</small></div><div class="v30-cause-legend"><span class="good">● Impacto positivo no GOP</span><span class="bad">● Impacto negativo no GOP</span></div><div class="v30-cause-list">${c.items.slice(0,8).map(x=>`<div class="v30-cause-row ${x.impact<0?'bad':'good'}"><span>${esc(x.label)}<small>${esc(x.source)}${x.detail?' · '+esc(x.detail):''}</small></span><strong>${signedMoney(x.impact)}</strong></div>`).join('')}</div>`;}
  function objectivesHtml(m){const obs=objectives(m);if(!obs.length)return '<div class="v30-good-box">✓ Não existem gaps face às metas explícitas disponíveis.</div>';
    return `<div class="v30-objectives">${obs.map(o=>{const ra=recoveryActions(m,o);const unit=['forecastOcc','occupancy','gopMargin','costRatio','personnelRatio'].includes(o.id)?' p.p.':o.id==='adr'||o.id==='revpar'?' '+curSym():'%';return `<article><div><span>${esc(o.label)}</span><strong>Gap ${fmt(o.gap,1)}${unit}</strong><small>${fmt(o.current,1)} → meta ${fmt(o.target,1)} · ${esc(o.source)}</small></div><div>${ra.linked.length?`<button data-action-id="${esc(ra.linked[0].id)}">${ra.linked.length} ação(ões) · abrir</button>`:`<button class="primary" data-recovery="${esc(o.id)}">Criar ação de recuperação</button>`}</div></article>`;}).join('')}</div>`;}
  function overview(m){const s=m.status||{},risk=m.risks?.[0],opp=m.opportunities?.[0],a=m.actionInfo||{};return `${scoreCard(m)}<section class="v30-hero ${esc(s.level||'good')}"><div><span>Situação</span><strong>${esc(s.label||'—')}</strong><small>${esc(s.text||'')}</small></div><div><span>Onde atuar primeiro</span><strong>${esc(risk?.title||'Manter acompanhamento')}</strong><small>${esc(risk?.detail||'Sem prioridade material identificada.')}</small></div><div><span>Maior oportunidade</span><strong>${esc(opp?.title||'Sem oportunidade material')}</strong><small>${esc(opp?.detail||'')}</small></div><div><span>Execução</span><strong>${a.active?.length||0} ações</strong><small>${a.overdue?.length||0} fora do prazo</small></div></section><section class="v30-kpi-grid">${kpiCards(m)}</section><div class="v30-two"><section class="v30-panel"><header><div><strong>Análise automática de causa</strong><small>Explica a variação do GOP com dados P&amp;L</small></div></header>${causeHtml(m)}</section><section class="v30-panel"><header><div><strong>Objetivos &amp; plano de recuperação</strong><small>Meta → gap → ação</small></div></header>${objectivesHtml(m)}</section></div>`;}
  function financial(m){return `<div class="v30-two"><section class="v30-panel"><header><strong>Indicadores financeiros</strong><button onclick="setView('pl')">Abrir P&amp;L →</button></header><div class="v30-kpi-grid compact">${kpiCards(m).split('</article>').slice(0,3).join('</article>')}</div></section><section class="v30-panel"><header><strong>Ponte do GOP</strong></header>${causeHtml(m)}</section></div>`;}
  function revenue(m){const f=m.forecast||{};return `<section class="v30-panel"><header><div><strong>Revenue &amp; Forecast</strong><small>${esc(f.monthLabel||'Mês ativo')}</small></div><button onclick="setView('revenuehub')">Abrir área completa →</button></header><div class="v30-forecast-strip"><div><span>OCC atual</span><strong>${pct(f.occNow)}</strong></div><div><span>Forecast</span><strong>${pct(f.forecast)}</strong></div><div><span>Meta</span><strong>${pct(f.target)}</strong></div><div><span>Gap</span><strong>${n(f.gap)==null?'—':`${f.gap>=0?'+':''}${fmt(f.gap,1)} p.p.`}</strong></div><div><span>Receita forecast</span><strong>${money(f.revenue)}</strong></div><div><span>GOP forecast</span><strong>${money(f.gop)}</strong></div></div></section>`;}
  function operation(m){return `<div class="v30-two"><section class="v30-panel"><header><strong>Execução operacional</strong><button onclick="VG.actions.openBoard()">Todas as ações →</button></header><div class="v30-stat-list"><div><span>Ações abertas</span><strong>${m.actionInfo?.active?.length||0}</strong></div><div><span>Fora do prazo</span><strong>${m.actionInfo?.overdue?.length||0}</strong></div><div><span>Anomalias</span><strong>${m.anomalyInfo?.negative?.length||0}</strong></div><div><span>Avisos de dados</span><strong>${m.quality?.rows?.length||0}</strong></div></div></section><section class="v30-panel"><header><strong>Plano de recuperação</strong></header>${objectivesHtml(m)}</section></div>`;}
  function reputation(m){const r=m.reputation;return `<section class="v30-panel"><header><strong>Reputação</strong><button onclick="setView('reputacao')">Abrir Reputação →</button></header>${r?`<div class="v30-forecast-strip"><div><span>GRI</span><strong>${pct(r.gri)}</strong></div><div><span>Avaliações</span><strong>${fmt(r.reviews,0)}</strong></div><div><span>Resposta</span><strong>${pct(r.response)}</strong></div><div><span>Período</span><strong>${esc(r.week||'—')}</strong></div></div>`:'<div class="v30-empty">Sem dados de reputação disponíveis.</div>'}</section>`;}
  function links(m,kind){if(kind==='documents')return `<section class="v30-panel"><header><strong>Documentos do hotel</strong><button onclick="VG.documents.openFor({hotel:'${esc(m.hotel)}'})">Abrir Gestão de Documentos →</button></header><div class="v30-empty">A Gestão de Documentos permanece como repositório operacional. O Hotel 360º usa-a como drill-down.</div></section>`;return `<section class="v30-panel"><header><strong>Ações do hotel</strong><button onclick="VG.actions.openBoard()">Abrir Gestão de Ações →</button></header>${objectivesHtml(m)}</section>`;}
  function tabContent(m){if(state.tab==='finance')return financial(m);if(state.tab==='revenue')return revenue(m);if(state.tab==='efficiency')return window.VG?.unitEconomics?.hotel360Html?.(m.hotel)||'<div class="v30-empty">Eficiência ainda indisponível.</div>';if(state.tab==='operation')return operation(m);if(state.tab==='reputation')return reputation(m);if(state.tab==='actions')return links(m,'actions');if(state.tab==='documents')return links(m,'documents');return overview(m);}
  function selectHotel(h){if(h)state.hotel=String(h);render();}
  function selectTab(tab){const allowed=new Set(['overview','finance','revenue','efficiency','operation','reputation','actions','documents']);state.tab=allowed.has(tab)?tab:'overview';render();}
  function render(){
    const root=document.getElementById('hotel360Root');if(!root)return;const m=model();
    if(!m.available){root.innerHTML='<div class="v30-empty prominent">Carrega dados de P&amp;L para ativar o Hotel 360º.</div>';return;}
    const tabs=[['overview','Visão Executiva'],['finance','Financeiro'],['revenue','Revenue'],['efficiency','Eficiência'],['operation','Operação'],['reputation','Reputação'],['actions','Ações'],['documents','Documentos']];
    root.innerHTML=`<header class="v30-page-head"><div><div class="v30-eyebrow">VG Operations 2.0</div><h2>Hotel 360º</h2><p>Leitura integrada do hotel. A Comentários Fecho do Mês original mantém-se independente e inalterada.</p></div><div class="v30-head-controls"><label>Hotel<select id="v30Hotel360Hotel">${m.hotels.map(h=>`<option value="${esc(h)}" ${h===m.hotel?'selected':''}>${esc(h)}</option>`).join('')}</select></label><button onclick="setView('fichahotel')">📋 Comentários Fecho do Mês</button></div></header><nav class="v30-tabs">${tabs.map(([id,l])=>`<button data-v30-tab="${id}" class="${state.tab===id?'active':''}">${l}</button>`).join('')}</nav><div id="v30Hotel360Content">${tabContent(m)}</div><div class="v30-trace">Hotel 360º agrega informação existente; não altera a Comentários Fecho do Mês nem cria uma segunda fonte de P&amp;L.</div>`;
    root.querySelector('#v30Hotel360Hotel')?.addEventListener('change',e=>selectHotel(e.target.value));
    root.querySelectorAll('[data-v30-tab]').forEach(b=>b.addEventListener('click',()=>selectTab(b.dataset.v30Tab)));
    root.querySelectorAll('[data-recovery]').forEach(b=>b.addEventListener('click',()=>createRecovery(b.dataset.recovery)));
    root.querySelectorAll('[data-action-id]').forEach(b=>b.addEventListener('click',()=>window.VG?.actions?.openById?.(b.dataset.actionId)));
    root.querySelector('[data-v30-cmd="score-config"]')?.addEventListener('click',openScoreConfig);
    hydrate(m.hotel);
  }
  async function hydrate(h){
    // V30.2: hidratar dependências uma única vez. Na V30/V30.1 cada render
    // voltava a chamar hydrate() e, quando as Promises resolviam, agendava
    // novo render em ~10 ms. Esse ciclo substituía continuamente o select
    // e os botões de tabs, tornando-os praticamente impossíveis de usar.
    if(state.hydrated||state.hydrating)return;
    state.hydrating=true;
    try{
      await Promise.allSettled([
        window.VG?.actions?.ensureLoaded?.(false),
        window.VG?.approvals?.ensureLoaded?.(false),
        window.VG?.documents?.ensureLoaded?.(false),
        window.VG?.operationalScore?.ensureConfig?.(false)
      ]);
      state.hydrated=true;
      if(typeof currentView!=='undefined'&&currentView==='hotel360'&&state.hotel===h)setTimeout(render,10);
    }finally{state.hydrating=false;}
  }
  function openFor(h,tab){if(h)state.hotel=h;if(tab)state.tab=tab;window.setView?.('hotel360');setTimeout(render,20);}
  function openScoreConfig(){if(!isDirection())return;const c=window.VG?.operationalScore?.getConfig?.();const labels=window.VG?.operationalScore?.LABELS||{};const wrap=document.createElement('div');wrap.className='v30-score-modal';wrap.innerHTML=`<div class="v30-score-dialog"><header><div><strong>Configurar Score Operacional</strong><small>Os pesos são normalizados para 100% e partilhados com toda a Direção.</small></div><button data-close>✕</button></header><div class="v30-score-form">${Object.entries(c?.weights||{}).map(([k,v])=>`<label>${esc(labels[k]||k)}<input type="number" min="0" max="100" step="1" data-weight="${esc(k)}" value="${fmt(v,0)}"></label>`).join('')}</div><footer><button data-close>Cancelar</button><button class="primary" data-save>Guardar pesos</button></footer></div>`;document.body.appendChild(wrap);wrap.querySelectorAll('[data-close]').forEach(x=>x.onclick=()=>wrap.remove());wrap.querySelector('[data-save]').onclick=async()=>{const w={};wrap.querySelectorAll('[data-weight]').forEach(i=>w[i.dataset.weight]=Number(i.value));try{await window.VG.operationalScore.saveWeights(w);wrap.remove();render();window.showToast?.('Pesos do Score atualizados.');}catch(e){window.showToast?.(e.message||String(e),true);}};}

  window.VG.hotel360={version:30.3,state,model,causeAnalysis,costConvention,expenseAmount,expenseImpact,objectives,recoveryActions,render,openFor,createRecovery,hydrate,selectHotel,selectTab};
  window.hotel360Render=render;
  window.VG.events?.on?.('state:changed',()=>{if(typeof currentView!=='undefined'&&currentView==='hotel360')setTimeout(render,30);});
  window.VG.events?.on?.('actions:changed',()=>{if(typeof currentView!=='undefined'&&currentView==='hotel360')setTimeout(render,30);});
  window.VG.events?.on?.('score-config:changed',()=>{if(typeof currentView!=='undefined'&&currentView==='hotel360')render();});
})();
