'use strict';

const RUN_KEY = 'trening.run.v1';
const CARDIO_KEY = 'trening.cardio.v1';
const AUTO_KEY = 'trening.autoNext';
const CIRC = 2 * Math.PI * 54; // obwód pierścienia timera (r = 54)

// ---------- Narzędzia ----------
const $ = sel => document.querySelector(sel);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => ymd(new Date());
const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const clampInt = (v, min, max) => Math.min(max, Math.max(min, Math.round(Number(v) || 0)));

// Puste / zero / niepoprawne obciążenie = masa własnego ciała (null)
const toWeight = v => {
  const n = Number(String(v ?? '').trim().replace(',', '.'));
  return String(v ?? '').trim() !== '' && Number.isFinite(n) && n > 0 ? n : null;
};

const fmtWeight = w => (w == null ? 'masa ciała' : `${w} kg`);
const fmtSet = s => (s.weight != null ? `${s.reps} × ${s.weight} kg` : `${s.reps} powt.`);
const fmtClock = sec => `${Math.floor(sec / 60)}:${pad(sec % 60)}`;
const fmtElapsed = sec => {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};
const fmtDuration = ms => {
  const m = Math.max(1, Math.round(ms / 60000));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
};
const fmtDayLong = s => parseYmd(s).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });

// ---------- Dane ----------
function loadJSON(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

// Plany, kalendarz i dziennik żyją w bazie SQLite na serwerze
let db = { exercises: [], plans: [], schedule: [], log: [], cardioTemplates: [], cardioLog: [] };
let loaded = false;
// Trwający trening trzymamy lokalnie – przetrwa odświeżenie strony i brak zasięgu na siłowni
let run = loadJSON(RUN_KEY);
const settings = { autoNext: loadJSON(AUTO_KEY) ?? true };

// Trwający trening cardio ma własny klucz – nie dotyka stanu treningu siłowego
let cardio = loadCardio();
function loadCardio() {
  const c = loadJSON(CARDIO_KEY);
  // Uszkodzona wartość nie może zablokować aplikacji – odrzucamy ją i czyścimy klucz
  if (CardioCore.isValidStored(c)) return c;
  if (c !== null) { try { localStorage.removeItem(CARDIO_KEY); } catch { /* brak dostępu do pamięci */ } }
  return null;
}
const saveCardio = () => (cardio ? localStorage.setItem(CARDIO_KEY, JSON.stringify(cardio)) : localStorage.removeItem(CARDIO_KEY));

const saveRun = () => (run ? localStorage.setItem(RUN_KEY, JSON.stringify(run)) : localStorage.removeItem(RUN_KEY));

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = `Błąd serwera (${res.status})`;
    try { msg = (await res.json()).error || msg; } catch { /* odpowiedź bez JSON */ }
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}

async function loadState() {
  db = await api('GET', 'api/state');
  loaded = true;
  render();
}

// Zapisy planu idą po kolei, żeby szybkie edycje nie nadpisały się w złej kolejności
let planSaves = Promise.resolve();
function savePlan(p) {
  const body = { name: p.name, exercises: p.exercises };
  planSaves = planSaves.then(() => api('PUT', `api/plans/${p.id}`, body)).catch(showError);
  return planSaves;
}

let toastTimer;
function showError(err) {
  const el = $('#toast');
  el.textContent = err?.message || String(err);
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 4000);
}

const planById = id => db.plans.find(p => p.id === id);
const isDone = schedId => db.log.some(l => l.scheduleId === schedId);
const cardioTemplateById = id => db.cardioTemplates.find(t => t.id === id);

// Treningi danego dnia: zaplanowane + wykonane poza kalendarzem.
// Termin cardio to termin z szablonem albo taki, który zamknął trening cardio
// (po usunięciu szablonu wykonany termin traci szablon, ale zachowuje nazwę w dzienniku).
function dayItems(date) {
  const sched = db.schedule.filter(s => s.date === date).map(s => {
    const cardioLog = db.cardioLog.find(c => c.scheduleId === s.id);
    if (s.cardioTemplateId || cardioLog) {
      return {
        kind: 'sched', cardio: true, id: s.id, templateId: s.cardioTemplateId, done: !!cardioLog,
        name: cardioLog?.name ?? cardioTemplateById(s.cardioTemplateId)?.name ?? '(usunięty szablon)',
      };
    }
    const log = db.log.find(l => l.scheduleId === s.id);
    return {
      kind: 'sched', id: s.id, planId: s.planId, done: !!log,
      name: log?.planName ?? planById(s.planId)?.name ?? '(usunięty plan)',
    };
  });
  const loose = db.log
    .filter(l => l.date === date && !db.schedule.some(s => s.id === l.scheduleId))
    .map(l => ({ kind: 'log', id: l.id, planId: l.planId, done: true, name: l.planName }));
  const looseCardio = db.cardioLog
    .filter(c => c.date === date && !db.schedule.some(s => s.id === c.scheduleId))
    .map(c => ({ kind: 'log', cardio: true, id: c.id, templateId: c.templateId, done: true, name: c.name }));
  return [...sched, ...loose, ...looseCardio];
}

// ---------- Stan interfejsu ----------
const now = new Date();
const ui = {
  tab: 'calendar',
  month: new Date(now.getFullYear(), now.getMonth(), 1),
  selected: today(),
  editPlanId: null,
  editExId: null,
  libEditId: null,
  libFilter: '',
  exDefaults: { sets: 3, reps: 10, rest: 90 },
  // kreator treningu interwałowego (czas całkowity jako minuty + sekundy)
  cardio: { intervals: [], addSec: 30, min: 10, sec: 0, name: '', date: null },
};

function render() {
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === ui.tab));
  const views = { calendar: viewCalendar, plans: viewPlans, cardio: viewCardio, library: viewLibrary, journal: viewJournal };
  $('#view').innerHTML = loaded ? views[ui.tab]() : '<div class="empty">Wczytywanie…</div>';
  renderRunner();
  renderCardio();
}

