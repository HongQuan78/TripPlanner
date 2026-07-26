---
baseline_commit: ff0beb11ec5ecfb8113e28048255b0d4dc522940
---

# Story 4-5: Distinct "Email Not Verified" Message on Login (Epic 4 · US3-AC4)

Status: done

## Story

As a **user who registered but has not yet clicked the verification link**,
I want the login screen to tell me **my email is not verified** instead of "Invalid email or password.",
so that **I understand why sign-in failed and go check my inbox rather than assuming I mistyped my password**.

This is a **deliberate reversal** of code-review decision **D2b** (`code-review-epic-4-findings.md:12`), which changed the unverified-login branch *to* the generic message to close a password/account oracle. The reversal is scoped so no enumeration oracle is reintroduced: the verification check already runs **after** the password verifies, so the distinct message can only ever reach a caller who has already supplied correct credentials — it reveals nothing an attacker does not already hold.

## Acceptance Criteria

1. Login with a **correct password** on an **unverified** account returns `ErrorType.Unauthorized` (401) with the distinct message exactly: **`Your email address is not verified. Please check your inbox.`**
2. Login with a **wrong password** on a verified account still returns `ErrorType.Unauthorized` with the generic **`Invalid email or password.`** — unchanged.
3. Login with an **unknown email** still returns `ErrorType.Unauthorized` with the generic **`Invalid email or password.`** — unchanged. No branch may reveal whether an email is registered.
4. The verification check remains **after** password verification, so an unverified account with a **wrong** password yields the generic message, never the distinct one.
5. The login page surfaces the distinct backend message verbatim in its `role="alert"` banner; the password value and enabled submit button are preserved as with any other 401.
6. The anti-enumeration documentation that mandates the old behavior is amended to record the new, narrower constraint: `epic/epic-4-user-authentication.md` (US3 Status), `_bmad-output/planning-artifacts/ux-designs/ux-tripplanner-2026-07-15/EXPERIENCE.md` (hard constraint + voice table), and `CLAUDE.md` (Email verification section).

## Tasks / Subtasks

- [x] **Task 1: Backend — distinct unverified message** (AC: 1, 2, 3, 4)
  - [x] Write the FAILING test first: amend `AuthServiceTests.LoginAsync_UnverifiedEmail_ReturnsUnauthorized` to assert `result.Error.Description == "Your email address is not verified. Please check your inbox."`; confirm RED.
  - [x] Add a FAILING test `LoginAsync_UnverifiedEmailWithWrongPassword_ReturnsGenericMessage` asserting an unverified user + `Verify(...) == false` yields the generic `Invalid email or password.` (proves the ordering of AC4); confirm its correctness.
  - [x] Change the `if (!user.IsEmailVerified)` branch in `BE/TripPlanner.Application/UseCases/Auth/LoginUserUseCase.cs:23-26` to return the distinct message, keeping `ErrorType.Unauthorized` and keeping the branch **after** the password check.
  - [x] Tighten `LoginAsync_InvalidPassword_ReturnsUnauthorized` and `LoginAsync_UnknownEmail_ReturnsUnauthorized` to assert the generic literal explicitly (they currently assert only `ErrorType`, so they would not catch a regression that leaks the distinct copy).
  - [x] Confirm GREEN.
- [x] **Task 2: Frontend — surface the distinct copy** (AC: 5)
  - [x] Write a FAILING test in `FE/src/features/auth/LoginPage.test.tsx`: reject `login` with `new ApiError(401, 'Your email address is not verified. Please check your inbox.')` and assert the alert banner contains that text, the password is preserved, and the submit button is not `aria-disabled`.
  - [x] Verify whether `LoginPage.tsx` needs any change — it already renders `error.message` from `ApiError` (`LoginPage.tsx:34-35`) and `parseErrorMessage` reads ProblemDetails `detail` (`client.ts:41-43`). If the test passes without a code change, the test is the deliverable (it locks the pass-through in); do **not** add a redundant branch.
  - [x] Confirm the 401 pass-through does not trip the global unauthorized handler for an anonymous visitor (`AuthContext.tsx:54-57` returns early when there is no session) — assert `localStorage` stays empty and the user remains on `/login`.
