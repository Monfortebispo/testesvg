const fs=require('fs');
const path=require('path');
function ok(cond,msg){if(!cond){console.error('FAIL:',msg);process.exit(1)}console.log('✓',msg)}
const root=path.join(__dirname,'..');
const ops=fs.readFileSync(path.join(root,'assets/js/ui/vg-operations-2-v30.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/css/uniformizacao-v32_2.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
ok(!/legacyHidden=\[[^\]]*'reputacao'/.test(ops),'Reputação já não é enviada para navegação legacy oculta');
ok(!/legacyHidden=\[[^\]]*'instagram'/.test(ops),'Instagram já não é enviado para navegação legacy oculta');
ok(ops.includes("group('Qualidade & Comunicação',['reputacao','instagram'])")||["group('Operação Integrada',['receitasdet','ab','housekeeping','reputacao'])","group('Qualidade & Comunicação',['instagram'])"].every(x=>ops.includes(x)),'Menu mantém Reputação/Instagram acessíveis e permite agrupamento integrado V33.1');
ok(html.includes('id="view-reputacao"') && html.includes('id="view-instagram"'),'As duas vistas continuam presentes no HTML');
ok(css.includes('body.theme-erp .vg-notif-trigger-label') && css.includes('body.theme-vilagale .vg-notif-trigger-label'),'Contraste de Notificações coberto nos dois temas claros');
ok(css.includes('body.theme-erp .vg-search-label') && css.includes('body.theme-vilagale .vg-search-label'),'Contraste de Pesquisa coberto nos dois temas claros');
ok(css.includes('#onlineCount') && css.includes('.v30-top-assistant span'),'Cabeçalho claro cobre online e Perguntar aos dados');
console.log('V32.4 UI navigation/contrast regression OK');
