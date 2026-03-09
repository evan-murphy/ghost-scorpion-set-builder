/**
 * BTDOAGS Set List — Configuration
 *
 * For read-only with mock data: USE_MOCK = true (default)
 * For real Google Sheets: set USE_MOCK = false and add IDs + API_KEY
 */
const CONFIG = {
  USE_MOCK: false,
  SONGS_SHEET_ID: '1qEl-eCzp5cy_5tWqsS4FgCYEM0BGR8JRC8lv3MzeyZU',
  SETLISTS_SHEET_ID: '1lrE0Esgo0Lu7-7Bn5j91xhzlcjYEwkSRq_LCzMbwZqE',
  API_KEY: 'AIzaSyDfOX4JsSmKnT8Eo0-Ico8q6bs6I5wPrMo',
  // Sheet tab name if not "Sheet1" (e.g. "songs", "setlists")
  SONGS_RANGE: 'Sheet1!A2:G',
  SETLISTS_RANGE: 'Sheet1!A2:K',
  // Google Sign-In (OAuth 2.0 Web client ID from Cloud Console)
  GOOGLE_CLIENT_ID: '755824588930-6dqh3gi7vc0u628irgn4bparcgdhetb0.apps.googleusercontent.com',
  // Apps Script Web App URL (after deploying as web app, Execute as: Me, Who has access: Anyone)
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyePfMmUyr6g7m7oUdesfUYhH2Vy3c_PxD7v42TpYFS9uKkL-Bpq08CA8_nYLe7reI/exec',
  // Base path for GitHub Pages (e.g. '/ghost-scorpion-set-builder' if repo name)
  BASE_PATH: ''
};
