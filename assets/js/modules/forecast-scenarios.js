// ==========================================================
// FORECAST & CENÁRIOS — V12
// Projeção de fecho + simulador financeiro orientado a premissas.
// A ocupação base é fornecida pelo Revenue Intelligence quando disponível.
// ==========================================================
(function(){
  'use strict';
  if(window.__VG_FORECAST_SCENARIOS_V12__) return;
  window.__VG_FORECAST_SCENARIOS_V12__=true;

  const MONTHS=['','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const DEFAULT_ADJ={occDelta:0,adrPct:0,otherRevenuePct:0,personnelPct:0,otherCostPct:0};
  const PRESETS={
    base:{...DEFAULT_ADJ},
    conservative:{occDelta:-3,adrPct:-3,otherRevenuePct:-3,personnelPct:2,otherCostPct:2},
    upside:{occDelta:3,adrPct:3,otherRevenuePct:2,personnelPct:0,otherCostPct:0},
    efficiency:{occDelta:0,adrPct:2,otherRevenuePct:1,personnelPct:-2,otherCostPct:-2}
  };
  let selectedHotel='';
  let selectedMonth=new Date().getMonth()+1;
  let adjustments={...DEFAULT_ADJ};

  function n(v){const x=Number(v);return Number.isFinite(x)?x:0;}
  function finite(v){if(v==null||v==='')return null;const x=Number(v);return Number.isFinite(x)?x:null;}
  function clamp(v,a,b){return Math.max(a,Math.min(b,Number(v)||0));}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function fmt(v,d=1){return v==null||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString('pt-PT',{minimumFractionDigits:d,maximumFractionDigits:d});}
  function eur(v,d=0){return v==null?'—':(window.VG?.market?.formatMoney?window.VG.market.formatMoney(v,d,false):`€${fmt(v,d)}`);}
  function pct(v,d=1){return v==null?'—':`${fmt(v,d)}%`;}
  function sign(v,d=1,suffix=''){if(v==null)return '—';const x=Number(v);return `${x>=0?'+':''}${fmt(x,d)}${suffix}`;}
  function daysInMonth(m){return new Date(Number(YR_CUR),Number(m),0).getDate();}
  function dataMonth(m){try{return STORE?.[Number(m)]||null;}catch(e){return null;}}
  function field(data,h,name,y){return finite(data?.hotels_ops?.[h]?.[name]?.[String(y)] ?? data?.hotels_ops?.[h]?.[name]?.[y]);}
  function costField(data,h,name,y){return finite(data?.hotels_costs?.[h]?.[name]?.[String(y)] ?? data?.hotels_costs?.[h]?.[name]?.[y]);}
  function allHotels(){
    const out=new Set();
    try{(RAW?.hotel_list||[]).forEach(h=>out.add(h));}catch(e){}
    try{Object.keys((window.VG?.revenue?.getForecastRows?.()||[]).reduce((o,r)=>(o[r.hotel]=1,o),{})).forEach(h=>out.add(h));}catch(e){}
    return [...out].filter(Boolean).sort((a,b)=>String(a).localeCompare(String(b),'pt'));
  }
  function activeHotels(){
    try{const a=typeof getActiveHotels==='function'?getActiveHotels():[];if(a?.length)return a;}catch(e){}
    return allHotels();
  }
  function kpi(name,h,y,data){try{return finite(window.VG?.kpi?.[name]?.(h,String(y),data));}catch(e){return null;}}
  function target(h,metric,m){try{return finite(window.VG?.targetsRules?.getTarget?.(h,metric,Number(m),String(YR_CUR)));}catch(e){return null;}}
  function ruleValue(id){try{return finite(window.VG?.targetsRules?.ruleValue?.(id));}catch(e){return null;}}
  function forecastInfo(h,m){
    try{
      const r=window.VG?.revenue?.getHotelMonthForecast?.(h,Number(m));
      if(r&&r.available)return r;
    }catch(e){}
    const d=dataMonth(m);
    const occCur=kpi('occupancy',h,YR_CUR,d);
    if(occCur!=null){
      return {available:true,hotel:h,month:Number(m),occNow:occCur,forecast:occCur,target:target(h,'occupancy',m),trend:0,snapshots:0,source:'P&L',latestLabel:null,latestAt:null,weeksLeft:0,isActualFallback:true};
    }
    return {available:false,hotel:h,month:Number(m),forecast:null,target:target(h,'occupancy',m),snapshots:0,source:'Sem base'};
  }
  function referenceEconomics(h,m){
    const d=dataMonth(m); if(!d)return null;
    const curRev=field(d,h,'Receita Total',YR_CUR);
    const prevRev=field(d,h,'Receita Total',YR_PREV);
    const refYear=curRev>0?String(YR_CUR):(prevRev>0?String(YR_PREV):null);
    if(!refYear)return null;
    const isCurrent=refYear===String(YR_CUR);
    const rec=field(d,h,'Receita Total',refYear)||0;
    const aloj=field(d,h,'Receita Alojamento',refYear)||0;
    const occupied=field(d,h,'Ocupados',refYear)||0;
    const available=field(d,h,'Disponiveis',refYear)||0;
    const adrRef=kpi('adr',h,refYear,d) ?? (occupied>0?aloj/occupied:null);
    if(!(adrRef>0))return null;
    const nonRoom=Math.max(0,rec-aloj);
    const nonRoomPerRN=occupied>0?nonRoom/occupied:0;
    const personnel=costField(d,h,'PESSOAL',refYear)||0;
    const totalCosts=kpi('totalCosts',h,refYear,d) ?? 0;
    const officialGop=kpi('gop',h,refYear,d);
    const rawGop=rec-totalCosts;
    const sedeAdjustment=(officialGop==null?0:officialGop-rawGop);

    let adrGrowth=0, otherRevGrowth=0, costRatioFactor=1;
    let source=isCurrent?`P&L ${YR_CUR}`:`STLY ${YR_PREV}`;
    if(!isCurrent){
      const adrTarget=target(h,'adrGrowthPct',m);
      const revTarget=target(h,'revenueGrowthPct',m);
      const revFactor=Number(typeof ORC_REVENUE_FACTOR!=='undefined'?ORC_REVENUE_FACTOR:1.05)||1.05;
      const costFactor=Number(typeof ORC_COST_FACTOR!=='undefined'?ORC_COST_FACTOR:1.08)||1.08;
      adrGrowth=adrTarget!=null?adrTarget:(revFactor-1)*100;
      otherRevGrowth=revTarget!=null?revTarget:(revFactor-1)*100;
      costRatioFactor=revFactor>0?costFactor/revFactor:1;
      source+=adrTarget!=null||revTarget!=null?' + Metas V9':' + orçamento técnico';
    }
    const personnelRatio=rec>0?(personnel/rec)*costRatioFactor:0;
    const otherCostRatio=rec>0?(Math.max(0,totalCosts-personnel)/rec)*costRatioFactor:0;
    const sedeRatio=rec>0?sedeAdjustment/rec:0;
    return {
      refYear,source,referenceRevenue:rec,referenceAvailable:available,referenceOccupied:occupied,
      adrBase:adrRef*(1+adrGrowth/100),
      nonRoomPerRN:nonRoomPerRN*(1+otherRevGrowth/100),
      personnelRatio,otherCostRatio,sedeRatio,
      raw:{rec,aloj,occupied,available,personnel,totalCosts,officialGop,sedeAdjustment,adrRef,adrGrowth,otherRevGrowth}
    };
  }
  function confidence(info,econ){
    if(!info?.available||!econ)return {score:0,label:'Sem base',cls:'low'};
    if(info.isActualFallback)return {score:80,label:'Base P&L',cls:'high'};
    let score=30;
    score+=Math.min(28,(Number(info.snapshots)||0)*7);
    if(info.latestAt){const age=(Date.now()-new Date(info.latestAt).getTime())/86400000;if(age<=3)score+=18;else if(age<=7)score+=12;else if(age<=14)score+=6;}
    if(econ.refYear===String(YR_CUR))score+=14;else score+=7;
    if(info.target!=null)score+=5;
    score=clamp(score,0,100);
    return {score:Math.round(score),label:score>=75?'Alta':score>=50?'Média':'Baixa',cls:score>=75?'high':score>=50?'medium':'low'};
  }
  function revenueProjection(base,adj){
    const occ=clamp((base.forecastOcc||0)+(Number(adj.occDelta)||0),0,100);
    const rn=(base.availableRN||0)*occ/100;
    const adr=Math.max(0,(base.adrBase||0)*(1+(Number(adj.adrPct)||0)/100));
    const lodging=rn*adr;
    const nonRoom=Math.max(0,rn*(base.nonRoomPerRN||0)*(1+(Number(adj.otherRevenuePct)||0)/100));
    return {occ,rn,adr,lodging,nonRoom,revenue:lodging+nonRoom};
  }
  function calculateScenario(base,adj={}){
    if(!base||!base.available)return null;
    const a={...DEFAULT_ADJ,...adj};
    const r=revenueProjection(base,a);
    const baseRevenue=Number(base.baseRevenue)||revenueProjection(base,DEFAULT_ADJ).revenue;
    const basePersonnel=baseRevenue*(base.personnelRatio||0);
    const baseOther=baseRevenue*(base.otherCostRatio||0);
    const personnel=Math.max(0,basePersonnel*(1+(Number(a.personnelPct)||0)/100));
    const revenueScale=baseRevenue>0?r.revenue/baseRevenue:1;
    const otherCosts=Math.max(0,baseOther*revenueScale*(1+(Number(a.otherCostPct)||0)/100));
    const costs=personnel+otherCosts;
    const sedeEffect=r.revenue*(base.sedeRatio||0);
    const gop=r.revenue-costs+sedeEffect;
    return {...r,personnel,otherCosts,costs,sedeEffect,gop,gopPct:r.revenue>0?gop/r.revenue*100:null,revpar:base.availableRN>0?r.lodging/base.availableRN:null,trevpar:base.availableRN>0?r.revenue/base.availableRN:null,adjustments:{...a}};
  }
  function buildBase(h,m){
    const info=forecastInfo(h,m), econ=referenceEconomics(h,m);
    if(!info.available||!econ)return {available:false,hotel:h,month:Number(m),reason:!info.available?'Sem ocupação/snapshot para projetar':'Sem P&L de referência para ADR/custos',info,econ};
    const rooms=finite(info.rooms);
    let available=rooms>0?rooms*daysInMonth(m):null;
    if(!(available>0)) available=field(dataMonth(m),h,'Disponiveis',YR_CUR) || field(dataMonth(m),h,'Disponiveis',YR_PREV) || econ.referenceAvailable;
    if(!(available>0))return {available:false,hotel:h,month:Number(m),reason:'Sem quartos disponíveis para o período',info,econ};
    const forecastOcc=clamp(info.forecast??info.occNow,0,100);
    const base={available:true,hotel:h,month:Number(m),availableRN:available,forecastOcc,occNow:finite(info.occNow),target:finite(info.target),trend:finite(info.trend)||0,weeksLeft:finite(info.weeksLeft)||0,snapshots:Number(info.snapshots)||0,latestAt:info.latestAt||null,latestLabel:info.latestLabel||null,source:info.source||'Revenue Intelligence',...econ};
    base.baseRevenue=revenueProjection(base,DEFAULT_ADJ).revenue;
    base.confidence=confidence(info,econ);
    base.baseScenario=calculateScenario(base,DEFAULT_ADJ);
    return base;
  }
  function portfolioForecast(m,hotels){
    const rows=(hotels||activeHotels()).map(h=>{const b=buildBase(h,m);if(!b.available)return null;const s=b.baseScenario;return {hotel:h,base:b,scenario:s,gap:b.target==null?null:b.forecastOcc-b.target};}).filter(Boolean);
    const totals=rows.reduce((a,r)=>{a.revenue+=r.scenario.revenue;a.gop+=r.scenario.gop;a.costs+=r.scenario.costs;a.rn+=r.scenario.rn;a.available+=r.base.availableRN;a.lodging+=r.scenario.lodging;return a;},{revenue:0,gop:0,costs:0,rn:0,available:0,lodging:0});
    totals.occupancy=totals.available>0?totals.rn/totals.available*100:null;
    totals.adr=totals.rn>0?totals.lodging/totals.rn:null;
    totals.gopPct=totals.revenue>0?totals.gop/totals.revenue*100:null;
    return {rows,totals};
  }
  function currentBase(){return buildBase(selectedHotel,selectedMonth);}
  function deltaCard(label,baseVal,scenarioVal,formatter,unitMode){
    const diff=scenarioVal-baseVal;let d;
    if(unitMode==='pct')d=sign(diff,1,' p.p.'); else if(unitMode==='money')d=`${diff>=0?'+':'-'}${eur(Math.abs(diff),0)}`; else d=sign(diff,1,'%');
    const cls=Math.abs(diff)<0.0001?'neutral':diff>0?'good':'bad';
    return `<div class="fs-kpi"><span>${esc(label)}</span><strong>${formatter(scenarioVal)}</strong><small class="${cls}">${d} vs base</small></div>`;
  }
  function slider(id,label,min,max,step,unit){
    const v=Number(adjustments[id])||0;
    return `<label class="fs-slider"><div><span>${esc(label)}</span><strong id="fsVal_${id}">${v>=0?'+':''}${fmt(v,1)}${esc(unit)}</strong></div><input type="range" min="${min}" max="${max}" step="${step}" value="${v}" oninput="forecastSetAdjust('${id}',this.value)"></label>`;
  }
  function renderScenario(base){
    const host=document.getElementById('forecastScenarioResult');if(!host)return;
    if(!base.available){host.innerHTML=`<div class="fs-empty">${esc(base.reason||'Sem dados suficientes.')}</div>`;return;}
    const b=base.baseScenario,s=calculateScenario(base,adjustments);
    host.innerHTML=`
      <div class="fs-kpi-grid">
        ${deltaCard('Receita',b.revenue,s.revenue,v=>eur(v,0),'money')}
        ${deltaCard('GOP com sede estimado',b.gop,s.gop,v=>eur(v,0),'money')}
        ${deltaCard('Margem GOP',b.gopPct,s.gopPct,v=>pct(v,1),'pct')}
        ${deltaCard('Ocupação',b.occ,s.occ,v=>pct(v,1),'pct')}
        ${deltaCard('ADR',b.adr,s.adr,v=>eur(v,2),'money')}
        ${deltaCard('RevPAR',b.revpar,s.revpar,v=>eur(v,2),'money')}
      </div>
      <div class="fs-impact-grid">
        <div><span>Room nights</span><strong>${fmt(s.rn,0)}</strong><small>${sign(s.rn-b.rn,0,' RN')}</small></div>
        <div><span>Receita Alojamento</span><strong>${eur(s.lodging,0)}</strong><small>${s.revenue>0?pct(s.lodging/s.revenue*100,1)+' da receita':'—'}</small></div>
        <div><span>Receita complementar</span><strong>${eur(s.nonRoom,0)}</strong><small>${eur(base.nonRoomPerRN,2)} / RN de referência</small></div>
        <div><span>Pessoal estimado</span><strong>${eur(s.personnel,0)}</strong><small>${s.revenue>0?pct(s.personnel/s.revenue*100,1)+' da receita':'—'}</small></div>
        <div><span>Outros custos estimados</span><strong>${eur(s.otherCosts,0)}</strong><small>${s.revenue>0?pct(s.otherCosts/s.revenue*100,1)+' da receita':'—'}</small></div>
        <div><span>Efeito sede estimado</span><strong>${eur(s.sedeEffect,0)}</strong><small>mantém o rácio da base de referência</small></div>
      </div>`;
  }
  function renderPortfolio(){
    const host=document.getElementById('forecastPortfolio');if(!host)return;
    const p=portfolioForecast(selectedMonth);
    if(!p.rows.length){host.innerHTML='<div class="fs-empty">Sem hotéis com dados suficientes para este mês.</div>';return;}
    const rows=[...p.rows].sort((a,b)=>(a.gap??999)-(b.gap??999));
    host.innerHTML=`<div class="fs-portfolio-head"><div><strong>Forecast do portefólio</strong><span>${MONTHS[selectedMonth]} ${YR_CUR} · cenário base</span></div><div class="fs-port-kpis"><b>${eur(p.totals.revenue,0)} receita</b><b>${eur(p.totals.gop,0)} GOP</b><b>${pct(p.totals.occupancy,1)} ocupação</b></div></div>
      <div class="fs-table-wrap"><table class="fs-table"><thead><tr><th>Hotel</th><th>OCC atual</th><th>Forecast</th><th>Meta</th><th>Gap</th><th>ADR ref.</th><th>Receita forecast</th><th>GOP forecast</th><th>GOP%</th><th>Confiança</th></tr></thead><tbody>${rows.map(r=>`<tr class="${r.hotel===selectedHotel?'selected':''}" onclick="forecastSelectHotel('${esc(r.hotel).replace(/'/g,'&#39;')}')"><td><strong>${esc(r.hotel)}</strong></td><td>${pct(r.base.occNow,1)}</td><td>${pct(r.base.forecastOcc,1)}</td><td>${pct(r.base.target,1)}</td><td class="${r.gap==null?'':r.gap>=0?'good':'bad'}">${r.gap==null?'—':sign(r.gap,1,' p.p.')}</td><td>${eur(r.base.adrBase,2)}</td><td>${eur(r.scenario.revenue,0)}</td><td>${eur(r.scenario.gop,0)}</td><td>${pct(r.scenario.gopPct,1)}</td><td><span class="fs-confidence ${r.base.confidence.cls}">${esc(r.base.confidence.label)} ${r.base.confidence.score}</span></td></tr>`).join('')}</tbody></table></div>`;
  }
  function render(){
    const root=document.getElementById('forecastRoot');if(!root)return;
    const hotels=allHotels();
    if(!hotels.length){root.innerHTML='<div class="fs-empty">Carrega P&L e Ocupação para ativar Forecast & Cenários.</div>';return;}
    if(!selectedHotel||!hotels.includes(selectedHotel)){const a=activeHotels();selectedHotel=a[0]||hotels[0];}
    const base=currentBase();
    const months=[...Array(12)].map((_,i)=>i+1);
    root.innerHTML=`
      <div class="fs-head">
        <div><div class="fs-eyebrow">Forecast & Cenários · V12</div><h2>Projetar o fecho antes de decidir</h2><p>Ocupação projetada pelo ritmo dos snapshots; Receita e GOP estimados a partir das referências identificadas abaixo.</p></div>
        <div class="fs-controls"><label>Hotel<select onchange="forecastSelectHotel(this.value)">${hotels.map(h=>`<option value="${esc(h)}" ${h===selectedHotel?'selected':''}>${esc(h)}</option>`).join('')}</select></label><label>Mês<select onchange="forecastSelectMonth(this.value)">${months.map(m=>`<option value="${m}" ${m===selectedMonth?'selected':''}>${MONTHS[m]}</option>`).join('')}</select></label><button class="fs-btn" onclick="forecastRender()">Atualizar</button><button class="fs-btn" onclick="scenarioCompareFromForecast()">Guardar / comparar</button></div>
      </div>
      ${base.available?renderBaseSummary(base):`<div class="fs-empty prominent"><strong>Não é possível projetar ${esc(selectedHotel)} · ${MONTHS[selectedMonth]}.</strong><span>${esc(base.reason||'Faltam dados.')}</span></div>`}
      <div class="fs-layout">
        <section class="fs-panel"><div class="fs-panel-head"><div><strong>Cenário de decisão</strong><span>Ajustes relativos ao forecast base; não alteram os dados gravados.</span></div><div class="fs-presets"><button onclick="forecastPreset('conservative')">Conservador</button><button class="active" onclick="forecastPreset('base')">Base</button><button onclick="forecastPreset('upside')">Ambicioso</button><button onclick="forecastPreset('efficiency')">Eficiência</button></div></div>
          <div class="fs-slider-grid">${slider('occDelta','Ocupação vs forecast',-10,10,.5,' p.p.')}${slider('adrPct','ADR',-15,15,.5,'%')}${slider('otherRevenuePct','Receita complementar',-15,15,.5,'%')}${slider('personnelPct','Custo de pessoal',-10,10,.5,'%')}${slider('otherCostPct','Outros custos',-10,10,.5,'%')}</div>
        </section>
        <section class="fs-panel"><div class="fs-panel-head"><div><strong>Impacto do cenário</strong><span>Comparação imediata com o forecast base.</span></div></div><div id="forecastScenarioResult"></div></section>
      </div>
      <section class="fs-panel fs-method"><div class="fs-panel-head"><div><strong>Premissas e rastreabilidade</strong><span>O forecast é uma estimativa de gestão, não um valor contabilístico realizado.</span></div></div>${base.available?renderMethod(base):'<div class="fs-empty">Sem premissas disponíveis.</div>'}</section>
      <section class="fs-panel"><div id="forecastPortfolio"></div></section>`;
    renderScenario(base);renderPortfolio();
  }
  function renderBaseSummary(base){
    const s=base.baseScenario;const gap=base.target==null?null:base.forecastOcc-base.target;
    return `<div class="fs-base-grid">
      <div class="fs-base-card"><span>OCC atual</span><strong>${pct(base.occNow,1)}</strong><small>${base.latestLabel?`snapshot ${esc(base.latestLabel)}`:esc(base.source)}</small></div>
      <div class="fs-base-card"><span>Forecast ocupação</span><strong>${pct(base.forecastOcc,1)}</strong><small>${sign(base.trend,1,' p.p./sem.')} · ${fmt(base.weeksLeft,1)} sem. restantes</small></div>
      <div class="fs-base-card"><span>Meta ocupação</span><strong>${pct(base.target,1)}</strong><small class="${gap==null?'':gap>=0?'good':'bad'}">${gap==null?'sem meta':`${sign(gap,1,' p.p.')} vs meta`}</small></div>
      <div class="fs-base-card"><span>Receita forecast</span><strong>${eur(s.revenue,0)}</strong><small>${eur(s.trevpar,2)} TRevPAR</small></div>
      <div class="fs-base-card"><span>GOP forecast</span><strong>${eur(s.gop,0)}</strong><small>${pct(s.gopPct,1)} margem</small></div>
      <div class="fs-base-card"><span>Confiança</span><strong>${base.confidence.score}/100</strong><small><span class="fs-confidence ${base.confidence.cls}">${esc(base.confidence.label)}</span> · ${base.snapshots} snapshot(s)</small></div>
    </div>`;
  }
  function renderMethod(base){
    const source=base.latestLabel?`Revenue Intelligence · ${base.latestLabel}`:base.source;
    return `<div class="fs-method-grid">
      <div><span>Ocupação base</span><strong>${pct(base.forecastOcc,1)}</strong><small>${esc(source)} · tendência ${sign(base.trend,1,' p.p./sem.')}</small></div>
      <div><span>ADR de referência</span><strong>${eur(base.adrBase,2)}</strong><small>${esc(base.source)}</small></div>
      <div><span>Receita complementar / RN</span><strong>${eur(base.nonRoomPerRN,2)}</strong><small>A&B + diversos por quarto ocupado de referência</small></div>
      <div><span>Pessoal / Receita</span><strong>${pct(base.personnelRatio*100,1)}</strong><small>rácio de referência ajustado quando parte de STLY</small></div>
      <div><span>Outros custos / Receita</span><strong>${pct(base.otherCostRatio*100,1)}</strong><small>custos operacionais excluindo pessoal</small></div>
      <div><span>Efeito sede / Receita</span><strong>${pct(base.sedeRatio*100,1)}</strong><small>ponte entre Receita−Custos e GOP com sede oficial</small></div>
    </div><div class="fs-note">Método: RN forecast = quartos disponíveis × ocupação projetada. Receita de alojamento = RN × ADR de referência. Receita complementar é projetada por RN. Pessoal mantém a base prevista salvo ajuste manual; os restantes custos acompanham a variação de receita. O efeito de sede mantém o rácio observado na referência.</div>`;
  }
  function setAdjust(id,v){if(!(id in adjustments))return;adjustments[id]=Number(v)||0;const b=currentBase();renderScenario(b);const el=document.getElementById('fsVal_'+id);if(el)el.textContent=`${adjustments[id]>=0?'+':''}${fmt(adjustments[id],1)}${id==='occDelta'?' p.p.':'%'}`;}
  function preset(name){adjustments={...(PRESETS[name]||PRESETS.base)};render();}
  function selectHotel(h){selectedHotel=String(h||'');adjustments={...DEFAULT_ADJ};render();}
  function selectMonth(m){selectedMonth=clamp(Number(m)||1,1,12);adjustments={...DEFAULT_ADJ};render();}
  function getState(){return {hotel:selectedHotel,month:selectedMonth,adjustments:{...adjustments}};}

  window.VG=window.VG||{};
  window.VG.forecast={buildBase,calculateScenario,portfolioForecast,revenueProjection,referenceEconomics,forecastInfo,confidence,presets:PRESETS,render,getState};
  window.forecastRender=render;
  window.forecastSetAdjust=setAdjust;
  window.forecastPreset=preset;
  window.forecastSelectHotel=selectHotel;
  window.forecastSelectMonth=selectMonth;
  window.VG?.events?.on?.('targets-rules:changed',()=>{if(typeof currentView!=='undefined'&&currentView==='forecast')render();});
  window.VG?.events?.on?.('targets-rules:loaded',()=>{if(typeof currentView!=='undefined'&&currentView==='forecast')render();});
  window.VG?.events?.on?.('state:changed',()=>{if(typeof currentView!=='undefined'&&currentView==='forecast')setTimeout(render,20);});
})();
