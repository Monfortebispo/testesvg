// ==========================================================
// PILLS
// ==========================================================
function initPills() {
  const container = document.getElementById('hotelPills');
  const scopedHotels = (typeof window.vgAuthCanAccessHotel==='function' && window.vgAuthCurrent?.() && !['direcao','admin'].includes(window.vgAuthCurrent()?.role)) ? RAW.hotel_list.filter(h=>window.vgAuthCanAccessHotel(h)) : RAW.hotel_list.slice();
  const allOn = selectedHotels.size === scopedHotels.length;
  let html = '';
  RAW.hotel_list.forEach(h => {
    const allowed = typeof window.vgAuthCanAccessHotel!=='function' || !window.vgAuthCurrent?.() || window.vgAuthCanAccessHotel(h);
    const on = allowed && selectedHotels.has(h);
    const label = h.replace('COLLECTION ', 'C. ');
    html += `<button class="sb-hotel-item ${on?'on':''}" data-hotel="${h}" style="${allowed?'':'display:none'}" onclick="toggleHotel(this)">
      <span class="sb-check"><span class="sb-check-tick">✓</span></span>
      ${label}
    </button>`;
  });
  container.innerHTML = html;
  // Update region counts
  for (const [r, lista] of Object.entries(REGIOES)) {
    const el = document.getElementById('rCount-' + r);
    if (el) el.textContent = lista.filter(h => scopedHotels.includes(h)).length;
  }
  const el = document.getElementById('rCount-todos');
  if (el) el.textContent = scopedHotels.length;
}

function filterHotelSidebar() {
  const q = (document.getElementById('sidebarHotelSearch')?.value || '').toLowerCase().trim();
  document.querySelectorAll('.sb-hotel-item[data-hotel]').forEach(el => {
    const name = (el.dataset.hotel || '').toLowerCase();
    const allowed=typeof window.vgAuthCanAccessHotel!=='function'||!window.vgAuthCurrent?.()||window.vgAuthCanAccessHotel(el.dataset.hotel);el.style.display = allowed&&(!q || name.includes(q)) ? '' : 'none';
  });
}

function toggleAll(selectAll) {
  const items = document.querySelectorAll('.sb-hotel-item[data-hotel]');
  const allowed=RAW.hotel_list.filter(h=>typeof window.vgAuthCanAccessHotel!=='function'||!window.vgAuthCurrent?.()||window.vgAuthCanAccessHotel(h));
  if (selectAll || selectedHotels.size < allowed.length) {
    selectedHotels=new Set(allowed);
    items.forEach(p => p.classList.toggle('on',allowed.includes(p.dataset.hotel)));
  } else {
    selectedHotels.clear();
    items.forEach(p => p.classList.remove('on'));
  }
  syncRegionFromPills();
  refreshAll();
}

function toggleHotel(el) {
  const h = el.dataset.hotel;
  if(typeof window.vgAuthCanAccessHotel==='function'&&window.vgAuthCurrent?.()&&!window.vgAuthCanAccessHotel(h)){showToast('Este hotel não está no seu âmbito de acesso.',true);return;}
  if (selectedHotels.has(h)) { selectedHotels.delete(h); el.classList.remove('on'); }
  else { selectedHotels.add(h); el.classList.add('on'); }
  syncRegionFromPills();
  refreshAll();
}

// ==========================================================
// VIEW / YEAR
// ==========================================================
// ==========================================================
// PROTEÇÃO DA PÁGINA DE CARREGAMENTO — AUTORIZAÇÃO POR PERFIL
// A autorização é decidida pela sessão autenticada; não existe senha fixa no HTML.
// A publicação no servidor é ainda validada novamente pela função Netlify.
// ==========================================================
function requireUploadAccess() {
  const u = (typeof window.vgAuthCurrent === 'function') ? window.vgAuthCurrent() : null;
  const allowed = !!u && (u.role === 'direcao' || u.role === 'admin');
  if (!allowed) showToast('A página de carregamento está reservada à Direção de Operações.', true);
  return allowed;
}

function setView(v) {
  const au=(typeof window.vgAuthCurrent==='function')?window.vgAuthCurrent():null;
  if(au&&typeof window.vgAuthCanAccessModule==='function'&&!window.vgAuthCanAccessModule(v)){
    const fallback=(typeof window.vgAuthFirstAllowedModule==='function'?window.vgAuthFirstAllowedModule():'resumo')||'resumo';
    if(v!==fallback)showToast('Este módulo não está autorizado para o seu perfil.',true);
    if(v!==fallback){history.replaceState(null,'','#'+fallback);return setView(fallback);}
  }
  if (v === 'governance' || v === 'backup') {
    const gu = (typeof window.vgAuthCurrent === 'function') ? window.vgAuthCurrent() : null;
    if (!gu || !['direcao','admin'].includes(gu.role)) {
      showToast(v === 'backup' ? 'Backup & Recuperação está reservado à Direção de Operações.' : 'A Auditoria & Governação está reservada à Direção de Operações.', true);
      history.replaceState(null, '', '#' + (currentView && !['governance','backup'].includes(currentView) ? currentView : 'resumo'));
      return;
    }
  }
  if (v === 'upload' && !requireUploadAccess()) {
    const fallback = currentView && currentView !== 'upload' ? currentView : 'resumo';
    history.replaceState(null, '', '#' + fallback);
    return;
  }
  currentView = v;
  // Hash routing — update URL
  history.replaceState(null, '', '#' + v);
  document.querySelectorAll('.sb-nav-btn').forEach(b => b.classList.remove('active'));
  const nb = document.getElementById('nav-' + v);
  if (nb) nb.classList.add('active');
  document.querySelectorAll('#viewBtns button').forEach((b,i) =>
    b.classList.toggle('active', ['resumo','receitas','custos','kpis','reputacao'][i] === v));
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  const viewEl = document.getElementById('view-' + v);
  if (!viewEl) {
    currentView = 'resumo';
    history.replaceState(null, '', '#resumo');
    const resumoNav = document.getElementById('nav-resumo');
    if (resumoNav) resumoNav.classList.add('active');
    const resumoView = document.getElementById('view-resumo');
    if (resumoView) resumoView.classList.add('active');
  } else {
    viewEl.classList.add('active');
  }
  if (window.innerWidth <= 960 && typeof drawerClose === 'function') drawerClose();
  refreshAll();
  // A página Agenda & Tempo não depende do carregamento do Excel; por isso não deve reservar espaço para o empty state.
  const empty = document.getElementById('emptyState');
  if (empty) {
    if (v === 'agenda' || v === 'compras' || v === 'receitasdet' || v === 'ab' || v === 'housekeeping' || v === 'reputacao' || v === 'datacenter' || v === 'governance' || v === 'backup' || v === 'automaticreports' || v === 'analyticalassistant' || v === 'documents' || v === 'approvals' || v === 'scenariocompare' || v === 'hoteis') empty.style.display = 'none';
    empty.classList.toggle('agenda-hidden', v === 'agenda' || v === 'compras' || v === 'receitasdet' || v === 'ab' || v === 'housekeeping' || v === 'reputacao' || v === 'datacenter' || v === 'governance' || v === 'backup' || v === 'automaticreports' || v === 'analyticalassistant' || v === 'documents' || v === 'approvals' || v === 'scenariocompare' || v === 'hoteis');
  }
  requestAnimationFrame(() => { if(window.VG?.performance?.resizeVisibleCharts) window.VG.performance.resizeVisibleCharts(); else Object.values(charts).forEach(c => c?.resize?.()); });
}

function setYear(y) {
  currentYear = y;
  rebuildYearButtons();
  if (typeof cdApplyYear==='function') cdApplyYear(y);
  refreshAll();
}

// ==========================================================
// HELPERS
// ==========================================================
const __vgNumberFormats = new Map();
function __vgFmtObj(d=0){ d=Number(d)||0; if(!__vgNumberFormats.has(d)) __vgNumberFormats.set(d,new Intl.NumberFormat('pt-PT',{minimumFractionDigits:d,maximumFractionDigits:d})); return __vgNumberFormats.get(d); }
const fmt = (v,d=0) => v==null?'—':__vgFmtObj(d).format(v);
const fmtEur = v => v==null?'—':(window.VG?.market?.formatMoney?window.VG.market.formatMoney(v,0,true):'€ '+fmt(v));
const curSym = () => window.VG?.market?.symbol?.() || '€';
// Smart value formatter: auto M / K
const fmtV = v => {
  if (v == null || isNaN(v)) return '—';
  if(window.VG?.market?.formatMoneyCompact) return window.VG.market.formatMoneyCompact(v,2);
  const abs = Math.abs(v); const sign = v < 0 ? '-' : '';
  if (abs >= 1000000) return sign + '€' + fmt(abs/1000000, abs >= 10000000 ? 1 : 2) + 'M';
  if (abs >= 1000) return sign + '€' + fmt(abs/1000,0) + 'K';
  return sign + '€' + fmt(abs,0);
};
const fmtPct = v => v==null?'—':(v>=0?'+':'')+fmt(v,1)+'%';
const n = v => v||0;


function getNopValue(hotel, year, data = RAW) {
  const detail = data?.sintra_detail;
  if (hotel === 'COLLECTION SINTRA' && detail?.['NAO OPERACIONAIS']?.[year] != null && Math.abs(Number(detail['NAO OPERACIONAIS'][year])) > 0.005) {
    return Number(detail['NAO OPERACIONAIS'][year]);
  }

  const direct = data?.hotels_nop?.[hotel]?.[year];
  if (direct != null && !isNaN(Number(direct)) && Math.abs(Number(direct)) > 0.005) return Number(direct);

  const costNop = data?.hotels_costs?.[hotel]?.NAO_OPERACIONAIS?.[year];
  if (costNop != null && !isNaN(Number(costNop)) && Math.abs(Number(costNop)) > 0.005) return Number(costNop);

  const c = data?.hotels_costs?.[hotel];
  if (c?.TOTAIS?.[year] != null) {
    const opFields = ['BEBIDAS','COMIDAS','COMUNICAÇÕES','ENERGIA','MANUTENÇÃO','MARKETING','OPERACIONAIS','PESSOAL'];
    const opSum = opFields.reduce((acc, f) => acc + n(c?.[f]?.[year]), 0);
    const calc = n(c.TOTAIS[year]) - opSum;
    if (Math.abs(calc) > 0.005) return calc;
  }

  return null;
}

function gop(hotel, year, data=RAW) {
  // KPI único do dashboard: privilegia o GOP COM SEDE oficial do P&L.
  // Só calcula Receita - Custos quando o P&L não disponibiliza esse campo.
  const official = officialOpVal(hotel, 'GOP COM SEDE', year, data);
  if (official != null) return official;
  const rec = n(data?.hotels_ops?.[hotel]?.['Receita Total']?.[year]);
  const tot = totalCosts(hotel, year, data);
  if (!rec && !tot) return null;
  return rec - tot;
}
function gopMinusNop(hotel, year, data=RAW) {
  // Mantido por compatibilidade com chamadas antigas: passa a representar
  // explicitamente o GOP SEM SEDE, evitando misturar NOP com GOP oficial.
  return gopSemSede(hotel, year, data);
}
function gopPct(hotel, year, data=RAW) {
  const g = gop(hotel, year, data);
  const rec = n(data?.hotels_ops?.[hotel]?.['Receita Total']?.[year]);
  return rec > 0 && g !== null ? g / rec * 100 : null;
}

