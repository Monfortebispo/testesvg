
// ==========================================================
// WHATSAPP MODAL
// ==========================================================
let waSelectedRegion = 'todos';
let waSelectedMeses  = new Set();
let waContext = 'resumo'; // resumo | pl | cua | reputacao | instagram

const WA_CONTEXT_LABELS = {
  resumo:    { title:'Resumo Operacional',           icon:'📊', hasRegion:true,  hasMeses:true,  hasDetail:true  },
  pl:        { title:'P&L USALI',                    icon:'📊', hasRegion:true,  hasMeses:true,  hasDetail:false },
  cua:       { title:'Custo por Unidade Actividade',  icon:'⚡', hasRegion:true,  hasMeses:true,  hasDetail:false },
  reputacao: { title:'Reputação ReviewPro',           icon:'⭐', hasRegion:true,  hasMeses:false, hasDetail:false },
  instagram: { title:'Instagram',                     icon:'📱', hasRegion:true,  hasMeses:false, hasDetail:false },
  alertas:   { title:'Alertas Activos',               icon:'🔔', hasRegion:true,  hasMeses:true,  hasDetail:false },
};

function waModalOpen(ctx) {
  waContext = ctx || 'resumo';
  const cfg = WA_CONTEXT_LABELS[waContext];

  // Update modal header
  document.querySelector('#waModal [style*="font-size:14px"]').textContent = `Partilhar ${cfg.title} no WhatsApp`;

  // Show/hide region
  document.getElementById('waRegionWrap').style.display = cfg.hasRegion ? 'block' : 'none';
  // Show/hide meses
  document.getElementById('waMesesWrap').style.display = cfg.hasMeses ? 'block' : 'none';
  // Show/hide detail
  document.getElementById('waDetailWrap').style.display = cfg.hasDetail ? 'block' : 'none';

  if (cfg.hasRegion) {
    waSelectedRegion = activeRegion || 'todos';
    document.querySelectorAll('.wa-sel-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.r === waSelectedRegion);
    });
  }

  if (cfg.hasMeses) {
    waSelectedMeses = new Set(selectedMeses);
    const mNames = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const available = Object.keys(STORE).map(Number).sort((a,b)=>a-b);
    document.getElementById('waMesBtns').innerHTML = available.map(m => `
      <button class="wa-mes-btn ${waSelectedMeses.has(m)?'active':''}" data-m="${m}" onclick="waToggleMes(this)">
        ${mNames[m]}
      </button>`).join('');
  }

  document.getElementById('waPreviewWrap').style.display = 'none';
  document.getElementById('waPreviewTxt').value = '';
  waDetailChange();
  document.getElementById('waModal').style.display = 'flex';
}

// Keep backwards compat for Resumo button
function waShareResumo() { waModalOpen('resumo'); }

function waModalClose() {
  document.getElementById('waModal').style.display = 'none';
}

