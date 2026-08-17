
// ==========================================================
// (dados dos meses vêm da sessão gravada — sem dados embutidos no código)
// ============<script>
// ======================================

const STORE = {};
// STORE_ACUM: valores oficiais ACUMULADOS por mês de referência (jan→mês),
// carregados a partir do P&L acumulado. Usados nas colunas acumuladas da Ficha
// em vez de somar meses — garante que GOP com sede / ADR / ADR NET batem com o P&L.
const STORE_ACUM = {};

// Nota: os dados dos meses deixaram de estar embutidos no código.
// Todo o STORE vem agora da sessão gravada (Blobs/ficheiro), mantendo o código limpo.

// ── Globais de ano ── derivados do STORE, actualizados ao carregar dados ──
let YR_CUR  = '2026';
let YR_PREV = '2025';

function updateYearGlobals() {
  var months = Object.keys(STORE).map(Number).sort(function(a,b){return b-a;});
  for (var _m = 0; _m < months.length; _m++) {
    var d = STORE[months[_m]];
    if (d && d.yr_cur && d.yr_prev) {
      YR_CUR  = String(d.yr_cur);
      // Só actualiza YR_PREV automaticamente se ainda não foi escolhido manualmente
      if (!window._yrPrevManual) YR_PREV = String(d.yr_prev);
      break;
    }
  }
  var pill = document.getElementById('topbarComparativo');
  if (pill) pill.innerHTML = 'Comparativo <strong>' + YR_PREV + ' vs ' + YR_CUR + '</strong>';
  rebuildYearButtons();
  updateYrPrevSelector();
  refreshDynamicYearText();
}

function refreshDynamicYearText() {
  // Converte apenas rótulos estáticos originalmente desenhados para 2025/2026/2027.
  // Não toca em inputs/textarea nem em dados importados. Cada nó guarda o texto-base
  // para permitir trocar de anos várias vezes sem substituições em cascata.
  try {
    const prev = String(YR_PREV), cur = String(YR_CUR);
    const next = /^\d{4}$/.test(cur) ? String(Number(cur) + 1) : cur;
    const root = document.querySelector('main');
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || parent.closest('script,style,textarea,input,select,option,#view-agenda,#view-orcamento,[contenteditable=\"true\"]')) continue;
      if (!node.nodeValue || !/(2025|2026|2027)/.test(node.nodeValue)) continue;
      if (node._vgYearTemplate == null) node._vgYearTemplate = node.nodeValue;
      node.nodeValue = String(node._vgYearTemplate)
        .replace(/2025/g, '__VG_PREV__')
        .replace(/2026/g, '__VG_CUR__')
        .replace(/2027/g, '__VG_NEXT__')
        .replace(/__VG_PREV__/g, prev)
        .replace(/__VG_CUR__/g, cur)
        .replace(/__VG_NEXT__/g, next);
    }
  } catch(e) { console.warn('Ano dinâmico: não foi possível atualizar alguns rótulos', e); }
}

// Detecta todos os anos disponíveis nos dados carregados
function getAvailableYears() {
  const years = new Set();
  Object.values(STORE).forEach(d => {
    if (!d || !d.hotels_costs) return;
    Object.values(d.hotels_costs).forEach(h => {
      Object.values(h).forEach(rubrica => {
        if (rubrica && typeof rubrica === 'object') {
          Object.keys(rubrica).forEach(y => { if (/^\d{4}$/.test(y)) years.add(y); });
        }
      });
    });
  });
  return [...years].sort();
}

function updateYrPrevSelector() {
  const sel = document.getElementById('yrPrevSel');
  const pill = document.getElementById('topbarComparativo');
  if (!sel) return;
  const allYears = getAvailableYears();
  // Anos anteriores ao YR_CUR
  const prevYears = allYears.filter(y => y < YR_CUR).sort().reverse();
  if (prevYears.length <= 1) {
    // Só um ano anterior — selector desnecessário
    sel.style.display = 'none';
    if (pill) pill.innerHTML = 'Comparativo <strong>' + YR_PREV + ' vs ' + YR_CUR + '</strong>';
  } else {
    // Múltiplos anos anteriores — mostra selector
    sel.style.display = 'inline-block';
    sel.innerHTML = prevYears.map(y =>
      `<option value="${y}" ${y === YR_PREV ? 'selected' : ''}>${y}</option>`
    ).join('');
    if (pill) pill.innerHTML = 'Comparativo <strong>' + YR_CUR + '</strong> vs';
  }
}

function yrPrevChange(val) {
  if (!val) return;
  YR_PREV = String(val);
  window._yrPrevManual = true; // marca que o utilizador escolheu manualmente
  rebuildYearButtons();
  refreshAll();
  showToast('A comparar ' + YR_CUR + ' com ' + YR_PREV);
}

function rebuildYearButtons() {
  var container = document.getElementById('yearBtns');
  if (!container) return;
  container.innerHTML = ['both', YR_PREV, YR_CUR].map(function(v, i) {
    var lbl = ['Ambos', YR_PREV, YR_CUR][i];
    return '<button onclick="setYear(\'' + v + '\')" class="' + (currentYear===v ? 'sb-year-btn active' : 'sb-year-btn') + '">' + lbl + '</button>';
  }).join('');
}

// ==========================================================
// STATE
// ==========================================================
let RAW = null;          // merged dataset (built from selectedMeses)
let selectedMeses = new Set(); // which months are active
let selectedHotels = new Set();
let currentView = 'resumo';
let currentYear = 'both';
let sortCol = 1, sortDir = 1;
let charts = {};

