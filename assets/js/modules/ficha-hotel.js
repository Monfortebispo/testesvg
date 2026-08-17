// ==========================================================
// FICHA DO HOTEL — indicadores + comentários mensais
// ==========================================================
const HS_DIRECTORS = {'AMPALIUS':'Sofia Ribeiro','MARINA':'Alexandre Rodrigues','TAVIRA':'Élia Figueiredo','ALBACORA':'Luis Marreiros','CERRO ALAGOA':'José Pedro Ferreira','ATLANTICO':'Valter Costa','COLLECTION PRAIA':'Luísa Santos','NAUTICO':'Bruno Sá','PORTO':'Eugénia Teixeira','ERICEIRA':'Marco Ferreira','CASCAIS':'Rute Cerqueira','ESTORIL':'João Damião','OPERA':'Ricardo Sá','ALENTEJO VINEYARDS':'Nuno Clemente','SANTA CRUZ':'Carla de Sousa','LAGOS':'Eduardo Montenegro','EVORA':'Tomás Pires','COIMBRA':'Sara Palhota','COLLECTION SINTRA':'Pedro Valle','COLLECTION PALACIO DOS ARCOS':'Alexandre Castro','COLLECTION DOURO':'Paulo Matos','COLLECTION BRAGA':'José Martins','COLLECTION SERRA DA ESTRELA':'Sandra Lourenço','PORTO RIBEIRA':'André Pereirinha','COLLECTION ELVAS':'Nelson Pinto','DOURO VINEYARDS':'Paulo Matos','COLLECTION ALTER REAL':'Rui Parada','COLLECTION TOMAR':'Rita Martins','CASAS DE ELVAS':'Nelson Pinto','COLLECTION S. MIGUEL':'Gonçalo Nunes','COLLECTION PONTE DE LIMA VINEYARDS':'Ricardo Teixeira','NEP KIDS':'Nuno Clemente','COLLECTION MONTE DO VILAR':'Nuno Clemente','ISLA CANELA':'Natalia Oliveira','COLLECTION FIGUEIRA DA FOZ':'Leonor Santos'};
const HS_ROWS = [
  {group:'ocupacao'},
  {id:'taxa_ocupacao', label:'TAXA DE OCUPAÇÃO', type:'pct', getter:(h,y)=>occ(h,y)},
  {id:'adr', label:'ADR', type:'eur2', getter:(h,y)=>adr(h,y), ytdGetter:(h,y,m)=>hsWeightedAdrField(h,y,m,'ADR')},
  {id:'adr_net', label:'ADR NET', type:'eur2', getter:(h,y)=>adrNet(h,y), ytdGetter:(h,y,m)=>hsWeightedAdrField(h,y,m,'ADR NET')},
  {group:'receitas'},
  {id:'receita_total', label:'RECEITA TOTAL', type:'eur', getter:(h,y)=>n(RAW.hotels_ops[h]?.['Receita Total']?.[y])},
  {id:'receita_alojamento', label:'RECEITA ALOJAMENTO', type:'eur', getter:(h,y)=>n(RAW.hotels_rev[h]?.ALOJAMENTO?.[y] ?? RAW.hotels_ops[h]?.['Receita Alojamento']?.[y])},
  {id:'receita_drhp', label:'RECEITA DRHP', type:'eur', getter:(h,y)=>n(RAW.hotels_rev[h]?.DRHP?.[y])},
  {id:'receita_alimentacao', label:'RECEITA ALIMENTAÇÃO', type:'eur', getter:(h,y)=>n(RAW.hotels_rev[h]?.ALIMENTACAO?.[y] ?? RAW.hotels_ops[h]?.['Receita FB']?.[y])},
  {id:'receita_diversos', label:'RECEITA DIVERSOS', type:'eur', getter:(h,y)=>n(RAW.hotels_rev[h]?.DIVERSOS?.[y])},
  {group:'custos'},
  {id:'custos_manutencao', label:'CUSTOS MANUTENÇÃO', type:'eur', cost:true, getter:(h,y)=>n(RAW.hotels_costs[h]?.['MANUTENÇÃO']?.[y])},
  {id:'custos_energia', label:'CUSTOS ENERGIA', type:'eur', cost:true, getter:(h,y)=>n(RAW.hotels_costs[h]?.ENERGIA?.[y])},
  {id:'custos_pessoal', label:'CUSTOS PESSOAL', type:'eur', cost:true, getter:(h,y)=>n(RAW.hotels_costs[h]?.PESSOAL?.[y])},
  {id:'custos_comidas', label:'CUSTOS COMIDAS', type:'eur', cost:true, getter:(h,y)=>n(RAW.hotels_costs[h]?.COMIDAS?.[y])},
  {id:'custos_bebidas', label:'CUSTO BEBIDAS', type:'eur', cost:true, getter:(h,y)=>n(RAW.hotels_costs[h]?.BEBIDAS?.[y])},
  {id:'custo_direto_ab', label:'CUSTO DIRETO A&B', type:'pct', cost:true, getter:(h,y)=>ratioAB(h,y), ytdGetter:(h,y,m)=>hsYtdRatioAB(h,y,m)},
  {id:'outros_custos_operacionais', label:'OUTROS CUSTOS OPERACIONAIS', type:'eur', cost:true, getter:(h,y)=>{
    const total = totalCosts(h,y);
    const manut = n(RAW.hotels_costs[h]?.['MANUTENÇÃO']?.[y]);
    const pess  = n(RAW.hotels_costs[h]?.PESSOAL?.[y]);
    const ener  = n(RAW.hotels_costs[h]?.ENERGIA?.[y]);
    const com   = n(RAW.hotels_costs[h]?.COMIDAS?.[y]);
    const beb   = n(RAW.hotels_costs[h]?.BEBIDAS?.[y]);
    if(total == null || isNaN(total)) return n(RAW.hotels_costs[h]?.OPERACIONAIS?.[y]);
    return total - manut - pess - ener - com - beb;
  }},
  {id:'custos_totais', label:'CUSTOS TOTAIS', type:'eur', cost:true, getter:(h,y)=>totalCosts(h,y)},
  {group:'gop'},
  {id:'gop_com_sede', label:'GOP COM SEDE', type:'eur', getter:(h,y)=>gopComSede(h,y), ytdGetter:(h,y,m)=>hsYtdSum(h,y,m,(hh,yy)=>gopComSede(hh,yy))},
  {id:'gop_sem_sede', label:'GOP SEM SEDE', type:'eur', getter:(h,y)=>gopSemSede(h,y), ytdGetter:(h,y,m)=>hsYtdSum(h,y,m,(hh,yy)=>gopSemSede(hh,yy))},
  {group:'rh'},
  {id:'densidade_vg', label:'DENSIDADE COLABORADORES VG', type:'num', manual:true},
  {id:'densidade_tt', label:'DENSIDADE TT', type:'num', manual:true},
  {id:'densidade_estagiarios', label:'DENSIDADE ESTAGIÁRIOS', type:'num', manual:true},
  {id:'total_staff', label:'TOTAL STAFF', type:'num', manual:true},
  {group:'qualidade'},
  {id:'indice_satisfacao', label:'ÍNDICE SATISFAÇÃO', type:'num', manual:true},
  {id:'city_ledger', label:'CITY LEDGER', type:'eur', manual:true}
];
function hsMonthLabel(m){ return MES_NOME?.[m] || ('Mês '+m); }
function hsParseManual(v){
  if(v==null) return null;
  const t=String(v).trim().replace(/€/g,'').replace(/%/g,'').replace(/\s/g,'').replace(/\./g,'').replace(',', '.');
  if(!t) return null;
  const num=Number(t);
  return isFinite(num)?num:null;
}
function hsEscape(v){ return String(v||'').replace(/[&<>]/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[s])); }
function hsManualInput(h,m,row,field,type){
  const val=hsGetManualRaw(h,m,row.id,field) || '';
  return `<input class="hs-input-cell" data-manual-row="${row.id}" data-field="${field}" data-type="${type}" value="${hsEscape(val)}" placeholder="—" onblur="hsSaveDraftValue(this)"><span class="hs-input-note">manual</span>`;
}
function hsCell(h,m,row,field,val){
  return row.manual ? hsManualInput(h,m,row,field,row.type) : hsFmtVal(val,row.type);
}
function hsGetCellValue(h,m,row,field,fallback){
  if(!row.manual) return fallback;
  return hsParseManual(hsGetManualRaw(h,m,row.id,field));
}
function hsSaveDraftValue(el){
  const h=document.getElementById('hsHotel')?.value, m=document.getElementById('hsMes')?.value;
  if(!h||!m||!el?.dataset?.manualRow) return;
  hsSetManualRaw(h,m,el.dataset.manualRow,el.dataset.field,el.value.trim());
}
function hsFmtVal(v,type){
  if(v==null || isNaN(v)) return '—';
  if(type==='pct') return fmt(v,1)+'%';
  if(type==='eur2') return '€'+fmt(v,2);
  if(type==='eur') {
    const sign = v < 0 ? '-' : '';
    return sign + '€' + Math.abs(v).toLocaleString('pt-PT', {minimumFractionDigits:0, maximumFractionDigits:0});
  }
  if(type==='raw1') return fmt(v,1);
  return fmt(v,0);
}
function hsVar(v25,v26,type,isCost){
  if(v25==null || v26==null || isNaN(v25) || isNaN(v26)) return '<span class="pl-pct">—</span>';
  const diff = v26 - v25;
  const good = isCost ? diff <= 0 : diff >= 0;
  const cls = good ? 'good' : 'bad';
  const txt = type==='pct' ? ((diff>=0?'+':'')+fmt(diff,1)+' p.p.') : ((diff>=0?'+':'')+hsFmtVal(diff,type));
  return `<span class="hs-var ${cls}">${txt}</span>`;
}
function hsEnsureSelectors(){
  if(!RAW) return;
  const hSel=document.getElementById('hsHotel'), mSel=document.getElementById('hsMes');
  if(!hSel || !mSel) return;
  const hotels=getActiveHotels().length?getActiveHotels():RAW.hotel_list;
  const oldH=hSel.value;
  hSel.innerHTML=hotels.map(h=>`<option value="${h}">${h}</option>`).join('');
  if(oldH && hotels.includes(oldH)) hSel.value=oldH;
  const meses=Object.keys(STORE).map(Number).sort((a,b)=>a-b);
  const oldM=mSel.value;
  mSel.innerHTML=meses.map(m=>`<option value="${m}">${hsMonthLabel(m)}</option>`).join('');
  if(oldM && meses.includes(Number(oldM))) mSel.value=oldM;
  else if(selectedMeses.size) mSel.value=[...selectedMeses].sort((a,b)=>b-a)[0];
}
function hsDataForMonth(m){ return STORE?.[Number(m)] || RAW; }
function hsYtdSum(h, year, m, getter){
  let total=0, has=false;
  for(let mm=1; mm<=Number(m); mm++){
    const data=STORE?.[mm]; if(!data) continue;
    const old=RAW; RAW=data;
    const val=getter(h,year);
    RAW=old;
    if(val!=null && !isNaN(val)){ total += Number(val); has=true; }
  }
  return has ? total : null;
}
function hsYtdRatio(h, year, m, costField, revField){
  let cost=0, rev=0;
  const oldSel = new Set(selectedMeses || []);
  for(let mm=1; mm<=Number(m); mm++){
    const data=STORE?.[mm]; if(!data) continue;
    cost += n(data.hotels_costs?.[h]?.[costField]?.[year]);
    // Temporariamente força o mês para que o detalhe RD, quando existe, respeite a mesma regra de exclusão.
    selectedMeses = new Set([mm]);
    let r = null;
    if (revField === 'COMIDA') r = revComidas(h,year,data);
    else if (revField === 'BEBIDA') r = revBebidas(h,year,data);
    else r = n(data.hotels_rev?.[h]?.[revField]?.[year]);
    if (!r) r = n(data.hotels_rev?.[h]?.[revField]?.[year]);
    rev += n(r);
  }
  selectedMeses = oldSel;
  return rev>0 ? cost/rev*100 : null;
}
function hsYtdRatioAB(h, year, m){
  let cost=0, rev=0;
  const oldSel = new Set(selectedMeses || []);
  for(let mm=1; mm<=Number(m); mm++){
    const data=STORE?.[mm]; if(!data) continue;
    cost += n(data.hotels_costs?.[h]?.COMIDAS?.[year]) + n(data.hotels_costs?.[h]?.BEBIDAS?.[year]);
    selectedMeses = new Set([mm]);
    let r = revAB(h,year,data);
    if (!r) r = n(data.hotels_rev?.[h]?.ALIMENTACAO?.[year] ?? data.hotels_ops?.[h]?.['Receita FB']?.[year]);
    rev += n(r);
  }
  selectedMeses = oldSel;
  return rev>0 ? cost/rev*100 : null;
}
// Lê um valor oficial acumulado a partir do P&L acumulado carregado (STORE_ACUM[m]).
// Devolve null se não houver acumulado oficial para esse mês ou se a rubrica não mapear.
function hsAcumOficial(h, m, row, year){
  const acc = STORE_ACUM?.[Number(m)];
  if(!acc) return null;
  const opsMap = {
    receita_total:['hotels_ops','Receita Total'], receita_alojamento:['hotels_ops','Receita Alojamento'],
    receita_alimentacao:['hotels_ops','Receita FB'], gop_com_sede:['hotels_ops','GOP COM SEDE'],
    gop_sem_sede:['hotels_ops','GOP SEM SEDE'], adr:['hotels_ops','ADR'], adr_net:['hotels_ops','ADR NET']
  };
  const costMap = {
    custos_pessoal:'PESSOAL', custos_energia:'ENERGIA', custos_manutencao:'MANUTENÇÃO',
    custos_comidas:'COMIDAS', custos_bebidas:'BEBIDAS', custos_totais:'TOTAIS'
  };
  const readOp = (field)=>{ const o=acc?.hotels_ops?.[h]?.[field]; if(!o) return null; const v=o[year]; return (v==null||v===''||isNaN(Number(v)))?null:Number(v); };
  if(row.id in opsMap){ return readOp(opsMap[row.id][1]); }
  if(row.id in costMap){ const o=acc?.hotels_costs?.[h]?.[costMap[row.id]]; if(!o) return null; const v=o[year]; return (v==null||v===''||isNaN(Number(v)))?null:Number(v); }
  if(row.id==='taxa_ocupacao'){
    const oc=acc?.hotels_ops?.[h]?.Ocupados?.[year], di=acc?.hotels_ops?.[h]?.Disponiveis?.[year];
    return (n(di)>0)? n(oc)/n(di)*100 : null;
  }
  return null;
}

