// ==========================================================
// 1. ALERTAS AUTOMÁTICOS
// ==========================================================
function vgAnalysisSym(){return window.VG?.market?.symbol?.()||'€';}
function vgAnalysisMoney(v,d=0){return window.VG?.market?.formatMoney?window.VG.market.formatMoney(v,d,false):vgAnalysisSym()+Number(v||0).toLocaleString('pt-PT',{maximumFractionDigits:d});}
function vgAlertRuleConfig(id, fallback, severity='orange'){
  try{
    if(typeof window.vgRuleConfig==='function') return window.vgRuleConfig(id);
  }catch(e){}
  return {enabled:true,value:fallback,severity};
}
function vgAlertRuleValue(id, fallback, severity='orange'){
  const r=vgAlertRuleConfig(id,fallback,severity); return r&&r.enabled!==false?Number(r.value):null;
}
function vgAlertTarget(h, metric){
  try{return typeof window.vgTargetForPeriod==='function'?window.vgTargetForPeriod(h,metric):null;}catch(e){return null;}
}
function vgAlertGrowth(prev,cur){ prev=Number(prev);cur=Number(cur);return isFinite(prev)&&prev!==0&&isFinite(cur)?(cur-prev)/Math.abs(prev)*100:null; }
function alertRuleLabel(rule,h){ try{return typeof rule.labelFor==='function'?rule.labelFor(h):rule.label;}catch(e){return rule.label;} }

const ALERT_RULES = [
  { id:'gop_neg', get severity(){return vgAlertRuleConfig('gop_neg',0,'red').severity;}, label:'GOP com sede abaixo do mínimo absoluto', labelFor:(h)=>{const v=vgAlertRuleValue('gop_neg',0,'red');return `GOP com sede < ${vgAnalysisMoney(v??0,0)}`;}, check:(h)=>{ const v=vgAlertRuleValue('gop_neg',0,'red'); if(v==null)return false; const g=gop(h,YR_CUR); return g!=null&&g<v; } },
  { id:'gop_low', get severity(){return vgAlertRuleConfig('gop_low',20,'red').severity;}, label:'Margem GOP com sede abaixo do mínimo', labelFor:(h)=>{const t=vgAlertTarget(h,'gopPct');const v=t!=null?t:vgAlertRuleValue('gop_low',20,'red');return t!=null?`GOP% abaixo da meta (${Number(v).toLocaleString('pt-PT',{maximumFractionDigits:1})}%)`:`Margem GOP com sede < ${Number(v??20).toLocaleString('pt-PT',{maximumFractionDigits:1})}%`;}, check:(h)=>{ const cfg=vgAlertRuleConfig('gop_low',20,'red');if(cfg?.enabled===false)return false;const t=vgAlertTarget(h,'gopPct');const v=t!=null?t:Number(cfg.value);if(v==null||!isFinite(v))return false; const p=gopPct(h,YR_CUR); return p!=null&&p<v; } },
  { id:'occ_low', get severity(){return vgAlertRuleConfig('occ_low',40,'orange').severity;}, label:'Ocupação abaixo do mínimo', labelFor:(h)=>{const t=vgAlertTarget(h,'occupancy');const v=t!=null?t:vgAlertRuleValue('occ_low',40,'orange');return t!=null?`Ocupação abaixo da meta (${Number(v).toLocaleString('pt-PT',{maximumFractionDigits:1})}%)`:`Ocupação < ${Number(v??40).toLocaleString('pt-PT',{maximumFractionDigits:1})}%`;}, check:(h)=>{ const cfg=vgAlertRuleConfig('occ_low',40,'orange');if(cfg?.enabled===false)return false;const t=vgAlertTarget(h,'occupancy');const v=t!=null?t:Number(cfg.value);if(v==null||!isFinite(v))return false; const o=occ(h,YR_CUR); return o!==null&&o<v; } },
  { id:'occ_drop', get severity(){return vgAlertRuleConfig('occ_drop',10,'orange').severity;}, label:'Queda de ocupação vs ano anterior', labelFor:()=>{const v=vgAlertRuleValue('occ_drop',10,'orange');return `Ocupação caiu > ${Number(v??10).toLocaleString('pt-PT',{maximumFractionDigits:1})}pp`;}, check:(h)=>{ const v=vgAlertRuleValue('occ_drop',10,'orange');if(v==null)return false; const o25=occ(h,YR_PREV),o26=occ(h,YR_CUR); return o25!==null&&o26!==null&&(o26-o25)<-v; } },
  { id:'labour_hi', get severity(){return vgAlertRuleConfig('labour_hi',40,'red').severity;}, label:'Pessoal acima do limite', labelFor:()=>{const v=vgAlertRuleValue('labour_hi',40,'red');return `Pessoal > ${Number(v??40).toLocaleString('pt-PT',{maximumFractionDigits:1})}% Receita`;}, check:(h)=>{ const v=vgAlertRuleValue('labour_hi',40,'red');if(v==null)return false; const r=n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_CUR]), p=n(RAW.hotels_costs[h]?.PESSOAL?.[YR_CUR]); return r>0&&p/r*100>v; } },
  { id:'energy_hi', get severity(){return vgAlertRuleConfig('energy_hi',8,'orange').severity;}, label:'Energia acima do limite', labelFor:()=>{const v=vgAlertRuleValue('energy_hi',8,'orange');return `Energia > ${Number(v??8).toLocaleString('pt-PT',{maximumFractionDigits:1})}% Receita`;}, check:(h)=>{ const v=vgAlertRuleValue('energy_hi',8,'orange');if(v==null)return false; const r=n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_CUR]), e=n(RAW.hotels_costs[h]?.ENERGIA?.[YR_CUR]); return r>0&&e/r*100>v; } },
  { id:'maint_hi', get severity(){return vgAlertRuleConfig('maint_hi',8,'orange').severity;}, label:'Manutenção acima do limite', labelFor:()=>{const v=vgAlertRuleValue('maint_hi',8,'orange');return `Manutenção > ${Number(v??8).toLocaleString('pt-PT',{maximumFractionDigits:1})}% Receita`;}, check:(h)=>{ const v=vgAlertRuleValue('maint_hi',8,'orange');if(v==null)return false; const r=n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_CUR]), m=n(RAW.hotels_costs[h]?.MANUTENÇÃO?.[YR_CUR]); return r>0&&m/r*100>v; } },
  { id:'rev_drop', get severity(){return vgAlertRuleConfig('rev_drop',10,'red').severity;}, label:'Receita abaixo do objetivo', labelFor:(h)=>{const t=vgAlertTarget(h,'revenueGrowthPct');const v=vgAlertRuleValue('rev_drop',10,'red');return t!=null?`Receita vs LY abaixo da meta (${Number(t).toLocaleString('pt-PT',{maximumFractionDigits:1})}%)`:`Receita caiu > ${Number(v??10).toLocaleString('pt-PT',{maximumFractionDigits:1})}% vs ano anterior`;}, check:(h)=>{ const cfg=vgAlertRuleConfig('rev_drop',10,'red');if(cfg?.enabled===false)return false;const r25=n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_PREV]),r26=n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_CUR]);const g=vgAlertGrowth(r25,r26);if(g==null)return false;const t=vgAlertTarget(h,'revenueGrowthPct');if(t!=null)return g<t;const v=Number(cfg.value);return isFinite(v)&&g<-v; } },
  { id:'adr_drop', get severity(){return vgAlertRuleConfig('adr_drop',5,'orange').severity;}, label:'ADR abaixo do objetivo', labelFor:(h)=>{const t=vgAlertTarget(h,'adrGrowthPct');const v=vgAlertRuleValue('adr_drop',5,'orange');return t!=null?`ADR vs LY abaixo da meta (${Number(t).toLocaleString('pt-PT',{maximumFractionDigits:1})}%)`:`ADR caiu > ${Number(v??5).toLocaleString('pt-PT',{maximumFractionDigits:1})}% vs ano anterior`;}, check:(h)=>{ const cfg=vgAlertRuleConfig('adr_drop',5,'orange');if(cfg?.enabled===false)return false;const a25=adr(h,YR_PREV),a26=adr(h,YR_CUR);const g=vgAlertGrowth(a25,a26);if(g==null)return false;const t=vgAlertTarget(h,'adrGrowthPct');if(t!=null)return g<t;const v=Number(cfg.value);return isFinite(v)&&g<-v; } },
]