// ==========================================================
// EXCEL PARSER
// ==========================================================
async function loadExcel(event) {
  const file = event.target.files[0];
  if (!file) return;
  event.target.value = ''; // reset so same file can be reloaded
  window._yrPrevManual = false; // reset manual year selection on new data load

  document.getElementById('importStatus').textContent = 'A preparar leitura Excel…';
  try { if(window.VG?.performance?.ensureXLSX) await window.VG.performance.ensureXLSX(); }
  catch(err) { showToast('Não foi possível carregar a biblioteca Excel: '+(err.message||err), true); document.getElementById('importStatus').textContent='Erro ao carregar Excel'; return; }
  document.getElementById('importStatus').textContent = 'A ler ficheiro…';

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      // Guarda o workbook e pergunta primeiro o TIPO (mês ou acumulado).
      // O utilizador é quem indica o mês — nada é adivinhado do ficheiro.
      window._pnlWb = wb;
      window._pnlFileName = file.name;
      document.getElementById('importStatus').textContent = '';
      pnlAskTipo();
    } catch(err) {
      console.error('Erro a ler ficheiro:', err);
      showToast('Erro: ' + (err.message || 'ficheiro inválido') + '. Confirme que é o ficheiro P&L correcto.', true);
      document.getElementById('importStatus').textContent = 'Erro: ' + (err.message || '').slice(0, 60);
    }
  };
  reader.readAsArrayBuffer(file);
}

const PNL_MESES = {1:'Janeiro',2:'Fevereiro',3:'Março',4:'Abril',5:'Maio',6:'Junho',7:'Julho',8:'Agosto',9:'Setembro',10:'Outubro',11:'Novembro',12:'Dezembro'};

// PASSO 1 — perguntar se é P&L do mês ou acumulado do ano
function pnlAskTipo(){
  const modal = document.getElementById('pnlTipoModal');
  if (modal) modal.style.display = 'flex';
}
function pnlCancelTipo(){
  const modal = document.getElementById('pnlTipoModal');
  if (modal) modal.style.display = 'none';
  window._pnlWb = null; window._pnlFileName = null;
  document.getElementById('importStatus').textContent = '';
}
function pnlConfirmarTipo(tipo){
  document.getElementById('pnlTipoModal').style.display = 'none';
  window._pnlTipo = tipo; // 'mes' | 'acumulado'
  // PASSO 2 — perguntar o mês (ou até que mês, se acumulado)
  pnlAskMonth(tipo);
}

// PASSO 2 — perguntar o mês
function pnlAskMonth(tipo){
  const modal = document.getElementById('pnlMonthModal');
  if (!modal) return;
  const titulo = document.getElementById('pnlMonthTitulo');
  const ajuda  = document.getElementById('pnlMonthAjuda');
  if (tipo === 'acumulado') {
    if (titulo) titulo.textContent = 'Acumulado até que mês?';
    if (ajuda)  ajuda.textContent  = 'Indica o último mês incluído no acumulado (ex.: se é de janeiro a julho, escolhe Julho).';
  } else {
    if (titulo) titulo.textContent = 'A que mês corresponde este P&L?';
    if (ajuda)  ajuda.textContent  = 'Escolhe o mês a que corresponde este ficheiro.';
  }
  modal.style.display = 'flex';
}
function pnlCancelMonth(){
  const modal = document.getElementById('pnlMonthModal');
  if (modal) modal.style.display = 'none';
  window._pnlWb = null; window._pnlFileName = null; window._pnlTipo = null;
  document.getElementById('importStatus').textContent = '';
}
function pnlConfirmMonth(){
  const sel = document.getElementById('pnlMonthSel');
  const mes = sel ? Number(sel.value) : 0;
  const modal = document.getElementById('pnlMonthModal');
  if (modal) modal.style.display = 'none';
  const wb = window._pnlWb, fileName = window._pnlFileName, tipo = window._pnlTipo;
  if (!wb || !mes) { pnlCancelMonth(); return; }
  document.getElementById('importStatus').textContent = 'A processar…';
  try {
    const data = parseWorkbook(wb, mes); // o mês é SEMPRE o que o utilizador indicou
    window._pnlWb = null; window._pnlTipo = null;
    if (!data || data.__needMonth) {
      showToast('Não foi possível ler o ficheiro. Confirme que é o P&L correcto (folha "MAPA RESUMO").', true);
      document.getElementById('importStatus').textContent = '';
      return;
    }
    pnlAplicar(data, fileName, tipo);
  } catch(err) {
    console.error('Erro parseWorkbook:', err);
    showToast('Erro ao processar: ' + (err.message || 'ficheiro inválido'), true);
    document.getElementById('importStatus').textContent = '';
    if (typeof window.vgDataCenterRecordFailure === 'function') window.vgDataCenterRecordFailure({
      source: tipo === 'acumulado' ? 'pnl_accum' : 'pnl_month', fileName, scope:mes ? (PNL_MESES[mes]||String(mes)) : '', summary:err.message||'Ficheiro inválido', warnings:[err.message||'Ficheiro inválido']
    });
  }
}

