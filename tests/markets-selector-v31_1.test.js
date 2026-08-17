const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const {ROOT}=require('./helpers/browser-sandbox');
const code=fs.readFileSync(path.join(ROOT,'assets/js/core/07-markets-v31.js'),'utf8');
const css=fs.readFileSync(path.join(ROOT,'assets/css/markets-v31.css'),'utf8');

// Regressão do bug V31: theme-dots é descendente de topbar-right,
// não filho direto de topbar. insertBefore no pai errado lançava NotFoundError.
assert(code.includes("const host=topbar.querySelector('.topbar-right')||topbar"),'V31.1 deve montar o seletor dentro de .topbar-right');
assert(code.includes("anchor&&anchor.parentNode===host"),'V31.1 deve validar que a âncora pertence ao host antes de insertBefore');
assert(!code.includes("host=document.querySelector('.topbar');if(!host)return"),'não deve regressar ao host incorreto da V31');
assert(css.includes('.vg-market-label')&&css.includes('@media(max-width:820px)'),'seletor deve ter adaptação mobile compacta');

// DOM mínimo que reproduz a hierarquia real da topbar.
function node(name){
  return {
    name,parentNode:null,children:[],id:'',className:'',style:{},dataset:{},innerHTML:'',
    appendChild(x){x.parentNode=this;this.children.push(x);return x;},
    insertBefore(x,a){assert.strictEqual(a.parentNode,this,'insertBefore só pode usar filho direto');x.parentNode=this;const i=this.children.indexOf(a);this.children.splice(i<0?this.children.length:i,0,x);return x;},
    querySelector(sel){if(sel==='.topbar-right')return this.right||null;if(sel==='.theme-dots')return this.theme||null;return null;},
    querySelectorAll(){return [];},addEventListener(){},classList:{toggle(){}}
  };
}
const topbar=node('topbar'),right=node('topbar-right'),theme=node('theme-dots');
topbar.right=right;right.theme=theme;topbar.appendChild(right);right.appendChild(theme);
let marketSwitch=null;
const document={
  readyState:'loading',documentElement:{dataset:{}},
  getElementById(id){return id==='vgMarketSwitch'?marketSwitch:null;},
  querySelector(sel){return sel==='.topbar'?topbar:null;},
  querySelectorAll(){return [];},
  createElement(){marketSwitch=node('market-switch');return marketSwitch;},
  addEventListener(){}
};
const sandbox={window:{VG:{},document},document,console,Intl,Date,Math,Number,String,Boolean,Object,Array,Set,Map,RegExp,JSON,Promise,Error,isNaN,isFinite,localStorage:{getItem(){return null},setItem(){}},setTimeout,clearTimeout,URL,URLSearchParams};
sandbox.window.window=sandbox.window;sandbox.window.localStorage=sandbox.localStorage;vm.createContext(sandbox);vm.runInContext(code,sandbox);
assert(sandbox.window.VG.market?.ensureSelector,'API de diagnóstico deve expor ensureSelector');
sandbox.window.VG.market.ensureSelector();
assert.strictEqual(marketSwitch.parentNode,right,'seletor deve ser filho de .topbar-right');
assert.strictEqual(right.children[0],marketSwitch,'seletor deve surgir antes dos temas');
assert.strictEqual(right.children[1],theme,'temas devem permanecer depois do seletor');
console.log('✓ V31.1: seletor de mercado visível, montado no pai correto e adaptado a mobile');
