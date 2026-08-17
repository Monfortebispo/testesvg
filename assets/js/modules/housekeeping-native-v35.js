// VG Operations V35 — Housekeeping & Têxtil nativo (reconstruído a partir da ferramenta original)
(function(){
'use strict';
window.VG=window.VG||{};
if(window.VG.housekeepingNative35?.version>=35.0)return;
async function ensureXLSX35(){
  if(window.XLSX?.utils) return window.XLSX;
  if(window.VG?.performance?.ensureXLSX){
    await window.VG.performance.ensureXLSX();
    if(window.XLSX?.utils) return window.XLSX;
  }
  throw new Error('Biblioteca SheetJS não carregou.');
}
const HK35_TEMPLATE="<div id=\"app\" class=\"hk35-shell\">\n  <div class=\"hk35-top\">\n    <div class=\"hk35-title\"><b>Housekeeping &amp; Têxtil</b><span>Inventário de roupas · módulo nativo VG Operations</span></div>\n    <div class=\"hk35-session\"><span id=\"fUser\">—</span><span id=\"fRole\">—</span></div>\n    <div class=\"presence\" id=\"presence\" title=\"Ninguém online\"><span class=\"dot\"></span>—</div>\n  </div>\n  <nav class=\"hk35-nav nav\" id=\"nav\"></nav>\n  <div class=\"main\">\n    <div class=\"head\"><div><h1 id=\"vTitle\">Painel</h1><div class=\"crumb\" id=\"vCrumb\"></div></div><div class=\"sp\"></div><div id=\"headActions\"></div></div>\n    <div class=\"content\" id=\"content\"></div>\n  </div>\n</div>\n<div id=\"modalRoot\"></div><div id=\"toast\" class=\"toast\"></div><div id=\"govMode\" class=\"hidden\"></div>";
let HK35_HOST=null,HK35_SHADOW=null,HK35_INIT=null,HK35_MARKET=null,HK35_BACKSTOPS=false;
function hk35DashUser(){try{return window.vgAuthCurrent?.()||null}catch(e){return null}}
function hk35Norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/^VILA GALE\s+/,'').replace(/^VG\s+/,'').replace(/\s+/g,' ').trim();}
function hk35CurrentMarket(){try{return window.VG?.market?.id?.()||'iberia'}catch(e){return'iberia'}}
function hk35MarketAllowsHotelObj(h){try{return !window.VG?.market?.isCurrentHotel||window.VG.market.isCurrentHotel(h?.nome||'')}catch(e){return true}}
function hk35Role(u){const r=String(u?.role||'').toLowerCase();if(['admin','direcao'].includes(r))return'DO';if(r==='compras')return'Compras';if(r==='governanta')return'Governanta';if(r==='diretor')return'Diretor';return'Assistente';}

/* ============================================================
   VG · Inventário de Roupas de Housekeeping
   Ficheiro único · Netlify Blobs (Functions) com fallback local
   ============================================================ */

/* ---------- Seed data (hotéis + catálogo, do exemplo Évora) ---------- */
const SEED_HOTEIS = [{"id": "44", "nome": "VG Alagoas", "cidade": "Barra de Santo Antônio", "pais": "Brasil", "regiao": "Brasil Nordeste"}, {"id": "27", "nome": "VG Cabo", "cidade": "Cabo de Santo Agostinho", "pais": "Brasil", "regiao": "Brasil Nordeste"}, {"id": "58", "nome": "VG Collection Poesia São Luís", "cidade": "São Luís", "pais": "Brasil", "regiao": "Brasil Nordeste"}, {"id": "54", "nome": "VG Collection Sunset Cumbuco", "cidade": "Caucaia", "pais": "Brasil", "regiao": "Brasil Nordeste"}, {"id": "57", "nome": "VG Collection Ópera São Luís", "cidade": "São Luís", "pais": "Brasil", "regiao": "Brasil Nordeste"}, {"id": "26", "nome": "VG Cumbuco", "cidade": "Caucaia", "pais": "Brasil", "regiao": "Brasil Nordeste"}, {"id": "15", "nome": "VG Fortaleza", "cidade": "Fortaleza", "pais": "Brasil", "regiao": "Brasil Nordeste"}, {"id": "19", "nome": "VG Mares", "cidade": "Camaçari", "pais": "Brasil", "regiao": "Brasil Nordeste"}, {"id": "16", "nome": "VG Salvador", "cidade": "Salvador", "pais": "Brasil", "regiao": "Brasil Nordeste"}, {"id": "32", "nome": "VG Touros", "cidade": "Touros", "pais": "Brasil", "regiao": "Brasil Nordeste"}, {"id": "55", "nome": "VG Collection Amazônia", "cidade": "Belém", "pais": "Brasil", "regiao": "Brasil Norte"}, {"id": "53", "nome": "VG Collection Ouro Preto", "cidade": "Ouro Preto", "pais": "Brasil", "regiao": "Brasil Sudeste"}, {"id": "28", "nome": "VG Eco Resort De Angra", "cidade": "Angra dos Reis", "pais": "Brasil", "regiao": "Brasil Sudeste"}, {"id": "42", "nome": "VG Paulista", "cidade": "São Paulo", "pais": "Brasil", "regiao": "Brasil Sudeste"}, {"id": "30", "nome": "VG Rio De Janeiro", "cidade": "Rio de Janeiro", "pais": "Brasil", "regiao": "Brasil Sudeste"}, {"id": "51", "nome": "VG Isla Canela", "cidade": "Ayamonte", "pais": "Espanha", "regiao": "Espanha"}, {"id": "14", "nome": "VG Alentejo Vineyards", "cidade": "Beja", "pais": "Portugal", "regiao": "Alentejo"}, {"id": "45", "nome": "VG Casas De Elvas", "cidade": "Elvas", "pais": "Portugal", "regiao": "Alentejo"}, {"id": "41", "nome": "VG Collection Alter Real", "cidade": "Alter do Chão", "pais": "Portugal", "regiao": "Alentejo"}, {"id": "37", "nome": "VG Collection Elvas", "cidade": "Elvas", "pais": "Portugal", "regiao": "Alentejo"}, {"id": "49", "nome": "VG Collection Monte Do Vilar", "cidade": "Beja", "pais": "Portugal", "regiao": "Alentejo"}, {"id": "22", "nome": "VG Evora", "cidade": "Évora", "pais": "Portugal", "regiao": "Alentejo"}, {"id": "48", "nome": "VG Nep Kids", "cidade": "Beja", "pais": "Portugal", "regiao": "Alentejo"}, {"id": "4", "nome": "VG Albacora", "cidade": "Tavira", "pais": "Portugal", "regiao": "Algarve"}, {"id": "1", "nome": "VG Ampalius", "cidade": "Vilamoura", "pais": "Portugal", "regiao": "Algarve"}, {"id": "6", "nome": "VG Atlantico", "cidade": "Albufeira", "pais": "Portugal", "regiao": "Algarve"}, {"id": "5", "nome": "VG Cerro Alagoa", "cidade": "Albufeira", "pais": "Portugal", "regiao": "Algarve"}, {"id": "7", "nome": "VG Collection Praia", "cidade": "Albufeira", "pais": "Portugal", "regiao": "Algarve"}, {"id": "21", "nome": "VG Lagos", "cidade": "Lagos", "pais": "Portugal", "regiao": "Algarve"}, {"id": "2", "nome": "VG Marina", "cidade": "Vilamoura", "pais": "Portugal", "regiao": "Algarve"}, {"id": "8", "nome": "VG Nautico", "cidade": "Armação de Pêra", "pais": "Portugal", "regiao": "Algarve"}, {"id": "3", "nome": "VG Tavira", "cidade": "Tavira", "pais": "Portugal", "regiao": "Algarve"}, {"id": "23", "nome": "VG Coimbra", "cidade": "Coimbra", "pais": "Portugal", "regiao": "Centro"}, {"id": "52", "nome": "VG Collection Figueira Da Foz", "cidade": "Figueira da Foz", "pais": "Portugal", "regiao": "Centro"}, {"id": "35", "nome": "VG Collection Serra Da Estrela", "cidade": "Manteigas", "pais": "Portugal", "regiao": "Centro"}, {"id": "43", "nome": "VG Collection Tomar", "cidade": "Tomar", "pais": "Portugal", "regiao": "Centro"}, {"id": "11", "nome": "VG Cascais", "cidade": "Cascais", "pais": "Portugal", "regiao": "Lisboa & Ilhas"}, {"id": "29", "nome": "VG Collection Palacio Dos Arcos", "cidade": "Lisboa", "pais": "Portugal", "regiao": "Lisboa & Ilhas"}, {"id": "46", "nome": "VG Collection S. Miguel", "cidade": "Ponta Delgada", "pais": "Portugal", "regiao": "Lisboa & Ilhas"}, {"id": "24", "nome": "VG Collection Sintra", "cidade": "Sintra", "pais": "Portugal", "regiao": "Lisboa & Ilhas"}, {"id": "10", "nome": "VG Ericeira", "cidade": "Ericeira", "pais": "Portugal", "regiao": "Lisboa & Ilhas"}, {"id": "12", "nome": "VG Estoril", "cidade": "Estoril", "pais": "Portugal", "regiao": "Lisboa & Ilhas"}, {"id": "13", "nome": "VG Opera", "cidade": "Lisboa", "pais": "Portugal", "regiao": "Lisboa & Ilhas"}, {"id": "20", "nome": "VG Santa Cruz", "cidade": "Santa Cruz", "pais": "Portugal", "regiao": "Lisboa & Ilhas"}, {"id": "34", "nome": "VG Collection Braga", "cidade": "Braga", "pais": "Portugal", "regiao": "Norte"}, {"id": "31", "nome": "VG Collection Douro", "cidade": "Lamego", "pais": "Portugal", "regiao": "Norte"}, {"id": "47", "nome": "VG Collection Ponte De Lima Vineyards", "cidade": "Ponte de Lima", "pais": "Portugal", "regiao": "Norte"}, {"id": "38", "nome": "VG Douro Vineyards", "cidade": "Armamar", "pais": "Portugal", "regiao": "Norte"}, {"id": "9", "nome": "VG Porto", "cidade": "Porto", "pais": "Portugal", "regiao": "Norte"}, {"id": "36", "nome": "VG Porto Ribeira", "cidade": "Porto", "pais": "Portugal", "regiao": "Norte"}];
const SEED_CATALOGO = {"camas": ["80 x 200", "90 x 200", "95 x 200", "100 x 200", "120 x 200", "140 x 200", "150 x 200", "160 x 200", "180 x 200", "190 x 200", "200 x 200", "220 x 200", "240 x 200"], "categorias": [{"nome": "Edredão", "indice": 1.1, "porCama": true, "linhas": [{"cama": "80 x 200", "medida": "180 x 220"}, {"cama": "90 x 200", "medida": "180 x 220"}, {"cama": "95 x 200", "medida": "180 x 220"}, {"cama": "100 x 200", "medida": "180 x 220"}, {"cama": "120 x 200", "medida": "230 x 220"}, {"cama": "140 x 200", "medida": "230 x 220"}, {"cama": "150 x 200", "medida": "250 x 220"}, {"cama": "160 x 200", "medida": "250 x 220"}, {"cama": "180 x 200", "medida": "280 x 220"}, {"cama": "190 x 200", "medida": "280 x 220"}, {"cama": "200 x 200", "medida": "280 x 220"}, {"cama": "220 x 200", "medida": "300 x 220"}, {"cama": "240 x 200", "medida": "320 x 220"}]}, {"nome": "Saco de Edredão", "indice": 3, "porCama": true, "linhas": [{"cama": "80 x 200", "medida": "190 x 240"}, {"cama": "90 x 200", "medida": "190 x 240"}, {"cama": "95 x 200", "medida": "190 x 240"}, {"cama": "100 x 200", "medida": "200 x 240"}, {"cama": "120 x 200", "medida": "250 x 240"}, {"cama": "140 x 200", "medida": "250 x 240"}, {"cama": "150 x 200", "medida": "270 x 240"}, {"cama": "160 x 200", "medida": "270 x 240"}, {"cama": "180 x 200", "medida": "300 x 240"}, {"cama": "190 x 200", "medida": "300 x 240"}, {"cama": "200 x 200", "medida": "300 x 240"}, {"cama": "220 x 200", "medida": "320 x 240"}, {"cama": "240 x 200", "medida": "340 x 240"}]}, {"nome": "Lençol (C/ Colcha)", "indice": 3, "porCama": true, "linhas": [{"cama": "80 x 200", "medida": "180 x 300"}, {"cama": "90 x 200", "medida": "180 x 300"}, {"cama": "95 x 200", "medida": "180 x 300"}, {"cama": "100 x 200", "medida": "200 x 300"}, {"cama": "120 x 200", "medida": "240 x 300"}, {"cama": "140 x 200", "medida": "240 x 300"}, {"cama": "150 x 200", "medida": "280 x 300"}, {"cama": "160 x 200", "medida": "280 x 300"}, {"cama": "180 x 200", "medida": "280 x 300"}, {"cama": "190 x 200", "medida": "280 x 300"}, {"cama": "200 x 200", "medida": "320 x 300"}, {"cama": "220 x 200", "medida": "340 x 310"}, {"cama": "240 x 200", "medida": "360 x 300"}]}, {"nome": "Lençol (C/ Edredão)", "indice": 3, "porCama": true, "linhas": [{"cama": "80 x 200", "medida": "180 x 300"}, {"cama": "90 x 200", "medida": "180 x 300"}, {"cama": "95 x 200", "medida": "180 x 300"}, {"cama": "100 x 200", "medida": "200 x 300"}, {"cama": "120 x 200", "medida": "240 x 300"}, {"cama": "140 x 200", "medida": "240 x 300"}, {"cama": "150 x 200", "medida": "280 x 300"}, {"cama": "160 x 200", "medida": "280 x 300"}, {"cama": "180 x 200", "medida": "280 x 300"}, {"cama": "190 x 200", "medida": "280 x 300"}, {"cama": "200 x 200", "medida": "320 x 300"}, {"cama": "220 x 200", "medida": "340 x 310"}, {"cama": "240 x 200", "medida": "360 x 300"}]}, {"nome": "Lençois de Bebe", "indice": 1, "porCama": false, "linhas": [{"cama": "", "medida": "80 x 140"}]}, {"nome": "Colcha de Favo", "indice": 1.5, "porCama": true, "linhas": [{"cama": "80 x 200", "medida": "180 x 260"}, {"cama": "90 x 200", "medida": "180 x 260"}, {"cama": "95 x 200", "medida": "180 x 260"}, {"cama": "100 x 200", "medida": "180 x 260"}, {"cama": "120 x 200", "medida": "240 x 260"}, {"cama": "140 x 200", "medida": "240 x 260"}, {"cama": "150 x 200", "medida": "240 x 260"}, {"cama": "160 x 200", "medida": "240 x 260"}, {"cama": "180 x 200", "medida": "270 x 260"}, {"cama": "190 x 200", "medida": "270 x 260"}, {"cama": "200 x 200", "medida": "270 x 260"}, {"cama": "220 x 200", "medida": "290 x 260"}, {"cama": "240 x 200", "medida": ""}]}, {"nome": "Cobertores", "indice": 1.5, "porCama": true, "linhas": [{"cama": "80 x 200", "medida": "160 x 260"}, {"cama": "90 x 200", "medida": "160 x 260"}, {"cama": "95 x 200", "medida": "160 x 260"}, {"cama": "100 x 200", "medida": "180 x 260"}, {"cama": "120 x 200", "medida": "180 x 260"}, {"cama": "140 x 200", "medida": "230 x 260"}, {"cama": "150 x 200", "medida": "230 x 260"}, {"cama": "160 x 200", "medida": "230 x 260"}, {"cama": "180 x 200", "medida": "260 x 260"}, {"cama": "190 x 200", "medida": "260 x 260"}, {"cama": "200 x 200", "medida": "260 x 260"}, {"cama": "220 x 200", "medida": "280 x 260"}, {"cama": "240 x 200", "medida": "290 x 260"}]}, {"nome": "Resguardos", "indice": 1.5, "porCama": true, "linhas": [{"cama": "80 x 200", "medida": "105 x 202"}, {"cama": "90 x 200", "medida": "115 x 202"}, {"cama": "95 x 200", "medida": "110 x 202"}, {"cama": "100 x 200", "medida": "115 x 202"}, {"cama": "120 x 200", "medida": "145 x 202"}, {"cama": "140 x 200", "medida": "155 x 202"}, {"cama": "150 x 200", "medida": "165 x 202"}, {"cama": "160 x 200", "medida": "175 x 202"}, {"cama": "180 x 200", "medida": "195 x 202"}, {"cama": "190 x 200", "medida": "205 x 202"}, {"cama": "200 x 200", "medida": "220 x 202"}, {"cama": "220 x 200", "medida": "240 x 202"}, {"cama": "240 x 200", "medida": "260 x 202"}]}, {"nome": "Toppers Casal", "indice": 1, "porCama": false, "linhas": [{"cama": "", "medida": ""}]}, {"nome": "Toppers Solteiro", "indice": 1, "porCama": false, "linhas": [{"cama": "", "medida": ""}]}, {"nome": "Almofadas", "indice": 1.1, "porCama": false, "linhas": [{"cama": "", "medida": "40 x 60 (600 gr)"}, {"cama": "", "medida": "50 x 70 (900 gr)"}, {"cama": "", "medida": "60 x 80 (1200 gr)"}, {"cama": "", "medida": "40 x 60 (p/ Fronha NEP)"}]}, {"nome": "Fronhas", "indice": 3, "porCama": false, "linhas": [{"cama": "", "medida": "45x65"}, {"cama": "", "medida": "55x75"}, {"cama": "", "medida": "65x90"}, {"cama": "", "medida": "45x65 NEP"}]}, {"nome": "Turco Tapete", "indice": 3, "porCama": false, "linhas": [{"cama": "", "medida": "40 x 60"}]}, {"nome": "Turco Banho", "indice": 3, "porCama": false, "linhas": [{"cama": "", "medida": "90 x 140"}]}, {"nome": "Turco Bidé", "indice": 3, "porCama": false, "linhas": [{"cama": "", "medida": "30 x 50"}]}, {"nome": "Turco Rosto", "indice": 3, "porCama": false, "linhas": [{"cama": "", "medida": "45 x 90"}]}, {"nome": "Turco Piscina", "indice": 1, "porCama": false, "linhas": [{"cama": "", "medida": "78 x 150"}]}, {"nome": "Turco Tapete Collection", "indice": 3, "porCama": false, "linhas": [{"cama": "", "medida": "50x70"}]}, {"nome": "Turco Banho Collection", "indice": 3, "porCama": false, "linhas": [{"cama": "", "medida": "100 x 160"}]}, {"nome": "Turco Bidé Collection", "indice": 3, "porCama": false, "linhas": [{"cama": "", "medida": "30x50"}]}, {"nome": "Turco Rosto Collection", "indice": 3, "porCama": false, "linhas": [{"cama": "", "medida": "50x100"}]}, {"nome": "Turco Piscina Collection", "indice": 1, "porCama": false, "linhas": [{"cama": "", "medida": ""}]}, {"nome": "Mantilha", "indice": 1.1, "porCama": false, "linhas": [{"cama": "", "medida": ""}]}, {"nome": "Roupão VG Turco", "indice": 1, "porCama": false, "linhas": [{"cama": "", "medida": "S"}, {"cama": "", "medida": "M"}, {"cama": "", "medida": "L"}, {"cama": "", "medida": "XL"}, {"cama": "", "medida": "XXL"}]}, {"nome": "Roupão VG Favo", "indice": 1, "porCama": false, "linhas": [{"cama": "", "medida": "S"}, {"cama": "", "medida": "M"}, {"cama": "", "medida": "L"}]}]};
/* Vestido 100% (H.COMPLETO) real por hotel, importado do ficheiro Inventário Anterior.
   Chave: "Categoria|Cama|Medida" (originais do catálogo). Valor: peças a 100%. */
