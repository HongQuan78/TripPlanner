---
baseline_commit: a60e929454a5227fee9bd618ff1cd7efa89d6f90
---

# Story 7.1: Send verification email through Resend's SMTP relay

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the TripPlanner platform,
I want verification emails sent through Resend's SMTP relay (`smtp.resend.com`) instead of the Resend HTTP API,
so that email delivery goes over standard SMTP (useful for environments/tooling that expect an SMTP transport) while still being backed by Resend's delivery infrastructure.

## Acceptance Criteria

1. `RegisterUserUseCase` and `ResendVerificationEmailUseCase` send verification emails via an SMTP connection to Resend's relay instead of `POST https://api.resend.com/emails` — the `IEmailSender` interface and its call sites are unchanged.
2. The sent email preserves today's content: subject `"Verify your email address"`, a verification link built as `{VerificationUrlBase}?token={rawToken}`, and body text that states the link expires in `TokenExpiryHours` hours.
3. `ResendEmailSender` connects to `smtp.resend.com` on `SmtpPort` using MailKit's `SmtpClient`, authenticating with username `"resend"` and password = `ResendSettings.ApiKey` (Resend's documented SMTP credential scheme), then sends a `MimeMessage` built from the same from/to/subject/text as AC #2.
4. `ResendSettings` gains `SmtpHost` (default `"smtp.resend.com"`) and `SmtpPort` (default `587`); the existing `BaseUrl` and `TimeoutMilliseconds` (HTTP-API-only fields) are removed and replaced by a `TimeoutMilliseconds` used as the MailKit connect/send timeout. `ApiKey`, `FromAddress`, `FromName`, `VerificationUrlBase`, `TokenExpiryHours` are unchanged. Settings are still bound and validated at startup via `AddOptions<ResendSettings>().ValidateOnStart()` — missing `ApiKey`/`FromAddress`/`VerificationUrlBase`/`SmtpHost` or a non-positive `TokenExpiryHours`/`SmtpPort`/`TimeoutMilliseconds` throws `OptionsValidationException` on startup.
5. A failed SMTP connect/auth/send throws (does not silently succeed); both use cases already wrap `emailSender.SendVerificationEmailAsync(...)` in `try/catch (Exception ex) when (ex is not OperationCanceledException)` and still return the generic success `MessageResponse` — this existing behavior must keep working unchanged with the new sender.
6. `TripPlanner.Infrastructure.csproj` re-adds the `MailKit` package reference (needed for `SmtpClient`/`MimeMessage`); `ResendEmailSender` is no longer registered via `AddHttpClient` (it no longer uses `HttpClient`) — register it as a plain scoped/transient service instead. `ResendModels.cs` (the JSON request record used only by the HTTP API call) is deleted since it's no longer referenced.
7. `VerificationTokenService` continues to depend on `IOptions<ResendSettings>` for `TokenExpiryHours` only — no change needed there since this story doesn't touch that field.
8. `dotnet test BE` passes, including updates to the `ResendSettings` validation test suite for the new `SmtpHost`/`SmtpPort` fields and a rewritten unit test for `ResendEmailSender` asserting the MimeMessage shape (from/to/subject/body) and that a connect/auth/send failure propagates as an exception.

## Tasks / Subtasks

