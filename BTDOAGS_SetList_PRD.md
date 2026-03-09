# PRD: BTDOAGS Set List Tool
**Product:** `set.horror.surf`  
**Band:** Beware The Dangers Of A Ghost Scorpion!  
**Audience:** Band members only (internal tool, soft-open)  
**Status:** Draft v3 — ready for Cursor development

---

## 1. Problem Statement

The band has a growing catalog across multiple albums and no persistent system for building, storing, or recalling set lists. Every show requires rebuilding the list from memory, printed lists are generated ad-hoc with no archive, and there's no record of what was played when. This tool collapses three currently manual workflows into one:

1. **Catalog management** — a single canonical list of every playable song
2. **Set list builder** — compose an ordered list for a specific show or rehearsal
3. **Archive + output** — store every set list by date, recall and clone past ones, generate the established branded PDF for printing, and serve a clean mobile read view for bandmates on stage

---

## 2. The Existing Design (Do Not Reinvent)

Real set lists from the band's archive define the output format. The tool must reproduce this exactly.

### Layout A: Two-Column (Short / Medium sets)
```
         [SCORPION LOGO - centered, ~100px]
              05 17 2025
                              
  VILE CHAT          PLANET SLIME
  KINGS SIP          HEADLESS / SEVERED
  ROCK HUDSON        BEAT U UP
  DESMO                    -
  2 DARKNESS         CAUGHT DED
  FULL O BLOOD       SAFARI ZONE
  N TX               ACID CHALET III
  NAMELESS 1
  HAINTMAKER


     BEWARE THE DANGERS OF A GHOST SCORPION!
              HTTP://HORROR.SURF
```
- Songs fill left column top-to-bottom, then right column
- A lone `-` in the right column = break/encore separator
- Footer: small Bebas Neue, centered, band name + URL

### Layout B: Single-Column with Whitespace Grouping (Long sets)
```
         [SCORPION LOGO - centered]
              9/2024

    A YEAR WITH THE PROFESOR
    THE HYDROMANCER

    ROOM 505
    HAUNTED HIGHWAY
    NIX ST

    WE WELCOME THE LIVING
    CAUGHT DEAD
    ZOMBIE DANCE PARTY
    ...
```
- Blank lines between groups signal energy breaks — no explicit divider text
- All songs centered in single column

### Key design observations from real examples:
- **No sequential numbers** — titles only
- **All caps**, always
- **Abbreviated titles are fine** — the band knows
- **Venue optional on print** — checkbox per set; default hidden
- **Date optional on print** — checkbox per set; default shown
- **The dash `-` is the only divider symbol used**
- Font is Bebas Neue throughout; footer is same font at smaller size

---

## 3. Set Length Modes

Set lists are built in one of three modes, selected at creation. Mode drives layout, font sizing, and column logic automatically — no manual layout toggle needed.

| Mode | Target length | Typical song count | Layout | Font goal |
|---|---|---|---|---|
| **Short** | ~30 min support slot | ~13 songs | Two-column | Maximum — largest readable font |
| **Medium** | ~30 min headline | ~16–20 songs | Two-column | Large |
| **Long** | ~60 min headline | ~22–28 songs | Single-column | Fills page at smaller size |

**Font scaling logic (print):** Goal is always the largest possible Bebas Neue that fits all songs on a single page without wrapping or overflow. Computed at render time:

```js
function computePrintLayout(songCount) {
  const pageHeightPt    = 792;  // 11in * 72
  const topMargin       = 54;   // 0.75in
  const bottomMargin    = 54;
  const headerBlock     = 90;   // logo + optional venue/date
  const footerBlock     = 30;
  const available       = pageHeightPt - topMargin - bottomMargin - headerBlock - footerBlock;
  const lineHeightRatio = 1.3;
  const maxFontPt       = 28;
  const minFontPt       = 11;

  function fontForColumns(cols) {
    const rowsPerCol = Math.ceil(songCount / cols);
    return (available / rowsPerCol) / lineHeightRatio;
  }

  let columns  = songCount <= 20 ? 2 : 1;
  let fontSize = fontForColumns(columns);
  fontSize = Math.max(minFontPt, Math.min(fontSize, maxFontPt));
  return { columns, fontSize };
}
```

A 13-song two-column set will have noticeably larger text than a 26-song single-column set. A bandmate should read the list from arm's length in low stage light without squinting.

**Column split (two-column):** Left column = `ceil(n/2)` songs automatically.

---

## 4. Display Title Abbreviation Rules