// PASSO 3 — aplicar os dados conforme o tipo
function pnlAplicar(data, fileName, tipo){
  if (!window._vgMarketImportRouting && window.VG?.market?.routePnlImport?.(data,fileName,tipo)) return;
  const mesLabel = PNL_MESES[data.mes] || ('Mês ' + data.mes);
  const dcSource = tipo === 'acumulado' ? 'pnl_accum' : 'pnl_month';
  const dcBefore = typeof window.vgDataCenterCapture === 'function' ? window.vgDataCenterCapture(dcSource, data.mes) : null;
  if (tipo === 'acumulado') {
    STORE_ACUM[data.mes] = data;
    updateYearGlobals();
    if (!(data.mes in STORE)) { STORE[data.mes] = data; selectedMeses.add(data.mes); buildMesButtons(); }
    applyMesSelection();
    if (typeof hsRender === 'function') { try { hsRender(); } catch(e){} }
    showToast(`✓ Acumulado até ${mesLabel} carregado — colunas acumuladas passam a oficiais`);
    document.getElementById('importStatus').textContent = `Último import (acumulado até ${mesLabel}): ${fileName}`;
    if (typeof window.vgDataCenterRecord === 'function') window.vgDataCenterRecord({
      source:'pnl_accum', fileName, scope:`Acumulado até ${mesLabel}`, before:dcBefore,
      duplicate:!!(dcBefore && dcBefore.payload), metrics:{month:data.mes,hotels:(data.hotel_list||[]).length,year:data.yr_cur||YR_CUR},
      summary:`P&L acumulado oficial até ${mesLabel}`
    });
  } else {
    const isUpdate = data.mes in STORE;
    STORE[data.mes] = data;
    updateYearGlobals();
    selectedMeses.add(data.mes);
    buildMesButtons();
    applyMesSelection();
    if (isUpdate) showToast(`↺ ${mesLabel} actualizado — dados anteriores substituídos`);
    else showToast(`✓ ${mesLabel} carregado — ${data.hotel_list.length} hotéis`);
    document.getElementById('importStatus').textContent = `Último import (${mesLabel}): ${fileName}`;
    if (typeof window.vgDataCenterRecord === 'function') window.vgDataCenterRecord({
      source:'pnl_month', fileName, scope:mesLabel, before:dcBefore, duplicate:isUpdate,
      metrics:{month:data.mes,hotels:(data.hotel_list||[]).length,year:data.yr_cur||YR_CUR},
      summary:isUpdate?`Atualização do P&L de ${mesLabel}`:`P&L mensal de ${mesLabel}`
    });
  }
}

