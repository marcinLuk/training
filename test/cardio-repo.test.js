'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createRepo, ValidationError } = require('../db');

const PLAN = { intervals: [30, 60], totalSec: 540 };
const workout = (extra = {}) => ({
  name: 'Cardio swobodne', mode: 'free', date: '2026-03-02',
  startedAt: 1_700_000_000_000, finishedAt: 1_700_000_600_000, activeSec: 590, ...extra,
});
const strengthPlan = repo => repo.createPlan({ name: 'Push', exercises: [{ name: 'Pompki', sets: 3, reps: 10, rest: 60 }] });

test('szablon cardio: utworzenie, lista w getState i usunięcie', () => {
  const repo = createRepo(':memory:');
  const t = repo.createCardioTemplate({ name: 'Tabata', ...PLAN });
  assert.deepEqual(t, { id: t.id, name: 'Tabata', intervals: [30, 60], totalSec: 540 });
  assert.deepEqual(repo.getState().cardioTemplates, [t]);
  assert.equal(repo.deleteCardioTemplate(t.id), true);
  assert.deepEqual(repo.getState().cardioTemplates, []);
  assert.equal(repo.deleteCardioTemplate(t.id), false);
});

test('szablon cardio: nieprawidłowy plan jest odrzucany komunikatem checkPlan i nic nie zapisuje', () => {
  const repo = createRepo(':memory:');
  const bad = [
    [{ name: 'A', intervals: [30, 60], totalSec: 600 }, /nie mieści się w pełnych cyklach/],
    [{ name: 'A', intervals: [], totalSec: 60 }, /Dodaj co najmniej jeden interwał/],
    [{ name: 'A', intervals: [4], totalSec: 60 }, /interwał/],
    [{ name: 'A', intervals: [30], totalSec: 21630 }, /najwyżej/],
    [{ name: 'A', intervals: [30], totalSec: '60' }, /./],
  ];
  for (const [body, message] of bad) {
    assert.throws(() => repo.createCardioTemplate(body), err => err instanceof ValidationError && message.test(err.message));
  }
  assert.throws(() => repo.createCardioTemplate({ name: '  ', ...PLAN }), ValidationError);
  assert.deepEqual(repo.getState().cardioTemplates, []);
});

test('szablon cardio: komunikat błędu to dokładnie komunikat checkPlan (nie przycinamy interwałów)', () => {
  const repo = createRepo(':memory:');
  const { checkPlan } = require('../public/cardio-core');
  const expected = checkPlan([30, 60], 600).message;
  assert.throws(() => repo.createCardioTemplate({ name: 'A', intervals: [30, 60], totalSec: 600 }), { message: expected });
});

test('nazwy z <, ", & i polskimi literami są zapisywane dosłownie', () => {
  const repo = createRepo(':memory:');
  const name = '<b>Tabata & "test"</b> Żółć';
  const t = repo.createCardioTemplate({ name, ...PLAN });
  const w = repo.addCardioWorkout(workout({ name, note: 'Zażółć <i>gęślą</i> & jaźń' }));
  assert.equal(repo.getState().cardioTemplates[0].name, name);
  assert.equal(t.name, name);
  assert.equal(w.name, name);
  assert.equal(repo.getState().cardioLog[0].note, 'Zażółć <i>gęślą</i> & jaźń');
});

test('trening swobodny: zapis z intervals i totalSec ustawionymi na null', () => {
  const repo = createRepo(':memory:');
  const w = repo.addCardioWorkout(workout({ intervals: [30, 60], totalSec: 540, note: '  dobrze  ' }));
  assert.deepEqual(w, {
    id: w.id, templateId: null, scheduleId: null, name: 'Cardio swobodne', mode: 'free', intervals: null, totalSec: null,
    date: '2026-03-02', startedAt: 1_700_000_000_000, finishedAt: 1_700_000_600_000, activeSec: 590, note: 'dobrze',
  });
  assert.deepEqual(repo.getState().cardioLog, [w]);
});

