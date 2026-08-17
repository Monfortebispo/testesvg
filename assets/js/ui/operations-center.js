// ==========================================================
// VG DASHBOARD v8 — CENTRAL DE OPERAÇÕES + AÇÕES
// Usa as regras e KPIs já existentes; não cria uma segunda fonte de verdade.
// ==========================================================
(function(){
  'use strict';

  const ACTION_BY_RULE = {
    gop_neg:   'Validar P&L e atacar imediatamente os maiores desvios de receita/custo.',
    gop_low:   'Definir plano de recuperação de margem e responsáveis por rubrica.',
    occ_low:   'Rever pricing, canais, grupos e ações comerciais para acelerar procura.',
    occ_drop:  'Comparar procura e calendário com o ano anterior e atuar nas datas fracas.',
    labour_hi: 'Rever produtividade, escalas, trabalho temporário e custo por atividade.',
    energy_hi: 'Validar consumo/preço e anomalias de energia antes do fecho.',
    maint_hi:  'Rever extraordinários, contratos e trabalhos de manutenção do período.',
    rev_drop:  'Identificar onde se perdeu receita: ocupação, ADR, F&B ou outros proveitos.',
    adr_drop:  'Rever estratégia tarifária, mix de canais e descontos aplicados.'
  };

  const ruleSeverityWeight = { red: 100, orange: 55, green: 10 };

  function safeHotels(){
    try { return (typeof getActiveHotels === 'function' ? getActiveHotels() : (RAW?.hotel_list || [])).slice(); }
    catch(e){ return []; }
  }
  function shortHotel(h){ return String(h || '').replace('COLLECTION ','C. '); }
  function pctVar(prev, cur){ prev=Number(prev); cur=Number(cur); return isFinite(prev) && prev !== 0 && isFinite(cur) ? (cur-prev)/Math.abs(prev)*100 : null; }
  function fmtMoney(v){
    if(v==null || !isFinite(Number(v))) return '—';
    if(window.VG?.market?.formatMoneyCompact) return window.VG.market.formatMoneyCompact(v,1);
    const a=Math.abs(Number(v)), sign=Number(v)<0?'-':'';
    if(a>=1000000) return sign+'€'+(a/1000000).toLocaleString('pt-PT',{maximumFractionDigits:1})+'M';
    if(a>=1000) return sign+'€'+(a/1000).toLocaleString('pt-PT',{maximumFractionDigits:0})+'K';
    return sign+'€'+a.toLocaleString('pt-PT',{maximumFractionDigits:0});
  }
  function fmtPctValue(v){ return v==null || !isFinite(Number(v)) ? '—' : Number(v).toLocaleString('pt-PT',{maximumFractionDigits:1})+'%'; }
  function escapeHtml(v){ return window.VG?.util?.escapeHtml ? window.VG.util.escapeHtml(v) : String(v ?? ''); }

  function collectOperationalAlerts(hotels){
    if(typeof ALERT_RULES === 'undefined') return [];
    return hotels.map(h=>{
      const rules=ALERT_RULES.filter(r=>{ try{return !!r.check(h);}catch(e){return false;} });
      if(!rules.length) return null;
      const reds=rules.filter(r=>r.severity==='red').length;
      const oranges=rules.filter(r=>r.severity==='orange').length;
      const score=rules.reduce((s,r)=>s+(ruleSeverityWeight[r.severity]||30),0) + Math.max(0,rules.length-1)*8;
      return {
        kind:'operational', hotel:h, severity:reds?'red':'orange', score,
        title: (typeof alertRuleLabel==='function'?alertRuleLabel(rules[0],h):rules[0].label),
        reasons: rules.map(r=>typeof alertRuleLabel==='function'?alertRuleLabel(r,h):r.label),
        action: ACTION_BY_RULE[rules[0].id] || 'Validar o desvio e definir uma ação com responsável e prazo.',
        ruleIds: rules.map(r=>r.id), reds, oranges
      };
    }).filter(Boolean);
  }

  function collectDataIssues(hotels){
    if(typeof validateDashboardData!=='function') return {all:[], priorities:[]};
    const set=new Set(hotels);
    const all=(validateDashboardData(RAW)||[]).filter(i=>i.hotel==='Portefólio'||set.has(i.hotel));
    const grouped=new Map();
    all.filter(i=>i.severity==='red').forEach(i=>{
      const key=i.hotel||'Portefólio';
      if(!grouped.has(key)) grouped.set(key,[]);
      grouped.get(key).push(i);
    });
    const priorities=[...grouped.entries()].map(([hotel,issues])=>({
      kind:'data', hotel, severity:'red', score:130+issues.length*10,
      title:'Incoerência crítica de dados', reasons:issues.map(i=>i.message),
      action:'Validar o ficheiro de origem antes de tomar decisões sobre estes indicadores.',
      issueCodes:issues.map(i=>i.code).filter(Boolean)
    }));
    return {all,priorities};
  }

  function collectRevenueDecision(hotels){
    try {
      const api=window.VG?.revenue;
      if(!api || typeof api.getDecisionSnapshot!=='function') return {available:false,totalRisk:0,risks:[],opportunities:[],label:'Sem snapshots RI'};
      return api.getDecisionSnapshot(hotels);
    } catch(e){ console.warn('Central de Operações — RI indisponível',e); return {available:false,totalRisk:0,risks:[],opportunities:[],label:'RI indisponível'}; }
  }


  function collectAnomalies(hotels){
    try{
      const api=window.VG?.anomalies;
      if(!api||typeof api.getDecisionSnapshot!=='function')return {available:false,priorities:[],opportunities:[],critical:0,attention:0,impact:0};
      return api.getDecisionSnapshot(hotels);
    }catch(e){console.warn('Central de Operações — anomalias indisponíveis',e);return {available:false,priorities:[],opportunities:[],critical:0,attention:0,impact:0};}
  }

  function collectKpiOpportunities(hotels){
    const rows=[];
    hotels.forEach(h=>{
      const ops=RAW?.hotels_ops?.[h]; if(!ops) return;
      const r0=Number(ops?.['Receita Total']?.[YR_PREV]||0), r1=Number(ops?.['Receita Total']?.[YR_CUR]||0);
      const rv=pctVar(r0,r1);
      const gp0=typeof gopPct==='function'?gopPct(h,YR_PREV):null, gp1=typeof gopPct==='function'?gopPct(h,YR_CUR):null;
      const o0=typeof occ==='function'?occ(h,YR_PREV):null, o1=typeof occ==='function'?occ(h,YR_CUR):null;
      const a0=typeof adr==='function'?adr(h,YR_PREV):null, a1=typeof adr==='function'?adr(h,YR_CUR):null;
      const av=pctVar(a0,a1);
      if(rv!=null && rv>=8) rows.push({hotel:h,kind:'Receita',value:`+${rv.toFixed(1)}%`,score:50+rv,title:'Crescimento de receita',sub:`Receita ${YR_CUR} acima de ${YR_PREV}. Proteger o ganho e identificar os motores replicáveis.`});
      if(gp0!=null&&gp1!=null&&(gp1-gp0)>=3) rows.push({hotel:h,kind:'Margem',value:`+${(gp1-gp0).toFixed(1)} pp`,score:62+(gp1-gp0)*2,title:'Melhoria de margem GOP',sub:`GOP% evoluiu de ${gp0.toFixed(1)}% para ${gp1.toFixed(1)}%. Validar práticas que possam ser replicadas.`});
      if(o0!=null&&o1!=null&&(o1-o0)>=6) rows.push({hotel:h,kind:'Ocupação',value:`+${(o1-o0).toFixed(1)} pp`,score:45+(o1-o0),title:'Ganho de ocupação',sub:`Ocupação acima do ano anterior. Verificar se existe margem para proteger/subir ADR.`});
      if(av!=null&&av>=6 && o0!=null&&o1!=null&&(o1-o0)>=-2) rows.push({hotel:h,kind:'ADR',value:`+${av.toFixed(1)}%`,score:55+av,title:'ADR em crescimento sem perda material de ocupação',sub:`Preço médio subiu e a ocupação manteve-se próxima ou acima de ${YR_PREV}.`});
    });
    return rows.sort((a,b)=>b.score-a.score);
  }

  function selectedPeriodKey(){
    try{
      const months=window.VG?.state?.selectedMonths?.()||[];
      return months.length?months.map(Number).sort((a,b)=>a-b).join(','):'all';
    }catch(e){return 'all';}
  }
  function prioritySignals(p){
    const items=p.items?.length?p.items:[p];
    const out=[];
    items.forEach(x=>{
      if(x.kind==='operational') (x.ruleIds||[]).forEach(id=>out.push('op:'+id));
      else if(x.kind==='revenue') out.push('ri:'+(x.month||'na'));
      else if(x.kind==='data') (x.issueCodes||[]).forEach(code=>out.push('data:'+code));
      else if(x.kind==='anomaly') out.push('anomaly:'+(x.anomalyId||x.type||'signal'));
      else out.push(String(x.kind||'other'));
    });
    return [...new Set(out)].sort().join(',')||String(p.kind||'priority');
  }
  function prioritySourceKey(p,year,periodKey){
    return ['central',year,periodKey,p.hotel||'Portefólio',prioritySignals(p)].join('|');
  }

  function buildModel(){
    const hotels=safeHotels();
    const operational=collectOperationalAlerts(hotels);
    const data=collectDataIssues(hotels);
    const ri=collectRevenueDecision(hotels);
    const anomaly=collectAnomalies(hotels);
    const anomalyPriorities=anomaly.priorities||[];
    const riPriorities=(ri.risks||[]).map(r=>({
      kind:'revenue', hotel:r.hotel, severity:r.severity||'orange', score:Number(r.score||80),
      title:`Risco comercial · ${r.monthLabel||''}`.trim(),
      reasons:[r.summary || `Forecast ${fmtPctValue(r.forecast)} vs objetivo ${fmtPctValue(r.target)}`],
      action:r.action || 'Abrir Revenue Intelligence e rever as datas em risco.',
      risk:Number(r.eurRisk||0), month:r.month
    }));
    // Uma prioridade por hotel: quando o mesmo hotel tem sinais financeiros, operacionais
    // e de Revenue, a Central agrega-os numa única decisão em vez de repetir linhas.
    const merged=new Map();
    [...data.priorities,...operational,...anomalyPriorities,...riPriorities].forEach(p=>{
      const key=p.hotel||'Portefólio';
      if(!merged.has(key)){ merged.set(key,{...p,reasons:[...(p.reasons||[])],kinds:new Set([p.kind]),items:[p]}); return; }
      const x=merged.get(key); x.items.push(p); x.kinds.add(p.kind);
      x.reasons=[...new Set([...(x.reasons||[]),...(p.reasons||[])])];
      x.score=Math.max(x.score||0,p.score||0)+12;
      if(p.severity==='red') x.severity='red';
      x.risk=(Number(x.risk)||0)+(Number(p.risk)||0);
    });
    const priorities=[...merged.values()].map(p=>{
      const kinds=[...p.kinds];
      if(kinds.length>1){
        p.kind='mixed';
        p.title='Prioridade combinada — '+kinds.map(k=>k==='revenue'?'Revenue':k==='data'?'Dados':k==='anomaly'?'Anomalias':'Operação').join(' + ');
        p.action='Tratar os desvios em conjunto e validar a causa na Comentários Fecho do Mês e no módulo especializado.';
      }
      return p;
    }).sort((a,b)=>b.score-a.score).slice(0,8);
    const kpiOpp=collectKpiOpportunities(hotels);
    const riOpp=(ri.opportunities||[]).map(o=>({hotel:o.hotel,kind:'Revenue',value:o.value||'',score:o.score||70,title:o.title||'Oportunidade comercial',sub:o.sub||o.action||''}));
    const anomalyOpp=anomaly.opportunities||[];
    const opportunities=[...anomalyOpp,...riOpp,...kpiOpp].sort((a,b)=>b.score-a.score).filter((row,idx,arr)=>arr.findIndex(x=>x.hotel===row.hotel&&x.title===row.title)===idx).slice(0,6);

    const criticalHotels=new Set(); const attentionHotels=new Set();
    operational.forEach(x=>(x.severity==='red'?criticalHotels:attentionHotels).add(x.hotel));
    data.priorities.forEach(x=>criticalHotels.add(x.hotel));
    anomalyPriorities.forEach(x=>(x.severity==='red'?criticalHotels:attentionHotels).add(x.hotel));
    riPriorities.forEach(x=>(x.severity==='red'?criticalHotels:attentionHotels).add(x.hotel));
    criticalHotels.forEach(h=>attentionHotels.delete(h));

    const months=window.VG?.state?.selectedMonths?.()||[];
    const period=months.length ? months.map(m=>window.VG?.util?.monthName?.(m)||m).join(', ') : 'período carregado';
    const year=String(typeof YR_CUR!=='undefined'?YR_CUR:new Date().getFullYear());
    const periodKey=selectedPeriodKey();
    priorities.forEach(p=>{
      p.sourceKey=prioritySourceKey(p,year,periodKey);
      p.actionRecord=window.VG?.actions?.findForSource?.(p.sourceKey)||null;
    });
    const actionStats=window.VG?.actions?.stats?.(hotels)||{open:0,unassigned:0,overdue:0,progress:0,resolvedWeek:0};
    const actionWatch=window.VG?.actions?.watch?.(hotels,5)||[];
    return {
      hotels, operational, data, ri, anomaly, priorities, opportunities, actionStats, actionWatch,
      critical:criticalHotels.size, attention:attentionHotels.size,
      totalRisk:Number(ri.totalRisk||0),
      period, year, periodKey,
      healthy:Math.max(0,hotels.length-new Set([...criticalHotels,...attentionHotels]).size)
    };
  }

  function statHtml(label,value,sub,cls){
    return `<div class="ops-stat ${cls||''}"><div class="ops-stat-label">${escapeHtml(label)}</div><div class="ops-stat-value">${escapeHtml(value)}</div><div class="ops-stat-sub" title="${escapeHtml(sub)}">${escapeHtml(sub)}</div></div>`;
  }
  function priorityHtml(p,i){
    const sev=p.severity==='red'?'red':p.kind==='revenue'?'blue':'orange';
    const type=p.kind==='data'?'Dados':p.kind==='revenue'?'Revenue':p.kind==='anomaly'?'Anomalia':p.kind==='mixed'?'Decisão integrada':'Operação';
    const details=(p.reasons||[]).slice(0,3).join(' · ');
    const actionLabel=p.kind==='revenue'?'Abrir Revenue Intelligence':p.kind==='anomaly'?'Abrir Anomalias':'Abrir Comentários Fecho do Mês';
    const action=p.kind==='revenue'?`opsGoTo('revenueint')`:p.kind==='anomaly'?`opsGoTo('anomalies')`:`opsOpenHotel(${JSON.stringify(p.hotel)})`;
    const a=p.actionRecord;
    const sm=a&&window.VG?.actions?.statusMeta?window.VG.actions.statusMeta(a.status):null;
    const overdue=a&&window.VG?.actions?.isOverdue?.(a);
    const actionInfo=a?`<div class="ops-action-inline"><span class="ops-action-status ${escapeHtml(sm?.cls||'open')}">${escapeHtml(sm?.label||a.status)}</span><span>${escapeHtml(a.ownerName||'Sem responsável')}</span><span class="${overdue?'ops-action-due-over':''}">${escapeHtml(a.dueDate?new Date(a.dueDate+'T12:00:00').toLocaleDateString('pt-PT'):'Sem prazo')}</span></div>`:'';
    const manageLabel=a?'Gerir ação':'Criar ação';
    const canCreate=a||window.VG?.actions?.canManage?.(p.hotel);
    return `<div class="ops-priority">
      <div class="ops-rank">${i+1}</div>
      <div><div class="ops-hotel">${escapeHtml(shortHotel(p.hotel))}</div><span class="ops-type">${type}</span></div>
      <div class="ops-priority-main"><strong>${escapeHtml(p.title)}</strong><div class="ops-reason">${escapeHtml(details)}</div><div class="ops-reason">Ação: ${escapeHtml(p.action)}</div>${actionInfo}<div class="ops-priority-buttons"><button class="ops-open" onclick='${action}'>${actionLabel} →</button>${canCreate?`<button class="ops-open ops-action-open" onclick="opsManagePriorityAction(${i})">${manageLabel} →</button>`:''}</div></div>
      <span class="ops-sev ${sev}">${p.severity==='red'?'CRÍTICO':p.kind==='revenue'?'RISCO':'ATENÇÃO'}</span>
    </div>`;
  }
  function opportunityHtml(o){
    return `<div class="ops-opp"><div class="ops-opp-title"><span>${escapeHtml(shortHotel(o.hotel))} · ${escapeHtml(o.title)}</span><span class="ops-opp-value">${escapeHtml(o.value||'')}</span></div><div class="ops-opp-sub">${escapeHtml(o.sub||'')}</div></div>`;
  }

  function actionWatchHtml(a){
    const sm=window.VG?.actions?.statusMeta?.(a.status)||{label:a.status||'Por iniciar',cls:'open'};
    const overdue=window.VG?.actions?.isOverdue?.(a);
    const due=a.dueDate?new Date(a.dueDate+'T12:00:00').toLocaleDateString('pt-PT'):'Sem prazo';
    return `<button class="ops-action-watch-row ${overdue?'overdue':''}" onclick="VG.actions.openById('${escapeHtml(a.id)}')"><span><strong>${escapeHtml(shortHotel(a.hotel))}</strong><small>${escapeHtml(a.ownerName||'Sem responsável')}</small></span><span><em class="ops-action-status ${escapeHtml(sm.cls)}">${escapeHtml(sm.label)}</em><small class="${overdue?'ops-action-due-over':''}">${escapeHtml(due)}</small></span></button>`;
  }

  function render(){
    const root=document.getElementById('opsCenter'); if(!root || !RAW) return;
    try{ window.VG?.actions?.ensureLoaded?.(false); }catch(e){}
    const m=buildModel();
    const stats=document.getElementById('opsStats');
    if(stats) stats.innerHTML=[
      statHtml('Críticos',String(m.critical),m.critical?'hotéis que exigem decisão':'sem situações críticas','critical'),
      statHtml('Atenção',String(m.attention),m.attention?'hotéis a acompanhar':'sem alertas moderados','warning'),
      statHtml('Oportunidades',String(m.opportunities.length),'ganhos/práticas a proteger','positive'),
      statHtml('Receita em risco',m.ri.available?fmtMoney(m.totalRisk):'—',m.ri.available?(m.ri.label||'Revenue Intelligence'):'sem snapshots de ocupação','risk'),
      statHtml('Anomalias',String((m.anomaly?.critical||0)+(m.anomaly?.attention||0)),m.anomaly?.available?'sinais fora do padrão':'sem sinais materiais','health')
    ].join('');

    const ast=document.getElementById('opsActionStats');
    if(ast){
      const a=m.actionStats||{};
      ast.innerHTML=[
        statHtml('Ações abertas',String(a.open||0),'ações ainda por concluir','action-open'),
        statHtml('Sem responsável',String(a.unassigned||0),a.unassigned?'exigem atribuição':'todas atribuídas','action-unassigned'),
        statHtml('Fora do prazo',String(a.overdue||0),a.overdue?'intervenção necessária':'sem atrasos','action-overdue'),
        statHtml('Em curso',String(a.progress||0),'ações em execução','action-progress'),
        statHtml('Resolvidas · 7 dias',String(a.resolvedWeek||0),'fechos recentes','action-resolved')
      ].join('');
    }

    const meta=document.getElementById('opsMeta');
    if(meta) meta.textContent=`${m.hotels.length} hotéis · ${m.period} · ${m.year}${m.ri.available&&m.ri.label?' · RI: '+m.ri.label:''}`;

    const plist=document.getElementById('opsPriorities');
    if(plist) plist.innerHTML=m.priorities.length ? m.priorities.map(priorityHtml).join('') : `<div class="ops-good-banner">✓ Não existem prioridades críticas detetadas pelos critérios atuais.</div><div class="ops-empty">Mantém a monitorização dos KPIs e do Revenue Intelligence. A ausência de alertas não substitui a validação operacional.</div>`;
    const pmeta=document.getElementById('opsPriorityMeta'); if(pmeta) pmeta.textContent=m.priorities.length?`${m.priorities.length} prioridades ordenadas por impacto`:'Sem prioridades críticas';

    const opp=document.getElementById('opsOpportunities');
    if(opp) opp.innerHTML=m.opportunities.length ? m.opportunities.map(opportunityHtml).join('') : `<div class="ops-empty">Sem oportunidades materiais detetadas pelos critérios atuais.</div>`;

    const aw=document.getElementById('opsActionWatch');
    if(aw) aw.innerHTML=m.actionWatch?.length?m.actionWatch.map(actionWatchHtml).join(''):`<div class="ops-empty">Sem ações abertas para os hotéis selecionados.</div>`;

    const h=document.getElementById('opsHealth');
    if(h){
      const loadedMonths=Object.keys(typeof STORE!=='undefined'?STORE:{}).map(Number).filter(Boolean).sort((a,b)=>a-b);
      const latest=loadedMonths.length?(window.VG?.util?.monthName?.(loadedMonths[loadedMonths.length-1])||loadedMonths[loadedMonths.length-1]):'—';
      const redIssues=m.data.all.filter(i=>i.severity==='red').length;
      h.innerHTML=`<div class="ops-health-row"><span>Hotéis no filtro</span><strong>${m.hotels.length}</strong></div>
        <div class="ops-health-row"><span>Sem alerta operacional</span><strong>${m.healthy}</strong></div>
        <div class="ops-health-row"><span>P&L mais recente carregado</span><strong>${escapeHtml(latest)}</strong></div>
        <div class="ops-health-row"><span>Erros críticos de dados</span><strong>${redIssues}</strong></div>
        <div class="ops-health-row"><span>Anomalias materiais</span><strong>${(m.anomaly?.critical||0)+(m.anomaly?.attention||0)}</strong></div>
        <div class="ops-health-row"><span>Snapshots Revenue</span><strong>${m.ri.available?'Ativo':'Sem dados'}</strong></div>`;
    }
    window.VG = window.VG || {}; window.VG.operations=window.VG.operations||{}; window.VG.operations.lastModel=m;
  }

  window.opsCenterRender=render;
  window.opsBuildModel=buildModel;
  window.opsManagePriorityAction=function(i){
    const p=window.VG?.operations?.lastModel?.priorities?.[Number(i)];
    if(p) window.VG?.actions?.openForPriority?.(p);
  };
  window.opsGoTo=function(view){ if(typeof setView==='function') setView(view); };
  window.opsOpenHotel=function(hotel){
    if(!hotel || hotel==='Portefólio'){ if(typeof setView==='function') setView('alertas'); return; }
    if(typeof setView==='function') setView('fichahotel');
    setTimeout(()=>{
      try{
        if(typeof hsEnsureSelectors==='function') hsEnsureSelectors();
        const el=document.getElementById('hsHotel'); if(el){ el.value=hotel; if(typeof hsRender==='function') hsRender(); }
      }catch(e){ console.warn('Abrir Comentários Fecho do Mês',e); }
    },30);
  };

  window.VG=window.VG||{}; window.VG.operations=window.VG.operations||{}; window.VG.operations.buildModel=buildModel; window.VG.operations.render=render;
  window.VG.events?.on('state:changed',()=>{
    if(typeof currentView!=='undefined' && currentView==='resumo'){
      clearTimeout(window.VG.operations._timer); window.VG.operations._timer=setTimeout(render,20);
    }
  });
  window.VG.events?.on('actions:changed',()=>{
    if(typeof currentView!=='undefined' && currentView==='resumo'){
      clearTimeout(window.VG.operations._actionTimer); window.VG.operations._actionTimer=setTimeout(render,20);
    }
  });
})();
