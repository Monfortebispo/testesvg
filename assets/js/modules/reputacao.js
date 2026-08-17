// REPUTATION MODULE v2
// REP_STORE: { normalisedHotelName → [ {entry}, ... ] }
// Each entry has a unique (hotel, week) key — no duplicates.
// ══════════════════════════════════════════════════════════
const REP_STORE = {};
let rtSelected  = new Set(); // selected hotel keys for comparison
let rtCharts    = {};

// ── Key helpers ───────────────────────────────────────────
const rtKey = name => name.toLowerCase().replace(/[^a-z0-9\u00c0-\u017e\s]/gi,'').replace(/\s+/g,' ').trim();

function rtEscape(v) {
  return String(v ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}
function rtCanon(v) {
  return String(v ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/\bvila\s*gal[eé]?\b/g,'')
    .replace(/\bvg\b/g,'')
    .replace(/\bresumo\s+executivo\b/g,'')
    .replace(/\bhotel\b/g,'')
    .replace(/[^a-z0-9]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}
function rtPrettyHotelName(v) {
  const small = new Set(['de','da','do','das','dos','e']);
  return String(v || '')
    .toLowerCase()
    .split(/\s+/)
    .map((w,i) => small.has(w) && i > 0 ? w : w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .replace(/\bOpera\b/g,'Ópera')
    .replace(/\bPalacio\b/g,'Palácio')
    .replace(/\bAtlantico\b/g,'Atlântico')
    .replace(/\bEvora\b/g,'Évora');
}
function rtKnownHotels() {
  const fromRegions = Object.values(REGIOES || {}).flat();
  const fromRaw = (RAW && RAW.hotel_list) ? RAW.hotel_list : [];
  return [...new Set([...fromRegions, ...fromRaw])];
}
function rtCleanHotelName(raw) {
  let s = String(raw || '')
    .replace(/\.pdf$/i,'')
    .replace(/_/g,' ')
    .replace(/\s*\(\d+\)\s*$/,'')
    .replace(/\s*[-–—]\s*Resumo\s+Executivo.*$/i,'')
    .replace(/\bResumo\s+Executivo\b.*$/i,'')
    .replace(/^\s*Vila\s+Gal[eé]\s+/i,'')
    .replace(/^\s*VG\s+/i,'')
    .replace(/\s+/g,' ')
    .trim();
  return s || String(raw || 'Hotel').trim();
}
function rtResolveHotelName(raw) {
  const cleaned = rtCleanHotelName(raw);
  const c = rtCanon(cleaned);
  const match = rtKnownHotels().find(h => {
    const hc = rtCanon(h);
    return hc === c || c.includes(hc) || hc.includes(c);
  });
  return match ? rtPrettyHotelName(match) : cleaned;
}
function rtPeriodKey(entry) {
  const raw = entry?.period || entry?.week || '';
  return rtCanon(raw) || 'semana-desconhecida';
}
function rtEntryKey(entry) {
  return `${rtCanon(entry?.hotel || '')}|${rtPeriodKey(entry)}`;
}
function rtEntryMatchesRegion(k, regionHotel) {
  const a = rtCanon(REP_STORE[k]?.[0]?.hotel || k);
  const b = rtCanon(regionHotel);
  return a === b || a.includes(b) || b.includes(a);
}
function rtKeysForRegion(region = activeRegion) {
  const keys = Object.keys(REP_STORE).sort((a,b) => String(REP_STORE[a]?.[0]?.hotel || a).localeCompare(String(REP_STORE[b]?.[0]?.hotel || b), 'pt'));
  if (!region || region === 'todos') return keys;
  const list = REGIOES[region] || [];
  return keys.filter(k => list.some(h => rtEntryMatchesRegion(k, h)));
}
function rtNormalizeStore() {
  const next = {};
  Object.keys(REP_STORE).forEach(oldKey => {
    const arr = Array.isArray(REP_STORE[oldKey]) ? REP_STORE[oldKey] : [REP_STORE[oldKey]];
    arr.filter(Boolean).forEach(oldEntry => {
      const entry = Object.assign({}, oldEntry);
      entry.hotel = rtResolveHotelName(entry.hotel || oldKey);
      entry._entryKey = rtEntryKey(entry);
      const key = rtKey(entry.hotel);
      if (!next[key]) next[key] = [];
      const i = next[key].findIndex(e => rtEntryKey(e) === entry._entryKey);
      if (i >= 0) next[key][i] = entry;
      else next[key].push(entry);
    });
  });
  Object.keys(REP_STORE).forEach(k => delete REP_STORE[k]);
  Object.entries(next).forEach(([k, arr]) => {
    REP_STORE[k] = arr.sort((a,b) => rtCmpWeek(a.week,b.week));
  });
  const valid = new Set(Object.keys(REP_STORE));
  rtSelected = new Set([...rtSelected].map(k => {
    if (valid.has(k)) return k;
    const target = [...valid].find(v => rtCanon(REP_STORE[v]?.[0]?.hotel || v) === rtCanon(k));
    return target || null;
  }).filter(Boolean));
  if (!rtSelected.size) Object.keys(REP_STORE).forEach(k => rtSelected.add(k));
}


// ── Clear all data ────────────────────────────────────────
function rtClearAll() {
  if (!Object.keys(REP_STORE).length) return;
  if (!confirm('Limpar todos os dados de reputação?')) return;
  Object.keys(REP_STORE).forEach(k => delete REP_STORE[k]);
  rtSelected.clear();
  Object.values(rtCharts).forEach(c => c.destroy());
  rtCharts = {};
  rtRender();
  showToast('Dados de reputação limpos');
}

// ── File loading ──────────────────────────────────────────
async function rtLoadFiles(files) {
  const dcBefore = typeof window.vgDataCenterCapture === 'function' ? window.vgDataCenterCapture('reputation') : null;
  let added = 0, updated = 0, failed = 0;
  for (const file of [...files]) {
    if (!file.name.toLowerCase().endsWith('.pdf')) continue;
    const text = await rtReadPdf(file);
    const data = text ? rtParsePdf(text, file.name) : null;
    if (!data || !data.gri) { showToast('Não foi possível ler: ' + file.name, true); failed++; continue; }
    data.hotel = rtResolveHotelName(data.hotel);
    data._entryKey = rtEntryKey(data);
    const key = rtKey(data.hotel);
    if (!REP_STORE[key]) REP_STORE[key] = [];
    // Substituição real: mesmo hotel + mesmas datas/semana → apaga a versão antiga e entra a nova
    const existing = REP_STORE[key].findIndex(e => rtEntryKey(e) === data._entryKey);
    if (existing >= 0) { REP_STORE[key][existing] = data; updated++; }
    else { REP_STORE[key].push(data); added++; }
    // Keep entries sorted chronologically by week
    REP_STORE[key].sort((a,b) => rtCmpWeek(a.week, b.week));
    rtSelected.add(key);
  }
  document.getElementById('rtFileInput').value = '';
  if (added + updated > 0) {
    showToast(`✓ ${added} entr${added===1?'ada':'adas'} adicionada${added===1?'':'s'}${updated?' · '+updated+' actualizada'+(updated===1?'':'s'):''}`);
    rtRender();
    if (typeof window.vgDataCenterRecord === 'function') window.vgDataCenterRecord({
      source:'reputation',fileName:[...files].map(f=>f.name).join(', '),fileSize:[...files].reduce((a,f)=>a+(f.size||0),0),scope:`${added+updated} período(s)`,before:dcBefore,duplicate:updated>0,metrics:{added,updated,failed,hotels:Object.keys(REP_STORE).length},warnings:failed?[`${failed} ficheiro(s) não reconhecido(s)`]:[],summary:'Importação de reputação'
    });
  } else if (failed && typeof window.vgDataCenterRecordFailure === 'function') {
    window.vgDataCenterRecordFailure({source:'reputation',fileName:[...files].map(f=>f.name).join(', '),fileSize:[...files].reduce((a,f)=>a+(f.size||0),0),summary:'Nenhum ficheiro de reputação válido',warnings:[`${failed} ficheiro(s) não reconhecido(s)`]});
  }
}

function rtHandleDrop(e) {
  e.preventDefault();
  document.getElementById('rtDropZone').classList.remove('drag-over');
  rtLoadFiles(e.dataTransfer.files);
}

// ── Debug: mostrar texto bruto extraído de um PDF ─────────
async function rtDebugPdf(file) {
  if (!file) return;
  showToast('A extrair texto do PDF...');
  const text = await rtReadPdf(file);
  if (!text) { showToast('Não foi possível extrair texto', true); return; }
  // Mostrar janela modal com o texto e os campos parsed
  const parsed = rtParsePdf(text, file.name);
  const snippet = text.slice(0, 2000).replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const info = `
    <b>Ficheiro:</b> ${file.name}<br>
    <b>reviews:</b> ${parsed.reviews ?? '<span style="color:#e05c5c">null — não encontrado!</span>'}<br>
    <b>reviewsDelta:</b> ${parsed.reviewsDelta ?? '—'}<br>
    <b>gri:</b> ${parsed.gri ?? '—'}<br>
    <b>mgmtResp:</b> ${parsed.mgmtResp ?? '—'}<br>
    <b>week:</b> ${parsed.week}<br><br>
    <b>Texto bruto (primeiros 2000 chars):</b><br>
    <pre style="white-space:pre-wrap;font-size:11px;max-height:300px;overflow:auto;background:rgba(0,0,0,.3);padding:8px;border-radius:4px;margin-top:4px">${snippet}</pre>
  `;
  // Create overlay
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px';
  ov.innerHTML = `<div style="background:#0f1e35;border:1px solid rgba(201,168,76,.3);border-radius:12px;padding:24px;max-width:700px;width:100%;max-height:80vh;overflow:auto;font-size:13px;color:#94a3b8;line-height:1.6">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <span style="color:#c9a84c;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:1.5px">🔍 Debug PDF Parser</span>
      <button onclick="this.closest('[style*=fixed]').remove()" style="background:none;border:none;color:#64748b;cursor:pointer;font-size:18px">✕</button>
    </div>
    ${info}
  </div>`;
  document.body.appendChild(ov);
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
}

// ── PDF reading ───────────────────────────────────────────
async function rtReadPdf(file) {
  return new Promise(resolve => {
    const r = new FileReader();
    r.onload = async e => {
      try {
        const lib = window['pdfjs-dist/build/pdf'];
        if (!lib) { resolve(rtFallback(e.target.result)); return; }
        const pdf = await lib.getDocument({ data: e.target.result }).promise;
        let t = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const pg = await pdf.getPage(i);
          const ct = await pg.getTextContent();
          t += ct.items.map(s=>s.str).join(' ') + '\n';
        }
        resolve(t);
      } catch(err) { resolve(rtFallback(e.target.result)); }
    };
    r.readAsArrayBuffer(file);
  });
}
function rtFallback(ab) {
  const b = new Uint8Array(ab); let t = '';
  for (let i=0;i<b.length;i++) { const c=b[i]; if(c>=32&&c<127)t+=String.fromCharCode(c); else if(c===10||c===13)t+=' '; }
  return t;
}

// ── PDF parser ────────────────────────────────────────────
function rtParsePdf(text, filename) {
  // Hotel name from filename — limpo e alinhado com o mapa de regiões
  let hotel = rtResolveHotelName(filename);

  // Period
  const pM = text.match(/(\d{1,2}\s+\w+\s+\d{4})\s*[-–]\s*(\d{1,2}\s+\w+\s+\d{4})/);
  const period = pM ? pM[0] : null;
  let week = period || 'Sem. desconhecida';
  if (pM) {
    const d1 = pM[1].match(/(\d+)\s+(\w+)\s+(\d{4})/), d2 = pM[2].match(/(\d+)\s+(\w+)/);
    if (d1&&d2) week = `${d1[1]}-${d2[1]} ${d1[2].substring(0,3)} ${d1[3]}`;
  }

  const n = v => v == null ? null : Math.round(parseFloat(v.replace(',','.'))*10)/10;

  // GRI
  const gM = text.match(/GRI[™M]?\s*[\n\r]*\s*(\d{2,3}[.,]\d)%\s*([+\-]\d{1,2}[.,]\d)/);
  const gri = gM ? n(gM[1]) : null;
  const griDelta = gM ? n(gM[2]) : null;
  const gGoal = (text.match(/Goal\s+(\d{2,3}[.,]\d)%/) || [])[1];
  const griGoal = gGoal ? n(gGoal) : null;

  // Reviews — várias variantes do ReviewPro PDF
  // Tenta: "Reviews 123 +45"  |  "Reviews 123"  |  "Total Reviews 123"  |  "Reviews\n123"  |  "123 Reviews"
  const rM = text.match(/(?:Total\s+)?Reviews[\s\n\r:]+(\d+)\s*([+\-]\d+)?/)
           || text.match(/(\d{1,5})\s+Reviews?(?:\s+([+\-]\d+))?/i)
           || text.match(/N[uú]mero\s+de\s+[Rr]eviews[\s\n\r:]+(\d+)\s*([+\-]\d+)?/);
  const reviews = rM ? parseInt(rM[1]) : null;
  const reviewsDelta = (rM && rM[2]) ? parseInt(rM[2]) : null;

  // Depts
  function dept(names) {
    for (const nm of names) {
      const m = text.match(new RegExp(nm+'[^\\d]{0,25}(\\d{2,3}[.,]\\d)%\\s*([+\\-]\\d{1,2}[.,]\\d)','i'));
      if (m) return { val: n(m[1]), delta: n(m[2]) };
    }
    return null;
  }
  const depts = {
    Service:     dept(['Service','Servi']),
    Room:        dept(['Room','Quarto']),
    Cleanliness: dept(['Cleanliness','Limpeza']),
    Value:       dept(['Value','Valor','Custo']),
    Location:    dept(['Location','Localiza']),
  };

  // Mgmt response
  const mgM = (text.match(/Management Response[^%\d]*(\d{1,3}[.,]\d?)%/) || [])[1];
  const mgmtResp = mgM ? n(mgM) : null;

  // Sources
  const srcMap = {};
  const sRx = /(Booking\.com|Google|Tripadvisor|Expedia|Agoda|Holidaycheck)\s+(\d{1,3}[.,]\d)%/gi;
  let sm;
  while ((sm = sRx.exec(text)) !== null) {
    const v = n(sm[2]);
    if (!srcMap[sm[1]] && v > 0) srcMap[sm[1]] = { name: sm[1], score: v };
  }

  // CQI
  const cqiM = (text.match(/CQI[™M]?[^%\d]*(\d{2,3}[.,]\d)%/) || [])[1];
  const cqi = cqiM ? n(cqiM) : null;

  // Rank VG
  const rkM = text.match(/Vila Galé\s+(\d+)\s*\/\s*(\d+)/);
  const rankVG = rkM ? `${rkM[1]}/${rkM[2]}` : null;

  // ── Structured neg/pos categories from page 5 ─────────
  // Format: "Category Name  N  +N  -X.X  -X.X  TopConcept"
  const negCats = [], posCats = [];

  // Extract the negative categories block
  const negBlock = text.match(/Negativamente[\s\S]{0,120}?GRI[™\w]*\s*Impact([\s\S]{0,800}?)(?=Categorias que Afet[ae]m Positivamente|Tendências|Trending|Glossário)/i);
  if (negBlock) {
    // Known category patterns (Portuguese ReviewPro labels)
    const CAT_PATTERNS = [
      'Alimentos e restaura[çc][aã]o','Instala[çc][oõ][eê]s','Estabelecimento',
      'Ambiente e decora[çc][aã]o','Caf[eé] da manh[aã]','Servi[çc]o','Quarto',
      'Limpeza','Localiza[çc][aã]o','Valor','Piscina','Bar e bebidas','Pessoal',
      'Spa','Entretenimento','Transporte','Wi[- ]?Fi','Estacionamento'
    ];
    const block = negBlock[1];
    CAT_PATTERNS.forEach(pat => {
      const m = block.match(new RegExp(pat + '[\\s\\S]{0,5}?(\\d+)[\\s\\S]{0,30}?(-[\\d.]+)', 'i'));
      if (m) {
        const catName = block.match(new RegExp(pat, 'i'))?.[0] || pat;
        negCats.push({ cat: catName, mentions: parseInt(m[1]), impact: parseFloat(m[2]) });
      }
    });
    // Fallback: extract top concepts as simple strings if structured parse failed
    if (!negCats.length) {
      block.match(/\b[a-záàãâéêíóôõúçü]{4,20}\b/gi)?.slice(0,5).forEach(w => negCats.push({ cat: w, mentions: 1, impact: 0 }));
    }
  }

  const posBlock = text.match(/Positivamente[\s\S]{0,120}?GRI[™\w]*\s*Impact([\s\S]{0,800}?)(?=Tendências|Trending|Glossário)/i);
  if (posBlock) {
    const CAT_POS = [
      'Piscina e praia','Bar e bebidas','Limpeza','Pessoal','Caf[eé] da manh[aã]',
      'Servi[çc]o','Quarto','Localiza[çc][aã]o','Valor','Spa','Jardim','Vista'
    ];
    const block = posBlock[1];
    CAT_POS.forEach(pat => {
      const m = block.match(new RegExp(pat + '[\\s\\S]{0,5}?(\\d+)[\\s\\S]{0,30}?([+][\\d.]+)', 'i'));
      if (m) {
        const catName = block.match(new RegExp(pat, 'i'))?.[0] || pat;
        posCats.push({ cat: catName, mentions: parseInt(m[1]), impact: parseFloat(m[2]) });
      }
    });
    if (!posCats.length) {
      block.match(/\b[a-záàãâéêíóôõúçü]{4,20}\b/gi)?.slice(0,5).forEach(w => posCats.push({ cat: w, mentions: 1, impact: 0 }));
    }
  }

  return { hotel, week, period, gri, griDelta, griGoal, reviews, reviewsDelta,
           depts, mgmtResp, srcList: Object.values(srcMap), cqi, rankVG, negCats, posCats };
}

// ── Pills ─────────────────────────────────────────────────
function rtBuildPills() {
  const keys = rtKeysForRegion(activeRegion);
  const wrap = document.getElementById('rtFilterWrap');
  const pills = document.getElementById('rtPills');
  wrap.style.display = Object.keys(REP_STORE).length ? 'block' : 'none';
  if (!keys.length) {
    pills.innerHTML = `<div class="rt-filter-empty">Sem hotéis carregados para a região selecionada.</div>`;
    return;
  }
  const allOn = keys.every(k => rtSelected.has(k));
  pills.innerHTML =
    `<span class="rt-pill rt-pill-all ${allOn?'on':''}" onclick="rtToggleAll(this)">Todos (${keys.length})</span>` +
    keys.map(k => {
      const nm = REP_STORE[k][0]?.hotel || k;
      const weeks = REP_STORE[k]?.length || 0;
      return `<span class="rt-pill ${rtSelected.has(k)?'on':''}" data-key="${rtEscape(k)}" onclick="rtTogglePill(this)">${rtEscape(nm)}${weeks>1?` · ${weeks} sem.`:''}</span>`;
    }).join('');
}

function rtToggleAll(el) {
  const keys = rtKeysForRegion(activeRegion);
  const allOn = keys.length && keys.every(k => rtSelected.has(k));
  if (allOn) {
    // Nunca deixa a análise completamente vazia: mantém o primeiro hotel visível.
    keys.slice(1).forEach(k => rtSelected.delete(k));
  } else {
    keys.forEach(k => rtSelected.add(k));
  }
  rtRender();
}
function rtTogglePill(el) {
  const k = el.dataset.key;
  const visibleSelected = rtKeysForRegion(activeRegion).filter(x => rtSelected.has(x));
  if (rtSelected.has(k)) { if (visibleSelected.length > 1) rtSelected.delete(k); }
  else rtSelected.add(k);
  rtRender();
}
function rtRemove(key, week) {
  if (!REP_STORE[key]) return;
  REP_STORE[key] = REP_STORE[key].filter(e => e.week !== week);
  if (!REP_STORE[key].length) { delete REP_STORE[key]; rtSelected.delete(key); }
  rtRender();
}

// ── Helpers ───────────────────────────────────────────────
// ── Week date comparator ──────────────────────────────────
// Parses "9-15 Feb 2026", "30-5 Mar 2026", "25 Jan-1 Feb 2026" etc.
// Returns a Date from the start day for chronological sorting.
const MONTH_MAP = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11,
                   fev:1,abr:3,mai:4,jun:5,jul:6,ago:7,set:8,out:9,dez:11};
function rtWeekToDate(w) {
  if (!w) return new Date(0);
  // "9-15 Feb 2026" → day=9, month=Feb, year=2026
  const m = w.match(/^(\d{1,2})[\s\-].*?(\w{3})\s+(\d{4})$/);
  if (m) {
    const mo = MONTH_MAP[m[2].toLowerCase()];
    if (mo !== undefined) return new Date(parseInt(m[3]), mo, parseInt(m[1]));
  }
  return new Date(0);
}
function rtCmpWeek(a, b) { return rtWeekToDate(a) - rtWeekToDate(b); }

const rtLatest = k => REP_STORE[k]?.length ? [...REP_STORE[k]].sort((a,b)=>rtCmpWeek(a.week,b.week)).slice(-1)[0] : null;
const rtSelKeys = () => {
  const regionKeys = new Set(rtKeysForRegion(activeRegion));
  return [...rtSelected].filter(k => REP_STORE[k] && regionKeys.has(k));
};
const gClass = v => v >= 90 ? 'c-good' : v >= 80 ? 'c-mid' : 'c-bad';
const fillClass = v => v >= 90 ? 'fill-g' : v >= 80 ? 'fill-m' : 'fill-b';
const fmt2 = v => v != null ? (v >= 0 ? '+' : '') + v : '—';

// ── KPIs ──────────────────────────────────────────────────
function rtBuildKPIs() {
  const sel = rtSelKeys();
  const lats = sel.map(rtLatest).filter(h => h?.gri != null);
  if (!lats.length) {
    const kpis = document.getElementById('rtKpis');
    kpis.style.display = 'grid';
    kpis.innerHTML = `<div class="rt-empty-inline">Sem dados de reputação para a região/filtro selecionado.</div>`;
    return;
  }
  const avg = (lats.reduce((a,h)=>a+h.gri,0)/lats.length).toFixed(1);
  const best  = [...lats].sort((a,b)=>b.gri-a.gri)[0];
  const worst = [...lats].sort((a,b)=>a.gri-b.gri)[0];
  const aboveGoal = lats.filter(h=>h.griGoal!=null&&h.gri>=h.griGoal).length;
  const totalRev  = lats.reduce((a,h)=>a+(h.reviews||0),0);
  const kpis = document.getElementById('rtKpis');
  kpis.style.display = 'grid';
  kpis.innerHTML = [
    { l:'GRI™ Médio', v:avg+'%', s:`${sel.length} unidades`, c:'' },
    { l:'Melhor GRI™', v:best.gri+'%', s:best.hotel, c:'k-green' },
    { l:'Pior GRI™', v:worst.gri+'%', s:worst.hotel, c:'k-red' },
    { l:'Acima do Goal', v:`${aboveGoal}/${lats.filter(h=>h.griGoal).length}`, s:'unidades', c:'k-blue' },
    { l:'Total Reviews', v:totalRev, s:'semana + recente', c:'' },
  ].map(k=>`<div class="rt-kpi ${k.c}">
    <div class="rt-kpi-lbl">${k.l}</div>
    <div class="rt-kpi-val">${k.v}</div>
    <div class="rt-kpi-sub">${k.s}</div>
  </div>`).join('');
}

// ── Ranking ───────────────────────────────────────────────
function rtBuildRanking() {
  const rows = rtSelKeys().map(k => ({ k, h: rtLatest(k) }))
    .filter(r => r.h?.gri != null).sort((a,b) => b.h.gri - a.h.gri);
  const tbody = document.getElementById('rtRankBody');
  tbody.innerHTML = rows.map(({k,h},i) => {
    const gc = gClass(h.gri); const dc = (h.griDelta||0)>=0?'c-up':'c-dn';
    const goalBadge = h.griGoal
      ? `<span class="delta-badge ${h.gri>=h.griGoal?'pos':'neg'}">${h.griGoal}% ${h.gri>=h.griGoal?'✓':'✗'}</span>` : '—';
    const d = h.depts; const wks = REP_STORE[k]?.length||1;
    return `<tr>
      <td style="text-align:left;font-weight:900;color:var(--rep-gold)">${i+1}</td>
      <td style="text-align:left">${h.hotel}${wks>1?` <span style="font-size:10px;color:var(--rep-muted)">(${wks} sem.)</span>`:''}</td>
      <td style="text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--rep-muted)">${h.week}</td>
      <td class="${gc}" style="font-family:var(--font-mono);font-weight:800">${h.gri}%</td>
      <td class="${dc}" style="font-family:var(--font-mono)">${h.griDelta!=null?fmt2(h.griDelta)+'%':'—'}</td>
      <td>${goalBadge}</td>
      <td style="font-family:var(--font-mono)">${h.reviews??'—'}</td>
      <td style="font-family:var(--font-mono)">${h.mgmtResp!=null?h.mgmtResp+'%':'—'}</td>
      <td style="font-family:var(--font-mono)">${d.Service?.val!=null?d.Service.val+'%':'—'}</td>
      <td style="font-family:var(--font-mono)">${d.Room?.val!=null?d.Room.val+'%':'—'}</td>
      <td style="font-family:var(--font-mono)">${d.Cleanliness?.val!=null?d.Cleanliness.val+'%':'—'}</td>
      <td style="font-family:var(--font-mono)">${d.Value?.val!=null?d.Value.val+'%':'—'}</td>
      <td style="font-family:var(--font-mono);color:var(--rep-gold)">${h.cqi!=null?h.cqi+'%':'—'}</td>
      <td style="font-family:var(--font-mono)">${h.rankVG||'—'}</td>
    </tr>`;
  }).join('');
}

// ── Card selector ─────────────────────────────────────────
function rtBuildSelectors() {
  const hotelSel = document.getElementById('rtSelHotel');
  const weekSel  = document.getElementById('rtSelWeek');
  const selKeys  = rtSelKeys();

  // Hotels: one option per unique hotel (not key)
  const hotels = selKeys.map(k => ({ k, nm: REP_STORE[k][0]?.hotel || k }));
  hotelSel.innerHTML = hotels.map(h => `<option value="${rtEscape(h.k)}" selected>${rtEscape(h.nm)}</option>`).join('');

  // Weeks: union of all weeks across selected hotels, sorted descending (latest first)
  const weeks = [...new Set(selKeys.flatMap(k => REP_STORE[k].map(e=>e.week)))].sort(rtCmpWeek).reverse();
  weekSel.innerHTML = weeks.map(w => `<option value="${rtEscape(w)}" selected>${rtEscape(w)}</option>`).join('');
  rtUpdateFilterSummary();
}

function rtUpdateFilterSummary() {
  const paint = (selId, sumId, label) => {
    const sel = document.getElementById(selId);
    const box = document.getElementById(sumId);
    if (!sel || !box) return;
    const total = sel.options.length;
    const selected = [...sel.selectedOptions].map(o => o.textContent.trim()).filter(Boolean);
    if (!total) { box.innerHTML = `<span>0</span> ${label}`; return; }
    const preview = selected.slice(0, 4).map(rtEscape).join(' · ');
    const extra = selected.length > 4 ? ` · +${selected.length - 4}` : '';
    box.innerHTML = `<span>${selected.length}/${total}</span> ${label} selecionado(s)${selected.length ? `: ${preview}${extra}` : ''}`;
  };
  paint('rtSelHotel', 'rtSelHotelSummary', 'hotel');
  paint('rtSelWeek', 'rtSelWeekSummary', 'semana');
}

function rtApplyCardFilter() {
  const selH = [...document.getElementById('rtSelHotel').selectedOptions].map(o=>o.value);
  const selW = [...document.getElementById('rtSelWeek').selectedOptions].map(o=>o.value);
  rtBuildCardGrid(selH, selW);
  rtUpdateFilterSummary();
}

function rtSelectAllCards() {
  [...document.getElementById('rtSelHotel').options].forEach(o => o.selected = true);
  [...document.getElementById('rtSelWeek').options].forEach(o => o.selected = true);
  rtApplyCardFilter();
}

function rtBuildCardGrid(filterKeys, filterWeeks) {
  const grid = document.getElementById('rtCards');
  grid.innerHTML = '';
  const keys = filterKeys || rtSelKeys();
  const weeks = filterWeeks || null;
  if (!keys.length) {
    grid.innerHTML = `<div class="rt-empty-inline">Não existem unidades para mostrar com o filtro atual.</div>`;
    return;
  }
  let rendered = 0;

  keys.forEach(k => {
    const entries = (REP_STORE[k] || []).filter(e => !weeks || weeks.includes(e.week));
    entries.forEach(h => {
      const gc = gClass(h.gri||0); const dc = (h.griDelta||0)>=0?'c-up':'c-dn';
      const goalBadge = h.griGoal
        ? `<span style="font-size:10px;font-weight:700;color:${h.gri>=h.griGoal?'var(--rep-green)':'var(--rep-red)'}">${h.gri>=h.griGoal?'✓':'✗'} Goal ${h.griGoal}%</span>` : '';

      const dOrder = [{k:'Service',l:'Serviço'},{k:'Room',l:'Quarto'},{k:'Cleanliness',l:'Limpeza'},{k:'Value',l:'Valor'},{k:'Location',l:'Localiz.'}];
      const depHtml = dOrder.map(({k:dk,l}) => {
        const d = h.depts[dk]; if(!d) return '';
        const fc = fillClass(d.val);
        const ds = d.delta!=null ? `<span class="${d.delta>=0?'c-up':'c-dn'}">${d.delta>=0?'▲':'▼'}${Math.abs(d.delta)}</span>` : '';
        return `<div class="rt-dept-row">
          <div class="rt-dept-nm">${l}</div>
          <div class="rt-dept-bar"><div class="rt-dept-fill ${fc}" style="width:${d.val}%"></div></div>
          <div class="rt-dept-val">${d.val}%</div>
          <div class="rt-dept-d">${ds}</div>
        </div>`;
      }).join('');

      const srcHtml = h.srcList?.length ? `<div class="rt-sources">
        <div class="rt-src-lbl">Fontes</div>
        ${h.srcList.slice(0,4).map(s=>`<div class="rt-src-row"><span>${s.name}</span><span class="${gClass(s.score)}">${s.score}%</span></div>`).join('')}
      </div>` : '';

      const tagsHtml = (h.negCats?.length||h.posCats?.length) ? `<div class="rt-tags">
        ${h.negCats?.length?`<div class="rt-tag-lbl" style="margin-bottom:3px">⬇ Impacto negativo</div>${h.negCats.map(t=>`<span class="rt-tag t-neg">${t.cat||t}</span>`).join('')}`:'' }
        ${h.posCats?.length?`<div class="rt-tag-lbl" style="margin-top:8px;margin-bottom:3px">⬆ Impacto positivo</div>${h.posCats.map(t=>`<span class="rt-tag t-pos">${t.cat||t}</span>`).join('')}`:''}
      </div>` : '';

      const card = document.createElement('div');
      card.className = 'rt-card';
      card.innerHTML = `
        <button class="rt-del" onclick="rtRemove('${k}','${h.week}')" title="Remover">✕</button>
        <div class="rt-card-head">
          <div>
            <div class="rt-hotel-name">${h.hotel}</div>
            <div class="rt-week-tag">📅 ${h.week}</div>
            <div style="margin-top:6px">${goalBadge}</div>
          </div>
          <div style="text-align:right">
            <div class="rt-gri ${gc}">${h.gri!=null?h.gri+'%':'—'}</div>
            <div class="rt-gri-d ${dc}">${h.griDelta!=null?(h.griDelta>=0?'▲':'▼')+Math.abs(h.griDelta)+'%':''}</div>
          </div>
        </div>
        <div class="rt-card-body">
          <div class="rt-chips">
            ${h.reviews!=null?`<div class="rt-chip">Reviews <b>${h.reviews}${h.reviewsDelta!=null?` (${h.reviewsDelta>=0?'+':''}${h.reviewsDelta})`:''}</b></div>`:''}
            ${h.mgmtResp!=null?`<div class="rt-chip">Resposta <b>${h.mgmtResp}%</b></div>`:''}
            ${h.cqi!=null?`<div class="rt-chip">CQI™ <b>${h.cqi}%</b></div>`:''}
            ${h.rankVG?`<div class="rt-chip">Rank VG <b>${h.rankVG}</b></div>`:''}
          </div>
          ${depHtml}
          ${srcHtml}
          ${tagsHtml}
        </div>`;
      grid.appendChild(card);
      rendered++;
    });
  });
  if (!rendered) grid.innerHTML = `<div class="rt-empty-inline">Não existem semanas para mostrar com o filtro atual.</div>`;
}

const RT_PAL = ['#f59e0b','#3b82f6','#10b981','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16','#ec4899','#64748b'];
const RT_CD = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color:'#94a3b8', font:{ family:'DM Mono', size:11 }, padding:10 } },
    tooltip: {
      backgroundColor:'#1e293b', borderColor:'rgba(245,158,11,.3)', borderWidth:1,
      titleColor:'#f1f5f9', bodyColor:'#94a3b8', padding:10, cornerRadius:8,
      callbacks: {
        title: function(items) {
          // Always show the full label from the chart's stored fullLabels if available
          const chart = items[0]?.chart;
          const idx = items[0]?.dataIndex;
          if (chart?._fullLabels && chart._fullLabels[idx]) return chart._fullLabels[idx];
          return items[0]?.label || '';
        }
      }
    }
  },
  scales: {
    x: {
      ticks:{
        color:'#64748b', font:{size:10},
        maxRotation: 35, minRotation: 20,
        autoSkip: false,
        callback: function(val, idx) {
          // Use full label stored on chart, wrap at ~16 chars
          const lbl = this.chart._fullLabels?.[idx] || this.getLabelForValue(val);
          if (lbl.length <= 16) return lbl;
          // Break into two lines at a space near the middle
          const mid = Math.floor(lbl.length / 2);
          let sp = lbl.lastIndexOf(' ', mid + 6);
          if (sp < 4) sp = lbl.indexOf(' ', mid - 6);
          if (sp < 0) return lbl;
          return [lbl.substring(0, sp), lbl.substring(sp + 1)];
        }
      },
      grid:{ color:'rgba(255,255,255,.05)' }
    },
    y: { ticks:{ color:'#64748b', font:{size:10} }, grid:{ color:'rgba(255,255,255,.07)' } }
  }
};
function rtDC(id, type, labels, datasets, opts={}, fullLabels=null) {
  if (rtCharts[id]) { rtCharts[id].destroy(); delete rtCharts[id]; }
  const ctx = document.getElementById(id); if (!ctx) return;
  const cfg = JSON.parse(JSON.stringify(RT_CD));
  // Re-attach callbacks (lost in JSON.parse/stringify)
  cfg.plugins.tooltip.callbacks = RT_CD.plugins.tooltip.callbacks;
  cfg.scales.x.ticks.callback = RT_CD.scales.x.ticks.callback;
  if (opts.scales) Object.keys(opts.scales).forEach(k => { cfg.scales[k] = Object.assign(cfg.scales[k]||{}, opts.scales[k]); });
  if (opts.plugins) Object.keys(opts.plugins).forEach(k => { cfg.plugins[k] = Object.assign(cfg.plugins[k]||{}, opts.plugins[k]); });
  if (opts.indexAxis) cfg.indexAxis = opts.indexAxis;
  if (opts.cutout) cfg.cutout = opts.cutout;
  const chart = new Chart(ctx, { type, data:{ labels, datasets }, options: cfg });
  // Store full labels on the chart instance for tooltip/tick callbacks
  chart._fullLabels = fullLabels || labels;
  rtCharts[id] = chart;
}

