// VG · Dashboard Operações — API partilhada + autenticação server-side.
//
// Segurança v3:
// - passwords nunca são devolvidas ao browser e são guardadas com scrypt + salt;
// - sessões são tokens HMAC assinados pelo servidor;
// - todos os dados partilhados exigem sessão válida;
// - escritas são autorizadas por perfil no servidor;
// - utilizadores antigos em texto simples são migrados automaticamente no primeiro acesso;
// - contas ainda com a password inicial são obrigadas a alterá-la.

const { getStore, connectLambda } = require("@netlify/blobs");
const crypto = require("crypto");

const STORE_NAME = "vg-dashboard-operacoes";
const MAX_BODY_BYTES = 5.5 * 1024 * 1024;
const MAX_AUDIT_ROWS = 300;
const AUDIT_EVENT_PREFIX = "_audit-event/";
const AUDIT_EVENT_LIMIT = 1000;
const SESSION_TTL_SECONDS = 12 * 60 * 60;
const USER_CACHE_MS = 30 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 8;
const ACTION_PREFIX = "ops-action/";
const AGENDA_PREFIX = "ops-agenda/";
const DOCUMENT_META_PREFIX = "ops-doc-meta/";
const DOCUMENT_DATA_PREFIX = "ops-doc-data/";
const HOTEL_PROFILE_PREFIX = "ops-hotel-profile/";
const APPROVAL_PREFIX = "ops-approval/";
const SCENARIO_PREFIX = "ops-scenario/";
const CITYLEDGER_SNAPSHOT_PREFIX = "ops-cityledger-snapshot/";
const CITYLEDGER_DATA_PREFIX = "ops-cityledger-data/";
const CITYLEDGER_DILIGENCE_PREFIX = "ops-cityledger-diligence/";
const CITYLEDGER_EMAIL_TEMPLATES_KEY = "ops-cityledger-email-templates";
const DOCUMENT_MAX_BYTES = 3.5 * 1024 * 1024;
const DATA_IMPORT_PREFIX = "_data-import/";
const DATA_BACKUP_PREFIX = "_data-backup/";
const DATA_HISTORY_LIMIT = 250;
const DATA_ALLOWED_SOURCES = new Set(["pnl_month","pnl_accum","occupancy","occupancy_ref","reputation","instagram","hotels","purchases","session"]);
const RECOVERY_SNAPSHOT_PREFIX = "_recovery-snapshot/";
const RECOVERY_DATA_PREFIX = "_recovery-data/";
const RECOVERY_MAX_SNAPSHOTS = 20;
const ACTION_STATUSES = new Set(["open", "progress", "waiting", "resolved"]);
const AGENDA_TYPES = new Set(["audit", "visit", "meeting", "deadline", "operational", "other"]);
const DOCUMENT_CATEGORIES = new Set(["report", "audit", "minutes", "procedure", "evidence", "other"]);
const DOCUMENT_LINK_TYPES = new Set(["hotel", "action", "agenda", "approval"]);
const APPROVAL_TYPES = new Set(["target", "configuration", "operational", "exception", "document", "decision"]);
const APPROVAL_PRIORITIES = new Set(["normal", "high", "critical"]);
const APPROVAL_STATUSES = new Set(["pending", "approved", "rejected", "cancelled"]);
const APPROVAL_LINK_TYPES = new Set(["hotel", "action", "document", "agenda", "target"]);
const DOCUMENT_EXTENSIONS = new Set(["pdf", "doc", "docx", "xls", "xlsx", "csv", "png", "jpg", "jpeg", "webp", "txt"]);
const CITYLEDGER_METHODS = new Set(["phone","email","meeting","other"]);
const CITYLEDGER_RESULTS = new Set(["answered","no_answer","promise","sent","dispute","other"]);
const CITYLEDGER_STATUSES = new Set(["to_contact","contacted","promise","regularizing","dispute","legal","regularized"]);
const CITYLEDGER_EMAIL_TEMPLATE_IDS = new Set(["first","reminder","urgent"]);
const CITYLEDGER_DEFAULT_EMAIL_TEMPLATES = [
  {id:"first",name:"1.º Contacto",subject:"Vila Galé — Documentos pendentes | {{ENTIDADE}}",body:"Exmos. Senhores,\n\nNa sequência da conferência da nossa conta corrente, verificamos que se encontram pendentes os documentos constantes do extrato em anexo, com um saldo em aberto de {{SALDO}}.\n\nAgradecemos a vossa verificação e, caso os documentos já tenham sido regularizados, o envio do respetivo comprovativo. Em alternativa, agradecemos indicação da data prevista para pagamento.\n\nCom os melhores cumprimentos,"},
  {id:"reminder",name:"2.º Contacto",subject:"Vila Galé — Reforço de cobrança | {{ENTIDADE}}",body:"Exmos. Senhores,\n\nVoltamos ao vosso contacto relativamente aos documentos pendentes identificados no extrato em anexo, cujo saldo em aberto é de {{SALDO}}.\n\nAté ao momento não identificámos a respetiva regularização. Solicitamos, por favor, informação quanto à data prevista para pagamento ou, caso o pagamento já tenha sido efetuado, o envio do comprovativo.\n\nAgradecemos a vossa atenção para este assunto.\n\nCom os melhores cumprimentos,"},
  {id:"urgent",name:"Cobrança Urgente",subject:"Vila Galé — Regularização urgente de saldo | {{ENTIDADE}}",body:"Exmos. Senhores,\n\nMantêm-se por regularizar os documentos constantes do extrato em anexo, correspondentes a um saldo em aberto de {{SALDO}}.\n\nSolicitamos a regularização com a maior brevidade ou, em alternativa, uma indicação objetiva da data de pagamento. Caso exista alguma divergência documental, agradecemos que a mesma seja identificada de imediato para análise.\n\nSe o pagamento já tiver sido efetuado, agradecemos o envio do respetivo comprovativo.\n\nCom os melhores cumprimentos,"}
];

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};

function response(statusCode, body) { return { statusCode, headers: HEADERS, body: JSON.stringify(body) }; }
function ok(body) { return response(200, body); }
function badRequest(msg) { return response(400, { error: msg }); }
function unauthorized(msg = "Sessão inválida ou expirada.") { return response(401, { error: msg }); }
function forbidden(msg = "Sem permissões para esta operação.") { return response(403, { error: msg }); }
function conflict(msg, extra = {}) { return response(409, Object.assign({ error: msg }, extra)); }
function tooMany(msg) { return response(429, { error: msg }); }
function tooLarge(msg) { return response(413, { error: msg }); }
function serverError(err) {
  console.error("Erro na função dashboard-sessao:", err);
  return response(500, { error: "Erro interno ao aceder aos dados partilhados." });
}

function bodySizeOf(event) {
  const raw = event.body || "";
  return event.isBase64Encoded ? Math.ceil((raw.length * 3) / 4) : Buffer.byteLength(raw, "utf8");
}
function parseBody(event) {
  try { return JSON.parse(event.body || "{}"); } catch (e) { return null; }
}
function blobKeyFor(resource, key) {
  if (key === undefined || key === null || key === "") return resource;
  return resource + "-" + encodeURIComponent(String(key));
}
const MARKET_IDS = new Set(["iberia","brasil"]);
function marketId(v) { const x=String(v||"iberia").toLowerCase(); return MARKET_IDS.has(x)?x:"iberia"; }
function marketStoreKey(market,key) { market=marketId(market); return market === "iberia" ? key : `market/${market}/${key}`; }
function itemMarket(item) { return marketId(item?.market || "iberia"); }
const BR_HOTELS_SERVER = new Set(["FORTALEZA","SALVADOR","CUMBUCO","RIO DE JANEIRO","TOUROS","MARES","PAULISTA","CABO","ECO RESORT DE ANGRA","ALAGOAS","COLLECTION SUNSET CUMBUCO","COLLECTION OURO PRETO","COLLECTION AMAZONIA"]);
function normHotelMarket(s){ return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/\s+/g," ").trim(); }
function hotelMarketServer(h){ const k=normHotelMarket(h); if(BR_HOTELS_SERVER.has(k))return "brasil"; if(k.includes("AMAZONIA")||k.includes("OURO PRETO")||k.includes("SUNSET CUMBUCO")||k.includes("ECO RESORT DE ANGRA"))return "brasil"; return "iberia"; }
const VALID_ROLES = new Set(["direcao","diretor","assistente","governanta","chefe_recepcao","compras","admin"]);
const DIRECTION_ONLY_MODULES = new Set(["governance","backup","upload","datacenter"]);
const DEFAULT_MODULES_BY_ROLE = {
  diretor:["resumo","hotel360","hoteis","fichahotel","agenda","actions","approvals","cityledger","receitas","receitasdet","custos","pl","unitEconomics","revenuehub","compras","benchmark","anomalies","reputacao","instagram","documents","automaticreports","analyticalassistant","ab","housekeeping","ocupacao","costanalysis","cua","compare","ranking","sazonalidade","simulador","orcamento","alertas"],
  assistente:["resumo","hotel360","hoteis","fichahotel","agenda","actions","approvals","cityledger","receitas","receitasdet","custos","pl","revenuehub","compras","benchmark","reputacao","instagram","documents","automaticreports","housekeeping","ocupacao","alertas"],
  governanta:["housekeeping"],
  chefe_recepcao:["resumo","hotel360","hoteis","fichahotel","agenda","actions","approvals","cityledger","reputacao","documents","ocupacao"],
  compras:["resumo","compras","ab","housekeeping"]
};
function normalizeRole(role){ const r=String(role||"diretor").toLowerCase(); if(r==="admin")return "direcao"; if(r==="director")return "diretor"; return VALID_ROLES.has(r)?r:"diretor"; }
function isDirection(user) { return !!user && (normalizeRole(user.role) === "direcao"); }
function userHotels(user){
  if(!user)return [];
  if(isDirection(user))return ["*"];
  const raw=Array.isArray(user.hotels)?user.hotels:(user.hotel&&user.hotel!=="*"?[user.hotel]:[]);
  return [...new Set(raw.map(x=>String(x||"").trim()).filter(Boolean))];
}
function userCanHotel(user,hotel){ if(isDirection(user))return true; const h=hotelProfileNorm(hotel); return !!h&&userHotels(user).some(x=>hotelProfileNorm(x)===h); }
function userModules(user){
  if(!user)return []; if(isDirection(user))return ["*"];
  const r=normalizeRole(user.role),raw=Array.isArray(user.modules)?user.modules:DEFAULT_MODULES_BY_ROLE[r]||[];
  return [...new Set(raw.map(x=>String(x||"").trim()).filter(x=>x&&!DIRECTION_ONLY_MODULES.has(x)))];
}
function userCanModule(user,module){ if(isDirection(user))return true; return userModules(user).includes(String(module||"")); }
function resourceModule(resource){
  const r=String(resource||"");
  if(r==="hotelsheet")return "fichahotel";
  if(r.startsWith("ops-cityledger"))return "cityledger";
  if(r.startsWith("ops-document"))return "documents";
  if(r.startsWith("ops-approval"))return "approvals";
  if(r.startsWith("ops-agenda"))return "agenda";
  if(r.startsWith("ops-action"))return "actions";
  if(r.startsWith("ops-scenario"))return "revenuehub";
  if(r.startsWith("ops-hotel-profile"))return "hoteis";
  if(r.startsWith("ops-reputation"))return "reputacao";
  if(r.startsWith("ops-ab"))return "ab";
  if(r.startsWith("ops-housekeeping"))return "housekeeping";
  return "";
}
function userMarketServer(user){ const hs=userHotels(user).filter(x=>x!=="*"); return hs.length===1?hotelMarketServer(hs[0]):"iberia"; }
function isGlobalResource(resource){ return ["auth-change-password","users","assignees","vg_presence","audit","audit-events","recovery-list","recovery-create","recovery-restore","recovery-delete"].includes(resource); }
function norm(s) { return String(s || "").trim().toUpperCase(); }
function safeUserName(s) { return String(s || "").trim().toLowerCase().replace(/[^a-z0-9_.-]/g, ""); }

