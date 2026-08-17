
(function(){
'use strict';


/* ====== REGIÕES: usa o mapa oficial do dashboard (editor de Regiões) ====== */
const REG_LABEL={norte:'Norte e Centro',lisboa:'Lisboa & Ilhas',alentejo:'Alentejo',algarve:'Algarve'};
const REG_OUTROS='Sede & Outros';
const cdRegionLabel=k=>window.VG?.market?.regionLabel?.(k)||REG_LABEL[k]||k;
const cdRegionList=()=>[...Object.keys((typeof REGIOES!=='undefined'&&REGIOES)||{}).map(cdRegionLabel),REG_OUTROS];
const _norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
let REG_BY_HOTEL=[];
function cdRefreshRegioes(){
  REG_BY_HOTEL=[];
  if(!HOT)return;
  const R=(typeof REGIOES!=='undefined'&&REGIOES)?REGIOES:{};
  const m=new Map();
  for(const k of Object.keys(R))for(const n of (R[k]||[]))m.set(_norm(n),cdRegionLabel(k));
  for(let i=0;i<HOT.length;i++)REG_BY_HOTEL[i]=m.get(_norm(HOT[i]||''))||REG_OUTROS;
}
const regiaoDe=h=>REG_BY_HOTEL[h]||REG_OUTROS;
/* ====== Estado de dados (carregado por upload/sessão) ====== */
let CD=null;
let D,MESES,HOT,CEN,FAM,SUB,GRP,ART,FORN,ANO_REC;
function cdSetDataInterno(d){
  CD=d||null;
  if(!CD){cdFillHeader(); try{ window.__VG_CD=null; }catch(e){} return;}
  D=CD.dic;MESES=CD.meta.meses;
  HOT=D.hoteis;CEN=D.centros;FAM=D.fam;SUB=D.sub;GRP=D.grp;ART=D.art;FORN=D.forn;
  ANO_REC=Math.floor(MESES[MESES.length-1]/100);
  ST.regiao='';ST.hotel=0;
  ST.mesDe=Math.max(0,MESES.findIndex(m=>Math.floor(m/100)===ANO_REC));
  ST.mesAte=MESES.length-1;
  for(const k in sub2)delete sub2[k];
  cdRefreshRegioes();
  cdFillHeader();
  // Publica no window para que o motor de comentários da Ficha do Hotel (noutro bloco <script>) aceda aos dados.
  try{ window.__VG_CD={ A:CD.A, G:CD.G, HOT, FAM, SUB, GRP, ART, MESES }; }catch(e){}
}
const MNOMES=['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const mesLbl=im=>{const v=MESES[im];return MNOMES[v%100]+' '+Math.floor(v/100);};
const mesLblCurto=im=>MNOMES[MESES[im]%100];
const fmt0=new Intl.NumberFormat('pt-PT',{maximumFractionDigits:0});
const fmt2=new Intl.NumberFormat('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2});
const eur=v=>window.VG?.market?.formatMoney?window.VG.market.formatMoney(Math.round(v),0,true):fmt0.format(Math.round(v))+' €';
const fmt1=new Intl.NumberFormat('pt-PT',{maximumFractionDigits:1});
const eurAxis=v=>{if(window.VG?.market?.formatMoneyCompact)return window.VG.market.formatMoneyCompact(v,1);const x=Math.abs(v);if(x>=1e6)return fmt1.format(v/1e6)+' M€';if(x>=1e3)return fmt0.format(v/1e3)+' k€';return fmt0.format(v)+' €';};
const eur2=v=>window.VG?.market?.formatMoney?window.VG.market.formatMoney(v,2,true):fmt2.format(v)+' €';
const cdSym=()=>window.VG?.market?.symbol?.()||'€';
const pct=v=>fmt2.format(v*100).replace(',00','')+'%';
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const NAV=['#06b6d4','#7c3aed','#c8a94d','#2563eb','#16a34a','#dc2626','#d97706','#0891b2','#64748b','#4f46e5','#0d9488','#db2777'];
const cor=i=>NAV[i%NAV.length];

const charts={};
function plot(id,cfg){
  if(charts[id]){charts[id].destroy();delete charts[id];}
  const cv=document.getElementById(id);
  if(!cv)return;
  charts[id]=new Chart(cv.getContext('2d'),cfg);
}
function destroyAllCharts(){for(const k in charts){charts[k].destroy();delete charts[k];}}

/* Estado global */
const ST={ambito:'compras',regiao:'',hotel:0,mesDe:0,mesAte:0,tab:'geral'};
const sub2={}; // estado por separador

/* Índices de coluna:
   G: 0 tipo, 1 hotel, 2 mes, 3 centro, 4 fam, 5 sub, 6 grp, 7 valor
   A: 0 hotel, 1 mes, 2 fam, 3 sub, 4 grp, 5 art, 6 valor, 7 qtd
   F: 0 hotel, 1 mes, 2 forn, 3 fam, 4 valor
   P: 0 art, 1 forn, 2 hotel, 3 valor, 4 qtd
   X: 0 tipo, 1 orig, 2 dest, 3 mes, 4 fam, 5 grp, 6 valor */

function passaFiltroBase(h,m){
  if(m<ST.mesDe||m>ST.mesAte)return false;
  if(ST.hotel&&h!==ST.hotel)return false;
  if(ST.regiao&&regiaoDe(h)!==ST.regiao)return false;
  return true;
}
function rowsG(){ // aplica âmbito + filtros globais
  const out=[];
  for(const r of CD.G){
    if(ST.ambito==='compras'&&r[0]!==0)continue;
    if(!passaFiltroBase(r[1],r[2]))continue;
    out.push(r);
  }
  return out;
}
function rowsA(){
  const out=[];
  for(const r of CD.A){ if(!passaFiltroBase(r[0],r[1]))continue; out.push(r); }
  return out;
}
function rowsF(){
  const out=[];
  for(const r of CD.F){ if(!passaFiltroBase(r[0],r[1]))continue; out.push(r); }
  return out;
}
function somaPor(rows,keyFn,valIdx){
  const m=new Map();
  for(const r of rows){const k=keyFn(r);m.set(k,(m.get(k)||0)+r[valIdx]);}
  return m;
}
function topN(map,n){
  return [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,n);
}
function serieMensal(rows,mesIdx,valIdx,filtro){
  const s=new Array(MESES.length).fill(0);
  for(const r of rows){if(filtro&&!filtro(r))continue;s[r[mesIdx]]+=r[valIdx];}
  return s;
}
function mesesAtivos(){const a=[];for(let i=ST.mesDe;i<=ST.mesAte;i++)a.push(i);return a;}

function tabela(headers,linhas,opts={}){
  const o=opts;
  let h='<div class="tscroll" '+(o.maxH?`style="max-height:${o.maxH}px"`:'')+'><table><thead><tr>';
  headers.forEach(hd=>{h+=`<th class="${hd.n?'n':''}">${hd.t}</th>`;});
  h+='</tr></thead><tbody>';
  for(const ln of linhas){h+='<tr>'+ln.map((c,i)=>`<td class="${headers[i]&&headers[i].n?'n':''}">${c}</td>`).join('')+'</tr>';}
  h+='</tbody></table></div>';
  return h;
}
function barraPct(v,max){const w=max>0?Math.max(1,Math.round(v/max*100)):0;return `<div class="bar"><i style="width:${w}%"></i></div>`;}

function exportCSV(nome,headers,linhas){
  let csv='\uFEFF'+headers.join(';')+'\n';
  for(const ln of linhas){csv+=ln.map(c=>{const s=String(c).replace(/"/g,'""');return /[;"\n]/.test(s)?'"'+s+'"':s;}).join(';')+'\n';}
  const b=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=nome;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),5000);
}

/* ============ CABEÇALHO / FILTROS ============ */
let uiBound=false;
function cdBindUI(){
  if(uiBound)return;uiBound=true;
  const de=document.getElementById('cd_fMesDe'),ate=document.getElementById('cd_fMesAte');
  de.onchange=()=>{ST.mesDe=+de.value;if(ST.mesAte<ST.mesDe){ST.mesAte=ST.mesDe;ate.value=ST.mesDe;}render();};
  ate.onchange=()=>{ST.mesAte=+ate.value;if(ST.mesDe>ST.mesAte){ST.mesDe=ST.mesAte;de.value=ST.mesAte;}render();};
  const fr=document.getElementById('cd_fRegiao');
  fr.onchange=()=>{ST.regiao=fr.value;cdFillHoteis();ST.hotel=0;render();};
  const fh=document.getElementById('cd_fHotel');
  fh.onchange=()=>{ST.hotel=+fh.value;render();};
  document.querySelectorAll('#cd_segAmbito button').forEach(b=>{
    b.onclick=()=>{document.querySelectorAll('#cd_segAmbito button').forEach(x=>x.classList.remove('on'));
      b.classList.add('on');ST.ambito=b.dataset.v;render();};
  });
  document.querySelectorAll('#cd_tabs button').forEach(b=>{
    b.onclick=()=>{document.querySelectorAll('#cd_tabs button').forEach(x=>x.classList.remove('on'));
      b.classList.add('on');ST.tab=b.dataset.t;render();};
  });
}
function cdFillHeader(){
  const meta=document.getElementById('cd_hdrMeta');
  if(!meta)return;
  if(!CD){meta.textContent='Sem extrato carregado.';return;}
  meta.textContent=`Fonte: ${CD.meta.fonte} · ${fmt0.format(CD.meta.linhas_origem)} movimentos · ${mesLbl(0)} – ${mesLbl(MESES.length-1)} · processado ${CD.meta.gerado}`;
  const fr=document.getElementById('cd_fRegiao');
  fr.innerHTML='<option value="">Todas as regiões</option>'+cdRegionList().map(r=>`<option>${r}</option>`).join('');
  cdFillHoteis();
  const de=document.getElementById('cd_fMesDe'),ate=document.getElementById('cd_fMesAte');
  de.innerHTML=MESES.map((m,i)=>`<option value="${i}">${mesLbl(i)}</option>`).join('');
  ate.innerHTML=de.innerHTML;
  de.value=String(ST.mesDe);ate.value=String(ST.mesAte);
}
function cdFillHoteis(){
  const fh=document.getElementById('cd_fHotel');
  const hs=[];
  for(let i=1;i<HOT.length;i++){if(!ST.regiao||regiaoDe(i)===ST.regiao)hs.push(i);}
  fh.innerHTML='<option value="0">Todos os hotéis</option>'+hs.map(i=>`<option value="${i}">${esc(HOT[i])}</option>`).join('');
  fh.value=String(ST.hotel||0);
}
/* ============ VISÃO GERAL ============ */
function rGeral(el){
  const g=rowsG();
  let total=0;for(const r of g)total+=r[7];
  const porMes=serieMensal(g,2,7);
  const nM=mesesAtivos().length;
  const porFam=somaPor(g,r=>r[4],7);
  const porHotel=somaPor(g,r=>r[1],7);
  const porGrp=somaPor(g,r=>r[6],7);
  const fset=new Set();for(const r of rowsF())fset.add(r[2]);
  const topFam=topN(porFam,99)[0];

  el.innerHTML=`
  <div class="grid kpis" style="margin-bottom:14px">
    <div class="kpi"><div class="l">Custo total</div><div class="v">${eur(total)}</div><div class="s">${ST.ambito==='compras'?'só compras':'compras + transferências'}</div></div>
    <div class="kpi"><div class="l">Média mensal</div><div class="v">${eur(total/Math.max(1,nM))}</div><div class="s">${nM} ${nM>1?'meses':'mês'}</div></div>
    <div class="kpi"><div class="l">Unidades com custos</div><div class="v">${[...porHotel.keys()].filter(k=>Math.abs(porHotel.get(k))>0.005).length}</div><div class="s">no filtro atual</div></div>
    <div class="kpi"><div class="l">Fornecedores ativos</div><div class="v">${fmt0.format(fset.size)}</div><div class="s">com compras no período</div></div>
    <div class="kpi"><div class="l">Maior família</div><div class="v" style="font-size:16px">${topFam?esc(FAM[topFam[0]]):'—'}</div><div class="s">${topFam?eur(topFam[1])+' · '+pct(topFam[1]/total):''}</div></div>
  </div>
  <div class="grid row32" style="margin-bottom:14px">
    <div class="card"><h3>Evolução mensal do custo</h3><div class="chartbox"><canvas id="cd_cGm"></canvas></div></div>
    <div class="card"><h3>Peso por família</h3><div class="chartbox"><canvas id="cd_cGf"></canvas></div></div>
  </div>
  <div class="grid row2">
    <div class="card"><h3>Top 12 unidades por custo</h3><div class="chartbox tall"><canvas id="cd_cGh"></canvas></div></div>
    <div class="card"><h3>Top 15 grupos de custo</h3><div id="cd_tGg"></div></div>
  </div>`;

  const mm=mesesAtivos();
  plot('cd_cGm',{type:'bar',data:{labels:mm.map(mesLbl),datasets:[{label:'Custo',data:mm.map(i=>porMes[i]),backgroundColor:'#2563eb',borderRadius:5}]},
    options:{maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>eur(c.parsed.y)}}},scales:{y:{ticks:{callback:v=>eurAxis(v)}}}}});
  const tf=topN(porFam,11);
  plot('cd_cGf',{type:'doughnut',data:{labels:tf.map(x=>FAM[x[0]]),datasets:[{data:tf.map(x=>x[1]),backgroundColor:tf.map((_,i)=>cor(i))}]},
    options:{maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{boxWidth:11,font:{size:11}}},tooltip:{callbacks:{label:c=>` ${c.label}: ${eur(c.parsed)} (${pct(c.parsed/total)})`}}}}});
  const th=topN(porHotel,12);
  plot('cd_cGh',{type:'bar',data:{labels:th.map(x=>HOT[x[0]]),datasets:[{data:th.map(x=>x[1]),backgroundColor:'#06b6d4',borderRadius:4}]},
    options:{indexAxis:'y',maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>eur(c.parsed.x)}}},scales:{x:{ticks:{callback:v=>eurAxis(v)}}}}});
  const tg=topN(porGrp,15),mx=tg.length?tg[0][1]:0;
  document.getElementById('cd_tGg').innerHTML=tabela(
    [{t:'Grupo'},{t:'Valor',n:1},{t:'% total',n:1},{t:''}],
    tg.map(x=>[esc(GRP[x[0]]),eur(x[1]),pct(x[1]/total),barraPct(x[1],mx)]),{maxH:430});
}

