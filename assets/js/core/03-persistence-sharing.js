// ==========================================================
// PERSISTÊNCIA — IndexedDB + Export/Import JSON
// ==========================================================
const IDB_NAME    = 'VG_Dashboard_PL';
const IDB_VERSION = 1;
const IDB_STORE   = 'session';

function idbOpen() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE);
    req.onsuccess = e => res(e.target.result);
    req.onerror   = e => rej(e.target.error);
  });
}

function idbPut(db, key, value) {
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => res();
    tx.onerror = e => rej(e.target.error);
  });
}

function idbGet(db, key) {
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = e => res(e.target.result);
    req.onerror   = e => rej(e.target.error);
  });
}

function idbDelete(db, key) {
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(key);
    tx.oncomplete = () => res();
    tx.onerror = e => rej(e.target.error);
  });
}

function idbClear(db) {
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).clear();
    tx.oncomplete = () => res();
    tx.onerror = e => rej(e.target.error);
  });
}

function idbSetStatus(msg) {
  const el = document.getElementById('idbStatus');
  if (el) el.textContent = msg;
}

function buildSessionSnapshot() {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    STORE: JSON.parse(JSON.stringify(STORE)),
    STORE_ACUM: JSON.parse(JSON.stringify(STORE_ACUM)),
    REP_STORE: JSON.parse(JSON.stringify(REP_STORE)),
    OCC_SNAPSHOTS: JSON.parse(JSON.stringify(OCC_SNAPSHOTS || [])),
    PIU_SNAPSHOTS: JSON.parse(JSON.stringify(PIU_SNAPSHOTS || [])),
    NOTAS_STORE: JSON.parse(JSON.stringify(NOTAS_STORE || {})),
    CD_STORE: (typeof cdGetData==='function' ? cdGetData() : null),
    rtSelected: [...rtSelected],
    selectedMeses: [...selectedMeses],
  };
}

function restoreFromSnapshot(snap) {
  if (!snap) { showToast('Sessão inválida', true); return; }
  // Accept version 1 or any snapshot with STORE data (for compatibility)
  if (snap.version && snap.version !== 1 && !snap.STORE) { showToast('Formato de sessão incompatível', true); return; }

  // Restore STORE — começa vazio (sem dados embutidos); a sessão é a fonte
  Object.keys(STORE).forEach(k => delete STORE[k]);
  Object.entries(snap.STORE || {}).forEach(([k, v]) => { STORE[Number(k)] = v; });
  // Restore STORE_ACUM (P&L acumulado oficial por mês de referência)
  Object.keys(STORE_ACUM).forEach(k => delete STORE_ACUM[k]);
  Object.entries(snap.STORE_ACUM || {}).forEach(([k, v]) => { STORE_ACUM[Number(k)] = v; });

  // Restore REP_STORE
  Object.keys(REP_STORE).forEach(k => delete REP_STORE[k]);
  Object.assign(REP_STORE, snap.REP_STORE || {});
  rtSelected.clear();
  (snap.rtSelected || []).forEach(k => rtSelected.add(k));
  if (typeof rtNormalizeStore === 'function') rtNormalizeStore();
  if (typeof cdSetData==='function') cdSetData(snap.CD_STORE || null);

  // Restore OCC_SNAPSHOTS
  if (snap.OCC_SNAPSHOTS) { OCC_SNAPSHOTS = snap.OCC_SNAPSHOTS; if (typeof occSortSnapshots === 'function') occSortSnapshots(); }

  // Restore PIU_SNAPSHOTS (referência 2025)
  if (snap.PIU_SNAPSHOTS) {
    PIU_SNAPSHOTS = snap.PIU_SNAPSHOTS;
    piuSaveToDB();
    piuRefreshChips();
    piuPopulateHotelSel();
  }

  // Restore NOTAS_STORE
  if (snap.NOTAS_STORE) NOTAS_STORE = snap.NOTAS_STORE;

  // Restore selected months — fallback to highest available
  selectedMeses.clear();
  if (snap.selectedMeses && snap.selectedMeses.length) {
    snap.selectedMeses.forEach(m => selectedMeses.add(Number(m)));
  } else {
    const available = Object.keys(STORE).map(Number);
    if (available.length) selectedMeses.add(Math.max(...available));
  }

  // Rebuild UI — reset to resumo to avoid null element access in other views
  currentView = 'resumo';
  try { buildMesButtons(); } catch(e) { console.warn('buildMesButtons:', e); }
  try { applyMesSelection(); } catch(e) { console.warn('applyMesSelection:', e); }
  try { if (typeof setView === 'function') setView('resumo'); } catch(e) { console.warn('setView:', e); }
  document.getElementById('globalFilterBar')?.classList.toggle('visible', !!RAW);
  window.VG?.state?.changed('snapshot-restored');
}

async function idbSaveAll() {
  try {
    const db = await idbOpen();
    const snap = buildSessionSnapshot();
    await idbPut(db, 'session', snap);
    db.close();
    const meses = Object.keys(snap.STORE).length;
    const hoteis = Object.keys(snap.REP_STORE).length;
    const dt = new Date().toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'});
    idbSetStatus(`✓ Guardado às ${dt} · ${meses} mês(es) P&L · ${hoteis} hotel(is) reputação`);
    showToast(`✓ Sessão guardada — ${meses} meses P&L, ${hoteis} hotéis reputação`);
    lastSavedFingerprint = snapshotFingerprint(); // limpa o aviso de "alterações não guardadas"
    publishSharedData(false); // também publica para todos, em segundo plano
  } catch(e) {
    showToast('Erro ao guardar: ' + e.message, true);
  }
}

// ==========================================================
// AVISO DE ALTERAÇÕES NÃO GUARDADAS AO FECHAR A JANELA
// ==========================================================
// Compara um "retrato" leve dos dados atuais com o retrato de quando se gravou
// pela última vez (idbSaveAll / carregamento inicial). Se forem diferentes,
// avisa antes de fechar/recarregar a página.
let lastSavedFingerprint = null;

function snapshotFingerprint() {
  try {
    return JSON.stringify({
      STORE, REP_STORE,
      OCC_SNAPSHOTS: OCC_SNAPSHOTS || [],
      PIU_SNAPSHOTS: PIU_SNAPSHOTS || [],
      NOTAS_STORE: NOTAS_STORE || {},
      CD: (typeof cdGetData === 'function' ? cdGetData() : null),
      IG: (typeof IG_SNAPSHOTS !== 'undefined' ? IG_SNAPSHOTS : []),
      HX: (typeof HOTEIS_XLSX !== 'undefined' ? HOTEIS_XLSX : {}),
      RD: (typeof RD_STORE !== 'undefined' ? RD_STORE : []),
      rtSelected: [...rtSelected],
      selectedMeses: [...selectedMeses]
    });
  } catch(e) { return null; }
}

