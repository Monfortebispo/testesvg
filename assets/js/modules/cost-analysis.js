// ANÁLISE DE CUSTOS MODULE
// ==========================================================
let caCurrentTab = 'radar';
function caSym(){return window.VG?.market?.symbol?.()||'€';}

const CA_CATS = [
  { key:'PESSOAL',      label:'👥 Pessoal',      bench:35, warnAt:40, color:'#4a6fa5' },
  { key:'OPERACIONAIS', label:'⚙ Operacionais',   bench:9,  warnAt:14, color:'#2a7d8c' },
  { key:'MANUTENÇÃO',   label:'🔧 Manutenção',    bench:6,  warnAt:9,  color:'#c9a84c' },
  { key:'ENERGIA',      label:'⚡ Energia',        bench:6,  warnAt:9,  color:'#f59e0b' },
  { key:'COMIDAS',      label:'🍽 Comidas',        bench:20, warnAt:28, color:'#27ae60' },
  { key:'BEBIDAS',      label:'🍷 Bebidas',        bench:8,  warnAt:12, color:'#8b5cf6' },
  { key:'MARKETING',    label:'📢 Marketing',      bench:5,  warnAt:8,  color:'#e05c4e' },
  { key:'COMUNICAÇÕES', label:'📡 Comunicações',   bench:1,  warnAt:2,  color:'#6b7280' },
];

