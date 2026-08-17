// ==========================================================
// HOTÉIS MODULE
// ==========================================================

// Live data loaded from Excel (overrides static data when present)
let HOTEIS_XLSX = {}; // key = sheet name → parsed hotel object

// ── Static base data (urls + region mapping) ──────────────
const HOTEIS_STATIC = {
  'VG Porto Ribeira':              { regiao:'Norte e Centro', url:'https://www.vilagale.com/pt/hoteis/porto-e-norte/vila-gale-porto-ribeira' },
  'VG Porto':                      { regiao:'Norte e Centro', url:'https://www.vilagale.com/pt/hoteis/porto-e-norte/vila-gale-porto' },
  'VG Isla Canela':                { regiao:'Espanha',       url:'https://www.vilagale.com/pt/hoteis/espanha/vila-gale-isla-canela' },
  'VGC PONTE DE LIMA VINEYARDS':   { regiao:'Norte e Centro', url:'https://www.vilagale.com/pt/hoteis/porto-e-norte/collection-ponte-de-lima-vineyards' },
  'VG Collection Figueira da Foz': { regiao:'Norte e Centro',        url:'https://www.vilagale.com/pt/hoteis/centro-de-portugal/collection-figueira-da-foz' },
  'VG Collection Braga':           { regiao:'Norte e Centro', url:'https://www.vilagale.com/pt/hoteis/porto-e-norte/collection-braga' },
  'VG Douro Vineyards':            { regiao:'Norte e Centro', url:'https://www.vilagale.com/pt/hoteis/porto-e-norte/vila-gale-douro-vineyards' },
  'VG Collection Douro':           { regiao:'Norte e Centro', url:'https://www.vilagale.com/pt/hoteis/porto-e-norte/collection-douro' },
  'VG Serra da Estrela':           { regiao:'Norte e Centro',        url:'https://www.vilagale.com/pt/hoteis/centro-de-portugal/collection-serra-da-estrela' },
  'VG Coimbra':                    { regiao:'Norte e Centro',        url:'https://www.vilagale.com/pt/hoteis/centro-de-portugal/vila-gale-coimbra' },
  'VG Tomar':                      { regiao:'Norte e Centro',        url:'https://www.vilagale.com/pt/hoteis/centro-de-portugal/collection-tomar' },
  'VG Sintra':                     { regiao:'Lisboa & Ilhas',        url:'https://www.vilagale.com/pt/hoteis/costa-de-lisboa/collection-sintra', estrelas:5 },
  'VG Ericeira':                   { regiao:'Lisboa & Ilhas',        url:'https://www.vilagale.com/pt/hoteis/costa-de-lisboa/vila-gale-ericeira' },
  'VG Cascais':                    { regiao:'Lisboa & Ilhas',        url:'https://www.vilagale.com/pt/hoteis/costa-de-lisboa/vila-gale-cascais' },
  'VG Collection Palácio dos Arcos':{ regiao:'Lisboa & Ilhas',       url:'https://www.vilagale.com/pt/hoteis/costa-de-lisboa/collection-palacio-dos-arcos', estrelas:5 },
  'VG Santa Cruz':                 { regiao:'Lisboa & Ilhas',         url:'https://www.vilagale.com/pt/hoteis/madeira/vila-gale-santa-cruz' },
  'VG Estoril':                    { regiao:'Lisboa & Ilhas',        url:'https://www.vilagale.com/pt/hoteis/costa-de-lisboa/vila-gale-estoril' },
  'VG Ópera':                      { regiao:'Lisboa & Ilhas',        url:'https://www.vilagale.com/pt/hoteis/costa-de-lisboa/vila-gale-opera' },
  "VG Casas d'Elvas":              { regiao:'Alentejo',      url:'https://www.vilagale.com/pt/hoteis/alentejo/casas-de-elvas' },
  'VG Collection Elvas':           { regiao:'Alentejo',      url:'https://www.vilagale.com/pt/hoteis/alentejo/collection-elvas' },
  'VG Collection Alter Real':      { regiao:'Alentejo',      url:'https://www.vilagale.com/pt/hoteis/alentejo/collection-alter-real' },
  'VG Évora':                      { regiao:'Alentejo',      url:'https://www.vilagale.com/pt/hoteis/alentejo/vila-gale-evora' },
  'VG Monte do Vilar':             { regiao:'Alentejo',      url:'https://www.vilagale.com/pt/hoteis/alentejo/collection-monte-do-vilar' },
  'VG Alentejo Vineyards':         { regiao:'Alentejo',      url:'https://www.vilagale.com/pt/hoteis/alentejo/vila-gale-alentejo-vineyards' },
  'VG Tavira':                     { regiao:'Algarve',       url:'https://www.vilagale.com/pt/hoteis/algarve/vila-gale-tavira' },
  'VG NEP Kids':                   { regiao:'Alentejo',      url:'https://www.vilagale.com/pt/hoteis/alentejo/vila-gale-nep-kids' },
  'VG Marina':                     { regiao:'Algarve',       url:'https://www.vilagale.com/pt/hoteis/algarve/vila-gale-marina' },
  'VG Albacora':                   { regiao:'Algarve',       url:'https://www.vilagale.com/pt/hoteis/algarve/vila-gale-albacora' },
  'VG Collection Praia':           { regiao:'Algarve',       url:'https://www.vilagale.com/pt/hoteis/algarve/collection-praia' },
  'VG Ampalius':                   { regiao:'Algarve',       url:'https://www.vilagale.com/pt/hoteis/algarve/vila-gale-ampalius' },
  'VG Cerro Alagoa':               { regiao:'Algarve',       url:'https://www.vilagale.com/pt/hoteis/algarve/vila-gale-cerro-alagoa' },
  'VG Atlântico':                  { regiao:'Algarve',       url:'https://www.vilagale.com/pt/hoteis/algarve/vila-gale-atlantico' },
  'VG Náutico':                    { regiao:'Algarve',       url:'https://www.vilagale.com/pt/hoteis/algarve/vila-gale-nautico' },
  'VG Lagos':                      { regiao:'Algarve',       url:'https://www.vilagale.com/pt/hoteis/algarve/vila-gale-lagos' },
  'VG S Miguel':                   { regiao:'Lisboa & Ilhas',         url:'https://www.vilagale.com/pt/hoteis/acores/collection-sao-miguel' },
};