window.addEventListener('beforeunload', function(e) {
  try {
    if (lastSavedFingerprint === null) return; // ainda não há nada carregado/comparável
    const atual = snapshotFingerprint();
    if (atual !== null && atual !== lastSavedFingerprint) {
      e.preventDefault();
      e.returnValue = 'Tens alterações não guardadas neste dashboard. Se saíres agora, podes perdê-las. Clica em "Guardar no browser" antes de fechar.';
      return e.returnValue;
    }
  } catch(err) { /* nunca bloquear o fecho por causa de um erro aqui */ }
});

async function idbLoadAll() {
  try {
    const db = await idbOpen();
    const snap = await idbGet(db, 'session');
    db.close();
    if (!snap) { showToast('Não há sessão guardada neste browser', true); return; }
    restoreFromSnapshot(snap);
    const meses = Object.keys(STORE).length;
    const hoteis = Object.keys(REP_STORE).length;
    const dt = snap.savedAt ? new Date(snap.savedAt).toLocaleString('pt-PT') : '—';
    idbSetStatus(`✓ Restaurado · guardado em ${dt}`);
    showToast(`✓ Sessão restaurada — ${meses} meses P&L, ${hoteis} hotéis reputação`);
  } catch(e) {
    console.warn('[idbAutoRestore] Erro ao restaurar:', e);
    // Não apagar a sessão — pode ser um erro de rendering temporário
  }
}

async function idbClearAll() {
  if (!confirm('Apagar todos os dados guardados no browser?\n\nEsta acção não pode ser desfeita.')) return;
  try {
    const db = await idbOpen();
    await idbClear(db);
    db.close();
    idbSetStatus('');
    showToast('Dados do browser apagados');
  } catch(e) {
    showToast('Erro ao limpar: ' + e.message, true);
  }
}

function exportSession() {
  const snap = buildSessionSnapshot();
  const json = JSON.stringify(snap, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const dt   = new Date().toISOString().slice(0,10);
  a.href     = url;
  a.download = `VG_Dashboard_Sessao_${dt}.json`;
  a.click();
  URL.revokeObjectURL(url);
  const meses  = Object.keys(snap.STORE).length;
  const hoteis = Object.keys(snap.REP_STORE).length;
  showToast(`✓ Sessão exportada — ${meses} meses P&L, ${hoteis} hotéis reputação`);
}

function importSession(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;

  const finishImport = (snap) => {
    restoreFromSnapshot(snap);
    const meses  = Object.keys(STORE).length;
    const hoteis = Object.keys(REP_STORE).length;
    const dt = snap.savedAt ? new Date(snap.savedAt).toLocaleString('pt-PT') : '—';
    idbSetStatus(`✓ Importado de ficheiro · guardado em ${dt}`);
    showToast(`✓ Sessão importada — ${meses} meses P&L, ${hoteis} hotéis reputação`);
    window.VG?.state?.changed('session-imported', { source: file.name || 'ficheiro' });
  };
  const failImport = (err) => {
    const loaded = Object.keys(STORE).length > 0 || Object.keys(REP_STORE).length > 0;
    if (loaded) {
      console.warn('Aviso ao importar (dados carregados):', err);
      showToast('Dados importados com avisos — verifique se tudo está correcto.');
    } else {
      showToast('Erro ao importar sessão: ' + err.message, true);
    }
  };

  const reader = new FileReader();
  if (String(file.name || '').toLowerCase().endsWith('.zip')) {
    reader.onload = e => {
      try {
        if (!window.fflate || typeof window.fflate.unzipSync !== 'function') throw new Error('Leitor ZIP não carregado.');
        const files = window.fflate.unzipSync(new Uint8Array(e.target.result));
        const jsonName = Object.keys(files).find(k => /\.json$/i.test(k));
        if (!jsonName) throw new Error('O ZIP não contém ficheiro JSON de sessão.');
        finishImport(JSON.parse(window.fflate.strFromU8(files[jsonName])));
      } catch(err) { failImport(err); }
    };
    reader.readAsArrayBuffer(file);
  } else {
    reader.onload = e => {
      try { finishImport(JSON.parse(e.target.result)); }
      catch(err) { failImport(err); }
    };
    reader.readAsText(file);
  }
  try { event.target.value = ''; } catch(e) {}
}

// Auto-restauro silencioso ao arrancar
async function idbAutoRestore() {
  // 1) Tenta primeiro os dados partilhados no servidor — para que todos vejam o mesmo.
  const gotFromServer = await fetchSharedData(false);
  if (gotFromServer) { lastSavedFingerprint = snapshotFingerprint(); return; }

  // 2) Sem servidor disponível/sem dados lá — usa a sessão guardada neste browser.
  try {
    const db = await idbOpen();
    const snap = await idbGet(db, 'session');
    db.close();
    if (!snap) { lastSavedFingerprint = snapshotFingerprint(); return; }

    // Restaurar sempre que exista sessão válida guardada, mesmo que só contenha meses base.
    const hasStore = Object.keys(snap.STORE || {}).length > 0;
    const hasRep   = Object.keys(snap.REP_STORE || {}).length > 0;
    const hasOcc   = (snap.OCC_SNAPSHOTS || []).length > 0;
    const hasNotas = Object.keys(snap.NOTAS_STORE || {}).length > 0;
    if (!hasStore && !hasRep && !hasOcc && !hasNotas) { lastSavedFingerprint = snapshotFingerprint(); return; }

    restoreFromSnapshot(snap);
    const meses  = Object.keys(STORE).length;
    const hoteis = Object.keys(REP_STORE).length;
    const dt = snap.savedAt ? new Date(snap.savedAt).toLocaleString('pt-PT') : '—';
    idbSetStatus(`✓ Auto-restauro · ${meses} meses P&L · ${hoteis} hotéis rep. · guardado ${dt}`);
    showToast(`✓ Sessão restaurada — ${meses} meses P&L, ${hoteis} hotéis reputação`);
  } catch(e) {
    console.warn('[idbAutoRestore] erro:', e);
    // Silently fail — first run or private browsing
  }
  lastSavedFingerprint = snapshotFingerprint();
}

// ==========================================================
// DADOS PARTILHADOS (Netlify Blobs) — mesmos dados para todos
// ==========================================================
// Os dados de P&L (STORE) e reputação (REP_STORE) são publicados em pedaços — um
// pedido por mês, um pedido por hotel — para nunca se aproximarem do limite do
// Netlify (~6MB por pedido), mesmo com 2+ anos de dados acumulados.
let lastSharedMetaSavedAt = null;

function setSharedSyncStatus(text, isWarning) {
  const el = document.getElementById('sharedSyncStatus');
  if (el) { el.textContent = text; el.style.color = isWarning ? '#a15c00' : ''; }
  // Espelha o progresso no pop-up flutuante, se estiver visível
  const pop = document.getElementById('vgLoadPop');
  if (pop && pop.classList.contains('show') && text) {
    const sub = document.getElementById('vgLoadPopSub');
    const title = document.getElementById('vgLoadPopTitle');
    if (sub) sub.textContent = text.replace(/\.\.\.$/, '…');
    if (title) {
      if (/✓|Sincronizado/i.test(text)) title.textContent = 'Quase pronto…';
      else if (/custos|compras/i.test(text)) title.textContent = 'A carregar custos e compras…';
      else if (/mês|meses|hotel/i.test(text)) title.textContent = 'A carregar dados…';
    }
  }
}

function sharedUrl(resource, key) {
  let u = window.SHARED_API_URL + '?resource=' + encodeURIComponent(resource);
  if (key !== undefined && key !== null) u += '&key=' + encodeURIComponent(key);
  const market = window.VG?.market?.id?.() || 'iberia';
  u += '&market=' + encodeURIComponent(market);
  return u;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Repete uma operação de rede algumas vezes antes de desistir — falhas isoladas
// (arranque a frio da função, pico de pedidos em paralelo) resolvem-se sozinhas.
async function withRetry(fn, tries) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (err) { lastErr = err; if (i < tries - 1) await sleep(800 * (i + 1)); }
  }
  throw lastErr;
}

