---
baseline_commit: f00b40f4c8dcc65b031ea66b055918d806f36eb7
---

# Story 6.2: Backend code review against epics 1-4

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the project owner,
I want a code-level review of the BE backend implementation against each of the four backend epic documents (epic-1 destination-suggestion, epic-2 destination-details, epic-3 trip-planner, epic-4 user-authentication),
so that I know whether the code actually behaves as each epic's "Technical approach" and user-story acceptance criteria describe — not just that endpoints/files with the right names exist.

Origin: user request (2026-07-13) — "create story or task to verify and review all the code of backend project with the epic and requirement... review code and implementation of epic and requirement, not a document." Distinct from story [[6-1-backend-requirements-verification]], which audited the backend against `requirement/Sheet1.html` row-by-row and produced a requirements traceability matrix. This story instead reviews actual code behavior/correctness against the four epic docs in `epic/` — reading real logic, not documenting endpoint presence.

## Scope

- Source of truth for expected behavior: `epic/epic-1-destination-suggestion.md`, `epic/epic-2-destination-details.md`, `epic/epic-3-trip-planner.md`, `epic/epic-4-user-authentication.md` — specifically each epic's "In-scope user stories" (ACs + business rules) and "Technical approach" sections, which describe the implementation as built.
- Audit target is the backend only (`BE/`). Every claim in an epic's Technical approach section (specific class names, methods, validation rules, error mappings, edge-case handling) must be checked against the actual code — read the file, not the epic's description of it.
- This is a code-behavior review, not a documentation-presence check: for each claim, either confirm the code does what the epic says (with file:line evidence), or record a deviation/bug/gap.
- Out of scope: fixing any gaps found. Each confirmed deviation becomes a recommendation with a concrete fix and a suggested follow-up story title, same format as story 6-1's findings summary.
- Do not re-derive requirements-vs-sheet traceability (that's 6-1's job, already done) — this story's job is: "does the code match what the epic says the code does, and is that code correct/bug-free."

## Acceptance Criteria

1. **Review report** exists at `_bmad-output/implementation-artifacts/backend-code-review-report.md` with one section per epic (1-4), each containing a table with one row per Technical-approach claim / AC / business rule, a verdict (`CONFIRMED`, `DEVIATION`, `BUG`, `GAP`, `FE-scope`), a code reference (`file:line`), and a one-line justification.
2. **Epic 1 (Destination Suggestion)** reviewed: `SearchLocationsUseCase` (country-code hint resolution, dedup by lowercased name+country code, cap at 5, City/Country classification via `CountryNameHelper`, display-name normalization) and `GetAttractionsForLocationUseCase` (20 km default radius, 20-item cap, per-xid detail fan-out via `Task.WhenAll`, graceful degradation on `HttpRequestException`/`TaskCanceledException`/`JsonException`) against the actual code in `Application/UseCases/Location/`, `Infrastructure/ExternalServices/OpenTripMap/`, and `Application/Helpers/CountryNameHelper.cs`. Confirm `OpenTripMapGeocodingService` treats a 404 as an empty result (not an exception) and that provider failures map to `ErrorType.ServiceUnavailable`.
3. **Epic 2 (Destination Details)** reviewed: `IGetDestinationDetailsUseCase` error mapping (empty/whitespace xid → validation error; unknown xid → `NotFound`; success otherwise), `OpenTripMapDestinationDetailsService` field mapping (name, category from `kinds`, Wikipedia-extract description, preview image, composed address, website), and the xid-upsert path in `AddDestinationToTripDayUseCase`/`AddDestinationToDayRequest` (creates a new `Destination` when none exists by that xid, reuses an existing one when found) — verify this against `Application/UseCases/TripDay/AddDestinationToTripDayUseCase.cs` and its request DTO, not just the epic's description of the decision.
4. **Epic 3 (Trip Planner)** reviewed: `Trip.UserId` ownership stamping in `CreateTripUseCase`; every trip/trip-day use case (`GetTrip`, `GetAllTrips`, `AddDestinationToTripDay`, `RemoveDestinationFromTripDay`) scoped by `userId` such that another user's trip id behaves as `NotFound` (not `Forbidden`); `Trip.Update(name, startDate, endDate)` day-reconciliation logic (retains in-range `TripDay`s with destinations intact, adds new days, removes out-of-range days); `UpdateTripUseCase`'s confirmation contract (dropping days with destinations + `Confirmed=false` → `ErrorType.Conflict`, same + `Confirmed=true` → success) — read `Domain/Models/Trip.cs`, `Application/UseCases/Trip/UpdateTripUseCase.cs`, and `Infrastructure/Repositories/TripRepository.cs` directly, do not trust the epic doc's claims about them.
5. **Epic 4 (User Authentication)** reviewed: `RegisterUserUseCase`'s generic-response-on-duplicate-email path (no write, no email sent) versus fresh-email path (hash password, create user, generate token, save, send email in try/catch surviving SMTP failure); `LoginUserUseCase`'s verified-gate ordering (checked only after password verification, both failure paths returning the same generic `Unauthorized` message); `VerifyEmailUseCase` token validation (empty/unknown/expired/already-used → `BadRequest`; valid → `VerifyEmail()` clears both token fields); `VerificationTokenService` (32-byte `RandomNumberGenerator`, SHA-256 hash at rest) — read `Application/UseCases/Auth/*.cs`, `Domain/Models/User.cs`, and `Infrastructure/Security/VerificationTokenService.cs` directly.
6. **Evidence, not assumption:** every verdict cites the exact file:line(s) read; where an epic claims a test covers a behavior, confirm that named test exists in `BE/TripPlanner.Tests` and actually asserts the claimed behavior (open the test, don't take the epic's word for it). Record `dotnet test BE` pass/fail counts in the report.
7. **Findings summary:** the report ends with a summary listing all `DEVIATION`/`BUG`/`GAP` items ordered by severity (High → Medium → Low), each with a concrete recommended fix and a suggested follow-up story title.

