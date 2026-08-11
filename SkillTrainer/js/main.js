/*
 * main.js - boot, routing and the persistent chrome.
 *
 * Hash routing, because this is a static host with no rewrite rules. Deep links
 * and the browser back button both work, which matters most on mobile where
 * back is how people close things.
 */

import { $, html, icon, mount, on, raw } from "./dom.js";
import { findModule, findSection, findTree, moduleDisplayName } from "./schema.js";
import { boot, getDoc, getLoadErrors, getPrefs, setPrefs, subscribe } from "./store.js";
import { initTheme, resolvedTheme, toggleTheme } from "./theme.js";
import { toast } from "./ui.js";
import { renderAllTrees, renderSections } from "./view-browse.js";
import { renderTree, syncConnectors } from "./view-tree.js";
import { renderModule } from "./view-module.js";
import { renderQuiz } from "./quiz.js";
import { closeEditor, openModuleEditor } from "./editor.js";
import { openManageMenu } from "./manage.js";
import { isUnlocked, requestUnlock } from "./auth.js";
import { hydrate } from "./assets.js";

const app = $("#app");
const crumbsEl = $("#crumbs");
const actionsEl = $("#topbar-actions");

/* --------------------------------------------------------------- router */

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "");
  const parts = raw.split("/").filter(Boolean).map(decodeURIComponent);

  if (!parts.length) return { name: "sections" };
  if (parts[0] === "trees") return { name: "trees" };
  if (parts[0] === "s" && parts[1]) return { name: "section", sectionId: parts[1] };
  if (parts[0] === "edit" && parts[1] === "m" && parts[2] && parts[3]) {
    return { name: "edit-module", treeId: parts[2], moduleId: parts[3] };
  }
  if (parts[0] === "t" && parts[1]) {
    if (parts[2] === "m" && parts[3]) {
      if (parts[4] === "quiz") return { name: "quiz", treeId: parts[1], moduleId: parts[3] };
      // ".../c/:columnId" remembers which category you were reading when you
      // stepped out to Novice or Master, so the rail does not lose its place.
      const columnId = parts[4] === "c" ? parts[5] : null;
      return { name: "module", treeId: parts[1], moduleId: parts[3], columnId };
    }
    return { name: "tree", treeId: parts[1] };
  }
  return { name: "sections" };
}

export const routes = {
  sections: () => "#/",
  trees: () => "#/trees",
  section: (id) => `#/s/${encodeURIComponent(id)}`,
  tree: (id) => `#/t/${encodeURIComponent(id)}`,
  module: (treeId, moduleId, columnId = null) =>
    `#/t/${encodeURIComponent(treeId)}/m/${encodeURIComponent(moduleId)}` +
    (columnId ? `/c/${encodeURIComponent(columnId)}` : ""),
  quiz: (treeId, moduleId) => `#/t/${encodeURIComponent(treeId)}/m/${encodeURIComponent(moduleId)}/quiz`,
  editModule: (treeId, moduleId) => `#/edit/m/${encodeURIComponent(treeId)}/${encodeURIComponent(moduleId)}`,
};

export function go(hash, { replace = false } = {}) {
  if (replace) location.replace(hash);
  else location.hash = hash;
}

/* ---------------------------------------------------------------- views */

let editorKey = null;

/** Repaint the current route. Views with local state call this after mutating it. */
export function requestRender() {
  render();
}

function render() {
  const route = parseHash();
  const doc = getDoc();

  // The editor is a route so that back closes it, but it floats above whatever
  // view was already there rather than replacing it.
  if (route.name === "edit-module") {
    const tree = findTree(doc, route.treeId);
    const entry = tree && findModule(tree, route.moduleId);
    if (!entry) return go(routes.sections(), { replace: true });

    // A deep link to the editor is still a way in, so it is gated too.
    if (!isUnlocked()) {
      requestUnlock().then((ok) => {
        if (ok) render();
        else go(routes.tree(route.treeId), { replace: true });
      });
      renderView({ name: "tree", treeId: route.treeId });
      renderChrome({ name: "tree", treeId: route.treeId });
      return;
    }

    renderView({ name: "tree", treeId: route.treeId });
    renderChrome({ name: "tree", treeId: route.treeId });

    const key = `${route.treeId}:${route.moduleId}`;
    if (editorKey !== key) {
      editorKey = key;
      openModuleEditor(route.treeId, route.moduleId, () => {
        editorKey = null;
        if (parseHash().name === "edit-module") history.back();
      });
    }
    return;
  }

  if (editorKey) {
    editorKey = null;
    closeEditor();
  }

  renderView(route);
  renderChrome(route);
}

function renderView(route) {
  const result = paintView(route);
  // Uploaded files live in IndexedDB, so their URLs can only be filled in once
  // the markup is on the page.
  hydrate(app);
  // Same reason: the connector geometry can only be measured after layout.
  syncConnectors(app);
  return result;
}

