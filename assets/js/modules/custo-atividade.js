// ==========================================================
// CUSTO POR UNIDADE DE ACTIVIDADE MODULE
// ==========================================================
let cuaCurrentTab = 'resumo';

// Activity metrics definitions
const CUA_METRICS = [
  { id:'porDisp',    label:'€ / Quarto Disponível', num:'TOTAIS',    den:'Disponiveis', color:'#c9a84c' },
  { id:'porOcup',    label:'€ / Quarto Ocupado',    num:'TOTAIS',    den:'Ocupados',    color:'#2a7d8c' },
  { id:'porDorm',    label:'€ / Dormida',           num:'TOTAIS',    den:'Dormidas',    color:'#8b5cf6' },
  { id:'porHosp',    label:'€ / Hóspede',           num:'TOTAIS',    den:'Hospedes',    color:'#27ae60' },
  { id:'porCheg',    label:'€ / Chegada',           num:'TOTAIS',    den:'Chegadas',    color:'#e05c4e' },
];

function cuaCalc(hotel, costKey, opsKey, year) {
  const cost = n(RAW.hotels_costs[hotel]?.[costKey]?.[year]);
  const ops  = n(RAW.hotels_ops[hotel]?.[opsKey]?.[year]);
  return ops > 0 ? cost / ops : null;
}

function cuaPortfolio(costKey, opsKey, year, hotels) {
  const totalCost = (hotels||getActiveHotels()).reduce((s,h) => s + n(RAW.hotels_costs[h]?.[costKey]?.[year]), 0);
  const totalOps  = (hotels||getActiveHotels()).reduce((s,h) => s + n(RAW.hotels_ops[h]?.[opsKey]?.[year]), 0);
  return totalOps > 0 ? totalCost / totalOps : null;
}

function cuaSetTab(t) {
  cuaCurrentTab = t;
  document.querySelectorAll('#view-cua .pl-usali-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('cuatab-' + t)?.classList.add('active');
  document.querySelectorAll('#view-cua .pl-panel').forEach(p => p.style.display = 'none');
  document.getElementById('cua-' + t).style.display = '';
  cuaRender();
}

function cuaRender() {
  if (!RAW) return;
  const yearSel = document.getElementById('cuaRankYear');
  if (yearSel) {
    const wanted = [String(YR_CUR), String(YR_PREV)];
    const currentVals = [...yearSel.options].map(o=>o.value);
    if (currentVals.join('|') !== wanted.join('|')) {
      const prev = yearSel.value;
      yearSel.innerHTML = wanted.map(y=>`<option value="${y}">${y}</option>`).join('');
      yearSel.value = wanted.includes(prev) ? prev : String(YR_CUR);
    }
  }
  const activePanel = document.getElementById('cua-' + cuaCurrentTab);
  if (activePanel) {
    document.querySelectorAll('#view-cua .pl-panel').forEach(p => p.style.display = 'none');
    activePanel.style.display = '';
  }
  if (cuaCurrentTab === 'resumo')   cuaBuildResumo();
  if (cuaCurrentTab === 'ranking')  cuaBuildRanking();
  if (cuaCurrentTab === 'rubrica')  cuaBuildRubrica();
  if (cuaCurrentTab === 'evolucao') cuaBuildEvolucao();
  if (cuaCurrentTab === 'consumo')  cuaBuildConsumo();
  if (cuaCurrentTab === 'anomalias') cuaBuildAnomalias();
  if (cuaCurrentTab === 'benchmark') cuaBuildBenchmark();
  if (cuaCurrentTab === 'pergunta') cuaBuildPerguntaInit();
}

// ── 1. RESUMO PORTFÓLIO ───────────────────────────────────
function cuaBuildResumo() {
  const hotels = getActiveHotels();

  const metrics = [
    { label:'Custo Total / Quarto Disponível', key:'TOTAIS',    ops:'Disponiveis', icon:'🏨', bench25: null },
    { label:'Custo Total / Quarto Ocupado',    key:'TOTAIS',    ops:'Ocupados',    icon:'🛏', bench25: null },
    { label:'Custo Total / Dormida',           key:'TOTAIS',    ops:'Dormidas',    icon:'🌙', bench25: null },
    { label:'Custo Total / Hóspede',           key:'TOTAIS',    ops:'Hospedes',    icon:'👤', bench25: null },
    { label:'Custo Total / Chegada',           key:'TOTAIS',    ops:'Chegadas',    icon:'✈️', bench25: null },
    { label:'Pessoal / Quarto Ocupado',        key:'PESSOAL',   ops:'Ocupados',    icon:'👥', bench25: null },
    { label:'F&B Directo / Dormida',           key:'_FB',       ops:'Dormidas',    icon:'🍽', bench25: null },
    { label:'Energia / Quarto Disponível',     key:'ENERGIA',   ops:'Disponiveis', icon:'⚡', bench25: null },
    { label:'Manutenção / Quarto Disponível',  key:'MANUTENÇÃO',ops:'Disponiveis', icon:'🔧', bench25: null },
  ];

  const cardsHtml = metrics.map(m => {
    const getCost = (y) => m.key === '_FB'
      ? hotels.reduce((s,h) => s + n(RAW.hotels_costs[h]?.COMIDAS?.[y]) + n(RAW.hotels_costs[h]?.BEBIDAS?.[y]), 0)
      : hotels.reduce((s,h) => s + n(RAW.hotels_costs[h]?.[m.key]?.[y]), 0);
    const getOps = (y) => hotels.reduce((s,h) => s + n(RAW.hotels_ops[h]?.[m.ops]?.[y]), 0);

    const c25 = getCost(YR_PREV), o25 = getOps(YR_PREV);
    const c26 = getCost(YR_CUR), o26 = getOps(YR_CUR);
    const v25 = o25 > 0 ? c25/o25 : null;
    const v26 = o26 > 0 ? c26/o26 : null;
    const varPct = v25 && v26 ? (v26-v25)/v25*100 : null;
    const better = varPct !== null && varPct < 0;
    const varColor = varPct === null ? 'var(--text-3)' : better ? '#27ae60' : '#e05c4e';

    return `<div class="pl-dept-card" style="border-left:3px solid ${varColor}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div class="pl-dept-name" style="margin-bottom:4px">${m.icon} ${m.label}</div>
        ${varPct !== null ? `<span style="font-size:12px;font-weight:800;color:${varColor}">${varPct>=0?'+':''}${fmt(varPct,1)}%</span>` : ''}
      </div>
      <div style="display:flex;gap:12px;margin-top:6px">
        <div style="flex:1;background:var(--surface-2);border-radius:8px;padding:8px;text-align:center">
          <div style="font-size:9px;color:var(--text-3);margin-bottom:2px">${YR_PREV}</div>
          <div style="font-size:18px;font-weight:800;color:var(--text-2);font-family:var(--mono)">${v25 !== null ? '€'+fmt(v25,2) : '—'}</div>
        </div>
        <div style="display:flex;align-items:center;color:var(--text-3)">→</div>
        <div style="flex:1;background:var(--surface-2);border-radius:8px;padding:8px;text-align:center;border:1px solid ${varColor}44">
          <div style="font-size:9px;color:var(--text-3);margin-bottom:2px">${YR_CUR}</div>
          <div style="font-size:18px;font-weight:800;color:${varColor};font-family:var(--mono)">${v26 !== null ? '€'+fmt(v26,2) : '—'}</div>
        </div>
      </div>
    </div>`;
  }).join('');

  document.getElementById('cua-resumo-cards').innerHTML = `<div class="pl-dept-grid">${cardsHtml}</div>`;

  // Bar chart — 5 main metrics comparison 2025 vs 2026
  if (charts['chartCuaResumo']) { charts['chartCuaResumo'].destroy(); delete charts['chartCuaResumo']; }
  const ctx = document.getElementById('chartCuaResumo');
  if (!ctx) return;
  const mainMetrics = metrics.slice(0,5);
  const vals25 = mainMetrics.map(m => {
    const c = hotels.reduce((s,h) => s + n(RAW.hotels_costs[h]?.[m.key]?.[YR_PREV]), 0);
    const o = hotels.reduce((s,h) => s + n(RAW.hotels_ops[h]?.[m.ops]?.[YR_PREV]), 0);
    return o > 0 ? c/o : 0;
  });
  const vals26 = mainMetrics.map(m => {
    const c = hotels.reduce((s,h) => s + n(RAW.hotels_costs[h]?.[m.key]?.[YR_CUR]), 0);
    const o = hotels.reduce((s,h) => s + n(RAW.hotels_ops[h]?.[m.ops]?.[YR_CUR]), 0);
    return o > 0 ? c/o : 0;
  });
  charts['chartCuaResumo'] = new Chart(ctx, {
    type:'bar',
    data:{ labels: mainMetrics.map(m=>m.label.replace('Custo Total / ','')),
      datasets:[
        { label:YR_PREV, data:vals25, backgroundColor:'rgba(42,125,140,.6)', borderColor:'#2a7d8c', borderWidth:1, borderRadius:3 },
        { label:YR_CUR, data:vals26, backgroundColor:'rgba(201,168,76,.65)', borderColor:'#c9a84c', borderWidth:1, borderRadius:3 },
      ]},
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{position:'top',labels:{color:'var(--text-2)',font:{size:10}}} },
      scales:{
        x:{ticks:{color:'#6a7d96',font:{size:10}}, grid:{color:'rgba(255,255,255,.04)'}},
        y:{ticks:{color:'#6a7d96',callback:v=>'€'+fmt(v,0)}, grid:{color:'rgba(255,255,255,.06)'}}
      }
    }
  });
  requestAnimationFrame(() => charts['chartCuaResumo']?.resize());
}

