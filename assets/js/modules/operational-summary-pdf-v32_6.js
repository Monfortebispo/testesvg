// ==========================================================
// VG DASHBOARD v32.6 — RESUMO OPERACIONAL ACUMULADO EM PDF
// PDF horizontal por geografia/região, com acumulado Jan→mês.
// Não altera selectedMeses/RAW: trabalha diretamente sobre STORE.
// ==========================================================
(function(){
'use strict';
if(window.__VG_OPERATIONAL_SUMMARY_PDF_V326__)return;
window.__VG_OPERATIONAL_SUMMARY_PDF_V326__=true;

const VERSION='34.0';
const LOGO_DATA='data:image/png;base64,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';
const MONTHS={1:'Janeiro',2:'Fevereiro',3:'Março',4:'Abril',5:'Maio',6:'Junho',7:'Julho',8:'Agosto',9:'Setembro',10:'Outubro',11:'Novembro',12:'Dezembro'};
const SHORT={1:'Jan',2:'Fev',3:'Mar',4:'Abr',5:'Mai',6:'Jun',7:'Jul',8:'Ago',9:'Set',10:'Out',11:'Nov',12:'Dez'};

const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const num=v=>{const x=Number(v);return Number.isFinite(x)?x:null};
const user=()=>{try{return window.vgAuthCurrent?.()||null}catch(e){return null}};
const restricted=()=>['diretor','assistente'].includes(String(user()?.role||'').toLowerCase());
const market=()=>window.VG?.market?.def?.()||{id:'iberia',label:'PT + ES',currency:'EUR',symbol:'€',locale:'pt-PT',regions:{},regionLabels:{}};
const marketId=()=>window.VG?.market?.id?.()||market().id||'iberia';
const currentHotel=h=>window.VG?.market?.isCurrentHotel?window.VG.market.isCurrentHotel(h):true;

function toast(msg,bad=false){try{window.showToast?.(msg,bad)}catch(e){}}
function yearValue(obj,year){
  if(!obj)return null;
  let v=obj?.[year];
  if(v==null||v===''){
    try{if(String(year)===String(YR_PREV))v=obj?.YR_PREV;if(String(year)===String(YR_CUR))v=obj?.YR_CUR;}catch(e){}
  }
  return num(v);
}
function years(){
  try{return {prev:Number(YR_PREV),cur:Number(YR_CUR)}}catch(e){}
  const store=(typeof STORE!=='undefined'&&STORE)?STORE:{};
  const first=Object.values(store).find(Boolean)||{};
  return {prev:Number(first.yr_prev)||new Date().getFullYear()-1,cur:Number(first.yr_cur)||new Date().getFullYear()};
}
function availableMonths(){
  const store=(typeof STORE!=='undefined'&&STORE)?STORE:{};
  const ids=Object.keys(store).map(Number).filter(m=>m>=1&&m<=12&&store[m]);
  return [...new Set(ids)].sort((a,b)=>a-b);
}
function allHotels(){
  const set=new Set();
  availableMonths().forEach(m=>(STORE[m]?.hotel_list||[]).forEach(h=>{if(currentHotel(h))set.add(h)}));
  let hs=[...set];
  if(restricted()){const h=String(user()?.hotel||'').toUpperCase();hs=hs.filter(x=>String(x).toUpperCase()===h)}
  return hs.sort((a,b)=>a.localeCompare(b,'pt'));
}
function regionDefs(){
  const def=market(),allowed=new Set(allHotels()),out=[];
  const regions=def.regions||{};
  for(const [id,list] of Object.entries(regions)){
    const hs=(list||[]).filter(h=>allowed.has(h));
    if(hs.length)out.push({id,label:def.regionLabels?.[id]||window.VG?.market?.regionLabel?.(id)||id,hotels:hs});
  }
  const mapped=new Set(out.flatMap(r=>r.hotels));
  const other=[...allowed].filter(h=>!mapped.has(h));
  if(other.length)out.push({id:'outros',label:'Outros',hotels:other});
  return out;
}
function sum(months,hotel,section,field,year){
  let total=0,found=false;
  for(const m of months){
    const obj=STORE?.[m]?.[section]?.[hotel]?.[field];
    const v=yearValue(obj,year);
    if(v!=null){total+=v;found=true}
  }
  return found?total:null;
}
function official(months,hotel,field,year){return sum(months,hotel,'hotels_ops',field,year)}
function hotelMetrics(hotel,months){
  const y=years();
  const recP=sum(months,hotel,'hotels_ops','Receita Total',y.prev)||0;
  const recC=sum(months,hotel,'hotels_ops','Receita Total',y.cur)||0;
  const alojP=sum(months,hotel,'hotels_ops','Receita Alojamento',y.prev)||0;
  const alojC=sum(months,hotel,'hotels_ops','Receita Alojamento',y.cur)||0;
  const dispP=sum(months,hotel,'hotels_ops','Disponiveis',y.prev)||0;
  const dispC=sum(months,hotel,'hotels_ops','Disponiveis',y.cur)||0;
  const ocupP=sum(months,hotel,'hotels_ops','Ocupados',y.prev)||0;
  const ocupC=sum(months,hotel,'hotels_ops','Ocupados',y.cur)||0;
  const costP=sum(months,hotel,'hotels_costs','TOTAIS',y.prev)||0;
  const costC=sum(months,hotel,'hotels_costs','TOTAIS',y.cur)||0;
  const energyC=sum(months,hotel,'hotels_costs','ENERGIA',y.cur)||0;
  let gopP=official(months,hotel,'GOP COM SEDE',y.prev);
  let gopC=official(months,hotel,'GOP COM SEDE',y.cur);
  if(gopP==null&&(recP||costP))gopP=recP-costP;
  if(gopC==null&&(recC||costC))gopC=recC-costC;
  let gopSemC=official(months,hotel,'GOP SEM SEDE',y.cur);
  if(gopSemC==null&&(recC||costC))gopSemC=recC-costC;
  return {hotel,recP,recC,alojP,alojC,dispP,dispC,ocupP,ocupC,costP,costC,energyC,gopP:gopP||0,gopC:gopC||0,gopSemC:gopSemC||0,
    recVar:recP?(recC-recP)/Math.abs(recP)*100:null,
    occP:dispP?ocupP/dispP*100:null,occC:dispC?ocupC/dispC*100:null,
    adrP:ocupP?alojP/ocupP:null,adrC:ocupC?alojC/ocupC:null,
    revparP:dispP?alojP/dispP:null,revparC:dispC?alojC/dispC:null,
    gopPctC:recC?((gopC||0)/recC*100):null,costPctC:recC?costC/recC*100:null,
    energyOccC:ocupC?energyC/ocupC:null};
}
function aggregate(rows,label){
  const keys=['recP','recC','alojP','alojC','dispP','dispC','ocupP','ocupC','costP','costC','energyC','gopP','gopC','gopSemC'];
  const a={hotel:label};keys.forEach(k=>a[k]=rows.reduce((s,r)=>s+(num(r[k])||0),0));
  a.recVar=a.recP?(a.recC-a.recP)/Math.abs(a.recP)*100:null;
  a.occP=a.dispP?a.ocupP/a.dispP*100:null;a.occC=a.dispC?a.ocupC/a.dispC*100:null;
  a.adrP=a.ocupP?a.alojP/a.ocupP:null;a.adrC=a.ocupC?a.alojC/a.ocupC:null;
  a.revparP=a.dispP?a.alojP/a.dispP:null;a.revparC=a.dispC?a.alojC/a.dispC:null;
  a.gopPctC=a.recC?a.gopC/a.recC*100:null;a.costPctC=a.recC?a.costC/a.recC*100:null;
  a.energyOccC=a.ocupC?a.energyC/a.ocupC:null;return a;
}
function buildReport(opts={}){
  const avail=availableMonths();if(!avail.length)return {available:false,reason:'Sem P&L carregado nesta Geografia.'};
  const endMonth=Number(opts.month||Math.max(...avail));
  const months=avail.filter(m=>m<=endMonth);
  const missing=[];for(let m=1;m<=endMonth;m++)if(!avail.includes(m))missing.push(m);
  const defs=regionDefs(),allowed=new Set(allHotels());
  let selectedRegions=Array.isArray(opts.regions)?opts.regions.filter(Boolean):[];
  let hotels=[];let groups=[];
  if(restricted()){
    hotels=[...allowed];groups=[{id:'hotel',label:hotels[0]||'Hotel',hotels}];selectedRegions=[];
  }else if(opts.scope==='regions'){
    if(!selectedRegions.length)selectedRegions=defs.map(r=>r.id);
    groups=defs.filter(r=>selectedRegions.includes(r.id)).map(r=>({...r,hotels:r.hotels.filter(h=>allowed.has(h))})).filter(r=>r.hotels.length);
    hotels=[...new Set(groups.flatMap(g=>g.hotels))];
  }else{
    hotels=[...allowed];groups=defs.map(r=>({...r,hotels:r.hotels.filter(h=>allowed.has(h))})).filter(r=>r.hotels.length);
    const grouped=new Set(groups.flatMap(g=>g.hotels));const extra=hotels.filter(h=>!grouped.has(h));if(extra.length)groups.push({id:'outros',label:'Outros',hotels:extra});
  }
  const rowMap=new Map(hotels.map(h=>[h,hotelMetrics(h,months)]));
  groups=groups.map(g=>{const rows=g.hotels.map(h=>rowMap.get(h)).filter(Boolean);return {...g,rows,total:aggregate(rows,'TOTAL '+String(g.label).toUpperCase())}}).filter(g=>g.rows.length);
  const rows=[...rowMap.values()];const total=aggregate(rows,'TOTAL GEOGRAFIA');
  const geo=market();
  return {available:!!rows.length,version:VERSION,marketId:marketId(),geography:geo.label||geo.id,currency:geo.currency||'EUR',symbol:geo.symbol||'€',locale:geo.locale||'pt-PT',endMonth,months,missing,years:years(),scope:restricted()?'hotel':(opts.scope==='regions'?'regions':'all'),selectedRegions,hotels,groups,rows,total,generatedAt:new Date().toISOString(),user:user()};
}
function money(v,d=0,r=null){
  const rep=r||{};const x=num(v);if(x==null)return '—';
  try{if(window.VG?.market?.formatMoney)return window.VG.market.formatMoney(x,d,true)}catch(e){}
  return `${rep.symbol||'€'} ${x.toLocaleString(rep.locale||'pt-PT',{minimumFractionDigits:d,maximumFractionDigits:d})}`;
}
function pct(v,plus=false){const x=num(v);return x==null?'—':`${plus&&x>0?'+':''}${x.toLocaleString('pt-PT',{minimumFractionDigits:1,maximumFractionDigits:1})}%`}
function cellMoney(v,r,d=0){return esc(money(v,d,r))}
function rowHtml(x,r,cls=''){return `<tr class="${cls}"><td>${esc(x.hotel)}</td><td>${cellMoney(x.recP,r)}</td><td>${cellMoney(x.recC,r)}</td><td class="${(x.recVar||0)>=0?'pos':'neg'}">${pct(x.recVar,true)}</td><td>${pct(x.occP)}</td><td>${pct(x.occC)}</td><td>${cellMoney(x.adrP,r,2)}</td><td>${cellMoney(x.adrC,r,2)}</td><td>${cellMoney(x.revparP,r,2)}</td><td>${cellMoney(x.revparC,r,2)}</td><td>${cellMoney(x.gopP,r)}</td><td>${cellMoney(x.gopC,r)}</td><td>${pct(x.gopPctC)}</td><td>${cellMoney(x.costC,r)}</td><td>${pct(x.costPctC)}</td><td>${cellMoney(x.energyOccC,r,2)}</td></tr>`}
function reportHtml(r){
  const y=r.years,period=`Janeiro - ${MONTHS[r.endMonth]} ${y.cur}`,missing=r.missing.length?`<div class="warn"><b>Atenção:</b> acumulado incompleto. Não existem ficheiros P&amp;L para ${r.missing.map(m=>MONTHS[m]).join(', ')}.</div>`:'';
  const k=r.total;
  const groupSections=r.groups.map(g=>`<section class="region"><div class="region-head"><h2>${esc(g.label)}</h2><span>${g.rows.length} unidade(s)</span></div><table><thead><tr><th>Hotel</th><th>Receita ${y.prev}</th><th>Receita ${y.cur}</th><th>Δ Rec.</th><th>Occ ${y.prev}</th><th>Occ ${y.cur}</th><th>ADR ${y.prev}</th><th>ADR ${y.cur}</th><th>RevPAR ${y.prev}</th><th>RevPAR ${y.cur}</th><th>GOP ${y.prev}</th><th>GOP ${y.cur}</th><th>GOP% ${y.cur}</th><th>Custos ${y.cur}</th><th>Custos/Rec.</th><th>Energia/Q.Ocup.</th></tr></thead><tbody>${rowHtml(g.total,r,'total')}${g.rows.slice().sort((a,b)=>a.hotel.localeCompare(b.hotel,'pt')).map(x=>rowHtml(x,r)).join('')}</tbody></table></section>`).join('');
  const userLabel=r.user?.name||r.user?.username||'Utilizador autenticado';
  return `<!doctype html><html><head><meta charset="utf-8"><title>VG - Resumo Operacional - ${esc(period)}</title><style>
@page{size:A3 landscape;margin:8mm 8mm 9mm}
*{box-sizing:border-box}html,body{margin:0;padding:0}body{font-family:Arial,Helvetica,sans-serif;color:#17243a;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-size:8pt}
.header{display:flex;align-items:center;gap:10px;border-bottom:3px solid #173a5e;padding:0 0 8px;margin-bottom:9px}.logo{width:34px;height:34px;object-fit:contain}.brand{min-width:150px}.brand b{display:block;font-size:11pt;color:#173a5e}.brand span{font-size:6.7pt;letter-spacing:1.1px;color:#8a6a00;text-transform:uppercase;font-weight:700}.title{flex:1;text-align:center}.title h1{margin:0;color:#173a5e;font-size:16pt}.title p{margin:3px 0 0;color:#667085;font-size:8pt}.meta{text-align:right;font-size:6.8pt;color:#667085;line-height:1.45}
.scope{display:flex;gap:7px;margin:0 0 8px;flex-wrap:wrap}.chip{border:1px solid #ccd5df;background:#f6f8fb;border-radius:4px;padding:4px 7px;font-size:7pt}.chip b{color:#173a5e}.warn{background:#fff4e5;border-left:4px solid #d97706;padding:6px 8px;margin:0 0 8px;color:#8a4b08;font-size:7.5pt}
.kpis{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-bottom:10px}.kpi{border:1px solid #d8dee8;border-top:3px solid #173a5e;border-radius:5px;padding:5px 7px;background:#fbfcfe}.kpi span{display:block;color:#6b7280;font-size:6pt;text-transform:uppercase;letter-spacing:.5px;font-weight:700}.kpi b{display:block;margin-top:2px;font-size:10pt;color:#17243a}.kpi small{display:block;color:#6b7280;font-size:6.2pt;margin-top:1px}
.region{margin:0 0 10px;break-inside:auto}.region-head{display:flex;justify-content:space-between;align-items:end;border-bottom:1.5px solid #173a5e;margin-bottom:3px;padding-bottom:2px}.region-head h2{font-size:9pt;margin:0;color:#173a5e}.region-head span{font-size:6.5pt;color:#667085}
table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:6.3pt}thead{display:table-header-group}tr{break-inside:avoid}th{background:#173a5e;color:#fff;border:1px solid #0f2d4b;padding:3.3px 2px;text-align:right;white-space:normal;line-height:1.12}th:first-child{text-align:left;width:10.5%}td{border:1px solid #dfe4ea;padding:3px 2px;text-align:right;white-space:nowrap}td:first-child{text-align:left;font-weight:600;white-space:normal}tbody tr:nth-child(odd):not(.total) td{background:#f7f9fc}tr.total td{background:#e8eef6;font-weight:800;color:#102f50;border-top:1.5px solid #173a5e}td.pos{color:#176c3a;font-weight:700}td.neg{color:#a52a2a;font-weight:700}
.foot{margin-top:8px;border-top:1px solid #cdd5df;padding-top:4px;display:flex;justify-content:space-between;gap:10px;color:#6b7280;font-size:6pt}.foot b{color:#374151}.screen-note{position:fixed;right:12px;top:12px;background:#173a5e;color:#fff;padding:8px 10px;border-radius:6px;font-size:11px;z-index:3}@media print{.screen-note{display:none}}
</style></head><body><div class="screen-note">A3 horizontal - Guardar como PDF - desative Cabeçalhos e rodapés do navegador</div><header class="header"><img class="logo" src="${LOGO_DATA}" alt="Vila Galé"><div class="brand"><b>Vila Galé Hotéis</b><span>Dashboard Operações</span></div><div class="title"><h1>Resumo Operacional - Acumulado</h1><p>${esc(period)} · comparação com Janeiro - ${MONTHS[r.endMonth]} ${y.prev}</p></div><div class="meta"><b>${esc(r.geography)}</b><br>${r.hotels.length} unidade(s)<br>Gerado ${new Date(r.generatedAt).toLocaleString('pt-PT')}</div></header><div class="scope"><div class="chip"><b>Geografia:</b> ${esc(r.geography)}</div><div class="chip"><b>Período:</b> ${esc(period)}</div><div class="chip"><b>Âmbito:</b> ${r.scope==='regions'?esc(r.groups.map(g=>g.label).join(' + ')):r.scope==='hotel'?esc(r.hotels[0]||'Hotel'):'Todos os hotéis'}</div><div class="chip"><b>Preparado por:</b> ${esc(userLabel)}</div></div>${missing}<section class="kpis"><div class="kpi"><span>Receita ${y.cur}</span><b>${cellMoney(k.recC,r)}</b><small>${pct(k.recVar,true)} vs ${y.prev}</small></div><div class="kpi"><span>Ocupação</span><b>${pct(k.occC)}</b><small>${y.prev}: ${pct(k.occP)}</small></div><div class="kpi"><span>ADR</span><b>${cellMoney(k.adrC,r,2)}</b><small>${y.prev}: ${cellMoney(k.adrP,r,2)}</small></div><div class="kpi"><span>RevPAR</span><b>${cellMoney(k.revparC,r,2)}</b><small>${y.prev}: ${cellMoney(k.revparP,r,2)}</small></div><div class="kpi"><span>GOP com sede</span><b>${cellMoney(k.gopC,r)}</b><small>Margem ${pct(k.gopPctC)}</small></div><div class="kpi"><span>Custos</span><b>${cellMoney(k.costC,r)}</b><small>${pct(k.costPctC)} da receita</small></div><div class="kpi"><span>Energia / Q. Ocup.</span><b>${cellMoney(k.energyOccC,r,2)}</b><small>Custo energia por quarto ocupado</small></div></section>${groupSections}<footer class="foot"><span><b>Critério do acumulado:</b> soma dos meses P&amp;L de Janeiro até ao mês selecionado; percentagens, ADR e RevPAR são recalculados sobre os volumes acumulados, não somados nem calculados por média simples.</span><span>VG Dashboard v${VERSION}</span></footer><script>window.onload=()=>setTimeout(()=>window.print(),220)<\/script></body></html>`;
}
function ensureModal(){
  let el=document.getElementById('opsPdfModalV326');if(el)return el;
  el=document.createElement('div');el.id='opsPdfModalV326';el.className='ops-pdf-modal';el.innerHTML=`<div class="ops-pdf-dialog"><div class="ops-pdf-head"><div><span>Resumo Operacional</span><h3>Gerar PDF acumulado</h3><p>O mês escolhido gera automaticamente Janeiro até esse mês, sem misturar Geografias.</p></div><button type="button" class="ops-pdf-x" data-close>×</button></div><div class="ops-pdf-grid"><label>Geografia<div id="opsPdfGeo" class="ops-pdf-fixed"></div></label><label>Mês final<select id="opsPdfMonth"></select></label></div><div class="ops-pdf-scope"><div class="ops-pdf-label">Âmbito</div><div class="ops-pdf-choice"><label><input type="radio" name="opsPdfScope" value="all" checked> Todos os hotéis da Geografia</label><label id="opsPdfRegionsChoice"><input type="radio" name="opsPdfScope" value="regions"> Escolher regiões</label></div><div id="opsPdfRegions" class="ops-pdf-regions"></div></div><div id="opsPdfInfo" class="ops-pdf-info"></div><div class="ops-pdf-actions"><button type="button" class="secondary" data-close>Cancelar</button><button type="button" class="primary" id="opsPdfGenerate">📄 Gerar PDF horizontal</button></div></div>`;document.body.appendChild(el);
  el.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>el.classList.remove('open'));
  el.addEventListener('click',e=>{if(e.target===el)el.classList.remove('open')});
  el.querySelectorAll('input[name="opsPdfScope"]').forEach(r=>r.onchange=syncModal);
  el.querySelector('#opsPdfMonth').onchange=syncModal;
  el.querySelector('#opsPdfGenerate').onclick=generateFromModal;
  return el;
}
function syncModal(){
  const el=document.getElementById('opsPdfModalV326');if(!el)return;
  const scope=el.querySelector('input[name="opsPdfScope"]:checked')?.value||'all';
  const box=el.querySelector('#opsPdfRegions');box.classList.toggle('disabled',scope!=='regions'||restricted());
  box.querySelectorAll('input').forEach(x=>x.disabled=scope!=='regions'||restricted());
  const m=Number(el.querySelector('#opsPdfMonth')?.value||0),avail=availableMonths(),missing=[];for(let x=1;x<=m;x++)if(!avail.includes(x))missing.push(x);
  const count=scope==='regions'&&!restricted()?[...box.querySelectorAll('input:checked')].reduce((s,c)=>s+(Number(c.dataset.count)||0),0):allHotels().length;
  el.querySelector('#opsPdfInfo').innerHTML=`<b>Acumulado:</b> Janeiro - ${MONTHS[m]||'—'} · <b>${count}</b> unidade(s)${missing.length?`<span class="warn"> · Faltam: ${missing.map(x=>SHORT[x]).join(', ')}</span>`:''}`;
}
function openModal(){
  if(!availableMonths().length){toast('Não existem dados P&L nesta Geografia.',true);return}
  const el=ensureModal(),def=market(),months=availableMonths(),sel=el.querySelector('#opsPdfMonth');
  el.querySelector('#opsPdfGeo').textContent=`${def.flag||''} ${def.label||def.id||'Geografia'}`;
  sel.innerHTML=months.map(m=>`<option value="${m}">${MONTHS[m]}</option>`).join('');sel.value=String(Math.max(...months));
  const regions=regionDefs(),regBox=el.querySelector('#opsPdfRegions');regBox.innerHTML=regions.map(r=>`<label><input type="checkbox" value="${esc(r.id)}" data-count="${r.hotels.length}" checked><span>${esc(r.label)}</span><small>${r.hotels.length} hotel(is)</small></label>`).join('');regBox.querySelectorAll('input').forEach(x=>x.onchange=syncModal);
  const choice=el.querySelector('#opsPdfRegionsChoice');choice.style.display=restricted()?'none':'';if(restricted())el.querySelector('input[value="all"]').checked=true;
  el.classList.add('open');syncModal();
}
function generateFromModal(){
  const el=document.getElementById('opsPdfModalV326');if(!el)return;
  const scope=restricted()?'all':(el.querySelector('input[name="opsPdfScope"]:checked')?.value||'all');
  const regions=[...el.querySelectorAll('#opsPdfRegions input:checked')].map(x=>x.value);
  if(scope==='regions'&&!regions.length){toast('Seleciona pelo menos uma região.',true);return}
  const report=buildReport({month:Number(el.querySelector('#opsPdfMonth').value),scope,regions});
  if(!report.available){toast(report.reason||'Sem dados suficientes.',true);return}
  const w=window.open('','_blank');if(!w){toast('Popup bloqueado. Permite popups para gerar o PDF.',true);return}
  w.document.open();w.document.write(reportHtml(report));w.document.close();el.classList.remove('open');
}
window.VG=window.VG||{};window.VG.operationalSummaryPdf={version:VERSION,buildReport,reportHtml,hotelMetrics,aggregate,availableMonths,regionDefs,open:openModal};
window.operationalSummaryPdfOpen=openModal;
window.VG.events?.on?.('market:changed',()=>{const el=document.getElementById('opsPdfModalV326');if(el)el.classList.remove('open')});
})();
