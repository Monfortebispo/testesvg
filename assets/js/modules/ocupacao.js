function occSym(){return window.VG?.market?.symbol?.()||'€';}
function occRegionLabel(r){return r==='todos'?'Todos os Hotéis':(window.VG?.market?.regionLabel?.(r)||({norte:'Norte e Centro',lisboa:'Lisboa & Ilhas',alentejo:'Alentejo',algarve:'Algarve'})[r]||String(r||''));}
// OCUPAÇÃO — Módulo completo
// ==========================================================

// OCC_SNAPSHOTS: array of { id, label, loadedAt, data }
// data: { HOTEL_NAME: { 2025: [jan..dez], 2026: [...], 2027: [...] } }
let OCC_SNAPSHOTS = [];

// Garante que todos os snapshots têm um timestamp válido (migra sessões antigas
// gravadas antes desta correção, que não tinham o campo ts) e ordena
// cronologicamente. Deve ser chamado sempre que OCC_SNAPSHOTS é substituído
// de fora (ex: restauro de sessão), e é chamado também após cada novo upload.
function occSortSnapshots() {
  OCC_SNAPSHOTS.forEach(s => {
    if (s.ts != null) return;
    let ts = null;
    if (s.label) {
      const m = s.label.match(/(\d{2})\/(\d{2})\/(\d{4}),?\s+(\d{2}):(\d{2})/);
      if (m) {
        const parsed = new Date(Number(m[3]), Number(m[2])-1, Number(m[1]), Number(m[4]), Number(m[5]));
        if (!isNaN(parsed)) ts = parsed.getTime();
      }
    }
    if (ts == null && s.loadedAt) {
      const parsed = new Date(s.loadedAt);
      if (!isNaN(parsed)) ts = parsed.getTime();
    }
    s.ts = ts != null ? ts : (s.id || 0);
  });
  OCC_SNAPSHOTS.sort((a,b) => (a.ts ?? 0) - (b.ts ?? 0));
}

const OCC_MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// ── Drag & drop ───────────────────────────────────────────
function occHandleDrop(e) {
  e.preventDefault();
  document.getElementById('occDropZone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) occLoadFile(file);
}

// ── Load & parse ──────────────────────────────────────────
async function occLoadFile(file) {
  if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
    showToast('Ficheiro inválido — carregue um PDF', true); return;
  }
  const dcBefore = typeof window.vgDataCenterCapture === 'function' ? window.vgDataCenterCapture('occupancy') : null;
  showToast('A extrair dados do PDF...');
  try {
    const text = await occReadPdf(file);
    if (!text) { showToast('Não foi possível ler o PDF', true); return; }
    const data = occParsePdf(text);
    const hotelCount = Object.keys(data).length;
    if (hotelCount === 0) { showToast('Nenhum hotel reconhecido no PDF', true); return; }

    // Extract date from PDF footer — format: "M/D/YYYY H:MM:SS AM/PM"
    let pdfLabel = null;
    let pdfTimestamp = null;
    const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}:\d{2}:\d{2}\s*[AP]M)/i);
    if (dateMatch) {
      try {
        const parsed = new Date(`${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]} ${dateMatch[4]}`);
        if (!isNaN(parsed)) {
          pdfLabel = parsed.toLocaleString('pt-PT', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'});
          pdfTimestamp = parsed.getTime();
        }
      } catch(e) {}
    }

    const snap = {
      id: Date.now(),
      label: pdfLabel || new Date().toLocaleString('pt-PT', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}),
      loadedAt: new Date().toISOString(),
      // Timestamp real extraído do PDF (rodapé do ReviewPro). Usado para ordenar
      // os snapshots cronologicamente, independentemente da ordem de upload.
      // Se o PDF não tiver data legível, cai para o momento do carregamento —
      // assim um snapshot sem data nunca fica antes de um com data conhecida.
      ts: pdfTimestamp != null ? pdfTimestamp : Date.now(),
      data
    };
    OCC_SNAPSHOTS.push(snap);
    // Garantir ordem cronológica real (por data do PDF), não a ordem de upload.
    occSortSnapshots();
    occUpdateUI();
    showToast(`✓ Ocupação carregada — ${hotelCount} hotéis · snapshot ${OCC_SNAPSHOTS.length}`);
    uploadSetStatus('uploadStatusOcc', `✓ ${hotelCount} hotéis · ${OCC_SNAPSHOTS.length} snapshot(s)`, true);
    if (typeof window.vgDataCenterRecord === 'function') window.vgDataCenterRecord({
      source:'occupancy', fileName:file.name, fileSize:file.size, scope:snap.label, before:dcBefore,
      duplicate:OCC_SNAPSHOTS.filter(x=>String(x.ts||x.label)===String(snap.ts||snap.label)).length>1,
      metrics:{hotels:hotelCount,snapshots:OCC_SNAPSHOTS.length}, summary:`Snapshot de ocupação · ${hotelCount} hotéis`
    });
  } catch(e) {
    showToast('Erro ao processar PDF: ' + e.message, true);
    if (typeof window.vgDataCenterRecordFailure === 'function') window.vgDataCenterRecordFailure({source:'occupancy',fileName:file.name,fileSize:file.size,summary:e.message,warnings:[e.message]});
  }
}

async function occReadPdf(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const lib = window['pdfjs-dist/build/pdf'];
        if (!lib) { rej(new Error('PDF.js não carregado')); return; }
        const pdf = await lib.getDocument({ data: e.target.result }).promise;
        let full = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const pg = await pdf.getPage(i);
          const tc = await pg.getTextContent();
          full += tc.items.map(t => t.str).join(' ') + '\n';
        }
        res(full);
      } catch(err) { rej(err); }
    };
    reader.onerror = () => rej(new Error('Leitura falhou'));
    reader.readAsArrayBuffer(file);
  });
}

function occParsePdf(text) {
  const lines = text.split(/\n/).map(l => l.replace(/\s+/g,' ').trim()).filter(Boolean);
  const data = {};

  const KNOWN_HOTELS = [
    'ALBACORA','ALENTEJO VINEYARDS','AMPALIUS','ATLANTICO','CASAS DE ELVAS',
    'CASCAIS','CERRO ALAGOA','COIMBRA','COLLECTION ALTER REAL','COLLECTION BRAGA',
    'COLLECTION DOURO','COLLECTION ELVAS','COLLECTION FIGUEIRA DA FOZ',
    'COLLECTION MONTE DO VILAR','COLLECTION PALACIO DOS ARCOS',
    'COLLECTION PONTE DE LIMA VINEYARDS','COLLECTION PRAIA','COLLECTION S. MIGUEL',
    'COLLECTION SERRA DA ESTRELA','COLLECTION SINTRA','COLLECTION TOMAR',
    'DOURO VINEYARDS','ERICEIRA','ESTORIL','EVORA','ISLA CANELA',
    'LAGOS','MARINA','NAUTICO','NEP KIDS','OPERA','PORTO','PORTO RIBEIRA',
    'SANTA CRUZ','TAVIRA',
    // Brasil — V31
    'FORTALEZA','SALVADOR','CUMBUCO','RIO DE JANEIRO','TOUROS','MARES','PAULISTA','CABO','ECO RESORT DE ANGRA','ALAGOAS',
    'COLLECTION SUNSET CUMBUCO','COLLECTION OURO PRETO','COLLECTION AMAZÔNIA','COLLECTION AMAZONIA','AMAZONIA','OURO PRETO','SUNSET CUMBUCO',
    // Nomes antigos (antes de passarem a Collection) — normalizados abaixo
    'SINTRA','SERRA DA ESTRELA'
  ];

  // Normaliza nomes antigos → nome actual (para consistência entre anos)
  const HOTEL_NAME_MAP = {
    'SINTRA': 'COLLECTION SINTRA',
    'SERRA DA ESTRELA': 'COLLECTION SERRA DA ESTRELA',
    'COLLECTION AMAZONIA':'COLLECTION AMAZÔNIA','AMAZONIA':'COLLECTION AMAZÔNIA',
    'OURO PRETO':'COLLECTION OURO PRETO','SUNSET CUMBUCO':'COLLECTION SUNSET CUMBUCO'
  };

  // For partial rows (< 12 values): align to END of year (i.e. offset = 12 - count)
  // This is correct when a hotel's season ends in Dec or before Dec.
  // For rows where the hotel starts mid-year but also ends mid-year,
  // we detect by checking if the last value is very low (near 0) suggesting Dec tail.
  // In practice: PDF always starts from Jan and dashes are just absent in the text.
  // The only reliable rule is: partial rows start at Jan and end early,
  // OR start late and end at Dec. We distinguish by checking if first value
  // is reasonable for Jan (hotels known to be closed in Jan have very low first values).

  // After careful analysis of the uploaded PDF:
  // ALBACORA 2025: 10 values → starts Mar (idx 2) ends Dec  — wait, Jan=11.66 present, ends at Oct
  // Actually: ALBACORA 2025 has 10 values, last value is 8.79 = Oct. So starts Jan, ends Oct (10 months).
  // ALBACORA 2026: 11 values Jan-Nov. Last = 0.04 Nov.
  // MARINA 2025: 10 values. Looking at PDF: "42.20 58.92 74.18..." starts Mar based on season pattern
  // CASAS DE ELVAS 2025: 7 values starting at Jun (hotel opened mid-2025)
  // PONTE DE LIMA 2025: 9 values. First=0.15 (very low), clearly partial opening around Apr
  // NAUTICO 2025: 10 values, starts Mar
  // ISLA CANELA 2025: 9 values, starts Jan (8.80), ends Sep
  // DOURO VINEYARDS 2025: 11 values, starts Jan, missing Dec
  // MONTE DO VILAR 2026: 11 values Jan-Nov

  // Correct approach: partial rows align to START (Jan) by default,
  // UNLESS the hotel is known to have opened mid-year.
  // Hotels with partial data that start mid-year (from EMBEDDED nulls in early months):
  const LATE_START = {
    // hotel -> { year -> startMonthIndex (0=Jan) }
    'CASAS DE ELVAS':                     { 2025: 5  }, // Jun (first EMBEDDED is Mar 2026 → opened ~Jun 2025)
    'COLLECTION PONTE DE LIMA VINEYARDS': { 2025: 3  }, // Apr (EMBEDDED Mar 2025 null, Apr has 0 occupied)
    'MARINA':                             { 2025: 2  }, // Mar (season hotel)
    'NAUTICO':                            { 2025: 2  }, // Mar
    'ISLA CANELA':                        { 2025: 0  }, // Jan but ends Sep (align start)
  };

  const ROW_RE = /\b(202[4-9])\b((?:\s+\d{1,3}\.\d{2}){1,12})/g;
  const sortedHotels = [...KNOWN_HOTELS].sort((a,b) => b.length - a.length);
  const hotelPattern = new RegExp(
    '(' + sortedHotels.map(h => h.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|') + ')',
    'gi'
  );

  const fullText = lines.join('\n');
  const sections = fullText.split(hotelPattern).filter(Boolean);

  let currentHotel = null;
  for (const sec of sections) {
    const upperSec = sec.trim().toUpperCase();
    const matchedHotel = sortedHotels.find(h => upperSec === h);
    if (matchedHotel) {
      currentHotel = HOTEL_NAME_MAP[matchedHotel] ?? matchedHotel;
      if (!data[currentHotel]) data[currentHotel] = {};
      continue;
    }
    if (!currentHotel) continue;

    let m;
    ROW_RE.lastIndex = 0;
    while ((m = ROW_RE.exec(sec)) !== null) {
      const year = parseInt(m[1]);
      const nums = m[2].trim().split(/\s+/).map(Number).filter(v => !isNaN(v));
      const count = nums.length;
      const arr = Array(12).fill(null);

      // Determine start offset
      let offset = 0;
      const lateStart = LATE_START[currentHotel]?.[year];

      if (count === 12) {
        offset = 0; // full year
      } else if (lateStart !== undefined) {
        offset = lateStart; // known late opener
      } else {
        // Default: assume starts in January (offset=0)
        // Partial data means season ended before December
        offset = 0;
      }

      nums.forEach((v, i) => {
        const idx = offset + i;
        if (idx < 12) arr[idx] = v > 0 ? v : null;
      });

      data[currentHotel][year] = arr;
    }
  }

  return data;
}
// ── UI Update ─────────────────────────────────────────────
function occUpdateUI() {
  const hasData = OCC_SNAPSHOTS.length > 0;
  document.getElementById('occEmpty').style.display    = hasData ? 'none'  : 'block';
  document.getElementById('occControls').style.display = hasData ? 'flex'  : 'none';

  // Rebuild snapshot chips
  const chipsEl = document.getElementById('occSnapshots');
  chipsEl.innerHTML = OCC_SNAPSHOTS.map((s,i) =>
    `<div class="occ-snap-chip">
      <span class="snap-dot"></span>
      Snapshot ${i+1} · ${s.label}
      <span class="snap-del" onclick="occDeleteSnap(${s.id})" title="Remover">✕</span>
    </div>`
  ).join('');

  // Rebuild hotel selector
  const hotelSel = document.getElementById('occHotelSel');
  const prevHotel = hotelSel.value;
  const snap = OCC_SNAPSHOTS[OCC_SNAPSHOTS.length - 1];
  const hotels = snap ? Object.keys(snap.data).sort() : [];
  hotelSel.innerHTML = '<option value="__all__">— Todos os hotéis (heatmap) —</option>' +
    hotels.map(h => `<option value="${h}">${h.replace('COLLECTION ','C. ')}</option>`).join('');
  if (hotels.includes(prevHotel)) hotelSel.value = prevHotel;

  // Rebuild snapshot selector
  const snapSel = document.getElementById('occSnapSel');
  snapSel.innerHTML = '<option value="__latest__">Mais recente</option>' +
    OCC_SNAPSHOTS.map((s,i) => `<option value="${s.id}">Snapshot ${i+1} · ${s.label}</option>`).join('');

  occRender();
}

function occDeleteSnap(id) {
  if (!confirm('Remover este snapshot?')) return;
  OCC_SNAPSHOTS = OCC_SNAPSHOTS.filter(s => s.id !== id);
  occUpdateUI();
  if (OCC_SNAPSHOTS.length === 0) {
    ['occKpis','occCharts','occHeatmapWrap','occCompareWrap','occIntelWrap','occAdvancedWrap'].forEach(id =>
      document.getElementById(id).style.display = 'none');
  }
}

function occClearAll() {
  if (!confirm('Apagar todos os dados de ocupação?')) return;
  OCC_SNAPSHOTS = [];
  occUpdateUI();
  ['occKpis','occCharts','occHeatmapWrap','occCompareWrap','occIntelWrap','occAdvancedWrap'].forEach(id =>
    document.getElementById(id).style.display = 'none');
  showToast('Dados de ocupação apagados');
}

// ── Render ────────────────────────────────────────────────
let occChartLineInst = null;
let occChartDeltaInst = null;
let occChartCompareInst = null;
let occChartBookingCurveInst = null;
let occChartPortfolioInst = null;

function occGetSnap() {
  const sel = document.getElementById('occSnapSel').value;
  if (sel === '__latest__') return OCC_SNAPSHOTS[OCC_SNAPSHOTS.length - 1];
  return OCC_SNAPSHOTS.find(s => s.id === parseInt(sel)) || OCC_SNAPSHOTS[OCC_SNAPSHOTS.length - 1];
}