// ── 2. RANKING POR HOTEL ──────────────────────────────────
function cuaBuildRanking() {
  const hotels = getActiveHotels();
  const metric = document.getElementById('cuaRankMetric')?.value || 'porOcup';
  const year   = document.getElementById('cuaRankYear')?.value   || YR_CUR;

  const metricMap = {
    porDisp:     { cost:'TOTAIS',    ops:'Disponiveis', label:'Custo Total / Quarto Disponível' },
    porOcup:     { cost:'TOTAIS',    ops:'Ocupados',    label:'Custo Total / Quarto Ocupado' },
    porDorm:     { cost:'TOTAIS',    ops:'Dormidas',    label:'Custo Total / Dormida' },
    porHosp:     { cost:'TOTAIS',    ops:'Hospedes',    label:'Custo Total / Hóspede' },
    porCheg:     { cost:'TOTAIS',    ops:'Chegadas',    label:'Custo Total / Chegada' },
    pessoalOcup: { cost:'PESSOAL',   ops:'Ocupados',    label:'Pessoal / Quarto Ocupado' },
    fbDorm:      { cost:'_FB',       ops:'Dormidas',    label:'F&B Directo / Dormida' },
    energiaDisp: { cost:'ENERGIA',   ops:'Disponiveis', label:'Energia / Quarto Disponível' },
    manutDisp:   { cost:'MANUTENÇÃO',ops:'Disponiveis', label:'Manutenção / Quarto Disponível' },
  };

  const m = metricMap[metric];
  const getCost = (h, y) => m.cost === '_FB'
    ? n(RAW.hotels_costs[h]?.COMIDAS?.[y]) + n(RAW.hotels_costs[h]?.BEBIDAS?.[y])
    : n(RAW.hotels_costs[h]?.[m.cost]?.[y]);

  const rows = hotels.map(h => {
    const ops = n(RAW.hotels_ops[h]?.[m.ops]?.[year]);
    if (!ops) return null;
    const cost = getCost(h, year);
    const val = cost / ops;
    const val_prev = (() => {
      const o2 = n(RAW.hotels_ops[h]?.[m.ops]?.[YR_PREV]);
      return o2 > 0 ? getCost(h,YR_PREV) / o2 : null;
    })();
    return { h, val, val_prev, ops };
  }).filter(Boolean).sort((a,b) => a.val - b.val);

  if (!rows.length) { document.getElementById('cua-ranking-table').innerHTML = '<p style="color:var(--text-3)">Sem dados.</p>'; return; }

  // Median for colouring
  const med = rows[Math.floor(rows.length/2)].val;

  // Chart
  if (charts['chartCuaRanking']) { charts['chartCuaRanking'].destroy(); delete charts['chartCuaRanking']; }
  const ctx = document.getElementById('chartCuaRanking');
  if (ctx) {
    const colors = rows.map(r => r.val <= med ? 'rgba(39,174,96,.7)' : 'rgba(224,92,78,.7)');
    charts['chartCuaRanking'] = new Chart(ctx, {
      type:'bar',
      data:{ labels: rows.map(r=>r.h.length>18?r.h.substring(0,16)+'…':r.h),
        datasets:[{ label:m.label, data:rows.map(r=>r.val),
          backgroundColor:colors, borderColor:colors.map(c=>c.replace('.7','.9')), borderWidth:1, borderRadius:3 }]},
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false},
          annotation:{ annotations:{ medLine:{ type:'line', yMin:med, yMax:med,
            borderColor:'rgba(201,168,76,.6)', borderDash:[4,3], borderWidth:1.5,
            label:{content:'Mediana',enabled:true,position:'end',font:{size:9}} }}}},
        scales:{
          x:{ticks:{color:'#6a7d96',font:{size:9},maxRotation:45},grid:{color:'rgba(255,255,255,.04)'}},
          y:{ticks:{color:'#6a7d96',callback:v=>'€'+fmt(v,2)},grid:{color:'rgba(255,255,255,.06)'},
            title:{display:true,text:m.label,color:'#6a7d96',font:{size:9}}}
        }
      }
    });
    requestAnimationFrame(() => charts['chartCuaRanking']?.resize());
  }

  // Table
  let tbl = `<table class="pl-table"><thead><tr>
    <th style="text-align:left">#</th><th style="text-align:left">Hotel</th>
    <th>${m.label} (${year})</th><th>Ano anterior</th><th>Var %</th><th>Eficiência</th>
  </tr></thead><tbody>`;
  tbl += `<tr class="pl-median-row"><td>—</td><td>Mediana portfólio</td>
    <td>€${fmt(med,2)}</td><td>—</td><td>—</td><td>—</td></tr>`;
  rows.forEach((r,i) => {
    const vp = r.val_prev ? (r.val - r.val_prev)/r.val_prev*100 : null;
    const cls = r.val <= med ? 'pl-cell-good' : 'pl-cell-bad';
    const eff = r.val <= med ? '🟢 Eficiente' : '🔴 Acima da mediana';
    tbl += `<tr>
      <td style="color:var(--text-3)">${i+1}</td>
      <td>${r.h.replace('COLLECTION ','C. ')}</td>
      <td class="${cls}">€${fmt(r.val,2)}</td>
      <td style="color:var(--text-3);font-family:var(--mono)">${r.val_prev ? '€'+fmt(r.val_prev,2) : '—'}</td>
      <td style="color:${vp===null?'var(--text-3)':vp<0?'#27ae60':'#e05c4e'};font-weight:700">${vp!==null?(vp>=0?'+':'')+fmt(vp,1)+'%':'—'}</td>
      <td style="font-size:11px">${eff}</td>
    </tr>`;
  });
  document.getElementById('cua-ranking-table').innerHTML = tbl + '</tbody></table>';
}

// ── 3. DETALHE POR RUBRICA ────────────────────────────────
function cuaBuildRubrica() {
  const hotels = getActiveHotels();
  const year = YR_CUR;

  const rubricas = [
    { key:'PESSOAL',      label:'👥 Pessoal',      color:'#4a6fa5' },
    { key:'OPERACIONAIS', label:'⚙ Operacionais',   color:'#2a7d8c' },
    { key:'MANUTENÇÃO',   label:'🔧 Manutenção',    color:'#c9a84c' },
    { key:'ENERGIA',      label:'⚡ Energia',        color:'#f59e0b' },
    { key:'COMIDAS',      label:'🍽 Comidas',        color:'#27ae60' },
    { key:'BEBIDAS',      label:'🍷 Bebidas',        color:'#8b5cf6' },
    { key:'MARKETING',    label:'📢 Marketing',      color:'#e05c4e' },
  ];

  const opsUnits = [
    { key:'Ocupados',    label:'/ Quarto Ocupado' },
    { key:'Dormidas',    label:'/ Dormida' },
    { key:'Hospedes',    label:'/ Hóspede' },
  ];

  const cards = rubricas.map(rub => {
    const cardsInner = opsUnits.map(u => {
      const vals = hotels.map(h => {
        const c = n(RAW.hotels_costs[h]?.[rub.key]?.[year]);
        const o = n(RAW.hotels_ops[h]?.[u.key]?.[year]);
        return o > 0 ? c/o : null;
      }).filter(v => v !== null);
      if (!vals.length) return '';
      const sum_c = hotels.reduce((s,h) => s + n(RAW.hotels_costs[h]?.[rub.key]?.[year]), 0);
      const sum_o = hotels.reduce((s,h) => s + n(RAW.hotels_ops[h]?.[u.key]?.[year]), 0);
      const avg = sum_o > 0 ? sum_c/sum_o : null;
      const min_h = hotels.reduce((best,h) => {
        const c=n(RAW.hotels_costs[h]?.[rub.key]?.[year]), o=n(RAW.hotels_ops[h]?.[u.key]?.[year]);
        if(!o) return best;
        const v=c/o; return (!best || v<best.v) ? {h,v} : best;
      }, null);
      const max_h = hotels.reduce((worst,h) => {
        const c=n(RAW.hotels_costs[h]?.[rub.key]?.[year]), o=n(RAW.hotels_ops[h]?.[u.key]?.[year]);
        if(!o) return worst;
        const v=c/o; return (!worst || v>worst.v) ? {h,v} : worst;
      }, null);
      return `<div style="background:var(--surface-2);border-radius:8px;padding:10px;flex:1;min-width:140px">
        <div style="font-size:9px;color:var(--text-3);margin-bottom:4px;text-transform:uppercase;letter-spacing:.8px">${u.label}</div>
        <div style="font-size:20px;font-weight:800;color:${rub.color};font-family:var(--mono)">€${avg!==null?fmt(avg,2):'—'}</div>
        <div style="font-size:10px;color:var(--text-3);margin-top:6px">
          🟢 Melhor: <strong>${min_h?min_h.h.replace('COLLECTION ','C. ')+'  €'+fmt(min_h.v,2):'—'}</strong>
        </div>
        <div style="font-size:10px;color:var(--text-3)">
          🔴 Pior: <strong>${max_h?max_h.h.replace('COLLECTION ','C. ')+'  €'+fmt(max_h.v,2):'—'}</strong>
        </div>
      </div>`;
    }).join('');

    return `<div class="pl-dept-card" style="border-left:3px solid ${rub.color}">
      <div class="pl-dept-name" style="margin-bottom:10px">${rub.label} — Custo por Unidade de Actividade (${YR_CUR})</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">${cardsInner}</div>
    </div>`;
  }).join('');

  document.getElementById('cua-rubrica-grid').innerHTML = `<div style="display:flex;flex-direction:column;gap:12px">${cards}</div>`;
}