function waSelRegion(btn) {
  document.querySelectorAll('.wa-sel-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  waSelectedRegion = btn.dataset.r;
  document.getElementById('waPreviewWrap').style.display = 'none';
}

function waToggleMes(btn) {
  const m = Number(btn.dataset.m);
  if (waSelectedMeses.has(m)) {
    if (waSelectedMeses.size === 1) return;
    waSelectedMeses.delete(m);
    btn.classList.remove('active');
  } else {
    waSelectedMeses.add(m);
    btn.classList.add('active');
  }
  document.getElementById('waPreviewWrap').style.display = 'none';
}

function waDetailChange() {
  const full = document.querySelector('input[name="waDetail"]:checked')?.value === 'full';
  document.getElementById('waDetailFullLabel').style.borderColor    = full  ? 'var(--gold)' : 'var(--border-2)';
  document.getElementById('waDetailCompactLabel').style.borderColor = !full ? 'var(--gold)' : 'var(--border-2)';
  document.getElementById('waPreviewWrap').style.display = 'none';
}

function waBuildMessage() {
  switch(waContext) {
    case 'pl':        return waBuildPL();
    case 'cua':       return waBuildCUA();
    case 'reputacao': return waBuildReputacao();
    case 'instagram': return waBuildInstagram();
    case 'alertas':   return waBuildAlertas();
    default:          return waBuildResumo();
  }
}

// ── RESUMO ────────────────────────────────────────────────
function waBuildResumo() {
  const mNames = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const regionLabels = { todos:'Todos os Hotéis', norte:'Norte e Centro', lisboa:'Lisboa & Ilhas', alentejo:'Alentejo', algarve:'Algarve' };
  const detail = document.querySelector('input[name="waDetail"]:checked')?.value || 'compact';
  const hotels = waSelectedRegion === 'todos' ? RAW.hotel_list : (REGIOES[waSelectedRegion]||[]).filter(h=>RAW.hotel_list.includes(h));
  const meses = [...waSelectedMeses].sort((a,b)=>a-b);
  const mesesStr = meses.map(m=>mNames[m]).join(', ');
  const now = new Date().toLocaleDateString('pt-PT',{day:'2-digit',month:'2-digit',year:'numeric'});
  const lines = [`📊 *Vila Galé Hotéis — ${regionLabels[waSelectedRegion]}*`, `📅 ${mesesStr} · 🗓 ${now}`, ''];
  let totRec26=0,totRec25=0,totGop26=0,totDis26=0,totOcu26=0,totAloj26=0,totDorm26=0;

  const hotelLines = hotels.map(h => {
    let rec26=0,rec25=0,aloj26=0,fb26=0,div26=0,ctot26=0,cpes26=0,cene26=0,cman26=0,ccom26=0,cbeb26=0,dis26=0,ocu26=0,dorm26=0,hosp26=0;
    let gopOfficial26=0, gopOfficialSeen=false;
    meses.forEach(m => {
      const ops=STORE[m]?.hotels_ops?.[h]||{}, cost=STORE[m]?.hotels_costs?.[h]||{}, rev=STORE[m]?.hotels_rev?.[h]||{};
      rec26+=n(ops['Receita Total']?.[YR_CUR]); rec25+=n(ops['Receita Total']?.[YR_PREV]);
      aloj26+=n(ops['Receita Alojamento']?.[YR_CUR]); fb26+=n(rev['ALIMENTACAO']?.[YR_CUR]); div26+=n(rev['DIVERSOS']?.[YR_CUR]);
      ctot26+=n(cost['TOTAIS']?.[YR_CUR]); cpes26+=n(cost['PESSOAL']?.[YR_CUR]); cene26+=n(cost['ENERGIA']?.[YR_CUR]);
      cman26+=n(cost['MANUTENÇÃO']?.[YR_CUR]); ccom26+=n(cost['COMIDAS']?.[YR_CUR]); cbeb26+=n(cost['BEBIDAS']?.[YR_CUR]);
      dis26+=n(ops['Disponiveis']?.[YR_CUR]); ocu26+=n(ops['Ocupados']?.[YR_CUR]); dorm26+=n(ops['Dormidas']?.[YR_CUR]); hosp26+=n(ops['Hospedes']?.[YR_CUR]);
      const gm = gop(h, YR_CUR, STORE[m]);
      if (gm != null) { gopOfficial26 += gm; gopOfficialSeen = true; }
    });
    if (!rec26 && !dis26) return null;
    const gop26=gopOfficialSeen?gopOfficial26:(rec26-ctot26), gopPct=rec26>0?gop26/rec26*100:0;
    const varRec=rec25>0?(rec26-rec25)/rec25*100:null;
    const occPct=dis26>0?ocu26/dis26*100:0, adrVal=ocu26>0?aloj26/ocu26:0, rvpVal=dis26>0?aloj26/dis26:0;
    totRec26+=rec26; totRec25+=rec25; totGop26+=gop26; totDis26+=dis26; totOcu26+=ocu26; totAloj26+=aloj26; totDorm26+=dorm26;
    const varStr = varRec!==null?` (${varRec>=0?'+':''}${fmt(varRec,1)}% vs ${YR_PREV})`:'';
    if (detail==='compact') return `🏨 *${h}*\n   💰 ${fmtV(rec26)}${varStr} | 🛏 ${fmt(occPct,1)}% | 📈 GOP ${fmt(gopPct,1)}%`;
    return [`━━━━━━━━━━━━━━━━━━━━`,`🏨 *${h}*`,`💰 Receita: ${fmtV(rec26)}${varStr}`,`　Alojamento: ${fmtV(aloj26)} | F&B: ${fmtV(fb26)} | Outros: ${fmtV(div26)}`,`📈 GOP: ${fmtV(gop26)} | Margem: ${fmt(gopPct,1)}%`,`🛏 Occ: ${fmt(occPct,1)}% | ADR: €${fmt(adrVal,2)} | RevPAR: €${fmt(rvpVal,2)}`,`　Dormidas: ${fmt(dorm26)} | Hóspedes: ${fmt(hosp26)}`,`⚙ Custos: ${fmtV(ctot26)}`,`　Pessoal: ${fmtV(cpes26)} | F&B: ${fmtV(ccom26+cbeb26)}`,`　Energia: ${fmtV(cene26)} | Manutenção: ${fmtV(cman26)}`].join('\n');
  }).filter(Boolean);

  lines.push(...hotelLines);
  if (detail==='full') lines.push('━━━━━━━━━━━━━━━━━━━━');
  const totGopPct=totRec26>0?totGop26/totRec26*100:0, totVarRec=totRec25>0?(totRec26-totRec25)/totRec25*100:null;
  const totOcc=totDis26>0?totOcu26/totDis26*100:0, totAdr=totOcu26>0?totAloj26/totOcu26:0, totRvp=totDis26>0?totAloj26/totDis26:0;
  lines.push('',`━━━━━━━━━━━━━━━━━━━━━━━━`,`📊 *TOTAL ${regionLabels[waSelectedRegion].toUpperCase()} (${hotels.length} hotéis)*`,`💰 Receita: ${fmtV(totRec26)}${totVarRec!==null?` (${totVarRec>=0?'+':''}${fmt(totVarRec,1)}% vs ${YR_PREV})`:''}`,`📈 GOP: ${fmtV(totGop26)} | Margem: ${fmt(totGopPct,1)}%`,`🛏 Occ: ${fmt(totOcc,1)}% | ADR: €${fmt(totAdr,2)} | RevPAR: €${fmt(totRvp,2)}`,`　Dormidas: ${fmt(totDorm26)}`,'',`_Dashboard Vila Galé Hotéis_`);
  return lines.join('\n');
}

// ── P&L USALI ─────────────────────────────────────────────
function waBuildPL() {
  const mNames = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const regionLabels = { todos:'Todos os Hotéis', norte:'Norte e Centro', lisboa:'Lisboa & Ilhas', alentejo:'Alentejo', algarve:'Algarve' };
  const hotels = waSelectedRegion==='todos' ? RAW.hotel_list : (REGIOES[waSelectedRegion]||[]).filter(h=>RAW.hotel_list.includes(h));
  const meses = [...waSelectedMeses].sort((a,b)=>a-b);
  const mesesStr = meses.map(m=>mNames[m]).join(', ');
  const now = new Date().toLocaleDateString('pt-PT',{day:'2-digit',month:'2-digit',year:'numeric'});

  const lines = [
    `📊 *Vila Galé — P&L USALI · ${regionLabels[waSelectedRegion]}*`,
    `📅 ${mesesStr} · 🗓 ${now} · ${hotels.length} hotéis`,
    ``,
  ];

  let totRec26=0,totRec25=0,totGop26=0,totDis26=0,totOcu26=0,totAloj26=0;

  hotels.forEach(h => {
    let aloj26=0,fb26=0,div26=0,fbCom26=0,fbBeb26=0;
    let pes26=0,ene26=0,man26=0,mkt26=0,com26=0,ope26=0;
    let aloj25=0,fb25=0,div25=0;
    let dis26=0,ocu26=0,alojRev26=0;

    meses.forEach(m => {
      const ops=STORE[m]?.hotels_ops?.[h]||{}, cost=STORE[m]?.hotels_costs?.[h]||{}, rev=STORE[m]?.hotels_rev?.[h]||{};
      aloj26+=n(rev['ALOJAMENTO']?.[YR_CUR]); aloj25+=n(rev['ALOJAMENTO']?.[YR_PREV]);
      fb26+=n(rev['ALIMENTACAO']?.[YR_CUR]); fb25+=n(rev['ALIMENTACAO']?.[YR_PREV]);
      div26+=n(rev['DIVERSOS']?.[YR_CUR]); div25+=n(rev['DIVERSOS']?.[YR_PREV]);
      fbCom26+=n(cost['COMIDAS']?.[YR_CUR]); fbBeb26+=n(cost['BEBIDAS']?.[YR_CUR]);
      pes26+=n(cost['PESSOAL']?.[YR_CUR]); ene26+=n(cost['ENERGIA']?.[YR_CUR]);
      man26+=n(cost['MANUTENÇÃO']?.[YR_CUR]); mkt26+=n(cost['MARKETING']?.[YR_CUR]);
      com26+=n(cost['COMUNICAÇÕES']?.[YR_CUR]); ope26+=n(cost['OPERACIONAIS']?.[YR_CUR]);
      dis26+=n(ops['Disponiveis']?.[YR_CUR]); ocu26+=n(ops['Ocupados']?.[YR_CUR]);
      alojRev26+=n(ops['Receita Alojamento']?.[YR_CUR]);
    });

    const tot26=aloj26+fb26+div26, tot25=aloj25+fb25+div25;
    if (!tot26 && !dis26) return;

    const fbDir26=fbCom26+fbBeb26;
    const undist=pes26+ene26+man26+mkt26+com26+ope26;
    const gop26=tot26-fbDir26-undist;
    const gopPct=tot26>0?gop26/tot26*100:0;
    const labPct=tot26>0?pes26/tot26*100:0;
    const fbCostPct=fb26>0?fbDir26/fb26*100:0;
    const occPct=dis26>0?ocu26/dis26*100:0;
    const adrVal=ocu26>0?alojRev26/ocu26:0;
    const revpar=dis26>0?alojRev26/dis26:0;
    const varRec=tot25>0?(tot26-tot25)/tot25*100:null;

    totRec26+=tot26; totRec25+=tot25; totGop26+=gop26; totDis26+=dis26; totOcu26+=ocu26; totAloj26+=alojRev26;

    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`🏨 *${h}*`);
    lines.push(`💰 Receita: ${fmtV(tot26)}${varRec!==null?` (${varRec>=0?'+':''}${fmt(varRec,1)}% vs ${YR_PREV})`:''}`);
    lines.push(`　Alojamento: ${fmtV(aloj26)} | F&B: ${fmtV(fb26)} | Outros: ${fmtV(div26)}`);
    lines.push(`📈 GOP: ${fmtV(gop26)} | Margem: ${fmt(gopPct,1)}%`);
    lines.push(`⚙ Custos Não Dist.: ${fmtV(undist)}`);
    lines.push(`　Pessoal: ${fmtV(pes26)} (${fmt(labPct,1)}%) | F&B Directo: ${fmtV(fbDir26)} (${fmt(fbCostPct,1)}%)`);
    lines.push(`　Energia: ${fmtV(ene26)} | Manutenção: ${fmtV(man26)}`);
    lines.push(`🛏 Occ: ${fmt(occPct,1)}% | ADR: €${fmt(adrVal,2)} | RevPAR: €${fmt(revpar,2)}`);
  });

  // Portfolio totals
  const totGopPct=totRec26>0?totGop26/totRec26*100:0;
  const totVarRec=totRec25>0?(totRec26-totRec25)/totRec25*100:null;
  const totOcc=totDis26>0?totOcu26/totDis26*100:0;
  const totAdr=totOcu26>0?totAloj26/totOcu26:0;
  const totRvp=totDis26>0?totAloj26/totDis26:0;

  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`📊 *TOTAL ${regionLabels[waSelectedRegion].toUpperCase()} (${hotels.length} hotéis)*`);
  lines.push(`💰 Receita: ${fmtV(totRec26)}${totVarRec!==null?` (${totVarRec>=0?'+':''}${fmt(totVarRec,1)}% vs ${YR_PREV})`:''}`);
  lines.push(`📈 GOP: ${fmtV(totGop26)} | Margem: ${fmt(totGopPct,1)}%`);
  lines.push(`🛏 Occ: ${fmt(totOcc,1)}% | ADR: €${fmt(totAdr,2)} | RevPAR: €${fmt(totRvp,2)}`);
  lines.push(``, `_Dashboard Vila Galé Hotéis_`);
  return lines.join('\n');
}