function cleanText(v, max = 500) { return String(v == null ? "" : v).trim().slice(0, max); }
function validDateOnly(v) { return !v || /^\d{4}-\d{2}-\d{2}$/.test(String(v)); }
function nextIsoTimestamp(previous) {
  const now = Date.now();
  const prev = previous ? Date.parse(String(previous)) : NaN;
  return new Date(Number.isFinite(prev) && now <= prev ? prev + 1 : now).toISOString();
}
function actionBlobKey(id) { return ACTION_PREFIX + String(id || "").replace(/[^a-zA-Z0-9_.-]/g, ""); }
function agendaBlobKey(id) { return AGENDA_PREFIX + String(id || "").replace(/[^a-zA-Z0-9_.-]/g, ""); }
function documentMetaBlobKey(id) { return DOCUMENT_META_PREFIX + String(id || "").replace(/[^a-zA-Z0-9_.-]/g, ""); }
function documentDataBlobKey(id) { return DOCUMENT_DATA_PREFIX + String(id || "").replace(/[^a-zA-Z0-9_.-]/g, ""); }
function hotelProfileBlobKey(market,key){ const h=crypto.createHash("sha1").update(norm(key)).digest("hex"); return HOTEL_PROFILE_PREFIX+marketId(market)+"/"+h; }
function hotelProfileNorm(v){ return normHotelMarket(v).replace(/^(HOTEL\s+)?VILA\s+GALE\s+/,"").replace(/^VG(C)?\s+/,"").replace(/^COLLECTION\s+/,"").replace(/\s+/g," ").trim(); }
function approvalBlobKey(id) { return APPROVAL_PREFIX + String(id || "").replace(/[^a-zA-Z0-9_.-]/g, ""); }
function scenarioBlobKey(id) { return SCENARIO_PREFIX + String(id || "").replace(/[^a-zA-Z0-9_.-]/g, ""); }
function citySafeId(v){ return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9_.-]/g,"_").slice(0,180); }
function citySnapshotBlobKey(market,id){ return marketStoreKey(market,CITYLEDGER_SNAPSHOT_PREFIX+citySafeId(id)); }
function cityChunkBlobKey(market,snapshot,hotel,part){ return marketStoreKey(market,CITYLEDGER_DATA_PREFIX+citySafeId(snapshot)+"/"+citySafeId(hotel)+"/"+String(Number(part)||0).padStart(4,"0")); }
function cityDiligenceBlobKey(market,id){ return marketStoreKey(market,CITYLEDGER_DILIGENCE_PREFIX+citySafeId(id)); }
function cityEmailTemplatesBlobKey(market){ return marketStoreKey(market,CITYLEDGER_EMAIL_TEMPLATES_KEY); }
async function listCityLedgerSnapshots(store,market,user){
  const prefix=marketStoreKey(market,CITYLEDGER_SNAPSHOT_PREFIX),listing=await store.list({prefix}),blobs=listing&&Array.isArray(listing.blobs)?listing.blobs:[];
  const rows=(await Promise.all(blobs.map(async e=>{try{return await store.get(e.key,{type:"json"});}catch(err){return null;}}))).filter(Boolean).sort((a,b)=>String(b.snapshotDate||"").localeCompare(String(a.snapshotDate||""))||String(b.createdAt||"").localeCompare(String(a.createdAt||"")));
  if(isDirection(user))return rows;
  const allowed=userHotels(user);
  return rows.map(r=>{const hs=(r.hotels||[]).filter(x=>allowed.some(h=>norm(x)===norm(h)));if(!hs.length)return null;const bh=(r.summary?.byHotel||[]).filter(x=>allowed.some(h=>norm(x.hotel)===norm(h)));const parts={};for(const h of hs)parts[h]=Number(r.partsByHotel?.[h]||0);const summary=Object.assign({},r.summary||{}, {byHotel:bh,byBucket:{},byCurrency:{},debt:bh.reduce((s,x)=>s+Number(x.debt||0),0),balance:bh.reduce((s,x)=>s+Number(x.balance||0),0),credits:bh.reduce((s,x)=>s+Number(x.credits||0),0),documents:bh.reduce((s,x)=>s+Number(x.documents||0),0),clients:bh.reduce((s,x)=>s+Number(x.clients||0),0)});return Object.assign({},r,{hotels:hs,partsByHotel:parts,summary});}).filter(Boolean);
}
async function listCityLedgerDiligences(store,market,user){
  const prefix=marketStoreKey(market,CITYLEDGER_DILIGENCE_PREFIX),listing=await store.list({prefix}),blobs=listing&&Array.isArray(listing.blobs)?listing.blobs:[];
  const rows=(await Promise.all(blobs.map(async e=>{try{return await store.get(e.key,{type:"json"});}catch(err){return null;}}))).filter(x=>x&&x.id);
  return rows.filter(x=>isDirection(user)||userCanHotel(user,x.hotel)).sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||""))).slice(0,3000);
}
function documentExt(name) { const p=String(name||"").toLowerCase().split("."); return p.length>1?p.pop():""; }
function documentMimeForName(name) {
  const ext=documentExt(name);
  return ({pdf:"application/pdf",doc:"application/msword",docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",xls:"application/vnd.ms-excel",xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",csv:"text/csv; charset=utf-8",png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",webp:"image/webp",txt:"text/plain; charset=utf-8"})[ext]||"application/octet-stream";
}
function safeDocumentFileName(name) { return cleanText(String(name||"").replace(/[\/\\<>:\"|?*\x00-\x1F]/g,"_"), 240); }
function canManageHotel(user, hotel) { return !!user && userCanHotel(user,hotel); }
function canManageAction(user, action) {
  if (!user || !action) return false;
  return canManageHotel(user, action.hotel) || safeUserName(action.ownerUser) === safeUserName(user.user);
}
function minimalAssignee(rec) {
  return { user: rec.user, name: rec.name, role: rec.role, hotel: rec.hotel || "*", hotels:userHotels(rec), modules:userModules(rec), active: rec.active !== false };
}
async function listOperationalActions(store, market="iberia") {
  const listing = await store.list({ prefix: ACTION_PREFIX });
  const blobs = (listing && Array.isArray(listing.blobs)) ? listing.blobs : [];
  const rows = await Promise.all(blobs.map(async (entry) => {
    try { return await store.get(entry.key, { type: "json" }); } catch (e) { return null; }
  }));
  return rows.filter(x => x && x.id && itemMarket(x)===marketId(market)).sort((a,b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
}
async function listOperationalAgenda(store, market="iberia") {
  const listing = await store.list({ prefix: AGENDA_PREFIX });
  const blobs = (listing && Array.isArray(listing.blobs)) ? listing.blobs : [];
  const rows = await Promise.all(blobs.map(async (entry) => {
    try { return await store.get(entry.key, { type: "json" }); } catch (e) { return null; }
  }));
  return rows.filter(x => x && x.id && itemMarket(x)===marketId(market)).sort((a,b) => String(a.date || "").localeCompare(String(b.date || "")) || String(a.startTime || "").localeCompare(String(b.startTime || "")));
}
function canSeeAgendaEvent(user, item) {
  if (!user || !item) return false;
  if (isDirection(user)) return true;
  return userCanHotel(user,item.hotel) || safeUserName(item.ownerUser) === safeUserName(user.user);
}
function canManageAgendaEvent(user, item) { return canSeeAgendaEvent(user, item); }
async function listOperationalDocuments(store, market="iberia") {
  const listing = await store.list({ prefix: DOCUMENT_META_PREFIX });
  const blobs = listing && Array.isArray(listing.blobs) ? listing.blobs : [];
  const rows = await Promise.all(blobs.map(async entry => {
    try { return await store.get(entry.key, { type:"json" }); } catch (e) { return null; }
  }));
  return rows.filter(x=>x&&x.id&&itemMarket(x)===marketId(market)).sort((a,b)=>String(b.updatedAt||b.createdAt||"").localeCompare(String(a.updatedAt||a.createdAt||"")));
}
function canSeeDocument(user,item) { if(!user||!item)return false; return isDirection(user)||userCanHotel(user,item.hotel); }
function canManageDocument(user,item) { return canSeeDocument(user,item); }
async function documentLinkLabel(store, linkType, linkId, hotel, market="iberia") {
  if (linkType === "hotel") return cleanText(hotel,120);
  if (linkType === "action") {
    const a = await store.get(actionBlobKey(linkId), { type:"json" });
    if (!a) throw new Error("Ação associada não encontrada.");
    if (itemMarket(a)!==marketId(market)) throw new Error("A referência associada pertence a outra geografia.");
    if (norm(a.hotel)!==norm(hotel)) throw new Error("A ação associada pertence a outro hotel.");
    return cleanText(a.sourceTitle||a.title||linkId,240);
  }
  if (linkType === "agenda") {
    const e = await store.get(agendaBlobKey(linkId), { type:"json" });
    if (!e) throw new Error("Evento associado não encontrado.");
    if (itemMarket(e)!==marketId(market)) throw new Error("A referência associada pertence a outra geografia.");
    if (norm(e.hotel)!==norm(hotel)) throw new Error("O evento associado pertence a outro hotel.");
    return cleanText([e.title,e.date].filter(Boolean).join(" · "),240);
  }
  if (linkType === "approval") {
    const a = await store.get(approvalBlobKey(linkId), { type:"json" });
    if (!a) throw new Error("Pedido de aprovação associado não encontrado.");
    if (itemMarket(a)!==marketId(market)) throw new Error("A referência associada pertence a outra geografia.");
    if (norm(a.hotel)!==norm(hotel)) throw new Error("O pedido de aprovação associado pertence a outro hotel.");
    return cleanText([a.title,a.status].filter(Boolean).join(" · "),240);
  }
  return "";
}
function documentHistoryEntry(user,type,detail){ return {ts:new Date().toISOString(),type,detail:cleanText(detail,1200),user:user.user,name:user.name}; }

async function listOperationalApprovals(store, market="iberia") {
  const listing = await store.list({ prefix: APPROVAL_PREFIX });
  const blobs = listing && Array.isArray(listing.blobs) ? listing.blobs : [];
  const rows = await Promise.all(blobs.map(async entry => {
    try { return await store.get(entry.key, { type:"json" }); } catch (e) { return null; }
  }));
  return rows.filter(x=>x&&x.id&&itemMarket(x)===marketId(market)).sort((a,b)=>{
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (b.status === "pending" && a.status !== "pending") return 1;
    const rank={critical:3,high:2,normal:1};
    return (rank[b.priority]||0)-(rank[a.priority]||0) || String(b.updatedAt||b.createdAt||"").localeCompare(String(a.updatedAt||a.createdAt||""));
  });
}
function canSeeApproval(user,item) {
  if (!user || !item) return false;
  if (isDirection(user)) return true;
  return userCanHotel(user,item.hotel) || safeUserName(item.requesterUser) === safeUserName(user.user) || safeUserName(item.approverUser) === safeUserName(user.user);
}
function canEditApproval(user,item) {
  if (!user || !item || item.status !== "pending") return false;
  return isDirection(user) || safeUserName(item.requesterUser) === safeUserName(user.user);
}
function canCancelApproval(user,item) { return canEditApproval(user,item); }
function canDecideApproval(user,item) {
  if (!isDirection(user) || !item || item.status !== "pending") return false;
  const explicit = safeUserName(item.approverUser);
  return !explicit || explicit === safeUserName(user.user);
}
async function approvalLinkLabel(store, linkType, linkId, hotel, market="iberia") {
  if (linkType === "hotel") return cleanText(hotel,120);
  if (linkType === "target") return cleanText(linkId,240);
  if (linkType === "action") {
    const a=await store.get(actionBlobKey(linkId),{type:"json"});
    if(!a) throw new Error("Ação associada não encontrada.");
    if(itemMarket(a)!==marketId(market)) throw new Error("A referência associada pertence a outra geografia.");
    if(norm(a.hotel)!==norm(hotel)) throw new Error("A ação associada pertence a outro hotel.");
    return cleanText(a.sourceTitle||a.title||linkId,240);
  }
  if (linkType === "agenda") {
    const e=await store.get(agendaBlobKey(linkId),{type:"json"});
    if(!e) throw new Error("Evento associado não encontrado.");
    if(itemMarket(e)!==marketId(market)) throw new Error("A referência associada pertence a outra geografia.");
    if(norm(e.hotel)!==norm(hotel)) throw new Error("O evento associado pertence a outro hotel.");
    return cleanText([e.title,e.date].filter(Boolean).join(" · "),240);
  }
  if (linkType === "document") {
    const d=await store.get(documentMetaBlobKey(linkId),{type:"json"});
    if(!d) throw new Error("Documento associado não encontrado.");
    if(itemMarket(d)!==marketId(market)) throw new Error("A referência associada pertence a outra geografia.");
    if(norm(d.hotel)!==norm(hotel)) throw new Error("O documento associado pertence a outro hotel.");
    return cleanText(d.title||d.fileName||linkId,240);
  }
  return "";
}
function approvalHistoryEntry(user,type,detail,extra={}) {
  return Object.assign({ts:new Date().toISOString(),type,detail:cleanText(detail,1600),user:user.user,name:user.name},extra);
}

async function listOperationalScenarios(store, market="iberia") {
  const listing = await store.list({ prefix: SCENARIO_PREFIX });
  const blobs = listing && Array.isArray(listing.blobs) ? listing.blobs : [];
  const rows = await Promise.all(blobs.map(async entry => {
    try { return await store.get(entry.key, { type:"json" }); } catch (e) { return null; }
  }));
  return rows.filter(x=>x&&x.id&&itemMarket(x)===marketId(market)).sort((a,b)=>String(b.updatedAt||b.createdAt||"").localeCompare(String(a.updatedAt||a.createdAt||"")));
}
function canSeeScenario(user,item) { if(!user||!item)return false; return isDirection(user)||userCanHotel(user,item.hotel); }
function canManageScenario(user,itemOrHotel) { const hotel=typeof itemOrHotel==="string"?itemOrHotel:itemOrHotel?.hotel; return !!user&&!!hotel&&userCanHotel(user,hotel); }
function scenarioAdjustments(input) {
  const src=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
  const limits={occDelta:[-20,20],adrPct:[-30,30],otherRevenuePct:[-30,30],personnelPct:[-20,20],otherCostPct:[-20,20]};
  const out={};
  for(const [k,[min,max]] of Object.entries(limits)){
    const v=Number(src[k]??0);
    if(!Number.isFinite(v)||v<min||v>max) throw new Error("Ajuste inválido: "+k);
    out[k]=Math.round(v*100)/100;
  }
  return out;
}
function scenarioNumericSnapshot(input, keys) {
  const src=input&&typeof input==="object"&&!Array.isArray(input)?input:{}; const out={};
  for(const k of keys){ const v=Number(src[k]); if(Number.isFinite(v)) out[k]=v; }
  return out;
}
function scenarioBaseline(input) {
  const out=scenarioNumericSnapshot(input,["forecastOcc","target","adrBase","baseRevenue","personnelRatio","otherCostRatio","sedeRatio","availableRN"]);
  out.referenceYear=cleanText(input?.referenceYear,10); out.source=cleanText(input?.source,240); out.latestAt=cleanText(input?.latestAt,80); return out;
}
function scenarioCaptured(input) { return scenarioNumericSnapshot(input,["occ","rn","adr","lodging","nonRoom","revenue","personnel","otherCosts","costs","sedeEffect","gop","gopPct","revpar","trevpar"]); }
function scenarioHistoryEntry(user,type,detail) { return {ts:new Date().toISOString(),type,detail:cleanText(detail,1200),user:user.user,name:user.name}; }
function validTimeOnly(v) { return !v || /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v)); }
function agendaHistoryEntry(user, type, detail) { return { ts:new Date().toISOString(), type, detail:cleanText(detail,1200), user:user.user, name:user.name }; }
function actionHistoryEntry(user, type, detail, extra = {}) {
  return Object.assign({
    ts: new Date().toISOString(),
    type,
    detail: cleanText(detail, 1200),
    user: user.user,
    name: user.name
  }, extra);
}

function dataImportBlobKey(id) { return DATA_IMPORT_PREFIX + String(id || "").replace(/[^a-zA-Z0-9_.-]/g, ""); }
function dataBackupBlobKey(id) { return DATA_BACKUP_PREFIX + String(id || "").replace(/[^a-zA-Z0-9_.-]/g, ""); }
function cleanDataMetrics(v) {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out = {};
  Object.entries(v).slice(0, 30).forEach(([k,val]) => {
    const key = cleanText(k, 80);
    if (!key) return;
    if (["string","number","boolean"].includes(typeof val) || val == null) out[key] = typeof val === "string" ? cleanText(val, 300) : val;
  });
  return out;
}
async function listDataImports(store, market="iberia") {
  const listing = await store.list({ prefix: DATA_IMPORT_PREFIX });
  const blobs = (listing && Array.isArray(listing.blobs)) ? listing.blobs : [];
  const rows = await Promise.all(blobs.map(async (entry) => {
    try { return await store.get(entry.key, { type: "json" }); } catch (e) { return null; }
  }));
  return rows.filter(x => x && x.id && itemMarket(x)===marketId(market)).sort((a,b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))).slice(0, DATA_HISTORY_LIMIT);
}


function recoverySnapshotKey(id) { return RECOVERY_SNAPSHOT_PREFIX + String(id || "").replace(/[^a-zA-Z0-9_.-]/g, ""); }
function recoveryDataKey(id, idx) { return RECOVERY_DATA_PREFIX + String(id || "").replace(/[^a-zA-Z0-9_.-]/g, "") + "/" + String(idx).padStart(5, "0"); }
function isRecoverableBusinessKey(key) {
  let k = String(key || "");
  if (k.startsWith("market/brasil/")) k = k.slice("market/brasil/".length);
  if (["index","meta","notas","cdmeta","targets-rules"].includes(k)) return true;
  return ["mes-","mesacum-","hotel-","occ-","ig-","rd-","piu-","hotelxlsx-","cdbatch-","settings-","hotelsheet-","ops-action/","ops-agenda/","ops-doc-meta/","ops-doc-data/","ops-hotel-profile/","ops-approval/","ops-scenario/","ops-cityledger-snapshot/","ops-cityledger-data/","ops-cityledger-diligence/","ops-housekeeping-","ops-ab-","ops-reputation-semester-","ops-cityledger-email-templates"].some(p => k.startsWith(p));
}
function recoveryCategoryForKey(key) {
  let k=String(key||""); if(k.startsWith("market/brasil/")) k=k.slice("market/brasil/".length);
  if (k === "index" || k === "meta") return "Índice / Metadados";
  if (k === "notas") return "Notas";
  if (k === "targets-rules" || k.startsWith("settings-")) return "Configuração";
  if (k.startsWith("hotelsheet-")) return "Comentários Fecho do Mês";
  if (k.startsWith("ops-action/")) return "Ações";
  if (k.startsWith("ops-agenda/")) return "Agenda";
  if (k.startsWith("ops-doc-meta/") || k.startsWith("ops-doc-data/")) return "Documentos";
  if (k.startsWith("ops-hotel-profile/")) return "Fichas dos Hotéis";
  if (k.startsWith("ops-approval/")) return "Aprovações";
  if (k.startsWith("ops-scenario/")) return "Cenários";
  if (k.startsWith("ops-cityledger-snapshot/") || k.startsWith("ops-cityledger-data/") || k.startsWith("ops-cityledger-diligence/") || k.startsWith("ops-cityledger-email-templates")) return "City Ledger";
  if (k.startsWith("ops-housekeeping-")) return "Housekeeping / Inventário Têxtil";
  if (k.startsWith("ops-ab-")) return "Compras & A&B";
  if (k.startsWith("ops-reputation-semester-")) return "Reputação Semestral";
  if (k.startsWith("mesacum-")) return "P&L acumulado";
  if (k.startsWith("mes-")) return "P&L mensal";
  if (k.startsWith("hotelxlsx-")) return "Fichas técnicas";
  if (k.startsWith("hotel-")) return "Reputação";
  if (k.startsWith("occ-")) return "Ocupação";
  if (k.startsWith("ig-")) return "Instagram";
  if (k.startsWith("rd-")) return "Receitas detalhadas";
  if (k.startsWith("piu-")) return "Referência ocupação";
  if (k === "cdmeta" || k.startsWith("cdbatch-")) return "Compras";
  return "Outros";
}
async function listRecoverySnapshots(store) {
  const listing = await store.list({ prefix: RECOVERY_SNAPSHOT_PREFIX });
  const blobs = listing && Array.isArray(listing.blobs) ? listing.blobs : [];
  const rows = await Promise.all(blobs.map(async entry => {
    try { return await store.get(entry.key, { type:"json" }); } catch (e) { return null; }
  }));
  return rows.filter(x => x && x.id && x.status === "ready").sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||"")));
}
async function deleteRecoverySnapshot(store, id) {
  const manifest = await store.get(recoverySnapshotKey(id), { type:"json" });
  if (!manifest) return false;
  const entries = Array.isArray(manifest.entries) ? manifest.entries : [];
  for (const e of entries) if (e && e.backupKey) await store.delete(e.backupKey);
  await store.delete(recoverySnapshotKey(id));
  return true;
}
async function pruneRecoverySnapshots(store) {
  const rows = await listRecoverySnapshots(store);
  if (rows.length <= RECOVERY_MAX_SNAPSHOTS) return;
  const automatic = rows.filter(x => x.kind === "pre_restore").sort((a,b)=>String(a.createdAt||"").localeCompare(String(b.createdAt||"")));
  while (rows.length > RECOVERY_MAX_SNAPSHOTS && automatic.length) {
    const victim = automatic.shift();
    await deleteRecoverySnapshot(store, victim.id);
    const idx = rows.findIndex(x=>x.id===victim.id); if (idx >= 0) rows.splice(idx,1);
  }
}
async function createRecoverySnapshot(store, user, options = {}) {
  const now = new Date().toISOString();
  const id = "bkp_" + Date.now().toString(36) + "_" + crypto.randomBytes(5).toString("hex");
  const all = await store.list();
  const source = (all && Array.isArray(all.blobs) ? all.blobs : []).filter(x => isRecoverableBusinessKey(x.key));
  const entries = [];
  const resourceCounts = {};
  let sizeBytes = 0;
  try {
    for (let i=0;i<source.length;i++) {
      const item = source[i];
      let raw = await store.get(item.key, { type:"text", consistency:"strong" });
      if (raw === null || raw === undefined) continue;
      if (typeof raw !== "string") raw = JSON.stringify(raw);
      const bytes = Buffer.byteLength(raw, "utf8");
      const backupKey = recoveryDataKey(id, i);
      if (typeof store.set === "function") await store.set(backupKey, raw);
      else {
        let parsed; try { parsed=JSON.parse(raw); } catch(e) { parsed=raw; }
        await store.setJSON(backupKey, parsed);
      }
      const category = recoveryCategoryForKey(item.key);
      resourceCounts[category] = Number(resourceCounts[category]||0) + 1;
      sizeBytes += bytes;
      entries.push({ key:item.key, backupKey, bytes, etag:item.etag || "", category });
    }
    const manifest = {
      id, status:"ready", kind: options.kind === "pre_restore" ? "pre_restore" : "manual",
      createdAt: now, user:user.user, name:user.name, role:user.role,
      note: cleanText(options.note, 500), sourceSnapshotId: cleanText(options.sourceSnapshotId, 100),
      items:entries.length, sizeBytes, resourceCounts, entries, appVersion:"29", buildVersion:"35.8"
    };
    await store.setJSON(recoverySnapshotKey(id), manifest);
    await pruneRecoverySnapshots(store);
    return manifest;
  } catch (err) {
    for (const e of entries) { try { await store.delete(e.backupKey); } catch (x) {} }
    throw err;
  }
}
async function restoreRecoverySnapshot(store, user, id) {
  const manifest = await store.get(recoverySnapshotKey(id), { type:"json", consistency:"strong" });
  if (!manifest || manifest.status !== "ready") throw new Error("Snapshot de recuperação não encontrado.");
  const entries = Array.isArray(manifest.entries) ? manifest.entries : [];
  if (!entries.length) throw new Error("Snapshot sem dados recuperáveis.");

  // Ler tudo antes de tocar no estado atual. Assim uma cópia incompleta nunca inicia uma reposição.
  const payloads = [];
  for (const e of entries) {
    if (!e || !e.key || !e.backupKey || !isRecoverableBusinessKey(e.key)) continue;
    let raw = await store.get(e.backupKey, { type:"text", consistency:"strong" });
    if (raw === null || raw === undefined) throw new Error("Snapshot incompleto: falta " + e.key);
    if (typeof raw !== "string") raw = JSON.stringify(raw);
    payloads.push({ key:e.key, raw });
  }
  if (!payloads.length) throw new Error("Snapshot sem payloads válidos.");

  const safety = await createRecoverySnapshot(store, user, { kind:"pre_restore", note:"Cópia automática antes de repor " + id, sourceSnapshotId:id });
  const currentListing = await store.list();
  const currentKeys = (currentListing && Array.isArray(currentListing.blobs) ? currentListing.blobs : []).map(x=>x.key).filter(isRecoverableBusinessKey);
  for (const k of currentKeys) await store.delete(k);
  for (const item of payloads) {
    if (typeof store.set === "function") await store.set(item.key, item.raw);
    else {
      let parsed; try { parsed=JSON.parse(item.raw); } catch(e) { parsed=item.raw; }
      await store.setJSON(item.key, parsed);
    }
  }
  USERS_CACHE = null; USERS_CACHE_AT = 0;
  return { manifest, safety, restoredItems:payloads.length, removedItems:currentKeys.length };
}

function auditEventBlobKey(id) { return AUDIT_EVENT_PREFIX + String(id || "").replace(/[^a-zA-Z0-9_.-]/g, ""); }
function auditSafeKey(k) { return !/(?:pass|password|token|secret|hash|salt|credential|authorization)/i.test(String(k || "")); }
function auditValue(v) {
  if (v === undefined) return "—";
  if (v === null) return null;
  if (typeof v === "string") return cleanText(v, 360);
  if (typeof v === "number" || typeof v === "boolean") return v;
  if (Array.isArray(v)) {
    if (v.length <= 8 && v.every(x => x == null || ["string","number","boolean"].includes(typeof x))) {
      return v.map(x => typeof x === "string" ? cleanText(x, 100) : x);
    }
    return `[${v.length} itens]`;
  }
  if (typeof v === "object") return `{${Object.keys(v).filter(auditSafeKey).length} campos}`;
  return cleanText(String(v), 200);
}
function auditDiff(before, after, prefix = "", out = [], depth = 0) {
  if (out.length >= 40) return out;
  const bothObjects = before && after && typeof before === "object" && typeof after === "object" && !Array.isArray(before) && !Array.isArray(after);
  if (bothObjects && depth < 4) {
    const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).filter(auditSafeKey).sort();
    for (const key of keys) {
      if (out.length >= 40) break;
      auditDiff(before[key], after[key], prefix ? `${prefix}.${key}` : key, out, depth + 1);
    }
    return out;
  }
  let equal = false;
  try { equal = JSON.stringify(before) === JSON.stringify(after); } catch (e) { equal = before === after; }
  if (!equal) out.push({ path: cleanText(prefix || "valor", 180), before: auditValue(before), after: auditValue(after) });
  return out;
}
function auditMeta(input) {
  const out = {};
  if (!input || typeof input !== "object") return out;
  Object.entries(input).slice(0, 24).forEach(([k,v]) => {
    if (!auditSafeKey(k)) return;
    const key = cleanText(k, 80);
    if (!key) return;
    if (v == null || ["string","number","boolean"].includes(typeof v)) out[key] = typeof v === "string" ? cleanText(v, 300) : v;
  });
  return out;
}
async function appendGovernanceAudit(store, user, input = {}) {
  const now = new Date().toISOString();
  const id = "aud_" + Date.now().toString(36) + "_" + crypto.randomBytes(5).toString("hex");
  const severity = ["info","warning","critical"].includes(input.severity) ? input.severity : "info";
  const changes = Array.isArray(input.changes) ? input.changes.slice(0,40) : auditDiff(input.before, input.after);
  const entry = {
    id, serverTs: now,
    user: user?.user || "system", name: user?.name || user?.user || "Sistema", role: user?.role || "system",
    category: cleanText(input.category || "Sistema", 80), action: cleanText(input.action || "Alteração", 120),
    resource: cleanText(input.resource, 100), key: cleanText(input.key, 180),
    hotel: cleanText(input.hotel || (user?.hotel && user.hotel !== "*" ? user.hotel : ""), 140),
    detail: cleanText(input.detail, 1200), severity, verified: true, source: "server",
    changes, meta: auditMeta(input.meta)
  };
  await store.setJSON(auditEventBlobKey(id), entry);
  return entry;
}
async function safeGovernanceAudit(store, user, input) {
  try { return await appendGovernanceAudit(store, user, input); }
  catch (e) { console.warn("Falha não bloqueante ao gravar auditoria v16:", e && e.message ? e.message : e); return null; }
}
async function listGovernanceAudit(store) {
  const listing = await store.list({ prefix: AUDIT_EVENT_PREFIX });
  const blobs = (listing && Array.isArray(listing.blobs)) ? listing.blobs : [];
  const rows = await Promise.all(blobs.map(async (entry) => {
    try { return await store.get(entry.key, { type: "json" }); } catch (e) { return null; }
  }));
  const verified = rows.filter(x => x && x.id);
  const legacyRaw = (await store.get("audit", { type: "json" })) || [];
  const legacy = Array.isArray(legacyRaw) ? legacyRaw.slice(0, MAX_AUDIT_ROWS).map((r,i) => ({
    id: `legacy_${i}_${String(r.serverTs || r.ts || "").replace(/[^0-9A-Za-z]/g,"").slice(0,24)}`,
    serverTs: r.serverTs || r.ts || "", user: r.user || "", name: r.name || r.user || "", role: "",
    category: "Histórico anterior", action: r.action || "Registo", resource: "audit-legacy", key: "",
    hotel: r.hotel || "", detail: r.detail || "", severity: "info", verified: false, source: "legacy", changes: [], meta: {}
  })) : [];
  return verified.concat(legacy).sort((a,b) => String(b.serverTs || "").localeCompare(String(a.serverTs || ""))).slice(0, AUDIT_EVENT_LIMIT);
}
function auditedGeneric(resource) { return ["settings","targets-rules","hotelsheet","notas","index","ops-housekeeping","ops-ab","ops-reputation-semester"].includes(resource); }
function genericAuditDescriptor(resource, key) {
  if (resource === "settings") return { category:"Configuração", action:key === "regions" ? "Regiões atualizadas" : "Configuração atualizada", severity:"warning" };
  if (resource === "targets-rules") return { category:"Metas & Regras", action:"Metas e regras atualizadas", severity:"warning" };
  if (resource === "hotelsheet") return { category:"Comentários Fecho do Mês", action:"Comentários Fecho do Mês atualizada", severity:"info", hotel:key };
  if (resource === "notas") return { category:"Dados", action:"Notas partilhadas atualizadas", severity:"info" };
  if (resource === "index") return { category:"Dados", action:"Publicação partilhada concluída", severity:"info" };
  if (resource === "ops-housekeeping") return { category:"Housekeeping", action:"Inventário têxtil atualizado", severity:"info" };
  if (resource === "ops-ab") return { category:"Compras & A&B", action:"Análise A&B atualizada", severity:"info" };
  if (resource === "ops-reputation-semester") return { category:"Reputação", action:"Análise semestral atualizada", severity:"info" };
  return { category:"Sistema", action:"Dados atualizados", severity:"info" };
}

// Contas base. Só existem hashes/salts no código; a password inicial não existe em texto simples no frontend nem aqui.
const SEED_USERS = {"mpatricio":{"user":"mpatricio","name":"Manuel Patricio","role":"diretor","hotel":"COLLECTION SINTRA","active":true,"passwordSalt":"rue71A9TbKfAVJM8yklg2g==","passwordHash":"cfK90l2uusBrPqUUsr7rag5Ct8PWU36MuRs1Wtz53hN62E9vd3aPy7ZU0Fy0bZgp6vU5x4VMVv1P4rf0Dac/iA==","mustChangePassword":true},"bpinto":{"user":"bpinto","name":"Belmiro Pinto","role":"direcao","hotel":"*","active":true,"passwordSalt":"cbrVaKSQ6fHyjp+af+41gw==","passwordHash":"5JBQE0l1n91eIFda9KdAFHoLpuQW9sEZpKZtw13EDA73N5LqW6DAk+nTHnDLklegGUR34/XAiMk/68QdycR6Bw==","mustChangePassword":true},"pmonforte":{"user":"pmonforte","name":"Pedro Monforte","role":"direcao","hotel":"*","active":true,"passwordSalt":"bYTuPcibtI6achrn1HNOKw==","passwordHash":"2L9b1kXSCy8t6nTPNL78gR4zQYSYShokui18QpyOBkshcXZ6QI4LGjDVNp4yysPOfEZDbIlK7oXRFLKp6O7mcw==","mustChangePassword":true},"calves":{"user":"calves","name":"Carlos Alves","role":"direcao","hotel":"*","active":true,"passwordSalt":"tD4e4KAZXOjnLEGbN9+oWw==","passwordHash":"QNyXBnJS8n5UvpjCTWjR1WB8Uq4hMl+UEiaoWEfisjp9PDkbi2hX1WRQtr+LJ3ToM2PwOhsDVJiZh89NnMPFKA==","mustChangePassword":true},"vparente":{"user":"vparente","name":"Vasco Parente","role":"direcao","hotel":"*","active":true,"passwordSalt":"02yKWqaBpX3rJ+WAkNlJgg==","passwordHash":"NLvQSoC2TYeYPwQwnLq945wdfCpAild1+1h//hCEYB8OaHfrjlkdVnDYeDNOZRHpg89XlyhtnAhKlkWvxULsVg==","mustChangePassword":true},"rribeiro":{"user":"rribeiro","name":"Rosario Ribeiro","role":"direcao","hotel":"*","active":true,"passwordSalt":"EA0GRwkqlC6kI7fgfvRcyA==","passwordHash":"+5ur6lIKmHgrDibqiaThT1qdklqKG1Qdd4PlUY4W7ga8sKamdov2ZvaTGjuGeDJVZYgVpeCql/K+u5cg2MswJg==","mustChangePassword":true},"nribeiro":{"user":"nribeiro","name":"Nelson Ribeiro","role":"direcao","hotel":"*","active":true,"passwordSalt":"lJHFEKP4Cw7B+SspJktF6g==","passwordHash":"9uyyzlkBh/LNcMNN3j90qqLNvcKv1esiNBAxrSeyPTb6PS+dP+GbZLZTVf2lyNOM+HGvmPhzFYec3ZvUIdjzgA==","mustChangePassword":true},"jmeireles":{"user":"jmeireles","name":"João Meireles","role":"direcao","hotel":"*","active":true,"passwordSalt":"BkCEpw0Y/3YZxwEqHAlTDQ==","passwordHash":"K+IaKRluihV5bx2Q6tB3XVHEypg9LfJNu+Bng4LTaLSWZF2/g7HeRT5JvsysCW+f0qFFT0udc+MA77Cff5iRww==","mustChangePassword":true},"sribeiro":{"user":"sribeiro","name":"Sofia Ribeiro","role":"diretor","hotel":"AMPALIUS","active":true,"passwordSalt":"HB/uGXMhuG5p70AXawMhkA==","passwordHash":"faXXpGuBmuHbD6o5ZtujCQ42m4OBkFraMxoD2Tw7D0NPdHoh1+bqR6xaOqKmuiZb00G2hxhz+CGxWaApvRQxKQ==","mustChangePassword":true},"arodrigues":{"user":"arodrigues","name":"Alexandre Rodrigues","role":"diretor","hotel":"MARINA","active":true,"passwordSalt":"w9s4/7WjwhFTwJFdH8CrDw==","passwordHash":"vD4bqAYG7B+hWIE5c5G5uJIgS8GhFlVtYq8FrVEI6rj+zHKqITsS2ssjfjyWCgkRdEXmxVCnz+w4rWKgPQV0iw==","mustChangePassword":true},"efigueiredo":{"user":"efigueiredo","name":"Élia Figueiredo","role":"diretor","hotel":"TAVIRA","active":true,"passwordSalt":"kLSICjfCMgxedvnC7NdT3A==","passwordHash":"VBCxcsxO7All8PbKq5gukoKZrbUZT8SLhmFIEFl4eIqjQzWI73Q+dEOTXKkSnm2xPxbu0k88v2G8X2nF9pOxbA==","mustChangePassword":true},"lmarreiros":{"user":"lmarreiros","name":"Luis Marreiros","role":"diretor","hotel":"ALBACORA","active":true,"passwordSalt":"FBdYS0vX+DxDOam+YUnTiQ==","passwordHash":"+d4tiYr2U80AfV5GgGkqunnsm1uBYu4He/vA8pUJvgatNLX3DisZQF0v8b23sMPfdhqsPkrlq37FgfmjRJn2Yw==","mustChangePassword":true},"jpferreira":{"user":"jpferreira","name":"José Pedro Ferreira","role":"diretor","hotel":"CERRO ALAGOA","active":true,"passwordSalt":"+0oKp58xnTf9s7NbXt/OHQ==","passwordHash":"3piKlzJNPHAwnzMWcKtX+/0Tg3erDHo8l9VM8dGapfoBPKM8eEbZYiI0hY716mAJSI6WFtd838sNeWLzcA7x0g==","mustChangePassword":true},"vcosta":{"user":"vcosta","name":"Valter Costa","role":"diretor","hotel":"ATLANTICO","active":true,"passwordSalt":"7wQM+jycNbiGPtgJOGXKyw==","passwordHash":"OuyIxJWs56ZYuLh+pPRsqWdswUfkRLlnhJrX7NcFwkMsj7/SzrZIt7bzSLWqwrhdCn0vleCZXQjuj/RAdbO8Fg==","mustChangePassword":true},"lsantos_praia":{"user":"lsantos_praia","name":"Luísa Santos","role":"diretor","hotel":"COLLECTION PRAIA","active":true,"passwordSalt":"u06vrfzYG54qly+h/pd6Mg==","passwordHash":"rksMD+Zi2kZjnmBecGrs3ItbLG9ulFDmX9b98NLNAJhnW34nccC4c+iEtGt8DkzX02fBvOQAkGbO2okUuwlpOQ==","mustChangePassword":true},"bsa":{"user":"bsa","name":"Bruno Sá","role":"diretor","hotel":"NAUTICO","active":true,"passwordSalt":"gnb0o5hXJd9ZW1mvgeHBww==","passwordHash":"SGzSCkcrDKIh0KoO8O1whMrW2Im8wFs8i9/lZiSWF5bexT1zxcVdexZ4ZgtMJ0pm3+jX60YyaFgP+4EJoTJxfA==","mustChangePassword":true},"eteixeira":{"user":"eteixeira","name":"Eugénia Teixeira","role":"diretor","hotel":"PORTO","active":true,"passwordSalt":"EP8KDZMP+8zO6Jk5sgPYNg==","passwordHash":"fpgtJnLDLHY3g/yGdvG89at4kqbWJX22VOAxHeP0K9KzUklgZvh+61HO6g3g4PjXQDqwkq4EHQw5qobUQxl4Nw==","mustChangePassword":true},"mferreira":{"user":"mferreira","name":"Marco Ferreira","role":"diretor","hotel":"ERICEIRA","active":true,"passwordSalt":"FpVhSZ0E56OnCMJ3uBY+Xw==","passwordHash":"H0ed548tsTSs4gMd7Rj+QIkuQuorZnmuqqIybgJWskUJBS5FskghnFArAm/8Sn1ZKbj/ROxH0jXogF21dQOkVA==","mustChangePassword":true},"rcerqueira":{"user":"rcerqueira","name":"Rute Cerqueira","role":"diretor","hotel":"CASCAIS","active":true,"passwordSalt":"YSo1bdXYa9pWW4E68CKx2Q==","passwordHash":"KQeQe/GYn9ysEwQt0oNnLrL4gA5vQAAjW3vHXv/D8Zdd1sKC5o/TIHliWcQzkU/Jmlcp5WBeu59V3IpfmCxCJw==","mustChangePassword":true},"jdamiao":{"user":"jdamiao","name":"João Damião","role":"diretor","hotel":"ESTORIL","active":true,"passwordSalt":"OAeZv8olJ+eG0YOF6Cqw7A==","passwordHash":"WFc9CYWNtpI0ZLiw3LpkKwXZllsiSRBINLJ3wLvgeY5IMEFbdJV+grE9SJkcCl0L/P+KzfUKVItgXv6ExCgeeA==","mustChangePassword":true},"rsa":{"user":"rsa","name":"Ricardo Sá","role":"diretor","hotel":"OPERA","active":true,"passwordSalt":"U3I+XsdT1bikrC4t2XN0Uw==","passwordHash":"1txhYA6AZpaSVF8MFwZaqTCGgtV3IYuiLfpeWclnU8roLbEgFRht6x13vun+OoqMTE2gZ4bzlub4iLP+obQ8RQ==","mustChangePassword":true},"nclemente_av":{"user":"nclemente_av","name":"Nuno Clemente","role":"diretor","hotel":"ALENTEJO VINEYARDS","active":true,"passwordSalt":"QBnTa7OWKKmBz76SijqqgQ==","passwordHash":"mSqJsFZ3AqUVdII/UH8MrjHXlg/uKS8R9QTutVeqmvQO3J9ieojtRy+9rna4wOcwApDyPrlOIGYHK3V1pcUVUQ==","mustChangePassword":true},"csousa":{"user":"csousa","name":"Carla de Sousa","role":"diretor","hotel":"SANTA CRUZ","active":true,"passwordSalt":"tTYBJpaIGvRj8LNoZuGOvw==","passwordHash":"kk1v8XafRu+4wo0agqzpE1Fpd4JjCuOYT1ZGTUSgHeKwq8uVszSEs3SzK1ykBkmp2aBzTQNre301rOJRMMAwVw==","mustChangePassword":true},"emontenegro":{"user":"emontenegro","name":"Eduardo Montenegro","role":"diretor","hotel":"LAGOS","active":true,"passwordSalt":"p5pRURIDHjaQ9WpT7TTU3A==","passwordHash":"BYJ9GNzGvilIoama4TiHA9AF/0J97SVoqlSNOVCDK7yXMo1vSAdRZLi7UWdoBEAQK07dpuSz+pStX/6mZ4UVYg==","mustChangePassword":true},"tpires":{"user":"tpires","name":"Tomás Pires","role":"diretor","hotel":"EVORA","active":true,"passwordSalt":"jiByVYOYEnOCbO8YL+OQYA==","passwordHash":"RT3TQEYpzV7+7f84f3tBCAd6GGIDLHbddAIMM5kES5BApxW42c/WF9s24vh+7WtyLTxPwbx3LGC1cgEM70Ek4A==","mustChangePassword":true},"spalhota":{"user":"spalhota","name":"Sara Palhota","role":"diretor","hotel":"COIMBRA","active":true,"passwordSalt":"n+5AhPtFO6KCanyd4IM7SA==","passwordHash":"4n/2IRkgdhYxABf1g2e7v01Z0CdqEi1aMfPZLnlBbKaTPWY+Dhg20BsFY3mN5U4Umh8YR7Dg5154Whn+Zf74Ew==","mustChangePassword":true},"pvalle":{"user":"pvalle","name":"Pedro Valle","role":"diretor","hotel":"COLLECTION SINTRA","active":true,"passwordSalt":"Oq1EBS0UEGcrD3MDce04Bg==","passwordHash":"frsjgPRP1v3yIOeZM2cCjmd1hNoYXFL2S52EpEDNZ8qBQu8Xg8UGh3VTVLdapnv1LImaOWJt/B8BiiqyUF4w6Q==","mustChangePassword":true},"acastro":{"user":"acastro","name":"Alexandre Castro","role":"diretor","hotel":"COLLECTION PALACIO DOS ARCOS","active":true,"passwordSalt":"DKhsmwU1GNtjvy/1bA9nGw==","passwordHash":"Qah8XN3atGfEGaN4G8RnVd4jR465cWx3pOpuq1I4bHTrQKBUmFlNdUGA0tz6jNlnQw6dp5KlQrBpVOIJvF7wzw==","mustChangePassword":true},"pmatos_douro":{"user":"pmatos_douro","name":"Paulo Matos","role":"diretor","hotel":"COLLECTION DOURO","active":true,"passwordSalt":"U6uWuErpdG5gNCkY4GYOsg==","passwordHash":"DBORPPfg1gZQZADug8F433fzUtzcVQrCo5T40xSNORzJrx8efrvY+5BYMIGEoOasoaaEHuLgKAqHBWexpnL25Q==","mustChangePassword":true},"jmartins":{"user":"jmartins","name":"José Martins","role":"diretor","hotel":"COLLECTION BRAGA","active":true,"passwordSalt":"GTRwS2ywgRwTAIjJtJnCWA==","passwordHash":"ivVCFrsqN/Mb5tdabPgpAkoDSuyzqA8FiuCrfPCHCb496v/jEjVORILA36bLLwB5PpHTlJV0wse/hGL2thWPLQ==","mustChangePassword":true},"slourenco":{"user":"slourenco","name":"Sandra Lourenço","role":"diretor","hotel":"COLLECTION SERRA DA ESTRELA","active":true,"passwordSalt":"JeTJXWOu/EGsFhdH+uCyGQ==","passwordHash":"ydoIgwwEDyf4WAcRykCAgUfKCMv6Y47BVgbixcgv/Ji568exMlGBHkEewTgTOWxUfTA/2FiFei6gwgtq3RJBLA==","mustChangePassword":true},"apereirinha":{"user":"apereirinha","name":"André Pereirinha","role":"diretor","hotel":"PORTO RIBEIRA","active":true,"passwordSalt":"SxwvXDq07ZUp8dbWFayARQ==","passwordHash":"cWJjTb1qMJ+Q/JgcpMnUOfI+N1olUesfKOK/IYyVkYcQFbdcgFoQrCqH5ZAbqP7U7tLdjEk0a/EqAP+RbP04SA==","mustChangePassword":true},"npinto_elvas":{"user":"npinto_elvas","name":"Nelson Pinto","role":"diretor","hotel":"COLLECTION ELVAS","active":true,"passwordSalt":"G2ZJpIGo2Tizh48ELe5euw==","passwordHash":"BxDPBYWdBjZwIspB8fK+rfBc0fKYZjpsLVAoKHefkakQGPySigceLO+41HGu6hg27aDdBtLelLrWwjTzxJNvaA==","mustChangePassword":true},"pmatos_dv":{"user":"pmatos_dv","name":"Paulo Matos","role":"diretor","hotel":"DOURO VINEYARDS","active":true,"passwordSalt":"N1tKB+BTqVV+zY7sBtRNCA==","passwordHash":"x0VRTFC61MjTQ6byGft7UVjZTk5EpBSec9A1IUOrDKUZTd0d+7qXAx7c6929wjlp9Xj61ZNpJ8TbD7EHZ2iGkQ==","mustChangePassword":true},"rparada":{"user":"rparada","name":"Rui Parada","role":"diretor","hotel":"COLLECTION ALTER REAL","active":true,"passwordSalt":"qmPkNGBZjLd5ltngNfgI1w==","passwordHash":"lv4T0+WZzNy9NdAR9q+4JmhcxRTZQSU3rtv5lYUBn00CXqlneKcEd5p9frUO5ou28Y8D/2YZ/ojEWiKHTU6tHg==","mustChangePassword":true},"rmartins":{"user":"rmartins","name":"Rita Martins","role":"diretor","hotel":"COLLECTION TOMAR","active":true,"passwordSalt":"NsGM/hn2EoqiUXJIg8Pl8Q==","passwordHash":"+6NLH2UtJlHEL/0COzA09YwwYzbTuzvIcWE2YLLEVEuDeUsAn76Ky33Ek/Cx560JERmpp44b0PcH+PH1ENqDZg==","mustChangePassword":true},"npinto_casas":{"user":"npinto_casas","name":"Nelson Pinto","role":"diretor","hotel":"CASAS DE ELVAS","active":true,"passwordSalt":"UqLmZU0TzjaxGPloWbivFQ==","passwordHash":"Vzkzn2k/Lhe58E9bdolWVD38XXgEevPZOoJOEICrJ6rr6RAcQ+jZk+hkgAIT4mniIi0VYCVjidrg6HkszuVGxg==","mustChangePassword":true},"gnunes":{"user":"gnunes","name":"Gonçalo Nunes","role":"diretor","hotel":"COLLECTION S. MIGUEL","active":true,"passwordSalt":"tpV6KMXFTjv9N2gd/SCf6A==","passwordHash":"v3ScnHtW56E6vQyw9Br/PJGiwTiFqm+DXRV0IttSJZZsS1pdwnzH9rakX/cazlqSZbP27/y1GITE5bwRuoybmA==","mustChangePassword":true},"rteixeira_lima":{"user":"rteixeira_lima","name":"Ricardo Teixeira","role":"diretor","hotel":"COLLECTION PONTE DE LIMA VINEYARDS","active":true,"passwordSalt":"QX9x/En1Y1nwzvvnx7C1yQ==","passwordHash":"/dof+5d5hPV3REh7ARexaKo9JCd/sEZrfab0jYWSbNw8siJzvNlwNrx+a3aicty6+dqNTXdg7kF5aMm5W34WcQ==","mustChangePassword":true},"nclemente_nep":{"user":"nclemente_nep","name":"Nuno Clemente","role":"diretor","hotel":"NEP KIDS","active":true,"passwordSalt":"CBxi2Ptlciw2HjxKjBAmcg==","passwordHash":"O/gRmosI92blXT2xg8rw616B1aSldt5mStf974JAnBVM7as6NV1msGuQvsNR1pswipdkbFCdG+yTLn9NNrFiaQ==","mustChangePassword":true},"nclemente_mv":{"user":"nclemente_mv","name":"Nuno Clemente","role":"diretor","hotel":"COLLECTION MONTE DO VILAR","active":true,"passwordSalt":"4Zep1hEPd2mfCWv6r8MT5g==","passwordHash":"0/cRqnjxS2UVx4ch0WBGf3CZQGRUNlGrus0WAotY6j9AxUZ77U6CRakoCjdIdSMhEwMy1p5+kuOfHOtBB81G5A==","mustChangePassword":true},"noliveira":{"user":"noliveira","name":"Natalia Oliveira","role":"diretor","hotel":"ISLA CANELA","active":true,"passwordSalt":"5LQxksiNDg8kDHCqdQFGkg==","passwordHash":"zmD47SVt+8BPPJVna04YYh8ohBNyg8NhV+wnElAXYaIcTikyX3bN9CXI5K9RUMa8rh/uWF7p/KN/XkL0vBM45w==","mustChangePassword":true},"lsantos_foz":{"user":"lsantos_foz","name":"Leonor Santos","role":"diretor","hotel":"COLLECTION FIGUEIRA DA FOZ","active":true,"passwordSalt":"G0O7m+NqUtiXZJrvYO/n7A==","passwordHash":"gZLFSjX0qNvprt3L+F3n6tcsvWr78151leX/5fCezSXkXpzMP6kjP1Igp5FJYhwhVAe+8dcEYLFySjk3DDNVOQ==","mustChangePassword":true}};

let USERS_CACHE = null;
let USERS_CACHE_AT = 0;
let AUTH_SECRET_CACHE = null;

function hashPassword(password, saltB64) {
  const salt = Buffer.from(saltB64, "base64");
  return crypto.scryptSync(String(password), salt, 64).toString("base64");
}
function newPasswordFields(password) {
  const salt = crypto.randomBytes(16).toString("base64");
  return { passwordSalt: salt, passwordHash: hashPassword(password, salt) };
}
function verifyPassword(password, rec) {
  if (!rec || !rec.passwordSalt || !rec.passwordHash) return false;
  try {
    const actual = Buffer.from(hashPassword(password, rec.passwordSalt), "base64");
    const expected = Buffer.from(rec.passwordHash, "base64");
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch (e) { return false; }
}
function passwordPolicy(password) {
  const p = String(password || "");
  if (p.length < 8) return "A nova palavra-passe deve ter pelo menos 8 caracteres.";
  if (!/[A-Za-zÀ-ÿ]/.test(p) || !/\d/.test(p)) return "A nova palavra-passe deve incluir pelo menos uma letra e um número.";
  return "";
}
function sanitizeUser(rec) {
  if (!rec) return null;
  return {
    user: rec.user,
    name: rec.name,
    role: normalizeRole(rec.role),
    hotel: isDirection(rec)?"*":(userHotels(rec)[0]||""),
    hotels: userHotels(rec),
    modules: userModules(rec),
    active: rec.active !== false,
    mustChangePassword: rec.mustChangePassword === true
  };
}
function sanitizeUsers(users) {
  const out = {};
  Object.keys(users || {}).forEach(k => { out[k] = sanitizeUser(users[k]); });
  return out;
}

async function loadUsers(store, force = false) {
  const now = Date.now();
  if (!force && USERS_CACHE && (now - USERS_CACHE_AT) < USER_CACHE_MS) return USERS_CACHE;

  let stored = (await store.get("users", { type: "json" })) || {};
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) stored = {};

  // As contas base garantem recuperação mesmo num Blob antigo vazio/parcial.
  const merged = {};
  Object.keys(SEED_USERS).forEach(k => { merged[k] = Object.assign({}, SEED_USERS[k]); });
  Object.keys(stored).forEach(k => { merged[k] = Object.assign({}, merged[k] || {}, stored[k] || {}); });

  let changed = false;
  for (const [key, raw] of Object.entries(merged)) {
    const rec = raw || {};
    rec.user = safeUserName(rec.user || key);
    rec.name = String(rec.name || rec.user);
    const prevRole=rec.role,prevHotel=rec.hotel,prevHotels=JSON.stringify(rec.hotels||null),prevModules=JSON.stringify(rec.modules||null);
    rec.role = normalizeRole(rec.role);
    if(isDirection(rec)){rec.hotel="*";rec.hotels=["*"];rec.modules=["*"]; }
    else {
      const hs=userHotels(rec); rec.hotels=hs.length?hs:(rec.hotel&&rec.hotel!=="*"?[String(rec.hotel)]:[]); rec.hotel=rec.hotels[0]||"";
      rec.modules=userModules(rec);
    }
    if(prevRole!==rec.role||prevHotel!==rec.hotel||prevHotels!==JSON.stringify(rec.hotels)||prevModules!==JSON.stringify(rec.modules))changed=true;
    rec.active = rec.active !== false;
    rec.authVersion = Number.isInteger(rec.authVersion) && rec.authVersion > 0 ? rec.authVersion : 1;

    // Migração automática do formato antigo {pass:"..."} para scrypt.
    if (Object.prototype.hasOwnProperty.call(rec, "pass")) {
      const legacyPass = String(rec.pass || "");
      if (legacyPass) Object.assign(rec, newPasswordFields(legacyPass));
      // Password inicial histórica: obriga troca no próximo login.
      rec.mustChangePassword = legacyPass === String.fromCharCode(49,50,51,52,53,54) ? true : rec.mustChangePassword === true;
      delete rec.pass;
      changed = true;
    }
    if (!rec.passwordSalt || !rec.passwordHash) {
      const seed = SEED_USERS[key];
      if (seed && seed.passwordSalt && seed.passwordHash) {
        rec.passwordSalt = seed.passwordSalt;
        rec.passwordHash = seed.passwordHash;
        rec.mustChangePassword = true;
      } else {
        rec.active = false; // conta sem credencial válida: nunca fica utilizável por acidente
      }
      changed = true;
    }
    if (rec.mustChangePassword !== true) rec.mustChangePassword = false;
    merged[key] = rec;
  }

  // Conta principal nunca pode ficar sem acesso por alteração acidental.
  if (merged.pmonforte) {
    if (merged.pmonforte.active === false || merged.pmonforte.role !== "direcao" || merged.pmonforte.hotel !== "*") changed = true;
    merged.pmonforte.active = true;
    merged.pmonforte.role = "direcao";
    merged.pmonforte.hotel = "*"; merged.pmonforte.hotels=["*"]; merged.pmonforte.modules=["*"];
  }

  if (changed || Object.keys(stored).length !== Object.keys(merged).length) {
    await store.setJSON("users", merged);
  }
  USERS_CACHE = merged;
  USERS_CACHE_AT = now;
  return merged;
}
async function saveUsers(store, users) {
  await store.setJSON("users", users);
  USERS_CACHE = users;
  USERS_CACHE_AT = Date.now();
}

function b64url(input) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function fromB64url(input) {
  let s = String(input).replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
}
async function authSecret(store) {
  if (AUTH_SECRET_CACHE) return AUTH_SECRET_CACHE;
  let rec = await store.get("_auth-secret-v1", { type: "json" });
  if (!rec || !rec.value) {
    rec = { value: crypto.randomBytes(48).toString("base64"), createdAt: new Date().toISOString() };
    await store.setJSON("_auth-secret-v1", rec);
    // Releitura reduz o risco de duas inicializações concorrentes gerarem segredos diferentes.
    rec = (await store.get("_auth-secret-v1", { type: "json" })) || rec;
  }
  AUTH_SECRET_CACHE = Buffer.from(rec.value, "base64");
  return AUTH_SECRET_CACHE;
}
async function issueToken(store, rec) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: rec.user, av: rec.authVersion || 1, iat: now, exp: now + SESSION_TTL_SECONDS };
  const body = b64url(JSON.stringify(payload));
  const secret = await authSecret(store);
  const sig = crypto.createHmac("sha256", secret).update(body).digest();
  return body + "." + b64url(sig);
}
async function verifyToken(store, token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length !== 2) return null;
    const secret = await authSecret(store);
    const expected = crypto.createHmac("sha256", secret).update(parts[0]).digest();
    const actual = fromB64url(parts[1]);
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
    const payload = JSON.parse(fromB64url(parts[0]).toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (!payload.sub || !payload.exp || payload.exp <= now) return null;
    return payload;
  } catch (e) { return null; }
}
function bearer(event) {
  const h = (event.headers && (event.headers.authorization || event.headers.Authorization)) || "";
  const m = String(h).match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}
