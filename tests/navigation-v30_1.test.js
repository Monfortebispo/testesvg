const assert=require('assert');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const {ROOT}=require('./helpers/browser-sandbox');
const ui=fs.readFileSync(path.join(ROOT,'assets/js/ui/vg-operations-2-v30.js'),'utf8');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,p))).digest('hex');

const preserve=ui.indexOf("const preservedButtons=Array.from(nav.querySelectorAll('.sb-nav-btn'))");
const move=ui.indexOf('preservedButtons.forEach(el=>nav.appendChild(el))');
const remove=ui.indexOf("nav.querySelectorAll('.sb-nav-group').forEach(g=>g.remove())");
assert(preserve>=0&&move>preserve&&remove>move,'V30.1 deve preservar/mover os botões antes de remover os grupos antigos');
assert(/nav\.dataset\.v30Version==='30\.[1-9][0-9]*'/.test(ui)&&/version:30\.[1-9][0-9]*/.test(ui),'A navegação consolidada deve manter versão igual ou superior à V30.1');
for(const id of ['nav-resumo','nav-fichahotel','nav-agenda','nav-approvals','nav-receitas','nav-custos','nav-pl','nav-compras','nav-benchmark','nav-anomalies','nav-documents','nav-automaticreports','nav-datacenter','nav-governance','nav-backup','nav-upload']){
  assert(html.includes(`id="${id}"`),`botão base ${id} deve existir no HTML para a reconstrução do menu`);
}
assert.strictEqual(sha('assets/js/modules/ficha-hotel.js'),'2779d6f5cbfcedb672f037494ee54847a16aec2247f5a0594346e3e6c4963dc7','V30.1 não pode alterar a Ficha do Hotel');
console.log('✓ V30.1: navegação preserva botões antes de reconstruir grupos; Ficha do Hotel intacta');