const SEED_VESTIDO = {"4": {"Edredão|90 x 200|180 x 220": 86, "Edredão|150 x 200|250 x 220": 71, "Saco de Edredão|90 x 200|190 x 240": 86, "Saco de Edredão|150 x 200|270 x 240": 71, "Lençol (C/ Colcha)|90 x 200|180 x 300": 394, "Lençol (C/ Edredão)|90 x 200|180 x 300": 86, "Lençol (C/ Edredão)|150 x 200|280 x 300": 71, "Lençois de Bebe||80 x 140": 18, "Colcha de Favo|90 x 200|180 x 260": 197, "Cobertores|90 x 200|160 x 260": 330, "Resguardos|90 x 200|115 x 202": 283, "Resguardos|150 x 200|165 x 202": 72, "Almofadas||40 x 60 (600 gr)": 432, "Almofadas||60 x 80 (1200 gr)": 330, "Fronhas||45x65": 432, "Fronhas||65x90": 330, "Turco Tapete||40 x 60": 163, "Turco Banho||90 x 140": 428, "Turco Bidé||30 x 50": 326, "Turco Rosto||45 x 90": 428, "Turco Piscina||78 x 150": 163}, "6": {"Lençol (C/ Colcha)|90 x 200|180 x 300": 1524, "Lençois de Bebe||80 x 140": 44, "Colcha de Favo|90 x 200|180 x 260": 493, "Cobertores|90 x 200|160 x 260": 456, "Resguardos|90 x 200|115 x 202": 456, "Almofadas||40 x 60 (600 gr)": 762, "Almofadas||60 x 80 (1200 gr)": 456, "Fronhas||45x65": 762, "Fronhas||65x90": 456, "Turco Tapete||40 x 60": 228, "Turco Banho||90 x 140": 762, "Turco Bidé||30 x 50": 456, "Turco Rosto||45 x 90": 762, "Turco Piscina||78 x 150": 456, "Mantilha||": 228}, "1": {"Edredão|90 x 200|180 x 220": 368, "Edredão|100 x 200|180 x 220": 144, "Edredão|140 x 200|230 x 220": 78, "Edredão|160 x 200|250 x 220": 30, "Edredão|180 x 200|280 x 220": 59, "Edredão|200 x 200|280 x 220": 18, "Saco de Edredão|100 x 200|200 x 240": 512, "Saco de Edredão|140 x 200|250 x 240": 78, "Saco de Edredão|160 x 200|270 x 240": 30, "Saco de Edredão|200 x 200|300 x 240": 77, "Lençol (C/ Colcha)|90 x 200|180 x 300": 384, "Lençol (C/ Colcha)|100 x 200|200 x 300": 512, "Lençol (C/ Colcha)|140 x 200|240 x 300": 78, "Lençol (C/ Colcha)|160 x 200|280 x 300": 30, "Lençol (C/ Colcha)|200 x 200|320 x 300": 77, "Lençois de Bebe||80 x 140": 19, "Colcha de Favo|80 x 200|180 x 260": 192, "Cobertores|90 x 200|160 x 260": 256, "Cobertores|190 x 200|260 x 260": 131, "Resguardos|80 x 200|105 x 202": 192, "Resguardos|90 x 200|115 x 202": 368, "Resguardos|100 x 200|115 x 202": 144, "Resguardos|140 x 200|155 x 202": 78, "Resguardos|160 x 200|175 x 202": 30, "Resguardos|180 x 200|195 x 202": 59, "Resguardos|200 x 200|220 x 202": 18, "Almofadas||40 x 60 (600 gr)": 1180, "Almofadas||50 x 70 (900 gr)": 156, "Almofadas||60 x 80 (1200 gr)": 726, "Fronhas||45x65": 1180, "Fronhas||55x75": 156, "Fronhas||65x90": 726, "Fronhas||45x65 NEP": 19, "Turco Tapete||40 x 60": 417, "Turco Banho||90 x 140": 1026, "Turco Bidé||30 x 50": 764, "Turco Rosto||45 x 90": 1026, "Mantilha||": 261}, "41": {"Edredão|100 x 200|180 x 220": 76, "Edredão|160 x 200|250 x 220": 8, "Edredão|200 x 200|280 x 220": 32, "Saco de Edredão|100 x 200|200 x 240": 76, "Saco de Edredão|160 x 200|270 x 240": 8, "Saco de Edredão|200 x 200|300 x 240": 32, "Lençol (C/ Edredão)|100 x 200|200 x 300": 76, "Lençol (C/ Edredão)|160 x 200|280 x 300": 8, "Lençol (C/ Edredão)|200 x 200|320 x 300": 32, "Lençois de Bebe||80 x 140": 12, "Cobertores|100 x 200|180 x 260": 78, "Resguardos|100 x 200|115 x 202": 76, "Resguardos|160 x 200|175 x 202": 8, "Resguardos|200 x 200|220 x 202": 32, "Toppers Casal||": 8, "Almofadas||40 x 60 (600 gr)": 201, "Almofadas||60 x 80 (1200 gr)": 156, "Fronhas||45x65": 201, "Fronhas||65x90": 156, "Fronhas||45x65 NEP": 45, "Turco Tapete Collection||50x70": 78, "Turco Banho Collection||100 x 160": 201, "Turco Rosto Collection||50x100": 201, "Mantilha||": 78}, "34": {"Edredão|100 x 200|180 x 220": 142, "Edredão|160 x 200|250 x 220": 4, "Edredão|200 x 200|280 x 220": 39, "Edredão|220 x 200|300 x 220": 9, "Saco de Edredão|100 x 200|200 x 240": 142, "Saco de Edredão|160 x 200|270 x 240": 4, "Saco de Edredão|200 x 200|300 x 240": 39, "Saco de Edredão|220 x 200|320 x 240": 9, "Lençol (C/ Edredão)|100 x 200|200 x 300": 188, "Lençol (C/ Edredão)|160 x 200|280 x 300": 4, "Lençol (C/ Edredão)|200 x 200|320 x 300": 39, "Lençol (C/ Edredão)|220 x 200|340 x 310": 9, "Lençois de Bebe||80 x 140": 10, "Colcha de Favo|80 x 200|180 x 260": 23, "Cobertores|100 x 200|180 x 260": 71, "Cobertores|160 x 200|230 x 260": 4, "Cobertores|200 x 200|260 x 260": 39, "Cobertores|220 x 200|280 x 260": 9, "Resguardos|90 x 200|115 x 202": 198, "Resguardos|160 x 200|175 x 202": 4, "Resguardos|200 x 200|220 x 202": 39, "Resguardos|220 x 200|240 x 202": 9, "Almofadas||40 x 60 (600 gr)": 302, "Almofadas||50 x 70 (900 gr)": 18, "Almofadas||60 x 80 (1200 gr)": 246, "Fronhas||45x65": 302, "Fronhas||55x75": 18, "Fronhas||65x90": 246, "Turco Tapete Collection||50x70": 123, "Turco Banho Collection||100 x 160": 312, "Turco Rosto Collection||50x100": 312, "Turco Piscina Collection||": 246, "Mantilha||": 123}, "11": {"Edredão|90 x 200|180 x 220": 236, "Edredão|120 x 200|230 x 220": 116, "Edredão|150 x 200|250 x 220": 57, "Saco de Edredão|90 x 200|190 x 240": 236, "Saco de Edredão|120 x 200|250 x 240": 116, "Saco de Edredão|150 x 200|270 x 240": 57, "Lençol (C/ Colcha)|80 x 200|180 x 300": 300, "Lençol (C/ Edredão)|90 x 200|180 x 300": 236, "Lençol (C/ Edredão)|120 x 200|240 x 300": 116, "Lençol (C/ Edredão)|150 x 200|280 x 300": 57, "Lençois de Bebe||80 x 140": 40, "Colcha de Favo|90 x 200|180 x 260": 150, "Cobertores|90 x 200|160 x 260": 118, "Cobertores|120 x 200|180 x 260": 58, "Cobertores|150 x 200|230 x 260": 57, "Resguardos|90 x 200|115 x 202": 236, "Resguardos|120 x 200|145 x 202": 116, "Resguardos|150 x 200|165 x 202": 57, "Almofadas||40 x 60 (600 gr)": 616, "Almofadas||60 x 80 (1200 gr)": 466, "Almofadas||40 x 60 (p/ Fronha NEP)": 20, "Fronhas||45x65": 616, "Fronhas||65x90": 466, "Turco Tapete||40 x 60": 233, "Turco Banho||90 x 140": 616, "Turco Bidé||30 x 50": 466, "Turco Rosto||45 x 90": 616, "Mantilha||": 233}, "21": {"Edredão|160 x 200|250 x 220": 40, "Edredão|200 x 200|280 x 220": 39, "Saco de Edredão|160 x 200|270 x 240": 40, "Saco de Edredão|200 x 200|300 x 240": 39, "Lençol (C/ Colcha)|100 x 200|200 x 300": 882, "Lençol (C/ Edredão)|160 x 200|280 x 300": 40, "Lençol (C/ Edredão)|200 x 200|320 x 300": 39, "Lençois de Bebe||80 x 140": 80, "Colcha de Favo|100 x 200|180 x 260": 680, "Cobertores|100 x 200|180 x 260": 741, "Cobertores|180 x 200|260 x 260": 59, "Resguardos|100 x 200|115 x 202": 680, "Resguardos|160 x 200|175 x 202": 40, "Resguardos|200 x 200|220 x 202": 39, "Almofadas||40 x 60 (600 gr)": 818, "Almofadas||60 x 80 (1200 gr)": 612, "Fronhas||45x65": 818, "Fronhas||65x90": 612, "Turco Tapete||40 x 60": 306, "Turco Banho||90 x 140": 818, "Turco Bidé||30 x 50": 612, "Turco Rosto||45 x 90": 818, "Turco Piscina||78 x 150": 818, "Mantilha||": 306}, "23": {"Edredão|90 x 200|180 x 220": 340, "Edredão|160 x 200|250 x 220": 25, "Edredão|180 x 200|280 x 220": 34, "Saco de Edredão|100 x 200|200 x 240": 340, "Saco de Edredão|160 x 200|270 x 240": 25, "Saco de Edredão|180 x 200|300 x 240": 34, "Lençol (C/ Edredão)|100 x 200|200 x 300": 592, "Lençol (C/ Edredão)|200 x 200|320 x 300": 25, "Lençol (C/ Edredão)|220 x 200|340 x 310": 34, "Lençois de Bebe||80 x 140": 50, "Colcha de Favo|80 x 200|180 x 260": 86, "Cobertores|90 x 200|160 x 260": 340, "Cobertores|160 x 200|230 x 260": 25, "Cobertores|180 x 200|260 x 260": 34, "Resguardos|80 x 200|105 x 202": 86, "Resguardos|90 x 200|115 x 202": 340, "Resguardos|160 x 200|175 x 202": 25, "Resguardos|180 x 200|195 x 202": 34, "Almofadas||40 x 60 (600 gr)": 544, "Almofadas||60 x 80 (1200 gr)": 458, "Almofadas||40 x 60 (p/ Fronha NEP)": 25, "Fronhas||45x65": 544, "Fronhas||65x90": 458, "Turco Tapete||40 x 60": 229, "Turco Banho||90 x 140": 544, "Turco Bidé||30 x 50": 458, "Turco Rosto||45 x 90": 544, "Turco Piscina||78 x 150": 229, "Mantilha||": 229}, "5": {"Edredão|180 x 200|280 x 220": 40, "Saco de Edredão|180 x 200|300 x 240": 40, "Lençol (C/ Colcha)|90 x 200|180 x 300": 1214, "Lençol (C/ Colcha)|180 x 200|280 x 300": 40, "Lençois de Bebe||80 x 140": 28, "Colcha de Favo|90 x 200|180 x 260": 607, "Cobertores|90 x 200|160 x 260": 607, "Resguardos|90 x 200|115 x 202": 607, "Resguardos|180 x 200|195 x 202": 40, "Almofadas||40 x 60 (600 gr)": 687, "Almofadas||60 x 80 (1200 gr)": 630, "Fronhas||45x65": 687, "Fronhas||65x90": 630, "Turco Tapete||40 x 60": 315, "Turco Banho||90 x 140": 687, "Turco Bidé||30 x 50": 630, "Turco Rosto||45 x 90": 687, "Turco Piscina||78 x 150": 687, "Mantilha||": 315}, "31": {"Edredão|100 x 200|180 x 220": 30, "Edredão|200 x 200|280 x 220": 31, "Saco de Edredão|100 x 200|200 x 240": 30, "Saco de Edredão|200 x 200|300 x 240": 31, "Lençol (C/ Edredão)|100 x 200|200 x 300": 76, "Lençol (C/ Edredão)|200 x 200|320 x 300": 31, "Lençois de Bebe||80 x 140": 6, "Colcha de Favo|100 x 200|180 x 260": 46, "Cobertores|90 x 200|160 x 260": 32, "Cobertores|100 x 200|180 x 260": 76, "Cobertores|150 x 200|230 x 260": 30, "Cobertores|200 x 200|260 x 260": 62, "Resguardos|100 x 200|115 x 202": 76, "Resguardos|200 x 200|220 x 202": 31, "Almofadas||40 x 60 (600 gr)": 138, "Almofadas||60 x 80 (1200 gr)": 92, "Fronhas||45x65": 138, "Fronhas||65x90": 92, "Turco Tapete Collection||50x70": 46, "Turco Banho Collection||100 x 160": 138, "Turco Bidé Collection||30x50": 92, "Turco Rosto Collection||50x100": 138, "Turco Piscina Collection||": 138, "Mantilha||": 46}, "45": {"Edredão|100 x 200|180 x 220": 78, "Edredão|200 x 200|280 x 220": 40, "Saco de Edredão|100 x 200|200 x 240": 78, "Saco de Edredão|200 x 200|300 x 240": 40, "Lençol (C/ Colcha)|90 x 200|180 x 300": 98, "Lençol (C/ Edredão)|100 x 200|200 x 300": 78, "Lençol (C/ Edredão)|200 x 200|320 x 300": 40, "Lençois de Bebe||80 x 140": 20, "Colcha de Favo|90 x 200|180 x 260": 49, "Cobertores|100 x 200|180 x 260": 78, "Cobertores|200 x 200|260 x 260": 40, "Resguardos|90 x 200|115 x 202": 49, "Resguardos|100 x 200|115 x 202": 78, "Resguardos|180 x 200|195 x 202": 40, "Almofadas||40 x 60 (600 gr)": 207, "Almofadas||60 x 80 (1200 gr)": 158, "Fronhas||45x65": 207, "Fronhas||65x90": 158, "Turco Tapete Collection||50x70": 79, "Turco Banho Collection||100 x 160": 207, "Turco Rosto Collection||50x100": 207, "Turco Piscina Collection||": 200, "Mantilha||": 79}, "10": {"Edredão|90 x 200|180 x 220": 332, "Edredão|150 x 200|250 x 220": 1, "Edredão|180 x 200|280 x 220": 43, "Saco de Edredão|90 x 200|190 x 240": 332, "Saco de Edredão|150 x 200|270 x 240": 1, "Saco de Edredão|180 x 200|300 x 240": 43, "Lençol (C/ Edredão)|90 x 200|180 x 300": 442, "Lençol (C/ Edredão)|150 x 200|280 x 300": 1, "Lençol (C/ Edredão)|180 x 200|280 x 300": 43, "Lençois de Bebe||80 x 140": 20, "Colcha de Favo|90 x 200|180 x 260": 55, "Resguardos|80 x 200|105 x 202": 55, "Resguardos|90 x 200|115 x 202": 332, "Resguardos|150 x 200|165 x 202": 1, "Resguardos|180 x 200|195 x 202": 43, "Almofadas||40 x 60 (600 gr)": 475, "Almofadas||60 x 80 (1200 gr)": 420, "Fronhas||45x65": 475, "Fronhas||65x90": 420, "Turco Tapete||40 x 60": 210, "Turco Banho||90 x 140": 475, "Turco Bidé||30 x 50": 420, "Turco Rosto||45 x 90": 475, "Turco Piscina||78 x 150": 400, "Mantilha||": 210}, "12": {"Edredão|90 x 200|180 x 220": 204, "Edredão|140 x 200|230 x 220": 6, "Edredão|190 x 200|280 x 220": 18, "Saco de Edredão|90 x 200|190 x 240": 204, "Saco de Edredão|140 x 200|250 x 240": 6, "Saco de Edredão|190 x 200|300 x 240": 18, "Lençol (C/ Colcha)|80 x 200|180 x 300": 52, "Lençol (C/ Edredão)|90 x 200|180 x 300": 204, "Lençol (C/ Edredão)|140 x 200|240 x 300": 6, "Lençol (C/ Edredão)|190 x 200|280 x 300": 18, "Colcha de Favo|90 x 200|180 x 260": 26, "Cobertores|90 x 200|160 x 260": 102, "Cobertores|140 x 200|230 x 260": 6, "Cobertores|190 x 200|260 x 260": 18, "Resguardos|80 x 200|105 x 202": 26, "Resguardos|90 x 200|115 x 202": 204, "Resguardos|140 x 200|155 x 202": 6, "Resguardos|190 x 200|205 x 202": 18, "Almofadas||40 x 60 (600 gr)": 278, "Almofadas||60 x 80 (1200 gr)": 252, "Fronhas||45x65": 278, "Fronhas||65x90": 252, "Turco Tapete||40 x 60": 126, "Turco Banho||90 x 140": 278, "Turco Rosto||45 x 90": 278, "Mantilha||": 228}, "22": {"Edredão|100 x 200|180 x 220": 200, "Edredão|200 x 200|280 x 220": 85, "Saco de Edredão|100 x 200|200 x 240": 200, "Saco de Edredão|180 x 200|300 x 240": 25, "Saco de Edredão|200 x 200|300 x 240": 60, "Lençol (C/ Colcha)|80 x 200|180 x 300": 62, "Lençol (C/ Edredão)|100 x 200|200 x 300": 200, "Lençol (C/ Edredão)|180 x 200|280 x 300": 25, "Lençol (C/ Edredão)|200 x 200|320 x 300": 60, "Lençois de Bebe||80 x 140": 20, "Colcha de Favo|80 x 200|180 x 260": 31, "Colcha de Favo|120 x 200|240 x 260": 185, "Cobertores|100 x 200|180 x 260": 185, "Resguardos|80 x 200|105 x 202": 31, "Resguardos|90 x 200|115 x 202": 200, "Resguardos|180 x 200|195 x 202": 25, "Resguardos|200 x 200|220 x 202": 60, "Almofadas||40 x 60 (600 gr)": 401, "Almofadas||60 x 80 (1200 gr)": 370, "Fronhas||45x65": 401, "Fronhas||65x90": 370, "Fronhas||45x65 NEP": 10, "Turco Tapete||40 x 60": 185, "Turco Banho||90 x 140": 387, "Turco Bidé||30 x 50": 370, "Turco Rosto||45 x 90": 387, "Turco Piscina||78 x 150": 387, "Mantilha||": 185}, "24": {"Edredão|90 x 200|180 x 220": 18, "Edredão|180 x 200|280 x 220": 9, "Saco de Edredão|90 x 200|190 x 240": 18, "Saco de Edredão|100 x 200|200 x 240": 151, "Saco de Edredão|180 x 200|300 x 240": 8, "Saco de Edredão|200 x 200|300 x 240": 71, "Lençol (C/ Colcha)|80 x 200|180 x 300": 260, "Lençol (C/ Colcha)|150 x 200|280 x 300": 7, "Lençol (C/ Colcha)|180 x 200|280 x 300": 1, "Lençol (C/ Edredão)|90 x 200|180 x 300": 18, "Lençol (C/ Edredão)|100 x 200|200 x 300": 134, "Lençol (C/ Edredão)|180 x 200|280 x 300": 8, "Lençol (C/ Edredão)|200 x 200|320 x 300": 71, "Lençois de Bebe||80 x 140": 54, "Colcha de Favo|80 x 200|180 x 260": 130, "Cobertores|100 x 200|180 x 260": 93, "Cobertores|200 x 200|260 x 260": 62, "Resguardos|80 x 200|105 x 202": 130, "Resguardos|90 x 200|115 x 202": 18, "Resguardos|100 x 200|115 x 202": 168, "Resguardos|180 x 200|195 x 202": 8, "Resguardos|200 x 200|220 x 202": 71, "Toppers Casal||": 17, "Almofadas||40 x 60 (600 gr)": 436, "Almofadas||60 x 80 (1200 gr)": 306, "Fronhas||45x65": 436, "Fronhas||65x90": 306, "Turco Tapete||40 x 60": 153, "Turco Banho||90 x 140": 436, "Turco Rosto||45 x 90": 436, "Mantilha||": 153}, "8": {"Lençol (C/ Colcha)|90 x 200|180 x 300": 930, "Lençol (C/ Colcha)|140 x 200|240 x 300": 48, "Lençol (C/ Colcha)|180 x 200|280 x 300": 144, "Lençol (C/ Edredão)|140 x 200|240 x 300": 22, "Lençol (C/ Edredão)|180 x 200|280 x 300": 22, "Lençois de Bebe||80 x 140": 58, "Colcha de Favo|90 x 200|180 x 260": 465, "Colcha de Favo|150 x 200|240 x 260": 48, "Colcha de Favo|180 x 200|270 x 260": 13, "Cobertores|90 x 200|160 x 260": 465, "Cobertores|150 x 200|230 x 260": 101, "Resguardos|90 x 200|115 x 202": 465, "Resguardos|140 x 200|155 x 202": 22, "Resguardos|150 x 200|165 x 202": 48, "Resguardos|180 x 200|195 x 202": 37, "Toppers Casal||": 2, "Toppers Solteiro||": 14, "Almofadas||40 x 60 (600 gr)": 631, "Almofadas||60 x 80 (1200 gr)": 466, "Fronhas||45x65": 631, "Fronhas||65x90": 466, "Fronhas||45x65 NEP": 214, "Turco Tapete||40 x 60": 233, "Turco Banho||90 x 140": 631, "Turco Bidé||30 x 50": 466, "Turco Rosto||45 x 90": 631, "Turco Piscina||78 x 150": 631, "Mantilha||": 233}, "13": {"Edredão|90 x 200|180 x 220": 412, "Edredão|160 x 200|250 x 220": 16, "Edredão|180 x 200|280 x 220": 37, "Saco de Edredão|90 x 200|190 x 240": 412, "Saco de Edredão|160 x 200|270 x 240": 16, "Saco de Edredão|180 x 200|300 x 240": 37, "Lençol (C/ Colcha)|80 x 200|180 x 300": 130, "Lençol (C/ Edredão)|90 x 200|180 x 300": 412, "Lençol (C/ Edredão)|160 x 200|280 x 300": 16, "Lençol (C/ Edredão)|180 x 200|280 x 300": 37, "Colcha de Favo|80 x 200|180 x 260": 65, "Cobertores|90 x 200|160 x 260": 206, "Cobertores|160 x 200|230 x 260": 16, "Cobertores|180 x 200|260 x 260": 37, "Resguardos|80 x 200|105 x 202": 65, "Resguardos|90 x 200|115 x 202": 412, "Resguardos|160 x 200|175 x 202": 16, "Resguardos|180 x 200|195 x 202": 37, "Almofadas||40 x 60 (600 gr)": 583, "Almofadas||60 x 80 (1200 gr)": 518, "Fronhas||45x65": 583, "Fronhas||65x90": 518, "Turco Tapete||40 x 60": 259, "Turco Banho||90 x 140": 583, "Turco Bidé||30 x 50": 518, "Turco Rosto||45 x 90": 583}, "2": {"Edredão|90 x 200|180 x 220": 44, "Edredão|180 x 200|280 x 220": 9, "Edredão|200 x 200|280 x 220": 1, "Saco de Edredão|90 x 200|190 x 240": 42, "Saco de Edredão|180 x 200|300 x 240": 9, "Saco de Edredão|200 x 200|300 x 240": 1, "Lençol (C/ Colcha)|90 x 200|180 x 300": 1044, "Lençol (C/ Colcha)|180 x 200|280 x 300": 36, "Lençol (C/ Edredão)|90 x 200|180 x 300": 42, "Lençol (C/ Edredão)|180 x 200|280 x 300": 9, "Lençol (C/ Edredão)|200 x 200|320 x 300": 1, "Lençois de Bebe||80 x 140": 34, "Colcha de Favo|90 x 200|180 x 260": 522, "Colcha de Favo|180 x 200|270 x 260": 34, "Cobertores|90 x 200|160 x 260": 763, "Cobertores|180 x 200|260 x 260": 27, "Resguardos|90 x 200|115 x 202": 572, "Resguardos|180 x 200|195 x 202": 27, "Resguardos|200 x 200|220 x 202": 1, "Almofadas||40 x 60 (600 gr)": 652, "Almofadas||60 x 80 (1200 gr)": 516, "Fronhas||45x65": 632, "Fronhas||65x90": 516, "Fronhas||45x65 NEP": 92, "Turco Tapete||40 x 60": 254, "Turco Banho||90 x 140": 640, "Turco Bidé||30 x 50": 250, "Turco Rosto||45 x 90": 640, "Mantilha||": 258}, "9": {"Edredão|90 x 200|180 x 220": 478, "Edredão|150 x 200|250 x 220": 13, "Edredão|190 x 200|280 x 220": 40, "Saco de Edredão|90 x 200|190 x 240": 478, "Saco de Edredão|150 x 200|270 x 240": 13, "Saco de Edredão|190 x 200|300 x 240": 40, "Lençol (C/ Edredão)|90 x 200|180 x 300": 478, "Lençol (C/ Edredão)|150 x 200|280 x 300": 13, "Lençol (C/ Edredão)|190 x 200|280 x 300": 40, "Lençois de Bebe||80 x 140": 20, "Colcha de Favo|80 x 200|180 x 260": 47, "Cobertores|90 x 200|160 x 260": 478, "Cobertores|150 x 200|230 x 260": 53, "Resguardos|80 x 200|105 x 202": 47, "Resguardos|90 x 200|115 x 202": 478, "Resguardos|150 x 200|165 x 202": 13, "Resguardos|190 x 200|205 x 202": 40, "Almofadas||40 x 60 (600 gr)": 631, "Almofadas||60 x 80 (1200 gr)": 584, "Fronhas||45x65": 631, "Fronhas||65x90": 584, "Turco Tapete||40 x 60": 292, "Turco Banho||90 x 140": 584, "Turco Bidé||30 x 50": 584, "Turco Rosto||45 x 90": 584, "Turco Piscina||78 x 150": 631, "Mantilha||": 292}, "29": {"Edredão|100 x 200|180 x 220": 82, "Edredão|200 x 200|280 x 220": 35, "Saco de Edredão|100 x 200|200 x 240": 82, "Saco de Edredão|200 x 200|300 x 240": 35, "Lençol (C/ Edredão)|80 x 200|180 x 300": 71, "Lençol (C/ Edredão)|100 x 200|200 x 300": 82, "Lençol (C/ Edredão)|120 x 200|240 x 300": 82, "Lençol (C/ Edredão)|200 x 200|320 x 300": 35, "Lençois de Bebe||80 x 140": 14, "Colcha de Favo|80 x 200|180 x 260": 71, "Cobertores|100 x 200|180 x 260": 126, "Resguardos|80 x 200|105 x 202": 71, "Resguardos|100 x 200|115 x 202": 82, "Resguardos|200 x 200|220 x 202": 35, "Almofadas||40 x 60 (600 gr)": 225, "Almofadas||50 x 70 (900 gr)": 16, "Almofadas||60 x 80 (1200 gr)": 152, "Fronhas||45x65": 225, "Fronhas||55x75": 16, "Fronhas||65x90": 152, "Turco Tapete Collection||50x70": 152, "Turco Banho Collection||100 x 160": 212, "Turco Bidé Collection||30x50": 10, "Turco Rosto Collection||50x100": 212, "Turco Piscina Collection||": 152, "Mantilha||": 76}, "7": {"Edredão|100 x 200|180 x 220": 40, "Edredão|200 x 200|280 x 220": 20, "Saco de Edredão|100 x 200|200 x 240": 40, "Saco de Edredão|200 x 200|300 x 240": 20, "Lençol (C/ Edredão)|100 x 200|200 x 300": 40, "Lençol (C/ Edredão)|200 x 200|320 x 300": 20, "Cobertores|100 x 200|180 x 260": 20, "Cobertores|200 x 200|260 x 260": 20, "Resguardos|100 x 200|115 x 202": 40, "Resguardos|200 x 200|220 x 202": 20, "Almofadas||40 x 60 (600 gr)": 80, "Almofadas||60 x 80 (1200 gr)": 80, "Fronhas||45x65": 80, "Fronhas||65x90": 80, "Turco Tapete Collection||50x70": 40, "Turco Banho Collection||100 x 160": 80, "Turco Bidé Collection||30x50": 80, "Turco Rosto Collection||50x100": 80, "Turco Piscina Collection||": 80, "Mantilha||": 40}, "35": {"Edredão|200 x 200|280 x 220": 44, "Edredão|160 x 200|250 x 220": 8, "Edredão|100 x 200|180 x 220": 78, "Saco de Edredão|100 x 200|200 x 240": 78, "Saco de Edredão|200 x 200|300 x 240": 44, "Saco de Edredão|160 x 200|270 x 240": 8, "Lençol (C/ Edredão)|100 x 200|200 x 300": 78, "Lençol (C/ Edredão)|160 x 200|280 x 300": 8, "Lençol (C/ Edredão)|200 x 200|320 x 300": 44, "Lençois de Bebe||80 x 140": 26, "Colcha de Favo|90 x 200|180 x 260": 18, "Cobertores|100 x 200|180 x 260": 129, "Resguardos|90 x 200|115 x 202": 18, "Resguardos|100 x 200|115 x 202": 78, "Resguardos|160 x 200|175 x 202": 8, "Resguardos|200 x 200|220 x 202": 44, "Almofadas||40 x 60 (600 gr)": 220, "Almofadas||60 x 80 (1200 gr)": 182, "Fronhas||45x65": 220, "Fronhas||65x90": 182, "Turco Tapete||40 x 60": 91, "Turco Banho||90 x 140": 220, "Turco Rosto||45 x 90": 220, "Turco Piscina||78 x 150": 220, "Mantilha||": 91}, "3": {"Edredão|160 x 200|250 x 220": 6, "Edredão|220 x 200|300 x 220": 19, "Saco de Edredão|160 x 200|270 x 240": 6, "Lençol (C/ Colcha)|80 x 200|180 x 300": 99, "Lençol (C/ Colcha)|90 x 200|180 x 300": 456, "Lençol (C/ Colcha)|180 x 200|280 x 300": 68, "Lençol (C/ Edredão)|160 x 200|280 x 300": 6, "Lençois de Bebe||80 x 140": 28, "Colcha de Favo|80 x 200|180 x 260": 99, "Colcha de Favo|90 x 200|180 x 260": 456, "Colcha de Favo|180 x 200|270 x 260": 34, "Cobertores|90 x 200|160 x 260": 456, "Cobertores|180 x 200|260 x 260": 34, "Resguardos|80 x 200|105 x 202": 99, "Resguardos|90 x 200|115 x 202": 456, "Resguardos|160 x 200|175 x 202": 6, "Resguardos|180 x 200|195 x 202": 34, "Almofadas||40 x 60 (600 gr)": 635, "Almofadas||60 x 80 (1200 gr)": 536, "Fronhas||45x65": 635, "Fronhas||65x90": 536, "Turco Tapete||40 x 60": 268, "Turco Banho||90 x 140": 635, "Turco Bidé||30 x 50": 536, "Turco Rosto||45 x 90": 635, "Turco Piscina||78 x 150": 635, "Mantilha||": 268}, "20": {"Edredão|100 x 200|180 x 220": 406, "Edredão|200 x 200|280 x 220": 59, "Saco de Edredão|100 x 200|200 x 240": 410, "Saco de Edredão|200 x 200|300 x 240": 59, "Lençol (C/ Edredão)|100 x 200|200 x 300": 410, "Lençol (C/ Edredão)|120 x 200|240 x 300": 59, "Lençol (C/ Edredão)|200 x 200|320 x 300": 50, "Lençois de Bebe||80 x 140": 20, "Resguardos|100 x 200|115 x 202": 406, "Resguardos|200 x 200|220 x 202": 59, "Almofadas||40 x 60 (600 gr)": 460, "Almofadas||60 x 80 (1200 gr)": 465, "Fronhas||45x65": 532, "Turco Tapete||40 x 60": 262, "Turco Banho||90 x 140": 524, "Turco Bidé||30 x 50": 524, "Turco Rosto||45 x 90": 524, "Mantilha||": 493}, "14": {"Edredão|100 x 200|180 x 220": 78, "Edredão|200 x 200|280 x 220": 47, "Edredão|220 x 200|300 x 220": 2, "Edredão|240 x 200|320 x 220": 1, "Saco de Edredão|100 x 200|200 x 240": 78, "Saco de Edredão|200 x 200|300 x 240": 47, "Saco de Edredão|220 x 200|320 x 240": 2, "Saco de Edredão|240 x 200|340 x 240": 1, "Lençol (C/ Edredão)|100 x 200|200 x 300": 93, "Lençol (C/ Edredão)|200 x 200|320 x 300": 47, "Lençol (C/ Edredão)|220 x 200|340 x 310": 2, "Lençol (C/ Edredão)|240 x 200|360 x 300": 1, "Lençois de Bebe||80 x 140": 20, "Colcha de Favo|100 x 200|180 x 260": 18, "Cobertores|100 x 200|180 x 260": 54, "Cobertores|200 x 200|260 x 260": 50, "Resguardos|100 x 200|115 x 202": 96, "Resguardos|200 x 200|220 x 202": 47, "Resguardos|220 x 200|240 x 202": 3, "Resguardos|240 x 200|260 x 202": 1, "Almofadas||40 x 60 (600 gr)": 196, "Almofadas||50 x 70 (900 gr)": 178, "Almofadas||60 x 80 (1200 gr)": 6, "Fronhas||45x65": 196, "Fronhas||55x75": 178, "Fronhas||65x90": 6, "Turco Tapete||40 x 60": 89, "Turco Banho||90 x 140": 196, "Turco Bidé||30 x 50": 4, "Turco Rosto||45 x 90": 196, "Turco Piscina||78 x 150": 220, "Mantilha||": 89}, "36": {"Edredão|100 x 200|180 x 220": 88, "Edredão|160 x 200|250 x 220": 23, "Saco de Edredão|100 x 200|200 x 240": 88, "Saco de Edredão|160 x 200|270 x 240": 23, "Lençol (C/ Edredão)|90 x 200|180 x 300": 12, "Lençol (C/ Edredão)|100 x 200|200 x 300": 88, "Lençol (C/ Edredão)|160 x 200|280 x 300": 23, "Lençois de Bebe||80 x 140": 2, "Colcha de Favo|80 x 200|180 x 260": 6, "Cobertores|100 x 200|180 x 260": 44, "Cobertores|160 x 200|230 x 260": 23, "Resguardos|100 x 200|115 x 202": 88, "Resguardos|160 x 200|175 x 202": 23, "Almofadas||40 x 60 (600 gr)": 140, "Almofadas||60 x 80 (1200 gr)": 134, "Fronhas||45x65": 140, "Fronhas||65x90": 134, "Turco Tapete||40 x 60": 67, "Turco Banho||90 x 140": 140, "Turco Rosto||45 x 90": 140, "Mantilha||": 67}, "49": {"Edredão|100 x 200|180 x 220": 4, "Edredão|200 x 200|280 x 220": 27, "Saco de Edredão|100 x 200|200 x 240": 4, "Saco de Edredão|200 x 200|300 x 240": 27, "Lençol (C/ Edredão)|100 x 200|200 x 300": 8, "Lençol (C/ Edredão)|200 x 200|320 x 300": 27, "Colcha de Favo|100 x 200|180 x 260": 4, "Cobertores|200 x 200|260 x 260": 29, "Resguardos|100 x 200|115 x 202": 8, "Resguardos|200 x 200|220 x 202": 27, "Almofadas||40 x 60 (600 gr)": 70, "Almofadas||60 x 80 (1200 gr)": 58, "Fronhas||45x65": 58, "Fronhas||65x90": 58, "Turco Tapete Collection||50x70": 29, "Turco Banho Collection||100 x 160": 66, "Turco Rosto Collection||50x100": 66, "Turco Piscina Collection||": 66, "Mantilha||": 29}, "48": {"Edredão|160 x 200|250 x 220": 104, "Saco de Edredão|160 x 200|270 x 240": 104, "Lençol (C/ Colcha)|90 x 200|180 x 300": 80, "Lençol (C/ Edredão)|140 x 200|240 x 300": 16, "Lençol (C/ Edredão)|160 x 200|280 x 300": 104, "Colcha de Favo|90 x 200|180 x 260": 80, "Cobertores|90 x 200|160 x 260": 80, "Cobertores|160 x 200|230 x 260": 104, "Resguardos|160 x 200|175 x 202": 104, "Almofadas||40 x 60 (600 gr)": 349, "Almofadas||60 x 80 (1200 gr)": 208, "Fronhas||45x65": 349, "Fronhas||65x90": 208, "Turco Tapete||40 x 60": 80, "Turco Banho||90 x 140": 349, "Turco Rosto||45 x 90": 349, "Turco Piscina||78 x 150": 349, "Mantilha||": 88}, "46": {"Lençois de Bebe||80 x 140": 10, "Cobertores|100 x 200|180 x 260": 46, "Cobertores|160 x 200|230 x 260": 13, "Cobertores|200 x 200|260 x 260": 34, "Cobertores|220 x 200|280 x 260": 1, "Resguardos|100 x 200|115 x 202": 92, "Resguardos|140 x 200|155 x 202": 48, "Resguardos|160 x 200|175 x 202": 13, "Resguardos|200 x 200|220 x 202": 34, "Resguardos|220 x 200|240 x 202": 1, "Almofadas||40 x 60 (600 gr)": 234, "Almofadas||60 x 80 (1200 gr)": 186, "Fronhas||45x65": 234, "Fronhas||65x90": 186, "Turco Tapete Collection||50x70": 94, "Turco Banho Collection||100 x 160": 186, "Turco Bidé Collection||30x50": 186, "Turco Rosto Collection||50x100": 186, "Mantilha||": 92}, "43": {"Edredão|100 x 200|180 x 220": 120, "Edredão|160 x 200|250 x 220": 5, "Edredão|200 x 200|280 x 220": 35, "Saco de Edredão|100 x 200|200 x 240": 120, "Saco de Edredão|160 x 200|270 x 240": 5, "Saco de Edredão|200 x 200|300 x 240": 35, "Lençol (C/ Edredão)|100 x 200|200 x 300": 120, "Lençol (C/ Edredão)|160 x 200|280 x 300": 5, "Lençol (C/ Edredão)|200 x 200|320 x 300": 35, "Lençois de Bebe||80 x 140": 12, "Colcha de Favo|240 x 200|": 12, "Cobertores|190 x 200|260 x 260": 100, "Resguardos|100 x 200|115 x 202": 120, "Resguardos|200 x 200|220 x 202": 35, "Resguardos|160 x 200|175 x 202": 5, "Resguardos|180 x 200|195 x 202": 12, "Toppers Casal||": 4, "Almofadas||40 x 60 (600 gr)": 234, "Almofadas||60 x 80 (1200 gr)": 200, "Fronhas||45x65": 235, "Fronhas||65x90": 200, "Fronhas||45x65 NEP": 8, "Turco Tapete Collection||50x70": 100, "Turco Banho Collection||100 x 160": 200, "Turco Bidé Collection||30x50": 200, "Turco Rosto Collection||50x100": 212, "Turco Piscina Collection||": 200, "Mantilha||": 100}, "52": {"Edredão|90 x 200|180 x 220": 117, "Edredão|140 x 200|230 x 220": 5, "Edredão|160 x 200|250 x 220": 44, "Saco de Edredão|90 x 200|190 x 240": 117, "Saco de Edredão|140 x 200|250 x 240": 5, "Saco de Edredão|160 x 200|270 x 240": 44, "Lençol (C/ Edredão)|90 x 200|180 x 300": 117, "Lençol (C/ Edredão)|140 x 200|240 x 300": 5, "Lençol (C/ Edredão)|160 x 200|280 x 300": 44, "Lençois de Bebe||80 x 140": 14, "Colcha de Favo|90 x 200|180 x 260": 18, "Resguardos|90 x 200|115 x 202": 117, "Resguardos|140 x 200|155 x 202": 5, "Resguardos|160 x 200|175 x 202": 44, "Resguardos|180 x 200|195 x 202": 14, "Almofadas||40 x 60 (600 gr)": 224, "Almofadas||60 x 80 (1200 gr)": 206, "Fronhas||45x65": 206, "Fronhas||65x90": 206, "Fronhas||45x65 NEP": 14, "Turco Tapete Collection||50x70": 103, "Turco Banho Collection||100 x 160": 206, "Turco Rosto Collection||50x100": 206, "Turco Piscina Collection||": 206, "Mantilha||": 54}, "51": {"Lençol (C/ Colcha)|90 x 200|180 x 300": 294, "Lençol (C/ Colcha)|100 x 200|200 x 300": 588, "Lençol (C/ Colcha)|190 x 200|280 x 300": 306, "Lençol (C/ Colcha)|200 x 200|320 x 300": 306, "Lençois de Bebe||80 x 140": 46, "Colcha de Favo|100 x 200|180 x 260": 294, "Colcha de Favo|200 x 200|270 x 260": 153, "Cobertores|100 x 200|180 x 260": 147, "Cobertores|200 x 200|260 x 260": 150, "Resguardos|100 x 200|115 x 202": 300, "Resguardos|200 x 200|220 x 202": 150, "Almofadas||40 x 60 (600 gr)": 919, "Almofadas||60 x 80 (1200 gr)": 600, "Fronhas||45x65": 919, "Fronhas||65x90": 600, "Turco Tapete||40 x 60": 300, "Turco Banho||90 x 140": 919, "Turco Bidé||30 x 50": 600, "Turco Rosto||45 x 90": 919, "Turco Piscina||78 x 150": 600}};

/* ---------- Estado global ---------- */
let DB = null;          // { users, hoteis, regioes, catalogo, campanhas, invent, log, meta }
let SESSION = null;     // utilizador autenticado
let CURRENT_VIEW = 'dash';
let CURRENT_HOTEL = null;
let CURRENT_CAMP = null; // id da campanha ativa no ecrã
let CMP_INI = null, CMP_FIM = null; // campanhas em comparação (camada 1)
let DIRTY = false;       // há alterações de inventário por gravar

/* ---------- Persistência ----------
   Backend Netlify Function em /.netlify/functions/hk-store (get/set).
   Fallback: localStorage (para preview/offline). */
const STORE_KEY = 'vg_hk_inventario_v1';
const PRESENCE_KEY = 'vg_hk_presence_v1';
const FN_URL = '/.netlify/functions/hk-store';
let USE_BLOB = true;
function hk35AuthHeaders(json=false){
  const h=json?{'Content-Type':'application/json'}:{};
  const t=typeof window.vgAuthToken==='function'?window.vgAuthToken():'';
  if(t)h.Authorization='Bearer '+t;
  return h;
}

async function blobGetKey(key){
  try{
    const r = await fetch(FN_URL+'?key='+encodeURIComponent(key),{method:'GET',headers:hk35AuthHeaders()});
    if(!r.ok) throw new Error('status '+r.status);
    const j = await r.json();
    return j && j.data ? j.data : null;
  }catch(e){ return null; }
}
async function blobSetKey(key,data){
  try{
    const r = await fetch(FN_URL,{method:'POST',headers:hk35AuthHeaders(true),
      body:JSON.stringify({key,data})});
    if(!r.ok) throw new Error('status '+r.status);
    return true;
  }catch(e){ return false; }
}
async function blobGet(){
  try{
    const r = await fetch(FN_URL+'?key='+STORE_KEY,{method:'GET',headers:hk35AuthHeaders()});
    if(!r.ok) throw new Error('status '+r.status);
    const j = await r.json();
    return j && j.data ? j.data : null;
  }catch(e){ USE_BLOB=false; return null; }
}
async function blobSet(data){
  if(!USE_BLOB){ localStorage.setItem(STORE_KEY, JSON.stringify(data)); return true; }
  try{
    const r = await fetch(FN_URL,{method:'POST',headers:hk35AuthHeaders(true),
      body:JSON.stringify({key:STORE_KEY,data})});
    if(!r.ok) throw new Error('status '+r.status);
    return true;
  }catch(e){ USE_BLOB=false; localStorage.setItem(STORE_KEY, JSON.stringify(data)); return true; }
}
function localGet(){ try{ return JSON.parse(localStorage.getItem(STORE_KEY)||'null'); }catch{ return null; } }

/* ---------- Presença (quem está online) ----------
   Aproximação sem servidor tempo-real: cada sessão escreve um heartbeat
   no Blob (chave separada) a cada 30s. Online = heartbeat nos últimos 120s.
   Escrita por merge (lê, poda expirados, faz upsert do próprio) para
   várias sessões coexistirem apesar do last-write-wins. */
const PRESENCE_TTL = 120000;      // 120s
const PRESENCE_BEAT = 30000;      // 30s
let MY_SESSION_ID = 'sess'+Math.random().toString(36).slice(2,10);
let presenceTimer=null, presencePollTimer=null;

async function presenceBeat(remover=false){
  if(!SESSION || !USE_BLOB) return;
  const agora=Date.now();
  let mapa = (await blobGetKey(PRESENCE_KEY)) || {};
  if(typeof mapa!=='object' || Array.isArray(mapa)) mapa={};
  // poda expirados
  Object.keys(mapa).forEach(k=>{ if(!mapa[k]||(agora-(mapa[k].ts||0))>PRESENCE_TTL) delete mapa[k]; });
  if(remover) delete mapa[MY_SESSION_ID];
  else mapa[MY_SESSION_ID]={ nome:SESSION.nome, role:SESSION.role, ts:agora };
  await blobSetKey(PRESENCE_KEY, mapa);
  renderPresenca(mapa);
}
async function presencePoll(){
  if(!SESSION || !USE_BLOB) return;
  const mapa=(await blobGetKey(PRESENCE_KEY))||{};
  renderPresenca(mapa);
}
function presencaOnline(mapa){
  const agora=Date.now();
  return Object.values(mapa||{}).filter(u=>u&&(agora-(u.ts||0))<=PRESENCE_TTL);
}
function renderPresenca(mapa){
  const el=window.HK35Root.getElementById('presence'); if(!el) return;
  const online=presencaOnline(mapa);
  // deduplica por nome (mesma pessoa em 2 separadores conta 1)
  const nomes=[...new Set(online.map(u=>u.nome))];
  const n=nomes.length;
  const lista=online.reduce((m,u)=>{ (m[u.nome]=m[u.nome]||u); return m; },{});
  const tip=Object.values(lista).map(u=>u.nome+(u.role==='DO'?' · DO':u.role==='Compras'?' · Compras':u.role==='Diretor'?' · Dir.':' · Assist.')).join('\n');
  el.innerHTML=`<span class="dot"></span>${n} online`;
  el.title=n?('Online agora:\n'+tip):'Ninguém online';
}
function iniciarPresenca(){
  presenceBeat();
  presenceTimer=setInterval(()=>presenceBeat(false), PRESENCE_BEAT);
  presencePollTimer=setInterval(presencePoll, PRESENCE_BEAT);
}
function pararPresenca(){
  clearInterval(presenceTimer); clearInterval(presencePollTimer);
  // remove-se ao sair (beacon com merge não é fiável, mas o TTL trata do resto)
  presenceBeat(true);
}
/* No fecho abrupto do separador não dá para fazer merge fiável; deixamos o TTL
   (120s) expirar a entrada. Função mantida para o handler de pagehide. */
function presenceBeacon(){ /* intencionalmente sem escrita — evita clobber do mapa */ }

let CLOUD_OK = null; // null=desconhecido, true=nuvem ativa, false=só local
let LAST_SEEN_REV = null;   // "ts|by" da última revisão que este ecrã conhece
let syncTimer = null;
const SYNC_INTERVAL = 20000; // 20s
function revKey(d){ const r=d&&d.meta&&d.meta.rev; return r ? (r.ts+'|'+r.by) : null; }
async function loadDB(){
  // sonda explícita à nuvem (distingue "sem dados" de "sem backend")
  let cloud=null, reachable=false;
  try{
    const r=await fetch(FN_URL+'?key='+STORE_KEY,{method:'GET',headers:hk35AuthHeaders()});
    if(r.ok){ reachable=true; const j=await r.json(); cloud=j&&j.data?j.data:null; }
  }catch(e){ reachable=false; }
  CLOUD_OK=reachable; USE_BLOB=reachable;
  let data = cloud;
  if(!data) data = localGet();
  if(!data) data = freshDB();
  DB = migrate(data);
  LAST_SEEN_REV = revKey(DB);
}

/* ---------- Sincronização automática (puxa alterações de outras sessões) ----------
   Só atualiza o ecrã quando é SEGURO: sem alterações por gravar (DIRTY),
   sem modal aberto, e sem estar a meio de uma contagem no modo governanta.
   Nunca sobrescreve trabalho em curso — nesse caso espera pela próxima ronda. */
async function syncCheck(){
  if(!SESSION || !USE_BLOB) return;
  if(DIRTY || saving) return;                                  // a meio de escrever/gravar → espera
  const modalAberto = window.HK35Root.getElementById('modalRoot') && window.HK35Root.getElementById('modalRoot').innerHTML.trim()!=='';
  if(modalAberto) return;                                      // menu/modal aberto → espera
  let cloud=null;
  try{ const r=await fetch(FN_URL+'?key='+STORE_KEY,{method:'GET',headers:hk35AuthHeaders()}); if(r.ok){const j=await r.json(); cloud=j&&j.data?j.data:null;} }
  catch(e){ return; }
  if(!cloud) return;
  const novaRev = revKey(cloud);
  // só atua se a revisão da nuvem existe, é diferente da que temos, e NÃO foi este ecrã a gerá-la
  if(!novaRev || novaRev===LAST_SEEN_REV) return;
  if(cloud.meta && cloud.meta.rev && cloud.meta.rev.by===MY_SESSION_ID) { LAST_SEEN_REV=novaRev; return; }
  // reconfirma segurança (o utilizador pode ter começado a escrever durante o fetch)
  if(DIRTY || saving) return;
  const modalAberto2 = window.HK35Root.getElementById('modalRoot') && window.HK35Root.getElementById('modalRoot').innerHTML.trim()!=='';
  if(modalAberto2) return;
  DB = migrate(cloud);
  LAST_SEEN_REV = revKey(DB);
  redesenharAtual();
  toast('Dados atualizados');
}
/* Redesenha a vista atual (app normal ou modo governanta) sem perder o sítio */
function redesenharAtual(){
  if(isGovernanta()){
    if(GOV_HOTEL) renderGovContagem();
    return;
  }
  const R = (typeof VIEWS!=='undefined') && VIEWS[CURRENT_VIEW];
  if(R && R.render) R.render();
}
function iniciarSync(){ clearInterval(syncTimer); syncTimer=setInterval(syncCheck, SYNC_INTERVAL); }
function pararSync(){ clearInterval(syncTimer); }
let saveQueued=false, saving=false;
async function saveDB(){
  if(saving){ saveQueued=true; return; }
  saving=true; setSaveState('a guardar…');
  // carimba a revisão (quem gravou e quando) para o sync detetar alterações externas
  DB.meta = DB.meta || {}; DB.meta.rev = { ts: Date.now(), by: MY_SESSION_ID };
  LAST_SEEN_REV = DB.meta.rev.ts + '|' + DB.meta.rev.by;
  const ok = await blobSet(DB);
  saving=false; setSaveState(ok?'guardado':'erro ao guardar', ok);
  if(saveQueued){ saveQueued=false; saveDB(); }
}
/* Auto-gravação com debounce: persiste na nuvem pouco depois de cada alteração,
   para não se perder trabalho mesmo que fechem o browser. */
let autosaveTimer=null;
function autosave(){
  DIRTY=true; setSaveState('a guardar…');
  clearTimeout(autosaveTimer);
  autosaveTimer=setTimeout(async()=>{ await saveDB(); DIRTY=false; }, 900);
}
/* Garante flush imediato (usado ao sair da app / trocar de contexto) */
async function flushSave(){ clearTimeout(autosaveTimer); await saveDB(); DIRTY=false; }
/* Flush fiável no fecho do separador: sendBeacon não é cancelado pelo browser ao sair.
   Só é usado com backend Netlify; em modo local o localStorage já foi escrito pelo autosave. */
function beaconSave(){
  if(!USE_BLOB || !DB) return;
  try{
    fetch(FN_URL,{method:'POST',headers:hk35AuthHeaders(true),body:JSON.stringify({key:STORE_KEY,data:DB}),keepalive:true})
      .catch(()=>{try{localStorage.setItem(STORE_KEY,JSON.stringify(DB));}catch(e){}});
  }catch(e){ try{ localStorage.setItem(STORE_KEY, JSON.stringify(DB)); }catch{} }
}
function setSaveState(txt, ok=true){
  const el=window.HK35Root.getElementById('saveState');
  if(el) el.innerHTML = ok?('Estado: <b>'+txt+'</b>'):('<span style="color:var(--red)">'+txt+'</span>');
}

/* ---------- Aplicabilidade de linha do catálogo ----------
   aplic = { modo:'todos' | 'seletivo', regioes:[], hoteis:[], excluir:[] } */
function defAplic(){ return { modo:'todos', regioes:[], hoteis:[], excluir:[] }; }
function linhaAplicaAoHotel(aplic, hotel){
  if(!aplic || aplic.modo==='todos') return true;
  if((aplic.excluir||[]).includes(hotel.id)) return false;
  if((aplic.hoteis||[]).includes(hotel.id)) return true;
  if((aplic.regioes||[]).includes(hotel.regiao)) return true;
  return false;
}
function aplicResumo(aplic){
  if(!aplic || aplic.modo==='todos') return 'todos os hotéis';
  const nH=(aplic.hoteis||[]).length, nR=(aplic.regioes||[]).length, nE=(aplic.excluir||[]).length;
  const p=[]; if(nR) p.push(nR+' regi'+(nR>1?'ões':'ão')); if(nH) p.push(nH+' hotel'+(nH>1?'éis':'')); 
  let s=p.join(' + ')||'nenhum hotel'; if(nE) s+=' (–'+nE+')'; return s;
}
function hoteisDaLinha(aplic){ return DB.hoteis.filter(h=>linhaAplicaAoHotel(aplic,h)); }

/* Resolve o índice de uma categoria para um hotel: 1º override que o cobre, senão o base */
function indiceParaHotel(cat, hotel){
  if(cat.indiceOverrides && cat.indiceOverrides.length){
    for(const ov of cat.indiceOverrides){
      if(linhaAplicaAoHotel(ov.aplic, hotel)) return Number(ov.valor);
    }
  }
  return Number(cat.indice);
}

/* ---------- DB fresco ---------- */
function seedCatalogoComAplic(){
  const c=JSON.parse(JSON.stringify(SEED_CATALOGO));
  c.categorias.forEach(cat=>cat.linhas.forEach(l=>{ if(!l.aplic) l.aplic=defAplic(); }));
  return c;
}
function freshDB(){
  const regioes=[...new Set(SEED_HOTEIS.map(h=>h.regiao))].sort();
  const hoteis=SEED_HOTEIS.map(h=>({...h, quartos:0}));
  const camp0=novaCampanhaObj('Outubro 2026');
  return {
    users:[{ id:uid(), username:'admin', password:'', nome:'Administrador', role:'DO', hoteis:[], ativo:true }],
    hoteis, regioes,
    catalogo: seedCatalogoComAplic(),
    campanhas:[ camp0 ],
    // invent[campId][hotelId] = { linhas:[...], camasDetalhe:{}, quartos, updatedAt, updatedBy, aprovadoPor }
    invent:{ [camp0.id]:{} },
    log:[],
    meta:{ created: now() }
  };
}
function novaCampanhaObj(nome){
  return { id:uid(), nome, criada:now(), criadaPor:(SESSION?SESSION.nome:'sistema'), fechada:false, fechadaEm:null };
}
function campanhaAtiva(){ return DB.campanhas.find(c=>c.id===CURRENT_CAMP) || DB.campanhas.find(c=>!c.fechada) || DB.campanhas[DB.campanhas.length-1] || null; }
function campanhaAnterior(campId){
  const idx=DB.campanhas.findIndex(c=>c.id===campId);
  return idx>0 ? DB.campanhas[idx-1] : null;
}

/* Peças por cama (regra VG): FIXA e EXTRA/sofá por categoria "por cama".
   vestido 100% = peças-por-cama × camas; par-stock = vestido 100% × índice.
   Camas extra/sofá levam sempre 1 colcha + 2 lençóis (do tipo C/ Colcha), 0 de edredão. */
const PECAS_FIXA_DEFAULT = { 'Lençol (C/ Colcha)':2, 'Lençol (C/ Edredão)':1, 'Colcha de Favo':1, 'Edredão':1, 'Saco de Edredão':1, 'Cobertores':1, 'Resguardos':1 };
const PECAS_EXTRA_DEFAULT = { 'Lençol (C/ Colcha)':2, 'Colcha de Favo':1, 'Lençol (C/ Edredão)':0, 'Edredão':0, 'Saco de Edredão':0, 'Cobertores':0, 'Resguardos':0 };
function pecasFixaDe(cat){ if(!cat)return 0; if(cat.pecasFixa!==undefined&&cat.pecasFixa!=='')return num(cat.pecasFixa); return PECAS_FIXA_DEFAULT[cat.nome]!==undefined?PECAS_FIXA_DEFAULT[cat.nome]:1; }
function pecasExtraDe(cat){ if(!cat)return 0; if(cat.pecasExtra!==undefined&&cat.pecasExtra!=='')return num(cat.pecasExtra); return PECAS_EXTRA_DEFAULT[cat.nome]!==undefined?PECAS_EXTRA_DEFAULT[cat.nome]:0; }

