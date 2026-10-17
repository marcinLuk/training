# Trening

Planer treningów z kalendarzem, timerem przerw, licznikiem powtórzeń, dziennikiem i zakładką **Cardio**
(trening swobodny ze stoperem oraz interwałowy z szablonami; treningi cardio widać w kalendarzu i dzienniku w osobnym kolorze).
Node.js 24 + Express 5 + SQLite (wbudowany moduł `node:sqlite`), frontend bez frameworka w `public/`.

## Uruchomienie (Docker)

```bash
cp .env.example .env      # ustaw APP_PASSWORD, jeśli aplikacja ma być dostępna publicznie
docker compose up -d --build
```

Aplikacja: http://localhost:3000 (port zmienisz zmienną `PORT` w `.env`).

Baza SQLite leży w wolumenie `trening-data` (`/data/trening.db` w kontenerze) i przetrwa
przebudowę oraz restart kontenera. `docker compose down -v` **usuwa bazę**.

## Konfiguracja (`.env`)

| Zmienna        | Domyślnie | Opis                                                     |
|----------------|-----------|----------------------------------------------------------|
| `PORT`         | `3000`    | port na hoście                                           |
| `APP_USER`     | `admin`   | login                                                    |
| `APP_PASSWORD` | _(puste)_ | hasło – gdy ustawione, aplikacja wymaga logowania (HTTP Basic) |

Na serwerze postaw przed aplikacją reverse proxy z HTTPS (np. Caddy, nginx, Traefik) –
logowanie Basic bez HTTPS przesyła hasło otwartym tekstem.

## Kopia zapasowa

- z aplikacji: zakładka **Dziennik → Eksportuj / Importuj** (plik JSON; obejmuje też szablony i treningi cardio oraz terminy cardio w kalendarzu, a starsze kopie bez cardio nadal się importują),
- plik bazy: `docker compose cp trening:/data/trening.db ./trening-backup.db`

## Lokalnie bez Dockera

```bash
npm install
npm run dev               # baza w ./data/trening.db
npm test                  # testy (node:test)
```