// ── Excel loader ──────────────────────────────────────────
async function hoteisLoadXlsx(file) {
  if (!file) return;
  try { if(window.VG?.performance?.ensureXLSX) await window.VG.performance.ensureXLSX(); } catch(e) { showToast('Não foi possível carregar a biblioteca Excel: '+(e.message||e), true); return; }
  const dcBefore = typeof window.vgDataCenterCapture === 'function' ? window.vgDataCenterCapture('hotels') : null;
  showToast('A processar fichas técnicas...');
  try {
    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab, { type:'array' });
    const skip = new Set(['Resumo','Template','Sheet27']);
    const result = {};
    wb.SheetNames.forEach(sh => {
      if (skip.has(sh)) return;
      const ws = wb.Sheets[sh];
      const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:null });
      result[sh] = hoteisParseSheet(rows, sh);
    });
    HOTEIS_XLSX = result;
    const dt = new Date().toLocaleString('pt-PT',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
    { const st = document.getElementById('hoteisXlsxStatus'); if (st) st.textContent = `✓ ${Object.keys(result).length} fichas carregadas · ${dt}`; }
    hoteisFiltrar();
    showToast(`✓ ${Object.keys(result).length} fichas técnicas carregadas`);
    uploadSetStatus('uploadStatusHoteis', `✓ ${Object.keys(result).length} fichas carregadas · ${dt}`, true);
    if (typeof window.vgDataCenterRecord === 'function') window.vgDataCenterRecord({source:'hotels',fileName:file.name,fileSize:file.size,scope:`${Object.keys(result).length} fichas`,before:dcBefore,duplicate:!!(dcBefore&&dcBefore.payload&&Object.keys(dcBefore.payload).length),metrics:{hotels:Object.keys(result).length},summary:'Fichas técnicas dos hotéis'});
  } catch(e) {
    showToast('Erro: ' + e.message, true);
    if (typeof window.vgDataCenterRecordFailure === 'function') window.vgDataCenterRecordFailure({source:'hotels',fileName:file.name,fileSize:file.size,summary:e.message,warnings:[e.message]});
  }
}