function officialOpVal(hotel, field, year, data=RAW) {
  const obj = data?.hotels_ops?.[hotel]?.[field];
  if (!obj) return null;
  let v = obj?.[year];
  if ((v == null || v === '') && String(year) === String(YR_PREV)) v = obj.YR_PREV;
  if ((v == null || v === '') && String(year) === String(YR_CUR)) v = obj.YR_CUR;
  return (v == null || v === '' || isNaN(Number(v))) ? null : Number(v);
}
function adrOficial(hotel, year, data=RAW) {
  const v = officialOpVal(hotel, 'ADR', year, data);
  if (v != null) return v;
  const d=data?.hotels_ops?.[hotel]; if(!d) return null;
  const a=n(d['Receita Alojamento']?.[year]), o=n(d.Ocupados?.[year]);
  return o>0 ? a/o : null;
}
function adrNet(hotel, year, data=RAW) {
  const v = officialOpVal(hotel, 'ADR NET', year, data);
  if (v != null) return v;
  return null;
}
function hsWeightedAdrField(hotel, year, m, field) {
  // Acumulado lido mês a mês dos P&L carregados (STORE), como no Excel:
  // ADR acum = Σ Receita Alojamento ÷ Σ Ocupados dos meses 1..m — valor exato,
  // sem ponderar ADRs arredondados. Para o ADR NET (sem receita líquida mensal
  // disponível) pondera-se o ADR NET oficial de cada mês pelos ocupados do mês.
  if (field === 'ADR') {
    let aloj = 0, occAc = 0;
    for (let mm=1; mm<=Number(m); mm++) {
      const d = STORE?.[mm]?.hotels_ops?.[hotel]; if (!d) continue;
      const a = d['Receita Alojamento']?.[year];
      const o = d.Ocupados?.[year];
      if (a != null && !isNaN(Number(a))) aloj += Number(a);
      if (o != null && !isNaN(Number(o))) occAc += Number(o);
    }
    if (occAc > 0) return aloj / occAc;
  }
  let weighted = 0, occRooms = 0;
  for (let mm=1; mm<=Number(m); mm++) {
    const data = STORE?.[mm]; if (!data) continue;
    const a = officialOpVal(hotel, field, year, data);
    const o = officialOpVal(hotel, 'Ocupados', year, data);
    if (a != null && o != null && o > 0) { weighted += a * o; occRooms += o; }
  }
  if (occRooms > 0) return weighted / occRooms;
  // Fallback: use the official YTD value from the selected month's parsed Excel
  // (the Excel already shows cumulative YTD data for the selected month)
  const ytdData = STORE?.[Number(m)];
  if (ytdData) {
    const v = officialOpVal(hotel, field, year, ytdData);
    if (v != null) return v;
  }
  return null;
}
function gopComSede(hotel, year, data=RAW) {
  return officialOpVal(hotel, 'GOP COM SEDE', year, data);
}
function gopSemSede(hotel, year, data=RAW) {
  const v = officialOpVal(hotel, 'GOP SEM SEDE', year, data);
  if (v != null) return v;
  // fallback: Receita - Custos (GOP operacional sem imputação de sede)
  const rec = n(data?.hotels_ops?.[hotel]?.['Receita Total']?.[year]);
  const tot = totalCosts(hotel, year, data);
  if (!rec && !tot) return null;
  return rec - tot;
}
function gopComSedePct(hotel, year, data=RAW) {
  const g = gopComSede(hotel, year, data);
  const rec = n(data?.hotels_ops?.[hotel]?.['Receita Total']?.[year]);
  return rec > 0 && g !== null ? g / rec * 100 : null;
}
function gopSemSedePct(hotel, year, data=RAW) {
  const g = gopSemSede(hotel, year, data);
  const rec = n(data?.hotels_ops?.[hotel]?.['Receita Total']?.[year]);
  return rec > 0 && g !== null ? g / rec * 100 : null;
}

function occ(hotel,year,data=RAW){ const d=data?.hotels_ops?.[hotel]; if(!d) return null; const o=n(d.Ocupados?.[year]),dis=n(d.Disponiveis?.[year]); return dis>0?o/dis*100:null; }
function revpar(hotel,year,data=RAW){ const d=data?.hotels_ops?.[hotel]; if(!d) return null; const a=n(d['Receita Alojamento']?.[year]),dis=n(d.Disponiveis?.[year]); return dis>0?a/dis:null; }
function adr(hotel,year,data=RAW){ return adrOficial(hotel, year, data); }
function trevpar(hotel,year,data=RAW){ const d=data?.hotels_ops?.[hotel]; if(!d) return null; const r=n(d['Receita Total']?.[year]),dis=n(d.Disponiveis?.[year]); return dis>0?r/dis:null; }
function totalCosts(hotel,year,data=RAW){
  const c=data?.hotels_costs?.[hotel];
  if(!c) return 0;
  // A Ficha do Hotel deve usar o mesmo total do P&L/Custos para o período ativo.
  // Quando existe a rubrica TOTAIS, ela já representa o total correto e não pode
  // ser somada novamente com as restantes rubricas, para evitar duplicações.
  const total = c?.TOTAIS?.[year];
  if(total != null && !isNaN(Number(total))) return Number(total) || 0;
  return Object.entries(c)
    .filter(([k]) => k !== 'TOTAIS')
    .reduce((s,[,v]) => s + n(v?.[year]), 0);
}
function costComidas(hotel,year, data=RAW){ return n(data?.hotels_costs?.[hotel]?.COMIDAS?.[year]); }
function costBebidas(hotel,year, data=RAW){ return n(data?.hotels_costs?.[hotel]?.BEBIDAS?.[year]); }

// API interna canónica de KPIs — novos módulos devem usar esta camada.
window.VG = window.VG || {};
window.VG.kpi = Object.assign(window.VG.kpi || {}, {
  gop,
  gopPct,
  gopComSede,
  gopComSedePct,
  gopSemSede,
  gopSemSedePct,
  adr: adrOficial,
  adrNet,
  occupancy: occ,
  revpar,
  trevpar,
  totalCosts,
  costComidas,
  costBebidas
});

// ==========================================================
// RÁCIOS A&B — regra de exclusão de canais não outlet
// ==========================================================
// Não entram nos rácios de Comidas/Bebidas/A&B as vendas que não correspondem
// a consumo nos outlets de F&B: armazém, ponto de venda/PDV, staff, SV,
// garrafeira e HORECA. A regra é segura mesmo quando os snapshots antigos
// não têm todas as colunas.
const AB_EXCLUDE_TERMS = ['ARMAZEM','ARMAZÉM','PONTO DE VENDA','PONTO VENDA','PDV','STAFF','SV','GARRAFEIRA','HORECA'];
function abNorm(v){
  try { return (v==null?'':String(v)).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim(); }
  catch(e) { return ''; }
}
function abText(row){
  if (!row || typeof row !== 'object') return '';
  return abNorm([row.armazem,row.familia,row.subfamilia,row.grupo,row.artigo,row.descricao,row.local,row.pontoVenda]
    .filter(v => v != null && String(v).trim() !== '')
    .join(' '));
}
function abIsExcludedOutlet(row){
  const txt = abText(row);
  if (!txt) return false;
  return AB_EXCLUDE_TERMS.some(t => txt.includes(abNorm(t)));
}
function abIsFoodRow(row){
  const txt = abText(row);
  if (!txt) return false;
  return /(COMIDA|COMIDAS|ALIMENTACAO|ALIMENTAÇÃO|FOOD|COZINHA|RESTAURANTE|BUFFET|SNACK)/.test(txt) && !abIsDrinkRow(row);
}
function abIsDrinkRow(row){
  const txt = abText(row);
  if (!txt) return false;
  return /(BEBIDA|BEBIDAS|BEVERAGE|VINHO|VINHOS|CERVEJA|CERVEJAS|AGUA|ÁGUA|REFRIGERANTE|ESPIRITUOSA|ESPIRITUOSAS|COCKTAIL|BAR)/.test(txt);
}
function abMonthNum(v){
  if (v == null || v === '') return null;
  const num = Number(v);
  if (Number.isFinite(num) && num >= 1 && num <= 12) return num;
  const t = abNorm(v);
  const map = {JANEIRO:1,JAN:1,FEVEREIRO:2,FEV:2,MARCO:3,MARÇO:3,MAR:3,ABRIL:4,ABR:4,MAIO:5,MAI:5,JUNHO:6,JUN:6,JULHO:7,JUL:7,AGOSTO:8,AGO:8,SETEMBRO:9,SET:9,OUTUBRO:10,OUT:10,NOVEMBRO:11,NOV:11,DEZEMBRO:12,DEZ:12};
  return map[t] || null;
}
function abSelectedMonths(){
  try {
    const out = selectedMeses && selectedMeses.size ? [...selectedMeses].map(Number).filter(Number.isFinite) : [];
    if (out.length) return out;
    if (RAW?.mes) return (Array.isArray(RAW.mes)?RAW.mes:[RAW.mes]).map(Number).filter(Number.isFinite);
  } catch(e) {}
  return [];
}
// Cache dos detalhes A&B para evitar bloqueio da página de Custos.
// A versão anterior percorria todas as linhas de detalhe sempre que calculava um rácio
// por hotel/ano, o que fazia o browser congelar quando se abria a página Custos.
let __abIndexCache = { key: null, map: new Map() };
function abCacheKey(){
  const meses = abSelectedMonths().slice().sort((a,b)=>a-b).join(',');
  let len = 0;
  let stamp = '';
  try {
    len = Array.isArray(RD_STORE) ? RD_STORE.length : 0;
    stamp = Array.isArray(RD_STORE) ? RD_STORE.map(s => `${s.id||''}:${s.loadedAt||''}:${Array.isArray(s.rows)?s.rows.length:0}`).join('|') : '';
  } catch(e) {}
  return `${meses}::${len}::${stamp}`;
}
function abAllDetailRows(){
  if (typeof RD_STORE === 'undefined' || !Array.isArray(RD_STORE) || !RD_STORE.length) return [];
  const rows = [];
  RD_STORE.forEach(s => {
    if (s && Array.isArray(s.rows)) s.rows.forEach(r => { if (r && typeof r === 'object') rows.push(r); });
  });
  return rows;
}
function abBuildIndex(){
  const key = abCacheKey();
  if (__abIndexCache.key === key) return __abIndexCache.map;

  const meses = abSelectedMonths();
  const useMesFilter = meses.length > 0;
  const mesSet = new Set(meses.map(Number));
  const map = new Map();

  const add = (hotel, year, kind, val) => {
    if (!hotel || !year || !Number.isFinite(val) || val === 0) return;
    const k = `${abNorm(hotel)}|${String(year).replace('.0','')}|${kind}`;
    map.set(k, (map.get(k) || 0) + val);
  };

  try {
    abAllDetailRows().forEach(r => {
      if (!r || abIsExcludedOutlet(r)) return;
      const hotel = r.hotel;
      const year = r.ano ?? r.year;
      if (!hotel || year == null) return;
      const m = abMonthNum(r.mes);
      if (useMesFilter && m && !mesSet.has(m)) return;
      const val = abValue(r);
      if (!Number.isFinite(val) || val <= 0) return;
      const isFood = abIsFoodRow(r);
      const isDrink = abIsDrinkRow(r);
      if (isFood) { add(hotel, year, 'COMIDA', val); add(hotel, year, 'AB', val); }
      else if (isDrink) { add(hotel, year, 'BEBIDA', val); add(hotel, year, 'AB', val); }
    });
  } catch(e) {
    console.error('Erro a criar índice A&B', e);
  }

  __abIndexCache = { key, map };
  return map;
}
function abDetailRows(hotel, year){
  // Mantido apenas por compatibilidade com outras funções antigas.
  // Evitar usar esta função em cálculos repetidos de gráficos/tabelas.
  const meses = abSelectedMonths();
  const hNorm = abNorm(hotel);
  const yNorm = String(year);
  return abAllDetailRows().filter(r => {
    if (abNorm(r.hotel) !== hNorm) return false;
    if (String(r.ano ?? '').replace('.0','') !== yNorm) return false;
    const m = abMonthNum(r.mes);
    if (meses.length && m && !meses.includes(m)) return false;
    if (abIsExcludedOutlet(r)) return false;
    return true;
  });
}
function abValue(row){
  const v = row?.vn ?? row?.VN ?? row?.valor ?? row?.value ?? 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const s = String(v).replace(/\s/g,'').replace(/\./g,'').replace(',', '.');
  const num = Number(s);
  return Number.isFinite(num) ? num : 0;
}
function abDetailRevenue(hotel, year, kind){
  const idx = abBuildIndex();
  const key = `${abNorm(hotel)}|${String(year).replace('.0','')}|${kind}`;
  const total = idx.get(key);
  return total > 0 ? total : null;
}
function abDetailRevenueShare(hotel, year, kind){
  // Share da receita individual dentro de A&B, já com exclusão de armazém, PDV, staff, SV, garrafeira e HORECA.
  // Serve para preencher anos sem detalhe individual, usando a melhor referência disponível.
  const part = abDetailRevenue(hotel, year, kind);
  const total = abDetailRevenue(hotel, year, 'AB');
  if (part > 0 && total > 0) return part / total;
  return null;
}
function abPortfolioRevenueShare(year, kind){
  const idx = abBuildIndex();
  const y = String(year).replace('.0','');
  let part = 0, total = 0;
  idx.forEach((v,k) => {
    const bits = String(k).split('|');
    if (bits[1] !== y) return;
    if (bits[2] === kind) part += n(v);
    if (bits[2] === 'AB') total += n(v);
  });
  return part > 0 && total > 0 ? part / total : null;
}
function abBestRevenueShare(hotel, year, kind){
  // 1) usa detalhe do próprio ano;
  // 2) se não existir, usa o outro ano do mesmo hotel;
  // 3) se não existir, usa o mix global do ano;
  // 4) se não existir, usa o mix global disponível do outro ano.
  const y = String(year).replace('.0','');
  const other = y === YR_PREV ? YR_CUR : YR_PREV;
  return abDetailRevenueShare(hotel, y, kind)
      ?? abDetailRevenueShare(hotel, other, kind)
      ?? abPortfolioRevenueShare(y, kind)
      ?? abPortfolioRevenueShare(other, kind);
}
function revComidas(hotel,year, data=RAW){
  const meses = abSelectedMonths();
  const useSingleMonth = meses.length === 1;
  const detail = (!useSingleMonth && data === RAW) ? abDetailRevenue(hotel, year, 'COMIDA') : null;
  if (detail != null) return detail;
  const direct = n(data?.hotels_rev?.[hotel]?.COMIDA?.[year]);
  if (direct > 0) return direct;
  const fb = n(data?.hotels_rev?.[hotel]?.ALIMENTACAO?.[year] ?? data?.hotels_ops?.[hotel]?.['Receita FB']?.[year]);
  if (data === RAW && fb > 0) {
    const share = abBestRevenueShare(hotel, year, 'COMIDA');
    if (share > 0) return fb * share;
  }
  return null;
}
function revBebidas(hotel,year, data=RAW){
  const meses = abSelectedMonths();
  const useSingleMonth = meses.length === 1;
  const detail = (!useSingleMonth && data === RAW) ? abDetailRevenue(hotel, year, 'BEBIDA') : null;
  if (detail != null) return detail;
  const direct = n(data?.hotels_rev?.[hotel]?.BEBIDA?.[year]);
  if (direct > 0) return direct;
  const fb = n(data?.hotels_rev?.[hotel]?.ALIMENTACAO?.[year] ?? data?.hotels_ops?.[hotel]?.['Receita FB']?.[year]);
  if (data === RAW && fb > 0) {
    const share = abBestRevenueShare(hotel, year, 'BEBIDA');
    if (share > 0) return fb * share;
  }
  return null;
}
function revAB(hotel,year, data=RAW){
  // Só usa abDetailRevenue (da folha Ratios FB) quando não há mês específico seleccionado
  // ou quando há múltiplos meses — para evitar inconsistência com costComidas/costBebidas
  // que são sempre do mês actual do RAW.
  const meses = abSelectedMonths();
  const useSingleMonth = meses.length === 1;
  const detail = (!useSingleMonth && data === RAW) ? abDetailRevenue(hotel, year, 'AB') : null;
  if (detail != null) return detail;
  return n(data?.hotels_rev?.[hotel]?.ALIMENTACAO?.[year] ?? data?.hotels_ops?.[hotel]?.['Receita FB']?.[year]);
}
function ratioComidas(hotel,year){
  const c = costComidas(hotel,year);
  if (c == null || c === 0) return null;
  // Tenta receita de comidas do detalhe; se não houver usa a receita ALIMENTACAO total
  const rInd = revComidas(hotel,year);
  const rTot = n(RAW?.hotels_rev?.[hotel]?.ALIMENTACAO?.[year] ?? RAW?.hotels_ops?.[hotel]?.['Receita FB']?.[year]);
  const r = rInd > 0 ? rInd : (rTot > 0 ? rTot : null);
  return r > 0 ? c / r * 100 : null;
}
function ratioBebidas(hotel,year){
  const c = costBebidas(hotel,year);
  if (c == null || c === 0) return null;
  const rInd = revBebidas(hotel,year);
  const rTot = n(RAW?.hotels_rev?.[hotel]?.ALIMENTACAO?.[year] ?? RAW?.hotels_ops?.[hotel]?.['Receita FB']?.[year]);
  const r = rInd > 0 ? rInd : (rTot > 0 ? rTot : null);
  return r > 0 ? c / r * 100 : null;
}
function ratioAB(hotel,year){
  const r = revAB(hotel,year), c = costComidas(hotel,year) + costBebidas(hotel,year);
  return r > 0 ? c / r * 100 : null;
}
function getActiveHotels(){ return RAW.hotel_list.filter(h=>selectedHotels.has(h)&&(typeof window.vgAuthCanAccessHotel!=='function'||!window.vgAuthCurrent?.()||window.vgAuthCanAccessHotel(h))); }

