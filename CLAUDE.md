# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

The .NET solution lives entirely under `BE/` (`BE/TripPlanner.slnx`). The frontend web app (React + TypeScript + Vite) lives under `FE/`. The repo root also contains `epic/` and `requirement/` (feature docs and source requirements — both version-controlled, so requirements-verification stories can cite them at a pinned commit; only the generated `requirement/resources/sheet.css` is ignored) and `docs/`.

## Commands

Run all `dotnet` commands from the `BE/` directory (or pass `BE/...` paths from the root):

```bash
# Build the solution
dotnet build BE

# Run the API
dotnet run --project BE/TripPlanner.API

# Run with hot reload
dotnet watch --project BE/TripPlanner.API

# Run all tests
dotnet test BE

# Run a single test class or test
dotnet test BE --filter "FullyQualifiedName~UpdateTripUseCaseTests"

# Add a new EF Core migration
dotnet ef migrations add <MigrationName> --project BE/TripPlanner.Infrastructure --startup-project BE/TripPlanner.API

# Apply migrations to the database
dotnet ef database update --project BE/TripPlanner.Infrastructure --startup-project BE/TripPlanner.API
```

The API exposes Swagger UI at `/swagger` when running in Development mode.

Frontend commands run from the `FE/` directory:

```bash
npm install        # install dependencies
npm run dev        # start the Vite dev server (http://localhost:5173)
npm run build      # type-check and build for production
npm test           # run unit tests (Vitest)
npm run lint       # run Oxlint
```

The frontend reads the API base URL from `VITE_API_BASE_URL` (`FE/.env.development`, default `http://localhost:5000`). See `FE/README.md` for details.

Environment variables are loaded via **DotNetEnv**: at startup `Program.cs` walks up from the working directory until it finds a `.env` file (see `BE/.env.example`). Required variables:

```
ConnectionStrings__DefaultConnection=<postgres-connection-string>
JwtSettings__SecretKey=<hs256-secret-key>
OpenTripMapSettings__ApiKey=<opentripmap-api-key>
```

Email verification is sent via Resend's SMTP relay (`smtp.resend.com`, username `resend`, password = the Resend API key), configured through the `ResendSettings` section. `appsettings.json` leaves `ApiKey` blank for local dev; override via `ResendSettings__*` variables for real delivery.

## Docker / Production Deployment

The whole stack is containerized and orchestrated by the root `docker-compose.yml` (services `db`, `api`, `web`):

```bash
cp .env.production.example .env   # then fill in real secrets (kept out of git)
docker compose build
docker compose up
```

The app is served at `http://localhost:8080` (the `web`/nginx service is the only host-facing port, mapped `8080:8080`). nginx serves the built SPA and reverse-proxies `/api/` to the `api` container on port 8080, so the browser talks to a single same-origin — the backend's loopback-only CORS policy is never a factor and needs no widening.

Key mechanics:

