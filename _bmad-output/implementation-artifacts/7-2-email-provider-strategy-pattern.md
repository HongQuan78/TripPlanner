---
baseline_commit: a8ccd6413b7838c7be1b63966f394df500ec2aeb
---

# Story 7.2: Decouple email content from transport so providers are swappable

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the TripPlanner platform,
I want the verification-email *content* (subject/link/body) decoupled from the Resend-specific *transport* (SMTP connect/auth/send),
so that adding a new provider (e.g. Azure Communication Services, SendGrid) later only requires a new `IEmailSender` implementation plus its own settings class and a DI registration change — no changes to `RegisterUserUseCase`, `ResendVerificationEmailUseCase`, `IEmailSender`'s contract, or the email copy itself.

## Acceptance Criteria

1. A new provider-agnostic interface `IVerificationEmailContentBuilder` is added to `BE/TripPlanner.Application/Interfaces/Services/` with a single method `VerificationEmailContent Build(string toEmail, string rawToken)`. `VerificationEmailContent` is a new immutable type (record) in the same namespace carrying `FromAddress`, `FromName`, `ToEmail`, `Subject`, `TextBody` — plain strings only, no MailKit/MimeKit types (Application must stay framework-free per its dependency rule).
2. A new `EmailSettings` class is added to `BE/TripPlanner.Infrastructure/Settings/` (section name `"EmailSettings"`) holding the provider-agnostic fields moved out of `ResendSettings`: `FromAddress`, `FromName`, `VerificationUrlBase`, `TokenExpiryHours` (default `24`). `ResendSettings` is trimmed to only the Resend/SMTP-transport fields: `ApiKey`, `SmtpHost` (default `"smtp.resend.com"`), `SmtpPort` (default `587`), `TimeoutMilliseconds` (default `10000`). `VerificationTokenService` (`BE/TripPlanner.Infrastructure/Security/VerificationTokenService.cs`) currently depends on `IOptions<ResendSettings>` solely for `TokenExpiryHours` — it must be changed to depend on `IOptions<EmailSettings>` instead, since `TokenExpiryHours` moves there.
3. `VerificationEmailContentBuilder` (new class in `BE/TripPlanner.Infrastructure/ExternalServices/Email/`, implements `IVerificationEmailContentBuilder`) depends on `IOptions<EmailSettings>` and produces byte-for-byte the same copy as today: subject `"Verify your email address"`, link `{VerificationUrlBase}?token={Uri.EscapeDataString(rawToken)}`, and body text including the sentence stating the link expires in `TokenExpiryHours` hours.
4. `ResendEmailSender` no longer builds email content itself — it depends on `IVerificationEmailContentBuilder` (for content) and `IOptions<ResendSettings>` (for transport only: `ApiKey`, `SmtpHost`, `SmtpPort`, `TimeoutMilliseconds`). It converts the returned `VerificationEmailContent` into a `MimeMessage` (`From`, `To`, `Subject`, `TextBody` mapped 1:1) and performs the exact same SMTP sequence as today: `ConnectAsync(SmtpHost, SmtpPort, SecureSocketOptions.StartTls, ct)` → `AuthenticateAsync("resend", ApiKey, ct)` → `SendAsync(message, ct)` → `DisconnectAsync(true, ct)`, with `client.Timeout = TimeoutMilliseconds`. The static `BuildMessage` test seam is preserved (signature updated to take `VerificationEmailContent` + `ResendSettings`, or equivalent) so message-shape can still be unit-tested without a live SMTP connection.
5. `InfrastructureServicesExtension.AddInfrastructureServices` binds and validates `EmailSettings` independently via `AddOptions<EmailSettings>().Bind(...).Validate(...).ValidateOnStart()` (`FromAddress` and `VerificationUrlBase` non-empty, `TokenExpiryHours > 0`), and keeps `ResendSettings` validation scoped to only its remaining fields (`ApiKey`, `SmtpHost` non-empty; `SmtpPort`, `TimeoutMilliseconds > 0`). `IVerificationEmailContentBuilder → VerificationEmailContentBuilder` is registered `AddScoped`; `IEmailSender → ResendEmailSender` registration is unchanged (`AddScoped`).
6. `BE/TripPlanner.API/appsettings.json` and `BE/.env.example` gain an `EmailSettings` section (`FromAddress`, `FromName`, `VerificationUrlBase`, `TokenExpiryHours`) with today's values relocated (not changed), and `ResendSettings`/`ResendSettings__*` is trimmed to `ApiKey`, `SmtpHost`, `SmtpPort`, `TimeoutMilliseconds` only.
7. `RegisterUserUseCase`, `ResendVerificationEmailUseCase`, and the public shape of `IEmailSender` (`SendVerificationEmailAsync(toEmail, rawToken, ct)`) are unchanged — every change in this story is confined to Infrastructure plus the one new Application-layer interface/record described in AC #1.
8. `CLAUDE.md`'s "Email verification" bullet (under Key Patterns) gains a sentence documenting the swap procedure: to add a new provider, implement `IEmailSender` using the existing `IVerificationEmailContentBuilder` for content plus a new provider-specific settings class for transport, then swap the `IEmailSender` DI registration — no other code changes required.
9. `dotnet test BE` passes, including: a new `VerificationEmailContentBuilderTests` asserting the subject/link/body/expiry-hours text from AC #3; an updated `ResendEmailSenderTests` asserting the `MimeMessage` shape built from a given `VerificationEmailContent` + `ResendSettings`, plus the existing connect-failure-throws test; a `ResendSettingsValidationTests` split so `EmailSettings` and `ResendSettings` validation are each exercised with their own valid/invalid cases; and the existing `VerificationTokenServiceTests` updated to construct `VerificationTokenService` with `IOptions<EmailSettings>` (still passing, unaffected logic).

