// VG Operations v35.6 — service worker
// Cacheia apenas a aplicação estática. Dados/API Netlify são sempre network-only.
const CACHE_NAME = 'vg-operations-shell-v35-6';
// Compatibilidade de regressão: versão anterior publicada como vg-operations-shell-v32-5.
const STATIC_ASSETS = [
  "/assets/css/housekeeping-native-v35.css",
  "/assets/css/compras-ab-native-v35.css",
  "/assets/css/actions-management.css",
  "/assets/css/audit-governance.css",
  "/assets/css/backup-recovery.css",
  "/assets/css/anomaly-detection.css",
  "/assets/css/auth.css",
  "/assets/css/base.css",
  "/assets/css/benchmarking.css",
  "/assets/css/chart-actions.css",
  "/assets/css/compras.css",
  "/assets/css/cost-detail.css",
  "/assets/css/data-center.css",
  "/assets/css/forecast-scenarios.css",
  "/assets/css/scenario-comparison-v29.css",
  "/assets/css/global-search.css",
  "/assets/css/notifications-v21.css",
  "/assets/css/operational-agenda-v22.css",
  "/assets/css/operational-summary-pdf-v32_6.css",
  "/assets/css/operations-domains-v33.css",
  "/assets/css/hotel-performance-v23.css",
  "/assets/css/automatic-reports-v24.css",
  "/assets/css/analytical-assistant-v25.css",
  "/assets/css/document-management-v26.css",
  "/assets/css/workflow-approvals-v27.css",
  "/assets/css/vg-operations-2-v30.css",
  "/assets/css/forecast-state.css",
  "/assets/css/logo-fix.css",
  "/assets/css/mobile-pwa.css",
  "/assets/css/markets-v31.css",
  "/assets/css/unit-economics-v32.css",
  "/assets/css/city-ledger-v32.css",
  "/assets/css/navigation-shell.css",
  "/assets/css/responsive-desktop-v35_6.css",
  "/assets/css/uniformizacao-v32_2.css",
  "/assets/css/operations-center.css",
  "/assets/css/revenue-intelligence-ask.css",
  "/assets/css/revenue-intelligence-secondary.css",
  "/assets/css/revenue-intelligence.css",
  "/assets/css/targets-rules.css",
  "/assets/css/theme.css",
  "/assets/css/whatsapp.css",
  "/assets/icons/vg-ops-180.png",
  "/assets/icons/vg-ops-192.png",
  "/assets/icons/vg-ops-512.png",
  "/assets/js/auth/auth-client.js",
  "/assets/js/auth/restore-after-auth.js",
  "/assets/js/core/00-runtime.js",
  "/assets/js/core/01-data-import.js",
  "/assets/js/core/02-navigation-kpis.js",
  "/assets/js/core/03-persistence-sharing.js",
  "/assets/js/core/04-bootstrap.js",
  "/assets/js/core/05-performance.js",
  "/assets/js/core/06-version-guard-v29_1.js",
  "/assets/js/core/07-markets-v31.js",
  "/assets/js/core/compat-stubs.js",
  "/assets/js/modules/actions-management.js",
  "/assets/js/modules/audit-governance.js",
  "/assets/js/modules/backup-recovery.js",
  "/assets/js/modules/agenda-tempo.js",
  "/assets/js/modules/operational-agenda-v22.js",
  "/assets/js/modules/hotel-performance-v23.js",
  "/assets/js/modules/operational-score-v28.js",
  "/assets/js/modules/operational-summary-pdf-v32_6.js",
  "/assets/js/modules/operations-domains-v33.js",
  "/assets/js/modules/hotel-360-v30.js",
  "/assets/js/modules/revenue-hub-v30.js",
  "/assets/js/modules/automatic-reports-v24.js",
  "/assets/js/modules/analytical-assistant-v25.js",
  "/assets/js/modules/document-management-v26.js",
  "/assets/js/modules/workflow-approvals-v27.js",
  "/assets/js/modules/analysis-tools.js",
  "/assets/js/modules/anomaly-detection.js",
  "/assets/js/modules/benchmarking.js",
  "/assets/js/modules/compras.js",
  "/assets/js/modules/cost-analysis.js",
  "/assets/js/modules/custo-atividade.js",
  "/assets/js/modules/unit-economics-v32.js",
  "/assets/js/modules/city-ledger-v32.js",
  "/assets/js/modules/data-center.js",
  "/assets/js/modules/ficha-hotel.js",
  "/assets/js/modules/forecast-scenarios.js",
  "/assets/js/modules/scenario-comparison-v29.js",
  "/assets/js/modules/hoteis.js",
  "/assets/js/modules/instagram.js",
  "/assets/js/modules/ocupacao.js",
  "/assets/js/modules/orcamento.js",
  "/assets/js/modules/pdf-export.js",
  "/assets/js/modules/pl-usali.js",
  "/assets/js/modules/receitas-detalhe.js",
  "/assets/js/modules/reputacao.js",
  "/assets/js/modules/revenue-intelligence.js",
  "/assets/js/modules/targets-rules.js",
  "/assets/js/modules/whatsapp.js",
  "/assets/js/ui/cdn-healthcheck.js",
  "/assets/js/ui/chart-actions.js",
  "/assets/js/ui/context-panel.js",
  "/assets/js/ui/forecast-state.js",
  "/assets/js/ui/global-search.js",
  "/assets/js/ui/notifications-v21.js",
  "/assets/js/ui/mobile-pwa.js",
  "/assets/js/ui/navigation-shell.js",
  "/assets/js/ui/operational-tools.js",
  "/assets/js/ui/operations-center.js",
  "/assets/js/ui/vg-operations-2-v30.js",
  "/assets/vendor/fflate.min.js",
  "/index.html",
  "/manifest.webmanifest"
];

