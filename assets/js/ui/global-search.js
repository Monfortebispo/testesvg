// ==========================================================
// VG DASHBOARD V19 — PESQUISA GLOBAL / COMMAND PALETTE
// Pesquisa contextual sobre dados já autorizados no cliente.
// ==========================================================
(function(){
  'use strict';
  window.VG=window.VG||{};
  if(window.VG.search?.version>=19) return;

  const state={open:false,filter:'all',query:'',items:[],results:[],selected:0,builtAt:0,hydrating:false,hydrated:false,governanceHydrated:false};
  const FILTERS=[['all','Tudo'],['hotel','Hotéis'],['kpi','KPIs'],['action','Ações'],['agenda','Agenda'],['signal','Alertas'],['purchase','Compras'],['comment','Comentários'],['document','Documentos'],['approval','Aprovações'],['scenario','Cenários'],['data','Dados'],['finance','Financeiro']];
  const ICON={assistant:'✦',report:'📄',performance:'◉',hotel:'🏨',kpi:'◫',action:'✓',event:'📅',alert:'🔔',anomaly:'⚠',target:'🎯',article:'🧾',supplier:'🚚',comment:'💬',data:'🗄️',governance:'🛡️',document:'🗂️',approval:'✅',scenario:'⚖️',cityledger:'💳',efficiency:'⚡'};
  const KIND={assistant:'Assistente Analítico',report:'Relatório',performance:'Performance',hotel:'Hotel',kpi:'KPI',action:'Ação',event:'Agenda',alert:'Alerta',anomaly:'Anomalia',target:'Meta',article:'Artigo',supplier:'Fornecedor',comment:'Comentário',data:'Dados',governance:'Auditoria',document:'Documento',approval:'Aprovação',scenario:'Cenário',cityledger:'City Ledger',efficiency:'Eficiência'};
  const GROUP={assistant:'hotel',report:'hotel',performance:'hotel',hotel:'hotel',kpi:'kpi',action:'action',event:'agenda',alert:'signal',anomaly:'signal',target:'kpi',article:'purchase',supplier:'purchase',comment:'comment',data:'data',governance:'data',document:'document',approval:'approval',scenario:'scenario',cityledger:'finance',efficiency:'finance'};
  const esc=v=>window.VG?.util?.escapeHtml?window.VG.util.escapeHtml(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  const currentUser=()=>{try{return typeof window.vgAuthCurrent==='function'?window.vgAuthCurrent():null;}catch(e){return null;}};
  const isDirection=()=>{const u=currentUser();return !!u&&['direcao','admin'].includes(u.role);};
  const raw=()=>{try{return typeof RAW!=='undefined'?RAW:null;}catch(e){return null;}};
  const year=()=>{try{return String(typeof YR_CUR!=='undefined'?YR_CUR:window.VG?.state?.currentYear?.()||new Date().getFullYear());}catch(e){return String(new Date().getFullYear());}};
  const selectedMonth=()=>{try{const a=window.VG?.state?.selectedMonths?.()||[];return a.length?a[a.length-1]:null;}catch(e){return null;}};
  const hotels=()=>{const r=raw();let list=(r?.hotel_list||Object.keys(r?.hotels_ops||{})).filter(Boolean);if(typeof window.vgAuthCanAccessHotel==='function')list=list.filter(h=>window.vgAuthCanAccessHotel(h));return [...new Set(list)].sort((a,b)=>String(a).localeCompare(String(b),'pt'));};
  const fmtNum=(v,d=1)=>Number.isFinite(Number(v))?Number(v).toLocaleString('pt-PT',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
  const fmtEur=v=>Number.isFinite(Number(v))?(window.VG?.market?.formatMoney?window.VG.market.formatMoney(v,0,true):'€ '+Number(v).toLocaleString('pt-PT',{maximumFractionDigits:0})):'—';
  const fmtPct=v=>Number.isFinite(Number(v))?fmtNum(v,1)+'%':'—';
  const TYPE_MODULE={assistant:'analyticalassistant',report:'automaticreports',performance:'hotel360',hotel:'hoteis',kpi:'fichahotel',action:'actions',event:'agenda',alert:'alertas',anomaly:'anomalies',target:'fichahotel',article:'compras',supplier:'compras',comment:'fichahotel',data:'datacenter',governance:'governance',document:'documents',approval:'approvals',scenario:'revenuehub',cityledger:'cityledger',efficiency:'unitEconomics'};
  const add=(arr,item)=>{if(!item||!item.title)return;item.type=item.type||'hotel';const mod=item.module||TYPE_MODULE[item.type];if(mod&&typeof window.vgAuthCanAccessModule==='function'&&!window.vgAuthCanAccessModule(mod))return;if(item.hotel&&typeof window.vgAuthCanAccessHotel==='function'&&!window.vgAuthCanAccessHotel(item.hotel))return;item.group=GROUP[item.type]||item.type;item.search=norm([item.title,item.subtitle,item.hotel,item.value,item.keywords,KIND[item.type]].filter(Boolean).join(' '));arr.push(item);};

  function navigateHotel(h,month){
    if(typeof window.setView==='function')window.setView('fichahotel');
    setTimeout(()=>{try{const hs=document.getElementById('hsHotel');if(hs&&h){hs.value=h;}const ms=document.getElementById('hsMes');if(ms&&month)ms.value=String(month);if(typeof window.hsRender==='function')window.hsRender();}catch(e){}},40);
  }
  function openItem(it){
    close();
    try{
      if(typeof it.open==='function'){it.open();return;}
      if(it.type==='assistant'){window.VG?.analyticalAssistant?.open?.();return;}
      if(it.type==='report'){window.VG?.automaticReports?.open?.();return;}
      if(it.type==='performance'){window.VG?.hotelPerformance?.openHotel?.(it.hotel);return;}
      if(it.type==='hotel'||it.type==='kpi'||it.type==='target'||it.type==='comment'){navigateHotel(it.hotel,it.month);return;}
      if(it.type==='action'&&window.VG?.actions?.openById){window.VG.actions.openById(it.id);return;}
      if(it.type==='event'){window.setView?.('agenda');setTimeout(()=>window.VG?.agenda?.openById?.(it.id),40);return;}
      if(it.type==='alert'){window.setView?.('alertas');return;}
      if(it.type==='anomaly'){if(it.anomalyType==='price')window.setView?.('compras');else navigateHotel(it.hotel,it.month);return;}
      if(it.type==='article'||it.type==='supplier'){window.setView?.('compras');return;}
      if(it.type==='data'){window.setView?.('datacenter');return;}
      if(it.type==='governance'&&isDirection()){window.setView?.('governance');return;}
      if(it.type==='document'){window.VG?.documents?.openFor?.({hotel:it.hotel,query:it.title});return;}
      if(it.type==='approval'){window.VG?.approvals?.openById?.(it.id);return;}
      if(it.type==='scenario'){window.VG?.scenarioComparison?.openFor?.({hotel:it.hotel,month:it.month});return;}
    }catch(e){console.warn('Pesquisa global: navegação falhou',e);}
  }

  function buildHotelsAndKpis(arr){
    add(arr,{type:'assistant',title:'Assistente Analítico',subtitle:'Perguntas em linguagem natural sobre os dados da dashboard',keywords:'assistente analitico perguntas dados ai inteligencia analise comparar ranking forecast gop ocupacao'});
    add(arr,{type:'report',title:'Relatórios Automáticos',subtitle:'Hotel, região ou consolidado · PDF e Word',keywords:'relatorio relatorios automaticos pdf word semanal mensal executivo consolidado regiao'});
    add(arr,{type:'efficiency',title:'Eficiência & Unit Economics',subtitle:'Custos, receitas e GOP por unidade de atividade',keywords:'abc eficiencia unit economics energia quarto ocupado quarto disponivel dormida cliente hospede chegada',open:()=>window.VG?.unitEconomics?.open?.()});
    add(arr,{type:'cityledger',title:'City Ledger & Cobranças',subtitle:'Faturas, aging, diligências e recuperação',keywords:'city ledger cobranca divida faturas diligencias telefone email aging credito',open:()=>window.VG?.cityLedger?.open?.()});
    add(arr,{type:'data',module:'receitasdet',title:'Receita Detalhada',subtitle:'PdV, família, subfamília, grupo e artigo',keywords:'receita detalhada vendas artigos ponto venda pvd mix',open:()=>window.setView?.('receitasdet')});
    add(arr,{type:'article',module:'ab',title:'Compras & A&B',subtitle:'Food Cost, Beverage Cost, stock, receituário e inteligência',keywords:'compras ab food cost beverage stock fichas tecnicas receitas cocktails',open:()=>window.setView?.('ab')});
    add(arr,{type:'data',module:'housekeeping',title:'Housekeeping · Inventário Têxtil',subtitle:'Stock, quebras, campanhas e necessidades de compra',keywords:'housekeeping inventario textil roupas quebras turcos lencois par stock',open:()=>window.setView?.('housekeeping')});
    add(arr,{type:'data',module:'reputacao',title:'Reputação & Guest Experience',subtitle:'Visão executiva, semanal, semestral e hotel',keywords:'reputacao reviewpro semanal semestral gri cqi reviews',open:()=>window.setView?.('reputacao')});
    try{const lib=window.VG?.domains33?.state?.seed?.technicalLibrary||{};for(const x of [...(lib.recipes||[]),...(lib.products||[])].slice(0,260)){add(arr,{type:'article',module:'ab',title:`Ficha Técnica · ${x.name}`,subtitle:[x.category,x.brandScope,x.version].filter(Boolean).join(' · '),keywords:[x.collection,x.source,(x.ingredients||[]).map(i=>i.ingredient).join(' ')].filter(Boolean).join(' '),open:()=>{window.setView?.('ab');setTimeout(()=>{const root=document.getElementById('abHubRoot');if(root){root.dataset.tab='recipes';window.VG?.domains33?.renderAB?.();const q=document.getElementById('ft33Search');if(q){q.value=x.name;q.dispatchEvent(new Event('input',{bubbles:true}));}}},80);}});}}catch(e){}
    const r=raw(),y=year(),k=window.VG?.kpi;if(!r)return;
    for(const h of hotels()){
      add(arr,{type:'performance',title:`Performance · ${h}`,subtitle:'Situação executiva, riscos, forecast e ações',hotel:h,keywords:'performance hotel situacao executivo risco oportunidade'});
      add(arr,{type:'hotel',title:h,subtitle:'Abrir Comentários Fecho do Mês',hotel:h,keywords:'unidade hotel ficha performance'});
      const op=r.hotels_ops?.[h]||{};
      const revenue=Number(op['Receita Total']?.[y]);
      const rows=[
        ['Receita Total',Number.isFinite(revenue)?revenue:null,'eur','receita faturacao vendas'],
        ['GOP com sede',k?.gop?.(h,y,r), 'eur','gop resultado margem'],
        ['Margem GOP',k?.gopPct?.(h,y,r),'pct','gop percentagem margem'],
        ['Ocupação',k?.occupancy?.(h,y,r),'pct','ocupacao quartos taxa'],
        ['ADR',k?.adr?.(h,y,r),'eur2','adr preco medio quarto'],
        ['RevPAR',k?.revpar?.(h,y,r),'eur2','revpar revenue available room'],
        ['Custos Totais',k?.totalCosts?.(h,y,r),'eur','custos despesas totais']
      ];
      for(const [label,val,format,keys] of rows){if(val==null||!Number.isFinite(Number(val)))continue;const value=format==='pct'?fmtPct(val):format==='eur2'?(window.VG?.market?.formatMoney?window.VG.market.formatMoney(val,2,true):'€ '+fmtNum(val,2)):fmtEur(val);add(arr,{type:'kpi',title:`${h} · ${label}`,subtitle:`${y} · valor atual do período selecionado`,hotel:h,value,keywords:`${label} ${keys}`});}
    }
  }

  function buildActions(arr){
    try{for(const a of window.VG?.actions?.all?.()||[]){add(arr,{type:'action',id:a.id,title:a.title||a.subject||'Ação',subtitle:[a.hotel,a.assigneeName||a.assignee,a.status,a.dueDate?`Prazo ${a.dueDate}`:''].filter(Boolean).join(' · '),hotel:a.hotel||'',value:a.dueDate||'',keywords:[a.description,a.comments,a.owner,a.assigneeName,a.assignee,a.status].flat().filter(Boolean).join(' ')});}}catch(e){}
  }

  function buildAgenda(arr){
    try{for(const e of window.VG?.agenda?.all?.()||[]){if(!e||!e.date)continue;add(arr,{type:'event',id:e.id,title:e.title||'Evento operacional',subtitle:[e.date,e.startTime,e.hotel,e.ownerName].filter(Boolean).join(' · '),hotel:e.hotel||'',value:e.type==='action'?'Prazo':(window.VG?.agenda?.TYPES?.[e.type]?.label||'Agenda'),keywords:[e.notes,e.ownerName,e.type,'agenda auditoria visita reuniao prazo operacional'].filter(Boolean).join(' ')});}}catch(e){}
  }

  function buildSignals(arr){
    const hs=hotels();
    try{if(typeof ALERT_RULES!=='undefined')for(const h of hs)for(const rule of ALERT_RULES){let active=false;try{active=!!rule.check(h);}catch(e){}if(!active)continue;const label=typeof alertRuleLabel==='function'?alertRuleLabel(rule,h):(rule.label||'Alerta');add(arr,{type:'alert',title:`${h} · ${label}`,subtitle:`Alerta operacional · ${rule.severity==='red'?'Crítico':'Atenção'}`,hotel:h,value:rule.severity==='red'?'CRÍTICO':'ATENÇÃO',keywords:`${rule.id||''} alerta risco`});}}catch(e){}
    try{const m=window.VG?.anomalies?.build?.({hotels:hs});if(m?.rows){window.VG.anomalies.lastModel=m;for(const x of m.rows.slice(0,120)){add(arr,{type:'anomaly',title:`${x.hotel} · ${x.title}`,subtitle:x.detail||x.source||'',hotel:x.hotel||'',month:x.month||null,value:x.amount?fmtEur(x.amount):(x.severity==='red'?'CRÍTICO':'ATENÇÃO'),anomalyType:x.type,keywords:[x.metric,x.type,x.action,x.source,x.evidence?.article].filter(Boolean).join(' ')});}}}catch(e){}
  }

  function buildTargets(arr){
    try{
      const api=window.VG?.targetsRules,cfg=api?.getConfig?.();if(!cfg)return;
      for(const def of api.ruleDefs||[]){const r=cfg.rules?.[def.id];if(!r||r.enabled===false)continue;add(arr,{type:'target',title:`Regra global · ${def.label||def.id}`,subtitle:`Metas & Regras · ${r.severity==='critical'||r.severity==='red'?'Crítica':'Atenção'}`,value:r.value!=null?String(r.value):'',keywords:`meta regra limite objetivo ${def.id}`,open:()=>{if(isDirection()&&typeof window.vgAuthOpenSetup==='function')window.vgAuthOpenSetup();else window.setView?.('alertas');}});}
      for(const [h,ys] of Object.entries(cfg.targets||{}))for(const [y,ms] of Object.entries(ys||{}))for(const [m,vals] of Object.entries(ms||{}))for(const [metric,v] of Object.entries(vals||{})){if(v==null||v==='')continue;const def=api.targetDefs?.find?.(d=>d.id===metric);add(arr,{type:'target',title:`${h} · ${def?.label||metric}`,subtitle:`Meta específica · ${m}/${y}`,hotel:h,month:Number(m),value:String(v),keywords:`meta objetivo target ${metric}`});}
    }catch(e){}
  }

  function buildPurchases(arr){
    let cd=null;try{cd=typeof window.cdGetData==='function'?window.cdGetData():null;}catch(e){}if(!cd?.dic)return;
    const d=cd.dic,H=d.hoteis||[],A=d.art||[],F=d.forn||[],latest=(cd.meta?.meses||[]).length-1;
    const artStat=new Map(),fornStat=new Map();
    for(const r of cd.PM||[]){const [art,forn,hotel,mi,val,qtd]=r;if(mi!==latest)continue;let a=artStat.get(art);if(!a){a={value:0,qtd:0,hotels:new Set(),suppliers:new Set()};artStat.set(art,a);}a.value+=Number(val)||0;a.qtd+=Number(qtd)||0;a.hotels.add(H[hotel]||'');a.suppliers.add(F[forn]||'');let f=fornStat.get(forn);if(!f){f={value:0,articles:new Set(),hotels:new Set()};fornStat.set(forn,f);}f.value+=Number(val)||0;f.articles.add(A[art]||'');f.hotels.add(H[hotel]||'');}
    for(let i=1;i<A.length;i++){const name=A[i];if(!name)continue;const s=artStat.get(i);const price=s?.qtd>0?s.value/s.qtd:null;add(arr,{type:'article',title:name,subtitle:s?`${s.hotels.size} hotel(is) · ${s.suppliers.size} fornecedor(es) · último mês disponível`:'Artigo no dicionário de Compras',value:price!=null?(window.VG?.market?.formatMoney?window.VG.market.formatMoney(price,2,true):'€ '+fmtNum(price,2))+'/un':'',keywords:s?[...s.suppliers].join(' '):''});}
    for(let i=1;i<F.length;i++){const name=F[i];if(!name)continue;const s=fornStat.get(i);add(arr,{type:'supplier',title:name,subtitle:s?`${s.articles.size} artigo(s) · ${s.hotels.size} hotel(is) · último mês disponível`:'Fornecedor no dicionário de Compras',value:s?fmtEur(s.value):'',keywords:s?[...s.articles].slice(0,30).join(' '):''});}
  }

  function buildComments(arr){
    try{if(typeof HS_SHARED_CACHE==='undefined')return;const y=year();for(const [h,data] of Object.entries(HS_SHARED_CACHE||{})){const comments=data?.comments?.[y]||{};for(const [m,rows] of Object.entries(comments||{}))for(const [row,text] of Object.entries(rows||{})){if(!String(text||'').trim())continue;let label=row;try{const def=typeof HS_ROWS!=='undefined'?HS_ROWS.find(r=>r.id===row):null;if(def?.label)label=def.label;}catch(e){}add(arr,{type:'comment',title:`${h} · ${label}`,subtitle:String(text).replace(/\s+/g,' ').slice(0,220),hotel:h,month:Number(m),value:`Mês ${m}`,keywords:`comentario ficha ${row} ${text}`});}}}catch(e){}
  }

  function buildDocuments(arr){
    try{for(const r of window.VG?.documents?.searchItems?.()||[]){add(arr,{type:'document',id:r.id,title:r.title||'Documento',subtitle:r.subtitle||'',hotel:r.hotel||'',keywords:r.keywords||''});}}catch(e){}
  }

  function buildApprovals(arr){
    try{for(const r of window.VG?.approvals?.searchItems?.()||[]){add(arr,{type:'approval',id:r.id,title:r.title||'Pedido de aprovação',subtitle:r.subtitle||'',hotel:r.hotel||'',value:r.value||'',keywords:r.keywords||''});}}catch(e){}
  }

  function buildScenarios(arr){
    try{for(const r of window.VG?.scenarioComparison?.searchItems?.()||[]){add(arr,{type:'scenario',id:r.id,title:r.title||'Cenário',subtitle:r.subtitle||'',hotel:r.hotel||'',month:r.month||null,value:r.value||'Cenário',keywords:r.keywords||''});}}catch(e){}
  }

  function buildDataHistory(arr){
    try{for(const r of window.vgDataCenterHistory?.()||[]){add(arr,{type:'data',title:r.sourceName||r.fileName||r.source||'Carregamento',subtitle:[r.fileName,r.scope,r.summary,r.name||r.user].filter(Boolean).join(' · '),hotel:r.hotel||'',value:r.createdAt?new Date(r.createdAt).toLocaleDateString('pt-PT'):'',keywords:[r.source,r.action,r.status,r.warnings].flat().filter(Boolean).join(' ')});}}catch(e){}
    if(isDirection())try{for(const r of window.vgGovernanceRows?.()||[]){add(arr,{type:'governance',title:r.action||'Alteração',subtitle:[r.name||r.user,r.hotel,r.detail,r.resource].filter(Boolean).join(' · '),hotel:r.hotel||'',value:r.serverTs?new Date(r.serverTs).toLocaleDateString('pt-PT'):'',keywords:[r.category,r.resource,r.key,r.detail].filter(Boolean).join(' ')});}}catch(e){}
  }


  function buildCityLedger(arr){
    try{
      const api=window.VG?.cityLedger,rows=api?.state?.rows||[];if(!rows.length)return;
      const clients=new Map();
      for(const r of rows){
        const saldo=Number(r.balance||0);if(!clients.has(r.clientKey))clients.set(r.clientKey,{name:r.entity,hotel:r.hotel,total:0,docs:0});
        const c=clients.get(r.clientKey);c.total+=saldo>0?saldo:0;c.docs++;
        add(arr,{type:'cityledger',title:`${r.hotel} · ${r.accountingDocument||r.documentNumber||'Fatura'}`,subtitle:`${r.entity} · ${r.daysOverdue>0?r.daysOverdue+' dias vencido':'a vencer'}`,hotel:r.hotel,value:saldo>0?fmtEur(saldo):'',keywords:`${r.entity} ${r.clientCode||''} ${r.voucher||''} fatura documento cobranca`,open:()=>{api.state.filterHotel=r.hotel;api.state.filterClient=r.clientKey;api.state.query=r.accountingDocument||r.documentNumber||'';api.state.tab='invoices';api.open();}});
      }
      for(const c of clients.values())add(arr,{type:'cityledger',title:`Cliente · ${c.name}`,subtitle:`${c.hotel} · ${c.docs} documento(s)`,hotel:c.hotel,value:fmtEur(c.total),keywords:'cliente devedor cobranca city ledger',open:()=>{api.state.filterHotel=c.hotel;api.state.query=c.name;api.state.tab='clients';api.open();}});
    }catch(e){}
  }

  function buildIndex(){
    const arr=[];buildHotelsAndKpis(arr);buildActions(arr);buildAgenda(arr);buildSignals(arr);buildTargets(arr);buildPurchases(arr);buildComments(arr);buildDocuments(arr);buildApprovals(arr);buildScenarios(arr);buildCityLedger(arr);buildDataHistory(arr);state.items=arr;state.builtAt=Date.now();return arr;
  }

  function score(item,q){
    if(!q)return 0;const words=q.split(' ').filter(Boolean);let s=0;
    if(item.search===q)s+=180;if(norm(item.title)===q)s+=170;if(norm(item.title).startsWith(q))s+=95;if(item.search.startsWith(q))s+=55;
    for(const w of words){if(!item.search.includes(w))return -1;if(norm(item.title).includes(w))s+=28;else s+=12;if(norm(item.hotel)===w)s+=30;}
    const priority={assistant:10,report:9,action:8,event:7,alert:8,anomaly:8,performance:9,hotel:6,kpi:5,target:4,comment:3,article:2,supplier:2,data:1,governance:1,document:6,approval:8,scenario:9};return s+(priority[item.type]||0);
  }
  function run(q){
    state.query=String(q??'');const nq=norm(state.query);let rows=state.items;
    if(state.filter!=='all')rows=rows.filter(x=>x.group===state.filter);
    if(nq)rows=rows.map(x=>({x,s:score(x,nq)})).filter(z=>z.s>=0).sort((a,b)=>b.s-a.s||String(a.x.title).localeCompare(String(b.x.title),'pt')).map(z=>z.x);else rows=[...rows.filter(x=>x.type==='action').slice(0,8),...rows.filter(x=>x.type==='hotel').slice(0,12)];
    state.results=rows.slice(0,80);state.selected=Math.min(state.selected,Math.max(0,state.results.length-1));renderResults();return state.results;
  }

  function renderResults(){
    const box=document.getElementById('vgGlobalSearchResults'),meta=document.getElementById('vgGlobalSearchMeta');if(!box)return;
    if(meta)meta.innerHTML=`${state.hydrating?'<span><i class="vg-search-loading-dot"></i>A completar índice partilhado…</span>':`<span>${state.results.length}${state.results.length===80?'+' : ''} resultado(s)</span>`}<span>${state.items.length} referências pesquisáveis</span>`;
    if(!state.results.length){box.innerHTML=`<div class="vg-search-empty"><strong>Sem resultados</strong>Tenta um hotel, KPI, fornecedor, artigo, ação ou palavra do comentário.</div>`;return;}
    box.innerHTML=state.results.map((r,i)=>`<button class="vg-search-result ${i===state.selected?'active':''}" type="button" data-i="${i}"><span class="vg-search-result-icon">${ICON[r.type]||'⌕'}</span><span class="vg-search-result-main"><span class="vg-search-result-title">${esc(r.title)}</span><span class="vg-search-result-sub">${esc(r.subtitle||r.hotel||'')}</span></span><span class="vg-search-result-side">${r.value?`<span class="vg-search-result-value">${esc(r.value)}</span>`:''}<span class="vg-search-result-kind">${esc(KIND[r.type]||r.type)}</span></span></button>`).join('');
    box.querySelector('.vg-search-result.active')?.scrollIntoView?.({block:'nearest'});
  }
  function renderFilters(){const root=document.getElementById('vgGlobalSearchFilters');if(!root)return;root.innerHTML=FILTERS.map(([id,label])=>`<button type="button" class="vg-search-chip ${state.filter===id?'active':''}" data-filter="${id}">${label}</button>`).join('');}

  function ensureUI(){
    if(document.getElementById('vgGlobalSearch'))return;
    const overlay=document.createElement('div');overlay.id='vgGlobalSearch';overlay.setAttribute('aria-hidden','true');overlay.innerHTML=`<div class="vg-search-panel" role="dialog" aria-modal="true" aria-label="Pesquisa Global"><div class="vg-search-head"><span class="vg-search-head-icon">⌕</span><input id="vgGlobalSearchInput" autocomplete="off" spellcheck="false" placeholder="Pesquisar hotel, KPI, ação, fornecedor, artigo…"><button class="vg-search-esc" type="button">ESC</button></div><div class="vg-search-filters" id="vgGlobalSearchFilters"></div><div class="vg-search-meta" id="vgGlobalSearchMeta"><span>Pesquisa Global</span><span>V19</span></div><div class="vg-search-results" id="vgGlobalSearchResults"></div><div class="vg-search-footer"><span><kbd>↑</kbd> <kbd>↓</kbd> navegar · <kbd>Enter</kbd> abrir</span><span><kbd>Ctrl</kbd> + <kbd>K</kbd> abrir/fechar</span></div></div>`;document.body.appendChild(overlay);
    overlay.addEventListener('mousedown',e=>{if(e.target===overlay)close();});
    const input=overlay.querySelector('#vgGlobalSearchInput');input.addEventListener('input',()=>{state.selected=0;run(input.value);});
    overlay.querySelector('.vg-search-esc').addEventListener('click',close);
    overlay.querySelector('#vgGlobalSearchFilters').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;state.filter=b.dataset.filter||'all';state.selected=0;renderFilters();run(input.value);});
    overlay.querySelector('#vgGlobalSearchResults').addEventListener('click',e=>{const b=e.target.closest('[data-i]');if(!b)return;const it=state.results[Number(b.dataset.i)];if(it)openItem(it);});
    const mobile=document.createElement('button');mobile.type='button';mobile.className='vg-search-mobile-trigger';mobile.setAttribute('aria-label','Pesquisa Global');mobile.textContent='⌕';mobile.addEventListener('click',open);document.body.appendChild(mobile);
  }
  function installTopTrigger(){
    if(document.getElementById('vgGlobalSearchTrigger'))return;const right=document.querySelector('.topbar-right');if(!right)return;const b=document.createElement('button');b.type='button';b.id='vgGlobalSearchTrigger';b.className='vg-search-top-trigger';b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg><span class="vg-search-label">Pesquisar</span><span class="vg-search-key">Ctrl K</span>';b.addEventListener('click',open);right.insertBefore(b,right.firstChild);
  }

  async function hydrate(){
    if(state.hydrating||state.hydrated)return;state.hydrating=true;renderResults();
    try{
      const jobs=[];
      if(window.VG?.actions?.ensureLoaded)jobs.push(window.VG.actions.ensureLoaded(false));
      if(window.VG?.agenda?.ensureLoaded)jobs.push(window.VG.agenda.ensureLoaded(false));
      if(window.VG?.documents?.ensureLoaded)jobs.push(window.VG.documents.ensureLoaded(false));
      if(window.VG?.approvals?.ensureLoaded)jobs.push(window.VG.approvals.ensureLoaded(false));
      if(typeof window.dcLoadHistory==='function')jobs.push(window.dcLoadHistory(false));
      try{if(typeof hsEnsureHotelsLoaded==='function')jobs.push(hsEnsureHotelsLoaded(hotels()));}catch(e){}
      if(isDirection()&&typeof window.vgGovernanceEnsureLoaded==='function')jobs.push(window.vgGovernanceEnsureLoaded(false));
      await Promise.allSettled(jobs);state.hydrated=true;
    }finally{state.hydrating=false;buildIndex();if(state.open)run(document.getElementById('vgGlobalSearchInput')?.value||'');}
  }
  function open(seed){
    if(!currentUser())return;ensureUI();installTopTrigger();state.open=true;const el=document.getElementById('vgGlobalSearch');el.classList.add('open');el.setAttribute('aria-hidden','false');document.body.classList.add('vg-global-search-open');buildIndex();renderFilters();const input=document.getElementById('vgGlobalSearchInput');if(seed!=null)input.value=String(seed);state.selected=0;run(input.value);setTimeout(()=>{input.focus();input.select();},20);const idle=window.VG?.performance?.idle||((fn)=>setTimeout(fn,20));idle(()=>hydrate(),{timeout:250});
  }
  function close(){state.open=false;document.getElementById('vgGlobalSearch')?.classList.remove('open');document.getElementById('vgGlobalSearch')?.setAttribute('aria-hidden','true');document.body.classList.remove('vg-global-search-open');}
  function keydown(e){
    if((e.ctrlKey||e.metaKey)&&String(e.key).toLowerCase()==='k'){e.preventDefault();state.open?close():open();return;}
    if(!state.open)return;
    if(e.key==='Escape'){e.preventDefault();close();return;}if(e.key==='ArrowDown'){e.preventDefault();state.selected=Math.min(state.results.length-1,state.selected+1);renderResults();return;}if(e.key==='ArrowUp'){e.preventDefault();state.selected=Math.max(0,state.selected-1);renderResults();return;}if(e.key==='Enter'){const it=state.results[state.selected];if(it){e.preventDefault();openItem(it);}}
  }
  function invalidate(){state.builtAt=0;if(state.open){buildIndex();run(document.getElementById('vgGlobalSearchInput')?.value||'');}}
  function init(){ensureUI();installTopTrigger();document.addEventListener('keydown',keydown);window.VG?.events?.on?.('state:changed',()=>window.VG?.performance?.schedule?.('search-reindex',invalidate,120));window.VG?.events?.on?.('actions:changed',invalidate);window.VG?.events?.on?.('agenda:changed',invalidate);window.VG?.events?.on?.('documents:changed',invalidate);window.VG?.events?.on?.('approvals:changed',invalidate);window.VG?.events?.on?.('targets-rules:changed',invalidate);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();

  window.VG.search={version:19,open,close,run,buildIndex,invalidate,state};
  window.vgGlobalSearchOpen=open;window.vgGlobalSearchClose=close;
})();
