---
baseline_commit: f00b40f4c8dcc65b031ea66b055918d806f36eb7
---

# Story 6-1: Backend requirements verification audit

Status: review

## Story

As the project owner, I want a systematic audit of the backend (`BE/`) against the source requirement sheet (`requirement/Sheet1.html`), feature by feature, so I know exactly which selected user stories and business rules are fully implemented, partially implemented, or missing before final delivery.

Origin: user request (2026-07-13) — "double check the backend follows the requirement (requirement/Sheet1.html), separated by feature/function, step by step". Epics 1–4 (backend) predate sprint tracking and were marked `done` without a recorded requirements traceability pass.

## Scope

- Source of truth: `requirement/Sheet1.html` (Google Sheet export). Only rows with **Selected US? = Yes** are in scope as MUST-verify; non-selected rows are checked only if the backend already implements them (report as informational).
- Audit target is the **backend only** (`BE/`). ACs that are purely UI behavior (rendering, placeholders, swiping, redirects after login) are out of scope — record them as `FE-scope` in the matrix, but verify the backend exposes the data/endpoints the UI needs to satisfy them.
- This story produces a report and traceability matrix; it does **not** fix gaps. Each confirmed gap becomes a recommendation for a follow-up story.

## Acceptance Criteria

1. **Traceability matrix** exists at `_bmad-output/implementation-artifacts/backend-requirements-verification-report.md` covering every selected user story and NFR from the sheet, with one row per acceptance criterion / business rule, each marked exactly one of: `PASS`, `PARTIAL`, `FAIL`, `FE-scope`, `N/A` — with a code reference (`file:line` or endpoint) and a one-line justification for every non-`FE-scope` verdict.
2. **Feature 1 (Destination Suggestion)** verified: US2 search by city/country (min-1-char query validation, city+country results with labels, max 5 results, no duplicates, case-insensitive, partial matches, relevance ranking, empty-result behavior) and US3 attractions list (coordinates+radius fetch, city default radius 20 km, max 20 items per page, name/category/rating/image fields, provider ranking) against `LocationEndpoints`, `SearchLocationsUseCase`, `GetAttractionsForLocationUseCase`, and the OpenTripMap clients.
3. **Feature 2 (Destination Details)** verified: US1 details by provider place id (name, category, description, address, opening hours, website; detail still returned when optional fields are missing), US2 photo data (image URL(s) or explicit absence), US4 opening-hours field presence/absence semantics — against `GetDestinationDetailsUseCase` and the details endpoint/DTOs.
4. **Feature 3 (Trip Planner)** verified: US1 create trip (name required), US2 start/end dates (start ≤ end validation, one TripDay per date in range, days updated on date change, behavior when shrinking the range removes planned destinations), US3 add destination to a trip day (day selection, duplicate handling), US7 remove destination from a trip day, US8 auth required on all trip endpoints (`RequireAuthorization`, anonymous request → 401), US10 load saved trips with days and destinations (empty list for new user) — against `TripEndpoints`, Trip/TripDay use cases, and validators.
5. **Feature 4 (User Authentication)** verified: US1 sign-up (unique email, min-8-char password policy, strong password hashing, generic anti-enumeration messages), US2 email verification (token generation, hashed-at-rest storage, verify endpoint, resend with 60 s cooldown, login blocked until verified), US3 login (valid credentials → token, invalid → generic message), US4 logout (token revoked via blacklist, revoked token rejected on subsequent requests) — against `AuthEndpoints`, Auth use cases, `PasswordHasher`, `VerificationTokenService`, `JwtExtension`, and `ITokenBlacklist`.
6. **NFRs** verified: NFR1/NFR2/NFR3 — backend posture for latency targets (HTTP client timeouts, response shaping; note that ms-level SLAs cannot be proven by unit tests, record as design-review verdicts), NFR5 — no unbounded in-memory accumulation of external destination data, NFR6 — every trip/trip-day query and mutation is scoped by authenticated `UserId` and a foreign trip id behaves as `NotFound` (verify per use case and per repository query).
7. **Evidence, not assumption:** every `PASS` is backed by (a) a code reference AND (b) either an existing passing test named in the matrix or a new/manual verification performed during this audit; `dotnet test BE` runs green and its result is recorded in the report.
8. **Findings summary:** the report ends with a summary section listing all `PARTIAL`/`FAIL` items ordered by requirement priority (High → Medium → Low), each with a concrete recommended fix and suggested follow-up story title.

## Tasks / Subtasks

- [x] Task 1: Set up audit baseline (AC: 1, 7)
  - [x] Re-read `requirement/Sheet1.html` and extract every selected US/NFR with its ACs and business rules into the report skeleton (matrix with empty verdicts)
  - [x] Build the solution and run the full test suite (`dotnet build BE`, `dotnet test BE`); record pass/fail counts in the report
  - [x] Inventory the backend surface: list all endpoints from `TripEndpoints`, `DestinationEndpoints`, `AuthEndpoints`, `LocationEndpoints` with auth requirements, and map each to the feature(s) it serves
