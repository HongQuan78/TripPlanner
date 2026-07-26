# Epic 4: User Authentication

Source: `requirement/Sheet1.html` — Feature 4: User Authentication

## Summary

Let users create an account with email and password, activate it by verifying their email address, log in to access their trips, and log out to end their session. This epic covers the full MVP slice of Feature 4: all four user stories are "Selected = Yes" (US1 sign up, US2 verify email, US3 log in, US4 log out), all Medium priority. NFR6 (users can only view/modify their own trips) is planned in `epic-3-trip-planner.md` and not repeated here.

Like Epic 3, much of this feature already exists — register, login, and logout endpoints are implemented with PBKDF2 password hashing, HS256 JWTs, and a jti-based token blacklist. The epic's real work is two things: **email verification** (US2 — entirely missing, including any email-sending infrastructure) as the account activation gate, and **closing the account-enumeration leak** in registration (today a duplicate email returns "Email is already registered.", violating the sheet's own business rule to "send generic error messages to avoid account enumeration").

**Resolved sheet conflicts (product decisions):**
1. US2's user story and AC cells are empty in the sheet — this epic authors them. "Verify email to **activate** account" is taken literally: **login is blocked until the email is verified**, and register no longer returns a JWT. This amends US1 AC6 ("continue signed-in after sign-up") to "see a check-your-inbox confirmation after sign-up."
2. US1 AC4 ("see a message when the email is already registered") conflicts with the anti-enumeration business rule. **Anti-enumeration wins**: duplicate registration returns the same generic "check your inbox" success response as a fresh sign-up.

## In-scope user stories

### US1 — Sign up with email and password (Medium)

> As a user, I want to create an account so I can access the app with my own identity.

**Acceptance criteria (amended per decisions above)**
1. Open the sign-up screen.
2. Enter an email address and password.
3. Create an account when the email is not already registered.
4. See the same generic "check your inbox" confirmation whether or not the email was already registered.
5. See a message when the password does not meet requirements.
6. Receive a verification email after successful sign-up.

**Business rules**
- Require unique email per account.
- Enforce password policy (MVP): min 8 chars.
- Store passwords using strong hashing.
- Send generic error messages to avoid account enumeration.

**Status:** Implemented — register returns a generic `MessageResponse` (identical for fresh and duplicate emails, no JWT), stamps a verification token on the new user, and sends the verification email; an SMTP failure after commit is logged and still returns the generic success.

### US2 — Verify email to activate account (Medium)

> As a user, I want to verify my email address so my account is activated and I can log in.

**Acceptance criteria (authored — sheet row is empty)**
1. Receive an email containing a verification link after signing up.
2. Click the link to activate the account and see a success confirmation.
3. See a clear error when the verification link is invalid or expired.
4. Request a new verification email when the previous link expired or never arrived.
5. Log in successfully only after the email is verified.
6. A verification link works only once.

**Business rules**
- Verification token: 32 random bytes (base64url), stored hashed (SHA-256), 24-hour expiry, single-use.
- Resending verification regenerates the token and invalidates the previous link.
- Resend responds with the same generic success whether or not the email exists or is already verified.

**Status:** Implemented — `VerifyEmailUseCase` and `ResendVerificationEmailUseCase` behind `GET /api/auth/verify-email` and `POST /api/auth/resend-verification`; MailKit `SmtpEmailSender` + `EmailSettings`, `VerificationTokenService` (32-byte base64url token, SHA-256 at rest), and migration `AddEmailVerification` with a verified backfill for pre-existing accounts.

### US3 — Log in with email and password (Medium)

> As a user, I want to log in so I can access my account.

**Acceptance criteria**
1. Open the login screen.
2. Enter an email address and password.
3. Sign in when credentials are valid.
4. See a message when credentials are invalid.
5. Stay signed in after refreshing the page.

**Status:** Implemented — unverified accounts are blocked with the distinct "Your email address is not verified. Please check your inbox.", checked only **after** the password verifies; wrong-password and unknown-email failures keep the generic "Invalid email or password." All login failures return 401 via `ErrorType.Unauthorized`. AC 5 is a frontend concern (persist the Bearer token; `JwtSettings.ExpirationMinutes` is 60).

