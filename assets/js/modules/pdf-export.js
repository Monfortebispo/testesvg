// ==========================================================
// PDF EXPORT MODULE
// Opens a new window with ONLY the print content — no sidebar, no topbar, no original page.
// Pipeline: visit each tab → wait for render → capture canvas as PNG → build new window → print
// ==========================================================

const PDF_TABS = [
  { id:'resumo',     label:'Resumo',     icon:'⬛' },
  { id:'receitas',   label:'Receitas',   icon:'📈' },
  { id:'custos',     label:'Custos',     icon:'📉' },
  { id:'kpis',       label:'KPIs',       icon:'🎯' },
  { id:'instagram',  label:'Instagram',  icon:'📱' },
  { id:'ocupacao',   label:'Ocupação',   icon:'🛏' },
  { id:'reputacao',  label:'Reputação',  icon:'⭐' },
];

function pdfShowModal() {
  const modal = document.getElementById('pdfModal');
  const box   = document.getElementById('pdfCheckboxes');
  box.innerHTML = PDF_TABS.map(t => `
    <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border-2);border-radius:8px;cursor:pointer;font-size:12px;color:var(--text-1);font-family:var(--font);font-weight:600;transition:border-color .15s"
           onmouseover="this.style.borderColor='var(--gold)'" onmouseout="this.style.borderColor='var(--border-2)'">
      <input type="checkbox" id="pdfChk-${t.id}" checked style="width:15px;height:15px;accent-color:var(--gold);cursor:pointer">
      <span style="font-size:14px">${t.icon}</span> ${t.label}
    </label>`).join('');

  // Popula o seletor de hotel com a lista actual de hotéis disponíveis
  const hotelSel = document.getElementById('pdfHotelSel');
  if (hotelSel && RAW && RAW.hotel_list) {
    const current = hotelSel.value;
    hotelSel.innerHTML = '<option value="__all__">🌐 Todos os hotéis (seleção actual)</option>' +
      RAW.hotel_list.slice().sort().map(h => `<option value="${h}">${h.replace('COLLECTION ','C. ')}</option>`).join('');
    if ([...hotelSel.options].some(o => o.value === current)) hotelSel.value = current;
  }

  modal.style.display = 'flex';
}

function pdfHideModal() {
  document.getElementById('pdfModal').style.display = 'none';
}

function pdfSelectAll() {
  PDF_TABS.forEach(t => { const el = document.getElementById('pdfChk-' + t.id); if (el) el.checked = true; });
}

function pdfExport() {
  const selected = PDF_TABS.filter(t => document.getElementById('pdfChk-' + t.id)?.checked);
  if (!selected.length) { showToast('Selecciona pelo menos um separador', true); return; }
  pdfHideModal();

  const hotelChoice = document.getElementById('pdfHotelSel')?.value || '__all__';
  let restoreHotels = null;
  if (hotelChoice !== '__all__') {
    restoreHotels = new Set(selectedHotels); // guarda seleção actual para restaurar depois
    selectedHotels = new Set([hotelChoice]);
    showToast(`A preparar PDF para ${hotelChoice} — os separadores vão ser visitados rapidamente...`);
  } else {
    showToast('A preparar PDF — os separadores vão ser visitados rapidamente...');
  }
  setTimeout(() => pdfPipeline(selected, restoreHotels, hotelChoice), 300);
}