// ---------- Widok: Kalendarz ----------
function viewCalendar() {
  const m = ui.month;
  const first = new Date(m.getFullYear(), m.getMonth(), 1);
  const last = new Date(m.getFullYear(), m.getMonth() + 1, 0);
  const start = addDays(first, -((first.getDay() + 6) % 7)); // tydzień od poniedziałku
  const end = addDays(last, 6 - ((last.getDay() + 6) % 7));
  const t = today();

  let cells = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'].map(d => `<div class="cal-dow">${d}</div>`).join('');
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const key = ymd(d);
    const dots = dayItems(key).map(i => `<span class="dot${i.cardio ? ' cardio' : ''}${i.done ? ' done' : ''}"></span>`).join('');
    const cls = ['cal-day', d.getMonth() !== m.getMonth() && 'other', key === t && 'today', key === ui.selected && 'selected']
      .filter(Boolean).join(' ');
    cells += `<button class="${cls}" data-action="cal-select" data-date="${key}"><span>${d.getDate()}</span><span class="dots">${dots}</span></button>`;
  }

  const items = dayItems(ui.selected);
  const list = items.length ? items.map(i => `
    <div class="card row between${i.cardio ? ' cardio' : ''}" data-id="${esc(i.id)}">
      <div class="grow">
        <h3>${esc(i.name)}${i.cardio ? ' <span class="tag cardio">cardio</span>' : ''}</h3>
        ${i.done ? '<span class="tag ok">✓ wykonany</span>' : '<span class="tag">zaplanowany</span>'}
      </div>
      <div class="row">
        ${i.cardio
    ? (!i.done && cardioTemplateById(i.templateId) ? `<button class="btn primary small" data-action="cardio-start" data-template="${esc(i.templateId)}" data-sched="${esc(i.id)}">▶ Start</button>` : '')
    : (!i.done && planById(i.planId) ? `<button class="btn primary small" data-action="start" data-plan="${i.planId}" data-sched="${i.id}">▶ Start</button>` : '')}
        ${i.kind === 'sched' ? `<button class="btn ghost small danger" data-action="sched-del" data-id="${i.id}">Usuń</button>` : ''}
      </div>
    </div>`).join('') : '<p class="muted">Brak treningów tego dnia.</p>';

  const planOptions = db.plans.length
    ? `<optgroup label="Plany siłowe">${db.plans.map(p => `<option value="plan:${esc(p.id)}">${esc(p.name)}</option>`).join('')}</optgroup>` : '';
  const templateOptions = db.cardioTemplates.length
    ? `<optgroup label="Szablony cardio">${db.cardioTemplates.map(t => `<option value="cardio:${esc(t.id)}">${esc(t.name)}</option>`).join('')}</optgroup>` : '';
  const form = db.plans.length || db.cardioTemplates.length ? `
    <form id="sched-form" class="card">
      <h3>Dodaj trening do kalendarza</h3>
      <div class="row mt">
        <select name="plan" class="grow">${planOptions}${templateOptions}</select>
        <button class="btn primary">Dodaj</button>
      </div>
      <div class="row mt muted">
        <label class="row"><input type="checkbox" name="repeat"> powtarzaj co tydzień przez</label>
        <input type="number" name="weeks" min="2" max="52" value="4" class="narrow"> tyg.
      </div>
    </form>` : '<div class="card empty">Najpierw utwórz plan w zakładce <b>Plany</b> lub szablon w zakładce <b>Cardio</b>.</div>';

  return `
    <div class="cal-head">
      <button class="btn ghost" data-action="cal-prev" aria-label="Poprzedni miesiąc">‹</button>
      <h2>${m.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}</h2>
      <div class="row">
        <button class="btn ghost small" data-action="cal-today">Dziś</button>
        <button class="btn ghost" data-action="cal-next" aria-label="Następny miesiąc">›</button>
      </div>
    </div>
    <div class="cal-grid">${cells}</div>
    <div class="section-title mt-lg"><h2>${fmtDayLong(ui.selected)}</h2></div>
    ${list}
    ${form}`;
}

// ---------- Widok: Plany ----------
function viewPlans() {
  if (ui.editPlanId) {
    const p = planById(ui.editPlanId);
    if (p) return viewPlanEditor(p);
    ui.editPlanId = null;
  }
  const cards = db.plans.map(p => `
    <div class="card">
      <div class="row between">
        <h3 class="grow">${esc(p.name)}</h3>
        <span class="muted">${p.exercises.length} ćw.</span>
      </div>
      <ul class="ex-list">${p.exercises.map((e, i) => `
        <li><span class="ex-num">${i + 1}.</span><span class="grow">${esc(e.name)}</span><span class="ex-meta">${e.sets}×${e.reps} · ${fmtWeight(e.weight)}</span></li>`).join('')}
      </ul>
      <div class="row mt">
        <button class="btn primary" data-action="start" data-plan="${p.id}" ${p.exercises.length ? '' : 'disabled'}>▶ Start</button>
        <button class="btn" data-action="plan-edit" data-id="${p.id}">Edytuj</button>
        <button class="btn ghost danger" data-action="plan-del" data-id="${p.id}">Usuń</button>
      </div>
    </div>`).join('');

  return `
    <div class="section-title"><h2>Plany treningowe</h2><button class="btn primary" data-action="plan-new">+ Nowy plan</button></div>
    ${cards || '<div class="empty">Nie masz jeszcze żadnego planu.</div>'}`;
}

function viewPlanEditor(p) {
  const editing = p.exercises.find(e => e.id === ui.editExId);
  const v = editing || { name: '', weight: null, ...ui.exDefaults };
  const rows = p.exercises.map((e, i) => `
    <li>
      <span class="ex-num">${i + 1}.</span>
      <div class="grow">
        <div>${esc(e.name)}</div>
        <div class="ex-meta">${e.sets} serie × ${e.reps} powt. · ${fmtWeight(e.weight)} · przerwa ${e.rest} s</div>
      </div>
      <button class="btn ghost small" data-action="ex-move" data-id="${e.id}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="W górę">↑</button>
      <button class="btn ghost small" data-action="ex-move" data-id="${e.id}" data-dir="1" ${i === p.exercises.length - 1 ? 'disabled' : ''} aria-label="W dół">↓</button>
      <button class="btn ghost small" data-action="ex-edit" data-id="${e.id}" aria-label="Edytuj">✎</button>
      <button class="btn ghost small danger" data-action="ex-del" data-id="${e.id}" aria-label="Usuń">✕</button>
    </li>`).join('');

  return `
    <div class="section-title"><h2>Edycja planu</h2><button class="btn primary" data-action="plan-done">Gotowe</button></div>
    <div class="card">
      <label class="field">Nazwa planu<input type="text" id="plan-name" value="${esc(p.name)}" placeholder="np. Push / Pull / Nogi"></label>
    </div>
    <div class="card">
      <h3>Ćwiczenia</h3>
      ${rows ? `<ul class="ex-list">${rows}</ul>` : '<p class="muted">Dodaj pierwsze ćwiczenie poniżej.</p>'}
    </div>
    <form id="ex-form" class="card">
      <h3>${editing ? 'Edytuj ćwiczenie' : 'Dodaj ćwiczenie'}</h3>
      <div class="ex-form">
        <label class="field full">Ćwiczenie z bazy
          <input type="text" name="name" list="ex-library" required autocomplete="off" value="${esc(v.name)}" placeholder="zacznij pisać, np. Wyciskanie">
          <datalist id="ex-library">${db.exercises.map(e => `<option value="${esc(e.name)}"></option>`).join('')}</datalist>
        </label>
        <label class="field">Serie<input type="number" name="sets" min="1" max="50" required value="${v.sets}"></label>
        <label class="field">Powtórzenia<input type="number" name="reps" min="1" max="500" required value="${v.reps}"></label>
        <label class="field">Obciążenie (kg)<input type="text" inputmode="decimal" name="weight" value="${v.weight ?? ''}" placeholder="masa ciała"></label>
        <label class="field">Przerwa (s)<input type="number" name="rest" min="0" max="900" required value="${v.rest}"></label>
      </div>
      <p class="muted">Nowa nazwa zostanie dodana do bazy ćwiczeń. Zostaw obciążenie puste, jeśli ćwiczysz z masą własnego ciała.</p>
      <div class="row">
        <button class="btn primary">${editing ? 'Zapisz zmiany' : '+ Dodaj do planu'}</button>
        ${editing ? '<button type="button" class="btn ghost" data-action="ex-cancel">Anuluj</button>' : ''}
      </div>
    </form>`;
}

// ---------- Widok: Baza ćwiczeń ----------
const nameKey = s => s.trim().toLocaleLowerCase('pl');
const findExercise = name => db.exercises.find(e => nameKey(e.name) === nameKey(name));
const plansUsing = exId => db.plans.filter(p => p.exercises.some(e => e.exerciseId === exId)).map(p => p.name);

