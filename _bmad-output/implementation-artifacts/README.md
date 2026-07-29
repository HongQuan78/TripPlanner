# Implementation Artifacts

Three layers live here. They are not interchangeable, and the difference matters before you open anything.

| Path | What it is | Count |
| --- | --- | --- |
| `stories/` | **The current backlog.** One file per story in the restructured 6-epic breakdown. Story statement + acceptance criteria, plus dev context on the ones still actionable. Start here. | 47 |
| `archive/` | **Historical record.** The pre-restructure story artifacts, as written at the time. Each pins a `baseline_commit` and records the decisions, deviations, traps and test counts measured at that commit. Read-only in spirit — do not renumber or rewrite them. | 52 |
| *(top level)* | Cross-cutting reports and specs that were never single stories: architecture audits, code-review findings, requirements-verification reports, `deferred-work.md`, `epic-5-context.md`. | 10 + 1 patch |
| `sprint-status.yaml` | Status tracker. **Still keyed to the old IDs** — see the caveat below. | 1 |

## ⚠️ The number `6.5` means two different things

The restructure renumbered every story by its owning epic, and the new IDs collide numerically with the old filenames. **Twenty numbers are shared between `stories/` and `archive/`, and nineteen of them mean something completely different.** Only `5.1` happens to agree.

| Number | `archive/` (dash) | `stories/` (dot) |
| --- | --- | --- |
| `1-5` vs `1.5` | attraction list **pagination** | **filter** the attraction list |
| `3-4` vs `3.4` | **schedule** a destination into a day | **remove** a destination |
| `4-5` vs `4.5` | unverified **login** message | **log out** |
| `6-5` vs `6.5` | destination **opening hours** source | **Mapperly** compile-time mapping |
| `6-6` vs `6.6` | feature-2 **verification** | **flatten** the destination model |

The dash/dot distinction is the only thing separating them, and it does not survive being spoken aloud. **Always say which folder you mean.** "Story 6.5 in `stories/`" and "`6-5` in `archive/`" are unrelated pieces of work.

This was a deliberate trade: reusing the dash form would have overwritten historical artifacts, which is worse. Renaming the new files to an unambiguous form (`e6-s05-…`) was proposed and declined; if the ambiguity bites, that remains the fix.

## Known inconsistency: the tracker disagrees with the backlog

`sprint-status.yaml` was **not** updated by the restructure. It still tracks the old IDs, still groups them under `epic-6` … `epic-10` — buckets the restructure dissolved — and still carries roughly 30 entries sitting at `review` that the changelog narrative describes as accepted.

One of those is confirmed wrong by reading source: it records `6-11-flatten-destination-hierarchy` as `ready-for-dev`, but the flatten is done (`BE/TripPlanner.Domain/Models/` holds only `Destination.cs`, carrying `Category` and `OpeningHours` on the base type). See `stories/6.6-flatten-the-destination-model-to-a-single-entity.md`.

Treat `stories/` as the current shape of the work and `sprint-status.yaml` as the not-yet-migrated tracker. Reconciling them is the job of a sprint-planning pass.

## Where the structure is defined

`_bmad-output/planning-artifacts/epics.md` is the source of truth for the 6 epics, the 47 stories, the FR/NFR coverage map, the dependency notes, and the full old→new ID mapping table. Every file in `stories/` was generated from it, so the story text is identical by construction rather than by transcription.

## Five stories are genuinely open

Everything else is delivered. These are not:

- `stories/1.9-…` — NFR1/NFR2 search performance budgets. Never measured; no performance harness exists in the repo.
- `stories/2.3-…` — multi-image support. The image provider port exposes only a single-URL method, so "swipe through multiple photos" is structurally unreachable. Backend-only gap.
- `stories/2.7-…` — NFR3 2-second budget. Unreachable on a cold path with the current provider timeouts; needs a decision before code.
- `stories/3.11-…` — auto-save indicator and retry. The current optimistic-rollback behaviour is the *opposite* of the acceptance criterion; needs a design decision, not an implementation.
- `stories/6.8-…` — NFR5 data scalability. Not implementable as specified; the requirement carries no number and the architecture deliberately does not persist provider data.

## Adding a story

Add it to `epics.md` under its epic, then create the matching file in `stories/`. Do not add new files to `archive/` — it is closed.