function sharedAuthToken(){
  try {
    if (typeof window.vgAuthToken === 'function') return window.vgAuthToken() || '';
    return sessionStorage.getItem('vg_auth_token_v6') || '';
  } catch(e){ return ''; }
}
function sharedAuthOptions(url, options){
  const out = Object.assign({}, options || {});
  if (String(url || '').startsWith(window.SHARED_API_URL)) {
    const token = sharedAuthToken();
    const headers = Object.assign({}, out.headers || {});
    if (token) headers.Authorization = 'Bearer ' + token;
    out.headers = headers;
  }
  return out;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, Object.assign({}, sharedAuthOptions(url, options), { signal: controller.signal }));
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('demorou demasiado tempo a responder (timeout)');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function sharedGet(resource, key) {
  if (!sharedAuthToken()) throw new Error('Sessão não iniciada.');
  return withRetry(async () => {
    const res = await fetchWithTimeout(sharedUrl(resource, key), { method: 'GET', cache: 'no-store' }, 15000);
    if (!res.ok) {
      const info = await res.json().catch(()=>({}));
      if (res.status === 401 && typeof window.vgAuthHandleUnauthorized === 'function') window.vgAuthHandleUnauthorized();
      throw new Error(`[GET ${resource}${key?(' '+key):''}] ` + (info.error || ('HTTP ' + res.status)));
    }
    return res.json();
  }, 3);
}

async function sharedPost(resource, key, payload) {
  if (!sharedAuthToken()) throw new Error('Sessão não iniciada.');
  const json = JSON.stringify(payload);
  const sizeMB = new Blob([json]).size / (1024*1024);
  if (sizeMB > 5.5) {
    throw new Error(`Pedaço "${resource}${key?(' '+key):''}" tem ${sizeMB.toFixed(1)}MB — acima do limite (~6MB). Reduz o conteúdo desse mês/hotel.`);
  }
  const isCD = resource === 'cdbatch';
  const timeoutMs = isCD ? 30000 : 20000;
  const tries = isCD ? 5 : 3;
  return withRetry(async () => {
    const res = await fetchWithTimeout(sharedUrl(resource, key), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json
    }, timeoutMs);
    if (!res.ok) {
      const info = await res.json().catch(()=>({}));
      if (res.status === 401 && typeof window.vgAuthHandleUnauthorized === 'function') window.vgAuthHandleUnauthorized();
      throw new Error(`[POST ${resource}${key?(' '+key):''}] ` + (info.error || ('HTTP ' + res.status)));
    }
    return res.json();
  }, tries);
}

// API partilhada canónica para novos módulos (v5).
window.VG = window.VG || {};
window.VG.shared = Object.assign(window.VG.shared || {}, {
  endpoint: window.SHARED_API_URL,
  url: sharedUrl,
  get: sharedGet,
  post: sharedPost
});


// ==========================================================
// DADOS OPERACIONAIS PARTILHADOS — configurações e Ficha Hotel
// ==========================================================
// Fonte de verdade: Netlify Blobs. O localStorage só é lido uma vez para migrar
// instalações antigas; após sincronização, as chaves antigas são removidas.
let SHARED_REGIONS_READY = false;
let RI_SHARED_EVENTS = '';
let RI_SHARED_READY = false;
const HS_SHARED_CACHE = Object.create(null);
const HS_SHARED_LOADED = new Set();
const HS_SHARED_DIRTY = Object.create(null);
const HS_SHARED_TIMERS = Object.create(null);
const HS_SHARED_LEGACY_KEYS = Object.create(null);
const HS_SHARED_LEGACY_ITEMS = Object.create(null);
const HS_SHARED_FETCHED_AT = Object.create(null);
const HS_SHARED_REFRESH_MS = 30000;

function sharedClone(v){ return v == null ? v : JSON.parse(JSON.stringify(v)); }
function sharedPlainObject(v){ return !!v && typeof v === 'object' && !Array.isArray(v); }
function sharedHasOwn(o,k){ return Object.prototype.hasOwnProperty.call(o || {}, k); }
function sharedCurrentUserMeta(){
  try {
    const u = (typeof window.vgAuthCurrent === 'function') ? window.vgAuthCurrent() : null;
    return u ? {user:u.user||'', name:u.name||'', role:u.role||'', hotel:u.hotel||''} : null;
  } catch(e){ return null; }
}
function sharedLegacyMigrationAllowed(){
  // V31: todos os dados locais históricos pertencem ao universo PT+ES.
  // Nunca os migrar automaticamente para Brasil.
  try { return (window.VG?.market?.id?.() || 'iberia') === 'iberia'; }
  catch(e){ return true; }
}