function pdfWait(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Pipeline ──────────────────────────────────────────────
async function pdfPipeline(tabs, restoreHotels, hotelChoice) {
  const prevView = currentView;
  const captures = {};

  for (const tab of tabs) {
    setView(tab.id);
    // Give heavier views more time to render all charts
    const heavyViews = ['kpis','reputacao','instagram','ocupacao'];
    await pdfWait(heavyViews.includes(tab.id) ? 1200 : 700);

    const images = {};
    document.querySelectorAll('canvas[id]').forEach(cv => {
      try {
        const url = cv.toDataURL('image/png');
        if (url && url.length > 5000) images[cv.id] = url; // skip blank canvases
      } catch(e) {}
    });

    const tables = {};
    ['mainTableBody','revTableBody','costTableBody','kpiTableBody','igRankBody','rtRankBody'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.innerHTML.trim()) tables[id] = el.innerHTML;
    });
    const kpiEl = document.getElementById('kpiGrid');
    if (kpiEl) tables['kpiGrid'] = kpiEl.innerHTML;
    const rtKpiEl = document.getElementById('rtKpis');
    if (rtKpiEl) tables['rtKpis'] = rtKpiEl.innerHTML;

    captures[tab.id] = { images, tables };
  }

  setView(prevView);
  // Restaura a seleção de hotéis original, se foi temporariamente filtrada para 1 hotel
  if (restoreHotels) {
    selectedHotels = restoreHotels;
    if (typeof refreshAll === 'function') { try { refreshAll(); } catch(e){} }
  }
  await pdfWait(200);
  pdfOpenWindow(tabs, captures, hotelChoice);
}

