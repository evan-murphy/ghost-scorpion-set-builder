<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# "Offline-first web app sync pattern: localStorage or IndexedDB for local edits, debounced sync to backend, handling conflicts when the same document is edited in two places. Simple approaches without CRDTs."

You can keep this pretty simple: store edits as operations in IndexedDB, batch them with a debounced sync to a REST endpoint, and use version stamps on each document to do deterministic last-write-wins or “ask user” conflict resolution without CRDTs.[^1_1][^1_2][^1_3]

## Local storage model

For anything non‑trivial, prefer **IndexedDB** over localStorage: it’s async, handles larger data, and works well with structured objects and indexes.[^1_2][^1_1]

Pattern:

- One “documents” store: `{ id, content, updatedAt, version, dirty }`.
- One “outbox” store: `{ id, docId, opType: 'create'|'update'|'delete', payload, createdAt }`.
- IDs are client‑generated (UUID v4) so you can create docs offline and later map to server IDs if needed.[^1_2]

Local flow:

- On every edit: update `documents` immediately and mark `dirty = true`; also append an outbox entry (or update the latest one for that doc).
- UI always reads from `documents`, never waits on the network.


## Debounced sync to backend

Have a central “sync scheduler” that is triggered by:

- Local changes (writes outbox entry).
- Connectivity changes (online event, or successful ping).
- Periodic timer in foreground.

Debounce/coalesce:

- Use a short debounce (e.g. 500–2000 ms) so rapid edits for the same doc get merged into one sync batch.[^1_4]
- When the debounce fires:
    - Read all outbox entries, group by document, collapse multiple updates into the latest state.
    - POST/PUT/DELETE to your backend in a batch endpoint where possible.

On success:

- Update local `documents` with server data (including authoritative `version`/`updatedAt`).
- Remove processed outbox entries for those docs.

If background sync API is available, you can hand off the outbox to a service worker; otherwise keep it in IndexedDB and flush when the app is in the foreground.[^1_5][^1_4]

## Versioning and conflict detection

Have the server maintain a numeric `version` or `updatedAt` timestamp per document.[^1_6][^1_3]

Client → server update payload:

- `{ id, content, baseVersion }` where `baseVersion` is the version the client last synced against.
- Server logic:
    - Load current doc with `currentVersion`.
    - If `baseVersion === currentVersion`: apply update, increment version (or update timestamp), return success.
    - If `baseVersion !== currentVersion`: you have a conflict.

This alone lets you reliably detect “edited in two places” without CRDTs.[^1_7][^1_3][^1_6]

## Simple conflict strategies (no CRDT)

On the server, when `baseVersion !== currentVersion`, choose one of:

1. Last-write-wins (LWW)

- Decide by `updatedAt` or by “server is source of truth”.[^1_3][^1_6][^1_7]
- Algorithm:
    - Option A: reject with `409 Conflict` and include `remoteDoc`; client decides.
    - Option B: silently accept client write as “winner” and overwrite server, set new `version`.
- Pros: trivial to implement.
- Cons: you can lose edits from one side if both touched the same fields.[^1_6][^1_7][^1_3]

2. Server‑side merge by fields

- Treat the document as a bag of fields rather than one blob.
- Keep per‑field `updatedAt` stamps on the server.
- On conflict:
    - For each field, if client’s field `updatedAt` > server’s field `updatedAt`, take client’s; otherwise keep server’s.
- This gives a simple “field‑level LWW” without full CRDT complexity.[^1_7][^1_6]

3. Keep both / user choice

- On `409 Conflict`, the server returns `{ remote, local }`.
- Client stores a “conflict record” locally and shows a UI:
    - “Your version vs remote version” with side‑by‑side diff.
    - User chooses “keep mine”, “keep remote”, or manually merges text.
- After choice, client sends a new update, now with `baseVersion = latestServerVersion`.

This is still operationally simple but gives safety for important docs.[^1_8][^1_9]

## Recommended pattern for a simple app

For a plain “documents” app where occasional overwrites are acceptable:

- Storage: IndexedDB with `documents` + `outbox`, UUID ids.[^1_1][^1_2]
- Sync:
    - Debounced foreground sync with a short delay.
    - Optional background sync when supported.[^1_5][^1_4]
