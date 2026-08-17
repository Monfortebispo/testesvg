// ==========================================================
// INSTAGRAM — Módulo completo
// ==========================================================

let IG_SNAPSHOTS = [];
const MES_ORDER = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];

function igSortKey(key) {
  const parts = key.trim().split(' ');
  const mes = parts[0];
  const ano = parts[1] ? parseInt(parts[1]) : 2025;
  const mi  = MES_ORDER.indexOf(mes);
  return ano * 100 + (mi === -1 ? 99 : mi);
}

// Migrate legacy keys (no year) to include year
// Julho-Dezembro = 2025, Janeiro-Junho = 2026
const LEGACY_YEAR_MAP = {
  'JULHO':2025,'AGOSTO':2025,'SETEMBRO':2025,'OUTUBRO':2025,'NOVEMBRO':2025,'DEZEMBRO':2025,
  'JANEIRO':2026,'FEVEREIRO':2026,'MARÇO':2026,'ABRIL':2026,'MAIO':2026,'JUNHO':2026
};
function igMigrateLegacyKeys() {
  for (const snap of IG_SNAPSHOTS) {
    const toRename = Object.keys(snap.months).filter(k => !k.includes(' '));
    for (const oldKey of toRename) {
      const upper = oldKey.toUpperCase();
      const ano = LEGACY_YEAR_MAP[upper] || 2025;
      const newKey = upper + ' ' + ano;
      if (!snap.months[newKey]) snap.months[newKey] = snap.months[oldKey];
      delete snap.months[oldKey];
    }
  }
}

function igHandleDrop(e) {
  e.preventDefault();
  document.getElementById('igDropZone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) igLoadFile(file);
}

async function igLoadFile(file) {
  if (!file) return;
  try { if(window.VG?.performance?.ensureXLSX) await window.VG.performance.ensureXLSX(); } catch(e) { showToast('Não foi possível carregar a biblioteca Excel: '+(e.message||e), true); return; }
  const dcBefore = typeof window.vgDataCenterCapture === 'function' ? window.vgDataCenterCapture('instagram') : null;
  showToast('A processar ficheiro Instagram...');
  try {
    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab, { type: 'array', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:null });
    const months = igParseRows(rows);
    const mesCount = Object.keys(months).length;
    if (mesCount === 0) { showToast('Nenhum mês reconhecido no ficheiro', true); return; }
    if (IG_SNAPSHOTS.length > 0) {
      const latest = IG_SNAPSHOTS[IG_SNAPSHOTS.length - 1];
      // Deep merge: preserva hotéis já carregados de outras regiões
      for (const [mesKey, hoteis] of Object.entries(months)) {
        if (!latest.months[mesKey]) latest.months[mesKey] = {};
        Object.assign(latest.months[mesKey], hoteis);
      }
      latest.label = new Date().toLocaleString('pt-PT',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
      latest.loadedAt = new Date().toISOString();
      showToast(`✓ Instagram actualizado — ${mesCount} mês(es) adicionados/actualizados`);
      uploadSetStatus('uploadStatusIG', `✓ ${mesCount} mês(es) · actualizado`, true);
    } else {
      IG_SNAPSHOTS.push({ id:Date.now(), label:new Date().toLocaleString('pt-PT',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}), loadedAt:new Date().toISOString(), months });
      showToast(`✓ Instagram carregado — ${mesCount} meses`);
      uploadSetStatus('uploadStatusIG', `✓ ${mesCount} meses carregados`, true);
    }
    igUpdateUI();
    if (typeof window.vgDataCenterRecord === 'function') window.vgDataCenterRecord({
      source:'instagram',fileName:file.name,fileSize:file.size,scope:`${mesCount} mês(es)`,before:dcBefore,duplicate:!!(dcBefore&&Array.isArray(dcBefore.payload)&&dcBefore.payload.length),metrics:{months:mesCount,snapshots:IG_SNAPSHOTS.length},summary:'Atualização de métricas Instagram'
    });
  } catch(e) {
    showToast('Erro: ' + e.message, true);
    if (typeof window.vgDataCenterRecordFailure === 'function') window.vgDataCenterRecordFailure({source:'instagram',fileName:file.name,fileSize:file.size,summary:e.message,warnings:[e.message]});
  }
}

