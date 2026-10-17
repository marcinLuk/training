'use strict';
// Testy czystej logiki cardio (public/cardio-core.js): limity, sprawdzanie planu,
// odmiana, czas z pauzami i oś czasu interwałów.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const core = require('../public/cardio-core');

const {
  LIMITS, COUNTDOWN_SEC, formatClock, cyclesWord, cyclesLabel, checkPlan,
  newSession, newIntervalSession, activeMs, pause, resume, countdownSec, intervalAt,
} = core;

test('moduł ładuje się też jako klasyczny skrypt przeglądarki i udostępnia globalny CardioCore', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'cardio-core.js'), 'utf8');
  const sandbox = {};
  sandbox.globalThis = sandbox;
  vm.runInNewContext(src, sandbox);
  assert.equal(typeof sandbox.CardioCore.checkPlan, 'function');
  assert.equal(typeof sandbox.CardioCore.intervalAt, 'function');
  assert.deepEqual(Object.keys(sandbox.CardioCore).sort(), Object.keys(core).sort());
});

test('LIMITS: interwał 5–3600 s, 1–50 interwałów, czas całkowity 1 s – 21600 s; odliczanie 3 s', () => {
  assert.equal(LIMITS.intervalMin, 5);
  assert.equal(LIMITS.intervalMax, 3600);
  assert.equal(LIMITS.countMin, 1);
  assert.equal(LIMITS.countMax, 50);
  assert.equal(LIMITS.totalMin, 1);
  assert.equal(LIMITS.totalMax, 21600);
  assert.equal(COUNTDOWN_SEC, 3);
});

test('formatClock: m:ss, a od godziny h:mm:ss', () => {
  assert.equal(formatClock(0), '0:00');
  assert.equal(formatClock(5), '0:05');
  assert.equal(formatClock(90), '1:30');
  assert.equal(formatClock(540), '9:00');
  assert.equal(formatClock(630), '10:30');
  assert.equal(formatClock(3599), '59:59');
  assert.equal(formatClock(3600), '1:00:00');
  assert.equal(formatClock(21600), '6:00:00');
  assert.equal(formatClock(-4), '0:00');
});

test('odmiana cykli: 1 cykl, 2–4 cykle, 12–14 cykli, 0 i 5+ cykli, 22 cykle, 25 cykli', () => {
  const word = n => cyclesWord(n);
  assert.equal(word(1), 'cykl');
  for (const n of [2, 3, 4, 22, 23, 24, 32, 102]) assert.equal(word(n), 'cykle', String(n));
  for (const n of [0, 5, 6, 9, 10, 11, 12, 13, 14, 15, 21, 25, 100, 111, 112, 114]) assert.equal(word(n), 'cykli', String(n));
  assert.equal(cyclesLabel(1), '1 cykl');
  assert.equal(cyclesLabel(7), '7 cykli');
  assert.equal(cyclesLabel(22), '22 cykle');
});

test('checkPlan: poprawny plan, gdy czas całkowity jest wielokrotnością cyklu', () => {
  assert.deepEqual(checkPlan([30, 60], 540), { ok: true, cycleSec: 90, cycles: 6, below: null, above: null, message: '' });
  assert.equal(checkPlan([30, 60], 90).cycles, 1);
  assert.equal(checkPlan([5, 7], 24).ok, true);
  assert.equal(checkPlan([5, 7], 24).cycles, 2);
});

test('checkPlan: czas niebędący wielokrotnością cyklu jest odrzucony i nazywa sąsiednie czasy', () => {
  const r = checkPlan([30, 60], 600);
  assert.equal(r.ok, false);
  assert.equal(r.cycleSec, 90);
  assert.equal(r.below, 540);
  assert.equal(r.above, 630);
  assert.equal(r.message,
    'Ten czas nie mieści się w pełnych cyklach (cykl 1:30). Najbliższe pasujące czasy: 9:00 (6 cykli) lub 10:30 (7 cykli).');
});

test('checkPlan: o sekundę za mało lub za dużo względem wielokrotności też jest odrzucone', () => {
  assert.equal(checkPlan([30, 60], 541).ok, false);
  assert.equal(checkPlan([30, 60], 539).ok, false);
  assert.equal(checkPlan([30, 60], 539).below, 450);
  assert.equal(checkPlan([30, 60], 539).above, 540);
});

