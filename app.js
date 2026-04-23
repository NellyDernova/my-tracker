// ===== Storage =====
const STORAGE_KEY = 'my-tracker-v1';
const state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      (s.tasks || []).forEach(t => {
        // migrate: horizon -> dateType
        if (!t.dateType) { t.dateType = t.horizon || 'none'; delete t.horizon; }
        // ensure new fields
        if (t.important === undefined) t.important = false;
        if (t.parentId === undefined) t.parentId = null;
        if (!t.repeatDays) t.repeatDays = [];
        // migrate old inline subtasks -> full tasks with parentId
        if (Array.isArray(t.subtasks) && t.subtasks.length && typeof t.subtasks[0] === 'object' && t.subtasks[0].title !== undefined) {
          t.subtasks.forEach(st => {
            s.tasks.push({
              id: st.id || uid(),
              title: st.title || '',
              description: '',
              projectId: t.projectId || null,
              dateType: 'none',
              date: null,
              status: st.done ? 'done' : 'todo',
              repeat: 'none',
              repeatDays: [],
              attachments: [],
              important: false,
              parentId: t.id,
              createdAt: Date.now(),
            });
          });
          t.subtasks = [];
        }
        if (!Array.isArray(t.subtasks)) t.subtasks = [];
      });
      return s;
    }
  } catch (e) { console.warn(e); }
  return {
    projects: [],
    tasks: [],
    view: 'horizons',
    activeProject: null,
    calendarMonth: null,
  };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    if (e && e.name === 'QuotaExceededError') {
      alert('Хранилище браузера переполнено. Удалите большие файлы из задач.');
    } else { console.error(e); }
  }
}

function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

// ===== Date helpers =====
function todayISO() { return ymd(new Date()); }
function ymd(d) {
  const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function parseISO(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m-1, d);
}
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate()+n); return d; }
function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate()+diff); d.setHours(0,0,0,0);
  return d;
}
function endOfWeek(date) { const d = addDays(startOfWeek(date), 6); d.setHours(23,59,59,999); return d; }
function startOfMonth(date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function endOfMonth(date) { return new Date(date.getFullYear(), date.getMonth()+1, 0); }
function startOfYear(date) { return new Date(date.getFullYear(), 0, 1); }
function endOfYear(date) { return new Date(date.getFullYear(), 11, 31); }
function sameDay(a, b) { return ymd(a) === ymd(b); }
function isoWeekNum(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}

const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const monthShort = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
const dayNames = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
const dayShort = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];

// ===== Recurrence =====
function taskOccursOn(task, date) {
  if (task.dateType === 'none' || task.dateType === 'life') return false;
  if (!task.date) return false;
  const taskDate = parseISO(task.date);
  if (!taskDate) return false;
  if (task.dateType === 'day') {
    if (sameDay(taskDate, date)) return true;
    if (date < taskDate) return false;
    const r = task.repeat;
    if (!r || r === 'none') return false;
    if (r === 'daily') return true;
    if (r === 'weekdays') { const d = date.getDay(); return d >= 1 && d <= 5; }
    if (r === 'weekly') return date.getDay() === taskDate.getDay();
    if (r === 'custom-weekdays') return (task.repeatDays || []).includes(date.getDay());
    if (r === 'monthly') return date.getDate() === taskDate.getDate();
    if (r === 'yearly') return date.getDate() === taskDate.getDate() && date.getMonth() === taskDate.getMonth();
  }
  return false;
}

// ===== Icons (inline SVG) =====
const SVG_REPEAT = `<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#8b6fd8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`;
const SVG_FIRE = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M13.5 2c-.3 1.7-1 3.3-2 4.7-1 1.5-2.2 2.8-3.5 4.1-1 .9-1.9 1.8-2.6 2.8-.7 1-1.1 2.2-1.1 3.4 0 2 .8 3.8 2.2 5.2C7.9 23.4 9.8 24 12 24c2.2 0 4.1-.6 5.5-2 1.4-1.4 2.2-3.2 2.2-5.2 0-1.3-.2-2.6-.7-3.9-.5-1.3-1.1-2.5-1.9-3.6-.9-1.2-1.8-2.4-2.5-3.6-.6-1.2-1-2.5-1.1-3.8zm-.1 12.6c.7.7 1.4 1.5 1.9 2.4.5.9.8 1.9.8 3 0 1.3-.5 2.5-1.4 3.4-.9.9-2.1 1.4-3.4 1.4s-2.5-.5-3.4-1.4c-.9-.9-1.4-2.1-1.4-3.4 0-.9.2-1.7.7-2.4.5-.7 1.1-1.4 1.8-2 .6-.5 1.1-1.1 1.6-1.8.4-.7.7-1.4.8-2.2.3.7.6 1.3 1 1.9.4.4.7.7 1 1.1z"/></svg>`;

// ===== Status helpers =====
const STATUSES = [
  { id: 'todo',        label: 'To Do',       emoji: '📝' },
  { id: 'in-progress', label: 'In Progress', emoji: '⚡' },
  { id: 'done',        label: 'Done',        emoji: '✅' },
];
function statusById(id) { return STATUSES.find(s => s.id === id) || STATUSES[0]; }

// ===== Routing =====
const main = document.getElementById('main');

function setView(view, opts = {}) {
  state.view = view;
  if (view === 'project') state.activeProject = opts.projectId || state.activeProject;
  saveState();
  render();
}

function render() {
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === state.view);
  });
  renderProjectsList();

  switch (state.view) {
    case 'horizons': renderHorizons(); break;
    case 'days': renderDays(); break;
    case 'weeks': renderWeeks(); break;
    case 'years': renderYears(); break;
    case 'calendar': renderCalendar(); break;
    case 'inbox': renderInbox(); break;
    case 'project': renderProject(); break;
    case 'settings': renderSettings(); break;
    default: renderHorizons();
  }
}

// ===== Sidebar projects =====
function renderProjectsList() {
  const list = document.getElementById('projectsList');
  list.innerHTML = '';
  state.projects.forEach((p, idx) => {
    const row = document.createElement('div');
    row.className = 'project-row';
    const isActive = state.view === 'project' && state.activeProject === p.id;
    row.innerHTML = `
      <button class="project-item ${isActive?'active':''}" data-id="${p.id}">
        <span class="emoji">${p.emoji || '📁'}</span><span>${escapeHtml(p.name)}</span>
      </button>
      <div class="project-arrows">
        <button data-up="${p.id}" title="Выше" ${idx===0?'disabled style="opacity:.2"':''}>▲</button>
        <button data-down="${p.id}" title="Ниже" ${idx===state.projects.length-1?'disabled style="opacity:.2"':''}>▼</button>
      </div>
    `;
    row.querySelector('.project-item').addEventListener('click', () => setView('project', { projectId: p.id }));
    row.querySelector(`[data-up="${p.id}"]`).addEventListener('click', e => { e.stopPropagation(); moveProject(p.id, -1); });
    row.querySelector(`[data-down="${p.id}"]`).addEventListener('click', e => { e.stopPropagation(); moveProject(p.id, +1); });
    list.appendChild(row);
  });
}
function moveProject(id, dir) {
  const idx = state.projects.findIndex(p => p.id === id);
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= state.projects.length) return;
  const [p] = state.projects.splice(idx, 1);
  state.projects.splice(newIdx, 0, p);
  saveState(); render();
}