test('trening interwałowy: zapis intervals i totalSec; niepasujący plan odrzucony bez zapisu', () => {
  const repo = createRepo(':memory:');
  const w = repo.addCardioWorkout(workout({ name: 'Interwały 30 s + 60 s', mode: 'interval', ...PLAN }));
  assert.equal(w.mode, 'interval');
  assert.deepEqual(w.intervals, [30, 60]);
  assert.equal(w.totalSec, 540);
  assert.throws(() => repo.addCardioWorkout(workout({ mode: 'interval', intervals: [30, 60], totalSec: 600 })),
    err => err instanceof ValidationError && /nie mieści się/.test(err.message));
  assert.throws(() => repo.addCardioWorkout(workout({ mode: 'interval' })), ValidationError);
  assert.equal(repo.getState().cardioLog.length, 1);
});

test('trening cardio: pola przechodzą przez sanitizery', () => {
  const repo = createRepo(':memory:');
  assert.throws(() => repo.addCardioWorkout(workout({ mode: 'bieg' })), ValidationError);
  assert.throws(() => repo.addCardioWorkout(workout({ mode: undefined })), ValidationError);
  assert.throws(() => repo.addCardioWorkout(workout({ name: '' })), ValidationError);
  assert.throws(() => repo.addCardioWorkout(workout({ date: '2.03.2026' })), ValidationError);
  assert.throws(() => repo.addCardioWorkout(workout({ startedAt: 0 })), ValidationError);
  assert.throws(() => repo.addCardioWorkout(workout({ finishedAt: 'x' })), ValidationError);
  assert.equal(repo.getState().cardioLog.length, 0);
  assert.equal(repo.addCardioWorkout(workout({ activeSec: 999999 })).activeSec, 86400);
  assert.equal(repo.addCardioWorkout(workout({ activeSec: -5 })).activeSec, 0);
  assert.equal(repo.addCardioWorkout(workout({ note: 'x'.repeat(3000) })).note.length, 2000);
  assert.equal(repo.addCardioWorkout(workout({ id: 'a b/../' })).id.length > 10, true);
  assert.equal(repo.addCardioWorkout(workout({ id: 'moje-id_1' })).id, 'moje-id_1');
});

test('usuwanie treningu cardio: 204 dla istniejącego, false dla nieznanego', () => {
  const repo = createRepo(':memory:');
  const w = repo.addCardioWorkout(workout());
  assert.equal(repo.deleteCardioWorkout(w.id), true);
  assert.equal(repo.deleteCardioWorkout(w.id), false);
  assert.deepEqual(repo.getState().cardioLog, []);
});

test('trening cardio zachowuje nazwę i plan po usunięciu szablonu (migawka)', () => {
  const repo = createRepo(':memory:');
  const t = repo.createCardioTemplate({ name: 'Tabata', ...PLAN });
  const w = repo.addCardioWorkout(workout({ name: 'Tabata', mode: 'interval', templateId: t.id, ...PLAN }));
  assert.equal(w.templateId, t.id);
  repo.deleteCardioTemplate(t.id);
  const kept = repo.getState().cardioLog[0];
  assert.equal(kept.templateId, null);
  assert.equal(kept.name, 'Tabata');
  assert.deepEqual(kept.intervals, [30, 60]);
  assert.equal(repo.addCardioWorkout(workout({ templateId: 'nieznany' })).templateId, null);
});

test('kalendarz: termin z szablonem cardio, wiele dat, getState ma cardioTemplateId', () => {
  const repo = createRepo(':memory:');
  const t = repo.createCardioTemplate({ name: 'Tabata', ...PLAN });
  const entries = repo.addSchedule({ cardioTemplateId: t.id, dates: ['2026-03-02', '2026-03-09'] });
  assert.equal(entries.length, 2);
  assert.ok(entries.every(e => e.planId === null && e.cardioTemplateId === t.id));
  const schedule = repo.getState().schedule;
  assert.deepEqual(schedule.map(s => [s.date, s.planId, s.cardioTemplateId]),
    [['2026-03-02', null, t.id], ['2026-03-09', null, t.id]]);
});