function parseWorkbook(wb, forcedMes) {
  const ws = wb.Sheets['MAPA RESUMO'];
  if (!ws) throw new Error('Folha MAPA RESUMO não encontrada');

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  function s(v) { return v == null || v === '' || isNaN(Number(v)) ? null : Math.round(Number(v) * 100) / 100; }
  function nSum(...vals) { return vals.reduce((acc, v) => acc + (v == null || v === '' || isNaN(Number(v)) ? 0 : Number(v)), 0); }
  function headerTxt(v) { return (v == null ? '' : String(v)).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim(); }
  function valueFromYearColumns(row, headerRows, year, fallbackCol) {
    const y = String(year);
    const vals = [];
    const hrs = (headerRows || []).filter(Boolean);
    for (let c = 1; c < row.length; c++) {
      const val = row[c];
      if (val == null || val === '' || isNaN(Number(val))) continue;
      const heads = hrs.map(hr => headerTxt(hr[c])).join(' ');
      if (!heads.includes(y)) continue;
      if (/%|PERC|MARGEM|RACIO|RATIO/.test(heads)) continue;
      vals.push(Number(val));
    }
    if (vals.length) return s(vals.reduce((a,b)=>a+b,0));
    return fallbackCol != null ? s(row[fallbackCol]) : null;
  }

  // ---- Mês: é SEMPRE o que o utilizador indicou (passado em forcedMes). ----
  // Não se adivinha nada do ficheiro — os slicers/pivots do Excel não são fiáveis
  // (mostram "Itens múltiplos" e arrastam seleções antigas de outros meses).
  let mes = null;
  if (forcedMes != null && Number(forcedMes) >= 1 && Number(forcedMes) <= 12) {
    mes = Number(forcedMes);
  }
  if (mes == null) {
    // Segurança: se por algum motivo não veio mês, sinaliza para o chamador pedir.
    console.warn('parseWorkbook chamado sem mês.');
    return { __needMonth: true };
  }
  console.log('Mês (indicado pelo utilizador):', mes);

  const hotel_list = [];
  const hotels_ops = {};
  const hotels_costs = {};
  const hotels_rev = {};
  const hotels_nop = {};

  // ---- Locate sections dynamically by scanning for anchor labels ----
  // OPS section: find row with col A = "Hoteis" and col B = 2025 (numeric) after "RESUMO"
  // COSTS section: find row with col A = null/empty and col B = "BEBIDAS"
  // REV section: find row with col A = null/empty and col B = "ALOJAMENTO"

  let opsHeaderRow = -1, costsHeaderRow = -1, revHeaderRow = -1;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    // OPS header: "Hoteis" in col 0, 2025 in col 1
    if (r[0] === 'Hoteis' && typeof r[1] === 'number' && r[1] >= 2020 && opsHeaderRow === -1) {
      opsHeaderRow = i;
    }
    // COSTS header: col 1 = "BEBIDAS" anywhere in row
    if (r[1] === 'BEBIDAS' && costsHeaderRow === -1) {
      costsHeaderRow = i;
    }
    // REV header: col 1 = "ALOJAMENTO"
    if (r[1] === 'ALOJAMENTO' && revHeaderRow === -1 && i > 60) {
      revHeaderRow = i;
    }
  }

  // Fallback to known offsets if dynamic detection fails
  if (opsHeaderRow === -1) opsHeaderRow = 9;
  if (costsHeaderRow === -1) costsHeaderRow = 52;
  if (revHeaderRow === -1) revHeaderRow = 95;

  // Detect actual year values from OPS header row dynamically
  const _hr = rows[opsHeaderRow] || [];
  let yr_prev = null, yr_cur = null;
  for (let _c = 1; _c < _hr.length; _c++) {
    const _v = _hr[_c];
    if (typeof _v === 'number' && _v >= 2020 && _v <= 2099) {
      if (yr_prev === null) { yr_prev = String(_v); }
      else if (yr_cur === null && String(_v) !== yr_prev) { yr_cur = String(_v); break; }
    }
  }
  if (!yr_prev) yr_prev = '2025';
  if (!yr_cur)  yr_cur  = String(Number(yr_prev) + 1);

  // Parse OPS rows (immediately after header, up to 40 hotels max)
  for (let i = opsHeaderRow + 1; i < Math.min(opsHeaderRow + 50, rows.length); i++) {
    const r = rows[i];
    if (!r || !r[0] || typeof r[0] !== 'string') continue;
    if (r[0] === 'Total Geral' || r[0] === 'Mês' || r[0] === 'CENTRO_CUSTO') break;
    const h = r[0];
    hotel_list.push(h);
    hotels_ops[h] = {
      'Disponiveis':        { YR_PREV: s(r[1]),  YR_CUR: s(r[2])  },
      'Ocupados':           { YR_PREV: s(r[3]),  YR_CUR: s(r[4])  },
      'Complimentary':      { YR_PREV: s(r[5]),  YR_CUR: s(r[6])  },
      'Hospedes':           { YR_PREV: s(r[7]),  YR_CUR: s(r[8])  },
      'Chegadas':           { YR_PREV: s(r[9]),  YR_CUR: s(r[10]) },
      'Dormidas':           { YR_PREV: s(r[11]), YR_CUR: s(r[12]) },
      'Receita Total':      { YR_PREV: s(r[13]), YR_CUR: s(r[14]) },
      'Receita Alojamento': { YR_PREV: s(r[15]), YR_CUR: s(r[16]) },
      'Receita FB':         { YR_PREV: s(r[17]), YR_CUR: s(r[18]) },
    };
  }

  // Parse COSTS: find "Hoteis" row within costsHeaderRow area
  // The costs section has: BEBIDAS,COMIDAS,COMUNICAÇÕES,ENERGIA,MANUTENÇÃO,MARKETING,OPERACIONAIS,PESSOAL
  // + TOTAIS column (col 19/20) = sum of all costs including NOP/NAO_OPERACIONAIS
  let costsDataStart = costsHeaderRow + 1;
  // Sometimes there's a sub-header row with "2025/2026"; skip it
  if (rows[costsDataStart] && rows[costsDataStart][0] === 'Hoteis') costsDataStart++;
  for (let i = costsDataStart; i < Math.min(costsDataStart + 50, rows.length); i++) {
    const r = rows[i];
    if (!r || !r[0] || typeof r[0] !== 'string') continue;
    if (r[0] === 'Total Geral') break;
    const h = r[0];
    const op25 = nSum(r[1], r[3], r[5], r[7], r[9], r[11], r[13], r[15]);
    const op26 = nSum(r[2], r[4], r[6], r[8], r[10], r[12], r[14], r[16]);
    const total25 = s(r[19]);
    const total26 = s(r[20]);
    let nop25 = s(r[17]);
    let nop26 = s(r[18]);

    // Em alguns ficheiros o NOP de 2025 vem vazio/zero na coluna própria,
    // mas está incluído nos TOTAIS. Nesse caso calculamos: Total Custos − custos operacionais.
    const nopCalc25 = total25 != null ? s(total25 - op25) : null;
    const nopCalc26 = total26 != null ? s(total26 - op26) : null;
    if ((nop25 == null || Math.abs(nop25) < 0.005) && nopCalc25 != null && Math.abs(nopCalc25) > 0.005) nop25 = nopCalc25;
    if ((nop26 == null || Math.abs(nop26) < 0.005) && nopCalc26 != null && Math.abs(nopCalc26) > 0.005) nop26 = nopCalc26;

    hotels_costs[h] = {
      'BEBIDAS':      { YR_PREV: s(r[1]),  YR_CUR: s(r[2])  },
      'COMIDAS':      { YR_PREV: s(r[3]),  YR_CUR: s(r[4])  },
      'COMUNICAÇÕES': { YR_PREV: s(r[5]),  YR_CUR: s(r[6])  },
      'ENERGIA':      { YR_PREV: s(r[7]),  YR_CUR: s(r[8])  },
      'MANUTENÇÃO':   { YR_PREV: s(r[9]),  YR_CUR: s(r[10]) },
      'MARKETING':    { YR_PREV: s(r[11]), YR_CUR: s(r[12]) },
      'OPERACIONAIS': { YR_PREV: s(r[13]), YR_CUR: s(r[14]) },
      'PESSOAL':      { YR_PREV: s(r[15]), YR_CUR: s(r[16]) },
      'NAO_OPERACIONAIS': { YR_PREV: nop25, YR_CUR: nop26 },
      'TOTAIS':       { YR_PREV: total25, YR_CUR: total26 },
    };
    hotels_nop[h] = { YR_PREV: nop25, YR_CUR: nop26 };
  }

  // Parse NOP costs from "NOP E INVESTIMENTOS" sheet
  const wsNop = wb.Sheets['NOP E INVESTIMENTOS'];
  if (wsNop) {
    const nopRows = XLSX.utils.sheet_to_json(wsNop, { header: 1, defval: null });
    // Find header row (has "Hoteis" in col 0)
    let nopStart = -1;
    for (let i = 0; i < nopRows.length; i++) {
      if (nopRows[i] && nopRows[i][0] === 'Hoteis') { nopStart = i + 1; break; }
    }
    if (nopStart > 0) {
      // Estrutura da folha: "Receitas | Custos" (RENDAS E NOP) para cada ano, seguidas de
      // "Saldos", "GOP" e "GOP minus rendas e NOP". O NOP líquido é Custos − Receitas (= −Saldo).
      // NUNCA somar todas as colunas cujo cabeçalho tem o ano: os anos repetem-se nos blocos
      // Saldos/GOP e isso inflacionava o NOP (ex.: Cascais €27,6k lido como €1,5M).
      const nopHdrMain = nopRows[nopStart-1] || [];  // linha "Hoteis | Receitas | Custos | ..."
      const nopHdrTop  = nopRows[nopStart-2] || [];  // linha "2025 | | 2026 | | Saldos | ..."
      const nopNorm = v => String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
      let nopRc25 = -1, nopCc25 = -1, nopRc26 = -1, nopCc26 = -1, nopSaldoCol = -1;
      for (let c = 1; c < nopHdrMain.length; c++) {
        const t = nopNorm(nopHdrMain[c]);
        if (t === 'RECEITAS') { if (nopRc25 === -1) nopRc25 = c; else if (nopRc26 === -1) nopRc26 = c; }
        if (t === 'CUSTOS')   { if (nopCc25 === -1) nopCc25 = c; else if (nopCc26 === -1) nopCc26 = c; }
      }
      for (let c = 1; c < nopHdrTop.length; c++) { if (nopNorm(nopHdrTop[c]) === 'SALDOS') { nopSaldoCol = c; break; } }
      const nopFromRow = (r, rc, cc, sIdx) => {
        if (cc > -1 && (r[cc] != null || (rc > -1 && r[rc] != null))) {
          const v = (r[cc] == null ? 0 : Number(r[cc])) - (rc > -1 && r[rc] != null ? Number(r[rc]) : 0);
          return isNaN(v) ? null : s(v);
        }
        if (sIdx > -1 && r[sIdx] != null && !isNaN(Number(r[sIdx]))) return s(-Number(r[sIdx]));
        return null;
      };
      for (let i = nopStart; i < Math.min(nopStart + 50, nopRows.length); i++) {
        const r = nopRows[i];
        if (!r || !r[0] || typeof r[0] !== 'string') continue;
        if (r[0] === 'Total Geral' || r[0] === 'VG INTERNACIONAL' || r[0] === 'VILA GALÉ SA') break;
        const h = r[0];
        const v25 = nopFromRow(r, nopRc25, nopCc25, nopSaldoCol);
        const v26 = nopFromRow(r, nopRc26, nopCc26, nopSaldoCol > -1 ? nopSaldoCol + 1 : -1);
        if (!hotels_nop[h]) hotels_nop[h] = { YR_PREV: null, YR_CUR: null };
        // Só substitui quando há valor real. Também actualiza a estrutura de custos,
        // para a demonstração USALI não voltar a cair no zero por falha de coluna.
        if (v25 != null && Math.abs(v25) > 0.005) {
          hotels_nop[h][YR_PREV] = v25;
          if (hotels_costs[h]?.NAO_OPERACIONAIS) hotels_costs[h].NAO_OPERACIONAIS[YR_PREV] = v25;
        }
        if (v26 != null && Math.abs(v26) > 0.005) {
          hotels_nop[h][YR_CUR] = v26;
          if (hotels_costs[h]?.NAO_OPERACIONAIS) hotels_costs[h].NAO_OPERACIONAIS[YR_CUR] = v26;
        }
      }
    }
  }

  // Parse REV breakdown
  let revDataStart = revHeaderRow + 1;
  if (rows[revDataStart] && rows[revDataStart][0] === 'Hoteis') revDataStart++;
  for (let i = revDataStart; i < Math.min(revDataStart + 50, rows.length); i++) {
    const r = rows[i];
    if (!r || !r[0] || typeof r[0] !== 'string') continue;
    if (r[0] === 'Total Geral' || r[0] === 'Mês' || r[0] === 'Outros indicadores') break;
    const h = r[0];
    // Estrutura base esperada no MAPA RESUMO.
    // Mantém compatibilidade com ficheiros atuais e permite, em uploads futuros,
    // apanhar receita individual de COMIDA/BEBIDA se vierem como colunas próprias.
    const revObj = {
      'ALOJAMENTO': { YR_PREV: s(r[1]), YR_CUR: s(r[2]) },
      'ALIMENTACAO':{ YR_PREV: s(r[3]), YR_CUR: s(r[4]) },
      'DIVERSOS':   { YR_PREV: s(r[5]), YR_CUR: s(r[6]) },
      'DRHP':       { YR_PREV: s(r[7]), YR_CUR: s(r[8]) },
      'COMIDA':     { YR_PREV: null,  YR_CUR: null },
      'BEBIDA':     { YR_PREV: null,  YR_CUR: null },
    };

    // Leitura dinâmica de pares 2025/2026 por rubrica.
    // Ex.: se o ficheiro passar a trazer colunas COMIDA 2025/2026 e BEBIDA 2025/2026,
    // estas passam a alimentar automaticamente os rácios específicos.
    const hdr = rows[revHeaderRow] || [];
    const normHdr = v => String(v || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .toUpperCase().trim();
    for (let c = 1; c < hdr.length; c += 2) {
      const key = normHdr(hdr[c]);
      if (!key) continue;
      let target = null;
      if (/^COMIDA/.test(key) || /ALIMENTOS?/.test(key) || /FOOD/.test(key)) target = 'COMIDA';
      else if (/^BEBIDA/.test(key) || /BEVERAGE|DRINK/.test(key)) target = 'BEBIDA';
      else if (/ALIMENTACAO|F&B|FB/.test(key)) target = 'ALIMENTACAO';
      else if (/ALOJAMENTO|ROOM/.test(key)) target = 'ALOJAMENTO';
      else if (/DIVERSOS|OTHER/.test(key)) target = 'DIVERSOS';
      if (target) {
        revObj[target] = { YR_PREV: s(r[c]), YR_CUR: s(r[c+1]) };
      }
    }

    hotels_rev[h] = revObj;
  }


  // ---- FICHA HOTEL: valores oficiais do MAPA RESUMO / Outros indicadores ----
  // No MAPA RESUMO, o bloco "Outros indicadores" tem:
  // D/E = ADR 2025/2026, F/G = ADR NET 2025/2026,
  // P/Q = GOP sem sede 2025/2026, U/V = GOP com sede 2025/2026.
  // IMPORTANTE: estes valores são MENSAIS (do mês do ficheiro), tal como todo o
  // MAPA RESUMO — verificado: GOP sem sede = Receita do mês − Custos do mês.
  // São oficiais e não devem ser recalculados por diferença; os acumulados
  // constroem-se somando os meses carregados no STORE.
  (function parseOutrosIndicadoresMapaResumo(){
    const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
    let hdr = -1;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] || [];
      if (norm(r[0]) === 'OUTROS INDICADORES' || (norm(r[1]) === 'REVPAR' && norm(r[3]) === 'ADR')) {
        hdr = i;
        break;
      }
    }
    if (hdr < 0) return;
    // normalmente: hdr = linha dos indicadores, hdr+1 = anos, hdr+2 = dados
    let start = hdr + 1;
    while (start < rows.length && norm(rows[start]?.[0]) !== 'HOTEIS') start++;
    if (start >= rows.length) return;
    start += 1;

    for (let i = start; i < Math.min(start + 80, rows.length); i++) {
      const r = rows[i] || [];
      const h = r[0];
      if (!h || typeof h !== 'string') continue;
      if (norm(h) === 'TOTAL GERAL' || norm(h) === 'MES' || norm(h).includes('CENTRO_CUSTO')) break;
      if (!hotels_ops[h]) hotels_ops[h] = {};
      hotels_ops[h]['ADR'] = { YR_PREV: s(r[3]), YR_CUR: s(r[4]) };
      hotels_ops[h]['ADR NET'] = { YR_PREV: s(r[5]), YR_CUR: s(r[6]) };
      // GOP: guardar com precisão total (sem arredondar) para evitar desvio ao somar meses
      const sExact = v => (v == null || v === '' || isNaN(Number(v))) ? null : Number(v);
      hotels_ops[h]['GOP SEM SEDE'] = { YR_PREV: sExact(r[15]), YR_CUR: sExact(r[16]) };
      hotels_ops[h]['GOP COM SEDE'] = { YR_PREV: sExact(r[20]), YR_CUR: sExact(r[21]) };
    }
  })();


  // ---- Normalização crítica das chaves de ano ----
  // O parser cria campos YR_PREV/YR_CUR; o restante dashboard lê 2025/2026.
  // Sem esta normalização, GOP COM SEDE e ADR NET podem ficar vazios/errados.
  (function normalizeYearKeys(){
    function walk(obj){
      if (!obj || typeof obj !== 'object') return;
      if (Object.prototype.hasOwnProperty.call(obj, 'YR_PREV') && !Object.prototype.hasOwnProperty.call(obj, yr_prev)) obj[yr_prev] = obj.YR_PREV;
      if (Object.prototype.hasOwnProperty.call(obj, 'YR_CUR')  && !Object.prototype.hasOwnProperty.call(obj, yr_cur))  obj[yr_cur]  = obj.YR_CUR;
      Object.keys(obj).forEach(k => walk(obj[k]));
    }
    walk(hotels_ops);
    walk(hotels_costs);
    walk(hotels_rev);
    walk(hotels_nop);
  })();

  return { mes, yr_cur, yr_prev, hotel_list, hotels_ops, hotels_costs, hotels_rev, hotels_nop };
}