function viewLibrary() {
  return `
    <div class="section-title"><h2>Baza ćwiczeń</h2><span class="muted">${db.exercises.length} ćw.</span></div>
    <form id="lib-form" class="card">
      <h3>Dodaj ćwiczenie do bazy</h3>
      <div class="row mt">
        <input type="text" name="name" required class="grow" placeholder="np. Wyciskanie leżąc" autocomplete="off">
        <button class="btn primary">Dodaj</button>
      </div>
      <p class="muted">Serie, powtórzenia i obciążenie ustawiasz osobno w każdym planie.</p>
    </form>
    ${db.exercises.length > 6 ? `<input type="search" id="lib-filter" class="mb" placeholder="Szukaj ćwiczenia…" value="${esc(ui.libFilter)}">` : ''}
    <div id="lib-list">${libraryList()}</div>`;
}

function libraryList() {
  const key = nameKey(ui.libFilter);
  const list = db.exercises.filter(e => nameKey(e.name).includes(key));
  if (!db.exercises.length) return '<div class="empty">Baza jest pusta. Dodaj pierwsze ćwiczenie powyżej.</div>';
  if (!list.length) return '<div class="empty">Brak ćwiczeń pasujących do wyszukiwania.</div>';
  const rows = list.map(e => {
    if (e.id === ui.libEditId) {
      return `
        <li>
          <form id="lib-rename-form" class="row grow">
            <input type="text" name="name" required class="grow" value="${esc(e.name)}" autocomplete="off">
            <button class="btn primary small">Zapisz</button>
            <button type="button" class="btn ghost small" data-action="lib-cancel">Anuluj</button>
          </form>
        </li>`;
    }
    const used = plansUsing(e.id);
    return `
      <li>
        <div class="grow">
          <div>${esc(e.name)}</div>
          <div class="ex-meta">${used.length ? `w planach: ${esc(used.join(', '))}` : 'nieużywane w planach'}</div>
        </div>
        <button class="btn ghost small" data-action="lib-edit" data-id="${e.id}" aria-label="Zmień nazwę">✎</button>
        <button class="btn ghost small danger" data-action="lib-del" data-id="${e.id}" aria-label="Usuń">✕</button>
      </li>`;
  }).join('');
  return `<div class="card"><ul class="ex-list">${rows}</ul></div>`;
}

// ---------- Widok: Dziennik ----------
function viewJournal() {
  // Treningi siłowe i cardio w jednej liście, od najnowszego
  const entries = [
    ...db.log.map(l => ({ kind: 'strength', startedAt: l.startedAt, date: l.date, l })),
    ...db.cardioLog.map(l => ({ kind: 'cardio', startedAt: l.startedAt, date: l.date, l })),
  ].sort((a, b) => b.startedAt - a.startedAt);
  const monthKey = today().slice(0, 7);
  const thisMonth = entries.filter(e => e.date.startsWith(monthKey)).length;

  const cards = entries.map(({ kind, l }) => {
    if (kind === 'cardio') return cardioLogCard(l);
    const sets = l.exercises.reduce((n, e) => n + e.sets.length, 0);
    const volume = l.exercises.reduce((n, e) => n + e.sets.reduce((m, s) => m + (s.weight ?? 0) * s.reps, 0), 0);
    const exercises = l.exercises.filter(e => e.sets.length).map(e =>
      `<div class="log-ex"><b>${esc(e.name)}</b>: <span class="muted">${e.sets.map(fmtSet).join(', ')}</span></div>`).join('');
    return `
      <div class="card">
        <div class="row between">
          <h3 class="grow">${esc(l.planName)}</h3>
          <button class="btn ghost small danger" data-action="log-del" data-id="${l.id}">Usuń</button>
        </div>
        <div class="muted">${fmtDayLong(l.date)}</div>
        <div class="stats">
          <span>Czas <b>${fmtDuration(l.finishedAt - l.startedAt)}</b></span>
          <span>Serie <b>${sets}</b></span>
          ${volume ? `<span>Objętość <b>${Math.round(volume)} kg</b></span>` : ''}
        </div>
        ${exercises}
        ${l.note ? `<p class="muted">📝 ${esc(l.note)}</p>` : ''}
      </div>`;
  }).join('');

  return `
    <div class="section-title"><h2>Dziennik</h2><span class="muted">w tym miesiącu: <b>${thisMonth}</b> · łącznie: <b>${entries.length}</b></span></div>
    ${cards || '<div class="empty">Brak wpisów. Zakończ pierwszy trening, a pojawi się tutaj.</div>'}
    <div class="card">
      <h3>Kopia zapasowa</h3>
      <p class="muted">Dane są zapisane w bazie na serwerze. Eksport pobiera je jako plik JSON, a import zastępuje całą bazę danymi z pliku.</p>
      <div class="row">
        <a class="btn" href="api/export" download>Eksportuj</a>
        <button class="btn" data-action="import">Importuj</button>
        <input type="file" id="import-file" accept="application/json,.json" hidden>
      </div>
    </div>`;
}

function cardioLogCard(l) {
  const plan = l.mode === 'interval' ? CardioCore.checkPlan(l.intervals, l.totalSec) : null;
  return `
      <div class="card cardio">
        <div class="row between">
          <h3 class="grow">${esc(l.name)} <span class="tag cardio">cardio</span></h3>
          <button class="btn ghost small danger" data-action="cardio-log-del" data-id="${esc(l.id)}">Usuń</button>
        </div>
        <div class="muted">${fmtDayLong(l.date)}</div>
        <div class="stats">
          <span>Czas aktywny <b>${fmtElapsed(l.activeSec)}</b></span>
          ${plan ? `<span>Interwały <b>${esc(CardioCore.intervalsList(l.intervals))}</b> × <b>${esc(CardioCore.cyclesLabel(plan.cycles))}</b></span>` : '<span>Trening swobodny</span>'}
        </div>
        ${l.note ? `<p class="muted">📝 ${esc(l.note)}</p>` : ''}
      </div>`;
}

async function importData(file) {
  if (!file) return;
  let data;
  try { data = JSON.parse(await file.text()); } catch { throw new Error('Nieprawidłowy plik kopii zapasowej'); }
  if (!confirm('Zastąpić wszystkie dane w bazie danymi z pliku?')) return;
  db = await api('POST', 'api/import', data);
  render();
}

// ---------- Trening: logika ----------
let audioCtx = null;
let wakeLock = null;

const curEx = () => run.exercises[run.exIdx];

function startRun(planId, scheduleId) {
  const p = planById(planId);
  if (!p || !p.exercises.length) return;
  if (cardio) { showError(new Error('Trwa trening cardio – zakończ go, zanim zaczniesz trening siłowy')); return; }
  if (run && !confirm('Masz niezakończony trening. Porzucić go i zacząć nowy?')) return;
  run = {
    planId,
    planName: p.name,
    scheduleId: scheduleId || null,
    startedAt: Date.now(),
    exercises: p.exercises.map(e => ({ name: e.name, sets: e.sets, reps: e.reps, weight: e.weight, rest: e.rest, done: [] })),
    exIdx: 0,
    setIdx: 0,
    phase: 'work', // work | rest | summary
    reps: 0,
    weight: p.exercises[0].weight,
    restEnd: 0,
    restTotal: 0,
  };
  unlockAudio();
  saveRun();
  renderRunner();
}

function finishSet() {
  const ex = curEx();
  ex.done.push({ reps: run.reps, weight: run.weight });
  const rest = ex.rest;
  run.reps = 0;
  if (run.setIdx + 1 < ex.sets) run.setIdx++;
  else if (!advanceExercise()) return;
  startRest(rest);
}