/* ============ HOTÉIS (drill-down) ============ */
function rHoteis(el){
  const s=sub2.hoteis||(sub2.hoteis={hotel:0,nivel:'centro',cen:0,fam:0,sub:0,grp:0});
  const g=rowsG();
  const porHotel=topN(somaPor(g,r=>r[1],7),999);
  if(!s.hotel||!porHotel.some(x=>x[0]===s.hotel))s.hotel=porHotel.length?porHotel[0][0]:0;

  el.innerHTML=`
  <div class="grid row23">
    <div class="card"><h3>Ranking de unidades <small>(clica para analisar)</small></h3><div id="cd_tHrk"></div></div>
    <div>
      <div class="card" style="margin-bottom:14px">
        <h3 id="cd_hTit"></h3>
        <div class="grid kpis" id="cd_hKpis" style="margin-bottom:12px"></div>
        <div class="chartbox" style="height:220px"><canvas id="cd_cHm"></canvas></div>
      </div>
      <div class="card"><h3>Estrutura de custos <small id="cd_hCrumbSmall"></small></h3>
        <div class="bc" id="cd_hCrumb"></div><div id="cd_tHdrill"></div>
        <div class="note">Clica numa linha para descer: Centro de custo → Família → Grupo → Artigos (artigos apenas em compras).</div>
      </div>
    </div>
  </div>`;

  const mx=porHotel.length?porHotel[0][1]:0;
  document.getElementById('cd_tHrk').innerHTML=tabela(
    [{t:'#'},{t:'Unidade'},{t:'Região'},{t:'Valor',n:1},{t:''}],
    porHotel.map((x,i)=>[i+1,`<span class="clk" onclick="cdSelHotel(${x[0]})">${esc(HOT[x[0]])}</span>`,
      `<span class="tag">${regiaoDe(x[0])}</span>`,eur(x[1]),barraPct(Math.abs(x[1]),mx)]),{maxH:760});
  drawHotelDetail();
}
window.cdSelHotel=h=>{const s=sub2.hoteis;s.hotel=h;s.nivel='centro';s.cen=s.fam=s.sub=s.grp=0;drawHotelDetail();};
window.cdHNav=lvl=>{const s=sub2.hoteis;
  if(lvl==='centro'){s.nivel='centro';s.cen=s.fam=s.sub=s.grp=0;}
  else if(lvl==='fam'){s.nivel='fam';s.fam=s.sub=s.grp=0;}
  else if(lvl==='sub'){s.nivel='sub';s.sub=s.grp=0;}
  else if(lvl==='grp'){s.nivel='grp';s.grp=0;}
  drawHotelDetail();};
window.cdHDesce=(lvl,id)=>{const s=sub2.hoteis;
  if(lvl==='centro'){s.cen=id;s.nivel='fam';}
  else if(lvl==='fam'){s.fam=id;s.nivel='sub';}
  else if(lvl==='sub'){s.sub=id;s.nivel='grp';}
  else if(lvl==='grp'){s.grp=id;s.nivel='art';}
  drawHotelDetail();};

function drawHotelDetail(){
  const s=sub2.hoteis;const h=s.hotel;if(!h)return;
  const g=rowsG().filter(r=>r[1]===h);
  let tot=0;for(const r of g)tot+=r[7];
  const serie=serieMensal(g,2,7);
  const mm=mesesAtivos();
  const ult=serie[ST.mesAte],pen=ST.mesAte>ST.mesDe?serie[ST.mesAte-1]:0;
  const varM=pen?(ult-pen)/Math.abs(pen):null;
  document.getElementById('cd_hTit').textContent=HOT[h]+' — '+regiaoDe(h);
  document.getElementById('cd_hKpis').innerHTML=`
    <div class="kpi"><div class="l">Total período</div><div class="v">${eur(tot)}</div></div>
    <div class="kpi"><div class="l">${mesLbl(ST.mesAte)}</div><div class="v">${eur(ult)}</div>
      <div class="s">${varM===null?'':`<span class="pill ${varM>0?'neg':'pos'}">${varM>0?'+':''}${pct(varM)} vs ${mesLblCurto(ST.mesAte-1)}</span>`}</div></div>
    <div class="kpi"><div class="l">Média mensal</div><div class="v">${eur(tot/Math.max(1,mm.length))}</div></div>`;
  plot('cd_cHm',{type:'line',data:{labels:mm.map(mesLbl),datasets:[{label:'Custo',data:mm.map(i=>serie[i]),borderColor:'#2563eb',backgroundColor:'rgba(37,99,235,.08)',fill:true,tension:.3,pointRadius:4}]},
    options:{maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>eur(c.parsed.y)}}},scales:{y:{ticks:{callback:v=>eurAxis(v)}}}}});

  // breadcrumb + tabela de drill
  const bc=[`<a onclick="cdHNav('centro')">${esc(HOT[h])}</a>`];
  if(s.cen)bc.push(`<a onclick="cdHNav('fam')">${esc(CEN[s.cen])}</a>`);
  if(s.fam)bc.push(`<a onclick="cdHNav('sub')">${esc(FAM[s.fam])}</a>`);
  if(s.sub)bc.push(`<a onclick="cdHNav('grp')">${esc(SUB[s.sub])}</a>`);
  if(s.grp)bc.push(esc(GRP[s.grp]));
  document.getElementById('cd_hCrumb').innerHTML=bc.join(' &rsaquo; ');
  document.getElementById('cd_hCrumbSmall').textContent='';

  let linhas=[],hdr,lvl,mp,dic;
  const filtra=r=>(!s.cen||r[3]===s.cen)&&(!s.fam||r[4]===s.fam)&&(!s.sub||r[5]===s.sub)&&(!s.grp||r[6]===s.grp);
  if(s.nivel==='centro'){lvl='centro';hdr='Centro de custo';
    mp=somaPor(g,r=>r[3],7);dic=CEN;}
  else if(s.nivel==='fam'){lvl='fam';hdr='Família';
    mp=somaPor(g.filter(filtra),r=>r[4],7);dic=FAM;}
  else if(s.nivel==='sub'){lvl='sub';hdr='Sub-família';
    mp=somaPor(g.filter(filtra),r=>r[5],7);dic=SUB;}
  else if(s.nivel==='grp'){lvl='grp';hdr='Grupo';
    mp=somaPor(g.filter(filtra),r=>r[6],7);dic=GRP;}
  if(s.nivel!=='art'){
    const tp=topN(mp,400),mx2=tp.length?Math.abs(tp[0][1]):0;
    let den=0;for(const[,v]of mp)den+=v;
    linhas=tp.map(x=>[`<span class="clk" onclick="cdHDesce('${lvl}',${x[0]})">${esc(dic[x[0]])||'<i>—</i>'}</span>`,
      eur(x[1]),den?pct(x[1]/den):'',barraPct(Math.abs(x[1]),mx2)]);
    document.getElementById('cd_tHdrill').innerHTML=tabela([{t:hdr},{t:'Valor',n:1},{t:'%',n:1},{t:''}],linhas,{maxH:400});
  }else{
    // nível artigo: usa A (apenas compras), filtra hotel + hierarquia fam/sub/grp
    const aa=rowsA().filter(r=>r[0]===h&&(!s.fam||r[2]===s.fam)&&(!s.sub||r[3]===s.sub)&&(!s.grp||r[4]===s.grp));
    const mp2=new Map();
    for(const r of aa){const k=r[5];const o=mp2.get(k)||[0,0];o[0]+=r[6];o[1]+=r[7];mp2.set(k,o);}
    const tp=[...mp2.entries()].sort((a,b)=>b[1][0]-a[1][0]).slice(0,300);
    const mx2=tp.length?Math.abs(tp[0][1][0]):0;
    linhas=tp.map(([a,o])=>[esc(ART[a]),eur2(o[0]),o[1]?fmt2.format(o[1]):'—',o[1]>0?eur2(o[0]/o[1]):'—',barraPct(Math.abs(o[0]),mx2)]);
    document.getElementById('cd_tHdrill').innerHTML=tabela([{t:'Artigo (compras)'},{t:'Valor',n:1},{t:'Qtd',n:1},{t:'Preço médio',n:1},{t:''}],linhas,{maxH:400});
  }
}

/* ============ CATEGORIAS ============ */
function rCat(el){
  const s=sub2.cat||(sub2.cat={fam:0,sub:0});
  const g=rowsG();
  el.innerHTML=`
  <div class="grid row2" style="margin-bottom:14px">
    <div class="card"><h3>Famílias <small>(clica para descer)</small></h3><div id="cd_tCf"></div></div>
    <div class="card"><h3 id="cd_cTit2">Detalhe</h3><div class="bc" id="cd_cCrumb"></div><div id="cd_tCd"></div></div>
  </div>
  <div class="card"><h3>Matriz Família × Mês</h3><div id="cd_tCm"></div></div>`;
  const porFam=topN(somaPor(g,r=>r[4],7),99);
  let tot=0;for(const[,v]of porFam)tot+=v;
  const mx=porFam.length?Math.abs(porFam[0][1]):0;
  document.getElementById('cd_tCf').innerHTML=tabela([{t:'Família'},{t:'Valor',n:1},{t:'%',n:1},{t:''}],
    porFam.map(x=>[`<span class="clk" onclick="cdCatFam(${x[0]})">${esc(FAM[x[0]])}</span>`,eur(x[1]),pct(x[1]/tot),barraPct(Math.abs(x[1]),mx)]),{maxH:430});
  drawCatDetail();
  // matriz
  const mm=mesesAtivos();
  const matriz=new Map();
  for(const r of g){const k=r[4];if(!matriz.has(k))matriz.set(k,new Array(MESES.length).fill(0));matriz.get(k)[r[2]]+=r[7];}
  const ordem=porFam.map(x=>x[0]);
  const linhas=ordem.map(f=>{
    const arr=matriz.get(f)||[];let tt=0;mm.forEach(i=>tt+=arr[i]||0);
    return [esc(FAM[f]),...mm.map(i=>eur(arr[i]||0)),`<b>${eur(tt)}</b>`];
  });
  // linha total
  const totMes=mm.map(i=>{let t=0;for(const[,arr]of matriz)t+=arr[i]||0;return t;});
  linhas.push([`<b>TOTAL</b>`,...totMes.map(v=>`<b>${eur(v)}</b>`),`<b>${eur(totMes.reduce((a,b)=>a+b,0))}</b>`]);
  document.getElementById('cd_tCm').innerHTML=tabela([{t:'Família'},...mm.map(i=>({t:mesLbl(i),n:1})),{t:'Total',n:1}],linhas,{maxH:520});
}
window.cdCatFam=f=>{const s=sub2.cat;s.fam=f;s.sub=0;drawCatDetail();};
window.cdCatSub=sb=>{const s=sub2.cat;s.sub=sb;drawCatDetail();};
window.cdCatNav=lvl=>{const s=sub2.cat;if(lvl==='fam')s.sub=0;else{s.fam=0;s.sub=0;}drawCatDetail();};
function drawCatDetail(){
  const s=sub2.cat;const g=rowsG();
  const bc=[`<a onclick="cdCatNav('topo')">Todas</a>`];
  if(s.fam)bc.push(`<a onclick="cdCatNav('fam')">${esc(FAM[s.fam])}</a>`);
  if(s.sub)bc.push(esc(SUB[s.sub]));
  document.getElementById('cd_cCrumb').innerHTML=bc.join(' &rsaquo; ');
  let html='';
  if(!s.fam){html='<div class="note">Seleciona uma família à esquerda para ver as sub-famílias, grupos e artigos.</div>';}
  else if(!s.sub){
    const mp=topN(somaPor(g.filter(r=>r[4]===s.fam),r=>r[5],7),200);
    let den=0;for(const[,v]of mp)den+=v;const mx=mp.length?Math.abs(mp[0][1]):0;
    html=tabela([{t:'Sub-família'},{t:'Valor',n:1},{t:'%',n:1},{t:''}],
      mp.map(x=>[`<span class="clk" onclick="cdCatSub(${x[0]})">${esc(SUB[x[0]])}</span>`,eur(x[1]),den?pct(x[1]/den):'',barraPct(Math.abs(x[1]),mx)]),{maxH:380});
  }else{
    const mp=topN(somaPor(g.filter(r=>r[4]===s.fam&&r[5]===s.sub),r=>r[6],7),200);
    let den=0;for(const[,v]of mp)den+=v;const mx=mp.length?Math.abs(mp[0][1]):0;
    html=tabela([{t:'Grupo'},{t:'Valor',n:1},{t:'%',n:1},{t:''}],
      mp.map(x=>[esc(GRP[x[0]]),eur(x[1]),den?pct(x[1]/den):'',barraPct(Math.abs(x[1]),mx)]),{maxH:240});
    // top artigos do sub (compras)
    const aa=rowsA().filter(r=>r[2]===s.fam&&r[3]===s.sub);
    const mp2=new Map();
    for(const r of aa){const o=mp2.get(r[5])||[0,0];o[0]+=r[6];o[1]+=r[7];mp2.set(r[5],o);}
    const tp=[...mp2.entries()].sort((a,b)=>b[1][0]-a[1][0]).slice(0,40);
    html+='<h3 style="margin-top:14px">Top artigos (compras)</h3>'+tabela([{t:'Artigo'},{t:'Valor',n:1},{t:'Qtd',n:1},{t:'P. médio',n:1}],
      tp.map(([a,o])=>[esc(ART[a]),eur2(o[0]),o[1]?fmt2.format(o[1]):'—',o[1]>0?eur2(o[0]/o[1]):'—']),{maxH:300});
  }
  document.getElementById('cd_tCd').innerHTML=html;
}

/* ============ FORNECEDORES ============ */
function rForn(el){
  const s=sub2.forn||(sub2.forn={sel:0,q:''});
  const f=rowsF();
  const porForn=somaPor(f,r=>r[2],4);
  let tot=0;for(const[,v]of porForn)tot+=v;
  const tp=topN(porForn,porForn.size);
  const top10=tp.slice(0,10).reduce((a,x)=>a+x[1],0);
  el.innerHTML=`
  <div class="grid kpis" style="margin-bottom:14px">
    <div class="kpi"><div class="l">Compras (período)</div><div class="v">${eur(tot)}</div></div>
    <div class="kpi"><div class="l">Fornecedores ativos</div><div class="v">${fmt0.format(tp.filter(x=>Math.abs(x[1])>0.005).length)}</div></div>
    <div class="kpi"><div class="l">Concentração Top 10</div><div class="v">${tot?pct(top10/tot):'—'}</div><div class="s">do valor de compras</div></div>
  </div>
  <div class="grid row2">
    <div class="card"><h3>Ranking de fornecedores <small>(clica para detalhe)</small></h3>
      <div class="inline"><input type="text" id="cd_fq" placeholder="Pesquisar fornecedor…" value="${esc(s.q)}" style="flex:1"></div>
      <div id="cd_tFr"></div></div>
    <div class="card"><h3 id="cd_fTit">Detalhe do fornecedor</h3><div id="cd_fDet"><div class="note">Seleciona um fornecedor à esquerda.</div></div></div>
  </div>`;
  const draw=()=>{
    const q=s.q.toLowerCase();
    const lista=tp.filter(x=>!q||FORN[x[0]].toLowerCase().includes(q)).slice(0,300);
    const mx=lista.length?Math.abs(lista[0][1]):0;
    document.getElementById('cd_tFr').innerHTML=tabela([{t:'#'},{t:'Fornecedor'},{t:'Valor',n:1},{t:'%',n:1},{t:''}],
      lista.map((x,i)=>[i+1,`<span class="clk" onclick="cdSelForn(${x[0]})">${esc(FORN[x[0]])}</span>`,eur(x[1]),tot?pct(x[1]/tot):'',barraPct(Math.abs(x[1]),mx)]),{maxH:560});
  };
  document.getElementById('cd_fq').oninput=e=>{s.q=e.target.value;draw();};
  draw();
  if(s.sel)drawFornDetail();
}
window.cdSelForn=id=>{sub2.forn.sel=id;drawFornDetail();};
function drawFornDetail(){
  const s=sub2.forn;const id=s.sel;
  document.getElementById('cd_fTit').textContent=FORN[id];
  const f=rowsF().filter(r=>r[2]===id);
  const mm=mesesAtivos();
  const serie=serieMensal(f,1,4);
  const porH=topN(somaPor(f,r=>r[0],4),20);
  const porFam=topN(somaPor(f,r=>r[3],4),20);
  let tot=0;for(const r of f)tot+=r[4];
  // artigos deste fornecedor (P não tem mês → total global; indicar)
  const arts=new Map();
  for(const r of CD.P){if(r[1]!==id)continue;
    if(ST.hotel&&r[2]!==ST.hotel)continue;
    if(ST.regiao&&regiaoDe(r[2])!==ST.regiao)continue;
    const o=arts.get(r[0])||[0,0];o[0]+=r[3];o[1]+=r[4];arts.set(r[0],o);}
  const ta=[...arts.entries()].sort((a,b)=>b[1][0]-a[1][0]).slice(0,30);
  document.getElementById('cd_fDet').innerHTML=`
    <div class="grid kpis" style="margin-bottom:12px">
      <div class="kpi"><div class="l">Total período</div><div class="v">${eur(tot)}</div></div>
      <div class="kpi"><div class="l">Unidades servidas</div><div class="v">${porH.length}</div></div>
    </div>
    <div class="chartbox" style="height:180px;margin-bottom:12px"><canvas id="cd_cFm"></canvas></div>
    <div class="grid row2">
      <div><h3 style="font-size:12.5px;color:var(--navy)">Por unidade</h3>${tabela([{t:'Unidade'},{t:'Valor',n:1}],porH.map(x=>[esc(HOT[x[0]]),eur(x[1])]),{maxH:220})}</div>
      <div><h3 style="font-size:12.5px;color:var(--navy)">Por família</h3>${tabela([{t:'Família'},{t:'Valor',n:1}],porFam.map(x=>[esc(FAM[x[0]]),eur(x[1])]),{maxH:220})}</div>
    </div>
    <h3 style="font-size:12.5px;color:var(--navy);margin-top:12px">Top artigos <small style="color:var(--mut)">(todo o ficheiro, todos os meses)</small></h3>
    ${tabela([{t:'Artigo'},{t:'Valor',n:1},{t:'Qtd',n:1},{t:'P. médio',n:1}],ta.map(([a,o])=>[esc(ART[a]),eur2(o[0]),fmt2.format(o[1]),o[1]>0?eur2(o[0]/o[1]):'—']),{maxH:240})}`;
  plot('cd_cFm',{type:'bar',data:{labels:mm.map(mesLbl),datasets:[{data:mm.map(i=>serie[i]),backgroundColor:'#06b6d4',borderRadius:4}]},
    options:{maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>eur(c.parsed.y)}}},scales:{y:{ticks:{callback:v=>eurAxis(v)}}}}});
}

