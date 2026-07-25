---
baseline_commit: 1bbb89f1298f0c6cf2edb46800b161052978e812
---

# Story 6-7: Destination Details — "Opening hours not available" Empty-State Copy (US4-AC2)

Status: done

## Story

As a **user viewing a destination's details**,
I want the opening-hours field to read **"Opening hours not available"** when the data is missing,
so that **the empty state matches the exact wording the requirement specifies** (Feature 2 · US4 · AC2).

This closes the trivial copy deviation surfaced by story `6-6-feature-2-requirements-verification` (Finding #2): the FE renders a generic **"Not available"** for the opening-hours row instead of the required literal **"Opening hours not available"**.

> **Root cause (from 6-6):** the shared `InfoRow` component hard-codes the empty label — `DestinationDetailsPage.tsx:47-48` `<span className={styles.na}>Not available</span>` — and is reused for Address, Opening hours, and Website (the test at `DestinationDetailsPage.test.tsx:146` asserts three "not available" strings).

## Acceptance Criteria

1. When `openingHours` is `null`, the Opening hours row displays exactly **"Opening hours not available"**.
2. The Address and Website rows are **unchanged** — they continue to display the generic "Not available".
3. When `openingHours` is present, the value + Open-now badge render as before (no regression).
4. Automated tests assert the exact opening-hours empty-state literal and that Address/Website empty copy is untouched.

## Tasks / Subtasks

- [x] **Task 1: Add an optional empty-label to `InfoRow`** (AC: 1, 2)
  - [x] Add an optional `emptyLabel?: string` prop to the `InfoRow` component in `DestinationDetailsPage.tsx` (default `"Not available"` so existing rows keep current copy).
  - [x] Render `{value === null ? <span className={styles.na}>{emptyLabel}</span> : …}` using the prop.
- [x] **Task 2: Pass the required literal for the Opening hours row** (AC: 1, 3)
  - [x] On the `<InfoRow label="Opening hours" …>` usage, pass `emptyLabel="Opening hours not available"`.
  - [x] Leave the Address and Website rows without the prop (keep "Not available").
- [x] **Task 3: Tests** (AC: 4)
  - [x] Write a FAILING test first: with a details payload where `openingHours` is `null`, assert `screen.getByText('Opening hours not available')` is present.
  - [x] Update the existing assertion so it still correctly counts the generic Address/Website empty states (now 2 exact "Not available", plus the distinct hours literal) — keep the intent, adjust for the new copy.
  - [x] Assert no regression when opening hours are present (value + Open-now badge still render — covered by the existing full-details and open-now tests).
- [x] **Task 4: Validation** (AC: 1-4)
  - [x] Run the FE suite green; run lint + production build.

## Dev Notes

- **Frontend-only, no backend change.** The DTO field `DestinationDetailsResponse.OpeningHours` and its Overpass sourcing (story `6-5`) are untouched; this is purely presentation copy.
- **Scope discipline:** only the Opening hours row's empty text changes. The requirement (`requirement/Sheet1.html` Feature 2 · US4 · AC2) specifies the literal *only* for opening hours; Address/Website have no such mandate, so they intentionally keep the generic label. Do **not** globally rename "Not available".
- **Where:** `InfoRow` is a local component defined inside `FE/src/features/destinations/DestinationDetailsPage.tsx` (`:32-63`). The `styles.na` class and layout stay as-is — only the text content becomes parameterized.
- **Test note:** the current test uses a case-insensitive `/not available/i` count of 3 (`:146`). After the change the opening-hours row reads "Opening hours not available" (still matches `/not available/i`), so a naive count would still pass — make the test explicit: assert the exact hours literal separately and count the generic label as 2 exact matches, so the test actually protects the requirement.
- **Code style:** curly braces required on all control flow; no comments (CLAUDE.md).

### Project Structure Notes

- Touch points: `FE/src/features/destinations/DestinationDetailsPage.tsx` (InfoRow + Opening hours usage), `FE/src/features/destinations/DestinationDetailsPage.test.tsx`.
- Unchanged: all backend code, DTOs, and other FE components.

### References

- Gap origin: `6-6-feature-2-requirements-verification.md` — Finding #2 (US4-AC2 fallback wording).
- Requirement: `requirement/Sheet1.html` Feature 2 · US4 · AC2 ("See 'Opening hours not available' when the data is missing").
- Related: `6-5-destination-opening-hours-source` (sources the value this row displays).

### Review Findings

- [x] [Review][Defer] `InfoRow` empty-state only triggers on `value === null`, not `''`/whitespace [FE/src/features/destinations/DestinationDetailsPage.tsx:49] — deferred, pre-existing

## Dev Agent Record

### Implementation Plan

Parameterized the shared local `InfoRow` component with an optional `emptyLabel?: string` prop (default `"Not available"`) so existing rows keep their copy, then passed `emptyLabel="Opening hours not available"` only on the Opening hours row. Address and Website rows were left untouched. Followed red-green-refactor: added the failing exact-literal test + tightened the count assertion first, confirmed RED, implemented the prop, confirmed GREEN.

### Completion Notes

- AC1 ✅ — With `openingHours: null` the Opening hours row now renders exactly **"Opening hours not available"** (asserted via `getByText('Opening hours not available')`).
- AC2 ✅ — Address and Website rows still render the generic **"Not available"**; the test now asserts exactly 2 exact "Not available" matches (was a loose case-insensitive count of 3 that would have masked the change).
- AC3 ✅ — No regression when hours are present: the full-details and open-now tests still pass (value + Open-now badge render).
- AC4 ✅ — Tests assert the exact hours literal separately and the exact generic-label count.
- Validation: FE suite 290/290 passing, Oxlint clean (2 pre-existing unrelated fast-refresh warnings), production build green.
- Purely presentation copy; no backend/DTO change.

### Debug Log

- RED: `getByText('Opening hours not available')` failed (row rendered "Not available") — confirmed test correctness before implementing.
- GREEN: after adding the `emptyLabel` prop, the DestinationDetailsPage file passed 12/12, full suite 290/290.

## File List

- `FE/src/features/destinations/DestinationDetailsPage.tsx` (modified) — added `emptyLabel` prop to `InfoRow`; passed the required literal on the Opening hours row.
- `FE/src/features/destinations/DestinationDetailsPage.test.tsx` (modified) — assert exact "Opening hours not available" literal + exact count of 2 generic "Not available".

## Change Log

- 2026-07-24: Story drafted from `6-6` Finding #2 (US4-AC2 empty-state copy). Status: ready-for-dev.
- 2026-07-24: Implemented — parameterized `InfoRow` empty label; Opening hours row now reads "Opening hours not available", Address/Website unchanged. FE 290/290, lint + build green. Status: review.