// ===== Task helpers =====
function tasksOnDate(date) {
  return state.tasks.filter(t => taskOccursOn(t, date)).sort(taskSorter);
}
function taskSorter(a, b) {
  // important first, then in-progress, todo, done
  const ai = a.important ? 0 : 1, bi = b.important ? 0 : 1;
  if (ai !== bi) return ai - bi;
  const sOrder = { 'in-progress': 0, 'todo': 1, 'done': 2 };
  return (sOrder[a.status]||1) - (sOrder[b.status]||1);
}
function projectById(id) { return state.projects.find(p => p.id === id); }

function horizonBucket(t, today, tomorrow, weekStart, weekEnd, monthStart, monthEnd, yearStart, yearEnd) {
  if (t.dateType === 'life') return 'life';
  if (t.dateType === 'none') return null;
  if (t.dateType === 'day' && t.date) {
    const d = parseISO(t.date);
    if (sameDay(d, today)) return 'today';
    if (sameDay(d, tomorrow)) return 'tomorrow';
    if (d >= weekStart && d <= weekEnd) return 'week';
    if (d >= monthStart && d <= monthEnd) return 'month';
    if (d >= yearStart && d <= yearEnd) return 'year';
    return null;
  }
  if (t.dateType === 'week' && t.date) {
    const d = parseISO(t.date);
    if (d >= weekStart && d <= weekEnd) return 'week';
    if (d >= monthStart && d <= monthEnd) return 'month';
    if (d >= yearStart && d <= yearEnd) return 'year';
    return null;
  }
  if (t.dateType === 'month' && t.date) {
    const d = parseISO(t.date);
    if (d >= monthStart && d <= monthEnd) return 'month';
    if (d >= yearStart && d <= yearEnd) return 'year';
    return null;
  }
  if (t.dateType === 'year' && t.date) {
    const d = parseISO(t.date);
    if (d >= yearStart && d <= yearEnd) return 'year';
    return null;
  }
  return null;
}

// ===== Horizons =====
function renderHorizons() {
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = addDays(today, 1);
  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(today);
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const yearStart = startOfYear(today);
  const yearEnd = endOfYear(today);

  const buckets = { today: [], tomorrow: [], week: [], month: [], year: [], life: [] };

  state.tasks.forEach(t => {
    if (t.dateType === 'day' && t.date && t.repeat && t.repeat !== 'none') {
      if (taskOccursOn(t, today)) buckets.today.push(t);
      else if (taskOccursOn(t, tomorrow)) buckets.tomorrow.push(t);
      else {
        let placed = false;
        for (let i = 2; i <= 6; i++) {
          if (taskOccursOn(t, addDays(today, i))) { buckets.week.push(t); placed = true; break; }
        }
        if (!placed) {
          const b = horizonBucket(t, today, tomorrow, weekStart, weekEnd, monthStart, monthEnd, yearStart, yearEnd);
          if (b && buckets[b]) buckets[b].push(t);
        }
      }
    } else {
      const b = horizonBucket(t, today, tomorrow, weekStart, weekEnd, monthStart, monthEnd, yearStart, yearEnd);
      if (b && buckets[b]) buckets[b].push(t);
    }
  });

  Object.keys(buckets).forEach(k => buckets[k].sort(taskSorter));

  main.innerHTML = `
    <h1 class="view-title">Horizons</h1>
    <div class="view-subtitle">Все задачи, разложенные по горизонтам</div>
    <div class="h-scroll" id="horizonsScroll">
      <div class="columns">
        ${renderColumnHTML('Сегодня', formatDateLong(today), buckets.today, { addCtx: { dateType: 'day', date: ymd(today) }, today: true })}
        ${renderColumnHTML('Завтра', formatDateLong(tomorrow), buckets.tomorrow, { addCtx: { dateType: 'day', date: ymd(tomorrow) } })}
        ${renderColumnHTML('На неделю', `${ymdShort(weekStart)} – ${ymdShort(weekEnd)}`, buckets.week, { addCtx: { dateType: 'week', date: ymd(weekStart) } })}
        ${renderColumnHTML('На месяц', monthNames[today.getMonth()], buckets.month, { addCtx: { dateType: 'month', date: ymd(monthStart) } })}
        ${renderColumnHTML('На год', String(today.getFullYear()), buckets.year, { addCtx: { dateType: 'year', date: ymd(yearStart) } })}
        ${renderColumnHTML('Жизнь', '', buckets.life, { addCtx: { dateType: 'life' } })}
      </div>
    </div>
  `;
  attachColumnHandlers();
  attachDragScroll(document.getElementById('horizonsScroll'));
}

// ===== Days =====
function renderDays() {
  const today = new Date(); today.setHours(0,0,0,0);
  const cols = [];
  for (let i = 0; i < 4; i++) {
    const d = addDays(today, i);
    const tasks = tasksOnDate(d);
    cols.push(renderColumnHTML(
      i === 0 ? 'Сегодня' : i === 1 ? 'Завтра' : dayNames[d.getDay()],
      formatDateLong(d),
      tasks,
      { addCtx: { dateType: 'day', date: ymd(d) }, today: i === 0 }
    ));
  }
  main.innerHTML = `
    <h1 class="view-title">Days</h1>
    <div class="view-subtitle">Ближайшие 4 дня</div>
    <div class="columns cols-4">${cols.join('')}</div>
  `;
  attachColumnHandlers();
}

// ===== Weeks =====
function renderWeeks() {
  const today = new Date(); today.setHours(0,0,0,0);
  const cols = [];
  for (let i = 0; i < 4; i++) {
    const wStart = addDays(startOfWeek(today), 7*i);
    const wEnd = addDays(wStart, 6);
    const tasks = state.tasks.filter(t => {
      if (t.dateType === 'week' && t.date) {
        const td = parseISO(t.date);
        return td >= wStart && td <= wEnd;
      }
      if (t.dateType === 'day' && t.date) {
        const d = parseISO(t.date);
        if (d >= wStart && d <= wEnd) return true;
      }
      return false;
    }).sort(taskSorter);
    cols.push(renderColumnHTML(
      `${ymdShort(wStart)} – ${ymdShort(wEnd)}`,
      `Неделя ${isoWeekNum(wStart)}`,
      tasks,
      { addCtx: { dateType: 'week', date: ymd(wStart) }, today: i === 0 }
    ));
  }
  main.innerHTML = `
    <h1 class="view-title">Weeks</h1>
    <div class="view-subtitle">Ближайшие 4 недели</div>
    <div class="columns cols-4">${cols.join('')}</div>
  `;
  attachColumnHandlers();
}

// ===== Years =====
function renderYears() {
  const today = new Date(); today.setHours(0,0,0,0);
  const y = today.getFullYear();
  const cols = [];
  for (let i = 0; i < 4; i++) {
    const yr = y + i;
    const yStart = new Date(yr, 0, 1);
    const yEnd = new Date(yr, 11, 31);
    const tasks = state.tasks.filter(t => {
      if (!t.date) return false;
      if (['year','month','week','day'].includes(t.dateType)) {
        const d = parseISO(t.date);
        return d >= yStart && d <= yEnd;
      }
      return false;
    }).sort(taskSorter);
    cols.push(renderColumnHTML(
      String(yr), '', tasks,
      { addCtx: { dateType: 'year', date: `${yr}-01-01` }, today: i === 0 }
    ));
  }
  main.innerHTML = `
    <h1 class="view-title">Years</h1>
    <div class="view-subtitle">Ближайшие 4 года</div>
    <div class="columns cols-4">${cols.join('')}</div>
  `;
  attachColumnHandlers();
}