function validateDashboardData(data=RAW) {
  const issues=[];
  if(!data) return issues;
  const years=[String(YR_PREV),String(YR_CUR)];
  const hotels=data.hotel_list||Object.keys(data.hotels_ops||{});
  const add=(severity,hotel,code,message)=>issues.push({severity,hotel,code,message});
  hotels.forEach(h=>{
    const ops=data.hotels_ops?.[h]; const costs=data.hotels_costs?.[h];
    if(!ops){ add('red',h,'OPS_MISSING','Sem dados operacionais no período selecionado.'); return; }
    years.forEach(y=>{
      const oc=Number(ops?.Ocupados?.[y]), di=Number(ops?.Disponiveis?.[y]);
      if(isFinite(di)&&di<0) add('red',h,'AVAIL_NEG',`Disponíveis negativos em ${y}.`);
      if(isFinite(oc)&&oc<0) add('red',h,'OCCROOM_NEG',`Quartos ocupados negativos em ${y}.`);
      if(isFinite(oc)&&isFinite(di)&&di>=0&&oc>di+0.5) add('red',h,'OCC_GT_AVAIL',`Ocupados (${Math.round(oc)}) acima dos disponíveis (${Math.round(di)}) em ${y}.`);
      if(isFinite(oc)&&isFinite(di)&&di>0){ const pct=oc/di*100; if(pct>100.2) add('red',h,'OCC_GT_100',`Ocupação de ${pct.toFixed(1)}% em ${y}.`); }
      const aloj=Number(ops?.['Receita Alojamento']?.[y]);
      const adrOff=officialOpVal(h,'ADR',y,data);
      if(isFinite(aloj)&&isFinite(oc)&&oc>0&&adrOff!=null){ const adrCalc=aloj/oc; const dev=Math.abs(adrOff-adrCalc)/Math.max(1,Math.abs(adrCalc))*100; if(dev>3) add('orange',h,'ADR_MISMATCH',`ADR oficial difere ${dev.toFixed(1)}% de Receita Alojamento ÷ Ocupados em ${y}.`); }
      // Não inferir fórmulas contabilísticas entre GOP, NOP e TOTAIS: esses campos
      // podem incluir imputações/sede conforme o formato do P&L. O validador limita-se
      // aqui a incoerências estruturais objetivas, evitando falsos positivos.
    });
  });
  const months=Object.keys(STORE||{}).map(Number).filter(m=>m>=1&&m<=12).sort((a,b)=>a-b);
  if(months.length>1){ for(let m=months[0];m<=months[months.length-1];m++){ if(!months.includes(m)) add('orange','Portefólio','MONTH_GAP',`Mês ${m} em falta entre os P&L carregados.`); } }
  return issues;
}
window.vgValidateData = validateDashboardData;

function renderDataQualityBlock(issues){
  if(!issues?.length) return `<div class="pl-dept-card" style="border-left:4px solid #27ae60;margin-bottom:14px"><div class="pl-dept-name">✓ Qualidade dos dados</div><div style="font-size:11px;color:var(--text-2);margin-top:6px">Sem incoerências estruturais relevantes detetadas no período selecionado.</div></div>`;
  const red=issues.filter(i=>i.severity==='red').length, orange=issues.length-red;
  const rows=issues.slice(0,20).map(i=>`<div style="display:flex;gap:8px;align-items:flex-start;padding:5px 0;border-bottom:1px solid var(--border-2);font-size:10px"><span>${i.severity==='red'?'🔴':'🟡'}</span><strong style="min-width:130px;color:var(--text-1)">${i.hotel}</strong><span style="color:var(--text-2)">${i.message}</span></div>`).join('');
  return `<div class="pl-dept-card" style="border-left:4px solid ${red?'#ef4444':'#f59e0b'};margin-bottom:14px"><div class="pl-dept-name">Qualidade dos dados — ${issues.length} verificação(ões)</div><div style="font-size:10px;color:var(--text-3);margin:5px 0 8px">${red} críticas · ${orange} a validar. Estes avisos sinalizam incoerências; não alteram automaticamente os dados.</div>${rows}${issues.length>20?`<div style="font-size:10px;color:var(--text-3);margin-top:6px">+ ${issues.length-20} ocorrências adicionais.</div>`:''}</div>`;
}