function rtBuildCharts() {
  const sel = rtSelKeys();
  if (!sel.length) { document.getElementById('rtChartsWrap').style.display='none'; return; }
  document.getElementById('rtChartsWrap').style.display = 'block';
  const lats = sel.map(rtLatest).filter(Boolean);
  const fullNames = lats.map(h => h.hotel);
  const lbls = fullNames; // no truncation — callback handles wrapping

  // 1. GRI bar
  const gris = lats.map(h=>h.gri);
  rtDC('rtChartGRI','bar',lbls,[
    { label:'GRI™ %', data:gris,
      backgroundColor: gris.map(v=>v>=90?'rgba(16,185,129,.75)':v>=80?'rgba(245,158,11,.75)':'rgba(239,68,68,.75)'),
      borderColor:     gris.map(v=>v>=90?'#10b981':v>=80?'#f59e0b':'#ef4444'),
      borderWidth:1.5, borderRadius:6 },
    { label:'Goal', data:lats.map(h=>h.griGoal||null),
      type:'line', borderColor:'rgba(255,255,255,.35)', borderDash:[5,4],
      pointRadius:4, pointBackgroundColor:'rgba(255,255,255,.5)', borderWidth:1.5,
      backgroundColor:'transparent' }
  ],{ plugins:{legend:{position:'top'}}, scales:{y:{min:55,max:100,ticks:{callback:v=>v+'%'}}} }, fullNames);

  // 2. Depts grouped bar — legend = hotel names (full)
  const dKeys = ['Service','Room','Cleanliness','Value','Location'];
  const dLabels = ['Serviço','Quarto','Limpeza','Valor','Localização'];
  rtDC('rtChartDepts','bar',dLabels,
    lats.map((h,i)=>({
      label: h.hotel,
      data: dKeys.map(k=>h.depts[k]?.val??null),
      backgroundColor: RT_PAL[i%RT_PAL.length]+'88',
      borderColor: RT_PAL[i%RT_PAL.length], borderWidth:1.5, borderRadius:4
    })),
    { plugins:{legend:{position:'right',labels:{padding:6,font:{size:10}}}}, scales:{y:{min:50,ticks:{callback:v=>v+'%'}}} }
  );

  // 3. Reviews + resp rate
  rtDC('rtChartReviews','bar',lbls,[
    { label:'Reviews', data:lats.map(h=>h.reviews||0),
      backgroundColor:'rgba(59,130,246,.6)', borderColor:'#3b82f6', borderWidth:1.5, borderRadius:5, yAxisID:'y' },
    { label:'Resp.%', data:lats.map(h=>h.mgmtResp||null),
      type:'line', borderColor:'#10b981', backgroundColor:'rgba(16,185,129,.1)',
      pointRadius:5, pointBackgroundColor:'#10b981', borderWidth:2, fill:true, yAxisID:'y2' }
  ],{
    plugins:{legend:{position:'top'}},
    scales:{
      y:  { position:'left', grid:{color:'rgba(255,255,255,.05)'}, ticks:{color:'#64748b',font:{size:10}} },
      y2: { position:'right', min:0, max:100, ticks:{callback:v=>v+'%',color:'#64748b',font:{size:10}}, grid:{display:false} }
    }
  }, fullNames);

  // 4. Sources
  const srcNames = ['Booking.com','Google','Tripadvisor'];
  const srcColors = [['rgba(0,112,243,.7)','#0070f3'],['rgba(234,67,53,.7)','#ea4335'],['rgba(0,167,157,.7)','#00a79d']];
  rtDC('rtChartSources','bar',lbls,
    srcNames.map((nm,i)=>({
      label:nm,
      data:lats.map(h=>h.srcList?.find(s=>s.name===nm)?.score??null),
      backgroundColor:srcColors[i][0], borderColor:srcColors[i][1], borderWidth:1.5, borderRadius:4
    })),
    { plugins:{legend:{position:'top'}}, scales:{y:{min:50,ticks:{callback:v=>v+'%'}}} }, fullNames
  );

  // 5. Evolution (line)
  const allWeeks = [...new Set(sel.flatMap(k=>REP_STORE[k].map(e=>e.week)))].sort(rtCmpWeek);
  if (allWeeks.length > 1) {
    rtDC('rtChartEvo','line',allWeeks,
      sel.map((k,i)=>({
        label: REP_STORE[k][0]?.hotel||k,
        data: allWeeks.map(w=>REP_STORE[k].find(e=>e.week===w)?.gri??null),
        borderColor: RT_PAL[i%RT_PAL.length],
        backgroundColor: RT_PAL[i%RT_PAL.length]+'18',
        tension:.35, borderWidth:2.5, pointRadius:5,
        pointBackgroundColor: RT_PAL[i%RT_PAL.length], fill:false, spanGaps:true
      })),
      { plugins:{legend:{position:'right',labels:{padding:6}}}, scales:{y:{min:55,ticks:{callback:v=>v+'%'}}} }
    );
  } else {
    if (rtCharts['rtChartEvo']) { rtCharts['rtChartEvo'].destroy(); delete rtCharts['rtChartEvo']; }
    const ctx = document.getElementById('rtChartEvo');
    if (ctx) {
      const ct = ctx.getContext('2d');
      ct.clearRect(0,0,ctx.width,ctx.height);
      ct.fillStyle='#64748b'; ct.font='12px Syne,sans-serif'; ct.textAlign='center';
      ct.fillText('Carregue múltiplas semanas do mesmo hotel para ver a evolução temporal', ctx.width/2, 80);
    }
  }
}