// ── CUSTO POR ACTIVIDADE ──────────────────────────────────
function waBuildCUA() {
  const mNames = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const regionLabels = { todos:'Todos os Hotéis', norte:'Norte e Centro', lisboa:'Lisboa & Ilhas', alentejo:'Alentejo', algarve:'Algarve' };
  const hotels = waSelectedRegion==='todos' ? RAW.hotel_list : (REGIOES[waSelectedRegion]||[]).filter(h=>RAW.hotel_list.includes(h));
  const meses = [...waSelectedMeses].sort((a,b)=>a-b);
  const mesesStr = meses.map(m=>mNames[m]).join(', ');
  const now = new Date().toLocaleDateString('pt-PT',{day:'2-digit',month:'2-digit',year:'numeric'});

  const lines = [
    `⚡ *Vila Galé — Custo / Actividade · ${regionLabels[waSelectedRegion]}*`,
    `📅 ${mesesStr} · 🗓 ${now} · ${hotels.length} hotéis`,
    ``,
  ];

  let totCtot=0,totDis=0,totOcu=0,totDorm=0,totHosp=0,totPes=0,totFB=0;

  hotels.forEach(h => {
    let ctot=0,cpes=0,cene=0,cman=0,ccom=0,cbeb=0;
    let dis=0,ocu=0,dorm=0,hosp=0,cheg=0;

    meses.forEach(m => {
      const ops=STORE[m]?.hotels_ops?.[h]||{}, cost=STORE[m]?.hotels_costs?.[h]||{};
      ctot+=n(cost['TOTAIS']?.[YR_CUR]); cpes+=n(cost['PESSOAL']?.[YR_CUR]);
      cene+=n(cost['ENERGIA']?.[YR_CUR]); cman+=n(cost['MANUTENÇÃO']?.[YR_CUR]);
      ccom+=n(cost['COMIDAS']?.[YR_CUR]); cbeb+=n(cost['BEBIDAS']?.[YR_CUR]);
      dis+=n(ops['Disponiveis']?.[YR_CUR]); ocu+=n(ops['Ocupados']?.[YR_CUR]);
      dorm+=n(ops['Dormidas']?.[YR_CUR]); hosp+=n(ops['Hospedes']?.[YR_CUR]); cheg+=n(ops['Chegadas']?.[YR_CUR]);
    });

    if (!ctot && !dis) return;

    const f = (c,d) => d>0 ? `€${fmt(c/d,2)}` : '—';
    const fbDir = ccom+cbeb;

    totCtot+=ctot; totDis+=dis; totOcu+=ocu; totDorm+=dorm; totHosp+=hosp; totPes+=cpes; totFB+=fbDir;

    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`🏨 *${h}*`);
    lines.push(`　Custo Total: ${fmtV(ctot)}`);
    lines.push(`　/ Qrt Disp: *${f(ctot,dis)}* | / Qrt Ocup: *${f(ctot,ocu)}*`);
    lines.push(`　/ Dormida: *${f(ctot,dorm)}* | / Hóspede: *${f(ctot,hosp)}*`);
    lines.push(`　👥 Pessoal/Ocup: ${f(cpes,ocu)} | 🍽 F&B/Dorm: ${f(fbDir,dorm)}`);
    lines.push(`　⚡ Energia/Disp: ${f(cene,dis)} | 🔧 Manut/Disp: ${f(cman,dis)}`);
  });

  // Portfolio totals
  const f = (c,d) => d>0 ? `€${fmt(c/d,2)}` : '—';
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`📊 *TOTAL ${regionLabels[waSelectedRegion].toUpperCase()} (${hotels.length} hotéis)*`);
  lines.push(`　Custo Total: ${fmtV(totCtot)}`);
  lines.push(`　/ Qrt Disp: *${f(totCtot,totDis)}* | / Qrt Ocup: *${f(totCtot,totOcu)}*`);
  lines.push(`　/ Dormida: *${f(totCtot,totDorm)}* | / Hóspede: *${f(totCtot,totHosp)}*`);
  lines.push(`　👥 Pessoal/Ocup: ${f(totPes,totOcu)} | 🍽 F&B/Dorm: ${f(totFB,totDorm)}`);
  lines.push(``, `_Dashboard Vila Galé Hotéis_`);
  return lines.join('\n');
}