function sharedRegionsValid(r){
  if(!sharedPlainObject(r)) return false;
  const expected=Object.keys(window.VG?.market?.defaultRegions?.() || REGIOES_DEFAULT);
  return expected.length>0 && expected.every(k => Array.isArray(r[k]));
}

async function sharedSaveRegions(r){
  try {
    const payload = sharedClone(r || window.VG?.market?.defaultRegions?.() || REGIOES_DEFAULT);
    await sharedPost('settings','regions',{version:1, regions:payload, updatedAt:new Date().toISOString(), updatedBy:sharedCurrentUserMeta()});
    REGIOES = payload;
    SHARED_REGIONS_READY = true;
    try { if(sharedLegacyMigrationAllowed()) localStorage.removeItem('vg_regioes_custom'); } catch(e) {}
    return true;
  } catch(e) {
    console.warn('Não foi possível guardar as regiões no servidor partilhado.', e);
    return false;
  }
}

async function sharedLoadRegions(force){
  if(SHARED_REGIONS_READY && !force) return true;
  let legacy = null;
  try {
    if(sharedLegacyMigrationAllowed()){
      const raw = localStorage.getItem('vg_regioes_custom');
      if(raw) { const parsed=JSON.parse(raw); if(sharedRegionsValid(parsed)) legacy=parsed; }
    }
  } catch(e) {}
  try {
    const res = await sharedGet('settings','regions');
    const remote = res && res.data;
    const regions = sharedRegionsValid(remote?.regions) ? remote.regions : (sharedRegionsValid(remote) ? remote : null);
    if(regions){
      REGIOES = sharedClone(regions);
      SHARED_REGIONS_READY = true;
      try {
        // Só elimina a configuração local antiga quando coincide com a versão oficial.
        // Se diferir, mantém-na temporariamente para não perder uma possível alteração não migrada.
        if(sharedLegacyMigrationAllowed() && (!legacy || JSON.stringify(legacy)===JSON.stringify(regions))) localStorage.removeItem('vg_regioes_custom');
        else console.warn('Migração de regiões: existe uma configuração local diferente da versão partilhada; foi preservada para revisão.');
      } catch(e) {}
      return true;
    }
    // Primeira execução desta versão: publica a configuração local antiga, se existir;
    // caso contrário publica a configuração base.
    REGIOES = sharedClone(legacy || window.VG?.market?.defaultRegions?.() || REGIOES_DEFAULT);
    return await sharedSaveRegions(REGIOES);
  } catch(e){
    if(legacy) REGIOES = sharedClone(legacy);
    console.warn('Regiões partilhadas indisponíveis; a usar configuração desta sessão.', e);
    return false;
  }
}

async function sharedSaveRevenueEvents(text){
  try {
    const payload={version:1,text:String(text||''),updatedAt:new Date().toISOString(),updatedBy:sharedCurrentUserMeta()};
    await sharedPost('settings','revenue-events',payload);
    RI_SHARED_EVENTS=payload.text;
    RI_SHARED_READY=true;
    try { if(sharedLegacyMigrationAllowed()) localStorage.removeItem('vg_ri_events'); } catch(e) {}
    return true;
  } catch(e){
    console.warn('Não foi possível guardar os eventos de Revenue Intelligence.',e);
    return false;
  }
}

async function sharedLoadRevenueEvents(force){
  if(RI_SHARED_READY && !force) return true;
  let legacy='';
  try { if(sharedLegacyMigrationAllowed()) legacy=localStorage.getItem('vg_ri_events')||''; } catch(e) {}
  try {
    const res=await sharedGet('settings','revenue-events');
    const remote=res&&res.data;
    if(remote!=null){
      RI_SHARED_EVENTS=typeof remote==='string'?remote:String(remote.text||'');
      RI_SHARED_READY=true;
      try {
        if(sharedLegacyMigrationAllowed() && (!legacy || legacy===RI_SHARED_EVENTS)) localStorage.removeItem('vg_ri_events');
        else console.warn('Migração RI: existem eventos locais diferentes da versão partilhada; foram preservados para revisão.');
      } catch(e) {}
    } else if(legacy){
      RI_SHARED_EVENTS=legacy;
      await sharedSaveRevenueEvents(legacy);
    } else {
      RI_SHARED_EVENTS='';
      RI_SHARED_READY=true;
    }
    const input=document.getElementById('riEventsInput');
    if(input) input.value=RI_SHARED_EVENTS;
    try { if(typeof riRenderEvents==='function') riRenderEvents(); } catch(e) {}
    return true;
  } catch(e){
    RI_SHARED_EVENTS=legacy;
    RI_SHARED_READY=false;
    console.warn('Eventos partilhados indisponíveis; a usar dados desta sessão.',e);
    return false;
  }
}