self.addEventListener('install', event => {
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    // v31: correções de Portefólio, Ponte GOP e Revenue Hub; dados empresariais continuam network-only.
    const batchSize=8;
    for(let i=0;i<STATIC_ASSETS.length;i+=batchSize){
      const batch=STATIC_ASSETS.slice(i,i+batchSize);
      await Promise.allSettled(batch.map(url=>cache.add(new Request(url,{cache:'reload'})).catch(e=>{console.warn('[VG SW] precache falhou',url);throw e;})));
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('vg-operations-shell-') && k!==CACHE_NAME).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type==='SKIP_WAITING') self.skipWaiting();
});

function isSensitive(req,url) {
  if (req.method!=='GET') return true;
  if (url.pathname.startsWith('/.netlify/')) return true;
  if (url.pathname.startsWith('/netlify/functions/')) return true;
  return false;
}

self.addEventListener('fetch', event => {
  const req=event.request;
  const url=new URL(req.url);
  if (isSensitive(req,url)) return; // network-only: nunca cachear dados empresariais/API

  // Navegação: rede primeiro, shell apenas como fallback offline.
  if (req.mode==='navigate') {
    event.respondWith((async()=>{
      try {
        const fresh=await fetch(req);
        if (fresh && fresh.ok && url.origin===self.location.origin) {
          const cache=await caches.open(CACHE_NAME);
          await cache.put('/index.html', fresh.clone());
        }
        return fresh;
      } catch (e) {
        return (await caches.match('/index.html')) || (await caches.match('/'));
      }
    })());
    return;
  }

  // v30.3: recursos estáticos da própria aplicação são NETWORK-FIRST.
  // Isto impede misturas do tipo HTML novo + JavaScript antigo. O browser
  // continua a poder usar a sua cache HTTP e o Cache Storage fica como
  // fallback offline, nunca como fonte prioritária quando há rede.
  if (url.origin===self.location.origin) {
    event.respondWith((async()=>{
      try {
        const fresh=await fetch(req);
        if (fresh && fresh.ok) {
          const cache=await caches.open(CACHE_NAME);
          await cache.put(req, fresh.clone());
        }
        return fresh;
      } catch (e) {
        return (await caches.match(req,{ignoreSearch:true})) || Response.error();
      }
    })());
  }
  // Recursos CDN são network-only. A app abre offline, mas gráficos/Excel podem ficar indisponíveis.
});