- [x] **Task 3: Amend the constraint documentation** (AC: 6)
  - [x] `epic/epic-4-user-authentication.md` US3 Status (`:67`): replace the "generic ... no distinct verify-first message, closing the password/account oracle" claim with the new behavior and its rationale (check stays post-password, so no enumeration oracle).
  - [x] `EXPERIENCE.md:32`: narrow the hard constraint — the UI must still never reveal whether an email **has an account**; the unverified state may be disclosed **only after** a correct password.
  - [x] `EXPERIENCE.md:74`: update the voice table row so the distinct copy is the "Do", not the "Don't".
  - [x] `CLAUDE.md` Email verification section (`:148`): correct the sentence stating login is rejected with "the same generic `Invalid email or password.` message ... there is no distinct verify-first message".
  - [x] Leave `EXPERIENCE.md:245,250` narrative and the register/resend anti-enumeration copy **untouched** — only the unverified-login beat changes. **Deviated on `:250`** — see Completion Notes; `:245` and all register/resend copy are untouched as specified.
- [x] **Task 4: Validation** (AC: 1-6)
  - [x] `dotnet test BE` green (no regressions).
  - [x] `npm test` in `FE/` green; `npm run lint`; `npm run build`.

### Review Findings

Adversarial code review 2026-07-26 (blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor).

- [x] [Review][Decision→Patch] **The anti-enumeration claim added by this diff is false — register-then-login now composes into an account-existence oracle** — `RegisterUserUseCase.cs:27-30` returns the generic success on a duplicate email *without touching the existing account's password*. So an attacker registers `victim@x.com` with a password `P` of their own choosing: if the address was free, the account now exists unverified with password `P`, and login with `P` answers `Your email address is not verified. Please check your inbox.`; if the address was already registered, `P` does not match and login answers `Invalid email or password.` The two responses are distinguishable, so the call pair discloses registration status for any address. Before this diff both paths returned the identical string and the probe was inert. Second, narrower mechanism: an unverified account used to be fully opaque to password guessing (right and wrong passwords both returned the generic string); now a correct password is positively confirmed. The story's justification ("reveals nothing an attacker does not already hold") does not cover the case where the attacker is the one who *set* the credentials. The statements added at `CLAUDE.md:148` ("no branch reveals whether an email is registered"), `epic/epic-4-user-authentication.md:69`, and `EXPERIENCE.md:32` ("This leaks nothing") are therefore not true as written. Raised independently by blind-hunter and edge-case-hunter. **Resolved 2026-07-26 by user decision — accept the oracle, correct the docs.** The two properties are mutually exclusive: the distinct message sits *after* the password check, so reaching it requires a valid password for an unverified account, and under open registration an attacker can always manufacture that for a *free* address. Overwriting the password on duplicate register is account takeover; deferring account creation until the link is clicked closes the oracle but leaves no unverified account to log into, making the message dead code; returning the distinct copy on a wrong password reinstates the original D2b oracle. So the message stays and the three claims are corrected to say plainly that a register+login *pair* can distinguish a registered address — accepted risk, mitigation (rate limiting) deferred below. Mitigating context: the probe is loud and destructive rather than stealthy — it mails the victim an unsolicited verification link and squats the address (see the new deferred item on duplicate-register squatting).
- [x] [Review][Patch] Correct the three overclaiming statements to record the accepted register+login oracle [CLAUDE.md:148, epic/epic-4-user-authentication.md:69, _bmad-output/planning-artifacts/ux-designs/ux-tripplanner-2026-07-15/EXPERIENCE.md:32] — all three now say "no *single* interaction/response reveals account existence" and name the accepted register+login pair, pointing at `deferred-work.md`. Each also warns against "hardening" the message back on the false belief that it closes enumeration.
- [x] [Review][Patch] Nothing verifies the distinct message actually reaches the browser — the wire layer is untested [BE/TripPlanner.Tests/ResultExtensionTests.cs:11] and the new FE test injects the literal it asserts [FE/src/features/auth/LoginPage.test.tsx:98] — added `ToResponse_UnauthorizedFailure_EmitsDescriptionAsProblemDetail`, and the pre-existing 401 test now asserts `problem.ProblemDetails.Detail` too. Dropping `detail:` from `ResultExtension` (the demonstrated silent-regression path) now fails two tests instead of none. The FE test's tautology is inherent to a suite that mocks `./api`; the wire assertion is the real guard, so the FE test was left as the pass-through regression guard it is.
- [x] [Review][Patch] Live, unclosed specs still mandate the old generic behavior and are neither amended nor disclosed [_bmad-output/implementation-artifacts/5-2-authentication-ui.md:45] — annotated `5-2-authentication-ui.md:45`, `epic/epic-5-frontend-web-app.md:38`, `epic-5-context.md:33`, `EXPERIENCE.md:143` (States table, "one error voice" → two backend voices), `spec-fix-epic-4-review-findings.md:35,52,72-73`, and appended a `Pass 3c` entry to the UX `.memlog.md` superseding its line 16 (append-only log — history left intact rather than rewritten).
- [x] [Review][Patch] The reversed decision D2b is not marked as reversed in the artifact a reader consults for decisions [_bmad-output/implementation-artifacts/code-review-epic-4-findings.md:12] — D2b struck through with the reversal, its date, the reason, and a "do not re-apply" note; the original rationale is preserved as the record of that pass.
- [x] [Review][Patch] The message literal is duplicated across four files with no shared constant, against the convention already set in the same folder [BE/TripPlanner.Application/UseCases/Auth/LoginUserUseCase.cs:27] — extracted `LoginUserUseCase.GenericMessage` and `.NotVerifiedMessage` (mirroring `RegisterUserUseCase`), which also de-duplicates the two `Invalid email or password.` occurrences. **Deliberately not propagated to the tests:** the assertions keep raw literals, because a test that compares the constant against itself would stop pinning the wording the AC fixes.
- [x] [Review][Patch] The AC4 ordering test never asserts its own precondition (`IsEmailVerified == false`) and the unverified branch never asserts that no JWT is minted [BE/TripPlanner.Tests/AuthServiceTests.cs:135] — both unverified tests now assert the precondition, and the AC1 test asserts `_tokenService.DidNotReceive().GenerateToken(...)`.
- [x] [Review][Patch] `4-5-unverified-login-message` is filed positionally inside the epic-10 block, and reopened `epic-4` tracks no per-story keys [_bmad-output/implementation-artifacts/sprint-status.yaml:856] — **partially downgraded on inspection:** the file's actual practice is to append late-arriving stories chronologically regardless of epic (`5-8` sits between `7-3` and `epic-8`), so the entry was not misfiled by convention. Moved under `epic-4` anyway to give the reopen a visible closing condition, with the reason recorded in the comment block.
- [x] [Review][Patch] The voice-table Do/Don't cell has swollen into a two-clause paragraph, losing the table's scannability [_bmad-output/planning-artifacts/ux-designs/ux-tripplanner-2026-07-15/EXPERIENCE.md:74] — both cells trimmed back to scannable clauses; the reasoning they carried now lives in the narrowed hard constraint at `:32`, which is its proper home.
- [x] [Review][Defer] Any login 401 wipes an existing session [FE/src/shared/api/client.ts:75] — deferred, pre-existing
- [x] [Review][Defer] No rate limiting or lockout anywhere on `/api/auth/login` [BE/TripPlanner.API/Program.cs] — deferred, pre-existing
- [x] [Review][Defer] The banner says "check your inbox" but `/login` offers no resend affordance, and an expired token is a dead end [FE/src/features/auth/LoginPage.tsx:78] — deferred, pre-existing