// ===== Inbox =====
function renderInbox() {
  const inbox = state.tasks.filter(t => !t.projectId && t.dateType === 'none' && !t.parentId);
  main.innerHTML = `
    <h1 class="view-title">📥 Inbox</h1>
    <div class="view-subtitle">Закидывай сюда идеи — потом разберёшь по проектам и горизонтам</div>
    <div class="inbox-wrap">
      <div class="quick-add">
        <input id="inboxQuickInput" type="text" placeholder="Что у тебя на уме? Enter для добавления" />
      </div>
      <div id="inboxList" class="inbox-tasks">
        ${inbox.length === 0 ? '<div style="color:var(--text-muted); padding: 30px; text-align:center;">Пусто. Добавь первую идею выше ↑</div>' : ''}
        ${inbox.map(renderTaskCardHTML).join('')}
      </div>
    </div>
  `;
  const input = document.getElementById('inboxQuickInput');
  input.focus();
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && input.value.trim()) {
      const t = createTask({ title: input.value.trim(), dateType: 'none' });
      state.tasks.push(t); saveState();
      input.value = '';
      render();
    }
  });
  attachColumnHandlers();
}

// ===== Project (Kanban) =====
function renderProject() {
  const p = projectById(state.activeProject);
  if (!p) { setView('horizons'); return; }
  const projectTasks = state.tasks.filter(t => t.projectId === p.id && !t.parentId);
  const todo   = projectTasks.filter(t => t.status === 'todo').sort(taskSorter);
  const inProg = projectTasks.filter(t => t.status === 'in-progress').sort(taskSorter);
  const done   = projectTasks.filter(t => t.status === 'done').sort(taskSorter);

  main.innerHTML = `
    <div class="project-header">
      <span class="emoji">${p.emoji || '📁'}</span>
      <h2>${escapeHtml(p.name)}</h2>
      <button class="edit-proj" id="editProjBtn">Редактировать</button>
    </div>
    ${p.description ? `<div class="project-description">${escapeHtml(p.description)}</div>` : ''}
    <div class="kanban">
      ${renderColumnHTML(`${STATUSES[0].emoji} ${STATUSES[0].label}`, '', todo,   { addCtx: { projectId: p.id, status: 'todo' } })}
      ${renderColumnHTML(`${STATUSES[1].emoji} ${STATUSES[1].label}`, '', inProg, { addCtx: { projectId: p.id, status: 'in-progress' } })}
      ${renderColumnHTML(`${STATUSES[2].emoji} ${STATUSES[2].label}`, '', done,   { addCtx: { projectId: p.id, status: 'done' } })}
    </div>
  `;
  document.getElementById('editProjBtn').addEventListener('click', () => openProjectModal(p.id));
  attachColumnHandlers();
}

// ===== Calendar =====
function renderCalendar() {
  if (!state.calendarMonth) state.calendarMonth = ymd(startOfMonth(new Date())).slice(0,7);
  const [yr, mo] = state.calendarMonth.split('-').map(Number);
  const first = new Date(yr, mo-1, 1);
  const last = new Date(yr, mo, 0);
  const startWeek = startOfWeek(first);
  const totalCells = Math.ceil(((last - startWeek)/86400000 + 1)/7) * 7;

  let cells = '';
  for (let i = 0; i < totalCells; i++) {
    const d = addDays(startWeek, i);
    const isOther = d.getMonth() !== mo-1;
    const isToday = sameDay(d, new Date());
    const events = tasksOnDate(d);
    cells += `<div class="cal-day ${isOther ? 'other':''} ${isToday?'today':''}">
      <div class="num">${d.getDate()}</div>
      ${events.map(t => `<div class="cal-event ${t.status==='done'?'done':''}" data-task-id="${t.id}" title="${escapeHtml(t.title)}">${escapeHtml(t.title)}</div>`).join('')}
    </div>`;
  }

  main.innerHTML = `
    <div class="calendar-head">
      <h1 class="view-title" style="margin:0;">${monthNames[mo-1]} ${yr}</h1>
      <div class="nav-arrows">
        <button id="calPrev">‹</button>
        <button id="calToday">Сегодня</button>
        <button id="calNext">›</button>
      </div>
    </div>
    <div class="calendar-grid">
      ${dayShort.slice(1).concat(dayShort[0]).map(n => `<div class="cal-day-name">${n}</div>`).join('')}
      ${cells}
    </div>
  `;
  document.getElementById('calPrev').addEventListener('click', () => {
    const m = (mo - 1) === 0 ? 12 : mo - 1; const y = mo === 1 ? yr - 1 : yr;
    state.calendarMonth = `${y}-${String(m).padStart(2,'0')}`; saveState(); render();
  });
  document.getElementById('calNext').addEventListener('click', () => {
    const m = mo === 12 ? 1 : mo + 1; const y = mo === 12 ? yr + 1 : yr;
    state.calendarMonth = `${y}-${String(m).padStart(2,'0')}`; saveState(); render();
  });
  document.getElementById('calToday').addEventListener('click', () => {
    state.calendarMonth = ymd(startOfMonth(new Date())).slice(0,7); saveState(); render();
  });
  document.querySelectorAll('.cal-event').forEach(el => {
    el.addEventListener('click', e => { e.stopPropagation(); openTaskModal(el.dataset.taskId); });
  });
}

// ===== Settings =====
function renderSettings() {
  main.innerHTML = `
    <h1 class="view-title">⚙ Настройки</h1>
    <div class="view-subtitle">Хранение, бэкапы и интеграции</div>
    <div class="settings-panel">
      <h3>Хранение данных</h3>
      <p class="hint">Все задачи и проекты хранятся в твоём браузере (localStorage). Регулярно делай резервные копии.</p>
      <div style="display:flex; gap:8px; margin-top:10px;">
        <button class="btn btn-primary" id="exportBtn">Скачать резервную копию</button>
        <label class="btn btn-ghost" style="display:inline-block;">
          Загрузить из файла
          <input type="file" id="importInput" accept="application/json" hidden />
        </label>
      </div>
      <h3 style="margin-top:24px;">Google Calendar</h3>
      <p class="hint">Синхронизация с Google Calendar требует отдельной настройки. Скажи, когда захочешь подключить — расскажу пошагово.</p>
      <h3 style="margin-top:24px;">Опасная зона</h3>
      <button class="btn btn-danger" id="resetBtn" style="border:1px solid var(--danger);">Удалить все данные</button>
    </div>
  `;
  document.getElementById('exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `my-tracker-backup-${todayISO()}.json`; a.click();
    URL.revokeObjectURL(url);
  });
  document.getElementById('importInput').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data.tasks || !data.projects) throw new Error('Bad file');
        if (confirm('Это перезапишет все текущие данные. Продолжить?')) {
          Object.assign(state, data); saveState(); render();
        }
      } catch (err) { alert('Не получилось прочитать файл: ' + err.message); }
    };
    reader.readAsText(f);
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('Точно удалить ВСЁ? Это нельзя отменить.')) {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  });
}