// ==========================================================
// MES BUTTONS
// ==========================================================
const MES_NOME = {1:'Jan',2:'Fev',3:'Mar',4:'Abr',5:'Mai',6:'Jun',7:'Jul',8:'Ago',9:'Set',10:'Out',11:'Nov',12:'Dez'};


// ==========================================================
// MERGE — build RAW from selected months
// ==========================================================
function mergeMonths() {
  // Injectar previsão nos meses futuros antes de filtrar
  orcInjectForecastToStore();

  // Deduplicate: Set already guarantees unique values, but be explicit.
  // STORE[m] holds exactly one snapshot per month — always the last loaded file.
  // This function never accumulates across reloads; it only sums across distinct months.
  const meses = [...new Set(selectedMeses)].sort((a,b)=>a-b).filter(m => m in STORE);
  if (meses.length === 0) { RAW = null; return; }
  if (meses.length === 1) { RAW = STORE[meses[0]]; return; }

  // Collect all hotel names across selected months
  const allHotels = [...new Set(meses.flatMap(m => STORE[m]?.hotel_list || []))];

  const hotels_ops = {};
  const hotels_costs = {};
  const hotels_rev = {};
  const hotels_nop = {};

  const addNum = (a, b) => (a == null && b == null) ? null : (a||0) + (b||0);

  allHotels.forEach(h => {
    // OPS — sum numeric fields; occupation-rate fields need special handling
    const opFields = ['Disponiveis','Ocupados','Complimentary','Hospedes','Chegadas','Dormidas','Receita Total','Receita Alojamento','Receita FB'];
    const opFieldsRate = ['ADR','ADR NET']; // rate fields — weighted by Ocupados
    const opFieldsMoney = ['GOP SEM SEDE','GOP COM SEDE']; // monetary YTD — use last available month
    const merged_ops = {};
    [...opFields, ...opFieldsRate, ...opFieldsMoney].forEach(f => {
      merged_ops[f] = { YR_PREV: null, YR_CUR: null };
    });
    // For volume/money fields: sum across months
    meses.forEach(m => {
      const d = STORE[m]?.hotels_ops?.[h];
      if (!d) return;
      opFields.forEach(f => {
        merged_ops[f][YR_PREV] = addNum(merged_ops[f][YR_PREV], d[f]?.[YR_PREV]);
        merged_ops[f][YR_CUR] = addNum(merged_ops[f][YR_CUR], d[f]?.[YR_CUR]);
      });
    });
    // For rate fields (ADR, ADR NET): weighted average by occupied rooms
    opFieldsRate.forEach(f => {
      let w25=0, occ25=0, w26=0, occ26=0;
      meses.forEach(m => {
        const d = STORE[m]?.hotels_ops?.[h]; if (!d) return;
        const a25 = d[f]?.[YR_PREV] ?? d[f]?.YR_PREV;
        const a26 = d[f]?.[YR_CUR]  ?? d[f]?.YR_CUR;
        const o25 = d['Ocupados']?.[YR_PREV] ?? d['Ocupados']?.YR_PREV;
        const o26 = d['Ocupados']?.[YR_CUR]  ?? d['Ocupados']?.YR_CUR;
        if (a25 != null && o25 != null && o25 > 0) { w25 += a25 * o25; occ25 += o25; }
        if (a26 != null && o26 != null && o26 > 0) { w26 += a26 * o26; occ26 += o26; }
      });
      // If no per-month data, fall back to the last month's official YTD value
      if (occ25 === 0) {
        const lastM = meses[meses.length-1];
        const d = STORE[lastM]?.hotels_ops?.[h];
        merged_ops[f][YR_PREV] = d?.[f]?.[YR_PREV] ?? d?.[f]?.YR_PREV ?? null;
      } else {
        merged_ops[f][YR_PREV] = occ25 > 0 ? w25/occ25 : null;
      }
      if (occ26 === 0) {
        const lastM = meses[meses.length-1];
        const d = STORE[lastM]?.hotels_ops?.[h];
        merged_ops[f][YR_CUR] = d?.[f]?.[YR_CUR] ?? d?.[f]?.YR_CUR ?? null;
      } else {
        merged_ops[f][YR_CUR] = occ26 > 0 ? w26/occ26 : null;
      }
    });
    // For GOP monetary fields: os P&L mensais trazem o GOP DO MÊS (não acumulado),
    // pelo que o valor do período é a SOMA dos meses selecionados — igual a ler
    // mês a mês nos ficheiros carregados.
    opFieldsMoney.forEach(f => {
      let g25 = null, g26 = null;
      meses.forEach(m => {
        const snap = STORE[m];
        if (!snap) return;
        const v25 = officialOpVal(h, f, YR_PREV, snap);
        const v26 = officialOpVal(h, f, YR_CUR,  snap);
        if (v25 != null) g25 = (g25 || 0) + v25;
        if (v26 != null) g26 = (g26 || 0) + v26;
      });
      merged_ops[f][YR_PREV] = g25;
      merged_ops[f][YR_CUR]  = g26;
      // Also set numeric-string keys so officialOpVal works on the merged object
      merged_ops[f][String(YR_PREV)] = g25;
      merged_ops[f][String(YR_CUR)]  = g26;
    });
    hotels_ops[h] = merged_ops;

    // COSTS — sum all categories
    const costFields = ['BEBIDAS','COMIDAS','COMUNICAÇÕES','ENERGIA','MANUTENÇÃO','MARKETING','OPERACIONAIS','PESSOAL','NAO_OPERACIONAIS','TOTAIS'];
    const merged_costs = {};
    costFields.forEach(f => { merged_costs[f] = { YR_PREV: null, YR_CUR: null }; });
    meses.forEach(m => {
      const d = STORE[m]?.hotels_costs?.[h];
      if (!d) return;
      costFields.forEach(f => {
        merged_costs[f][YR_PREV] = addNum(merged_costs[f][YR_PREV], d[f]?.[YR_PREV]);
        merged_costs[f][YR_CUR] = addNum(merged_costs[f][YR_CUR], d[f]?.[YR_CUR]);
      });
    });
    hotels_costs[h] = merged_costs;

    // NOP — sum. Usa helper robusto para apanhar valores diretos, fallback de custos e diferença dos totais.
    const merged_nop = { YR_PREV: null, YR_CUR: null };
    meses.forEach(m => {
      const d = STORE[m];
      if (!d) return;
      const v25 = getNopValue(h, YR_PREV, d);
      const v26 = getNopValue(h, YR_CUR, d);
      merged_nop[YR_PREV] = addNum(merged_nop[YR_PREV], v25);
      merged_nop[YR_CUR] = addNum(merged_nop[YR_CUR], v26);
    });
    hotels_nop[h] = merged_nop;

    // REV — sum all categories
    const revFields = ['ALOJAMENTO','ALIMENTACAO','COMIDA','BEBIDA','DIVERSOS','DRHP'];
    const merged_rev = {};
    revFields.forEach(f => { merged_rev[f] = { YR_PREV: null, YR_CUR: null }; });
    meses.forEach(m => {
      const d = STORE[m]?.hotels_rev?.[h];
      if (!d) return;
      revFields.forEach(f => {
        merged_rev[f][YR_PREV] = addNum(merged_rev[f][YR_PREV], d[f]?.[YR_PREV]);
        merged_rev[f][YR_CUR] = addNum(merged_rev[f][YR_CUR], d[f]?.[YR_CUR]);
      });
    });
    hotels_rev[h] = merged_rev;
  });

  RAW = { mes: meses, hotel_list: allHotels, hotels_ops, hotels_costs, hotels_rev, hotels_nop };
  // Normalize year keys on merged object so both YR_PREV/YR_CUR and 2025/2026 are accessible
  (function normalizeRawYearKeys(){
    const yp = String(YR_PREV), yc = String(YR_CUR);
    function walk(obj){
      if (!obj || typeof obj !== 'object') return;
      if (Object.prototype.hasOwnProperty.call(obj, 'YR_PREV') && !Object.prototype.hasOwnProperty.call(obj, yp)) obj[yp] = obj.YR_PREV;
      if (Object.prototype.hasOwnProperty.call(obj, 'YR_CUR')  && !Object.prototype.hasOwnProperty.call(obj, yc)) obj[yc] = obj.YR_CUR;
      Object.keys(obj).forEach(k => walk(obj[k]));
    }
    walk(hotels_ops);
    walk(hotels_costs);
    walk(hotels_rev);
  })();
}