function hsYtdValue(h, m, row, year){
  if(row.manual) return null;
  // 1) Se existe P&L acumulado oficial para este mês, usa-o (bate sempre com o P&L)
  const oficial = hsAcumOficial(h, m, row, year);
  if(oficial != null) return oficial;
  // 2) Caso contrário, reconstrói por soma dos meses (comportamento anterior)
  if(row.ytdGetter) return row.ytdGetter(h, year, m);
  if(row.id==='taxa_ocupacao'){
    let occRooms=0, avail=0;
    for(let mm=1; mm<=Number(m); mm++){ const d=STORE?.[mm]?.hotels_ops?.[h]; if(!d) continue; occRooms+=n(d.Ocupados?.[year]); avail+=n(d.Disponiveis?.[year]); }
    return avail>0 ? occRooms/avail*100 : null;
  }
  if(row.id==='adr'){
    return hsWeightedAdrField(h, year, m, 'ADR');
  }
  if(row.id==='adr_net'){
    return hsWeightedAdrField(h, year, m, 'ADR NET');
  }
  return hsYtdSum(h, year, m, row.getter);
}

// Indica se o mês selecionado tem acumulado oficial carregado (para o rótulo de fonte na Ficha)
function hsTemAcumOficial(m){ return !!(STORE_ACUM && STORE_ACUM[Number(m)]); }

// ==========================================================
// COMENTÁRIOS AUTOMÁTICOS — motor por regras
// Funciona offline, sem API externa. Respeita hotel/região e meses selecionados.
// ==========================================================
function aiSafePct(v){ return (v==null || isNaN(v)) ? null : Number(v); }
function aiMonthList(){
  try{
    const arr = selectedMeses && selectedMeses.size ? [...selectedMeses].map(Number).filter(Number.isFinite) : [];
    if(arr.length) return arr.sort((a,b)=>a-b);
  }catch(e){}
  const m = Number(RAW?.mes);
  return Number.isFinite(m) && m>0 ? [m] : Object.keys(STORE||{}).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
}
function aiPeriodLabel(months){
  const ms=(months&&months.length?months:aiMonthList()).slice().sort((a,b)=>a-b);
  if(!ms.length) return 'período selecionado';
  if(ms.length===1) return hsMonthLabel(ms[0]);
  return `${hsMonthLabel(ms[0])} a ${hsMonthLabel(ms[ms.length-1])}`;
}
function aiDataForMonth(m){ return (STORE && STORE[Number(m)]) ? STORE[Number(m)] : RAW; }
function aiFmtE(v){ return hsFmtVal(v,'eur'); }
function aiFmtPct(v){ return v==null || isNaN(v) ? '—' : `${v>=0?'+':''}${fmt(v,1)}%`; }
function aiFmtPP(v){ return v==null || isNaN(v) ? '—' : `${v>=0?'+':''}${fmt(v,1)} p.p.`; }
function aiMetric(hotels, months){
  const out = {
    rec25:0, rec26:0, aloj25:0, aloj26:0, fb25:0, fb26:0,
    occRooms25:0, occRooms26:0, disp25:0, disp26:0,
    costs25:0, costs26:0, gop25:0, gop26:0,
    pessoal25:0, pessoal26:0, comidas25:0, comidas26:0, bebidas25:0, bebidas26:0,
    energia25:0, energia26:0, manut25:0, manut26:0, op25:0, op26:0
  };
  const hs = hotels && hotels.length ? hotels : getActiveHotels();
  const ms = months && months.length ? months : aiMonthList();
  const addCost = (data,h,field,y)=> n(data?.hotels_costs?.[h]?.[field]?.[y]);
  ms.forEach(m=>{
    const data = aiDataForMonth(m);
    hs.forEach(h=>{
      const ops = data?.hotels_ops?.[h] || {};
      const rev = data?.hotels_rev?.[h] || {};
      const cst = data?.hotels_costs?.[h] || {};
      out.rec25 += n(ops['Receita Total']?.[YR_PREV]); out.rec26 += n(ops['Receita Total']?.[YR_CUR]);
      out.aloj25 += n(ops['Receita Alojamento']?.[YR_PREV] ?? rev.ALOJAMENTO?.[YR_PREV]); out.aloj26 += n(ops['Receita Alojamento']?.[YR_CUR] ?? rev.ALOJAMENTO?.[YR_CUR]);
      out.fb25 += n(ops['Receita FB']?.[YR_PREV] ?? rev.ALIMENTACAO?.[YR_PREV]); out.fb26 += n(ops['Receita FB']?.[YR_CUR] ?? rev.ALIMENTACAO?.[YR_CUR]);
      out.occRooms25 += n(ops.Ocupados?.[YR_PREV]); out.occRooms26 += n(ops.Ocupados?.[YR_CUR]);
      out.disp25 += n(ops.Disponiveis?.[YR_PREV]); out.disp26 += n(ops.Disponiveis?.[YR_CUR]);
      const total25 = cst.TOTAIS?.[YR_PREV] != null ? n(cst.TOTAIS?.[YR_PREV]) : Object.values(cst).reduce((s,v)=>s+n(v?.[YR_PREV]),0);
      const total26 = cst.TOTAIS?.[YR_CUR] != null ? n(cst.TOTAIS?.[YR_CUR]) : Object.values(cst).reduce((s,v)=>s+n(v?.[YR_CUR]),0);
      out.costs25 += total25; out.costs26 += total26;
      out.pessoal25 += addCost(data,h,'PESSOAL',YR_PREV); out.pessoal26 += addCost(data,h,'PESSOAL',YR_CUR);
      out.comidas25 += addCost(data,h,'COMIDAS',YR_PREV); out.comidas26 += addCost(data,h,'COMIDAS',YR_CUR);
      out.bebidas25 += addCost(data,h,'BEBIDAS',YR_PREV); out.bebidas26 += addCost(data,h,'BEBIDAS',YR_CUR);
      out.energia25 += addCost(data,h,'ENERGIA',YR_PREV); out.energia26 += addCost(data,h,'ENERGIA',YR_CUR);
      out.manut25 += addCost(data,h,'MANUTENÇÃO',YR_PREV); out.manut26 += addCost(data,h,'MANUTENÇÃO',YR_CUR);
      out.op25 += addCost(data,h,'OPERACIONAIS',YR_PREV); out.op26 += addCost(data,h,'OPERACIONAIS',YR_CUR);
      const gv25 = gop(h, YR_PREV, data), gv26 = gop(h, YR_CUR, data);
      if (gv25 != null) out.gop25 += gv25;
      if (gv26 != null) out.gop26 += gv26;
    });
  });
  out.occ25 = out.disp25>0 ? out.occRooms25/out.disp25*100 : null;
  out.occ26 = out.disp26>0 ? out.occRooms26/out.disp26*100 : null;
  out.adr25 = out.occRooms25>0 ? out.aloj25/out.occRooms25 : null;
  out.adr26 = out.occRooms26>0 ? out.aloj26/out.occRooms26 : null;
  out.revpar25 = out.disp25>0 ? out.aloj25/out.disp25 : null;
  out.revpar26 = out.disp26>0 ? out.aloj26/out.disp26 : null;
  out.gopPct25 = out.rec25>0 ? out.gop25/out.rec25*100 : null;
  out.gopPct26 = out.rec26>0 ? out.gop26/out.rec26*100 : null;
  out.ratioAB25 = out.fb25>0 ? (out.comidas25+out.bebidas25)/out.fb25*100 : null;
  out.ratioAB26 = out.fb26>0 ? (out.comidas26+out.bebidas26)/out.fb26*100 : null;
  return out;
}
function aiTopCostPressures(m){
  const rows = [
    ['Pessoal', m.pessoal26-m.pessoal25], ['Comidas', m.comidas26-m.comidas25], ['Bebidas', m.bebidas26-m.bebidas25],
    ['Energia', m.energia26-m.energia25], ['Manutenção', m.manut26-m.manut25], ['Operacionais', m.op26-m.op25]
  ].filter(x=>Math.abs(x[1])>0.5).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]));
  return rows.slice(0,3);
}
function aiBuildNarrative(opts={}){
  const hotels = opts.hotels && opts.hotels.length ? opts.hotels : getActiveHotels();
  const months = opts.months && opts.months.length ? opts.months.map(Number) : aiMonthList();
  const label = opts.label || (hotels.length===1 ? hotels[0] : (hotels.length===RAW.hotel_list.length ? 'portefólio total' : 'região selecionada'));
  const period = aiPeriodLabel(months);
  const m = aiMetric(hotels, months);
  const recDelta = m.rec26-m.rec25, recPct = m.rec25 ? recDelta/Math.abs(m.rec25)*100 : null;
  const gopDelta = m.gop26-m.gop25, gopPct = m.gop25 ? gopDelta/Math.abs(m.gop25)*100 : null;
  const costsDelta = m.costs26-m.costs25, costsPct = m.costs25 ? costsDelta/Math.abs(m.costs25)*100 : null;
  const occDelta = (m.occ26==null||m.occ25==null)?null:m.occ26-m.occ25;
  const adrPct = (m.adr25&&m.adr26!=null)?(m.adr26-m.adr25)/Math.abs(m.adr25)*100:null;
  const gopMarginDelta = (m.gopPct26==null||m.gopPct25==null)?null:m.gopPct26-m.gopPct25;
  const ratioABDelta = (m.ratioAB26==null||m.ratioAB25==null)?null:m.ratioAB26-m.ratioAB25;
  const scopeTxt = hotels.length===1 ? `O hotel ${label}` : `O conjunto ${label}`;
  const main = `${scopeTxt}, no período ${period}, registou ${recDelta>=0?'crescimento':'quebra'} de receita de ${aiFmtE(Math.abs(recDelta))}${recPct!=null?` (${aiFmtPct(recPct)})`:''}. O GOP ${gopDelta>=0?'melhorou':'deteriorou-se'} em ${aiFmtE(Math.abs(gopDelta))}${gopPct!=null?` (${aiFmtPct(gopPct)})`:''}. ${costsDelta>=0?'Os custos aumentaram':'Os custos diminuíram'} ${aiFmtE(Math.abs(costsDelta))}${costsPct!=null?` (${aiFmtPct(costsPct)})`:''}, ${costsPct!=null&&recPct!=null ? (costsPct>recPct?'acima':'abaixo')+' da evolução da receita.' : 'face ao período homólogo.'}`;
  const bullets=[];
  bullets.push({cls:recDelta>=0?'good':'bad', txt:`Receita: ${recDelta>=0?'+':'-'}${aiFmtE(Math.abs(recDelta))}${recPct!=null?` · ${aiFmtPct(recPct)}`:''}`});
  bullets.push({cls:gopDelta>=0?'good':'bad', txt:`GOP: ${gopDelta>=0?'+':'-'}${aiFmtE(Math.abs(gopDelta))}${gopMarginDelta!=null?` · margem ${aiFmtPP(gopMarginDelta)}`:''}`});
  if(occDelta!=null) bullets.push({cls:occDelta>=0?'good':'bad', txt:`Ocupação: ${aiFmtPP(occDelta)}`});
  if(adrPct!=null) bullets.push({cls:adrPct>=0?'good':'bad', txt:`ADR: ${aiFmtPct(adrPct)}`});
  if(ratioABDelta!=null) bullets.push({cls:ratioABDelta<=0?'good':'bad', txt:`Rácio A&B: ${aiFmtPP(ratioABDelta)} (${ratioABDelta<=0?'melhoria':'deterioração'})`});
  const pressures = aiTopCostPressures(m);
  pressures.forEach(p=>bullets.push({cls:p[1]<=0?'good':'warn', txt:`${p[0]}: ${p[1]>=0?'+':'-'}${aiFmtE(Math.abs(p[1]))}`}));
  const actions=[];
  if(recDelta<0) actions.push('Rever segmentos/canais que explicam a quebra de receita e validar ações comerciais para recuperar procura.');
  if(costsPct!=null && recPct!=null && costsPct>recPct) actions.push('Validar rubricas de custo que crescem acima da receita e definir plano de contenção.');
  if(occDelta!=null && occDelta<0) actions.push('Analisar dias/segmentos com perda de ocupação e cruzar com preço médio praticado.');
  if(adrPct!=null && adrPct<0) actions.push('Rever política de preço e mix de canais para proteger ADR e RevPAR.');
  if(ratioABDelta!=null && ratioABDelta>0) actions.push('Rever consumos, quebras e preços de venda de A&B, sobretudo comidas/bebidas.');
  if(!actions.length) actions.push('Manter acompanhamento mensal e garantir que a melhoria se traduz em GOP acumulado.');
  return {main, bullets, actions, label, period, metrics:m};
}

