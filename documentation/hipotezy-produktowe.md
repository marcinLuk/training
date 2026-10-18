# Hipotezy produktowe: Trening (dokument roboczy)

Data: 2026-10-18. Status: **szkic do zweryfikowania**, nie source of truth.

Fokus: **problem A, gubienie się w seriach** podczas treningu w domu.
Problem B (planowanie w zeszycie) został porzucony 2026-10-18 na decyzję autora; hipotezy HB1–HB4 i hipoteza łącząca HX usunięte.
Hipoteza HA5 (liczenie powtórzeń w trakcie serii przez klikanie w telefon) usunięta 2026-10-18: nierealna, bo ręce są zajęte ćwiczeniem. Hipoteza HA7 (prowadzenie głosem, bez patrzenia w ekran) usunięta 2026-10-18: zbyt kosztowne rozwiązanie. Numeracja pozostałych hipotez bez zmian.
Nie opieram się na tym, co aplikacja już potrafi. Dokumenty `pain-points-*.md` to słabe wsparcie (skargi na cudze aplikacje).

> Problem: przy dużej liczbie serii tracę orientację i czasem pomijam serię. Przyczyna: rozproszenie (ktoś zagaduje w trakcie powtórzeń albo odpływam myślami).

Użytkownik docelowy: osoba ćwicząca w domu, sama, z telefonem pod ręką. Na razie jest nim autor problemu plus nieformalnie znajomi.

---

## Dowody z badania `problemy-cwiczacych` (2026-10-18)

Źródło: [problemy-cwiczacych-pain-points.csv](problemy-cwiczacych-pain-points.csv), 188 wierszy, wypowiedzi z 2024-10-18 – 2026-10-18 (Reddit, fora, blogi, po angielsku).

**Jak czytać liczby.** 188 wierszy to tylko **125 unikalnych źródeł** (część wypowiedzi pojawia się w kilku wierszach, bo ten sam wpis znaleźli różni agenci). Dla problemu A: 44 wiersze z kategorii podstawowych to 35 unikalnych źródeł, 97 wierszy po dodaniu kategorii pokrewnych to 74 źródła. Wiersze z Reddita (39) pochodzą z zaledwie 16 wątków. To głosy z internetu, nie reprezentatywna próba. Severity: 5 wierszy `high` na 188, reszta medium i low.

| Co mówią dane | Wiersze | Co z tego |
|---|---:|---|
| **Gubienie liczby powtórzeń w trakcie serii** (Losing Count/Reps) | 21 | Najczęstszy wariant. Ludzie zgadują albo robią dodatkowe powtórzenia „na wszelki wypadek". Problem dotyczy też zmęczenia w ostatniej serii (częsty opis: „odcina mnie koło 8. powtórzenia"). |
| **Rozproszenie i przerwania** (Distraction/Interruptions) | 9 | Przerwania (dzieci, telefon służbowy, odpływanie myślami) rozwalają plan oparty na timerach. Część osób gubi się głównie **między** seriami, a w serii wznawia od ostatniego zapamiętanego numeru. |
| **Utrata miejsca po przerwie** (Lost Place After Break) | 7 | Pół minuty po serii nie wiadomo, czy to była seria 2 czy 3. Aplikacja, która traci stan po zamknięciu lub odświeżeniu, pogarsza to (2 wiersze). |
| **Pominięte serie i ćwiczenia** (Skipped Sets/Exercises) | 7 | Najrzadszy wariant. Pominięcia często wychodzą dopiero po fakcie: kilka osób odkryło po wprowadzeniu notatnika, że ćwiczenia „po cichu" odpadały przez tygodnie. |
| **Telefon jako źródło rozproszenia** (Phone During Workout) | 27 | Wyciągnięcie telefonu do zaliczenia serii kończy się powiadomieniami i social mediami; przerwa 90 s rośnie do 4 min. 13 wierszy z for. Wniosek: samo „zaliczanie na telefonie" bywa częścią problemu. |
| **Odmierzanie przerwy** (Rest Timing) | 6 | Bez sygnału przerwa się rozjeżdża (90 s → prawie 3 min); delikatną wibrację łatwo przeoczyć ze słuchawkami. |
| **Własne sposoby radzenia sobie** (Coping Workarounds) | 20 | Liczenie na głos, na palcach, grupami po pięć, odliczanie w dół, `X` zamiast liczby w arkuszu, notatnik, tryb skupienia w telefonie, zegarek. |

