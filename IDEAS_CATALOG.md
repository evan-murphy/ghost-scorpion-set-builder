# App Ideas Catalog
**Source:** Post-use brainstorm (March 2026)  
**Tool:** BTDOAGS Set List — set.horror.surf

---

## 1. Stage Mode for Music Director (MD) / Drummer

### Overview
A dedicated mode for drummers or MDs with advanced live features, powered by integrations with external metronome/chord apps rather than built into the core setlist tool.

### Access & Roles
- **Settings area** in catalog for all users who can access the tool
- Access is bound to a **shared Google Drive folder** — whoever has access to that folder = approved users (band-affiliated)
- **Role assignment:** Normal vs. **MD (Musical Director)** role
- MD role unlocks stage-mode features (click, tempo, etc.)

### External Integrations (future)
| Source | Data | Notes |
|--------|------|-------|
| **Tempo Advance** | Tempos | Setlists store tempo/meter/rhythm; proprietary export only (email/iTunes), no JSON/MIDI |
| **Polynome Pro** | Tempos | Exports audio, presets; no beat/tempo map export for code |
| **OnSong** | Chords, full song info | Eventually |

### Core MD Feature: Click from Catalog BPM
- **IEMs connected** → app outputs click based on song BPM from catalog metadata
- **Beat map override:** Tempo Advance and PolyNome Pro do *not* export beat/tempo maps in JSON, MIDI, or any standard format — stick with simple BPM from catalog for v1
- **Future:** DAWs (Pro Tools, Logic, Studio One) export tempo maps via MIDI; custom import possible later
- **Catalog schema change:** Add `bpm` column to songs sheet

### Stage Mode UX
- Each song shows **click in holding pattern (paused)** until user action
- **Touch to start** → releases click so drummer has tempo ready
- **Touch to stop** → stops click (e.g. quick adjustment, talking to crowd)
- Touch = both "move forward" and "correction" — need to handle stop-and-resume flows

### Click Locked to Full Stage Mode
- **Click only available when fully in stage mode:** fullscreen + screen awake
- Prevents accidental click in builder/archive; ensures tab is foregrounded (iOS audio requirement)
- UX: "Enter Stage View" first → then click controls appear or become active

### Dependencies
- BPM in catalog (new column)
- Web Audio API for click generation (see `Perplexity/stage-mode.md`)

---

## 2. Save vs. Sync — New Saving Taxonomy