- [x] Task 1: Update `ResendSettings` and DI registration for SMTP (AC: #3, #4, #6)
  - [x] In `BE/TripPlanner.Infrastructure/Settings/ResendSettings.cs`, remove `BaseUrl`; add `SmtpHost` (default `"smtp.resend.com"`) and `SmtpPort` (default `587`); keep `ApiKey`, `FromAddress`, `FromName`, `VerificationUrlBase`, `TokenExpiryHours`, `TimeoutMilliseconds`
  - [x] In `InfrastructureServicesExtension.AddInfrastructureServices`, update the `AddOptions<ResendSettings>().Validate(...)` rules to validate `SmtpHost` (non-empty) and `SmtpPort` (positive) instead of `BaseUrl`
  - [x] Replace `services.AddHttpClient<IEmailSender, ResendEmailSender>(ConfigureResendClient)` (and delete `ConfigureResendClient`) with a plain `services.AddScoped<IEmailSender, ResendEmailSender>()` registration, since the sender no longer uses `HttpClient`

- [x] Task 2: Rewrite `ResendEmailSender` to send over SMTP (AC: #1, #2, #3, #5, #6)
  - [x] Delete `BE/TripPlanner.Infrastructure/ExternalServices/Resend/ResendModels.cs` (the JSON request record is no longer used)
  - [x] Rewrite `BE/TripPlanner.Infrastructure/ExternalServices/Resend/ResendEmailSender.cs`: build the same verification link and body text as today (subject `"Verify your email address"`, `{VerificationUrlBase}?token={rawToken}`, expiry-hours sentence) into a `MimeMessage` (`From` = `"{FromName} <{FromAddress}>"`, `To` = `toEmail`, `TextBody` = the body), then use `MailKit.Net.Smtp.SmtpClient` to `ConnectAsync(settings.SmtpHost, settings.SmtpPort, SecureSocketOptions.StartTls, cancellationToken)`, `AuthenticateAsync("resend", settings.ApiKey, cancellationToken)`, `SendAsync(message, cancellationToken)`, then `DisconnectAsync(true, cancellationToken)` — apply `settings.TimeoutMilliseconds` as the client's `Timeout`; let any exception from connect/auth/send propagate (do not catch it here — the existing use-case `try/catch` already handles and logs it)

- [x] Task 3: Update configuration files (AC: #4)
  - [x] In `BE/TripPlanner.API/appsettings.json`, replace the `ResendSettings.BaseUrl` key with `SmtpHost` (`"smtp.resend.com"`) and `SmtpPort` (`587`)
  - [x] In `BE/.env.example`, replace `ResendSettings__BaseUrl` with `ResendSettings__SmtpHost` / `ResendSettings__SmtpPort` equivalents
  - [x] Update the Resend email-verification paragraph in `CLAUDE.md` to describe the SMTP relay transport (`smtp.resend.com`, username `resend`, password = API key) instead of the HTTP API

- [x] Task 4: Re-add MailKit dependency and update tests (AC: #6, #8)
  - [x] Add the `MailKit` `<PackageReference>` back to `BE/TripPlanner.Infrastructure/TripPlanner.Infrastructure.csproj` (`MimeKit` comes transitively with `MailKit`, matching the original SMTP implementation's dependency shape)
  - [x] Update `BE/TripPlanner.Tests/ResendSettingsValidationTests.cs`: replace `BaseUrl`-related `[InlineData]` cases with `SmtpHost`/`SmtpPort` validation cases per AC #4
  - [x] Rewrite `BE/TripPlanner.Tests/ResendEmailSenderTests.cs`: remove the fake-`HttpMessageHandler` harness (no longer applicable) and instead assert the constructed `MimeMessage`'s From/To/Subject/TextBody match AC #2, plus a test that a connect/auth failure (e.g. pointing `SmtpHost` at an unreachable/invalid endpoint or using a test double for the SMTP transport) causes `SendVerificationEmailAsync` to throw
  - [x] Run `dotnet test BE` and confirm `AuthServiceTests` and `VerificationTokenServiceTests` (unaffected by this story) still pass

## Dev Notes

- **Why this shape:** `IEmailSender` (`BE/TripPlanner.Application/Interfaces/Services/IEmailSender.cs`) is the only seam the use cases depend on — `RegisterUserUseCase` and `ResendVerificationEmailUseCase` never change. This story only swaps `ResendEmailSender`'s transport from an HTTP POST to Resend's API to an SMTP session against Resend's relay; settings/DI/config follow along.
- **Resend SMTP contract:** host `smtp.resend.com`, port `587` (STARTTLS) is Resend's documented default; username is the literal string `"resend"`; password is the Resend API key (the same `ApiKey` value already used for the HTTP API). No separate credential needs to be provisioned.
- **Current HTTP-API implementation being replaced** — `BE/TripPlanner.Infrastructure/ExternalServices/Resend/ResendEmailSender.cs`: builds a `ResendSendEmailRequest` and POSTs it via `HttpClient` to `emails`. Preserve the exact subject/body copy (`"Verify your email address"`, `{VerificationUrlBase}?token={rawToken}`, expiry-hours sentence) when rebuilding it as a `MimeMessage` so AC #2 holds.
- **`InfrastructureServicesExtension.AddInfrastructureServices`** (`BE/TripPlanner.Infrastructure/Extensions/InfrastructureServicesExtension.cs`) is where `ResendSettings` is bound/validated and where `IEmailSender` is registered via `AddHttpClient` — both need updating for Task 1 (validation rules move from `BaseUrl` to `SmtpHost`/`SmtpPort`; registration moves from `AddHttpClient` to `AddScoped`).
- **Consumers to leave untouched:** `RegisterUserUseCase.cs` and `ResendVerificationEmailUseCase.cs` (both in `BE/TripPlanner.Application/UseCases/Auth/`) call `emailSender.SendVerificationEmailAsync(...)` inside a `try/catch` that logs and swallows — do not change this control flow.
- **`VerificationTokenService`** already depends on `IOptions<ResendSettings>` for `TokenExpiryHours` only, from the prior story — no change needed here since `TokenExpiryHours` is untouched.
- **Testing standards:** xUnit + NSubstitute (existing convention in `BE/TripPlanner.Tests`). `ResendSettingsValidationTests.cs` builds a real `ServiceProvider` via `AddInfrastructureServices` and resolves `IStartupValidator` to assert `ValidateOnStart()` behavior — keep this approach, just update which config keys are exercised (`SmtpHost`/`SmtpPort` replacing `BaseUrl`).

### Project Structure Notes

- No new folders — this is a modification within the existing `BE/TripPlanner.Infrastructure/ExternalServices/Resend/` and `Settings/ResendSettings.cs` files from the prior story.
- No changes needed in `TripPlanner.Domain`, `TripPlanner.API` (beyond `appsettings.json`), or `TripPlanner.Application` — this is entirely contained in `TripPlanner.Infrastructure` plus config files and `TripPlanner.Tests`.

### References

- [Source: BE/TripPlanner.Infrastructure/ExternalServices/Resend/ResendEmailSender.cs] — current HTTP API implementation and email copy to preserve
- [Source: BE/TripPlanner.Infrastructure/Settings/ResendSettings.cs] — fields to update (`BaseUrl` → `SmtpHost`/`SmtpPort`)
- [Source: BE/TripPlanner.Infrastructure/Extensions/InfrastructureServicesExtension.cs] — DI registration and validation rules to update
- [Source: BE/TripPlanner.Application/Interfaces/Services/IEmailSender.cs] — the unchanged seam
- [Source: BE/TripPlanner.Application/UseCases/Auth/RegisterUserUseCase.cs#L49-L56] — existing swallow/log pattern around `SendVerificationEmailAsync`
- [Source: BE/TripPlanner.Tests/ResendSettingsValidationTests.cs] — test pattern to update
- [Source: epic/epic-4-user-authentication.md#US2] — original email-verification requirement this story modifies the delivery mechanism for (ACs 1-6 of US2 are unaffected; only the transport changes)
- [Source: CLAUDE.md#Key-Patterns, "External services"] — third-party integration pattern this story must follow

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

- `dotnet build BE` failed once with MSB3027/MSB3021 file-lock errors because a stale `dotnet run --project BE/TripPlanner.API` process (PID 36188) from a prior session held `TripPlanner.API/bin/Debug/net10.0/TripPlanner.Infrastructure.dll` — killed the process, rebuild succeeded with 0 warnings/0 errors.

### Completion Notes List

- `ResendEmailSender` now sends over SMTP to Resend's relay (`smtp.resend.com:587`, STARTTLS) via `MailKit.Net.Smtp.SmtpClient`, authenticating with username `"resend"` and password = `ResendSettings.ApiKey`, instead of POSTing JSON via `HttpClient` to the Resend HTTP API.
- Extracted `ResendEmailSender.BuildMessage(...)` as a public static helper so the `MimeMessage` shape (from/to/subject/text-body) is unit-testable without a real SMTP connection; `SendVerificationEmailAsync` calls it, then connects/authenticates/sends/disconnects.
- `ResendSettings.BaseUrl` replaced with `SmtpHost` (default `smtp.resend.com`) and `SmtpPort` (default `587`); `ApiKey`, `FromAddress`, `FromName`, `VerificationUrlBase`, `TokenExpiryHours`, `TimeoutMilliseconds` unchanged. Startup validation now checks `SmtpHost` non-empty and `SmtpPort` positive instead of `BaseUrl`.
- DI registration for `IEmailSender` changed from `AddHttpClient<IEmailSender, ResendEmailSender>(ConfigureResendClient)` to a plain `AddScoped<IEmailSender, ResendEmailSender>()` since the sender no longer depends on `HttpClient`; `ConfigureResendClient` and `ResendModels.cs` (the JSON request record) were deleted as dead code.
- Re-added the `MailKit` package reference to `TripPlanner.Infrastructure.csproj` (brings `MimeKit` transitively) to restore `SmtpClient`/`MimeMessage` support.
- `RegisterUserUseCase`/`ResendVerificationEmailUseCase`/`VerificationTokenService` are unchanged — `IEmailSender` remains the only seam, and `TokenExpiryHours` is still read from `IOptions<ResendSettings>`.
- Verification email subject (`"Verify your email address"`), link format (`{VerificationUrlBase}?token={rawToken}`), and expiry-hours body copy are preserved byte-for-byte from the prior HTTP-API sender.
- Updated `ResendSettingsValidationTests` with `SmtpHost`/`SmtpPort` default config values and invalid-value cases (replacing the removed `BaseUrl` field). Rewrote `ResendEmailSenderTests`: one test asserts `BuildMessage`'s From/To/Subject/TextBody shape, another asserts `SendVerificationEmailAsync` throws when pointed at an unreachable SMTP endpoint (`127.0.0.1:1`) — replacing the old fake-`HttpMessageHandler` harness, which no longer applies.
- `dotnet build BE` and `dotnet test BE` both pass (124/124 tests, 0 failures) after the stale-process file lock was cleared.

### File List

- BE/TripPlanner.Infrastructure/Settings/ResendSettings.cs (modified)
- BE/TripPlanner.Infrastructure/ExternalServices/Resend/ResendEmailSender.cs (modified)
- BE/TripPlanner.Infrastructure/ExternalServices/Resend/ResendModels.cs (deleted)
- BE/TripPlanner.Infrastructure/Extensions/InfrastructureServicesExtension.cs (modified)
- BE/TripPlanner.Infrastructure/TripPlanner.Infrastructure.csproj (modified)
- BE/TripPlanner.API/appsettings.json (modified)
- BE/.env.example (modified)
- CLAUDE.md (modified)
- BE/TripPlanner.Tests/ResendSettingsValidationTests.cs (modified)
- BE/TripPlanner.Tests/ResendEmailSenderTests.cs (modified)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified)
- _bmad-output/implementation-artifacts/archive/7-1-resend-email-integration.md (modified)

## Change Log

- 2026-07-13: Amended story 7.1 — changed scope from Resend HTTP API to Resend SMTP relay (`smtp.resend.com`, username `resend`, password = API key) at user request; ACs/tasks rewritten, status reset to ready-for-dev.
- 2026-07-13: Implemented amended story 7.1 — `ResendEmailSender` now sends verification emails over SMTP to Resend's relay via MailKit instead of the Resend HTTP API. `ResendSettings.BaseUrl` replaced by `SmtpHost`/`SmtpPort`, DI registration switched from `AddHttpClient` to `AddScoped`, `ResendModels.cs` deleted, `MailKit` package reference restored, tests updated, `dotnet test BE` passes (124/124).
