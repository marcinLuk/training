# Krytyka UX/UI aplikacji Trening

Data: 2026-10-17. Zakres: cała aplikacja (`public/index.html`, `styles.css`, `app.js`), podgląd na 375×812 px.
Metoda: dwie niezależne oceny: A (przegląd projektowy) i B (detektor Impeccable + pomiary w przeglądarce).
Kontekst produktu: [PRODUCT.md](../PRODUCT.md). Archiwum przebiegu: `.impeccable/critique/2026-10-17T15-39-52Z__public-index-html.md`.

## Ocena heurystyk (Nielsen)

| # | Heurystyka | Wynik | Główny problem |
|---|---|---|---|
| 1 | Widoczność stanu systemu | 3 | Runner i przerwa czytelne. Zapisy ciche, brak „zapisano". W trybie pracy nie widać, co dalej. |
| 2 | Zgodność ze światem rzeczywistym | 3 | Naturalna polszczyzna. „Cykl" i „interwał" są abstrakcyjne dla osoby na siłowni. |
| 3 | Kontrola i swoboda | 2 | Brak cofnięcia zakończonej serii. Ostatnie powtórzenie automatycznie kończy serię i włącza przerwę. |
| 4 | Spójność | 3 | „Zakończ" i „Zakończ serię" sąsiadują. Trzy rozmiary celów dotykowych (28, 39 i ok. 29 px). |
| 5 | Zapobieganie błędom | 3 | Walidacja planu cardio wzorowa. Natywne `confirm()` w trakcie treningu rwie przepływ. |
| 6 | Rozpoznawanie zamiast pamiętania | 2 | Ekran pracy nie pokazuje poprzedniej serii ani wyników z ostatniego treningu. Kropki w kalendarzu bez legendy. |
| 7 | Elastyczność i wydajność | 2 | Start treningu to 3 tapnięcia z kalendarza. Waga jako pole tekstowe z klawiaturą. |
| 8 | Estetyka i minimalizm | 2 | Zakładka Cardio to ściana ok. 10 kontrolek, szablony poniżej zagięcia. |
| 9 | Rozpoznawanie błędów i naprawa | 3 | Komunikaty konkretne, ale toast znika po 4 s. |
| 10 | Pomoc i dokumentacja | 1 | Zero onboardingu i legend. |
| **Razem** | | **24/40** | **Acceptable** |

## Specyficzność projektu

Wygląd jest wymienny z dowolnym ciemnym trackerem fitness: `#111418`, system-ui, zielony akcent, zaokrąglone karty, emoji jako logo.
Autorskie momenty: duży okrągły licznik powtórzeń, pierścień przerwy, stały kod kolorów (zielony siła, fiolet cardio), walidacja planu cardio na żywo.
PRODUCT.md mówi, że obecna paleta nie jest wiążąca.

## Wyniki detektora i pomiarów

- `side-tab` w `public/styles.css:223` (`.card.cardio`, lewa krawędź 5 px przy promieniu 14 px). Potwierdzone w przeglądarce, nie jest fałszywym alarmem.
- „Flat type hierarchy" na wszystkich przeskanowanych widokach: kroki skali 1,14–1,17 wobec zalecanych 1,25.
- Przeskanowane widoki: kalendarz, plany, cardio. Nie skanowano ćwiczeń, dziennika ani nakładek runnera.
- Brak poziomego przewijania przy 375 px. `lang="pl"` i meta viewport są.
- Kontrast `--muted` (#8b96a5): 6,3:1 na tle, 5,3:1 na kartach (AA OK).
- Cele dotykowe: zakładki dolne 38 px wysokości, większość przycisków 38–39 px, „Dziś" 28 px, checkbox 13×13 px.
- Brak reguły `:focus-visible` dla przycisków. Komórki dni w kalendarzu bez `aria-label`.

## Co działa

1. **Runner:** cel dotykowy 255 px, wibracja, wake lock, czas oparty na znacznikach, który przetrwa uśpienie i przeładowanie.
2. **Walidacja planu cardio** z wyjaśnieniem na żywo zamiast okna dialogowego.
3. **Spójny kod kolorów** zielony/fiolet w kalendarzu, kartach, tagach i runnerze.

## Problemy priorytetowe

### [P1] Każde tapnięcie przebudowuje cały runner (`app.js:1119–1121`, `582–601`)
- **Dlaczego ważne:** `rep-inc` wywołuje `renderRunner()`, które niszczy i odtwarza przycisk pod kciukiem. Znika stan `:active`, a szybkie tapnięcia mogą trafić w usunięty węzeł i zgubić powtórzenia. To główna interakcja produktu.
- **Fix:** aktualizować licznik, pigułki i pasek w miejscu (jak `tick()`), przebudowywać tylko przy zmianie fazy.
- **Polecenie:** `/impeccable optimize`, potem `harden`.

### [P1] Cele dotykowe poniżej 44 px w najczęściej używanych miejscach
- **Dlaczego ważne:** zakładki 38 px, `‹ ›` 37×39, `.btn.small` 28 px, ikony ✎/✕ ok. 29×28 obok siebie (ryzyko skasowania zamiast edycji). „Zakończ serię" ma 39 px, „Zakończ" jest małe w górnym rogu.
- **Fix:** minimum 44 px dla `.btn`, zakładek i ikon, główne akcje runnera na pełną szerokość (ok. 56 px), odstęp między ✎ i ✕.
- **Polecenie:** `/impeccable adapt`.

### [P1] Brak ekranu „Dziś" i wskazówek na start
- **Dlaczego ważne:** start treningu wymaga 3 tapnięć z pustej siatki miesiąca. Kropki nie mają legendy.
- **Fix:** karta „Dziś" na górze z dużym Start (lub „Wybierz plan"), krótki opis pustych stanów.
- **Polecenie:** `/impeccable shape`, potem `onboard`.

