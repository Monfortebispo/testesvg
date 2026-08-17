const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(n => n.endsWith('.test.js')).sort();
let passed = 0;
const started = Date.now();
const pkg = require('../package.json');
const major = String(pkg.version||'').split('.')[0] || '?';
console.log(`\nVG Dashboard v${major} — ${files.length} suites de regressão\n`);
for (const file of files) {
  process.stdout.write(`▶ ${file}\n`);
  const r = cp.spawnSync(process.execPath,[path.join(dir,file)],{stdio:'inherit',env:process.env});
  if (r.status !== 0) {
    console.error(`\n✗ Falhou: ${file}`);
    process.exit(r.status || 1);
  }
  passed++;
}
const sec = ((Date.now()-started)/1000).toFixed(2);
console.log(`\n✓ ${passed}/${files.length} suites passaram em ${sec}s. Deploy autorizado.\n`);