// ── REPUTAÇÃO ─────────────────────────────────────────────
function waBuildReputacao() {
  const now = new Date().toLocaleDateString('pt-PT',{day:'2-digit',month:'2-digit',year:'numeric'});
  const regionLabels = { todos:'Todos os Hotéis', norte:'Norte e Centro', lisboa:'Lisboa & Ilhas', alentejo:'Alentejo', algarve:'Algarve' };

  if (!Object.keys(REP_STORE||{}).length)
    return `⭐ *Vila Galé — Reputação ReviewPro*
🗓 ${now}

_Sem dados de reputação carregados._`;

  const allKeys = Object.keys(REP_STORE);
  const regionKeys = waSelectedRegion === 'todos'
    ? allKeys
    : allKeys.filter(k => (REGIOES[waSelectedRegion]||[]).some(h => rtEntryMatchesRegion(k, h)));

  if (!regionKeys.length)
    return `⭐ *Vila Galé — Reputação · ${regionLabels[waSelectedRegion]}*
🗓 ${now}

_Sem dados de reputação para esta região._`;

  const lines = [
    `⭐ *Vila Galé — Reputação ReviewPro · ${regionLabels[waSelectedRegion]}*`,
    `🗓 ${now} · ${regionKeys.length} hotéis`,
    ``,
  ];

  regionKeys.forEach(k => {
    const d = rtLatest(k);
    if (!d) return;
    const gri  = d.gri  != null ? fmt(d.gri,1)+'%'  : '—';
    const cqi  = d.cqi  != null ? fmt(d.cqi,1)+'%'  : '—';
    const resp = d.mgmtResp != null ? fmt(d.mgmtResp,0)+'%' : '—';
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`🏨 *${d.hotel}*`);
    lines.push(`　Semana: ${d.week || '—'}`);
    lines.push(`　GRI™: *${gri}* | CQI™: *${cqi}* | Taxa Resposta: *${resp}*`);
    const deptScores = Object.entries(d.depts || {})
      .filter(([,v]) => v?.val != null)
      .sort((a,b) => b[1].val - a[1].val);
    if (deptScores.length) {
      const top3 = deptScores.slice(0,3).map(([name,v])=>`${name}: ${fmt(v.val,1)}%`).join(' | ');
      const bot = deptScores[deptScores.length - 1];
      lines.push(`　✅ Melhor: ${top3}`);
      if (bot) lines.push(`　⚠ A melhorar: ${bot[0]}: ${fmt(bot[1].val,1)}%`);
    }
    if (d.reviews != null) lines.push(`　📝 Reviews: ${fmt(d.reviews,0)}`);
  });

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  const withGri = regionKeys.map(rtLatest).filter(d=>d?.gri!=null);
  if (withGri.length) {
    const avgGri = withGri.reduce((s,d)=>s+d.gri,0)/withGri.length;
    const cqiRows = withGri.filter(d=>d.cqi!=null);
    const avgCqi = cqiRows.length ? cqiRows.reduce((s,d)=>s+d.cqi,0)/cqiRows.length : null;
    lines.push(``,`📊 *MÉDIA ${regionLabels[waSelectedRegion].toUpperCase()}*`);
    lines.push(`　GRI™ médio: *${fmt(avgGri,1)}%*${avgCqi!=null?` | CQI™ médio: *${fmt(avgCqi,1)}%*`:''}`);
  }
  lines.push(``,`_Dashboard Vila Galé Hotéis_`);
  return lines.join('\n');
}