// ===== Columns / Cards =====
function renderColumnHTML(title, subtitle, tasks, opts = {}) {
  const cls = opts.today ? 'column today' : 'column';
  const ctx = encodeURIComponent(JSON.stringify(opts.addCtx || {}));
  return `
    <div class="${cls}" data-add-ctx="${ctx}">
      <div class="col-header">
        <div class="col-title">${title}</div>
        ${subtitle ? `<div class="col-date">${subtitle}</div>` : ''}
      </div>
      <div class="col-tasks">
        ${tasks.map(renderTaskCardHTML).join('')}
      </div>
      <button class="add-task-btn">+ Добавить задачу</button>
    </div>
  `;
}

function renderTaskCardHTML(t) {
  const proj = projectById(t.projectId);
  const children = state.tasks.filter(x => x.parentId === t.id);
  const sub = children.length
    ? `<span class="badge">${children.filter(s => s.status==='done').length}/${children.length} ✓</span>`
    : '';
  const att = t.attachments && t.attachments.length ? `<span class="badge">📎 ${t.attachments.length}</span>` : '';
  const rep = t.repeat && t.repeat !== 'none' ? `<span class="badge">${SVG_REPEAT}</span>` : '';
  const checkCls = t.status === 'done' ? 'checked' : (t.status === 'in-progress' ? 'in-progress' : '');
  const checkSym = t.status === 'done' ? '✓' : (t.status === 'in-progress' ? '◐' : '');
  return `
    <div class="task-card ${t.status==='done'?'done':''}" draggable="true" data-task-id="${t.id}">
      <div class="task-check ${checkCls}" data-toggle="${t.id}">${checkSym}</div>
      <div class="task-body">
        <div class="task-text">${escapeHtml(t.title)}</div>
        ${(proj || sub || att || rep) ? `<div class="task-meta">
          ${proj ? `<span class="proj">${proj.emoji||'📁'} ${escapeHtml(proj.name)}</span>` : ''}
          ${sub} ${att} ${rep}
        </div>` : ''}
      </div>
      <button class="task-fire ${t.important?'on':''}" data-fire="${t.id}" title="${t.important?'Убрать важность':'Отметить важной'}">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M13.5 2c-.3 1.7-1 3.3-2 4.7-1 1.5-2.2 2.8-3.5 4.1-1 .9-1.9 1.8-2.6 2.8-.7 1-1.1 2.2-1.1 3.4 0 2 .8 3.8 2.2 5.2C7.9 23.4 9.8 24 12 24c2.2 0 4.1-.6 5.5-2 1.4-1.4 2.2-3.2 2.2-5.2 0-1.3-.2-2.6-.7-3.9-.5-1.3-1.1-2.5-1.9-3.6-.9-1.2-1.8-2.4-2.5-3.6-.6-1.2-1-2.5-1.1-3.8zm-.1 12.6c.7.7 1.4 1.5 1.9 2.4.5.9.8 1.9.8 3 0 1.3-.5 2.5-1.4 3.4-.9.9-2.1 1.4-3.4 1.4s-2.5-.5-3.4-1.4c-.9-.9-1.4-2.1-1.4-3.4 0-.9.2-1.7.7-2.4.5-.7 1.1-1.4 1.8-2 .6-.5 1.1-1.1 1.6-1.8.4-.7.7-1.4.8-2.2.3.7.6 1.3 1 1.9.4.4.7.7 1 1.1z"/></svg>
      </button>
    </div>
  `;
}

function attachColumnHandlers() {
  document.querySelectorAll('.task-card').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.closest('[data-toggle]') || e.target.closest('[data-fire]')) return;
      openTaskModal(el.dataset.taskId);
    });
    el.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', el.dataset.taskId);
      el.classList.add('dragging');
    });
    el.addEventListener('dragend', () => el.classList.remove('dragging'));
  });

  document.querySelectorAll('[data-toggle]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      const id = el.dataset.toggle;
      const t = state.tasks.find(x => x.id === id); if (!t) return;
      t.status = t.status === 'done' ? 'todo' : 'done';
      saveState(); render();
    });
  });

  document.querySelectorAll('[data-fire]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      const id = el.dataset.fire;
      const t = state.tasks.find(x => x.id === id); if (!t) return;
      t.important = !t.important;
      saveState(); render();
    });
  });

  document.querySelectorAll('.add-task-btn').forEach(el => {
    el.addEventListener('click', () => {
      const col = el.closest('.column');
      let ctx = {};
      try { ctx = JSON.parse(decodeURIComponent(col.dataset.addCtx || '{}')); } catch (e) {}
      openTaskModal(null, ctx);
    });
  });

  document.querySelectorAll('.column').forEach(col => {
    col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('drag-over'); });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    col.addEventListener('drop', e => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const id = e.dataTransfer.getData('text/plain');
      const t = state.tasks.find(x => x.id === id); if (!t) return;
      let ctx = {};
      try { ctx = JSON.parse(decodeURIComponent(col.dataset.addCtx || '{}')); } catch (e) {}
      if (ctx.status) t.status = ctx.status;
      if (ctx.projectId !== undefined) t.projectId = ctx.projectId;
      if (ctx.dateType) { t.dateType = ctx.dateType; if (ctx.date) t.date = ctx.date; }
      saveState(); render();
    });
  });
}

// ===== Drag-to-scroll =====
function attachDragScroll(container) {
  if (!container) return;
  let isDown = false, startX, scrollLeft;
  container.addEventListener('mousedown', e => {
    if (e.target.closest('.task-card, .add-task-btn, .task-check')) return;
    isDown = true;
    container.classList.add('grabbing');
    startX = e.pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
  });
  const stop = () => { isDown = false; container.classList.remove('grabbing'); };
  container.addEventListener('mouseleave', stop);
  container.addEventListener('mouseup', stop);
  container.addEventListener('mousemove', e => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    container.scrollLeft = scrollLeft - (x - startX);
  });
  container.addEventListener('wheel', e => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (e.shiftKey || e.deltaX === 0) {
      container.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, { passive: false });
}

// ===== Task modal =====
// Stack of tasks currently open: last is active. Used for "Назад к родителю".
let modalStack = [];

function createTask(partial = {}) {
  return {
    id: uid(),
    title: '',
    description: '',
    projectId: null,
    dateType: 'none',
    date: null,
    status: 'todo',
    repeat: 'none',
    repeatDays: [],
    parentId: null,
    important: false,
    subtasks: [], // kept for backward compat, unused
    attachments: [],
    createdAt: Date.now(),
    ...partial,
  };
}

function openTaskModal(taskId = null, prefill = {}, opts = {}) {
  // Save current draft to stack before opening new one
  if (opts.pushStack && window.__draftTask && modalStack.length > 0) {
    // persist the current draft to state before opening child
    commitDraft();
  }

  const t = taskId ? state.tasks.find(x => x.id === taskId) : createTask(prefill);
  // If new task, push into state right away so children can reference it
  if (!taskId) {
    state.tasks.push(t);
    saveState();
  }

  window.__draftTask = JSON.parse(JSON.stringify(t));
  window.__draftTaskId = t.id;

  if (opts.pushStack) modalStack.push(t.id);
  else modalStack = [t.id];

  renderModal();
  document.getElementById('taskModal').hidden = false;
  setTimeout(() => document.getElementById('taskTitle').focus(), 50);
}

