
(function(){
  'use strict';
  const HOTEL_LIST = ["ALBACORA", "ALENTEJO VINEYARDS", "AMPALIUS", "ATLANTICO", "CASAS DE ELVAS", "CASCAIS", "CERRO ALAGOA", "COIMBRA", "COLLECTION ALTER REAL", "COLLECTION BRAGA", "COLLECTION DOURO", "COLLECTION ELVAS", "COLLECTION FIGUEIRA DA FOZ", "COLLECTION MONTE DO VILAR", "COLLECTION PALACIO DOS ARCOS", "COLLECTION PONTE DE LIMA VINEYARDS", "COLLECTION PRAIA", "COLLECTION S. MIGUEL", "COLLECTION SERRA DA ESTRELA", "COLLECTION SINTRA", "COLLECTION TOMAR", "DOURO VINEYARDS", "ERICEIRA", "ESTORIL", "EVORA", "ISLA CANELA", "LAGOS", "MARINA", "NAUTICO", "NEP KIDS", "OPERA", "PORTO", "PORTO RIBEIRA", "SANTA CRUZ", "TAVIRA"];
  const SESSION_KEY='vg_auth_session_v6';
  const TOKEN_KEY='vg_auth_token_v6';
  const AUDIT_KEY='vg_auth_audit_v5';
  let usersCache = {};
  let usersLoaded = false;
  let forcedPasswordChange = false;

  const DIRECTION_ONLY_MODULES=new Set(['governance','backup','upload','datacenter']);
  const MODULE_CATALOG=[
    ['resumo','Visão Executiva','Início'],['hotel360','Hotel 360º','Hotéis'],['hoteis','Hotéis','Hotéis'],['fichahotel','Comentários Fecho do Mês','Hotéis'],
    ['agenda','Agenda Operacional','Gestão'],['actions','Ações','Gestão'],['approvals','Workflow de Aprovações','Gestão'],['cityledger','City Ledger & Cobranças','Gestão'],
    ['receitas','Receitas','Análise'],['receitasdet','Receita Detalhada','Análise'],['custos','Custos','Análise'],['pl','P&L USALI','Análise'],['unitEconomics','Eficiência & Unit Economics','Análise'],['revenuehub','Revenue & Forecast','Análise'],['benchmark','Benchmarking','Análise'],['anomalies','Deteção de Anomalias','Análise'],
    ['ab','Compras & A&B','Operação'],['housekeeping','Housekeeping & Têxtil','Operação'],['compras','Compras & Artigos','Operação'],['reputacao','Reputação & Guest Experience','Qualidade'],['instagram','Instagram','Qualidade'],
    ['documents','Gestão de Documentos','Suporte'],['automaticreports','Relatórios Automáticos','Suporte'],['analyticalassistant','Assistente Analítico','Suporte'],
    ['ocupacao','Ocupação','Análise avançada'],['costanalysis','Análise de Custos','Análise avançada'],['cua','Custo / Actividade','Análise avançada'],['compare','Comparar Hotéis','Análise avançada'],['ranking','Ranking Composto','Análise avançada'],['sazonalidade','Sazonalidade','Análise avançada'],['simulador','Simulador','Análise avançada'],['orcamento','Orçamento','Análise avançada'],['alertas','Alertas','Análise avançada']
  ];
  const DEFAULT_MODULES={
    diretor:MODULE_CATALOG.map(x=>x[0]),
    assistente:['resumo','hotel360','hoteis','fichahotel','agenda','actions','approvals','cityledger','receitas','receitasdet','custos','pl','revenuehub','compras','benchmark','reputacao','instagram','documents','automaticreports','housekeeping','ocupacao','alertas'],
    governanta:['housekeeping'],
    chefe_recepcao:['resumo','hotel360','hoteis','fichahotel','agenda','actions','approvals','cityledger','reputacao','documents','ocupacao'],
    compras:['resumo','compras','ab','housekeeping']
  };
  const MODULE_ALIASES={hotelperformance:'hotel360',revenueint:'revenuehub',forecast:'revenuehub',scenariocompare:'revenuehub',recdet:'receitasdet','actions-v30':'actions',kpis:'resumo'};
  function canonicalModule(v){return MODULE_ALIASES[String(v||'')]||String(v||'');}
  function normalizeRole(r){r=String(r||'diretor').toLowerCase();if(r==='admin')return'direcao';if(r==='director')return'diretor';return ['direcao','diretor','assistente','governanta','chefe_recepcao','compras'].includes(r)?r:'diretor';}
  function isDirection(u){return !!u&&normalizeRole(u.role)==='direcao';}
  function userHotels(u){if(!u)return[];if(isDirection(u))return['*'];const a=Array.isArray(u.hotels)?u.hotels:(u.hotel&&u.hotel!=='*'?[u.hotel]:[]);return Array.from(new Set(a.map(x=>String(x||'').trim()).filter(Boolean)));}
  function hotelNorm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/^(HOTEL\s+)?VILA\s+GALE\s+/,'').replace(/^VG(C)?\s+/,'').replace(/^COLLECTION\s+/,'').replace(/\s+/g,' ').trim();}
  function userModules(u){if(!u)return[];if(isDirection(u))return['*'];const r=normalizeRole(u.role),a=Array.isArray(u.modules)?u.modules:(DEFAULT_MODULES[r]||[]);return Array.from(new Set(a.map(canonicalModule).filter(x=>x&&!DIRECTION_ONLY_MODULES.has(x))));}
  function canAccessHotel(h,u=current()){if(!u)return false;if(isDirection(u))return true;const n=hotelNorm(h);return !!n&&userHotels(u).some(x=>hotelNorm(x)===n);}
  function canAccessModule(m,u=current()){if(!u)return false;if(isDirection(u))return true;return userModules(u).includes(canonicalModule(m));}
  function firstAllowedModule(u=current()){if(!u)return'resumo';if(isDirection(u))return'resumo';if(normalizeRole(u.role)==='governanta'&&canAccessModule('housekeeping',u))return'housekeeping';const preferred=['resumo','hotel360','housekeeping','hoteis','agenda','cityledger','reputacao','documents'];return preferred.find(m=>canAccessModule(m,u))||userModules(u)[0]||'resumo';}
  window.vgAuthCanAccessHotel=canAccessHotel;window.vgAuthHotels=()=>userHotels(current());window.vgAuthCanAccessModule=canAccessModule;window.vgAuthModules=()=>userModules(current());window.vgAuthFirstAllowedModule=()=>firstAllowedModule(current());
  function roleLabel(r){r=normalizeRole(r);return r==='direcao'?'Dir. Operações':r==='diretor'?'Diretor':r==='assistente'?'Assistente Direção':r==='governanta'?'Governanta':r==='chefe_recepcao'?'Chefe de Receção':r==='compras'?'Compras':r;}
  function roleBg(r){r=normalizeRole(r);return r==='direcao'?'rgba(201,168,76,.2);color:#c9a84c':r==='governanta'?'rgba(168,85,247,.16);color:#a855f7':r==='chefe_recepcao'?'rgba(14,165,233,.16);color:#0ea5e9':r==='assistente'?'rgba(100,180,255,.15);color:#64b4ff':'rgba(42,125,140,.2);color:#2a7d8c';}

  function applyMenuPermissions(){
    const u=current();if(!u)return;
    document.querySelectorAll('.sb-nav-btn[id^="nav-"]').forEach(el=>{const m=canonicalModule(el.id.slice(4));const ok=canAccessModule(m,u);if(!ok){el.dataset.vgAccessHidden='1';el.style.display='none';}else if(el.dataset.vgAccessHidden==='1'){delete el.dataset.vgAccessHidden;el.style.display='';}});
    document.querySelectorAll('#vgMobileNav [data-view],#vgMobileMore [data-view]').forEach(el=>{const ok=canAccessModule(el.dataset.view,u);el.style.display=ok?'':'none';});
    document.querySelectorAll('#vgMobileNav [data-action="actions"],#vgMobileMore [data-action="actions"]').forEach(el=>el.style.display=canAccessModule('actions',u)?'':'none');
    document.querySelectorAll('#vgMobileMore [data-action="assistant"]').forEach(el=>el.style.display=canAccessModule('analyticalassistant',u)?'':'none');
    const topAssistant=document.getElementById('v30TopAssistant');if(topAssistant)topAssistant.style.display=canAccessModule('analyticalassistant',u)?'':'none';
    document.querySelectorAll('[data-v33-open]').forEach(el=>el.style.display=canAccessModule(el.dataset.v33Open,u)?'':'none');
    document.querySelectorAll('.sb-nav-group').forEach(g=>{const visible=[...g.querySelectorAll('.sb-nav-btn')].some(b=>getComputedStyle(b).display!=='none');g.style.display=visible?'':'none';});
  }
  window.vgAuthApplyMenuPermissions=applyMenuPermissions;

  function applyHotelScope(){
    const u=current();if(!u||isDirection(u))return;
    try{
      if(typeof RAW!=='undefined'&&RAW&&Array.isArray(RAW.hotel_list)&&typeof selectedHotels!=='undefined'){const allowed=RAW.hotel_list.filter(h=>canAccessHotel(h,u));selectedHotels=new Set(allowed);}
      document.querySelectorAll('.sb-hotel-item[data-hotel]').forEach(el=>{const ok=canAccessHotel(el.dataset.hotel,u);el.style.display=ok?'':'none';el.classList.toggle('on',ok&&typeof selectedHotels!=='undefined'&&selectedHotels.has(el.dataset.hotel));});
      if(typeof window.updateContextPanel==='function')window.updateContextPanel();
    }catch(e){console.warn('Âmbito de hotéis não aplicado',e);}
  }
  window.vgAuthApplyHotelScope=applyHotelScope;

  function esc(s){return String(s??'').replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
  function norm(s){return String(s||'').trim().toUpperCase();}
  function token(){try{return sessionStorage.getItem(TOKEN_KEY)||'';}catch(e){return '';}}
  function current(){
    try{
      if(!token()) return null;
      return JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');
    }catch(e){return null;}
  }
  function setAuth(u,t){
    try{
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(u));
      sessionStorage.setItem(TOKEN_KEY, t||'');
    }catch(e){}
  }
  function clearCurrent(){
    try{sessionStorage.removeItem(SESSION_KEY);sessionStorage.removeItem(TOKEN_KEY);}catch(e){}
  }
  window.vgAuthToken=token;
  window.vgAuthCurrent=current;

  async function api(resource, method, payload, key){
    let url = window.SHARED_API_URL + '?resource=' + encodeURIComponent(resource);
    if(key!==undefined && key!==null) url += '&key=' + encodeURIComponent(key);
    const headers={'Content-Type':'application/json'};
    const t=token(); if(t) headers.Authorization='Bearer '+t;
    const opts={method:method||'GET',headers,cache:'no-store'};
    if(payload!==undefined) opts.body=JSON.stringify(payload);
    const res=await fetch(url,opts);
    const data=await res.json().catch(()=>({}));
    if(!res.ok){
      const err=new Error(data.error||('HTTP '+res.status)); err.status=res.status; throw err;
    }
    return data;
  }

  async function audit(action, hotel, detail){
    const u=current();
    if(!u) return;
    const entry={ts:new Date().toLocaleString('pt-PT'),hotel:hotel||'',action:action||'',detail:detail||''};
    let rows=[]; try{rows=JSON.parse(localStorage.getItem(AUDIT_KEY)||'[]')||[];}catch(e){}
    rows.unshift(Object.assign({},entry,{user:u.user,name:u.name})); rows=rows.slice(0,300);
    try{localStorage.setItem(AUDIT_KEY,JSON.stringify(rows));}catch(e){}
    renderAudit(rows);
    try{await api('audit','POST',entry);}catch(e){console.warn('Não foi possível publicar auditoria.',e);}
  }
  function canEditHotel(h){
    const u=current(); if(!u) return false;
    return canAccessHotel(h,u);
  }
  window.vgAuthCanEditHotel=canEditHotel;
  window.vgAuthAudit=audit;

  function handleUnauthorized(){
    if(!current() && !token()) return;
    clearCurrent();
    usersCache={}; usersLoaded=false;
    applySession();
    const err=document.getElementById('vgLoginError'); if(err) err.textContent='A sessão expirou. Inicie sessão novamente.';
  }
  window.vgAuthHandleUnauthorized=handleUnauthorized;

  async function refreshUsersFromServer(){
    const u=current();
    if(!u || !isDirection(u)) {usersCache={};usersLoaded=true;return usersCache;}
    const data=await api('users','GET');
    usersCache=(data&&data.data)||{}; usersLoaded=true;
    return usersCache;
  }
  function readUsers(){return usersCache||{};}
  async function ensureUsersLoaded(force){
    if(force||!usersLoaded) await refreshUsersFromServer();
    return usersCache;
  }

  async function afterLoginLoad(){
    setTimeout(async function(){
      try{if(typeof idbAutoRestore==='function') await idbAutoRestore();}catch(e){console.warn('Auto-restauro após login falhou',e);}
      try{if(typeof window.vgTargetsRulesLoad==='function') await window.vgTargetsRulesLoad(false);}catch(e){console.warn('Metas & Regras após login falharam',e);}
      try{
        if(typeof STORE!=='undefined'&&typeof selectedMeses!=='undefined'){
          var avail=Object.keys(STORE).map(Number).filter(function(x){return x>0;});
          if(avail.length>0&&selectedMeses.size===0) selectedMeses.add(Math.max.apply(null,avail));
        }
        if(typeof buildMesButtons==='function') buildMesButtons();
        if(typeof applyMesSelection==='function') applyMesSelection();
      }catch(e){console.warn('Carregamento de dados após login falhou',e);}
      try{if(typeof calInit==='function')calInit();if(typeof window.vgAuthApplyMenuPermissions==='function')window.vgAuthApplyMenuPermissions();applyHotelScope();const wanted=(typeof currentView!=='undefined'&&canAccessModule(currentView))?currentView:firstAllowedModule();if(typeof setView==='function')setView(wanted);}catch(e){console.warn('Re-render após login falhou',e);}
    },250);
  }

  async function login(){
    const user=(document.getElementById('vgLoginUser')?.value||'').trim().toLowerCase();
    const pass=document.getElementById('vgLoginPass')?.value||'';
    const err=document.getElementById('vgLoginError'); if(err)err.textContent='';
    const btn=document.getElementById('vgLoginBtn'); if(btn){btn.disabled=true;btn.textContent='A validar…';}
    try{
      const data=await api('auth-login','POST',{user,password:pass});
      if(!data.token||!data.user) throw new Error('Resposta de autenticação inválida.');
      setAuth(data.user,data.token);
      if(document.getElementById('vgLoginPass')) document.getElementById('vgLoginPass').value='';
      applySession();
      audit('Login',data.user.hotel,'Entrada no dashboard');
      if(data.user.mustChangePassword){
        openPasswordModal(true);
      }else{
        afterLoginLoad();
      }
      return true;
    }catch(e){
      if(err)err.textContent=e.status===429?e.message:'Utilizador ou palavra-passe inválidos.';
      return false;
    }finally{
      if(btn){btn.disabled=false;btn.textContent='Entrar';}
    }
  }
  function logout(){audit('Logout','','Saída do dashboard');clearCurrent();usersCache={};usersLoaded=false;applySession();}
  window.vgAuthLogin=login;window.vgAuthLogout=logout;

  function ensureTopbar(){
    const top=document.querySelector('.topbar-right')||document.querySelector('.topbar')||document.body;
    if(!document.getElementById('vgCurrentUserPill')){let p=document.createElement('div');p.id='vgCurrentUserPill';p.className='vg-auth-pill';top.appendChild(p);}
    if(!document.getElementById('vgPasswordBtn')){let b=document.createElement('button');b.id='vgPasswordBtn';b.className='vg-auth-btn';b.textContent='Palavra-passe';b.type='button';b.onclick=function(){openPasswordModal(false);};top.appendChild(b);}
    if(!document.getElementById('vgSetupBtn')){let b=document.createElement('button');b.id='vgSetupBtn';b.className='vg-auth-btn';b.textContent='Setup';b.type='button';b.onclick=openSetup;top.appendChild(b);}
    if(!document.getElementById('vgLogoutBtn')){let b=document.createElement('button');b.id='vgLogoutBtn';b.className='vg-auth-btn';b.textContent='Sair';b.type='button';b.onclick=logout;top.appendChild(b);}
  }
  function applySession(){
    ensureTopbar();
    const u=current();
    const overlay=document.getElementById('vgLoginOverlay');
    const pill=document.getElementById('vgCurrentUserPill');
    const setup=document.getElementById('vgSetupBtn');
    const passBtn=document.getElementById('vgPasswordBtn');
    const logoutBtn=document.getElementById('vgLogoutBtn');
    if(!u){
      if(overlay)overlay.style.display='flex';
      [pill,setup,passBtn,logoutBtn].forEach(function(x){if(x)x.style.display='none';});
      document.querySelectorAll('.vg-direction-only').forEach(function(x){x.style.display='none';});
      document.body.classList.remove('vg-is-admin','vg-governanta-mode');
      try{onlineStopPing&&onlineStopPing();}catch(e){}
      return;
    }
    if(overlay)overlay.style.display='none';
    if(pill){const rl=roleLabel(normalizeRole(u.role)),hs=userHotels(u),scope=isDirection(u)?'Todos os hotéis':(hs.length<=2?hs.join(' · '):(hs.length+' hotéis'));pill.style.display='inline-flex';pill.innerHTML='<b>'+esc(u.name)+'</b><span>'+esc(rl)+(scope?' · '+esc(scope):'')+'</span>'; }
    if(setup)setup.style.display=isDirection(u)?'inline-flex':'none';
    if(passBtn)passBtn.style.display='inline-flex';
    if(logoutBtn)logoutBtn.style.display='inline-flex';
    document.querySelectorAll('.vg-direction-only').forEach(function(x){x.style.display=isDirection(u)?'':'none';});
    document.body.classList.toggle('vg-is-admin',isDirection(u));
    document.body.classList.toggle('vg-governanta-mode',normalizeRole(u.role)==='governanta');
    applyPermissions();
    if(isDirection(u)) renderSetup();
    try{onlineStartPing();}catch(e){}
  }

  function selectedHotel(){return document.getElementById('hsHotel')?.value||document.querySelector('[data-current-hotel]')?.getAttribute('data-current-hotel')||'';}
  function applyPermissions(){
    const h=selectedHotel();const editable=canEditHotel(h);
    const root=document.getElementById('view-fichahotel')||document.querySelector('#hsTableBody')?.closest('.tab-content');
    if(!root||!h)return;
    let msg=document.getElementById('vgLockMessage');
    if(!msg){msg=document.createElement('div');msg.id='vgLockMessage';msg.className='vg-lock-message';msg.textContent='Este hotel está fora do âmbito atribuído ao seu utilizador.';root.insertBefore(msg,root.firstElementChild);}
    msg.style.display=editable?'none':'block';
    root.querySelectorAll('textarea,input,select,button').forEach(function(el){
      if(['hsHotel','hsMes'].includes(el.id))return;
      if(el.closest('#vgSetupModal'))return;
      if(el.id&&el.id.startsWith('vg'))return;
      if(!editable){el.classList.add('vg-edit-locked');if(['TEXTAREA','INPUT'].includes(el.tagName))el.setAttribute('readonly','readonly');}
      else{el.classList.remove('vg-edit-locked');if(['TEXTAREA','INPUT'].includes(el.tagName))el.removeAttribute('readonly');}
    });
  }
  window.vgAuthApplyPermissions=applyPermissions;

  function moduleDefaultForRole(role){return (DEFAULT_MODULES[normalizeRole(role)]||[]).slice();}
  function renderAccessEditors(useDefaults=false){
    const role=normalizeRole(document.getElementById('vgNewRole')?.value||'diretor'),isDO=role==='direcao';
    const hw=document.getElementById('vgHotelAccessWrap'),mw=document.getElementById('vgModuleAccessWrap'),note=document.getElementById('vgDirectionAccessNote');
    if(note)note.style.display=isDO?'block':'none';if(hw)hw.parentElement.style.display=isDO?'none':'';if(mw)mw.parentElement.style.display=isDO?'none':'';if(isDO)return;
    let selectedHotels=new Set();if(!useDefaults&&hw)hw.querySelectorAll('input:checked').forEach(x=>selectedHotels.add(x.value));
    let selectedModules=new Set(useDefaults?moduleDefaultForRole(role):[]);if(!useDefaults&&mw)mw.querySelectorAll('input:checked').forEach(x=>selectedModules.add(x.value));if(!selectedModules.size&&!mw?.children?.length)selectedModules=new Set(moduleDefaultForRole(role));
    if(hw)hw.innerHTML=hotelsForSetup().map(h=>'<label style="display:flex;gap:6px;align-items:center;font-size:10px;padding:5px 6px;background:var(--surface-1);border:1px solid var(--border);border-radius:6px"><input type="checkbox" class="vgHotelAccess" value="'+esc(h)+'" '+(selectedHotels.has(h)?'checked':'')+'><span>'+esc(h)+'</span></label>').join('');
    if(mw)mw.innerHTML=MODULE_CATALOG.map(([id,label,group])=>'<label style="display:flex;gap:6px;align-items:flex-start;font-size:10px;padding:5px 6px;background:var(--surface-1);border:1px solid var(--border);border-radius:6px"><input type="checkbox" class="vgModuleAccess" value="'+esc(id)+'" '+(selectedModules.has(id)?'checked':'')+'><span><b style="display:block">'+esc(label)+'</b><small style="color:var(--text-3)">'+esc(group)+'</small></span></label>').join('');
  }
  function setAccessEditorValues(x){
    const role=normalizeRole(x?.role||'diretor');document.getElementById('vgNewRole').value=role;renderAccessEditors(true);
    if(role==='direcao')return;const hs=new Set(userHotels(x)),ms=new Set(userModules(x));
    document.querySelectorAll('.vgHotelAccess').forEach(c=>c.checked=hs.has(c.value));document.querySelectorAll('.vgModuleAccess').forEach(c=>c.checked=ms.has(c.value));
  }
  function selectedAccessHotels(){return [...document.querySelectorAll('.vgHotelAccess:checked')].map(x=>x.value);}
  function selectedAccessModules(){return [...document.querySelectorAll('.vgModuleAccess:checked')].map(x=>x.value);}

  function hotelsForSetup(){
    const fromSelect=Array.from(document.querySelectorAll('#hsHotel option, select option')).map(function(o){return o.value;}).filter(Boolean);
    const marketHotels=window.VG?.market?.def?.()?.hotels||[];const rawHotels=(typeof RAW!=='undefined'&&RAW?.hotel_list)||[];
    const base=marketHotels.length?marketHotels:(HOTEL_LIST||[]).concat(rawHotels,fromSelect);
    return Array.from(new Set(base.filter(Boolean).filter(h=>!window.VG?.market||window.VG.market.isCurrentHotel(h)))).sort();
  }
  function fillHotelSelect(){const s=document.getElementById('vgNewHotel');if(!s)return;const val=s.value;s.innerHTML='<option value="*">Todos os hotéis</option>'+hotelsForSetup().map(function(h){return '<option value="'+esc(h)+'">'+esc(h)+'</option>';}).join('');if(val)s.value=val;renderAccessEditors();}
  async function openSetup(){
    if(!isDirection(current()))return;
    const m=document.getElementById('vgSetupModal');if(m)m.style.display='flex';
    await renderSetup(true);
  }
  function closeSetup(){const m=document.getElementById('vgSetupModal');if(m)m.style.display='none';}

  async function renderAudit(preloadedRows){
    const b=document.getElementById('vgAuditTable');if(!b)return;
    let rows=preloadedRows;
    if(!rows){
      try{const data=await api('audit-events','GET');if(data&&Array.isArray(data.data))rows=data.data;}catch(e){if(e.status===401)handleUnauthorized();}
      if(!rows){try{rows=JSON.parse(localStorage.getItem(AUDIT_KEY)||'[]')||[];}catch(e){rows=[];}}
      try{localStorage.setItem(AUDIT_KEY,JSON.stringify(rows.slice(0,300)));}catch(e){}
    }
    b.innerHTML=rows.slice(0,80).map(function(r){return '<tr><td>'+esc(r.serverTs||r.ts)+'</td><td>'+esc(r.name||r.user)+'</td><td>'+esc(r.hotel)+'</td><td>'+esc(r.action)+'</td><td>'+esc(r.detail)+'</td></tr>';}).join('');
  }

  const legacyRegionNames={norte:'🔵 Norte e Centro',lisboa:'🟢 Lisboa & Ilhas',alentejo:'🟡 Alentejo',algarve:'🔴 Algarve'};
  function setupRegionName(r){const x=window.VG?.market?.regionLabel?.(r)||legacyRegionNames[r]||r;const icons={cidade:'🏙️',resorts:'🏖️',collection:'◆'};return (icons[r]?icons[r]+' ':'')+x;}
  let editRegioes=null;
  function renderRegioesEditor(){
    const el=document.getElementById('vgRegioesEditor');if(!el)return;
    if(!editRegioes)editRegioes=JSON.parse(JSON.stringify(REGIOES));
    el.innerHTML=Object.keys(editRegioes).map(function(reg){
      const list=editRegioes[reg];
      const items=list.map(function(h){return '<div style="display:flex;align-items:center;justify-content:space-between;padding:3px 6px;background:var(--surface-2);border-radius:4px;margin-bottom:3px;font-size:11px;gap:4px"><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+esc(h)+'">'+esc(h)+'</span><select style="font-size:10px;padding:1px 3px;background:var(--surface-3);border:1px solid var(--border);color:var(--text-2);border-radius:3px" onchange="vgMoveHotel(\''+esc(h)+'\',\''+reg+'\',this.value)">'+Object.keys(editRegioes).map(function(r){return '<option value="'+r+'"'+(r===reg?' selected':'')+'>'+esc(setupRegionName(r))+'</option>';}).join('')+'</select></div>';}).join('');
      return '<div style="background:var(--surface-1);border:1px solid var(--border);border-radius:8px;padding:10px"><div style="font-size:11px;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">'+esc(setupRegionName(reg))+' <span style="font-weight:400;color:var(--text-3)">('+list.length+')</span></div>'+(items||'<div style="font-size:11px;color:var(--text-3);font-style:italic">Sem hotéis</div>')+'</div>';
    }).join('');
  }
  window.vgMoveHotel=function(hotel,fromReg,toReg){if(!editRegioes||fromReg===toReg)return;editRegioes[fromReg]=editRegioes[fromReg].filter(function(h){return h!==hotel;});if(!editRegioes[toReg].includes(hotel))editRegioes[toReg].push(hotel);editRegioes[toReg].sort();renderRegioesEditor();};
  window.vgSaveRegioes=async function(){if(!editRegioes)return;const ok=await saveRegioes(editRegioes);editRegioes=JSON.parse(JSON.stringify(REGIOES));const msg=document.getElementById('vgRegioesMsg');if(msg){msg.textContent=ok?'✓ Regiões partilhadas e guardadas para todos.':'⚠ Não foi possível sincronizar as regiões.';setTimeout(function(){if(msg)msg.textContent='';},3500);}if(typeof renderAll==='function')renderAll();};
  window.vgResetRegioes=async function(){if(!confirm('Repor o mapeamento de regiões por defeito para todos os utilizadores?'))return;const defaults=JSON.parse(JSON.stringify(window.VG?.market?.defaultRegions?.()||REGIOES_DEFAULT));const ok=await saveRegioes(defaults);editRegioes=JSON.parse(JSON.stringify(REGIOES));renderRegioesEditor();const msg=document.getElementById('vgRegioesMsg');if(msg){msg.textContent=ok?'↺ Regiões por defeito publicadas para todos.':'⚠ Não foi possível publicar a reposição.';setTimeout(function(){if(msg)msg.textContent='';},3500);}if(typeof renderAll==='function')renderAll();};

  window.VG?.events?.on?.('market:changed',()=>{editRegioes=JSON.parse(JSON.stringify(typeof REGIOES!=='undefined'?REGIOES:{}));renderRegioesEditor();});

  async function renderSetup(force){
    const u=current();if(!u||!(isDirection(u)))return;
    fillHotelSelect();renderRegioesEditor();
    try{if(typeof window.vgTargetsRulesRenderSetup==='function') await window.vgTargetsRulesRenderSetup(!!force);}catch(e){console.warn('Setup Metas & Regras indisponível',e);}
    var body=document.getElementById('vgUsersTable');if(!body)return;
    if(force||!usersLoaded){
      body.innerHTML='<tr><td colspan="7" style="padding:14px;color:var(--text-3)">A carregar utilizadores…</td></tr>';
      try{await ensureUsersLoaded(true);}catch(e){if(e.status===401){handleUnauthorized();return;}body.innerHTML='<tr><td colspan="7">Não foi possível obter os utilizadores.</td></tr>';return;}
    }
    var users=readUsers();
    function scopeLabel(x){const hs=userHotels(x);return isDirection(x)?'Todos os hotéis':(hs.length<=2?hs.join(' · '):hs.length+' hotéis');}
    var sorted=Object.values(users).sort(function(a,b){var ro={direcao:0,admin:0,diretor:1,assistente:2,chefe_recepcao:3,governanta:4,compras:5};var rd=(ro[a.role]??1)-(ro[b.role]??1);return rd!==0?rd:String(a.name).localeCompare(String(b.name),'pt');});
    body.innerHTML=sorted.map(function(x){
      const pwd=x.mustChangePassword?'<span title="A alteração da palavra-passe será pedida no próximo login" style="color:#e0a020"> · troca pendente</span>':'';
      return '<tr style="opacity:'+(x.active===false?'.45':'1')+'"><td style="font-family:monospace;font-size:11px">'+esc(x.user)+'</td><td>'+esc(x.name)+pwd+'</td><td><span style="padding:2px 7px;border-radius:4px;font-size:10px;font-weight:700;background:'+roleBg(x.role)+'">'+roleLabel(x.role)+'</span></td><td style="font-size:11px">'+esc(scopeLabel(x))+'</td><td style="font-size:11px">'+(isDirection(x)?'Todos':userModules(x).length+' módulo(s)')+'</td><td>'+(x.active===false?'<span style="color:#e55">Inativo</span>':'<span style="color:#5c5">Ativo</span>')+'</td><td style="display:flex;gap:4px"><button class="vg-auth-smallbtn" type="button" data-edit="'+esc(x.user)+'">✏ Editar</button><button class="vg-auth-smallbtn" type="button" data-toggle="'+esc(x.user)+'">'+(x.active===false?'✓ Ativar':'✕ Inativar')+'</button></td></tr>';
    }).join('');
    body.querySelectorAll('[data-edit]').forEach(function(b){b.onclick=function(){editUser(this.getAttribute('data-edit'));};});
    body.querySelectorAll('[data-toggle]').forEach(function(b){b.onclick=function(){toggleUser(this.getAttribute('data-toggle'));};});
    renderAudit();
  }

  async function saveUser(){
    if(!isDirection(current()))return;
    var user=(document.getElementById('vgNewUser')?.value||'').trim().toLowerCase();
    var name=(document.getElementById('vgNewName')?.value||'').trim();
    var password=document.getElementById('vgNewPass')?.value||'';
    var role=normalizeRole(document.getElementById('vgNewRole')?.value||'diretor');
    var hotels=role==='direcao'?['*']:selectedAccessHotels();
    var modules=role==='direcao'?['*']:selectedAccessModules();
    var hotel=role==='direcao'?'*':(hotels[0]||'');
    var msg=document.getElementById('vgFormMsg');if(msg)msg.textContent='';
    if(!user||!name){if(msg)msg.textContent='⚠ Preencha o utilizador e o nome.';return;}if(role!=='direcao'&&!hotels.length){if(msg)msg.textContent='⚠ Selecione pelo menos um hotel.';return;}if(role!=='direcao'&&!modules.length){if(msg)msg.textContent='⚠ Selecione pelo menos um módulo.';return;}
    try{
      await api('user-save','POST',{user,name,password,role,hotel,hotels,modules});
      await ensureUsersLoaded(true);await renderSetup(false);
      if(msg)msg.textContent='✓ '+name+' guardado no servidor.';
      ['vgNewUser','vgNewName','vgNewPass'].forEach(function(id){const el=document.getElementById(id);if(el)el.value='';});
      audit('Setup',hotel,'Utilizador criado/alterado: '+user+' · '+(role==='direcao'?'acesso total':hotels.length+' hotel(éis) · '+modules.length+' módulo(s)'));
      showToast('Utilizador guardado: '+name+' ('+role+')');
    }catch(e){if(e.status===401){handleUnauthorized();return;}if(msg)msg.textContent='⚠ '+e.message;}
  }
  function editUser(user){
    var x=readUsers()[user];if(!x)return;fillHotelSelect();
    document.getElementById('vgNewUser').value=x.user;
    document.getElementById('vgNewName').value=x.name;
    document.getElementById('vgNewPass').value='';
    var r=normalizeRole(x.role);document.getElementById('vgNewRole').value=r;setAccessEditorValues(x);
    var hotelSel=document.getElementById('vgNewHotel');hotelSel.value=(r==='direcao')?'*':(userHotels(x)[0]||'');
    var msg=document.getElementById('vgFormMsg');if(msg)msg.textContent='A editar: '+x.name+' · deixe a palavra-passe vazia para a manter.';
  }
  async function toggleUser(user){
    if(user==='pmonforte'){alert('O administrador principal não pode ser inativado.');return;}
    try{await api('user-toggle','POST',{user});await ensureUsersLoaded(true);audit('Setup',readUsers()[user]?.hotel,'Estado alterado: '+user);await renderSetup(false);}catch(e){if(e.status===401)handleUnauthorized();else alert(e.message);}
  }

  function openPasswordModal(forced){
    if(!current())return;
    forcedPasswordChange=!!forced;
    const m=document.getElementById('vgPasswordModal');if(!m)return;
    document.getElementById('vgPasswordTitle').textContent=forced?'Alteração obrigatória da palavra-passe':'Alterar palavra-passe';
    document.getElementById('vgPasswordHelp').textContent=forced?'Por segurança, a conta ainda usa uma palavra-passe inicial. Defina uma nova antes de continuar.':'A nova palavra-passe deve ter pelo menos 8 caracteres e incluir uma letra e um número.';
    ['vgOldPassword','vgNewPassword1','vgNewPassword2'].forEach(function(id){const el=document.getElementById(id);if(el)el.value='';});
    const err=document.getElementById('vgPasswordError');if(err)err.textContent='';
    const cancel=document.getElementById('vgPasswordCancel');if(cancel)cancel.style.display=forced?'none':'inline-flex';
    m.style.display='flex';setTimeout(function(){document.getElementById('vgOldPassword')?.focus();},50);
  }
  function closePasswordModal(){if(forcedPasswordChange)return;const m=document.getElementById('vgPasswordModal');if(m)m.style.display='none';}
  async function saveOwnPassword(){
    const oldPassword=document.getElementById('vgOldPassword')?.value||'';
    const p1=document.getElementById('vgNewPassword1')?.value||'';
    const p2=document.getElementById('vgNewPassword2')?.value||'';
    const err=document.getElementById('vgPasswordError');if(err)err.textContent='';
    if(p1!==p2){if(err)err.textContent='As duas novas palavras-passe não coincidem.';return;}
    const btn=document.getElementById('vgPasswordSave');if(btn){btn.disabled=true;btn.textContent='A guardar…';}
    try{
      const data=await api('auth-change-password','POST',{oldPassword,newPassword:p1});
      setAuth(data.user,data.token);forcedPasswordChange=false;
      const m=document.getElementById('vgPasswordModal');if(m)m.style.display='none';
      applySession();audit('Segurança',data.user.hotel,'Palavra-passe alterada');showToast('Palavra-passe alterada com sucesso.');
      afterLoginLoad();
    }catch(e){if(e.status===401&&e.message==='Sessão inválida ou expirada.'){handleUnauthorized();return;}if(err)err.textContent=e.message||'Não foi possível alterar a palavra-passe.';}
    finally{if(btn){btn.disabled=false;btn.textContent='Guardar nova palavra-passe';}}
  }

  window.vgAuthOpenSetup=openSetup;window.vgAuthCloseSetup=closeSetup;window.vgAuthSaveUser=saveUser;
  window.vgAuthOpenPassword=function(){openPasswordModal(false);};

  function init(){
    // Elimina caches do sistema antigo que continham passwords em texto simples.
    try{localStorage.removeItem('vg_auth_users_v5');sessionStorage.removeItem('vg_auth_session_v5');sessionStorage.removeItem('vg_upload_unlocked');}catch(e){}
    const btn=document.getElementById('vgLoginBtn');if(btn)btn.onclick=login;
    const pass=document.getElementById('vgLoginPass');if(pass)pass.addEventListener('keydown',function(e){if(e.key==='Enter')login();});
    const close=document.getElementById('vgCloseSetupBtn');if(close)close.onclick=closeSetup;
    const save=document.getElementById('vgSaveUserBtn');if(save)save.onclick=saveUser;
    const pwdSave=document.getElementById('vgPasswordSave');if(pwdSave)pwdSave.onclick=saveOwnPassword;
    const pwdCancel=document.getElementById('vgPasswordCancel');if(pwdCancel)pwdCancel.onclick=closePasswordModal;
    const roleSel=document.getElementById('vgNewRole');if(roleSel)roleSel.addEventListener('change',()=>renderAccessEditors(true));const defaultsBtn=document.getElementById('vgApplyRoleDefaults');if(defaultsBtn)defaultsBtn.onclick=()=>renderAccessEditors(true);
    document.addEventListener('change',function(e){if(e.target&&e.target.id==='hsHotel')setTimeout(applyPermissions,0);});
    applySession();
    const u=current();
    if(u){
      if(u.mustChangePassword)openPasswordModal(true);else afterLoginLoad();
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