All titles render ALL CAPS. `display_title` in the Google Sheet is the stage shorthand — what actually appears on the set list. Rules for generating/seeding display titles, applied in order:

1. **Drop leading "The"** — "The Hydromancer" → `HYDROMANCER`, "The Lurker" → `LURKER`
2. **Drop leading "A"** — "A Year With The Professor" → `YEAR WITH THE PROFESOR`
3. **Shorten long subtitles** — drop parentheticals if short form is unambiguous: "We Welcome The Living (But Only If They Come Here To Die!)" → `WE WELCOME`
4. **Contract common words** — "North Texas" → `N TX`, "Straight To" → `2`, optional "Of" drop, etc.
5. **Honor archive convention** — if a shorthand already exists in real set lists, use it: `DESMO`, `BEAT U UP`, `NAMELESS 1`, `CAUGHT DED`, `N TX`
6. **Catalog admin can always override** — `display_title` is editable per song in the catalog UI

These are seeding guidelines, not enforced by the app. The field is free text.

---

## 5. Goals

- Maintain a song catalog seeded from Bandcamp, managed manually going forward
- Build set lists by selecting and ordering songs from the catalog
- Auto-select layout and font size based on song count
- Scale font size dynamically — largest that fits the page/screen for the given song count
- Attach a date (print-optional, default shown) and optional venue (print-optional, default hidden) to each set list
- Support multi-night use: clone a set list for a new date without rebuilding
- Generate a print-ready PDF matching the established format exactly
- Serve a mobile dark-mode read-only view at a shareable URL for each set list
- Install as a PWA: keeps screen awake on stage, launches fullscreen from home screen icon
- Web builder UI is light mode; mobile read view is dark mode
- Support both black and white logo variants, selectable per set list
- Archive all set lists retrievable by date
- Host at `set.horror.surf` via GitHub Pages + Google Sheets backend

---

## 6. Non-Goals

- No public-facing pages; no fan access (soft restriction only — see Section 15)
- No live sync with Bandcamp (one-time seed import only)
- No user accounts or authentication (Google OAuth deferred to future)
- No audio playback
- No drag-and-drop on mobile (up/down buttons only)
- No setlist.fm integration
- No song duration tracking
- No automatic Google Drive document creation — writes go only to Google Sheets rows

---

## 7. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Vanilla HTML/CSS/JS (single-page app) | No build step; GitHub Pages native; small scope |
| Hosting | GitHub Pages | Free, version-controlled, no server needed |
| Data | Google Sheets via Sheets API v4 | Free; band already has Drive folder; human-readable fallback |
| PDF | Client-side `jsPDF` + `html2canvas` | No server; renders styled HTML directly |
| Reorder | SortableJS | Lightweight drag-and-drop for desktop builder; no framework needed |
| Font | Bebas Neue via Google Fonts CDN | Matches all existing set lists exactly |
| Logo | `scorpion-black.png` + `scorpion-white.png` | Selected per set in builder |
| Domain | `set.horror.surf` via Name.com CNAME | Already owned |
| PWA | Web App Manifest + Service Worker | Enables Add to Home Screen, fullscreen, wake lock |

**Google Sheets structure:** One workbook in the existing Drive folder (`1xPTfhq2LsEXtoigFIs_1UdzG_L0y1PTH`), two sheets:

`songs` sheet columns:
```
id | title | display_title | album | year | notes | active
```
- `title` = canonical full title (e.g., "Desmodontinae")
- `display_title` = stage shorthand; auto-generated from abbreviation rules if blank; used on all set list output
- `notes` = optional stage annotation (e.g., "DROP D") — shown only in builder, never on print or mobile view
- `active` = TRUE/FALSE; FALSE hides from builder song picker

`setlists` sheet columns:
```
id | date | venue | mode | song_ids | divider_positions | show_date | show_venue | logo_variant | notes | created_at
```
- `song_ids` = pipe-delimited ordered song IDs (e.g., `42|17|8|33`)
- `divider_positions` = comma-delimited indices after which a `-` divider appears
- `mode` = `short` | `medium` | `long`
- `show_date` = TRUE/FALSE (default TRUE)
- `show_venue` = TRUE/FALSE (default FALSE)
- `logo_variant` = `black` | `white` (default `black`)

---

## 8. Design System

### Three Rendering Contexts

| Context | Mode | Used by | Environment |
|---|---|---|---|
| Builder / Archive | Light | Whoever is building the set list | Home, rehearsal, backstage — ambient light |
| Mobile Read View | Dark | All bandmates | On stage — low/colored light, arm's-length glance |
| PDF / Print | B&W | Whoever prints | Paper — always black on white |