- Conflict handling:
    - Server does version check.
    - If conflict:
        - Phase 1: start with whole‑document LWW by `updatedAt` and return a small “conflict‑lost” flag so client can show “Your last change was overwritten on device X” toast.
        - Phase 2 (if you need better): add a “conflict UI” path and switch to “ask user” for certain collections.

If you share a bit more about your document shape (blob of text vs structured fields) and tolerance for occasional data loss, I can sketch concrete TypeScript interfaces and server handlers tailored to that.
<span style="display:none">[^1_10][^1_11][^1_12][^1_13][^1_14][^1_15]</span>

<div align="center">⁂</div>

[^1_1]: https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/

[^1_2]: https://evilmartians.com/chronicles/cool-front-end-arts-of-local-first-storage-sync-and-conflicts

[^1_3]: https://oneuptime.com/blog/post/2026-01-30-last-write-wins/view

[^1_4]: https://www.zeepalm.com/blog/background-sync-in-pwas-service-worker-guide

[^1_5]: https://oneuptime.com/blog/post/2026-01-15-background-sync-react-pwa/view

[^1_6]: https://dzone.com/articles/conflict-resolution-using-last-write-wins-vs-crdts

[^1_7]: https://iankduncan.com/engineering/2025-11-27-crdt-dictionary/

[^1_8]: https://dev.to/anurag_dev/implementing-offline-first-architecture-in-flutter-part-1-local-storage-with-conflict-resolution-4mdl

[^1_9]: https://devstarterpacks.com/blog/what-every-developer-should-know-about-offline-first-apps

[^1_10]: https://www.reddit.com/r/webdev/comments/1qrlyxe/question_best_practices_for_offlinefirst_approach/

[^1_11]: https://rxdb.info/downsides-of-offline-first.html

[^1_12]: https://androidengineers.substack.com/p/the-complete-guide-to-offline-first

[^1_13]: https://cloudinary.com/guides/web-performance/vue-debounce

[^1_14]: https://gtcsys.com/comprehensive-faqs-guide-data-synchronization-in-pwas-offline-first-strategies-and-conflict-resolution/

[^1_15]: https://news.ycombinator.com/item?id=46087022


---

# "Implementing a sync queue for web apps: retry failed requests, offline queue, and surfacing sync status (synced, syncing, failed) in the UI."

You can model this as a small finite‑state machine around a persistent “sync jobs” queue plus a retry policy and a simple status enum exposed to the UI.[^2_1][^2_2]

## Queue data model

Use persistent storage (IndexedDB) for the **sync queue** so it survives reloads and offline periods.[^2_2]

Each job:

- `id`: UUID
- `kind`: e.g. `"updateDocument"`
- `payload`: minimal data needed to replay the request
- `createdAt`, `lastAttemptAt`
- `attempts`: number of tries
- `status`: `"pending" | "processing" | "failed" | "done"`
- `error`: last error code/message (for UI)

Keep your domain state (documents, etc.) **separate** from the queue; the queue is just “commands to send”.[^2_1]

## Processing and retry logic

Have a single queue worker in the foreground (or a service worker if you go PWA) that:

1. Watches connectivity (`online`/`offline` events, or a lightweight ping) and only runs when “online-ish”.[^2_3][^2_2]
2. Pulls the oldest `status === "pending"` job.
3. Marks it `"processing"` and attempts the network call.
4. On result:
    - 2xx/expected success → mark `"done"`, remove or keep for audit.
    - Transient error (network error, 5xx, `fetch` rejected) → increment `attempts`, compute `nextRetryAt` with exponential backoff (e.g. $2^{n}$ seconds capped), set status back to `"pending"` but skip processing until `nextRetryAt`.[^2_4][^2_2]
    - Permanent error (4xx like 400, 404, 409 you won’t auto‑fix) → mark `"failed"` and keep error info for UI.[^2_5]

Background Sync API (via Workbox) can do this even when the tab is closed: queue failed POSTs and re‑send them when connectivity returns.[^2_6][^2_7][^2_2]

## Offline enqueueing

When the app is offline or a request fails immediately:

- Do not block the UI; apply changes optimistically to local state.
- Enqueue a job with `status: "pending"`; mark the related entity locally as `syncStatus: "syncing"` or `"queued"`.[^2_2][^2_1]
- The queue worker will eventually send it; if background sync is supported, you can register a background sync task tagged for your queue.[^2_6][^2_3][^2_2]

This gives you an “offline queue” without special user interaction, but still lets you introspect it for status screens.[^2_1]

## Mapping to UI statuses

At the entity level (e.g. a document, record, or list item), derive a high‑level status from the queue:

- `"synced"`: no pending/processing/failed jobs for that entity, last known server version matches local.
- `"syncing"`: there is at least one job with `status === "pending" | "processing"` for that entity.
- `"failed"`: there is at least one `status === "failed"` job for that entity.[^2_1]

Patterns that work well in practice:

- Small pill or icon next to each item:
    - Green dot: **synced**
    - Spinning / animated icon: **syncing**
    - Red exclamation: **failed**; click reveals error and “Retry” / “Discard change”.[^2_1]
- Optional global indicator:
    - Toolbar text like “All changes saved”, “Saving changes…”, “Some changes failed”.
    - Clicking opens a “Sync queue” panel listing jobs and their state, as suggested in command‑queue patterns.[^2_1]

Retry UX:

- “Retry all failed” button that just resets `status` to `"pending"`, `attempts` to 0 for failed jobs.
- Per‑item “Retry” that does the same for the selected job.
- “Discard change” option that marks the job “abandoned” and refreshes the local item from server, to reconcile irrecoverable errors (e.g. 404 deleted upstream).[^2_5][^2_1]


## Minimal implementation sketch (logic)

Core pieces to wire up regardless of framework:

- `enqueueJob(job)`:
    - Writes to IndexedDB with `status: "pending"`, `attempts: 0`.
    - Triggers `processQueue()` if online.
- `processQueue()`:
    - Guard: only one instance at a time.
    - Load next eligible pending job (respecting `nextRetryAt`).
    - Run `executeJob(job)` → `fetch(...)`.
    - Update job row according to result and reschedule if needed.
- A small observable / event mechanism that:
    - Notifies UI when job status changes so per‑entity sync status reacts immediately.[^2_1]

If you tell me whether you’re using a service worker (PWA) or just a SPA in the main thread, I can sketch a concrete TypeScript interface plus a simple queue worker implementation next.
<span style="display:none">[^2_10][^2_11][^2_12][^2_13][^2_14][^2_15][^2_8][^2_9]</span>

<div align="center">⁂</div>

[^2_1]: https://news.ycombinator.com/item?id=13246187

[^2_2]: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation

[^2_3]: https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/background-syncs

[^2_4]: https://developer.chrome.com/docs/workbox/retrying-requests-when-back-online

[^2_5]: https://www.reddit.com/r/ExperiencedDevs/comments/1mpfvq3/how_do_you_architect_your_mobile_app_to_deal_with/

[^2_6]: https://oneuptime.com/blog/post/2026-01-15-background-sync-react-pwa/view

[^2_7]: https://www.zeepalm.com/blog/background-sync-in-pwas-service-worker-guide

[^2_8]: https://github.com/TanStack/query/discussions/988

[^2_9]: https://help.pdq.com/hc/en-us/articles/360058995112-To-Retry-Queue-or-to-not-Retry-Queue

[^2_10]: https://docs.apify.com/academy/api/retry-failed-requests

[^2_11]: https://oneuptime.com/blog/post/2026-02-26-argocd-sync-failed-events/view

[^2_12]: https://github.com/argoproj/argo-cd/issues/7629

[^2_13]: https://stackoverflow.com/questions/31830746/how-to-queue-api-calls-when-youre-offline-while-using-retrofit

[^2_14]: https://www.reddit.com/r/ArgoCD/comments/1e6haa4/argocd_not_syncing_properly/

[^2_15]: https://stackoverflow.com/questions/73646799/argocd-not-able-to-sync-even-after-detecting-changes


---

# "Google Drive API: how to check if the current user has access to a specific folder by folder ID. Using OAuth and the Drive API to enforce folder-based permissions."

To check if the current OAuth-authenticated user has access to a specific Google Drive folder by ID, call the Drive API's `files.get` endpoint—the response confirms access, while a 403 Forbidden indicates no permission.[^3_1][^3_2]

