# Epic 5 Context: Frontend Web App

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Build and evolve the TripPlanner web frontend — a React + TypeScript + Vite SPA in `FE/` consuming the already-complete ASP.NET Core API — so that every user-facing slice of Features 1–4 that the backend epics deferred as "a frontend concern" actually ships: location search and attraction browsing, destination details with photos and add-to-trip, trip creation/date editing/day-by-day itineraries, and the full auth flow including email verification and the "check your inbox" register experience. Beyond the original five build stories, the epic has grown a redesign and polish arc that unifies every surface under the **Horizon** design language and restructures the codebase feature-first, so the app reads as one premium travel product rather than a set of separately-built screens.

## Stories

- Story 5-1: Frontend scaffold and API client
- Story 5-2: Authentication UI
- Story 5-3: Destination discovery
- Story 5-4: Destination details
- Story 5-5: Trip planner UI
- Story 5-6: UI modernization — cute light blue
- Story 5-7: Search auto-suggest
- Story 5-8: Trips nav and auth race fix
- Story 5-9: Destination auto-suggest prefix match
- Story 5-10: UI motion and depth polish
- Story 5-11: Trip destination detail link
- Story 5-12: Frontend redesign — Horizon design system
- Story 5-13: Horizon auth redesign
- Story 5-14: Horizon home redesign
- Story 5-15: Azure attraction detail redesign
- Story 5-16: Horizon trips boarding-pass redesign
- Story 5-17: Frontend feature-based restructure
- Story 5-18: Verify-email page rebuild

## Requirements & Constraints

- **The backend is fixed.** No API changes are in scope. Never build an affordance the API cannot honor — there is no popular-destinations, trending, or personalization endpoint, no autocomplete-while-typing beyond the text location search, no filters/sorting, no map, and no reordering API beyond move-between-days. Curated content (e.g. a "Popular searches" tile rail) must be an honest frontend constant that only pre-fills the existing text search; "Recent searches" must be genuine client-side history with no cross-device promise.
- **Anti-enumeration is non-negotiable.** The UI must never reveal whether an email has an account or whether it is unverified. Register success copy is identical for fresh and duplicate emails; a login rejected for missing verification shows the same generic invalid-credentials message as a wrong password; resend-verification shows the same generic success during its server-side cooldown, with no countdown implying knowledge of server state.
- **Register does not sign the user in** — it terminates in a "check your inbox" state and hands off to the verification email.
- **Session:** JWT Bearer, ~60-minute expiry, no refresh token. The session persists across reloads. Any 401 from an authorized call clears the session and redirects to login preserving the origin path, which is then honored on successful login (same-origin paths only).
- **Attraction payload is exactly** `xid`, `name`, `kinds`, `rating` (1–3 with an optional heritage flag), `imageUrl`, `distanceMeters`. Cards may surface all of these and nothing else.
- **Sparse provider data is the common case** for details (opening hours, website, images often absent) — "not available" fallbacks are normal and every view must still render. External-provider failures arrive as service-unavailable and get a retry state, not a crash.
- **Country results cannot load attractions**; selecting a country shows a notice asking the user to narrow to a city.
- **Accessibility floor is a contract, not a goal.** Labeled inputs, `role="alert"` / polite-live banners, `aria-describedby`/`aria-invalid` field errors, ≥44px touch targets, always-visible focus rings, `prefers-reduced-motion` honored, and verified WCAG AA contrast. Where accessible behavior already ships (the search combobox, skeleton/live-region announcements, the search landmark), a redesign that regresses it is a failed redesign.

## Technical Decisions

