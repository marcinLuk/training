'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { createRepo, MIGRATIONS } = require('../db');

const V2_TABLES = ['plans', 'exercises', 'plan_exercises', 'schedule', 'workouts', 'workout_exercises', 'workout_sets'];

// Baza dokładnie w wersji 2 schematu, z danymi w każdej tabeli siłowej
function buildV2Database(file) {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON;');
  for (const sql of MIGRATIONS.slice(0, 2)) db.exec(sql);
  db.exec('PRAGMA user_version = 2');
  db.exec(`
    INSERT INTO exercises (id, name, created_at) VALUES ('ex1', 'Żółw – przysiad', 1000), ('ex2', 'Pompki', 1001);
    INSERT INTO plans (id, name, created_at) VALUES ('p1', 'Plan <A> & "B"', 2000), ('p2', 'Plan pusty', 2001);
    INSERT INTO plan_exercises (id, plan_id, exercise_id, position, sets, reps, weight, rest)
      VALUES ('pe1', 'p1', 'ex1', 0, 4, 8, 60.5, 120), ('pe2', 'p1', 'ex2', 1, 3, 15, NULL, 60);
    INSERT INTO schedule (id, date, plan_id) VALUES ('s1', '2026-02-01', 'p1'), ('s2', '2026-02-08', 'p1'), ('s3', '2026-02-09', NULL);
    INSERT INTO workouts (id, plan_id, plan_name, schedule_id, date, started_at, finished_at, note)
      VALUES ('w1', 'p1', 'Plan <A> & "B"', 's1', '2026-02-01', 3000, 4000, 'notatka'), ('w2', NULL, 'Usunięty plan', NULL, '2026-02-02', 5000, 6000, '');
    INSERT INTO workout_exercises (id, workout_id, position, name, target_reps)
      VALUES ('we1', 'w1', 0, 'Żółw – przysiad', 8), ('we2', 'w1', 1, 'Pompki', 15);
    INSERT INTO workout_sets (exercise_id, set_no, reps, weight)
      VALUES ('we1', 1, 8, 60.5), ('we1', 2, 7, 60.5), ('we2', 1, 15, NULL);
  `);
  return db;
}

// Zrzut wszystkich wierszy tabeli (tylko kolumny z podanej listy), uporządkowany deterministycznie
function dump(db, table, columns) {
  const cols = columns.join(', ');
  return db.prepare(`SELECT ${cols} FROM ${table} ORDER BY ${cols}`).all().map(r => ({ ...r }));
}

test('migracja v3 dodaje wersję i nie zmienia żadnego istniejącego wiersza (D8)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trening-migration-'));
  const file = path.join(dir, 'v2.db');
  try {
    const raw = buildV2Database(file);
    assert.equal(raw.prepare('PRAGMA user_version').get().user_version, 2);
    assert.equal(MIGRATIONS.length, 3);

    const columns = Object.fromEntries(V2_TABLES.map(t =>
      [t, raw.prepare(`PRAGMA table_info(${t})`).all().map(c => c.name)]));
    const before = Object.fromEntries(V2_TABLES.map(t => [t, dump(raw, t, columns[t])]));
    for (const t of V2_TABLES) assert.ok(before[t].length > 0, `tabela ${t} ma dane przed migracją`);
    raw.close();

    createRepo(file).close();

    const after = new DatabaseSync(file);
    assert.equal(after.prepare('PRAGMA user_version').get().user_version, MIGRATIONS.length);
    for (const t of V2_TABLES) {
      assert.deepEqual(dump(after, t, columns[t]), before[t], `tabela ${t} bez zmian`);
    }
    assert.deepEqual(after.prepare('SELECT cardio_template_id FROM schedule').all().map(r => r.cardio_template_id),
      [null, null, null]);
    assert.equal(after.prepare('SELECT COUNT(*) AS n FROM cardio_templates').get().n, 0);
    assert.equal(after.prepare('SELECT COUNT(*) AS n FROM cardio_workouts').get().n, 0);
    after.close();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('baza w wersji 2 nie dostaje danych przykładowych, a repozytorium czyta dane siłowe po migracji', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trening-migration-'));
  const file = path.join(dir, 'v2.db');
  try {
    buildV2Database(file).close();
    const repo = createRepo(file);
    const state = repo.getState();
    assert.deepEqual(state.plans.map(p => p.name), ['Plan <A> & "B"', 'Plan pusty']);
    assert.deepEqual(state.exercises.map(e => e.name), ['Pompki', 'Żółw – przysiad']);
    assert.deepEqual(state.schedule.map(s => s.id).sort(), ['s1', 's2', 's3']);
    assert.deepEqual(state.log.map(w => w.id), ['w1', 'w2']);
    assert.deepEqual(state.log[0].exercises[0].sets, [{ reps: 8, weight: 60.5 }, { reps: 7, weight: 60.5 }]);
    assert.deepEqual(state.cardioTemplates, []);
    assert.deepEqual(state.cardioLog, []);
    repo.close();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('ponowne otwarcie bazy w najnowszej wersji niczego nie zmienia', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trening-migration-'));
  const file = path.join(dir, 'v2.db');
  try {
    buildV2Database(file).close();
    const first = createRepo(file);
    const snapshot = first.getState();
    first.close();
    const second = createRepo(file);
    assert.deepEqual(second.getState(), snapshot);
    second.close();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