test('kalendarz: termin siłowy ma cardioTemplateId null i działa jak dotąd', () => {
  const repo = createRepo(':memory:');
  const plan = strengthPlan(repo);
  const [entry] = repo.addSchedule({ planId: plan.id, date: '2026-03-02' });
  assert.deepEqual(entry, { id: entry.id, date: '2026-03-02', planId: plan.id, cardioTemplateId: null });
  assert.deepEqual(repo.getState().schedule, [entry]);
  assert.throws(() => repo.addSchedule({ planId: 'brak', date: '2026-03-02' }), { message: 'Wybrany plan nie istnieje' });
  assert.throws(() => repo.addSchedule({ planId: plan.id, date: 'zła data' }), ValidationError);
});

test('kalendarz: oba identyfikatory, żaden lub nieznany → ValidationError i brak zapisu', () => {
  const repo = createRepo(':memory:');
  const plan = strengthPlan(repo);
  const t = repo.createCardioTemplate({ name: 'Tabata', ...PLAN });
  const date = '2026-03-02';
  assert.throws(() => repo.addSchedule({ planId: plan.id, cardioTemplateId: t.id, date }), ValidationError);
  assert.throws(() => repo.addSchedule({ date }), ValidationError);
  assert.throws(() => repo.addSchedule({ cardioTemplateId: 'brak', date }), ValidationError);
  assert.throws(() => repo.addSchedule({ cardioTemplateId: t.id, dates: ['2026-03-02', 'zła'] }), ValidationError);
  assert.deepEqual(repo.getState().schedule, []);
});

test('usunięcie szablonu: niewykonane terminy znikają, wykonane treningiem cardio zostają', () => {
  const repo = createRepo(':memory:');
  const t = repo.createCardioTemplate({ name: 'Tabata', ...PLAN });
  const [done, future] = repo.addSchedule({ cardioTemplateId: t.id, dates: ['2026-03-02', '2026-03-09'] });
  repo.addCardioWorkout(workout({ name: 'Tabata', mode: 'interval', templateId: t.id, scheduleId: done.id, ...PLAN }));
  assert.equal(repo.deleteCardioTemplate(t.id), true);
  const state = repo.getState();
  assert.deepEqual(state.schedule.map(s => s.id), [done.id]);
  assert.ok(!state.schedule.some(s => s.id === future.id));
  assert.equal(state.cardioLog[0].scheduleId, done.id);
  assert.equal(state.cardioLog[0].name, 'Tabata');
});

test('usunięcie szablonu nie rusza terminów innych szablonów ani planów siłowych', () => {
  const repo = createRepo(':memory:');
  const a = repo.createCardioTemplate({ name: 'A', ...PLAN });
  const b = repo.createCardioTemplate({ name: 'B', ...PLAN });
  const plan = strengthPlan(repo);
  repo.addSchedule({ cardioTemplateId: a.id, date: '2026-03-02' });
  const [keepB] = repo.addSchedule({ cardioTemplateId: b.id, date: '2026-03-02' });
  const [keepPlan] = repo.addSchedule({ planId: plan.id, date: '2026-03-02' });
  repo.deleteCardioTemplate(a.id);
  assert.deepEqual(repo.getState().schedule.map(s => s.id).sort(), [keepB.id, keepPlan.id].sort());
});

test('powiązanie z terminem: trening cardio zamyka tylko termin cardio, siłowy tylko siłowy', () => {
  const repo = createRepo(':memory:');
  const plan = strengthPlan(repo);
  const t = repo.createCardioTemplate({ name: 'Tabata', ...PLAN });
  const [strengthEntry] = repo.addSchedule({ planId: plan.id, date: '2026-03-02' });
  const [cardioEntry] = repo.addSchedule({ cardioTemplateId: t.id, date: '2026-03-02' });

  assert.equal(repo.addCardioWorkout(workout({ scheduleId: strengthEntry.id })).scheduleId, null);
  assert.equal(repo.addCardioWorkout(workout({ scheduleId: 'brak' })).scheduleId, null);
  assert.equal(repo.addCardioWorkout(workout({ scheduleId: cardioEntry.id })).scheduleId, cardioEntry.id);

  const strengthWorkout = body => repo.addWorkout({
    planName: 'Push', date: '2026-03-02', startedAt: 1_700_000_000_000, finishedAt: 1_700_000_100_000, exercises: [], ...body,
  });
  assert.equal(strengthWorkout({ scheduleId: cardioEntry.id }).scheduleId, null);
  assert.equal(strengthWorkout({ scheduleId: strengthEntry.id }).scheduleId, strengthEntry.id);
});

