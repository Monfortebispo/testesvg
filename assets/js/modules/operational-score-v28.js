// ==========================================================
// VG OPERATIONS 2.0 / V30 — SCORE OPERACIONAL (V28 integrado)
// Score explicável. Reutiliza Hotel Performance / Benchmarking.
// Pesos partilhados em settings-score-v30; sem fórmulas financeiras paralelas.
// ==========================================================
(function(){
  'use strict';
  window.VG=window.VG||{};
  if(window.VG.operationalScore?.version>=30)return;

  const DEFAULT_WEIGHTS={financial:25,revenue:20,efficiency:15,reputation:15,execution:15,data:10};
  const LABELS={financial:'Financeiro',revenue:'Revenue',efficiency:'Eficiência',reputation:'Reputação',execution:'Execução',data:'Dados'};
  let config={weights:{...DEFAULT_WEIGHTS},updatedAt:null};
  let loaded=false,loading=null;
  const n=v=>{const x=Number(v);return Number.isFinite(x)?x:null;};
  const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,Number(v)||0));
  const round=v=>Math.round(clamp(v));
  const norm=v=>String(v||'').trim().toUpperCase();
  const user=()=>{try{return typeof window.vgAuthCurrent==='function'?window.vgAuthCurrent():null;}catch(e){return null;}};
  const direction=()=>{const u=user();return !!u&&['direcao','admin'].includes(u.role);};

  function normalizeWeights(input){
    const src=input&&typeof input==='object'?input:{};let sum=0,out={};
    for(const k of Object.keys(DEFAULT_WEIGHTS)){const v=n(src[k]);out[k]=v!=null&&v>=0?v:DEFAULT_WEIGHTS[k];sum+=out[k];}
    if(sum<=0)return {...DEFAULT_WEIGHTS};
    for(const k of Object.keys(out))out[k]=out[k]/sum*100;
    return out;
  }
  async function ensureConfig(force=false){
    if(loaded&&!force)return config;if(loading)return loading;
    loading=(async()=>{try{const r=await window.VG?.shared?.get?.('settings','score-v30');const d=r?.data;if(d?.weights)config={...d,weights:normalizeWeights(d.weights)};}catch(e){console.warn('Score config',e);}loaded=true;return config;})().finally(()=>loading=null);return loading;
  }
  async function saveWeights(weights){
    if(!direction())throw new Error('A configuração do Score está reservada à Direção.');
    const payload={version:30,weights:normalizeWeights(weights),updatedAt:new Date().toISOString()};
    const r=await window.VG?.shared?.post?.('settings','score-v30',payload);config=payload;loaded=true;window.VG?.events?.emit?.('score-config:changed',config);return r;
  }
  function targetValue(k){return n(k?.target?.value);}
  function against(value,target,higher=true,region=null){
    const v=n(value),t=n(target),r=n(region);if(v==null)return null;
    const base=t!=null?t:r;if(base==null)return 70;
    const scale=Math.max(Math.abs(base)*0.15, higher?3:2);
    const delta=higher?(v-base):(base-v);
    return clamp(70+delta/scale*20);
  }
  function kpi(model,id){return model?.kpis?.find?.(x=>x.id===id)||null;}
  function mean(arr,fallback=70){const a=arr.filter(x=>n(x)!=null).map(Number);return a.length?a.reduce((s,x)=>s+x,0)/a.length:fallback;}

  function dimensionScores(model){
    if(!model?.available)return null;
    const rev=kpi(model,'revenue'),gop=kpi(model,'gopMargin'),occ=kpi(model,'occupancy'),adr=kpi(model,'adr'),revpar=kpi(model,'revpar'),cost=kpi(model,'costRatio'),pers=kpi(model,'personnelRatio');
    const financial=mean([
      against(rev?.delta,targetValue(rev),true,rev?.region),
      against(gop?.value,targetValue(gop),true,gop?.region)
    ]);
    const revenueParts=[against(occ?.value,targetValue(occ),true,occ?.region),against(adr?.value,targetValue(adr),true,adr?.region),against(revpar?.value,targetValue(revpar),true,revpar?.region)];
    if(model.forecast?.available&&n(model.forecast.gap)!=null)revenueParts.push(clamp(70+n(model.forecast.gap)*3));
    const revenue=mean(revenueParts);
    const efficiency=mean([against(cost?.value,targetValue(cost),false,cost?.region),against(pers?.value,targetValue(pers),false,pers?.region)]);
    let reputation=70;if(model.reputation){const gri=n(model.reputation.gri),resp=n(model.reputation.response);reputation=mean([gri==null?null:clamp((gri-60)*2.5),resp==null?null:clamp(resp)],70);}
    const a=model.actionInfo||{active:[],overdue:[]};
    let execution=100-(a.overdue?.length||0)*18-Math.max(0,(a.active?.length||0)-(a.overdue?.length||0))*4;
    try{const pend=(window.VG?.approvals?.all?.()||[]).filter(x=>norm(x.hotel)===norm(model.hotel)&&x.status==='pending').length;execution-=pend*4;}catch(e){}
    execution=clamp(execution);
    const q=model.quality||{critical:0,attention:0};const data=clamp(100-(q.critical||0)*30-(q.attention||0)*7);
    return {financial:round(financial),revenue:round(revenue),efficiency:round(efficiency),reputation:round(reputation),execution:round(execution),data:round(data)};
  }
  function calculate(model){
    const dims=dimensionScores(model);if(!dims)return {available:false};
    const w=normalizeWeights(config.weights);let total=0;for(const k of Object.keys(w))total+=dims[k]*(w[k]/100);
    const score=round(total);const status=score<60?'critical':score<75?'attention':score<88?'good':'excellent';
    const statusLabel={critical:'Crítico',attention:'Atenção',good:'Bom',excellent:'Muito bom'}[status];
    const ranked=Object.entries(dims).map(([id,value])=>({id,label:LABELS[id],value,weight:w[id]})).sort((a,b)=>a.value-b.value);
    return {available:true,score,status,statusLabel,dimensions:dims,weights:w,weakest:ranked[0],strongest:ranked[ranked.length-1],updatedAt:config.updatedAt};
  }
  function explain(model){const x=calculate(model);if(!x.available)return [];return Object.keys(x.dimensions).map(id=>({id,label:LABELS[id],score:x.dimensions[id],weight:x.weights[id],contribution:x.dimensions[id]*x.weights[id]/100}));}
  function badge(model){const x=calculate(model);if(!x.available)return null;return {score:x.score,label:x.statusLabel,status:x.status};}

  window.VG.operationalScore={version:31,DEFAULT_WEIGHTS,LABELS,ensureConfig,saveWeights,getConfig:()=>({...config,weights:{...config.weights}}),normalizeWeights,dimensionScores,calculate,explain,badge};
  window.VG?.events?.on?.('market:before-change',()=>{loaded=false;loading=null;config={weights:{...DEFAULT_WEIGHTS},updatedAt:null};});
  window.VG?.events?.on?.('market:changed',()=>ensureConfig(true).then(()=>window.VG?.events?.emit?.('score-config:ready',config)));
  setTimeout(()=>ensureConfig(false).then(()=>window.VG?.events?.emit?.('score-config:ready',config)),900);
})();