/* ============ PREÇOS ============ */
function rPrecos(el){
  const s=sub2.precos||(sub2.precos={art:0,q:'',minQ:5,minV:500});
  const semPM = !CD.PM;
  const filtroActivo = CD.PM && (ST.mesDe > 0 || ST.mesAte < MESES.length - 1);
  const avisoHTML = semPM
    ? `<div class="note" style="background:#fff3cd;color:#7a5f00;border-left:3px solid #f59e0b;padding:8px 12px;margin-bottom:12px">⚠ Os dados de compras foram carregados com uma versão anterior. Para que o filtro de datas afecte os preços, recarrega o ficheiro Excel de movimentos.</div>`
    : '';
  el.innerHTML=`
  ${avisoHTML}
  <div class="card" style="margin-bottom:14px">
    <h3>Oportunidades de poupança <small>— mesmo artigo comprado a preços diferentes entre unidades/fornecedores</small></h3>
    <div class="inline">
      <label>Qtd mínima</label><input type="number" id="cd_pMinQ" value="${s.minQ}" min="1">
      <label>Valor mínimo do artigo</label><input type="number" id="cd_pMinV" value="${s.minV}" min="0" step="100"> ${cdSym()}
      <button class="btn" id="cd_pCalc">Recalcular</button>
      <button class="btn gold" id="cd_pExp">Exportar CSV</button>
    </div>
    <div id="cd_tPop"></div>
    <div class="note">Poupança potencial = (preço médio pago − preço mínimo observado) × quantidade, por unidade. O preço mínimo é o melhor preço médio praticado em qualquer unidade/fornecedor no período do ficheiro. Excluídos artigos das famílias PESSOAL, ENERGIA e NÃO OPERACIONAIS. ${window.VG?.market?.id?.()==='brasil'?'No Brasil não é aplicado um limite absoluto de preço unitário até existir um limiar BR aprovado; diferenças >3× continuam a ser ignoradas.':'Em PT+ES, artigos com preço mediano acima de 250 €/un (faturas/serviços, não comparáveis) são excluídos; diferenças >3× são ignoradas.'} Valores indicativos — confirmar unidades de medida e condições antes de concluir.</div>
  </div>
  <div class="card">
    <h3>Comparador de preços por artigo</h3>
    <div class="inline"><input type="text" id="cd_pq" placeholder="Pesquisar artigo… (mín. 3 letras)" value="${esc(s.q)}" style="flex:1"></div>
    <div id="cd_pLista"></div><div id="cd_pDet"></div>
  </div>`;
  document.getElementById('cd_pCalc').onclick=()=>{s.minQ=+document.getElementById('cd_pMinQ').value||1;s.minV=+document.getElementById('cd_pMinV').value||0;drawOportunidades();};
  document.getElementById('cd_pExp').onclick=()=>{const r=calcOportunidades();exportCSV('oportunidades_precos.csv',
    ['Artigo','Unidade','Fornecedor','Qtd','Valor','Preço pago','Melhor preço','Onde','Poupança potencial'],
    r.det.map(d=>[ART[d.a],HOT[d.h],FORN[d.f],d.q,d.v.toFixed(2),d.p.toFixed(4),d.pmin.toFixed(4),d.onde,d.save.toFixed(2)]));};
  document.getElementById('cd_pq').oninput=e=>{s.q=e.target.value;drawPrecoLista();};
  drawOportunidades();drawPrecoLista();if(s.art)drawPrecoDetail();
}
function rowsP(){
  // CD.PM: [artIdx, fornIdx, hotelIdx, mesIdx, val, qtd] — com dimensão temporal
  // CD.P:  [artIdx, fornIdx, hotelIdx, val, qtd] — agregado todo o período (mais rápido)
  const mesDe = ST.mesDe, mesAte = ST.mesAte;
  const todoOPeriodo = !CD.PM || (mesDe === 0 && mesAte === MESES.length - 1);

  if(todoOPeriodo){
    const out=[];
    for(const r of CD.P){
      if(ST.hotel&&r[2]!==ST.hotel)continue;
      if(ST.regiao&&regiaoDe(r[2])!==ST.regiao)continue;
      out.push(r);
    }
    return out;
  }

  // Agregar CD.PM filtrado por mês → mesmo formato de CD.P: [art,forn,hotel,val,qtd]
  const map=new Map();
  for(const r of CD.PM){
    // r: [artIdx, fornIdx, hotelIdx, mesIdx, val, qtd]
    if(r[3]<mesDe||r[3]>mesAte)continue;
    if(ST.hotel&&r[2]!==ST.hotel)continue;
    if(ST.regiao&&regiaoDe(r[2])!==ST.regiao)continue;
    const k=r[0]+','+r[1]+','+r[2];
    let v=map.get(k);if(!v){v=[r[0],r[1],r[2],0,0];map.set(k,v);}
    v[3]+=r[4]; v[4]+=r[5];
  }
  const out=[];
  for(const v of map.values()){if(v[4]>0)out.push(v);}
  return out;
}
/* artigos não comparáveis em preço: famílias de pessoal/energia/não operacionais (qtd = lançamentos, não unidades) */
const CM_EXCL=/PESSOAL|ENERGIA|NAO OPERACIONAIS/;
const cmCap=()=>window.VG?.market?.id?.()==='brasil'?Infinity:250; // V31: limite absoluto só em EUR; no Brasil evita-se aplicar 250 BRL como se fossem 250 EUR
let _artFamCache=null;
function cmArtFam(){
  if(_artFamCache)return _artFamCache;
  const m=new Map();
  for(const r of CD.A)if(!m.has(r[5]))m.set(r[5],r[2]);
  _artFamCache=m;return m;
}
function calcOportunidades(){
  const s=sub2.precos;
  // por artigo: linhas (forn,hotel,V,Q); preço mínimo credível = menor V/Q com Q>=minQ
  const porArt=new Map();
  for(const r of rowsP()){if(!porArt.has(r[0]))porArt.set(r[0],[]);porArt.get(r[0]).push(r);}
  const det=[];const porArtSave=new Map();
  const artFam=cmArtFam();
  for(const[a,lst]of porArt){
    if(CM_EXCL.test(FAM[artFam.get(a)]||''))continue;
    {const ps=lst.filter(r=>r[4]>=s.minQ).map(r=>r[3]/r[4]).filter(p=>p>0).sort((x,y)=>x-y);
     if(ps.length<2)continue;
     const med=ps[Math.floor((ps.length-1)/2)];
     if(med>cmCap())continue;}
    let totV=0;for(const r of lst)totV+=r[3];
    if(totV<s.minV)continue;
    let pmin=Infinity,onde='';
    for(const r of lst){if(r[4]>=s.minQ){const p=r[3]/r[4];if(p>0&&p<pmin){pmin=p;onde=HOT[r[2]]+' / '+FORN[r[1]];}}}
    if(!isFinite(pmin))continue;
    for(const r of lst){
      if(r[4]<s.minQ)continue;
      const p=r[3]/r[4];
      if(p<=pmin*1.0001)continue;
      if(p>pmin*3)continue; // diferença demasiado grande — provável produto/unidade distinta
      const save=(p-pmin)*r[4];
      if(save<10)continue;
      det.push({a,h:r[2],f:r[1],q:r[4],v:r[3],p,pmin,onde,save});
      porArtSave.set(a,(porArtSave.get(a)||0)+save);
    }
  }
  det.sort((x,y)=>y.save-x.save);
  return {det,porArtSave};
}
function drawOportunidades(){
  const r=calcOportunidades();
  const totSave=r.det.reduce((a,d)=>a+d.save,0);
  const linhas=r.det.slice(0,80).map(d=>[
    `<span class="clk" onclick="cdSelArt(${d.a})">${esc(ART[d.a])}</span>`,esc(HOT[d.h]),esc(FORN[d.f]),
    fmt2.format(d.q),eur2(d.v),eur2(d.p),`<span class="minp">${eur2(d.pmin)}</span>`,
    `<small>${esc(d.onde)}</small>`,`<b>${eur2(d.save)}</b>`]);
  document.getElementById('cd_tPop').innerHTML=
    `<div class="note" style="margin-bottom:8px">Poupança potencial total identificada: <b style="color:var(--pos)">${eur(totSave)}</b> · ${fmt0.format(r.det.length)} situações (top 80 abaixo)</div>`+
    tabela([{t:'Artigo'},{t:'Unidade'},{t:'Fornecedor'},{t:'Qtd',n:1},{t:'Valor',n:1},{t:'P. pago',n:1},{t:'Melhor P.',n:1},{t:'Onde'},{t:'Poupança',n:1}],linhas,{maxH:420});
}
window.cdSelArt=a=>{sub2.precos.art=a;drawPrecoDetail();const e=document.getElementById('cd_pDet');if(e&&e.scrollIntoView)e.scrollIntoView({behavior:'smooth',block:'nearest'});};
function drawPrecoLista(){
  const s=sub2.precos;const q=s.q.toLowerCase();
  const elx=document.getElementById('cd_pLista');
  if(q.length<3){elx.innerHTML='<div class="note">Escreve pelo menos 3 letras para pesquisar entre '+fmt0.format(ART.length-1)+' artigos.</div>';return;}
  const hits=[];
  for(let i=1;i<ART.length&&hits.length<40;i++)if(ART[i].toLowerCase().includes(q))hits.push(i);
  elx.innerHTML=hits.length?('<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">'+
    hits.map(i=>`<button class="btn" style="background:#eef1f4;color:var(--navy);font-weight:500" onclick="cdSelArt(${i})">${esc(ART[i])}</button>`).join('')+'</div>'):'<div class="note">Sem resultados.</div>';
}
function drawPrecoDetail(){
  const a=sub2.precos.art;if(!a)return;
  const lst=rowsP().filter(r=>r[0]===a);
  if(!lst.length){document.getElementById('cd_pDet').innerHTML='<div class="note">Sem compras deste artigo no filtro atual.</div>';return;}
  let totV=0,totQ=0,pmin=Infinity,pmax=0;
  const rows=lst.map(r=>{const p=r[3]/r[4];totV+=r[3];totQ+=r[4];if(p<pmin)pmin=p;if(p>pmax)pmax=p;
    return {h:r[2],f:r[1],v:r[3],q:r[4],p};}).sort((x,y)=>x.p-y.p);
  document.getElementById('cd_pDet').innerHTML=`
    <h3 style="margin:10px 0">${esc(ART[a])}</h3>
    <div class="grid kpis" style="margin-bottom:10px">
      <div class="kpi"><div class="l">Valor total</div><div class="v">${eur(totV)}</div></div>
      <div class="kpi"><div class="l">Quantidade</div><div class="v">${fmt2.format(totQ)}</div></div>
      <div class="kpi"><div class="l">Preço médio</div><div class="v">${eur2(totV/totQ)}</div></div>
      <div class="kpi"><div class="l">Amplitude</div><div class="v" style="font-size:16px"><span class="minp">${eur2(pmin)}</span> – <span class="maxp">${eur2(pmax)}</span></div>
        <div class="s">${pmin>0?'rácio '+fmt2.format(pmax/pmin)+'×':''}</div></div>
    </div>
    ${tabela([{t:'Unidade'},{t:'Fornecedor'},{t:'Qtd',n:1},{t:'Valor',n:1},{t:'Preço médio',n:1}],
      rows.map(x=>[esc(HOT[x.h]),esc(FORN[x.f]),fmt2.format(x.q),eur2(x.v),
        `<span class="${x.p<=pmin*1.001?'minp':(x.p>=pmax*.999?'maxp':'')}">${eur2(x.p)}</span>`]),{maxH:340})}
    <div class="note">Preços médios do período completo do ficheiro (sem corte por mês). Diferenças muito grandes podem indicar unidades de medida diferentes (ex.: un vs. caixa).</div>`;
}