Dismissed as noise: epic-4's AC list not amended (epic ACs mirror the authoritative `requirement/Sheet1.html`; the behavior is carried by the Status prose and the amendment note, and the epic's own Test Plan at `:149` already specified the verify message); no logging added on the unverified branch (`LoginUserUseCase` takes no `ILogger` by design — request/response logging is `LoggingMiddleware`'s job repo-wide).

## Dev Notes

- **Scope is one branch plus its tests and docs.** The only production-code change is the message string in `LoginUserUseCase.cs:25`. `ErrorType` stays `Unauthorized` (401) — the user selected the "distinct message" option, **not** the "distinct machine-readable code" option, so do **not** introduce a new `ErrorType`, error code, or a resend-verification link on the login page. Those remain available as future work.
- **Ordering is load-bearing.** The verification check must stay below the `user is null || !passwordHasher.Verify(...)` guard. Hoisting it above (or merging the branches) would let an attacker learn that an email is registered without knowing the password — exactly the oracle D2b closed. AC4 exists to pin this.
- **Message wording is fixed** by the approved option: `Your email address is not verified. Please check your inbox.` It matches the Horizon front-desk voice (brief, warm, never blaming) documented in `EXPERIENCE.md:68`.
- **No frontend code change is expected.** The chain already carries backend messages verbatim: `ExceptionHandlingMiddleware`/`ResultExtension.ToResponse()` emit ProblemDetails → `parseErrorMessage` prefers `detail` (`FE/src/shared/api/client.ts:41`) → `LoginPage` sets it as `formError` (`LoginPage.tsx:34-35`) → rendered in the `role="alert"` paragraph (`:78-82`). Confirm rather than assume.
- **Existing test at `LoginPage.test.tsx:81` stays.** It asserts the *generic* message path and is still correct (wrong password). Add a sibling test for the unverified path; do not repurpose it.
- **Anti-enumeration elsewhere is unaffected.** Register still returns identical copy for fresh and duplicate emails; resend-verification still returns the generic success during its 60-second cooldown. Only the post-password unverified login branch changes.
- **Code style:** curly braces required on all control flow; no comments of any kind (CLAUDE.md).

### Project Structure Notes

- Touch points: `BE/TripPlanner.Application/UseCases/Auth/LoginUserUseCase.cs`, `BE/TripPlanner.Tests/AuthServiceTests.cs`, `FE/src/features/auth/LoginPage.test.tsx`, `epic/epic-4-user-authentication.md`, `EXPERIENCE.md`, `CLAUDE.md`.
- Unchanged: `User` domain model, `IsEmailVerified` persistence, the `AddEmailVerification` migration, all DTOs, `RegisterUserUseCase`, `VerifyEmailUseCase`, `ResendVerificationEmailUseCase`, and every frontend component file.

### References

- Reversed decision: `_bmad-output/implementation-artifacts/code-review-epic-4-findings.md:12` (D2b) and `spec-fix-epic-4-review-findings.md:35,72-73`.
- Requirement: `epic/epic-4-user-authentication.md` US3-AC4 ("See a message when credentials are invalid") — the sheet does not mandate the message be generic; that was a review-time hardening choice.
- Prior verification records that will go stale and are superseded by this story: `backend-requirements-verification-report.md:215,223`, `backend-code-review-report.md:88`, `review-accessibility.md:59`, `review-rubric.md:58`.

## Dev Agent Record

### Implementation Plan

One-line production change plus test hardening and doc amendment. Followed red-green-refactor: amended the unverified-login assertion to the new literal (RED), then changed the message in `LoginUserUseCase.cs` (GREEN). Added a companion test proving the ordering invariant — an unverified user with a *wrong* password still gets the generic message — and tightened the two pre-existing generic-path tests, which asserted only `ErrorType` and would therefore not have caught a leak of the distinct copy into the wrong-password or unknown-email branch. No refactor was warranted: the branch structure is already correct and the ordering must not be touched.

### Completion Notes

- AC1 ✅ — Unverified account + correct password returns `ErrorType.Unauthorized` with exactly `Your email address is not verified. Please check your inbox.` (`LoginUserUseCase.cs:23-27`, asserted by `LoginAsync_UnverifiedEmail_ReturnsUnauthorizedWithNotVerifiedMessage`).
- AC2 ✅ — Wrong password on a verified account still returns the generic literal; `LoginAsync_InvalidPassword_ReturnsUnauthorized` now asserts the string, not just the error type.
- AC3 ✅ — Unknown email still returns the generic literal; `LoginAsync_UnknownEmail_ReturnsUnauthorized` likewise tightened. No branch distinguishes a registered email from an unknown one.
- AC4 ✅ — Ordering preserved (verification check remains below the password guard) and now pinned by the new `LoginAsync_UnverifiedEmailWithWrongPassword_ReturnsGenericMessage`. This is the invariant that keeps the change free of an enumeration oracle.
- AC5 ✅ — **No frontend code change was needed.** The message already flows through verbatim: ProblemDetails `detail` → `parseErrorMessage` (`client.ts:41-43`) → `formError` (`LoginPage.tsx:34-35`) → the `role="alert"` paragraph. The new test asserts the distinct copy in the banner, that `localStorage` stays empty, that the user remains on `/login` (the global 401 handler correctly no-ops for an anonymous visitor), that the password is preserved, and that the submit button is re-enabled.
- AC6 ✅ — Amended `CLAUDE.md`, `epic/epic-4-user-authentication.md` (US3 Status + a dated amendment note explaining the D2b reversal), and `EXPERIENCE.md` (hard constraint narrowed, voice-table row inverted).
- **Deviation from Task 3's last subtask:** the story instructed leaving `EXPERIENCE.md:250` untouched, but that line explicitly asserted "unverified account → the same 'Invalid email or password.' banner … No hint, no special copy" — leaving it would have left the document contradicting the constraint amended four lines' worth of edits earlier. It was corrected to describe both paths. `:245` (the wrong-password beat, still accurate) and all register/resend anti-enumeration copy are untouched as specified.
- **Known stale artifacts, deliberately not edited:** `backend-requirements-verification-report.md:215,223`, `backend-code-review-report.md:88`, `review-accessibility.md:59`, and `review-rubric.md:58` record the old generic-message behavior. These are point-in-time audit records, not living specs; rewriting them would falsify the audit history. They are superseded by this story and listed here so a future reader is not misled.
- **Not implemented (out of scope by the approved option):** no new `ErrorType`/machine-readable error code, and no inline "Resend verification email" action on the login page. Both remain available as follow-up work if wanted.
- Validation: backend 299/299 passing; frontend 321/321 across 28 files; Oxlint clean (2 pre-existing unrelated fast-refresh warnings in `AuthContext.tsx`/`AddToTripContext.tsx`); production build green (pre-existing >500 kB chunk-size advisory unchanged).

### Debug Log

- RED: `LoginAsync_UnverifiedEmail_ReturnsUnauthorizedWithNotVerifiedMessage` failed with `Expected: "Your email address is not verified. Pleas"··· / Actual: "Invalid email or password."` — 1 failed, 4 passed of the 5 `LoginAsync` tests, confirming the test targeted the right branch.
- The ordering test (`…WithWrongPassword…`) passed on first run by design — it documents existing correct behavior that the change must not disturb, so it never had a RED phase.
- The frontend test also passed on first run: the banner already renders any backend message verbatim, so no `LoginPage.tsx` change was made. The test's value is as a regression guard on that pass-through, not as a driver of new code — recorded plainly rather than presented as a red-to-green cycle.
- GREEN: `dotnet test BE` 299/299; `npm test` 321/321.

## File List

- `BE/TripPlanner.Application/UseCases/Auth/LoginUserUseCase.cs` (modified) — unverified branch returns the distinct not-verified message; ordering below the password guard unchanged.
- `BE/TripPlanner.Tests/AuthServiceTests.cs` (modified) — renamed/retargeted the unverified assertion, added the wrong-password-on-unverified ordering test, tightened the invalid-password and unknown-email tests to assert the generic literal.
- `FE/src/features/auth/LoginPage.test.tsx` (modified) — added a test asserting the distinct message renders in the alert banner with session/password/button state intact.
- `CLAUDE.md` (modified) — corrected the Email verification section; documented the post-password ordering as the invariant to preserve.
- `epic/epic-4-user-authentication.md` (modified) — US3 Status rewritten plus a dated amendment note recording the D2b reversal and its rationale.
- `_bmad-output/planning-artifacts/ux-designs/ux-tripplanner-2026-07-15/EXPERIENCE.md` (modified) — narrowed the anti-enumeration hard constraint, inverted the voice-table row, corrected the Flow 2 failure-path narrative.
- `_bmad-output/implementation-artifacts/4-5-unverified-login-message.md` (added) — this story.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified) — registered `4-5-unverified-login-message`, reopened `epic-4` (was `done`), added a dated note.

