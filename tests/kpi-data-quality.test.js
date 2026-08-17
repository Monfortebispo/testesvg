const assert = require('assert');
const { createSandbox, load } = require('./helpers/browser-sandbox');

const RAW = {
  hotel_list: ['H1','H2'],
  hotels_ops: {
    H1: {
      'Disponiveis': {'2025': 10, '2026': 10},
      'Ocupados': {'2025': 4, '2026': 5},
      'Receita Total': {'2025': 900, '2026': 1000},
      'Receita Alojamento': {'2025': 440, '2026': 600},
      'GOP COM SEDE': {'2025': 200, '2026': 250},
      'GOP SEM SEDE': {'2025': 230, '2026': 300},
      'ADR': {'2025': 110, '2026': 123},
      'ADR NET': {'2025': 100, '2026': 111}
    },
    H2: {
      'Disponiveis': {'2025': 20, '2026': 20},
      'Ocupados': {'2025': 8, '2026': 5},
      'Receita Total': {'2025': 800, '2026': 1000},
      'Receita Alojamento': {'2025': 400, '2026': 600}
    }
  },
  hotels_costs: {
    H1: {
      TOTAIS: {'2025': 650, '2026': 700}, COMIDAS: {'2026': 100}, BEBIDAS: {'2026': 50}, PESSOAL: {'2026': 400}
    },
    H2: {
      COMIDAS: {'2026': 100}, BEBIDAS: {'2026': 50}, PESSOAL: {'2026': 350}
    }
  },
  hotels_rev: {}
};
const STORE = {
  1: { hotels_ops: { H1: { 'Receita Alojamento': {'2026': 1000}, Ocupados: {'2026': 10} } } },
  2: { hotels_ops: { H1: { 'Receita Alojamento': {'2026': 600}, Ocupados: {'2026': 5} } } }
};
const s = createSandbox({ RAW, STORE, YR_PREV: '2025', YR_CUR: '2026' });
load('assets/js/core/00-runtime.js', s);
load('assets/js/core/02-navigation-kpis.js', s);
const k = s.window.VG.kpi;

assert.strictEqual(k.gop('H1','2026',RAW), 250, 'GOP oficial deve ter prioridade');
assert.strictEqual(k.gopPct('H1','2026',RAW), 25);
assert.strictEqual(k.gopSemSede('H1','2026',RAW), 300);
assert.strictEqual(k.totalCosts('H1','2026',RAW), 700, 'TOTAIS não pode ser somado novamente às rubricas');
assert.strictEqual(k.totalCosts('H2','2026',RAW), 500, 'Sem TOTAIS deve somar rubricas');
assert.strictEqual(k.gop('H2','2026',RAW), 500, 'Fallback GOP = Receita - Custos');
assert.strictEqual(k.gopSemSede('H2','2026',RAW), 500);
assert.strictEqual(k.occupancy('H1','2026',RAW), 50);
assert.strictEqual(k.adr('H1','2026',RAW), 123, 'ADR oficial deve ter prioridade');
assert.strictEqual(k.adr('H2','2026',RAW), 120, 'ADR fallback = Receita Alojamento / Ocupados');
assert.strictEqual(k.adrNet('H1','2026',RAW), 111);
assert.strictEqual(k.revpar('H1','2026',RAW), 60);
assert.strictEqual(k.trevpar('H1','2026',RAW), 100);
assert.strictEqual(k.costComidas('H1','2026',RAW), 100);
assert.strictEqual(k.costBebidas('H1','2026',RAW), 50);
assert(Math.abs(s.hsWeightedAdrField('H1','2026',2,'ADR') - (1600/15)) < 1e-9, 'ADR acumulado deve ser ponderado por quartos ocupados');

// Validador de qualidade: incoerências objetivas + lacuna mensal.
const bad = JSON.parse(JSON.stringify(RAW));
bad.hotel_list = ['H1'];
bad.hotels_ops.H1.Disponiveis['2026'] = 10;
bad.hotels_ops.H1.Ocupados['2026'] = 12;
bad.hotels_ops.H1['Receita Alojamento']['2026'] = 600;
bad.hotels_ops.H1.ADR['2026'] = 100; // 600/12=50 => divergência relevante
s.RAW = bad;
s.STORE = {1: {}, 3: {}};
load('assets/js/modules/analysis-tools.js', s);
const issues = s.window.vgValidateData(bad);
assert(issues.some(x => x.code === 'OCC_GT_AVAIL'));
assert(issues.some(x => x.code === 'OCC_GT_100'));
assert(issues.some(x => x.code === 'ADR_MISMATCH'));
assert(issues.some(x => x.code === 'MONTH_GAP'));

console.log('✓ kpi/qualidade: GOP, ADR, ocupação, custos e validações');