// Przejście do następnego ćwiczenia; false = to był koniec treningu
function advanceExercise() {
  run.exIdx++;
  run.setIdx = 0;
  run.reps = 0;
  if (run.exIdx >= run.exercises.length) {
    run.exIdx = run.exercises.length - 1;
    finishRun();
    return false;
  }
  run.weight = curEx().weight;
  return true;
}

function finishRun() {
  run.phase = 'summary';
  run.finishedAt = Date.now();
  saveRun();
  renderRunner();
}

function startRest(sec) {
  if (sec > 0) {
    run.phase = 'rest';
    run.restTotal = sec;
    run.restEnd = Date.now() + sec * 1000;
    run.lastBeep = null;
  } else {
    run.phase = 'work';
  }
  saveRun();
  renderRunner();
}

function unlockAudio() {
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume();
  } catch { /* brak dźwięku – trudno */ }
}

function beep(freq, dur) {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.3, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  o.connect(g).connect(audioCtx.destination);
  o.start();
  o.stop(audioCtx.currentTime + dur);
}

// Ekran nie gaśnie w trakcie treningu (jeśli przeglądarka wspiera Wake Lock)
// Chcemy blokadę wtedy, gdy trening trwa; żądania są serializowane, więc kilka wywołań
// w jednym renderze (nakładki siłowa i cardio) nie zdobywa dwóch blokad naraz.
let wakeWanted = false, wakeBusy = false;
async function keepAwake(on) {
  wakeWanted = on;
  if (wakeBusy) return; // trwające żądanie samo sprawdzi nowy stan po zakończeniu
  wakeBusy = true;
  try {
    for (let i = 0; i < 4; i++) {
      if (wakeWanted && !wakeLock && 'wakeLock' in navigator) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      } else if (!wakeWanted && wakeLock) {
        const lock = wakeLock;
        wakeLock = null;
        await lock.release();
      } else break;
    }
  } catch { /* np. karta w tle */ }
  finally { wakeBusy = false; }
}

// Nakładka treningu (siłowego lub cardio) blokuje przewijanie; ekran nie gaśnie, dopóki trening trwa
function syncOverlayState() {
  document.body.style.overflow = run || cardio ? 'hidden' : '';
  keepAwake((!!run && run.phase !== 'summary') || (!!cardio && cardio.phase !== 'summary'));
}

// Timer liczony od znacznika czasu końca przerwy – odporny na uśpienie karty
function tick() {
  if (!run) return;
  const elapsed = $('#run-elapsed');
  if (elapsed) elapsed.textContent = '⏱ ' + fmtElapsed(((run.finishedAt || Date.now()) - run.startedAt) / 1000);
  if (run.phase !== 'rest') return;

  const msLeft = run.restEnd - Date.now();
  const left = Math.max(0, Math.ceil(msLeft / 1000));
  if (left <= 0) {
    beep(990, 0.6);
    navigator.vibrate?.([300, 100, 300]);
    run.phase = 'work';
    saveRun();
    renderRunner();
    return;
  }
  if (left <= 3 && run.lastBeep !== left) {
    run.lastBeep = left;
    beep(660, 0.15);
  }
  const time = $('#rest-time');
  if (time) time.textContent = fmtClock(left);
  const bar = $('#rest-bar');
  if (bar) bar.style.strokeDashoffset = CIRC * (1 - msLeft / (run.restTotal * 1000));
}
setInterval(tick, 250);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  syncOverlayState();
  tick();
  cardioTick();
});

// ---------- Trening: widok ----------
function setPills(ex) {
  return Array.from({ length: ex.sets }, (_, i) => {
    const d = ex.done[i];
    const cls = d ? 'done' : i === run.setIdx ? 'current' : '';
    return `<span class="set-pill ${cls}">${d ? d.reps : i + 1}</span>`;
  }).join('');
}

function renderRunner() {
  const el = $('#runner');
  el.hidden = !run;
  syncOverlayState();
  if (!run) { el.innerHTML = ''; return; }

  const total = run.exercises.reduce((n, e) => n + e.sets, 0);
  const done = run.exercises.reduce((n, e) => n + e.done.length, 0);
  const body = { work: runnerWork, rest: runnerRest, summary: runnerSummary }[run.phase]();

  el.innerHTML = `
    <div class="runner-top">
      <div><b>${esc(run.planName)}</b><div class="muted" id="run-elapsed"></div></div>
      ${run.phase !== 'summary' ? '<button class="btn small danger" data-action="run-end">Zakończ</button>' : ''}
    </div>
    <div class="runner-body">
      <div class="progress"><div style="width:${(done / total * 100).toFixed(1)}%"></div></div>
      ${body}
    </div>`;
  tick();
}

function runnerWork() {
  const ex = curEx();
  return `
    <div class="ex-title">
      <div class="muted">Ćwiczenie ${run.exIdx + 1} z ${run.exercises.length}</div>
      <h2>${esc(ex.name)}</h2>
      <div class="muted">Seria ${run.setIdx + 1} z ${ex.sets} · cel: ${ex.reps} powt.</div>
    </div>
    <div class="set-pills">${setPills(ex)}</div>
    <button class="rep-counter" data-action="rep-inc">
      <span class="num">${run.reps}</span>
      <span class="of">z ${ex.reps}</span>
      <span class="hint">stuknij = +1 powtórzenie</span>
    </button>
    <div class="row center">
      <button class="btn" data-action="rep-dec" ${run.reps ? '' : 'disabled'}>− 1</button>
      <button class="btn" data-action="set-full">Zrobione ${ex.reps}</button>
      <button class="btn primary" data-action="set-done" ${run.reps ? '' : 'disabled'}>Zakończ serię ✓</button>
    </div>
    <div class="weight-box">
      <span class="muted">Obciążenie</span>
      <input type="text" inputmode="decimal" id="run-weight" value="${run.weight ?? ''}" placeholder="masa ciała">
      <span class="muted">kg</span>
    </div>
    <label class="toggle"><input type="checkbox" id="auto-next" ${settings.autoNext ? 'checked' : ''}> kończ serię automatycznie po ${ex.reps} powt.</label>
    <button class="btn ghost small center-self" data-action="ex-skip">Pomiń ćwiczenie →</button>`;
}

function runnerRest() {
  const ex = curEx();
  return `
    <div class="ex-title"><h2>Odpoczynek</h2></div>
    <div class="timer">
      <svg viewBox="0 0 120 120">
        <circle class="track" cx="60" cy="60" r="54" fill="none" stroke-width="8"/>
        <circle id="rest-bar" class="bar" cx="60" cy="60" r="54" fill="none" stroke-width="8" stroke-dasharray="${CIRC}" stroke-dashoffset="0"/>
      </svg>
      <div class="label"><span class="time" id="rest-time"></span><span class="muted">przerwa</span></div>
    </div>
    <div class="row center">
      <button class="btn" data-action="rest-add" data-sec="-15">−15 s</button>
      <button class="btn" data-action="rest-add" data-sec="15">+15 s</button>
      <button class="btn primary" data-action="rest-skip">Pomiń ⏭</button>
    </div>
    <div class="card next-up">
      <span class="muted">${run.setIdx === 0 ? 'Następne ćwiczenie' : 'Następna seria'}</span>
      <b>${esc(ex.name)}</b>
      <span class="muted">Seria ${run.setIdx + 1} z ${ex.sets} · ${ex.reps} powt. · ${fmtWeight(run.weight)}</span>
    </div>
    <div class="set-pills">${setPills(ex)}</div>`;
}

