---
name: Trening
description: Ciemna „guma" lub jasny „magnez", kreda jako jedyna główna akcja, ogromne wąskie cyfry. Kolory talerzy sztangi zarezerwowane na przyszły ciężar.
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

<!-- Zakres: MVP z context/foundation/prd.md. System zawężono do planów i runnera: bez cardio, kalendarza, dziennika, wag i dolnego paska zakładek. Elementy zarezerwowane są oznaczone „po MVP". Po wdrożeniu uruchom /impeccable document ponownie, żeby uzupełnić tokeny z kodu i sidecar .impeccable/design.json. -->

# Design System: Trening

## Overview

**Creative North Star: "Talerze"**

Siła tego systemu to czytelność z dwóch metrów. Po przerwie jedno spojrzenie ma pokazać: gdzie jestem, ile serii zostało, co dalej. Nazwa „Talerze" pochodzi z języka siłowni: kody kolorów talerzy sztangi (25 kg czerwony, 20 niebieski, 15 żółty, 10 zielony, 5 biały). W MVP plan nie ma ciężaru, więc kolory talerzy czekają w rezerwie. Zostaje reszta charakteru: ciężkie, wąskie cyfry, neutralne tło, kolor tylko tam, gdzie niesie znaczenie.

Scena użycia wyznacza resztę: telefon w jednej ręce lub oparty obok, spocone palce, odczyt z 1–2 m, często ze słuchawkami. Stąd ogromne cyfry, wysoki kontrast, duże cele dotykowe i żadnej ozdoby, która nie pracuje. Ton jest rzeczowy i pewny, nie krzykliwy: bez gradientów, neonów, maskotek i emoji. Ekran treningu nie ma się niczym rozpraszać, bo wydłużona przerwa to porażka produktu.

MVP ma jeden motyw: ciemną „gumę" (decyzja autora). Jasny „magnez" zostaje w systemie jako zarezerwowany wariant na później. Nie buduj go ani nie przełączaj motywu według `prefers-color-scheme`.

**Key Characteristics:**
- Stan treningu czyta się bez dotykania telefonu: liczba serii do końca jest największym elementem ekranu serii.
- Główna akcja jest „kredowa", jedna na ekran.
- Koniec przerwy to zmiana całego ekranu i dźwięk, nigdy sam dźwięk.
- Kolor niesie znaczenie, nigdy nie jest samotnym nośnikiem informacji.
- Standardowe kontrolki, bez kostiumów.

## Colors

Paleta w MVP ma cztery zadania: neutralna skala trzech poziomów tła, kreda dla akcji, kolor błędu i kolor fokusu. Kolory talerzy są zarezerwowane.

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
**The Chalk Rule.** Główna akcja jest w kolorze kredy i jest jedna na ekran. Nigdy w kolorze talerza ani w kolorze błędu.

**The Weight-Only Rule.** Gdy ciężar wejdzie do aplikacji, kolory talerzy znaczą wyłącznie wagę. Interfejs nigdy ich nie używa do niczego innego.

**The Number Beside Rule.** Kolor zawsze towarzyszy liczbie lub słowu. Nigdy sam.

## Typography

**Display / Numerals Font:** Barlow Condensed (z fallbackiem Arial Narrow)
**Body Font:** Barlow Semi Condensed (z fallbackiem Arial Narrow, system-ui)

**Character:** Wąska i ciężka rodzina o rodowodzie oznakowania drogowego. Ma polskie znaki, czyta się z dwóch metrów i daje najwięcej cyfr na szerokość telefonu. Cyfry zawsze tabelaryczne, żeby licznik i czas nie „pływały". Czcionki mają być serwowane lokalnie z `public/`, nie z zewnętrznego CDN.

### Hierarchy
- **Counter** (800, 11rem, 0,82): liczba pozostałych serii w widoku serii, największy element aplikacji.
- **Figure** (800, 3,5rem, 1): powtórzenia w widoku serii, czas przerwy.
- **Headline** (800, 2,25rem, 1, wersaliki): tytuł ekranu, nazwa ćwiczenia w treningu.
- **Title** (700, 1,375rem, 1,2, wersaliki, 0,02em): nagłówki kart i sekcji.
- **Body** (500, 1,0625rem, 1,5): treść i etykiety kontrolek. Linie nie dłuższe niż 65–75 znaków.
- **Label** (600, 0,8125rem): podpisy zakładek, drobne opisy, legenda.

Skala rośnie co najmniej 1,33 razy między poziomami: 0,8125 · 0,9375 · 1,0625 · 1,375 · 2,25 · 3,5 · 7 · 11 rem.

### Named Rules
**The Biggest Number Rule.** W widoku serii liczba pozostałych serii jest największym elementem ekranu, zawsze. W przerwie jest nim czas.

**The Tabular Rule.** Każda liczba zmieniająca się w czasie używa cyfr tabelarycznych.

