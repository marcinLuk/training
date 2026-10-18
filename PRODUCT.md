# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Jedna osoba: autor aplikacji. Trenuje sam w domu, telefon leży obok. Moment potrzeby: po przerwie między seriami, gdy nie wie, w którym miejscu jest i co dalej. Plany układa spokojnie, poza treningiem. Znajomi to nieformalna kontrola, nie osobna persona.

## Product Purpose

Aplikacja prowadzi przez trening krok po kroku, żeby użytkownik nie gubił miejsca i nie pomijał serii po przerwie. Użytkownik układa plan (ćwiczenia z seriami, powtórzeniami i czasem przerwy), potem uruchamia trening. Ekran zawsze pokazuje bieżące ćwiczenie, liczbę pozostałych serii i następne ćwiczenie. Jedno dotknięcie kończy serię, uruchamia się timer przerwy, a dźwięk oznacza jej koniec.

Sukces: 0 pominiętych serii w 3 treningach z rzędu. Co najmniej 95% serii odhaczonych w aplikacji. Aplikacja nie wydłuża przerw i nie jest rozpraszaczem.

Źródło prawdy: `context/foundation/prd.md`.

## Positioning

Własna, prosta aplikacja bez konta, serwera na dane i subskrypcji. Wszystkie dane zostają na telefonie. Jedno zadanie: pokazać, gdzie jestem i co dalej, jednym spojrzeniem po przerwie.

## Operating Context

Android, aktualny Chrome, instalowalna PWA. Telefon w jednej ręce lub oparty obok, ekran włączony przez cały trening (Wake Lock). Użycie z odczytem z 1–2 m, spocone palce, często ze słuchawkami. Działa offline po pierwszym uruchomieniu. Trwający trening przeżywa blokadę ekranu, przełączenie aplikacji i przeładowanie. Pozostały czas przerwy liczy się z zapisanego znacznika czasu, nigdy z tyknięć zegara. Nieużywany trening wygasa po czasie bezczynności (wartość do ustalenia, pytanie otwarte 1).

## Capabilities and Constraints

- Vite 8, Vue 3.5 (`<script setup>`), TypeScript strict. Brak backendu.
- Dane planów i bieżącego treningu tylko na urządzeniu. Brak kont, API i synchronizacji.
- Interfejs i komunikaty po polsku.
- Poza zakresem MVP: historia i statystyki, kalendarz, biblioteka ćwiczeń, cardio, liczenie powtórzeń, głos, wibracje, Google Play, niezawodny sygnał przy zablokowanym ekranie.
- Brak pola ciężaru w ćwiczeniu w MVP. Plan ma tylko serie, powtórzenia i czas przerwy.

## Brand Commitments

Nazwa: „Trening". Wygląd jest zatwierdzony: system „Talerze" z `DESIGN.md` (ciemna „guma", kreda jako główna akcja, Barlow, płaskie powierzchnie). Zakres systemu zawężono do MVP: bez cardio, kalendarza i wag. Kolory talerzy zostają zarezerwowane na późniejszy ciężar.

## Evidence on Hand

Badanie pain-pointów użytkowników aplikacji treningowych: `documentation/pain-points.csv` i podsumowania w `documentation/pain-points-*.md`. Notatki z odkrywania: `context/foundation/shape-notes.md`. Brak danych o użytkownikach poza autorem.

## Product Principles

- Jedno spojrzenie po przerwie odpowiada na pytania „gdzie jestem" i „co dalej". To jest cała wartość produktu.
- Telefon nie jest pułapką: zero powiadomień, reklam i dodatkowych ekranów, które wydłużają przerwę.
- Jedno dotknięcie na serię. Główna akcja leży w dolnej części ekranu, w zasięgu kciuka.
- Stan treningu jest święty: blokada ekranu, przełączenie aplikacji i przeładowanie nie gubią miejsca ani czasu przerwy.
- Dane należą do użytkownika i zostają na telefonie.
- Prostota ponad liczbę funkcji: nic, co nie pomaga przejść przez trening.

## Accessibility & Inclusion

Kontrast tekstu co najmniej 4,5:1 (3:1 dla dużego) w obu motywach. Cele dotykowe: 56 px w trakcie treningu, 64 px dla głównej akcji. Koniec przerwy sygnalizuje dźwięk, który słychać też w słuchawkach, oraz wyraźna zmiana ekranu (nie sam dźwięk). Informacja nigdy tylko kolorem. Szanuj `prefers-reduced-motion`.