// ==========================================================
// REGIÕES
// ==========================================================
const REGIOES_DEFAULT = {
  norte: [
    'COIMBRA','COLLECTION BRAGA','COLLECTION DOURO',
    'COLLECTION FIGUEIRA DA FOZ','COLLECTION PONTE DE LIMA VINEYARDS',
    'COLLECTION SERRA DA ESTRELA','DOURO VINEYARDS','PORTO','PORTO RIBEIRA'
  ],
  lisboa: [
    'CASCAIS','COLLECTION PALACIO DOS ARCOS','COLLECTION SINTRA',
    'COLLECTION TOMAR','ERICEIRA','ESTORIL','OPERA',
    'COLLECTION S. MIGUEL','SANTA CRUZ'
  ],
  alentejo: [
    'ALENTEJO VINEYARDS','CASAS DE ELVAS','COLLECTION ALTER REAL',
    'COLLECTION ELVAS','COLLECTION MONTE DO VILAR','EVORA','NEP KIDS'
  ],
  algarve: [
    'ALBACORA','AMPALIUS','ATLANTICO','CERRO ALAGOA',
    'COLLECTION PRAIA','LAGOS','MARINA','NAUTICO','TAVIRA',
    'ISLA CANELA'
  ]
};
function loadRegioes() {
  // O arranque usa a configuração base; logo que o servidor partilhado responda,
  // sharedLoadRegions() substitui esta cópia pela configuração oficial.
  return JSON.parse(JSON.stringify(REGIOES_DEFAULT));
}
function saveRegioes(r) {
  REGIOES = JSON.parse(JSON.stringify(r || REGIOES_DEFAULT));
  if (typeof sharedSaveRegions === 'function') return sharedSaveRegions(REGIOES);
  return Promise.resolve(false);
}
let REGIOES = loadRegioes();
// V31: deteção de mercado centralizada. Mantém a função global isBrasil por compatibilidade.
const BRASIL_HOTELS = ['FORTALEZA','SALVADOR','CUMBUCO','RIO DE JANEIRO','TOUROS','MARES','PAULISTA','CABO','ECO RESORT DE ANGRA','ALAGOAS','COLLECTION SUNSET CUMBUCO','COLLECTION OURO PRETO','COLLECTION AMAZÔNIA'];
function isBrasil(h) { if(window.VG?.market?.isBrasil)return window.VG.market.isBrasil(h); const n=String(h||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase(); return BRASIL_HOTELS.some(b=>n.includes(String(b).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase())); }
let activeRegion = 'todos';

function selectRegion(r) {
  activeRegion = r;
  // If on reputação without P&L data, just re-render reputação and return
  if (!RAW) {
    document.querySelectorAll('.pl-region-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll(`.pl-region-btn[data-r="${r}"]`).forEach(b => b.classList.add('active'));
    const ids = {todos:['rbTodos','rbRepTodos'],norte:['rbNorte','rbRepNorte'],lisboa:['rbLisboa','rbRepLisboa'],alentejo:['rbAlentejo','rbRepAlentejo'],algarve:['rbAlgarve','rbRepAlgarve']};
    (ids[r]||[]).forEach(id => document.getElementById(id)?.classList.add('active'));
    if (currentView === 'reputacao') rtRender();
    return;
  }

  // All region buttons across all views share pl-region-btn class
  // Remove active from all, then set active on matching buttons per view
  document.querySelectorAll('.pl-region-btn').forEach(b => b.classList.remove('active'));
  // Activate the correct button in each view's bar
  document.querySelectorAll(`.pl-region-btn[data-r="${r}"]`).forEach(b => b.classList.add('active'));
  // Also activate by known IDs for bars that don't use data-r
  const ids = {
    todos:    ['rbTodos','rbTodosOcc','rbRepTodos'],
    norte:    ['rbNorte','rbNorteOcc','rbRepNorte'],
    lisboa:   ['rbLisboa','rbLisboaOcc','rbRepLisboa'],
    alentejo: ['rbAlentejo','rbAlentejoOcc','rbRepAlentejo'],
    algarve:  ['rbAlgarve','rbAlgarveOcc','rbRepAlgarve'],
  };
  (ids[r] || []).forEach(id => document.getElementById(id)?.classList.add('active'));

  // Apply hotel selection
  let hoteis = r === 'todos' ? RAW.hotel_list : REGIOES[r].filter(h => RAW.hotel_list.includes(h));
  if(typeof window.vgAuthCanAccessHotel==='function'&&window.vgAuthCurrent?.())hoteis=hoteis.filter(h=>window.vgAuthCanAccessHotel(h));
  selectedHotels = new Set(hoteis);

  // Sync sidebar hotel pills
  document.querySelectorAll('.sb-hotel-item[data-hotel]').forEach(p => {
    p.classList.toggle('on', selectedHotels.has(p.dataset.hotel));
  });

  updateContextPanel();
  refreshAll();
  // Also re-render ocupação heatmap if data available
  if (currentView === 'ocupacao') occRender();
}

function syncRegionFromPills() {
  document.querySelectorAll('.pl-region-btn').forEach(b => b.classList.remove('active'));
  const map = {todos:'rbTodos', norte:'rbNorte', lisboa:'rbLisboa', alentejo:'rbAlentejo', algarve:'rbAlgarve'};

  for (const [r, lista] of Object.entries(REGIOES)) {
    const hotelsDaRegiao = lista.filter(h => RAW.hotel_list.includes(h)&&(typeof window.vgAuthCanAccessHotel!=='function'||!window.vgAuthCurrent?.()||window.vgAuthCanAccessHotel(h)));
    if (hotelsDaRegiao.length === selectedHotels.size &&
        hotelsDaRegiao.every(h => selectedHotels.has(h))) {
      activeRegion = r;
      document.getElementById(map[r])?.classList.add('active');
      return;
    }
  }
  const scopedTotal=RAW.hotel_list.filter(h=>typeof window.vgAuthCanAccessHotel!=='function'||!window.vgAuthCurrent?.()||window.vgAuthCanAccessHotel(h)).length;
  if (selectedHotels.size === scopedTotal) {
    activeRegion = 'todos';
    document.getElementById(map['todos'])?.classList.add('active');
  } else {
    activeRegion = null;
  }
  updateContextPanel();
}

// ==========================================================
// KPIs
// ==========================================================
function buildKPIs(targetId) {
  const hotels = getActiveHotels();
  let rec25=0,rec26=0,aloj25=0,aloj26=0,fb25=0,fb26=0,ocp25=0,ocp26=0,dis25=0,dis26=0,dorm25=0,dorm26=0;
  hotels.forEach(h => {
    const d = RAW.hotels_ops[h]; if(!d) return;
    rec25+=n(d['Receita Total'][YR_PREV]); rec26+=n(d['Receita Total'][YR_CUR]);
    aloj25+=n(d['Receita Alojamento'][YR_PREV]); aloj26+=n(d['Receita Alojamento'][YR_CUR]);
    fb25+=n(d['Receita FB'][YR_PREV]); fb26+=n(d['Receita FB'][YR_CUR]);
    ocp25+=n(d.Ocupados[YR_PREV]); ocp26+=n(d.Ocupados[YR_CUR]);
    dis25+=n(d.Disponiveis[YR_PREV]); dis26+=n(d.Disponiveis[YR_CUR]);
    dorm25+=n(d.Dormidas[YR_PREV]); dorm26+=n(d.Dormidas[YR_CUR]);
  });
  const occR25=dis25>0?ocp25/dis25*100:0, occR26=dis26>0?ocp26/dis26*100:0;
  const rp25=dis25>0?aloj25/dis25:0, rp26=dis26>0?aloj26/dis26:0;
  const a25=ocp25>0?aloj25/ocp25:0, a26=ocp26>0?aloj26/ocp26:0;
  const trp25=dis25>0?rec25/dis25:0, trp26=dis26>0?rec26/dis26:0;

  function delta(v){ const cls=v>=0?'delta-pos':'delta-neg'; return `<span class="kpi-delta ${cls}">${fmtPct(v)}</span>`; }
  // Para KPIs de custos, a lógica é invertida: aumento é negativo (vermelho), redução é positivo (verde).
  function deltaCost(v){ const cls=v>0?'delta-neg':'delta-pos'; return `<span class="kpi-delta ${cls}">${fmtPct(v)}</span>`; }
  const varRec=rec25>0?(rec26-rec25)/rec25*100:0;
  const varOcc=occR25>0?(occR26-occR25)/occR25*100:0;
  const varRp=rp25>0?(rp26-rp25)/rp25*100:0;
  const varAdr=a25>0?(a26-a25)/a25*100:0;

  // GOP aggregate
  let gop25=0, gop26=0;
  hotels.forEach(h => {
    const g25 = gop(h,YR_PREV), g26 = gop(h,YR_CUR);
    if(g25!=null) gop25+=g25; if(g26!=null) gop26+=g26;
  });
  const varGop = gop25!==0 ? (gop26-gop25)/Math.abs(gop25)*100 : 0;
  const gopPct25 = rec25>0 ? gop25/rec25*100 : 0;
  const gopPct26 = rec26>0 ? gop26/rec26*100 : 0;

  // Custos aggregate
  let ctot25=0,ctot26=0,ccom25=0,ccom26=0,cbeb25=0,cbeb26=0,cpes25=0,cpes26=0,cene25=0,cene26=0,cman25=0,cman26=0,copi25=0,copi26=0;
  hotels.forEach(h => {
    const c = RAW.hotels_costs[h]; if(!c) return;
    ctot25+=n(c.TOTAIS?.[YR_PREV]); ctot26+=n(c.TOTAIS?.[YR_CUR]);
    ccom25+=n(c.COMIDAS?.[YR_PREV]); ccom26+=n(c.COMIDAS?.[YR_CUR]);
    cbeb25+=n(c.BEBIDAS?.[YR_PREV]); cbeb26+=n(c.BEBIDAS?.[YR_CUR]);
    cpes25+=n(c.PESSOAL?.[YR_PREV]); cpes26+=n(c.PESSOAL?.[YR_CUR]);
    cene25+=n(c.ENERGIA?.[YR_PREV]); cene26+=n(c.ENERGIA?.[YR_CUR]);
    cman25+=n(c.MANUTENÇÃO?.[YR_PREV]); cman26+=n(c.MANUTENÇÃO?.[YR_CUR]);
    copi25+=n(c.OPERACIONAIS?.[YR_PREV]); copi26+=n(c.OPERACIONAIS?.[YR_CUR]);
  });
  // "Outros custos" = tudo excepto comidas, bebidas, pessoal, energia, manutenção, operacionais
  const cout25 = ctot25 - ccom25 - cbeb25 - cpes25 - cene25 - cman25 - copi25;
  const cout26 = ctot26 - ccom26 - cbeb26 - cpes26 - cene26 - cman26 - copi26;
  const varCtot = ctot25>0?(ctot26-ctot25)/ctot25*100:0;
  const varCpes = cpes25>0?(cpes26-cpes25)/cpes25*100:0;
  const varAloj = aloj25>0?(aloj26-aloj25)/aloj25*100:0;
  const varFb   = fb25>0?(fb26-fb25)/fb25*100:0;
  const varTrp  = trp25>0?(trp26-trp25)/trp25*100:0;
  const varDorm = dorm25>0?(dorm26-dorm25)/dorm25*100:0;
  const varCcom = ccom25>0?(ccom26-ccom25)/ccom25*100:0;
  const varCbeb = cbeb25>0?(cbeb26-cbeb25)/cbeb25*100:0;
  const varCene = cene25>0?(cene26-cene25)/cene25*100:0;
  const varCman = cman25>0?(cman26-cman25)/cman25*100:0;
  const varCout = cout25>0?(cout26-cout25)/cout25*100:0;

  const kpis=[
    {l:`Receita Total ${YR_CUR}`,v:fmtV(rec26),s:`${YR_PREV}: ${fmtV(rec25)}  ${delta(varRec)}`,c:''},
    {l:'Receita Alojamento',v:fmtV(aloj26),s:`${YR_PREV}: ${fmtV(aloj25)}  ${delta(varAloj)}`,c:''},
    {l:'Receita F&B',v:fmtV(fb26),s:`${YR_PREV}: ${fmtV(fb25)}  ${delta(varFb)}`,c:'kpi-blue'},
    {l:`GOP ${YR_CUR}`,v:fmtV(gop26),s:`Margem: ${fmt(gopPct26,1)}%  ${YR_PREV}: ${fmt(gopPct25,1)}%  ${delta(varGop)}`,c:'kpi-green'},
    {l:`Taxa Ocupação ${YR_CUR}`,v:fmt(occR26,1)+'%',s:`${YR_PREV}: ${fmt(occR25,1)}%  ${delta(varOcc)}`,c:''},
    {l:`RevPAR ${YR_CUR}`,v:curSym()+fmt(rp26,2),s:`${YR_PREV}: ${curSym()}${fmt(rp25,2)}  ${delta(varRp)}`,c:'kpi-green'},
    {l:`ADR ${YR_CUR}`,v:curSym()+fmt(a26,2),s:`${YR_PREV}: ${curSym()}${fmt(a25,2)}  ${delta(varAdr)}`,c:''},
    {l:`TRevPAR ${YR_CUR}`,v:curSym()+fmt(trp26,2),s:`${YR_PREV}: ${curSym()}${fmt(trp25,2)}  ${delta(varTrp)}`,c:''},
    {l:`Dormidas ${YR_CUR}`,v:fmt(dorm26),s:`${YR_PREV}: ${fmt(dorm25)}  ${delta(varDorm)}`,c:'kpi-blue'},
    {l:'Hotéis Activos',v:hotels.length,s:`de ${RAW.hotel_list.length} total`,c:''},
    {l:`Custos Totais ${YR_CUR}`,v:fmtV(ctot26),s:`${YR_PREV}: ${fmtV(ctot25)}  ${deltaCost(varCtot)}`,c:'kpi-red'},
    {l:'Custos Comidas',v:fmtV(ccom26),s:`${YR_PREV}: ${fmtV(ccom25)}  ${deltaCost(varCcom)}`,c:'kpi-red'},
    {l:'Custos Bebidas',v:fmtV(cbeb26),s:`${YR_PREV}: ${fmtV(cbeb25)}  ${deltaCost(varCbeb)}`,c:'kpi-red'},
    {l:'Custos Pessoal',v:fmtV(cpes26),s:`${YR_PREV}: ${fmtV(cpes25)}  ${deltaCost(varCpes)}`,c:'kpi-red'},
    {l:'Custos Energia',v:fmtV(cene26),s:`${YR_PREV}: ${fmtV(cene25)}  ${deltaCost(varCene)}`,c:'kpi-red'},
    {l:'Custos Manutenção',v:fmtV(cman26),s:`${YR_PREV}: ${fmtV(cman25)}  ${deltaCost(varCman)}`,c:'kpi-red'},
    {l:'Outros Custos',v:fmtV(cout26),s:`${YR_PREV}: ${fmtV(cout25)}  ${deltaCost(varCout)}`,c:'kpi-red'},
  ];
  document.getElementById(targetId).innerHTML=kpis.map(k=>`
    <div class="kpi-card ${k.c}">
      <div class="kpi-label">${k.l}</div>
      <div class="kpi-value">${k.v}</div>
      <div class="kpi-sub">${k.s}</div>
    </div>`).join('');
}

// ==========================================================
// CHART HELPERS
// ==========================================================
const CD = {

  responsive:true, maintainAspectRatio:false,
  plugins:{ legend:{labels:{color:'#8a9bb0',font:{family:'DM Mono',size:11}}}, tooltip:{backgroundColor:'#0f1e38',borderColor:'#c9a84c44',borderWidth:1,titleColor:'#e8edf5',bodyColor:'#8a9bb0'} },
  scales:{ x:{ticks:{color:'#6a7d96',font:{size:10}},grid:{color:'rgba(255,255,255,.04)'}}, y:{ticks:{color:'#6a7d96',font:{size:10}},grid:{color:'rgba(255,255,255,.06)'}} }
};
function dc(id,type,labels,datasets,opts={}){
  if(charts[id]){charts[id].destroy();delete charts[id];}
  const ctx=document.getElementById(id); if(!ctx) return;
  const merged=JSON.parse(JSON.stringify(CD));
  if(opts.scales){ Object.keys(opts.scales).forEach(k=>{ merged.scales[k]=Object.assign(merged.scales[k]||{},opts.scales[k]); }); }
  if(opts.plugins){ Object.keys(opts.plugins).forEach(k=>{ merged.plugins[k]=Object.assign(merged.plugins[k]||{},opts.plugins[k]); }); }
  if(opts.cutout) merged.cutout=opts.cutout;
  if(opts.indexAxis) merged.indexAxis=opts.indexAxis;
  if(opts.layout) merged.layout=Object.assign(merged.layout||{},opts.layout);
  if(opts.elements) merged.elements=Object.assign(merged.elements||{},opts.elements);
  try {
    charts[id]=new Chart(ctx,{type,data:{labels,datasets},options:merged,plugins:opts.localPlugins||[]});
  } catch(err) {
    console.error('Erro ao criar gráfico', id, err);
  }
}

const revVarOverflowPlugin = {
  id:'revVarOverflowPlugin',
  afterDatasetsDraw(chart){
    if(chart.canvas?.id !== 'chartVarPct') return;
    const ds = chart.data.datasets?.[0];
    const raw = ds?._rawData || [];
    const meta = chart.getDatasetMeta(0);
    const ctx = chart.ctx;
    ctx.save();
    raw.forEach((v,i)=>{
      if(!(v > 100)) return;
      const el = meta.data[i];
      if(!el) return;
      const p = el.getProps(['x','y','base','width'], true);
      const left = p.x - p.width/2;
      const top = chart.scales.y.getPixelForValue(100) + 2;
      const bottom = chart.scales.y.getPixelForValue(0);
      const h = Math.max(4, bottom - top);
      ctx.setLineDash([6,4]);
      ctx.strokeStyle = '#2ecc8f';
      ctx.lineWidth = 2;
      ctx.strokeRect(left, top, p.width, h);
      ctx.setLineDash([]);
      ctx.fillStyle = '#2ecc8f';
      ctx.font = '700 10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('+'+v.toFixed(1)+'%', p.x, top + 4);
    });
    ctx.restore();
  }
};

// ==========================================================
// CHARTS — RESUMO
// ==========================================================
function buildChartsResumo() {
  const isV2 = document.body.classList.contains('theme-v2');
  const c2025 = isV2 ? 'rgba(34,31,28,.18)'  : 'rgba(42,125,140,.6)';
  const c2025b= isV2 ? '#c9c2b4'             : '#2a7d8c';
  const c2026 = isV2 ? 'rgba(139,26,26,.75)' : 'rgba(201,168,76,.7)';
  const c2026b= isV2 ? '#8b1a1a'             : '#c9a84c';
  const mixColors = isV2 ? ['#8b1a1a','#1f6b4a','#b08a3e'] : ['#c9a84c','#2a7d8c','#4a6fa5'];
  const mixBorder = isV2 ? '#ffffff' : '#0f1e38';
  const hotels = getActiveHotels();
  const sorted15 = [...hotels].sort((a,b)=>n(RAW.hotels_ops[b]?.['Receita Total']?.[YR_CUR])-n(RAW.hotels_ops[a]?.['Receita Total']?.[YR_CUR])).slice(0,15);
  const lbl = sorted15.map(h=>h.length>18?h.substring(0,16)+'…':h);

  dc('chartRevHotel','bar',lbl,[
    {label:YR_PREV,data:sorted15.map(h=>n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_PREV])),backgroundColor:c2025,borderColor:c2025b,borderWidth:1,borderRadius:3},
    {label:YR_CUR,data:sorted15.map(h=>n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_CUR])),backgroundColor:c2026,borderColor:c2026b,borderWidth:1,borderRadius:3}
  ],{plugins:{legend:{position:'top'}},scales:{x:{ticks:{maxRotation:45,font:{size:9}}},y:{ticks:{callback:v=>curSym()+fmt(v/1000)+'K'}}}});

  let aloj=0,fb=0,outros=0;
  const y=currentYear=== YR_PREV?YR_PREV:YR_CUR;
  hotels.forEach(h=>{const r=RAW.hotels_rev[h];if(!r)return;aloj+=n(r.ALOJAMENTO?.[y]);fb+=n(r.ALIMENTACAO?.[y]);outros+=n(r.DIVERSOS?.[y]);});
  dc('chartRevMix','doughnut',['Alojamento','F&B','Outros'],[
    {data:[aloj,fb,outros],backgroundColor:mixColors,borderWidth:2,borderColor:mixBorder}
  ],{cutout:'65%',plugins:{legend:{position:'bottom',labels:{padding:14}}},scales:{x:{display:false},y:{display:false}}});

  dc('chartOcc','bar',lbl,[
    {label:'Occ '+YR_PREV+' %',data:sorted15.map(h=>occ(h,YR_PREV)),backgroundColor:c2025,borderColor:c2025b,borderWidth:1,borderRadius:3},
    {label:'Occ '+YR_CUR+' %',data:sorted15.map(h=>occ(h,YR_CUR)),backgroundColor:c2026,borderColor:c2026b,borderWidth:1,borderRadius:3}
  ],{plugins:{legend:{position:'top'}},scales:{x:{ticks:{maxRotation:45,font:{size:9}}},y:{ticks:{callback:v=>v+'%'},max:100}}});

  dc('chartRevpar','bar',lbl,[
    {label:'RevPAR '+YR_PREV,data:sorted15.map(h=>revpar(h,YR_PREV)),backgroundColor:c2025,borderColor:c2025b,borderWidth:1,borderRadius:3},
    {label:'RevPAR '+YR_CUR,data:sorted15.map(h=>revpar(h,YR_CUR)),backgroundColor:c2026,borderColor:c2026b,borderWidth:1,borderRadius:3}
  ],{plugins:{legend:{position:'top'}},scales:{x:{ticks:{maxRotation:45,font:{size:9}}},y:{ticks:{callback:v=>curSym()+fmt(v,0)}}}});

  // GOP chart
  const gopSorted = [...hotels].filter(h=>gop(h,YR_CUR)!=null).sort((a,b)=>(gop(b,YR_CUR)||0)-(gop(a,YR_CUR)||0)).slice(0,15);
  const gopLbl = gopSorted.map(h=>h.length>18?h.substring(0,16)+'…':h);
  dc('chartGOP','bar',gopLbl,[
    {label:'GOP '+YR_PREV,data:gopSorted.map(h=>gop(h,YR_PREV)),backgroundColor:c2025,borderColor:c2025b,borderWidth:1,borderRadius:3},
    {label:'GOP '+YR_CUR,data:gopSorted.map(h=>gop(h,YR_CUR)),backgroundColor:c2026,borderColor:c2026b,borderWidth:1,borderRadius:3}
  ],{plugins:{legend:{position:'top'}},scales:{x:{ticks:{maxRotation:45,font:{size:9}}},y:{ticks:{callback:v=>curSym()+fmt(v/1000,0)+'K'}}}});

  // GOP% chart
  const gopPctSorted = [...hotels].filter(h=>gop(h,YR_CUR)!=null && n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_CUR])>0)
    .sort((a,b)=>(gopPct(b,YR_CUR)||0)-(gopPct(a,YR_CUR)||0)).slice(0,15);
  const gopPctData = gopPctSorted.map(h=>gopPct(h,YR_CUR));
  const gopGoodBg = isV2 ? 'rgba(31,107,74,.7)'  : 'rgba(39,174,96,.65)';
  const gopGoodBd = isV2 ? '#1f6b4a' : '#27ae60';
  const gopWarnBg = isV2 ? 'rgba(176,138,62,.6)' : 'rgba(201,168,76,.65)';
  const gopWarnBd = isV2 ? '#b08a3e' : '#c9a84c';
  const gopBadBg  = isV2 ? 'rgba(139,26,26,.65)'  : 'rgba(192,57,43,.65)';
  const gopBadBd  = isV2 ? '#8b1a1a' : '#c0392b';
  dc('chartGOPpct','bar',gopPctSorted.map(h=>h.length>18?h.substring(0,16)+'…':h),[
    {label:'GOP% '+YR_CUR,data:gopPctData,
     backgroundColor:gopPctData.map(v=>v>=20?gopGoodBg:v>=0?gopWarnBg:gopBadBg),
     borderColor:gopPctData.map(v=>v>=20?gopGoodBd:v>=0?gopWarnBd:gopBadBd),
     borderWidth:1,borderRadius:3}
  ],{plugins:{legend:{display:false}},scales:{x:{ticks:{maxRotation:45,font:{size:9}}},y:{ticks:{callback:v=>(Number(v)||0).toFixed(0)+'%'}}}});
}