### Mental Model
- **Save** = "my changes are safely stored" (local/durable, fast)
- **Sync** = "copy pushed to Google" (can lag, may fail, doesn't lose work)

### Flow
1. **First explicit Save** in set builder mode → establishes Google binding (doc ID, auth, sync metadata)
2. From then on → **auto-sync in background** at reasonable intervals
3. User mental model: "my work is saved" — sync status only surfaces when it matters

### Autosave Behavior
- **Change-aware:** Only save when dirty, not on rigid timer
- **Intervals:** 5–30 seconds typical; shorter = more protection, must stay invisible
- **Snapshot:** Entire document or logical blocks in one transaction (avoid partial states)
- **Non-blocking:** Never block typing; progress indicator tiny/non-modal or omitted for local autosave

### Sync Triggers
- Debounced after last change (e.g. 5–20 seconds)
- Key events: blur, navigation, `beforeunload`, explicit Save
- Network reconnect

### Primary Action
- **Save** button → returns instantly (local write + queue sync)
- Does NOT wait on Google response

### Status UI
- Subtle status line: `Saved · Last synced 2m ago`
- States: `Saving…` → `Syncing…` → `Synced to Google just now`
- Error: `Sync failed – Retry` (non-blocking banner)
- Offline: `All changes saved locally` + `Sync pending`

### Error Handling
- Google unreachable → show "saved locally", "Sync pending", auto-retry
- Auth expired / quota / validation → small banner, clear retry
- Conflict (edited elsewhere) → version history, auto-merge or compare/resolve view

### Power User
- Explicit "Sync now" affordance to force cloud push

### Optional
- Document history from autosave snapshots (safety net for accidental changes)

### Current State
- `DRAFT_STORE` saves to localStorage on builder changes
- Explicit Save → `DATA.saveSetlist()` → Apps Script
- No autosync; no Save vs. Sync distinction in UI

---

## 3. Stage View UX Changes

### Remove PDF Download from Stage View
- PDF export belongs in archive/builder, not on-stage
- Reduces clutter in stage mode

### Screen Awake Toggle
- **Make wake lock toggle primary** on stage view
- Currently: wake toggle is in "More" menu
- Proposed: Awake on/off as a prominent control (drummer needs to know screen won't sleep)

---

## 4. Catalog: Hide Non-Live Songs

### Feature
- In catalog settings: **hide songs that are not "live"** from set builder and stage view
- `active` column already exists (TRUE/FALSE) — used to hide from builder
- This may be the same concept, or a new `live` / `in_rotation` flag
- Clarify: Is `active` = "live"? Or do we need a separate "show in set builder" vs. "catalog-only" distinction?

### Implementation
- Catalog preference or filter: "Hide catalog-only songs"
- When enabled, only `active: TRUE` (or new `live: TRUE`) appear in builder picker and stage view song list

---

## 5. Add New Songs — Minimal Required Fields

### Current
- `saveNewSong` requires: title, display_title, album, year, notes, active
- Full form in catalog

### Proposed
- **Only stage name (display_title) required** to add a new song
- Everything else fillable later
- Use case: Add song during rehearsal while writing; fill full metadata later

### Flow
- Catalog page: "Add song" → minimal form (stage name only)
- Rest of fields optional, editable in track detail drawer

### Schema
- `title` can default to display_title or empty
- `display_title` = required (stage shorthand)
- album, year, notes, active, duration_sec, etc. = optional, nullable

---

## 6. Dependencies for Scaling

### Current
- **Google Sheets** — songs, setlists
- **Google Drive** — folder for access/sharing (future auth model)
- **Bandcamp** — one-time metadata import (duration, artwork)

### For Scaling
| Dependency | Purpose |
|------------|---------|
| **Bandcamp** | Catalog seed, metadata (duration, artwork, song_type) |
| **Google Drive** | Shared folder = access control, approved users |
| **Google Sheets** | Persistence (songs, setlists) |
| **Tempo Advance / Polynome Pro** | BPM, beat maps (MD stage mode) |
| **OnSong** | Chords, full song info (future) |

### Access Model Evolution
- Today: Allowlist in Apps Script
- Future: Drive folder share = approved users; roles (Normal, MD) in settings

---

## 7. Priority / Implementation Order (Suggested)

| # | Idea | Effort | Impact | Notes |
|---|------|--------|--------|-------|
| 1 | Remove PDF from stage view | Low | Medium | Quick UX win |
| 2 | Awake toggle prominent in stage view | Low | High | Drummer need |
| 3 | Add song: stage name only | Low | Medium | Rehearsal workflow |
| 4 | Hide non-live in catalog | Low | Medium | Clarify active vs. live |
| 5 | Save vs. Sync taxonomy | High | High | Big refactor |
| 6 | Stage mode + click from BPM | High | High | New mode, Web Audio, schema |
| 7 | MD role + settings | Medium | Medium | After Drive folder auth |
| 8 | Tempo/OnSong integrations | High | Medium | External APIs |

---

## 8. Schema Additions (Summary)

| Sheet | Column | Type | Purpose |
|-------|--------|------|---------|
| songs | bpm | number | Click tempo for stage mode |
| songs | live | boolean? | Or clarify `active` = live; optional separate flag |
| (future) | beat_map | MIDI? | DAWs export tempo maps; Tempo/PolyNome do not |

---

## 9. Open Questions

1. **active vs. live:** Is `active` already "in rotation / show in builder"? Or do we need a separate "catalog-only" vs. "live" distinction?
2. **Beat map format:** ~~Tempo Advance / PolyNome Pro~~ — Neither exports. Use catalog BPM for v1; DAW MIDI import possible later.
3. **Click output:** Web Audio to device audio, or route to IEMs via? (Browser audio routing limitations)
4. **Drive folder binding:** How does "bound to folder" work technically? Drive API scope, folder ID in config?

---

## 10. Research Summary (Perplexity folder)

| File | Topics | Key Takeaways |
|------|--------|---------------|
| `Perplexity/stage-mode.md` | Web Audio metronome, click sounds, background audio | Oscillator or sample-based clicks; schedule ahead with `AudioContext.currentTime`; iOS Safari suspends when locked/backgrounded — keep tab foregrounded for live use; Android Chrome more permissive |
| `Perplexity/save-and-access.md` | Offline-first sync, sync queue, Drive API | IndexedDB + outbox; debounced sync; version stamps for conflict detection; `files.get` with OAuth to check folder access; `supportsAllDrives=true` for shared drives |