async function authenticatedUser(store, event) {
  const payload = await verifyToken(store, bearer(event));
  if (!payload) return null;
  const users = await loadUsers(store);
  const rec = users[payload.sub];
  if (!rec || rec.active === false || Number(rec.authVersion || 1) !== Number(payload.av || 1)) return null;
  return rec;
}

function clientIp(event) {
  const h = event.headers || {};
  return String(h["x-nf-client-connection-ip"] || h["x-forwarded-for"] || h["client-ip"] || "unknown").split(",")[0].trim();
}
function loginRateKey(user, event) {
  const raw = safeUserName(user) + "|" + clientIp(event);
  return "_login-rate-" + crypto.createHash("sha256").update(raw).digest("hex").slice(0, 32);
}
async function checkLoginRate(store, user, event) {
  const key = loginRateKey(user, event);
  const now = Date.now();
  let rec = (await store.get(key, { type: "json" })) || { count: 0, start: now };
  if (!rec.start || now - rec.start > LOGIN_WINDOW_MS) rec = { count: 0, start: now };
  return { key, rec, blocked: Number(rec.count || 0) >= LOGIN_MAX_FAILURES };
}
async function noteLoginFailure(store, rate) {
  const rec = rate.rec || { count: 0, start: Date.now() };
  rec.count = Number(rec.count || 0) + 1;
  await store.setJSON(rate.key, rec);
}
async function clearLoginFailures(store, rate) {
  await store.setJSON(rate.key, { count: 0, start: Date.now() });
}

