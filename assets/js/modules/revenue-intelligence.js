
(function(){
'use strict';
const RI_MONTHS=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
let riCharts={};
function riN(v){ v=Number(v); return isFinite(v)?v:0; }
function riFmt(v,d=0){ if(v==null||!isFinite(v)) return '—'; return Number(v).toLocaleString('pt-PT',{minimumFractionDigits:d,maximumFractionDigits:d}); }
function riMoney(v){ if(v==null||!isFinite(v)) return '—'; if(window.VG?.market?.formatMoney)return window.VG.market.formatMoney(v,0,false); const s=v<0?'-':''; return s+'€'+Math.abs(v).toLocaleString('pt-PT',{maximumFractionDigits:0}); }
function riPct(v,d=1){ return v==null||!isFinite(v)?'—':riFmt(v,d)+'%'; }
function riNorm(s){ return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\b(VG|VILA|GALE|HOTEL|COLLECTION|C\.)\b/g,'').replace(/[^A-Z0-9]+/g,' ').trim(); }
function riShort(h){ return String(h||'').replace('COLLECTION ','C. '); }
function riDays(m){ return new Date(Number(typeof YR_CUR!=='undefined'?YR_CUR:2026), Number(m), 0).getDate(); }
function riRegionOf(h){
  try { if(typeof getHotelRegion==='function'){ const r=getHotelRegion(h); if(r) return r; } } catch(e){}
  const x=riNorm(h);
  if(['CASCAIS','ESTORIL','ERICEIRA','SINTRA','OPERA','PALACIO ARCOS','TOMAR','S MIGUEL','SANTA CRUZ'].some(t=>x.includes(t))) return 'lisboa';
  if(['PORTO','BRAGA','DOURO','COIMBRA','SERRA ESTRELA','PONTE LIMA','FIGUEIRA FOZ'].some(t=>x.includes(t))) return 'norte';
  if(['ALENTEJO','EVORA','ELVAS','ALTER REAL','MONTE VILAR'].some(t=>x.includes(t))) return 'alentejo';
  if(['ALBACORA','AMPALIUS','ATLANTICO','CERRO ALAGOA','LAGOS','MARINA','NAUTICO','TAVIRA','ISLA CANELA','PRAIA'].some(t=>x.includes(t))) return 'algarve';
  return 'outros';
}
function riRegionLabel(r){ return ({norte:'Norte/Centro',lisboa:'Lisboa/Ilhas',alentejo:'Alentejo',algarve:'Algarve',outros:'Outros'})[r]||r; }
function riHotelAllowed(h){
  const regSel=document.getElementById('riRegion')?.value||'active';
  if(regSel && regSel!=='active' && regSel!=='todos' && riRegionOf(h)!==regSel) return false;
  if(regSel==='active'){
    try{ if(typeof activeRegion!=='undefined' && activeRegion && activeRegion!=='todos' && typeof selectedHotels!=='undefined' && selectedHotels.size && !selectedHotels.has(h)) return false; }catch(e){}
  }
  const sel=document.getElementById('riHotel')?.value||'__all__';
  if(sel && sel!=='__all__' && h!==sel) return false;
  return true;
}
function riGetSnaps(){ try{return (OCC_SNAPSHOTS||[]).slice().sort((a,b)=>(a.loadedAt||a.id||0)-(b.loadedAt||b.id||0));}catch(e){return [];} }
function riYear(){ try{return Number(YR_CUR)||2026;}catch(e){return 2026;} }
function riPrevYear(){ try{return Number(YR_PREV)||2025;}catch(e){return 2025;} }
function riGetHotels(){ const snaps=riGetSnaps(); const latest=snaps[snaps.length-1]; return Object.keys(latest?.data||{}).sort(); }
function riInitControls(){
  const hSel=document.getElementById('riHotel'); const mSel=document.getElementById('riMonth'); if(!hSel||!mSel) return;
  const oldH=hSel.value||'__all__', oldM=mSel.value||String(new Date().getMonth()+1);
  const hotels=riGetHotels();
  hSel.innerHTML='<option value="__all__">Portefólio filtrado</option>'+hotels.map(h=>`<option value="${h}">${riShort(h)}</option>`).join('');
  if(hotels.includes(oldH)) hSel.value=oldH;
  mSel.innerHTML=RI_MONTHS.map((m,i)=>`<option value="${i+1}">${m}</option>`).join('');
  mSel.value = oldM && Number(oldM)>=1 && Number(oldM)<=12 ? oldM : '8';
}
function riGetRooms(h){
  try{
    const map=HOTEIS_XLSX||{}; const nh=riNorm(h);
    for(const [k,v] of Object.entries(map)){ const nk=riNorm(k+' '+(v?.nome||'')); if((nk&&nh&&(nk.includes(nh)||nh.includes(nk))) && Number(v?.totalQ)>0) return Number(v.totalQ); }
  }catch(e){}
  // fallback by available rooms in STORE for selected month
  try{ const m=Number(document.getElementById('riMonth')?.value||1); const d=STORE?.[m]?.hotels_ops?.[h]?.Disponiveis?.[String(riYear())] ?? STORE?.[m]?.hotels_ops?.[h]?.Disponiveis?.[riYear()]; if(d) return Math.round(Number(d)/riDays(m)); }catch(e){}
  return null;
}
function riADR(h,m){
  const y=String(riYear());
  try{
    const ops=STORE?.[Number(m)]?.hotels_ops?.[h];
    const direct=ops?.ADR?.[y] ?? ops?.ADR?.[riYear()]; if(Number(direct)>0) return Number(direct);
    const aloj=Number(ops?.['Receita Alojamento']?.[y] ?? ops?.['Receita Alojamento']?.[riYear()]);
    const occ=Number(ops?.Ocupados?.[y] ?? ops?.Ocupados?.[riYear()]);
    if(aloj>0 && occ>0) return aloj/occ;
  }catch(e){}
  try{ if(RAW?.hotels_ops?.[h]){ const ops=RAW.hotels_ops[h]; const a=Number(ops.ADR?.[y]??ops.ADR?.[riYear()]); if(a>0) return a; } }catch(e){}
  return null;
}
function riOccFromStore(h,m){
  const y=String(riYear());
  try{ const ops=STORE?.[Number(m)]?.hotels_ops?.[h]; const occ=Number(ops?.Ocupados?.[y]??ops?.Ocupados?.[riYear()]); const disp=Number(ops?.Disponiveis?.[y]??ops?.Disponiveis?.[riYear()]); if(disp>0) return occ/disp*100; }catch(e){}
  return null;
}
function riBuildRows(allMonths=false){
  const snaps=riGetSnaps(); if(snaps.length<1) return {rows:[],latest:null,prev:null,first:null};
  const latest=snaps[snaps.length-1];
  const prev=(document.getElementById('riCompare')?.value==='first') ? snaps[0] : snaps[Math.max(0,snaps.length-2)];
  const months=allMonths ? [...Array(12)].map((_,i)=>i+1) : [Number(document.getElementById('riMonth')?.value||1)];
  const year=String(riYear()), py=String(riPrevYear());
  const rows=[];
  riGetHotels().filter(riHotelAllowed).forEach(h=>{
    const rooms=riGetRooms(h); const reg=riRegionOf(h);
    months.forEach(m=>{
      const idx=m-1;
      const occNow=latest.data?.[h]?.[year]?.[idx] ?? latest.data?.[h]?.[riYear()]?.[idx];
      const occPrev=prev?.data?.[h]?.[year]?.[idx] ?? prev?.data?.[h]?.[riYear()]?.[idx];
      const occStly=latest.data?.[h]?.[py]?.[idx] ?? latest.data?.[h]?.[riPrevYear()]?.[idx];
      if(occNow==null || !isFinite(Number(occNow))) return;
      const delta = (occPrev!=null && isFinite(Number(occPrev))) ? Number(occNow)-Number(occPrev) : null;
      const adr=riADR(h,m); const rn = (rooms&&delta!=null) ? rooms*riDays(m)*(delta/100) : null;
      const impact = (rn!=null&&adr!=null) ? rn*adr : null;
      const paceDelta = occStly!=null ? Number(occNow)-Number(occStly) : null;
      rows.push({hotel:h, reg, month:m, monthLabel:RI_MONTHS[idx], rooms, occNow:Number(occNow), occPrev:occPrev!=null?Number(occPrev):null, delta, occStly:occStly!=null?Number(occStly):null, paceDelta, adr, rn, impact});
    });
  });
  return {rows,latest,prev,first:snaps[0]};
}
function riWeightedAvg(rows, valueFn, weightFn){
  let sw=0, sv=0, simple=[];
  (rows||[]).forEach(r=>{
    const v=Number(valueFn(r)); if(!isFinite(v)) return;
    simple.push(v);
    const w=Number(weightFn?weightFn(r):1);
    if(isFinite(w)&&w>0){ sw+=w; sv+=v*w; }
  });
  if(sw>0) return sv/sw;
  return simple.length ? simple.reduce((a,b)=>a+b,0)/simple.length : null;
}
function riPortfolioSeries(month){
  const snaps=riGetSnaps(); const y=String(riYear()), py=String(riPrevYear()); const idx=month-1;
  const hotels=riGetHotels().filter(riHotelAllowed);
  const weightedFor=(snap, yearKey, yearNum)=>{
    const rows=hotels.map(h=>({h,rooms:riGetRooms(h),v:snap.data?.[h]?.[yearKey]?.[idx]??snap.data?.[h]?.[yearNum]?.[idx]}));
    return riWeightedAvg(rows, r=>r.v, r=>r.rooms);
  };
  const vals=snaps.map(s=>weightedFor(s,y,riYear()));
  const stlyVals=snaps.map(s=>weightedFor(s,py,riPrevYear()));
  return {labels:snaps.map((s,i)=>s.label||('S'+(i+1))), vals, stlyVals};
}
function riRenderPace(){
  const el=document.getElementById('riChartPace'); if(!el || typeof Chart==='undefined') return;
  const m=Number(document.getElementById('riMonth')?.value||1); const s=riPortfolioSeries(m);
  if(riCharts.pace) riCharts.pace.destroy();
  riCharts.pace=new Chart(el,{type:'line',data:{labels:s.labels,datasets:[{label:String(riYear()),data:s.vals,borderColor:'#c9a84c',backgroundColor:'rgba(201,168,76,.12)',borderWidth:3,tension:.35,pointRadius:4,spanGaps:true},{label:'STLY '+String(riPrevYear()),data:s.stlyVals,borderColor:'#1e8a9a',backgroundColor:'rgba(30,138,154,.10)',borderWidth:2,borderDash:[5,5],tension:.25,pointRadius:3,spanGaps:true}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#94aabf'}}},scales:{y:{min:0,max:100,ticks:{callback:v=>v+'%',color:'#64748b'},grid:{color:'rgba(255,255,255,.06)'}},x:{ticks:{color:'#64748b'},grid:{color:'rgba(255,255,255,.04)'}}}}});
}
function riRenderImpact(rows){
  const el=document.getElementById('riChartImpact'); if(!el || typeof Chart==='undefined') return;
  const top=[...rows].filter(r=>r.impact!=null).sort((a,b)=>Math.abs(b.impact)-Math.abs(a.impact)).slice(0,12).reverse();
  if(riCharts.impact) riCharts.impact.destroy();
  riCharts.impact=new Chart(el,{type:'bar',data:{labels:top.map(r=>riShort(r.hotel)),datasets:[{label:'Impacto '+(window.VG?.market?.symbol?.()||'€'),data:top.map(r=>Math.round(r.impact)),backgroundColor:top.map(r=>r.impact>=0?'rgba(31,158,107,.55)':'rgba(192,57,43,.55)'),borderColor:top.map(r=>r.impact>=0?'#1f9e6b':'#c0392b'),borderWidth:1}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>riMoney(c.raw)}}},scales:{x:{ticks:{callback:v=>riMoney(v),color:'#64748b'},grid:{color:'rgba(255,255,255,.06)'}},y:{ticks:{color:'#94aabf',font:{size:10}},grid:{display:false}}}}});
}
function riRiskClass(r){
  if(r.occNow<60 && (r.delta==null || r.delta<=0)) return {level:'Alto', cls:'red', txt:'OCC baixa + pickup negativo/estagnado'};
  if(r.occNow<70 && (r.delta==null || r.delta<1)) return {level:'Médio', cls:'yellow', txt:'OCC baixa ou sem tração'};
  return {level:'Baixo', cls:'green', txt:'Tendência controlada'};
}
function riRenderTables(rows){
  const body=document.getElementById('riPickupBody');
  if(body){ body.innerHTML=[...rows].sort((a,b)=>Math.abs(b.impact||0)-Math.abs(a.impact||0)).map(r=>{ const risk=riRiskClass(r); return `<tr><td>${riShort(r.hotel)}</td><td>${riRegionLabel(r.reg)}</td><td>${riPct(r.occPrev)}</td><td>${riPct(r.occNow)}</td><td class="${(r.delta||0)>=0?'ri-good':'ri-bad'}">${r.delta!=null?(r.delta>=0?'+':'')+riFmt(r.delta,1):'—'}</td><td>${r.rn!=null?riFmt(r.rn,0):'—'}</td><td>${r.adr!=null?riMoney(r.adr):'—'}</td><td class="${(r.impact||0)>=0?'ri-good':'ri-bad'}">${riMoney(r.impact)}</td><td><span class="ri-pill ${risk.cls}">${risk.level}</span></td></tr>`; }).join(''); }
  const riskBody=document.getElementById('riRiskBody');
  if(riskBody){ const all=riBuildRows(true).rows.filter(r=>r.delta!=null).map(r=>({...r,risk:riRiskClass(r)})).filter(r=>r.risk.cls!=='green').sort((a,b)=>(a.risk.cls==='red'?-1:1)-(b.risk.cls==='red'?-1:1) || (a.occNow-b.occNow)).slice(0,25); riskBody.innerHTML=all.map(r=>`<tr><td>${riShort(r.hotel)}</td><td>${r.monthLabel}</td><td>${riPct(r.occNow)}</td><td class="${r.delta>=0?'ri-good':'ri-bad'}">${(r.delta>=0?'+':'')+riFmt(r.delta,1)}</td><td class="${(r.impact||0)>=0?'ri-good':'ri-bad'}">${riMoney(r.impact)}</td><td><span class="ri-pill ${r.risk.cls}">${r.risk.level}</span></td></tr>`).join('') || '<tr><td colspan="6">Sem riscos relevantes.</td></tr>'; }
  const regionBody=document.getElementById('riRegionBody');
  if(regionBody){ const m={}; rows.forEach(r=>{ const k=r.reg||'outros'; const w=(Number(r.rooms)>0?Number(r.rooms):1); if(!m[k]) m[k]={occW:0,w:0,deltaW:0,dw:0,rn:0,impact:0}; m[k].occW+=r.occNow*w;m[k].w+=w; if(r.delta!=null){m[k].deltaW+=r.delta*w;m[k].dw+=w;} if(r.rn!=null)m[k].rn+=r.rn; if(r.impact!=null)m[k].impact+=r.impact; }); regionBody.innerHTML=Object.entries(m).sort((a,b)=>(b[1].impact||0)-(a[1].impact||0)).map(([k,v])=>{ const o=v.w?v.occW/v.w:null, d=v.dw?v.deltaW/v.dw:null; return `<tr><td>${riRegionLabel(k)}</td><td>${riPct(o)}</td><td class="${(d||0)>=0?'ri-good':'ri-bad'}">${d!=null?((d>=0?'+':'')+riFmt(d,1)):'—'}</td><td>${riFmt(v.rn,0)}</td><td class="${v.impact>=0?'ri-good':'ri-bad'}">${riMoney(v.impact)}</td></tr>`; }).join(''); }
  riRenderBudget();
}
function riRenderBudget(){
  const body=document.getElementById('riBudgetBody'); if(!body) return;
  const rows=riBuildRows(false).rows.slice(0,80).map(r=>{ const b=riOccFromStore(r.hotel,r.month); const dev=b!=null?r.occNow-b:null; return {...r,budget:b,dev}; });
  body.innerHTML=rows.map(r=>`<tr><td>${riShort(r.hotel)}</td><td>${r.monthLabel}</td><td>${riPct(r.occNow)}</td><td>${riPct(r.budget)}</td><td class="${(r.dev||0)>=0?'ri-good':'ri-bad'}">${r.dev!=null?((r.dev>=0?'+':'')+riFmt(r.dev,1)):'—'}</td><td>${r.dev==null?'Sem previsão disponível':(r.dev>=0?'Acima da previsão':'Abaixo da previsão')}</td></tr>`).join('');
}
function riRenderKpis(rows, meta){
  const k=document.getElementById('riKpis'); if(!k) return;
  const totalRN=rows.reduce((s,r)=>s+(r.rn||0),0), totalImp=rows.reduce((s,r)=>s+(r.impact||0),0);
  const avgOcc=riWeightedAvg(rows,r=>r.occNow,r=>Number(r.rooms)||1);
  const avgPace=rows.filter(r=>r.paceDelta!=null); const pace=riWeightedAvg(avgPace,r=>r.paceDelta,r=>Number(r.rooms)||1);
  const risk=riBuildRows(true).rows.filter(r=>riRiskClass(r).cls==='red').length;
  k.innerHTML=[
    ['Pickup RN',riFmt(totalRN,0),`${meta.prevLabel} → ${meta.latestLabel}`,totalRN>=0?'ri-good':'ri-bad'],
    ['Impacto estimado',riMoney(totalImp),'Room nights × ADR P&L',totalImp>=0?'ri-good':'ri-bad'],
    ['Pace STLY',pace!=null?((pace>=0?'+':'')+riFmt(pace,1)+' pp'):'—','Atual vs mesmo mês de '+riPrevYear(),pace>=0?'ri-good':'ri-bad'],
    ['Casos de risco',riFmt(risk,0),'Hotel + mês com risco alto',risk>0?'ri-warn':'ri-good'],
  ].map(x=>`<div class="ri-kpi"><div class="ri-kpi-l">${x[0]}</div><div class="ri-kpi-v ${x[3]}">${x[1]}</div><div class="ri-kpi-s">${x[2]}</div></div>`).join('');
}
function riRenderSummary(rows, meta){
  const el=document.getElementById('riSummary'); if(!el) return;
  const totalRN=rows.reduce((s,r)=>s+(r.rn||0),0), totalImp=rows.reduce((s,r)=>s+(r.impact||0),0);
  const gains=[...rows].filter(r=>(r.rn||0)>0).sort((a,b)=>(b.rn||0)-(a.rn||0)).slice(0,3);
  const losses=[...rows].filter(r=>(r.rn||0)<0).sort((a,b)=>(a.rn||0)-(b.rn||0)).slice(0,3);
  const risks=riBuildRows(true).rows.map(r=>({...r,risk:riRiskClass(r)})).filter(r=>r.risk.cls==='red').slice(0,5);
  const signRN=totalRN>=0?'ganhou':'perdeu';
  el.textContent = `Entre ${meta.prevLabel} e ${meta.latestLabel}, o portefólio ${signRN} ${riFmt(Math.abs(totalRN),0)} room nights líquidas no mês selecionado.\nImpacto financeiro estimado: ${riMoney(totalImp)}.\n\nMaiores subidas: ${gains.length?gains.map(r=>`${riShort(r.hotel)} (+${riFmt(r.rn,0)} RN / ${riMoney(r.impact)})`).join(', '):'sem subidas relevantes'}.\nMaiores quedas: ${losses.length?losses.map(r=>`${riShort(r.hotel)} (${riFmt(r.rn,0)} RN / ${riMoney(r.impact)})`).join(', '):'sem quedas relevantes'}.\n\nHotéis/meses em risco alto: ${risks.length?risks.map(r=>`${riShort(r.hotel)} ${r.monthLabel} (${riPct(r.occNow)}, pickup ${r.delta!=null?riFmt(r.delta,1)+' pp':'—'})`).join(', '):'sem casos críticos detetados'}.`;
}

function riADRPrev(h,m){
  const y=riPrevYear();
  try{
    const monthly=STORE?.[Number(m)];
    const a=monthly ? adrOficial(h,y,monthly) : null;
    if(a!=null && a>0) return a;
  }catch(e){}
  try{
    const a=adrOficial(h,y,RAW);
    if(a!=null && a>0) return a;
  }catch(e){}
  return null;
}
function riTargetOcc(h,m){
  // v9: uma meta explícita por hotel/mês tem prioridade sobre qualquer fallback.
  try{
    if(typeof window.vgTargetValue==='function'){
      const explicit=window.vgTargetValue(h,'occupancy',Number(m),String(riYear()));
      if(explicit!=null && isFinite(Number(explicit))) return Math.max(0,Math.min(100,Number(explicit)));
    }
  }catch(e){}

  // Sem meta explícita: usa o acréscimo configurável sobre o ano anterior.
  // Se a regra RI estiver desativada ou não existir base LY, não inventa objetivo.
  let delta=2;
  try{
    if(typeof window.vgRuleConfig==='function'){
      const cfg=window.vgRuleConfig('ri_occ_delta');
      if(cfg && cfg.enabled===false) return null;
      if(cfg && isFinite(Number(cfg.value))) delta=Number(cfg.value);
    }
  }catch(e){}
  const idx = Number(m) - 1;
  const py = String(riPrevYear());
  const snaps = riGetSnaps();
  const latest = snaps && snaps.length ? snaps[snaps.length - 1] : null;
  let base = latest?.data?.[h]?.[py]?.[idx];
  if(base == null && latest?.data?.[h]?.[Number(py)]) base = latest.data[h][Number(py)][idx];
  if(base != null && isFinite(Number(base))) return Math.max(0, Math.min(100, Number(base) + delta));

  try{
    const monthly=STORE?.[Number(m)];
    const baseOcc=monthly ? occ(h,riPrevYear(),monthly) : null;
    if(baseOcc!=null && isFinite(baseOcc)) return Math.max(0, Math.min(100, baseOcc + delta));
  }catch(e){}
  try{
    const baseOcc=occ(h,riPrevYear(),RAW);
    if(baseOcc!=null && isFinite(baseOcc)) return Math.max(0, Math.min(100, baseOcc + delta));
  }catch(e){}
  return null;
}
function riTargetMethodLabel(){
  try{
    const cfg=typeof window.vgRuleConfig==='function'?window.vgRuleConfig('ri_occ_delta'):null;
    const d=cfg&&isFinite(Number(cfg.value))?Number(cfg.value):2;
    return `meta explícita ou ${riPrevYear()} + ${riFmt(d,1)} p.p.`;
  }catch(e){return `${riPrevYear()} + 2 p.p.`;}
}
function riWeeksLeft(m){
  const now=new Date(); const y=riYear(); const end=new Date(y, Number(m), 0);
  const diff=(end-now)/(1000*60*60*24*7);
  return Math.max(0, diff);
}
function riSnapTime(s, fallbackIndex){
  const raw = s?.ts ?? s?.loadedAt ?? s?.id ?? null;
  if(raw != null){
    const num=Number(raw);
    if(isFinite(num) && num>100000000000) return num;
    const parsed=Date.parse(raw);
    if(isFinite(parsed)) return parsed;
  }
  // Sem timestamp utilizável: assume snapshots semanais apenas como fallback.
  return Number(fallbackIndex||0) * 7 * 86400000;
}
function riTrendFor(h,m){
  const snaps=riGetSnaps(), y=String(riYear()), idx=Number(m)-1;
  const pts=snaps.map((s,i)=>({
    t:riSnapTime(s,i),
    v:Number(s.data?.[h]?.[y]?.[idx] ?? s.data?.[h]?.[riYear()]?.[idx])
  })).filter(p=>isFinite(p.v)&&isFinite(p.t));
  if(pts.length<2) return 0;
  const slopes=[];
  for(let i=1;i<pts.length;i++){
    const weeks=(pts[i].t-pts[i-1].t)/(7*86400000);
    if(weeks>0.05 && weeks<52) slopes.push((pts[i].v-pts[i-1].v)/weeks);
  }
  if(!slopes.length) return 0;
  const last=slopes.slice(-3);
  return last.reduce((a,b)=>a+b,0)/last.length; // pontos percentuais por semana
}
function riForecastFor(r){
  const trend=riTrendFor(r.hotel,r.month);
  const weeks=Math.max(0, Math.min(6, riWeeksLeft(r.month)));
  return {trend, forecast:Math.max(0,Math.min(100, r.occNow + trend*weeks))};
}
function riScoreUrgency(r){
  const occScore=Math.max(0,100-r.occNow)*0.55;
  const pickScore=Math.max(0,-(r.delta??0))*5.0;
  const paceScore=Math.max(0,-(r.paceDelta??0))*3.0;
  const nowM=new Date().getMonth()+1;
  const prox=Number(r.month)>=nowM ? Math.max(0, 14-(Number(r.month)-nowM)*2) : 4;
  return Math.round(Math.max(0, Math.min(100, occScore+pickScore+paceScore+prox)));
}
function riScoreClass(score){ return score>=70?'bad':score>=45?'warn':'good'; }
function riSetBody(id, html){ const el=document.getElementById(id); if(el) el.innerHTML=html || '<tr><td colspan="8">Sem dados relevantes.</td></tr>'; }
function riPill(txt,cls){ return `<span class="ri2-score ${cls}">${txt}</span>`; }
function riRenderAdvanced(){
  const built=riBuildRows(true);
  const all=built.rows.filter(r=>r.occNow!=null && isFinite(r.occNow));
  const selected=riBuildRows(false).rows.filter(r=>r.occNow!=null && isFinite(r.occNow));
  const rowsForMonth=selected.length?selected:all;

  // 1. Tariff Opportunity
  const tariff=all.map(r=>{const adrLY=riADRPrev(r.hotel,r.month); const pot=(r.occNow>=80 && r.adr!=null && adrLY!=null && r.adr<=adrLY) ? (adrLY-r.adr)*Math.max(0,(r.rooms||0)*riDays(r.month)*r.occNow/100) : 0; return {...r,adrLY,pot};})
    .filter(r=>r.pot>0).sort((a,b)=>b.pot-a.pot).slice(0,15);
  riSetBody('riTariffBody', tariff.map(r=>`<tr><td>${riShort(r.hotel)}</td><td>${r.monthLabel}</td><td>${riPct(r.occNow)}</td><td>${riMoney(r.adr)}</td><td>${riMoney(r.adrLY)}</td><td class="ri-good">${riMoney(r.pot)}</td></tr>`).join(''));

  // 2. Urgency
  const urgency=all.map(r=>({...r,score:riScoreUrgency(r)})).sort((a,b)=>b.score-a.score).slice(0,20);
  riSetBody('riUrgencyBody', urgency.map(r=>`<tr><td>${riShort(r.hotel)}</td><td>${r.monthLabel}</td><td>${riPct(r.occNow)}</td><td class="${(r.delta||0)>=0?'ri-good':'ri-bad'}">${r.delta!=null?(r.delta>=0?'+':'')+riFmt(r.delta,1):'—'}</td><td class="${(r.paceDelta||0)>=0?'ri-good':'ri-bad'}">${r.paceDelta!=null?(r.paceDelta>=0?'+':'')+riFmt(r.paceDelta,1):'—'}</td><td>${riPill(r.score,riScoreClass(r.score))}</td></tr>`).join(''));

  // 3. Recovery Lead Time
  const recovery=all.map(r=>{const target=riTargetOcc(r.hotel,r.month); const gap=target==null?null:Math.max(0,target-r.occNow); const ppw=gap==null?null:gap/riWeeksLeft(r.month); return {...r,target,gap,ppw};}).filter(r=>r.target!=null&&r.gap>0).sort((a,b)=>b.ppw-a.ppw).slice(0,20);
  riSetBody('riRecoveryBody', recovery.map(r=>`<tr><td>${riShort(r.hotel)}</td><td>${r.monthLabel}</td><td>${riPct(r.occNow)}</td><td>${riPct(r.target)}</td><td class="ri-bad">${riFmt(r.gap,1)} pp</td><td>${riPill(riFmt(r.ppw,1), r.ppw>4?'bad':r.ppw>2?'warn':'good')}</td></tr>`).join(''));

  // 4. Risk Calendar
  const months=[...Array(12)].map((_,i)=>i+1);
  const hlist=[...new Set(all.map(r=>r.hotel))].slice(0,35);
  const head=document.getElementById('riCalendarHead'); if(head) head.innerHTML='<tr><th>Hotel</th>'+months.map(m=>`<th>${RI_MONTHS[m-1]}</th>`).join('')+'</tr>';
  const byKey=new Map(all.map(r=>[r.hotel+'|'+r.month,r]));
  const cal=hlist.map(h=>`<tr><td>${riShort(h)}</td>`+months.map(m=>{const r=byKey.get(h+'|'+m); if(!r) return '<td>—</td>'; const rc=riRiskClass(r); return `<td><span class="ri-pill ${rc.cls}" title="${rc.txt}">${rc.cls==='red'?'🔴':rc.cls==='yellow'?'🟡':'🟢'}</span></td>`;}).join('')+'</tr>').join('');
  riSetBody('riCalendarBody', cal);

  // 5. Forecast
  const forecast=rowsForMonth.map(r=>({...r,...riForecastFor(r)})).sort((a,b)=>a.forecast-b.forecast).slice(0,20);
  riSetBody('riForecastBody', forecast.map(r=>{const cls=r.forecast>=85?'good':r.forecast>=70?'warn':'bad'; return `<tr><td>${riShort(r.hotel)}</td><td>${r.monthLabel}</td><td>${riPct(r.occNow)}</td><td class="${r.trend>=0?'ri-good':'ri-bad'}">${(r.trend>=0?'+':'')+riFmt(r.trend,1)} pp/sem.</td><td>${riPill(riPct(r.forecast),cls)}</td><td>${r.forecast>=85?'fecho confortável':r.forecast>=70?'acompanhar':'ação comercial'}</td></tr>`;}).join(''));

  // 6. Elasticity
  const elasticity=all.map(r=>{const adrLY=riADRPrev(r.hotel,r.month); const adrYoY=(r.adr!=null&&adrLY>0)?(r.adr-adrLY)/adrLY*100:null; const occYoY=r.paceDelta; let leitura='Sem leitura'; let cls='warn'; if(adrYoY!=null&&occYoY!=null){ if(adrYoY>0&&occYoY>=0){leitura='Há margem: ADR sobe sem perder OCC';cls='good';} else if(adrYoY>0&&occYoY<0){leitura='Sensibilidade preço: OCC cede com ADR';cls='bad';} else if(adrYoY<=0&&occYoY>0){leitura='Volume comprado por preço';cls='warn';} else {leitura='Pressão dupla: ADR e OCC abaixo';cls='bad';} } return {...r,adrYoY,occYoY,leitura,cls};}).filter(r=>r.adrYoY!=null&&r.occYoY!=null).sort((a,b)=>Math.abs(b.occYoY)-Math.abs(a.occYoY)).slice(0,20);
  riSetBody('riElasticityBody', elasticity.map(r=>`<tr><td>${riShort(r.hotel)}</td><td>${r.monthLabel}</td><td class="${r.adrYoY>=0?'ri-good':'ri-bad'}">${(r.adrYoY>=0?'+':'')+riFmt(r.adrYoY,1)}%</td><td class="${r.occYoY>=0?'ri-good':'ri-bad'}">${(r.occYoY>=0?'+':'')+riFmt(r.occYoY,1)} pp</td><td>${riPill(r.leitura,r.cls)}</td></tr>`).join(''));

  // 7. Anomalies
  const anomalies=[];
  all.forEach(r=>{ if(r.delta!=null && Math.abs(r.delta)>=5) anomalies.push({...r,alerta:r.delta<0?'Queda forte de OCC':'Subida anormal de OCC',valor:(r.delta>=0?'+':'')+riFmt(r.delta,1)+' pp'}); if(r.rn!=null && r.rn<=-100) anomalies.push({...r,alerta:'Perda relevante de RN',valor:riFmt(r.rn,0)+' RN'}); if(r.impact!=null && r.impact<=-10000) anomalies.push({...r,alerta:'Impacto financeiro negativo',valor:riMoney(r.impact)}); });
  riSetBody('riAnomalyBody', anomalies.sort((a,b)=>Math.abs(b.impact||0)-Math.abs(a.impact||0)).slice(0,25).map(r=>`<tr><td>${riShort(r.hotel)}</td><td>${r.monthLabel}</td><td>${r.alerta}</td><td class="${(r.delta||r.rn||r.impact||0)>=0?'ri-good':'ri-bad'}">${r.valor}</td><td class="${(r.impact||0)>=0?'ri-good':'ri-bad'}">${riMoney(r.impact)}</td></tr>`).join(''));

  // 8. Top Euro Opportunities
  const euroOpp=all.map(r=>{const target=riTargetOcc(r.hotel,r.month); const gap=target==null?null:Math.max(0,target-r.occNow); const rnPot=(r.rooms&&gap>0)?r.rooms*riDays(r.month)*gap/100:0; const eurPot=(r.adr&&rnPot)?rnPot*r.adr:0; return {...r,target,gap,rnPot,eurPot};}).filter(r=>r.target!=null&&r.eurPot>0).sort((a,b)=>b.eurPot-a.eurPot).slice(0,20);
  riSetBody('riEuroOppBody', euroOpp.map(r=>`<tr><td>${riShort(r.hotel)}</td><td>${r.monthLabel}</td><td>${riFmt(r.gap,1)} pp</td><td>${riFmt(r.rnPot,0)}</td><td class="ri-good">${riMoney(r.eurPot)}</td></tr>`).join(''));

  // 9. Peer Benchmark
  const pairs=[['CASCAIS','ESTORIL'],['COLLECTION SINTRA','COLLECTION PALACIO DOS ARCOS'],['PORTO','PORTO RIBEIRA'],['LAGOS','MARINA'],['AMPALIUS','ATLANTICO'],['COLLECTION BRAGA','COLLECTION DOURO'],['ALENTEJO VINEYARDS','EVORA'],['ERICEIRA','OPERA']];
  const month=Number(document.getElementById('riMonth')?.value||1);
  const byHotel=new Map(riBuildRows(false).rows.map(r=>[riNorm(r.hotel),r]));
  const findPeer=name=>{const nn=riNorm(name); for(const [k,v] of byHotel.entries()){ if(k.includes(nn)||nn.includes(k)) return v; } return null;};
  const peerRows=pairs.map(([a,b])=>[findPeer(a),findPeer(b)]).filter(([a,b])=>a&&b).map(([a,b])=>{const occBest=a.occNow>=b.occNow?a:b; const adrBest=(a.adr||0)>=(b.adr||0)?a:b; let leitura=occBest.hotel===adrBest.hotel?'Um hotel lidera OCC e ADR':'Há trade-off entre preço e volume'; return {a,b,occBest,adrBest,leitura};});
  riSetBody('riPeerBody', peerRows.map(p=>`<tr><td>${riShort(p.a.hotel)} vs ${riShort(p.b.hotel)}</td><td>${riShort(p.occBest.hotel)} (${riPct(p.occBest.occNow)})</td><td>${riShort(p.adrBest.hotel)} (${riMoney(p.adrBest.adr)})</td><td>${p.leitura}</td></tr>`).join(''));

  // 10. Action Plan
  const actions=all.map(r=>{const score=riScoreUrgency(r); const f=riForecastFor(r); const target=riTargetOcc(r.hotel,r.month); const gap=target==null?null:Math.max(0,target-r.occNow); let sit='',act='',prio='Baixa',cls='good'; if(r.occNow>=85 && r.adr!=null && riADRPrev(r.hotel,r.month)!=null && r.adr<=riADRPrev(r.hotel,r.month)){sit='Alta ocupação com ADR sem evolução';act='Testar subida tarifária, fechar descontos e rever restrições.';prio='Média';cls='warn';} else if(score>=70){sit='Risco comercial alto';act='Abrir campanha tática, reforçar direto/OTA, rever allotments e validar grupos cancelados.';prio='Alta';cls='bad';} else if(gap!=null && gap>10 && f.forecast<target){sit='Abaixo do objetivo';act='Plano comercial por segmento, campanha curta e revisão de pricing por dia da semana.';prio='Média';cls='warn';} else if(r.delta!=null && r.delta<0){sit='Pickup negativo';act='Analisar cancelamentos, restrições, canais e alterações de tarifa desde o snapshot anterior.';prio='Média';cls='warn';} else {sit='Controlado';act='Manter monitorização e proteger ADR.';prio='Baixa';cls='good';} return {...r,score,sit,act,prio,cls};}).sort((a,b)=>riScoreUrgency(b)-riScoreUrgency(a)).slice(0,25);
  riSetBody('riActionBody', actions.map(r=>`<tr><td>${riShort(r.hotel)}</td><td>${r.monthLabel}</td><td>${r.sit}</td><td>${r.act}</td><td>${riPill(r.prio,r.cls)}</td></tr>`).join(''));
}


let riRadarChart=null;
function riGetPortfolioAdr(m){ const rows=riBuildRows(true).rows.filter(r=>Number(r.month)===Number(m)&&r.adr); return riWeightedAvg(rows, r=>r.adr, r=>(Number(r.rooms)||0)*riDays(r.month)*(Number(r.occNow)||0)/100); }
function riGetGop(h){
  try{
    if(typeof gopComSede==='function'){ const v=gopComSede(h,String(riYear()),RAW); if(v!=null&&isFinite(Number(v))) return Number(v); }
    const ops=RAW?.hotels_ops?.[h]||{};
    const g=ops['GOP COM SEDE']||ops['GOP SEM SEDE']||ops['GOP']||null;
    if(g){ const v=g[String(riYear())] ?? g.YR_CUR ?? g[riYear()]; if(v!=null&&isFinite(Number(v))) return Number(v); }
    if(typeof gop==='function'){ const v=gop(h,String(riYear()),RAW); if(v!=null&&isFinite(Number(v))) return Number(v); }
  }catch(e){}
  return null;
}
function riRevpar(r){ return (r.adr&&r.occNow!=null)?r.adr*r.occNow/100:null; }
function riRevenueRiskRows(){
  return riBuildRows(true).rows.filter(r=>r.occNow!=null).map(r=>{
    const target=riTargetOcc(r.hotel,r.month);
    const forecast=riForecastFor(r).forecast;
    if(target==null || forecast==null) return {...r,target,forecast,gap:null,rnRisk:0,eurRisk:0};
    const gap=Math.max(0,target-forecast);
    const rnRisk=(r.rooms||0)*riDays(r.month)*gap/100;
    const eurRisk=rnRisk*(r.adr||0);
    return {...r,target,forecast,gap,rnRisk,eurRisk};
  }).filter(r=>r.target!=null&&r.eurRisk>0).sort((a,b)=>b.eurRisk-a.eurRisk);
}
function riRenderRevenueRisk(){
  const rows=riRevenueRiskRows().slice(0,25);
  riSetBody('riRevenueRiskBody', rows.map(r=>`<tr><td>${riShort(r.hotel)}</td><td>${r.monthLabel}</td><td>${riPct(r.occNow)}</td><td>${riPct(r.forecast)}</td><td>${riPct(r.target)}</td><td>${riFmt(r.rnRisk,0)}</td><td class="ri-bad">${riMoney(r.eurRisk)}</td></tr>`).join(''));
}
function riLastMinuteIndex(r){
  const snaps=riGetSnaps(); if(snaps.length<3) return null;
  const vals=snaps.map(s=>s.data?.[r.hotel]?.[riYear()]?.[Number(r.month)-1]).filter(v=>v!=null&&isFinite(v));
  if(vals.length<3) return null;
  const total=vals[vals.length-1]-vals[0];
  const recent=vals[vals.length-1]-vals[vals.length-2];
  if(Math.abs(total)<0.1) return recent>0?100:0;
  return Math.max(0,Math.min(100,Math.abs(recent/total)*100));
}
function riRenderLastMinute(){
  const rows=riBuildRows(true).rows.filter(r=>r.occNow!=null).map(r=>{
    const snaps=riGetSnaps(); const vals=snaps.map(s=>s.data?.[r.hotel]?.[riYear()]?.[Number(r.month)-1]).filter(v=>v!=null&&isFinite(v));
    const recent=vals.length>=2?vals[vals.length-1]-vals[vals.length-2]:null; const total=vals.length>=2?vals[vals.length-1]-vals[0]:null; const idx=riLastMinuteIndex(r);
    const leitura=idx==null?'Sem histórico':idx>=70?'Dependência elevada':idx>=40?'Dependência média':'Venda antecipada/estável';
    const cls=idx==null?'warn':idx>=70?'bad':idx>=40?'warn':'good';
    return {...r,recent,total,idx,leitura,cls};
  }).filter(r=>r.idx!=null).sort((a,b)=>b.idx-a.idx).slice(0,25);
  riSetBody('riLastMinuteBody', rows.map(r=>`<tr><td>${riShort(r.hotel)}</td><td>${r.monthLabel}</td><td class="${(r.recent||0)>=0?'ri-good':'ri-bad'}">${r.recent!=null?(r.recent>=0?'+':'')+riFmt(r.recent,1)+' pp':'—'}</td><td>${r.total!=null?(r.total>=0?'+':'')+riFmt(r.total,1)+' pp':'—'}</td><td>${riPill(riFmt(r.idx,0)+'%',r.cls)}</td><td>${r.leitura}</td></tr>`).join(''));
}
function riLoadEvents(){ return RI_SHARED_EVENTS || ''; }
async function riSaveEvents(){ const el=document.getElementById('riEventsInput'); if(!el) return; RI_SHARED_EVENTS=el.value||''; const ok=await sharedSaveRevenueEvents(RI_SHARED_EVENTS); riRenderEvents(); showToast(ok?'✓ Eventos partilhados guardados':'⚠ Não foi possível sincronizar os eventos', !ok); }
function riParseEvents(){
  const raw=riLoadEvents();
  return raw.split(/\n+/).map(line=>line.trim()).filter(Boolean).map(line=>{
    const parts=line.split('|').map(x=>x.trim());
    const date=parts[0]||''; const scope=(parts[1]||'Portefólio').toUpperCase(); const event=parts[2]||parts.slice(2).join(' | ')||line; const impact=parts[3]||'';
    const m=(date.match(/\d{4}-(\d{2})-\d{2}/)||[])[1];
    return {date,scope,event,impact,month:m?Number(m):null};
  });
}

function riCancellationRows(){
  const rows = riActionableRows(riBuildRows(true).rows || []);
  return rows.filter(r => r.delta != null && isFinite(r.delta) && r.delta < 0).map(r => {
    const rnLost = Math.max(0, -(Number(r.rn)||0));
    const eurLost = Math.max(0, -(Number(r.impact)||0));
    return {...r, rnLost, eurLost};
  }).filter(r => r.rnLost > 0 || r.eurLost > 0 || r.delta < 0);
}
function riCancelReading(eur, rn, affected){
  if(eur >= 50000 || rn >= 300) return 'Perda relevante — validar origem: cancelamentos, grupos, inventário e canais.';
  if(eur >= 15000 || rn >= 100) return 'Atenção — confirmar origem da quebra.';
  if(affected >= 3) return 'Perda dispersa — monitorizar tendência.';
  return 'Impacto limitado — acompanhar.';
}
function riRenderCancellations(){
  const rows = riCancellationRows();
  const hotelBody = document.getElementById('riCancelHotelBody');
  const monthBody = document.getElementById('riCancelMonthBody');
  if(hotelBody){
    const byHotel = new Map();
    rows.forEach(r=>{
      const k=r.hotel;
      if(!byHotel.has(k)) byHotel.set(k,{hotel:k, months:new Set(), rn:0, eur:0, items:0});
      const x=byHotel.get(k); x.months.add(r.monthLabel); x.rn+=r.rnLost||0; x.eur+=r.eurLost||0; x.items++;
    });
    const arr=[...byHotel.values()].sort((a,b)=>(b.eur-a.eur)||(b.rn-a.rn)).slice(0,30);
    hotelBody.innerHTML = arr.length ? arr.map(x=>`<tr><td>${riShort(x.hotel)}</td><td>${[...x.months].join(', ')}</td><td class="ri-bad">${riFmt(x.rn,0)}</td><td class="ri-bad">${riMoney(x.eur)}</td><td>${riCancelReading(x.eur,x.rn,x.months.size)}</td></tr>`).join('') : '<tr><td colspan="5">Sem perdas de room nights nos meses atuais/futuros entre os snapshots comparados.</td></tr>';
  }
  if(monthBody){
    const byMonth = new Map();
    rows.forEach(r=>{
      const k=Number(r.month);
      if(!byMonth.has(k)) byMonth.set(k,{month:k, label:r.monthLabel, hotels:new Set(), rn:0, eur:0});
      const x=byMonth.get(k); x.hotels.add(r.hotel); x.rn+=r.rnLost||0; x.eur+=r.eurLost||0;
    });
    const arr=[...byMonth.values()].sort((a,b)=>a.month-b.month);
    monthBody.innerHTML = arr.length ? arr.map(x=>`<tr><td>${x.label}</td><td>${x.hotels.size}</td><td class="ri-bad">${riFmt(x.rn,0)}</td><td class="ri-bad">${riMoney(x.eur)}</td><td>${riCancelReading(x.eur,x.rn,x.hotels.size)}</td></tr>`).join('') : '<tr><td colspan="5">Sem perdas de room nights nos meses atuais/futuros entre os snapshots comparados.</td></tr>';
  }
}

function riRenderEvents(){
  const input=document.getElementById('riEventsInput'); if(input && !input.value) input.value=riLoadEvents();
  const events=riParseEvents();
  if(!events.length){ riSetBody('riEventsBody','<tr><td colspan="7">Sem eventos registados. Pode inserir eventos no campo acima.</td></tr>'); return; }
  const rows=riBuildRows(true).rows;
  const html=events.map(ev=>{
    const candidates=rows.filter(r=>(!ev.month||Number(r.month)===ev.month) && (ev.scope==='PORTEFÓLIO'||ev.scope==='PORTFOLIO'||riNorm(r.hotel).includes(riNorm(ev.scope))||riRegionLabel(riRegionOf(r.hotel)).toUpperCase().includes(ev.scope)||riRegionOf(r.hotel).toUpperCase().includes(ev.scope.toLowerCase())));
    const avgOcc=candidates.length?candidates.reduce((s,r)=>s+riN(r.occNow),0)/candidates.length:null;
    const avgPick=candidates.length?candidates.reduce((s,r)=>s+riN(r.delta),0)/candidates.length:null;
    let acao='Validar preços/restrições'; if(avgOcc!=null&&avgOcc>85) acao='Proteger ADR e fechar descontos'; else if(avgOcc!=null&&avgOcc<65) acao='Campanha e reforço de canais';
    return `<tr><td>${ev.date}</td><td>${ev.scope}</td><td>${ev.event}${ev.impact?' · '+ev.impact:''}</td><td>${ev.month?RI_MONTHS[ev.month-1]:'—'}</td><td>${riPct(avgOcc)}</td><td class="${(avgPick||0)>=0?'ri-good':'ri-bad'}">${avgPick!=null?(avgPick>=0?'+':'')+riFmt(avgPick,1)+' pp':'—'}</td><td>${acao}</td></tr>`;
  }).join('');
  riSetBody('riEventsBody', html);
}
function riRenderRadar(){
  const canvas=document.getElementById('riRadarChart');
  if(!canvas||typeof Chart==='undefined') return;

  const month = Number(document.getElementById('riMonth')?.value||1);
  const selectedHotel = document.getElementById('riHotel')?.value || '__all__';
  const rows = riBuildRows(false).rows.filter(r=>r.occNow!=null && isFinite(r.occNow));
  if(!rows.length) return;

  const allMonth = rows.filter(x=>Number(x.month)===month && x.occNow!=null && isFinite(x.occNow));
  const avg = (arr, fn) => {
    const a = arr.map(fn).filter(v=>v!=null && isFinite(v));
    return a.length ? a.reduce((s,v)=>s+v,0)/a.length : null;
  };

  const portfolioBase = {
    hotel: 'Portefólio filtrado',
    occNow: riWeightedAvg(allMonth, x=>x.occNow, x=>Number(x.rooms)||1),
    adr: riWeightedAvg(allMonth, x=>x.adr, x=>(Number(x.rooms)||0)*riDays(x.month)*(Number(x.occNow)||0)/100),
    adrNet: riWeightedAvg(allMonth, x=>x.adrNet||x.adr, x=>(Number(x.rooms)||0)*riDays(x.month)*(Number(x.occNow)||0)/100),
    revpar: riWeightedAvg(allMonth, x=>riRevpar(x), x=>Number(x.rooms)||1),
    gop: allMonth.reduce((sum,x)=>sum+(Number(riGetGop(x.hotel))||0),0),
    paceDelta: riWeightedAvg(allMonth, x=>x.paceDelta, x=>Number(x.rooms)||1)
  };

  const makeScores = (base, compareRows) => {
    const adrAvg = riWeightedAvg(compareRows, x=>x.adr, x=>(Number(x.rooms)||0)*riDays(x.month)*(Number(x.occNow)||0)/100);
    const adrNetAvg = riWeightedAvg(compareRows, x=>x.adrNet||x.adr, x=>(Number(x.rooms)||0)*riDays(x.month)*(Number(x.occNow)||0)/100);
    const revAvg = riWeightedAvg(compareRows, x=>riRevpar(x), x=>Number(x.rooms)||1);
    const gopAvg = avg(compareRows, x=>riGetGop(x.hotel));
    const paceAvg = riWeightedAvg(compareRows, x=>x.paceDelta, x=>Number(x.rooms)||1);
    const rev = base.revpar!=null ? base.revpar : riRevpar(base);
    const gop = base.gop!=null ? base.gop : riGetGop(base.hotel);
    const score = (val, ref) => (ref && val!=null && isFinite(val)) ? Math.max(0, Math.min(140, val/ref*100)) : 50;
    return [
      base.occNow!=null ? Math.max(0,Math.min(140,base.occNow)) : 50,
      score(base.adr, adrAvg),
      score(base.adrNet||base.adr, adrNetAvg||adrAvg),
      score(rev, revAvg),
      score(gop, gopAvg),
      (base.paceDelta!=null && paceAvg!=null) ? Math.max(0,Math.min(140,100+(base.paceDelta-paceAvg)*4)) : 50
    ];
  };

  let datasets=[];
  const baseRowsForComparison = riBuildRows(true).rows.filter(x=>Number(x.month)===month && x.occNow!=null && isFinite(x.occNow));

  if(selectedHotel && selectedHotel !== '__all__'){
    const r = rows.find(x=>x.hotel===selectedHotel) || rows[0];
    datasets.push({label:riShort(r.hotel),data:makeScores(r,baseRowsForComparison),fill:true});
    datasets.push({label:'Média portefólio',data:makeScores(portfolioBase,baseRowsForComparison),fill:false,borderDash:[5,5],pointRadius:2});
  } else {
    datasets.push({label:'Portefólio filtrado',data:makeScores(portfolioBase,baseRowsForComparison),fill:true});
  }

  if(riRadarChart) riRadarChart.destroy();
  riRadarChart=new Chart(canvas,{
    type:'radar',
    data:{labels:['OCC','ADR','ADR NET','RevPAR','GOP','Pace'],datasets},
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{legend:{display:true}},
      scales:{r:{beginAtZero:true,suggestedMax:120,ticks:{display:false}}}
    }
  });
}
function riReadSimNumber(id, fallback=0){
  const el=document.getElementById(id);
  if(!el) return fallback;
  const raw=String(el.value ?? '').trim().replace(/\s/g,'').replace('%','').replace(',', '.');
  const v=Number(raw);
  return isFinite(v) ? v : fallback;
}
function riSimulatorRows(){
  const month=Number(document.getElementById('riMonth')?.value||1);
  const hotel=document.getElementById('riHotel')?.value||'__all__';
  let rows=riBuildRows(false).rows.filter(r=>r.occNow!=null && isFinite(r.occNow) && r.adr!=null && isFinite(r.adr));
  rows=rows.filter(r=>Number(r.month)===month);
  if(hotel && hotel!=='__all__') rows=rows.filter(r=>r.hotel===hotel);
  return rows;
}
function riBindSimulatorInputs(){
  ['riSimAdr','riSimOcc','riSimGop','riHotel','riMonth','riRegion','riCompare'].forEach(id=>{
    const el=document.getElementById(id);
    if(el && !el.dataset.riSimBound){
      ['input','change','keyup'].forEach(ev=>el.addEventListener(ev,()=>{ try{riRenderSimulator();}catch(e){console.error('RI simulator refresh',e);} }));
      el.dataset.riSimBound='1';
    }
  });
}
function riRenderSimulator(){
  const el=document.getElementById('riSimulatorResult'); if(!el) return;
  riBindSimulatorInputs();
  const rows=riSimulatorRows();
  if(!rows.length){el.innerHTML='Sem dados para simular neste filtro/mês.';return;}
  const adrPct=riReadSimNumber('riSimAdr',0)/100;
  const occPp=riReadSimNumber('riSimOcc',0);
  const gopPct=riReadSimNumber('riSimGop',0)/100;
  const base=rows.reduce((s,r)=>s+(Number(r.rooms)||0)*riDays(r.month)*(Number(r.occNow)||0)/100*(Number(r.adr)||0),0);
  const sim=rows.reduce((s,r)=>{
    const rooms=Number(r.rooms)||0;
    const days=riDays(r.month);
    const occ=Math.max(0,Math.min(100,(Number(r.occNow)||0)+occPp));
    const adr=(Number(r.adr)||0)*(1+adrPct);
    return s + rooms*days*occ/100*adr;
  },0);
  const diff=sim-base;
  const label=(document.getElementById('riHotel')?.value||'__all__')==='__all__' ? `Portefólio filtrado · ${rows.length} hotéis` : riShort(rows[0]?.hotel||'Hotel');
  el.innerHTML=`<div><strong>Base usada:</strong> ${label}</div><div><strong>Receita base:</strong> ${riMoney(base)}</div><div><strong>Receita simulada:</strong> ${riMoney(sim)}</div><div><strong>Impacto estimado:</strong> <span class="${diff>=0?'ri-good':'ri-bad'}">${riMoney(diff)}</span></div><div><strong>Impacto GOP estimado:</strong> <span class="${diff>=0?'ri-good':'ri-bad'}">${riMoney(diff*gopPct)}</span></div><div style="margin-top:8px;color:var(--text-3);font-size:12px">Cálculo: OCC atual ${occPp>=0?'+':''}${riFmt(occPp,1)} pp · ADR ${adrPct>=0?'+':''}${riFmt(adrPct*100,1)}% · GOP ${riFmt(gopPct*100,1)}%</div>`;
}
function riConfidenceFor(r){
  const snaps=riGetSnaps(); const vals=snaps.map(s=>s.data?.[r.hotel]?.[riYear()]?.[Number(r.month)-1]).filter(v=>v!=null&&isFinite(v));
  if(vals.length<2) return {conf:30,vol:0,label:'Pouco histórico',cls:'bad'};
  const diffs=[]; for(let i=1;i<vals.length;i++) diffs.push(vals[i]-vals[i-1]);
  const avg=diffs.reduce((s,v)=>s+v,0)/diffs.length;
  const vol=Math.sqrt(diffs.reduce((s,v)=>s+Math.pow(v-avg,2),0)/diffs.length);
  let conf=45 + Math.min(30, vals.length*4) - Math.min(35, vol*8);
  const nowM=new Date().getMonth()+1; if(Number(r.month)<nowM) conf-=10; if(Number(r.month)===nowM) conf+=5;
  conf=Math.max(10,Math.min(95,Math.round(conf)));
  const cls=conf>=75?'good':conf>=55?'warn':'bad';
  const label=conf>=75?'Alta':conf>=55?'Média':'Baixa';
  return {conf,vol,label,cls};
}
function riRenderConfidence(){
  const rows=riBuildRows(true).rows.filter(r=>r.occNow!=null).map(r=>({...r,...riForecastFor(r),...riConfidenceFor(r)})).sort((a,b)=>a.conf-b.conf).slice(0,30);
  riSetBody('riConfidenceBody', rows.map(r=>`<tr><td>${riShort(r.hotel)}</td><td>${r.monthLabel}</td><td>${riPct(r.forecast)}</td><td>${riPill(r.conf+'%',r.cls)}</td><td>${riFmt(r.vol,1)} pp</td><td>${r.label}</td></tr>`).join(''));
}


function riActionStartMonth(){
  const now=new Date();
  const y=riYear();
  const cy=now.getFullYear();
  if(y<cy) return 13;
  if(y>cy) return 1;
  return now.getMonth()+1;
}
function riIsActionableMonth(m){
  const mm=Number(m);
  return mm>=riActionStartMonth() && mm<=12;
}
function riDaysToMonth(m){
  const now=new Date();
  const y=riYear();
  const mm=Number(m);
  if(!riIsActionableMonth(mm)) return null;
  const start=new Date(y, mm-1, 1);
  const today=new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if(y===now.getFullYear() && mm===now.getMonth()+1) return 0;
  return Math.max(0, Math.ceil((start - today)/86400000));
}
function riDaysLabel(m){
  const d=riDaysToMonth(m);
  if(d==null) return '—';
  if(d===0) return 'Mês atual';
  return d+' dias';
}
function riActionableRows(rows){
  return (rows||[]).filter(r=>riIsActionableMonth(r.month));
}

function riActionRecommendation(r){
  const f=riForecastFor(r); const target=riTargetOcc(r.hotel,r.month); const gap=target==null?null:target-(f.forecast??r.occNow);
  if((r.occNow||0)>=88 && (r.adr||0)>0) return 'Proteger ADR, fechar descontos e rever restrições.';
  if(gap!=null && gap>10 && (r.delta??0)<=0) return 'Campanha imediata, reforço direto/OTA e revisão de tarifas.';
  if(gap!=null && gap>6) return 'Acelerar venda: promoção controlada, grupos e canais com maior conversão.';
  if((r.paceDelta??0)<-5) return 'Comparar com STLY, identificar datas fracas e rever inventário/preço.';
  if((r.delta??0)>3) return 'Manter estratégia, monitorizar ADR e evitar desconto excessivo.';
  return 'Monitorizar e validar eventos, grupos e restrições.';
}
function riRevenueAtRiskFor(r){
  const target=riTargetOcc(r.hotel,r.month);
  const forecast=riForecastFor(r).forecast;
  if(target==null || forecast==null) return {target,forecast,gap:null,rn:0,eur:0};
  const gap=Math.max(0,target-forecast);
  const rn=(Number(r.rooms)||0)*riDays(r.month)*gap/100;
  const eur=rn*(Number(r.adr)||0);
  return {target,forecast,gap,rn,eur};
}
function riRenderActionCenter(){
  const all=riActionableRows(riBuildRows(true).rows).filter(r=>r.occNow!=null && isFinite(r.occNow));
  const rows=all.map(r=>{const risk=riRevenueAtRiskFor(r); const urg=riScoreUrgency(r); const f=riForecastFor(r); const days=riDaysToMonth(r.month); const target=riTargetOcc(r.hotel,r.month); const proximity=(days===0?35:Math.max(0,30-Math.min(30,days||0))); const targetGap=target==null?0:Math.max(0,target-f.forecast); const priority=(risk.eur/1000)+(urg*750)+(targetGap*1200)+(proximity*900); return {...r,...risk,urg,forecast:f.forecast,days,priority,action:riActionRecommendation(r)};})
    .filter(r=>r.eur>0 || r.urg>=45)
    .sort((a,b)=>b.priority-a.priority).slice(0,15);
  riSetBody('riActionCenterBody', rows.length ? rows.map((r,i)=>{const cls=i<5?'bad':i<10?'warn':'good'; const icon=i<5?'🔴':i<10?'🟡':'🟢'; return `<tr><td class="ri4-prio">${icon} ${i+1}</td><td>${riShort(r.hotel)}</td><td>${r.monthLabel}</td><td>${riDaysLabel(r.month)}</td><td class="ri-bad">${riMoney(r.eur)}</td><td>${riPill(r.urg,riScoreClass(r.urg))}</td><td class="ri4-action">${r.action}</td></tr>`;}).join('') : '<tr><td colspan="7">Sem ações futuras relevantes para o filtro atual.</td></tr>');
}
function riRenderEarlyWarning(){
  const rows=riActionableRows(riBuildRows(true).rows).filter(r=>r.occNow!=null).map(r=>{const f=riForecastFor(r); const target=riTargetOcc(r.hotel,r.month); if(target==null) return {...r,forecast:f.forecast,target:null,gap:null,trend:riTrendFor(r.hotel,r.month),days:riDaysToMonth(r.month),urgency:0,alert:false}; const gap=target-f.forecast; const trend=riTrendFor(r.hotel,r.month); const days=riDaysToMonth(r.month); const alert=(r.occNow>=65 && gap>4) || gap>8 || (trend<0 && (r.paceDelta??0)<-3); const urgency=(gap*1000)+(days===0?5000:Math.max(0,120-days)*25); return {...r,forecast:f.forecast,target,gap,trend,days,urgency,alert};})
    .filter(r=>r.target!=null&&r.alert).sort((a,b)=>b.urgency-a.urgency).slice(0,20);
  riSetBody('riEarlyWarningBody', rows.length ? rows.map(r=>{const cls=r.gap>10?'bad':r.gap>5?'warn':'good'; const txt=r.gap>10?'Risco elevado de falhar objetivo':r.gap>5?'Atenção: tendência insuficiente':'Monitorizar tendência'; return `<tr><td>${riShort(r.hotel)}</td><td>${r.monthLabel}</td><td>${riDaysLabel(r.month)}</td><td>${riPct(r.occNow)}</td><td>${riPct(r.forecast)}</td><td>${riPct(r.target)}</td><td class="ri-bad">${riFmt(r.gap,1)} pp</td><td>${riPill(txt,cls)}</td></tr>`;}).join('') : '<tr><td colspan="8">Sem alertas futuros relevantes para o filtro atual.</td></tr>');
}
function riFindHotelInText(q){
  const nq=riNorm(q);
  return riGetHotels().find(h=>{const nh=riNorm(h); return nq.includes(nh) || nh.includes(nq);}) || null;
}
function riFindMonthInText(q){
  const nq=riNorm(q);
  for(let i=0;i<RI_MONTHS.length;i++){ if(nq.includes(riNorm(RI_MONTHS[i]))) return i+1; }
  const m=q.match(/\b(1[0-2]|0?[1-9])\b/); return m?Number(m[1]):Number(document.getElementById('riMonth')?.value||1);
}
function riAskDashboard(){
  const out=document.getElementById('riAskAnswer'); if(!out) return;
  const q=String(document.getElementById('riAskInput')?.value||'').trim();
  if(!q){ out.textContent='Escreva uma pergunta. Ex.: Porque está Cascais pior que o ano passado?'; return; }
  const hotel=riFindHotelInText(q); const month=riFindMonthInText(q);
  let rows=riBuildRows(true).rows.filter(r=>Number(r.month)===Number(month));
  if(hotel) rows=rows.filter(r=>r.hotel===hotel);
  if(!rows.length){ out.textContent='Não encontrei dados suficientes para essa pergunta no filtro atual.'; return; }
  const avg=v=>riWeightedAvg(rows, v, r=>Number(r.rooms)||1);
  const impact=rows.reduce((s,r)=>s+(Number(r.impact)||0),0);
  const risk=rows.reduce((s,r)=>s+riRevenueAtRiskFor(r).eur,0);
  const occ=avg(r=>r.occNow), stly=avg(r=>r.occStly), pace=avg(r=>r.paceDelta), pick=avg(r=>r.delta);
  const adr=riWeightedAvg(rows, r=>r.adr, r=>(Number(r.rooms)||0)*riDays(r.month)*(Number(r.occNow)||0)/100);
  const forecasts=rows.map(r=>riForecastFor(r).forecast).filter(x=>x!=null&&isFinite(x));
  const forecast=forecasts.length?forecasts.reduce((s,x)=>s+x,0)/forecasts.length:null;
  const targetRows=rows.map(r=>riTargetOcc(r.hotel,r.month)).filter(x=>x!=null&&isFinite(x));
  const target=targetRows.length?targetRows.reduce((s,x)=>s+x,0)/targetRows.length:null;
  const worst=[...rows].map(r=>({...r,risk:riRevenueAtRiskFor(r).eur,urg:riScoreUrgency(r)})).sort((a,b)=>(b.risk+b.urg*1000)-(a.risk+a.urg*1000))[0];
  const scope=hotel?riShort(hotel):'Portefólio filtrado';
  let lines=[];
  lines.push(`${scope} · ${RI_MONTHS[month-1]}`);
  lines.push(`OCC atual: ${riPct(occ)}${stly!=null?` | STLY: ${riPct(stly)} | Pace: ${(pace??0)>=0?'+':''}${riFmt(pace,1)} pp`:''}`);
  lines.push(`Pickup recente: ${pick!=null?(pick>=0?'+':'')+riFmt(pick,1)+' pp':'—'} | ADR médio: ${riMoney(adr)}`);
  lines.push(`Forecast: ${riPct(forecast)} | Objetivo (${riTargetMethodLabel()}): ${riPct(target)} | Gap: ${forecast!=null&&target!=null?riFmt(target-forecast,1)+' pp':'—'}`);
  lines.push(`Impacto pickup: ${riMoney(impact)} | Revenue at Risk: ${riMoney(risk)}`);
  if(worst) lines.push(`Principal foco: ${riShort(worst.hotel)} — ${riActionRecommendation(worst)}`);
  if(/pior|risco|porque|porqu[eê]|falha|baixo/i.test(q)){
    const reasons=[]; if((pace??0)<0) reasons.push('pace abaixo do ano anterior'); if((pick??0)<=0) reasons.push('pickup negativo/estagnado'); if(forecast!=null&&target!=null&&forecast<target) reasons.push('forecast abaixo do objetivo'); if(risk>0) reasons.push('receita em risco');
    lines.push('Leitura: '+(reasons.length?reasons.join(', '):'sem anomalia crítica evidente nos dados atuais.'));
  }
  out.textContent=lines.join('\n');
}

// Correção robusta: expor e ligar o Pergunta ao Dashboard mesmo quando o onclick inline não dispara.
window.riAskDashboard = riAskDashboard;
function riBindAskDashboard(){
  const btn = document.querySelector('#view-revenueint .ri4-ask button');
  const inp = document.getElementById('riAskInput');
  if(btn && !btn.dataset.riAskBound){ btn.addEventListener('click', function(ev){ ev.preventDefault(); riAskDashboard(); }); btn.dataset.riAskBound='1'; }
  if(inp && !inp.dataset.riAskBound){ inp.addEventListener('keydown', function(ev){ if(ev.key==='Enter'){ ev.preventDefault(); riAskDashboard(); }}); inp.dataset.riAskBound='1'; }
}
setTimeout(riBindAskDashboard, 0);
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', riBindAskDashboard); else riBindAskDashboard();

function riRenderDecisionLayer(){
  try{riRenderActionCenter();}catch(e){console.error('RI Action Center',e)}
  try{riRenderEarlyWarning();}catch(e){console.error('RI Early Warning',e)}
}

function riRenderExtra(){
  try{riRenderRevenueRisk();}catch(e){console.error('RI3 RevenueRisk',e)}
  try{riRenderLastMinute();}catch(e){console.error('RI3 LastMinute',e)}
  try{riRenderCancellations();}catch(e){console.error('RI3 Cancelamentos',e)}
  try{riRenderEvents();}catch(e){console.error('RI3 Events',e)}
  try{riRenderRadar();}catch(e){console.error('RI3 Radar',e)}
  try{riRenderSimulator();}catch(e){console.error('RI3 Simulator',e)}
  try{riRenderConfidence();}catch(e){console.error('RI3 Confidence',e)}
  try{riRenderDecisionLayer();}catch(e){console.error('RI Decision Layer',e)}
  try{riBindAskDashboard();}catch(e){}
}


// ==========================================================
// API de decisão para a Central de Operações v8
// Expõe apenas um resumo calculado; mantém os detalhes internos do RI encapsulados.
// ==========================================================
function riBuildDecisionRows(hotelsFilter){
  const snaps=riGetSnaps(); if(!snaps.length) return {rows:[],latest:null,prev:null};
  const latest=snaps[snaps.length-1], prev=snaps[Math.max(0,snaps.length-2)];
  const allowed=hotelsFilter?.length ? new Set(hotelsFilter) : null;
  const year=String(riYear()), py=String(riPrevYear()), rows=[];
  riGetHotels().filter(h=>!allowed || allowed.has(h)).forEach(h=>{
    const rooms=riGetRooms(h), reg=riRegionOf(h);
    for(let m=1;m<=12;m++){
      const idx=m-1;
      const occNow=latest.data?.[h]?.[year]?.[idx] ?? latest.data?.[h]?.[riYear()]?.[idx];
      if(occNow==null || !isFinite(Number(occNow))) continue;
      const occPrev=prev?.data?.[h]?.[year]?.[idx] ?? prev?.data?.[h]?.[riYear()]?.[idx];
      const occStly=latest.data?.[h]?.[py]?.[idx] ?? latest.data?.[h]?.[riPrevYear()]?.[idx];
      const delta=(occPrev!=null&&isFinite(Number(occPrev)))?Number(occNow)-Number(occPrev):null;
      const adr=riADR(h,m), rn=(rooms&&delta!=null)?rooms*riDays(m)*(delta/100):null;
      const impact=(rn!=null&&adr!=null)?rn*adr:null;
      rows.push({hotel:h,reg,month:m,monthLabel:RI_MONTHS[idx],rooms,occNow:Number(occNow),occPrev:occPrev!=null?Number(occPrev):null,delta,occStly:occStly!=null?Number(occStly):null,paceDelta:occStly!=null?Number(occNow)-Number(occStly):null,adr,rn,impact});
    }
  });
  return {rows,latest,prev};
}
function riDecisionSnapshot(hotelsFilter){
  const built=riBuildDecisionRows(hotelsFilter);
  if(!built.latest) return {available:false,totalRisk:0,risks:[],opportunities:[],label:'Sem snapshots RI'};
  const actionable=riActionableRows(built.rows).filter(r=>r.occNow!=null&&isFinite(r.occNow));
  const risks=actionable.map(r=>{
    const rr=riRevenueAtRiskFor(r), urgency=riScoreUrgency(r), forecast=riForecastFor(r).forecast;
    const gap=rr.gap==null?0:Number(rr.gap||0);
    const score=(Number(rr.eur||0)/1000)+(urgency*1.35)+(gap*4);
    const severity=(gap>10||urgency>=70||Number(rr.eur||0)>=50000)?'red':'orange';
    return {...r,eurRisk:Number(rr.eur||0),rnRisk:Number(rr.rn||0),target:rr.target,forecast,gap,urgency,score,severity,
      summary:`Forecast ${riPct(forecast)} vs objetivo ${riPct(rr.target)} · gap ${riFmt(gap,1)} pp · ${riMoney(rr.eur)} em risco`,
      action:riActionRecommendation(r)};
  }).filter(r=>r.eurRisk>0 || r.urgency>=45).sort((a,b)=>b.score-a.score);

  const opportunities=[];
  actionable.forEach(r=>{
    const prevAdr=riADRPrev(r.hotel,r.month);
    if((r.occNow||0)>=85 && r.adr!=null && prevAdr!=null && r.adr<=prevAdr*1.01){
      opportunities.push({hotel:r.hotel,month:r.month,score:85+(r.occNow-85),value:riPct(r.occNow),title:`Alta ocupação em ${r.monthLabel}`,
        sub:`ADR ${riMoney(r.adr)} sem evolução material vs ${riPrevYear()}. Testar subida tarifária e proteger inventário.`});
    } else if((r.delta||0)>=4 && (r.paceDelta==null || r.paceDelta>=-1)){
      opportunities.push({hotel:r.hotel,month:r.month,score:65+(r.delta||0),value:`+${riFmt(r.delta,1)} pp`,title:`Pickup positivo em ${r.monthLabel}`,
        sub:'Procura a acelerar. Rever descontos e proteger ADR antes de continuar a abrir preço.'});
    }
  });
  opportunities.sort((a,b)=>b.score-a.score);
  const totalRisk=risks.reduce((s,r)=>s+(Number(r.eurRisk)||0),0);
  const label=built.latest?.label || (built.latest?.loadedAt ? new Date(built.latest.loadedAt).toLocaleDateString('pt-PT') : 'último snapshot');
  return {available:true,totalRisk,risks:risks.slice(0,12),opportunities:opportunities.slice(0,8),label,latestAt:built.latest?.loadedAt||null};
}

// V12: API granular de forecast por hotel/mês. Mantém a fórmula de forecast
// dentro do Revenue Intelligence e evita duplicá-la no módulo de cenários.
function riHotelMonthForecast(hotel,month){
  const m=Number(month);
  const built=riBuildDecisionRows(hotel?[hotel]:null);
  const row=(built.rows||[]).find(r=>r.hotel===hotel&&Number(r.month)===m);
  const snaps=riGetSnaps();
  if(!row) return {available:false,hotel,month:m,snapshots:snaps.length,latestAt:built.latest?.loadedAt||null,latestLabel:built.latest?.label||null};
  const f=riForecastFor(row), target=riTargetOcc(row.hotel,row.month), risk=riRevenueAtRiskFor(row);
  return {
    available:true,hotel:row.hotel,month:row.month,monthLabel:row.monthLabel,rooms:row.rooms,
    occNow:row.occNow,occPrev:row.occPrev,occStly:row.occStly,paceDelta:row.paceDelta,delta:row.delta,
    trend:f.trend,forecast:f.forecast,target,weeksLeft:Math.max(0,Math.min(6,riWeeksLeft(row.month))),
    adr:row.adr,revenueAtRisk:Number(risk.eur||0),rnRisk:Number(risk.rn||0),
    snapshots:snaps.length,latestAt:built.latest?.loadedAt||null,latestLabel:built.latest?.label||null,source:'Revenue Intelligence'
  };
}
function riForecastRows(hotelsFilter){
  const built=riBuildDecisionRows(hotelsFilter), snaps=riGetSnaps();
  return (built.rows||[]).map(row=>{
    const f=riForecastFor(row), target=riTargetOcc(row.hotel,row.month);
    return {...row,trend:f.trend,forecast:f.forecast,target,weeksLeft:Math.max(0,Math.min(6,riWeeksLeft(row.month))),snapshots:snaps.length,latestAt:built.latest?.loadedAt||null,latestLabel:built.latest?.label||null,source:'Revenue Intelligence'};
  });
}
window.VG=window.VG||{};
window.VG.revenue=window.VG.revenue||{};
window.VG.revenue.getDecisionSnapshot=riDecisionSnapshot;
window.VG.revenue.getHotelMonthForecast=riHotelMonthForecast;
window.VG.revenue.getForecastRows=riForecastRows;

window.riRender=function(){
  riInitControls();
  const snaps=riGetSnaps(); const empty=document.getElementById('riEmpty'), content=document.getElementById('riContent');
  if(!snaps.length){ if(empty)empty.style.display='block'; if(content)content.style.display='none'; return; }
  if(empty)empty.style.display='none'; if(content)content.style.display='block';
  const built=riBuildRows(false); const rows=built.rows;
  const meta={latestLabel:built.latest?.label||'último snapshot', prevLabel:built.prev?.label||'snapshot anterior'};
  riRenderKpis(rows,meta); riRenderSummary(rows,meta); riRenderPace(); riRenderImpact(rows); riRenderTables(rows); try{riRenderAdvanced();}catch(e){console.error('RI2 render',e);} try{riRenderExtra();}catch(e){console.error('RI3 render',e);}
};
// Atualização orientada a eventos: evita substituir/wrapping de setView.
let riStateTimer=null;
window.VG?.events?.on('state:changed',()=>{
  if(typeof currentView!=='undefined' && currentView==='revenueint'){
    clearTimeout(riStateTimer);
    riStateTimer=setTimeout(()=>{ try{riRender();}catch(e){console.error('RI render',e);} },30);
  }
});
document.addEventListener('DOMContentLoaded',()=>{ try{riInitControls(); if(location.hash==='#revenueint') setTimeout(riRender,100);}catch(e){} });
})();