function alertasRender() {
  if (!RAW) return;
  const hotels = getActiveHotels();
  const sevColor = { red:'#ef4444', orange:'#f59e0b', green:'#27ae60' };
  const sevBg    = { red:'rgba(239,68,68,.08)', orange:'rgba(245,158,11,.08)', green:'rgba(39,174,96,.08)' };

  const dataIssues = validateDashboardData(RAW);

  // Per-hotel alerts
  const hotelAlerts = hotels.map(h => {
    const triggered = ALERT_RULES.filter(r => { try { return r.check(h); } catch(e){ return false; } });
    return { h, triggered };
  }).filter(x => x.triggered.length > 0).sort((a,b) => {
    const sev = r => r.severity==='red'?2:1;
    return b.triggered.reduce((s,r)=>s+sev(r),0) - a.triggered.reduce((s,r)=>s+sev(r),0);
  });

  // Summary cards
  const redCount    = hotelAlerts.filter(x=>x.triggered.some(r=>r.severity==='red')).length;
  const orangeCount = hotelAlerts.filter(x=>x.triggered.every(r=>r.severity==='orange')).length;
  const okCount     = hotels.length - hotelAlerts.length;

  document.getElementById('alertas-summary').innerHTML = [
    { l:'🔴 Alertas Críticos',  v:redCount,    c:'#ef4444' },
    { l:'🟡 Atenção',           v:orangeCount, c:'#f59e0b' },
    { l:'🟢 Sem Alertas',       v:okCount,     c:'#27ae60' },
    { l:'Hotéis analisados',    v:hotels.length, c:'var(--text-1)' },
    { l:'Qualidade dados',       v:dataIssues.length, c:dataIssues.some(i=>i.severity==='red')?'#ef4444':dataIssues.length?'#f59e0b':'#27ae60' },
  ].map(k=>`<div class="pl-dept-card" style="border-left:3px solid ${k.c}">
    <div class="pl-dept-name">${k.l}</div>
    <div class="pl-dept-val" style="color:${k.c}">${k.v}</div>
  </div>`).join('');

  if (!hotelAlerts.length) {
    document.getElementById('alertas-grid').innerHTML = renderDataQualityBlock(dataIssues) + `<div style="text-align:center;padding:32px;color:var(--text-3)">🟢 Nenhum alerta operacional activo para os hotéis seleccionados.</div>`;
    return;
  }

  document.getElementById('alertas-grid').innerHTML = renderDataQualityBlock(dataIssues) + hotelAlerts.map(({h, triggered}) => {
    const hasCritical = triggered.some(r=>r.severity==='red');
    const borderColor = hasCritical ? '#ef4444' : '#f59e0b';
    const badges = triggered.map(r => `<span style="background:${sevBg[r.severity]};border:1px solid ${sevColor[r.severity]};color:${sevColor[r.severity]};font-size:9px;font-weight:700;padding:3px 8px;border-radius:6px">${alertRuleLabel(r,h)}</span>`).join('');
    const rec26 = n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_CUR]);
    const gop26 = gop(h,YR_CUR);
    const gopPctV = (gop26!=null && rec26>0) ? gop26/rec26*100 : null;
    const occV = occ(h,YR_CUR);
    const adrV = adr(h,YR_CUR);
    return `<div class="pl-dept-card" style="border-left:4px solid ${borderColor};margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;flex-wrap:wrap;gap:6px">
        <div style="font-size:13px;font-weight:800;color:var(--text-1)">${h.replace('COLLECTION ','C. ')}</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap">${badges}</div>
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:11px;color:var(--text-3)">
        <span>Receita: <strong style="color:var(--text-1)">${fmtV(rec26)}</strong></span>
        <span>GOP: <strong style="color:${(gopPctV??0)<0?'#ef4444':(gopPctV??0)<20?'#f59e0b':'#27ae60'}">${gopPctV==null?'—':fmt(gopPctV,1)+'%'}</strong></span>
        ${occV!==null?`<span>Occ: <strong style="color:${occV<40?'#ef4444':'var(--text-1)'}">${fmt(occV,1)}%</strong></span>`:''}
        ${adrV!==null?`<span>ADR: <strong>${vgAnalysisSym()}${fmt(adrV,0)}</strong></span>`:''}
      </div>
    </div>`;
  }).join('');
}

function waBuildAlertas() {
  if (!RAW) return '🔔 Sem dados carregados.';
  const mNames = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const regionLabels = new Proxy({todos:'Todos os Hotéis'},{get:(o,k)=>k==='todos'?'Todos os Hotéis':(window.VG?.market?.regionLabel?.(k)||String(k))});
  const hotels = waSelectedRegion==='todos' ? RAW.hotel_list : (REGIOES[waSelectedRegion]||[]).filter(h=>RAW.hotel_list.includes(h));
  const now = new Date().toLocaleDateString('pt-PT',{day:'2-digit',month:'2-digit',year:'numeric'});
  const mesesStr = [...waSelectedMeses].sort((a,b)=>a-b).map(m=>mNames[m]).join(', ');

  const hotelAlerts = hotels.map(h => {
    const triggered = ALERT_RULES.filter(r => { try { return r.check(h); } catch(e){ return false; } });
    return { h, triggered };
  }).filter(x => x.triggered.length > 0).sort((a,b) => b.triggered.length - a.triggered.length);

  const lines = [`🔔 *Vila Galé — Alertas · ${regionLabels[waSelectedRegion]}*`, `📅 ${mesesStr} · 🗓 ${now}`, ``];
  if (!hotelAlerts.length) { lines.push('🟢 Nenhum alerta activo.'); }
  else {
    hotelAlerts.forEach(({h, triggered}) => {
      const hasCrit = triggered.some(r=>r.severity==='red');
      lines.push(`${hasCrit?'🔴':'🟡'} *${h.replace('COLLECTION ','C. ')}*`);
      triggered.forEach(r => lines.push(`　${r.severity==='red'?'🔴':'🟡'} ${alertRuleLabel(r,h)}`));
    });
  }
  lines.push(``, `📊 ${hotels.length} hotéis analisados · ${hotelAlerts.length} com alertas`, ``, `_Dashboard Vila Galé Hotéis_`);
  return lines.join('\n');
}

// ==========================================================
// 2. COMPARAR HOTÉIS
// ==========================================================
function cmpInit() {
  if (!RAW) return;
  const hotels = getActiveHotels();
  const opts = hotels.map(h=>`<option value="${h}">${h}</option>`).join('');
  const selA = document.getElementById('cmpHotelA');
  const selB = document.getElementById('cmpHotelB');
  if (!selA.options.length) { selA.innerHTML = opts; selB.innerHTML = opts; if (hotels.length>1) selB.selectedIndex=1; }
  cmpRender();
}

