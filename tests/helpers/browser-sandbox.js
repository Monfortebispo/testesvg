const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');

class SimpleEventTarget {
  constructor(){ this.listeners = new Map(); }
  addEventListener(name, handler, options){
    if (!this.listeners.has(name)) this.listeners.set(name, []);
    this.listeners.get(name).push({ handler, once: !!(options && options.once) });
  }
  removeEventListener(name, handler){
    const rows = this.listeners.get(name) || [];
    this.listeners.set(name, rows.filter(x => x.handler !== handler));
  }
  dispatchEvent(evt){
    const rows = (this.listeners.get(evt.type) || []).slice();
    rows.forEach(row => row.handler(evt));
    this.listeners.set(evt.type, (this.listeners.get(evt.type) || []).filter(row => !row.once));
    return true;
  }
}
class SimpleCustomEvent {
  constructor(type, options){ this.type = type; this.detail = (options || {}).detail; }
}

function classList(){ return { add(){}, remove(){}, toggle(){}, contains(){ return false; } }; }
function element(){
  return {
    classList: classList(), style: {}, dataset: {}, innerHTML: '', textContent: '', value: '', checked: false,
    appendChild(){}, remove(){}, click(){}, focus(){}, addEventListener(){}, removeEventListener(){},
    querySelector(){ return null; }, querySelectorAll(){ return []; }, closest(){ return null; },
    getContext(){ return {}; }, setAttribute(){}, getAttribute(){ return null; }
  };
}
function createDocument(){
  return {
    body: element(),
    documentElement: element(),
    getElementById(){ return element(); },
    querySelector(){ return null; },
    querySelectorAll(){ return []; },
    createElement(){ return element(); },
    createTextNode(v){ return { nodeValue: String(v) }; },
    createTreeWalker(){ return { nextNode(){ return null; } }; },
    addEventListener(){},
    removeEventListener(){}
  };
}

function createSandbox(extra = {}){
  const document = createDocument();
  const window = new SimpleEventTarget();
  Object.assign(window, {
    VG: {}, document, innerWidth: 1280, innerHeight: 800,
    location: { hash: '', href: 'https://example.test/' },
    navigator: { userAgent: 'node-test' },
    requestAnimationFrame(fn){ return fn(); },
    cancelAnimationFrame(){},
    addEventListener: SimpleEventTarget.prototype.addEventListener.bind(window),
    removeEventListener: SimpleEventTarget.prototype.removeEventListener.bind(window),
    dispatchEvent: SimpleEventTarget.prototype.dispatchEvent.bind(window)
  });

  const sandbox = {
    window, document,
    EventTarget: SimpleEventTarget, CustomEvent: SimpleCustomEvent,
    NodeFilter: { SHOW_TEXT: 4 },
    history: { replaceState(){} },
    location: window.location,
    navigator: window.navigator,
    console,
    Intl, Date, Math, Number, String, Boolean, Object, Array, Set, Map, WeakMap, RegExp, JSON, Promise,
    Error, TypeError, RangeError, isNaN, isFinite, parseInt, parseFloat,
    setTimeout, clearTimeout, setInterval, clearInterval,
    requestAnimationFrame: window.requestAnimationFrame,
    cancelAnimationFrame: window.cancelAnimationFrame,
    Blob: global.Blob,
    AbortController: global.AbortController,
    URL: global.URL,
    URLSearchParams: global.URLSearchParams,
    fetch: async () => { throw new Error('fetch não deve ser chamado neste teste'); },
    sessionStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
    localStorage: { getItem(){ return null; }, setItem(){}, removeItem(){}, key(){ return null; }, length: 0 },
    selectedHotels: new Set(), selectedMeses: new Set(), REGIOES: {}, charts: {},
    RAW: { hotel_list: [], hotels_ops: {}, hotels_costs: {}, hotels_rev: {} }, STORE: {}, STORE_ACUM: {},
    YR_PREV: '2025', YR_CUR: '2026', currentYear: 'both', currentView: 'resumo',
    showToast(){}, syncRegionFromPills(){}, refreshAll(){}, rebuildYearButtons(){}, updateContextPanel(){},
    aiRenderGlobalInsights(){}, getActiveHotels(){ return []; },
    Chart: function(){}, XLSX: { utils: { sheet_to_json(ws){ return ws.rows || []; } } }
  };
  Object.assign(sandbox, extra);
  Object.assign(window, extra.window || {});
  window.window = window;
  window.document = document;
  window.sessionStorage = sandbox.sessionStorage;
  window.localStorage = sandbox.localStorage;
  window.SHARED_API_URL = '/.netlify/functions/dashboard-sessao';
  vm.createContext(sandbox);
  return sandbox;
}

function load(relPath, sandbox){
  const file = path.join(ROOT, relPath);
  const code = fs.readFileSync(file, 'utf8');
  vm.runInContext(code, sandbox, { filename: relPath });
  return sandbox;
}

module.exports = { ROOT, createSandbox, load };