function hoteisParseSheet(rows, sheetName) {
  const get = (label) => {
    for (const row of rows) {
      if (!row) continue;
      const c0 = (row[0]||'').toString().trim();
      if (c0.toLowerCase() === label.toLowerCase()) {
        return row[1] != null ? row[1].toString().trim() : null;
      }
    }
    return null;
  };
  const getN = (label) => { const v = get(label); return v ? parseFloat(v) : null; };
  const has  = (label) => { const v = get(label); return v && v.toUpperCase() !== 'NÃO' && v !== '' && v !== 'N'; };

  // Hotel name — row 3 col B, may be multiline
  let nome = rows[2]?.[1] || sheetName;
  if (typeof nome === 'string' && nome.includes('\n')) nome = nome.split('\n').filter(s=>s.trim()).find(s=>s.toLowerCase().includes('vila') || s.toLowerCase().includes('hotel')) || nome.split('\n')[0];
  nome = nome.toString().trim();

  // Basic
  const estrelas = getN('Categoria') || (get('Categoria')||'').match(/(\d)/)?.[1] && parseInt(get('Categoria').match(/(\d)/)[1]) || 4;
  const morada   = get('Morada');
  const tel      = get('Telefone');
  const web      = get('Página web');
  const coords   = get('Coordenadas geográficas');
  const anoCons  = getN('Ano de Construção');
  const anoReform= getN('Última Reforma Integral') || getN('Última Reforma Parcial');
  const nEdif    = getN('Nº de Edificios');
  const nPisos   = getN('Nº de Pisos');
  const nElevs   = getN('Nº de Elevadores');
  const totalQ   = getN('Total de Quartos:');

  // Room features
  const features = [];
  ['Comunicantes','Fumador','Não Fumador','Deficiente','Cama de casal','Sofá-cama','Cama extra (tipo e medida)',
   'Berços','Ar condicionado | Aquecimento','Cofre (ex:digital, Laptop)','Terraço/Varanda',
   'Room Service','Mini Bar','Banheira','Internet (wifi, cabo)'].forEach(f => {
    const v = get(f);
    if (v && v.toLowerCase() !== 'não' && v.toLowerCase() !== 'n') features.push(f.replace(' | ',' / '));
  });
  const checkIn  = get('Check In');
  const checkOut = get('Check-Out');

  // Languages
  const langs = [];
  ['Inglês','Francês','Espanhol','Alemão','Outra'].forEach(l => {
    const row = rows.find(r => r && (r[0]||'').toString().trim() === l);
    if (row && row[1]) langs.push(l);
  });

  // Contacts
  const contacts = [];
  const roles = ['Director','Assistente de Direcção','Recepção','Reservas Lazer','Reservas Turismo','Reservas Empresas','Vendas/contratação'];
  roles.forEach(role => {
    const row = rows.find(r => r && (r[0]||'').toString().trim() === role);
    if (row && (row[1] || row[2])) contacts.push({ role, nome: row[1]||'', email: row[2]||'', tel: row[3]||'' });
  });

  // Restaurants
  const rests = [];
  for (let col = 1; col <= 5; col += 2) {
    const nomeRow = rows.find(r => r && (r[0]||'').toString().includes('Nome') && r[col]);
    const capRow  = rows.find(r => r && (r[0]||'').toString().includes('Capacidade') && r[col]);
    const tipRow  = rows.find(r => r && (r[0]||'').toString().includes('Tipo de Serviço') && r[col]);
    const horPA   = rows.find(r => r && (r[0]||'').toString().includes('Horário PA') && r[col]);
    const horJ    = rows.find(r => r && (r[0]||'').toString().includes('Horário Jantar') && r[col]);
    if (nomeRow?.[col]) rests.push({
      nome: nomeRow[col], cap: capRow?.[col], tipo: tipRow?.[col],
      pa: horPA?.[col], jantar: horJ?.[col]
    });
  }

  // Bars
  const bars = [];
  const barSection = rows.findIndex(r => r && (r[0]||'').toString().includes('Bar 1'));
  if (barSection >= 0) {
    for (let col = 1; col <= 5; col += 2) {
      const nRow = rows[barSection+1];
      const hRow = rows.find((r,i) => i > barSection && r && (r[0]||'').toString().includes('Horário') && r[col]);
      if (nRow?.[col]) bars.push({ nome: nRow[col], horario: hRow?.[col] });
    }
  }

  // Pools
  const piscExt = get('Piscina Exterior');
  const piscInt = get('Piscina Interior');
  const piscIntHorario = (() => {
    const row = rows.find(r => r && (r[0]||'').toString().includes('Horário') && r[2] && rows.indexOf(r) > rows.findIndex(rr => (rr?.[0]||'').toString().includes('Piscina')));
    return row?.[2] || null;
  })();

  // Spa
  const spaHorario = (() => {
    const i = rows.findIndex(r => r && (r[0]||'').toString().includes('SPA | Health Club'));
    return i >= 0 ? rows[i+1]?.[1] : null;
  })();
  const spaTratamentos = has('Salas de Massagens e Tratamentos');

  // Meeting rooms
  const nSalas   = getN('Nº de salas');
  const salasLoc = get('Localização/pisos/interior/exterior');

  // Parking
  const garagem  = get('Garagem');
  const garagemCap = getN('Capacidade (nº lugares)');
  const garagemVal = get('Valor');

  // Distances
  const distances = [];
  const distStart = rows.findIndex(r => r && (r[0]||'').toString().includes('Localização/Distâncias'));
  if (distStart >= 0) {
    for (let i = distStart+1; i < Math.min(distStart+20, rows.length); i++) {
      const r = rows[i];
      if (!r || !r[0] || !r[1]) continue;
      const label = r[0].toString().trim();
      const val   = r[1].toString().trim();
      const ref   = r[2] ? r[2].toString().trim() : '';
      if (label && val) distances.push({ label, val, ref });
    }
  }

  // Segments
  const segs = [];
  ['Hotel familiar','Hotel de negócios','Hotel de praia','Hotel ecológico','Hotel romântico','Hotel temático','Hotel histórico','Spa Hotel'].forEach(s => {
    const row = rows.find(r => r && (r[0]||'').toString().trim() === s);
    if (row && row[1]) segs.push(s.replace('Hotel ',''));
  });

  return { nome, estrelas, morada, tel, web, coords, anoCons, anoReform,
           nEdif, nPisos, nElevs, totalQ, features, checkIn, checkOut,
           langs, contacts, rests, bars, piscExt, piscInt, piscIntHorario,
           spaHorario, spaTratamentos, nSalas, salasLoc, garagem, garagemCap,
           garagemVal, distances, segs };
}


