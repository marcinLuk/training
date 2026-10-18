---
name: Trening
description: Kolory talerzy sztangi jako język wagi: ciemna „guma" lub jasny „magnez", kreda jako główna akcja, fiolet tylko dla cardio.
colors:
  ground: "#121314"
  surface: "#1b1c1e"
  surface-2: "#26272a"
  line: "#3a3c40"
  ink: "#f2f2ef"
  muted: "#a7aaaf"
  steel: "#8e929a"
  chalk: "#f2f2ef"
  on-chalk: "#121314"
  plate-25-red: "#d42d32"
  on-plate-25: "#ffffff"
  plate-20-blue: "#2f6fe0"
  on-plate-20: "#ffffff"
  plate-15-yellow: "#f2c230"
  on-plate-15: "#1a1500"
  plate-10-green: "#2fb35a"
  on-plate-10: "#07210f"
  plate-5-white: "#f2f2ef"
  on-plate-5: "#121314"
  cardio-violet: "#a98bf5"
  on-cardio: "#140d2b"
  danger: "#ff6b6b"
  focus: "#8ab4ff"
  ground-light: "#eceeef"
  surface-light: "#ffffff"
  surface-2-light: "#e2e5e7"
  line-light: "#c2c7cb"
  ink-light: "#14171a"
  muted-light: "#50565c"
  plate-25-red-light: "#c42429"
  plate-20-blue-light: "#1f5ccc"
  plate-15-yellow-light: "#e6ad00"
  plate-10-green-light: "#187a3a"
  cardio-violet-light: "#6a4bd0"
  danger-light: "#c4262e"
typography:
  counter:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "11rem"
    fontWeight: 800
    lineHeight: 0.82
    letterSpacing: "0"
    fontFeature: "tnum"
  figure:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "3.5rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0"
    fontFeature: "tnum"
  headline:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0"
  title:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.02em"
  body:
    fontFamily: "Barlow Semi Condensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "0"
  label:
    fontFamily: "Barlow Semi Condensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0"
rounded:
  sm: "6px"
  md: "10px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  3xl: "48px"
  4xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.chalk}"
    textColor: "{colors.on-chalk}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: "56px"
    padding: "0 24px"
  button-primary-large:
    backgroundColor: "{colors.chalk}"
    textColor: "{colors.on-chalk}"
    rounded: "{rounded.md}"
    height: "64px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "56px"
    padding: "0 24px"
  button-cardio:
    backgroundColor: "{colors.cardio-violet}"
    textColor: "{colors.on-cardio}"
    rounded: "{rounded.md}"
    height: "56px"
    padding: "0 24px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.danger}"
    rounded: "{rounded.md}"
    height: "56px"
    padding: "0 24px"
  input-field:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "56px"
    padding: "0 16px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "16px"
  weight-chip-20:
    backgroundColor: "{colors.plate-20-blue}"
    textColor: "{colors.on-plate-20}"
    rounded: "{rounded.sm}"
    padding: "3px 10px"
  tag-cardio:
    backgroundColor: "{colors.cardio-violet}"
    textColor: "{colors.on-cardio}"
    rounded: "{rounded.pill}"
    height: "32px"
    padding: "0 12px"
  tab-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    height: "64px"
---

<!-- SEED: system zdefiniowany z użytkownikiem i pokazany w documentation/system-design.html; aplikacja nadal używa starego wyglądu. Po wdrożeniu uruchom /impeccable document ponownie, żeby uzupełnić tokeny z kodu i sidecar .impeccable/design.json. -->

# Design System: Trening

## Overview

**Creative North Star: "Talerze"**

Waga na sztandze jest kolorem i kształtem, nie tylko liczbą. System pożycza język, który każdy na siłowni zna bez nauki: kody kolorów talerzy sztangi (25 kg czerwony, 20 niebieski, 15 żółty, 10 zielony, 5 biały). Wszystko inne jest neutralne i spokojne, żeby kolor niósł znaczenie, a nie dekorację.

Scena użycia wyznacza resztę: telefon w jednej ręce, jasna siłownia, spocone palce, odczyt z 1–2 m. Stąd ogromne, wąskie, ciężkie cyfry, wysoki kontrast, duże cele dotykowe i żadnej ozdoby, która nie pracuje. Ton jest rzeczowy i pewny, nie krzykliwy: bez gradientów, neonów, maskotek i emoji.

