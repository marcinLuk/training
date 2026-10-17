# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Jedna osoba (aplikacja single-user, własna). Główna sytuacja: telefon w ręku na siłowni, w trakcie treningu: timer przerw, licznik powtórzeń, szybkie odhaczanie serii. Planowanie (kalendarz, plany, biblioteka ćwiczeń) odbywa się też poza siłownią, na większym ekranie.

## Product Purpose

Planer treningów: kalendarz, plany treningowe, biblioteka ćwiczeń, timer przerw i licznik powtórzeń, dziennik treningów oraz zakładka Cardio (stoper i treningi interwałowe z szablonami). Sukces: trening da się przeprowadzić i zapisać bez wysiłku, a historia jest zawsze pod ręką.

## Positioning

Własna, prosta, self-hosted aplikacja: bez konta w chmurze, subskrypcji i reklam. Wszystkie dane w jednej bazie SQLite z kopią JSON; trening siłowy i cardio w jednym miejscu.

## Operating Context

Użycie głównie mobilne, w ruchu, na siłowni. Aktywna sesja (runner) żyje po stronie klienta w localStorage, korzysta z Web Audio (sygnały) i Wake Lock (ekran włączony). Hostowana samodzielnie (Docker), opcjonalnie za reverse proxy pod podścieżką, z Basic auth.

## Capabilities and Constraints

- Node.js, Express 5, SQLite (`node:sqlite`), frontend w czystym JS bez builda; jedyna zależność npm to Express.
- Interfejs, komunikaty i komentarze po polsku.
- Treningi siłowe i cardio to osobne, wzajemnie wykluczające się sesje; cardio oznaczone osobnym kolorem (`--cardio`).
- Adresy API względne (podścieżka reverse proxy).

## Brand Commitments

Nazwa: „Trening". Obecny ciemny motyw z zielonym akcentem i fioletowym kolorem cardio jest istniejącą implementacją, nie zatwierdzonym wiążącym wyborem.

## Evidence on Hand

Badanie pain-pointów użytkowników aplikacji treningowych: `documentation/pain-points.csv` oraz podsumowania w `documentation/pain-points-*.md`. Brak opinii klientów ani danych o użytkownikach poza tym.

## Product Principles

- Prostota ponad liczbę funkcji: każda funkcja musi ułatwiać sam trening lub jego zapis.
- Użycie w trakcie wysiłku: najważniejsze akcje dostępne od razu, jedną ręką, bez nawigowania.
- Dane należą do użytkownika: lokalna baza, pełny eksport i import.
- Niezawodność sesji: przeładowanie strony lub uśpiony ekran nie psują treningu ani czasu.

## Accessibility & Inclusion

Brak szczególnych wymagań poza standardem (kontrast, wystarczające cele dotykowe).