> **Amended 2026-07-26 (story `4-5-unverified-login-message`):** this reverses review decision D2b, which had collapsed the unverified branch into the generic message to close a password/account oracle. Because the verification check sits *below* the password guard, the distinct message only ever reaches a caller who already holds correct credentials, so a *single* login attempt is not an enumeration oracle. The ordering is the invariant that makes this safe and is pinned by `AuthServiceTests.LoginAsync_UnverifiedEmailWithWrongPassword_ReturnsGenericMessage`.
>
> **Accepted residual risk (code review, 2026-07-26):** a register-then-login *pair* still distinguishes a registered address, because `RegisterUserUseCase` no-ops on a duplicate without changing the existing password — so a caller-chosen password succeeds to the not-verified message only when the address was free. The two properties are mutually exclusive under open registration, so this was accepted rather than closed: exploiting it mails the victim an unsolicited verification link and squats the address, and rate limiting (absent everywhere on the login endpoint) is the tracked mitigation. See `_bmad-output/implementation-artifacts/deferred-work.md`.

### US4 — Log out (Medium)

> As a user, I want to log out so I can end my session.

**Acceptance criteria**
1. Click the "Log out" option.
2. End the session immediately.
3. See the app return to a logged-out state.
4. Prevent access to pages after logging out.

**Status:** Already implemented — `POST /api/auth/logout` (authorized) revokes the token's `jti` via `ITokenBlacklist`, and `JwtExtension.OnTokenValidated` rejects revoked tokens on every subsequent request, satisfying AC 4 server-side. No changes in this epic. Known limitation: the blacklist is in-memory (process-local, cleared on restart) — acceptable for MVP, noted under risks.

## Out of scope / backlog (not part of this epic)

- **Refresh tokens / long-lived sessions:** "stay signed in" relies on the 60-minute access token; silent renewal is future work.
- **Persistent/distributed token blacklist:** the in-memory singleton does not survive restarts or scale across instances.
- **Password reset ("forgot password"):** not in the sheet; the verification-email plumbing built here (token service, email sender) is directly reusable when it arrives.
- **"You already have an account" email on duplicate registration:** a nicety on top of the generic response; the resend endpoint covers stranded users.
- **NFR6 (per-user trip authorization):** planned in Epic 3.

## Technical approach

**Domain (`TripPlanner.Domain/Models/User.cs`):**
- Add `IsEmailVerified` (bool), `VerificationTokenHash` (string?), `VerificationTokenExpiresAt` (DateTime?) with private setters; new users are unverified by default.
- Add `SetVerificationToken(string tokenHash, DateTime expiresAtUtc)` and `VerifyEmail()` (sets the flag and nulls both token fields, making tokens single-use). Constructor unchanged.

**Application:**
- Add `ErrorType.Unauthorized` and a 401 arm in `ResultExtension` — the same one-enum-value extension pattern Epic 3 uses for `Conflict`/409.
- New service ports in `Interfaces/Services/`: `IEmailSender.SendVerificationEmailAsync(toEmail, rawToken, ct)` (semantic, not generic send — keeps templating, subject, and link construction out of Application) and `IVerificationTokenService` (`Generate()` returning raw token + hash, `Hash(rawToken)`).
- New DTOs: `MessageResponse { Message }`, `ResendVerificationRequest { Email }`. `AuthResponse` remains for login; `RegisterRequest`/`LoginRequest` unchanged.
- `IUserRepository` gains `GetByVerificationTokenHashAsync(tokenHash)`.
- `RegisterUserUseCase` rewritten to return `Result<MessageResponse>`: duplicate email → identical generic success with no write and no email; fresh email → hash password, create user, generate + store token, save, then send the email in a try/catch — an SMTP failure after commit is logged and still returns the generic success (failing the request would strand a committed user row; resend is the recovery path).
- `LoginUserUseCase` gains the verified gate after password verification; failures return `Unauthorized`.
- New `VerifyEmailUseCase` (empty/unknown/expired/already-used token → `BadRequest` "Invalid or expired verification token."; valid → `VerifyEmail()` + save) and `ResendVerificationEmailUseCase` (unknown or already-verified email → generic success without sending; otherwise regenerate token, save, try-send).

**Infrastructure:**
- Add the **MailKit** package; `Email/SmtpEmailSender.cs` builds the link as `{VerificationUrlBase}?token={rawToken}` — config-driven rather than request-derived, avoiding Host-header injection into emails and working behind proxies.
- `Settings/EmailSettings.cs` mirroring the `JwtSettings` options pattern: `SmtpHost`, `SmtpPort` (587), `UseStartTls` (true), `Username`, `Password`, `FromAddress`, `FromName`, `VerificationUrlBase`, `TokenExpiryHours` (24); bound from `.env` via `EmailSettings__*` keys.
- `Security/VerificationTokenService.cs`: `RandomNumberGenerator` 32 bytes → base64url raw token; SHA-256 hash for storage, so a DB leak cannot activate accounts.
- `UserConfiguration`: configure the three new columns plus a non-unique index on `VerificationTokenHash` for the verify lookup.
- Migration `AddEmailVerification` with a backfill `UPDATE users SET "IsEmailVerified" = true` so existing dev accounts keep logging in — the gate applies only to accounts created after this epic.