// ── 4. EVOLUÇÃO 2025→2026 ─────────────────────────────────
function cuaBuildEvolucao() {
  const hotels = getActiveHotels();

  const metricsEv = [
    { label:'C.Total / Qrt Disponível', cost:'TOTAIS',    ops:'Disponiveis' },
    { label:'C.Total / Qrt Ocupado',    cost:'TOTAIS',    ops:'Ocupados' },
    { label:'C.Total / Dormida',        cost:'TOTAIS',    ops:'Dormidas' },
    { label:'C.Total / Hóspede',        cost:'TOTAIS',    ops:'Hospedes' },
    { label:'Pessoal / Qrt Ocupado',    cost:'PESSOAL',   ops:'Ocupados' },
    { label:'Energia / Qrt Disp.',      cost:'ENERGIA',   ops:'Disponiveis' },
    { label:'Manut. / Qrt Disp.',       cost:'MANUTENÇÃO',ops:'Disponiveis' },
  ];

  const sorted = [...hotels].sort((a,b) => {
    const getV = (h,y) => {
      const c=totalCosts(h,y), o=n(RAW.hotels_ops[h]?.Ocupados?.[y]);
      return o>0?c/o:null;
    };
    const va = getV(a,YR_CUR), vb = getV(b,YR_CUR);
    return (va||999) - (vb||999);
  });

  let tbl = `<table class="pl-table" style="min-width:900px"><thead><tr>
    <th style="text-align:left;min-width:140px">Hotel</th>
    ${metricsEv.map(m=>`<th style="white-space:nowrap">${m.label}</th>`).join('')}
  </tr></thead><tbody>`;

  sorted.forEach(h => {
    const cells = metricsEv.map(m => {
      const c25=n(RAW.hotels_costs[h]?.[m.cost]?.[YR_PREV]), o25=n(RAW.hotels_ops[h]?.[m.ops]?.[YR_PREV]);
      const c26=n(RAW.hotels_costs[h]?.[m.cost]?.[YR_CUR]), o26=n(RAW.hotels_ops[h]?.[m.ops]?.[YR_CUR]);
      const v25 = o25>0?c25/o25:null, v26 = o26>0?c26/o26:null;
      if (!v25||!v26) return '<td class="pl-pct">—</td>';
      const vp = (v26-v25)/v25*100;
      const cls = vp<-5?'pl-cell-good':vp>5?'pl-cell-bad':'pl-pct';
      const arrow = vp<0?'▼':'▲';
      return `<td class="${cls}" title="${YR_PREV}: €${fmt(v25,2)} → ${YR_CUR}: €${fmt(v26,2)}">${arrow} ${vp>=0?'+':''}${fmt(vp,1)}%</td>`;
    }).join('');
    tbl += `<tr><td>${h.replace('COLLECTION ','C. ')}</td>${cells}</tr>`;
  });

  // Portfolio summary row
  const summaryRow = metricsEv.map(m => {
    const c25=hotels.reduce((s,h)=>s+n(RAW.hotels_costs[h]?.[m.cost]?.[YR_PREV]),0);
    const o25=hotels.reduce((s,h)=>s+n(RAW.hotels_ops[h]?.[m.ops]?.[YR_PREV]),0);
    const c26=hotels.reduce((s,h)=>s+n(RAW.hotels_costs[h]?.[m.cost]?.[YR_CUR]),0);
    const o26=hotels.reduce((s,h)=>s+n(RAW.hotels_ops[h]?.[m.ops]?.[YR_CUR]),0);
    const v25=o25>0?c25/o25:null, v26=o26>0?c26/o26:null;
    if(!v25||!v26) return '<td class="pl-pct">—</td>';
    const vp=(v26-v25)/v25*100;
    const cls=vp<-5?'pl-cell-good':vp>5?'pl-cell-bad':'pl-pct';
    return `<td class="${cls}" style="font-weight:800">${vp>=0?'+':''}${fmt(vp,1)}%</td>`;
  }).join('');
  tbl += `<tr style="background:var(--gold-dim);border-top:2px solid var(--gold)">
    <td style="color:var(--gold);font-weight:800">⬛ Portfólio</td>${summaryRow}</tr>`;

  document.getElementById('cua-evolucao-table').innerHTML = tbl + '</tbody></table>';
}