## Tasks / Subtasks

- [x] Task 1: Set up review baseline (AC: 1, 6)
  - [x] Re-read all four epic docs in `epic/` and extract every Technical-approach claim, AC, and business rule per epic into the report skeleton (one table per epic, empty verdicts)
  - [x] Build and run the full test suite (`dotnet build BE`, `dotnet test BE`); record pass/fail counts in the report
- [x] Task 2: Review Epic 1 — Destination Suggestion code (AC: 2)
  - [x] Read `Application/UseCases/Location/SearchLocationsUseCase.cs` line-by-line against every claim in epic-1's Technical approach (country-code hint, dedup key, cap-at-5, City/Country classification, display-name casing)
  - [x] Read `Application/UseCases/Location/GetAttractionsForLocationUseCase.cs` against the 20 km default / 20-item cap / detail fan-out claims
  - [x] Read `Infrastructure/ExternalServices/OpenTripMap/OpenTripMapGeocodingService.cs` and `OpenTripMapAttractionSearchService.cs` against the 404-as-empty-result and graceful-degradation-on-failure claims
  - [x] Read `Application/Helpers/CountryNameHelper.cs` against the `RegionInfo`-based, no-hardcoded-list claim
  - [x] Open `LocationServiceTests.cs` and confirm each test named in the epic doc actually exists and asserts the claimed behavior
  - [x] Record verdicts + file:line evidence for every Epic 1 claim in the matrix
- [x] Task 3: Review Epic 2 — Destination Details code (AC: 3)
  - [x] Read the `IGetDestinationDetailsUseCase` implementation against the validation/not-found/success error-mapping claims
  - [x] Read `OpenTripMapDestinationDetailsService` against the field-mapping claims (name, category, description, image, address, website)
  - [x] Read `AddDestinationToTripDayUseCase` and `AddDestinationToDayRequest` against the xid-upsert claim (create-if-absent vs reuse-if-found)
  - [x] Open `GetDestinationDetailsUseCaseTests.cs` and the extended `AddDestinationToTripDayUseCaseTests.cs`; confirm the claimed test scenarios exist and pass
  - [x] Record verdicts + file:line evidence for every Epic 2 claim in the matrix