function commitDraft() {
  const draft = window.__draftTask;
  if (!draft) return;
  const idx = state.tasks.findIndex(t => t.id === window.__draftTaskId);
  if (idx >= 0) state.tasks[idx] = draft;
  saveState();
}

function renderModal() {
  const draft = window.__draftTask; if (!draft) return;

  document.getElementById('taskTitle').value = draft.title || '';
  document.getElementById('taskDesc').value = draft.description || '';
  document.getElementById('taskRepeat').value = draft.repeat || 'none';

  updateProjectTag();
  updateStatusTag();
  updateDateTag();
  updateImportantBtn();
  updateWeekdaysRow();
  updateBackButton();
  renderSubtasks();
  renderAttachments();

  // delete visible only if task exists in state (always true now, but hide for root new unfinished? keep visible)
  const isExisting = !!state.tasks.find(t => t.id === window.__draftTaskId && t.title);
  document.getElementById('deleteTaskBtn').hidden = false;
}

function updateBackButton() {
  const btn = document.getElementById('backToParentBtn');
  if (modalStack.length > 1) {
    const parentId = modalStack[modalStack.length - 2];
    const parent = state.tasks.find(t => t.id === parentId);
    btn.hidden = false;
    btn.textContent = `← ${parent ? (parent.title || 'Родитель') : 'Назад'}`;
  } else {
    btn.hidden = true;
  }
}

function closeTaskModal() {
  commitDraft();
  document.getElementById('taskModal').hidden = true;
  window.__draftTask = null;
  window.__draftTaskId = null;
  modalStack = [];
  closeTagDropdown();
  render();
}

function goBackToParent() {
  commitDraft();
  modalStack.pop();
  const parentId = modalStack[modalStack.length - 1];
  const parent = state.tasks.find(t => t.id === parentId);
  if (!parent) { closeTaskModal(); return; }
  window.__draftTask = JSON.parse(JSON.stringify(parent));
  window.__draftTaskId = parent.id;
  renderModal();
}

function updateProjectTag() {
  const draft = window.__draftTask; if (!draft) return;
  const p = projectById(draft.projectId);
  const el = document.getElementById('projectTag');
  el.innerHTML = p
    ? `${p.emoji||'📁'} ${escapeHtml(p.name)} <span class="chev">▾</span>`
    : `Без проекта <span class="chev">▾</span>`;
}
function updateStatusTag() {
  const draft = window.__draftTask; if (!draft) return;
  const s = statusById(draft.status);
  const el = document.getElementById('statusTag');
  el.className = `tag tag-status status-${s.id}`;
  el.innerHTML = `${s.emoji} ${s.label} <span class="chev">▾</span>`;
}
function updateDateTag() {
  const draft = window.__draftTask; if (!draft) return;
  const el = document.getElementById('dateTag');
  let label = 'Без даты';
  let hasDate = false;
  if (draft.dateType === 'life') { label = '∞ Жизнь'; hasDate = true; }
  else if (draft.dateType === 'day' && draft.date) {
    const d = parseISO(draft.date); const today = new Date(); today.setHours(0,0,0,0);
    if (sameDay(d, today)) label = 'Сегодня';
    else if (sameDay(d, addDays(today,1))) label = 'Завтра';
    else label = `${d.getDate()} ${monthShort[d.getMonth()].toLowerCase()} ${d.getFullYear()}`;
    hasDate = true;
  }
  else if (draft.dateType === 'week' && draft.date) {
    const d = parseISO(draft.date);
    label = `Неделя ${isoWeekNum(d)} (${ymdShort(startOfWeek(d))} – ${ymdShort(endOfWeek(d))})`;
    hasDate = true;
  }
  else if (draft.dateType === 'month' && draft.date) {
    const d = parseISO(draft.date);
    label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    hasDate = true;
  }
  else if (draft.dateType === 'year' && draft.date) {
    const d = parseISO(draft.date);
    label = `${d.getFullYear()}`;
    hasDate = true;
  }
  el.className = `tag tag-date ${hasDate?'has-date':''}`;
  el.innerHTML = `${escapeHtml(label)} <span class="chev">▾</span>`;
}
function updateImportantBtn() {
  const draft = window.__draftTask; if (!draft) return;
  document.getElementById('importantBtn').classList.toggle('on', !!draft.important);
}
function updateWeekdaysRow() {
  const draft = window.__draftTask; if (!draft) return;
  const show = draft.repeat === 'custom-weekdays';
  const row = document.getElementById('weekdaysRow');
  row.hidden = !show;
  if (show) {
    document.querySelectorAll('#weekdaysPicker input').forEach(cb => {
      cb.checked = (draft.repeatDays || []).includes(Number(cb.value));
    });
  }
}

// ===== Tag dropdown (project / status) =====
function openTagDropdown(anchor, items, onSelect, selectedId) {
  const dd = document.getElementById('tagDropdown');
  dd.innerHTML = '';
  items.forEach(it => {
    if (it.divider) { dd.appendChild(document.createElement('hr')); return; }
    const b = document.createElement('button');
    b.innerHTML = it.html;
    if (it.id === selectedId) b.classList.add('selected');
    b.addEventListener('click', () => { onSelect(it.id); closeTagDropdown(); });
    dd.appendChild(b);
  });
  const rect = anchor.getBoundingClientRect();
  dd.style.left = rect.left + 'px';
  dd.style.top = (rect.bottom + 6) + 'px';
  dd.hidden = false;
}
function closeTagDropdown() {
  document.getElementById('tagDropdown').hidden = true;
}
document.addEventListener('click', e => {
  const dd = document.getElementById('tagDropdown');
  if (dd.hidden) return;
  if (e.target.closest('#tagDropdown') || e.target.closest('#projectTag') || e.target.closest('#statusTag')) return;
  closeTagDropdown();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeTagDropdown(); });

document.getElementById('projectTag').addEventListener('click', e => {
  const items = [
    { id: null, html: `📂 Без проекта` },
    ...(state.projects.length ? [{ divider: true }] : []),
    ...state.projects.map(p => ({ id: p.id, html: `${p.emoji||'📁'} ${escapeHtml(p.name)}` })),
  ];
  openTagDropdown(e.currentTarget, items, (id) => {
    if (window.__draftTask) { window.__draftTask.projectId = id; updateProjectTag(); }
  }, window.__draftTask ? window.__draftTask.projectId : null);
});

document.getElementById('statusTag').addEventListener('click', e => {
  const items = STATUSES.map(s => ({ id: s.id, html: `${s.emoji} ${s.label}` }));
  openTagDropdown(e.currentTarget, items, (id) => {
    if (window.__draftTask) { window.__draftTask.status = id; updateStatusTag(); }
  }, window.__draftTask ? window.__draftTask.status : null);
});

// ===== Date popup =====
let dpState = { month: null, year: null };

