// ==========================================================
// VG OPERATIONS V31 — MERCADOS INTERNACIONAIS
// PT+ES (EUR) e Brasil (BRL) partilham a mesma aplicação, mas nunca
// o mesmo universo financeiro. O estado ativo continua compatível
// com os módulos legados: STORE/RAW/REP/OCC representam apenas o
// mercado selecionado; a troca de mercado guarda/restaura snapshots.
// ==========================================================
(function(){
  'use strict';
  window.VG=window.VG||{};
  if(window.VG.market?.version>=31.2)return;

  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim();
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const BR_HOTELS=[
    'FORTALEZA','SALVADOR','CUMBUCO','RIO DE JANEIRO','TOUROS','MARES','PAULISTA','CABO','ECO RESORT DE ANGRA','ALAGOAS',
    'COLLECTION SUNSET CUMBUCO','COLLECTION OURO PRETO','COLLECTION AMAZÔNIA'
  ];
  const BR_SET=new Set(BR_HOTELS.map(norm));
  const BR_ALIASES=new Map([
    ['AMAZONIA','COLLECTION AMAZÔNIA'],['COLLECTION AMAZONIA','COLLECTION AMAZÔNIA'],['OURO PRETO','COLLECTION OURO PRETO'],
    ['COLLECTION SUNSET','COLLECTION SUNSET CUMBUCO'],['SUNSET CUMBUCO','COLLECTION SUNSET CUMBUCO'],['ECO RESORT ANGRA','ECO RESORT DE ANGRA']
  ].map(([a,b])=>[norm(a),b]));

  const DEFINITIONS={
    iberia:{
      id:'iberia',label:'PT + ES',short:'PT+ES',flag:'🇵🇹🇪🇸',currency:'EUR',symbol:'€',locale:'pt-PT',
      regions:{
        norte:['COIMBRA','COLLECTION BRAGA','COLLECTION DOURO','COLLECTION FIGUEIRA DA FOZ','COLLECTION PONTE DE LIMA VINEYARDS','COLLECTION SERRA DA ESTRELA','DOURO VINEYARDS','PORTO','PORTO RIBEIRA'],
        lisboa:['CASCAIS','COLLECTION PALACIO DOS ARCOS','COLLECTION SINTRA','COLLECTION TOMAR','ERICEIRA','ESTORIL','OPERA','COLLECTION S. MIGUEL','SANTA CRUZ'],
        alentejo:['ALENTEJO VINEYARDS','CASAS DE ELVAS','COLLECTION ALTER REAL','COLLECTION ELVAS','COLLECTION MONTE DO VILAR','EVORA','NEP KIDS'],
        algarve:['ALBACORA','AMPALIUS','ATLANTICO','CERRO ALAGOA','COLLECTION PRAIA','LAGOS','MARINA','NAUTICO','TAVIRA','ISLA CANELA']
      },
      regionLabels:{todos:'Todos',norte:'Norte e Centro',lisboa:'Lisboa & Ilhas',alentejo:'Alentejo',algarve:'Algarve'}
    },
    brasil:{
      id:'brasil',label:'Brasil',short:'BR',flag:'🇧🇷',currency:'BRL',symbol:'R$',locale:'pt-BR',hotels:BR_HOTELS.slice(),
      regions:{
        cidade:['FORTALEZA','PAULISTA','RIO DE JANEIRO','SALVADOR'],
        resorts:['ALAGOAS','CABO','CUMBUCO','ECO RESORT DE ANGRA','MARES','TOUROS'],
        collection:['COLLECTION AMAZÔNIA','COLLECTION OURO PRETO','COLLECTION SUNSET CUMBUCO']
      },
      regionLabels:{todos:'Todos',cidade:'Cidade',resorts:'Resorts',collection:'Collection'}
    }
  };

  const state={current:'iberia',switching:false,bank:{iberia:null,brasil:null},loaded:{iberia:false,brasil:false},initialized:false};
  try{const saved=localStorage.getItem('vg_market_v31');if(DEFINITIONS[saved])state.current=saved;}catch(e){}

  function id(){return state.current;}
  function def(m=id()){return DEFINITIONS[m]||DEFINITIONS.iberia;}
  function canonicalHotel(h){
    const raw=String(h||'').trim();const k=norm(raw);if(BR_ALIASES.has(k))return BR_ALIASES.get(k);
    const exact=BR_HOTELS.find(x=>norm(x)===k);return exact||raw;
  }
  function hotelMarket(h){
    const k=norm(canonicalHotel(h));
    if(BR_SET.has(k))return 'brasil';
    // aliases e variantes observadas nos ficheiros BR
    if(/^(VG\s+)?(FORTALEZA|SALVADOR|CUMBUCO|RIO DE JANEIRO|TOUROS|MARES|PAULISTA|CABO|ALAGOAS)$/.test(k))return 'brasil';
    if(k.includes('AMAZONIA')||k.includes('OURO PRETO')||k.includes('SUNSET CUMBUCO')||k.includes('ECO RESORT DE ANGRA'))return 'brasil';
    return 'iberia';
  }
  function isBrasil(h){return hotelMarket(h)==='brasil';}
  function isCurrentHotel(h){return hotelMarket(h)===id();}
  function defaultRegions(m=id()){return clone(def(m).regions);}
  function regionLabels(m=id()){return clone(def(m).regionLabels);}
  function regionLabel(key){return def().regionLabels?.[key]||String(key||'');}
  function currency(){return def().currency;}
  function symbol(){return def().symbol;}
  function locale(){return def().locale;}
  function formatNumber(v,d=0){const x=Number(v);return Number.isFinite(x)?x.toLocaleString(locale(),{minimumFractionDigits:d,maximumFractionDigits:d}):'—';}
  function formatMoney(v,d=0,space=true){const x=Number(v);if(!Number.isFinite(x))return '—';const sign=x<0?'-':'';return `${sign}${symbol()}${space?' ':''}${Math.abs(x).toLocaleString(locale(),{minimumFractionDigits:d,maximumFractionDigits:d})}`;}
  function formatMoneyCompact(v,d=1){
    const x=Number(v);if(!Number.isFinite(x))return '—';const a=Math.abs(x),sg=x<0?'-':'';let val=a,suf='';
    if(a>=1e6){val=a/1e6;suf='M';}else if(a>=1e3){val=a/1e3;suf='K';}
    const dec=suf?(a>=1e7?1:d):0;return `${sg}${symbol()}${val.toLocaleString(locale(),{maximumFractionDigits:dec})}${suf}`;
  }
  function moneyUnit(){return symbol();}
  function currentUser(){try{return typeof window.vgAuthCurrent==='function'?window.vgAuthCurrent():null;}catch(e){return null;}}
  function isDirection(){const u=currentUser();return !!u&&['direcao','admin'].includes(String(u.role||'').toLowerCase());}
  function userMarket(){const u=currentUser();if(!u||isDirection())return null;const hs=typeof window.vgAuthHotels==='function'?window.vgAuthHotels():(Array.isArray(u.hotels)?u.hotels:(u.hotel&&u.hotel!=='*'?[u.hotel]:[]));if(!hs.length)return null;const ms=[...new Set(hs.map(hotelMarket))];return ms.length===1?ms[0]:null;}
  function enforceUserMarket(){const m=userMarket();if(m&&DEFINITIONS[m]&&state.current!==m)state.current=m;return state.current;}

  function detectHotels(hotels){
    const arr=(hotels||[]).filter(Boolean);if(!arr.length)return id();
    let br=0,ib=0;arr.forEach(h=>hotelMarket(h)==='brasil'?br++:ib++);return br>ib?'brasil':'iberia';
  }
  function detectDataset(data){return detectHotels(data?.hotel_list||Object.keys(data?.hotels_ops||{}));}
  function detectPurchases(data){
    try{
      const hot=data?.dic?.hoteis||data?.dic?.hot||data?.dic?.HOT||data?.dic?.h||data?.hoteis||[];
      return detectHotels(Array.isArray(hot)?hot:Object.values(hot||{}));
    }catch(e){return id();}
  }

  function filterHotelMap(obj,m){const out={};Object.entries(obj||{}).forEach(([k,v])=>{if(hotelMarket(k)===m)out[k]=clone(v);});return out;}
  function filterDataset(data,m){
    if(!data||typeof data!=='object')return data;
    const out=clone(data);const hotels=(data.hotel_list||Object.keys(data.hotels_ops||{})).filter(h=>hotelMarket(h)===m);
    out.hotel_list=hotels;
    for(const k of ['hotels_ops','hotels_costs','hotels_rev','hotels_nop'])out[k]=filterHotelMap(data[k],m);
    out.market=m;return out;
  }
  function filterRep(rep,m){
    const out={};Object.entries(rep||{}).forEach(([k,v])=>{const arr=Array.isArray(v)?v:[v];const h=arr.find(Boolean)?.hotel||k;if(hotelMarket(h)===m)out[k]=clone(v);});return out;
  }
  function filterOcc(list,m){
    return (list||[]).map(s=>{const data=filterHotelMap(s?.data||{},m);return Object.keys(data).length?Object.assign({},clone(s),{data,market:m}):null;}).filter(Boolean);
  }
  function filterHotelXlsx(x,m){
    const out={};Object.entries(x||{}).forEach(([k,v])=>{if(hotelMarket(v?.hotel||v?.nome||k)===m)out[k]=clone(v);});return out;
  }
  function filterRd(list,m){return (list||[]).map(s=>{const rows=(s.rows||[]).filter(r=>hotelMarket(r.hotel)===m);return rows.length?Object.assign({},clone(s),{rows,market:m}):null;}).filter(Boolean);}
  function filterIg(list,m){
    return (list||[]).map(s=>{const x=clone(s),months={};for(const [mk,hmap] of Object.entries(s?.months||{})){const filtered=filterHotelMap(hmap,m);if(Object.keys(filtered).length)months[mk]=filtered;}x.months=months;x.market=m;return Object.keys(months).length?x:null;}).filter(Boolean);
  }
  function filterNotes(notes,m){return filterHotelMap(notes||{},m);}
  function filterPurchases(cd,m){if(!cd)return null;return detectPurchases(cd)===m?clone(cd):null;}
  function emptySnapshot(){return {version:1,savedAt:new Date().toISOString(),STORE:{},STORE_ACUM:{},REP_STORE:{},OCC_SNAPSHOTS:[],PIU_SNAPSHOTS:[],NOTAS_STORE:{},CD_STORE:null,rtSelected:[],selectedMeses:[],IG_SNAPSHOTS:[],RD_STORE:[],HOTEIS_XLSX:{}};}
  function filterSnapshot(snap,m){
    const s=clone(snap||emptySnapshot());delete s.MARKETS_V31;
    const store={};Object.entries(s.STORE||{}).forEach(([k,v])=>{const d=filterDataset(v,m);if((d?.hotel_list||[]).length)store[k]=d;});s.STORE=store;
    const acum={};Object.entries(s.STORE_ACUM||{}).forEach(([k,v])=>{const d=filterDataset(v,m);if((d?.hotel_list||[]).length)acum[k]=d;});s.STORE_ACUM=acum;
    s.REP_STORE=filterRep(s.REP_STORE,m);s.rtSelected=(s.rtSelected||[]).filter(k=>Object.prototype.hasOwnProperty.call(s.REP_STORE,k));
    s.OCC_SNAPSHOTS=filterOcc(s.OCC_SNAPSHOTS,m);s.PIU_SNAPSHOTS=filterOcc(s.PIU_SNAPSHOTS,m);
    s.IG_SNAPSHOTS=filterIg(s.IG_SNAPSHOTS,m);
    s.NOTAS_STORE=filterNotes(s.NOTAS_STORE,m);
    s.CD_STORE=filterPurchases(s.CD_STORE,m);
    if(s.HOTEIS_XLSX)s.HOTEIS_XLSX=filterHotelXlsx(s.HOTEIS_XLSX,m);
    if(s.RD_STORE)s.RD_STORE=filterRd(s.RD_STORE,m);
    s.market=m;return s;
  }
  function mergeSnapshots(a,b,m){
    const out=filterSnapshot(a||emptySnapshot(),m),src=filterSnapshot(b||emptySnapshot(),m);
    Object.assign(out.STORE,src.STORE);Object.assign(out.STORE_ACUM,src.STORE_ACUM);Object.assign(out.REP_STORE,src.REP_STORE);
    const mergeBy=(x,y,key)=>{const map=new Map();[...(x||[]),...(y||[])].forEach(v=>map.set(String(key(v)),v));return [...map.values()].sort((a,b)=>Number(a.ts||a.id||0)-Number(b.ts||b.id||0));};
    out.OCC_SNAPSHOTS=mergeBy(out.OCC_SNAPSHOTS,src.OCC_SNAPSHOTS,x=>x.id||x.label);out.PIU_SNAPSHOTS=mergeBy(out.PIU_SNAPSHOTS,src.PIU_SNAPSHOTS,x=>x.id||x.label);
    out.IG_SNAPSHOTS=mergeBy(out.IG_SNAPSHOTS,src.IG_SNAPSHOTS,x=>x.id||x.label);
    out.NOTAS_STORE=Object.assign({},out.NOTAS_STORE||{},src.NOTAS_STORE||{});
    if(src.HOTEIS_XLSX)out.HOTEIS_XLSX=Object.assign({},out.HOTEIS_XLSX||{},src.HOTEIS_XLSX);
    if(src.RD_STORE?.length)out.RD_STORE=mergeBy(out.RD_STORE,src.RD_STORE,x=>x.id||x.label);
    if(src.CD_STORE)out.CD_STORE=clone(src.CD_STORE);
    out.selectedMeses=[...new Set([...(out.selectedMeses||[]),...(src.selectedMeses||[])])].map(Number).sort((a,b)=>a-b);
    out.rtSelected=Object.keys(out.REP_STORE);out.savedAt=new Date().toISOString();return out;
  }

  let baseBuild=null,baseRestore=null,baseAutoRestore=null;
  function installSnapshotRouting(){
    if(typeof buildSessionSnapshot==='function'&&!baseBuild){
      baseBuild=buildSessionSnapshot;
      buildSessionSnapshot=function(){
        const raw=baseBuild();const cur=filterSnapshot(raw,id()),other=id()==='iberia'?'brasil':'iberia';const side=filterSnapshot(raw,other);
        if(Object.keys(side.STORE||{}).length||Object.keys(side.REP_STORE||{}).length||(side.OCC_SNAPSHOTS||[]).length||(side.PIU_SNAPSHOTS||[]).length||(side.IG_SNAPSHOTS||[]).length||side.CD_STORE){state.bank[other]=mergeSnapshots(state.bank[other],side,other);}
        state.bank[id()]=cur;
        cur.MARKETS_V31={active:id(),iberia:state.bank.iberia?filterSnapshot(state.bank.iberia,'iberia'):null,brasil:state.bank.brasil?filterSnapshot(state.bank.brasil,'brasil'):null};
        return cur;
      };
    }
    if(typeof restoreFromSnapshot==='function'&&!baseRestore){baseRestore=restoreFromSnapshot;restoreFromSnapshot=function(snap){
      try{const banks=snap?.MARKETS_V31;if(banks){if(banks.iberia)state.bank.iberia=filterSnapshot(banks.iberia,'iberia');if(banks.brasil)state.bank.brasil=filterSnapshot(banks.brasil,'brasil');const um=userMarket();if(!um&&DEFINITIONS[banks.active])state.current=banks.active;}}catch(e){console.warn('V31 restore bancos',e);}
      return baseRestore(filterSnapshot(snap,id()));
    };}
    if(typeof idbAutoRestore==='function'&&!baseAutoRestore){
      baseAutoRestore=idbAutoRestore;
      idbAutoRestore=async function(){enforceUserMarket();const r=await baseAutoRestore();try{captureCurrentAndExtract();applyMarketUi();}catch(e){console.warn('V31 market post-restore',e);}return r;};
    }
  }
  function captureCurrentAndExtract(){
    if(!baseBuild)return;const raw=baseBuild();state.bank[id()]=filterSnapshot(raw,id());const other=id()==='iberia'?'brasil':'iberia';const side=filterSnapshot(raw,other);
    if(Object.keys(side.STORE||{}).length||Object.keys(side.REP_STORE||{}).length||(side.OCC_SNAPSHOTS||[]).length||(side.PIU_SNAPSHOTS||[]).length)state.bank[other]=mergeSnapshots(state.bank[other],side,other);
  }
  function resetSharedCaches(){
    try{if(typeof SHARED_REGIONS_READY!=='undefined')SHARED_REGIONS_READY=false;}catch(e){}
    try{if(typeof RI_SHARED_READY!=='undefined')RI_SHARED_READY=false;}catch(e){}
    try{if(typeof HS_SHARED_LOADED!=='undefined')HS_SHARED_LOADED.clear();}catch(e){}
  }

  function regionButtons(){
    return [
      [...document.querySelectorAll('.sb-region-list .pl-region-btn')],
      [...document.querySelectorAll('#globalFilterBar .pl-region-btn')],
      [...document.querySelectorAll('#rtRegionPanel .pl-region-btn')],
      [...document.querySelectorAll('#plRegionBarOcc .pl-region-btn')]
    ].filter(x=>x.length);
  }
  function applyRegionUi(){
    const labels=regionLabels(),keys=['todos',...Object.keys(def().regions)],icons=id()==='brasil'?['🌐','🏙️','🏖️','◆']:['🌐','🔵','🟢','🟡','🔴'];
    for(const group of regionButtons()){
      group.forEach((b,i)=>{
        const key=keys[i];if(!key){b.style.display='none';return;}b.style.display='';b.dataset.r=key;b.setAttribute('onclick',`selectRegion('${key}')`);b.textContent=`${icons[i]||'•'} ${labels[key]||key}`;b.classList.toggle('active',key===(typeof activeRegion!=='undefined'?activeRegion:'todos'));
      });
    }
    try{
      const reg=defaultRegions();if(typeof REGIOES!=='undefined')REGIOES=reg;
      if(typeof activeRegion!=='undefined' && !['todos',...Object.keys(reg)].includes(activeRegion))activeRegion='todos';
    }catch(e){}
  }
  function installDynamicRegionFunctions(){
    if(typeof selectRegion==='function'&&!window.__VG_V31_SELECT_REGION__){
      window.__VG_V31_SELECT_REGION__=selectRegion;
      selectRegion=function(r){
        if(!['todos',...Object.keys(typeof REGIOES!=='undefined'?REGIOES:{})].includes(r))r='todos';
        activeRegion=r;document.querySelectorAll('.pl-region-btn').forEach(b=>b.classList.toggle('active',b.dataset.r===r));
        if(!RAW){try{if(currentView==='reputacao')rtRender();}catch(e){};window.VG?.events?.emit?.('region:changed',{region:r,market:id()});return;}
        const candidate=r==='todos'?RAW.hotel_list:(REGIOES[r]||[]).filter(h=>RAW.hotel_list.includes(h));const hotels=candidate.filter(h=>typeof window.vgAuthCanAccessHotel!=='function'||window.vgAuthCanAccessHotel(h));selectedHotels=new Set(hotels);
        document.querySelectorAll('.sb-hotel-item[data-hotel]').forEach(p=>p.classList.toggle('on',selectedHotels.has(p.dataset.hotel)));
        try{updateContextPanel();}catch(e){}try{refreshAll();}catch(e){}try{if(currentView==='ocupacao')occRender();}catch(e){}
        window.VG?.events?.emit?.('region:changed',{region:r,market:id(),hotels:hotels.slice()});
      };
    }
    if(typeof syncRegionFromPills==='function'&&!window.__VG_V31_SYNC_REGION__){
      window.__VG_V31_SYNC_REGION__=syncRegionFromPills;
      syncRegionFromPills=function(){
        document.querySelectorAll('.pl-region-btn').forEach(b=>b.classList.remove('active'));let found=null;
        for(const [r,lista] of Object.entries(REGIOES||{})){const hs=lista.filter(h=>RAW?.hotel_list?.includes(h)).filter(h=>typeof window.vgAuthCanAccessHotel!=='function'||window.vgAuthCanAccessHotel(h));if(hs.length===selectedHotels.size&&hs.every(h=>selectedHotels.has(h))){found=r;break;}}
        const scopedAll=RAW?(RAW.hotel_list||[]).filter(h=>typeof window.vgAuthCanAccessHotel!=='function'||window.vgAuthCanAccessHotel(h)):[];activeRegion=found||(RAW&&selectedHotels.size===scopedAll.length&&scopedAll.every(h=>selectedHotels.has(h))?'todos':null);if(activeRegion)document.querySelectorAll(`.pl-region-btn[data-r="${activeRegion}"]`).forEach(b=>b.classList.add('active'));try{updateContextPanel();}catch(e){}
        window.VG?.events?.emit?.('region:changed',{region:activeRegion,market:id()});
      };
    }
  }

  function ensureSelector(){
    if(document.getElementById('vgMarketSwitch'))return;
    const topbar=document.querySelector('.topbar');if(!topbar)return;
    // V31.1: o seletor tem de ser inserido no MESMO pai da âncora.
    // Na V31 tentava-se topbar.insertBefore(wrap, themeDots), mas themeDots
    // é filho de .topbar-right (não filho direto de .topbar), causando
    // NotFoundError e impedindo totalmente a montagem do controlo.
    const host=topbar.querySelector('.topbar-right')||topbar;
    const wrap=document.createElement('div');wrap.id='vgMarketSwitch';wrap.className='vg-market-switch';
    wrap.innerHTML=`<span>Geografia</span><div>${Object.values(DEFINITIONS).map(m=>`<button type="button" data-market="${m.id}"><span class="vg-market-flag">${m.flag}</span><span class="vg-market-label">${m.label}</span></button>`).join('')}</div>`;
    const anchor=host.querySelector('.theme-dots');
    if(anchor&&anchor.parentNode===host)host.insertBefore(wrap,anchor);else host.appendChild(wrap);
    wrap.querySelectorAll('[data-market]').forEach(b=>b.addEventListener('click',()=>switchTo(b.dataset.market)));
    updateSelector();
  }
  function updateSelector(){const um=userMarket();document.querySelectorAll('#vgMarketSwitch [data-market]').forEach(b=>{b.classList.toggle('active',b.dataset.market===id());b.disabled=!!um&&b.dataset.market!==um;b.style.display=!!um&&b.dataset.market!==um?'none':'';});document.documentElement.dataset.vgMarket=id();}
  function marketHasPnl(){
    try{return Object.keys(typeof STORE!=='undefined'&&STORE?STORE:{}).length>0 && !!RAW && Array.isArray(RAW.hotel_list) && RAW.hotel_list.length>0;}catch(e){return false;}
  }
  function marketHasAnyData(){
    try{
      if(Object.keys(typeof STORE!=='undefined'&&STORE?STORE:{}).length)return true;
      if(Object.keys(typeof REP_STORE!=='undefined'&&REP_STORE?REP_STORE:{}).length)return true;
      if((typeof OCC_SNAPSHOTS!=='undefined'&&OCC_SNAPSHOTS?.length)||(typeof PIU_SNAPSHOTS!=='undefined'&&PIU_SNAPSHOTS?.length))return true;
      if((typeof IG_SNAPSHOTS!=='undefined'&&IG_SNAPSHOTS?.length)||(typeof RD_STORE!=='undefined'&&RD_STORE?.length))return true;
      if(typeof cdGetData==='function'&&cdGetData())return true;
    }catch(e){}
    return false;
  }
  function resetMarketDerivedUi(){
    // V31.2: nunca deixar no DOM uma leitura derivada do mercado anterior.
    try{if(window.VG?.operations)window.VG.operations.lastModel=null;}catch(e){}
    try{if(window.VG?.hotelPerformance){window.VG.hotelPerformance.lastModel=null;if(window.VG.hotelPerformance.state)window.VG.hotelPerformance.state.hotel='';}}catch(e){}
    try{if(window.VG?.hotel360?.state){window.VG.hotel360.state.hotel='';window.VG.hotel360.state.hydrated=false;window.VG.hotel360.state.hydrating=false;}}catch(e){}
    try{const hh=document.getElementById('headerHotels');if(hh)hh.textContent='0';const hm=document.getElementById('headerMes');if(hm)hm.textContent='—';}catch(e){}
    const clear=id=>{const el=document.getElementById(id);if(el)el.innerHTML='';};
    try{const h=document.getElementById('hsHotel');if(h)h.innerHTML='';const m=document.getElementById('hsMes');if(m)m.innerHTML='';const d=document.getElementById('hsDiretor');if(d)d.value='';}catch(e){}
    ['hsCards','hsInsights','hsTableBody','hsHistory','opsStats','opsActionStats','opsHealth','kpiGrid','aiGlobalInsights','mainTableBody'].forEach(clear);
    try{const note=document.getElementById('hsAcumNote');if(note){note.style.display='none';note.innerHTML='';}}catch(e){}
    try{const st=document.getElementById('hsMonthStatus');if(st)st.textContent='Comentários: —';}catch(e){}
    try{const meta=document.getElementById('opsMeta');if(meta)meta.textContent=`${def().label} · sem P&L carregado`;const pm=document.getElementById('opsPriorityMeta');if(pm)pm.textContent='Sem dados da geografia';const pr=document.getElementById('opsPriorities');if(pr)pr.innerHTML='<div class="ops-empty">Sem dados da geografia selecionado.</div>';const op=document.getElementById('opsOpportunities');if(op)op.innerHTML='<div class="ops-empty">Sem dados da geografia selecionado.</div>';const aw=document.getElementById('opsActionWatch');if(aw)aw.innerHTML='<div class="ops-empty">Sem dados da geografia selecionado.</div>';}catch(e){}
    try{Object.values(typeof charts!=='undefined'?charts:{}).forEach(c=>{try{c?.destroy?.();}catch(_){}});if(typeof charts!=='undefined')Object.keys(charts).forEach(k=>delete charts[k]);}catch(e){}
  }
  function syncMarketDataUi(){
    const hasPnl=marketHasPnl(),hasAny=marketHasAnyData();
    document.body?.classList.toggle('vg-market-no-pnl',!hasPnl);
    document.body?.classList.toggle('vg-market-empty',!hasAny);
    document.documentElement.dataset.vgMarketHasPnl=hasPnl?'1':'0';
    const hh=document.getElementById('headerHotels');if(hh&&!hasPnl)hh.textContent='0';
    const hm=document.getElementById('headerMes');if(hm&&!hasPnl)hm.textContent='—';
    const badge=document.getElementById('ctxRegionBadge');if(badge&&!hasPnl)badge.textContent=`${def().flag} ${def().label} · sem P&L`;
    const ck=document.getElementById('ctxKpis');if(ck&&!hasPnl)ck.innerHTML='';
    const cm=document.getElementById('ctxMeses');if(cm&&!hasPnl)cm.textContent='—';
    const empty=document.getElementById('emptyState');
    if(empty&&!hasPnl){
      const h2=empty.querySelector('h2'),p=empty.querySelector('p');
      if(h2)h2.textContent=`${def().label}: ainda sem P&L carregado`;
      if(p)p.innerHTML=`Carrega o <strong style="color:var(--gold)">P&L de ${def().label}</strong> no painel lateral.<br>A geografia anterior permanece guardada e não é usada nesta análise.`;
      const nonPnl=new Set(['agenda','compras','datacenter','governance','backup','documents','approvals','reputacao','ocupacao','instagram','revenuehub','hoteis']);
      empty.style.display=nonPnl.has(typeof currentView!=='undefined'?currentView:'resumo')?'none':'block';
    }
    if(hasPnl){
      try{updateContextPanel();}catch(e){}
      if(empty)empty.style.display='none';
    }
    return {hasPnl,hasAny};
  }
  function updateCurrencyLabels(){
    document.querySelectorAll('[data-vg-currency-label]').forEach(el=>el.textContent=symbol());
    try{const defs=window.VG?.targetsRules?.RULE_DEFS;if(Array.isArray(defs)){const g=defs.find(x=>x.id==='gop_neg');if(g)g.unit=symbol();}}catch(e){}
  }
  function currentScopeLabel(){return def().label;}
  function applyMarketUi(){
    applyRegionUi();updateSelector();updateCurrencyLabels();
    try{if(RAW){RAW.hotel_list=(RAW.hotel_list||[]).filter(isCurrentHotel);const hs=RAW.hotel_list.filter(h=>typeof window.vgAuthCanAccessHotel!=='function'||window.vgAuthCanAccessHotel(h));selectedHotels=new Set(hs);initPills();activeRegion='todos';}}
    catch(e){}
    try{buildMesButtons();}catch(e){}try{applyMesSelection();}catch(e){}try{window.VG?.operations2?.renderProfileHome?.();}catch(e){}
    try{syncMarketDataUi();}catch(e){}
    window.VG?.events?.emit?.('market:ui',{market:id(),definition:clone(def())});
  }

  async function refreshOperationalModules(){
    const tasks=[];
    try{if(window.VG?.actions?.ensureLoaded)tasks.push(window.VG.actions.ensureLoaded(true));}catch(e){}
    try{if(window.VG?.agenda?.ensureLoaded)tasks.push(window.VG.agenda.ensureLoaded(true));}catch(e){}
    try{if(window.VG?.documents?.ensureLoaded)tasks.push(window.VG.documents.ensureLoaded(true));}catch(e){}
    try{if(window.VG?.approvals?.ensureLoaded)tasks.push(window.VG.approvals.ensureLoaded(true));}catch(e){}
    try{if(window.VG?.scenarioComparison?.ensureLoaded)tasks.push(window.VG.scenarioComparison.ensureLoaded(true));}catch(e){}
    await Promise.allSettled(tasks);
  }

  async function switchTo(next,opts={}){
    const um=userMarket();if(um&&next!==um){window.showToast?.('O seu perfil está associado a uma unidade de outra geografia.',true);return false;}
    if(!DEFINITIONS[next]||next===id()||state.switching)return false;state.switching=true;
    const prev=id();try{
      captureCurrentAndExtract();state.current=next;try{localStorage.setItem('vg_market_v31',next);}catch(e){}
      resetMarketDerivedUi();
      resetSharedCaches();try{REGIOES=defaultRegions(next);activeRegion='todos';}catch(e){}
      updateSelector();applyRegionUi();window.VG?.events?.emit?.('market:before-change',{from:prev,to:next});
      if(state.bank[next]){baseRestore?baseRestore(filterSnapshot(state.bank[next],next)):restoreFromSnapshot(filterSnapshot(state.bank[next],next));}
      else{
        const side=state.bank[next];baseRestore?baseRestore(emptySnapshot()):restoreFromSnapshot(emptySnapshot());
        let loaded=false;try{loaded=await fetchSharedData(false);}catch(e){console.warn('V31 fetch geografia',e);}
        const remote=baseBuild?filterSnapshot(baseBuild(),next):emptySnapshot();state.bank[next]=side?mergeSnapshots(remote,side,next):remote;state.loaded[next]=!!loaded;
        if(side){baseRestore?baseRestore(state.bank[next]):restoreFromSnapshot(state.bank[next]);}
      }
      applyMarketUi();await refreshOperationalModules();
      try{await window.VG?.targetsRules?.load?.(true);}catch(e){}
      try{if(typeof sharedLoadRegions==='function')await sharedLoadRegions(true);}catch(e){}applyRegionUi();
      try{syncMarketDataUi();}catch(e){}try{refreshAll();}catch(e){}try{syncMarketDataUi();}catch(e){}window.VG?.events?.emit?.('market:changed',{from:prev,to:next,market:next});
      window.showToast?.(`${def(next).flag} Geografia alterada para ${def(next).label} · moeda ${def(next).currency}`);return true;
    }finally{state.switching=false;}
  }

  function routePnlImport(data,fileName,tipo){
    if(window._vgMarketImportRouting)return false;const detected=detectDataset(data);if(detected===id())return false;
    window._vgMarketImportRouting=true;(async()=>{try{await switchTo(detected);pnlAplicar(data,fileName,tipo);}finally{window._vgMarketImportRouting=false;}})();return true;
  }
  async function ensureMarketForPurchases(data){const detected=detectPurchases(data);if(detected!==id())await switchTo(detected);return detected;}

  function installFichaCurrencyAdapter(){
    try{
      if(typeof window.hsFmtVal==='function'&&!window.__VG_V31_HS_FMT__){const old=window.hsFmtVal;window.__VG_V31_HS_FMT__=old;window.hsFmtVal=function(v,type){if(type==='eur2')return formatMoney(v,2,false);if(type==='eur')return formatMoney(v,0,false);return old(v,type);};}
    }catch(e){}
  }

  function repartitionMixedState(){
    if(!baseBuild||!baseRestore)return;
    try{captureCurrentAndExtract();const cur=state.bank[id()]||filterSnapshot(baseBuild(),id());baseRestore(cur);applyMarketUi();}
    catch(e){console.warn('V31 repartição de dados mistos',e);}
  }
  function installMixedImportAdapters(){
    const wrapAsync=(name)=>{try{const old=window[name]||eval('typeof '+name+"==='function'?"+name+':null');if(typeof old!=='function'||window['__VG_V31_'+name])return;window['__VG_V31_'+name]=old;const wrapped=async function(...args){const r=await old.apply(this,args);repartitionMixedState();return r;};window[name]=wrapped;try{eval(name+'=wrapped');}catch(e){}}catch(e){}};
    wrapAsync('rtLoadFiles');wrapAsync('occLoadFile');wrapAsync('igLoadFile');
    try{if(typeof piuLoadFile==='function'&&!window.__VG_V31_piuLoadFile){const old=piuLoadFile;window.__VG_V31_piuLoadFile=old;piuLoadFile=function(...args){const r=old.apply(this,args);setTimeout(repartitionMixedState,500);return r;};window.piuLoadFile=piuLoadFile;}}catch(e){}
  }

  function init(){enforceUserMarket();installSnapshotRouting();installDynamicRegionFunctions();installMixedImportAdapters();ensureSelector();applyMarketUi();installFichaCurrencyAdapter();state.initialized=true;setTimeout(()=>{const before=id();enforceUserMarket();if(before!==id()){updateSelector();applyMarketUi();}},1200);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.VG?.events?.on?.('state:changed',()=>setTimeout(()=>{try{syncMarketDataUi();}catch(e){}},0));
  window.VG?.events?.on?.('market:before-change',()=>{try{resetMarketDerivedUi();}catch(e){}});

  window.VG.market={version:31.2,state,DEFINITIONS,BR_HOTELS:BR_HOTELS.slice(),id,def,hotelMarket,isBrasil,isCurrentHotel,canonicalHotel,defaultRegions,regionLabels,regionLabel,currency,symbol,locale,formatNumber,formatMoney,formatMoneyCompact,moneyUnit,currentUser,isDirection,userMarket,enforceUserMarket,detectHotels,detectDataset,detectPurchases,filterSnapshot,mergeSnapshots,switchTo,routePnlImport,ensureMarketForPurchases,currentScopeLabel,applyMarketUi,ensureSelector,marketHasPnl,marketHasAnyData,syncMarketDataUi,resetMarketDerivedUi};
  window.vgCurrencySymbol=()=>symbol();window.vgFormatMoney=(v,d=0,space=false)=>formatMoney(v,d,space);window.vgFormatMoneyCompact=(v,d=1)=>formatMoneyCompact(v,d);
})();
