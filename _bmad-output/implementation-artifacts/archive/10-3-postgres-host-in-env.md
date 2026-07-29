---
baseline_commit: d63ee5f57e922c7397276a491d5722e227e4340e
---

# Story 10.3: Source the Postgres host (and port / extra options) from the environment

Status: review

## Story

As an operator deploying TripPlanner,
I want the Postgres **host** — and the port and any extra Npgsql options — supplied through the host-side `.env` instead of being hard-coded as `Host=db` in `docker-compose.yml`,
so that I can point the API at a managed/external Postgres (RDS, Neon, Supabase, a DB on another box) without editing a version-controlled file, exactly the way `ConnectionStrings__Redis` already works after story [[10-2-redis-connection-string-in-env]].

Origin: `docker-compose.yml:40` reads `ConnectionStrings__DefaultConnection: "Host=db;Port=5432;Database=${POSTGRES_DB};Username=${POSTGRES_USER};Password=${POSTGRES_PASSWORD}"`. Three of the five segments are already env substitutions; the two that decide *which server is contacted* are literals. `db` is the in-network Compose service name, so today the stack can only ever talk to the bundled Postgres container.

## Scope

- **Env-source the host and the port.** `Host=${POSTGRES_HOST:-db};Port=${POSTGRES_PORT:-5432}`. Unset → byte-for-byte today's value.
- **Allow extra Npgsql options.** `POSTGRES_OPTIONS` (default empty) is appended, so a managed Postgres that requires TLS can be reached (`SSL Mode=Require;Trust Server Certificate=true`) without another compose edit. Without this the feature is not usable against a real cloud Postgres, which is the whole point of overriding the host.
- **Declare all three in `.env.production.example`**, documented, with `POSTGRES_HOST=db` / `POSTGRES_PORT=5432` uncommented at their defaults and `POSTGRES_OPTIONS=` blank.
- **Guard the connection-string template with a test** that reads `docker-compose.yml`, expands the `${VAR:-default}` placeholders, and asserts the result parses as a valid Npgsql connection string — for the default case and for an external-host case.
- **Document** the override in `CLAUDE.md` and `docs/deployment.md`, including the honest caveat below.
- **Explicitly OUT of scope:**
  - Removing / conditionally starting the bundled `db` service, or dropping `api`'s `depends_on: db: service_healthy`. Pointing at an external host leaves the local `db` container running and still gated on — unused, harmless, and documented rather than "fixed". Making it conditional needs Compose profiles or a `!reset` override and would change the default `up` semantics.
  - `POSTGRES_DB/USER/PASSWORD` semantics — still init-only for the bundled volume.
  - Any C# production change. `ConnectionStrings__DefaultConnection` is already read from configuration.
  - `BE/.env.example` — the local `dotnet run` path already carries a full, freely editable connection string.

## Acceptance Criteria

1. `docker-compose.yml`'s `api.environment.ConnectionStrings__DefaultConnection` reads `Host=${POSTGRES_HOST:-db};Port=${POSTGRES_PORT:-5432};Database=${POSTGRES_DB};Username=${POSTGRES_USER};Password=${POSTGRES_PASSWORD};${POSTGRES_OPTIONS:-}`.
2. With none of the three new variables set, the effective value is semantically identical to today's (`Host=db`, `Port=5432`) — the only textual difference is a trailing `;`, which Npgsql tolerates.
3. The `:-` (default-if-unset-**or-empty**) form is used, not a bare `${...}`. A bare substitution would expand to empty when unset and produce `Host=;Port=;`, breaking every default `docker compose up`.
4. `.env.production.example` declares `POSTGRES_HOST=db`, `POSTGRES_PORT=5432` and `POSTGRES_OPTIONS=` with comments explaining: that `db` is the bundled service, that setting an external host leaves the bundled `db` container running-but-unused (and still waited on at startup), that `POSTGRES_OPTIONS` takes a `;`-separated fragment with **no** leading `;`, and that a managed Postgres typically needs `SSL Mode=Require;Trust Server Certificate=true`.
5. A test parses the template out of `docker-compose.yml`, expands it, and asserts via `NpgsqlConnectionStringBuilder` that (a) with no overrides `Host == "db"` and `Port == 5432`; (b) with `POSTGRES_HOST`/`POSTGRES_PORT`/`POSTGRES_OPTIONS` set, those values land (`SSL Mode=Require` → `SslMode.Require`); (c) the empty-`POSTGRES_OPTIONS` trailing `;` parses. The test fails if the template stops honouring `POSTGRES_HOST`.
6. `CLAUDE.md` and `docs/deployment.md` document the three variables and the unused-`db`-container caveat.
7. `dotnet build BE` → 0 warnings / 0 errors; `dotnet test BE` → 100% pass.
8. File List contains only `docker-compose.yml`, `.env.production.example`, `CLAUDE.md`, `docs/deployment.md`, the new test file, and this story + sprint-status.

