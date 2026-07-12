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

## Structure

- `src/api/` — typed `fetch` wrapper (`client.ts`), auth endpoints (`auth.ts`), and backend DTO types (`types.ts`)
- `src/auth/` — `AuthProvider`/`useAuth` session state (persisted in `localStorage`) and the `RequireAuth` route guard
- `src/layout/` — app shell (header + routed content area)
- `src/pages/` — route components
- `src/test/` — test setup

Server state is managed with TanStack Query; routing with React Router; styling with CSS modules.