// ── INSTAGRAM ─────────────────────────────────────────────
function waBuildInstagram() {
  const now = new Date().toLocaleDateString('pt-PT',{day:'2-digit',month:'2-digit',year:'numeric'});
  const regionLabels = { todos:'Todos os Hotéis', norte:'Norte e Centro', lisboa:'Lisboa & Ilhas', alentejo:'Alentejo', algarve:'Algarve' };
  const snaps = window.igSnapshots || [];

  if (!snaps.length)
    return `📱 *Vila Galé — Instagram*\n🗓 ${now}\n\n_Sem dados Instagram carregados._`;

  const latest = snaps[snaps.length - 1];
  if (!latest.hotels || !Object.keys(latest.hotels).length)
    return `📱 *Vila Galé — Instagram · ${regionLabels[waSelectedRegion]}*\n🗓 ${now}\n\n_Sem dados por hotel no snapshot._`;

  // Filter hotels by region
  const regionSet = waSelectedRegion === 'todos'
    ? null
    : new Set((REGIOES[waSelectedRegion]||[]).map(h=>h.toUpperCase()));

  const hotelEntries = Object.entries(latest.hotels).filter(([h]) =>
    !regionSet || regionSet.has(h.toUpperCase())
  ).sort((a,b) => (b[1].followers||0) - (a[1].followers||0));

  if (!hotelEntries.length)
    return `📱 *Vila Galé — Instagram · ${regionLabels[waSelectedRegion]}*\n🗓 ${now}\n\n_Sem hotéis desta região nos dados Instagram._`;

  const lines = [
    `📱 *Vila Galé — Instagram · ${regionLabels[waSelectedRegion]}*`,
    `📅 ${latest.label||'Último período'} · 🗓 ${now} · ${hotelEntries.length} hotéis`,
    ``,
  ];

  hotelEntries.forEach(([hotel, d]) => {
    const seg   = d.followers     != null ? fmt(d.followers,0)     : '—';
    const er    = d.engagementRate != null ? fmt(d.engagementRate,2)+'%' : '—';
    const posts = d.posts          != null ? fmt(d.posts,0)          : '—';
    const reach = d.reach          != null ? fmt(d.reach,0)          : null;
    const impr  = d.impressions    != null ? fmt(d.impressions,0)    : null;
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`🏨 *${hotel}*`);
    lines.push(`　👥 Seguidores: *${seg}* | 💬 ER: *${er}* | 📸 Posts: ${posts}`);
    if (reach)  lines.push(`　📡 Alcance: ${reach}`);
    if (impr)   lines.push(`　👁 Impressões: ${impr}`);
  });

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  // Totals
  const totalSeg = hotelEntries.reduce((s,[,d])=>s+(d.followers||0),0);
  const avgER    = hotelEntries.filter(([,d])=>d.engagementRate!=null).reduce((s,[,d])=>s+d.engagementRate,0) /
                   Math.max(1, hotelEntries.filter(([,d])=>d.engagementRate!=null).length);
  lines.push(``,`📊 *TOTAL ${regionLabels[waSelectedRegion].toUpperCase()}*`);
  lines.push(`　👥 Total seguidores: *${fmt(totalSeg,0)}*`);
  if (avgER) lines.push(`　💬 ER médio: *${fmt(avgER,2)}%*`);
  lines.push(``,`_Dashboard Vila Galé Hotéis_`);
  return lines.join('\n');
}

