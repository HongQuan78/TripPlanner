---
baseline_commit: 8146a05
---

# Story 6-6: Feature 2 (Destination Details) — Requirements Verification Review

Status: review

## Story

As the **engineering team**,
I want a **function-by-function verification of Feature 2 (Destination Details) against `epic-2-destination-details.md` and `requirement/Sheet1.html`**,
so that **we have documented evidence of which acceptance criteria and business rules are correctly implemented, which deviate, and which remain gaps — before Feature 2 is treated as shippable.**

This is a **verification/audit story** (epic-6 quality-fix family, mirroring `6-1-backend-requirements-verification`). Its "implementation" is the review itself: reading the shipped code end-to-end (BE + FE), citing evidence, and rendering a verdict per user story, per acceptance criterion, and per business rule. No production code is changed by this story; any fix it surfaces becomes a separate follow-up.

## Acceptance Criteria

1. Every Feature 2 user story from `requirement/Sheet1.html` (US1–US4) is reviewed individually, including the ones marked `Selected = No`.
2. Every acceptance criterion and every business rule for each user story is given an explicit verdict (PASS ✅ / PARTIAL ⚠️ / FAIL ❌ / not-selected ➖) with a concrete code citation (`file:line`) as evidence.
3. The relevant non-functional requirements for Feature 2 (NFR3 details latency ≤ 2 s; NFR6 authorization) are assessed.
4. Findings are summarized High → Low with an actionable fix suggestion for every non-PASS item.
5. Verdicts are backed by the existing automated tests (BE + FE) being green at the reviewed commit.

## Tasks / Subtasks

- [x] **Task 1: Establish scope & source of truth** (AC: 1)
  - [x] Confirm Feature 2 = Epic 2 = `requirement/Sheet1.html` rows 8–12 (US1 open details, US2 photos, US3 map, US4 opening hours) + NFR3/NFR6.
  - [x] Enumerate shipped Feature 2 code surface across BE + FE.
- [x] **Task 2: Review US1 — Open a destination details view** (AC: 1, 2)
  - [x] Verdict per AC1–AC7 and each business rule, with citations.
- [x] **Task 3: Review US2 — View photos in destination details** (AC: 1, 2)
  - [x] Verdict per AC1–AC3 + business rule, with citations.
- [x] **Task 4: Review US3 — View map and location info (not selected)** (AC: 1, 2)
  - [x] Verdict per AC1–AC3; note bonus implementation status.
- [x] **Task 5: Review US4 — View opening hours (selected)** (AC: 1, 2)
  - [x] Verdict per AC1–AC2, including the 6-5 Overpass sourcing dependency.
- [x] **Task 6: Assess NFRs (NFR3 latency, NFR6 authorization)** (AC: 3)
- [x] **Task 7: Summarize findings High → Low with fixes; confirm tests green** (AC: 4, 5)

## Dev Notes

- **Source of truth:** `requirement/Sheet1.html` (Feature 2 rows) is authoritative; `epic/epic-2-destination-details.md` is the design intent. Where the epic re-interprets a UI-language requirement into an API-level decision (e.g. "Add to Trip unavailable if not logged in" → route-level 401 + FE login redirect), that documented decision is treated as the accepted design, and the review notes the deviation rather than failing it outright.
- **Method:** code read + cited existing tests. No behavior changed.
- **Legend:** PASS ✅ · PARTIAL ⚠️ · FAIL/missing ❌ · optional/not-selected ➖
- **Key surface reviewed:**
  - BE: `LocationEndpoints.cs` (`GET /api/locations/{xid}/details`, anonymous), `GetDestinationDetailsUseCase.cs`, `OpenTripMapDestinationDetailsService.cs`, `OpenTripMapPlaceClient.cs` (Redis cache), `OverpassOpeningHoursProvider.cs` (6-5), `DestinationResolver.cs` (xid-upsert for add-to-trip), `DestinationDetailsResponse.cs`.
  - FE: `DestinationDetailsPage.tsx`, `AttractionHero.tsx` (photo gallery), `AttractionMap.tsx`, `openNow.ts`, `hooks.ts` (`useDestinationDetails`), `api.ts`, `AttractionCard.tsx` (list → details link), `AddToTripContext.tsx` (auth gating), `routes.tsx`.

---

## Feature 2: Destination Details — Verification Audit

