// ==========================================================
// BENCHMARKING EXECUTIVO — V11
// Hotel vs Região vs Portefólio vs STLY vs Meta/Orçamento.
// Usa exclusivamente os KPIs canónicos já estabilizados.
// ==========================================================
(function(){
  'use strict';
  if(window.__VG_BENCHMARKING_V11__) return;
  window.__VG_BENCHMARKING_V11__ = true;

  const METRICS = [
    {id:'revenueGrowth', label:'Receita', unit:'%', mode:'growth', higher:true, description:'Variação da Receita Total vs ano anterior'},
    {id:'gopMargin', label:'GOP com sede', unit:'%', mode:'margin', higher:true, description:'Margem GOP com sede sobre Receita Total'},
    {id:'occupancy', label:'Ocupação', unit:'%', mode:'direct', higher:true, description:'Quartos ocupados / quartos disponíveis'},
    {id:'adr', label:'ADR', unit:'€', mode:'direct', higher:true, description:'Receita de alojamento / quartos ocupados'},
    {id:'revpar', label:'RevPAR', unit:'€', mode:'direct', higher:true, description:'Receita de alojamento / quartos disponíveis'},
    {id:'costRatio', label:'Custos / Receita', unit:'%', mode:'ratio', higher:false, description:'Custos totais sobre Receita Total'},
    {id:'personnelRatio', label:'Pessoal / Receita', unit:'%', mode:'ratio', higher:false, description:'Custos de pessoal sobre Receita Total'}
  ];

  let BENCH_HOTEL = '';

  function n(v){ const x=Number(v); return Number.isFinite(x)?x:0; }
  function finite(v){ if(v==null||v==='') return null; const x=Number(v); return Number.isFinite(x)?x:null; }
  function esc(v){ return String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function fmt(v,d=1){ return v==null||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString('pt-PT',{minimumFractionDigits:d,maximumFractionDigits:d}); }
  function pct(v,d=1){ return v==null?'—':`${fmt(v,d)}%`; }
  function eur(v,d=2){ return v==null?'—':(window.VG?.market?.formatMoney?window.VG.market.formatMoney(v,d,false):`€${fmt(v,d)}`); }
  function deltaClass(v,higher=true){ if(v==null||Math.abs(v)<0.0001)return 'neutral'; return (higher?v>0:v<0)?'good':'bad'; }
  function currentMonths(){
    try{
      const a=[...(selectedMeses||[])].map(Number).filter(m=>m>=1&&m<=12).sort((a,b)=>a-b);
      return a.length?a:Object.keys(STORE||{}).map(Number).filter(m=>m>=1&&m<=12).sort((a,b)=>a-b).slice(-1);
    }catch(e){return [];}
  }
  function periodLabel(){
    const ms=currentMonths(); if(!ms.length)return 'Período ativo';
    const names=ms.map(m=>(typeof PNL_MESES!=='undefined'&&PNL_MESES[m])||String(m));
    if(ms.length===1)return `${names[0]} ${YR_CUR}`;
    if(ms.every((m,i)=>i===0||m===ms[i-1]+1))return `${names[0]}–${names[names.length-1]} ${YR_CUR}`;
    return `${ms.length} meses selecionados · ${YR_CUR}`;
  }
  function hotelRegion(h){
    try{ for(const [r,list] of Object.entries(REGIOES||{})) if((list||[]).includes(h)) return r; }catch(e){}
    return null;
  }
  function regionName(r){return window.VG?.market?.regionLabel?.(r)||({norte:'Norte e Centro',lisboa:'Lisboa & Ilhas',alentejo:'Alentejo',algarve:'Algarve'})[r]||'Sem região';}
  function allHotels(){
    try{return (RAW?.hotel_list||[]).filter(h=>!window.VG?.market||window.VG.market.isCurrentHotel(h));}catch(e){return [];}
  }
  function regionHotels(h,excludeSelected=false){
    const r=hotelRegion(h); if(!r)return [];
    const valid=new Set(allHotels());
    return (REGIOES?.[r]||[]).filter(x=>valid.has(x)&&(!excludeSelected||x!==h));
  }
  function portfolioHotels(h,excludeSelected=false){return allHotels().filter(x=>!excludeSelected||x!==h);}

  function op(h,field,year){ return RAW?.hotels_ops?.[h]?.[field]?.[year]; }
  function cost(h,field,year){ return RAW?.hotels_costs?.[h]?.[field]?.[year]; }
  function revenue(h,year){return n(op(h,'Receita Total',year));}
  function aloj(h,year){return n(op(h,'Receita Alojamento',year));}
  function occupied(h,year){return n(op(h,'Ocupados',year));}
  function available(h,year){return n(op(h,'Disponiveis',year));}
  function gopValue(h,year){
    try{return finite(window.VG?.kpi?.gop?.(h,year,RAW));}catch(e){return null;}
  }
  function totalCost(h,year){
    try{return finite(window.VG?.kpi?.totalCosts?.(h,year,RAW))??0;}catch(e){return n(cost(h,'TOTAIS',year));}
  }
  function metricHotel(h,id,year=YR_CUR){
    const rec=revenue(h,year);
    if(id==='revenueGrowth'){
      const prev=revenue(h,YR_PREV); return prev>0?(revenue(h,YR_CUR)-prev)/prev*100:null;
    }
    if(id==='gopMargin'){const g=gopValue(h,year);return rec>0&&g!=null?g/rec*100:null;}
    if(id==='occupancy'){const d=available(h,year);return d>0?occupied(h,year)/d*100:null;}
    if(id==='adr'){const o=occupied(h,year);return o>0?aloj(h,year)/o:null;}
    if(id==='revpar'){const d=available(h,year);return d>0?aloj(h,year)/d:null;}
    if(id==='costRatio'){return rec>0?totalCost(h,year)/rec*100:null;}
    if(id==='personnelRatio'){return rec>0?n(cost(h,'PESSOAL',year))/rec*100:null;}
    return null;
  }

  // Agregação ponderada: evita dar o mesmo peso a hotéis de dimensões diferentes.
  function metricGroup(hotels,id,year=YR_CUR){
    const hs=(hotels||[]).filter(Boolean); if(!hs.length)return null;
    if(id==='revenueGrowth'){
      const p=hs.reduce((s,h)=>s+revenue(h,YR_PREV),0), c=hs.reduce((s,h)=>s+revenue(h,YR_CUR),0);
      return p>0?(c-p)/p*100:null;
    }
    if(id==='gopMargin'){
      const rec=hs.reduce((s,h)=>s+revenue(h,year),0), g=hs.reduce((s,h)=>s+(gopValue(h,year)||0),0);
      return rec>0?g/rec*100:null;
    }
    if(id==='occupancy'){
      const d=hs.reduce((s,h)=>s+available(h,year),0), o=hs.reduce((s,h)=>s+occupied(h,year),0); return d>0?o/d*100:null;
    }
    if(id==='adr'){
      const o=hs.reduce((s,h)=>s+occupied(h,year),0), a=hs.reduce((s,h)=>s+aloj(h,year),0); return o>0?a/o:null;
    }
    if(id==='revpar'){
      const d=hs.reduce((s,h)=>s+available(h,year),0), a=hs.reduce((s,h)=>s+aloj(h,year),0); return d>0?a/d:null;
    }
    if(id==='costRatio'){
      const rec=hs.reduce((s,h)=>s+revenue(h,year),0), c=hs.reduce((s,h)=>s+totalCost(h,year),0); return rec>0?c/rec*100:null;
    }
    if(id==='personnelRatio'){
      const rec=hs.reduce((s,h)=>s+revenue(h,year),0), c=hs.reduce((s,h)=>s+n(cost(h,'PESSOAL',year)),0); return rec>0?c/rec*100:null;
    }
    return null;
  }

  function explicitTarget(h,metric,month){
    try{return finite(window.VG?.targetsRules?.getTarget?.(h,metric,month,YR_CUR));}catch(e){return null;}
  }
  function ruleValue(id,def=null){
    try{const r=window.VG?.targetsRules?.rule?.(id,def); return r&&r.enabled!==false?finite(r.value):null;}catch(e){return def;}
  }
  function monthlyPrev(h,m,field){return n(STORE?.[m]?.hotels_ops?.[h]?.[field]?.[YR_PREV]);}
  function monthlyPrevCost(h,m,field){return n(STORE?.[m]?.hotels_costs?.[h]?.[field]?.[YR_PREV]);}

  function targetFor(h,id){
    const ms=currentMonths();
    // Quando não há meses individuais, usar o período ativo para regras globais.
    if(!ms.length){
      if(id==='gopMargin'){const x=ruleValue('gop_margin_min');return x==null?null:{value:x,source:'Regra global'};}
      if(id==='personnelRatio'){const x=ruleValue('personnel_ratio_max');return x==null?null:{value:x,source:'Regra global'};}
      return null;
    }
    if(id==='revenueGrowth'){
      let base=0,target=0, explicit=0;
      for(const m of ms){const p=monthlyPrev(h,m,'Receita Total');if(p<=0)continue;const t=explicitTarget(h,'revenueGrowth',m);const growth=t==null?((typeof ORC_REVENUE_FACTOR!=='undefined'?ORC_REVENUE_FACTOR:1.05)-1)*100:t;if(t!=null)explicit++;base+=p;target+=p*(1+growth/100);}
      if(base<=0)return null; return {value:(target/base-1)*100,source:explicit?`Metas V9 (${explicit}/${ms.length} mês(es))`:'Orçamento técnico'};
    }
    if(id==='gopMargin'){
      let w=0,s=0,explicit=0; const fallback=ruleValue('gop_margin_min');
      for(const m of ms){const rev=monthlyPrev(h,m,'Receita Total')||1;const t=explicitTarget(h,'gopMargin',m);const v=t==null?fallback:t;if(v==null)continue;if(t!=null)explicit++;w+=rev;s+=v*rev;}
      return w>0?{value:s/w,source:explicit?`Metas V9 (${explicit}/${ms.length} mês(es))`:'Regra global'}:null;
    }
    if(id==='occupancy'){
      let d=0,oTarget=0,explicit=0; const delta=ruleValue('ri_occ_delta',2);
      for(const m of ms){const disp=monthlyPrev(h,m,'Disponiveis');if(disp<=0)continue;const t=explicitTarget(h,'occupancy',m);const lyOcc=monthlyPrev(h,m,'Ocupados')/disp*100;const v=t==null?(delta==null?null:lyOcc+delta):t;if(v==null)continue;if(t!=null)explicit++;d+=disp;oTarget+=Math.max(0,Math.min(100,v))/100*disp;}
      return d>0?{value:oTarget/d*100,source:explicit?`Metas V9 (${explicit}/${ms.length} mês(es))`:'STLY + regra RI'}:null;
    }
    if(id==='adr'){
      let rooms=0,sum=0,explicit=0; const fallback=((typeof ORC_REVENUE_FACTOR!=='undefined'?ORC_REVENUE_FACTOR:1.05)-1)*100;
      for(const m of ms){const occ=monthlyPrev(h,m,'Ocupados');const alojPrev=monthlyPrev(h,m,'Receita Alojamento');if(occ<=0)continue;const base=alojPrev/occ;const t=explicitTarget(h,'adrGrowth',m);const growth=t==null?fallback:t;if(t!=null)explicit++;rooms+=occ;sum+=base*(1+growth/100)*occ;}
      return rooms>0?{value:sum/rooms,source:explicit?`Metas V9 (${explicit}/${ms.length} mês(es))`:'Orçamento técnico'}:null;
    }
    if(id==='revpar'){
      const ot=targetFor(h,'occupancy'), at=targetFor(h,'adr');
      return ot&&at?{value:at.value*ot.value/100,source:(ot.source.includes('Metas')||at.source.includes('Metas'))?'Meta derivada':'Orçamento técnico'}:null;
    }
    if(id==='costRatio'){
      let rec=0,cst=0;
      for(const m of ms){const rp=monthlyPrev(h,m,'Receita Total');const cp=monthlyPrevCost(h,m,'TOTAIS');if(rp<=0)continue;rec+=rp*(typeof ORC_REVENUE_FACTOR!=='undefined'?ORC_REVENUE_FACTOR:1.05);cst+=cp*(typeof ORC_COST_FACTOR!=='undefined'?ORC_COST_FACTOR:1.08);}
      return rec>0?{value:cst/rec*100,source:'Orçamento técnico'}:null;
    }
    if(id==='personnelRatio'){
      const x=ruleValue('personnel_ratio_max');return x==null?null:{value:x,source:'Regra global'};
    }
    return null;
  }

  function stlyFor(h,id){
    if(id==='revenueGrowth')return revenue(h,YR_PREV);
    return metricHotel(h,id,YR_PREV);
  }
  function hotelDisplay(h,id){
    if(id==='revenueGrowth')return {value:revenue(h,YR_CUR),display:eur(revenue(h,YR_CUR),0)};
    const v=metricHotel(h,id,YR_CUR);return {value:v,display:(id==='adr'||id==='revpar')?eur(v,2):pct(v,1)};
  }
  function stlyDisplay(h,id){
    const v=stlyFor(h,id);return (id==='revenueGrowth'||id==='adr'||id==='revpar')?eur(v,id==='revenueGrowth'?0:2):pct(v,1);
  }
  function hotelDelta(h,id){
    if(id==='revenueGrowth')return metricHotel(h,id,YR_CUR);
    const cur=metricHotel(h,id,YR_CUR), prev=metricHotel(h,id,YR_PREV); if(cur==null||prev==null)return null;
    return (id==='adr'||id==='revpar')?(prev!==0?(cur-prev)/Math.abs(prev)*100:null):(cur-prev);
  }
  function groupDisplay(v,id){return v==null?'—':(id==='adr'||id==='revpar'?eur(v,2):pct(v,1));}
  function deltaDisplay(v,id){ if(v==null)return '—'; return (id==='adr'||id==='revpar'||id==='revenueGrowth')?`${v>=0?'+':''}${fmt(v,1)}%`:`${v>=0?'+':''}${fmt(v,1)} p.p.`; }
  function advantageDisplay(v,id){ if(v==null)return '—'; return (id==='adr'||id==='revpar')?`${v>=0?'+':''}${fmt(v,1)}%`:`${v>=0?'+':''}${fmt(v,1)} p.p.`; }

  function comparatorValue(h,id){return metricHotel(h,id,YR_CUR);}
  function percentile(h,id,group){
    const m=METRICS.find(x=>x.id===id); if(!m)return null; const hv=comparatorValue(h,id); if(hv==null)return null;
    const vals=(group||[]).map(x=>({h:x,v:comparatorValue(x,id)})).filter(x=>x.v!=null); if(!vals.length)return null;
    let worse=0,tie=0; for(const x of vals){const d=x.v-hv;if(Math.abs(d)<1e-9)tie++;else if(m.higher?x.v<hv:x.v>hv)worse++;}
    return (worse+0.5*tie)/vals.length*100;
  }
  function overallPercentile(h,group){const vals=METRICS.map(m=>percentile(h,m.id,group)).filter(v=>v!=null);return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;}

  function advantage(h,id,benchmark){
    const m=METRICS.find(x=>x.id===id), hv=comparatorValue(h,id); if(!m||hv==null||benchmark==null)return null;
    let d=m.higher?hv-benchmark:benchmark-hv;
    if(id==='adr'||id==='revpar') d=benchmark!==0?d/Math.abs(benchmark)*100:d;
    return d;
  }
  function summary(h){
    const rHotels=regionHotels(h,false), pHotels=portfolioHotels(h,false), rPeers=regionHotels(h,true), pPeers=portfolioHotels(h,true);
    const rows=METRICS.map(m=>{
      const region=metricGroup(rPeers.length?rPeers:rHotels,m.id,YR_CUR), portfolio=metricGroup(pPeers.length?pPeers:pHotels,m.id,YR_CUR), target=targetFor(h,m.id);
      const hv=comparatorValue(h,m.id);
      const winR=hv!=null&&region!=null?(m.higher?hv>=region:hv<=region):null;
      const winP=hv!=null&&portfolio!=null?(m.higher?hv>=portfolio:hv<=portfolio):null;
      const winT=hv!=null&&target?.value!=null?(m.higher?hv>=target.value:hv<=target.value):null;
      return {...m,hotel:hotelDisplay(h,m.id),stly:stlyDisplay(h,m.id),delta:hotelDelta(h,m.id),region,portfolio,target,winR,winP,winT,advRegion:advantage(h,m.id,region)};
    });
    const availableR=rows.filter(x=>x.winR!=null), availableP=rows.filter(x=>x.winP!=null), availableT=rows.filter(x=>x.winT!=null);
    const sorted=rows.filter(x=>x.advRegion!=null).sort((a,b)=>b.advRegion-a.advRegion);
    return {
      hotel:h,region:hotelRegion(h),regionName:regionName(hotelRegion(h)),rows,
      regionalPercentile:overallPercentile(h,rHotels),portfolioPercentile:overallPercentile(h,pHotels),
      winsRegion:availableR.filter(x=>x.winR).length,totalRegion:availableR.length,
      winsPortfolio:availableP.filter(x=>x.winP).length,totalPortfolio:availableP.length,
      targetsMet:availableT.filter(x=>x.winT).length,totalTargets:availableT.length,
      strongest:sorted.find(x=>x.advRegion>0)||null,biggestGap:[...sorted].reverse().find(x=>x.advRegion<0)||null,
      regionHotels:rHotels, portfolioHotels:pHotels
    };
  }

  function leagueRows(h){
    const group=regionHotels(h,false);
    return group.map(x=>({
      hotel:x,score:overallPercentile(x,group),revenueGrowth:metricHotel(x,'revenueGrowth'),gopMargin:metricHotel(x,'gopMargin'),occupancy:metricHotel(x,'occupancy'),adr:metricHotel(x,'adr'),revpar:metricHotel(x,'revpar')
    })).sort((a,b)=>(b.score??-1)-(a.score??-1));
  }

  function render(){
    const root=document.getElementById('benchmarkRoot'); if(!root)return;
    if(typeof RAW==='undefined'||!RAW||!RAW.hotel_list?.length){root.innerHTML='<div class="bm-empty">Carrega o P&L para ativar o Benchmarking Executivo.</div>';return;}
    const options=allHotels(); if(!BENCH_HOTEL||!options.includes(BENCH_HOTEL)){
      const active=(typeof getActiveHotels==='function'?getActiveHotels():[]); BENCH_HOTEL=(active&&active[0])||options[0]||'';
    }
    const s=summary(BENCH_HOTEL), league=leagueRows(BENCH_HOTEL);
    const strongest=s.strongest, gap=s.biggestGap;
    root.innerHTML=`
      <div class="bm-head">
        <div><div class="bm-eyebrow">Benchmarking Executivo · V11</div><h2>Hotel vs pares relevantes</h2><p>Comparação ponderada com região e portefólio, STLY e metas/orçamento do período ativo.</p></div>
        <div class="bm-controls"><label>Hotel<select id="benchmarkHotel" onchange="benchmarkSelectHotel(this.value)">${options.map(h=>`<option value="${esc(h)}" ${h===BENCH_HOTEL?'selected':''}>${esc(h)}</option>`).join('')}</select></label><div class="bm-period"><span>Período</span><strong>${esc(periodLabel())}</strong></div></div>
      </div>
      <div class="bm-context"><span>Região: <strong>${esc(s.regionName)}</strong></span><span>${s.regionHotels.length} hotel(is) no benchmark regional</span><span>Portefólio: ${s.portfolioHotels.length} hotel(is)</span><span>Região calculada sem duplicar o peso do hotel selecionado</span></div>
      <div class="bm-stats">
        <div class="bm-stat"><span>Percentil regional</span><strong>${s.regionalPercentile==null?'—':fmt(s.regionalPercentile,0)}</strong><small>0–100 · média dos KPIs disponíveis</small></div>
        <div class="bm-stat"><span>Acima da região</span><strong>${s.winsRegion}/${s.totalRegion}</strong><small>KPIs em que supera o benchmark regional</small></div>
        <div class="bm-stat"><span>Acima do portefólio</span><strong>${s.winsPortfolio}/${s.totalPortfolio}</strong><small>KPIs em que supera o benchmark global</small></div>
        <div class="bm-stat"><span>Metas cumpridas</span><strong>${s.totalTargets?s.targetsMet+'/'+s.totalTargets:'—'}</strong><small>Metas V9, regras ou orçamento técnico</small></div>
        <div class="bm-stat"><span>Percentil portefólio</span><strong>${s.portfolioPercentile==null?'—':fmt(s.portfolioPercentile,0)}</strong><small>Posição relativa no conjunto disponível</small></div>
      </div>
      <div class="bm-insights">
        <div class="bm-insight good"><span>Maior vantagem relativa</span><strong>${strongest?esc(strongest.label):'—'}</strong><p>${strongest?`Face à região: ${advantageDisplay(strongest.advRegion,strongest.id)} em termos favoráveis.`:'Sem vantagem positiva identificada face à região.'}</p></div>
        <div class="bm-insight ${gap&&gap.advRegion<0?'bad':'neutral'}"><span>Maior gap a trabalhar</span><strong>${gap?esc(gap.label):'—'}</strong><p>${gap?`Face à região: ${advantageDisplay(gap.advRegion,gap.id)} em termos favoráveis.`:'Sem gap negativo identificado face à região.'}</p></div>
      </div>
      <div class="bm-section-title"><div><strong>Matriz comparativa</strong><span>Região/portefólio usam agregação ponderada. Custos são melhores quando mais baixos.</span></div></div>
      <div class="bm-table-wrap"><table class="bm-table"><thead><tr><th>KPI</th><th>Hotel ${YR_CUR}</th><th>STLY ${YR_PREV}</th><th>Δ Hotel</th><th>Região</th><th>Portefólio</th><th>Meta / Orçamento</th><th>Leitura</th></tr></thead><tbody>${s.rows.map(rowHtml).join('')}</tbody></table></div>
      <div class="bm-section-title"><div><strong>Liga regional</strong><span>Ranking relativo dentro de ${esc(s.regionName)}. O score é a média dos percentis dos KPIs disponíveis, não uma meta financeira.</span></div></div>
      <div class="bm-table-wrap"><table class="bm-table league"><thead><tr><th>#</th><th>Hotel</th><th>Score</th><th>Receita vs LY</th><th>GOP%</th><th>Ocupação</th><th>ADR</th><th>RevPAR</th></tr></thead><tbody>${league.map((r,i)=>`<tr class="${r.hotel===BENCH_HOTEL?'selected':''}"><td>${i+1}</td><td><strong>${esc(r.hotel)}</strong></td><td>${r.score==null?'—':fmt(r.score,0)}</td><td>${r.revenueGrowth==null?'—':(r.revenueGrowth>=0?'+':'')+fmt(r.revenueGrowth,1)+'%'}</td><td>${pct(r.gopMargin,1)}</td><td>${pct(r.occupancy,1)}</td><td>${eur(r.adr,2)}</td><td>${eur(r.revpar,2)}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function rowHtml(r){
    const regionAdv=r.advRegion;
    const read=r.winR==null?'Sem benchmark regional':r.winR?'Acima / melhor que a região':'Abaixo / pior que a região';
    const cls=r.winR==null?'neutral':r.winR?'good':'bad';
    const target=r.target?`${groupDisplay(r.target.value,r.id)}<small>${esc(r.target.source)}</small>`:'—';
    return `<tr><td><strong>${esc(r.label)}</strong><small>${esc(r.description)}</small></td><td>${r.hotel.display}</td><td>${r.stly}</td><td><span class="bm-delta ${deltaClass(r.delta,r.higher)}">${deltaDisplay(r.delta,r.id)}</span></td><td>${groupDisplay(r.region,r.id)}${regionAdv==null?'':`<small>${regionAdv>=0?'Vantagem':'Gap'} do hotel: ${advantageDisplay(regionAdv,r.id)}</small>`}</td><td>${groupDisplay(r.portfolio,r.id)}</td><td>${target}</td><td><span class="bm-read ${cls}">${esc(read)}</span>${r.winT==null?'':`<small>${r.winT?'Meta cumprida':'Abaixo da meta'}</small>`}</td></tr>`;
  }

  function selectHotel(h){BENCH_HOTEL=String(h||'');render();}

  window.VG=window.VG||{};
  window.VG.benchmark={
    metrics:METRICS.map(x=>({...x})), metricHotel, metricGroup, targetFor, hotelRegion, regionHotels, portfolioHotels, percentile, overallPercentile, summary, leagueRows, render
  };
  window.benchmarkRender=render;
  window.benchmarkSelectHotel=selectHotel;
  window.VG?.events?.on?.('targets-rules:changed',()=>{if(typeof currentView!=='undefined'&&currentView==='benchmark')render();});
  window.VG?.events?.on?.('targets-rules:loaded',()=>{if(typeof currentView!=='undefined'&&currentView==='benchmark')render();});
})();