## Tasks / Subtasks

- [x] Task 1: Env-source host/port/options in Compose (AC: 1, 2, 3)
- [x] Task 2: Declare and document the variables in `.env.production.example` (AC: 4)
- [x] Task 3: Guard the template with a test — RED first (AC: 5)
- [x] Task 4: Document in `CLAUDE.md` and `docs/deployment.md` (AC: 6)
- [x] Task 5: Validate — build, full test suite, File List (AC: 7, 8)

## Dev Notes

### Why a trailing `;` instead of `${POSTGRES_OPTIONS:+;...}`

Compose's `:+` alternate-value form is not part of the Compose specification's documented interpolation set (`-`, `:-`, `?`, `:?`), so relying on it to conditionally emit the separator would be a portability bet. Appending `;${POSTGRES_OPTIONS:-}` instead always terminates the connection string with `;` when no options are set. `DbConnectionStringBuilder` (which Npgsql derives from) ignores empty key/value segments, so `…;Password=p;` parses exactly like `…;Password=p`. AC 5(c) pins that rather than assuming it.

### Verification limits

Docker is not installed in this environment (same limitation recorded by 9-1, 10-1 and 10-2), so `docker compose config` was not run locally. CI's `containers` job runs `docker compose --env-file .env.production.example config --quiet` on every push, which exercises the interpolation for the defaults path.

### References

- [Source: docker-compose.yml:38-51] — the `api.environment` block and the `${VAR:-}` precedent.
- [Source: _bmad-output/implementation-artifacts/archive/10-2-redis-connection-string-in-env.md] — the pattern this story mirrors.
- [Source: .github/workflows/ci.yml] — `docker compose --env-file .env.production.example config --quiet`.

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (claude-opus-5[1m])

### Debug Log References

- `git rev-parse HEAD` → `d63ee5f57e922c7397276a491d5722e227e4340e` (baseline).
- RED — tests added against the unmodified `docker-compose.yml`: **Failed: 2, Passed: 1**. Both override cases failed with `Expected: "…rds.amazonaws.com" / Actual: "db"` — there was no `POSTGRES_HOST` placeholder to honour. The default-case test passed on the old template, correctly: AC 2 says the default path must not change.
- GREEN — after the compose edit: **Passed: 3, Failed: 0**.
- `npx js-yaml docker-compose.yml` → parses; `services.api.environment.ConnectionStrings__DefaultConnection` reads back as the intended literal.
- `dotnet build BE` → 0 Warning(s), 0 Error(s).
- `dotnet test BE` → **Passed: 352, Failed: 0, Skipped: 0** (349 before; +3 new).
- `docker --version` → `command not found`.

### Completion Notes List

- Zero production C# changed — the connection string was already fully configuration-driven; only the *supply* of the host was pinned.
- **The bundled `db` service still starts and is still a `service_healthy` dependency of `api` even when `POSTGRES_HOST` points elsewhere.** That is deliberate and documented, not an oversight: the API simply never connects to it. If you are on an external database and want the container gone, `docker compose stop db` after the stack is up, or add a local override file. Removing the dependency unconditionally would break the default single-box deployment, which is the common case.
- `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` continue to serve double duty: they initialize the bundled volume *and* feed the API's connection string. With an external host the first role is dead weight but harmless — the credentials you put there are the ones the API uses against the remote server.
- Trailing-`;` decision verified rather than assumed (AC 5c).
- Not verified live: no Docker in this environment, so the substitution was not observed expanding for real. CI's `docker compose config --quiet` covers the defaults path on the next push.

### File List

- `docker-compose.yml` (modified — host/port/options are now `${...:-}` substitutions)
- `.env.production.example` (modified — three documented Postgres connection variables)
- `CLAUDE.md` (modified — Docker/Production section records the override)
- `docs/deployment.md` (modified — `.env` guidance for an external Postgres)
- `BE/TripPlanner.Tests/ComposeConnectionStringTemplateTests.cs` (new — guards the template)
- `_bmad-output/implementation-artifacts/archive/10-3-postgres-host-in-env.md` (new — this story)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — story registered)

## Change Log

- 2026-07-28: Story drafted and implemented. `Host=db;Port=5432` became `Host=${POSTGRES_HOST:-db};Port=${POSTGRES_PORT:-5432}` with an appended `${POSTGRES_OPTIONS:-}` so a TLS-requiring managed Postgres is reachable; `.env.production.example` declares and documents all three; a new test expands the template out of `docker-compose.yml` and validates it through `NpgsqlConnectionStringBuilder` (RED-verified). Docs updated in `CLAUDE.md` and `docs/deployment.md`, including the caveat that the bundled `db` container keeps running unused when an external host is configured. Moved to review.