// ── Edição nativa das fichas de hotel (V35.2) ─────────────
const HT_EDIT_SIMPLE_FIELDS = ['nome','estrelas','morada','tel','web','coords','anoCons','anoReform','nEdif','nPisos','nElevs','totalQ','checkIn','checkOut','piscExt','piscInt','piscIntHorario','spaHorario','nSalas','salasLoc','garagem','garagemCap','garagemVal'];
let HOTEIS_SHARED_READY=false, HOTEIS_SHARED_LOADING=null;
const HOTEIS_PROFILE_META=Object.create(null);
function hoteisNormName(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/^(HOTEL\s+)?VILA\s+GALE\s+/,'').replace(/^VG(C)?\s+/,'').replace(/^COLLECTION\s+/,'').replace(/\s+/g,' ').trim();}
function hoteisCurrentUser(){try{return typeof window.vgAuthCurrent==='function'?window.vgAuthCurrent():null;}catch(e){return null;}}
function hoteisIsDirection(){const u=hoteisCurrentUser();return !!u&&['direcao','admin'].includes(String(u.role||'').toLowerCase());}
function hoteisCanEdit(sk){const u=hoteisCurrentUser();if(!u)return false;if(hoteisIsDirection())return true;const d=HOTEIS_XLSX[sk],hotel=d?.nome||sk;if(typeof window.vgAuthCanAccessHotel==='function')return window.vgAuthCanAccessHotel(hotel)||window.vgAuthCanAccessHotel(sk);const hs=Array.isArray(u.hotels)?u.hotels:(u.hotel?[u.hotel]:[]);return hs.some(x=>{const want=hoteisNormName(x);return want===hoteisNormName(hotel)||want===hoteisNormName(sk);});}
function hoteisBlankRecord(sk){const st=HOTEIS_STATIC[sk]||{};return {nome:sk.replace(/^VG\s+/,'Vila Galé ').replace(/^VGC\s+/,'Vila Galé Collection '),estrelas:st.estrelas||4,morada:'',tel:'',web:st.url||'',coords:'',anoCons:'',anoReform:'',nEdif:'',nPisos:'',nElevs:'',totalQ:'',features:[],checkIn:'',checkOut:'',langs:[],contacts:[],rests:[],bars:[],piscExt:'',piscInt:'',piscIntHorario:'',spaHorario:'',spaTratamentos:false,nSalas:'',salasLoc:'',garagem:'',garagemCap:'',garagemVal:'',distances:[],segs:[]};}
function hoteisEditableRecord(sk){return JSON.parse(JSON.stringify(Object.assign(hoteisBlankRecord(sk),HOTEIS_XLSX[sk]||{})));}
function htLines(arr,fmt){return (Array.isArray(arr)?arr:[]).map(fmt).join('\n');}
function htSplitLines(v){return String(v||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);}
function htPipe(v,n){return htSplitLines(v).map(line=>{const p=line.split('|').map(x=>x.trim());while(p.length<n)p.push('');return p;});}
function htNumOrBlank(v){const t=String(v??'').trim();if(!t)return '';const n=Number(t.replace(',','.'));return Number.isFinite(n)?n:t;}
function htEsc(v){return window.VG?.util?.escapeHtml?window.VG.util.escapeHtml(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));}
function hoteisEditorCss(){if(document.getElementById('htEditorStyle'))return;const st=document.createElement('style');st.id='htEditorStyle';st.textContent=`.ht-edit-btn{border:1px solid var(--border);background:var(--surface-2);color:var(--text-1);border-radius:8px;padding:6px 10px;font:800 10px var(--font);cursor:pointer}.ht-edit-btn:hover{border-color:var(--gold);color:var(--gold)}.ht-edit-modal{display:none;position:fixed;inset:0;z-index:1500;background:rgba(2,6,23,.55);backdrop-filter:blur(4px);padding:20px;overflow:auto}.ht-edit-modal.open{display:block}.ht-edit-panel{max-width:1120px;margin:20px auto;background:var(--surface-1);color:var(--text-1);border:1px solid var(--border);border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.25);overflow:hidden}.ht-edit-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:12px;padding:16px 18px;background:var(--surface-1);border-bottom:1px solid var(--border)}.ht-edit-head>div{flex:1}.ht-edit-head strong{display:block;font-size:15px}.ht-edit-head span{font-size:10px;color:var(--text-3)}.ht-edit-x{border:0;background:var(--surface-2);color:var(--text-1);border-radius:9px;width:34px;height:34px;cursor:pointer}.ht-edit-body{padding:18px}.ht-edit-section{margin-bottom:18px}.ht-edit-section h4{margin:0 0 10px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--gold)}.ht-edit-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.ht-edit-grid label,.ht-edit-wide label{display:flex;flex-direction:column;gap:5px;font-size:10px;font-weight:800;color:var(--text-2)}.ht-edit-grid input,.ht-edit-grid select,.ht-edit-wide textarea{width:100%;box-sizing:border-box;background:var(--surface-2);border:1px solid var(--border);border-radius:9px;padding:9px;color:var(--text-1);font:500 11px var(--font)}.ht-edit-wide{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.ht-edit-wide textarea{min-height:108px;resize:vertical}.ht-edit-help{font-size:9px;color:var(--text-3);font-weight:500}.ht-edit-foot{position:sticky;bottom:0;display:flex;align-items:center;gap:10px;padding:12px 18px;background:var(--surface-1);border-top:1px solid var(--border)}.ht-edit-foot .status{flex:1;font-size:10px;color:var(--text-2)}.ht-edit-save,.ht-edit-cancel{border:1px solid var(--border);border-radius:9px;padding:9px 14px;font:800 11px var(--font);cursor:pointer}.ht-edit-save{background:var(--gold);border-color:var(--gold);color:#fff}.ht-edit-cancel{background:var(--surface-2);color:var(--text-1)}@media(max-width:900px){.ht-edit-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ht-edit-wide{grid-template-columns:1fr}}@media(max-width:520px){.ht-edit-grid{grid-template-columns:1fr}.ht-edit-modal{padding:6px}.ht-edit-panel{margin:4px auto}}`;document.head.appendChild(st);}
function hoteisEditorModal(){hoteisEditorCss();let m=document.getElementById('htEditModal');if(m)return m;m=document.createElement('div');m.id='htEditModal';m.className='ht-edit-modal';m.innerHTML='<div class="ht-edit-panel"><div class="ht-edit-head"><div><strong id="htEditTitle">Editar hotel</strong><span>Todos os campos da ficha são editáveis. As alterações ficam partilhadas.</span></div><button class="ht-edit-x" type="button">✕</button></div><form id="htEditForm"><div class="ht-edit-body" id="htEditBody"></div><div class="ht-edit-foot"><span class="status" id="htEditStatus"></span><button class="ht-edit-cancel" type="button">Cancelar</button><button class="ht-edit-save" type="submit">Guardar alterações</button></div></form></div>';document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m||e.target.closest('.ht-edit-x')||e.target.closest('.ht-edit-cancel'))m.classList.remove('open');});m.querySelector('#htEditForm').addEventListener('submit',hoteisSaveEditor);return m;}
function htInput(id,label,value,type='text'){return `<label>${label}<input id="${id}" type="${type}" value="${htEsc(value??'')}"></label>`;}
function htRegionSelect(value){const vals=[...new Set(Object.values(HOTEIS_STATIC||{}).map(x=>x?.regiao).filter(Boolean))];if(value&&!vals.includes(value))vals.push(value);vals.sort((a,b)=>a.localeCompare(b,'pt',{sensitivity:'base'}));return `<label>Região<select id="ht_regiao">${vals.map(x=>`<option value="${htEsc(x)}" ${x===value?'selected':''}>${htEsc(x)}</option>`).join('')}</select></label>`;}
function htTextarea(id,label,value,help){return `<label>${label}<textarea id="${id}">${htEsc(value??'')}</textarea>${help?`<span class="ht-edit-help">${help}</span>`:''}</label>`;}
function hoteisOpenEditor(sk){if(!hoteisCanEdit(sk)){showToast?.('Sem permissões para editar este hotel.',true);return;}const d=hoteisEditableRecord(sk),st=HOTEIS_STATIC[sk]||{};const m=hoteisEditorModal();m.dataset.key=sk;document.getElementById('htEditTitle').textContent='Editar · '+(d.nome||sk);const body=document.getElementById('htEditBody');body.innerHTML=`
<div class="ht-edit-section"><h4>Identificação</h4><div class="ht-edit-grid">${htInput('ht_nome','Nome do hotel',d.nome)}${htRegionSelect(st.regiao||hoteisRegionOf(sk))}${htInput('ht_estrelas','Categoria / estrelas',d.estrelas,'number')}${htInput('ht_web','Página web',d.web||st.url)}${htInput('ht_morada','Morada',d.morada)}${htInput('ht_tel','Telefone',d.tel)}${htInput('ht_coords','Coordenadas geográficas',d.coords)}${htInput('ht_totalQ','Total de quartos',d.totalQ,'number')}</div></div>
<div class="ht-edit-section"><h4>Edifício e operação</h4><div class="ht-edit-grid">${htInput('ht_anoCons','Ano de construção',d.anoCons,'number')}${htInput('ht_anoReform','Última reforma',d.anoReform,'number')}${htInput('ht_nEdif','N.º edifícios',d.nEdif,'number')}${htInput('ht_nPisos','N.º pisos',d.nPisos,'number')}${htInput('ht_nElevs','N.º elevadores',d.nElevs,'number')}${htInput('ht_checkIn','Check-in',d.checkIn)}${htInput('ht_checkOut','Check-out',d.checkOut)}${htInput('ht_nSalas','N.º salas reunião',d.nSalas,'number')}${htInput('ht_salasLoc','Localização das salas',d.salasLoc)}${htInput('ht_garagem','Garagem',d.garagem)}${htInput('ht_garagemCap','Capacidade garagem',d.garagemCap,'number')}${htInput('ht_garagemVal','Valor garagem',d.garagemVal)}</div></div>
<div class="ht-edit-section"><h4>Piscinas, SPA e serviços</h4><div class="ht-edit-grid">${htInput('ht_piscExt','Piscina exterior',d.piscExt)}${htInput('ht_piscInt','Piscina interior',d.piscInt)}${htInput('ht_piscIntHorario','Horário piscina interior',d.piscIntHorario)}${htInput('ht_spaHorario','Horário SPA / Health Club',d.spaHorario)}<label>Salas massagens / tratamentos<select id="ht_spaTratamentos"><option value="false" ${!d.spaTratamentos?'selected':''}>Não</option><option value="true" ${d.spaTratamentos?'selected':''}>Sim</option></select></label></div></div>
<div class="ht-edit-section"><h4>Listas e características</h4><div class="ht-edit-wide">${htTextarea('ht_segs','Segmentos',htLines(d.segs,x=>x),'Uma entrada por linha.')}${htTextarea('ht_features','Características dos quartos',htLines(d.features,x=>x),'Uma característica por linha.')}${htTextarea('ht_langs','Idiomas',htLines(d.langs,x=>x),'Um idioma por linha.')}${htTextarea('ht_contacts','Contactos',htLines(d.contacts,x=>[x.role,x.nome,x.email,x.tel].join(' | ')),'Uma linha: Função | Nome | Email | Telefone')}${htTextarea('ht_rests','Restaurantes',htLines(d.rests,x=>[x.nome,x.tipo,x.cap,x.pa,x.jantar].join(' | ')),'Uma linha: Nome | Tipo serviço | Capacidade | Horário PA | Horário jantar')}${htTextarea('ht_bars','Bares',htLines(d.bars,x=>[x.nome,x.horario].join(' | ')),'Uma linha: Nome | Horário')}${htTextarea('ht_distances','Localização / distâncias',htLines(d.distances,x=>[x.label,x.val,x.ref].join(' | ')),'Uma linha: Local | Distância | Referência')}</div></div>`;document.getElementById('htEditStatus').textContent='';m.classList.add('open');}
async function hoteisSaveEditor(ev){ev.preventDefault();const m=document.getElementById('htEditModal'),sk=m?.dataset.key;if(!sk||!hoteisCanEdit(sk))return;const status=document.getElementById('htEditStatus');try{status.textContent='A guardar…';const old=hoteisEditableRecord(sk);const val=id=>document.getElementById(id)?.value??'';let d=Object.assign({},old,{nome:val('ht_nome').trim(),estrelas:htNumOrBlank(val('ht_estrelas'))||4,morada:val('ht_morada').trim(),tel:val('ht_tel').trim(),web:val('ht_web').trim(),coords:val('ht_coords').trim(),anoCons:htNumOrBlank(val('ht_anoCons')),anoReform:htNumOrBlank(val('ht_anoReform')),nEdif:htNumOrBlank(val('ht_nEdif')),nPisos:htNumOrBlank(val('ht_nPisos')),nElevs:htNumOrBlank(val('ht_nElevs')),totalQ:htNumOrBlank(val('ht_totalQ')),checkIn:val('ht_checkIn').trim(),checkOut:val('ht_checkOut').trim(),piscExt:val('ht_piscExt').trim(),piscInt:val('ht_piscInt').trim(),piscIntHorario:val('ht_piscIntHorario').trim(),spaHorario:val('ht_spaHorario').trim(),spaTratamentos:val('ht_spaTratamentos')==='true',nSalas:htNumOrBlank(val('ht_nSalas')),salasLoc:val('ht_salasLoc').trim(),garagem:val('ht_garagem').trim(),garagemCap:htNumOrBlank(val('ht_garagemCap')),garagemVal:val('ht_garagemVal').trim(),segs:htSplitLines(val('ht_segs')),features:htSplitLines(val('ht_features')),langs:htSplitLines(val('ht_langs')),contacts:htPipe(val('ht_contacts'),4).map(x=>({role:x[0],nome:x[1],email:x[2],tel:x[3]})),rests:htPipe(val('ht_rests'),5).map(x=>({nome:x[0],tipo:x[1],cap:htNumOrBlank(x[2]),pa:x[3],jantar:x[4]})),bars:htPipe(val('ht_bars'),2).map(x=>({nome:x[0],horario:x[1]})),distances:htPipe(val('ht_distances'),3).map(x=>({label:x[0],val:x[1],ref:x[2]}))});if(!d.nome)throw new Error('O nome do hotel é obrigatório.');const st=Object.assign({},HOTEIS_STATIC[sk]||{},{regiao:val('ht_regiao').trim()||hoteisRegionOf(sk),url:d.web,estrelas:Number(d.estrelas)||4});if(window.VG?.shared?.post){const res=await window.VG.shared.post('ops-hotel-profile-save','',{key:sk,hotel:d.nome,data:d,static:st,expectedUpdatedAt:HOTEIS_PROFILE_META[sk]?.updatedAt||''});if(res?.data?.data)d=Object.assign(d,res.data.data);if(res?.data?.updatedAt)HOTEIS_PROFILE_META[sk]={updatedAt:res.data.updatedAt};}
HOTEIS_XLSX[sk]=d;HOTEIS_STATIC[sk]=st;try{if(typeof idbSaveAll==='function')await idbSaveAll();}catch(e){}m.classList.remove('open');hoteisFiltrar();showToast?.('✓ Ficha do hotel atualizada');}catch(e){const msg=e.message||String(e);status.textContent=msg;if(/alterad[oa] por outro utilizador|versão mais recente|conflito/i.test(msg)){status.textContent='A ficha foi entretanto alterada por outro utilizador. Atualizei os dados; reabra o editor e confirme a alteração.';try{await hoteisLoadSharedProfiles(true);}catch(_){}showToast?.('A ficha mudou noutra sessão. Reabra-a antes de guardar.',true);}else showToast?.('Erro ao guardar ficha: '+msg,true);}}
async function hoteisLoadSharedProfiles(force=false){if(HOTEIS_SHARED_LOADING)return HOTEIS_SHARED_LOADING;if(HOTEIS_SHARED_READY&&!force)return;const u=hoteisCurrentUser();if(!u||!window.VG?.shared?.get)return;HOTEIS_SHARED_LOADING=(async()=>{try{const r=await window.VG.shared.get('ops-hotel-profiles');const rows=Array.isArray(r?.data)?r.data:[];rows.forEach(rec=>{if(!rec?.key)return;if(rec.data)HOTEIS_XLSX[rec.key]=Object.assign(hoteisBlankRecord(rec.key),rec.data);if(rec.static)HOTEIS_STATIC[rec.key]=Object.assign({},HOTEIS_STATIC[rec.key]||{},rec.static);HOTEIS_PROFILE_META[rec.key]={updatedAt:rec.updatedAt||''};});HOTEIS_SHARED_READY=true;hoteisFiltrar();}catch(e){console.warn('Fichas partilhadas dos hotéis:',e);}finally{HOTEIS_SHARED_LOADING=null;}})();return HOTEIS_SHARED_LOADING;}
window.hoteisOpenEditor=hoteisOpenEditor;

