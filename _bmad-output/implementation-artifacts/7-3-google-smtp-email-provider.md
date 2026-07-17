---
baseline_commit: 88cb11e2412536895d73bf4607f8aa7df954545e
---

# Story 7.3: Add Google SMTP as a config-selectable verification-email provider

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the TripPlanner platform operator,
I want a Google (Gmail) SMTP `IEmailSender` implementation that can be selected via configuration,
so that verification emails can be delivered through a Gmail account (`smtp.gmail.com` + App Password) instead of Resend, by setting one config value and no code changes — exercising the provider-swap seam that story 7-2 introduced.

## Acceptance Criteria

1. A new `GoogleSmtpSettings` class is added to `BE/TripPlanner.Infrastructure/Settings/` (section name `"GoogleSmtpSettings"`) holding transport-only fields, mirroring `ResendSettings`: `Username` (the Gmail address used for SMTP AUTH), `AppPassword` (a Google App Password, not the account password), `SmtpHost` (default `"smtp.gmail.com"`), `SmtpPort` (default `587`), `TimeoutMilliseconds` (default `10000`). It is a `sealed class` with `init` properties, matching the `ResendSettings` shape.
2. `EmailSettings` (`BE/TripPlanner.Infrastructure/Settings/EmailSettings.cs`) gains a `Provider` field (default `"Resend"`) that selects which `IEmailSender` transport is wired at startup. Valid values are `"Resend"` and `"Google"` (case-insensitive). No other `EmailSettings` field changes; content fields (`FromAddress`, `FromName`, `VerificationUrlBase`, `TokenExpiryHours`) remain provider-agnostic and shared by both transports.
3. A new `GoogleEmailSender` class is added to `BE/TripPlanner.Infrastructure/ExternalServices/Google/`, implementing `IEmailSender`. It depends on `IVerificationEmailContentBuilder` (for content — reused unchanged) and `IOptions<GoogleSmtpSettings>` (for transport only). `SendVerificationEmailAsync` calls `contentBuilder.Build(toEmail, rawToken)`, maps the returned `VerificationEmailContent` to a `MimeMessage` (`From`, `To`, `Subject`, `TextBody` mapped 1:1), then performs the same MailKit SMTP sequence used by `ResendEmailSender` but with Gmail credentials: `client.Timeout = TimeoutMilliseconds` → `ConnectAsync(SmtpHost, SmtpPort, SecureSocketOptions.StartTls, ct)` → `AuthenticateAsync(Username, AppPassword, ct)` → `SendAsync(message, ct)` → `DisconnectAsync(true, ct)`. A static `BuildMessage(VerificationEmailContent)` test seam is exposed, mirroring `ResendEmailSender.BuildMessage`, so message shape can be unit-tested without a live SMTP connection.
4. `InfrastructureServicesExtension.AddInfrastructureServices` reads the provider selector (`EmailSettings:Provider`, defaulting to `"Resend"` when absent) and registers exactly one `IEmailSender` accordingly: `"Google"` → `GoogleEmailSender`, anything else → `ResendEmailSender` (the current default). Only the selected provider's transport settings are bound and validated with `ValidateOnStart()` — when `Provider = "Resend"`, `ResendSettings` is validated (as today) and `GoogleSmtpSettings` is not required; when `Provider = "Google"`, `GoogleSmtpSettings` is validated (`Username`, `AppPassword`, `SmtpHost` non-empty; `SmtpPort`, `TimeoutMilliseconds > 0`) and `ResendSettings` is not required. This prevents blank credentials for the unused provider from failing startup.
5. `EmailSettings` validation is extended so `Provider` must be one of the accepted values (`"Resend"` / `"Google"`, case-insensitive); the existing `FromAddress`/`VerificationUrlBase`/`TokenExpiryHours` validations are unchanged. `IVerificationEmailContentBuilder → VerificationEmailContentBuilder` registration is unchanged (`AddScoped`). The selected `IEmailSender` is registered `AddScoped`, matching the existing registration lifetime.
6. `BE/TripPlanner.API/appsettings.json` and `BE/.env.example` gain: a `Provider` key in the `EmailSettings` section defaulting to `"Resend"`, and a new `GoogleSmtpSettings` section/`GoogleSmtpSettings__*` block (`Username`, `AppPassword` blank for local dev, `SmtpHost` = `"smtp.gmail.com"`, `SmtpPort` = `587`, `TimeoutMilliseconds` = `10000`). `.env.example` includes a short note that `AppPassword` is a Google App Password (requires 2-Step Verification enabled on the account), not the Gmail login password. No existing values change.
7. `RegisterUserUseCase`, `ResendVerificationEmailUseCase`, the `IEmailSender` public contract (`SendVerificationEmailAsync(toEmail, rawToken, ct)`), `IVerificationEmailContentBuilder`, `VerificationEmailContentBuilder`, and `ResendEmailSender` behavior are all unchanged — every change in this story is additive Infrastructure (new settings class, new sender, DI selection) plus the one `Provider` field on `EmailSettings` and config/docs. Switching providers requires only setting `EmailSettings:Provider` (or `EmailSettings__Provider`) — no code changes.
8. `CLAUDE.md`'s "Email verification" bullet (under Key Patterns) is updated to document that `IEmailSender` now has two implementations — `ResendEmailSender` (Resend SMTP relay) and `GoogleEmailSender` (Gmail SMTP via App Password) — selected at startup by `EmailSettings:Provider` (`Resend` default | `Google`), with only the selected provider's transport settings bound/validated.
9. `dotnet test BE` passes, including: a new `GoogleEmailSenderTests` asserting the `MimeMessage` shape from `GoogleEmailSender.BuildMessage(content)` and that `SendVerificationEmailAsync` throws against an unreachable host (mirroring `ResendEmailSenderTests`); a new `GoogleSmtpSettingsValidationTests` exercising `GoogleSmtpSettings` valid/invalid cases with `EmailSettings:Provider = "Google"`; a new provider-selection test asserting the resolved `IEmailSender` is `ResendEmailSender` when `Provider` is absent/`"Resend"` and `GoogleEmailSender` when `Provider = "Google"`; and the existing `ResendSettingsValidationTests`/`ResendEmailSenderTests`/`EmailSettingsValidationTests` still pass unchanged (default provider remains Resend).