document.getElementById('dateTag').addEventListener('click', () => {
  const draft = window.__draftTask; if (!draft) return;
  const initDate = draft.date ? parseISO(draft.date) : new Date();
  dpState.month = initDate.getMonth();
  dpState.year = initDate.getFullYear();
  // snapshot
  window.__dateDraft = { dateType: draft.dateType || 'none', date: draft.date || null };
  // default tab if none/life we show 'day' for UX (but keep value)
  renderDatePopup();
  document.getElementById('datePopupBackdrop').hidden = false;
});

document.getElementById('datePopupBackdrop').addEventListener('click', e => {
  if (e.target.id === 'datePopupBackdrop') cancelDatePopup();
});

function cancelDatePopup() {
  document.getElementById('datePopupBackdrop').hidden = true;
  window.__dateDraft = null;
}

document.getElementById('dpOkBtn').addEventListener('click', () => {
  const dd = window.__dateDraft;
  if (dd && window.__draftTask) {
    window.__draftTask.dateType = dd.dateType;
    window.__draftTask.date = dd.date;
    updateDateTag();
  }
  cancelDatePopup();
});
document.getElementById('dpRemoveBtn').addEventListener('click', () => {
  if (window.__draftTask) {
    window.__draftTask.dateType = 'none';
    window.__draftTask.date = null;
    updateDateTag();
  }
  cancelDatePopup();
});

document.getElementById('dpTabs').addEventListener('click', e => {
  const b = e.target.closest('button[data-dt]'); if (!b) return;
  const dt = b.dataset.dt;
  const dd = window.__dateDraft; if (!dd) return;
  dd.dateType = dt;
  if (dt === 'life') dd.date = null;
  else if (!dd.date || dt === 'day') {
    const t = new Date();
    if (dt === 'day') dd.date = dd.date || todayISO();
    if (dt === 'week') dd.date = ymd(startOfWeek(t));
    if (dt === 'month') dd.date = ymd(startOfMonth(t));
    if (dt === 'year') dd.date = ymd(startOfYear(t));
  }
  // when switching from month/year to day, reset to today
  if (dt === 'day' && dd.date) {
    const d = parseISO(dd.date);
    dpState.month = d.getMonth(); dpState.year = d.getFullYear();
  }
  renderDatePopup();
});

function renderDatePopup() {
  const dd = window.__dateDraft;
  document.querySelectorAll('#dpTabs button').forEach(b => {
    b.classList.toggle('active', b.dataset.dt === dd.dateType);
  });
  const body = document.getElementById('dpBody');
  if (dd.dateType === 'life') {
    body.innerHTML = `<div class="dp-life">Цель на всю жизнь — без дедлайна</div>`;
  } else if (dd.dateType === 'day' || dd.dateType === 'week' || dd.dateType === 'none') {
    // if 'none' — show day calendar but without selection
    body.innerHTML = renderMonthCal(dd);
    bindMonthCal();
  } else if (dd.dateType === 'month') {
    body.innerHTML = renderMonthsGrid(dd);
    bindMonthsGrid();
  } else if (dd.dateType === 'year') {
    body.innerHTML = renderYearsGrid(dd);
    bindYearsGrid();
  }
}

function renderMonthCal(dd) {
  const yr = dpState.year, mo = dpState.month;
  const first = new Date(yr, mo, 1);
  const startWk = startOfWeek(first);
  const weeks = [];
  for (let w = 0; w < 6; w++) weeks.push(addDays(startWk, w * 7));

  const selectedDate = dd.date ? parseISO(dd.date) : null;
  const todayDate = new Date(); todayDate.setHours(0,0,0,0);
  const isWeekMode = dd.dateType === 'week';
  const isDayMode = dd.dateType === 'day';

  let weekRailHTML = `<div class="head">W</div>`;
  weeks.forEach(wkStart => {
    const wn = isoWeekNum(wkStart);
    const isSel = isWeekMode && selectedDate && sameDay(startOfWeek(selectedDate), wkStart);
    weekRailHTML += `<button data-week-start="${ymd(wkStart)}" class="${isSel?'selected':''}" title="Выбрать неделю ${wn}">W${wn}</button>`;
  });

  let daysHTML = '';
  ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].forEach(n => daysHTML += `<div class="day-name">${n}</div>`);
  weeks.forEach(wkStart => {
    for (let d = 0; d < 7; d++) {
      const date = addDays(wkStart, d);
      const isOther = date.getMonth() !== mo;
      const isToday = sameDay(date, todayDate);
      let cls = '';
      if (isOther) cls += ' other';
      if (isToday) cls += ' today';
      if (isDayMode && selectedDate && sameDay(date, selectedDate)) cls += ' selected';
      if (isWeekMode && selectedDate && date >= startOfWeek(selectedDate) && date <= endOfWeek(selectedDate)) cls += ' in-week';
      daysHTML += `<button data-date="${ymd(date)}" class="${cls.trim()}">${date.getDate()}</button>`;
    }
  });

  return `
    <div class="dp-row">
      <button class="nav" data-yearnav="-1" title="Пред. год">‹</button>
      <span class="label">${yr}</span>
      <button class="nav" data-yearnav="1" title="След. год">›</button>
    </div>
    <div class="dp-row">
      <button class="nav" data-monthnav="-1">‹</button>
      <span class="label">${monthNames[mo]}</span>
      <button class="nav" data-monthnav="1">›</button>
    </div>
    <div class="dp-cal">
      <div class="dp-weeks-col">${weekRailHTML}</div>
      <div class="dp-days-grid">${daysHTML}</div>
    </div>
    <div class="dp-quick">
      <button data-quick="today">today</button>
      <button data-quick="tomorrow">tomorrow</button>
      <button data-quick="this-week">this week</button>
    </div>
  `;
}
function bindMonthCal() {
  document.querySelectorAll('[data-monthnav]').forEach(b => b.addEventListener('click', () => {
    dpState.month += Number(b.dataset.monthnav);
    if (dpState.month < 0) { dpState.month = 11; dpState.year--; }
    if (dpState.month > 11) { dpState.month = 0; dpState.year++; }
    renderDatePopup();
  }));
  document.querySelectorAll('[data-yearnav]').forEach(b => b.addEventListener('click', () => {
    dpState.year += Number(b.dataset.yearnav);
    renderDatePopup();
  }));
  document.querySelectorAll('[data-date]').forEach(b => b.addEventListener('click', () => {
    const dd = window.__dateDraft;
    if (dd.dateType === 'week') {
      dd.date = ymd(startOfWeek(parseISO(b.dataset.date)));
    } else {
      dd.dateType = 'day';
      dd.date = b.dataset.date;
    }
    renderDatePopup();
  }));
  document.querySelectorAll('[data-week-start]').forEach(b => b.addEventListener('click', () => {
    const dd = window.__dateDraft;
    dd.dateType = 'week';
    dd.date = b.dataset.weekStart;
    renderDatePopup();
  }));
  document.querySelectorAll('[data-quick]').forEach(b => b.addEventListener('click', () => {
    const dd = window.__dateDraft;
    const q = b.dataset.quick;
    if (q === 'today') { dd.dateType = 'day'; dd.date = todayISO(); }
    if (q === 'tomorrow') { dd.dateType = 'day'; dd.date = ymd(addDays(new Date(), 1)); }
    if (q === 'this-week') { dd.dateType = 'week'; dd.date = ymd(startOfWeek(new Date())); }
    const d = parseISO(dd.date); dpState.month = d.getMonth(); dpState.year = d.getFullYear();
    renderDatePopup();
  }));
}