function paintView(route) {
  const doc = getDoc();

  switch (route.name) {
    case "sections":
      return mount(app, renderSections(doc, getLoadErrors()));
    case "trees":
      return mount(app, renderAllTrees(doc));
    /*
     * There is no per-section page any more: the catalogue shows everything on
     * one page. The route survives so existing links still work, and it opens
     * the named section rather than dumping the visitor at the top.
     */
    case "section": {
      const section = findSection(doc, route.sectionId);
      if (!section) return notFound("That section is not in this document.");
      return mount(app, renderSections(doc, getLoadErrors(), section.id));
    }
    case "tree": {
      const tree = findTree(doc, route.treeId);
      if (!tree) return notFound("That tree is not in this document.");
      return mount(app, renderTree(tree));
    }
    case "module":
    case "quiz": {
      const tree = findTree(doc, route.treeId);
      const entry = tree && findModule(tree, route.moduleId);
      if (!entry) return notFound("That module is not in this document.");
      return mount(
        app,
        route.name === "quiz" ? renderQuiz(tree, entry) : renderModule(tree, entry, route.columnId)
      );
    }
    default:
      return notFound("Unknown page.");
  }
}

function notFound(message) {
  mount(
    app,
    html`
      <div class="wrap view">
        <div class="empty">
          <h3>Nothing here</h3>
          <p>${message}</p>
          <a class="btn btn-primary" href="${routes.sections()}">Back to sections</a>
        </div>
      </div>
    `
  );
}

/* --------------------------------------------------------------- chrome */

function renderChrome(route) {
  const doc = getDoc();
  const prefs = getPrefs();
  const trail = [];

  trail.push({ label: "Sections", href: routes.sections() });

  if (route.name === "trees") trail.push({ label: "All trees" });

  if (route.name === "section") {
    trail.push({ label: findSection(doc, route.sectionId)?.title || "Section" });
  }

  if (route.treeId) {
    const tree = findTree(doc, route.treeId);
    const isTreeRoot = route.name === "tree";
    trail.push({ label: tree?.title || "Tree", href: isTreeRoot ? null : routes.tree(route.treeId) });
    if (!isTreeRoot && tree) {
      const entry = findModule(tree, route.moduleId);
      if (entry) {
        trail.push({
          label: moduleDisplayName(entry),
          href: route.name === "quiz" ? routes.module(route.treeId, route.moduleId) : null,
        });
      }
      if (route.name === "quiz") trail.push({ label: "Quiz" });
    }
  }

  mount(
    crumbsEl,
    html`${trail.map((c, i) =>
      html`${i > 0 ? icon("chevron") : ""}${
        c.href
          ? html`<a href="${c.href}">${c.label}</a>`
          : html`<span class="${i === trail.length - 1 ? "crumb-now" : ""}">${c.label}</span>`
      }`
    )}`
  );

  const dark = resolvedTheme() === "dark";
  mount(
    actionsEl,
    html`
      <button class="icon-btn ${prefs.unlockAll ? "is-on" : ""}" data-act="unlock"
              title="${
                prefs.unlockAll
                  ? "Prerequisites ignored: any quiz can be taken"
                  : "Ignore prerequisites, so any quiz can be taken"
              }"
              aria-pressed="${String(!!prefs.unlockAll)}">${icon("eye")}</button>
      <button class="icon-btn ${prefs.editMode ? "is-on" : ""}" data-act="edit-mode"
              title="${
                prefs.editMode
                  ? "Edit mode is on"
                  : isUnlocked()
                    ? "Turn on edit mode"
                    : "Turn on edit mode (password)"
              }"
              aria-pressed="${String(!!prefs.editMode)}">
        ${icon(prefs.editMode || isUnlocked() ? "pencil" : "lock")}</button>
      <button class="icon-btn" data-act="theme" title="Switch to ${dark ? "light" : "dark"} mode">
        ${icon(dark ? "sun" : "moon")}</button>
      <button class="icon-btn" data-act="manage" title="Content: import, export, reset">${icon("settings")}</button>
    `
  );

  document.body.classList.toggle("edit-mode", !!prefs.editMode);
}

on(actionsEl, "click", "[data-act]", (_, btn) => {
  switch (btn.dataset.act) {
    case "theme":
      return toggleTheme();
    case "edit-mode": {
      // Turning editing ON needs the password; turning it off never does.
      if (getPrefs().editMode) {
        setPrefs({ editMode: false });
        return toast("Edit mode off.");
      }
      return requestUnlock().then((ok) => {
        if (!ok) return;
        setPrefs({ editMode: true });
        toast("Edit mode on. Every module has a pencil.");
      });
    }
    case "unlock": {
      const next = !getPrefs().unlockAll;
      setPrefs({ unlockAll: next });
      toast(
        next
          ? "Prerequisites ignored. Any quiz can be taken, in any order."
          : "Prerequisites back on. A tier needs the one below it finished."
      );
      return;
    }
    case "manage":
      return openManageMenu();
  }
});

/* ----------------------------------------------------------------- boot */

window.addEventListener("hashchange", render);

subscribe((_, reason) => {
  // Editing repaints itself; re-rendering underneath would fight the sheet.
  if (reason === "edit" && editorKey) return;
  // The rail toggle animates the live DOM; a repaint would kill the transition.
  if (reason === "rail") return;
  render();
});

(async function start() {
  initTheme();
  try {
    await boot();
  } catch (e) {
    console.error("[main] boot failed", e);
  }
  render();

  const errors = getLoadErrors();
  if (errors.length) {
    console.warn("[main] some packs failed to load", errors);
  }
})();