// ==========================================================
// CHARTS — RECEITAS
// ==========================================================
function buildChartsReceitas(){
  const hotels=getActiveHotels();
  const s15=(...fn)=>[...hotels].sort((a,b)=>n(fn[0](b))-n(fn[0](a))).slice(0,15);
  const sa=[...hotels].sort((a,b)=>n(RAW.hotels_rev[b]?.ALOJAMENTO?.[YR_CUR])-n(RAW.hotels_rev[a]?.ALOJAMENTO?.[YR_CUR])).slice(0,15);
  dc('chartRevAloj','bar',sa.map(h=>h.length>16?h.substring(0,14)+'…':h),[
    {label:'Aloj '+YR_PREV,data:sa.map(h=>n(RAW.hotels_rev[h]?.ALOJAMENTO?.[YR_PREV])),backgroundColor:'rgba(42,125,140,.55)',borderColor:'#2a7d8c',borderWidth:1,borderRadius:3},
    {label:'Aloj '+YR_CUR,data:sa.map(h=>n(RAW.hotels_rev[h]?.ALOJAMENTO?.[YR_CUR])),backgroundColor:'rgba(201,168,76,.65)',borderColor:'#c9a84c',borderWidth:1,borderRadius:3}
  ],{plugins:{legend:{position:'top'}},scales:{x:{ticks:{maxRotation:45,font:{size:9}}},y:{ticks:{callback:v=>curSym()+fmt(v/1000)+'K'}}}});

  const sf=[...hotels].sort((a,b)=>n(RAW.hotels_rev[b]?.ALIMENTACAO?.[YR_CUR])-n(RAW.hotels_rev[a]?.ALIMENTACAO?.[YR_CUR])).slice(0,15);
  dc('chartRevFB','bar',sf.map(h=>h.length>16?h.substring(0,14)+'…':h),[
    {label:'FB '+YR_PREV,data:sf.map(h=>n(RAW.hotels_rev[h]?.ALIMENTACAO?.[YR_PREV])),backgroundColor:'rgba(42,125,140,.55)',borderColor:'#2a7d8c',borderWidth:1,borderRadius:3},
    {label:'FB '+YR_CUR,data:sf.map(h=>n(RAW.hotels_rev[h]?.ALIMENTACAO?.[YR_CUR])),backgroundColor:'rgba(201,168,76,.65)',borderColor:'#c9a84c',borderWidth:1,borderRadius:3}
  ],{plugins:{legend:{position:'top'}},scales:{x:{ticks:{maxRotation:45,font:{size:9}}},y:{ticks:{callback:v=>curSym()+fmt(v/1000)+'K'}}}});

  const vd=hotels.filter(h=>n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_PREV])>0)
    .map(h=>({
      h,
      v:(n(RAW.hotels_ops[h]['Receita Total'][YR_CUR])-n(RAW.hotels_ops[h]['Receita Total'][YR_PREV]))/n(RAW.hotels_ops[h]['Receita Total'][YR_PREV])*100
    }))
    .sort((a,b)=>b.v-a.v);
  const vdLabels = vd.map(d=>d.h.length>16?d.h.substring(0,14)+'…':d.h);
  const vdReal = vd.map(d=>d.v);
  const vdPlot = vd.map(d=>Math.max(-100, Math.min(100, d.v)));
  dc('chartVarPct','bar',vdLabels,[
    {
      label:'Var%',
      data:vdPlot,
      _rawData:vdReal,
      backgroundColor:vd.map(d=>d.v>=100?'rgba(39,174,96,.32)':d.v>=0?'rgba(39,174,96,.72)':'rgba(192,57,43,.72)'),
      borderColor:vd.map(d=>d.v>=100?'#2ecc8f':d.v>=0?'#27ae60':'#c0392b'),
      borderWidth:vd.map(d=>d.v>=100?2:1),
      borderRadius:4
    }
  ],{
    localPlugins:[revVarOverflowPlugin],
    plugins:{
      legend:{display:false},
      tooltip:{callbacks:{
        label:(ctx)=>'Variação real: '+((ctx.dataset._rawData?.[ctx.dataIndex] ?? ctx.parsed.y).toFixed(1))+'%'
      }}
    },
    scales:{
      x:{ticks:{maxRotation:55,minRotation:45,font:{size:9},autoSkip:false}},
      y:{min:-100,max:100,ticks:{stepSize:20,callback:v=>(Number(v)||0).toFixed(0)+'%'},grid:{color:(ctx)=>ctx.tick.value===0?'rgba(255,255,255,.45)':'rgba(255,255,255,.08)'}}
    }
  });
}

