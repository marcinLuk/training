# Nowy design Treningu: plan kierunku „Talerze"

Status: **tylko plan**, kod aplikacji nie był zmieniany. Data: 2026-10-17.
Podstawa: [PRODUCT.md](../PRODUCT.md), [krytyka UX](krytyka-ux-2026-10-17.md).
Zakres: cała aplikacja, nowy świat wizualny. Nic nie jest zachowane z obecnego wyglądu poza funkcjami i treścią.
Czego unikać (wybór użytkownika): wyglądu typowego trackera fitness, dekoracyjności kosztem czytelności, agresywnego/głośnego tonu, „zabawkowości".

## Scena użycia
Telefon w jednej ręce, jasna siłownia, spocone palce, odczyt z 1–2 m, czasem między seriami. Planowanie w domu na większym ekranie. Ta scena wymusza ogromne cyfry, wysoki kontrast, cele dotykowe ≥ 56 px w runnerze i brak dekoracji.

## Wybrany kierunek: „Talerze"
Źródło: kolory talerzy sztangi (system federacji IWF): 25 kg czerwony, 20 niebieski, 15 żółty, 10 zielony, 5 biały. Każdy na siłowni zna ten kod bez nauki.

**Teza.** Waga na sztandze jest kolorem i kształtem, nie tylko liczbą. Aplikacja odrzuca ogólny „ciemny tracker z neonowym akcentem" na rzecz języka, który istnieje na każdej siłowni.

### Co świat daje (i tylko to)
- **Paleta (z zadaniami):** pięć kolorów talerzy jako kolory wag i serii, osobny fiolet tylko dla cardio (talerze nie mają fioletu, więc kod siła/cardio zostaje jednoznaczny), kolor stanu błędu osobno.
- **Typografia:** rodzina Barlow (wywodzi się z oznakowania drogowego, ma polskie znaki). Barlow Condensed ciężki dla cyfr i liczników, Barlow Semi Condensed dla interfejsu. Skala ze stosunkiem co najmniej 1,33 między poziomami, cyfry tabelaryczne.
- **Gęstość:** duże, rzadkie ekrany w runnerze, zwarte listy w planach i dzienniku.
- **Ruch sygnaturowy: stos talerzy.** Każda waga jest rysowana jako sztanga z boku z talerzami we właściwych kolorach. Runner pokazuje, co założyć na każdą stronę sztangi (kalkulator talerzy). Masa ciała = bez sztangi, znacznik „masa ciała".

### Czego świat nie dotyka
Nawigacja i kontrolki pozostają standardowe (przyciski, zakładki, pola, listy). Stos talerzy nie zastępuje liczby, tylko ją uzupełnia (kolor nigdy nie jest jedynym nośnikiem informacji).

## Powłoka i ekrany

### Nawigacja
Dolny pasek 4 zakładek w zasięgu kciuka: **Dziś · Plany · Cardio · Dziennik**. „Ćwiczenia" przechodzą do Planów (biblioteka jako podsekcja). Cele ≥ 56 px, obsługa safe-area.

### Dziś (nowy pierwszy ekran, zastępuje samą siatkę miesiąca)
- Karta dzisiejszego treningu z nazwą planu, liczbą ćwiczeń, szacowanym czasem i wielkim przyciskiem **Start** (64 px). Gdy brak treningu: „Wybierz plan" i szybki start ostatniego.
- Pasek tygodnia (7 pól) zamiast kropek, z legendą: siła, cardio, zrobione.
- Pełny kalendarz miesiąca dostępny niżej lub po rozwinięciu.

### Runner siłowy
- Ogromny licznik powtórzeń (Barlow Condensed), pod nim waga ze stosem talerzy.
- Główny przycisk „Zakończ serię" na dole, pełna szerokość, 64 px. „−1" i **Cofnij ostatnią serię** w zasięgu kciuka.
- Podgląd poprzedniej serii i wyniku z ostatniego treningu.
- Waga zmieniana krokami (±2,5 kg przyciskami), bez klawiatury.
- Przerwa: pierścień zostaje, z następną serią, jej wagą i stosem talerzy.
- Wymaganie techniczne: aktualizacja liczników w miejscu zamiast przebudowy nakładki przy każdym tapnięciu.

### Cardio
- Najpierw zapisane szablony, kreator schowany za „Nowy trening interwałowy".
- Runner z wyraźnym rozróżnieniem pracy i odpoczynku i paskiem postępu interwału; pauza jako pełnoprawny, widoczny przycisk.
- Fiolet wyłącznie dla cardio.

### Plany, Ćwiczenia, Dziennik
- Karty bez lewego paska koloru (zamiast tego znacznik typu), ikony ✎/✕ rozdzielone i ≥ 44 px, destrukcyjne akcje poza zasięgiem przypadkowego tapnięcia.
- Dziennik: historia per ćwiczenie i ostatnia waga, żeby widać było postęp.

## Rzeczy do decyzji (otwarte)
1. **Motyw domyślny:** ciemna „guma" (talerze świecą jak przedmioty na czarnym żelazie) czy jasny „magnez" (lepszy w mocnym świetle siłowni). Rekomendacja: ciemny jako domyślny, jasny jako wariant. Rozstrzygnąć na komp.
2. **Kalkulator talerzy to nowa funkcja:** wymaga ustawień (waga gryfu, dostępne talerze). Domyślnie gryf 20 kg i komplet 25/20/15/10/5/2,5/1,25. Dla hantli i maszyn pokazujemy tylko pasek koloru wagi.
3. **Piktogramy ćwiczeń:** nie są potrzebne w tym kierunku; ruch sygnaturowy opiera się na talerzach.
4. **Ryzyko:** kolor niesie znaczenie wagi, więc musi współgrać z kolorami stanów (sukces/błąd) i nie może być jedynym nośnikiem (zawsze liczba obok).

## Plan realizacji (kolejność)
1. Komp ekranu „Dziś" i runnera w dwóch wariantach motywu, zatwierdzenie kierunku.
2. Tokeny i typografia (nowe zmienne CSS, Barlow serwowana lokalnie z `public/`, bez zewnętrznych CDN).
3. Powłoka: dolna nawigacja 4 zakładek, ekran „Dziś".
4. Runner siłowy: aktualizacja w miejscu, cofnięcie serii, stos talerzy, krok wagi.
5. Cardio: szablony na górze, runner z rozróżnieniem pracy i odpoczynku.
6. Plany, Ćwiczenia, Dziennik: cele dotykowe, rozdzielenie akcji, historia ćwiczeń.
7. Przegląd końcowy, `DESIGN.md` i zapis `.impeccable/design.json` z zbudowanego świata.

Mapowanie na polecenia Impeccable: `shape` (Dziś), `typeset`, `adapt`, `optimize` (runner), `distill` + `layout` (Cardio), `onboard` (puste stany i legenda), `polish`.

## Odrzucone kierunki
- **Igrzyska '72 (wylosowany):** jasny system pól koloru i piktogramów. Wymaga narysowania 20–30 piktogramów; nie wybrany.
- **Metro / kafle:** konkurencyjny pod względem czytelności, ale nawigacja panoramiczna to kostium. Pomysł do pożyczenia: duże pola koloru w runnerze.
- **Portfel biletowy:** dobry pomysł na stan serii (pieczątka „zaliczone"), ale papier to kostium.
- **Mapa orienteeringowa:** odrzucona; zasada do przejęcia: jedna warstwa „trasy" nad stałym tłem.
