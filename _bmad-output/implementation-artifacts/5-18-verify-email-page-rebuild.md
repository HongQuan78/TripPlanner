---
baseline_commit: 62a5407f690a3b565a46c1d87e68bda2693ef8e4
---

# Story 5.18: Verify Email Page Rebuild

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **newly-registered TripPlanner user**,
I want **the verification link in my email to open a beautiful, branded confirmation page**,
so that **I get a delightful, trustworthy "you're verified" moment instead of a wall of raw JSON, and can recover gracefully if the link is broken or expired**.

## Context & Problem Statement

Clicking the link in the verification email currently dumps raw JSON in the browser:

```
{"message":"Email verified successfully. You can now log in."}
```

**Root cause (config, not missing code):** the email link is built from `EmailSettings.VerificationUrlBase`, which in **dev** points at the **backend API endpoint** (`http://localhost:5000/api/auth/verify-email`) instead of the **frontend SPA route** (`/verify-email`). So the browser lands on the API's JSON response and the (already-existing) React page never runs. Production config (`.env.production.example`) is already correct (`http://localhost:8080/verify-email`).

Epic 5 explicitly anticipated this: *"Verify-email links point at `EmailSettings.VerificationUrlBase`; for the SPA flow, that base should be repointed to the frontend route `/verify-email`, which then calls the API. Backend config change only (`.env`), no code change."* [Source: epic/epic-5-frontend-web-app.md#Implementation-notes]

A `VerifyEmailPage` already exists (built in story 5-13 on the shared `AuthShell` split-canvas). Per the user's decision, this story **rebuilds that page from scratch** with a dedicated, more beautiful design — no longer sharing `AuthShell` — while preserving every behavioral and accessibility contract, **and** fixes the dev config so the link actually reaches the page.

## Acceptance Criteria

1. **Config repoint (dev):** `EmailSettings:VerificationUrlBase` in `BE/TripPlanner.API/appsettings.json` and `BE/.env.example` points at the frontend SPA route `http://localhost:5173/verify-email` (Vite dev server), so the verification email link opens the React page, not the API JSON. Production config (`.env.production.example` → `http://localhost:8080/verify-email`) is left unchanged.
2. **From-scratch visual design:** `VerifyEmailPage` is rebuilt as a self-contained, visually polished page with its own CSS module — it no longer imports/uses `AuthShell` or `AuthForm.module.css`. The design is centered, branded (wordmark linking to `/`), uses only the existing design tokens from `src/app/index.css` (no new global tokens, no new dependencies), and is responsive/mobile-friendly.
3. **Verifying state:** When the URL carries a `?token=`, the page immediately calls `verifyEmail(token)` and shows an in-progress "Verifying your email…" indication inside an `aria-live="polite"` `role="status"` region.
4. **Verified (success) state:** On success, the same status region resolves in place to the API's returned success message, accompanied by a celebratory visual (e.g. an animated success checkmark, motion respecting `prefers-reduced-motion`) and a clear primary call-to-action linking to `/login` (accessible name matching "log in").
5. **Failed state:** On a failed/expired token, the page shows the recovery copy `"That link didn't work. It may have expired — we can send you a new one."` in a `role="alert"` banner, followed by the resend-verification form.
6. **Idle (no token) state:** When the page is opened without a `?token=`, `verifyEmail` is NOT called; the page shows the hint `"Enter your email address and we will send a new verification link."` and the resend form.
7. **Resend form:** Submitting a valid email calls `resendVerification({ email })`; on resolution the form is replaced by the generic (anti-enumeration) success message returned by the API. A resend error is shown in a `role="alert"` above the still-intact form with the typed email preserved. While pending, the submit button label swaps to "Sending…", carries `aria-disabled="true"` (but is NOT natively `disabled`), and re-submits are ignored.
8. **Single-fire safety:** Under React `StrictMode` double-mount, `verifyEmail` is called exactly once.
9. **Accessibility floor preserved:** email input has an associated label "Email Address"; status/alert regions use correct roles; pending state is announced; the CTA and links are keyboard reachable with visible focus.
10. **No regressions:** the existing `VerifyEmailPage.test.tsx` behavioral contract still passes (updated only where a query legitimately changes due to markup, never weakened); `npm test`, `npm run lint`, `npm run build` (FE) and `dotnet build BE` + `dotnet test BE` all pass.

## Tasks / Subtasks

- [x] **Task 1 — Fix the dev verification-link config (AC: #1)**
  - [x] In `BE/TripPlanner.API/appsettings.json`, change `EmailSettings.VerificationUrlBase` from `http://localhost:5000/api/auth/verify-email` to `http://localhost:5173/verify-email`.
  - [x] In `BE/.env.example`, change `EmailSettings__VerificationUrlBase` to `http://localhost:5173/verify-email`.
  - [x] Do NOT change `.env.production.example` (already correct at `http://localhost:8080/verify-email`).
  - [x] Confirm `BE/TripPlanner.Tests/VerificationEmailContentBuilderTests.cs` still passes — it uses its own inline `EmailSettings` fixture, independent of `appsettings.json`, so it is unaffected; left as-is (optional fixture URL update not taken).
  - [x] Sanity-check the other settings-validation tests (`EmailProviderSelectionTests`, `EmailSettingsValidationTests`, etc.) — verified they only use inline non-empty fixture values, so no changes needed.

- [x] **Task 2 — Rebuild `VerifyEmailPage` from scratch with a new design (AC: #2, #3, #4, #5, #6, #9)**
  - [x] Replaced `FE/src/features/auth/VerifyEmailPage.tsx` with a self-contained implementation that does NOT import `AuthShell` or `AuthForm.module.css`.
  - [x] Created a new co-located CSS module `FE/src/features/auth/VerifyEmailPage.module.css` using only tokens from `src/app/index.css`.
  - [x] Preserved the state machine: `idle` (no token) / `verifying` / `verified` / `failed`.
  - [x] Kept reading the token via `useSearchParams().get('token')` and calling `verifyEmail`/`resendVerification` from `./api`.
  - [x] Centered, branded layout: wordmark `Trip Planner` → `/`, ambient gradient backdrop, elevated card, per-state hero glyph (spinner while verifying, animated check on success, mail icon otherwise, error-tinted on failure).
  - [x] Success state: API `message` rendered inside the persisted `role="status"` region + primary CTA `<Link to="/login">Log in</Link>`.
  - [x] Animated success checkmark (SVG `stroke-dashoffset` draw + `glyph-pop`), neutralized by the global `prefers-reduced-motion` rule.

- [x] **Task 3 — Resend form + accessibility contract (AC: #5, #6, #7, #9)**
  - [x] Reused the resend flow semantics: `role="alert"` failed banner, `role="alert"` resend error above an intact form, generic success replaces the form, pending label "Sending…" with `aria-disabled="true"` (not `disabled`), re-submit ignored while pending, email preserved on error.
  - [x] Input labelled exactly "Email Address", `type="email"`, `autoComplete="email"`.
  - [x] Kept the visually-hidden `role="status"` live region for the pending announcement.

- [x] **Task 4 — Tests (AC: #8, #10)**
  - [x] Existing seven behaviors still hold against the new markup (verified against the suite); only additive assertion made, none weakened.
  - [x] Extended the verifying→verified test to assert the primary CTA links to `/login` AND the celebratory success visual is present (`data-testid="verify-success-check"`).

- [x] **Task 5 — Validate end-to-end (AC: #10)**
  - [x] FE: `npx vitest run` → 24 files / 224 tests pass; `npm run lint` → clean (2 pre-existing warnings, unrelated files); `npm run build` → green.
  - [~] BE: `dotnet build BE` / `dotnet test BE` blocked by the user's running `TripPlanner.API` (PID 30064) locking output DLLs — an environment lock, not a defect. No C# changed (config-only); `appsettings.json` verified valid JSON; no BE test reads the appsettings `VerificationUrlBase` value (all use inline fixtures). Re-run after stopping the API to confirm the prior 184/184 remains green.
  - [~] Manual/visual browser QA deferred — no browser tooling this session (consistent with prior FE stories); recommended at review.

## Dev Notes

### Root-cause detail
- Link built in `BE/TripPlanner.Infrastructure/ExternalServices/Email/VerificationEmailContentBuilder.cs:12`: `$"{settings.VerificationUrlBase}?token={Uri.EscapeDataString(rawToken)}"`. The builder is correct; only the base URL config is wrong for dev. [Source: BE/TripPlanner.Infrastructure/ExternalServices/Email/VerificationEmailContentBuilder.cs]
- The FE dev server runs on `http://localhost:5173` (Vite default, per CLAUDE.md). The SPA route `/verify-email` is registered in `FE/src/app/routes.tsx:53` and calls `GET /api/auth/verify-email?token=` via `verifyEmail()` in `FE/src/features/auth/api.ts:28`.

### Current page = behavioral contract to preserve
The existing `FE/src/features/auth/VerifyEmailPage.tsx` (to be replaced) defines the exact semantics the tests assert. When rebuilding, preserve:
- `verifyFired` ref guard for StrictMode single-fire.
- Verify state resolves inside the SAME `role="status"` node (test asserts the node identity is stable).
- Failed copy string is exact: `"That link didn't work. It may have expired — we can send you a new one."`
- Resend: generic success replaces the form; pending uses `aria-disabled` not `disabled`; error is `role="alert"` above an intact form with email preserved.

### Design guidance ("beautiful, from scratch")
- Use ONLY existing tokens from `FE/src/app/index.css` — palette (`--color-primary #0058bc`, `--color-success #146c2e`, surfaces, `--color-on-surface`, etc.), `--radius-*`, `--shadow-sm/-lg`, `--duration-*`, `--ease-spring`, `--font-sans` (Plus Jakarta Sans). No new global tokens, no new npm dependencies.
- Suggested composition: full-viewport centered layout, soft ambient gradient backdrop (can echo the sunset/sky gradient used in `AuthShell.module.css` hero for brand continuity, but self-contained in the new module), a single elevated card (`--shadow-lg`, `--radius-lg`), state-specific hero glyph, generous spacing, `card-enter` style entrance animation.
- Success delight: an animated checkmark (SVG `stroke-dasharray`/`stroke-dashoffset` draw or a scale/pop via `--ease-spring`), plus a prominent "Log in" primary button. Respect `prefers-reduced-motion` (global rule already neutralizes durations — confirm the checkmark still reads as "checked" when static).
- Reuse `MailIcon` from `FE/src/features/auth/authIcons.tsx`; add a new `CheckIcon`/`CheckCircleIcon` there (or inline in the page) following the same 24×24 stroke style.

### Source tree components to touch
- UPDATE: `FE/src/features/auth/VerifyEmailPage.tsx` (full rewrite)
- NEW: `FE/src/features/auth/VerifyEmailPage.module.css`
- UPDATE: `FE/src/features/auth/VerifyEmailPage.test.tsx`
- UPDATE (optional): `FE/src/features/auth/authIcons.tsx` (add a check glyph)
- UPDATE: `BE/TripPlanner.API/appsettings.json`
- UPDATE: `BE/.env.example`
- Do NOT touch `AuthShell.tsx` / `AuthShell.module.css` / `AuthForm.module.css` — still used by Login/Register; the rebuilt page simply stops importing them.

### Testing standards summary
- FE unit tests: Vitest + Testing Library, co-located `*.test.tsx`, `vi.mock('./api', …)` pattern (see current test file). Query by role/label/text (accessibility-first), never by CSS class. Assert the status-region node identity for the verifying→verified transition.
- BE tests: xUnit; the content-builder test is fixture-driven and unaffected by the config change.

### Project Structure Notes
- Feature-based FE layout (post story 5-17): auth lives under `FE/src/features/auth/` with the `@/` → `src` alias. New CSS module co-locates beside the page. This aligns with the current structure; no variances.
- Anti-enumeration guarantees (generic register/resend responses) are backend behavior and unchanged by this story; the FE simply renders whatever generic message the API returns.

### References
- [Source: epic/epic-5-frontend-web-app.md#Story-5-2 (verify-email page, resend) and Implementation-notes (repoint VerificationUrlBase to /verify-email — config only)]
- [Source: FE/src/features/auth/VerifyEmailPage.tsx (contract to preserve)]
- [Source: FE/src/features/auth/VerifyEmailPage.test.tsx (behavioral tests)]
- [Source: FE/src/features/auth/api.ts:28-37 (verifyEmail, resendVerification)]
- [Source: FE/src/app/routes.tsx:53 (/verify-email route)]
- [Source: FE/src/app/index.css (design tokens)]
- [Source: FE/src/features/auth/AuthShell.module.css (hero gradient reference for brand continuity)]
- [Source: BE/TripPlanner.API/appsettings.json:14 & BE/.env.example:5 (VerificationUrlBase — dev, to fix)]
- [Source: .env.production.example:22 (VerificationUrlBase — prod, already correct)]
- [Source: BE/TripPlanner.Infrastructure/ExternalServices/Email/VerificationEmailContentBuilder.cs:12 (link construction)]
- [Source: CLAUDE.md (Email verification section; FE commands; code style — braces required, no comments)]

### Code style reminders (from CLAUDE.md)
- No comments in code (no XML docs, inline, or block) — applies to both FE and BE.
- Curly braces required for all control-flow statements (BE C#).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m]

### Debug Log References

- `npx vitest run src/features/auth/VerifyEmailPage.test.tsx` → 7/7 pass
- `npx vitest run` (full FE) → 24 files / 224 tests pass (count unchanged; additive assertion only)
- `npm run lint` → 2 pre-existing warnings (AuthContext.tsx, AddToTripContext.tsx), no new issues
- `npm run build` → green
- `dotnet build BE` / `dotnet test BE` → blocked by running `TripPlanner.API` (PID 30064) DLL lock; config-only change, no recompiled C#

### Completion Notes List

- Root cause of the "raw JSON" report was a dev-config bug, not a missing page: `EmailSettings:VerificationUrlBase` pointed at the backend API (`:5000/api/auth/verify-email`) so the email link bypassed the SPA. Repointed dev config to `http://localhost:5173/verify-email` (Vite dev server); prod (`.env.production.example`) was already correct.
- Rebuilt `VerifyEmailPage` from scratch as a self-contained, branded page with its own CSS module — no longer shares `AuthShell`/`AuthForm.module.css` (both still used by Login/Register, untouched). New design: ambient gradient backdrop, elevated card, per-state hero glyph (spinner / animated draw-in checkmark / mail), success delight animation, prominent "Log in" CTA on success.
- Every behavioral + accessibility contract from the 5-13 version preserved (state machine, single-fire StrictMode guard, persisted `role="status"` node across verifying→verified, `role="alert"` banners, `aria-disabled` pending button, anti-enumeration generic resend success, email preserved on error).
- Added `CheckCircleIcon` to `authIcons.tsx` in the existing 24×24 stroke style.
- No new npm dependencies and no new global design tokens.

### File List

- BE/TripPlanner.API/appsettings.json (modified)
- BE/.env.example (modified)
- FE/src/features/auth/VerifyEmailPage.tsx (rewritten)
- FE/src/features/auth/VerifyEmailPage.module.css (new)
- FE/src/features/auth/VerifyEmailPage.test.tsx (modified)
- FE/src/features/auth/authIcons.tsx (modified — added CheckCircleIcon)
- _bmad-output/implementation-artifacts/5-18-verify-email-page-rebuild.md (story)
- _bmad-output/implementation-artifacts/sprint-status.yaml (status tracking)

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-07-17 | 0.1 | Story drafted via create-story — rebuild Verify Email page + fix dev VerificationUrlBase config | Quanhvo |
| 2026-07-17 | 1.0 | Implemented via dev-story — config repointed, page rebuilt from scratch with new CSS module, tests green (FE 224). Status → review | Amelia (dev) |
