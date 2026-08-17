// ==========================================================
// RECEITAS DETALHE MODULE
// ==========================================================
// RD_STORE: array of { id, label, mes, ano, rows }
// rows: [{ hotel, armazem, familia, subfamilia, grupo, artigo, qtd, vb, vn }]
let RD_STORE = [];

// Hotel → Region mapping
const RD_REGIAO = {
  // Algarve (10)
  'ALBACORA':'Algarve','AMPALIUS':'Algarve','ATLANTICO':'Algarve','CERRO ALAGOA':'Algarve',
  'COLLECTION PRAIA':'Algarve','LAGOS':'Algarve','MARINA':'Algarve','NAUTICO':'Algarve',
  'NEP KIDS':'Alentejo','TAVIRA':'Algarve','ISLA CANELA':'Algarve',
  // Alentejo (7)
  'ALENTEJO VINEYARDS':'Alentejo','CASAS DE ELVAS':'Alentejo','COLLECTION ALTER REAL':'Alentejo',
  'COLLECTION ELVAS':'Alentejo','COLLECTION MONTE DO VILAR':'Alentejo','EVORA':'Alentejo',
  // Lisboa & Ilhas (9)
  'CASCAIS':'Lisboa & Ilhas','COLLECTION PALACIO DOS ARCOS':'Lisboa & Ilhas',
  'COLLECTION SINTRA':'Lisboa & Ilhas','COLLECTION TOMAR':'Lisboa & Ilhas',
  'ERICEIRA':'Lisboa & Ilhas','ESTORIL':'Lisboa & Ilhas','OPERA':'Lisboa & Ilhas',
  'COLLECTION S. MIGUEL':'Lisboa & Ilhas','SANTA CRUZ':'Lisboa & Ilhas',
  // Norte e Centro (9)
  'COIMBRA':'Norte e Centro','COLLECTION BRAGA':'Norte e Centro',
  'COLLECTION DOURO':'Norte e Centro','COLLECTION FIGUEIRA DA FOZ':'Norte e Centro',
  'COLLECTION SERRA DA ESTRELA':'Norte e Centro','COLLECTION PONTE DE LIMA VINEYARDS':'Norte e Centro',
  'DOURO VINEYARDS':'Norte e Centro','PORTO':'Norte e Centro','PORTO RIBEIRA':'Norte e Centro',
};

function rdGetRegiao(hotel) {
  try{for(const [key,lista] of Object.entries(typeof REGIOES!=='undefined'?REGIOES:{})){if((lista||[]).includes(hotel))return window.VG?.market?.regionLabel?.(key)||key;}}catch(e){}
  return RD_REGIAO[hotel] || '';
}