function igParseRows(rows) {
  const months = {};
  // Alias map: nome no Excel (uppercase) → nome canónico do dashboard
  const HOTEL_ALIAS = {
    // Lisboa & Ilhas
    'CASCAIS':'CASCAIS','COLLECTION PALACIO DOS ARCOS':'COLLECTION PALACIO DOS ARCOS',
    'PALACIO DOS ARCOS':'COLLECTION PALACIO DOS ARCOS',
    'COLLECTION TOMAR':'COLLECTION TOMAR','TOMAR':'COLLECTION TOMAR',
    'ERICEIRA':'ERICEIRA','ESTORIL':'ESTORIL','OPERA':'OPERA',
    'SINTRA':'COLLECTION SINTRA','COLLECTION SINTRA':'COLLECTION SINTRA',
    'MASSA FINA ESTORIL':'MASSA FINA ESTORIL',
    'SÃO MIGUEL':'COLLECTION S. MIGUEL','SAO MIGUEL':'COLLECTION S. MIGUEL',
    'COLLECTION S. MIGUEL':'COLLECTION S. MIGUEL','COLLECTION SAO MIGUEL':'COLLECTION S. MIGUEL',
    'SANTA CRUZ':'SANTA CRUZ',
    // Norte e Centro
    'PORTO':'PORTO','PORTO RIBEIRA':'PORTO RIBEIRA',
    'SERRA DA ESTRELA':'COLLECTION SERRA DA ESTRELA','COLLECTION SERRA DA ESTRELA':'COLLECTION SERRA DA ESTRELA',
    'BRAGA':'COLLECTION BRAGA','COLLECTION BRAGA':'COLLECTION BRAGA',
    'FIGUEIRA DA FOZ':'COLLECTION FIGUEIRA DA FOZ','COLLECTION FIGUEIRA DA FOZ':'COLLECTION FIGUEIRA DA FOZ',
    'PONTE DE LIMA':'COLLECTION PONTE DE LIMA VINEYARDS','COLLECTION PONTE DE LIMA VINEYARDS':'COLLECTION PONTE DE LIMA VINEYARDS',
    'COIMBRA':'COIMBRA',
    'DOURO VINEYARDS':'DOURO VINEYARDS',
    'DOURO':'COLLECTION DOURO','COLLECTION DOURO':'COLLECTION DOURO',
    'MASSA FINA PONTE DE LIMA':'MASSA FINA PONTE DE LIMA',
    'MASSA FINA PORTO':'MASSA FINA PORTO',
    // Alentejo
    'ÉVORA':'EVORA','EVORA':'EVORA','COLLECTION EVORA':'EVORA',
    'ELVAS':'COLLECTION ELVAS','COLLECTION ELVAS':'COLLECTION ELVAS',
    'CASAS DE ELVAS':'CASAS DE ELVAS',
    'ALTER REAL':'COLLECTION ALTER REAL','COLLECTION ALTER REAL':'COLLECTION ALTER REAL',
    'ALENTEJO VINEYARDS':'ALENTEJO VINEYARDS',
    'MONTE DO VILAR':'COLLECTION MONTE DO VILAR','COLLECTION MONTE DO VILAR':'COLLECTION MONTE DO VILAR',
    'NEP KIDS':'NEP KIDS',
    // Algarve
    'AMPALIUS':'AMPALIUS','ATLANTICO':'ATLANTICO','CERRO ALAGOA':'CERRO ALAGOA',
    'ALBACORA':'ALBACORA','MARINA':'MARINA','NAUTICO':'NAUTICO',
    'COLLECTION PRAIA':'COLLECTION PRAIA','PRAIA':'COLLECTION PRAIA',
    'LAGOS':'LAGOS','TAVIRA':'TAVIRA','ISLA CANELA':'ISLA CANELA',
    // Aliases genéricos
    'ARMAÇÃO DE PÊRA':'AMPALIUS','ARMACAO DE PERA':'AMPALIUS',
    'ALBUFEIRA':'CERRO ALAGOA',
  };
  const igResolveHotel = name => HOTEL_ALIAS[name] || null;
  const toNum = v => { if (v===null||v===undefined||v==='') return null; const n=parseFloat(v); return isNaN(n)?null:n; };

  let inSnapshot = false;
  let currentKey = null;   // e.g. "JULHO 2025"
  let alcanceCol = 9;      // default column index for alcance

  const MES_PT = {
    1:'JANEIRO',2:'FEVEREIRO',3:'MARÇO',4:'ABRIL',5:'MAIO',6:'JUNHO',
    7:'JULHO',8:'AGOSTO',9:'SETEMBRO',10:'OUTUBRO',11:'NOVEMBRO',12:'DEZEMBRO'
  };

  for (const row of rows) {
    const col0 = (row[0]||'').toString().trim().toUpperCase();

    // Section header: HOTEL row
    if (col0 === 'HOTEL' && (row[1]||'').toString().toUpperCase().includes('NUMERO')) {
      inSnapshot = true;

      // Find datetime in any column (last non-null usually)
      let dt = null;
      for (let c = row.length - 1; c >= 0; c--) {
        const v = row[c];
        if (v instanceof Date || (typeof v === 'object' && v !== null && v.getFullYear)) {
          dt = v; break;
        }
        // Fallback: Excel serial number (cellDates:true pode falhar nalguns xlsx)
        if (typeof v === 'number' && v > 40000 && v < 60000) {
          dt = new Date((v - 25569) * 86400 * 1000);
          break;
        }
      }

      // Detect column layout: old (10 cols) vs new (15 cols with Gostos/Partilhas)
      // New format has '% de Visual' in col 9 — alcance moves to col 13
      const hasExtended = (row[9]||'').toString().includes('%') || (row[9]||'').toString().includes('Visual');
      alcanceCol = hasExtended ? 13 : 9;

      if (dt) {
        const mes = MES_PT[dt.getMonth ? dt.getMonth()+1 : new Date(dt).getMonth()+1];
        const ano = dt.getFullYear ? dt.getFullYear() : new Date(dt).getFullYear();
        currentKey = `${mes} ${ano}`;
      }
      continue;
    }

    // Evolution section — skip
    if (col0 === 'EVOLUÇÃO MENSAL') { inSnapshot = false; continue; }
    if (!inSnapshot || !currentKey) continue;

    const hotel = igResolveHotel(col0);
    if (!hotel) continue;

    if (!months[currentKey]) months[currentKey] = {};
    months[currentKey][hotel] = {
      posts:     toNum(row[1]),
      historias: toNum(row[2]),
      total:     toNum(row[3]),
      media:     toNum(row[4]),
      seguidores:toNum(row[5]),
      views:     toNum(row[8]),
      alcance:   toNum(row[alcanceCol]),
      gostos:    alcanceCol === 13 ? toNum(row[11]) : null,
      partilhas: alcanceCol === 13 ? toNum(row[12]) : null,
    };
  }
  return months;
}

