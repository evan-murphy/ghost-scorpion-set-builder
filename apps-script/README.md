# Apps Script Setup

This script handles authenticated writes to your Google Sheets (setlists and catalog display titles).

## 1. Create the script

1. Go to [script.google.com](https://script.google.com)
2. New project
3. Replace the default `Code.gs` with the contents of `Code.gs` in this folder

## 2. Configure the allowlist

In `Code.gs`, edit the `ALLOWLIST` array and add band member emails (lowercase):

```javascript
ALLOWLIST: [
  'member1@example.com',
  'member2@example.com'
]
```

## 3. Songs sheet columns

The Songs sheet should have columns A–J:

| Col | Header        | Description                          |
|-----|---------------|--------------------------------------|
| A   | id            | Numeric ID                           |
| B   | title         | Canonical title                      |
| C   | display_title | Set list display (e.g. shortened)   |
| D   | album         | Album name                           |
| E   | year          | Release year                         |
| F   | notes         | Notes                                |
| G   | active        | TRUE/FALSE                           |
| H   | duration_sec  | Track length in seconds (Bandcamp)   |
| I   | artwork       | Album art URL (Bandcamp)             |
| J   | song_type     | rocker, ripper, new, bring_it_down, neutral |

Add headers for H, I, J if they don’t exist. Run `scripts/bandcamp-extract/extract.js` to populate duration and artwork.

## 4. Sheet names

If your sheet tabs are not named `Sheet1`, update:

```javascript
SONGS_SHEET_NAME: 'songs',   // or your tab name
SETLISTS_SHEET_NAME: 'setlists'
```

## 5. Deploy as web app

1. Click **Deploy** → **New deployment**
2. Type: **Web app**
3. Description: e.g. "BTDOAGS Set List API"
4. **Execute as:** Me
5. **Who has access:** Anyone
6. Click **Deploy**
7. Copy the **Web app URL** and add it to `js/config.js` as `APPS_SCRIPT_URL`

**Important:** Apps Script does not support CORS from browsers. You must also deploy the CORS proxy (see `cloudflare-worker/README.md`) and set `APPS_SCRIPT_PROXY_URL` in config.

## 6. OAuth client ID (for Sign-in)

The app uses Google Identity Services for sign-in. You need an OAuth 2.0 Client ID:

1. Go to [Google Cloud Console](https://console.cloud.google.com) → your project
2. **APIs & Services** → **Credentials**
3. **Create Credentials** → **OAuth client ID**
4. Application type: **Web application**
5. Add **Authorized JavaScript origins:**
   - `http://localhost:8080` (for local dev)
   - `https://set.horror.surf` (or your production URL)
6. Copy the **Client ID** and add it to `js/config.js` as `GOOGLE_CLIENT_ID`

## 7. OAuth consent screen

If you haven’t already:

1. **APIs & Services** → **OAuth consent screen**
2. User type: **External** (or Internal for workspace)
3. Add the required app info and save

## 8. Setlists: one source of truth (Google Sheet)

The live app reads setlists **only** from the Google Sheet (when `USE_MOCK` is false in `js/config.js`). Git holds `sheets-import/setlists.csv` as the versioned copy you merge in PRs; it is **not** pushed to the Sheet automatically when you push to GitHub.

**After you add or change rows in `sheets-import/setlists.csv` and merge to `main`:**

1. Copy the latest `Code.gs` from this repo into your Apps Script project (or redeploy from your usual workflow) so `syncSetlistsFromRepoCsv` exists.
2. In the Apps Script editor, choose **`syncSetlistsFromRepoCsv`** in the function dropdown and click **Run** (authorize if prompted).
3. The script fetches the CSV from GitHub `raw` and **appends** any `id` that is not already on the setlists tab. Existing rows are never overwritten.

Forks: Project settings → Script properties → add `SETLISTS_CSV_URL` = your raw `setlists.csv` URL.

**Alternative:** In Google Sheets, **File → Import** the CSV row into the setlists tab (same columns as above).
