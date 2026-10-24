---
name: Trening
description: Ciemna „guma" lub jasny „magnez", kreda jako jedyna główna akcja, ogromne wąskie cyfry. Fiolet znaczy tylko cardio. Kolory talerzy sztangi zarezerwowane na przyszły ciężar.
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
  cardio: "#a98bf5"
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
  danger-light: "#c4262e"
typography:
  counter:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "11rem"
    fontWeight: 800
    lineHeight: 0.82
    letterSpacing: "0"
    fontFeature: "tnum"
  clock:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "9rem"
    fontWeight: 800
    lineHeight: 0.85
    letterSpacing: "0"
    fontFeature: "tnum"
  phase:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "3rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0"
  meta:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.2
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
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.danger}"
    rounded: "{rounded.md}"
    height: "56px"
    padding: "0 24px"
  button-cardio-main:
    backgroundColor: "{colors.on-cardio}"
    textColor: "{colors.cardio}"
    rounded: "{rounded.md}"
    height: "64px"
  button-cardio-outline:
    backgroundColor: "transparent"
    textColor: "{colors.on-cardio}"
    rounded: "{rounded.md}"
    height: "56px"
    padding: "0 24px"
  tag-cardio:
    backgroundColor: "{colors.cardio}"
    textColor: "{colors.on-cardio}"
    rounded: "{rounded.pill}"
  tag-strength:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
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
---

<!-- Zakres: MVP z context/foundation/prd.md oraz moduł cardio z context/foundation/prd-v2.md. System zawężono do planów, runnera siły i sesji cardio: bez kalendarza, dziennika, wag i dolnego paska zakładek. Elementy zarezerwowane są oznaczone „po MVP". Ekran sesji cardio, kolor cardio i znaczniki pochodzą z podglądu documentation/system-design.html (sekcja „Ekrany", rysunek „Cardio"). Edytor cardio, tryb blokady, odliczanie startu, pauza i wybór typu planu nie mają rysunku w podglądzie; opis poniżej to decyzje autora z 2026-10-24. Po wdrożeniu uruchom /impeccable document ponownie, żeby uzupełnić tokeny z kodu i sidecar .impeccable/design.json. -->

# Design System: Trening

## Overview

**Creative North Star: "Talerze"**

Siła tego systemu to czytelność z dwóch metrów. Po przerwie jedno spojrzenie ma pokazać: gdzie jestem, ile serii zostało, co dalej. Nazwa „Talerze" pochodzi z języka siłowni: kody kolorów talerzy sztangi (25 kg czerwony, 20 niebieski, 15 żółty, 10 zielony, 5 biały). W MVP plan nie ma ciężaru, więc kolory talerzy czekają w rezerwie. Zostaje reszta charakteru: ciężkie, wąskie cyfry, neutralne tło, kolor tylko tam, gdzie niesie znaczenie.

Scena użycia wyznacza resztę: telefon w jednej ręce lub oparty obok, spocone palce, odczyt z 1–2 m, często ze słuchawkami. Stąd ogromne cyfry, wysoki kontrast, duże cele dotykowe i żadnej ozdoby, która nie pracuje. Ton jest rzeczowy i pewny, nie krzykliwy: bez gradientów, neonów, maskotek i emoji. Ekran treningu nie ma się niczym rozpraszać, bo wydłużona przerwa to porażka produktu.

MVP ma jeden motyw: ciemną „gumę" (decyzja autora). Jasny „magnez" zostaje w systemie jako zarezerwowany wariant na później. Nie buduj go ani nie przełączaj motywu według `prefers-color-scheme`.

Cardio to drugi tryb treningu: interwały zamiast serii. Telefon często leży w kieszeni, więc sesja cardio mówi dźwiękiem, a ekran jest tylko potwierdzeniem: całe pole w fiolecie, ogromny zegar, słowo „PRACA" albo „ODPOCZYNEK" i oś czasu.