- **Backend image** (`BE/Dockerfile`): multi-stage .NET 10 SDK build → ASP.NET runtime, publishes `TripPlanner.API` in Release, runs as a non-root user, listens on `http://+:8080`. The runtime stage installs `curl` (for the compose healthcheck) and `libgssapi-krb5-2` (Npgsql probes for GSSAPI at startup; without it the boot log opens with a misleading `Cannot load library libgssapi_krb5.so.2` error that is harmless but misdirects debugging).
- **Frontend image** (`FE/Dockerfile`): multi-stage Node build (`npm run build`) → `nginxinc/nginx-unprivileged` serving `dist/` with SPA history-fallback, as a non-root user on port 8080. It is built with `VITE_API_BASE_URL` **empty** so the SPA issues relative, same-origin requests (Vite bakes this at build time). See `FE/nginx.conf`.
- **nginx routing.** The proxy prefixes are declared `location ^~ /api/` and `^~ /swagger`; the `^~` is load-bearing. Without it the regex static-asset location (`~* \.(js|css|svg|…)$`) takes precedence over a plain prefix location in nginx, and any proxied path ending in one of those extensions is served from disk (404) instead of being forwarded. `proxy_pass` goes through `resolver 127.0.0.11` and a variable (`$api_upstream$request_uri`) rather than a literal hostname, so nginx re-resolves the `api` address instead of caching it for the process lifetime — and `nginx -t` works without the `api` container being up.
- **`/swagger` is proxied but inert in production.** The nginx block forwards correctly, and the API returns 404 for it: `Program.cs` maps Swagger only when `IsDevelopment()`, while the container runs `ASPNETCORE_ENVIRONMENT=Production`. The route only becomes live if you override the environment to Development.
- **Config/secrets** are injected at run time as environment variables via the `Section__Key` convention (Compose auto-loads the host-side `.env` for `${...}` substitution); nothing is baked into an image. The compose Postgres connection string uses `Host=db;Port=5432;…` with **no** `SSL Mode=Require` (that fragment in `BE/.env.example` targets a managed cloud Postgres, not the in-network compose DB).
- **Redis is optional and env-sourced.** The `redis` service (`redis:7-alpine`, `redisdata` volume, `redis-cli ping` healthcheck) backs the cache of external-provider responses; it is in-network only and never published to the host. The API reads `ConnectionStrings:Redis` (env `ConnectionStrings__Redis`), which compose supplies as `${ConnectionStrings__Redis:-redis:6379}` — the `:-` form is load-bearing, since a bare `${...}` would expand to empty when unset and silently downgrade every default `up` to a per-process cache while the `redis` container still starts and reports healthy. An **empty** value is a supported configuration, not an error: `AddInfrastructureServices` falls back to `AddDistributedMemoryCache()` rather than failing startup (an empty string reaching `AddStackExchangeRedisCache` would throw `ArgumentException: is empty`), which is why `BE/.env.example` can ship the variable blank for local dev and no test needs a running Redis.
- **Migrations** apply automatically on API startup: `Program.cs` runs `Database.Migrate()` before serving, gated by the `RunMigrationsOnStartup` config flag (default `true` when unset or unparseable; only the literal `false` disables it), so a fresh Postgres volume is schema-ready on first boot. The call is wrapped in a bounded retry (10 attempts, 3s apart) and logs a `Critical` message naming the connection string before rethrowing, so an unreachable DB fails fast with a clear reason instead of a bare stack trace in a crash loop. EF Core takes an `ACCESS EXCLUSIVE` lock on `__EFMigrationsHistory`, so concurrent instances serialize rather than collide. Note the default applies to plain `dotnet run` too — see `BE/.env.example`.
- **Readiness.** `api` has a healthcheck against `/health` (`AddHealthChecks`/`MapHealthChecks`) and `web` waits on `condition: service_healthy`, so nginx does not accept traffic and return 502s while the API is still migrating or starting.
- **Postgres credentials are init-only.** `POSTGRES_DB/USER/PASSWORD` are honored only when the `pgdata` volume is first initialized. Editing them later does not rotate anything — the role keeps its old password while the API connects with the new one (`28P01`). Rotate with `ALTER ROLE` inside the db container, or destroy the volume (which erases all data).
- **DataProtection keys** are persisted to the `dpkeys` named volume; without it ASP.NET warns on every boot and any DataProtection-backed payload would break on redeploy. (JWTs are unaffected — they are signed with the configured HS256 key.)
- **TLS** is expected to terminate at an upstream proxy/load balancer; the containers serve plain HTTP. `UseHttpsRedirection()` is a no-op with no configured HTTPS port. nginx forwards `X-Forwarded-*`, but the API does not call `UseForwardedHeaders`, so `Request.Scheme` stays `http` — do not configure an HTTPS port on the container without adding forwarded-headers handling, or the redirect will loop.

## CI/CD

Workflows live in `.github/workflows/` — **this directory is version-controlled on purpose**; root `.gitignore` used to ignore it, which silently disabled Actions for everyone but the local maintainer (GitHub only runs committed workflows). Do not re-add that ignore entry.