/* ============ TRANSFERÊNCIAS ============ */
function rTransf(el){
  // X: 0 tipo(1 entrada/2 saida), 1 orig, 2 dest, 3 mes, 4 fam, 5 grp, 6 valor
  // usar apenas ENTRADAS (valores positivos no recetor) para fluxos, evitando dupla contagem
  const fl=[];
  for(const r of CD.X){
    if(r[0]!==1)continue;
    if(r[3]<ST.mesDe||r[3]>ST.mesAte)continue;
    fl.push(r);
  }
  const porFluxo=new Map(),recebe=new Map(),envia=new Map(),porGrp=new Map();
  let tot=0;
  for(const r of fl){
    const k=r[1]+'|'+r[2];
    porFluxo.set(k,(porFluxo.get(k)||0)+r[6]);
    recebe.set(r[2],(recebe.get(r[2])||0)+r[6]);
    envia.set(r[1],(envia.get(r[1])||0)+r[6]);
    porGrp.set(r[5],(porGrp.get(r[5])||0)+r[6]);
    tot+=r[6];
  }
  const mm=mesesAtivos();
  const serie=serieMensal(fl,3,6);
  el.innerHTML=`
  <div class="grid kpis" style="margin-bottom:14px">
    <div class="kpi"><div class="l">Valor transferido</div><div class="v">${eur(tot)}</div><div class="s">entradas registadas nas unidades</div></div>
    <div class="kpi"><div class="l">Fluxos distintos</div><div class="v">${porFluxo.size}</div><div class="s">pares origem → destino</div></div>
    <div class="kpi"><div class="l">Unidades recetoras</div><div class="v">${recebe.size}</div></div>
  </div>
  <div class="grid row32" style="margin-bottom:14px">
    <div class="card"><h3>Evolução mensal das transferências</h3><div class="chartbox"><canvas id="cd_cTm"></canvas></div></div>
    <div class="card"><h3>O que é transferido (top grupos)</h3><div id="cd_tTg"></div></div>
  </div>
  <div class="grid row2">
    <div class="card"><h3>Maiores fluxos origem → destino</h3><div id="cd_tTf"></div></div>
    <div class="card"><h3>Balanço por unidade</h3><div id="cd_tTb"></div></div>
  </div>
  <div class="note" style="margin-top:10px">Nota: o filtro global de hotel/região não se aplica a este separador (os fluxos envolvem sempre duas unidades); o filtro de meses aplica-se.</div>`;
  plot('cd_cTm',{type:'bar',data:{labels:mm.map(mesLbl),datasets:[{data:mm.map(i=>serie[i]),backgroundColor:'#2563eb',borderRadius:5}]},
    options:{maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>eur(c.parsed.y)}}},scales:{y:{ticks:{callback:v=>eurAxis(v)}}}}});
  const tg=topN(porGrp,15),mxg=tg.length?tg[0][1]:0;
  document.getElementById('cd_tTg').innerHTML=tabela([{t:'Grupo'},{t:'Valor',n:1},{t:''}],
    tg.map(x=>[esc(GRP[x[0]]),eur(x[1]),barraPct(x[1],mxg)]),{maxH:300});
  const tf=topN(porFluxo,60);
  document.getElementById('cd_tTf').innerHTML=tabela([{t:'Origem'},{t:'Destino'},{t:'Valor',n:1},{t:'%',n:1}],
    tf.map(([k,v])=>{const[o,d]=k.split('|');return[esc(HOT[+o]),esc(HOT[+d]),eur(v),tot?pct(v/tot):''];}),{maxH:430});
  const todos=new Set([...recebe.keys(),...envia.keys()]);
  const bal=[...todos].map(h=>({h,r:recebe.get(h)||0,e:envia.get(h)||0})).sort((a,b)=>(b.r+b.e)-(a.r+a.e));
  document.getElementById('cd_tTb').innerHTML=tabela([{t:'Unidade'},{t:'Recebe',n:1},{t:'Envia',n:1},{t:'Líquido',n:1}],
    bal.map(x=>{const liq=x.r-x.e;return[esc(HOT[x.h]),eur(x.r),eur(x.e),
      `<span class="pill ${liq>0?'neg':'pos'}">${liq>0?'+':''}${eur(liq)}</span>`];}),{maxH:430});
}

/* ============ COMPARAR ============ */
function rComp(el){
  const s=sub2.comp||(sub2.comp={sel:[]});
  const g=rowsG();
  const porHotel=topN(somaPor(g,r=>r[1],7),999);
  if(!s.sel.length)s.sel=porHotel.slice(0,3).map(x=>x[0]);
  el.innerHTML=`
  <div class="card" style="margin-bottom:14px">
    <h3>Comparar unidades <small>— escolhe 2 a 4</small></h3>
    <div class="inline">
      ${[0,1,2,3].map(i=>`<select class="inp" style="width:auto" id="cd_cmpS${i}">
        <option value="0">—</option>
        ${porHotel.map(x=>`<option value="${x[0]}" ${s.sel[i]===x[0]?'selected':''}>${esc(HOT[x[0]])}</option>`).join('')}
      </select>`).join('')}
      <button class="btn" id="cd_cmpGo">Comparar</button>
    </div>
  </div>
  <div id="cd_cmpOut"></div>`;
  document.getElementById('cd_cmpGo').onclick=()=>{
    s.sel=[0,1,2,3].map(i=>+document.getElementById('cd_cmpS'+i).value).filter(v=>v>0);
    drawComp();
  };
  drawComp();
}
function drawComp(){
  const s=sub2.comp;const sel=s.sel;
  const out=document.getElementById('cd_cmpOut');
  if(sel.length<2){out.innerHTML='<div class="card note">Escolhe pelo menos duas unidades.</div>';return;}
  const g=rowsG();
  const mm=mesesAtivos();
  const fams=topN(somaPor(g.filter(r=>sel.includes(r[1])),r=>r[4],7),10).map(x=>x[0]);
  out.innerHTML=`
  <div class="grid row2" style="margin-bottom:14px">
    <div class="card"><h3>Custo por família</h3><div class="chartbox tall"><canvas id="cd_cCmp1"></canvas></div></div>
    <div class="card"><h3>Evolução mensal</h3><div class="chartbox tall"><canvas id="cd_cCmp2"></canvas></div></div>
  </div>
  <div class="card"><h3>Tabela comparativa</h3><div id="cd_tCmp"></div></div>`;
  const dsF=sel.map((h,i)=>({label:HOT[h],data:fams.map(f=>{let t=0;for(const r of g)if(r[1]===h&&r[4]===f)t+=r[7];return t;}),backgroundColor:cor(i)}));
  plot('cd_cCmp1',{type:'bar',data:{labels:fams.map(f=>FAM[f]),datasets:dsF},
    options:{maintainAspectRatio:false,plugins:{tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${eur(c.parsed.y)}`}}},scales:{y:{ticks:{callback:v=>eurAxis(v)}},x:{ticks:{font:{size:10}}}}}});
  const dsM=sel.map((h,i)=>{const sr=serieMensal(g,2,7,r=>r[1]===h);
    return{label:HOT[h],data:mm.map(x=>sr[x]),borderColor:cor(i),backgroundColor:cor(i),tension:.3,pointRadius:3};});
  plot('cd_cCmp2',{type:'line',data:{labels:mm.map(mesLbl),datasets:dsM},
    options:{maintainAspectRatio:false,plugins:{tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${eur(c.parsed.y)}`}}},scales:{y:{ticks:{callback:v=>eurAxis(v)}}}}});
  const linhas=[];
  const totH=sel.map(h=>{let t=0;for(const r of g)if(r[1]===h)t+=r[7];return t;});
  linhas.push(['<b>TOTAL</b>',...totH.map(v=>`<b>${eur(v)}</b>`)]);
  for(const f of fams){
    linhas.push([esc(FAM[f]),...sel.map((h,i)=>{let t=0;for(const r of g)if(r[1]===h&&r[4]===f)t+=r[7];
      return eur(t)+(totH[i]?` <small style="color:var(--mut)">${pct(t/totH[i])}</small>`:'');})]);
  }
  document.getElementById('cd_tCmp').innerHTML=tabela([{t:'Família'},...sel.map(h=>({t:HOT[h],n:1}))],linhas,{maxH:430});
}

