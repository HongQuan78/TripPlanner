---
name: Trip Planner — Horizon
status: final
updated: 2026-07-25
sources:
  - imports/sign-in-horizon-travel.html
  - .memlog.md
---

# Trip Planner Auth + Landing — Experience Spine

> Scope: the three authentication surfaces — Login, Register (including the registration-received success state), and Verify Email (verifying / verified / failed / resend states) — plus the landing/home surface (`/` → SearchPage): the framed editorial hero band, one inline search bar with its suggestion dropdown, the pre-search landing content (recent searches, destination tile rail, how-it-works band), and the attraction card grid. Paired with `DESIGN.md` (Horizon), which owns every visual token referenced here by `{path.to.token}`.

## Foundation

Responsive web, desktop-first. The auth surfaces use a **split layout**: a full-height hero panel (local travel photograph with gradient overlay and welcome copy, `{components.hero-panel}`) on the left and a single white auth card (`{components.auth-card}`) centered on the right. Below `md` the hero is fully hidden — never stacked above the form — and the card becomes a single centered column, following the reference mock's `hidden md:flex` treatment.

The landing surface is the opposite tenancy: it renders **inside** `AppLayout` (sticky header, nav, route transition), and its brand moment is a **hero band** (`{components.hero-band}`) at the top of the content column holding the headline, tagline, and the search bar — the auth hero language rotated horizontal, with the same bottom-left copy inset, and given the page's one task to hold. The band persists on every viewport. The committed composition is **Framed Editorial**: the band stays clipped inside AppLayout's frame rather than bleeding to the viewport, and the landing continues below it as editorial content (tile rail, how-it-works) before any search has run.

The search mechanism is deliberately the simplest thing that works: **one inline bar, one dropdown beneath it.** Typing shows suggestions; choosing one closes the dropdown and loads that city's attractions. There is no modal, no trigger-and-panel indirection, and no summary row restating the choice — the bar's own value and the "Attractions near {name}" heading already carry it, and changing destination means typing in the bar, which never leaves the page. Horizon's no-modals posture therefore holds across the whole product, auth and landing alike.

→ Reference: `imports/sign-in-horizon-travel.html` (Horizon Travel sign-in mock). **The spines win on conflict** with the mock or any other visual artifact.

→ Directions: `mockups/directions-landing.html` records the three landing compositions considered (Full-Bleed Immersion, Framed Editorial, Split Arrival). Framed Editorial is committed; the other two are rationale, not options. Note that the "settled mechanics" panel in that file depicts a discarded intermediate design (a modal overlay and a chosen-destination bar) — the spines, not that panel, are authoritative.

→ Mockups (spine-derived, one per surface, each with its load-bearing alternate states): `mockups/key-login.html` (rest / form error / pending button), `mockups/key-register.html` (rest / registration received), `mockups/key-verify-email.html` (failed + resend / verified climax), `mockups/key-home-presearch.html` (first visit: hero band with the search bar, recent-searches row, destination tile rail, how-it-works band), `mockups/key-home-suggestions.html` (the dropdown open beneath the bar, with a keyboard-active option, plus the under-2-characters and no-matches states), `mockups/key-home-results.html` (a chosen city: section heading, then four attraction-card variants — rated with distance, heritage, unrated without badge, missing-image placeholder with badge). Every IA surface is mocked; the hero photograph is the committed `{gradients.hero-stand-in}` recipe until a real asset lands in `FE/src/assets`. The landing's loading, error, empty, and country-notice states ship today unchanged and stay spine-only — preservation contracts, not new builds.

UI system: hand-rolled CSS Modules over the Horizon token layer in `FE/src/index.css`. No component library. `DESIGN.md` is the visual identity reference; this spine is the experience contract. Input icons (mail, lock, visibility) ship as inline SVG rather than the reference mock's Material Symbols webfont — the codebase has no icon dependency and a webfont adds a render-blocking request for three glyphs; the exact SVG source is an implementation-story choice. Light theme only: the mock's `darkMode: "class"` hook is not adopted — the app has no dark mode and this run does not introduce one.

Auth routes render **without** the app header and nav. The reference mock explicitly suppresses top nav and footer on transactional screens; today `/login`, `/register`, and `/verify-email` render inside `AppLayout` (sticky header + nav), so this spine implies a routing change — auth routes move outside `AppLayout` (or `AppLayout` suppresses its chrome on them), with the card's brand wordmark serving as the way back: the "Trip Planner" wordmark (two words — the user-facing brand spelling) links to `/`.

Hard constraint carried from the backend, non-negotiable for all copy in this document: **no single UI interaction may reveal whether an email address has an account.** Register success copy is identical for fresh and duplicate emails; resend-verification returns the same generic success during its 60-second cooldown; a login failure on a wrong password or an unknown email shows the generic `Invalid email or password.` **Narrowed 2026-07-26 (story `4-5-unverified-login-message`):** the *unverified* state may be disclosed, but only **after** a correct password — a login with valid credentials on an unverified account shows `Your email address is not verified. Please check your inbox.` It must never appear for a wrong password. Be precise about what this does and does not buy: no single response discloses account existence, but a register-then-login *pair* with a caller-chosen password does (a free address ends up showing the not-verified copy, a taken one the generic copy). That was reviewed on 2026-07-26 and **accepted** as inseparable from disclosing the unverified state at all — so copy in this document may rely on the distinct message, and must not be "hardened" back to one voice on the assumption that it closes enumeration.

