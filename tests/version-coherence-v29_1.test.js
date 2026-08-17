const assert=require('assert');
const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const {ROOT}=require('./helpers/browser-sandbox');

const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(ROOT,'service-worker.js'),'utf8');
const mobile=fs.readFileSync(path.join(ROOT,'assets/js/ui/mobile-pwa.js'),'utf8');
const guard=fs.readFileSync(path.join(ROOT,'assets/js/core/06-version-guard-v29_1.js'),'utf8');
const docs=fs.readFileSync(path.join(ROOT,'assets/js/modules/document-management-v26.js'),'utf8');
const approvals=fs.readFileSync(path.join(ROOT,'assets/js/modules/workflow-approvals-v27.js'),'utf8');
const scenarios=fs.readFileSync(path.join(ROOT,'assets/js/modules/scenario-comparison-v29.js'),'utf8');

for(const f of ['service-worker.js','assets/js/ui/mobile-pwa.js','assets/js/core/06-version-guard-v29_1.js','assets/js/modules/document-management-v26.js','assets/js/modules/workflow-approvals-v27.js','assets/js/modules/scenario-comparison-v29.js']){
  cp.execFileSync(process.execPath,['--check',path.join(ROOT,f)],{stdio:'pipe'});
}

const guardTag=html.match(/<script[^>]+06-version-guard-v29_1\.js[^>]*><\/script>/i)?.[0]||'';
assert(guardTag&&!/\bdefer\b/i.test(guardTag),'guard v29.1 deve executar antes dos restantes scripts');
assert((/const BUILD='32\.[3-9]'/.test(guard)||/PLATFORM_BUILD='(?:3[3-9]|[4-9]\d)\./.test(guard))&&guard.includes("/service-worker.js?vg="),'guard deve declarar build V32.3 ou superior e SW versionado');
assert(guard.includes("updateViaCache:'none'")&&guard.includes("controllerchange"),'guard deve forçar verificação do SW e reagir à troca de controller');
assert(guard.includes('vg-build-updating')&&guard.includes('A atualizar VG Operations'),'troca de versão deve ocultar temporariamente shell inconsistente');
assert(guard.includes('documentManagementRender')&&guard.includes('approvalsRender')&&guard.includes('scenarioComparisonRender'),'guard deve diagnosticar módulos recentes');
const cm=sw.match(/const CACHE_NAME = 'vg-operations-shell-v(\d+)(?:-(\d+))?'/);assert(Number(cm?.[1]||0)>32||(Number(cm?.[1]||0)===32&&Number(cm?.[2]||0)>=3),'SW deve usar cache V32.3 ou superior');
assert(sw.includes('recursos estáticos da própria aplicação são NETWORK-FIRST')||sw.includes('NETWORK-FIRST'),'SW deve usar rede primeiro para shell online');
assert(!sw.includes('const cached=await caches.match(req, {ignoreSearch:true});\n      if (cached)'),'SW não pode manter estratégia cache-first antiga');
assert(sw.includes("caches.match(req,{ignoreSearch:true})")&&sw.indexOf("caches.match(req,{ignoreSearch:true})")>sw.indexOf('catch (e)'),'cache deve ser apenas fallback offline');
assert(/service-worker\.js\?vg=(?:32\.[3-9]|(?:3[3-9]|[4-9]\d)\.\d+)/.test(mobile)&&mobile.includes("updateViaCache:'none'"),'cliente PWA deve manter URL/versionamento do guard');
assert(docs.includes('async function renderPage(){render();await ensureLoaded(false);render();}'),'Documentos deve mostrar shell antes da rede');
assert(approvals.includes('async function renderPage(){render();await ensureLoaded(false);render();}'),'Aprovações deve mostrar shell antes da rede');
assert(scenarios.includes('async function renderPage(){render();await ensureLoaded(false);render();}'),'Cenários deve mostrar shell antes da rede');
console.log('✓ v29.1: coerência HTML/JS/SW, atualização automática e módulos sem placeholder infinito');
