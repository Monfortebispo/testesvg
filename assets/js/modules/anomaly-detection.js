// ==========================================================
// DETEÇÃO DE ANOMALIAS — V13
// Sinais estatísticos explicáveis sobre P&L, atividade e preços.
// Não altera dados e não substitui validação operacional.
// ==========================================================
(function(){
  'use strict';
  if(window.__VG_ANOMALIES_V13__) return;
  window.__VG_ANOMALIES_V13__=true;

  const MONTHS=['','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const COST_METRICS=[
    {id:'personnel',field:'PESSOAL',label:'Pessoal',action:'Rever produtividade, escalas, trabalho temporário e custo por atividade.'},
    {id:'energy',field:'ENERGIA',label:'Energia',action:'Validar consumos, tarifários, leituras e faturas extraordinárias.'},
    {id:'maintenance',field:'MANUTENCAO',label:'Manutenção',action:'Separar extraordinários de recorrentes e validar contratos/intervenções.'},
    {id:'food',field:'COMIDAS',label:'Comidas',action:'Cruzar consumo, ocupação, desperdício e preços de compra.'},
    {id:'beverage',field:'BEBIDAS',label:'Bebidas',action:'Cruzar consumo, ocupação, desperdício e preços de compra.'}
  ];
  const SENSITIVITY={
    conservative:{label:'Conservadora',z:4.0,activityGap:25,minImpact:5000,pricePct:25,minPriceImpact:250,portfolioGap:22},
    balanced:{label:'Equilibrada',z:3.0,activityGap:18,minImpact:2500,pricePct:18,minPriceImpact:100,portfolioGap:16},
    sensitive:{label:'Sensível',z:2.4,activityGap:12,minImpact:1000,pricePct:12,minPriceImpact:50,portfolioGap:11}
  };
  let state={month:null,sensitivity:'balanced',type:'all',hotel:''};
  let purchaseCache={cd:null,key:'',rows:[]};

  function n(v){const x=Number(v);return Number.isFinite(x)?x:0;}
  function finite(v){if(v==null||v==='')return null;const x=Number(v);return Number.isFinite(x)?x:null;}
  function esc(v){return window.VG?.util?.escapeHtml?window.VG.util.escapeHtml(v):String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function fmt(v,d=1){return v==null||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString('pt-PT',{minimumFractionDigits:d,maximumFractionDigits:d});}
  function pct(v,d=1){return v==null?'—':fmt(v,d)+'%';}
  function eur(v,d=0){return v==null?'—':(window.VG?.market?.formatMoney?window.VG.market.formatMoney(v,d,false):'€'+fmt(v,d));}
  function sign(v,d=1,suffix='%'){return v==null?'—':`${Number(v)>=0?'+':''}${fmt(v,d)}${suffix}`;}
  function median(values){const a=(values||[]).map(Number).filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return null;const i=Math.floor(a.length/2);return a.length%2?a[i]:(a[i-1]+a[i])/2;}
  function mad(values,med){const m=med==null?median(values):med;if(m==null)return null;return median((values||[]).map(Number).filter(Number.isFinite).map(v=>Math.abs(v-m)));}
  function robustZ(value,values){const m=median(values);if(m==null)return null;const d=mad(values,m);if(d!=null&&d>1e-9)return .6745*(Number(value)-m)/d;const scale=Math.max(Math.abs(m)*.08,1e-6);return (Number(value)-m)/scale;}
  function growth(prev,cur){prev=Number(prev);cur=Number(cur);return Number.isFinite(prev)&&Math.abs(prev)>1e-9&&Number.isFinite(cur)?(cur-prev)/Math.abs(prev)*100:null;}
  function currentHotels(){try{return (typeof getActiveHotels==='function'?getActiveHotels():(RAW?.hotel_list||[])).slice();}catch(e){return [];}}
  function loadedMonths(){try{return Object.keys(STORE||{}).map(Number).filter(m=>m>=1&&m<=12&&STORE[m]).sort((a,b)=>a-b);}catch(e){return [];}}
  function activeMonth(){const ms=window.VG?.state?.selectedMonths?.()||[];const loaded=loadedMonths();const candidates=ms.filter(m=>loaded.includes(Number(m))).map(Number);return candidates.length?candidates[candidates.length-1]:(loaded.length?loaded[loaded.length-1]:null);}
  function dataForMonth(m){return STORE?.[Number(m)]||null;}
  function op(data,h,field,year){return data?.hotels_ops?.[h]?.[field]?.[year];}
  function cost(data,h,field,year){return data?.hotels_costs?.[h]?.[field]?.[year];}
  function revenue(data,h,year){return n(op(data,h,'Receita Total',year));}
  function occupied(data,h,year){return n(op(data,h,'Ocupados',year));}
  function available(data,h,year){return n(op(data,h,'Disponiveis',year));}
  function roomRevenue(data,h,year){return n(op(data,h,'Receita Alojamento',year));}
  function occ(data,h,year){const d=available(data,h,year);return d>0?occupied(data,h,year)/d*100:null;}
  function adr(data,h,year){const o=occupied(data,h,year);return o>0?roomRevenue(data,h,year)/o:null;}
  function gop(data,h,year){try{return finite(window.VG?.kpi?.gop?.(h,year,data));}catch(e){return finite(op(data,h,'GOP COM SEDE',year));}}
  function gopMargin(data,h,year){const r=revenue(data,h,year),g=gop(data,h,year);return r>0&&g!=null?g/r*100:null;}
  function costRatio(data,h,field,year){const r=revenue(data,h,year),c=n(cost(data,h,field,year));return r>0?c/r*100:null;}
  function historicalValues(h,month,calc){const out=[];for(const m of loadedMonths()){if(m>=month)break;const d=dataForMonth(m);const v=calc(d,h);if(v!=null&&Number.isFinite(v))out.push(v);}return out;}
  function severity(score,impact,ratio){if(score>=90||(impact>=15000&&ratio>=25))return 'red';return 'orange';}
  function id(parts){return parts.map(x=>String(x??'')).join('|').replace(/\s+/g,'_').toLowerCase();}

  function detectCostRatios(hotels,month,cfg){
    const data=dataForMonth(month);if(!data)return[];const rows=[];
    for(const h of hotels){
      const rec=revenue(data,h,YR_CUR);if(rec<=0)continue;
      for(const metric of COST_METRICS){
        const cur=n(cost(data,h,metric.field,YR_CUR));if(cur<=0)continue;
        const ratio=cur/rec*100;
        const hist=historicalValues(h,month,d=>costRatio(d,h,metric.field,YR_CUR));
        const histMed=median(hist),z=hist.length>=3?robustZ(ratio,hist):null;
        const lyRatio=costRatio(data,h,metric.field,YR_PREV);
        const ratioJump=lyRatio==null?null:ratio-lyRatio;
        const baseline=histMed!=null?histMed:lyRatio;
        const impact=baseline!=null&&ratio>baseline?(ratio-baseline)/100*rec:0;
        const statSignal=z!=null&&z>=cfg.z&&impact>=cfg.minImpact;
        const yoySignal=ratioJump!=null&&ratioJump>=Math.max(3,cfg.activityGap/4)&&impact>=cfg.minImpact;
        if(!statSignal&&!yoySignal)continue;
        const score=Math.min(120,55+(z?Math.max(0,z)*8:0)+Math.min(35,impact/1000));
        rows.push({
          id:id(['ratio',h,metric.id,month]),hotel:h,type:'efficiency',metric:metric.id,severity:severity(score,impact,ratioJump||0),score,
          title:`${metric.label} fora do padrão`,month,amount:impact,
          detail:`${metric.label}/Receita em ${pct(ratio)}${histMed!=null?` vs mediana recente ${pct(histMed)}`:''}${lyRatio!=null?` · homólogo ${pct(lyRatio)}`:''}.`,
          evidence:{currentRatio:ratio,historicalMedian:histMed,yoyRatio:lyRatio,robustZ:z,impact},
          action:metric.action,source:'P&L mensal · rácio sobre Receita'
        });
      }
    }
    return rows;
  }

  function detectActivityMismatch(hotels,month,cfg){
    const data=dataForMonth(month);if(!data)return[];const rows=[];
    for(const h of hotels){
      const revGrowth=growth(revenue(data,h,YR_PREV),revenue(data,h,YR_CUR));
      const occGrowth=growth(occupied(data,h,YR_PREV),occupied(data,h,YR_CUR));
      const activity=[revGrowth,occGrowth].filter(v=>v!=null);if(!activity.length)continue;
      const act=Math.max(...activity);
      for(const metric of COST_METRICS.slice(0,3)){
        const prev=n(cost(data,h,metric.field,YR_PREV)),cur=n(cost(data,h,metric.field,YR_CUR));if(prev<=0||cur<=0)continue;
        const cg=growth(prev,cur);if(cg==null)continue;
        const gap=cg-act;const expected=prev*Math.max(0,1+act/100);const impact=Math.max(0,cur-expected);
        if(gap<cfg.activityGap||impact<cfg.minImpact)continue;
        const score=Math.min(120,58+gap*.9+Math.min(30,impact/1500));
        rows.push({
          id:id(['activity',h,metric.id,month]),hotel:h,type:'activity',metric:metric.id,severity:severity(score,impact,gap),score,
          title:`${metric.label} cresce acima da atividade`,month,amount:impact,
          detail:`Custo ${sign(cg)} vs atividade ${sign(act)} · desvio ${sign(gap,1,' p.p.')} · impacto indicativo ${eur(impact)}.`,
          evidence:{costGrowth:cg,revenueGrowth:revGrowth,occupiedGrowth:occGrowth,activityGrowth:act,gap,impact},
          action:metric.action,source:'P&L mensal · custo vs Receita/quartos ocupados'
        });
      }
    }
    return rows;
  }

  function portfolioGrowth(data,hotels,field){
    const vals=[];for(const h of hotels){let prev,cur;if(field==='revenue'){prev=revenue(data,h,YR_PREV);cur=revenue(data,h,YR_CUR);}else if(field==='adr'){prev=adr(data,h,YR_PREV);cur=adr(data,h,YR_CUR);}else continue;const g=growth(prev,cur);if(g!=null)vals.push(g);}return median(vals);
  }
  function detectPerformance(hotels,month,cfg){
    const data=dataForMonth(month);if(!data)return[];const rows=[];
    const portRev=portfolioGrowth(data,hotels,'revenue'),portAdr=portfolioGrowth(data,hotels,'adr');
    for(const h of hotels){
      const r0=revenue(data,h,YR_PREV),r1=revenue(data,h,YR_CUR),rg=growth(r0,r1);
      if(rg!=null&&portRev!=null){
        const gap=portRev-rg;const impact=Math.max(0,r0*gap/100);
        if(gap>=cfg.portfolioGap&&impact>=cfg.minImpact){
          const score=Math.min(120,60+gap+Math.min(30,impact/2500));
          rows.push({id:id(['revenue',h,month]),hotel:h,type:'performance',metric:'revenue',severity:severity(score,impact,gap),score,title:'Receita diverge do portefólio',month,amount:impact,
            detail:`Receita ${sign(rg)} vs mediana do portefólio ${sign(portRev)} · gap ${sign(-gap,1,' p.p.')}.`,
            evidence:{hotelGrowth:rg,portfolioMedianGrowth:portRev,gap:-gap,impact},action:'Separar efeito de ocupação, ADR, A&B e outros proveitos; comparar com hotéis pares.',source:'P&L mensal · crescimento vs mediana do portefólio'});
        }else if((rg-portRev)>=cfg.portfolioGap&&r1>=10000){
          rows.push({id:id(['revenue-positive',h,month]),hotel:h,type:'positive',metric:'revenue',severity:'positive',score:45+(rg-portRev),title:'Receita acima do padrão do portefólio',month,amount:null,
            detail:`Receita ${sign(rg)} vs mediana do portefólio ${sign(portRev)}.`,evidence:{hotelGrowth:rg,portfolioMedianGrowth:portRev},action:'Identificar drivers do ganho e validar se são replicáveis.',source:'P&L mensal · crescimento vs mediana do portefólio'});
        }
      }
      const a0=adr(data,h,YR_PREV),a1=adr(data,h,YR_CUR),ag=growth(a0,a1);
      if(ag!=null&&portAdr!=null){const gap=portAdr-ag,rooms=occupied(data,h,YR_CUR),impact=Math.max(0,(a0||0)*gap/100*rooms);if(gap>=cfg.portfolioGap&&impact>=cfg.minImpact){
        const score=Math.min(115,55+gap+Math.min(25,impact/2000));rows.push({id:id(['adr',h,month]),hotel:h,type:'performance',metric:'adr',severity:severity(score,impact,gap),score,title:'ADR abaixo do comportamento dos pares',month,amount:impact,
          detail:`ADR ${sign(ag)} vs mediana do portefólio ${sign(portAdr)} · gap ${sign(-gap,1,' p.p.')}.`,evidence:{hotelGrowth:ag,portfolioMedianGrowth:portAdr,impact},action:'Rever pricing, descontos, canais e mix de segmentos antes de concluir perda de preço.',source:'P&L mensal · ADR vs mediana do portefólio'});}}
      const gm0=gopMargin(data,h,YR_PREV),gm1=gopMargin(data,h,YR_CUR);if(gm0!=null&&gm1!=null){const drop=gm0-gm1;const hist=historicalValues(h,month,d=>gopMargin(d,h,YR_CUR));const med=median(hist);const recentDrop=med==null?0:med-gm1;const impact=Math.max(0,(drop/100)*r1);if(drop>=5&&recentDrop>=3&&impact>=cfg.minImpact){const score=Math.min(120,65+drop*2+Math.min(25,impact/2500));rows.push({id:id(['gop',h,month]),hotel:h,type:'performance',metric:'gop',severity:severity(score,impact,drop),score,title:'Margem GOP quebrou fora do padrão',month,amount:impact,detail:`GOP ${pct(gm1)} vs homólogo ${pct(gm0)}${med!=null?` · mediana recente ${pct(med)}`:''}.`,evidence:{current:gm1,yoy:gm0,historicalMedian:med,impact},action:'Abrir P&L e decompor simultaneamente perda de receita e aumento das principais rubricas.',source:'P&L mensal · margem GOP com sede'});}}
    }
    return rows;
  }

  function purchaseData(){try{return typeof window.cdGetData==='function'?window.cdGetData():null;}catch(e){return null;}}
  function detectPurchasePrices(hotels,cfg){
    const cd=purchaseData();if(!cd?.PM?.length||!cd?.meta?.meses?.length)return[];
    const cacheKey=[...(hotels||[])].map(String).sort().join('|')+'|'+cfg.pricePct+'|'+cfg.minPriceImpact;
    if(purchaseCache.cd===cd&&purchaseCache.key===cacheKey)return purchaseCache.rows.slice();
    const names=cd.dic||{},HOT=names.hoteis||[],ART=names.art||[],FAM=names.fam||[];const validHotels=new Set((hotels||[]).map(String));
    const artFam=new Map();for(const r of (cd.A||[]))if(!artFam.has(r[5]))artFam.set(r[5],r[2]);
    const allowedFam=/^(COMIDAS|BEBIDAS)$/;
    const latestIdx=cd.meta.meses.length-1,latestKey=cd.meta.meses[latestIdx];
    const byHAM=new Map();
    for(const r of cd.PM){const [art,,hotel,mi,val,qtd]=r;if(!qtd||qtd<=0)continue;const hn=HOT[hotel]||'';if(validHotels.size&&!validHotels.has(hn))continue;if(!allowedFam.test(String(FAM[artFam.get(art)]||'').toUpperCase()))continue;const k=`${hotel}|${art}|${mi}`;let x=byHAM.get(k);if(!x){x={hotel,art,mi,val:0,qtd:0};byHAM.set(k,x);}x.val+=n(val);x.qtd+=n(qtd);}
    const current=[...byHAM.values()].filter(x=>x.mi===latestIdx&&x.qtd>=3&&x.val>0);
    const portfolioByArt=new Map();for(const x of current){const p=x.val/x.qtd;if(p<=0||p>250)continue;if(!portfolioByArt.has(x.art))portfolioByArt.set(x.art,[]);portfolioByArt.get(x.art).push(p);}
    const rows=[];
    for(const x of current){const cur=x.val/x.qtd;if(cur<=0||cur>250)continue;const hist=[];for(let mi=Math.max(0,latestIdx-4);mi<latestIdx;mi++){const p=byHAM.get(`${x.hotel}|${x.art}|${mi}`);if(p&&p.qtd>=3){const v=p.val/p.qtd;if(v>0&&v<=250)hist.push(v);}}
      const recent=hist.length>=2?median(hist):null;const port=median(portfolioByArt.get(x.art)||[]);const refs=[recent,port].filter(v=>v!=null&&v>0);if(!refs.length)continue;const ref=Math.max(...refs);if(cur>ref*3)continue;const delta=(cur-ref)/ref*100;const impact=Math.max(0,(cur-ref)*x.qtd);if(delta<cfg.pricePct||impact<cfg.minPriceImpact)continue;const score=Math.min(120,55+delta*.8+Math.min(35,impact/100));
      rows.push({id:id(['price',HOT[x.hotel],ART[x.art],latestKey]),hotel:HOT[x.hotel]||'',type:'price',metric:'price',severity:(delta>=35&&impact>=750)||impact>=2500?'red':'orange',score,title:'Preço de compra F&B fora do padrão',month:null,purchaseMonth:latestKey,amount:impact,
        detail:`${ART[x.art]||'Artigo'} · ${eur(cur,2)}/un vs referência ${eur(ref,2)}/un · ${sign(delta)} · impacto indicativo ${eur(impact)}.`,
        evidence:{article:ART[x.art]||'',family:FAM[artFam.get(x.art)]||'',currentPrice:cur,recentMedian:recent,portfolioMedian:port,quantity:x.qtd,impact},
        action:'Confirmar unidade de medida, condições e fornecedor; depois confrontar com histórico e melhor prática do grupo.',source:`Compras · preço médio ponderado do último mês disponível (${latestKey})`});
    }
    purchaseCache={cd,key:cacheKey,rows:rows.slice()};
    return rows;
  }

  function dedupe(rows){const m=new Map();for(const r of rows){const key=r.id;if(!m.has(key)||m.get(key).score<r.score)m.set(key,r);}return[...m.values()];}
  function build(options={}){
    const month=Number(options.month||state.month||activeMonth());const sensitivity=options.sensitivity||state.sensitivity||'balanced';const cfg=SENSITIVITY[sensitivity]||SENSITIVITY.balanced;const hotels=(options.hotels||currentHotels()).filter(Boolean);
    const rows=dedupe([...(month?detectCostRatios(hotels,month,cfg):[]),...(month?detectActivityMismatch(hotels,month,cfg):[]),...(month?detectPerformance(hotels,month,cfg):[]),...detectPurchasePrices(hotels,cfg)]).sort((a,b)=>b.score-a.score);
    const negative=rows.filter(r=>r.severity!=='positive'),positive=rows.filter(r=>r.severity==='positive');
    const critical=negative.filter(r=>r.severity==='red').length,attention=negative.filter(r=>r.severity==='orange').length;
    const impact=negative.reduce((s,r)=>s+(Number(r.amount)||0),0),priceCount=negative.filter(r=>r.type==='price').length;
    return {month,sensitivity,cfg,hotels,rows,negative,positive,critical,attention,impact,priceCount,purchaseMonth:(purchaseData()?.meta?.meses||[]).slice(-1)[0]||null};
  }

  function getDecisionSnapshot(hotels){
    const m=build({hotels:hotels||currentHotels()});
    const priorities=m.negative.slice(0,20).map(r=>({kind:'anomaly',hotel:r.hotel,severity:r.severity,score:r.score+8,title:r.title,reasons:[r.detail],action:r.action,amount:r.amount,anomalyId:r.id,type:r.type}));
    const opportunities=m.positive.slice(0,8).map(r=>({hotel:r.hotel,kind:'Anomalia positiva',value:r.metric==='revenue'?r.detail.split(' · ')[0]:'',score:r.score,title:r.title,sub:r.detail}));
    return {available:!!m.rows.length,priorities,opportunities,critical:m.critical,attention:m.attention,impact:m.impact,month:m.month};
  }

  function typeLabel(t){return({efficiency:'Eficiência',activity:'Custo × atividade',performance:'Performance',price:'Preço de compra',positive:'Positivo'})[t]||t;}
  function severityLabel(s){return s==='red'?'CRÍTICO':s==='positive'?'POSITIVO':'ATENÇÃO';}
  function openTarget(r){if(r.type==='price'&&typeof setView==='function'){setView('compras');return;}if(typeof setView==='function'){setView('fichahotel');setTimeout(()=>{try{const el=document.getElementById('hsHotel');if(el){el.value=r.hotel;if(typeof hsRender==='function')hsRender();}}catch(e){}},30);}}
  function render(){
    const root=document.getElementById('anomalyRoot');if(!root)return;const ms=loadedMonths();if(!state.month||!ms.includes(Number(state.month)))state.month=activeMonth();const model=build({month:state.month,sensitivity:state.sensitivity});
    let rows=model.rows;if(state.type!=='all')rows=rows.filter(r=>r.type===state.type||(state.type==='negative'&&r.severity!=='positive'));if(state.hotel)rows=rows.filter(r=>r.hotel===state.hotel);
    const hotels=model.hotels.slice().sort((a,b)=>a.localeCompare(b,'pt'));
    window.VG.anomalies.renderedRows=rows;
    root.innerHTML=`
      <div class="an-head"><div><div class="an-eyebrow">Deteção de Anomalias · V13</div><h2>Encontrar o que mudou sem procurar linha a linha</h2><p>Sinais estatísticos explicáveis sobre P&L, atividade e preços. Cada anomalia mostra a evidência e o impacto indicativo.</p></div>
      <div class="an-controls"><label>Mês P&amp;L<select onchange="vgAnomalySetMonth(this.value)">${ms.map(m=>`<option value="${m}" ${m===model.month?'selected':''}>${MONTHS[m]} ${YR_CUR}</option>`).join('')}</select></label><label>Sensibilidade<select onchange="vgAnomalySetSensitivity(this.value)">${Object.entries(SENSITIVITY).map(([k,v])=>`<option value="${k}" ${k===model.sensitivity?'selected':''}>${v.label}</option>`).join('')}</select></label><button class="an-btn" onclick="vgAnomalyRender()">Atualizar</button></div></div>
      <div class="an-kpis"><div class="an-kpi critical"><span>Críticas</span><strong>${model.critical}</strong><small>desvios materiais</small></div><div class="an-kpi warning"><span>Atenção</span><strong>${model.attention}</strong><small>sinais a validar</small></div><div class="an-kpi positive"><span>Positivas</span><strong>${model.positive.length}</strong><small>outliers favoráveis</small></div><div class="an-kpi impact"><span>Impacto indicativo</span><strong>${eur(model.impact)}</strong><small>não equivale a perda contabilística</small></div><div class="an-kpi price"><span>Preços F&amp;B</span><strong>${model.priceCount}</strong><small>${model.purchaseMonth?`último mês ${model.purchaseMonth}`:'sem dados de compras'}</small></div></div>
      <div class="an-layout"><section class="an-panel"><div class="an-tools"><select onchange="vgAnomalySetType(this.value)"><option value="all" ${state.type==='all'?'selected':''}>Todos os sinais</option><option value="negative" ${state.type==='negative'?'selected':''}>Só riscos</option><option value="efficiency" ${state.type==='efficiency'?'selected':''}>Eficiência</option><option value="activity" ${state.type==='activity'?'selected':''}>Custo × atividade</option><option value="performance" ${state.type==='performance'?'selected':''}>Performance</option><option value="price" ${state.type==='price'?'selected':''}>Preços</option><option value="positive" ${state.type==='positive'?'selected':''}>Positivos</option></select><select onchange="vgAnomalySetHotel(this.value)"><option value="">Todos os hotéis</option>${hotels.map(h=>`<option value="${esc(h)}" ${state.hotel===h?'selected':''}>${esc(h)}</option>`).join('')}</select><span>${rows.length} sinal(is)</span></div><div class="an-list">${rows.length?rows.map((r,i)=>rowHtml(r,i)).join(''):'<div class="an-empty">Sem anomalias para os filtros e sensibilidade atuais.</div>'}</div></section>
      <aside class="an-side"><div class="an-panel"><h3>Como é detetado</h3><div class="an-method"><b>1. Padrão próprio</b><span>Mediana e desvio absoluto mediano dos meses anteriores do mesmo hotel.</span><b>2. Homólogo</b><span>Confirma se o desvio também existe face ao mesmo mês do ano anterior.</span><b>3. Atividade</b><span>Compara crescimento de custos com Receita e quartos ocupados.</span><b>4. Pares</b><span>Receita e ADR são confrontados com a mediana do portefólio.</span><b>5. Compras</b><span>F&amp;B compara o preço médio ponderado do último mês com histórico recente e portefólio.</span></div><div class="an-note">A ferramenta sinaliza padrões improváveis; não afirma a causa. Eventos extraordinários, obras, alterações de mix, unidades de medida e períodos incompletos devem ser validados antes de agir.</div></div></aside></div>`;
    window.VG.anomalies.lastModel=model;
  }
  function rowHtml(r,i){const cls=r.severity==='red'?'red':r.severity==='positive'?'green':'orange';const amount=r.amount?`<span class="an-amount">${eur(r.amount)}</span>`:'';return `<div class="an-row ${cls}"><div class="an-rank">${i+1}</div><div class="an-row-hotel"><strong>${esc(r.hotel)}</strong><span>${esc(typeLabel(r.type))}</span></div><div class="an-row-main"><div><b>${esc(r.title)}</b>${amount}</div><p>${esc(r.detail)}</p><small>Fonte: ${esc(r.source)} · Ação: ${esc(r.action)}</small></div><div class="an-row-actions"><span class="an-sev ${cls}">${severityLabel(r.severity)}</span><button onclick="vgAnomalyOpenIndex(${i})">Abrir →</button></div></div>`;}

  window.VG=window.VG||{};
  window.VG.anomalies={median,mad,robustZ,detectCostRatios,detectActivityMismatch,detectPerformance,detectPurchasePrices,build,getDecisionSnapshot,SENSITIVITY,render,lastModel:null};
  window.vgAnomalyRender=render;
  window.vgAnomalySetMonth=v=>{state.month=Number(v)||activeMonth();render();};
  window.vgAnomalySetSensitivity=v=>{state.sensitivity=SENSITIVITY[v]?v:'balanced';try{localStorage.setItem('vg_anomaly_sensitivity',state.sensitivity);}catch(e){}render();};
  window.vgAnomalySetType=v=>{state.type=v||'all';render();};
  window.vgAnomalySetHotel=v=>{state.hotel=String(v||'');render();};
  window.vgAnomalyOpen=anomalyId=>{const r=window.VG.anomalies.lastModel?.rows?.find(x=>x.id===anomalyId);if(r)openTarget(r);};
  window.vgAnomalyOpenIndex=i=>{const r=window.VG.anomalies.renderedRows?.[Number(i)];if(r)openTarget(r);};
  try{const saved=localStorage.getItem('vg_anomaly_sensitivity');if(SENSITIVITY[saved])state.sensitivity=saved;}catch(e){}
  window.VG.events?.on?.('state:changed',()=>{if(typeof currentView!=='undefined'&&currentView==='anomalies'){clearTimeout(window.VG.anomalies._timer);window.VG.anomalies._timer=setTimeout(render,25);}});
})();