## Layout

Układ jest mobile-first i jednokolumnowy. Nie ma dolnego paska zakładek: aplikacja ma dwa tryby. Poza treningiem to lista planów (Start przy każdym planie, „Nowy plan") i edytor planu. W treningu ekran należy w całości do treningu, bez nawigacji, która kusiłaby do wyjścia.

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
- **Hover / Focus:** wciśnięcie przesuwa o 1 px; fokus to obrys 3 px w kolorze fokusu z odsunięciem 2 px. Nieaktywny: 40% krycia.

### Cards / Containers
- **Corner Style:** 10 px.
- **Background:** powierzchnia (#1b1c1e) z obramowaniem 1 px w kolorze linii.
- **Shadow Strategy:** brak, patrz Elevation & Depth.
- **Internal Padding:** 16–20 px.
- Karta planu: nazwa, podsumowanie („5 ćwiczeń, 18 serii"), Start jako główna akcja, edycja i usuwanie rozdzielone szerokim odstępem.
- Lista planów bez planów: „Nie masz jeszcze planów. Dodaj pierwszy plan, a potem uruchom trening." Dopóki karta nie ma Start, „Nowy plan" jest główną akcją listy.

### Inputs / Fields
- **Style:** tło powierzchnia 2, obramowanie 2 px w kolorze linii, promień 10 px, wysokość 56 px, cyfry Barlow Condensed 700.
- **Krok liczby:** pole serii, powtórzeń i przerwy z przyciskami −/+ (56 px), bez konieczności klawiatury. Przerwa zmienia się co 15 s.
- **Focus:** obramowanie w kolorze fokusu.
- **Error:** komunikat z kolorem błędu i ikoną ostrzeżenia, treść nazywa problem i sposób naprawy.
- **Edytor planu:** napisy „Nazwa planu", „Nazwa ćwiczenia", „Serie", „Powtórzenia", „Przerwa", przyciski „Dodaj ćwiczenie", „Usuń ćwiczenie", „Zapisz plan" (główna), „Anuluj"; nowy plan startuje z jednym ćwiczeniem. Nieudany zapis pokazuje komunikat „Nie udało się zapisać planu…" i zostawia wpisane dane na ekranie.

### Widok serii (ekran treningu)
- Od góry: nazwa ćwiczenia (Headline), powtórzenia (Figure), pod nimi Counter z liczbą pozostałych serii i podpisem „serii zostało". Niżej wiersz „Dalej:" z nazwą następnego ćwiczenia (Title, kolor drugorzędny). Na dole „Gotowe" (64 px, kreda), a nad nim „Cofnij" i „Pomiń serię" (56 px).
- Każde dotknięcie aktualizuje liczby w miejscu, bez przebudowy ekranu.
- Ostatnia seria ćwiczenia pokazuje „Dalej:" z następnym ćwiczeniem, a ostatnie ćwiczenie pokazuje „To ostatnia seria".

### Przerwa
- Pierścień czasu z Figure w środku. Czas wynika z zapisanego znacznika startu. Pod spodem „Dalej:" z następną serią i ćwiczeniem. „−15 s" i „+15 s" (56 px), „Gotowy, zaczynam" (64 px, kreda) kończy przerwę wcześniej.
- Koniec przerwy: dźwięk i zmiana całego ekranu na widok następnej serii. Dźwięk nigdy nie jest jedynym sygnałem.
- Zielone podświetlenia, konfetti i animacje świętowania są zabronione. Przerwa ma być krótka.

### Ekran końca
- Nazwa planu, krótkie „Koniec treningu" i jedna główna akcja „Wróć do planów". Bez historii i statystyk. Bez gratulacji w stylu gry.

### Wznowienie treningu
- Po powrocie z blokady, innej aplikacji lub przeładowania ekran od razu pokazuje to samo miejsce i ten sam stan przerwy, w mniej niż 3 s. Wygasły trening (po czasie bezczynności) pokazuje krótką informację i wraca do listy planów.

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
- **Don't** dodawać gradientów, neonowych poświat, cieni jako ozdoby ani zaokrąglonych „kart z ikoną" jako struktury strony. Aplikacja nie ma wyglądać jak typowy tracker fitness.
- **Don't** stosować kolorowego paska po lewej stronie karty (`border-left` powyżej 1 px).
- **Don't** używać emoji ani znaków Unicode jako ikon, ani maskotek i konfetti.
- **Don't** dodawać elementów, które wydłużają przerwę: powiadomień, reklam, feedu, wyskakujących okien, kart „motywacja dnia".
- **Don't** przebudowywać całego ekranu treningu przy każdym tapnięciu.
- **Don't** polegać wyłącznie na kolorze ani wyłącznie na dźwięku do przekazania stanu.
- **Don't** liczyć czasu przerwy z tyknięć zegara. Czas zawsze wynika ze znacznika czasu.