**Key Characteristics:**
- Stan treningu czyta się bez dotykania telefonu: liczba serii do końca jest największym elementem ekranu serii, a w cardio czas do końca interwału.
- Główna akcja jest „kredowa", jedna na ekran.
- Koniec przerwy to zmiana całego ekranu i dźwięk, nigdy sam dźwięk.
- Kolor niesie znaczenie, nigdy nie jest samotnym nośnikiem informacji.
- Standardowe kontrolki, bez kostiumów.

## Colors

Paleta ma pięć zadań: neutralna skala trzech poziomów tła, kreda dla akcji, fiolet dla cardio, kolor błędu i kolor fokusu. Kolory talerzy są zarezerwowane.

### Cardio
- **Fiolet** (#a98bf5) z tekstem **on-cardio** (#140d2b): pole całego ekranu sesji cardio i znacznik „Cardio" na liście planów. Talerze nie mają fioletu, więc kod siła/cardio jest jednoznaczny. Nigdzie indziej fiolet nie występuje.
- Na polu fioletu: tor paska i nieaktywne segmenty osi czasu to `rgba(0,0,0,.18)`–`rgba(0,0,0,.2)` (przyciemnienie fioletu, nie nowy kolor), wypełnienie i segmenty pracy to on-cardio.

### Primary
- **Kreda** (#f2f2ef na gumie, #14171a na magnezie): główna akcja (Start, Gotowe), aktywne elementy, pierścień przerwy. Tekst na kredzie to `on-chalk`.

### Reserved (po MVP): kolory wag
Plan w MVP nie ma pola ciężaru, więc te kolory nie występują w interfejsie. Tokeny zostają w systemie na dodanie ciężaru.
- **Czerwień 25** (#d42d32), **Błękit 20** (#2f6fe0), **Żółć 15** (#f2c230), **Zieleń 10** (#2fb35a), **Biel 5** (#f2f2ef). Drobne talerze dziedziczą kolor „starszego brata": 2,5 kg czerwony, 1,25 kg biały.

### Neutral
- **Guma** (#121314): tło aplikacji.
- **Żelazo** (#1b1c1e): karty i powierzchnie.
- **Żelazo 2** (#26272a): pola formularzy, nieaktywne segmenty.
- **Linia** (#3a3c40): obramowania i separatory.
- **Tekst** (#f2f2ef) i **Tekst drugorzędny** (#a7aaaf, min. 4,5:1 na każdej powierzchni).
- **Stal** (#8e929a): ikony drugorzędne.
- **Błąd** (#ff6b6b) i **Fokus** (#8ab4ff).
- Magnez (jasny): tło #eceeef, powierzchnia #ffffff, linia #c2c7cb, tekst #14171a, drugorzędny #50565c.

### Named Rules
**The Chalk Rule.** Główna akcja jest w kolorze kredy i jest jedna na ekran. Nigdy w kolorze talerza ani w kolorze błędu. Jedyny wyjątek to ekran sesji cardio (pole fioletu): tam główna akcja „Pauza"/„Wznów" jest w kolorze on-cardio z tekstem w fiolecie, i też jest jedna.

**The Violet Rule.** Fiolet znaczy wyłącznie cardio: pole sesji cardio i znacznik „Cardio". Nigdy nie jest kolorem przycisku na liście, akcentem ani ozdobą.

**The Weight-Only Rule.** Gdy ciężar wejdzie do aplikacji, kolory talerzy znaczą wyłącznie wagę. Interfejs nigdy ich nie używa do niczego innego.

**The Number Beside Rule.** Kolor zawsze towarzyszy liczbie lub słowu. Nigdy sam.

## Typography

**Display / Numerals Font:** Barlow Condensed (z fallbackiem Arial Narrow)
**Body Font:** Barlow Semi Condensed (z fallbackiem Arial Narrow, system-ui)

**Character:** Wąska i ciężka rodzina o rodowodzie oznakowania drogowego. Ma polskie znaki, czyta się z dwóch metrów i daje najwięcej cyfr na szerokość telefonu. Cyfry zawsze tabelaryczne, żeby licznik i czas nie „pływały". Czcionki mają być serwowane lokalnie z `public/`, nie z zewnętrznego CDN.

### Hierarchy
- **Counter** (800, 11rem, 0,82): liczba pozostałych serii w widoku serii, największy element aplikacji.
- **Clock** (800, 9rem, 0,85): czas do końca interwału w sesji cardio, największy element ekranu cardio. Mniejszy od Counter, bo „12:30" musi się zmieścić w szerokości telefonu.
- **Phase** (800, 3rem, 1, wersaliki): słowo fazy w sesji cardio („PRACA", „ODPOCZYNEK", „PRZYGOTUJ SIĘ", „PAUZA").
- **Meta** (Barlow Condensed 700, 1,125rem, wersaliki, cyfry tabelaryczne): wiersze informacji na polu cardio („Interwał 3 z 8", „Razem 3:10", „Zostało 4:50").
- **Figure** (800, 3,5rem, 1): powtórzenia w widoku serii, czas przerwy.
- **Headline** (800, 2,25rem, 1, wersaliki): tytuł ekranu, nazwa ćwiczenia w treningu.
- **Title** (700, 1,375rem, 1,2, wersaliki, 0,02em): nagłówki kart i sekcji.
- **Body** (500, 1,0625rem, 1,5): treść i etykiety kontrolek. Linie nie dłuższe niż 65–75 znaków.
- **Label** (600, 0,8125rem): podpisy zakładek, drobne opisy, legenda.

Skala rośnie co najmniej 1,33 razy między poziomami: 0,8125 · 0,9375 · 1,0625 · 1,375 · 2,25 · 3,5 · 7 · 11 rem. Trzy rozmiary ekranu cardio (Meta 1,125, Phase 3, Clock 9 rem) pochodzą z podglądu i są używane tylko na polu cardio.

### Named Rules
**The Biggest Number Rule.** W widoku serii liczba pozostałych serii jest największym elementem ekranu, zawsze. W przerwie jest nim czas. W sesji cardio jest nim czas do końca interwału (Clock).

**The Tabular Rule.** Każda liczba zmieniająca się w czasie używa cyfr tabelarycznych.

## Layout

Układ jest mobile-first i jednokolumnowy. Nie ma dolnego paska zakładek: aplikacja ma dwa tryby. Poza treningiem to lista planów (Start przy każdym planie, „Nowy plan") i edytor planu (siłowy albo cardio). W treningu ekran należy w całości do treningu, bez nawigacji, która kusiłaby do wyjścia. Sesja cardio wypełnia cały ekran polem fioletu, od krawędzi do krawędzi, bez karty i bez zaokrągleń pola.

Skala odstępów co 4 px: 4, 8, 12, 16, 24, 32, 48, 64. Cele dotykowe: 44 px poza treningiem (pola listy, ikony), 56 px w treningu (cofnij, pomiń, ±15 s), 64 px dla głównej akcji (Start, Gotowe). Główna akcja treningu leży w dolnej części ekranu, w zasięgu kciuka. Na szerszych ekranach treść zostaje w wyśrodkowanej kolumnie, bez rozciągania. Edytor ćwiczenia ma sensowne wartości domyślne, by cztery pola nie tworzyły długiego formularza.

### Named Rules
**The Thumb Rule.** Akcje używane w trakcie treningu leżą w dolnej połowie ekranu.

## Elevation & Depth

System jest płaski, głębię daje warstwowanie tonalne: tło, powierzchnia, powierzchnia 2, rozdzielone cienką linią (1 px). Cienie nie niosą znaczenia. Jedyny wyjątek to ramka telefonu w podglądzie. Stany (wciśnięcie) są pokazywane przesunięciem o 1 px, nie cieniem.

### Named Rules
**The Flat Rule.** Powierzchnie są płaskie. Hierarchię buduje kontrast, rozmiar i ton, nie cień.

## Shapes

Zaokrąglenia są powściągliwe: 10 px dla przycisków, pól i kart, 6 px dla chipów, pełna pigułka dla znaczników. Ikony są rysowane jedną kreską 2 px z zaokrąglonymi zakończeniami. Brak lewych kolorowych pasków na kartach.

## Components

### Buttons
- **Shape:** zaokrąglenie 10 px, wysokość 56 px (duży: 64 px).
- **Primary:** kreda z tekstem `on-chalk`, tekst Body 700. Tylko jedna główna akcja na ekran.
- **Secondary:** przezroczysty z linią 2 px, tekst w kolorze tekstu.
- **Danger:** przezroczysty z obramowaniem i tekstem w kolorze błędu (np. „Zakończ trening", „Usuń plan"). Leży daleko od akcji głównej.
- **Przesuń ćwiczenie:** w nagłówku karty ćwiczenia w edytorze planu są dwa przyciski ikonowe, drugorzędne (nigdy kredowe), 44 px na 44 px. Nazwy dostępne to „Przesuń ćwiczenie N w górę" i „Przesuń ćwiczenie N w dół", gdzie N to bieżąca pozycja. Ikony to szewrony rysowane kreską 2 px z zaokrąglonymi zakończeniami (SVG), nigdy znaki Unicode. Na brzegu listy przycisk jest nieaktywny (40% krycia).
- **Hover / Focus:** wciśnięcie przesuwa o 1 px; fokus to obrys 3 px w kolorze fokusu z odsunięciem 2 px. Nieaktywny: 40% krycia.

### Cards / Containers
- **Corner Style:** 10 px.
- **Background:** powierzchnia (#1b1c1e) z obramowaniem 1 px w kolorze linii.
- **Shadow Strategy:** brak, patrz Elevation & Depth.
- **Internal Padding:** 16–20 px.
- Karta planu: nazwa, podsumowanie („5 ćwiczeń, 18 serii"), Start jako główna akcja, edycja i usuwanie rozdzielone szerokim odstępem.
- Karta planu ma przyciski „Edytuj" (drugorzędny) i „Usuń plan" (Danger), z nazwą planu w nazwie dostępnej. „Usuń plan" otwiera w aplikacji pytanie „Usunąć plan „nazwa"?" z przyciskami „Anuluj" (drugorzędny) i „Usuń plan" (Danger), bez przycisku kredowego. Pierwsze 0,5 s po otwarciu pytania „Usuń plan" nie działa, by przypadkowe podwójne dotknięcie nie usunęło planu. Nieudane usunięcie pokazuje komunikat błędu na liście i nic nie zmienia.
- Lista planów bez planów: „Nie masz jeszcze planów. Dodaj pierwszy plan, a potem uruchom trening." Bez planów „Nowy plan" jest główną akcją listy. Gdy są plany, główną akcją są przyciski Start na kartach, a „Nowy plan" jest akcją drugorzędną.
- **Znacznik typu:** każda karta planu ma obok nazwy znacznik w kształcie pigułki (Label 600, min. wysokość 24 px): „Siła" (powierzchnia 2, tekst w kolorze tekstu) albo „Cardio" (fiolet, tekst on-cardio). Znacznik zawsze ma słowo, nigdy sam kolor. Start na karcie cardio jest kredowy, jak każdy Start na liście.
- Podsumowanie karty cardio: liczba interwałów po powtórzeniach i łączny czas, np. „16 interwałów, 8:00".
- **Wybór typu nowego planu:** „Nowy plan" otwiera w aplikacji pytanie „Jaki plan?" z przyciskami „Siła" i „Cardio" (oba drugorzędne, 56 px) oraz „Anuluj". Wybór otwiera odpowiedni edytor.

### Inputs / Fields
- **Style:** tło powierzchnia 2, obramowanie 2 px w kolorze linii, promień 10 px, wysokość 56 px, cyfry Barlow Condensed 700.
- **Krok liczby:** pole serii, powtórzeń i przerwy z przyciskami −/+ (56 px), bez konieczności klawiatury. Przerwa zmienia się co 15 s.
- **Focus:** obramowanie w kolorze fokusu.
- **Error:** komunikat z kolorem błędu i ikoną ostrzeżenia, treść nazywa problem i sposób naprawy.
- **Przesuwanie ćwiczeń w edytorze planu:** nagłówek karty ćwiczenia ma po lewej tytuł „Ćwiczenie N", a po prawej przyciski „Przesuń ćwiczenie N w górę" i „Przesuń ćwiczenie N w dół" (44 px, drugorzędne, ikony szewronów SVG). Dotknięcie zamienia ćwiczenie z sąsiadem, a numery w tytułach liczą się od nowa. „W górę" przy pierwszym i „w dół" przy ostatnim ćwiczeniu są nieaktywne. Po przesunięciu fokus zostaje na tym samym przycisku przesuniętego ćwiczenia, a gdy ten przycisk stał się nieaktywny, przechodzi na drugi przycisk tego ćwiczenia. Przesunięcie czyści komunikaty błędów walidacji. Zapisany plan trzyma nową kolejność.
- **Zwinięta karta ćwiczenia:** tytuł „Ćwiczenie N” jest przyciskiem w nagłówku karty (min. 44 px wysokości, wypełnia miejsce po lewej od przycisków przesuwania) z ikoną szewronu rysowaną kreską 2 px (SVG, kolor drugorzędny) i atrybutem `aria-expanded`. Dotknięcie zwija lub otwiera kartę, bez animacji. Karta zwinięta to jeden zwarty blok: nagłówek z przyciskami przesuwania, nazwa ćwiczenia (tylko gdy nie jest pusta) i podsumowanie w kolorze drugorzędnym, np. „3 × 10, przerwa 1:30”. Pole nazwy, kroki liczb i „Usuń ćwiczenie” są wtedy ukryte. Przyciski przesuwania działają w obu stanach. Stan zwinięcia idzie za ćwiczeniem po przesunięciu i nie jest zapisywany z planem. Domyślnie: nowy plan ma pierwsze ćwiczenie otwarte, „Dodaj ćwiczenie” dodaje ćwiczenie otwarte, „Edytuj plan” otwiera wszystkie karty zwinięte. Nieudany zapis otwiera każdą kartę z błędem, by tekst błędu był widoczny.
- **Edytor planu:** napisy „Nazwa planu", „Nazwa ćwiczenia", „Serie", „Powtórzenia", „Przerwa", przyciski „Dodaj ćwiczenie", „Usuń ćwiczenie", „Zapisz plan" (główna), „Anuluj"; nowy plan startuje z jednym ćwiczeniem. Edycja istniejącego planu używa tego samego ekranu z tytułem „Edytuj plan" i zapisuje plan pod tym samym identyfikatorem; „Anuluj" nie zmienia zapisanego planu. Nieudany zapis pokazuje komunikat „Nie udało się zapisać planu…" i zostawia wpisane dane na ekranie.

### Edytor planu cardio
- Ten sam ekran i te same karty co edytor siły (powierzchnia, promień 10 px, kroki liczb 56 px). Tytuł „Nowy plan cardio" albo „Edytuj plan cardio". Pole „Nazwa planu" na górze.
- Plan to lista bloków. Karta bloku ma tytuł „Blok N", krok liczby „Powtórz" (× 1 do × 20; × 1 znaczy raz) i listę interwałów. Przyciski: „Dodaj interwał" (w bloku), „Usuń blok" (Danger, daleko od „Dodaj interwał"), pod blokami „Dodaj blok".
- Interwał w bloku ma tytuł „Interwał N", przełącznik typu z dwoma przyciskami „Praca" i „Odpoczynek" (56 px, oba drugorzędne; wybrany ma tło powierzchni 2, obrys 2 px w kolorze tekstu, tekst 700 i `aria-pressed="true"`, nigdy tło kredy, bo kreda należy do „Zapisz plan"), pole „Nazwa interwału" i krok „Czas" (co 5 s, od 0:05 do 60:00, pokazany jako m:ss). Przycisk „Usuń interwał" jest drugorzędny i leży daleko od kroku czasu.
- Nazwa interwału startuje jako słowo typu („Praca" albo „Odpoczynek"), więc nie trzeba jej pisać. Zmiana typu zmienia też nazwę, jeśli nazwa wciąż jest słowem poprzedniego typu.
- Nowy plan cardio startuje z jednym blokiem „Powtórz × 8" z interwałami „Praca 0:30" i „Odpoczynek 0:30".
- „Zapisz plan" (kreda) i „Anuluj" jak w edytorze siły; te same zasady błędów: komunikat nazywa problem i sposób naprawy, nieudany zapis zostawia dane na ekranie.

### Widok serii (ekran treningu)
- Od góry: nazwa ćwiczenia (Headline), powtórzenia (Figure), pod nimi Counter z liczbą pozostałych serii i podpisem „serii zostało". Niżej wiersz „Dalej:" z nazwą następnego ćwiczenia (Title, kolor drugorzędny). Na dole „Gotowe" (64 px, kreda), a nad nim „Cofnij" i „Pomiń serię" (56 px).
- Każde dotknięcie aktualizuje liczby w miejscu, bez przebudowy ekranu.
- Ostatnia seria ćwiczenia pokazuje „Dalej:" z następnym ćwiczeniem, ostatnie ćwiczenie pokazuje „To ostatnie ćwiczenie", a ostatnia seria planu pokazuje „To ostatnia seria".

### Przerwa
- Pierścień czasu z Figure w środku. Czas wynika z zapisanego znacznika startu. Pod spodem „Dalej:" z następną serią i ćwiczeniem. „−15 s" i „+15 s" (56 px), „Gotowy, zaczynam" (64 px, kreda) kończy przerwę wcześniej.
- Widok przerwy ma też „Cofnij" (56 px, drugorzędny) nad „Gotowy, zaczynam". Cofa serię, która rozpoczęła przerwę.
- Koniec przerwy: dźwięk i zmiana całego ekranu na widok następnej serii. Dźwięk nigdy nie jest jedynym sygnałem.
- Zielone podświetlenia, konfetti i animacje świętowania są zabronione. Przerwa ma być krótka.

### Ekran końca
- Nazwa planu, krótkie „Koniec treningu" i jedna główna akcja „Wróć do planów". Bez historii i statystyk. Bez gratulacji w stylu gry.

### Wznowienie treningu
- Po powrocie z blokady, innej aplikacji lub przeładowania ekran od razu pokazuje to samo miejsce i ten sam stan przerwy, w mniej niż 3 s. Wygasły trening (po czasie bezczynności) pokazuje krótką informację i wraca do listy planów. Treść informacji: „Trening wygasł po 2 godzinach bez dotknięcia." Znika, gdy użytkownik uruchomi trening lub otworzy edytor planu.
- „Zakończ trening" (Danger, 56 px) leży u góry widoku serii i przerwy, daleko od akcji głównej. Dotknięcie otwiera w aplikacji pytanie „Zakończyć trening?" z przyciskami „Wróć do treningu" (drugorzędny) i „Zakończ trening" (Danger), bez przycisku kredowego. Potwierdzenie usuwa trening i otwiera listę planów; „Wróć do treningu" zostawia trening bez zmian.

### Sesja cardio
- Całe pole w fiolecie (tło `cardio`, tekst `on-cardio`), odstęp wewnętrzny 20 px u góry i 16 px po bokach i na dole, elementy co 14 px. Od góry:
  1. Wiersz Meta: po lewej nazwa planu, po prawej „Interwał X z Y" (Y liczy interwały po powtórzeniach).
  2. Phase: „PRACA" albo „ODPOCZYNEK" (typ bieżącego interwału). Pod nim nazwa interwału (Title), tylko gdy różni się od słowa typu.
  3. Clock: czas do końca interwału, m:ss, wyśrodkowany. Czas wynika z zapisanego znacznika startu, nigdy z tyknięć.
  4. Pasek bieżącego interwału: wysokość 14 px, promień 7 px, tor przyciemniony, wypełnienie on-cardio rośnie z upływem interwału. Bez animacji przejścia przy `prefers-reduced-motion`.
  5. Oś czasu: jeden segment na każdy interwał po powtórzeniach, wysokość 36 px, odstęp 4 px (2 px, gdy segmentów jest ponad 24), promień 4 px. Praca: wypełniony on-cardio. Odpoczynek: przyciemniony. Bieżący: obrys 3 px on-cardio z odsunięciem 2 px. Oś ma nazwę dostępną „Przebieg".
  6. „Dalej: <nazwa> · <m:ss>" (Title) z następnym interwałem; przy ostatnim interwale „To ostatni interwał".
  7. Wiersz Meta: „Razem m:ss" (czas sesji bez odliczania startu i bez pauz) po lewej, „Zostało m:ss" (do końca sesji) po prawej.
  8. Na dole, w zasięgu kciuka: „Pauza" (64 px, pełna szerokość, tło on-cardio, tekst fiolet), pod nim rząd dwóch przycisków 56 px z obrysem on-cardio: „Zablokuj" i „Zakończ".
- **Odliczanie startu:** po Start sesja zaczyna się od 3 s odliczania na tym samym polu: Phase „PRZYGOTUJ SIĘ", Clock liczy 0:03 → 0:00, „Dalej:" pokazuje pierwszy interwał, oś czasu nie ma bieżącego segmentu.
- **Pauza:** Phase „PAUZA", Clock i pasek stoją, „Pauza" zmienia się w „Wznów" (to samo miejsce, ten sam wygląd). Wznowienie liczy dalej od zatrzymanego miejsca.
- **Dźwięk:** trzy krótkie piknięcia na 3, 2 i 1 s przed końcem każdego interwału (interwał krótszy niż 4 s nie ma odliczania), potem na 0 dźwięk startu pracy albo startu odpoczynku; te dwa dźwięki muszą się wyraźnie różnić. Koniec ostatniego interwału ma dźwięk startu odpoczynku. Zmiana interwału zawsze zmienia też ekran (Phase, Clock, oś); dźwięk nigdy nie jest jedynym sygnałem. Dźwięk gra tylko, gdy strona jest widoczna i najwyżej 2 s po czasie, tak jak koniec przerwy w sile.
- **Tryb blokady:** „Zablokuj" zamienia „Pauza", „Zablokuj" i „Zakończ" na jeden pasek „Przytrzymaj, aby odblokować" (64 px, pełna szerokość, obrys 2 px on-cardio, ikona kłódki rysowana kreską 2 px). Wiersz Meta u góry pokazuje wtedy po lewej „Ekran zablokowany" zamiast nazwy planu. Odblokowanie wymaga przytrzymania paska przez 2 s: wypełnienie on-cardio rośnie od lewej; puszczenie wcześniej cofa je do zera. Przy `prefers-reduced-motion` zamiast wypełnienia pasek pokazuje tekst „Trzymaj… 1", „Trzymaj… 2". Przy zablokowanym ekranie zwykłe dotknięcia nic nie robią. Sesja w blokadzie biegnie dalej. Przeładowanie strony zdejmuje blokadę.
- **Zakończ:** otwiera to samo pytanie co w sile: „Zakończyć trening?" z „Wróć do treningu" (drugorzędny) i „Zakończ trening" (Danger). Sesja biegnie w tle pytania.
- **Koniec sesji:** po ostatnim interwale ekran końca z nazwą planu i „Wróć do planów", tak jak w sile.
- **Wznowienie:** po blokadzie telefonu albo zmianie aplikacji sesja biegnie dalej i od razu pokazuje właściwy interwał i czas. Po przeładowaniu sesja wraca w stanie pauzy na bieżącym interwale. Sesja w pauzie dłużej niż 2 godziny wygasa z tą samą informacją co trening siłowy. Sesja, która w czasie nieobecności doszła do końca, pokazuje ekran końca.
- Bez konfetti, bez gradientów, bez animacji świętowania, bez wibracji.

### Ikona aplikacji
- Jedna ikona: sztanga z `public/favicon.svg` (kreda `#f2f2ef` na gumie `#121314`). Bez tekstu, bez gradientu, bez talerzy w kolorach wag i bez innego stylu ikony.
- Ikony `any` (192 i 512 px) mają zaokrąglony kwadrat jak `favicon.svg`. Ikona `maskable` (512 px) wypełnia cały kwadrat gumą, bez zaokrągleń i bez przezroczystego brzegu. Sztanga mieści się w środkowym kole o średnicy 80% szerokości, bo Android przycina ikonę do własnego kształtu.
- Kolor tła i kolor motywu w manifeście to guma `#121314`, tak samo jak `theme-color` w `index.html`.
- Pliki PNG powstają raz ze źródeł SVG (`scripts/icons/make-icons.sh`) i trafiają do repozytorium. Build ich nie tworzy.

### Po MVP (zarezerwowane)
- **Stos talerzy:** sztanga z boku z talerzami w kolorach wag. Wejdzie razem z polem ciężaru. Obok zawsze tekst, np. „20 + 1,25 na stronę".
- **Chip wagi:** kolor najcięższego talerza na stronę, zawsze z liczbą.

## Do's and Don'ts

### Do:
- **Do** dawać głównej akcji kolor kredy (#f2f2ef / #14171a) i jedną na ekran.
- **Do** pokazywać na ekranie serii zawsze trzy rzeczy: ćwiczenie, powtórzenia i serie do końca, plus „Dalej:".
- **Do** utrzymywać kontrast tekstu co najmniej 4,5:1 (3:1 dla dużego) w obu motywach.
- **Do** trzymać cele dotykowe w treningu na 56 px, a główną akcję na 64 px, w dolnej połowie ekranu.
- **Do** używać cyfr tabelarycznych dla liczników i czasu.
- **Do** rozdzielać edycję i usuwanie szerokim odstępem, by nie pomylić ich spoconym kciukiem.
- **Do** rysować ikony jedną kreską 2 px z zaokrąglonymi zakończeniami.
- **Do** szanować `prefers-reduced-motion`.

### Don't:
- **Don't** używać kolorów talerzy w MVP. Czekają na ciężar.
- **Don't** używać fioletu poza polem sesji cardio i znacznikiem „Cardio".
- **Don't** dodawać gradientów, neonowych poświat, cieni jako ozdoby ani zaokrąglonych „kart z ikoną" jako struktury strony. Aplikacja nie ma wyglądać jak typowy tracker fitness.
- **Don't** stosować kolorowego paska po lewej stronie karty (`border-left` powyżej 1 px).
- **Don't** używać emoji ani znaków Unicode jako ikon, ani maskotek i konfetti.
- **Don't** dodawać elementów, które wydłużają przerwę: powiadomień, reklam, feedu, wyskakujących okien, kart „motywacja dnia".
- **Don't** przebudowywać całego ekranu treningu przy każdym tapnięciu.
- **Don't** polegać wyłącznie na kolorze ani wyłącznie na dźwięku do przekazania stanu.
- **Don't** liczyć czasu przerwy z tyknięć zegara. Czas zawsze wynika ze znacznika czasu.
