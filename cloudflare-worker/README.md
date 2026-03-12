# CORS Proxy for Apps Script

Google Apps Script Web Apps **do not support CORS** from browsers: they block OPTIONS requests and don't return `Access-Control-Allow-Origin`. This worker proxies requests and adds the required headers.

## One-time setup (~5 min)

### 1. Create a Cloudflare account
Sign up at [dash.cloudflare.com](https://dash.cloudflare.com) (free).

### 2. Install Wrangler
```bash
npm install -g wrangler
wrangler login
```

### 3. Deploy the worker
```bash
cd cloudflare-worker
wrangler deploy
```

You'll get a URL like `https://setlist-api-proxy.<your-subdomain>.workers.dev`

### 4. Update config.js
Add the worker URL to `js/config.js`:

```javascript
APPS_SCRIPT_PROXY_URL: 'https://setlist-api-proxy.<your-subdomain>.workers.dev',
```

### 5. Deploy your site
Push to GitHub. Saves will now go through the proxy and work.

---

## If the Apps Script URL changes

Edit `worker.js` and update the `APPS_SCRIPT_URL` constant, then run `wrangler deploy` again.
