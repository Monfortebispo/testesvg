const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),pdf=fs.readFileSync(path.join(root,'assets/js/modules/operational-summary-pdf-v32_6.js'),'utf8'),full=fs.readFileSync(path.join(root,'assets/js/modules/pdf-export.js'),'utf8');
assert(html.includes('id="opsPdfAccumBtn"')&&html.includes('operationalSummaryPdfOpen()')&&html.includes('PDF acumulado'),'Resumo deve ter acesso visível ao PDF acumulado');
assert(html.includes('assets/js/modules/operational-summary-pdf-v32_6.js')&&html.includes('assets/css/operational-summary-pdf-v32_6.css'),'index deve carregar explicitamente o gerador e o CSS do PDF acumulado');
assert(pdf.includes("const VERSION='34.0'")&&pdf.includes('@page{size:A3 landscape')&&pdf.includes('Vila Galé Hotéis')&&pdf.includes('data:image/png;base64'),'PDF acumulado deve ser V34, A3 horizontal e conter logo incorporado');
assert(pdf.includes('desative Cabeçalhos e rodapés do navegador')&&pdf.includes('acumulado incompleto')&&pdf.includes('Não existem ficheiros P&amp;L'),'PDF deve orientar contra artefactos do browser e assinalar períodos incompletos');
assert(full.includes('pdf-footer')&&full.includes('desative “Cabeçalhos e rodapés”')&&full.includes('URL/about:blank'),'exportação completa deve orientar e substituir artefactos do browser por rodapé institucional');
console.log('✓ V34: geração do PDF operacional acumulado exposta e exportação institucional verificada');