## Tasks / Subtasks

- [x] Task 1: Add Google transport settings and the provider selector field (AC: #1, #2)
  - [x] Add `BE/TripPlanner.Infrastructure/Settings/GoogleSmtpSettings.cs` (`SectionName = "GoogleSmtpSettings"`, `sealed class`, `init` props: `Username`, `AppPassword`, `SmtpHost` default `"smtp.gmail.com"`, `SmtpPort` default `587`, `TimeoutMilliseconds` default `10000`)
  - [x] Add a `Provider` property (default `"Resend"`) to `BE/TripPlanner.Infrastructure/Settings/EmailSettings.cs`
- [x] Task 2: Implement `GoogleEmailSender` (AC: #3)
  - [x] Add `BE/TripPlanner.Infrastructure/ExternalServices/Google/GoogleEmailSender.cs` implementing `IEmailSender`, taking `IVerificationEmailContentBuilder` + `IOptions<GoogleSmtpSettings>`, with a static `BuildMessage(VerificationEmailContent)` helper mirroring `ResendEmailSender`, and the connect/authenticate(Username, AppPassword)/send/disconnect StartTls sequence
- [x] Task 3: DI provider selection + validation (AC: #4, #5)
  - [x] In `InfrastructureServicesExtension.AddInfrastructureServices`, read `configuration.GetSection(EmailSettings.SectionName)["Provider"]` (default `"Resend"`); extend `EmailSettings` validation with a `Provider`-is-accepted-value check
  - [x] When provider is `"Google"` (case-insensitive): bind + validate `GoogleSmtpSettings` (`Username`/`AppPassword`/`SmtpHost` non-empty, `SmtpPort`/`TimeoutMilliseconds > 0`) with `ValidateOnStart()`, and register `services.AddScoped<IEmailSender, GoogleEmailSender>()`
  - [x] Otherwise (default): keep the existing `ResendSettings` bind+validate and `services.AddScoped<IEmailSender, ResendEmailSender>()`; move the Resend options binding/validation into this branch so it is not required when Google is selected
- [x] Task 4: Configuration + documentation (AC: #6, #8)
  - [x] Update `BE/TripPlanner.API/appsettings.json`: add `"Provider": "Resend"` to `EmailSettings`, add a `GoogleSmtpSettings` section (`Username`/`AppPassword` blank, `SmtpHost` `"smtp.gmail.com"`, `SmtpPort` `587`, `TimeoutMilliseconds` `10000`)
  - [x] Update `BE/.env.example`: add `EmailSettings__Provider=Resend` and the `GoogleSmtpSettings__*` block, with a note that `AppPassword` is a Google App Password (needs 2-Step Verification)
  - [x] Update the "Email verification" bullet in `CLAUDE.md` to document the two `IEmailSender` implementations and the `EmailSettings:Provider` selector
- [x] Task 5: Tests (AC: #9)
  - [x] Add `BE/TripPlanner.Tests/GoogleEmailSenderTests.cs`: `BuildMessage_ReturnsExpectedShape` (From/To/Subject/link/expiry-hours from a `VerificationEmailContent`) and `SendVerificationEmailAsync_UnreachableSmtpHost_Throws` (invalid host/port, NSubstitute fake `IVerificationEmailContentBuilder`)
  - [x] Add `BE/TripPlanner.Tests/GoogleSmtpSettingsValidationTests.cs`: build the provider with `EmailSettings:Provider = "Google"` + valid `GoogleSmtpSettings`, assert `Validate()` passes; `[Theory]` invalid cases for `Username`/`AppPassword`/`SmtpHost`/`SmtpPort`/`TimeoutMilliseconds` throw `OptionsValidationException`
  - [x] Add `BE/TripPlanner.Tests/EmailProviderSelectionTests.cs`: resolve `IEmailSender` with no `Provider` and with `Provider = "Resend"` → `ResendEmailSender`; with `Provider = "Google"` (+ valid `GoogleSmtpSettings`) → `GoogleEmailSender`
  - [x] Run `dotnet test BE` and confirm the full suite passes with no regressions (existing `ResendSettingsValidationTests`, `ResendEmailSenderTests`, `EmailSettingsValidationTests`, `AuthServiceTests`, etc. unchanged)

### Review Findings

- [x] [Review][Patch] Document that Gmail rewrites the `From` header — `EmailSettings:FromAddress` is overridden [BE/.env.example] — Gmail's SMTP relay rewrites the `From` to the authenticated account (`GoogleSmtpSettings:Username`) unless it is a verified "Send mail as" alias, so verification emails ship from the operator's Gmail, not the configured no-reply address (inherent to Gmail SMTP, unlike Resend's verified sending domain). Resolution (decision): defer the code behavior, add a note to `.env.example` that `FromAddress` is overridden by Gmail to the `Username` account.
- [x] [Review][Patch] Empty/whitespace `EmailSettings:Provider` crashes startup instead of defaulting to Resend [BE/TripPlanner.Infrastructure/Extensions/InfrastructureServicesExtension.cs:66] — `["Provider"] ?? "Resend"` only guards `null`; an explicitly-empty value (`EmailSettings__Provider=`) or trailing whitespace (`"Google "`) yields a non-matching string that falls to the Resend branch while the `EmailSettings` validator rejects it, producing a hard `OptionsValidationException` at startup with a message that looks wrong. The `??` shows clear intent to default; complete it with `IsNullOrWhiteSpace` + `Trim()` (and trim in the validator/selector consistently).
- [x] [Review][Patch] Test gap: Google-mode startup tolerating blank/absent Resend credentials is unverified [BE/TripPlanner.Tests/GoogleSmtpSettingsValidationTests.cs] — AC4's core promise (only the active provider's transport settings are validated) has no test: every Google-mode test supplies valid `ResendSettings` in its base config, so a regression reintroducing unconditional Resend validation would break every Google deployment with blank Resend creds and the suite would stay green. Add a test: `Provider=Google` + valid `GoogleSmtpSettings` + absent/blank `ResendSettings` asserts `Validate()` does not throw.
- [x] [Review][Defer] Test gap: Google SMTP auth wiring (`Username`/`AppPassword`, StartTls) unverified [BE/TripPlanner.Tests/GoogleEmailSenderTests.cs:53] — deferred, pre-existing. The one line distinguishing this sender (`AuthenticateAsync(Username, AppPassword)`) is correct by inspection, but the `ThrowsAnyAsync<Exception>` unreachable-host test fails at `ConnectAsync` and never observes credentials; a copy-paste leaving `"resend"` would pass. Mirrors the equally-untested `ResendEmailSenderTests`; closing it needs a local fake SMTP server (a mock would not count).
- [x] [Review][Defer] Port 465 (Gmail implicit-SSL) unsupported — `SecureSocketOptions.StartTls` hard-coded while `SmtpPort` is configurable [BE/TripPlanner.Infrastructure/ExternalServices/Google/GoogleEmailSender.cs:24] — deferred, pre-existing. Connecting to 465 with StartTls fails the handshake; the config surface invites a value the code cannot honor. Mirrors `ResendEmailSender` exactly; default `587` works and a TLS-mode toggle is out of this story's scope.

## Dev Notes

- **This is the payoff of 7-2.** Story 7-2 split content (`IVerificationEmailContentBuilder`, reads `EmailSettings`) from transport (`IEmailSender`, reads a provider settings class). Adding Google is therefore: a new transport settings class (`GoogleSmtpSettings`), a new `IEmailSender` (`GoogleEmailSender`) that reuses the shared content builder, and a DI selection — exactly the "new class + DI swap" procedure 7-2 documented. Content copy and the use cases are untouched.
- **Config-selectable, not compile-time.** The user chose a runtime selector: `EmailSettings:Provider` decides which transport is wired at startup. Read it in `AddInfrastructureServices` via `configuration.GetSection(EmailSettings.SectionName)["Provider"]` (options aren't resolvable during registration, so read raw config here). Default to `"Resend"` so existing deployments and tests are unaffected.
- **Only validate the active provider.** `ValidateOnStart()` runs unconditionally for every registered options block, so registering *both* Resend and Google validators would force the operator to fill in credentials for the provider they aren't using. Register/validate only the selected provider's transport settings inside the selection branch. `EmailSettings` (content, always needed) stays validated unconditionally.
- **Gmail transport specifics** — `smtp.gmail.com:587` with `SecureSocketOptions.StartTls`; `AuthenticateAsync(Username, AppPassword)`. Gmail no longer allows plain account-password SMTP AUTH — the operator must generate an **App Password** (Google Account → Security → 2-Step Verification → App passwords). This is a deployment/config concern only; the code path is identical to Resend's (which also uses username + secret over StartTls, just `"resend"` + API key). Reflect the App Password requirement in `.env.example`.
- **BuildMessage duplication is intentional / convention.** `ResendEmailSender` exposes a static `BuildMessage(VerificationEmailContent)`; `GoogleEmailSender` mirrors it so each provider stays self-contained (the strategy-pattern convention in this codebase — each `IEmailSender` owns its transport end-to-end). The message shape is provider-agnostic and derived only from `VerificationEmailContent`, so the two bodies are identical; keeping them per-provider matches `ResendEmailSender` rather than introducing a new shared abstraction not asked for by this story.
- **New folder:** `BE/TripPlanner.Infrastructure/ExternalServices/Google/` (sibling to `ExternalServices/Resend/`, `ExternalServices/Email/`, `ExternalServices/OpenTripMap/`).
- **Testing standards:** xUnit + NSubstitute (existing convention). For validation tests, follow `ResendSettingsValidationTests` (build a real `ServiceProvider` via `AddInfrastructureServices`, resolve `IStartupValidator`, call `Validate()`); the Google validation test must set `EmailSettings:Provider = "Google"` in the in-memory config so the Google branch is registered. The provider-selection test resolves `IEmailSender` from the built provider and asserts its concrete type.
- **Not in scope:** changing default behavior (Resend stays default), altering email copy, HTML email bodies, per-recipient provider routing, or removing Resend. This story only *adds* Google as an alternative behind the existing seam.

### Project Structure Notes

- New files: `Settings/GoogleSmtpSettings.cs`, `ExternalServices/Google/GoogleEmailSender.cs`, and three test files under `TripPlanner.Tests`.
- Modified files: `Settings/EmailSettings.cs` (add `Provider`), `Extensions/InfrastructureServicesExtension.cs` (provider selection + conditional validation), `appsettings.json`, `.env.example`, `CLAUDE.md`.
- No changes to `TripPlanner.Domain`, `TripPlanner.Application`, or `TripPlanner.API` beyond `appsettings.json`.

### References

- [Source: BE/TripPlanner.Infrastructure/ExternalServices/Resend/ResendEmailSender.cs] — the transport pattern `GoogleEmailSender` mirrors (StartTls connect/auth/send/disconnect, static `BuildMessage`)
- [Source: BE/TripPlanner.Infrastructure/ExternalServices/Email/VerificationEmailContentBuilder.cs] — shared content builder reused unchanged
- [Source: BE/TripPlanner.Infrastructure/Settings/ResendSettings.cs] — transport-settings shape `GoogleSmtpSettings` mirrors
- [Source: BE/TripPlanner.Infrastructure/Settings/EmailSettings.cs] — content settings + where the `Provider` selector is added
- [Source: BE/TripPlanner.Infrastructure/Extensions/InfrastructureServicesExtension.cs] — DI binding/validation/registration to extend with provider selection
- [Source: BE/TripPlanner.Tests/ResendEmailSenderTests.cs] — test shape to mirror for `GoogleEmailSenderTests`
- [Source: BE/TripPlanner.Tests/ResendSettingsValidationTests.cs] — validation-test shape to mirror for `GoogleSmtpSettingsValidationTests`
- [Source: _bmad-output/implementation-artifacts/7-2-email-provider-strategy-pattern.md] — prior story that created the content/transport seams this story extends
- [Source: CLAUDE.md#Key-Patterns, "Email verification"] — documentation to update with the provider selector

## Dev Agent Record

### Agent Model Used

Claude Opus 4.8 (claude-opus-4-8[1m])

### Debug Log References

- `dotnet build BE` — compile succeeded; initial run hit `MSB3021`/`MSB3027` file-lock copy errors from a stale `TripPlanner.API` process (PID 25160) holding the build output (same failure documented in 7-2). Stopped the process (`taskkill /PID 25160 /F`) and rebuilt clean.
- `dotnet test BE` (first pass) — 179/180; `GoogleSmtpSettingsValidationTests.StartupValidation_InvalidProvider_Throws` failed: with `Provider = "Mailgun"` the DI selection falls to the Resend branch, and since that test's base config had no `ResendSettings`, both the invalid-`Provider` check and the absent-`ResendSettings` check failed, so `StartupValidator` raised an `AggregateException` rather than the single `OptionsValidationException` the test asserted.
- Fix: added valid `ResendSettings` to the `GoogleSmtpSettingsValidationTests` base config so an invalid `Provider` produces exactly one failing validator (the `EmailSettings:Provider` check). Re-run: `dotnet test BE` — 180/180 passed, 0 failed, 0 skipped.

### Completion Notes List

- Added `GoogleSmtpSettings` (transport-only, mirrors `ResendSettings`): `Username`, `AppPassword`, `SmtpHost` (`smtp.gmail.com`), `SmtpPort` (587), `TimeoutMilliseconds` (10000).
- Added a `Provider` selector (default `"Resend"`) to `EmailSettings`; content fields unchanged and still shared by both transports.
- Added `GoogleEmailSender : IEmailSender` in `ExternalServices/Google/`, reusing `IVerificationEmailContentBuilder` for content and authenticating with `Username` + `AppPassword` over the same StartTls connect/auth/send/disconnect sequence as `ResendEmailSender`. Static `BuildMessage(VerificationEmailContent)` test seam mirrors Resend's (message shape is provider-agnostic, so the two bodies are identical by design — each provider stays self-contained per the codebase convention).
- DI: `AddInfrastructureServices` reads `EmailSettings:Provider` from raw configuration (options aren't resolvable during registration) and registers exactly one `IEmailSender`. Only the selected provider's transport settings are bound + validated with `ValidateOnStart()`, so blank credentials for the unused provider never fail startup. `EmailSettings` validation extended with an accepted-`Provider` check (`Resend`/`Google`, case-insensitive).
- Config: `appsettings.json` gained `EmailSettings:Provider` + a `GoogleSmtpSettings` section; `.env.example` gained `EmailSettings__Provider=Resend`, the `GoogleSmtpSettings__*` block, and a note that `AppPassword` is a Google App Password (requires 2-Step Verification). No existing values changed. Resend remains the default.
- `RegisterUserUseCase`, `ResendVerificationEmailUseCase`, `IEmailSender`, `IVerificationEmailContentBuilder`, `VerificationEmailContentBuilder`, and `ResendEmailSender` are all unchanged — switching to Gmail is a pure config change (`EmailSettings:Provider=Google` + the `GoogleSmtpSettings__*` credentials).
- Updated `CLAUDE.md`'s "Email verification" bullet to document the two transports and the `EmailSettings:Provider` selector.
- Tests: added `GoogleEmailSenderTests` (message shape + unreachable-host throws), `GoogleSmtpSettingsValidationTests` (valid + 5 invalid field cases + invalid-provider), and `EmailProviderSelectionTests` (absent/`Resend`/`resend` → `ResendEmailSender`; `Google`/`google` → `GoogleEmailSender`). Full suite: 180/180 passing (was 126 at the 7-2 snapshot; suite has grown since). No existing tests modified except the base-config fix noted above.

### File List

- BE/TripPlanner.Infrastructure/Settings/GoogleSmtpSettings.cs (added)
- BE/TripPlanner.Infrastructure/Settings/EmailSettings.cs (modified — added `Provider`)
- BE/TripPlanner.Infrastructure/ExternalServices/Google/GoogleEmailSender.cs (added)
- BE/TripPlanner.Infrastructure/Extensions/InfrastructureServicesExtension.cs (modified — provider selection + conditional transport binding/validation)
- BE/TripPlanner.API/appsettings.json (modified — `EmailSettings:Provider` + `GoogleSmtpSettings` section)
- BE/.env.example (modified — `EmailSettings__Provider` + `GoogleSmtpSettings__*` block + App Password note)
- CLAUDE.md (modified — Email verification bullet documents both transports + selector)
- BE/TripPlanner.Tests/GoogleEmailSenderTests.cs (added)
- BE/TripPlanner.Tests/GoogleSmtpSettingsValidationTests.cs (added)
- BE/TripPlanner.Tests/EmailProviderSelectionTests.cs (added)

## Change Log

- 2026-07-16: Implemented Story 7.3 — added Google (Gmail) SMTP as a config-selectable verification-email provider (`GoogleEmailSender` + `GoogleSmtpSettings`), selected at startup via `EmailSettings:Provider` (`Resend` default | `Google`), reusing the shared `IVerificationEmailContentBuilder`; only the active provider's transport settings are bound/validated. Updated config, docs, and tests. `dotnet test BE` passes (180/180).
