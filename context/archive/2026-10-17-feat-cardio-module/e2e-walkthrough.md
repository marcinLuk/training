# Do przetestowania: feat-cardio-module — Moduł treningu cardio

Zaimplementowane 2026-10-17 · 5 etapów (tryb brief, bez planu) · commity: `d7dbb2b`…`ea893b2`
Kontrakt: `brief.md` · przebieg: `workbench.md` · code review: `reviews/`

**Nikt nie przeszedł tej zmiany end-to-end na Twojej prawdziwej bazie i na telefonie.** Krytycy przeszli każdy krok w przeglądarce na świeżej bazie testowej. Poniższa ścieżka jest dla Ciebie.

## Co się zmieniło

Jest nowa zakładka **Cardio**. Masz w niej stoper z pauzą i kreator treningu interwałowego: dowolna liczba interwałów plus czas całkowity. Aplikacja liczy pełne cykle, a jeśli czas nie dzieli się na pełne cykle, blokuje start i podpowiada najbliższe pasujące czasy. Przed startem odlicza 3-2-1. Po każdym interwale daje sygnał dźwiękowy, wibrację i komunikat na ekranie, a po czasie całkowitym kończy trening sama. Trening interwałowy można zapisać jako szablon. Szablon można zaplanować w kalendarzu, a ukończony trening cardio trafia do dziennika i kalendarza. Cardio ma wszędzie fioletowy kolor: zaplanowane to pusta obwódka, wykonane to pełna kropka. Trwający trening cardio przetrwa odświeżenie strony.

### Co zmieniło się pod spodem (bez widocznego efektu)

- Baza przechodzi migrację do wersji 3: nowe tabele cardio i kolumna `cardio_template_id` w kalendarzu. Istniejące dane zostają bez zmian (test `test/migration.test.js`).
- Wspólny moduł `public/cardio-core.js` (zasady cykli, pauzy, osi czasu) jest używany przez przeglądarkę i przez serwer.
- Projekt ma testy: `npm test` (90 testów). `CLAUDE.md` i `README.md` opisują moduł cardio.

## Zanim zaczniesz

