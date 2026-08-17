// ==========================================================
// VG OPERATIONS V32 — EFICIÊNCIA & UNIT ECONOMICS
// Recupera e amplia o método ABC: custos, receitas e GOP por unidade
// de atividade, sempre dentro do mercado/filtro ativo.
// ==========================================================
(function(){
  'use strict';
  window.VG=window.VG||{};
  if(window.VG.unitEconomics?.version>=32)return;

  const state={tab:'overview',numerator:'energy',denominator:'available',year:'',hotel:''};
  const n=v=>{const x=Number(v);return Number.isFinite(x)?x:null;};
  const esc=v=>window.VG?.util?.escapeHtml?window.VG.util.escapeHtml(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const marketSymbol=()=>window.VG?.market?.symbol?.()||'€';
  const locale=()=>window.VG?.market?.locale?.()||'pt-PT';
  const money=(v,d=2)=>n(v)==null?'—':`${marketSymbol()} ${Math.abs(Number(v)).toLocaleString(locale(),{minimumFractionDigits:d,maximumFractionDigits:d})}`;
  const signedPct=v=>n(v)==null?'—':`${v>=0?'+':''}${Number(v).toLocaleString('pt-PT',{maximumFractionDigits:1})}%`;
  const yearCur=()=>String(typeof YR_CUR!=='undefined'?YR_CUR:new Date().getFullYear());
  const yearPrev=()=>String(typeof YR_PREV!=='undefined'?YR_PREV:Number(yearCur())-1);
  const activeHotels=()=>{try{return typeof getActiveHotels==='function'?getActiveHotels().slice():((typeof RAW!=='undefined'&&RAW?.hotel_list)||[]).slice();}catch(e){return [];}};

  const DENOMINATORS={
    available:{key:'Disponiveis',label:'Quarto disponível',short:'QD'},
    occupied:{key:'Ocupados',label:'Quarto ocupado',short:'QO'},
    nights:{key:'Dormidas',label:'Dormida',short:'Dorm.'},
    guests:{key:'Hospedes',label:'Hóspede / cliente',short:'Cliente'},
    arrivals:{key:'Chegadas',label:'Chegada',short:'Cheg.'}
  };

  const NUMERATORS={
    totalCost:{group:'cost',label:'Custos totais',short:'Custo total',better:'lower',icon:'∑',value:(h,y)=>cost(h,'TOTAIS',y)},
    personnel:{group:'cost',label:'Pessoal',short:'Pessoal',better:'lower',icon:'👥',value:(h,y)=>cost(h,'PESSOAL',y)},
    energy:{group:'cost',label:'Energia',short:'Energia',better:'lower',icon:'⚡',value:(h,y)=>cost(h,'ENERGIA',y)},
    maintenance:{group:'cost',label:'Manutenção',short:'Manutenção',better:'lower',icon:'🔧',value:(h,y)=>cost(h,'MANUTENÇÃO',y)},
    food:{group:'cost',label:'Comidas',short:'Comidas',better:'lower',icon:'🍽',value:(h,y)=>cost(h,'COMIDAS',y)},
    beverage:{group:'cost',label:'Bebidas',short:'Bebidas',better:'lower',icon:'🥂',value:(h,y)=>cost(h,'BEBIDAS',y)},
    fbCost:{group:'cost',label:'A&B direto',short:'A&B custo',better:'lower',icon:'🍴',value:(h,y)=>(cost(h,'COMIDAS',y)||0)+(cost(h,'BEBIDAS',y)||0)},
    marketing:{group:'cost',label:'Marketing',short:'Marketing',better:'lower',icon:'📣',value:(h,y)=>cost(h,'MARKETING',y)},
    operational:{group:'cost',label:'Operacionais',short:'Operacionais',better:'lower',icon:'⚙',value:(h,y)=>cost(h,'OPERACIONAIS',y)},
    communications:{group:'cost',label:'Comunicações',short:'Comunicações',better:'lower',icon:'☎',value:(h,y)=>cost(h,'COMUNICAÇÕES',y)},
    totalRevenue:{group:'revenue',label:'Receita total',short:'Receita total',better:'higher',icon:'↗',value:(h,y)=>op(h,'Receita Total',y)},
    roomRevenue:{group:'revenue',label:'Receita alojamento',short:'Receita aloj.',better:'higher',icon:'🛏',value:(h,y)=>op(h,'Receita Alojamento',y)},
    fbRevenue:{group:'revenue',label:'Receita A&B',short:'Receita A&B',better:'higher',icon:'🍷',value:(h,y)=>op(h,'Receita FB',y)},
    otherRevenue:{group:'revenue',label:'Receita complementar',short:'Receita compl.',better:'higher',icon:'＋',value:(h,y)=>{const t=op(h,'Receita Total',y)||0,a=op(h,'Receita Alojamento',y)||0,f=op(h,'Receita FB',y)||0;return t-a-f;}},
    gop:{group:'result',label:'GOP com sede',short:'GOP',better:'higher',icon:'◆',value:(h,y)=>{try{return n(window.VG?.kpi?.gop?.(h,String(y),RAW));}catch(e){return op(h,'GOP COM SEDE',y);}}}
  };

  function op(h,key,y){try{return n(RAW?.hotels_ops?.[h]?.[key]?.[String(y)]);}catch(e){return null;}}
  function cost(h,key,y){try{return n(RAW?.hotels_costs?.[h]?.[key]?.[String(y)]);}catch(e){return null;}}
  function activity(h,den,y){const d=DENOMINATORS[den];return d?op(h,d.key,y):null;}
  function numerator(h,num,y){const d=NUMERATORS[num];return d?n(d.value(h,String(y))):null;}
  function unitValue(h,num,den,y){const a=activity(h,den,y),v=numerator(h,num,y);return a&&a>0&&v!=null?v/a:null;}
  function aggregate(hotels,num,den,y){let value=0,activityTotal=0,has=false;for(const h of hotels||[]){const a=activity(h,den,y),v=numerator(h,num,y);if(a&&a>0&&v!=null){value+=v;activityTotal+=a;has=true;}}return has&&activityTotal>0?value/activityTotal:null;}
  function variance(cur,prev){return n(cur)!=null&&n(prev)!=null&&prev!==0?(cur-prev)/Math.abs(prev)*100:null;}
  function semanticClass(num,delta){if(n(delta)==null)return 'neutral';const better=NUMERATORS[num]?.better||'lower';return (better==='lower'?delta<0:delta>0)?'good':delta===0?'neutral':'bad';}
  function portfolioRows(hotels,num,den,y){const better=NUMERATORS[num]?.better||'lower';return (hotels||[]).map(h=>({hotel:h,value:unitValue(h,num,den,y),prev:unitValue(h,num,den,yearPrev())})).filter(r=>r.value!=null).sort((a,b)=>better==='higher'?b.value-a.value:a.value-b.value);}
  function hasData(){try{return !!RAW&&activeHotels().some(h=>RAW?.hotels_ops?.[h]||RAW?.hotels_costs?.[h]);}catch(e){return false;}}
  function fmtUnit(v){return money(v,2);}

  function card(num,den,hotels){const cur=aggregate(hotels,num,den,yearCur()),prev=aggregate(hotels,num,den,yearPrev()),delta=variance(cur,prev),cls=semanticClass(num,delta);return `<article class="ue-card ${cls}"><div class="ue-card-head"><span>${esc(NUMERATORS[num].icon)} ${esc(NUMERATORS[num].short)} / ${esc(DENOMINATORS[den].short)}</span><em>${signedPct(delta)}</em></div><strong>${fmtUnit(cur)}</strong><small>${yearPrev()}: ${fmtUnit(prev)} · ${esc(NUMERATORS[num].better==='lower'?'menos é melhor':'mais é melhor')}</small></article>`;}

  function overviewHtml(){const hotels=activeHotels();if(!hasData())return emptyHtml();const main=[['totalCost','occupied'],['totalRevenue','occupied'],['gop','occupied'],['totalCost','guests'],['totalRevenue','guests'],['gop','guests']];const energy=Object.keys(DENOMINATORS).map(d=>card('energy',d,hotels)).join('');return `<div class="ue-overview"><div class="ue-kpis">${main.map(([a,b])=>card(a,b,hotels)).join('')}</div><section class="ue-panel"><header><div><strong>⚡ Energia por unidade de atividade</strong><small>Quarto disponível, quarto ocupado, dormida, hóspede/cliente e chegada.</small></div></header><div class="ue-kpis energy">${energy}</div></section><section class="ue-panel"><header><div><strong>Receita, custo e GOP por atividade</strong><small>Leitura unitária para perceber se o crescimento da atividade está a gerar valor.</small></div></header>${miniMatrix(['totalRevenue','totalCost','gop'],hotels)}</section></div>`;}
  function miniMatrix(nums,hotels){return `<div class="ue-table-wrap"><table class="ue-table"><thead><tr><th>Métrica</th>${Object.values(DENOMINATORS).map(d=>`<th>${esc(d.label)}</th>`).join('')}</tr></thead><tbody>${nums.map(num=>`<tr><td><strong>${esc(NUMERATORS[num].label)}</strong></td>${Object.keys(DENOMINATORS).map(den=>{const cur=aggregate(hotels,num,den,yearCur()),prev=aggregate(hotels,num,den,yearPrev()),d=variance(cur,prev),cl=semanticClass(num,d);return `<td><b>${fmtUnit(cur)}</b><small class="${cl}">${signedPct(d)}</small></td>`;}).join('')}</tr>`).join('')}</tbody></table></div>`;}

  function matrixHtml(){const hotels=activeHotels();if(!hasData())return emptyHtml();const groups=[['cost','Custos'],['revenue','Receitas'],['result','Resultado']];return groups.map(([g,label])=>`<section class="ue-panel"><header><div><strong>${label}</strong><small>${yearCur()} · valor por unidade e variação face a ${yearPrev()}</small></div></header>${miniMatrix(Object.keys(NUMERATORS).filter(k=>NUMERATORS[k].group===g),hotels)}</section>`).join('');}

  function controlsOptions(){return {nums:Object.entries(NUMERATORS).map(([k,v])=>`<option value="${k}" ${state.numerator===k?'selected':''}>${esc(v.label)}</option>`).join(''),dens:Object.entries(DENOMINATORS).map(([k,v])=>`<option value="${k}" ${state.denominator===k?'selected':''}>${esc(v.label)}</option>`).join('')};}
  function rankingHtml(){if(!hasData())return emptyHtml();const o=controlsOptions();const y=state.year||yearCur();const rows=portfolioRows(activeHotels(),state.numerator,state.denominator,y);const vals=rows.map(x=>x.value).sort((a,b)=>a-b);const med=vals.length?vals[Math.floor(vals.length/2)]:null;const best=[...rows];return `<section class="ue-panel"><div class="ue-controls"><label>Métrica<select data-ue="numerator">${o.nums}</select></label><label>Base<select data-ue="denominator">${o.dens}</select></label><label>Ano<select data-ue="year"><option ${String(y)===yearCur()?'selected':''}>${yearCur()}</option><option ${String(y)===yearPrev()?'selected':''}>${yearPrev()}</option></select></label></div><div class="ue-rank-summary"><span>Melhor eficiência</span><strong>${esc(best[0]?.hotel||'—')}</strong><em>${fmtUnit(best[0]?.value)}</em><span>Mediana</span><strong>${fmtUnit(med)}</strong></div><div class="ue-chart"><canvas id="ueRankingChart"></canvas></div><div class="ue-table-wrap"><table class="ue-table"><thead><tr><th>Hotel</th><th>${esc(NUMERATORS[state.numerator].label)} / ${esc(DENOMINATORS[state.denominator].label)}</th><th>${yearPrev()}</th><th>Variação</th></tr></thead><tbody>${rows.map(r=>{const d=variance(r.value,r.prev),cl=semanticClass(state.numerator,d);return `<tr><td><strong>${esc(r.hotel)}</strong></td><td>${fmtUnit(r.value)}</td><td>${fmtUnit(r.prev)}</td><td><span class="ue-pill ${cl}">${signedPct(d)}</span></td></tr>`;}).join('')}</tbody></table></div></section>`;}

  function hotelMatrix(h){const hotels=[h];return `<div class="ue-hotel-head"><strong>${esc(h)}</strong><span>${yearCur()} vs ${yearPrev()}</span></div>${miniMatrix(['totalCost','personnel','energy','maintenance','fbCost','totalRevenue','roomRevenue','fbRevenue','gop'],hotels)}`;}
  function hotelHtml(){if(!hasData())return emptyHtml();const hs=activeHotels(),h=hs.includes(state.hotel)?state.hotel:(hs[0]||'');state.hotel=h;return `<section class="ue-panel"><div class="ue-controls"><label>Hotel<select data-ue="hotel">${hs.map(x=>`<option ${x===h?'selected':''}>${esc(x)}</option>`).join('')}</select></label></div>${hotelMatrix(h)}</section>`;}
  function emptyHtml(){return `<div class="ue-empty"><strong>Sem P&amp;L/atividade para a geografia e filtro atuais.</strong><span>Carrega os dados da geografia para calcular eficiência por unidade.</span></div>`;}

  function render(){const root=document.getElementById('unitEconomicsRoot');if(!root)return;state.year=state.year||yearCur();const body=state.tab==='matrix'?matrixHtml():state.tab==='ranking'?rankingHtml():state.tab==='hotel'?hotelHtml():overviewHtml();root.innerHTML=`<header class="ue-head"><div><span>ABC ampliado</span><h2>Eficiência &amp; Unit Economics</h2><p>Custos, receitas e GOP por quarto disponível, quarto ocupado, dormida, hóspede/cliente e chegada.</p></div><div class="ue-market">${esc(window.VG?.market?.def?.()?.flag||'')} ${esc(window.VG?.market?.def?.()?.label||'')}</div></header><nav class="ue-tabs">${[['overview','Resumo'],['matrix','Matriz completa'],['ranking','Ranking'],['hotel','Por hotel']].map(([k,l])=>`<button data-ue-tab="${k}" class="${state.tab===k?'active':''}">${l}</button>`).join('')}</nav><div class="ue-body">${body}</div><div class="ue-trace">As métricas usam o P&amp;L e as unidades de atividade já existentes. Não somam geografias nem convertem moedas.</div>`;bind(root);if(state.tab==='ranking')setTimeout(renderChart,0);}
  function renderChart(){const canvas=document.getElementById('ueRankingChart');if(!canvas||typeof Chart==='undefined')return;const y=state.year||yearCur(),rows=portfolioRows(activeHotels(),state.numerator,state.denominator,y);try{if(charts?.ueRanking){charts.ueRanking.destroy();delete charts.ueRanking;}}catch(e){}const c=new Chart(canvas,{type:'bar',data:{labels:rows.map(r=>r.hotel),datasets:[{label:`${NUMERATORS[state.numerator].short} / ${DENOMINATORS[state.denominator].short}`,data:rows.map(r=>r.value)}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{maxRotation:55,minRotation:25}},y:{ticks:{callback:v=>marketSymbol()+Number(v).toLocaleString(locale(),{maximumFractionDigits:1})}}}}});if(typeof charts!=='undefined')charts.ueRanking=c;}
  function bind(root){root.querySelectorAll('[data-ue-tab]').forEach(b=>b.addEventListener('click',()=>{state.tab=b.dataset.ueTab;render();}));root.querySelectorAll('[data-ue]').forEach(el=>el.addEventListener('change',()=>{const k=el.dataset.ue;state[k]=el.value;render();}));}
  function open(){window.setView?.('unitEconomics');setTimeout(render,20);}
  function hotel360Html(h){if(!h||!RAW?.hotels_ops?.[h])return emptyHtml();return `<section class="ue-h360"><header><div><strong>Eficiência &amp; Unit Economics</strong><small>Custos, receitas e GOP por unidade de atividade</small></div><button type="button" onclick="VG.unitEconomics.open()">Abrir análise completa →</button></header>${hotelMatrix(h)}</section>`;}
  function init(){document.addEventListener('click',e=>{const nav=e.target.closest?.('#nav-unitEconomics');if(nav)setTimeout(render,10);});window.VG?.events?.on?.('market:changed',()=>{state.hotel='';render();});window.VG?.events?.on?.('state:changed',()=>{try{if(currentView==='unitEconomics')render();}catch(e){}});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();

  window.VG.unitEconomics={version:32,state,DENOMINATORS,NUMERATORS,activity,numerator,unitValue,aggregate,variance,semanticClass,portfolioRows,render,open,hotel360Html};
  window.unitEconomicsRender=render;
})();