function aiSafePct(newVal, oldVal){ return oldVal ? ((newVal-oldVal)/Math.abs(oldVal)*100) : null; }
function aiFmtSignedEur(v){ return (v>=0?'+':'-') + aiFmtE(Math.abs(v)); }
function aiSevLabel(sev){ return ({critical:'Crítico', attention:'Atenção', watch:'Vigilância', good:'Controlado'})[sev] || 'Análise'; }
function aiBuildDeepItems(narrative){
  const m = narrative?.metrics || {};
  const recDelta = m.rec26-m.rec25, recPct = aiSafePct(m.rec26,m.rec25);
  const gopDelta = m.gop26-m.gop25, gopPct = aiSafePct(m.gop26,m.gop25);
  const costsDelta = m.costs26-m.costs25, costsPct = aiSafePct(m.costs26,m.costs25);
  const occDelta = (m.occ26==null||m.occ25==null)?null:m.occ26-m.occ25;
  const adrPct = (m.adr25&&m.adr26!=null)?aiSafePct(m.adr26,m.adr25):null;
  const ratioABDelta = (m.ratioAB26==null||m.ratioAB25==null)?null:m.ratioAB26-m.ratioAB25;
  const pessoalPct = aiSafePct(m.pessoal26,m.pessoal25);
  const comidasPct = aiSafePct(m.comidas26,m.comidas25);
  const bebidasPct = aiSafePct(m.bebidas26,m.bebidas25);
  const energiaPct = aiSafePct(m.energia26,m.energia25);
  const manutPct = aiSafePct(m.manut26,m.manut25);
  const opPct = aiSafePct(m.op26,m.op25);
  const items=[];
  const add=(category,sev,evidence,question,action)=>items.push({category,sev,evidence,question,action});

  if(recDelta < 0){
    add('Receita', Math.abs(recPct||0)>8?'critical':'attention',
      `Receita ${aiFmtSignedEur(recDelta)}${recPct!=null?` (${aiFmtPct(recPct)})`:''}.`,
      'O diretor deve justificar que segmentos, canais, eventos, grupos ou períodos explicam a quebra de receita.',
      'Indicar ações comerciais concretas para recuperar procura, preço médio ou mix de canais no mês seguinte.');
  } else if(recPct!=null && recPct < 2){
    add('Receita', 'watch',
      `Receita cresceu apenas ${aiFmtPct(recPct)} (${aiFmtSignedEur(recDelta)}).`,
      'Justificar porque o crescimento foi reduzido e se existiram limitações de procura, preço ou disponibilidade.',
      'Identificar oportunidades de upselling, canais e segmentos com margem de recuperação.');
  }

  if(recPct!=null && gopPct!=null && recPct>0 && gopPct < recPct-3){
    add('GOP / Margem', gopPct<0?'critical':'attention',
      `Receita ${aiFmtPct(recPct)}, mas GOP ${aiFmtPct(gopPct)}.`,
      'O diretor deve explicar que rubricas absorveram a margem adicional e porque o crescimento de receita não se converteu em GOP.',
      'Apresentar medidas de contenção nas rubricas com maior impacto e estimar efeito no GOP.');
  } else if(recDelta<0 && gopDelta<recDelta){
    const leverage = Math.abs(recDelta)>1 ? Math.abs(gopDelta)/Math.abs(recDelta) : null;
    add('GOP / Alavancagem negativa', leverage&&leverage>6?'critical':'attention',
      `Receita ${aiFmtSignedEur(recDelta)} e GOP ${aiFmtSignedEur(gopDelta)}${leverage?` · alavancagem ${fmt(leverage,1)}x`:''}.`,
      'Justificar porque a perda de GOP foi superior à perda de receita e quais os custos que não acompanharam a quebra.',
      'Rever imediatamente custos variáveis, escalas, consumos e compras associadas ao nível real de atividade.');
  }

  if(costsPct!=null && recPct!=null && costsPct > recPct + 3){
    add('Custos totais', costsPct>recPct+8?'critical':'attention',
      `Custos ${aiFmtPct(costsPct)} vs receita ${aiFmtPct(recPct)}.`,
      'O diretor deve justificar porque os custos cresceram acima da receita e indicar se há efeitos extraordinários ou recorrentes.',
      'Separar custos controláveis de não controláveis e definir ações com responsável e prazo.');
  }

  if(pessoalPct!=null && recPct!=null && pessoalPct > recPct + 3){
    add('Pessoal', pessoalPct>recPct+8?'critical':'attention',
      `Pessoal ${aiFmtPct(pessoalPct)} vs receita ${aiFmtPct(recPct)}.`,
      'Justificar se o aumento resulta de horas extra, reforço de equipa, outsourcing, absentismo, férias, baixa produtividade ou alterações salariais.',
      'Rever escalas por ocupação real, rácios de produtividade e necessidade de horas extra.');
  }

  if(occDelta!=null && occDelta < -2){
    add('Ocupação', occDelta<-6?'critical':'attention',
      `Ocupação ${aiFmtPP(occDelta)} face ao ano anterior.`,
      'Justificar os dias/segmentos que explicam a perda de ocupação e se houve cancelamentos, menor procura ou restrições de inventário.',
      'Cruzar pickup, preço, canais e calendário de eventos para definir ações comerciais.');
  }
  if(adrPct!=null && adrPct < -2){
    add('ADR / Preço médio', adrPct<-6?'critical':'attention',
      `ADR ${aiFmtPct(adrPct)}.`,
      'Justificar se a queda resulta de mix de canais, promoções, grupos, pressão competitiva ou perda de categorias superiores.',
      'Rever pricing, upselling e dependência de canais de menor margem.');
  }

  if(ratioABDelta!=null && ratioABDelta > 1.5){
    add('Rácio A&B', ratioABDelta>4?'critical':'attention',
      `Rácio A&B deteriorou-se ${aiFmtPP(ratioABDelta)}.`,
      'Justificar deterioração por preço de compra, desperdício, ofertas, consumos internos, quebras ou alterações de mix.',
      'Validar fichas técnicas, controlo de stocks, inventários e preços de venda nos outlets.');
  }
  if(comidasPct!=null && recPct!=null && comidasPct > recPct + 5){
    add('Comidas', comidasPct>recPct+12?'critical':'attention',
      `Custos de comidas ${aiFmtPct(comidasPct)} vs receita ${aiFmtPct(recPct)}.`,
      'Justificar compras, inventários, desperdício, menus, pequenos-almoços, grupos ou eventos que expliquem o desvio.',
      'Rever capitações, fichas técnicas, controlo de produção e validação de stocks.');
  }
  if(bebidasPct!=null && recPct!=null && bebidasPct > recPct + 5){
    add('Bebidas', bebidasPct>recPct+12?'critical':'attention',
      `Custos de bebidas ${aiFmtPct(bebidasPct)} vs receita ${aiFmtPct(recPct)}.`,
      'Justificar consumos, quebras, ofertas, garrafeira, bares, eventos ou registos fora dos outlets de A&B.',
      'Validar controlo de bares, inventários, ofertas e correta classificação de vendas SV/Staff/HORECA.');
  }

  if(energiaPct!=null && energiaPct > 8 && (recPct==null || energiaPct > recPct + 3)){
    add('Energia', energiaPct>18?'critical':'attention',
      `Energia ${aiFmtPct(energiaPct)}${recPct!=null?` vs receita ${aiFmtPct(recPct)}`:''}.`,
      'Justificar aumento por ocupação, clima, tarifas, avarias, AVAC, piscinas, cozinha, lavandaria ou equipamentos específicos.',
      'Identificar medidas de poupança, anomalias de consumo e leituras a acompanhar semanalmente.');
  }
  if(manutPct!=null && manutPct > 12){
    add('Manutenção', manutPct>30?'critical':'attention',
      `Manutenção ${aiFmtPct(manutPct)} (${aiFmtSignedEur(m.manut26-m.manut25)}).`,
      'Explicar se o aumento é pontual ou recorrente, e que intervenções/equipamentos originaram o desvio.',
      'Separar manutenção corretiva/preventiva e indicar se existe risco de repetição.');
  }
  if(opPct!=null && recPct!=null && opPct > recPct + 6){
    add('Operacionais', opPct>recPct+15?'critical':'attention',
      `Custos operacionais ${aiFmtPct(opPct)} vs receita ${aiFmtPct(recPct)}.`,
      'Justificar quais as sub-rubricas que explicam o desvio e se são necessárias para o nível de operação.',
      'Detalhar ações de controlo por rubrica, responsável e prazo.');
  }

  const flow = recDelta>0 ? (gopDelta/Math.abs(recDelta)*100) : null;
  const negLev = recDelta<0 ? (Math.abs(gopDelta)/Math.abs(recDelta||1)) : null;
  if(flow!=null && flow < 40){
    add('Eficiência GOP', flow<20?'critical':'attention',
      `Flow-through de ${fmt(flow,1)}%.`,
      'Justificar porque a receita incremental não foi convertida em resultado operacional.',
      'Identificar as 3 rubricas que mais consumiram a margem adicional.');
  }
  if(negLev!=null && negLev > 4){
    add('Eficiência GOP', negLev>6?'critical':'attention',
      `Alavancagem negativa de ${fmt(negLev,1)}x.`,
      'Justificar porque cada euro perdido em receita gerou perda desproporcional de GOP.',
      'Ajustar custos variáveis à atividade e validar custos fixos ou extraordinários.');
  }

  if(!items.length){
    add('Síntese positiva', 'good',
      'Não foram detetados desvios críticos nos principais indicadores da seleção.',
      'O diretor deve confirmar se a evolução favorável é sustentável e se há riscos para o próximo mês.',
      'Manter acompanhamento de receita, custos variáveis e rácios A&B.');
  }
  const order={critical:0, attention:1, watch:2, good:3};
  return items.sort((a,b)=>(order[a.sev]??9)-(order[b.sev]??9)).slice(0,10);
}
function aiDeepHtml(narrative, limit){
  const items = aiBuildDeepItems(narrative).slice(0, limit || 8);
  if(!items.length) return '<div class="ai-deep-empty">Sem pontos críticos de justificação para a seleção atual.</div>';
  return `<div class="ai-deep-wrap"><div class="ai-deep-title">Pontos a justificar pelo diretor</div><div class="ai-deep-grid">${items.map(it=>`<div class="ai-deep-card sev-${it.sev}"><div class="ai-deep-head"><div class="ai-deep-cat">${hsEscape(it.category)}</div><div class="ai-deep-badge">${hsEscape(aiSevLabel(it.sev))}</div></div><div class="ai-deep-txt">${hsEscape(it.evidence)}</div><div class="ai-deep-question">${hsEscape(it.question)}</div><div class="ai-deep-action">Ação sugerida: ${hsEscape(it.action)}</div></div>`).join('')}</div></div>`;
}
function aiDeepExportRows(narrative){
  return aiBuildDeepItems(narrative).map(it=>({
    categoria: it.category,
    severidade: aiSevLabel(it.sev),
    evidencia: it.evidence,
    justificacao: it.question,
    acao: it.action
  }));
}

// ==========================================================
// COMENTÁRIOS SUGERIDOS POR RUBRICA (fecho do mês)
// Não substituem os comentários do diretor — são uma sugestão
// que pode ser inserida/copiada. Cruzam P&L + Compras & Artigos
// (RD_STORE) + Snapshots de Ocupação.
// ==========================================================

// Famílias de A&B no extrato de compras (mesmo nome das rubricas do P&L).
const HS_FAM_COMIDAS = 'COMIDAS';
const HS_FAM_BEBIDAS = 'BEBIDAS';

function hsNormName(v){ try { return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim(); } catch(e){ return ''; } }

