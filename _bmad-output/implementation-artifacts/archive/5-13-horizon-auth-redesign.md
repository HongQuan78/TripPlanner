---
baseline_commit: 3a80e86a33052a98ed65efbc9bf25926263376dc
---

# Story 5.13: Redesign the auth surfaces (Login, Register, Verify Email) against the Horizon experience spine

Status: review

## Story

As a Trip Planner visitor authenticating or verifying my email,
I want the Login, Register, and Verify Email screens rebuilt as the Horizon split-canvas auth shell specified in the UX spine pair,
so that the auth experience matches the premium Horizon brand, gains the spine's accessibility floor, and keeps every backend anti-enumeration guarantee intact.

## Context

Source of truth: the spine pair at `_bmad-output/planning-artifacts/ux-designs/ux-tripplanner-2026-07-15/` — `DESIGN.md` (visual tokens/components) and `EXPERIENCE.md` (experience contract). Mockups in `mockups/` are spine-derived references; **the spines win on conflict**. The Horizon token layer already exists app-wide in `FE/src/index.css` (story 5-12) — no token changes are needed. The hero photograph ships as a CSS gradient stand-in (per the spine) until a real asset lands in `FE/src/assets`.

## Acceptance Criteria

1. **Auth shell + routing.** `/login`, `/register`, and `/verify-email` render outside `AppLayout` (no app header/nav) in a shared split-canvas shell: full-height hero panel (left, hidden below 768px) + centered white auth card (right, `max-width: 26rem`). The card's "Trip Planner" wordmark (two words) links to `/`. The hero panel is presentational: gradient photograph stand-in over the `--color-surface-container` fallback, ink gradient overlay per the ≥65%-through-copy rule, per-surface welcome copy (Login "Welcome Back." / Register "Begin Somewhere New." / Verify "Almost There." with the spine's supporting lines), container `aria-hidden="true"`, headline a non-heading element.
2. **Login.** Card title `<h1>` "Sign In" with subtitle "Please enter your details to continue."; fields "Email Address" (leading mail icon) and "Password" (leading lock icon + visibility toggle); no client-side validation — every submit goes to the API and failures land in a `role="alert"` error banner between fields and button with the `ApiError` message verbatim (or "Something went wrong. Please try again."); password value preserved on failure; button "Sign In" → pending "Signing in…"; `returnTo` still honored (same-origin `/` paths only); footer "Don't have an account? Sign Up".
3. **Register.** Card title "Create your account", same subtitle; persistent password helper "At least 8 characters." linked via `aria-describedby`, replaced by the field error when validation fails; submit-time client validation ("Enter a valid email address." / "Password must be at least 8 characters.", both can show at once), invalid fields set `aria-invalid` + `aria-describedby`, focus moves to the first invalid field, and a field's error clears when the user next edits that field; button "Create Account" → pending "Creating your account…"; on success the form is replaced by a success banner under the title "Check your inbox." with the backend's generic message and footer "Already verified? Log in."; footer (idle) "Already have an account? Sign In".
4. **Verify Email.** Same shell, card title "Verify email". Token present → one persistent `role="status"` (`aria-live="polite"`) container renders "Verifying your email…" and resolves in place to the success banner with the backend message + footer "You can now log in."; verify fires exactly once per token. Failure → `role="alert"` error banner with the spine copy "That link didn't work. It may have expired — we can send you a new one." followed immediately by the resend form. No token → resend form with hint "Enter your email address and we will send a new verification link." Resend: button "Resend Verification Email" → pending "Sending…"; success replaces the form with the generic success banner (terminal for the visit); resend failure shows the error above the intact form with the typed email preserved.
5. **Pending-button contract (all forms).** While pending the button keeps its primary fill with the label swapped to the pending phrase, sets `aria-disabled="true"` (never the `disabled` attribute), guards against re-submits in the handler, and a visually hidden `role="status"` region announces the pending phrase.
6. **Password toggle (Login, Register).** A real button inside the field's right padding; flips input type without clearing the value; accessible name swaps "Show password" ↔ "Hide password" as the sole state signal (no `aria-pressed`); standard 2px focus outline (never suppressed); ≥44px hit area.
7. **Accessibility floor.** Every input has an associated `<label>`; leading icons are `aria-hidden` inline SVG (no icon font/dependency); no placeholder text anywhere; error banners `role="alert"`, success banners `aria-live="polite"`; field errors linked via `aria-describedby` with `aria-invalid` on the field; all motion honors the global `prefers-reduced-motion` rule.
8. **Anti-enumeration preserved.** Register success copy identical for fresh/duplicate emails (backend message rendered verbatim); login failures always show the backend's generic message; resend success identical inside/outside the cooldown with no client countdown.
9. **Quality gates.** `npm test`, `npm run lint`, and `npm run build` pass in `FE/`; existing tests updated to the new copy/semantics; new tests cover the shell (no app header on auth routes, wordmark link, hero hidden from AT), toggle behavior, pending `aria-disabled` semantics, register helper/error lifecycle (clear-on-edit, focus-to-first-invalid), and the verify status-region flow.

## Tasks / Subtasks