test('usunięcie planu siłowego nie usuwa terminów cardio', () => {
  const repo = createRepo(':memory:');
  const plan = strengthPlan(repo);
  const t = repo.createCardioTemplate({ name: 'Tabata', ...PLAN });
  const [cardioEntry] = repo.addSchedule({ cardioTemplateId: t.id, date: '2026-03-02' });
  repo.addSchedule({ planId: plan.id, date: '2026-03-03' });
  repo.deletePlan(plan.id);
  assert.deepEqual(repo.getState().schedule.map(s => s.id), [cardioEntry.id]);
});

test('usunięcie terminu zeruje scheduleId w dzienniku cardio', () => {
  const repo = createRepo(':memory:');
  const t = repo.createCardioTemplate({ name: 'Tabata', ...PLAN });
  const [entry] = repo.addSchedule({ cardioTemplateId: t.id, date: '2026-03-02' });
  repo.addCardioWorkout(workout({ scheduleId: entry.id }));
  assert.equal(repo.deleteSchedule(entry.id), true);
  assert.equal(repo.getState().cardioLog[0].scheduleId, null);
});

test('getState: dotychczasowe klucze zostają, dochodzą cardioTemplates i cardioLog', () => {
  const state = createRepo(':memory:').getState();
  assert.deepEqual(Object.keys(state).sort(), ['cardioLog', 'cardioTemplates', 'exercises', 'log', 'plans', 'schedule']);
  assert.deepEqual(state.cardioTemplates, []);
  assert.deepEqual(state.cardioLog, []);
  assert.ok(state.plans.length > 0);
});

function seeded() {
  const repo = createRepo(':memory:');
  const plan = strengthPlan(repo);
  const t = repo.createCardioTemplate({ name: '<Tabata> & "x"', ...PLAN });
  const [cardioEntry] = repo.addSchedule({ cardioTemplateId: t.id, date: '2026-03-02' });
  const [planEntry] = repo.addSchedule({ planId: plan.id, date: '2026-03-03' });
  repo.addCardioWorkout(workout({ name: 'Tabata', mode: 'interval', templateId: t.id, scheduleId: cardioEntry.id, ...PLAN }));
  repo.addCardioWorkout(workout({ startedAt: 1_700_001_000_000, finishedAt: 1_700_001_500_000, note: 'swobodne' }));
  repo.addWorkout({
    planId: plan.id, planName: 'Push', scheduleId: planEntry.id, date: '2026-03-03',
    startedAt: 1_700_002_000_000, finishedAt: 1_700_002_900_000,
    exercises: [{ name: 'Pompki', targetReps: 10, sets: [{ reps: 10, weight: null }] }],
  });
  return repo;
}

test('kopia zapasowa: eksport → replaceAll przywraca cardio i dane siłowe', () => {
  const source = seeded();
  const exported = JSON.parse(JSON.stringify(source.getState()));
  const target = createRepo(':memory:');
  target.addCardioWorkout(workout({ name: 'Stary wpis' }));
  target.createCardioTemplate({ name: 'Stary szablon', ...PLAN });
  target.replaceAll(exported);
  assert.deepEqual(target.getState(), exported);
  assert.equal(exported.cardioTemplates.length, 1);
  assert.equal(exported.cardioLog.length, 2);
  assert.ok(exported.schedule.some(s => s.cardioTemplateId === exported.cardioTemplates[0].id));
});