function igGetSortedMonths() {
  if (!IG_SNAPSHOTS.length) return [];
  const snap=IG_SNAPSHOTS[IG_SNAPSHOTS.length-1];
  return Object.keys(snap.months).sort((a,b) => igSortKey(a) - igSortKey(b));
}
function igGetAllHotels() {
  if (!IG_SNAPSHOTS.length) return [];
  const set=new Set();
  Object.values(IG_SNAPSHOTS[IG_SNAPSHOTS.length-1].months).forEach(m=>Object.keys(m).forEach(h=>set.add(h)));
  return [...set].sort();
}
function igCapMes(m) {
  // "JULHO 2025" → "Julho 2025"
  return m.split(' ').map((p,i) => i===0 ? p.charAt(0)+p.slice(1).toLowerCase() : p).join(' ');
}

function igUpdateUI() {
  igMigrateLegacyKeys();
  const hasData=IG_SNAPSHOTS.length>0 && Object.keys(IG_SNAPSHOTS[0].months).length>0;
  document.getElementById('igEmpty').style.display=hasData?'none':'block';
  document.getElementById('igMain').style.display =hasData?'block':'none';
  const snaps=IG_SNAPSHOTS[IG_SNAPSHOTS.length-1];
  const mesCount=snaps?Object.keys(snaps.months).length:0;
  document.getElementById('igSnapshots').innerHTML=hasData
    ?`<div class="ig-snap-chip"><span class="ig-snap-dot"></span>${mesCount} meses · actualizado ${snaps?.label}<span class="ig-snap-del" onclick="igClearAll()" title="Remover">✕</span></div>`:'';
  const monthSel=document.getElementById('igMonthSel');
  const sortedMonths=igGetSortedMonths();
  const prevMes=monthSel.value;
  monthSel.innerHTML=sortedMonths.map(m=>`<option value="${m}">${igCapMes(m)}</option>`).join('');
  if (sortedMonths.includes(prevMes)) monthSel.value=prevMes;
  else if (sortedMonths.length) monthSel.value=sortedMonths[sortedMonths.length-1];
  const hotelSel=document.getElementById('igHotelSel');
  const prevHotel=hotelSel.value;
  const hotels=igGetAllHotels();
  hotelSel.innerHTML=hotels.map(h=>`<option value="${h}">${h.replace('COLLECTION ','C. ')}</option>`).join('');
  if (hotels.includes(prevHotel)) hotelSel.value=prevHotel;
  igRender();
}