function cmpRender() {
  if (!RAW) return;
  const hA = document.getElementById('cmpHotelA')?.value;
  const hB = document.getElementById('cmpHotelB')?.value;
  if (!hA || !hB) return;

  const metrics = [
    { l:'Receita Total '+YR_CUR,   fA:()=>fmtV(n(RAW.hotels_ops[hA]?.['Receita Total']?.[YR_CUR])), fB:()=>fmtV(n(RAW.hotels_ops[hB]?.['Receita Total']?.[YR_CUR])), higherBetter:true, getV:h=>n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_CUR]) },
    { l:'Receita '+YR_PREV,         fA:()=>fmtV(n(RAW.hotels_ops[hA]?.['Receita Total']?.[YR_PREV])), fB:()=>fmtV(n(RAW.hotels_ops[hB]?.['Receita Total']?.[YR_PREV])), higherBetter:true, getV:h=>n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_PREV]) },
    { l:'GOP % com sede',       fA:()=>{const v=gopPct(hA,YR_CUR);return v==null?'—':fmt(v,1)+'%';}, fB:()=>{const v=gopPct(hB,YR_CUR);return v==null?'—':fmt(v,1)+'%';}, higherBetter:true, getV:h=>gopPct(h,YR_CUR)??-Infinity },
    { l:'Occupancy '+YR_CUR,       fA:()=>fmt(occ(hA,YR_CUR)||0,1)+'%', fB:()=>fmt(occ(hB,YR_CUR)||0,1)+'%', higherBetter:true, getV:h=>occ(h,YR_CUR)||0 },
    { l:'ADR '+YR_CUR,             fA:()=>vgAnalysisSym()+fmt(adr(hA,YR_CUR)||0,2), fB:()=>vgAnalysisSym()+fmt(adr(hB,YR_CUR)||0,2), higherBetter:true, getV:h=>adr(h,YR_CUR)||0 },
    { l:'RevPAR '+YR_CUR,          fA:()=>vgAnalysisSym()+fmt(revpar(hA,YR_CUR)||0,2), fB:()=>vgAnalysisSym()+fmt(revpar(hB,YR_CUR)||0,2), higherBetter:true, getV:h=>revpar(h,YR_CUR)||0 },
    { l:'Custos Totais',        fA:()=>fmtV(totalCosts(hA,YR_CUR)), fB:()=>fmtV(totalCosts(hB,YR_CUR)), higherBetter:false, getV:h=>totalCosts(h,YR_CUR) },
    { l:'Custo Pessoal %',      fA:()=>{ const r=n(RAW.hotels_ops[hA]?.['Receita Total']?.[YR_CUR]),p=n(RAW.hotels_costs[hA]?.PESSOAL?.[YR_CUR]); return r>0?fmt(p/r*100,1)+'%':'—'; }, fB:()=>{ const r=n(RAW.hotels_ops[hB]?.['Receita Total']?.[YR_CUR]),p=n(RAW.hotels_costs[hB]?.PESSOAL?.[YR_CUR]); return r>0?fmt(p/r*100,1)+'%':'—'; }, higherBetter:false, getV:h=>{ const r=n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_CUR]),p=n(RAW.hotels_costs[h]?.PESSOAL?.[YR_CUR]); return r>0?p/r*100:0; } },
    { l:'Energia %',            fA:()=>{ const r=n(RAW.hotels_ops[hA]?.['Receita Total']?.[YR_CUR]),e=n(RAW.hotels_costs[hA]?.ENERGIA?.[YR_CUR]); return r>0?fmt(e/r*100,1)+'%':'—'; }, fB:()=>{ const r=n(RAW.hotels_ops[hB]?.['Receita Total']?.[YR_CUR]),e=n(RAW.hotels_costs[hB]?.ENERGIA?.[YR_CUR]); return r>0?fmt(e/r*100,1)+'%':'—'; }, higherBetter:false, getV:h=>{ const r=n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_CUR]),e=n(RAW.hotels_costs[h]?.ENERGIA?.[YR_CUR]); return r>0?e/r*100:0; } },
    { l:'Manutenção %',         fA:()=>{ const r=n(RAW.hotels_ops[hA]?.['Receita Total']?.[YR_CUR]),m=n(RAW.hotels_costs[hA]?.MANUTENÇÃO?.[YR_CUR]); return r>0?fmt(m/r*100,1)+'%':'—'; }, fB:()=>{ const r=n(RAW.hotels_ops[hB]?.['Receita Total']?.[YR_CUR]),m=n(RAW.hotels_costs[hB]?.MANUTENÇÃO?.[YR_CUR]); return r>0?fmt(m/r*100,1)+'%':'—'; }, higherBetter:false, getV:h=>{ const r=n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_CUR]),m=n(RAW.hotels_costs[h]?.MANUTENÇÃO?.[YR_CUR]); return r>0?m/r*100:0; } },
    { l:'Custo / Dormida',      fA:()=>{ const c=totalCosts(hA,YR_CUR),d=n(RAW.hotels_ops[hA]?.Dormidas?.[YR_CUR]); return d>0?vgAnalysisSym()+fmt(c/d,2):'—'; }, fB:()=>{ const c=totalCosts(hB,YR_CUR),d=n(RAW.hotels_ops[hB]?.Dormidas?.[YR_CUR]); return d>0?vgAnalysisSym()+fmt(c/d,2):'—'; }, higherBetter:false, getV:h=>{ const c=totalCosts(h,YR_CUR),d=n(RAW.hotels_ops[h]?.Dormidas?.[YR_CUR]); return d>0?c/d:0; } },
    { l:'Dormidas',             fA:()=>fmt(n(RAW.hotels_ops[hA]?.Dormidas?.[YR_CUR])), fB:()=>fmt(n(RAW.hotels_ops[hB]?.Dormidas?.[YR_CUR])), higherBetter:true, getV:h=>n(RAW.hotels_ops[h]?.Dormidas?.[YR_CUR]) },
    { l:'GRI™ Reputação',       fA:()=>REP_STORE?.[hA]?.gri!=null?fmt(REP_STORE[hA].gri,1):'—', fB:()=>REP_STORE?.[hB]?.gri!=null?fmt(REP_STORE[hB].gri,1):'—', higherBetter:true, getV:h=>REP_STORE?.[h]?.gri||0 },
  ];

  let html = `<div style="overflow-x:auto"><table class="pl-table" style="min-width:500px"><thead><tr>
    <th style="text-align:left">Indicador</th>
    <th style="text-align:center;color:#4a9eca">${hA.replace('COLLECTION ','C. ')}</th>
    <th style="text-align:center;color:#c9a84c">${hB.replace('COLLECTION ','C. ')}</th>
    <th>Vantagem</th>
  </tr></thead><tbody>`;

  metrics.forEach(m => {
    const vA = m.getV(hA), vB = m.getV(hB);
    const aWins = m.higherBetter ? vA > vB : vA < vB;
    const bWins = m.higherBetter ? vB > vA : vB < vA;
    const clsA = aWins?'pl-cell-good':bWins?'pl-cell-bad':'';
    const clsB = bWins?'pl-cell-good':aWins?'pl-cell-bad':'';
    const adv = aWins ? `<span style="color:#4a9eca;font-weight:700">${hA.replace('COLLECTION ','C. ')}</span>` : bWins ? `<span style="color:#c9a84c;font-weight:700">${hB.replace('COLLECTION ','C. ')}</span>` : `<span style="color:var(--text-3)">Igual</span>`;
    html += `<tr><td>${m.l}</td><td class="${clsA}" style="text-align:center;font-family:var(--mono)">${m.fA()}</td><td class="${clsB}" style="text-align:center;font-family:var(--mono)">${m.fB()}</td><td style="text-align:center">${adv}</td></tr>`;
  });

  html += '</tbody></table></div>';
  document.getElementById('cmp-body').innerHTML = html;
}

