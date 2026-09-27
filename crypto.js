/* Planner end-to-end encryption: WebCrypto only, no libraries.
   Pure-ish helpers (crypto calls only, no DOM) so this is node-testable too
   (Node >=20 exposes globalThis.crypto.subtle). Loaded before sync.js. */
(function(root, factory){
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = mod;
  }
  if (root) {
    root.PlannerCrypto = mod;
  }
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : null), function(){
  "use strict";

  var subtle = (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) || null;
  var getRandomValues = (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues.bind(globalThis.crypto)) || null;

  var ITERATIONS = 600000;
  var KDF = 'PBKDF2-SHA256';
  var ALG = 'AES-GCM';
  var VERSION = 1;

  function assertCrypto(){
    if (!subtle || !getRandomValues) {
      throw new Error('WebCrypto is not available in this environment');
    }
  }

  /* ---- base64 helpers (ArrayBuffer/Uint8Array <-> base64 string) ---- */
  function bufToB64(buf){
    var bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    if (typeof btoa === 'function') {
      var bin = '';
      for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin);
    }
    return Buffer.from(bytes).toString('base64');
  }
  function b64ToBuf(b64){
    if (typeof atob === 'function') {
      var bin = atob(b64);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes.buffer;
    }
    var buf = Buffer.from(b64, 'base64');
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }

  function generateSalt(){
    assertCrypto();
    var salt = new Uint8Array(16);
    getRandomValues(salt);
    return salt;
  }

  function generateIv(){
    assertCrypto();
    var iv = new Uint8Array(12);
    getRandomValues(iv);
    return iv;
  }

  /* Derive a non-extractable AES-GCM-256 CryptoKey from a passphrase + salt.
     salt may be a Uint8Array or a base64 string. */
  function deriveKey(passphrase, salt){
    assertCrypto();
    var saltBytes = (typeof salt === 'string') ? new Uint8Array(b64ToBuf(salt)) : salt;
    var enc = new TextEncoder();
    return subtle.importKey(
      'raw', enc.encode(passphrase), { name: 'PBKDF2' }, false, ['deriveKey']
    ).then(function(baseKey){
      return subtle.deriveKey(
        { name: 'PBKDF2', salt: saltBytes, iterations: ITERATIONS, hash: 'SHA-256' },
        baseKey,
        { name: ALG, length: 256 },
        false, /* non-extractable */
        ['encrypt', 'decrypt']
      );
    });
  }

  /* Encrypt a plain JS value into the storage envelope. Fresh random IV per call. */
  function encrypt(key, plainValue, saltB64){
    assertCrypto();
    var iv = generateIv();
    var enc = new TextEncoder();
    var plaintext = enc.encode(JSON.stringify(plainValue));
    return subtle.encrypt({ name: ALG, iv: iv }, key, plaintext).then(function(ctBuf){
      return {
        v: VERSION,
        alg: ALG,
        kdf: KDF,
        iter: ITERATIONS,
        salt: saltB64,
        iv: bufToB64(iv),
        ct: bufToB64(ctBuf)
      };
    });
  }

  /* Decrypt an envelope. Rejects (GCM auth failure) on wrong passphrase or
     tampered ciphertext -- callers must treat any rejection here as
     "wrong passphrase / corrupt data" and MUST NOT overwrite the remote blob. */
  function decrypt(key, envelope){
    assertCrypto();
    var iv = new Uint8Array(b64ToBuf(envelope.iv));
    var ct = b64ToBuf(envelope.ct);
    return subtle.decrypt({ name: ALG, iv: iv }, key, ct).then(function(ptBuf){
      var dec = new TextDecoder();
      return JSON.parse(dec.decode(ptBuf));
    });
  }

  /* Distinguish our envelope shape from a legacy plaintext planner_state row. */
  function isEnvelope(obj){
    return !!(obj && typeof obj === 'object' &&
      obj.v === VERSION && obj.alg === ALG &&
      typeof obj.ct === 'string' && typeof obj.iv === 'string' && typeof obj.salt === 'string');
  }

  /* ---- optional "remember on this device" storage ----
     Stores the non-extractable derived CryptoKey (never the passphrase) in
     IndexedDB via structured clone. No-op / rejects in environments without
     indexedDB (e.g. node tests) -- callers should treat rejection as "no
     remembered key". */
  var IDB_NAME = 'planner-crypto';
  var IDB_STORE = 'keys';
  var IDB_RECORD_ID = 'current';

  function hasIndexedDb(){
    return typeof indexedDB !== 'undefined';
  }

  function openIdb(){
    return new Promise(function(resolve, reject){
      if (!hasIndexedDb()) { reject(new Error('indexedDB unavailable')); return; }
      var req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = function(){
        req.result.createObjectStore(IDB_STORE, { keyPath: 'id' });
      };
      req.onsuccess = function(){ resolve(req.result); };
      req.onerror = function(){ reject(req.error); };
    });
  }

  function rememberKey(key, saltB64){
    return openIdb().then(function(db){
      return new Promise(function(resolve, reject){
        var tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put({ id: IDB_RECORD_ID, key: key, salt: saltB64 });
        tx.oncomplete = function(){ resolve(); };
        tx.onerror = function(){ reject(tx.error); };
      });
    });
  }

  function getRememberedKey(){
    return openIdb().then(function(db){
      return new Promise(function(resolve, reject){
        var tx = db.transaction(IDB_STORE, 'readonly');
        var req = tx.objectStore(IDB_STORE).get(IDB_RECORD_ID);
        req.onsuccess = function(){ resolve(req.result || null); };
        req.onerror = function(){ reject(req.error); };
      });
    });
  }

  function forgetKey(){
    return openIdb().then(function(db){
      return new Promise(function(resolve, reject){
        var tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(IDB_RECORD_ID);
        tx.oncomplete = function(){ resolve(); };
        tx.onerror = function(){ reject(tx.error); };
      });
    }).catch(function(){ /* nothing to forget */ });
  }

  return {
    ITERATIONS: ITERATIONS,
    generateSalt: generateSalt,
    deriveKey: deriveKey,
    encrypt: encrypt,
    decrypt: decrypt,
    isEnvelope: isEnvelope,
    bufToB64: bufToB64,
    b64ToBuf: b64ToBuf,
    rememberKey: rememberKey,
    getRememberedKey: getRememberedKey,
    forgetKey: forgetKey
  };
});