function buildMesButtons() {
  updateYearGlobals();
  const sorted = Object.keys(STORE).map(Number).sort((a,b)=>a-b);
  const container = document.getElementById('mesBtns');

  container.innerHTML = sorted.map(m =>
    `<button onclick="toggleMes(${m})" id="mesBtnFor${m}" class="sb-mes-btn ${selectedMeses.has(m)?'active':''}">${MES_NOME[m] || m}</button>`
  ).join('');

  const allActive = sorted.length > 0 && sorted.every(m => selectedMeses.has(m));
  const allBtn = document.getElementById('mesAllBtn');
  if (allBtn) allBtn.className = 'sb-mes-all' + (allActive ? ' active' : '');

  const hasData = sorted.length > 0;
  document.getElementById('mesSection').style.display    = hasData ? 'block' : 'none';
  document.getElementById('globalFilterBar')?.classList.toggle('visible', hasData);
  document.getElementById('hotelSection').style.display  = hasData ? 'block' : 'none';
  document.getElementById('emptyState').style.display    = (hasData || currentView === 'agenda' || currentView === 'compras' || currentView === 'datacenter') ? 'none'  : 'block';
  if (hasData) updateContextPanel();
  // Sync global month buttons in filter bar
  const gfbWrap = document.getElementById('gfbMesBtns');
  if (gfbWrap && hasData) {
    document.getElementById('gfbMeses').style.display = 'flex';
    gfbWrap.innerHTML = sorted.map(m => {
      const names = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      const active = selectedMeses.has(m);
      return `<button onclick="toggleMes(${m})" style="background:${active?'var(--gold)':'var(--surface-2)'};color:${active?'var(--navy)':'var(--text-2)'};border:1px solid ${active?'var(--gold)':'var(--border-2)'};padding:3px 8px;border-radius:5px;font-size:10px;font-weight:700;cursor:pointer;font-family:var(--font)">${names[m]}</button>`;
    }).join('');
  }
}

