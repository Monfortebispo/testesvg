const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const code=fs.readFileSync(path.join(__dirname,'../assets/js/modules/operations-domains-v33.js'),'utf8');
const ctx={console,Date,setTimeout,clearTimeout,RD_STORE:[{rows:[
 {hotel:'OPERA',artigo:'Mojito',grupo:'Cocktail',subfamilia:'Cocktails',qtd:10,vn:100,armazem:'BAR'},
 {hotel:'OPERA',artigo:'Mojito Special',grupo:'Cocktail',subfamilia:'Cocktails',qtd:3,vn:42,armazem:'BAR'}
]}],window:{},document:{readyState:'loading',addEventListener:()=>{}},localStorage:{getItem:()=>null,setItem:()=>{}},currentView:'resumo'};
ctx.window=ctx;ctx.vgAuthCurrent=()=>({role:'direcao',hotel:'*'});ctx.VG={market:{id:()=> 'iberia',isCurrentHotel:()=>true,formatMoney:(v)=>String(v)},events:{on:()=>{}},util:{escapeHtml:v=>String(v)}};
vm.createContext(ctx);vm.runInContext(code,ctx);
const api=ctx.VG.domains33;
api.state.seed={generatedAt:'x',technicalLibrary:{recipes:[{id:'mojito',market:'ptes',name:'Mojito',cost:2,ingredients:[{ingredient:'Rum',unit:'cl',qty:5,cost:1.2},{ingredient:'Lima',unit:'un',qty:0.5,cost:0.3}]}],products:[]},weeklyReputation:{reports:[]}};
let d=api.theoreticalData();
assert.strictEqual(d.matched.length,1,'match exato deve entrar');
assert.strictEqual(d.unmatched.length,1,'nome parecido não pode entrar por fuzzy');
assert.strictEqual(d.matched[0].cost,20,'custo teórico = vendas × custo ficha');
const rum=d.ingredients.find(x=>x.ingredient==='Rum');assert.strictEqual(rum.qty,50,'ingrediente = 10 vendas × 5 cl');
api.state.ab.recipeMap['MOJITO SPECIAL']='mojito';api.state.theoretical={cacheKey:'',data:null};
d=api.theoreticalData();assert.strictEqual(d.matched.length,2,'mapeamento manual validado deve passar a incluir artigo');assert.strictEqual(d.unmatched.length,0);assert(d.matched.some(x=>x.match==='Mapeamento validado'));
console.log('✓ V34 runtime: consumo teórico exato, ingrediente e mapeamento manual validados');