function runnerSummary() {
  const items = run.exercises.map(e =>
    `<li><b>${esc(e.name)}</b><br><span class="muted">${e.done.length ? e.done.map(fmtSet).join(', ') : 'pominięte'}</span></li>`).join('');
  return `
    <div class="ex-title">
      <h2>🎉 Trening zakończony</h2>
      <div class="muted">Czas: ${fmtDuration(run.finishedAt - run.startedAt)}</div>
    </div>
    <div class="card"><ol class="summary-list">${items}</ol></div>
    <label class="field">Notatka (opcjonalnie)<textarea id="run-note" placeholder="Jak poszło? Samopoczucie, uwagi…">${esc(run.note || '')}</textarea></label>
    <button class="btn primary big" data-action="run-save">Zapisz w dzienniku</button>
    <button class="btn ghost danger" data-action="run-discard">Odrzuć trening</button>`;
}

// ---------- Cardio: kreator, szablony ----------
const setText = (sel, text) => {
  const el = $(sel);
  if (el && el.textContent !== String(text)) el.textContent = text;
};

// Czas całkowity z pól „minuty” i „sekundy” kreatora (puste lub błędne pole = 0)
function cardioTotalSec() {
  const part = v => Math.max(0, Math.floor(Number(v) || 0));
  return part(ui.cardio.min) * 60 + part(ui.cardio.sec);
}
const cardioPlanCheck = () => CardioCore.checkPlan(ui.cardio.intervals, cardioTotalSec());
const cardioLiveText = plan => (plan.ok
  ? `Mieści się w pełnych cyklach: ${CardioCore.cyclesLabel(plan.cycles)} (cykl ${CardioCore.formatClock(plan.cycleSec)}).`
  : plan.message);

// Start, „Zapisz jako szablon” i nazwa są zablokowane, dopóki plan nie mieści się w pełnych cyklach
function syncCardioBuilder() {
  const live = $('#cardio-live');
  if (!live) return;
  const plan = cardioPlanCheck();
  live.textContent = cardioLiveText(plan);
  live.className = `cardio-live ${plan.ok ? 'ok' : 'bad'}`;
  for (const sel of ['#cardio-build-start', '#cardio-tpl-name', '#cardio-save-tpl']) {
    const el = $(sel);
    if (el) el.disabled = !plan.ok;
  }
  const sched = $('#cardio-sched-add');
  if (sched) sched.disabled = !cardioCanSchedule(plan);
}

// Data dodania do kalendarza: domyślnie dzień zaznaczony w kalendarzu, dopóki użytkownik jej nie zmieni
const cardioSchedDate = () => ui.cardio.date ?? ui.selected;
// „Dodaj do kalendarza” wymaga planu mieszczącego się w cyklach, nazwy i daty
const cardioCanSchedule = plan => plan.ok && !!ui.cardio.name.trim() && !!cardioSchedDate();

function viewCardio() {
  const b = ui.cardio;
  const plan = cardioPlanCheck();
  const dis = plan.ok ? '' : 'disabled';
  const schedDis = cardioCanSchedule(plan) ? '' : 'disabled';
  const rows = b.intervals.map((sec, i) => `
    <li>
      <span class="ex-num">${i + 1}.</span>
      <span class="grow">${sec} s</span>
      <button class="btn ghost small danger" data-action="cardio-remove-interval" data-index="${i}" aria-label="Usuń interwał ${i + 1}">✕</button>
    </li>`).join('');

  const templates = db.cardioTemplates.map(t => {
    const tp = CardioCore.checkPlan(t.intervals, t.totalSec);
    return `
    <div class="card cardio">
      <h3>${esc(t.name)}</h3>
      <div class="muted">${esc(CardioCore.intervalsList(t.intervals))} · razem ${CardioCore.formatClock(t.totalSec)} · ${esc(CardioCore.cyclesLabel(tp.cycles))}</div>
      <div class="row mt">
        <button class="btn primary" data-action="cardio-start" data-template="${esc(t.id)}">▶ Start</button>
        <button class="btn ghost danger" data-action="cardio-template-del" data-id="${esc(t.id)}">Usuń</button>
      </div>
    </div>`;
  }).join('');

  return `
    <div class="section-title"><h2>Cardio</h2></div>
    <div class="card cardio">
      <h3>Trening swobodny</h3>
      <p class="muted">Stoper z pauzą – wynik liczy tylko czas aktywny.</p>
      <button class="btn primary" data-action="cardio-start-free">▶ Start</button>
    </div>
    <div class="card cardio" id="cardio-builder">
      <h3>Trening interwałowy</h3>
      ${rows ? `<ul class="ex-list">${rows}</ul>` : '<p class="muted">Dodaj interwały – po kolei będą się powtarzać do końca czasu.</p>'}
      <form id="cardio-interval-form" class="row mt" novalidate>
        <label class="field grow">Nowy interwał (s)<input type="number" name="sec" id="cardio-add-sec" inputmode="numeric" value="${esc(b.addSec)}"></label>
        <button class="btn">+ Dodaj interwał</button>
      </form>
      <div class="row mt">
        <label class="field grow">Czas całkowity – minuty<input type="number" id="cardio-total-min" inputmode="numeric" min="0" value="${esc(b.min)}"></label>
        <label class="field grow">sekundy<input type="number" id="cardio-total-sec" inputmode="numeric" min="0" value="${esc(b.sec)}"></label>
      </div>
      <div id="cardio-live" class="cardio-live ${plan.ok ? 'ok' : 'bad'}">${esc(cardioLiveText(plan))}</div>
      <button class="btn primary big mt" id="cardio-build-start" data-action="cardio-build-start" ${dis}>▶ Start</button>
      <form id="cardio-tpl-form" class="row mt">
        <input type="text" id="cardio-tpl-name" name="name" required class="grow" maxlength="120" placeholder="Nazwa szablonu" autocomplete="off" value="${esc(b.name)}" ${dis}>
        <button class="btn" id="cardio-save-tpl" ${dis}>Zapisz jako szablon</button>
      </form>
      <div class="row mt">
        <label class="field grow">Data w kalendarzu<input type="date" id="cardio-sched-date" value="${esc(cardioSchedDate())}"></label>
        <button class="btn" id="cardio-sched-add" data-action="cardio-template-schedule" ${schedDis}>Dodaj do kalendarza</button>
      </div>
    </div>
    <div class="section-title mt-lg"><h2>Szablony</h2></div>
    ${templates || '<div class="empty">Brak szablonów. Zapisz plan interwałowy jako szablon, aby szybko go uruchamiać.</div>'}`;
}

// ---------- Cardio: logika treningu ----------
let cardioShown = null;      // co jest teraz narysowane w nakładce: { stage, pos, paused }
let cardioFlash = false;     // podświetl bieżący interwał po zmianie
let cardioLastBeep = null;   // ostatnia sekunda odliczania, na którą zabrzmiał sygnał

function startCardio({ mode, name, intervals = null, totalSec = null, templateId = null, scheduleId = null }) {
  if (run) throw new Error('Trwa trening siłowy – zakończ go, zanim zaczniesz cardio');
  if (cardio) throw new Error('Masz niezakończony trening cardio');
  if (mode === 'interval') {
    const plan = CardioCore.checkPlan(intervals, totalSec);
    if (!plan.ok) throw new Error(plan.message);
  }
  const now = Date.now();
  cardio = {
    mode, name, templateId, scheduleId, intervals, totalSec,
    startedAt: now,
    // w treningu interwałowym czas rusza dopiero po odliczaniu 3-2-1
    session: mode === 'interval' ? CardioCore.newIntervalSession(now) : CardioCore.newSession(now),
    phase: 'running', // running | summary
    pos: 0,
    note: '',
  };
  cardioShown = null;
  cardioLastBeep = null;
  unlockAudio();
  saveCardio();
  renderCardio();
}