// ==========================================================
// 3. RANKING COMPOSTO
// ==========================================================
function rankRender() {
  if (!RAW) return;
  const hotels = getActiveHotels();
  const wGop  = Number(document.getElementById('wGop')?.value  || 3);
  const wOcc  = Number(document.getElementById('wOcc')?.value  || 2);
  const wAdrV = Number(document.getElementById('wAdr')?.value  || 2);
  const wCost = Number(document.getElementById('wCost')?.value || 2);
  const wGri  = Number(document.getElementById('wGri')?.value  || 1);
  ['Gop','Occ','Adr','Cost','Gri'].forEach(n=>{ const el=document.getElementById('w'+n+'V'); if(el) el.textContent=document.getElementById('w'+n)?.value; });

  // Collect raw values
  const rows = hotels.map(h => {
    const r26 = n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_CUR]);
    if (!r26) return null;
    const c26  = totalCosts(h,YR_CUR);
    const gopP = gopPct(h,YR_CUR) ?? 0;
    const occV = occ(h,YR_CUR)||0;
    const adrV = adr(h,YR_CUR)||0;
    const dorm = n(RAW.hotels_ops[h]?.Dormidas?.[YR_CUR]);
    const cPD  = dorm>0?c26/dorm:0;
    const griV = REP_STORE?.[h]?.gri||null;
    return { h, gopP, occV, adrV, cPD, griV, r26 };
  }).filter(Boolean);

  if (!rows.length) return;

  // Normalise each metric 0–100 (higher = better for all except cPD)
  const norm = (arr, higher=true) => {
    const mn=Math.min(...arr), mx=Math.max(...arr);
    if (mx===mn) return arr.map(()=>50);
    return arr.map(v => higher ? (v-mn)/(mx-mn)*100 : (mx-v)/(mx-mn)*100);
  };
  const nGop  = norm(rows.map(r=>r.gopP), true);
  const nOcc  = norm(rows.map(r=>r.occV), true);
  const nAdr  = norm(rows.map(r=>r.adrV), true);
  const nCost = norm(rows.map(r=>r.cPD),  false);
  const nGri  = rows.map(r=>r.griV!=null?r.griV*10:50); // GRI ~0-10 → 0-100

  const totalW = wGop+wOcc+wAdrV+wCost+wGri || 1;
  const scored = rows.map((r,i) => ({
    ...r,
    score: (nGop[i]*wGop + nOcc[i]*wOcc + nAdr[i]*wAdrV + nCost[i]*wCost + nGri[i]*wGri) / totalW
  })).sort((a,b) => b.score - a.score);

  const q1 = scored[Math.floor(scored.length*0.25)]?.score || 0;
  const q3 = scored[Math.floor(scored.length*0.75)]?.score || 0;

  let html = `<table class="pl-table"><thead><tr>
    <th>#</th><th style="text-align:left">Hotel</th>
    <th>Score</th><th>GOP%</th><th>Occ%</th><th>ADR</th>
    <th>${vgAnalysisSym()}/Dorm</th><th>GRI™</th><th>Quartil</th>
  </tr></thead><tbody>`;

  scored.forEach((r,i) => {
    const ql = r.score>=q1?'pl-cell-good':r.score<=q3?'pl-cell-bad':'';
    const badge = r.score>=q1?'🟢 Top 25%':r.score<=q3?'🔴 Bottom 25%':'⚪ Médio';
    const barW = r.score.toFixed(1);
    html += `<tr>
      <td style="color:var(--text-3)">${i+1}</td>
      <td>${r.h.replace('COLLECTION ','C. ')}</td>
      <td class="${ql}">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-weight:800">${fmt(r.score,1)}</span>
          <div style="flex:1;height:4px;background:var(--surface-3);border-radius:2px;min-width:40px">
            <div style="width:${barW}%;height:100%;background:${r.score>=q1?'#27ae60':r.score<=q3?'#ef4444':'#f59e0b'};border-radius:2px"></div>
          </div>
        </div>
      </td>
      <td class="${r.gopP>=20?'pl-cell-good':r.gopP<0?'pl-cell-bad':''}">${fmt(r.gopP,1)}%</td>
      <td>${fmt(r.occV,1)}%</td>
      <td>${vgAnalysisSym()}${fmt(r.adrV,0)}</td>
      <td>${vgAnalysisSym()}${fmt(r.cPD,2)}</td>
      <td>${r.griV!=null?fmt(r.griV,1):'—'}</td>
      <td style="font-size:10px">${badge}</td>
    </tr>`;
  });

  document.getElementById('rank-body').innerHTML = html+'</tbody></table>';
}