## Change Log

- 2026-07-26: Story drafted from a user-reported UX complaint (unverified login shows "Invalid email or password."). Records the deliberate reversal of code-review decision D2b, scoped to keep the check post-password so no enumeration oracle returns. Status: ready-for-dev.
- 2026-07-26: Code-reviewed (4 adversarial layers). 1 decision-needed, 8 patch, 3 defer, 2 dismissed. The decision — the diff's "no branch reveals whether an email is registered" claim is false, because register-then-login with a caller-chosen password distinguishes a free address from a registered one — was resolved by the user in favour of keeping the message and correcting the docs, the two properties being mutually exclusive under open registration. All 8 patches applied: three overclaiming doc statements corrected, a wire-level `ProblemDetails.Detail` assertion added (closing the silent-regression path where the message could be dropped at the HTTP boundary with a green suite), six stale live specs annotated, D2b marked reversed, the message literals extracted to constants, two missing test assertions added, the sprint-status entry moved under epic-4, and the voice-table cells trimmed. BE 300/300. Status: done.
- 2026-07-26: Implemented — unverified login now returns `Your email address is not verified. Please check your inbox.` after the password verifies; generic message retained for wrong-password and unknown-email. Ordering invariant pinned by a new test; two pre-existing generic-path tests tightened. No frontend code change required. Anti-enumeration docs (`CLAUDE.md`, epic-4 US3, `EXPERIENCE.md`) amended. BE 299/299, FE 321/321, lint + build green. Status: review.
