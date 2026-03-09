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

## 3. Sheet names

If your sheet tabs are not named `Sheet1`, update:

```javascript
SONGS_SHEET_NAME: 'songs',   // or your tab name
SETLISTS_SHEET_NAME: 'setlists'
```

## 4. Deploy as web app

1. Click **Deploy** → **New deployment**
2. Type: **Web app**
3. Description: e.g. "BTDOAGS Set List API"
4. **Execute as:** Me
5. **Who has access:** Anyone
6. Click **Deploy**
7. Copy the **Web app URL** and add it to `js/config.js` as `APPS_SCRIPT_URL`

## 5. OAuth client ID (for Sign-in)

The app uses Google Identity Services for sign-in. You need an OAuth 2.0 Client ID:

1. Go to [Google Cloud Console](https://console.cloud.google.com) → your project
2. **APIs & Services** → **Credentials**
3. **Create Credentials** → **OAuth client ID**
4. Application type: **Web application**
5. Add **Authorized JavaScript origins:**
   - `http://localhost:8080` (for local dev)
   - `https://set.horror.surf` (or your production URL)
6. Copy the **Client ID** and add it to `js/config.js` as `GOOGLE_CLIENT_ID`

## 6. OAuth consent screen

If you haven’t already:

1. **APIs & Services** → **OAuth consent screen**
2. User type: **External** (or Internal for workspace)
3. Add the required app info and save