function migrate(d){
  d.users=d.users||[]; d.hoteis=d.hoteis||[]; d.regioes=d.regioes||[];
  d.catalogo=d.catalogo||seedCatalogoComAplic();
  d.log=d.log||[]; d.meta=d.meta||{created:now()};
  if(!d.users.some(u=>u.role==='DO'))
    d.users.unshift({id:uid(),username:'admin',password:'',nome:'Administrador',role:'DO',hoteis:[],ativo:true});
  // garante aplic em todas as linhas do catálogo (migração do upgrade)
  d.catalogo.categorias.forEach(cat=>{ if(!cat.indiceOverrides) cat.indiceOverrides=[]; cat.linhas.forEach(l=>{ if(!l.aplic) l.aplic=defAplic(); }); });
  // ---- Migração: peças por cama (fixa/extra) por categoria ----
  // vestido 100% = peças-por-cama × camas; par-stock = vestido 100% × índice
  d.catalogo.categorias.forEach(cat=>{
    if(cat.porCama){
      if(cat.pecasFixa===undefined) cat.pecasFixa = PECAS_FIXA_DEFAULT[cat.nome]!==undefined ? PECAS_FIXA_DEFAULT[cat.nome] : 1;
      if(cat.pecasExtra===undefined) cat.pecasExtra = PECAS_EXTRA_DEFAULT[cat.nome]!==undefined ? PECAS_EXTRA_DEFAULT[cat.nome] : 0;
    }
  });
  // ---- Migração para campanhas ----
  if(!d.campanhas){
    const camp0=novaCampanhaObj('Outubro 2026');
    d.campanhas=[camp0];
    const oldInvent = d.invent||{};
    d.invent={ [camp0.id]: oldInvent };  // o inventário antigo (com vestido100/param) migra para Out 2026
  }
  d.invent=d.invent||{};
  d.campanhas.forEach(c=>{ if(!d.invent[c.id]) d.invent[c.id]={}; });
  return d;
}