**API (`Endpoints/AuthEndpoints.cs`):**
- `GET /api/auth/verify-email?token=...` → 200 `MessageResponse` or 400 ProblemDetails (GET because the email link is clicked directly; no frontend page required).
- `POST /api/auth/resend-verification` → always 200 generic `MessageResponse`.
- New `ResendVerificationRequestValidator` (required + email format), auto-applied by the existing FluentValidation wiring. Register the two new use cases in `AppServicesExtension`; register `IEmailSender`/`IVerificationTokenService` and bind `EmailSettings` in `InfrastructureServicesExtension`.

## Known risks / open questions

1. **Breaking API change:** `POST /api/auth/register` no longer returns `AuthResponse` — clients must switch from auto-sign-in to a "check your inbox" state. This is the deliberate consequence of the activation decision.
2. **Timing side channel on register:** the fresh path pays PBKDF2 (100k iterations) plus an SMTP round-trip; the duplicate path does not. A patient attacker could distinguish them by response time. Documented and accepted for MVP.
3. **SMTP dependency in dev:** local development needs an SMTP sink — Mailpit or smtp4dev (`EmailSettings__SmtpHost=localhost`, port 1025, `UseStartTls=false`) keeps sign-up testable without real credentials.
4. **In-memory token blacklist:** logout revocation is process-local and lost on restart (pre-existing limitation, out of scope).
5. **Email deliverability:** spam filtering, SPF/DKIM, and bounce handling are operational concerns beyond MVP; the resend endpoint is the user-facing mitigation.
6. **Mail-scanner auto-verification:** `GET /verify-email` links may be auto-clicked by corporate mail scanners, silently verifying accounts — accepted MVP risk; a POST-confirm page is the future fix.

## Key new components (reference)

| Layer | Component | Purpose |
|---|---|---|
| Domain | `User.IsEmailVerified`, `VerificationTokenHash`, `VerificationTokenExpiresAt`, `SetVerificationToken(...)`, `VerifyEmail()` (modified `User`) | Verification state + single-use token semantics |
| Application | `IEmailSender`, `IVerificationTokenService` | Ports for email delivery and token generation/hashing |
| Application | `IVerifyEmailUseCase`, `IResendVerificationEmailUseCase` | US2 activation and recovery flows |
| Application | `RegisterUserUseCase`, `LoginUserUseCase` (modified) | Generic duplicate response + verification email; unverified login gate |
| Application | `MessageResponse`, `ResendVerificationRequest` | New DTOs |
| Application | `ErrorType.Unauthorized` (modified enum), `IUserRepository` (modified) | 401 signal; `GetByVerificationTokenHashAsync` |
| Infrastructure | `SmtpEmailSender` (MailKit), `EmailSettings` | SMTP adapter + options-bound config |
| Infrastructure | `VerificationTokenService` | 32-byte random token, SHA-256 hash at rest |
| Infrastructure | `UserConfiguration` (modified), migration `AddEmailVerification` | New columns + token-hash index; verified backfill for existing users |
| API | `AuthEndpoints` (modified) | `GET /api/auth/verify-email`, `POST /api/auth/resend-verification` |
| API | `ResendVerificationRequestValidator`, `ResultExtension` (modified) | Request validation; Unauthorized → 401 mapping |

## Test approach

Unit tests (xUnit + NSubstitute, `Method_Scenario_ExpectedResult` naming, extending `AuthServiceTests.cs`; new substitutes for `IEmailSender` and `IVerificationTokenService`, `NullLogger` for the register use case):

- **Updated existing tests:** register success asserts generic message + token stamped on user + email sent (no JWT); duplicate-email test becomes "returns same generic success without saving or sending"; login-success arranges a verified user; invalid-password and unknown-email tests expect `ErrorType.Unauthorized`.
- **`RegisterUserUseCase`:** email send throws → still returns generic success.
- **`LoginUserUseCase`:** correct password but unverified → `Unauthorized` with the verify message.
- **`VerifyEmailUseCase`:** valid token → user verified, token fields cleared, changes saved; expired token → `BadRequest`; unknown token → `BadRequest`; empty token → `BadRequest`.
- **`ResendVerificationEmailUseCase`:** unverified user → token regenerated and email sent; unknown email → generic success without sending; already-verified → generic success without sending.
