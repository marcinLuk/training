'use strict';

const { DatabaseSync } = require('node:sqlite');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const CardioCore = require('./public/cardio-core');

// Kolejne wersje schematu; numer wersji bazy trzymamy w PRAGMA user_version
const MIGRATIONS = [
  // v1: plany, kalendarz, dziennik
  `
  CREATE TABLE IF NOT EXISTS plans (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS exercises (
    id       TEXT PRIMARY KEY,
    plan_id  TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    name     TEXT NOT NULL,
    sets     INTEGER NOT NULL,
    reps     INTEGER NOT NULL,
    weight   REAL,
    rest     INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS exercises_plan ON exercises(plan_id, position);

  CREATE TABLE IF NOT EXISTS schedule (
    id      TEXT PRIMARY KEY,
    date    TEXT NOT NULL,      -- YYYY-MM-DD
    plan_id TEXT REFERENCES plans(id) ON DELETE SET NULL
  );
  CREATE INDEX IF NOT EXISTS schedule_date ON schedule(date);

  CREATE TABLE IF NOT EXISTS workouts (
    id          TEXT PRIMARY KEY,
    plan_id     TEXT REFERENCES plans(id) ON DELETE SET NULL,
    plan_name   TEXT NOT NULL,
    schedule_id TEXT REFERENCES schedule(id) ON DELETE SET NULL,
    date        TEXT NOT NULL,
    started_at  INTEGER NOT NULL,
    finished_at INTEGER NOT NULL,
    note        TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX IF NOT EXISTS workouts_date ON workouts(date);

  CREATE TABLE IF NOT EXISTS workout_exercises (
    id          TEXT PRIMARY KEY,
    workout_id  TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    position    INTEGER NOT NULL,
    name        TEXT NOT NULL,
    target_reps INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS workout_exercises_workout ON workout_exercises(workout_id, position);

  CREATE TABLE IF NOT EXISTS workout_sets (
    exercise_id TEXT NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
    set_no      INTEGER NOT NULL,
    reps        INTEGER NOT NULL,
    weight      REAL,
    PRIMARY KEY (exercise_id, set_no)
  );
  `,

  // v2: baza ćwiczeń – plan odwołuje się do ćwiczenia i ustala serie/powtórzenia/obciążenie
  `
  ALTER TABLE exercises RENAME TO plan_exercises_v1;

  CREATE TABLE exercises (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE plan_exercises (
    id          TEXT PRIMARY KEY,
    plan_id     TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
    position    INTEGER NOT NULL,
    sets        INTEGER NOT NULL,
    reps        INTEGER NOT NULL,
    weight      REAL,               -- NULL = masa własnego ciała
    rest        INTEGER NOT NULL    -- przerwa między seriami w sekundach
  );
  CREATE INDEX plan_exercises_plan ON plan_exercises(plan_id, position);
  CREATE INDEX plan_exercises_exercise ON plan_exercises(exercise_id);

  INSERT INTO exercises (id, name, created_at)
    SELECT lower(hex(randomblob(16))), name, CAST(strftime('%s', 'now') AS INTEGER) * 1000
    FROM plan_exercises_v1 GROUP BY name COLLATE NOCASE;

  INSERT INTO plan_exercises (id, plan_id, exercise_id, position, sets, reps, weight, rest)
    SELECT o.id, o.plan_id, e.id, o.position, o.sets, o.reps, o.weight, o.rest
    FROM plan_exercises_v1 o JOIN exercises e ON e.name = o.name COLLATE NOCASE;

  DROP TABLE plan_exercises_v1;
  `,

  // v3: cardio – szablony interwałów, wpisy w kalendarzu i dziennik treningów cardio
  `
  CREATE TABLE cardio_templates (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    total_sec  INTEGER NOT NULL,
    intervals  TEXT NOT NULL,        -- JSON: tablica czasów interwałów w sekundach
    created_at INTEGER NOT NULL
  );

  ALTER TABLE schedule ADD COLUMN cardio_template_id TEXT REFERENCES cardio_templates(id) ON DELETE SET NULL;
  CREATE INDEX schedule_cardio_template ON schedule(cardio_template_id);

  -- Kopia migawkowa jak workouts: nazwa i interwały zostają w dzienniku po usunięciu szablonu
  CREATE TABLE cardio_workouts (
    id          TEXT PRIMARY KEY,
    template_id TEXT REFERENCES cardio_templates(id) ON DELETE SET NULL,
    schedule_id TEXT REFERENCES schedule(id) ON DELETE SET NULL,
    name        TEXT NOT NULL,
    mode        TEXT NOT NULL CHECK (mode IN ('free', 'interval')),
    intervals   TEXT,                -- JSON; NULL w trybie swobodnym
    total_sec   INTEGER,             -- NULL w trybie swobodnym
    date        TEXT NOT NULL,       -- YYYY-MM-DD
    started_at  INTEGER NOT NULL,
    finished_at INTEGER NOT NULL,
    active_sec  INTEGER NOT NULL,
    note        TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX cardio_workouts_date ON cardio_workouts(date);
  `,
];