/* ---------- Helpers ---------- */
function uid(){ return 'id'+Math.random().toString(36).slice(2,10); }
function now(){ return new Date().toISOString(); }
function fmt(n){ if(n===''||n==null||isNaN(n)) return '—'; return Math.round(n).toLocaleString('pt-PT'); }
function fmt1(n){ if(n===''||n==null||isNaN(n)) return '—'; return (Math.round(n*10)/10).toLocaleString('pt-PT'); }
function dt(iso){ if(!iso) return '—'; const d=new Date(iso); return d.toLocaleDateString('pt-PT')+' '+d.toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'}); }
function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function toast(msg, err=false){ const t=window.HK35Root.getElementById('toast'); t.textContent=msg; t.className='toast show'+(err?' err':''); setTimeout(()=>t.className='toast',2600); }

function logAdd(acao, detalhe, extra){
  const e={ id:uid(), ts:now(), user:SESSION.nome, role:SESSION.role, acao, detalhe };
  if(extra && typeof extra==='object'){ if(extra.de!==undefined)e.de=extra.de; if(extra.para!==undefined)e.para=extra.para; if(extra.hotel)e.hotel=extra.hotel; if(extra.campo)e.campo=extra.campo; }
  DB.log.unshift(e);
  if(DB.log.length>4000) DB.log.length=4000;
}

/* ---------- Permissões ---------- */
function isDO(){ return SESSION && SESSION.role==='DO'; }
function isCompras(){ return SESSION && SESSION.role==='Compras'; }
function isGovernanta(){ return SESSION && SESSION.role==='Governanta'; }
/* Compras: vê tudo, só-leitura. Governanta: modo mobile de contagem (existências+quebras). */
function podeEditar(){ return SESSION && SESSION.role!=='Compras' && SESSION.role!=='Governanta'; }
function veTodosHoteis(){ return isDO() || isCompras(); }
function hotelVisivel(h){
  if(veTodosHoteis()) return true;
  return SESSION.hoteis.includes(h.id);
}
/* Nome do hotel para ordenação: ignora o prefixo "VG"/"VG Collection" à cabeça */
function nomeOrd(h){ return String(h&&h.nome||'').replace(/^\s*VG\s+/i,'').trim().toLowerCase(); }
/* Ordena uma lista de hotéis alfabeticamente pelo nome real (sem "VG") */
function ordenarHoteis(arr){ return arr.slice().sort((a,b)=>nomeOrd(a).localeCompare(nomeOrd(b),'pt')); }
function hoteisVisiveis(){ return ordenarHoteis(DB.hoteis.filter(hotelVisivel)); }

/* ---------- Auth ---------- */
async function doLogin(){
  const u=window.HK35Root.getElementById('loginUser').value.trim();
  const p=window.HK35Root.getElementById('loginPass').value;
  const err=window.HK35Root.getElementById('loginErr');
  const user=DB.users.find(x=>x.username.toLowerCase()===u.toLowerCase());
  if(!user||user.password!==p){ err.textContent='Credenciais inválidas.'; return; }
  if(!user.ativo){ err.textContent='Utilizador inativo. Contacte a Direção de Operações.'; return; }
  SESSION=user; err.textContent='';
  const ca=campanhaAtiva(); CURRENT_CAMP=ca?ca.id:null;
  logAdd('Login','Sessão iniciada'); saveDB();
  window.HK35Root.getElementById('login').classList.add('hidden');
  if(isGovernanta()){ iniciarPresenca(); iniciarSync(); abrirModoGovernanta(); return; }
  window.HK35Root.getElementById('app').classList.remove('hidden');
  window.HK35Root.getElementById('fUser').textContent=user.nome;
  window.HK35Root.getElementById('fRole').innerHTML=roleBadge(user.role);
  buildNav(); go('dash');
  iniciarPresenca();
  iniciarSync();
  avisoNuvem();
}
/* Aviso persistente se o backend Netlify não estiver a responder (dados só locais) */
function avisoNuvem(){
  const existe=window.HK35Root.getElementById('cloudWarn'); if(existe) existe.remove();
  if(CLOUD_OK) return;
  const head=window.HK35Root.querySelector('.head');
  const div=document.createElement('div');
  div.id='cloudWarn';
  div.style.cssText='background:#fbe8e6;color:#8a2a1e;border-bottom:1px solid #e6b3ab;padding:9px 26px;font-size:12.5px;font-weight:600';
  div.innerHTML='⚠ Sem ligação à base de dados na nuvem — os dados estão a ser guardados <b>apenas neste browser</b> e não são partilhados. Verifique se a Netlify Function está publicada em <code>netlify/functions/hk-store.js</code>.';
  head.parentNode.insertBefore(div, head.nextSibling);
}
/* Verifica uma password de DO (qualquer utilizador DO ativo). Usado para validar aprovações. */
function validaPasswordDO(pass){
  return DB.users.some(u=>u.role==='DO'&&u.ativo&&u.password===pass);
}
/* Utilizador altera a própria palavra-passe */
function mudarPassword(){
  modal('Alterar palavra-passe',`
    <div class="field"><label>Palavra-passe atual</label><input id="pwOld" type="password" autocomplete="current-password" placeholder="••••••••"></div>
    <div class="field" style="margin-top:12px"><label>Nova palavra-passe</label><input id="pwNew" type="password" autocomplete="new-password" placeholder="mínimo 4 caracteres"></div>
    <div class="field" style="margin-top:12px"><label>Confirmar nova palavra-passe</label><input id="pwNew2" type="password" autocomplete="new-password" placeholder="repita a nova"></div>
    <div id="pwErr" style="color:var(--red);font-size:12.5px;margin-top:10px;min-height:16px"></div>`,
    [{t:'Guardar',cls:'btn-gold',fn:()=>{
      const err=window.HK35Root.getElementById('pwErr');
      const o=window.HK35Root.getElementById('pwOld').value, n=window.HK35Root.getElementById('pwNew').value, n2=window.HK35Root.getElementById('pwNew2').value;
      if(o!==SESSION.password){ err.textContent='Palavra-passe atual incorreta.'; return; }
      if(n.length<4){ err.textContent='A nova palavra-passe tem de ter pelo menos 4 caracteres.'; return; }
      if(n!==n2){ err.textContent='A confirmação não coincide.'; return; }
      if(n===o){ err.textContent='A nova palavra-passe tem de ser diferente da atual.'; return; }
      const u=DB.users.find(x=>x.id===SESSION.id); u.password=n; SESSION.password=n;
      logAdd('Palavra-passe alterada', SESSION.username);
      saveDB(); closeModal(); toast('Palavra-passe alterada com sucesso');
    }},{t:'Cancelar',cls:'btn-ghost',fn:closeModal}]);
}
function logout(){ const dashboardSession=!!SESSION?._dashboard; if(SESSION){ pararPresenca(); pararSync(); logAdd('Logout','Sessão terminada'); saveDB(); } SESSION=null; if(dashboardSession&&typeof window.vgAuthLogout==='function'){ window.vgAuthLogout(); return; } location.reload(); }
function roleBadge(r){ return r==='DO'?'<span class="badge b-do">Direção Operações</span>':r==='Compras'?'<span class="badge b-compras">Compras</span>':r==='Governanta'?'<span class="badge b-gov">Governanta</span>':r==='Diretor'?'<span class="badge b-dir">Diretor</span>':'<span class="badge b-ass">Assistente</span>'; }

/* ---------- Navegação ---------- */
function buildNav(){
  const items=[
    {sec:'Operação'},
    {v:'dash', ic:'▣', t:'Painel'},
    {v:'param', ic:'▤', t:'Inventário'},
    {v:'proj', ic:'◈', t:'Projeção de compra'},
  ];
  if(veTodosHoteis()){
    items.push({v:'exec', ic:'★', t:'Relatório executivo'});
    items.push({v:'comparar', ic:'◔', t:'Comparação campanhas'});
    items.push({v:'quebras', ic:'⚠', t:'Análise de quebras'});
    items.push({v:'mapames', ic:'▦', t:'Mapa de quebras'});
    items.push({v:'valor', ic:'€', t:'Valorização financeira'});
    items.push({v:'alertas', ic:'▲', t:'Alertas de rutura'});
  }
  if(isDO()){
    items.push({sec:'Administração'});
    items.push({v:'campanhas', ic:'◷', t:'Campanhas de inventário'});
    items.push({v:'users', ic:'◉', t:'Utilizadores & acessos'});
    items.push({v:'catalogo', ic:'☰', t:'Catálogo de roupas'});
    items.push({v:'log', ic:'⟲', t:'Registo de alterações'});
  }
  const nav=window.HK35Root.getElementById('nav');
  nav.innerHTML=items.map(i=>{
    if(i.sec) return '<div class="sec">'+i.sec+'</div>';
    return '<a data-v="'+i.v+'" onclick="go(\''+i.v+'\')"><span class="ic">'+i.ic+'</span>'+i.t+'</a>';
  }).join('');
}
function go(v){
  if(DIRTY && CURRENT_VIEW==='param' && v!=='param'){ flushSave(); }
  CURRENT_VIEW=v;
  window.HK35Root.querySelectorAll('.nav a').forEach(a=>a.classList.toggle('active',a.dataset.v===v));
  window.HK35Root.getElementById('headActions').innerHTML='';
  const R=VIEWS[v]; if(!R){ return; }
  window.HK35Root.getElementById('vTitle').textContent=R.title;
  window.HK35Root.getElementById('vCrumb').textContent=R.crumb||'';
  R.render();
}



/* ============================================================
   VIEWS
   ============================================================ */
const VIEWS={};

/* ---------- Cálculo de uma linha de inventário ---------- */
function calcLinha(l){
  const vestido = num(l.vestido100);
  const indice  = num(l.indice)||0;
  const exist   = existenciasEfetivas(l);
  // Par-stock: manual sobrepõe; senão índice × vestido 100%
  const par = (l.parManual!==''&&l.parManual!=null&&!isNaN(l.parManual)) ? num(l.parManual) : indice*vestido;
  const sugerida = par - exist;
  const aprov = (l.aprovadoDO!==''&&l.aprovadoDO!=null&&!isNaN(l.aprovadoDO)) ? num(l.aprovadoDO) : (sugerida>0?Math.round(sugerida):0);
  return { par, sugerida, aprov };
}

/* Sugestão dinâmica face à ocupação prevista (não altera o par-stock nem a sugestão normal).
   par ajustado = par × occ%, com piso: nunca abaixo de par × piso%.
   sugestão dinâmica = par ajustado − existências (nunca negativa). */
/* ============================================================
   MOTOR DE MOVIMENTOS DE STOCK (livro-razão por artigo)
   existências efetivas = baseContada + Σ entradas − Σ quebras (desde a base)
   Retrocompatível: se não há base nem movimentos, usa l.existencias tal como estava.
   ============================================================ */
/* Normaliza uma data para "AAAA-MM" (mês) e "AAAA-MM-DD" */
function movMes(iso){ return String(iso||'').slice(0,7); }
function movDia(iso){ return String(iso||'').slice(0,10); }
/* Soma dos movimentos de um tipo (opcionalmente só a partir de uma data-âncora) */
function somaMovs(l, tipo, desdeISO){
  if(!l.movs || !l.movs.length) return 0;
  let t=0;
  for(const m of l.movs){ if(m.tipo!==tipo) continue; if(desdeISO && m.data < desdeISO) continue; t += num(m.qt); }
  return t;
}
/* A base é o valor contado na última verificação. Se não existir, usa-se o existencias atual
   como base implícita (retrocompatibilidade com o que já está preenchido). */
function baseDe(l){
  if(l.baseContada!==undefined && l.baseContada!=='' && l.baseContada!=null) return num(l.baseContada);
  return num(l.existencias); // legado
}
function baseDataDe(l){ return l.baseData || null; }
function temMovs(l){ return !!(l.movs && l.movs.length); }
/* Existências efetivas = base + entradas − quebras desde a data da base */
function existenciasEfetivas(l){
  const base=baseDe(l); const desde=baseDataDe(l);
  const entradas=somaMovs(l,'entrada',desde);
  const quebras=somaMovs(l,'quebra',desde);
  return base + entradas - quebras;
}
/* Regista um movimento (quebra − / entrada +) com data/hora e autor. NÃO grava sozinho. */
function registarMov(l, tipo, qt, quemNome, dataISO, causa){
  qt=num(qt); if(qt<=0) return false;
  l.movs = l.movs || [];
  const mov={ id:uid(), tipo, qt, data: dataISO||now(), quem: quemNome||'' };
  if(tipo==='quebra' && causa) mov.causa=causa;
  l.movs.push(mov);
  return true;
}
/* Rótulo legível de uma causa */
function causaLabel(k){ const c=CAUSAS_QUEBRA.find(x=>x.k===k); return c?c.label:'Não especificada'; }
/* Soma das quebras (movimentos) por causa, para a Análise de quebras.
   Inclui movimentos ativos + arquivados; quebras sem causa contam como 'semCausa'. */
function causasDeMovimentos(l){
  const out={}; const todos=(l.movs||[]).concat(l.movsArquivo||[]);
  todos.filter(m=>m.tipo==='quebra').forEach(m=>{ const k=m.causa||'semCausa'; out[k]=(out[k]||0)+num(m.qt); });
  return out;
}
/* Define/atualiza a base contada (contagem física de verificação) e regista o acerto.
   Devolve a diferença (contado − teórico anterior) para se pedir justificação. */
function definirBaseContada(l, valorContado, dataISO){
  const teoricoAntes = existenciasEfetivas(l);
  const dif = num(valorContado) - teoricoAntes;
  l.baseContada = num(valorContado);
  l.baseData = dataISO || now();
  // a base passa a ser a nova âncora: os movimentos anteriores já estão "consumidos" nela,
  // por isso arquivamo-los para o histórico e limpamos os que contam para o futuro.
  if(l.movs && l.movs.length){ l.movsArquivo = (l.movsArquivo||[]).concat(l.movs.map(m=>({...m, ateBase:l.baseData}))); l.movs=[]; }
  return dif;
}

function calcDinamica(l, inv){
  const cc=calcLinha(l);
  const occ = inv && inv.ocupacao!=null && inv.ocupacao!=='' ? num(inv.ocupacao)/100 : null;
  if(occ==null) return { ativo:false, sugDin:null, parAjust:null };
  const piso = (inv.pisoSeg!=null && inv.pisoSeg!=='') ? num(inv.pisoSeg)/100 : 0.70; // default 70%
  const fator = Math.max(occ, piso);
  const parAjust = Math.round(cc.par * fator);
  const sugDin = Math.max(0, parAjust - existenciasEfetivas(l));
  return { ativo:true, sugDin, parAjust, fator };
}
function setOcupacao(hid,v){ const inv=invDoHotel(hid); if(!podeEditarInv(inv))return; inv.ocupacao = v===''?'':Math.min(100,Math.max(0,num(v))); autosave(); renderParam(); }
function setPisoSeg(hid,v){ const inv=invDoHotel(hid); if(!podeEditarInv(inv))return; inv.pisoSeg = v===''?'':Math.min(100,Math.max(0,num(v))); autosave(); renderParam(); }
function num(v){ if(v===''||v==null) return 0; const n=Number(v); return isNaN(n)?0:n; }

/* Camada 2 — causas de quebra */
const CAUSAS_QUEBRA=[
  {k:'fimVida', label:'Fim de vida', cor:'#64748b'},
  {k:'mancha', label:'Mancha/nódoa', cor:'#c98a12'},
  {k:'desaparecido', label:'Desaparecido/roubo', cor:'#c0392b'},
  {k:'danoLavagem', label:'Dano de lavagem', cor:'#2563b0'},
  {k:'outro', label:'Outro', cor:'#8b5cf6'},
];
function somaCausas(l){ if(!l.quebrasCausas) return 0; return CAUSAS_QUEBRA.reduce((s,c)=>s+num(l.quebrasCausas[c.k]),0); }
/* quebra efetiva da linha: se houver causas discriminadas usa a soma, senão o número simples */
function quebraLinha(l){ const mv=somaMovs(l,'quebra'); if(mv>0) return mv; const sc=somaCausas(l); return sc>0?sc:num(l.quebras); }

/* Código de cor por medida (varia por hotel) — 10 cores conhecidas + tipo (etiqueta/linha) */
const CORES=[
  {k:'vermelho', label:'Vermelho', hex:'#e02424'},
  {k:'azul',     label:'Azul',     hex:'#2563b0'},
  {k:'verde',    label:'Verde',    hex:'#1f9d63'},
  {k:'amarelo',  label:'Amarelo',  hex:'#e6b800'},
  {k:'laranja',  label:'Laranja',  hex:'#e8730c'},
  {k:'roxo',     label:'Roxo',     hex:'#8b5cf6'},
  {k:'rosa',     label:'Rosa',     hex:'#e84393'},
  {k:'castanho', label:'Castanho', hex:'#8b5a2b'},
  {k:'preto',    label:'Preto',    hex:'#1f2937'},
  {k:'branco',   label:'Branco',   hex:'#ffffff'},
];
function corInfo(k){ return CORES.find(c=>c.k===k)||null; }
function corLabel(l){ const c=corInfo(l&&l.cor); if(!c) return ''; const t=l.corTipo==='linha'?'linha':l.corTipo==='etiqueta'?'etiqueta':''; return c.label+(t?' ('+t+')':''); }

/* Constrói (ou recupera) as linhas de inventário de um hotel numa campanha,
   materializando apenas as linhas do catálogo aplicáveis a esse hotel.
   Herda parametrização (vestido100, camas, quartos, índice) e Inv. Anterior
   (= existências) da campanha anterior, na primeira vez que a campanha é aberta. */
function ensureInvent(hid, campId){
  campId = campId || CURRENT_CAMP;
  if(!DB.invent[campId]) DB.invent[campId]={};
  const store=DB.invent[campId];
  const hotel=DB.hoteis.find(h=>h.id===hid);
  if(!store[hid]) store[hid]={ linhas:[], camasDetalhe:{}, quartos:(hotel?hotel.quartos:0), updatedAt:null, updatedBy:null, aprovadoPor:null };
  const inv=store[hid];

  // snapshot da campanha anterior para herança
  const campPrev=campanhaAnterior(campId);
  const prevInv = campPrev && DB.invent[campPrev.id] ? DB.invent[campPrev.id][hid] : null;
  const prevMap={}; if(prevInv) prevInv.linhas.forEach(l=>prevMap[l.cat+'|'+l.cama+'|'+l.medida]=l);

  const key=l=>l.cat+'|'+l.cama+'|'+l.medida;
  const existentes={}; inv.linhas.forEach(l=>existentes[key(l)]=l);
  const novas=[];
  DB.catalogo.categorias.forEach(cat=>{
    cat.linhas.forEach(li=>{
      if(!linhaAplicaAoHotel(li.aplic, hotel)) return; // só linhas aplicáveis ao hotel
      const k=cat.nome+'|'+(li.cama||'')+'|'+(li.medida||'');
      const idxHotel=indiceParaHotel(cat, hotel);
      const custoCat=(li.custo!==''&&li.custo!=null)?li.custo:'';
      if(existentes[k]){ const e=existentes[k]; if(e.indice==null)e.indice=idxHotel; if((e.unit===''||e.unit==null)&&custoCat!=='')e.unit=custoCat; novas.push(e); }
      else {
        const prev=prevMap[k];
        novas.push({ cat:cat.nome, cama:li.cama||'', medida:li.medida||'',
          // herda parametrização estável da campanha anterior
          vestido100: prev? (prev.vestido100||'') : '',
          // Inv. Anterior herda as EXISTÊNCIAS da campanha anterior (editável por cima)
          invAnterior: prev? (prev.existencias!==''&&prev.existencias!=null? prev.existencias : '') : '',
          existencias:'', quebras:'',
          indice: prev? (prev.indice??idxHotel) : idxHotel,
          parManual: prev? (prev.parManual||'') : '',
          aprovadoDO:'', unit: (prev&&prev.unit!==''&&prev.unit!=null)? prev.unit : custoCat });
      }
    });
  });
  inv.linhas=novas;
  // herda distribuição de camas e quartos da campanha anterior se ainda vazios
  if(prevInv){
    if((!inv.camasDetalhe||!Object.keys(inv.camasDetalhe).length) && prevInv.camasDetalhe) inv.camasDetalhe={...prevInv.camasDetalhe};
    if(!inv.quartos && prevInv.quartos) inv.quartos=prevInv.quartos;
  }
  return inv;
}
function invDoHotel(hid, campId){ campId=campId||CURRENT_CAMP; return (DB.invent[campId]||{})[hid]||null; }
function campFechada(campId){ const c=DB.campanhas.find(x=>x.id===(campId||CURRENT_CAMP)); return c?c.fechada:false; }
/* Hotel aprovado nesta campanha = bloqueado para todos (incl. DO) até reabrir */
function hotelAprovado(inv){ return !!(inv && inv.aprovado); }

/* ============================================================
   PAINEL
   ============================================================ */
VIEWS.dash={ title:'Painel', crumb:'Visão geral do inventário têxtil', render(){
  const hs=hoteisVisiveis();
  const camp=campanhaAtiva();
  if(camp) CURRENT_CAMP=camp.id;
  let totVestido=0,totExist=0,totQuebra=0,totSug=0,totAprov=0,nParam=0;
  hs.forEach(h=>{
    const inv=invDoHotel(h.id); if(!inv||!inv.updatedAt) return; nParam++;
    inv.linhas.forEach(l=>{ const c=calcLinha(l);
      totVestido+=num(l.vestido100); totExist+=existenciasEfetivas(l); totQuebra+=num(l.quebras);
      if(c.sugerida>0) totSug+=c.sugerida; totAprov+=c.aprov; });
  });
  const c=window.HK35Root.getElementById('content');
  c.innerHTML=`
    <div class="toolbar">
      <div class="field" style="min-width:230px"><label>Campanha de inventário</label>
        ${campSelectHTML('onchange="mudarCampanha(this.value,\'dash\')"')}</div>
      ${camp?`<div style="align-self:flex-end;padding-bottom:9px">${camp.fechada?'<span class="badge b-off">fechada · só leitura</span>':'<span class="badge b-on">aberta</span>'}</div>`:''}
    </div>
    <div class="grid4" style="margin-bottom:22px">
      <div class="kpi"><div class="l">Hotéis visíveis</div><div class="v">${hs.length}</div><div class="s">${nParam} com inventário nesta campanha</div></div>
      <div class="kpi"><div class="l">Existências</div><div class="v">${fmt(totExist)}</div><div class="s">peças em stock</div></div>
      <div class="kpi"><div class="l">Compra sugerida</div><div class="v" style="color:var(--blue)">${fmt(totSug)}</div><div class="s">para repor par-stock a 100%</div></div>
      <div class="kpi"><div class="l">Compra aprovada DO</div><div class="v" style="color:var(--gold-d)">${fmt(totAprov)}</div><div class="s">quantidade validada</div></div>
    </div>
    <div class="card">
      <div class="ch"><h2>Hotéis</h2><div class="d">${camp?esc(camp.nome):'sem campanha'} · estado por unidade</div></div>
      <div class="tbl-wrap">
        <table><thead><tr>
          <th>Hotel</th><th>Região</th><th>País</th><th class="num">Quartos</th>
          <th class="num">Existências</th><th class="num">Quebras</th><th class="num">Compra sug.</th>
          <th class="num">Aprovado DO</th><th>Gravado</th><th></th>
        </tr></thead><tbody>
        ${hs.map(h=>{
          const inv=invDoHotel(h.id); let ex=0,qb=0,sg=0,ap=0;
          if(inv&&inv.updatedAt) inv.linhas.forEach(l=>{const cc=calcLinha(l); ex+=existenciasEfetivas(l);qb+=num(l.quebras); if(cc.sugerida>0)sg+=cc.sugerida; ap+=cc.aprov;});
          return `<tr>
            <td><b>${esc(h.nome)}</b></td><td>${esc(h.regiao)}</td><td>${esc(h.pais)}</td>
            <td class="num">${(inv&&inv.quartos)||h.quartos||'—'}</td>
            <td class="num">${inv&&inv.updatedAt?fmt(ex):'—'}</td>
            <td class="num">${inv&&inv.updatedAt?fmt(qb):'—'}</td>
            <td class="num pos">${inv&&inv.updatedAt?fmt(sg):'—'}</td>
            <td class="num" style="color:var(--gold-d);font-weight:600">${inv&&inv.updatedAt?fmt(ap):'—'}</td>
            <td style="font-size:12px;color:var(--muted)">${inv&&inv.updatedAt?dt(inv.updatedAt):'<span class="chip" style="background:#f1f5f9;color:#94a3b8">por preencher</span>'}</td>
            <td><button class="btn btn-ghost btn-sm" onclick="openHotel('${h.id}')">Abrir ›</button></td>
          </tr>`;}).join('')}
        </tbody></table>
      </div>
    </div>`;
}};

/* selector de campanhas reutilizável */
function campSelectHTML(attrs){
  return `<select ${attrs}>${DB.campanhas.map(c=>`<option value="${c.id}" ${c.id===CURRENT_CAMP?'selected':''}>${esc(c.nome)}${c.fechada?' (fechada)':''}</option>`).join('')}</select>`;
}
function mudarCampanha(id, back){
  if(DIRTY) flushSave();
  CURRENT_CAMP=id; go(back||CURRENT_VIEW);
}

/* ============================================================
   PARAMETRIZAÇÃO
   ============================================================ */
VIEWS.param={ title:'Inventário', crumb:'Contagem, parametrização e par-stock por hotel', render(){
  const c=window.HK35Root.getElementById('content');
  const hs=hoteisVisiveis();
  const camp=campanhaAtiva();
  if(!camp){ c.innerHTML='<div class="empty"><div class="ic">▤</div>Não existe nenhuma campanha de inventário. Peça à Direção de Operações para criar uma.</div>'; return; }
  CURRENT_CAMP=camp.id;
  if(!CURRENT_HOTEL||!hs.some(h=>h.id===CURRENT_HOTEL)) CURRENT_HOTEL=hs[0]?hs[0].id:null;
  if(!CURRENT_HOTEL){ c.innerHTML='<div class="empty"><div class="ic">▤</div>Sem hotéis atribuídos ao seu utilizador.</div>'; return; }
  renderParam();
}};

function openHotel(hid){ CURRENT_HOTEL=hid; go('param'); }
/* troca de hotel com guarda de alterações por gravar */
function trocarHotel(hid){
  if(hid===CURRENT_HOTEL) return;
  if(DIRTY) flushSave();
  CURRENT_HOTEL=hid; renderParam();
}

function renderParam(){
  const c=window.HK35Root.getElementById('content');
  const hs=hoteisVisiveis();
  const camp=campanhaAtiva();
  const h=DB.hoteis.find(x=>x.id===CURRENT_HOTEL);
  const inv=ensureInvent(h.id);
  const aprovado = hotelAprovado(inv);
  // Só-leitura se: campanha fechada, perfil Compras, OU hotel já aprovado (bloqueio total até reabrir)
  const RO = camp.fechada || isCompras() || aprovado;
  DIRTY=false;
  window.HK35Root.getElementById('headActions').innerHTML=
    aprovado
    ? `<span class="badge" style="background:var(--green-bg);color:var(--green)">✓ aprovado · bloqueado</span>
       <button class="btn btn-ghost btn-sm" onclick="exportInventHotel()">Exportar Excel</button>
       ${isDO()?'<button class="btn btn-ghost btn-sm" style="color:var(--red);border-color:#e6b3ab" onclick="limparInvent()">Limpar inventário</button>':''}
       ${isDO()?'<button class="btn btn-gold btn-sm" onclick="reabrirInvent()">Reabrir para edição</button>':''}`
    : (camp.fechada || isCompras())
    ? `<span class="badge b-off">${camp.fechada?'campanha fechada · só leitura':'consulta · só leitura'}</span>
       <button class="btn btn-ghost btn-sm" onclick="exportInventHotel()">Exportar Excel</button>`
    : `<span class="saving" id="saveState">Estado: <b>guardado</b></span>
       <button class="btn btn-ghost btn-sm" onclick="exportInventHotel()">Exportar Excel</button>
       <button class="btn btn-ghost btn-sm" onclick="importInvent()">Importar Excel</button>
       ${isDO()?'<button class="btn btn-ghost btn-sm" style="color:var(--red);border-color:#e6b3ab" onclick="limparInvent()">Limpar inventário</button>':''}
       <button class="btn btn-gold btn-sm" onclick="gravarInvent()">Aprovar (DO) ✓</button>`;

  // totais + cobertura (categorias sem linha aplicável)
  let tPar=0,tSug=0,tAprov=0,tExist=0,tQb=0;
  inv.linhas.forEach(l=>{const cc=calcLinha(l); tPar+=cc.par; tExist+=existenciasEfetivas(l); tQb+=num(l.quebras); if(cc.sugerida>0)tSug+=cc.sugerida; tAprov+=cc.aprov;});
  const catsComLinha=new Set(inv.linhas.map(l=>l.cat));
  const semCobertura=DB.catalogo.categorias.filter(cat=>!catsComLinha.has(cat.nome)).map(cat=>cat.nome);

  const dis=RO?'disabled':'';
  c.innerHTML=`
    <div class="toolbar">
      <div class="field" style="min-width:220px"><label>Campanha de inventário</label>
        ${campSelectHTML('onchange="mudarCampanha(this.value,\'param\')"')}</div>
      <div class="field" style="min-width:260px"><label>Hotel</label>
        <select onchange="trocarHotel(this.value)">
          ${hs.map(x=>`<option value="${x.id}" ${x.id===h.id?'selected':''}>${esc(x.nome)} — ${esc(x.regiao)}</option>`).join('')}
        </select></div>
      <div class="field" style="max-width:120px"><label>Nº de quartos</label>
        <input type="number" min="0" value="${inv.quartos||h.quartos||''}" ${dis} onchange="setQuartos('${h.id}',this.value)"></div>
      <div class="field" style="max-width:150px"><label>Distribuição de camas</label>
        <button class="btn btn-nav" style="width:100%" onclick="openCamasDetalhe('${h.id}')">Detalhe por medida ›</button></div>
      <div class="field" style="max-width:130px"><label title="Ocupação média prevista para o período">Ocupação prev. (%)</label>
        <input type="number" min="0" max="100" placeholder="—" value="${inv.ocupacao!=null&&inv.ocupacao!==''?inv.ocupacao:''}" ${dis} onchange="setOcupacao('${h.id}',this.value)"></div>
      <div class="field" style="max-width:120px"><label title="A sugestão dinâmica nunca desce abaixo desta fração do par-stock">Piso segur. (%)</label>
        <input type="number" min="0" max="100" placeholder="70" value="${inv.pisoSeg!=null&&inv.pisoSeg!==''?inv.pisoSeg:''}" ${dis} onchange="setPisoSeg('${h.id}',this.value)"></div>
    </div>

    ${aprovado?`<div class="help" style="background:var(--green-bg);border-color:#a8dcc0;color:#1f7a54"><b>✓ Inventário aprovado e bloqueado.</b> Aprovado por <b>${esc(inv.aprovadoPor||'—')}</b> em ${inv.aprovadoEm?dt(inv.aprovadoEm):'—'}${inv.reaprovacoes?` · ${inv.reaprovacoes} reaprovação(ões)`:''}. Nenhum dado pode ser alterado neste hotel${isDO()?' — para corrigir, use <b>Reabrir para edição</b> (requer sessão de Direção e fica registado).':' até a Direção de Operações reabrir.'}</div>`:''}
    <div class="help">${isCompras()?'<b>Perfil de consulta (Compras):</b> vê todos os hotéis e pode exportar, mas não altera dados. ':'As alterações são <b>guardadas automaticamente na nuvem</b> — não se perde trabalho ao fechar o separador. O botão <b>Aprovar (DO)</b> valida as quantidades de compra com a sessão autenticada da Direção de Operações e <b>bloqueia</b> o hotel. '}<b>Par-stock</b> = índice × vestido 100%. <b>Compra sugerida</b> = par-stock − existências.</div>
    ${(inv.ocupacao!=null&&inv.ocupacao!=='')?(()=>{let td=0;inv.linhas.forEach(l=>{const d=calcDinamica(l,inv);if(d.ativo)td+=d.sugDin;});return `<div class="help" style="background:#f3eefb;border-color:#d9c9f0;color:#6b3fa0"><b>Sugestão dinâmica ativa</b> — ocupação prevista ${num(inv.ocupacao)}%, piso de segurança ${inv.pisoSeg!=null&&inv.pisoSeg!==''?num(inv.pisoSeg):70}%. Total sugerido ajustado: <b>${fmt(td)} peças</b> (vs ${fmt(tSug)} da sugestão normal). A coluna <b>Sug. dinâmica</b> é só de apoio à decisão — não altera o par-stock nem a compra sugerida. O par ajustado = par-stock × ocupação, nunca abaixo de par-stock × piso%.</div>`;})():''}
    ${semCobertura.length?`<div class="help" style="background:var(--amber-bg);border-color:#e6cf94;color:#8a6212">⚠ Categorias sem medida definida para este hotel: <b>${semCobertura.map(esc).join(', ')}</b>. Defina a aplicabilidade no Catálogo para as incluir.</div>`:''}

    <div class="grid4" style="margin-bottom:18px">
      <div class="kpi"><div class="l">Par-stock total</div><div class="v">${fmt(tPar)}</div></div>
      <div class="kpi"><div class="l">Existências</div><div class="v">${fmt(tExist)}</div></div>
      <div class="kpi"><div class="l">Compra sugerida</div><div class="v" style="color:var(--blue)">${fmt(tSug)}</div></div>
      <div class="kpi"><div class="l">Aprovado DO</div><div class="v" style="color:var(--gold-d)">${fmt(tAprov)}</div></div>
    </div>

    <div class="card">
      <div class="ch"><h2>${esc(camp.nome)} — ${esc(h.nome)}</h2><div class="d">${inv.updatedAt?('Última gravação: '+dt(inv.updatedAt)+' · '+esc(inv.updatedBy||'')+(inv.aprovadoPor?' · aprovado por '+esc(inv.aprovadoPor):'')):'ainda não gravado'}</div></div>
      <div class="tbl-wrap tbl-sticky">
        <table id="invTbl"><thead><tr>
          <th style="min-width:150px">Categoria</th><th>Cama</th><th>Medida roupa</th>
          <th class="num" title="Peças por cama fixa × nº de camas fixas">Vestido 100% camas fixas</th>
          <th class="num" title="Peças por cama extra × nº de camas extra e sofás">Vestido 100% camas extra e sofás</th>
          <th class="num" title="Soma: camas fixas + camas extra">Vestido 100% total</th>
          <th class="num">Inv. anterior</th><th class="num">Existências</th><th class="num">Quebras</th>
          <th class="num" title="Multiplicador de par-stock">Índice</th>
          <th class="num">Par-stock</th><th class="num">Compra sug.</th>
          <th class="num" style="color:var(--gold-d)">Aprovado DO</th>
          <th class="num" title="Compra sugerida ajustada à ocupação prevista, com piso de segurança. Não altera a sugestão normal — apoia a decisão de aprovação.">Sug. dinâmica (occ.)</th>
          <th>Cor</th>
        </tr></thead><tbody>${renderInvRows(inv,RO)}</tbody></table>
      </div>
    </div>`;
}

function renderInvRows(inv, RO){
  const dis=RO?'disabled':'';
  let html=''; let lastCat=null;
  inv.linhas.forEach((l,i)=>{
    if(l.cat!==lastCat){ lastCat=l.cat;
      html+=`<tr class="section-row"><td colspan="15">${esc(l.cat)}</td></tr>`; }
    const cc=calcLinha(l);
    const sugCls=cc.sugerida>0?'pos':'neg';
    html+=`<tr>
      <td style="color:var(--muted);font-size:12px">${esc(l.cat)}</td>
      <td>${esc(l.cama)||'—'}</td>
      <td style="font-size:12px">${esc(l.medida)||'—'}</td>
      <td class="num" style="color:var(--muted)">${(l.vestidoFixas!==undefined&&l.vestidoFixas!=='')?fmt(l.vestidoFixas):(l.vestido100!==''&&l.vestido100!=null?fmt(l.vestido100):'—')}</td>
      <td class="num" style="color:var(--muted)">${(l.vestidoExtra!==undefined&&l.vestidoExtra!=='')?fmt(l.vestidoExtra):'—'}</td>
      <td class="num"><b>${(l.vestido100!==''&&l.vestido100!=null)?fmt(num(l.vestido100)):'—'}</b></td>
      <td class="num"><input class="cell-in" style="width:80px" type="number" value="${l.invAnterior}" ${dis} oninput="upd(${i},'invAnterior',this.value)"></td>
      <td class="num"><div style="display:flex;align-items:center;gap:3px;justify-content:flex-end">
        <input class="cell-in" style="width:66px" type="number" value="${existenciasEfetivas(l)}" ${dis} title="${temMovs(l)?'Existências calculadas (base + entradas − quebras). Editar define nova contagem base.':'Existências'}" oninput="updExistencias(${i},this.value)">
        <button class="btn btn-ghost" style="padding:3px 6px;font-size:11px;${temMovs(l)?'border-color:var(--blue);color:var(--blue)':''}" onclick="openMovs(${i})" title="Movimentos (entradas e quebras)">⇅</button>
      </div></td>
      <td class="num"><div style="display:flex;align-items:center;gap:3px;justify-content:flex-end">
        ${(()=>{ const mv=somaMovs(l,'quebra'); const legado=somaCausas(l)>0?somaCausas(l):num(l.quebras); const total = mv>0?mv:legado;
          return `<span class="cell-in" style="width:60px;display:inline-flex;align-items:center;justify-content:center;background:#f7f8fa;cursor:${(!dis)?'pointer':'default'};font-weight:${total>0?'700':'400'};color:${total>0?'var(--red)':'var(--muted)'}" onclick="${(!dis)?`openMovs(${i})`:''}" title="Quebras registadas nesta campanha (movimentos). Registe pelo detalhe.">${total>0?fmt(total):'0'}</span>`; })()}
        <button class="btn btn-ghost" style="padding:3px 6px;font-size:11px;${somaMovs(l,'quebra')>0?'border-color:var(--red);color:var(--red)':''}" onclick="openMovs(${i})" title="Ver e registar quebras (movimentos)">⇅</button>
      </div></td>
      <td class="num"><input class="cell-in" style="width:58px" type="number" step="0.1" value="${l.indice}" ${dis} oninput="upd(${i},'indice',this.value)"></td>
      <td class="num"><b>${fmt(cc.par)}</b>${l.parManual!==''&&l.parManual!=null?'<span class="chip" style="background:var(--amber-bg);color:var(--amber);margin-left:4px">fixo</span>':''}</td>
      <td class="num ${sugCls}">${fmt(cc.sugerida)}</td>
      <td class="num"><input class="cell-in approve" style="width:78px" type="number" value="${l.aprovadoDO}" placeholder="${cc.sugerida>0?Math.round(cc.sugerida):0}" ${(isDO()&&!RO)?'':'disabled'} oninput="upd(${i},'aprovadoDO',this.value)"></td>
      <td class="num">${(()=>{const d=calcDinamica(l,inv);if(!d.ativo)return '<span style="color:var(--line2)">—</span>';const dif=d.sugDin-(cc.sugerida>0?Math.round(cc.sugerida):0);return `<b style="color:#6b3fa0">${fmt(d.sugDin)}</b>${dif!==0?`<span style="color:var(--muted);font-size:10.5px;display:block;line-height:1">${dif>0?'+':''}${fmt(dif)} vs sug.</span>`:''}`;})()}</td>
      <td>${corCell(l,i,RO)}</td>
    </tr>`;
  });
  return html;
}

/* Célula do código de cor: mostra bola da cor + tipo, ou "definir" */
function corCell(l,i,RO){
  const c=corInfo(l.cor);
  const clickable = !RO;
  if(!c){
    return `<button class="btn btn-ghost btn-sm" ${clickable?'':'disabled'} onclick="openCor(${i})" style="padding:4px 9px;font-size:11px;color:var(--muted)">definir</button>`;
  }
  const borda = l.cor==='branco'?'border:1.5px solid var(--line2)':'border:1.5px solid '+c.hex;
  const tipo = l.corTipo==='linha'?'linha':l.corTipo==='etiqueta'?'etiqueta':'';
  return `<button ${clickable?'':'disabled'} onclick="openCor(${i})" style="display:inline-flex;align-items:center;gap:7px;background:#fff;border:1px solid var(--line2);border-radius:20px;padding:4px 11px 4px 5px;font-size:12px;font-weight:600;color:var(--ink);cursor:${clickable?'pointer':'default'}">
    <span style="width:15px;height:15px;border-radius:50%;background:${c.hex};${borda}"></span>${c.label}${tipo?` <span style="color:var(--muted);font-weight:400">· ${tipo}</span>`:''}</button>`;
}
/* Editor do código de cor de uma medida (por hotel) */
function openCor(i){
  const inv=invDoHotel(CURRENT_HOTEL); const l=inv.linhas[i];
  const RO=campFechada()||isCompras()||hotelAprovado(inv);
  if(RO) return;
  modal(`Código de cor — ${esc(l.cat)}${l.medida?' · '+esc(l.medida):''}${l.cama?' · '+esc(l.cama):''}`,`
    <div class="help">Marque a cor de identificação desta medida <b>neste hotel</b> (pode variar de hotel para hotel) e se é etiqueta ou linha/costura.</div>
    <label style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">Cor</label>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 16px">
      ${CORES.map(c=>`<button class="corPick" data-k="${c.k}" onclick="corSel(this,'${c.k}')" title="${c.label}" style="width:34px;height:34px;border-radius:50%;background:${c.hex};border:3px solid ${l.cor===c.k?'var(--navy)':(c.k==='branco'?'var(--line2)':'transparent')};cursor:pointer;box-shadow:${c.k==='branco'?'inset 0 0 0 1px var(--line2)':'none'}"></button>`).join('')}
      <button class="corPick" data-k="" onclick="corSel(this,'')" title="Sem cor" style="width:34px;height:34px;border-radius:50%;background:#fff;border:3px solid ${!l.cor?'var(--navy)':'var(--line2)'};cursor:pointer;font-size:15px;color:var(--muted)">✕</button>
    </div>
    <label style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">Tipo de marcação</label>
    <div style="display:flex;gap:8px;margin-top:8px">
      <button class="corTipo" data-t="etiqueta" onclick="corTipoSel(this,'etiqueta')" style="flex:1;padding:11px;border-radius:9px;border:1.5px solid ${l.corTipo==='etiqueta'?'var(--navy)':'var(--line2)'};background:${l.corTipo==='etiqueta'?'var(--navy)':'#fff'};color:${l.corTipo==='etiqueta'?'#fff':'var(--ink)'};font-weight:600">Etiqueta</button>
      <button class="corTipo" data-t="linha" onclick="corTipoSel(this,'linha')" style="flex:1;padding:11px;border-radius:9px;border:1.5px solid ${l.corTipo==='linha'?'var(--navy)':'var(--line2)'};background:${l.corTipo==='linha'?'var(--navy)':'#fff'};color:${l.corTipo==='linha'?'#fff':'var(--ink)'};font-weight:600">Linha / costura</button>
    </div>`,
    [{t:'Guardar',cls:'btn-gold',fn:()=>{
      l.cor=COR_SEL; l.corTipo=COR_TIPO_SEL;
      autosave(); closeModal(); renderParam();
    }},{t:'Remover cor',cls:'btn-ghost',fn:()=>{ l.cor=''; l.corTipo=''; autosave(); closeModal(); renderParam(); }},{t:'Cancelar',cls:'btn-ghost',fn:closeModal}]);
  COR_SEL=l.cor||''; COR_TIPO_SEL=l.corTipo||'';
}
let COR_SEL='', COR_TIPO_SEL='';
function corSel(btn,k){ COR_SEL=k; window.HK35Root.querySelectorAll('.corPick').forEach(b=>b.style.borderColor=(b.dataset.k===k?'var(--navy)':(b.dataset.k==='branco'||b.dataset.k===''?'var(--line2)':'transparent'))); }
function corTipoSel(btn,t){ COR_TIPO_SEL=t; window.HK35Root.querySelectorAll('.corTipo').forEach(b=>{const on=b.dataset.t===t;b.style.borderColor=on?'var(--navy)':'var(--line2)';b.style.background=on?'var(--navy)':'#fff';b.style.color=on?'#fff':'var(--ink)';}); }

/* Gate único de edição de um hotel: perfil pode editar E hotel não aprovado E campanha não fechada */
function podeEditarInv(inv){ return podeEditar() && !hotelAprovado(inv) && !campFechada(); }

function upd(i,field,val){
  const inv=invDoHotel(CURRENT_HOTEL);
  if(!podeEditarInv(inv)) return;
  // rasto de auditoria: guarda o valor ANTES de começar a editar esta célula
  auditIniciar(CURRENT_HOTEL, i, field, inv.linhas[i][field]);
  inv.linhas[i][field]=val;
  const row=window.HK35Root.querySelectorAll('#invTbl tbody tr:not(.section-row)')[i];
  if(row){ const cc=calcLinha(inv.linhas[i]);
    row.children[10].innerHTML='<b>'+fmt(cc.par)+'</b>'+((inv.linhas[i].parManual!==''&&inv.linhas[i].parManual!=null)?'<span class="chip" style="background:var(--amber-bg);color:var(--amber);margin-left:4px">fixo</span>':'');
    const sc=row.children[11]; sc.textContent=fmt(cc.sugerida); sc.className='num '+(cc.sugerida>0?'pos':'neg');
    if(field!=='aprovadoDO'){
      const apIn=row.children[12] && row.children[12].querySelector('input');
      if(apIn){ apIn.placeholder = String(cc.sugerida>0?Math.round(cc.sugerida):0); }
      // atualiza a coluna Sugestão dinâmica (col 13), que depende de existências/par
      const dc=row.children[13];
      if(dc){ const d=calcDinamica(inv.linhas[i],inv);
        if(!d.ativo){ dc.innerHTML='<span style="color:var(--line2)">—</span>'; }
        else { const dif=d.sugDin-(cc.sugerida>0?Math.round(cc.sugerida):0);
          dc.innerHTML=`<b style="color:#6b3fa0">${fmt(d.sugDin)}</b>${dif!==0?`<span style="color:var(--muted);font-size:10.5px;display:block;line-height:1">${dif>0?'+':''}${fmt(dif)} vs sug.</span>`:''}`; }
      }
    }
  }
  auditAgendar(inv, i, field);
  inv.rascunhoEm=now(); autosave();
}

/* Editar a célula Existências = definir nova CONTAGEM BASE (âncora).
   Se houver movimentos e a diferença for relevante, pede justificação (acerto). */
function updExistencias(i,val){
  const inv=invDoHotel(CURRENT_HOTEL);
  if(!podeEditarInv(inv)) return;
  const l=inv.linhas[i];
  const novo=num(val);
  if(!temMovs(l) && (l.baseContada===undefined||l.baseContada==='')){
    // caso simples/legado: ainda não há motor ativo nesta linha → escreve direto como base
    l.existencias=val; l.baseContada=novo; l.baseData=now();
    auditRegistarExist(inv,i,l,novo);
    inv.rascunhoEm=now(); autosave(); return;
  }
  // há movimentos/base: editar manualmente é um ACERTO. Confirma e regista.
  const teorico=existenciasEfetivas(l);
  const dif=novo-teorico;
  if(dif===0){ return; }
  const h=DB.hoteis.find(x=>x.id===CURRENT_HOTEL); const camp=campanhaAtiva();
  modal('Acerto de existências — '+esc(l.cat)+(l.medida?' · '+esc(l.medida):''),`
    <div class="help">O stock calculado é <b>${fmt(teorico)}</b> (base + entradas − quebras). Vai fixar a contagem em <b>${fmt(novo)}</b> — diferença de <b style="color:${dif<0?'var(--red)':'var(--green)'}">${dif>0?'+':''}${fmt(dif)}</b>. Isto passa a ser a nova base; os movimentos anteriores ficam arquivados no histórico.</div>
    <div class="field"><label>Justificação do acerto</label><input id="acertoJust" placeholder="ex.: contagem física, correção de erro…"></div>
    <div id="acertoErr" style="color:var(--red);font-size:12.5px;margin-top:6px;min-height:15px"></div>`,
    [{t:'Confirmar acerto',cls:'btn-gold',fn:()=>{
      const j=val2('acertoJust').trim();
      if(!j){ window.HK35Root.getElementById('acertoErr').textContent='Indique a justificação.'; return; }
      definirBaseContada(l, novo);
      l.existencias=novo; l.ultimoAcerto={de:teorico,para:novo,just:j,quem:SESSION.nome,data:now()};
      logAdd('Acerto de existências',`${camp?camp.nome:''} · ${h?h.nome:''} · ${l.cat}${l.medida?' '+l.medida:''} · ${j}`,{de:teorico,para:novo});
      flushSave(); closeModal(); renderParam();
    }},{t:'Cancelar',cls:'btn-ghost',fn:()=>{ closeModal(); renderParam(); }}]);
}
function val2(id){ const el=window.HK35Root.getElementById(id); return el?el.value:''; }
function auditRegistarExist(inv,i,l,novo){ /* placeholder p/ manter auditoria coerente */ }

/* Movimentos de stock de uma linha — ver histórico, registar entrada (DO/Diretor) */
function openMovs(i){
  const inv=invDoHotel(CURRENT_HOTEL); const l=inv.linhas[i];
  const h=DB.hoteis.find(x=>x.id===CURRENT_HOTEL); const camp=campanhaAtiva();
  const podeMexer = podeEditarInv(inv);
  const movs=(l.movs||[]).slice().sort((a,b)=>(b.data||'').localeCompare(a.data||''));
  const teorico=existenciasEfetivas(l); const base=baseDe(l);
  modal('Movimentos de stock — '+esc(l.cat)+(l.medida?' · '+esc(l.medida):'')+(l.cama?' · '+esc(l.cama):''),`
    <div class="help">Existências = <b>base contada ${fmt(base)}</b>${baseDataDe(l)?' ('+dt(baseDataDe(l))+')':''} + entradas − quebras = <b>${fmt(teorico)}</b>.</div>
    ${podeMexer?`<div style="display:flex;gap:8px;align-items:flex-end;margin-bottom:10px;padding:12px;background:#eef6f0;border-radius:10px">
      <div class="field" style="flex:1;margin:0"><label>Registar entrada de compra</label><input id="movEntQt" type="number" min="1" placeholder="quantidade"></div>
      <div class="field" style="margin:0"><label>Data</label><input id="movEntData" type="date" value="${movDia(now())}"></div>
      <button class="btn btn-gold" onclick="addEntrada(${i})">+ Entrada</button>
    </div>
    <div style="display:flex;gap:8px;align-items:flex-end;margin-bottom:14px;padding:12px;background:#fbeeec;border-radius:10px">
      <div class="field" style="flex:1;margin:0"><label>Registar quebra</label><input id="movQbQt" type="number" min="1" placeholder="quantidade"></div>
      <div class="field" style="margin:0"><label>Causa</label><select id="movQbCausa"><option value="">— escolher —</option>${CAUSAS_QUEBRA.map(c=>`<option value="${c.k}">${c.label}</option>`).join('')}</select></div>
      <div class="field" style="margin:0"><label>Data</label><input id="movQbData" type="date" value="${movDia(now())}"></div>
      <button class="btn btn-danger" onclick="addQuebra(${i})">− Quebra</button>
    </div>`:''}
    <div style="max-height:240px;overflow:auto">
    ${movs.length?`<table><thead><tr><th>Data</th><th>Tipo</th><th class="num">Qt</th><th>Quem</th>${podeMexer?'<th></th>':''}</tr></thead><tbody>
      ${movs.map(m=>`<tr>
        <td style="font-size:12px">${dt(m.data)}</td>
        <td>${m.tipo==='entrada'?'<span class="chip" style="background:var(--green-bg);color:var(--green)">Entrada</span>':'<span class="chip" style="background:var(--red-bg);color:var(--red)">Quebra</span>'+(m.tipo==='quebra'?` <span style="color:var(--muted);font-size:11px">${esc(causaLabel(m.causa))}</span>`:'')}</td>
        <td class="num" style="font-weight:700;color:${m.tipo==='entrada'?'var(--green)':'var(--red)'}">${m.tipo==='entrada'?'+':'−'}${fmt(m.qt)}</td>
        <td style="font-size:12px">${esc(m.quem||'—')}</td>
        ${podeMexer?`<td><button class="btn btn-danger btn-sm" onclick="delMov(${i},'${m.id}')">✕</button></td>`:''}
      </tr>`).join('')}
    </tbody></table>`:'<div style="color:var(--muted);font-size:13px;padding:10px;text-align:center">Sem movimentos registados. As existências vêm da contagem base.</div>'}
    </div>`,
    [{t:'Fechar',cls:'btn-ghost',fn:closeModal}]);
}
function addEntrada(i){
  const inv=invDoHotel(CURRENT_HOTEL); if(!podeEditarInv(inv)) return;
  const l=inv.linhas[i]; const qt=num(val2('movEntQt')); const dataStr=val2('movEntData');
  if(qt<=0){ toast('Indique a quantidade da entrada',true); return; }
  const dataISO = dataStr? (dataStr+'T'+new Date().toISOString().slice(11)) : now();
  registarMov(l,'entrada',qt,SESSION.nome+' ('+SESSION.role+')',dataISO);
  const h=DB.hoteis.find(x=>x.id===CURRENT_HOTEL); const camp=campanhaAtiva();
  logAdd('Entrada de stock',`${camp?camp.nome:''} · ${h?h.nome:''} · ${l.cat}${l.medida?' '+l.medida:''} · +${qt} (${movDia(dataISO)})`,{de:'',para:'+'+qt});
  flushSave(); closeModal(); renderParam(); openMovs(i);
}
function addQuebra(i){
  const inv=invDoHotel(CURRENT_HOTEL); if(!podeEditarInv(inv)) return;
  const l=inv.linhas[i]; const qt=num(val2('movQbQt')); const dataStr=val2('movQbData'); const causa=val2('movQbCausa');
  if(qt<=0){ toast('Indique a quantidade da quebra',true); return; }
  if(!causa){ toast('Escolha a causa da quebra',true); return; }
  const dataISO = dataStr? (dataStr+'T'+new Date().toISOString().slice(11)) : now();
  registarMov(l,'quebra',qt,SESSION.nome+' ('+SESSION.role+')',dataISO,causa);
  const h=DB.hoteis.find(x=>x.id===CURRENT_HOTEL); const camp=campanhaAtiva();
  logAdd('Quebra registada',`${camp?camp.nome:''} · ${h?h.nome:''} · ${l.cat}${l.medida?' '+l.medida:''} · −${qt} · ${causaLabel(causa)} (${movDia(dataISO)})`,{de:'',para:'−'+qt});
  flushSave(); closeModal(); renderParam(); openMovs(i);
}
function delMov(i,movId){
  const inv=invDoHotel(CURRENT_HOTEL); if(!podeEditarInv(inv)) return;
  const l=inv.linhas[i]; if(!l.movs) return;
  const m=l.movs.find(x=>x.id===movId); if(!m) return;
  l.movs=l.movs.filter(x=>x.id!==movId);
  const h=DB.hoteis.find(x=>x.id===CURRENT_HOTEL); const camp=campanhaAtiva();
  logAdd('Movimento removido',`${camp?camp.nome:''} · ${h?h.nome:''} · ${l.cat}${l.medida?' '+l.medida:''} · ${m.tipo} ${m.qt}`);
  flushSave(); closeModal(); renderParam(); openMovs(i);
}
/* ---------- Rasto de auditoria (antes → depois) ---------- */
const CAMPO_LABEL={ existencias:'Existências', quebras:'Quebras', aprovadoDO:'Aprovado DO', vestido100:'Vestido 100%', indice:'Índice', parManual:'Par-stock manual', invAnterior:'Inv. anterior' };
let _auditAntes={}; let _auditTimer={};
function auditKey(hid,i,field){ return hid+'|'+i+'|'+field; }
function auditIniciar(hid,i,field,valorAntes){
  const k=auditKey(hid,i,field);
  if(_auditAntes[k]===undefined) _auditAntes[k]= (valorAntes===''||valorAntes==null)?'':valorAntes; // só o 1º toque guarda o valor original
}
function auditAgendar(inv,i,field){
  if(!CAMPO_LABEL[field]) return; // só campos relevantes
  const hid=CURRENT_HOTEL; const k=auditKey(hid,i,field);
  clearTimeout(_auditTimer[k]);
  _auditTimer[k]=setTimeout(()=>{
    const l=inv.linhas[i]; if(!l){ delete _auditAntes[k]; return; }
    const antes=_auditAntes[k]; const depois=(l[field]===''||l[field]==null)?'':l[field];
    delete _auditAntes[k];
    if(String(antes)===String(depois)) return; // sem alteração líquida
    const h=DB.hoteis.find(x=>x.id===hid); const camp=campanhaAtiva();
    const artigo=l.cat+(l.medida?(' '+l.medida):'')+(l.cama?(' · '+l.cama):'');
    logAdd('Alteração de valor',
      `${camp?camp.nome:''} · ${h?h.nome:''} · ${artigo} · ${CAMPO_LABEL[field]}`,
      { de:(antes===''?'—':antes), para:(depois===''?'—':depois), hotel:(h?h.nome:''), campo:CAMPO_LABEL[field] });
  }, 1400); // regista a alteração líquida ~1,4s após a última tecla
}
function setQuartos(hid,v){ const inv=invDoHotel(hid); if(!podeEditarInv(inv))return; if(inv) inv.quartos=num(v); DB.hoteis.find(h=>h.id===hid).quartos=num(v); autosave(); }

function gravarInvent(){
  if(!podeEditar()){ toast('Perfil de consulta — sem permissão para aprovar',true); return; }
  const camp=campanhaAtiva();
  if(camp.fechada){ toast('Campanha fechada — não é possível aprovar',true); return; }
  const inv=invDoHotel(CURRENT_HOTEL); const h=DB.hoteis.find(x=>x.id===CURRENT_HOTEL);
  modal('Aprovar inventário — '+esc(h.nome),`
    <div style="font-size:13.5px;line-height:1.5;margin-bottom:14px">Os dados já estão guardados automaticamente. Esta ação <b>aprova</b> as quantidades de <b>Aprovado DO</b> deste hotel nesta campanha. A confirmação utiliza a sessão autenticada da <b>Direção de Operações</b> na VG Operations.</div>
    <input id="doPass" type="hidden" value="dashboard"><div class="help"><b>Validação:</b> sessão de Direção confirmada pela autenticação da VG Operations.</div>
    <div id="doErr" style="color:var(--red);font-size:12.5px;margin-top:8px;min-height:16px"></div>`,
    [{t:'Confirmar aprovação',cls:'btn-gold',fn:()=>{
      const p=val('doPass');
      if(!validaPasswordDO(p)){ window.HK35Root.getElementById('doErr').textContent='Password de DO inválida.'; return; }
      inv.updatedAt=now(); inv.updatedBy=SESSION.nome; inv.aprovadoPor=SESSION.nome; inv.aprovadoEm=now();
      const eraReaprovacao = inv.jaFoiAprovado===true;
      inv.aprovado=true; inv.jaFoiAprovado=true;
      if(eraReaprovacao) inv.reaprovacoes=(inv.reaprovacoes||0)+1;
      let sug=0,ap=0; inv.linhas.forEach(l=>{const cc=calcLinha(l); if(cc.sugerida>0)sug+=cc.sugerida; ap+=cc.aprov;});
      logAdd(eraReaprovacao?'Inventário reaprovado':'Inventário aprovado', `${camp.nome} · ${h.nome} · sugerida ${fmt(sug)} · aprovado DO ${fmt(ap)} peças`);
      flushSave(); closeModal(); toast((eraReaprovacao?'Inventário reaprovado — ':'Inventário aprovado — ')+h.nome); renderParam();
    }},{t:'Cancelar',cls:'btn-ghost',fn:closeModal}]);
}

/* Reabrir um inventário aprovado — só DO, com password, registado. Volta a "em edição". */
function reabrirInvent(){
  if(!isDO()){ toast('Apenas a Direção de Operações pode reabrir',true); return; }
  const camp=campanhaAtiva();
  const inv=invDoHotel(CURRENT_HOTEL); const h=DB.hoteis.find(x=>x.id===CURRENT_HOTEL);
  if(!hotelAprovado(inv)){ toast('Este inventário não está aprovado',true); return; }
  modal('Reabrir inventário — '+esc(h.nome),`
    <div style="font-size:13.5px;line-height:1.5;margin-bottom:14px">Este hotel está <b>aprovado e bloqueado</b>. Reabrir permite corrigir dados, mas <b>obriga a nova aprovação</b> no fim. A ação fica registada. A confirmação utiliza a sessão autenticada da <b>Direção de Operações</b>.</div>
    <input id="reabPass" type="hidden" value="dashboard"><div class="help"><b>Validação:</b> sessão de Direção confirmada pela autenticação da VG Operations.</div>
    <div id="reabErr" style="color:var(--red);font-size:12.5px;margin-top:8px;min-height:16px"></div>`,
    [{t:'Reabrir para edição',cls:'btn-gold',fn:()=>{
      const p=val('reabPass');
      if(!validaPasswordDO(p)){ window.HK35Root.getElementById('reabErr').textContent='Password de DO inválida.'; return; }
      inv.aprovado=false; inv.reabertoPor=SESSION.nome; inv.reabertoEm=now();
      logAdd('Inventário reaberto', `${camp.nome} · ${h.nome} · por ${SESSION.nome}`);
      flushSave(); closeModal(); toast('Inventário reaberto — '+h.nome); renderParam();
    }},{t:'Cancelar',cls:'btn-ghost',fn:closeModal}]);
}

/* Limpar inventário — só DO, com password. Repõe o hotel ao estado "por preencher":
   apaga existências, inventário anterior, quebras (e causas) e aprovado DO, e remove a
   aprovação. Mantém só a PARAMETRIZAÇÃO (vestido 100%, índice, par-stock manual, cor, ocupação). */
function limparInvent(){
  if(!isDO()){ toast('Apenas a Direção de Operações pode limpar',true); return; }
  const camp=campanhaAtiva();
  const inv=invDoHotel(CURRENT_HOTEL); const h=DB.hoteis.find(x=>x.id===CURRENT_HOTEL);
  if(camp.fechada){ toast('Campanha fechada — não é possível limpar',true); return; }
  const comDados=inv.linhas.filter(l=>(l.existencias!==''&&l.existencias!=null)||(l.invAnterior!==''&&l.invAnterior!=null)||(l.quebras!==''&&l.quebras!=null&&num(l.quebras)!==0)||(l.aprovadoDO!==''&&l.aprovadoDO!=null)).length;
  const estavaAprovado=hotelAprovado(inv);
  modal('Limpar inventário — '+esc(h.nome),`
    <div class="help" style="background:#fbe8e6;border-color:#e6b3ab;color:#8a2a1e">Esta ação repõe <b>${esc(h.nome)}</b> na campanha <b>${esc(camp.nome)}</b> ao estado <b>por preencher</b>, como um hotel ainda não tocado. Apaga <b>existências, inventário anterior, quebras e aprovado DO</b>${estavaAprovado?', e <b>remove a aprovação</b> (o hotel deixa de estar fechado)':''}. Mantém a parametrização: Vestido 100%, índice, par-stock e cores. Não é reversível.</div>
    <input id="limpPass" type="hidden" value="dashboard"><div class="help"><b>Validação:</b> sessão de Direção confirmada pela autenticação da VG Operations.</div>
    <div id="limpErr" style="color:var(--red);font-size:12.5px;margin-top:8px;min-height:16px"></div>`,
    [{t:'Limpar inventário',cls:'btn-danger',fn:()=>{
      const p=val('limpPass');
      if(!validaPasswordDO(p)){ window.HK35Root.getElementById('limpErr').textContent='Password de DO inválida.'; return; }
      inv.linhas.forEach(l=>{ l.invAnterior=''; l.existencias=''; l.quebras=''; l.aprovadoDO=''; if(l.quebrasCausas) delete l.quebrasCausas; });
      // remove estado de aprovação e carimbos de contagem → fica como hotel intocado
      inv.aprovado=false; delete inv.aprovadoPor; delete inv.aprovadoEm; delete inv.jaFoiAprovado; delete inv.reaprovacoes; delete inv.reabertoPor; delete inv.reabertoEm;
      inv.updatedAt=null; inv.updatedBy='';
      logAdd('Inventário limpo', `${camp.nome} · ${h.nome} · reposto a "por preencher"${estavaAprovado?' (aprovação removida)':''} (${comDados} linhas com dados)`);
      flushSave(); closeModal(); toast('Inventário limpo — '+h.nome); renderParam();
    }},{t:'Cancelar',cls:'btn-ghost',fn:closeModal}]);
}

/* Camada 2 — discriminar causas de quebra de uma linha */
function openCausas(i){
  const inv=invDoHotel(CURRENT_HOTEL); const l=inv.linhas[i];
  const RO=campFechada()||isCompras()||hotelAprovado(inv);
  l.quebrasCausas=l.quebrasCausas||{};
  const dis=RO?'disabled':'';
  modal(`Causas de quebra — ${esc(l.cat)}${l.medida?' · '+esc(l.medida):''}`,`
    <div class="help">Reparta as quebras por causa. O total passa a ser a soma das causas e substitui o número simples. Deixe tudo a zero para voltar ao número simples.</div>
    <table><thead><tr><th>Causa</th><th class="num">Quantidade</th></tr></thead><tbody>
    ${CAUSAS_QUEBRA.map(cz=>`<tr>
      <td><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${cz.cor};margin-right:7px"></span>${cz.label}</td>
      <td class="num"><input class="cell-in causaIn" data-k="${cz.k}" style="width:90px" type="number" min="0" ${dis} value="${l.quebrasCausas[cz.k]||''}" oninput="window.HK35Root.getElementById('causaTot').textContent=fmt([...window.HK35Root.querySelectorAll('.causaIn')].reduce((s,x)=>s+num(x.value),0))"></td>
    </tr>`).join('')}
    <tr><td><b>Total de quebras</b></td><td class="num"><b id="causaTot">${fmt(somaCausas(l))}</b></td></tr>
    </tbody></table>`,
    RO?[{t:'Fechar',cls:'btn-ghost',fn:closeModal}]:[
      {t:'Guardar',cls:'btn-gold',fn:()=>{
        const cz={}; window.HK35Root.querySelectorAll('.causaIn').forEach(x=>cz[x.dataset.k]=num(x.value));
        l.quebrasCausas=cz; const tot=CAUSAS_QUEBRA.reduce((s,c)=>s+num(cz[c.k]),0);
        if(tot>0) l.quebras=tot;
        autosave(); closeModal(); renderParam();
      }},{t:'Cancelar',cls:'btn-ghost',fn:closeModal}]);
}



/* ============================================================
   RELATÓRIO EXECUTIVO — visão de topo do portfólio (Administração/DO/Compras)
   ============================================================ */
VIEWS.exec={ title:'Relatório executivo', crumb:'Visão consolidada do portfólio', render(){
  const c=window.HK35Root.getElementById('content');
  if(!veTodosHoteis()){ noPerm(); return; }
  const camp=campanhaAtiva(); if(camp)CURRENT_CAMP=camp.id;
  c.innerHTML=`
    <div class="toolbar">
      <div class="field" style="min-width:220px"><label>Campanha</label>
        ${campSelectHTML('onchange="mudarCampanha(this.value,\'exec\')"')}</div>
      <div class="sp" style="flex:1"></div>
      <button class="btn btn-ghost" onclick="window.print()">Imprimir / PDF</button>
    </div>
    <div id="execBody"></div>`;
  renderExec();
}};
function execData(){
  const camp=campanhaAtiva(); const store=camp?(DB.invent[camp.id]||{}):{};
  const hs=DB.hoteis;
  let vStock=0,vQuebra=0,vRepor=0, totExist=0, totQuebra=0, totPar=0, temCusto=false;
  const porHotel=[]; const porRegiao={};
  hs.forEach(h=>{ const inv=store[h.id]; if(!inv)return;
    let he=0,hq=0,hpar=0,hvs=0,hvq=0,hvr=0;
    inv.linhas.forEach(l=>{ const cc=calcLinha(l); const u=num(l.unit); if(u>0)temCusto=true;
      const e=num(l.existencias), q=quebraLinha(l), rep=(cc.sugerida>0?Math.round(cc.sugerida):0);
      he+=e; hq+=q; hpar+=cc.par; hvs+=e*u; hvq+=q*u; hvr+=rep*u;
    });
    totExist+=he; totQuebra+=hq; totPar+=hpar; vStock+=hvs; vQuebra+=hvq; vRepor+=hvr;
    const taxa= hpar>0? (hq/(he+hq||1))*100 : 0;
    porHotel.push({nome:h.nome, regiao:h.regiao, exist:he, quebra:hq, par:hpar, vStock:hvs, vQuebra:hvq, vRepor:hvr, aprovado:!!inv.aprovado, taxa: he+hq>0?(hq/(he+hq)*100):0});
    const r=porRegiao[h.regiao]=porRegiao[h.regiao]||{exist:0,quebra:0,vQuebra:0,vRepor:0,hoteis:0,aprovados:0};
    r.exist+=he; r.quebra+=hq; r.vQuebra+=hvq; r.vRepor+=hvr; r.hoteis++; if(inv.aprovado)r.aprovados++;
  });
  return {camp,hs,porHotel,porRegiao,vStock,vQuebra,vRepor,totExist,totQuebra,totPar,temCusto};
}
function renderExec(){
  const box=window.HK35Root.getElementById('execBody'); if(!box)return;
  const d=execData();
  if(!d.camp){ box.innerHTML='<div class="empty"><div class="ic">▣</div>Sem campanha selecionada.</div>'; return; }
  const nAprov=d.porHotel.filter(x=>x.aprovado).length;
  const taxaGlobal= d.totExist+d.totQuebra>0 ? (d.totQuebra/(d.totExist+d.totQuebra)*100):0;
  const piores=d.porHotel.slice().sort((a,b)=>b.taxa-a.taxa).slice(0,8);
  const maisRepor=d.porHotel.slice().filter(x=>x.vRepor>0).sort((a,b)=>b.vRepor-a.vRepor).slice(0,8);
  const regioes=Object.entries(d.porRegiao).sort((a,b)=>b[1].quebra-a[1].quebra);
  box.innerHTML=`
    <div style="font-size:13px;color:var(--muted);margin-bottom:14px">Campanha <b style="color:var(--navy)">${esc(d.camp.nome)}</b> · ${d.hs.length} hotéis · gerado em ${dt(now())}</div>
    <div class="grid4" style="margin-bottom:18px">
      <div class="kpi"><div class="l">Existências totais</div><div class="v">${fmt(d.totExist)}</div><div class="s">peças em stock</div></div>
      <div class="kpi"><div class="l">Quebras do período</div><div class="v" style="color:var(--red)">${fmt(d.totQuebra)}</div><div class="s">taxa ${fmt1(taxaGlobal)}%</div></div>
      <div class="kpi"><div class="l">Hotéis fechados</div><div class="v" style="color:var(--green)">${nAprov}/${d.hs.length}</div><div class="s">aprovados pela DO</div></div>
      <div class="kpi"><div class="l">${d.temCusto?'Investimento de reposição':'Reposição (sem custos)'}</div><div class="v" style="color:var(--blue)">${d.temCusto?eur(d.vRepor):'—'}</div><div class="s">${d.temCusto?'compra sugerida × custo':'defina custos no catálogo'}</div></div>
    </div>
    ${d.temCusto?`<div class="grid3" style="margin-bottom:18px">
      <div class="kpi"><div class="l">Valor do stock</div><div class="v">${eur(d.vStock)}</div></div>
      <div class="kpi"><div class="l">Custo das quebras</div><div class="v" style="color:var(--red)">${eur(d.vQuebra)}</div></div>
      <div class="kpi"><div class="l">Par-stock total</div><div class="v">${fmt(d.totPar)}</div></div>
    </div>`:''}
    <div class="grid2">
      <div class="card"><div class="ch"><h2>Hotéis com maior taxa de quebra</h2></div>
        <div class="tbl-wrap"><table><thead><tr><th>Hotel</th><th class="num">Quebras</th><th class="num">Taxa</th></tr></thead><tbody>
        ${piores.map(x=>`<tr><td>${esc(x.nome)}<br><small style="color:var(--muted)">${esc(x.regiao)}</small></td><td class="num">${fmt(x.quebra)}</td><td class="num" style="color:${x.taxa>15?'var(--red)':'var(--muted)'};font-weight:600">${fmt1(x.taxa)}%</td></tr>`).join('')}
        </tbody></table></div></div>
      <div class="card"><div class="ch"><h2>${d.temCusto?'Maior investimento de reposição':'Maior necessidade de reposição'}</h2></div>
        <div class="tbl-wrap"><table><thead><tr><th>Hotel</th><th class="num">${d.temCusto?'Reposição €':'Compra sug.'}</th></tr></thead><tbody>
        ${(d.temCusto?maisRepor:d.porHotel.slice().sort((a,b)=>(b.par-b.exist)-(a.par-a.exist)).slice(0,8)).map(x=>`<tr><td>${esc(x.nome)}</td><td class="num pos">${d.temCusto?eur(x.vRepor):fmt(Math.max(0,x.par-x.exist))}</td></tr>`).join('')}
        </tbody></table></div></div>
    </div>
    <div class="card">
      <div class="ch"><h2>Resumo por região</h2></div>
      <div class="tbl-wrap"><table><thead><tr><th>Região</th><th class="num">Hotéis</th><th class="num">Fechados</th><th class="num">Existências</th><th class="num">Quebras</th>${d.temCusto?'<th class="num">Custo quebras</th><th class="num">Reposição</th>':''}</tr></thead><tbody>
      ${regioes.map(([r,o])=>`<tr><td><b>${esc(r)}</b></td><td class="num">${o.hoteis}</td><td class="num">${o.aprovados}/${o.hoteis}</td><td class="num">${fmt(o.exist)}</td><td class="num" style="color:var(--red)">${fmt(o.quebra)}</td>${d.temCusto?`<td class="num" style="color:var(--red)">${eur(o.vQuebra)}</td><td class="num pos">${eur(o.vRepor)}</td>`:''}</tr>`).join('')}
      </tbody><tfoot><tr style="border-top:2px solid var(--line2)"><td><b>Total</b></td><td class="num"><b>${d.hs.length}</b></td><td class="num"><b>${nAprov}</b></td><td class="num"><b>${fmt(d.totExist)}</b></td><td class="num" style="color:var(--red)"><b>${fmt(d.totQuebra)}</b></td>${d.temCusto?`<td class="num" style="color:var(--red)"><b>${eur(d.vQuebra)}</b></td><td class="num"><b>${eur(d.vRepor)}</b></td>`:''}</tr></tfoot></table></div>
    </div>
    <div class="help">Relatório de gestão consolidado da campanha. Use <b>Imprimir / PDF</b> para exportar para a Administração. Os valores em euros dependem dos custos unitários definidos no Catálogo.</div>`;
}

/* ============================================================
   DISTRIBUIÇÃO DE CAMAS (detalhe por medida) → pré-cálculo Vestido 100%
   ============================================================ */
function openCamasDetalhe(hid){
  const inv=ensureInvent(hid); const h=DB.hoteis.find(x=>x.id===hid);
  const camas=DB.catalogo.camas; const RO=campFechada()||isCompras()||hotelAprovado(inv);
  inv.camasDetalhe=inv.camasDetalhe||{};
  // migra formato antigo (número) → {fixas, extra}
  camas.forEach(cm=>{ const v=inv.camasDetalhe[cm]; if(v!=null && typeof v!=='object'){ inv.camasDetalhe[cm]={fixas:num(v),extra:0}; } });
  const somaFixas=camas.reduce((s,cm)=>s+num((inv.camasDetalhe[cm]||{}).fixas),0);
  const somaExtra=camas.reduce((s,cm)=>s+num((inv.camasDetalhe[cm]||{}).extra),0);
  const dis=RO?'disabled':'';
  modal(`Distribuição de camas — ${esc(h.nome)}`, `
    <div class="help">Indique, por medida, quantas <b>camas fixas</b> e quantas <b>camas extra e sofás</b> o hotel tem. O <b>Vestido 100%</b> de cada artigo = peças-por-cama (definidas no Catálogo) × nº de camas — calculado à parte para camas fixas e extra. As camas extra/sofá levam colcha e lençóis, mas não edredão.</div>
    <table><thead><tr><th>Medida de cama</th><th class="num">Camas fixas</th><th class="num">Camas extra e sofás</th></tr></thead><tbody>
    ${camas.map(cm=>`<tr><td>${esc(cm)}</td>
      <td class="num"><input class="cell-in" style="width:80px" type="number" min="0" ${dis} value="${(inv.camasDetalhe[cm]||{}).fixas||''}" oninput="setCamaDet('${hid}','${cm}','fixas',this.value)"></td>
      <td class="num"><input class="cell-in" style="width:80px" type="number" min="0" ${dis} value="${(inv.camasDetalhe[cm]||{}).extra||''}" oninput="setCamaDet('${hid}','${cm}','extra',this.value)"></td>
    </tr>`).join('')}
    <tr><td><b>Totais</b></td><td class="num"><b id="somaFixas">${fmt(somaFixas)}</b></td><td class="num"><b id="somaExtra">${fmt(somaExtra)}</b></td></tr>
    </tbody></table>`,
    RO?[{t:'Fechar',cls:'btn-ghost',fn:closeModal}]:[
      {t:'Aplicar ao Vestido 100%',cls:'btn-gold',fn:()=>{ aplicarCamas(hid); closeModal(); }},
      {t:'Fechar',cls:'btn-ghost',fn:closeModal}
    ]);
}
function setCamaDet(hid,cm,campo,val){
  const inv=invDoHotel(hid); if(!inv) return;
  inv.camasDetalhe=inv.camasDetalhe||{};
  const cur=inv.camasDetalhe[cm]; if(cur==null||typeof cur!=='object') inv.camasDetalhe[cm]={fixas:num(cur),extra:0};
  inv.camasDetalhe[cm][campo]=num(val);
  const camas=DB.catalogo.camas;
  const sf=camas.reduce((s,c)=>s+num((inv.camasDetalhe[c]||{}).fixas),0);
  const se=camas.reduce((s,c)=>s+num((inv.camasDetalhe[c]||{}).extra),0);
  const ef=window.HK35Root.getElementById('somaFixas'); if(ef)ef.textContent=fmt(sf);
  const ee=window.HK35Root.getElementById('somaExtra'); if(ee)ee.textContent=fmt(se);
  autosave();
}
function aplicarCamas(hid){
  if(!podeEditar()) return;
  const inv=invDoHotel(hid); if(hotelAprovado(inv)||campFechada()) return; const det=inv.camasDetalhe||{};
  inv.linhas.forEach(l=>{
    const cat=DB.catalogo.categorias.find(c=>c.nome===l.cat);
    if(cat&&cat.porCama&&l.cama){
      const d=det[l.cama]||{};
      const camasFixas=num(d.fixas), camasExtra=num(d.extra);
      const vf=camasFixas*pecasFixaDe(cat);
      const ve=camasExtra*pecasExtraDe(cat);
      l.vestidoFixas = vf;
      l.vestidoExtra = ve;
      l.vestido100 = vf+ve; // total = soma (alimenta o par-stock)
    }
  });
  const h=DB.hoteis.find(x=>x.id===hid);
  logAdd('Distribuição de camas', `${campanhaAtiva().nome} · ${h.nome} · Vestido 100% recalculado`);
  autosave(); toast('Vestido 100% recalculado');
  if(CURRENT_VIEW==='param') renderParam();
}

/* ============================================================
   PROJEÇÃO DE COMPRA
   ============================================================ */
let projChart=null;

/* ============================================================
   CAMADA 1 — COMPARAÇÃO ENTRE CAMPANHAS + QUEBRA REAL DO PERÍODO
   Quebra real = Inv. inicial + Compras do período − Inv. final
   (o que desapareceu além do que foi contabilizado como quebra)
   ============================================================ */
let cmpChart=null;
VIEWS.comparar={ title:'Comparação entre campanhas', crumb:'Evolução e quebra real do período', render(){
  const c=window.HK35Root.getElementById('content');
  if(!veTodosHoteis()){ noPerm(); return; }
  const camps=DB.campanhas;
  if(camps.length<2){ c.innerHTML='<div class="empty"><div class="ic">◔</div>São precisas pelo menos duas campanhas para comparar.<br><small>Crie a próxima campanha em "Campanhas de inventário".</small></div>'; return; }
  // por defeito: penúltima (inicial) vs última (final)
  if(!CMP_INI||!camps.some(x=>x.id===CMP_INI)) CMP_INI=camps[camps.length-2].id;
  if(!CMP_FIM||!camps.some(x=>x.id===CMP_FIM)) CMP_FIM=camps[camps.length-1].id;
  const regioes=[...new Set(hoteisVisiveis().map(h=>h.regiao))].sort();
  c.innerHTML=`
    <div class="toolbar">
      <div class="field" style="min-width:190px"><label>Campanha inicial</label>
        <select id="cmpIni" onchange="CMP_INI=this.value;renderComparar()">${camps.map(x=>`<option value="${x.id}" ${x.id===CMP_INI?'selected':''}>${esc(x.nome)}</option>`).join('')}</select></div>
      <div class="field" style="min-width:190px"><label>Campanha final</label>
        <select id="cmpFim" onchange="CMP_FIM=this.value;renderComparar()">${camps.map(x=>`<option value="${x.id}" ${x.id===CMP_FIM?'selected':''}>${esc(x.nome)}</option>`).join('')}</select></div>
      <div class="field" style="min-width:200px"><label>Âmbito</label>
        <select id="cmpAmbito" onchange="onCmpAmbito()">
          <option value="todos">Todos os meus hotéis</option>
          <option value="regiao">Por região</option>
          <option value="hotel">Por hotel</option>
        </select></div>
      <div class="field" style="min-width:200px;display:none" id="cmpRegWrap"><label>Região</label>
        <select id="cmpRegiao" onchange="renderComparar()">${regioes.map(r=>`<option>${esc(r)}</option>`).join('')}</select></div>
      <div class="field" style="min-width:240px;display:none" id="cmpHotelWrap"><label>Hotel</label>
        <select id="cmpHotel" onchange="renderComparar()">${hoteisVisiveis().map(h=>`<option value="${h.id}">${esc(h.nome)}</option>`).join('')}</select></div>
      <div class="sp" style="flex:1"></div>
      <button class="btn btn-ghost" onclick="exportComparar()">Exportar Excel</button>
    </div>
    <div id="cmpBody"></div>`;
  onCmpAmbito();
}};
function onCmpAmbito(){
  const a=window.HK35Root.getElementById('cmpAmbito').value;
  window.HK35Root.getElementById('cmpRegWrap').style.display=a==='regiao'?'':'none';
  window.HK35Root.getElementById('cmpHotelWrap').style.display=a==='hotel'?'':'none';
  renderComparar();
}
function cmpHoteis(){
  const a=window.HK35Root.getElementById('cmpAmbito').value; let hs=hoteisVisiveis();
  if(a==='regiao'){ const r=window.HK35Root.getElementById('cmpRegiao').value; hs=hs.filter(h=>h.regiao===r); }
  else if(a==='hotel'){ const id=window.HK35Root.getElementById('cmpHotel').value; hs=hs.filter(h=>h.id===id); }
  return hs;
}
/* Agrega por categoria a comparação inicial→final de um conjunto de hotéis */
function cmpData(){
  const hs=cmpHoteis();
  const invIni=DB.invent[CMP_INI]||{}, invFim=DB.invent[CMP_FIM]||{};
  const porCat={}; // cat -> {ini,fim,compras,quebraReg,quebraReal}
  const get=(store,hid)=> store[hid]?store[hid].linhas:[];
  hs.forEach(h=>{
    const li=get(invIni,h.id), lf=get(invFim,h.id);
    const mi={}; li.forEach(l=>mi[l.cat+'|'+l.cama+'|'+l.medida]=l);
    const mf={}; lf.forEach(l=>mf[l.cat+'|'+l.cama+'|'+l.medida]=l);
    const keys=new Set([...Object.keys(mi),...Object.keys(mf)]);
    keys.forEach(k=>{
      const cat=k.split('|')[0];
      const a=mi[k], b=mf[k];
      const existIni=a?num(a.existencias):0;
      const existFim=b?num(b.existencias):0;
      const compras=a?calcLinha(a).aprov:0;      // o que foi aprovado comprar na campanha inicial
      const quebraReg=b?num(b.quebras):0;         // quebras registadas na contagem final
      // quebra real = inicial + compras - final  (o que desapareceu)
      const quebraReal=existIni+compras-existFim;
      const o=porCat[cat]=porCat[cat]||{ini:0,fim:0,compras:0,quebraReg:0,quebraReal:0};
      o.ini+=existIni; o.fim+=existFim; o.compras+=compras; o.quebraReg+=quebraReg; o.quebraReal+=quebraReal;
    });
  });
  return {hs, porCat};
}
function renderComparar(){
  const iniC=DB.campanhas.find(x=>x.id===CMP_INI), fimC=DB.campanhas.find(x=>x.id===CMP_FIM);
  const body=window.HK35Root.getElementById('cmpBody'); if(!body) return;
  if(CMP_INI===CMP_FIM){ body.innerHTML='<div class="empty"><div class="ic">◔</div>Escolha duas campanhas diferentes.</div>'; if(cmpChart){cmpChart.destroy();cmpChart=null;} return; }
  const {hs,porCat}=cmpData();
  const cats=Object.keys(porCat).filter(c=>porCat[c].ini||porCat[c].fim||porCat[c].compras);
  if(!cats.length){ body.innerHTML='<div class="empty"><div class="ic">◔</div>Sem dados nas campanhas selecionadas para este âmbito.</div>'; if(cmpChart){cmpChart.destroy();cmpChart=null;} return; }
  let tIni=0,tFim=0,tCmp=0,tQreg=0,tQreal=0;
  cats.forEach(c=>{const o=porCat[c];tIni+=o.ini;tFim+=o.fim;tCmp+=o.compras;tQreg+=o.quebraReg;tQreal+=o.quebraReal;});
  const taxa = tIni>0 ? (tQreal/tIni*100) : 0;
  body.innerHTML=`
    <div class="grid4" style="margin-bottom:18px">
      <div class="kpi"><div class="l">Existências ${esc(iniC.nome)}</div><div class="v">${fmt(tIni)}</div></div>
      <div class="kpi"><div class="l">Existências ${esc(fimC.nome)}</div><div class="v">${fmt(tFim)}</div></div>
      <div class="kpi"><div class="l">Quebra real do período</div><div class="v" style="color:var(--red)">${fmt(tQreal)}</div><div class="s">inicial + compras − final</div></div>
      <div class="kpi"><div class="l">Taxa de quebra</div><div class="v" style="color:${taxa>15?'var(--red)':'var(--amber)'}">${fmt1(taxa)}%</div><div class="s">${hs.length} hotel(éis)</div></div>
    </div>
    <div class="card"><div class="ch"><h2>Quebra real por categoria</h2><div class="d">o que desapareceu além do stock contado</div></div>
      <div class="cb"><canvas id="cmpCanvas" height="90"></canvas></div></div>
    <div class="card">
      <div class="ch"><h2>Detalhe por categoria</h2><div class="d">${esc(iniC.nome)} → ${esc(fimC.nome)}</div></div>
      <div class="tbl-wrap"><table><thead><tr>
        <th>Categoria</th><th class="num">Inv. inicial</th><th class="num">Compras período</th>
        <th class="num">Inv. final</th><th class="num">Quebra registada</th>
        <th class="num">Quebra real</th><th class="num">Taxa</th>
      </tr></thead><tbody>
      ${cats.map(c=>{const o=porCat[c]; const tx=o.ini>0?(o.quebraReal/o.ini*100):0;
        return `<tr>
          <td><b>${esc(c)}</b></td>
          <td class="num">${fmt(o.ini)}</td>
          <td class="num pos">${fmt(o.compras)}</td>
          <td class="num">${fmt(o.fim)}</td>
          <td class="num">${fmt(o.quebraReg)}</td>
          <td class="num" style="color:var(--red);font-weight:600">${fmt(o.quebraReal)}</td>
          <td class="num" style="color:${tx>15?'var(--red)':'var(--muted)'}">${fmt1(tx)}%</td>
        </tr>`;}).join('')}
      </tbody><tfoot><tr style="border-top:2px solid var(--line2)">
        <td><b>Total</b></td><td class="num"><b>${fmt(tIni)}</b></td><td class="num"><b>${fmt(tCmp)}</b></td>
        <td class="num"><b>${fmt(tFim)}</b></td><td class="num"><b>${fmt(tQreg)}</b></td>
        <td class="num" style="color:var(--red)"><b>${fmt(tQreal)}</b></td><td class="num"><b>${fmt1(taxa)}%</b></td>
      </tr></tfoot></table></div>
    </div>
    <div class="help">A <b>quebra real</b> é o que desapareceu de facto: <b>inventário inicial + compras do período − inventário final</b>. Pode diferir da <b>quebra registada</b> (o que foi anotado na contagem) — a diferença revela extravios não contabilizados. As "compras do período" usam a quantidade aprovada pela DO na campanha inicial.</div>`;
  const arr=cats.map(c=>porCat[c].quebraReal);
  if(cmpChart) cmpChart.destroy();
  cmpChart=new Chart(window.HK35Root.getElementById('cmpCanvas'),{type:'bar',
    data:{labels:cats,datasets:[{label:'Quebra real',data:arr,backgroundColor:arr.map(v=>v<0?'#2563b0':'#c0392b'),borderRadius:5}]},
    options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{font:{size:11}}},x:{ticks:{font:{size:10},maxRotation:60,minRotation:30}}}}});
}
async function exportComparar(){
  await ensureXLSX35();
  const iniC=DB.campanhas.find(x=>x.id===CMP_INI), fimC=DB.campanhas.find(x=>x.id===CMP_FIM);
  const {hs,porCat}=cmpData();
  const cats=Object.keys(porCat).filter(c=>porCat[c].ini||porCat[c].fim||porCat[c].compras);
  const head=['Categoria','Inv. inicial','Compras período','Inv. final','Quebra registada','Quebra real','Taxa %'];
  const rows=cats.map(c=>{const o=porCat[c];const tx=o.ini>0?(o.quebraReal/o.ini*100):0;return [c,o.ini,o.compras,o.fim,o.quebraReg,o.quebraReal,Math.round(tx*10)/10];});
  const meta=[['Comparação entre campanhas'],[`${iniC.nome} → ${fimC.nome}`],[`Hotéis: ${hs.length}`],[`Exportado: ${dt(now())}`],[]];
  const ws=XLSX.utils.aoa_to_sheet([...meta,head,...rows]);
  ws['!cols']=[{wch:24},{wch:12},{wch:14},{wch:12},{wch:14},{wch:12},{wch:8}];
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Comparação');
  const safe=s=>String(s).replace(/[^\w]+/g,'_').slice(0,20);
  XLSX.writeFile(wb,`VG_Comparacao_${safe(iniC.nome)}_${safe(fimC.nome)}.xlsx`);
  logAdd('Exportação comparação',`${iniC.nome} → ${fimC.nome}`); saveDB();
}