---

### Light Mode (Builder / Archive)

Used at home, rehearsal, backstage. Extended editing sessions. Light mode is correct for text-heavy task interfaces in bright environments. Off-white background (not stark `#FFFFFF`) reduces glare.

**Layout approach:** Single main column for the set list and forms, secondary panel for details. Cards/panels on white delineate sections without heavy borders. Group related fields (metadata, songs, notes) in visually separated blocks. Drag-and-drop reordering via SortableJS with handle icon, elevated row on drag, visible drop indicator line. Up/down buttons present on all screen sizes as fallback.

---

### Dark Mode (Mobile Read View)

Used on stage in low or colored light. Dark mode reduces screen glare that would blind the performer and distract the audience, preserves night vision, keeps focus on the list.

Key implementation notes:
- Avoid pure `#000000` background — use `#121212` to prevent halation (white text glowing/blurring on OLED screens)
- Avoid pure `#FFFFFF` text — use `#F0F0F0` for same reason
- Letter-spacing `0.04em` improves uppercase legibility at large sizes on dark backgrounds
- Bebas Neue at large sizes on dark background is highly legible; minimum 44px for stage glanceability
- Accent colors need slight brightness adjustment on dark bg to maintain WCAG contrast ≥ 4.5:1
- No decorative chrome — borders, shadows, and thin separators all removed; any section break is `rgba(255,255,255,0.06)` max

---

### Design Tokens

| Token | Light Mode (Builder) | Dark Mode (Mobile) | Print/PDF |
|---|---|---|---|
| Background | `#F5F5F0` | `#121212` | `#FFFFFF` |
| Primary text | `#1A1A1A` | `#F0F0F0` | `#000000` |
| Secondary text | `#555555` | `#999999` | — |
| Accent red | `#BA2125` | `#C93030` | — |
| Accent orange | `#F77515` | `#F77515` | — |
| Accent yellow | `#F3C70C` | `#F3C70C` | — |
| Divider/rule | `#DDDDDD` | `rgba(255,255,255,0.06)` | `#000000` solid rule |
| Primary font | `'Bebas Neue', sans-serif` | `'Bebas Neue', sans-serif` | `'Bebas Neue', sans-serif` |
| UI body font | `system-ui, sans-serif` | — | — |

---

### Logo Variants

Two PNG assets committed to `/assets/`:
- `scorpion-black.png` — for print (black on white), light mode builder header
- `scorpion-white.png` — for mobile dark view (always), optional dark print variant

**Logo usage by context:**
- Builder UI: `scorpion-black.png` in header
- Mobile read view: `scorpion-white.png` always, regardless of PDF setting
- PDF: whichever variant is selected in builder (`black` default)

---

### CSS Key Patterns

**Fluid font scaling (mobile stage view):**
```css
.stage-list li {
  font-family: 'Bebas Neue', system-ui, sans-serif;
  font-size: clamp(2.2rem, 8vw, 4rem);
  line-height: 1.35;
  letter-spacing: 0.04em;
}
```

**Full-bleed stage surface (notch/gesture-area safe):**
```css
.stage-root {
  min-height: 100dvh;
  background: #121212;
  color: #F0F0F0;
  padding:
    calc(1rem + env(safe-area-inset-top))
    calc(1rem + env(safe-area-inset-right))
    calc(1.5rem + env(safe-area-inset-bottom))
    calc(1rem + env(safe-area-inset-left));
}
```

---

## 9. PWA Configuration

The mobile read view is installable as a PWA so bandmates can add it to their home screen and launch it fullscreen with the screen staying awake during a set.

### Web App Manifest (`/manifest.json`)
```json
{
  "name": "BTDOAGS Set List",
  "short_name": "Setlist",
  "id": "/",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#121212",
  "theme_color": "#121212",
  "icons": [
    { "src": "/assets/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/assets/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Required HTML `<head>` meta tags
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="/manifest.json">
```

### Screen Wake Lock
Auto-engaged on entering any read view (`/[id]`):

```js
let wakeLock = null;

async function enableWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
  } catch (err) {
    console.error(err.name, err.message);
  }
}

document.addEventListener('visibilitychange', () => {
  if (wakeLock !== null && document.visibilityState === 'visible') {
    enableWakeLock();
  }
});
```

Show a small persistent status indicator on the read view: "● Screen awake" / "○ Screen may sleep" so the performer knows if wake lock was granted (battery saver mode can deny it).

