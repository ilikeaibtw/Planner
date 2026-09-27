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

self.addEventListener('fetch', function(event){
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);

  // Cross-origin (e.g. supabase-js CDN, Google Fonts): cache-first, then network,
  // so once loaded it also works offline.
  if (url.origin !== self.location.origin) {
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