/* ============================================================
   CAMADA 2 — ANÁLISE DE QUEBRAS (causas + taxas por hotel/categoria)
   ============================================================ */
/* ============================================================
   MAPA DE QUEBRAS — movimentos de quebra por artigo × mês / campanha
   (substitui o Excel mensal: construído automaticamente dos movimentos)
   ============================================================ */
let MAPA_HOTEL=null, MAPA_VISTA='mes';
VIEWS.mapames={ title:'Mapa de quebras', crumb:'Quebras por artigo e por mês ou campanha', render(){
  const c=window.HK35Root.getElementById('content');
  if(!veTodosHoteis()){ noPerm(); return; }
  const hs=hoteisVisiveis();
  if(!MAPA_HOTEL||!hs.some(h=>h.id===MAPA_HOTEL)) MAPA_HOTEL=hs[0]?hs[0].id:null;
  c.innerHTML=`
    <div class="toolbar">
      <div class="field" style="min-width:240px"><label>Hotel</label>
        <select id="mapaHotel" onchange="MAPA_HOTEL=this.value;renderMapa()">${hs.map(h=>`<option value="${h.id}" ${h.id===MAPA_HOTEL?'selected':''}>${esc(h.nome)}</option>`).join('')}</select></div>
      <div class="field" style="min-width:200px"><label>Agrupar por</label>
        <select id="mapaVista" onchange="MAPA_VISTA=this.value;renderMapa()">
          <option value="mes" ${MAPA_VISTA==='mes'?'selected':''}>Mês</option>
          <option value="campanha" ${MAPA_VISTA==='campanha'?'selected':''}>Campanha</option>
        </select></div>
      <div class="sp" style="flex:1"></div>
      <button class="btn btn-ghost" onclick="exportMapa()">Exportar Excel</button>
    </div>
    <div id="mapaBody"></div>`;
  renderMapa();
}};
/* recolhe todos os movimentos de quebra de um hotel em todas as campanhas */
function mapaMovsQuebra(hid){
  const linhas={}; // key artigo -> {label, cat, medida, cama, porBucket:{bucket:qt}}
  const buckets=new Set();
  DB.campanhas.forEach(camp=>{
    const inv=(DB.invent[camp.id]||{})[hid]; if(!inv)return;
    inv.linhas.forEach(l=>{
      const todos=(l.movs||[]).concat(l.movsArquivo||[]);
      todos.filter(m=>m.tipo==='quebra').forEach(m=>{
        const bucket = MAPA_VISTA==='mes' ? movMes(m.data) : camp.nome;
        buckets.add(bucket);
        const key=l.cat+'|'+(l.cama||'')+'|'+(l.medida||'');
        const o=linhas[key]=linhas[key]||{cat:l.cat,cama:l.cama||'',medida:l.medida||'',porBucket:{},total:0};
        o.porBucket[bucket]=(o.porBucket[bucket]||0)+num(m.qt); o.total+=num(m.qt);
      });
    });
  });
  let bucketList=[...buckets];
  if(MAPA_VISTA==='mes') bucketList.sort(); // AAAA-MM ordena bem
  return {linhas:Object.values(linhas).sort((a,b)=>b.total-a.total), buckets:bucketList};
}
function mesLabel(b){ if(!/^\d{4}-\d{2}$/.test(b))return b; const [a,m]=b.split('-'); const nomes=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']; return nomes[+m-1]+'/'+a.slice(2); }
function renderMapa(){
  const box=window.HK35Root.getElementById('mapaBody'); if(!box)return;
  const h=DB.hoteis.find(x=>x.id===MAPA_HOTEL);
  const {linhas,buckets}=mapaMovsQuebra(MAPA_HOTEL);
  if(!linhas.length){ box.innerHTML='<div class="empty"><div class="ic">▦</div>Ainda não há quebras registadas para este hotel.<br><small>As quebras aparecem aqui à medida que são registadas (governanta no telemóvel ou no inventário).</small></div>'; return; }
  const totalGeral=linhas.reduce((s,l)=>s+l.total,0);
  const totBucket={}; buckets.forEach(b=>totBucket[b]=linhas.reduce((s,l)=>s+(l.porBucket[b]||0),0));
  box.innerHTML=`
    <div class="card">
      <div class="ch"><h2>${esc(h.nome)} — quebras por ${MAPA_VISTA==='mes'?'mês':'campanha'}</h2><div class="d">${fmt(totalGeral)} peças em ${buckets.length} ${MAPA_VISTA==='mes'?'meses':'campanhas'}</div></div>
      <div class="tbl-wrap tbl-sticky" style="max-height:calc(100vh - 300px)">
        <table><thead><tr><th style="min-width:200px">Artigo</th>${buckets.map(b=>`<th class="num">${MAPA_VISTA==='mes'?mesLabel(b):esc(b)}</th>`).join('')}<th class="num">Total</th></tr></thead>
        <tbody>
        ${linhas.map(l=>`<tr><td><b>${esc(l.cat)}</b>${l.medida?' <span style="color:var(--muted);font-size:12px">'+esc(l.medida)+'</span>':''}${l.cama?' <span style="color:var(--muted);font-size:11px">'+esc(l.cama)+'</span>':''}</td>
          ${buckets.map(b=>`<td class="num">${l.porBucket[b]?fmt(l.porBucket[b]):'<span style="color:var(--line2)">·</span>'}</td>`).join('')}
          <td class="num" style="font-weight:700;color:var(--red)">${fmt(l.total)}</td></tr>`).join('')}
        </tbody>
        <tfoot><tr style="border-top:2px solid var(--line2)"><td><b>Total</b></td>${buckets.map(b=>`<td class="num"><b>${fmt(totBucket[b])}</b></td>`).join('')}<td class="num"><b>${fmt(totalGeral)}</b></td></tr></tfoot>
        </table>
      </div>
    </div>
    <div class="help">Mapa construído automaticamente a partir das quebras registadas. Cada quebra registada (no telemóvel pela governanta ou no inventário) entra na coluna do respetivo ${MAPA_VISTA==='mes'?'mês':'período/campanha'} e reduz o stock do artigo.</div>`;
}
async function exportMapa(){
  await ensureXLSX35();
  const h=DB.hoteis.find(x=>x.id===MAPA_HOTEL);
  const {linhas,buckets}=mapaMovsQuebra(MAPA_HOTEL);
  const head=['Categoria','Cama','Medida',...buckets.map(b=>MAPA_VISTA==='mes'?mesLabel(b):b),'Total'];
  const rows=linhas.map(l=>[l.cat,l.cama,l.medida,...buckets.map(b=>l.porBucket[b]||0),l.total]);
  const totBucket=buckets.map(b=>linhas.reduce((s,l)=>s+(l.porBucket[b]||0),0));
  const totRow=['TOTAL','','',...totBucket,linhas.reduce((s,l)=>s+l.total,0)];
  const ws=XLSX.utils.aoa_to_sheet([[`Mapa de quebras — ${h.nome}`],[`Por ${MAPA_VISTA==='mes'?'mês':'campanha'} · ${dt(now())}`],[],head,...rows,[],totRow]);
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Quebras');
  const safe=s=>String(s).replace(/[^\w]+/g,'_').slice(0,24);
  XLSX.writeFile(wb,`VG_Mapa_Quebras_${safe(h.nome)}.xlsx`);
  logAdd('Exportação mapa de quebras',h.nome); saveDB();
}

let qbChart=null;
VIEWS.quebras={ title:'Análise de quebras', crumb:'Causas e taxas por hotel e categoria', render(){
  const c=window.HK35Root.getElementById('content');
  if(!veTodosHoteis()){ noPerm(); return; }
  const camp=campanhaAtiva(); if(camp)CURRENT_CAMP=camp.id;
  const regioes=[...new Set(hoteisVisiveis().map(h=>h.regiao))].sort();
  c.innerHTML=`
    <div class="toolbar">
      <div class="field" style="min-width:200px"><label>Campanha</label>
        ${campSelectHTML('onchange="mudarCampanha(this.value,\'quebras\')"')}</div>
      <div class="field" style="min-width:180px"><label>Âmbito</label>
        <select id="qbAmbito" onchange="onQbAmbito()">
          <option value="todos">Todos os meus hotéis</option>
          <option value="regiao">Por região</option>
        </select></div>
      <div class="field" style="min-width:200px;display:none" id="qbRegWrap"><label>Região</label>
        <select id="qbRegiao" onchange="renderQuebras()">${regioes.map(r=>`<option>${esc(r)}</option>`).join('')}</select></div>
      <div class="sp" style="flex:1"></div>
      <button class="btn btn-ghost" onclick="exportQuebras()">Exportar Excel</button>
    </div>
    <div id="qbBody"></div>`;
  onQbAmbito();
}};
function onQbAmbito(){ const a=window.HK35Root.getElementById('qbAmbito').value; window.HK35Root.getElementById('qbRegWrap').style.display=a==='regiao'?'':'none'; renderQuebras(); }
function qbHoteis(){ const a=window.HK35Root.getElementById('qbAmbito').value; let hs=hoteisVisiveis(); if(a==='regiao'){const r=window.HK35Root.getElementById('qbRegiao').value;hs=hs.filter(h=>h.regiao===r);} return hs; }
function qbData(){
  const hs=qbHoteis(); const inv=DB.invent[CURRENT_CAMP]||{};
  const porCausa={}; CAUSAS_QUEBRA.forEach(c=>porCausa[c.k]=0);
  const porHotel={}; const porCat={}; let semCausa=0, totalQ=0, totalExist=0;
  hs.forEach(h=>{ const hi=inv[h.id]; if(!hi)return;
    let qh=0;
    hi.linhas.forEach(l=>{
      const q=quebraLinha(l); totalQ+=q; totalExist+=existenciasEfetivas(l); qh+=q;
      porCat[l.cat]=(porCat[l.cat]||0)+q;
      const mvCausas=causasDeMovimentos(l);
      const temMv=Object.keys(mvCausas).length>0;
      if(temMv){
        // modelo novo: causas vêm dos movimentos
        CAUSAS_QUEBRA.forEach(c=>porCausa[c.k]+=num(mvCausas[c.k]));
        semCausa+=num(mvCausas.semCausa);
      } else {
        // legado: causas discriminadas à mão, ou total sem causa
        const sc=somaCausas(l);
        if(sc>0){ CAUSAS_QUEBRA.forEach(c=>porCausa[c.k]+=num(l.quebrasCausas[c.k])); }
        else semCausa+=num(l.quebras);
      }
    });
    if(qh>0) porHotel[h.nome]=(porHotel[h.nome]||0)+qh;
  });
  return {hs,porCausa,porHotel,porCat,semCausa,totalQ,totalExist};
}
function renderQuebras(){
  const body=window.HK35Root.getElementById('qbBody'); if(!body)return;
  const {hs,porCausa,porHotel,porCat,semCausa,totalQ,totalExist}=qbData();
  if(!totalQ){ body.innerHTML='<div class="empty"><div class="ic">⚠</div>Sem quebras registadas nesta campanha para o âmbito selecionado.</div>'; if(qbChart){qbChart.destroy();qbChart=null;} return; }
  const taxa=totalExist>0?(totalQ/totalExist*100):0;
  const hotéisOrd=Object.entries(porHotel).sort((a,b)=>b[1]-a[1]);
  const catOrd=Object.entries(porCat).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]);
  body.innerHTML=`
    <div class="grid4" style="margin-bottom:18px">
      <div class="kpi"><div class="l">Total de quebras</div><div class="v" style="color:var(--red)">${fmt(totalQ)}</div><div class="s">${hs.length} hotel(éis)</div></div>
      <div class="kpi"><div class="l">Taxa de quebra</div><div class="v">${fmt1(taxa)}%</div><div class="s">sobre existências</div></div>
      <div class="kpi"><div class="l">Sem causa discriminada</div><div class="v" style="color:var(--muted)">${fmt(semCausa)}</div><div class="s">${totalQ>0?fmt1(semCausa/totalQ*100):0}% do total</div></div>
      <div class="kpi"><div class="l">Principal causa</div><div class="v" style="font-size:18px">${(()=>{const t=CAUSAS_QUEBRA.map(c=>[c.label,porCausa[c.k]]).sort((a,b)=>b[1]-a[1])[0];return t&&t[1]>0?esc(t[0]):'—';})()}</div></div>
    </div>
    <div class="grid2">
      <div class="card"><div class="ch"><h2>Quebras por causa</h2></div><div class="cb"><canvas id="qbCanvas" height="150"></canvas></div></div>
      <div class="card"><div class="ch"><h2>Hotéis com mais quebras</h2></div>
        <div class="tbl-wrap"><table><thead><tr><th>Hotel</th><th class="num">Quebras</th></tr></thead><tbody>
        ${hotéisOrd.slice(0,12).map(([n,v])=>`<tr><td>${esc(n)}</td><td class="num" style="color:var(--red);font-weight:600">${fmt(v)}</td></tr>`).join('')}
        </tbody></table></div></div>
    </div>
    <div class="card">
      <div class="ch"><h2>Quebras por categoria</h2></div>
      <div class="tbl-wrap"><table><thead><tr><th>Categoria</th><th class="num">Quebras</th><th class="num">% do total</th></tr></thead><tbody>
      ${catOrd.map(([n,v])=>`<tr><td>${esc(n)}</td><td class="num">${fmt(v)}</td><td class="num" style="color:var(--muted)">${fmt1(v/totalQ*100)}%</td></tr>`).join('')}
      </tbody></table></div>
    </div>`;
  const labels=CAUSAS_QUEBRA.map(c=>c.label), vals=CAUSAS_QUEBRA.map(c=>porCausa[c.k]);
  if(semCausa>0){ labels.push('Sem discriminar'); vals.push(semCausa); }
  if(qbChart) qbChart.destroy();
  qbChart=new Chart(window.HK35Root.getElementById('qbCanvas'),{type:'doughnut',
    data:{labels,datasets:[{data:vals,backgroundColor:[...CAUSAS_QUEBRA.map(c=>c.cor),'#cbd5e1']}]},
    options:{plugins:{legend:{position:'right',labels:{font:{size:11},boxWidth:12}}}}});
}
async function exportQuebras(){
  await ensureXLSX35();
  const camp=campanhaAtiva(); const {hs,porCausa,porHotel,porCat,semCausa,totalQ}=qbData();
  const wb=XLSX.utils.book_new();
  // folha por causa
  const c1=[['Causa','Quantidade'],...CAUSAS_QUEBRA.map(c=>[c.label,porCausa[c.k]]),['Sem discriminar',semCausa],['TOTAL',totalQ]];
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(c1),'Por causa');
  // folha por hotel
  const c2=[['Hotel','Quebras'],...Object.entries(porHotel).sort((a,b)=>b[1]-a[1])];
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(c2),'Por hotel');
  // folha por categoria
  const c3=[['Categoria','Quebras','% do total'],...Object.entries(porCat).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).map(([n,v])=>[n,v,totalQ>0?Math.round(v/totalQ*1000)/10:0])];
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(c3),'Por categoria');
  const safe=s=>String(s).replace(/[^\w]+/g,'_').slice(0,20);
  XLSX.writeFile(wb,`VG_Quebras_${safe(camp?camp.nome:'')}.xlsx`);
  logAdd('Exportação quebras',camp?camp.nome:''); saveDB();
}

/* ============================================================
   CAMADA 3 — VALORIZAÇÃO FINANCEIRA (€)
   Usa o custo unitário (l.unit, herdado do custo do catálogo).
   ============================================================ */
VIEWS.valor={ title:'Valorização financeira', crumb:'Valor de stock, quebras e reposição em €', render(){
  const c=window.HK35Root.getElementById('content');
  if(!veTodosHoteis()){ noPerm(); return; }
  const camp=campanhaAtiva(); if(camp)CURRENT_CAMP=camp.id;
  const regioes=[...new Set(hoteisVisiveis().map(h=>h.regiao))].sort();
  c.innerHTML=`
    <div class="toolbar">
      <div class="field" style="min-width:200px"><label>Campanha</label>
        ${campSelectHTML('onchange="mudarCampanha(this.value,\'valor\')"')}</div>
      <div class="field" style="min-width:180px"><label>Âmbito</label>
        <select id="vlAmbito" onchange="onVlAmbito()">
          <option value="todos">Todos os meus hotéis</option>
          <option value="regiao">Por região</option>
        </select></div>
      <div class="field" style="min-width:200px;display:none" id="vlRegWrap"><label>Região</label>
        <select id="vlRegiao" onchange="renderValor()">${regioes.map(r=>`<option>${esc(r)}</option>`).join('')}</select></div>
      <div class="field" style="min-width:150px"><label>Base reposição</label>
        <select id="vlBase" onchange="renderValor()"><option value="sugerida">Compra sugerida</option><option value="aprovada">Aprovado DO</option></select></div>
      <div class="sp" style="flex:1"></div>
      <button class="btn btn-ghost" onclick="exportValor()">Exportar Excel</button>
    </div>
    <div id="vlBody"></div>`;
  onVlAmbito();
}};
function onVlAmbito(){ const a=window.HK35Root.getElementById('vlAmbito').value; window.HK35Root.getElementById('vlRegWrap').style.display=a==='regiao'?'':'none'; renderValor(); }
function vlHoteis(){ const a=window.HK35Root.getElementById('vlAmbito').value; let hs=hoteisVisiveis(); if(a==='regiao'){const r=window.HK35Root.getElementById('vlRegiao').value;hs=hs.filter(h=>h.regiao===r);} return hs; }
function eur(n){ if(n==null||isNaN(n))return '—'; return (Math.round(n)).toLocaleString('pt-PT')+' €'; }
function vlData(){
  const hs=vlHoteis(); const base=window.HK35Root.getElementById('vlBase').value; const inv=DB.invent[CURRENT_CAMP]||{};
  const porHotel={}; const porCat={}; let semCusto=0, comCusto=0;
  let vStock=0,vQuebra=0,vRepor=0;
  hs.forEach(h=>{ const hi=inv[h.id]; if(!hi)return;
    let hs_=0,hq=0,hr=0;
    hi.linhas.forEach(l=>{
      const u=num(l.unit);
      const temU=(l.unit!==''&&l.unit!=null&&!isNaN(l.unit)&&u>0);
      if(temU)comCusto++; else if(num(l.existencias)>0||num(l.quebras)>0)semCusto++;
      const cc=calcLinha(l);
      const repor = base==='aprovada'?cc.aprov:(cc.sugerida>0?Math.round(cc.sugerida):0);
      const vs=num(l.existencias)*u, vq=quebraLinha(l)*u, vr=repor*u;
      vStock+=vs; vQuebra+=vq; vRepor+=vr; hs_+=vs;hq+=vq;hr+=vr;
      const o=porCat[l.cat]=porCat[l.cat]||{stock:0,quebra:0,repor:0}; o.stock+=vs;o.quebra+=vq;o.repor+=vr;
    });
    porHotel[h.nome]={stock:hs_,quebra:hq,repor:hr};
  });
  return {hs,porHotel,porCat,vStock,vQuebra,vRepor,semCusto,comCusto};
}
function renderValor(){
  const body=window.HK35Root.getElementById('vlBody'); if(!body)return;
  const d=vlData();
  if(!d.comCusto){ body.innerHTML='<div class="help" style="background:var(--amber-bg);border-color:#e6cf94;color:#8a6212">⚠ Ainda não há custos unitários definidos. Preencha a coluna <b>Custo unit. (€)</b> no Catálogo para valorizar o stock, as quebras e a reposição.</div>'; return; }
  const hotéisOrd=Object.entries(d.porHotel).sort((a,b)=>b[1].quebra-a[1].quebra);
  const catOrd=Object.entries(d.porCat).sort((a,b)=>(b[1].stock)-(a[1].stock));
  body.innerHTML=`
    <div class="grid3" style="margin-bottom:18px">
      <div class="kpi"><div class="l">Valor do stock atual</div><div class="v">${eur(d.vStock)}</div><div class="s">${d.hs.length} hotel(éis)</div></div>
      <div class="kpi"><div class="l">Custo das quebras</div><div class="v" style="color:var(--red)">${eur(d.vQuebra)}</div></div>
      <div class="kpi"><div class="l">Investimento de reposição</div><div class="v" style="color:var(--blue)">${eur(d.vRepor)}</div></div>
    </div>
    ${d.semCusto>0?`<div class="help" style="background:var(--amber-bg);border-color:#e6cf94;color:#8a6212">⚠ ${d.semCusto} linha(s) com stock/quebras mas <b>sem custo unitário</b> — não estão incluídas nos valores. Defina o custo no Catálogo.</div>`:''}
    <div class="card">
      <div class="ch"><h2>Valor por categoria</h2></div>
      <div class="tbl-wrap"><table><thead><tr><th>Categoria</th><th class="num">Valor stock</th><th class="num">Custo quebras</th><th class="num">Reposição</th></tr></thead><tbody>
      ${catOrd.map(([n,o])=>`<tr><td><b>${esc(n)}</b></td><td class="num">${eur(o.stock)}</td><td class="num" style="color:var(--red)">${eur(o.quebra)}</td><td class="num pos">${eur(o.repor)}</td></tr>`).join('')}
      </tbody><tfoot><tr style="border-top:2px solid var(--line2)"><td><b>Total</b></td><td class="num"><b>${eur(d.vStock)}</b></td><td class="num" style="color:var(--red)"><b>${eur(d.vQuebra)}</b></td><td class="num"><b>${eur(d.vRepor)}</b></td></tr></tfoot></table></div>
    </div>
    <div class="card">
      <div class="ch"><h2>Valor por hotel</h2><div class="d">ordenado pelo custo de quebras</div></div>
      <div class="tbl-wrap"><table><thead><tr><th>Hotel</th><th class="num">Valor stock</th><th class="num">Custo quebras</th><th class="num">Reposição</th></tr></thead><tbody>
      ${hotéisOrd.map(([n,o])=>`<tr><td>${esc(n)}</td><td class="num">${eur(o.stock)}</td><td class="num" style="color:var(--red)">${eur(o.quebra)}</td><td class="num pos">${eur(o.repor)}</td></tr>`).join('')}
      </tbody></table></div>
    </div>`;
}
async function exportValor(){
  await ensureXLSX35();
  const camp=campanhaAtiva(); const d=vlData();
  const wb=XLSX.utils.book_new();
  const cat=[['Categoria','Valor stock €','Custo quebras €','Reposição €'],...Object.entries(d.porCat).sort((a,b)=>b[1].stock-a[1].stock).map(([n,o])=>[n,Math.round(o.stock),Math.round(o.quebra),Math.round(o.repor)]),['TOTAL',Math.round(d.vStock),Math.round(d.vQuebra),Math.round(d.vRepor)]];
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(cat),'Por categoria');
  const hot=[['Hotel','Valor stock €','Custo quebras €','Reposição €'],...Object.entries(d.porHotel).sort((a,b)=>b[1].quebra-a[1].quebra).map(([n,o])=>[n,Math.round(o.stock),Math.round(o.quebra),Math.round(o.repor)])];
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(hot),'Por hotel');
  const safe=s=>String(s).replace(/[^\w]+/g,'_').slice(0,20);
  XLSX.writeFile(wb,`VG_Valorizacao_${safe(camp?camp.nome:'')}.xlsx`);
  logAdd('Exportação valorização',camp?camp.nome:''); saveDB();
}

/* ============================================================
   CAMADA 4 — ALERTAS DE RUTURA (par-stock vs existências + quebra projetada)
   Sem ocupação externa (fica p/ + tarde): usa a taxa de quebra observada
   entre as duas últimas campanhas para projetar existências futuras.
   ============================================================ */
