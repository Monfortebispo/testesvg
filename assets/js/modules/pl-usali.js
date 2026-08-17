// ==========================================================
// P&L USALI 12 MODULE
// ==========================================================
let plCurrentTab = 'stmt';

function plSetTab(t) {
  plCurrentTab = t;
  document.querySelectorAll('#view-pl .pl-usali-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('utab-' + t)?.classList.add('active');
  document.querySelectorAll('#view-pl .pl-panel').forEach(p => p.style.display = 'none');
  document.getElementById('pl-' + t).style.display = '';
  plRender();
}

function plRender() {
  if (!RAW) return;
  // Ensure the active pl panel is visible (in case setView reset display)
  const activePanel = document.getElementById('pl-' + plCurrentTab);
  if (activePanel) {
    document.querySelectorAll('#view-pl .pl-panel').forEach(p => p.style.display = 'none');
    activePanel.style.display = '';
  }
  if (plCurrentTab === 'stmt')   plBuildStmt();
  if (plCurrentTab === 'dept')   plBuildDept();
  if (plCurrentTab === 'undist') plBuildUndist();
  if (plCurrentTab === 'bench')  plBuildBench();
  if (plCurrentTab === 'flow')   plBuildFlow();
}

// ── Helpers ───────────────────────────────────────────────
function plSum(field, year, hotels) {
  return (hotels || getActiveHotels()).reduce((s, h) => {
    return s + n(RAW.hotels_costs[h]?.[field]?.[year]);
  }, 0);
}
function plSumRev(field, year, hotels) {
  return (hotels || getActiveHotels()).reduce((s, h) => {
    return s + n(RAW.hotels_rev[h]?.[field]?.[year]);
  }, 0);
}
function plSumOps(field, year, hotels) {
  return (hotels || getActiveHotels()).reduce((s, h) => {
    return s + n(RAW.hotels_ops[h]?.[field]?.[year]);
  }, 0);
}
function plFmtE(v) {
  if (v == null || isNaN(v)) return '—';
  if(window.VG?.market?.formatMoneyCompact)return window.VG.market.formatMoneyCompact(v,2);
  const abs = Math.abs(v);
  const sign = v < -0.5 ? '-' : '';
  if (abs < 0.5) return '€0';
  if (abs >= 1000000) return sign + '€' + fmt(abs / 1000000, 2) + 'M';
  if (abs >= 1000) return sign + '€' + fmt(abs / 1000, 0) + 'K';
  return sign + '€' + fmt(abs, 0);
}
function plSym(){return window.VG?.market?.symbol?.()||'€';}
function plVar(v25, v26) {
  if (v25 == null || v26 == null || isNaN(v25) || isNaN(v26) || Math.abs(v25) < 1) return '<span class="pl-pct">—</span>';
  const p = (v26 - v25) / Math.abs(v25) * 100;
  const cls = p >= 0 ? 'pl-var-pos' : 'pl-var-neg';
  return `<span class="${cls}">${p >= 0 ? '+' : ''}${fmt(p, 1)}%</span>`;
}
function plPct(val, total) {
  if (val == null || !total) return '—';
  return fmt(val / total * 100, 1) + '%';
}

// ── 1. USALI STATEMENT ────────────────────────────────────
function plBuildStmt() {
  const hotels = getActiveHotels();
  // Revenue
  const aloj25 = plSumRev('ALOJAMENTO',YR_PREV), aloj26 = plSumRev('ALOJAMENTO',YR_CUR);
  const fb25   = plSumRev('ALIMENTACAO',YR_PREV), fb26   = plSumRev('ALIMENTACAO',YR_CUR);
  const div25  = plSumRev('DIVERSOS',YR_PREV),    div26  = plSumRev('DIVERSOS',YR_CUR);
  const tot25  = aloj25+fb25+div25,              tot26  = aloj26+fb26+div26;

  // Departmental costs (F&B direct)
  const fbCom25 = plSum('COMIDAS',YR_PREV), fbCom26 = plSum('COMIDAS',YR_CUR);
  const fbBeb25 = plSum('BEBIDAS',YR_PREV), fbBeb26 = plSum('BEBIDAS',YR_CUR);
  const fbDirC25 = fbCom25+fbBeb25,        fbDirC26 = fbCom26+fbBeb26;

  // Departmental profits
  const deptAloj25 = aloj25, deptAloj26 = aloj26; // Rooms: no direct cost to deduct
  const deptFB25 = fb25 - fbDirC25, deptFB26 = fb26 - fbDirC26;
  const deptDiv25 = div25, deptDiv26 = div26;
  const totalDeptProfit25 = deptAloj25+deptFB25+deptDiv25;
  const totalDeptProfit26 = deptAloj26+deptFB26+deptDiv26;

  // Undistributed Operating Expenses
  const pessoal25 = plSum('PESSOAL',YR_PREV),   pessoal26 = plSum('PESSOAL',YR_CUR);
  const energia25 = plSum('ENERGIA',YR_PREV),   energia26 = plSum('ENERGIA',YR_CUR);
  const manut25   = plSum('MANUTENÇÃO',YR_PREV), manut26   = plSum('MANUTENÇÃO',YR_CUR);
  const mktg25    = plSum('MARKETING',YR_PREV),  mktg26    = plSum('MARKETING',YR_CUR);
  const comun25   = plSum('COMUNICAÇÕES',YR_PREV),comun26  = plSum('COMUNICAÇÕES',YR_CUR);
  const oper25    = plSum('OPERACIONAIS',YR_PREV),oper26   = plSum('OPERACIONAIS',YR_CUR);

  // Total undistributed
  const undist25 = pessoal25+energia25+manut25+mktg25+comun25+oper25;
  const undist26 = pessoal26+energia26+manut26+mktg26+comun26+oper26;

  // GOP = Total Dept Profit − Undistributed
  const gop25 = totalDeptProfit25 - undist25;
  const gop26 = totalDeptProfit26 - undist26;

  // NOP deductions
  const nopVals25 = hotels.map(h => getNopValue(h,YR_PREV)).filter(v => v != null && !isNaN(v));
  const nopVals26 = hotels.map(h => getNopValue(h,YR_CUR)).filter(v => v != null && !isNaN(v));
  const nopTotal25 = nopVals25.length ? nopVals25.reduce((s,v)=>s+v,0) : null;
  const nopTotal26 = nopVals26.length ? nopVals26.reduce((s,v)=>s+v,0) : null;
  const nop25 = nopTotal25 != null ? gop25 - nopTotal25 : null;
  const nop26 = nopTotal26 != null ? gop26 - nopTotal26 : null;

  // Build rows
  function row(label, v25, v26, cls='', indent='') {
    const pct25 = tot25 > 0 ? fmt(v25/tot25*100,1)+'%' : '—';
    const pct26 = tot26 > 0 ? fmt(v26/tot26*100,1)+'%' : '—';
    return `<tr class="${cls} ${indent}">
      <td>${label}</td>
      <td>${plFmtE(v25)}</td><td class="pl-pct">${pct25}</td>
      <td>${plFmtE(v26)}</td><td class="pl-pct">${pct26}</td>
      <td>${plVar(v25,v26)}</td>
    </tr>`;
  }
  function sectionHdr(label) {
    return `<tr class="pl-section-hdr"><td colspan="6">${label}</td></tr>`;
  }
  function subTotal(label, v25, v26, cls='pl-subtotal') {
    return row(label, v25, v26, cls);
  }

  let html = `<div style="overflow-x:auto"><table class="pl-stmt-tbl">
    <thead><tr>
      <th style="text-align:left;width:40%">Linha USALI</th>
      <th>${YR_PREV}</th><th>% Rev</th>
      <th>${YR_CUR}</th><th>% Rev</th>
      <th>Var %</th>
    </tr></thead><tbody>`;

  // REVENUE SECTION
  html += sectionHdr('RECEITAS OPERACIONAIS DEPARTAMENTAIS');
  html += row('Alojamento (Rooms)', aloj25, aloj26, '', 'pl-indent1');
  html += row('F&amp;B (Alimentação & Bebidas)', fb25, fb26, '', 'pl-indent1');
  html += row('Outros Departamentos', div25, div26, '', 'pl-indent1');
  html += subTotal('Total Receitas', tot25, tot26, 'pl-total');

  // DEPARTMENTAL EXPENSES & PROFIT
  html += sectionHdr('RESULTADO DEPARTAMENTAL');
  html += row('Resultado Alojamento', deptAloj25, deptAloj26, '', 'pl-indent1');
  html += row('Custos Directo F&amp;B — Comidas', fbCom25, fbCom26, '', 'pl-indent2');
  html += row('Custos Directo F&amp;B — Bebidas', fbBeb25, fbBeb26, '', 'pl-indent2');
  html += row('Resultado F&amp;B (após custos directos)', deptFB25, deptFB26, '', 'pl-indent1');
  html += row('Resultado Outros Departamentos', deptDiv25, deptDiv26, '', 'pl-indent1');
  html += subTotal('Total Resultado Departamental', totalDeptProfit25, totalDeptProfit26, 'pl-subtotal');

  // UNDISTRIBUTED OPERATING EXPENSES
  html += sectionHdr('CUSTOS NÃO DISTRIBUÍDOS (Undistributed Operating Expenses)');
  html += row('Pessoal (A&G + Departamentos)', pessoal25, pessoal26, '', 'pl-indent1');
  html += row('Utilidades — Energia', energia25, energia26, '', 'pl-indent1');
  html += row('Manutenção e Propriedade (POM)', manut25, manut26, '', 'pl-indent1');
  html += row('Sales &amp; Marketing', mktg25, mktg26, '', 'pl-indent1');
  html += row('Comunicações', comun25, comun26, '', 'pl-indent1');
  html += row('Custos Operacionais', oper25, oper26, '', 'pl-indent1');
  html += subTotal('Total Custos Não Distribuídos', undist25, undist26, 'pl-subtotal');

  // GOP
  html += `<tr class="pl-gop">
    <td>GROSS OPERATING PROFIT (GOP) — cálculo analítico USALI</td>
    <td>${plFmtE(gop25)}</td><td class="pl-pct">${plPct(gop25,tot25)}</td>
    <td>${plFmtE(gop26)}</td><td class="pl-pct">${plPct(gop26,tot26)}</td>
    <td>${plVar(gop25,gop26)}</td>
  </tr>`;

  // NOP
  // Linha de Custos Não Operacionais removida a pedido, para evitar apresentação de valores incorretos.
  // Mantém-se apenas o resultado final NET OPERATING PROFIT (NOP).
  if (nop25 != null || nop26 != null) {
    html += `<tr class="pl-nop">
      <td>NET OPERATING PROFIT (NOP)</td>
      <td>${plFmtE(nop25)}</td><td class="pl-pct">${plPct(nop25,tot25)}</td>
      <td>${plFmtE(nop26)}</td><td class="pl-pct">${plPct(nop26,tot26)}</td>
      <td>${plVar(nop25,nop26)}</td>
    </tr>`;
  }

  // KEY METRICS
  const occ25 = plSumOps('Ocupados',YR_PREV)/Math.max(1,plSumOps('Disponiveis',YR_PREV))*100;
  const occ26 = plSumOps('Ocupados',YR_CUR)/Math.max(1,plSumOps('Disponiveis',YR_CUR))*100;
  const dis25 = plSumOps('Disponiveis',YR_PREV), dis26 = plSumOps('Disponiveis',YR_CUR);
  const revpar25 = dis25>0?aloj25/dis25:0, revpar26 = dis26>0?aloj26/dis26:0;
  const ocu25 = plSumOps('Ocupados',YR_PREV), ocu26 = plSumOps('Ocupados',YR_CUR);
  const adr25 = ocu25>0?aloj25/ocu25:0, adr26 = ocu26>0?aloj26/ocu26:0;
  const trevpar25 = dis25>0?tot25/dis25:0, trevpar26 = dis26>0?tot26/dis26:0;
  const labourPct25 = tot25>0?pessoal25/tot25*100:0, labourPct26 = tot26>0?pessoal26/tot26*100:0;
  const fbCostPct25 = fb25>0?fbDirC25/fb25*100:0, fbCostPct26 = fb26>0?fbDirC26/fb26*100:0;

  html += sectionHdr('INDICADORES-CHAVE USALI');
  html += `<tr class="pl-indent1"><td>Occupancy (Taxa de Ocupação)</td><td>${fmt(occ25,1)}%</td><td></td><td>${fmt(occ26,1)}%</td><td></td><td>${plVar(occ25,occ26)}</td></tr>`;
  html += `<tr class="pl-indent1"><td>ADR — Average Daily Rate</td><td>${plSym()}${fmt(adr25,2)}</td><td></td><td>${plSym()}${fmt(adr26,2)}</td><td></td><td>${plVar(adr25,adr26)}</td></tr>`;
  html += `<tr class="pl-indent1"><td>RevPAR — Revenue per Available Room</td><td>${plSym()}${fmt(revpar25,2)}</td><td></td><td>${plSym()}${fmt(revpar26,2)}</td><td></td><td>${plVar(revpar25,revpar26)}</td></tr>`;
  html += `<tr class="pl-indent1"><td>TRevPAR — Total Revenue per Available Room</td><td>${plSym()}${fmt(trevpar25,2)}</td><td></td><td>${plSym()}${fmt(trevpar26,2)}</td><td></td><td>${plVar(trevpar25,trevpar26)}</td></tr>`;
  html += `<tr class="pl-indent1"><td>Labour Cost % (Custo Pessoal / Receita)</td><td>${fmt(labourPct25,1)}%</td><td></td><td>${fmt(labourPct26,1)}%</td><td></td><td>${plVar(labourPct25,labourPct26)}</td></tr>`;
  html += `<tr class="pl-indent1"><td>F&amp;B Cost % (Custo Directo / Receita F&amp;B)</td><td>${fmt(fbCostPct25,1)}%</td><td></td><td>${fmt(fbCostPct26,1)}%</td><td></td><td>${plVar(fbCostPct25,fbCostPct26)}</td></tr>`;
  html += `<tr class="pl-indent1"><td>GOP % (GOP / Receita Total)</td><td>${plPct(gop25,tot25)}</td><td></td><td>${plPct(gop26,tot26)}</td><td></td><td>${plVar(gop25/Math.max(1,tot25),gop26/Math.max(1,tot26))}</td></tr>`;

  html += '</tbody></table></div>';
  document.getElementById('pl-stmt-table').innerHTML = html;
}

// ── 2. DEPARTMENTAL ANALYSIS ───────────────────────────────
function plBuildDept() {
  const hotels = getActiveHotels();
  const y = YR_CUR;
  const aloj = plSumRev('ALOJAMENTO',y); const aloj25 = plSumRev('ALOJAMENTO',YR_PREV);
  const fb   = plSumRev('ALIMENTACAO',y); const fb25  = plSumRev('ALIMENTACAO',YR_PREV);
  const div  = plSumRev('DIVERSOS',y);
  const tot  = aloj+fb+div; const tot25 = plSumRev('ALOJAMENTO',YR_PREV)+fb25+plSumRev('DIVERSOS',YR_PREV);
  const fbCom = plSum('COMIDAS',y), fbBeb = plSum('BEBIDAS',y);
  const fbDir = fbCom+fbBeb;
  const pessoal = plSum('PESSOAL',y);
  const energia = plSum('ENERGIA',y);
  const manut   = plSum('MANUTENÇÃO',y);
  const mktg    = plSum('MARKETING',y);

  const cards = [
    { name:'🛏 Alojamento', desc:'Rooms Revenue',
      val: plFmtE(aloj), pct: plPct(aloj,tot), sub:`vs ${YR_PREV}: ${plFmtE(aloj25)} ${plVar(aloj25,aloj)}`,
      bar: aloj/tot*100, color:'#c9a84c' },
    { name:'🍽 F&B — Alimentação & Bebidas', desc:'Food & Beverage Revenue',
      val: plFmtE(fb), pct: plPct(fb,tot), sub:`vs ${YR_PREV}: ${plFmtE(fb25)} ${plVar(fb25,fb)}`,
      bar: fb/tot*100, color:'#2a7d8c' },
    { name:'🍽 Custo Directo F&B', desc:'Cost of Food & Beverage',
      val: plFmtE(fbDir), pct: fb>0?fmt(fbDir/fb*100,1)+'% da rec. F&B':'—',
      sub:`Comidas: ${plFmtE(fbCom)} · Bebidas: ${plFmtE(fbBeb)}`,
      bar: fbDir/fb*100, color:'#ef4444' },
    { name:'💰 Margem Bruta F&B', desc:'F&B Gross Profit',
      val: plFmtE(fb-fbDir), pct: fb>0?fmt((fb-fbDir)/fb*100,1)+'% margem':'—',
      sub:`Benchmark USALI: >65% (comidas), >70% (bebidas)`,
      bar: Math.max(0,(fb-fbDir)/fb*100), color:'#27ae60' },
    { name:'👥 Custos de Pessoal', desc:'Total Labour & Related Expenses',
      val: plFmtE(pessoal), pct: plPct(pessoal,tot),
      sub:`Benchmark USALI: 30–35% da Receita Total`,
      bar: Math.min(100,pessoal/tot*100), color: pessoal/tot*100>40?'#ef4444':'#c9a84c' },
    { name:'⚡ Utilidades (Energia)', desc:'Utilities — Property & Operations',
      val: plFmtE(energia), pct: plPct(energia,tot),
      sub:`Benchmark USALI: 4–6% da Receita Total`,
      bar: Math.min(100,energia/tot*100), color: energia/tot*100>8?'#ef4444':'#27ae60' },
    { name:'🔧 Manutenção (POM)', desc:'Property Operations & Maintenance',
      val: plFmtE(manut), pct: plPct(manut,tot),
      sub:`Benchmark USALI: 4–6% da Receita Total`,
      bar: Math.min(100,manut/tot*100), color: manut/tot*100>8?'#ef4444':'#27ae60' },
    { name:'📢 Sales & Marketing', desc:'Sales, Marketing & Distribution',
      val: plFmtE(mktg), pct: plPct(mktg,tot),
      sub:`Benchmark USALI: 3–6% da Receita Total`,
      bar: Math.min(100,mktg/tot*100), color: mktg/tot*100>8?'#ef4444':'#c9a84c' },
  ];

  const html = `<div class="pl-dept-grid">${cards.map(c=>`
    <div class="pl-dept-card">
      <div class="pl-dept-name">${c.name}</div>
      <div style="font-size:9px;color:var(--text-3);margin-bottom:6px">${c.desc}</div>
      <div class="pl-dept-val">${c.val}</div>
      <div class="pl-dept-sub">${c.pct} da receita total</div>
      <div class="pl-dept-sub" style="margin-top:3px;font-size:10px">${c.sub}</div>
      <div class="pl-dept-bar"><div class="pl-dept-bar-fill" style="width:${Math.min(100,c.bar).toFixed(1)}%;background:${c.color}"></div></div>
    </div>`).join('')}</div>`;
  document.getElementById('pl-dept-grid').innerHTML = html;
}

// ── 3. UNDISTRIBUTED EXPENSES ──────────────────────────────
function plBuildUndist() {
  const hotels = getActiveHotels();
  const tot25 = hotels.reduce((s,h)=>s+n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_PREV]),0);
  const tot26 = hotels.reduce((s,h)=>s+n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_CUR]),0);

  const cats = [
    { key:'PESSOAL',     label:'👥 Pessoal',         usali:'A&G + Dept Labour', bench:'30–35%', warnAt:40 },
    { key:'OPERACIONAIS',label:'⚙ Operacionais',      usali:'Sales & Distribution',bench:'5–9%',warnAt:12 },
    { key:'MANUTENÇÃO',  label:'🔧 Manutenção (POM)', usali:'Property Operations', bench:'4–6%',warnAt:8 },
    { key:'ENERGIA',     label:'⚡ Energia',           usali:'Utilities',           bench:'4–6%',warnAt:8 },
    { key:'MARKETING',   label:'📢 Marketing',         usali:'Sales & Marketing',   bench:'3–6%',warnAt:8 },
    { key:'COMUNICAÇÕES',label:'📡 Comunicações',      usali:'Admin & General',     bench:'<1%', warnAt:2 },
  ];

  const cardsHtml = cats.map(c => {
    const v25 = plSum(c.key,YR_PREV), v26 = plSum(c.key,YR_CUR);
    const p25 = tot25>0?v25/tot25*100:0, p26 = tot26>0?v26/tot26*100:0;
    const color = p26>c.warnAt ? '#ef4444' : p26 > c.warnAt*.75 ? '#f59e0b' : '#27ae60';
    return `<div class="pl-dept-card">
      <div class="pl-dept-name">${c.label}</div>
      <div style="font-size:9px;color:var(--text-3);margin-bottom:6px">USALI: ${c.usali} · Benchmark: ${c.bench}</div>
      <div class="pl-dept-val">${plFmtE(v26)}</div>
      <div class="pl-dept-sub" style="color:${color};font-weight:700">${fmt(p26,1)}% da Receita Total</div>
      <div class="pl-dept-sub" style="margin-top:3px">${YR_PREV}: ${plFmtE(v25)} (${fmt(p25,1)}%)  ${plVar(v25,v26)}</div>
      <div class="pl-dept-bar"><div class="pl-dept-bar-fill" style="width:${Math.min(100,p26/c.warnAt*80).toFixed(1)}%;background:${color}"></div></div>
    </div>`;
  }).join('');

  document.getElementById('pl-undist-grid').innerHTML = `<div class="pl-undist-grid">${cardsHtml}</div>`;
}