- **`ci.yml`** (push to `master`/`quanhvo`, PR to `master`) — three parallel jobs: backend `dotnet build`/`test`, frontend `lint`/`test`/`build`, and a `containers` job that validates `docker compose config` (against `.env.production.example`) plus `nginx -t`, then builds both images without pushing.
- **`deploy.yml`** (manual `workflow_dispatch`) — builds and pushes `tripplanner-api`/`tripplanner-web` to GHCR, then deploys over SSH to a single EC2 host: pins the checkout to the deployed SHA, `docker pull`s the two images, `docker compose … up -d --no-build`, waits for every service to report healthy, and smoke-tests the public URL. `docker-compose.deploy.yml` swaps `build:` for registry `image:` refs.

**Edge mode is chosen by the `DOMAIN` repository variable.** Unset → `docker-compose.http.yml`, publishing nginx on host port 80. Set → `docker-compose.tls.yml`, running Caddy on 80/443 with automatic Let's Encrypt certificates (`Caddyfile`, certs persisted in the `caddydata` volume) and proxying to `web:8080`. The workflow's smoke test follows the same switch (`http://$EC2_HOST/` vs `https://$DOMAIN/`). TLS **must** terminate at the edge: `Program.cs` never calls `UseForwardedHeaders`, so configuring an HTTPS port on the container would make `UseHttpsRedirection()` redirect to a scheme it cannot see and loop forever.

Images are built on the runner, never on the instance — `docker compose build` compiles the .NET solution and the Vite bundle, which OOMs a 2 GiB box. Deploy secrets (`EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`, optional `EC2_APP_DIR`) and the one-time server preparation are documented in **`docs/deployment.md`**; GHCR auth uses the built-in `GITHUB_TOKEN`, so no PAT is required and packages can stay private.

## Architecture

This is a **Clean Architecture** ASP.NET Core 10.0 solution with five projects:

- **`TripPlanner.Domain`** — Entity models only; no dependencies. Contains `Trip`, `TripDay`, `Destination` (concrete entity), and `User`.
- **`TripPlanner.Application`** — Use cases, interfaces, DTOs, and the Result pattern. Its only framework dependencies are the two contract-only abstraction packages `Microsoft.Extensions.Logging.Abstractions` and `Microsoft.Extensions.DependencyInjection.Abstractions` (the latter solely so the layer can own its own composition root — see `AddApplicationUseCases` below). Neither pulls in an implementation; do not add a package that does.
- **`TripPlanner.Infrastructure`** — EF Core (PostgreSQL), repositories, Mapperly mapping, JWT token service, password hasher, verification token service, Resend SMTP email sender, and external HTTP service clients (OpenTripMap). Implements interfaces defined in Application.
- **`TripPlanner.API`** — HTTP layer: Minimal API endpoints, validators, middleware, and DI wiring. No business logic.
- **`TripPlanner.Tests`** — xUnit unit tests using NSubstitute for mocking.

### Dependency Direction

```
API → Infrastructure → Application → Domain
Tests → API, Infrastructure, Application, Domain
```

Nothing in Application or Domain may reference API or Infrastructure types.

## Key Patterns

**Minimal APIs (no controllers):** Routes are defined in static endpoint classes (`TripEndpoints`, `DestinationEndpoints`, `AuthEndpoints`, `LocationEndpoints`) using `MapGroup`/`RouteGroupBuilder`. Endpoint handlers receive dependencies via method parameters resolved by DI. All endpoint groups are registered in `RouteExtension.AddRoute()`.

**Use Case / Interactor pattern:** Each application operation is a dedicated class with a single `ExecuteAsync` method. Use cases implement an `I<Name>UseCase` interface defined in the same folder. Register new use cases in `ApplicationServicesExtension.AddApplicationUseCases()` (in the **Application** project, mirroring `AddInfrastructureServices` — each layer owns its own composition root; the API only composes the two). `ApplicationServicesRegistrationTests` reflects over every public `I*UseCase` interface under `TripPlanner.Application.UseCases` and fails if one is missing a registration, so a forgotten line is a red test rather than a runtime resolution error.