/* taxa de quebra por categoria entre as duas últimas campanhas (fração) */
function taxasQuebraGlobais(){
  const camps=DB.campanhas; if(camps.length<2) return {};
  const ini=DB.invent[camps[camps.length-2].id]||{}, fim=DB.invent[camps[camps.length-1].id]||{};
  const acc={}; // cat -> {ini,real}
  Object.keys(fim).forEach(hid=>{
    const li=ini[hid]?ini[hid].linhas:[], lf=fim[hid].linhas;
    const mi={}; li.forEach(l=>mi[l.cat+'|'+l.cama+'|'+l.medida]=l);
    lf.forEach(b=>{ const a=mi[b.cat+'|'+b.cama+'|'+b.medida];
      const existIni=a?num(a.existencias):0; const compras=a?calcLinha(a).aprov:0; const existFim=num(b.existencias);
      const real=existIni+compras-existFim;
      const o=acc[b.cat]=acc[b.cat]||{ini:0,real:0}; o.ini+=existIni; o.real+=real;
    });
  });
  const taxa={}; Object.keys(acc).forEach(c=>{ taxa[c]= acc[c].ini>0? Math.max(0,acc[c].real/acc[c].ini) : 0; });
  return taxa;
}
VIEWS.alertas={ title:'Alertas de rutura', crumb:'Par-stock vs existências e quebra projetada', render(){
  const c=window.HK35Root.getElementById('content');
  if(!veTodosHoteis()){ noPerm(); return; }
  const camp=campanhaAtiva(); if(camp)CURRENT_CAMP=camp.id;
  const regioes=[...new Set(hoteisVisiveis().map(h=>h.regiao))].sort();
  c.innerHTML=`
    <div class="toolbar">
      <div class="field" style="min-width:200px"><label>Campanha</label>
        ${campSelectHTML('onchange="mudarCampanha(this.value,\'alertas\')"')}</div>
      <div class="field" style="min-width:180px"><label>Âmbito</label>
        <select id="alAmbito" onchange="onAlAmbito()"><option value="todos">Todos os meus hotéis</option><option value="regiao">Por região</option></select></div>
      <div class="field" style="min-width:200px;display:none" id="alRegWrap"><label>Região</label>
        <select id="alRegiao" onchange="renderAlertas()">${regioes.map(r=>`<option>${esc(r)}</option>`).join('')}</select></div>
      <div class="field" style="min-width:160px"><label>Severidade</label>
        <select id="alSev" onchange="renderAlertas()"><option value="todos">Todos</option><option value="rutura">Já em rutura</option><option value="risco">Em risco projetado</option></select></div>
      <div class="sp" style="flex:1"></div>
      <button class="btn btn-ghost" onclick="exportAlertas()">Exportar Excel</button>
    </div>
    <div id="alBody"></div>`;
  onAlAmbito();
}};
function onAlAmbito(){ const a=window.HK35Root.getElementById('alAmbito').value; window.HK35Root.getElementById('alRegWrap').style.display=a==='regiao'?'':'none'; renderAlertas(); }
function alHoteis(){ const a=window.HK35Root.getElementById('alAmbito').value; let hs=hoteisVisiveis(); if(a==='regiao'){const r=window.HK35Root.getElementById('alRegiao').value;hs=hs.filter(h=>h.regiao===r);} return hs; }
function alData(){
  const hs=alHoteis(); const inv=DB.invent[CURRENT_CAMP]||{}; const taxas=taxasQuebraGlobais();
  const linhas=[];
  hs.forEach(h=>{ const hi=inv[h.id]; if(!hi)return;
    hi.linhas.forEach(l=>{
      const cc=calcLinha(l); const par=cc.par; const exist=num(l.existencias);
      if(par<=0 && exist<=0) return;
      const taxa=taxas[l.cat]||0;
      const projFim = Math.round(exist*(1-taxa)); // existências projetadas p/ próxima contagem
      const emRutura = exist < par;
      const emRisco = !emRutura && projFim < par;
      if(!emRutura && !emRisco) return;
      linhas.push({hotel:h.nome, cat:l.cat, medida:l.medida||l.cama||'—', par, exist, taxa, projFim, emRutura, emRisco,
        defice: emRutura?(par-exist):(par-projFim)});
    });
  });
  return {hs, linhas};
}
function renderAlertas(){
  const body=window.HK35Root.getElementById('alBody'); if(!body)return;
  const sev=window.HK35Root.getElementById('alSev').value;
  let {hs,linhas}=alData();
  if(sev==='rutura') linhas=linhas.filter(x=>x.emRutura);
  else if(sev==='risco') linhas=linhas.filter(x=>x.emRisco);
  const camps=DB.campanhas;
  const semTaxa=camps.length<2;
  const nRut=linhas.filter(x=>x.emRutura).length, nRisco=linhas.filter(x=>x.emRisco).length;
  if(!linhas.length){ body.innerHTML=`${semTaxa?'<div class="help">Só há uma campanha — os alertas de <b>risco projetado</b> precisam de uma campanha anterior para estimar a taxa de quebra. Mostram-se apenas as ruturas atuais (existências abaixo do par-stock).</div>':''}<div class="empty"><div class="ic">✓</div>Sem alertas no âmbito e severidade selecionados.</div>`; return; }
  linhas.sort((a,b)=>(b.emRutura-a.emRutura)||(b.defice-a.defice));
  body.innerHTML=`
    ${semTaxa?'<div class="help">Só existe uma campanha: o risco projetado usa taxa de quebra 0. Crie a próxima campanha para projeções reais.</div>':''}
    <div class="grid3" style="margin-bottom:18px">
      <div class="kpi"><div class="l">Já em rutura</div><div class="v" style="color:var(--red)">${nRut}</div><div class="s">existências < par-stock</div></div>
      <div class="kpi"><div class="l">Em risco projetado</div><div class="v" style="color:var(--amber)">${nRisco}</div><div class="s">cairão abaixo até à próxima contagem</div></div>
      <div class="kpi"><div class="l">Défice total de peças</div><div class="v">${fmt(linhas.reduce((s,x)=>s+Math.max(0,x.defice),0))}</div></div>
    </div>
    <div class="card">
      <div class="ch"><h2>Alertas</h2><div class="d">${linhas.length} linha(s)</div></div>
      <div class="tbl-wrap"><table><thead><tr>
        <th>Estado</th><th>Hotel</th><th>Categoria</th><th>Medida</th>
        <th class="num">Existências</th><th class="num">Par-stock</th>
        <th class="num">Taxa quebra</th><th class="num">Proj. próxima</th><th class="num">Défice</th>
      </tr></thead><tbody>
      ${linhas.map(x=>`<tr>
        <td>${x.emRutura?'<span class="badge" style="background:var(--red-bg);color:var(--red)">Rutura</span>':'<span class="badge" style="background:var(--amber-bg);color:var(--amber)">Risco</span>'}</td>
        <td>${esc(x.hotel)}</td><td>${esc(x.cat)}</td><td style="font-size:12px">${esc(x.medida)}</td>
        <td class="num">${fmt(x.exist)}</td><td class="num">${fmt(x.par)}</td>
        <td class="num" style="color:var(--muted)">${fmt1(x.taxa*100)}%</td>
        <td class="num">${fmt(x.projFim)}</td>
        <td class="num" style="color:var(--red);font-weight:600">${fmt(Math.max(0,x.defice))}</td>
      </tr>`).join('')}
      </tbody></table></div>
    </div>
    <div class="help"><b>Rutura</b>: existências já abaixo do par-stock. <b>Risco projetado</b>: ao ritmo de quebra observado entre as duas últimas campanhas, as existências cairão abaixo do par-stock antes da próxima contagem. Taxa de quebra calculada por categoria a partir da quebra real do último período.</div>`;
}
async function exportAlertas(){
  await ensureXLSX35();
  const camp=campanhaAtiva(); let {linhas}=alData();
  const head=['Estado','Hotel','Categoria','Medida','Existências','Par-stock','Taxa quebra %','Proj. próxima','Défice'];
  const rows=linhas.map(x=>[x.emRutura?'Rutura':'Risco',x.hotel,x.cat,x.medida,x.exist,x.par,Math.round(x.taxa*1000)/10,x.projFim,Math.max(0,x.defice)]);
  const ws=XLSX.utils.aoa_to_sheet([['Alertas de rutura — '+(camp?camp.nome:'')],[ 'Exportado: '+dt(now())],[],head,...rows]);
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Alertas');
  const safe=s=>String(s).replace(/[^\w]+/g,'_').slice(0,20);
  XLSX.writeFile(wb,`VG_Alertas_Rutura_${safe(camp?camp.nome:'')}.xlsx`);
  logAdd('Exportação alertas',camp?camp.nome:''); saveDB();
}

VIEWS.proj={ title:'Projeção de compra', crumb:'Necessidades por tipo de roupa, medida e âmbito', render(){
  const c=window.HK35Root.getElementById('content');
  const regioes=[...new Set(hoteisVisiveis().map(h=>h.regiao))].sort();
  const camp=campanhaAtiva(); if(camp)CURRENT_CAMP=camp.id;
  c.innerHTML=`
    <div class="toolbar">
      <div class="field" style="min-width:200px"><label>Campanha</label>
        ${campSelectHTML('onchange="mudarCampanha(this.value,\'proj\')"')}</div>
      <div class="field" style="min-width:180px"><label>Âmbito</label>
        <select id="pjAmbito" onchange="onAmbito()">
          <option value="todos">Todos os meus hotéis</option>
          <option value="regiao">Por região</option>
          <option value="hotel">Por hotel</option>
        </select></div>
      <div class="field" style="min-width:220px" id="pjRegWrap"><label>Região</label>
        <select id="pjRegiao" onchange="renderProj()">${regioes.map(r=>`<option>${esc(r)}</option>`).join('')}</select></div>
      <div class="field" style="min-width:260px" id="pjHotelWrap"><label>Hotel</label>
        <select id="pjHotel" onchange="renderProj()">${hoteisVisiveis().map(h=>`<option value="${h.id}">${esc(h.nome)}</option>`).join('')}</select></div>
      <div class="field" style="min-width:150px"><label>Base de compra</label>
        <select id="pjBase" onchange="renderProj()">
          <option value="sugerida">Compra sugerida</option>
          <option value="aprovada">Compra aprovada DO</option>
        </select></div>
      <div class="sp" style="flex:1"></div>
      <button class="btn btn-ghost" onclick="exportProj()">Exportar lista</button>
      <button class="btn btn-gold" onclick="exportProjMatriz()">Exportar matriz (hotéis × categorias)</button>
    </div>
    <div id="projBody"></div>`;
  onAmbito();
}};
function onAmbito(){
  const a=window.HK35Root.getElementById('pjAmbito').value;
  window.HK35Root.getElementById('pjRegWrap').style.display=a==='regiao'?'':'none';
  window.HK35Root.getElementById('pjHotelWrap').style.display=a==='hotel'?'':'none';
  renderProj();
}
function projHoteis(){
  const a=window.HK35Root.getElementById('pjAmbito').value;
  let hs=hoteisVisiveis();
  if(a==='regiao'){ const r=window.HK35Root.getElementById('pjRegiao').value; hs=hs.filter(h=>h.regiao===r); }
  else if(a==='hotel'){ const id=window.HK35Root.getElementById('pjHotel').value; hs=hs.filter(h=>h.id===id); }
  return hs;
}
function projData(){
  const hs=projHoteis(); const base=window.HK35Root.getElementById('pjBase').value;
  const map={}; // key cat|medida -> {cat,medida,qty,valor}
  hs.forEach(h=>{ const inv=invDoHotel(h.id); if(!inv)return;
    inv.linhas.forEach(l=>{ const cc=calcLinha(l);
      const q = base==='aprovada' ? cc.aprov : (cc.sugerida>0?Math.round(cc.sugerida):0);
      if(q<=0) return;
      const k=l.cat+'|'+(l.medida||l.cama||'');
      if(!map[k]) map[k]={cat:l.cat,medida:(l.medida||l.cama||'—'),qty:0,valor:0};
      map[k].qty+=q; map[k].valor+=q*num(l.unit);
    });
  });
  return {hs, rows:Object.values(map).sort((a,b)=>a.cat.localeCompare(b.cat)||String(a.medida).localeCompare(String(b.medida)))};
}
function renderProj(){
  const {hs,rows}=projData();
  const body=window.HK35Root.getElementById('projBody');
  if(!rows.length){ body.innerHTML='<div class="empty"><div class="ic">◈</div>Sem necessidades de compra no âmbito selecionado.<br><small>Verifique se os hotéis têm inventário gravado.</small></div>'; if(projChart){projChart.destroy();projChart=null;} return; }
  const totQ=rows.reduce((s,r)=>s+r.qty,0);
  // agregação por categoria para o gráfico
  const porCat={}; rows.forEach(r=>porCat[r.cat]=(porCat[r.cat]||0)+r.qty);
  const cats=Object.keys(porCat).sort((a,b)=>porCat[b]-porCat[a]);
  body.innerHTML=`
    <div class="grid3" style="margin-bottom:18px">
      <div class="kpi"><div class="l">Hotéis no âmbito</div><div class="v">${hs.length}</div></div>
      <div class="kpi"><div class="l">Total a comprar</div><div class="v" style="color:var(--blue)">${fmt(totQ)}</div><div class="s">peças</div></div>
      <div class="kpi"><div class="l">Referências</div><div class="v">${rows.length}</div><div class="s">tipo × medida</div></div>
    </div>
    <div class="card"><div class="ch"><h2>Compra por categoria</h2></div><div class="cb"><canvas id="projCanvas" height="90"></canvas></div></div>
    <div class="card">
      <div class="ch"><h2>Detalhe por tipo de roupa e medida</h2><div class="d">${hs.length} hotel(éis)</div></div>
      <div class="tbl-wrap"><table><thead><tr><th>Categoria</th><th>Medida</th><th class="num">Qtd a comprar</th><th class="num">Valor est. (€)</th></tr></thead><tbody>
      ${rows.map(r=>`<tr><td>${esc(r.cat)}</td><td>${esc(r.medida)}</td><td class="num"><b>${fmt(r.qty)}</b></td><td class="num">${r.valor>0?fmt(r.valor):'—'}</td></tr>`).join('')}
      </tbody><tfoot><tr style="border-top:2px solid var(--line2)"><td colspan="2"><b>Total</b></td><td class="num"><b>${fmt(totQ)}</b></td><td class="num"><b>${fmt(rows.reduce((s,r)=>s+r.valor,0))||'—'}</b></td></tr></tfoot></table></div>
    </div>`;
  if(projChart) projChart.destroy();
  projChart=new Chart(window.HK35Root.getElementById('projCanvas'),{type:'bar',
    data:{labels:cats,datasets:[{label:'Peças a comprar',data:cats.map(c=>porCat[c]),backgroundColor:'#1f4d75',borderRadius:5}]},
    options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{font:{size:11}}},x:{ticks:{font:{size:10},maxRotation:60,minRotation:30}}}}});
}

/* ============================================================
   UTILIZADORES & ACESSOS  (só DO)
   ============================================================ */
VIEWS.users={ title:'Utilizadores & acessos', crumb:'Credenciação, papéis e atribuição de hotéis', render(){
  if(!isDO()){ noPerm(); return; }
  window.HK35Root.getElementById('headActions').innerHTML=`<button class="btn btn-gold btn-sm" onclick="editUser()">+ Novo utilizador</button>`;
  const c=window.HK35Root.getElementById('content');
  c.innerHTML=`
    <div class="card">
      <div class="ch"><h2>Utilizadores</h2><div class="d">${DB.users.length} registados</div></div>
      <div class="tbl-wrap"><table><thead><tr><th>Nome</th><th>Utilizador</th><th>Papel</th><th>Hotéis</th><th>Estado</th><th></th></tr></thead><tbody>
      ${DB.users.map(u=>`<tr>
        <td><b>${esc(u.nome)}</b></td><td style="color:var(--muted)">${esc(u.username)}</td>
        <td>${roleBadge(u.role)}</td>
        <td style="font-size:12px;color:var(--muted)">${(u.role==='DO'||u.role==='Compras')?'<i>todos</i>':(u.hoteis.length?u.hoteis.length+' hotel(éis)':'<span style="color:var(--red)">nenhum</span>')}</td>
        <td>${u.ativo?'<span class="badge b-on">Ativo</span>':'<span class="badge b-off">Inativo</span>'}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-ghost btn-sm" onclick="editUser('${u.id}')">Editar</button>
          <button class="btn btn-ghost btn-sm" onclick="toggleUser('${u.id}')">${u.ativo?'Inativar':'Ativar'}</button>
          ${u.username==='admin'?'':`<button class="btn btn-danger btn-sm" onclick="delUser('${u.id}')">Apagar</button>`}
        </td></tr>`).join('')}
      </tbody></table></div>
    </div>
    ${renderRegioesCard()}`;
}};
function renderRegioesCard(){
  const porReg={}; DB.regioes.forEach(r=>porReg[r]=[]);
  DB.hoteis.forEach(h=>{ (porReg[h.regiao]=porReg[h.regiao]||[]).push(h); });
  return `<div class="card">
    <div class="ch"><h2>Regiões & hotéis</h2><div class="d">Organização do portefólio por região</div>
      <div class="sp" style="flex:1"></div><button class="btn btn-ghost btn-sm" onclick="editRegioes()">Gerir regiões</button></div>
    <div class="cb"><div class="grid3">
    ${Object.keys(porReg).sort().map(r=>`<div style="border:1px solid var(--line);border-radius:8px;padding:12px 14px">
      <div style="font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:8px">${esc(r)}<span class="chip" style="background:#eef1f5;color:var(--muted)">${porReg[r].length}</span></div>
      ${porReg[r].map(h=>`<div style="font-size:12.5px;padding:3px 0;color:#334155;display:flex;align-items:center;gap:6px">
        <span>${esc(h.nome)}</span><span style="color:#94a3b8;font-size:11px">${esc(h.cidade)}</span>
        <select style="margin-left:auto;font-size:11px;padding:2px 4px;border:1px solid var(--line);border-radius:5px" onchange="setRegiao('${h.id}',this.value)">
          ${DB.regioes.map(rr=>`<option ${rr===h.regiao?'selected':''}>${esc(rr)}</option>`).join('')}
        </select></div>`).join('')}
    </div>`).join('')}
    </div></div></div>`;
}
function setRegiao(hid,r){ const h=DB.hoteis.find(x=>x.id===hid); logAdd('Região alterada',`${h.nome}: ${h.regiao} → ${r}`); h.regiao=r; saveDB(); toast('Região atualizada'); }

function editUser(id){
  const u=id?DB.users.find(x=>x.id===id):{nome:'',username:'',password:'',role:'Assistente',hoteis:[],ativo:true};
  const isNew=!id;
  modal(isNew?'Novo utilizador':'Editar utilizador',`
    <div class="grid2">
      <div class="field"><label>Nome completo</label><input id="uNome" value="${esc(u.nome)}"></div>
      <div class="field"><label>Utilizador (login)</label><input id="uUser" value="${esc(u.username)}"></div>
    </div>
    <div class="grid2" style="margin-top:14px">
      <div class="field"><label>Palavra-passe</label><input id="uPass" value="${esc(u.password)}" placeholder="${isNew?'':'(inalterada)'}"></div>
      <div class="field"><label>Papel</label><select id="uRole" onchange="window.HK35Root.getElementById('uHoteisWrap').style.display=(this.value==='DO'||this.value==='Compras')?'none':''">
        <option ${u.role==='DO'?'selected':''}>DO</option>
        <option ${u.role==='Compras'?'selected':''}>Compras</option>
        <option ${u.role==='Diretor'?'selected':''}>Diretor</option>
        <option ${u.role==='Assistente'?'selected':''}>Assistente</option>
        <option ${u.role==='Governanta'?'selected':''}>Governanta</option>
      </select></div>
    </div>
    <div style="font-size:11.5px;color:var(--muted);margin-top:-4px;margin-bottom:6px">DO: acesso total. Compras: vê todos os hotéis e exporta, mas só-leitura e sem administração. Diretor/Assistente: só os hotéis atribuídos. Governanta: modo mobile simples — conta existências e quebras nos hotéis atribuídos.</div>
    <div id="uHoteisWrap" style="margin-top:10px;display:${(u.role==='DO'||u.role==='Compras')?'none':''}">
      <label style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">Hotéis atribuídos</label>
      <div style="max-height:220px;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:8px;margin-top:6px">
      ${[...new Set(DB.hoteis.map(h=>h.regiao))].sort().map(r=>`
        <div style="font-size:11px;font-weight:700;color:var(--steel);text-transform:uppercase;letter-spacing:.4px;margin:8px 4px 4px">${esc(r)}</div>
        ${ordenarHoteis(DB.hoteis.filter(h=>h.regiao===r)).map(h=>`<label style="display:flex;align-items:center;gap:8px;padding:4px 6px;font-size:13px;font-weight:400;text-transform:none;letter-spacing:0;color:var(--ink)">
          <input type="checkbox" class="uHotel" value="${h.id}" ${u.hoteis.includes(h.id)?'checked':''}>${esc(h.nome)}</label>`).join('')}
      `).join('')}
      </div>
    </div>`,
    [{t:isNew?'Criar utilizador':'Guardar',cls:'btn-gold',fn:()=>saveUser(id)},{t:'Cancelar',cls:'btn-ghost',fn:closeModal}]);
}
function saveUser(id){
  const nome=val('uNome').trim(), username=val('uUser').trim(), pass=val('uPass'), role=val('uRole');
  if(!nome||!username){ toast('Nome e utilizador são obrigatórios',true); return; }
  const dup=DB.users.find(x=>x.username.toLowerCase()===username.toLowerCase()&&x.id!==id);
  if(dup){ toast('Já existe um utilizador com esse login',true); return; }
  const hoteis=(role==='DO'||role==='Compras')?[]:[...window.HK35Root.querySelectorAll('.uHotel:checked')].map(c=>c.value);
  if(id){ const u=DB.users.find(x=>x.id===id);
    const chg=[]; if(u.nome!==nome)chg.push('nome'); if(u.role!==role)chg.push('papel '+u.role+'→'+role); if(u.hoteis.length!==hoteis.length)chg.push('hotéis');
    u.nome=nome;u.username=username;if(pass)u.password=pass;u.role=role;u.hoteis=hoteis;
    logAdd('Utilizador editado',`${username}${chg.length?' ('+chg.join(', ')+')':''}`);
  }else{
    DB.users.push({id:uid(),nome,username,password:pass||'',role,hoteis,ativo:true});
    logAdd('Utilizador criado',`${username} · ${role}`);
  }
  saveDB(); closeModal(); toast('Utilizador guardado'); go('users');
}
function toggleUser(id){ const u=DB.users.find(x=>x.id===id); u.ativo=!u.ativo; logAdd('Utilizador '+(u.ativo?'ativado':'inativado'),u.username); saveDB(); go('users'); }
function delUser(id){ const u=DB.users.find(x=>x.id===id);
  confirmModal(`Apagar o utilizador <b>${esc(u.username)}</b>? Esta ação é definitiva.`,()=>{
    DB.users=DB.users.filter(x=>x.id!==id); logAdd('Utilizador apagado',u.username); saveDB(); go('users'); toast('Utilizador apagado');});}

function editRegioes(){
  modal('Gerir regiões',`
    <div id="regList">${DB.regioes.map(r=>regRow(r)).join('')}</div>
    <button class="btn btn-ghost btn-sm" style="margin-top:10px" onclick="window.HK35Root.getElementById('regList').insertAdjacentHTML('beforeend',regRow(''))">+ Adicionar região</button>`,
    [{t:'Guardar',cls:'btn-gold',fn:saveRegioes},{t:'Cancelar',cls:'btn-ghost',fn:closeModal}]);
}
function regRow(r){ return `<div style="display:flex;gap:8px;margin-bottom:7px"><input class="regIn" value="${esc(r)}" style="flex:1;padding:8px 10px;border:1px solid var(--line2);border-radius:7px"><button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">✕</button></div>`; }
function saveRegioes(){
  const novas=[...window.HK35Root.querySelectorAll('.regIn')].map(i=>i.value.trim()).filter(Boolean);
  const removidas=DB.regioes.filter(r=>!novas.includes(r));
  removidas.forEach(r=>DB.hoteis.filter(h=>h.regiao===r).forEach(h=>h.regiao=novas[0]||'Sem Região'));
  DB.regioes=[...new Set(novas)]; logAdd('Regiões atualizadas',DB.regioes.join(', ')); saveDB(); closeModal(); go('users'); toast('Regiões guardadas');
}

/* ============================================================
   CATÁLOGO DE ROUPAS  (só DO)
   ============================================================ */
VIEWS.catalogo={ title:'Catálogo de roupas', crumb:'Categorias, medidas de cama e de roupa', render(){
  if(!isDO()){ noPerm(); return; }
  window.HK35Root.getElementById('headActions').innerHTML=`<button class="btn btn-ghost btn-sm" onclick="importarPrecos()">Importar preços</button> <button class="btn btn-ghost btn-sm" onclick="aplicarVestido()">Pré-preencher Vestido 100%</button> <button class="btn btn-ghost btn-sm" onclick="editCamas()">Medidas de cama</button> <button class="btn btn-gold btn-sm" onclick="editCategoria()">+ Nova categoria</button>`;
  const c=window.HK35Root.getElementById('content');
  c.innerHTML=`<div class="help">Alterações ao catálogo aplicam-se a todos os hotéis. Ao adicionar/remover linhas, o inventário de cada hotel reconcilia automaticamente na próxima abertura (os valores já preenchidos são preservados).</div>
  ${DB.catalogo.categorias.map((cat,ci)=>`
    <div class="card">
      <div class="ch"><h2>${esc(cat.nome)}</h2>
        <button class="btn ${(cat.indiceOverrides&&cat.indiceOverrides.length)?'btn-gold':'btn-ghost'} btn-sm" onclick="openIndice(${ci})">índice ${fmt1(cat.indice)}${(cat.indiceOverrides&&cat.indiceOverrides.length)?' · '+cat.indiceOverrides.length+' exceç'+(cat.indiceOverrides.length>1?'ões':'ão'):''} ✎</button>
        <span class="chip" style="background:#eef1f5;color:var(--muted)">${cat.porCama?'por cama':'por unidade'}</span>
        ${cat.porCama?`<span style="display:inline-flex;align-items:center;gap:6px;margin-left:8px;font-size:12px;color:var(--muted)">peças/cama fixa <input class="cell-in" style="width:52px" type="number" step="0.1" min="0" value="${pecasFixaDe(cat)}" onchange="VGHK35.DB.catalogo.categorias[${ci}].pecasFixa=num(this.value);markCat()" title="Peças por cama fixa"> · extra/sofá <input class="cell-in" style="width:52px" type="number" step="0.1" min="0" value="${pecasExtraDe(cat)}" onchange="VGHK35.DB.catalogo.categorias[${ci}].pecasExtra=num(this.value);markCat()" title="Peças por cama extra/sofá"></span>`:''}
        <div class="sp" style="flex:1"></div>
        <button class="btn btn-ghost btn-sm" onclick="editCategoria(${ci})">Editar</button>
        <button class="btn btn-ghost btn-sm" onclick="addLinha(${ci})">+ Linha</button>
        <button class="btn btn-danger btn-sm" onclick="delCategoria(${ci})">Apagar categoria</button>
      </div>
      <div class="tbl-wrap"><table><thead><tr><th>Cama</th><th>Medida da roupa</th><th class="num">Custo unit. (€)</th><th>Aplica-se a</th><th></th></tr></thead><tbody>
      ${cat.linhas.map((l,li)=>{ const ap=l.aplic||defAplic(); const todos=!ap||ap.modo==='todos';
        return `<tr>
        <td><input class="cell-in" style="text-align:left;width:120px" value="${esc(l.cama)}" onchange="VGHK35.DB.catalogo.categorias[${ci}].linhas[${li}].cama=this.value;markCat()"></td>
        <td><input class="cell-in" style="text-align:left;width:200px" value="${esc(l.medida)}" onchange="VGHK35.DB.catalogo.categorias[${ci}].linhas[${li}].medida=this.value;markCat()"></td>
        <td class="num"><input class="cell-in" style="width:80px" type="number" step="0.01" min="0" value="${l.custo!=null?l.custo:''}" placeholder="—" onchange="VGHK35.DB.catalogo.categorias[${ci}].linhas[${li}].custo=this.value===''?'':num(this.value);markCat()"></td>
        <td><button class="btn ${todos?'btn-ghost':'btn-gold'} btn-sm" onclick="openAplic(${ci},${li})">${todos?'Todos':esc(aplicResumo(ap))} ✎</button></td>
        <td><button class="btn btn-danger btn-sm" onclick="delLinha(${ci},${li})">✕</button></td>
      </tr>`;}).join('')}
      </tbody></table></div>
    </div>`).join('')}`;
}};
function markCat(){ logAdd('Catálogo alterado','medida editada'); saveDB(); }

/* ---------- Importar preços do fornecedor (casa por categoria + medida exata) ----------
   Lê o Excel de preços, ignora linhas (ES) e sem preço, identifica categoria+medida,
   e preenche o custo das linhas do catálogo que casam exatamente. Mostra relatório. */
function precoNormMed(s){ const m=String(s).match(/(\d{2,3})\s*[xX]\s*(\d{2,3})/); return m?(m[1]+'x'+m[2]):null; }
function precoCategoria(nome){
  const u=String(nome).toUpperCase();
  const KW=[
    [/FRONHA/,'Fronhas'],[/SACO (DE )?EDRED/,'Saco de Edredão'],[/CAPA EDRED/,'Edredão'],[/EDRED/,'Edredão'],
    [/COLCHA/,'Colcha de Favo'],[/COBERTOR/,'Cobertores'],[/RESGUARDO/,'Resguardos'],
    [/LEN[ÇC]OL/,'Lençol (C/ Edredão)'],[/ALMOFADA \d/,'Almofadas'],
    [/TURCO BANHO|TOALHA.*BANHO/,'Turco Banho'],[/ROSTO/,'Turco Rosto'],[/BID[ÉE]/,'Turco Bidé'],
    [/TAPETE/,'Turco Tapete'],[/PISCINA/,'Turco Piscina'],
  ];
  for(const [re,cat] of KW) if(re.test(u)) return cat;
  return null;
}
function precoNm(s){ return String(s||'').toLowerCase().replace(/\s+/g,'').replace(/[()]/g,''); }
async function importarPrecos(){
  await ensureXLSX35();
  const inp=document.createElement('input'); inp.type='file'; inp.accept='.xlsx,.xls';
  inp.onchange=e=>{ const f=e.target.files[0]; if(!f)return; const rd=new FileReader();
    rd.onload=ev=>{ try{
      const wb=XLSX.read(ev.target.result,{type:'array'});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(ws,{header:1,blankrows:false});
      let hdr=rows.findIndex(r=>r&&r.some(c=>/produto/i.test(String(c)))&&r.some(c=>/pre[çc]o/i.test(String(c))));
      if(hdr<0){ toast('Não encontrei as colunas "Produto" e "Preço"',true); return; }
      const H=rows[hdr].map(x=>String(x));
      const cProd=H.findIndex(h=>/produto/i.test(h)), cPreco=H.findIndex(h=>/pre[çc]o/i.test(h));
      // mapa preços: catNorm|medNorm -> preço
      const precos={};
      let lidos=0, ignoradosES=0, semCatMed=0;
      for(let i=hdr+1;i<rows.length;i++){ const r=rows[i]; if(!r||!r[cProd])continue;
        const nome=String(r[cProd]).trim();
        if(/\(ES\)/i.test(nome)){ ignoradosES++; continue; }
        const preco=r[cPreco]; if(preco==null||preco===''||Number(preco)===0)continue;
        const cat=precoCategoria(nome), med=precoNormMed(nome);
        if(!cat||!med){ semCatMed++; continue; }
        const k=precoNm(cat)+'|'+med;
        if(precos[k]==null){ precos[k]=Number(preco); lidos++; }
      }
      // aplica ao catálogo (casa por categoria+medida exata)
      let preenchidos=0, jaTinham=0; const naoCasaram=[];
      DB.catalogo.categorias.forEach(cat=>cat.linhas.forEach(l=>{
        const med=precoNormMed(l.medida)||precoNormMed(l.cama); if(!med)return;
        const k=precoNm(cat.nome)+'|'+med;
        if(precos[k]!=null){
          if(l.custo!==''&&l.custo!=null) jaTinham++;
          l.custo=precos[k]; preenchidos++;
        }
      }));
      // relatório: preços lidos que não encontraram linha no catálogo
      const catKeys=new Set(); DB.catalogo.categorias.forEach(c=>c.linhas.forEach(l=>{const m=precoNormMed(l.medida)||precoNormMed(l.cama);if(m)catKeys.add(precoNm(c.nome)+'|'+m);}));
      Object.keys(precos).forEach(k=>{ if(!catKeys.has(k)) naoCasaram.push(k+' → '+precos[k]+' €'); });
      logAdd('Importação de preços',`${preenchidos} linhas preenchidas de ${lidos} preços`);
      saveDB();
      modal('Importação de preços concluída',`
        <div class="grid2" style="margin-bottom:14px">
          <div class="kpi"><div class="l">Linhas do catálogo preenchidas</div><div class="v" style="color:var(--green)">${preenchidos}</div></div>
          <div class="kpi"><div class="l">Preços lidos do ficheiro</div><div class="v">${lidos}</div></div>
        </div>
        <div style="font-size:12.5px;color:var(--muted);line-height:1.6;margin-bottom:12px">
          ${ignoradosES} linha(s) (ES) ignoradas · ${semCatMed} sem categoria/medida reconhecível · ${jaTinham} custo(s) substituído(s).
        </div>
        ${naoCasaram.length?`<div class="help" style="background:var(--amber-bg);border-color:#e6cf94;color:#8a6212"><b>${naoCasaram.length} preço(s) sem linha correspondente no catálogo</b> (medida diferente ou artigo fora do catálogo) — estes ficam por preencher:<div style="max-height:160px;overflow:auto;margin-top:8px;font-size:11.5px;font-family:monospace">${naoCasaram.map(esc).join('<br>')}</div></div>`:'<div class="help" style="background:var(--green-bg);border-color:#a8dcc0;color:#1f7a54">Todos os preços reconhecidos foram aplicados.</div>'}
        <div class="help">A correspondência é por <b>categoria + medida exata</b>. Linhas do catálogo sem preço no ficheiro mantêm o custo atual — pode preenchê-las à mão na coluna "Custo unit. (€)".</div>`,
        [{t:'Concluir',cls:'btn-gold',fn:()=>{ closeModal(); go('catalogo'); }}]);
    }catch(err){ toast('Erro ao ler o ficheiro de preços',true); } };
    rd.readAsArrayBuffer(f); };
  inp.click();
}

/* ---------- Pré-preencher Vestido 100% a partir do H.COMPLETO importado ----------
   Aplica à campanha ativa. Preenche APENAS onde o Vestido 100% está vazio;
   não toca em existências, quebras ou aprovações. */
function aplicarVestido(){
  const camp=campanhaAtiva();
  if(!camp){ toast('Sem campanha ativa',true); return; }
  if(camp.fechada){ toast('Campanha fechada — reabra para aplicar',true); return; }
  const nHoteis=Object.keys(SEED_VESTIDO).length;
  modal('Pré-preencher Vestido 100%',`
    <div style="font-size:13.5px;line-height:1.55">
      Vai preencher o <b>Vestido 100%</b> (hotel completo) dos hotéis com valores reais importados, na campanha <b>${esc(camp.nome)}</b>.
      <ul style="margin:12px 0 12px 18px;color:var(--muted);font-size:12.5px">
        <li>Dados disponíveis para <b>${nHoteis} hotéis</b>.</li>
        <li>Só preenche linhas com Vestido 100% <b>vazio</b> — não altera valores já editados.</li>
        <li>Não mexe em existências, quebras nem aprovações.</li>
      </ul>
    </div>`,
    [{t:'Aplicar agora',cls:'btn-gold',fn:()=>{
      let hAfetados=0, cellsFill=0;
      Object.keys(SEED_VESTIDO).forEach(hid=>{
        const hotel=DB.hoteis.find(h=>h.id===hid); if(!hotel) return;
        const inv=ensureInvent(hid, camp.id);
        const mapa=SEED_VESTIDO[hid]; let tocou=false;
        inv.linhas.forEach(l=>{
          const key=l.cat+'|'+l.cama+'|'+l.medida;
          if(mapa[key]!=null && (l.vestido100===''||l.vestido100==null)){
            l.vestido100=mapa[key]; cellsFill++; tocou=true;
          }
        });
        if(tocou) hAfetados++;
      });
      logAdd('Vestido 100% pré-preenchido', `${camp.nome} · ${hAfetados} hotéis · ${cellsFill} linhas`);
      saveDB(); closeModal();
      toast(`Vestido 100% aplicado — ${hAfetados} hotéis, ${cellsFill} linhas`);
      if(CURRENT_VIEW==='param') renderParam();
    }},{t:'Cancelar',cls:'btn-ghost',fn:closeModal}]);
}

/* ---------- Editor de aplicabilidade (a que hotéis se aplica uma linha) ---------- */
function openAplic(ci,li){
  const l=DB.catalogo.categorias[ci].linhas[li];
  const ap=l.aplic||defAplic();
  const regioes=[...new Set(DB.hoteis.map(h=>h.regiao))].sort();
  modal(`Aplica-se a — ${esc(DB.catalogo.categorias[ci].nome)} · ${esc(l.medida||l.cama)}`,`
    <div class="help">Escolha <b>Todos</b> para aplicar esta medida a todo o portefólio, ou <b>Seletivo</b> para escolher regiões e hotéis. Pode incluir regiões inteiras e ainda acrescentar ou excluir hotéis avulsos. Um hotel materializa no seu inventário todas as linhas que se lhe aplicam — pode assim ter duas medidas da mesma categoria.</div>
    <div style="display:flex;gap:8px;margin-bottom:14px">
      <button class="btn ${ap.modo!=='seletivo'?'btn-nav':'btn-ghost'}" id="apModoTodos" onclick="apSetModo('todos')">Todos os hotéis</button>
      <button class="btn ${ap.modo==='seletivo'?'btn-nav':'btn-ghost'}" id="apModoSel" onclick="apSetModo('seletivo')">Seletivo</button>
    </div>
    <div id="apSelWrap" style="display:${ap.modo==='seletivo'?'':'none'}">
      <label style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">Regiões incluídas</label>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 14px">
        ${regioes.map(r=>`<label class="pill" style="cursor:pointer"><input type="checkbox" class="apReg" value="${esc(r)}" ${(ap.regioes||[]).includes(r)?'checked':''} onchange="apRefresh()" style="margin-right:6px">${esc(r)}</label>`).join('')}
      </div>
      <label style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">Hotéis — incluir avulso (＋) ou excluir de uma região (✕)</label>
      <div style="max-height:260px;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:8px;margin-top:6px">
        ${regioes.map(r=>`
          <div style="font-size:11px;font-weight:700;color:var(--steel);text-transform:uppercase;letter-spacing:.4px;margin:8px 4px 4px">${esc(r)}</div>
          ${ordenarHoteis(DB.hoteis.filter(h=>h.regiao===r)).map(h=>`
            <div class="apHotelRow" data-h="${h.id}" data-r="${esc(r)}" style="display:flex;align-items:center;gap:8px;padding:4px 6px;font-size:13px">
              <span style="flex:1">${esc(h.nome)}</span>
              <label style="font-size:11px;color:var(--green);display:flex;align-items:center;gap:4px"><input type="checkbox" class="apInc" value="${h.id}" ${(ap.hoteis||[]).includes(h.id)?'checked':''} onchange="apRefresh()">incluir</label>
              <label style="font-size:11px;color:var(--red);display:flex;align-items:center;gap:4px"><input type="checkbox" class="apExc" value="${h.id}" ${(ap.excluir||[]).includes(h.id)?'checked':''} onchange="apRefresh()">excluir</label>
            </div>`).join('')}
        `).join('')}
      </div>
      <div style="margin-top:12px;font-size:12.5px;color:var(--muted)">Resultado: <b id="apCount">—</b> hotel(éis)</div>
    </div>`,
    [{t:'Guardar',cls:'btn-gold',fn:()=>saveAplic(ci,li)},{t:'Cancelar',cls:'btn-ghost',fn:closeModal}]);
  apRefresh();
}
let AP_MODO=null;
function apSetModo(m){ AP_MODO=m;
  window.HK35Root.getElementById('apSelWrap').style.display=m==='seletivo'?'':'none';
  window.HK35Root.getElementById('apModoTodos').className='btn '+(m!=='seletivo'?'btn-nav':'btn-ghost');
  window.HK35Root.getElementById('apModoSel').className='btn '+(m==='seletivo'?'btn-nav':'btn-ghost');
  apRefresh();
}
function apCollect(){
  const modo=(AP_MODO|| (window.HK35Root.getElementById('apSelWrap').style.display==='none'?'todos':'seletivo'));
  const regioes=[...window.HK35Root.querySelectorAll('.apReg:checked')].map(c=>c.value);
  const hoteis=[...window.HK35Root.querySelectorAll('.apInc:checked')].map(c=>c.value);
  const excluir=[...window.HK35Root.querySelectorAll('.apExc:checked')].map(c=>c.value);
  return {modo,regioes,hoteis,excluir};
}
function apRefresh(){
  const el=window.HK35Root.getElementById('apCount'); if(!el) return;
  const ap=apCollect(); el.textContent=fmt(hoteisDaLinha(ap).length);
}
function saveAplic(ci,li){
  const ap=apCollect();
  if(ap.modo==='todos'){ ap.regioes=[];ap.hoteis=[];ap.excluir=[]; }
  DB.catalogo.categorias[ci].linhas[li].aplic=ap;
  const cat=DB.catalogo.categorias[ci];
  logAdd('Aplicabilidade alterada',`${cat.nome} · ${cat.linhas[li].medida||cat.linhas[li].cama} → ${aplicResumo(ap)}`);
  AP_MODO=null; saveDB(); closeModal(); go('catalogo'); toast('Aplicabilidade guardada');
}