### Fullscreen
Must be triggered by user gesture — tie it to an "Enter Stage View" button visible at the bottom of the read view:

```js
stageButton.addEventListener('click', async () => {
  await document.documentElement.requestFullscreen?.();
  enableWakeLock();
});
```

### Install Prompt (first visit)

**Android:** Intercept `beforeinstallprompt`, show banner: *"Add to Home Screen for stage use."* Suppress after seen, using `localStorage`.

**iOS:** Detect `navigator.standalone === false` + iOS UA. Show manual instruction: *"Tap Share → Add to Home Screen."* Same suppression logic.

**Already installed:** `navigator.standalone === true` → no prompt shown.

One-time in-app instruction shown after first install: *"For shows: open from your home screen icon, then tap Enter Stage View to go fullscreen and keep the screen awake."*

---

## 10. Set List Builder

### Create Flow
1. Click "New Set List"
2. Enter metadata:
   - **Date** (required; "Show on PDF" toggle — default ON)
   - **Venue** (optional; "Show on PDF" toggle — default OFF)
   - **Set length mode**: Short / Medium / Long (drives layout and font size automatically)
   - **Logo variant**: Black / White (default: Black)
   - **Notes** (internal only, never printed)
3. Song picker: searchable/filterable list of all `active: TRUE` songs, click to add
4. Reorder: drag handle (desktop, SortableJS) + up/down arrow buttons (all screen sizes)
5. Insert divider: "Add Break" button inserts a `-` row at current position
6. Live preview: always visible alongside builder, updates in real time, shows exactly what will print
7. Save → writes to Google Sheets `setlists` sheet

### Edit Flow
- Load any set list from archive → same builder UI, pre-populated
- Save overwrites existing record

### Clone Flow
- "Clone" button on any archived set list → duplicates with blank date
- Prompts for new date immediately
- Notes field auto-filled: "Cloned from [original date]"

### Multi-Night Handling
Clone once per night. Each night is its own record. Each can diverge freely.

---

## 11. PDF Output

### Spec
- Page: Letter (8.5" × 11"), portrait
- Margins: ~0.75" all sides
- Font: Bebas Neue throughout
- Logo: selected variant PNG

**Header block:**
- Scorpion logo PNG, centered, ~1" tall
- Date below logo, centered, ~18pt — only if `show_date: TRUE`
- Venue below date — only if `show_venue: TRUE`

**Two-column body (Short / Medium):**
- Two equal columns; left = `ceil(n/2)` songs
- Font size: computed by `computePrintLayout()` — largest that fills page without overflow
- Each song: `display_title` in Bebas Neue, line height 1.3
- `-` divider: lone dash in column position, same font size
- No numbers, no bullets

**Single-column body (Long):**
- All songs centered
- Same font auto-sizing logic
- Extra blank line at divider positions

**Footer (always present):**
```
BEWARE THE DANGERS OF A GHOST SCORPION!
HTTP://HORROR.SURF
```
~10pt, centered, bottom of page.

**Generation:**
- Render hidden `<div id="print-target">` with print layout
- `html2canvas` → `jsPDF` wraps as one PDF page
- "Download PDF" button on read view and archive view
- Filename: `BTDOAGS_[YYYYMMDD]_[venue-slug].pdf`

---

## 12. Mobile Read View

**URL:** `set.horror.surf/[id]`

**Design — dark mode, stage-optimized:**
- Background: `#121212`
- Primary text: `#F0F0F0`
- Logo: `scorpion-white.png`, centered, ~60px tall
- Date + venue (if present): small Bebas Neue, `#999999`, top of page, low emphasis
- Song titles: Bebas Neue, `clamp(2.2rem, 8vw, 4rem)`, all caps, centered, full-width
- `-` divider rows: accent red `#C93030`, centered
- Footer: `#555555`, small
- **Zero UI chrome** — no nav, no edit controls
- Natural scroll, no pagination
- Wake lock auto-engaged on page load
- "Enter Fullscreen" button at bottom of page (requires user gesture per browser spec)
- Wake lock status indicator: small, unobtrusive

---

## 13. Information Architecture

```
set.horror.surf/
├── /                     → Archive: all set lists, reverse-chronological
├── /new                  → Builder: create new set list
├── /[id]                 → Read view (mobile dark mode, shareable link)
├── /[id]/edit            → Edit existing set list
└── /catalog              → Song catalog management
```

---

## 14. Archive View