// ── Filter & Render ───────────────────────────────────────
let hoteisFiltroRegiao = '';

function hoteisRegiao(btn, regiao) {
  document.querySelectorAll('.ht-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  hoteisFiltroRegiao = regiao;
  hoteisFiltrar();
}

function hoteisCurrentMarket() {
  try { return window.VG?.market?.id?.() || 'iberia'; } catch(e) { return 'iberia'; }
}
function hoteisMarketOf(sk) {
  const d = HOTEIS_XLSX[sk];
  const nome = d?.nome || sk;
  try { return window.VG?.market?.hotelMarket?.(nome) || 'iberia'; } catch(e) { return 'iberia'; }
}
function hoteisRegionOf(sk) {
  const s = HOTEIS_STATIC[sk];
  if (s?.regiao) return s.regiao;
  return hoteisCurrentMarket()==='brasil' ? 'Brasil' : 'PT + ES';
}
function hoteisSyncHeader() {
  const el = document.getElementById('hoteisTitle');
  if (!el) return;
  const def = window.VG?.market?.def?.();
  const label = def?.label || (hoteisCurrentMarket()==='brasil'?'Brasil':'PT + ES');
  el.textContent = `🏨 Hotéis — características e fichas técnicas · ${label}`;
  const rf = document.getElementById('hotelRegiaoFilter');
  if (rf) rf.style.display = hoteisCurrentMarket()==='brasil' ? 'none' : 'flex';
}

function hoteisFiltrar() {
  if(!HOTEIS_SHARED_READY&&!HOTEIS_SHARED_LOADING&&hoteisCurrentUser())setTimeout(()=>hoteisLoadSharedProfiles(false),0);
  hoteisSyncHeader();
  const q = (document.getElementById('hotelSearchFilter')?.value || '').toLowerCase();
  const currentMarket = hoteisCurrentMarket();
  const sheetKeys = [...new Set([...Object.keys(HOTEIS_STATIC), ...Object.keys(HOTEIS_XLSX)])];
  const filtered = sheetKeys.filter(sk => {
    if (hoteisMarketOf(sk) !== currentMarket) return false;
    const d = HOTEIS_XLSX[sk];
    const nome = d?.nome || sk;
    const regiao = hoteisRegionOf(sk);
    const matchR = currentMarket==='brasil' || !hoteisFiltroRegiao || regiao === hoteisFiltroRegiao;
    const matchQ = !q || nome.toLowerCase().includes(q) || regiao.toLowerCase().includes(q) || (d?.morada||'').toLowerCase().includes(q);
    return matchR && matchQ;
  });
  hoteisRender(filtered);
}

function hoteisRender(sheetKeys) {
  const grid = document.getElementById('hoteisGrid');
  if (!sheetKeys.length) { const def=window.VG?.market?.def?.(); grid.innerHTML = `<div class="ht-empty-state"><strong>Sem fichas de hotel para ${def?.label||'a geografia selecionada'}.</strong><span>Quando existirem fichas técnicas desta geografia, serão apresentadas aqui. Os dados de outras geografias não são misturados.</span></div>`; return; }
  const stars = n => '★'.repeat(n||4) + '<span style="opacity:.2">★</span>'.repeat(5-(n||4));

  grid.innerHTML = sheetKeys.map(sk => {
    const s = HOTEIS_STATIC[sk] || {regiao:hoteisRegionOf(sk),url:''};
    const d = HOTEIS_XLSX[sk];
    const nome = d?.nome || sk.replace('VG ','Vila Galé ').replace('VGC ','Vila Galé Collection ');
    const estrelas = s.estrelas || d?.estrelas || 4;
    const url = d?.web || s.url;

    if (!d) {
      // No Excel data yet — simple card
      return `<div class="ht-card">
        <div class="ht-card-head">
          <div><div class="ht-hotel-name">${nome}</div><div class="ht-regiao">${s.regiao}</div></div>
          <div class="ht-stars">${stars(estrelas)}</div>
        </div>
        <div class="ht-card-body">
          <div style="color:var(--text-3);font-size:11px;font-style:italic">Carregue a Ficha Técnica Excel para ver os detalhes.</div>
        </div>
        <div class="ht-card-foot">
          <div class="ht-location">📍 ${s.regiao}</div>
          <div style="display:flex;gap:7px;align-items:center">${hoteisCanEdit(sk)?`<button class="ht-edit-btn" type="button" onclick="hoteisOpenEditor(decodeURIComponent('${encodeURIComponent(sk)}'))">✎ Editar</button>`:''}${url?`<a class="ht-link" href="${url}" target="_blank">Ver hotel ↗</a>`:''}</div>
        </div>
      </div>`;
    }

    // Full card with Excel data
    const restHtml = d.rests.map(r =>
      `<div class="ht-rest-item"><strong>${r.nome}</strong>${r.tipo?' · '+r.tipo:''} ${r.cap?'('+r.cap+' pax)':''}</div>`
    ).join('');
    const barsHtml = d.bars.map(b =>
      `<div class="ht-rest-item">🍹 ${b.nome}${b.horario?' · '+b.horario:''}</div>`
    ).join('');

    const badges = [
      d.piscExt && d.piscExt !== 'Não' ? `<span class="ht-badge">☀️ Piscina exterior</span>` : '',
      d.piscInt && d.piscInt !== 'Não' ? `<span class="ht-badge">🏊 Piscina interior${d.piscIntHorario?' · '+d.piscIntHorario:''}</span>` : '',
      d.spaHorario ? `<span class="ht-badge">💆 Satsanga Spa</span>` : '',
      d.nSalas ? `<span class="ht-badge">🏢 ${d.nSalas} sala${d.nSalas>1?'s':''} reunião${d.salasLoc?' · '+d.salasLoc:''}</span>` : '',
      d.garagem && d.garagem !== 'Não' ? `<span class="ht-badge">🚗 Garagem${d.garagemCap?' ('+d.garagemCap+' lug.)':''}${d.garagemVal?' · '+d.garagemVal:''}</span>` : '',
      d.langs.length ? `<span class="ht-badge">🌐 ${d.langs.join(' · ')}</span>` : '',
    ].filter(Boolean).join('');

    const segsHtml = d.segs.length ? `<div class="ht-row" style="margin-top:6px">${d.segs.map(s=>`<span class="ht-tag">${s}</span>`).join('')}</div>` : '';

    const contactsHtml = d.contacts.length ? `
      <div class="ht-section-lbl" style="margin-top:10px">Contactos</div>
      ${d.contacts.map(c=>`<div style="font-size:10px;color:var(--text-2);padding:3px 0;border-bottom:1px solid var(--border-2);display:flex;gap:8px;flex-wrap:wrap">
        <span style="color:var(--text-3);min-width:120px">${c.role}</span>
        <span style="color:var(--text-1);font-weight:600">${c.nome}</span>
        ${c.email?`<a href="mailto:${c.email}" style="color:var(--gold);font-size:10px">${c.email}</a>`:''}
        ${c.tel?`<span style="font-family:var(--mono)">${c.tel}</span>`:''}
      </div>`).join('')}` : '';

    const distHtml = d.distances.length ? `
      <div class="ht-section-lbl" style="margin-top:10px">Distâncias</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
        ${d.distances.slice(0,10).map(dist=>`<div style="font-size:10px;color:var(--text-2);padding:2px 0">
          <span style="color:var(--text-3)">${dist.label}:</span> <span style="font-family:var(--mono);color:var(--text-1)">${dist.val}</span>${dist.ref?` <span style="color:var(--text-3)">${dist.ref}</span>`:''}
        </div>`).join('')}
      </div>` : '';

    const checkHtml = (d.checkIn || d.checkOut) ? `
      <div class="ht-section-lbl" style="margin-top:10px">Check-in / Check-out</div>
      <div style="display:flex;gap:16px;font-size:11px">
        ${d.checkIn?`<span>🔑 Check-in: <strong>${d.checkIn}</strong></span>`:''}
        ${d.checkOut?`<span>🔓 Check-out: <strong>${d.checkOut}</strong></span>`:''}
      </div>` : '';

    const infoHtml = [
      d.totalQ   ? `<span class="ht-badge">🛏 ${d.totalQ} quartos</span>` : '',
      d.nPisos   ? `<span class="ht-badge">🏗 ${d.nPisos} pisos</span>` : '',
      d.anoCons  ? `<span class="ht-badge">📅 Const. ${d.anoCons}</span>` : '',
      d.anoReform? `<span class="ht-badge">🔧 Reform. ${d.anoReform}</span>` : '',
    ].filter(Boolean).join('');

    return `<div class="ht-card">
      <div class="ht-card-head">
        <div>
          <div class="ht-hotel-name">${nome}</div>
          <div class="ht-regiao">${s.regiao}${d.morada?' · '+d.morada.split('\n')[0]:''}</div>
        </div>
        <div class="ht-stars">${stars(estrelas)}</div>
      </div>
      <div class="ht-card-body">
        ${segsHtml}
        ${infoHtml ? `<div class="ht-row">${infoHtml}</div>` : ''}
        ${d.rests.length ? `<div><div class="ht-section-lbl">Restauração</div>${restHtml}${barsHtml}</div>` : ''}
        ${badges ? `<div><div class="ht-section-lbl">Instalações</div><div class="ht-row">${badges}</div></div>` : ''}
        ${checkHtml}
        ${contactsHtml}
        ${distHtml}
      </div>
      <div class="ht-card-foot">
        <div class="ht-location">📍 ${d.morada ? d.morada.split('\n')[0] : s.regiao}</div>
        <div style="display:flex;gap:7px;align-items:center">${hoteisCanEdit(sk)?`<button class="ht-edit-btn" type="button" onclick="hoteisOpenEditor(decodeURIComponent('${encodeURIComponent(sk)}'))">✎ Editar</button>`:''}${url?`<a class="ht-link" href="${url}" target="_blank">Ver hotel ↗</a>`:''}</div>
      </div>
    </div>`;
  }).join('');
}

function hoteisInit() {
  hoteisFiltrar();
  setTimeout(()=>hoteisLoadSharedProfiles(false),150);
}
try{window.VG?.events?.on?.('market:changed',()=>{hoteisFiltroRegiao='';hoteisFiltrar();});}catch(e){}

// ── Persistence ───────────────────────────────────────────
const _htBuild = buildSessionSnapshot;
buildSessionSnapshot = function() {
  const snap = _htBuild();
  if (Object.keys(HOTEIS_XLSX).length) snap.HOTEIS_XLSX = HOTEIS_XLSX;
  return snap;
};
const _htRestore = restoreFromSnapshot;
restoreFromSnapshot = function(snap) {
  try{ _htRestore(snap); }catch(e){ console.warn('Restauro anterior às Fichas de Hotel falhou:', e); }
  try{
    if (snap.HOTEIS_XLSX) { HOTEIS_XLSX = snap.HOTEIS_XLSX; hoteisFiltrar(); }
  }catch(e){ console.warn('Atualização do ecrã de Fichas de Hotel falhou (dados já estão carregados):', e); }
};