// ── 4. BENCHMARKING TABLE ──────────────────────────────────
function plBuildBench() {
  const hotels = getActiveHotels();
  const y = YR_CUR;

  const rows = hotels.map(h => {
    const rec = n(RAW.hotels_ops[h]?.['Receita Total']?.[y]);
    if (!rec) return null;
    const cost = totalCosts(h,y);
    const gopV = gop(h,y);
    const gopP = gopV!=null && rec > 0 ? gopV/rec*100 : 0;
    const pesP = rec > 0 ? n(RAW.hotels_costs[h]?.PESSOAL?.[y])/rec*100 : 0;
    const fb   = n(RAW.hotels_rev[h]?.ALIMENTACAO?.[y]);
    const fbC  = n(RAW.hotels_costs[h]?.COMIDAS?.[y]) + n(RAW.hotels_costs[h]?.BEBIDAS?.[y]);
    const fbP  = fb > 0 ? fbC/fb*100 : 0;
    const eneP = rec > 0 ? n(RAW.hotels_costs[h]?.ENERGIA?.[y])/rec*100 : 0;
    const manP = rec > 0 ? n(RAW.hotels_costs[h]?.MANUTENÇÃO?.[y])/rec*100 : 0;
    const occV = occ(h, y) || 0;
    const adrV = adr(h, y) || 0;
    return { h, rec, gopV, gopP, pesP, fbP, eneP, manP, occ: occV, adrV };
  }).filter(Boolean);

  if (!rows.length) { document.getElementById('pl-bench-table').innerHTML = '<tr><td>Sem dados</td></tr>'; return; }

  // Compute medians
  function median(arr) { const s=[...arr].sort((a,b)=>a-b); return s[Math.floor(s.length/2)]; }
  const medGop = median(rows.map(r=>r.gopP));
  const medPes = median(rows.map(r=>r.pesP));
  const medFb  = median(rows.map(r=>r.fbP));
  const medEne = median(rows.map(r=>r.eneP));
  const medMan = median(rows.map(r=>r.manP));
  const medOcc = median(rows.map(r=>r.occ));
  const medAdr = median(rows.map(r=>r.adrV));

  function cell(val, med, higherIsBetter=true) {
    const better = higherIsBetter ? val >= med : val <= med;
    const cls = better ? 'pl-cell-good' : 'pl-cell-bad';
    return `<td class="${cls}">${fmt(val,1)}%</td>`;
  }
  function cellEur(val, med) {
    const cls = val >= med ? 'pl-cell-good' : 'pl-cell-bad';
    return `<td class="${cls}">${plSym()}${fmt(val,0)}</td>`;
  }

  const sorted = [...rows].sort((a,b)=>b.gopP-a.gopP);

  let tbl = `<thead><tr>
    <th>Hotel</th>
    <th>Receita</th>
    <th>GOP%</th>
    <th>Pessoal%</th>
    <th>F&amp;B Cost%</th>
    <th>Energia%</th>
    <th>Manut%</th>
    <th>Occ%</th>
    <th>ADR</th>
  </tr></thead><tbody>`;

  tbl += `<tr class="pl-median-row">
    <td>⬛ Mediana Portfólio</td>
    <td>—</td>
    <td>${fmt(medGop,1)}%</td><td>${fmt(medPes,1)}%</td>
    <td>${fmt(medFb,1)}%</td><td>${fmt(medEne,1)}%</td>
    <td>${fmt(medMan,1)}%</td><td>${fmt(medOcc,1)}%</td>
    <td>${plSym()}${fmt(medAdr,0)}</td>
  </tr>`;

  sorted.forEach(r => {
    tbl += `<tr>
      <td>${r.h.replace('COLLECTION ','C. ')}</td>
      <td style="text-align:right;font-family:var(--mono)">${plFmtE(r.rec)}</td>
      ${cell(r.gopP, medGop, true)}
      ${cell(r.pesP, medPes, false)}
      ${r.fbP > 0 ? cell(r.fbP, medFb, false) : '<td class="pl-pct">—</td>'}
      ${cell(r.eneP, medEne, false)}
      ${cell(r.manP, medMan, false)}
      ${cell(r.occ,  medOcc, true)}
      ${cellEur(r.adrV, medAdr)}
    </tr>`;
  });

  tbl += '</tbody>';
  document.getElementById('pl-bench-table').innerHTML = tbl;
}

