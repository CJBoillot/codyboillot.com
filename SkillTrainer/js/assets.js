/*
 * assets.js - uploaded files, stored for real.
 *
 * localStorage caps at about 5MB and base64 inflates a binary by a third, so
 * embedding images and documents as data URIs falls over almost immediately.
 * Blobs go in IndexedDB instead, which is measured in hundreds of megabytes.
 *
 * Content refers to them with a custom scheme, `asset:<id>`. Nothing resolves
 * that at render time, because turning a blob into a URL is asynchronous and
 * rendering is not; instead a renderer emits `data-asset="<id>"` and hydrate()
 * fills in the real URL after mount.
 */

import { formatBytes } from "./dom.js";

const DB_NAME = "skilltrainer";
const STORE = "assets";
const VERSION = 1;

const PREFIX = "asset:";
export const isAssetRef = (src) => typeof src === "string" && src.startsWith(PREFIX);
export const assetId = (src) => (isAssetRef(src) ? src.slice(PREFIX.length) : null);
export const assetRef = (id) => `${PREFIX}${id}`;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) return reject(new Error("IndexedDB unavailable"));
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(mode, fn) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const store = t.objectStore(STORE);
        let result;
        try {
          result = fn(store);
        } catch (e) {
          return reject(e);
        }
        t.oncomplete = () => resolve(result?.result ?? result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}

const newId = () =>
  `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/* ------------------------------------------------------------------ crud */

/** Store a File or Blob. Returns the record, whose id goes in the content. */
export async function putAsset(file, { name, type } = {}) {
  const record = {
    id: newId(),
    name: name || file.name || "file",
    type: type || file.type || "application/octet-stream",
    size: file.size ?? 0,
    added: new Date().toISOString(),
    blob: file,
  };
  await tx("readwrite", (store) => store.put(record));
  return { ...record, blob: undefined };
}

export async function getAsset(id) {
  return tx("readonly", (store) => store.get(id));
}

export async function deleteAsset(id) {
  revoke(id);
  return tx("readwrite", (store) => store.delete(id));
}

export async function listAssets() {
  const all = await tx("readonly", (store) => store.getAll());
  return (all || []).map(({ blob, ...meta }) => ({ ...meta }));
}

/* ------------------------------------------------------------------ urls */

const urlCache = new Map();

export async function assetUrl(id) {
  if (urlCache.has(id)) return urlCache.get(id);
  const record = await getAsset(id);
  if (!record?.blob) return null;
  const url = URL.createObjectURL(record.blob);
  urlCache.set(id, url);
  return url;
}

function revoke(id) {
  const url = urlCache.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(id);
  }
}

/**
 * Fill in every `data-asset` reference under `root`.
 *
 * Called after each render. Elements carry the reference rather than the URL
 * because object URLs cannot be produced synchronously, and a renderer that
 * returned a promise would infect every view.
 */
export async function hydrate(root = document) {
  const nodes = [...root.querySelectorAll("[data-asset]")];
  if (!nodes.length) return;

  await Promise.all(
    nodes.map(async (el) => {
      const id = el.dataset.asset;
      if (el.dataset.assetDone === id) return;
      const url = await assetUrl(id);
      if (!url) {
        el.dataset.assetMissing = "1";
        if (el.tagName === "IMG") el.alt = `${el.alt || "Image"} (missing from this browser)`;
        return;
      }
      if (el.tagName === "IMG" || el.tagName === "VIDEO" || el.tagName === "SOURCE") el.src = url;
      else if (el.tagName === "A") el.href = url;
      else el.style.backgroundImage = `url("${url}")`;
      el.dataset.assetDone = id;
    })
  );
}

/* ------------------------------------------------------- import / export */

const toBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

function fromBase64(base64, type) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

/** Walk a document and collect every asset id it refers to. */
export function collectAssetIds(doc) {
  const ids = new Set();
  const note = (value) => {
    if (isAssetRef(value)) ids.add(assetId(value));
  };
  (doc.trees || []).forEach((tree) => {
    const modules = [tree.novice, tree.master, ...(tree.columns || []).flatMap((c) => c.modules || [])];
    modules.filter(Boolean).forEach((m) => {
      ["images", "videos", "docs"].forEach((key) =>
        (m[key] || []).forEach((item) => {
          note(item.src);
          note(item.poster);
        })
      );
      (m.quiz?.questions || []).forEach((q) => note(q.image));
    });
  });
  return [...ids];
}

/**
 * Bundle the given assets as base64 so an exported pack is self-contained.
 * Big, by definition: a pack with a 5MB PDF in it is a 6.7MB JSON file.
 */
export async function bundleAssets(ids) {
  const out = {};
  for (const id of ids) {
    const record = await getAsset(id);
    if (!record?.blob) continue;
    out[id] = {
      name: record.name,
      type: record.type,
      size: record.size,
      data: await toBase64(record.blob),
    };
  }
  return out;
}

/** Restore bundled assets, keeping their original ids so references still resolve. */
export async function restoreAssets(bundle) {
  if (!bundle || typeof bundle !== "object") return 0;
  let count = 0;
  for (const [id, meta] of Object.entries(bundle)) {
    if (!meta?.data) continue;
    try {
      const blob = fromBase64(meta.data, meta.type || "application/octet-stream");
      revoke(id);
      await tx("readwrite", (store) =>
        store.put({
          id,
          name: meta.name || "file",
          type: meta.type || blob.type,
          size: meta.size ?? blob.size,
          added: new Date().toISOString(),
          blob,
        })
      );
      count += 1;
    } catch (e) {
      console.warn(`[assets] could not restore ${id}`, e);
    }
  }
  return count;
}

/** Drop assets nothing refers to any more. */
export async function pruneOrphans(doc) {
  const referenced = new Set(collectAssetIds(doc));
  const all = await listAssets();
  const orphans = all.filter((a) => !referenced.has(a.id));
  for (const a of orphans) await deleteAsset(a.id);
  return orphans;
}

export async function usage() {
  const all = await listAssets();
  const bytes = all.reduce((n, a) => n + (a.size || 0), 0);
  let quota = null;
  try {
    const est = await navigator.storage?.estimate?.();
    quota = est?.quota ?? null;
  } catch {
    /* not available everywhere */
  }
  return { count: all.length, bytes, quota, label: formatBytes(bytes) };
}