- **Source of truth:** `requirement/Sheet1.html` (Feature 2, rows 8–12)
- **Scope:** all 4 user stories (US1–US4) + NFR3, NFR6 — full stack (BE + FE)
- **Reviewed at commit:** `8146a05` (`feat: source real opening hours from Overpass & cut details latency` — 6-5/6-7/6-8 merged)
- **Date:** 2026-07-25 (re-run; supersedes the 2026-07-24 pass that graded an uncommitted tree while claiming `1bbb89f`)
- **Legend:** PASS ✅ · PARTIAL ⚠️ · FAIL/missing ❌ · optional/not-selected ➖

### F2-US1 — Open a destination details view · Medium · Selected: Yes

| AC / Rule | Verdict | Evidence |
|---|---|---|
| 1. Select a destination from the list → open detail view | ✅ | `AttractionCard.tsx:34` `<Link to={`/attractions/${attraction.xid}`}>`; route `routes.tsx:31` `/attractions/:xid → DestinationDetailsPage` |
| 2. View name, category, short description | ✅ | Hero `name`/`category` props `DestinationDetailsPage.tsx:157-163`; description `:169-173`. BE maps `Name` `OpenTripMapDestinationDetailsService.cs:34`, `Category = PrimaryKind(place.Kinds)` `:35`, Wikipedia extract → `Description` `:37` |
| 3. View images when available | ✅ | `AttractionHero` `<img>` `AttractionHero.tsx:86-100` (see US2) |
| 4. View location on a map *(optional)* | ✅ | `AttractionMap` rendered when `hasCoords` `DestinationDetailsPage.tsx:132,176-186` — optional AC, implemented |
| 5. View address, opening hours, website when available | ✅ | `InfoRow` Address/Opening hours/Website `DestinationDetailsPage.tsx:191-202`; BE `ComposeAddress` `OpenTripMapDestinationDetailsService.cs:80-101` (assigned `:39`), `OpeningHours` `:40`, `Website = place.Url` `:41` |
| 6. Identify an option to add to a trip | ✅ | "Add to Trip" button `DestinationDetailsPage.tsx:243-245` (aside panel) + `:282-288` (sticky bar) |
| 7. Close detail view → return to previous list | ✅ | `goBack = () => navigate(-1)` `DestinationDetailsPage.tsx:79`, passed as hero `onBack` `:162`; also on the loading/error states `:90,102` |
| BR: details must match the selected destination exactly | ✅ | Fetched by `xid`: `api.ts:35` → `/api/locations/{xid}/details`; place keyed by xid `OpenTripMapPlaceClient.cs:20`; response requires non-empty `Xid`+`Name` and echoes the provider's own `place.Xid` `OpenTripMapDestinationDetailsService.cs:13-17,33` |
| BR: detail view must still open if fields are missing | ✅ | Only `Xid`+`Name` required `OpenTripMapDestinationDetailsService.cs:14-17`; every other field nullable, `NormalizeOptional` `:103-111` collapses blanks to null, FE renders the per-row `emptyLabel` (default `'Not available'`) `DestinationDetailsPage.tsx:37,49-50` |
| BR: images/maps shown only when data available | ✅ | Map gated by `hasCoords` `DestinationDetailsPage.tsx:132,176`; images → "No photo yet" placeholder when empty `AttractionHero.tsx:64-72` |
| BR: "Add to Trip" unavailable/unclickable if not logged in | ⚠️ | **Design deviation (documented & functionally sound).** Button stays clickable; when logged out `requestAdd` redirects to `/login?returnTo=…` (`AddToTripContext.tsx:23-26`) and the page shows a "Log in to add to your trip" note (`DestinationDetailsPage.tsx:143-152,273-280`). Server-side the mutation is hard-gated: `/api/trips` `.RequireAuthorization()` → 401 (`RouteExtension.cs:25-29`). Epic 2's tech approach explicitly re-interpreted the sheet's literal "unclickable" as this redirect/401 pattern, which also satisfies Feature 3 US8 ("prompt me to log in"). Not literally disabled, but access is correctly prevented. |
| Note: fetch details by provider place ID (xid) | ✅ | `GET /api/locations/{xid}/details` `LocationEndpoints.cs:13,35-42`; anonymous by design — `/api/locations` carries no `.RequireAuthorization()` `RouteExtension.cs:20-23` |