- [x] Task 4: Review Epic 3 — Trip Planner code (AC: 4)
  - [x] Read `Domain/Models/Trip.cs` — `UserId` field/constructor param and the `Update(name, startDate, endDate)` day-reconciliation logic (retain/add/remove days, destinations on retained days untouched)
  - [x] Read every trip/trip-day use case (`CreateTripUseCase`, `GetTripUseCase`, `GetAllTripsUseCase`, `AddDestinationToTripDayUseCase`, `RemoveDestinationFromTripDayUseCase`, `UpdateTripUseCase`) for correct `userId` parameter threading and stamping
  - [x] Read `Infrastructure/Repositories/TripRepository.cs` — confirm `GetWithDaysAndDestinationsAsync(id, userId)` / `GetAllWithDaysAndDestinationsAsync(userId)` actually filter by `userId` at the query level (not filtered after load)
  - [x] Read `UpdateTripUseCase`'s confirmation-contract logic (dropped-days-with-destinations detection, `Confirmed` flag branching, `ErrorType.Conflict` mapping) and the `TripEndpoints.cs` route wiring for `PUT /api/trips/{id}`
  - [x] Open `TripTests.cs`, `UpdateTripUseCaseTests.cs`, `TripServiceTests.cs`, `TripDayServiceTests.cs`; confirm every scenario the epic claims is tested (shrink/extend/name-only, cross-user NotFound, confirm/unconfirmed conflict) actually exists and passes
  - [x] Record verdicts + file:line evidence for every Epic 3 claim in the matrix
- [x] Task 5: Review Epic 4 — User Authentication code (AC: 5)
  - [x] Read `RegisterUserUseCase` — duplicate-email generic-response path (no write/email) vs fresh-email path (hash, create, token, save, try/catch email send)
  - [x] Read `LoginUserUseCase` — confirm the verified-gate check happens strictly after password verification and both failure branches return the same message/`ErrorType.Unauthorized`
  - [x] Read `VerifyEmailUseCase` and `ResendVerificationEmailUseCase` — token-state branching (empty/unknown/expired/used → BadRequest; valid → clears both token fields) and cooldown/regeneration behavior
  - [x] Read `Domain/Models/User.cs` — `SetVerificationToken`/`VerifyEmail()` mutators and single-use semantics (fields nulled after verify)
  - [x] Read `Infrastructure/Security/VerificationTokenService.cs` — confirm 32-byte `RandomNumberGenerator` source and SHA-256 hashing, not a weaker RNG/hash
  - [x] Open `AuthServiceTests.cs` and confirm every claimed scenario (duplicate-email, unverified-login, valid/expired/unknown/empty token, resend paths) exists and passes
  - [x] Record verdicts + file:line evidence for every Epic 4 claim in the matrix
- [x] Task 6: Finalize the report (AC: 1, 6, 7)
  - [x] For any `CONFIRMED` verdict lacking a covering test, either name the exact covering test or perform and document a manual verification
  - [x] Write the findings summary: all `DEVIATION`/`BUG`/`GAP` ordered High → Medium → Low, each with a recommended fix and a follow-up story title
  - [x] Re-run `dotnet test BE` (final green confirmation) and record the result in the report

## Dev Notes

- This is a review-only story, same discipline as [[6-1-backend-requirements-verification]]: read the actual code before issuing a verdict, do not trust epic docs, CLAUDE.md, or prior completion notes as evidence of correctness — they describe intent; the report must cite implementation. The epic docs describe what was *supposedly* built; this story's entire value is catching places where the code diverges from that description (bugs introduced after the epic was written, incomplete edge-case handling, or claims that were aspirational rather than accurate).
- Distinguish verdict types precisely: `CONFIRMED` (code matches the epic's claim, cite file:line + test), `DEVIATION` (code does something different from the claim but is arguably still correct — record as a documentation drift, not necessarily a bug), `BUG` (code does not correctly implement the underlying AC/business rule — a real defect), `GAP` (claimed behavior has no corresponding code at all), `FE-scope` (the AC is purely frontend, matching 6-1's convention).
- Reuse story 6-1's completed traceability report (`_bmad-output/implementation-artifacts/backend-requirements-verification-report.md`) as background — it already surfaced several implementation issues (geocoding single-result limitation, destination import losing rating/category/image, N+1 attraction detail fan-out, unpopulated `OpeningHours`) that this story should re-verify at the code level rather than duplicate from scratch; cross-reference rather than re-discover.
- Repo conventions apply to any test code written to close an evidence gap: braces required everywhere (see CLAUDE.md Code Style), no comments, xUnit + NSubstitute, `Method_Scenario_ExpectedResult` naming.
- This story modifies no production code. Permitted outputs: the report file, this story file's tracked sections, and (only if needed to prove a verdict) new tests under `BE/TripPlanner.Tests` — any new test must pass and be listed in File List.
- Run `dotnet build BE` / `dotnet test BE` from the repo root per the commands in CLAUDE.md.