// ── Main render ───────────────────────────────────────────
function rtRender() {
  const hasData = Object.keys(REP_STORE).length > 0;
  document.getElementById('rtEmpty').style.display = hasData ? 'none' : 'block';
  document.getElementById('rtRankWrap').style.display = hasData ? 'block' : 'none';
  document.getElementById('rtCardControls').style.display = hasData ? 'block' : 'none';
  document.getElementById('rtKpis').style.display = hasData ? 'grid' : 'none';
  if (!hasData) {
    document.getElementById('rtChartsWrap').style.display = 'none';
    document.getElementById('rtFilterWrap').style.display = 'none';
    Object.values(rtCharts).forEach(c=>c.destroy()); rtCharts={};
    return;
  }
  rtBuildPills();
  rtBuildKPIs();
  rtBuildRanking();
  rtBuildSelectors();
  rtBuildCardGrid();
  rtBuildCharts();
}

// ── Load PDF.js ───────────────────────────────────────────
(function loadPdfJs() {
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  s.onload = () => {
    window['pdfjs-dist/build/pdf'].GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  };
  document.head.appendChild(s);
})();




// ── Theme switcher ────────────────────────────────────────
function setTheme(name) {
  document.body.className = document.body.className
    .replace(/\btheme-\w+/g, '').trim();
  if (name !== 'blue') document.body.classList.add('theme-' + name);
  // Update active button state
  document.querySelectorAll('.theme-dot').forEach(btn => {
    btn.classList.toggle('active', btn.classList.contains('td-' + name));
  });
  // Update header gradient
  const gradients = {
    blue:     'linear-gradient(135deg,#0a1628 0%,#0f2040 50%,#0a1628 100%)',
    erp:      'linear-gradient(135deg,#f5eded 0%,#ffffff 50%,#f5eded 100%)',
    vilagale: 'linear-gradient(135deg,#d8f0ee 0%,#eef8f7 50%,#d8f0ee 100%)',
  };
  const header = document.querySelector('.header') || document.querySelector('.topbar');
  if (header) header.style.background = gradients[name] || gradients.blue;
  // Persist preference
  try { localStorage.setItem('vg_theme', name); } catch(e) {}
}

// Restore saved theme on load
(function() {
  try {
    const saved = localStorage.getItem('vg_theme');
    if (saved && saved !== 'blue') setTheme(saved);
  } catch(e) {}
})();

