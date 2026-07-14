# Deferred Work

## Deferred from: code review of epic-4-user-authentication (2026-07-10)

- Case-sensitive email lookup (`u.Email == email` in `UserRepository.GetByEmailAsync`) — a user who registered as `User@X.com` and logs in / resends with `user@x.com` silently misses. Pre-existing across login/register/resend.
- Direct `DateTime.UtcNow` usage with no `TimeProvider` abstraction (`VerifyEmailUseCase`, `VerificationTokenService`) — expiry-boundary behavior cannot be tested deterministically. Pre-existing pattern across the codebase.

## Deferred from: code review of 5-1-frontend-scaffold-and-api-client (2026-07-12)

- No router `errorElement`/error boundary in `FE/src/main.tsx` — any render error shows React Router's default stack-trace screen. Belongs with the UI stories (5-2+), where real error UX is designed.

## Deferred from: code review of 5-3-destination-discovery (2026-07-12)

- `locationType` typed as `string` instead of the `"City" | "Country"` union in `FE/src/api/types.ts` — typos in the `=== 'City'` / `=== 'Country'` comparisons compile silently. Pre-existing from story 5-1.
- No `aria-live` regions for async loading/error/result state changes on the search page — screen-reader users get no announcement after submitting. A11y enhancement beyond the story's ACs; pattern absent app-wide.
- API tests (`FE/src/api/locations.test.ts`, and pre-existing `client.test.ts`) assert request paths assuming `VITE_API_BASE_URL` is unset in the test environment — a CI env var would break them for unrelated reasons.

## Deferred from: code review of story-5-9-destination-autosuggest-prefix-match (2026-07-13)

- No caching/retry/backoff for the third-party geocoding call in `PhotonGeocodingService` — matches the existing OpenTripMap/Wikipedia client pattern (none of them have this either); a future dedicated resiliency story should address all three together rather than one-off per provider.

## Deferred from: code review of 5-10-ui-motion-and-depth-polish (2026-07-14)

- Route remount + stagger replay causes entrance animations to repeat on every navigation (`FE/src/layout/AppLayout.tsx` `key={location.pathname}` combined with AC2's staggered card entrance) — not worth blocking polish on; can revisit if it feels janky later.
- Keyboard focus can land on a card while it's still at opacity:0 during its entrance animation-delay window (`FE/src/components/AttractionCard.module.css`, `FE/src/pages/TripsPage.module.css`) — narrow (<400ms) window right after mount, requires unusually fast tabbing; not blocking this story.
- Skeleton loading text has no `aria-live`/`role="status"` (`FE/src/components/Skeleton.module.css`), so screen reader users aren't reliably notified when loading starts — pre-existing gap (the old visible loading text had the same issue), not introduced by this diff.
- `AddToTripDialog.tsx` still uses the old plain-text loading indicator for the same trip-list-loading case `TripsPage.tsx` just migrated to skeletons — pre-existing file untouched by this diff, out of scope for story 5-10.