// ── Load ──────────────────────────────────────────────────
async function rdLoadFile(file) {
  if (!file) return;
  try { if(window.VG?.performance?.ensureXLSX) await window.VG.performance.ensureXLSX(); } catch(e) { showToast('Não foi possível carregar a biblioteca Excel: '+(e.message||e), true); return; }
  showToast('A processar ficheiro...');
  try {
    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab, { type:'array' });

    // Lê todas as folhas e combina as linhas
    let allRaw = [];
    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const raw = XLSX.utils.sheet_to_json(ws, { header:1, defval:null });
      // Encontra linha de cabeçalho nesta folha
      const hdrIdx = raw.findIndex(r => r && r.includes('HOTEL'));
      if (hdrIdx < 0) continue; // folha sem cabeçalho reconhecido, ignora
      if (!allRaw.length) {
        // Primeira folha válida: inclui o cabeçalho
        allRaw = raw.slice(hdrIdx);
      } else {
        // Folhas seguintes: ignora o cabeçalho (linha hdrIdx) e acrescenta apenas dados
        allRaw = allRaw.concat(raw.slice(hdrIdx + 1));
      }
    }
    const raw = allRaw;

    // Find header row (primeira linha do allRaw já é o cabeçalho)
    const hdr = 0;
    if (!raw.length) { showToast('Formato não reconhecido', true); return; }

    const cols = raw[hdr];
    const ci = k => cols.findIndex(c => c && c.toString().toUpperCase().includes(k.toUpperCase()));
    const iHotel=ci('HOTEL'), iArm=ci('ARMAZEM'), iFam=ci('FAMILIA'), iSub=ci('SUB'),
          iGrp=ci('GRUPO'), iArt=ci('ARTIGO'), iQtd=ci('QTD'), iVb=ci('VB'),
          iVn=ci('VN')||ci('VALOR'), iAno=ci('ANO');
    const iMesTmp1=ci('MÊS'), iMesTmp2=ci('MES'), iMesTmp3=ci('ID_MES');
    const iMes = iMesTmp1 >= 0 ? iMesTmp1 : (iMesTmp2 >= 0 ? iMesTmp2 : iMesTmp3);

    const iIdMesAno = ci('ID_MES_ANO');

    const rows = [];
    let mes = '', ano = '';
    for (let i = hdr+1; i < raw.length; i++) {
      const r = raw[i];
      if (!r || !r[iHotel]) continue;
      // V31: mantém apenas as linhas do mercado ativo; PT+ES e Brasil nunca se misturam.
      if (window.VG?.market && !window.VG.market.isCurrentHotel((r[iHotel]||'').toString())) continue;
      let rawMes = r[iMes]?.toString().trim() || '';
      let rawAno = r[iAno]?.toString().replace('.0','').trim() || '';
      // Formato ID_MES = 202506 (YYYYMM) — extrai mês e ano
      if (!rawMes && iMes >= 0) rawMes = '';
      const idMesVal = rawMes || (r[iMes] != null ? String(r[iMes]).trim() : '');
      if (/^\d{6}$/.test(idMesVal)) {
        // Formato YYYYMM
        rawAno = rawAno || idMesVal.substring(0,4);
        rawMes = String(parseInt(idMesVal.substring(4,6)));
      } else if (/^\d{4}\d{2}$/.test(idMesVal.replace('.0',''))) {
        const clean = idMesVal.replace('.0','');
        rawAno = rawAno || clean.substring(0,4);
        rawMes = String(parseInt(clean.substring(4,6)));
      }
      // Se iAno não existe, tenta extrair do ID_MES_ANO
      if (!rawAno && iIdMesAno >= 0) {
        const idma = (r[iIdMesAno]||'').toString().trim();
        if (/^\d{6}$/.test(idma)) rawAno = idma.substring(0,4);
      }
      const m = rawMes || mes;
      const a = rawAno || ano;
      mes = m; ano = a;
      rows.push({
        hotel:    (r[iHotel]||'').toString().trim().toUpperCase(),
        armazem:  (r[iArm] ||'').toString().trim(),
        familia:  (r[iFam] ||'').toString().trim(),
        subfamilia:(r[iSub]||'').toString().trim(),
        grupo:    (r[iGrp] ||'').toString().trim(),
        artigo:   (r[iArt] ||'').toString().trim(),
        qtd:      parseFloat(r[iQtd])||0,
        vb:       parseFloat(r[iVb]) ||0,
        vn:       parseFloat(r[iVn]) ||0,
        mes: m, ano: a,
      });
    }

    if (!rows.length) { showToast('Nenhuma linha de dados encontrada', true); return; }

    // Get period label
    const periodos = [...new Set(rows.map(r => `${r.mes} ${r.ano}`).filter(Boolean))];
    const label = periodos.join(' + ') || file.name;

    // Check if period already exists — overwrite if so
    const existIdx = RD_STORE.findIndex(s => periodos.every(p => s.label.includes(p)));
    if (existIdx >= 0) {
      RD_STORE[existIdx] = { id: RD_STORE[existIdx].id, label, rows, loadedAt: new Date().toISOString() };
      showToast(`✓ Período actualizado — ${rows.length.toLocaleString('pt-PT')} linhas`);
    } else {
      RD_STORE.push({ id: Date.now(), label, rows, loadedAt: new Date().toISOString() });
      showToast(`✓ ${rows.length.toLocaleString('pt-PT')} linhas carregadas · ${label}`);
    uploadSetStatus('uploadStatusRD', `✓ ${rows.length.toLocaleString('pt-PT')} linhas · ${label}`, true);
    }

    rdUpdateUI();
  } catch(e) { showToast('Erro: ' + e.message, true); }
}

function rdClearAll() {
  if (!confirm('Apagar todos os dados de detalhe de receitas?')) return;
  RD_STORE = [];
  rdUpdateUI();
  showToast('Dados apagados');
}