/* ---------- Editor de índice (base + exceções por hotel/região) ---------- */
function openIndice(ci){
  const cat=DB.catalogo.categorias[ci];
  cat.indiceOverrides=cat.indiceOverrides||[];
  const regioes=[...new Set(DB.hoteis.map(h=>h.regiao))].sort();
  modal(`Índice de par-stock — ${esc(cat.nome)}`,`
    <div class="help">O <b>índice base</b> aplica-se a todos os hotéis. Adicione <b>exceções</b> para definir um índice diferente em regiões ou hotéis específicos. Cada linha de inventário recebe o índice da primeira exceção que a cobre; se nenhuma cobrir, usa o base. Par-stock = índice × vestido 100%.</div>
    <div class="field" style="max-width:180px;margin-bottom:16px"><label>Índice base (peças por cama)</label>
      <input id="idxBase" type="number" step="0.1" value="${cat.indice}"></div>
    <label style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">Exceções</label>
    <div id="idxOvs" style="margin-top:8px">${cat.indiceOverrides.map((ov,oi)=>idxOvRow(ov,oi,regioes)).join('')||'<div style="color:var(--muted);font-size:12.5px;padding:6px 0">Sem exceções — todos os hotéis usam o índice base.</div>'}</div>
    <button class="btn btn-ghost btn-sm" style="margin-top:10px" onclick="addIdxOv(${ci})">+ Adicionar exceção</button>`,
    [{t:'Guardar',cls:'btn-gold',fn:()=>saveIndice(ci)},{t:'Cancelar',cls:'btn-ghost',fn:closeModal}]);
}
function idxOvRow(ov,oi,regioes){
  return `<div class="idxOv" data-oi="${oi}" style="border:1px solid var(--line);border-radius:8px;padding:10px 12px;margin-bottom:8px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <div class="field" style="max-width:130px;margin:0"><label>Índice</label><input class="idxVal" type="number" step="0.1" value="${ov.valor}"></div>
      <div style="flex:1;font-size:12px;color:var(--muted)" class="idxResumo">${esc(aplicResumo(ov.aplic))}</div>
      <button class="btn btn-danger btn-sm" onclick="this.closest('.idxOv').remove()">✕</button>
    </div>
    <details><summary style="cursor:pointer;font-size:12px;color:var(--steel);font-weight:600">Definir regiões / hotéis</summary>
      <div style="margin-top:8px">
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">
          ${regioes.map(r=>`<label class="pill" style="cursor:pointer"><input type="checkbox" class="idxReg" value="${esc(r)}" ${(ov.aplic.regioes||[]).includes(r)?'checked':''} style="margin-right:6px">${esc(r)}</label>`).join('')}
        </div>
        <div style="max-height:200px;overflow:auto;border:1px solid var(--line);border-radius:6px;padding:6px">
          ${regioes.map(r=>`<div style="font-size:10.5px;font-weight:700;color:var(--steel);text-transform:uppercase;margin:6px 4px 3px">${esc(r)}</div>
            ${ordenarHoteis(DB.hoteis.filter(h=>h.regiao===r)).map(h=>`<div style="display:flex;align-items:center;gap:8px;padding:2px 6px;font-size:12.5px">
              <span style="flex:1">${esc(h.nome)}</span>
              <label style="font-size:11px;color:var(--green)"><input type="checkbox" class="idxInc" value="${h.id}" ${(ov.aplic.hoteis||[]).includes(h.id)?'checked':''}> incluir</label>
              <label style="font-size:11px;color:var(--red)"><input type="checkbox" class="idxExc" value="${h.id}" ${(ov.aplic.excluir||[]).includes(h.id)?'checked':''}> excluir</label>
            </div>`).join('')}`).join('')}
        </div>
      </div>
    </details>
  </div>`;
}
function addIdxOv(ci){
  const regioes=[...new Set(DB.hoteis.map(h=>h.regiao))].sort();
  const wrap=window.HK35Root.getElementById('idxOvs');
  if(wrap.querySelector('.idxOv')===null) wrap.innerHTML='';
  const oi=wrap.querySelectorAll('.idxOv').length;
  wrap.insertAdjacentHTML('beforeend', idxOvRow({valor:DB.catalogo.categorias[ci].indice,aplic:defAplic()}, oi, regioes));
}
function saveIndice(ci){
  const cat=DB.catalogo.categorias[ci];
  cat.indice=num(val('idxBase'))||cat.indice;
  const ovs=[];
  window.HK35Root.querySelectorAll('#idxOvs .idxOv').forEach(row=>{
    const valor=num(row.querySelector('.idxVal').value);
    const regioes=[...row.querySelectorAll('.idxReg:checked')].map(c=>c.value);
    const hoteis=[...row.querySelectorAll('.idxInc:checked')].map(c=>c.value);
    const excluir=[...row.querySelectorAll('.idxExc:checked')].map(c=>c.value);
    const temAlvo=regioes.length||hoteis.length;
    if(valor && temAlvo) ovs.push({valor, aplic:{modo:'seletivo',regioes,hoteis,excluir}});
  });
  cat.indiceOverrides=ovs;
  logAdd('Índice alterado',`${cat.nome} · base ${fmt1(cat.indice)}${ovs.length?' · '+ovs.length+' exceção(ões)':''}`);
  saveDB(); closeModal(); go('catalogo'); toast('Índice guardado — reflete-se em campanhas abertas na próxima abertura do hotel');
}
function editCategoria(ci){
  const cat=ci!=null?DB.catalogo.categorias[ci]:{nome:'',indice:1,porCama:false,linhas:[{cama:'',medida:'',aplic:defAplic()}]};
  modal(ci!=null?'Editar categoria':'Nova categoria',`
    <div class="field"><label>Nome da categoria</label><input id="cNome" value="${esc(cat.nome)}"></div>
    <div class="grid2" style="margin-top:14px">
      <div class="field"><label>Índice de par-stock (peças por cama)</label><input id="cIndice" type="number" step="0.1" value="${cat.indice}"></div>
      <div class="field"><label>Tipo</label><select id="cPorCama"><option value="true" ${cat.porCama?'selected':''}>Por cama (medida depende da cama)</option><option value="false" ${!cat.porCama?'selected':''}>Por unidade (medida fixa)</option></select></div>
    </div>`,
    [{t:'Guardar',cls:'btn-gold',fn:()=>{
      const nome=val('cNome').trim(); if(!nome){toast('Indique o nome',true);return;}
      cat.nome=nome; cat.indice=num(val('cIndice'))||1; cat.porCama=val('cPorCama')==='true';
      if(ci==null){ DB.catalogo.categorias.push(cat); logAdd('Categoria criada',nome);} else logAdd('Categoria editada',nome);
      saveDB(); closeModal(); go('catalogo'); toast('Categoria guardada');
    }},{t:'Cancelar',cls:'btn-ghost',fn:closeModal}]);
}
function delCategoria(ci){ const cat=DB.catalogo.categorias[ci];
  confirmModal(`Apagar a categoria <b>${esc(cat.nome)}</b> e todas as suas linhas? As quantidades associadas no inventário dos hotéis serão removidas.`,()=>{
    DB.catalogo.categorias.splice(ci,1); logAdd('Categoria apagada',cat.nome); saveDB(); go('catalogo'); toast('Categoria apagada');});}
function addLinha(ci){ DB.catalogo.categorias[ci].linhas.push({cama:'',medida:'',aplic:defAplic()}); logAdd('Catálogo',`linha adicionada em ${DB.catalogo.categorias[ci].nome}`); saveDB(); go('catalogo'); }
function delLinha(ci,li){ const cat=DB.catalogo.categorias[ci]; cat.linhas.splice(li,1); logAdd('Catálogo',`linha removida em ${cat.nome}`); saveDB(); go('catalogo'); }
function editCamas(){
  modal('Medidas de cama',`<div class="help">Estas medidas alimentam a distribuição de camas e as categorias "por cama".</div>
    <div id="camList">${DB.catalogo.camas.map(cm=>regRowGeneric(cm,'camIn')).join('')}</div>
    <button class="btn btn-ghost btn-sm" style="margin-top:10px" onclick="window.HK35Root.getElementById('camList').insertAdjacentHTML('beforeend',regRowGeneric('','camIn'))">+ Adicionar medida</button>`,
    [{t:'Guardar',cls:'btn-gold',fn:()=>{ DB.catalogo.camas=[...new Set([...window.HK35Root.querySelectorAll('.camIn')].map(i=>i.value.trim()).filter(Boolean))]; logAdd('Catálogo','medidas de cama atualizadas'); saveDB(); closeModal(); go('catalogo'); toast('Medidas guardadas'); }},{t:'Cancelar',cls:'btn-ghost',fn:closeModal}]);
}
function regRowGeneric(v,cls){ return `<div style="display:flex;gap:8px;margin-bottom:7px"><input class="${cls}" value="${esc(v)}" style="flex:1;padding:8px 10px;border:1px solid var(--line2);border-radius:7px"><button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">✕</button></div>`; }

/* ============================================================
   CAMPANHAS DE INVENTÁRIO  (só DO)
   ============================================================ */
VIEWS.campanhas={ title:'Campanhas de inventário', crumb:'Períodos de contagem semestrais', render(){
  if(!isDO()){ noPerm(); return; }
  window.HK35Root.getElementById('headActions').innerHTML=`<button class="btn btn-ghost btn-sm" onclick="importarHistorico()">Importar histórico (Excel)</button> <button class="btn btn-gold btn-sm" onclick="novaCampanha()">+ Nova campanha</button>`;
  const c=window.HK35Root.getElementById('content');
  c.innerHTML=`
    <div class="help">Uma campanha é um momento de inventário (ex.: Outubro 2026). Ao criar a seguinte, cada hotel herda automaticamente o <b>Vestido 100%</b>, a distribuição de camas e o <b>Inventário Anterior</b> (= existências da campanha anterior). Feche uma campanha para a tornar só-leitura e proteger o histórico.</div>
    <div class="card">
      <div class="ch"><h2>Campanhas</h2><div class="d">${DB.campanhas.length} registada(s)</div></div>
      <div class="tbl-wrap"><table><thead><tr><th>Campanha</th><th>Criada</th><th>Estado</th><th class="num">Hotéis com dados</th><th></th></tr></thead><tbody>
      ${DB.campanhas.map((cp,i)=>{
        const store=DB.invent[cp.id]||{}; const nH=Object.values(store).filter(x=>x&&x.updatedAt).length;
        const ultima=i===DB.campanhas.length-1;
        return `<tr>
          <td><b>${esc(cp.nome)}</b>${cp.id===CURRENT_CAMP?' <span class="chip" style="background:var(--blue-bg);color:var(--blue)">ativa</span>':''}</td>
          <td style="font-size:12px;color:var(--muted)">${dt(cp.criada)}<br><small>${esc(cp.criadaPor||'')}</small></td>
          <td>${cp.fechada?'<span class="badge b-off">Fechada</span>':'<span class="badge b-on">Aberta</span>'}</td>
          <td class="num">${nH}</td>
          <td style="white-space:nowrap">
            <button class="btn btn-ghost btn-sm" onclick="mudarCampanha('${cp.id}','param')">Abrir inventário</button>
            ${cp.fechada
              ? `<button class="btn btn-ghost btn-sm" onclick="reabrirCampanha('${cp.id}')">Reabrir</button>`
              : `<button class="btn btn-ghost btn-sm" onclick="fecharCampanha('${cp.id}')">Fechar</button>`}
            <button class="btn btn-ghost btn-sm" onclick="renomearCampanha('${cp.id}')">Renomear</button>
            ${ultima&&nH===0?`<button class="btn btn-danger btn-sm" onclick="apagarCampanha('${cp.id}')">Apagar</button>`:''}
          </td></tr>`;
      }).join('')}
      </tbody></table></div>
    </div>
    <div id="fechoBlocoBody"></div>`;
  renderFechoBloco();
}};
/* ---------- Estado de fecho por hotel (campanha ativa) ---------- */
function renderFechoBloco(){
  const box=window.HK35Root.getElementById('fechoBlocoBody'); if(!box) return;
  const camp=campanhaAtiva(); if(!camp){ box.innerHTML=''; return; }
  const store=DB.invent[camp.id]||{};
  // hotéis visíveis à DO = todos
  const hs=ordenarHoteis(DB.hoteis);
  const linhas=hs.map(h=>{
    const inv=store[h.id];
    const nLinhas=inv?inv.linhas.length:0;
    const contadas=inv?inv.linhas.filter(l=>l.existencias!==''&&l.existencias!=null).length:0;
    const aprovado=!!(inv&&inv.aprovado);
    const tocado=!!(inv&&inv.updatedAt);
    let estado; 
    if(aprovado) estado='aprovado';
    else if(contadas>0) estado='em-curso';
    else estado='por-iniciar';
    return {h,nLinhas,contadas,aprovado,tocado,estado};
  });
  const nAprovados=linhas.filter(x=>x.aprovado).length;
  const nCurso=linhas.filter(x=>x.estado==='em-curso').length;
  const nPorIniciar=linhas.filter(x=>x.estado==='por-iniciar').length;
  const total=linhas.length;
  const pct=total?Math.round(nAprovados/total*100):0;
  box.innerHTML=`
    <div class="card">
      <div class="ch"><h2>Estado de fecho — ${esc(camp.nome)}</h2><div class="d">${nAprovados} de ${total} hotéis aprovados (fechados)</div></div>
      <div style="padding:0 4px 4px">
        <div style="display:flex;height:12px;border-radius:6px;overflow:hidden;background:#eef1f5;margin-bottom:8px">
          <div style="width:${total?nAprovados/total*100:0}%;background:var(--green)"></div>
          <div style="width:${total?nCurso/total*100:0}%;background:var(--amber)"></div>
        </div>
        <div style="display:flex;gap:18px;font-size:12.5px;color:var(--muted);margin-bottom:6px">
          <span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--green);margin-right:5px"></span>Aprovados ${nAprovados}</span>
          <span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--amber);margin-right:5px"></span>Contagem em curso ${nCurso}</span>
          <span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#cbd5e1;margin-right:5px"></span>Por iniciar ${nPorIniciar}</span>
          <b style="margin-left:auto;color:var(--navy)">${pct}% fechado</b>
        </div>
      </div>
      <div class="grid2" style="gap:14px">
        <div>
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--red);margin:6px 0 8px">Por fechar (${total-nAprovados})</div>
          ${linhas.filter(x=>!x.aprovado).length?linhas.filter(x=>!x.aprovado).map(x=>`
            <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--line);border-radius:9px;margin-bottom:7px">
              <span style="width:9px;height:9px;border-radius:50%;background:${x.estado==='em-curso'?'var(--amber)':'#cbd5e1'};flex-shrink:0"></span>
              <div style="flex:1;min-width:0"><b style="font-size:13px">${esc(x.h.nome)}</b><br><small style="color:var(--muted)">${esc(x.h.regiao)} · ${x.contadas}/${x.nLinhas} artigos contados</small></div>
              <button class="btn btn-ghost btn-sm" onclick="irParaHotel('${x.h.id}')">Abrir</button>
            </div>`).join(''):'<div style="color:var(--muted);font-size:13px;padding:8px">Todos os hotéis estão aprovados. ✓</div>'}
        </div>
        <div>
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--green);margin:6px 0 8px">Fechados / aprovados (${nAprovados})</div>
          ${linhas.filter(x=>x.aprovado).length?linhas.filter(x=>x.aprovado).map(x=>`
            <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--line);border-radius:9px;margin-bottom:7px;background:var(--green-bg)">
              <span style="color:var(--green);flex-shrink:0">✓</span>
              <div style="flex:1;min-width:0"><b style="font-size:13px">${esc(x.h.nome)}</b><br><small style="color:var(--muted)">aprovado por ${esc(x.h&&store[x.h.id].aprovadoPor||'—')}${store[x.h.id]&&store[x.h.id].aprovadoEm?' · '+dt(store[x.h.id].aprovadoEm):''}</small></div>
              <button class="btn btn-ghost btn-sm" onclick="irParaHotel('${x.h.id}')">Ver</button>
            </div>`).join(''):'<div style="color:var(--muted);font-size:13px;padding:8px">Ainda nenhum hotel aprovado nesta campanha.</div>'}
        </div>
      </div>
      <div class="help">Um hotel fica <b>fechado</b> quando a DO o aprova (no ecrã de Inventário). Aqui vê de relance o que falta fechar antes de encerrar a campanha. A aprovação e a reabertura fazem-se dentro de cada hotel (com sessão de Direção).</div>
    </div>`;
}
function irParaHotel(hid){ CURRENT_HOTEL=hid; mudarCampanha(CURRENT_CAMP,'param'); }
/* ---------- Importar histórico de inventário a partir de Excel (1 folha por hotel) ----------
   Casa cada folha ao hotel e cada linha por categoria+cama+medida; importa só EXISTÊNCIAS.
   Cria uma campanha fechada+aprovada (histórico bloqueado). Reporta o que não casou. */
function histNm(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,''); }
function histMed(s){ const m=String(s||'').match(/(\d{2,3})\s*[xX]\s*(\d{2,3})/); return m?(m[1]+'x'+m[2]):histNm(s); }
/* sinónimos de folhas → nome do hotel na ferramenta (casos que o automático não apanha) */
const HIST_SINONIMOS={ 'casadelvas':'VG Casas De Elvas', 'saomiguel':'VG Collection S. Miguel' };
function histAcharHotel(nomeFolha){
  const k=histNm(nomeFolha);
  if(HIST_SINONIMOS[k]) return DB.hoteis.find(h=>h.nome===HIST_SINONIMOS[k])||null;
  let h=DB.hoteis.find(x=>histNm(x.nome)===k);
  if(h) return h;
  h=DB.hoteis.find(x=>histNm(x.nome.replace(/^vg\s*/i,''))===k);
  if(h) return h;
  h=DB.hoteis.find(x=>histNm(x.nome).includes(k)||k.includes(histNm(x.nome.replace(/^vg\s*/i,''))));
  return h||null;
}
async function importarHistorico(){
  await ensureXLSX35();
  if(!isDO()){ toast('Apenas a DO pode importar histórico',true); return; }
  const inp=document.createElement('input'); inp.type='file'; inp.accept='.xlsx,.xls';
  inp.onchange=e=>{ const f=e.target.files[0]; if(!f)return; const rd=new FileReader();
    rd.onload=ev=>{ try{
      const wb=XLSX.read(ev.target.result,{type:'array'});
      const skip=new Set(['matriz','projecaoexistencias','projecaocompra','projeccaoexistencias','projeccaocompra']);
      // pré-análise
      const folhas=wb.SheetNames.filter(sn=>!skip.has(histNm(sn)));
      // índice do catálogo por cat|cama|medida
      const catSet=new Set(); DB.catalogo.categorias.forEach(c=>c.linhas.forEach(l=>catSet.add(histNm(c.nome)+'|'+histNm(l.cama)+'|'+histMed(l.medida))));
      // sugere nome da campanha a partir do ficheiro
      let nomeCamp=f.name.replace(/\.x(lsx|ls)$/i,'');
      if(/outubro|out|_10_/i.test(f.name)) nomeCamp='Outubro '+((f.name.match(/20\d{2}/)||['2025'])[0]);
      else if(/abril|abr|_04_/i.test(f.name)) nomeCamp='Abril '+((f.name.match(/20\d{2}/)||['2026'])[0]);

      modal('Importar histórico de inventário',`
        <div class="help">Vai criar a campanha <b id="hcNome">${esc(nomeCamp)}</b> (fechada e bloqueada) com as <b>existências</b> de ${folhas.length} folha(s). As quebras dos ficheiros não são importadas (a app calcula a quebra real). Confirme o nome:</div>
        <div class="field"><label>Nome da campanha de histórico</label><input id="hcNomeIn" value="${esc(nomeCamp)}"></div>
        <div id="hcErr" style="color:var(--red);font-size:12.5px;margin-top:8px;min-height:16px"></div>`,
        [{t:'Importar',cls:'btn-gold',fn:()=>{
          const nome=val('hcNomeIn').trim()||nomeCamp;
          if(DB.campanhas.some(c=>c.nome.toLowerCase()===nome.toLowerCase())){ window.HK35Root.getElementById('hcErr').textContent='Já existe uma campanha com esse nome.'; return; }
          // cria campanha
          const camp={ id:uid(), nome, criadaEm:now(), criadaPor:SESSION.nome, fechada:true, historico:true };
          DB.campanhas.push(camp); DB.invent[camp.id]={};
          let hoteisOK=0, hoteisSemMatch=[], linhasImport=0, linhasNaoCasam=new Set();
          folhas.forEach(sn=>{
            const hotel=histAcharHotel(sn);
            if(!hotel){ hoteisSemMatch.push(sn); return; }
            const rows=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,blankrows:false});
            let hr=rows.findIndex(r=>r&&r.includes('Existências'));
            if(hr<0) return;
            const H=rows[hr]; const idx={}; H.forEach((c,i)=>{ if(c&&idx[c]==null)idx[c]=i; });
            const cCat=idx['Categoria'],cCama=idx['Cama'],cMed=idx['Medida'],cEx=idx['Existências'];
            if(cCat==null||cEx==null) return;
            // materializa o inventário do hotel nesta campanha (linhas do catálogo)
            CURRENT_CAMP=camp.id; const inv=ensureInvent(hotel.id, camp.id);
            const invMap={}; inv.linhas.forEach(l=>invMap[histNm(l.cat)+'|'+histNm(l.cama)+'|'+histMed(l.medida)]=l);
            for(let i=hr+1;i<rows.length;i++){ const r=rows[i]; if(!r||!r[cCat])continue;
              const cat=r[cCat]; if(histNm(cat)==='totais')continue;
              const k=histNm(cat)+'|'+histNm(r[cCama])+'|'+histMed(r[cMed]);
              const ex=Number(r[cEx])||0;
              if(invMap[k]){ if(ex>0){ invMap[k].existencias=ex; linhasImport++; } }
              else if(ex>0){ linhasNaoCasam.add(cat+' | '+(r[cCama]||'')+' | '+(r[cMed]||'')); }
            }
            inv.aprovado=true; inv.jaFoiAprovado=true; inv.aprovadoPor='Importação histórico'; inv.aprovadoEm=now(); inv.updatedAt=now(); inv.updatedBy='Importação histórico';
            hoteisOK++;
          });
          logAdd('Importação de histórico', `${nome} · ${hoteisOK} hotéis · ${linhasImport} linhas`);
          saveDB(); closeModal();
          const naoCasam=[...linhasNaoCasam];
          modal('Histórico importado — '+esc(nome),`
            <div class="grid2" style="margin-bottom:14px">
              <div class="kpi"><div class="l">Hotéis importados</div><div class="v" style="color:var(--green)">${hoteisOK}</div></div>
              <div class="kpi"><div class="l">Linhas com existências</div><div class="v">${fmt(linhasImport)}</div></div>
            </div>
            ${hoteisSemMatch.length?`<div class="help" style="background:var(--amber-bg);border-color:#e6cf94;color:#8a6212"><b>${hoteisSemMatch.length} folha(s) sem hotel correspondente</b> — não importadas: ${hoteisSemMatch.map(esc).join(', ')}</div>`:''}
            ${naoCasam.length?`<div class="help" style="background:var(--amber-bg);border-color:#e6cf94;color:#8a6212"><b>${naoCasam.length} tipo(s) de linha sem correspondência no catálogo</b> (artigos fora do catálogo standard — ex. roupões por tamanho):<div style="max-height:150px;overflow:auto;margin-top:8px;font-size:11px;font-family:monospace">${naoCasam.map(esc).join('<br>')}</div></div>`:'<div class="help" style="background:var(--green-bg);border-color:#a8dcc0;color:#1f7a54">Todas as linhas com existências foram associadas ao catálogo.</div>'}
            <div class="help">A campanha <b>${esc(nome)}</b> ficou <b>fechada e bloqueada</b> (histórico). Já pode usá-la na Comparação entre campanhas.</div>`,
            [{t:'Concluir',cls:'btn-gold',fn:()=>{ closeModal(); go('campanhas'); }}]);
        }},{t:'Cancelar',cls:'btn-ghost',fn:closeModal}]);
    }catch(err){ toast('Erro ao ler o ficheiro de histórico',true); } };
    rd.readAsArrayBuffer(f); };
  inp.click();
}

function novaCampanha(){
  const hoje=new Date(); const mes=hoje.getMonth()+1;
  const sugestao=(mes>=4&&mes<10)?('Outubro '+hoje.getFullYear()):('Abril '+(mes<4?hoje.getFullYear():hoje.getFullYear()+1));
  modal('Nova campanha de inventário',`
    <div class="help">A nova campanha herda a parametrização e o inventário anterior de <b>${esc(DB.campanhas[DB.campanhas.length-1]?DB.campanhas[DB.campanhas.length-1].nome:'—')}</b>.</div>
    <div class="field"><label>Nome da campanha</label><input id="cpNome" value="${esc(sugestao)}" placeholder="Ex.: Abril 2027"></div>
    <label style="display:flex;align-items:center;gap:8px;margin-top:14px;font-size:13px"><input type="checkbox" id="cpFechaAnt" checked> Fechar automaticamente a campanha anterior (torná-la só-leitura)</label>`,
    [{t:'Criar campanha',cls:'btn-gold',fn:()=>{
      const nome=val('cpNome').trim(); if(!nome){toast('Indique o nome',true);return;}
      if(DB.campanhas.some(c=>c.nome.toLowerCase()===nome.toLowerCase())){toast('Já existe uma campanha com esse nome',true);return;}
      if(val('cpFechaAnt') || window.HK35Root.getElementById('cpFechaAnt').checked){ const ant=DB.campanhas[DB.campanhas.length-1]; if(ant) ant.fechada=true, ant.fechadaEm=now(); }
      const cp=novaCampanhaObj(nome); DB.campanhas.push(cp); DB.invent[cp.id]={};
      CURRENT_CAMP=cp.id;
      logAdd('Campanha criada',nome);
      saveDB(); closeModal(); go('campanhas'); toast('Campanha criada — '+nome);
    }},{t:'Cancelar',cls:'btn-ghost',fn:closeModal}]);
}
function fecharCampanha(id){ const cp=DB.campanhas.find(c=>c.id===id);
  confirmModal(`Fechar a campanha <b>${esc(cp.nome)}</b>? Fica só-leitura e o histórico é protegido. Pode reabrir mais tarde.`,()=>{
    cp.fechada=true; cp.fechadaEm=now(); logAdd('Campanha fechada',cp.nome); saveDB(); go('campanhas'); toast('Campanha fechada');});}
function reabrirCampanha(id){ const cp=DB.campanhas.find(c=>c.id===id);
  confirmModal(`Reabrir a campanha <b>${esc(cp.nome)}</b> para edição?`,()=>{
    cp.fechada=false; cp.fechadaEm=null; logAdd('Campanha reaberta',cp.nome); saveDB(); go('campanhas'); toast('Campanha reaberta');});}
function renomearCampanha(id){ const cp=DB.campanhas.find(c=>c.id===id);
  modal('Renomear campanha',`<div class="field"><label>Nome</label><input id="cpNovo" value="${esc(cp.nome)}"></div>`,
    [{t:'Guardar',cls:'btn-gold',fn:()=>{ const n=val('cpNovo').trim(); if(!n)return; logAdd('Campanha renomeada',`${cp.nome} → ${n}`); cp.nome=n; saveDB(); closeModal(); go('campanhas'); }},{t:'Cancelar',cls:'btn-ghost',fn:closeModal}]);}
function apagarCampanha(id){ const cp=DB.campanhas.find(c=>c.id===id);
  confirmModal(`Apagar a campanha <b>${esc(cp.nome)}</b>? Só é possível porque não tem inventário gravado. Ação definitiva.`,()=>{
    DB.campanhas=DB.campanhas.filter(c=>c.id!==id); delete DB.invent[id];
    if(CURRENT_CAMP===id){ const a=campanhaAtiva(); CURRENT_CAMP=a?a.id:null; }
    logAdd('Campanha apagada',cp.nome); saveDB(); go('campanhas'); toast('Campanha apagada');});}

/* ============================================================
   REGISTO DE ALTERAÇÕES  (só DO)
   ============================================================ */
VIEWS.log={ title:'Registo de alterações', crumb:'Auditoria de todas as operações', render(){
  if(!isDO()){ noPerm(); return; }
  window.HK35Root.getElementById('headActions').innerHTML=`<button class="btn btn-ghost btn-sm" onclick="exportLog()">Exportar Excel</button>`;
  const c=window.HK35Root.getElementById('content');
  c.innerHTML=`
    <div class="toolbar">
      <div class="field" style="min-width:220px"><label>Filtrar</label>
        <select id="logFiltro" onchange="renderLog()">
          <option value="todos">Todas as operações</option>
          <option value="valor">Só alterações de valor (antes→depois)</option>
          <option value="aprov">Aprovações / reaberturas</option>
          <option value="login">Sessões (login/logout)</option>
        </select></div>
      <div class="field" style="min-width:220px"><label>Pesquisar</label>
        <input id="logBusca" placeholder="hotel, artigo, utilizador…" oninput="renderLog()"></div>
    </div>
    <div class="card"><div class="ch"><h2>Histórico</h2><div class="d" id="logCount"></div></div>
      <div id="logBody" style="max-height:66vh;overflow:auto"></div></div>`;
  renderLog();
}};
function renderLog(){
  const filtro=window.HK35Root.getElementById('logFiltro')?window.HK35Root.getElementById('logFiltro').value:'todos';
  const busca=(window.HK35Root.getElementById('logBusca')?window.HK35Root.getElementById('logBusca').value:'').toLowerCase().trim();
  let itens=DB.log.slice();
  if(filtro==='valor') itens=itens.filter(e=>e.acao==='Alteração de valor');
  else if(filtro==='aprov') itens=itens.filter(e=>/aprovad|reabert/i.test(e.acao));
  else if(filtro==='login') itens=itens.filter(e=>/login|logout/i.test(e.acao));
  if(busca) itens=itens.filter(e=>((e.detalhe||'')+' '+(e.user||'')+' '+(e.acao||'')).toLowerCase().includes(busca));
  const cnt=window.HK35Root.getElementById('logCount'); if(cnt) cnt.textContent=itens.length+' de '+DB.log.length+' registos';
  const body=window.HK35Root.getElementById('logBody'); if(!body) return;
  body.innerHTML= itens.length? itens.map(e=>`<div class="log-row">
      <div class="t">${dt(e.ts)}</div>
      <div class="who">${esc(e.user)}<br><small style="color:var(--muted);font-weight:400">${esc(e.role)}</small></div>
      <div class="what"><b>${esc(e.acao)}</b><br><small>${esc(e.detalhe)}</small>${(e.de!==undefined&&e.para!==undefined)?`<div style="margin-top:4px"><span class="chip" style="background:#f1f5f9;color:var(--muted)">${esc(String(e.de))}</span> <span style="color:var(--muted)">→</span> <span class="chip" style="background:var(--blue-bg);color:var(--blue);font-weight:700">${esc(String(e.para))}</span></div>`:''}</div>
    </div>`).join('') : '<div class="empty"><div class="ic">⟲</div>Sem registos para este filtro.</div>';
}

/* ============================================================
   EXCEL (import inventário · export projeção/log)
   ============================================================ */
async function importInvent(){
  await ensureXLSX35();
  if(!podeEditar()){ toast('Perfil de consulta — sem permissão para importar',true); return; }
  if(campFechada()){ toast('Campanha fechada — não é possível importar',true); return; }
  const inp=document.createElement('input'); inp.type='file'; inp.accept='.xlsx,.xls';
  inp.onchange=e=>{ const f=e.target.files[0]; if(!f)return; const rd=new FileReader();
    rd.onload=ev=>{ try{
      const wb=XLSX.read(ev.target.result,{type:'array'});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(ws,{header:1});
      // procura colunas Categoria/Cama/Medida/Existências/Inv.Anterior/Quebras/Vestido
      let hdr=-1; for(let i=0;i<rows.length;i++){ if(rows[i].some(c=>String(c).toLowerCase().includes('categoria'))){hdr=i;break;} }
      if(hdr<0){ toast('Cabeçalho não encontrado (coluna "Categoria")',true); return; }
      const H=rows[hdr].map(x=>String(x).toLowerCase());
      const col=(...names)=>H.findIndex(h=>names.some(n=>h.includes(n)));
      const cCat=col('categoria'),cCama=col('cama'),cMed=col('medida'),cExist=col('exist'),cInv=col('anterior','inventário ant'),cQb=col('quebra'),cVest=col('vestido','100');
      const inv=ensureInvent(CURRENT_HOTEL); let n=0;
      for(let i=hdr+1;i<rows.length;i++){ const r=rows[i]; if(!r||!r[cCat])continue;
        const cat=String(r[cCat]).trim(), cama=cCama>=0?String(r[cCama]||'').trim():'', med=cMed>=0?String(r[cMed]||'').trim():'';
        const l=inv.linhas.find(x=>x.cat===cat&&(x.cama===cama||!cama)&&(x.medida===med||!med));
        if(l){ if(cExist>=0&&r[cExist]!=null)l.existencias=r[cExist]; if(cInv>=0&&r[cInv]!=null)l.invAnterior=r[cInv];
          if(cQb>=0&&r[cQb]!=null)l.quebras=r[cQb]; if(cVest>=0&&r[cVest]!=null)l.vestido100=r[cVest]; n++; }
      }
      logAdd('Importação Excel',`${campanhaAtiva().nome} · ${DB.hoteis.find(h=>h.id===CURRENT_HOTEL).nome} · ${n} linhas atualizadas`);
      autosave(); renderParam(); toast(`Importadas ${n} linhas`);
    }catch(err){ toast('Erro ao ler o ficheiro',true); } };
    rd.readAsArrayBuffer(f); };
  inp.click();
}
async function exportInventHotel(){
  await ensureXLSX35();
  const camp=campanhaAtiva(); const h=DB.hoteis.find(x=>x.id===CURRENT_HOTEL);
  if(!camp||!h){ toast('Nada para exportar',true); return; }
  const inv=ensureInvent(h.id, camp.id);
  const cab=['Categoria','Cama','Medida da roupa','Vestido 100%','Inv. Anterior','Existências','Quebras','Índice','Par-stock','Compra Sugerida','Aprovado DO','Código de cor'];
  const linhas=inv.linhas.map(l=>{ const cc=calcLinha(l);
    return [l.cat, l.cama, l.medida, num(l.vestido100), num(l.invAnterior), num(l.existencias), num(l.quebras),
            num(l.indice), Math.round(cc.par), Math.round(cc.sugerida), cc.aprov, corLabel(l)];
  });
  // totais
  let tv=0,tia=0,te=0,tq=0,tpar=0,tsug=0,tap=0;
  inv.linhas.forEach(l=>{const cc=calcLinha(l); tv+=num(l.vestido100);tia+=num(l.invAnterior);te+=num(l.existencias);tq+=num(l.quebras);tpar+=cc.par;if(cc.sugerida>0)tsug+=cc.sugerida;tap+=cc.aprov;});
  const totais=['TOTAIS','','',Math.round(tv),Math.round(tia),Math.round(te),Math.round(tq),'',Math.round(tpar),Math.round(tsug),Math.round(tap),''];
  const meta=[[`Inventário — ${h.nome}`],[`Campanha: ${camp.nome}`],[`Região: ${h.regiao} · País: ${h.pais}`],
    [`Estado: ${inv.updatedAt?('aprovado '+dt(inv.updatedAt)+(inv.aprovadoPor?' por '+inv.aprovadoPor:'')):'não aprovado'}`],
    [`Exportado: ${dt(now())}`],[]];
  const data=[...meta, cab, ...linhas, [], totais];
  const ws=XLSX.utils.aoa_to_sheet(data);
  ws['!cols']=[{wch:24},{wch:12},{wch:20},{wch:12},{wch:12},{wch:12},{wch:10},{wch:8},{wch:11},{wch:14},{wch:12},{wch:20}];
  const wb=XLSX.utils.book_new();
  const safe=s=>String(s).replace(/[^\w]+/g,'_').slice(0,28);
  XLSX.utils.book_append_sheet(wb,ws,safe(h.nome).slice(0,31)||'Inventario');
  XLSX.writeFile(wb,`VG_Inventario_${safe(h.nome)}_${safe(camp.nome)}.xlsx`);
  logAdd('Exportação inventário',`${camp.nome} · ${h.nome}`); saveDB();
}
async function exportProj(){
  await ensureXLSX35();
  const {hs,rows}=projData();
  const data=[['Categoria','Medida','Qtd a comprar','Valor est. (€)'],...rows.map(r=>[r.cat,r.medida,r.qty,r.valor||''])];
  const ws=XLSX.utils.aoa_to_sheet(data); const wb=XLSX.utils.book_new();
  const camp=campanhaAtiva(); const nm=camp?camp.nome.replace(/\s+/g,'_'):'';
  XLSX.utils.book_append_sheet(wb,ws,'Projeção'); XLSX.writeFile(wb,`VG_Projecao_Compra_${nm}.xlsx`);
}

/* Matriz: linhas = categoria+medida, colunas = hotéis, células = qtd a comprar.
   Âmbito e base seguem os seletores do ecrã. */
