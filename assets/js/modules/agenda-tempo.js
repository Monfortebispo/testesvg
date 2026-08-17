// ── CALENDAR ──────────────────────────────────────────────
let calYear = 2026;
let calMonth = 0; // 0-based
let calEvents = {}; // key: "YYYY-MM-DD", value: [string, ...]
let calSelectedDate = null;

// Portuguese national holidays (date: name)
function calGetHolidays(year) {
  const h = {};
  const add = (m, d, name, regional) => { h[`${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`] = { name, regional: regional||false }; };
  // Fixed national holidays
  add(1,1,'Ano Novo');
  add(4,25,'25 de Abril');
  add(5,1,'Dia do Trabalhador');
  add(6,10,'Dia de Portugal');
  add(8,15,'Assunção de Nossa Senhora');
  add(10,5,'Implantação da República');
  add(11,1,'Dia de Todos os Santos');
  add(12,1,'Restauração da Independência');
  add(12,8,'Imaculada Conceição');
  add(12,25,'Natal');
  // Easter-based (2026: Easter = 5 April)
  const easter = calEaster(year);
  const e = new Date(easter);
  const addE = (offset, name) => {
    const d = new Date(e); d.setDate(d.getDate() + offset);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    h[key] = { name, regional: false };
  };
  addE(-2, 'Sexta-Feira Santa');
  addE(0,  'Páscoa');
  addE(60, 'Corpo de Deus');
  // Regional — Açores (1 Jul), Madeira (1 Jul municipio, 26 Jul Madeira Day)
  add(7,1,'Dia da Região Açores',true);
  add(7,26,'Dia da Região Madeira',true);
  add(6,13,'Santo António — Lisboa',true);
  add(6,24,'São João — Porto',true);
  return h;
}