function igClearAll() {
  if (!confirm('Apagar todos os dados Instagram?')) return;
  IG_SNAPSHOTS=[];
  document.getElementById('igEmpty').style.display='block';
  document.getElementById('igMain').style.display='none';
  document.getElementById('igSnapshots').innerHTML='';
  showToast('Dados Instagram apagados');
}

const igCharts={};
function igDC(id,type,labels,datasets,opts={}) {
  if (igCharts[id]) { igCharts[id].destroy(); delete igCharts[id]; }
  const canvas = document.getElementById(id);
  if (!canvas) return;
  // Clear canvas completely to avoid Chart.js ghost data
  const parent = canvas.parentNode;
  const newCanvas = document.createElement('canvas');
  newCanvas.id = id;
  parent.replaceChild(newCanvas, canvas);
  const ctx = newCanvas.getContext('2d');
  const {plugins:_p, scales:_s, ...rest} = opts;
  igCharts[id]=new Chart(ctx,{type,data:{labels,datasets},options:{
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{position:'top',labels:{color:'#94aabf',font:{size:11},padding:14}}, ...(_p||{}) },
    scales:{ x:{ticks:{color:'#64748b',font:{size:10},maxRotation:40},grid:{color:'rgba(255,255,255,.04)'}}, ...(_s||{}) },
    ...rest
  }});
}

function igRender() {
  if (!IG_SNAPSHOTS.length) return;
  const view  = document.getElementById('igViewSel').value;
  const mes   = document.getElementById('igMonthSel').value;
  const hotel = document.getElementById('igHotelSel').value;
  document.getElementById('igHotelGroup').style.display   = view==='hotel' ? 'flex'  : 'none';
  document.getElementById('igOverviewWrap').style.display = view==='overview' ? 'block' : 'none';
  document.getElementById('igHotelWrap').style.display    = view==='hotel' ? 'block' : 'none';
  if (view==='overview') igRenderOverview(mes);
  else igRenderHotel(hotel, mes);
}