function cardioStage(now) {
  if (cardio.phase === 'summary') return 'summary';
  if (cardio.mode === 'interval' && CardioCore.countdownSec(cardio.session, now) > 0) return 'countdown';
  return 'running';
}

const cardioInterval = now => CardioCore.intervalAt(cardio.intervals, cardio.totalSec, CardioCore.activeMs(cardio.session, now));

function finishCardio(now, auto = false) {
  const s = cardio.session;
  const limitMs = cardio.mode === 'interval' ? cardio.totalSec * 1000 : Infinity;
  cardio.activeMs = Math.min(CardioCore.activeMs(s, now), limitMs);
  // po samoczynnym końcu liczy się dokładna chwila upłynięcia czasu, nie moment wykrycia (uśpiona karta)
  cardio.finishedAt = auto ? s.startedAt + s.pausedMs + limitMs : now;
  cardio.phase = 'summary';
  saveCardio();
  renderCardio();
}

// Czas pochodzi wyłącznie ze znaczników czasu – uśpiona karta czy przeładowanie trafiają we właściwą chwilę
function cardioTick() {
  if (!cardio || cardio.phase === 'summary') return;
  const now = Date.now();
  const stage = cardioStage(now);
  const paused = cardio.session.pausedAt != null;
  if (!cardioShown || cardioShown.stage !== stage || cardioShown.paused !== paused) { renderCardio(); return; }

  if (stage === 'countdown') {
    const left = CardioCore.countdownSec(cardio.session, now);
    if (cardioLastBeep !== left) { cardioLastBeep = left; beep(660, 0.15); }
    setText('#cardio-countdown', left);
    return;
  }
  setText('#cardio-active', CardioCore.formatClock(CardioCore.activeMs(cardio.session, now) / 1000));
  if (cardio.mode !== 'interval') return;

  const r = cardioInterval(now);
  if (r.done) {
    beep(990, 0.6);
    navigator.vibrate?.([300, 100, 300]);
    finishCardio(now, true);
    return;
  }
  if (r.position !== cardio.pos) {
    cardio.pos = r.position;
    cardioFlash = true;
    saveCardio();
    beep(880, 0.25);
    navigator.vibrate?.(200);
    renderCardio();
    return;
  }
  setText('#cardio-remaining', CardioCore.formatClock(Math.ceil(r.remainingMs / 1000)));
}
setInterval(cardioTick, 250);

// ---------- Cardio: nakładka ----------
function renderCardio() {
  const el = $('#cardio-runner');
  el.hidden = !cardio;
  syncOverlayState();
  if (!cardio) { el.innerHTML = ''; cardioShown = null; return; }

  const now = Date.now();
  const stage = cardioStage(now);
  // Po przeładowaniu czas treningu mógł już minąć – od razu podsumowanie
  if (stage === 'running' && cardio.mode === 'interval' && cardioInterval(now).done) { finishCardio(now, true); return; }

  cardioShown = { stage, pos: cardio.pos, paused: cardio.session.pausedAt != null };
  const body = { countdown: cardioCountdown, running: cardioRunning, summary: cardioSummary }[stage](now);
  const modeLabel = cardio.mode === 'interval' ? 'Trening interwałowy' : 'Trening swobodny';
  el.innerHTML = `
    <div class="runner-top">
      <div><b>${esc(cardio.name)}</b><div class="muted">${modeLabel}</div></div>
      ${stage !== 'summary' ? '<button class="btn small danger" data-action="cardio-end">Zakończ</button>' : ''}
    </div>
    <div class="runner-body">${body}</div>`;
  cardioFlash = false;
  cardioTick();
}

function cardioCountdown() {
  return `
    <div class="ex-title">
      <h2>Przygotuj się</h2>
      <div class="muted">${esc(CardioCore.intervalsList(cardio.intervals))} · razem ${CardioCore.formatClock(cardio.totalSec)}</div>
    </div>
    <div class="cardio-big" id="cardio-countdown" aria-live="assertive"></div>`;
}

function cardioRunning(now) {
  const paused = cardio.session.pausedAt != null;
  const controls = paused
    ? '<button class="btn primary big" data-action="cardio-resume">▶ Wznów</button>'
    : '<button class="btn big" data-action="cardio-pause">⏸ Pauza</button>';
  const state = paused ? '<div class="cardio-paused" id="cardio-state">Wstrzymano</div>' : '<div id="cardio-state"></div>';

  if (cardio.mode === 'free') {
    return `
      <div class="ex-title"><div class="muted">Czas aktywny</div></div>
      <div class="cardio-big" id="cardio-active"></div>
      ${state}
      ${controls}`;
  }

  const r = cardioInterval(now);
  const cycles = cardio.totalSec / cardio.intervals.reduce((a, b) => a + b, 0);
  const next = CardioCore.nextIntervalSec(cardio.intervals, cardio.totalSec, r.position);
  return `
    <div class="ex-title">
      <div class="muted" id="cardio-position">Interwał ${r.index + 1} z ${cardio.intervals.length} · cykl ${r.cycle + 1} z ${cycles}</div>
      <h2 id="cardio-now" class="cardio-now${cardioFlash ? ' flash' : ''}">Teraz: ${r.intervalSec} s</h2>
    </div>
    <div class="cardio-big" id="cardio-remaining"></div>
    ${state}
    <div class="card next-up">
      <span class="muted">Następny interwał</span>
      <b id="cardio-next">${next === null ? 'Koniec treningu' : `${next} s`}</b>
    </div>
    <div class="stats center">
      <span>Czas aktywny <b id="cardio-active"></b></span>
      <span>z <b>${CardioCore.formatClock(cardio.totalSec)}</b></span>
    </div>
    ${controls}`;
}

function cardioSummary() {
  const planned = cardio.mode === 'interval'
    ? `<li>Interwały: <b>${esc(CardioCore.intervalsList(cardio.intervals))}</b> × <b>${esc(CardioCore.cyclesLabel(CardioCore.checkPlan(cardio.intervals, cardio.totalSec).cycles))}</b></li>`
    : '';
  return `
    <div class="ex-title">
      <h2>🎉 Trening zakończony</h2>
      <div class="muted">${esc(cardio.name)}</div>
    </div>
    <div class="card"><ul class="summary-list">
      <li>Tryb: <b>${cardio.mode === 'interval' ? 'interwałowy' : 'swobodny'}</b></li>
      <li>Czas aktywny: <b id="cardio-summary-active">${CardioCore.formatClock(cardio.activeMs / 1000)}</b></li>
      ${planned}
    </ul></div>
    <label class="field">Notatka (opcjonalnie)<textarea id="cardio-note" placeholder="Jak poszło? Samopoczucie, uwagi…">${esc(cardio.note || '')}</textarea></label>
    <button class="btn primary big" data-action="cardio-save">Zapisz w dzienniku</button>
    <button class="btn ghost danger" data-action="cardio-discard">Odrzuć trening</button>`;
}

