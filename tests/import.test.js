const assert = require('assert');
const { createSandbox, load } = require('./helpers/browser-sandbox');

function makeRows(){
  const rows = Array.from({length: 120}, () => []);
  // Cabeçalho operacional com anos dinâmicos.
  rows[9] = ['Hoteis', 2026, 2027];
  rows[10] = ['OPERA', 3100, 3200, 2000, 2100, 0,0, 3500,3600, 400,420, 7000,7100, 500000,550000, 300000,330000, 150000,165000];
  rows[11] = ['Total Geral'];

  rows[52] = [null,'BEBIDAS'];
  rows[53] = ['OPERA', 10,11, 20,22, 30,33, 40,44, 50,55, 60,66, 70,77, 80,88, 0,0, 410,456];
  rows[54] = ['Total Geral'];

  rows[95] = [null,'ALOJAMENTO',null,'ALIMENTACAO',null,'DIVERSOS',null,'DRHP'];
  rows[96] = ['OPERA', 300000,330000, 150000,165000, 30000,33000, 20000,22000];
  rows[97] = ['Total Geral'];

  rows[100] = ['Outros indicadores'];
  rows[101] = ['Hoteis'];
  const oi = Array(22).fill(null);
  oi[0]='OPERA'; oi[3]=100; oi[4]=110; oi[5]=90; oi[6]=99; oi[15]=1000; oi[16]=1100; oi[20]=900; oi[21]=1000;
  rows[102] = oi;
  rows[103] = ['Total Geral'];
  return rows;
}

const s = createSandbox();
load('assets/js/core/01-data-import.js', s);

const noMonth = s.parseWorkbook({ Sheets: { 'MAPA RESUMO': { rows: makeRows() } } });
assert.strictEqual(noMonth.__needMonth, true, 'Sem mês explícito o parser deve pedir mês');

const data = s.parseWorkbook({ Sheets: { 'MAPA RESUMO': { rows: makeRows() } } }, 7);
assert.strictEqual(data.mes, 7);
assert.strictEqual(data.yr_prev, '2026');
assert.strictEqual(data.yr_cur, '2027');
assert.deepStrictEqual(Array.from(data.hotel_list), ['OPERA']);
assert.strictEqual(data.hotels_ops.OPERA.Disponiveis['2027'], 3200);
assert.strictEqual(data.hotels_ops.OPERA['Receita Total']['2027'], 550000);
assert.strictEqual(data.hotels_costs.OPERA.TOTAIS['2027'], 456);
assert.strictEqual(data.hotels_nop.OPERA['2026'], 50, 'NOP deve ser inferido por Total - custos operacionais quando coluna própria está vazia');
assert.strictEqual(data.hotels_nop.OPERA['2027'], 60);
assert.strictEqual(data.hotels_ops.OPERA.ADR['2027'], 110);
assert.strictEqual(data.hotels_ops.OPERA['ADR NET']['2027'], 99);
assert.strictEqual(data.hotels_ops.OPERA['GOP SEM SEDE']['2027'], 1100);
assert.strictEqual(data.hotels_ops.OPERA['GOP COM SEDE']['2027'], 1000);
assert.strictEqual(data.hotels_rev.OPERA.ALOJAMENTO['2027'], 330000);

console.log('✓ importação: mês explícito, anos dinâmicos, NOP e indicadores oficiais');