// ==========================================================
// 4. SAZONALIDADE
// ==========================================================
function sazonRender() {
  if (!RAW) return;
  const hotels = getActiveHotels();
  const metric = document.getElementById('sazonMetric')?.value || 'occ';
  const meses = Object.keys(STORE).map(Number).sort((a,b)=>a-b);
  if (meses.length < 2) { document.getElementById('chartSazon').parentElement.innerHTML='<p style="color:var(--text-3);padding:20px">Precisas de pelo menos 2 meses de dados para ver sazonalidade.</p>'; return; }
  const mNames = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  const getVal = (h, m) => {
    const ops  = STORE[m]?.hotels_ops?.[h]  || {};
    const cost = STORE[m]?.hotels_costs?.[h] || {};
    const dis  = n(ops.Disponiveis?.[YR_CUR]), ocu = n(ops.Ocupados?.[YR_CUR]);
    const aloj = n(ops['Receita Alojamento']?.[YR_CUR]);
    const rec  = n(ops['Receita Total']?.[YR_CUR]), ctot = n(cost.TOTAIS?.[YR_CUR]);
    if (metric==='occ')     return dis>0?ocu/dis*100:null;
    if (metric==='adr')     return ocu>0?aloj/ocu:null;
    if (metric==='revpar')  return dis>0?aloj/dis:null;
    if (metric==='rec')     return rec||null;
    if (metric==='gop')     { const gv=gop(h,YR_CUR,STORE[m]); return rec>0&&gv!=null?gv/rec*100:null; }
    if (metric==='pessoal') return rec>0?n(cost.PESSOAL?.[YR_CUR])/rec*100:null;
    return null;
  };

  // Portefólio consolidado: rácios ponderados pela base operacional, não média simples de hotéis.
  const portValues = meses.map(m => {
    let rec=0, aloj=0, ocu=0, dis=0, pessoal=0, gopTot=0, hasGop=false;
    hotels.forEach(h=>{
      const ops=STORE[m]?.hotels_ops?.[h]||{}; const cost=STORE[m]?.hotels_costs?.[h]||{};
      rec+=n(ops['Receita Total']?.[YR_CUR]); aloj+=n(ops['Receita Alojamento']?.[YR_CUR]);
      ocu+=n(ops.Ocupados?.[YR_CUR]); dis+=n(ops.Disponiveis?.[YR_CUR]); pessoal+=n(cost.PESSOAL?.[YR_CUR]);
      const gv=gop(h,YR_CUR,STORE[m]); if(gv!=null){gopTot+=gv;hasGop=true;}
    });
    if(metric==='occ') return dis>0?ocu/dis*100:null;
    if(metric==='adr') return ocu>0?aloj/ocu:null;
    if(metric==='revpar') return dis>0?aloj/dis:null;
    if(metric==='rec') return rec||null;
    if(metric==='gop') return rec>0&&hasGop?gopTot/rec*100:null;
    if(metric==='pessoal') return rec>0?pessoal/rec*100:null;
    return null;
  });

  // Top 5 and bottom 5 hotels by variance
  const hotelVariance = hotels.map(h => {
    const vals = meses.map(m=>getVal(h,m)).filter(v=>v!==null);
    if (vals.length<2) return { h, variance:0 };
    const mn=Math.min(...vals), mx=Math.max(...vals);
    return { h, variance: mx-mn };
  }).sort((a,b)=>b.variance-a.variance);

  const topHotels = [...hotelVariance.slice(0,3), ...hotelVariance.slice(-2)];
  const colors = ['#c9a84c','#2a7d8c','#8b5cf6','#ef4444','#27ae60'];

  if (charts['chartSazon']) { charts['chartSazon'].destroy(); delete charts['chartSazon']; }
  const ctx = document.getElementById('chartSazon');
  if (ctx) {
    const datasets = [
      { label:'Portfólio (média)', data:portValues, borderColor:'#ffffff', backgroundColor:'rgba(255,255,255,.15)', borderWidth:3, tension:.3, pointRadius:5, pointBackgroundColor:'#ffffff' },
      ...topHotels.map((x,i) => ({
        label: x.h.length>18?x.h.substring(0,16)+'…':x.h,
        data: meses.map(m=>getVal(x.h,m)),
        borderColor: colors[i],
        backgroundColor: colors[i]+'33',
        borderWidth:2, tension:.3, pointRadius:3,
        pointBackgroundColor: colors[i],
        borderDash:[5,3]
      }))
    ];
    charts['chartSazon'] = new Chart(ctx, {
      type:'line', data:{ labels:meses.map(m=>mNames[m]), datasets },
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{
            position:'top',
            labels:{
              color:'#c8d6e5',
              font:{ size:11, weight:'600' },
              padding:16,
              usePointStyle:true,
              pointStyleWidth:12,
              boxHeight:8
            }
          }
        },
        scales:{
          x:{ ticks:{ color:'#8aa0b8', font:{ size:11 } }, grid:{ color:'rgba(255,255,255,.06)' } },
          y:{ ticks:{ color:'#8aa0b8', font:{ size:11 }, callback:v=>metric==='rec'?fmtV(v):metric==='occ'||metric==='gop'||metric==='pessoal'?v.toFixed(1)+'%':vgAnalysisSym()+v.toFixed(0) }, grid:{ color:'rgba(255,255,255,.06)' } }
        }
      }
    });
    requestAnimationFrame(()=>charts['chartSazon']?.resize());
  }

  // Heatmap — month × hotel, value = variation vs previous month
  const heatHotels = hotelVariance.slice(0,15);
  let tbl = `<table class="pl-table" style="min-width:${meses.length*80+160}px"><thead><tr>
    <th style="text-align:left">Hotel</th>
    ${meses.map(m=>`<th>${mNames[m]}</th>`).join('')}
  </tr></thead><tbody>`;

  heatHotels.forEach(({h}) => {
    const cells = meses.map((m,i) => {
      const v = getVal(h,m);
      if (v===null) return '<td class="pl-pct">—</td>';
      const vPrev = i>0?getVal(h,meses[i-1]):null;
      if (!vPrev) return `<td style="font-family:var(--mono);font-size:10px">${metric==='rec'?fmtV(v):fmt(v,1)}</td>`;
      const diff = v - vPrev;
      const color = Math.abs(diff)<1?'var(--text-3)':diff>0?'#27ae60':'#ef4444';
      return `<td style="color:${color};font-weight:700;font-family:var(--mono);font-size:10px" title="${metric==='rec'?fmtV(v):fmt(v,1)}">${diff>=0?'+':''}${metric==='rec'?fmtV(diff):fmt(diff,1)}</td>`;
    }).join('');
    tbl += `<tr><td>${h.replace('COLLECTION ','C. ')}</td>${cells}</tr>`;
  });

  document.getElementById('sazon-heatmap').innerHTML = tbl+'</tbody></table>';
}

// ==========================================================
// 5. SIMULADOR DE CENÁRIOS
// ==========================================================
function simInit() {
  if (!RAW) return;
  const hotels = getActiveHotels();
  const sel = document.getElementById('simHotel');
  if (!sel.options.length) {
    sel.innerHTML = hotels.map(h=>`<option value="${h}">${h}</option>`).join('');
  }
  simLoad();
}

