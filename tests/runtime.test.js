const assert = require('assert');
const { createSandbox, load } = require('./helpers/browser-sandbox');

const s = createSandbox({ YR_PREV: '2026', YR_CUR: '2027' });
load('assets/js/core/00-runtime.js', s);

assert.strictEqual(s.window.VG.version, '13.0');
assert.strictEqual(s.window.VG.state.currentYear(), '2027');
assert.strictEqual(s.window.VG.state.previousYear(), '2026');
assert.strictEqual(s.window.VG.util.monthName(8), 'Agosto');
assert.strictEqual(s.window.VG.util.escapeHtml('<A&B>'), '&lt;A&amp;B&gt;');

const original = { a: 1, nested: { b: 2 } };
const clone = s.window.VG.util.clone(original);
clone.nested.b = 9;
assert.strictEqual(original.nested.b, 2);

let detail = null;
const off = s.window.VG.events.on('teste:evento', e => { detail = e.detail; });
s.window.VG.events.emit('teste:evento', { ok: true });
assert.deepStrictEqual(detail, { ok: true });
off();
detail = null;
s.window.VG.events.emit('teste:evento', { ok: false });
assert.strictEqual(detail, null);

let onceCount = 0;
s.window.VG.events.once('teste:once', () => onceCount++);
s.window.VG.events.emit('teste:once');
s.window.VG.events.emit('teste:once');
assert.strictEqual(onceCount, 1);

console.log('✓ runtime: eventos, anos e utilitários');