// ---- Fonte 1: sub-detalhe do P&L (REMUNERAÇÕES, TRABALHO TEMPORÁRIO, ELECTRICIDADE, etc.) ----
// Existe apenas para o hotel exportado em detalhe em cada ficheiro mensal (sintra_detail / hotel_detail).
// Mapa: rubrica-mãe -> lista de sub-rubricas que lhe pertencem.
const HS_DETAIL_MAP = {
  PESSOAL:    ['REMUNERAÇÕES','TRABALHO TEMPORÁRIO','OUTROS CUSTOS DE PESSOAL','SEGUROS PESSOAL','FORMAÇÃO'],
  ENERGIA:    ['ELECTRICIDADE','ÁGUA','COMBUSTIVEIS','GÁS'],
  MANUTENÇÃO: ['SERVIÇOS EXTERNOS MANUTENÇÃO','CONTRATOS FIXOS MANUTENÇÃO','CONSUMIVEIS MANUTENÇÃO','FERRAMENTAS E UTENSILIOS','MATERIAIS CONSTRUÇÃO CIVIL','PEÇAS E ACESSORIOS'],
  OPERACIONAIS:['COMISSÕES DE VENDA','SERVIÇOS EXTERNOS OPERACIONAIS','FF&E','LOUÇAS, VIDROS E TALHERES','ROUPAS','QUIMICOS E UTENSILIOS','MATERIAIS GRÁFICOS','OUTROS OPERACIONAIS','TAXAS & COIMAS','CONTRATOS FIXOS OPERACIONAIS']
};
// Devolve o objeto de detalhe do P&L para um hotel/mês, se existir (procura em todos os meses do período).
function hsPnlDetail(hotel, months){
  const hN = hsNormName(hotel);
  const ms = (months&&months.length)?months:aiMonthList();
  // Acumula sub-rubricas ao longo dos meses do período
  const acc = {};
  let found = false;
  ms.forEach(m=>{
    const data = aiDataForMonth(m);
    if(!data) return;
    // Candidatos a objeto de detalhe dentro do STORE do mês
    const candidates = [];
    if (data.sintra_detail && hN === 'COLLECTION SINTRA') candidates.push(data.sintra_detail);
    if (data.hotel_detail) candidates.push(data.hotel_detail);
    // procura chaves *_detail cujo prefixo corresponda ao hotel
    Object.keys(data).forEach(k=>{
      if(/_detail$/.test(k) && data[k] && typeof data[k]==='object'){
        // heurística: o objeto de detalhe não identifica o hotel, por isso só usamos hotel_detail/sintra_detail
      }
    });
    candidates.forEach(det=>{
      // valida que o detalhe é mesmo deste hotel: compara Receitas totais do detalhe com a receita do hotel
      const recDet = Number(det?.Receitas?.[YR_CUR]);
      const recHot = Number(data?.hotels_ops?.[hotel]?.['Receita Total']?.[YR_CUR]);
      const okHotel = (hN==='COLLECTION SINTRA') || (isFinite(recDet)&&isFinite(recHot)&&recHot>0&&Math.abs(recDet-recHot)/recHot<0.02);
      if(!okHotel) return;
      found = true;
      Object.keys(det).forEach(k=>{
        const o = det[k];
        if(o && typeof o==='object' && ('2025' in o || '2026' in o)){
          if(!acc[k]) acc[k]={a:0,b:0};
          acc[k].a += Number(o[YR_PREV])||0;
          acc[k].b += Number(o[YR_CUR])||0;
        }
      });
    });
  });
  return found ? acc : null;
}
// Explica uma rubrica-mãe via sub-detalhe do P&L (fonte preferida). Devolve string ou ''.
function hsExplicaPnl(hotel, months, mae){
  const det = hsPnlDetail(hotel, months);
  if(!det) return '';
  const subs = HS_DETAIL_MAP[mae] || [];
  const rows = subs.map(s=>{
    const o = det[s]; if(!o) return null;
    return { s, a:o.a, b:o.b, d:o.b-o.a };
  }).filter(Boolean).filter(x=>Math.abs(x.d)>50).sort((x,y)=>Math.abs(y.d)-Math.abs(x.d)).slice(0,3);
  if(!rows.length) return '';
  const nice = { 'REMUNERAÇÕES':'remunerações','TRABALHO TEMPORÁRIO':'trabalho temporário','OUTROS CUSTOS DE PESSOAL':'outros custos de pessoal','ELECTRICIDADE':'eletricidade','ÁGUA':'água','COMBUSTIVEIS':'combustíveis','SERVIÇOS EXTERNOS MANUTENÇÃO':'serviços externos de manutenção','CONTRATOS FIXOS MANUTENÇÃO':'contratos fixos','CONSUMIVEIS MANUTENÇÃO':'consumíveis','FERRAMENTAS E UTENSILIOS':'ferramentas e utensílios','MATERIAIS CONSTRUÇÃO CIVIL':'materiais de construção','PEÇAS E ACESSORIOS':'peças e acessórios','COMISSÕES DE VENDA':'comissões de venda','SERVIÇOS EXTERNOS OPERACIONAIS':'serviços externos','FF&E':'FF&E','ROUPAS':'roupas' };
  const partes = rows.map(x=>{
    const pctS = x.a>0 ? ` (${x.d>=0?'+':''}${fmt(x.d/Math.abs(x.a)*100,0)}%)` : '';
    return `${nice[x.s]||x.s.toLowerCase()} ${x.d>=0?'+':'−'}${aiFmtE(Math.abs(x.d))}${pctS}`;
  });
  return `Detalhe P&L: ${partes.join('; ')}.`;
}

// ---- Fonte 2: Compras & Artigos (CD_STORE) — nível família→subfamília→grupo→artigo ----
// Os dados de compras são publicados em window.__VG_CD pelo módulo Compras (outro bloco <script>).
// CD.A = [hotelIdx, mesIdx, famIdx, subIdx, grpIdx, artIdx, valor, qtd]
function hsCD(){ return (typeof window!=='undefined' && window.__VG_CD) ? window.__VG_CD : null; }
function hsCDready(){ const c=hsCD(); return !!(c && Array.isArray(c.A) && Array.isArray(c.HOT) && Array.isArray(c.FAM)); }
function hsHotelIdx(hotel){ const c=hsCD(); if(!c) return -1; const hN=hsNormName(hotel); for(let i=0;i<c.HOT.length;i++){ if(hsNormName(c.HOT[i])===hN) return i; } return -1; }
function hsFamIdx(familia){ const c=hsCD(); if(!c) return -1; const fN=hsNormName(familia); for(let i=0;i<c.FAM.length;i++){ if(hsNormName(c.FAM[i])===fN) return i; } return -1; }
// Índices de meses (posições em CD.MESES) para um ano + conjunto de meses (1..12)
function hsMesIdxSet(year, months){
  const c=hsCD(); if(!c) return new Set();
  const y=Number(String(year).replace('.0',''));
  const mm=new Set((months||[]).map(Number).filter(Boolean));
  const set=new Set();
  (c.MESES||[]).forEach((ym,i)=>{ const yy=Math.floor(ym/100), m=ym%100; if(yy===y && (!mm.size || mm.has(m))) set.add(i); });
  return set;
}
// Ventilações/regimes a ignorar (imputações internas, não compras reais)
const HS_VENTILACAO_RE = /\b(PA|MP|PC|AP|HB|BB|FB)\b|VENTILAC|VENTILAÇ|IMPUTAC|IMPUTAÇ|REGIME|PENSAO|PENSÃO|BUFFET|MEIA.?PENSAO|MEIA.?PENSÃO|ALL.?INCLUSIVE|DEBITO INTERNO|DÉBITO INTERNO|CONSUMO INTERNO|TRANSFERENC|TRANSFERÊNC/;
function hsIsVentilacaoArt(artNome){ return HS_VENTILACAO_RE.test(hsNormName(artNome)); }

// Agrega CD.A de uma família, para um hotel/ano/meses, ao nível pedido ('sub'|'grp'|'art').
function hsCDagg(hotelIdx, famIdx, mesSet, nivel){
  const c=hsCD(); const m=new Map(); if(!c) return m;
  const col = nivel==='sub'?3 : nivel==='grp'?4 : 5;
  const ART=c.ART;
  for(const r of c.A){
    if(r[0]!==hotelIdx) continue;
    if(r[2]!==famIdx) continue;
    if(!mesSet.has(r[1])) continue;
    if(nivel==='art' && hsIsVentilacaoArt(ART[r[5]])) continue;
    const k=r[col];
    const o=m.get(k)||{v:0,q:0}; o.v+=Number(r[6])||0; o.q+=Number(r[7])||0; m.set(k,o);
  }
  return m;
}
// Desdobra uma família pela variação € homóloga ao nível pedido; decompõe qtd vs preço ao nível do artigo.
function hsDesdobraFamilia(hotel, months, familia, nivel){
  if(!hsCDready()) return { linhas:[], nivel };
  const c=hsCD();
  const hi=hsHotelIdx(hotel), fi=hsFamIdx(familia);
  if(hi<0||fi<0) return { linhas:[], nivel };
  const setA=hsMesIdxSet(YR_PREV, months), setB=hsMesIdxSet(YR_CUR, months);
  const ma=hsCDagg(hi,fi,setA,nivel), mb=hsCDagg(hi,fi,setB,nivel);
  const dic = nivel==='sub'?c.SUB : nivel==='grp'?c.GRP : c.ART;
  const keys=new Set([...ma.keys(),...mb.keys()]);
  const arr=[...keys].map(k=>{
    const oa=ma.get(k)||{v:0,q:0}, ob=mb.get(k)||{v:0,q:0};
    const d=ob.v-oa.v;
    let driver='';
    if(nivel==='art' && oa.q>0 && ob.q>0){
      const pu_a=oa.v/oa.q, pu_b=ob.v/ob.q;
      const qEff=(ob.q-oa.q)*pu_a, pEff=(pu_b-pu_a)*ob.q;
      driver = Math.abs(qEff)>=Math.abs(pEff) ? (qEff>=0?'+quantidade':'−quantidade') : (pEff>=0?'+preço':'−preço');
    }
    return {k, nome:(dic[k]||'—'), a:oa.v, b:ob.v, d, driver};
  }).filter(x=>x.nome && x.nome!=='—' && Math.abs(x.d)>30);
  arr.sort((x,y)=>Math.abs(y.d)-Math.abs(x.d));
  return { linhas: arr.slice(0,4), nivel };
}
// Frase de desdobramento — subfamília + os artigos que mais pesam.
function hsFraseFamilia(hotel, months, familia, prefixo){
  const partesTudo=[];
  const sub = hsDesdobraFamilia(hotel, months, familia, 'sub');
  const art = hsDesdobraFamilia(hotel, months, familia, 'art');
  const fmtLinha = x => { const nome=x.nome.length>40?x.nome.slice(0,38)+'…':x.nome; const drv=x.driver?` [${x.driver}]`:''; return `${nome.toLowerCase()} ${x.d>=0?'+':'−'}${aiFmtE(Math.abs(x.d))}${drv}`; };
  if(sub.linhas.length) partesTudo.push(`por subfamília: ${sub.linhas.map(fmtLinha).join('; ')}`);
  if(art.linhas.length) partesTudo.push(`artigos: ${art.linhas.map(fmtLinha).join('; ')}`);
  if(!partesTudo.length) return '';
  return `${prefixo||'Compras ('+familia+')'} — ${partesTudo.join(' · ')}.`;
}

// Explica um custo desdobrando a FAMÍLIA correspondente no extrato de compras + sub-detalhe do P&L.
// tipo: 'pessoal'|'energia'|'manutencao' (a família de compras tem o mesmo nome da rubrica-mãe).
function hsExplicaCusto(hotel, months, tipo){
  const famMap = { pessoal:'PESSOAL', energia:'ENERGIA', manutencao:'MANUTENÇÃO' };
  const partes = [];
  const pnl = hsExplicaPnl(hotel, months, famMap[tipo]);   // fonte preferida (sub-rubricas do P&L)
  if(pnl) partes.push(pnl);
  const art = hsFraseFamilia(hotel, months, famMap[tipo], 'Compras & Artigos');
  if(art) partes.push(art);
  return partes.join(' ');
}

function hsOccSnapshot(hotel, months){
  if (typeof OCC_SNAPSHOTS === 'undefined' || !OCC_SNAPSHOTS.length) return null;
  const snap = OCC_SNAPSHOTS[OCC_SNAPSHOTS.length-1];
  if (!snap || !snap.data) return null;
  const hN = hsNormName(hotel);
  let key = Object.keys(snap.data).find(k => hsNormName(k) === hN);
  if (!key) key = Object.keys(snap.data).find(k => hsNormName(k).includes(hN) || hN.includes(hsNormName(k)));
  if (!key) return null;
  const d = snap.data[key];
  const idxs = (months||[]).map(m=>Number(m)-1).filter(i=>i>=0&&i<12);
  const avg = (arr) => { const vs = idxs.map(i=>arr?.[i]).filter(v=>v!=null&&!isNaN(v)); return vs.length? vs.reduce((s,v)=>s+v,0)/vs.length : null; };
  return { label: snap.label, o25: avg(d?.[YR_PREV]), o26: avg(d?.[YR_CUR]) };
}

