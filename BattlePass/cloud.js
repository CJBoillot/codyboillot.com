// Battle Pass: The Game — cloud saves. Ported from Click to Conquer's cloud.js (Firebase Auth + Firestore, free Spark plan).
// localStorage stays the main save; the cloud is a backup and a bridge between devices.
// Nothing here runs until cloud-config.js provides a Firebase web config.
// Changes from Click to Conquer:
//   • its own Firestore collection (CONFIG.cloud.collection), so it can share a Firebase project with
//     Click to Conquer without ever touching that game's users/{uid} document;
//   • its own localStorage keys (bp_*);
//   • save cards show stage / game title instead of hero level.
(function () {
  const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const PUSH_EVERY = 5 * 60 * 1000;          // write at most every 5 min while playing (keeps it free)
  const LS = { device: 'bp_device', link: 'bp_cloud_link', backup: 'bp_backup' };
  const COLLECTION = (window.CONFIG && CONFIG.cloud && CONFIG.cloud.collection) || 'battlepass_saves';
  const $ = id => document.getElementById(id);
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };

  const C = {
    available: false, ready: false, user: null, status: 'off', // off | idle | syncing | ok | error | offline
    lastSync: 0, dirty: false, busy: false, conflict: false, hold: null, // hold = 'resolving' | 'choose' | 'newer' — no upload until it clears
  };
  let auth = null, db = null, lastPush = 0;
  const deviceId = ls.get(LS.device) || (() => { const d = Math.random().toString(36).slice(2) + Date.now().toString(36); ls.set(LS.device, d); return d; })();
  const link = () => { try { return JSON.parse(ls.get(LS.link) || 'null'); } catch (e) { return null; } };
  const setLink = (uid, tick, played) => ls.set(LS.link, JSON.stringify({ uid, tick, played }));

  // ---------- compression (gzip + base64; falls back to plain JSON) ----------
  async function pack(str) {
    if (!window.CompressionStream) return { enc: 'json', data: str };
    const buf = await new Response(new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
    let bin = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return { enc: 'gzip64', data: btoa(bin) };
  }
  async function unpack(doc) {
    if (doc.enc !== 'gzip64') return doc.data;
    const bin = atob(doc.data), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  }

  // ---------- SDK loading ----------
  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  async function init() {
    const cfg = window.FIREBASE_CONFIG;
    if (!cfg || !cfg.apiKey) { C.available = false; C.status = 'off'; UIhook(); return; }
    C.available = true; C.status = 'idle'; UIhook();
    try {
      await loadScript(SDK + 'firebase-app-compat.js');
      await Promise.all([loadScript(SDK + 'firebase-auth-compat.js'), loadScript(SDK + 'firebase-firestore-compat.js')]);
      firebase.initializeApp(cfg); auth = firebase.auth(); db = firebase.firestore();
      C.ready = true;
      auth.onAuthStateChanged(u => { C.user = u; if (u) afterSignIn(u); else { C.status = 'idle'; UIhook(); } });
      Game.setSaveHook(() => { C.dirty = true; });
      setInterval(() => { if (C.user && C.dirty && Date.now() - lastPush >= PUSH_EVERY) push(); }, 15000);
      document.addEventListener('visibilitychange', () => { if (document.hidden && C.user && C.dirty) push(); });
      window.addEventListener('online', () => { if (C.user && C.dirty) push(); });
    } catch (e) { C.status = 'error'; C.error = 'Could not reach the cloud.'; UIhook(); }
  }

  // ---------- auth ----------
  async function signIn() {
    if (!C.ready) return;
    const p = new firebase.auth.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
    try { await auth.signInWithPopup(p); }
    catch (e) { if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment' || e.code === 'auth/cancelled-popup-request')) await auth.signInWithRedirect(p); else if (e && e.code !== 'auth/popup-closed-by-user') { C.status = 'error'; C.error = 'Sign-in failed.'; UIhook(); } }
  }
  async function signOut() { if (C.user && C.dirty && !C.hold) await push(); C.hold = null; await auth.signOut(); C.user = null; C.status = 'idle'; UIhook(); }
  const docRef = () => db.collection(COLLECTION).doc(C.user.uid);

  // ---------- pull / push ----------
  async function pull() { const snap = await docRef().get(); if (!snap.exists) return null; const d = snap.data(); return { ...d, str: await unpack(d) }; }
  async function push(force = false) {
    if (!C.user || C.busy) return false;
    if (C.hold && !(force && C.hold !== 'newer')) return false; // never upload over a save the player hasn't chosen between, or over a newer version
    if (!navigator.onLine) { C.status = 'offline'; UIhook(); return false; }
    C.busy = true; C.status = 'syncing'; UIhook();
    const str = Game.saveString(), meta = Game.saveMeta(str), body = await pack(str), L = link();
    try {
      const res = await db.runTransaction(async tx => {
        const snap = await tx.get(docRef());
        if (snap.exists) { const d = snap.data();
          if (d.saveKey === Game.SAVE_KEY && versionNewer(d.version, CONFIG.version)) return 'newer'; // checked inside the transaction, even when forced
          if (!force && d.saveKey === Game.SAVE_KEY && d.deviceId !== deviceId && (!L || L.uid !== C.user.uid || d.lastTick > L.tick + 1000)) return 'conflict'; }
        tx.set(docRef(), { enc: body.enc, data: body.data, lastTick: meta.lastTick, played: meta.played, version: CONFIG.version, saveKey: Game.SAVE_KEY, deviceId,
          name: C.user.displayName || '', photo: C.user.photoURL || '', updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        return 'ok';
      });
      if (res === 'newer') { C.busy = false; C.hold = 'newer'; C.status = 'error'; C.error = 'Your cloud save is from a newer version — tap Reload game.'; UIhook(); return false; }
      if (res === 'conflict') { C.busy = false; C.hold = 'choose'; C.status = 'error'; C.error = 'Newer progress on another device.'; UIhook(); showConflict(); return false; }
      setLink(C.user.uid, meta.lastTick, meta.played); C.lastSync = Date.now(); lastPush = Date.now(); C.dirty = false; C.status = 'ok'; C.error = '';
    } catch (e) { C.status = navigator.onLine ? 'error' : 'offline'; C.error = (e && e.code === 'resource-exhausted') ? 'Cloud is busy today — saved on this device.' : `Could not save to the cloud — saved on this device. (${(e && (e.code || e.message)) || 'unknown'})`; try { console.warn('cloud push', e); } catch (x) {} }
    C.busy = false; UIhook(); return C.status === 'ok';
  }

  // ---------- sign-in resolution: which save wins ----------
  async function afterSignIn(u) {
    C.hold = 'resolving'; C.status = 'syncing'; UIhook();
    let cloud; try { cloud = await pull(); } catch (e) { C.hold = null; C.status = 'error'; C.error = `Could not read your cloud save. (${(e && (e.code || e.message)) || 'unknown'})`; UIhook(); return; }
    const localStr = Game.saveString(), local = Game.saveMeta(localStr), L = link();
    if (!cloud || cloud.saveKey !== Game.SAVE_KEY) { C.hold = null; await push(true); return; }
    if (versionNewer(cloud.version, CONFIG.version)) { C.hold = 'newer'; C.status = 'error'; C.error = 'Your cloud save is from a newer version — tap Reload game.'; UIhook(); return; }
    const cm = Game.saveMeta(cloud.str);
    const localFresh = local.played < 300 && (Game.meta.sequel || 1) === 1 && (Game.meta.scTotal || 0) === 0;
    const linked = L && L.uid === u.uid;
    const localMovedSinceSync = !linked || (local.played - (L.played || 0)) > 60;
    const cloudMovedSinceSync = !linked || (cloud.deviceId !== deviceId && cloud.lastTick > (L.tick || 0) + 1000);
    if (localFresh) return useCloud(cloud, false);
    if (linked && !cloudMovedSinceSync) { C.hold = null; await push(true); return; }         // cloud is just our last upload
    if (linked && !localMovedSinceSync) return useCloud(cloud, false);         // only the other device played
    chooseSave(local, cm, cloud);                                              // both have real progress: ask
  }
  function versionNewer(a, b) { const n = v => { const t = String(v || ''); return [/beta/i.test(t) ? 1 : 0, ...(t.match(/\d+/g) || []).map(Number)]; }; const x = n(a), y = n(b); for (let i = 0; i < Math.max(x.length, y.length); i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; }
  function useCloud(cloud, backupLocal) {
    C.hold = null;
    if (backupLocal) ls.set(LS.backup, JSON.stringify({ at: Date.now(), key: Game.SAVE_KEY, save: Game.saveString() }));
    if (!Game.restoreString(cloud.str)) { C.status = 'error'; C.error = 'That cloud save could not be loaded.'; UIhook(); return; }
    setLink(C.user.uid, cloud.lastTick, (Game.saveMeta(cloud.str) || {}).played || 0); C.lastSync = Date.now(); C.dirty = false; C.status = 'ok'; C.error = '';
    if (typeof UI !== 'undefined' && UI.rebuild) UI.rebuild(); UIhook();
  }
  function keepLocal() { C.hold = null; push(true); }

  // ---------- modals ----------
  const ago = t => { const s = Math.max(0, (Date.now() - t) / 1000); return s < 90 ? 'just now' : s < 5400 ? Math.round(s / 60) + ' min ago' : s < 129600 ? Math.round(s / 3600) + ' h ago' : Math.round(s / 86400) + ' days ago'; };
  const card = (title, m) => `<div class="cs-title">${title}</div><div class="cs-place">${m.title}</div><div class="small dim">${m.stage} · ${Game.money(m.revenue)} lifetime · ${m.sc} SC</div><div class="small dim">saved ${ago(m.lastTick)}</div>`;
  function chooseSave(local, cm, cloud) {
    $('cs-local').innerHTML = card('This device', local); $('cs-cloud').innerHTML = card('Cloud', cm);
    const cloudNewer = cm.lastTick >= local.lastTick;
    $('cs-cloud').classList.toggle('pick', cloudNewer); $('cs-local').classList.toggle('pick', !cloudNewer);
    $('cs-use-cloud').onclick = () => { $('cloud-modal').classList.add('hidden'); useCloud(cloud, true); };
    $('cs-use-local').onclick = () => { $('cloud-modal').classList.add('hidden'); keepLocal(); };
    C.hold = 'choose'; $('cloud-modal').classList.remove('hidden'); C.status = 'idle'; UIhook();
  }
  async function showConflict() {
    let cloud; try { cloud = await pull(); } catch (e) { return; } if (!cloud || cloud.saveKey !== Game.SAVE_KEY) return;
    chooseSave(Game.saveMeta(Game.saveString()), Game.saveMeta(cloud.str), cloud);
  }
  async function deleteCloud() { if (!C.user) return; try { await docRef().delete(); ls.del(LS.link); C.status = 'idle'; C.error = 'Cloud save deleted. Signing out.'; await auth.signOut(); } catch (e) { C.error = 'Could not delete the cloud save.'; } UIhook(); }
  function backupInfo() { try { const b = JSON.parse(ls.get(LS.backup) || 'null'); return b && b.key === Game.SAVE_KEY ? { at: b.at, meta: Game.saveMeta(b.save) } : null; } catch (e) { return null; } }
  function restoreBackup() { try { const b = JSON.parse(ls.get(LS.backup) || 'null'); if (!b || b.key !== Game.SAVE_KEY) return false; const cur = Game.saveString(); if (Game.restoreString(b.save)) { ls.set(LS.backup, JSON.stringify({ at: Date.now(), key: Game.SAVE_KEY, save: cur })); C.dirty = true; if (typeof UI !== 'undefined' && UI.rebuild) UI.rebuild(); push(true); return true; } } catch (e) {} return false; }

  function UIhook() { if (typeof UI !== 'undefined' && UI.renderCloud) UI.renderCloud(); }
  window.Cloud = Object.assign(C, { init, signIn, signOut, push, deleteCloud, backupInfo, restoreBackup, ago });
  window.addEventListener('DOMContentLoaded', () => setTimeout(init, 0));
})();