function igRenderOverview(mes) {
  const snap=IG_SNAPSHOTS[IG_SNAPSHOTS.length-1];
  const mesData=snap.months[mes]||{};
  const hotels=Object.keys(mesData).sort();
  const labels=hotels.map(h=>h.replace('COLLECTION ','C. ').replace('MASSA FINA ','MF '));
  const get=(h,k)=>mesData[h]?.[k]??null;
  const sortedMonths=igGetSortedMonths();
  const prevMes=sortedMonths[sortedMonths.indexOf(mes)-1]||null;
  const prevData=prevMes?(snap.months[prevMes]||{}):{};
  const followerValue=h=>{const cur=get(h,'seguidores'),prev=prevData[h]?.seguidores;return cur===0&&Number(prev)>0?null:cur;};
  const followerGrowth=h=>{const cur=followerValue(h),prev=prevData[h]?.seguidores;return cur==null||prev==null?null:cur-prev;};
  const totalSeg=hotels.reduce((s,h)=>s+(followerValue(h)||0),0);
  const totalViews=hotels.reduce((s,h)=>s+(get(h,'views')||0),0);
  const totalPubs=hotels.reduce((s,h)=>s+(get(h,'total')||0),0);
  const growthArr=hotels.map(h=>followerGrowth(h));
  const growthValid=growthArr.filter(v=>v!=null), totalGrowth=growthValid.reduce((s,v)=>s+v,0);
  document.getElementById('igKpis').innerHTML=[
    {lbl:'Total Seguidores',val:totalSeg.toLocaleString('pt-PT'),sub:`${igCapMes(mes)} · ${hotels.length} hotéis`,cls:''},
    {lbl:'Crescimento Seguidores',val:growthValid.length?((totalGrowth>=0?'+':'')+totalGrowth.toLocaleString('pt-PT')):'Sem dados',sub:prevMes?`vs ${igCapMes(prevMes)} · ${growthValid.length}/${hotels.length} com dados`:'sem mês anterior',cls:totalGrowth>=0?'k-green':'k-red'},
    {lbl:'Total Visualizações',val:totalViews.toLocaleString('pt-PT'),sub:'Todas as plataformas',cls:'k-teal'},
    {lbl:'Total Publicações',val:totalPubs.toLocaleString('pt-PT'),sub:'Posts + Histórias',cls:''},
  ].map(k=>`<div class="ig-kpi ${k.cls}"><div class="ig-kpi-lbl">${k.lbl}</div><div class="ig-kpi-val">${k.val}</div><div class="ig-kpi-sub">${k.sub}</div></div>`).join('');
  igDC('igChartSeguidores','bar',labels,[{label:'Seguidores',data:hotels.map(h=>followerValue(h)),backgroundColor:'rgba(131,58,180,.55)',borderColor:'#833ab4',borderWidth:1,borderRadius:4}],{plugins:{legend:{display:false}},scales:{y:{ticks:{color:'#64748b',font:{size:11},callback:v=>v.toLocaleString('pt-PT')},grid:{color:'rgba(255,255,255,.04)'}},x:{ticks:{color:'#64748b',font:{size:10},maxRotation:40},grid:{color:'rgba(255,255,255,.04)'}}}});
  igDC('igChartViews','bar',labels,[{label:'Visualizações',data:hotels.map(h=>get(h,'views')),backgroundColor:'rgba(253,29,29,.55)',borderColor:'#fd1d1d',borderWidth:1,borderRadius:4}],{plugins:{legend:{display:false}},scales:{y:{ticks:{color:'#64748b',font:{size:11},callback:v=>v.toLocaleString('pt-PT')},grid:{color:'rgba(255,255,255,.04)'}},x:{ticks:{color:'#64748b',font:{size:10},maxRotation:40},grid:{color:'rgba(255,255,255,.04)'}}}});
  igDC('igChartPubs','bar',labels,[{label:'Posts',data:hotels.map(h=>get(h,'posts')),backgroundColor:'rgba(131,58,180,.6)',borderColor:'#833ab4',borderWidth:1,borderRadius:3},{label:'Histórias',data:hotels.map(h=>get(h,'historias')),backgroundColor:'rgba(252,176,69,.6)',borderColor:'#fcb045',borderWidth:1,borderRadius:3}],{scales:{x:{stacked:true,ticks:{color:'#64748b',font:{size:10},maxRotation:40},grid:{color:'rgba(255,255,255,.04)'}},y:{stacked:true,ticks:{color:'#64748b',font:{size:11}},grid:{color:'rgba(255,255,255,.04)'}}}});
  igDC('igChartGrowth','bar',labels,[{label:'Δ Seguidores',data:growthArr,backgroundColor:growthArr.map(v=>v==null?'rgba(148,163,184,.25)':v>=0?'rgba(31,158,107,.6)':'rgba(192,57,43,.6)'),borderColor:growthArr.map(v=>v==null?'#94a3b8':v>=0?'#1f9e6b':'#c0392b'),borderWidth:1,borderRadius:4}],{plugins:{legend:{display:false}},scales:{y:{ticks:{color:'#64748b',font:{size:11},callback:v=>(v>=0?'+':'')+v},grid:{color:'rgba(255,255,255,.04)'}},x:{ticks:{color:'#64748b',font:{size:10},maxRotation:40},grid:{color:'rgba(255,255,255,.04)'}}}});
  const maxViews=Math.max(...hotels.map(h=>get(h,'views')||0));
  document.getElementById('igRankBody').innerHTML=[...hotels].sort((a,b)=>(get(b,'views')||0)-(get(a,'views')||0)).map(h=>{
    const d=mesData[h]||{};
    const seg=followerValue(h),growth=followerGrowth(h);
    const badge=growth==null?'<span class="delta-badge">Sem dados</span>':growth>0?`<span class="delta-badge pos">+${growth}</span>`:growth<0?`<span class="delta-badge neg">${growth}</span>`:'—';
    const barPct=maxViews>0?((d.views||0)/maxViews*100).toFixed(0):0;
    const alcanceStr=d.alcance!=null?(d.alcance<2&&d.alcance>0?(d.alcance*100).toFixed(1)+'%':d.alcance.toLocaleString('pt-PT')):'—';
    return `<tr><td>${h.replace('COLLECTION ','C. ').replace('MASSA FINA ','MF ')}</td><td>${seg==null?'Sem dados':seg.toLocaleString('pt-PT')}</td><td>${badge}</td><td>${d.posts??'—'}</td><td>${d.historias??'—'}</td><td>${d.total??'—'}</td><td>${d.media!=null?d.media.toFixed(2):'—'}</td><td><div class="ig-bar-wrap"><div class="ig-bar"><div class="ig-bar-fill" style="width:${barPct}%"></div></div>${(d.views||0).toLocaleString('pt-PT')}</div></td><td>${d.gostos!=null?d.gostos.toLocaleString('pt-PT'):'—'}</td><td>${d.partilhas!=null?d.partilhas.toLocaleString('pt-PT'):'—'}</td><td>${alcanceStr}</td></tr>`;
  }).join('');
}

