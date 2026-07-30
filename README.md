# TripPlanner

A full-stack trip-planning web app. Search for a city or country, browse recommended attractions, open a destination's details, and organise the ones you like into a day-by-day itinerary on your own trips.

- **Backend** — ASP.NET Core 10 Minimal API, Clean Architecture, PostgreSQL, JWT auth (`BE/`)
- **Frontend** — React 19 + TypeScript + Vite single-page app (`FE/`)
- **Deployment** — Docker Compose (Postgres + API + nginx-served SPA, optional Redis and Caddy TLS edge)

## Features

| Area | What it does |
| --- | --- |
| Destination discovery | Location search with suggestions and recent searches, attraction list with filters, "open now" badges, popular-city landing tiles |
| Destination details | Name, category, description, photos, address, opening hours, website, map, nearby attractions |
| Trip planner | Create trips, set start/end dates (one itinerary day per date), add/remove destinations per day, reorder within a day, drag-and-drop between days, a saved-places shortlist that can be promoted onto a day |
| Accounts | Register with email verification (login is blocked until verified), resend verification, login, logout with token revocation |
| Ownership | Every trip is scoped to its owner — a foreign trip id behaves as `404` |

External data comes from four third-party providers, each behind its own port: Photon (geocoding), OpenTripMap (attractions and details), OSM Overpass (opening hours) and Wikipedia (images). Only OpenTripMap needs an API key.

## Repository layout

```
BE/                     .NET solution (TripPlanner.slnx) — Domain, Application, Infrastructure, API, Tests
FE/                     React + TypeScript + Vite SPA
docs/                   Deployment guide and operational notes
epic/                   Feature epics with user stories and acceptance criteria
requirement/            Authoritative source requirements (Sheet1.html)
_bmad-output/           Per-story implementation artifacts and sprint status
docker-compose*.yml     Base stack plus deploy / http / tls overlays
Caddyfile               TLS edge configuration (used only when DOMAIN is set)
```

`CLAUDE.md` is the in-depth architecture and conventions guide; `FE/README.md` is the authoritative frontend guide. Read those before changing code.

## Getting started

### Run the whole stack with Docker (recommended)

```bash
cp .env.production.example .env   # then fill in real secrets — this file stays out of git
docker compose build
docker compose up
```

The app is served at **http://localhost:8080**. nginx is the only host-facing port: it serves the built SPA and reverse-proxies `/api/` to the API container, so the browser talks to a single origin. Migrations apply automatically on API startup, so a fresh Postgres volume is schema-ready on first boot.

### Run locally for development

**Backend** — from `BE/`:

```bash
cp .env.example .env       # BE/.env.example is the authoritative, annotated variable list
dotnet run --project BE/TripPlanner.API      # or: dotnet watch --project BE/TripPlanner.API
```

Swagger UI is available at `/swagger` in Development.

**Frontend** — from `FE/`:

```bash
npm install
npm run dev                # http://localhost:5173
```

The SPA reads the API base URL from `VITE_API_BASE_URL` (`FE/.env.development`, default `http://localhost:5000`).

## Configuration

Backend configuration is loaded from a `.env` file via DotNetEnv (`Program.cs` walks up from the working directory to find it). **`BE/.env.example` is the authoritative annotated list** — copy it rather than reconstructing the set. The variables with no usable default:

```
ConnectionStrings__DefaultConnection=<postgres-connection-string>
JwtSettings__SecretKey=<hs256-secret-key, 32+ chars>
OpenTripMapSettings__ApiKey=<opentripmap-api-key>
EmailSettings__FromAddress=<sender-address>
EmailSettings__VerificationUrlBase=<spa-verify-email-url>
```

Notes worth knowing:

- Both `EmailSettings` entries are enforced by `ValidateOnStart()` — a missing one is a startup failure, not a latent bug.
- `ConnectionStrings__Redis` is optional. Blank is a supported configuration: the API falls back to an in-process cache, so nothing needs a running Redis.
- Verification email transport is provider-selected by `EmailSettings__Provider` (`Resend` default, or `Google`). Only the selected provider's credentials are bound and validated.
- In Compose, the Postgres host/port/options are env-selectable (`POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_OPTIONS`), so the API can be pointed at a managed Postgres from the host `.env` alone.

## Testing

```bash
# Backend
dotnet test BE
dotnet test BE --filter "FullyQualifiedName~UpdateTripUseCaseTests"

# Frontend (from FE/)
npm test
npm run lint
npm run build                                     # type-check + production build
npx vitest run src/features/trips/tripService.test.ts
npx vitest run -t "creates a trip"
```