- [x] Task 2: Verify Feature 1 — Destination Suggestion (AC: 2)
  - [x] US2 step 1: trace `GET /api/locations/search` → validator → `SearchLocationsUseCase` → `IGeocodingService`; check min-length validation, case handling, partial-match support
  - [x] US2 step 2: check result shape (city vs country labeled), max-5 cap, de-duplication, relevance ordering; check empty-result response contract
  - [x] US3 step 1: trace attractions endpoint → `GetAttractionsForLocationUseCase` → `IAttractionSearchService`; check coordinates + radius usage and the 20 km city default
  - [x] US3 step 2: check page size cap (max 20), returned fields (name, category/kinds, rating, image) and ranking parameter sent to OpenTripMap
  - [x] Record verdicts + evidence for every Feature 1 AC/business rule in the matrix
- [x] Task 3: Verify Feature 2 — Destination Details (AC: 3)
  - [x] US1: trace details endpoint → `GetDestinationDetailsUseCase` → `IDestinationDetailsService`; check lookup by provider id (xid) and DTO fields (name, category, description, address, opening hours, website, image)
  - [x] US1: verify missing optional fields do not fail the request (null-tolerant mapping); verify unknown id and upstream failure map to `NotFound` / `ServiceUnavailable`
  - [x] US2 + US4: confirm image and opening-hours fields are nullable/optional in the response contract so the FE can render placeholders
  - [x] Record verdicts + evidence for every Feature 2 AC/business rule in the matrix
- [x] Task 4: Verify Feature 3 — Trip Planner (AC: 4)
  - [x] US1: trace `POST /api/trips` → validator → `CreateTripUseCase`; check name-required rule and response includes the created trip
  - [x] US2: check start/end date validation (start ≤ end), TripDay generation one-per-date, `UpdateTripUseCase` day regeneration on date change, and what happens to destinations on days removed by shrinking the range
  - [x] US3: trace add-destination → `AddDestinationToTripDayUseCase`; check day targeting and duplicate-in-same-day handling
  - [x] US7: trace remove-destination → `RemoveDestinationFromTripDayUseCase`; check not-found and success paths
  - [x] US8: confirm the whole `/api/trips` group has `RequireAuthorization` and `/api/locations` + `/api/destinations` are anonymous
  - [x] US10: trace `GET /api/trips` and `GET /api/trips/{id}` — days and destinations included, empty list (not error) for a user with no trips
  - [x] Record verdicts + evidence for every Feature 3 AC/business rule in the matrix
- [x] Task 5: Verify Feature 4 — User Authentication (AC: 5)
  - [x] US1: trace `POST /api/auth/register` — email uniqueness, password policy (min 8), hashing algorithm used by `PasswordHasher`, generic duplicate-email response (anti-enumeration)
  - [x] US2: verify token generation (32-byte base64url), SHA-256-hashed storage, `GET /api/auth/verify-email` consumption, resend cooldown (60 s), login rejected before verification with the generic message
  - [x] US3: trace `POST /api/auth/login` — valid credentials return `AuthResponse` with Bearer token; invalid credentials return generic `Unauthorized` message
  - [x] US4: trace `POST /api/auth/logout` — `jti` added to `ITokenBlacklist`, `JwtExtension` rejects blacklisted tokens
  - [x] Record verdicts + evidence for every Feature 4 AC/business rule in the matrix
- [x] Task 6: Verify Non-Functional Requirements (AC: 6)
  - [x] NFR1–NFR3: check `OpenTripMapSettings` timeout configuration and any caching; record as design-review verdicts with rationale (latency SLAs not provable in unit tests)
  - [x] NFR5: check external destination data is not accumulated unboundedly in memory (streaming/paged handling, blacklist growth noted)
  - [x] NFR6: for EVERY trip/trip-day use case and repository query, confirm scoping by authenticated `UserId` and that a foreign trip id yields `NotFound`; name the covering tests
  - [x] Record verdicts + evidence for every NFR in the matrix
- [x] Task 7: Close gaps in evidence and finalize the report (AC: 1, 7, 8)
  - [x] For any `PASS` lacking a covering test, either point at the exact existing test or perform and document a manual verification (e.g. run the API and exercise the endpoint)
  - [x] Write the findings summary: all `PARTIAL`/`FAIL` ordered High → Medium → Low, each with a recommended fix and follow-up story title
  - [x] Re-run `dotnet test BE` (final green confirmation) and record the result in the report

## Dev Notes

