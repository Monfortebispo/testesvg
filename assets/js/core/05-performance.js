// ==========================================================
// VG DASHBOARD v18 — PERFORMANCE RUNTIME
// Arranque progressivo, XLSX lazy, métricas e lifecycle de gráficos.
// ==========================================================
(function(){
  'use strict';
  window.VG=window.VG||{};
  if(window.VG.performance?.version>=18) return;

  const marks=new Map();
  const timers=new Map();
  let xlsxPromise=null;
  const now=()=>window.performance?.now?.() ?? Date.now();
  const idle=(fn,opts={})=>{
    const timeout=Number(opts.timeout||1200);
    if(typeof requestIdleCallback==='function') return requestIdleCallback(fn,{timeout});
    return setTimeout(()=>fn({didTimeout:true,timeRemaining:()=>0}),Math.min(timeout,80));
  };
  const cancelIdle=id=>{ if(typeof cancelIdleCallback==='function') cancelIdleCallback(id); else clearTimeout(id); };
  const afterFirstPaint=fn=>requestAnimationFrame(()=>requestAnimationFrame(()=>idle(fn,{timeout:1200})));
  const mark=name=>{marks.set(name,now());return marks.get(name);};
  const measure=(from,to)=>{
    const a=marks.get(from),b=marks.get(to)||now();
    return a==null?null:Math.max(0,b-a);
  };
  function schedule(key,fn,delay=40){
    if(timers.has(key)) clearTimeout(timers.get(key));
    const id=setTimeout(()=>{timers.delete(key);fn();},delay);
    timers.set(key,id);return id;
  }
  function loadScript(src,id){
    if(id&&document.getElementById(id)) return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      if(id)s.id=id;s.src=src;s.async=true;
      s.onload=()=>resolve();s.onerror=()=>reject(new Error('Não foi possível carregar '+src));
      document.head.appendChild(s);
    });
  }
  async function ensureXLSX(){
    if(window.XLSX?.utils) return window.XLSX;
    if(xlsxPromise) return xlsxPromise;
    mark('xlsx:start');
    xlsxPromise=loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js','vg-xlsx-lazy')
      .then(()=>{if(!window.XLSX?.utils)throw new Error('Biblioteca XLSX indisponível.');mark('xlsx:end');return window.XLSX;})
      .catch(err=>{xlsxPromise=null;throw err;});
    return xlsxPromise;
  }
  function resizeVisibleCharts(){
    let count=0;
    try{
      const active=document.querySelector('.tab-content.active');
      Object.values(window.charts||{}).forEach(ch=>{
        const canvas=ch?.canvas;
        if(!ch?.resize||!canvas||!canvas.isConnected)return;
        const view=canvas.closest?.('.tab-content');
        if(active && view && view!==active)return;
        try{ch.resize();count++;}catch(e){}
      });
      // Instâncias mantidas por módulos fora de window.charts continuam responsivas via Chart.js.
    }catch(e){}
    return count;
  }
  function report(){
    return {
      version:18,
      domReady:measure('boot','dom-ready'),
      load:measure('boot','window-load'),
      xlsxLoad:measure('xlsx:start','xlsx:end'),
      xlsxLoaded:!!window.XLSX?.utils,
      marks:Object.fromEntries(marks)
    };
  }
  mark('boot');
  document.addEventListener('DOMContentLoaded',()=>mark('dom-ready'),{once:true});
  window.addEventListener('load',()=>mark('window-load'),{once:true});

  window.VG.performance={version:18,idle,cancelIdle,afterFirstPaint,mark,measure,schedule,ensureXLSX,resizeVisibleCharts,report};
  window.vgPerfReport=report;
})();