- **Najpierw kopia zapasowa.** Pierwsze uruchomienie nowego kodu zmigruje Twoją prawdziwą bazę `./data/trening.db` do wersji 3. Zanim zatrzymasz stary serwer, wejdź w **Dziennik → Eksportuj** i zachowaj plik JSON.
- Środowisko: zatrzymaj i uruchom ponownie `npm run dev` (adres http://localhost:3000) albo `docker compose up -d --build`, jeśli korzystasz z Dockera.
- Zależności zewnętrzne: nic.
- Konto: bez logowania, chyba że masz ustawione `APP_PASSWORD`.
- Dane startowe: przynajmniej jeden plan siłowy (masz już swoje).
- Telefon: do kroku 17 (dźwięk, wibracja, wygaszanie ekranu) potrzebny jest prawdziwy telefon z aplikacją otwartą przez HTTPS albo localhost.

## Ścieżka

Legenda: `[ ]` do sprawdzenia · `[x]` sprawdzone, działa · `[!]` sprawdzone, nie działa (opis w „Notatki z przejścia") · `[-]` pominięte

| Status | # | Krok | Oczekiwany wynik | Sprawdzone przez |
| :-- | :-- | :-- | :-- | :-- |
| `[x]` | 1 | Uruchom nowy kod na swojej bazie i przejrzyj Kalendarz, Plany, Ćwiczenia, Dziennik | Wszystkie dotychczasowe plany, terminy i wpisy są na miejscu, bez zmian | test automatyczny (`reviews/phase-2-round-1.md`, migracja z wersji 2 z danymi); **na Twojej bazie: nikt** |
| `[x]` | 2 | Otwórz zakładkę **Cardio** → „Trening swobodny” → Start; po kilku sekundach Pauza, odczekaj ~5 s, Wznów, potem Zakończ | Zegar stoi w czasie pauzy („Wstrzymano”); w podsumowaniu „Czas aktywny” nie obejmuje pauzy | krytyk (`reviews/phase-3-round-2.md`, 3.4) |
| `[x]` | 3 | W podsumowaniu kliknij „Zapisz w dzienniku” | Przechodzisz do Dziennika; jest tam karta z fioletową lewą krawędzią, tagiem „cardio” i czasem aktywnym | krytyk (`phase-3-round-2.md`, 3.8) |
| `[x]` | 4 | Cardio → kreator: dodaj interwały 30 s i 60 s, czas całkowity 10:00 | Komunikat, że czas nie mieści się w pełnych cyklach, z czasami 9:00 (6 cykli) lub 10:30 (7 cykli); Start, nazwa, „Zapisz jako szablon” i „Dodaj do kalendarza” są wyłączone | krytyk (`phase-3-round-2.md`, 3.5; `phase-4-round-3.md`, 4.8) |
| `[x]` | 5 | Zmień czas na 9:00 | „6 cykli (cykl 1:30)”; przyciski się włączają | krytyk (`phase-3-round-2.md`, 3.5) |
| `[x]` | 6 | Zbuduj krótki trening 5 s + 7 s, czas 0:24, wpisz nazwę i „Zapisz jako szablon” | Szablon jest na liście „Szablony” z poprawną nazwą (spróbuj nazwy ze znakami `<`, `&`, `"` — mają się wyświetlić dosłownie) | krytyk (`phase-3-round-2.md`, 3.9) |
| `[x]` | 7 | Uruchom ten szablon | Odliczanie 3-2-1, potem 5 s, 7 s, 5 s, 7 s bez przerw; przy każdej zmianie komunikat „Teraz: …”, licznik „Interwał x z 2 · cykl c z 2” i następny interwał; po 0:24 czasu aktywnego samo podsumowanie | krytyk — przebieg i wywołania dźwięku/wibracji (`phase-3-round-2.md`, 3.6); **czy dźwięk słychać: nikt (krok 17)** |
| `[x]` | 8 | Uruchom go jeszcze raz; w trakcie interwału Pauza, odczekaj kilka sekund, Wznów | Pozostały czas stoi w pauzie i rusza od tej samej wartości | krytyk (`phase-3-round-2.md`, 3.7) |
| `[x]` | 9 | Podczas działającego interwału odśwież stronę (F5); potem odśwież też w pauzie i w trakcie 3-2-1 | Trening wraca z poprawnym czasem; pauza zostaje pauzą; odliczanie trwa dalej | krytyk (`phase-3-round-2.md`, 3.10) |
| `[x]` | 10 | Kalendarz → formularz „Dodaj trening do kalendarza” → grupa „Szablony cardio” → Twój szablon, zaznacz „powtarzaj co tydzień przez 2 tyg.” → Dodaj | Na wybranym dniu i tydzień później pojawia się fioletowa pusta kropka i karta z tagiem „cardio” | krytyk (`reviews/phase-4-round-3.md`, 4.4) |
| `[x]` | 11 | Porównaj kolory w kalendarzu: zaplanowany siłowy, wykonany siłowy, zaplanowane cardio, wykonane cardio (w jasnym i ciemnym motywie telefonu) | Cztery wyraźnie różne oznaczenia; cardio zawsze fioletowe | krytyk (`phase-4-round-3.md`, 4.4) |
| `[x]` | 12 | Na karcie cardio w kalendarzu kliknij ▶ Start, dokończ trening i zapisz | Wpis tego dnia zmienia się na „✓ wykonany”, kropka staje się pełna; pozostałe terminy szablonu dalej zaplanowane | krytyk (`phase-4-round-3.md`, 4.5) |
| `[x]` | 13 | Zrób dziś krótki trening swobodny i zapisz go, potem otwórz dzisiejszy dzień w kalendarzu | Trening „Cardio swobodne” jest na dzisiejszym dniu, fioletowy, wykonany | krytyk (`phase-4-round-3.md`, 4.6) |
| `[x]` | 14 | W kreatorze ustaw poprawny trening, nazwę i datę → „Dodaj do kalendarza”; potem wyczyść nazwę albo ustaw zły czas | Szablon powstaje i ląduje na wybranej dacie; bez nazwy, bez daty albo przy złym czasie przycisk jest wyłączony | krytyk (`phase-4-round-3.md`, 4.8) |
| `[x]` | 15 | Usuń szablon z kroku 6 (ma jeden wpis wykonany i jeden przyszły) | Przyszły wpis znika z kalendarza, wykonany zostaje z nazwą | krytyk (`phase-4-round-3.md`, 4.7) |
| `[x]` | 16 | Trening siłowy: Start z planu, zrób serię, odczekaj kawałek przerwy, zakończ i zapisz; spróbuj w trakcie uruchomić cardio (i odwrotnie) | Trening siłowy działa jak dotąd; równoległy start drugiego treningu kończy się polskim komunikatem „Trwa trening …” | krytyk (`phase-3-round-2.md`, 3.11; `phase-4-round-3.md`, 4.9) |
| `[x]` | 17 | **Na telefonie** przejdź krótki trening interwałowy | Słychać sygnał na 3-2-1, przy każdej zmianie interwału i dłuższy na końcu; telefon wibruje; ekran nie gaśnie w trakcie i może zgasnąć po zakończeniu | **nikt** (agent widzi tylko, że kod wywołuje dźwięk, wibrację i blokadę ekranu) |
| `[x]` | 18 | Dziennik → Eksportuj; potem Importuj ten plik | Plik zawiera `cardioTemplates` i `cardioLog`; po imporcie szablony, treningi i terminy cardio wracają | test automatyczny (`reviews/phase-2-round-1.md`); **w przeglądarce: nikt** |

## Kroki, których nikt nie sprawdził

- [x] **1** Migracja na Twojej prawdziwej bazie. Test sprawdzał migrację na sztucznej bazie w wersji 2 z danymi, nie na Twoim pliku.
- [x] **17** Dźwięk, wibracja i blokada wygaszania ekranu na prawdziwym telefonie. Przeglądarka agentów nie ma głośnika ani wibracji, a Wake Lock był podstawiony atrapą.
- [x] **17** Zachowanie przy zablokowanym ekranie albo karcie w tle: przeglądarka spowalnia wtedy timery, a czas powinien się zgadzać po powrocie.
- [x] **18** Eksport i import przez przycisk w aplikacji. Sprawdzone tylko testami repozytorium i API.
- [x] Obraz Dockera (Node 24): nikt nie przebudował kontenera. Lokalne testy szły na Node 22.
- [x] Logowanie `APP_PASSWORD` i serwowanie spod podścieżki reverse proxy z nowymi endpointami cardio.

## Na co zwrócić uwagę

- Pierwsze uruchomienie zmienia schemat Twojej bazy. Cofnięcie kodu nie cofa migracji: baza zostaje w wersji 3. Czy stary kod działa na takiej bazie, nikt nie sprawdził.
- Po odświeżeniu strony w trakcie treningu wibracja działa, ale **dźwięk milczy do pierwszego stuknięcia** w dowolny przycisk aplikacji (ograniczenie przeglądarek co do autoodtwarzania; `silent-after-reload`).
- Trening interwałowy przerwany wcześniej pokazuje w dzienniku zaplanowaną liczbę cykli, np. „0:12 · 5 s + 7 s × 2 cykle” (G-03).
- Podsumowanie zaokrągla czas w dół, a zapis normalnie, więc 9,6 s to „0:09” na ekranie i „0:10” w dzienniku.
- Wykonany wpis z usuniętego szablonu, którego trening potem usuniesz z dziennika, wyświetli się jak siłowy „(usunięty plan)”. Danych nie traci.
- Pole nazwy szablonu jest wyłączone, dopóki czas nie mieści się w pełnych cyklach.
- Inne uwagi Minor/Nit, których pętla świadomie nie naprawiała:
  - karty siłowe w kalendarzu dostały nieaktywny atrybut `data-id`;
  - ponowne wysłanie tego samego id do API cardio daje błąd 500 zamiast 409;
  - nazwy `cardioTemplateId` i `templateId` nie są spójne;
  - `formatClock` i `fmtElapsed` się dublują;
  - `CLAUDE.md` mówi „exactly one of planId / cardioTemplateId”, a to jest prawdą tylko w chwili tworzenia wpisu.
  
  Szczegóły są w `reviews/` i w `retrospective.md`.

## Jeśli coś nie działa

- Logi: konsola terminala z `npm run dev` lub `docker compose logs trening`; błędy przeglądarki w konsoli devtools.
- Zablokowany trening cardio: aplikacja sama odrzuca uszkodzony zapis `trening.cardio.v1`. W ostateczności wyczyść ten klucz w localStorage.
- Cofnięcie zmiany: `git revert ea893b2 d8f9a79 2867e53 525b781 d7dbb2b`, w tej kolejności. Potem w razie potrzeby przywróć bazę z eksportu z „Zanim zaczniesz”.
- Raporty z rund: `reviews/phase-<N>-round-<R>.md`, `reviews/goal-review.md`, `reviews/goal-review-round-2.md`. Tam jest, co krytyk widział i czego nie widział.

## Notatki z przejścia

## Odhaczenie

- [x] Przeszedłem całą ścieżkę i działa
- [ ] Ścieżka przeszła, ale mam uwagi: <wpisz>
- [ ] Nie działa: <wpisz krok i co się stało>

Po przejściu: `change.md` → `status: implemented`, potem `/10x-archive feat-cardio-module`.