// ==========================================================
// CHARTS — CUSTOS
// ==========================================================
function buildChartsCustos(){
  const hotels=getActiveHotels();
  const barOpts = {plugins:{legend:{position:'top'}},scales:{x:{ticks:{maxRotation:45,font:{size:9}}},y:{ticks:{callback:v=>curSym()+fmt(v/1000)+'K'}}}};

  // 1. Pessoal 2025 vs 2026
  const sp=[...hotels].filter(h=>n(RAW.hotels_costs[h]?.PESSOAL?.[YR_CUR])>0)
    .sort((a,b)=>n(RAW.hotels_costs[b]?.PESSOAL?.[YR_CUR])-n(RAW.hotels_costs[a]?.PESSOAL?.[YR_CUR])).slice(0,15);
  dc('chartCostPessoal','bar',sp.map(h=>h.length>16?h.substring(0,14)+'…':h),[
    {label:'Pessoal '+YR_PREV,data:sp.map(h=>n(RAW.hotels_costs[h]?.PESSOAL?.[YR_PREV])),backgroundColor:'rgba(42,125,140,.55)',borderColor:'#2a7d8c',borderWidth:1,borderRadius:3},
    {label:'Pessoal '+YR_CUR,data:sp.map(h=>n(RAW.hotels_costs[h]?.PESSOAL?.[YR_CUR])),backgroundColor:'rgba(201,168,76,.65)',borderColor:'#c9a84c',borderWidth:1,borderRadius:3}
  ], barOpts);

  // 2. Comidas + Bebidas 2025 vs 2026
  const sfb=[...hotels].filter(h=>(n(RAW.hotels_costs[h]?.COMIDAS?.[YR_CUR])+n(RAW.hotels_costs[h]?.BEBIDAS?.[YR_CUR]))>0)
    .sort((a,b)=>(n(RAW.hotels_costs[b]?.COMIDAS?.[YR_CUR])+n(RAW.hotels_costs[b]?.BEBIDAS?.[YR_CUR]))-(n(RAW.hotels_costs[a]?.COMIDAS?.[YR_CUR])+n(RAW.hotels_costs[a]?.BEBIDAS?.[YR_CUR]))).slice(0,15);
  dc('chartCostFB','bar',sfb.map(h=>h.length>16?h.substring(0,14)+'…':h),[
    {label:'C+B '+YR_PREV,data:sfb.map(h=>n(RAW.hotels_costs[h]?.COMIDAS?.[YR_PREV])+n(RAW.hotels_costs[h]?.BEBIDAS?.[YR_PREV])),backgroundColor:'rgba(42,125,140,.55)',borderColor:'#2a7d8c',borderWidth:1,borderRadius:3},
    {label:'C+B '+YR_CUR,data:sfb.map(h=>n(RAW.hotels_costs[h]?.COMIDAS?.[YR_CUR])+n(RAW.hotels_costs[h]?.BEBIDAS?.[YR_CUR])),backgroundColor:'rgba(201,168,76,.65)',borderColor:'#c9a84c',borderWidth:1,borderRadius:3}
  ], barOpts);

  // 3. Variação % total de custos
  const vd=hotels.filter(h=>totalCosts(h,YR_PREV)>0)
    .map(h=>({h,v:(totalCosts(h,YR_CUR)-totalCosts(h,YR_PREV))/totalCosts(h,YR_PREV)*100}))
    .sort((a,b)=>b.v-a.v);
  dc('chartCostVarPct','bar',vd.map(d=>d.h.length>16?d.h.substring(0,14)+'…':d.h),[
    {label:'Var%',data:vd.map(d=>d.v),backgroundColor:vd.map(d=>d.v<=0?'rgba(39,174,96,.6)':'rgba(192,57,43,.6)'),borderColor:vd.map(d=>d.v<=0?'#27ae60':'#c0392b'),borderWidth:1,borderRadius:3}
  ],{plugins:{legend:{display:false}},scales:{x:{ticks:{maxRotation:45,font:{size:9}}},y:{ticks:{callback:v=>v.toFixed(1)+'%'}}}});

  // 4. Stacked 2026 (mantém)
  const sc=[...hotels].filter(h=>totalCosts(h,YR_CUR)>0).sort((a,b)=>totalCosts(b,YR_CUR)-totalCosts(a,YR_CUR)).slice(0,15);
  const lbl=sc.map(h=>h.length>16?h.substring(0,14)+'…':h);
  const cats=['BEBIDAS','COMIDAS','ENERGIA','MANUTENÇÃO','OPERACIONAIS','PESSOAL'];
  const cols=['#c9a84c','#2a7d8c','#e74c3c','#9b59b6','#3498db','#27ae60'];
  dc('chartCostStack','bar',lbl,cats.map((cat,i)=>({label:cat,data:sc.map(h=>n(RAW.hotels_costs[h]?.[cat]?.[YR_CUR])),backgroundColor:cols[i]+'aa',borderColor:cols[i],borderWidth:1})),
    {plugins:{legend:{position:'right',labels:{padding:8}}},scales:{x:{stacked:true,ticks:{maxRotation:45,font:{size:9}}},y:{stacked:true,ticks:{callback:v=>curSym()+fmt(v/1000)+'K'}}}});

  // 5. Rácio custos/receita (mantém)
  const sr=[...hotels].filter(h=>n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_CUR])>5000)
    .sort((a,b)=>totalCosts(a,YR_CUR)/n(RAW.hotels_ops[a]['Receita Total'][YR_CUR])-totalCosts(b,YR_CUR)/n(RAW.hotels_ops[b]['Receita Total'][YR_CUR])).slice(0,15);
  const rd=sr.map(h=>{const c=totalCosts(h,YR_CUR),r=n(RAW.hotels_ops[h]['Receita Total'][YR_CUR]);return r>0?c/r*100:null;});
  dc('chartCostRatio','bar',sr.map(h=>h.length>14?h.substring(0,12)+'…':h),[
    {label:'Custos/Receita %',data:rd,backgroundColor:rd.map(v=>v<50?'rgba(39,174,96,.6)':v<80?'rgba(201,168,76,.6)':'rgba(192,57,43,.6)'),borderColor:rd.map(v=>v<50?'#27ae60':v<80?'#c9a84c':'#c0392b'),borderWidth:1,borderRadius:3}
  ],{plugins:{legend:{display:false}},scales:{x:{ticks:{maxRotation:45,font:{size:9}}},y:{ticks:{callback:v=>(Number(v)||0).toFixed(0)+'%'}}}});

  // 6. Rácios específicos de Comidas, Bebidas e A&B
  const rf=[...hotels].filter(h=>ratioAB(h,YR_CUR)!=null || ratioComidas(h,YR_CUR)!=null || ratioBebidas(h,YR_CUR)!=null)
    .sort((a,b)=>(ratioAB(b,YR_CUR)||0)-(ratioAB(a,YR_CUR)||0)).slice(0,15);
  dc('chartCostFBRatio','bar',rf.map(h=>h.length>14?h.substring(0,12)+'…':h),[
    {label:'Comidas %',data:rf.map(h=>ratioComidas(h,YR_CUR)),backgroundColor:'rgba(201,168,76,.62)',borderColor:'#c9a84c',borderWidth:1,borderRadius:3},
    {label:'Bebidas %',data:rf.map(h=>ratioBebidas(h,YR_CUR)),backgroundColor:'rgba(42,125,140,.62)',borderColor:'#2a7d8c',borderWidth:1,borderRadius:3},
    {label:'A&B %',data:rf.map(h=>ratioAB(h,YR_CUR)),backgroundColor:'rgba(192,57,43,.45)',borderColor:'#c0392b',borderWidth:1,borderRadius:3}
  ],{plugins:{legend:{position:'top'}},scales:{x:{ticks:{maxRotation:45,font:{size:9}}},y:{ticks:{callback:v=>(Number(v)||0).toFixed(0)+'%'}}}});
}