- All saved set lists, newest first
- Each row: **date** | venue | mode | song count | [View] [Edit] [Clone] [PDF]
- No deletion in UI; archive is permanent (edit to correct mistakes)
- Light mode, clean table layout

---

## 15. Access Model

**Current:** No auth. Tool is accessible to anyone with the URL. The URL is not publicized and has no SEO. The band is comfortable with this.

**What is NOT accessible without credentials:**
- Google Sheets writes are gated by service account credentials, injected at build time via GitHub Secrets, never exposed to the browser
- The Google Drive folder is not linked from the app
- No Google Drive document creation at any point — app writes only to Sheets rows

**Future (when needed):** Add Google OAuth. The entire band already has access to the Drive folder (`1xPTfhq2LsEXtoigFIs_1UdzG_L0y1PTH`). Auth gate = "user must be signed in with a Google account that has Editor access to that folder." Zero account management needed.

**Do not build OAuth now.**

---

## 16. Google Sheets API Setup

1. Create a Google Cloud project
2. Enable the Google Sheets API
3. Create a Service Account
   - Download JSON key
   - Store as GitHub Secret: `SHEETS_SERVICE_ACCOUNT`
   - GitHub Actions injects into `config.js` at build time (gitignored)
   - Share workbook with service account email as Editor
4. For reads: API key restricted to Sheets API; workbook shared "anyone with link can view"

**Quota:** 300 reads/min, 60 writes/min — irrelevant at this scale.

---

## 17. Domain Setup (Name.com → GitHub Pages)

In Name.com DNS:
```
Type: CNAME
Host: set
Value: [github-username].github.io
TTL: 300
```