/* ============ HOMÓLOGO (ano vs ano) ============ */
function anosDisponiveis(){return [...new Set(MESES.map(m=>Math.floor(m/100)))].sort();}
function rAnos(el){
  const anos=anosDisponiveis();
  if(anos.length<2){
    el.innerHTML=`<div class="card"><h3>Comparação homóloga</h3>
      <div class="note">Este dashboard só contém dados de <b>${anos[0]}</b>. Para ativar a comparação entre anos, gera um novo dashboard no Conversor com um extrato que inclua os dois anos (ex.: 2025 e 2026) — pode ser um único ficheiro com tudo, ou um XLSX com uma folha por ano.</div></div>`;
    return;
  }
  const s=sub2.anos||(sub2.anos={a:anos[anos.length-2],b:anos[anos.length-1],comuns:true,fam:0,meses:new Set()});
  if(!s.meses)s.meses=new Set();
  // Garante anos válidos e distintos (evita "2026 vs 2026" com homólogo a zero).
  s.a = Number(s.a); s.b = Number(s.b);
  if(!anos.includes(s.a)) s.a = anos[anos.length-2];
  if(!anos.includes(s.b)) s.b = anos[anos.length-1];
  if(s.a === s.b){ s.a = anos[anos.length-2]; s.b = anos[anos.length-1]; if(s.a===s.b) s.a = anos[0]; }
  // Meses que existem em pelo menos um dos dois anos escolhidos
  const mesesDisp=[...new Set(MESES.filter(m=>{const y=Math.floor(m/100);return y===s.a||y===s.b;}).map(m=>m%100))].sort((x,y)=>x-y);
  // Limpa da seleção meses que já não existem
  [...s.meses].forEach(m=>{if(!mesesDisp.includes(m))s.meses.delete(m);});
  const todosMeses=s.meses.size===0;
  const chips=mesesDisp.map(m=>`<label class="cd-mes-chip ${s.meses.has(m)?'on':''}" data-m="${m}" style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border:1px solid var(--border-2);border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;user-select:none;transition:all .15s;${s.meses.has(m)?'background:var(--gold);color:var(--navy);border-color:var(--gold)':'color:var(--mut)'}">${MNOMES[m]}</label>`).join('');
  el.innerHTML=`
  <div class="card" style="margin-bottom:14px">
    <div class="inline" style="margin-bottom:10px">
      <label>Comparar</label><select id="cd_yA">${anos.map(a=>`<option value="${a}" ${a===s.a?'selected':''}>${a}</option>`).join('')}</select>
      <label>com</label><select id="cd_yB">${anos.map(a=>`<option value="${a}" ${a===s.b?'selected':''}>${a}</option>`).join('')}</select>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="cd_yComuns" ${s.comuns?'checked':''}> Apenas meses comuns aos dois anos</label>
      <button class="btn gold" id="cd_yExp">Exportar CSV</button>
    </div>
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding-top:10px;border-top:1px solid var(--border-2)">
      <span style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--mut)">Meses</span>
      <button class="btn" id="cd_yMesAll" style="padding:4px 12px;font-size:11px;${todosMeses?'background:var(--surface-2);border-color:var(--border)':''}">Todos</button>
      <div id="cd_yMesChips" style="display:flex;gap:6px;flex-wrap:wrap">${chips}</div>
    </div>
    <div class="note">Aplica os filtros de âmbito, região e hotel do cabeçalho. O intervalo De/Até <b>não</b> se aplica aqui — a comparação usa os meses selecionados dos anos escolhidos. Sem meses selecionados = todos${s.comuns?' os comuns':''}.</div>
  </div>
  <div id="cd_yOut"></div>`;
  const upd=()=>{s.a=+document.getElementById('cd_yA').value;s.b=+document.getElementById('cd_yB').value;
    s.comuns=document.getElementById('cd_yComuns').checked;s.fam=0;rAnos(el);};
  ['cd_yA','cd_yB','cd_yComuns'].forEach(id=>document.getElementById(id).onchange=upd);
  document.getElementById('cd_yMesAll').onclick=()=>{s.meses.clear();s.fam=0;rAnos(el);};
  document.getElementById('cd_yMesChips').querySelectorAll('.cd-mes-chip').forEach(chip=>{
    chip.onclick=()=>{const m=+chip.dataset.m;if(s.meses.has(m))s.meses.delete(m);else s.meses.add(m);s.fam=0;rAnos(el);};
  });
  document.getElementById('cd_yExp').onclick=()=>{
    const r=calcAnos();
    exportCSV(`homologo_${s.a}_vs_${s.b}.csv`,
      ['Unidade',String(s.a),String(s.b),'Variação '+cdSym(),'Variação %'],
      r.hoteis.map(x=>[HOT[x.k],x.va.toFixed(2),x.vb.toFixed(2),(x.vb-x.va).toFixed(2),x.va?((x.vb-x.va)/Math.abs(x.va)*100).toFixed(1):'']));
  };
  drawAnos();
}
function calcAnos(){
  const s=sub2.anos;
  const mmAno=ano=>new Set(MESES.filter(m=>Math.floor(m/100)===ano).map(m=>m%100));
  const setA=mmAno(s.a),setB=mmAno(s.b);
  let validos;
  if(s.comuns){validos=new Set([...setA].filter(m=>setB.has(m)));}
  else{validos=new Set([...setA,...setB]);}
  // Restrição opcional a meses escolhidos pelo utilizador
  if(s.meses&&s.meses.size){validos=new Set([...validos].filter(m=>s.meses.has(m)));}
  const pert=(r)=>{ // devolve 'a' | 'b' | null para uma linha G
    const mv=MESES[r[2]],ano=Math.floor(mv/100),mes=mv%100;
    if(!validos.has(mes))return null;
    if(ano===s.a)return 'a';if(ano===s.b)return 'b';return null;
  };
  const fam=new Map(),hot=new Map(),mesA=new Array(13).fill(0),mesB=new Array(13).fill(0);
  const grp=new Map(); // só para a família selecionada
  let ta=0,tb=0;
  for(const r of CD.G){
    if(ST.ambito==='compras'&&r[0]!==0)continue;
    if(ST.hotel&&r[1]!==ST.hotel)continue;
    if(ST.regiao&&regiaoDe(r[1])!==ST.regiao)continue;
    const lado=pert(r);if(!lado)continue;
    const v=r[7],mes=MESES[r[2]]%100;
    const add=(mp,k)=>{let o=mp.get(k);if(!o){o={va:0,vb:0};mp.set(k,o);}if(lado==='a')o.va+=v;else o.vb+=v;};
    add(fam,r[4]);add(hot,r[1]);
    if(s.fam&&r[4]===s.fam)add(grp,r[6]);
    if(lado==='a'){ta+=v;mesA[mes]+=v;}else{tb+=v;mesB[mes]+=v;}
  }
  const ord=mp=>[...mp.entries()].map(([k,o])=>({k,va:o.va,vb:o.vb}))
    .sort((x,y)=>Math.abs(y.vb-y.va)-Math.abs(x.vb-x.va));
  return {ta,tb,mesA,mesB,validos,fams:ord(fam),hoteis:ord(hot),grps:ord(grp)};
}
window.cdAnosFam=f=>{sub2.anos.fam=f;drawAnos();};
function drawAnos(){
  const s=sub2.anos;let r=calcAnos();
  // Auto-correção: se o ano-base (a) vier vazio mas houver outro ano com dados diferente de b,
  // escolhe esse como homólogo e recalcula (evita "ano vs mesmo ano" ou coluna a zero).
  if((!r.ta || Math.abs(r.ta)<0.005) && r.tb && Math.abs(r.tb)>0.005){
    const anosD = anosDisponiveis().filter(y=>y!==s.b);
    if(anosD.length){ s.a = anosD[anosD.length-1]; r = calcAnos(); }
  }
  const dif=r.tb-r.ta,vp=r.ta?dif/Math.abs(r.ta):null;
  const mm=[...r.validos].sort((a,b)=>a-b);
  const pilV=(va,vb)=>{const d=vb-va;if(Math.abs(va)<0.005)return '<span class="pill mut">novo</span>';
    const p=d/Math.abs(va);return `<span class="pill ${d>0?'neg':'pos'}">${d>0?'+':''}${pct(p)}</span>`;};
  document.getElementById('cd_yOut').innerHTML=`
  <div class="grid kpis" style="margin-bottom:14px">
    <div class="kpi"><div class="l">${s.a}</div><div class="v">${eur(r.ta)}</div><div class="s">${mm.length} meses</div></div>
    <div class="kpi"><div class="l">${s.b}</div><div class="v">${eur(r.tb)}</div><div class="s">${mm.length} meses</div></div>
    <div class="kpi"><div class="l">Variação</div><div class="v" style="color:${dif>0?'var(--neg)':'var(--pos)'}">${dif>0?'+':''}${eur(dif)}</div>
      <div class="s">${vp===null?'':(dif>0?'+':'')+pct(vp)+' vs '+s.a}</div></div>
  </div>
  <div class="card" style="margin-bottom:14px"><h3>Evolução mensal — ${s.a} vs ${s.b}</h3>
    <div class="chartbox"><canvas id="cd_cYm"></canvas></div></div>
  <div class="grid row2">
    <div class="card"><h3>Por família <small>(clica para ver grupos)</small></h3><div id="cd_tYf"></div><div id="cd_tYg"></div></div>
    <div class="card"><h3>Por unidade</h3><div id="cd_tYh"></div></div>
  </div>`;
  plot('cd_cYm',{type:'bar',data:{labels:mm.map(m=>MNOMES[m]),datasets:[
      {label:String(s.a),data:mm.map(m=>r.mesA[m]),backgroundColor:'#94a3b8',borderRadius:4},
      {label:String(s.b),data:mm.map(m=>r.mesB[m]),backgroundColor:'#2563eb',borderRadius:4}]},
    options:{maintainAspectRatio:false,plugins:{tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${eur(c.parsed.y)}`}}},
      scales:{y:{ticks:{callback:v=>eurAxis(v)}}}}});
  const linF=r.fams.map(x=>[
    `<span class="clk" onclick="cdAnosFam(${x.k})">${esc(FAM[x.k])}</span>`,
    eur(x.va),eur(x.vb),`<b>${x.vb-x.va>0?'+':''}${eur(x.vb-x.va)}</b>`,pilV(x.va,x.vb)]);
  document.getElementById('cd_tYf').innerHTML=tabela(
    [{t:'Família'},{t:s.a,n:1},{t:s.b,n:1},{t:'Δ '+cdSym(),n:1},{t:'Δ %',n:1}],linF,{maxH:340});
  if(s.fam){
    const linG=r.grps.slice(0,60).map(x=>[esc(GRP[x.k]),eur(x.va),eur(x.vb),
      `<b>${x.vb-x.va>0?'+':''}${eur(x.vb-x.va)}</b>`,pilV(x.va,x.vb)]);
    document.getElementById('cd_tYg').innerHTML=
      `<h3 style="margin-top:14px">Grupos — ${esc(FAM[s.fam])}</h3>`+
      tabela([{t:'Grupo'},{t:s.a,n:1},{t:s.b,n:1},{t:'Δ '+cdSym(),n:1},{t:'Δ %',n:1}],linG,{maxH:300});
  }else document.getElementById('cd_tYg').innerHTML='';
  const linH=r.hoteis.map(x=>[esc(HOT[x.k]),eur(x.va),eur(x.vb),
    `<b>${x.vb-x.va>0?'+':''}${eur(x.vb-x.va)}</b>`,pilV(x.va,x.vb)]);
  document.getElementById('cd_tYh').innerHTML=tabela(
    [{t:'Unidade'},{t:s.a,n:1},{t:s.b,n:1},{t:'Δ '+cdSym(),n:1},{t:'Δ %',n:1}],linH,{maxH:700});
}

/* ============ COMENTÁRIOS (análise narrativa por unidade) ============ */
const CM_FB=/^(COMIDAS|BEBIDAS)$/;
const CM_ILHAS=['SANTA CRUZ','COLLECTION S. MIGUEL'];
function rComent(el){
  const s=sub2.coment||(sub2.coment={hotel:0,minQ:5,desvPct:15,minImp:250,maxP:250});
  el.innerHTML=`
  <div class="card" style="margin-bottom:14px">
    <h3>Análise comentada por unidade <small>— gerada automaticamente a partir dos movimentos</small></h3>
    <div class="inline">
      <label>Unidade</label><select id="cd_cmHotel"><option value="0">Todas (portefólio)</option></select>
      <label>Qtd mín.</label><input type="number" id="cd_cmMinQ" value="${s.minQ}" min="1">
      <label>Desvio preço ≥</label><input type="number" id="cd_cmDesv" value="${s.desvPct}" min="5" step="5"> %
      <label>Impacto mín.</label><input type="number" id="cd_cmImp" value="${s.minImp}" min="0" step="50"> ${cdSym()}
      <label>Preço unit. máx.</label><input type="number" id="cd_cmMaxP" value="${s.maxP}" min="10" step="50"> ${cdSym()}
      <button class="btn" id="cd_cmGo">Gerar</button>
      <button class="btn gold" id="cd_cmExp">Exportar TXT</button>
    </div>
    <div class="note">Desvio mensal: contra o mês homólogo quando existe (corrige sazonalidade); sem homólogo, contra a média ajustada à mediana do portefólio. Meses finais incompletos são detetados e excluídos da análise mensal. <b>Análise de preços restrita a COMIDAS e BEBIDAS</b> (artigos genuinamente comparáveis), benchmark pela mediana dos preços entre unidades, diferenças >3× ignoradas, top 10 por impacto em cada família. Indicativo — confirmar condições, formatos e unidades de medida antes de agir.</div>
  </div>
  <div id="cd_cmOut"></div>`;
  const fh=document.getElementById('cd_cmHotel');
  const g=rowsG();
  const porHotel=topN(somaPor(g,r=>r[1],7),999);
  fh.innerHTML='<option value="0">Todas (portefólio)</option>'+porHotel.map(x=>`<option value="${x[0]}" ${s.hotel===x[0]?'selected':''}>${esc(HOT[x[0]])}</option>`).join('');
  fh.value=String(s.hotel||0);
  const go=()=>{s.hotel=+fh.value;s.minQ=+document.getElementById('cd_cmMinQ').value||5;
    s.desvPct=+document.getElementById('cd_cmDesv').value||15;s.minImp=+document.getElementById('cd_cmImp').value||0;
    s.maxP=+document.getElementById('cd_cmMaxP').value||250;
    drawComent();};
  document.getElementById('cd_cmGo').onclick=go;
  fh.onchange=go;
  document.getElementById('cd_cmExp').onclick=()=>{
    const txt=cmTextoExport();
    const b=new Blob(['\uFEFF'+txt],{type:'text/plain;charset=utf-8'});
    const aEl=document.createElement('a');aEl.href=URL.createObjectURL(b);
    aEl.download='comentarios_custos.txt';aEl.click();setTimeout(()=>URL.revokeObjectURL(aEl.href),5000);
  };
  drawComent();
}

function cmPrecos(){
  // benchmark F&B: mediana e mínimo por artigo (q>=minQ); só COMIDAS e BEBIDAS
  const s=sub2.coment;
  const artFam=cmArtFam();
  const porHotel=new Map();
  for(const r of CD.P){
    if(!CM_FB.test(FAM[artFam.get(r[0])]||''))continue;
    let ph=porHotel.get(r[2]);if(!ph){ph=new Map();porHotel.set(r[2],ph);}
    let o=ph.get(r[0]);if(!o){o={v:0,q:0};ph.set(r[0],o);}
    o.v+=r[3];o.q+=r[4];
  }
  const porArt=new Map();
  for(const[h,ph]of porHotel)for(const[art,o]of ph){
    if(o.q<s.minQ)continue;
    let pa=porArt.get(art);if(!pa){pa=[];porArt.set(art,pa);}
    pa.push({h,p:o.v/o.q});
  }
  const bench=new Map();
  for(const[art,lst]of porArt){
    if(lst.length<2)continue;
    const ord=lst.filter(x=>x.p>0).sort((a,b)=>a.p-b.p);
    if(ord.length<2)continue;
    const med=ord[Math.floor((ord.length-1)/2)].p;
    if(med>s.maxP)continue;
    bench.set(art,{med,min:ord[0].p,onde:HOT[ord[0].h],n:ord.length});
  }
  return {bench,porHotel,artFam};
}

function cmAnaliseHotel(h,pc,ctx){
  const s=sub2.coment;
  const mRef=ctx&&ctx.mesRef!==undefined?ctx.mesRef:ST.mesAte;
  const g=rowsG().filter(r=>r[1]===h);
  let tot=0;for(const r of g)tot+=r[7];
  const serie=serieMensal(g,2,7);
  const nM=mesesAtivos().length;
  const ult=serie[mRef];
  let med=null,varM=null;
  if(mRef>ST.mesDe){
    let soma=0;for(let i=ST.mesDe;i<mRef;i++)soma+=serie[i];
    med=soma/(mRef-ST.mesDe);
    if(Math.abs(med)>1)varM=(ult-med)/Math.abs(med);
  }
  // homólogo mensal (série completa)
  let varHom=null,homDe=null,homVal=null;
  {
    const serieFull=new Array(MESES.length).fill(0);
    for(const r of CD.G){
      if(ST.ambito==='compras'&&r[0]!==0)continue;
      if(r[1]!==h)continue;
      serieFull[r[2]]+=r[7];
    }
    const mv=MESES[mRef];
    const alvo=(Math.floor(mv/100)-1)*100+(mv%100);
    const idx=MESES.indexOf(alvo);
    if(idx>=0){homVal=serieFull[idx];homDe=idx;
      if(Math.abs(homVal)>1)varHom=(ult-homVal)/Math.abs(homVal);}
  }
  // mix de famílias vs portefólio
  const mix=[];
  if(ctx&&ctx.pesoPort&&tot>0){
    const pf=somaPor(g,r=>r[4],7);
    for(const[f,v]of pf){
      const pu=v/tot,pp=ctx.pesoPort.get(f)||0;
      if(Math.abs(pu-pp)>=0.04&&v>5000)mix.push({f,pu,pp,v});
    }
    mix.sort((a,b)=>Math.abs(b.pu-b.pp)-Math.abs(a.pu-a.pp));
  }
  // desvios por grupo no mês de referência
  const mapa=new Map();
  for(const r of g){const k=r[4]+'|'+r[6];
    if(!mapa.has(k))mapa.set(k,new Array(MESES.length).fill(0));
    mapa.get(k)[r[2]]+=r[7];}
  const desv=[];
  if(mRef>ST.mesDe){
    const nAnt=mRef-ST.mesDe;
    for(const[k,arr]of mapa){
      let soma=0;for(let i=ST.mesDe;i<mRef;i++)soma+=arr[i];
      const m=soma/nAnt,v=arr[mRef],d=v-m;
      if(Math.abs(d)<Math.max(500,s.minImp))continue;
      desv.push({k,v,m,d});
    }
    desv.sort((a,b)=>Math.abs(b.d)-Math.abs(a.d));
  }
  // homólogo de período: famílias e grupos
  let yoy=null;
  const anos=anosDisponiveis();
  if(anos.length>=2){
    const a0=anos[anos.length-2],a1=anos[anos.length-1];
    const mm=ano=>new Set(MESES.filter(m=>Math.floor(m/100)===ano).map(m=>m%100));
    const comuns=new Set([...mm(a0)].filter(x=>mm(a1).has(x)));
    let va=0,vb=0;const famD=new Map(),grpD=new Map();
    for(const r of CD.G){
      if(ST.ambito==='compras'&&r[0]!==0)continue;
      if(r[1]!==h)continue;
      const mv=MESES[r[2]],ano=Math.floor(mv/100);
      if(!comuns.has(mv%100))continue;
      const sgn=ano===a1?1:(ano===a0?-1:0);
      if(!sgn)continue;
      if(sgn>0)vb+=r[7];else va+=r[7];
      famD.set(r[4],(famD.get(r[4])||0)+sgn*r[7]);
      grpD.set(r[6],(grpD.get(r[6])||0)+sgn*r[7]);
    }
    const fams=[...famD.entries()].sort((x,y)=>Math.abs(y[1])-Math.abs(x[1])).slice(0,3);
    const grpsUp=[...grpD.entries()].filter(x=>x[1]>2000).sort((x,y)=>y[1]-x[1]).slice(0,4);
    yoy={a0,a1,va,vb,fams,grpsUp,nC:comuns.size};
  }
  // transferências recebidas (informativo; meses do filtro)
  let transfRec=0;
  for(const r of CD.X){
    if(r[0]!==1||r[2]!==h)continue;
    if(r[3]<ST.mesDe||r[3]>ST.mesAte)continue;
    transfRec+=r[6];
  }
  // fornecedores novos relevantes
  const novos=[];
  {
    const porForn=new Map();
    const anoRec=Math.floor(MESES[MESES.length-1]/100);
    const corte=anos.length>=2?MESES.findIndex(m=>Math.floor(m/100)===anoRec):Math.min(2,MESES.length-1);
    for(const r of CD.F){
      if(r[0]!==h)continue;
      let o=porForn.get(r[2]);if(!o){o={antes:0,depois:0};porForn.set(r[2],o);}
      if(r[1]<corte)o.antes+=Math.abs(r[4]);else o.depois+=r[4];
    }
    for(const[fo,o]of porForn)if(o.antes<500&&o.depois>=10000)novos.push({fo,v:o.depois});
    novos.sort((a,b)=>b.v-a.v);
  }
  // preços F&B vs mediana do grupo (caros separados por família p/ top10)
  const caros=[],melhores=[];
  const ph=pc.porHotel.get(h);
  let totFB=0;
  if(ph)for(const[art,o]of ph){
    totFB+=o.v;
    if(o.q<s.minQ)continue;
    const b=pc.bench.get(art);if(!b)continue;
    const p=o.v/o.q;
    if(p<=0)continue;
    if(p<=b.min*1.001){melhores.push({art,p,q:o.q,v:o.v});continue;}
    if(p>b.med*3)continue;
    const dMed=(p-b.med)/b.med;
    if(dMed*100<s.desvPct)continue;
    const sobre=(p-b.med)*o.q;
    const save=p>b.min?(p-b.min)*o.q:0;
    if(sobre<s.minImp&&save<s.minImp)continue;
    caros.push({art,fam:FAM[pc.artFam.get(art)]||'',p,med:b.med,min:b.min,onde:b.onde,q:o.q,sobre,save});
  }
  caros.sort((a,b)=>b.sobre-a.sobre);
  melhores.sort((a,b)=>b.v-a.v);
  const carosC=caros.filter(c=>c.fam==='COMIDAS').slice(0,10);
  const carosB=caros.filter(c=>c.fam==='BEBIDAS').slice(0,10);
  // fornecedores: concentração
  const f=rowsF().filter(r=>r[0]===h);
  const pf=topN(somaPor(f,r=>r[2],4),3);
  let totF=0;for(const r of f)totF+=r[4];
  // severidade
  let sev='estável';
  const sobreTot=caros.reduce((a,c)=>a+c.sobre,0);
  const sobrePct=totFB>0?sobreTot/totFB:0;
  let sinal=null,impSinal=0;
  if(varHom!==null){sinal=varHom;impSinal=ult-homVal;}
  else if(varM!==null){sinal=(ctx&&ctx.varMed!==null&&ctx.varMed!==undefined)?varM-ctx.varMed:varM;impSinal=ult-med;}
  if((sinal!==null&&((sinal>0.35&&impSinal>50000)||(sinal>1.0&&impSinal>15000)))||(sobrePct>0.02&&sobreTot>8000))sev='crítico';
  else if((sinal!==null&&sinal>0.20&&impSinal>Math.max(8000,0.05*Math.abs(med||ult)))||(sinal!==null&&Math.abs(sinal)>0.30&&Math.abs(impSinal)>15000)||(sobrePct>0.005&&sobreTot>1000))sev='atenção';
  else if(sinal!==null&&sinal<-0.12&&impSinal<-8000)sev='positivo';
  return {h,tot,nM,mRef,ult,med,varM,varHom,homVal,homDe,mix,desv,yoy,transfRec,novos,
    caros,carosC,carosB,melhores,pf,totF,totFB,sev,sobreTot,sobrePct,parcial:ctx&&ctx.parcial};
}

function cmFrases(a){
  const F=[];
  const nome=HOT[a.h];
  F.push(`No período filtrado (${mesLbl(ST.mesDe)}–${mesLbl(ST.mesAte)}), ${nome} acumula ${eur(a.tot)} em ${ST.ambito==='compras'?'compras':'compras e transferências'}, uma média de ${eur(a.tot/Math.max(1,a.nM))}/mês${a.transfRec>500?`; recebeu ainda ${eur(a.transfRec)} em transferências internas (${a.tot>0?pct(a.transfRec/(a.tot+a.transfRec)):''} do consumo total, sinal de dependência do economato central)`:''}.`);
  const refNota=a.parcial?` (${mesLbl(ST.mesAte)} aparenta estar incompleto no extrato; a análise mensal reporta-se a ${mesLbl(a.mRef)})`:'';
  if(a.varHom!==null){
    const d=a.ult-a.homVal;
    F.push(`${mesLbl(a.mRef)} fechou em ${eur(a.ult)}, ${pct(Math.abs(a.varHom))} ${a.varHom>0?'acima':'abaixo'} do mês homólogo (${mesLbl(a.homDe)}: ${eur(a.homVal)}) — ${d>0?'+':''}${eur(d)}${refNota}.`+
      (a.varM!==null?` Face à média dos meses anteriores está ${pct(Math.abs(a.varM))} ${a.varM>0?'acima':'abaixo'}, dentro do padrão sazonal habitual.`:''));
  }else if(a.varM!==null){
    F.push(`${mesLbl(a.mRef)} fechou em ${eur(a.ult)}, ${pct(Math.abs(a.varM))} ${a.varM>0?'acima':'abaixo'} da média dos meses anteriores (${eur(a.med)})${refNota}. Sem mês homólogo no ficheiro, parte desta variação pode ser sazonal.`);
  }
  if(a.yoy&&Math.abs(a.yoy.va)>1){
    const d=a.yoy.vb-a.yoy.va,p=d/Math.abs(a.yoy.va);
    let fr=`No acumulado homólogo (${a.yoy.nC} meses, ${a.yoy.a0} vs ${a.yoy.a1}), os custos ${d>0?'sobem':'descem'} ${pct(Math.abs(p))} (${d>0?'+':''}${eur(d)}; ${eur(a.yoy.va)} → ${eur(a.yoy.vb)}).`;
    if(a.yoy.fams.length)fr+=` Famílias que mais explicam: ${a.yoy.fams.map(x=>`${FAM[x[0]]} (${x[1]>0?'+':''}${eur(x[1])})`).join(', ')}.`;
    if(a.yoy.grpsUp.length)fr+=` Em detalhe, os grupos que mais crescem: ${a.yoy.grpsUp.map(x=>`${GRP[x[0]]} (+${eur(x[1])})`).join(', ')}.`;
    F.push(fr);
  }
  if(a.mix.length){
    F.push(`Estrutura de custos atípica face ao portefólio: ${a.mix.slice(0,2).map(m=>`${FAM[m.f]} pesa ${pct(m.pu)} dos custos da unidade vs ${pct(m.pp)} no grupo`).join('; ')} — vale a pena perceber se é perfil da operação ou desvio.`);
  }
  if(a.desv.length){
    const sub=a.desv.filter(d=>d.d>0).slice(0,3),des=a.desv.filter(d=>d.d<0).slice(0,2);
    if(sub.length)F.push(`Maiores subidas de ${mesLbl(a.mRef)} por grupo: ${sub.map(d=>{const[f,g]=d.k.split('|').map(Number);return `${GRP[g]} (${eur(d.m)} → ${eur(d.v)}, +${eur(d.d)})`;}).join('; ')}.`);
    if(des.length)F.push(`Em sentido contrário: ${des.map(d=>{const[f,g]=d.k.split('|').map(Number);return `${GRP[g]} (${eur(d.d)})`;}).join('; ')}.`);
  }
  if(a.novos.length){
    F.push(`Fornecedores novos com peso relevante: ${a.novos.slice(0,3).map(n=>`${FORN[n.fo]} (${eur(n.v)})`).join(', ')} — confirmar enquadramento contratual e comparação de preços na entrada.`);
  }
  // preços F&B
  const ilha=CM_ILHAS.includes(nome);
  if(a.caros.length){
    F.push(`Preços F&B fora da mediana do grupo: ${a.caros.length} artigo(s) (${eur(a.sobreTot)} de sobrecusto, ${a.totFB>0?pct(a.sobrePct):'—'} das compras F&B da unidade); vs o melhor preço, a poupança potencial é ${eur(a.caros.reduce((x,c)=>x+c.save,0))}. Detalhe nos top 10 abaixo.${ilha?' Sendo uma unidade insular, parte do diferencial pode refletir custos logísticos — ainda assim, vale a pena confrontar fornecedores com os preços do continente.':''}`);
  }else if(a.totFB>1000){
    F.push(`Preços F&B: alinhados com o grupo — nenhum artigo acima dos limiares definidos.`);
  }
  if(a.melhores.length){
    F.push(`Boas práticas: tem o melhor preço do grupo em ${a.melhores.length} artigo(s) F&B, por exemplo ${a.melhores.slice(0,3).map(m=>ART[m.art]).join(', ')} — referências úteis para negociação central.`);
  }
  if(a.pf.length&&a.totF>0){
    const sh=a.pf.reduce((x,p)=>x+p[1],0)/a.totF;
    F.push(`Fornecedores: os 3 maiores concentram ${pct(sh)} das compras (${a.pf.map(p=>`${FORN[p[0]]} ${pct(p[1]/a.totF)}`).join(', ')})${sh>0.6?' — concentração elevada, avaliar dependência e poder negocial':''}.`);
  }
  // recomendações
  const rec=[];
  if(a.sev==='crítico'&&a.varHom!==null&&a.varHom>0.35)rec.push(`investigar o salto de ${mesLbl(a.mRef)} junto da direção da unidade, começando pelos grupos listados acima`);
  if(a.sobreTot>2000)rec.push(`confrontar os fornecedores dos artigos do top 10 com a mediana do grupo e o melhor preço identificado`);
  if(a.yoy&&a.yoy.grpsUp.length&&(a.yoy.vb-a.yoy.va)>20000)rec.push(`rever em particular ${GRP[a.yoy.grpsUp[0][0]]}, o grupo que mais cresce no homólogo`);
  if(a.pf.length&&a.totF>0&&a.pf.reduce((x,p)=>x+p[1],0)/a.totF>0.6)rec.push(`reduzir a dependência do fornecedor principal`);
  if(rec.length)F.push(`<b>Prioridades sugeridas:</b> ${rec.join('; ')}.`);
  return F;
}

function cmTabelaCaros(lista,titulo){
  if(!lista.length)return '';
  return `<h3 style="margin:12px 0 6px;font-size:12.5px">${titulo}</h3>`+tabela(
    [{t:'Artigo'},{t:'Qtd',n:1},{t:'Preço',n:1},{t:'Mediana',n:1},{t:'Mínimo (onde)',n:1},{t:'Sobrecusto',n:1},{t:'Poup. vs mín.',n:1}],
    lista.map(c=>[esc(ART[c.art]),fmt2.format(c.q),eur2(c.p),eur2(c.med),
      `${eur2(c.min)} <small>${esc(c.onde)}</small>`,`<b>${eur(c.sobre)}</b>`,eur(c.save)]),{maxH:330});
}

let cmUltimo=[];
function drawComent(){
  const s=sub2.coment;
  const out=document.getElementById('cd_cmOut');
  const pc=cmPrecos();
  const g=rowsG();
  const porH=new Map();
  for(const r of g){let arr=porH.get(r[1]);if(!arr){arr=new Array(MESES.length).fill(0);porH.set(r[1],arr);}arr[r[2]]+=r[7];}
  let mesRef=ST.mesAte,parcial=false;
  if(ST.mesAte>ST.mesDe){
    const totMes=i=>{let t=0;for(const[,arr]of porH)t+=arr[i];return t;};
    const ant=[];for(let i=Math.max(ST.mesDe,ST.mesAte-3);i<ST.mesAte;i++)ant.push(totMes(i));
    ant.sort((a,b)=>a-b);
    const medAnt=ant.length?ant[Math.floor(ant.length/2)]:0;
    if(medAnt>0&&totMes(ST.mesAte)<0.65*medAnt){parcial=true;mesRef=ST.mesAte-1;}
  }
  let varMed=null;
  if(mesRef>ST.mesDe){
    const vs=[];
    for(const[,arr]of porH){
      let soma=0;for(let i=ST.mesDe;i<mesRef;i++)soma+=arr[i];
      const m=soma/(mesRef-ST.mesDe);
      if(Math.abs(m)>1000)vs.push((arr[mesRef]-m)/Math.abs(m));
    }
    if(vs.length){vs.sort((a,b)=>a-b);varMed=vs[Math.floor(vs.length/2)];}
  }
  // peso de famílias no portefólio (p/ análise de mix)
  let totPort=0;const pesoPort=new Map();
  {const pf=somaPor(g,r=>r[4],7);for(const[,v]of pf)totPort+=v;
   if(totPort>0)for(const[f,v]of pf)pesoPort.set(f,v/totPort);}
  const ctx={varMed,mesRef,parcial,pesoPort};
  let hoteis;
  if(s.hotel)hoteis=[s.hotel];
  else hoteis=topN(somaPor(g,r=>r[1],7),999).map(x=>x[0]);
  cmUltimo=[];
  const sevPill={'crítico':'neg','atenção':'warn','positivo':'pos','estável':'mut'};
  let html='';
  if(!s.hotel){
    const analises=hoteis.map(h=>cmAnaliseHotel(h,pc,ctx));
    const crit=analises.filter(a=>a.sev==='crítico'),aten=analises.filter(a=>a.sev==='atenção');
    const sobreTot=analises.reduce((x,a)=>x+a.sobreTot,0);
    // top 10 portefólio por artigo (comidas e bebidas)
    const agArt=new Map();
    for(const a of analises)for(const c of a.caros){
      let o=agArt.get(c.art);if(!o){o={fam:c.fam,sobre:0,n:0,med:c.med,pior:0,piorH:''};agArt.set(c.art,o);}
      o.sobre+=c.sobre;o.n++;if(c.p>o.pior){o.pior=c.p;o.piorH=HOT[a.h];}
    }
    const topPort=f=>[...agArt.entries()].filter(([,o])=>o.fam===f).sort((x,y)=>y[1].sobre-x[1].sobre).slice(0,10);
    const tblPort=(lst,tit)=>!lst.length?'':`<h3 style="margin:12px 0 6px;font-size:12.5px">${tit}</h3>`+tabela(
      [{t:'Artigo'},{t:'Unid. acima',n:1},{t:'Mediana',n:1},{t:'Pior preço (unidade)',n:1},{t:'Sobrecusto total',n:1}],
      lst.map(([art,o])=>[esc(ART[art]),o.n,eur2(o.med),`${eur2(o.pior)} <small>${esc(o.piorH)}</small>`,`<b>${eur(o.sobre)}</b>`]),{maxH:330});
    html+=`<div class="card" style="margin-bottom:14px"><h3>Síntese do portefólio</h3>
      <div class="note" style="font-size:13px;color:var(--ink)">
      ${analises.length} unidades analisadas no filtro atual.${parcial?` <b>${mesLbl(ST.mesAte)} aparenta estar incompleto no extrato</b> — a análise mensal reporta-se a ${mesLbl(mesRef)}.`:''}
      ${crit.length?` <b style="color:var(--neg)">${crit.length} em estado crítico</b>: ${crit.map(a=>esc(HOT[a.h])).join(', ')}.`:' Sem unidades em estado crítico.'}
      ${aten.length?` ${aten.length} a merecer atenção: ${aten.slice(0,10).map(a=>esc(HOT[a.h])).join(', ')}${aten.length>10?'…':''}.`:''}
      Sobrecusto F&B agregado acima da mediana do grupo: <b>${eur(sobreTot)}</b> no período do ficheiro.
      </div>
      ${tblPort(topPort('COMIDAS'),'Top 10 COMIDAS — maior impacto no portefólio')}
      ${tblPort(topPort('BEBIDAS'),'Top 10 BEBIDAS — maior impacto no portefólio')}
      </div>`;
    for(const a of analises){html+=cmCard(a,sevPill);cmUltimo.push(a);}
  }else{
    const a=cmAnaliseHotel(s.hotel,pc,ctx);
    html+=cmCard(a,sevPill);cmUltimo.push(a);
  }
  out.innerHTML=html;
}
function cmCard(a,sevPill){
  const frases=cmFrases(a);
  a._frases=frases;
  return `<div class="card" style="margin-bottom:12px">
    <h3>${esc(HOT[a.h])} <span class="tag">${regiaoDe(a.h)}</span>
      <span class="pill ${sevPill[a.sev]}" style="margin-left:8px">${a.sev}</span></h3>
    <div style="font-size:13.2px;line-height:1.75;color:var(--ink)">${frases.map(f=>`<p style="margin-bottom:7px">${f}</p>`).join('')}</div>
    ${cmTabelaCaros(a.carosC,'Top 10 COMIDAS fora de preço')}
    ${cmTabelaCaros(a.carosB,'Top 10 BEBIDAS fora de preço')}
  </div>`;
}
function cmTextoExport(){
  const linhas=[`ANÁLISE COMENTADA DE CUSTOS — ${mesLbl(ST.mesDe)} a ${mesLbl(ST.mesAte)} — gerado ${new Date().toLocaleDateString('pt-PT')}`,''];
  for(const a of cmUltimo){
    linhas.push(`${HOT[a.h]} (${regiaoDe(a.h)}) — ${a.sev.toUpperCase()}`);
    for(const f of (a._frases||[]))linhas.push('  • '+f.replace(/<[^>]+>/g,''));
    const tb=(lst,tit)=>{if(!lst.length)return;
      linhas.push('  '+tit+':');
      for(const c of lst)linhas.push(`    - ${ART[c.art]}: ${fmt2.format(c.q)} un a ${eur2(c.p)} vs mediana ${eur2(c.med)} e mínimo ${eur2(c.min)} (${c.onde}) — sobrecusto ${eur(c.sobre)}`);};
    tb(a.carosC,'Top 10 COMIDAS fora de preço');
    tb(a.carosB,'Top 10 BEBIDAS fora de preço');
    linhas.push('');
  }
  return linhas.join('\n');
}

/* ============ ALERTAS ============ */
function rAlertas(el){
  const s=sub2.alertas||(sub2.alertas={lim:40,minV:1000});
  el.innerHTML=`
  <div class="card">
    <h3>Variações anómalas <small>— ${mesLbl(ST.mesAte)} vs média dos meses anteriores no período</small></h3>
    <div class="inline">
      <label>Variação mínima</label><input type="number" id="cd_aLim" value="${s.lim}" min="5" step="5"> %
      <label>Valor mínimo no mês</label><input type="number" id="cd_aMinV" value="${s.minV}" min="0" step="250"> ${cdSym()}
      <button class="btn" id="cd_aGo">Recalcular</button>
      <button class="btn gold" id="cd_aExp">Exportar CSV</button>
    </div>
    <div id="cd_tAl"></div>
    <div class="note">Compara o último mês do filtro com a média dos meses anteriores, por unidade × grupo de custo. Subidas a vermelho, descidas a verde. Precisa de pelo menos 2 meses no filtro.</div>
  </div>`;
  const go=()=>{s.lim=+document.getElementById('cd_aLim').value||40;s.minV=+document.getElementById('cd_aMinV').value||0;drawAlertas();};
  document.getElementById('cd_aGo').onclick=go;
  document.getElementById('cd_aExp').onclick=()=>{const al=calcAlertas();exportCSV('alertas_custos.csv',
    ['Unidade','Família','Grupo','Mês','Valor mês','Média anterior','Variação %'],
    al.map(a=>[HOT[a.h],FAM[a.f],GRP[a.g],mesLbl(ST.mesAte),a.v.toFixed(2),a.med.toFixed(2),(a.var*100).toFixed(1)]));};
  drawAlertas();
}
function calcAlertas(){
  const s=sub2.alertas;
  if(ST.mesAte<=ST.mesDe)return [];
  const g=rowsG();
  const mapa=new Map(); // h|f|g -> array por mês
  for(const r of g){
    const k=r[1]+'|'+r[4]+'|'+r[6];
    if(!mapa.has(k))mapa.set(k,new Array(MESES.length).fill(0));
    mapa.get(k)[r[2]]+=r[7];
  }
  const out=[];
  const nAnt=ST.mesAte-ST.mesDe;
  for(const[k,arr]of mapa){
    const v=arr[ST.mesAte];
    let soma=0;for(let i=ST.mesDe;i<ST.mesAte;i++)soma+=arr[i];
    const med=soma/nAnt;
    if(Math.abs(v)<s.minV&&Math.abs(med)<s.minV)continue;
    if(Math.abs(med)<1){if(Math.abs(v)>=s.minV){const[h,f,gg]=k.split('|').map(Number);out.push({h,f,g:gg,v,med,var:v>0?9.99:-9.99,novo:true});}continue;}
    const vr=(v-med)/Math.abs(med);
    if(Math.abs(vr)*100<s.lim)continue;
    const[h,f,gg]=k.split('|').map(Number);
    out.push({h,f,g:gg,v,med,var:vr,novo:false});
  }
  out.sort((a,b)=>Math.abs(b.v-b.med)-Math.abs(a.v-a.med));
  return out;
}
function drawAlertas(){
  const al=calcAlertas();
  if(ST.mesAte<=ST.mesDe){document.getElementById('cd_tAl').innerHTML='<div class="note">Alarga o filtro de meses (mínimo 2) para calcular variações.</div>';return;}
  document.getElementById('cd_tAl').innerHTML=
    `<div class="note" style="margin-bottom:8px">${fmt0.format(al.length)} alertas (top 120 abaixo, ordenados por impacto em ${cdSym()})</div>`+
    tabela([{t:'Unidade'},{t:'Família'},{t:'Grupo'},{t:mesLbl(ST.mesAte),n:1},{t:'Média anterior',n:1},{t:'Variação',n:1},{t:'Impacto',n:1}],
    al.slice(0,120).map(a=>[esc(HOT[a.h]),esc(FAM[a.f]),esc(GRP[a.g]),eur(a.v),eur(a.med),
      a.novo?'<span class="pill warn">novo</span>':`<span class="pill ${a.var>0?'neg':'pos'}">${a.var>0?'+':''}${pct(a.var)}</span>`,
      `<b>${eur(a.v-a.med)}</b>`]),{maxH:560});
}

/* ============ EXPLORADOR ============ */
function rExpl(el){
  const s=sub2.expl||(sub2.expl={ds:'G',dim:'hotel',fTipo:-1,fFam:0,fSub:0,fGrp:0,fCen:0});
  el.innerHTML=`
  <div class="card">
    <h3>Explorador de dados <small>— tabela dinâmica com export</small></h3>
    <div class="inline">
      <label>Dados</label>
      <select id="cd_eDs"><option value="G">Grupos (todos os tipos)</option><option value="A">Artigos (compras)</option><option value="F">Fornecedores (compras)</option></select>
      <label>Linhas</label><select id="cd_eDim"></select>
      <label>Tipo</label><select id="cd_eTipo"><option value="-1">Conforme âmbito</option><option value="0">Compras</option><option value="1">Transf. entrada</option><option value="2">Transf. saída</option></select>
      <label>Família</label><select id="cd_eFam"></select>
      <label>Sub-família</label><select id="cd_eSub"></select>
      <label>Grupo</label><select id="cd_eGrp"></select>
      <button class="btn gold" id="cd_eExp">Exportar CSV</button>
    </div>
    <div id="cd_eOut"></div>
    <div class="note">As colunas são os meses do filtro global; os filtros de região/hotel/âmbito do cabeçalho também se aplicam. Máximo 800 linhas no ecrã (o export inclui tudo).</div>
  </div>`;
  const dimsPorDs={G:[['hotel','Unidade'],['regiao','Região'],['centro','Centro de custo'],['fam','Família'],['sub','Sub-família'],['grp','Grupo']],
    A:[['hotel','Unidade'],['regiao','Região'],['fam','Família'],['sub','Sub-família'],['grp','Grupo'],['art','Artigo']],
    F:[['hotel','Unidade'],['regiao','Região'],['forn','Fornecedor'],['fam','Família']]};
  const eDs=document.getElementById('cd_eDs'),eDim=document.getElementById('cd_eDim');
  const fillDim=()=>{eDim.innerHTML=dimsPorDs[s.ds].map(d=>`<option value="${d[0]}" ${s.dim===d[0]?'selected':''}>${d[1]}</option>`).join('');
    if(!dimsPorDs[s.ds].some(d=>d[0]===s.dim))s.dim=dimsPorDs[s.ds][0][0];eDim.value=s.dim;};
  eDs.value=s.ds;fillDim();
  const selFill=(id,dic,cur)=>{const e=document.getElementById(id);
    e.innerHTML='<option value="0">Todas</option>'+dic.map((v,i)=>i?`<option value="${i}" ${cur===i?'selected':''}>${esc(v)}</option>`:'').join('');};
  selFill('cd_eFam',FAM,s.fFam);selFill('cd_eSub',SUB,s.fSub);selFill('cd_eGrp',GRP,s.fGrp);
  document.getElementById('cd_eTipo').value=String(s.fTipo);
  const upd=()=>{s.ds=eDs.value;s.dim=eDim.value;
    s.fTipo=+document.getElementById('cd_eTipo').value;
    s.fFam=+document.getElementById('cd_eFam').value;s.fSub=+document.getElementById('cd_eSub').value;s.fGrp=+document.getElementById('cd_eGrp').value;
    drawExpl();};
  eDs.onchange=()=>{s.ds=eDs.value;fillDim();upd();};
  ['cd_eDim','cd_eTipo','cd_eFam','cd_eSub','cd_eGrp'].forEach(id=>document.getElementById(id).onchange=upd);
  document.getElementById('cd_eExp').onclick=()=>{const r=calcExpl();exportCSV('explorador_custos.csv',
    [r.dimLbl,...r.mm.map(mesLbl),'Total'],
    r.linhas.map(l=>[l.nome,...l.vals.map(v=>v.toFixed(2)),l.tot.toFixed(2)]));};
  drawExpl();
}
function calcExpl(){
  const s=sub2.expl;
  const mm=mesesAtivos();
  let rows,keyFn,nomeFn,mesIdx,valIdx,dimLbl;
  const dimNome={hotel:'Unidade',regiao:'Região',centro:'Centro de custo',fam:'Família',sub:'Sub-família',grp:'Grupo',art:'Artigo',forn:'Fornecedor'};
  dimLbl=dimNome[s.dim];
  if(s.ds==='G'){
    rows=CD.G.filter(r=>{
      if(s.fTipo===-1){if(ST.ambito==='compras'&&r[0]!==0)return false;}else if(r[0]!==s.fTipo)return false;
      if(!passaFiltroBase(r[1],r[2]))return false;
      if(s.fFam&&r[4]!==s.fFam)return false;if(s.fSub&&r[5]!==s.fSub)return false;if(s.fGrp&&r[6]!==s.fGrp)return false;
      return true;});
    mesIdx=2;valIdx=7;
    keyFn={hotel:r=>r[1],regiao:r=>regiaoDe(r[1]),centro:r=>r[3],fam:r=>r[4],sub:r=>r[5],grp:r=>r[6]}[s.dim];
    nomeFn={hotel:k=>HOT[k],regiao:k=>k,centro:k=>CEN[k]||'—',fam:k=>FAM[k],sub:k=>SUB[k],grp:k=>GRP[k]}[s.dim];
  }else if(s.ds==='A'){
    rows=CD.A.filter(r=>{
      if(!passaFiltroBase(r[0],r[1]))return false;
      if(s.fFam&&r[2]!==s.fFam)return false;if(s.fSub&&r[3]!==s.fSub)return false;if(s.fGrp&&r[4]!==s.fGrp)return false;
      return true;});
    mesIdx=1;valIdx=6;
    keyFn={hotel:r=>r[0],regiao:r=>regiaoDe(r[0]),fam:r=>r[2],sub:r=>r[3],grp:r=>r[4],art:r=>r[5]}[s.dim];
    nomeFn={hotel:k=>HOT[k],regiao:k=>k,fam:k=>FAM[k],sub:k=>SUB[k],grp:k=>GRP[k],art:k=>ART[k]}[s.dim];
  }else{
    rows=CD.F.filter(r=>{
      if(!passaFiltroBase(r[0],r[1]))return false;
      if(s.fFam&&r[3]!==s.fFam)return false;
      return true;});
    mesIdx=1;valIdx=4;
    keyFn={hotel:r=>r[0],regiao:r=>regiaoDe(r[0]),forn:r=>r[2],fam:r=>r[3]}[s.dim];
    nomeFn={hotel:k=>HOT[k],regiao:k=>k,forn:k=>FORN[k],fam:k=>FAM[k]}[s.dim];
  }
  const mapa=new Map();
  for(const r of rows){
    const k=keyFn(r);
    if(!mapa.has(k))mapa.set(k,new Array(MESES.length).fill(0));
    mapa.get(k)[r[mesIdx]]+=r[valIdx];
  }
  const linhas=[...mapa.entries()].map(([k,arr])=>{
    let tot=0;const vals=mm.map(i=>{tot+=arr[i];return arr[i];});
    return {nome:nomeFn(k),vals,tot};
  }).sort((a,b)=>b.tot-a.tot);
  return {linhas,mm,dimLbl};
}
function drawExpl(){
  const r=calcExpl();
  const totMes=r.mm.map((_,j)=>r.linhas.reduce((a,l)=>a+l.vals[j],0));
  const totG=totMes.reduce((a,b)=>a+b,0);
  const linhas=r.linhas.slice(0,800).map(l=>[esc(l.nome),...l.vals.map(eur),`<b>${eur(l.tot)}</b>`]);
  linhas.unshift([`<b>TOTAL (${fmt0.format(r.linhas.length)} linhas)</b>`,...totMes.map(v=>`<b>${eur(v)}</b>`),`<b>${eur(totG)}</b>`]);
  document.getElementById('cd_eOut').innerHTML=tabela([{t:r.dimLbl},...r.mm.map(i=>({t:mesLbl(i),n:1})),{t:'Total',n:1}],linhas,{maxH:560});
}

/* ============ ROUTER ============ */
const RENDERS={geral:rGeral,hoteis:rHoteis,cat:rCat,forn:rForn,precos:rPrecos,transf:rTransf,comp:rComp,anos:rAnos,coment:rComent,alertas:rAlertas,expl:rExpl};
function render(){
  destroyAllCharts();
  cdRefreshRegioes();
  const m=document.getElementById('cd_main');
  if(!m)return;
  if(!CD){m.innerHTML='<div class="card"><h3>Sem extrato de compras carregado</h3><div class="note">Vai a <b>📂 Carregar Docs → 🧾 Extrato de Compras</b> e carrega o XLSX de movimentos (compras + transferências). Os dados ficam guardados no browser e entram no export/import de sessão.</div></div>';return;}
  m.innerHTML='';
  RENDERS[ST.tab](m);
}

/* ============ INGESTÃO DO EXTRATO (streaming) ============ */
const COLS=['TIPO','HOTEL','CENTRO_CUSTO','FAMILIA','SUB_FAMILIA','GRUPO','ARTIGO','FORNECEDOR','ID_MES','HOTEL_ORIGEM','HOTEL_DESTINO','VALOR','QUANTIDADE'];
const TIPO_COD={'COMPRA':0,'TRANSFERENCIA ENTRADA':1,'TRANSFERENCIA SAIDA':2};

const $=id=>document.getElementById(id);
let agg=null,nomeFonte='',folhasInfo='',avisoRepetidos='';

/* ---- Agregador incremental (replica preparar_dados.py) ---- */
function novoAgg(){
  return {
    n:0,ignoradas:0,
    dics:{hoteis:new Map(),centros:new Map(),fam:new Map(),sub:new Map(),grp:new Map(),art:new Map(),forn:new Map()},
    meses:new Set(),
    G:new Map(),A:new Map(),F:new Map(),P:new Map(),PM:new Map(),X:new Map(),
    totCompras:0
  };
}
function intern(dic,v){
  v=(v==null?'':String(v)).trim();
  if(v==='')return 0;
  let i=dic.get(v);
  if(i===undefined){i=dic.size+1;dic.set(v,i);}
  return i;
}
function toNum(v){
  if(typeof v==='number')return v;
  if(v==null||v==='')return 0;
  let s=String(v).trim().replace(/\s|\u00a0/g,'');
  // formato PT "1.234,56" -> "1234.56"
  if(/,\d+$/.test(s))s=s.replace(/\./g,'').replace(',','.');
  const n=parseFloat(s);
  return isNaN(n)?0:n;
}
function addLinha(a,o){
  const tipo=TIPO_COD[String(o.TIPO||'').trim()];
  if(tipo===undefined){a.ignoradas++;return;}
  const mesV=parseInt(toNum(o.ID_MES));
  if(!mesV||mesV<190001){a.ignoradas++;return;}
  a.meses.add(mesV);
  const h=intern(a.dics.hoteis,o.HOTEL),c=intern(a.dics.centros,o.CENTRO_CUSTO);
  const f=intern(a.dics.fam,o.FAMILIA),s=intern(a.dics.sub,o.SUB_FAMILIA),g=intern(a.dics.grp,o.GRUPO);
  const val=toNum(o.VALOR),qtd=toNum(o.QUANTIDADE);
  a.n++;
  // G
  let k=tipo+','+h+','+mesV+','+c+','+f+','+s+','+g;
  a.G.set(k,(a.G.get(k)||0)+val);
  if(tipo===0){
    a.totCompras+=val;
    const ar=intern(a.dics.art,o.ARTIGO),fo=intern(a.dics.forn,o.FORNECEDOR);
    k=h+','+mesV+','+f+','+s+','+g+','+ar;
    let v=a.A.get(k);if(!v){v=[0,0];a.A.set(k,v);}v[0]+=val;v[1]+=qtd;
    k=h+','+mesV+','+fo+','+f;
    a.F.set(k,(a.F.get(k)||0)+val);
    if(qtd>0){
      k=ar+','+fo+','+h;
      v=a.P.get(k);if(!v){v=[0,0];a.P.set(k,v);}v[0]+=val;v[1]+=qtd;
      // PM: preços por mês (para filtro temporal na aba Preços)
      k=ar+','+fo+','+h+','+mesV;
      v=a.PM.get(k);if(!v){v=[0,0];a.PM.set(k,v);}v[0]+=val;v[1]+=qtd;
    }
  }else{
    const ho=intern(a.dics.hoteis,o.HOTEL_ORIGEM),hd=intern(a.dics.hoteis,o.HOTEL_DESTINO);
    k=tipo+','+ho+','+hd+','+mesV+','+f+','+g;
    a.X.set(k,(a.X.get(k)||0)+val);
  }
}
function finalizar(a){
  const meses=[...a.meses].sort((x,y)=>x-y);
  const mIdx=new Map(meses.map((m,i)=>[m,i]));
  const dicArr=dic=>{const arr=new Array(dic.size+1).fill('');for(const[v,i]of dic)arr[i]=v;return arr;};
  const r2=v=>Math.round(v*100)/100;
  const r3=v=>Math.round(v*1000)/1000;
  const G=[],A=[],F=[],P=[],PM=[],X=[];
  for(const[k,v]of a.G){const p=k.split(',').map(Number);const val=r2(v);if(val!==0)G.push([p[0],p[1],mIdx.get(p[2]),p[3],p[4],p[5],p[6],val]);}
  for(const[k,v]of a.A){const p=k.split(',').map(Number);const val=r2(v[0]),q=r3(v[1]);if(val!==0||q!==0)A.push([p[0],mIdx.get(p[1]),p[2],p[3],p[4],p[5],val,q]);}
  for(const[k,v]of a.F){const p=k.split(',').map(Number);const val=r2(v);if(val!==0)F.push([p[0],mIdx.get(p[1]),p[2],p[3],val]);}
  for(const[k,v]of a.P){const p=k.split(',').map(Number);const q=r3(v[1]);if(q>0)P.push([p[0],p[1],p[2],r2(v[0]),q]);}
  for(const[k,v]of a.PM){const p=k.split(',').map(Number);const q=r3(v[1]);if(q>0)PM.push([p[0],p[1],p[2],mIdx.get(p[3]),r2(v[0]),q]);}
  for(const[k,v]of a.X){const p=k.split(',').map(Number);const val=r2(v);if(val!==0)X.push([p[0],p[1],p[2],mIdx.get(p[3]),p[4],p[5],val]);}
  return {
    meta:{gerado:new Date().toISOString().slice(0,10),meses,linhas_origem:a.n,fonte:nomeFonte},
    dic:{hoteis:dicArr(a.dics.hoteis),centros:dicArr(a.dics.centros),fam:dicArr(a.dics.fam),
         sub:dicArr(a.dics.sub),grp:dicArr(a.dics.grp),art:dicArr(a.dics.art),forn:dicArr(a.dics.forn)},
    G,A,F,P,PM,X
  };
}

/* ---- XLSX em streaming: acesso direto via diretório central do ZIP ---- */
const decodeXml=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'")
  .replace(/&#x([0-9a-fA-F]+);/g,(_,h)=>String.fromCodePoint(parseInt(h,16)))
  .replace(/&#(\d+);/g,(_,d)=>String.fromCodePoint(+d)).replace(/&amp;/g,'&');
const extrairTexto=inner=>{
  let s='',m,achou=false;const re=/<t\b[^>]*>([\s\S]*?)<\/t>/g;
  while((m=re.exec(inner)))s+=m[1],achou=true;
  if(!achou&&inner.indexOf('<')<0)s=inner;
  return decodeXml(s);
};
const colIdx=letras=>{let n=0;for(let i=0;i<letras.length;i++)n=n*26+(letras.charCodeAt(i)-64);return n-1;};
const b2=(u,i)=>u[i]|u[i+1]<<8;
const b4=(u,i)=>(u[i]|u[i+1]<<8|u[i+2]<<16|u[i+3]<<24)>>>0;

async function fatia(file,a,b){return new Uint8Array(await file.slice(a,b).arrayBuffer());}

async function lerDiretorioZip(file){
  // EOCD está nos últimos <= 65557 bytes
  const tail=await fatia(file,Math.max(0,file.size-65578),file.size);
  let e=-1;
  for(let i=tail.length-22;i>=0;i--){if(b4(tail,i)===0x06054b50){e=i;break;}}
  if(e<0)throw new Error('ZIP inválido (EOCD não encontrado) — o ficheiro está completo?');
  const nCD=b2(tail,e+10),szCD=b4(tail,e+12),offCD=b4(tail,e+16);
  if(offCD===0xFFFFFFFF)throw new Error('ZIP64 (>4 GB) não suportado.');
  const cd=await fatia(file,offCD,offCD+szCD);
  const entradas=[];let i=0;
  const td=new TextDecoder('utf-8');
  while(i+46<=cd.length&&b4(cd,i)===0x02014b50){
    const metodo=b2(cd,i+10),csize=b4(cd,i+20),usize=b4(cd,i+24);
    const fnl=b2(cd,i+28),exl=b2(cd,i+30),cml=b2(cd,i+32),off=b4(cd,i+42);
    const nome=td.decode(cd.subarray(i+46,i+46+fnl));
    if(csize===0xFFFFFFFF||off===0xFFFFFFFF)throw new Error('ZIP64 (>4 GB) não suportado.');
    entradas.push({nome,metodo,csize,usize,off});
    i+=46+fnl+exl+cml;
  }
  if(entradas.length!==nCD&&nCD!==0xFFFF)console.warn('CD: esperadas',nCD,'entradas, lidas',entradas.length);
  return entradas;
}

async function lerEntrada(file,ent,handler,onBytes){
  const lh=await fatia(file,ent.off,ent.off+30);
  if(b4(lh,0)!==0x04034b50)throw new Error('cabeçalho local inválido em '+ent.nome);
  const fnl=b2(lh,26),exl=b2(lh,28);
  const inicio=ent.off+30+fnl+exl;
  const dec=new TextDecoder('utf-8');
  let pendente=null;
  const emit=(data,final)=>{handler.chunk(dec.decode(data,{stream:!final}));if(final&&handler.end)handler.end();};
  let inf=null;
  if(ent.metodo===8){inf=new fflate.Inflate();inf.ondata=emit;}
  else if(ent.metodo!==0)throw new Error('compressão não suportada ('+ent.metodo+') em '+ent.nome);
  const CH=4*1024*1024;
  if(ent.csize===0){emit(new Uint8Array(0),true);return;}
  for(let p=0;p<ent.csize;p+=CH){
    const fim=Math.min(ent.csize,p+CH);
    const chunk=await fatia(file,inicio+p,inicio+fim);
    const final=fim===ent.csize;
    if(inf)inf.push(chunk,final);else emit(chunk,final);
    if(onBytes)onBytes(fim);
    await new Promise(r=>setTimeout(r,0)); // manter UI viva
  }
}

function parserSST(sst){
  let buf='';
  const processa=parte=>{const re=/<si\b[^>]*>([\s\S]*?)<\/si>/g;let m;
    while((m=re.exec(parte)))sst.push(extrairTexto(m[1]));};
  return {chunk:t=>{buf+=t;const i=buf.lastIndexOf('</si>');
      if(i>=0){processa(buf.slice(0,i+5));buf=buf.slice(i+5);}},
    end:()=>{processa(buf);buf='';}};
}

function parserFolha(a,sst,info){
  let buf='',headers=null,colMap=null;
  const lerCelulas=inner=>{
    const reCell=/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    const cels=[];let m,seq=0;
    while((m=reCell.exec(inner))){
      const at=m[1],corpo=m[2]||'';
      const rA=/r="([A-Z]+)\d+"/.exec(at);
      const ci=rA?colIdx(rA[1]):seq;seq=ci+1;
      const tA=/t="(\w+)"/.exec(at);const t=tA?tA[1]:'';
      let v='';
      if(corpo){
        if(t==='inlineStr')v=extrairTexto(corpo);
        else{const vm=/<v[^>]*>([\s\S]*?)<\/v>/.exec(corpo);
          if(vm)v=t==='s'?(sst[+vm[1]]??''):decodeXml(vm[1]);}
      }
      cels.push([ci,v]);
    }
    return cels;
  };
  info.meses=new Set();
  const processa=parte=>{
    const reRow=/<row\b[^>]*>([\s\S]*?)<\/row>/g;let m;
    while((m=reRow.exec(parte))){
      const cels=lerCelulas(m[1]);
      if(!headers){
        headers={};colMap={};
        for(const[ci,v]of cels){const nome=String(v).trim().toUpperCase();if(nome){headers[nome]=ci;colMap[ci]=nome;}}
        const falta=COLS.filter(cc=>!(cc in headers));
        if(falta.length){info.invalida=falta;info.aborta=true;return;}
        info.valida=true;
        continue;
      }
      const o={};
      for(const[ci,v]of cels){const nome=colMap[ci];if(nome)o[nome]=v;}
      const mv=parseInt(toNum(o.ID_MES));if(mv&&mv>190001)info.meses.add(mv);
      addLinha(a,o);
    }
  };
  return {chunk:t=>{if(info.aborta)return;buf+=t;const i=buf.lastIndexOf('</row>');
      if(i>=0){const parte=buf.slice(0,i+6);buf=buf.slice(i+6);processa(parte);}},
    end:()=>{if(!info.aborta)processa(buf);buf='';}};
}

async function lerXLSX(file,a,onProg){
  const cd=await lerDiretorioZip(file);
  const sst=[];
  const sstEnt=cd.find(e=>e.nome==='xl/sharedStrings.xml');
  if(sstEnt){
    await lerEntrada(file,sstEnt,parserSST(sst),
      b=>onProg(0.1*(b/sstEnt.csize),'A ler dicionário de texto…'));
  }
  let wbXml='';
  const wbEnt=cd.find(e=>e.nome==='xl/workbook.xml');
  if(wbEnt)await lerEntrada(file,wbEnt,{chunk:t=>{wbXml+=t;}});
  const folhasEnt=cd.filter(e=>/^xl\/worksheets\/sheet\d+\.xml$/.test(e.nome))
    .sort((x,y)=>x.nome.localeCompare(y.nome,undefined,{numeric:true}));
  if(!folhasEnt.length)throw new Error('O ficheiro não tem folhas de cálculo.');
  const totalC=folhasEnt.reduce((s,e)=>s+e.csize,0)||1;
  let lido=0;const infos=[];
  for(const ent of folhasEnt){
    const info={nome:ent.nome,valida:false,aborta:false};infos.push(info);
    const antes=a.n;
    await lerEntrada(file,ent,parserFolha(a,sst,info),
      b=>onProg(0.1+0.9*((lido+b)/totalC),'A processar movimentos…'));
    info.linhas=a.n-antes;lido+=ent.csize;
  }
  const validas=infos.filter(f=>f.valida);
  if(!validas.length){
    const ex=infos.length&&infos[0].invalida?' (faltam: '+infos[0].invalida.join(', ')+')':'';
    throw new Error('Nenhuma folha tem as colunas necessárias'+ex+'.');
  }
  const nomes=(wbXml.match(/<sheet [^>]*name="([^"]*)"/g)||[]).map(s=>/name="([^"]*)"/.exec(s)[1]);
  const porMes=new Map();
  for(const f of validas){const nm=nomes[infos.indexOf(f)]||f.nome;
    for(const m of (f.meses||[])){if(!porMes.has(m))porMes.set(m,[]);porMes.get(m).push(nm);}}
  const MN=['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const repetidos=[...porMes.entries()].filter(([,fs])=>fs.length>1).sort((a,b)=>a[0]-b[0])
    .map(([m,fs])=>MN[m%100]+' '+Math.floor(m/100)+' ('+fs.join(' + ')+')');
  return {folhas:validas.length,ignoradas:infos.length-validas.length,nomes,repetidos};
}


async function cdUploadInterno(inp){
  const file=inp.files&&inp.files[0];
  if(!file)return;
  const dcBefore=typeof window.vgDataCenterCapture==='function'?window.vgDataCenterCapture('purchases'):null;
  const st=document.getElementById('cd_upStatus');
  const ext=file.name.toLowerCase().split('.').pop();
  if(ext!=='xlsx'&&ext!=='xlsm'){st.textContent='Formato não suportado — usa XLSX.';return;}
  try{
    nomeFonte=file.name;
    const a=novoAgg();
    const r=await lerXLSX(file,a,(p,msg)=>{st.textContent=`${msg} ${Math.round(p*100)}% · ${a.n.toLocaleString('pt-PT')} mov.`;});
    const dados=finalizar(a);
    if(window.VG?.market?.ensureMarketForPurchases) await window.VG.market.ensureMarketForPurchases(dados);
    cdSetDataInterno(dados);
    st.textContent=`✓ ${a.n.toLocaleString('pt-PT')} movimentos · ${dados.meta.meses.length} meses · ${r.folhas} folha(s)`+(r.ignoradas?` · ${r.ignoradas} ignorada(s)`:'');
    if(r.repetidos&&r.repetidos.length){
      st.textContent+=` · ⚠ MESES EM DUPLICADO: ${r.repetidos.join('; ')}`;
      if(typeof showToast==='function')showToast('⚠ O ficheiro tem o mesmo mês em mais de uma folha ('+r.repetidos.join('; ')+') — valores somados em duplicado. Confirma o ficheiro.',true);
    }
    if(typeof showToast==='function')showToast(`✓ Extrato de compras: ${a.n.toLocaleString('pt-PT')} movimentos, ${dados.meta.meses.length} meses`);
    if(typeof window.vgDataCenterRecord==='function')window.vgDataCenterRecord({source:'purchases',fileName:file.name,fileSize:file.size,scope:`${dados.meta.meses.length} mês(es)`,before:dcBefore,duplicate:!!(r.repetidos&&r.repetidos.length),metrics:{records:a.n,months:dados.meta.meses.length,sheets:r.folhas,ignoredSheets:r.ignoradas},warnings:r.repetidos&&r.repetidos.length?[`Meses em duplicado: ${r.repetidos.join('; ')}`]:[],summary:'Extrato de compras e artigos'});
    if(typeof idbSaveAll==='function')idbSaveAll();
    if(typeof currentView!=='undefined'&&currentView==='compras')window.cdRender();
  }catch(err){
    st.textContent='Erro: '+(err.message||err);
    if(typeof showToast==='function')showToast('Erro no extrato de compras: '+(err.message||err),true);
    if(typeof window.vgDataCenterRecordFailure==='function')window.vgDataCenterRecordFailure({source:'purchases',fileName:file.name,fileSize:file.size,summary:err.message||String(err),warnings:[err.message||String(err)]});
  }finally{inp.value='';}
}
window.cdUpload=inp=>{cdUploadInterno(inp);};
window.cdClearData=function(){
  if(!confirm('Remover os dados do extrato de compras?'))return;
  cdSetDataInterno(null);
  const st=document.getElementById('cd_upStatus');if(st)st.textContent='';
  if(typeof idbSaveAll==='function')idbSaveAll();
  if(typeof currentView!=='undefined'&&currentView==='compras')window.cdRender();
};
window.cdRender=function(){cdBindUI();render();};
window.cdApplyYear=function(y){
  if(!CD)return;
  if(y==='both'){ST.mesDe=0;ST.mesAte=MESES.length-1;}
  else{
    const alvo=parseInt(y);
    if(!alvo||isNaN(alvo))return;
    const idx=MESES.map((m,i)=>[Math.floor(m/100),i]).filter(x=>x[0]===alvo).map(x=>x[1]);
    if(!idx.length)return; // ano sem dados de compras — não mexe
    ST.mesDe=idx[0];ST.mesAte=idx[idx.length-1];
  }
  cdFillHeader();
};
window.cdGetData=()=>CD;
window.cdSetData=d=>{cdSetDataInterno(d);};
window.cdLerXLSX=(f,a,p)=>lerXLSX(f,a,p);
window.cdNovoAgg=()=>novoAgg();
window.cdFinalizar=a=>finalizar(a);

})();