- Requirement source rows (Selected = Yes) to cover: F1-US2, F1-US3; F2-US1, F2-US2, F2-US4; F3-US1, F3-US2, F3-US3, F3-US7, F3-US8, F3-US10; F4-US1, F4-US2, F4-US3, F4-US4; NFR1, NFR2, NFR3, NFR5 (row marked ambiguously — include), NFR6. Non-selected but possibly implemented (informational only): F1-US1 autocomplete (FE story 5-7 consumes the same search endpoint), F3-US9.
- F1-US3 note in the sheet mentions Foursquare enrichment; the codebase only integrates OpenTripMap — if categories/ratings come solely from OpenTripMap `kinds`/`rate`, judge the AC on data availability, and flag Foursquare as a scope decision, not an automatic FAIL.
- F3-US2 AC5 ("confirm date changes when reducing days would remove planned items") — the confirmation dialog is FE-scope, but the backend must have a defined, documented behavior for destructive date shrinks (silent delete vs error). Whatever it does, verify a test pins it and record the behavior.
- F2 details: the sheet says "fetch details by provider place ID (e.g. OpenTripMap xid)" — verify the endpoint takes the xid, not an internal DB id.
- NFR verdict vocabulary: use `PASS (design)` when the code posture supports the NFR but the SLA itself is unmeasured; do not claim measured latency without measuring.
- Audit discipline: read the actual code before issuing a verdict — do not trust CLAUDE.md or epic docs as evidence; they describe intent, the matrix must cite implementation. Epic docs in `epic/` may be consulted for interpretation of ambiguous ACs.
- This story modifies no production code. Permitted outputs: the report file, this story file's tracked sections, and (only if needed to prove a verdict) new tests under `BE/TripPlanner.Tests` — any new test must pass and be listed in File List.
- Repo conventions still apply to any test code written: braces required everywhere, no comments, xUnit + NSubstitute.

## Dev Agent Record

### Debug Log

- `dotnet build BE`: succeeded, 0 warnings/0 errors. `dotnet test BE`: 119 passed / 0 failed (initial and final runs).
- Requirement sheet extracted by stripping HTML tags from `requirement/Sheet1.html`; all selected rows recovered. Note: the F4-US2 (Verify email) row contains no user-story/AC text in the sheet — verified against the implemented contract documented in the story Dev Notes instead.
- Manual verification session: ran the API locally on `http://localhost:5199` with the real `.env` (Postgres not required for the probed paths). Probes: all 5 `/api/trips` routes + `/api/auth/logout` anonymously → 401; `/api/locations/search` (valid/empty/nonsense query) → 200/400/200-empty; live search `lon`/`PARIS`; live attractions near Paris; live details for xid `N191031796` (confirmed `openingHours: null` and Wikimedia page URL as second image); unknown xid → 404.

### Completion Notes

- Deliverable produced: `_bmad-output/implementation-artifacts/backend-requirements-verification-report.md` — full traceability matrix (every selected US/NFR, one row per AC/business rule, verdict + code reference + justification), endpoint inventory, a focused "Destination model alignment" section (per user request), findings summary with 8 items ordered High → Low, and recorded test runs.
- Key findings: (1) geocoding uses OpenTripMap `geoname` → at most one search result ever (F1-US2 AC2 PARTIAL, High); (2) destinations imported into trips persist only name+xid — rating hardcoded 0, category always "Landmark", no image (F3-US3/US10, High); (3) attraction listing performs 1+N upstream calls, NFR2 latency risk (High); (4) `OpeningHours` never populated — dead DTO field, provider lacks the data, Foursquare never integrated (F2-US4 FAIL, Low priority US); plus 4 lower-severity items.
- Destination model alignment (focused check): read-side OpenTripMap models/DTOs align with the live API (verified against real responses); the persistence-side domain model does not — provider `rate` is a string (`"3h"`) with no conversion to `Destination.Rating` (double), the `Restaurant` subtype is unreachable from the external flow, and provider category/image/coordinates are dropped at import.
- Deliberate deviations recorded as compliant: generic duplicate-email response (anti-enumeration BR), no auto-sign-in after registration (superseded by email verification), stricter password policy, OpenTripMap-only enrichment (Foursquare descoped).
- No production or test code was modified; the audit produced documentation only. Every PASS is backed by a code reference plus a named test or a documented manual probe.

## File List

- `_bmad-output/implementation-artifacts/backend-requirements-verification-report.md` (new)
- `_bmad-output/implementation-artifacts/archive/6-1-backend-requirements-verification.md` (modified — tracked sections only)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — story status)

## Change Log

- 2026-07-13: Story created from user request to audit the backend against `requirement/Sheet1.html`, one task per feature plus NFRs, step-by-step per user story.
- 2026-07-13: Audit executed end-to-end (Tasks 1–7). Traceability report published with 8 PARTIAL/FAIL findings and follow-up story recommendations; `dotnet test BE` green (119/119) before and after. Status → review.