function canWriteResource(user, resource, key) {
  if (isDirection(user)) return true;
  if (resource === "vg_presence" || resource === "audit") return true;
  if (resource === "hotelsheet") return userCanHotel(user,key);
  return false;
}

exports.handler = async (event) => {
  connectLambda(event);
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: HEADERS, body: "" };

  const store = getStore(STORE_NAME);
  const params = event.queryStringParameters || {};
  const resource = params.resource || "";
  const key = params.key || "";
  const market = marketId(params.market || "iberia");
  if (!resource) return badRequest("Falta o parâmetro resource.");

  try {
    // -------------------- LOGIN (único endpoint público) --------------------
    if (event.httpMethod === "POST" && resource === "auth-login") {
      const payload = parseBody(event);
      if (!payload) return badRequest("JSON inválido.");
      const username = safeUserName(payload.user);
      const password = String(payload.password || "");
      if (!username || !password) return unauthorized("Utilizador ou palavra-passe inválidos.");

      const rate = await checkLoginRate(store, username, event);
      if (rate.blocked) return tooMany("Demasiadas tentativas. Aguarde alguns minutos e tente novamente.");

      const users = await loadUsers(store, true); // também executa a migração de passwords antigas
      const rec = users[username];
      if (!rec || rec.active === false || !verifyPassword(password, rec)) {
        await noteLoginFailure(store, rate);
        return unauthorized("Utilizador ou palavra-passe inválidos.");
      }
      await clearLoginFailures(store, rate);
      const token = await issueToken(store, rec);
      await safeGovernanceAudit(store, rec, { category:"Sessão", action:"Login", resource:"auth", detail:"Entrada autenticada no dashboard.", severity:"info" });
      return ok({ token, user: sanitizeUser(rec), expiresIn: SESSION_TTL_SECONDS });
    }

    // Daqui para baixo tudo exige sessão válida.
    const authUser = await authenticatedUser(store, event);
    if (!authUser) return unauthorized();
    // V35.6: a permissão do menu continua validada no servidor para recursos operacionais.
    const requiredModule=resourceModule(resource);
    if(requiredModule&&!userCanModule(authUser,requiredModule))return forbidden("O seu perfil não tem acesso a este módulo.");
    // Blobs internos nunca são endereçáveis pela API genérica, mesmo por utilizadores autenticados.
    if (resource.startsWith("_")) return forbidden();
    // V31: utilizadores de hotel não podem mudar o parâmetro market para consultar outro universo.
    if (!isDirection(authUser) && !isGlobalResource(resource) && market !== userMarketServer(authUser)) return forbidden("O seu perfil não tem acesso a esta geografia.");

    // -------------------- AUDITORIA & GOVERNAÇÃO (v16) --------------------
    if (resource === "audit-events" && event.httpMethod === "GET") {
      if (!isDirection(authUser)) return forbidden("A Auditoria & Governação está reservada à Direção.");
      const rows = await listGovernanceAudit(store);
      return ok({ data: rows, total: rows.length, updatedAt: new Date().toISOString() });
    }
    if (resource === "audit-events") return response(405, { error: "Método não permitido." });

    // -------------------- BACKUP & RECUPERAÇÃO (v17) --------------------
    if (resource === "recovery-list" && event.httpMethod === "GET") {
      if (!isDirection(authUser)) return forbidden("Backup & Recuperação está reservado à Direção.");
      const rows = await listRecoverySnapshots(store);
      return ok({ data: rows.map(x=>({ id:x.id,kind:x.kind,createdAt:x.createdAt,user:x.user,name:x.name,note:x.note,items:x.items,sizeBytes:x.sizeBytes,resourceCounts:x.resourceCounts,sourceSnapshotId:x.sourceSnapshotId,appVersion:x.appVersion,buildVersion:x.buildVersion })), total:rows.length, updatedAt:new Date().toISOString() });
    }
    if (resource === "recovery-create" && event.httpMethod === "POST") {
      if (!isDirection(authUser)) return forbidden("Apenas a Direção pode criar snapshots de recuperação.");
      const payload = parseBody(event) || {};
      const manifest = await createRecoverySnapshot(store, authUser, { kind:"manual", note:payload.note });
      await safeGovernanceAudit(store, authUser, { category:"Backup", action:"Snapshot criado", resource:"recovery", key:manifest.id, detail:`${manifest.items} itens · ${manifest.note||"Cópia manual"}`, severity:"info", meta:{items:manifest.items,sizeBytes:manifest.sizeBytes,kind:manifest.kind} });
      return ok({ ok:true, data:{ id:manifest.id,kind:manifest.kind,createdAt:manifest.createdAt,user:manifest.user,name:manifest.name,note:manifest.note,items:manifest.items,sizeBytes:manifest.sizeBytes,resourceCounts:manifest.resourceCounts } });
    }
    if (resource === "recovery-restore" && event.httpMethod === "POST") {
      if (!isDirection(authUser)) return forbidden("Apenas a Direção pode repor uma versão anterior.");
      const payload = parseBody(event) || {};
      const id = cleanText(payload.id,100).replace(/[^a-zA-Z0-9_.-]/g,"");
      if (!id) return badRequest("Snapshot obrigatório.");
      if (String(payload.confirmation||"").trim().toUpperCase() !== "REPOR") return badRequest("Confirmação inválida. Escreva REPOR.");
      const result = await restoreRecoverySnapshot(store, authUser, id);
      await safeGovernanceAudit(store, authUser, { category:"Backup", action:"Versão reposta", resource:"recovery", key:id, detail:`Reposição de ${result.restoredItems} itens. Cópia de segurança automática: ${result.safety.id}.`, severity:"critical", meta:{restoredItems:result.restoredItems,removedItems:result.removedItems,safetySnapshot:result.safety.id} });
      return ok({ ok:true, restoredItems:result.restoredItems, safetySnapshot:{id:result.safety.id,createdAt:result.safety.createdAt} });
    }
    if (resource === "recovery-delete" && event.httpMethod === "POST") {
      if (!isDirection(authUser)) return forbidden("Apenas a Direção pode eliminar snapshots.");
      const payload = parseBody(event) || {};
      const id = cleanText(payload.id,100).replace(/[^a-zA-Z0-9_.-]/g,"");
      if (!id) return badRequest("Snapshot obrigatório.");
      if (String(payload.confirmation||"").trim().toUpperCase() !== "APAGAR") return badRequest("Confirmação inválida. Escreva APAGAR.");
      const deleted = await deleteRecoverySnapshot(store,id);
      if (!deleted) return response(404,{error:"Snapshot não encontrado."});
      await safeGovernanceAudit(store, authUser, { category:"Backup", action:"Snapshot eliminado", resource:"recovery", key:id, detail:"Cópia de recuperação eliminada pela Direção.", severity:"warning" });
      return ok({ok:true});
    }
    if (["recovery-list","recovery-create","recovery-restore","recovery-delete"].includes(resource)) return response(405,{error:"Método não permitido."});

    // -------------------- CENTRO DE DADOS (v10) --------------------
    if (resource === "data-import-history" && event.httpMethod === "GET") {
      const rows = await listDataImports(store, market);
      return ok({ data: rows, total: rows.length, updatedAt: new Date().toISOString() });
    }
    if (resource === "data-import-backup" && event.httpMethod === "GET") {
      if (!isDirection(authUser)) return forbidden("Apenas a Direção pode consultar snapshots para rollback.");
      const id = cleanText(key, 100).replace(/[^a-zA-Z0-9_.-]/g, "");
      if (!id) return badRequest("Identificador do carregamento em falta.");
      const record = await store.get(dataImportBlobKey(id), { type: "json" });
      if (!record || itemMarket(record)!==market) return response(404, { error: "Snapshot anterior não encontrado nesta geografia." });
      const backup = await store.get(dataBackupBlobKey(id), { type: "json" });
      if (!backup) return response(404, { error: "Snapshot anterior não encontrado." });
      return ok({ data: backup });
    }
    if (resource === "data-import-record" && event.httpMethod === "POST") {
      if (bodySizeOf(event) > MAX_BODY_BYTES) return tooLarge("Registo/snapshot do Centro de Dados excede o tamanho permitido.");
      const payload = parseBody(event);
      if (!payload || typeof payload !== "object") return badRequest("Registo de carregamento inválido.");
      const input = payload.record || {};
      const source = cleanText(input.source, 40);
      if (!DATA_ALLOWED_SOURCES.has(source)) return badRequest("Fonte de dados inválida.");
      const status = cleanText(input.status || "success", 20);
      if (!["success","error"].includes(status)) return badRequest("Estado de carregamento inválido.");
      const action = cleanText(input.action || "import", 20);
      if (!["import","rollback"].includes(action)) return badRequest("Ação de histórico inválida.");
      if (action === "rollback" && !isDirection(authUser)) return forbidden("Apenas a Direção pode registar rollbacks globais.");
      const now = new Date().toISOString();
      const id = "imp_" + Date.now().toString(36) + "_" + crypto.randomBytes(5).toString("hex");
      const warnings = Array.isArray(input.warnings) ? input.warnings.map(x => cleanText(x, 500)).filter(Boolean).slice(0, 12) : [];
      let backupAvailable = false;
      let backupReason = cleanText(input.backupReason, 500);
      if (payload.backup && typeof payload.backup === "object" && status !== "error" && isDirection(authUser)) {
        await store.setJSON(dataBackupBlobKey(id), payload.backup);
        backupAvailable = true;
      } else if (payload.backup && !isDirection(authUser) && !backupReason) {
        backupReason = "Rollback disponível apenas para carregamentos efetuados pela Direção.";
      }
      const record = {
        id, source, sourceName: cleanText(input.sourceName, 120), category: cleanText(input.category, 80),
        action, status, fileName: cleanText(input.fileName, 300), fileSize: Number(input.fileSize || 0) || 0,
        scope: cleanText(input.scope, 400), summary: cleanText(input.summary, 600), metrics: cleanDataMetrics(input.metrics),
        warnings, duplicate: !!input.duplicate, backupAvailable, backupReason,
        createdAt: now, user: authUser.user, name: authUser.name, role: authUser.role, hotel: authUser.hotel || "*", market
      };
      await store.setJSON(dataImportBlobKey(id), record);
      await safeGovernanceAudit(store, authUser, {
        category:"Dados", action: action === "rollback" ? "Rollback de dados" : (status === "error" ? "Importação com erro" : "Importação registada"),
        resource:"data-import", key:id, detail:[record.sourceName || source, record.fileName, record.scope, record.summary].filter(Boolean).join(" · "),
        severity: action === "rollback" ? "critical" : (status === "error" || record.duplicate ? "warning" : "info"),
        meta:{ market, source, fileName:record.fileName, scope:record.scope, duplicate:record.duplicate, backupAvailable:record.backupAvailable, status }
      });
      return ok({ ok: true, data: record });
    }
    if (["data-import-history","data-import-backup","data-import-record"].includes(resource)) return response(405, { error: "Método não permitido." });

    // -------------------- GESTÃO DE AÇÕES OPERACIONAIS (v8) --------------------
    if (resource === "assignees" && event.httpMethod === "GET") {
      const users = await loadUsers(store, true);
      const all = Object.values(users).filter(u => u && u.active !== false);
      const visible=isDirection(authUser)?all:all.filter(u=>u.user===authUser.user||userHotels(u).some(h=>userCanHotel(authUser,h)));
      const rows = visible.map(minimalAssignee).sort((a,b) => String(a.name || "").localeCompare(String(b.name || ""), "pt"));
      return ok({ data: rows });
    }
    if (resource === "ops-actions" && event.httpMethod === "GET") {
      const rows = (await listOperationalActions(store, market)).filter(x=>canManageAction(authUser,x));
      return ok({ data: rows, total: rows.length, updatedAt: new Date().toISOString() });
    }
    if (resource === "ops-action-save" && event.httpMethod === "POST") {
      if (bodySizeOf(event) > 256 * 1024) return tooLarge("A ação excede o tamanho permitido.");
      const payload = parseBody(event);
      if (!payload || typeof payload !== "object") return badRequest("Ação inválida.");
      const id = cleanText(payload.id, 80).replace(/[^a-zA-Z0-9_.-]/g, "");
      let existing = id ? await store.get(actionBlobKey(id), { type: "json" }) : null;
      if(existing && itemMarket(existing)!==market) existing=null;
      const hotel = cleanText(payload.hotel || existing?.hotel, 120);
      if (!hotel) return badRequest("Hotel obrigatório.");
      if (existing) {
        if (!canManageAction(authUser, existing)) return forbidden("Não pode alterar esta ação.");
        if(!isDirection(authUser)&&norm(existing.hotel)!==norm(hotel)&&(!userCanHotel(authUser,existing.hotel)||!userCanHotel(authUser,hotel)))return forbidden("Não pode transferir a ação para fora dos hotéis autorizados.");
        if (payload.expectedUpdatedAt && existing.updatedAt && String(payload.expectedUpdatedAt) !== String(existing.updatedAt)) {
          return conflict("Esta ação foi alterada por outro utilizador. Reabra-a para ver a versão mais recente.", { data: existing });
        }
      } else if (!canManageHotel(authUser, hotel)) {
        return forbidden("Só pode criar ações para o hotel associado à sua conta.");
      }

      const users = await loadUsers(store, true);
      const ownerUser = safeUserName(payload.ownerUser !== undefined ? payload.ownerUser : existing?.ownerUser);
      let ownerName = "";
      if (ownerUser) {
        const owner = users[ownerUser];
        if (!owner || owner.active === false) return badRequest("Responsável inválido ou inativo.");
        if (!isDirection(authUser) && ownerUser !== authUser.user && !userCanHotel(owner,hotel)) {
          return forbidden("Um Diretor só pode atribuir a ação a si próprio ou a alguém do mesmo hotel.");
        }
        ownerName = owner.name || ownerUser;
      }
      const dueDate = cleanText(payload.dueDate !== undefined ? payload.dueDate : existing?.dueDate, 10);
      if (!validDateOnly(dueDate)) return badRequest("Prazo inválido.");
      const status = cleanText(payload.status !== undefined ? payload.status : existing?.status || "open", 20) || "open";
      if (!ACTION_STATUSES.has(status)) return badRequest("Estado da ação inválido.");
      const now = nextIsoTimestamp(existing?.updatedAt);
      const action = existing ? Object.assign({}, existing) : {
        id: "act_" + Date.now().toString(36) + "_" + crypto.randomBytes(5).toString("hex"),
        createdAt: now,
        createdBy: { user: authUser.user, name: authUser.name },
        history: []
      };
      action.market = market;
      action.hotel = hotel;
      action.sourceKey = cleanText(payload.sourceKey !== undefined ? payload.sourceKey : action.sourceKey, 600);
      action.sourceTitle = cleanText(payload.sourceTitle !== undefined ? payload.sourceTitle : action.sourceTitle, 400);
      action.sourceType = cleanText(payload.sourceType !== undefined ? payload.sourceType : action.sourceType, 80);
      action.sourceReasons = Array.isArray(payload.sourceReasons) ? payload.sourceReasons.map(x => cleanText(x, 500)).filter(Boolean).slice(0, 10) : (Array.isArray(action.sourceReasons) ? action.sourceReasons : []);
      action.severity = cleanText(payload.severity !== undefined ? payload.severity : action.severity, 20);
      const previous = existing ? { ownerUser: existing.ownerUser || "", ownerName: existing.ownerName || "", dueDate: existing.dueDate || "", status: existing.status || "open" } : null;
      action.ownerUser = ownerUser;
      action.ownerName = ownerName;
      action.dueDate = dueDate;
      action.status = status;
      action.updatedAt = now;
      action.updatedBy = { user: authUser.user, name: authUser.name };
      if (!Array.isArray(action.history)) action.history = [];

      if (!existing) {
        action.history.push(actionHistoryEntry(authUser, "created", "Ação criada."));
      } else {
        const changes = [];
        if (previous.ownerUser !== ownerUser) changes.push(`Responsável: ${previous.ownerName || "sem responsável"} → ${ownerName || "sem responsável"}`);
        if (previous.dueDate !== dueDate) changes.push(`Prazo: ${previous.dueDate || "sem prazo"} → ${dueDate || "sem prazo"}`);
        if (previous.status !== status) changes.push(`Estado: ${previous.status} → ${status}`);
        if (changes.length) action.history.push(actionHistoryEntry(authUser, "updated", changes.join(" · ")));
      }
      const comment = cleanText(payload.comment, 1600);
      if (comment) action.history.push(actionHistoryEntry(authUser, "comment", comment));
      action.history = action.history.slice(-150);
      if (status === "resolved" && previous?.status !== "resolved") {
        action.resolvedAt = now;
        action.resolvedBy = { user: authUser.user, name: authUser.name };
      } else if (status !== "resolved" && existing?.status === "resolved") {
        action.resolvedAt = null;
        action.resolvedBy = null;
      }
      await store.setJSON(actionBlobKey(action.id), action);
      await safeGovernanceAudit(store, authUser, {
        category:"Ações", action: existing ? "Ação operacional atualizada" : "Ação operacional criada", resource:"ops-action", key:action.id, hotel:action.hotel,
        detail:[action.sourceTitle, comment ? "Comentário adicionado" : ""].filter(Boolean).join(" · "), severity: action.status === "resolved" ? "info" : (action.severity === "red" ? "warning" : "info"),
        before: existing ? { ownerUser:existing.ownerUser||"", ownerName:existing.ownerName||"", dueDate:existing.dueDate||"", status:existing.status||"open" } : null,
        after:{ ownerUser:action.ownerUser||"", ownerName:action.ownerName||"", dueDate:action.dueDate||"", status:action.status||"open" },
        meta:{ sourceType:action.sourceType||"", sourceKey:action.sourceKey||"" }
      });
      return ok({ ok: true, data: action });
    }
    if (["assignees","ops-actions","ops-action-save"].includes(resource)) return response(405, { error: "Método não permitido." });
    if (resource.startsWith("ops-action/")) return forbidden("As ações só podem ser acedidas pelos endpoints próprios.");

    // -------------------- AGENDA OPERACIONAL (v22) --------------------
    if (resource === "ops-agenda" && event.httpMethod === "GET") {
      const rows = (await listOperationalAgenda(store, market)).filter(x => canSeeAgendaEvent(authUser, x));
      return ok({ data: rows, total: rows.length, updatedAt: new Date().toISOString() });
    }
    if (resource === "ops-agenda-save" && event.httpMethod === "POST") {
      if (bodySizeOf(event) > 192 * 1024) return tooLarge("O evento excede o tamanho permitido.");
      const payload = parseBody(event);
      if (!payload || typeof payload !== "object") return badRequest("Evento inválido.");
      const id = cleanText(payload.id, 80).replace(/[^a-zA-Z0-9_.-]/g, "");
      let existing = id ? await store.get(agendaBlobKey(id), { type:"json" }) : null;
      if(existing && itemMarket(existing)!==market) existing=null;
      const hotel = cleanText(payload.hotel || existing?.hotel, 120);
      if (!hotel) return badRequest("Hotel obrigatório.");
      if (existing) {
        if (!canManageAgendaEvent(authUser, existing)) return forbidden("Não pode alterar este evento.");
        if (!isDirection(authUser) && norm(existing.hotel)!==norm(hotel) && !userCanHotel(authUser,hotel)) return forbidden("Não pode transferir um evento para fora dos hotéis autorizados.");
        if (payload.expectedUpdatedAt && existing.updatedAt && String(payload.expectedUpdatedAt) !== String(existing.updatedAt)) {
          return conflict("Este evento foi alterado por outro utilizador. Reabra-o para ver a versão mais recente.", { data: existing });
        }
      } else if (!canManageHotel(authUser, hotel)) {
        return forbidden("Só pode criar eventos para o hotel associado à sua conta.");
      }
      const title = cleanText(payload.title !== undefined ? payload.title : existing?.title, 240);
      if (!title) return badRequest("Título obrigatório.");
      const type = cleanText(payload.type !== undefined ? payload.type : existing?.type || "operational", 30) || "operational";
      if (!AGENDA_TYPES.has(type)) return badRequest("Tipo de evento inválido.");
      const date = cleanText(payload.date !== undefined ? payload.date : existing?.date, 10);
      if (!date || !validDateOnly(date)) return badRequest("Data inválida.");
      const startTime = cleanText(payload.startTime !== undefined ? payload.startTime : existing?.startTime, 5);
      const endTime = cleanText(payload.endTime !== undefined ? payload.endTime : existing?.endTime, 5);
      if (!validTimeOnly(startTime) || !validTimeOnly(endTime)) return badRequest("Hora inválida.");
      if (startTime && endTime && endTime < startTime) return badRequest("A hora de fim não pode ser anterior à hora de início.");
      const users = await loadUsers(store, true);
      const ownerUser = safeUserName(payload.ownerUser !== undefined ? payload.ownerUser : existing?.ownerUser);
      let ownerName = "";
      if (ownerUser) {
        const owner = users[ownerUser];
        if (!owner || owner.active === false) return badRequest("Responsável inválido ou inativo.");
        if (!isDirection(authUser) && ownerUser !== authUser.user && !userCanHotel(owner,hotel)) return forbidden("Um Diretor só pode atribuir o evento a si próprio ou a alguém do mesmo hotel.");
        ownerName = owner.name || ownerUser;
      }
      const now = nextIsoTimestamp(existing?.updatedAt);
      const item = existing ? Object.assign({}, existing) : {
        id:"evt_" + Date.now().toString(36) + "_" + crypto.randomBytes(5).toString("hex"),
        createdAt:now, createdBy:{user:authUser.user,name:authUser.name}, history:[]
      };
      const before = existing ? {hotel:existing.hotel||"",title:existing.title||"",type:existing.type||"",date:existing.date||"",startTime:existing.startTime||"",endTime:existing.endTime||"",ownerUser:existing.ownerUser||""} : null;
      item.market=market; item.hotel=hotel; item.title=title; item.type=type; item.date=date; item.startTime=startTime; item.endTime=endTime; item.allDay=!startTime;
      item.notes=cleanText(payload.notes !== undefined ? payload.notes : existing?.notes, 2400);
      item.ownerUser=ownerUser; item.ownerName=ownerName; item.updatedAt=now; item.updatedBy={user:authUser.user,name:authUser.name};
      if (!Array.isArray(item.history)) item.history=[];
      if (!existing) item.history.push(agendaHistoryEntry(authUser,"created","Evento criado."));
      else {
        const changes=[];
        if (before.hotel!==hotel) changes.push(`Hotel: ${before.hotel} → ${hotel}`);
        if (before.title!==title) changes.push(`Título: ${before.title} → ${title}`);
        if (before.type!==type) changes.push(`Tipo: ${before.type} → ${type}`);
        if (before.date!==date || before.startTime!==startTime || before.endTime!==endTime) changes.push(`Data/hora: ${before.date} ${before.startTime||""} → ${date} ${startTime||""}`);
        if (before.ownerUser!==ownerUser) changes.push(`Responsável: ${before.ownerUser||"sem responsável"} → ${ownerUser||"sem responsável"}`);
        if (changes.length) item.history.push(agendaHistoryEntry(authUser,"updated",changes.join(" · ")));
      }
      item.history=item.history.slice(-100);
      await store.setJSON(agendaBlobKey(item.id), item);
      await safeGovernanceAudit(store, authUser, {
        category:"Agenda", action:existing ? "Evento operacional atualizado" : "Evento operacional criado", resource:"ops-agenda", key:item.id, hotel:item.hotel,
        detail:[item.title, item.date, item.startTime].filter(Boolean).join(" · "), severity:"info", before,
        after:{hotel:item.hotel,title:item.title,type:item.type,date:item.date,startTime:item.startTime,endTime:item.endTime,ownerUser:item.ownerUser||""}
      });
      return ok({ok:true,data:item});
    }
    if (resource === "ops-agenda-delete" && event.httpMethod === "POST") {
      const payload=parseBody(event); if(!payload||typeof payload!=="object") return badRequest("Pedido inválido.");
      const id=cleanText(payload.id,80).replace(/[^a-zA-Z0-9_.-]/g,""); if(!id) return badRequest("Evento obrigatório.");
      const existing=await store.get(agendaBlobKey(id),{type:"json"}); if(!existing||itemMarket(existing)!==market) return badRequest("Evento não encontrado.");
      if(!canManageAgendaEvent(authUser,existing)) return forbidden("Não pode eliminar este evento.");
      if(payload.expectedUpdatedAt&&existing.updatedAt&&String(payload.expectedUpdatedAt)!==String(existing.updatedAt)) return conflict("Este evento foi alterado por outro utilizador. Reabra-o antes de eliminar.",{data:existing});
      await store.delete(agendaBlobKey(id));
      await safeGovernanceAudit(store,authUser,{category:"Agenda",action:"Evento operacional eliminado",resource:"ops-agenda",key:id,hotel:existing.hotel,detail:[existing.title,existing.date].filter(Boolean).join(" · "),severity:"warning",before:{hotel:existing.hotel,title:existing.title,type:existing.type,date:existing.date,startTime:existing.startTime||"",ownerUser:existing.ownerUser||""},after:null});
      return ok({ok:true,id});
    }
    if (["ops-agenda","ops-agenda-save","ops-agenda-delete"].includes(resource)) return response(405,{error:"Método não permitido."});
    if (resource.startsWith("ops-agenda/")) return forbidden("A agenda só pode ser acedida pelos endpoints próprios.");

    // -------------------- FICHAS EDITÁVEIS DOS HOTÉIS (V35.3) --------------------
    if (resource === "ops-hotel-profiles" && event.httpMethod === "GET") {
      const listing=await store.list({prefix:HOTEL_PROFILE_PREFIX+market+"/"});
      const blobs=listing&&Array.isArray(listing.blobs)?listing.blobs:[];
      const rows=(await Promise.all(blobs.map(async e=>{try{return await store.get(e.key,{type:"json"});}catch(err){return null;}}))).filter(x=>x&&x.key&&itemMarket(x)===market).filter(x=>isDirection(authUser)||userCanHotel(authUser,x.hotel)||userCanHotel(authUser,x.key));
      return ok({data:rows,total:rows.length,updatedAt:new Date().toISOString()});
    }
    if (resource === "ops-hotel-profile-save" && event.httpMethod === "POST") {
      if(bodySizeOf(event)>MAX_BODY_BYTES)return tooLarge("A ficha do hotel excede o tamanho permitido.");
      const payload=parseBody(event); if(!payload||typeof payload!=="object")return badRequest("Ficha inválida.");
      const profileKey=cleanText(payload.key,180); const hotel=cleanText(payload.hotel,180); if(!profileKey||!hotel)return badRequest("Hotel obrigatório.");
      if(!isDirection(authUser) && !userCanHotel(authUser,hotel) && !userCanHotel(authUser,profileKey))return forbidden("Não pode editar a ficha deste hotel.");
      if(!payload.data||typeof payload.data!=="object"||Array.isArray(payload.data))return badRequest("Dados da ficha inválidos.");
      const bkey=hotelProfileBlobKey(market,profileKey); const existing=await store.get(bkey,{type:"json"});
      if(payload.expectedUpdatedAt&&existing?.updatedAt&&String(payload.expectedUpdatedAt)!==String(existing.updatedAt))return conflict("Esta ficha foi alterada por outro utilizador. Reabra-a para trabalhar sobre a versão mais recente.",{data:existing});
      const now=nextIsoTimestamp(existing?.updatedAt); const item={key:profileKey,hotel,market,data:payload.data,static:(payload.static&&typeof payload.static==="object"&&!Array.isArray(payload.static))?payload.static:{},createdAt:existing?.createdAt||now,createdBy:existing?.createdBy||{user:authUser.user,name:authUser.name},updatedAt:now,updatedBy:{user:authUser.user,name:authUser.name}};
      await store.setJSON(bkey,item);
      await safeGovernanceAudit(store,authUser,{category:"Hotéis",action:existing?"Ficha de hotel atualizada":"Ficha de hotel criada",resource:"ops-hotel-profile",key:profileKey,hotel,detail:hotel,severity:"info",before:existing?{hotel:existing.hotel,updatedAt:existing.updatedAt}:null,after:{hotel,updatedAt:now}});
      return ok({ok:true,data:item});
    }
    if (["ops-hotel-profiles","ops-hotel-profile-save"].includes(resource)) return response(405,{error:"Método não permitido."});

    // -------------------- GESTÃO DE DOCUMENTOS (v26) --------------------
    if (resource === "ops-documents" && event.httpMethod === "GET") {
      const rows = (await listOperationalDocuments(store, market)).filter(x=>canSeeDocument(authUser,x));
      return ok({data:rows,total:rows.length,updatedAt:new Date().toISOString()});
    }
    if (resource === "ops-document-file" && event.httpMethod === "GET") {
      const id=cleanText(key,80).replace(/[^a-zA-Z0-9_.-]/g,""); if(!id)return badRequest("Documento obrigatório.");
      const meta=await store.get(documentMetaBlobKey(id),{type:"json"}); if(!meta||itemMarket(meta)!==market)return response(404,{error:"Documento não encontrado."});
      if(!canSeeDocument(authUser,meta))return forbidden("Sem acesso a este documento.");
      const contentBase64=await store.get(documentDataBlobKey(id),{type:"text",consistency:"strong"}); if(!contentBase64)return response(404,{error:"Conteúdo do documento indisponível."});
      return ok({data:{id:meta.id,fileName:meta.fileName,mime:meta.mime,size:meta.size,contentBase64}});
    }
    if (resource === "ops-document-content" && event.httpMethod === "GET") {
      const id=cleanText(key,80).replace(/[^a-zA-Z0-9_.-]/g,""); if(!id)return badRequest("Documento obrigatório.");
      const meta=await store.get(documentMetaBlobKey(id),{type:"json"}); if(!meta||itemMarket(meta)!==market)return response(404,{error:"Documento não encontrado."});
      if(!canSeeDocument(authUser,meta))return forbidden("Sem acesso a este documento.");
      const contentBase64=await store.get(documentDataBlobKey(id),{type:"text"}); if(!contentBase64)return response(404,{error:"Conteúdo do documento indisponível."});
      let buf; try{buf=Buffer.from(contentBase64,"base64");}catch(e){return response(500,{error:"Conteúdo do documento corrompido."});}
      if(!buf.length)return response(404,{error:"Conteúdo do documento vazio."});
      const safeName=safeDocumentFileName(meta.fileName||"documento").replace(/["\\r\\n]/g,"_");
      const asciiName=safeName.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^\x20-\x7E]/g,"_");
      const disposition=`inline; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`;
      return {statusCode:200,headers:{"Content-Type":documentMimeForName(meta.fileName)||meta.mime||"application/octet-stream","Content-Disposition":disposition,"Cache-Control":"no-store, private","X-Content-Type-Options":"nosniff","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type, Authorization"},body:buf.toString("base64"),isBase64Encoded:true};
    }
    if (resource === "ops-document-save" && event.httpMethod === "POST") {
      if(bodySizeOf(event)>MAX_BODY_BYTES)return tooLarge("O documento excede o limite do endpoint. Máximo recomendado: 3,5 MB.");
      const payload=parseBody(event); if(!payload||typeof payload!=="object")return badRequest("Documento inválido.");
      const id=cleanText(payload.id,80).replace(/[^a-zA-Z0-9_.-]/g,"");
      let existing=id?await store.get(documentMetaBlobKey(id),{type:"json"}):null;
      if(existing && itemMarket(existing)!==market) existing=null;
      const hotel=cleanText(payload.hotel!==undefined?payload.hotel:existing?.hotel,120); if(!hotel)return badRequest("Hotel obrigatório.");
      if(existing){
        if(!canManageDocument(authUser,existing))return forbidden("Não pode alterar este documento.");
        if(!isDirection(authUser)&&(!userCanHotel(authUser,hotel)||!userCanHotel(authUser,existing.hotel)))return forbidden("Não pode transferir documentos para fora dos hotéis autorizados.");
        if(payload.expectedUpdatedAt&&existing.updatedAt&&String(payload.expectedUpdatedAt)!==String(existing.updatedAt))return conflict("Este documento foi alterado por outro utilizador. Reabra-o para ver a versão mais recente.",{data:existing});
      } else if(!canManageHotel(authUser,hotel)) return forbidden("Só pode adicionar documentos ao hotel associado à sua conta.");
      const title=cleanText(payload.title!==undefined?payload.title:existing?.title,240); if(!title)return badRequest("Título obrigatório.");
      const category=cleanText(payload.category!==undefined?payload.category:existing?.category||"other",30)||"other"; if(!DOCUMENT_CATEGORIES.has(category))return badRequest("Categoria inválida.");
      const linkType=cleanText(payload.linkType!==undefined?payload.linkType:existing?.linkType||"hotel",20)||"hotel"; if(!DOCUMENT_LINK_TYPES.has(linkType))return badRequest("Tipo de associação inválido.");
      const linkId=linkType==="hotel"?"":cleanText(payload.linkId!==undefined?payload.linkId:existing?.linkId,80).replace(/[^a-zA-Z0-9_.-]/g,""); if(linkType!=="hotel"&&!linkId)return badRequest("Referência associada obrigatória.");
      let linkLabel=""; try{linkLabel=await documentLinkLabel(store,linkType,linkId,hotel,market);}catch(e){return badRequest(e.message||"Referência associada inválida.");}
      const replacing=typeof payload.contentBase64==="string"&&payload.contentBase64.length>0;
      let fileName=existing?.fileName||"",mime=existing?.mime||"application/octet-stream",size=Number(existing?.size||0)||0,decoded=null;
      if(!existing&&!replacing)return badRequest("Ficheiro obrigatório.");
      if(replacing){
        fileName=safeDocumentFileName(payload.fileName); const ext=documentExt(fileName); if(!fileName||!DOCUMENT_EXTENSIONS.has(ext))return badRequest("Formato de ficheiro não permitido.");
        mime=documentMimeForName(fileName); size=Number(payload.size||0)||0;
        try{decoded=Buffer.from(payload.contentBase64,"base64");}catch(e){return badRequest("Conteúdo do ficheiro inválido.");}
        if(!decoded.length||decoded.length>DOCUMENT_MAX_BYTES||size>DOCUMENT_MAX_BYTES)return tooLarge("O ficheiro excede 3,5 MB.");
        if(size&&Math.abs(decoded.length-size)>4)return badRequest("Tamanho do ficheiro inconsistente."); size=decoded.length;
      }
      const now=nextIsoTimestamp(existing?.updatedAt); const item=existing?Object.assign({},existing):{id:"doc_"+Date.now().toString(36)+"_"+crypto.randomBytes(5).toString("hex"),createdAt:now,createdBy:{user:authUser.user,name:authUser.name},history:[]};
      const before=existing?{hotel:existing.hotel,title:existing.title,category:existing.category,linkType:existing.linkType,linkId:existing.linkId,fileName:existing.fileName,size:existing.size}:null;
      item.market=market;item.hotel=hotel;item.title=title;item.category=category;item.linkType=linkType;item.linkId=linkId;item.linkLabel=linkLabel;item.tags=cleanText(payload.tags!==undefined?payload.tags:existing?.tags,300);item.description=cleanText(payload.description!==undefined?payload.description:existing?.description,1200);item.fileName=fileName;item.mime=mime;item.size=size;item.updatedAt=now;item.updatedBy={user:authUser.user,name:authUser.name};
      if(!Array.isArray(item.history))item.history=[];
      if(!existing)item.history.push(documentHistoryEntry(authUser,"created","Documento criado.")); else { const changes=[]; if(before.title!==title)changes.push("Título alterado");if(before.category!==category)changes.push("Categoria alterada");if(before.linkType!==linkType||before.linkId!==linkId)changes.push("Associação alterada");if(replacing)changes.push("Ficheiro substituído");if(changes.length)item.history.push(documentHistoryEntry(authUser,"updated",changes.join(" · "))); }
      item.history=item.history.slice(-100);
      if(replacing)await store.set(documentDataBlobKey(item.id),payload.contentBase64);
      await store.setJSON(documentMetaBlobKey(item.id),item);
      await safeGovernanceAudit(store,authUser,{category:"Documentos",action:existing?"Documento atualizado":"Documento adicionado",resource:"ops-document",key:item.id,hotel:item.hotel,detail:[item.title,item.fileName,item.linkLabel].filter(Boolean).join(" · "),severity:"info",before,after:{hotel:item.hotel,title:item.title,category:item.category,linkType:item.linkType,linkId:item.linkId,fileName:item.fileName,size:item.size},meta:{mime:item.mime,replacedFile:replacing}});
      return ok({ok:true,data:item});
    }
    if (resource === "ops-document-delete" && event.httpMethod === "POST") {
      const payload=parseBody(event); if(!payload||typeof payload!=="object")return badRequest("Pedido inválido.");
      const id=cleanText(payload.id,80).replace(/[^a-zA-Z0-9_.-]/g,""); if(!id)return badRequest("Documento obrigatório.");
      const existing=await store.get(documentMetaBlobKey(id),{type:"json"}); if(!existing||itemMarket(existing)!==market)return badRequest("Documento não encontrado.");
      if(!canManageDocument(authUser,existing))return forbidden("Não pode eliminar este documento.");
      if(payload.expectedUpdatedAt&&existing.updatedAt&&String(payload.expectedUpdatedAt)!==String(existing.updatedAt))return conflict("Este documento foi alterado por outro utilizador. Reabra-o antes de eliminar.",{data:existing});
      await store.delete(documentMetaBlobKey(id)); await store.delete(documentDataBlobKey(id));
      await safeGovernanceAudit(store,authUser,{category:"Documentos",action:"Documento eliminado",resource:"ops-document",key:id,hotel:existing.hotel,detail:[existing.title,existing.fileName].filter(Boolean).join(" · "),severity:"warning",before:{hotel:existing.hotel,title:existing.title,category:existing.category,fileName:existing.fileName,size:existing.size},after:null});
      return ok({ok:true,id});
    }
    if (["ops-documents","ops-document-file","ops-document-content","ops-document-save","ops-document-delete"].includes(resource)) return response(405,{error:"Método não permitido."});
    if (resource.startsWith("ops-doc-meta/")||resource.startsWith("ops-doc-data/")) return forbidden("Os documentos só podem ser acedidos pelos endpoints próprios.");


    // -------------------- WORKFLOW DE APROVAÇÕES (v27) --------------------
    if (resource === "ops-approvals" && event.httpMethod === "GET") {
      const rows = await listOperationalApprovals(store, market);
      const visible = rows.filter(x=>canSeeApproval(authUser,x));
      return ok({ data:visible, total:visible.length, updatedAt:new Date().toISOString() });
    }
    if (resource === "ops-approval-save" && event.httpMethod === "POST") {
      if (bodySizeOf(event) > 256 * 1024) return tooLarge("O pedido de aprovação excede o tamanho permitido.");
      const payload=parseBody(event);
      if(!payload||typeof payload!=="object") return badRequest("Pedido de aprovação inválido.");
      const rawId=cleanText(payload.id,80).replace(/[^a-zA-Z0-9_.-]/g,"");
      let existing=rawId?await store.get(approvalBlobKey(rawId),{type:"json"}):null;
      if(existing && itemMarket(existing)!==market) existing=null;
      if(existing){
        if(!canEditApproval(authUser,existing)) return forbidden("Não pode editar este pedido.");
        if(payload.expectedUpdatedAt&&existing.updatedAt&&String(payload.expectedUpdatedAt)!==String(existing.updatedAt)) return conflict("Este pedido foi alterado por outro utilizador. Reabra-o para ver a versão mais recente.",{data:existing});
      }
      const hotel=cleanText(payload.hotel||existing?.hotel,120);
      if(!hotel) return badRequest("Hotel obrigatório.");
      if(!existing&&!canManageHotel(authUser,hotel)) return forbidden("Só pode criar pedidos para o hotel associado à sua conta.");
      if(existing&&norm(existing.hotel)!==norm(hotel)&&!isDirection(authUser)&&(!userCanHotel(authUser,existing.hotel)||!userCanHotel(authUser,hotel))) return forbidden("Não pode transferir o pedido para fora dos hotéis autorizados.");
      const type=cleanText(payload.type!==undefined?payload.type:existing?.type||"operational",30);
      const priority=cleanText(payload.priority!==undefined?payload.priority:existing?.priority||"normal",20);
      const title=cleanText(payload.title!==undefined?payload.title:existing?.title,240);
      const description=cleanText(payload.description!==undefined?payload.description:existing?.description,3000);
      const dueDate=cleanText(payload.dueDate!==undefined?payload.dueDate:existing?.dueDate,10);
      const linkType=cleanText(payload.linkType!==undefined?payload.linkType:existing?.linkType||"hotel",20);
      const linkId=cleanText(payload.linkId!==undefined?payload.linkId:existing?.linkId,240);
      if(!APPROVAL_TYPES.has(type)) return badRequest("Tipo de aprovação inválido.");
      if(!APPROVAL_PRIORITIES.has(priority)) return badRequest("Prioridade inválida.");
      if(!title||!description) return badRequest("Título e justificação são obrigatórios.");
      if(!validDateOnly(dueDate)) return badRequest("Data limite inválida.");
      if(!APPROVAL_LINK_TYPES.has(linkType)) return badRequest("Tipo de associação inválido.");
      if(linkType!=="hotel"&&!linkId) return badRequest("Referência associada obrigatória.");
      let linkLabel="";
      try{linkLabel=await approvalLinkLabel(store,linkType,linkId,hotel,market);}catch(e){return badRequest(e.message||"Referência associada inválida.");}

      const users=await loadUsers(store,true);
      const approverUser=safeUserName(payload.approverUser!==undefined?payload.approverUser:existing?.approverUser);
      let approverName="";
      if(approverUser){
        const ap=users[approverUser];
        if(!ap||ap.active===false||!isDirection(ap)) return badRequest("O aprovador tem de ser um utilizador ativo da Direção.");
        approverName=ap.name||ap.user;
      }
      const now=nextIsoTimestamp(existing?.updatedAt);
      const item=existing?Object.assign({},existing):{
        id:"apr_"+Date.now().toString(36)+"_"+crypto.randomBytes(5).toString("hex"),
        status:"pending",createdAt:now,requesterUser:authUser.user,requesterName:authUser.name,
        createdBy:{user:authUser.user,name:authUser.name},history:[]
      };
      const before=existing?{hotel:existing.hotel,type:existing.type,priority:existing.priority,title:existing.title,dueDate:existing.dueDate||"",approverUser:existing.approverUser||"",linkType:existing.linkType||"hotel",linkId:existing.linkId||""}:null;
      item.market=market;item.hotel=hotel;item.type=type;item.priority=priority;item.title=title;item.description=description;item.dueDate=dueDate;item.approverUser=approverUser;item.approverName=approverName;item.linkType=linkType;item.linkId=linkType==="hotel"?"":linkId;item.linkLabel=linkLabel;item.updatedAt=now;item.updatedBy={user:authUser.user,name:authUser.name};
      if(!Array.isArray(item.history)) item.history=[];
      item.history.push(approvalHistoryEntry(authUser,existing?"updated":"submitted",existing?"Pedido atualizado.":"Pedido submetido para decisão."));
      item.history=item.history.slice(-180);
      await store.setJSON(approvalBlobKey(item.id),item);
      await safeGovernanceAudit(store,authUser,{category:"Aprovações",action:existing?"Pedido de aprovação atualizado":"Pedido de aprovação submetido",resource:"ops-approval",key:item.id,hotel:item.hotel,detail:[item.title,item.approverName||"Direção",item.priority].filter(Boolean).join(" · "),severity:item.priority==="critical"?"warning":"info",before,after:{hotel:item.hotel,type:item.type,priority:item.priority,title:item.title,dueDate:item.dueDate||"",approverUser:item.approverUser||"",linkType:item.linkType,linkId:item.linkId||""}});
      return ok({ok:true,data:item});
    }
    if (resource === "ops-approval-decide" && event.httpMethod === "POST") {
      if(!isDirection(authUser)) return forbidden("A decisão de aprovação está reservada à Direção.");
      const payload=parseBody(event);if(!payload||typeof payload!=="object") return badRequest("Decisão inválida.");
      const id=cleanText(payload.id,80).replace(/[^a-zA-Z0-9_.-]/g,"");
      const item=id?await store.get(approvalBlobKey(id),{type:"json"}):null;
      if(!item||itemMarket(item)!==market) return badRequest("Pedido de aprovação não encontrado.");
      if(!canDecideApproval(authUser,item)) return forbidden("Este pedido está atribuído a outro aprovador ou já foi decidido.");
      if(payload.expectedUpdatedAt&&item.updatedAt&&String(payload.expectedUpdatedAt)!==String(item.updatedAt)) return conflict("Este pedido foi alterado por outro utilizador. Reabra-o antes de decidir.",{data:item});
      const decision=cleanText(payload.decision,20);
      if(!["approve","reject"].includes(decision)) return badRequest("Decisão inválida.");
      const note=cleanText(payload.note,2400);
      if(decision==="reject"&&note.length<5) return badRequest("Indique o motivo da rejeição.");
      const self=safeUserName(item.requesterUser)===safeUserName(authUser.user);
      const overrideSelf=payload.overrideSelf===true;
      if(self&&(!overrideSelf||note.length<20)) return forbidden("A decisão do próprio pedido exige aprovação excecional e justificação detalhada.");
      const now=nextIsoTimestamp(item.updatedAt);
      const oldStatus=item.status;
      item.status=decision==="approve"?"approved":"rejected";
      item.decisionAt=now;item.decisionBy={user:authUser.user,name:authUser.name};item.decisionNote=note;item.selfApprovalException=!!self;item.updatedAt=now;item.updatedBy={user:authUser.user,name:authUser.name};
      if(!Array.isArray(item.history))item.history=[];
      item.history.push(approvalHistoryEntry(authUser,item.status==="approved"?"approved":"rejected",note|| (item.status==="approved"?"Pedido aprovado.":"Pedido rejeitado."),{selfApprovalException:!!self}));
      item.history=item.history.slice(-180);
      await store.setJSON(approvalBlobKey(item.id),item);
      await safeGovernanceAudit(store,authUser,{category:"Aprovações",action:item.status==="approved"?"Pedido aprovado":"Pedido rejeitado",resource:"ops-approval",key:item.id,hotel:item.hotel,detail:[item.title,note,self?"APROVAÇÃO EXCECIONAL PELO PRÓPRIO REQUERENTE":""].filter(Boolean).join(" · "),severity:self?"critical":(item.status==="rejected"||item.priority==="critical"?"warning":"info"),before:{status:oldStatus},after:{status:item.status,decisionBy:authUser.user,selfApprovalException:!!self},meta:{type:item.type,priority:item.priority}});
      return ok({ok:true,data:item});
    }
    if (resource === "ops-approval-cancel" && event.httpMethod === "POST") {
      const payload=parseBody(event);if(!payload||typeof payload!=="object") return badRequest("Pedido inválido.");
      const id=cleanText(payload.id,80).replace(/[^a-zA-Z0-9_.-]/g,"");
      const item=id?await store.get(approvalBlobKey(id),{type:"json"}):null;
      if(!item||itemMarket(item)!==market) return badRequest("Pedido de aprovação não encontrado.");
      if(!canCancelApproval(authUser,item)) return forbidden("Não pode cancelar este pedido.");
      if(payload.expectedUpdatedAt&&item.updatedAt&&String(payload.expectedUpdatedAt)!==String(item.updatedAt)) return conflict("Este pedido foi alterado por outro utilizador.",{data:item});
      const now=nextIsoTimestamp(item.updatedAt);item.status="cancelled";item.updatedAt=now;item.updatedBy={user:authUser.user,name:authUser.name};
      if(!Array.isArray(item.history))item.history=[];item.history.push(approvalHistoryEntry(authUser,"cancelled","Pedido cancelado."));item.history=item.history.slice(-180);
      await store.setJSON(approvalBlobKey(item.id),item);
      await safeGovernanceAudit(store,authUser,{category:"Aprovações",action:"Pedido de aprovação cancelado",resource:"ops-approval",key:item.id,hotel:item.hotel,detail:item.title,severity:"warning",before:{status:"pending"},after:{status:"cancelled"}});
      return ok({ok:true,data:item});
    }
    if (["ops-approvals","ops-approval-save","ops-approval-decide","ops-approval-cancel"].includes(resource)) return response(405,{error:"Método não permitido."});
    if (resource.startsWith("ops-approval/")) return forbidden("Os pedidos de aprovação só podem ser acedidos pelos endpoints próprios.");

    // -------------------- COMPARAÇÃO DE CENÁRIOS v29 --------------------

    // -------------------- CITY LEDGER & COBRANÇAS V32 --------------------
    if (resource === "ops-cityledger-snapshots" && event.httpMethod === "GET") {
      return ok({ data: await listCityLedgerSnapshots(store, market, authUser) });
    }
    if (resource === "ops-cityledger-chunk" && event.httpMethod === "GET") {
      const snapshot=cleanText(params.snapshot,120),hotel=cleanText(params.hotel,160),part=Number(params.part||0);
      if(!snapshot||!hotel||!Number.isInteger(part)||part<0)return badRequest("Referência de City Ledger inválida.");
      if(!canManageHotel(authUser,hotel))return forbidden();
      if(hotelMarketServer(hotel)!==market)return forbidden("O hotel pertence a outra geografia.");
      const data=await store.get(cityChunkBlobKey(market,snapshot,hotel,part),{type:"json"});
      return ok({data:Array.isArray(data)?data:[]});
    }
    if (resource === "ops-cityledger-chunk-save" && event.httpMethod === "POST") {
      if(!isDirection(authUser))return forbidden("Apenas a Direção pode importar o City Ledger.");
      if(bodySizeOf(event)>MAX_BODY_BYTES)return tooLarge("O bloco do City Ledger excede o limite do endpoint.");
      const input=parseBody(event)||{},snapshot=cleanText(input.snapshotId,120),hotel=cleanText(input.hotel,160),part=Number(input.part||0),rows=input.rows;
      if(!snapshot||!hotel||!Number.isInteger(part)||part<0||!Array.isArray(rows)||rows.length>1200)return badRequest("Bloco de City Ledger inválido.");
      if(hotelMarketServer(hotel)!==market)return badRequest("O hotel do bloco pertence a outra geografia.");
      if(rows.some(r=>norm(r?.hotel)!==norm(hotel)||marketId(r?.market||market)!==market))return badRequest("O bloco mistura hotéis ou geografias.");
      await store.setJSON(cityChunkBlobKey(market,snapshot,hotel,part),rows);
      return ok({ok:true,rows:rows.length});
    }
    if (resource === "ops-cityledger-snapshot-save" && event.httpMethod === "POST") {
      if(!isDirection(authUser))return forbidden("Apenas a Direção pode publicar o City Ledger.");
      if(bodySizeOf(event)>512*1024)return tooLarge("O resumo do City Ledger excede o tamanho permitido.");
      const input=parseBody(event)||{},id=cleanText(input.id,120),snapshotDate=cleanText(input.snapshotDate,20),hotels=Array.isArray(input.hotels)?input.hotels.map(x=>cleanText(x,160)).filter(Boolean):[];
      if(!id||!/^[A-Za-z0-9_.-]+$/.test(id)||!/^\d{4}-\d{2}-\d{2}$/.test(snapshotDate)||!hotels.length)return badRequest("Snapshot do City Ledger inválido.");
      if(hotels.some(h=>hotelMarketServer(h)!==market))return badRequest("O snapshot contém hotéis de outra geografia.");
      const partsByHotel={};for(const h of hotels)partsByHotel[h]=Math.max(0,Math.min(100,Number(input.partsByHotel?.[h]||0)));
      const item={id,market,snapshotDate,fileName:cleanText(input.fileName,300),fileSize:Number(input.fileSize||0)||0,hotels,partsByHotel,summary:input.summary&&typeof input.summary==="object"?input.summary:{},ignoredRows:Number(input.ignoredRows||0)||0,createdAt:new Date().toISOString(),createdBy:authUser.user,createdByName:authUser.name};
      await store.setJSON(citySnapshotBlobKey(market,id),item);
      await safeGovernanceAudit(store,authUser,{category:"City Ledger",action:"City Ledger publicado",resource:"ops-cityledger",key:id,detail:`${snapshotDate} · ${hotels.length} hotéis · ${Number(item.summary?.documents||0)} documentos · ${item.ignoredRows} linhas não-hotel ignoradas`,severity:"info",meta:{market,hotels:hotels.length,documents:Number(item.summary?.documents||0),debt:Number(item.summary?.debt||0)}});
      return ok({ok:true,data:item});
    }
    if (resource === "ops-cityledger-email-templates" && event.httpMethod === "GET") {
      const stored=await store.get(cityEmailTemplatesBlobKey(market),{type:"json"});
      return ok({data:stored&&Array.isArray(stored.templates)?stored:{market,templates:CITYLEDGER_DEFAULT_EMAIL_TEMPLATES,updatedAt:"",updatedBy:"",updatedByName:""}});
    }
    if (resource === "ops-cityledger-email-templates" && event.httpMethod === "POST") {
      if(!isDirection(authUser))return forbidden("Apenas a Direção pode alterar os templates de cobrança.");
      if(bodySizeOf(event)>96*1024)return tooLarge("Os templates de email excedem o tamanho permitido.");
      const input=parseBody(event)||{},raw=Array.isArray(input.templates)?input.templates:[];
      if(raw.length!==3)return badRequest("Devem existir exatamente 3 templates de cobrança.");
      const templates=raw.map(t=>({id:cleanText(t.id,30),name:cleanText(t.name,80),subject:cleanText(t.subject,250),body:cleanText(t.body,6000)}));
      if(templates.some(t=>!CITYLEDGER_EMAIL_TEMPLATE_IDS.has(t.id)||!t.name||!t.subject||!t.body)||new Set(templates.map(t=>t.id)).size!==3)return badRequest("Templates de cobrança inválidos.");
      const item={market,templates,updatedAt:new Date().toISOString(),updatedBy:authUser.user,updatedByName:authUser.name};
      await store.setJSON(cityEmailTemplatesBlobKey(market),item);
      await safeGovernanceAudit(store,authUser,{category:"City Ledger",action:"Templates de cobrança atualizados",resource:"ops-cityledger-email-templates",key:market,detail:templates.map(t=>t.name).join(" · "),severity:"info",meta:{market,templateCount:templates.length}});
      return ok({ok:true,data:item});
    }
    if (resource === "ops-cityledger-diligences" && event.httpMethod === "GET") {
      return ok({data:await listCityLedgerDiligences(store,market,authUser)});
    }
    if (resource === "ops-cityledger-diligence-save" && event.httpMethod === "POST") {
      if(bodySizeOf(event)>128*1024)return tooLarge("A diligência excede o tamanho permitido.");
      const input=parseBody(event)||{},hotel=cleanText(input.hotel,160);
      if(!hotel||!canManageHotel(authUser,hotel))return forbidden();
      if(hotelMarketServer(hotel)!==market)return forbidden("O hotel pertence a outra geografia.");
      const method=cleanText(input.method,20),result=cleanText(input.result,20),status=cleanText(input.status,30);
      if(!CITYLEDGER_METHODS.has(method)||!CITYLEDGER_RESULTS.has(result)||!CITYLEDGER_STATUSES.has(status))return badRequest("Tipo/estado de diligência inválido.");
      const invoiceKeys=Array.isArray(input.invoiceKeys)?input.invoiceKeys.map(x=>cleanText(x,500)).filter(Boolean).slice(0,100):[];
      if(!invoiceKeys.length)return badRequest("A diligência deve estar associada a pelo menos uma fatura.");
      const promisedDate=cleanText(input.promisedDate,20),nextContactDate=cleanText(input.nextContactDate,20);if(!validDateOnly(promisedDate)||!validDateOnly(nextContactDate))return badRequest("Data de diligência/promessa inválida.");
      const detail=cleanText(input.detail,1800),answer=cleanText(input.response,1800);if(!detail)return badRequest("Descreva a diligência realizada.");
      const id=`dil-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`,item={id,market,hotel,clientKey:cleanText(input.clientKey,500),clientName:cleanText(input.clientName,300),clientCode:cleanText(input.clientCode,120),invoiceKeys,method,result,contactName:cleanText(input.contactName,200),contactDetail:cleanText(input.contactDetail,300),detail,response:answer,status,promisedAmount:Math.max(0,Number(input.promisedAmount||0)||0),promisedDate,nextContactDate,currency:cleanText(input.currency,20),emailBatchId:cleanText(input.emailBatchId,120),emailTemplateId:cleanText(input.emailTemplateId,40),emailTemplateName:cleanText(input.emailTemplateName,100),emailSubject:cleanText(input.emailSubject,250),emailBody:cleanText(input.emailBody,6000),emailTo:cleanText(input.emailTo,1000),emailCc:cleanText(input.emailCc,1000),emailScope:cleanText(input.emailScope,30),statementFileName:cleanText(input.statementFileName,300),snapshotId:cleanText(input.snapshotId,160),balanceAtContact:Number(input.balanceAtContact||0)||0,createdAt:new Date().toISOString(),createdBy:authUser.user,createdByName:authUser.name,createdByRole:authUser.role};
      await store.setJSON(cityDiligenceBlobKey(market,id),item);
      await safeGovernanceAudit(store,authUser,{category:"City Ledger",action:"Diligência de cobrança registada",resource:"ops-cityledger-diligence",key:id,hotel,detail:[item.clientName,method,result,promisedDate?`promessa ${promisedDate}`:""].filter(Boolean).join(" · "),severity:status==="legal"||status==="dispute"?"warning":"info",meta:{market,invoiceCount:invoiceKeys.length,status,method,result,promisedAmount:item.promisedAmount,promisedDate}});
      return ok({ok:true,data:item});
    }
    if (["ops-cityledger-snapshots","ops-cityledger-chunk","ops-cityledger-chunk-save","ops-cityledger-snapshot-save","ops-cityledger-diligences","ops-cityledger-diligence-save","ops-cityledger-email-templates"].includes(resource)) return response(405,{error:"Método não permitido."});
    if (resource.startsWith("ops-cityledger")) return forbidden("O City Ledger só pode ser acedido pelos endpoints próprios.");

    if (resource === "ops-scenarios" && event.httpMethod === "GET") {
      const rows=await listOperationalScenarios(store, market);
      return ok({data:rows.filter(x=>canSeeScenario(authUser,x))});
    }
    if (resource === "ops-scenario-save" && event.httpMethod === "POST") {
      const payload=parseBody(event); if(!payload||typeof payload!=="object") return badRequest("Cenário inválido.");
      const id=cleanText(payload.id,80).replace(/[^a-zA-Z0-9_.-]/g,"");
      let existing=id?await store.get(scenarioBlobKey(id),{type:"json"}):null;
      if(existing && itemMarket(existing)!==market) existing=null;
      if(id&&!existing) return badRequest("Cenário não encontrado.");
      if(existing&&!canManageScenario(authUser,existing)) return forbidden("Não pode alterar este cenário.");
      if(existing&&payload.expectedUpdatedAt&&existing.updatedAt&&String(payload.expectedUpdatedAt)!==String(existing.updatedAt)) return conflict("Este cenário foi alterado por outro utilizador. Reabra-o antes de gravar.",{data:existing});
      const hotel=cleanText(payload.hotel!==undefined?payload.hotel:existing?.hotel,140);
      if(!hotel) return badRequest("Hotel obrigatório.");
      if(!canManageScenario(authUser,hotel)) return forbidden("Só pode gerir cenários do hotel associado à sua conta.");
      const year=Number(payload.year!==undefined?payload.year:existing?.year); const month=Number(payload.month!==undefined?payload.month:existing?.month);
      if(!Number.isInteger(year)||year<2000||year>2100) return badRequest("Ano inválido.");
      if(!Number.isInteger(month)||month<1||month>12) return badRequest("Mês inválido.");
      const name=cleanText(payload.name!==undefined?payload.name:existing?.name,100); if(name.length<2) return badRequest("Nome do cenário obrigatório.");
      const description=cleanText(payload.description!==undefined?payload.description:existing?.description,1200);
      let adjustments; try{adjustments=scenarioAdjustments(payload.adjustments!==undefined?payload.adjustments:existing?.adjustments);}catch(e){return badRequest(e.message||"Ajustes inválidos.");}
      const baseline=scenarioBaseline(payload.baseline!==undefined?payload.baseline:existing?.baseline||{});
      const captured=scenarioCaptured(payload.captured!==undefined?payload.captured:existing?.captured||{});
      const now=nextIsoTimestamp(existing?.updatedAt);
      const item=existing?Object.assign({},existing):{id:"scn_"+Date.now().toString(36)+"_"+crypto.randomBytes(5).toString("hex"),createdAt:now,createdBy:{user:authUser.user,name:authUser.name},history:[]};
      const before=existing?{hotel:existing.hotel,year:existing.year,month:existing.month,name:existing.name,adjustments:existing.adjustments}:null;
      item.market=market;item.hotel=hotel;item.year=year;item.month=month;item.name=name;item.description=description;item.adjustments=adjustments;item.baseline=baseline;item.captured=captured;item.updatedAt=now;item.updatedBy={user:authUser.user,name:authUser.name};
      if(!Array.isArray(item.history))item.history=[];item.history.push(scenarioHistoryEntry(authUser,existing?"updated":"created",existing?"Cenário atualizado.":"Cenário guardado."));item.history=item.history.slice(-120);
      await store.setJSON(scenarioBlobKey(item.id),item);
      await safeGovernanceAudit(store,authUser,{category:"Cenários",action:existing?"Cenário atualizado":"Cenário criado",resource:"ops-scenario",key:item.id,hotel:item.hotel,detail:[item.name,item.month+"/"+item.year].join(" · "),severity:"info",before,after:{hotel:item.hotel,year:item.year,month:item.month,name:item.name,adjustments:item.adjustments}});
      return ok({ok:true,data:item});
    }
    if (resource === "ops-scenario-delete" && event.httpMethod === "POST") {
      const payload=parseBody(event);if(!payload||typeof payload!=="object") return badRequest("Pedido inválido.");
      const id=cleanText(payload.id,80).replace(/[^a-zA-Z0-9_.-]/g,""); const item=id?await store.get(scenarioBlobKey(id),{type:"json"}):null;
      if(!item||itemMarket(item)!==market) return badRequest("Cenário não encontrado.");
      if(!canManageScenario(authUser,item)) return forbidden("Não pode eliminar este cenário.");
      if(payload.expectedUpdatedAt&&item.updatedAt&&String(payload.expectedUpdatedAt)!==String(item.updatedAt)) return conflict("Este cenário foi alterado por outro utilizador.",{data:item});
      await store.delete(scenarioBlobKey(id));
      await safeGovernanceAudit(store,authUser,{category:"Cenários",action:"Cenário eliminado",resource:"ops-scenario",key:id,hotel:item.hotel,detail:[item.name,item.month+"/"+item.year].join(" · "),severity:"warning",before:{name:item.name,year:item.year,month:item.month,adjustments:item.adjustments},after:null});
      return ok({ok:true,id});
    }
    if (["ops-scenarios","ops-scenario-save","ops-scenario-delete"].includes(resource)) return response(405,{error:"Método não permitido."});
    if (resource.startsWith("ops-scenario/")) return forbidden("Os cenários só podem ser acedidos pelos endpoints próprios.");

    // -------------------- PASSWORD DO PRÓPRIO --------------------
    if (event.httpMethod === "POST" && resource === "auth-change-password") {
      const payload = parseBody(event);
      if (!payload) return badRequest("JSON inválido.");
      const oldPassword = String(payload.oldPassword || "");
      const newPassword = String(payload.newPassword || "");
      if (!verifyPassword(oldPassword, authUser)) return unauthorized("A palavra-passe atual está incorreta.");
      const policyError = passwordPolicy(newPassword);
      if (policyError) return badRequest(policyError);
      if (verifyPassword(newPassword, authUser)) return badRequest("A nova palavra-passe tem de ser diferente da atual.");

      const users = await loadUsers(store, true);
      const rec = users[authUser.user];
      Object.assign(rec, newPasswordFields(newPassword));
      rec.mustChangePassword = false;
      rec.passwordUpdatedAt = new Date().toISOString();
      rec.authVersion = Number(rec.authVersion || 1) + 1;
      await saveUsers(store, users);
      const token = await issueToken(store, rec);
      await safeGovernanceAudit(store, rec, { category:"Segurança", action:"Palavra-passe alterada", resource:"auth", key:rec.user, detail:"O utilizador alterou a própria palavra-passe; sessões anteriores foram revogadas.", severity:"warning" });
      return ok({ ok: true, token, user: sanitizeUser(rec), expiresIn: SESSION_TTL_SECONDS });
    }

    // -------------------- GESTÃO DE UTILIZADORES --------------------
    if (resource === "users" && event.httpMethod === "GET") {
      if (!isDirection(authUser)) return forbidden();
      const users = await loadUsers(store, true);
      return ok({ data: sanitizeUsers(users) });
    }
    if (resource === "user-save" && event.httpMethod === "POST") {
      if (!isDirection(authUser)) return forbidden();
      const payload = parseBody(event);
      if (!payload) return badRequest("JSON inválido.");
      const username = safeUserName(payload.user);
      const name = String(payload.name || "").trim();
      let role = normalizeRole(payload.role || "diretor");
      let hotels = Array.isArray(payload.hotels)?payload.hotels.map(x=>String(x||"").trim()).filter(Boolean):[];
      if(!hotels.length&&payload.hotel&&payload.hotel!=="*")hotels=[String(payload.hotel)];
      let modules = Array.isArray(payload.modules)?payload.modules.map(x=>String(x||"").trim()).filter(Boolean):[];
      const newPassword = String(payload.password || "");
      if (!username || !name) return badRequest("Utilizador e nome são obrigatórios.");
      if (!["direcao", "diretor", "assistente", "governanta", "chefe_recepcao", "compras"].includes(role)) return badRequest("Perfil inválido.");
      if(role==="direcao"){hotels=["*"];modules=["*"];}
      else {
        hotels=[...new Set(hotels.filter(x=>x!=="*"))]; if(!hotels.length)return badRequest("Selecione pelo menos um hotel para este perfil.");
        const defaults=DEFAULT_MODULES_BY_ROLE[role]||[]; modules=[...new Set((modules.length?modules:defaults).filter(x=>x&&!DIRECTION_ONLY_MODULES.has(x)))];
        if(!modules.length)return badRequest("Selecione pelo menos um módulo para este perfil.");
      }
      const hotel = role==="direcao"?"*":hotels[0];

      const users = await loadUsers(store, true);
      const existing = users[username];
      if (!existing && !newPassword) return badRequest("Defina uma palavra-passe inicial para o novo utilizador.");
      if (username === authUser.user && newPassword) return badRequest("Para alterar a sua própria palavra-passe use o botão Password.");
      if (newPassword) {
        const policyError = passwordPolicy(newPassword);
        if (policyError) return badRequest(policyError);
      }

      const rec = existing ? Object.assign({}, existing) : { user: username, active: true, authVersion: 1 };
      const nextActive = payload.active === undefined ? (existing ? existing.active !== false : true) : payload.active !== false;
      const securityChanged = !!existing && (
        normalizeRole(existing.role) !== role || JSON.stringify(userHotels(existing)) !== JSON.stringify(hotels) || JSON.stringify(userModules(existing)) !== JSON.stringify(modules) || existing.active !== nextActive || !!newPassword
      );
      rec.user = username;
      rec.name = name;
      rec.role = role;
      rec.hotel = hotel;
      rec.hotels = hotels;
      rec.modules = modules;
      rec.active = nextActive;
      if (newPassword) {
        Object.assign(rec, newPasswordFields(newPassword));
        rec.mustChangePassword = true;
        rec.passwordUpdatedAt = new Date().toISOString();
      }
      if (securityChanged) rec.authVersion = Number(rec.authVersion || 1) + 1;

      if (username === "pmonforte") { rec.active = true; rec.role = "direcao"; rec.hotel = "*"; rec.hotels=["*"]; rec.modules=["*"]; }
      users[username] = rec;
      await saveUsers(store, users);
      await safeGovernanceAudit(store, authUser, {
        category:"Utilizadores", action: existing ? "Utilizador atualizado" : "Utilizador criado", resource:"users", key:username, hotel:rec.hotel === "*" ? "" : rec.hotel,
        detail:`${rec.name} · ${rec.role} · ${isDirection(rec)?"todos os hotéis / todos os módulos":`${rec.hotels.length} hotel(éis) · ${rec.modules.length} módulo(s)`}${newPassword ? " · credencial temporária definida" : ""}`, severity: securityChanged || !existing ? "warning" : "info",
        before: existing ? sanitizeUser(existing) : null, after:sanitizeUser(rec), meta:{ passwordReset:!!newPassword }
      });
      return ok({ ok: true, user: sanitizeUser(rec) });
    }
    if (resource === "user-toggle" && event.httpMethod === "POST") {
      if (!isDirection(authUser)) return forbidden();
      const payload = parseBody(event);
      if (!payload) return badRequest("JSON inválido.");
      const username = safeUserName(payload.user);
      if (username === "pmonforte") return forbidden("O administrador principal não pode ser inativado.");
      const users = await loadUsers(store, true);
      const rec = users[username];
      if (!rec) return badRequest("Utilizador inexistente.");
      rec.active = rec.active === false ? true : false;
      rec.authVersion = Number(rec.authVersion || 1) + 1;
      await saveUsers(store, users);
      await safeGovernanceAudit(store, authUser, { category:"Utilizadores", action:rec.active ? "Utilizador reativado" : "Utilizador inativado", resource:"users", key:username, hotel:rec.hotel === "*" ? "" : rec.hotel, detail:rec.name, severity:"critical", before:{active:!rec.active}, after:{active:rec.active} });
      return ok({ ok: true, user: sanitizeUser(rec) });
    }
    // O antigo POST direto de dicionários de utilizadores deixa de existir.
    if (resource === "users" && event.httpMethod === "POST") return forbidden("Use a gestão de utilizadores autenticada.");

    // -------------------- AUDITORIA --------------------
    if (resource === "audit" && event.httpMethod === "GET") {
      if (!isDirection(authUser)) return forbidden();
      const data = await store.get("audit", { type: "json" });
      return ok({ data: Array.isArray(data) ? data : [] });
    }
    if (resource === "audit" && event.httpMethod === "POST") {
      const payload = parseBody(event);
      if (!payload || typeof payload !== "object") return badRequest("Entrada de auditoria inválida.");
      let rows = (await store.get("audit", { type: "json" })) || [];
      if (!Array.isArray(rows)) rows = [];
      const entry = Object.assign({}, payload, {
        user: authUser.user,
        name: authUser.name,
        serverTs: new Date().toISOString()
      });
      rows.unshift(entry);
      rows = rows.slice(0, MAX_AUDIT_ROWS);
      await store.setJSON("audit", rows);
      return ok({ ok: true, total: rows.length });
    }

    // -------------------- GET DADOS PARTILHADOS --------------------
    if (event.httpMethod === "GET") {
      if (resource === "index") {
        const idx = (await store.get(marketStoreKey(market,"index"), { type: "json" })) || {
          meses: [], hoteis: [], occIds: [], igIds: [], rdIds: [], piuKeys: [], hxKeys: [], updatedAt: null
        };
        return ok({ data: idx });
      }
      const data = await store.get(marketStoreKey(market,blobKeyFor(resource, key)), { type: "json" });
      return ok({ key: key || null, data: data === undefined ? null : data });
    }

    // -------------------- POST DADOS PARTILHADOS --------------------
    if (event.httpMethod === "POST") {
      if (!canWriteResource(authUser, resource, key)) return forbidden();
      const size = bodySizeOf(event);
      if (size > MAX_BODY_BYTES) {
        return tooLarge(`Pedaço "${resource}${key ? " " + key : ""}" tem ${(size / (1024 * 1024)).toFixed(1)}MB — acima do limite (~6MB).`);
      }
      const payload = parseBody(event);
      if (payload === null) return badRequest("JSON inválido.");

      const shouldAudit = auditedGeneric(resource);
      const auditKey = marketStoreKey(market, resource === "index" ? "index" : blobKeyFor(resource, key));
      const beforeAudit = shouldAudit ? await store.get(auditKey, { type:"json" }) : null;
      if (resource === "index") {
        if (!payload || typeof payload !== "object") return badRequest("Índice inválido.");
        const next = Object.assign({}, payload, { updatedAt: new Date().toISOString() });
        await store.setJSON(marketStoreKey(market,"index"), next);
        const d = genericAuditDescriptor(resource, key);
        await safeGovernanceAudit(store, authUser, Object.assign({}, d, { resource, key:"", detail:`Publicação com ${Array.isArray(payload.meses)?payload.meses.length:0} meses e ${Array.isArray(payload.hoteis)?payload.hoteis.length:0} hotéis.`, before:beforeAudit, after:next, meta:{meses:Array.isArray(payload.meses)?payload.meses.length:0,hoteis:Array.isArray(payload.hoteis)?payload.hoteis.length:0} }));
        return ok({ ok: true });
      }
      await store.setJSON(marketStoreKey(market,blobKeyFor(resource, key)), payload);
      if (shouldAudit) {
        const d = genericAuditDescriptor(resource, key);
        await safeGovernanceAudit(store, authUser, Object.assign({}, d, { resource, key, before:beforeAudit, after:payload }));
      }
      return ok({ ok: true });
    }

    return response(405, { error: "Método não permitido." });
  } catch (err) {
    return serverError(err);
  }
};