// ---------- Akcje ----------
const actions = {
  // kalendarz
  'cal-prev': () => { ui.month = new Date(ui.month.getFullYear(), ui.month.getMonth() - 1, 1); render(); },
  'cal-next': () => { ui.month = new Date(ui.month.getFullYear(), ui.month.getMonth() + 1, 1); render(); },
  'cal-today': () => {
    const n = new Date();
    ui.month = new Date(n.getFullYear(), n.getMonth(), 1);
    ui.selected = ymd(n);
    render();
  },
  'cal-select': d => {
    ui.selected = d.date;
    const s = parseYmd(d.date);
    ui.month = new Date(s.getFullYear(), s.getMonth(), 1);
    render();
  },
  'sched-del': async d => {
    await api('DELETE', `api/schedule/${d.id}`);
    db.schedule = db.schedule.filter(s => s.id !== d.id);
    render();
  },
  'start': d => startRun(d.plan, d.sched),

  // plany
  'plan-new': async () => {
    const p = await api('POST', 'api/plans', { name: 'Nowy plan' });
    db.plans.push(p);
    ui.editPlanId = p.id;
    ui.editExId = null;
    render();
    $('#plan-name').select();
  },
  'plan-edit': d => { ui.editPlanId = d.id; ui.editExId = null; render(); },
  'plan-del': async d => {
    const p = planById(d.id);
    if (!confirm(`Usunąć plan „${p.name}”? Niewykonane treningi z tym planem znikną też z kalendarza.`)) return;
    await api('DELETE', `api/plans/${d.id}`);
    await loadState();
  },
  'plan-done': () => { ui.editPlanId = null; ui.editExId = null; render(); },
  'ex-move': d => {
    const list = planById(ui.editPlanId).exercises;
    const i = list.findIndex(e => e.id === d.id);
    const j = i + Number(d.dir);
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    savePlan(planById(ui.editPlanId));
    render();
  },
  'ex-edit': d => { ui.editExId = d.id; render(); $('#ex-form').scrollIntoView({ behavior: 'smooth', block: 'center' }); },
  'ex-del': d => {
    const p = planById(ui.editPlanId);
    p.exercises = p.exercises.filter(e => e.id !== d.id);
    if (ui.editExId === d.id) ui.editExId = null;
    savePlan(p);
    render();
  },
  'ex-cancel': () => { ui.editExId = null; render(); },

  // baza ćwiczeń
  'lib-edit': d => { ui.libEditId = d.id; render(); $('#lib-rename-form [name=name]').select(); },
  'lib-cancel': () => { ui.libEditId = null; render(); },
  'lib-del': async d => {
    const ex = db.exercises.find(e => e.id === d.id);
    const used = plansUsing(d.id);
    if (used.length) throw new Error(`Najpierw usuń „${ex.name}” z planów: ${used.join(', ')}`);
    if (!confirm(`Usunąć „${ex.name}” z bazy ćwiczeń?`)) return;
    await api('DELETE', `api/exercises/${d.id}`);
    db.exercises = db.exercises.filter(e => e.id !== d.id);
    render();
  },

  // dziennik
  'log-del': async d => {
    if (!confirm('Usunąć ten wpis z dziennika?')) return;
    await api('DELETE', `api/workouts/${d.id}`);
    db.log = db.log.filter(l => l.id !== d.id);
    render();
  },
  'import': () => $('#import-file').click(),

  // cardio
  'cardio-start-free': () => startCardio({ mode: 'free', name: 'Cardio swobodne' }),
  'cardio-build-start': () => {
    const intervals = [...ui.cardio.intervals];
    startCardio({ mode: 'interval', name: CardioCore.intervalsName(intervals), intervals, totalSec: cardioTotalSec() });
  },
  'cardio-start': d => {
    const t = db.cardioTemplates.find(x => x.id === d.template);
    if (!t) throw new Error('Nie znaleziono szablonu cardio');
    startCardio({ mode: 'interval', name: t.name, intervals: [...t.intervals], totalSec: t.totalSec, templateId: t.id, scheduleId: d.sched || null });
  },
  'cardio-remove-interval': d => { ui.cardio.intervals.splice(Number(d.index), 1); render(); },
  // Zapisuje kreator jako szablon i od razu planuje go na wybrany dzień
  'cardio-template-schedule': async (d, btn) => {
    const plan = cardioPlanCheck();
    if (!plan.ok) throw new Error(plan.message);
    if (!cardioCanSchedule(plan)) throw new Error('Podaj nazwę szablonu i datę');
    const date = cardioSchedDate();
    btn.disabled = true;
    try {
      const template = await api('POST', 'api/cardio-templates', {
        name: ui.cardio.name,
        intervals: [...ui.cardio.intervals],
        totalSec: cardioTotalSec(),
      });
      db.cardioTemplates.push(template);
      ui.cardio.name = '';
      try {
        db.schedule.push(...await api('POST', 'api/schedule', { cardioTemplateId: template.id, dates: [date] }));
      } catch (err) {
        render(); // szablon już istnieje – widok ma go pokazać, żeby nie zapisać go drugi raz
        throw new Error(`Szablon zapisano, ale nie dodano go do kalendarza: ${err.message}`);
      }
      render();
    } finally { btn.disabled = false; }
  },
  'cardio-template-del': async d => {
    const t = db.cardioTemplates.find(x => x.id === d.id);
    if (!t) return;
    if (!confirm(`Usunąć szablon „${t.name}”? Niewykonane treningi z tym szablonem znikną też z kalendarza.`)) return;
    await api('DELETE', `api/cardio-templates/${d.id}`);
    await loadState();
  },
  'cardio-log-del': async d => {
    if (!confirm('Usunąć ten wpis z dziennika?')) return;
    await api('DELETE', `api/cardio-workouts/${d.id}`);
    db.cardioLog = db.cardioLog.filter(l => l.id !== d.id);
    render();
  },
  'cardio-pause': () => {
    if (!cardio || cardioStage(Date.now()) !== 'running') return; // w odliczaniu nie ma pauzy
    cardio.session = CardioCore.pause(cardio.session, Date.now());
    saveCardio();
    renderCardio();
  },
  'cardio-resume': () => {
    if (!cardio) return;
    cardio.session = CardioCore.resume(cardio.session, Date.now());
    saveCardio();
    renderCardio();
  },
  'cardio-end': () => {
    if (CardioCore.activeMs(cardio.session, Date.now()) <= 0) {
      if (confirm('Przerwać trening cardio? Nie zmierzono jeszcze żadnego czasu.')) { cardio = null; saveCardio(); renderCardio(); }
      return;
    }
    if (confirm('Zakończyć trening cardio teraz?')) finishCardio(Date.now());
  },
  // Przy błędzie sieci trening zostaje na ekranie podsumowania – można ponowić zapis
  'cardio-save': async (d, btn) => {
    btn.disabled = true;
    const interval = cardio.mode === 'interval';
    const entry = await api('POST', 'api/cardio-workouts', {
      templateId: cardio.templateId,
      scheduleId: cardio.scheduleId,
      name: cardio.name,
      mode: cardio.mode,
      ...(interval ? { intervals: cardio.intervals, totalSec: cardio.totalSec } : {}),
      date: ymd(new Date(cardio.startedAt)),
      startedAt: cardio.startedAt,
      finishedAt: cardio.finishedAt,
      activeSec: Math.round(cardio.activeMs / 1000),
      note: (cardio.note || '').trim(),
    }).finally(() => { btn.disabled = false; });
    db.cardioLog.push(entry);
    cardio = null;
    saveCardio();
    ui.tab = 'journal';
    render();
  },
  'cardio-discard': () => {
    if (!confirm('Odrzucić trening cardio bez zapisu?')) return;
    cardio = null;
    saveCardio();
    render();
  },

  // trening
  'rep-inc': () => {
    run.reps++;
    navigator.vibrate?.(15);
    if (settings.autoNext && run.reps >= curEx().reps) finishSet();
    else { saveRun(); renderRunner(); }
  },
  'rep-dec': () => { run.reps = Math.max(0, run.reps - 1); saveRun(); renderRunner(); },
  'set-full': () => { run.reps = curEx().reps; finishSet(); },
  'set-done': () => finishSet(),
  'rest-add': d => {
    run.restEnd += Number(d.sec) * 1000;
    run.restTotal = Math.max(run.restTotal, (run.restEnd - Date.now()) / 1000);
    saveRun();
    tick();
  },
  'rest-skip': () => { run.phase = 'work'; saveRun(); renderRunner(); },
  'ex-skip': () => {
    if (!confirm(`Pominąć pozostałe serie: ${curEx().name}?`)) return;
    if (advanceExercise()) { run.phase = 'work'; saveRun(); renderRunner(); }
  },
  'run-end': () => {
    const anyDone = run.exercises.some(e => e.done.length);
    if (!anyDone) {
      if (confirm('Przerwać trening? Nie zrobiono jeszcze żadnej serii.')) { run = null; saveRun(); renderRunner(); }
      return;
    }
    if (confirm('Zakończyć trening teraz?')) finishRun();
  },
  // Przy błędzie sieci trening zostaje na ekranie podsumowania – można ponowić zapis
  'run-save': async (d, btn) => {
    btn.disabled = true;
    const entry = await api('POST', 'api/workouts', {
      planId: run.planId,
      planName: run.planName,
      scheduleId: run.scheduleId,
      date: ymd(new Date(run.startedAt)),
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      note: (run.note || '').trim(),
      exercises: run.exercises.map(e => ({ name: e.name, targetReps: e.reps, sets: e.done })),
    }).finally(() => { btn.disabled = false; });
    db.log.push(entry);
    run = null;
    saveRun();
    ui.tab = 'journal';
    render();
  },
  'run-discard': () => {
    if (!confirm('Odrzucić trening bez zapisu?')) return;
    run = null;
    saveRun();
    render();
  },
};