Dwa motywy należą do jednego systemu: ciemna „guma" (domyślna) i jasny „magnez". Wybór motywu domyślnego pozostaje do potwierdzenia w kompach.

**Key Characteristics:**
- Kolor niesie wagę i rodzaj treningu, nigdy nie jest samotnym nośnikiem informacji (zawsze liczba obok).
- Główna akcja jest „kredowa", nigdy w kolorze talerza.
- Jeden ruch sygnaturowy: stos talerzy rysowany z boku sztangi.
- Liczby są największym elementem ekranu w runnerze.
- Standardowe kontrolki, bez kostiumów.

## Colors

Paleta ma sześć zadań: pięć kolorów wag, jeden kolor cardio, neutralna skala trzech poziomów tła, kreda dla akcji, kolor błędu i kolor fokusu.

### Primary
- **Kreda** (#f2f2ef na gumie, #14171a na magnezie): główna akcja (Start, Zakończ serię), aktywna zakładka, wypełnione dni treningu siłowego. Tekst na kredzie to `on-chalk`.

### Secondary
- **Cardio fiolet** (#a98bf5 guma, #6a4bd0 magnez): wyłącznie trening cardio: znaczniki, pola dni, przycisk Start cardio, całe pole runnera cardio. Talerze nie mają fioletu, więc kod siła/cardio jest jednoznaczny.

### Tertiary (kolory wag)
- **Czerwień 25** (#d42d32): waga, której najcięższy talerz na stronę to 25 kg. Tekst biały.
- **Błękit 20** (#2f6fe0): 20 kg. Tekst biały.
- **Żółć 15** (#f2c230): 15 kg. Tekst ciemny.
- **Zieleń 10** (#2fb35a): 10 kg. Tekst ciemny.
- **Biel 5** (#f2f2ef): 5 kg. Tekst ciemny. Drobne talerze dziedziczą kolor „starszego brata": 2,5 kg czerwony, 1,25 kg biały.

### Neutral
- **Guma** (#121314): tło aplikacji.
- **Żelazo** (#1b1c1e): karty i powierzchnie.
- **Żelazo 2** (#26272a): pola formularzy, nieaktywne segmenty.
- **Linia** (#3a3c40): obramowania i separatory.
- **Tekst** (#f2f2ef) i **Tekst drugorzędny** (#a7aaaf, min. 4,5:1 na każdej powierzchni).
- **Stal** (#8e929a): sztanga, gryf, ikony drugorzędne.
- **Błąd** (#ff6b6b) i **Fokus** (#8ab4ff).
- Magnez (jasny): tło #eceeef, powierzchnia #ffffff, linia #c2c7cb, tekst #14171a, drugorzędny #50565c, wagi nieco ciemniejsze (czerwień #c42429, błękit #1f5ccc, żółć #e6ad00, zieleń #187a3a), cardio #6a4bd0.

### Named Rules
**The Weight-Only Rule.** Kolory talerzy znaczą wyłącznie wagę. Interfejs (przyciski, zakładki, stany) nigdy ich nie używa do niczego innego.

**The Chalk Rule.** Główna akcja jest w kolorze kredy, nie talerza. „Start" nie może udawać ciężaru.

**The One Violet Rule.** Fiolet należy tylko do cardio, w całej aplikacji.

**The Number Beside Rule.** Kolor wagi zawsze towarzyszy liczbie. Nigdy sam.

## Typography

**Display / Numerals Font:** Barlow Condensed (z fallbackiem Arial Narrow)
**Body Font:** Barlow Semi Condensed (z fallbackiem Arial Narrow, system-ui)

**Character:** Wąska i ciężka rodzina o rodowodzie oznakowania drogowego. Ma polskie znaki, czyta się z dwóch metrów i daje najwięcej cyfr na szerokość telefonu. Cyfry zawsze tabelaryczne, żeby licznik i czas nie „pływały". Czcionki mają być serwowane lokalnie z `public/`, nie z zewnętrznego CDN.

### Hierarchy
- **Counter** (800, 11rem, 0,82): licznik powtórzeń w runnerze, największy element aplikacji.
- **Figure** (800, 3,5rem, 1): czas przerwy, waga, czas cardio.
- **Headline** (800, 2,25rem, 1, wersaliki): tytuł ekranu, nazwa ćwiczenia w runnerze.
- **Title** (700, 1,375rem, 1,2, wersaliki, 0,02em): nagłówki kart i sekcji.
- **Body** (500, 1,0625rem, 1,5): treść i etykiety kontrolek. Linie nie dłuższe niż 65–75 znaków.
- **Label** (600, 0,8125rem): podpisy zakładek, drobne opisy, legenda.

Skala rośnie co najmniej 1,33 razy między poziomami: 0,8125 · 0,9375 · 1,0625 · 1,375 · 2,25 · 3,5 · 7 · 11 rem.

### Named Rules
**The Biggest Number Rule.** W runnerze liczba powtórzeń jest największym elementem ekranu, zawsze.

**The Tabular Rule.** Każda liczba zmieniająca się w czasie używa cyfr tabelarycznych.

## Layout

Układ jest mobile-first i jednokolumnowy. Główna nawigacja to dolny pasek czterech zakładek w zasięgu kciuka: Dziś, Plany, Cardio, Dziennik („Ćwiczenia" żyją w Planach). Pierwszy ekran „Dziś" pokazuje dzisiejszy trening z wielkim Start, a pod nim tydzień jako siedem pól koloru z legendą.

Skala odstępów co 4 px: 4, 8, 12, 16, 24, 32, 48, 64. Cele dotykowe: 44 px poza treningiem (zakładki, ikony, pola listy), 56 px w runnerze (−1, cofnij, krok wagi), 64 px dla głównej akcji (Start, Zakończ serię). Główna akcja runnera leży w dolnej części ekranu, w zasięgu kciuka. Na szerszych ekranach treść zostaje w wyśrodkowanej kolumnie, bez rozciągania.

### Named Rules
**The Thumb Rule.** Akcje używane w trakcie serii leżą w dolnej połowie ekranu.

## Elevation & Depth

System jest płaski, głębię daje warstwowanie tonalne: tło, powierzchnia, powierzchnia 2, rozdzielone cienką linią (1 px). Cienie nie niosą znaczenia. Jedyny wyjątek to ramka telefonu w podglądzie. Stany (wciśnięcie) są pokazywane przesunięciem o 1 px, nie cieniem.

### Named Rules
**The Flat Rule.** Powierzchnie są płaskie. Hierarchię buduje kontrast, rozmiar i ton, nie cień.

## Shapes

Zaokrąglenia są powściągliwe: 10 px dla przycisków, pól i kart, 6 px dla chipów wagi, pełna pigułka dla znaczników. Talerze w stosie to proste prostokąty o promieniu 3 px, z grubością i wysokością zależną od ciężaru (25–10 kg pełnej wysokości, 5 kg mniejszy, 2,5 i 1,25 kg najmniejsze). Ikony są rysowane jedną kreską 2 px z zaokrąglonymi zakończeniami. Brak lewych kolorowych pasków na kartach.

## Components

### Buttons
- **Shape:** zaokrąglenie 10 px, wysokość 56 px (duży: 64 px).
- **Primary:** kreda z tekstem `on-chalk`, tekst Body 700. Tylko jedna główna akcja na ekran.
- **Secondary:** przezroczysty z linią 2 px, tekst w kolorze tekstu.
- **Cardio:** fiolet z tekstem `on-cardio`, tylko w kontekście cardio.
- **Danger:** przezroczysty z obramowaniem i tekstem w kolorze błędu (np. „Zakończ trening").
- **Hover / Focus:** wciśnięcie przesuwa o 1 px; fokus to obrys 3 px w kolorze fokusu z odsunięciem 2 px. Nieaktywny: 40% krycia.

### Stos talerzy (komponent sygnaturowy)
- Sztanga z boku: gryf w kolorze stali, kołnierz i talerze jedna strona, w kolejności od najcięższego.
- Pokazuje, co założyć na jedną stronę (gryf 20 kg, talerze 25, 20, 15, 10, 5, 2,5, 1,25 kg). Obok zawsze tekst, np. „20 + 1,25 na stronę".
- Waga bez sztangi (masa ciała) pokazuje znacznik „masa ciała", bez grafiki. Poniżej 20 kg: „Poniżej wagi gryfu".
- Kolor wagi (chip) to kolor najcięższego talerza na stronę.

### Chips i znaczniki
- **Chip wagi:** kolor talerza z odpowiednim tekstem, cyfry Barlow Condensed 800, promień 6 px.
- **Znacznik typu:** „Siła" w neutralnym tle, „Cardio" w fiolecie, „Masa ciała" jako obrys. Pigułka 32 px wysokości.

### Cards / Containers
- **Corner Style:** 10 px.
- **Background:** powierzchnia (#1b1c1e) z obramowaniem 1 px w kolorze linii.
- **Shadow Strategy:** brak, patrz Elevation & Depth.
- **Internal Padding:** 16–20 px.

### Inputs / Fields
- **Style:** tło powierzchnia 2, obramowanie 2 px w kolorze linii, promień 10 px, wysokość 56 px, cyfry Barlow Condensed 700.
- **Krok wagi:** pole z przyciskami −/+ (56 px) zmieniającymi o 2,5 kg, bez konieczności klawiatury.
- **Focus:** obramowanie w kolorze fokusu.
- **Error:** komunikat w toaście z kolorem błędu, ikona ostrzeżenia, treść nazywa problem i sposób naprawy.

### Navigation
- Dolny pasek czterech zakładek, wysokość 64 px, ikona 26 px i podpis Label. Aktywna zakładka: tekst w kolorze tekstu i kreska 3 px u góry (kreda, a dla Cardio fiolet). Nieaktywne w kolorze drugorzędnym. Safe-area na dole.

### Tydzień (kalendarz)
- Siedem pól dni: wypełnione kredą to trening siłowy zrobiony, wypełnione fioletem to cardio, obrys to planowane, dzisiejszy dzień z obrysem 2 px. Pod spodem legenda trzech stanów.

### Runner (ekrany sesji)
- **Siła:** licznik Counter na środku, pod nim waga ze stosem talerzy, na dole „−1" i „Cofnij serię" (56 px) oraz „Zakończ serię" (64 px). Aktualizacje liczników w miejscu, bez przebudowy całego ekranu.
- **Przerwa:** pierścień czasu z liczbą w środku, następna seria z wagą i stosem, „−15 s", „+15 s", „Gotowy, zaczynam".
- **Cardio:** całe pole w fiolecie, słowo fazy („Praca" / „Odpoczynek") i duży zegar, pasek postępu interwału i oś czasu segmentów, „Pauza" jako pełny przycisk.

## Do's and Don'ts

### Do:
- **Do** używać koloru talerza wyłącznie dla wagi i zawsze z liczbą obok.
- **Do** dawać głównej akcji kolor kredy (#f2f2ef / #14171a) i jedną na ekran.
- **Do** utrzymywać kontrast tekstu co najmniej 4,5:1 (3:1 dla dużego) w obu motywach.
- **Do** trzymać cele dotykowe w runnerze na 56 px, a główną akcję na 64 px, w dolnej połowie ekranu.
- **Do** używać cyfr tabelarycznych dla liczników i czasu.
- **Do** rozdzielać edycję i usuwanie szerokim odstępem, by nie pomylić ich spoconym kciukiem.
- **Do** rysować ikony jedną kreską 2 px z zaokrąglonymi zakończeniami.

### Don't:
- **Don't** używać kolorów talerzy do stanów interfejsu, przycisków ani dekoracji.
- **Don't** używać fioletu poza cardio.
- **Don't** dodawać gradientów, neonowych poświat, cieni jako ozdoby ani zaokrąglonych „kart z ikoną" jako struktury strony. Aplikacja nie ma wyglądać jak typowy tracker fitness.
- **Don't** stosować kolorowego paska po lewej stronie karty (`border-left` powyżej 1 px).
- **Don't** używać emoji ani znaków Unicode jako ikon, ani maskotek i konfetti. Ton jest rzeczowy, nie zabawkowy ani agresywny.
- **Don't** przebudowywać całego ekranu runnera przy każdym tapnięciu.
- **Don't** polegać wyłącznie na kolorze do przekazania wagi, stanu ani typu treningu.
