const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('index.html'),domains=read('assets/js/modules/operations-domains-v33.js'),ab=read('assets/js/modules/compras-ab-native-v35.js'),hk=read('assets/js/modules/housekeeping-native-v35.js');
assert(!html.includes('src="assets/js/modules/compras-ab-native-v35.js"')&&!html.includes('src="assets/js/modules/housekeeping-native-v35.js"'),'V35.3 deve lazy-load dos módulos pesados, não carregá-los no primeiro paint');
assert(domains.includes('loadNative35')&&domains.includes("loadNative35('ab')")&&domains.includes("loadNative35('hk')"),'orquestrador deve carregar A&B/HK sob pedido');
assert(domains.includes("loadNative35('ab')")&&domains.includes("loadNative35('hk')")&&domains.includes('mod?.mount?.(mount)'),'orquestrador deve carregar e montar os módulos nativos sob pedido');
for(const text of [html,domains,ab,hk])assert(!/integrated\/(?:custos-ab|housekeeping)\/index\.html/.test(text),'não pode existir referência às apps standalone antigas');
assert(!/<iframe[^>]+(?:custos|housekeeping)/i.test(domains),'não pode existir iframe A&B/HK');
assert(ab.includes("architecture:'native-shadow-module'")&&hk.includes("architecture:'native-shadow-module'"),'módulos devem declarar arquitetura nativa isolada');
assert(ab.includes('AB35Root')&&hk.includes('HK35Root'),'Shadow DOM deve isolar IDs/CSS sem documento secundário');
assert(ab.includes('ab35ProfileAllows')&&ab.includes('ab35MarketAllows')&&hk.includes('hk35MarketAllowsHotelObj')&&hk.includes('hotelVisivel=function'),'perfis e geografia devem ser aplicados nativamente');
assert(ab.includes('Fichas Técnicas')===false || domains.includes('Fichas Técnicas'),'hub A&B deve manter módulos complementares da plataforma');
for(const t of ['Fichas Técnicas','Consumo Teórico','Buffets &amp; Ementas','Inteligência'])assert(domains.includes(t),`hub A&B complementar em falta: ${t}`);

assert(ab.includes("await ensureXLSX35()")&&hk.includes("await ensureXLSX35()"),'imports/exports Excel dos módulos nativos devem carregar SheetJS de forma lazy pela Dashboard');
assert(ab.includes("headers.Authorization='Bearer '+authToken")&&hk.includes("h.Authorization='Bearer '+t"),'clientes nativos devem reutilizar o token autenticado da Dashboard nos backends operacionais');
const abStore=read('netlify/functions/custos-ab-store.js'),hkStore=read('netlify/functions/hk-store.js');
for(const backend of [abStore,hkStore]){
  assert(backend.includes('authenticatedUser')&&backend.includes('_auth-secret-v1')&&backend.includes('authVersion'),'backends A&B/HK devem validar a sessão HMAC e revogação da Dashboard');
  assert(backend.includes('Sessão inválida ou expirada.'),'backend operacional deve rejeitar pedidos sem sessão válida');
}
assert(!hk.includes('navigator.sendBeacon(FN_URL'),'Housekeeping não deve contornar o header de autenticação no flush de saída');
const ficha=read('assets/js/modules/ficha-hotel.js');assert.strictEqual(crypto.createHash('sha256').update(ficha).digest('hex'),'2779d6f5cbfcedb672f037494ee54847a16aec2247f5a0594346e3e6c4963dc7','Ficha do Hotel deve permanecer intacta');

const hotels=read('assets/js/modules/hoteis.js'),docs=read('assets/js/modules/document-management-v26.js'),nav=read('assets/js/ui/navigation-shell.js'),server35=read('netlify/functions/dashboard-sessao.js');
assert(hotels.includes('hoteisOpenEditor')&&hotels.includes('ops-hotel-profile-save')&&hotels.includes('ht_contacts')&&hotels.includes('ht_rests')&&hotels.includes('ht_distances'),'V35.3: todos os campos de hotel devem ser editáveis e partilhados');
assert(server35.includes('ops-hotel-profiles')&&server35.includes('HOTEL_PROFILE_PREFIX'),'V35.3: backend deve persistir fichas editadas');
assert(docs.includes('fetchDocumentBlob')&&docs.includes('documentPreviewModal')&&server35.includes('ops-document-content'),'V35.3: anexos devem abrir por endpoint binário autenticado');
assert(nav.includes('vgInterfacePicker')&&nav.includes('Ctrl+Shift+I')&&nav.includes('HK_LEGACY_URL')&&nav.includes('hkMergeHistory'),'V35.3: seletor compacto de interface e merge histórico HK devem existir');

console.log('✓ V35.3: módulos nativos + edição total de hotéis + anexos + interface + histórico HK validados');
