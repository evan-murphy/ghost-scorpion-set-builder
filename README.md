# BTDOAGS Set List Tool

Set list builder and archive for **Beware The Dangers Of A Ghost Scorpion!**

## Quick Start

For path-based routing (required for refresh on /new, /sl1, etc.):

```bash
npx serve -s -l 8080
```

Or with Python (home page works; avoid refreshing on sub-routes):

```bash
python3 -m http.server 8080
```

Open http://localhost:8080

## Features

- **Archive** — View all set lists, newest first
- **Builder** — Compose set lists (draft + preview); Save to sheet (auth required)
- **Read View** — Mobile-optimized dark mode for stage use
- **PDF** — Download print-ready PDF
- **Catalog** — Browse song catalog; edit display titles (auth required to save to sheet)

## Switching to Real Data

1. Use two Google Sheets: one for songs, one for setlists (or create them)
2. Get a Google API key with Sheets API enabled
3. Edit `js/config.js`:
   - `USE_MOCK: false`
   - `SONGS_SHEET_ID: 'your-songs-spreadsheet-id'`
   - `SETLISTS_SHEET_ID: 'your-setlists-spreadsheet-id'`
   - `API_KEY: 'your-api-key'`
   - If your sheet tabs aren’t named `Sheet1`, set `SONGS_RANGE` and `SETLISTS_RANGE` accordingly (e.g. `songs!A2:G`)

## Enabling Save (Auth + Apps Script)

1. **OAuth Client ID** — In Google Cloud Console, create OAuth 2.0 credentials (Web application). Add authorized JavaScript origins (`http://localhost:8080`, `https://set.horror.surf`). Add `GOOGLE_CLIENT_ID` to `config.js`.
2. **Apps Script** — Copy `apps-script/Code.gs` to a new project at script.google.com. Add band emails to `ALLOWLIST`. Deploy as Web app (Anyone). Add the Web app URL to `config.js` as `APPS_SCRIPT_URL`.

See `apps-script/README.md` for full setup.

## Deploy to GitHub Pages

1. Push to GitHub
2. Settings → Pages → Source: main branch
3. Add custom domain: `set.horror.surf` (CNAME file included)
