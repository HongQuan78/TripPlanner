---
name: Trip Planner — Horizon
status: final
updated: 2026-07-15
sources:
  - imports/sign-in-horizon-travel.html
  - .memlog.md
---

# Trip Planner Auth + Home — Experience Spine

> Scope: the three authentication surfaces — Login, Register (including the registration-received success state), and Verify Email (verifying / verified / failed / resend states) — plus the home/search surface (`/` → SearchPage): hero search band, first-visit state, location results, and the attraction card grid. Paired with `DESIGN.md` (Horizon), which owns every visual token referenced here by `{path.to.token}`.

## Foundation

Responsive web, desktop-first. The auth surfaces use a **split layout**: a full-height hero panel (local travel photograph with gradient overlay and welcome copy, `{components.hero-panel}`) on the left and a single white auth card (`{components.auth-card}`) centered on the right. Below `md` the hero is fully hidden — never stacked above the form — and the card becomes a single centered column, following the reference mock's `hidden md:flex` treatment.

The home surface is the opposite tenancy: it renders **inside** `AppLayout` (sticky header, nav, route transition), and its brand moment is a **hero band** (`{components.hero-band}`) at the top of the content column holding the headline, tagline, and the search bar — the auth hero language rotated horizontal and given the page's one task to hold. The band persists on every viewport; below it, results and the attraction grid sit on the plain canvas.

→ Reference: `imports/sign-in-horizon-travel.html` (Horizon Travel sign-in mock). **The spines win on conflict** with the mock or any other visual artifact.

→ Mockups (spine-derived, one per surface, each with its load-bearing alternate states): `mockups/key-login.html` (rest / form error / pending button), `mockups/key-register.html` (rest / registration received), `mockups/key-verify-email.html` (failed + resend / verified climax), `mockups/key-home-presearch.html` (first visit: hero band, hero search with disabled Search and solid-white Clear, six-chip "Popular searches" row), `mockups/key-home-results.html` (populated grid: location result list with a selection, four attraction-card variants — rated with distance, heritage, unrated without badge, missing-image placeholder with badge). Every IA surface is mocked; the hero photograph is a gradient stand-in until the real asset lands in `FE/src/assets`. The home surface's loading, error, empty, and country-notice states ship today unchanged and stay spine-only — preservation contracts, not new builds.

UI system: hand-rolled CSS Modules over the Horizon token layer in `FE/src/index.css`. No component library. `DESIGN.md` is the visual identity reference; this spine is the experience contract. Input icons (mail, lock, visibility) ship as inline SVG rather than the reference mock's Material Symbols webfont — the codebase has no icon dependency and a webfont adds a render-blocking request for three glyphs; the exact SVG source is an implementation-story choice. Light theme only: the mock's `darkMode: "class"` hook is not adopted — the app has no dark mode and this run does not introduce one.

Auth routes render **without** the app header and nav. The reference mock explicitly suppresses top nav and footer on transactional screens; today `/login`, `/register`, and `/verify-email` render inside `AppLayout` (sticky header + nav), so this spine implies a routing change — auth routes move outside `AppLayout` (or `AppLayout` suppresses its chrome on them), with the card's brand wordmark serving as the way back: the "Trip Planner" wordmark (two words — the user-facing brand spelling) links to `/`.

Hard constraint carried from the backend, non-negotiable for all copy in this document: **the UI must never reveal whether an email address has an account or whether it is unverified.** Register success copy is identical for fresh and duplicate emails; a login rejected for lack of verification shows the same generic `Invalid email or password.` as a wrong password; resend-verification returns the same generic success during its 60-second cooldown.

Hard constraint on the home surface, equally non-negotiable: **there is no popular-destinations API.** Every affordance on the pre-search page — suggestion chips included — can only pre-fill and submit the existing text-search flow (`GET` location search by name). Nothing on the page may imply curated, personalized, or trending content the backend cannot serve. The attraction payload is exactly `xid`, `name`, `kinds`, `rating` (1–3, optional trailing `h` for heritage), `imageUrl`, and `distanceMeters` — the card may surface all of these and nothing else.

## Information Architecture