### Project Structure Notes

- All review targets live under `BE/` per the Clean Architecture layout in CLAUDE.md (`TripPlanner.Domain` → `TripPlanner.Application` → `TripPlanner.Infrastructure` → `TripPlanner.API`). No new files are expected outside the report and, if evidence gaps require it, `BE/TripPlanner.Tests`.
- No conflicts detected with unified project structure — this is a read-only audit.

### References

- [Source: epic/epic-1-destination-suggestion.md#Technical approach]
- [Source: epic/epic-2-destination-details.md#Technical approach]
- [Source: epic/epic-3-trip-planner.md#Technical approach]
- [Source: epic/epic-4-user-authentication.md#Technical approach]
- [Source: _bmad-output/implementation-artifacts/archive/6-1-backend-requirements-verification.md]
- [Source: _bmad-output/implementation-artifacts/backend-requirements-verification-report.md]
- [Source: CLAUDE.md#Code Style]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5, with four parallel code-review sub-agents (one per epic) reading the actual `BE/` source and test files against each epic doc's Technical approach claims.

### Debug Log References

- `dotnet build BE`: succeeded, 0 warnings / 0 errors.
- `dotnet test BE`: 119 passed / 0 failed / 0 skipped (baseline run before the review and final re-confirmation after — identical, since this story made no production or test code changes).
- Each epic (1-4) was reviewed independently by reading the epic doc's Technical approach/Test approach sections, then tracing the real implementation file:line and the actual test bodies (not just test names) that back each claim.

### Completion Notes List

- Deliverable produced: `_bmad-output/implementation-artifacts/backend-code-review-report.md` — one table per epic (1-4), each row a Technical-approach claim/AC/business rule with a verdict (`CONFIRMED`/`DEVIATION`/`BUG`/`GAP`/`FE-scope`), file:line evidence, and justification; findings summary ordered High → Medium → Low with recommended fixes and follow-up story titles.
- Key finding: **BUG (High)** — `AddDestinationToTripDayUseCase.cs:97` always constructs a `Landmark` with `rating = 0` when importing a destination by xid, regardless of the provider's real category, and drops image/description/address/website entirely. This re-confirms at the code level a defect already flagged in [[6-1-backend-requirements-verification]]'s report.
- Secondary finding: **GAP (Medium)** — the existing xid-import test (`TripDayServiceTests.cs:148-168`) only asserts `Name`/`ExternalId`, so it cannot catch the data-loss bug above.
- Four Low-severity findings: two coverage/dedup gaps in Epic 1 (missing `TaskCanceledException` test for attraction search; no `DistinctBy(xid)` before capping attraction results), and two documentation-drift items where the epic docs reference behavior that doesn't match the code's exact naming/scope (epic-2's `ErrorType.Validation` doesn't exist — actual is `BadRequest`; epic-4 omits the shipped 60s resend cooldown and the unique-constraint race-safety net).
- Epic 3 (Trip Planner) had **zero findings** — every claim, including the safety-critical per-user data isolation for NFR6 (ownership filtering confirmed at the EF query level, not in-memory), matched the code exactly.
- No production or test code was modified — this story is review-only per its Dev Notes; no evidence gaps required writing new tests.

### File List

- `_bmad-output/implementation-artifacts/backend-code-review-report.md` (new)
- `_bmad-output/implementation-artifacts/archive/6-2-backend-code-review-epics-1-4.md` (modified — tracked sections only)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — story status)

## Change Log

- 2026-07-13: Code review executed end-to-end (Tasks 1-6). Review report published covering Epics 1-4, with 1 High (xid-import data loss), 1 Medium (missing regression test), and 4 Low findings; `dotnet test BE` green (119/119) before and after. Status → review.
