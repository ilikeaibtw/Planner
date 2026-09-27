# Shipping an update

1. Edit the files as needed (`index.html`, `sw.js`, `sync.js`, etc).
2. Bump the version in `version.js` (`APP_VERSION = '1.1.1'` etc). This is the
   only thing you must always change — it renames the service worker's cache,
   which is what triggers the update flow for everyone.
3. Commit and push / deploy the folder wherever it's hosted (e.g. GitHub Pages).
4. Devices already using the app get an "Update" toast next time they open it
   or bring it to the foreground. Tapping it swaps in the new version and
   reloads. Nothing is required on the user's end beyond that tap.

## Testing locally before shipping

Service workers don't run on `file://`, so serve the folder over HTTP:

```
cd planner-app
python3 -m http.server 8000
```

Then open `http://localhost:8000` in a browser. To see the update toast,
bump `APP_VERSION` in `version.js`, keep the server running, and reload the
tab (with the old version still open) — the new service worker installs in
the background and the toast should appear once it's ready.

## Vendored dependencies

`vendor/supabase.js` is the supabase-js v2 UMD build, vendored locally (no
CDN at runtime, so the app works under a strict CSP and offline once
installed). Currently pinned to **2.117.2**. To update it:

```
curl -L https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js -o vendor/supabase.js
```

Then bump the version noted here and re-test sync before shipping.