test('checkPlan: interwałów nie skraca ani nie zaokrągla, wejścia nie zmienia', () => {
  const intervals = [30, 60];
  checkPlan(intervals, 600);
  assert.deepEqual(intervals, [30, 60]);
  assert.equal(checkPlan([30, 60], 600).cycleSec, 90);
});

test('checkPlan: czas krótszy niż jeden cykl nie ma czasu poniżej (0 to nie trening), podaje tylko górny', () => {
  const r = checkPlan([30, 60], 60);
  assert.equal(r.ok, false);
  assert.equal(r.below, null);
  assert.equal(r.above, 90);
  assert.equal(r.message, 'Ten czas nie mieści się w pełnych cyklach (cykl 1:30). Najbliższy pasujący czas: 1:30 (1 cykl).');
});

test('checkPlan: górny czas ponad limitem 6 h nie jest podawany', () => {
  const r = checkPlan([3600, 3600, 3600, 3600], 15000); // cykl 4:00:00
  assert.equal(r.ok, false);
  assert.equal(r.below, 14400);
  assert.equal(r.above, null);
  assert.equal(r.message,
    'Ten czas nie mieści się w pełnych cyklach (cykl 4:00:00). Najbliższy pasujący czas: 4:00:00 (1 cykl).');
});

test('checkPlan: górna wielokrotność dokładnie równa limitowi 6 h jest podawana', () => {
  const r = checkPlan([3600, 3600, 3600], 21000); // cykl 3 h; 21600 to 2 cykle
  assert.equal(r.above, 21600);
  assert.equal(r.below, 10800);
});

test('checkPlan: cykl dłuższy niż limit czasu nie ma żadnego pasującego czasu', () => {
  const r = checkPlan(new Array(50).fill(3600), 100);
  assert.equal(r.ok, false);
  assert.equal(r.below, null);
  assert.equal(r.above, null);
  assert.equal(r.message, 'Ten czas nie mieści się w pełnych cyklach (cykl 50:00:00). Cykl jest zbyt długi, by zmieścić go w limicie 6:00:00.');
});

test('checkPlan: brak interwałów (pusta lista, nie-tablica) daje komunikat o dodaniu interwału', () => {
  for (const bad of [[], null, undefined, 'x', {}]) {
    const r = checkPlan(bad, 60);
    assert.equal(r.ok, false);
    assert.equal(r.message, 'Dodaj co najmniej jeden interwał');
    assert.equal(r.below, null);
    assert.equal(r.above, null);
  }
});

test('checkPlan: limit liczby interwałów (50 ok, 51 odrzucone)', () => {
  assert.equal(checkPlan(new Array(50).fill(5), 250).ok, true);
  const r = checkPlan(new Array(51).fill(5), 255);
  assert.equal(r.ok, false);
  assert.equal(r.message, 'Maksymalna liczba interwałów to 50');
});

test('checkPlan: limit długości interwału (5 i 3600 ok; 4, 3601, 0, ujemny, ułamek, tekst, NaN odrzucone)', () => {
  assert.equal(checkPlan([5], 5).ok, true);
  assert.equal(checkPlan([3600], 3600).ok, true);
  for (const bad of [4, 3601, 0, -5, 5.5, '30', NaN, null]) {
    const r = checkPlan([30, bad], 90);
    assert.equal(r.ok, false, String(bad));
    assert.equal(r.message, 'Każdy interwał musi trwać od 5 do 3600 s (liczba całkowita)', String(bad));
  }
});

test('checkPlan: limit czasu całkowitego (1 s – 21600 s; 0, ujemny, ułamek, NaN, tekst, brak odrzucone)', () => {
  assert.equal(checkPlan([5], 21600).ok, true);
  assert.equal(checkPlan([5], 21600).cycles, 4320);
  for (const bad of [0, -90, 90.5, NaN, '90', null, undefined]) {
    const r = checkPlan([30, 60], bad);
    assert.equal(r.ok, false, String(bad));
    assert.equal(r.message, 'Podaj czas treningu większy od zera', String(bad));
  }
  const over = checkPlan([30, 60], 21601);
  assert.equal(over.ok, false);
  assert.equal(over.message, 'Czas treningu może wynosić najwyżej 6:00:00');
  assert.equal(checkPlan([30, 60], 21690).ok, false, 'wielokrotność cyklu ponad limitem też jest odrzucona');
});

