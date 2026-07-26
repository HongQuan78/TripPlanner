# Code Review Findings — Epic 4: User Authentication

- **Reviewed:** commit `ac53976` (feat: add email verification for user authentication) vs `e16f7f5`
- **Spec:** `epic/epic-4-user-authentication.md`
- **Date:** 2026-07-10
- **Layers:** Blind Hunter, Edge Case Hunter, Verification Gap Reviewer, Acceptance Auditor
- **Triage:** 4 decision-needed (all resolved → patch), 8 patch, 2 defer, 8 dismissed

## Resolved decisions

- [x] [Review][Decision→Patch] **D1a — Keep `GET /verify-email`; document mail-scanner auto-verification as an accepted MVP risk** in the epic's Known risks section.
- [x] [Review][Decision→Patch] ~~**D2b — Unverified login returns the generic "Invalid email or password."**~~ **REVERSED 2026-07-26 by story `4-5-unverified-login-message`** (user decision, on a UX complaint that the generic copy made unverified users retype a password that was never wrong). Login now returns the distinct `Your email address is not verified. Please check your inbox.` once the password verifies; the check stays *below* the password guard, so wrong-password and unknown-email failures keep the generic copy and a single attempt discloses nothing. The residual register-then-login pair oracle was reviewed on 2026-07-26 and accepted — see `deferred-work.md`. Original rationale kept above as the record of what was decided in this pass; do not re-apply it.
- [x] [Review][Decision→Patch] **D3b — Per-address cooldown (min 60s) between verification emails**, stored on the user and enforced in the resend flow; new column + migration.
- [x] [Review][Decision→Patch] **D4a — Allow `Tests → Infrastructure/API` references**; add unit tests for the real `VerificationTokenService` round-trip and the `ErrorType.Unauthorized` → 401 mapping in `ResultExtension`; amend CLAUDE.md dependency direction.

## Patches

- [x] [Review][Patch] **P1 — TOCTOU race on duplicate registration**: concurrent registrations pass the `existing` check; the email unique index makes `SaveChangesAsync` throw an unhandled `DbUpdateException` → 500 instead of the generic success. [BE/TripPlanner.Application/UseCases/Auth/RegisterUserUseCase.cs]
- [x] [Review][Patch] **P2 — `catch (Exception)` swallows `OperationCanceledException`** around email sends, converting a cancelled request into a logged "error" + 200. [BE/TripPlanner.Application/UseCases/Auth/RegisterUserUseCase.cs, ResendVerificationEmailUseCase.cs]
- [x] [Review][Patch] **P3 — `EmailSettings` has no startup validation**: empty `FromAddress`/`VerificationUrlBase`/`SmtpHost` or non-positive `TokenExpiryHours` fails only at send time and is swallowed into log noise. [BE/TripPlanner.Infrastructure/Extensions/InfrastructureServicesExtension.cs]
- [x] [Review][Patch] **P4 — Non-unique index on `VerificationTokenHash`**: the token is the sole activation credential; a unique index turns a collision into a hard failure instead of verifying an arbitrary account. [BE/TripPlanner.Infrastructure/Data/Configurations/UserConfiguration.cs]
- [x] [Review][Patch] **P5 — `.env.example` documents none of the `EmailSettings__*` keys** CLAUDE.md tells developers to override. [BE/.env.example]
- [x] [Review][Patch] **P6 — CLAUDE.md says Application has "No framework dependencies"** but the commit added `Microsoft.Extensions.Logging.Abstractions` to it. [CLAUDE.md]
- [x] [Review][Patch] **P7 — No explicit timeout on the MailKit `SmtpClient`** (default 2 min — long for a request-path call). [BE/TripPlanner.Infrastructure/Email/SmtpEmailSender.cs]
- [x] [Review][Patch] **P8 — Unit-test gaps**: `VerificationTokenExpiresAt is null` branch, whitespace-only token, resend-when-send-throws. [BE/TripPlanner.Tests/AuthServiceTests.cs]

## Deferred (pre-existing, not caused by this change)

- [x] [Review][Defer] Case-sensitive email lookup (`u.Email == email`) — affects login/register/resend alike; predates this epic.
- [x] [Review][Defer] Direct `DateTime.UtcNow` with no `TimeProvider` abstraction — existing pattern across the codebase; makes expiry-boundary behavior untestable deterministically.

## Dismissed (specified or accepted in the epic)

Register timing side-channel (Known risk 2); swallowed SMTP failure returning generic success (US1 status); duplicate registration sending nothing (out-of-scope backlog item); resend invalidating old links (US2 business rule); used-token second click returning 400 (US2 AC6); raw-JSON verify landing page (technical approach: "no frontend page required"); breaking register API change (Known risk 1); `EmailSettings` binding pattern (false positive — mirrors the existing `JwtSettings` lambda form).