function hsSharedYear(){ return String((typeof YR_CUR!=='undefined' && YR_CUR) ? YR_CUR : new Date().getFullYear()); }
function hsEmptyShared(h){ return {version:2,hotel:h||'',director:'',comments:{},manual:{},updatedAt:null,updatedBy:null}; }
function hsNormalizeShared(data,h){
  const out=hsEmptyShared(h);
  if(!sharedPlainObject(data)) return out;
  out.version=2;
  out.hotel=data.hotel||h||'';
  out.director=String(data.director||'');
  out.comments=sharedPlainObject(data.comments)?sharedClone(data.comments):{};
  out.manual=sharedPlainObject(data.manual)?sharedClone(data.manual):{};
  out.updatedAt=data.updatedAt||null;
  out.updatedBy=data.updatedBy||null;
  return out;
}
function hsGetPath(root, parts){
  let cur=root;
  for(const k of parts){ if(!sharedPlainObject(cur) || !sharedHasOwn(cur,k)) return undefined; cur=cur[k]; }
  return cur;
}
function hsSetPath(root,parts,value){
  let cur=root;
  for(let i=0;i<parts.length-1;i++){ const k=String(parts[i]); if(!sharedPlainObject(cur[k])) cur[k]={}; cur=cur[k]; }
  cur[String(parts[parts.length-1])]=value;
}
function hsMergePatch(base,patch){
  const out=hsNormalizeShared(base,base?.hotel||patch?.hotel||'');
  if(sharedHasOwn(patch,'director')) out.director=String(patch.director||'');
  for(const rootName of ['comments','manual']){
    const root=patch?.[rootName]; if(!sharedPlainObject(root)) continue;
    const walk=(node,path)=>{
      Object.entries(node||{}).forEach(([k,v])=>{
        if(sharedPlainObject(v)) walk(v,path.concat(k));
        else hsSetPath(out[rootName],path.concat(k),v);
      });
    };
    walk(root,[]);
  }
  return out;
}
function hsPatchEmpty(p){
  if(!p) return true;
  if(sharedHasOwn(p,'director')) return false;
  return !Object.keys(p.comments||{}).length && !Object.keys(p.manual||{}).length;
}
function hsMergeDirty(a,b){
  const out=sharedClone(a||{});
  if(sharedHasOwn(b,'director')) out.director=b.director;
  for(const root of ['comments','manual']){
    if(!sharedPlainObject(b?.[root])) continue;
    if(!sharedPlainObject(out[root])) out[root]={};
    const walk=(node,path)=>Object.entries(node||{}).forEach(([k,v])=>{
      if(sharedPlainObject(v)) walk(v,path.concat(k)); else hsSetPath(out[root],path.concat(k),v);
    });
    walk(b[root],[]);
  }
  return out;
}
function hsLegacyHotels(){
  const out=new Set();
  try {
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i); if(!k) continue;
      for(const prefix of ['vg_hs_comment__','vg_hs_value__','vg_hs_director__']){
        if(!k.startsWith(prefix)) continue;
        const rest=k.slice(prefix.length);
        const hotel=prefix==='vg_hs_director__' ? rest : rest.split('__')[0];
        if(hotel) out.add(hotel);
      }
    }
  } catch(e) {}
  return [...out];
}
function hsLegacyForHotel(h){
  const patch={comments:{},manual:{}};
  const keys=[];
  const items=[];
  const year=hsSharedYear();
  try {
    const dk=`vg_hs_director__${h}`;
    const dv=localStorage.getItem(dk);
    if(dv!=null){ patch.director=dv; keys.push(dk); items.push({key:dk,type:'director',path:[],value:String(dv)}); }
    const cp=`vg_hs_comment__${h}__`;
    const mp=`vg_hs_value__${h}__`;
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i); if(!k) continue;
      if(k.startsWith(cp)){
        const parts=k.slice(cp.length).split('__');
        const m=parts[0], row=parts.slice(1).join('__');
        if(m&&row){ const value=localStorage.getItem(k)||''; const path=[year,String(m),row]; hsSetPath(patch.comments,path,value); keys.push(k); items.push({key:k,type:'comments',path,value:String(value)}); }
      } else if(k.startsWith(mp)){
        const parts=k.slice(mp.length).split('__');
        const m=parts[0], row=parts[1], field=parts.slice(2).join('__');
        if(m&&row&&field){ const value=localStorage.getItem(k)||''; const path=[year,String(m),row,field]; hsSetPath(patch.manual,path,value); keys.push(k); items.push({key:k,type:'manual',path,value:String(value)}); }
      }
    }
  } catch(e) {}
  return {patch,keys,items};
}
function hsLegacyMissingPatch(base,legacy){
  const out={comments:{},manual:{}};
  if(sharedHasOwn(legacy,'director') && !String(base.director||'').trim()) out.director=legacy.director;
  for(const root of ['comments','manual']){
    const walk=(node,path)=>Object.entries(node||{}).forEach(([k,v])=>{
      if(sharedPlainObject(v)) walk(v,path.concat(k));
      else if(hsGetPath(base[root]||{},path.concat(k))===undefined) hsSetPath(out[root],path.concat(k),v);
    });
    walk(legacy[root]||{},[]);
  }
  return out;
}
function hsClearLegacyKeys(h){
  const items=HS_SHARED_LEGACY_ITEMS[h]||[];
  const data=HS_SHARED_CACHE[h]||hsEmptyShared(h);
  const kept=[];
  try {
    items.forEach(item=>{
      let serverVal;
      if(item.type==='director') serverVal=String(data.director||'');
      else serverVal=hsGetPath(data[item.type]||{},item.path);
      if(serverVal!==undefined && String(serverVal)===String(item.value)) localStorage.removeItem(item.key);
      else kept.push(item);
    });
  } catch(e) { kept.push(...items); }
  HS_SHARED_LEGACY_ITEMS[h]=kept;
  HS_SHARED_LEGACY_KEYS[h]=kept.map(x=>x.key);
  if(kept.length) console.warn(`Migração da Ficha ${h}: ${kept.length} valor(es) local(is) diferem do servidor e foram preservados para revisão.`);
}
function hsEnsureCache(h){
  if(!HS_SHARED_CACHE[h]) HS_SHARED_CACHE[h]=hsEmptyShared(h);
  return HS_SHARED_CACHE[h];
}
async function hsEnsureHotelLoaded(h,force){
  if(!h) return hsEmptyShared('');
  const already=HS_SHARED_LOADED.has(h);
  const fresh=already && !force && (Date.now()-(HS_SHARED_FETCHED_AT[h]||0) < HS_SHARED_REFRESH_MS);
  if(fresh) return hsEnsureCache(h);
  let remote=null, gotRemote=false;
  try { const res=await sharedGet('hotelsheet',h); remote=res?.data||null; gotRemote=true; }
  catch(e){ console.warn('Não foi possível obter a ficha partilhada de '+h,e); }
  if(already){
    if(gotRemote){
      // Atualiza a cópia local com a versão mais recente e reaplica qualquer edição
      // ainda pendente neste browser para nunca perder trabalho não sincronizado.
      HS_SHARED_CACHE[h]=hsMergePatch(hsNormalizeShared(remote,h),HS_SHARED_DIRTY[h]||{});
      HS_SHARED_FETCHED_AT[h]=Date.now();
    }
    return hsEnsureCache(h);
  }
  let base=hsNormalizeShared(remote,h);
  const legacy=hsLegacyForHotel(h);
  HS_SHARED_LEGACY_KEYS[h]=legacy.keys;
  HS_SHARED_LEGACY_ITEMS[h]=legacy.items||[];
  const missing=hsLegacyMissingPatch(base,legacy.patch);
  if(!hsPatchEmpty(missing)){
    base=hsMergePatch(base,missing);
    HS_SHARED_DIRTY[h]=hsMergeDirty(HS_SHARED_DIRTY[h],missing);
  }
  HS_SHARED_CACHE[h]=base;
  HS_SHARED_LOADED.add(h);
  if(gotRemote) HS_SHARED_FETCHED_AT[h]=Date.now();
  if(!hsPatchEmpty(HS_SHARED_DIRTY[h])){
    const ok=await hsFlushHotel(h);
    if(ok) hsClearLegacyKeys(h);
  } else if(remote){
    // Já existe versão oficial no servidor: as chaves antigas são apenas cache obsoleta.
    hsClearLegacyKeys(h);
  }
  return HS_SHARED_CACHE[h];
}
async function hsEnsureHotelsLoaded(hotels){
  const list=[...new Set((hotels||[]).filter(Boolean))];
  if(!list.length) return;
  if(typeof mapWithConcurrency==='function') return mapWithConcurrency(list,6,h=>hsEnsureHotelLoaded(h));
  return Promise.all(list.map(h=>hsEnsureHotelLoaded(h)));
}
function hsMarkDirty(h,patch,queue=true){
  HS_SHARED_CACHE[h]=hsMergePatch(hsEnsureCache(h),patch);
  HS_SHARED_DIRTY[h]=hsMergeDirty(HS_SHARED_DIRTY[h],patch);
  HS_SHARED_LOADED.add(h);
  if(queue) hsQueuePersist(h);
}
function hsQueuePersist(h){
  clearTimeout(HS_SHARED_TIMERS[h]);
  HS_SHARED_TIMERS[h]=setTimeout(()=>{ hsFlushHotel(h).catch(()=>{}); },900);
}
async function hsFlushHotel(h){
  clearTimeout(HS_SHARED_TIMERS[h]);
  const patch=sharedClone(HS_SHARED_DIRTY[h]||{});
  if(hsPatchEmpty(patch)) return true;
  HS_SHARED_DIRTY[h]={};
  try {
    let latest=null;
    try { latest=(await sharedGet('hotelsheet',h))?.data||null; } catch(e) {}
    let merged=hsMergePatch(hsNormalizeShared(latest||HS_SHARED_CACHE[h],h),patch);
    merged.updatedAt=new Date().toISOString();
    merged.updatedBy=sharedCurrentUserMeta();
    await sharedPost('hotelsheet',h,merged);
    // Conserva qualquer edição feita enquanto a rede estava a responder.
    const pending=HS_SHARED_DIRTY[h]||{};
    HS_SHARED_CACHE[h]=hsMergePatch(merged,pending);
    HS_SHARED_FETCHED_AT[h]=Date.now();
    hsClearLegacyKeys(h);
    return true;
  } catch(e){
    HS_SHARED_DIRTY[h]=hsMergeDirty(patch,HS_SHARED_DIRTY[h]);
    console.warn('Não foi possível sincronizar a Ficha do Hotel '+h+'.',e);
    return false;
  }
}
function hsGetDirector(h){ return String(hsEnsureCache(h).director||''); }
function hsSetDirector(h,v){ hsMarkDirty(h,{director:String(v||'')}); }
function hsGetComment(h,m,row){
  const v=hsGetPath(hsEnsureCache(h).comments,[hsSharedYear(),String(m),String(row)]);
  return v==null?'':String(v);
}
function hsSetComment(h,m,row,v,queue=true){
  const p={comments:{}}; hsSetPath(p.comments,[hsSharedYear(),String(m),String(row)],String(v||'')); hsMarkDirty(h,p,queue);
}
function hsGetManualRaw(h,m,row,field){
  const v=hsGetPath(hsEnsureCache(h).manual,[hsSharedYear(),String(m),String(row),String(field)]);
  return v==null?'':String(v);
}
function hsSetManualRaw(h,m,row,field,v,queue=true){
  const p={manual:{}}; hsSetPath(p.manual,[hsSharedYear(),String(m),String(row),String(field)],String(v||'')); hsMarkDirty(h,p,queue);
}