test('checkPlan: najkrótszy czas całkowity 1 s przy poprawnym cyklu jest odrzucony z górną granicą', () => {
  const r = checkPlan([5], 1);
  assert.equal(r.ok, false);
  assert.equal(r.below, null);
  assert.equal(r.above, 5);
});

test('activeMs: czas bez pauz = teraz − start', () => {
  const s = newSession(1000);
  assert.equal(activeMs(s, 1000), 0);
  assert.equal(activeMs(s, 6000), 5000);
});

test('activeMs: nigdy ujemny (przed startem, rozjazd zegara)', () => {
  assert.equal(activeMs(newSession(5000), 1000), 0);
  assert.equal(activeMs({ startedAt: 0, pausedAt: null, pausedMs: 9999 }, 100), 0);
  assert.equal(activeMs({ startedAt: 5000, pausedAt: 1000, pausedMs: 0 }, 9000), 0);
});

test('pauza zamraża activeMs, a wznowienie wyłącza czas pauzy z pomiaru (D1)', () => {
  let s = newSession(0);
  s = pause(s, 5000);
  assert.equal(activeMs(s, 5000), 5000);
  assert.equal(activeMs(s, 10000), 5000, 'w pauzie czas stoi');
  assert.equal(activeMs(s, 999999), 5000);
  s = resume(s, 10000);
  assert.equal(s.pausedAt, null);
  assert.equal(s.pausedMs, 5000);
  assert.equal(activeMs(s, 10000), 5000, 'tuż po wznowieniu czas jest ten sam');
  assert.equal(activeMs(s, 15000), 10000, '5 s + 5 s pracy, 5 s pauzy');
});

test('kilka pauz sumuje czas pauzy', () => {
  let s = newSession(0);
  s = resume(pause(s, 1000), 3000);
  s = resume(pause(s, 4000), 9000);
  assert.equal(s.pausedMs, 7000);
  assert.equal(activeMs(s, 10000), 3000);
});

test('pause i resume zwracają nowe obiekty i nie zmieniają wejścia', () => {
  const s = newSession(0);
  const p = pause(s, 100);
  assert.notEqual(p, s);
  assert.deepEqual(s, { startedAt: 0, pausedAt: null, pausedMs: 0 });
  const r = resume(p, 200);
  assert.notEqual(r, p);
  assert.equal(p.pausedAt, 100);
  assert.equal(p.pausedMs, 0);
});

test('wstrzymanie wstrzymanej sesji i wznowienie działającej nic nie zmieniają', () => {
  const p = pause(newSession(0), 100);
  const again = pause(p, 500);
  assert.deepEqual(again, p);
  assert.notEqual(again, p);
  assert.equal(again.pausedAt, 100, 'moment pierwszej pauzy zostaje');
  const running = newSession(0);
  const resumed = resume(running, 500);
  assert.deepEqual(resumed, running);
  assert.notEqual(resumed, running);
  assert.equal(resumed.pausedMs, 0);
});

test('wznowienie z zegarem cofniętym przed pauzą nie daje ujemnego czasu pauzy', () => {
  const s = resume(pause(newSession(0), 5000), 4000);
  assert.equal(s.pausedMs, 0);
});

test('odliczanie 3-2-1 nie liczy się do czasu treningu (startedAt = koniec odliczania)', () => {
  const s = newIntervalSession(10000);
  assert.equal(s.startedAt, 10000 + COUNTDOWN_SEC * 1000);
  assert.equal(s.pausedAt, null);
  assert.equal(s.pausedMs, 0);
  assert.equal(activeMs(s, 10000), 0);
  assert.equal(activeMs(s, 12999), 0);
  assert.equal(activeMs(s, 13000), 0);
  assert.equal(activeMs(s, 14000), 1000);
});

test('countdownSec pokazuje 3, 2, 1, potem 0', () => {
  const s = newIntervalSession(0);
  assert.equal(countdownSec(s, 0), 3);
  assert.equal(countdownSec(s, 999), 3);
  assert.equal(countdownSec(s, 1000), 2);
  assert.equal(countdownSec(s, 2000), 1);
  assert.equal(countdownSec(s, 2999), 1);
  assert.equal(countdownSec(s, 3000), 0);
  assert.equal(countdownSec(s, 60000), 0);
});