// ==========================================================
// CHARTS — KPIs
// ==========================================================
function buildChartsKpis(){
  const hotels=getActiveHotels();
  const sa=[...hotels].filter(h=>adr(h,YR_CUR)>0).sort((a,b)=>adr(b,YR_CUR)-adr(a,YR_CUR)).slice(0,15);
  dc('chartADR','bar',sa.map(h=>h.length>16?h.substring(0,14)+'…':h),[
    {label:'ADR '+YR_PREV,data:sa.map(h=>adr(h,YR_PREV)),backgroundColor:'rgba(42,125,140,.55)',borderColor:'#2a7d8c',borderWidth:1,borderRadius:3},
    {label:'ADR '+YR_CUR,data:sa.map(h=>adr(h,YR_CUR)),backgroundColor:'rgba(201,168,76,.65)',borderColor:'#c9a84c',borderWidth:1,borderRadius:3}
  ],{plugins:{legend:{position:'top'}},scales:{x:{ticks:{maxRotation:45,font:{size:9}}},y:{ticks:{callback:v=>curSym()+fmt(v,0)}}}});

  const sd=[...hotels].sort((a,b)=>n(RAW.hotels_ops[b]?.Dormidas?.[YR_CUR])-n(RAW.hotels_ops[a]?.Dormidas?.[YR_CUR])).slice(0,15);
  dc('chartDormidas','bar',sd.map(h=>h.length>16?h.substring(0,14)+'…':h),[
    {label:'Dormidas '+YR_PREV,data:sd.map(h=>n(RAW.hotels_ops[h]?.Dormidas?.[YR_PREV])),backgroundColor:'rgba(42,125,140,.55)',borderColor:'#2a7d8c',borderWidth:1,borderRadius:3},
    {label:'Dormidas '+YR_CUR,data:sd.map(h=>n(RAW.hotels_ops[h]?.Dormidas?.[YR_CUR])),backgroundColor:'rgba(201,168,76,.65)',borderColor:'#c9a84c',borderWidth:1,borderRadius:3}
  ],{plugins:{legend:{position:'top'}}});

  // Taxa de Ocupação
  const socc = [...hotels].filter(h=>occ(h,YR_CUR)!=null).sort((a,b)=>occ(b,YR_CUR)-occ(a,YR_CUR)).slice(0,15);
  const lbl = socc.map(h=>h.length>16?h.substring(0,14)+'…':h);
  dc('chartKpiOcc','bar',lbl,[
    {label:'Occ '+YR_PREV+' %',data:socc.map(h=>occ(h,YR_PREV)),backgroundColor:'rgba(42,125,140,.55)',borderColor:'#2a7d8c',borderWidth:1,borderRadius:3},
    {label:'Occ '+YR_CUR+' %',data:socc.map(h=>occ(h,YR_CUR)),backgroundColor:'rgba(201,168,76,.65)',borderColor:'#c9a84c',borderWidth:1,borderRadius:3}
  ],{plugins:{legend:{position:'top'}},scales:{x:{ticks:{maxRotation:45,font:{size:9}}},y:{ticks:{callback:v=>v+'%'},max:100}}});

  // RevPAR
  const srev = [...hotels].filter(h=>revpar(h,YR_CUR)!=null).sort((a,b)=>revpar(b,YR_CUR)-revpar(a,YR_CUR)).slice(0,15);
  const lblr = srev.map(h=>h.length>16?h.substring(0,14)+'…':h);
  dc('chartKpiRevpar','bar',lblr,[
    {label:'RevPAR '+YR_PREV,data:srev.map(h=>revpar(h,YR_PREV)),backgroundColor:'rgba(42,125,140,.55)',borderColor:'#2a7d8c',borderWidth:1,borderRadius:3},
    {label:'RevPAR '+YR_CUR,data:srev.map(h=>revpar(h,YR_CUR)),backgroundColor:'rgba(201,168,76,.65)',borderColor:'#c9a84c',borderWidth:1,borderRadius:3}
  ],{plugins:{legend:{position:'top'}},scales:{x:{ticks:{maxRotation:45,font:{size:9}}},y:{ticks:{callback:v=>curSym()+fmt(v,0)}}}});

  // Force resize so charts render correctly after tab switch
  requestAnimationFrame(() => {
    ['chartADR','chartDormidas','chartKpiOcc','chartKpiRevpar'].forEach(id => charts[id]?.resize());
  });
}

// ==========================================================
// TABLES
// ==========================================================
function buildMainTable(){
  const hotels=getActiveHotels();
  let rows=hotels.map(h=>{
    const d=RAW.hotels_ops[h]; if(!d) return null;
    const rt25=n(d['Receita Total'][YR_PREV]),rt26=n(d['Receita Total'][YR_CUR]);
    const varE=rt26-rt25, varP=rt25>0?(varE/rt25*100):null;
    const g25=gop(h,YR_PREV), g26=gop(h,YR_CUR), gPct26=gopPct(h,YR_CUR), gNop26=gopMinusNop(h,YR_CUR);
    return [h,rt25,rt26,varE,varP,occ(h,YR_PREV),occ(h,YR_CUR),revpar(h,YR_PREV),revpar(h,YR_CUR),adr(h,YR_PREV),adr(h,YR_CUR),g25,g26,gPct26,gNop26];
  }).filter(Boolean);
  rows.sort((a,b)=>{const av=a[sortCol]??-Infinity,bv=b[sortCol]??-Infinity;return sortDir*(typeof av==='string'?av.localeCompare(bv):bv-av);});
  document.getElementById('mainTableBody').innerHTML=rows.map(r=>`
    <tr>
      <td><div class="td-hotel-name"><div class="hotel-dot"></div>${r[0]}</div></td>
      <td>${fmtEur(r[1])}</td><td>${fmtEur(r[2])}</td>
      <td><span class="delta-badge ${r[3]>=0?'pos':'neg'}">${r[3]>=0?'+':''}${curSym()}${fmt(r[3])}</span></td>
      <td><span class="delta-badge ${(r[4]||0)>=0?'pos':'neg'}">${fmtPct(r[4])}</span></td>
      <td><div class="occ-bar-wrap"><div class="occ-bar"><div class="occ-fill" style="width:${r[5]??0}%"></div></div>${fmt(r[5],1)}%</div></td>
      <td><div class="occ-bar-wrap"><div class="occ-bar"><div class="occ-fill" style="width:${r[6]??0}%"></div></div>${fmt(r[6],1)}%</div></td>
      <td>${curSym()}${fmt(r[7],2)}</td><td>${curSym()}${fmt(r[8],2)}</td>
      <td>${curSym()}${fmt(r[9],2)}</td><td>${curSym()}${fmt(r[10],2)}</td>
      <td><span class="delta-badge ${(r[11]||0)>=0?'pos':'neg'}">${curSym()}${fmt(r[11])}</span></td>
      <td><span class="delta-badge ${(r[12]||0)>=0?'pos':'neg'}">${curSym()}${fmt(r[12])}</span></td>
      <td><span class="delta-badge ${(r[13]||0)>=0?'pos':'neg'}">${fmt(r[13],1)}%</span></td>
      <td><span class="delta-badge ${(r[14]||0)>=0?'pos':'neg'}">${curSym()}${fmt(r[14])}</span></td>
    </tr>`).join('');
  document.querySelectorAll('#mainTable thead th').forEach((th,i)=>{
    th.className=''; if(i===sortCol) th.className=sortDir>0?'sort-asc':'sort-desc';
  });
}

function sortTable(col){ if(sortCol===col) sortDir*=-1; else{sortCol=col;sortDir=1;} buildMainTable(); }
function filterTable(){ const q=document.getElementById('tableSearch').value.toLowerCase(); document.querySelectorAll('#mainTableBody tr').forEach(tr=>{ tr.style.display=tr.cells[0]?.textContent.toLowerCase().includes(q)?'':'none'; }); }

function buildRevTable(){
  const hotels=getActiveHotels();
  document.getElementById('revTableBody').innerHTML=hotels.map(h=>{
    const r=RAW.hotels_rev[h],op=RAW.hotels_ops[h]; if(!r||!op) return '';
    const t25=n(op['Receita Total'][YR_PREV]),t26=n(op['Receita Total'][YR_CUR]),vP=t25>0?(t26-t25)/t25*100:null;
    return `<tr>
      <td><div class="td-hotel-name"><div class="hotel-dot"></div>${h}</div></td>
      <td>${curSym()}${fmt(n(r.ALOJAMENTO?.[YR_PREV]))}</td><td>${curSym()}${fmt(n(r.ALOJAMENTO?.[YR_CUR]))}</td>
      <td>${curSym()}${fmt(n(r.ALIMENTACAO?.[YR_PREV]))}</td><td>${curSym()}${fmt(n(r.ALIMENTACAO?.[YR_CUR]))}</td>
      <td>${curSym()}${fmt(n(r.DIVERSOS?.[YR_PREV]))}</td><td>${curSym()}${fmt(n(r.DIVERSOS?.[YR_CUR]))}</td>
      <td>${curSym()}${fmt(t25)}</td><td>${curSym()}${fmt(t26)}</td>
      <td><span class="delta-badge ${(vP||0)>=0?'pos':'neg'}">${fmtPct(vP)}</span></td>
    </tr>`;
  }).join('');
}

function buildCostTable(){
  const hotels=getActiveHotels();
  function varPct(a,b){ return a>0?(b-a)/a*100:null; }
  function varBadge(v){ if(v==null) return '—'; const cls=v<=0?'pos':'neg'; return `<span class="delta-badge ${cls}">${v>=0?'+':''}${fmt(v,1)}%</span>`; }
  document.getElementById('costTableBody').innerHTML=hotels.map(h=>{
    const c=RAW.hotels_costs[h]; if(!c) return '';
    const p25=n(c.PESSOAL?.[YR_PREV]),    p26=n(c.PESSOAL?.[YR_CUR]);
    const co25=n(c.COMIDAS?.[YR_PREV]),   co26=n(c.COMIDAS?.[YR_CUR]);
    const b25=n(c.BEBIDAS?.[YR_PREV]),    b26=n(c.BEBIDAS?.[YR_CUR]);
    const e25=n(c.ENERGIA?.[YR_PREV]),    e26=n(c.ENERGIA?.[YR_CUR]);
    const t25=totalCosts(h,YR_PREV),      t26=totalCosts(h,YR_CUR);
    return `<tr>
      <td><div class="td-hotel-name"><div class="hotel-dot"></div>${h}</div></td>
      <td>${curSym()}${fmt(p25)}</td><td>${curSym()}${fmt(p26)}</td><td>${varBadge(varPct(p25,p26))}</td>
      <td>${curSym()}${fmt(co25)}</td><td>${curSym()}${fmt(co26)}</td><td>${varBadge(varPct(co25,co26))}</td>
      <td>${curSym()}${fmt(b25)}</td><td>${curSym()}${fmt(b26)}</td><td>${varBadge(varPct(b25,b26))}</td>
      <td>${curSym()}${fmt(e25)}</td><td>${curSym()}${fmt(e26)}</td><td>${varBadge(varPct(e25,e26))}</td>
      <td>${curSym()}${fmt(t25)}</td><td><strong>${curSym()}${fmt(t26)}</strong></td><td>${varBadge(varPct(t25,t26))}</td>
    </tr>`;
  }).join('');
}