// ── UI Update ─────────────────────────────────────────────
function rdUpdateUI() {
  const hasData = RD_STORE.length > 0;
  document.getElementById('rdEmpty').style.display  = hasData ? 'none'  : 'block';
  document.getElementById('rdMain').style.display   = hasData ? 'block' : 'none';

  // Snap chips
  document.getElementById('rdSnapChips').innerHTML = RD_STORE.map(s =>
    `<div class="rd-snap-chip"><span class="rd-snap-dot"></span>${s.label}<span class="rd-snap-del" onclick="rdDeleteSnap(${s.id})">✕</span></div>`
  ).join('');

  document.getElementById('rdStatus').textContent = hasData
    ? `${RD_STORE.length} período(s) carregado(s)`
    : 'Sem dados — carrega o Excel mensal';

  if (!hasData) return;

  // Rebuild period selector
  const periodSel = document.getElementById('rdPeriodo');
  const prevPeriod = periodSel.value;
  const allPeriodos = [...new Set(RD_STORE.flatMap(s => s.rows.map(r => `${r.mes} ${r.ano}`)).filter(Boolean))];
  // Sort by ano+mes
  const MES_ORD = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  allPeriodos.sort((a,b) => {
    const [ma,aa] = a.split(' '); const [mb,ab] = b.split(' ');
    return (+aa - +ab) || (MES_ORD.indexOf(ma.toLowerCase()) - MES_ORD.indexOf(mb.toLowerCase()));
  });
  periodSel.innerHTML = '<option value="">Todos os meses</option>' +
    allPeriodos.map(p => `<option value="${p}">${p.charAt(0).toUpperCase()+p.slice(1)}</option>`).join('');
  if (allPeriodos.includes(prevPeriod)) periodSel.value = prevPeriod;

  // Rebuild familia selector
  const famSel = document.getElementById('rdFamilia');
  const prevFam = famSel.value;
  const allFams = [...new Set(RD_STORE.flatMap(s=>s.rows.map(r=>r.familia)).filter(Boolean))].sort();
  famSel.innerHTML = '<option value="">Todas as famílias</option>' + allFams.map(f=>`<option value="${f}">${f}</option>`).join('');
  if (allFams.includes(prevFam)) famSel.value = prevFam;

  // SubFamília
  const subSel = document.getElementById('rdSubFamilia');
  const prevSub = subSel.value;
  const allSubs = [...new Set(RD_STORE.flatMap(s=>s.rows.map(r=>r.subfamilia)).filter(Boolean))].sort();
  subSel.innerHTML = '<option value="">Todas</option>' + allSubs.map(s=>`<option value="${s}">${s}</option>`).join('');
  if (allSubs.includes(prevSub)) subSel.value = prevSub;

  // Grupo
  const grpSel2 = document.getElementById('rdGrupo');
  const prevGrp = grpSel2.value;
  const allGrps = [...new Set(RD_STORE.flatMap(s=>s.rows.map(r=>r.grupo)).filter(Boolean))].sort();
  grpSel2.innerHTML = '<option value="">Todos</option>' + allGrps.map(g=>`<option value="${g}">${g}</option>`).join('');
  if (allGrps.includes(prevGrp)) grpSel2.value = prevGrp;

  rdOnRegiaoChange();
  if (typeof svUpdateFilters === 'function') svUpdateFilters();
}

function rdDeleteSnap(id) {
  if (!confirm('Remover este período?')) return;
  RD_STORE = RD_STORE.filter(s => s.id !== id);
  rdUpdateUI();
}

function rdOnRegiaoChange() {
  const regiao = document.getElementById('rdRegiao').value;
  const allHotels = [...new Set(RD_STORE.flatMap(s=>s.rows.map(r=>r.hotel)).filter(Boolean))].sort();
  const filtered  = regiao ? allHotels.filter(h => rdGetRegiao(h) === regiao) : allHotels;
  const hotelSel  = document.getElementById('rdHotel');
  // Preserve previously selected hotels that are still in filtered list
  const prevSelected = [...hotelSel.selectedOptions].map(o=>o.value);
  hotelSel.innerHTML = filtered.map(h=>`<option value="${h}">${h}</option>`).join('');
  // Restore selections
  [...hotelSel.options].forEach(o => { if (prevSelected.includes(o.value)) o.selected = true; });
  rdUpdateArmazem();
  rdRender();
  rdUpdateBadges();
}

function rdClearFilters() {
  document.getElementById('rdRegiao').value = '';
  // Deselect all hotels
  [...document.getElementById('rdHotel').options].forEach(o => o.selected = false);
  document.getElementById('rdPeriodo').value = '';
  document.getElementById('rdFamilia').value = '';
  document.getElementById('rdArmazem').value = '';
  document.getElementById('rdSubFamilia').value = '';
  document.getElementById('rdGrupo').value = '';
  rdOnRegiaoChange();
}

function rdUpdateBadges() {
  const hotels    = [...document.getElementById('rdHotel').selectedOptions].map(o=>o.value);
  const periodo   = document.getElementById('rdPeriodo').value;
  const familia   = document.getElementById('rdFamilia').value;
  const armazem   = document.getElementById('rdArmazem').value;
  const subfam    = document.getElementById('rdSubFamilia').value;
  const grupo     = document.getElementById('rdGrupo').value;
  const regiao    = document.getElementById('rdRegiao').value;

  const badges = [
    regiao  ? `Região: ${regiao}`           : '',
    ...hotels.map(h => `Hotel: ${h}`),
    periodo ? `Período: ${periodo}`          : '',
    familia ? `Família: ${familia}`          : '',
    armazem ? `PdV: ${armazem}`             : '',
    subfam  ? `Sub-fam: ${subfam}`          : '',
    grupo   ? `Grupo: ${grupo}`             : '',
  ].filter(Boolean);

  const wrap = document.getElementById('rdActiveBadges');
  const list = document.getElementById('rdBadgeList');
  if (!badges.length) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'flex';
  list.innerHTML = badges.map(b =>
    `<span style="background:var(--gold-dim);border:1px solid rgba(201,168,76,.3);color:var(--gold);border-radius:5px;padding:3px 10px;font-size:10px;font-weight:700;font-family:var(--mono)">${b}</span>`
  ).join('');
}