async function sharedLoadOperationalSettings(force){
  await Promise.all([sharedLoadRegions(!!force),sharedLoadRevenueEvents(!!force)]);
  // Migração automática das Fichas antigas existentes neste navegador — sem
  // obrigar a abrir hotel a hotel. Só as chaves que forem confirmadas no servidor
  // são removidas do armazenamento local.
  const legacyHotels=sharedLegacyMigrationAllowed()?hsLegacyHotels():[];
  if(legacyHotels.length){
    try { await hsEnsureHotelsLoaded(legacyHotels); }
    catch(e){ console.warn('Migração automática das Fichas de Hotel incompleta.',e); }
  }
  try {
    let pendingLegacy=0;
    if(sharedLegacyMigrationAllowed()){
      if(localStorage.getItem('vg_regioes_custom')) pendingLegacy++;
      if(localStorage.getItem('vg_ri_events')) pendingLegacy++;
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i)||'';
        if(k.startsWith('vg_hs_comment__')||k.startsWith('vg_hs_value__')||k.startsWith('vg_hs_director__')) pendingLegacy++;
      }
    }
    if(pendingLegacy && typeof showToast==='function') showToast(`⚠ ${pendingLegacy} dado(s) local(is) antigo(s) diferem ou ainda não foram confirmados no servidor; foram preservados.`, true);
  } catch(e) {}
  try {
    if(typeof renderAll==='function' && typeof RAW!=='undefined' && RAW) renderAll();
    if(typeof renderRegioesEditor==='function' && document.getElementById('vgRegioesGrid')) renderRegioesEditor();
  } catch(e) {}
}

// Publica a sessão atual (mesmos dados que "Exportar sessão") no servidor partilhado,
// em pedaços pequenos: um mês/hotel/snapshot de cada vez, depois o "índice".
// Cobre todos os módulos com persistência própria (P&L, reputação, ocupação,
// Instagram, receitas detalhe, fichas de hotel, notas, custos/compras).
const CD_BATCH_SIZE = 10000; // linhas por lote — reduzido para chunks mais pequenos e rápidos de transferir
function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < (arr || []).length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Corre "worker" para cada item de items, com no máximo `limit` pedidos em paralelo.
// Muito mais rápido do que um pedido a seguir ao outro quando há centenas de pedaços.
async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  const pool = Array.from({ length: Math.min(limit, items.length) }, run);
  await Promise.all(pool);
  return results;
}