// Motor principal: devolve uma sugestão de comentário para uma rubrica (row.id)
function hsSuggestForRow(hotel, months, rowId){
  const m = aiMetric([hotel], months);
  const per = aiPeriodLabel(months);
  const E = aiFmtE, P = aiFmtPct, PP = aiFmtPP;
  const pct = (nw,od)=> od ? (nw-od)/Math.abs(od)*100 : null;
  const recPct = pct(m.rec26,m.rec25);
  const s = [];

  switch(rowId){
    case 'taxa_ocupacao': {
      const occD = (m.occ26==null||m.occ25==null)?null:m.occ26-m.occ25;
      s.push(`Ocupação de ${m.occ26==null?'—':fmt(m.occ26,1)+'%'} (${occD==null?'s/ homólogo':PP(occD)+' vs '+YR_PREV}).`);
      const snap = hsOccSnapshot(hotel, months);
      if (snap && snap.o26!=null){
        const sd = (snap.o25!=null)? snap.o26-snap.o25 : null;
        s.push(`Snapshot de ocupação (${snap.label}): ${fmt(snap.o26,1)}%${sd!=null?` (${PP(sd)} vs ${YR_PREV})`:''}.`);
      }
      if (occD!=null && recPct!=null){
        if (occD>0 && recPct<0) s.push('Apesar de mais ocupação, a receita caiu — indício de pressão no ADR/preço médio ou no mix de canais.');
        else if (occD<0 && recPct>0) s.push('Receita cresce com menos ocupação — sustentada por ADR/preço médio mais alto.');
        else if (occD>0 && recPct>0) s.push('Crescimento de ocupação e de receita alinhados.');
      }
      break;
    }
    case 'adr': case 'adr_net': {
      const adrP = pct(m.adr26,m.adr25);
      s.push(`ADR ${m.adr26==null?'—':E(m.adr26)} (${adrP==null?'s/ homólogo':P(adrP)}).`);
      if (adrP!=null && m.occ26!=null && m.occ25!=null){
        const occD=m.occ26-m.occ25;
        if (adrP>0 && occD<0) s.push('Estratégia de preço acima de volume: preço a compensar perda de ocupação.');
        if (adrP<0 && occD>0) s.push('Ganho de ocupação obtido com cedência de preço — validar mix de canais e promoções.');
      }
      break;
    }
    case 'receita_total': {
      s.push(`Receita total ${E(m.rec26)} (${P(recPct)} · ${(m.rec26-m.rec25)>=0?'+':'−'}${E(Math.abs(m.rec26-m.rec25))}).`);
      const alojP=pct(m.aloj26,m.aloj25), fbP=pct(m.fb26,m.fb25);
      const drivers=[];
      if (alojP!=null) drivers.push(`alojamento ${P(alojP)}`);
      if (fbP!=null) drivers.push(`A&B ${P(fbP)}`);
      if (drivers.length) s.push(`Contributos: ${drivers.join(', ')}.`);
      const snap = hsOccSnapshot(hotel, months);
      if (snap && snap.o26!=null && snap.o25!=null){
        s.push(`Ocupação (snapshot) ${PP(snap.o26-snap.o25)} — ${snap.o26-snap.o25>=0?'suporta':'contraria'} a evolução da receita de alojamento.`);
      }
      break;
    }
    case 'receita_alojamento': {
      const alojP=pct(m.aloj26,m.aloj25);
      s.push(`Receita de alojamento ${E(m.aloj26)} (${P(alojP)}).`);
      if (m.occ26!=null&&m.occ25!=null&&m.adr26!=null&&m.adr25!=null){
        s.push(`Decomposição: ocupação ${PP(m.occ26-m.occ25)} e ADR ${P(pct(m.adr26,m.adr25))}.`);
      }
      break;
    }
    case 'receita_alimentacao': {
      const fbP=pct(m.fb26,m.fb25);
      const abCustoP = pct((m.comidas26+m.bebidas26),(m.comidas25+m.bebidas25));
      s.push(`Receita de A&B ${E(m.fb26)} (${P(fbP)}).`);
      if (fbP!=null && abCustoP!=null){
        const coerente = (fbP>=0)===(abCustoP>=0);
        s.push(`Custo direto de A&B ${P(abCustoP)} — ${coerente?'coerente':'incoerente'} com a variação de receita de A&B.`);
        if (!coerente && fbP<0 && abCustoP>0) s.push('⚠ Receita de A&B a cair mas custo a subir: rever quebras, consumos internos, ofertas e fichas técnicas.');
        if (!coerente && fbP>0 && abCustoP<0) s.push('Receita de A&B sobe com custo a descer: ganho de eficiência/margem a confirmar.');
        if (m.ratioAB26!=null&&m.ratioAB25!=null) s.push(`Rácio custo/receita A&B ${PP(m.ratioAB26-m.ratioAB25)} (${(m.ratioAB26-m.ratioAB25)<=0?'melhoria':'deterioração'}).`);
        const artC = hsFraseFamilia(hotel, months, HS_FAM_COMIDAS, 'Compras de comida');
        if (artC) s.push(artC);
        const artB = hsFraseFamilia(hotel, months, HS_FAM_BEBIDAS, 'Compras de bebida');
        if (artB) s.push(artB);
      }
      break;
    }
    case 'custos_pessoal': {
      const p=pct(m.pessoal26,m.pessoal25);
      s.push(`Pessoal ${E(m.pessoal26)} (${P(p)}${recPct!=null?` vs receita ${P(recPct)}`:''}).`);
      const ex = hsExplicaCusto(hotel, months, 'pessoal');
      if (ex) s.push(ex); else s.push('Sem detalhe de Compras & Artigos para pessoal neste hotel/período (vencimentos e trabalho temporário vêm por processamento, não por compra).');
      break;
    }
    case 'custos_energia': {
      const e=pct(m.energia26,m.energia25);
      s.push(`Energia ${E(m.energia26)} (${P(e)}).`);
      const ex = hsExplicaCusto(hotel, months, 'energia');
      if (ex) s.push(ex); else s.push('Sem detalhe de Compras & Artigos na família Energia para este hotel/período — carregar o extrato permite separar eletricidade, gás, água e combustível.');
      break;
    }
    case 'custos_manutencao': {
      const mt=pct(m.manut26,m.manut25);
      s.push(`Manutenção ${E(m.manut26)} (${P(mt)}${m.manut26-m.manut25>=0?' · +':' · −'}${E(Math.abs(m.manut26-m.manut25))}).`);
      const ex = hsExplicaCusto(hotel, months, 'manutencao');
      if (ex) s.push(ex); else s.push('Sem detalhe de Compras & Artigos na família Manutenção para este hotel/período — carregar o extrato permite descer a subfamília e artigo.');
      break;
    }
    case 'custos_comidas': {
      const c=pct(m.comidas26,m.comidas25);
      s.push(`Custo de comidas ${E(m.comidas26)} (${P(c)}${recPct!=null?` vs receita ${P(recPct)}`:''}).`);
      const art = hsFraseFamilia(hotel, months, HS_FAM_COMIDAS, 'Compras de comida');
      if (art) s.push(art);
      else s.push('Sem detalhe de compras na família Comidas para o período — carregar o extrato de Compras & Artigos permite desdobrar por subfamília/artigo.');
      break;
    }
    case 'custos_bebidas': {
      const b=pct(m.bebidas26,m.bebidas25);
      s.push(`Custo de bebidas ${E(m.bebidas26)} (${P(b)}${recPct!=null?` vs receita ${P(recPct)}`:''}).`);
      const art = hsFraseFamilia(hotel, months, HS_FAM_BEBIDAS, 'Compras de bebida');
      if (art) s.push(art);
      else s.push('Sem detalhe de compras na família Bebidas para o período — carregar o extrato de Compras & Artigos permite desdobrar por subfamília/artigo.');
      break;
    }
    case 'custo_direto_ab': {
      if (m.ratioAB26!=null&&m.ratioAB25!=null) s.push(`Custo direto A&B ${fmt(m.ratioAB26,1)}% da receita A&B (${PP(m.ratioAB26-m.ratioAB25)}).`);
      const fbP=pct(m.fb26,m.fb25), abCustoP=pct((m.comidas26+m.bebidas26),(m.comidas25+m.bebidas25));
      if (fbP!=null&&abCustoP!=null) s.push(`Receita A&B ${P(fbP)} vs custo A&B ${P(abCustoP)} — ${(fbP>=0)===(abCustoP>=0)?'movimento coerente':'⚠ movimento incoerente, a investigar'}.`);
      break;
    }
    case 'custos_totais': {
      const c=pct(m.costs26,m.costs25);
      s.push(`Custos totais ${E(m.costs26)} (${P(c)}${recPct!=null?` vs receita ${P(recPct)}`:''}).`);
      if (c!=null&&recPct!=null&&c>recPct) s.push('Custos a crescer acima da receita — margem sob pressão.');
      const press = aiTopCostPressures(m);
      if (press.length) s.push('Maiores pressões: '+press.map(p=>`${p[0]} ${p[1]>=0?'+':'−'}${aiFmtE(Math.abs(p[1]))}`).join('; ')+'.');
      break;
    }
    case 'gop_com_sede': case 'gop_sem_sede': {
      const g=pct(m.gop26,m.gop25);
      s.push(`GOP ${E(m.gop26)} (${P(g)}${(m.gopPct26!=null&&m.gopPct25!=null)?` · margem ${PP(m.gopPct26-m.gopPct25)}`:''}).`);
      if (recPct!=null&&g!=null){
        if (recPct>0 && g<recPct-3) s.push('Receita cresce mais do que o GOP — parte do crescimento foi absorvida por custos.');
        if (recPct<0){ const lev = Math.abs(m.rec26-m.rec25)>1?Math.abs(m.gop26-m.gop25)/Math.abs(m.rec26-m.rec25):null; if(lev&&lev>1.2) s.push(`Alavancagem negativa ${fmt(lev,1)}x: perda de GOP superior à de receita.`); }
      }
      break;
    }
    case 'receita_diversos': {
      const d25=n(RAW.hotels_rev[hotel]?.DIVERSOS?.[YR_PREV]), d26=n(RAW.hotels_rev[hotel]?.DIVERSOS?.[YR_CUR]);
      s.push(`Receita diversos ${E(d26)} (${P(pct(d26,d25))}).`);
      const det = hsPnlDetail(hotel, months);
      if(det){
        const subs=['SPA','LAVANDARIA','CABELEIREIRO','ENTRETENIMENTO','OUTROS ESPAÇOS','MERCHANDISING','OUTROS'];
        const rows=subs.map(k=>{const o=det[k];return o?{k,d:(o.b-o.a)}:null;}).filter(Boolean).filter(x=>Math.abs(x.d)>50).sort((x,y)=>Math.abs(y.d)-Math.abs(x.d)).slice(0,3);
        if(rows.length) s.push('Detalhe P&L: '+rows.map(x=>`${x.k.toLowerCase()} ${x.d>=0?'+':'−'}${aiFmtE(Math.abs(x.d))}`).join('; ')+'.');
      }
      break;
    }
    default:
      s.push(`${per}: sem regra específica para esta rubrica — comparar mês e acumulado com o homólogo.`);
  }
  return s.join(' ');
}

// UI: gerar/mostrar sugestão numa rubrica
window.hsGenSuggestion = function(rowId){
  const h=document.getElementById('hsHotel')?.value, m=Number(document.getElementById('hsMes')?.value);
  if(!h||!m) return;
  const box = document.querySelector(`#hsTableBody tr[data-row="${rowId}"] .hs-suggest-box`);
  if(!box) return;
  let txt='';
  try { txt = hsSuggestForRow(h,[m],rowId); }
  catch(e){ console.error('Erro na sugestão', e); txt='Não foi possível gerar a sugestão para esta rubrica.'; }
  box.querySelector('.hs-suggest-text').textContent = txt;
  box.dataset.text = txt;
  box.style.display='block';
};
window.hsInsertSuggestion = function(rowId){
  const box = document.querySelector(`#hsTableBody tr[data-row="${rowId}"] .hs-suggest-box`);
  const ta  = document.querySelector(`#hsTableBody tr[data-row="${rowId}"] textarea[data-row="${rowId}"]`);
  if(!box||!ta) return;
  const sug = box.dataset.text||'';
  const cur = ta.value.trim();
  ta.value = cur ? (cur + (cur.endsWith('.')?'':'.') + ' ' + sug) : sug; // acrescenta, nunca substitui
  hsSaveDraftComment(ta);
  ta.focus();
};
window.hsCopySuggestion = function(rowId){
  const box = document.querySelector(`#hsTableBody tr[data-row="${rowId}"] .hs-suggest-box`);
  if(!box) return;
  const t=box.dataset.text||'';
  if(navigator.clipboard) navigator.clipboard.writeText(t).then(()=>showToast('Sugestão copiada'));
};
window.hsDismissSuggestion = function(rowId){
  const box = document.querySelector(`#hsTableBody tr[data-row="${rowId}"] .hs-suggest-box`);
  if(box) box.style.display='none';
};
// Gera sugestões para todas as rubricas (só preenche a caixa de sugestão, não toca nos comentários)
window.hsGenAllSuggestions = function(){
  HS_ROWS.forEach(r=>{ if(r.id && !r.manual) { try { hsGenSuggestion(r.id); } catch(e){} } });
  showToast('Sugestões geradas — usa "Inserir" em cada rubrica para adicionar ao comentário');
};

