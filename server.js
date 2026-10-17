'use strict';

const express = require('express');
const path = require('node:path');
const { createHash, timingSafeEqual } = require('node:crypto');
const { createRepo, ValidationError, ConflictError } = require('./db');

const PORT = Number(process.env.PORT) || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'trening.db');
const APP_USER = process.env.APP_USER || 'admin';
const APP_PASSWORD = process.env.APP_PASSWORD || '';

const repo = createRepo(DB_PATH);
const app = express();
app.disable('x-powered-by');

// Healthcheck dla Dockera – przed logowaniem
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Proste logowanie HTTP Basic – włączone, gdy ustawiono APP_PASSWORD
const sha = s => createHash('sha256').update(s).digest();
const safeEqual = (a, b) => timingSafeEqual(sha(a), sha(b));

app.use((req, res, next) => {
  if (!APP_PASSWORD) return next();
  const [scheme, encoded] = (req.headers.authorization || '').split(' ');
  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString();
    const i = decoded.indexOf(':');
    if (i > -1 && safeEqual(decoded.slice(0, i), APP_USER) && safeEqual(decoded.slice(i + 1), APP_PASSWORD)) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="Trening", charset="UTF-8"').status(401).send('Wymagane logowanie');
});

app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const notFound = res => res.status(404).json({ error: 'Nie znaleziono' });

// ---------- API ----------
app.get('/api/state', (req, res) => res.json(repo.getState()));

app.post('/api/exercises', (req, res) => res.status(201).json(repo.createExercise(req.body)));
app.put('/api/exercises/:id', (req, res) => {
  const exercise = repo.renameExercise(req.params.id, req.body);
  exercise ? res.json(exercise) : notFound(res);
});
app.delete('/api/exercises/:id', (req, res) => (repo.deleteExercise(req.params.id) ? res.sendStatus(204) : notFound(res)));

app.post('/api/plans', (req, res) => res.status(201).json(repo.createPlan(req.body)));
app.put('/api/plans/:id', (req, res) => {
  const plan = repo.updatePlan(req.params.id, req.body);
  plan ? res.json(plan) : notFound(res);
});
app.delete('/api/plans/:id', (req, res) => (repo.deletePlan(req.params.id) ? res.sendStatus(204) : notFound(res)));

app.post('/api/schedule', (req, res) => res.status(201).json(repo.addSchedule(req.body)));
app.delete('/api/schedule/:id', (req, res) => (repo.deleteSchedule(req.params.id) ? res.sendStatus(204) : notFound(res)));

app.post('/api/workouts', (req, res) => res.status(201).json(repo.addWorkout(req.body)));
app.delete('/api/workouts/:id', (req, res) => (repo.deleteWorkout(req.params.id) ? res.sendStatus(204) : notFound(res)));

app.get('/api/export', (req, res) => {
  res.attachment(`trening-backup-${new Date().toISOString().slice(0, 10)}.json`);
  res.send(JSON.stringify(repo.getState(), null, 2));
});
app.post('/api/import', (req, res) => {
  repo.replaceAll(req.body);
  res.json(repo.getState());
});

app.use('/api', (req, res) => notFound(res));

app.use((err, req, res, next) => {
  if (err instanceof ConflictError) return res.status(409).json({ error: err.message });
  if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Nieprawidłowy JSON' });
  console.error(err);
  res.status(500).json({ error: 'Błąd serwera' });
});

const server = app.listen(PORT, () => {
  console.log(`Trening działa na http://localhost:${PORT} (baza: ${DB_PATH}${APP_PASSWORD ? ', logowanie włączone' : ''})`);
});

// Czyste zamknięcie bazy przy `docker stop`
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => server.close(() => { repo.close(); process.exit(0); }));
}