### [P2] Tożsamość wizualna generyczna i płaska hierarchia typografii
- **Dlaczego ważne:** wszystkie nagłówki mają podobną wagę i rozmiar. Emoji jako logo, pięć ciasnych zakładek na 375 px.
- **Fix:** autorska skala z prawdziwym kontrastem, mocna cyfra do liczników, pasek lub pierścień w runnerze cardio, rozważyć 4 zakładki. Zamienić lewy pasek `.card.cardio` na inny sygnał.
- **Polecenie:** `/impeccable typeset`, potem `bolder`.

### [P2] Zakładka Cardio to ściana formularza
- **Dlaczego ważne:** szablony leżą pod 10 kontrolkami (strona ok. 1041 px). Pola nazwy i daty ściśnięte (data ucięta do „10/1").
- **Fix:** szablony na górze, kreator schowany za „Nowy trening interwałowy", pola pełnej szerokości.
- **Polecenie:** `/impeccable distill`, potem `layout`.

## Obciążenie poznawcze

4 z 8 punktów niezaliczone (umiarkowane): brak pojedynczego fokusu i chunkingu na zakładce Cardio, płaska hierarchia poza runnerem, zbyt wiele wyborów na ekranie pracy (rep, −1, Zrobione N, Zakończ serię, waga, auto, pomiń).

## Ścieżka emocjonalna

- **Otwarcie:** pusty kalendarz bez wezwania do działania, chłodno i administracyjnie.
- **W trakcie:** duży pierścień i licznik dają poczucie celu, przerwa spokojna i czytelna.
- **Koniec:** „🎉 Trening zakończony" i zwykła lista, bez postępu (brak rekordów, porównania z ostatnim razem).
- **Cardio:** „Teraz: 30 s" i liczba, bez rozróżnienia pracy i odpoczynku, bez pierścienia.
- **Powrót:** dziennik to lista tekstowa, brak poczucia rosnącego nawyku.

## Persony

**Casey (rozproszony użytkownik mobilny):** „Zakończ" w górnym rogu (28 px) łatwo pomylić z zakończeniem serii, chroni tylko `confirm()`. Zakładki 38 px, ikony obok siebie. Brak potwierdzenia zapisu planu.

**Riley (tester skrajności):** szybkie tapnięcia mogą zgubić powtórzenia przez przebudowę nakładki. Auto-next kończy serię na celu, więc 10 powtórzeń przy celu 8 wymaga znalezienia przełącznika. Toast znika po 4 s. Waga ze śmieci cicho zamienia się na masę ciała.

**Siłownik w trakcie serii (spocone dłonie):** potrzebuje jednego dużego celu, a „Zakończ serię" i „−1" mają 39 px w środkowym rzędzie. Wagę zmieni tylko przez klawiaturę, hint ma 0,75 rem. Przycisk pauzy w cardio jest szary i łatwy do przeoczenia.

## Uwagi drobne

- `<title>` to „Dziennik treningowy", a nagłówek „Trening" (`index.html:7`).
- `theme-color` tylko dla ciemnego motywu.
- Pasek zakładek bez obsługi safe-area na dole.
- Brak `prefers-reduced-motion` przy animacji `cardio-flash`.
- Dziennik pokazuje tylko objętość, bez historii per ćwiczenie.
- `.impeccable/` nie jest w `.gitignore`.

## Pytania do rozważenia

1. Jeśli 90% użycia to runner, czemu pierwszym ekranem jest kalendarz?
2. Czy aplikacja jednoosobowa potrzebuje pięciu zakładek, czy całość to „Dziś / Plany / Dziennik"?
3. Jak wyglądałaby, gdyby była projektowana do czytania z drugiego końca sali, a nie z ręki?

## Rekomendowana kolejność

1. `/impeccable optimize`: runner bez przebudowy przy każdym tapnięciu.
2. `/impeccable adapt`: cele dotykowe ≥ 44 px, główne akcje runnera większe.
3. `/impeccable shape` + `onboard`: ekran „Dziś", legenda i puste stany.
4. `/impeccable typeset` + `bolder`: skala typografii i charakter.
5. `/impeccable distill` + `layout`: zakładka Cardio.
6. `/impeccable polish`: na koniec.