async function publishSharedData(manual) {
  const snap = buildSessionSnapshot();
  const meses    = Object.keys(snap.STORE || {});
  const mesesAcum = Object.keys(snap.STORE_ACUM || {});
  const hoteis   = Object.keys(snap.REP_STORE || {});
  const occList  = snap.OCC_SNAPSHOTS || [];
  const igList   = snap.IG_SNAPSHOTS || [];
  const rdList   = snap.RD_STORE || [];
  const piuList  = snap.PIU_SNAPSHOTS || [];
  const hxKeys   = Object.keys(snap.HOTEIS_XLSX || {});
  const occIds   = occList.map(s => String(s.id));
  const igIds    = igList.map(s => String(s.id));
  const rdIds    = rdList.map(s => String(s.id));
  const piuKeys  = piuList.map((_, i) => String(i));

  // Custos/Compras (CD_STORE): tabelas grandes de linhas agregadas (G/A/F/P/PM/X),
  // sem identificador próprio — partidas em lotes de CD_BATCH_SIZE linhas cada.
  const cd = snap.CD_STORE || null;
  const cdArrNames = ['G','A','F','P','PM','X'];
  const cdBatches = {}; // { G: [[...linhas...], [...linhas...]], A: [...], ... }
  const cdBatchCounts = {};
  if (cd) {
    for (const name of cdArrNames) {
      cdBatches[name] = chunkArray(cd[name] || [], CD_BATCH_SIZE);
      cdBatchCounts[name] = cdBatches[name].length;
    }
  }
  const cdTotalBatches = cd ? Object.values(cdBatchCounts).reduce((s,n) => s+n, 0) + 1 : 0; // +1 para o cdmeta

  const totalSteps = meses.length + mesesAcum.length + hoteis.length + occIds.length + igIds.length +
                      rdIds.length + piuKeys.length + hxKeys.length + cdTotalBatches + 3; // +notas +meta +index
  let done = 0;
  const tick = (label) => setSharedSyncStatus(`A publicar ${label} (${++done}/${totalSteps})...`, false);

  try {
    const CONC = 4; // pedidos em paralelo — equilíbrio entre velocidade e estabilidade
    await mapWithConcurrency(meses, CONC, async (mes) => { tick('mês ' + mes); await sharedPost('mes', mes, snap.STORE[mes]); });
    await mapWithConcurrency(mesesAcum, CONC, async (mes) => { tick('acumulado ' + mes); await sharedPost('mesacum', mes, snap.STORE_ACUM[mes]); });
    await mapWithConcurrency(hoteis, CONC, async (hotel) => { tick('hotel ' + hotel); await sharedPost('hotel', hotel, snap.REP_STORE[hotel]); });
    await mapWithConcurrency(occList, CONC, async (s) => { tick('ocupação ' + s.id); await sharedPost('occ', s.id, s); });
    await mapWithConcurrency(igList, CONC, async (s) => { tick('instagram ' + s.id); await sharedPost('ig', s.id, s); });
    await mapWithConcurrency(rdList, CONC, async (s) => { tick('receitas ' + s.id); await sharedPost('rd', s.id, s); });
    await mapWithConcurrency(piuList, CONC, async (item, i) => { tick('referência ' + i); await sharedPost('piu', i, item); });
    await mapWithConcurrency(hxKeys, CONC, async (k) => { tick('ficha hotel ' + k); await sharedPost('hotelxlsx', k, snap.HOTEIS_XLSX[k]); });

    if (cd) {
      const CD_CONC = 1; // CD sequencial — evita timeouts de ligação com muitos chunks grandes
      for (const name of cdArrNames) {
        const batches = cdBatches[name];
        for (let i = 0; i < batches.length; i++) {
          tick(`custos ${name} ${i+1}/${batches.length}`);
          await sharedPost('cdbatch', name + '-' + i, batches[i]);
          if (i < batches.length - 1) await sleep(200); // pausa entre chunks para não sobrecarregar
        }
      }
      tick('custos (metadados)');
      await sharedPost('cdmeta', null, { meta: cd.meta, dic: cd.dic, batchCounts: cdBatchCounts });
    }

    tick('notas');
    await sharedPost('notas', null, snap.NOTAS_STORE || {});
    tick('metadados');
    await sharedPost('meta', null, {
      version: snap.version,
      savedAt: snap.savedAt,
      rtSelected: snap.rtSelected,
      selectedMeses: snap.selectedMeses
    });
    tick('índice');
    await sharedPost('index', null, { meses, mesesAcum, hoteis, occIds, igIds, rdIds, piuKeys, hxKeys, hasCd: !!cd });

    lastSharedMetaSavedAt = snap.savedAt;
    const dt = new Date().toLocaleTimeString('pt-PT', {hour:'2-digit', minute:'2-digit'});
    setSharedSyncStatus(`✓ Publicado para todos às ${dt} · ${meses.length} mês(es) · ${hoteis.length} hotel(is).`, false);
    if (manual) showToast('✓ Dados publicados — todos vão ver esta versão.');
    return true;
  } catch(err) {
    console.warn('Erro ao publicar dados partilhados:', err);
    setSharedSyncStatus('⚠ ' + err.message, true);
    if (manual) showToast('⚠ Não foi possível publicar tudo: ' + err.message, true);
    return false;
  }
}