```
Application/UseCases/
  Trip/        — ICreateTripUseCase, IGetTripUseCase, IGetAllTripsUseCase, IUpdateTripUseCase
  Destination/ — IGetAllDestinationsUseCase, IGetDestinationByIdUseCase
  TripDay/     — IAddDestinationToTripDayUseCase, IRemoveDestinationFromTripDayUseCase
  Auth/        — IRegisterUserUseCase, ILoginUserUseCase, ILogoutUseCase,
                 IVerifyEmailUseCase, IResendVerificationEmailUseCase
  Location/    — ISearchLocationsUseCase, IGetAttractionsForLocationUseCase, IGetDestinationDetailsUseCase
```

**Result pattern:** Use cases return `Result<T>` or `Result` (sealed records in `TripPlanner.Application.Common`). Always check `IsSuccess` before accessing `Data`. Errors carry an `ErrorType` enum value (`BadRequest`, `Unauthorized`, `NotFound`, `Conflict`, `ServiceUnavailable`) and a message string. `ResultExtension.ToResponse()` maps error results to HTTP responses in endpoints.

**Trip ownership:** Trips carry a `UserId`. Trip and TripDay use cases take the authenticated user's id (extracted via `ClaimsPrincipalExtension`) and repository queries are scoped by it — a user can never read or modify another user's trips (a foreign trip id behaves as `NotFound`). Preserve this scoping in any new trip-related query or use case.

