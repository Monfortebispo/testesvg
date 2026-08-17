// ==========================================================
// VG DASHBOARD v23 — PERFORMANCE DOS HOTÉIS
// Página executiva por unidade. Reutiliza KPIs, Benchmarking,
// Forecast, alertas, anomalias, ações e qualidade de dados.
// Não cria um score global — essa matéria fica reservada à v28.
// ==========================================================
(function(){
  'use strict';
  if(window.__VG_HOTEL_PERFORMANCE_V23__) return;
  window.__VG_HOTEL_PERFORMANCE_V23__=true;

  const state={hotel:'',loadingActions:false};
  const n=v=>{const x=Number(v);return Number.isFinite(x)?x:null;};
  const esc=v=>window.VG?.util?.escapeHtml?window.VG.util.escapeHtml(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const fmt=(v,d=1)=>n(v)==null?'—':Number(v).toLocaleString('pt-PT',{minimumFractionDigits:d,maximumFractionDigits:d});
  const eur=(v,d=0)=>n(v)==null?'—':(window.VG?.market?.formatMoney?window.VG.market.formatMoney(v,d,true):'€ '+Number(v).toLocaleString('pt-PT',{minimumFractionDigits:d,maximumFractionDigits:d}));
  const money=v=>window.VG?.market?.formatMoneyCompact?window.VG.market.formatMoneyCompact(v,2):(()=>{const x=n(v);if(x==null)return '—';const a=Math.abs(x),s=x<0?'-':'';if(a>=1000000)return `${s}€${fmt(a/1000000,a>=10000000?1:2)}M`;if(a>=1000)return `${s}€${fmt(a/1000,0)}K`;return `${s}€${fmt(a,0)}`;})();
  const pct=(v,d=1)=>n(v)==null?'—':`${fmt(v,d)}%`;
  const signPct=(v,d=1,suffix='%')=>n(v)==null?'—':`${v>=0?'+':''}${fmt(v,d)}${suffix}`;
  const shortHotel=h=>String(h||'').replace(/^COLLECTION\s+/,'C. ');
  const norm=v=>String(v||'').trim().toUpperCase();

  function currentUser(){try{return typeof window.vgAuthCurrent==='function'?window.vgAuthCurrent():null;}catch(e){return null;}}
  function allHotels(){
    let list=[];try{list=(RAW?.hotel_list||Object.keys(RAW?.hotels_ops||{})).filter(Boolean);}catch(e){}
    const u=currentUser();
    if(u&&!['direcao','admin'].includes(u.role)){if(typeof window.vgAuthCanAccessHotel==='function')list=list.filter(h=>window.vgAuthCanAccessHotel(h));else{const hs=Array.isArray(u.hotels)?u.hotels:(u.hotel?[u.hotel]:[]);list=list.filter(h=>hs.some(x=>norm(x)===norm(h)));}}
    return [...new Set(list)].sort((a,b)=>String(a).localeCompare(String(b),'pt'));
  }
  function activeMonths(){try{return window.VG?.state?.selectedMonths?.()||[];}catch(e){return [];}}
  function activeMonth(){const ms=activeMonths();if(ms.length)return Number(ms[ms.length-1]);try{const a=Object.keys(STORE||{}).map(Number).filter(m=>m>=1&&m<=12).sort((a,b)=>a-b);return a[a.length-1]||null;}catch(e){return null;}}
  function periodLabel(){const ms=activeMonths();const y=String(typeof YR_CUR!=='undefined'?YR_CUR:window.VG?.state?.currentYear?.()||'');if(!ms.length)return `Período carregado · ${y}`;const names=ms.map(m=>window.VG?.util?.monthName?.(m)||m);if(ms.length===1)return `${names[0]} ${y}`;if(ms.every((m,i)=>i===0||m===ms[i-1]+1))return `${names[0]}–${names[names.length-1]} ${y}`;return `${ms.length} meses selecionados · ${y}`;}
  function year(){return String(typeof YR_CUR!=='undefined'?YR_CUR:window.VG?.state?.currentYear?.()||new Date().getFullYear());}
  function prevYear(){return String(typeof YR_PREV!=='undefined'?YR_PREV:Number(year())-1);}
  function op(h,field,y=year()){try{return n(RAW?.hotels_ops?.[h]?.[field]?.[String(y)]);}catch(e){return null;}}
  function cost(h,field,y=year()){try{return n(RAW?.hotels_costs?.[h]?.[field]?.[String(y)]);}catch(e){return null;}}
  function growth(prev,cur){const p=n(prev),c=n(cur);return p!=null&&p!==0&&c!=null?(c-p)/Math.abs(p)*100:null;}
  function gop(h,y=year()){try{return n(window.VG?.kpi?.gop?.(h,String(y),RAW));}catch(e){return op(h,'GOP COM SEDE',y);}}
  function totalCosts(h,y=year()){try{return n(window.VG?.kpi?.totalCosts?.(h,String(y),RAW));}catch(e){return cost(h,'TOTAIS',y);}}
  function metric(h,id,y=year()){
    try{const bm=window.VG?.benchmark;if(bm?.metricHotel)return n(bm.metricHotel(h,id,String(y)));}catch(e){}
    const rec=op(h,'Receita Total',y),occRooms=op(h,'Ocupados',y),avail=op(h,'Disponiveis',y),aloj=op(h,'Receita Alojamento',y);
    if(id==='revenueGrowth')return growth(op(h,'Receita Total',prevYear()),op(h,'Receita Total',year()));
    if(id==='gopMargin'){const g=gop(h,y);return rec>0&&g!=null?g/rec*100:null;}
    if(id==='occupancy')return avail>0&&occRooms!=null?occRooms/avail*100:null;
    if(id==='adr')return occRooms>0&&aloj!=null?aloj/occRooms:null;
    if(id==='revpar')return avail>0&&aloj!=null?aloj/avail:null;
    if(id==='costRatio'){const c=totalCosts(h,y);return rec>0&&c!=null?c/rec*100:null;}
    if(id==='personnelRatio'){const c=cost(h,'PESSOAL',y);return rec>0&&c!=null?c/rec*100:null;}
    return null;
  }
  function target(h,id){try{return window.VG?.benchmark?.targetFor?.(h,id)||null;}catch(e){return null;}}
  function benchmark(h){
    try{
      const bm=window.VG?.benchmark;if(!bm?.summary)return null;const s=bm.summary(h),league=bm.leagueRows?.(h)||[],ix=league.findIndex(x=>x.hotel===h);
      return {...s,rank:ix>=0?ix+1:null,rankTotal:league.length};
    }catch(e){return null;}
  }
  function forecast(h){
    const m=activeMonth();if(!m)return {available:false,month:null};
    try{
      const b=window.VG?.forecast?.buildBase?.(h,m);
      if(b?.available){const s=b.baseScenario||{};return {available:true,month:m,monthLabel:window.VG?.util?.monthName?.(m)||m,occNow:n(b.occNow),forecast:n(b.forecastOcc),target:n(b.target),gap:b.target==null?null:n(b.forecastOcc)-n(b.target),trend:n(b.trend),revenue:n(s.revenue),gop:n(s.gop),gopPct:n(s.gopPct),adr:n(s.adr),revpar:n(s.revpar),confidence:b.confidence||null,revenueAtRisk:n(window.VG?.revenue?.getHotelMonthForecast?.(h,m)?.revenueAtRisk)};}
    }catch(e){}
    try{const r=window.VG?.revenue?.getHotelMonthForecast?.(h,m);if(r?.available)return {available:true,month:m,monthLabel:r.monthLabel||window.VG?.util?.monthName?.(m)||m,occNow:n(r.occNow),forecast:n(r.forecast),target:n(r.target),gap:r.target==null?null:n(r.forecast)-n(r.target),trend:n(r.trend),revenueAtRisk:n(r.revenueAtRisk),confidence:null};}catch(e){}
    return {available:false,month:m,monthLabel:window.VG?.util?.monthName?.(m)||m};
  }
  function alerts(h){
    const rows=[];try{if(typeof ALERT_RULES!=='undefined')for(const r of ALERT_RULES){let active=false;try{active=!!r.check(h);}catch(e){}if(active)rows.push({id:r.id,severity:r.severity||'orange',label:typeof alertRuleLabel==='function'?alertRuleLabel(r,h):(r.label||r.id)});}}catch(e){}
    return rows;
  }
  function dataQuality(h){
    try{const all=typeof validateDashboardData==='function'?(validateDashboardData(RAW)||[]):[];const rows=all.filter(x=>x.hotel===h||x.hotel==='Portefólio');return {rows,critical:rows.filter(x=>x.severity==='red').length,attention:rows.filter(x=>x.severity!=='red').length};}catch(e){return {rows:[],critical:0,attention:0};}
  }
  function anomalies(h){
    try{const m=window.VG?.anomalies?.build?.({hotels:[h]});const rows=(m?.rows||[]).filter(x=>x.hotel===h);return {rows,negative:rows.filter(x=>x.severity!=='positive'),positive:rows.filter(x=>x.severity==='positive')};}catch(e){return {rows:[],negative:[],positive:[]};}
  }
  function actions(h){
    try{const rows=(window.VG?.actions?.all?.()||[]).filter(a=>norm(a.hotel)===norm(h));const active=rows.filter(a=>a.status!=='resolved');return {rows,active,overdue:active.filter(a=>window.VG?.actions?.isOverdue?.(a)),progress:active.filter(a=>a.status==='progress')};}catch(e){return {rows:[],active:[],overdue:[],progress:[]};}
  }
  function reputation(h){
    try{
      if(typeof REP_STORE==='undefined')return null;const canonical=typeof rtCanon==='function'?rtCanon(h):norm(h);let key=null;
      for(const k of Object.keys(REP_STORE||{})){const nm=REP_STORE[k]?.[0]?.hotel||k;if((typeof rtCanon==='function'?rtCanon(nm):norm(nm))===canonical){key=k;break;}}
      const arr=key?(REP_STORE[key]||[]):[];if(!arr.length)return null;const rows=[...arr];if(typeof rtCmpWeek==='function')rows.sort((a,b)=>rtCmpWeek(a.week,b.week));const r=rows[rows.length-1];return {gri:n(r.gri),reviews:n(r.reviews),response:n(r.mgmtResp),week:r.week||'',source:r.source||''};
    }catch(e){return null;}
  }
  function status(model){
    const reasons=[];let level='good';
    const raise=(next,reason)=>{const rank={good:0,attention:1,critical:2};if(rank[next]>rank[level])level=next;if(reason)reasons.push(reason);};
    if(model.quality.critical)raise('critical',`${model.quality.critical} incoerência(s) crítica(s) de dados`);
    const red=model.alerts.filter(x=>x.severity==='red');if(red.length)raise('critical',red[0].label);
    if(model.actionInfo.overdue.length)raise('critical',`${model.actionInfo.overdue.length} ação(ões) fora do prazo`);
    if(model.anomalyInfo.negative.some(x=>x.severity==='red'))raise('critical',model.anomalyInfo.negative.find(x=>x.severity==='red')?.title||'Anomalia crítica');
    if(model.forecast.available&&n(model.forecast.gap)!=null&&model.forecast.gap<-10)raise('critical',`Forecast ${fmt(Math.abs(model.forecast.gap),1)} p.p. abaixo da meta`);
    if(level!=='critical'){
      if(model.alerts.length)raise('attention',model.alerts[0].label);
      if(model.actionInfo.active.length)raise('attention',`${model.actionInfo.active.length} ação(ões) aberta(s)`);
      if(model.anomalyInfo.negative.length)raise('attention',model.anomalyInfo.negative[0].title||'Anomalia a validar');
      if(model.forecast.available&&n(model.forecast.gap)!=null&&model.forecast.gap<0)raise('attention',`Forecast ${fmt(Math.abs(model.forecast.gap),1)} p.p. abaixo da meta`);
      if(model.quality.attention)raise('attention',`${model.quality.attention} aviso(s) de qualidade de dados`);
    }
    const meta={critical:{label:'Crítico',cls:'critical',text:'Exige decisão / validação prioritária'},attention:{label:'Atenção',cls:'attention',text:'Existem desvios ou tarefas a acompanhar'},good:{label:'Estável',cls:'good',text:'Sem sinais materiais nos critérios atuais'}}[level];
    return {...meta,level,reasons:[...new Set(reasons)].slice(0,4)};
  }
  function risks(model){
    const rows=[];
    for(const x of model.alerts)rows.push({severity:x.severity==='red'?'critical':'attention',title:x.label,detail:'Regra operacional ativa',open:'alertas'});
    for(const x of model.anomalyInfo.negative.slice(0,4))rows.push({severity:x.severity==='red'?'critical':'attention',title:x.title||'Anomalia',detail:x.detail||x.source||'',open:x.type==='price'?'compras':'anomalies'});
    if(model.forecast.available&&n(model.forecast.gap)!=null&&model.forecast.gap<0)rows.push({severity:model.forecast.gap<-10?'critical':'attention',title:`Forecast abaixo da meta`,detail:`${pct(model.forecast.forecast)} vs ${pct(model.forecast.target)} · ${signPct(model.forecast.gap,1,' p.p.')}${model.forecast.revenueAtRisk>0?' · '+money(model.forecast.revenueAtRisk)+' em risco':''}`,open:'forecast'});
    if(model.actionInfo.overdue.length)rows.push({severity:'critical',title:`${model.actionInfo.overdue.length} ação(ões) fora do prazo`,detail:model.actionInfo.overdue.slice(0,2).map(a=>a.sourceTitle||a.title||'Ação').join(' · '),open:'actions'});
    for(const q of model.quality.rows.slice(0,3))rows.push({severity:q.severity==='red'?'critical':'attention',title:'Qualidade de dados',detail:q.message,open:'datacenter'});
    return rows.sort((a,b)=>(a.severity==='critical'?0:1)-(b.severity==='critical'?0:1)).slice(0,7);
  }
  function opportunities(model){
    const rows=[];
    const b=model.benchmarkInfo;
    if(b?.strongest&&n(b.strongest.advRegion)>0)rows.push({title:`Vantagem em ${b.strongest.label}`,detail:`Melhor posição relativa face à região. Proteger a prática que sustenta este resultado.`,value:signPct(b.strongest.advRegion,1,b.strongest.unit==='€'?'%':'')});
    for(const x of model.anomalyInfo.positive.slice(0,3))rows.push({title:x.title||'Desvio favorável',detail:x.detail||x.source||'',value:x.amount?money(x.amount):''});
    try{const ri=window.VG?.revenue?.getDecisionSnapshot?.([model.hotel]);for(const x of ri?.opportunities||[])if(x.hotel===model.hotel)rows.push({title:x.title||'Oportunidade Revenue',detail:x.sub||'',value:x.value||''});}catch(e){}
    if(!rows.length&&b?.regionalPercentile>=70)rows.push({title:'Posição regional favorável',detail:`Percentil regional ${fmt(b.regionalPercentile,0)}. Identificar práticas replicáveis sem perder disciplina de margem.`,value:`P${fmt(b.regionalPercentile,0)}`});
    return rows.slice(0,5);
  }
  function kpis(h,b){
    const y=year(),py=prevYear();const rev=op(h,'Receita Total',y),rev0=op(h,'Receita Total',py),gv=gop(h,y),g0=gop(h,py);
    const defs=[
      {id:'revenue',label:'Receita',value:rev,display:money(rev),delta:growth(rev0,rev),deltaDisplay:signPct(growth(rev0,rev),1),target:target(h,'revenueGrowth'),targetMode:'growth'},
      {id:'gop',label:'GOP com sede',value:gv,display:money(gv),delta:growth(g0,gv),deltaDisplay:signPct(growth(g0,gv),1),target:null},
      {id:'gopMargin',label:'Margem GOP',value:metric(h,'gopMargin'),display:pct(metric(h,'gopMargin')),delta:(metric(h,'gopMargin')!=null&&metric(h,'gopMargin',py)!=null)?metric(h,'gopMargin')-metric(h,'gopMargin',py):null,deltaDisplay:signPct((metric(h,'gopMargin')!=null&&metric(h,'gopMargin',py)!=null)?metric(h,'gopMargin')-metric(h,'gopMargin',py):null,1,' p.p.'),target:target(h,'gopMargin')},
      {id:'occupancy',label:'Ocupação',value:metric(h,'occupancy'),display:pct(metric(h,'occupancy')),delta:(metric(h,'occupancy')!=null&&metric(h,'occupancy',py)!=null)?metric(h,'occupancy')-metric(h,'occupancy',py):null,deltaDisplay:signPct((metric(h,'occupancy')!=null&&metric(h,'occupancy',py)!=null)?metric(h,'occupancy')-metric(h,'occupancy',py):null,1,' p.p.'),target:target(h,'occupancy')},
      {id:'adr',label:'ADR',value:metric(h,'adr'),display:eur(metric(h,'adr'),2),delta:growth(metric(h,'adr',py),metric(h,'adr')),deltaDisplay:signPct(growth(metric(h,'adr',py),metric(h,'adr')),1),target:target(h,'adr')},
      {id:'revpar',label:'RevPAR',value:metric(h,'revpar'),display:eur(metric(h,'revpar'),2),delta:growth(metric(h,'revpar',py),metric(h,'revpar')),deltaDisplay:signPct(growth(metric(h,'revpar',py),metric(h,'revpar')),1),target:target(h,'revpar')},
      {id:'costRatio',label:'Custos / Receita',value:metric(h,'costRatio'),display:pct(metric(h,'costRatio')),delta:(metric(h,'costRatio')!=null&&metric(h,'costRatio',py)!=null)?metric(h,'costRatio')-metric(h,'costRatio',py):null,deltaDisplay:signPct((metric(h,'costRatio')!=null&&metric(h,'costRatio',py)!=null)?metric(h,'costRatio')-metric(h,'costRatio',py):null,1,' p.p.'),target:target(h,'costRatio'),lower:true},
      {id:'personnelRatio',label:'Pessoal / Receita',value:metric(h,'personnelRatio'),display:pct(metric(h,'personnelRatio')),delta:(metric(h,'personnelRatio')!=null&&metric(h,'personnelRatio',py)!=null)?metric(h,'personnelRatio')-metric(h,'personnelRatio',py):null,deltaDisplay:signPct((metric(h,'personnelRatio')!=null&&metric(h,'personnelRatio',py)!=null)?metric(h,'personnelRatio')-metric(h,'personnelRatio',py):null,1,' p.p.'),target:target(h,'personnelRatio'),lower:true}
    ];
    const brow=new Map((b?.rows||[]).map(r=>[r.id,r]));
    for(const k of defs){const r=brow.get(k.id);k.region=r?.region??null;k.portfolio=r?.portfolio??null;k.winRegion=r?.winR??null;k.winTarget=r?.winT??null;if(k.id==='revenue')k.region=r?.region??null;}
    return defs;
  }
  function buildModel(hotel){
    const hs=allHotels();let h=hotel||state.hotel;const u=currentUser();if(u&&!['direcao','admin'].includes(u.role)){const ok=typeof window.vgAuthCanAccessHotel==='function'?window.vgAuthCanAccessHotel(h):(Array.isArray(u.hotels)?u.hotels:(u.hotel?[u.hotel]:[])).some(x=>norm(x)===norm(h));if(!ok)h=hs[0]||'';}if(!h||!hs.includes(h))h=hs[0]||'';state.hotel=h;
    if(!h)return {available:false,hotel:'',hotels:hs};
    const benchmarkInfo=benchmark(h),forecastInfo=forecast(h),alertInfo=alerts(h),quality=dataQuality(h),anomalyInfo=anomalies(h),actionInfo=actions(h),rep=reputation(h);
    const model={available:true,hotel:h,hotels:hs,period:periodLabel(),year:year(),prevYear:prevYear(),benchmarkInfo,forecast:forecastInfo,alerts:alertInfo,quality,anomalyInfo,actionInfo,reputation:rep};
    model.kpis=kpis(h,benchmarkInfo);model.status=status(model);model.risks=risks(model);model.opportunities=opportunities(model);
    return model;
  }

  function targetText(k){if(!k.target||n(k.target.value)==null)return 'Sem meta explícita';const value=k.id==='revenue'?signPct(k.target.value,1):k.id==='adr'||k.id==='revpar'?eur(k.target.value,2):pct(k.target.value);return `${value} · ${k.target.source||'Meta'}`;}
  function regionText(k){if(n(k.region)==null)return 'Região —';if(k.id==='adr'||k.id==='revpar')return `Região ${eur(k.region,2)}`;return `Região ${pct(k.region)}`;}
  function kpiCard(k){const d=n(k.delta);const good=d==null?'neutral':(k.lower?d<=0:d>=0)?'good':'bad';const targetCls=k.winTarget==null?'neutral':k.winTarget?'good':'bad';return `<article class="hp-kpi"><div class="hp-kpi-top"><span>${esc(k.label)}</span><em class="hp-dot ${targetCls}"></em></div><strong>${esc(k.display)}</strong><div class="hp-kpi-foot"><span class="${good}">${esc(k.deltaDisplay)} vs ${esc(prevYear())}</span><span>${esc(regionText(k))}</span></div><small>${esc(targetText(k))}</small></article>`;}
  function riskHtml(r){return `<button class="hp-signal ${r.severity}" type="button" onclick="hotelPerformanceOpenSignal('${esc(r.open||'')}')"><span class="hp-signal-mark"></span><span><strong>${esc(r.title)}</strong><small>${esc(r.detail||'')}</small></span><em>${r.severity==='critical'?'CRÍTICO':'ATENÇÃO'}</em></button>`;}
  function oppHtml(o){return `<div class="hp-opportunity"><span>↗</span><div><strong>${esc(o.title)}</strong><small>${esc(o.detail||'')}</small></div>${o.value?`<em>${esc(o.value)}</em>`:''}</div>`;}
  function actionHtml(a){const sm=window.VG?.actions?.statusMeta?.(a.status)||{label:a.status||'Em análise',cls:'open'};const over=window.VG?.actions?.isOverdue?.(a);return `<button class="hp-action ${over?'overdue':''}" type="button" onclick="VG.actions.openById('${esc(a.id)}')"><span><strong>${esc(a.sourceTitle||a.title||'Ação')}</strong><small>${esc(a.ownerName||'Sem responsável')} · ${a.dueDate?new Date(a.dueDate+'T12:00:00').toLocaleDateString('pt-PT'):'Sem prazo'}</small></span><em class="${esc(sm.cls)}">${esc(over?'FORA DO PRAZO':sm.label)}</em></button>`;}
  function forecastHtml(f){if(!f.available)return `<div class="hp-empty">Sem snapshots / dados suficientes para projetar ${esc(f.monthLabel||'o mês ativo')}.</div>`;const gap=n(f.gap);return `<div class="hp-forecast-grid"><div><span>OCC atual</span><strong>${pct(f.occNow)}</strong></div><div><span>Forecast</span><strong>${pct(f.forecast)}</strong><small class="${gap==null?'':gap>=0?'good':'bad'}">${gap==null?'Sem meta':signPct(gap,1,' p.p. vs meta')}</small></div><div><span>Meta</span><strong>${pct(f.target)}</strong></div><div><span>Receita forecast</span><strong>${money(f.revenue)}</strong></div><div><span>GOP forecast</span><strong>${money(f.gop)}</strong><small>${pct(f.gopPct)} margem</small></div><div><span>Confiança</span><strong>${f.confidence?`${f.confidence.score}/100`:'—'}</strong><small>${esc(f.confidence?.label||'RI sem score financeiro')}</small></div></div>`;}
  function benchmarkHtml(b){if(!b)return `<div class="hp-empty">Benchmarking indisponível para esta unidade.</div>`;return `<div class="hp-benchmark"><div><span>Percentil regional</span><strong>${fmt(b.regionalPercentile,0)}</strong><small>${esc(b.regionName||'Região')}</small></div><div><span>Ranking regional</span><strong>${b.rank?`${b.rank}/${b.rankTotal}`:'—'}</strong><small>posição relativa</small></div><div><span>KPIs acima da região</span><strong>${b.winsRegion}/${b.totalRegion}</strong><small>comparações disponíveis</small></div><div><span>Metas cumpridas</span><strong>${b.totalTargets?`${b.targetsMet}/${b.totalTargets}`:'—'}</strong><small>metas/regras/orçamento</small></div></div>`;}
  function reputationHtml(r){if(!r)return `<div class="hp-empty compact">Sem dados de reputação associados a esta unidade.</div>`;return `<div class="hp-reputation"><div><span>GRI</span><strong>${pct(r.gri)}</strong></div><div><span>Avaliações</span><strong>${fmt(r.reviews,0)}</strong></div><div><span>Taxa de resposta</span><strong>${pct(r.response)}</strong></div><small>${esc(r.week||'Último período disponível')}</small></div>`;}

  function render(){
    const root=document.getElementById('hotelPerformanceRoot');if(!root)return;const model=buildModel();window.VG.hotelPerformance.lastModel=model;
    if(!model.available){root.innerHTML='<div class="hp-empty prominent">Carrega dados de P&amp;L para ativar a Performance dos Hotéis.</div>';return;}
    const s=model.status,b=model.benchmarkInfo,f=model.forecast,a=model.actionInfo;
    const mainRisk=model.risks[0],mainOpp=model.opportunities[0];
    root.innerHTML=`
      <header class="hp-head"><div><div class="hp-eyebrow">Performance dos Hotéis · V23</div><h2>Como está este hotel?</h2><p>Leitura executiva única, construída com os KPIs e sinais já existentes na dashboard.</p></div><div class="hp-controls"><label>Hotel<select id="hotelPerformanceHotel" onchange="hotelPerformanceSelectHotel(this.value)">${model.hotels.map(h=>`<option value="${esc(h)}" ${h===model.hotel?'selected':''}>${esc(h)}</option>`).join('')}</select></label><div class="hp-period"><span>Período</span><strong>${esc(model.period)}</strong></div><button type="button" onclick="hotelPerformanceRender()">Atualizar</button></div></header>
      <section class="hp-hero ${s.cls}"><div class="hp-status"><span>Situação</span><strong>${esc(s.label)}</strong><small>${esc(s.text)}</small></div><div class="hp-hero-main"><h3>${esc(shortHotel(model.hotel))}</h3><p>${esc(s.reasons[0]||'Sem sinais materiais nos critérios atuais.')}</p><div class="hp-hero-tags"><span>${b?esc(b.regionName):'Sem região'}</span><span>${a.active.length} ações abertas</span><span>${model.anomalyInfo.negative.length} anomalias</span><span>${model.quality.rows.length} avisos de dados</span></div></div><div class="hp-hero-decision"><span>Onde atuar primeiro</span><strong>${esc(mainRisk?.title||'Manter acompanhamento')}</strong><small>${esc(mainRisk?.detail||'Sem prioridade crítica identificada.')}</small></div><div class="hp-hero-opportunity"><span>Maior oportunidade</span><strong>${esc(mainOpp?.title||'Sem oportunidade material')}</strong><small>${esc(mainOpp?.detail||'Continuar a acompanhar o desempenho relativo.')}</small></div></section>
      <section class="hp-kpis">${model.kpis.map(kpiCard).join('')}</section>
      <div class="hp-layout"><section class="hp-panel hp-wide"><div class="hp-panel-head"><div><strong>Forecast de fecho</strong><span>${esc(f.monthLabel||'Mês ativo')} · ligação ao Revenue Intelligence</span></div><button onclick="setView('forecast')">Abrir Forecast →</button></div>${forecastHtml(f)}</section><section class="hp-panel"><div class="hp-panel-head"><div><strong>Posição relativa</strong><span>Benchmark ponderado</span></div><button onclick="setView('benchmark')">Benchmark →</button></div>${benchmarkHtml(b)}</section></div>
      <div class="hp-layout"><section class="hp-panel"><div class="hp-panel-head"><div><strong>Riscos e sinais</strong><span>${model.risks.length} prioridade(s) consolidadas</span></div><button onclick="setView('alertas')">Todos os alertas →</button></div><div class="hp-signals">${model.risks.length?model.risks.map(riskHtml).join(''):'<div class="hp-good">✓ Sem riscos materiais identificados pelos critérios atuais.</div>'}</div></section><section class="hp-panel"><div class="hp-panel-head"><div><strong>Oportunidades</strong><span>Revenue, anomalias positivas e benchmark</span></div><button onclick="setView('anomalies')">Ver análise →</button></div><div class="hp-opportunities">${model.opportunities.length?model.opportunities.map(oppHtml).join(''):'<div class="hp-empty compact">Sem oportunidades materiais detetadas.</div>'}</div></section></div>
      <div class="hp-layout"><section class="hp-panel"><div class="hp-panel-head"><div><strong>Ações em aberto</strong><span>${a.overdue.length} fora do prazo · ${a.progress.length} em curso</span></div><button onclick="VG.actions.openBoard()">Gestão de Ações →</button></div><div class="hp-actions">${a.active.length?a.active.slice().sort((x,y)=>{const xo=window.VG?.actions?.isOverdue?.(x)?0:1,yo=window.VG?.actions?.isOverdue?.(y)?0:1;return xo-yo||String(x.dueDate||'9999').localeCompare(String(y.dueDate||'9999'));}).slice(0,6).map(actionHtml).join(''):'<div class="hp-good">✓ Sem ações abertas para esta unidade.</div>'}</div></section><section class="hp-panel"><div class="hp-panel-head"><div><strong>Reputação &amp; dados</strong><span>Último estado disponível</span></div><button onclick="setView('reputacao')">Reputação →</button></div>${reputationHtml(model.reputation)}<div class="hp-quality ${model.quality.critical?'critical':model.quality.attention?'attention':'good'}"><strong>${model.quality.critical?'Dados críticos a validar':model.quality.attention?'Dados com avisos':'Qualidade estrutural OK'}</strong><span>${model.quality.critical} crítico(s) · ${model.quality.attention} a validar</span><button onclick="setView('datacenter')">Centro de Dados →</button></div></section></div>
      <section class="hp-panel hp-trace"><div class="hp-panel-head"><div><strong>Rastreabilidade da leitura</strong><span>A V23 não cria fórmulas paralelas nem um score global.</span></div></div><div class="hp-trace-grid"><span>KPIs financeiros: <b>VG.kpi / P&amp;L</b></span><span>Metas: <b>V9 Metas &amp; Regras</b></span><span>Forecast: <b>Revenue Intelligence / V12</b></span><span>Posição relativa: <b>Benchmarking V11</b></span><span>Riscos: <b>Alertas + V13 Anomalias</b></span><span>Acompanhamento: <b>V8 Ações + V10 Dados</b></span></div></section>`;
  }

  async function selectHotel(h){state.hotel=String(h||'');try{if(window.VG?.actions?.ensureLoaded&&!state.loadingActions){state.loadingActions=true;await window.VG.actions.ensureLoaded(false);}}catch(e){}finally{state.loadingActions=false;}render();}
  function openSignal(view){if(view==='actions'){window.VG?.actions?.openBoard?.();return;}if(view&&typeof window.setView==='function')window.setView(view);}
  function openHotel(h){state.hotel=String(h||'');if(typeof window.setView==='function')window.setView('hotelperformance');setTimeout(render,20);}

  window.VG=window.VG||{};
  window.VG.hotelPerformance={version:23,state,allHotels,metric,forecast,benchmark,alerts,dataQuality,anomalies,actions,reputation,status,buildModel,render,openHotel,lastModel:null};
  window.hotelPerformanceRender=render;
  window.hotelPerformanceSelectHotel=selectHotel;
  window.hotelPerformanceOpenSignal=openSignal;
  window.hotelPerformanceOpenHotel=openHotel;
  window.VG.events?.on?.('state:changed',()=>{if(typeof currentView!=='undefined'&&currentView==='hotelperformance')window.VG?.performance?.schedule?.('hotel-performance-render',render,25);});
  window.VG.events?.on?.('actions:changed',()=>{if(typeof currentView!=='undefined'&&currentView==='hotelperformance')window.VG?.performance?.schedule?.('hotel-performance-actions',render,25);});
  window.VG.events?.on?.('targets-rules:changed',()=>{if(typeof currentView!=='undefined'&&currentView==='hotelperformance')render();});
})();
