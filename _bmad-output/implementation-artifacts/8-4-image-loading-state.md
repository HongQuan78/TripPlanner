---
baseline_commit: 3a80e86a33052a98ed65efbc9bf25926263376dc
---

# Story 8.4: Show a loading state in image frames while destination images load

Status: review

## Story

As a TripPlanner user browsing attraction cards or a destination's photo carousel,
I want the image frame to show a loading indicator while the image is still downloading,
so that I see the default placeholder only when there is genuinely no image (missing URL or a failed load), not a placeholder flash before a real photo appears.

## Acceptance Criteria

1. `AttractionCard` renders three distinct image states: (a) `imageUrl` present and still loading → a shimmer loading block (`data-testid="image-loading"`) fills the image frame while the `<img>` stays mounted but invisible; (b) image loaded → the photo, no shimmer; (c) `imageUrl` null or the image fired `error` → the existing default placeholder (`data-testid="image-placeholder"`). The shimmer matches the design system's existing `Skeleton` shimmer (same gradient/keyframes convention, `prefers-reduced-motion` fallback).
2. `PhotoCarousel` behaves the same way per photo: while the current photo is loading, a shimmer overlay (`data-testid="image-loading"`) covers the frame; a photo that fires `error` is dropped from the rotation (controls/dots shrink accordingly); the default placeholder shows only when no usable images remain (empty list or all failed). Existing alt-text and navigation behavior is unchanged.
3. Layout does not shift between states: loading, photo, and placeholder all occupy the same frame dimensions as today (9rem card frame, 18rem carousel frame).
4. `npm test` and `npm run lint` pass in `FE/` with no regressions; new unit tests cover: loading state visible before `load`, shimmer removed after `load`, `error` → placeholder (card) / photo dropped (carousel), all-failed carousel → placeholder.

## Tasks / Subtasks

- [x] Task 1: AttractionCard loading state (AC: #1, #3)
- [x] Task 2: PhotoCarousel loading state + failed-photo handling (AC: #2, #3)
- [x] Task 3: Unit tests + full FE suite and lint (AC: #4)

## Dev Notes

- Keep the `<img>` mounted during loading (hidden via opacity) so `load`/`error` events fire and layout stays stable; jsdom never fires `load`, so tests drive state with `fireEvent.load`/`fireEvent.error`.
- Reuse the shimmer convention from `FE/src/components/Skeleton.module.css` rather than importing its `.card` class (dimensions differ).

## Dev Agent Record

### Implementation Plan

- Keep the `<img>` mounted in all pre-load states, hidden with `opacity: 0`, so the browser's `load`/`error` events drive the state machine and the frame never changes size: shimmer overlay while loading → photo on `load` → placeholder on `error` or null URL.
- `AttractionCard` gains an `imageLoaded` flag beside the existing `imageFailed`; the frame is a `position: relative` wrapper with an absolutely positioned shimmer overlay.
- `PhotoCarousel` tracks `loadedImages` and `failedImages` per URL; failed photos are filtered out of the rotation (alt text, controls, and dots recompute from the usable list), and the placeholder renders only when the usable list is empty. Navigating to a not-yet-loaded photo shows the shimmer again; already-loaded photos show instantly.
- Shimmer CSS duplicates the `Skeleton.module.css` gradient/keyframes convention (including the `prefers-reduced-motion` static fallback) rather than importing its `.card` class, whose fixed height doesn't fit either frame.

### Debug Log

- jsdom never fires image `load` events, so tests drive states explicitly via `fireEvent.load`/`fireEvent.error`; existing tests that queried the placeholder or img element continue to pass unmodified.

### Completion Notes

- Both image surfaces now distinguish "still downloading" (shimmer in the frame) from "no image exists" (default 🏞️ placeholder): AttractionCard on the search grid, PhotoCarousel on the details page. The carousel additionally self-heals by dropping photos whose URL 404s.
- 152/152 FE tests pass (9 new: 4 AttractionCard image-state cases, 5 PhotoCarousel cases), `npm run lint` clean (2 pre-existing fast-refresh warnings untouched), production build green.

## File List

- FE/src/components/AttractionCard.tsx (modified — loading state, frame wrapper)
- FE/src/components/AttractionCard.module.css (modified — imageFrame/imageHidden/imageLoading shimmer)
- FE/src/components/PhotoCarousel.tsx (modified — per-photo loaded/failed tracking, shimmer overlay, failed-photo drop)
- FE/src/components/PhotoCarousel.module.css (modified — imageHidden/loading shimmer)
- FE/src/components/AttractionCard.test.tsx (modified — 4 new image-state tests, renderCard overrides)
- FE/src/components/PhotoCarousel.test.tsx (new — 5 tests)
- _bmad-output/implementation-artifacts/8-4-image-loading-state.md (new)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified)

## Change Log

- 2026-07-14: Story created from user follow-up to 8-3 and implemented in the same session: shimmer loading state inside image frames while destination images download, default placeholder reserved for genuinely missing/failed images, carousel drops failed photos from rotation. 152/152 FE tests, lint and build green. Status → review.
