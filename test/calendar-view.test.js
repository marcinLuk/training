'use strict';
// Testy widoku kalendarza i kreatora cardio (public/app.js) uruchamione w node:vm
// z minimalnymi atrapami przeglądarki. Plik app.js można podmienić zmienną
// APP_JS_PATH (używane tylko do sprawdzania, czy testy łapią błędne warianty).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const PUBLIC = path.join(__dirname, '..', 'public');
const APP_PATH = process.env.APP_JS_PATH || path.join(PUBLIC, 'app.js');

function loadApp() {
  const el = () => ({
    innerHTML: '', textContent: '', hidden: false, disabled: false, className: '', value: '',
    style: {}, dataset: {}, classList: { toggle() {}, add() {}, remove() {} },
    addEventListener() {}, setAttribute() {}, appendChild() {}, querySelector: () => null,
    querySelectorAll: () => [],
  });
  const store = new Map();
  const els = new Map(); // trwały element na selektor (dla syncCardioBuilder)
  const ctx = {
    document: {
      querySelector: sel => { if (!els.has(sel)) els.set(sel, el()); return els.get(sel); },
      querySelectorAll: () => [],
      addEventListener() {},
      body: { style: {} },
      visibilityState: 'visible',
    },
    localStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: k => store.delete(k),
    },
    fetch: () => new Promise(() => {}), // stan serwera nigdy nie nadejdzie
    navigator: {},
    setInterval: () => 0,
    setTimeout: () => 0,
    clearTimeout() {},
    console,
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(PUBLIC, 'cardio-core.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(APP_PATH, 'utf8'), ctx);
  // let/const z app.js nie są właściwościami kontekstu – udostępniamy je przez akcesor
  const api = vm.runInContext(
    '({ get db() { return db; }, set db(v) { db = v; }, ui, viewCalendar, viewCardio, dayItems, syncCardioBuilder })',
    ctx,
  );
  api.els = els;
  return api;
}

const app = loadApp();

const SELECTED = '2031-03-14';

function setup({ plans = [], cardioTemplates = [], schedule = [], log = [], cardioLog = [] } = {}) {
  app.db = { exercises: [], plans, schedule, log, cardioTemplates, cardioLog };
  app.ui.tab = 'calendar';
  app.ui.month = new Date(2031, 2, 1);
  app.ui.selected = SELECTED;
  Object.assign(app.ui.cardio, { intervals: [30, 60], min: 9, sec: 0, name: 'Tabata', date: null });
}

const TEMPLATE = { id: 'tpl1', name: 'Szablon A', intervals: [30, 60], totalSec: 540 };

test('dayItems: wpis z szablonem cardio jest elementem cardio nazwanym po szablonie, niewykonanym', () => {
  setup({ cardioTemplates: [TEMPLATE], schedule: [{ id: 's1', date: SELECTED, planId: null, cardioTemplateId: 'tpl1' }] });
  const [i, ...rest] = app.dayItems(SELECTED);
  assert.equal(rest.length, 0);
  assert.equal(i.cardio, true);
  assert.equal(i.kind, 'sched');
  assert.equal(i.templateId, 'tpl1');
  assert.equal(i.name, 'Szablon A');
  assert.equal(i.done, false);
});

test('dayItems: wykonany wpis usuniętego szablonu to cardio z nazwą z treningu (przez cardioLog.scheduleId)', () => {
  setup({
    schedule: [{ id: 's1', date: SELECTED, planId: null, cardioTemplateId: null }],
    cardioLog: [{ id: 'c1', date: SELECTED, name: 'Stara nazwa', scheduleId: 's1', templateId: null }],
  });
  const [i, ...rest] = app.dayItems(SELECTED);
  assert.equal(rest.length, 0, 'wpis nie może się zdublować jako luźny trening');
  assert.equal(i.cardio, true);
  assert.equal(i.kind, 'sched');
  assert.equal(i.done, true);
  assert.equal(i.name, 'Stara nazwa');
});

test('dayItems: luźny trening cardio trafia na swoją datę, a nie na inne dni', () => {
  setup({ cardioLog: [{ id: 'c9', date: SELECTED, name: 'Wolny bieg', scheduleId: null, templateId: null }] });
  const [i, ...rest] = app.dayItems(SELECTED);
  assert.equal(rest.length, 0);
  assert.equal(i.kind, 'log');
  assert.equal(i.cardio, true);
  assert.equal(i.done, true);
  assert.equal(i.name, 'Wolny bieg');
  assert.equal(app.dayItems('2031-03-15').length, 0);
});

test('dayItems: wpis siłowy z usuniętym planem zostaje siłowy i nazywa się "(usunięty plan)"', () => {
  setup({ schedule: [{ id: 's2', date: SELECTED, planId: 'gone', cardioTemplateId: null }] });
  const [i, ...rest] = app.dayItems(SELECTED);
  assert.equal(rest.length, 0);
  assert.ok(!i.cardio);
  assert.equal(i.done, false);
  assert.equal(i.name, '(usunięty plan)');
  const html = app.viewCalendar();
  assert.ok(html.includes('(usunięty plan)'));
  assert.ok(!html.includes('tag cardio'));
});

test('viewCalendar: zaplanowany wpis cardio ma kartę cardio z przyciskiem Usuń (sched-del)', () => {
  setup({ cardioTemplates: [TEMPLATE], schedule: [{ id: 's1', date: SELECTED, planId: null, cardioTemplateId: 'tpl1' }] });
  const html = app.viewCalendar();
  const card = html.match(/<div class="card row between cardio"[^>]*>[\s\S]*?\n    <\/div>/);
  assert.ok(card, 'karta cardio');
  assert.ok(card[0].includes('data-action="sched-del"'));
  assert.ok(card[0].includes('data-id="s1"'));
  assert.ok(card[0].includes('data-action="cardio-start"'));
  assert.ok(card[0].includes('data-template="tpl1"') && card[0].includes('data-sched="s1"'));
  assert.ok(card[0].includes('<span class="tag cardio">cardio</span>'));
});

test('viewCalendar: luźny trening cardio nie ma przycisku Usuń', () => {
  setup({ cardioLog: [{ id: 'c9', date: SELECTED, name: 'Wolny bieg', scheduleId: null, templateId: null }] });
  const html = app.viewCalendar();
  assert.ok(html.includes('class="card row between cardio"'));
  assert.ok(!html.includes('data-action="sched-del"'));
});

test('viewCalendar: formularz dodawania pokazuje się z samymi szablonami cardio (bez planów)', () => {
  setup({ plans: [], cardioTemplates: [TEMPLATE] });
  const html = app.viewCalendar();
  assert.ok(html.includes('id="sched-form"'));
  assert.ok(html.includes('<optgroup label="Szablony cardio">'));
  assert.ok(html.includes('value="cardio:tpl1"'));
  assert.ok(!html.includes('Plany siłowe'));
});

test('viewCalendar: bez planów i szablonów formularza nie ma', () => {
  setup();
  const html = app.viewCalendar();
  assert.ok(!html.includes('id="sched-form"'));
});

test('viewCardio: data dodania do kalendarza domyślnie to zaznaczony dzień', () => {
  setup({ cardioTemplates: [] });
  const html = app.viewCardio();
  assert.ok(html.includes(`id="cardio-sched-date" value="${SELECTED}"`));
  app.ui.selected = '2031-04-02';
  assert.ok(app.viewCardio().includes('id="cardio-sched-date" value="2031-04-02"'));
  app.ui.cardio.date = '2031-05-05';
  assert.ok(app.viewCardio().includes('id="cardio-sched-date" value="2031-05-05"'));
});

test('viewCardio: "Dodaj do kalendarza" jest wyłączony przy pustej nazwie, włączony przy poprawnym planie i nazwie', () => {
  const addButton = html => html.match(/<button[^>]*id="cardio-sched-add"[^>]*>/)[0];
  setup();
  assert.ok(!/\sdisabled/.test(addButton(app.viewCardio())), 'plan ok i nazwa ustawiona – włączony');
  for (const name of ['', '  ']) {
    app.ui.cardio.name = name;
    assert.ok(/\sdisabled/.test(addButton(app.viewCardio())), `nazwa ${JSON.stringify(name)} – wyłączony`);
  }
  app.ui.cardio.name = 'Tabata';
  app.ui.cardio.min = 9; app.ui.cardio.sec = 1; // 541 s nie mieści się w pełnych cyklach
  assert.ok(/\sdisabled/.test(addButton(app.viewCardio())), 'plan niepoprawny – wyłączony');
  app.ui.cardio.sec = 0;
  assert.ok(!/\sdisabled/.test(addButton(app.viewCardio())), 'poprawny plan, nazwa i data – włączony');
  app.ui.cardio.date = '';
  assert.ok(/\sdisabled/.test(addButton(app.viewCardio())), 'pusta data – wyłączony');
});

test('dayItems: zaplanowany wpis z szablonem i luźny trening cardio tego samego dnia nie mieszają się', () => {
  setup({
    cardioTemplates: [TEMPLATE],
    schedule: [{ id: 's1', date: SELECTED, planId: null, cardioTemplateId: 'tpl1' }],
    cardioLog: [{ id: 'c9', date: SELECTED, name: 'Cardio swobodne', scheduleId: null, templateId: null }],
  });
  const items = app.dayItems(SELECTED);
  assert.equal(items.length, 2);
  const planned = items.find(i => i.kind === 'sched');
  const loose = items.find(i => i.kind === 'log');
  assert.equal(planned.done, false, 'wpis nie jest wykonany cudzym treningiem');
  assert.equal(planned.name, 'Szablon A');
  assert.equal(planned.cardio, true);
  assert.equal(loose.cardio, true);
  assert.equal(loose.name, 'Cardio swobodne');
  assert.equal(loose.done, true);
  const html = app.viewCalendar();
  assert.ok(html.includes('data-action="cardio-start"'), 'zaplanowany wpis zachowuje przycisk Start');
  assert.equal(html.split('✓ wykonany').length - 1, 1, 'tylko luźny trening jest wykonany');
});

test('dayItems: wpis bez planu i bez szablonu, ale z treningiem siłowym, to wykonany wpis siłowy z nazwą z dziennika', () => {
  setup({
    schedule: [{ id: 's3', date: SELECTED, planId: null, cardioTemplateId: null }],
    log: [{ id: 'w1', scheduleId: 's3', planId: null, planName: 'Stary plan', date: SELECTED }],
  });
  const [i, ...rest] = app.dayItems(SELECTED);
  assert.equal(rest.length, 0);
  assert.ok(!i.cardio, 'to nie jest cardio');
  assert.equal(i.kind, 'sched');
  assert.equal(i.done, true);
  assert.equal(i.name, 'Stary plan');
  assert.ok(!app.viewCalendar().includes('tag cardio'));
});

test('dayItems: wpis bez planu, szablonu i treningu to niewykonany wpis siłowy "(usunięty plan)"', () => {
  setup({ schedule: [{ id: 's4', date: SELECTED, planId: null, cardioTemplateId: null }] });
  const [i, ...rest] = app.dayItems(SELECTED);
  assert.equal(rest.length, 0);
  assert.ok(!i.cardio);
  assert.equal(i.done, false);
  assert.equal(i.name, '(usunięty plan)');
  assert.ok(!app.viewCalendar().includes('tag cardio'));
});

test('dayItems: trening cardio ze scheduleId wskazującym brakujący wpis jest luźnym elementem cardio', () => {
  setup({ schedule: [], cardioLog: [{ id: 'c1', date: SELECTED, name: 'Po usunięciu wpisu', scheduleId: 's1', templateId: null }] });
  const [i, ...rest] = app.dayItems(SELECTED);
  assert.equal(rest.length, 0);
  assert.equal(i.kind, 'log');
  assert.equal(i.cardio, true);
  assert.equal(i.done, true);
  assert.equal(i.name, 'Po usunięciu wpisu');
});

test('syncCardioBuilder: "Dodaj do kalendarza" na żywo śledzi nazwę, datę i poprawność planu', () => {
  setup();
  app.els.clear();
  const add = () => app.els.get('#cardio-sched-add');
  app.syncCardioBuilder();
  assert.equal(add().disabled, false, 'plan, nazwa i data ok – włączony');
  app.ui.cardio.name = '  ';
  app.syncCardioBuilder();
  assert.equal(add().disabled, true, 'opróżniona nazwa – wyłączony');
  app.ui.cardio.name = 'Tabata';
  app.syncCardioBuilder();
  assert.equal(add().disabled, false);
  app.ui.cardio.date = '';
  app.syncCardioBuilder();
  assert.equal(add().disabled, true, 'opróżniona data – wyłączony');
  app.ui.cardio.date = null;
  app.ui.cardio.sec = 1;
  app.syncCardioBuilder();
  assert.equal(add().disabled, true, 'plan niepoprawny – wyłączony');
});
