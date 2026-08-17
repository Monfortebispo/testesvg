const assert=require('assert');
const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const {ROOT,createSandbox,load}=require('./helpers/browser-sandbox');
const rel='assets/js/modules/unit-economics-v32.js';
cp.execFileSync(process.execPath,['--check',path.join(ROOT,rel)],{stdio:'pipe'});
const RAW={
  hotel_list:['A','B'],
  hotels_ops:{
    A:{Disponiveis:{2025:900,2026:1000},Ocupados:{2025:450,2026:500},Dormidas:{2025:800,2026:900},Hospedes:{2025:600,2026:650},Chegadas:{2025:350,2026:400},'Receita Total':{2025:90000,2026:110000},'Receita Alojamento':{2025:60000,2026:75000},'Receita FB':{2025:20000,2026:25000},'GOP COM SEDE':{2025:18000,2026:25000}},
    B:{Disponiveis:{2025:1800,2026:2000},Ocupados:{2025:900,2026:1000},Dormidas:{2025:1600,2026:1800},Hospedes:{2025:1200,2026:1300},Chegadas:{2025:700,2026:800},'Receita Total':{2025:180000,2026:220000},'Receita Alojamento':{2025:120000,2026:150000},'Receita FB':{2025:40000,2026:50000},'GOP COM SEDE':{2025:36000,2026:50000}}
  },
  hotels_costs:{
    A:{TOTAIS:{2025:72000,2026:85000},PESSOAL:{2025:30000,2026:34000},ENERGIA:{2025:9000,2026:10000},MANUTENÇÃO:{2025:7000,2026:6500},COMIDAS:{2025:6000,2026:7000},BEBIDAS:{2025:3000,2026:3500},MARKETING:{2025:2000,2026:2400},OPERACIONAIS:{2025:9000,2026:10000},COMUNICAÇÕES:{2025:1000,2026:1100}},
    B:{TOTAIS:{2025:144000,2026:170000},PESSOAL:{2025:60000,2026:68000},ENERGIA:{2025:18000,2026:20000},MANUTENÇÃO:{2025:14000,2026:13000},COMIDAS:{2025:12000,2026:14000},BEBIDAS:{2025:6000,2026:7000},MARKETING:{2025:4000,2026:4800},OPERACIONAIS:{2025:18000,2026:20000},COMUNICAÇÕES:{2025:2000,2026:2200}}
  }
};
const s=createSandbox({RAW,getActiveHotels(){return ['A','B'];}});
s.document.readyState='loading';
s.window.VG.market={symbol:()=> '€',locale:()=> 'pt-PT',def:()=>({flag:'🇵🇹',label:'PT + ES'})};
s.window.VG.kpi={gop:(h,y)=>RAW.hotels_ops[h]['GOP COM SEDE'][y]};
load(rel,s);
const api=s.window.VG.unitEconomics;
assert(api&&api.version===32,'API Unit Economics V32 deve existir');
for(const k of ['available','occupied','nights','guests','arrivals'])assert(api.DENOMINATORS[k],`base ${k} deve existir`);
for(const k of ['energy','personnel','maintenance','totalCost','totalRevenue','roomRevenue','fbRevenue','gop'])assert(api.NUMERATORS[k],`métrica ${k} deve existir`);
assert.strictEqual(api.unitValue('A','energy','available','2026'),10,'energia/QD');
assert.strictEqual(api.unitValue('A','energy','occupied','2026'),20,'energia/QO');
assert(Math.abs(api.unitValue('A','energy','nights','2026')-(10000/900))<1e-9,'energia/dormida');
assert(Math.abs(api.unitValue('A','energy','guests','2026')-(10000/650))<1e-9,'energia/cliente');
assert.strictEqual(api.unitValue('A','energy','arrivals','2026'),25,'energia/chegada');
assert.strictEqual(api.unitValue('A','totalRevenue','occupied','2026'),220,'receita/QO');
assert.strictEqual(api.unitValue('A','gop','occupied','2026'),50,'GOP/QO');
assert.strictEqual(api.aggregate(['A','B'],'energy','occupied','2026'),20,'portefólio deve ponderar por atividade, não fazer média simples');
assert.strictEqual(api.semanticClass('energy',-5),'good','queda de custo unitário é positiva');
assert.strictEqual(api.semanticClass('energy',5),'bad','subida de custo unitário é negativa');
assert.strictEqual(api.semanticClass('totalRevenue',5),'good','subida de receita unitária é positiva');
assert.strictEqual(api.semanticClass('gop',-5),'bad','queda de GOP unitário é negativa');
console.log('✓ V32 Unit Economics: custos/receitas/GOP por QD, QO, dormida, cliente e chegada, com energia em todas as bases');