function aiRenderCard(targetId, narrative){
  const el=document.getElementById(targetId); if(!el) return;
  if(!RAW){ el.className='ai-insights-card empty'; el.innerHTML=''; return; }
  el.className='ai-insights-card';
  el.innerHTML = `<div class="ai-insights-head"><div><div class="ai-insights-title">Comentário automático</div><div class="ai-insights-sub">Gerado por regras com base no hotel/região e meses selecionados.</div></div><span class="ai-chip">${hsEscape(narrative.period)}</span></div>
  <div class="ai-body"><div class="ai-main-comment">${hsEscape(narrative.main)}</div><div class="ai-list">${narrative.bullets.slice(0,7).map(b=>`<div class="ai-item ${b.cls}">${hsEscape(b.txt)}</div>`).join('')}</div></div>
  <div class="ai-actions">${narrative.actions.slice(0,5).map(a=>`<div class="ai-action">${hsEscape(a)}</div>`).join('')}</div>
  ${aiDeepHtml(narrative, 8)}`;
}
function aiRenderGlobalInsights(){
  if(!RAW) return;
  const hotels=getActiveHotels();
  const regionName = window.currentRegion==='todos' ? 'portefólio total' : (window.currentRegion || 'região selecionada');
  aiRenderCard('aiGlobalInsights', aiBuildNarrative({hotels, months:aiMonthList(), label:regionName}));
}