| Surface | Route | Reached from | Purpose |
|---|---|---|---|
| Home / Search | `/` | App open, header wordmark, auth-card wordmark | Find a city; discover its attractions; add them to a trip |
| Attractions grid | `/` (in-place state) | Selecting a City result | Browse attraction cards; exit to `/attractions/:xid` detail or add to a trip |
| Login | `/login` | Header "Login" link, `RequireAuth` redirect (with `returnTo`), Register/Verify cross-links | Authenticate and continue to `/trips` or `returnTo` |
| Register | `/register` | Header "Register" link, Login cross-link | Create an account; hand off to email verification |
| Registration received | `/register` (in-place state) | Successful register submit | Confirm the request generically; route to inbox-checking behavior |
| Verify Email | `/verify-email?token=…` | Link in the verification email | Consume the token; celebrate or recover |
| Verify Email (resend) | `/verify-email` (no/failed token) | Direct visit, failed verification | Request a fresh verification link |

Each auth surface is linear and terminal — no nested navigation, no modals, no steps. Cross-links between Login and Register live in the card footer only. The hero panel is identical in structure across all three surfaces, with per-surface welcome copy (see Voice and Tone). Verify Email reuses the same split hero layout as Login and Register rather than a simpler centered card — one auth shell, three tenants — so the verification climax inherits the brand moment and the implementation stays a single layout component.

The home surface is a single accumulating page, not a funnel: search state persists across route changes, so a user who opens an attraction detail and returns finds the page exactly as they left it (the restore contract is specified in Interaction Primitives). An attraction card offers exactly two exits: the card itself links to the attraction detail route, and the add-to-trip row hands off to the existing add-to-trip flow (which itself routes unauthenticated users toward login).

## Voice and Tone

Microcopy only; aesthetic posture lives in `DESIGN.md`. Horizon speaks like a well-run boutique hotel front desk: warm, brief, never chirpy, never blaming.

| Do | Don't |
|---|---|
| "Welcome back." | "Hello again, traveler! 👋" |
| "Please enter your details to continue." | "Enter your credentials below to access your account." |
| "Invalid email or password." (verbatim backend message, both causes) | "This account hasn't been verified yet" — never distinguish unverified from wrong-password |
| "If that email is new to us, a verification link is on its way. Check your inbox." | "Account created!" / "That email is already registered." — never confirm or deny an account's existence |
| "Your email is verified. Welcome aboard." | "Verification successful ✓" |
| "That link didn't work. It may have expired — we can send you a new one." | "Error: invalid token" |
| "Signing in…" / "Creating your account…" / "Sending…" | Spinners with no words, or "Please wait…" |
| "Where to next?" | "Discover amazing destinations! 🌍" |
| "No attractions in this area yet — try another city." | "0 results found." |
| "Popular searches" over suggestion chips — an honest label for a static list | "Trending now" / "Recommended for you" — implies backend intelligence that does not exist |

Hero welcome copy, per surface:

- **Login** — headline "Welcome Back." with supporting line "Your next extraordinary journey begins right where you left off." (verbatim from the reference mock).
- **Register** — headline "Begin Somewhere New." with supporting line "One account, every itinerary — plan the trips you've been putting off."
- **Verify Email** — headline "Almost There." with supporting line "One click stands between you and your first itinerary."
- **Home** — headline "Where to next?" with tagline "Search any city and start building the trip." The existing headline is kept — it already carries the Horizon register — and only the tagline is rewritten, replacing the current instructional "Search for a city or country to discover attractions." with a line that names the product's promise.

Field labels are nouns, not questions: "Email Address", "Password". Buttons are verbs: "Sign In", "Create Account", "Resend Verification Email", "Search". Error text states what happened and, where recovery exists, what to do next — one sentence each.

Card subtitle on Login and Register: "Please enter your details to continue." Cross-link footers, verbatim: Login — "Don't have an account? Sign Up"; Register — "Already have an account? Sign In"; registration received — "Already verified? Log in."; verified — "You can now log in."

Home state copy, preserved verbatim from the shipped implementation unless noted: "Searching…", "No matching places found.", "{name} is a country — search for a specific city to see attractions.", "Attractions near {name}", "No attractions in this area yet — try another city.", "Service unavailable — please try again." with the "Try again" retry action, and the visually hidden "Loading attractions…".

## Component Patterns

Behavioral only. Visual specs live in `DESIGN.md.Components`.

