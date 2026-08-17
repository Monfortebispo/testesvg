// ==========================================================
// VG OPERATIONS v32 — COERÊNCIA DE VERSÃO / PWA
// Garante que o HTML atual não corre com JS/CSS de um shell antigo.
// Este ficheiro tem nome versionado de propósito: um SW antigo não o
// consegue servir da cache e é obrigado a ir buscá-lo à rede.
// ==========================================================
(function(){
  'use strict';
  const BUILD='32.9'; // identificador de compatibilidade do guard legado
  const PLATFORM_BUILD='35.6';
  const SW_URL='/service-worker.js?vg='+encodeURIComponent(PLATFORM_BUILD);
  window.__VG_APP_BUILD__=PLATFORM_BUILD;
  window.__VG_SW_URL__=SW_URL;

  function swBuild(controller){
    try{return new URL(controller?.scriptURL||'',location.href).searchParams.get('vg')||'';}catch(e){return '';}
  }
  function addUpdatingScreen(){
    if(document.getElementById('vgBuildGuardStyle'))return;
    const s=document.createElement('style');s.id='vgBuildGuardStyle';
    s.textContent=`html.vg-build-updating body{visibility:hidden!important}html.vg-build-updating:after{content:'A atualizar VG Operations…';position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:#fff7f7;color:#7d100b;font:700 15px Arial,sans-serif;letter-spacing:.1px}`;
    (document.head||document.documentElement).appendChild(s);
    document.documentElement.classList.add('vg-build-updating');
  }
  function clearUpdatingScreen(){document.documentElement.classList.remove('vg-build-updating');}
  function reloadOnce(){
    try{
      const key='vg_build_reloaded_'+PLATFORM_BUILD;
      if(sessionStorage.getItem(key)==='1'){clearUpdatingScreen();return;}
      sessionStorage.setItem(key,'1');
    }catch(e){}
    location.reload();
  }

  if(!('serviceWorker' in navigator)||!/^https?:$/.test(location.protocol))return;
  const controlled=navigator.serviceWorker.controller;
  const oldController=!!controlled && swBuild(controlled)!==PLATFORM_BUILD;
  if(oldController)addUpdatingScreen();

  let controllerTimer=null;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    clearTimeout(controllerTimer);
    controllerTimer=setTimeout(()=>{
      if(swBuild(navigator.serviceWorker.controller)===PLATFORM_BUILD)reloadOnce();
    },40);
  });

  navigator.serviceWorker.register(SW_URL,{scope:'/',updateViaCache:'none'}).then(reg=>{
    try{reg.update();}catch(e){}
    if(reg.waiting)try{reg.waiting.postMessage({type:'SKIP_WAITING'});}catch(e){}
    if(swBuild(navigator.serviceWorker.controller)===PLATFORM_BUILD)clearUpdatingScreen();
    // Nunca deixar um ecrã de atualização bloqueado indefinidamente.
    if(oldController)setTimeout(clearUpdatingScreen,12000);
  }).catch(err=>{
    console.warn('[VG build guard] atualização PWA não disponível',err);
    clearUpdatingScreen();
  });

  // Diagnóstico legível em vez de um placeholder infinito se um módulo falhar.
  window.addEventListener('load',()=>setTimeout(()=>{
    const checks=[
      ['documentsRoot','Gestão de Documentos',()=>typeof window.documentManagementRender==='function'],
      ['approvalsRoot','Workflow de Aprovações',()=>typeof window.approvalsRender==='function'],
      ['scenarioComparisonRoot','Comparação de Cenários',()=>typeof window.scenarioComparisonRender==='function'],
      ['hotel360Root','Hotel 360º',()=>typeof window.hotel360Render==='function'],
      ['revenueHubRoot','Revenue & Forecast',()=>!!window.VG?.revenueHub],
      ['abHubRoot','Compras & A&B',()=>!!window.VG?.domains33],
      ['housekeepingRoot','Housekeeping & Têxtil',()=>!!window.VG?.domains33],
      ['receitasDetalheRoot','Receita Detalhada',()=>!!window.VG?.domains33]
    ];
    for(const [id,label,ok] of checks){
      const root=document.getElementById(id);if(!root||ok())continue;
      root.innerHTML=`<div style="padding:28px;border:1px dashed #d9b2b0;border-radius:12px;text-align:center"><strong>${label} não carregou corretamente.</strong><div style="margin-top:8px;font-size:12px;opacity:.72">A aplicação detetou uma versão incompleta ou um ficheiro em falta.</div><button type="button" onclick="location.reload()" style="margin-top:14px;padding:8px 14px;border:1px solid #b42318;border-radius:8px;background:#fff;color:#8b1b13;font-weight:700;cursor:pointer">Recarregar aplicação</button></div>`;
    }
  },2500),{once:true});
})();