function rdUpdateArmazem() {
  const rows   = rdGetFilteredRows({ ignoreArmazem:true });
  const arms   = [...new Set(rows.map(r=>r.armazem).filter(Boolean))].sort();
  const armSel = document.getElementById('rdArmazem');
  const prev   = armSel.value;
  armSel.innerHTML = '<option value="">Todos os PdV</option>' + arms.map(a=>`<option value="${a}">${a}</option>`).join('');
  if (arms.includes(prev)) armSel.value = prev;
}

// ── Data filtering ────────────────────────────────────────
function rdGetFilteredRows(opts={}) {
  const hotelSel   = document.getElementById('rdHotel');
  const hotels     = hotelSel ? [...hotelSel.selectedOptions].map(o=>o.value) : [];
  const regiao     = document.getElementById('rdRegiao')?.value     || '';
  const periodo    = document.getElementById('rdPeriodo')?.value    || '';
  const familia    = document.getElementById('rdFamilia')?.value    || '';
  const armazem    = opts.ignoreArmazem ? '' : (document.getElementById('rdArmazem')?.value || '');
  const subfamilia = document.getElementById('rdSubFamilia')?.value || '';
  const grupo      = document.getElementById('rdGrupo')?.value      || '';

  return RD_STORE.flatMap(s => s.rows).filter(r => {
    if (hotels.length && !hotels.includes(r.hotel))        return false;
    if (regiao     && rdGetRegiao(r.hotel) !== regiao)      return false;
    if (periodo    && `${r.mes} ${r.ano}` !== periodo)      return false;
    if (familia    && r.familia    !== familia)              return false;
    if (armazem    && r.armazem    !== armazem)              return false;
    if (subfamilia && r.subfamilia !== subfamilia)           return false;
    if (grupo      && r.grupo      !== grupo)                return false;
    return true;
  });
}

// ── Render ────────────────────────────────────────────────
const rdCharts = {};
function rdDC(id, type, labels, datasets, opts={}) {
  if (rdCharts[id]) rdCharts[id].destroy();
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const parent = canvas.parentNode;
  const nc = document.createElement('canvas'); nc.id = id;
  parent.replaceChild(nc, canvas);
  const {plugins:_p,scales:_s,...rest} = opts;
  rdCharts[id] = new Chart(nc.getContext('2d'),{type,data:{labels,datasets},options:{
    responsive:true,maintainAspectRatio:false,
    plugins:{legend:{position:'top',labels:{color:'#94aabf',font:{size:11},padding:12}},...(_p||{})},
    scales:{x:{ticks:{color:'#64748b',font:{size:9},maxRotation:40},grid:{color:'rgba(255,255,255,.04)'}},...(_s||{})},
    ...rest
  }});
}