test('intervalAt: początek, środek i ostatnia milisekunda interwału', () => {
  const iv = [5, 7];
  assert.deepEqual(intervalAt(iv, 24, 0),
    { done: false, index: 0, position: 0, cycle: 0, intervalSec: 5, remainingMs: 5000 });
  assert.deepEqual(intervalAt(iv, 24, 2000),
    { done: false, index: 0, position: 0, cycle: 0, intervalSec: 5, remainingMs: 3000 });
  assert.deepEqual(intervalAt(iv, 24, 4999),
    { done: false, index: 0, position: 0, cycle: 0, intervalSec: 5, remainingMs: 1 });
  assert.deepEqual(intervalAt(iv, 24, 11999),
    { done: false, index: 1, position: 1, cycle: 0, intervalSec: 7, remainingMs: 1 });
});

test('intervalAt: na dokładnej granicy bieżący jest następny interwał, bez przerwy', () => {
  const iv = [5, 7];
  assert.deepEqual(intervalAt(iv, 24, 5000),
    { done: false, index: 1, position: 1, cycle: 0, intervalSec: 7, remainingMs: 7000 });
  assert.deepEqual(intervalAt(iv, 24, 12000),
    { done: false, index: 0, position: 2, cycle: 1, intervalSec: 5, remainingMs: 5000 });
});

test('intervalAt: sekwencja powtarza się (zawinięcie cyklu) 5 s + 7 s, razem 0:24 (D3)', () => {
  const iv = [5, 7];
  const seq = [];
  for (const ms of [0, 5000, 12000, 17000, 23999]) {
    const r = intervalAt(iv, 24, ms);
    seq.push([r.intervalSec, r.cycle, r.position]);
  }
  assert.deepEqual(seq, [[5, 0, 0], [7, 0, 1], [5, 1, 2], [7, 1, 3], [7, 1, 3]]);
});

test('intervalAt: done dokładnie po upływie czasu całkowitego i później', () => {
  const iv = [5, 7];
  assert.equal(intervalAt(iv, 24, 23999).done, false);
  const done = intervalAt(iv, 24, 24000);
  assert.deepEqual(done, { done: true, index: null, position: null, cycle: null, intervalSec: null, remainingMs: 0 });
  assert.equal(intervalAt(iv, 24, 99999).done, true);
});

test('intervalAt: ujemny czas aktywny traktowany jak 0', () => {
  assert.equal(intervalAt([5, 7], 24, -500).remainingMs, 5000);
  assert.equal(intervalAt([5, 7], 24, -500).position, 0);
});

test('intervalAt: jeden interwał powtarza się w kółko', () => {
  const r = intervalAt([10], 60, 25000);
  assert.deepEqual(r, { done: false, index: 0, position: 2, cycle: 2, intervalSec: 10, remainingMs: 5000 });
});

test('intervalAt: pusta lub niedodatnia lista interwałów rzuca wyjątek', () => {
  assert.throws(() => intervalAt([], 60, 0), RangeError);
  assert.throws(() => intervalAt(null, 60, 0), RangeError);
  assert.throws(() => intervalAt([0, 0], 60, 0), RangeError);
});

test('pauza w trybie interwałowym zamraża pozostały czas interwału i wznawia od tej samej wartości (D4)', () => {
  const iv = [5, 7];
  let s = newSession(0);
  s = pause(s, 2000);
  const frozen = intervalAt(iv, 24, activeMs(s, 2000));
  assert.equal(frozen.remainingMs, 3000);
  for (const now of [3000, 9000, 60000]) {
    assert.deepEqual(intervalAt(iv, 24, activeMs(s, now)), frozen, `now=${now}`);
  }
  s = resume(s, 62000);
  assert.deepEqual(intervalAt(iv, 24, activeMs(s, 62000)), frozen, 'tuż po wznowieniu to samo');
  assert.equal(intervalAt(iv, 24, activeMs(s, 63000)).remainingMs, 2000, 'potem odlicza dalej');
});

test('pauza przed końcem interwału nie przesuwa granicy interwałów po wznowieniu', () => {
  const iv = [5, 7];
  let s = newSession(0);
  s = pause(s, 4000);
  s = resume(s, 10000); // pauza 6 s
  assert.equal(intervalAt(iv, 24, activeMs(s, 10000)).position, 0);
  assert.equal(intervalAt(iv, 24, activeMs(s, 11000)).position, 1, 'granica 5 s aktywnego czasu = 11 s zegarowo');
});

test('checkPlan: liczba cykli to czas całkowity podzielony przez cykl', () => {
  for (let n = 1; n <= 50; n++) assert.equal(checkPlan([5], n * 5).cycles, n);
});
