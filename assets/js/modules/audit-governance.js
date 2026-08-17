(function(){
'use strict';
let GOV_ROWS=[], GOV_LOADED=false, GOV_OPEN='';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const norm=s=>String(s||'').trim().toLowerCase();
function current(){try{return typeof window.vgAuthCurrent==='function'?window.vgAuthCurrent():null;}catch(e){return null;}}
function allowed(){const u=current();return !!u&&(u.role==='direcao'||u.role==='admin');}
async function api(){
  const t=typeof window.vgAuthToken==='function'?window.vgAuthToken():'';
  const r=await fetch((window.SHARED_API_URL||'/.netlify/functions/dashboard-sessao')+'?resource=audit-events',{headers:t?{Authorization:'Bearer '+t}:{},cache:'no-store'});
  const j=await r.json().catch(()=>({})); if(!r.ok){const e=new Error(j.error||('HTTP '+r.status));e.status=r.status;throw e;} return j;
}
function fmtTime(v){if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString('pt-PT',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'});}
function ageDays(v){const t=Date.parse(v||'');return Number.isFinite(t)?(Date.now()-t)/86400000:99999;}
function value(v){if(v===null)return 'null';if(v===undefined)return '—';if(typeof v==='object')return JSON.stringify(v);return String(v);}
function shell(){const root=document.getElementById('governanceRoot');if(!root)return null;if(!root.dataset.ready){
 root.dataset.ready='1';root.innerHTML=`<div class="gov-shell">
 <div class="gov-head"><div><div class="gov-title">Auditoria &amp; Governação</div><div class="gov-sub">Trilho de alterações verificado no servidor. Identidade, data e diferenças antes/depois são registadas pela função Netlify; credenciais, tokens, hashes e salts não são armazenados neste histórico.</div></div><div class="gov-actions"><button class="gov-btn" onclick="governanceLoad(true)">↻ Atualizar</button><button class="gov-btn" onclick="governanceExportCsv()">Exportar CSV</button></div></div>
 <div class="gov-grid"><div class="gov-kpi"><div class="gov-kpi-label">Últimas 24h</div><div class="gov-kpi-value" id="gov24">—</div><div class="gov-kpi-note">alterações verificadas</div></div><div class="gov-kpi"><div class="gov-kpi-label">Últimos 7 dias</div><div class="gov-kpi-value" id="gov7">—</div><div class="gov-kpi-note">atividade de governação</div></div><div class="gov-kpi"><div class="gov-kpi-label">Críticas</div><div class="gov-kpi-value" id="govCritical">—</div><div class="gov-kpi-note">no período filtrado</div></div><div class="gov-kpi"><div class="gov-kpi-label">Utilizadores</div><div class="gov-kpi-value" id="govUsers">—</div><div class="gov-kpi-note">com atividade no período</div></div></div>
 <div class="gov-filters"><input class="gov-input" id="govSearch" placeholder="Pesquisar ação, detalhe, recurso…" oninput="governanceRender()"><select class="gov-select" id="govPeriod" onchange="governanceRender()"><option value="7">Últimos 7 dias</option><option value="1">Últimas 24 horas</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="0">Todo o histórico disponível</option></select><select class="gov-select" id="govUser" onchange="governanceRender()"><option value="">Todos os utilizadores</option></select><select class="gov-select" id="govHotel" onchange="governanceRender()"><option value="">Todos os hotéis</option></select><select class="gov-select" id="govCategory" onchange="governanceRender()"><option value="">Todas as categorias</option></select></div>
 <div class="gov-card"><div class="gov-card-head"><div><div class="gov-card-title">Trilho de alterações</div><div class="gov-card-meta" id="govMeta">A carregar…</div></div><div class="gov-integrity">● eventos verdes = verificados no servidor</div></div><div class="gov-table-wrap"><table class="gov-table"><thead><tr><th>Data</th><th>Utilizador</th><th>Hotel</th><th>Categoria</th><th>Ação</th><th>Recurso</th><th>Integridade</th></tr></thead><tbody id="govBody"><tr><td colspan="7"><div class="gov-loading">A carregar auditoria…</div></td></tr></tbody></table></div></div>
 </div>`;
 }return root;}
function options(){
 const set=(id,vals,label)=>{const el=document.getElementById(id);if(!el)return;const prev=el.value;el.innerHTML=`<option value="">${label}</option>`+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');if(vals.includes(prev))el.value=prev;};
 set('govUser',[...new Set(GOV_ROWS.map(r=>r.name||r.user).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt')),'Todos os utilizadores');
 set('govHotel',[...new Set(GOV_ROWS.map(r=>r.hotel).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt')),'Todos os hotéis');
 set('govCategory',[...new Set(GOV_ROWS.map(r=>r.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt')),'Todas as categorias');
}
function filtered(){
 const days=Number(document.getElementById('govPeriod')?.value||7),q=norm(document.getElementById('govSearch')?.value),u=document.getElementById('govUser')?.value||'',h=document.getElementById('govHotel')?.value||'',c=document.getElementById('govCategory')?.value||'';
 return GOV_ROWS.filter(r=>{if(days&&ageDays(r.serverTs)>days)return false;if(u&&(r.name||r.user)!==u)return false;if(h&&r.hotel!==h)return false;if(c&&r.category!==c)return false;if(q&&!norm([r.action,r.detail,r.resource,r.key,r.name,r.user,r.hotel,r.category].join(' ')).includes(q))return false;return true;});
}
function detailHtml(r){const changes=Array.isArray(r.changes)?r.changes:[];const diff=changes.length?`<div class="gov-diff"><div class="h">Campo</div><div class="h">Antes</div><div class="h">Depois</div>${changes.map(x=>`<div class="gov-path">${esc(x.path)}</div><div>${esc(value(x.before))}</div><div>${esc(value(x.after))}</div>`).join('')}</div>`:'<div style="font-size:10px;color:var(--text-3)">Sem diferenças estruturadas disponíveis para este evento.</div>';
 const meta=r.meta&&Object.keys(r.meta).length?`<div style="margin-top:10px;font-size:9px;color:var(--text-3)">${Object.entries(r.meta).map(([k,v])=>`<b>${esc(k)}:</b> ${esc(value(v))}`).join(' · ')}</div>`:'';
 return `<div class="gov-detail ${GOV_OPEN===r.id?'open':''}" id="govDetail-${esc(r.id)}"><div class="gov-detail-head"><span><b>ID:</b> ${esc(r.id)}</span><span><b>Detalhe:</b> ${esc(r.detail||'—')}</span><span><b>Chave:</b> ${esc(r.key||'—')}</span></div>${diff}${meta}</div>`;}
function render(){shell();if(!allowed()){const root=document.getElementById('governanceRoot');if(root)root.innerHTML='<div class="gov-empty">Área reservada à Direção de Operações.</div>';return;}
 const rows=filtered(),verified=rows.filter(r=>r.verified!==false),crit=rows.filter(r=>r.severity==='critical').length,users=new Set(rows.map(r=>r.user).filter(Boolean)).size;
 const e=(id,v)=>{const x=document.getElementById(id);if(x)x.textContent=String(v)};e('gov24',GOV_ROWS.filter(r=>r.verified!==false&&ageDays(r.serverTs)<=1).length);e('gov7',GOV_ROWS.filter(r=>r.verified!==false&&ageDays(r.serverTs)<=7).length);e('govCritical',crit);e('govUsers',users);
 const meta=document.getElementById('govMeta');if(meta)meta.textContent=`${rows.length} eventos no filtro · ${verified.length} verificados no servidor · histórico máximo apresentado: ${GOV_ROWS.length}`;
 const body=document.getElementById('govBody');if(!body)return;if(!rows.length){body.innerHTML='<tr><td colspan="7"><div class="gov-empty">Sem eventos para os filtros selecionados.</div></td></tr>';return;}
 body.innerHTML=rows.map(r=>{const sev=r.severity==='critical'?'gov-sev-critical':r.severity==='warning'?'gov-sev-warning':'';const integrity=r.verified!==false?'<span class="gov-badge gov-verified">● Servidor</span>':'<span class="gov-badge gov-legacy">Histórico</span>';return `<tr class="gov-row" onclick="governanceToggle('${esc(r.id)}')"><td class="gov-time">${esc(fmtTime(r.serverTs))}</td><td><b>${esc(r.name||r.user||'—')}</b><div style="font-size:8px;color:var(--text-3)">${esc(r.user||'')}</div></td><td>${esc(r.hotel||'—')}</td><td><span class="gov-badge ${sev}">${esc(r.category||'Sistema')}</span></td><td><b>${esc(r.action||'Alteração')}</b><div style="font-size:8px;color:var(--text-3);max-width:360px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.detail||'')}</div></td><td><span style="font-family:var(--mono);font-size:8px">${esc(r.resource||'—')}</span></td><td>${integrity}</td></tr><tr class="gov-detail-row"><td colspan="7">${detailHtml(r)}</td></tr>`}).join('');
}
async function load(force){shell();if(!allowed()){render();return;}if(GOV_LOADED&&!force){render();return;}const body=document.getElementById('govBody');if(body)body.innerHTML='<tr><td colspan="7"><div class="gov-loading">A obter trilho de auditoria do servidor…</div></td></tr>';try{const j=await api();GOV_ROWS=Array.isArray(j.data)?j.data:[];GOV_LOADED=true;options();render();}catch(e){if(e.status===401&&typeof window.vgAuthHandleUnauthorized==='function')window.vgAuthHandleUnauthorized();if(body)body.innerHTML=`<tr><td colspan="7"><div class="gov-empty">${esc(e.message||'Não foi possível carregar a auditoria.')}</div></td></tr>`;}}
function toggle(id){GOV_OPEN=GOV_OPEN===id?'':id;document.querySelectorAll('.gov-detail').forEach(el=>el.classList.toggle('open',el.id==='govDetail-'+GOV_OPEN));}
function csv(){const rows=filtered();if(!rows.length)return;const cols=['serverTs','user','name','hotel','category','action','resource','key','severity','verified','detail'];const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const text='\ufeff'+[cols.join(';'),...rows.map(r=>cols.map(c=>q(r[c])).join(';'))].join('\n');const blob=new Blob([text],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='VG_Auditoria_'+new Date().toISOString().slice(0,10)+'.csv';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);}
window.governanceRender=render;window.governanceLoad=load;window.governanceToggle=toggle;window.governanceExportCsv=csv;
// V19: API de leitura apenas para a Pesquisa Global. Nunca expõe dados a perfis
// que não tenham acesso à própria página de governação.
window.vgGovernanceRows=()=>allowed()?JSON.parse(JSON.stringify(GOV_ROWS)):[];
window.vgGovernanceEnsureLoaded=async function(force){if(!allowed())return[];await load(!!force);return JSON.parse(JSON.stringify(GOV_ROWS));};
})();
