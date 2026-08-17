// ==========================================================
// VG DASHBOARD v25 — ASSISTENTE ANALÍTICO
// Motor local de perguntas em linguagem natural sobre os dados
// já autorizados no browser. Não envia dados para serviços externos.
// ==========================================================
(function(){
  'use strict';
  window.VG=window.VG||{};
  if(window.VG.analyticalAssistant?.version>=25)return;

  const state={history:[],busy:false,last:null};
  const esc=v=>window.VG?.util?.escapeHtml?window.VG.util.escapeHtml(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9%+€./ -]+/g,' ').replace(/\s+/g,' ').trim();
  const n=v=>{const x=Number(v);return Number.isFinite(x)?x:null;};
  const fmt=(v,d=1)=>n(v)==null?'—':Number(v).toLocaleString('pt-PT',{minimumFractionDigits:d,maximumFractionDigits:d});
  const eur=(v,d=0)=>n(v)==null?'—':(window.VG?.market?.formatMoney?window.VG.market.formatMoney(v,d,true):'€ '+Number(v).toLocaleString('pt-PT',{minimumFractionDigits:d,maximumFractionDigits:d}));
  const pct=(v,d=1)=>n(v)==null?'—':`${fmt(v,d)}%`;
  const pp=(v,d=1)=>n(v)==null?'—':`${v>=0?'+':''}${fmt(v,d)} p.p.`;
  const growth=(a,b)=>{const p=n(a),c=n(b);return p!=null&&p!==0&&c!=null?(c-p)/Math.abs(p)*100:null;};
  const currentUser=()=>{try{return typeof window.vgAuthCurrent==='function'?window.vgAuthCurrent():null;}catch(e){return null;}};
  const raw=()=>{try{return typeof RAW!=='undefined'?RAW:null;}catch(e){return null;}};
  const year=()=>{try{return String(typeof YR_CUR!=='undefined'?YR_CUR:window.VG?.state?.currentYear?.()||new Date().getFullYear());}catch(e){return String(new Date().getFullYear());}};
  const prevYear=()=>String(Number(year())-1);
  const monthNames={1:['janeiro','jan'],2:['fevereiro','fev'],3:['marco','mar'],4:['abril','abr'],5:['maio','mai'],6:['junho','jun'],7:['julho','jul'],8:['agosto','ago'],9:['setembro','set'],10:['outubro','out'],11:['novembro','nov'],12:['dezembro','dez']};
  const monthLabel=m=>window.VG?.util?.monthName?.(m)||({1:'Janeiro',2:'Fevereiro',3:'Março',4:'Abril',5:'Maio',6:'Junho',7:'Julho',8:'Agosto',9:'Setembro',10:'Outubro',11:'Novembro',12:'Dezembro'}[m]||String(m||''));

  function allowedHotels(){
    try{if(window.VG?.hotelPerformance?.allHotels)return window.VG.hotelPerformance.allHotels();}catch(e){}
    const r=raw(),u=currentUser();let hs=(r?.hotel_list||Object.keys(r?.hotels_ops||{})).filter(Boolean);
    if(u&&typeof window.vgAuthCanAccessHotel==='function'&&!['direcao','admin'].includes(u.role))hs=hs.filter(h=>window.vgAuthCanAccessHotel(h));
    return [...new Set(hs)].sort((a,b)=>String(a).localeCompare(String(b),'pt'));
  }
  function model(h){try{return window.VG?.hotelPerformance?.buildModel?.(h)||null;}catch(e){return null;}}
  function kpi(m,id){return m?.kpis?.find?.(x=>x.id===id)||null;}
  function findHotels(q){
    const nq=' '+norm(q)+' ',hs=allowedHotels(),hits=[];
    for(const h of hs){const nh=norm(h),simple=nh.replace(/^collection /,'');if(nq.includes(' '+nh+' ')||nq.includes(' '+simple+' '))hits.push(h);}
    return [...new Set(hits)];
  }
  function findMonth(q){const nq=norm(q);for(const [m,names] of Object.entries(monthNames))if(names.some(x=>new RegExp(`\\b${x}\\b`).test(nq)))return Number(m);return null;}
  function topCount(q,def=5){const m=norm(q).match(/\b(\d{1,2})\b/);if(!m)return def;return Math.max(1,Math.min(20,Number(m[1])||def));}
  function trace(label,detail){return {label,detail};}
  function answer(kind,title,summary,rows=[],traces=[],extra={}){return {kind,title,summary,rows,traces,generatedAt:new Date().toISOString(),...extra};}
  function metricDef(q){
    const s=norm(q);
    const defs=[
      {id:'personnelRatio',label:'Pessoal / Receita',keys:['pessoal','personnel'],format:v=>pct(v),lower:true},
      {id:'costRatio',label:'Custos / Receita',keys:['custos receita','custo receita','custos totais','custos'],format:v=>pct(v),lower:true},
      {id:'revenue',label:'Receita',keys:['receita','revenue','faturacao'],format:v=>eur(v),lower:false},
      {id:'gopMargin',label:'Margem GOP',keys:['margem gop','gop %','gop%'],format:v=>pct(v),lower:false},
      {id:'gop',label:'GOP com sede',keys:['gop'],format:v=>eur(v),lower:false},
      {id:'occupancy',label:'Ocupação',keys:['ocupacao','occupancy'],format:v=>pct(v),lower:false},
      {id:'revpar',label:'RevPAR',keys:['revpar'],format:v=>eur(v,2),lower:false},
      {id:'adr',label:'ADR',keys:['adr','preco medio','preco médio'],format:v=>eur(v,2),lower:false}
    ];
    return defs.find(d=>d.keys.some(k=>s.includes(norm(k))))||null;
  }
  function metricValue(m,id){return kpi(m,id)?.value??null;}
  function metricDelta(m,id){return kpi(m,id)?.delta??null;}
  function targetDisplay(k){
    const v=n(k?.target?.value);if(v==null)return '—';
    if(k.id==='revenue')return `${v>=0?'+':''}${fmt(v,1)}%`;
    if(k.id==='adr'||k.id==='revpar')return eur(v,2);
    return pct(v,1);
  }

  function hotelOverview(h){
    const m=model(h);if(!m?.available)return answer('empty','Sem dados suficientes',`Não existem dados suficientes para analisar ${h}.`,[],[trace('Dados','Performance Hotel V23')]);
    const mainRisk=m.risks?.[0],mainOpp=m.opportunities?.[0],f=m.forecast||{};
    const summary=`${h} está em estado ${String(m.status?.label||'indeterminado').toLowerCase()}. ${mainRisk?`Prioridade: ${mainRisk.title}.`:''} ${mainOpp?`Oportunidade: ${mainOpp.title}.`:''}`.replace(/\s+/g,' ').trim();
    const rows=(m.kpis||[]).map(x=>({Indicador:x.label,Valor:x.display,'Δ vs ano anterior':x.deltaDisplay||'—',Região:x.region==null?'—':(x.id==='adr'||x.id==='revpar'?eur(x.region,2):pct(x.region)),Meta:targetDisplay(x)}));
    if(f.available)rows.push({Indicador:`Forecast ${f.monthLabel||''}`,Valor:pct(f.forecast),'Δ vs ano anterior':f.gap==null?'—':`${pp(f.gap)} vs meta`,Região:'—',Meta:f.target==null?'—':pct(f.target)});
    return answer('hotel',`Como está ${h}?`,summary,rows,[trace('KPIs','P&L / VG.kpi'),trace('Estado e riscos','Performance Hotel V23'),trace('Forecast','Revenue Intelligence / Forecast V12'),trace('Metas','Metas & Regras V9')],{hotel:h,open:{view:'hotelperformance',hotel:h}});
  }

  function compareHotels(hs){
    const selected=hs.slice(0,4),models=selected.map(h=>model(h)).filter(m=>m?.available);if(models.length<2)return null;
    const ids=['revenue','gop','gopMargin','occupancy','adr','revpar','costRatio','personnelRatio'];
    const labels={revenue:'Receita',gop:'GOP',gopMargin:'GOP%',occupancy:'Ocupação',adr:'ADR',revpar:'RevPAR',costRatio:'Custos/Receita',personnelRatio:'Pessoal/Receita'};
    const format=(id,v)=>['revenue','gop'].includes(id)?eur(v):['adr','revpar'].includes(id)?eur(v,2):pct(v);
    const rows=ids.map(id=>{const r={Indicador:labels[id]};for(const m of models)r[m.hotel]=format(id,metricValue(m,id));return r;});
    const statuses=models.map(m=>`${m.hotel}: ${m.status?.label||'—'}`).join(' · ');
    return answer('compare',`Comparação: ${models.map(m=>m.hotel).join(' vs ')}`,statuses,rows,[trace('Comparação','Performance Hotel V23'),trace('KPIs','P&L / VG.kpi'),trace('Benchmark','Benchmarking V11')],{hotels:models.map(m=>m.hotel)});
  }

  function rankMetric(q,def){
    const hs=allowedHotels(),count=topCount(q),rows=[];for(const h of hs){const m=model(h);if(!m?.available)continue;const v=metricValue(m,def.id),d=metricDelta(m,def.id);if(n(v)==null)continue;rows.push({hotel:h,value:v,delta:d,status:m.status?.label||'—'});}
    if(!rows.length)return null;
    const s=norm(q),askingWorst=/\bpior|piores|menor|menores|mais baixo|mais baixa|abaixo\b/.test(s),askingBest=/\bmelhor|melhores|maior|maiores|mais alto|mais alta|top\b/.test(s);
    let asc=def.lower?askingBest:askingWorst;if(!askingBest&&!askingWorst)asc=false;
    rows.sort((a,b)=>asc?a.value-b.value:b.value-a.value);
    const out=rows.slice(0,count).map((x,i)=>({Posição:i+1,Hotel:x.hotel,[def.label]:def.format(x.value),'Δ vs ano anterior':x.delta==null?'—':(['occupancy','costRatio','personnelRatio','gopMargin'].includes(def.id)?pp(x.delta):`${x.delta>=0?'+':''}${fmt(x.delta)}%`),Estado:x.status}));
    const direction=asc?'menor':'maior';
    return answer('ranking',`${count} hotéis com ${direction} ${def.label}`,`A ordenação usa o valor do período atualmente selecionado na dashboard.`,out,[trace(def.label,'Performance Hotel V23 / KPIs canónicos'),trace('Período','Filtros ativos da dashboard')],{open:{view:'hotelperformance'}});
  }

  function deterioration(q,def){
    const count=topCount(q),rows=[];for(const h of allowedHotels()){const m=model(h);if(!m?.available)continue;const d=metricDelta(m,def.id),v=metricValue(m,def.id);if(n(d)==null)continue;rows.push({hotel:h,delta:d,value:v});}
    rows.sort((a,b)=>a.delta-b.delta);const out=rows.slice(0,count).map((x,i)=>({Posição:i+1,Hotel:x.hotel,'Variação':(['occupancy','costRatio','personnelRatio','gopMargin'].includes(def.id)?pp(x.delta):`${x.delta>=0?'+':''}${fmt(x.delta)}%`),'Valor atual':def.format(x.value)}));
    return answer('deterioration',`Maior deterioração — ${def.label}`,out.length?`${out[0].Hotel} apresenta a maior deterioração entre as unidades disponíveis neste período.`:'Sem comparáveis suficientes.',out,[trace('Variação','Performance Hotel V23 vs ano anterior'),trace('Base','P&L canónico')]);
  }

  function forecastBelow(q){
    const requested=findMonth(q),rows=[];
    for(const h of allowedHotels()){
      let f=null;
      try{if(requested&&window.VG?.forecast?.buildBase){const b=window.VG.forecast.buildBase(h,requested);if(b?.available)f={forecast:n(b.forecastOcc),target:n(b.target),gap:b.target==null?null:n(b.forecastOcc)-n(b.target),month:requested,confidence:b.confidence?.score??null};}}catch(e){}
      if(!f){const m=model(h);if(m?.forecast?.available)f={forecast:n(m.forecast.forecast),target:n(m.forecast.target),gap:n(m.forecast.gap),month:m.forecast.month,confidence:m.forecast.confidence?.score??null};}
      if(!f||f.target==null||f.forecast==null||f.forecast>=f.target)continue;rows.push({hotel:h,...f});
    }
    rows.sort((a,b)=>a.gap-b.gap);const out=rows.map((x,i)=>({Posição:i+1,Hotel:x.hotel,Mês:monthLabel(x.month),Forecast:pct(x.forecast),Meta:pct(x.target),Gap:pp(x.gap),Confiança:x.confidence==null?'—':`${fmt(x.confidence,0)}/100`}));
    return answer('forecast','Hotéis com forecast abaixo da meta',out.length?`${out.length} unidade(s) estão abaixo da meta${requested?` em ${monthLabel(requested)}`:''}.`:`Nenhuma unidade com forecast disponível está abaixo da meta${requested?` em ${monthLabel(requested)}`:''}.`,out,[trace('Forecast','Revenue Intelligence / V12'),trace('Meta','Metas & Regras V9')],{open:{view:'forecast'}});
  }

  function personnelVsActivity(){
    const r=raw(),cy=year(),py=prevYear(),rows=[];
    for(const h of allowedHotels()){
      const persCur=n(r?.hotels_costs?.[h]?.PESSOAL?.[cy]),persPrev=n(r?.hotels_costs?.[h]?.PESSOAL?.[py]);
      const occCur=n(r?.hotels_ops?.[h]?.Ocupados?.[cy]),occPrev=n(r?.hotels_ops?.[h]?.Ocupados?.[py]);
      const pg=growth(persPrev,persCur),ag=growth(occPrev,occCur);if(pg==null||ag==null)continue;const gap=pg-ag;if(gap>0)rows.push({hotel:h,pg,ag,gap});
    }
    rows.sort((a,b)=>b.gap-a.gap);const out=rows.map((x,i)=>({Posição:i+1,Hotel:x.hotel,'Pessoal vs LY':`${x.pg>=0?'+':''}${fmt(x.pg)}%`,'Quartos ocupados vs LY':`${x.ag>=0?'+':''}${fmt(x.ag)}%`,'Excesso de crescimento':pp(x.gap)}));
    return answer('efficiency','Custos de pessoal a crescer acima da atividade',out.length?`${out.length} unidade(s) apresentam crescimento de custos de pessoal superior ao crescimento de quartos ocupados.`:'Não encontrei unidades nessa situação com dados comparáveis.',out,[trace('Custos de pessoal','P&L / hotéis_costs.PESSOAL'),trace('Atividade','Quartos ocupados / hotéis_ops.Ocupados')],{open:{view:'cua'}});
  }

  async function actionsAnswer(q){
    try{await window.VG?.actions?.ensureLoaded?.(false);}catch(e){}
    const allowed=new Set(allowedHotels().map(norm)),all=(window.VG?.actions?.all?.()||[]).filter(a=>!a.hotel||allowed.has(norm(a.hotel))),s=norm(q);
    const overdue=all.filter(a=>a.status!=='resolved'&&window.VG?.actions?.isOverdue?.(a));
    if(/mais acoes|mais ações|ranking.*acoes|ranking.*ações/.test(s)){
      const map=new Map();for(const a of all.filter(a=>a.status!=='resolved'))map.set(a.hotel,(map.get(a.hotel)||0)+1);const rows=[...map].sort((a,b)=>b[1]-a[1]).map((x,i)=>({Posição:i+1,Hotel:x[0]||'Sem hotel','Ações abertas':x[1]}));return answer('actions','Hotéis com mais ações abertas',rows.length?`${rows[0].Hotel} tem atualmente o maior número de ações abertas.`:'Sem ações abertas.',rows,[trace('Ações','Gestão de Ações V8')],{open:{action:'actions'}});
    }
    const rows=overdue.sort((a,b)=>String(a.dueDate||'').localeCompare(String(b.dueDate||''))).map(a=>({Hotel:a.hotel||'—',Ação:a.sourceTitle||a.title||'Ação',Responsável:a.ownerName||a.assigneeName||'—',Prazo:a.dueDate||'—',Estado:'Fora do prazo'}));
    return answer('actions','Ações fora do prazo',rows.length?`${rows.length} ação(ões) estão fora do prazo.`:'Não existem ações fora do prazo no âmbito atual.',rows,[trace('Ações','Gestão de Ações V8')],{open:{action:'actions'}});
  }

  function anomaliesAnswer(){
    let rows=[];try{rows=window.VG?.anomalies?.build?.({hotels:allowedHotels()})?.rows||[];}catch(e){}
    const rank={red:0,orange:1,yellow:2,positive:3};rows.sort((a,b)=>(rank[a.severity]??2)-(rank[b.severity]??2)||Math.abs(n(b.amount)||0)-Math.abs(n(a.amount)||0));
    const out=rows.filter(x=>x.severity!=='positive').slice(0,15).map((x,i)=>({Posição:i+1,Hotel:x.hotel||'—',Anomalia:x.title||x.metric||'Desvio',Detalhe:x.detail||x.source||'—',Impacto:x.amount!=null?eur(x.amount):'—',Severidade:x.severity==='red'?'Crítica':'Atenção'}));
    return answer('anomalies','Principais anomalias',out.length?`${out.length} sinal(is) prioritários apresentados, ordenados por severidade.`:'Sem anomalias materiais no âmbito atual.',out,[trace('Anomalias','Deteção de Anomalias V13')],{open:{view:'anomalies'}});
  }

  function purchasePriceIncreases(q){
    let cd=null;try{cd=typeof window.cdGetData==='function'?window.cdGetData():null;}catch(e){}if(!cd?.dic||!Array.isArray(cd.PM)||!cd.meta?.meses?.length)return answer('empty','Compras sem dados','Não existem dados de compras carregados suficientes para comparar preços.',[],[trace('Compras','Módulo Compras & Artigos')]);
    const d=cd.dic,A=d.art||[],H=d.hoteis||[],F=d.forn||[],latest=cd.meta.meses.length-1,prev=latest-1;if(prev<0)return answer('empty','Compras sem histórico','É necessário pelo menos dois meses de compras para comparar evolução de preço.',[],[trace('Compras','Módulo Compras & Artigos')]);
    const allowed=new Set(allowedHotels().map(norm)),agg=new Map();
    function put(mi,art,val,qtd,forn){if(mi!==latest&&mi!==prev)return;const a=agg.get(art)||{latest:{v:0,q:0,forn:new Set()},prev:{v:0,q:0,forn:new Set()}};const k=mi===latest?'latest':'prev';a[k].v+=Number(val)||0;a[k].q+=Number(qtd)||0;if(F[forn])a[k].forn.add(F[forn]);agg.set(art,a);}
    for(const r of cd.PM){const [art,forn,hotel,mi,val,qtd]=r;if(allowed.size&&H[hotel]&&!allowed.has(norm(H[hotel])))continue;put(mi,art,val,qtd,forn);}
    const rows=[];for(const [art,a] of agg){if(a.latest.q<=0||a.prev.q<=0)continue;const p1=a.prev.v/a.prev.q,p2=a.latest.v/a.latest.q,delta=growth(p1,p2);if(delta==null||delta<=0)continue;rows.push({article:A[art]||`Artigo ${art}`,p1,p2,delta,suppliers:[...a.latest.forn].slice(0,3).join(', ')});}
    rows.sort((a,b)=>b.delta-a.delta);const count=topCount(q);const out=rows.slice(0,count).map((x,i)=>({Posição:i+1,Artigo:x.article,'Mês anterior':eur(x.p1,2),'Último mês':eur(x.p2,2),Variação:`+${fmt(x.delta)}%`,Fornecedores:x.suppliers||'—'}));
    const ml=cd.meta.meses,lab=v=>`${String(v).slice(4,6)}/${String(v).slice(0,4)}`;
    return answer('purchases',`${count} maiores aumentos de preço em Compras`,out.length?`Comparação entre ${lab(ml[prev])} e ${lab(ml[latest])}. Os valores são preços médios ponderados mensais, não o preço da última fatura.`:'Não encontrei aumentos comparáveis entre os dois últimos meses.',out,[trace('Preço','Compras PM: valor / quantidade por artigo e mês'),trace('Limitação','Preço médio ponderado mensal; não representa necessariamente a última fatura')],{open:{view:'compras'}});
  }

  function metricForHotel(h,def){
    const m=model(h),k=kpi(m,def.id);if(!m?.available||!k)return null;
    return answer('metric',`${def.label} — ${h}`,`${def.label}: ${def.format(k.value)}. Variação face a ${prevYear()}: ${k.deltaDisplay||'—'}.`,[{Hotel:h,Indicador:def.label,Valor:def.format(k.value),'Δ vs ano anterior':k.deltaDisplay||'—','Meta / referência':targetDisplay(k),Estado:m.status?.label||'—'}],[trace(def.label,'Performance Hotel V23 / KPI canónico'),trace('Comparação','Ano anterior e Metas & Regras')],{hotel:h,open:{view:'hotelperformance',hotel:h}});
  }

  async function interpret(question){
    const q=String(question||'').trim(),s=norm(q);if(!s)return answer('help','Escreve uma pergunta','Ex.: “Quais são os 5 hotéis com maior deterioração do GOP?”',[],[]);
    const hs=findHotels(q),def=metricDef(q);
    if((/\bcompara|comparar|comparacao|versus| vs \b/.test(s))&&hs.length>=2)return compareHotels(hs);
    if(/custos? de pessoal|pessoal/.test(s)&&/atividade|ocupados|ocupacao/.test(s)&&/cres|acima|superior/.test(s))return personnelVsActivity();
    if(/forecast|previsao|previsão/.test(s)&&/abaixo|inferior|meta|objetivo/.test(s))return forecastBelow(q);
    if(/artigo|artigos|preco|precos|preço|preços/.test(s)&&/aument|subi|variac|caro|maior/.test(s))return purchasePriceIncreases(q);
    if(/\b(acao|acoes)\b/.test(s))return actionsAnswer(q);
    if(/anomalia|anomalias|desvio|desvios/.test(s))return anomaliesAnswer();
    if(def&&/deterior|queda|caiu|pior evolucao|pior evolução/.test(s))return deterioration(q,def);
    if(def&&/\bquais|ranking|melhor|melhores|pior|piores|maior|maiores|menor|menores|top\b/.test(s)&&hs.length===0)return rankMetric(q,def);
    if(hs.length===1&&def)return metricForHotel(hs[0],def);
    if(hs.length===1&&(/como esta|como está|situacao|situação|estado|analisa|analise|análise/.test(s)||!def))return hotelOverview(hs[0]);
    if(/critico|criticos|crítico|críticos/.test(s)){
      const rows=allowedHotels().map(h=>model(h)).filter(m=>m?.available&&m.status?.level==='critical').map(m=>({Hotel:m.hotel,Estado:m.status.label,'Prioridade':m.risks?.[0]?.title||m.status?.reasons?.[0]||'A validar','Ações vencidas':m.actionInfo?.overdue?.length||0}));
      return answer('status','Hotéis em estado crítico',rows.length?`${rows.length} unidade(s) estão atualmente classificadas como críticas.`:'Nenhuma unidade está classificada como crítica nos critérios atuais.',rows,[trace('Estado','Performance Hotel V23')],{open:{view:'hotelperformance'}});
    }
    return answer('help','Não consegui interpretar a pergunta com segurança','Prefiro não inventar uma resposta. Tenta uma das perguntas sugeridas ou inclui o hotel/KPI que queres analisar.',[],[trace('Assistente V25','Interpretação local e determinística; sem resposta gerada quando a intenção é ambígua')]);
  }

  async function ask(question){
    if(state.busy)return null;state.busy=true;renderBusy(question);
    try{await Promise.allSettled([window.VG?.actions?.ensureLoaded?.(false),window.VG?.agenda?.ensureLoaded?.(false)]);const a=await interpret(question);state.last=a;state.history.push({question:String(question||''),answer:a});if(state.history.length>20)state.history.shift();renderAnswer(question,a);return a;}catch(e){console.error('Assistente Analítico V25',e);const a=answer('error','Não foi possível concluir a análise','Ocorreu um erro ao consultar os dados atuais. Atualiza a dashboard e tenta novamente.',[],[]);state.last=a;renderAnswer(question,a);return a;}finally{state.busy=false;}
  }

  function rowTable(rows){if(!rows?.length)return '';const cols=[...new Set(rows.flatMap(r=>Object.keys(r)))];return `<div class="aa-table-wrap"><table class="aa-table"><thead><tr>${cols.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${esc(r[c]??'—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
  function traceHtml(traces){if(!traces?.length)return '';return `<div class="aa-trace"><span>Rastreabilidade</span>${traces.map(t=>`<div><b>${esc(t.label)}</b><small>${esc(t.detail||'')}</small></div>`).join('')}</div>`;}
  function openButton(a){if(!a?.open)return '';const o=a.open;if(o.action==='actions')return `<button type="button" onclick="VG.actions?.openBoard?.()">Abrir Ações →</button>`;if(o.view==='hotelperformance'&&o.hotel)return `<button type="button" onclick="VG.hotelPerformance?.openHotel?.('${esc(o.hotel)}')">Abrir Performance →</button>`;if(o.view)return `<button type="button" onclick="setView('${esc(o.view)}')">Abrir módulo →</button>`;return '';}
  function renderAnswer(q,a){const box=document.getElementById('analyticalAssistantConversation');if(!box)return;box.innerHTML=`<div class="aa-question"><span>Tu</span><p>${esc(q)}</p></div><article class="aa-answer ${esc(a.kind||'')}"><header><div><span>Assistente Analítico</span><h3>${esc(a.title)}</h3></div><em>${new Date(a.generatedAt||Date.now()).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})}</em></header><p class="aa-summary">${esc(a.summary||'')}</p>${rowTable(a.rows)}${traceHtml(a.traces)}<footer>${openButton(a)}<button type="button" onclick="analyticalAssistantCopy()">Copiar resposta</button></footer></article>`;box.scrollIntoView({block:'start',behavior:'smooth'});}
  function renderBusy(q){const box=document.getElementById('analyticalAssistantConversation');if(!box)return;box.innerHTML=`<div class="aa-question"><span>Tu</span><p>${esc(q)}</p></div><div class="aa-thinking"><i></i><i></i><i></i><span>A analisar os dados atuais…</span></div>`;}
  const prompts=[
    'Quais são os 5 hotéis com maior deterioração do GOP?',
    'Que hotéis têm forecast abaixo da meta em setembro?',
    'Onde os custos de pessoal cresceram acima da atividade?',
    'Quais são as principais anomalias?',
    'Que artigos aumentaram mais de preço?',
    'Quais os hotéis com mais ações abertas?'
  ];
  function render(){const root=document.getElementById('analyticalAssistantRoot');if(!root)return;root.innerHTML=`<header class="aa-head"><div><span>Assistente Analítico · V25</span><h2>Pergunta aos dados</h2><p>Consulta os dados reais da dashboard em linguagem natural. As respostas são construídas localmente e mostram de onde vêm os números.</p></div><div class="aa-privacy"><b>Sem envio externo</b><small>Os dados não saem desta aplicação.</small></div></header><section class="aa-ask"><div class="aa-input-wrap"><textarea id="analyticalAssistantInput" rows="2" placeholder="Ex.: Compara Estoril e Cascais"></textarea><button id="analyticalAssistantAskBtn" type="button" onclick="analyticalAssistantAsk()">Analisar</button></div><div class="aa-hint">Enter para perguntar · Shift+Enter para nova linha</div></section><section class="aa-prompts"><span>Perguntas sugeridas</span><div>${prompts.map(p=>`<button type="button" onclick="analyticalAssistantUsePrompt('${esc(p).replace(/'/g,'&#39;')}')">${esc(p)}</button>`).join('')}</div></section><section id="analyticalAssistantConversation" class="aa-conversation"><div class="aa-welcome"><div class="aa-orb">AI</div><div><strong>Posso ajudar a analisar performance, forecast, ações, anomalias e compras.</strong><p>Não respondo por aproximação: quando não consigo interpretar uma pergunta com segurança, digo-o em vez de inventar.</p></div></div></section><section class="aa-capabilities"><div><b>Performance</b><span>Receita, GOP, Ocupação, ADR, RevPAR, custos e benchmark.</span></div><div><b>Operação</b><span>Ações, atrasos, riscos, anomalias e estados críticos.</span></div><div><b>Revenue</b><span>Forecast vs meta e gaps por hotel/mês.</span></div><div><b>Compras</b><span>Evolução de preços médios ponderados entre meses.</span></div></section>`;
    const input=document.getElementById('analyticalAssistantInput');input?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();askFromInput();}});
  }
  function askFromInput(){const input=document.getElementById('analyticalAssistantInput'),q=input?.value?.trim();if(!q)return;ask(q);}
  function usePrompt(p){const input=document.getElementById('analyticalAssistantInput');if(input)input.value=p;ask(p);}
  function open(seed){window.setView?.('analyticalassistant');setTimeout(()=>{render();if(seed){const input=document.getElementById('analyticalAssistantInput');if(input)input.value=seed;}document.getElementById('analyticalAssistantInput')?.focus();},25);}
  async function copy(){const a=state.last;if(!a)return;const text=[a.title,a.summary,...(a.rows||[]).map(r=>Object.entries(r).map(([k,v])=>`${k}: ${v}`).join(' | ')),...(a.traces||[]).map(t=>`Fonte — ${t.label}: ${t.detail}`)].join('\n');try{await navigator.clipboard.writeText(text);window.showToast?.('Resposta copiada.');}catch(e){window.showToast?.('Não foi possível copiar a resposta.');}}

  window.VG.analyticalAssistant={version:25,state,interpret,ask,render,open,allowedHotels,findHotels,findMonth,metricDef,compareHotels,forecastBelow,personnelVsActivity,purchasePriceIncreases};
  window.analyticalAssistantRender=render;window.analyticalAssistantOpen=open;window.analyticalAssistantAsk=askFromInput;window.analyticalAssistantUsePrompt=usePrompt;window.analyticalAssistantCopy=copy;
  window.VG.events?.on?.('state:changed',()=>{if(typeof currentView!=='undefined'&&currentView==='analyticalassistant')window.VG?.performance?.schedule?.('assistant-v25-render',render,35);});
})();