Hard constraint on the landing surface, equally non-negotiable: **there is no popular-destinations API.** Every affordance on the pre-search page — destination tiles included — can only pre-fill and submit the existing text-search flow (`GET` location search by name). Nothing on the page may imply curated, personalized, or trending content the backend cannot serve. The destination tile rail is a hand-picked frontend constant labelled "Popular searches"; **"Recent searches" is the one personal row on the page and it is genuinely honest** — it is the visitor's own history, held client-side alongside the existing search-state store, with no server involvement and no cross-device promise. The attraction payload is exactly `xid`, `name`, `kinds`, `rating` (1–3, optional trailing `h` for heritage), `imageUrl`, and `distanceMeters` — the card may surface all of these and nothing else.

Hard constraint on the how-it-works band: **every claim it makes must be shipped behavior.** Its three beats — search a city, see what's there, build the days — are each verifiable today: text location search; attractions carrying rating, heritage flag, and `distanceMeters`; and day-by-day itineraries with drag-to-move between days, shipped under story 3-6 (`move-destination-between-days`) and covered by `FE/src/features/trips/TripPlannerPage.dnd.test.tsx`. The third beat is cited because it is the one a future editor would most likely soften as unverified. A fourth beat may not be added for rhythm.

## Information Architecture

| Surface | Route | Reached from | Purpose |
|---|---|---|---|
| Landing / Home | `/` | App open, header wordmark, auth-card wordmark | Present the product; hold one question; offer honest ways to answer it |
| Suggestion dropdown | `/` (anchored panel, not a route or a modal) | Typing 2+ characters in the search bar, or submitting a query | Browse candidate matches and choose one |
| Attractions grid | `/` (in-place state) | Choosing a City | Browse attraction cards; exit to `/attractions/:xid` detail or add to a trip |
| Login | `/login` | Header "Login" link, `RequireAuth` redirect (with `returnTo`), Register/Verify cross-links | Authenticate and continue to `/trips` or `returnTo` |
| Register | `/register` | Header "Register" link, Login cross-link | Create an account; hand off to email verification |
| Registration received | `/register` (in-place state) | Successful register submit | Confirm the request generically; route to inbox-checking behavior |
| Verify Email | `/verify-email?token=…` | Link in the verification email | Consume the token; celebrate or recover |
| Verify Email (resend) | `/verify-email` (no/failed token) | Direct visit, failed verification | Request a fresh verification link |

Each auth surface is linear and terminal — no nested navigation, no modals, no steps. Cross-links between Login and Register live in the card footer only. The hero panel is identical in structure across all three surfaces, with per-surface welcome copy (see Voice and Tone). Verify Email reuses the same split hero layout as Login and Register rather than a simpler centered card — one auth shell, three tenants — so the verification climax inherits the brand moment and the implementation stays a single layout component.

The landing surface is a single accumulating page, not a funnel: search state persists across route changes, so a user who opens an attraction detail and returns finds the page exactly as they left it (the restore contract is specified in Interaction Primitives). An attraction card offers exactly two exits: the card itself links to the attraction detail route, and the add-to-trip row hands off to the existing add-to-trip flow (which itself routes unauthenticated users toward login).

The page has exactly **two mutually exclusive body states** below the hero band, and this exclusivity is the structural answer to the reported complaint:

| | Below the band |
|---|---|
| **Pre-search** | Recent searches (when any exist) → destination tile rail → how-it-works band |
| **City chosen** | Attractions section — the "Attractions near {name}" heading and the grid, nothing above it |

There is no third state in which both editorial content and search results coexist, and — critically — **no state in which a list of candidate matches is rendered in the page body**. Candidates live in the dropdown and nowhere else. The dropdown is an anchored panel floating over either body state; it never leaves residue behind when it closes, and it never pushes the body content around.

Note what is *not* here: no row restating the chosen city. The search bar holds its name and the section heading names it again — a third surface would be the second redundancy on a page whose whole complaint was redundant leftovers.

## Voice and Tone

Microcopy only; aesthetic posture lives in `DESIGN.md`. Horizon speaks like a well-run boutique hotel front desk: warm, brief, never chirpy, never blaming.

| Do | Don't |
|---|---|
| "Welcome back." | "Hello again, traveler! 👋" |
| "Please enter your details to continue." | "Enter your credentials below to access your account." |
| "Invalid email or password." for a wrong password or unknown email; "Your email address is not verified. Please check your inbox." once the password is correct | Showing the not-verified copy for a *wrong* password |
| "If that email is new to us, a verification link is on its way. Check your inbox." | "Account created!" / "That email is already registered." — never confirm or deny an account's existence |
| "Your email is verified. Welcome aboard." | "Verification successful ✓" |
| "That link didn't work. It may have expired — we can send you a new one." | "Error: invalid token" |
| "Signing in…" / "Creating your account…" / "Sending…" | Spinners with no words, or "Please wait…" |
| "Where to next?" | "Discover amazing destinations! 🌍" |
| "No attractions in this area yet — try another city." | "0 results found." |
| "Popular searches" over the destination tile rail — an honest label for a static list | "Trending now" / "Recommended for you" — implies backend intelligence that does not exist |
| "Recent searches" over the visitor's own client-side history | "Your destinations" / "Picking up where you left off" — implies an account-bound record |
| Let the headline ask the question and the bar stay wordless | "Where do you want to go? ✈️" inside the field — the headline already asked |

Hero welcome copy, per surface:

- **Login** — headline "Welcome Back." with supporting line "Your next extraordinary journey begins right where you left off." (verbatim from the reference mock).
- **Register** — headline "Begin Somewhere New." with supporting line "One account, every itinerary — plan the trips you've been putting off."
- **Verify Email** — headline "Almost There." with supporting line "One click stands between you and your first itinerary."
- **Home** — headline "Where to next?" with tagline "Search any city and start building the trip." The existing headline is kept — it already carries the Horizon register — and only the tagline is rewritten, replacing the current instructional "Search for a city or country to discover attractions." with a line that names the product's promise.

Field labels are nouns, not questions: "Email Address", "Password". Buttons are verbs: "Sign In", "Create Account", "Resend Verification Email", "Search". Error text states what happened and, where recovery exists, what to do next — one sentence each.

Card subtitle on Login and Register: "Please enter your details to continue." Cross-link footers, verbatim: Login — "Don't have an account? Sign Up"; Register — "Already have an account? Sign In"; registration received — "Already verified? Log in."; verified — "You can now log in."

Landing state copy, preserved verbatim from the shipped implementation unless noted: "Searching…", "No matching places found.", "{name} is a country — search for a specific city to see attractions.", "Attractions near {name}", "No attractions in this area yet — try another city.", "Service unavailable — please try again." with the "Try again" retry action, and the visually hidden "Loading attractions…".

Net-new landing copy, committed:

- Search bar accessible name: **"Search"** (the shipped `aria-label`, kept). Its inline clear is named **"Clear search"**, its submit **"Search"**. No placeholder text.
- Section labels: **"Recent searches"**, **"Popular searches"**. The recents label row carries a **"Clear"** action; its accessible name is "Clear recent searches".
- How-it-works band, three beats, headings and one supporting sentence each:
  1. **"Search a city"** — "Anywhere in the world, by name."
  2. **"See what's there"** — "Attractions with ratings, heritage marks, and distance from the centre."
  3. **"Build the days"** — "Drop places into a day-by-day itinerary and move them as plans change."

  The band carries no heading of its own and no call to action; the hero already asked the question, and a second CTA would compete with the trigger.

## Component Patterns

Behavioral only. Visual specs live in `DESIGN.md.Components`.