async function hsRender(){
  if(!RAW) return;
  hsEnsureSelectors();
  const h=document.getElementById('hsHotel')?.value || getActiveHotels()[0] || RAW.hotel_list[0];
  const m=Number(document.getElementById('hsMes')?.value || [...selectedMeses][0] || RAW.mes || 0);
  try { await hsEnsureHotelLoaded(h); } catch(e) { console.warn('Ficha partilhada:', e); }
  const oldRAW=RAW, data=hsDataForMonth(m);
  if(data) RAW=data;
  // Força selectedMeses para o mês da ficha durante o render
  // para garantir que ratioAB e revAB usam sempre o mês correcto
  const oldMeses = selectedMeses;
  selectedMeses = new Set([m]);
  __abIndexCache = { key: null, map: new Map() }; // invalida cache do índice AB
  const dir=document.getElementById('hsDiretor');
  if(dir) dir.value=hsGetDirector(h) || HS_DIRECTORS[h] || '';
  const cards=[
    ['Receita Total', hsFmtVal(n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_CUR]),'eur'), fmtPct(((n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_CUR])-n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_PREV]))/Math.abs(n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_PREV])||1))*100)],
    ['GOP Com Sede', hsFmtVal(gopComSede(h,YR_CUR),'eur'), 'Margem '+(gopComSedePct(h,YR_CUR)==null?'—':fmt(gopComSedePct(h,YR_CUR),1)+'%')],
    ['Ocupação', hsFmtVal(occ(h,YR_CUR),'pct'), YR_PREV+': '+hsFmtVal(occ(h,YR_PREV),'pct')],
    ['ADR', hsFmtVal(adr(h,YR_CUR),'eur2'), YR_PREV+': '+hsFmtVal(adr(h,YR_PREV),'eur2')],
    ['RevPAR', hsFmtVal(revpar(h,YR_CUR),'eur2'), YR_PREV+': '+hsFmtVal(revpar(h,YR_PREV),'eur2')],
    ['Custos '+hsMonthLabel(m), hsFmtVal(totalCosts(h,YR_CUR),'eur'), YR_PREV+': '+hsFmtVal(totalCosts(h,YR_PREV),'eur')]
  ];
  document.getElementById('hsCards').innerHTML=cards.map(c=>`<div class="hs-card"><div class="hs-card-lbl">${c[0]}</div><div class="hs-card-val">${c[1]}</div><div class="hs-card-sub">${c[2]}</div></div>`).join('');
  // O acumulado é reconstruído lendo mês a mês os P&L carregados (STORE[1..m]).
  // Se faltar algum mês, avisa — é a única razão para o Acum. não bater com o Excel.
  const acumEl=document.getElementById('hsAcumNote');
  if(acumEl){
    if(hsTemAcumOficial(m)){
      // Acumulado oficial carregado: as colunas Acum. batem com o P&L
      acumEl.style.display='block';
      acumEl.style.background='rgba(16,185,129,.08)';
      acumEl.style.borderColor='rgba(16,185,129,.35)';
      acumEl.innerHTML='✓ <b>Acumulado oficial:</b> as colunas "Acum." usam o P&L acumulado carregado até '+hsMonthLabel(m)+' — batem ao euro com o mapa P&L (GOP com sede, ADR, ADR NET incluídos).';
    } else {
      const faltam=[];
      for(let mm=1; mm<=m; mm++){ if(!STORE?.[mm]) faltam.push(mm); }
      acumEl.style.display='block';
      acumEl.style.background='';
      acumEl.style.borderColor='';
      if(faltam.length){
        acumEl.innerHTML='⚠️ <b>Acumulado estimado por soma</b> e falta carregar o P&L de '+faltam.map(hsMonthLabel).join(', ')+'. Carrega o <b>P&L acumulado do ano</b> (até '+hsMonthLabel(m)+') para as colunas "Acum." baterem ao euro com o Excel.';
      } else {
        acumEl.innerHTML='ℹ️ <b>Acumulado estimado por soma</b> dos meses carregados. Para o GOP com sede e ADR/ADR NET baterem ao euro com o P&L, carrega o <b>P&L acumulado do ano</b> (até '+hsMonthLabel(m)+') — os custos de sede não somam linearmente mês a mês.';
      }
    }
  }
  const recDelta=n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_CUR])-n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_PREV]);
  const gopDelta=n(gop(h,YR_CUR))-n(gop(h,YR_PREV));
  const occDelta=(occ(h,YR_CUR)??0)-(occ(h,YR_PREV)??0);
  const costDelta=totalCosts(h,YR_CUR)-totalCosts(h,YR_PREV);
  const aiNarr = aiBuildNarrative({hotels:[h], months:[m], label:h});
  document.getElementById('hsInsights').innerHTML = `<div id="hsAiComment" class="ai-insights-card" style="margin:0">` +
    `<div class="ai-insights-head"><div><div class="ai-insights-title">Comentário automático IA</div><div class="ai-insights-sub">Baseado no mês selecionado e na comparação entre o ano atual e o ano anterior.</div></div><span class="ai-chip">${hsEscape(aiNarr.period)}</span></div>` +
    `<div class="ai-body"><div class="ai-main-comment">${hsEscape(aiNarr.main)}</div><div class="ai-list">${aiNarr.bullets.slice(0,7).map(b=>`<div class="ai-item ${b.cls}">${hsEscape(b.txt)}</div>`).join('')}</div></div>` +
    `<div class="ai-actions">${aiNarr.actions.slice(0,5).map(a=>`<div class="ai-action">${hsEscape(a)}</div>`).join('')}</div>` +
    aiDeepHtml(aiNarr, 10) +
    `</div>`;

  const rows=[];
  HS_ROWS.forEach(r=>{
    if(r.group){ rows.push('<tr class="hs-row-group"><td colspan="8"></td></tr>'); return; }
    const raw25=r.manual?null:r.getter(h,YR_PREV), raw26=r.manual?null:r.getter(h,YR_CUR);
    const rawA25=r.manual?null:hsYtdValue(h,m,r,YR_PREV), rawA26=r.manual?null:hsYtdValue(h,m,r,YR_CUR);
    const v25=hsGetCellValue(h,m,r,'mes2025',raw25);
    const v26=hsGetCellValue(h,m,r,'mes2026',raw26);
    const a25=hsGetCellValue(h,m,r,'acum2025',rawA25);
    const a26=hsGetCellValue(h,m,r,'acum2026',rawA26);
    const comment=hsGetComment(h,m,r.id) || '';
    rows.push(`<tr data-row="${r.id}"><td>${r.label}</td><td>${hsCell(h,m,r,'mes2025',raw25)}</td><td>${hsCell(h,m,r,'mes2026',raw26)}</td><td>${hsCell(h,m,r,'acum2025',rawA25)}</td><td>${hsCell(h,m,r,'acum2026',rawA26)}</td><td>${hsVar(v25,v26,r.type,r.cost)}</td><td>${hsVar(a25,a26,r.type,r.cost)}</td><td class="hs-comment-cell"><textarea data-row="${r.id}" placeholder="Comentário mensal obrigatório para ${r.label.toLowerCase()}..." onblur="hsSaveDraftComment(this)">${hsEscape(comment)}</textarea><div class="hs-suggest-box" style="display:none"><div class="hs-suggest-head">💡 Comentário sugerido</div><div class="hs-suggest-text"></div><div class="hs-suggest-actions"><button class="hs-mini-btn primary" onclick="hsInsertSuggestion('${r.id}')">Inserir</button><button class="hs-mini-btn" onclick="hsCopySuggestion('${r.id}')">Copiar</button><button class="hs-mini-btn" onclick="hsDismissSuggestion('${r.id}')">Fechar</button></div></div><div class="hs-comment-tools"><span>Editável por hotel/mês</span><button class="hs-mini-btn suggest" onclick="hsGenSuggestion('${r.id}')">💡 Sugerir</button><button class="hs-mini-btn" onclick="hsClearComment('${r.id}')">Limpar</button></div></td></tr>`);
  });
  document.getElementById('hsTableBody').innerHTML=rows.join('');
  hsUpdateMonthStatus(h,m);
  hsRenderHistory(h);
  RAW=oldRAW;
  // Restaura selectedMeses e invalida cache AB
  selectedMeses = oldMeses;
  __abIndexCache = { key: null, map: new Map() };
}
function hsSaveDirector(){
  const h=document.getElementById('hsHotel')?.value, v=document.getElementById('hsDiretor')?.value || '';
  if(h) hsSetDirector(h, v);
}
function hsSaveDraftComment(t){
  const h=document.getElementById('hsHotel')?.value, m=document.getElementById('hsMes')?.value;
  if(!h||!m||!t?.dataset?.row) return;
  hsSetComment(h,m,t.dataset.row,t.value.trim());
  hsUpdateMonthStatus(h,m);
}
function hsClearComment(row){
  const h=document.getElementById('hsHotel')?.value, m=document.getElementById('hsMes')?.value;
  if(!h||!m||!row) return;
  hsSetComment(h,m,row,'');
  const t=document.querySelector(`#hsTableBody textarea[data-row="${row}"]`); if(t) t.value='';
  hsUpdateMonthStatus(h,m);
}
function hsUpdateMonthStatus(h,m){
  const el=document.getElementById('hsMonthStatus'); if(!el) return;
  const total=HS_ROWS.filter(r=>r.id).length;
  const done=HS_ROWS.filter(r=>r.id && (hsGetComment(h,m,r.id)||'').trim()).length;
  el.textContent=`Comentários: ${done}/${total}`;
  el.className='hs-status-pill '+(done===total?'good':(done>0?'warn':''));
}
async function hsExportRegion() {
  try { if(window.VG?.performance?.ensureXLSX) await window.VG.performance.ensureXLSX(); }
  catch(e) { showToast('Não foi possível carregar a biblioteca Excel: '+(e.message||e), true); return; }
  if (typeof XLSX === 'undefined' || !XLSX.utils) { showToast('Biblioteca Excel indisponível.', true); return; }
  const m = document.getElementById('hsMes')?.value;
  if (!m) { alert('Selecciona um mês primeiro.'); return; }

  const regionLabels = { todos:'Todos os Hotéis', norte:'Norte e Centro', lisboa:'Lisboa & Ilhas', alentejo:'Alentejo', algarve:'Algarve' };
  let activeRegion = 'todos';
  const regionBtnMap = {norte:'rbNorte', lisboa:'rbLisboa', alentejo:'rbAlentejo', algarve:'rbAlgarve', todos:'rbTodos'};
  for (const r of ['norte','lisboa','alentejo','algarve','todos']) {
    const btn = document.getElementById(regionBtnMap[r]);
    if (btn && btn.classList.contains('active')) { activeRegion = r; break; }
  }
  const regionLabel = regionLabels[activeRegion] || 'Regiao';
  const hotels = (activeRegion === 'todos' ? RAW.hotel_list : (REGIOES[activeRegion] || []).filter(h => RAW.hotel_list.includes(h)));
  if (!hotels.length) { alert('Sem hotéis para exportar.'); return; }

  await hsSaveAllComments(true);
  await hsEnsureHotelsLoaded(hotels);
  const mesTxt = hsMonthLabel(Number(m));
  const exportDate = new Date().toLocaleString('pt-PT');

  // Cores hex sem #
  const C = {
    headerBg: '1F2937', headerFg: 'FFFFFF',
    metaBg:   '374151', metaFg:   'FFFFFF',
    metaVBg:  'F3F4F6', metaVFg:  '111827',
    colHdBg:  '374151', colHdFg:  'FFFFFF',
    chartBg:  '111827', chartFg:  'FBBF24',
    indBg:    'F9FAFB', indFg:    '111827',
    gapBg:    '404040',
    goodBg:   'C6EFCE', goodFg:   '006100',
    badBg:    'FFC7CE', badFg:    '9C0006',
    neutBg:   'E5E7EB', neutFg:   '374151',
    white:    'FFFFFF', black:    '111827',
  };

  function cell(v, opts={}) {
    const c = { v: v ?? '', t: typeof v === 'number' ? 'n' : 's' };
    if (opts.bold || opts.bg || opts.fg || opts.sz || opts.wrap || opts.align || opts.numFmt) {
      c.s = {};
      if (opts.bold || opts.bg || opts.fg || opts.sz) {
        c.s.font = { bold: !!opts.bold, color: { rgb: opts.fg || C.black }, sz: opts.sz || 10 };
      }
      if (opts.bg) c.s.fill = { fgColor: { rgb: opts.bg }, patternType: 'solid' };
      if (opts.align) c.s.alignment = { horizontal: opts.align, wrapText: !!opts.wrap };
      else if (opts.wrap) c.s.alignment = { wrapText: true };
      if (opts.numFmt) c.s.numFmt = opts.numFmt;
      c.s.border = { top:{style:'thin',color:{rgb:'C9C9C9'}}, bottom:{style:'thin',color:{rgb:'C9C9C9'}}, left:{style:'thin',color:{rgb:'C9C9C9'}}, right:{style:'thin',color:{rgb:'C9C9C9'}} };
    }
    return c;
  }

  function buildHotelSheet(h) {
    const oldRAW = RAW, data = hsDataForMonth(m);
    if (data) RAW = data;
    const diretor = hsGetDirector(h) || HS_DIRECTORS[h] || '';

    const aoa = []; // array of arrays of cell objects
    const merges = [];
    let row = 0;

    function addMerge(r, c, rs, cs) { merges.push({s:{r,c}, e:{r:r+rs-1, c:c+cs-1}}); }

    // Título
    aoa.push([cell('Ficha mensal do hotel — ' + h, {bold:true, bg:C.headerBg, fg:C.headerFg, sz:14}), ...Array(7).fill(cell('', {bg:C.headerBg}))]);
    addMerge(row, 0, 1, 8); row++;

    // Meta
    const metas = [
      ['Hotel', h, 'Diretor(a)', diretor, 'Mês', mesTxt],
      ['Data de exportação', exportDate]
    ];
    metas.forEach(mt => {
      const r = [];
      for (let i=0; i<mt.length; i+=2) {
        r.push(cell(mt[i], {bold:true, bg:C.metaBg, fg:C.metaFg}));
        const span = (i===mt.length-2 && mt.length<6) ? 5 : 1;
        r.push(cell(mt[i+1], {bg:C.metaVBg, fg:C.metaVFg, bold:true}));
        if (span>1) for(let s=1;s<span;s++) r.push(cell('', {bg:C.metaVBg}));
      }
      while(r.length<8) r.push(cell('', {bg:C.metaVBg}));
      if (mt.length<=2) { addMerge(row,1,1,7); }
      aoa.push(r); row++;
    });

    // Espaço
    aoa.push(Array(8).fill(cell(''))); row++;

    // Cabeçalho da tabela de indicadores
    const colHdStyle = {bold:true, bg:C.colHdBg, fg:C.colHdFg, align:'center'};
    aoa.push([
      cell('Indicador', colHdStyle),
      cell('Result. mês '+YR_PREV, colHdStyle),
      cell('Result. mês '+YR_CUR, colHdStyle),
      cell('Result. acum. '+YR_PREV, colHdStyle),
      cell('Result. acum. '+YR_CUR, colHdStyle),
      cell('Variação mês', colHdStyle),
      cell('Variação ano', colHdStyle),
      cell('Justificação / comentários', colHdStyle),
    ]);
    row++;

    // Linhas de indicadores
    HS_ROWS.forEach(r2 => {
      if (r2.group) {
        aoa.push(Array(8).fill(cell('', {bg:C.gapBg})));
        row++; return;
      }
      const vals = hsRowExportValues(h, m, r2);
      const comment = hsGetComment(h,m,r2.id) || '';
      const mesDiff = (vals.v25==null||vals.v26==null) ? null : vals.v26-vals.v25;
      const anoDiff = (vals.a25==null||vals.a26==null) ? null : vals.a26-vals.a25;

      function varStyle(diff, isCost) {
        if (diff==null||isNaN(diff)) return {};
        const good = isCost ? diff<=0 : diff>=0;
        return good ? {bg:C.goodBg, fg:C.goodFg, bold:true} : {bg:C.badBg, fg:C.badFg, bold:true};
      }

      aoa.push([
        cell(r2.label, {bold:true, bg:C.indBg}),
        cell(vals.mes25||'', {align:'right'}),
        cell(vals.mes26||'', {align:'right'}),
        cell(vals.acum25||'', {align:'right'}),
        cell(vals.acum26||'', {align:'right'}),
        cell(vals.mesVar||'', {...varStyle(mesDiff,r2.cost), align:'right'}),
        cell(vals.anoVar||'', {...varStyle(anoDiff,r2.cost), align:'right'}),
        cell(comment, {wrap:true}),
      ]);
      row++;
    });

    RAW = oldRAW;

    // Construir worksheet
    const ws = {};
    ws['!merges'] = merges;
    ws['!cols'] = [{wch:36},{wch:16},{wch:16},{wch:16},{wch:16},{wch:14},{wch:14},{wch:45}];
    let maxRow = 0;
    aoa.forEach((r2, ri) => {
      r2.forEach((c2, ci) => {
        if (!c2) return;
        const addr = XLSX.utils.encode_cell({r:ri, c:ci});
        ws[addr] = c2;
      });
      maxRow = ri;
    });
    ws['!ref'] = XLSX.utils.encode_range({s:{r:0,c:0}, e:{r:maxRow, c:7}});
    return ws;
  }

  const wb = XLSX.utils.book_new();
  hotels.forEach(h => {
    const ws = buildHotelSheet(h);
    const sheetName = h.replace(/[:\\/?\*\[\]]/g,'').substring(0,31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  const safeRegion = regionLabel.replace(/[^a-z0-9]+/gi,'_');
  XLSX.writeFile(wb, `ficha_regiao_${safeRegion}_${m}_${YR_CUR}.xlsx`);
  showToast(`\u2713 Excel exportado \u2014 ${hotels.length} hotéis da região ${regionLabel}`);
}

async function hsSaveAllComments(quiet){
  const h=document.getElementById('hsHotel')?.value, m=document.getElementById('hsMes')?.value;
  if(!h||!m) return false;
  // Atualiza primeiro a memória de forma síncrona para que exportações/print que
  // chamam esta função sem await usem imediatamente os valores acabados de editar.
  hsSaveDirector();
  document.querySelectorAll('#hsTableBody textarea[data-row]').forEach(t=>hsSetComment(h,m,t.dataset.row,t.value.trim(),false));
  document.querySelectorAll('#hsTableBody input[data-manual-row]').forEach(i=>hsSetManualRaw(h,m,i.dataset.manualRow,i.dataset.field,i.value.trim(),false));
  hsUpdateMonthStatus(h,m);
  const ok = await hsFlushHotel(h);
  if(!quiet) showToast(ok ? ('✓ Ficha mensal partilhada — '+h+' · '+hsMonthLabel(Number(m))) : ('⚠ Ficha guardada nesta sessão, mas não foi possível sincronizar '+h), !ok);
  hsRenderHistory(h);
  return ok;
}
function hsRenderHistory(h){
  const box=document.getElementById('hsHistory'); if(!box) return;
  const items=[];
  const y=hsSharedYear();
  const months=HS_SHARED_CACHE[h]?.comments?.[y] || {};
  Object.entries(months).forEach(([m, rows])=>{
    Object.entries(rows || {}).forEach(([rowId,val])=>{
      if(!val) return;
      const row=HS_ROWS.find(r=>r.id===rowId);
      items.push({m:Number(m), row:row?.label||rowId, val:String(val)});
    });
  });
  items.sort((a,b)=>b.m-a.m || String(a.row).localeCompare(String(b.row),'pt'));
  box.innerHTML=items.length?items.slice(0,20).map(i=>`<div class="hs-history-item"><b>${hsMonthLabel(i.m)} · ${i.row}</b><br>${i.val.replace(/[&<>]/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]))}</div>`).join(''):'<div class="hs-history-item">Ainda não existem comentários guardados para este hotel.</div>';
}
function hsVarPlain(v25,v26,type,isCost){
  if(v25==null || v26==null || isNaN(v25) || isNaN(v26)) return '';
  const diff = v26 - v25;
  if(type==='pct') return (diff>=0?'+':'')+fmt(diff,1)+' p.p.';
  return (diff>=0?'+':'')+hsFmtVal(diff,type);
}
function hsPlainVal(v,type){
  const out = hsFmtVal(v,type);
  return out==='—' ? '' : out;
}
function hsRowExportValues(h,m,r){
  const raw25=r.manual?null:r.getter(h,YR_PREV), raw26=r.manual?null:r.getter(h,YR_CUR);
  const rawA25=r.manual?null:hsYtdValue(h,m,r,YR_PREV), rawA26=r.manual?null:hsYtdValue(h,m,r,YR_CUR);
  const v25=hsGetCellValue(h,m,r,'mes2025',raw25);
  const v26=hsGetCellValue(h,m,r,'mes2026',raw26);
  const a25=hsGetCellValue(h,m,r,'acum2025',rawA25);
  const a26=hsGetCellValue(h,m,r,'acum2026',rawA26);
  return {
    v25, v26, a25, a26,
    mesVar: hsVarPlain(v25,v26,r.type,r.cost),
    anoVar: hsVarPlain(a25,a26,r.type,r.cost),
    mes25: hsPlainVal(v25,r.type),
    mes26: hsPlainVal(v26,r.type),
    acum25: hsPlainVal(a25,r.type),
    acum26: hsPlainVal(a26,r.type)
  };
}
function hsExcelEsc(v){
  return String(v ?? '').replace(/[&<>]/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]));
}
function hsExcelNum(v){
  return (v==null || isNaN(v)) ? '' : Number(v);
}
function hsExcelVariationClass(diff,isCost){
  if(diff==null || isNaN(diff)) return '';
  const good = isCost ? diff <= 0 : diff >= 0;
  return good ? 'xls-good' : 'xls-bad';
}
function hsExcelVariationText(v25,v26,type){
  if(v25==null || v26==null || isNaN(v25) || isNaN(v26)) return '';
  const diff = v26 - v25;
  if(type==='pct') return (diff>=0?'+':'')+fmt(diff,1)+' p.p.';
  return (diff>=0?'+':'')+hsFmtVal(diff,type);
}
function hsExcelBar(label,v25,v26,type,isCost){
  const a = Math.abs(Number(v25)||0), b = Math.abs(Number(v26)||0);
  const max = Math.max(a,b,1);
  const w25 = Math.max(2, Math.min(100, a/max*100));
  const w26 = Math.max(2, Math.min(100, b/max*100));
  const diff = (v26==null||v25==null||isNaN(v26)||isNaN(v25)) ? null : v26-v25;
  const cls = hsExcelVariationClass(diff,isCost);
  return `<tr>
    <td class="chart-label">${hsExcelEsc(label)}</td>
    <td class="chart-val">${hsExcelEsc(hsPlainVal(v25,type))}</td>
    <td><div class="bar-track"><div class="bar bar-2025" style="width:${w25}%"></div></div></td>
    <td class="chart-val">${hsExcelEsc(hsPlainVal(v26,type))}</td>
    <td><div class="bar-track"><div class="bar bar-2026" style="width:${w26}%"></div></div></td>
    <td class="${cls}">${hsExcelEsc(hsExcelVariationText(v25,v26,type))}</td>
  </tr>`;
}
function hsBuildFichaBodyBlock(h, m){
  const oldRAW=RAW, data=hsDataForMonth(m);
  if(data) RAW=data;
  const diretor=hsGetDirector(h) || HS_DIRECTORS[h] || '';
  const mesTxt=hsMonthLabel(Number(m));
  const exportDate=new Date().toLocaleString('pt-PT');
  const rows=[];
  HS_ROWS.forEach(r=>{
    if(r.group){ rows.push({group:true}); return; }
    const vals=hsRowExportValues(h,m,r);
    const mesDiff = (vals.v25==null || vals.v26==null || isNaN(vals.v25) || isNaN(vals.v26)) ? null : vals.v26-vals.v25;
    const anoDiff = (vals.a25==null || vals.a26==null || isNaN(vals.a25) || isNaN(vals.a26)) ? null : vals.a26-vals.a25;
    rows.push({r, vals, mesDiff, anoDiff, comment:hsGetComment(h,m,r.id)||''});
  });

  const aiExcelNarr = aiBuildNarrative({hotels:[h], months:[Number(m)], label:h});
  const keyCharts = [
    {label:'TAXA DE OCUPAÇÃO', type:'pct', cost:false, v25:occ(h,YR_PREV), v26:occ(h,YR_CUR)},
    {label:'ADR', type:'eur2', cost:false, v25:adr(h,YR_PREV), v26:adr(h,YR_CUR)},
    {label:'RevPAR', type:'eur2', cost:false, v25:revpar(h,YR_PREV), v26:revpar(h,YR_CUR)},
    {label:'RECEITA TOTAL', type:'eur', cost:false, v25:n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_PREV]), v26:n(RAW.hotels_ops[h]?.['Receita Total']?.[YR_CUR])},
    {label:'GOP', type:'eur', cost:false, v25:gop(h,YR_PREV), v26:gop(h,YR_CUR)},
    {label:'CUSTOS TOTAIS', type:'eur', cost:true, v25:totalCosts(h,YR_PREV), v26:totalCosts(h,YR_CUR)},
    {label:'RÁCIO COMIDAS', type:'pct', cost:true, v25:ratioComidas(h,YR_PREV), v26:ratioComidas(h,YR_CUR)},
    {label:'RÁCIO BEBIDAS', type:'pct', cost:true, v25:ratioBebidas(h,YR_PREV), v26:ratioBebidas(h,YR_CUR)},
    {label:'RÁCIO A&B', type:'pct', cost:true, v25:ratioAB(h,YR_PREV), v26:ratioAB(h,YR_CUR)}
  ];
  const costRows = rows.filter(x=>x.r && x.r.cost && x.r.type!=='pct').slice(0,8).map(x=>({
    label:x.r.label, type:x.r.type, cost:true, v25:x.vals.v25, v26:x.vals.v26
  }));

  const detailRows = rows.map(x=>{
    if(x.group) return `<tr class="section-gap"><td colspan="8"></td></tr>`;
    const r=x.r, vals=x.vals;
    return `<tr>
      <td class="indicator">${hsExcelEsc(r.label)}</td>
      <td class="num">${hsExcelEsc(vals.mes25)}</td>
      <td class="num">${hsExcelEsc(vals.mes26)}</td>
      <td class="num">${hsExcelEsc(vals.acum25)}</td>
      <td class="num">${hsExcelEsc(vals.acum26)}</td>
      <td class="num ${hsExcelVariationClass(x.mesDiff,r.cost)}">${hsExcelEsc(vals.mesVar)}</td>
      <td class="num ${hsExcelVariationClass(x.anoDiff,r.cost)}">${hsExcelEsc(vals.anoVar)}</td>
      <td class="comment">${hsExcelEsc(x.comment).replace(/\n/g,'<br>')}</td>
    </tr>`;
  }).join('');

  const block = `
<table>
  <tr><td class="title" colspan="8">Ficha mensal do hotel — ${hsExcelEsc(h)}</td></tr>
  <tr><td class="meta">Hotel</td><td class="meta-v" colspan="2">${hsExcelEsc(h)}</td><td class="meta">Diretor(a)</td><td class="meta-v" colspan="2">${hsExcelEsc(diretor)}</td><td class="meta">Mês</td><td class="meta-v">${hsExcelEsc(mesTxt)}</td></tr>
  <tr><td class="meta">Data de exportação</td><td class="meta-v" colspan="7">${hsExcelEsc(exportDate)}</td></tr>
  <tr><td class="meta">Resumo automático</td><td class="meta-v" colspan="7">${hsExcelEsc(aiExcelNarr.main)}</td></tr>
  <tr><td class="meta">Ações sugeridas</td><td class="meta-v" colspan="7">${hsExcelEsc(aiExcelNarr.actions.join(' | '))}</td></tr>
</table>
<br>
<table>
  <tr><td class="chart-title" colspan="5">Pontos a justificar pelo diretor</td></tr>
  <tr class="head"><th>Rubrica</th><th>Prioridade</th><th>Evidência</th><th>Justificação esperada</th><th>Ação sugerida</th></tr>
  ${aiDeepExportRows(aiExcelNarr).map(x=>`<tr><td class="indicator">${hsExcelEsc(x.categoria)}</td><td class="${x.severidade==='Crítico'?'xls-bad':(x.severidade==='Atenção'?'xls-bad':(x.severidade==='Vigilância'?'xls-neutral':'xls-good'))}">${hsExcelEsc(x.severidade)}</td><td>${hsExcelEsc(x.evidencia)}</td><td>${hsExcelEsc(x.justificacao)}</td><td>${hsExcelEsc(x.acao)}</td></tr>`).join('')}
</table>
<br>
<table>
  <tr><td class="chart-title" colspan="6">Resumo visual — principais indicadores</td></tr>
  <tr class="head"><th>Indicador</th><th>${YR_PREV}</th><th>Gráfico ${YR_PREV}</th><th>${YR_CUR}</th><th>Gráfico ${YR_CUR}</th><th>Variação</th></tr>
  ${keyCharts.map(x=>hsExcelBar(x.label,x.v25,x.v26,x.type,x.cost)).join('')}
</table>
<br>
<table>
  <tr><td class="chart-title" colspan="6">Gráfico de custos por rubrica</td></tr>
  <tr class="head"><th>Rubrica</th><th>${YR_PREV}</th><th>Gráfico ${YR_PREV}</th><th>${YR_CUR}</th><th>Gráfico ${YR_CUR}</th><th>Variação</th></tr>
  ${costRows.map(x=>hsExcelBar(x.label,x.v25,x.v26,x.type,x.cost)).join('')}
  <tr><td class="note" colspan="6">Nos custos, aumentos aparecem a vermelho e reduções aparecem a verde. Nos restantes indicadores, aumentos aparecem a verde e reduções a vermelho.</td></tr>
</table>
<br>
<table>
  <tr class="head"><th>Indicador</th><th>Result. mês ${YR_PREV}</th><th>Result. mês ${YR_CUR}</th><th>Result. acum. ${YR_PREV}</th><th>Result. acum. ${YR_CUR}</th><th>Variação mês</th><th>Variação ano</th><th>Justificação / comentários</th></tr>
  ${detailRows}
</table>`;

  RAW=oldRAW;
  return block;
}