async function exportProjMatriz(){
  await ensureXLSX35();
  const hs=projHoteis(); const base=window.HK35Root.getElementById('pjBase').value;
  const camp=campanhaAtiva();
  if(!hs.length){ toast('Sem hotéis no âmbito selecionado',true); return; }
  // qty[linhaKey][hotelId]; ordena linhas pela ordem do catálogo
  const linhaOrder=[]; const linhaSeen={};
  DB.catalogo.categorias.forEach(cat=>cat.linhas.forEach(l=>{
    const k=cat.nome+'|'+(l.medida||l.cama||'');
    if(!linhaSeen[k]){ linhaSeen[k]=true; linhaOrder.push({key:k,cat:cat.nome,medida:(l.medida||l.cama||'—')}); }
  }));
  const qty={}; // key -> {hotelId:valor}
  hs.forEach(h=>{ const inv=invDoHotel(h.id, camp.id); if(!inv)return;
    inv.linhas.forEach(l=>{ const cc=calcLinha(l);
      const q = base==='aprovada' ? cc.aprov : (cc.sugerida>0?Math.round(cc.sugerida):0);
      if(q<=0) return;
      const k=l.cat+'|'+(l.medida||l.cama||'');
      (qty[k]=qty[k]||{})[h.id]=(qty[k][h.id]||0)+q;
    });
  });
  // mantém só as linhas com pelo menos um valor
  const linhas=linhaOrder.filter(r=>qty[r.key]);
  if(!linhas.length){ toast('Sem necessidades de compra para exportar',true); return; }

  // cabeçalho: Categoria | Medida | <hotel1> | <hotel2> | ... | Total
  const header=['Categoria','Medida',...hs.map(h=>h.nome),'Total'];
  const body=linhas.map(r=>{
    const cells=hs.map(h=>qty[r.key][h.id]||0);
    const tot=cells.reduce((s,x)=>s+x,0);
    return [r.cat, r.medida, ...cells, tot];
  });
  // linha de totais por hotel
  const totalRow=['TOTAL','', ...hs.map((h,i)=>body.reduce((s,row)=>s+num(row[2+i]),0)), body.reduce((s,row)=>s+num(row[row.length-1]),0)];

  const ambitoTxt = window.HK35Root.getElementById('pjAmbito').value==='regiao'
      ? ('Região: '+window.HK35Root.getElementById('pjRegiao').value)
      : window.HK35Root.getElementById('pjAmbito').value==='hotel' ? ('Hotel: '+hs[0].nome) : 'Todos os hotéis';
  const meta=[
    ['Projeção de compra — matriz por hotel'],
    ['Campanha: '+(camp?camp.nome:'—')],
    ['Âmbito: '+ambitoTxt+' · '+hs.length+' hotel(éis)'],
    ['Base: '+(base==='aprovada'?'Compra aprovada DO':'Compra sugerida')],
    ['Exportado: '+dt(now())],
    []
  ];
  const data=[...meta, header, ...body, [], totalRow];
  const ws=XLSX.utils.aoa_to_sheet(data);
  ws['!cols']=[{wch:24},{wch:16},...hs.map(()=>({wch:14})),{wch:10}];
  // congela as duas primeiras colunas e a linha de cabeçalho (linha 7, índice 6)
  ws['!freeze']={xSplit:2,ySplit:meta.length};
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Matriz');
  const safe=s=>String(s).replace(/[^\w]+/g,'_').slice(0,28);
  const amb=window.HK35Root.getElementById('pjAmbito').value==='regiao'?safe(window.HK35Root.getElementById('pjRegiao').value)
          :window.HK35Root.getElementById('pjAmbito').value==='hotel'?safe(hs[0].nome):'Todos';
  XLSX.writeFile(wb,`VG_Projecao_Matriz_${amb}_${safe(camp?camp.nome:'')}.xlsx`);
  logAdd('Exportação projeção (matriz)',`${camp?camp.nome:''} · ${ambitoTxt} · ${linhas.length} linhas × ${hs.length} hotéis`); saveDB();
}
async function exportLog(){
  await ensureXLSX35();
  const data=[['Data','Utilizador','Papel','Ação','Detalhe','De','Para'],...DB.log.map(e=>[dt(e.ts),e.user,e.role,e.acao,e.detalhe,(e.de!==undefined?e.de:''),(e.para!==undefined?e.para:'')])];
  const ws=XLSX.utils.aoa_to_sheet(data); const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Registo'); XLSX.writeFile(wb,'VG_Registo_Alteracoes.xlsx');
}

/* ============================================================
   MODAIS / UI helpers
   ============================================================ */
function modal(title,body,btns){
  window.HK35Root.getElementById('modalRoot').innerHTML=`<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal">
    <div class="mh"><h3>${title}</h3><button onclick="closeModal()">×</button></div>
    <div class="mb">${body}</div>
    <div class="mf">${btns.map((b,i)=>`<button class="btn ${b.cls}" data-i="${i}">${b.t}</button>`).join('')}</div>
  </div></div>`;
  window.HK35Root.querySelectorAll('.mf .btn').forEach((el,i)=>el.onclick=btns[i].fn);
}
function confirmModal(msg,fn){ modal('Confirmar',`<div style="font-size:14px;line-height:1.5">${msg}</div>`,[{t:'Confirmar',cls:'btn-danger',fn:()=>{fn();closeModal();}},{t:'Cancelar',cls:'btn-ghost',fn:closeModal}]); }
function closeModal(){ window.HK35Root.getElementById('modalRoot').innerHTML=''; }
function val(id){ return window.HK35Root.getElementById(id).value; }
function noPerm(){ window.HK35Root.getElementById('content').innerHTML='<div class="empty"><div class="ic">⛔</div>Sem permissões para esta área.</div>'; }

/* ============================================================
   MODO GOVERNANTA (mobile) — contagem simples: existências + quebras
   ============================================================ */
let GOV_HOTEL=null, GOV_CAT=null;
function abrirModoGovernanta(){
  window.HK35Root.getElementById('govMode').classList.remove('hidden');
  const hs=ordenarHoteis(DB.hoteis.filter(h=>SESSION.hoteis.includes(h.id)));
  if(hs.length===1){ GOV_HOTEL=hs[0].id; renderGovContagem(); }
  else renderGovEscolhaHotel(hs);
}
function renderGovEscolhaHotel(hs){
  const camp=campanhaAtiva();
  window.HK35Root.getElementById('govMode').innerHTML=`
    <div class="gov-top"><div class="vg-mark">VG</div><div><b>Contagem de roupas</b><small>${esc(SESSION.nome)}</small></div>
      <button onclick="logout()">Sair</button></div>
    <div class="gov-hotelpick">
      <h2>Escolha o hotel</h2><p>Campanha: ${camp?esc(camp.nome):'—'}</p>
      ${hs.length?hs.map(h=>`<button class="gov-hotel-btn" onclick="GOV_HOTEL='${h.id}';renderGovContagem()">${esc(h.nome)}<small>${esc(h.regiao)}</small></button>`).join(''):'<p>Sem hotéis atribuídos. Contacte a Direção de Operações.</p>'}
    </div>`;
}
function renderGovContagem(){
  const camp=campanhaAtiva();
  const h=DB.hoteis.find(x=>x.id===GOV_HOTEL);
  if(!camp){ window.HK35Root.getElementById('govMode').innerHTML='<div class="gov-top"><b style="color:#fff">Sem campanha ativa</b><button onclick="logout()" style="margin-left:auto">Sair</button></div><div class="gov-done"><div class="ic">⏳</div>Ainda não há campanha de inventário aberta.</div>'; return; }
  if(camp.fechada){ window.HK35Root.getElementById('govMode').innerHTML=`<div class="gov-top"><div class="vg-mark">VG</div><div><b>${esc(h.nome)}</b><small>${esc(camp.nome)}</small></div><button onclick="logout()">Sair</button></div><div class="gov-done"><div class="ic">🔒</div>Esta campanha está fechada.<br><small>Não é possível registar contagens.</small></div>`; return; }
  const inv=ensureInvent(GOV_HOTEL, camp.id);
  if(hotelAprovado(inv)){
    window.HK35Root.getElementById('govMode').innerHTML=`<div class="gov-top"><div class="vg-mark">VG</div><div><b>${esc(h.nome)}</b><small>${esc(camp.nome)}</small></div><button onclick="${DB.hoteis.filter(x=>SESSION.hoteis.includes(x.id)).length>1?"GOV_HOTEL=null;abrirModoGovernanta()":"logout()"}">${DB.hoteis.filter(x=>SESSION.hoteis.includes(x.id)).length>1?'Trocar':'Sair'}</button></div>
      <div class="gov-done"><div class="ic">🔒</div><h2 style="font-size:17px;margin-bottom:8px">Inventário fechado</h2>
      <p style="color:var(--muted);font-size:13.5px;line-height:1.5">Este hotel já foi <b>aprovado</b> nesta campanha.<br>Não é possível registar existências nem quebras<br>até a Direção de Operações abrir uma nova campanha.</p></div>`;
    return;
  }
  const cats=[...new Set(inv.linhas.map(l=>l.cat))];
  if(!GOV_CAT||!cats.includes(GOV_CAT)) GOV_CAT=cats[0];
  if(!GOV_MODO) GOV_MODO='quebras'; // 'quebras' (dia-a-dia) | 'contagem' (verificação)
  const linhasCat=inv.linhas.map((l,idx)=>({l,idx})).filter(x=>x.l.cat===GOV_CAT);
  const hs=ordenarHoteis(DB.hoteis.filter(x=>SESSION.hoteis.includes(x.id)));
  const topo=`<div class="gov-top"><div class="vg-mark">VG</div>
      <div><b>${esc(h.nome)}</b><small>${esc(camp.nome)}</small></div>
      <button onclick="${hs.length>1?"GOV_HOTEL=null;abrirModoGovernanta()":"logout()"}">${hs.length>1?'Trocar':'Sair'}</button></div>`;
  const catbar=`<div class="gov-catbar">${cats.map(ct=>`<button class="${ct===GOV_CAT?'on':''}" onclick="GOV_CAT=${JSON.stringify(ct).replace(/"/g,'&quot;')};renderGovContagem()">${esc(ct)}</button>`).join('')}</div>`;
  const seletor=`<div style="display:flex;gap:8px;margin-bottom:12px">
      <button onclick="GOV_MODO='quebras';renderGovContagem()" style="flex:1;padding:11px;border-radius:10px;font-weight:700;font-size:13px;border:1.5px solid ${GOV_MODO==='quebras'?'var(--red)':'var(--line2)'};background:${GOV_MODO==='quebras'?'var(--red)':'#fff'};color:${GOV_MODO==='quebras'?'#fff':'var(--ink)'}">Registar quebras</button>
      <button onclick="GOV_MODO='contagem';renderGovContagem()" style="flex:1;padding:11px;border-radius:10px;font-weight:700;font-size:13px;border:1.5px solid ${GOV_MODO==='contagem'?'var(--navy)':'var(--line2)'};background:${GOV_MODO==='contagem'?'var(--navy)':'#fff'};color:${GOV_MODO==='contagem'?'#fff':'var(--ink)'}">Contagem física</button>
    </div>`;
  let corpo;
  if(GOV_MODO==='quebras'){
    corpo=`${linhasCat.map(({l,idx})=>`
        <div class="gov-item">
          <div class="h">${esc(l.cat)}</div>
          <div class="m">${esc(l.cama)?esc(l.cama)+' · ':''}${esc(l.medida)||''} · <b style="color:var(--navy)">${fmt(existenciasEfetivas(l))} em stock</b></div>
          <div class="fld qb" style="margin-bottom:10px"><label>Quebras a registar agora</label>
            <input id="govQb${idx}" type="number" inputmode="numeric" min="1" placeholder="0"></div>
          <div class="fld" style="margin-bottom:10px"><label>Causa da quebra</label>
            <select id="govQbCausa${idx}" style="width:100%;padding:14px;border:1.5px solid var(--line2);border-radius:10px;font-size:16px;background:#fff"><option value="">— escolher a causa —</option>${CAUSAS_QUEBRA.map(c=>`<option value="${c.k}">${c.label}</option>`).join('')}</select></div>
          <button onclick="govRegistarQuebra(${idx})" style="width:100%;padding:15px;border-radius:10px;background:var(--red);color:#fff;font-weight:700;font-size:16px">− Registar quebra</button>
        </div>`).join('')}`;
  } else {
    corpo=`<div class="help" style="margin:0 0 12px">Introduza a quantidade <b>contada fisicamente</b>. Se diferir do stock calculado, será registado um acerto.</div>
      ${linhasCat.map(({l,idx})=>`
        <div class="gov-item">
          <div class="h">${esc(l.cat)}</div>
          <div class="m">${esc(l.cama)?esc(l.cama)+' · ':''}${esc(l.medida)||''} · calculado: <b>${fmt(existenciasEfetivas(l))}</b></div>
          <div class="fld"><label>Existências contadas</label>
            <input id="govCt${idx}" type="number" inputmode="numeric" min="0" placeholder="${existenciasEfetivas(l)}" onchange="govContar(${idx},this.value)"></div>
        </div>`).join('')}
      <div class="gov-save"><button onclick="govGravar()">✓ Concluir contagem</button></div>`;
  }
  window.HK35Root.getElementById('govMode').innerHTML=`${topo}<div class="gov-body">${seletor}${catbar}${corpo}</div>`;
}
let GOV_MODO=null;
function govRegistarQuebra(idx){
  const inv=invDoHotel(GOV_HOTEL); if(!inv)return;
  if(hotelAprovado(inv)||campFechada()){ toast('Inventário fechado',true); return; }
  const el=window.HK35Root.getElementById('govQb'+idx); const qt=num(el?el.value:0);
  const cEl=window.HK35Root.getElementById('govQbCausa'+idx); const causa=cEl?cEl.value:'';
  if(qt<=0){ toast('Indique a quantidade',true); return; }
  if(!causa){ toast('Escolha a causa da quebra',true); return; }
  const l=inv.linhas[idx];
  registarMov(l,'quebra',qt,SESSION.nome+' (Governanta)',null,causa);
  const h=DB.hoteis.find(x=>x.id===GOV_HOTEL); const camp=campanhaAtiva();
  inv.updatedAt=now(); inv.updatedBy=SESSION.nome;
  logAdd('Quebra registada',`${camp.nome} · ${h.nome} · ${l.cat}${l.medida?' '+l.medida:''} · −${qt} · ${causaLabel(causa)}`,{de:'',para:'−'+qt});
  flushSave();
  toast(`−${qt} ${l.cat} registada`);
  renderGovContagem();
}
function govContar(idx,val){
  const inv=invDoHotel(GOV_HOTEL); if(!inv)return;
  if(hotelAprovado(inv)||campFechada())return;
  if(val===''||val==null)return;
  const l=inv.linhas[idx]; const novo=num(val); const teorico=existenciasEfetivas(l);
  definirBaseContada(l,novo);
  l.existencias=novo;
  if(novo!==teorico){ l.ultimoAcerto={de:teorico,para:novo,just:'Contagem física (governanta)',quem:SESSION.nome,data:now()};
    const h=DB.hoteis.find(x=>x.id===GOV_HOTEL); const camp=campanhaAtiva();
    logAdd('Acerto de existências',`${camp.nome} · ${h.nome} · ${l.cat}${l.medida?' '+l.medida:''} · contagem física`,{de:teorico,para:novo});
  }
  inv.updatedAt=now(); inv.updatedBy=SESSION.nome; autosave();
}
function govUpd(idx,field,val){
  const inv=invDoHotel(GOV_HOTEL); if(!inv)return;
  if(hotelAprovado(inv)||campFechada()) return;
  inv.linhas[idx][field]=val==='' ? '' : num(val);
  inv.rascunhoEm=now(); autosave();
}
function govGravar(){
  const inv=invDoHotel(GOV_HOTEL); const h=DB.hoteis.find(x=>x.id===GOV_HOTEL); const camp=campanhaAtiva();
  inv.updatedAt=now(); inv.updatedBy=SESSION.nome;
  logAdd('Contagem (governanta)', `${camp.nome} · ${h.nome}`);
  flushSave();
  window.HK35Root.getElementById('govMode').innerHTML=`
    <div class="gov-top"><div class="vg-mark">VG</div><div><b>${esc(h.nome)}</b><small>${esc(camp.nome)}</small></div></div>
    <div class="gov-done"><div class="ic">✅</div><h2 style="font-size:18px;margin-bottom:6px">Contagem guardada!</h2>
      <p style="color:var(--muted);font-size:13.5px;margin-bottom:20px">Os dados foram enviados. Obrigado.</p>
      <button class="gov-hotel-btn" style="text-align:center" onclick="renderGovContagem()">Continuar a contar</button>
      <button class="gov-hotel-btn" style="text-align:center" onclick="logout()">Terminar sessão</button>
    </div>`;
}

/* ============================================================
   ARRANQUE
   ============================================================ */

function hk35SessionFromDashboard(){
  const u=hk35DashUser()||{name:'Utilizador VG',user:'vg',role:'direcao',hotel:'*'};const role=hk35Role(u);let ids=[];
  if(DB&&Array.isArray(DB.hoteis)&&!['DO','Compras'].includes(role)){const wanted=(Array.isArray(u.hotels)?u.hotels:(u.hotel&&u.hotel!=='*'?[u.hotel]:[])).map(hk35Norm);ids=DB.hoteis.filter(h=>wanted.some(w=>hk35Norm(h.nome)===w||hk35Norm(h.nome).replace(/^COLLECTION\s+/,'')===w.replace(/^COLLECTION\s+/,''))).map(h=>h.id);}
  return {id:'dashboard:'+String(u.user||u.name||'vg'),username:String(u.user||u.name||'vg'),password:'',nome:u.name||u.user||'Utilizador VG',role,hoteis:ids,ativo:true,_dashboard:true};
}
function hk35InstallDispatchers(){
  const fns={
    abrirModoGovernanta: (typeof abrirModoGovernanta==='function'?abrirModoGovernanta:null),
    addEntrada: (typeof addEntrada==='function'?addEntrada:null),
    addIdxOv: (typeof addIdxOv==='function'?addIdxOv:null),
    addLinha: (typeof addLinha==='function'?addLinha:null),
    addQuebra: (typeof addQuebra==='function'?addQuebra:null),
    alData: (typeof alData==='function'?alData:null),
    alHoteis: (typeof alHoteis==='function'?alHoteis:null),
    apCollect: (typeof apCollect==='function'?apCollect:null),
    apRefresh: (typeof apRefresh==='function'?apRefresh:null),
    apSetModo: (typeof apSetModo==='function'?apSetModo:null),
    apagarCampanha: (typeof apagarCampanha==='function'?apagarCampanha:null),
    aplicResumo: (typeof aplicResumo==='function'?aplicResumo:null),
    aplicarCamas: (typeof aplicarCamas==='function'?aplicarCamas:null),
    aplicarVestido: (typeof aplicarVestido==='function'?aplicarVestido:null),
    auditAgendar: (typeof auditAgendar==='function'?auditAgendar:null),
    auditIniciar: (typeof auditIniciar==='function'?auditIniciar:null),
    auditKey: (typeof auditKey==='function'?auditKey:null),
    auditRegistarExist: (typeof auditRegistarExist==='function'?auditRegistarExist:null),
    autosave: (typeof autosave==='function'?autosave:null),
    avisoNuvem: (typeof avisoNuvem==='function'?avisoNuvem:null),
    baseDataDe: (typeof baseDataDe==='function'?baseDataDe:null),
    baseDe: (typeof baseDe==='function'?baseDe:null),
    beaconSave: (typeof beaconSave==='function'?beaconSave:null),
    blobGet: (typeof blobGet==='function'?blobGet:null),
    blobGetKey: (typeof blobGetKey==='function'?blobGetKey:null),
    blobSet: (typeof blobSet==='function'?blobSet:null),
    blobSetKey: (typeof blobSetKey==='function'?blobSetKey:null),
    buildNav: (typeof buildNav==='function'?buildNav:null),
    calcDinamica: (typeof calcDinamica==='function'?calcDinamica:null),
    calcLinha: (typeof calcLinha==='function'?calcLinha:null),
    campFechada: (typeof campFechada==='function'?campFechada:null),
    campSelectHTML: (typeof campSelectHTML==='function'?campSelectHTML:null),
    campanhaAnterior: (typeof campanhaAnterior==='function'?campanhaAnterior:null),
    campanhaAtiva: (typeof campanhaAtiva==='function'?campanhaAtiva:null),
    causaLabel: (typeof causaLabel==='function'?causaLabel:null),
    causasDeMovimentos: (typeof causasDeMovimentos==='function'?causasDeMovimentos:null),
    closeModal: (typeof closeModal==='function'?closeModal:null),
    cmpData: (typeof cmpData==='function'?cmpData:null),
    cmpHoteis: (typeof cmpHoteis==='function'?cmpHoteis:null),
    confirmModal: (typeof confirmModal==='function'?confirmModal:null),
    corCell: (typeof corCell==='function'?corCell:null),
    corInfo: (typeof corInfo==='function'?corInfo:null),
    corLabel: (typeof corLabel==='function'?corLabel:null),
    corSel: (typeof corSel==='function'?corSel:null),
    corTipoSel: (typeof corTipoSel==='function'?corTipoSel:null),
    defAplic: (typeof defAplic==='function'?defAplic:null),
    definirBaseContada: (typeof definirBaseContada==='function'?definirBaseContada:null),
    delCategoria: (typeof delCategoria==='function'?delCategoria:null),
    delLinha: (typeof delLinha==='function'?delLinha:null),
    delMov: (typeof delMov==='function'?delMov:null),
    delUser: (typeof delUser==='function'?delUser:null),
    doLogin: (typeof doLogin==='function'?doLogin:null),
    dt: (typeof dt==='function'?dt:null),
    editCamas: (typeof editCamas==='function'?editCamas:null),
    editCategoria: (typeof editCategoria==='function'?editCategoria:null),
    editRegioes: (typeof editRegioes==='function'?editRegioes:null),
    editUser: (typeof editUser==='function'?editUser:null),
    ensureInvent: (typeof ensureInvent==='function'?ensureInvent:null),
    esc: (typeof esc==='function'?esc:null),
    eur: (typeof eur==='function'?eur:null),
    execData: (typeof execData==='function'?execData:null),
    existenciasEfetivas: (typeof existenciasEfetivas==='function'?existenciasEfetivas:null),
    exportAlertas: (typeof exportAlertas==='function'?exportAlertas:null),
    exportComparar: (typeof exportComparar==='function'?exportComparar:null),
    exportInventHotel: (typeof exportInventHotel==='function'?exportInventHotel:null),
    exportLog: (typeof exportLog==='function'?exportLog:null),
    exportMapa: (typeof exportMapa==='function'?exportMapa:null),
    exportProj: (typeof exportProj==='function'?exportProj:null),
    exportProjMatriz: (typeof exportProjMatriz==='function'?exportProjMatriz:null),
    exportQuebras: (typeof exportQuebras==='function'?exportQuebras:null),
    exportValor: (typeof exportValor==='function'?exportValor:null),
    fecharCampanha: (typeof fecharCampanha==='function'?fecharCampanha:null),
    flushSave: (typeof flushSave==='function'?flushSave:null),
    fmt: (typeof fmt==='function'?fmt:null),
    fmt1: (typeof fmt1==='function'?fmt1:null),
    freshDB: (typeof freshDB==='function'?freshDB:null),
    go: (typeof go==='function'?go:null),
    govContar: (typeof govContar==='function'?govContar:null),
    govGravar: (typeof govGravar==='function'?govGravar:null),
    govRegistarQuebra: (typeof govRegistarQuebra==='function'?govRegistarQuebra:null),
    govUpd: (typeof govUpd==='function'?govUpd:null),
    gravarInvent: (typeof gravarInvent==='function'?gravarInvent:null),
    histAcharHotel: (typeof histAcharHotel==='function'?histAcharHotel:null),
    histMed: (typeof histMed==='function'?histMed:null),
    histNm: (typeof histNm==='function'?histNm:null),
    hk35CurrentMarket: (typeof hk35CurrentMarket==='function'?hk35CurrentMarket:null),
    hk35DashUser: (typeof hk35DashUser==='function'?hk35DashUser:null),
    hk35MarketAllowsHotelObj: (typeof hk35MarketAllowsHotelObj==='function'?hk35MarketAllowsHotelObj:null),
    hk35Mount: (typeof hk35Mount==='function'?hk35Mount:null),
    hk35Norm: (typeof hk35Norm==='function'?hk35Norm:null),
    hk35Role: (typeof hk35Role==='function'?hk35Role:null),
    hk35SessionFromDashboard: (typeof hk35SessionFromDashboard==='function'?hk35SessionFromDashboard:null),
    hk35Start: (typeof hk35Start==='function'?hk35Start:null),
    hoteisDaLinha: (typeof hoteisDaLinha==='function'?hoteisDaLinha:null),
    hoteisVisiveis: (typeof hoteisVisiveis==='function'?hoteisVisiveis:null),
    hotelAprovado: (typeof hotelAprovado==='function'?hotelAprovado:null),
    hotelVisivel: (typeof hotelVisivel==='function'?hotelVisivel:null),
    idxOvRow: (typeof idxOvRow==='function'?idxOvRow:null),
    importInvent: (typeof importInvent==='function'?importInvent:null),
    importarHistorico: (typeof importarHistorico==='function'?importarHistorico:null),
    importarPrecos: (typeof importarPrecos==='function'?importarPrecos:null),
    indiceParaHotel: (typeof indiceParaHotel==='function'?indiceParaHotel:null),
    iniciarPresenca: (typeof iniciarPresenca==='function'?iniciarPresenca:null),
    iniciarSync: (typeof iniciarSync==='function'?iniciarSync:null),
    invDoHotel: (typeof invDoHotel==='function'?invDoHotel:null),
    irParaHotel: (typeof irParaHotel==='function'?irParaHotel:null),
    isCompras: (typeof isCompras==='function'?isCompras:null),
    isDO: (typeof isDO==='function'?isDO:null),
    isGovernanta: (typeof isGovernanta==='function'?isGovernanta:null),
    limparInvent: (typeof limparInvent==='function'?limparInvent:null),
    linhaAplicaAoHotel: (typeof linhaAplicaAoHotel==='function'?linhaAplicaAoHotel:null),
    loadDB: (typeof loadDB==='function'?loadDB:null),
    localGet: (typeof localGet==='function'?localGet:null),
    logAdd: (typeof logAdd==='function'?logAdd:null),
    logout: (typeof logout==='function'?logout:null),
    mapaMovsQuebra: (typeof mapaMovsQuebra==='function'?mapaMovsQuebra:null),
    markCat: (typeof markCat==='function'?markCat:null),
    mesLabel: (typeof mesLabel==='function'?mesLabel:null),
    migrate: (typeof migrate==='function'?migrate:null),
    modal: (typeof modal==='function'?modal:null),
    movDia: (typeof movDia==='function'?movDia:null),
    movMes: (typeof movMes==='function'?movMes:null),
    mudarCampanha: (typeof mudarCampanha==='function'?mudarCampanha:null),
    mudarPassword: (typeof mudarPassword==='function'?mudarPassword:null),
    noPerm: (typeof noPerm==='function'?noPerm:null),
    nomeOrd: (typeof nomeOrd==='function'?nomeOrd:null),
    novaCampanha: (typeof novaCampanha==='function'?novaCampanha:null),
    novaCampanhaObj: (typeof novaCampanhaObj==='function'?novaCampanhaObj:null),
    now: (typeof now==='function'?now:null),
    num: (typeof num==='function'?num:null),
    onAlAmbito: (typeof onAlAmbito==='function'?onAlAmbito:null),
    onAmbito: (typeof onAmbito==='function'?onAmbito:null),
    onCmpAmbito: (typeof onCmpAmbito==='function'?onCmpAmbito:null),
    onQbAmbito: (typeof onQbAmbito==='function'?onQbAmbito:null),
    onVlAmbito: (typeof onVlAmbito==='function'?onVlAmbito:null),
    openAplic: (typeof openAplic==='function'?openAplic:null),
    openCamasDetalhe: (typeof openCamasDetalhe==='function'?openCamasDetalhe:null),
    openCausas: (typeof openCausas==='function'?openCausas:null),
    openCor: (typeof openCor==='function'?openCor:null),
    openHotel: (typeof openHotel==='function'?openHotel:null),
    openIndice: (typeof openIndice==='function'?openIndice:null),
    openMovs: (typeof openMovs==='function'?openMovs:null),
    ordenarHoteis: (typeof ordenarHoteis==='function'?ordenarHoteis:null),
    pararPresenca: (typeof pararPresenca==='function'?pararPresenca:null),
    pararSync: (typeof pararSync==='function'?pararSync:null),
    pecasExtraDe: (typeof pecasExtraDe==='function'?pecasExtraDe:null),
    pecasFixaDe: (typeof pecasFixaDe==='function'?pecasFixaDe:null),
    podeEditar: (typeof podeEditar==='function'?podeEditar:null),
    podeEditarInv: (typeof podeEditarInv==='function'?podeEditarInv:null),
    precoCategoria: (typeof precoCategoria==='function'?precoCategoria:null),
    precoNm: (typeof precoNm==='function'?precoNm:null),
    precoNormMed: (typeof precoNormMed==='function'?precoNormMed:null),
    presencaOnline: (typeof presencaOnline==='function'?presencaOnline:null),
    presenceBeacon: (typeof presenceBeacon==='function'?presenceBeacon:null),
    presenceBeat: (typeof presenceBeat==='function'?presenceBeat:null),
    presencePoll: (typeof presencePoll==='function'?presencePoll:null),
    projData: (typeof projData==='function'?projData:null),
    projHoteis: (typeof projHoteis==='function'?projHoteis:null),
    qbData: (typeof qbData==='function'?qbData:null),
    qbHoteis: (typeof qbHoteis==='function'?qbHoteis:null),
    quebraLinha: (typeof quebraLinha==='function'?quebraLinha:null),
    reabrirCampanha: (typeof reabrirCampanha==='function'?reabrirCampanha:null),
    reabrirInvent: (typeof reabrirInvent==='function'?reabrirInvent:null),
    redesenharAtual: (typeof redesenharAtual==='function'?redesenharAtual:null),
    regRow: (typeof regRow==='function'?regRow:null),
    regRowGeneric: (typeof regRowGeneric==='function'?regRowGeneric:null),
    registarMov: (typeof registarMov==='function'?registarMov:null),
    renderAlertas: (typeof renderAlertas==='function'?renderAlertas:null),
    renderComparar: (typeof renderComparar==='function'?renderComparar:null),
    renderExec: (typeof renderExec==='function'?renderExec:null),
    renderFechoBloco: (typeof renderFechoBloco==='function'?renderFechoBloco:null),
    renderGovContagem: (typeof renderGovContagem==='function'?renderGovContagem:null),
    renderGovEscolhaHotel: (typeof renderGovEscolhaHotel==='function'?renderGovEscolhaHotel:null),
    renderInvRows: (typeof renderInvRows==='function'?renderInvRows:null),
    renderLog: (typeof renderLog==='function'?renderLog:null),
    renderMapa: (typeof renderMapa==='function'?renderMapa:null),
    renderParam: (typeof renderParam==='function'?renderParam:null),
    renderPresenca: (typeof renderPresenca==='function'?renderPresenca:null),
    renderProj: (typeof renderProj==='function'?renderProj:null),
    renderQuebras: (typeof renderQuebras==='function'?renderQuebras:null),
    renderRegioesCard: (typeof renderRegioesCard==='function'?renderRegioesCard:null),
    renderValor: (typeof renderValor==='function'?renderValor:null),
    renomearCampanha: (typeof renomearCampanha==='function'?renomearCampanha:null),
    revKey: (typeof revKey==='function'?revKey:null),
    roleBadge: (typeof roleBadge==='function'?roleBadge:null),
    saveAplic: (typeof saveAplic==='function'?saveAplic:null),
    saveDB: (typeof saveDB==='function'?saveDB:null),
    saveIndice: (typeof saveIndice==='function'?saveIndice:null),
    saveRegioes: (typeof saveRegioes==='function'?saveRegioes:null),
    saveUser: (typeof saveUser==='function'?saveUser:null),
    seedCatalogoComAplic: (typeof seedCatalogoComAplic==='function'?seedCatalogoComAplic:null),
    setCamaDet: (typeof setCamaDet==='function'?setCamaDet:null),
    setOcupacao: (typeof setOcupacao==='function'?setOcupacao:null),
    setPisoSeg: (typeof setPisoSeg==='function'?setPisoSeg:null),
    setQuartos: (typeof setQuartos==='function'?setQuartos:null),
    setRegiao: (typeof setRegiao==='function'?setRegiao:null),
    setSaveState: (typeof setSaveState==='function'?setSaveState:null),
    somaCausas: (typeof somaCausas==='function'?somaCausas:null),
    somaMovs: (typeof somaMovs==='function'?somaMovs:null),
    syncCheck: (typeof syncCheck==='function'?syncCheck:null),
    taxasQuebraGlobais: (typeof taxasQuebraGlobais==='function'?taxasQuebraGlobais:null),
    temMovs: (typeof temMovs==='function'?temMovs:null),
    toast: (typeof toast==='function'?toast:null),
    toggleUser: (typeof toggleUser==='function'?toggleUser:null),
    trocarHotel: (typeof trocarHotel==='function'?trocarHotel:null),
    uid: (typeof uid==='function'?uid:null),
    upd: (typeof upd==='function'?upd:null),
    updExistencias: (typeof updExistencias==='function'?updExistencias:null),
    val: (typeof val==='function'?val:null),
    val2: (typeof val2==='function'?val2:null),
    validaPasswordDO: (typeof validaPasswordDO==='function'?validaPasswordDO:null),
    veTodosHoteis: (typeof veTodosHoteis==='function'?veTodosHoteis:null),
    vlData: (typeof vlData==='function'?vlData:null),
    vlHoteis: (typeof vlHoteis==='function'?vlHoteis:null)
  };window.__HK35_PREV=window.__HK35_PREV||{};
  for(const [name,fn] of Object.entries(fns)){if(typeof fn!=='function')continue;if(!(name in window.__HK35_PREV))window.__HK35_PREV[name]=window[name];const prev=window.__HK35_PREV[name];window[name]=function(...args){const ev=window.event,target=ev&&ev.target;const inRoot=!!(target&&window.HK35Root&&target.getRootNode&&target.getRootNode()===window.HK35Root);if(inRoot)return fn.apply(target,args);if(typeof prev==='function')return prev.apply(this,args);return fn.apply(this,args);};}
  const bridge=window.VGHK35=window.VGHK35||{};Object.defineProperty(bridge,'DB',{configurable:true,get:()=>DB});
  try{Object.defineProperty(window,'CMP_INI',{configurable:true,get:()=>CMP_INI,set:v=>{CMP_INI=v;}});}catch(e){}
  try{Object.defineProperty(window,'CMP_FIM',{configurable:true,get:()=>CMP_FIM,set:v=>{CMP_FIM=v;}});}catch(e){}
  try{Object.defineProperty(window,'MAPA_HOTEL',{configurable:true,get:()=>MAPA_HOTEL,set:v=>{MAPA_HOTEL=v;}});}catch(e){}
  try{Object.defineProperty(window,'MAPA_VISTA',{configurable:true,get:()=>MAPA_VISTA,set:v=>{MAPA_VISTA=v;}});}catch(e){}
  try{Object.defineProperty(window,'GOV_HOTEL',{configurable:true,get:()=>GOV_HOTEL,set:v=>{GOV_HOTEL=v;}});}catch(e){}
  try{Object.defineProperty(window,'GOV_CAT',{configurable:true,get:()=>GOV_CAT,set:v=>{GOV_CAT=v;}});}catch(e){}
  try{Object.defineProperty(window,'GOV_MODO',{configurable:true,get:()=>GOV_MODO,set:v=>{GOV_MODO=v;}});}catch(e){}
}
// Rebind permissions to the dashboard geography/profile. The original data model remains unchanged.
hotelVisivel=function(h){if(!hk35MarketAllowsHotelObj(h))return false;if(veTodosHoteis())return true;return !!SESSION&&Array.isArray(SESSION.hoteis)&&SESSION.hoteis.includes(h.id);};
// A second Housekeeping password is not valid in the integrated platform: the authenticated DO session is the approval factor.
validaPasswordDO=function(){return isDO();};
logout=function(){toast('A sessão é gerida pela VG Operations. Use o menu principal para terminar sessão.');};
mudarPassword=function(){toast('A palavra-passe é gerida pela autenticação da VG Operations.');};
// Native navigation keeps every operational view except duplicate user management.
buildNav=function(){
  const items=[{sec:'Operação'},{v:'dash',ic:'▣',t:'Painel'},{v:'param',ic:'▤',t:'Inventário'},{v:'proj',ic:'◈',t:'Projeção de compra'}];
  if(veTodosHoteis())items.push({v:'exec',ic:'★',t:'Relatório executivo'},{v:'comparar',ic:'◔',t:'Comparação campanhas'},{v:'quebras',ic:'⚠',t:'Análise de quebras'},{v:'mapames',ic:'▦',t:'Mapa de quebras'},{v:'valor',ic:'€',t:'Valorização financeira'},{v:'alertas',ic:'▲',t:'Alertas de rutura'});
  if(isDO())items.push({sec:'Administração'},{v:'campanhas',ic:'◷',t:'Campanhas de inventário'},{v:'catalogo',ic:'☰',t:'Catálogo de roupas'},{v:'log',ic:'⟲',t:'Registo de alterações'});
  const nav=window.HK35Root.getElementById('nav');nav.innerHTML=items.map(i=>i.sec?'<div class="sec">'+i.sec+'</div>':'<a data-v="'+i.v+'" onclick="go(\''+i.v+'\')"><span class="ic">'+i.ic+'</span>'+i.t+'</a>').join('');
};
async function hk35Start(){
  await loadDB();SESSION=hk35SessionFromDashboard();const ca=campanhaAtiva();CURRENT_CAMP=ca?ca.id:null;
  const fU=window.HK35Root.getElementById('fUser'),fR=window.HK35Root.getElementById('fRole');if(fU)fU.textContent=SESSION.nome;if(fR)fR.innerHTML=roleBadge(SESSION.role);
  if(HK35_HOST)HK35_HOST.classList.toggle('hk35-governanta',isGovernanta());
  if(isGovernanta()){window.HK35Root.getElementById('app').classList.add('hidden');window.HK35Root.getElementById('govMode').classList.remove('hidden');abrirModoGovernanta();setTimeout(()=>{try{window.scrollTo(0,0)}catch(e){}},0);}
  else{window.HK35Root.getElementById('app').classList.remove('hidden');window.HK35Root.getElementById('govMode').classList.add('hidden');buildNav();go('dash');}
  iniciarPresenca();iniciarSync();avisoNuvem();
  if(!HK35_BACKSTOPS){HK35_BACKSTOPS=true;document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&DIRTY){clearTimeout(autosaveTimer);beaconSave();DIRTY=false;}});window.addEventListener('pagehide',()=>{if(DIRTY)beaconSave();presenceBeacon();});}
}
async function hk35Mount(container){
  if(!container)return;const mk=hk35CurrentMarket();
  if(HK35_HOST&&HK35_HOST.parentNode===container){if(HK35_MARKET!==mk){HK35_MARKET=mk;buildNav();if(isGovernanta())abrirModoGovernanta();else go('dash');}return HK35_INIT;}
  container.innerHTML='';HK35_HOST=document.createElement('div');HK35_HOST.className='vg-native-module vg-housekeeping-native-v35';container.appendChild(HK35_HOST);HK35_SHADOW=HK35_HOST.attachShadow({mode:'open'});window.HK35Root=HK35_SHADOW;HK35_MARKET=mk;
  HK35_SHADOW.innerHTML='<link rel="stylesheet" href="assets/css/housekeeping-native-v35.css">'+HK35_TEMPLATE;hk35InstallDispatchers();HK35_INIT=hk35Start();return HK35_INIT;
}
window.VG.housekeepingNative35={version:35.8,mount:hk35Mount,getRoot:()=>HK35_SHADOW,source:'inventario-main/index.html',architecture:'native-shadow-module'};
})();