Dwie rzeczy, które osłabiają obraz:
- Wielu rozmówców traktuje gubienie powtórzeń jako **drobną niedogodność** („wkurzające, ale zdarza się za każdym razem") i po prostu robi więcej powtórzeń.
- Pominięcie **całej serii** (Twój problem) to w danych najrzadszy wariant. Dane lepiej potwierdzają gubienie liczby powtórzeń niż pomijanie serii.

---

## Czego nie wiemy

„Pomijam serię" może mieć kilka przyczyn, a każda wymaga innego rozwiązania:

1. **Utrata licznika**: nie pamiętam, czy to była 3. czy 4. seria.
2. **Utrata pozycji po przerwie**: odpoczynek, telefon, rozmowa, i nie wiem, gdzie skończyłem.
3. **Pominięcie przy zmianie ćwiczenia**: przechodzę dalej, a w poprzednim zostaje „dziura".
4. **Zmęczenie / rozproszenie**: wiem, co robić, ale wypada mi to z głowy.

Autor potwierdził przyczynę 4 (rozproszenie), także w trakcie powtórzeń. Dane z badania potwierdzają ją u innych (HA0 poniżej).

### HA0: diagnostyczna

**Status: potwierdzona jakościowo (2026-10-18).** Rozproszenie jest główną przyczyną; potwierdzili autor, znajomi (nieformalnie, bez liczb) i badanie internetowe (wiersze wyżej). Gubienie następuje **zarówno w trakcie serii (liczenie powtórzeń), jak i między seriami (po rozproszeniu, przy telefonie)**.

**Rozstrzygnięte u autora (2026-10-18, po sprostowaniu):** serię pomijam **po przerwie**, a nie w trakcie powtórzeń. Rozproszenie (rozmowa, odpłynięcie myślami) może zdarzyć się wcześniej, ale skutek, czyli pominięta seria, ujawnia się po przerwie, gdy nie wiem, w którym miejscu jestem. To odpowiada wierszom z badania o utracie miejsca po przerwie (7 wierszy) i o rozjeżdżaniu się przerw (6 wierszy), choć w danych zewnętrznych częstsze jest gubienie liczby powtórzeń w serii (21 wierszy).

Skutki dla hipotez:
- **HA2 (powrót w to samo miejsce) i HA1 (widoczna pozycja) wracają na pierwszy plan**: po przerwie potrzebuję jednego spojrzenia, które mówi, gdzie jestem i co dalej.
- **HA4 (jedna akcja na serię) zostaje**: jeśli zaliczam serię od razu po jej zakończeniu, po przerwie widzę, co zostało.
- **HA6 (sygnał końca przerwy) wraca do gry**: przerwa to moment, w którym uwaga odpływa.

Pozostaje do potwierdzenia: czy po przerwie nie wiesz, **którą serię** robisz (numer), czy **które ćwiczenie** jest następne, czy po prostu **zapominasz wrócić** do ćwiczenia po rozproszeniu.
- Test: notatka po treningu przez 5–7 treningów (jedna linia: ile razy się pogubiłem po przerwie i co dokładnie nie wiedziałem).
- Obalona, gdy: okaże się, że pominięcia zdarzają się jednak głównie w trakcie powtórzeń.

---

## Hipotezy

### HA1: widoczna pozycja

**Jeśli** w każdej chwili treningu widzę jednym spojrzeniem, w którym ćwiczeniu i której serii z ilu jestem oraz co jest następne, **to** pominę mniej serii, **ponieważ** nie muszę niczego trzymać w głowie.
- Wsparcie z danych: częsty opis „nie wiem, czy to seria 3 czy 4"; aplikacja na zegarku, w której ukończone ćwiczenie wygląda niemal tak samo jak niedokończone, a pominiętą serię pokazuje tylko mały licznik (1 wiersz).
- Najryzykowniejsze założenie: że problemem jest brak informacji, a nie uwaga (przyczyna 4). Dane sugerują, że ekran pozycji pomaga głównie po powrocie do treningu, a u autora pominięcie następuje po przerwie, gdy ekran jest dostępny, więc taki ekran powinien pomagać (HA0).
- Test: najprostsza wersja (jeden ekran „ćwiczenie, seria n/N, następne") na 5 treningach.
- Miara: liczba pominiętych serii na trening (baseline z HA0).
- Sukces: ≥ 80% spadek względem baseline'u, ostatecznie 0 pominięć w 3 kolejnych treningach.
- Obalona, gdy: pominięcia nadal występują mimo widocznej pozycji.

### HA2: odzyskanie pozycji po przerwie

**Jeśli** po wyjściu z aplikacji (blokada ekranu, inna aplikacja, przerwa) wracam od razu do dokładnie tego miejsca, w którym skończyłem, **to** nie będę się gubić po przerwach, **ponieważ** koszt powrotu spada do zera.
- Wsparcie z danych: 2 wiersze o utracie zalogowanych serii i timera po zamknięciu aplikacji, odświeżeniu lub awarii; użytkownik, któremu przypadkowy przycisk na zegarku przeskoczył ćwiczenie bez możliwości powrotu.
- **Priorytet podniesiony (2026-10-18):** u autora pominięcie następuje po przerwie, więc powrót do właściwego miejsca trafia dokładnie w problem.
- Najryzykowniejsze założenie: że utrata pozycji po przerwie jest u mnie częsta (u autora tak, HA0).
- Test: celowo przerywam trening (blokada telefonu, 2 minuty w innej aplikacji) i sprawdzam, czy wracam bez zastanawiania się.
- Miara: czas do pewności „gdzie jestem" po powrocie (cel: < 3 s) oraz brak utraty stanu.
- Obalona, gdy: powrót działa, a pominięcia nadal są (to wtedy nie przerwy).

### HA4: jedna akcja na serię

**Jeśli** zaliczenie serii wymaga jednej szybkiej akcji w momencie jej zakończenia (bez wpisywania), **to** będę ją odhaczać zawsze, **ponieważ** koszt jest mniejszy niż koszt pamiętania.
- Wsparcie z danych: ludzie, którzy zapisują serię od razu, nie gubią się (notatnik, `X` w arkuszu); kto nie zapisał od razu, po ~30 s nie pamięta, którą serię zrobił (1 wiersz).
- **Ostrzeżenie z danych:** sięgnięcie po telefon jest samo w sobie pułapką (powiadomienia, social media, rozciągnięta przerwa, 13 wierszy z for). Akcja musi być możliwa bez odblokowywania telefonu i bez wchodzenia w aplikacje, a bardziej realistyczna bywa przy ekranie, który stale jest na wierzchu.
- Najryzykowniejsze założenie: że wpisywanie jest dziś barierą, a nie samo skupienie.
- Test: porównanie dwóch trybów, „tylko odhacz" i „odhacz + wpisz", na kilku treningach.
- Miara: odsetek serii zaliczonych w aplikacji (cel ≥ 95%), liczba pominięć i czas przerwy między seriami.
- Obalona, gdy: tryb „tylko odhacz" nie zmienia liczby pominięć albo wydłuża przerwy.

### HA6: sygnał zamiast uwagi

**Jeśli** aplikacja sama zasygnalizuje koniec przerwy lub kolejny krok (dźwięk, wibracja), **to** odpłynięcie myślami w odpoczynku nie przełoży się na pominięcie, **ponieważ** bodziec przyciąga uwagę z powrotem.
- Wsparcie z danych: przerwy rozjeżdżają się bez sygnału (90 s → prawie 3 min); osoba, która „zonuje" głównie między seriami, używa opaski wibrującej, by wrócić do treningu.
- Uwaga z danych: delikatną wibrację łatwo przeoczyć ze słuchawkami, więc sygnał musi być wyraźny.
- **Priorytet podniesiony (2026-10-18):** u autora pominięcia zdarzają się po przerwie, więc to właśnie przerwa jest momentem, w którym uwaga odpływa.
- Najryzykowniejsze założenie: że pominięcia zdarzają się głównie w przerwach (u autora tak, HA0).
- Test: sygnał na koniec przerwy na 5 treningach, zapis liczby pominięć.
- Miara: pominięcia w przerwach → 0.
- Obalona, gdy: pominięcia dzieją się w trakcie serii, wtedy sygnał nic nie zmienia.

---

## Kolejność weryfikacji

| # | Hipoteza | Dlaczego teraz | Koszt testu |
|---|---|---|---|
| 1 | HA0, część otwarta (co dokładnie gubię po przerwie) | Moment znany (po przerwie); brakuje „co dokładnie" | zero kodu, 1–2 tyg. |
| 2 | HA2 (powrót w to samo miejsce) | Trafia w moment gubienia się, dobrze udokumentowane w danych | mała zmiana |
| 3 | HA4 (jedna akcja na serię) | Po przerwie widzę, co zostało; z ostrzeżeniem o pułapce telefonu | mała zmiana UI |
| 4 | HA1 (widoczna pozycja) | Jedno spojrzenie po przerwie mówi, gdzie jestem | mała zmiana UI |
| 5 | HA6 (sygnał końca przerwy) | Przerwa to moment, w którym uwaga odpływa | mała zmiana |

## Ograniczenia

- **Mała próba i brak liczb.** Problem A potwierdzili autor i znajomi (nieformalnie) oraz wypowiedzi z internetu (74 unikalne źródła dla szerokiego A). Nie wiemy, jak często ludzie pomijają **całe serie**, bo dane mówią głównie o gubieniu powtórzeń.
- **Dane to głosy z internetu**, nie badanie reprezentatywne; angielskojęzyczne; część wypowiedzi pochodzi od twórców aplikacji (zachowane, oznaczone w konfiguracji badania) i 9 wierszy z Hacker News ma daty wywnioskowane.
- **Progi sukcesu są propozycjami** i trzeba je skalibrować na baseline z HA0.
- Hipotezy nie zakładają żadnej konkretnej funkcjonalności. To, co dziś istnieje w aplikacji, może być punktem wyjścia, ale nie założeniem.