const HS_FICHA_STYLE = `
  @page{ size:A4; margin:10mm; }
  *{ box-sizing:border-box; }
  body{font-family:Arial, sans-serif; color:#111827; margin:0; padding:0; font-size:10px;}
  table{border-collapse:collapse; width:100%; margin-bottom:6px;}
  td,th{border:1px solid #c9c9c9; padding:3px 5px; font-size:9.5px; vertical-align:top; line-height:1.25;}
  .title{background:#1f2937; color:#ffffff; font-size:13px; font-weight:bold; padding:5px 6px;}
  .meta{background:#374151; color:#ffffff; font-weight:bold;}
  .meta-v{background:#f3f4f6; font-weight:bold;}
  .head{background:#374151; color:#ffffff; font-weight:bold; text-align:center;}
  .subhead{background:#e5e7eb; color:#7f1d1d; font-weight:bold; letter-spacing:.5px;}
  .indicator{font-weight:bold; background:#f9fafb;}
  .num{text-align:right; white-space:nowrap;}
  .comment{width:260px; font-size:8.5px;}
  .section-gap td,.section-gap{background:#404040; height:5px; padding:0;}
  .xls-good{background:#c6efce; color:#006100; font-weight:bold;}
  .xls-bad{background:#ffc7ce; color:#9c0006; font-weight:bold;}
  .xls-neutral{background:#e5e7eb; color:#374151;}
  .chart-title{background:#111827; color:#fbbf24; font-size:10.5px; font-weight:bold; padding:4px 6px;}
  .chart-label{font-weight:bold; width:150px;}
  .chart-val{text-align:right; width:60px; white-space:nowrap;}
  .bar-track{width:140px; height:10px; background:#edf2f7; border-radius:5px; overflow:hidden; border:1px solid #d1d5db;}
  .bar{height:10px;}
  .bar-2025{background:#94a3b8;}
  .bar-2026{background:#1d4ed8;}
  .note{font-size:8px; color:#6b7280;}
  .ficha-page{
    page-break-after:always;
    break-after:page;
    width:190mm;
    height:277mm;
    overflow:hidden;
    position:relative;
  }
  .ficha-page:last-child{ page-break-after:auto; break-after:auto; }
  .ficha-inner{ width:100%; }
  @media screen{
    body{ background:#888; padding:10mm 0; }
    .ficha-page{ background:#fff; margin:0 auto 10mm; box-shadow:0 0 8px rgba(0,0,0,.3); padding:8mm; }
  }
  @media print{
    body{ padding:0; }
    .ficha-page{ padding:0; box-shadow:none; margin:0; }
  }
`;

function hsExportCsv(){
  const h=document.getElementById('hsHotel')?.value, m=document.getElementById('hsMes')?.value;
  if(!h||!m) return;
  hsSaveAllComments();
  const block = hsBuildFichaBodyBlock(h, m);
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>${HS_FICHA_STYLE}</style>
</head>
<body>
${block}
</body>
</html>`;

  const safeHotel=String(h).replace(/[^a-z0-9_-]+/gi,'_');
  const fileName=`ficha_hotel_${safeHotel}_${m}_formatada.xls`;
  const blob=new Blob(['\ufeff', html],{type:'application/vnd.ms-excel;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download=fileName; a.click(); URL.revokeObjectURL(a.href);
  showToast('✓ Excel formatado exportado com cores, gráficos e comentários');
}

// ── Imprimir espelho (1 ou vários meses) ─────────────────────
function hsOpenPrintPicker(){
  const h = document.getElementById('hsHotel')?.value;
  if(!h){ showToast('Seleciona um hotel primeiro.', true); return; }
  hsSaveAllComments();
  document.getElementById('hsPrintHotelName').textContent = h;

  // Constrói lista de meses disponíveis a partir do STORE carregado
  const availableMonths = Object.keys(STORE).map(Number).sort((a,b)=>a-b);
  const currentMonth = Number(document.getElementById('hsMes')?.value);
  const chipsEl = document.getElementById('hsPrintMonthChips');
  chipsEl.innerHTML = availableMonths.map(m => {
    const checked = m === currentMonth ? 'checked' : '';
    return `<label style="display:inline-flex;align-items:center;gap:6px;background:var(--surface-2);border:1px solid var(--border-2);border-radius:8px;padding:6px 10px;font-size:12px;cursor:pointer">
      <input type="checkbox" value="${m}" ${checked} style="cursor:pointer">
      ${hsMonthLabel(m)}
    </label>`;
  }).join('');

  document.getElementById('hsPrintModal').style.display = 'flex';
}

function hsClosePrintPicker(){
  document.getElementById('hsPrintModal').style.display = 'none';
}

function hsPrintSelectedMonths(){
  const h = document.getElementById('hsHotel')?.value;
  if(!h) return;
  const checked = [...document.querySelectorAll('#hsPrintMonthChips input[type="checkbox"]:checked')]
    .map(cb => cb.value);
  if(!checked.length){ showToast('Seleciona pelo menos um mês.', true); return; }

  const blocks = checked.map(m => `<div class="ficha-page"><div class="ficha-inner">${hsBuildFichaBodyBlock(h, m)}</div></div>`).join('');
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Espelho — ${hsExcelEsc(h)}</title>
<style>${HS_FICHA_STYLE}</style>
</head>
<body>
${blocks}
<scr` + `ipt>
  // Encolhe cada página proporcionalmente se o conteúdo exceder a altura A4 disponível,
  // garantindo que cada mês cabe sempre numa única página impressa.
  window.addEventListener('load', function(){
    document.querySelectorAll('.ficha-page').forEach(function(page){
      var inner = page.querySelector('.ficha-inner');
      if(!inner) return;
      var maxH = page.clientHeight;
      var maxW = page.clientWidth;
      var actualH = inner.scrollHeight;
      var actualW = inner.scrollWidth;
      var scale = Math.min(maxH/actualH, maxW/actualW, 1);
      if(scale < 1){
        inner.style.transform = 'scale(' + scale + ')';
        inner.style.transformOrigin = 'top left';
        inner.style.width = (100/scale) + '%';
      }
    });
  });
</scr` + `ipt>
</body>
</html>`;

  const printWin = window.open('', '_blank');
  if(!printWin){ showToast('O navegador bloqueou a janela de impressão. Permite pop-ups para este site.', true); return; }
  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();
  printWin.onload = () => { printWin.focus(); setTimeout(() => printWin.print(), 300); };

  hsClosePrintPicker();
  showToast(`✓ A preparar impressão de ${checked.length} mês(es) para ${h}`);
}