**External services:** Application defines service interfaces (`IGeocodingService`, `IAttractionSearchService`, `IDestinationDetailsService` in `Application/Interfaces/Services/`); Infrastructure implements them against the OpenTripMap API in `Infrastructure/ExternalServices/OpenTripMap/`. Clients are registered via `AddHttpClient<TInterface, TImplementation>` with `OpenTripMapSettings` (bound from configuration) providing base URL, API key, and timeout. External API failures surface as `ErrorType.ServiceUnavailable` results, not exceptions. Follow this pattern for any new third-party API integration. `IDestinationImageProvider` (implemented by `WikipediaImageProvider` in `Infrastructure/ExternalServices/Wikipedia/`, via Wikipedia's public REST summary API — no API key involved, unlike the OpenTripMap/Resend integrations) is the sole source of destination images, consumed by both `OpenTripMapAttractionSearchService` and `OpenTripMapDestinationDetailsService`; OpenTripMap's own `preview`/`image` fields are ignored because its dev-tier image URLs are unusable. Swapping to a different image approach requires only a new `IDestinationImageProvider` implementation plus the one DI registration change, mirroring the `IEmailSender` provider-swap convention.

**Repository pattern:** `IRepository<T>` is the generic base and carries exactly two members — `GetByIdAsync` and `Add`. All three specialized repositories (`ITripRepository`, `IDestinationRepository`, `IUserRepository`) extend it and add domain-specific queries; all three implementations derive from `Repository<T>`. Keep the base minimal: a member belongs there only while at least one repository actually uses it (a `Remove` that no caller ever invoked was removed for this reason). `IUnitOfWork` wraps `SaveChangesAsync` for explicit transaction control. All interfaces live in `Application/Interfaces/`; implementations live in `Infrastructure/Repositories/`.

`TripRepository` reaches `TripDay`'s **private** `_items` backing field through a string include path, exposed as the constant `TripRepository.DayDestinationsIncludePath` (`"Days._items.Destination"`) — a string is the only way EF can traverse a backing field. Renaming `_items` in the domain still compiles, so `TripRepositoryIncludePathTests` guards it: it walks the path against `DbContext.Model`, asserts the query translates to SQL touching `trip_days`/`trip_day_destinations`/`destinations`, and pins that an unresolvable path throws. Those tests build the context with `UseNpgsql` and only call `ToQueryString()`, so they need no running database.

**Validation:** FluentValidation validators auto-run on endpoint parameters via `SharpGrip.FluentValidation.AutoValidation.Endpoints`. Add validators to the DI container via `AddValidatorsFromAssembly` and they apply automatically.

**Response DTOs serve three roles — an accepted, deliberate trade-off.** The records in `Application/DTOs/Responses/` are simultaneously (1) the HTTP response body, (2) the return type of the external-provider ports (`DestinationDetailsResponse` ← `IDestinationDetailsService`, `AttractionResponse` ← `IAttractionSearchService`, `LocationSearchResultResponse` ← `IGeocodingService`), and (3) the source for domain imports — `DestinationResolver` builds a `Destination` straight out of `DestinationDetailsResponse`. The consequence is real and must be kept in mind: **renaming or reshaping a field for the frontend is not a presentation-only change** — it forces matching edits in the OpenTripMap adapters and in the import path, and can change what gets persisted. The canonical fix (separate provider-facing models in Application, mapped to `*Response` at the use-case boundary) costs ~1 day across 3 ports, 3 adapters and ~10 test files, and was consciously declined: it is worth paying only once the wire contract and the provider contracts actually start diverging. Until then, do not "clean this up" piecemeal — a half-split is worse than either end state.

**Mapping behind an interface:** Application defines `IApplicationMapper` with typed mapping methods (`MapToTripResponse`, `MapToTripResponseList`, etc.); Infrastructure implements it in `ApplicationMapper`. **The port is the load-bearing part, not the library** — Application and API must never reference the mapping library directly, so the engine behind the port can be swapped without touching a use case (AutoMapper was replaced by Mapperly this way, with zero changes above Infrastructure).

`ApplicationMapper` **is** the mapper: a `[Mapper]`-attributed `partial class` whose five method bodies are generated at compile time by **Riok.Mapperly** (a source generator — `Riok.Mapperly` is referenced by `TripPlanner.Infrastructure` only). There is no runtime configuration graph, no reflection, and no `Profile` class; a renamed or removed member is a **build error or an `RMG*` warning**, not a runtime mapping exception. Only two mappings are not by-name and carry attributes: `Destination.ExternalId → DestinationResponse.Xid` and `Trip.Days → TripResponse.TripDays`. Nested maps (`Trip → TripDay → Destination`) are discovered from the declared partial methods and reused automatically.

Two rules keep this honest. **Unmapped source members are silenced individually, never wholesale.** `Trip.UserId`, `TripDay.Id`, and `TripDay.TripId` have no response counterpart and each carries an explicit `[MapperIgnoreSource(...)]`; RMG020 is a real warning in this configuration (verified by deleting one attribute and watching the build fail its 0-warning bar), so a `NoWarn` or an `.editorconfig` severity override would silently absorb a *future* unmapped member that actually matters. And `ApplicationMapperTests` exercises the **real** `ApplicationMapper` rather than a substitute — every other test class mocks `IApplicationMapper`, so those 13 cases are the only behavioural coverage of the wire projection, including that `TripDayResponse.Destinations` preserves the `Position` ordering of `TripDay.Destinations`.

**Model structure:** `Destination` is a concrete entity with a `Category` property holding the OpenTripMap provider kind **verbatim** (e.g., `"foods"`, `"historic"`, `"museums"`). `Category` is **not** constrained to a closed enum — the provider vocabulary is open-ended, and narrowing it would discard real data. It is backfilled from the database discriminator when migrating from the older subclass schema, but all new imports source it directly from the provider. When the provider supplies no kind, `Category` defaults to `"interesting_places"` (OpenTripMap's own root kind). The second property, `OpeningHours`, is genuinely sourced from Overpass for **any** destination type — the prior split (Landmark-only) lost that data for restaurants at import time. Both properties are required in the schema; `OpeningHours` is nullable at the property level (`string?`) but not at the database level (PostgreSQL `text` columns are nullable, not constrained to non-null for subclass properties). The `DestinationResolver` imports both uniformly: `new Destination(details.Name, rating, details.Category ?? defaultCategory, details.OpeningHours, details.Xid)`. Do not re-introduce inheritance or category enums unless a provider that genuinely varies the data arrives.

**JWT authentication:** `POST /api/auth/login` returns an `AuthResponse` containing a Bearer token; `POST /api/auth/logout` revokes the current token by adding its `jti` claim to `ITokenBlacklist` (in-memory singleton), and `JwtExtension` rejects blacklisted tokens on validation. The `/api/trips` group requires authorization (`RequireAuthorization()`); `/api/locations` and `/api/destinations` are anonymous. JWT is configured in `JwtExtension.AddJwtAuthentication()` using `JwtSettings` bound from configuration.

**Email verification:** `POST /api/auth/register` does not return a token — it returns a generic `MessageResponse` (identical for fresh and duplicate emails, to avoid account enumeration) and sends a verification email. Login is rejected with `Unauthorized` (401) until the email is verified, carrying the distinct message `Your email address is not verified. Please check your inbox.` The verification check runs **after** the password verifies (`LoginUserUseCase.cs`), so the distinct message can only reach a caller who already supplied correct credentials — wrong-password and unknown-email failures both keep the generic `Invalid email or password.` (both literals are named constants on `LoginUserUseCase`). Preserve that ordering: hoisting the verification check above the password guard would make a *single* login attempt an account-enumeration oracle. Note the narrower disclosure that remains and is **accepted**: because `RegisterUserUseCase` no-ops on a duplicate email without touching the existing password, a register-then-login *pair* with a caller-chosen password distinguishes a free address (distinct not-verified message) from a registered one (generic message). That is inherent to disclosing the unverified state at all — see `deferred-work.md` — so do not "fix" it by reverting the message; the endpoint has no rate limiting yet, which is the tracked mitigation. `GET /api/auth/verify-email` consumes the token; `POST /api/auth/resend-verification` reissues it, subject to a per-user 60-second cooldown during which the generic success is returned without regenerating the token or sending an email. `IVerificationTokenService` generates 32-byte base64url tokens stored SHA-256-hashed at rest; `IEmailSender` has two transport implementations — `ResendEmailSender` in `Infrastructure/ExternalServices/Resend/` (SMTP relay `smtp.resend.com`, auth user `resend`) and `GoogleEmailSender` in `Infrastructure/ExternalServices/Google/` (Gmail SMTP `smtp.gmail.com`, auth via a Google App Password) — selected at startup by `EmailSettings:Provider` (`Resend` default | `Google`). Provider selection goes through an explicit registry rather than an `if/else`: each provider owns an `IEmailProviderModule` in `Infrastructure/ExternalServices/Email/Providers/` (`ResendEmailProviderModule`, `GoogleEmailProviderModule`) whose `Register` performs that provider's `AddOptions<TSettings>` bind/validate plus its `AddScoped<IEmailSender, …>`, and `EmailProviderRegistry` is the single source of truth mapping key → module (`DefaultProviderKey` `"Resend"`, case-insensitive match, blank/absent → default, `InvalidOperationException` listing `SupportedKeys` for anything else). `AddInfrastructureServices` holds **zero** provider literals — even the `EmailSettings:Provider` validation delegates to `EmailProviderRegistry.IsSupported` with a message built from `SupportedKeys` — and calls `EmailProviderRegistry.Resolve(...).Register(services, configuration)`. Only the selected provider's transport settings (`ResendSettings` or `GoogleSmtpSettings`) are bound and validated with `ValidateOnStart()`, so blank credentials for the unused provider never fail startup; note an unknown provider value now throws during `AddInfrastructureServices` instead of falling through to Resend. Registration persists the user and sends the verification email inside a single database transaction (`IUnitOfWork.ExecuteInTransactionAsync`): if the email send throws, the transaction is rolled back so no account is created and the endpoint returns `ServiceUnavailable` (503) instead of the generic success — registration is not allowed unless the verification email is dispatched. A concurrent-duplicate `UniqueConstraintViolationException` still rolls back and returns the generic success (no email leak). Email content (subject/link/body) and transport are separate seams: `IVerificationEmailContentBuilder` (implemented by `VerificationEmailContentBuilder` in `Infrastructure/ExternalServices/Email/`, reading `EmailSettings`) builds the provider-agnostic content, while `IEmailSender` implementations handle only transport. The email is sent as `multipart/alternative`: `VerificationEmailContent` carries both `TextBody` (the original plain text, unchanged, and the fallback part) and `HtmlBody`, a branded HTML message rendered from the embedded-resource template `Infrastructure/ExternalServices/Email/Templates/verification-email.html` (manifest name `TripPlanner.Infrastructure.ExternalServices.Email.Templates.verification-email.html`, loaded once by `VerificationEmailTemplate`). `VerificationEmailContentBuilder` substitutes exactly `{{BrandName}}`, `{{ToEmail}}`, `{{VerificationLink}}`, `{{ExpiryHours}}`, each value passed through `WebUtility.HtmlEncode` first — `TextBody` keeps the raw, non-encoded link, since `Uri.EscapeDataString` on the token and HTML-encoding of the rendered link are different escapings at different layers. The template is deliberately email-client-safe (table layout, all critical styling inline, hardcoded Horizon hex values rather than CSS custom properties, a text wordmark instead of a remote image, no JavaScript or webfonts); edit the `.html` file, not a C# string. To add a new provider, implement `IEmailSender` using the existing `IVerificationEmailContentBuilder` for content plus a new provider-specific settings class for transport, add an `IEmailProviderModule` for it and list that module in `EmailProviderRegistry` — `AddInfrastructureServices` needs no edit.

**Middleware:** `ExceptionHandlingMiddleware` implements `IExceptionHandler` and returns structured ProblemDetails with a correlation ID. `LoggingMiddleware` logs all requests and responses and generates the correlation ID. Both are registered in `Program.cs`.

## Feature Docs

Requirements are tracked as epic documents in the `epic/` folder (`epic-1-destination-suggestion.md` through `epic-5-frontend-web-app.md`), each with user stories, acceptance criteria, and per-story status notes; `requirement/Sheet1.html` is the authoritative source they derive from. Both are version-controlled. Consult these files before starting work on a feature to check its scope and status. Where an epic and the sheet disagree (e.g. epic-2 places US4 under "Out of scope" while the sheet marks it `Selected = Yes`), the sheet is authoritative and the divergence is worth recording.

## Code Style

Curly braces are **required** for all control flow statements (`if`, `else`, `for`, `foreach`, `while`, `using`, etc.). Never omit braces, even for a single-statement body. Single-line conditionals without braces are forbidden.

```csharp
// Forbidden
if (success)
    return;

// Required
if (success)
{
    return;
}
```

Do not add comments to code — no XML docs, inline, or block comments.

`BE/.editorconfig` plus `BE/Directory.Build.props` promote **IDE0005** (unnecessary `using`), **IDE0051** (unused private member) and **IDE0052** (unread private member) to build warnings, so dead usings and dead private helpers cannot silently reappear. Two properties make that work and are load-bearing: `EnforceCodeStyleInBuild` (IDE analyzers do not run at build without it) and `GenerateDocumentationFile` (IDE0005 specifically reports nothing unless doc generation is on). Because the latter would otherwise demand XML docs on every public member — directly contradicting the no-comments rule above — `CS1591` is suppressed via `NoWarn`. Generated `Infrastructure/Migrations/*.cs` files are exempted from all three rules in their own `.editorconfig` section; note the section glob is relative to the `.editorconfig`'s own directory (`TripPlanner.Infrastructure/Migrations/*.cs`, **not** `BE/...`), and a wrong prefix silently matches nothing. The build is expected to stay at **0 warnings**.
