// ==========================================================
// VG DASHBOARD v9 — METAS & REGRAS CONFIGURÁVEIS
// Fonte partilhada: Netlify Blobs / resource=targets-rules
// ==========================================================
(function(){
  'use strict';

  const RESOURCE='targets-rules';
  const MONTHS=['Acumulado / período','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const RULE_DEFS=[
    {id:'gop_neg',label:'GOP com sede mínimo absoluto',unit:'€',defaultValue:0,defaultSeverity:'red',direction:'min',help:'Alerta quando o GOP com sede fica abaixo deste valor absoluto.'},
    {id:'gop_low',label:'GOP com sede mínimo',unit:'%',defaultValue:20,defaultSeverity:'red',direction:'min',help:'Alerta quando a margem GOP fica abaixo deste valor.'},
    {id:'occ_low',label:'Ocupação mínima',unit:'%',defaultValue:40,defaultSeverity:'orange',direction:'min',help:'Alerta quando a ocupação fica abaixo deste valor.'},
    {id:'occ_drop',label:'Queda máxima de ocupação vs LY',unit:'pp',defaultValue:10,defaultSeverity:'orange',direction:'drop',help:'Alerta quando a ocupação cai mais do que este número de pontos percentuais.'},
    {id:'labour_hi',label:'Pessoal máximo / Receita',unit:'%',defaultValue:40,defaultSeverity:'red',direction:'max',help:'Alerta quando Pessoal ultrapassa esta percentagem da receita.'},
    {id:'energy_hi',label:'Energia máxima / Receita',unit:'%',defaultValue:8,defaultSeverity:'orange',direction:'max',help:'Alerta quando Energia ultrapassa esta percentagem da receita.'},
    {id:'maint_hi',label:'Manutenção máxima / Receita',unit:'%',defaultValue:8,defaultSeverity:'orange',direction:'max',help:'Alerta quando Manutenção ultrapassa esta percentagem da receita.'},
    {id:'rev_drop',label:'Queda máxima de Receita vs LY',unit:'%',defaultValue:10,defaultSeverity:'red',direction:'drop',help:'Alerta quando a receita cai mais do que este valor face ao ano anterior.'},
    {id:'adr_drop',label:'Queda máxima de ADR vs LY',unit:'%',defaultValue:5,defaultSeverity:'orange',direction:'drop',help:'Alerta quando o ADR cai mais do que este valor face ao ano anterior.'},
    {id:'ri_occ_delta',label:'Objetivo RI: acréscimo sobre LY',unit:'pp',defaultValue:2,defaultSeverity:'orange',direction:'target',help:'Fallback do Revenue Intelligence quando não existe uma meta explícita de ocupação.'}
  ];
  const TARGET_DEFS=[
    {id:'occupancy',label:'Ocupação',unit:'%'},
    {id:'gopPct',label:'GOP com sede',unit:'%'},
    {id:'revenueGrowthPct',label:'Receita vs ano anterior',unit:'%'},
    {id:'adrGrowthPct',label:'ADR vs ano anterior',unit:'%'}
  ];

  function clone(x){ return JSON.parse(JSON.stringify(x)); }
  function defaults(){
    const rules={};
    RULE_DEFS.forEach(d=>rules[d.id]={enabled:true,value:d.defaultValue,severity:d.defaultSeverity});
    return {version:1,rules,targets:{},updatedAt:null,updatedBy:null};
  }
  let config=defaults();
  let loaded=false;
  let loading=null;

  function finite(v){ const n=Number(v); return Number.isFinite(n)?n:null; }
  function cleanSeverity(v, fallback){ return ['red','orange'].includes(v)?v:fallback; }
  function normalize(raw){
    const out=defaults();
    if(raw&&typeof raw==='object'){
      out.version=Number(raw.version)||1;
      RULE_DEFS.forEach(d=>{
        const r=raw.rules?.[d.id];
        if(r&&typeof r==='object'){
          const n=finite(r.value);
          out.rules[d.id]={enabled:r.enabled!==false,value:n==null?d.defaultValue:n,severity:cleanSeverity(r.severity,d.defaultSeverity)};
        }
      });
      if(raw.targets&&typeof raw.targets==='object'&&!Array.isArray(raw.targets)) out.targets=clone(raw.targets);
      out.updatedAt=raw.updatedAt||null; out.updatedBy=raw.updatedBy||null;
    }
    return out;
  }
  function selectedMonth(){
    try{
      const ms=window.VG?.state?.selectedMonths?.() || (typeof selectedMeses!=='undefined'?[...selectedMeses]:[]);
      const arr=[...ms].map(Number).filter(m=>m>=1&&m<=12);
      return arr.length===1?arr[0]:0;
    }catch(e){ return 0; }
  }
  function currentYear(){ try{return String(YR_CUR);}catch(e){return String(new Date().getFullYear());} }
  function targetBucket(hotel,year,month,create){
    hotel=String(hotel||'').trim(); year=String(year||currentYear()); month=String(Number(month)||0);
    if(!hotel)return null;
    if(create){
      config.targets[hotel] ||= {};
      config.targets[hotel][year] ||= {};
      config.targets[hotel][year][month] ||= {};
      return config.targets[hotel][year][month];
    }
    return config.targets?.[hotel]?.[year]?.[month] || null;
  }
  function getTarget(hotel,metric,month,year){
    month=month===undefined?selectedMonth():Number(month)||0;
    year=year===undefined?currentYear():String(year);
    const row=targetBucket(hotel,year,month,false);
    const v=finite(row?.[metric]);
    return v;
  }
  function periodTarget(hotel,metric){ return getTarget(hotel,metric,selectedMonth(),currentYear()); }
  function rule(id,fallback){
    const def=RULE_DEFS.find(x=>x.id===id);
    const r=config.rules?.[id];
    if(!r || r.enabled===false) return {enabled:false,value:fallback??def?.defaultValue??null,severity:r?.severity||def?.defaultSeverity||'orange'};
    const n=finite(r.value);
    return {enabled:true,value:n==null?(fallback??def?.defaultValue??null):n,severity:cleanSeverity(r.severity,def?.defaultSeverity||'orange')};
  }
  function ruleValue(id,fallback){ const r=rule(id,fallback); return r.enabled?r.value:null; }
  function effectiveThreshold(ruleId,hotel,metric){
    const goal=metric?periodTarget(hotel,metric):null;
    if(goal!=null)return goal;
    return ruleValue(ruleId);
  }
  async function loadConfig(force){
    if(loading && !force)return loading;
    if(loaded && !force)return config;
    loading=(async()=>{
      try{
        const getter=window.VG?.shared?.get || (typeof sharedGet==='function'?sharedGet:null);
        if(!getter) return config;
        const res=await getter(RESOURCE);
        const raw=res?.data ?? null;
        config=normalize(raw);
        loaded=true;
        window.VG?.events?.emit?.('targets-rules:loaded',{config:clone(config)});
      }catch(e){
        if(e?.status===401 && typeof window.vgAuthHandleUnauthorized==='function') window.vgAuthHandleUnauthorized();
        console.warn('Metas & Regras — não foi possível carregar',e);
      }finally{ loading=null; }
      return config;
    })();
    return loading;
  }
  async function saveConfig(next){
    const user=typeof window.vgAuthCurrent==='function'?window.vgAuthCurrent():null;
    if(!user || !['direcao','admin'].includes(user.role)) throw new Error('Só a Direção pode alterar Metas & Regras.');
    const poster=window.VG?.shared?.post || (typeof sharedPost==='function'?sharedPost:null);
    if(!poster) throw new Error('Armazenamento partilhado indisponível.');
    const clean=normalize(next||config);
    clean.updatedAt=new Date().toISOString();
    clean.updatedBy={user:user.user,name:user.name};
    await poster(RESOURCE,null,clean);
    config=clean; loaded=true;
    try{ if(typeof audit==='function') audit('Metas & Regras','*','Configuração partilhada atualizada'); }catch(e){}
    window.VG?.events?.emit?.('targets-rules:changed',{config:clone(config)});
    try{ if(typeof renderAll==='function') renderAll(); }catch(e){}
    try{ if(typeof riRenderAll==='function') riRenderAll(); }catch(e){}
    return config;
  }

  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function setupAvailable(){return !!document.getElementById('vgTargetsRulesEditor');}
  function hotelOptions(){
    let arr=[];
    try{arr=(RAW?.hotel_list||[]).slice();}catch(e){}
    if(!arr.length){try{arr=Object.values(REGIOES||{}).flat();}catch(e){}}
    return [...new Set(arr)].sort((a,b)=>String(a).localeCompare(String(b),'pt'));
  }
  function renderRules(){
    const host=document.getElementById('vgRulesGrid'); if(!host)return;
    host.innerHTML=RULE_DEFS.map(d=>{
      const r=rule(d.id,d.defaultValue);
      return `<div class="vg-rule-card" data-rule="${d.id}">
        <div class="vg-rule-head"><label><input type="checkbox" data-rule-enabled="${d.id}" ${r.enabled?'checked':''}/> ${esc(d.label)}</label><select data-rule-severity="${d.id}"><option value="red" ${r.severity==='red'?'selected':''}>Crítico</option><option value="orange" ${r.severity==='orange'?'selected':''}>Atenção</option></select></div>
        <div class="vg-rule-value"><input type="number" step="0.1" data-rule-value="${d.id}" value="${r.value??''}"/><span>${esc(d.id==='gop_neg'?(window.VG?.market?.symbol?.()||d.unit):d.unit)}</span></div>
        <div class="vg-rule-help">${esc(d.help)}</div>
      </div>`;
    }).join('');
  }
  function renderTargetControls(){
    const hs=document.getElementById('vgTargetHotel'); if(hs){const cur=hs.value;hs.innerHTML='<option value="">Selecionar hotel…</option>'+hotelOptions().map(h=>`<option value="${esc(h)}">${esc(h)}</option>`).join('');if([...hs.options||[]].some?.(o=>o.value===cur))hs.value=cur;}
    const ys=document.getElementById('vgTargetYear'); if(ys){const y=Number(currentYear());const cur=ys.value;ys.innerHTML=[y-1,y,y+1,y+2].map(v=>`<option value="${v}">${v}</option>`).join('');ys.value=cur||String(y);}
    const ms=document.getElementById('vgTargetMonth'); if(ms && !ms.options.length){ms.innerHTML=MONTHS.map((m,i)=>`<option value="${i}">${m}</option>`).join('');}
    readTargetIntoForm(); renderTargetsTable();
  }
  function readTargetIntoForm(){
    const hotel=document.getElementById('vgTargetHotel')?.value||'';
    const year=document.getElementById('vgTargetYear')?.value||currentYear();
    const month=Number(document.getElementById('vgTargetMonth')?.value||0);
    const row=targetBucket(hotel,year,month,false)||{};
    TARGET_DEFS.forEach(d=>{const el=document.querySelector(`[data-target-field="${d.id}"]`);if(el)el.value=row[d.id]??'';});
  }
  function allTargets(){
    const rows=[];
    for(const [hotel,years] of Object.entries(config.targets||{})) for(const [year,months] of Object.entries(years||{})) for(const [month,vals] of Object.entries(months||{})){
      if(!vals||typeof vals!=='object')continue;
      const has=TARGET_DEFS.some(d=>finite(vals[d.id])!=null); if(!has)continue;
      rows.push({hotel,year,month:Number(month),...vals});
    }
    return rows.sort((a,b)=>a.hotel.localeCompare(b.hotel,'pt')||Number(a.year)-Number(b.year)||a.month-b.month);
  }
  function renderTargetsTable(){
    const body=document.getElementById('vgTargetsTable'); if(!body)return;
    const rows=allTargets();
    body.innerHTML=rows.length?rows.map(r=>`<tr><td>${esc(r.hotel)}</td><td>${esc(r.year)}</td><td>${esc(MONTHS[r.month]||r.month)}</td>${TARGET_DEFS.map(d=>`<td>${finite(r[d.id])==null?'—':Number(r[d.id]).toLocaleString('pt-PT',{maximumFractionDigits:1})+d.unit}</td>`).join('')}<td><button class="vg-auth-smallbtn" type="button" data-target-edit="${esc(r.hotel)}|${esc(r.year)}|${r.month}">Editar</button></td></tr>`).join(''):'<tr><td colspan="8" style="color:var(--text-3);padding:12px">Ainda não existem metas específicas. As regras globais continuam ativas.</td></tr>';
    body.querySelectorAll('[data-target-edit]').forEach(btn=>btn.onclick=()=>{const [hotel,year,month]=btn.getAttribute('data-target-edit').split('|');document.getElementById('vgTargetHotel').value=hotel;document.getElementById('vgTargetYear').value=year;document.getElementById('vgTargetMonth').value=month;readTargetIntoForm();});
  }
  function collectRulesFromForm(){
    const next=clone(config);
    RULE_DEFS.forEach(d=>{
      const enabled=document.querySelector(`[data-rule-enabled="${d.id}"]`)?.checked!==false;
      const value=finite(document.querySelector(`[data-rule-value="${d.id}"]`)?.value);
      const severity=document.querySelector(`[data-rule-severity="${d.id}"]`)?.value||d.defaultSeverity;
      next.rules[d.id]={enabled,value:value==null?d.defaultValue:value,severity:cleanSeverity(severity,d.defaultSeverity)};
    });
    return next;
  }
  async function saveRulesFromForm(){
    const msg=document.getElementById('vgRulesMsg'); if(msg)msg.textContent='A guardar…';
    try{await saveConfig(collectRulesFromForm());if(msg)msg.textContent='✓ Regras partilhadas atualizadas.';renderRules();}
    catch(e){if(msg)msg.textContent='⚠ '+(e.message||'Não foi possível guardar.');}
  }
  async function resetRules(){
    if(!confirm('Repor apenas as regras globais para os valores por defeito? As metas por hotel serão mantidas.'))return;
    const next=clone(config); next.rules=defaults().rules;
    await saveConfig(next);renderRules();const msg=document.getElementById('vgRulesMsg');if(msg)msg.textContent='↺ Regras globais repostas.';
  }
  async function saveTargetFromForm(){
    const hotel=document.getElementById('vgTargetHotel')?.value||''; const year=document.getElementById('vgTargetYear')?.value||currentYear(); const month=Number(document.getElementById('vgTargetMonth')?.value||0);
    const msg=document.getElementById('vgTargetsMsg'); if(!hotel){if(msg)msg.textContent='⚠ Seleciona um hotel.';return;}
    const next=clone(config); const old=config; config=next; const row=targetBucket(hotel,year,month,true); config=old;
    let count=0; TARGET_DEFS.forEach(d=>{const v=finite(document.querySelector(`[data-target-field="${d.id}"]`)?.value);if(v==null)delete row[d.id];else{row[d.id]=v;count++;}});
    if(!count){if(msg)msg.textContent='⚠ Preenche pelo menos uma meta.';return;}
    if(row.occupancy!=null && (row.occupancy<0||row.occupancy>100)){if(msg)msg.textContent='⚠ A ocupação deve ficar entre 0% e 100%.';return;}
    if(msg)msg.textContent='A guardar…';
    try{await saveConfig(next);if(msg)msg.textContent='✓ Meta guardada e partilhada.';renderTargetsTable();}
    catch(e){if(msg)msg.textContent='⚠ '+(e.message||'Não foi possível guardar.');}
  }
  async function deleteTargetFromForm(){
    const hotel=document.getElementById('vgTargetHotel')?.value||''; const year=document.getElementById('vgTargetYear')?.value||currentYear(); const month=String(Number(document.getElementById('vgTargetMonth')?.value||0));
    if(!hotel)return;
    const next=clone(config); if(next.targets?.[hotel]?.[year]){delete next.targets[hotel][year][month];if(!Object.keys(next.targets[hotel][year]).length)delete next.targets[hotel][year];if(!Object.keys(next.targets[hotel]).length)delete next.targets[hotel];}
    await saveConfig(next);readTargetIntoForm();renderTargetsTable();const msg=document.getElementById('vgTargetsMsg');if(msg)msg.textContent='Meta eliminada.';
  }
  async function renderSetup(force){
    if(!setupAvailable())return;
    if(force||!loaded)await loadConfig(!!force);
    renderRules();renderTargetControls();
    const meta=document.getElementById('vgTargetsRulesMeta');
    if(meta){const who=config.updatedBy?.name||config.updatedBy?.user||'—';const dt=config.updatedAt?new Date(config.updatedAt).toLocaleString('pt-PT'):'ainda sem alterações';meta.textContent=`Última atualização: ${dt}${config.updatedAt?' · '+who:''}`;}
  }

  window.VG=window.VG||{};
  window.VG.targetsRules={
    load:loadConfig, save:saveConfig, getConfig:()=>clone(config), defaults,
    rule, ruleValue, effectiveThreshold, getTarget, periodTarget, selectedMonth,
    ruleDefs:RULE_DEFS.map(clone), targetDefs:TARGET_DEFS.map(clone), renderSetup
  };
  window.vgRuleValue=ruleValue;
  window.vgRuleConfig=rule;
  window.vgTargetValue=getTarget;
  window.vgTargetForPeriod=periodTarget;
  window.vgTargetsRulesLoad=loadConfig;
  window.vgTargetsRulesRenderSetup=renderSetup;
  window.vgSaveRules=saveRulesFromForm;
  window.vgResetRules=resetRules;
  window.vgSaveTarget=saveTargetFromForm;
  window.vgDeleteTarget=deleteTargetFromForm;
  window.vgTargetFormChanged=readTargetIntoForm;

  window.VG?.events?.on?.('shared:refresh',()=>loadConfig(true));
  window.VG?.events?.on?.('market:changed',()=>{loaded=false;loading=null;loadConfig(true).then(()=>{try{renderSetup(false);}catch(e){}});});
})();