| Component | Use | Behavioral rules |
|---|---|---|
| Auth card | All three auth surfaces | One card per screen, one primary action per card. Never scrolls internally. Brand wordmark at top links to `/`. |
| Hero panel | Auth surfaces, `md+` | Purely presentational — no interactive elements. The welcome-copy container carries `aria-hidden="true"` (rationale in Accessibility Floor), and the headline is a non-heading element — never an `<h2>` competing with the card's `<h1>`. Photo ships as a local asset in `FE/src/assets` with a `{colors.surface-container}` fallback fill while loading. |
| Hero band | Home, all viewports | Presentational photograph plus the page's real `<h1>`, tagline, search form, and (pre-search) suggestion chips — unlike the auth hero, its text is the page content and is fully exposed to assistive tech. Same local-asset and fallback-fill rules as the hero panel. |
| Hero search | Home | The existing search form relocated into the band, behavior preserved wholesale: `role="search"` form, Enter submits, Search button submits the trimmed input, Clear resets input, query, and selection. The typeahead contract is already implemented and **must be preserved**: 300ms debounce, minimum 2 characters, at most 5 suggestions, suppression after a chosen suggestion or submitted query, per-query dismissal via Escape. |
| Suggestion dropdown | Home | The existing ARIA listbox contract, preserved exactly: input carries `aria-autocomplete="list"`, `aria-expanded`, `aria-controls`, and `aria-activedescendant` for the active option; the list is `role="listbox"` with `role="option"` rows, the active one marked `aria-selected`; ArrowDown/ArrowUp cycle with wraparound, Enter chooses the active option, Escape dismisses for the current query; options are chosen on mousedown so the input never loses focus. Choosing a suggestion fills the input, submits the query, and selects the location in one gesture. On the pre-search band the open dropdown overlays the suggestion chip row (it is absolutely positioned above the page flow); chips neither hide nor reflow while the user types. |
| Suggestion chip | Home, pre-search only | A static, hand-curated set of six well-known city names shipped as a frontend constant — honest "Popular searches", not a feed — because no popular-destinations API exists. Activating a chip pre-fills the input and submits the search in the same gesture, landing the user on live results in one tap rather than leaving a filled-but-idle field. Chips are real buttons; they disappear once a query has been submitted and return only when the page is cleared. |
| Location result list | Home, post-search | Existing contract preserved: up to 5 results as toggle buttons with `aria-pressed` marking the selected one; each shows name, country code, location type, and a partial-match note when flagged. Selecting a City loads attractions; selecting a Country shows the guidance notice. |
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
| No client validation | Login | Login performs no client-side field validation: any submit — empty fields included — goes to the API, and every failure lands in the form-level error banner with the backend's generic message. One error voice on Login serves the anti-enumeration posture; Register keeps client validation because its rules (email shape, password length) reveal nothing about accounts. |
| Form error | Login, Register, Resend | `{components.banner-error}` with the `ApiError` message verbatim, or "Something went wrong. Please try again." for unknown failures. Password value is preserved on login failure. |
| Registration received | Register | Form is replaced by `{components.banner-success}` under the title "Check your inbox." Body: the backend's generic message. Footer: "Already verified? Log in." No resend affordance here — resend lives on `/verify-email`. |
| Verifying | Verify Email (token present) | Status line "Verifying your email…" in `{colors.on-surface-variant}`. Fires exactly once per token (guard against double-effects). No form visible. |
| Verified | Verify Email | `{components.banner-success}` with the backend message, footer link "You can now log in." — the climax state; see Flow 3. |
| Failed verification | Verify Email | `{components.banner-error}` with the failure message, followed immediately by the resend form — recovery on the same screen, no navigation required. |
| Resend requested | Verify Email | `{components.banner-success}` with the backend's generic message replaces the resend form. Identical whether the backend actually sent an email or silently absorbed the request inside the 60-second cooldown — the UI cannot and must not know the difference. After a success, the resend form does not return on this page visit; a user who mistyped their email refreshes or revisits. No client-side countdown timer is shown, since displaying one would imply knowledge of server state the anti-enumeration contract forbids. |
| No token, direct visit | Verify Email | Resend form shown by default with the hint "Enter your email address and we will send a new verification link." |
| Pre-search (first visit) | Home | The hero band with headline, tagline, search bar, and the suggestion chip row under a quiet "Popular searches" label — the page is never blank before the first search; the band plus chips are the whole first-visit canvas, and no fake content sits below them. Restored sessions skip this state entirely: persisted search state re-renders the results as left. |
| Searching | Home | "Searching…" line in `{colors.on-surface-variant}` below the band while the location query is in flight — the existing treatment, kept. |
| Search error | Home | The shared state pattern (emoji, `{colors.on-surface-variant}` text, primary "Try again" retry button). Message is the `ApiError` text, or "Service unavailable — please try again." for 503/network — existing contract, kept. |
| No matches | Home | State pattern with "No matching places found." No retry — a different query is the recovery. |
| Country selected | Home | State pattern notice: "{name} is a country — search for a specific city to see attractions." The result stays selected; no attractions load — existing contract, kept. |
| Attractions loading | Home (City selected) | The "Attractions near {name}" heading with 4 `aria-hidden` skeleton cards in the grid and the visually hidden "Loading attractions…" for assistive tech — existing contract, kept; skeleton geometry follows the richer card so the swap does not jump. |
| Attractions error | Home | Same state pattern as search error, with its own retry scoped to the attractions query — existing contract, kept. |
| Attractions empty | Home | State pattern: "No attractions in this area yet — try another city." |
| Populated grid | Home | Attraction cards enter with the existing 40ms stagger. Selecting a different city replaces the grid; Clear returns the page to pre-search. |