function renderMonthsGrid(dd) {
  const selected = dd.date ? parseISO(dd.date) : null;
  let html = `
    <div class="dp-row">
      <button class="nav" data-yearnav="-1">‹</button>
      <span class="label">${dpState.year}</span>
      <button class="nav" data-yearnav="1">›</button>
    </div>
    <div class="dp-months-grid">`;
  for (let m = 0; m < 12; m++) {
    const isSel = selected && selected.getFullYear() === dpState.year && selected.getMonth() === m;
    html += `<button data-month="${m}" class="${isSel?'selected':''}">${monthShort[m]}</button>`;
  }
  html += `</div>`;
  return html;
}
function bindMonthsGrid() {
  document.querySelectorAll('[data-yearnav]').forEach(b => b.addEventListener('click', () => {
    dpState.year += Number(b.dataset.yearnav);
    renderDatePopup();
  }));
  document.querySelectorAll('[data-month]').forEach(b => b.addEventListener('click', () => {
    const m = Number(b.dataset.month);
    const dd = window.__dateDraft;
    dd.date = ymd(new Date(dpState.year, m, 1));
    renderDatePopup();
  }));
}

function renderYearsGrid(dd) {
  const selected = dd.date ? parseISO(dd.date) : null;
  const baseYear = Math.floor(dpState.year / 12) * 12;
  let html = `
    <div class="dp-row">
      <button class="nav" data-yearpgnav="-12">‹</button>
      <span class="label">${baseYear} – ${baseYear+11}</span>
      <button class="nav" data-yearpgnav="12">›</button>
    </div>
    <div class="dp-years-grid">`;
  for (let i = 0; i < 12; i++) {
    const y = baseYear + i;
    const isSel = selected && selected.getFullYear() === y;
    html += `<button data-year="${y}" class="${isSel?'selected':''}">${y}</button>`;
  }
  html += `</div>`;
  return html;
}
function bindYearsGrid() {
  document.querySelectorAll('[data-yearpgnav]').forEach(b => b.addEventListener('click', () => {
    dpState.year += Number(b.dataset.yearpgnav);
    renderDatePopup();
  }));
  document.querySelectorAll('[data-year]').forEach(b => b.addEventListener('click', () => {
    const y = Number(b.dataset.year);
    const dd = window.__dateDraft;
    dd.date = ymd(new Date(y, 0, 1));
    renderDatePopup();
  }));
}

// ===== Subtasks (as full tasks) =====
function renderSubtasks() {
  const draft = window.__draftTask; if (!draft) return;
  const cont = document.getElementById('subtasksList');
  const children = state.tasks.filter(t => t.parentId === draft.id);
  cont.innerHTML = children.map(st => {
    const proj = projectById(st.projectId);
    const checkCls = st.status === 'done' ? 'checked' : (st.status === 'in-progress' ? 'in-progress' : '');
    const checkSym = st.status === 'done' ? '✓' : (st.status === 'in-progress' ? '◐' : '');
    const meta = [];
    if (st.dateType !== 'none' && st.dateType !== 'life' && st.date) {
      const d = parseISO(st.date);
      if (st.dateType === 'day') meta.push(`${d.getDate()} ${monthShort[d.getMonth()].toLowerCase()}`);
      else if (st.dateType === 'week') meta.push(`Нед ${isoWeekNum(d)}`);
      else if (st.dateType === 'month') meta.push(`${monthShort[d.getMonth()]} ${d.getFullYear()}`);
      else if (st.dateType === 'year') meta.push(d.getFullYear());
    }
    if (st.dateType === 'life') meta.push('∞');
    if (st.repeat && st.repeat !== 'none') meta.push('↻');
    return `
      <div class="subtask ${st.status==='done'?'done':''}" data-open-sub="${st.id}">
        <div class="task-check ${checkCls}" data-toggle-sub="${st.id}">${checkSym}</div>
        <span class="title">${escapeHtml(st.title || '—')}</span>
        ${meta.length ? `<span class="meta">${meta.join(' · ')}</span>` : ''}
        <button class="del" data-del-sub="${st.id}" title="Удалить">✕</button>
      </div>
    `;
  }).join('');
  document.getElementById('subtasksHint').hidden = children.length === 0;

  cont.querySelectorAll('[data-open-sub]').forEach(el => el.addEventListener('click', e => {
    if (e.target.closest('[data-toggle-sub]') || e.target.closest('[data-del-sub]')) return;
    openTaskModal(el.dataset.openSub, {}, { pushStack: true });
  }));
  cont.querySelectorAll('[data-toggle-sub]').forEach(el => el.addEventListener('click', e => {
    e.stopPropagation();
    const id = el.dataset.toggleSub;
    const st = state.tasks.find(x => x.id === id); if (!st) return;
    st.status = st.status === 'done' ? 'todo' : 'done';
    saveState(); renderSubtasks();
  }));
  cont.querySelectorAll('[data-del-sub]').forEach(el => el.addEventListener('click', e => {
    e.stopPropagation();
    const id = el.dataset.delSub;
    if (confirm('Удалить подзадачу?')) {
      state.tasks = state.tasks.filter(t => t.id !== id);
      saveState(); renderSubtasks();
    }
  }));
}

function renderAttachments() {
  const draft = window.__draftTask; if (!draft) return;
  const cont = document.getElementById('attachmentsList');
  cont.innerHTML = draft.attachments.map(a => `
    <div class="attachment">
      <a href="${a.dataUrl}" download="${escapeHtmlAttr(a.name)}" target="_blank">📎 ${escapeHtml(a.name)} <span style="color:var(--text-muted);">(${formatSize(a.size)})</span></a>
      <button class="remove" data-del-att="${a.id}">✕</button>
    </div>
  `).join('');
  cont.querySelectorAll('[data-del-att]').forEach(el => el.addEventListener('click', () => {
    draft.attachments = draft.attachments.filter(x => x.id !== el.dataset.delAtt);
    renderAttachments();
  }));
}

function formatSize(n) {
  if (!n) return '';
  if (n < 1024) return n + ' B';
  if (n < 1024*1024) return (n/1024).toFixed(1) + ' KB';
  return (n/1024/1024).toFixed(1) + ' MB';
}

// ===== Modal events =====
document.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeTaskModal));
document.getElementById('taskModal').addEventListener('click', e => {
  if (e.target.id === 'taskModal') closeTaskModal();
});
document.getElementById('backToParentBtn').addEventListener('click', goBackToParent);
document.getElementById('importantBtn').addEventListener('click', () => {
  if (!window.__draftTask) return;
  window.__draftTask.important = !window.__draftTask.important;
  updateImportantBtn();
});

document.getElementById('taskTitle').addEventListener('input', e => { if (window.__draftTask) window.__draftTask.title = e.target.value; });
document.getElementById('taskDesc').addEventListener('input', e => { if (window.__draftTask) window.__draftTask.description = e.target.value; });
document.getElementById('taskRepeat').addEventListener('change', e => {
  if (!window.__draftTask) return;
  window.__draftTask.repeat = e.target.value;
  updateWeekdaysRow();
});
document.querySelectorAll('#weekdaysPicker input').forEach(cb => cb.addEventListener('change', () => {
  if (!window.__draftTask) return;
  window.__draftTask.repeatDays = [...document.querySelectorAll('#weekdaysPicker input:checked')].map(c => Number(c.value));
}));

