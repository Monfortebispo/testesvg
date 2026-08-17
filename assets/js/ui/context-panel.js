// ==========================================================
// MANUAL REFRESH
// ==========================================================
// ==========================================================
// CONTEXT PANEL — persistent right-column KPIs
// ==========================================================
const CTX_KPI_STORAGE_KEY = 'vg_ctx_kpis_visible_v2';
let ctxKpiEditorMode = null;

function ctxDefaultKpiIds() {
  return ['rec_total','gop','occupancy','adr','hotels'];
}

function ctxLoadVisibleKpis(availableIds) {
  let ids = null;
  try { ids = JSON.parse(localStorage.getItem(CTX_KPI_STORAGE_KEY) || 'null'); } catch(e) { ids = null; }
  if (!Array.isArray(ids) || !ids.length) ids = ctxDefaultKpiIds();
  ids = ids.filter(id => availableIds.includes(id));
  return ids.length ? ids : ctxDefaultKpiIds().filter(id => availableIds.includes(id));
}

function ctxSaveVisibleKpis(ids) {
  localStorage.setItem(CTX_KPI_STORAGE_KEY, JSON.stringify(ids));
}

function toggleCtxKpiEditor(mode) {
  ctxKpiEditorMode = (ctxKpiEditorMode === mode) ? null : mode;
  updateContextPanel();
}

function ctxToggleKpi(id) {
  if (!RAW) return;
  const available = buildContextKpiData();
  const allIds = available.map(k => k.id);
  let visible = ctxLoadVisibleKpis(allIds);
  if (visible.includes(id)) {
    if (visible.length === 1) { showToast('Mantém pelo menos um indicador no portfólio', true); return; }
    visible = visible.filter(x => x !== id);
  } else {
    visible.push(id);
  }
  ctxSaveVisibleKpis(visible);
  updateContextPanel();
}