## Interaction Primitives

- **Enter submits.** Every form submits on Enter from any field; the primary button is `type="submit"`. On home, Enter chooses the active suggestion when the dropdown has one, and submits the search otherwise — the existing precedence, preserved.
- **Click/tap to act.** No hover-only affordances; the password toggle is a real button, reachable by keyboard and tap; suggestion chips and the add-to-trip row are real buttons.
- **One pending operation per surface.** Submission disables the primary action until resolution; no optimistic transitions — navigation happens only after the API confirms.
- **`returnTo` is honored.** Login redirected from a protected route returns the user to where they were headed; only same-origin paths (leading `/`) are accepted.
- **Search state survives navigation.** Input, submitted query, and selected location persist via the existing session store; returning from an attraction detail restores the page as left. This restore contract already ships and must be preserved.
- **The Search button stays disabled while the input is empty.** This preserves the shipped behavior and is a documented divergence from the auth never-disable rule: an empty search has no API to answer it and no error voice to explain it, so the disabled state is honest here in a way it is not on Login, where the backend owns the verdict.
- **Motion:** entrance and hover transitions use `{motion.fast}`/`{motion.slow}` with `{motion.ease-spring}` per `DESIGN.md`; all motion collapses under `prefers-reduced-motion`.
- **Banned on auth surfaces:** modals, multi-step wizards, CAPTCHA-style friction, social login buttons, "Remember me", "Forgot Password?", toasts (all feedback is inline in the card), autofocus stealing on error banners (focus goes to the first invalid field, not the banner).
- **Banned on home:** infinite scroll, auto-submitting on suggestion hover, geolocation prompts, and any affordance implying server-side curation ("Trending", "For you") — the backend offers text search and nothing else.

## Accessibility Floor

Behavioral. Visual contrast lives in `DESIGN.md` — the Colors section states the verified AA ratios and the documented exceptions (the input hairline border, the card hairline). The auth bullets below are **net-new work**: the current auth pages implement none of the ARIA behavior here, so each belongs in story acceptance criteria. The home surface is different: its combobox and state ARIA already ship, so its bullets are **preservation contracts** — a redesign that regresses them is a failed redesign.

