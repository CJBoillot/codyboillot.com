/*
 * store.js - all state and all persistence.
 *
 * Views never touch localStorage directly. Everything funnels through here, so
 * swapping the backing store later (IndexedDB, a real API) is contained to this
 * file.
 *
 * Three separate concerns are persisted under three keys:
 *   doc      the content universe, authored
 *   progress what the learner has completed
 *   prefs    theme, edit mode, unlock-all
 */

import {
  allModules,
  deepClone,
  findModule,
  findTree,
  makeDoc,
  mergeDocs,
  modulePoints,
  normalize,
  sectionTreeIds,
  setMarkdownConverter,
  today,
  validate,
} from "./schema.js";
import { markdownToHtmlString } from "./markdown.js";

/* schema.js stays dependency-free, so the v1 -> v2 migration's markdown
   converter is injected here rather than imported there. */
setMarkdownConverter(markdownToHtmlString);

const KEY = {
  doc: "skilltrainer:doc:v1",
  progress: "skilltrainer:progress:v1",
  prefs: "skilltrainer:prefs:v1",
};

const DEFAULT_PREFS = {
  theme: null, // null means follow the system preference
  editMode: false,
  unlockAll: false,
  railOpen: true, // the module view's left menu
  collapsedSections: {}, // { [sectionKey]: true } for the module reader
  openSections: {}, // { [sectionId]: true } for the browse accordion
};

/* --------------------------------------------------------------- storage */

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn(`[store] could not read ${key}`, e);
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (e) {
    // Almost always the ~5MB quota, usually a data-URI image that was too big.
    console.error(`[store] could not write ${key}`, e);
    return { ok: false, error: e };
  }
}

/** Rough footprint of what we are storing, for the editor's quota meter. */
export function storageUsage() {
  let bytes = 0;
  for (const k of Object.values(KEY)) {
    const raw = localStorage.getItem(k);
    if (raw) bytes += raw.length * 2; // UTF-16 code units
  }
  const limit = 5 * 1024 * 1024;
  return { bytes, limit, pct: Math.min(100, Math.round((bytes / limit) * 100)) };
}

/* ----------------------------------------------------------------- state */

const state = {
  doc: makeDoc(),
  shipped: makeDoc(), // the packs as committed, for "reset to shipped"
  progress: {},
  prefs: { ...DEFAULT_PREFS },
  ready: false,
  loadErrors: [],
};

const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(reason = "change") {
  listeners.forEach((fn) => {
    try {
      fn(state, reason);
    } catch (e) {
      console.error("[store] listener failed", e);
    }
  });
}

export const getDoc = () => state.doc;
export const getProgress = () => state.progress;
export const getPrefs = () => state.prefs;
export const getLoadErrors = () => state.loadErrors;
export const isReady = () => state.ready;

/* ------------------------------------------------------------------ boot */

/*
 * Shipped packs are always fetched, because "reset" has to have something to
 * reset to. If the learner has local edits those win, which is what makes the
 * in-browser editor feel like it owns the content.
 */
export async function boot() {
  state.shipped = await loadShippedPacks();
  state.prefs = { ...DEFAULT_PREFS, ...readJSON(KEY.prefs, {}) };
  state.progress = readJSON(KEY.progress, {});

  const local = readJSON(KEY.doc, null);
  state.doc = local ? normalize(local) : deepClone(state.shipped);

  state.ready = true;
  emit("boot");
  return state.doc;
}

