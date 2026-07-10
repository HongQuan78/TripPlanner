# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

The .NET solution lives entirely under `BE/` (`BE/TripPlanner.slnx`). The repo root also contains `epic/` and `requirement/` (feature docs and source requirements — both gitignored) and `docs/`.

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

Environment variables are loaded via **DotNetEnv**: at startup `Program.cs` walks up from the working directory until it finds a `.env` file (see `BE/.env.example`). Required variables:

```
ConnectionStrings__DefaultConnection=<postgres-connection-string>
JwtSettings__SecretKey=<hs256-secret-key>
OpenTripMapSettings__ApiKey=<opentripmap-api-key>
```

Email verification uses SMTP settings from the `EmailSettings` section. `appsettings.json` defaults target a local dev sink (`localhost:1025`, no TLS, e.g. Mailpit or smtp4dev); override via `EmailSettings__*` variables for real delivery.

## Architecture

This is a **Clean Architecture** ASP.NET Core 10.0 solution with five projects:

- **`TripPlanner.Domain`** — Entity models only; no dependencies. Contains `Trip`, `TripDay`, `Destination` (abstract base), `Landmark`, `Restaurant`, and `User`.
- **`TripPlanner.Application`** — Use cases, interfaces, DTOs, and the Result pattern. No framework dependencies.
- **`TripPlanner.Infrastructure`** — EF Core (PostgreSQL), repositories, AutoMapper, JWT token service, password hasher, verification token service, MailKit SMTP email sender, and external HTTP service clients (OpenTripMap). Implements interfaces defined in Application.
- **`TripPlanner.API`** — HTTP layer: Minimal API endpoints, validators, middleware, and DI wiring. No business logic.
- **`TripPlanner.Tests`** — xUnit unit tests using NSubstitute for mocking.

### Dependency Direction

```
API → Infrastructure → Application → Domain
Tests → Application, Domain
```

Nothing in Application or Domain may reference API or Infrastructure types.

## Key Patterns

**Minimal APIs (no controllers):** Routes are defined in static endpoint classes (`TripEndpoints`, `DestinationEndpoints`, `AuthEndpoints`, `LocationEndpoints`) using `MapGroup`/`RouteGroupBuilder`. Endpoint handlers receive dependencies via method parameters resolved by DI. All endpoint groups are registered in `RouteExtension.AddRoute()`.

**Use Case / Interactor pattern:** Each application operation is a dedicated class with a single `ExecuteAsync` method. Use cases implement an `I<Name>UseCase` interface defined in the same folder. Register new use cases in `AppServicesExtension`.

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

**External services:** Application defines service interfaces (`IGeocodingService`, `IAttractionSearchService`, `IDestinationDetailsService` in `Application/Interfaces/Services/`); Infrastructure implements them against the OpenTripMap API in `Infrastructure/ExternalServices/OpenTripMap/`. Clients are registered via `AddHttpClient<TInterface, TImplementation>` with `OpenTripMapSettings` (bound from configuration) providing base URL, API key, and timeout. External API failures surface as `ErrorType.ServiceUnavailable` results, not exceptions. Follow this pattern for any new third-party API integration.

**Repository pattern:** `IRepository<T>` is the generic base. Specialized repositories (`ITripRepository`, `IDestinationRepository`, `IUserRepository`) extend it with domain-specific queries. `IUnitOfWork` wraps `SaveChangesAsync` for explicit transaction control. All interfaces live in `Application/Interfaces/`; implementations live in `Infrastructure/Repositories/`.

**Validation:** FluentValidation validators auto-run on endpoint parameters via `SharpGrip.FluentValidation.AutoValidation.Endpoints`. Add validators to the DI container via `AddValidatorsFromAssembly` and they apply automatically.

**AutoMapper behind an interface:** AutoMapper lives exclusively in Infrastructure. Application defines `IApplicationMapper` with typed mapping methods (`MapToTripResponse`, `MapToTripResponseList`, etc.). Infrastructure implements it in `ApplicationMapper`. Never reference `IMapper` (AutoMapper) from Application or API.

**Model inheritance:** `Destination` is abstract with a `Category` discriminator column. `Landmark` and `Restaurant` extend it. Any new destination type must inherit from `Destination` and have an EF Core fluent configuration in `Infrastructure/Data/Configurations/`.

**JWT authentication:** `POST /api/auth/login` returns an `AuthResponse` containing a Bearer token; `POST /api/auth/logout` revokes the current token by adding its `jti` claim to `ITokenBlacklist` (in-memory singleton), and `JwtExtension` rejects blacklisted tokens on validation. The `/api/trips` group requires authorization (`RequireAuthorization()`); `/api/locations` and `/api/destinations` are anonymous. JWT is configured in `JwtExtension.AddJwtAuthentication()` using `JwtSettings` bound from configuration.

**Email verification:** `POST /api/auth/register` does not return a token — it returns a generic `MessageResponse` (identical for fresh and duplicate emails, to avoid account enumeration) and sends a verification email. Login is rejected with `Unauthorized` until the email is verified. `GET /api/auth/verify-email` consumes the token; `POST /api/auth/resend-verification` reissues it. `IVerificationTokenService` generates 32-byte base64url tokens stored SHA-256-hashed at rest; `IEmailSender` is implemented by MailKit `SmtpEmailSender` in `Infrastructure/Email/`. An SMTP failure after the user is committed is logged and still returns the generic success response.

**Middleware:** `ExceptionHandlingMiddleware` implements `IExceptionHandler` and returns structured ProblemDetails with a correlation ID. `LoggingMiddleware` logs all requests and responses and generates the correlation ID. Both are registered in `Program.cs`.

## Feature Docs

Requirements are tracked as epic documents in the `epic/` folder (`epic-1-destination-suggestion.md` through `epic-4-user-authentication.md`), each with user stories, acceptance criteria, and per-story status notes. The folder is gitignored, so it exists only locally. Consult these files before starting work on a feature to check its scope and status.

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