- Every input has a programmatically associated `<label>`; icons inside inputs are `aria-hidden` decoration. The hero search input keeps an accessible name (today's `aria-label="Search"` or a visible label).
- Form-level error and success banners use `role="alert"` / `aria-live="polite"` respectively, so state changes announce without focus theft.
- Field errors are linked to their inputs via `aria-describedby`, and invalid fields set `aria-invalid`.
- The password visibility toggle is a labeled button whose accessible name reflects the next action ("Show password" / "Hide password"); the name swap is the sole state signal — no `aria-pressed`. The reference mock's `focus:outline-none` on this toggle is a defect, not a pattern: the standard 2px `{colors.primary}` focus outline applies.
- The auth hero panel is invisible to assistive tech: background-image with no alt text, and the welcome-copy container carries `aria-hidden="true"` — DOM text is otherwise exposed to screen readers regardless of tab order. The headline is a non-heading element so it never precedes the card's `<h1>` in a heading outline. The home hero band is the inverse: its headline **is** the page `<h1>` and its copy is real content — only the photograph itself is decorative (background image, no alt).
- Text over photography follows DESIGN.md's ≥65%-opacity ink rule on both hero surfaces and the rating badge's scrim treatment (specified with its verified ratio in DESIGN.md Elevation & Depth) — no badge text ever sits on the raw image.
- The search typeahead keeps its full shipped ARIA contract — attributes, roles, and the Arrow/Enter/Escape keyboard model — as enumerated in Component Patterns under Suggestion dropdown.
- Location result buttons keep `aria-pressed` for the selected state; attraction skeletons stay `aria-hidden` behind the visually hidden "Loading attractions…" text; the star rating keeps its "Rated N of 3" accessible name; the add-to-trip row keeps its "Add {name} to a trip" label.
- Tab order — auth: wordmark → fields in visual order → primary button → footer link. Home: search input → Search → Clear → (pre-search) chips in reading order, or (post-search) result buttons → per-card card link then add-to-trip row. `Esc` closes only the suggestion dropdown; there are no modals.
- The Verify surface renders one persistent `role="status"` (`aria-live="polite"`) container across verifying → verified whose children change in place — swapping or unmounting the whole node announces nothing. Failure resolution may instead insert the `role="alert"` error banner, which announces on insertion.
- Touch targets ≥ 44px: inputs, buttons, and the add-to-trip row are 3rem tall by token; the visibility toggle's hit area meets the floor even if its glyph is smaller; suggestion chips reach the floor through padding even at their 2rem visual height.
- Keyboard focus is always visible — the existing 2px `{colors.primary}` outline from `index.css`, never suppressed, including on card links, chips, and the add-to-trip row.

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

Failure path: unverified account → the same "Invalid email or password." banner as step 3. No hint, no special copy — if Minh knows he just registered, the registration-received screen already told him to check his inbox. An accidental empty submit takes the same road: no client-side gate on Login, the API answers, the banner shows it.

### Flow 3 — Verification, expired link, and the second chance (Thảo, 12:15 next day, phone, opening yesterday's verification email over lunch)

1. Thảo taps the verification link from an email she left overnight. `/verify-email?token=…` opens on her phone: no hero (below `md`), just the card, "Verifying your email…" under the title.
2. The token has expired. The status resolves into a red banner — "That link didn't work. It may have expired — we can send you a new one." — and directly beneath it, a ready email field and a "Resend Verification Email" button. Recovery is on the same screen; she never navigates.
3. She enters her email and taps the button; it reads "Sending…".
4. A green note replaces the form: a new link is on its way if the address matches an account. (Had she double-tapped inside the 60-second cooldown, this note would be identical — the backend absorbs the repeat and the UI shows one truth.)
5. The new email arrives; she taps its link. "Verifying your email…" again, one heartbeat.
6. **Climax:** the banner turns green — "Your email is verified. Welcome aboard." — with a single link below: "You can now log in." A stalled, expired, phone-fumbled signup has landed softly; the account she started at her desk yesterday is real, and the only thing left on screen is the one door forward.

Failure path: resend request itself fails (network) → red banner with the error above the intact resend form; her typed email is preserved for retry.

### Flow 4 — The Saturday-morning dreamer finds her city (Vy, 09:10, Saturday, tablet on the kitchen table, coffee, no trip booked yet)

1. Vy opens Trip Planner for the first time. The page greets her with one photographic band — "Where to next?" over a coastline, "Search any city and start building the trip." beneath it, and a white search bar floating on the image. Under the bar, a quiet "Popular searches" row: six city chips. The page is asking her exactly one question and has already suggested six answers.
2. She isn't sure how to spell the city she's been daydreaming about, so she types "hoi" — after a beat, the dropdown offers "Hoi An". She arrows down once and presses Enter; the input fills, the chips are gone, and the result row appears already selected. (Had a chip named her daydream — say Đà Nẵng — one tap would have collapsed this step and the next into a single gesture: chips pre-fill and submit at once.)
3. "Attractions near Hoi An" heads a grid of four shimmering skeleton cards — the page has already committed its shape.
4. The skeletons resolve into photographs. Each card leads with its image: a dark pill in the corner holds white stars, one card wears a small green "heritage" chip on its photo, names sit bold beneath, "1.2 km from center" under the one by the river, three quiet pill tags below that.
5. She hovers the heritage card; it lifts. The full-width row at its foot reads "＋ Add to trip" — she taps it and the app steers her toward login, exactly the door Flow 1 opens.
6. **Climax:** the add-to-trip handoff carried a `returnTo`, so had she already owned an account, login would have dropped her straight back on this page. She registered instead, so the verify detour ends with login landing on `/trips` — and one tap on the header wordmark returns her to home, where the session store restores the page exactly as she left it: "hoi" resolved, Hoi An selected, the same grid waiting. Either road ends in the same restored state, with the heritage card's add-to-trip row one tap away.

Failure path: the attractions request fails → the grid area shows the cloud-emoji state with "Service unavailable — please try again." and a "Try again" button scoped to attractions; her search and selection stay intact, and one tap retries without retyping anything. If Hoi An had returned nothing, the state reads "No attractions in this area yet — try another city." and the search bar is one tab-stop away.