function toggleMes(mes) {
  if (selectedMeses.has(mes)) {
    // Don't allow deselecting the last one
    if (selectedMeses.size === 1) return;
    selectedMeses.delete(mes);
  } else {
    selectedMeses.add(mes);
  }
  applyMesSelection();
}

function selectAllMeses() {
  Object.keys(STORE).map(Number).forEach(m => selectedMeses.add(m));
  applyMesSelection();
}

function setMes(mes) {
  // Legacy: select only this month
  selectedMeses.clear();
  selectedMeses.add(mes);
  applyMesSelection();
}

function vgHideLoading(){ const el=document.getElementById('vgLoadPop'); if(el) el.classList.remove('show'); }
function vgShowLoading(title, sub){
  const el=document.getElementById('vgLoadPop'); if(!el) return;
  el.classList.add('show');
  // Enquanto o espelho de carregamento está visível, esconde o "Nenhum dado carregado"
  // para não aparecerem os dois ao mesmo tempo (opção 2).
  const empty=document.getElementById('emptyState'); if(empty) empty.style.display='none';
  if(title){ const t=document.getElementById('vgLoadPopTitle'); if(t) t.textContent=title; }
  if(sub!==undefined){ const s=document.getElementById('vgLoadPopSub'); if(s) s.textContent=sub; }
}
// Termina o carregamento REAL: fecha o espelho e mostra o dashboard (ou o "Nenhum
// dado carregado" só se realmente não houver dados). Só é chamado quando o
// fetchSharedData/restauro termina — o espelho nunca fecha por conta própria.
function vgFinishStartup(){
  vgHideLoading();
  const temDados = (typeof STORE!=='undefined') && Object.keys(STORE).length > 0;
  const empty=document.getElementById('emptyState');
  if(empty){
    const v = (typeof currentView!=='undefined') ? currentView : '';
    empty.style.display = (temDados || v==='agenda' || v==='compras' || v==='datacenter') ? 'none' : 'block';
  }
}

function applyMesSelection() {
  mergeMonths();
  if (!RAW) return;

  const meses = [...selectedMeses].sort((a,b)=>a-b);
  const mesNomeFull = {1:'Janeiro',2:'Fevereiro',3:'Março',4:'Abril',5:'Maio',6:'Junho',7:'Julho',8:'Agosto',9:'Setembro',10:'Outubro',11:'Novembro',12:'Dezembro'};
  if (meses.length === 1) {
    document.getElementById('headerMes').textContent = (mesNomeFull[meses[0]] || 'Mês '+meses[0]) + ' (' + meses[0] + ')';
  } else {
    document.getElementById('headerMes').textContent = meses.map(m => mesNomeFull[m] || m).join(' + ');
  }
  document.getElementById('headerHotels').textContent = RAW.hotel_list.length;

  selectedHotels = new Set(RAW.hotel_list);
  initPills();

  buildMesButtons();
  refreshAll();
}

