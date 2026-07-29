---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - requirement/Sheet1.html
  - epic/epic-1-destination-suggestion.md
  - epic/epic-2-destination-details.md
  - epic/epic-3-trip-planner.md
  - epic/epic-4-user-authentication.md
  - epic/epic-5-frontend-web-app.md
restructureDecisions:
  epicStructure: '5 feature epics + 1 new Platform epic (epic-6)'
  storyIds: 'renumber all stories by owning epic; old->new mapping table required'
  outputScope: 'this file only — sprint-status.yaml, epic/*.md and story filenames unchanged'
  prdArchitecture: 'absent from planning-artifacts; Sheet1.html is authoritative, epic docs are its derivation'
---

# tripplanner - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for tripplanner, decomposing the requirements from `requirement/Sheet1.html` (the authoritative requirements source) and the five epic documents derived from it.

**This is a restructuring pass, not a greenfield breakdown.** Most of the product is already built. The backlog it was built through drifted into 10 tracked epics of which only 5 have an epic document, with 56 story artifacts numbered in chronological order rather than by epic. This document re-derives the story set function-by-function from the sheet and maps every existing story onto it.

**Prerequisite note:** `_bmad-output/planning-artifacts/` contains no `PRD.md` and no `Architecture.md` — only `ux-designs/`. Per the owner's direction, `requirement/Sheet1.html` stands in for the PRD, and the Additional Requirements below are extracted from the five epic documents' own "Technical approach" sections rather than from an architecture document.

## Requirements Inventory

### Functional Requirements

Extracted from `requirement/Sheet1.html`, preserving the sheet's own feature/US identifiers, `Selected US?` flag and `Priority`. The sheet is the authority: where an epic document disagrees with it, the sheet wins.

**Feature 1 — Destination Suggestion**

FR1: Offer location autocomplete suggestions while the user types — trigger at ≥2 characters, show up to 5 city/country suggestions, let the user select one, and display the selected location in the search box. *(F1-US1 · Selected: No · Medium)*

FR2: Let a user search for a city or country by name — accept ≥1 character, list matching cities and countries with the type clearly labeled, allow selecting one as the active search value, show "No attractions found" when nothing matches, and allow clearing the input to start over. Results must include both cities and countries, be ranked exact-match-first, cap at 5, contain no duplicates, be case-insensitive, and accept partial matches. *(F1-US2 · Selected: **Yes** · High)*

FR3: Show a recommended attraction list for the searched location — each item carrying name, category/tags when available, rating/popularity when available, a thumbnail when available, and a placeholder when image or rating is missing. Fetch by coordinates + radius (city default 20 km), return max 20 items per page, and rank by provider ranking and/or internal scoring. *(F1-US3 · Selected: **Yes** · High)*

FR4: Let a user filter the attraction list by category and by rating/popularity, combine multiple filters at once, clear filters back to the full list, and keep filters applied while paginating. *(F1-US4 · Selected: No · Medium)*

FR5: Let a user sort attractions — recommended order by default, highest rating/popularity when selected — preserving applied filters across a sort change and updating results immediately. *(F1-US5 · Selected: No · Low)*

FR6: Paginate the attraction list and load more items when the user reaches 20 items. *(F1-US3 AC7 · marked optional in the sheet)*

**Feature 2 — Destination Details**

FR7: Let a user open a destination's detail view from the list and see name, category and short description; images when available; the location on a map (optional); address, opening hours and website when available; an option to add the destination to a trip; and a way to close the view and return to the previous list. Details must match the selected destination exactly, the view must still open when fields are missing, and the "Add to Trip" action must be unavailable when the user is not logged in. *(F2-US1 · Selected: **Yes** · Medium)*

FR8: Show destination photos when available, let the user swipe through multiple photos when more than one exists, and show a placeholder when none are available — at least 1 image if any exists. *(F2-US2 · Selected: **Yes** · Medium)*

FR9: Show the destination on a map with a marker, allow zoom and pan to explore nearby areas, and show an address/area label when available. *(F2-US3 · Selected: No · Low)*

FR10: Show opening hours when available and the literal message "Opening hours not available" when the data is missing. *(F2-US4 · Selected: **Yes** · Low)*

**Feature 3 — Trip Planner**

FR11: Let a user create a trip by entering a trip name (required), see the new trip in their trip list, and open the trip planner afterwards. *(F3-US1 · Selected: **Yes** · High)*

FR12: Let a user set trip start and end dates (start ≤ end), generate one itinerary day per date in the range, update the itinerary days when the dates change, and require confirmation when reducing the range would remove planned items. *(F3-US2 · Selected: **Yes** · High)*

FR13: Let a user add one or more destinations to a selected trip — from the attraction list and from the destination details page — selecting a day in the trip, with the destination appearing immediately under that trip. *(F3-US3 · Selected: **Yes** · High)*

FR14: Let a user drag a destination from Saved Places and drop it into a chosen day: remove it from Saved Places on success, show it immediately in the day, message when the destination already exists in that day, and return it to Saved Places when the drop is invalid. Prevent the same destination being scheduled twice in one day. *(F3-US4 · Selected: No · Medium)*

FR15: Let a user drag a destination within a day to change its position, save the new order automatically, and preserve that order across a page refresh. *(F3-US5 · Selected: No · High)*

FR16: Let a user drag a destination from one day into another — removed from the original day, appearing in the new day, with a message when it already exists in the target day and the destination staying put when the drop is invalid. *(F3-US6 · Selected: No · High)*

FR17: Let a user remove a destination from a trip day and see it removed immediately after confirmation. *(F3-US7 · Selected: **Yes** · High)*

FR18: Allow browsing destinations while logged out, but prompt for login when the user tries to create a trip or add a destination to a trip; after a successful login, return the user to the same trip/destination and complete the original save action. *(F3-US8 · Selected: **Yes** · Medium)*

FR19: Persist trips and destinations automatically — trip creation, destination add, destination removal and trip detail edits all survive closing and reopening the app — with a saving indicator while changes are in flight and an error message that keeps unsaved changes locally until retry. *(F3-US9 · Selected: No · Medium)*

FR20: On return, load the user's saved trips; opening a trip shows its previously saved destinations and itinerary days; show an empty state when the user has no saved trips. *(F3-US10 · Selected: **Yes** · Medium)*

**Feature 4 — User Authentication**

FR21: Let a user sign up with email and password — account created when the email is not already registered, a message when it is, a message when the password fails policy, and a signed-in state after successful sign-up. Email must be unique, password ≥8 characters, passwords stored with strong hashing, and error messages generic to avoid account enumeration. *(F4-US1 · Selected: **Yes** · Medium)*