// ── 5. CONSUMO POR CLIENTE — análise cuidada ─────────────
function cuaEsc(s){ return String(s ?? '').replace(/[&<>]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
function cuaEuro(v,dec=0){ if(v==null || !isFinite(v)) return '—'; return '€'+Number(v).toLocaleString('pt-PT',{minimumFractionDigits:dec,maximumFractionDigits:dec}); }
function cuaPct(v,dec=1){ if(v==null || !isFinite(v)) return '—'; return (v>=0?'+':'')+Number(v).toLocaleString('pt-PT',{minimumFractionDigits:dec,maximumFractionDigits:dec})+'%'; }
function cuaPp(v,dec=1){ if(v==null || !isFinite(v)) return '—'; return (v>=0?'+':'')+Number(v).toLocaleString('pt-PT',{minimumFractionDigits:dec,maximumFractionDigits:dec})+' p.p.'; }
function cuaHotelShort(h){ return String(h||'').replace('COLLECTION ','C. '); }
function cuaActiveHotelsSafe(){ try { return getActiveHotels().filter(h=>RAW?.hotels_ops?.[h]); } catch(e){ return Object.keys(RAW?.hotels_ops||{}); } }
function cuaValue(h,costKey,opsKey,year){ const c=n(RAW?.hotels_costs?.[h]?.[costKey]?.[year]); const o=n(RAW?.hotels_ops?.[h]?.[opsKey]?.[year]); return o>0 ? c/o : null; }
function cuaCost(h,costKey,year){ return n(RAW?.hotels_costs?.[h]?.[costKey]?.[year]); }
function cuaOps(h,opsKey,year){ return n(RAW?.hotels_ops?.[h]?.[opsKey]?.[year]); }
function cuaMedian(vals){ const a=vals.filter(v=>v!=null&&isFinite(v)).sort((x,y)=>x-y); if(!a.length)return null; const m=Math.floor(a.length/2); return a.length%2?a[m]:(a[m-1]+a[m])/2; }
function cuaAvg(vals){ const a=vals.filter(v=>v!=null&&isFinite(v)); return a.length?a.reduce((s,v)=>s+v,0)/a.length:null; }
function cuaEnsureHotelSelect(id){
  const sel=document.getElementById(id); if(!sel||!RAW)return;
  const hotels=cuaActiveHotelsSafe(); const old=sel.value;
  sel.innerHTML='<option value="__portfolio__">Portefólio filtrado</option>'+hotels.map(h=>`<option value="${cuaEsc(h)}">${cuaEsc(cuaHotelShort(h))}</option>`).join('');
  if(old && [...sel.options].some(o=>o.value===old)) sel.value=old;
}

function cuaCompraDataReady(){
  try { return !!(typeof CD!=='undefined' && CD && ((Array.isArray(CD.P)&&CD.P.length) || (Array.isArray(CD.PM)&&CD.PM.length)) && Array.isArray(HOT) && Array.isArray(ART)); } catch(e){ return false; }
}
function cuaArticleFamilyMap(){
  const m=new Map();
  try{
    if(typeof CD!=='undefined' && CD && Array.isArray(CD.A)){
      for(const r of CD.A){ if(r && r.length>5 && !m.has(r[5])) m.set(r[5], {fam:r[2], grp:r[4]}); }
    }
  }catch(e){}
  return m;
}
function cuaArticlePriceRows(hotelsWanted){
  const out=[];
  if(!cuaCompraDataReady()) return out;
  const wanted = new Set((hotelsWanted||[]).map(h=>String(h).toUpperCase()));
  const passHotel = hi => !wanted.size || wanted.has(String(HOT?.[hi]||'').toUpperCase());
  try{
    // Preferir PM quando existe, porque respeita melhor o ano/mês. Agrega para formato [art, forn, hotel, valor, qtd].
    if(Array.isArray(CD.PM) && CD.PM.length && Array.isArray(MESES)){
      const map=new Map();
      for(const r of CD.PM){
        if(!r || r.length<6) continue;
        const mesVal = MESES[r[3]];
        if(mesVal && Math.floor(Number(mesVal)/100)!==Number(YR_CUR)) continue;
        if(!passHotel(r[2])) continue;
        const val=Number(r[4]||0), qtd=Number(r[5]||0);
        if(val<=0 || qtd<=0) continue;
        const k=[r[0],r[1],r[2]].join('|');
        let o=map.get(k); if(!o){ o=[r[0],r[1],r[2],0,0]; map.set(k,o); }
        o[3]+=val; o[4]+=qtd;
      }
      for(const v of map.values()) if(v[4]>0) out.push(v);
      if(out.length) return out;
    }
    if(Array.isArray(CD.P)){
      for(const r of CD.P){
        if(!r || r.length<5) continue;
        if(!passHotel(r[2])) continue;
        const val=Number(r[3]||0), qtd=Number(r[4]||0);
        if(val<=0 || qtd<=0) continue;
        out.push([r[0],r[1],r[2],val,qtd]);
      }
    }
  }catch(e){ console.warn('cuaArticlePriceRows', e); }
  return out;
}
function cuaArticleBenchmarks(){
  const out=new Map();
  const rows=cuaArticlePriceRows([]);
  const byArt=new Map();
  for(const r of rows){
    const a=r[0], p=Number(r[3])/Number(r[4]);
    if(!isFinite(p) || p<=0) continue;
    if(!byArt.has(a)) byArt.set(a,[]);
    byArt.get(a).push({hotel:HOT?.[r[2]]||'', forn:FORN?.[r[1]]||'', p, q:Number(r[4]), v:Number(r[3])});
  }
  const famMap=cuaArticleFamilyMap();
  for(const [a,lst] of byArt){
    const famIdx=famMap.get(a)?.fam;
    const famName=String(FAM?.[famIdx]||'');
    if(/PESSOAL|ENERGIA|NAO OPERACIONAIS|NÃO OPERACIONAIS/i.test(famName)) continue;
    const credible=lst.filter(x=>x.q>=3 && x.p>0 && x.p<250).sort((x,y)=>x.p-y.p);
    if(credible.length<2) continue;
    const med=cuaMedian(credible.map(x=>x.p));
    const minRow=credible[0];
    if(!isFinite(med) || med<=0) continue;
    out.set(a,{med,min:minRow.p,minHotel:minRow.hotel,minForn:minRow.forn,n:credible.length});
  }
  return out;
}
function cuaTopArticleDeviations(hName, limit=8){
  const rows=cuaArticlePriceRows(hName?[hName]:[]);
  if(!rows.length) return [];
  const bench=cuaArticleBenchmarks();
  const famMap=cuaArticleFamilyMap();
  const byArt=new Map();
  for(const r of rows){
    const a=r[0], v=Number(r[3]||0), q=Number(r[4]||0);
    if(v<=0||q<=0) continue;
    let o=byArt.get(a);
    if(!o){ const fg=famMap.get(a)||{}; o={v:0,q:0,fam:fg.fam,grp:fg.grp,forns:new Set(),hotels:new Set()}; byArt.set(a,o); }
    o.v+=v; o.q+=q; o.forns.add(FORN?.[r[1]]||''); o.hotels.add(HOT?.[r[2]]||'');
  }
  const res=[];
  for(const [a,o] of byArt){
    const b=bench.get(a); if(!b||o.q<=0) continue;
    const p=o.v/o.q;
    if(!isFinite(p)||p<=0) continue;
    // Evitar falsos positivos por unidades/embalagens incomparáveis.
    if(p<=b.med*1.08 || p>b.med*3) continue;
    const sobre=(p-b.med)*o.q;
    if(sobre<50) continue;
    res.push({art:a, nome:ART?.[a]||('Artigo '+a), fam:FAM?.[o.fam]||'', grp:GRP?.[o.grp]||'', p, med:b.med, min:b.min, minHotel:b.minHotel, minForn:b.minForn, q:o.q, v:o.v, sobre, fornecedores:[...o.forns].filter(Boolean).slice(0,3).join(', ')});
  }
  return res.sort((a,b)=>b.sobre-a.sobre).slice(0,limit);
}
function cuaCostRowsForHotel(h,opsKey){
  const keys=['TOTAIS','COMIDAS','BEBIDAS','PESSOAL','ENERGIA','MANUTENÇÃO','OPERACIONAIS','MARKETING'];
  const hotels=cuaActiveHotelsSafe();
  return keys.map(k=>{
    const v26=cuaValue(h,k,opsKey,YR_CUR), v25=cuaValue(h,k,opsKey,YR_PREV);
    const peers=hotels.filter(x=>x!==h).map(x=>cuaValue(x,k,opsKey,YR_CUR)).filter(v=>v!=null);
    const med=cuaMedian(peers.length?peers:hotels.map(x=>cuaValue(x,k,opsKey,YR_CUR)));
    const gapMed=(v26!=null&&med)?v26-med:null;
    const varPct=(v26!=null&&v25)?(v26-v25)/Math.abs(v25)*100:null;
    const impact=(gapMed!=null&&gapMed>0)?gapMed*cuaOps(h,opsKey,YR_CUR):0;
    return {k,v26,v25,med,gapMed,varPct,impact,cost:cuaCost(h,k,YR_CUR)};
  }).filter(x=>x.v26!=null);
}
function cuaBuildConsumo(){
  cuaEnsureHotelSelect('cuaConsHotel');
  const sel=document.getElementById('cuaConsHotel');
  const opsKey=document.getElementById('cuaConsBase')?.value||'Hospedes';
  const hotels=cuaActiveHotelsSafe();
  const h=sel?.value && sel.value!=='__portfolio__' ? sel.value : (hotels[0]||'');
  const body=document.getElementById('cua-consumo-body'); if(!body) return;
  if(!h){ body.innerHTML='<div class="pl-dept-card">Sem dados.</div>'; return; }
  const rows=cuaCostRowsForHotel(h,opsKey).sort((a,b)=>(b.impact||0)-(a.impact||0));
  const total=rows.find(r=>r.k==='TOTAIS');
  const anom=rows.filter(r=>r.k!=='TOTAIS' && ((r.gapMed||0)>0 || (r.varPct||0)>8)).slice(0,5);
  const artigos=cuaTopArticleDeviations(h,10);
  const unitLabel={Hospedes:'hóspede',Dormidas:'dormida',Ocupados:'quarto ocupado',Chegadas:'chegada',Disponiveis:'quarto disponível'}[opsKey]||opsKey;
  const totalTxt= total ? `O custo total por ${unitLabel} em ${cuaHotelShort(h)} é ${cuaEuro(total.v26,2)} em ${YR_CUR}. Em ${YR_PREV} era ${cuaEuro(total.v25,2)}, o que representa ${cuaPct(total.varPct)}. Face à mediana do portefólio filtrado (${cuaEuro(total.med,2)}), o hotel está ${total.gapMed>=0?'acima':'abaixo'} em ${cuaEuro(Math.abs(total.gapMed||0),2)} por ${unitLabel}.` : 'Sem leitura agregada suficiente para custo total.';
  let analise=`<div class="pl-dept-card" style="border-left:3px solid var(--gold)">
    <div class="pl-dept-name">🧾 Análise cuidada — ${cuaEsc(cuaHotelShort(h))} · base ${cuaEsc(unitLabel)}</div>
    <p style="font-size:12px;color:var(--text-2);line-height:1.75;margin-top:8px">${totalTxt}</p>`;
  if(anom.length){
    const principal=anom[0];
    analise+=`<p style="font-size:12px;color:var(--text-2);line-height:1.75;margin-top:8px">O principal foco de desvio é <strong style="color:var(--gold)">${principal.k}</strong>: ${cuaEuro(principal.v26,2)} por ${unitLabel}, contra mediana de ${cuaEuro(principal.med,2)}. Isto equivale a um diferencial estimado de ${cuaEuro(principal.impact,0)} no período, antes de qualquer ajustamento por mix operacional, eventos, regimes ou sazonalidade. ${principal.varPct!=null?`Face ao ano anterior, a rubrica variou ${cuaPct(principal.varPct)}.`:''}</p>`;
    analise+=`<p style="font-size:12px;color:var(--text-2);line-height:1.75;margin-top:8px">Os restantes pontos que justificam atenção são: ${anom.slice(1).map(r=>`<strong>${r.k}</strong> (${cuaEuro(r.v26,2)} por ${unitLabel}; gap vs mediana ${r.gapMed>=0?'+':''}${cuaEuro(r.gapMed||0,2)}; impacto ${cuaEuro(r.impact,0)})`).join('; ') || 'sem desvios materiais adicionais'}.</p>`;
  } else {
    analise+=`<p style="font-size:12px;color:var(--text-2);line-height:1.75;margin-top:8px">Não há rubricas com desvio material face à mediana do portefólio filtrado nesta base. Ainda assim, convém validar as rubricas de maior peso absoluto, porque um custo alinhado por cliente pode esconder desperdício em dias de menor ocupação.</p>`;
  }
  if(artigos.length){
    analise+=`<p style="font-size:12px;color:var(--text-2);line-height:1.75;margin-top:8px">No detalhe de artigos, os maiores sinais de sobrecusto face à mediana do grupo concentram-se em ${artigos.slice(0,3).map(a=>`<strong>${cuaEsc(a.nome)}</strong> (${cuaEuro(a.sobre,0)})`).join(', ')}. Estes artigos devem ser verificados em preço contratual, unidade de compra, embalagem, fornecedor e eventual erro de codificação/quantidade.</p>`;
  } else {
    analise+=`<p style="font-size:12px;color:var(--text-2);line-height:1.75;margin-top:8px">Não foram encontrados artigos com sobrepreço relevante no extrato de compras carregado, ou o extrato não está disponível para este hotel/período. A análise mantém-se válida ao nível P&amp;L, mas fica menos fina ao nível de artigo.</p>`;
  }
  analise+=`<p style="font-size:12px;color:var(--text-2);line-height:1.75;margin-top:8px"><strong>Leitura operacional:</strong> começar por confirmar se o desvio é estrutural ou conjuntural. Se for estrutural, rever capitação, fichas técnicas, porções, quebras, escalas e negociação de fornecedores. Se for conjuntural, identificar eventos, grupos, regimes, ocupação baixa ou cargas extraordinárias que possam justificar o custo unitário.</p></div>`;
  const kpis=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin-bottom:14px">
    ${rows.slice(0,4).map(r=>`<div class="pl-dept-card"><div class="pl-dept-name">${cuaEsc(r.k)} / ${cuaEsc(unitLabel)}</div><div style="font:800 22px var(--mono);color:${(r.gapMed||0)>0?'#e05c4e':'#27ae60'}">${cuaEuro(r.v26,2)}</div><div style="font-size:10px;color:var(--text-3)">Mediana: ${cuaEuro(r.med,2)} · Var: ${r.varPct!=null?cuaPct(r.varPct):'—'}</div></div>`).join('')}
  </div>`;
  const table=`<div class="pl-dept-card"><div class="pl-dept-name">Desvios por rubrica</div><div style="overflow:auto"><table class="pl-table"><thead><tr><th style="text-align:left">Rubrica</th><th>${YR_PREV}</th><th>${YR_CUR}</th><th>Mediana</th><th>Gap</th><th>Impacto estimado</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${cuaEsc(r.k)}</td><td>${cuaEuro(r.v25,2)}</td><td class="${(r.gapMed||0)>0?'pl-cell-bad':'pl-cell-good'}">${cuaEuro(r.v26,2)}</td><td>${cuaEuro(r.med,2)}</td><td>${r.gapMed!=null?(r.gapMed>=0?'+':'')+cuaEuro(r.gapMed,2):'—'}</td><td>${r.impact?cuaEuro(r.impact,0):'—'}</td></tr>`).join('')}</tbody></table></div></div>`;
  const artTable=artigos.length?`<div class="pl-dept-card"><div class="pl-dept-name">Artigos que explicam desvios de preço</div><div style="overflow:auto"><table class="pl-table"><thead><tr><th style="text-align:left">Artigo</th><th>Família</th><th>Grupo</th><th>Preço</th><th>Mediana</th><th>Melhor preço</th><th>Sobrecusto</th></tr></thead><tbody>${artigos.map(a=>`<tr><td>${cuaEsc(a.nome)}</td><td>${cuaEsc(a.fam)}</td><td>${cuaEsc(a.grp)}</td><td>${cuaEuro(a.p,2)}</td><td>${cuaEuro(a.med,2)}</td><td>${cuaEuro(a.min,2)} <span style="color:var(--text-3)">${cuaEsc(cuaHotelShort(a.minHotel))}</span></td><td class="pl-cell-bad">${cuaEuro(a.sobre,0)}</td></tr>`).join('')}</tbody></table></div></div>`:'';
  body.innerHTML=kpis+analise+`<div style="display:grid;grid-template-columns:1.1fr .9fr;gap:14px;align-items:start;margin-top:14px">${table}<div>${artTable||''}</div></div>`;
}

// ── 6. ALERTAS DE ANOMALIA ───────────────────────────────
function cuaAnomalyRows(){
  const hotels=cuaActiveHotelsSafe();
  const rubs=['COMIDAS','BEBIDAS','PESSOAL','ENERGIA','MANUTENÇÃO','OPERACIONAIS'];
  const opsMap={COMIDAS:'Hospedes',BEBIDAS:'Hospedes',PESSOAL:'Ocupados',ENERGIA:'Disponiveis','MANUTENÇÃO':'Disponiveis',OPERACIONAIS:'Ocupados'};
  const out=[];
  for(const rub of rubs){
    const opsKey=opsMap[rub];
    const vals=hotels.map(h=>cuaValue(h,rub,opsKey,YR_CUR)).filter(v=>v!=null);
    const med=cuaMedian(vals);
    for(const h of hotels){
      const v26=cuaValue(h,rub,opsKey,YR_CUR), v25=cuaValue(h,rub,opsKey,YR_PREV); if(v26==null||!med) continue;
      const gapPct=(v26-med)/med*100;
      const varPct=v25?((v26-v25)/Math.abs(v25)*100):null;
      const impact=Math.max(0,(v26-med)*cuaOps(h,opsKey,YR_CUR));
      let sev=0; if(gapPct>35 && impact>3000) sev=3; else if(gapPct>20 && impact>1000) sev=2; else if(gapPct>10 || (varPct||0)>20) sev=1;
      if(sev) out.push({h,rub,opsKey,v26,med,gapPct,varPct,impact,sev});
    }
  }
  return out.sort((a,b)=>b.sev-a.sev || b.impact-a.impact);
}
function cuaBuildAnomalias(){
  const body=document.getElementById('cua-anomalias-body'); if(!body)return;
  const rows=cuaAnomalyRows();
  const critical=rows.filter(r=>r.sev===3).length, warn=rows.filter(r=>r.sev===2).length;
  const summary=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:14px">
    <div class="pl-dept-card"><div class="pl-dept-name">Anomalias críticas</div><div style="font:800 28px var(--mono);color:#e05c4e">${critical}</div></div>
    <div class="pl-dept-card"><div class="pl-dept-name">Anomalias atenção</div><div style="font:800 28px var(--mono);color:#f59e0b">${warn}</div></div>
    <div class="pl-dept-card"><div class="pl-dept-name">Impacto potencial</div><div style="font:800 24px var(--mono);color:var(--gold)">${cuaEuro(rows.reduce((s,r)=>s+(r.impact||0),0),0)}</div></div>
  </div>`;
  const text=rows.length?`<div class="pl-dept-card" style="border-left:3px solid #e05c4e"><div class="pl-dept-name">Leitura executiva</div><p style="font-size:12px;color:var(--text-2);line-height:1.75;margin-top:8px">Foram identificadas ${rows.length} combinações hotel/rubrica com custo unitário acima da referência interna. O primeiro foco deve ser ${cuaEsc(cuaHotelShort(rows[0].h))} em ${rows[0].rub}: ${cuaEuro(rows[0].v26,2)} por ${rows[0].opsKey}, contra mediana de ${cuaEuro(rows[0].med,2)}. O impacto potencial estimado é ${cuaEuro(rows[0].impact,0)}. Esta leitura não prova desperdício por si só; sinaliza onde a operação deve validar preço, capitação, quebras, carga operacional, eventos e imputações contabilísticas.</p></div>`:'';
  const table=`<div class="pl-dept-card"><div class="pl-dept-name">Lista de anomalias</div><div style="overflow:auto"><table class="pl-table"><thead><tr><th style="text-align:left">Prioridade</th><th style="text-align:left">Hotel</th><th>Rubrica</th><th>Base</th><th>Valor</th><th>Mediana</th><th>Gap</th><th>Var LY</th><th>Impacto</th><th>Ação recomendada</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.sev===3?'🔴 Crítica':r.sev===2?'🟡 Atenção':'🟠 Rever'}</td><td>${cuaEsc(cuaHotelShort(r.h))}</td><td>${r.rub}</td><td>${r.opsKey}</td><td class="pl-cell-bad">${cuaEuro(r.v26,2)}</td><td>${cuaEuro(r.med,2)}</td><td>${cuaPct(r.gapPct)}</td><td>${r.varPct!=null?cuaPct(r.varPct):'—'}</td><td>${cuaEuro(r.impact,0)}</td><td style="font-size:11px;color:var(--text-2)">${r.rub==='COMIDAS'||r.rub==='BEBIDAS'?'Verificar artigos, preço, porções e quebras':'Validar escala, contrato, imputação e volume de atividade'}</td></tr>`).join('')}</tbody></table></div></div>`;
  body.innerHTML=summary+text+table;
}

// ── 7. BENCHMARK ENTRE HOTÉIS ─────────────────────────────
function cuaBuildBenchmark(){
  const body=document.getElementById('cua-benchmark-body'); if(!body)return;
  const [costKey,opsKey]=(document.getElementById('cuaBenchMetric')?.value||'TOTAIS|Hospedes').split('|');
  const hotels=cuaActiveHotelsSafe();
  const rows=hotels.map(h=>({h,val:cuaValue(h,costKey,opsKey,YR_CUR),prev:cuaValue(h,costKey,opsKey,YR_PREV),ops:cuaOps(h,opsKey,YR_CUR)})).filter(r=>r.val!=null).sort((a,b)=>a.val-b.val);
  if(!rows.length){body.innerHTML='<div class="pl-dept-card">Sem dados.</div>';return;}
  const med=cuaMedian(rows.map(r=>r.val)), avg=cuaAvg(rows.map(r=>r.val));
  const best=rows[0], worst=rows[rows.length-1];
  const gap=worst.val-best.val;
  const opp=Math.max(0,(worst.val-med)*worst.ops);
  let html=`<div class="pl-dept-card" style="border-left:3px solid var(--gold)"><div class="pl-dept-name">Benchmark — ${costKey} / ${opsKey}</div><p style="font-size:12px;color:var(--text-2);line-height:1.75;margin-top:8px">A mediana do portefólio filtrado é ${cuaEuro(med,2)} e a média é ${cuaEuro(avg,2)}. O melhor desempenho é ${cuaEsc(cuaHotelShort(best.h))} com ${cuaEuro(best.val,2)}; o pior é ${cuaEsc(cuaHotelShort(worst.h))} com ${cuaEuro(worst.val,2)}. A diferença entre extremos é ${cuaEuro(gap,2)} por unidade, o que mostra uma dispersão relevante. Se ${cuaEsc(cuaHotelShort(worst.h))} convergisse apenas para a mediana, o impacto teórico seria cerca de ${cuaEuro(opp,0)}.</p><p style="font-size:12px;color:var(--text-2);line-height:1.75;margin-top:8px">A leitura deve ser usada para questionar práticas operacionais, não para comparar cegamente hotéis com perfis diferentes. Hotéis urbanos, resort, sazonalidade, regime, eventos e outsourcing podem justificar parte da diferença. Ainda assim, gaps persistentes indicam necessidade de validação de processos, compras, escalas e consumos.</p></div>`;
  html+=`<div style="overflow:auto;margin-top:14px"><table class="pl-table"><thead><tr><th>#</th><th style="text-align:left">Hotel</th><th>${YR_CUR}</th><th>${YR_PREV}</th><th>Var</th><th>Gap vs mediana</th><th>Impacto teórico</th><th>Leitura</th></tr></thead><tbody>${rows.map((r,i)=>{const varPct=r.prev?((r.val-r.prev)/Math.abs(r.prev)*100):null; const gapV=r.val-med; const impact=Math.max(0,gapV*r.ops); return `<tr><td>${i+1}</td><td>${cuaEsc(cuaHotelShort(r.h))}</td><td class="${gapV>0?'pl-cell-bad':'pl-cell-good'}">${cuaEuro(r.val,2)}</td><td>${cuaEuro(r.prev,2)}</td><td>${varPct!=null?cuaPct(varPct):'—'}</td><td>${gapV>=0?'+':''}${cuaEuro(gapV,2)}</td><td>${impact?cuaEuro(impact,0):'—'}</td><td style="font-size:11px;color:var(--text-2)">${gapV>med*.25?'Prioridade de análise':gapV>0?'Acima da mediana':'Eficiente / abaixo da mediana'}</td></tr>`}).join('')}</tbody></table></div>`;
  body.innerHTML=html;
}

// ── 8. PERGUNTA AOS CUSTOS ───────────────────────────────
function cuaBuildPerguntaInit(){
  const r=document.getElementById('cua-pergunta-resp');
  if(r && !r.innerHTML.trim()) r.innerHTML='<div class="pl-dept-card"><div class="pl-dept-name">Pergunte aos custos</div><p style="font-size:12px;color:var(--text-2);line-height:1.7">Escreva uma pergunta ou use um dos botões rápidos. A resposta cruza custos unitários, benchmark, variação vs ano anterior e artigos do extrato de compras, quando disponíveis.</p></div>';
}
function cuaQuickQ(q){
  const i=document.getElementById('cuaPerguntaInput');
  if(i) i.value=q;
  cuaPerguntar(q);
}
function cuaFindHotelInQuestion(q){
  const up=String(q||'').toUpperCase();
  return cuaActiveHotelsSafe().find(h=>up.includes(h) || up.includes(cuaHotelShort(h).toUpperCase().replace('C. ','COLLECTION ')) || up.includes(cuaHotelShort(h).toUpperCase()));
}
function cuaTopUnitRows(opsKey='Hospedes', costKey='TOTAIS', limit=12){
  const hotels=cuaActiveHotelsSafe();
  const vals=hotels.map(h=>cuaValue(h,costKey,opsKey,YR_CUR)).filter(v=>v!=null&&isFinite(v));
  const med=cuaMedian(vals);
  return hotels.map(h=>{
    const v26=cuaValue(h,costKey,opsKey,YR_CUR), v25=cuaValue(h,costKey,opsKey,YR_PREV), ops=cuaOps(h,opsKey,YR_CUR);
    if(v26==null) return null;
    const gap=(med!=null?v26-med:null);
    const impact=(gap!=null&&gap>0)?gap*ops:0;
    const varPct=(v25&&isFinite(v25))?((v26-v25)/Math.abs(v25)*100):null;
    return {h,costKey,opsKey,v26,v25,med,gap,impact,varPct,ops};
  }).filter(Boolean).sort((a,b)=>(b.impact||0)-(a.impact||0)).slice(0,limit);
}
function cuaDeepArticleRows(hotels, limit=20){
  const all=[];
  (hotels||cuaActiveHotelsSafe()).forEach(h=>{
    try{ cuaTopArticleDeviations(h,8).forEach(a=>all.push({...a,h})); }catch(e){}
  });
  return all.sort((a,b)=>(b.sobre||0)-(a.sobre||0)).slice(0,limit);
}
function cuaRenderAnswer(title, intro, tableHtml='', extra=''){
  const resp=document.getElementById('cua-pergunta-resp'); if(!resp) return;
  resp.innerHTML=`<div class="pl-dept-card" style="border-left:3px solid var(--gold)"><div class="pl-dept-name">${cuaEsc(title)}</div><p style="font-size:12px;color:var(--text-2);line-height:1.75;margin-top:8px">${intro}</p>${extra}</div>${tableHtml}`;
}
function cuaAnswerDesviosHospede(){
  const rows=cuaTopUnitRows('Hospedes','TOTAIS',15);
  if(!rows.length){ cuaRenderAnswer('Resposta — maiores desvios por hóspede','Não existem dados suficientes para calcular custo por hóspede no filtro atual.'); return; }
  const top=rows[0];
  const detail=rows.slice(0,5).map(r=>`<strong>${cuaEsc(cuaHotelShort(r.h))}</strong> (${cuaEuro(r.v26,2)}/hóspede; gap ${r.gap>=0?'+':''}${cuaEuro(r.gap||0,2)}; impacto ${cuaEuro(r.impact||0,0)})`).join('; ');
  const intro=`A análise por hóspede mostra onde o custo unitário está acima da referência interna. O maior desvio está em <strong style="color:var(--gold)">${cuaEsc(cuaHotelShort(top.h))}</strong>, com ${cuaEuro(top.v26,2)} por hóspede contra mediana de ${cuaEuro(top.med,2)}. A diferença equivale a ${top.gap>=0?'+':''}${cuaEuro(top.gap||0,2)} por hóspede e a um impacto teórico de ${cuaEuro(top.impact||0,0)}. Os focos seguintes são ${detail}. Esta leitura deve ser validada com mix de regime, eventos, ocupação, serviços incluídos e imputação contabilística, mas é suficientemente objetiva para priorizar análise operacional.`;
  const table=`<div style="overflow:auto;margin-top:12px"><table class="pl-table"><thead><tr><th>#</th><th style="text-align:left">Hotel</th><th>Custo / hóspede</th><th>Mediana</th><th>Gap</th><th>Var. vs ${YR_PREV}</th><th>Impacto teórico</th><th>Leitura</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${cuaEsc(cuaHotelShort(r.h))}</td><td class="${(r.gap||0)>0?'pl-cell-bad':'pl-cell-good'}">${cuaEuro(r.v26,2)}</td><td>${cuaEuro(r.med,2)}</td><td>${r.gap>=0?'+':''}${cuaEuro(r.gap||0,2)}</td><td>${r.varPct!=null?cuaPct(r.varPct):'—'}</td><td class="${(r.impact||0)>0?'pl-cell-bad':''}">${r.impact?cuaEuro(r.impact,0):'—'}</td><td style="font-size:11px;color:var(--text-2)">${(r.gap||0)>0?'Validar rubricas e consumos':'Abaixo/igual à referência'}</td></tr>`).join('')}</tbody></table></div>`;
  cuaRenderAnswer('Resposta — maiores desvios por hóspede', intro, table);
}
function cuaAnswerAnomaliasFB(){
  const rows=cuaAnomalyRows().filter(r=>['COMIDAS','BEBIDAS'].includes(r.rub)).slice(0,20);
  if(!rows.length){ cuaRenderAnswer('Resposta — anomalias F&B','Não foram detetadas anomalias materiais em COMIDAS ou BEBIDAS no filtro atual.'); return; }
  const total=rows.reduce((s,r)=>s+(r.impact||0),0);
  const byHotel={}; rows.forEach(r=>{ if(!byHotel[r.h]) byHotel[r.h]={h:r.h,impact:0,rubs:new Set()}; byHotel[r.h].impact+=r.impact||0; byHotel[r.h].rubs.add(r.rub); });
  const topHotels=Object.values(byHotel).sort((a,b)=>b.impact-a.impact).slice(0,5);
  const intro=`As anomalias F&B identificadas somam um impacto potencial de <strong style="color:var(--gold)">${cuaEuro(total,0)}</strong>. O principal foco é <strong>${cuaEsc(cuaHotelShort(rows[0].h))}</strong> em ${rows[0].rub}, com ${cuaEuro(rows[0].v26,2)} por ${rows[0].opsKey} contra mediana de ${cuaEuro(rows[0].med,2)}. Por hotel, os maiores focos são ${topHotels.map(x=>`<strong>${cuaEsc(cuaHotelShort(x.h))}</strong> (${[...x.rubs].join('/')} · ${cuaEuro(x.impact,0)})`).join('; ')}. A validação deve começar por preço unitário, capitação, fichas técnicas, desperdício/quebras e transferências/imputações entre centros de custo.`;
  const table=`<div style="overflow:auto;margin-top:12px"><table class="pl-table"><thead><tr><th>Prioridade</th><th style="text-align:left">Hotel</th><th>Rubrica</th><th>Base</th><th>Valor</th><th>Mediana</th><th>Gap</th><th>Var. LY</th><th>Impacto</th><th>Ação</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i<5?'🔴':'🟡'} ${i+1}</td><td>${cuaEsc(cuaHotelShort(r.h))}</td><td>${r.rub}</td><td>${r.opsKey}</td><td class="pl-cell-bad">${cuaEuro(r.v26,2)}</td><td>${cuaEuro(r.med,2)}</td><td>${cuaPct(r.gapPct)}</td><td>${r.varPct!=null?cuaPct(r.varPct):'—'}</td><td class="pl-cell-bad">${cuaEuro(r.impact,0)}</td><td style="font-size:11px;color:var(--text-2)">Conferir artigos, compras, quebras e capitação</td></tr>`).join('')}</tbody></table></div>`;
  cuaRenderAnswer('Resposta — anomalias F&B', intro, table);
}
function cuaAnswerOndeAtuar(){
  const rows=cuaAnomalyRows().slice(0,12);
  if(!rows.length){ cuaRenderAnswer('Resposta — onde atuar amanhã','Não existem anomalias materiais no filtro atual. A recomendação é manter acompanhamento e validar se os dados de custos e atividade estão completos.'); return; }
  const top=rows[0];
  const total=rows.reduce((s,r)=>s+(r.impact||0),0);
  const intro=`A prioridade de atuação deve ser <strong style="color:var(--gold)">${cuaEsc(cuaHotelShort(top.h))} · ${top.rub}</strong>. O impacto estimado é ${cuaEuro(top.impact,0)}, com custo unitário de ${cuaEuro(top.v26,2)} por ${top.opsKey} contra mediana de ${cuaEuro(top.med,2)}. No conjunto dos principais alertas, o impacto potencial é ${cuaEuro(total,0)}. A ordem abaixo combina impacto financeiro, gap face à mediana e variação face ao ano anterior. Amanhã, eu pediria explicação objetiva ao hotel para as 3 primeiras linhas, com evidência de preço, volume, contratos, compras e/ou operação.`;
  const table=`<div style="overflow:auto;margin-top:12px"><table class="pl-table"><thead><tr><th>#</th><th style="text-align:left">Hotel</th><th>Rubrica</th><th>Impacto</th><th>Problema provável</th><th>Pedido concreto ao hotel</th></tr></thead><tbody>${rows.map((r,i)=>{const prob=r.rub==='COMIDAS'||r.rub==='BEBIDAS'?'preço/capitação/quebras/mix':'escala/contrato/imputação/volume'; const pedido=r.rub==='COMIDAS'||r.rub==='BEBIDAS'?'Enviar top artigos, capitação e justificação de quebras':'Enviar detalhe de faturas/contrato/escala e centro de custo'; return `<tr><td>${i+1}</td><td>${cuaEsc(cuaHotelShort(r.h))}</td><td>${r.rub}</td><td class="pl-cell-bad">${cuaEuro(r.impact,0)}</td><td style="font-size:11px;color:var(--text-2)">${prob}</td><td style="font-size:11px;color:var(--text-2)">${pedido}</td></tr>`}).join('')}</tbody></table></div>`;
  cuaRenderAnswer('Resposta — onde atuar amanhã', intro, table);
}
// ==========================================================
// ARTIGOS COM DESVIO — implementação definitiva consolidada v5
// Substitui as antigas camadas CUA 4.6/5.0 sem wrappers runtime.
// ==========================================================
function cuaArticleGetCD(){
  try{ if(typeof cdGetData==='function'){ const d=cdGetData(); if(d && d.dic) return d; } }catch(e){}
  try{ if(typeof CD!=='undefined' && CD && CD.dic) return CD; }catch(e){}
  try{ if(window.__VG_CUA_TEST_CD && window.__VG_CUA_TEST_CD.dic) return window.__VG_CUA_TEST_CD; }catch(e){}
  return null;
}
function cuaArticleActiveHotelNames(dic){
  let list=[];
  try{ if(typeof getActiveHotels==='function') list=getActiveHotels()||[]; }catch(e){}
  if(!list.length && typeof RAW!=='undefined' && RAW?.hotels_ops) list=Object.keys(RAW.hotels_ops||{});
  if(!list.length && dic && Array.isArray(dic.hoteis)) list=dic.hoteis.filter(Boolean);
  const set={}; list.forEach(h=>{ set[String(h).toUpperCase()]=1; });
  return set;
}
function cuaArticleRowsFromCD(cd){
  const dic=cd.dic||{}, meses=(cd.meta&&cd.meta.meses)||[];
  const rows=[]; let latestYear=0;
  for(let i=0;i<meses.length;i++){ const y=Math.floor(Number(meses[i])/100); if(y>latestYear) latestYear=y; }
  try{ if(typeof YR_CUR!=='undefined' && Number(YR_CUR)) latestYear=Number(YR_CUR); }catch(e){}
  if(Array.isArray(cd.PM) && cd.PM.length){
    const map={};
    for(const r of cd.PM){
      if(!r || r.length<6) continue;
      const mes=meses[Number(r[3])];
      if(latestYear && mes && Math.floor(Number(mes)/100)!==latestYear) continue;
      const a=Number(r[0]), fo=Number(r[1]), h=Number(r[2]), val=Number(r[4]||0), q=Number(r[5]||0);
      if(!a || !h || val<=0 || q<=0) continue;
      const k=a+'|'+fo+'|'+h; if(!map[k]) map[k]=[a,fo,h,0,0];
      map[k][3]+=val; map[k][4]+=q;
    }
    for(const k in map){ if(map[k][4]>0) rows.push(map[k]); }
    if(rows.length) return {rows,year:latestYear};
  }
  if(Array.isArray(cd.P)){
    for(const r of cd.P){
      if(!r || r.length<5) continue;
      const val=Number(r[3]||0), q=Number(r[4]||0);
      if(Number(r[0]) && Number(r[2]) && val>0 && q>0) rows.push([Number(r[0]),Number(r[1]),Number(r[2]),val,q]);
    }
  }
  return {rows,year:latestYear};
}
function cuaCalcArticleDeviations(limit=30){
  const cd=cuaArticleGetCD();
  if(!cd || !cd.dic) return {rows:[],reason:'NO_CD'};
  const dic=cd.dic, HOT=dic.hoteis||[], ART=dic.art||[], FORN=dic.forn||[];
  const pack=cuaArticleRowsFromCD(cd), priceRows=pack.rows||[];
  if(!priceRows.length) return {rows:[],reason:'NO_ROWS'};
  const active=cuaArticleActiveHotelNames(dic), hasActive=Object.keys(active).length>0;
  const byArtHotel={};
  for(const r of priceRows){
    const a=r[0], fo=r[1], h=r[2], val=r[3], q=r[4];
    if(q<=0 || val<=0) continue;
    const p=val/q;
    if(!isFinite(p) || p<=0 || p>5000) continue;
    const key=a+'|'+h;
    if(!byArtHotel[key]) byArtHotel[key]={a,h,v:0,q:0,forn:{}};
    byArtHotel[key].v+=val; byArtHotel[key].q+=q;
    if(FORN[fo]) byArtHotel[key].forn[FORN[fo]]=1;
  }
  const byArt={};
  Object.keys(byArtHotel).forEach(k=>{
    const o=byArtHotel[k]; if(o.q<=0) return; const p=o.v/o.q;
    if(!isFinite(p) || p<=0 || p>2500) return;
    if(!byArt[o.a]) byArt[o.a]=[];
    byArt[o.a].push({h:o.h,p,q:o.q,v:o.v,forn:Object.keys(o.forn).slice(0,3).join(', ')});
  });
  const bench={};
  Object.keys(byArt).forEach(a=>{
    const l=byArt[a].filter(x=>x.q>=1 && x.p>0);
    if(l.length<2) return;
    const med=cuaMedian(l.map(x=>x.p));
    const mn=l.slice().sort((x,y)=>x.p-y.p)[0];
    if(med && isFinite(med)) bench[a]={med,min:mn.p,minHotel:HOT[mn.h]||'',n:l.length};
  });
  const res=[];
  Object.keys(byArtHotel).forEach(k=>{
    const o=byArtHotel[k], b=bench[o.a]; if(!b || o.q<=0) return;
    const hName=HOT[o.h]||'';
    if(hasActive && !active[String(hName).toUpperCase()]) return;
    const p=o.v/o.q;
    if(p<=b.med*1.05 || p>b.med*4) return;
    const sobre=(p-b.med)*o.q;
    if(sobre<25) return;
    res.push({
      hotel:hName, artigo:ART[o.a]||('Artigo '+o.a), preco:p, mediana:b.med,
      melhor:b.min, melhorHotel:b.minHotel, qtd:o.q, valor:o.v, sobre,
      fornecedores:Object.keys(o.forn).slice(0,3).join(', '), comps:b.n
    });
  });
  res.sort((a,b)=>b.sobre-a.sobre);
  return {rows:res.slice(0,limit||30),total:res.length,counts:{priceRows:priceRows.length,bench:Object.keys(bench).length,year:pack.year}};
}
function cuaAnswerArtigos(){
  const result=cuaCalcArticleDeviations(30);
  if(!result.rows.length){
    let msg='Não encontrei artigos com desvio comparável no filtro atual. Diagnóstico: '+(result.reason||'sem resultado')+'. Se o ficheiro de Compras & Artigos estiver carregado, altere o filtro para Portefólio filtrado e confirme que existem pelo menos dois hotéis com o mesmo artigo comprado no período. O dashboard mantém as análises de P&L/rubrica, mas o detalhe por artigo depende do extrato de compras/preços.';
    if(result.counts) msg+=' Linhas de preço lidas: '+result.counts.priceRows+'; artigos com benchmark: '+result.counts.bench+'.';
    return cuaRenderAnswer('Resposta — artigos com desvio',msg);
  }
  const rows=result.rows;
  const total=rows.reduce((s,r)=>s+r.sobre,0);
  const topHotels={};
  rows.forEach(r=>{ if(!topHotels[r.hotel]) topHotels[r.hotel]={h:r.hotel,n:0,s:0}; topHotels[r.hotel].n++; topHotels[r.hotel].s+=r.sobre; });
  const ht=Object.keys(topHotels).map(k=>topHotels[k]).sort((a,b)=>b.s-a.s).slice(0,5);
  const intro='Foram encontrados <strong>'+rows.length+'</strong> artigos com preço médio acima da mediana interna, no período '+cuaEsc(result.counts&&result.counts.year||'atual')+'. O sobrecusto estimado dos artigos listados é <strong style="color:var(--gold)">'+cuaEuro(total,0)+'</strong>. Hotéis com maior exposição: '+ht.map(x=>'<strong>'+cuaEsc(cuaHotelShort(x.h))+'</strong> ('+x.n+' artigos; '+cuaEuro(x.s,0)+')').join('; ')+'. Esta análise compara preços médios do mesmo artigo entre hotéis; deve ser validada contra unidade de medida, embalagem, fornecedor, qualidade e codificação antes de concluir desperdício.';
  const table='<div style="overflow:auto;margin-top:12px"><table class="pl-table"><thead><tr><th>#</th><th>Hotel</th><th style="text-align:left">Artigo</th><th>Preço médio</th><th>Mediana grupo</th><th>Melhor preço</th><th>Qtd.</th><th>Sobrecusto</th><th>Fornecedor(es)</th><th>Validação</th></tr></thead><tbody>'+
    rows.map((r,i)=>'<tr><td>'+(i+1)+'</td><td>'+cuaEsc(cuaHotelShort(r.hotel))+'</td><td style="text-align:left">'+cuaEsc(r.artigo)+'</td><td class="pl-cell-bad">'+cuaEuro(r.preco,2)+'</td><td>'+cuaEuro(r.mediana,2)+'</td><td>'+cuaEuro(r.melhor,2)+' <span style="color:var(--text-3)">'+cuaEsc(cuaHotelShort(r.melhorHotel))+'</span></td><td>'+Number(r.qtd).toLocaleString('pt-PT',{maximumFractionDigits:1})+'</td><td class="pl-cell-bad">'+cuaEuro(r.sobre,0)+'</td><td style="font-size:11px;color:var(--text-2)">'+cuaEsc(r.fornecedores||'—')+'</td><td style="font-size:11px;color:var(--text-2)">Confirmar fatura, unidade, embalagem, fornecedor e preço contratado.</td></tr>').join('')+
    '</tbody></table></div>';
  const extra='<div class="pl-dept-card" style="border-left:3px solid #e05c4e"><div class="pl-dept-name">Leitura operacional</div><p style="font-size:12px;color:var(--text-2);line-height:1.75;margin-top:8px">Prioridade: validar os 10 primeiros artigos. Se o artigo for equivalente, há oportunidade de renegociação ou centralização de preço. Se não for equivalente, deve corrigir a codificação, separar embalagens/formatos ou criar unidade equivalente para evitar falsos desvios.</p></div>';
  return cuaRenderAnswer('Resposta — artigos com desvio',intro,table,extra);
}
window.cuaCalcArticleDeviations=cuaCalcArticleDeviations;
window.cuaAnswerArtigos=cuaAnswerArtigos;