## API endpoint

Use `GET https://www.googleapis.com/drive/v3/files/{folderId}` with your OAuth access token in the `Authorization: Bearer {token}` header.[^3_1]

Key query params for robustness:

- `fields=*:minimal` (name,id,mimeType,capabilities,permissions) to get just what you need.
- `supportsAllDrives=true` if the folder might be in a shared drive (most apps need this).[^3_3][^3_1]

Example fetch (JavaScript):

```javascript
const response = await fetch(
  `https://www.googleapis.com/drive/v3/files/${folderId}?fields=name,id,mimeType,capabilities,supportsAllDrives=true`,
  { headers: { Authorization: `Bearer ${accessToken}` } }
);

if (response.ok) {
  const folder = await response.json();
  // User has access; folder.mimeType === 'application/vnd.google-apps.folder'
} else if (response.status === 403 || response.status === 404) {
  // No access or doesn't exist (both look the same externally)
} else {
  // Other error (500, etc.)
}
```

Success returns the folder metadata; 403/404 means inaccessible.[^3_4][^3_2][^3_5]

## OAuth scopes

Pick the minimal scope during OAuth flow:

- `https://www.googleapis.com/auth/drive.readonly` for read access checks.
- `https://www.googleapis.com/auth/drive.metadata.readonly` if you only need metadata like permissions (sufficient for access check).
- `https://www.googleapis.com/auth/drive.file` for apps that create files (but limits to user-selected/app-created files).

Drive API requires one of these scopes; broader like `drive` works but needs verification for public apps.[^3_6]

## Permissions enforcement

To enforce folder-based access in your app:

- On every operation (list children, create file, etc.), first validate access via `files.get`.
- Cache the result locally (with expiration) using the `modifiedTime` from metadata.
- For listing children: `files.list` with `q="'${folderId}' in parents"`, which also fails 403 if no read access.[^3_1]

If you get 403:

- Show UI like "No access to this folder" and stop.
- Optionally list user's permissions via `permissions.list` on success (to show "Viewer" vs "Editor").[^3_3]

Handle shared drives: always set `supportsAllDrives=true`; without it, shared drive folders return 403 even if accessible.[^3_1]

This pattern scales to your sync app—check folder access before attempting uploads to that folder's path.[^3_2]
<span style="display:none">[^3_10][^3_11][^3_12][^3_13][^3_14][^3_15][^3_7][^3_8][^3_9]</span>

<div align="center">⁂</div>

[^3_1]: https://developers.google.com/workspace/drive/api/reference/rest/v3/permissions/get

[^3_2]: https://developers.google.com/workspace/drive/api/guides/handle-errors

[^3_3]: https://developers.google.com/workspace/drive/api/reference/rest/v3/permissions/list

[^3_4]: https://stackoverflow.com/questions/60325986/google-drive-v3-api-file-403-when-specifying-alt-media

[^3_5]: https://stackoverflow.com/questions/23520538/google-drive-api-403-forbidden

[^3_6]: https://developers.google.com/workspace/drive/api/guides/api-specific-auth

[^3_7]: https://stackoverflow.com/questions/53247778/google-drive-api-folder-permissions

[^3_8]: https://community.latenode.com/t/how-to-retrieve-folder-permissions-using-google-drive-api/27181

[^3_9]: https://docs.automationanywhere.com/bundle/enterprise-v2019/page/enterprise-cloud/topics/aae-client/bot-creator/commands/google-drive-check-permissions.html

[^3_10]: https://community.latenode.com/t/how-to-restrict-google-drive-api-permissions-to-a-specific-directory-only/32436

[^3_11]: https://support.google.com/a/users/answer/12380484?hl=en

[^3_12]: https://stackoverflow.com/questions/58021681/google-drive-api-granting-access-to-files-in-a-folder-to-service-account

[^3_13]: https://adisarid.github.io/post/2019-09-17-google_drive_dir_structure_permissions/

[^3_14]: https://www.youtube.com/watch?v=Tk_t2zK0Smw

[^3_15]: https://stackoverflow.com/questions/51163398/403-errors-for-gdrive-api-v3-when-switching-between-multiple-accounts