In GitHub repo:
- Settings → Pages → Custom domain: `set.horror.surf`
- Add `CNAME` file to repo root containing `set.horror.surf`
- Enable HTTPS (Let's Encrypt, auto after DNS propagates)

---

## 18. Song Catalog Seed Data

58 songs. Pre-populated from Bandcamp + real set list archive. Display titles apply abbreviation rules from Section 4.

`active: TRUE` = currently in rotation; `active: FALSE` = catalog-only, not surfaced in builder by default.

| display_title | canonical_title | album | year | active |
|---|---|---|---|---|
| VILE CHAT | Vile Chat | Vile Chat EP | 2025 | TRUE |
| KINGS SIP | The King's Sip | Vile Chat EP | 2025 | TRUE |
| HEADLESS / SEVERED | The Headless Dead pts I & II | Vile Chat EP | 2025 | TRUE |
| ROCK HUDSON | Rock Hudson | Acid Chalet | 2023 | TRUE |
| DESMO | Desmodontinae | Acid Chalet | 2023 | TRUE |
| NIX ST | Nix Street | Acid Chalet | 2023 | TRUE |
| HYDROMANCER | The Hydromancer | Acid Chalet | 2023 | TRUE |
| YEAR WITH THE PROFESOR | A Year With The Professor | Acid Chalet | 2023 | TRUE |
| ACID CHALET I | Theme From Acid Chalet Pt I | Acid Chalet | 2023 | TRUE |
| ACID CHALET II | Theme From Acid Chalet Pt II | Acid Chalet | 2023 | TRUE |
| ACID CHALET III | Theme From Acid Chalet Pt III | Acid Chalet | 2023 | TRUE |
| WHERE'D THAT WHITE GHOST GO | Where'd That White Ghost Go? | Acid Chalet | 2023 | TRUE |
| SINCERELY SATAN | Sincerely Satan (Of Sin City!) | Acid Chalet | 2023 | TRUE |
| SCREAMS OF THE RAT MEN | Screams Of The Rat Men | Acid Chalet | 2023 | TRUE |
| DREAMS OF THE FAT MEN | Dreams Of The Fat Men | Acid Chalet | 2023 | FALSE |
| COME SEE THE CREATURE | Come See The Creature | Acid Chalet | 2023 | FALSE |
| BLACK WINE | Black Wine | Acid Chalet | 2023 | FALSE |
| PSYCHOTROPICA | Psychotropica | Acid Chalet | 2023 | FALSE |
| DREADFUL DRECK | Dreadful Dreck | Acid Chalet | 2023 | FALSE |
| CONSIDERING JOINING THE DEMON | I Am Considering Joining Up With The Demon | Acid Chalet | 2023 | FALSE |
| WESTWAY FORD | Westway Ford Cemetery | Beware The Dangers Of A Ghost Scorpion! | 2020 | TRUE |
| PARASITE MANSION | Parasite Mansion | Beware The Dangers Of A Ghost Scorpion! | 2020 | TRUE |
| RIP THE CLOWN | R.I.P. The Clown | Beware The Dangers Of A Ghost Scorpion! | 2020 | TRUE |
| I SEE THEM HEADS | I See Them Heads But Not Them Bodies | Beware The Dangers Of A Ghost Scorpion! | 2020 | TRUE |
| SHE'S HOWLIN | She's Howlin' | Beware The Dangers Of A Ghost Scorpion! | 2020 | TRUE |
| BORIS FRANKENSTEIN | Boris Frankenstein's Nightmare | Beware The Dangers Of A Ghost Scorpion! | 2020 | FALSE |
| I'M SHY | I'm Shy | Beware The Dangers Of A Ghost Scorpion! | 2020 | FALSE |
| GRIM WAGER | A Grim Wager | Beware The Dangers Of A Ghost Scorpion! | 2020 | FALSE |
| LEAST OF ALL MONSTERS | Least Of All Monsters | Beware The Dangers Of A Ghost Scorpion! | 2020 | FALSE |
| BEAT U UP | Me And Him Are Gonna Beat You Up | Beware The Dangers Of A Ghost Scorpion! | 2020 | TRUE |
| CAUGHT DED | Caught Dead | Caught Dead EP | 2014 | TRUE |
| SAFARI ZONE | Safari Zone | Caught Dead EP | 2014 | TRUE |
| TEXAS BLOOD MONEY | Texas Blood Money | Caught Dead EP | 2014 | TRUE |
| PLANET SLIME | Planet Slime | Caught Dead EP | 2014 | TRUE |
| TERRIFYING MASTER | Terrifying Master | Boss Metal Zone EP | 2015 | FALSE |
| 2 DARKNESS | Straight To Darkness | Boss Metal Zone EP | 2015 | TRUE |
| AS HOT AS HELL | As Hot As Hell | Boss Metal Zone EP | 2015 | FALSE |
| FULL O BLOOD | Full Of Blood | Boss Metal Zone EP | 2015 | TRUE |
| CATEYE GLASSES | Cateye Glasses | Blood Drinkers Only | 2013 | FALSE |
| LOVER'S CURSE | The Lover's Curse | Blood Drinkers Only | 2013 | FALSE |
| NAMELESS 1 | The Nameless One | Blood Drinkers Only | 2013 | TRUE |
| SATAN'S INVISIBLE WORLD | Satan's Invisible World...Revealed! | Blood Drinkers Only | 2013 | TRUE |
| HAINTMAKER | Haintmaker | Blood Drinkers Only | 2013 | TRUE |
| ROOM 505 | Room 505 | Blood Drinkers Only | 2013 | TRUE |
| BLOOD DRINKERS ONLY | Blood Drinkers Only | Blood Drinkers Only | 2013 | FALSE |
| CHRIS'S GALAXY | Christopher's Galaxy | Blood Drinkers Only | 2013 | TRUE |
| HAUNTED HIGHWAY | Haunted Highway | Blood Drinkers Only | 2013 | TRUE |
| BLACK CRESCENT | Black Crescent | Blood Drinkers Only | 2013 | FALSE |
| 13 STABS | 13 Stabs | Blood Drinkers Only | 2013 | FALSE |
| RED RIVER | Red River Tombstone Hustle | 5 After Midnight | 2011 | TRUE |
| LURKER | The Lurker | 5 After Midnight | 2011 | FALSE |
| N TX | North Texas Cobra Squadron Theme | 5 After Midnight | 2011 | TRUE |
| UNFORGETTABLE SKULL DEFORMATION | Unforgettable Skull Deformation | 5 After Midnight | 2011 | FALSE |
| DENTON COUNTY CASKET CO | Denton County Casket Company | 5 After Midnight | 2011 | FALSE |
| WE WELCOME | We Welcome the Living (But Only If They Come Here to Die) | The Legend Of Goatman's Bridge | 2011 | TRUE |
| THEY WONT STAY DEAD | They Won't Stay Dead! | The Legend Of Goatman's Bridge | 2011 | FALSE |
| HEADS WILL ROLL | Heads Will Roll! | The Legend Of Goatman's Bridge | 2011 | TRUE |
| GOATMAN'S BRIDGE | Goatman's Bridge | The Legend Of Goatman's Bridge | 2011 | FALSE |
| ZOMBIE DANCE PARTY | Zombie Dance Party | unreleased | — | TRUE |