function cuaPerguntar(forcedQ){
  const q=forcedQ || document.getElementById('cuaPerguntaInput')?.value || '';
  const resp=document.getElementById('cua-pergunta-resp'); if(!resp)return;
  const up=String(q).toUpperCase();
  if(!up.trim()){ cuaBuildPerguntaInit(); return; }

  // Intenções específicas primeiro. Isto impede o bug em que todos os botões caíam na mesma resposta genérica.
  if(up.includes('MAIORES DESVIOS') || up.includes('DESVIOS POR HÓSPEDE') || up.includes('DESVIOS POR HOSPEDE') || up.includes('POR HÓSPEDE') || up.includes('POR HOSPEDE')) return cuaAnswerDesviosHospede();
  if(up.includes('ANOMALIAS F&B') || (up.includes('ANOMALIA') && (up.includes('COMIDA') || up.includes('BEBIDA'))) || (up.includes('HOTÉIS') && up.includes('COMIDAS') && up.includes('BEBIDAS')) || (up.includes('HOTEIS') && up.includes('COMIDAS') && up.includes('BEBIDAS'))) return cuaAnswerAnomaliasFB();
  if(up.includes('ONDE') && (up.includes('ATUAR') || up.includes('AMANHÃ') || up.includes('AMANHA'))) return cuaAnswerOndeAtuar();
  if(up.includes('ARTIGO') || up.includes('ARTIGOS')) return cuaAnswerArtigos();

  const h=cuaFindHotelInQuestion(q);
  const costKey=up.includes('BEBID')?'BEBIDAS':up.includes('COMIDA')||up.includes('FOOD')?'COMIDAS':up.includes('PESSOAL')?'PESSOAL':up.includes('ENERG')?'ENERGIA':up.includes('MANUT')?'MANUTENÇÃO':'TOTAIS';
  const opsKey=up.includes('DORM')?'Dormidas':up.includes('QUARTO')?'Ocupados':up.includes('CHEG')?'Chegadas':'Hospedes';
  if(h){
    const rows=cuaCostRowsForHotel(h,opsKey).sort((a,b)=>(b.impact||0)-(a.impact||0));
    const r=rows.find(x=>x.k===costKey)||rows[0];
    const artigos=cuaTopArticleDeviations(h,8);
    const intro=`Para <strong style="color:var(--gold)">${cuaEsc(cuaHotelShort(h))}</strong>, a rubrica ${cuaEsc(costKey)} está em ${r?cuaEuro(r.v26,2):'—'} por ${opsKey}. A mediana interna é ${r?cuaEuro(r.med,2):'—'}, com gap ${r&&r.gapMed!=null?(r.gapMed>=0?'+':'')+cuaEuro(r.gapMed,2):'—'} por unidade e impacto teórico de ${r?cuaEuro(r.impact,0):'—'}. Face a ${YR_PREV}, a variação é ${r&&r.varPct!=null?cuaPct(r.varPct):'—'}. ${artigos.length?`No detalhe de artigos, os principais sinais são ${artigos.slice(0,4).map(a=>`<strong>${cuaEsc(a.nome)}</strong> (${cuaEuro(a.sobre,0)})`).join(', ')}.`:'Não encontrei artigos materiais associados no extrato.'} A validação deve separar preço, quantidade, capitação, desperdício, mix operacional e imputação contabilística.`;
    const table=`<div style="overflow:auto;margin-top:12px"><table class="pl-table"><thead><tr><th>Rubrica</th><th>${YR_CUR}</th><th>${YR_PREV}</th><th>Mediana</th><th>Gap</th><th>Impacto</th></tr></thead><tbody>${rows.slice(0,8).map(x=>`<tr><td>${cuaEsc(x.k)}</td><td class="${(x.gapMed||0)>0?'pl-cell-bad':'pl-cell-good'}">${cuaEuro(x.v26,2)}</td><td>${cuaEuro(x.v25,2)}</td><td>${cuaEuro(x.med,2)}</td><td>${x.gapMed>=0?'+':''}${cuaEuro(x.gapMed||0,2)}</td><td>${x.impact?cuaEuro(x.impact,0):'—'}</td></tr>`).join('')}</tbody></table></div>`;
    return cuaRenderAnswer(`Resposta — ${cuaHotelShort(h)}`, intro, table);
  }
  if(up.includes('ANOMALIA') || up.includes('DESVIO') || up.includes('ATUAR')) return cuaAnswerOndeAtuar();
  return cuaAnswerDesviosHospede();
}