function buildCostFbRatioTable(){
  const hotels=getActiveHotels();
  const ppBadge = (v) => {
    if(v==null || !isFinite(v)) return '—';
    const cls = v<=0 ? 'pos' : 'neg'; // em custos, redução do rácio é positiva
    return `<span class="delta-badge ${cls}">${v>=0?'+':''}${fmt(v,1)} p.p.</span>`;
  };
  const pct = v => (v==null || !isFinite(v)) ? '—' : fmt(v,1)+'%';
  const body=document.getElementById('costFbRatioTableBody');
  if(!body) return;
  body.innerHTML=hotels.map(h=>{
    const rc25=ratioComidas(h,YR_PREV), rc26=ratioComidas(h,YR_CUR);
    const rb25=ratioBebidas(h,YR_PREV), rb26=ratioBebidas(h,YR_CUR);
    const ra25=ratioAB(h,YR_PREV),      ra26=ratioAB(h,YR_CUR);
    if(rc25==null && rc26==null && rb25==null && rb26==null && ra25==null && ra26==null) return '';
    return `<tr>
      <td><div class="td-hotel-name"><div class="hotel-dot"></div>${h}</div></td>
      <td>${pct(rc25)}</td><td>${pct(rc26)}</td><td>${ppBadge(rc26!=null&&rc25!=null?rc26-rc25:null)}</td>
      <td>${pct(rb25)}</td><td>${pct(rb26)}</td><td>${ppBadge(rb26!=null&&rb25!=null?rb26-rb25:null)}</td>
      <td>${pct(ra25)}</td><td><strong>${pct(ra26)}</strong></td><td>${ppBadge(ra26!=null&&ra25!=null?ra26-ra25:null)}</td>
    </tr>`;
  }).join('');
}

function buildKpiTable(){
  const hotels=getActiveHotels();
  function varPct(a,b){ return a>0 ? (b-a)/a*100 : null; }
  function varBadge(v, decimals=1){
    if(v==null || !isFinite(v)) return '—';
    const cls = v>=0 ? 'pos' : 'neg';
    return `<span class="delta-badge ${cls}">${v>=0?'+':''}${fmt(v,decimals)}%</span>`;
  }
  function ppBadge(v){
    if(v==null || !isFinite(v)) return '—';
    const cls = v>=0 ? 'pos' : 'neg';
    return `<span class="delta-badge ${cls}">${v>=0?'+':''}${fmt(v,1)} p.p.</span>`;
  }
  document.getElementById('kpiTableBody').innerHTML=hotels.map(h=>{
    const d=RAW.hotels_ops[h]; if(!d) return '';
    const occ25=occ(h,YR_PREV), occ26=occ(h,YR_CUR);
    const adr25=adr(h,YR_PREV), adr26=adr(h,YR_CUR);
    const rp25=revpar(h,YR_PREV), rp26=revpar(h,YR_CUR);
    const trp25=trevpar(h,YR_PREV), trp26=trevpar(h,YR_CUR);
    const g25=gop(h,YR_PREV), g26=gop(h,YR_CUR);
    const gp25=gopPct(h,YR_PREV), gp26=gopPct(h,YR_CUR);
    const gn25=gopMinusNop(h,YR_PREV), gn26=gopMinusNop(h,YR_CUR);
    const dorm25=n(d.Dormidas?.[YR_PREV]), dorm26=n(d.Dormidas?.[YR_CUR]);
    return `<tr>
      <td><div class="td-hotel-name"><div class="hotel-dot"></div>${h}</div></td>
      <td>${fmt(occ25,1)}%</td><td>${fmt(occ26,1)}%</td><td>${varBadge(varPct(occ25,occ26))}</td>
      <td>${curSym()}${fmt(adr25,2)}</td><td>${curSym()}${fmt(adr26,2)}</td><td>${varBadge(varPct(adr25,adr26))}</td>
      <td>${curSym()}${fmt(rp25,2)}</td><td>${curSym()}${fmt(rp26,2)}</td><td>${varBadge(varPct(rp25,rp26))}</td>
      <td>${curSym()}${fmt(trp25,2)}</td><td>${curSym()}${fmt(trp26,2)}</td><td>${varBadge(varPct(trp25,trp26))}</td>
      <td><span class="delta-badge ${(g25||0)>=0?'pos':'neg'}">${curSym()}${fmt(g25)}</span></td>
      <td><span class="delta-badge ${(g26||0)>=0?'pos':'neg'}">${curSym()}${fmt(g26)}</span></td>
      <td>${varBadge(varPct(Math.abs(g25||0), Math.abs(g25||0) + ((g26||0)-(g25||0))))}</td>
      <td><span class="delta-badge ${(gp25||0)>=0?'pos':'neg'}">${fmt(gp25,1)}%</span></td>
      <td><span class="delta-badge ${(gp26||0)>=0?'pos':'neg'}">${fmt(gp26,1)}%</span></td>
      <td>${ppBadge((gp26||0)-(gp25||0))}</td>
      <td><span class="delta-badge ${(gn25||0)>=0?'pos':'neg'}">${curSym()}${fmt(gn25)}</span></td>
      <td><span class="delta-badge ${(gn26||0)>=0?'pos':'neg'}">${curSym()}${fmt(gn26)}</span></td>
      <td>${varBadge(varPct(Math.abs(gn25||0), Math.abs(gn25||0) + ((gn26||0)-(gn25||0))))}</td>
      <td>${fmt(dorm25)}</td><td>${fmt(dorm26)}</td><td>${varBadge(varPct(dorm25,dorm26))}</td>
    </tr>`;
  }).join('');
}

// ==========================================================
// EXPORTAÇÃO PDF — TABELAS KPIs / CUSTOS (por região)
// ==========================================================
const TBLPDF_REGION_NAMES = { todos:'Todos os hotéis', norte:'Norte e Centro', lisboa:'Lisboa & Ilhas', alentejo:'Alentejo', algarve:'Algarve' };

function tblPdfHotelsForRegion(region){
  if(!RAW || !RAW.hotel_list) return [];
  if(region === 'todos') return RAW.hotel_list.slice();
  const lista = (REGIOES && REGIOES[region]) ? REGIOES[region] : [];
  return lista.filter(h => RAW.hotel_list.includes(h));
}

function tblPdfPeriodoLabel(){
  const meses = [...selectedMeses].sort((a,b)=>a-b).map(m=>MES_NOME[m]||m);
  if(!meses.length) return '—';
  return meses.join(' + ');
}

// Abre o modal de escolha de região
function tblPdfShowModal(kind){
  const modal = document.getElementById('tblPdfModal');
  if(!modal) return;
  modal.dataset.kind = kind;
  document.getElementById('tblPdfTitle').textContent =
    kind === 'kpis' ? '📄 Exportar tabela KPIs (PDF)' : '📄 Exportar tabela de Custos (PDF)';
  // pré-selecciona a região activa
  const sel = document.getElementById('tblPdfRegionSel');
  if(sel) sel.value = (activeRegion && activeRegion !== null) ? activeRegion : 'todos';
  modal.style.display = 'flex';
}
function tblPdfHideModal(){
  const m = document.getElementById('tblPdfModal');
  if(m) m.style.display = 'none';
}
function tblPdfExport(){
  const modal = document.getElementById('tblPdfModal');
  const kind = modal ? modal.dataset.kind : 'kpis';
  const region = document.getElementById('tblPdfRegionSel')?.value || 'todos';
  const orient = document.querySelector('input[name="tblPdfOrient"]:checked')?.value || 'landscape';
  tblPdfHideModal();
  tblPdfBuild(kind, region, orient);
}

// pequenos helpers de cálculo (reutilizam as funções globais da app)
function _tpVar(a,b){ return a>0 ? (b-a)/a*100 : null; }
function _tpBadge(v, dec=1){
  if(v==null || !isFinite(v)) return '<span class="d">—</span>';
  const cls = v>=0 ? 'pos' : 'neg';
  return `<span class="d ${cls}">${v>=0?'+':''}${fmt(v,dec)}%</span>`;
}
function _tpPP(v){
  if(v==null || !isFinite(v)) return '<span class="d">—</span>';
  const cls = v>=0 ? 'pos' : 'neg';
  return `<span class="d ${cls}">${v>=0?'+':''}${fmt(v,1)} p.p.</span>`;
}

function tblPdfKpiRows(hotels){
  return hotels.map(h=>{
    const d=RAW.hotels_ops[h]; if(!d) return '';
    const occ25=occ(h,YR_PREV), occ26=occ(h,YR_CUR);
    const adr25=adr(h,YR_PREV), adr26=adr(h,YR_CUR);
    const rp25=revpar(h,YR_PREV), rp26=revpar(h,YR_CUR);
    const trp25=trevpar(h,YR_PREV), trp26=trevpar(h,YR_CUR);
    const g25=gop(h,YR_PREV), g26=gop(h,YR_CUR);
    const gp25=gopPct(h,YR_PREV), gp26=gopPct(h,YR_CUR);
    const dorm25=n(d.Dormidas?.[YR_PREV]), dorm26=n(d.Dormidas?.[YR_CUR]);
    const gVar=_tpVar(Math.abs(g25||0), Math.abs(g25||0)+((g26||0)-(g25||0)));
    return `<tr>
      <td class="hn">${h}</td>
      <td>${fmt(occ25,1)}%</td><td>${fmt(occ26,1)}%</td><td>${_tpBadge(_tpVar(occ25,occ26))}</td>
      <td>${curSym()}${fmt(adr25,2)}</td><td>${curSym()}${fmt(adr26,2)}</td><td>${_tpBadge(_tpVar(adr25,adr26))}</td>
      <td>${curSym()}${fmt(rp25,2)}</td><td>${curSym()}${fmt(rp26,2)}</td><td>${_tpBadge(_tpVar(rp25,rp26))}</td>
      <td>${curSym()}${fmt(trp25,2)}</td><td>${curSym()}${fmt(trp26,2)}</td><td>${_tpBadge(_tpVar(trp25,trp26))}</td>
      <td>${curSym()}${fmt(g25)}</td><td>${curSym()}${fmt(g26)}</td><td>${_tpBadge(gVar)}</td>
      <td>${fmt(gp25,1)}%</td><td>${fmt(gp26,1)}%</td><td>${_tpPP((gp26||0)-(gp25||0))}</td>
      <td>${fmt(dorm25)}</td><td>${fmt(dorm26)}</td><td>${_tpBadge(_tpVar(dorm25,dorm26))}</td>
    </tr>`;
  }).join('');
}

function tblPdfCostRows(hotels){
  return hotels.map(h=>{
    const c=RAW.hotels_costs[h]; if(!c) return '';
    const p25=n(c.PESSOAL?.[YR_PREV]),  p26=n(c.PESSOAL?.[YR_CUR]);
    const co25=n(c.COMIDAS?.[YR_PREV]), co26=n(c.COMIDAS?.[YR_CUR]);
    const b25=n(c.BEBIDAS?.[YR_PREV]),  b26=n(c.BEBIDAS?.[YR_CUR]);
    const e25=n(c.ENERGIA?.[YR_PREV]),  e26=n(c.ENERGIA?.[YR_CUR]);
    const t25=totalCosts(h,YR_PREV),    t26=totalCosts(h,YR_CUR);
    return `<tr>
      <td class="hn">${h}</td>
      <td>${curSym()}${fmt(p25)}</td><td>${curSym()}${fmt(p26)}</td><td>${_tpBadge(_tpVar(p25,p26))}</td>
      <td>${curSym()}${fmt(co25)}</td><td>${curSym()}${fmt(co26)}</td><td>${_tpBadge(_tpVar(co25,co26))}</td>
      <td>${curSym()}${fmt(b25)}</td><td>${curSym()}${fmt(b26)}</td><td>${_tpBadge(_tpVar(b25,b26))}</td>
      <td>${curSym()}${fmt(e25)}</td><td>${curSym()}${fmt(e26)}</td><td>${_tpBadge(_tpVar(e25,e26))}</td>
      <td>${curSym()}${fmt(t25)}</td><td><strong>${curSym()}${fmt(t26)}</strong></td><td>${_tpBadge(_tpVar(t25,t26))}</td>
    </tr>`;
  }).join('');
}