function caSetTab(t) {
  caCurrentTab = t;
  document.querySelectorAll('#view-costanalysis .pl-usali-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('catab-' + t)?.classList.add('active');
  document.querySelectorAll('#view-costanalysis .pl-panel').forEach(p => p.style.display = 'none');
  document.getElementById('ca-' + t).style.display = '';
  caRender();
}

function caRender() {
  if (!RAW) return;
  if (caCurrentTab === 'radar')   caRenderRadar();
  if (caCurrentTab === 'evolucao') caRenderEvolucao();
  if (caCurrentTab === 'hotel')   caRenderHotelSel();
  if (caCurrentTab === 'eff')     caRenderEff();
}

// ── helpers ─────────────────────────────────────────────────
function caVarPct(v25, v26) {
  if (!v25) return null;
  return (v26 - v25) / Math.abs(v25) * 100;
}
function caAlertClass(costVar, recVar) {
  // costVar and recVar are % change values
  if (costVar === null || recVar === null) return 'neutral';
  const spread = costVar - recVar; // positive = costs grew faster than revenue
  if (spread > 15) return 'bad';
  if (spread > 5)  return 'warn';
  if (spread <= 0) return 'good';
  return 'neutral';
}
function caAlertIcon(cls) {
  return cls==='bad'?'🔴':cls==='warn'?'🟡':cls==='good'?'🟢':'⚪';
}
function caAlertLabel(cls, costVar, recVar) {
  if (cls==='bad')  return `Custo +${fmt(costVar,1)}% vs Receita +${fmt(recVar,1)}% — Ineficiente`;
  if (cls==='warn') return `Custo +${fmt(costVar,1)}% vs Receita +${fmt(recVar,1)}% — Atenção`;
  if (cls==='good') return `Custo +${fmt(costVar,1)}% vs Receita +${fmt(recVar,1)}% — OK`;
  return 'Dados insuficientes';
}

// ── 1. RADAR DE ALERTAS ──────────────────────────────────────
function caRenderRadar() {
  const hotels = getActiveHotels();
  // Aggregate totals
  const rec25T = hotels.reduce((s,h)=>s+n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_PREV]),0);
  const rec26T = hotels.reduce((s,h)=>s+n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_CUR]),0);
  const recVar = caVarPct(rec25T, rec26T);

  const cards = CA_CATS.map(cat => {
    const v25 = hotels.reduce((s,h)=>s+n(RAW.hotels_costs[h]?.[cat.key]?.[YR_PREV]),0);
    const v26 = hotels.reduce((s,h)=>s+n(RAW.hotels_costs[h]?.[cat.key]?.[YR_CUR]),0);
    const costVar = caVarPct(v25, v26);
    const cls = caAlertClass(costVar, recVar);
    const pct26 = rec26T > 0 ? v26/rec26T*100 : 0;
    const pct25 = rec25T > 0 ? v25/rec25T*100 : 0;
    const overBench = pct26 > cat.bench;
    const barW = Math.min(100, pct26/cat.warnAt*100);
    const barColor = cls==='bad'?'#ef4444':cls==='warn'?'#f59e0b':'#27ae60';

    return `<div class="pl-dept-card" style="border-left:3px solid ${barColor}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
        <div class="pl-dept-name" style="margin-bottom:0">${cat.label}</div>
        <span style="font-size:18px;line-height:1">${caAlertIcon(cls)}</span>
      </div>
      <div style="display:flex;gap:16px;align-items:flex-end;margin-bottom:6px">
        <div>
          <div class="pl-dept-val" style="color:${barColor}">${plFmtE(v26)}</div>
          <div class="pl-dept-sub">${fmt(pct26,1)}% da receita${overBench?` <span style="color:#ef4444;font-weight:700">▲ acima bench ${cat.bench}%</span>`:''}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:10px;color:var(--text-3)">${YR_PREV}: ${plFmtE(v25)} (${fmt(pct25,1)}%)</div>
          <div style="font-size:11px;font-weight:700;color:${costVar!=null&&costVar>0?'#ef4444':'#27ae60'}">${costVar!=null?(costVar>=0?'+':'')+fmt(costVar,1)+'%':'—'}</div>
        </div>
      </div>
      <div style="font-size:10px;color:var(--text-3);margin-bottom:8px">${caAlertLabel(cls, costVar??0, recVar??0)}</div>
      <div class="pl-dept-bar"><div class="pl-dept-bar-fill" style="width:${barW.toFixed(1)}%;background:${barColor}"></div></div>
      <div style="font-size:9px;color:var(--text-3);margin-top:4px">Benchmark: ${cat.bench}% · Alerta: ${cat.warnAt}%</div>
    </div>`;
  }).join('');

  document.getElementById('ca-radar-grid').innerHTML = `<div class="pl-dept-grid">${cards}</div>`;

  // Hotel alert ranking
  const hotelAlerts = hotels.map(h => {
    const r25 = n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_PREV]);
    const r26 = n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_CUR]);
    const rv = caVarPct(r25, r26);
    let redCount=0, warnCount=0;
    CA_CATS.forEach(cat => {
      const v25 = n(RAW.hotels_costs[h]?.[cat.key]?.[YR_PREV]);
      const v26 = n(RAW.hotels_costs[h]?.[cat.key]?.[YR_CUR]);
      const cv = caVarPct(v25, v26);
      const cls = caAlertClass(cv, rv);
      if (cls==='bad') redCount++;
      else if (cls==='warn') warnCount++;
    });
    return { h, redCount, warnCount, r26 };
  }).filter(x=>x.r26>0).sort((a,b)=>b.redCount-a.redCount||b.warnCount-a.warnCount).slice(0,10);

  const hotelsHtml = hotelAlerts.map((x,i) => {
    const bar = x.redCount > 0 ? 'background:#ef4444' : x.warnCount > 0 ? 'background:#f59e0b' : 'background:#27ae60';
    return `<div style="display:flex;align-items:center;gap:12px;padding:8px 12px;background:var(--surface-1);border-radius:8px;margin-bottom:6px;border:1px solid var(--border-2)">
      <span style="font-size:10px;color:var(--text-3);width:18px;text-align:center">${i+1}</span>
      <span style="font-size:12px;color:var(--text-1);flex:1;font-weight:600">${x.h.replace('COLLECTION ','C. ')}</span>
      <span style="display:flex;gap:6px;align-items:center">
        ${x.redCount>0?`<span style="background:#ef4444;color:#fff;font-size:9px;font-weight:800;padding:2px 7px;border-radius:10px">🔴 ${x.redCount} alertas</span>`:''}
        ${x.warnCount>0?`<span style="background:#f59e0b;color:#fff;font-size:9px;font-weight:800;padding:2px 7px;border-radius:10px">🟡 ${x.warnCount} atenções</span>`:''}
        ${x.redCount===0&&x.warnCount===0?`<span style="background:#27ae60;color:#fff;font-size:9px;font-weight:800;padding:2px 7px;border-radius:10px">🟢 OK</span>`:''}
      </span>
      <div style="width:80px;height:6px;background:var(--surface-3);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${Math.min(100,(x.redCount*2+x.warnCount)/CA_CATS.length/3*100)}%;${bar};border-radius:3px"></div>
      </div>
    </div>`;
  }).join('');

  document.getElementById('ca-radar-hotels').innerHTML = hotelsHtml;
}