function buildContextKpiData() {
  const hotels = getActiveHotels();
  const totRec26 = hotels.reduce((s,h) => s + n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_CUR]), 0);
  const totRec25 = hotels.reduce((s,h) => s + n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_PREV]), 0);
  const totAloj26 = hotels.reduce((s,h) => s + n(RAW.hotels_ops[h]?.['Receita Alojamento']?.[YR_CUR]), 0);
  const totAloj25 = hotels.reduce((s,h) => s + n(RAW.hotels_ops[h]?.['Receita Alojamento']?.[YR_PREV]), 0);
  const totFb26 = hotels.reduce((s,h) => s + n(RAW.hotels_ops[h]?.['Receita FB']?.[YR_CUR]), 0);
  const totFb25 = hotels.reduce((s,h) => s + n(RAW.hotels_ops[h]?.['Receita FB']?.[YR_PREV]), 0);
  const totCost26 = hotels.reduce((s,h) => s + n(RAW.hotels_costs[h]?.TOTAIS?.[YR_CUR]), 0);
  const totCost25 = hotels.reduce((s,h) => s + n(RAW.hotels_costs[h]?.TOTAIS?.[YR_PREV]), 0);
  const gop26 = totRec26 - totCost26, gop25 = totRec25 - totCost25; // GOP sem sede calculado
  const gopPct26 = totRec26 > 0 ? gop26/totRec26*100 : 0;
  const gopPct25 = totRec25 > 0 ? gop25/totRec25*100 : 0;

  // GOP COM SEDE — soma mês a mês (cada STORE[m] tem o valor do mês, não acumulado)
  const gopMeses = [...selectedMeses].sort((a,b)=>a-b).filter(m => m in STORE);
  const gopComSede26 = gopMeses.reduce((s,m) => {
    const snap = STORE[m];
    return s + hotels.reduce((hs,h) => hs + n(officialOpVal(h,'GOP COM SEDE',YR_CUR,snap)), 0);
  }, 0);
  const gopComSede25 = gopMeses.reduce((s,m) => {
    const snap = STORE[m];
    return s + hotels.reduce((hs,h) => hs + n(officialOpVal(h,'GOP COM SEDE',YR_PREV,snap)), 0);
  }, 0);
  const hasGopComSede = gopMeses.length > 0 && hotels.some(h => officialOpVal(h,'GOP COM SEDE',YR_CUR,STORE[gopMeses[0]]) != null);
  const gopComSedePct26 = totRec26 > 0 ? gopComSede26/totRec26*100 : 0;
  const gopComSedePct25 = totRec25 > 0 ? gopComSede25/totRec25*100 : 0;
  const totDisp26 = hotels.reduce((s,h) => s + n(RAW.hotels_ops[h]?.Disponiveis?.[YR_CUR]), 0);
  const totDisp25 = hotels.reduce((s,h) => s + n(RAW.hotels_ops[h]?.Disponiveis?.[YR_PREV]), 0);
  const totOcup26 = hotels.reduce((s,h) => s + n(RAW.hotels_ops[h]?.Ocupados?.[YR_CUR]), 0);
  const totOcup25 = hotels.reduce((s,h) => s + n(RAW.hotels_ops[h]?.Ocupados?.[YR_PREV]), 0);
  const totDorm26 = hotels.reduce((s,h) => s + n(RAW.hotels_ops[h]?.Dormidas?.[YR_CUR]), 0);
  const totDorm25 = hotels.reduce((s,h) => s + n(RAW.hotels_ops[h]?.Dormidas?.[YR_PREV]), 0);
  const occVal = totDisp26 > 0 ? totOcup26/totDisp26*100 : 0;
  const occVal25 = totDisp25 > 0 ? totOcup25/totDisp25*100 : 0;
  const adrVal = totOcup26 > 0 ? totAloj26/totOcup26 : 0;
  const adrVal25 = totOcup25 > 0 ? totAloj25/totOcup25 : 0;
  const revparVal = totDisp26 > 0 ? totAloj26/totDisp26 : 0;
  const revparVal25 = totDisp25 > 0 ? totAloj25/totDisp25 : 0;
  const trevparVal = totDisp26 > 0 ? totRec26/totDisp26 : 0;
  const costPct26 = totRec26 > 0 ? totCost26/totRec26*100 : 0;

  function varCls(v25, v26) { return v26 >= v25 ? 'pos' : 'neg'; }
  function varTxt(v25, v26) {
    if (!v25) return '';
    const p = (v26-v25)/Math.abs(v25)*100;
    return `<span class="ctx-kpi-var ${varCls(v25,v26)}">${p>=0?'+':''}${fmt(p,1)}%</span>`;
  }
  function ppTxt(v25, v26) {
    const p = v26 - v25;
    return `<span class="ctx-kpi-var ${p>=0?'pos':'neg'}">${p>=0?'+':''}${fmt(p,1)} p.p.</span>`;
  }

  return [
    { id:'rec_total', label:'Receita Total', val:fmtV(totRec26), sub: varTxt(totRec25, totRec26) },
    { id:'gop', label:'GOP SEM SEDE', val:fmtV(gop26), sub: `${fmt(gopPct26,1)}% margem ${varTxt(gop25,gop26)}` },
    { id:'gop_com_sede', label:'GOP COM SEDE', val: hasGopComSede ? fmtV(gopComSede26) : '—', sub: hasGopComSede ? `${fmt(gopComSedePct26,1)}% margem ${varTxt(gopComSede25,gopComSede26)}` : 'Carrega o Excel P&L' },
    { id:'gop_pct', label:'GOP % COM SEDE', val:fmt(hasGopComSede?gopComSedePct26:gopPct26,1)+'%', sub: `${YR_PREV}: ${fmt(hasGopComSede?gopComSedePct25:gopPct25,1)}% ${ppTxt(hasGopComSede?gopComSedePct25:gopPct25,hasGopComSede?gopComSedePct26:gopPct26)}` },
    { id:'occupancy', label:'Occupancy', val:fmt(occVal,1)+'%', sub: `${fmt(totOcup26,0)} quartos occ. ${ppTxt(occVal25,occVal)}` },
    { id:'adr', label:'ADR', val:ctxSym()+fmt(adrVal,0), sub: `RevPAR ${ctxSym()}${fmt(revparVal,0)} ${varTxt(adrVal25,adrVal)}` },
    { id:'revpar', label:'RevPAR', val:ctxSym()+fmt(revparVal,0), sub: `${YR_PREV}: ${ctxSym()}${fmt(revparVal25,0)} ${varTxt(revparVal25,revparVal)}` },
    { id:'trevpar', label:'TRevPAR', val:ctxSym()+fmt(trevparVal,0), sub: 'Receita total por quarto disponível' },
    { id:'rec_aloj', label:'Receita Alojamento', val:fmtV(totAloj26), sub: varTxt(totAloj25,totAloj26) },
    { id:'rec_fb', label:'Receita F&B', val:fmtV(totFb26), sub: varTxt(totFb25,totFb26) },
    { id:'custos', label:'Custos Totais', val:fmtV(totCost26), sub: `${fmt(costPct26,1)}% da receita ${varTxt(totCost25,totCost26)}` },
    { id:'ocupados', label:'Quartos Ocupados', val:fmt(totOcup26,0), sub: varTxt(totOcup25,totOcup26) },
    { id:'disponiveis', label:'Quartos Disponíveis', val:fmt(totDisp26,0), sub: `${YR_PREV}: ${fmt(totDisp25,0)}` },
    { id:'dormidas', label:'Dormidas', val:fmt(totDorm26,0), sub: varTxt(totDorm25,totDorm26) },
    { id:'hotels', label:'Hotéis activos', val:hotels.length, sub: `de ${RAW.hotel_list.length} no portfólio` },
  ];
}