// Totais/subtotais da região (linha de rodapé)
function tblPdfCostTotalsRow(hotels){
  let p25=0,p26=0,co25=0,co26=0,b25=0,b26=0,e25=0,e26=0,t25=0,t26=0;
  hotels.forEach(h=>{
    const c=RAW.hotels_costs[h]; if(!c) return;
    p25+=n(c.PESSOAL?.[YR_PREV]);  p26+=n(c.PESSOAL?.[YR_CUR]);
    co25+=n(c.COMIDAS?.[YR_PREV]); co26+=n(c.COMIDAS?.[YR_CUR]);
    b25+=n(c.BEBIDAS?.[YR_PREV]);  b26+=n(c.BEBIDAS?.[YR_CUR]);
    e25+=n(c.ENERGIA?.[YR_PREV]);  e26+=n(c.ENERGIA?.[YR_CUR]);
    t25+=n(totalCosts(h,YR_PREV)); t26+=n(totalCosts(h,YR_CUR));
  });
  return `<tr class="tot">
    <td class="hn">TOTAL</td>
    <td>${curSym()}${fmt(p25)}</td><td>${curSym()}${fmt(p26)}</td><td>${_tpBadge(_tpVar(p25,p26))}</td>
    <td>${curSym()}${fmt(co25)}</td><td>${curSym()}${fmt(co26)}</td><td>${_tpBadge(_tpVar(co25,co26))}</td>
    <td>${curSym()}${fmt(b25)}</td><td>${curSym()}${fmt(b26)}</td><td>${_tpBadge(_tpVar(b25,b26))}</td>
    <td>${curSym()}${fmt(e25)}</td><td>${curSym()}${fmt(e26)}</td><td>${_tpBadge(_tpVar(e25,e26))}</td>
    <td>${curSym()}${fmt(t25)}</td><td><strong>${curSym()}${fmt(t26)}</strong></td><td>${_tpBadge(_tpVar(t25,t26))}</td>
  </tr>`;
}

function tblPdfBuild(kind, region, orient){
  if(!RAW || !RAW.hotel_list){ showToast('Sem dados carregados', true); return; }
  const hotels = tblPdfHotelsForRegion(region);
  if(!hotels.length){ showToast('Sem hotéis nesta região', true); return; }

  const regLabel = TBLPDF_REGION_NAMES[region] || region;
  const periodo = tblPdfPeriodoLabel();
  const geradoEm = new Date().toLocaleString('pt-PT');
  const isKpi = kind === 'kpis';
  const titulo = isKpi ? 'KPIs por Hotel' : 'Custos por Categoria — ' + YR_PREV + ' vs ' + YR_CUR;

  let thead, rows;
  if(isKpi){
    thead = `<tr>
      <th class="hn">Hotel</th>
      <th>Occ ${YR_PREV.slice(2)}</th><th>Occ ${YR_CUR.slice(2)}</th><th>Var%</th>
      <th>ADR ${YR_PREV.slice(2)}</th><th>ADR ${YR_CUR.slice(2)}</th><th>Var%</th>
      <th>RevPAR ${YR_PREV.slice(2)}</th><th>RevPAR ${YR_CUR.slice(2)}</th><th>Var%</th>
      <th>TRevPAR ${YR_PREV.slice(2)}</th><th>TRevPAR ${YR_CUR.slice(2)}</th><th>Var%</th>
      <th>GOP ${YR_PREV}</th><th>GOP ${YR_CUR}</th><th>Var%</th>
      <th>GOP% ${YR_PREV.slice(2)}</th><th>GOP% ${YR_CUR.slice(2)}</th><th>Var p.p.</th>
      <th>Dorm. ${YR_PREV.slice(2)}</th><th>Dorm. ${YR_CUR.slice(2)}</th><th>Var%</th>
    </tr>`;
    rows = tblPdfKpiRows(hotels);
  } else {
    thead = `<tr>
      <th class="hn">Hotel</th>
      <th>Pessoal ${YR_PREV.slice(2)}</th><th>Pessoal ${YR_CUR.slice(2)}</th><th>Var%</th>
      <th>Comidas ${YR_PREV.slice(2)}</th><th>Comidas ${YR_CUR.slice(2)}</th><th>Var%</th>
      <th>Bebidas ${YR_PREV.slice(2)}</th><th>Bebidas ${YR_CUR.slice(2)}</th><th>Var%</th>
      <th>Energia ${YR_PREV.slice(2)}</th><th>Energia ${YR_CUR.slice(2)}</th><th>Var%</th>
      <th>Total ${YR_PREV.slice(2)}</th><th>Total ${YR_CUR.slice(2)}</th><th>Var%</th>
    </tr>`;
    rows = tblPdfCostRows(hotels) + tblPdfCostTotalsRow(hotels);
  }

  const css = `
    @page { size: A4 ${orient}; margin: 10mm; }
    * { box-sizing: border-box; }
    html,body { margin:0; padding:0; background:#fff; color:#1a1a1a;
      font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
    .doc { padding: 18px 20px; }
    .head { display:flex; justify-content:space-between; align-items:flex-start;
      border-bottom:2px solid #8a1a1a; padding-bottom:10px; margin-bottom:14px; }
    .brand { font-size:11px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; color:#8a1a1a; }
    .h-title { font-size:18px; font-weight:800; margin:2px 0 0; color:#111; }
    .h-sub { font-size:11px; color:#555; margin-top:4px; }
    .meta { text-align:right; font-size:10px; color:#666; line-height:1.6; }
    .meta .reg { display:inline-block; background:#f3e9e0; color:#8a1a1a; font-weight:800;
      padding:3px 10px; border-radius:20px; font-size:11px; }
    table { width:100%; border-collapse:collapse; font-size:8.4px; }
    thead th { background:#0f2040; color:#fff; font-weight:700; padding:5px 4px;
      text-align:right; white-space:nowrap; border-bottom:1px solid #0f2040; }
    thead th.hn { text-align:left; }
    tbody td { padding:4px 4px; text-align:right; white-space:nowrap; border-bottom:1px solid #eee; }
    tbody td.hn { text-align:left; font-weight:700; color:#111; max-width:140px; white-space:normal; }
    tbody tr:nth-child(even) td { background:#fafafa; }
    tbody tr.tot td { border-top:2px solid #0f2040; background:#f0f3f8 !important; font-weight:800; }
    .d { font-weight:700; padding:1px 4px; border-radius:4px; font-size:8px; }
    .d.pos { color:#0a7d3f; background:#e7f6ee; }
    .d.neg { color:#b3261e; background:#fbe9e7; }
    .foot { margin-top:14px; font-size:9px; color:#888; display:flex; justify-content:space-between;
      border-top:1px solid #eee; padding-top:8px; }
    .actions { text-align:center; margin:18px 0; }
    .actions button { background:#0f2040; color:#fff; border:none; padding:11px 26px;
      border-radius:8px; font-size:13px; font-weight:700; cursor:pointer; margin:0 6px; }
    .actions button.sec { background:#e5e7eb; color:#111; }
    @media print { .actions { display:none; } .doc { padding:0; } }
  `;

  const html = `<!doctype html><html lang="pt"><head><meta charset="utf-8">
    <title>${titulo} — ${regLabel}</title><style>${css}</style></head>
    <body>
      <div class="actions">
        <button onclick="window.print()">🖨 Imprimir / Guardar PDF</button>
        <button class="sec" onclick="window.close()">Fechar</button>
      </div>
      <div class="doc">
        <div class="head">
          <div>
            <div class="brand">Vila Galé · Direção de Operações</div>
            <div class="h-title">${titulo}</div>
            <div class="h-sub">Comparativo ${YR_PREV} vs ${YR_CUR} · Período: ${periodo}</div>
          </div>
          <div class="meta">
            <div class="reg">${regLabel}</div>
            <div style="margin-top:6px">${hotels.length} ${hotels.length===1?'hotel':'hotéis'}</div>
            <div>Gerado em ${geradoEm}</div>
          </div>
        </div>
        <table><thead>${thead}</thead><tbody>${rows}</tbody></table>
        <div class="foot">
          <span>Vila Galé Hotéis — documento interno</span>
          <span>${titulo} · ${regLabel} · ${periodo}</span>
        </div>
      </div>
      <script>window.onload=function(){setTimeout(function(){try{window.print();}catch(e){}},350);};<\/script>
    </body></html>`;

  const w = window.open('', '_blank');
  if(!w){ showToast('Permite pop-ups para gerar o PDF', true); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

// ==========================================================
// TOAST
// ==========================================================
function showToast(msg, isError=false){
  const t=document.getElementById('toast');
  document.getElementById('toastMsg').textContent=msg;
  document.getElementById('toastIcon').textContent=isError?'✗':'✓';
  t.className='toast'+(isError?' error':'');
  void t.offsetWidth;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3500);
}

// ==========================================================
// REFRESH
// ==========================================================
function refreshAll(){
  if(currentView === 'reputacao') { rtRender(); return; }
  if(currentView === 'vendassv') { svRender(); return; }
  { var _yw=document.getElementById('yearBtnsWrap'); if(_yw) _yw.style.display = (currentView==='compras') ? '' : 'none'; }
  if(currentView === 'agenda') { if(typeof vgAgendaRefresh==='function') vgAgendaRefresh(false); else if(typeof wxInit==='function') wxInit(); return; }
  if(currentView === 'compras') { if(typeof cdRender==='function') cdRender(); return; }
  if(currentView === 'datacenter') { if(typeof dcRender==='function') dcRender(); if(typeof dcLoadHistory==='function') dcLoadHistory(false); return; }
  if(currentView === 'governance') { if(typeof governanceLoad==='function') governanceLoad(false); return; }
  if(currentView === 'backup') { if(typeof backupRecoveryLoad==='function') backupRecoveryLoad(false); return; }
  if(currentView === 'documents') { if(typeof documentManagementRender==='function') documentManagementRender(); return; }
  if(currentView === 'approvals') { if(typeof approvalsRender==='function') approvalsRender(); return; }
  if(currentView === 'scenariocompare') { if(typeof scenarioComparisonRender==='function') scenarioComparisonRender(); return; }
  if(currentView === 'hoteis') { if(typeof hoteisInit==='function') hoteisInit(); return; }
  if(currentView === 'ocupacao') { if(typeof occRender==='function') occRender(); return; }
  if(currentView === 'instagram') { if(typeof igRender==='function') igRender(); return; }
  if(currentView === 'recdet' || currentView === 'receitasdet') { if(typeof rdRender==='function') rdRender(); window.VG?.domains33?.refresh?.('receitasdet'); return; }
  if(currentView === 'ab') { window.VG?.domains33?.refresh?.('ab'); return; }
  if(currentView === 'housekeeping') { window.VG?.domains33?.refresh?.('housekeeping'); return; }
  if(!RAW) { try{window.VG?.market?.syncMarketDataUi?.();}catch(e){} return; }
  try{window.VG?.market?.syncMarketDataUi?.();}catch(e){}
  buildKPIs('kpiGrid');
  updateContextPanel();
  if(currentView==='resumo'){ if(typeof opsCenterRender==='function') opsCenterRender(); buildChartsResumo(); buildMainTable(); aiRenderGlobalInsights(); }
  else if(currentView==='receitas'){ buildChartsReceitas(); buildRevTable(); }
  else if(currentView==='custos'){
    try { buildChartsCustos(); } catch(err) { console.error('Erro nos gráficos de custos', err); }
    try { buildCostTable(); } catch(err) { console.error('Erro na tabela de custos', err); }
    try { buildCostFbRatioTable(); } catch(err) { console.error('Erro na tabela de rácios A&B', err); }
  }
  else if(currentView==='kpis'){ buildKPIs('kpiGridDetail'); buildChartsKpis(); buildKpiTable(); }
  else if(currentView==='fichahotel'){ hsRender(); }
  else if(currentView==='hotelperformance'){ if(typeof hotelPerformanceRender==='function') hotelPerformanceRender(); }
  else if(currentView==='automaticreports'){ if(typeof automaticReportsRender==='function') automaticReportsRender(); }
  else if(currentView==='analyticalassistant'){ if(typeof analyticalAssistantRender==='function') analyticalAssistantRender(); }
  else if(currentView==='pl'){ plRender(); }
  else if(currentView==='costanalysis'){ caRender(); }
  else if(currentView==='cua'){ cuaRender(); }
  else if(currentView==='alertas'){ alertasRender(); }
  else if(currentView==='compare'){ cmpInit(); }
  else if(currentView==='ranking'){ rankRender(); }
  else if(currentView==='sazonalidade'){ sazonRender(); }
  else if(currentView==='simulador'){ simInit(); }
  else if(currentView==='orcamento'){ orcRender(); }
  else if(currentView==='benchmark'){ if(typeof benchmarkRender==='function') benchmarkRender(); }
  else if(currentView==='anomalies'){ if(typeof vgAnomalyRender==='function') vgAnomalyRender(); }
  else if(currentView==='forecast'){ if(typeof forecastRender==='function') forecastRender(); }
  else if(currentView==='revenueint'){ riRender(); }
  try { refreshDynamicYearText(); } catch(e){}
  window.VG?.state?.changed('refresh-all', { view: currentView });
}