The backend build is expected to stay at **0 warnings** — unnecessary usings and unused private members are promoted to build warnings by `BE/.editorconfig` and `BE/Directory.Build.props`.

Database migrations:

```bash
dotnet ef migrations add <Name> --project BE/TripPlanner.Infrastructure --startup-project BE/TripPlanner.API
dotnet ef database update --project BE/TripPlanner.Infrastructure --startup-project BE/TripPlanner.API
```

## Architecture

### Backend — Clean Architecture

```
API → Infrastructure → Application → Domain
```

Nothing in Application or Domain may reference API or Infrastructure types.

- **Domain** — entity models only (`Trip`, `TripDay`, `TripDayDestination`, `Destination`, `User`); no dependencies.
- **Application** — use cases, ports, DTOs and the `Result<T>` pattern. Only contract-only abstraction packages.
- **Infrastructure** — EF Core (PostgreSQL), repositories, Mapperly mapping, JWT, password hashing, SMTP senders, response cache, and the external provider clients.
- **API** — Minimal API endpoint groups, validators, middleware and DI wiring. No business logic.
- **Tests** — xUnit with NSubstitute.

Key patterns: one class per operation (`I<Name>UseCase` with a single `ExecuteAsync`), `Result<T>` with an `ErrorType` enum mapped to HTTP by `ResultExtension.ToResponse()`, FluentValidation auto-validating endpoint parameters, and external failures surfacing as `ServiceUnavailable` results or `null` rather than exceptions.

### Frontend — feature-sliced

```
component → hooks.ts (TanStack Query) → <name>Service → HttpClient → fetch
```

No tier is skipped: a component never calls `fetch`, a service never touches TanStack Query, and `shared/api/httpClient.ts` is the only place `fetch` is called. `src/app/` is the composition root, `src/features/{auth,destinations,trips}/` co-locate pages, hooks, services and tests, and `src/shared/` holds `api/`, `lib/` and `ui/`. There are deliberately no barrel files.

### API surface

| Group | Auth | Routes |
| --- | --- | --- |
| `/api/auth` | anonymous | `POST /register`, `POST /login`, `POST /logout`, `GET /verify-email`, `POST /resend-verification` |
| `/api/locations` | anonymous | `GET /search`, `GET /attractions`, `GET /{xid}/details` |
| `/api/destinations` | anonymous | `GET /`, `GET /{id}` |
| `/api/trips` | **required** | `GET /`, `GET /{id}`, `POST /`, `PUT /{id}`, day destinations (add/remove/reorder/move), saved places (add/remove), `POST /{id}/days/{date}/schedule` |

### SPA routes

`/` and `/search` (search), `/attractions/:xid` (details), `/trips` and `/trips/:id` (guarded), `/register`, `/login`, `/verify-email`.

## CI/CD

Workflows live in `.github/workflows/` and are version-controlled on purpose (GitHub only runs committed workflows).

- **`ci.yml`** — on push to `master`/`quanhvo` and PRs to `master`: three parallel jobs for backend build/test, frontend lint/test/build, and a container job that validates `docker compose config` plus `nginx -t` and builds both images.
- **`deploy.yml`** — manual dispatch: builds and pushes both images to GHCR, deploys over SSH to a single EC2 host, waits for every service to report healthy, and smoke-tests the public URL.

Edge mode is chosen by the `DOMAIN` repository variable: unset → nginx on port 80; set → Caddy on 80/443 with automatic Let's Encrypt certificates. TLS must terminate at the edge — the containers serve plain HTTP. Full server preparation and secrets are documented in **`docs/deployment.md`**.

## Code style

- Curly braces are required for all control flow, even single-statement bodies.
- Do not add comments to code — no XML docs, inline or block comments.
- One React component per `.tsx`, with data, hooks and helpers in plain `.ts` siblings (enforced by `react/only-export-components`).
- `tsconfig.app.json` sets `erasableSyntaxOnly`, so TypeScript parameter properties are a compile error — assign constructor fields explicitly.

## Feature documentation

Requirements are tracked as epics in `epic/` (`epic-1-destination-suggestion.md` … `epic-5-frontend-web-app.md`), derived from the authoritative `requirement/Sheet1.html`. Where an epic and the sheet disagree, **the sheet wins**. Delivered work is written up per story under `_bmad-output/implementation-artifacts/`, with `sprint-status.yaml` tracking state — check there for why something was built the way it was before re-litigating a decision.
