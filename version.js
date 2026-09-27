/* Single source of truth for the app version.
   Bump this string on every release; sw.js imports it to name its cache,
   so a version bump automatically invalidates old caches. */
var APP_VERSION = '1.4.2';
if (typeof self !== 'undefined' && typeof module === 'undefined') {
  // no-op branch kept for clarity in both window and service-worker contexts
}
