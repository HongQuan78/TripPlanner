---
baseline_commit: 6d8b85d5403dc3b263b037dccbaaf8a23e708e0e
---

# Story 7.4: Branded HTML verification email + registry-based email provider strategy

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a new TripPlanner user,
I want the verification email to look like a polished, branded TripPlanner message with a clear "Verify email address" button,
so that I trust the email and can confirm my account in one click — while the platform keeps the ability to switch delivery provider (Resend ↔ Google) by config alone, now through an explicit provider registry instead of an `if/else` branch.

## Acceptance Criteria

### Part A — Branded HTML email

1. `VerificationEmailContent` (`BE/TripPlanner.Application/Interfaces/Services/IVerificationEmailContentBuilder.cs`) gains a sixth positional member `string HtmlBody`, appended **last** so existing positional/named construction order is otherwise unchanged. It stays a plain-string record — no MimeKit/MailKit types (Application must remain framework-free).
2. A new email template file `BE/TripPlanner.Infrastructure/ExternalServices/Email/Templates/verification-email.html` is added and compiled as an **embedded resource** (explicit `<EmbeddedResource Include="ExternalServices\Email\Templates\verification-email.html" />` item in `BE/TripPlanner.Infrastructure/TripPlanner.Infrastructure.csproj`). Its manifest resource name is `TripPlanner.Infrastructure.ExternalServices.Email.Templates.verification-email.html`.
3. The template is **email-client-safe**: a full `<!DOCTYPE html>` document; `<table role="presentation">` layout (no flexbox/grid/float); all critical styling **inline** on elements; a single optional `<style>` block in `<head>` used **only** for a `@media (max-width: 600px)` refinement; no external CSS, no JavaScript, no webfont `@import`/`<link>`, no remote images (a text wordmark, not an `<img>`); `font-family` chain `'Plus Jakarta Sans', system-ui, 'Segoe UI', Roboto, Arial, sans-serif`; a hidden preheader line; `width="100%"` outer table with a centered `600px` card.
4. Visual design follows the frontend Horizon tokens, values hardcoded (a CSS-variable reference would not resolve in an email client) — outer background `#f8f9ff`; card `#ffffff` with `12px` radius; header band `#0058bc` with the `TripPlanner` wordmark in `#ffffff`; headline in `#0b1c30`; body copy in `#414755`; CTA a table-based rounded button, background `#0058bc`, text `#ffffff`, label `Verify email address`; a "button not working? paste this link" fallback showing the raw URL; the expiry sentence; a footer in `#717786` stating the email can be ignored if the recipient did not sign up.
5. The template carries `{{Placeholder}}`-style tokens — exactly `{{BrandName}}`, `{{ToEmail}}`, `{{VerificationLink}}`, `{{ExpiryHours}}` — and no other `{{...}}` token.
6. A new `internal static class VerificationEmailTemplate` in `BE/TripPlanner.Infrastructure/ExternalServices/Email/` loads the embedded resource **once** (e.g. `static readonly Lazy<string>` over `Assembly.GetManifestResourceStream`) and exposes it for rendering. A missing/unreadable resource throws `InvalidOperationException` whose message names the expected manifest resource name from AC #2.
7. `VerificationEmailContentBuilder` (`BE/TripPlanner.Infrastructure/ExternalServices/Email/VerificationEmailContentBuilder.cs`) renders that template into `HtmlBody` by substituting the AC #5 tokens. **Every substituted value is HTML-encoded** with `System.Net.WebUtility.HtmlEncode` before insertion (the verification link appears both in the `href` attribute and as visible fallback text, so it is encoded in both places). No `{{` sequence remains in the rendered output.
8. The existing plain-text body is **unchanged, byte for byte** (same "Welcome to TripPlanner!" copy, same `{VerificationUrlBase}?token={Uri.EscapeDataString(rawToken)}` link built with `Uri.EscapeDataString`, same expiry sentence) and is still returned in `TextBody`. The subject stays `Verify your email address`. `TextBody` keeps the **raw, non-HTML-encoded** link.
9. `ResendEmailSender.BuildMessage` and `GoogleEmailSender.BuildMessage` both set `HtmlBody = content.HtmlBody` **in addition to** `TextBody = content.TextBody` on their `BodyBuilder`, producing a `multipart/alternative` message (HTML with plain-text fallback). Both static `BuildMessage(VerificationEmailContent)` test seams keep their current signature, and the SMTP connect/auth/send/disconnect sequences in both senders are untouched.

### Part B — Explicit provider strategy (registry)