document.getElementById('subtaskInput').addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.value.trim()) {
    const parent = window.__draftTask; if (!parent) return;
    commitDraft(); // save current parent edits
    const child = createTask({
      title: e.target.value.trim(),
      projectId: parent.projectId,
      parentId: parent.id,
    });
    state.tasks.push(child);
    saveState();
    e.target.value = '';
    renderSubtasks();
  }
});

document.getElementById('taskFiles').addEventListener('change', async e => {
  const files = [...e.target.files];
  for (const f of files) {
    if (f.size > 4 * 1024 * 1024) {
      if (!confirm(`Файл "${f.name}" больше 4 МБ. Всё равно добавить?`)) continue;
    }
    const dataUrl = await fileToDataUrl(f);
    window.__draftTask.attachments.push({ id: uid(), name: f.name, type: f.type, size: f.size, dataUrl });
  }
  e.target.value = '';
  renderAttachments();
});
function fileToDataUrl(f) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(f);
  });
}

document.getElementById('saveTaskBtn').addEventListener('click', () => {
  const draft = window.__draftTask;
  if (!draft) return;
  if (!draft.title.trim()) { alert('Укажи название задачи'); return; }
  closeTaskModal();
});
document.getElementById('deleteTaskBtn').addEventListener('click', () => {
  const id = window.__draftTaskId;
  if (!id) return;
  if (confirm('Удалить задачу? Её подзадачи тоже будут удалены.')) {
    // delete task and all descendants
    const toDelete = new Set([id]);
    let changed = true;
    while (changed) {
      changed = false;
      state.tasks.forEach(t => {
        if (t.parentId && toDelete.has(t.parentId) && !toDelete.has(t.id)) {
          toDelete.add(t.id); changed = true;
        }
      });
    }
    state.tasks = state.tasks.filter(t => !toDelete.has(t.id));
    saveState();
    document.getElementById('taskModal').hidden = true;
    window.__draftTask = null; window.__draftTaskId = null; modalStack = [];
    closeTagDropdown();
    render();
  }
});

// ===== Project modal =====
let editingProjectId = null;
const PROJECT_EMOJIS = [
  '🎯','🚀','💼','🏠','💪','📚','🎨','💻','🍳','✈️',
  '💰','❤️','🌱','🎵','📷','🏃','🧘','🎓','🛒','🎮',
  '🌟','🔥','💡','🌸','🍀','🦋','🐱','🐶','🌈','☀️',
  '🌙','⚡','🎁','🛀','📝','📊','🧠','🧩','🔧','🍎',
];

function openProjectModal(projectId = null) {
  editingProjectId = projectId;
  const p = projectId ? projectById(projectId) : { id: uid(), name: '', description: '', emoji: '🎯' };
  window.__draftProject = JSON.parse(JSON.stringify(p));
  document.getElementById('projectName').value = p.name || '';
  document.getElementById('projectDesc').value = p.description || '';
  document.getElementById('emojiInput').value = p.emoji || '';
  document.getElementById('bigEmoji').textContent = p.emoji || '🎯';

  const ep = document.getElementById('emojiPicker');
  ep.innerHTML = PROJECT_EMOJIS.map(e =>
    `<button data-emoji="${e}" class="${e === p.emoji ? 'selected':''}">${e}</button>`).join('');
  ep.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    setProjectEmoji(b.dataset.emoji);
  }));

  document.getElementById('deleteProjectBtn').hidden = !projectId;
  document.getElementById('projectModal').hidden = false;
  setTimeout(() => document.getElementById('projectName').focus(), 50);
}
function setProjectEmoji(e) {
  if (!window.__draftProject) return;
  window.__draftProject.emoji = e;
  document.getElementById('bigEmoji').textContent = e || '🎯';
  document.getElementById('emojiInput').value = e;
  document.querySelectorAll('#emojiPicker button').forEach(x => x.classList.toggle('selected', x.dataset.emoji === e));
}
function closeProjectModal() {
  document.getElementById('projectModal').hidden = true;
  window.__draftProject = null;
  editingProjectId = null;
}
document.querySelectorAll('[data-close-proj]').forEach(el => el.addEventListener('click', closeProjectModal));
document.getElementById('projectModal').addEventListener('click', e => {
  if (e.target.id === 'projectModal') closeProjectModal();
});
document.getElementById('projectName').addEventListener('input', e => { if (window.__draftProject) window.__draftProject.name = e.target.value; });
document.getElementById('projectDesc').addEventListener('input', e => { if (window.__draftProject) window.__draftProject.description = e.target.value; });
document.getElementById('emojiInput').addEventListener('input', e => { setProjectEmoji(e.target.value.trim()); });

document.getElementById('saveProjectBtn').addEventListener('click', () => {
  const d = window.__draftProject;
  if (!d.name.trim()) { alert('Укажи название проекта'); return; }
  if (!d.emoji) d.emoji = '🎯';
  if (editingProjectId) {
    const idx = state.projects.findIndex(p => p.id === editingProjectId);
    if (idx >= 0) state.projects[idx] = d;
  } else {
    state.projects.push(d);
  }
  saveState(); closeProjectModal();
  setView('project', { projectId: d.id });
});
document.getElementById('deleteProjectBtn').addEventListener('click', () => {
  if (!editingProjectId) return;
  if (confirm('Удалить проект? Задачи останутся, но без проекта.')) {
    state.tasks.forEach(t => { if (t.projectId === editingProjectId) t.projectId = null; });
    state.projects = state.projects.filter(p => p.id !== editingProjectId);
    saveState();
    closeProjectModal();
    setView('horizons');
  }
});
document.getElementById('addProjectBtn').addEventListener('click', () => openProjectModal());

// ===== Sidebar nav =====
document.querySelectorAll('.nav-btn').forEach(b => {
  b.addEventListener('click', () => setView(b.dataset.view));
});
document.getElementById('settingsBtn').addEventListener('click', () => setView('settings'));
document.getElementById('logoBtn').addEventListener('click', () => setView('horizons'));

// ===== Helpers =====
function formatDateLong(d) {
  return `${dayShort[d.getDay()]}, ${d.getDate()} ${monthShort[d.getMonth()].toLowerCase()}`;
}
function ymdShort(d) { return `${d.getDate()} ${monthShort[d.getMonth()].toLowerCase()}`; }
function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
}
function escapeHtmlAttr(s) { return escapeHtml(s).replace(/'/g, '&#39;'); }

// ===== Init =====
if (state.projects.length === 0 && state.tasks.length === 0) {
  const p = { id: uid(), name: 'Личное', description: 'Пример проекта — можешь удалить', emoji: '🌱' };
  state.projects.push(p);
  state.tasks.push(createTask({ title: 'Попробовать My Tracker', projectId: p.id, dateType: 'day', date: todayISO(), status: 'todo' }));
  state.tasks.push(createTask({ title: 'Создать первый свой проект', dateType: 'day', date: todayISO(), status: 'todo' }));
  saveState();
}

render();