**Verdict:** US1 fully implemented. The only nuance is the deliberate "redirect-to-login" gating instead of a disabled button — an accepted design decision, not a defect.

### F2-US2 — View photos in destination details · Medium · Selected: Yes

| AC / Rule | Verdict | Evidence |
|---|---|---|
| 1. View destination photos when available | ✅ | `AttractionHero.tsx:86-100` renders `<img>` from `images`; fed by `destination.imageUrls` `DestinationDetailsPage.tsx:159` |
| 2. Swipe through multiple photos when available | ⚠️ | **UI supports it, data layer does not feed it.** Gallery has prev/next controls, arrow-key nav, and dot indicators, all gated on `total > 1` (`AttractionHero.tsx:34-45,102-131`). BUT the details service returns **at most one** image — `List<string> imageUrls = string.IsNullOrWhiteSpace(imageUrl) ? [] : [imageUrl]` (`OpenTripMapDestinationDetailsService.cs:27`), a single Wikipedia image from `IDestinationImageProvider` `:19-21`. So `total` is never > 1 and multi-photo swipe is unreachable on the details view. Matches epic risk #3 (image count is a provider-data limitation), but the AC's "when available" is effectively always false. → follow-up story `8-5-destination-details-multiple-images` (drafted, `ready-for-dev`). |
| 3. See a placeholder when no photos are available | ✅ | `AttractionHero.tsx:64-72` "No photo yet" placeholder (`data-testid="image-placeholder"`); URLs that fail to load are dropped from `usableImages` and fall back to the same placeholder `:26,95-99` |
| BR: show at least 1 image if available, else placeholder | ✅ | Single Wikipedia image when present, else placeholder (above) |

**Verdict:** US2 PARTIAL. AC1/AC3 and the business rule pass. AC2 (swipe multiple) is coded in the UI but unreachable because the backend supplies a single image per destination — a real, if low-severity, gap against the requirement.

### F2-US3 — View map and location info · Low · Selected: No

| AC / Rule | Verdict | Evidence |
|---|---|---|
| 1. View destination on a map with a marker | ➖ / ✅ | Not selected, **but implemented**: `AttractionMap` `DestinationDetailsPage.tsx:176-186` renders a map with a marker for the destination coords |
| 2. Zoom and pan the map | ➖ | Not selected; depends on `AttractionMap` interaction affordances (`AttractionMap.tsx`) — out of required scope, not assessed |
| 3. View an address/area label when available | ➖ / ✅ | Address surfaced via `InfoRow label="Address"` `DestinationDetailsPage.tsx:191` — label present |

**Verdict:** Not selected, so no obligation — noted as **bonus-implemented** (map + marker + address). No action required.

### F2-US4 — View opening hours when available · Low · Selected: Yes

| AC / Rule | Verdict | Evidence |
|---|---|---|
| 1. View opening hours when available | ✅ | Sourced end-to-end at this baseline: `OverpassOpeningHoursProvider.ParseElement` maps the OTM xid prefix `N/W/R` → `node/way/rel` (`OverpassOpeningHoursProvider.cs:69-96`), `FetchAsync` POSTs `[out:json];{type}({id});out tags;` to the keyless Overpass API and reads the `opening_hours` tag (`:42-67`), result cached under `osm:hours:{xid}` (`:27-37`). Wired in at `OpenTripMapDestinationDetailsService.cs:22-24` (task start), `:29` (await), `:40` (assignment). FE renders `InfoRow label="Opening hours"` + an `OpenNowBadge` from `parseOpenNow` (`DestinationDetailsPage.tsx:192-197`, `openNow.ts:64`), plus an aside "Hours"/"Status" pair `:219-242`. Degrades to null (never throws) on non-OSM xid, non-2xx, or `HttpRequestException`/`TaskCanceledException`/`JsonException` (`:63-66`), and `AwaitOrNullAsync` (`OpenTripMapDestinationDetailsService.cs:47-57`) guarantees the details endpoint still returns 200. |
| 2. See "Opening hours not available" when data is missing | ✅ | The Opening-hours row passes the required literal explicitly: `emptyLabel="Opening hours not available"` (`DestinationDetailsPage.tsx:196`), rendered by `InfoRow` at `:49-50`. The generic `'Not available'` default (`:37`) now applies only to the Address and Website rows. Asserted by `DestinationDetailsPage.test.tsx` (exact literal + exact count of 2 remaining generic labels). Delivered by story 6-7. |