| Component | Use | Behavioral rules |
|---|---|---|
| Auth card | All three auth surfaces | One card per screen, one primary action per card. Never scrolls internally. Brand wordmark at top links to `/`. |
| Hero panel | Auth surfaces, `md+` | Purely presentational — no interactive elements. The welcome-copy container carries `aria-hidden="true"` (rationale in Accessibility Floor), and the headline is a non-heading element — never an `<h2>` competing with the card's `<h1>`. Photo ships as a local asset in `FE/src/assets` with a `{colors.surface-container}` fallback fill while loading. |
| Hero band | Landing, all viewports | Presentational photograph plus the page's real `<h1>`, tagline, and the search bar — unlike the auth hero, its text is the page content and is fully exposed to assistive tech. Same local-asset and fallback-fill rules as the hero panel. Contains no results. |
| Hero search bar | Landing | **The whole search mechanism: one `<form role="search">` holding one input.** Keeping it a form preserves the search landmark the shipped page already provides, so the landing page still answers landmark navigation. Enter chooses the keyboard-active suggestion when there is one and submits the trimmed value otherwise — the shipped precedence, preserved. Submitting opens the dropdown on the query's matches rather than filling a list in the page body. The inline clear empties the field, closes the dropdown, and resets the chosen city; it renders only when the field has a value, and its hit area reaches 44px whatever its glyph size. The submit button stays disabled while the field is empty (see Interaction Primitives). The bar holds the chosen city's name after a choice and is the only way to change it. |
| Suggestion dropdown | Landing (anchored panel) | The shipped inline dropdown, kept — **not** a modal: no scrim, no focus trap, no scroll lock, and the page behind stays live. Anchored beneath the bar and absolutely positioned, so the tile rail never reflows while the user types. The typeahead contract is preserved wholesale: 300ms debounce, minimum 2 characters, at most 5 suggestions. It is the **only** place candidate matches ever render, and it is closed unless the user is actively searching — see the dismissal contract in Interaction Primitives, which is the fix for the reported defect. |
| Suggestion option | Suggestion dropdown | The shipped ARIA listbox contract, preserved exactly: the input has `aria-autocomplete="list"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`; the list is `role="listbox"` with `role="option"` rows, the active one `aria-selected`. ArrowDown/ArrowUp cycle with wraparound; Enter chooses; Escape dismisses; options are chosen on mousedown so the input never loses focus first. Keyboard-active position is signalled by the `{colors.primary}` inset ring, distinct from pointer hover's fill, so arrows and mouse never contradict each other. Each row shows name, country code, and location type. A partial-match row is **not** badged — everything in this list is a candidate by definition, so the badge carried no information; ordering already puts exact matches first. |
| Destination tile | Landing, pre-search only | A static, hand-curated set of six well-known city names shipped as a frontend constant — honest "Popular searches", not a feed — because no popular-destinations API exists. Activating a tile chooses that city and loads its attractions in one gesture, without ever opening the dropdown. Tiles are real buttons in a horizontal scroll rail; the rail is keyboard-scrollable and every tile is reachable by Tab. They disappear once a city is chosen and return only when the page is cleared. |
| Recent-search chip | Landing, pre-search only | The visitor's own recently chosen cities, held client-side beside the existing search-state store, most recent first, capped at a small number. Activating one chooses that city and loads its attractions, exactly like a tile. The row renders only when history exists — on a first visit there is no empty "Recent searches" heading, the section is simply absent and the tile rail is the first thing under the band. Clearing the page does not clear history; history is not a search state. The label row carries a quiet **"Clear"** action that erases the history: the row displays where someone has been looking, and on a shared machine there must be a way to remove it. |
| How-it-works band | Landing, pre-search only | Three ordered steps as a list, no interactive elements, no call to action. Ordinals are `aria-hidden` decoration — the list's DOM order carries sequence. Every claim must be shipped behavior (see Foundation). Disappears with the rest of the pre-search body once a city is chosen. |
| Attraction card | Attractions grid | The whole card body is a single link to the attraction detail; the add-to-trip row is the only other interactive element — no nested targets. Image behavior preserved: `imageUrl` renders with alt text = attraction name, shimmer while loading, placeholder panel on null or load error. Rating badge floats on the image when a 1–3 rating exists; heritage chip floats when the rating carries the `h` flag. Unrated attractions render no badge and drop the current "Not rated" text — in a photographic grid, absence reads cleaner than a disclaimer. When `distanceMeters` is non-null the body shows a distance line — "650 m from center" below 1 km, "2.3 km from center" at or above it, one decimal — surfacing the payload field the current card ignores; null renders nothing. At most 3 kind tags, underscores humanized, as today. Entrance stagger and hover lift ship already and are kept. |
| Rating badge | Attraction card image | Presentational within the card link; rendered over image and placeholder alike; carries the accessible rating text ("Rated 2 of 3", the existing StarRating label) so the rating is announced exactly once per card. |
| Heritage chip | Attraction card image | Presentational within the card link; its visible label is the single lowercase word "heritage" — the shipped copy, kept. The word is exposed once as part of the card link's text, the same single-announcement rule as the rating badge; no duplicate `aria-label`. |
| Add-to-trip row | Attraction card | Full-width row, one per card, `aria-label` "Add {name} to a trip" preserved. Activating it hands off to the existing add-to-trip flow; it never navigates to the detail route. |
| Text input | Email fields | Leading mail icon. `autocomplete` preserved from current pages (`email`). Validation runs on submit, not on blur or keystroke; a field error clears when the user next edits the field. No placeholder text — the label and icon identify the field (the mock's placeholder convention is dropped; see DESIGN.md Colors for the contrast rationale). |
| Password input | Login, Register | Leading lock icon, trailing visibility toggle (per the reference mock). Toggle flips input type, never clears the value, and updates its accessible name ("Show password" / "Hide password") — the changing name is the sole state signal; no `aria-pressed`, which would double-signal against the name swap. `autocomplete` stays `current-password` (login) / `new-password` (register). |
| Password helper | Register only | A persistent `{typography.label-sm}`-scale helper line "At least 8 characters." under the password field, shown before any error — turning the current reactive-only validation into an upfront rule. Replaced by the error text when validation fails. |
| Primary button | Every auth form | Full width. While pending, the button keeps its primary visual style, guards against re-submits via `aria-disabled` plus a submit guard (never the `disabled` attribute, which would gray-wash the status-carrying label), and swaps its label to the pending phrase ("Signing in…"), announced by a visually hidden `role="status"` region. Never disabled merely because fields are empty — a submit attempt triggers validation (Register) or goes to the API (Login). |
| Error banner | Auth form-level failures | Appears between fields and button. One at a time; replaced, not stacked. Announced via `role="alert"`. |
| Success banner | Registration received, verified, resend sent | Replaces the form (register, resend) or the status line (verify). Terminal on its surface — paired with a cross-link, never with a re-submittable form. |
| Cross-link footer | Auth card bottom | Exactly one sentence with one link: Login ↔ Register, or verified → Login. |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| Idle | Login, Register | Card with form, hero with welcome copy. No skeletons — these surfaces have no data to load. |
| Pending submit | Any auth form | The Primary button pattern's pending behavior, exactly as specified in Component Patterns: primary style kept, label swapped to the pending phrase, re-submits ignored until resolution. |
| Field invalid | Register (client-side) | `{colors.error}` text under the field: "Enter a valid email address." / "Password must be at least 8 characters." Both can show at once. Focus moves to the first invalid field. |
| No client validation | Login | Login performs no client-side field validation: any submit — empty fields included — goes to the API, and every failure lands in the form-level error banner with the backend's message verbatim. Login carries **two** backend voices as of 2026-07-26 (generic invalid-credentials, plus the not-verified copy once the password is correct — see the narrowed constraint above); Register keeps client validation because its rules (email shape, password length) reveal nothing about accounts. |
| Form error | Login, Register, Resend | `{components.banner-error}` with the `ApiError` message verbatim, or "Something went wrong. Please try again." for unknown failures. Password value is preserved on login failure. |
| Registration received | Register | Form is replaced by `{components.banner-success}` under the title "Check your inbox." Body: the backend's generic message. Footer: "Already verified? Log in." No resend affordance here — resend lives on `/verify-email`. |
| Verifying | Verify Email (token present) | Status line "Verifying your email…" in `{colors.on-surface-variant}`. Fires exactly once per token (guard against double-effects). No form visible. |
| Verified | Verify Email | `{components.banner-success}` with the backend message, footer link "You can now log in." — the climax state; see Flow 3. |
| Failed verification | Verify Email | `{components.banner-error}` with the failure message, followed immediately by the resend form — recovery on the same screen, no navigation required. |
| Resend requested | Verify Email | `{components.banner-success}` with the backend's generic message replaces the resend form. Identical whether the backend actually sent an email or silently absorbed the request inside the 60-second cooldown — the UI cannot and must not know the difference. After a success, the resend form does not return on this page visit; a user who mistyped their email refreshes or revisits. No client-side countdown timer is shown, since displaying one would imply knowledge of server state the anti-enumeration contract forbids. |
| No token, direct visit | Verify Email | Resend form shown by default with the hint "Enter your email address and we will send a new verification link." |
| Pre-search (first visit) | Landing | The hero band with headline, tagline, and search bar; then the destination tile rail under a quiet "Popular searches" label; then the how-it-works band. No "Recent searches" section — it is absent, not empty. The page is never blank before the first search, and nothing on it implies data the backend cannot serve. Restored sessions skip this state entirely: persisted search state re-renders the chosen city as left. |
| Pre-search (returning visitor) | Landing | Identical, plus a "Recent searches" chip row **above** the tile rail — the visitor's own history takes precedence over curation, because it is the more likely answer to "where to next?". |
| Dropdown closed | Landing | The default, and the state the page returns to the moment the user stops actively searching. No candidate list exists anywhere in the DOM. |
| Dropdown open, under 2 characters | Landing | The dropdown does not open. Below the typeahead's minimum there is nothing honest to show, and an empty panel would flash on every first keystroke. |
| Dropdown open, suggestions in flight | Landing | The previous option list stays rendered while the next query resolves — no flash to empty between debounced queries. |
| Dropdown open, no matches | Landing | A single quiet line inside the dropdown: "No matching places found." The field keeps its value; Escape, an edit, or clicking away is the recovery. Nothing is written into the page body. |
| City chosen | Landing | Pre-search body replaced entirely by the attractions section. The bar holds the city's name; the dropdown is closed and holds no residue; nothing sits between the band and the "Attractions near {name}" heading. |
| Searching | Landing | "Searching…" line in `{colors.on-surface-variant}` below the band while the location query is in flight — the existing treatment, kept. |
| Search error | Landing | The shared state pattern (emoji, `{colors.on-surface-variant}` text, primary "Try again" retry button). Message is the `ApiError` text, or "Service unavailable — please try again." for 503/network — existing contract, kept. |
| ~~No matches (page level)~~ | — | **Deleted.** Pass 2 carried a page-level "No matching places found." state fed by the result list. Candidate matching now happens only in the dropdown, and a fruitless submit leaves the dropdown open showing the message, so nothing is ever written into the page body. The copy survives only as the dropdown's own no-matches line. |
| Country chosen | Landing | State pattern notice: "{name} is a country — search for a specific city to see attractions." No attractions load — existing contract, kept. The bar still holds the country's name and is the recovery: the user edits it. |
| Attractions loading | Landing (City committed) | The "Attractions near {name}" heading with 4 `aria-hidden` skeleton cards in the grid and the visually hidden "Loading attractions…" for assistive tech — existing contract, kept; skeleton geometry follows the richer card so the swap does not jump. |
| Attractions error | Landing | Same state pattern as search error, with its own retry scoped to the attractions query — existing contract, kept. |
| Attractions empty | Landing | State pattern: "No attractions in this area yet — try another city." |
| Populated grid | Landing | Attraction cards enter with the existing 40ms stagger. Committing a different city replaces the grid; clearing returns the page to pre-search, tile rail and how-it-works band included. |

## Interaction Primitives

- **Enter submits.** Every form submits on Enter from any field; the primary button is `type="submit"`. On the landing surface Enter chooses the keyboard-active suggestion when the dropdown has one and submits the search otherwise — the existing precedence, preserved.
- **Submitting opens the dropdown; it never fills the page.** A typed submit runs the text location search and shows its matches as dropdown options. Nothing is rendered into the page body, so the old multi-row result list has no successor and no reason to return.
- **Choosing is one gesture.** Choosing a dropdown suggestion, a destination tile, or a recent-search chip each does the whole job at once: sets the city, closes the dropdown, loads the attractions, and replaces the pre-search body with the attractions section. There is no intermediate state where the user has chosen something and must then confirm it.
- **A choice carries the resolved location, never a query string.** A dropdown option, a recent chip, and a tile all resolve to a `LocationSearchResult` — name, country code, type, latitude, longitude. Choosing uses that object directly and issues **no second location-search request**. Re-searching by name after the user has already picked would be a wasted round-trip that can return a *different* top result than the one they chose — silently rebuilding the exact class of bug this pass exists to kill. Text location search runs in one situation only: a typed submit, where no resolved object exists yet.
- **Dismissal is unconditional and complete, and this is the fix for the reported defect.** The dropdown closes on Escape, on choosing a suggestion, on the input losing focus, and on any click outside the bar and panel — the last two being the handlers that **do not exist today at all**. Closing unmounts the option list rather than hiding it behind a suppression flag: no query-scoped "dismissed" or "suppressed" bookkeeping decides visibility. Visibility follows from one question only — is the user actively searching in this bar right now?
- **Changing city means typing in the bar.** There is no separate affordance for it. The bar holds the current city's name; focusing it selects that text so typing replaces rather than appends, and the dropdown reopens on the new query.
- **Clearing resets the page, not the history.** The inline clear empties the field, closes the dropdown, drops the chosen city, and returns the body to pre-search — tile rail and how-it-works included. Recent searches survive; a cleared search is not a forgotten one.
- **Click/tap to act.** No hover-only affordances; the password toggle is a real button, reachable by keyboard and tap; suggestion chips and the add-to-trip row are real buttons.
- **One pending operation per surface.** Submission disables the primary action until resolution; no optimistic transitions — navigation happens only after the API confirms.
- **`returnTo` is honored.** Login redirected from a protected route returns the user to where they were headed; only same-origin paths (leading `/`) are accepted.
- **Search state survives navigation.** Input, submitted query, and selected location persist via the existing session store; returning from an attraction detail restores the page as left. This restore contract already ships and must be preserved.
- **History updates only on a choice** — never on a keystroke, and never on a submitted query that matched nothing.
- **The submit button stays disabled while the field is empty.** This preserves the shipped behavior and is a documented divergence from the auth never-disable rule: an empty search has no API to answer it and no error voice to explain it, so the disabled state is honest here in a way it is not on Login, where the backend owns the verdict.
- **Motion:** entrance and hover transitions use `{motion.fast}`/`{motion.slow}` with `{motion.ease-spring}` per `DESIGN.md`; all motion collapses under `prefers-reduced-motion`.
- **Banned on auth surfaces:** modals, multi-step wizards, CAPTCHA-style friction, social login buttons, "Remember me", "Forgot Password?", toasts (all feedback is inline in the card), autofocus stealing on error banners (focus goes to the first invalid field, not the banner).
- **Banned on the landing surface:** infinite scroll, auto-submitting on option hover, geolocation prompts, any affordance implying server-side curation ("Trending", "For you"), a second call to action competing with the search bar, a hero carousel or auto-advancing imagery, **modals of any kind**, and **any candidate-match list rendered outside the dropdown** — including a summary row restating the chosen city, which the bar and the section heading already state twice.

## Accessibility Floor

Behavioral. Visual contrast lives in `DESIGN.md` — the Colors section states the verified AA ratios and the documented exceptions (the input hairline border, the card hairline). The auth bullets below are **net-new work**: the current auth pages implement none of the ARIA behavior here, so each belongs in story acceptance criteria. The home surface is different: its combobox and state ARIA already ship, so its bullets are **preservation contracts** — a redesign that regresses them is a failed redesign.

- Every input has a programmatically associated `<label>`; icons inside inputs are `aria-hidden` decoration. The hero search input keeps an accessible name (today's `aria-label="Search"` or a visible label).
- Form-level error and success banners use `role="alert"` / `aria-live="polite"` respectively, so state changes announce without focus theft.
- Field errors are linked to their inputs via `aria-describedby`, and invalid fields set `aria-invalid`.
- The password visibility toggle is a labeled button whose accessible name reflects the next action ("Show password" / "Hide password"); the name swap is the sole state signal — no `aria-pressed`. The reference mock's `focus:outline-none` on this toggle is a defect, not a pattern: the standard 2px `{colors.primary}` focus outline applies.
- The auth hero panel is invisible to assistive tech: background-image with no alt text, and the welcome-copy container carries `aria-hidden="true"` — DOM text is otherwise exposed to screen readers regardless of tab order. The headline is a non-heading element so it never precedes the card's `<h1>` in a heading outline. The home hero band is the inverse: its headline **is** the page `<h1>` and its copy is real content — only the photograph itself is decorative (background image, no alt).
- Text over photography follows DESIGN.md's ≥65%-opacity ink rule on both hero surfaces and the rating badge's scrim treatment (specified with its verified ratio in DESIGN.md Elevation & Depth) — no badge text ever sits on the raw image.
- The search typeahead keeps its full shipped ARIA contract — attributes, roles, and the Arrow/Enter/Escape keyboard model — as enumerated in Component Patterns under Suggestion option. The dropdown stays exactly where it already works; nothing in this pass may cost it an attribute. The landing's combobox currently passes, and a redesign that regresses it is a failed redesign.
- **The `role="search"` landmark is preserved by keeping the bar a form.** Today's `<form role="search">` is what makes the search discoverable by landmark navigation, and it stays — the bar remains a form wrapping an input, so the landmark survives for free. This was nearly lost: an earlier version of this pass replaced the form with a trigger button opening a dialog, which would have deleted the search landmark from the search page and left the product's primary feature undiscoverable by landmark navigation.
- **There are no modals.** `Esc` closes only the suggestion dropdown. The landing surface introduces no dialog, no scrim, no focus trap, and no scroll lock. An earlier version of this pass did, and reverting it **deletes the entire dialog obligation set** rather than having to satisfy it — focus trapping, focus restoration, background inertness, and the `aria-activedescendant`-versus-focus-trap hazard all cease to apply. The dropdown is an anchored panel: focus stays in the input, the page behind stays live and reachable, and Tab moves on normally.
- Attraction skeletons stay `aria-hidden` behind the visually hidden "Loading attractions…" text; the star rating keeps its "Rated N of 3" accessible name; the add-to-trip row keeps its "Add {name} to a trip" label.
- Decorative glyphs on the landing surface are all `aria-hidden`: the bar's leading magnifier, the recent-chip history glyph, the dropdown's map-pin glyphs, and the how-it-works ordinals. The bar's submit is a real control named "Search"; its glyph is decoration inside it.
- **Choosing a city must announce something.** The "Attractions near {name}" heading does not announce on insertion — it is not a live region — and focus stays in the search input, so a screen-reader user gets no confirmation that a city was set or that a grid is loading. Announce it with one `aria-live="polite"` message on choice. A live region is now the right mechanism rather than the focus-move alternative, precisely because there is no summary row to move focus to; the existing visually hidden "Showing N attractions." region then covers the grid's arrival.
- Tab order — auth: wordmark → fields in visual order → primary button → footer link. Landing (pre-search): search input → clear (when present) → submit → recent-search chips in reading order → destination tiles in rail order → (how-it-works has no stops). Landing (city chosen): search input → clear → submit → per-card card link then add-to-trip row. Dropdown options are never tab stops — they are driven by `aria-activedescendant`, per the shipped combobox model.
- The destination tile rail scrolls horizontally, so it must be reachable and traversable by keyboard alone — every tile focusable and scrolled into view on focus. A rail that can only be reached by dragging is a rail that does not exist for keyboard users. Focus-scrolling uses instant positioning under `prefers-reduced-motion`; scroll-snap itself stays, being a layout constraint rather than an animation.
- The dropdown's arrow/Enter/Escape keyboard model is discoverable nowhere on screen. Give the input a visually hidden description stating it, so the keyboard model is not a guess-it affordance on the page's primary control.
- The Verify surface renders one persistent `role="status"` (`aria-live="polite"`) container across verifying → verified whose children change in place — swapping or unmounting the whole node announces nothing. Failure resolution may instead insert the `role="alert"` error banner, which announces on insertion.
- Touch targets ≥ 44px: inputs, buttons, and the add-to-trip row are 3rem tall by token; the visibility toggle's hit area meets the floor even if its glyph is smaller; suggestion chips reach the floor through padding even at their 2rem visual height.
- Keyboard focus is always visible — the existing 2px `{colors.primary}` outline from `index.css`, never suppressed, including on card links, chips, and the add-to-trip row.

## Required Defect Fixes

The complaint that opened this pass — *"the partial search results stay there after I choose a destination"* — is not only a design gap. Three defects in the shipped `SearchPage` produce it, and since this pass deliberately **keeps** the shipped bar-and-dropdown architecture rather than replacing it, these fixes are the substance of the work rather than a side effect of a rewrite. Each is a required fix with its own verification.

| # | Defect | Where | Required behavior | Verifies by |
|---|---|---|---|---|
| 1 | **No blur or click-outside dismissal exists.** The only ways to close the dropdown are Escape, choosing an option, and submitting. Click anywhere else on the page and it stays open indefinitely. | Absent from `SearchPage.tsx` and `SuggestionDropdown` entirely — there is no handler to point at | Add both: the dropdown closes when the input loses focus and when a click lands outside the bar and panel. Blur must not fire before an option's mousedown is handled — the shipped mousedown-to-choose behavior exists for exactly this reason and must be preserved | Open the dropdown, click the page background, assert no option list is in the DOM; then re-open and click an option, asserting the choice still registers |
| 2 | **Suppression compares mismatched values.** `suppressedQuery` is assigned the raw `suggestion.name` while `suggestionsSuppressed` compares it against the *trimmed* debounced input, so any leading or trailing whitespace in an API-returned name makes suppression never match — and the list re-opens roughly one debounce interval after the user selects. | `SearchPage.tsx` — the `suggestionsSuppressed` binding vs the `setSuppressedQuery` call in `handleChoose` (around lines 84 and 101; anchor on the symbols, the numbers will drift) | Delete the suppression mechanism. Dropdown visibility must not depend on string equality between a stored query and a debounced input at all — it follows from whether the user is actively searching (input focused, query at 2+ characters, not dismissed for this query) | Choose an option whose name has surrounding whitespace; assert nothing re-appears after the debounce elapses |
| 3 | **Choosing searches the fragment, not the choice.** `handleChoose` calls `setSubmittedQuery(trimmedDebounced)` — the debounced text — instead of using the chosen suggestion. Choose "Tokyo" from a list opened on "Tok" and the location search runs for "Tok", returning partial matches for a fragment the user never finished typing. | `SearchPage.tsx` — `handleChoose`, the `setSubmittedQuery` call (around line 103) | Choosing must use the resolved `LocationSearchResult` directly and issue no further location-search request at all; see Interaction Primitives | Choose an option before the debounce settles; assert no location-search request is issued and the loaded city matches the option |

Defects 2 and 3 together are the literal cause of the reported symptom, and 3 is why the leftover rows were *partial matches* specifically. Deleting the multi-row result list removes the surface they were leaking onto, and defect 1's two missing handlers close the dropdown itself — but neither substitutes for the other, and all three fixes are required.

One consequence for the shipped store: `searchState.ts` persists `input`, `submittedQuery`, and `selected` as three independently settable fields, which is what allowed them to drift apart. A chosen city is one fact, and the restore contract should carry that fact, not three strings that can disagree.

**A note on scope, recorded deliberately.** An intermediate version of this pass replaced the bar with a trigger opening a modal search overlay, and replaced the result list with a summary row carrying a "Change" action. That was over-built: it added a modal, a focus trap, a landmark regression, and a third surface restating a city the bar and the section heading already name. It is recorded in `.memlog.md` and visible in the "settled mechanics" panel of `mockups/directions-landing.html`, and it is **not** the design. One bar, one dropdown.

## Key Flows

### Flow 1 — The night-before planner registers (An, 22:40, laptop, the evening before she starts planning a Đà Nẵng trip)

1. An lands on Trip Planner's search page, finds an attraction she wants to save, and hits a `RequireAuth` wall that sends her toward login; she clicks "Sign Up" — she has no account.
2. `/register` opens: golden-hour coastline on the left under "Begin Somewhere New.", a single white card on the right. No header, no nav, nothing else asking for attention.
3. She types her email, then a 6-character password, and presses Enter.
4. The card answers inline: "Password must be at least 8 characters." under the password field, focus already there. The email field stays untouched — no work lost.
5. She lengthens the password; the error clears as she types. Enter again.
6. The button reads "Creating your account…" for a beat.
7. **Climax:** the form dissolves into a single green note — "If that email is new to us, a verification link is on its way. Check your inbox." — under the title "Check your inbox." The screen has stopped asking her for anything; the next move belongs to her email client. She switches tabs to her inbox with no ambiguity about what happens next.

Failure path: the API is unreachable → `{components.banner-error}`: "Something went wrong. Please try again." Form intact, values preserved, button re-enabled.

Anti-enumeration note: if An's email already had an account, step 7 is pixel-identical. The surface never leaks which world she is in.

### Flow 2 — The returning traveler logs in (Minh, 07:55, office desktop, checking his itinerary before a stand-up)

1. Minh opens a bookmarked `/trips/3`; `RequireAuth` redirects to `/login?returnTo=/trips/3`.
2. The Login split greets him — "Welcome Back." over the coastline — and the browser autofills both fields via `autocomplete`.
3. He mistypes over the autofill, submits, and gets the flat red banner: "Invalid email or password." His password field still holds what he typed; nothing resets.
4. He taps the visibility toggle, sees the typo, fixes it, Enter.
5. "Signing in…" for half a second.
6. **Climax:** the auth shell vanishes and `/trips/3` renders — not `/trips`, not home, but the exact itinerary he bookmarked. The login screen behaved like a door, not a detour: he is standing precisely where he was headed, one breath after proving who he is.

Failure path: unverified account with the *correct* password → the same flat red banner, but reading "Your email address is not verified. Please check your inbox." — it names the real reason so Minh stops re-typing a password that was never wrong. With an *incorrect* password the banner stays the generic "Invalid email or password." of step 3, so the copy never confirms an email is registered. An accidental empty submit takes the same road: no client-side gate on Login, the API answers, the banner shows it.

### Flow 3 — Verification, expired link, and the second chance (Thảo, 12:15 next day, phone, opening yesterday's verification email over lunch)

1. Thảo taps the verification link from an email she left overnight. `/verify-email?token=…` opens on her phone: no hero (below `md`), just the card, "Verifying your email…" under the title.
2. The token has expired. The status resolves into a red banner — "That link didn't work. It may have expired — we can send you a new one." — and directly beneath it, a ready email field and a "Resend Verification Email" button. Recovery is on the same screen; she never navigates.
3. She enters her email and taps the button; it reads "Sending…".
4. A green note replaces the form: a new link is on its way if the address matches an account. (Had she double-tapped inside the 60-second cooldown, this note would be identical — the backend absorbs the repeat and the UI shows one truth.)
5. The new email arrives; she taps its link. "Verifying your email…" again, one heartbeat.
6. **Climax:** the banner turns green — "Your email is verified. Welcome aboard." — with a single link below: "You can now log in." A stalled, expired, phone-fumbled signup has landed softly; the account she started at her desk yesterday is real, and the only thing left on screen is the one door forward.

Failure path: resend request itself fails (network) → red banner with the error above the intact resend form; her typed email is preserved for retry.

### Flow 4 — The Saturday-morning dreamer finds her city (Vy, 09:10, Saturday, tablet on the kitchen table, coffee, no trip booked yet)

1. Vy opens Trip Planner for the first time. The page greets her with one photographic band clipped inside the page frame — "Where to next?" over a coastline with "Search any city and start building the trip." beneath it, both sitting low and left, and one white search bar resting on the image. Below the band, a rail of six destination tiles under a quiet "Popular searches", then three numbered lines explaining what the product actually does. There is no "Recent searches" row — she has no history, so the section simply isn't there. The page asks exactly one question, suggests six answers, and explains itself in three sentences.
2. She isn't sure how to spell the city she's been daydreaming about, so she types "hoi" into the bar. After a beat a short list drops down beneath it: "Hoi An" with a country pill and a type pill, and two near-misses below. She arrows down once — a blue ring marks the row — and presses Enter.
3. The dropdown closes. The bar now reads "Hoi An", and where the tiles and the three numbered lines were, "Attractions near Hoi An" heads a grid of four shimmering skeleton cards. Nothing sits between the band and that heading — no leftover list of near-misses, no row telling her what she just picked, because the bar and the heading both already say it. (Had a tile named her daydream, one tap would have done all of this without the dropdown opening at all.)
4. The skeletons resolve into photographs. Each card leads with its image: a dark pill in the corner holds white stars, one card wears a small green "heritage" chip on its photo, names sit bold beneath, "1.2 km from center" under the one by the river, three quiet pill tags below that.
5. She hovers the heritage card; it lifts. The full-width row at its foot reads "＋ Add to trip" — she taps it and the app steers her toward login, exactly the door Flow 1 opens.
6. **Climax:** the add-to-trip handoff carried a `returnTo`, so had she already owned an account, login would have dropped her straight back on this page. She registered instead, so the verify detour ends with login landing on `/trips` — and one tap on the header wordmark returns her to home, where the session store restores the page exactly as she left it: "Hoi An" in the bar, the same grid waiting. Either road ends in the same restored state, with the heritage card's add-to-trip row one tap away. And this time the landing remembers her: whenever she next arrives at a cleared page, "Recent searches" sits above the tile rail with Hoi An in it — her own history, not a recommendation.

Failure path: the attractions request fails → the grid area shows the cloud-emoji state with "Service unavailable — please try again." and a "Try again" button scoped to attractions; the bar keeps "Hoi An" and one tap retries without retyping anything. If Hoi An had returned nothing, the state reads "No attractions in this area yet — try another city." and the bar is one tab-stop away.

Second-guess path, and the one this pass exists to fix: Vy decides Hoi An was wrong. She clicks the bar — "Hoi An" is selected, so typing replaces it. She types "da n", the dropdown drops with Đà Nẵng at the top, she picks it, and the dropdown closes onto "Attractions near Đà Nẵng". No second control was needed to get back here; the bar never left. And at no point is a column of partial matches sitting on the page.
