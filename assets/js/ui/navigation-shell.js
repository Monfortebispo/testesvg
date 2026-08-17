
(function(){
  'use strict';
  if(window.__VG_NAV_SHELL__) return;
  window.__VG_NAV_SHELL__ = true;
  var modules = [
    ['resumo','◆','Visão Executiva','Início'],
    ['hotel360','◉','Hotel 360º','Hotéis'],
    ['hoteis','🏨','Hotéis','Hotéis'],
    ['fichahotel','📝','Comentários Fecho do Mês','Hotéis'],
    ['agenda','📅','Agenda Operacional','Gestão'],
    ['approvals','✓','Aprovações','Gestão'],
    ['receitas','↗','Receitas','Análise'],
    ['custos','↘','Custos','Análise'],
    ['pl','▦','P&L USALI','Análise'],
    ['revenuehub','◈','Revenue & Forecast','Análise'],
    ['compras','▤','Compras & Artigos','Análise'],
    ['benchmark','◎','Benchmarking','Análise'],
    ['anomalies','⚠','Deteção de Anomalias','Análise'],
    ['ocupacao','▥','Ocupação','Análise avançada'],
    ['costanalysis','⌁','Análise de Custos','Análise avançada'],
    ['cua','⚡','Custo / Actividade','Análise avançada'],
    ['compare','⚖','Comparar Hotéis','Análise avançada'],
    ['ranking','🏆','Ranking Composto','Análise avançada'],
    ['sazonalidade','◌','Sazonalidade','Análise avançada'],
    ['simulador','🎛','Simulador','Análise avançada'],
    ['orcamento','▣','Orçamento','Análise avançada'],
    ['reputacao','★','Reputação','Qualidade'],
    ['instagram','▣','Instagram','Qualidade'],
    ['documents','🗂','Gestão de Documentos','Suporte'],
    ['automaticreports','📄','Relatórios Automáticos','Suporte'],
    ['datacenter','▥','Centro de Dados','Governação'],
    ['governance','🛡','Auditoria & Governação','Governação'],
    ['backup','💾','Backup & Recuperação','Governação'],
    ['upload','⇧','Carregar Docs','Admin']
  ];
  var quick = ['resumo','hotel360','fichahotel','revenuehub','compras','agenda'];
  var idx = 0, results = modules.slice();
  function q(s,r){return (r||document).querySelector(s)}
  function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function esc(s){return String(s||'').replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
  function mod(id){for(var i=0;i<modules.length;i++){if(modules[i][0]===id)return modules[i]}return modules[0]}
  function go(id){
    try{
      if(typeof window.setView === 'function') window.setView(id);
      else { var b=q('#nav-'+id); if(b) b.click(); }
      closeCmd();
    }catch(e){console.error('VG navigation error',e)}
  }
  function applyThemeMode(mode){
    document.body.classList.remove('vg-interface-modern','theme-v2');
    if(mode === '2.0') document.body.classList.add('vg-interface-modern');
    if(mode === 'v2') document.body.classList.add('theme-v2');
    try{ localStorage.setItem('vg_theme_mode', mode); }catch(e){}
    try{ if(typeof syncInterfacePicker==='function') syncInterfacePicker(); }catch(e){}
    if(typeof buildChartsResumo === 'function' && currentView === 'resumo' && typeof RAW !== 'undefined' && RAW) buildChartsResumo();
  }
  function interfaceLabel(mode){return mode==='original'?'Original':mode==='v2'?'V2':'2.0'}
  function installInterfacePicker(){
    if(document.getElementById('vgInterfacePicker'))return;const host=document.querySelector('.topbar-right');if(!host)return;
    const st=document.createElement('style');st.textContent='.vg-interface-picker{position:relative;display:flex;align-items:center}.vg-interface-trigger{height:32px;display:flex;align-items:center;gap:6px;padding:0 10px;border-radius:10px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-2);font:800 11px var(--font);cursor:pointer}.vg-interface-trigger strong{color:var(--gold);font-size:10px}.vg-interface-menu{display:none;position:absolute;right:0;top:38px;z-index:1700;width:220px;background:var(--surface-1);border:1px solid var(--border);border-radius:12px;padding:7px;box-shadow:0 18px 44px rgba(15,23,42,.22)}.vg-interface-picker.open .vg-interface-menu{display:block}.vg-interface-option{width:100%;padding:9px 10px;border:0;border-radius:8px;background:transparent;color:var(--text-1);display:flex;align-items:center;justify-content:space-between;gap:8px;font:700 11px var(--font);cursor:pointer;text-align:left}.vg-interface-option small{display:block;color:var(--text-3);font-weight:500;margin-top:3px}.vg-interface-option:hover,.vg-interface-option.active{background:var(--surface-2)}.vg-interface-option b{visibility:hidden;color:var(--teal)}.vg-interface-option.active b{visibility:visible}@media(max-width:1000px){.vg-interface-trigger .txt{display:none}}';document.head.appendChild(st);
    const w=document.createElement('div');w.id='vgInterfacePicker';w.className='vg-interface-picker';w.innerHTML='<button class="vg-interface-trigger" type="button" title="Trocar interface (Ctrl+Shift+I)">◫ <span class="txt">Interface</span> <strong id="vgInterfaceLabel">2.0</strong>⌄</button><div class="vg-interface-menu"><button class="vg-interface-option" data-interface="original"><span>Original<small>Interface clássica</small></span><b>✓</b></button><button class="vg-interface-option" data-interface="2.0"><span>2.0<small>Interface moderna</small></span><b>✓</b></button><button class="vg-interface-option" data-interface="v2"><span>V2<small>Interface executiva clara</small></span><b>✓</b></button></div>';
    const anchor=host.querySelector('.theme-dots');anchor?host.insertBefore(w,anchor):host.appendChild(w);w.querySelector('.vg-interface-trigger').onclick=e=>{e.stopPropagation();w.classList.toggle('open')};w.querySelectorAll('[data-interface]').forEach(b=>b.onclick=e=>{e.stopPropagation();applyThemeMode(b.dataset.interface);w.classList.remove('open');syncInterfacePicker()});document.addEventListener('click',e=>{if(!w.contains(e.target))w.classList.remove('open')});syncInterfacePicker();
  }
  function syncInterfacePicker(){let mode='2.0';try{mode=localStorage.getItem('vg_theme_mode')||'2.0'}catch(e){}const l=document.getElementById('vgInterfaceLabel');if(l)l.textContent=interfaceLabel(mode);document.querySelectorAll('.vg-interface-option').forEach(b=>b.classList.toggle('active',b.dataset.interface===mode));}

  const HK_LEGACY_URL='https://inventariovg.netlify.app/.netlify/functions/hk-store?key=vg_hk_inventario_v1';
  const HK_LOCAL_URL='/.netlify/functions/hk-store',HK_KEY='vg_hk_inventario_v1',HK_MIN_CAMPAIGNS=3,HK_MIN_CLOSED=2,HK_MIN_OPEN=1;let hkHistDone=false,hkHistBusy=false,hkHistTries=0;
  function hkCanMigrate(){try{return ['direcao','admin'].includes(String(window.vgAuthCurrent?.()?.role||'').toLowerCase());}catch(e){return false;}}
  function hkCampKey(c){return String(c?.nome||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim();}
  function hkHasData(inv){if(!inv||typeof inv!=='object')return false;if(inv.updatedAt||inv.aprovado||inv.aprovadoPor||(Array.isArray(inv.movs)&&inv.movs.length)||(Array.isArray(inv.movimentos)&&inv.movimentos.length))return true;return Array.isArray(inv.linhas)&&inv.linhas.some(l=>l&&[l.existencias,l.invAnterior,l.quebras,l.vestido100,l.aprovadoDO,l.qtd,l.quantidade].some(v=>v!==''&&v!=null&&(!isNaN(Number(v))?Number(v)!==0:true)));}
  function hkHistoryStats(d){const c=Array.isArray(d?.campanhas)?d.campanhas:[];return {campaigns:c.length,closed:c.filter(x=>x?.fechada).length,open:c.filter(x=>!x?.fechada).length};}
  function hkHistoryComplete(d){const x=hkHistoryStats(d);return x.campaigns>=HK_MIN_CAMPAIGNS&&x.closed>=HK_MIN_CLOSED&&x.open>=HK_MIN_OPEN;}
  function hkLineKey(l){return [l?.cat,l?.categoria,l?.item,l?.artigo,l?.cama,l?.medida,l?.tamanho,l?.id].filter(v=>v!==undefined&&v!==null&&String(v)!=='').map(v=>String(v).trim().toUpperCase()).join('|');}
  function hkMergeLines(oldLines,newLines){if(!Array.isArray(oldLines))return Array.isArray(newLines)?JSON.parse(JSON.stringify(newLines)):oldLines;if(!Array.isArray(newLines))return JSON.parse(JSON.stringify(oldLines));const out=JSON.parse(JSON.stringify(oldLines)),idx=new Map();out.forEach((x,i)=>idx.set(hkLineKey(x)||('OLD#'+i),i));newLines.forEach((x,i)=>{const k=hkLineKey(x)||('NEW#'+i);if(idx.has(k))out[idx.get(k)]=Object.assign({},out[idx.get(k)],JSON.parse(JSON.stringify(x)));else{idx.set(k,out.length);out.push(JSON.parse(JSON.stringify(x)));}});return out;}
  function hkMergeEvents(a,b){const out=[],seen=new Set();[...(Array.isArray(a)?a:[]),...(Array.isArray(b)?b:[])].forEach(x=>{const k=String(x?.id||x?.ts||x?.data||'')+'|'+String(x?.tipo||x?.acao||x?.artigo||'')+'|'+JSON.stringify(x||{});if(!seen.has(k)){seen.add(k);out.push(JSON.parse(JSON.stringify(x)));}});return out;}
  function hkMergeInventory(oldInv,newInv){if(!oldInv)return JSON.parse(JSON.stringify(newInv));if(!newInv)return JSON.parse(JSON.stringify(oldInv));if(!hkHasData(newInv))return JSON.parse(JSON.stringify(oldInv));const out=Object.assign({},JSON.parse(JSON.stringify(oldInv)),JSON.parse(JSON.stringify(newInv)));out.linhas=hkMergeLines(oldInv.linhas,newInv.linhas);['movs','movimentos','ajustes','historico','quebrasMovimentos'].forEach(k=>{if(Array.isArray(oldInv[k])||Array.isArray(newInv[k]))out[k]=hkMergeEvents(oldInv[k],newInv[k]);});return out;}
  function hkMergeHistory(current,legacy){const cur=JSON.parse(JSON.stringify(current||{})),old=JSON.parse(JSON.stringify(legacy||{}));if(Array.isArray(old.users))old.users.forEach(u=>{if(u)u.password='';});const out=old;out.campanhas=Array.isArray(out.campanhas)?out.campanhas:[];out.invent=out.invent&&typeof out.invent==='object'?out.invent:{};const map=new Map(out.campanhas.map((c,i)=>[hkCampKey(c),i]));(cur.campanhas||[]).forEach(c=>{const k=hkCampKey(c),src=cur.invent?.[c.id]||{};if(map.has(k)){const dest=out.campanhas[map.get(k)],dst=out.invent[dest.id]||(out.invent[dest.id]={});let hasData=false;Object.entries(src).forEach(([hid,inv])=>{hasData=hasData||hkHasData(inv);dst[hid]=hkMergeInventory(dst[hid],inv);});if(hasData&&c.fechada===false){dest.fechada=false;dest.fechadaEm=null;}else if(hasData&&c.fechada===true&&dest.fechada===false){dest.fechada=true;dest.fechadaEm=c.fechadaEm||dest.fechadaEm||new Date().toISOString();}}else{map.set(k,out.campanhas.length);out.campanhas.push(JSON.parse(JSON.stringify(c)));out.invent[c.id]=JSON.parse(JSON.stringify(src));}});out.log=hkMergeEvents(old.log,cur.log);out.meta=Object.assign({},old.meta||{},cur.meta||{});const stats=hkHistoryStats(out);if(hkHistoryComplete(out))out.meta.legacyMergeV353={source:'inventariovg.netlify.app',at:new Date().toISOString(),campaigns:stats.campaigns,closed:stats.closed,open:stats.open};delete out.meta.legacyMergeV352;out.meta.rev={ts:Date.now(),by:'v35.3-history-merge'};return out;}
  async function hkSyncHistory(){if(hkHistDone||hkHistBusy||!hkCanMigrate())return;const token=typeof window.vgAuthToken==='function'?(window.vgAuthToken()||''):'';if(!token)return;hkHistBusy=true;try{const [lr,cr]=await Promise.all([fetch(HK_LEGACY_URL,{cache:'no-store',credentials:'omit'}),fetch(HK_LOCAL_URL+'?key='+HK_KEY,{cache:'no-store',headers:{Authorization:'Bearer '+token}})]);if(!lr.ok)throw new Error('origem '+lr.status);const legacy=(await lr.json())?.data,current=cr.ok?(await cr.json())?.data:null;if(!legacy||!hkHistoryComplete(legacy)){const st=hkHistoryStats(legacy);throw new Error(`histórico original incompleto (${st.campaigns} campanhas, ${st.closed} fechadas, ${st.open} abertas)`);}if(current?.meta?.legacyMergeV353&&hkHistoryComplete(current)){hkHistDone=true;return;}const merged=hkMergeHistory(current,legacy),ms=hkHistoryStats(merged);if(!hkHistoryComplete(merged))throw new Error(`merge incompleto (${ms.campaigns}/${ms.closed}/${ms.open})`);if(current)await fetch(HK_LOCAL_URL,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({key:'vg_hk_backup_pre_v353_'+Date.now(),data:current})});const wr=await fetch(HK_LOCAL_URL,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({key:HK_KEY,data:merged})});if(!wr.ok)throw new Error('destino '+wr.status);try{localStorage.setItem(HK_KEY,JSON.stringify(merged));sessionStorage.setItem('vg_hk_history_v353',JSON.stringify(ms));}catch(e){}hkHistDone=true;window.VG=window.VG||{};window.VG.hkHistoryStatus={ok:true,...ms};console.info('[VG HK] histórico V35.3 validado',ms);}catch(e){window.VG=window.VG||{};window.VG.hkHistoryStatus={ok:false,error:String(e?.message||e)};console.warn('[VG HK] histórico V35.3:',e);}finally{hkHistBusy=false;}}
  function scheduleHkHistory(){if(hkHistDone||!hkCanMigrate())return;hkHistTries++;hkSyncHistory().finally(()=>{if(!hkHistDone&&hkHistTries<80)setTimeout(scheduleHkHistory,3000);});}
  window.vgRecoverInventoryHistory=()=>{hkHistDone=false;hkHistTries=0;return hkSyncHistory();};
  window.vgInventoryHistoryStatus=()=>window.VG?.hkHistoryStatus||{ok:false,pending:!hkHistDone};

  function buildCmd(){
    var el=q('#vgNavCmd'); if(!el) return;
    el.innerHTML = '<div class="vg-nav-cmd-head"><input id="vgNavInput" placeholder="Pesquisar módulo: custos, ocupação, orçamento…" autocomplete="off"><button id="vgNavClose">Fechar</button></div><div class="vg-nav-cmd-list" id="vgNavList"></div>';
    q('#vgNavClose').addEventListener('click',closeCmd);
    q('#vgNavInput').addEventListener('input',renderCmd);
    q('#vgNavBackdrop').addEventListener('click',closeCmd);
    renderCmd();
  }
  function renderCmd(){
    var input=q('#vgNavInput'); var list=q('#vgNavList'); if(!list) return;
    var term=(input&&input.value||'').toLowerCase().trim();
    results=modules.filter(function(m){var allowed=typeof window.vgAuthCanAccessModule!=='function'||!window.vgAuthCurrent?.()||window.vgAuthCanAccessModule(m[0]);return allowed&&(!term || (m[0]+' '+m[2]+' '+m[3]).toLowerCase().indexOf(term)>=0)});
    if(idx>=results.length) idx=Math.max(0,results.length-1);
    if(!results.length){list.innerHTML='<div style="padding:20px;color:#64748b;font-weight:800">Sem resultados.</div>';return;}
    list.innerHTML=results.map(function(m,i){return '<div class="vg-nav-cmd-item '+(i===idx?'active':'')+'" data-view="'+esc(m[0])+'"><div><strong>'+esc(m[1])+' '+esc(m[2])+'</strong><br><span>'+esc(m[3])+'</span></div><span>Enter</span></div>';}).join('');
    qa('[data-view]',list).forEach(function(x){x.addEventListener('click',function(){go(x.getAttribute('data-view'))})});
  }
  function openCmd(){document.body.classList.add('vg-nav-cmd-open');idx=0;setTimeout(function(){var i=q('#vgNavInput'); if(i){i.value='';i.focus();renderCmd();}},30)}
  function closeCmd(){document.body.classList.remove('vg-nav-cmd-open')}
  function bindKeys(){
    document.addEventListener('keydown',function(ev){
      var tag=(ev.target&&ev.target.tagName||'').toLowerCase(); var typing=['input','textarea','select'].indexOf(tag)>=0;
      // V35.6: Ctrl/Cmd+K pertence exclusivamente à Pesquisa Global.
      if(ev.ctrlKey&&ev.shiftKey&&ev.key.toLowerCase()==='i'&&!typing){ev.preventDefault();document.getElementById('vgInterfacePicker')?.classList.toggle('open');return;}
      if(ev.key==='Escape'){closeCmd();return;}
      if(ev.altKey&&/^[1-6]$/.test(ev.key)){ev.preventDefault();go(quick[parseInt(ev.key,10)-1]);return;}
      if(document.body.classList.contains('vg-nav-cmd-open')){
        if(ev.key==='ArrowDown'){ev.preventDefault();idx=Math.min(results.length-1,idx+1);renderCmd();}
        if(ev.key==='ArrowUp'){ev.preventDefault();idx=Math.max(0,idx-1);renderCmd();}
        if(ev.key==='Enter'&&!typing&&results[idx]){ev.preventDefault();go(results[idx][0]);}
      }
    });
  }
  function init(){
    try{
      var saved = null;
      try{ saved = localStorage.getItem('vg_theme_mode'); }catch(e){}
      if(saved === null){
        var legacy = null;
        try{ legacy = localStorage.getItem('vg20_safe_off'); }catch(e){}
        saved = legacy === '1' ? 'original' : '2.0';
      }
      buildCmd(); installInterfacePicker(); bindKeys();
      applyThemeMode(saved);
      setTimeout(scheduleHkHistory,700);
    }catch(e){console.error('VG navigation init error',e)}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