async function loadShippedPacks() {
  let doc = makeDoc();
  state.loadErrors = [];

  let manifest;
  try {
    const res = await fetch("content/manifest.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    manifest = await res.json();
  } catch (e) {
    state.loadErrors.push({ file: "content/manifest.json", message: String(e.message || e) });
    return doc;
  }

  for (const entry of manifest.packs || []) {
    const file = typeof entry === "string" ? entry : entry.file;
    try {
      const res = await fetch(`content/packs/${file}`, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const pack = await res.json();
      const report = validate(normalize(pack));
      if (!report.ok) {
        state.loadErrors.push({
          file,
          message: report.errors.map((e) => `${e.path}: ${e.message}`).join("; "),
        });
        continue;
      }
      doc = mergeDocs(doc, pack);
    } catch (e) {
      state.loadErrors.push({ file, message: String(e.message || e) });
    }
  }

  return normalize(doc);
}

/* ------------------------------------------------------------ mutations */

/*
 * The one write path. `mutate` hands a draft to the caller, persists whatever
 * comes back, and notifies. Callers never persist by hand.
 */
export function mutate(fn, reason = "edit") {
  const draft = deepClone(state.doc);
  const result = fn(draft);
  const next = result === undefined ? draft : result;
  next.meta = { ...next.meta, updated: today() };
  state.doc = next;
  const written = writeJSON(KEY.doc, next);
  emit(reason);
  return written;
}

export function setPrefs(patch, reason = "prefs") {
  state.prefs = { ...state.prefs, ...patch };
  writeJSON(KEY.prefs, state.prefs);
  emit(reason);
}

/* ------------------------------------------------------------- progress */

export function moduleProgress(moduleId) {
  return state.progress[moduleId] || { completed: false, bestPct: 0, attempts: 0, at: null };
}

export function isComplete(moduleId) {
  return !!state.progress[moduleId]?.completed;
}

export function recordAttempt(moduleId, pct, passed) {
  const prev = moduleProgress(moduleId);
  state.progress[moduleId] = {
    completed: prev.completed || passed,
    bestPct: Math.max(prev.bestPct, Math.round(pct)),
    attempts: prev.attempts + 1,
    at: new Date().toISOString(),
  };
  writeJSON(KEY.progress, state.progress);
  emit("progress");
  return state.progress[moduleId];
}

export function setComplete(moduleId, completed = true) {
  const prev = moduleProgress(moduleId);
  state.progress[moduleId] = {
    ...prev,
    completed,
    at: completed ? new Date().toISOString() : prev.at,
  };
  writeJSON(KEY.progress, state.progress);
  emit("progress");
}

export function resetTreeProgress(treeId) {
  const tree = findTree(state.doc, treeId);
  if (!tree) return;
  allModules(tree).forEach((e) => delete state.progress[e.module.id]);
  writeJSON(KEY.progress, state.progress);
  emit("progress");
}

export function resetAllProgress() {
  state.progress = {};
  writeJSON(KEY.progress, state.progress);
  emit("progress");
}

/* ---------------------------------------------------------- progression */

/*
 * Nothing is ever locked. Every module's content is readable at any time, in any
 * order: a learner can read ahead, skim the whole tree, or jump to whatever they
 * actually need today.
 *
 * What IS gated is COMPLETION. A module turns green only when its quiz is
 * passed, and it can only be attempted once the module below it is green:
 *
 *   novice   always attemptable
 *   tier 1   needs novice complete
 *   tier N   needs tier N-1 of the same category complete
 *   master   needs tier IV of every category complete
 *
 * So the tree stays browsable while the credential stays ordered.
 *
 * "Ignore prerequisites" bypasses the ordering, which is what makes it possible
 * to test a quiz halfway up a tree without completing everything beneath it.
 */
export function canComplete(tree, moduleOrId) {
  const entry = typeof moduleOrId === "string" ? findModule(tree, moduleOrId) : moduleOrId;
  if (!entry) return false;
  if (state.prefs.unlockAll) return true;
  return prerequisiteMet(tree, entry);
}

function prerequisiteMet(tree, entry) {
  if (entry.role === "novice") return true;

  if (entry.role === "master") {
    return tree.columns.every((col) => {
      const last = col.modules[col.modules.length - 1];
      return last ? isComplete(last.id) : true;
    });
  }

  if (entry.tier === 1) return tree.novice ? isComplete(tree.novice.id) : true;
  const previous = entry.column.modules[entry.tier - 2];
  return previous ? isComplete(previous.id) : true;
}

/** The module that has to go green before this one can. */
export function blockingModule(tree, entry) {
  if (entry.role === "novice") return null;
  if (entry.role === "master") {
    const outstanding = tree.columns
      .map((col) => col.modules[col.modules.length - 1])
      .filter((m) => m && !isComplete(m.id));
    return outstanding.length ? findModule(tree, outstanding[0].id) : null;
  }
  const previous =
    entry.tier === 1 ? tree.novice : entry.column.modules[entry.tier - 2];
  return previous && !isComplete(previous.id) ? findModule(tree, previous.id) : null;
}

/**
 * How a box reads on the lattice:
 *   complete   green, quiz passed
 *   available  orange, the quiz can be taken now
 *   pending    neutral, readable but not yet attemptable
 */
export function moduleState(tree, entry) {
  if (isComplete(entry.module.id)) return "complete";
  return prerequisiteMet(tree, entry) || state.prefs.unlockAll ? "available" : "pending";
}

/** The module a learner should do next, used for the "Continue" affordance. */
export function nextModule(tree) {
  const entries = allModules(tree);
  return (
    entries.find((e) => !isComplete(e.module.id) && prerequisiteMet(tree, e)) ||
    entries.find((e) => !isComplete(e.module.id)) ||
    null
  );
}

export function treeProgress(tree) {
  const entries = allModules(tree);
  let done = 0;
  let points = 0;
  let totalPoints = 0;

  entries.forEach((e) => {
    const p = modulePoints(e);
    totalPoints += p;
    if (isComplete(e.module.id)) {
      done += 1;
      points += p;
    }
  });

  return {
    completed: done,
    total: entries.length,
    points,
    totalPoints,
    pct: entries.length ? Math.round((done / entries.length) * 100) : 0,
  };
}

export function sectionProgress(section) {
  const trees = sectionTreeIds(section).map((id) => findTree(state.doc, id)).filter(Boolean);
  return trees.reduce(
    (acc, t) => {
      const p = treeProgress(t);
      acc.completed += p.completed;
      acc.total += p.total;
      acc.trees += 1;
      return acc;
    },
    { completed: 0, total: 0, trees: 0 }
  );
}

/* --------------------------------------------------- import and export */

export function exportDoc() {
  return deepClone(state.doc);
}

export function exportTree(treeId) {
  const tree = findTree(state.doc, treeId);
  if (!tree) return null;
  // Carry only the sub-sections that actually hold this tree, trimmed to it.
  const sections = state.doc.sections
    .filter((s) => sectionTreeIds(s).includes(treeId))
    .map((s) => ({
      ...deepClone(s),
      groups: s.groups
        .filter((g) => g.treeIds.includes(treeId))
        .map((g) => ({ ...deepClone(g), treeIds: [treeId] })),
    }));
  return {
    schemaVersion: state.doc.schemaVersion,
    meta: { ...state.doc.meta, title: tree.title },
    sections,
    trees: [deepClone(tree)],
  };
}

export function exportSection(sectionId) {
  const section = state.doc.sections.find((s) => s.id === sectionId);
  if (!section) return null;
  return {
    schemaVersion: state.doc.schemaVersion,
    meta: { ...state.doc.meta, title: section.title },
    sections: [deepClone(section)],
    trees: sectionTreeIds(section).map((id) => findTree(state.doc, id)).filter(Boolean).map(deepClone),
  };
}

/**
 * Bring an external pack in. Returns a validation report; nothing is written
 * unless the pack is structurally sound.
 */
export function importDoc(raw, { mode = "merge" } = {}) {
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return { ok: false, errors: [{ path: "$", message: `Not valid JSON: ${e.message}` }], warnings: [] };
    }
  }

  const normalized = normalize(parsed);
  const report = validate(normalized);
  if (!report.ok) return report;

  const next = mode === "replace" ? normalized : mergeDocs(state.doc, normalized);
  state.doc = next;
  const written = writeJSON(KEY.doc, next);
  emit("import");
  return { ...report, written: written.ok, quotaError: !written.ok };
}

/** Throw away local edits and go back to the packs committed with the site. */
export function resetToShipped() {
  state.doc = deepClone(state.shipped);
  localStorage.removeItem(KEY.doc);
  emit("reset");
  return state.doc;
}

export function hasLocalEdits() {
  return localStorage.getItem(KEY.doc) != null;
}