function igRenderHotel(hotel, mes) {
  if (!hotel || !mes) return;
  const snap = IG_SNAPSHOTS[IG_SNAPSHOTS.length-1];
  const sortedMonths = igGetSortedMonths();
  document.getElementById('igHotelName').textContent = hotel.replace('COLLECTION ','C. ');
  const get = (m,k) => snap.months[m]?.[hotel]?.[k] ?? null;
  // Only show months that have data for this hotel
  const activeMonths = sortedMonths.filter(m => snap.months[m]?.[hotel] != null);
  const labels   = activeMonths.map(m => igCapMes(m));
  const segData  = activeMonths.map(m => get(m,'seguidores'));
  const viewData = activeMonths.map(m => get(m,'views'));
  const postData = activeMonths.map(m => get(m,'posts'));
  const histData = activeMonths.map(m => get(m,'historias'));
  const growData = activeMonths.map((m,i) => {
    const c=get(m,'seguidores'), p=i>0?get(activeMonths[i-1],'seguidores'):null;
    return c!=null&&p!=null ? c-p : null;
  });
  const d = snap.months[mes]?.[hotel] || {};
  const prevMes = sortedMonths[sortedMonths.indexOf(mes)-1] || null;
  const prevSeg = prevMes ? (snap.months[prevMes]?.[hotel]?.seguidores ?? null) : null;
  const growth  = d.seguidores!=null && prevSeg!=null ? d.seguidores - prevSeg : null;
  document.getElementById('igKpis').innerHTML = [
    {lbl:'Seguidores',  val:d.seguidores?.toLocaleString('pt-PT')?? '—', sub:growth!=null?(growth>=0?'+':'')+growth+' vs mês ant.':'—', cls:growth==null?'':growth>=0?'k-green':'k-red'},
    {lbl:'Visualizações',val:d.views?.toLocaleString('pt-PT')?? '—', sub:igCapMes(mes), cls:'k-teal'},
    {lbl:'Publicações', val:d.total ?? '—', sub:`${d.posts??0} posts · ${d.historias??0} histórias`, cls:''},
    {lbl:'Média / Dia', val:d.media!=null?d.media.toFixed(2):'—', sub:'publicações/dia', cls:''},
  ].map(k=>`<div class="ig-kpi ${k.cls}"><div class="ig-kpi-lbl">${k.lbl}</div><div class="ig-kpi-val">${k.val}</div><div class="ig-kpi-sub">${k.sub}</div></div>`).join('');
  const xOpt = {ticks:{color:'#64748b',font:{size:10},maxRotation:40},grid:{color:'rgba(255,255,255,.04)'}};
  const yOpt = {ticks:{color:'#64748b',font:{size:11},callback:v=>v!=null?v.toLocaleString('pt-PT'):''}, grid:{color:'rgba(255,255,255,.04)'}};
  igDC('igChartSeguEvol','line',labels,[{label:'Seguidores',data:segData,borderColor:'#833ab4',backgroundColor:'rgba(131,58,180,.1)',borderWidth:2.5,pointRadius:5,pointBackgroundColor:'#833ab4',tension:.35,spanGaps:false,fill:true}],
    {plugins:{legend:{display:false}},scales:{x:xOpt,y:yOpt}});
  igDC('igChartViewsEvol','bar',labels,[{label:'Visualizações',data:viewData,backgroundColor:'rgba(253,29,29,.55)',borderColor:'#fd1d1d',borderWidth:1,borderRadius:4}],
    {plugins:{legend:{display:false}},scales:{x:xOpt,y:yOpt}});
  igDC('igChartPubsEvol','bar',labels,[
    {label:'Posts',    data:postData,backgroundColor:'rgba(131,58,180,.6)',borderColor:'#833ab4',borderWidth:1,borderRadius:3},
    {label:'Histórias',data:histData,backgroundColor:'rgba(252,176,69,.6)',borderColor:'#fcb045',borderWidth:1,borderRadius:3}
  ],{scales:{x:{stacked:true,...xOpt},y:{stacked:true,ticks:{color:'#64748b',font:{size:11}},grid:{color:'rgba(255,255,255,.04)'}}}});
  igDC('igChartGrowthEvol','bar',labels,[{label:'Δ Seguidores',data:growData,
    backgroundColor:growData.map(v=>v==null?'transparent':v>=0?'rgba(31,158,107,.6)':'rgba(192,57,43,.6)'),
    borderColor:     growData.map(v=>v==null?'transparent':v>=0?'#1f9e6b':'#c0392b'),
    borderWidth:1,borderRadius:4}],
    {plugins:{legend:{display:false}},scales:{x:xOpt,y:{ticks:{color:'#64748b',font:{size:11},callback:v=>v!=null?(v>=0?'+':'')+v:''},grid:{color:'rgba(255,255,255,.04)'}}}});
}

// Persistence
const _igBuild=buildSessionSnapshot;
buildSessionSnapshot=function(){const s=_igBuild();s.IG_SNAPSHOTS=IG_SNAPSHOTS;return s;};
const _igRestore=restoreFromSnapshot;
restoreFromSnapshot=function(snap){
  try{ _igRestore(snap); }catch(e){ console.warn('Restauro anterior ao Instagram falhou:', e); }
  try{
    if(snap.IG_SNAPSHOTS&&Array.isArray(snap.IG_SNAPSHOTS)){IG_SNAPSHOTS=snap.IG_SNAPSHOTS;igMigrateLegacyKeys();igUpdateUI();}
  }catch(e){ console.warn('Atualização do ecrã de Instagram falhou (dados já estão carregados):', e); }
};