// ── 2. EVOLUÇÃO POR RUBRICA ──────────────────────────────────
function caRenderEvolucao() {
  const hotels = getActiveHotels();
  const rec25T = hotels.reduce((s,h)=>s+n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_PREV]),0);
  const rec26T = hotels.reduce((s,h)=>s+n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_CUR]),0);

  const items = CA_CATS.map(cat => {
    const v25 = hotels.reduce((s,h)=>s+n(RAW.hotels_costs[h]?.[cat.key]?.[YR_PREV]),0);
    const v26 = hotels.reduce((s,h)=>s+n(RAW.hotels_costs[h]?.[cat.key]?.[YR_CUR]),0);
    const p25 = rec25T>0?v25/rec25T*100:0;
    const p26 = rec26T>0?v26/rec26T*100:0;
    const diff = p26-p25;
    const color = diff>2?'#ef4444':diff>0?'#f59e0b':'#27ae60';
    const arrow = diff>0?'▲':'▼';
    return { ...cat, v25, v26, p25, p26, diff, color, arrow };
  });

  const cardsHtml = items.map(it => `
    <div class="pl-dept-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div class="pl-dept-name" style="margin-bottom:0">${it.label}</div>
        <span style="font-size:13px;font-weight:800;color:${it.color}">${it.arrow} ${it.diff>=0?'+':''}${fmt(it.diff,1)}pp</span>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <div style="flex:1;background:var(--surface-2);border-radius:8px;padding:8px;text-align:center">
          <div style="font-size:9px;color:var(--text-3);margin-bottom:2px">${YR_PREV}</div>
          <div style="font-size:16px;font-weight:800;color:var(--text-1);font-family:var(--mono)">${fmt(it.p25,1)}%</div>
          <div style="font-size:10px;color:var(--text-3)">${plFmtE(it.v25)}</div>
        </div>
        <div style="display:flex;align-items:center;color:var(--text-3);font-size:16px">→</div>
        <div style="flex:1;background:var(--surface-2);border-radius:8px;padding:8px;text-align:center;border:1px solid ${it.color}44">
          <div style="font-size:9px;color:var(--text-3);margin-bottom:2px">${YR_CUR}</div>
          <div style="font-size:16px;font-weight:800;color:${it.color};font-family:var(--mono)">${fmt(it.p26,1)}%</div>
          <div style="font-size:10px;color:var(--text-3)">${plFmtE(it.v26)}</div>
        </div>
      </div>
      <div style="font-size:9px;color:var(--text-3)">Benchmark: ${it.bench}% · Limite: ${it.warnAt}%</div>
      <div class="pl-dept-bar" style="margin-top:6px">
        <div class="pl-dept-bar-fill" style="width:${Math.min(100,it.p26/it.warnAt*100).toFixed(1)}%;background:${it.color}"></div>
      </div>
    </div>`).join('');

  document.getElementById('ca-evolucao-grid').innerHTML = `<div class="pl-dept-grid">${cardsHtml}</div>`;

  // Donut charts
  const labels = CA_CATS.map(c=>c.label.replace(/^[\S]+ /,''));
  const colors = CA_CATS.map(c=>c.color);
  const data25 = CA_CATS.map(cat=>hotels.reduce((s,h)=>s+n(RAW.hotels_costs[h]?.[cat.key]?.[YR_PREV]),0));
  const data26 = CA_CATS.map(cat=>hotels.reduce((s,h)=>s+n(RAW.hotels_costs[h]?.[cat.key]?.[YR_CUR]),0));

  ['chartCaDonut26','chartCaDonut25'].forEach(id=>{ if(charts[id]){charts[id].destroy();delete charts[id];} });

  const donutOpts = { responsive:true, maintainAspectRatio:false, cutout:'60%',
    plugins:{ legend:{position:'right',labels:{color:'var(--text-2)',font:{family:'DM Mono',size:10},padding:10}},
      tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${plFmtE(ctx.raw)} (${fmt(ctx.raw/ctx.dataset.data.reduce((a,b)=>a+b,0)*100,1)}%)`}}} };

  charts['chartCaDonut26'] = new Chart(document.getElementById('chartCaDonut26'),
    {type:'doughnut', data:{labels, datasets:[{data:data26, backgroundColor:colors, borderWidth:2, borderColor:'var(--surface-1)'}]}, options:donutOpts});
  charts['chartCaDonut25'] = new Chart(document.getElementById('chartCaDonut25'),
    {type:'doughnut', data:{labels, datasets:[{data:data25, backgroundColor:colors, borderWidth:2, borderColor:'var(--surface-1)'}]}, options:donutOpts});
}

// ── 3. DETALHE POR HOTEL ─────────────────────────────────────
function caRenderHotelSel() {
  const sel = document.getElementById('caHotelSel');
  const hotels = getActiveHotels();
  if (!sel.options.length || sel.options.length !== hotels.length) {
    sel.innerHTML = hotels.map(h=>`<option value="${h}">${h}</option>`).join('');
  }
  caRenderHotel();
}

function caRenderHotel() {
  const h = document.getElementById('caHotelSel')?.value;
  if (!h || !RAW.hotels_costs[h]) { document.getElementById('ca-hotel-body').innerHTML = '<p style="color:var(--text-3)">Selecciona um hotel</p>'; return; }

  const r25 = n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_PREV]);
  const r26 = n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_CUR]);
  const rv = caVarPct(r25, r26);
  const c25T = totalCosts(h,YR_PREV);
  const c26T = totalCosts(h,YR_CUR);
  const gop25 = gop(h,YR_PREV), gop26 = gop(h,YR_CUR);

  // Summary bar
  const sumCards = [
    { l:`Receita ${YR_CUR}`, v:plFmtE(r26), sub:`${YR_PREV}: ${plFmtE(r25)} ${rv!=null?(rv>=0?'<span style="color:#27ae60">+':'<span style="color:#ef4444">')+fmt(rv,1)+'%</span>':''}` },
    { l:`Custos Totais ${YR_CUR}`, v:plFmtE(c26T), sub:`${YR_PREV}: ${plFmtE(c25T)} — ${r26>0?fmt(c26T/r26*100,1)+'% da rec':'—'}` },
    { l:`GOP ${YR_CUR}`, v:plFmtE(gop26), sub:`Margem: ${r26>0&&gop26!=null?fmt(gop26/r26*100,1)+'%':'—'} · ${YR_PREV}: ${gop25!=null?plFmtE(gop25):'—'}`, color: gop26>=0?'#27ae60':'#ef4444' },
    { l:`Ocupação ${YR_CUR}`, v:fmt(occ(h,YR_CUR)||0,1)+'%', sub:`ADR: ${caSym()}${fmt(adr(h,YR_CUR)||0,0)} · RevPAR: ${caSym()}${fmt(revpar(h,YR_CUR)||0,0)}` },
  ];

  let html = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-bottom:20px">
    ${sumCards.map(c=>`<div class="pl-dept-card">
      <div class="pl-dept-name">${c.l}</div>
      <div class="pl-dept-val" ${c.color?`style="color:${c.color}"`:''}>${c.v}</div>
      <div class="pl-dept-sub" style="font-size:10px">${c.sub}</div>
    </div>`).join('')}
  </div>`;

  // Category breakdown table
  html += `<div style="overflow-x:auto"><table class="pl-table"><thead><tr>
    <th style="text-align:left">Rubrica</th>
    <th>Valor 2025</th><th>% Rec 2025</th>
    <th>Valor 2026</th><th>% Rec 2026</th>
    <th>Variação ${caSym()}</th><th>Variação %</th>
    <th>vs Receita</th><th>Alerta</th>
  </tr></thead><tbody>`;

  CA_CATS.forEach(cat => {
    const v25 = n(RAW.hotels_costs[h]?.[cat.key]?.[YR_PREV]);
    const v26 = n(RAW.hotels_costs[h]?.[cat.key]?.[YR_CUR]);
    const p25 = r25>0?v25/r25*100:0, p26 = r26>0?v26/r26*100:0;
    const cv = caVarPct(v25,v26);
    const cls = caAlertClass(cv, rv);
    const varE = v26-v25;
    const overBench = p26>cat.bench;
    html += `<tr>
      <td>${cat.label}</td>
      <td>${plFmtE(v25)}</td><td class="pl-pct">${fmt(p25,1)}%</td>
      <td>${plFmtE(v26)}</td>
      <td class="${overBench?'pl-cell-bad':'pl-pct'}">${fmt(p26,1)}%${overBench?' ▲':''}</td>
      <td style="color:${varE>0?'#ef4444':'#27ae60'};font-family:var(--mono)">${varE>=0?'+':''}${plFmtE(varE)}</td>
      <td style="color:${cv!=null&&cv>0?'#ef4444':'#27ae60'};font-weight:700">${cv!=null?(cv>=0?'+':'')+fmt(cv,1)+'%':'—'}</td>
      <td style="font-size:10px;color:var(--text-3)">${caAlertLabel(cls, cv??0, rv??0)}</td>
      <td style="font-size:16px;text-align:center">${caAlertIcon(cls)}</td>
    </tr>`;
  });

  // Total row
  const cv = caVarPct(c25T,c26T);
  const clsT = caAlertClass(cv, rv);
  html += `<tr style="font-weight:800;background:var(--surface-2);border-top:2px solid var(--border)">
    <td>⬛ TOTAL CUSTOS</td>
    <td>${plFmtE(c25T)}</td><td class="pl-pct">${r25>0?fmt(c25T/r25*100,1):'—'}%</td>
    <td>${plFmtE(c26T)}</td><td class="${c26T/r26*100>90?'pl-cell-bad':'pl-pct'}">${r26>0?fmt(c26T/r26*100,1):'—'}%</td>
    <td style="color:${c26T-c25T>0?'#ef4444':'#27ae60'};font-family:var(--mono)">${c26T-c25T>=0?'+':''}${plFmtE(c26T-c25T)}</td>
    <td style="color:${cv!=null&&cv>0?'#ef4444':'#27ae60'};font-weight:700">${cv!=null?(cv>=0?'+':'')+fmt(cv,1)+'%':'—'}</td>
    <td style="font-size:10px;color:var(--text-3)">${caAlertLabel(clsT, cv??0, rv??0)}</td>
    <td style="font-size:16px;text-align:center">${caAlertIcon(clsT)}</td>
  </tr>`;

  html += '</tbody></table></div>';
  document.getElementById('ca-hotel-body').innerHTML = html;
}

// ── 4. EFICIÊNCIA OPERACIONAL ────────────────────────────────
function caRenderEff() {
  const hotels = getActiveHotels();
  const data = hotels.map(h => {
    const r26 = n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_CUR]);
    if (!r26) return null;
    const c26 = totalCosts(h,YR_CUR);
    const gopP = gopPct(h,YR_CUR) ?? 0;
    const costP = r26>0?c26/r26*100:0;
    const pesP  = r26>0?n(RAW.hotels_costs[h]?.PESSOAL?.[YR_CUR])/r26*100:0;
    const eneP  = r26>0?n(RAW.hotels_costs[h]?.ENERGIA?.[YR_CUR])/r26*100:0;
    const manP  = r26>0?n(RAW.hotels_costs[h]?.MANUTENÇÃO?.[YR_CUR])/r26*100:0;
    const fbCP  = (()=>{ const fb=n(RAW.hotels_rev[h]?.ALIMENTACAO?.[YR_CUR]); return fb>0?(n(RAW.hotels_costs[h]?.COMIDAS?.[YR_CUR])+n(RAW.hotels_costs[h]?.BEBIDAS?.[YR_CUR]))/fb*100:0; })();
    return { h, r26, gopP, costP, pesP, eneP, manP, fbCP };
  }).filter(Boolean);

  if (!data.length) return;

  function med(arr) { const s=[...arr].sort((a,b)=>a-b); return s[Math.floor(s.length/2)]; }
  const medGop  = med(data.map(d=>d.gopP));
  const medCost = med(data.map(d=>d.costP));
  const medPes  = med(data.map(d=>d.pesP));
  const medEne  = med(data.map(d=>d.eneP));
  const medMan  = med(data.map(d=>d.manP));

  // KPI summary cards
  const above = data.filter(d=>d.gopP>=medGop).length;
  const highCost = data.filter(d=>d.costP>medCost+10).length;
  const highLab  = data.filter(d=>d.pesP>40).length;
  const avgGop = data.reduce((s,d)=>s+d.gopP,0)/data.length;

  document.getElementById('ca-eff-kpis').innerHTML = [
    { l:'GOP% Médio Portfólio', v:`${fmt(avgGop,1)}%`, sub:`Mediana: ${fmt(medGop,1)}%`, color: avgGop>0?'#27ae60':'#ef4444' },
    { l:'Hotéis acima mediana GOP', v:`${above}`, sub:`de ${data.length} hotéis analisados`, color:'#27ae60' },
    { l:'Custo Total > mediana+10pp', v:`${highCost}`, sub:'Potencial ineficiência estrutural', color: highCost>0?'#ef4444':'#27ae60' },
    { l:'Pessoal > 40% Receita', v:`${highLab}`, sub:'Alerta Labour Cost USALI', color: highLab>0?'#ef4444':'#27ae60' },
  ].map(c=>`<div class="pl-dept-card">
    <div class="pl-dept-name">${c.l}</div>
    <div class="pl-dept-val" style="color:${c.color}">${c.v}</div>
    <div class="pl-dept-sub">${c.sub}</div>
  </div>`).join('');

  // Scatter matrix chart
  if (charts['chartCaMatrix']) { charts['chartCaMatrix'].destroy(); delete charts['chartCaMatrix']; }
  const ctx = document.getElementById('chartCaMatrix');
  if (ctx) {
    const pointColors = data.map(d => {
      if (d.gopP >= medGop && d.costP <= medCost) return 'rgba(39,174,96,.8)';   // good
      if (d.gopP < medGop  && d.costP > medCost)  return 'rgba(224,92,78,.8)';    // bad
      return 'rgba(245,158,11,.8)';                                                // mixed
    });
    charts['chartCaMatrix'] = new Chart(ctx, {
      type:'bubble',
      data:{ datasets:[{
        label:'Hotéis',
        data: data.map(d=>({ x:d.gopP, y:d.costP, r:Math.max(5, Math.min(20, d.r26/100000)) })),
        backgroundColor: pointColors,
        borderColor: pointColors.map(c=>c.replace('.8','.95')),
        borderWidth:1
      }]},
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{display:false},
          tooltip:{ callbacks:{ label: ctx => {
            const d = data[ctx.dataIndex];
            return [`${d.h.replace('COLLECTION ','C. ')}`,`GOP: ${fmt(d.gopP,1)}%`,`Custo: ${fmt(d.costP,1)}%`,`Receita: ${plFmtE(d.r26)}`];
          }}}
        },
        scales:{
          x:{ title:{display:true,text:'GOP %',color:'var(--text-3)',font:{size:11}},
              ticks:{color:'#6a7d96',callback:v=>v+'%'}, grid:{color:'rgba(255,255,255,.05)'},
              annotations:{ medLine:{ type:'line', xMin:medGop, xMax:medGop, borderColor:'rgba(201,168,76,.4)', borderDash:[4,3], borderWidth:1.5 }}},
          y:{ title:{display:true,text:'Custo Total %',color:'var(--text-3)',font:{size:11}},
              ticks:{color:'#6a7d96',callback:v=>v+'%'}, grid:{color:'rgba(255,255,255,.05)'},
              reverse:false }
        }
      }
    });
  }

  // Efficiency ranking table
  const sorted = [...data].sort((a,b)=>b.gopP-a.gopP);
  let tbl = `<thead><tr>
    <th style="text-align:left">#</th><th style="text-align:left">Hotel</th>
    <th>Receita</th><th>GOP%</th><th>Custo%</th>
    <th>Pessoal%</th><th>Energia%</th><th>Manut%</th><th>F&amp;B Cost%</th>
    <th>Eficiência</th>
  </tr></thead><tbody>`;

  tbl += `<tr class="pl-median-row">
    <td>—</td><td>Mediana</td><td>—</td>
    <td>${fmt(medGop,1)}%</td><td>${fmt(medCost,1)}%</td>
    <td>${fmt(medPes,1)}%</td><td>${fmt(medEne,1)}%</td><td>${fmt(medMan,1)}%</td><td>—</td><td>—</td>
  </tr>`;

  sorted.forEach((d,i) => {
    const eff = d.gopP>=medGop&&d.costP<=medCost ? '🟢 Eficiente'
              : d.gopP<medGop&&d.costP>medCost   ? '🔴 Ineficiente'
              : d.gopP>=medGop                    ? '🟡 GOP OK / Custo alto'
              : '🟡 Custo OK / GOP baixo';
    const gopCls = d.gopP>=medGop?'pl-cell-good':'pl-cell-bad';
    const costCls = d.costP<=medCost?'pl-cell-good':'pl-cell-bad';
    const pesCls = d.pesP<=40?'pl-cell-good':'pl-cell-bad';
    const eneCls = d.eneP<=6?'pl-cell-good':d.eneP<=9?'pl-cell-warn':'pl-cell-bad';
    const manCls = d.manP<=6?'pl-cell-good':d.manP<=9?'pl-cell-warn':'pl-cell-bad';
    tbl += `<tr>
      <td style="color:var(--text-3)">${i+1}</td>
      <td>${d.h.replace('COLLECTION ','C. ')}</td>
      <td style="text-align:right;font-family:var(--mono)">${plFmtE(d.r26)}</td>
      <td class="${gopCls}">${fmt(d.gopP,1)}%</td>
      <td class="${costCls}">${fmt(d.costP,1)}%</td>
      <td class="${pesCls}">${fmt(d.pesP,1)}%</td>
      <td class="${eneCls}">${fmt(d.eneP,1)}%</td>
      <td class="${manCls}">${fmt(d.manP,1)}%</td>
      <td class="${d.fbCP>0&&d.fbCP<=35?'pl-cell-good':d.fbCP>35?'pl-cell-bad':'pl-pct'}">${d.fbCP>0?fmt(d.fbCP,1)+'%':'—'}</td>
      <td style="font-size:11px;white-space:nowrap">${eff}</td>
    </tr>`;
  });

  document.getElementById('ca-eff-table').innerHTML = tbl + '</tbody>';
}

