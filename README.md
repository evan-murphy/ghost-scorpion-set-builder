# BTDOAGS Set List

A set list builder and archive for **Beware The Dangers Of A Ghost Scorpion!** — built to replace the band’s old workflow of rebuilding lists from memory and printing ad-hoc.

**Live:** [set.horror.surf](https://set.horror.surf)

---

## What it does

- **Setlists** — Browse all set lists (Tonight card when relevant), create new, duplicate, edit; header "New setlist" button
- **Builder** — Compose set lists by picking songs, reordering, and adding breaks; live preview as you edit
- **Read view** — Mobile-optimized dark mode for on-stage use
- **PDF** — Download print-ready PDFs that match the band’s existing format
- **Catalog** — Browse the song catalog and edit display titles (stage shorthand)
- **Random mode** — On a blank set list, tap the bat button to fill with 13 random songs

---

## Under the hood

### Stack

- **Vanilla JS** — No framework. Client-side routing, modular scripts, and a single HTML shell.
- **Google Sheets** — Backend. Songs and set lists live in two spreadsheets; reads use the Sheets API, writes go through an Apps Script web app.
- **PWA** — Installable on mobile with a wake lock so the screen stays on during shows.

### Design choices

**Fidelity to the real format** — The output matches the band’s existing printed set lists: Bebas Neue, all caps, no numbers, a lone `—` for breaks. Two-column for short/medium sets, single-column for long sets.

**Dynamic font scaling** — Font size is computed so the largest readable text fits on one page. A 13-song set gets bigger type than a 26-song set. The goal: readable from arm’s length in low stage light.

**Display titles** — Songs have a `display_title` field for stage shorthand (e.g. “Desmodontinae” → `DESMO`, “North Texas Cobra Squadron Theme” → `N TX`). Editable per song in the catalog.

**Draft persistence** — Edits are saved to `localStorage` as you work. Navigate away or refresh and your draft is still there.

**Clear-inspired builder** — The builder UI uses bottom sheets and gesture-friendly controls instead of a traditional form layout.

### Project structure

```
├── js/
│   ├── app.js          # Routing
│   ├── data.js         # Sheets API + mock data
│   ├── builder.js      # Set list composer (Clear-style UI)
│   ├── archive.js      # Setlists home (list, Tonight card)
│   ├── read-view.js    # Stage view (dark, fullscreen)
│   ├── catalog.js      # Song catalog
│   ├── pdf.js          # PDF generation (jsPDF + html2canvas)
│   ├── auth.js         # Google Sign-In
│   ├── draft-store.js  # localStorage drafts
│   └── pwa.js          # Wake lock, install prompt
├── apps-script/
│   └── Code.gs         # Server-side: save setlists, catalog edits
└── css/
    └── clear-builder.css  # Builder styles
```

---

## For developers

**Run locally** (for path-based routing on `/new`, `/sl1`, etc.):

```bash
npx serve -s -l 8080
```

Then open http://localhost:8080

**Configure your own instance** — Edit `js/config.js` for sheet IDs, API key, and OAuth. See `apps-script/README.md` for the Apps Script setup.

**Save / CORS** — Apps Script blocks CORS from browsers. Deploy the Cloudflare Worker proxy (`cloudflare-worker/README.md`) and set `APPS_SCRIPT_PROXY_URL` in config.