function rdRender() {
  if (!RD_STORE.length) return;
  rdUpdateArmazem();
  const rows = rdGetFilteredRows();
  if (!rows.length) {
    document.getElementById('rdKpis').innerHTML = '<div style="color:var(--text-3);font-size:12px">Sem dados para os filtros seleccionados.</div>';
    return;
  }

  // Aggregation helpers
  function sumBy(key, valKey='vn') {
    const acc = {};
    rows.forEach(r => {
      const k = r[key] || '(vazio)';
      acc[k] = (acc[k]||0) + r[valKey];
    });
    return Object.entries(acc).sort((a,b)=>b[1]-a[1]);
  }
  const fmtE = v => '€' + Math.abs(v).toLocaleString('pt-PT',{minimumFractionDigits:0,maximumFractionDigits:0});

  const totalVN  = rows.reduce((s,r)=>s+r.vn,0);
  const totalVB  = rows.reduce((s,r)=>s+r.vb,0);
  const totalQtd = rows.reduce((s,r)=>s+r.qtd,0);
  const nHoteis  = new Set(rows.map(r=>r.hotel)).size;
  const nPdV     = new Set(rows.map(r=>r.armazem)).size;
  const nArtigos = new Set(rows.map(r=>r.artigo)).size;

  // KPIs
  document.getElementById('rdKpis').innerHTML = [
    { lbl:'Receita Líquida (VN)', val: fmtE(totalVN), sub:`VB: ${fmtE(totalVB)}`, cls:'' },
    { lbl:'Quantidade Total',     val: totalQtd.toLocaleString('pt-PT'), sub:`${nArtigos} artigos distintos`, cls:'k-teal' },
    { lbl:'Pontos de Venda',      val: nPdV, sub:`${nHoteis} hotel(is)`, cls:'' },
    { lbl:'Desconto Médio',       val: totalVB>0 ? ((1-totalVN/totalVB)*100).toFixed(1)+'%' : '—', sub:'VN / VB', cls:'k-green' },
  ].map(k=>`<div class="rd-kpi ${k.cls}"><div class="rd-kpi-lbl">${k.lbl}</div><div class="rd-kpi-val">${k.val}</div><div class="rd-kpi-sub">${k.sub}</div></div>`).join('');

  // Chart colours
  const COLS = ['#c9a84c','#2a7d8c','#e74c3c','#9b59b6','#3498db','#27ae60','#e67e22','#1abc9c','#e91e63','#00bcd4','#ff9800','#8bc34a','#f06292','#4db6ac','#ff7043'];

  const MES_ORD2 = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const fmtTick = v => '€'+Math.round(v/1000)+'K';
  const xScale  = {ticks:{color:'#64748b',font:{size:9},maxRotation:40},grid:{color:'rgba(255,255,255,.04)'}};
  const yScale  = {ticks:{color:'#64748b',font:{size:10},callback:fmtTick},grid:{color:'rgba(255,255,255,.04)'}};
  const yScaleH = {ticks:{color:'#64748b',font:{size:9}},grid:{color:'rgba(255,255,255,.04)'}};
  const xScaleH = {ticks:{color:'#64748b',font:{size:10},callback:fmtTick},grid:{color:'rgba(255,255,255,.04)'}};

  // PdV — horizontal bars (all values visible)
  const pdvData = sumBy('armazem').filter(([,v])=>v>0).slice(0,20);
  rdDC('rdChartPdV','bar',pdvData.map(([k])=>k.length>30?k.slice(0,28)+'…':k),
    [{label:'VN',data:pdvData.map(([,v])=>v),backgroundColor:pdvData.map((_,i)=>COLS[i%COLS.length]+'cc'),borderWidth:1,borderRadius:3}],
    {indexAxis:'y',plugins:{legend:{display:false}},scales:{y:yScaleH,x:xScaleH}});

  // Família donut
  const famData = sumBy('familia').filter(([,v])=>v>0);
  rdDC('rdChartFamilia','doughnut',famData.map(([k])=>k),
    [{data:famData.map(([,v])=>v),backgroundColor:COLS.slice(0,famData.length).map(c=>c+'cc'),borderWidth:2,borderColor:'var(--surface-1)'}],
    {plugins:{legend:{position:'right',labels:{color:'#94aabf',font:{size:11},padding:10,boxWidth:12}}},cutout:'60%',scales:{x:{display:false},y:{display:false}}});

  // Grupo chart — horizontal
  const grpData = sumBy('grupo').filter(([,v])=>v>0).slice(0,15);
  rdDC('rdChartGrupo','bar',grpData.map(([k])=>k.length>28?k.slice(0,26)+'…':k),
    [{label:'VN',data:grpData.map(([,v])=>v),backgroundColor:'rgba(42,125,140,.65)',borderColor:'#2a7d8c',borderWidth:1,borderRadius:3}],
    {indexAxis:'y',plugins:{legend:{display:false}},scales:{y:yScaleH,x:xScaleH}});

  // Artigo — horizontal bars (all visible)
  const artData = sumBy('artigo').filter(([,v])=>v>0).slice(0,15);
  rdDC('rdChartArtigo','bar',artData.map(([k])=>k.length>30?k.slice(0,28)+'…':k),
    [{label:'VN',data:artData.map(([,v])=>v),backgroundColor:'rgba(201,168,76,.65)',borderColor:'#c9a84c',borderWidth:1,borderRadius:3}],
    {indexAxis:'y',plugins:{legend:{display:false}},scales:{y:yScaleH,x:xScaleH}});

  // Evolução mensal — always render (even with 1 period)
  const allPeriodos = [...new Set(RD_STORE.flatMap(s=>s.rows).map(r=>`${r.mes} ${r.ano}`).filter(Boolean))];
  allPeriodos.sort((a,b)=>{const[ma,aa]=a.split(' ');const[mb,ab]=b.split(' ');return(+aa-+ab)||(MES_ORD2.indexOf(ma.toLowerCase())-MES_ORD2.indexOf(mb.toLowerCase()));});
  const topFams = sumBy('familia').slice(0,6).map(([k])=>k);
  const allRows = RD_STORE.flatMap(s=>s.rows); // use all stored rows for evolution
  const evolDatasets = topFams.map((fam,i) => ({
    label: fam,
    data: allPeriodos.map(p => {
      const [mes,ano] = p.split(' ');
      const periodRows = rows.filter(r=>r.familia===fam);
      // if filtered to specific period use those; else use all stored data
      const base = allPeriodos.length===1 ? periodRows : allRows.filter(r=>r.familia===fam&&r.mes===mes&&r.ano===ano);
      return base.reduce((s,r)=>s+r.vn,0) || null;
    }),
    borderColor:COLS[i], backgroundColor:COLS[i]+'22',
    borderWidth:2, pointRadius:allPeriodos.length===1?6:4, tension:.35, fill:false, spanGaps:false
  }));
  rdDC('rdChartEvolucao','line',allPeriodos.map(p=>p.charAt(0).toUpperCase()+p.slice(1)),evolDatasets,
    {scales:{x:{ticks:{color:'#64748b',font:{size:10}},grid:{color:'rgba(255,255,255,.04)'}},y:{ticks:{color:'#64748b',font:{size:10},callback:fmtTick},grid:{color:'rgba(255,255,255,.04)'}}}});

  // Comparativo multi-hotel
  const selHotels = [...document.getElementById('rdHotel').selectedOptions].map(o=>o.value);
  const compHotels = selHotels.length > 0 ? selHotels : [...new Set(rows.map(r=>r.hotel))].sort();
  if (document.getElementById('rdChartComp')) {
    // One dataset per hotel, grouped by família (top 4)
    const topFamsComp = [...new Set(rows.map(r=>r.familia))].map(f=>({f,v:rows.filter(r=>r.familia===f).reduce((s,r)=>s+r.vn,0)})).sort((a,b)=>b.v-a.v).slice(0,4).map(x=>x.f);
    if (selHotels.length > 1) {
      // Multi-hotel: grouped bars per família
      const compDatasets = topFamsComp.map((fam,i) => ({
        label: fam,
        data: compHotels.map(h => rows.filter(r=>r.hotel===h&&r.familia===fam).reduce((s,r)=>s+r.vn,0)),
        backgroundColor: COLS[i]+'cc', borderColor: COLS[i], borderWidth:1, borderRadius:3
      }));
      rdDC('rdChartComp','bar',compHotels.map(h=>h.length>12?h.slice(0,10)+'…':h),compDatasets,
        {scales:{x:xScale,y:yScale}});
    } else {
      // Single hotel or all: top 10 PdV
      const compData = sumBy('armazem').filter(([,v])=>v>0).slice(0,10);
      rdDC('rdChartComp','bar',compData.map(([k])=>k.length>22?k.slice(0,20)+'…':k),
        [{label:'VN',data:compData.map(([,v])=>v),backgroundColor:compData.map((_,i)=>COLS[i%COLS.length]+'cc'),borderWidth:1,borderRadius:3}],
        {plugins:{legend:{display:false}},scales:{x:xScale,y:yScale}});
    }
  }

  // Comparativo multi-hotel
  if (document.getElementById('rdChartComp')) {
    const topFamsComp = [...new Set(rows.map(r=>r.familia))].map(f=>({f,v:rows.filter(r=>r.familia===f).reduce((s,r)=>s+r.vn,0)})).sort((a,b)=>b.v-a.v).slice(0,4).map(x=>x.f);
    if (selHotels.length > 1) {
      const compDatasets = topFamsComp.map((fam,i) => ({
        label: fam,
        data: compHotels.map(h => rows.filter(r=>r.hotel===h&&r.familia===fam).reduce((s,r)=>s+r.vn,0)),
        backgroundColor: COLS[i]+'cc', borderColor: COLS[i], borderWidth:1, borderRadius:3
      }));
      rdDC('rdChartComp','bar',compHotels.map(h=>h.length>14?h.slice(0,12)+'…':h),compDatasets,
        {scales:{x:xScale,y:yScale}});
    } else {
      const compData = sumBy('armazem').filter(([,v])=>v>0).slice(0,10);
      rdDC('rdChartComp','bar',compData.map(([k])=>k.length>22?k.slice(0,20)+'…':k),
        [{label:'VN',data:compData.map(([,v])=>v),backgroundColor:compData.map((_,i)=>COLS[i%COLS.length]+'cc'),borderWidth:1,borderRadius:3}],
        {plugins:{legend:{display:false}},scales:{x:xScale,y:yScale}});
    }
  }

  // F&B por hotel — Comidas vs Bebidas
  const fbHotels = [...new Set(rows.filter(r=>r.subfamilia==='COMIDA'||r.subfamilia==='BEBIDA').map(r=>r.hotel))].sort();
  const fbComida = fbHotels.map(h => rows.filter(r=>r.hotel===h&&r.subfamilia==='COMIDA').reduce((s,r)=>s+r.vn,0));
  const fbBebida = fbHotels.map(h => rows.filter(r=>r.hotel===h&&r.subfamilia==='BEBIDA').reduce((s,r)=>s+r.vn,0));
  if (document.getElementById('rdChartFnB')) {
    rdDC('rdChartFnB','bar',fbHotels.map(h=>h.length>14?h.slice(0,12)+'…':h),[
      {label:'Comida', data:fbComida, backgroundColor:'rgba(201,168,76,.65)',borderColor:'#c9a84c',borderWidth:1,borderRadius:3},
      {label:'Bebida', data:fbBebida, backgroundColor:'rgba(42,125,140,.65)',borderColor:'#2a7d8c',borderWidth:1,borderRadius:3},
    ],{scales:{x:{...xScale,stacked:false},y:{...yScale,stacked:false}}});
  }

  // Sub-família chart
  const subData = sumBy('subfamilia').filter(([,v])=>v>0).slice(0,12);
  if (document.getElementById('rdChartSubFam')) {
    rdDC('rdChartSubFam','bar',subData.map(([k])=>k.length>18?k.slice(0,16)+'…':k),
      [{label:'VN',data:subData.map(([,v])=>v),backgroundColor:subData.map((_,i)=>COLS[i%COLS.length]+'cc'),borderWidth:1,borderRadius:3}],
      {indexAxis:'y',plugins:{legend:{display:false}},scales:{y:yScaleH,x:xScaleH}});
  }

  // Qtd chart — top artigos por quantidade
  const qtdData = sumBy('artigo','qtd').filter(([,v])=>v>0).slice(0,15);
  if (document.getElementById('rdChartQtd')) {
    rdDC('rdChartQtd','bar',qtdData.map(([k])=>k.length>22?k.slice(0,20)+'…':k),
      [{label:'Qtd',data:qtdData.map(([,v])=>v),backgroundColor:'rgba(139,92,246,.6)',borderColor:'#8b5cf6',borderWidth:1,borderRadius:3}],
      {indexAxis:'y',plugins:{legend:{display:false}},scales:{y:yScaleH,x:{ticks:{color:'#64748b',font:{size:10}},grid:{color:'rgba(255,255,255,.04)'}}}}); 
  }

  // ═══ COMPARATIVOS POR PONTO DE VENDA ═══
  // Helper: for a given set of armazem patterns, get VN by hotel split by subfamilia keyword
  const allRows2 = RD_STORE.flatMap(s=>s.rows);

  function rdCmpChart(canvasId, armPatterns, subfamKw) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const normStr = s => s.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const matchArm = r => armPatterns.some(p => normStr(r.armazem).includes(normStr(p)));
    const matchSub = r => subfamKw ? r.subfamilia.toUpperCase().includes(subfamKw.toUpperCase()) : true;

    const baseRows = allRows2.filter(r => {
      const selH = [...document.getElementById('rdHotel').selectedOptions].map(o=>o.value);
      if (selH.length && !selH.includes(r.hotel)) return false;
      const periodo = document.getElementById('rdPeriodo').value;
      if (periodo && `${r.mes} ${r.ano}` !== periodo) return false;
      return matchArm(r) && matchSub(r);
    });

    if (!baseRows.length) {
      if (rdCharts[canvasId]) { rdCharts[canvasId].destroy(); delete rdCharts[canvasId]; }
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle = 'rgba(100,116,139,.4)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Sem dados', canvas.width/2, canvas.height/2);
      return;
    }

    const hotels = [...new Set(baseRows.map(r=>r.hotel))].sort();
    const vns    = hotels.map(h => baseRows.filter(r=>r.hotel===h).reduce((s,r)=>s+r.vn,0));
    const cols   = hotels.map((_,i) => COLS[i%COLS.length]);

    // Dynamic height: 28px per hotel, min 200px
    const dynH = Math.max(200, hotels.length * 28);
    canvas.parentNode.style.height = dynH + 'px';

    rdDC(canvasId,'bar', hotels,  // full names — horizontal bars have room
      [{label:'VN', data:vns, backgroundColor:cols.map(c=>c+'cc'), borderColor:cols, borderWidth:1, borderRadius:4}],
      {
        indexAxis:'y',
        plugins:{ legend:{display:false} },
        scales:{
          y:{ ticks:{ color:'#94aabf', font:{size:10}, autoSkip:false }, grid:{color:'rgba(255,255,255,.04)'} },
          x:{ ticks:{ color:'#64748b', font:{size:10}, callback: v=>'€'+Math.round(v/1000)+'K' }, grid:{color:'rgba(255,255,255,.04)'} }
        }
      });
  }

  // Versátil
  rdCmpChart('rdCmpVersatilComida',  ['VERSATIL','VERSÁTIL'], 'COMIDA');
  rdCmpChart('rdCmpVersatilBebida',  ['VERSATIL','VERSÁTIL'], 'BEBIDA');

  // Inevitável
  rdCmpChart('rdCmpInevitavelComida',['INEVITÁVEL','INEVITAVEL'], 'COMIDA');
  rdCmpChart('rdCmpInevitavelBebida',['INEVITÁVEL','INEVITAVEL'], 'BEBIDA');

  // Massa Fina
  rdCmpChart('rdCmpMassaFinaComida', ['MASSA FINA'], 'COMIDA');
  rdCmpChart('rdCmpMassaFinaBebida', ['MASSA FINA'], 'BEBIDA');

  // Bar Splash
  rdCmpChart('rdCmpSplashComida',    ['BAR SPLASH'], 'COMIDA');
  rdCmpChart('rdCmpSplashBebida',    ['BAR SPLASH'], 'BEBIDA');

  // Bar Fidelio
  rdCmpChart('rdCmpFidelioComida',   ['BAR FIDELIO'], 'COMIDA');
  rdCmpChart('rdCmpFidelioBebida',   ['BAR FIDELIO'], 'BEBIDA');
  // Bar Soul Blues
  rdCmpChart('rdCmpSoulComida',      ['BAR SOUL','BAR SOULS'], 'COMIDA');
  rdCmpChart('rdCmpSoulBebida',      ['BAR SOUL','BAR SOULS'], 'BEBIDA');
  // Bar Sunset
  rdCmpChart('rdCmpSunsetComida',    ['BAR SUNSET'], 'COMIDA');
  rdCmpChart('rdCmpSunsetBebida',    ['BAR SUNSET'], 'BEBIDA');
  // Bar Rooftop
  rdCmpChart('rdCmpRooftopComida',   ['BAR ROOFTOP','BAR ATLANTICO'], 'COMIDA');
  rdCmpChart('rdCmpRooftopBebida',   ['BAR ROOFTOP','BAR ATLANTICO'], 'BEBIDA');

  // Room Service
  rdCmpChart('rdCmpRSComida',        ['ROOM SERVICE'], 'COMIDA');
  rdCmpChart('rdCmpRSBebida',        ['ROOM SERVICE'], 'BEBIDA');

  // Adegas
  rdCmpChart('rdCmpAdega',           ['SV_ADEGA','SV ADEGA'], '');

  // PdV table
  const pdvAll = sumBy('armazem');
  document.getElementById('rdTablePdVBody').innerHTML = pdvAll.map(([arm,vn])=>{
    const vb  = rows.filter(r=>r.armazem===arm).reduce((s,r)=>s+r.vb,0);
    const qtd = rows.filter(r=>r.armazem===arm).reduce((s,r)=>s+r.qtd,0);
    const pct = totalVN>0 ? (vn/totalVN*100).toFixed(1) : '0';
    return `<tr style="border-top:1px solid rgba(255,255,255,.03)">
      <td style="padding:8px 12px;color:var(--text-1);font-weight:600">${arm}</td>
      <td style="padding:8px 12px;text-align:right;font-family:var(--mono);color:var(--text-2)">${qtd.toLocaleString('pt-PT',{maximumFractionDigits:0})}</td>
      <td style="padding:8px 12px;text-align:right;font-family:var(--mono);color:var(--text-2)">${fmtE(vb)}</td>
      <td style="padding:8px 12px;text-align:right;font-family:var(--mono);color:var(--text-1);font-weight:700">${fmtE(vn)}</td>
      <td style="padding:8px 12px;text-align:right;font-family:var(--mono);color:var(--gold)">${pct}%</td>
    </tr>`;
  }).join('');

  // Artigos table top 30
  const artAll = sumBy('artigo').slice(0,30);
  document.getElementById('rdTableArtigosBody').innerHTML = artAll.map(([art,vn],i)=>{
    const row0 = rows.find(r=>r.artigo===art);
    const qtd  = rows.filter(r=>r.artigo===art).reduce((s,r)=>s+r.qtd,0);
    return `<tr style="border-top:1px solid rgba(255,255,255,.03)">
      <td style="padding:7px 12px;color:var(--text-3);font-family:var(--mono)">${i+1}</td>
      <td style="padding:7px 12px;color:var(--text-1);font-weight:600">${art}</td>
      <td style="padding:7px 12px;color:var(--text-2)">${row0?.grupo||'—'}</td>
      <td style="padding:7px 12px;color:var(--text-2);font-size:10px">${row0?.armazem||'—'}</td>
      <td style="padding:7px 12px;text-align:right;font-family:var(--mono);color:var(--text-2)">${qtd.toLocaleString('pt-PT',{maximumFractionDigits:0})}</td>
      <td style="padding:7px 12px;text-align:right;font-family:var(--mono);color:var(--text-1);font-weight:700">${fmtE(vn)}</td>
    </tr>`;
  }).join('');
}

// ── Persistence ───────────────────────────────────────────
const _rdBuild = buildSessionSnapshot;
buildSessionSnapshot = function() {
  const snap = _rdBuild();
  if (RD_STORE.length) snap.RD_STORE = RD_STORE;
  return snap;
};
const _rdRestore = restoreFromSnapshot;
restoreFromSnapshot = function(snap) {
  try{ _rdRestore(snap); }catch(e){ console.warn('Restauro anterior às Receitas Detalhe falhou:', e); }
  try{
    if (snap.RD_STORE && Array.isArray(snap.RD_STORE)) { RD_STORE = snap.RD_STORE; rdUpdateUI(); }
  }catch(e){ console.warn('Atualização do ecrã de Receitas Detalhe falhou (dados já estão carregados):', e); }
};
// ==========================================================
// END RECEITAS DETALHE MODULE
// ==========================================================
