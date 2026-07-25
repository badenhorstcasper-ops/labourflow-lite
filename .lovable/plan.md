## What's wrong

The Admin dashboard and Owner overview pages send an extra "don't use cached data" instruction to the backend. The backend wasn't told to accept that instruction, so the browser refuses to make the call and you see:

> Failed to send a request to the Edge Function

The server already tells the browser not to cache the response, so the extra instruction from the page isn't needed anyway.

## Fix

Remove the unnecessary "no-cache" header the two pages tack onto their requests. The backend keeps its own "don't cache" response header, so live/up-to-the-minute data still works exactly the same.

Files to change:
- `src/pages/Admin.tsx` — drop the extra header on the `admin-stats` call.
- `src/pages/AdminOverview.tsx` — drop the same extra header on the `owner-overview` call (if present).

No backend changes, no database changes. After the edit, the pages will load stats again on both `/admin` and `/admin/overview`.
