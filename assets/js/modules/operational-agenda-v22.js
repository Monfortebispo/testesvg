// ==========================================================
// VG DASHBOARD V22 — AGENDA OPERACIONAL
// Agenda partilhada + prazos derivados das Ações.
// Eventos manuais são persistidos no servidor com permissões.
// ==========================================================
(function(){
  'use strict';
  window.VG=window.VG||{};
  if(window.VG.agenda?.version>=22)return;

  const TYPES={
    action:{label:'Ação / Prazo',icon:'✓'},
    audit:{label:'Auditoria',icon:'◎'},
    visit:{label:'Visita',icon:'🏨'},
    meeting:{label:'Reunião',icon:'👥'},
    deadline:{label:'Prazo',icon:'⏱'},
    operational:{label:'Operacional',icon:'◆'},
    other:{label:'Outro',icon:'•'}
  };
  const state={loaded:false,loading:null,fetchedAt:0,manual:[],month:null,year:null,view:'calendar',hotel:'',type:'all',query:'',editing:null,renderTimer:null};
  const REFRESH_MS=30000;
  const esc=v=>window.VG?.util?.escapeHtml?window.VG.util.escapeHtml(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const currentUser=()=>{try{return typeof window.vgAuthCurrent==='function'?window.vgAuthCurrent():null;}catch(e){return null;}};
  const isDirection=()=>{const u=currentUser();return !!u&&['direcao','admin'].includes(u.role);};
  const pad=n=>String(n).padStart(2,'0');
  const localISO=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const todayISO=()=>localISO(new Date());
  const dateObj=v=>{if(!v)return null;const d=new Date(String(v).slice(0,10)+'T12:00:00');return isNaN(d)?null:d;};
  const fmtDate=v=>{const d=dateObj(v);return d?d.toLocaleDateString('pt-PT',{day:'2-digit',month:'short',year:'numeric'}):'—';};
  const fmtDay=v=>{const d=dateObj(v);return d?d.toLocaleDateString('pt-PT',{weekday:'short',day:'2-digit',month:'short'}):'—';};
  const fmtDateTime=v=>{if(!v)return '—';const d=new Date(v);return isNaN(d)?v:d.toLocaleString('pt-PT',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});};
  const timeLabel=e=>e.allDay||!e.startTime?'Dia inteiro':e.endTime?`${e.startTime}–${e.endTime}`:e.startTime;
  const isActionActive=a=>a&& !['resolved','closed','cancelled'].includes(String(a.status||'').toLowerCase());
  const canManage=e=>{const u=currentUser();if(!u||e?.source==='action')return false;if(isDirection())return true;const hotelOk=typeof window.vgAuthCanAccessHotel==='function'?window.vgAuthCanAccessHotel(e?.hotel):(Array.isArray(u.hotels)?u.hotels:[u.hotel]).some(x=>norm(e?.hotel)===norm(x));return hotelOk||String(e?.ownerUser||'').toLowerCase()===String(u.user||'').toLowerCase();};
  const canCreateHotel=h=>{const u=currentUser();if(!u)return false;if(isDirection())return true;if(typeof window.vgAuthCanAccessHotel==='function')return window.vgAuthCanAccessHotel(h);return !!h&&(Array.isArray(u.hotels)?u.hotels:[u.hotel]).some(x=>norm(h)===norm(x));};

  function allHotels(){
    const u=currentUser();if(!u)return [];
    if(!isDirection()){const hs=typeof window.vgAuthHotels==='function'?window.vgAuthHotels():(Array.isArray(u.hotels)?u.hotels:(u.hotel?[u.hotel]:[]));if(hs.length)return hs;}
    let rows=[];
    try{if(typeof RAW!=='undefined'&&RAW){rows=(RAW.hotel_list||Object.keys(RAW.hotels_ops||{})).filter(Boolean);}}catch(e){}
    try{if(typeof window.getActiveHotels==='function'){const a=window.getActiveHotels();if(Array.isArray(a)&&a.length)rows=rows.concat(a);}}catch(e){}
    rows=rows.concat(state.manual.map(x=>x.hotel).filter(Boolean));
    return [...new Set(rows)].sort((a,b)=>String(a).localeCompare(String(b),'pt'));
  }
  function scopeAllowed(h,ownerUser){const u=currentUser();if(!u)return false;if(isDirection())return true;const hotelOk=typeof window.vgAuthCanAccessHotel==='function'?window.vgAuthCanAccessHotel(h):(Array.isArray(u.hotels)?u.hotels:[u.hotel]).some(x=>norm(h)===norm(x));return hotelOk||String(ownerUser||'').toLowerCase()===String(u.user||'').toLowerCase();}

  async function ensureLoaded(force){
    if(!currentUser())return state.manual;
    if(!force&&state.loaded&&Date.now()-state.fetchedAt<REFRESH_MS)return state.manual;
    if(state.loading)return state.loading;
    state.loading=(async()=>{
      try{
        const jobs=[window.VG?.shared?.get?.('ops-agenda')];
        if(window.VG?.actions?.ensureLoaded)jobs.push(window.VG.actions.ensureLoaded(!!force));
        if(window.VG?.actions?.ensureAssignees)jobs.push(window.VG.actions.ensureAssignees(!!force));
        const r=await Promise.allSettled(jobs);
        const agenda=r[0]?.status==='fulfilled'?r[0].value:null;
        state.manual=Array.isArray(agenda?.data)?agenda.data.filter(Boolean):state.manual;
        state.loaded=true;state.fetchedAt=Date.now();
        window.VG.events?.emit('agenda:changed',{reason:'loaded',count:state.manual.length});
      }catch(e){console.warn('Agenda Operacional: carregamento falhou',e);}
      finally{state.loading=null;}
      return state.manual;
    })();
    return state.loading;
  }

  function actionEvents(){
    const rows=[];
    try{
      for(const a of window.VG?.actions?.all?.()||[]){
        if(!isActionActive(a)||!a.dueDate||!scopeAllowed(a.hotel,a.ownerUser))continue;
        rows.push({
          id:'action:'+a.id,source:'action',sourceId:a.id,readOnly:true,type:'action',hotel:a.hotel||'',
          title:a.sourceTitle||a.title||'Ação operacional',date:a.dueDate,startTime:'',endTime:'',allDay:true,
          notes:(a.sourceReasons||[]).join(' · '),ownerUser:a.ownerUser||'',ownerName:a.ownerName||'',status:a.status||'open',
          overdue:a.dueDate<todayISO(),updatedAt:a.updatedAt||'',createdAt:a.createdAt||''
        });
      }
    }catch(e){}
    return rows;
  }
  function combined(){
    return [...state.manual.filter(e=>scopeAllowed(e.hotel,e.ownerUser)),...actionEvents()].sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.startTime||'').localeCompare(String(b.startTime||''))||String(a.title||'').localeCompare(String(b.title||''),'pt'));
  }
  function filtered(){
    const q=norm(state.query),h=norm(state.hotel),t=state.type;
    return combined().filter(e=>{
      if(h&&norm(e.hotel)!==h)return false;
      if(t!=='all'&&e.type!==t)return false;
      if(q&&!norm([e.title,e.hotel,e.notes,e.ownerName,TYPES[e.type]?.label].filter(Boolean).join(' ')).includes(q))return false;
      return true;
    });
  }
  function monthRows(){return filtered().filter(e=>{const d=dateObj(e.date);return d&&d.getFullYear()===state.year&&d.getMonth()===state.month;});}
  function stats(){
    const rows=filtered(),today=todayISO(),end7=new Date();end7.setDate(end7.getDate()+7);const end7s=localISO(end7);
    const month=rows.filter(e=>{const d=dateObj(e.date);return d&&d.getMonth()===state.month&&d.getFullYear()===state.year;});
    return {
      today:rows.filter(e=>e.date===today).length,
      next7:rows.filter(e=>e.date>=today&&e.date<=end7s).length,
      overdue:rows.filter(e=>e.source==='action'&&e.overdue).length,
      month:month.length
    };
  }
  function buildModel(){return {rows:filtered().map(clone),monthRows:monthRows().map(clone),stats:stats(),month:state.month,year:state.year,hotel:state.hotel,type:state.type,query:state.query};}

  function initDate(){if(state.month!=null&&state.year!=null)return;const d=new Date();state.month=d.getMonth();state.year=d.getFullYear();}
  function monthTitle(){return new Date(state.year,state.month,1).toLocaleDateString('pt-PT',{month:'long',year:'numeric'}).replace(/^./,x=>x.toUpperCase());}
  function holidayMap(){try{return typeof window.calGetHolidays==='function'?window.calGetHolidays(state.year):{};}catch(e){return {};}}
  function typeTag(e){const m=TYPES[e.type]||TYPES.other;return `<span class="vg-agenda-tag">${esc(m.icon)} ${esc(m.label)}</span>`;}

  function renderKpis(){const s=stats();const set=(id,v,n)=>{const el=document.getElementById(id);if(el)el.innerHTML=`<div class="vg-agenda-kpi-label">${esc(n[0])}</div><div class="vg-agenda-kpi-value">${esc(v)}</div><div class="vg-agenda-kpi-note">${esc(n[1])}</div>`;};set('vgAgendaKpiToday',s.today,['Hoje','Compromissos e prazos']);set('vgAgendaKpi7',s.next7,['Próximos 7 dias','Carga operacional próxima']);set('vgAgendaKpiOverdue',s.overdue,['Ações atrasadas','Exigem acompanhamento']);set('vgAgendaKpiMonth',s.month,['No mês','Eventos filtrados']);}
  function renderFilters(){
    const hotel=document.getElementById('vgAgendaHotel'),type=document.getElementById('vgAgendaType');
    if(hotel){const old=state.hotel;hotel.innerHTML='<option value="">Todos os hotéis</option>'+allHotels().map(h=>`<option value="${esc(h)}">${esc(h)}</option>`).join('');hotel.value=old;}
    if(type){type.innerHTML='<option value="all">Todos os tipos</option>'+Object.entries(TYPES).map(([k,v])=>`<option value="${k}">${esc(v.label)}</option>`).join('');type.value=state.type;}
  }
  function chipHtml(e){const meta=TYPES[e.type]||TYPES.other;return `<button type="button" class="vg-agenda-chip ${esc(e.type)}" data-event="${esc(e.id)}" title="${esc([meta.label,e.title,e.hotel,timeLabel(e)].filter(Boolean).join(' · '))}">${esc(e.startTime?e.startTime+' ':'' )}${esc(e.title)}</button>`;}
  function renderCalendar(){
    const title=document.getElementById('vgAgendaMonthTitle');if(title)title.textContent=monthTitle();
    const box=document.getElementById('vgAgendaDays');if(!box)return;
    const rows=monthRows(),byDate=new Map();for(const e of rows){if(!byDate.has(e.date))byDate.set(e.date,[]);byDate.get(e.date).push(e);}
    const first=new Date(state.year,state.month,1),last=new Date(state.year,state.month+1,0),start=(first.getDay()+6)%7,total=Math.ceil((start+last.getDate())/7)*7,holidays=holidayMap(),today=todayISO();
    let html='';
    for(let i=0;i<total;i++){
      const d=new Date(state.year,state.month,i-start+1),ds=localISO(d),inMonth=d.getMonth()===state.month,events=(byDate.get(ds)||[]),holiday=holidays[ds];
      const cls=['vg-agenda-day',inMonth?'':'other',ds===today?'today':'',holiday?'holiday':''].filter(Boolean).join(' ');
      html+=`<div class="${cls}" data-date="${ds}"><div class="vg-agenda-day-num">${d.getDate()}</div>${holiday?`<div class="vg-agenda-holiday">${esc(holiday.name||holiday)}</div>`:''}${events.slice(0,3).map(chipHtml).join('')}${events.length>3?`<div class="vg-agenda-more">+${events.length-3} mais</div>`:''}</div>`;
    }
    box.innerHTML=html;
  }
  function renderUpcoming(){
    const box=document.getElementById('vgAgendaUpcoming');if(!box)return;const today=todayISO();let rows=filtered().filter(e=>e.date>=today).slice(0,30);
    if(!rows.length){box.innerHTML='<div class="vg-agenda-upcoming-empty">Sem compromissos futuros para os filtros selecionados.</div>';return;}
    const groups=new Map();for(const e of rows){if(!groups.has(e.date))groups.set(e.date,[]);groups.get(e.date).push(e);}
    box.innerHTML=[...groups].map(([date,items])=>`<div class="vg-agenda-date-group"><div class="vg-agenda-date-label">${esc(fmtDay(date))}</div>${items.map(e=>`<div class="vg-agenda-item" data-event="${esc(e.id)}"><span class="vg-agenda-item-dot ${esc(e.type)}"></span><div class="vg-agenda-item-main"><strong>${esc(e.title)}</strong><span>${esc([e.hotel,e.ownerName,TYPES[e.type]?.label].filter(Boolean).join(' · '))}</span></div><span class="vg-agenda-item-time ${e.overdue?'vg-agenda-overdue':''}">${esc(e.overdue?'Atrasada':timeLabel(e))}</span></div>`).join('')}</div>`).join('');
  }
  function renderList(){
    const box=document.getElementById('vgAgendaList');if(!box)return;const rows=filtered();
    box.innerHTML=`<div class="vg-agenda-list-row head"><span>Data</span><span>Tipo</span><span>Evento</span><span>Hotel / Responsável</span><span>Hora</span></div>`+(rows.length?rows.map(e=>`<div class="vg-agenda-list-row" data-event="${esc(e.id)}"><span class="${e.overdue?'vg-agenda-overdue':''}">${esc(fmtDate(e.date))}</span><span>${typeTag(e)}</span><strong>${esc(e.title)}</strong><span>${esc([e.hotel,e.ownerName].filter(Boolean).join(' · '))}</span><span>${esc(e.overdue?'Atrasada':timeLabel(e))}</span></div>`).join(''):'<div class="vg-agenda-upcoming-empty">Sem eventos para os filtros selecionados.</div>');
  }
  function renderMode(){
    const main=document.getElementById('vgAgendaMain'),cal=document.getElementById('vgAgendaCalendarWrap'),list=document.getElementById('vgAgendaListCard');
    main?.classList.toggle('list-mode',state.view==='list');cal?.classList.toggle('hidden',state.view==='list');list?.classList.toggle('active',state.view==='list');
    document.querySelectorAll('#vgAgendaViewToggle button').forEach(b=>b.classList.toggle('active',b.dataset.mode===state.view));
  }
  function render(){initDate();renderKpis();renderFilters();renderCalendar();renderUpcoming();renderList();renderMode();const meta=document.getElementById('vgAgendaMeta');if(meta)meta.textContent=`${filtered().length} referência(s) · atualizado ${new Date().toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})}`;}
  function scheduleRender(){clearTimeout(state.renderTimer);state.renderTimer=setTimeout(render,30);}

  function navMonth(dir){state.month+=dir;if(state.month<0){state.month=11;state.year--;}if(state.month>11){state.month=0;state.year++;}render();}
  function goToday(){const d=new Date();state.month=d.getMonth();state.year=d.getFullYear();render();}
  function setFilter(kind,val){state[kind]=val;render();}
  function setViewMode(v){state.view=v==='list'?'list':'calendar';render();}

  function eventById(id){return combined().find(e=>String(e.id)===String(id))||null;}
  function openItem(id){const e=eventById(id);if(!e)return;if(e.source==='action'){window.VG?.actions?.openById?.(e.sourceId);return;}openEditor(e);}
  function ownerOptions(hotel,selected){
    let rows=[];try{rows=window.VG?.actions?.assignees?.()||[];}catch(e){}
    const u=currentUser();
    if(u&&!rows.some(x=>String(x.user)===String(u.user)))rows.push({user:u.user,name:u.name,hotel:u.hotel,hotels:Array.isArray(u.hotels)?u.hotels:[],active:true});
    rows=rows.filter(x=>x&&x.active!==false&&(isDirection()||String(x.user)===String(u?.user)||norm(x.hotel)===norm(hotel)||String(x.user)===String(selected||'')));
    if(selected&&!rows.some(x=>String(x.user)===String(selected)))rows.push({user:selected,name:selected,hotel});
    return rows.sort((a,b)=>String(a.name||a.user).localeCompare(String(b.name||b.user),'pt'));
  }
  function fillEditor(e,seedDate){
    const u=currentUser(),hotel=e?.hotel||(!isDirection()?u?.hotel:(state.hotel||''));
    document.getElementById('vgAgendaEditorTitle').textContent=e?'Editar evento':'Novo evento';
    document.getElementById('vgAgendaEventTitle').value=e?.title||'';
    const hs=document.getElementById('vgAgendaEventHotel');hs.innerHTML='<option value="">— Selecionar —</option>'+allHotels().map(h=>`<option value="${esc(h)}">${esc(h)}</option>`).join('');hs.value=hotel||'';hs.disabled=!isDirection();
    document.getElementById('vgAgendaEventType').value=e?.type||'operational';
    document.getElementById('vgAgendaEventDate').value=e?.date||seedDate||todayISO();
    document.getElementById('vgAgendaEventStart').value=e?.startTime||'';
    document.getElementById('vgAgendaEventEnd').value=e?.endTime||'';
    document.getElementById('vgAgendaEventNotes').value=e?.notes||'';
    const owner=document.getElementById('vgAgendaEventOwner');const o=ownerOptions(hotel,e?.ownerUser||'');owner.innerHTML='<option value="">— Sem responsável —</option>'+o.map(x=>`<option value="${esc(x.user)}">${esc(x.name||x.user)}</option>`).join('');owner.value=e?.ownerUser||'';
    const editable=!e||canManage(e);['vgAgendaEventTitle','vgAgendaEventHotel','vgAgendaEventType','vgAgendaEventDate','vgAgendaEventStart','vgAgendaEventEnd','vgAgendaEventNotes','vgAgendaEventOwner'].forEach(id=>{const x=document.getElementById(id);if(x)x.disabled=!editable||(id==='vgAgendaEventHotel'&&!isDirection());});
    const del=document.getElementById('vgAgendaDelete');if(del)del.style.display=e&&editable?'inline-flex':'none';const save=document.getElementById('vgAgendaSave');if(save){save.style.display=editable?'inline-flex':'none';save.textContent=e?'Guardar alterações':'Criar evento';}
    const meta=document.getElementById('vgAgendaEditorMeta');if(meta)meta.textContent=e?`Criado ${fmtDateTime(e.createdAt)} · Última alteração ${fmtDateTime(e.updatedAt)}${e.updatedBy?.name?' · '+e.updatedBy.name:''}`:'O evento ficará partilhado com os utilizadores autorizados para o hotel.';
  }
  function openEditor(e,seedDate){if(e?.source==='action'){openItem(e.id);return;}state.editing=e?clone(e):null;fillEditor(e,seedDate);document.getElementById('vgAgendaModal')?.classList.add('open');}
  function closeEditor(){state.editing=null;document.getElementById('vgAgendaModal')?.classList.remove('open');}
  async function saveEditor(){
    const existing=state.editing,hotel=document.getElementById('vgAgendaEventHotel')?.value||'';
    if(!canCreateHotel(hotel)&&!canManage(existing)){window.showToast?.('Sem permissão para criar ou alterar este evento.',true);return;}
    const payload={
      id:existing?.id||'',expectedUpdatedAt:existing?.updatedAt||'',hotel,
      title:document.getElementById('vgAgendaEventTitle')?.value||'',type:document.getElementById('vgAgendaEventType')?.value||'operational',
      date:document.getElementById('vgAgendaEventDate')?.value||'',startTime:document.getElementById('vgAgendaEventStart')?.value||'',endTime:document.getElementById('vgAgendaEventEnd')?.value||'',
      notes:document.getElementById('vgAgendaEventNotes')?.value||'',ownerUser:document.getElementById('vgAgendaEventOwner')?.value||''
    };
    if(!payload.title.trim()){window.showToast?.('Indica o título do evento.',true);return;}if(!payload.hotel){window.showToast?.('Seleciona o hotel.',true);return;}if(!payload.date){window.showToast?.('Indica a data.',true);return;}
    const btn=document.getElementById('vgAgendaSave');if(btn){btn.disabled=true;btn.textContent='A guardar…';}
    try{const r=await window.VG.shared.post('ops-agenda-save',null,payload);if(!r?.data)throw new Error('Resposta inválida.');const i=state.manual.findIndex(x=>x.id===r.data.id);if(i>=0)state.manual[i]=r.data;else state.manual.push(r.data);state.loaded=true;state.fetchedAt=Date.now();closeEditor();render();window.VG.events?.emit('agenda:changed',{reason:'saved',event:clone(r.data)});window.showToast?.('Evento guardado na Agenda Operacional.');}
    catch(e){console.warn('Agenda: guardar',e);window.showToast?.('Não foi possível guardar o evento: '+(e.message||e),true);if(String(e.message||e).includes('alterado por outro'))await ensureLoaded(true);}
    finally{if(btn){btn.disabled=false;btn.textContent=existing?'Guardar alterações':'Criar evento';}}
  }
  async function deleteEditor(){
    const e=state.editing;if(!e||!canManage(e))return;if(!window.confirm?.(`Eliminar "${e.title}" da Agenda Operacional?`))return;
    const btn=document.getElementById('vgAgendaDelete');if(btn)btn.disabled=true;
    try{await window.VG.shared.post('ops-agenda-delete',null,{id:e.id,expectedUpdatedAt:e.updatedAt});state.manual=state.manual.filter(x=>x.id!==e.id);closeEditor();render();window.VG.events?.emit('agenda:changed',{reason:'deleted',id:e.id});window.showToast?.('Evento eliminado.');}
    catch(err){window.showToast?.('Não foi possível eliminar o evento: '+(err.message||err),true);}
    finally{if(btn)btn.disabled=false;}
  }

  async function refresh(force){await ensureLoaded(!!force);render();return buildModel();}
  function bind(){
    const root=document.getElementById('vgAgendaRoot');if(!root||root.dataset.bound==='1')return;root.dataset.bound='1';
    root.addEventListener('click',e=>{
      const ev=e.target.closest('[data-event]');if(ev){e.stopPropagation();openItem(ev.dataset.event);return;}
      const day=e.target.closest('.vg-agenda-day[data-date]');if(day&&canCreateHotel(state.hotel||currentUser()?.hotel)){openEditor(null,day.dataset.date);return;}
      const cmd=e.target.closest('[data-agenda-cmd]');if(!cmd)return;const c=cmd.dataset.agendaCmd;if(c==='prev')navMonth(-1);if(c==='next')navMonth(1);if(c==='today')goToday();if(c==='new')openEditor(null);if(c==='refresh')refresh(true);if(c==='calendar'||c==='list')setViewMode(c);
    });
    document.getElementById('vgAgendaHotel')?.addEventListener('change',e=>setFilter('hotel',e.target.value));
    document.getElementById('vgAgendaType')?.addEventListener('change',e=>setFilter('type',e.target.value));
    document.getElementById('vgAgendaSearch')?.addEventListener('input',e=>{state.query=e.target.value;window.VG?.performance?.schedule?.('agenda-filter',render,100)||render();});
    document.getElementById('vgAgendaModal')?.addEventListener('click',e=>{if(e.target.id==='vgAgendaModal')closeEditor();});
    document.getElementById('vgAgendaClose')?.addEventListener('click',closeEditor);document.getElementById('vgAgendaSave')?.addEventListener('click',saveEditor);document.getElementById('vgAgendaDelete')?.addEventListener('click',deleteEditor);
    window.VG.events?.on?.('actions:changed',scheduleRender);window.VG.events?.on?.('state:changed',scheduleRender);
  }
  async function init(){initDate();bind();const u=currentUser();if(u&&!isDirection()){const hs=typeof window.vgAuthHotels==='function'?window.vgAuthHotels():(Array.isArray(u.hotels)?u.hotels:(u.hotel?[u.hotel]:[]));state.hotel=hs.length===1?hs[0]:'';}render();await ensureLoaded(false);render();try{if(typeof window.wxInit==='function')window.wxInit();}catch(e){}
  }
  function onView(){if((typeof currentView!=='undefined'?currentView:'')!=='agenda')return;init();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{bind();onView();},{once:true});else{bind();onView();}
  window.addEventListener('hashchange',onView);

  window.VG.agenda={version:22,state,ensureLoaded,refresh,all:combined,filtered,buildModel,stats,openEditor,openById:openItem,canManage,canCreateHotel,TYPES};
  window.vgAgendaRefresh=refresh;window.vgAgendaNew=()=>openEditor(null);
  window.VG?.events?.on?.('market:before-change',()=>{state.manual=[];state.loaded=false;state.fetchedAt=0;state.loading=null;state.hotel='';});
  window.VG?.events?.on?.('market:changed',()=>refresh(true));
})();