function simLoad() {
  if (!RAW) return;
  const h = document.getElementById('simHotel')?.value;
  if (!h) return;

  const rec26  = n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_CUR]);
  const aloj26 = n(RAW.hotels_ops[h]?.['Receita Alojamento']?.[YR_CUR]);
  const ab26   = n(RAW.hotels_ops[h]?.['Receita FB']?.[YR_CUR]);
  const div26  = n(RAW.hotels_rev?.[h]?.['DIVERSOS']?.[YR_CUR]);
  const ctot26 = totalCosts(h,YR_CUR);
  const pes26  = n(RAW.hotels_costs[h]?.PESSOAL?.[YR_CUR]);
  const ene26  = n(RAW.hotels_costs[h]?.ENERGIA?.[YR_CUR]);
  const man26  = n(RAW.hotels_costs[h]?.MANUTENÇÃO?.[YR_CUR]);
  const dis26  = n(RAW.hotels_ops[h]?.Disponiveis?.[YR_CUR]);
  const ocu26  = n(RAW.hotels_ops[h]?.Ocupados?.[YR_CUR]);
  const gop26  = gop(h,YR_CUR) ?? (rec26 - ctot26);
  const occBase = dis26>0?ocu26/dis26*100:0;
  const adrBase = ocu26>0?aloj26/ocu26:0;
  // Guardar base em window para o simCalc aceder sem argumentos
  window._simBase = {rec26, aloj26, ab26, div26, ctot26, pes26, ene26, man26, dis26, ocu26, gop26};

  document.getElementById('sim-body').innerHTML = [
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">',
    '<div class="pl-dept-card">',
    '<div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;font-weight:700">&#9881; Par&#226;metros Base &#8212; ' + h.replace('COLLECTION ','C. ') + '</div>',
    [
      { id:'simOcc', l:'Occupancy %',      v:occBase.toFixed(1), step:0.5, min:0,   max:100 },
      { id:'simAdr', l:'ADR &#8364;',      v:adrBase.toFixed(2), step:1,   min:0,   max:999 },
      { id:'simAb',  l:'Var. A&amp;B %',   v:'0',                step:0.5, min:-50, max:50  },
      { id:'simDiv', l:'Var. Diversos %',  v:'0',                step:0.5, min:-50, max:50  },
      { id:'simPes', l:'Var. Pessoal %',   v:'0',                step:0.5, min:-50, max:50  },
      { id:'simEne', l:'Var. Energia %',   v:'0',                step:0.5, min:-50, max:50  },
      { id:'simMan', l:'Var. Manuten&#231;&#227;o %', v:'0',     step:0.5, min:-50, max:50  },
    ].map(function(p){
      return '<div style="margin-bottom:12px">' +
        '<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-3);margin-bottom:4px">' +
        '<span>' + p.l + '</span><span id="' + p.id + 'Lbl" style="color:var(--gold);font-weight:700">' + p.v + '</span></div>' +
        '<input type="range" id="' + p.id + '" min="' + p.min + '" max="' + p.max + '" step="' + p.step + '" value="' + p.v + '"' +
        ' oninput="document.getElementById(this.id+\u0027Lbl\u0027).textContent=this.value;simCalc()"' +
        ' style="width:100%;accent-color:var(--gold)"></div>';
    }).join(''),
    '</div>',
    '<div id="sim-result" class="pl-dept-card" style="display:flex;flex-direction:column;gap:12px;justify-content:center"></div>',
    '</div>',
    '<div style="height:200px"><canvas id="chartSim"></canvas></div>',
  ].join('');
  simCalc();
}

function simCalc() {
  const b = window._simBase || {};
  const rec26=b.rec26||0, aloj26=b.aloj26||0, ab26=b.ab26||0, div26=b.div26||0,
        ctot26=b.ctot26||0, pes26=b.pes26||0, ene26=b.ene26||0, man26=b.man26||0,
        dis26=b.dis26||0, ocu26=b.ocu26||0, baseGop=(b.gop26!=null?Number(b.gop26):(rec26-ctot26));
  const occNew  = Number(document.getElementById('simOcc')?.value  || 0) / 100;
  const adrNew  = Number(document.getElementById('simAdr')?.value  || 0);
  const abDelta  = Number(document.getElementById('simAb')?.value  || 0) / 100;
  const divDelta = Number(document.getElementById('simDiv')?.value || 0) / 100;
  const pesDelta = Number(document.getElementById('simPes')?.value  || 0) / 100;
  const eneDelta = Number(document.getElementById('simEne')?.value  || 0) / 100;
  const manDelta = Number(document.getElementById('simMan')?.value  || 0) / 100;

  const occBase = dis26>0?ocu26/dis26:0;
  const adrBase = ocu26>0?aloj26/ocu26:0;

  // Revenue components
  const occFactor = occBase>0 ? occNew/occBase : 1;
  const adrFactor = adrBase>0 ? adrNew/adrBase : 1;
  const alojNew = aloj26 * occFactor * adrFactor;
  const abNew   = ab26  * (1 + abDelta);
  const divNew  = div26 * (1 + divDelta);
  // recNew = aloj + ab + div + resto (rec que não é aloj/ab/div)
  const recResto = rec26 - aloj26 - ab26 - div26;
  const recNew  = alojNew + abNew + divNew + recResto;

  // New costs
  const pesNew = pes26 * (1+pesDelta);
  const eneNew = ene26 * (1+eneDelta);
  const manNew = man26 * (1+manDelta);
  const ctotNew = ctot26 - pes26 - ene26 - man26 + pesNew + eneNew + manNew;

  const gop26 = baseGop;
  const gopNew = gop26 + (recNew-rec26) - (ctotNew-ctot26);
  const gopDelta = gopNew - gop26;
  const gopPctBase = rec26>0?gop26/rec26*100:0;
  const gopPctNew  = recNew>0?gopNew/recNew*100:0;

  const color = gopNew >= gop26 ? '#27ae60' : '#ef4444';
  const fmtDelta = (v,base) => { const d=v-base; return `<span style="color:${d>=0?'#27ae60':'#ef4444'};font-size:10px">${d>=0?'+':''}${fmtV(d)}</span>`; };
  document.getElementById('sim-result').innerHTML = `
    <div style="font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:4px">📈 Resultado Simulado</div>
    <div>
      <div style="font-size:10px;color:var(--text-3)">Receita Simulada</div>
      <div style="font-size:20px;font-weight:800;color:var(--text-1);font-family:var(--mono)">${fmtV(recNew)} ${fmtDelta(recNew,rec26)}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-top:6px">
        <div style="font-size:9px;color:var(--text-3)">Aloj.<br><span style="color:var(--text-1);font-weight:700">${fmtV(alojNew)}</span><br>${fmtDelta(alojNew,aloj26)}</div>
        ${ab26>0?`<div style="font-size:9px;color:var(--text-3)">A&B<br><span style="color:var(--text-1);font-weight:700">${fmtV(abNew)}</span><br>${fmtDelta(abNew,ab26)}</div>`:''}
        ${div26>0?`<div style="font-size:9px;color:var(--text-3)">Diversos<br><span style="color:var(--text-1);font-weight:700">${fmtV(divNew)}</span><br>${fmtDelta(divNew,div26)}</div>`:''}
      </div>
    </div>
    <div><div style="font-size:10px;color:var(--text-3)">GOP Simulado</div><div style="font-size:24px;font-weight:800;color:${color};font-family:var(--mono)">${fmtV(gopNew)}</div><div style="font-size:11px;font-weight:700;color:${color}">${gopPctNew.toFixed(1)}% margem · ${gopDelta>=0?'+':''}${fmtV(gopDelta)} vs base</div></div>
    <div style="padding:10px;background:var(--surface-2);border-radius:8px">
      <div style="font-size:10px;color:var(--text-3);margin-bottom:4px">Impacto vs Cenário Base</div>
      <div style="font-size:11px;color:${gopPctNew>=gopPctBase?'#27ae60':'#ef4444'};font-weight:700">GOP%: ${gopPctBase.toFixed(1)}% → ${gopPctNew.toFixed(1)}% (${(gopPctNew-gopPctBase)>=0?'+':''}${(gopPctNew-gopPctBase).toFixed(1)}pp)</div>
    </div>
  `;

  if (charts['chartSim']) { charts['chartSim'].destroy(); delete charts['chartSim']; }
  const ctx = document.getElementById('chartSim');
  if (ctx) {
    charts['chartSim'] = new Chart(ctx, {
      type:'bar',
      data:{ labels:['Receita','Custos','GOP'],
        datasets:[
          { label:`Base ${YR_CUR}`, data:[rec26, ctot26, gop26], backgroundColor:['rgba(42,125,140,.6)','rgba(201,168,76,.6)','rgba(39,174,96,.5)'], borderRadius:4 },
          { label:'Simulado',  data:[recNew, ctotNew, gopNew], backgroundColor:['rgba(42,125,140,.9)','rgba(201,168,76,.9)',`${color}cc`], borderRadius:4 },
        ]},
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ position:'top', labels:{ color:'var(--text-2)', font:{ size:10 } } } },
        scales:{ x:{ ticks:{ color:'#6a7d96' }, grid:{ color:'rgba(255,255,255,.04)' } }, y:{ ticks:{ color:'#6a7d96', callback:v=>fmtV(v) }, grid:{ color:'rgba(255,255,255,.06)' } } }
      }
    });
    requestAnimationFrame(()=>charts['chartSim']?.resize());
  }
}