- [x] Task 1: Auth shell component + routing change (AC: #1)
  - [x] 1.1 Create `AuthShell` (hero panel + card chrome: wordmark, title block, children) with its CSS module implementing the split layout, gradient stand-in hero, and sub-`md` collapse
  - [x] 1.2 Move `/login`, `/register`, `/verify-email` outside `AppLayout` in `routes.tsx`
- [x] Task 2: Login page rebuild (AC: #2, #5, #6, #7, #8)
- [x] Task 3: Register page rebuild (AC: #3, #5, #6, #7, #8)
- [x] Task 4: Verify Email page rebuild (AC: #4, #5, #7, #8)
- [x] Task 5: Test suite update + new coverage, lint, build (AC: #9)

## Dev Notes

- Icons ship as inline SVG (mail, lock, eye, eye-off) — the codebase has no icon dependency and must not gain one; the mockups' 20px 2px-stroke outline set is the reference.
- The pending tests currently assert `toBeDisabled()`; the spine forbids the `disabled` attribute — new assertions check `aria-disabled` and that a second submit is ignored.
- `routes.test.tsx` asserts the login heading `/log in/i`; the card h1 becomes "Sign In".
- jsdom has no layout; the sub-`md` hero collapse is CSS-only (media query) and is not unit-testable — verify visually.
- The verify surface's status container must persist across verifying → verified (children swap in place); failure inserts a separate `role="alert"` banner instead.
- Login/Register field labels change to "Email Address"; `getByLabelText(/email/i)` in existing tests still matches.

## Dev Agent Record

### Implementation Plan

- One shared shell, three tenants: `AuthShell` (in `FE/src/layout/`, beside `AppLayout`) owns the split canvas — presentational hero (`aria-hidden`, gradient photograph stand-in over `--color-surface-container`, ink overlay per the ≥65% rule, non-heading headline) and the card chrome (wordmark link, `<h1>` title, optional subtitle). Pages pass hero copy + title and render their form as children.
- Form internals stay in the shared `AuthForm.module.css`, fully rewritten for the Horizon spec: icon-padded 3rem inputs, 44px toggle with `--radius-full` hover halo, banner classes, full-width 3rem submit, footer/hint/status/visually-hidden utilities.
- `PasswordField` (Login + Register) encapsulates the lock icon, type flip, and the name-swapping toggle; icons live in `authIcons.tsx` as inline SVG (mockups' 20px/2px-stroke outline set — no icon dependency added).
- Routing: auth routes become siblings of the `AppLayout` branch under the same `AuthProvider` node; the `*` NotFound stays inside `AppLayout` and static auth paths outrank it.
- Pending contract implemented as: handler re-submit guard + `aria-disabled="true"` + label swap + a persistent visually hidden `role="status"` span whose text changes to the pending phrase (announces via aria-live semantics without focus theft).
- Verify Email keeps one `role="status"` container mounted across verifying → verified (children swap in place, same DOM node — asserted in tests); failure unmounts it and inserts the `role="alert"` banner with the spine's recovery copy, resend form directly beneath.

### Debug Log

- Existing tests queried `getByLabelText(/password/i)`, which now also matches the toggle's `aria-label="Show password"` — assertions switched to the exact string `'Password'`.
- Verify-failure copy: State Patterns says "the failure message" while Voice/mockup show "That link didn't work…"; the mockup (`key-verify-email.html`) renders the spine copy verbatim, so the friendly recovery line is used instead of the raw `ApiError` message (raw messages remain for the resend form's failures, which the spine's Form-error row explicitly covers).
- The sub-`md` hero collapse is CSS-only (jsdom has no layout) — verified visually via Playwright screenshots at 1440×900 and 390×844.

### Completion Notes

- All three auth surfaces rebuilt on the Horizon split-canvas shell with the spine's microcopy, no app header/nav on auth routes, and the full accessibility floor (labels, `role="alert"`/`aria-live` banners, `aria-describedby`/`aria-invalid` field errors, focus-to-first-invalid, name-swapping password toggle, `aria-disabled` pending buttons, persistent verify status region).
- Anti-enumeration behavior unchanged: backend messages rendered verbatim for register success, login failure, and resend success; no client countdown or verify-first hints.
- 162/162 FE tests pass (30 in the touched files; net +10 new), `npm run lint` clean (2 pre-existing fast-refresh warnings untouched), production build green. Visually verified via Playwright: login/register/verify-email desktop splits match the mockups; mobile hides the hero and centers the card.

## File List

- FE/src/layout/AuthShell.tsx (new — shared split-canvas auth shell)
- FE/src/layout/AuthShell.module.css (new — hero, card chrome, sub-md collapse)
- FE/src/pages/authIcons.tsx (new — inline SVG mail/lock/eye/eye-off icons)
- FE/src/pages/PasswordField.tsx (new — password input with visibility toggle)
- FE/src/pages/AuthForm.module.css (rewritten — Horizon form internals)
- FE/src/pages/LoginPage.tsx (rebuilt)
- FE/src/pages/RegisterPage.tsx (rebuilt)
- FE/src/pages/VerifyEmailPage.tsx (rebuilt)
- FE/src/routes.tsx (modified — auth routes moved outside AppLayout)
- FE/src/pages/LoginPage.test.tsx (updated + new coverage)
- FE/src/pages/RegisterPage.test.tsx (updated + new coverage)
- FE/src/pages/VerifyEmailPage.test.tsx (updated + new coverage)
- FE/src/routes.test.tsx (updated + auth-chrome tests)
- _bmad-output/implementation-artifacts/archive/5-13-horizon-auth-redesign.md (new)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified)

## Change Log

- 2026-07-15: Story created from the Horizon UX spine pair (`ux-tripplanner-2026-07-15`) at user request and picked up immediately for implementation.
- 2026-07-15: Implemented all 5 tasks — Horizon split-canvas auth shell, Login/Register/Verify Email rebuilds, routing change, full accessibility floor. 162/162 FE tests, lint and build green, Playwright visual verification. Status → review.
