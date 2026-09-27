/* Planner service worker: cache-first app shell, versioned cache name. */
importScripts('./version.js');

var CACHE_NAME = 'planner-shell-' + APP_VERSION;
var RUNTIME_CACHE = 'planner-runtime-' + APP_VERSION;

var APP_SHELL = [
  './',
  './index.html',
  './version.js',
  './crypto.js',
  './sync.js',
  './vendor/supabase.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(APP_SHELL);
    }).then(function(){
      // Don't auto-activate; wait for the page to ask via skipWaiting message
      // so the update toast can control the moment of switchover.
    })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(
        names.filter(function(n){
          return n !== CACHE_NAME && n !== RUNTIME_CACHE && n.indexOf('planner-') === 0;
        }).map(function(n){ return caches.delete(n); })
      );
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('message', function(event){
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isFontsHost(hostname){
  return hostname === 'fonts.googleapis.com' || hostname === 'fonts.gstatic.com';
}

function endsWith(str, suffix){
  return str.length >= suffix.length && str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function isSupabaseHost(hostname){
  return endsWith(hostname, '.supabase.co') || endsWith(hostname, '.supabase.in');
}

self.addEventListener('fetch', function(event){
  var req = event.request;
  if (req.method !== 'GET') return;
  // Never intercept requests carrying an Authorization header (Supabase auth/rest
  // calls, or anything else auth'd): those must always go straight to the network,
  // never be served from or written into a cache.
  if (req.headers && req.headers.has && req.headers.has('Authorization')) return;

  var url = new URL(req.url);

  if (url.origin !== self.location.origin) {
    // Supabase REST/auth/realtime endpoints must NEVER be cached: caching a GET
    // to planner_state or /auth/v1/user would make sync read stale data forever.
    // Just pass through to the network untouched.
    if (isSupabaseHost(url.hostname)) return;

    // Only Google Fonts are safe to runtime-cache; everything else cross-origin
    // (anything unexpected) also passes straight through rather than being cached.
    if (!isFontsHost(url.hostname)) return;

    event.respondWith(
      caches.match(req).then(function(cached){
        if (cached) return cached;
        return fetch(req).then(function(res){
          if (res && res.ok) {
            var copy = res.clone();
            caches.open(RUNTIME_CACHE).then(function(cache){ cache.put(req, copy); });
          }
          return res;
        }).catch(function(){ return cached; });
      })
    );
    return;
  }

  // version.js is how the page (and this worker's own importScripts) knows
  // what release it's on: it must always be network-first (falling back to
  // cache only when offline), otherwise a stale cached copy makes update
  // detection lag forever, and the "new version available" toast can never
  // clear as expected.
  if (url.pathname.indexOf('version.js') !== -1) {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).then(function(res){
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
        }
        return res;
      }).catch(function(){ return caches.match(req); })
    );
    return;
  }

  // Same-origin app shell: cache-first, fall back to network, refresh cache in background.
  event.respondWith(
    caches.match(req).then(function(cached){
      var networkFetch = fetch(req).then(function(res){
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
        }
        return res;
      }).catch(function(){ return cached; });
      return cached || networkFetch;
    })
  );
});
