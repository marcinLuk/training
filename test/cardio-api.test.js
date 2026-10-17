'use strict';

// Test HTTP: uruchamia prawdziwy server.js na porcie 3997 z tymczasową bazą (nigdy ./data ani port 3000)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const PORT = 3997;
const BASE = `http://127.0.0.1:${PORT}`;
const PLAN = { intervals: [30, 60], totalSec: 540 };

let dir;
let child;
let exited = false;

const call = async (method, url, body) => {
  const res = await fetch(BASE + url, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = await res.text();
  return { status: res.status, body: raw ? JSON.parse(raw) : null };
};
const state = async () => (await call('GET', '/api/state')).body;

async function waitForServer() {
  for (let i = 0; i < 100; i++) {
    if (exited) throw new Error('server.js zakończył się przed startem (zajęty port 3997?)');
    try {
      if ((await fetch(`${BASE}/api/health`)).ok) return;
    } catch { /* serwer jeszcze nie nasłuchuje */ }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('server.js nie wystartował w 10 s');
}

test.before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trening-api-'));
  child = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', path.join(__dirname, '..', 'server.js')], {
    env: { ...process.env, PORT: String(PORT), DB_PATH: path.join(dir, 'api.db'), APP_PASSWORD: '' },
    stdio: 'ignore',
  });
  child.on('exit', () => { exited = true; });
  await waitForServer();
});

test.after(async () => {
  if (child && !exited) {
    const closed = new Promise(resolve => child.once('exit', resolve));
    child.kill('SIGKILL');
    await closed;
  }
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
});

test('szablon, który nie mieści się w pełnych cyklach → 400 z polskim komunikatem i nic nie zapisuje', async () => {
  const res = await call('POST', '/api/cardio-templates', { name: 'Za długi', intervals: [30, 60], totalSec: 600 });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /nie mieści się w pełnych cyklach/);
  assert.match(res.body.error, /9:00/);
  assert.match(res.body.error, /10:30/);
  assert.deepEqual((await state()).cardioTemplates, []);
});

test('szablon bez interwałów lub z interwałem poza limitem → 400', async () => {
  for (const body of [
    { name: 'A', intervals: [], totalSec: 60 },
    { name: 'A', intervals: [4], totalSec: 60 },
    { name: 'A', totalSec: 60 },
  ]) {
    assert.equal((await call('POST', '/api/cardio-templates', body)).status, 400);
  }
  assert.deepEqual((await state()).cardioTemplates, []);
});

test('poprawny szablon → 201, widoczny w stanie i usuwalny (204, potem 404)', async () => {
  const created = await call('POST', '/api/cardio-templates', { name: 'Tabata', ...PLAN });
  assert.equal(created.status, 201);
  assert.deepEqual(created.body, { id: created.body.id, name: 'Tabata', intervals: [30, 60], totalSec: 540 });
  assert.deepEqual((await state()).cardioTemplates, [created.body]);
  assert.equal((await call('DELETE', `/api/cardio-templates/${created.body.id}`)).status, 204);
  assert.equal((await call('DELETE', `/api/cardio-templates/${created.body.id}`)).status, 404);
  assert.deepEqual((await state()).cardioTemplates, []);
});

test('termin z oboma identyfikatorami lub bez żadnego → 400 i nic nie zapisuje', async () => {
  const template = (await call('POST', '/api/cardio-templates', { name: 'Tabata', ...PLAN })).body;
  const plan = (await call('POST', '/api/plans', { name: 'Push', exercises: [] })).body;
  const date = '2026-03-02';
  assert.equal((await call('POST', '/api/schedule', { planId: plan.id, cardioTemplateId: template.id, date })).status, 400);
  assert.equal((await call('POST', '/api/schedule', { date })).status, 400);
  assert.deepEqual((await state()).schedule, []);

  const ok = await call('POST', '/api/schedule', { cardioTemplateId: template.id, dates: [date] });
  assert.equal(ok.status, 201);
  assert.equal(ok.body[0].cardioTemplateId, template.id);
});

test('trening cardio: niepasujący plan → 400 bez zapisu; poprawny → 201; usunięcie 204 / 404', async () => {
  const workout = {
    name: 'Interwały', mode: 'interval', date: '2026-03-02', startedAt: 1_700_000_000_000,
    finishedAt: 1_700_000_600_000, activeSec: 540, ...PLAN,
  };
  const before = (await state()).cardioLog.length;
  const bad = await call('POST', '/api/cardio-workouts', { ...workout, totalSec: 600 });
  assert.equal(bad.status, 400);
  assert.match(bad.body.error, /nie mieści się w pełnych cyklach/);
  assert.equal((await state()).cardioLog.length, before);

  const created = await call('POST', '/api/cardio-workouts', workout);
  assert.equal(created.status, 201);
  assert.equal(created.body.mode, 'interval');
  assert.equal((await state()).cardioLog.length, before + 1);
  assert.equal((await call('DELETE', `/api/cardio-workouts/${created.body.id}`)).status, 204);
  assert.equal((await call('DELETE', `/api/cardio-workouts/${created.body.id}`)).status, 404);
});

test('eksport zawiera dane cardio, a import kopii bez kluczy cardio działa', async () => {
  await call('POST', '/api/cardio-templates', { name: 'Do eksportu', ...PLAN });
  const exported = await (await fetch(`${BASE}/api/export`)).json();
  assert.ok(exported.cardioTemplates.some(t => t.name === 'Do eksportu'));
  assert.ok(Array.isArray(exported.cardioLog));

  const old = { plans: [], schedule: [], log: [] };
  const imported = await call('POST', '/api/import', old);
  assert.equal(imported.status, 200);
  assert.deepEqual(imported.body.cardioTemplates, []);
});