// ---------- Zdarzenia ----------
document.addEventListener('click', e => {
  const tab = e.target.closest('#tabs button');
  if (tab) {
    ui.tab = tab.dataset.tab;
    ui.editPlanId = null;
    ui.editExId = null;
    ui.libEditId = null;
    render();
    return;
  }
  const btn = e.target.closest('[data-action]');
  if (!btn || btn.disabled) return;
  if (run || cardio) unlockAudio();
  const action = actions[btn.dataset.action];
  if (action) Promise.resolve().then(() => action(btn.dataset, btn)).catch(showError);
});

document.addEventListener('submit', e => {
  e.preventDefault();
  onSubmit(e.target).catch(showError);
});

async function onSubmit(f) {
  const fd = new FormData(f);

  if (f.id === 'ex-form') {
    const p = planById(ui.editPlanId);
    const name = String(fd.get('name')).trim();
    if (!name) return;
    // Ćwiczenie z bazy; nowa nazwa trafia najpierw do bazy ćwiczeń
    const exercise = findExercise(name) ?? await addToLibrary(name);
    const data = {
      exerciseId: exercise.id,
      name: exercise.name,
      sets: clampInt(fd.get('sets'), 1, 50),
      reps: clampInt(fd.get('reps'), 1, 500),
      weight: toWeight(fd.get('weight')),
      rest: clampInt(fd.get('rest'), 0, 900),
    };
    const ex = p.exercises.find(x => x.id === ui.editExId);
    if (ex) Object.assign(ex, data);
    else p.exercises.push({ id: uid(), ...data });
    ui.exDefaults = { sets: data.sets, reps: data.reps, rest: data.rest };
    ui.editExId = null;
    savePlan(p);
    render();
  }

  if (f.id === 'lib-form') {
    await addToLibrary(String(fd.get('name')));
    render();
    $('#lib-form [name=name]').focus();
  }

  if (f.id === 'lib-rename-form') {
    await api('PUT', `api/exercises/${ui.libEditId}`, { name: fd.get('name') });
    ui.libEditId = null;
    await loadState(); // nazwa zmienia się we wszystkich planach
  }

  if (f.id === 'cardio-interval-form') {
    const sec = Number(fd.get('sec'));
    // pojedynczy interwał sprawdzamy tymi samymi limitami co cały plan
    const single = CardioCore.checkPlan([sec], sec);
    if (!single.ok) throw new Error(single.message);
    ui.cardio.intervals.push(sec);
    ui.cardio.addSec = sec;
    render();
    $('#cardio-add-sec').focus();
  }

  if (f.id === 'cardio-tpl-form') {
    const plan = cardioPlanCheck();
    if (!plan.ok) throw new Error(plan.message);
    const template = await api('POST', 'api/cardio-templates', {
      name: fd.get('name'),
      intervals: [...ui.cardio.intervals],
      totalSec: cardioTotalSec(),
    });
    db.cardioTemplates.push(template);
    ui.cardio.name = '';
    render();
  }

  if (f.id === 'sched-form') {
    const weeks = fd.get('repeat') ? clampInt(fd.get('weeks'), 1, 52) : 1;
    const base = parseYmd(ui.selected);
    const dates = Array.from({ length: weeks }, (_, i) => ymd(addDays(base, 7 * i)));
    // wartość opcji: „plan:<id>” albo „cardio:<id>”
    const [kind, ...rest] = String(fd.get('plan')).split(':');
    const target = kind === 'cardio' ? { cardioTemplateId: rest.join(':') } : { planId: rest.join(':') };
    db.schedule.push(...await api('POST', 'api/schedule', { ...target, dates }));
    render();
  }
}

async function addToLibrary(name) {
  if (findExercise(name)) throw new Error(`Ćwiczenie „${name.trim()}” już jest w bazie`);
  const exercise = await api('POST', 'api/exercises', { name });
  db.exercises.push(exercise);
  db.exercises.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  return exercise;
}

let nameTimer;
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'plan-name') {
    const p = planById(ui.editPlanId);
    p.name = t.value.trim() || 'Bez nazwy';
    clearTimeout(nameTimer);
    nameTimer = setTimeout(() => savePlan(p), 400);
  }
  if (t.id === 'lib-filter') { ui.libFilter = t.value; $('#lib-list').innerHTML = libraryList(); }
  if (t.id === 'run-weight') { run.weight = toWeight(t.value); saveRun(); }
  if (t.id === 'run-note') { run.note = t.value; saveRun(); }
  if (t.id === 'cardio-add-sec') ui.cardio.addSec = t.value;
  if (t.id === 'cardio-total-min') { ui.cardio.min = t.value; syncCardioBuilder(); }
  if (t.id === 'cardio-total-sec') { ui.cardio.sec = t.value; syncCardioBuilder(); }
  if (t.id === 'cardio-tpl-name') { ui.cardio.name = t.value; syncCardioBuilder(); }
  if (t.id === 'cardio-sched-date') { ui.cardio.date = t.value; syncCardioBuilder(); }
  if (t.id === 'cardio-note') { cardio.note = t.value; saveCardio(); }
});

document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'auto-next') { settings.autoNext = t.checked; localStorage.setItem(AUTO_KEY, JSON.stringify(t.checked)); }
  if (t.id === 'import-file') importData(t.files[0]).catch(showError);
});

render();
loadState().catch(err => {
  $('#view').innerHTML = `<div class="empty">Nie udało się połączyć z serwerem.<br><span class="muted">${esc(err.message)}</span></div>`;
});