## Tasks / Subtasks

- [x] Task 1: Introduce the provider-agnostic content abstraction (AC: #1, #2)
  - [x] Add `VerificationEmailContent` record and `IVerificationEmailContentBuilder` interface to `BE/TripPlanner.Application/Interfaces/Services/` (new file, e.g. `IVerificationEmailContentBuilder.cs`)
  - [x] Add `BE/TripPlanner.Infrastructure/Settings/EmailSettings.cs` with `SectionName = "EmailSettings"`, `FromAddress`, `FromName`, `VerificationUrlBase`, `TokenExpiryHours` (default `24`)
  - [x] Trim `BE/TripPlanner.Infrastructure/Settings/ResendSettings.cs` to `ApiKey`, `SmtpHost` (default `"smtp.resend.com"`), `SmtpPort` (default `587`), `TimeoutMilliseconds` (default `10000`) — remove `FromAddress`, `FromName`, `VerificationUrlBase`, `TokenExpiryHours`
  - [x] Update `BE/TripPlanner.Infrastructure/Security/VerificationTokenService.cs` to depend on `IOptions<EmailSettings>` instead of `IOptions<ResendSettings>` (its only use of the settings object is `TokenExpiryHours`)

- [x] Task 2: Implement the content builder and rewire `ResendEmailSender` (AC: #3, #4)
  - [x] Add `BE/TripPlanner.Infrastructure/ExternalServices/Email/VerificationEmailContentBuilder.cs` implementing `IVerificationEmailContentBuilder` using `IOptions<EmailSettings>`, preserving today's exact subject/link/body copy from `ResendEmailSender.BuildMessage`
  - [x] Rewrite `BE/TripPlanner.Infrastructure/ExternalServices/Resend/ResendEmailSender.cs` to take `IVerificationEmailContentBuilder contentBuilder, IOptions<ResendSettings> options`; `SendVerificationEmailAsync` calls `contentBuilder.Build(toEmail, rawToken)`, maps the result to a `MimeMessage`, then runs the same connect/auth/send/disconnect sequence using only the transport fields from `ResendSettings`
  - [x] Update/keep the `BuildMessage` static helper (now taking `VerificationEmailContent` + `ResendSettings`, or just `VerificationEmailContent` if transport fields aren't needed for message shape) so tests can assert the `MimeMessage` shape without a live connection

- [x] Task 3: DI registration and configuration split (AC: #5, #6)
  - [x] In `InfrastructureServicesExtension.AddInfrastructureServices`, add `services.AddOptions<EmailSettings>().Bind(configuration.GetSection(EmailSettings.SectionName)).Validate(...).ValidateOnStart()` for `FromAddress`/`VerificationUrlBase` non-empty and `TokenExpiryHours > 0`
  - [x] Trim the existing `AddOptions<ResendSettings>()` validation rules to only `ApiKey`, `SmtpHost`, `SmtpPort`, `TimeoutMilliseconds`
  - [x] Register `services.AddScoped<IVerificationEmailContentBuilder, VerificationEmailContentBuilder>()`; leave `services.AddScoped<IEmailSender, ResendEmailSender>()` as-is
  - [x] Update `BE/TripPlanner.API/appsettings.json`: add an `EmailSettings` section with today's `FromAddress`/`FromName`/`VerificationUrlBase`/`TokenExpiryHours` values, trim `ResendSettings` to `ApiKey`/`SmtpHost`/`SmtpPort`/`TimeoutMilliseconds`
  - [x] Update `BE/.env.example` the same way (`EmailSettings__*` added, `ResendSettings__FromAddress`/`FromName`/`VerificationUrlBase`/`TokenExpiryHours` moved to `EmailSettings__*`)

- [x] Task 4: Document the provider-swap procedure (AC: #8)
  - [x] Update the "Email verification" bullet in `CLAUDE.md` (Key Patterns section) to describe `IVerificationEmailContentBuilder` as the content seam, `IEmailSender` as the transport seam, and state that adding a new provider means a new `IEmailSender` implementation + its own settings class + a DI registration swap, with no other code changes

- [x] Task 5: Update and add tests (AC: #9)
  - [x] Add `BE/TripPlanner.Tests/VerificationEmailContentBuilderTests.cs` asserting subject, link (`{VerificationUrlBase}?token={rawToken}`), and expiry-hours body text for given `EmailSettings`
  - [x] Rewrite `BE/TripPlanner.Tests/ResendEmailSenderTests.cs`: `BuildMessage_ReturnsExpectedShape` now builds from a `VerificationEmailContent` (either constructed directly or via a fake `IVerificationEmailContentBuilder`) + trimmed `ResendSettings`; keep `SendVerificationEmailAsync_UnreachableSmtpHost_Throws` pointing at an invalid `SmtpHost`/`SmtpPort`
  - [x] Split `BE/TripPlanner.Tests/ResendSettingsValidationTests.cs` (or add a sibling `EmailSettingsValidationTests.cs`) so `EmailSettings` invalid cases (`FromAddress`, `VerificationUrlBase`, `TokenExpiryHours`) and `ResendSettings` invalid cases (`ApiKey`, `SmtpHost`, `SmtpPort`, `TimeoutMilliseconds`) are each covered independently
  - [x] Update `BE/TripPlanner.Tests/VerificationTokenServiceTests.cs` to construct `VerificationTokenService` with `IOptions<EmailSettings>` (mirroring today's `IOptions<ResendSettings>` setup) — logic/assertions unchanged
  - [x] Run `dotnet test BE` and confirm the full suite passes (no regressions in `AuthServiceTests`, etc.)

## Dev Notes

- **Why this shape:** `IEmailSender` is already the Strategy-pattern seam the use cases depend on (unchanged since epic-4). The gap this story closes is that `ResendEmailSender` currently builds the *email content* (subject/link/body copy) itself, coupled 1:1 with its SMTP transport code. A future `AzureEmailSender` would otherwise have to duplicate that copy verbatim. Extracting `IVerificationEmailContentBuilder` gives content and transport independent seams: swap transport (new `IEmailSender` + new provider settings) without touching content, or swap copy without touching any provider's transport code.
- **Two seams, two responsibilities:**
  - Content: `IVerificationEmailContentBuilder` (Application interface) → `VerificationEmailContentBuilder` (Infrastructure, reads `EmailSettings`). Provider-agnostic; every `IEmailSender` implementation reuses it.
  - Transport: `IEmailSender` (Application interface, **unchanged**) → `ResendEmailSender` (Infrastructure, reads `ResendSettings` for connection details only). A hypothetical `AzureEmailSender` would take the same `IVerificationEmailContentBuilder` plus its own `AzureCommunicationSettings`.
- **Current implementation being split** — `BE/TripPlanner.Infrastructure/ExternalServices/Resend/ResendEmailSender.cs`: `BuildMessage(ResendSettings, toEmail, rawToken)` currently reads `FromName`/`FromAddress`/`VerificationUrlBase`/`TokenExpiryHours` off `ResendSettings` and returns a `MimeMessage` directly. This story moves those four fields to `EmailSettings`, and makes `BuildMessage` (or its Infrastructure equivalent) consume a `VerificationEmailContent` instead of reaching into settings for copy.
- **Settings split is a rename/relocate, not a behavior change** — the *values* in `appsettings.json`/`.env.example` don't change, only which section they live under. `TokenExpiryHours` is also still read by `VerificationTokenService` via `IOptions<ResendSettings>` today (`BE/TripPlanner.Infrastructure/Security/VerificationTokenService.cs` — confirm exact path/class name in that file) — **this must move to `IOptions<EmailSettings>`** since `TokenExpiryHours` is a provider-agnostic field per AC #2. Check `VerificationTokenService`'s constructor and update its `IOptions<>` dependency accordingly; this is in scope even though not separately numbered as an AC, because leaving it on the trimmed `ResendSettings` would silently break token expiry once the field moves.
- **`VerificationEmailContent` should be a `record`** (Application layer, alongside the interface) — plain immutable DTO, no MailKit/MimeKit types, keeping `TripPlanner.Application`'s "no framework dependency beyond logging" rule intact (per `CLAUDE.md` Architecture section).
- **Consumers to leave untouched:** `RegisterUserUseCase.cs` and `ResendVerificationEmailUseCase.cs` (both in `BE/TripPlanner.Application/UseCases/Auth/`) call only `emailSender.SendVerificationEmailAsync(...)` — no changes needed, no new dependency on `IVerificationEmailContentBuilder` (that dependency belongs to the `IEmailSender` implementation, not the use cases).
- **Testing standards:** xUnit + NSubstitute (existing convention in `BE/TripPlanner.Tests`). Follow `ResendSettingsValidationTests`' pattern (build a real `ServiceProvider` via `AddInfrastructureServices`, resolve `IStartupValidator`) for the new `EmailSettings` validation cases.
- **Not in scope:** actually implementing an Azure (or any other) provider — this story only makes that future work a "new class + DI swap," it does not add a second `IEmailSender` implementation.

### Project Structure Notes

- New folder: `BE/TripPlanner.Infrastructure/ExternalServices/Email/` for the provider-agnostic `VerificationEmailContentBuilder` (sibling to the existing `ExternalServices/Resend/` and `ExternalServices/OpenTripMap/` provider folders).
- New file in `BE/TripPlanner.Application/Interfaces/Services/` for `IVerificationEmailContentBuilder` + `VerificationEmailContent`, alongside the existing `IEmailSender.cs` in the same folder.
- No changes to `TripPlanner.Domain` or `TripPlanner.API` beyond `appsettings.json`.

### References

- [Source: BE/TripPlanner.Application/Interfaces/Services/IEmailSender.cs] — the unchanged transport seam this story builds alongside, not on top of
- [Source: BE/TripPlanner.Infrastructure/ExternalServices/Resend/ResendEmailSender.cs] — current content+transport coupling being split
- [Source: BE/TripPlanner.Infrastructure/Settings/ResendSettings.cs] — fields to redistribute between `EmailSettings` and trimmed `ResendSettings`
- [Source: BE/TripPlanner.Infrastructure/Extensions/InfrastructureServicesExtension.cs] — DI/validation registration to split
- [Source: BE/TripPlanner.Application/UseCases/Auth/RegisterUserUseCase.cs] — confirms the use case only depends on `IEmailSender`
- [Source: BE/TripPlanner.Application/UseCases/Auth/ResendVerificationEmailUseCase.cs] — same confirmation
- [Source: BE/TripPlanner.Tests/ResendEmailSenderTests.cs] — existing test pattern to adapt for the split content/transport shape
- [Source: BE/TripPlanner.Tests/ResendSettingsValidationTests.cs] — existing validation test pattern to replicate for `EmailSettings`
- [Source: _bmad-output/implementation-artifacts/7-1-resend-email-integration.md] — prior story that produced the current SMTP-based `ResendEmailSender`; this story refactors its output, doesn't redo it
- [Source: CLAUDE.md#Key-Patterns, "Email verification"] — documentation this story must update with the swap procedure
- [Source: CLAUDE.md#Key-Patterns, "External services"] — the existing interface-in-Application/implementation-in-Infrastructure convention this story follows

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- `dotnet build BE` — succeeded, 0 warnings, 0 errors (after stopping a stale `dotnet run` process holding a file lock on `TripPlanner.API`'s build output)
- `dotnet test BE` — 126/126 passed, 0 failed, 0 skipped

### Completion Notes List

- Added `IVerificationEmailContentBuilder` + `VerificationEmailContent` record to `TripPlanner.Application/Interfaces/Services/` — Application stays framework-free (plain strings only, no MailKit/MimeKit types).
- Split settings: new `EmailSettings` (FromAddress, FromName, VerificationUrlBase, TokenExpiryHours) holds the provider-agnostic fields; `ResendSettings` trimmed to transport-only fields (ApiKey, SmtpHost, SmtpPort, TimeoutMilliseconds). Values relocated as-is in `appsettings.json` and `.env.example` — no value changes.
- `VerificationTokenService` now depends on `IOptions<EmailSettings>` (its only use was `TokenExpiryHours`, which moved).
- `VerificationEmailContentBuilder` (new, `Infrastructure/ExternalServices/Email/`) builds byte-for-byte the same subject/link/body copy that `ResendEmailSender.BuildMessage` previously produced.
- `ResendEmailSender` now takes `IVerificationEmailContentBuilder` + `IOptions<ResendSettings>`; it calls the content builder, maps `VerificationEmailContent` to a `MimeMessage` via a static `BuildMessage(VerificationEmailContent)` helper, then runs the identical connect/auth/send/disconnect SMTP sequence using only transport fields. `BuildMessage` dropped the `ResendSettings` parameter since no transport field is needed to shape the message.
- DI: `EmailSettings` bound/validated independently with `ValidateOnStart()`; `ResendSettings` validation trimmed to its remaining fields; `IVerificationEmailContentBuilder → VerificationEmailContentBuilder` registered `AddScoped`.
- `RegisterUserUseCase`, `ResendVerificationEmailUseCase`, and `IEmailSender`'s public contract were left untouched, confirmed by reading both use cases — they only call `emailSender.SendVerificationEmailAsync(...)`.
- Updated `CLAUDE.md`'s "Email verification" bullet (Key Patterns) with the content/transport seam split and the provider-swap procedure.
- Tests: added `VerificationEmailContentBuilderTests`; rewrote `ResendEmailSenderTests` (`BuildMessage_ReturnsExpectedShape` now builds from a `VerificationEmailContent`, `SendVerificationEmailAsync_UnreachableSmtpHost_Throws` uses an NSubstitute fake `IVerificationEmailContentBuilder`); split `ResendSettingsValidationTests` (now Resend-only fields) and added `EmailSettingsValidationTests`; updated `VerificationTokenServiceTests` to construct with `IOptions<EmailSettings>`. Full suite (126 tests) passes with no regressions.
- Encountered a locked build-output DLL from a stray `dotnet run` process (PID 5432) mid-session; stopped it before rebuilding — not a code issue.

### File List

- BE/TripPlanner.Application/Interfaces/Services/IVerificationEmailContentBuilder.cs (added)
- BE/TripPlanner.Infrastructure/Settings/EmailSettings.cs (added)
- BE/TripPlanner.Infrastructure/Settings/ResendSettings.cs (modified — trimmed to transport fields)
- BE/TripPlanner.Infrastructure/Security/VerificationTokenService.cs (modified — now uses IOptions<EmailSettings>)
- BE/TripPlanner.Infrastructure/ExternalServices/Email/VerificationEmailContentBuilder.cs (added)
- BE/TripPlanner.Infrastructure/ExternalServices/Resend/ResendEmailSender.cs (modified — content/transport split)
- BE/TripPlanner.Infrastructure/Extensions/InfrastructureServicesExtension.cs (modified — EmailSettings binding/validation, new DI registration)
- BE/TripPlanner.API/appsettings.json (modified — EmailSettings section added, ResendSettings trimmed)
- BE/.env.example (modified — EmailSettings__* added, ResendSettings__* trimmed)
- CLAUDE.md (modified — Email verification bullet documents the new seam split and provider-swap procedure)
- BE/TripPlanner.Tests/VerificationEmailContentBuilderTests.cs (added)
- BE/TripPlanner.Tests/ResendEmailSenderTests.cs (modified — rewritten for content/transport split)
- BE/TripPlanner.Tests/ResendSettingsValidationTests.cs (modified — Resend-only validation cases)
- BE/TripPlanner.Tests/EmailSettingsValidationTests.cs (added)
- BE/TripPlanner.Tests/VerificationTokenServiceTests.cs (modified — constructs with IOptions<EmailSettings>)

## Change Log

- 2026-07-13: Implemented Story 7.2 — decoupled verification-email content from Resend transport via `IVerificationEmailContentBuilder`; split settings into `EmailSettings` (content) and trimmed `ResendSettings` (transport); updated DI, config, docs, and tests. `dotnet test BE` passes (126/126).
