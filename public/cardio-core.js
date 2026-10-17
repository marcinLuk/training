// Czysta logika treningu cardio: bez DOM, bez Date.now() (wywołujący podaje `now`).
// Ten sam plik działa jako klasyczny skrypt przeglądarki (globalny `CardioCore`)
// i jako moduł CommonJS (`require('./public/cardio-core')` w db.js i w testach).
(function (factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else globalThis.CardioCore = factory();
})(function () {
  'use strict';

  // Limity planu interwałowego (w sekundach, interwały i czas całkowity to liczby całkowite).
  const LIMITS = Object.freeze({
    intervalMin: 5,
    intervalMax: 3600,
    countMin: 1,
    countMax: 50,
    totalMin: 1,
    totalMax: 21600, // 6 godzin
  });

  // Odliczanie 3-2-1 przed startem treningu interwałowego (nie wlicza się do czasu treningu).
  const COUNTDOWN_SEC = 3;

  const pad = n => String(n).padStart(2, '0');

  // Zegar „m:ss”, a od godziny „h:mm:ss”.
  function formatClock(sec) {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60;
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  }

  // Polska odmiana: 1 cykl · 2–4 cykle (ale 12–14 cykli) · 0 i 5+ cykli.
  function cyclesWord(n) {
    if (n === 1) return 'cykl';
    const last = n % 10, lastTwo = n % 100;
    if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return 'cykle';
    return 'cykli';
  }

  const cyclesLabel = n => `${n} ${cyclesWord(n)}`;

  const isInt = v => Number.isInteger(v);

  // Sprawdza plan: lista interwałów (sekundy) i czas całkowity (sekundy).
  // Plan jest poprawny tylko wtedy, gdy mieści się w limitach, a czas całkowity jest
  // wielokrotnością cyklu. Interwałów nigdy nie skracamy ani nie zaokrąglamy.
  function checkPlan(intervals, totalSec) {
    const fail = (message, extra = {}) =>
      ({ ok: false, cycleSec: null, cycles: null, below: null, above: null, message, ...extra });

    if (!Array.isArray(intervals) || intervals.length < LIMITS.countMin) {
      return fail('Dodaj co najmniej jeden interwał');
    }
    if (intervals.length > LIMITS.countMax) {
      return fail(`Maksymalna liczba interwałów to ${LIMITS.countMax}`);
    }
    if (!intervals.every(s => isInt(s) && s >= LIMITS.intervalMin && s <= LIMITS.intervalMax)) {
      return fail(`Każdy interwał musi trwać od ${LIMITS.intervalMin} do ${LIMITS.intervalMax} s (liczba całkowita)`);
    }
    const cycleSec = intervals.reduce((a, b) => a + b, 0);
    if (!isInt(totalSec) || totalSec < LIMITS.totalMin) {
      return fail('Podaj czas treningu większy od zera', { cycleSec });
    }
    if (totalSec > LIMITS.totalMax) {
      return fail(`Czas treningu może wynosić najwyżej ${formatClock(LIMITS.totalMax)}`, { cycleSec });
    }

    const cycles = totalSec / cycleSec;
    if (isInt(cycles)) return { ok: true, cycleSec, cycles, below: null, above: null, message: '' };

    const lowerCycles = Math.floor(cycles);
    const below = lowerCycles >= 1 ? lowerCycles * cycleSec : null;
    const aboveSec = (lowerCycles + 1) * cycleSec;
    const above = aboveSec <= LIMITS.totalMax ? aboveSec : null;

    const head = `Ten czas nie mieści się w pełnych cyklach (cykl ${formatClock(cycleSec)}).`;
    const named = (sec) => `${formatClock(sec)} (${cyclesLabel(sec / cycleSec)})`;
    let tail;
    if (below !== null && above !== null) tail = `Najbliższe pasujące czasy: ${named(below)} lub ${named(above)}.`;
    else if (below !== null) tail = `Najbliższy pasujący czas: ${named(below)}.`;
    else if (above !== null) tail = `Najbliższy pasujący czas: ${named(above)}.`;
    else tail = `Cykl jest zbyt długi, by zmieścić go w limicie ${formatClock(LIMITS.totalMax)}.`;
    return { ok: false, cycleSec, cycles, below, above, message: `${head} ${tail}` };
  }

  // Sesja z pauzami: { startedAt, pausedAt, pausedMs } (znaczniki czasu w ms).
  // W treningu interwałowym startedAt to koniec odliczania, więc odliczanie nie liczy się do czasu.
  const newSession = startedAt => ({ startedAt, pausedAt: null, pausedMs: 0 });

  // Sesja interwałowa zaczęta w chwili `now`: czas treningu rusza po odliczaniu.
  const newIntervalSession = now => newSession(now + COUNTDOWN_SEC * 1000);

  // Czas aktywny (bez pauz), nigdy ujemny; w trakcie odliczania wynosi 0.
  function activeMs(session, now) {
    const end = session.pausedAt ?? now;
    return Math.max(0, end - session.startedAt - session.pausedMs);
  }

  // Wstrzymanie wstrzymanej sesji nic nie zmienia.
  function pause(session, now) {
    if (session.pausedAt != null) return { ...session };
    return { ...session, pausedAt: now };
  }

  // Wznowienie działającej sesji nic nie zmienia.
  function resume(session, now) {
    if (session.pausedAt == null) return { ...session };
    return { ...session, pausedAt: null, pausedMs: session.pausedMs + Math.max(0, now - session.pausedAt) };
  }

  // Liczba sekund do pokazania w odliczaniu 3-2-1; 0, gdy trening już trwa.
  function countdownSec(session, now) {
    return Math.max(0, Math.ceil((session.startedAt - now) / 1000));
  }

  // Który interwał trwa po `activeMs` aktywnego czasu. Na granicy bieżący jest już następny.
  // `done`, gdy upłynął cały czas treningu (wtedy pozostałe pola to null / 0).
  function intervalAt(intervals, totalSec, activeMs) {
    const cycleSec = Array.isArray(intervals) ? intervals.reduce((a, b) => a + b, 0) : 0;
    if (!(cycleSec > 0)) throw new RangeError('Lista interwałów musi zawierać dodatnie czasy');

    const ms = Math.max(0, activeMs);
    if (ms >= totalSec * 1000) {
      return { done: true, index: null, position: null, cycle: null, intervalSec: null, remainingMs: 0 };
    }
    const cycleMs = cycleSec * 1000;
    const cycle = Math.floor(ms / cycleMs);
    const within = ms - cycle * cycleMs;
    let start = 0;
    for (let index = 0; index < intervals.length; index++) {
      const end = start + intervals[index] * 1000;
      if (within < end) {
        return {
          done: false,
          index,
          position: cycle * intervals.length + index,
          cycle,
          intervalSec: intervals[index],
          remainingMs: end - within,
        };
      }
      start = end;
    }
    throw new RangeError('Nie znaleziono bieżącego interwału');
  }

  // Zapis interwałów do wyświetlenia, np. „30 s + 60 s”.
  const intervalsList = intervals => intervals.map(s => `${s} s`).join(' + ');

  // Nazwa niezapisanego treningu interwałowego, np. „Interwały 30 s + 60 s”.
  const intervalsName = intervals => `Interwały ${intervalsList(intervals)}`;

  // Czas (s) interwału następującego po interwale o pozycji `position` w całym treningu;
  // null, gdy bieżący interwał jest ostatnim. Plan musi być poprawny (pełne cykle).
  function nextIntervalSec(intervals, totalSec, position) {
    const cycleSec = intervals.reduce((a, b) => a + b, 0);
    const count = (totalSec / cycleSec) * intervals.length;
    if (position + 1 >= count) return null;
    return intervals[(position + 1) % intervals.length];
  }

  // Sprawdza wartość odczytaną z localStorage (trwający trening cardio): pełny kształt sesji,
  // planu interwałowego, fazy i – w podsumowaniu – czasów. Zwraca true tylko dla poprawnej wartości.
  function isValidStored(c) {
    const num = v => typeof v === 'number' && Number.isFinite(v);
    if (!c || typeof c !== 'object') return false;
    if (c.mode !== 'free' && c.mode !== 'interval') return false;
    const s = c.session;
    if (!s || typeof s !== 'object') return false;
    if (!num(s.startedAt) || !num(s.pausedMs) || s.pausedMs < 0) return false;
    if (s.pausedAt !== null && !num(s.pausedAt)) return false;
    if (c.phase !== 'running' && c.phase !== 'summary') return false;
    if (typeof c.name !== 'string') return false;
    if (c.pos !== undefined && !(Number.isInteger(c.pos) && c.pos >= 0)) return false;
    if (c.note !== undefined && typeof c.note !== 'string') return false;
    if (c.mode === 'interval') {
      if (!Number.isInteger(c.totalSec) || !checkPlan(c.intervals, c.totalSec).ok) return false;
    }
    if (c.phase === 'summary') {
      if (!num(c.activeMs) || c.activeMs < 0 || !num(c.finishedAt)) return false;
    }
    return true;
  }

  return {
    LIMITS, COUNTDOWN_SEC, isValidStored,
    formatClock, cyclesWord, cyclesLabel,
    intervalsList, intervalsName, nextIntervalSec,
    checkPlan,
    newSession, newIntervalSession, activeMs, pause, resume, countdownSec,
    intervalAt,
  };
});