10. A new composition abstraction `IEmailProviderModule` is added in `BE/TripPlanner.Infrastructure/ExternalServices/Email/Providers/` with exactly two members: `string ProviderKey { get; }` and `void Register(IServiceCollection services, IConfiguration configuration)`. It lives in Infrastructure (never Application) because it touches `IServiceCollection`.
11. Two implementations in the same folder — `ResendEmailProviderModule` (`ProviderKey` = `"Resend"`) and `GoogleEmailProviderModule` (`ProviderKey` = `"Google"`). Each `Register` moves, **verbatim and with identical validation messages**, that provider's existing `AddOptions<TSettings>().Bind(...).Validate(...).ValidateOnStart()` block plus its `services.AddScoped<IEmailSender, TSender>()` registration out of `InfrastructureServicesExtension` (current lines ~69–95).
12. A new `EmailProviderRegistry` (static class, same folder) is the single source of truth for provider keys. It exposes: `DefaultProviderKey` = `"Resend"`; the module list; `SupportedKeys`; `bool IsSupported(string? providerSetting)`; and `IEmailProviderModule Resolve(string? providerSetting)`. `Resolve` trims the value, treats null/blank as `DefaultProviderKey`, matches `ProviderKey` case-insensitively (`StringComparison.OrdinalIgnoreCase`), and throws `InvalidOperationException` naming the unsupported value **and** listing `SupportedKeys` when no module matches. `IsSupported` returns `true` for null/blank (the default applies).
13. `AddInfrastructureServices` replaces the `if/else` with: (a) the `EmailSettings:Provider` validation delegating to `EmailProviderRegistry.IsSupported` with a failure message built from `SupportedKeys` — **no hardcoded `"Resend"`/`"Google"` literals left in the extension**; and (b) `EmailProviderRegistry.Resolve(configuration.GetSection(EmailSettings.SectionName)["Provider"]).Register(services, configuration)`. The other `EmailSettings` validations (`FromAddress`, `VerificationUrlBase`, `TokenExpiryHours`) and the `IVerificationEmailContentBuilder`/`IVerificationTokenService` registrations are unchanged.
14. Behaviour preserved exactly: **only the selected provider's transport settings are bound and validated** with `ValidateOnStart()`, so blank credentials for the unused provider never fail startup; `EmailSettings:Provider` remains the config switch; absent/blank/`"Resend"`/`"resend"` still resolves `ResendEmailSender`, `"Google"`/`"google"` still resolves `GoogleEmailSender`, both `AddScoped`.
15. Adding a future provider requires only: a new `IEmailSender` implementation, its transport settings class, a new `IEmailProviderModule`, and adding that module to `EmailProviderRegistry`'s module list — **no edit to `AddInfrastructureServices`**. `IEmailSender`, `IVerificationEmailContentBuilder`'s contract, `RegisterUserUseCase`, and `ResendVerificationEmailUseCase` are untouched by this story.

### Cross-cutting