function calEaster(year) {
  // Anonymous Gregorian algorithm
  const a = year % 19, b = Math.floor(year/100), c = year % 100;
  const d = Math.floor(b/4), e = b % 4, f = Math.floor((b+8)/25);
  const g = Math.floor((b-f+1)/3), h = (19*a+b-d-g+15) % 30;
  const i = Math.floor(c/4), k = c % 4, l = (32+2*e+2*i-h-k) % 7;
  const m = Math.floor((a+11*h+22*l)/451);
  const month = Math.floor((h+l-7*m+114)/31);
  const day = ((h+l-7*m+114) % 31) + 1;
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

function calRender() {
  const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  document.getElementById('calTitle').textContent = `${MONTH_NAMES[calMonth]} ${calYear}`;
  document.getElementById('calYearSel').value = calYear;

  const holidays = calGetHolidays(calYear);
  const now2 = new Date();
  const today = `${now2.getFullYear()}-${String(now2.getMonth()+1).padStart(2,'0')}-${String(now2.getDate()).padStart(2,'0')}`;
  const firstDay = new Date(calYear, calMonth, 1);
  const lastDay  = new Date(calYear, calMonth+1, 0);
  // Monday-first: shift day of week
  const startDow = (firstDay.getDay() + 6) % 7; // 0=Mon
  const totalCells = Math.ceil((startDow + lastDay.getDate()) / 7) * 7;

  let html = '';
  for (let i = 0; i < totalCells; i++) {
    const dayOffset = i - startDow;
    const date = new Date(calYear, calMonth, dayOffset + 1);
    const isThisMonth = date.getMonth() === calMonth;
    // Use local date parts to avoid UTC offset shifting the day
    const yy = date.getFullYear();
    const mm = String(date.getMonth()+1).padStart(2,'0');
    const dd = String(date.getDate()).padStart(2,'0');
    const dateStr = `${yy}-${mm}-${dd}`;
    const dow = date.getDay(); // 0=Sun,6=Sat
    const isWeekend = dow === 0 || dow === 6;
    const holiday = holidays[dateStr];
    const events = calEvents[dateStr] || [];
    const isToday = dateStr === today;

    let cls = 'cal-day';
    if (!isThisMonth) cls += ' other-month';
    if (isToday) cls += ' today';
    if (isWeekend) cls += ' weekend';
    if (holiday) cls += ' holiday';

    const evHtml = events.slice(0,2).map(ev =>
      `<span class="cal-day-event" onclick="event.stopPropagation();calOpenModal('${dateStr}')">${ev}</span>`
    ).join('');
    const moreHtml = events.length > 2 ? `<span class="cal-day-event">+${events.length-2} mais</span>` : '';
    const holHtml = holiday ? `<div class="cal-day-holiday${holiday.regional?' regional':''}">${holiday.name}</div>` : '';

    html += `<div class="${cls}" onclick="calOpenModal('${dateStr}')">
      <span class="cal-day-num">${date.getDate()}</span>
      ${holHtml}${evHtml}${moreHtml}
    </div>`;
  }

  document.getElementById('calDays').innerHTML = html;
}

function calNav(dir) {
  calMonth += dir;
  if (calMonth < 0)  { calMonth = 11; calYear--; }
  if (calMonth > 11) { calMonth = 0;  calYear++; }
  document.getElementById('calYearSel').value = calYear;
  calRender();
}

function calSetYear(y) {
  calYear = parseInt(y);
  calRender();
}

function calOpenModal(dateStr) {
  calSelectedDate = dateStr;
  const d = new Date(dateStr + 'T12:00:00');
  const opts = { weekday:'long', day:'numeric', month:'long', year:'numeric' };
  document.getElementById('calModalDate').textContent = d.toLocaleDateString('pt-PT', opts);
  document.getElementById('calEventInput').value = '';
  calRenderEventsList();
  document.getElementById('calModal').classList.add('open');
  setTimeout(() => document.getElementById('calEventInput').focus(), 100);
}

function calCloseModal() {
  document.getElementById('calModal').classList.remove('open');
  calSelectedDate = null;
  calRender();
}

function calRenderEventsList() {
  const evs = calEvents[calSelectedDate] || [];
  const list = document.getElementById('calEventsList');
  list.innerHTML = evs.map((ev, i) =>
    `<div class="cal-event-item">
      <span>${ev}</span>
      <button class="cal-event-del" onclick="calDeleteEvent(${i})" title="Remover">✕</button>
    </div>`
  ).join('') || '<div style="color:var(--text-3);font-size:11px;padding:4px 0">Sem eventos neste dia.</div>';
}

function calSaveEvent() {
  const val = document.getElementById('calEventInput').value.trim();
  if (!val || !calSelectedDate) return;
  if (!calEvents[calSelectedDate]) calEvents[calSelectedDate] = [];
  calEvents[calSelectedDate].push(val);
  document.getElementById('calEventInput').value = '';
  calRenderEventsList();
  calSaveEventsIDB();
}

function calDeleteEvent(idx) {
  if (!calSelectedDate || !calEvents[calSelectedDate]) return;
  calEvents[calSelectedDate].splice(idx, 1);
  if (!calEvents[calSelectedDate].length) delete calEvents[calSelectedDate];
  calRenderEventsList();
  calSaveEventsIDB();
}

async function calSaveEventsIDB() {
  try {
    const db = await idbOpen();
    await idbPut(db, 'calEvents', calEvents);
    db.close();
  } catch(e) {}
}

async function calLoadEventsIDB() {
  try {
    const db = await idbOpen();
    const saved = await idbGet(db, 'calEvents');
    db.close();
    if (saved) calEvents = saved;
  } catch(e) {}
}

// Init calendar on DOMContentLoaded (added to boot below)
function calInit() {
  // Start at current month
  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();
  calLoadEventsIDB().then(() => calRender());
  wxInit();
}



// ── TEMPO POR HOTEL ──────────────────────────────────────
const WX_HOTELS = [
  {hotel:'PORTO RIBEIRA', label:'VG Porto Ribeira', city:'Porto', lat:41.1496, lon:-8.6109},
  {hotel:'PORTO', label:'VG Porto', city:'Porto', lat:41.1579, lon:-8.6291},
  {hotel:'ISLA CANELA', label:'VG Isla Canela', city:'Isla Canela', lat:37.1789, lon:-7.3746},
  {hotel:'COLLECTION PONTE DE LIMA VINEYARDS', label:'VGC Ponte de Lima Vineyards', city:'Ponte de Lima', lat:41.7672, lon:-8.5839},
  {hotel:'COLLECTION FIGUEIRA DA FOZ', label:'VG Collection Figueira da Foz', city:'Figueira da Foz', lat:40.1509, lon:-8.8618},
  {hotel:'COLLECTION BRAGA', label:'VG Collection Braga', city:'Braga', lat:41.5454, lon:-8.4265},
  {hotel:'DOURO VINEYARDS', label:'VG Douro Vineyards', city:'Armamar / Douro', lat:41.1073, lon:-7.6942},
  {hotel:'COLLECTION DOURO', label:'VG Collection Douro', city:'Lamego / Douro', lat:41.1621, lon:-7.7890},
  {hotel:'COLLECTION SERRA DA ESTRELA', label:'VG Serra da Estrela', city:'Manteigas', lat:40.4026, lon:-7.5390},
  {hotel:'COIMBRA', label:'VG Coimbra', city:'Coimbra', lat:40.2033, lon:-8.4103},
  {hotel:'COLLECTION TOMAR', label:'VG Tomar', city:'Tomar', lat:39.6037, lon:-8.4097},
  {hotel:'COLLECTION SINTRA', label:'VG Sintra', city:'Sintra', lat:38.8029, lon:-9.3817},
  {hotel:'ERICEIRA', label:'VG Ericeira', city:'Ericeira', lat:38.9627, lon:-9.4156},
  {hotel:'CASCAIS', label:'VG Cascais', city:'Cascais', lat:38.6979, lon:-9.4215},
  {hotel:'COLLECTION PALACIO DOS ARCOS', label:'VG Collection Palácio dos Arcos', city:'Paço de Arcos', lat:38.6954, lon:-9.2914},
  {hotel:'SANTA CRUZ', label:'VG Santa Cruz', city:'Santa Cruz, Madeira', lat:32.6887, lon:-16.7939},
  {hotel:'ESTORIL', label:'VG Estoril', city:'Estoril', lat:38.7057, lon:-9.3977},
  {hotel:'OPERA', label:'VG Ópera', city:'Lisboa', lat:38.7037, lon:-9.1793},
  {hotel:'CASAS DE ELVAS', label:"VG Casas d'Elvas", city:'Elvas', lat:38.8815, lon:-7.1635},
  {hotel:'COLLECTION ELVAS', label:'VG Collection Elvas', city:'Elvas', lat:38.8803, lon:-7.1628},
  {hotel:'COLLECTION ALTER REAL', label:'VG Collection Alter Real', city:'Alter do Chão', lat:39.1974, lon:-7.6594},
  {hotel:'EVORA', label:'VG Évora', city:'Évora', lat:38.5714, lon:-7.9135},
  {hotel:'COLLECTION MONTE DO VILAR', label:'VG Monte do Vilar', city:'Beja / Alentejo', lat:37.9643, lon:-7.8727},
  {hotel:'ALENTEJO VINEYARDS', label:'VG Alentejo Vineyards', city:'Beja / Alentejo', lat:37.9249, lon:-7.7324},
  {hotel:'NEP KIDS', label:'VG NEP Kids', city:'Beja', lat:38.0151, lon:-7.8632},
  {hotel:'TAVIRA', label:'VG Tavira', city:'Tavira', lat:37.1262, lon:-7.6490},
  {hotel:'MARINA', label:'VG Marina', city:'Vilamoura', lat:37.0776, lon:-8.1177},
  {hotel:'ALBACORA', label:'VG Albacora', city:'Tavira', lat:37.1196, lon:-7.6296},
  {hotel:'COLLECTION PRAIA', label:'VG Collection Praia', city:'Galé / Albufeira', lat:37.0811, lon:-8.3182},
  {hotel:'AMPALIUS', label:'VG Ampalius', city:'Vilamoura', lat:37.0736, lon:-8.1179},
  {hotel:'CERRO ALAGOA', label:'VG Cerro Alagoa', city:'Albufeira', lat:37.0916, lon:-8.2507},
  {hotel:'ATLANTICO', label:'VG Atlântico', city:'Galé / Albufeira', lat:37.0831, lon:-8.3188},
  {hotel:'NAUTICO', label:'VG Náutico', city:'Armação de Pêra', lat:37.1034, lon:-8.3622},
  {hotel:'LAGOS', label:'VG Lagos', city:'Lagos', lat:37.1028, lon:-8.6742},
  {hotel:'COLLECTION S. MIGUEL', label:'VG S. Miguel', city:'Ponta Delgada, Açores', lat:37.7394, lon:-25.6687}
];

function wxCodeInfo(code){
  const map = {
    0:['☀️','Céu limpo'], 1:['🌤️','Pouco nublado'], 2:['⛅','Parcialmente nublado'], 3:['☁️','Nublado'],
    45:['🌫️','Nevoeiro'], 48:['🌫️','Nevoeiro gelado'],
    51:['🌦️','Chuvisco fraco'], 53:['🌦️','Chuvisco'], 55:['🌧️','Chuvisco forte'],
    61:['🌧️','Chuva fraca'], 63:['🌧️','Chuva'], 65:['🌧️','Chuva forte'],
    71:['🌨️','Neve fraca'], 73:['🌨️','Neve'], 75:['❄️','Neve forte'],
    80:['🌦️','Aguaceiros fracos'], 81:['🌧️','Aguaceiros'], 82:['⛈️','Aguaceiros fortes'],
    95:['⛈️','Trovoada'], 96:['⛈️','Trovoada com granizo'], 99:['⛈️','Trovoada forte']
  };
  return map[code] || ['🌡️','Tempo variável'];
}

function wxInit(){
  const sel = document.getElementById('wxHotelSelect');
  if (!sel) return;
  sel.innerHTML = WX_HOTELS.map((h,i)=>`<option value="${i}">${h.label} — ${h.city}</option>`).join('');
  const saved = localStorage.getItem('vg_wx_hotel_idx');
  if (saved !== null && WX_HOTELS[+saved]) sel.value = saved;
  wxLoadSelected();
}

async function wxLoadSelected(){
  const sel = document.getElementById('wxHotelSelect');
  const panel = document.getElementById('wxPanel');
  if (!sel || !panel) return;
  const idx = +sel.value || 0;
  const h = WX_HOTELS[idx] || WX_HOTELS[0];
  localStorage.setItem('vg_wx_hotel_idx', String(idx));
  panel.innerHTML = `<div class="wx-status">A carregar previsão para ${h.label}...</div>`;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${h.lat}&longitude=${h.lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=3`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    const c = data.current || {};
    const info = wxCodeInfo(c.weather_code);
    const daily = data.daily || {};
    const days = (daily.time || []).slice(0,3).map((d,i)=>{
      const di = wxCodeInfo((daily.weather_code || [])[i]);
      const dt = new Date(d+'T12:00:00');
      const day = dt.toLocaleDateString('pt-PT',{weekday:'short'}).replace('.','');
      const max = Math.round((daily.temperature_2m_max || [])[i] ?? 0);
      const min = Math.round((daily.temperature_2m_min || [])[i] ?? 0);
      return `<div class="wx-day"><div class="wx-day-name">${day}</div><div class="wx-day-ico">${di[0]}</div><div class="wx-day-temp">${min}° / ${max}°</div></div>`;
    }).join('');
    const updated = c.time ? new Date(c.time).toLocaleString('pt-PT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : 'agora';
    panel.innerHTML = `
      <div class="wx-current">
        <div class="wx-icon">${info[0]}</div>
        <div><div class="wx-temp">${Math.round(c.temperature_2m ?? 0)}°C</div><div class="wx-desc">${info[1]} · ${h.city}</div></div>
      </div>
      <div class="wx-meta">
        <div class="wx-mini"><div class="wx-mini-lbl">Humidade</div><div class="wx-mini-val">${Math.round(c.relative_humidity_2m ?? 0)}%</div></div>
        <div class="wx-mini"><div class="wx-mini-lbl">Vento</div><div class="wx-mini-val">${Math.round(c.wind_speed_10m ?? 0)} km/h</div></div>
        <div class="wx-mini"><div class="wx-mini-lbl">Precipitação</div><div class="wx-mini-val">${(c.precipitation ?? 0).toFixed(1)} mm</div></div>
        <div class="wx-mini"><div class="wx-mini-lbl">Atualizado</div><div class="wx-mini-val" style="font-size:12px">${updated}</div></div>
      </div>
      <div class="wx-forecast">${days}</div>
      <div class="wx-sub" style="margin-top:12px">Fonte: Open-Meteo · previsão automática pela localização do hotel.</div>`;
  } catch(e) {
    panel.innerHTML = `<div class="wx-status">Não foi possível carregar a meteorologia neste momento. Verifica a ligação à internet e tenta novamente.</div>`;
  }
}

// ==========================================================
// END AGENDA & TEMPO MODULE
// ==========================================================

