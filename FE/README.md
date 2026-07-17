# TripPlanner Frontend

React + TypeScript + Vite single-page app for TripPlanner, consuming the ASP.NET Core API in `BE/`.

## Prerequisites

- Node.js 20+
- The backend API running locally (`dotnet run --project BE/TripPlanner.API` from the repo root)

## Commands

Run all commands from the `FE/` directory:

```bash
npm install        # install dependencies
npm run dev        # start the dev server (http://localhost:5173)
npm run build      # type-check and build for production
npm test           # run unit tests (Vitest)
npm run lint       # run Oxlint
npm run preview    # preview the production build
```

## Configuration

The API base URL comes from `VITE_API_BASE_URL`, set in `.env.development` (defaults to `http://localhost:5000`, matching the API's launch profile).

For email verification links to open the SPA's `/verify-email` page, set `EmailSettings__VerificationUrlBase=http://localhost:5173/verify-email` in `BE/.env` (no backend code change required).

In the Docker/production image (`FE/Dockerfile`), the app is built with `VITE_API_BASE_URL` **empty** on purpose: with no base URL the API client (`src/shared/api/client.ts`) issues relative, same-origin requests, which nginx reverse-proxies to the backend (see `FE/nginx.conf` and the Docker section in the root `CLAUDE.md`). Vite bakes this value at build time, so it is a build argument, not a runtime setting.

## Structure

The source is organized **by feature**. Imports that cross a folder boundary use the `@/` alias (resolving to `src/`, configured in `vite.config.ts` and `tsconfig.app.json`); imports between files in the same folder stay relative (`./`).

- `src/app/` — application shell and wiring: entry point (`main.tsx`, `index.css`), route table (`routes.tsx`), the `AppLayout` header/content shell, and `NotFoundPage`
- `src/shared/` — code used across features
  - `shared/api/` — typed `fetch` wrapper (`client.ts`) and backend DTO types (`types.ts`)
  - `shared/lib/` — framework-agnostic utilities (`dates.ts`, `useDebouncedValue.ts`)
  - `shared/ui/` — generic presentational primitives (`Modal`, `ConfirmDialog`, `Dialog`/`Skeleton`/`PageState` styles)
- `src/features/` — one folder per feature domain, each co-locating its pages, components, hooks (`hooks.ts`), API calls (`api.ts`), and styles/tests
  - `features/auth/` — `AuthProvider`/`useAuth` session state (persisted in `localStorage`), the `RequireAuth` guard, `AuthShell`, and the Login/Register/Verify-Email pages
  - `features/destinations/` — search and destination-detail pages plus their attraction components (cards, hero, map, nearby rail, suggestions)
  - `features/trips/` — trips list, trip planner, the add-to-trip flow, and trip forms
- `src/test/` — test setup

Server state is managed with TanStack Query; routing with React Router; styling with CSS modules.
