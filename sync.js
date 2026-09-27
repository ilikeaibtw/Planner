/* Planner sync: pure merge logic, shared by the app page and node unit tests.
   No side effects, no network, no DOM — safe to require() directly in node. */
(function(root, factory){
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = mod;
  }
  if (root) {
    root.PlannerSync = mod;
  }
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : null), function(){
  "use strict";

  function laterOf(a, b){
    // Returns the item with the later updatedAt. Missing updatedAt sorts as oldest.
    var ta = a && a.updatedAt ? Date.parse(a.updatedAt) : -Infinity;
    var tb = b && b.updatedAt ? Date.parse(b.updatedAt) : -Infinity;
    if (isNaN(ta)) ta = -Infinity;
    if (isNaN(tb)) tb = -Infinity;
    return tb > ta ? b : a;
  }

  /* Merge two arrays of {id, updatedAt, deleted, ...} records into one array,
     keeping the most-recently-updated version of each id (deletions are just
     records with deleted:true — a tombstone wins over an older edit the same
     way any newer record wins over an older one). */
  function mergeById(localArr, remoteArr){
    var byId = {};
    (localArr || []).forEach(function(item){ byId[item.id] = item; });
    (remoteArr || []).forEach(function(item){
      var existing = byId[item.id];
      byId[item.id] = existing ? laterOf(existing, item) : item;
    });
    return Object.keys(byId).map(function(id){ return byId[id]; });
  }

  /* Completions are keyed by "routineId|date" -> {done, updatedAt} (or legacy
     boolean true, treated as an undated "done" record). Union the keys and
     keep the newer record per key, same rule as mergeById. */
  function normalizeCompletion(c){
    if (c === true) return { done: true, updatedAt: null };
    return c;
  }
  function mergeCompletions(localMap, remoteMap){
    var out = {};
    var keys = {};
    Object.keys(localMap || {}).forEach(function(k){ keys[k] = true; });
    Object.keys(remoteMap || {}).forEach(function(k){ keys[k] = true; });
    Object.keys(keys).forEach(function(k){
      var l = normalizeCompletion((localMap||{})[k]);
      var r = normalizeCompletion((remoteMap||{})[k]);
      if (l && r) out[k] = laterOf(l, r);
      else out[k] = l || r;
    });
    return out;
  }

  function mergeSettings(localSettings, remoteSettings){
    if (!localSettings) return remoteSettings;
    if (!remoteSettings) return localSettings;
    return laterOf(localSettings, remoteSettings);
  }

  /* Merge two full planner states into one. Never mutates its inputs. */
  function mergeState(local, remote){
    if (!remote) return local;
    if (!local) return remote;
    return {
      version: local.version || remote.version || 1,
      schemaVersion: Math.max(local.schemaVersion || 1, remote.schemaVersion || 1),
      sections: mergeById(local.sections, remote.sections),
      routines: mergeById(local.routines, remote.routines),
      completions: mergeCompletions(local.completions, remote.completions),
      settings: mergeSettings(local.settings, remote.settings)
    };
  }

  return {
    laterOf: laterOf,
    mergeById: mergeById,
    mergeCompletions: mergeCompletions,
    mergeSettings: mergeSettings,
    mergeState: mergeState
  };
});