function occAvg(arr) {
  const v = (arr || []).filter(x => x != null && !isNaN(x));
  return v.length ? v.reduce((a,b)=>a+b,0)/v.length : null;
}
function occYearData(hdata, year) {
  if (!hdata || year == null) return Array(12).fill(null);
  const arr = hdata[year] ?? hdata[String(year)] ?? hdata[Number(year)];
  return Array.isArray(arr) ? arr : Array(12).fill(null);
}
function occNextYear() {
  const y = Number(YR_CUR);
  return Number.isFinite(y) ? String(y + 1) : String(new Date().getFullYear() + 1);
}
function occWeightedAvgRows(rows, valueKey, weightFn) {
  let sw = 0, sv = 0;
  (rows || []).forEach(r => {
    const v = Number(r?.[valueKey]);
    if (!Number.isFinite(v)) return;
    const rawW = Number(weightFn ? weightFn(r) : 1);
    const w = Number.isFinite(rawW) && rawW > 0 ? rawW : 1;
    sw += w; sv += v * w;
  });
  return sw > 0 ? sv / sw : null;
}
function occStd(arr) {
  const v = (arr || []).filter(x => x != null && !isNaN(x));
  if (v.length < 2) return 0;
  const m = v.reduce((a,b)=>a+b,0)/v.length;
  return Math.sqrt(v.reduce((s,x)=>s+Math.pow(x-m,2),0)/v.length);
}
function occStatus(avg) {
  if (avg == null) return {key:'watch', label:'Sem dados', badge:'occ-badge-watch', icon:'⚪'};
  if (avg >= 85) return {key:'good', label:'Controlado', badge:'occ-badge-good', icon:'🟢'};
  if (avg >= 70) return {key:'watch', label:'Vigilância', badge:'occ-badge-watch', icon:'🟡'};
  if (avg >= 55) return {key:'warn', label:'Atenção', badge:'occ-badge-warn', icon:'🟠'};
  return {key:'crit', label:'Crítico', badge:'occ-badge-crit', icon:'🔴'};
}
function occShortName(h) { return (h || '').replace('COLLECTION ','C. '); }
function occTrendLabel(delta) {
  if (delta == null) return {txt:'sem comparação', cls:'watch', icon:'→'};
  if (delta >= 3) return {txt:'melhoria clara', cls:'good', icon:'↗'};
  if (delta <= -3) return {txt:'deterioração', cls:'crit', icon:'↘'};
  return {txt:'estável', cls:'watch', icon:'→'};
}
function occRowsFromSnap(snap) {
  const hotels = Object.keys(snap?.data || {}).sort();
  const filtered = activeRegion && activeRegion !== 'todos' ? hotels.filter(h => selectedHotels.has(h)) : hotels;
  return filtered.map(h => {
    const y25 = occYearData(snap.data[h], YR_PREV);
    const y26 = occYearData(snap.data[h], YR_CUR);
    const months26 = y26.filter(x=>x!=null).length;
    const avg26 = occAvg(y26);
    const avg25 = occAvg(y25.slice(0, months26 || y25.length));
    const delta = avg25 != null && avg26 != null ? avg26 - avg25 : null;
    const std = occStd(y26);
    const last = [...y26].reverse().find(x=>x!=null);
    const first = y26.find(x=>x!=null);
    const internalTrend = last != null && first != null ? last - first : null;
    const status = occStatus(avg26);
    return {hotel:h, avg26, avg25, delta, std, last, first, internalTrend, status};
  }).filter(r => r.avg26 != null);
}
function occRenderIntelligence(snap, hotel=null) {
  const wrap = document.getElementById('occIntelWrap');
  const grid = document.getElementById('occInsightGrid');
  const list = document.getElementById('occPriorityList');
  const matrix = document.getElementById('occMatrix');
  const scope = document.getElementById('occIntelScope');
  if (!wrap || !grid || !list || !matrix || !snap) return;
  wrap.style.display = 'block';

  let rows = occRowsFromSnap(snap);
  if (hotel && hotel !== '__all__') rows = rows.filter(r => r.hotel === hotel);
  if (!rows.length) { grid.innerHTML=''; list.innerHTML='<div class="occ-insight-sub">Sem dados suficientes.</div>'; matrix.innerHTML=''; return; }

  const portfolioAvg = occWeightedAvgRows(rows, 'avg26', r => occQuartosHotel(r.hotel));
  const avgDeltaRows = rows.filter(r=>r.delta!=null);
  const portfolioDelta = occWeightedAvgRows(avgDeltaRows, 'delta', r => occQuartosHotel(r.hotel));
  const best = [...rows].sort((a,b)=>b.avg26-a.avg26)[0];
  const worst = [...rows].sort((a,b)=>a.avg26-b.avg26)[0];
  const volatile = [...rows].sort((a,b)=>b.std-a.std)[0];
  const improving = [...rows].filter(r=>r.delta!=null).sort((a,b)=>b.delta-a.delta)[0];
  const falling = [...rows].filter(r=>r.delta!=null).sort((a,b)=>a.delta-b.delta)[0];
  const st = occStatus(portfolioAvg);
  const tr = occTrendLabel(portfolioDelta);
  scope.className = `occ-insight-badge ${st.badge}`;
  scope.textContent = hotel && hotel !== '__all__' ? occShortName(hotel) : 'Portefólio filtrado';

  grid.innerHTML = [
    {lbl:'Semáforo comercial', val:`${st.icon} ${st.label}`, sub:`Ocupação média ${YR_CUR}: ${portfolioAvg.toFixed(1)}%`, cls:st.key},
    {lbl:`Tendência vs ${YR_PREV}`, val:`${tr.icon} ${portfolioDelta!=null?(portfolioDelta>=0?'+':'')+portfolioDelta.toFixed(1)+' pp':'—'}`, sub:tr.txt, cls:tr.cls},
    {lbl:'Melhor oportunidade', val:occShortName(worst.hotel), sub:`ocupação média ${worst.avg26.toFixed(1)}%`, cls:worst.status.key},
    {lbl:'Maior volatilidade', val:occShortName(volatile.hotel), sub:`variação interna ${volatile.std.toFixed(1)} pts`, cls:volatile.std>18?'warn':'watch'},
    {lbl:'Melhor desempenho', val:occShortName(best.hotel), sub:`ocupação média ${best.avg26.toFixed(1)}%`, cls:'good'},
    {lbl:'Maior queda', val:falling?occShortName(falling.hotel):'—', sub:falling?`${falling.delta.toFixed(1)} pp vs ${YR_PREV}`:'sem comparação', cls:falling&&falling.delta<-3?'crit':'watch'}
  ].map(k => `<div class="occ-insight ${k.cls}">
    <div class="occ-insight-label">${k.lbl}</div>
    <div class="occ-insight-value">${k.val}</div>
    <div class="occ-insight-sub">${k.sub}</div>
  </div>`).join('');

  const priority = [...rows].sort((a,b) => {
    const score = r => (100-r.avg26) + (r.delta!=null && r.delta<0 ? Math.abs(r.delta)*2 : 0) + (r.std>15 ? r.std/2 : 0);
    return score(b)-score(a);
  }).slice(0,8);
  list.innerHTML = priority.map((r,i) => {
    const reason = r.delta!=null && r.delta < -3 ? `queda ${r.delta.toFixed(1)} pp vs ${YR_PREV}` : r.std>18 ? `volátil: ${r.std.toFixed(1)} pts` : `ocupação ${r.avg26.toFixed(1)}%`;
    return `<div class="occ-priority-item">
      <div class="occ-priority-rank">${i+1}</div>
      <div><div class="occ-priority-name">${occShortName(r.hotel)}</div><div class="occ-priority-reason">${r.status.icon} ${r.status.label} · ${reason}</div></div>
      <div class="occ-priority-metric">${r.avg26.toFixed(1)}%</div>
    </div>`;
  }).join('');

  const groups = {
    good:{title:'🟢 Forte e a melhorar', rows:[]},
    watch:{title:'🟡 Forte mas a vigiar', rows:[]},
    warn:{title:'🟠 Fraco mas a recuperar', rows:[]},
    crit:{title:'🔴 Fraco e a piorar', rows:[]}
  };
  rows.forEach(r => {
    const strong = r.avg26 >= 70;
    const trendOk = r.delta == null ? true : r.delta >= 0;
    const key = strong && trendOk ? 'good' : strong && !trendOk ? 'watch' : !strong && trendOk ? 'warn' : 'crit';
    groups[key].rows.push(r);
  });
  matrix.innerHTML = Object.entries(groups).map(([key,g]) => `<div class="occ-quadrant ${key}">
    <h4>${g.title}</h4>
    <div class="occ-q-list">${g.rows.slice(0,6).map(r=>`<span class="occ-q-chip" title="${r.avg26.toFixed(1)}%">${occShortName(r.hotel)}</span>`).join('') || '<span class="occ-insight-sub">Sem hotéis</span>'}</div>
  </div>`).join('');
}


function occOpsMetricsForHotel(hotel) {
  const years = [YR_CUR, YR_PREV].filter((v,i,a)=>v && a.indexOf(v)===i);
  const year = years[0] || String(new Date().getFullYear());
  let aloj = 0, occRooms = 0, total = 0;
  const months = (typeof selectedMeses !== 'undefined' && selectedMeses?.size) ? [...selectedMeses] : Object.keys(STORE || {}).map(Number);
  months.forEach(mm => {
    const d = STORE?.[mm]?.hotels_ops?.[hotel];
    if (!d) return;
    aloj += n(d['Receita Alojamento']?.[year] ?? d['Receita Alojamento']?.[String(year)]);
    total += n(d['Receita Total']?.[year] ?? d['Receita Total']?.[String(year)]);
    occRooms += n(d['Ocupados']?.[year] ?? d['Ocupados']?.[String(year)]);
  });
  if (!occRooms && RAW?.hotels_ops?.[hotel]) {
    const d = RAW.hotels_ops[hotel];
    aloj = n(d['Receita Alojamento']?.[year] ?? d['Receita Alojamento']?.[String(year)]);
    total = n(d['Receita Total']?.[year] ?? d['Receita Total']?.[String(year)]);
    occRooms = n(d['Ocupados']?.[year] ?? d['Ocupados']?.[String(year)]);
  }
  const adr = occRooms > 0 ? aloj / occRooms : null;
  return {adr, total, occRooms};
}

function occRenderAdvanced(snap, hotel='__all__') {
  const wrap = document.getElementById('occAdvancedWrap');
  if (!wrap || !snap) return;
  wrap.style.display = 'block';
  occRenderBookingCurve(snap, hotel);
  occRenderPortfolioPerformance(snap, hotel);
  occRenderRevenueRadar(snap, hotel);
}

function occRenderBookingCurve(snap, hotel='__all__') {
  const canvas = document.getElementById('occChartBookingCurve');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const snaps = OCC_SNAPSHOTS.length ? OCC_SNAPSHOTS : [snap];
  const labels = snaps.map((s,i)=>`S${i+1}`);
  const hotels = hotel && hotel !== '__all__'
    ? [hotel]
    : Object.keys(snap.data || {}).filter(h => !activeRegion || activeRegion === 'todos' || selectedHotels.has(h));
  const months = [...Array(12)].map((_,i)=>i);
  const monthScores = months.map(mi => {
    const vals = snaps.map(s => {
      let sw=0, sv=0;
      hotels.forEach(h => {
        const v = occYearData(s.data?.[h], YR_CUR)?.[mi];
        if (v == null || isNaN(v)) return;
        const rw = Number(occQuartosHotel(h));
        const w = Number.isFinite(rw) && rw > 0 ? rw : 1;
        sw += w; sv += Number(v) * w;
      });
      return sw > 0 ? +(sv/sw).toFixed(1) : null;
    });
    const latest = [...vals].reverse().find(v=>v!=null);
    return {mi, vals, latest};
  }).filter(x => x.vals.some(v=>v!=null));
  const palette = ['#c9a84c','#1e8a9a','#60a5fa','#f87171','#a78bfa','#34d399','#fbbf24','#fb7185','#22d3ee','#818cf8','#f97316','#e879f9'];
  if (occChartBookingCurveInst) occChartBookingCurveInst.destroy();
  occChartBookingCurveInst = new Chart(ctx, {
    type:'line',
    data:{ labels, datasets: monthScores.map((m,i)=>({ label:OCC_MESES[m.mi], data:m.vals, borderColor:palette[i%palette.length], backgroundColor:'rgba(255,255,255,.03)', borderWidth:2, pointRadius:4, tension:.3, spanGaps:true })) },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'top',labels:{color:'#94aabf',font:{size:10}}}}, scales:{ x:{ticks:{color:'#64748b'},grid:{color:'rgba(255,255,255,.04)'}}, y:{min:0,max:100,ticks:{callback:v=>v+'%',color:'#64748b'},grid:{color:'rgba(255,255,255,.04)'}} } }
  });
}

function occRenderPortfolioPerformance(snap, hotel='__all__') {
  const canvas = document.getElementById('occChartPortfolio');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const hotels = Object.keys(snap.data || {}).filter(h => (hotel && hotel !== '__all__') ? h===hotel : (!activeRegion || activeRegion==='todos' || selectedHotels.has(h)));
  const rows = hotels.map(h => {
    const occVal = occAvg(occYearData(snap.data?.[h], YR_CUR));
    const met = occOpsMetricsForHotel(h);
    return {hotel:h, x:occVal, y:met.adr, r:met.total ? Math.max(5, Math.min(18, Math.sqrt(met.total)/60)) : 8, total:met.total, occRooms:met.occRooms, rooms:occQuartosHotel(h)};
  }).filter(r=>r.x!=null && r.y!=null && isFinite(r.y));
  const avgOcc = occWeightedAvgRows(rows, 'x', r => r.rooms) ?? 70;
  const avgAdr = occWeightedAvgRows(rows, 'y', r => r.occRooms) ?? 100;
  if (occChartPortfolioInst) occChartPortfolioInst.destroy();
  occChartPortfolioInst = new Chart(ctx, {
    type:'bubble',
    data:{ datasets:[{ label:'Hotéis', data:rows, backgroundColor:'rgba(201,168,76,.35)', borderColor:'#c9a84c', borderWidth:1.5 }] },
    options:{ responsive:true, maintainAspectRatio:false, parsing:false, plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:(c)=>`${occShortName(c.raw.hotel)}: OCC ${c.raw.x.toFixed(1)}% · ADR ${fmt(c.raw.y,0)}${occSym()} · Rec. ${fmt(c.raw.total,0)}${occSym()}` } } }, scales:{ x:{min:0,max:100,title:{display:true,text:`Ocupação média ${YR_CUR}`,color:'#94aabf'},ticks:{callback:v=>v+'%',color:'#64748b'},grid:{color:'rgba(255,255,255,.04)'}}, y:{title:{display:true,text:'ADR estimado',color:'#94aabf'},ticks:{callback:v=>v+'€',color:'#64748b'},grid:{color:'rgba(255,255,255,.04)'}} } },
    plugins:[{ id:'occQuadrantLines', afterDraw(chart){ const {ctx, chartArea:{left,right,top,bottom}, scales:{x,y}}=chart; ctx.save(); ctx.strokeStyle='rgba(255,255,255,.18)'; ctx.setLineDash([5,4]); const vx=x.getPixelForValue(avgOcc), hy=y.getPixelForValue(avgAdr); ctx.beginPath(); ctx.moveTo(vx,top); ctx.lineTo(vx,bottom); ctx.moveTo(left,hy); ctx.lineTo(right,hy); ctx.stroke(); ctx.fillStyle='rgba(148,170,191,.75)'; ctx.font='10px Plus Jakarta Sans'; ctx.fillText('↑ ADR / OCC →', left+8, top+14); ctx.restore(); } }]
  });
}

function occPressure(v) {
  if (v >= 90) return {cls:'occ-pressure-high', label:'Pressão', icon:'🔴', action:'Fechar descontos, rever preço e controlar disponibilidade.'};
  if (v >= 70) return {cls:'occ-pressure-mid', label:'Atenção', icon:'🟡', action:'Acompanhar pickup e evitar baixar tarifa sem necessidade.'};
  return {cls:'occ-pressure-low', label:'Oportunidade', icon:'🔵', action:'Ativar campanha, grupos ou reforço comercial.'};
}
function occRenderRevenueRadar(snap, hotel='__all__') {
  const table = document.getElementById('occRevenueRadarTable');
  const actions = document.getElementById('occRevenueRadarActions');
  if (!table || !actions) return;
  const hotels = Object.keys(snap.data || {}).filter(h => (hotel && hotel !== '__all__') ? h===hotel : (!activeRegion || activeRegion==='todos' || selectedHotels.has(h)));
  const radarYear = YR_CUR;
  let rows=[];
  hotels.forEach(h=>{
    const arr = occYearData(snap.data?.[h], YR_CUR);
    arr.forEach((v,i)=>{ if(v!=null) rows.push({hotel:h, month:OCC_MESES[i], monthIdx:i, year:radarYear, occ:v, adr:occOpsMetricsForHotel(h).adr}); });
  });
  // Mantém só os 12 casos de maior pressão (mais relevantes para ação),
  // depois ordena por calendário (Jan→Dez) para leitura cronológica.
  rows = rows.sort((a,b)=> Math.abs((b.occ||0)-70) - Math.abs((a.occ||0)-70)).slice(0,12);
  rows.sort((a,b)=> a.monthIdx - b.monthIdx || occShortName(a.hotel).localeCompare(occShortName(b.hotel)));
  table.innerHTML = `<thead><tr><th>Hotel</th><th>Mês</th><th>Ocupação</th><th>ADR</th><th>Estado</th><th>Ação sugerida</th></tr></thead><tbody>` + rows.map(r=>{ const p=occPressure(r.occ); return `<tr><td>${occShortName(r.hotel)}</td><td>${r.month}/${String(r.year).slice(-2)}</td><td>${r.occ.toFixed(1)}%</td><td>${r.adr!=null?fmt(r.adr,0)+occSym():'—'}</td><td><span class="occ-pressure-pill ${p.cls}">${p.icon} ${p.label}</span></td><td style="font-family:var(--font);color:var(--text-2)">${p.action}</td></tr>`; }).join('') + `</tbody>`;
  const high = rows.filter(r=>r.occ>=90).length, low = rows.filter(r=>r.occ<70).length, mid = rows.filter(r=>r.occ>=70 && r.occ<90).length;
  actions.innerHTML = [
    {t:'Pressão alta', x:`${high} casos acima de 90%. Prioridade: proteger preço e fechar promoções.`},
    {t:'Oportunidade comercial', x:`${low} casos abaixo de 70%. Prioridade: criar procura e rever canais.`},
    {t:'Zona de vigilância', x:`${mid} casos entre 70% e 90%. Prioridade: acompanhar pickup antes de mexer em preço.`}
  ].map(a=>`<div class="occ-action-card"><div class="occ-action-title">${a.t}</div><div class="occ-action-text">${a.x}</div></div>`).join('');
}