// Vai buscar a sessão partilhada ao servidor (índice + cada pedaço).
// Devolve true se restaurou alguma coisa.
async function fetchSharedData(manual) {
  try { if (typeof vgShowLoading === 'function') vgShowLoading('A obter dados…', 'A ligar ao servidor partilhado…'); } catch(_){}
  setSharedSyncStatus('A ligar ao servidor partilhado...', false);
  try {
    await sharedLoadOperationalSettings(!!manual);
    const idxRes = await sharedGet('index');
    const idx = idxRes.data || {};
    const meses   = idx.meses   || [];
    const mesesAcum = idx.mesesAcum || [];
    const hoteis  = idx.hoteis  || [];
    const occIds  = idx.occIds  || [];
    const igIds   = idx.igIds   || [];
    const rdIds   = idx.rdIds   || [];
    const piuKeys = idx.piuKeys || [];
    const hxKeys  = idx.hxKeys  || [];

    const metaRes = await sharedGet('meta');
    const meta = metaRes.data;

    const nadaPublicado = !meses.length && !hoteis.length && !occIds.length && !igIds.length &&
                           !rdIds.length && !piuKeys.length && !hxKeys.length && !idx.hasCd && !meta;
    if (nadaPublicado) {
      setSharedSyncStatus('Ainda não há dados publicados no servidor partilhado.', false);
      if (manual) showToast('Ainda não há dados partilhados — usa "Publicar para todos" primeiro.');
      try { if (typeof vgFinishStartup === 'function') vgFinishStartup(); } catch(_){}
      return false;
    }

    const metaSavedAt = meta && meta.savedAt ? meta.savedAt : null;
    if (manual && metaSavedAt && metaSavedAt === lastSharedMetaSavedAt) {
      showToast('Já estás com os dados partilhados mais recentes.');
      try { if (typeof vgFinishStartup === 'function') vgFinishStartup(); } catch(_){}
      return true;
    }
    if (manual && !confirm('Isto vai substituir os dados que estás a ver pelos dados publicados no servidor partilhado, e volta à vista "Resumo". Continuar?')) {
      try { if (typeof vgFinishStartup === 'function') vgFinishStartup(); } catch(_){}
      return true;
    }

    setSharedSyncStatus(`A obter dados partilhados (${meses.length} mês(es), ${hoteis.length} hotel(is) e outros módulos)...`, false);

    const CONC = 4; // pedidos em paralelo — equilíbrio entre velocidade e estabilidade
    const novoStore = {};
    await mapWithConcurrency(meses, CONC, async (mes) => {
      const r = await sharedGet('mes', mes); if (r.data) novoStore[mes] = r.data;
    });
    const novoStoreAcum = {};
    await mapWithConcurrency(mesesAcum, CONC, async (mes) => {
      const r = await sharedGet('mesacum', mes); if (r.data) novoStoreAcum[mes] = r.data;
    });
    const novoRep = {};
    await mapWithConcurrency(hoteis, CONC, async (hotel) => {
      const r = await sharedGet('hotel', hotel); if (r.data) novoRep[hotel] = r.data;
    });
    const occResults = await mapWithConcurrency(occIds, CONC, async (id) => (await sharedGet('occ', id)).data);
    const novoOcc = occResults.filter(Boolean);
    const igResults = await mapWithConcurrency(igIds, CONC, async (id) => (await sharedGet('ig', id)).data);
    const novoIg = igResults.filter(Boolean);
    const rdResults = await mapWithConcurrency(rdIds, CONC, async (id) => (await sharedGet('rd', id)).data);
    const novoRd = rdResults.filter(Boolean);
    const piuResults = await mapWithConcurrency(piuKeys, CONC, async (k) => (await sharedGet('piu', k)).data);
    const novoPiu = piuResults.filter(Boolean);
    const novoHx = {};
    await mapWithConcurrency(hxKeys, CONC, async (k) => {
      const r = await sharedGet('hotelxlsx', k); if (r.data) novoHx[k] = r.data;
    });
    const notasRes = await sharedGet('notas');

    let novoCd = null;
    if (idx.hasCd) {
      const cdMetaRes = await sharedGet('cdmeta');
      const cdMeta = cdMetaRes.data || {};
      const batchCounts = cdMeta.batchCounts || {};
      novoCd = { meta: cdMeta.meta, dic: cdMeta.dic, G: [], A: [], F: [], P: [], PM: [], X: [] };
      for (const name of ['G','A','F','P','PM','X']) {
        const n = batchCounts[name] || 0;
        setSharedSyncStatus(`A obter custos ${name} (0/${n})...`, false);
        const idxs = Array.from({length: n}, (_, i) => i);
        let received = 0;
        const parts = await mapWithConcurrency(idxs, CONC, async (i) => {
          const r = await sharedGet('cdbatch', name + '-' + i);
          received++;
          setSharedSyncStatus(`A obter custos ${name} (${received}/${n})...`, false);
          return r.data;
        });
        for (const p of parts) if (p) novoCd[name] = novoCd[name].concat(p);
      }
    }

    const snap = {
      version: (meta && meta.version) || 1,
      savedAt: metaSavedAt,
      STORE: novoStore,
      STORE_ACUM: novoStoreAcum,
      REP_STORE: novoRep,
      OCC_SNAPSHOTS: novoOcc,
      IG_SNAPSHOTS: novoIg,
      RD_STORE: novoRd,
      PIU_SNAPSHOTS: novoPiu,
      HOTEIS_XLSX: novoHx,
      NOTAS_STORE: (notasRes && notasRes.data) || {},
      CD_STORE: novoCd,
      rtSelected: (meta && meta.rtSelected) || [],
      selectedMeses: (meta && meta.selectedMeses) || []
    };

    try {
      restoreFromSnapshot(snap);
    } catch(uiErr) {
      // Os dados já chegaram e ficaram em memória (STORE/REP_STORE/...); um erro aqui é só
      // ao atualizar algum ecrã específico (ex.: um separador nunca aberto nesta sessão).
      console.warn('Dados sincronizados, mas houve um erro a atualizar o ecrã:', uiErr);
      try { setView('resumo'); } catch(e2) { /* ignora */ }
    }
    lastSharedMetaSavedAt = metaSavedAt;
    try { if (typeof window.vgTargetsRulesLoad === 'function') await window.vgTargetsRulesLoad(true); } catch(e) { console.warn('Metas & Regras não foram atualizadas na sincronização', e); }
    try { if (typeof renderAll === 'function') renderAll(); } catch(e) { console.warn('Re-render após Metas & Regras falhou', e); }
    const mesesN = Object.keys(STORE).length;
    const hoteisN = Object.keys(REP_STORE).length;
    const dt = metaSavedAt ? new Date(metaSavedAt).toLocaleString('pt-PT') : '—';
    setSharedSyncStatus(`✓ Sincronizado com todos · publicado em ${dt}.`, false);
    idbSetStatus(`✓ Dados partilhados · ${mesesN} meses P&L · ${hoteisN} hotéis rep. · publicado ${dt}`);
    if (manual) showToast(`✓ Dados partilhados carregados — ${mesesN} meses P&L, ${hoteisN} hotéis reputação`);
    try { if (typeof vgFinishStartup === 'function') vgFinishStartup(); } catch(_){}
    return true;
  } catch(err) {
    console.warn('Erro ao obter dados partilhados:', err);
    setSharedSyncStatus('⚠ ' + (err && err.message ? err.message : 'Sem ligação ao servidor partilhado — a usar dados deste navegador.'), true);
    if (manual) showToast('⚠ Não foi possível obter os dados partilhados: ' + (err && err.message ? err.message : ''), true);
    try { if (typeof vgFinishStartup === 'function') vgFinishStartup(); } catch(_){}
    return false;
  }
}

// ==========================================================