FR22: Require the user to verify their email address to activate the account. *(F4-US2 · Selected: **Yes** · Medium — **the sheet's User Story, Acceptance Criteria and Business Rules cells are empty**; `epic-4-user-authentication.md` authored them, and that authored reading is the only specification that exists)*

FR23: Let a user log in with email and password — signed in when credentials are valid, a message when they are invalid, and the session surviving a page refresh. *(F4-US3 · Selected: **Yes** · Medium)*

FR24: Let a user log out — session ends immediately, the app returns to a logged-out state, and access to protected pages is prevented afterwards. *(F4-US4 · Selected: **Yes** · Medium)*

### NonFunctional Requirements

NFR1: County/city search results are returned within ≤ 500 ms for 95% of requests. *(Selected: **Yes**)*

NFR2: Attraction suggestions are displayed within ≤ 1000 ms for 95% of requests. *(`Selected US?` cell is blank in the sheet)*

NFR3: The destination details view is displayed within ≤ 2 seconds after the user opens it. *(`Selected US?` cell is blank)*

NFR4: Drag-and-drop actions (assigning destinations to days) respond within ≤ 100 ms with no visible UI lag. *(`Selected US?` cell is blank; applies only to FR14–FR16)*

NFR5: The system handles millions of destination records from external APIs. *(`Selected US?` cell is blank)*

NFR6: Users can only view and modify their own trips and saved destinations. *(Selected: **Yes**)*

### Additional Requirements

Extracted from the five epic documents' "Technical approach" sections. These constrain how stories may be written, not what the product does.

- **External provider integration is a port + adapter, one folder per provider.** Application declares the port; Infrastructure implements it against a specific third-party API and is registered via `AddHttpClient<TInterface, TImplementation>` with its own `*Settings` class (base URL, API key where needed, timeout).
- **External API failures must degrade, never throw.** A provider error surfaces as `ErrorType.ServiceUnavailable` or a null/partial result; an enrichment failure returns the item with basic data rather than failing the whole list. "No results" is `Result.Success` with an empty list, not a failure.
- **Provider-shaped data stays out of Domain.** Location search results, attraction lists and destination details are ephemeral DTOs in `Application/DTOs/Responses/`, not entities. Only destinations actually attached to a trip get persisted.
- **A destination reference may be an internal id or a provider `xid`.** Add-to-trip accepts either and imports the destination on first sight, rather than requiring a separate import call.
- **Trip ownership is enforced in the repository, not the use case.** Trip queries take the authenticated user's id (read from the JWT `sub` claim via a small API-layer helper, passed as a plain use-case parameter — no ambient current-user abstraction). A trip the caller does not own is never loaded, so a foreign trip id surfaces as `NotFound`; no `Forbidden` error type exists, deliberately, so sequential int ids cannot leak trip existence.
- **Destructive date changes use a confirm flag on the write, not a dry-run read.** Shrinking a trip's range that would drop days holding planned destinations returns 409 with a count-bearing message; the client re-sends with `confirmed=true`.
- **Verification tokens are stored hashed.** 32 random bytes → base64url raw token, SHA-256 at rest, single-use, config-driven verification link (`VerificationUrlBase`) rather than one derived from the request Host.
- **Registration and login must not become an account-enumeration oracle.** Duplicate registration returns the same generic response as a fresh sign-up; the unverified-login message is only reachable after the password verifies.
- **Frontend layering is fixed.** `component → hooks (TanStack Query) → service → HTTP client → fetch`, one component per `.tsx`, CSS modules, no UI framework, API errors normalized from RFC7807 ProblemDetails into a typed `ApiError { status, message }`.
- **Session is a JWT in `localStorage` with no refresh token.** A 401 from any authorized call clears the session and redirects to login preserving the origin path — this is also the mechanism that satisfies FR18.
- **Migrations must handle existing rows explicitly.** Adding trip ownership required deleting or backfilling orphan trips; adding email verification required backfilling `IsEmailVerified = true` so pre-existing accounts keep working.

### UX Design Requirements

**Not extracted — out of the confirmed input set.** `_bmad-output/planning-artifacts/ux-designs/` holds four bmad-ux run folders (`ux-tripplanner-2026-07-15`, `-16`, `-16-trips`, `-18`), each with a `DESIGN.md` + `EXPERIENCE.md` spine plus accessibility and rubric reviews. The owner scoped this run to the sheet and the five epic documents, so no UX-DR items are enumerated here.

These documents are the specification behind roughly a dozen already-delivered UI stories (the Horizon design-system work, the landing-page redesign, the boarding-pass trips view). If UX-DR extraction is wanted, it is an additive pass over this section and does not invalidate anything below.

### FR Coverage Map

Every FR has exactly **one** owning epic. Epics 5 and 6 deliberately own no FR — they carry NFRs and Additional Requirements, and exist because work that belongs to neither a single feature nor the product surface has to live somewhere nameable.

| FR | Owning epic | Function |
| --- | --- | --- |
| FR1 | Epic 1 | Location autocomplete while typing |
| FR2 | Epic 1 | Search by city/country |
| FR3 | Epic 1 | Recommended attraction list |
| FR4 | Epic 1 | Filter attractions |
| FR5 | Epic 1 | Sort attractions |
| FR6 | Epic 1 | Attraction list pagination |
| FR7 | Epic 2 | Open a destination details view |
| FR8 | Epic 2 | Destination photos |
| FR9 | Epic 2 | Map and location info |
| FR10 | Epic 2 | Opening hours when available |
| FR11 | Epic 3 | Create a trip |
| FR12 | Epic 3 | Set trip start and end dates |
| FR13 | Epic 3 | Add a destination to a trip |
| FR14 | Epic 3 | Schedule a destination into a day (drag from Saved Places) |
| FR15 | Epic 3 | Reorder destinations within a day |
| FR16 | Epic 3 | Move a destination between days |
| FR17 | Epic 3 | Remove a destination from the itinerary |
| FR18 | Epic 3 | Require login to save trips and destinations |
| FR19 | Epic 3 | Automatic save with indicator and retry |
| FR20 | Epic 3 | Load saved trips and destinations on return |
| FR21 | Epic 4 | Sign up with email and password |
| FR22 | Epic 4 | Verify email to activate the account |
| FR23 | Epic 4 | Log in with email and password |
| FR24 | Epic 4 | Log out |

**NFR coverage:** NFR1, NFR2 → Epic 1 · NFR3 → Epic 2 · NFR4, NFR6 → Epic 3 · NFR5 → Epic 6.

## Epic List

Six epics: the five that already have documents in `epic/`, plus one new enabler epic for work that currently sits in the untracked `epic-6` … `epic-10` buckets.

**The one structural change from the pre-restructure backlog:** a feature's UI stories belong to that feature's epic, not to the frontend epic. Before this pass, epics 1–4 held backend work and epic 5 held every `5-*` UI story, which split a single function — "view destination details" — across two epics and is the mechanical reason the backlog drifted. Epic 5 is now the frontend *shell* only.

**Known consequence, accepted by the owner:** `epic/epic-5-frontend-web-app.md` still describes itself as the UI of Features 1–4 and lists stories 5-1 … 5-5, three of which move to Epics 1–3 here. That document is out of scope for this run, so the divergence stands until it is rewritten.

### Epic 1: Destination Suggestion

A user can search for a city or country and see a ranked list of attractions worth visiting there, discovering places before committing to a trip — end to end, from geocoding through to the rendered list.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6
**NFRs:** NFR1, NFR2
**Standalone:** yes. Needs no other epic to function; anonymous browsing works with no account.

### Epic 2: Destination Details

A user can open any attraction and see what it actually is — description, photos, address, opening hours, website, map — and decide from there whether it belongs in a trip.
**FRs covered:** FR7, FR8, FR9, FR10
**NFRs:** NFR3
**Standalone:** yes. Builds on Epic 1's list as an entry point, but a details view reached by direct URL works alone. The "Add to Trip" affordance is present and gated; the trip mechanics behind it are Epic 3's.

### Epic 3: Trip Planner

A logged-in user can create a trip, set its dates to generate itinerary days, collect destinations into specific days, reorder and move them, remove what no longer fits, and return later to find the trip exactly as they left it — never seeing anyone else's.
**FRs covered:** FR11, FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR20
**NFRs:** NFR4, NFR6
**Standalone:** yes, given Epic 4's identity. Consumes Epic 2's destination references; FR18 spans the boundary with Epic 4 by design (the login prompt is raised by the save attempt and resolved by the auth flow).

### Epic 4: User Authentication

A user can create an account, activate it by verifying their email, log in to reach their own trips, and log out to end the session — and is prompted to log in at the moment a save requires it rather than up front.
**FRs covered:** FR21, FR22, FR23, FR24
**NFRs:** none directly; NFR6 depends on the identity this epic establishes.
**Standalone:** yes. Delivers a complete account lifecycle with no dependency on Epics 1–3.

### Epic 5: Frontend Application Shell

*Enabler epic — owns no FR by design.* The foundation every feature's UI runs on: the Vite/React/TypeScript scaffold, routing, the three-tier API layer (`component → hooks → service → HttpClient → fetch`), session and 401 handling, the design system and shared UI primitives, and the module structure that keeps features from reaching into each other.
**FRs covered:** none — deliberately. Each FR's UI lives in its feature epic.
**Additional Requirements:** frontend layering; JWT in `localStorage` with 401-clears-session; RFC7807 ProblemDetails normalized to a typed `ApiError`.
**Standalone:** it is the prerequisite for the UI half of Epics 1–4, and delivers no user-visible value on its own. Stated plainly rather than dressed up as an outcome.

### Epic 6: Platform, Quality & Deployment

*Enabler epic — owns no FR by design.* Backend architecture conformance, the provider response cache, containerization and deployment, and the verification/audit passes that check delivered work against `requirement/Sheet1.html`. This epic is where the untracked `epic-6` … `epic-10` buckets are consolidated.
**FRs covered:** none.
**NFRs:** NFR5.
**Additional Requirements:** port + adapter per external provider; failures degrade rather than throw; migrations handle pre-existing rows explicitly.
**Standalone:** yes as a work stream, but it is maintenance and infrastructure — it changes how the product runs, not what a user can do.

---

## Story Conventions For This Restructure

Each story below carries three metadata lines that are additions to the base template, needed because this is a re-derivation over delivered work rather than a greenfield breakdown:

- **Fulfils** — the FR/NFR this story exists to satisfy. A story with no FR is marked explicitly; it is real delivered work that the sheet never asked for, and hiding it would make the backlog lie.
- **Absorbs** — the pre-restructure story artifacts in `_bmad-output/implementation-artifacts/` that this story replaces. This is the old→new ID mapping, recorded per story so no historical artifact becomes unreachable.
- **Status** — restated from `sprint-status.yaml` as of `last_updated: 2026-07-28`. **Not a re-verification.** Where that file says `review` but the changelog narrative says the work was accepted, this is written as `delivered (tracked: review)` — resolving those 30 stale `review` states is its own task and is out of scope here.

## Epic 1: Destination Suggestion

A user can search for a city or country and see a ranked list of attractions worth visiting there, discovering places before committing to a trip — end to end, from geocoding through to the rendered list.

### Story 1.1: Search for a city or country by name

As a traveller,
I want to type a city or country name and get matching places,
So that I can pick the destination I actually mean before browsing attractions.

**Acceptance Criteria:**

**Given** the search input is empty
**When** I enter at least 1 character and submit
**Then** I receive a list of matching cities and countries
**And** the list is capped at 5 results, contains no duplicate name+country pairs, and is ordered exact-match-first

**Given** a query whose casing or completeness differs from the stored name (`"lon"`, `"LONDON"`)
**When** the search runs
**Then** matching is case-insensitive and accepts partial matches
**And** `"Lon"` returns `"London"`

**Given** a query that is a known country name
**When** the search runs
**Then** the result is classified as a country only when the provider's returned country code agrees with the name
**And** it is otherwise classified as a city, so a same-named locality elsewhere cannot masquerade as the country

**Given** the geocoding provider is unreachable or times out
**When** the search runs
**Then** the caller receives a service-unavailable result rather than an exception
**And** a query with genuinely no matches is a successful empty list, not a failure

- **Fulfils:** FR2 (business rules and AC 1–2), NFR1
- **Absorbs:** `1-6-location-relevance-ordering`
- **Status:** delivered (tracked: done)

### Story 1.2: Choose a search result and clear the search

As a traveller,
I want to see which results are cities and which are countries, select one, and clear it,
So that I can control what location the attraction list is showing me.

**Acceptance Criteria:**

**Given** search results are displayed
**When** I read the list
**Then** each result's name is shown with its type clearly labeled as city or country

**Given** search results are displayed
**When** I select one
**Then** that city or country becomes the active search value and is shown as such

**Given** a location is active
**When** I clear the search input
**Then** the search returns to its empty state ready for a new query

**Given** a submitted search that matches no location
**When** the results render
**Then** the message reads exactly "No attractions found"

- **Fulfils:** FR2 (AC 3–7)
- **Absorbs:** part of `5-3-destination-discovery`
- **Status:** delivered (tracked: done)

### Story 1.3: See recommended attractions for the chosen location

As a traveller,
I want a list of recommended attractions for the location I selected,
So that I can decide what is worth exploring there.

**Acceptance Criteria:**

**Given** a valid location with coordinates is active
**When** the attraction list loads
**Then** attractions are fetched by coordinates within a 20 km default radius for a city
**And** at most 20 items are returned per page, ranked by provider ranking and/or popularity

**Given** an attraction in the list
**When** it renders
**Then** its name is shown
**And** its category/tags, rating/popularity indicator and thumbnail are shown when the provider supplies them

**Given** an attraction whose image or rating the provider does not supply
**When** it renders
**Then** a placeholder is shown in place of the missing image or rating rather than an empty gap

**Given** the per-attraction enrichment call fails for one item
**When** the list renders
**Then** that attraction still appears with its basic data
**And** the rest of the list is unaffected

**Given** a country was selected rather than a city
**When** the user asks for attractions
**Then** they are asked to narrow to a city first, since no country-wide fallback exists

- **Fulfils:** FR3, NFR2
- **Absorbs:** part of `5-3-destination-discovery`
- **Status:** delivered (tracked: done)

### Story 1.4: Get location suggestions while typing

As a traveller,
I want suggestions to appear as I type,
So that I can select the right location without typing it in full or guessing its spelling.

**Acceptance Criteria:**

**Given** the search input is focused
**When** I have typed at least 2 characters
**Then** location suggestions are requested
**And** at most 5 city/country suggestions are shown

**Given** suggestions are visible
**When** I select one
**Then** the selected location is placed in the search box as the confirmed value
**And** the suggestion list closes

**Given** I keep typing after a selection
**When** the text no longer equals the selected location
**Then** suggestions re-open for the new fragment
**And** submitting searches the text actually in the box, not a stale selection

**Given** I dismiss the suggestion list
**When** I click away or press Escape
**Then** it closes without changing the active search value

- **Fulfils:** FR1
- **Absorbs:** `5-7-search-auto-suggest`, `5-9-destination-autosuggest-prefix-match`
- **Status:** delivered (tracked: 5-7 review, 5-9 done)

### Story 1.5: Filter the attraction list

As a traveller,
I want to filter attractions by category and by rating,
So that I only look at places matching my interests.

**Acceptance Criteria:**

**Given** an attraction list is displayed
**When** I apply a category filter
**Then** the list narrows to attractions in that category

**Given** an attraction list is displayed
**When** I apply a rating/popularity filter
**Then** the list narrows to attractions at or above that rating

**Given** one filter is applied
**When** I apply a second filter of a different kind
**Then** both filters apply together

**Given** filters are applied
**When** I clear them
**Then** the full attraction list returns

**Given** filters are applied
**When** I load a further page of results
**Then** the filters remain applied

- **Fulfils:** FR4
- **Absorbs:** `1-4-filter-and-sort-attractions` (filter half)
- **Status:** delivered (tracked: done)

### Story 1.6: Sort the attraction list

As a traveller,
I want to sort attractions,
So that I can put the highest-rated places first when that is what I care about.

**Acceptance Criteria:**

**Given** an attraction list is displayed
**When** I have not chosen a sort
**Then** the list is in recommended order by default

**Given** an attraction list is displayed
**When** I sort by highest rating/popularity
**Then** the list reorders accordingly
**And** the results update immediately without a further action

**Given** filters are applied
**When** I change the sort order
**Then** the filters remain applied

- **Fulfils:** FR5
- **Absorbs:** `1-4-filter-and-sort-attractions` (sort half)
- **Status:** delivered (tracked: done)
- **Known limitation carried from the original story:** client-side rating sort orders only the pages already loaded and reflows when more are appended.

### Story 1.7: Load more attractions

As a traveller,
I want to load more attractions past the first page,
So that I am not limited to the first 20 results in a city with more to offer.

**Acceptance Criteria:**

**Given** a full page of 20 attractions is displayed
**When** I reach the end of the list
**Then** I can load the next page
**And** the new items are appended rather than replacing the current ones

**Given** paging has reached the provider's practical offset ceiling
**When** I try to load more
**Then** paging stops cleanly instead of repeatedly erroring

**Given** a load-more request fails
**When** the error surfaces
**Then** the already-loaded items and the filter/sort controls remain visible and usable

- **Fulfils:** FR6 (marked optional in the sheet)
- **Absorbs:** `1-5-attraction-list-pagination`
- **Status:** delivered (tracked: done)

### Story 1.8: Pre-search landing state

As a first-time visitor,
I want something useful on the page before I have searched anything,
So that I can start from a suggested city or one of my recent searches instead of a blank input.

**Acceptance Criteria:**

**Given** I open the app and have not searched
**When** the page renders
**Then** I see the hero search entry point, my recent searches when any exist, and a rail of popular city tiles

**Given** a popular city tile
**When** it renders
**Then** a city photograph is shown over an unconditional gradient underlay
**And** a missing, failed or still-loading image leaves the tile looking correct with no error state

**Given** a popular city tile
**When** I choose it
**Then** the search input is pre-filled and submitted for that city

- **Fulfils:** **no FR** — additive UI beyond the sheet, recorded so the backlog accounts for delivered work
- **Absorbs:** `5-19-landing-page-framed-editorial`, `5-20-popular-search-tile-images`, `5-14-horizon-home-redesign`
- **Status:** delivered (tracked: 5-19 review, 5-20 review, 5-14 done)

### Story 1.9: Meet the search and attraction-list performance budgets

As a traveller,
I want search and attraction results to arrive quickly,
So that discovery does not feel like waiting on a server.

**Acceptance Criteria:**

**Given** city/country search under normal conditions
**When** 95% of requests are measured
**Then** results return within 500 ms

**Given** an attraction-list request under normal conditions
**When** 95% of requests are measured
**Then** suggestions are displayed within 1000 ms

**Given** the measurement method
**When** the budgets are asserted
**Then** there is a repeatable way to produce the numbers, so the budget is verifiable rather than assumed

- **Fulfils:** NFR1, NFR2
- **Absorbs:** nothing — **this is a genuine gap.** No existing story measures either budget; the closest work is Epic 6's provider caching, which improves latency without ever asserting it.
- **Status:** backlog

## Epic 2: Destination Details

A user can open any attraction and see what it actually is — description, photos, address, opening hours, website, map — and decide from there whether it belongs in a trip.

### Story 2.1: Open and close a destination details view

As a traveller,
I want to open a destination from the list and see its full information,
So that I can judge it properly before committing it to a trip.

**Acceptance Criteria:**

**Given** an attraction in the list
**When** I select it
**Then** its detail view opens showing name, category and short description

**Given** the detail view is open
**When** the provider supplied address and website
**Then** both are displayed

**Given** the provider supplied only some of the fields
**When** the detail view opens
**Then** it still opens and renders the fields that exist
**And** each missing field shows a "not available" fallback rather than blocking the view

**Given** the detail view is open
**When** I close it
**Then** I return to the list I came from

**Given** a destination identifier the provider does not recognise
**When** details are requested
**Then** the caller receives a not-found result, distinct from a provider outage

- **Fulfils:** FR7 (AC 1–3, 5, 7)
- **Absorbs:** `5-4-destination-details` (details-view half)
- **Status:** delivered (tracked: review)

### Story 2.2: Add this destination to a trip, gated on being logged in

As a traveller,
I want an Add-to-Trip action on the details view that respects whether I am logged in,
So that I can capture a place I like without losing my place in the flow.

**Acceptance Criteria:**

**Given** the detail view is open
**When** it renders
**Then** an option to add this destination to a trip is identifiable

**Given** I am not logged in
**When** I look at the Add-to-Trip action
**Then** it is unavailable, and the browsing experience itself remains fully anonymous

**Given** I am logged in and the destination has never been saved before
**When** I add it to a trip
**Then** it is imported from the provider identifier and persisted on first sight
**And** the persisted record carries the provider's own category verbatim and its opening hours, not a lossy substitute

**Given** the same destination is added again later
**When** the import path runs
**Then** the existing record is reused rather than duplicated

- **Fulfils:** FR7 (AC 6 and the not-logged-in business rule)
- **Absorbs:** `6-3-fix-xid-import-destination-mapping`
- **Status:** delivered (tracked: review)
- **Cross-epic note:** the trip-side mechanics of the add are Story 3.3. This story owns only the affordance and the import.

### Story 2.3: View destination photos

As a traveller,
I want to see photos of the destination,
So that I can judge whether it is worth visiting.

**Acceptance Criteria:**

**Given** the destination has at least one image available
**When** the detail view opens
**Then** the photos are displayed

**Given** the destination has more than one image
**When** I interact with the gallery
**Then** I can move through the photos

**Given** the destination has no image available
**When** the detail view opens
**Then** a placeholder is shown in place of the gallery

**Given** an image is still downloading or fails to load
**When** the gallery renders
**Then** a loading state is shown and a failure degrades to the placeholder rather than an empty frame

**Given** an image already in the browser cache
**When** the view re-renders
**Then** the image appears rather than remaining stuck behind its loading transition

- **Fulfils:** FR8
- **Absorbs:** `8-1-destination-image-wikipedia-fallback`, `8-2-wikipedia-primary-image-provider`, `8-3-fix-missing-destination-images`, `8-4-image-loading-state`, `8-5-destination-details-multiple-images`
- **Status:** partially delivered — `8-5` (multi-image sourcing, which is what makes FR8 AC2 reachable) is tracked `ready-for-dev`; the other four are tracked `review`

### Story 2.4: View opening hours when available

As a traveller,
I want to see opening hours,
So that I can plan the right day and time to go.

**Acceptance Criteria:**

**Given** the destination has opening-hours data
**When** the detail view opens
**Then** the hours are displayed

**Given** the destination has no opening-hours data
**When** the detail view opens
**Then** the message reads exactly "Opening hours not available"
**And** other missing fields keep their own generic fallback wording, so this literal is not applied indiscriminately

**Given** opening hours are sourced from an external map dataset
**When** the destination is of any type, not only landmarks
**Then** hours are looked up for it

**Given** the hours lookup fails transiently
**When** the result is cached
**Then** the failure is cached only briefly, while a definitive answer — including a definitive "no hours" — is cached for the full period

- **Fulfils:** FR10
- **Absorbs:** `6-5-destination-opening-hours-source`, `6-7-opening-hours-not-available-copy`
- **Status:** delivered (tracked: `6-5` in-progress, `6-7` done)
- **Sheet-vs-epic conflict, resolved in favour of the sheet:** `epic-2-destination-details.md` places this function under "Out of scope" and asserts "no separate backend work is needed". The sheet marks it `Selected = Yes`, and the work turned out to need a whole new provider integration. The epic document is wrong here.

### Story 2.5: See the destination on a map

As a traveller,
I want to see where the destination actually is,
So that I understand its location relative to everything else.

**Acceptance Criteria:**

**Given** the destination has coordinates
**When** the detail view opens
**Then** a map is shown with a marker at the destination

**Given** the map is shown
**When** I interact with it
**Then** I can zoom and pan to explore the surrounding area

**Given** the destination has an address or area label
**When** the detail view opens
**Then** that label is displayed

**Given** the destination name is rendered into the map marker
**When** the marker is created
**Then** the name is escaped, so a name containing markup cannot execute

- **Fulfils:** FR9
- **Absorbs:** `5-15-azure-attraction-detail-redesign` (map half)
- **Status:** delivered (tracked: done)
- **Note:** the sheet marks FR9 `Selected = No`; it was built anyway.

### Story 2.6: Details page presentation and entry points

As a traveller,
I want the details page to be pleasant to read and reachable from wherever I encountered the place,
So that the information is usable rather than merely present.

**Acceptance Criteria:**

**Given** the details page
**When** it renders
**Then** it follows the shared design system rather than page-local styling

**Given** a destination already scheduled in one of my trips
**When** I select it from the itinerary
**Then** I reach that destination's details page

**Given** the details page for a destination
**When** it renders
**Then** nearby attractions are offered as onward navigation

**Given** I navigate from one destination directly to another
**When** the new page renders
**Then** the hero and map reset to the new destination rather than retaining the previous one

- **Fulfils:** **no FR** — presentation and navigation work beyond the sheet
- **Absorbs:** `5-15-azure-attraction-detail-redesign` (page/redesign half), `5-11-trip-destination-detail-link`
- **Status:** delivered (tracked: done)

### Story 2.7: Open the details view within two seconds

As a traveller,
I want the details view to appear promptly,
So that opening a place does not feel like a page load.

**Acceptance Criteria:**

**Given** the user opens a destination detail view
**When** the time to display is measured
**Then** it is within 2 seconds

**Given** the details response is assembled from several external providers
**When** independent legs can run concurrently
**Then** they do, rather than accumulating serially

**Given** a details response has been fetched once
**When** it is requested again within its cache window
**Then** it is served from cache rather than re-fetched

**Given** the per-leg provider timeouts are summed
**When** the cold worst case is computed
**Then** it is reconciled against the 2-second budget, so the budget is not asserted while being structurally unreachable

- **Fulfils:** NFR3
- **Absorbs:** `6-4-attraction-detail-caching`, `6-8-destination-details-latency-nfr3`
- **Status:** partially delivered — caching landed; the budget itself remains unproven. The prior verification pass downgraded NFR3 to a warning after finding the cold worst case around 26 seconds, which no amount of caching alone closes.

### Story 2.8: Verify Feature 2 against the requirements sheet

As the product owner,
I want a function-by-function audit of Feature 2 against the sheet,
So that I know which acceptance criteria are genuinely met rather than assumed.

**Acceptance Criteria:**

**Given** the sheet's Feature 2 rows and NFR3/NFR6
**When** the audit runs
**Then** every acceptance criterion receives an explicit verdict with file-level evidence

**Given** a verdict
**When** it is recorded
**Then** it is pinned to a specific commit, and the test counts cited are measured at that commit rather than in a dirty working tree

**Given** a verdict with no backing test
**When** the audit reports
**Then** that absence is named rather than implied by silence

- **Fulfils:** **no FR** — quality gate over Epic 2
- **Absorbs:** `6-6-feature-2-requirements-verification`
- **Status:** delivered (tracked: done)

## Epic 3: Trip Planner

A logged-in user can create a trip, set its dates to generate itinerary days, collect destinations into specific days, reorder and move them, remove what no longer fits, and return later to find the trip exactly as they left it — never seeing anyone else's.

### Story 3.1: Create a trip

As a traveller,
I want to create a trip by naming it,
So that I have somewhere to start planning an itinerary.

**Acceptance Criteria:**

**Given** I am logged in
**When** I create a trip with a name
**Then** the trip is created and appears in my trip list

**Given** I submit without a name
**When** validation runs
**Then** the trip is not created and the required-name error is shown

**Given** the trip was created
**When** creation completes
**Then** I can open its planner

**Given** the create form is presented as a dialog
**When** it is open
**Then** the trip list behind it stays visible, focus is trapped in the dialog, Escape closes it, and focus returns to the button that opened it

- **Fulfils:** FR11
- **Absorbs:** `5-21-create-trip-dialog`, part of `5-5-trip-planner-ui`
- **Status:** delivered (tracked: `5-21` review, `5-5` done)

### Story 3.2: Set trip dates and generate itinerary days

As a traveller,
I want to set start and end dates,
So that the planner gives me one day per date to plan into.

**Acceptance Criteria:**

**Given** a trip
**When** I set a start date and an end date with start ≤ end
**Then** one itinerary day is created for each date in the range

**Given** a start date later than the end date
**When** validation runs
**Then** the change is rejected

**Given** I widen the date range
**When** the change is saved
**Then** days are added for the new dates and existing days keep their planned destinations

**Given** I narrow the range such that days holding planned destinations would be dropped
**When** I save without confirming
**Then** the change is refused with a message naming how many days and destinations would be lost
**And** re-sending the same change with confirmation applies it

- **Fulfils:** FR12
- **Absorbs:** part of `5-5-trip-planner-ui`
- **Status:** delivered (tracked: done)

### Story 3.3: Add a destination to a day of a trip

As a traveller,
I want to add destinations to a chosen day of a chosen trip,
So that I build an actual day-by-day itinerary.

**Acceptance Criteria:**

**Given** I am logged in and have a trip with days
**When** I add a destination from the attraction list
**Then** I choose the trip and the day, and the destination appears under that day immediately

**Given** I am on a destination's details page
**When** I add it to a trip
**Then** the same choose-trip-and-day flow applies and the result is identical

**Given** a destination already present on the target day
**When** I add it again
**Then** it is not duplicated on that day

- **Fulfils:** FR13
- **Absorbs:** part of `5-5-trip-planner-ui`
- **Status:** delivered (tracked: done)

### Story 3.4: Remove a destination from the itinerary

As a traveller,
I want to remove a destination from a day,
So that my itinerary stays accurate.

**Acceptance Criteria:**

**Given** a destination on a trip day
**When** I remove it and confirm
**Then** it disappears from that day immediately

**Given** the removal leaves gaps in the day's ordering
**When** the day is re-read
**Then** the remaining destinations keep a contiguous order with no hole

**Given** the removal request fails
**When** the error surfaces
**Then** the destination is restored in the view rather than left visually removed

- **Fulfils:** FR17
- **Absorbs:** part of `5-5-trip-planner-ui`
- **Status:** delivered (tracked: done)

### Story 3.5: Collect destinations in Saved Places and drag them into a day

As a traveller,
I want a shortlist of places not yet scheduled, and to drag one into a specific day,
So that I can gather candidates first and commit them to days afterwards.

**Acceptance Criteria:**

**Given** a trip
**When** I add a destination without choosing a day
**Then** it is held in Saved Places for that trip

**Given** a destination in Saved Places and a day in the trip
**When** I drag it onto that day
**Then** it is removed from Saved Places and appears on the day in one atomic operation

**Given** a destination already scheduled on the target day
**When** I drop the same destination there
**Then** I am told it already exists in that day and it is not scheduled twice

**Given** the drop is invalid
**When** the gesture completes
**Then** the destination returns to Saved Places

**Given** a drag-and-drop gesture
**When** the UI responds
**Then** it does so within 100 ms with no visible lag

- **Fulfils:** FR14, NFR4
- **Absorbs:** `3-4-schedule-destinations-into-day`
- **Status:** delivered (tracked: done)
- **Note:** the sheet marks FR14 `Selected = No`; it was built anyway, which also retired the sheet's own fallback that users must always pick a day at add time.

### Story 3.6: Reorder destinations within a day

As a traveller,
I want to change the order of destinations inside a day,
So that I control the sequence I visit them in.

**Acceptance Criteria:**

**Given** a day with several destinations
**When** I drag one to a new position within the day
**Then** the new order is applied and saved without a separate save action

**Given** the reordered day
**When** I refresh the page
**Then** the order I set is still there

**Given** the order is persisted
**When** the day is read back
**Then** positions are contiguous and are assigned by the day itself rather than by callers

**Given** a reorder gesture
**When** the UI responds
**Then** it does so within 100 ms with no visible lag

- **Fulfils:** FR15, NFR4
- **Absorbs:** `3-5-reorder-destinations-within-day`
- **Status:** delivered (tracked: done)
- **Note:** the sheet marks FR15 `Selected = No`; it was built anyway. It required promoting the day↔destination join to an explicit entity carrying a position.

### Story 3.7: Move a destination from one day to another

As a traveller,
I want to move a destination between days,
So that I can reschedule without deleting and re-adding.

**Acceptance Criteria:**

**Given** a destination on one day and another day in the same trip
**When** I drag it across
**Then** it is removed from the original day and appears on the target day

**Given** the destination already exists on the target day
**When** the move is attempted
**Then** the operation is idempotent on the target day — no duplicate is created

**Given** the drop is invalid
**When** the gesture completes
**Then** the destination remains on its original day

**Given** a drag within the same day versus across days
**When** the gesture ends
**Then** the former is treated as a reorder and the latter as a move, never confused

- **Fulfils:** FR16, NFR4
- **Absorbs:** `3-6-move-destination-between-days`
- **Status:** delivered (tracked: done)
- **Note:** the sheet marks FR16 `Selected = No`; it was built anyway.

### Story 3.8: Prompt for login at the moment a save requires it

As a visitor browsing without an account,
I want to be asked to log in only when I try to save something,
So that I can explore freely and not lose the action I was performing.

**Acceptance Criteria:**

**Given** I am not logged in
**When** I browse destinations
**Then** nothing requires an account

**Given** I am not logged in
**When** I try to create a trip or add a destination to a trip
**Then** I am prompted to log in

**Given** I was prompted from a specific trip or destination
**When** I log in successfully
**Then** I am returned to that same place rather than a generic landing page

**Given** the session expires mid-session
**When** any authorized request returns unauthorized
**Then** the session is cleared and I am sent to login with the origin path preserved

- **Fulfils:** FR18
- **Absorbs:** the route-guard and post-login-redirect portion of `5-2-authentication-ui`
- **Status:** delivered (tracked: review)
- **Cross-epic note:** `5-2` is shared with Epic 4 stories 4.1, 4.4 and 4.5. It is the clearest example of a pre-restructure artifact that spanned two features.

### Story 3.9: Load my trips and itineraries when I return

As a returning traveller,
I want my trips and their contents to be there when I come back,
So that I can continue where I left off.

**Acceptance Criteria:**

**Given** I log in having created trips previously
**When** I open my trip list
**Then** my previously created trips are shown

**Given** a previously planned trip
**When** I open it
**Then** its saved destinations and itinerary days are shown as I left them

**Given** I have no trips
**When** I open the trip list
**Then** an empty state is shown rather than a blank page

**Given** a trip is loaded
**When** the aggregate is read
**Then** both the scheduled days and the Saved Places shortlist are populated, never one without the other

- **Fulfils:** FR20
- **Absorbs:** part of `5-5-trip-planner-ui`, `5-16-horizon-trips-boarding-pass-redesign`
- **Status:** delivered (tracked: `5-5` done, `5-16` review)

### Story 3.10: See only my own trips

As a traveller,
I want my trips to be private to my account,
So that nobody else can read or change them.

**Acceptance Criteria:**

**Given** a trip owned by another user
**When** I request it by its identifier
**Then** I receive a not-found result, indistinguishable from a trip that does not exist

**Given** any trip query
**When** it executes
**Then** it is scoped by the authenticated user's identity at the data-access layer, so a use case cannot forget the check

**Given** the trip list
**When** it is returned
**Then** it contains only trips I own, and no owner identity is exposed in the response

- **Fulfils:** NFR6
- **Absorbs:** nothing — implemented as part of the original Epic 3 backend work, before story tracking existed
- **Status:** delivered (no story artifact)

### Story 3.11: Save changes automatically with a saving indicator and retry

As a traveller,
I want my edits saved without pressing save, with visible feedback and a way to recover from failure,
So that I never lose planning work.

**Acceptance Criteria:**

**Given** I create a trip, add or remove a destination, or edit trip name/dates
**When** I close and reopen the app
**Then** every one of those changes is still applied

**Given** a change is being saved
**When** the request is in flight
**Then** a saving indicator is visible

**Given** a save fails
**When** the error surfaces
**Then** I see an error message and my unsaved change is retained locally until I retry

- **Fulfils:** FR19
- **Absorbs:** nothing
- **Status:** **partially delivered — the persistence half only.** Every mutation already commits synchronously, so the first criterion holds today. The saving indicator and the local-retention-on-failure behaviour were never built. This is the second genuine gap found in this pass.

## Epic 4: User Authentication

A user can create an account, activate it by verifying their email, log in to reach their own trips, and log out to end the session — and is prompted to log in at the moment a save requires it rather than up front.

### Story 4.1: Sign up with email and password

As a new user,
I want to create an account with my email and a password,
So that I can have my own trips.

**Acceptance Criteria:**

**Given** the sign-up screen
**When** I submit an email and a password of at least 8 characters
**Then** an account is created with the password stored only as a strong hash

**Given** an email that is already registered
**When** I submit it
**Then** I receive exactly the same response as a fresh sign-up, so registration cannot be used to discover which addresses have accounts

**Given** a password that fails the policy
**When** I submit
**Then** the account is not created and the policy failure is reported

**Given** a successful sign-up
**When** the response returns
**Then** I am shown a check-your-inbox state and am *not* signed in

**Given** the verification email cannot be dispatched
**When** registration is processed
**Then** the account creation is rolled back and the request reports the failure, so no account exists that can never be activated

- **Fulfils:** FR21
- **Absorbs:** part of `5-2-authentication-ui`
- **Status:** delivered (tracked: review)
- **Deviation from the sheet, deliberate and recorded:** the sheet's FR21 asks for both "a message when the email is already registered" and "generic error messages to avoid account enumeration". These contradict. Anti-enumeration wins. The sheet's "continue signed-in after sign-up" is also amended, because verification now gates login.

### Story 4.2: Verify an email address to activate the account

As a new user,
I want to activate my account by clicking a link in my email,
So that my account is confirmed to be mine.

**Acceptance Criteria:**

**Given** a newly registered account
**When** it is created
**Then** it is unverified, and a single-use verification token is stored hashed with an expiry

**Given** a valid, unexpired token
**When** I follow the verification link
**Then** my account becomes verified and the token can no longer be reused

**Given** an unknown, expired or already-used token
**When** I follow the link
**Then** I am told the token is invalid or expired, in wording that does not distinguish the cases

**Given** a verified account
**When** I log in
**Then** login succeeds; while unverified, login is refused with a message stating the address is not verified

**Given** I did not receive the email
**When** I request it again
**Then** a new email is sent, subject to a short cooldown during which the generic success is returned without re-sending

- **Fulfils:** FR22
- **Absorbs:** `7-1-resend-email-integration`, `5-18-verify-email-page-rebuild`
- **Status:** delivered (tracked: `7-1` review, `5-18` review)
- **Requirements note:** this is the FR whose sheet cells are **empty**. Every criterion above traces to `epic-4-user-authentication.md`, not to the sheet. It is authored product intent, and should be read as such.

### Story 4.3: Send verification email through a swappable provider

As an operator,
I want the email transport chosen by configuration,
So that I can change email providers without a code change and without the unused provider's blank credentials breaking startup.

**Acceptance Criteria:**

**Given** a configured provider key
**When** the application starts
**Then** only that provider's transport settings are bound and validated

**Given** no provider key is configured
**When** the application starts
**Then** the default provider is selected

**Given** an unrecognised provider key
**When** the application starts
**Then** startup fails with a message listing the supported keys

**Given** a verification email is sent
**When** it is composed
**Then** it carries both a plain-text and an HTML alternative, with all substituted values HTML-escaped in the HTML part and the raw link preserved in the text part

**Given** a new provider is added later
**When** it is registered
**Then** only its own module and the provider registry change

- **Fulfils:** FR22 (delivery infrastructure)
- **Absorbs:** `7-2-email-provider-strategy-pattern`, `7-3-google-smtp-email-provider`, `7-4-html-verification-email-and-provider-strategy`
- **Status:** delivered (tracked: `7-3` done, `7-2` and `7-4` review)

### Story 4.4: Log in with email and password

As a registered user,
I want to log in,
So that I can reach my own trips.

**Acceptance Criteria:**

**Given** valid credentials for a verified account
**When** I log in
**Then** I am signed in and receive a bearer token

**Given** an unknown email or a wrong password
**When** I log in
**Then** both cases return the identical generic invalid-credentials message

**Given** correct credentials for an unverified account
**When** I log in
**Then** I am refused with the distinct not-verified message
**And** this check runs only after the password verifies, so a single login attempt cannot be used to probe which addresses exist

**Given** I am signed in
**When** I refresh the page
**Then** I remain signed in

- **Fulfils:** FR23
- **Absorbs:** `4-5-unverified-login-message`, part of `5-2-authentication-ui`
- **Status:** delivered (tracked: `4-5` done, `5-2` review)
- **Accepted residual disclosure:** because registration no-ops on a duplicate email, a register-then-login pair with a caller-chosen password can still distinguish a free address from a registered one. This is inherent to disclosing the unverified state at all; the tracked mitigation is rate limiting, which does not exist yet.

### Story 4.5: Log out

As a signed-in user,
I want to log out,
So that my session ends on this device.

**Acceptance Criteria:**

**Given** I am signed in
**When** I log out
**Then** the session ends immediately and the app shows a logged-out state

**Given** I have logged out
**When** I try to reach a protected page
**Then** I am prevented from doing so

**Given** the token issued for my session
**When** it is presented again after logout
**Then** it is rejected, rather than remaining valid until natural expiry

**Given** the app is still resolving my session on first load
**When** navigation renders
**Then** it does not briefly show a logged-out state to a logged-in user, nor the reverse

- **Fulfils:** FR24
- **Absorbs:** part of `5-2-authentication-ui`, `5-8-trips-nav-and-auth-race-fix`
- **Status:** delivered (tracked: review)

### Story 4.6: Auth screens presentation

As a user,
I want the sign-up, login and verification screens to feel like part of the product,
So that the entry to the app is not visibly older than the rest of it.

**Acceptance Criteria:**

**Given** any auth screen
**When** it renders
**Then** it follows the shared design system rather than page-local styling

**Given** the password field
**When** I interact with it
**Then** its visibility affordance and validation feedback behave consistently across sign-up and login

- **Fulfils:** **no FR** — presentation work beyond the sheet
- **Absorbs:** `5-13-horizon-auth-redesign`
- **Status:** delivered (tracked: review)

## Epic 5: Frontend Application Shell

*Enabler epic — owns no FR by design.* The foundation every feature's UI runs on.

### Story 5.1: Frontend scaffold, routing and API client

As a frontend developer,
I want an application shell with routing and a single typed HTTP boundary,
So that feature UI can be built without each story re-deciding how requests are made.

**Acceptance Criteria:**

**Given** the app
**When** it starts
**Then** routes exist for search, destination details, trips, trip planner, register, login and verify-email, plus a not-found route

**Given** any API call anywhere in the app
**When** it is issued
**Then** it goes through one HTTP client that owns base URL, headers, bearer-token injection and empty/204 body handling

**Given** an error response
**When** it is received
**Then** RFC7807 ProblemDetails is normalized into a typed error carrying status and message

**Given** the base URL is configured empty
**When** requests are issued
**Then** they are relative and same-origin, which is what makes the containerized single-origin deployment work

- **Fulfils:** no FR — infrastructure for all feature UI
- **Absorbs:** `5-1-frontend-scaffold-and-api-client`
- **Status:** delivered (tracked: done)

### Story 5.2: Shared design system

As a frontend developer,
I want one set of design tokens and shared UI primitives,
So that pages stop carrying their own private styling vocabulary.

**Acceptance Criteria:**

**Given** any page
**When** it styles itself
**Then** it draws colour, spacing and typography from shared tokens rather than hardcoded values

**Given** a UI pattern used by more than one feature
**When** it is needed
**Then** it exists once as a shared primitive rather than being reimplemented per feature

**Given** a modal or dialog
**When** it opens
**Then** focus is trapped, scroll is locked, Escape closes it and focus is restored on close — in one place, not per caller

- **Fulfils:** no FR
- **Absorbs:** `5-12-frontend-redesign-horizon-design-system`, `5-6-ui-modernization-cute-light-blue`
- **Status:** delivered (tracked: review)

### Story 5.3: Motion and depth polish

As a user,
I want transitions and elevation to feel deliberate,
So that the interface reads as finished.

**Acceptance Criteria:**

**Given** route changes and interactive elements
**When** they animate
**Then** the motion is consistent across the app and does not interfere with layout containment or fixed-position overlays

- **Fulfils:** no FR
- **Absorbs:** `5-10-ui-motion-and-depth-polish`
- **Status:** delivered (tracked: done)

### Story 5.4: Feature-based module structure

As a frontend developer,
I want the codebase organized by feature with enforced boundaries,
So that a change to one surface does not require reading unrelated files.

**Acceptance Criteria:**

**Given** the source tree
**When** a file is placed
**Then** it lives under its feature, or under shared only if genuinely used by more than one feature

**Given** any module
**When** it exports
**Then** one React component per file, with data, hooks and helpers in plain sibling modules

**Given** a cross-feature import
**When** it appears
**Then** it is the signal to promote the code to shared rather than to add the import

**Given** the lint gate
**When** it runs
**Then** it reports zero warnings, and any warning is treated as a regression

- **Fulfils:** no FR
- **Absorbs:** `5-17-frontend-feature-based-restructure`, `5-22-frontend-structure-audit-and-component-split`
- **Status:** delivered (tracked: review)

### Story 5.5: Per-model files and an explicit service layer

As a frontend developer,
I want each API model in its own file and every call behind an injectable service,
So that the data contract is readable one type at a time and the HTTP boundary can be tested without module mocking.

**Acceptance Criteria:**

**Given** an API model
**When** it is defined
**Then** it is a type-only declaration in its own file, filed under the domain it belongs to

**Given** a feature's API calls
**When** they are made
**Then** they go through that feature's service class, which receives the HTTP client through its constructor and is also exported as a shared singleton

**Given** the layering
**When** it is inspected
**Then** it is component → hooks → service → HTTP client → fetch, with no tier skipped and no service aware of the query library

**Given** a service test
**When** it runs
**Then** it constructs the service with a client against a stubbed fetch, with no module mocking

- **Fulfils:** no FR
- **Absorbs:** `5-23-frontend-model-and-service-layer`
- **Status:** delivered (tracked: review)

## Epic 6: Platform, Quality & Deployment

*Enabler epic — owns no FR by design.* Where the untracked `epic-6` … `epic-10` buckets are consolidated.

### Story 6.1: Cache external provider responses

As an operator,
I want provider responses cached,
So that repeated lookups do not re-hit rate-limited third-party APIs.

**Acceptance Criteria:**

**Given** any external provider client
**When** it fetches
**Then** it caches its own response under its own configured lifetime

**Given** caching is internal to the infrastructure layer
**When** a use case runs
**Then** it has no knowledge that caching exists

**Given** a transient provider failure
**When** it is cached
**Then** it is cached only briefly, while definitive answers are cached for the full lifetime

- **Fulfils:** no FR; supports NFR2 and NFR3
- **Absorbs:** `10-1-redis-response-caching`
- **Status:** delivered (tracked: review)

### Story 6.2: Source infrastructure endpoints from the environment

As an operator,
I want the database and cache endpoints supplied by configuration,
So that I can point the app at managed services without editing version-controlled files.

**Acceptance Criteria:**

**Given** no override is provided
**When** the stack starts
**Then** the bundled in-network services are used, reproducing the previous behaviour exactly

**Given** an override is provided
**When** the stack starts
**Then** the app connects to the external endpoint, including any TLS options it requires

**Given** the cache endpoint is left blank
**When** the app starts
**Then** it falls back to an in-process cache rather than failing startup

**Given** the connection template
**When** it is expanded
**Then** a test validates the expansion, so dropping a variable is a failing test rather than a runtime surprise

- **Fulfils:** no FR
- **Absorbs:** `10-2-redis-connection-string-in-env`, `10-3-postgres-host-in-env`
- **Status:** delivered (tracked: review)

### Story 6.3: Run the whole stack in containers

As an operator,
I want the app deployable as containers behind a single origin,
So that it can be shipped and run reproducibly.

**Acceptance Criteria:**

**Given** the stack
**When** it is brought up
**Then** one host-facing service serves the built frontend and reverse-proxies the API, so the browser sees a single origin

**Given** a fresh database volume
**When** the API starts
**Then** pending migrations are applied before requests are served, with bounded retries and a clear failure message

**Given** the API is still starting
**When** the edge service is checked
**Then** it waits for the API to report healthy before accepting traffic

**Given** secrets and configuration
**When** the containers run
**Then** they are injected at runtime and never baked into an image

- **Fulfils:** no FR
- **Absorbs:** `9-1-dockerize-for-production`
- **Status:** delivered (tracked: done)

### Story 6.4: Keep the backend conformant to Clean Architecture

As a backend developer,
I want the layer boundaries and dead-code rules enforced by the build,
So that conformance does not depend on review vigilance.

**Acceptance Criteria:**

**Given** the project graph
**When** it compiles
**Then** the inner layers cannot reference the outer ones, enforced structurally rather than by convention

**Given** each layer
**When** it registers its services
**Then** it owns its own composition root, and a missing registration is a failing test rather than a first-request resolution error

**Given** unused usings and unread private members
**When** the solution builds
**Then** they are warnings, and the build's warning bar is zero

**Given** an analyzer configuration
**When** it is added
**Then** it is verified to actually fire, since a silently non-firing analyzer looks exactly like a clean tree

- **Fulfils:** no FR
- **Absorbs:** `6-9-backend-clean-architecture-audit`, `6-10-backend-clean-architecture-remediation`
- **Status:** delivered (tracked: review)

### Story 6.5: Make wire-projection mapping fail at compile time

As a backend developer,
I want mapping errors to be build errors,
So that a renamed member cannot become a runtime mapping exception.

**Acceptance Criteria:**

**Given** the mapping implementation
**When** the solution builds
**Then** mappings are generated at compile time with no runtime configuration graph

**Given** a source member with no destination counterpart
**When** it is intentional
**Then** it is silenced individually and explicitly, never by a blanket suppression

**Given** the mapping port
**When** the engine behind it is swapped
**Then** no code above the infrastructure layer changes

- **Fulfils:** no FR
- **Absorbs:** `6-12-replace-automapper-with-mapperly`
- **Status:** delivered (tracked: review)

### Story 6.6: Flatten the destination model to a single entity

As a backend developer,
I want one destination entity carrying the provider's category verbatim,
So that no destination type silently loses data at import.

**Acceptance Criteria:**

**Given** an imported destination of any type
**When** it is persisted
**Then** its opening hours are retained, not discarded for some types

**Given** the provider's category vocabulary
**When** it is stored
**Then** it is stored verbatim and is not narrowed to a closed set

**Given** the migration off the previous subclass schema
**When** it runs
**Then** existing rows are backfilled before the old discriminator is dropped, in that order

- **Fulfils:** no FR; corrects a defect affecting FR10
- **Absorbs:** `6-11-flatten-destination-hierarchy`
- **Status:** **delivered — the tracked status is stale.** `sprint-status.yaml` says `ready-for-dev`, but `BE/TripPlanner.Domain/Models/` holds only `Destination.cs` (no `Landmark.cs`, no `Restaurant.cs`) and `Destination` carries `Category` plus `OpeningHours` on the base type. Verified against source 2026-07-29. Fix the tracker, not the code.

### Story 6.7: Verify the delivered backend against the requirements sheet

As the product owner,
I want the delivered backend audited against the sheet and reviewed for defects,
So that I know what is actually met.

**Acceptance Criteria:**

**Given** the sheet's requirements for the delivered features
**When** the audit runs
**Then** each receives an explicit verdict with evidence, pinned to a commit

**Given** a review finding
**When** it is recorded
**Then** it is resolved, deferred with a named owner, or dismissed with a reason — never left ambiguous

- **Fulfils:** no FR — quality gate over Epics 1–4
- **Absorbs:** `6-1-backend-requirements-verification`, `6-2-backend-code-review-epics-1-4`
- **Status:** delivered (tracked: review)

### Story 6.8: Handle provider datasets at scale

As an operator,
I want the system to cope with very large external destination datasets,
So that growth in provider data does not degrade it.

**Acceptance Criteria:**

**Given** the system's handling of external destination records
**When** volume grows to the order the sheet names
**Then** behaviour and response times remain within their budgets

**Given** the claim of scalability
**When** it is asserted
**Then** there is evidence for it

- **Fulfils:** NFR5
- **Absorbs:** nothing — **third genuine gap.** No story has ever addressed NFR5. It is also the least well-specified requirement in the sheet: "millions of destination records" with no throughput, latency or storage figure attached, and the current design deliberately does not persist provider data at all, so it is unclear what would be measured.
- **Status:** backlog — needs specification before it can be implemented

## Dependency Notes and Known Deviations

Recorded during Step 4 validation. None of these blocks the document being used; all of them would bite someone who assumed the epic order was also an implementation order.

**1. Epic 3 depends on Epic 4, which is numbered after it.** Trip Planner is meaningless without an identity: Story 3.1 opens with "Given I am logged in", Story 3.8 *is* the login prompt, and Story 3.10 scopes trips to an authenticated user. The epic numbering comes from `requirement/Sheet1.html`'s own feature order and was kept deliberately, so **implementation order is not epic order** — Epic 4 must precede Epic 3. This is invisible in the delivered product because auth was built before the planner in reality.

**2. Story 2.2 reaches into Epic 3.** FR7's sixth acceptance criterion asks only that the details view *identify* an option to add the destination to a trip, and that it be unavailable when logged out — that part is self-contained. But Story 2.2's third criterion (the destination is imported and persisted on first add) cannot be satisfied without a trip to add it to, which is Story 3.3. Two readings, both defensible: leave it here because the provider-to-domain import is genuinely details-side work, or move that criterion to Story 3.3 and let 2.2 own only the affordance. **Left as-is and flagged rather than decided** — it changes the scope of two stories in two epics, which is the owner's call, not a validation fix.

**3. Story 4.2 does not depend on Story 4.3.** Worth stating because the titles invite the opposite reading. Story 4.2 ships email verification together with a working transport (it absorbs the original Resend integration); Story 4.3 then generalizes that transport into a swappable provider. Verification works after 4.2 alone.

**4. The scaffold story is 5.1, not Epic 1 Story 1.** This workflow expects a starter-template setup as the first story of the first epic. Here it is the first story of the frontend-shell epic, because the scaffold exists already and because the backend — which needs no scaffold story at all — is where Epics 1–4 begin. A greenfield rebuild from this document would have to run Story 5.1 first.

**5. Epics 5 and 6 own no FR, by design and with the owner's approval.** They fail this workflow's "epics deliver user value, not technical milestones" test on purpose. The alternative was distributing shell and platform work across the four feature epics, which is what produced the backlog this pass exists to clean up.

**6. Stories 5.4 and 5.5 modify files owned by Epics 1–4.** The module restructure and the service-layer extraction touched essentially every feature file. That is real cross-epic file churn, and consolidation was considered and rejected: both are cross-cutting refactors that can only run *after* the features exist, so folding them into a feature epic would make that epic depend on all the others. They are sequenced last within Epic 5 for the same reason.

## Appendix: Story ID Mapping (old → new)

Every one of the 55 tracked stories in `sprint-status.yaml`, mapped to its new identifier. Where an old artifact is split, both targets are listed — those rows are the ones that made the old backlog hard to read.

**Where the files are:** the old artifacts in the left column now live in `_bmad-output/implementation-artifacts/archive/`; the new stories in the right column are files in `_bmad-output/implementation-artifacts/stories/`, named with **dot-separated** IDs. That distinction is load-bearing — nineteen of the twenty shared numbers mean different work in the two folders (old `6-5` is opening hours, new `6.5` is Mapperly). See `_bmad-output/implementation-artifacts/README.md`.

| Old ID | New ID | Epic |
| --- | --- | --- |
| `1-4-filter-and-sort-attractions` | 1.5 + 1.6 | 1 |
| `1-5-attraction-list-pagination` | 1.7 | 1 |
| `1-6-location-relevance-ordering` | 1.1 | 1 |
| `3-4-schedule-destinations-into-day` | 3.5 | 3 |
| `3-5-reorder-destinations-within-day` | 3.6 | 3 |
| `3-6-move-destination-between-days` | 3.7 | 3 |
| `4-5-unverified-login-message` | 4.4 | 4 |
| `5-1-frontend-scaffold-and-api-client` | 5.1 | 5 |
| `5-2-authentication-ui` | 3.8 + 4.1 + 4.4 + 4.5 | 3, 4 |
| `5-3-destination-discovery` | 1.2 + 1.3 | 1 |
| `5-4-destination-details` | 2.1 | 2 |
| `5-5-trip-planner-ui` | 3.1 + 3.2 + 3.3 + 3.4 + 3.9 | 3 |
| `5-6-ui-modernization-cute-light-blue` | 5.2 | 5 |
| `5-7-search-auto-suggest` | 1.4 | 1 |
| `5-8-trips-nav-and-auth-race-fix` | 4.5 | 4 |
| `5-9-destination-autosuggest-prefix-match` | 1.4 | 1 |
| `5-10-ui-motion-and-depth-polish` | 5.3 | 5 |
| `5-11-trip-destination-detail-link` | 2.6 | 2 |
| `5-12-frontend-redesign-horizon-design-system` | 5.2 | 5 |
| `5-13-horizon-auth-redesign` | 4.6 | 4 |
| `5-14-horizon-home-redesign` | 1.8 | 1 |
| `5-15-azure-attraction-detail-redesign` | 2.5 + 2.6 | 2 |
| `5-16-horizon-trips-boarding-pass-redesign` | 3.9 | 3 |
| `5-17-frontend-feature-based-restructure` | 5.4 | 5 |
| `5-18-verify-email-page-rebuild` | 4.2 | 4 |
| `5-19-landing-page-framed-editorial` | 1.8 | 1 |
| `5-20-popular-search-tile-images` | 1.8 | 1 |
| `5-21-create-trip-dialog` | 3.1 | 3 |
| `5-22-frontend-structure-audit-and-component-split` | 5.4 | 5 |
| `5-23-frontend-model-and-service-layer` | 5.5 | 5 |
| `6-1-backend-requirements-verification` | 6.7 | 6 |
| `6-2-backend-code-review-epics-1-4` | 6.7 | 6 |
| `6-3-fix-xid-import-destination-mapping` | 2.2 | 2 |
| `6-4-attraction-detail-caching` | 2.7 | 2 |
| `6-5-destination-opening-hours-source` | 2.4 | 2 |
| `6-6-feature-2-requirements-verification` | 2.8 | 2 |
| `6-7-opening-hours-not-available-copy` | 2.4 | 2 |
| `6-8-destination-details-latency-nfr3` | 2.7 | 2 |
| `6-9-backend-clean-architecture-audit` | 6.4 | 6 |
| `6-10-backend-clean-architecture-remediation` | 6.4 | 6 |
| `6-11-flatten-destination-hierarchy` | 6.6 | 6 |
| `6-12-replace-automapper-with-mapperly` | 6.5 | 6 |
| `7-1-resend-email-integration` | 4.2 | 4 |
| `7-2-email-provider-strategy-pattern` | 4.3 | 4 |
| `7-3-google-smtp-email-provider` | 4.3 | 4 |
| `7-4-html-verification-email-and-provider-strategy` | 4.3 | 4 |
| `8-1-destination-image-wikipedia-fallback` | 2.3 | 2 |
| `8-2-wikipedia-primary-image-provider` | 2.3 | 2 |
| `8-3-fix-missing-destination-images` | 2.3 | 2 |
| `8-4-image-loading-state` | 2.3 | 2 |
| `8-5-destination-details-multiple-images` | 2.3 | 2 |
| `9-1-dockerize-for-production` | 6.3 | 6 |
| `10-1-redis-response-caching` | 6.1 | 6 |
| `10-2-redis-connection-string-in-env` | 6.2 | 6 |
| `10-3-postgres-host-in-env` | 6.2 | 6 |

**New stories with no predecessor** — these are the gaps this restructure exposed: **1.9** (NFR1/NFR2 performance budgets), **3.10** (NFR6 trip ownership, delivered before tracking existed so no artifact was ever written), **3.11** (FR19 saving indicator and retry, only half delivered), **6.8** (NFR5 data scalability, never addressed and under-specified in the sheet).