class ValidationError extends Error {}
class ConflictError extends ValidationError {}

// ---------- Walidacja danych wejściowych ----------
const text = (v, field, max = 120) => {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) throw new ValidationError(`Pole „${field}” jest wymagane`);
  return s.slice(0, max);
};
const int = (v, min, max) => Math.min(max, Math.max(min, Math.round(Number(v) || 0)));
const weight = v => (v != null && v !== '' && Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);
const date = v => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new ValidationError('Nieprawidłowa data');
  return v;
};
const id = v => (typeof v === 'string' && /^[\w-]{1,64}$/.test(v) ? v : randomUUID());
const timestamp = v => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) throw new ValidationError('Nieprawidłowy czas');
  return Math.round(n);
};
// Porównanie nazw bez wielkości liter, także dla polskich znaków (NOCASE w SQLite obsługuje tylko ASCII)
const nameKey = s => s.toLocaleLowerCase('pl');

function createRepo(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const tx = fn => {
    db.exec('BEGIN');
    try {
      const result = fn();
      db.exec('COMMIT');
      return result;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  };
  const exists = (table, rowId) => rowId != null && !!db.prepare(`SELECT 1 FROM ${table} WHERE id = ?`).get(rowId);

  // ---------- Migracje ----------
  const startVersion = db.prepare('PRAGMA user_version').get().user_version;
  MIGRATIONS.slice(startVersion).forEach((sql, i) => tx(() => {
    db.exec(sql);
    db.exec(`PRAGMA user_version = ${startVersion + i + 1}`);
  }));

  // ---------- Baza ćwiczeń ----------
  const getExercises = () => db.prepare('SELECT id, name FROM exercises').all()
    .map(e => ({ id: e.id, name: e.name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pl'));

  function findExerciseByName(name, exceptId) {
    const key = nameKey(name);
    return getExercises().find(e => e.id !== exceptId && nameKey(e.name) === key) ?? null;
  }

  function insertExercise(name, exId) {
    const exercise = { id: id(exId), name };
    db.prepare('INSERT INTO exercises (id, name, created_at) VALUES (?, ?, ?)').run(exercise.id, exercise.name, Date.now());
    return exercise;
  }

  // Pozycja planu wskazuje ćwiczenie przez exerciseId; sama nazwa (np. stara kopia zapasowa) – szukamy lub dodajemy do bazy
  function exerciseIdFor(item) {
    if (exists('exercises', item?.exerciseId)) return item.exerciseId;
    const name = text(item?.name, 'nazwa ćwiczenia');
    return (findExerciseByName(name) ?? insertExercise(name)).id;
  }

  function createExercise(body) {
    const name = text(body?.name, 'nazwa ćwiczenia');
    if (findExerciseByName(name)) throw new ConflictError(`Ćwiczenie „${name}” już jest w bazie`);
    return tx(() => insertExercise(name));
  }

  function renameExercise(exId, body) {
    if (!exists('exercises', exId)) return null;
    const name = text(body?.name, 'nazwa ćwiczenia');
    if (findExerciseByName(name, exId)) throw new ConflictError(`Ćwiczenie „${name}” już jest w bazie`);
    db.prepare('UPDATE exercises SET name = ? WHERE id = ?').run(name, exId);
    return { id: exId, name };
  }

  function deleteExercise(exId) {
    const plans = db.prepare(`SELECT DISTINCT p.name FROM plan_exercises pe JOIN plans p ON p.id = pe.plan_id
                              WHERE pe.exercise_id = ? ORDER BY p.name`).all(exId).map(p => p.name);
    if (plans.length) throw new ConflictError(`Ćwiczenie jest używane w planach: ${plans.join(', ')}`);
    return db.prepare('DELETE FROM exercises WHERE id = ?').run(exId).changes > 0;
  }

  // Interwały i czas całkowity (szablon, trening interwałowy) przechodzą przez checkPlan; błąd to 400, nigdy przycinanie
  function checkedPlan(intervals, totalSec) {
    const result = CardioCore.checkPlan(intervals, totalSec);
    if (!result.ok) throw new ValidationError(result.message);
    return { intervals: [...intervals], totalSec };
  }

  // ---------- Odczyt ----------
  function getPlans() {
    const plans = db.prepare('SELECT id, name FROM plans ORDER BY created_at, rowid').all()
      .map(p => ({ id: p.id, name: p.name, exercises: [] }));
    const byId = new Map(plans.map(p => [p.id, p]));
    const items = db.prepare(`SELECT pe.*, e.name FROM plan_exercises pe JOIN exercises e ON e.id = pe.exercise_id
                              ORDER BY pe.position`).all();
    for (const e of items) {
      byId.get(e.plan_id)?.exercises.push({
        id: e.id, exerciseId: e.exercise_id, name: e.name, sets: e.sets, reps: e.reps, weight: e.weight, rest: e.rest,
      });
    }
    return plans;
  }

  function getLog(workoutId) {
    const where = workoutId ? 'WHERE id = ?' : '';
    const workouts = db.prepare(`SELECT * FROM workouts ${where} ORDER BY started_at`).all(...(workoutId ? [workoutId] : []))
      .map(w => ({
        id: w.id, planId: w.plan_id, planName: w.plan_name, scheduleId: w.schedule_id, date: w.date,
        startedAt: w.started_at, finishedAt: w.finished_at, note: w.note, exercises: [],
      }));
    const byId = new Map(workouts.map(w => [w.id, w]));
    const exercises = new Map();
    for (const e of db.prepare('SELECT * FROM workout_exercises ORDER BY position').all()) {
      const w = byId.get(e.workout_id);
      if (!w) continue;
      const ex = { name: e.name, targetReps: e.target_reps, sets: [] };
      w.exercises.push(ex);
      exercises.set(e.id, ex);
    }
    for (const s of db.prepare('SELECT * FROM workout_sets ORDER BY set_no').all()) {
      exercises.get(s.exercise_id)?.sets.push({ reps: s.reps, weight: s.weight });
    }
    return workouts;
  }

  const getCardioTemplates = () => db.prepare('SELECT * FROM cardio_templates ORDER BY created_at, rowid').all()
    .map(t => ({ id: t.id, name: t.name, intervals: JSON.parse(t.intervals), totalSec: t.total_sec }));

  function getCardioLog(workoutId) {
    const where = workoutId ? 'WHERE id = ?' : '';
    return db.prepare(`SELECT * FROM cardio_workouts ${where} ORDER BY started_at, rowid`).all(...(workoutId ? [workoutId] : []))
      .map(w => ({
        id: w.id, templateId: w.template_id, scheduleId: w.schedule_id, name: w.name, mode: w.mode,
        intervals: w.intervals == null ? null : JSON.parse(w.intervals), totalSec: w.total_sec,
        date: w.date, startedAt: w.started_at, finishedAt: w.finished_at, activeSec: w.active_sec, note: w.note,
      }));
  }

  function getState() {
    return {
      exercises: getExercises(),
      plans: getPlans(),
      schedule: db.prepare('SELECT id, date, plan_id AS planId, cardio_template_id AS cardioTemplateId FROM schedule ORDER BY date').all()
        .map(s => ({ id: s.id, date: s.date, planId: s.planId, cardioTemplateId: s.cardioTemplateId })),
      log: getLog(),
      cardioTemplates: getCardioTemplates(),
      cardioLog: getCardioLog(),
    };
  }

  // ---------- Plany ----------
  function insertPlan(p, createdAt = Date.now()) {
    const plan = { id: id(p.id), name: text(p.name, 'nazwa planu') };
    db.prepare('INSERT INTO plans (id, name, created_at) VALUES (?, ?, ?)').run(plan.id, plan.name, createdAt);
    writePlanItems(plan.id, p.exercises);
    return plan.id;
  }

  function writePlanItems(planId, list) {
    db.prepare('DELETE FROM plan_exercises WHERE plan_id = ?').run(planId);
    const insert = db.prepare(
      'INSERT INTO plan_exercises (id, plan_id, exercise_id, position, sets, reps, weight, rest) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    (Array.isArray(list) ? list : []).forEach((e, i) => insert.run(
      id(e.id), planId, exerciseIdFor(e), i,
      int(e.sets, 1, 50), int(e.reps, 1, 500), weight(e.weight), int(e.rest, 0, 900)));
  }

  const planById = planId => getPlans().find(p => p.id === planId) ?? null;

  function createPlan(body) {
    return planById(tx(() => insertPlan({ name: body?.name || 'Nowy plan', exercises: body?.exercises })));
  }

  function updatePlan(planId, body) {
    if (!exists('plans', planId)) return null;
    tx(() => {
      db.prepare('UPDATE plans SET name = ? WHERE id = ?').run(text(body?.name, 'nazwa planu'), planId);
      writePlanItems(planId, body?.exercises);
    });
    return planById(planId);
  }

  // Usuwa plan razem z jego niewykonanymi terminami; wykonane zostają w kalendarzu i dzienniku
  function deletePlan(planId) {
    return tx(() => {
      db.prepare(`DELETE FROM schedule WHERE plan_id = ?
                  AND id NOT IN (SELECT schedule_id FROM workouts WHERE schedule_id IS NOT NULL)`).run(planId);
      return db.prepare('DELETE FROM plans WHERE id = ?').run(planId).changes > 0;
    });
  }

  // ---------- Szablony cardio ----------
  function insertCardioTemplate(t, createdAt = Date.now()) {
    const template = { id: id(t?.id), name: text(t?.name, 'nazwa szablonu'), ...checkedPlan(t?.intervals, t?.totalSec) };
    db.prepare('INSERT INTO cardio_templates (id, name, total_sec, intervals, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(template.id, template.name, template.totalSec, JSON.stringify(template.intervals), createdAt);
    return template;
  }

  const createCardioTemplate = body => tx(() => insertCardioTemplate(body));

  // Usuwa szablon razem z jego niewykonanymi terminami; terminy ukończone treningiem cardio zostają w kalendarzu
  function deleteCardioTemplate(templateId) {
    return tx(() => {
      db.prepare(`DELETE FROM schedule WHERE cardio_template_id = ?
                  AND id NOT IN (SELECT schedule_id FROM cardio_workouts WHERE schedule_id IS NOT NULL)`).run(templateId);
      return db.prepare('DELETE FROM cardio_templates WHERE id = ?').run(templateId).changes > 0;
    });
  }

  // ---------- Kalendarz ----------
  // Termin dotyczy dokładnie jednego: planu siłowego albo szablonu cardio
  function addSchedule(body) {
    const hasPlan = body?.planId != null;
    const hasTemplate = body?.cardioTemplateId != null;
    if (hasPlan === hasTemplate) throw new ValidationError('Podaj dokładnie jedno: plan albo szablon cardio');
    if (hasPlan && !exists('plans', body.planId)) throw new ValidationError('Wybrany plan nie istnieje');
    if (hasTemplate && !exists('cardio_templates', body.cardioTemplateId)) throw new ValidationError('Wybrany szablon cardio nie istnieje');
    const planId = hasPlan ? body.planId : null;
    const cardioTemplateId = hasTemplate ? body.cardioTemplateId : null;
    const dates = (Array.isArray(body.dates) ? body.dates : [body.date]).slice(0, 366).map(date);
    const insert = db.prepare('INSERT INTO schedule (id, date, plan_id, cardio_template_id) VALUES (?, ?, ?, ?)');
    return tx(() => dates.map(d => {
      const entry = { id: randomUUID(), date: d, planId, cardioTemplateId };
      insert.run(entry.id, entry.date, entry.planId, entry.cardioTemplateId);
      return entry;
    }));
  }

  const deleteSchedule = schedId => db.prepare('DELETE FROM schedule WHERE id = ?').run(schedId).changes > 0;

  // Trening siłowy może zamknąć tylko termin siłowy, a cardio tylko termin cardio – niezgodne powiązanie jest zerowane.
  // Termin bez planu i bez szablonu (po usunięciu planu lub szablonu) należy do rodzaju treningu, który go wykonał,
  // więc pozostaje dostępny tylko dla tego rodzaju (np. przy imporcie kopii zapasowej).
  const existsScheduleEntry = (scheduleId, cardio) => scheduleId != null && !!db.prepare(cardio
    ? `SELECT 1 FROM schedule WHERE id = ? AND (cardio_template_id IS NOT NULL
         OR (plan_id IS NULL AND id NOT IN (SELECT schedule_id FROM workouts WHERE schedule_id IS NOT NULL)))`
    : `SELECT 1 FROM schedule WHERE id = ? AND cardio_template_id IS NULL
         AND id NOT IN (SELECT schedule_id FROM cardio_workouts WHERE schedule_id IS NOT NULL)`).get(scheduleId);

  // ---------- Dziennik ----------
  function insertWorkout(w) {
    const workoutId = id(w.id);
    db.prepare(`INSERT INTO workouts (id, plan_id, plan_name, schedule_id, date, started_at, finished_at, note)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      workoutId,
      exists('plans', w.planId) ? w.planId : null,
      text(w.planName, 'nazwa planu'),
      existsScheduleEntry(w.scheduleId, false) ? w.scheduleId : null,
      date(w.date),
      timestamp(w.startedAt),
      timestamp(w.finishedAt),
      typeof w.note === 'string' ? w.note.trim().slice(0, 2000) : '');
    const insertEx = db.prepare(
      'INSERT INTO workout_exercises (id, workout_id, position, name, target_reps) VALUES (?, ?, ?, ?, ?)');
    const insertSet = db.prepare('INSERT INTO workout_sets (exercise_id, set_no, reps, weight) VALUES (?, ?, ?, ?)');
    (Array.isArray(w.exercises) ? w.exercises : []).forEach((e, i) => {
      const exId = randomUUID();
      insertEx.run(exId, workoutId, i, text(e.name, 'nazwa ćwiczenia'), int(e.targetReps, 0, 500));
      (Array.isArray(e.sets) ? e.sets : []).forEach((s, n) => insertSet.run(exId, n + 1, int(s.reps, 0, 1000), weight(s.weight)));
    });
    return workoutId;
  }

  const addWorkout = body => getLog(tx(() => insertWorkout(body ?? {})))[0];
  const deleteWorkout = workoutId => db.prepare('DELETE FROM workouts WHERE id = ?').run(workoutId).changes > 0;

  // ---------- Dziennik cardio ----------
  function insertCardioWorkout(w) {
    const mode = w.mode;
    if (mode !== 'free' && mode !== 'interval') throw new ValidationError('Nieprawidłowy tryb treningu cardio');
    const plan = mode === 'interval' ? checkedPlan(w.intervals, w.totalSec) : { intervals: null, totalSec: null };
    const workoutId = id(w.id);
    db.prepare(`INSERT INTO cardio_workouts
                  (id, template_id, schedule_id, name, mode, intervals, total_sec, date, started_at, finished_at, active_sec, note)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      workoutId,
      exists('cardio_templates', w.templateId) ? w.templateId : null,
      existsScheduleEntry(w.scheduleId, true) ? w.scheduleId : null,
      text(w.name, 'nazwa treningu'),
      mode,
      plan.intervals && JSON.stringify(plan.intervals),
      plan.totalSec,
      date(w.date),
      timestamp(w.startedAt),
      timestamp(w.finishedAt),
      int(w.activeSec, 0, 86400),
      typeof w.note === 'string' ? w.note.trim().slice(0, 2000) : '');
    return workoutId;
  }

  const addCardioWorkout = body => getCardioLog(tx(() => insertCardioWorkout(body ?? {})))[0];
  const deleteCardioWorkout = workoutId => db.prepare('DELETE FROM cardio_workouts WHERE id = ?').run(workoutId).changes > 0;

  // ---------- Kopia zapasowa ----------
  // Przyjmuje też starsze kopie bez bazy ćwiczeń – ćwiczenia powstaną wtedy z nazw w planach,
  // oraz kopie bez danych cardio (cardioTemplates / cardioLog są opcjonalne)
  function replaceAll(data) {
    if (!Array.isArray(data?.plans) || !Array.isArray(data.schedule) || !Array.isArray(data.log)) {
      throw new ValidationError('Nieprawidłowy plik kopii zapasowej');
    }
    tx(() => {
      db.exec(`DELETE FROM cardio_workouts; DELETE FROM workouts; DELETE FROM schedule;
               DELETE FROM cardio_templates; DELETE FROM plans; DELETE FROM exercises;`);
      for (const e of Array.isArray(data.exercises) ? data.exercises : []) {
        const name = text(e?.name, 'nazwa ćwiczenia');
        if (!findExerciseByName(name)) insertExercise(name, e.id);
      }
      const now = Date.now();
      data.plans.forEach((p, i) => insertPlan(p, now + i));
      (Array.isArray(data.cardioTemplates) ? data.cardioTemplates : []).forEach((t, i) => insertCardioTemplate(t, now + i));
      const insert = db.prepare('INSERT INTO schedule (id, date, plan_id, cardio_template_id) VALUES (?, ?, ?, ?)');
      for (const s of data.schedule) {
        const planId = exists('plans', s.planId) ? s.planId : null;
        const cardioTemplateId = !planId && exists('cardio_templates', s.cardioTemplateId) ? s.cardioTemplateId : null;
        insert.run(id(s.id), date(s.date), planId, cardioTemplateId);
      }
      for (const w of data.log) insertWorkout(w);
      for (const w of Array.isArray(data.cardioLog) ? data.cardioLog : []) insertCardioWorkout(w);
    });
  }

  // Przykładowe dane przy pierwszym uruchomieniu (pusta baza)
  if (startVersion === 0) {
    tx(() => {
      for (const name of ['Wyciskanie leżąc', 'Martwy ciąg', 'Dipy']) insertExercise(name);
      insertPlan({
        name: 'Full body (przykład)',
        exercises: [
          { name: 'Przysiad ze sztangą', sets: 4, reps: 8, weight: 60, rest: 120 },
          { name: 'Pompki', sets: 3, reps: 15, weight: null, rest: 60 },
          { name: 'Wiosłowanie hantlą', sets: 3, reps: 10, weight: 20, rest: 90 },
          { name: 'Podciąganie', sets: 3, reps: 6, weight: null, rest: 90 },
        ],
      });
    });
  }

  return {
    getState,
    createExercise, renameExercise, deleteExercise,
    createPlan, updatePlan, deletePlan,
    createCardioTemplate, deleteCardioTemplate, addCardioWorkout, deleteCardioWorkout,
    addSchedule, deleteSchedule, addWorkout, deleteWorkout, replaceAll,
    close: () => db.close(),
  };
}

module.exports = { createRepo, MIGRATIONS, ValidationError, ConflictError };