function waPreview() {
  if (WA_CONTEXT_LABELS[waContext].hasMeses && waSelectedMeses.size === 0) { alert('Selecciona pelo menos um mês.'); return; }
  if (!RAW && (waContext==='pl'||waContext==='cua'||waContext==='resumo')) { alert('Sem dados P&L carregados.'); return; }
  const msg = waBuildMessage();
  document.getElementById('waPreviewTxt').value = msg;
  document.getElementById('waPreviewWrap').style.display = 'block';
  document.getElementById('waPreviewTxt').scrollTop = 0;
}

function waSend() {
  if (WA_CONTEXT_LABELS[waContext].hasMeses && waSelectedMeses.size === 0) { alert('Selecciona pelo menos um mês.'); return; }
  const msg = waBuildMessage();
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

document.getElementById('waModal').addEventListener('click', function(e) {
  if (e.target === this) waModalClose();
});

function waShareResumo() {
  if (!RAW) { alert('Sem dados carregados.'); return; }

  // Default region from current dashboard filter
  waSelectedRegion = activeRegion || 'todos';
  waSelectedMeses  = new Set(selectedMeses);

  // Sync region buttons
  document.querySelectorAll('.wa-sel-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.r === waSelectedRegion);
  });

  // Build month buttons from available data
  const mNames = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const available = Object.keys(STORE).map(Number).sort((a,b)=>a-b);
  document.getElementById('waMesBtns').innerHTML = available.map(m => `
    <button class="wa-mes-btn ${waSelectedMeses.has(m)?'active':''}" data-m="${m}" onclick="waToggleMes(this)">
      ${mNames[m]}
    </button>`).join('');

  // Reset preview
  document.getElementById('waPreviewWrap').style.display = 'none';
  document.getElementById('waPreviewTxt').value = '';
  waDetailChange();

  // Show modal
  const modal = document.getElementById('waModal');
  modal.style.display = 'flex';
}

