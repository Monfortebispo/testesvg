const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const cp=require('child_process');
const ROOT=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');

const pkg=require('../package.json');
const html=read('index.html');
const sw=read('service-worker.js');
const guard=read('assets/js/core/06-version-guard-v29_1.js');
const h360=read('assets/js/modules/hotel-360-v30.js');
const nav=read('assets/js/ui/navigation-shell.js');
const search=read('assets/js/ui/global-search.js');
const domains=read('assets/js/modules/operations-domains-v33.js');
const hk=read('assets/js/modules/housekeeping-native-v35.js');
const hkcss=read('assets/css/housekeeping-native-v35.css');
const authcss=read('assets/css/auth.css');
const responsive=read('assets/css/responsive-desktop-v35_6.css');

assert.strictEqual(pkg.version,'35.8.0','package deve identificar V35.8');
assert(html.includes('content="35.8"')&&html.includes('V35.8 · Estável'),'HTML deve identificar V35.8');
assert(guard.includes("PLATFORM_BUILD='35.8'"),'Version Guard deve identificar V35.8');
assert(sw.includes("vg-operations-shell-v35-8"),'Service Worker deve usar cache V35.8');
assert(html.includes('assets/css/responsive-desktop-v35_6.css'),'responsividade 125%/150% tem de estar realmente ligada ao HTML');
assert(sw.includes('/assets/css/responsive-desktop-v35_6.css'),'responsividade deve integrar o shell PWA');
assert(responsive.includes('@media (max-width:1650px)')&&responsive.includes('@media (max-width:1180px)'),'breakpoints de desktop escalado devem manter-se');

// Hotel 360: oito tabs, incluindo Eficiência, têm de sobreviver à validação interna.
assert(h360.includes("new Set(['overview','finance','revenue','efficiency','operation','reputation','actions','documents'])"),'whitelist do Hotel 360 deve incluir efficiency');
assert(h360.includes("if(state.tab==='efficiency')return window.VG?.unitEconomics?.hotel360Html"),'conteúdo de efficiency deve usar Unit Economics');

// Runtime mínimo: selectTab('efficiency') não pode cair em overview.
const win={VG:{events:{on(){}}},vgAuthCurrent:()=>({role:'direcao'})};win.window=win;
const sandbox={window:win,document:{getElementById(){return null;}},console,Date,Math,Number,String,Object,Array,JSON,Promise,Set,Map,Intl,currentView:'hotel360',setTimeout(){return 1;},clearTimeout(){},RAW:{hotels_ops:{},hotels_costs:{}},YR_CUR:'2026',YR_PREV:'2025'};
vm.createContext(sandbox);vm.runInContext(h360,sandbox,{filename:'hotel-360-v30.js'});
win.VG.hotel360.selectTab('efficiency');
assert.strictEqual(win.VG.hotel360.state.tab,'efficiency','Eficiência deve permanecer ativa no Hotel 360');

// Ctrl/Cmd+K: apenas a Pesquisa Global fica dona do atalho.
const ctrlK=/\(e\.ctrlKey\|\|e\.metaKey\).*toLowerCase\(\)===['"]k['"]/;
assert(ctrlK.test(search),'Pesquisa Global deve manter Ctrl/Cmd+K');
assert(!/\(ev\.ctrlKey\|\|ev\.metaKey\).*toLowerCase\(\)===['"]k['"]/.test(nav),'navigation-shell não pode disputar Ctrl/Cmd+K');
assert(nav.includes('Ctrl/Cmd+K pertence exclusivamente à Pesquisa Global'),'conflito do atalho deve estar documentado no shell');

// Governanta: sem hero, sem shell desktop e com entrada desde o topo.
assert(domains.includes("const gov=String(window.vgAuthCurrent?.()?.role||'').toLowerCase()==='governanta'"),'orquestrador deve reconhecer governanta');
assert(domains.includes('root.innerHTML=gov?`<div id="hk35NativeMount" class="od-native-mount gov-direct"></div>`'),'Governanta deve montar diretamente o módulo sem hero');
assert(domains.includes('window.scrollTo(0,0)'),'orquestrador deve repor o scroll no topo');
assert(hk.includes("HK35_HOST.classList.toggle('hk35-governanta',isGovernanta())"),'host Housekeeping deve conhecer o modo Governanta');
assert(hk.includes("getElementById('app').classList.add('hidden')")&&hk.includes("getElementById('govMode').classList.remove('hidden')"),'shell normal deve esconder-se quando a Governanta entra');
assert(hkcss.includes('#app:not(.hidden){display:block!important}#app.hidden{display:none!important}'),'regra #app não pode anular a classe hidden');
assert(hkcss.includes('#govMode.hidden{display:none!important}')&&hkcss.includes(':host(.hk35-governanta)'),'govMode/host devem ter regras próprias e inequívocas');
assert(authcss.includes('body.vg-governanta-mode #housekeepingRoot .od-hero{display:none!important'),'fallback exterior deve esconder hero da Governanta');

['assets/js/modules/hotel-360-v30.js','assets/js/ui/navigation-shell.js','assets/js/ui/global-search.js','assets/js/modules/operations-domains-v33.js','assets/js/modules/housekeeping-native-v35.js'].forEach(rel=>cp.execFileSync(process.execPath,['--check',path.join(ROOT,rel)],{stdio:'pipe'}));
console.log('✓ V35.8: Hotel 360 Eficiência, Ctrl+K, Governanta direta e CSS 125% validados');