**Verdict:** US4 **PASS** on both ACs at this baseline — no outstanding dependency. AC1 passes via Overpass sourcing with graceful degradation; AC2 passes on the exact required literal.

### Non-functional requirements

| NFR | Verdict | Evidence |
|---|---|---|
| **NFR3** — details popup displayed ≤ 2 s | ✅ (with a bounded cold-cache risk) | **Shape of the chain:** OTM place detail → then image ∥ hours *concurrently*. `imageTask` and `openingHoursTask` are both started at `OpenTripMapDestinationDetailsService.cs:19-24` before either is awaited (`:26`, `:29`), so the two downstream legs overlap; the cold cost is `t(OTM) + max(t(Wikipedia), t(Overpass))`, not a 3-call serial chain. All three legs are Redis-cached including negative results: `otm:place:{xid}` (`OpenTripMapPlaceClient.cs:20-31`, 1440 min), `ImageCacheEntry` (`WikipediaImageProvider.cs:24-42`, 1440 min, caches found **and** not-found), `osm:hours:{xid}` (`OverpassOpeningHoursProvider.cs:27-37`, 1440 min). Warm path is a pure cache read. **Residual risk:** the per-leg timeouts are 5000 ms each (`WikipediaSettings.cs:16`, `OverpassSettings.cs:7`), so a single slow-but-not-failing Overpass or Wikipedia call can alone exceed the 2 s budget on a cold open. Watch item, not a defect — see Finding #2. |
| **NFR6** — users act only on their own trips | ✅ | Details GET is anonymous by design (logged-out browsing) — `/api/locations` has no `.RequireAuthorization()` (`RouteExtension.cs:20-23`). The only mutating path (add-to-trip) sits under `/api/trips` `.RequireAuthorization()` (`:25-29`) and is trip-ownership-scoped per the project's trip-scoping rule. `DestinationResolver` resolves/imports by xid against the shared destination catalogue only, exposing no user-owned data (`DestinationResolver.cs:35-58`). |

---

### Findings summary (actionable, High → Low)

1. **⚠️ US2-AC2 multi-photo swipe unreachable (Medium priority US)** — the hero gallery fully supports prev/next, arrow-key nav and dots for `total > 1` (`AttractionHero.tsx:34-45,102-131`), but `OpenTripMapDestinationDetailsService` caps `ImageUrls` at a single Wikipedia image (`:27`), so the multi-photo path never activates. *Fix options:* (a) source additional images (Wikimedia Commons gallery, or OTM `preview` if it ever becomes usable) to populate >1 URL; or (b) accept the single-image reality and record AC2 as a documented data-limited deviation. → **story `8-5-destination-details-multiple-images` already drafted (`ready-for-dev`)**. Only non-PASS item left in selected scope.
2. **⚠️ NFR3 cold-open latency is bounded by two 5 s per-leg timeouts** — the chain is OTM-place → (Wikipedia ∥ Overpass), already concurrent (`OpenTripMapDestinationDetailsService.cs:19-24,26,29`), and all three legs cache for 24 h including negative results, so there is nothing left to parallelize. The genuine exposure is that `WikipediaSettings.TimeoutMilliseconds` and `OverpassSettings.TimeoutMilliseconds` both default to **5000 ms** (`WikipediaSettings.cs:16`, `OverpassSettings.cs:7`) — a single slow upstream can blow the 2 s NFR3 budget on a cold open even though nothing fails. *Fix:* tighten the two optional-enrichment timeouts to fit inside the budget (e.g. ~1200 ms) since both degrade gracefully to null, or measure p95 under real load before tuning. Watch item.
3. **⚠️ Overpass negatively caches transient failures for 24 h** — `FetchAsync` returns `null` both for "no `opening_hours` tag" and for timeout/5xx/parse failure (`OverpassOpeningHoursProvider.cs:49-66`), and the caller caches that `null` for `CacheMinutes` (default 1440) without distinguishing the two (`:34-37`). One Overpass blip therefore hides real opening hours for 24 h after recovery, silently weakening US4-AC1. *Fix:* only cache a confirmed "no tag" result; skip caching (or use a short TTL) on the failure path. **Owner: story 6-5**, not this audit — carried as a deferred code issue.
4. **⚠️ `openNow.ts` collapses to null / mislabels status on common valid `opening_hours` strings** — lunch-break comma ranges (`Mo-Fr 09:00-12:00,13:00-17:00`), `PH off` / day-level `off`, and overnight ranges (`Mo 22:00-02:00`) either vanish the Open-now badge or mislabel it (`openNow.ts:23-63`). Real OSM data contains all three forms, so the badge is unreliable in practice — the hours *string* still renders correctly, so US4-AC1 is unaffected. Pre-existing (5-15/6-5), **owner: the open-now/Overpass code owners** — carried as a deferred code issue.
5. **⚠️ US1 add-to-trip gating is a redirect, not a disabled control (selected US)** — functionally correct and a documented epic decision (401 + login redirect, aligns with Feature 3 US8), but deviates from the sheet's literal *"unavailable/unclickable"*. *Fix:* none required unless product wants the button visually disabled when logged out. Note only.
6. **⚠️ US4 deviates from epic-2's stated design intent (process note)** — `epic/epic-2-destination-details.md:51` states US4 needs "no separate backend work … beyond what's built for US1", yet US4-AC1 now passes only because of a brand-new Overpass backend integration (6-5). The requirement is met; the *epic* is stale. *Fix:* update epic-2's US4 tech approach to record the Overpass dependency.
7. **➖ US3 map/location** — not selected; bonus-implemented (map + marker + address). No action.