// ==========================================================
// 6. NOTAS OPERACIONAIS
// ==========================================================
let NOTAS_STORE = {};

async function notasIDBSave() {
  try { const db=await idbOpen(); await idbSet(db,'notasStore',NOTAS_STORE); db.close(); } catch(e){}
}
async function notasIDBLoad() {
  try { const db=await idbOpen(); const saved=await idbGet(db,'notasStore'); db.close(); if(saved) NOTAS_STORE=saved; } catch(e){}
}

function notasInit() {
  if (!RAW) return;
  const hotels = getActiveHotels();
  const sel = document.getElementById('notasHotel');
  if (!sel.options.length || sel.options.length !== hotels.length) {
    sel.innerHTML = hotels.map(h=>`<option value="${h}">${h}</option>`).join('');
  }
  notasIDBLoad().then(notasLoad);
}

function notasLoad() {
  const h = document.getElementById('notasHotel')?.value;
  const txt = document.getElementById('notasText');
  if (txt) txt.value = NOTAS_STORE[h] || '';
  if (document.getElementById('notasSaved')) document.getElementById('notasSaved').style.display = 'none';
  notasRenderAll();
}

function notasSave() {
  const h = document.getElementById('notasHotel')?.value;
  const txt = document.getElementById('notasText')?.value || '';
  if (!h) return;
  if (txt.trim()) NOTAS_STORE[h] = txt;
  else delete NOTAS_STORE[h];
  notasIDBSave();
  if (document.getElementById('notasSaved')) document.getElementById('notasSaved').style.display = 'inline';
  notasRenderAll();
}

function notasRenderAll() {
  const entries = Object.entries(NOTAS_STORE).filter(([,v])=>v.trim());
  const grid = document.getElementById('notas-all-grid');
  if (!grid) return;
  if (!entries.length) { grid.innerHTML=''; return; }
  grid.innerHTML = `
    <div style="font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:12px">Todas as Notas (${entries.length} hotéis)</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
    ${entries.map(([h,txt])=>`<div class="pl-dept-card">
      <div style="font-size:11px;font-weight:800;color:var(--text-1);margin-bottom:8px">📝 ${h.replace('COLLECTION ','C. ')}</div>
      <div style="font-size:11px;color:var(--text-2);line-height:1.6;white-space:pre-wrap">${txt}</div>
    </div>`).join('')}
    </div>`;
}

// NOTAS are now integrated directly in buildSessionSnapshot / restoreFromSnapshot above

function plExportCSV() {
  if (!RAW) return;
  const hotels = getActiveHotels();
  const cols = ['Hotel','Receita '+YR_PREV,'Receita '+YR_CUR,'Custos '+YR_PREV,'Custos '+YR_CUR,'GOP c/sede '+YR_PREV,'GOP c/sede '+YR_CUR,'GOP% '+YR_PREV,'GOP% '+YR_CUR,'Occ% '+YR_CUR,'ADR '+YR_CUR,'RevPAR '+YR_CUR];
  const rows = [cols.join(';')];
  hotels.forEach(h => {
    const r25 = n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_PREV]);
    const r26 = n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_CUR]);
    const c25 = totalCosts(h,YR_PREV);
    const c26 = totalCosts(h,YR_CUR);
    const g25 = gop(h,YR_PREV), g26 = gop(h,YR_CUR);
    const gp25 = gopPct(h,YR_PREV), gp26 = gopPct(h,YR_CUR);
    const o26 = occ(h,YR_CUR)||0, a26 = adr(h,YR_CUR)||0, rp26 = revpar(h,YR_CUR)||0;
    rows.push([h,fmt(r25,2),fmt(r26,2),fmt(c25,2),fmt(c26,2),fmt(g25,2),fmt(g26,2),fmt(gp25,2),fmt(gp26,2),fmt(o26,1),fmt(a26,2),fmt(rp26,2)].join(';'));
  });
  const blob = new Blob([rows.join('\n')], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='VG_PL_USALI.csv'; a.click();
  URL.revokeObjectURL(url);
}

// ==========================================================