// ── Open print window ─────────────────────────────────────
function pdfOpenWindow(tabs, captures, hotelChoice) {
  const now = new Date().toLocaleString('pt-PT',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
  const meses = [...selectedMeses].sort((a,b)=>a-b).map(m=>MES_NOME[m]||m).join(' + ') || '—';
  const nHoteis = typeof getActiveHotels === 'function' ? getActiveHotels().length : '—';
  const scopeLabel = (hotelChoice && hotelChoice !== '__all__') ? hotelChoice : null;
  const logoUrl = new URL('assets/icons/vg-ops-180.png', window.location.href).href;

  let sectionsHtml = '';
  tabs.forEach(tab => {
    const cap = captures[tab.id] || { images:{}, tables:{} };
    sectionsHtml += `<div class="pdf-section">
      <div class="pdf-hdr">
        <div class="pdf-brand"><img class="pdf-logo" src="${logoUrl}" alt="Vila Galé"><span>Vila Galé</span></div>
        <div class="pdf-hdr-title">${tab.icon} ${tab.label}${scopeLabel ? ' — ' + scopeLabel : ''}</div>
        <div class="pdf-hdr-meta">Vila Galé Hotéis &nbsp;·&nbsp; ${now} &nbsp;·&nbsp; ${
          tab.id === 'reputacao'
            ? (() => { const keys = Object.keys(REP_STORE); return keys.length ? keys.length + ' hotéis · ReviewPro' : 'ReviewPro'; })()
            : 'Período: ' + meses + ' &nbsp;·&nbsp; ' + (scopeLabel || (nHoteis + ' unidades'))
        }</div>
      </div>
      ${pdfSectionBody(tab.id, cap.images, cap.tables)}
      <div class="pdf-footer"><span>Vila Galé Hotéis · Dashboard Operações</span><span>${now}</span></div>
    </div>`;
  });

  const win = window.open('', '_blank');
  if (!win) { showToast('Popup bloqueado — permite popups para este ficheiro', true); return; }

  win.document.write(`<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<title>Vila Galé — Dashboard Operações</title>
<style>
  @page { size: A4 landscape; margin: 10mm 12mm 13mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 8.5pt; color: #1a2535; background: #fff;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  .pdf-section { display: block; page-break-after: always; break-after: page; padding-bottom: 8mm; }
  .pdf-section:last-child { page-break-after: avoid; break-after: avoid; }

  /* Header */
  .pdf-hdr { display: flex; align-items: center; gap: 10px; padding: 5px 0 8px; border-bottom: 2.5px solid #1e3a5f; margin-bottom: 11px; break-inside: avoid; }
  .pdf-brand { display:flex;align-items:center;gap:6px;min-width:92px;color:#1e3a5f;font-weight:800;font-size:8pt;white-space:nowrap; }
  .pdf-logo { width:27px;height:27px;object-fit:contain;border-radius:4px; }
  .pdf-hdr-title { font-size: 13pt; font-weight: 800; color: #1e3a5f; flex: 1; }
  .pdf-hdr-meta { font-size: 7pt; color: #555; font-family: monospace; }

  /* KPIs */
  .kpi-row { display: flex; gap: 7px; margin-bottom: 10px; flex-wrap: wrap; }
  .kpi-box { flex: 1; min-width: 90px; border: 1px solid #ddd; border-radius: 5px; padding: 6px 9px;
             background: #f8f9fb; border-left: 3px solid #1e3a5f; break-inside: avoid; }
  .kpi-lbl { font-size: 6.5pt; text-transform: uppercase; letter-spacing: 1px; color: #777; font-weight: 700; margin-bottom: 2px; }
  .kpi-val { font-size: 13pt; font-weight: 800; color: #1a2535; font-family: monospace; line-height: 1.2; }
  .kpi-sub { font-size: 7pt; color: #666; font-family: monospace; }

  /* Charts */
  .charts-row { display: flex; gap: 8px; margin-bottom: 10px; align-items: stretch; }
  .chart-box { flex: 1; border: 1px solid #ddd; border-radius: 5px; padding: 7px 9px; background: #fafafa; break-inside: avoid; }
  .chart-title { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #1e3a5f; margin-bottom: 5px; }
  .chart-box img { width: 100%; height: 165px; object-fit: contain; display: block; }
  .chart-empty { height: 165px; display: flex; align-items: center; justify-content: center; color: #bbb; font-size: 8pt; }

  /* Tables */
  .tbl-wrap { margin-bottom: 10px; }
  .tbl-title { font-size: 8.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;
               color: #1e3a5f; margin-bottom: 5px; padding-bottom: 3px; border-bottom: 1px solid #ddd; }
  table { width: 100%; border-collapse: collapse; font-size: 7pt; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  th { background: #1e3a5f; color: #fff; padding: 4px 5px; text-align: right;
       font-size: 6.5pt; font-weight: 700; white-space: nowrap; border: 1px solid #163060; }
  th:first-child, th:nth-child(2) { text-align: left; }
  td { padding: 3.5px 5px; text-align: right; border: 1px solid #e5e7eb; font-family: monospace; color: #333; }
  td:first-child { text-align: left; font-family: Arial, sans-serif; font-weight: 600; color: #1a2535; }
  td:nth-child(2) { text-align: left; }
  tbody tr:nth-child(even) td { background: #f5f7fa; }
  .pdf-footer { margin-top:8px; padding-top:5px; border-top:1px solid #d6dce5; display:flex; justify-content:space-between; gap:10px; color:#6b7280; font-size:6.5pt; font-family:Arial,Helvetica,sans-serif; break-inside:avoid; }

  /* Misc */
  .no-data { color: #aaa; font-size: 9pt; padding: 10px 0; }
  @media print {
    .no-print { display: none !important; }
    body { font-size: 8.5pt; }
  }
</style>

<style id="ri-style">
#view-revenueint .ri-hero{background:linear-gradient(135deg,rgba(201,168,76,.16),rgba(30,138,154,.10));border:1px solid var(--border);border-radius:16px;padding:18px 20px;margin-bottom:16px;display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap}
#view-revenueint .ri-title{font-size:24px;font-weight:800;color:var(--text-1);letter-spacing:-.03em;margin-bottom:6px}
#view-revenueint .ri-sub{font-size:13px;color:var(--text-2);max-width:850px;line-height:1.5}
#view-revenueint .ri-controls{display:flex;gap:10px;flex-wrap:wrap;align-items:end;margin-bottom:16px;background:var(--surface-1);border:1px solid var(--border);border-radius:14px;padding:12px}
#view-revenueint .ri-control label{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800;margin-bottom:5px}
#view-revenueint select{background:var(--surface-2);color:var(--text-1);border:1px solid var(--border);border-radius:8px;padding:8px 10px;min-width:160px;font-size:12px}
#view-revenueint .ri-btn{background:var(--gold);color:var(--navy);border:0;border-radius:8px;padding:9px 14px;font-size:12px;font-weight:800;cursor:pointer}
#view-revenueint .ri-kpis{display:grid;grid-template-columns:repeat(4,minmax(160px,1fr));gap:12px;margin-bottom:16px}
#view-revenueint .ri-kpi{background:var(--surface-1);border:1px solid var(--border);border-radius:14px;padding:14px;min-height:106px}
#view-revenueint .ri-kpi-l{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800;margin-bottom:8px}
#view-revenueint .ri-kpi-v{font-size:24px;font-weight:900;color:var(--text-1);line-height:1.1}
#view-revenueint .ri-kpi-s{font-size:11px;color:var(--text-2);margin-top:8px;line-height:1.35}
#view-revenueint .ri-good{color:var(--pos)!important}#view-revenueint .ri-bad{color:var(--neg)!important}#view-revenueint .ri-warn{color:var(--gold)!important}
#view-revenueint .ri-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
#view-revenueint .ri-card{background:var(--surface-1);border:1px solid var(--border);border-radius:14px;padding:14px;min-width:0}
#view-revenueint .ri-card.wide{grid-column:1/-1}
#view-revenueint .ri-card h3{font-size:15px;margin-bottom:4px;color:var(--text-1)}
#view-revenueint .ri-card .hint{font-size:11px;color:var(--text-3);margin-bottom:10px}
#view-revenueint .ri-chart{height:320px;position:relative}
#view-revenueint .ri-table{width:100%;border-collapse:collapse;font-size:12px}
#view-revenueint .ri-table th{position:sticky;top:0;background:var(--surface-2);color:var(--text-2);text-transform:uppercase;font-size:10px;letter-spacing:.06em;padding:9px;text-align:right;border-bottom:1px solid var(--border)}
#view-revenueint .ri-table th:first-child,#view-revenueint .ri-table td:first-child{text-align:left}
#view-revenueint .ri-table td{padding:8px 9px;border-bottom:1px solid var(--border-2);text-align:right;color:var(--text-1)}
#view-revenueint .ri-table-wrap{max-height:410px;overflow:auto;border:1px solid var(--border-2);border-radius:10px}
#view-revenueint .ri-pill{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:4px 8px;font-size:10px;font-weight:800;border:1px solid var(--border)}
#view-revenueint .ri-pill.red{background:rgba(192,57,43,.12);color:#ff9b8f}#view-revenueint .ri-pill.yellow{background:rgba(201,168,76,.14);color:var(--gold-2)}#view-revenueint .ri-pill.green{background:rgba(31,158,107,.12);color:#74e0b0}
#view-revenueint .ri-summary{background:rgba(255,255,255,.03);border:1px dashed var(--border);border-radius:12px;padding:14px;color:var(--text-2);line-height:1.65;font-size:13px;white-space:pre-line}
#view-revenueint .ri-note{font-size:11px;color:var(--text-3);margin-top:8px;line-height:1.4}
@media(max-width:1100px){#view-revenueint .ri-kpis{grid-template-columns:1fr 1fr}#view-revenueint .ri-grid{grid-template-columns:1fr}}
</style>

<style id="ri2-style">
#view-revenueint .ri2-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:20px 0 12px;padding:14px 16px;background:linear-gradient(135deg,rgba(201,168,76,.10),rgba(30,138,154,.08));border:1px solid var(--border);border-radius:14px}
#view-revenueint .ri2-head h2{font-size:18px;letter-spacing:-.02em;margin:0;color:var(--text-1)}
#view-revenueint .ri2-head p{font-size:12px;color:var(--text-2);margin:4px 0 0;line-height:1.45}
#view-revenueint .ri2-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px}
#view-revenueint .ri2-card{background:var(--surface-1);border:1px solid var(--border);border-radius:14px;padding:14px;min-width:0}
#view-revenueint .ri2-card.wide{grid-column:1/-1}
#view-revenueint .ri2-card h3{font-size:14px;color:var(--text-1);margin:0 0 4px}
#view-revenueint .ri2-card .hint{font-size:11px;color:var(--text-3);margin-bottom:10px;line-height:1.35}
#view-revenueint .ri2-score{font-family:var(--mono);font-size:12px;font-weight:800;border-radius:999px;padding:3px 8px;border:1px solid var(--border);white-space:nowrap}
#view-revenueint .ri2-score.good{color:#74e0b0;background:rgba(31,158,107,.10)}
#view-revenueint .ri2-score.warn{color:var(--gold-2);background:rgba(201,168,76,.12)}
#view-revenueint .ri2-score.bad{color:#ff9b8f;background:rgba(192,57,43,.12)}
#view-revenueint .ri2-calendar{overflow:auto;border:1px solid var(--border-2);border-radius:10px}
#view-revenueint .ri2-calendar table{min-width:980px}
#view-revenueint .ri2-small{font-size:11px;color:var(--text-3);line-height:1.4;margin-top:8px}
@media(max-width:1100px){#view-revenueint .ri2-grid{grid-template-columns:1fr}}
</style>
</head><body>
${sectionsHtml}
<div class="no-print" style="text-align:center;padding:20px;font-family:Arial;font-size:11pt;color:#555">
  <div style="max-width:780px;margin:0 auto 12px;padding:9px 12px;border:1px solid #d7dde6;border-radius:7px;background:#f8fafc;font-size:10pt"><b>Para um PDF institucional limpo:</b> na janela de impressão desative “Cabeçalhos e rodapés”. Assim não aparecem data do browser, URL/about:blank nem numeração automática do navegador.</div>
  <button onclick="window.print()" style="background:#1e3a5f;color:#fff;border:none;padding:12px 28px;border-radius:6px;font-size:12pt;font-weight:700;cursor:pointer;margin-right:12px">🖨 Imprimir / Guardar PDF</button>
  <button onclick="window.close()" style="background:#eee;color:#333;border:none;padding:12px 20px;border-radius:6px;font-size:12pt;cursor:pointer">Fechar</button>
</div>
</body></html>`);
  win.document.close();
}

// ── Helpers ───────────────────────────────────────────────
function pdfImg(images, id, title) {
  const src = images[id];
  const body = src
    ? `<img src="${src}">`
    : `<div class="chart-empty">Sem dados</div>`;
  return `<div class="chart-box"><div class="chart-title">${title}</div>${body}</div>`;
}

function pdfKpis(tablesHtml) {
  if (!tablesHtml) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = tablesHtml;
  const cards = tmp.querySelectorAll('.kpi-card');
  if (!cards.length) return '';
  return `<div class="kpi-row">` + [...cards].map(c => {
    const lbl = c.querySelector('.kpi-label')?.textContent?.trim() || '';
    const val = c.querySelector('.kpi-value')?.textContent?.trim() || '';
    const sub = c.querySelector('.kpi-sub')?.textContent?.trim() || '';
    return `<div class="kpi-box"><div class="kpi-lbl">${lbl}</div><div class="kpi-val">${val}</div><div class="kpi-sub">${sub}</div></div>`;
  }).join('') + `</div>`;
}

function pdfCleanTable(html) {
  if (!html) return '';
  return html
    .replace(/class="[^"]*"/g,'')
    .replace(/onclick="[^"]*"/g,'')
    .replace(/style="[^"]*background[^"]*"/g,'')
    .replace(/<div[^>]*hotel-dot[^>]*><\/div>/g,'')
    .replace(/<div[^>]*td-hotel-name[^>]*>([\s\S]*?)<\/div>/g,'$1')
    .replace(/<div[^>]*occ-bar-wrap[^>]*>[\s\S]*?<\/div>/g,'')
    .replace(/<div[^>]*><\/div>/g,'')
    .replace(/<span[^>]*delta-badge[^>]*>/g,'<span>')
    .replace(/<div[^>]*>/g,'').replace(/<\/div>/g,'');
}

function pdfTable(title, thead, tbody) {
  const clean = pdfCleanTable(tbody);
  if (!clean || !clean.trim()) return `<div class="tbl-wrap"><div class="tbl-title">${title}</div><p class="no-data">Sem dados disponíveis</p></div>`;
  return `<div class="tbl-wrap"><div class="tbl-title">${title}</div><table><thead>${thead}</thead><tbody>${clean}</tbody></table></div>`;
}

// ── Section bodies ────────────────────────────────────────
function pdfSectionBody(tabId, images, tables) {
  switch(tabId) {
    case 'resumo':    return pdfBodyResumo(images, tables);
    case 'receitas':  return pdfBodyReceitas(images, tables);
    case 'custos':    return pdfBodyCustos(images, tables);
    case 'kpis':      return pdfBodyKpis(images, tables);
    case 'instagram': return pdfBodyInstagram(images, tables);
    case 'ocupacao':   return pdfBodyOcupacao(images, tables);
    case 'reputacao':  return pdfBodyReputacao(images, tables);
    default: return '<p class="no-data">Sem dados</p>';
  }
}

function pdfBodyResumo(images, tables) {
  const kpis = pdfKpis(tables['kpiGrid']);
  const charts = `<div class="charts-row">
    ${pdfImg(images,'chartRevHotel','Receita Total — '+YR_PREV+' vs '+YR_CUR)}
    ${pdfImg(images,'chartRevMix','Mix de Receitas')}
    ${pdfImg(images,'chartGOP','GOP por Hotel')}
    ${pdfImg(images,'chartGOPpct','GOP % (Margem)')}
  </div>`;
  const th = `<tr><th>Hotel</th><th>Rec.${YR_PREV}</th><th>Rec.${YR_CUR}</th><th>Δ €</th><th>Δ %</th><th>Occ ${YR_PREV.slice(2)}</th><th>Occ ${YR_CUR.slice(2)}</th><th>RevPAR ${YR_PREV.slice(2)}</th><th>RevPAR ${YR_CUR.slice(2)}</th><th>ADR ${YR_PREV.slice(2)}</th><th>ADR ${YR_CUR.slice(2)}</th><th>GOP ${YR_PREV.slice(2)}</th><th>GOP ${YR_CUR.slice(2)}</th><th>GOP%</th><th>GOP sem sede</th></tr>`;
  return kpis + charts + pdfTable('Tabela Comparativa', th, tables['mainTableBody']);
}

function pdfBodyReceitas(images, tables) {
  const charts = `<div class="charts-row">
    ${pdfImg(images,'chartRevAloj','Receita Alojamento — '+YR_PREV+' vs '+YR_CUR)}
    ${pdfImg(images,'chartRevFB','Receita F&B — '+YR_PREV+' vs '+YR_CUR)}
    ${pdfImg(images,'chartVarPct','Variação de Receita Total (%)')}
  </div>`;
  const th = `<tr><th>Hotel</th><th>Aloj ${YR_PREV.slice(2)}</th><th>Aloj ${YR_CUR.slice(2)}</th><th>FB ${YR_PREV.slice(2)}</th><th>FB ${YR_CUR.slice(2)}</th><th>Outros ${YR_PREV.slice(2)}</th><th>Outros ${YR_CUR.slice(2)}</th><th>Total ${YR_PREV.slice(2)}</th><th>Total ${YR_CUR.slice(2)}</th><th>Δ%</th></tr>`;
  return charts + pdfTable('Receitas por Categoria', th, tables['revTableBody']);
}

function pdfBodyCustos(images, tables) {
  const charts = `<div class="charts-row">
    ${pdfImg(images,'chartCostPessoal','Custos Pessoal — '+YR_PREV+' vs '+YR_CUR)}
    ${pdfImg(images,'chartCostFB','Custos Comidas & Bebidas')}
    ${pdfImg(images,'chartCostVarPct','Variação Total de Custos (%)')}
  </div><div class="charts-row">
    ${pdfImg(images,'chartCostStack','Custos por Categoria '+YR_CUR)}
    ${pdfImg(images,'chartCostRatio','Rácio Custos / Receita')}
  </div>`;
  const th = `<tr><th>Hotel</th><th>Pes.25</th><th>Pes.26</th><th>Δ%</th><th>Com.25</th><th>Com.26</th><th>Δ%</th><th>Beb.25</th><th>Beb.26</th><th>Δ%</th><th>Ene.25</th><th>Ene.26</th><th>Δ%</th><th>Tot.25</th><th>Tot.26</th><th>Δ%</th></tr>`;
  return charts + pdfTable('Custos por Categoria — '+YR_PREV+' vs '+YR_CUR, th, tables['costTableBody']);
}

function pdfBodyKpis(images, tables) {
  const charts = `<div class="charts-row">
    ${pdfImg(images,'chartADR','ADR — Average Daily Rate')}
    ${pdfImg(images,'chartDormidas','Dormidas '+YR_PREV+' vs '+YR_CUR)}
    ${pdfImg(images,'chartKpiOcc','Taxa de Ocupação')}
    ${pdfImg(images,'chartKpiRevpar','RevPAR')}
  </div>`;
  const th = `<tr><th>Hotel</th><th>Occ ${YR_PREV.slice(2)}</th><th>Occ ${YR_CUR.slice(2)}</th><th>Δ %</th><th>ADR ${YR_PREV.slice(2)}</th><th>ADR ${YR_CUR.slice(2)}</th><th>Δ %</th><th>RevPAR ${YR_PREV.slice(2)}</th><th>RevPAR ${YR_CUR.slice(2)}</th><th>Δ %</th><th>TRevPAR ${YR_PREV.slice(2)}</th><th>TRevPAR ${YR_CUR.slice(2)}</th><th>Δ %</th><th>GOP ${YR_PREV.slice(2)}</th><th>GOP ${YR_CUR.slice(2)}</th><th>Δ %</th><th>GOP% ${YR_PREV.slice(2)}</th><th>GOP% ${YR_CUR.slice(2)}</th><th>Δ p.p.</th><th>GOP sem sede ${YR_PREV.slice(2)}</th><th>GOP sem sede ${YR_CUR.slice(2)}</th><th>Δ %</th><th>Dorm. ${YR_PREV.slice(2)}</th><th>Dorm. ${YR_CUR.slice(2)}</th><th>Δ %</th></tr>`;
  return charts + pdfTable('KPIs por Hotel', th, tables['kpiTableBody']);
}

function pdfBodyInstagram(images, tables) {
  if (!IG_SNAPSHOTS.length) return '<p class="no-data">Sem dados Instagram.</p>';
  const snap = IG_SNAPSHOTS[IG_SNAPSHOTS.length-1];
  const sorted = igGetSortedMonths();
  const lastMes = sorted[sorted.length-1] || '';
  const mesData = snap.months[lastMes] || {};
  const hotels = Object.keys(mesData).sort();
  const totalSeg   = hotels.reduce((s,h) => s+(mesData[h]?.seguidores||0), 0);
  const totalViews = hotels.reduce((s,h) => s+(mesData[h]?.views||0), 0);
  const totalPubs  = hotels.reduce((s,h) => s+(mesData[h]?.total||0), 0);
  const kpis = `<div class="kpi-row">
    <div class="kpi-box"><div class="kpi-lbl">Total Seguidores</div><div class="kpi-val">${totalSeg.toLocaleString('pt-PT')}</div><div class="kpi-sub">${igCapMes(lastMes)}</div></div>
    <div class="kpi-box"><div class="kpi-lbl">Total Visualizações</div><div class="kpi-val">${totalViews.toLocaleString('pt-PT')}</div><div class="kpi-sub">Todas as plataformas</div></div>
    <div class="kpi-box"><div class="kpi-lbl">Total Publicações</div><div class="kpi-val">${totalPubs.toLocaleString('pt-PT')}</div><div class="kpi-sub">Posts + Histórias</div></div>
    <div class="kpi-box"><div class="kpi-lbl">Meses com dados</div><div class="kpi-val">${sorted.length}</div><div class="kpi-sub">${igCapMes(sorted[0]||'')} → ${igCapMes(lastMes)}</div></div>
  </div>`;
  const charts = `<div class="charts-row">
    ${pdfImg(images,'igChartSeguidores','Seguidores por Hotel')}
    ${pdfImg(images,'igChartViews','Visualizações por Hotel')}
    ${pdfImg(images,'igChartPubs','Posts + Histórias')}
    ${pdfImg(images,'igChartGrowth','Crescimento de Seguidores')}
  </div>`;
  const th = `<tr><th>Hotel</th><th>Seguidores</th><th>Δ</th><th>Posts</th><th>Histórias</th><th>Total</th><th>Média/Dia</th><th>Visualizações</th><th>Gostos</th><th>Partilhas</th><th>Alcance</th></tr>`;
  return kpis + charts + pdfTable(`Ranking — ${igCapMes(lastMes)}`, th, tables['igRankBody']);
}

function pdfBodyOcupacao(images, tables) {
  if (!OCC_SNAPSHOTS.length) return '<p class="no-data">Sem dados de ocupação.</p>';
  const snap = OCC_SNAPSHOTS[OCC_SNAPSHOTS.length-1];
  const hotels = Object.keys(snap.data).sort();
  const ANOS = [2025, 2026];
  const charts = ''; // charts removed — only heatmap table
  let tbody = '';
  hotels.forEach(hotel => {
    ANOS.forEach(ano => {
      const row = snap.data[hotel]?.[ano];
      if (!row || row.every(v=>v==null)) return;
      tbody += `<tr><td>${hotel.replace('COLLECTION ','C. ')}</td><td style="font-weight:700">${ano}</td>`;
      row.forEach(v => {
        if (v==null) { tbody += `<td style="color:#bbb">—</td>`; return; }
        const bg = v>=80?'#d1fae5':v>=60?'#fef9c3':v>=40?'#ffedd5':'#fee2e2';
        const tc = v>=80?'#065f46':v>=60?'#78350f':v>=40?'#9a3412':'#991b1b';
        tbody += `<td style="background:${bg};color:${tc};font-weight:600">${v.toFixed(1)}</td>`;
      });
      tbody += `</tr>`;
    });
  });
  const th = `<tr><th>Hotel</th><th>Ano</th><th>Jan</th><th>Fev</th><th>Mar</th><th>Abr</th><th>Mai</th><th>Jun</th><th>Jul</th><th>Ago</th><th>Set</th><th>Out</th><th>Nov</th><th>Dez</th></tr>`;
  return pdfTable('Heatmap de Ocupação — 2025 vs 2026 (%)', th, tbody);
}

function pdfBodyReputacao(images, tables) {
  if (!Object.keys(REP_STORE).length) return '<p class="no-data">Sem dados de reputação. Carregue PDFs ReviewPro primeiro.</p>';

  // KPIs row — parse from captured rtKpis HTML (class="rt-kpi")
  let kpisHtml = '';
  if (tables['rtKpis']) {
    const tmp = document.createElement('div');
    tmp.innerHTML = tables['rtKpis'];
    const kpiCards = tmp.querySelectorAll('.rt-kpi');
    if (kpiCards.length) {
      kpisHtml = '<div class="kpi-row">' + [...kpiCards].map(card => {
        const lbl = card.querySelector('.rt-kpi-lbl')?.textContent?.trim() || '';
        const val = card.querySelector('.rt-kpi-val')?.textContent?.trim() || '';
        const sub = card.querySelector('.rt-kpi-sub')?.textContent?.trim() || '';
        return `<div class="kpi-box"><div class="kpi-lbl">${lbl}</div><div class="kpi-val">${val}</div><div class="kpi-sub">${sub}</div></div>`;
      }).join('') + '</div>';
    }
  }

  // Charts
  const charts = `<div class="charts-row">
    ${pdfImg(images,'rtChartGRI','GRI™ — Índice Global de Reputação')}
    ${pdfImg(images,'rtChartEvo','Evolução Semanal do GRI™')}
    ${pdfImg(images,'rtChartDepts','Categorias de Qualidade')}
    ${pdfImg(images,'rtChartReviews','Volume de Reviews')}
  </div><div class="charts-row">
    ${pdfImg(images,'rtChartSources','Fontes de Reviews')}
  </div>`;

  // Ranking table
  const thRanking = `<tr>
    <th>#</th><th>Hotel</th><th>Semana</th>
    <th>GRI™</th><th>Δ GRI</th><th>Objetivo</th>
    <th>Reviews</th><th>Resp%</th>
    <th>Serviço</th><th>Quarto</th><th>Limpeza</th><th>Valor</th><th>CQI™</th><th>Rank VG</th>
  </tr>`;

  return kpisHtml + charts + pdfTable('Ranking de Reputação — ReviewPro', thRanking, tables['rtRankBody']);
}

// END PDF MODULE
// ==========================================================

// ── Heatmap de categorias neg/pos ─────────────────────────