function occRender() {
  if (OCC_SNAPSHOTS.length === 0) return;
  const hotel = document.getElementById('occHotelSel').value;
  const snap  = occGetSnap();
  if (!snap) return;

  if (hotel === '__all__') {
    occRenderHeatmap(snap);
    occRenderCompare();
    occRenderIntelligence(snap, '__all__');
    document.getElementById('occKpis').style.display       = 'none';
    document.getElementById('occCharts').style.display     = 'none';
    document.getElementById('occHeatmapWrap').style.display = 'block';
    document.getElementById('occCompareWrap').style.display = OCC_SNAPSHOTS.length > 1 ? 'block' : 'none';
    occRenderAdvanced(snap, '__all__');
  } else {
    occRenderHotel(hotel, snap);
    occRenderIntelligence(snap, hotel);
    document.getElementById('occKpis').style.display       = 'flex';
    document.getElementById('occCharts').style.display     = 'block';
    document.getElementById('occHeatmapWrap').style.display = 'none';
    document.getElementById('occCompareWrap').style.display = OCC_SNAPSHOTS.length > 1 ? 'block' : 'none';
    if (OCC_SNAPSHOTS.length > 1) occRenderCompare(hotel);
    occRenderAdvanced(snap, hotel);
  }
  // Sync hotel selector in PIU and re-render if PIU has data
  piuPopulateHotelSel();
  if (PIU_SNAPSHOTS.length > 0) {
    const piuSel = document.getElementById('piuHotelSel');
    if (piuSel && hotel !== '__all__' && [...piuSel.options].some(o => o.value === hotel)) {
      piuSel.value = hotel;
    }
    piuRender();
  } else {
    document.getElementById('occPiuWrap').style.display = 'block';
  }
}