### Verdict

Feature 2's **selected in-scope stories are implemented and faithful** to the requirement at `8146a05`:
- **US1 (open details): PASS** — all 7 ACs + business rules, with one accepted gating deviation (redirect instead of disabled button).
- **US2 (photos): PARTIAL** — AC1/AC3 + business rule pass; AC2 multi-photo swipe is UI-ready but data-starved (single image from the provider). Follow-up 8-5 drafted.
- **US4 (opening hours): PASS** — both ACs, no outstanding dependency: Overpass sourcing (6-5) and the exact fallback literal (6-7) are merged in this baseline.
- **US3 (map): not selected** — bonus-implemented (map + marker + address).
- **NFR3/NFR6: PASS** — NFR3 with a per-leg-timeout watch item (Finding #2).

Net: **one Medium gap worth a follow-up (US2 multi-image), one latency watch item, two deferred code issues owned elsewhere (Overpass negative cache, `openNow.ts` parsing), and two process/copy notes.** No High-severity correctness defects in the selected scope.

**Test coverage backing the PASS verdicts (all reproducible at `8146a05`):** BE — `GetDestinationDetailsUseCaseTests.cs`, `OpenTripMapDestinationDetailsServiceTests.cs` (incl. the 6-8 concurrency + independent-fault degradation tests), `OverpassOpeningHoursProviderTests.cs` (9 facts), `WikipediaImageProviderTests.cs` (image cache found/not-found), `TripDayServiceTests.cs` (xid-upsert). FE — `DestinationDetailsPage.test.tsx` (incl. the exact "Opening hours not available" literal), `AttractionHero.test.tsx`, `openNow.test.ts`, `AttractionMap.test.tsx`, `AddToTripContext.test.tsx`, `api.test.ts`. Full suites at this commit, measured in an isolated worktree checkout: **BE 282/282, FE 288/288 (26 files), 0 failed.**

## Dev Agent Record

### Implementation Plan

Review-only story. Executed as: scope confirmation → per-user-story code read against `requirement/Sheet1.html` ACs/business rules with `file:line` citations → NFR assessment → High→Low findings synthesis → confirm existing automated tests green at the reviewed commit.

**Re-run (2026-07-25):** the 2026-07-24 pass was invalidated by code review — it pinned `baseline_commit: 1bbb89f` and claimed "no production code changed" while actually grading an uncommitted working tree (Overpass provider/settings/port untracked; 9 Overpass tests absent at that commit; US4-AC2 graded against the pre-6-7 copy the same tree had already fixed). Per Decision D1 the audit was re-run rather than patched. 6-5/6-7/6-8 were committed as `8146a05` and every verdict, citation and test count below was re-derived against that real commit.

### Completion Notes

- Reviewed all four Feature 2 user stories (US1–US4) plus NFR3 and NFR6, one AC/rule at a time, full stack, at a reproducible baseline (`8146a05`).
- Result: US1 PASS (1 accepted gating deviation), US2 PARTIAL (multi-photo swipe unreachable — single-image provider), US3 not-selected/bonus-implemented, **US4 PASS on both ACs** (Overpass sourcing + exact fallback literal now merged — no dependency left).
- Re-run corrections vs the 2026-07-24 pass: US4-AC2 ⚠️→✅ (6-7's `emptyLabel` shipped); NFR3 finding rewritten (image + hours already run concurrently — the old "parallelize them" fix was a no-op; the real exposure is the two 5 s per-leg timeouts); the "depends on unmerged 6-5" finding retired; ~1/3 of `file:line` citations re-verified and corrected, including two that pointed at unrelated code (`NormalizeOptional` 88-96→103-111, single-image 19-22→27, `OpeningHours`/`Website` 37/38→40/41).
- Two previously-deferred code issues promoted into the findings list with explicit owners: Overpass 24 h negative-cache poisoning (owner 6-5) and `openNow.ts` parsing gaps (owner: open-now/Overpass code owners). Neither is caused by this audit.
- Surfaced 7 findings (1 Medium gap, 1 latency watch item, 2 deferred code issues, 2 notes, 1 not-selected); none High-severity in selected scope.
- No production code modified by this story. Finding #1 is already drafted as story 8-5.

### Debug Log

- Full BE suite at `8146a05`: `dotnet test BE` → **282/282 passed**, 0 failed, 0 skipped.
- Full FE suite at `8146a05`: `npx vitest run` → **288/288 passed** across 26 files.
- **Both counts were measured in a detached `git worktree` checked out at `8146a05`, not in the development working tree.** Running them in the working tree gives BE 296 / FE 290 — inflated by uncommitted Feature 3 work (`MoveDestinationValidatorTests.cs`, `TripPlannerPage.dnd.test.tsx`, modified `TripPlannerPage.test.tsx`) that is not part of this baseline. Isolating the checkout is what makes the AC5 claim reproducible; the 2026-07-24 pass's "BE 59/59 at `1bbb89f`" failed precisely because it skipped this step and counted tests that did not exist at the commit it named.

## File List

- `_bmad-output/implementation-artifacts/6-6-feature-2-requirements-verification.md` (modified — audit re-run at baseline `8146a05`: frontmatter, verdicts, citations, findings, Dev Agent Record, Change Log, status)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — 6-6 status tracking)

## Change Log

- 2026-07-24: Created Feature 2 (Destination Details) requirements-verification review story; audited US1–US4 + NFR3/NFR6 against `requirement/Sheet1.html`; recorded verdicts, evidence, and High→Low findings. Status → review.
- 2026-07-25: Adversarial code review (4 layers: blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor). 1 decision-needed, 3 patches, 3 deferred, 2 dismissed. Central issue: the audit grades an uncommitted working tree while claiming baseline `1bbb89f` + "no production code changed" — self-contradicting its own AC5. Status → in-progress.
- 2026-07-25: Decision D1 executed. 6-5/6-7/6-8 committed as `8146a05`; audit **re-run** against that baseline. US4-AC2 ⚠️→✅, NFR3 finding rewritten (concurrency already in place; real risk is the 5 s per-leg timeouts), "depends on unmerged 6-5" finding retired, citation drift corrected throughout, two deferred code issues folded in with named owners. Test claims re-derived in an isolated worktree at `8146a05`: BE 282/282, FE 288/288. All 4 actionable review findings resolved. Status → review.

### Review Findings

**Resolution (2026-07-25):** Decision D1 resolved as **re-run at a merged baseline**, and that re-run has now been executed. 6-5/6-7/6-8 were committed as `8146a05`, the audit was re-derived against it, and all four actionable findings below are **resolved** (the three patches folded into the re-run as planned). The three pre-existing/deferred items remain deferred but are now carried explicitly in the audit's own findings list with named owners, rather than living only in this review block.

- [x] [Review][Resolved] **Audit grades an uncommitted working tree while claiming baseline `1bbb89f` (AC5 violation)** — The audit's frontmatter pins `baseline_commit: 1bbb89f` and its Dev Notes state "No production code changed by this story," yet its US4 evidence (`OverpassOpeningHoursProvider.cs`, `IOpeningHoursProvider.cs`, `OverpassSettings.cs`, and the `openingHoursProvider` wiring in `OpenTripMapDestinationDetailsService.cs`) exists **only in the uncommitted working tree** — all four are untracked (`git status` = `??`) and absent from `1bbb89f` (`git show 1bbb89f:…OpenTripMapDestinationDetailsService.cs` has zero opening-hours references). The "tests green at `1bbb89f`: BE 59/59" claim includes `OverpassOpeningHoursProviderTests.cs` (9 facts) that do not exist at `1bbb89f`, so the count is unreproducible at the stated commit. Simultaneously US4-AC2 is graded against the *pre-6-7* copy state even though 6-7's fix sits in the same working tree — the audit reads two different trees at once. This violates the audit's own AC5 ("verdicts backed by tests green at the reviewed commit") and its "no code changed" claim. Human decision required: (a) re-pin the audit to the actual working tree and drop the `1bbb89f`/"no code changed" framing; or (b) re-run the audit at a real commit after 6-5/6-7/6-8 merge. All 4 layers converged on this.
- [x] [Review][Resolved] **US4-AC2 verdict is factually false in the working tree — Finding #2's fix is already shipped** [FE/src/features/destinations/DestinationDetailsPage.tsx:196] — The audit marks US4-AC2 ⚠️ PARTIAL, claiming the FE shows the generic "Not available" and cites `DestinationDetailsPage.tsx:47-48`. But the working tree already renders `emptyLabel="Opening hours not available"` on the Opening-hours row (line 196, story 6-7). Verdict should be PASS ✅ and Findings #2 removed (recommending a fix that is already implemented would spawn a redundant follow-up story).
- [x] [Review][Resolved] **NFR3 Finding #5 mis-describes the latency chain and recommends a no-op** [BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapDestinationDetailsService.cs:19-24] — Finding #5 says the cold path makes "3 sequential upstream calls (OTM → Wikipedia → Overpass)" and recommends "parallelizing the image + hours fetches." But `imageTask` and `openingHoursTask` are both started (lines 19-24) *before* either is awaited (26, 29) — image and hours already run concurrently. The real chain is OTM-place → (image ∥ hours). Correct the finding; the genuine watch item is Overpass's own `TimeoutMilliseconds` default of 5000 (`OverpassSettings.cs`) which alone can exceed the 2 s NFR3 budget on a cold hours fetch.
- [x] [Review][Resolved] **Systematic file:line citation drift undermines the audit's AC2 evidence** [_bmad-output/implementation-artifacts/6-6-feature-2-requirements-verification.md] — ~1/3 of citations are off, two pointing at unrelated code: `NormalizeOptional` cited `OpenTripMapDestinationDetailsService.cs:88-96` is actually 103-111 (88-96 is `ComposeAddress`); the single-image line cited `:19-22` is actually 27; `OpeningHours`/`Website` cited `:37/:38` are 40/41 (line 37 is `Description`); plus minor offsets on the add-to-trip button and back-button citations. Since the audit's entire value is precise file:line evidence (its own AC2), correct the citations.
- [x] [Review][Defer] **openNow.ts collapses to null / mislabels status on common valid opening_hours strings** [FE/src/features/destinations/openNow.ts:16,100-116] — deferred, pre-existing — lunch-break comma ranges (`Mo-Fr 09:00-12:00,13:00-17:00`), `PH off` / day `off`, and overnight ranges (`Mo 22:00-02:00`) either vanish the Open-now badge or mislabel it. Pre-existing code (5-15/6-5), not caused by this audit; belongs to the open-now/Overpass code owners. The audit over-claimed "graceful degradation" without walking these inputs.
- [x] [Review][Defer] **Overpass negatively caches transient failures for 24 h** [BE/TripPlanner.Infrastructure/ExternalServices/Overpass/OverpassOpeningHoursProvider.cs] — deferred, pre-existing — a single Overpass timeout/5xx caches `null` for `CacheMinutes` (default 1440), hiding real opening hours for 24 h after recovery and silently failing US4-AC1. Belongs to story 6-5's review, not this audit.
- [x] [Review][Defer] **Epic-intent deviation for US4 not flagged by the audit** [epic/epic-2-destination-details.md:51] — deferred, pre-existing — the epic states US4 needs "no separate backend work … beyond what's built for US1," but US4-AC1 PASS now depends on a brand-new Overpass backend integration (6-5). The audit treats this as fine and never records the deviation from design intent.