16. **No new configuration keys.** `BE/TripPlanner.API/appsettings.json` and `BE/.env.example` are left unchanged (verify this rather than assume it — if the implementation introduces a key, both files and this AC must be updated).
17. `CLAUDE.md`'s "Email verification" bullet (under Key Patterns) is updated to state that (a) the verification email is a branded HTML template shipped as an embedded resource at `Infrastructure/ExternalServices/Email/Templates/verification-email.html`, rendered by `VerificationEmailContentBuilder` with HTML-encoded substitutions and sent as `multipart/alternative` with the existing plain text as fallback; and (b) provider selection now goes through `EmailProviderRegistry` + `IEmailProviderModule`, so adding a provider means registering a module rather than editing a branch.
18. `dotnet build BE` stays at **0 warnings** and `dotnet test BE` passes in full, including the new/updated tests in AC #19.
19. Test coverage added/updated under `BE/TripPlanner.Tests/` (xUnit + NSubstitute):
    - `VerificationEmailContentBuilderTests` — existing assertions still pass (text body, subject, addresses); new: `HtmlBody` contains the verification link inside an `href`, contains the expiry hours and the recipient address, contains no residual `{{`; and an HTML-escaping case where `VerificationUrlBase` contains `&` asserting `&amp;` in `HtmlBody` while `TextBody` keeps the raw `&`.
    - New `VerificationEmailTemplateTests` — the manifest resource resolves and is non-empty, and the raw template contains each AC #5 placeholder and no unexpected `{{...}}` token.
    - `ResendEmailSenderTests` and `GoogleEmailSenderTests` — `BuildMessage` produces a message whose `HtmlBody` contains the link and whose `TextBody` is still present (assert both non-null), plus the existing unreachable-host-throws tests kept.
    - `EmailProviderSelectionTests` — existing provider-resolution theories kept; new: an unsupported `Provider` value (e.g. `"Sendgrid"`) throws `InvalidOperationException` naming the supported keys, `EmailProviderRegistry.SupportedKeys` is exactly `{Resend, Google}`, and with `Provider = "Google"` plus **blank/absent** `ResendSettings` the resolved `IStartupValidator.Validate()` still succeeds (proves AC #14's selective validation).
    - `EmailSettingsValidationTests`, `ResendSettingsValidationTests`, `GoogleSmtpSettingsValidationTests`, `VerificationTokenServiceTests` — pass unchanged.

## Tasks / Subtasks

- [x] Task 1: Extend the content contract with an HTML body (AC: #1)
  - [x] Add `string HtmlBody` as the last positional member of `VerificationEmailContent` in `BE/TripPlanner.Application/Interfaces/Services/IVerificationEmailContentBuilder.cs`
  - [x] Build the solution and note every construction site the compiler flags (builder + test factories) — fix them in the tasks below, do not stub them with `string.Empty` and move on

- [x] Task 2: Author the branded HTML template (AC: #2, #3, #4, #5)
  - [x] Create `BE/TripPlanner.Infrastructure/ExternalServices/Email/Templates/verification-email.html` per AC #3/#4/#5 (table layout, inline styles, hardcoded Horizon colors, `{{BrandName}}`/`{{ToEmail}}`/`{{VerificationLink}}`/`{{ExpiryHours}}` only)
  - [x] Add the `<EmbeddedResource Include="ExternalServices\Email\Templates\verification-email.html" />` item to `BE/TripPlanner.Infrastructure/TripPlanner.Infrastructure.csproj` (own `<ItemGroup>`, matching the file's existing formatting)
  - [x] Confirm the resource name resolves to `TripPlanner.Infrastructure.ExternalServices.Email.Templates.verification-email.html` (the AC #19 template test is the guard — write it before trusting the name)

- [x] Task 3: Load and render the template (AC: #6, #7, #8) — red first
  - [x] Write `VerificationEmailTemplateTests` (resource resolves, non-empty, placeholders present, no stray tokens) — expect red
  - [x] Extend `VerificationEmailContentBuilderTests` with the `HtmlBody` and `&`-escaping assertions from AC #19 — expect red
  - [x] Add `internal static class VerificationEmailTemplate` in `BE/TripPlanner.Infrastructure/ExternalServices/Email/` with a `static readonly Lazy<string>` manifest-stream load and the `InvalidOperationException` guard naming the resource
  - [x] Render in `VerificationEmailContentBuilder`: `WebUtility.HtmlEncode` each value, substitute the four tokens, assign to `HtmlBody`; leave the plain-text body and subject byte-for-byte identical (AC #8)
  - [x] Green both test classes

- [x] Task 4: Emit multipart/alternative from both senders (AC: #9) — red first
  - [x] Extend `ResendEmailSenderTests` and `GoogleEmailSenderTests` with the `HtmlBody` + `TextBody` assertions (their local `CreateContent()` factories need the new sixth argument) — expect red
  - [x] Set `HtmlBody = content.HtmlBody` alongside `TextBody` in both `BuildMessage` `BodyBuilder`s; change nothing else in either sender
  - [x] Green; confirm the existing unreachable-host tests still pass

- [x] Task 5: Introduce the provider module abstraction and registry (AC: #10, #11, #12) — red first
  - [x] Extend `EmailProviderSelectionTests` with the unsupported-provider, `SupportedKeys`, and Google-with-blank-Resend-settings cases from AC #19 — expect red
  - [x] Add `BE/TripPlanner.Infrastructure/ExternalServices/Email/Providers/IEmailProviderModule.cs`
  - [x] Add `ResendEmailProviderModule` and `GoogleEmailProviderModule`, each moving its existing `AddOptions<…>` validation block and `AddScoped<IEmailSender, …>()` across verbatim (identical validation messages)
  - [x] Add `EmailProviderRegistry` with `DefaultProviderKey`, module list, `SupportedKeys`, `IsSupported`, and `Resolve` (blank → default, case-insensitive, `InvalidOperationException` listing supported keys otherwise)

- [x] Task 6: Rewire the composition root (AC: #13, #14, #15)
  - [x] In `BE/TripPlanner.Infrastructure/Extensions/InfrastructureServicesExtension.cs`, replace the `if/else` (current lines ~69–95) with `EmailProviderRegistry.Resolve(...).Register(services, configuration)`
  - [x] Repoint the `EmailSettings:Provider` validation at `EmailProviderRegistry.IsSupported` with a message built from `SupportedKeys`; remove the hardcoded provider literals
  - [x] Remove any `using` left unused by the move (`…ExternalServices.Google` / `…ExternalServices.Resend`) — IDE0005 is a build warning and the bar is 0 warnings
  - [x] Green `EmailProviderSelectionTests`, `EmailSettingsValidationTests`, `ResendSettingsValidationTests`, `GoogleSmtpSettingsValidationTests`

- [x] Task 7: Docs, config check, and full verification (AC: #16, #17, #18)
  - [x] Confirm `BE/TripPlanner.API/appsettings.json` and `BE/.env.example` need no change (no new keys); if a key was introduced, update both plus AC #16
  - [x] Update the "Email verification" bullet in `CLAUDE.md` per AC #17
  - [x] Run `dotnet build BE` (expect 0 warnings) and `dotnet test BE` (expect all green)
  - [x] Record the changed files in the File List section

## Dev Notes

### What exists today (read these files before editing — all are UPDATE, not NEW)

- **`Application/Interfaces/Services/IVerificationEmailContentBuilder.cs`** — `VerificationEmailContent(FromAddress, FromName, ToEmail, Subject, TextBody)` positional record + the one-method `IVerificationEmailContentBuilder` port. This is the **only** Application-layer file this story touches; keep it framework-free (plain strings).
- **`Infrastructure/ExternalServices/Email/VerificationEmailContentBuilder.cs`** — builds the link as `$"{settings.VerificationUrlBase}?token={Uri.EscapeDataString(rawToken)}"` and a `\n`-joined plain-text body ("Welcome to TripPlanner!" … "This link expires in {TokenExpiryHours} hours. If you did not sign up, you can safely ignore this email."), subject `"Verify your email address"`. **Preserve that text output exactly** — `ResendEmailSenderTests`/`VerificationEmailContentBuilderTests` assert on fragments of it.
- **`Infrastructure/ExternalServices/Resend/ResendEmailSender.cs`** and **`…/Google/GoogleEmailSender.cs`** — near-identical: primary-constructor injection of `IVerificationEmailContentBuilder` + `IOptions<TSettings>`, a `static MimeMessage BuildMessage(VerificationEmailContent)` seam whose `BodyBuilder` currently sets `TextBody` only, then `Timeout` → `ConnectAsync(host, port, SecureSocketOptions.StartTls, ct)` → `AuthenticateAsync(...)` → `SendAsync` → `DisconnectAsync(true, ct)`. Only the `BodyBuilder` line changes.
- **`Infrastructure/Extensions/InfrastructureServicesExtension.cs`** lines 54–95 — `EmailSettings` options block (four `.Validate` calls, the fourth being the hardcoded `Resend`/`Google` provider check), then a raw-configuration read of `EmailSettings:Provider` feeding an `if/else` that binds+validates *only* the chosen provider's settings and registers its sender. That selective validation is deliberate (blank credentials for the unused provider must not fail startup) and is the invariant most at risk in this refactor — see AC #14.
- **`Infrastructure/Settings/`** — `EmailSettings` (`Provider` default `"Resend"`, `FromAddress`, `FromName`, `VerificationUrlBase`, `TokenExpiryHours` default 24), `ResendSettings` (`ApiKey`, `SmtpHost` `smtp.resend.com`, `SmtpPort` 587, `TimeoutMilliseconds` 10000), `GoogleSmtpSettings` (`Username`, `AppPassword`, `SmtpHost` `smtp.gmail.com`, `SmtpPort` 587, `TimeoutMilliseconds` 10000). **No settings class changes in this story.**
- **`TripPlanner.Infrastructure.csproj`** — MailKit 4.17.0 (MimeKit comes transitively; `BodyBuilder.HtmlBody` needs no new package), `net10.0`, `ImplicitUsings`/`Nullable` enabled, and `<InternalsVisibleTo Include="TripPlanner.Tests" />` — which is why `VerificationEmailTemplate`, `IEmailProviderModule` and `EmailProviderRegistry` can be `internal` and still directly unit-tested.

### Anti-patterns to avoid (each has bitten this repo or is a live trap)

- **Do not build the HTML as a C# string literal** inside the builder. The template is content; it belongs in the `.html` embedded resource per AC #2 so it stays editable and diffable.
- **Do not add a second port for HTML.** `IVerificationEmailContentBuilder` already is the content seam (story 7-2's whole point); extend `VerificationEmailContent`, don't introduce `IHtmlEmailBuilder`.
- **Do not skip HTML-encoding** the substituted values. `VerificationUrlBase` is operator-supplied config and can legitimately contain `&`; unencoded it corrupts the `href`. Encode for HTML, but keep `Uri.EscapeDataString` for the token — the two are different escapings applied at different layers, and `TextBody` must keep the raw form.
- **Do not replace `TextBody` with HTML.** `multipart/alternative` needs both parts; dropping the text part degrades deliverability and plain-text clients.
- **Do not reference CSS custom properties** (`var(--color-primary)`) in the template — email clients don't resolve them. Hardcode the hex values listed in AC #4 (sourced from `FE/src/app/index.css`).
- **Do not use remote images or webfonts.** Most clients block them by default; the header is a styled text wordmark.
- **Do not "simplify" the selective settings validation** into one unconditional pair of `AddOptions` blocks while moving code. That would make a blank `GoogleSmtpSettings:AppPassword` crash startup for Resend users — the exact failure story 7-3 designed around.
- **Do not leave provider name literals in `AddInfrastructureServices`.** If both the registry and the validation know the key list, they will drift; the registry is the single source of truth (AC #13).
- **Do not add comments** of any kind (XML, inline, block) — project rule. **Always brace** control flow, even single statements.

### Design intent for Part B

The current `if/else` is already a *config-selected strategy*; this story makes the seam explicit and closed to modification: each provider owns its own registration in an `IEmailProviderModule`, and `EmailProviderRegistry` maps key → module. The extension method then contains zero provider knowledge. Note the useful side effect — because `EmailSettings:Provider` validation asks the registry, a new module automatically becomes a valid config value with no second edit.

Unknown-provider behaviour intentionally changes: today an unknown value silently falls through to the Resend branch and only fails later at `ValidateOnStart` via the `EmailSettings` provider check. After this story `Resolve` throws `InvalidOperationException` during `AddInfrastructureServices`, listing supported keys — faster and clearer. No existing test asserts the old fall-through (`EmailProviderSelectionTests` only covers null/`Resend`/`resend`/`Google`/`google`, and `EmailSettingsValidationTests` only exercises `FromAddress`/`VerificationUrlBase`/`TokenExpiryHours`), so nothing regresses — but AC #19 requires a test pinning the new behaviour.

### Testing standards

xUnit + NSubstitute, all tests flat under `BE/TripPlanner.Tests/` in namespace `TripPlanner.Tests`, one class per unit named `<Subject>Tests`. Run with `dotnet test BE`, single class via `dotnet test BE --filter "FullyQualifiedName~VerificationEmailContentBuilderTests"`. Follow the existing patterns: settings via `Options.Create(new TSettings { … })`; DI-level tests build a `ConfigurationBuilder().AddInMemoryCollection(...)` with a dummy `ConnectionStrings:DefaultConnection` (`Host=localhost;Database=test;…` — no database is contacted) then call `services.AddInfrastructureServices(configuration)` and either resolve from a scope (`EmailProviderSelectionTests`) or resolve `IStartupValidator` and call `Validate()` (`EmailSettingsValidationTests`). Sender tests never open a real SMTP connection — they assert `BuildMessage` shape and use an unreachable host (`127.0.0.1:1`, 2s timeout) for the throw path.

### Project Structure Notes

New files land in existing folders and follow existing conventions:

```
BE/TripPlanner.Application/Interfaces/Services/IVerificationEmailContentBuilder.cs   UPDATE (+HtmlBody)
BE/TripPlanner.Infrastructure/ExternalServices/Email/
  VerificationEmailContentBuilder.cs                                                 UPDATE (render HTML)
  VerificationEmailTemplate.cs                                                       NEW
  Templates/verification-email.html                                                  NEW (embedded resource)
  Providers/IEmailProviderModule.cs                                                  NEW
  Providers/ResendEmailProviderModule.cs                                             NEW
  Providers/GoogleEmailProviderModule.cs                                             NEW
  Providers/EmailProviderRegistry.cs                                                 NEW
BE/TripPlanner.Infrastructure/ExternalServices/Resend/ResendEmailSender.cs           UPDATE (HtmlBody)
BE/TripPlanner.Infrastructure/ExternalServices/Google/GoogleEmailSender.cs           UPDATE (HtmlBody)
BE/TripPlanner.Infrastructure/Extensions/InfrastructureServicesExtension.cs          UPDATE (registry)
BE/TripPlanner.Infrastructure/TripPlanner.Infrastructure.csproj                      UPDATE (EmbeddedResource)
BE/TripPlanner.Tests/VerificationEmailTemplateTests.cs                               NEW
BE/TripPlanner.Tests/{VerificationEmailContentBuilder,ResendEmailSender,GoogleEmailSender,EmailProviderSelection}Tests.cs  UPDATE
CLAUDE.md                                                                            UPDATE (Email verification bullet)
```

The `Providers/` subfolder is new but consistent with the layer's grouping-by-concern (`ExternalServices/<Concern>/`). Provider *transport* code stays in its existing `ExternalServices/Resend/` and `ExternalServices/Google/` folders — only the DI-registration modules move into `Email/Providers/`, since they are email-composition concerns shared across providers. No variance from the documented architecture: everything except the one Application record member is Infrastructure-internal.

### Prior art in this epic (read for context, do not re-do)

- `_bmad-output/implementation-artifacts/archive/7-1-resend-email-integration.md` — original Resend SMTP integration, the transaction-wrapped registration flow, and the `BuildMessage` test-seam convention.
- `_bmad-output/implementation-artifacts/archive/7-2-email-provider-strategy-pattern.md` — created `IVerificationEmailContentBuilder`/`VerificationEmailContent`, split `EmailSettings` (content) from `ResendSettings` (transport), moved `TokenExpiryHours` to `EmailSettings`. **This story extends that seam; it does not redesign it.**
- `_bmad-output/implementation-artifacts/archive/7-3-google-smtp-email-provider.md` — added `GoogleSmtpSettings`, `GoogleEmailSender`, the `EmailSettings:Provider` switch and the selective-validation rule this story must preserve. Also documents that Gmail's relay rewrites `From` to the authenticated account unless it is a verified alias (see `BE/.env.example`) — worth knowing when hand-testing the new template through Google.

Epic 7 has no `epic/epic-7-*.md` file (same as epic 6); scope lives in these story files. No `_bmad-output/planning-artifacts/` epics/PRD/architecture documents exist for it, and no `project-context.md` is present in the repo — `CLAUDE.md` is the authoritative architecture and code-style source.

### Git intelligence

Current branch `chore/6-10-backend-clean-architecture-remediation` has uncommitted work from story 6-12 (AutoMapper → Mapperly) touching `InfrastructureServicesExtension.cs`, `Mappings/ApplicationMapper.cs` and the Infrastructure csproj — **the same two files this story edits**. Re-read both immediately before editing rather than relying on any cached view, and keep this story's csproj edit in its own `<ItemGroup>` so it does not collide with the Mapperly package reference.

Recent commits establish the conventions this story should mirror: `e343f13` promoted IDE0005/IDE0051/IDE0052 to build warnings (hence the unused-using subtask), and `6d8b85d`/`04d0be6` show the house style for behaviour-preserving refactors — move code verbatim, keep messages identical, let tests prove equivalence.

### Latest technical information

- **MailKit 4.17.0 / MimeKit** — `BodyBuilder` with both `TextBody` and `HtmlBody` set produces `multipart/alternative` with the text part first, which is the correct ordering for client fallback. No package upgrade or addition is needed; `ToMessageBody()` handles part assembly.
- **`System.Net.WebUtility.HtmlEncode`** (BCL, no dependency) encodes `& < > " '` and is the right tool here; `HttpUtility` would pull in `System.Web` and must not be used.
- **Embedded resource naming** — with the default `RootNamespace` (`TripPlanner.Infrastructure`) the logical name is the root namespace plus the file's relative path with directory separators replaced by `.`, giving `TripPlanner.Infrastructure.ExternalServices.Email.Templates.verification-email.html`. A silent name mismatch is the classic embedded-resource failure, which is exactly why AC #19 requires a test that asserts the manifest name resolves.
- **Email HTML compatibility (2026 baseline)** — Outlook's Word rendering engine still ignores most non-inline CSS, flexbox/grid, and `border-radius` on non-VML elements; Gmail strips `<style>` in some contexts and blocks remote images by default. Hence: inline styles, `role="presentation"` tables, no remote assets, and a design that degrades gracefully when the CTA renders as a plain rectangle.

### References

- [Source: CLAUDE.md#Key Patterns] — "Email verification" bullet: the `IEmailSender` / `IVerificationEmailContentBuilder` split, provider selection via `EmailSettings:Provider`, and the selective bind/validate rule.
- [Source: CLAUDE.md#Architecture] — dependency direction (Application must not gain framework dependencies) and the Infrastructure-implements-Application-interfaces rule.
- [Source: CLAUDE.md#Code Style] — mandatory braces, no comments, IDE0005/IDE0051/IDE0052 as build warnings, 0-warning build bar.
- [Source: BE/TripPlanner.Infrastructure/Extensions/InfrastructureServicesExtension.cs#L54-L95] — the `EmailSettings` options block and the provider `if/else` being replaced.
- [Source: BE/TripPlanner.Infrastructure/ExternalServices/Email/VerificationEmailContentBuilder.cs] — the plain-text copy that must survive byte-for-byte.
- [Source: BE/TripPlanner.Infrastructure/ExternalServices/Resend/ResendEmailSender.cs#BuildMessage] and [Source: BE/TripPlanner.Infrastructure/ExternalServices/Google/GoogleEmailSender.cs#BuildMessage] — the `BodyBuilder` sites to extend.
- [Source: FE/src/app/index.css#L2-L61] — Horizon design tokens the template's hardcoded palette and font stack derive from.
- [Source: BE/.env.example#L12-L31] — the existing `EmailSettings__*` / `ResendSettings__*` / `GoogleSmtpSettings__*` keys (unchanged by this story) and the Gmail `From`-rewrite caveat.
- [Source: _bmad-output/implementation-artifacts/archive/7-2-email-provider-strategy-pattern.md] and [Source: _bmad-output/implementation-artifacts/archive/7-3-google-smtp-email-provider.md] — the content/transport seam and provider-selection behaviour being extended.

## Dev Agent Record

### Agent Model Used

claude-opus-5[1m]

### Debug Log References

- Task 1 red: `dotnet build BE` → 2× CS7036 at `VerificationEmailContentBuilder.cs(21,20)`, confirming the builder is the only production construction site (the two sender-test `CreateContent()` factories surfaced once Infrastructure compiled).
- Task 3/4 red: `dotnet test BE --filter "FullyQualifiedName~EmailSender"` → 2 failures (`Assert.NotNull` on `message.HtmlBody`) before the `BodyBuilder` change; green after (24 passed).
- Task 4 self-correction: the initial `Assert.IsType<Multipart>` assertion failed because MimeKit returns the more specific `MultipartAlternative`; assertion tightened to `Assert.IsType<MultipartAlternative>` + `MediaSubtype == "alternative"`.
- Full suite: `dotnet build BE` → 0 warnings / 0 errors; `dotnet test BE` → 336/336 passed.

### Completion Notes List

Ultimate context engine analysis completed - comprehensive developer guide created

**Part A — branded HTML email.** `VerificationEmailContent` gained `HtmlBody` as its sixth and last positional member, still plain strings (Application stays framework-free). The email body lives in `Templates/verification-email.html`, compiled as an embedded resource via its own `<ItemGroup>` in the Infrastructure csproj (kept separate so it does not collide with the in-flight Mapperly package edit) and loaded once through `VerificationEmailTemplate`'s `Lazy<string>` over `GetManifestResourceStream`, with an `InvalidOperationException` naming the manifest resource on miss. `VerificationEmailContentBuilder` renders the four `{{...}}` tokens with `WebUtility.HtmlEncode` applied to every value; the plain-text body, its `Uri.EscapeDataString` token escaping, and the subject are byte-for-byte unchanged. Both senders now set `HtmlBody` alongside `TextBody`, producing `multipart/alternative` (verified structurally, not just by the two `NotNull` assertions).

**Part B — provider registry.** `IEmailProviderModule` plus `ResendEmailProviderModule` / `GoogleEmailProviderModule` carry each provider's `AddOptions` validation block and `AddScoped<IEmailSender, …>` across verbatim, with identical validation messages. `EmailProviderRegistry` owns `DefaultProviderKey`, the module list, `SupportedKeys`, `IsSupported`, and `Resolve`. `AddInfrastructureServices` now holds zero provider literals — the `EmailSettings:Provider` validation message is composed from `SupportedKeys` — and the `TripPlanner.Infrastructure.ExternalServices.{Google,Resend}` usings were dropped with the moved code (IDE0005 is a build warning here). Selective validation is preserved: only the chosen provider's transport settings bind and validate, pinned by both the pre-existing `StartupValidation_GoogleProvider_BlankResendSettings_Passes` and the new `ProviderGoogle_WithBlankResendSettings_StartupValidationSucceeds`.

**Two deviations from the story as written, both flagged rather than silently absorbed:**

1. **AC #19's "`GoogleSmtpSettingsValidationTests` … pass unchanged" could not hold, and the Dev Notes' claim that "no existing test asserts the old fall-through" was inaccurate.** `GoogleSmtpSettingsValidationTests.StartupValidation_InvalidProvider_Throws` did assert it — an unknown provider (`"Mailgun"`) reaching `OptionsValidationException` at `IStartupValidator.Validate()`. AC #12 deliberately moves that failure earlier, to an `InvalidOperationException` thrown from `AddInfrastructureServices`, so the two cannot both be satisfied. Resolved in favour of the ACs: the test was renamed `Registration_InvalidProvider_Throws` and now asserts the new exception type, message content, and throw site. No production behaviour was bent to keep the old test green.
2. **`BE/TripPlanner.API/appsettings.json` carries a pre-existing uncommitted change (not from this story) that removed the `EmailSettings:Provider`, `ResendSettings`, and `GoogleSmtpSettings` sections.** AC #16 requires leaving that file untouched, and this story introduced no new configuration keys, so it was left alone — verified via `git diff`. Behaviour is unaffected: an absent `Provider` resolves to `DefaultProviderKey` (`Resend`) and both providers' transport settings are supplied through `Section__Key` environment variables. Worth a look when that unrelated change is reviewed, but out of scope here.

One judgement call inside AC #5: `{{BrandName}}` is sourced from `EmailSettings:FromName`, falling back to the literal `TripPlanner` when it is blank, so the header band always renders the wordmark AC #4 specifies even under incomplete configuration.

### File List

- `BE/TripPlanner.Application/Interfaces/Services/IVerificationEmailContentBuilder.cs` — modified (`HtmlBody` added to `VerificationEmailContent`)
- `BE/TripPlanner.Infrastructure/ExternalServices/Email/Templates/verification-email.html` — new (embedded resource)
- `BE/TripPlanner.Infrastructure/ExternalServices/Email/VerificationEmailTemplate.cs` — new
- `BE/TripPlanner.Infrastructure/ExternalServices/Email/VerificationEmailContentBuilder.cs` — modified (renders `HtmlBody`)
- `BE/TripPlanner.Infrastructure/ExternalServices/Email/Providers/IEmailProviderModule.cs` — new
- `BE/TripPlanner.Infrastructure/ExternalServices/Email/Providers/ResendEmailProviderModule.cs` — new
- `BE/TripPlanner.Infrastructure/ExternalServices/Email/Providers/GoogleEmailProviderModule.cs` — new
- `BE/TripPlanner.Infrastructure/ExternalServices/Email/Providers/EmailProviderRegistry.cs` — new
- `BE/TripPlanner.Infrastructure/ExternalServices/Resend/ResendEmailSender.cs` — modified (`HtmlBody` on `BodyBuilder`)
- `BE/TripPlanner.Infrastructure/ExternalServices/Google/GoogleEmailSender.cs` — modified (`HtmlBody` on `BodyBuilder`)
- `BE/TripPlanner.Infrastructure/Extensions/InfrastructureServicesExtension.cs` — modified (registry replaces `if/else`; two usings removed)
- `BE/TripPlanner.Infrastructure/TripPlanner.Infrastructure.csproj` — modified (`EmbeddedResource` item group)
- `BE/TripPlanner.Tests/VerificationEmailTemplateTests.cs` — new
- `BE/TripPlanner.Tests/VerificationEmailContentBuilderTests.cs` — modified (HTML body + encoding cases)
- `BE/TripPlanner.Tests/ResendEmailSenderTests.cs` — modified (multipart assertions)
- `BE/TripPlanner.Tests/GoogleEmailSenderTests.cs` — modified (multipart assertions)
- `BE/TripPlanner.Tests/EmailProviderSelectionTests.cs` — modified (unsupported provider, `SupportedKeys`, selective validation)
- `BE/TripPlanner.Tests/GoogleSmtpSettingsValidationTests.cs` — modified (invalid-provider test repointed at the new throw site)
- `CLAUDE.md` — modified (Email verification bullet)
- `_bmad-output/implementation-artifacts/archive/7-4-html-verification-email-and-provider-strategy.md` — modified (this file)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — modified (status)

## Change Log

- 2026-07-27 — Story 7.4 implemented across all 7 tasks. Part A: `VerificationEmailContent.HtmlBody`, embedded branded HTML template + `VerificationEmailTemplate` loader, HTML-encoded token rendering in `VerificationEmailContentBuilder`, `multipart/alternative` from both senders. Part B: `IEmailProviderModule` + two provider modules + `EmailProviderRegistry`, replacing the provider `if/else` in `AddInfrastructureServices`. `dotnet build BE` 0 warnings, `dotnet test BE` 336/336 passing (+13 net new tests). Two story-spec deviations recorded in Completion Notes.
