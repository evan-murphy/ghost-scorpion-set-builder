/**
 * CORS proxy for Google Apps Script Web App
 *
 * Google Apps Script blocks OPTIONS and doesn't return CORS headers.
 * This worker proxies requests and adds the required headers.
 *
 * One-time setup: https://developers.cloudflare.com/workers/get-started/guide
 */

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyePfMmUyr6g7m7oUdesfUYhH2Vy3c_PxD7v42TpYFS9uKkL-Bpq08CA8_nYLe7reI/exec';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
        status: 405,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    try {
      const body = await request.text();
      const contentType = request.headers.get('Content-Type') || 'application/x-www-form-urlencoded';

      const resp = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body,
        headers: { 'Content-Type': contentType },
      });

      const respBody = await resp.text();
      return new Response(respBody, {
        status: resp.status,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': resp.headers.get('Content-Type') || 'application/json',
        },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ ok: false, error: err.message || 'Proxy error' }),
        {
          status: 502,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }
  },
};
