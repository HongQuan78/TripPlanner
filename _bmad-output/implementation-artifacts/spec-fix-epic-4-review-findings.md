---
title: 'Fix epic-4 code-review findings (D1a–D4a, P1–P8)'
type: 'bugfix'
created: '2026-07-10'
status: 'in-review'
review_loop_iteration: 0
baseline_revision: '22d4621a162ba47d6f2761079ea63254de5a68eb'
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/code-review-epic-4-findings.md'
  - '{project-root}/epic/epic-4-user-authentication.md'
warnings: [multiple-goals, oversized]
---

<intent-contract>

## Intent

**Problem:** The epic-4 code review left 12 accepted findings unfixed: an account-existence oracle in login, no resend cooldown, a registration TOCTOU race that 500s, cancellation swallowed as email failure, unvalidated email config, a non-unique verification-token index, missing SMTP timeout, doc/env-example drift, and unit-test gaps.

**Approach:** Apply all 4 resolved decisions and 8 patches from `code-review-epic-4-findings.md` in order (D1a→D4a, then P1→P8), including one new EF migration covering the cooldown column and the unique token-hash index, and mark each finding's checkbox done in that file.

## Boundaries & Constraints

**Always:** Preserve anti-enumeration: register and resend keep returning the identical generic success in every branch (duplicate, cooldown, unknown, already-verified, send-failure). Keep Clean Architecture — Application/Domain must not reference EF Core or Infrastructure/API types; translate the DB unique-violation in Infrastructure into an Application-defined exception. Follow CLAUDE.md style: braces everywhere, no comments. All existing tests must still pass (one login test's expected message changes per D2b).

**Block If:** The `Tests → Infrastructure/API` project references create a build cycle, or `dotnet ef migrations add` cannot run in this environment.

**Never:** Do not change the GET verb of `/verify-email` (D1a keeps it; risk is documented instead). Do not touch the deferred items (case-insensitive email, TimeProvider). Do not re-litigate dismissed findings. Do not add a distinct "wait before resending" error message. Do not apply the migration to a database (`dotnet ef database update` is out of scope); only generate it.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Login, correct password, unverified email | valid creds, `IsEmailVerified=false` | ~~401 with message exactly `Invalid email or password.` (D2b)~~ — **D2b REVERSED 2026-07-26 by story `4-5-unverified-login-message`:** 401 with message exactly `Your email address is not verified. Please check your inbox.` The check must stay below the password guard. | Unauthorized result |
| Resend inside cooldown | unverified user, `LastVerificationEmailSentAt` < 60s ago | Generic success; token NOT regenerated, email NOT sent (D3b) | None |
| Resend after cooldown | unverified user, last send ≥ 60s ago (or null) | Token regenerated, email sent, `LastVerificationEmailSentAt` stamped | None |
| Concurrent duplicate registration | unique-index violation on email during `SaveChangesAsync` | Generic success response, no email sent (P1) | Catch translated unique-violation exception |
| Request cancelled during email send | `OperationCanceledException` from `IEmailSender` | Exception propagates (not logged-and-swallowed) (P2) | Rethrow via `when` filter |
| App start with empty `FromAddress`/`SmtpHost`/`VerificationUrlBase` or `TokenExpiryHours <= 0` | invalid `EmailSettings` | Startup fails fast with options validation error (P3) | `ValidateOnStart` |
| Verify token for user with `VerificationTokenExpiresAt == null` | hash matches, expiry null | 400 `Invalid or expired verification token.` (P8 test) | BadRequest result |
| Verify with whitespace-only token | `"   "` | 400 without repository lookup (P8 test) | BadRequest result |
| Resend when email send throws (non-cancellation) | `IEmailSender` throws `Exception` | Generic success still returned, error logged (P8 test) | Swallowed + logged |

</intent-contract>

## Code Map

- `_bmad-output/implementation-artifacts/code-review-epic-4-findings.md` -- source of truth; tick checkboxes as findings are fixed
- `epic/epic-4-user-authentication.md` -- D1a risk note, D2b US3 text (gitignored, edit locally)
- `BE/TripPlanner.Domain/Models/User.cs` -- add `LastVerificationEmailSentAt` + `RecordVerificationEmailSent` (D3b)
- `BE/TripPlanner.Application/UseCases/Auth/LoginUserUseCase.cs` -- unverified message → generic (D2b — **reversed 2026-07-26, story `4-5-unverified-login-message`**)
- `BE/TripPlanner.Application/UseCases/Auth/RegisterUserUseCase.cs` -- P1 catch, P2 filter, D3b stamp
- `BE/TripPlanner.Application/UseCases/Auth/ResendVerificationEmailUseCase.cs` -- D3b cooldown, P2 filter
- `BE/TripPlanner.Application/Common/` -- Result pattern lives here; add `Exceptions/UniqueConstraintViolationException.cs` (P1)
- `BE/TripPlanner.Infrastructure/Persistence/UnitOfWork.cs` -- translate `DbUpdateException` unique violation (P1)
- `BE/TripPlanner.Infrastructure/Extensions/InfrastructureServicesExtension.cs` -- `AddOptions<EmailSettings>().Bind().Validate().ValidateOnStart()` (P3)
- `BE/TripPlanner.Infrastructure/Settings/EmailSettings.cs` -- add `TimeoutSeconds` (default 10) (P7)
- `BE/TripPlanner.Infrastructure/Email/SmtpEmailSender.cs` -- set `client.Timeout` (P7)
- `BE/TripPlanner.Infrastructure/Data/Configurations/UserConfiguration.cs` -- unique token-hash index (P4), map new column (D3b)
- `BE/TripPlanner.Infrastructure/Migrations/` -- one new migration for D3b + P4
- `BE/.env.example` -- add `EmailSettings__*` keys (P5)
- `CLAUDE.md` -- P6 framework-deps sentence, D4a dependency-direction line
- `BE/TripPlanner.Tests/TripPlanner.Tests.csproj` -- add Infrastructure + API references (D4a)
- `BE/TripPlanner.Tests/AuthServiceTests.cs` -- D2b/D3b/P1/P2/P8 tests
- `BE/TripPlanner.API/Extensions/ResultExtension.cs:35-43` -- mapping under test (D4a, no change)
- `BE/TripPlanner.Infrastructure/Security/VerificationTokenService.cs` -- under test (D4a, no change)

## Tasks & Acceptance

**Execution (top-down per findings file):**
- `epic/epic-4-user-authentication.md` -- D1a: append Known risk 6: `GET /verify-email` links may be auto-clicked by corporate mail scanners, silently verifying accounts — accepted MVP risk; a POST-confirm page is the future fix. D2b: amend US3 Status text so unverified login returns the generic `Invalid email or password.` (no distinct verify-first message; closes the password/account oracle).
- `BE/TripPlanner.Application/UseCases/Auth/LoginUserUseCase.cs` -- D2b: unverified branch returns `Invalid email or password.` (keep the check after password verification).

> **D2b was reversed on 2026-07-26 by story `4-5-unverified-login-message`.** The two D2b lines above (and the matrix row) describe the behavior as it was specified in this pass; they are no longer the target state. Current behavior: the unverified branch returns `Your email address is not verified. Please check your inbox.`, still *after* the password guard. If you are working from this spec, do not re-apply D2b.
- `BE/TripPlanner.Domain/Models/User.cs` -- D3b: add `DateTime? LastVerificationEmailSentAt` (private setter) and `RecordVerificationEmailSent(DateTime sentAtUtc)`.
- `BE/TripPlanner.Application/UseCases/Auth/ResendVerificationEmailUseCase.cs` -- D3b: private const 60-second cooldown; if `LastVerificationEmailSentAt` is within it, return generic success without regenerating or sending; otherwise stamp it (before `SaveChangesAsync`) alongside the new token. P2: change catch to `catch (Exception ex) when (ex is not OperationCanceledException)`.
- `BE/TripPlanner.Application/UseCases/Auth/RegisterUserUseCase.cs` -- D3b: stamp `RecordVerificationEmailSent` on the new user before save. P1: wrap `SaveChangesAsync` to catch `UniqueConstraintViolationException` and return the generic success (no email send). P2: same `when` filter on the send catch.
- `BE/TripPlanner.Application/Common/Exceptions/UniqueConstraintViolationException.cs` -- P1: new exception type (framework-free).
- `BE/TripPlanner.Infrastructure/Persistence/UnitOfWork.cs` -- P1: catch `DbUpdateException` whose inner `PostgresException.SqlState == "23505"`, rethrow as `UniqueConstraintViolationException`.
- `BE/TripPlanner.Infrastructure/Extensions/InfrastructureServicesExtension.cs` -- P3: bind `EmailSettings` via `AddOptions<>().Bind(configuration.GetSection(...)).Validate(...)` requiring non-empty `SmtpHost`, `FromAddress`, `VerificationUrlBase`, `TokenExpiryHours > 0`, `TimeoutSeconds > 0`, then `.ValidateOnStart()`.
- `BE/TripPlanner.Infrastructure/Data/Configurations/UserConfiguration.cs` -- P4: make the `VerificationTokenHash` index `.IsUnique()`.
- `BE/TripPlanner.Infrastructure/Migrations` -- D3b+P4: generate one migration (e.g. `AddResendCooldownAndUniqueTokenIndex`) via `dotnet ef migrations add` adding the column and unique index. Do not apply it.
- `BE/.env.example` -- P5: add all `EmailSettings__*` keys with the local-sink defaults (`SmtpHost=localhost`, `SmtpPort=1025`, `UseStartTls=false`, empty creds, `FromAddress`, `FromName`, `VerificationUrlBase=http://localhost:<port>/api/auth/verify-email`, `TokenExpiryHours=24`, `TimeoutSeconds=10`).
- `CLAUDE.md` -- P6: change the Application bullet to say its only framework dependency is `Microsoft.Extensions.Logging.Abstractions`. D4a: dependency direction gains `Tests → API, Infrastructure, Application, Domain`. Mention the resend cooldown and generic unverified-login message in the email-verification/JWT sections so docs match behavior.
- `BE/TripPlanner.Infrastructure/Email/SmtpEmailSender.cs` -- P7: set `client.Timeout = settings.TimeoutSeconds * 1000` (add `TimeoutSeconds` init prop, default 10, to `EmailSettings`).
- `BE/TripPlanner.Tests/TripPlanner.Tests.csproj` -- D4a: add ProjectReferences to `TripPlanner.Infrastructure` and `TripPlanner.API`.
- `BE/TripPlanner.Tests/VerificationTokenServiceTests.cs` -- D4a: new tests — `Generate()` round-trip (`Hash(RawToken) == TokenHash`, hash is 64 hex chars, expiry ≈ now + `TokenExpiryHours`); use `Options.Create(new EmailSettings {...})`.
- `BE/TripPlanner.Tests/ResultExtensionTests.cs` -- D4a: new test — a failure `Result` with `ErrorType.Unauthorized` maps to HTTP 401 via `ToResponse`.
- `BE/TripPlanner.Tests/AuthServiceTests.cs` -- D2b: update `LoginAsync_UnverifiedEmail_ReturnsUnauthorized` expected message. D3b: cooldown-active (no regen/send, generic success) and cooldown-elapsed (regen + send + stamp) tests. P1: `SaveChangesAsync` throws `UniqueConstraintViolationException` → generic success, no send. P2: send throws `OperationCanceledException` → propagates (register and resend). P8: null-`VerificationTokenExpiresAt` verify → 400; whitespace-only token → 400 with no repo call; resend send-throws → generic success.
- `_bmad-output/implementation-artifacts/code-review-epic-4-findings.md` -- tick the 12 checkboxes (D1a–D4a, P1–P8) as each lands.

**Acceptance Criteria:**
- Given the solution, when `dotnet build BE` and `dotnet test BE` run, then both succeed with all new and existing tests green.
- Given invalid `EmailSettings` (empty `FromAddress`), when the API starts, then it fails at startup rather than at send time.
- Given the new migration, when its `Up` is inspected, then it adds nullable `LastVerificationEmailSentAt` and replaces the token-hash index with a unique one, and no other migration is modified.
- Given the findings file, when the run completes, then all 12 non-deferred checkboxes are checked.

## Design Notes

- P1 boundary: Application owns `UniqueConstraintViolationException`; only `UnitOfWork` (Infrastructure) references `DbUpdateException`/`PostgresException`. Register treats it as "duplicate email" → same generic success, no send.
- D3b anti-enumeration: a cooldown-blocked resend must be indistinguishable from a successful one at the API surface.
- P3: keep the other two settings' existing lambda-bind form; only `EmailSettings` moves to `AddOptions` (validation was the point, not pattern churn).
- `dotnet ef migrations add` needs no live database (design-time factory exists). If `dotnet-ef` is missing, install locally (`dotnet tool install --global dotnet-ef` or use a local tool manifest) before declaring the environment blocked.

## Verification

**Commands:**
- `dotnet build BE` -- expected: build succeeded, no warnings introduced by this change
- `dotnet test BE` -- expected: all tests pass, including the ~10 new ones
- `dotnet ef migrations add AddResendCooldownAndUniqueTokenIndex --project BE/TripPlanner.Infrastructure --startup-project BE/TripPlanner.API` -- expected: migration generated with only the column add + unique index swap

**Manual checks (if no CLI):**
- Findings file shows all 12 target checkboxes ticked; epic doc contains the new risk and amended US3 text.

## Spec Change Log

- 2026-07-10: Added `BE/TripPlanner.Tests/EmailSettingsValidationTests.cs` (not in the original task list) to cover the matrix row "App start with invalid `EmailSettings` fails fast" — exercises the real `AddInfrastructureServices` registration via `IStartupValidator` with valid settings plus each invalid variation.

## Review Triage Log