test('kopia zapasowa: import jest idempotentny', () => {
  const repo = seeded();
  const exported = JSON.parse(JSON.stringify(repo.getState()));
  repo.replaceAll(exported);
  repo.replaceAll(exported);
  assert.deepEqual(repo.getState(), exported);
});

test('kopia zapasowa: starsza kopia bez kluczy cardio importuje się i czyści dane cardio', () => {
  const repo = seeded();
  const old = JSON.parse(JSON.stringify(repo.getState()));
  delete old.cardioTemplates;
  delete old.cardioLog;
  old.schedule.forEach(s => delete s.cardioTemplateId);
  old.schedule = old.schedule.filter(s => s.planId);
  repo.replaceAll(old);
  const state = repo.getState();
  assert.deepEqual(state.cardioTemplates, []);
  assert.deepEqual(state.cardioLog, []);
  assert.equal(state.schedule.length, 1);
  assert.equal(state.log.length, 1);
});

test('kopia zapasowa: wymagane tablice bez zmian, a zły szablon cofa cały import', () => {
  const repo = seeded();
  const before = repo.getState();
  assert.throws(() => repo.replaceAll({ plans: [], schedule: [] }), ValidationError);
  assert.throws(() => repo.replaceAll({ cardioTemplates: [], cardioLog: [] }), ValidationError);
  const bad = JSON.parse(JSON.stringify(before));
  bad.cardioTemplates[0].totalSec = 600;
  assert.throws(() => repo.replaceAll(bad), err => err instanceof ValidationError && /nie mieści się/.test(err.message));
  assert.deepEqual(repo.getState(), before);
});

test('kopia zapasowa: termin cardio bez istniejącego szablonu nie dostaje cardioTemplateId', () => {
  const repo = createRepo(':memory:');
  repo.replaceAll({
    plans: [], log: [], cardioTemplates: [],
    schedule: [{ id: 's1', date: '2026-03-02', planId: null, cardioTemplateId: 'brak' }],
  });
  assert.deepEqual(repo.getState().schedule, [{ id: 's1', date: '2026-03-02', planId: null, cardioTemplateId: null }]);
});

test('kopia zapasowa: ukończony termin po usuniętym szablonie zostaje powiązany z treningiem cardio', () => {
  const repo = createRepo(':memory:');
  const t = repo.createCardioTemplate({ name: 'Tabata', ...PLAN });
  const [done] = repo.addSchedule({ cardioTemplateId: t.id, date: '2026-03-02' });
  repo.addCardioWorkout(workout({ scheduleId: done.id }));
  repo.deleteCardioTemplate(t.id);
  const exported = JSON.parse(JSON.stringify(repo.getState()));
  assert.equal(exported.cardioLog[0].scheduleId, done.id);
  repo.replaceAll(exported);
  assert.deepEqual(repo.getState(), exported);
});

test('osierocony termin ukończony treningiem siłowym nie przyjmie treningu cardio i odwrotnie', () => {
  const repo = createRepo(':memory:');
  const plan = strengthPlan(repo);
  const [sEntry] = repo.addSchedule({ planId: plan.id, date: '2026-03-02' });
  repo.addWorkout({ planId: plan.id, planName: 'Push', scheduleId: sEntry.id, date: '2026-03-02',
    startedAt: 1_700_000_000_000, finishedAt: 1_700_000_100_000, exercises: [] });
  repo.deletePlan(plan.id);
  assert.equal(repo.addCardioWorkout(workout({ scheduleId: sEntry.id })).scheduleId, null);

  const t = repo.createCardioTemplate({ name: 'Tabata', ...PLAN });
  const [cEntry] = repo.addSchedule({ cardioTemplateId: t.id, date: '2026-03-03' });
  repo.addCardioWorkout(workout({ scheduleId: cEntry.id }));
  repo.deleteCardioTemplate(t.id);
  const second = repo.addWorkout({ planName: 'Push', scheduleId: cEntry.id, date: '2026-03-03',
    startedAt: 1_700_000_000_000, finishedAt: 1_700_000_100_000, exercises: [] });
  assert.equal(second.scheduleId, null);
});
