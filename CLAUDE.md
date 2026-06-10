# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Build the solution
dotnet build

# Run the API
dotnet run --project TripPlanner.API

# Run with hot reload
dotnet watch --project TripPlanner.API

# Restore packages
dotnet restore
```

There are no test projects configured. The API exposes Swagger UI at `/swagger` when running in Development mode.

## Architecture

This is a **Clean Architecture** ASP.NET Core 10.0 solution with four layers:

- **`TripPlanner.Domain`** — Entity models only; no logic. Contains `Trip`, `TripDay`, `Destination` (abstract base), `Landmark`, and `Restaurant`.
- **`TripPlanner.Application`** — Currently a stub; intended for application-level use cases and orchestration.
- **`TripPlanner.Infrastructure`** — Currently a stub; intended for data access. For now, `MemoryDbContext` (a simple in-memory list store) lives in the API project.
- **`TripPlanner.API`** — All active logic: endpoints, services, validators, DTOs, middleware.

## Key Patterns

**Minimal APIs (no controllers):** Routes are defined in static endpoint classes (`TripEndpoints`, `DestinationEndpoints`) using `MapGroup`/`RouteGroupBuilder`. Endpoint handlers receive dependencies via method parameters resolved by DI.

**Result pattern:** Services return `Result<T>` or `Result` (sealed records in `TripPlanner.API.Common`) instead of throwing exceptions. Always check `IsSuccess` before accessing `Data`.

**Service layer:** `ITripService`, `ITripDayService`, `IDestinationService` interfaces with implementations under `Services.Implementation`. Register new services in `AppServicesExtension`.

**Validation:** FluentValidation validators auto-run on endpoint parameters via `SharpGrip.FluentValidation.AutoValidation.Endpoints`. Add validators to the DI container and they apply automatically.

**AutoMapper:** A single `MappingProfile` handles all DTO mappings, including polymorphic mapping of `Destination` subtypes to `DestinationResponse`.

**Model inheritance:** `Destination` is abstract. `Landmark` and `Restaurant` extend it. Any new destination type must inherit from `Destination`.

**Middleware:** `ExceptionHandlingMiddleware` catches unhandled exceptions and returns structured errors. `LoggingMiddleware` logs all requests/responses. Both are registered in `Program.cs`.
