# Google Sign-In Debugging Guide

## Quick diagnostic

1. **Run the debug page** from the same URL/origin as your app:
   - Local: `http://localhost:8080/debug-google-auth.html`
   - Production: `https://your-domain.com/debug-google-auth.html`

2. **Copy the results** (click "Copy results to clipboard") and share them.

3. **Check Chrome DevTools Console** (F12 → Console):
   - Any red errors when you load the app or click "Sign in with Google"?
   - Copy those errors — they often pinpoint the issue.

---

## Common failure causes

### 1. **Authorized JavaScript origins** (most common)

Google OAuth requires your **exact** page origin to be in the OAuth client allowlist.

- Go to [Google Cloud Console](https://console.cloud.google.com) → your project
- **APIs & Services** → **Credentials** → your OAuth 2.0 Client ID (Web application)
- Under **Authorized JavaScript origins**, add:
  - `http://localhost:8080` (or whatever port you use locally)
  - `https://set.horror.surf` (or your production URL)
  - `https://yourusername.github.io` (if using GitHub Pages)

**Must match exactly** — no trailing slash, correct protocol (http vs https), correct port.

### 2. **Script load order** (fixed in this repo)

The GSI script used to load before `config.js` and `auth.js`. If it finished before those ran, `AUTH.init()` was never called. The script order has been corrected so `config` and `auth` load first.

### 3. **file:// protocol**

Google blocks Sign-In on `file://` URLs. Use a local server:

```bash
npx serve .
# or
python -m http.server 8080
```

Then open `http://localhost:8080`.

### 4. **OAuth consent screen**

If the consent screen isn’t configured:

- **APIs & Services** → **OAuth consent screen**
- Add app name, support email, developer contact
- Add your email as a test user if the app is in "Testing" mode

### 5. **Third-party cookies**

Some browsers block third-party cookies, which can affect Google Sign-In. Try:

- Disabling strict tracking/cookie blocking for your site
- Using a normal (non-incognito) window

---

## What to share when asking for help

1. Output from `debug-google-auth.html` (copy button)
2. Any red errors from Chrome DevTools Console
3. The exact URL you’re using (e.g. `http://localhost:3000` vs `https://set.horror.surf`)
4. Whether you’re on localhost, GitHub Pages, or another host