- **Stack:** Vite + React 19 + TypeScript; React Router; TanStack Query for server state (queries, mutations, cache invalidation after trip mutations); a small typed `fetch` wrapper instead of axios; hand-rolled CSS Modules with **no component library**; Vitest + React Testing Library with the API mocked at the client-module boundary.
- **Design tokens live once**, as CSS custom properties in `FE/src/index.css`, consumed by CSS Modules. Do not introduce new hex values, new gradients-as-decoration, or a second visual language. Light theme only — no dark mode.
- **Errors normalize at the client boundary:** RFC7807 ProblemDetails responses become a typed `ApiError { status, message }`, and UI states are driven from that shape rather than raw responses.
- **Code organization is feature-based** under `FE/src/features/*` with shared concerns (API client, layout, UI primitives) separate; keep new work inside that structure.
- **Auth routes render without the app header/nav** (their own split shell); all other routes render inside the app layout with its sticky header and content frame.
- **Search state is one fact, not three strings.** A chosen city must be carried as a single resolved location object (name, country code, type, latitude, longitude) that persists across navigation; independently-settable input/query/selection fields are the known cause of drift bugs. Choosing a suggestion, tile, or recent chip uses the resolved object directly and issues **no** follow-up location-search request — text search runs only for a typed submit.
- **Dev config:** the API base URL comes from a build-time env var; the backend's loopback CORS policy already covers the dev server, and the production container serves the SPA same-origin behind nginx.

## UX & Interaction Patterns

- **One photographic moment per screen.** Auth is a split canvas: full-height hero panel (decorative, `aria-hidden` copy, hidden on small screens) plus a single white card doing exactly one job. Home is the same language rotated horizontal: a hero band clipped inside the page frame, never bled to the viewport, holding the page `<h1>`, tagline, and the search bar, and present on every viewport. Text over imagery always sits behind an ink layer at ≥65% opacity. Photography has not shipped — a committed gradient recipe stands in and is treated as a finished deliverable.
- **Search is one bar and one dropdown.** No modal anywhere in the product, no trigger-and-panel indirection, no summary row restating the chosen city (the bar's value and the "Attractions near {name}" heading already say it twice), and no candidate-match list rendered in the page body. Typeahead: 300ms debounce, 2-character minimum, at most 5 suggestions, listbox ARIA with arrow/Enter/Escape, options chosen on mousedown. The dropdown closes unconditionally on Escape, choice, blur, and outside click — visibility follows only from "is the user actively searching right now", never from stored-query comparison.
- **Choosing is one gesture:** set the city, close the dropdown, load attractions, replace the pre-search body. Changing city means typing in the bar; clearing resets the page to pre-search but never erases history.
- **The home body has exactly two mutually exclusive states:** pre-search (optional recent-search chips → curated tile rail → a three-beat how-it-works band, every claim of which must be shipped behavior) and city-chosen (heading plus attraction grid, nothing between it and the band).
- **Every async surface needs the full state set:** idle, pending (buttons keep their primary fill and swap the label to a progress phrase rather than graying out status-bearing text), skeletons with a hidden loading announcement, empty, error-with-scoped-retry, and success. Feedback is inline — no toasts.
- **Voice:** warm, brief, never chirpy, never blaming; nouns for labels, verbs for buttons, one sentence per error stating what happened and what to do next. Existing shipped copy strings are preserved verbatim through redesigns unless a story explicitly changes them.

## Cross-Story Dependencies

- 5-1 gates everything: the scaffold, routing shell, typed client, error normalization, and test setup are preconditions for all later stories.
- 5-2 (auth, session, route guard) gates the authenticated surfaces — add-to-trip in 5-4 and all of 5-5 depend on it.
- 5-3 supplies the search/selection flow that 5-4 navigates from; 5-4's add-to-trip depends on the trip endpoints exercised by 5-5.
- The redesign arc (5-12 onward) depends on the token layer being established once and then applied per surface — auth, home, attraction detail, trips — and must preserve the behavior and accessibility contracts already shipped by 5-2 through 5-11 rather than rebuilding them.
- 5-17's restructure touches every feature folder, so it is best sequenced where it does not race in-flight surface work.
- External dependency: verification emails must point at the SPA's verify-email route, which is backend configuration only (no backend code change).