// ── 5. EFICIÊNCIA GOP / FLOW-THROUGH ─────────────────────────
function plBuildFlow() {
  const hotels = getActiveHotels();

  const classifyPositiveRevenue = (ft) => {
    if (ft === null || !isFinite(ft)) return { cls:'pl-pct', tag:'— Sem leitura', score:0, color:'#6a7d96' };
    if (ft > 80)  return { cls:'pl-cell-good', tag:'🟢 Excelente', score:5, color:'#27ae60' };
    if (ft >= 60) return { cls:'pl-cell-good', tag:'🟢 Boa', score:4, color:'#27ae60' };
    if (ft >= 40) return { cls:'pl-cell-warn', tag:'🟡 Aceitável', score:3, color:'#f59e0b' };
    if (ft >= 20) return { cls:'pl-cell-warn', tag:'🟠 Fraca', score:2, color:'#f97316' };
    return { cls:'pl-cell-bad', tag:'🔴 Crítica', score:1, color:'#e05c4e' };
  };

  const classifyNegativeRevenue = (lev, deltaGop) => {
    if (deltaGop >= 0) return { cls:'pl-cell-good', tag:'🟢 GOP protegido', score:5, color:'#27ae60' };
    if (lev === null || !isFinite(lev)) return { cls:'pl-pct', tag:'— Sem leitura', score:0, color:'#6a7d96' };
    if (lev < 2) return { cls:'pl-cell-good', tag:'🟢 Controlada', score:4, color:'#27ae60' };
    if (lev < 4) return { cls:'pl-cell-warn', tag:'🟡 Atenção', score:3, color:'#f59e0b' };
    if (lev < 6) return { cls:'pl-cell-warn', tag:'🟠 Elevada', score:2, color:'#f97316' };
    return { cls:'pl-cell-bad', tag:'🔴 Grave', score:1, color:'#e05c4e' };
  };

  const rows = hotels.map(h => {
    const rec25 = n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_PREV]);
    const rec26 = n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_CUR]);
    if (!rec25 || !rec26) return null;
    const gop25v = gop(h,YR_PREV), gop26v = gop(h,YR_CUR);
    const deltaRec = rec26 - rec25, deltaGop = gop26v - gop25v;
    const ft = deltaRec > 0 ? (deltaGop / deltaRec * 100) : null;
    const lev = deltaRec < 0 ? (Math.abs(deltaGop) / Math.abs(deltaRec)) : null;
    const mode = deltaRec > 0 ? 'flow' : deltaRec < 0 ? 'leverage' : 'flat';
    const evalObj = deltaRec > 0 ? classifyPositiveRevenue(ft) : deltaRec < 0 ? classifyNegativeRevenue(lev, deltaGop) : { cls:'pl-pct', tag:'— Sem variação', score:0, color:'#6a7d96' };
    const display = mode === 'flow' ? `${fmt(ft,1)}%` : mode === 'leverage' ? `${fmt(lev,1)}x` : '—';
    const chartValue = mode === 'flow' ? ft : mode === 'leverage' ? lev : null;
    return { h, rec25, rec26, gop25v, gop26v, deltaRec, deltaGop, ft, lev, mode, display, ...evalObj, chartValue };
  }).filter(Boolean);

  if (!rows.length) {
    document.getElementById('pl-flow-grid').innerHTML = `<p style="color:var(--text-3)">Dados insuficientes para calcular a eficiência GOP (requer ${YR_PREV} e ${YR_CUR}).</p>`;
    return;
  }

  const positiveRows = rows.filter(r => r.deltaRec > 0 && r.ft !== null && isFinite(r.ft));
  const negativeRows = rows.filter(r => r.deltaRec < 0 && r.lev !== null && isFinite(r.lev));
  const avgFt = positiveRows.length ? positiveRows.reduce((s,r)=>s+r.ft,0)/positiveRows.length : null;
  const avgLev = negativeRows.length ? negativeRows.reduce((s,r)=>s+r.lev,0)/negativeRows.length : null;

  const excellentGood = positiveRows.filter(r=>r.ft>=60).length;
  const weakCritical = positiveRows.filter(r=>r.ft<40).length;
  const graveLoss = negativeRows.filter(r=>r.deltaGop<0 && r.lev>=4).length;
  const protectedGop = rows.filter(r=>r.deltaRec<0 && r.deltaGop>=0).length;

  let html = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:20px">
    <div class="pl-dept-card">
      <div class="pl-dept-name">Flow-through médio</div>
      <div class="pl-dept-val" style="color:${avgFt===null?'#6a7d96':avgFt>=60?'#27ae60':avgFt>=40?'#f59e0b':'#e05c4e'}">${avgFt===null?'—':fmt(avgFt,1)+'%'}</div>
      <div class="pl-dept-sub">apenas hotéis com receita em crescimento</div>
    </div>
    <div class="pl-dept-card">
      <div class="pl-dept-name">Alavancagem negativa média</div>
      <div class="pl-dept-val" style="color:${avgLev===null?'#6a7d96':avgLev<2?'#27ae60':avgLev<4?'#f59e0b':avgLev<6?'#f97316':'#e05c4e'}">${avgLev===null?'—':fmt(avgLev,1)+'x'}</div>
      <div class="pl-dept-sub">apenas hotéis com receita em queda</div>
    </div>
    <div class="pl-dept-card">
      <div class="pl-dept-name">🟢 Excelente / Boa</div>
      <div class="pl-dept-val" style="color:#27ae60">${excellentGood}</div>
      <div class="pl-dept-sub">flow-through ≥ 60%</div>
    </div>
    <div class="pl-dept-card">
      <div class="pl-dept-name">🔴 Perda elevada / grave</div>
      <div class="pl-dept-val" style="color:#e05c4e">${graveLoss}</div>
      <div class="pl-dept-sub">alavancagem negativa ≥ 4x</div>
    </div>
  </div>`;

  html += `<div style="background:var(--surface-2);border:1px solid var(--border-2);border-radius:10px;padding:10px 14px;margin-bottom:14px;color:var(--text-2);font-size:11px;line-height:1.55">
    <strong style="color:var(--gold)">Leitura:</strong> quando a receita cresce, é apresentado o <strong>Flow-through (%)</strong>. Quando a receita cai, é apresentada a <strong>Alavancagem negativa (x)</strong>, ou seja, quantos euros de GOP se perderam por cada euro perdido de receita.
  </div>`;

  const sorted = [...rows].sort((a,b) => {
    // Prioridade: perdas graves primeiro; depois melhor flow-through.
    const priorityA = a.deltaRec < 0 ? (a.deltaGop < 0 ? a.lev + 100 : 20) : (100 - Math.max(-100, Math.min(150, a.ft || 0)))/10;
    const priorityB = b.deltaRec < 0 ? (b.deltaGop < 0 ? b.lev + 100 : 20) : (100 - Math.max(-100, Math.min(150, b.ft || 0)))/10;
    return priorityB - priorityA;
  });

  html += `<div style="overflow-x:auto"><table class="pl-table" style="min-width:820px">
    <thead><tr>
      <th>Hotel</th><th>Δ Receita</th><th>Δ GOP</th>
      <th>Eficiência GOP</th><th>Tipo</th><th>Avaliação</th>
    </tr></thead><tbody>`;

  sorted.forEach(r => {
    const tipo = r.mode === 'flow' ? 'Flow-through' : r.mode === 'leverage' ? 'Alavancagem negativa' : 'Sem variação';
    const title = r.mode === 'leverage'
      ? `Por cada ${plSym()}1 perdido em receita, ${r.deltaGop < 0 ? 'perderam-se' : 'ganharam-se'} ${plSym()}${fmt(Math.abs(r.lev || 0),1)} de GOP.`
      : r.mode === 'flow'
        ? `Por cada ${plSym()}1 adicional de receita, ${plSym()}${fmt((r.ft || 0)/100,2)} chegaram ao GOP.`
        : '';
    html += `<tr title="${title}">
      <td>${r.h.replace('COLLECTION ','C. ')}</td>
      <td style="text-align:right;font-family:var(--mono)">${r.deltaRec>=0?'+':''}${plFmtE(r.deltaRec)}</td>
      <td style="text-align:right;font-family:var(--mono)">${r.deltaGop>=0?'+':''}${plFmtE(r.deltaGop)}</td>
      <td class="${r.cls}" style="font-size:13px;font-weight:800">${r.display}</td>
      <td style="font-size:11px;color:var(--text-3)">${tipo}</td>
      <td style="font-size:11px">${r.tag}</td>
    </tr>`;
  });

  html += '</tbody></table></div>';
  document.getElementById('pl-flow-grid').innerHTML = html;

  // Chart: mostra a métrica adequada para cada hotel. A unidade varia conforme o tipo.
  if (charts['chartPlFlow']) { charts['chartPlFlow'].destroy(); delete charts['chartPlFlow']; }
  const ctx = document.getElementById('chartPlFlow');
  if (!ctx) return;
  const topN = sorted.filter(r=>r.chartValue!==null && isFinite(r.chartValue)).slice(0,20);
  charts['chartPlFlow'] = new Chart(ctx, {
    type:'bar',
    data:{
      labels: topN.map(r=>r.h.length>18?r.h.substring(0,16)+'…':r.h),
      datasets:[{
        label:'Eficiência GOP',
        data: topN.map(r=>r.chartValue),
        backgroundColor: topN.map(r=>r.color.replace('#','rgba(') === r.color ? r.color : r.color),
        borderColor: topN.map(r=>r.color),
        borderWidth:1, borderRadius:4
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{display:false},
        tooltip:{
          callbacks:{
            label:(ctx)=>{
              const r = topN[ctx.dataIndex];
              return r.mode === 'flow' ? `Flow-through: ${fmt(r.ft,1)}%` : `Alavancagem negativa: ${fmt(r.lev,1)}x`;
            },
            afterLabel:(ctx)=>{
              const r = topN[ctx.dataIndex];
              return r.mode === 'leverage'
                ? `Por cada ${plSym()}1 perdido em receita: ${r.deltaGop < 0 ? '-' : '+'}${plSym()}${fmt(Math.abs(r.lev||0),1)} GOP`
                : `Por cada ${plSym()}1 adicional de receita: ${plSym()}${fmt((r.ft||0)/100,2)} GOP`;
            }
          }
        }
      },
      scales:{
        x:{ticks:{color:'#6a7d96',font:{size:9},maxRotation:45},grid:{color:'rgba(255,255,255,.04)'}},
        y:{ticks:{color:'#6a7d96',font:{size:10},callback:v=>v},grid:{color:'rgba(255,255,255,.06)'},
           title:{display:true,text:'% quando receita sobe | x quando receita cai',color:'#6a7d96',font:{size:10}}}
      }
    }
  });
}