function occRenderHotel(hotel, snap) {
  const hdata = snap.data[hotel];
  if (!hdata) return;

  document.getElementById('occChartHotelName').textContent = hotel.replace('COLLECTION ','C. ');

  const nextYear = occNextYear();
  const y25 = occYearData(hdata, YR_PREV);
  const y26 = occYearData(hdata, YR_CUR);
  const y27 = occYearData(hdata, nextYear);

  // KPIs
  const avg = arr => { const v = arr.filter(x=>x!=null); return v.length ? v.reduce((a,b)=>a+b,0)/v.length : null; };
  const ytdMonths = y26.filter(x=>x!=null).length;
  const avg25 = avg(y25.slice(0,ytdMonths));
  const avg26 = avg(y26.slice(0,ytdMonths));
  const delta  = avg25 != null && avg26 != null ? avg26 - avg25 : null;
  const best26 = y26.reduce((best,v,i) => v!=null && (best==null||v>best.v) ? {v,m:i} : best, null);
  const worst26= y26.reduce((best,v,i) => v!=null && (best==null||v<best.v) ? {v,m:i} : best, null);

  document.getElementById('occKpis').innerHTML = [
    { lbl:`Média YTD ${YR_CUR}`, val: avg26!=null?avg26.toFixed(1)+'%':'—', sub:`${YR_PREV}: ${avg25!=null?avg25.toFixed(1)+'%':'—'}`, cls: delta==null?'':delta>=0?'k-green':'k-red' },
    { lbl:`Variação vs ${YR_PREV}`, val: delta!=null?(delta>=0?'+':'')+delta.toFixed(1)+' pp':'—', sub:`${ytdMonths} meses comparáveis`, cls: delta==null?'':delta>=0?'k-green':'k-red' },
    { lbl:`Melhor mês ${YR_CUR}`, val: best26?best26.v.toFixed(1)+'%':'—', sub: best26?OCC_MESES[best26.m]:'—', cls:'k-teal' },
    { lbl:`Pior mês ${YR_CUR}`,   val: worst26?worst26.v.toFixed(1)+'%':'—', sub: worst26?OCC_MESES[worst26.m]:'—', cls:'' },
  ].map(k=>`<div class="occ-kpi ${k.cls}">
    <div class="occ-kpi-lbl">${k.lbl}</div>
    <div class="occ-kpi-val">${k.val}</div>
    <div class="occ-kpi-sub">${k.sub}</div>
  </div>`).join('');

  // Line chart
  if (occChartLineInst) occChartLineInst.destroy();
  const ctxL = document.getElementById('occChartLine').getContext('2d');
  occChartLineInst = new Chart(ctxL, {
    type: 'line',
    data: {
      labels: OCC_MESES,
      datasets: [
        { label:YR_PREV, data:y25, borderColor:'#2a7d8c', backgroundColor:'rgba(42,125,140,.08)', borderWidth:2, pointRadius:4, pointBackgroundColor:'#2a7d8c', tension:.35, spanGaps:false },
        { label:YR_CUR, data:y26, borderColor:'#c9a84c', backgroundColor:'rgba(201,168,76,.08)', borderWidth:2.5, pointRadius:5, pointBackgroundColor:'#c9a84c', tension:.35, spanGaps:false },
        { label:nextYear, data:y27, borderColor:'#a78bfa', backgroundColor:'rgba(167,139,250,.08)', borderWidth:2, borderDash:[6,3], pointRadius:4, pointBackgroundColor:'#a78bfa', tension:.35, spanGaps:false },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend:{ position:'top', labels:{ color:'#94aabf', font:{size:11} } } },
      scales: {
        x: { ticks:{ color:'#64748b', font:{size:11} }, grid:{ color:'rgba(255,255,255,.04)' } },
        y: { min:0, max:100, ticks:{ callback:v=>v+'%', color:'#64748b', font:{size:11} }, grid:{ color:'rgba(255,255,255,.04)' } }
      }
    }
  });

  // Delta chart (ano atual vs ano anterior)
  const deltas = y26.map((v,i) => v!=null && y25[i]!=null ? +(v - y25[i]).toFixed(2) : null);
  if (occChartDeltaInst) occChartDeltaInst.destroy();
  const ctxD = document.getElementById('occChartDelta').getContext('2d');
  occChartDeltaInst = new Chart(ctxD, {
    type: 'bar',
    data: {
      labels: OCC_MESES,
      datasets: [{
        label:`Δ pp (${YR_CUR}−${YR_PREV})`,
        data: deltas,
        backgroundColor: deltas.map(v => v==null?'transparent':v>=0?'rgba(31,158,107,.6)':'rgba(192,57,43,.6)'),
        borderColor:      deltas.map(v => v==null?'transparent':v>=0?'#1f9e6b':'#c0392b'),
        borderWidth: 1, borderRadius: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend:{ display:false } },
      scales: {
        x: { ticks:{ color:'#64748b', font:{size:11} }, grid:{ color:'rgba(255,255,255,.04)' } },
        y: { ticks:{ callback:v=>(v>=0?'+':'')+v+' pp', color:'#64748b', font:{size:11} }, grid:{ color:'rgba(255,255,255,.04)' } }
      }
    }
  });
}

function occRenderHeatmap(snap) {
  // Filter by selected region
  const allHotels = Object.keys(snap.data).sort();
  const hotels = activeRegion && activeRegion !== 'todos'
    ? allHotels.filter(h => selectedHotels.has(h))
    : allHotels;

  // Update heatmap title
  const titleEl = document.querySelector('#occHeatmapWrap .occ-chart-title');
  if (titleEl) {
    titleEl.textContent = `Heatmap de Ocupação — ${occRegionLabel(activeRegion) || 'Todos os Hotéis'}`;
  }

  const ANOS = [Number(YR_PREV), Number(YR_CUR)].filter(Number.isFinite);
  const MES_LABELS = OCC_MESES;
  const table = document.getElementById('occHeatmap');

  let html = `<thead><tr><th>Hotel</th>`;
  MES_LABELS.forEach(m => html += `<th>${m}</th>`);
  html += `</tr></thead><tbody>`;

  hotels.forEach(hotel => {
    ANOS.forEach(ano => {
      const row = occYearData(snap.data[hotel], ano);
      if (!row || row.every(v=>v==null)) return;
      html += `<tr>`;
      html += `<td>${hotel.replace('COLLECTION ','C. ')} <span class="occ-year-tag occ-y${ano.toString().slice(-2)}">${ano}</span></td>`;
      row.forEach(v => {
        if (v == null) { html += `<td style="color:var(--text-3)">—</td>`; return; }
        const r = occHeatColor(v);
        html += `<td style="background:${r.bg};color:${r.text}">${v.toFixed(1)}</td>`;
      });
      html += `</tr>`;
    });
  });

  html += `</tbody>`;
  table.innerHTML = html;
}

function occHeatColor(v) {
  // 0→red, 50→amber, 80→green, 100→deep green
  if (v >= 80) return { bg:`rgba(31,158,107,${0.2+v/200})`, text:'#6ee7b7' };
  if (v >= 60) return { bg:`rgba(201,168,76,${0.15+v/300})`, text:'#fde68a' };
  if (v >= 40) return { bg:`rgba(245,158,11,${0.12+v/400})`, text:'#fbbf24' };
  return { bg:`rgba(192,57,43,${0.1+v/200})`, text:'#fca5a5' };
}

let OCC_EXPORT_SCOPE = 'todos';

function occExportPDFModal() {
  if (!OCC_SNAPSHOTS.length) { showToast('Sem snapshots para exportar', true); return; }

  // Preencher selector de regiões
  const regSel = document.getElementById('occExpRegiao');
  const regionNames = {norte:'🔵 Norte e Centro', lisboa:'🟢 Lisboa & Ilhas', alentejo:'🟡 Alentejo', algarve:'🔴 Algarve'};
  regSel.innerHTML = Object.keys(REGIOES).map(r => `<option value="${r}">${regionNames[r]||r}</option>`).join('');

  // Preencher selector de hotéis (todos os hotéis presentes em qualquer snapshot)
  const allHotels = [...new Set(OCC_SNAPSHOTS.flatMap(s => Object.keys(s.data)))].sort();
  const hotelSel = document.getElementById('occExpHotel');
  hotelSel.innerHTML = allHotels.map(h => `<option value="${h}">${h.replace('COLLECTION ','C. ')}</option>`).join('');

  occExportSetScope('todos');
  document.getElementById('occExportModal').style.display = 'flex';
}

function occExportSetScope(scope) {
  OCC_EXPORT_SCOPE = scope;
  const btns = {todos:'occExpScopeTodos', regiao:'occExpScopeRegiao', hotel:'occExpScopeHotel'};
  Object.entries(btns).forEach(([k,id]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (k === scope) { el.style.background='var(--gold)'; el.style.color='#fff'; el.style.borderColor='var(--gold)'; }
    else { el.style.background=''; el.style.color=''; el.style.borderColor=''; }
  });
  document.getElementById('occExpRegiaoSel').style.display = scope === 'regiao' ? 'block' : 'none';
  document.getElementById('occExpHotelSel').style.display = scope === 'hotel' ? 'block' : 'none';
}

// Devolve a lista de hotéis a incluir no PDF, conforme o âmbito escolhido
function occExportGetHotels(allHotels) {
  if (OCC_EXPORT_SCOPE === 'hotel') {
    const h = document.getElementById('occExpHotel')?.value;
    return h ? [h] : allHotels;
  }
  if (OCC_EXPORT_SCOPE === 'regiao') {
    const r = document.getElementById('occExpRegiao')?.value;
    const lista = REGIOES[r] || [];
    return allHotels.filter(h => lista.includes(h));
  }
  return allHotels;
}

function occExportPDF() {
  if (!OCC_SNAPSHOTS.length) { showToast('Sem snapshots para exportar', true); return; }

  const MES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const MESNOME = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const now = new Date().toLocaleString('pt-PT');

  // Recolher hotéis conforme o âmbito escolhido no modal
  const allHotelsFull = [...new Set(OCC_SNAPSHOTS.flatMap(s => Object.keys(s.data)))].sort();
  const allHotels = occExportGetHotels(allHotelsFull);
  if (!allHotels.length) { showToast('Sem hotéis para o âmbito seleccionado', true); return; }

  // Rótulo do âmbito para a capa
  const regionNames = {norte:'Norte e Centro', lisboa:'Lisboa & Ilhas', alentejo:'Alentejo', algarve:'Algarve'};
  let scopeLabel = 'Todos os Hotéis';
  if (OCC_EXPORT_SCOPE === 'regiao') {
    const r = document.getElementById('occExpRegiao')?.value;
    scopeLabel = 'Região: ' + (regionNames[r] || r);
  } else if (OCC_EXPORT_SCOPE === 'hotel') {
    scopeLabel = allHotels[0].replace('COLLECTION ','Collection ');
  }

  document.getElementById('occExportModal').style.display = 'none';

  // Paleta de cores para heatmap
  function heatColor(v) {
    if (v == null) return '#f3f4f6';
    if (v >= 90) return '#065f46';
    if (v >= 80) return '#059669';
    if (v >= 70) return '#34d399';
    if (v >= 60) return '#6ee7b7';
    if (v >= 50) return '#a7f3d0';
    if (v >= 40) return '#fde68a';
    if (v >= 30) return '#fbbf24';
    return '#f87171';
  }
  function heatText(v) {
    if (v == null) return '#9ca3af';
    return v >= 60 ? '#fff' : '#111';
  }

  // ── Página de capa ──
  const coverHtml = `
  <div class="page cover-page">
    <div class="cover-logo">VG</div>
    <h1>Relatório de Ocupação</h1>
    <h2>Vila Galé Hotéis</h2>
    <div style="background:rgba(96,165,250,.15);border:1px solid rgba(96,165,250,.3);border-radius:8px;padding:8px 20px;margin-bottom:20px;color:#93c5fd;font-size:13px;font-weight:700">${scopeLabel}</div>
    <div class="cover-meta">
      <div>📅 Gerado em ${now}</div>
      <div>📸 ${OCC_SNAPSHOTS.length} snapshots</div>
      <div>🏨 ${allHotels.length} hotéis</div>
    </div>
    <div class="cover-snaps">
      <h3>Snapshots incluídos</h3>
      ${OCC_SNAPSHOTS.map((s,i)=>`<div class="cover-snap-item">S${i+1} · ${s.label}</div>`).join('')}
    </div>
  </div>`;

  // ── Página por snapshot ──
  const snapPages = OCC_SNAPSHOTS.map((snap, si) => {
    const hotels = allHotels.filter(h => snap.data[h]);

    // Heatmap do ano atual
    const heatRows = hotels.map(h => {
      const y26 = occYearData(snap.data[h], YR_CUR);
      const avg = y26.filter(v=>v!=null).reduce((a,b,_,arr)=>a+b/arr.length,0) || null;
      const cells = y26.map((v,m) => `<td style="background:${heatColor(v)};color:${heatText(v)}">${v!=null?v.toFixed(1)+'%':'—'}</td>`).join('');
      return `<tr><td class="hotel-name">${h.replace('COLLECTION ','C. ')}</td>${cells}<td style="background:${heatColor(avg)};color:${heatText(avg)};font-weight:700">${avg?avg.toFixed(1)+'%':'—'}</td></tr>`;
    }).join('');

    // Tabela ano anterior vs ano atual por hotel
    const compRows = hotels.map(h => {
      const y25 = occYearData(snap.data[h], YR_PREV);
      const y26 = occYearData(snap.data[h], YR_CUR);
      const avg25 = y25.filter(v=>v!=null).reduce((a,b,_,arr)=>a+b/arr.length,0)||null;
      const avg26 = y26.filter(v=>v!=null).reduce((a,b,_,arr)=>a+b/arr.length,0)||null;
      const delta = avg25!=null&&avg26!=null ? avg26-avg25 : null;
      const dcls = delta==null?'':delta>0?'pos':'neg';
      return `<tr>
        <td class="hotel-name">${h.replace('COLLECTION ','C. ')}</td>
        <td>${avg25!=null?avg25.toFixed(1)+'%':'—'}</td>
        <td>${avg26!=null?avg26.toFixed(1)+'%':'—'}</td>
        <td class="${dcls}">${delta!=null?(delta>0?'+':'')+delta.toFixed(1)+' p.p.':'—'}</td>
      </tr>`;
    }).join('');

    // Gráfico: dados para Chart.js (injectados como JSON)
    const chartData26 = hotels.map(h => {
      const y26 = occYearData(snap.data[h], YR_CUR);
      return y26.filter(v=>v!=null).reduce((a,b,_,arr)=>a+b/arr.length,0)||0;
    });
    const chartData25 = hotels.map(h => {
      const y25 = occYearData(snap.data[h], YR_PREV);
      return y25.filter(v=>v!=null).reduce((a,b,_,arr)=>a+b/arr.length,0)||0;
    });
    const chartLabels = hotels.map(h=>h.replace('COLLECTION ','C. ').replace('COLLECTION','C.'));
    const chartId = `chart_s${si}`;
    const chartH = Math.max(hotels.length * 28 + 60, 200);

    return `
    <div class="page">
      <div class="page-header">
        <span>Snapshot ${si+1} · ${snap.label}</span>
        <span>Vila Galé Hotéis — Ocupação</span>
      </div>
      <h2 class="section-title">Snapshot ${si+1} — ${snap.label}</h2>

      <h3 class="sub-title">Ocupação ${YR_CUR} por mês (heatmap)</h3>
      <div class="table-scroll">
      <table class="heat-table">
        <thead><tr>
          <th>Hotel</th>
          ${MES.map(m=>`<th>${m}</th>`).join('')}
          <th>Média</th>
        </tr></thead>
        <tbody>${heatRows}</tbody>
      </table>
      </div>

      <div class="two-col" style="margin-top:18px">
        <div>
          <h3 class="sub-title">${YR_PREV} vs ${YR_CUR} — média YTD por hotel</h3>
          <table class="comp-table">
            <thead><tr><th>Hotel</th><th>${YR_PREV}</th><th>${YR_CUR}</th><th>Variação</th></tr></thead>
            <tbody>${compRows}</tbody>
          </table>
        </div>
        <div>
          <h3 class="sub-title">Ocupação média por hotel (${YR_CUR})</h3>
          <div style="position:relative;height:${chartH}px">
            <canvas id="${chartId}" role="img" aria-label="Ocupação por hotel snapshot ${si+1}"></canvas>
          </div>
          <script>
          (function(){
            const labels=${JSON.stringify(chartLabels)};
            const d26=${JSON.stringify(chartData26)};
            const d25=${JSON.stringify(chartData25)};
            new Chart(document.getElementById('${chartId}'),{
              type:'bar',
              data:{labels,datasets:[
                {label:${JSON.stringify(String(YR_CUR))},data:d26,backgroundColor:'rgba(16,110,86,.8)',borderRadius:3},
                {label:${JSON.stringify(String(YR_PREV))},data:d25,backgroundColor:'rgba(156,163,175,.5)',borderRadius:3}
              ]},
              options:{
                indexAxis:'y',
                responsive:true,maintainAspectRatio:false,
                plugins:{legend:{position:'top',labels:{font:{size:10}}}},
                scales:{
                  x:{min:0,max:100,ticks:{callback:v=>v+'%',font:{size:9}},grid:{color:'rgba(0,0,0,.05)'}},
                  y:{ticks:{font:{size:9}}}
                }
              }
            });
          })();
          <\/script>
        </div>
      </div>
    </div>`;
  }).join('');

  // ── Página de evolução (pickup acumulado entre snapshots) ──
  const pickupRows = allHotels.map(h => {
    const vals = OCC_SNAPSHOTS.map(s => {
      const y26 = occYearData(s.data[h], YR_CUR);
      const v = y26.filter(x=>x!=null);
      return v.length ? v.reduce((a,b)=>a+b,0)/v.length : null;
    });
    const first = vals.find(v=>v!=null);
    const last = [...vals].reverse().find(v=>v!=null);
    const delta = first!=null&&last!=null ? last-first : null;
    const snapCells = vals.map(v => v!=null ? `<td>${v.toFixed(1)}%</td>` : `<td class="na">—</td>`).join('');
    const dcls = delta==null?'':delta>0.05?'pos':delta<-0.05?'neg':'';
    return `<tr>
      <td class="hotel-name">${h.replace('COLLECTION ','C. ')}</td>
      ${snapCells}
      <td class="${dcls}" style="font-weight:700">${delta!=null?(delta>0?'+':'')+delta.toFixed(1)+' p.p.':'—'}</td>
    </tr>`;
  }).join('');

  const snapHeaders = OCC_SNAPSHOTS.map((_,i)=>`<th>S${i+1}</th>`).join('');
  const evolutionChartId = 'chart_evolution';
  const evoHotels = allHotels.slice(0,15); // top 15 para o gráfico
  const evoDatasets = OCC_SNAPSHOTS.map((s,i) => ({
    label: `S${i+1}`,
    data: evoHotels.map(h => {
      const y26 = occYearData(s.data[h], YR_CUR);
      const v = y26.filter(x=>x!=null);
      return v.length ? Math.round(v.reduce((a,b)=>a+b,0)/v.length*10)/10 : null;
    }),
  }));

  const evolutionPage = `
  <div class="page">
    <div class="page-header">
      <span>Evolução entre snapshots</span>
      <span>Vila Galé Hotéis — Ocupação</span>
    </div>
    <h2 class="section-title">Evolução da ocupação YTD ${YR_CUR} entre snapshots</h2>
    <h3 class="sub-title">Ocupação média YTD ${YR_CUR} por hotel e snapshot</h3>
    <div class="table-scroll">
    <table class="comp-table">
      <thead><tr>
        <th>Hotel</th>
        ${snapHeaders}
        <th>Acumulado</th>
      </tr></thead>
      <tbody>${pickupRows}</tbody>
    </table>
    </div>
    <h3 class="sub-title" style="margin-top:18px">Top 15 hotéis — evolução por snapshot</h3>
    <div style="position:relative;height:320px">
      <canvas id="${evolutionChartId}" role="img" aria-label="Evolução ocupação por snapshot"></canvas>
    </div>
    <script>
    (function(){
      const colors=['#0f6e56','#1d9e75','#5dcaa5','#9fe1cb','#e1f5ee','#374151','#6b7280','#9ca3af','#d1d5db','#f3f4f6','#7c3aed','#a78bfa','#c4b5fd','#dc2626','#f87171'];
      new Chart(document.getElementById('${evolutionChartId}'),{
        type:'line',
        data:{
          labels:${JSON.stringify(evoHotels.map(h=>h.replace('COLLECTION ','C. ')))},
          datasets:${JSON.stringify(evoDatasets)}.map((ds,i)=>({
            ...ds,
            borderColor:colors[i%colors.length],
            backgroundColor:colors[i%colors.length]+'22',
            pointRadius:4,
            tension:0.3,
          }))
        },
        options:{
          responsive:true,maintainAspectRatio:false,
          plugins:{legend:{position:'right',labels:{font:{size:9},boxWidth:10}}},
          scales:{
            y:{min:0,max:100,ticks:{callback:v=>v+'%',font:{size:9}}},
            x:{ticks:{font:{size:8},maxRotation:45}}
          }
        }
      });
    })();
    <\/script>
  </div>`;

  const fullHtml = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<title>Relatório Ocupação — Vila Galé · ${now}</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"><\/script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:11px;color:#111;background:#fff}
.page{width:297mm;min-height:210mm;padding:14mm 16mm;page-break-after:always;position:relative}
.cover-page{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:210mm;text-align:center;background:#0f2040;color:#fff}
.cover-logo{width:64px;height:64px;background:#60a5fa;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#0f2040;margin-bottom:24px}
.cover-page h1{font-size:32px;font-weight:800;color:#e8f0fe;margin-bottom:8px}
.cover-page h2{font-size:18px;font-weight:400;color:#94a3c4;margin-bottom:32px}
.cover-meta{display:flex;gap:32px;font-size:14px;color:#94a3c4;margin-bottom:32px}
.cover-snaps{background:rgba(255,255,255,.08);border-radius:10px;padding:16px 24px;max-width:500px;text-align:left}
.cover-snaps h3{color:#60a5fa;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px}
.cover-snap-item{color:#cbd5e1;font-size:12px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.08)}
.page-header{display:flex;justify-content:space-between;font-size:9px;color:#6b7280;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:14px}
.section-title{font-size:16px;font-weight:700;color:#0f2040;margin-bottom:12px}
.sub-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#374151;margin-bottom:8px}
.heat-table{border-collapse:collapse;width:100%;font-size:9px}
.heat-table th{background:#374151;color:#fff;padding:5px 4px;text-align:center;font-size:8px}
.heat-table th:first-child{text-align:left;min-width:80px}
.heat-table td{padding:4px;text-align:center;border:1px solid rgba(0,0,0,.05);font-size:8.5px}
.comp-table{border-collapse:collapse;width:100%;font-size:10px}
.comp-table th{background:#f1f5f9;padding:6px 8px;text-align:right;font-size:9px;text-transform:uppercase;letter-spacing:.5px;color:#475569}
.comp-table th:first-child{text-align:left}
.comp-table td{padding:5px 8px;text-align:right;border-top:1px solid #f1f5f9;color:#374151}
.comp-table td:first-child{text-align:left}
.hotel-name{font-weight:600;text-align:left!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:110px}
.pos{color:#065f46;font-weight:700}
.neg{color:#991b1b;font-weight:700}
.na{color:#9ca3af}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start}
.table-scroll{overflow:visible}
@media print{
  .page{page-break-after:always;width:100%;padding:10mm 12mm}
  @page{size:A4 landscape;margin:0}
}
@media screen{
  body{background:#e5e7eb;padding:20px}
  .page{background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.15);margin:0 auto 24px;border-radius:4px}
  .cover-page{border-radius:4px}
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
</head>
<body>
${coverHtml}
${snapPages}
${evolutionPage}
<div style="text-align:center;padding:20px;font-size:12px;color:#6b7280">
  <button onclick="window.print()" style="background:#0f2040;color:#fff;border:none;padding:12px 32px;border-radius:8px;font-size:14px;cursor:pointer;margin-right:12px">🖨 Imprimir / Guardar PDF</button>
  <button onclick="window.close()" style="background:#f1f5f9;color:#374151;border:1px solid #e2e8f0;padding:12px 24px;border-radius:8px;font-size:14px;cursor:pointer">Fechar</button>
</div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=1200,height=800');
  if (!win) { showToast('Popup bloqueado — permite popups para este ficheiro', true); return; }
  win.document.write(fullHtml);
  win.document.close();
}

function occSetView(uid, mode) {
  const drag = document.getElementById(uid+'_drag');
  const btnP = document.getElementById(uid+'_btnP');
  const btnA = document.getElementById(uid+'_btnA');
  if (!drag) return;
  if (mode === 'all') {
    drag.style.maxWidth = '100%';
    if (btnP) { btnP.style.background='var(--surface-1)'; btnP.style.color='var(--text-2)'; }
    if (btnA) { btnA.style.background='var(--gold)'; btnA.style.color='#fff'; }
  } else {
    // partial: calcular max-width para mostrar ceil(nSnaps/2) colunas
    const table = document.getElementById(uid+'_table');
    const nCols = table ? table.querySelectorAll('thead th').length - 2 : 5; // menos sticky mês e acumulado
    const partial = 90 + Math.ceil(nCols/2)*120 + 100;
    drag.style.maxWidth = partial + 'px';
    drag.scrollLeft = 0;
    occUpdateIndicator(uid, drag, 120);
    if (btnP) { btnP.style.background='var(--gold)'; btnP.style.color='#fff'; }
    if (btnA) { btnA.style.background='var(--surface-1)'; btnA.style.color='var(--text-2)'; }
  }
}

function occScrollSnap(uid, dir) {
  const el = document.getElementById(uid+'_drag');
  if (!el) return;
  const colW = 120; // largura fixa por coluna de snapshot
  el.scrollBy({ left: dir * colW, behavior: 'smooth' });
  setTimeout(() => occUpdateIndicator(uid, el, colW), 400);
}
function occSliderScroll(uid, val) {
  const el = document.getElementById(uid+'_drag');
  if (!el) return;
  const colW = 90;
  el.scrollLeft = val * colW;
  occUpdateIndicator(uid, el, colW);
}
function occUpdateIndicator(uid, el, colW) {
  const ind = document.getElementById(uid+'_indicator');
  const slider = document.getElementById(uid+'_slider');
  if (!ind) return;
  const cur = Math.round(el.scrollLeft / (colW || 90));
  const maxVal = slider ? parseInt(slider.max) : 0;
  const snap = Math.min(cur + 1, maxVal + 1);
  ind.textContent = 'S' + snap + ' em vista';
  if (slider) slider.value = cur;
}

function occRenderPickupByMonth(hotel, quartos) {
  if (OCC_SNAPSHOTS.length < 2) return '';
  const diasMes=[31,28,31,30,31,30,31,31,30,31,30,31];
  const yr=2026;
  const mesesNomes=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const mesesComDados=[];
  for(let m=0;m<12;m++){if(OCC_SNAPSHOTS.some(s=>s.data?.[hotel]?.[yr]?.[m]!=null))mesesComDados.push(m);}
  if(mesesComDados.length===0)return '';
  const ultimoMesReal=Math.max(...Object.keys(STORE||{}).map(Number).filter(m=>{
    const s=(STORE||{})[m];
    return s&&!s.__orc_forecast__&&(s.hotel_list||[]).some(h=>(s.hotels_ops?.[h]?.['Receita Total']?.[String(yr)]||0)>0);
  }),0);
  const mesesMostrar=mesesComDados.filter(m=>m>=ultimoMesReal);
  if(mesesMostrar.length===0)mesesMostrar.push(...mesesComDados);
  const nSnaps=OCC_SNAPSHOTS.length;
  const uid='pbm_'+Math.random().toString(36).slice(2,7);

  // Cabeçalhos snapshots
  const snapCols=OCC_SNAPSHOTS.map((s,i)=>`<th style="min-width:120px;max-width:120px;width:120px;white-space:nowrap">S${i+1}<br><span style="font-weight:400;font-size:9px;opacity:.8">${s.label||''}</span></th>`).join('');

  // SECÇÃO 1: tabela completa drag-scroll
  const mesRows1=mesesMostrar.map(m=>{
    const nome=mesesNomes[m],dias=diasMes[m],potencial=quartos?quartos*dias:null;
    const vals=OCC_SNAPSHOTS.map(s=>s.data?.[hotel]?.[yr]?.[m]??null);
    const first=vals.find(v=>v!=null),last=[...vals].reverse().find(v=>v!=null);
    const td=first!=null&&last!=null?last-first:null;
    const trn=td!=null&&potencial!=null?Math.round(td/100*potencial):null;
    const tc=td==null?'var(--text-3)':td>0?'var(--pos)':td<0?'var(--neg)':'var(--text-3)';
    const ts=td!=null?`<span style="color:${tc};font-weight:800">${td>0?'+':''}${td.toFixed(1)} p.p.</span>${trn!=null?`<br><span style="font-size:10px;font-weight:800;color:${tc}">${trn>0?'+':''}${trn.toLocaleString('pt-PT')} rn`+'</span>':''}`:'—';
    const cells=vals.map((v,i)=>{
      if(v==null)return`<td style="color:var(--text-3)">—</td>`;
      if(i===0)return`<td style="color:var(--text-2);font-size:10px">${v.toFixed(1)}%</td>`;
      const prev=vals[i-1];
      if(prev==null)return`<td style="color:var(--text-2);font-size:10px">${v.toFixed(1)}%</td>`;
      const d=v-prev;
      if(Math.abs(d)<0.05)return`<td style="color:var(--text-3);font-size:10px">${v.toFixed(1)}%<br><span style="font-size:9px">0,0 p.p.</span></td>`;
      const rn=potencial!=null?Math.round(d/100*potencial):null;
      const cor=d>0?'var(--pos)':'var(--neg)';
      const rnStr=rn!=null?`<br><span style="font-size:9px;font-weight:700">${rn>0?'+':''}${rn.toLocaleString('pt-PT')} rn`+'</span>':'';
      return`<td style="color:${cor};font-weight:700;font-size:10px">${v.toFixed(1)}%<br><span style="font-size:9px">${d>0?'+':''}${d.toFixed(1)} p.p.</span>${rnStr}</td>`;
    }).join('');
    return`<tr><td style="font-weight:700;white-space:nowrap;position:sticky;left:0;background:var(--surface-1);z-index:1;border-right:1px solid var(--border)">${nome}</td>${cells}<td style="border-left:2px solid var(--border);text-align:center;position:sticky;right:0;background:var(--surface-2);z-index:1">${ts}</td></tr>`;
  }).join('');

  // SECÇÃO 2: sparklines resumo
  const mesRows2=mesesMostrar.map(m=>{
    const nome=mesesNomes[m],dias=diasMes[m],potencial=quartos?quartos*dias:null;
    const vals=OCC_SNAPSHOTS.map(s=>s.data?.[hotel]?.[yr]?.[m]??null);
    const deltas=vals.map((v,i)=>i===0||vals[i-1]==null?0:v-vals[i-1]);
    const first=vals.find(v=>v!=null),last=[...vals].reverse().find(v=>v!=null);
    const td=first!=null&&last!=null?last-first:null;
    const trn=td!=null&&potencial!=null?Math.round(td/100*potencial):null;
    const tc=td==null?'var(--text-3)':td>0?'var(--pos)':td<0?'var(--neg)':'var(--text-3)';
    const acumTag=td==null?'—':`<span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:${td>0?'rgba(52,211,153,.15)':td<0?'rgba(248,113,113,.15)':'var(--surface-2)'};color:${tc}">${td>0?'+':''}${td.toFixed(1)} p.p.</span>`;
    const maxAbs=Math.max(...deltas.map(Math.abs),0.1);
    const bars=deltas.map((d,i)=>{
      if(i===0)return`<div style="width:5px;height:3px;background:var(--border);border-radius:1px;align-self:flex-end"></div>`;
      const h=Math.round(Math.abs(d)/maxAbs*20)+3;
      const col=d>0.04?'var(--pos)':d<-0.04?'var(--neg)':'var(--text-3)';
      const rn=potencial!=null?Math.round(d/100*potencial):null;
      const tip=`S${i}→S${i+1}: ${d>=0?'+':''}${d.toFixed(1)} p.p.${rn!=null?` | ${rn>=0?'+':''}${rn} rn`:''}`;
      return`<div title="${tip}" style="width:5px;height:${h}px;background:${col};border-radius:1px;align-self:flex-end;cursor:default;flex-shrink:0"></div>`;
    }).join('');
    const rnStr=trn!=null?`<span style="color:${tc};font-weight:700">${trn>0?'+':''}${trn.toLocaleString('pt-PT')} rn`+'</span>':'—';
    return`<tr><td style="font-weight:700">${nome}</td><td style="color:var(--text-2)">${first!=null?first.toFixed(1)+'%':'—'}</td><td style="padding:6px 10px"><div style="display:flex;align-items:flex-end;gap:2px;height:28px">${bars}</div></td><td style="color:var(--text-2)">${last!=null?last.toFixed(1)+'%':'—'}</td><td>${acumTag}</td><td style="color:${tc};font-weight:700">${rnStr}</td></tr>`;
  }).join('');

  return `
  <div class="occ-pickup-panel" style="margin-top:14px">
    <div class="occ-pickup-head">
      <span class="occ-pickup-title">Linha do tempo — ${occShortName(hotel)}</span>
      <span style="display:flex;align-items:center;gap:8px">
        <span style="font-size:10px;color:var(--text-3);font-style:italic">← arrasta para navegar →</span>
        <span>${nSnaps} snapshots${quartos?' · '+quartos+' quartos':''}</span>
      </span>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;border-bottom:1px solid var(--border-2);background:var(--surface-2);gap:8px;flex-wrap:wrap">
      <div style="display:flex;gap:6px;align-items:center">
        <button id="${uid}_prev" onclick="occScrollSnap('${uid}',-1)" style="background:var(--surface-1);border:1px solid var(--border);border-radius:6px;padding:3px 10px;font-size:12px;cursor:pointer;color:var(--text-2)">← Anterior</button>
        <div id="${uid}_indicator" style="font-size:11px;color:var(--text-3);font-family:var(--mono);min-width:80px;text-align:center">S1 em vista</div>
        <button id="${uid}_next" onclick="occScrollSnap('${uid}',1)" style="background:var(--surface-1);border:1px solid var(--border);border-radius:6px;padding:3px 10px;font-size:12px;cursor:pointer;color:var(--text-2)">Seguinte →</button>
      </div>
      <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-3)">
        Ver:
        <button onclick="occSetView('${uid}','partial')" id="${uid}_btnP" style="background:var(--gold);color:#fff;border:1px solid var(--border);border-radius:6px;padding:2px 8px;font-size:11px;cursor:pointer">5 de cada vez</button>
        <button onclick="occSetView('${uid}','all')" id="${uid}_btnA" style="background:var(--surface-1);border:1px solid var(--border);border-radius:6px;padding:2px 8px;font-size:11px;cursor:pointer;color:var(--text-2)">Todos (${nSnaps})</button>
      </div>
    </div>
    <div style="position:relative">
    <div id="${uid}_drag" style="overflow-x:scroll;cursor:grab;user-select:none;-webkit-overflow-scrolling:touch;scrollbar-width:thin;scrollbar-color:var(--gold) var(--surface-2);max-width:${90 + Math.ceil(nSnaps/2)*120 + 100}px">
      <style>#${uid}_drag::-webkit-scrollbar{height:5px}#${uid}_drag::-webkit-scrollbar-track{background:var(--surface-2)}#${uid}_drag::-webkit-scrollbar-thumb{background:var(--gold);border-radius:3px}</style>
      <table class="occ-pickup-table" style="font-size:11px;min-width:max-content;width:100%" id="${uid}_table">
        <thead><tr>
          <th style="min-width:90px;position:sticky;left:0;background:var(--surface-2);z-index:2;border-right:1px solid var(--border)">Mês</th>
          ${snapCols}
          <th style="border-left:2px solid var(--border);text-align:center;min-width:100px;position:sticky;right:0;background:var(--surface-2);z-index:2">Acumulado<br>S1→S${nSnaps}</th>
        </tr></thead>
        <tbody>${mesRows1}</tbody>
      </table>
    </div>
    </div>
    <div style="padding:5px 10px;border-top:1px solid var(--border-2)">
      <input type="range" id="${uid}_slider" min="0" max="${nSnaps-1}" value="0" step="1"
        style="width:100%;height:4px;accent-color:var(--gold);cursor:pointer"
        oninput="occSliderScroll('${uid}',this.value)">
    </div>
  </div>

  <div class="occ-pickup-panel" style="margin-top:10px">
    <div class="occ-pickup-head">
      <span class="occ-pickup-title">Resumo por mês — ${occShortName(hotel)}</span>
      <span>passa o rato nas barras para ver detalhe${quartos?' · '+quartos+' quartos':''}</span>
    </div>
    <table class="occ-pickup-table" style="font-size:11px">
      <thead><tr>
        <th style="min-width:90px">Mês</th>
        <th>Início (S1)</th>
        <th style="min-width:${Math.max(nSnaps*7+20,80)}px">Evolução</th>
        <th>Actual (S${nSnaps})</th>
        <th style="text-align:center">Acumulado</th>
        <th>Room nights</th>
      </tr></thead>
      <tbody>${mesRows2}</tbody>
    </table>
    ${quartos==null?'<div class="note" style="padding:8px 12px;font-size:11px;color:var(--text-3)">ⓘ Carrega a Ficha Tecnica no separador Hoteis para ver as room nights.</div>':''}
  </div>

  <script>(function(){
    const el=document.getElementById('${uid}_drag');
    if(!el)return;
    let isDown=false,startX=0,scrollLeft=0;
    const getColW=()=>120;
    el.addEventListener('mousedown',e=>{isDown=true;startX=e.pageX-el.offsetLeft;scrollLeft=el.scrollLeft;el.style.cursor='grabbing';});
    el.addEventListener('mouseleave',()=>{isDown=false;el.style.cursor='grab';});
    el.addEventListener('mouseup',()=>{isDown=false;el.style.cursor='grab';occUpdateIndicator('${uid}',el,getColW());});
    el.addEventListener('mousemove',e=>{if(!isDown)return;e.preventDefault();const x=e.pageX-el.offsetLeft;el.scrollLeft=scrollLeft-(x-startX);occUpdateIndicator('${uid}',el,getColW());});
    el.addEventListener('touchstart',e=>{startX=e.touches[0].pageX-el.offsetLeft;scrollLeft=el.scrollLeft;},{passive:true});
    el.addEventListener('touchmove',e=>{const x=e.touches[0].pageX-el.offsetLeft;el.scrollLeft=scrollLeft-(x-startX);occUpdateIndicator('${uid}',el,getColW());},{passive:true});
    el.addEventListener('scroll',()=>occUpdateIndicator('${uid}',el,getColW()),{passive:true});
  })();<\/script>`;
}


// ══════════════════════════════════════════════════════════
//  PICKUP INTERANUAL — booking curve 2025 vs 2026
// ══════════════════════════════════════════════════════════
// Lógica: eixo X = meses dos snapshots (jul, ago, set, out, nov, dez...)
// Para cada ponto X, mostra a ocupação prevista do mês-alvo nesse momento.
// A linha 2025 usa os PDFs de referência carregados aqui.
// A linha 2026 usa os OCC_SNAPSHOTS já carregados na página principal.
// O alinhamento é feito pelo número do mês do snapshot (ex: snapshot de julho
// alinha com o ponto "Jul" no eixo X).
// ══════════════════════════════════════════════════════════

let PIU_SNAPSHOTS = [];  // snapshots do ano de referência (YR_PREV)
let piuChartInst = null;

// Extrai mês (0-11) e ano do label de um snapshot.
// Suporta "07/2025", "07/08/2025, 18:24" (formato pt-PT), "8/26/2025 7:08:21 PM"
// Extrai mês (0-11) e ano do label de um snapshot.
// Labels possíveis:
//   PIU (referência 2025): "Jul 2025" (guardado pelo piuLoadFile)
//   OCC (2026): "01/06/2026, 19:57" (pt-PT: dd/mm/yyyy, hh:mm)
function piuSnapMonth(snap) {
  // Campo monthIndex guardado explicitamente no momento do parse (PIU_SNAPSHOTS)
  if (snap.monthIndex != null) return { m: snap.monthIndex, y: snap.year ?? Number(YR_PREV) };
  const lbl = snap.label || '';
  // Formato pt-PT do occLoadFile: "dd/mm/yyyy, hh:mm" ou "dd/mm/yyyy hh:mm"
  // CRÍTICO: grupo 1 = dia, grupo 2 = mês, grupo 3 = ano
  let mt = lbl.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mt) {
    const day = parseInt(mt[1]), month = parseInt(mt[2]), year = parseInt(mt[3]);
    // Validação: dia 1-31, mês 1-12
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return { m: month - 1, y: year };
    }
  }
  // Formato "Mmm YYYY" guardado pelo piuLoadFile como fallback antigo: "07/2025"
  mt = lbl.match(/^(\d{2})\/(\d{4})$/);
  if (mt) return { m: parseInt(mt[1]) - 1, y: parseInt(mt[2]) };
  return null;
}

function piuLoadFile(file) {
  if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
    showToast('Ficheiro inválido — carregue um PDF', true); return;
  }
  const dcBefore = typeof window.vgDataCenterCapture === 'function' ? window.vgDataCenterCapture('occupancy_ref') : null;
  showToast(`A processar snapshot ${YR_PREV}...`);
  occReadPdf(file).then(text => {
    const data = occParsePdf(text);
    if (!data || !Object.keys(data).length) {
      showToast('Não foi possível extrair dados deste PDF.', true); return;
    }
    // Extrai data do rodapé do PDF (formato: "M/D/YYYY H:MM:SS AM/PM")
    let label = null, ts = null, monthIndex = null, year = null;
    const dm = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}:\d{2}:\d{2}\s*[AP]M)/i);
    if (dm) {
      const parsed = new Date(`${dm[1]}/${dm[2]}/${dm[3]} ${dm[4]}`);
      if (!isNaN(parsed)) {
        ts = parsed.getTime();
        // Label: "Mmm YYYY" — ex: "Jul 2025"
        const mAbr = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        monthIndex = parsed.getMonth();
        year = parsed.getFullYear();
        label = `${mAbr[monthIndex]} ${year}`;
      }
    }
    if (!label) {
      // Fallback: nome do ficheiro
      label = file.name.replace(/\.pdf$/i,'').replace(/[_\-]/g,' ').trim();
      ts = Date.now();
    }
    // Deduplica por label
    if (PIU_SNAPSHOTS.find(s => s.label === label)) {
      showToast('Snapshot já carregado: ' + label); return;
    }
    PIU_SNAPSHOTS.push({ label, data, ts, monthIndex, year });
    PIU_SNAPSHOTS.sort((a,b) => (a.ts ?? 0) - (b.ts ?? 0));
    piuSaveToDB();
    piuRefreshChips();
    piuPopulateHotelSel();
    piuRender();
    showToast(`✓ Snapshot referência adicionado: ${label}`);
    if (typeof window.vgDataCenterRecord === 'function') window.vgDataCenterRecord({
      source:'occupancy_ref',fileName:file.name,fileSize:file.size,scope:label,before:dcBefore,metrics:{hotels:Object.keys(data).length,snapshots:PIU_SNAPSHOTS.length},summary:`Referência de ocupação ${label}`
    });
  }).catch(e => {
    showToast('Erro ao processar PDF: ' + e.message, true);
    if (typeof window.vgDataCenterRecordFailure === 'function') window.vgDataCenterRecordFailure({source:'occupancy_ref',fileName:file.name,fileSize:file.size,summary:e.message,warnings:[e.message]});
  });
}

function piuStorageKey() { return `piu_snapshots_${YR_PREV}`; }
function piuSaveToDB() {
  try { localStorage.setItem(piuStorageKey(), JSON.stringify(PIU_SNAPSHOTS)); } catch(e) {}
}

function piuLoadFromDB() {
  try {
    let raw = localStorage.getItem(piuStorageKey());
    // Migração transparente das sessões antigas, quando 2025 era o ano de referência fixo.
    if (!raw && String(YR_PREV) === '2025') raw = localStorage.getItem('piu_snapshots');
    if (raw) {
      PIU_SNAPSHOTS = JSON.parse(raw);
      piuRefreshChips();
      piuPopulateHotelSel();
      if (PIU_SNAPSHOTS.length) piuRender();
    }
  } catch(e) {
    console.warn('PIU: falhou ao restaurar do localStorage:', e.message);
  }
}

function piuClearAll() {
  PIU_SNAPSHOTS = [];
  try { localStorage.removeItem(piuStorageKey()); if(String(YR_PREV)==='2025') localStorage.removeItem('piu_snapshots'); } catch(e) {}
  piuRefreshChips();
  piuPopulateHotelSel();
  piuRender();
}

function piuDeleteSnap(idx) {
  PIU_SNAPSHOTS.splice(idx, 1);
  piuSaveToDB();
  piuRefreshChips();
  piuPopulateHotelSel();
  piuRender();
}

function piuRefreshChips() {
  const el = document.getElementById('piuChips');
  if (!el) return;
  el.innerHTML = PIU_SNAPSHOTS.map((s,i) =>
    `<span class="piu-snap-chip"><span class="snap-dot"></span>${s.label}<span class="snap-del" onclick="piuDeleteSnap(${i})" title="Remover">✕</span></span>`
  ).join('') || '<span style="font-size:11px;color:var(--text-3)">Sem snapshots de referência carregados</span>';
}

function piuPopulateHotelSel() {
  const sel = document.getElementById('piuHotelSel');
  if (!sel) return;
  const hotels2025 = new Set(PIU_SNAPSHOTS.flatMap(s => Object.keys(s.data)));
  const hotels2026 = new Set(OCC_SNAPSHOTS.flatMap(s => Object.keys(s.data)));
  const all = [...new Set([...hotels2025, ...hotels2026])].sort();
  const prev = sel.value;
  sel.innerHTML = all.map(h => `<option value="${h}">${h.replace('COLLECTION ','C. ')}</option>`).join('');
  if (all.includes(prev)) sel.value = prev;
}

function piuRender() {
  const wrap = document.getElementById('occPiuWrap');
  if (!wrap) return;
  wrap.style.display = 'block';

  const emptyEl   = document.getElementById('piuEmpty');
  const chartWrap = document.getElementById('piuChartWrap');
  const tableWrap = document.getElementById('piuTableWrap');

  if (!PIU_SNAPSHOTS.length) {
    emptyEl.style.display   = 'block';
    chartWrap.style.display = 'none';
    tableWrap.style.display = 'none';
    return;
  }
  emptyEl.style.display   = 'none';
  chartWrap.style.display = 'block';
  tableWrap.style.display = 'block';

  const hotel  = document.getElementById('piuHotelSel')?.value;
  const mes    = parseInt(document.getElementById('piuMesSel')?.value ?? '7');
  const MNOMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const MABR   = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const mNome  = MNOMES[mes];

  // ── Eixo X: apenas os meses dos snapshots de referência 2025 ───────────
  // Eixo X = meses dos PDFs de referência (Jul 25, Ago 25, Set 25...).
  // Linha 2025: ocupação prevista para o mês-alvo em 2025 nesse snapshot.
  // Linha 2026: ocupação prevista para o mês-alvo em 2026 no snapshot de
  //   2026 com o mesmo mês (mesma distância). Se não existir esse mês em
  //   2026, usa o snapshot de 2026 mais recente (linha horizontal = estado actual).

  // Mapeia snapshots de referência por mês (0-11)
  const piuByMonth = {};
  PIU_SNAPSHOTS.forEach(s => {
    const info = piuSnapMonth(s);
    if (info != null) piuByMonth[info.m] = s;
  });

  // Snapshot de 2026 mais recente (apenas para debug, não usado como fallback)
  const latestOcc26 = OCC_SNAPSHOTS.length ? OCC_SNAPSHOTS[OCC_SNAPSHOTS.length - 1] : null;

  // Mapeia snapshots de 2026 por mês — guarda o mais recente de cada mês
  const occ26ByMonth = {};
  OCC_SNAPSHOTS.forEach(s => {
    const info = piuSnapMonth(s);
    if (info != null) {
      if (!occ26ByMonth[info.m] || (s.ts ?? 0) >= (occ26ByMonth[info.m].ts ?? 0)) {
        occ26ByMonth[info.m] = s;
      }
    }
  });

  // Lista ordenada de todos os snapshots de 2026 por timestamp (para fallback progressivo)
  const occ26Sorted = OCC_SNAPSHOTS
    .map(s => ({ s, info: piuSnapMonth(s) }))
    .filter(x => x.info != null)
    .sort((a, b) => (a.s.ts ?? 0) - (b.s.ts ?? 0));

  // Eixo X: meses dos snapshots de referência, ordenados
  // Filtra apenas os meses <= mês-alvo — snapshots posteriores não têm informação útil
  const refMonths = [...new Set(PIU_SNAPSHOTS.map(s => {
    const i = piuSnapMonth(s); return i != null ? i.m : null;
  }).filter(m => m !== null && m <= mes))].sort((a,b) => a - b);

  const labelsX = refMonths.map(m => `${MABR[m]}`);

  // ── Dataset 2025 (referência) ────────────────────────────────────────────
  const data2025 = refMonths.map(m => {
    const snap = piuByMonth[m];
    if (!snap) return null;
    return occYearData(snap.data?.[hotel], YR_PREV)?.[mes] ?? null;
  });

  // ── Dataset 2026 (actual) ────────────────────────────────────────────────
  // Para cada ponto X (mês M):
  //   1. Tenta snapshot de 2026 do mesmo mês M (correspondência exacta)
  //   2. Fallback: snapshot de 2026 mais recente ATÉ ao mês M (cobre snapshots diários)
  const snaps26Used = refMonths.map(m => {
    if (occ26ByMonth[m]) return occ26ByMonth[m];
    const candidates = occ26Sorted.filter(x => x.info.m <= m);
    return candidates.length ? candidates[candidates.length - 1].s : null;
  });
  const data2026 = refMonths.map((m, i) => {
    const snap26 = snaps26Used[i];
    if (!snap26) return null;
    return occYearData(snap26.data?.[hotel], YR_CUR)?.[mes] ?? null;
  });

  // ── Nota de cobertura 2026 ────────────────────────────────────────────────
  const covered26 = refMonths.filter((m, i) => snaps26Used[i] != null);
  const missing26  = refMonths.filter((m, i) => snaps26Used[i] == null);
  const noteEl = document.getElementById('piuCoverageNote');
  if (noteEl) {
    if (missing26.length > 0 && covered26.length > 0) {
      noteEl.style.display = 'block';
      noteEl.innerHTML = `ⓘ Cobertura ${YR_CUR}: <strong style="color:#2a7d8c">${covered26.map(m=>MABR[m]).join(', ')}</strong> · Sem dados ${YR_CUR} para: <span style="color:var(--text-3)">${missing26.map(m=>MABR[m]).join(', ')}</span>`;
    } else if (missing26.length === refMonths.length) {
      noteEl.style.display = 'block';
      noteEl.innerHTML = `ⓘ Ainda não há snapshots de ${YR_CUR} carregados. Carregue os PDFs mensais de ${YR_CUR} na página de Ocupação para ver a comparação.`;
    } else {
      noteEl.style.display = 'none';
    }
  }
  if (piuChartInst) { piuChartInst.destroy(); piuChartInst = null; }
  const canvas = document.getElementById('piuChart');
  if (!canvas) return;

  // Destrói canvas antigo e cria novo para evitar ghost data
  const parent = canvas.parentNode;
  const newCanvas = document.createElement('canvas');
  newCanvas.id = 'piuChart';
  parent.replaceChild(newCanvas, canvas);

  const ctx = newCanvas.getContext('2d');
  piuChartInst = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labelsX,
      datasets: [
        {
          label: `${YR_PREV} → ${mNome} (referência)`,
          data: data2025,
          borderColor: '#2a7d8c',
          backgroundColor: 'rgba(42,125,140,.08)',
          borderWidth: 2.5,
          pointRadius: 5,
          pointBackgroundColor: '#2a7d8c',
          tension: 0.3,
          spanGaps: false
        },
        {
          label: `${YR_CUR} → ${mNome} (actual)`,
          data: data2026,
          borderColor: '#c9a84c',
          backgroundColor: 'rgba(201,168,76,.08)',
          borderWidth: 2.5,
          borderDash: [6,3],
          pointRadius: 6,
          pointBackgroundColor: '#c9a84c',
          tension: 0.3,
          spanGaps: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { color: '#94aabf', font: { size: 11 } } },
        tooltip: {
          callbacks: {
            title: items => items[0]?.label ?? '',
            label: item => {
              const v = item.parsed.y;
              return v != null ? `${item.dataset.label}: ${v.toFixed(1)}%` : `${item.dataset.label}: sem dados`;
            },
            afterBody: items => {
              // Mostra diferença 2026 vs 2025 no tooltip
              const idx = items[0]?.dataIndex;
              if (idx == null) return [];
              const v25 = data2025[idx], v26 = data2026[idx];
              if (v25 == null || v26 == null) return [];
              const d = v26 - v25;
              return [`Δ vs ${YR_PREV}: ${d >= 0 ? '+' : ''}${d.toFixed(1)} pp`];
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#64748b', font: { size: 11 } },
          grid: { color: 'rgba(255,255,255,.04)' }
        },
        y: {
          min: 0, max: 100,
          ticks: { callback: v => v + '%', color: '#64748b', font: { size: 11 } },
          grid: { color: 'rgba(255,255,255,.04)' }
        }
      }
    }
  });

  // ── Tabela comparativa ───────────────────────────────────────────────────
  let thtml = `<thead><tr>
    <th>Mês do snapshot</th>
    <th style="text-align:right">${YR_PREV} → ${mNome}</th>
    <th style="text-align:right">${YR_CUR} → ${mNome}</th>
    <th style="text-align:right">Diferença (pp)</th>
    <th>Leitura</th>
  </tr></thead><tbody>`;

  refMonths.forEach((m, i) => {
    const v25 = data2025[i];
    const v26 = data2026[i];
    if (v25 == null && v26 == null) return;
    const snap26 = snaps26Used[i];
    const snap26label = snap26 ? (snap26.label || '—') : '—';
    const diff = v25 != null && v26 != null ? v26 - v25 : null;
    const cor = diff == null ? 'var(--text-3)' : diff >= 1 ? 'var(--pos)' : diff <= -1 ? 'var(--neg)' : 'var(--text-3)';
    const leitura = diff == null
      ? (v25 != null ? '— sem dado 2026' : '— sem dado 2025')
      : diff >= 10 ? '🟢 Muito acima' : diff >= 3 ? '🟢 Acima do ritmo' : diff >= -3 ? '⚪ Em linha' : diff >= -10 ? '🔴 Abaixo do ritmo' : '🔴 Muito abaixo';
    thtml += `<tr>
      <td style="color:var(--text-1);font-family:var(--font);font-weight:700">${labelsX[i]}</td>
      <td style="text-align:right">${v25 != null ? v25.toFixed(1)+'%' : '—'}</td>
      <td style="text-align:right;color:var(--gold)" title="Snapshot 2026: ${snap26label}">${v26 != null ? v26.toFixed(1)+'%' : '—'}</td>
      <td style="text-align:right;color:${cor};font-weight:800">${diff != null ? (diff>=0?'+':'')+diff.toFixed(1)+' pp' : '—'}</td>
      <td style="color:var(--text-2)">${leitura}</td>
    </tr>`;
  });
  thtml += '</tbody>';
  document.getElementById('piuTable').innerHTML = thtml;
}

// ══════════════════════════════════════════════════════════
//  PRESENÇA ONLINE — quem está a usar o dashboard agora
// ══════════════════════════════════════════════════════════
let _onlinePingInterval = null;
const ONLINE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const ONLINE_PING_MS = 2 * 60 * 1000; // ping a cada 2 minutos

async function onlineSendPing() {
  try {
    const getCurrentFn = (typeof current === 'function') ? current : window.vgAuthCurrent;
    const u = getCurrentFn ? getCurrentFn() : null;
    if (!u) return;
    // Lê o estado actual de presença
    let presence = {};
    try {
      const res = await sharedGet('vg_presence', 'online');
      presence = (res && res.data) ? res.data : {};
    } catch(e) {}
    // Limpa entradas expiradas e actualiza a do utilizador actual
    const now = Date.now();
    Object.keys(presence).forEach(k => {
      if (!presence[k].ts || (now - presence[k].ts) >= ONLINE_TTL_MS) delete presence[k];
    });
    presence[u.user] = { user: u.user, name: u.name, role: u.role, hotel: u.hotel || '', ts: now };
    await sharedPost('vg_presence', 'online', presence);
    onlineUpdateUI(presence);
  } catch(e) {}
}

function onlineUpdateUI(presence) {
  try {
    const wrap = document.getElementById('onlineUsersWrap');
    if (!wrap) return;
    const now = Date.now();
    const users = Object.values(presence || {}).filter(u => u.ts && (now - u.ts) < ONLINE_TTL_MS);
    wrap.style.display = 'flex';
    document.getElementById('onlineCount').textContent = users.length;
    const list = document.getElementById('onlineList');
    if (list) {
      list.innerHTML = users.length ? users.map(u => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--surface-2);border-radius:8px">
          <span style="width:8px;height:8px;border-radius:50%;background:#4ade80;flex-shrink:0"></span>
          <div>
            <div style="font-size:12px;font-weight:700;color:var(--text-1)">${u.name}</div>
            <div style="font-size:10px;color:var(--text-3)">${u.hotel && u.hotel !== '*' ? u.hotel : 'Todas as unidades'} · há ${Math.round((now-u.ts)/60000)} min</div>
          </div>
        </div>`).join('')
      : '<div style="font-size:12px;color:var(--text-3)">Nenhum utilizador activo</div>';
    }
  } catch(e) {}
}

async function onlineShowDetail() {
  document.getElementById('onlineModal').style.display = 'flex';
  try {
    const res = await sharedGet('vg_presence', 'online');
    onlineUpdateUI((res && res.data) ? res.data : {});
  } catch(e) {}
}

function onlineStartPing() {
  if (_onlinePingInterval) clearInterval(_onlinePingInterval);
  // Mostra o indicador imediatamente com "..." enquanto o ping não termina
  const wrap = document.getElementById('onlineUsersWrap');
  if (wrap) { wrap.style.display = 'flex'; }
  const count = document.getElementById('onlineCount');
  if (count) count.textContent = '…';
  onlineSendPing();
  _onlinePingInterval = setInterval(onlineSendPing, ONLINE_PING_MS);
}

// ══════════════════════════════════════════════════════════
//  RELATÓRIO MENSAL DE HOTEL — PDF completo por hotel
// ══════════════════════════════════════════════════════════

function relatorioShowModal() {
  if (!RAW) { showToast('Carrega primeiro os dados Excel.', true); return; }
  // Popula hotel selector
  const hSel = document.getElementById('relHotelSel');
  const hotels = RAW.hotel_list ? [...RAW.hotel_list].sort() : [];
  hSel.innerHTML = hotels.map(h => `<option value="${h}">${h}</option>`).join('');

  // Popula meses disponíveis como checkboxes
  const meses = Object.keys(STORE).map(Number).sort((a,b) => a-b);
  const chipsEl = document.getElementById('relMesesChips');
  chipsEl.innerHTML = meses.map(m => `
    <label style="display:inline-flex;align-items:center;gap:5px;background:var(--surface-2);border:1px solid var(--border-2);border-radius:8px;padding:6px 10px;font-size:11px;font-weight:700;color:var(--text-1);cursor:pointer">
      <input type="checkbox" value="${m}" checked style="accent-color:var(--gold)">
      ${MES_NOME[m] || m}
    </label>`).join('');

  document.getElementById('relatorioModal').style.display = 'flex';
}

function relatorioCloseModal() {
  document.getElementById('relatorioModal').style.display = 'none';
}

async function relatorioGerar() {
  const hotel = document.getElementById('relHotelSel')?.value;
  if (!hotel) { showToast('Seleciona um hotel.', true); return; }

  const mesesSel = [...document.querySelectorAll('#relMesesChips input[type=checkbox]:checked')]
    .map(cb => Number(cb.value)).sort((a,b) => a-b);
  if (!mesesSel.length) { showToast('Seleciona pelo menos um mês.', true); return; }

  try { await hsEnsureHotelLoaded(hotel); } catch(e) { console.warn('Ficha partilhada no relatório:', e); }

  const seccoesAtivas = {
    kpis:      document.getElementById('relChk-kpis')?.checked,
    usali:     document.getElementById('relChk-usali')?.checked,
    ocupacao:  document.getElementById('relChk-ocupacao')?.checked,
    receitas:  document.getElementById('relChk-receitas')?.checked,
    custos:    document.getElementById('relChk-custos')?.checked,
    reputacao: document.getElementById('relChk-reputacao')?.checked,
  };

  relatorioCloseModal();
  showToast(`A gerar relatório de ${hotel} — aguarda...`);

  // Gera HTML do relatório
  const MESES_NOMES = {1:'Janeiro',2:'Fevereiro',3:'Março',4:'Abril',5:'Maio',6:'Junho',7:'Julho',8:'Agosto',9:'Setembro',10:'Outubro',11:'Novembro',12:'Dezembro'};
  const agora = new Date().toLocaleDateString('pt-PT', {day:'2-digit',month:'long',year:'numeric'});
  const diretor = hsGetDirector(hotel) || HS_DIRECTORS[hotel] || '—';

  const REL_CSS = `
    @page { size:A4; margin:14mm 12mm; }
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color:#1a202c; background:#fff; font-size:11px; line-height:1.4; }
    .page { page-break-after:always; break-after:page; padding:0; }
    .page:last-child { page-break-after:auto; break-after:auto; }

    /* Cabeçalho de cada página */
    .page-header { display:flex; justify-content:space-between; align-items:center; padding:10px 0 8px; border-bottom:2px solid #1a202c; margin-bottom:14px; }
    .page-header-hotel { font-size:13px; font-weight:900; color:#1a202c; letter-spacing:-.02em; }
    .page-header-meta { font-size:9px; color:#6b7280; text-align:right; }
    .page-header-vg { font-size:18px; font-weight:900; color:#9c0006; letter-spacing:-.04em; }

    /* Capa */
    .capa { display:flex; flex-direction:column; justify-content:center; align-items:flex-start; height:240mm; padding:20mm 0; }
    .capa-vg { font-size:48px; font-weight:900; color:#9c0006; letter-spacing:-.05em; line-height:1; margin-bottom:16px; }
    .capa-titulo { font-size:28px; font-weight:900; color:#1a202c; letter-spacing:-.03em; line-height:1.1; margin-bottom:8px; }
    .capa-hotel { font-size:20px; font-weight:700; color:#374151; margin-bottom:32px; }
    .capa-linha { width:60px; height:3px; background:#9c0006; margin-bottom:32px; }
    .capa-meta { font-size:12px; color:#6b7280; line-height:2; }
    .capa-meta strong { color:#1a202c; font-weight:700; }

    /* Título de secção */
    .secao-titulo { font-size:14px; font-weight:900; color:#9c0006; text-transform:uppercase; letter-spacing:.08em; margin-bottom:14px; padding-bottom:6px; border-bottom:1px solid #e5e7eb; }
    .mes-titulo { font-size:16px; font-weight:900; color:#1a202c; margin-bottom:4px; }
    .mes-subtitulo { font-size:10px; color:#6b7280; margin-bottom:16px; }

    /* KPI cards */
    .kpi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:16px; }
    .kpi-card { background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:12px 14px; }
    .kpi-label { font-size:8px; font-weight:800; text-transform:uppercase; letter-spacing:.1em; color:#6b7280; margin-bottom:6px; }
    .kpi-val { font-size:22px; font-weight:900; color:#1a202c; line-height:1; margin-bottom:4px; }
    .kpi-comp { font-size:10px; color:#6b7280; }
    .kpi-var.good { color:#059669; font-weight:800; }
    .kpi-var.bad  { color:#dc2626; font-weight:800; }

    /* Tabela USALI */
    .usali-table { width:100%; border-collapse:collapse; font-size:10px; margin-bottom:12px; }
    .usali-table th { background:#1a202c; color:#fff; padding:6px 8px; text-align:left; font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; white-space:nowrap; }
    .usali-table th.num { text-align:right; }
    .usali-table td { padding:5px 8px; border-bottom:1px solid #f3f4f6; vertical-align:top; }
    .usali-table td.num { text-align:right; white-space:nowrap; font-family:'Courier New',monospace; }
    .usali-table td.label { font-weight:700; color:#374151; width:200px; }
    .usali-table td.comment { font-size:9px; color:#4b5563; font-style:italic; max-width:180px; }
    .usali-table tr.group-sep td { background:#374151; color:#fff; font-size:8px; font-weight:900; letter-spacing:.1em; text-transform:uppercase; padding:4px 8px; }
    .good { color:#059669; font-weight:800; }
    .bad  { color:#dc2626; font-weight:800; }

    /* Gráfico (imagem) */
    .chart-wrap { background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:10px; margin-bottom:12px; text-align:center; }
    .chart-wrap img { max-width:100%; height:auto; }
    .chart-label { font-size:9px; color:#6b7280; font-weight:700; text-transform:uppercase; letter-spacing:.06em; margin-bottom:6px; }

    /* Reputação */
    .rep-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px; }
    .rep-card { background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:12px; }
    .rep-gri { font-size:32px; font-weight:900; color:#1a202c; line-height:1; }
    .rep-label { font-size:8px; font-weight:800; text-transform:uppercase; letter-spacing:.1em; color:#6b7280; margin-bottom:4px; }

    /* Consolidado */
    .consol-table { width:100%; border-collapse:collapse; font-size:10px; }
    .consol-table th { background:#1a202c; color:#fff; padding:7px 8px; text-align:right; font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; }
    .consol-table th:first-child { text-align:left; }
    .consol-table td { padding:6px 8px; border-bottom:1px solid #f3f4f6; text-align:right; font-family:'Courier New',monospace; }
    .consol-table td:first-child { text-align:left; font-weight:700; font-family:inherit; color:#374151; }
    .consol-table tr.total-row td { background:#f3f4f6; font-weight:900; }

    @media print { body { padding:0; } .page { padding:0; } }
  `;

  // Helpers de formatação
  const fv = (v, type) => {
    if (v == null || isNaN(v)) return '—';
    if (type === 'pct') return fmt(v,1)+'%';
    if (type === 'eur2') return occSym()+fmt(v,2);
    if (type === 'eur') { const s=v<0?'-':''; return s+occSym()+Math.abs(v).toLocaleString('pt-PT',{maximumFractionDigits:0}); }
    return fmt(v,0);
  };
  const fvar = (v25, v26, type, isCost) => {
    if (v25==null||v26==null||isNaN(v25)||isNaN(v26)) return '<span style="color:#9ca3af">—</span>';
    const d=v26-v25, good=isCost?d<=0:d>=0;
    const txt = type==='pct'?(d>=0?'+':'')+fmt(d,1)+' p.p.':(d>=0?'+':'')+fv(d,type);
    return `<span class="${good?'good':'bad'}">${txt}</span>`;
  };

  // Captura canvas do pickup interanual navegando para a view de ocupação
  let occCanvasImg = null;
  try {
    // Selecciona o hotel no seletor de ocupação para garantir que o gráfico é o correcto
    const piuSel = document.getElementById('piuHotelSel');
    if (piuSel && [...piuSel.options].some(o => o.value === hotel)) {
      piuSel.value = hotel;
      // Selecciona o mês mais recente como alvo
      const piuMesSel = document.getElementById('piuMesSel');
      if (piuMesSel) piuMesSel.value = String(mesesSel[mesesSel.length-1] - 1); // 0-based
      if (typeof piuRender === 'function') piuRender();
      await new Promise(r => setTimeout(r, 500));
    }
    const piuCanvas = document.getElementById('piuChart');
    if (piuCanvas && piuCanvas.width > 0) {
      occCanvasImg = piuCanvas.toDataURL('image/png');
    }
  } catch(e) { occCanvasImg = null; }

  // ── Gera blocos HTML ──────────────────────────────────────

  function geraKPIs(h, m, data) {
    if (!data || !seccoesAtivas.kpis) return '';
    const oldRAW = RAW; RAW = data;
    const kpis = [
      { label:'Taxa Ocupação', v25:occ(h,YR_PREV), v26:occ(h,YR_CUR), type:'pct', cost:false },
      { label:'ADR',           v25:adr(h,YR_PREV), v26:adr(h,YR_CUR), type:'eur2', cost:false },
      { label:'RevPAR',        v25:revpar(h,YR_PREV), v26:revpar(h,YR_CUR), type:'eur2', cost:false },
      { label:'Receita Total', v25:n(data.hotels_ops?.[h]?.['Receita Total']?.[YR_PREV]), v26:n(data.hotels_ops?.[h]?.['Receita Total']?.[YR_CUR]), type:'eur', cost:false },
      { label:'GOP com Sede',  v25:gopComSede(h,YR_PREV), v26:gopComSede(h,YR_CUR), type:'eur', cost:false },
      { label:'Custos Totais', v25:totalCosts(h,YR_PREV), v26:totalCosts(h,YR_CUR), type:'eur', cost:true },
    ];
    RAW = oldRAW;
    return `
      <div class="secao-titulo">🎯 KPIs Executivos</div>
      <div class="kpi-grid">
        ${kpis.map(k => `
          <div class="kpi-card">
            <div class="kpi-label">${k.label}</div>
            <div class="kpi-val">${fv(k.v26, k.type)}</div>
            <div class="kpi-comp">${YR_PREV}: ${fv(k.v25,k.type)} &nbsp; ${fvar(k.v25,k.v26,k.type,k.cost)}</div>
          </div>`).join('')}
      </div>`;
  }

  function geraUSALI(h, m, data) {
    if (!data || !seccoesAtivas.usali) return '';
    const oldRAW = RAW; RAW = data;
    const GRUPOS = { ocupacao:'🛏 OCUPAÇÃO & YIELD', receitas:'📈 RECEITAS', custos:'📉 CUSTOS', gop:'💰 GOP', rh:'👥 RECURSOS HUMANOS', qualidade:'⭐ QUALIDADE' };
    let rows = '';
    let lastGroup = null;
    HS_ROWS.forEach(r => {
      if (r.group) {
        lastGroup = r.group;
        rows += `<tr class="group-sep"><td colspan="6">${GRUPOS[r.group] || r.group.toUpperCase()}</td></tr>`;
        return;
      }
      let v25, v26, a25, a26;
      try {
        if (r.manual) { v25=null; v26=null; a25=null; a26=null; }
        else {
          v25 = r.getter ? r.getter(h, YR_PREV) : null;
          v26 = r.getter ? r.getter(h, YR_CUR) : null;
          a25 = r.ytdGetter ? r.ytdGetter(h, YR_PREV, m) : null;
          a26 = r.ytdGetter ? r.ytdGetter(h, YR_CUR, m) : null;
        }
      } catch(e) { v25=null; v26=null; a25=null; a26=null; }
      const comment = hsGetComment(h,m,r.id) || '';
      const diff = (v25!=null&&v26!=null&&!isNaN(v25)&&!isNaN(v26)) ? v26-v25 : null;
      rows += `<tr>
        <td class="label">${r.label}</td>
        <td class="num">${fv(v25,r.type)}</td>
        <td class="num">${fv(v26,r.type)}</td>
        <td class="num">${fvar(v25,v26,r.type,r.cost)}</td>
        <td class="num">${fv(a25,r.type)}</td>
        <td class="num">${fv(a26,r.type)}</td>
        <td class="comment">${comment ? comment.substring(0,120)+(comment.length>120?'…':'') : ''}</td>
      </tr>`;
    });
    RAW = oldRAW;
    return `
      <div class="secao-titulo">📋 Ficha USALI</div>
      <table class="usali-table">
        <thead><tr>
          <th>Indicador</th>
          <th class="num">${YR_PREV} Mês</th>
          <th class="num">${YR_CUR} Mês</th>
          <th class="num">Var.</th>
          <th class="num">${YR_PREV} Acum.</th>
          <th class="num">${YR_CUR} Acum.</th>
          <th>Comentário</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  function geraOcupacao(h, m) {
    if (!seccoesAtivas.ocupacao) return '';
    // Dados de ocupação dos snapshots
    const mNome = MESES_NOMES[m] || MES_NOME[m] || m;
    let rows = '';
    const mIdx = m - 1; // 0-based para PIU
    if (PIU_SNAPSHOTS.length) {
      PIU_SNAPSHOTS.filter(s => { const i=piuSnapMonth(s); return i && i.m <= mIdx; })
        .sort((a,b) => (a.ts||0)-(b.ts||0))
        .forEach(s => {
          const info = piuSnapMonth(s);
          if (!info) return;
          const v25 = occYearData(s.data?.[h], YR_PREV)?.[mIdx] ?? null;
          // 2026: snapshot mais recente até esse mês
          const snap26 = OCC_SNAPSHOTS.filter(os => { const i=piuSnapMonth(os); return i && i.m <= info.m; })
            .sort((a,b)=>(b.ts||0)-(a.ts||0))[0];
          const v26 = snap26 ? (occYearData(snap26.data?.[h], YR_CUR)?.[mIdx] ?? null) : null;
          const mAbr = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
          rows += `<tr>
            <td class="label">${mAbr[info.m]} ${info.y}</td>
            <td class="num">${v25 != null ? fmt(v25,1)+'%' : '—'}</td>
            <td class="num">${v26 != null ? fmt(v26,1)+'%' : '—'}</td>
            <td class="num">${(v25!=null&&v26!=null) ? `<span class="${v26>=v25?'good':'bad'}">${v26>=v25?'+':''}${fmt(v26-v25,1)} p.p.</span>` : '—'}</td>
          </tr>`;
        });
    }
    const occImg = (occCanvasImg && occCanvasImg.length > 1000)
      ? `<div class="chart-wrap"><div class="chart-label">Curva de Pickup Interanual — ${mNome}</div><img src="${occCanvasImg}" alt="Pickup chart" style="max-width:100%;height:auto"></div>`
      : '';
    return `
      <div class="secao-titulo">🛏 Ocupação &amp; Pickup</div>
      ${occImg}
      ${rows ? `<table class="usali-table">
        <thead><tr><th>Snapshot</th><th class="num">${YR_PREV} → ${mNome}</th><th class="num">${YR_CUR} → ${mNome}</th><th class="num">Variação</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>` : `<p style="font-size:10px;color:#6b7280">Carrega os PDFs de referência ${YR_PREV} na secção de Ocupação para ver a curva de pickup.</p>`}`;
  }

  function geraReceitas(h, m, data) {
    if (!data || !seccoesAtivas.receitas) return '';
    const oldRAW = RAW; RAW = data;
    const linhas = [
      { label:'Receita Total',       v25:n(data.hotels_ops?.[h]?.['Receita Total']?.[YR_PREV]),    v26:n(data.hotels_ops?.[h]?.['Receita Total']?.[YR_CUR]),    type:'eur' },
      { label:'Receita Alojamento',  v25:n(data.hotels_rev?.[h]?.ALOJAMENTO?.[YR_PREV] ?? data.hotels_ops?.[h]?.['Receita Alojamento']?.[YR_PREV]), v26:n(data.hotels_rev?.[h]?.ALOJAMENTO?.[YR_CUR] ?? data.hotels_ops?.[h]?.['Receita Alojamento']?.[YR_CUR]), type:'eur' },
      { label:'Receita F&B',         v25:n(data.hotels_rev?.[h]?.ALIMENTACAO?.[YR_PREV] ?? data.hotels_ops?.[h]?.['Receita FB']?.[YR_PREV]),       v26:n(data.hotels_rev?.[h]?.ALIMENTACAO?.[YR_CUR] ?? data.hotels_ops?.[h]?.['Receita FB']?.[YR_CUR]),       type:'eur' },
      { label:'Receita DRHP',        v25:n(data.hotels_rev?.[h]?.DRHP?.[YR_PREV]),                v26:n(data.hotels_rev?.[h]?.DRHP?.[YR_CUR]),                type:'eur' },
      { label:'Receita Diversos',    v25:n(data.hotels_rev?.[h]?.DIVERSOS?.[YR_PREV]),             v26:n(data.hotels_rev?.[h]?.DIVERSOS?.[YR_CUR]),             type:'eur' },
    ];
    RAW = oldRAW;
    return `
      <div class="secao-titulo">📈 Receitas</div>
      <table class="usali-table">
        <thead><tr><th>Rubrica</th><th class="num">${YR_PREV}</th><th class="num">${YR_CUR}</th><th class="num">Variação</th></tr></thead>
        <tbody>${linhas.map(l=>`<tr><td class="label">${l.label}</td><td class="num">${fv(l.v25,l.type)}</td><td class="num">${fv(l.v26,l.type)}</td><td class="num">${fvar(l.v25,l.v26,l.type,false)}</td></tr>`).join('')}</tbody>
      </table>`;
  }

  function geraCustos(h, m, data) {
    if (!data || !seccoesAtivas.custos) return '';
    const oldRAW = RAW; RAW = data;
    const linhas = [
      { label:'Custos Totais',          v25:totalCosts(h,YR_PREV), v26:totalCosts(h,YR_CUR), type:'eur', cost:true },
      { label:'Pessoal',                v25:n(data.hotels_costs?.[h]?.PESSOAL?.[YR_PREV]),    v26:n(data.hotels_costs?.[h]?.PESSOAL?.[YR_CUR]),    type:'eur', cost:true },
      { label:'Energia',                v25:n(data.hotels_costs?.[h]?.ENERGIA?.[YR_PREV]),    v26:n(data.hotels_costs?.[h]?.ENERGIA?.[YR_CUR]),    type:'eur', cost:true },
      { label:'Manutenção',             v25:n(data.hotels_costs?.[h]?.['MANUTENÇÃO']?.[YR_PREV]), v26:n(data.hotels_costs?.[h]?.['MANUTENÇÃO']?.[YR_CUR]), type:'eur', cost:true },
      { label:'Comidas',                v25:n(data.hotels_costs?.[h]?.COMIDAS?.[YR_PREV]),    v26:n(data.hotels_costs?.[h]?.COMIDAS?.[YR_CUR]),    type:'eur', cost:true },
      { label:'Bebidas',                v25:n(data.hotels_costs?.[h]?.BEBIDAS?.[YR_PREV]),    v26:n(data.hotels_costs?.[h]?.BEBIDAS?.[YR_CUR]),    type:'eur', cost:true },
      { label:'Outros Operacionais',    v25:n(data.hotels_costs?.[h]?.OPERACIONAIS?.[YR_PREV]), v26:n(data.hotels_costs?.[h]?.OPERACIONAIS?.[YR_CUR]), type:'eur', cost:true },
      { label:'Rácio A&B',             v25:ratioAB(h,YR_PREV), v26:ratioAB(h,YR_CUR), type:'pct', cost:true },
    ];
    RAW = oldRAW;
    return `
      <div class="secao-titulo">📉 Custos</div>
      <table class="usali-table">
        <thead><tr><th>Rubrica</th><th class="num">${YR_PREV}</th><th class="num">${YR_CUR}</th><th class="num">Variação</th></tr></thead>
        <tbody>${linhas.map(l=>`<tr><td class="label">${l.label}</td><td class="num">${fv(l.v25,l.type)}</td><td class="num">${fv(l.v26,l.type)}</td><td class="num">${fvar(l.v25,l.v26,l.type,l.cost)}</td></tr>`).join('')}</tbody>
      </table>`;
  }

  function geraReputacao(h) {
    if (!seccoesAtivas.reputacao) return '';
    const canonH = Object.keys(REP_STORE).find(k => rtCanon(k) === rtCanon(h));
    if (!canonH) return `<div class="secao-titulo">★ Reputação</div><p style="font-size:10px;color:#6b7280">Sem dados de reputação para este hotel. Carrega um PDF ReviewPro na secção de Reputação.</p>`;
    const repArr = Array.isArray(REP_STORE[canonH]) ? REP_STORE[canonH] : [REP_STORE[canonH]];
    // Usa o registo mais recente
    const rep = repArr.length ? [...repArr].sort((a,b) => rtCmpWeek(a.week,b.week)).slice(-1)[0] : {};
    const griDeltaHtml = rep.griDelta != null
      ? `<div style="font-size:10px;margin-top:4px" class="${rep.griDelta>=0?'good':'bad'}">${rep.griDelta>=0?'+':''}${fmt(rep.griDelta,1)} vs semana anterior</div>` : '';
    const goalHtml = rep.griGoal != null
      ? `<div style="font-size:10px;color:#6b7280;margin-top:2px">Objectivo: ${fmt(rep.griGoal,1)}</div>` : '';
    const reviewsHtml = rep.reviews != null
      ? `${rep.reviews.toLocaleString('pt-PT')} reviews${rep.reviewsDelta != null ? ` (${rep.reviewsDelta>=0?'+':''}${rep.reviewsDelta} vs ant.)` : ''}`
      : '—';
    return `
      <div class="secao-titulo">★ Reputação — ReviewPro</div>
      <div class="rep-grid">
        <div class="rep-card">
          <div class="rep-label">GRI™ — ${rep.period || rep.week || ''}</div>
          <div class="rep-gri">${rep.gri != null ? fmt(rep.gri,1) : '—'}</div>
          ${griDeltaHtml}${goalHtml}
        </div>
        <div class="rep-card">
          <div class="rep-label">Reviews</div>
          <div class="rep-gri" style="font-size:22px">${reviewsHtml}</div>
        </div>
      </div>`;
  }

  // ── Constrói o HTML completo ──────────────────────────────
  const paginaHeader = (mes) => `
    <div class="page-header">
      <div>
        <div class="page-header-vg">VG</div>
        <div class="page-header-hotel">${hotel}</div>
      </div>
      <div class="page-header-meta">
        Vila Galé Hotéis · Relatório Mensal<br>
        ${mes ? MESES_NOMES[mes] + ' ' + YR_CUR : 'Consolidado'} · ${agora}
      </div>
    </div>`;

  let paginas = [];

  // CAPA
  paginas.push(`
    <div class="page">
      <div class="capa">
        <div class="capa-vg">Vila Galé</div>
        <div class="capa-titulo">Relatório Mensal<br>de Hotel</div>
        <div class="capa-hotel">${hotel}</div>
        <div class="capa-linha"></div>
        <div class="capa-meta">
          <strong>Período:</strong> ${mesesSel.map(m=>MESES_NOMES[m]).join(', ')}<br>
          <strong>Director(a):</strong> ${diretor}<br>
          <strong>Gerado em:</strong> ${agora}<br>
          <strong>Elaborado por:</strong> Vila Galé Dashboard Operações
        </div>
      </div>
    </div>`);

  // CONSOLIDADO (só se mais de 1 mês)
  if (mesesSel.length > 1 && seccoesAtivas.kpis) {
    const linhasConsol = [
      { label:'Taxa Ocupação (%)',   fn:(h,y,data)=>{ const old=RAW; RAW=data; const v=occ(h,y); RAW=old; return v; }, type:'pct', sum:false },
      { label:'ADR ('+occSym()+')',             fn:(h,y,data)=>{ const old=RAW; RAW=data; const v=adr(h,y); RAW=old; return v; }, type:'eur2', sum:false },
      { label:'RevPAR ('+occSym()+')',          fn:(h,y,data)=>{ const old=RAW; RAW=data; const v=revpar(h,y); RAW=old; return v; }, type:'eur2', sum:false },
      { label:'Receita Total ('+occSym()+')',   fn:(h,y,data)=>n(data.hotels_ops?.[h]?.['Receita Total']?.[y]), type:'eur', sum:true },
      { label:'GOP com Sede ('+occSym()+')',    fn:(h,y,data)=>{ const old=RAW; RAW=data; const v=gopComSede(h,y); RAW=old; return v; }, type:'eur', sum:true },
      { label:'Custos Totais ('+occSym()+')',   fn:(h,y,data)=>{ const old=RAW; RAW=data; const v=totalCosts(h,y); RAW=old; return v; }, type:'eur', sum:true, cost:true },
    ];
    const colMeses = mesesSel.map(m => ({ m, nome: MES_NOME[m] || m, data: STORE[m] })).filter(c=>c.data);
    let consolHtml = `
      <div class="secao-titulo">📊 Consolidado do Período</div>
      <table class="consol-table">
        <thead><tr>
          <th>Indicador</th>
          ${colMeses.map(c=>`<th>${c.nome} ${YR_CUR}</th><th>vs ${YR_PREV}</th>`).join('')}
        </tr></thead>
        <tbody>`;
    linhasConsol.forEach(l => {
      consolHtml += `<tr><td>${l.label}</td>`;
      colMeses.forEach(c => {
        const v26 = l.fn(hotel, YR_CUR, c.data);
        const v25 = l.fn(hotel, YR_PREV, c.data);
        consolHtml += `<td>${fv(v26,l.type)}</td><td>${fvar(v25,v26,l.type,l.cost||false)}</td>`;
      });
      consolHtml += `</tr>`;
    });
    consolHtml += `</tbody></table>`;
    paginas.push(`<div class="page">${paginaHeader(null)}${consolHtml}</div>`);
  }

  // BLOCO POR MÊS
  mesesSel.forEach(m => {
    const data = STORE[m];
    if (!data) return;
    const mNome = MESES_NOMES[m] || MES_NOME[m] || m;
    const header = paginaHeader(m);
    const tituloMes = `<div class="mes-titulo">${mNome} ${YR_CUR}</div><div class="mes-subtitulo">Análise mensal · ${hotel}</div>`;

    // KPIs + Ocupação juntos (geralmente cabem numa página)
    const secKPIs = geraKPIs(hotel, m, data);
    const secOcup = geraOcupacao(hotel, m);
    if (secKPIs || secOcup) paginas.push(`<div class="page">${header}${tituloMes}${secKPIs}${secOcup}</div>`);

    // USALI (pode ser longa — página própria)
    const secUSALI = geraUSALI(hotel, m, data);
    if (secUSALI) paginas.push(`<div class="page">${header}${tituloMes}${secUSALI}</div>`);

    // Receitas + Custos + Reputação
    const secRec = geraReceitas(hotel, m, data);
    const secCus = geraCustos(hotel, m, data);
    const secRep = geraReputacao(hotel);
    if (secRec || secCus || secRep) paginas.push(`<div class="page">${header}${tituloMes}${secRec}${secCus}${secRep}</div>`);
  });

  // Abre janela de impressão
  const printWin = window.open('', '_blank');
  if (!printWin) { showToast('Permite pop-ups para este site e tenta novamente.', true); return; }

  const htmlFinal = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<title>Relatório ${hotel} — ${mesesSel.map(m=>MES_NOME[m]||m).join('+')} ${YR_CUR}</title>
<style>${REL_CSS}</style>
</head>
<body>
${paginas.join('\n')}
<scr` + `ipt>
window.addEventListener('load', function(){
  document.querySelectorAll('.page').forEach(function(p){
    var inner = p;
    var maxH = p.clientHeight || 1123;
    var actualH = p.scrollHeight;
    if(actualH > maxH * 1.05){
      var scale = maxH / actualH;
      inner.style.transform = 'scale(' + scale + ')';
      inner.style.transformOrigin = 'top left';
      inner.style.width = (100/scale) + '%';
    }
  });
  setTimeout(function(){ window.print(); }, 400);
});
</scr` + `ipt>
</body>
</html>`;

  printWin.document.open();
  printWin.document.write(htmlFinal);
  printWin.document.close();
  showToast(`✓ Relatório de ${hotel} gerado — ${paginas.length} páginas`);
}

// ── Inicializa PIU depois do DOM estar pronto ─────────────
(function piuInit() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(() => piuLoadFromDB(), 200));
  } else {
    setTimeout(() => piuLoadFromDB(), 200);
  }
})();

function occRenderCompare(hotel) {
  const summaryEl = document.getElementById('occCompareSummary');
  if (summaryEl) summaryEl.innerHTML = '';
  if (OCC_SNAPSHOTS.length < 2) return;

  // Mapa: nome do hotel no STORE → chave no HOTEIS_STATIC/HOTEIS_XLSX
  const OCC_TO_XLSX_KEY = {
    'OPERA':'VG Ópera','PORTO':'VG Porto','PORTO RIBEIRA':'VG Porto Ribeira',
    'ISLA CANELA':'VG Isla Canela','COLLECTION FIGUEIRA DA FOZ':'VG Collection Figueira da Foz',
    'COLLECTION BRAGA':'VG Collection Braga','DOURO VINEYARDS':'VG Douro Vineyards',
    'COLLECTION DOURO':'VG Collection Douro','COLLECTION SERRA DA ESTRELA':'VG Serra da Estrela',
    'COIMBRA':'VG Coimbra','COLLECTION TOMAR':'VG Tomar','COLLECTION SINTRA':'VG Sintra',
    'ERICEIRA':'VG Ericeira','CASCAIS':'VG Cascais',
    'COLLECTION PALACIO DOS ARCOS':'VG Collection Palácio dos Arcos',
    'SANTA CRUZ':'VG Santa Cruz','ESTORIL':'VG Estoril',
    'CASAS DE ELVAS':"VG Casas d'Elvas",'COLLECTION ELVAS':'VG Collection Elvas',
    'COLLECTION ALTER REAL':'VG Collection Alter Real','EVORA':'VG Évora',
    'COLLECTION MONTE DO VILAR':'VG Monte do Vilar','ALENTEJO VINEYARDS':'VG Alentejo Vineyards',
    'TAVIRA':'VG Tavira','NEP KIDS':'VG NEP Kids','MARINA':'VG Marina',
    'ALBACORA':'VG Albacora','COLLECTION PRAIA':'VG Collection Praia',
    'AMPALIUS':'VG Ampalius','CERRO ALAGOA':'VG Cerro Alagoa','ATLANTICO':'VG Atlântico',
    'NAUTICO':'VG Náutico','LAGOS':'VG Lagos','COLLECTION S. MIGUEL':'VG S Miguel',
    'COLLECTION PONTE DE LIMA VINEYARDS':'VGC PONTE DE LIMA VINEYARDS',
  };

  // Devolve o número total de quartos do hotel (do Excel de fichas técnicas)
  function occQuartosTotais(hotelName) {
    const xlsxKey = OCC_TO_XLSX_KEY[hotelName] || hotelName;
    const d = (typeof HOTEIS_XLSX !== 'undefined') ? HOTEIS_XLSX[xlsxKey] : null;
    if (d?.totalQ != null && d.totalQ > 0) return d.totalQ;
    return null;
  }

  // Potencial de venda anual = quartos × 365
  function occPotencial(quartos) {
    if (quartos == null) return null;
    return quartos * 365;
  }

  // Formata room nights: positivo verde, negativo vermelho
  function fmtRN(pp, quartos) {
    if (pp == null || quartos == null) return '—';
    const potencial = occPotencial(quartos);
    if (potencial == null) return '—';
    const rn = Math.round(pp / 100 * potencial);
    if (rn === 0) return '0 rn';
    const cls = rn > 0 ? 'occ-pickup-pos' : 'occ-pickup-neg';
    return `<span class="${cls}">${rn > 0 ? '+' : ''}${rn.toLocaleString('pt-PT')} rn</span>`;
  }

  const avg = (snap, h) => {
    const arr = occYearData(snap.data[h], YR_CUR);
    const v = arr.filter(x=>x!=null && !isNaN(x));
    return v.length ? v.reduce((a,b)=>a+b,0)/v.length : null;
  };
  const fmtP = v => v == null ? '—' : v.toFixed(1).replace('.', ',') + '%';
  const fmtPP = v => v == null ? '—' : (v > 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + ' p.p.';
  const deltaCls = v => v == null ? 'occ-pickup-flat' : v > 0.05 ? 'occ-pickup-pos' : v < -0.05 ? 'occ-pickup-neg' : 'occ-pickup-flat';
  const deltaTxt = v => v == null ? 'Sem comparação' : v > 0.05 ? 'Pickup' : v < -0.05 ? 'Perda' : 'Sem variação';
  const snapName = (s, i) => `S${i+1} · ${s.label || 'sem data'}`;

  if (occChartCompareInst) occChartCompareInst.destroy();
  const ctx = document.getElementById('occChartCompare').getContext('2d');

  if (hotel && hotel !== '__all__') {
    const values = OCC_SNAPSHOTS.map(s => avg(s, hotel));
    const labels = OCC_SNAPSHOTS.map((s,i) => snapName(s,i));
    const deltas = values.map((v,i) => i === 0 || v == null || values[i-1] == null ? null : +(v - values[i-1]).toFixed(2));

    occChartCompareInst = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [{
        label: `${occShortName(hotel)} — ocupação YTD ${YR_CUR}`,
        data: values,
        borderColor: '#c9a84c',
        backgroundColor: 'rgba(201,168,76,.18)',
        pointBackgroundColor: deltas.map(d => d == null ? '#c9a84c' : d >= 0 ? '#2ecc8f' : '#e05c4e'),
        pointBorderColor: deltas.map(d => d == null ? '#c9a84c' : d >= 0 ? '#2ecc8f' : '#e05c4e'),
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: .28,
        fill: true
      }]},
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{ position:'top', labels:{ color:'#94aabf', font:{size:11} } },
          tooltip:{ callbacks:{
            title: items => items?.[0]?.label || '',
            label: ctx => {
              const i = ctx.dataIndex;
              const d = deltas[i];
              return d == null ? ` Ocupação: ${fmtP(ctx.raw)}` : ` Ocupação: ${fmtP(ctx.raw)} · ${fmtPP(d)} vs snapshot anterior`;
            }
          }}
        },
        scales:{
          x:{ ticks:{ maxRotation:35, color:'#64748b', font:{size:9} }, grid:{ color:'rgba(255,255,255,.04)' } },
          y:{ min:0, max:100, ticks:{ callback:v=>v+'%', color:'#64748b', font:{size:11} }, grid:{ color:'rgba(255,255,255,.04)' } }
        }
      }
    });

    if (summaryEl) {
      const rows = [];
      const quartos = occQuartosTotais(hotel);
      for (let i=1; i<OCC_SNAPSHOTS.length; i++) {
        const before = values[i-1], after = values[i];
        const d = before != null && after != null ? after - before : null;
        rows.push(`<tr>
          <td><span class="occ-snapshot-date-chip">${OCC_SNAPSHOTS[i-1].label || 'sem data'}</span> → <span class="occ-snapshot-date-chip">${OCC_SNAPSHOTS[i].label || 'sem data'}</span></td>
          <td>${fmtP(before)}</td>
          <td>${fmtP(after)}</td>
          <td class="${deltaCls(d)}">${fmtPP(d)}</td>
          <td style="text-align:right">${fmtRN(d, quartos)}</td>
          <td class="${deltaCls(d)}">${deltaTxt(d)}</td>
        </tr>`);
      }
      summaryEl.innerHTML = `<div class="occ-pickup-panel">
        <div class="occ-pickup-head"><span class="occ-pickup-title">Evolução do pickup — ${occShortName(hotel)}</span><span>comparação sequencial entre snapshots</span></div>
        <table class="occ-pickup-table"><thead><tr><th>Período entre snapshots</th><th>Antes</th><th>Depois</th><th>Pickup / Perda</th><th>Room Nights</th><th>Leitura</th></tr></thead><tbody>${rows.join('')}</tbody></table>
        ${quartos == null ? '<div class="note" style="margin-top:6px">ⓘ Carrega a Ficha Técnica Excel no separador Hotéis para ver room nights.</div>' : `<div class="note" style="margin-top:6px">Room nights = delta p.p. × potencial anual (<b>${quartos} quartos</b> × 365 dias = <b>${(quartos*365).toLocaleString('pt-PT')} rn/ano</b>).</div>`}
      </div>
      ${occRenderPickupByMonth(hotel, quartos)}
      `;
    }
    return;
  }

  const latest = OCC_SNAPSHOTS[OCC_SNAPSHOTS.length - 1];
  const prev   = OCC_SNAPSHOTS[OCC_SNAPSHOTS.length - 2];
  const regionLabels = { todos:'Todos os Hotéis', norte:'Norte e Centro', lisboa:'Lisboa & Ilhas', alentejo:'Alentejo', algarve:'Algarve' };

  // Sensível ao filtro de região: quando existe região ativa, só entram os hotéis dessa região.
  // Em "Todos", mostra todos os hotéis existentes no snapshot mais recente.
  const allHotels = Object.keys(latest.data || {}).sort();
  const hotels = activeRegion && activeRegion !== 'todos'
    ? allHotels.filter(h => selectedHotels.has(h))
    : allHotels;

  const latestVals = hotels.map(h => avg(latest, h));
  const prevVals   = hotels.map(h => avg(prev, h));
  const deltas     = hotels.map((h,i) => latestVals[i]!=null && prevVals[i]!=null ? +(latestVals[i]-prevVals[i]).toFixed(2) : null);

  const rows = hotels.map((h,i)=>({hotel:h, prev:prevVals[i], latest:latestVals[i], delta:deltas[i]}))
    .filter(r => r.prev != null || r.latest != null)
    .sort((a,b) => {
      const ad = a.delta == null ? -1 : Math.abs(a.delta);
      const bd = b.delta == null ? -1 : Math.abs(b.delta);
      return bd - ad || occShortName(a.hotel).localeCompare(occShortName(b.hotel));
    });

  const labels = rows.map(r => occShortName(r.hotel));
  const deltaData = rows.map(r => r.delta == null ? 0 : r.delta);
  const maxAbs = Math.max(1, ...deltaData.map(v => Math.abs(v)));

  occChartCompareInst = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{
      label: `Pickup/perda · ${prev.label || 'snapshot anterior'} → ${latest.label || 'snapshot mais recente'}`,
      data: deltaData,
      backgroundColor: deltaData.map(v => v >= 0 ? 'rgba(31,158,107,.62)' : 'rgba(192,57,43,.70)'),
      borderColor: deltaData.map(v => v >= 0 ? '#2ecc8f' : '#e05c4e'),
      borderWidth: 1,
      borderRadius: 4
    }]},
    options: {
      indexAxis: 'y',
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{ position:'top', labels:{ color:'#94aabf', font:{size:11} } },
        tooltip:{ callbacks:{
          label: ctx => {
            const r = rows[ctx.dataIndex];
            return ` ${fmtPP(r.delta)} · ${fmtP(r.prev)} → ${fmtP(r.latest)}`;
          }
        }}
      },
      scales:{
        x:{ min:-maxAbs*1.15, max:maxAbs*1.15, ticks:{ callback:v=>(v>0?'+':'')+v+' p.p.', color:'#64748b', font:{size:11} }, grid:{ color:'rgba(255,255,255,.05)' } },
        y:{ ticks:{ color:'#94aabf', font:{size:10} }, grid:{ color:'rgba(255,255,255,.025)' } }
      }
    }
  });

  if (summaryEl) {
    const regionTxt = regionLabels[activeRegion] || 'Seleção';
    const tableRows = rows.map(r=>`<tr><td>${occShortName(r.hotel)}</td><td>${fmtP(r.prev)}</td><td>${fmtP(r.latest)}</td><td class="${deltaCls(r.delta)}">${fmtPP(r.delta)}</td><td class="${deltaCls(r.delta)}">${deltaTxt(r.delta)}</td></tr>`).join('');
    summaryEl.innerHTML = `<div class="occ-pickup-panel">
      <div class="occ-pickup-head"><span class="occ-pickup-title">Pickup/perda por hotel — ${regionTxt}</span><span>${prev.label || 'snapshot anterior'} → ${latest.label || 'snapshot mais recente'} · ${rows.length} hotéis</span></div>
      <table class="occ-pickup-table"><thead><tr><th>Hotel</th><th>Anterior</th><th>Mais recente</th><th>Pickup / Perda</th><th>Leitura</th></tr></thead><tbody>
        ${tableRows || `<tr><td colspan="5" style="text-align:center;color:var(--text-3);padding:18px">Sem hotéis para o filtro selecionado.</td></tr>`}
      </tbody></table>
    </div>`;
  }
}
// ── Persistence integration ───────────────────────────────
// buildSessionSnapshot and restoreFromSnapshot already handle
// OCC_SNAPSHOTS via the patched versions below.
// Override the snapshot builder to include OCC_SNAPSHOTS:
const _origBuildSnapshot = buildSessionSnapshot;
buildSessionSnapshot = function() {
  const snap = _origBuildSnapshot();
  snap.OCC_SNAPSHOTS = OCC_SNAPSHOTS.map(s => ({
    id: s.id, label: s.label, loadedAt: s.loadedAt, ts: s.ts, data: s.data
  }));
  return snap;
};

const _origRestore = restoreFromSnapshot;
restoreFromSnapshot = function(snap) {
  try { _origRestore(snap); } catch(e) { console.warn('Restauro base falhou:', e); }
  // OCC UI update after restore
  try {
    if (snap.OCC_SNAPSHOTS && Array.isArray(snap.OCC_SNAPSHOTS)) {
      occUpdateUI();
    }
  } catch(e) { console.warn('Atualização do ecrã de Ocupação falhou (dados já estão carregados):', e); }
};
// ==========================================================
// END OCUPAÇÃO MODULE
// ==========================================================