function renderCtxKpiEditor(available, visibleIds) {
  const editor = document.getElementById('ctxKpiEditor');
  const addBtn = document.getElementById('ctxAddBtn');
  const removeBtn = document.getElementById('ctxRemoveBtn');
  if (addBtn) addBtn.classList.toggle('active', ctxKpiEditorMode === 'add');
  if (removeBtn) removeBtn.classList.toggle('active', ctxKpiEditorMode === 'remove');
  if (!editor) return;
  if (!ctxKpiEditorMode) { editor.className = 'ctx-kpi-editor'; editor.innerHTML = ''; return; }
  const title = ctxKpiEditorMode === 'add' ? 'Adicionar / activar indicadores' : 'Retirar / ocultar indicadores';
  editor.className = 'ctx-kpi-editor open';
  editor.innerHTML = `
    <div class="ctx-editor-head">${title}</div>
    <div class="ctx-editor-list">
      ${available.map(k => {
        const on = visibleIds.includes(k.id);
        return `<div class="ctx-editor-item ${on?'on':''}" onclick="ctxToggleKpi('${k.id}')">
          <span>${k.label}</span><span class="ctx-editor-toggle">${on?'−':'+'}</span>
        </div>`;
      }).join('')}
    </div>
    <div class="ctx-editor-foot">A escolha fica guardada neste browser. Use + para acrescentar e − para retirar indicadores.</div>`;
}

const ctxSym=()=>window.VG?.market?.symbol?.()||'€';
function updateContextPanel() {
  if (!RAW) return;
  const hotels = getActiveHotels();

  // Region badge
  const regionNames = { todos:'🌐 Todos', norte:'🔵 Norte', lisboa:'🟢 Lisboa', alentejo:'🟡 Alentejo', algarve:'🔴 Algarve' };
  const badge = document.getElementById('ctxRegionBadge');
  if (badge) badge.textContent = (regionNames[activeRegion] || '◻ Seleção') + ` (${hotels.length})`;

  // Active months
  const mNames = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const mStr = [...selectedMeses].sort((a,b)=>a-b).map(m=>mNames[m]).join(', ') || '—';
  const ctxM = document.getElementById('ctxMeses');
  if (ctxM) ctxM.textContent = mStr;

  const available = buildContextKpiData();
  const availableIds = available.map(k => k.id);
  const visibleIds = ctxLoadVisibleKpis(availableIds);
  const kpis = available.filter(k => visibleIds.includes(k.id));
  renderCtxKpiEditor(available, visibleIds);

  const el = document.getElementById('ctxKpis');
  if (el) el.innerHTML = kpis.map(k => `
    <div class="ctx-kpi">
      <div class="ctx-kpi-label">${k.label}</div>
      <div class="ctx-kpi-val">${k.val}</div>
      <div class="ctx-kpi-sub">${k.sub}</div>
    </div>`).join('');
}
// ==========================================================
// HASH ROUTING — restore view from URL on load
// ==========================================================
function initHashRouting() {
  const hash = window.location.hash.replace('#', '');
  const validViews = ['resumo','receitas','recdet','receitasdet','ab','housekeeping','custos','kpis','pl','costanalysis','cua','reputacao','ocupacao','instagram','agenda','hoteis','upload','alertas','compare','ranking','sazonalidade','simulador','notas'];
  if (hash && validViews.includes(hash)) {
    setView(hash);
  }
  window.addEventListener('popstate', () => {
    const h = window.location.hash.replace('#', '');
    if (h && validViews.includes(h)) setView(h);
  });
}

function manualRefresh() {
  buildMesButtons();
  if (selectedMeses.size === 0 && Object.keys(STORE).length > 0) {
    const defaultMes = Math.max(...Object.keys(STORE).map(Number));
    selectedMeses.add(defaultMes);
  }
  if (selectedMeses.size > 0) applyMesSelection();
  else refreshAll();
  // Animate the icon
  const svg = document.querySelector('.refresh-btn svg');
  if (svg) {
    svg.style.transform = 'rotate(360deg)';
    setTimeout(() => { svg.style.transform = ''; }, 400);
  }
  showToast('Separadores actualizados — ' + Object.keys(STORE).length + ' mês(es) disponíveis');
}


// ══════════════════════════════════════════════════════════
