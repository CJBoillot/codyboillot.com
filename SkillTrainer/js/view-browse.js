/*
 * view-browse.js - the one browse page.
 *
 * Everything lives here: every section, collapsed by default, expanding to show
 * its sub-sections and the trees under them. Software Engineering > AWS >
 * Lambdas, on a single screen.
 *
 * There is deliberately no per-section page any more. Big section cards spent a
 * lot of vertical space to tell you a name and a count, then charged a
 * navigation to see what was inside. An accordion of compact rows shows the same
 * thing in place, and the whole document stays scannable.
 *
 * Navigation is plain anchors with hash hrefs, so the browser handles focus,
 * middle-click and back on its own.
 */

import { html, icon, on } from "./dom.js";
import { TIERS, sectionTreeIds, sectionsForTree } from "./schema.js";
import { POINTS_ENABLED } from "./config.js";
import { getPrefs, sectionProgress, setPrefs, treeProgress } from "./store.js";
import { routes } from "./main.js";
import {
  createGroup,
  createSection,
  createTree,
  deleteSection,
  deleteTree,
  duplicateTree,
  openSectionSettings,
  openTreeSettings,
} from "./editor.js";

const isOpen = (id) => !!(getPrefs().openSections || {})[id];

/* ------------------------------------------------------------- sections */

export function renderSections(doc, loadErrors = [], focusId = null) {
  const editing = getPrefs().editMode;

  return html`
    <div class="wrap view">
      ${loadErrors.length ? loadErrorBanner(loadErrors) : ""}

      <div class="page-head">
        <div class="eyebrow">${icon("grid")} SkillTrainer</div>
        <h1>Browse the <span class="gradient-text">catalogue</span></h1>
        <p>
          Sections hold sub-sections, and sub-sections hold skill trees. Open a section to see
          what is inside. Work a tree from Novice upward, one tier at a time, exactly like the old
          Star Wars Galaxies skill boxes.
        </p>
        <div class="row" style="margin-top:1.1rem">
          <a class="btn btn-ghost btn-sm" href="${routes.trees()}">${icon("book")} All trees</a>
          <button class="btn btn-ghost btn-sm" data-act="expand-all">${icon("chevronDown")} Expand all</button>
          <button class="btn btn-ghost btn-sm" data-act="collapse-all">${icon("chevron")} Collapse all</button>
          ${editing
            ? html`<button class="btn btn-ghost btn-sm" data-act="add-section">
                ${icon("plus")} New section
              </button>`
            : ""}
        </div>
      </div>

      ${doc.sections.length
        ? html`<div class="catalogue">
            ${doc.sections.map((s) => sectionRow(doc, s, editing, focusId))}
          </div>`
        : emptyState(editing)}
    </div>
  `;
}

function sectionRow(doc, section, editing, focusId) {
  // A section named in the URL opens on arrival, so old per-section links land
  // somewhere sensible instead of nowhere.
  const open = isOpen(section.id) || section.id === focusId;
  const p = sectionProgress(section);
  const treeCount = sectionTreeIds(section).length;
  const named = section.groups.filter((g) => g.title);

  return html`
    <section class="cat-sec ${open ? "is-open" : ""}" data-sec="${section.id}">
      <button class="cat-head" data-act="toggle-sec" data-id="${section.id}"
              aria-expanded="${String(open)}">
        <span class="cat-chevron">${icon("chevronDown")}</span>
        <span class="cat-name">${section.title}</span>
        <span class="cat-meta">
          ${treeCount} ${treeCount === 1 ? "tree" : "trees"}${named.length
            ? html` · ${named.length} ${named.length === 1 ? "sub-section" : "sub-sections"}`
            : ""}
        </span>
        <span class="cat-bar"><i style="width:${p.total ? (p.completed / p.total) * 100 : 0}%"></i></span>
        <span class="cat-count">${p.completed}/${p.total}</span>
      </button>

      <!-- Everything sits in ONE inner element: the panel collapses with
           grid-template-rows 1fr -> 0fr, and that only sizes the first row, so
           extra children would keep their auto height and never collapse. -->
      <div class="cat-panel"><div class="cat-panel-inner">
        ${section.blurb ? html`<p class="cat-blurb">${section.blurb}</p>` : ""}

        ${editing
          ? html`<div class="row cat-tools">
              <button class="btn btn-ghost btn-sm" data-act="edit-section" data-id="${section.id}">
                ${icon("settings")} Section settings
              </button>
              <button class="btn btn-ghost btn-sm" data-act="add-group" data-id="${section.id}">
                ${icon("plus")} New sub-section
              </button>
              <button class="btn btn-ghost btn-sm" data-act="add-tree" data-id="${section.id}">
                ${icon("plus")} New tree
              </button>
              <button class="btn btn-ghost btn-sm" data-act="del-section" data-id="${section.id}"
                      style="color:var(--danger)">${icon("trash")} Delete section</button>
            </div>`
          : ""}

        ${section.groups.length
          ? section.groups.map((g) => groupBlock(doc, section, g, editing))
          : html`<p class="hint" style="padding:.4rem 0">
              Nothing in this section yet.${editing ? " Add a sub-section or a tree above." : ""}
            </p>`}
      </div></div>
    </section>
  `;
}

/*
 * An untitled sub-section renders its trees directly, with no heading. That is
 * what a section with no sub-divisions should look like, and it is exactly what
 * the v2 migration produces, so old packs read unchanged.
 */
function groupBlock(doc, section, group, editing) {
  const trees = group.treeIds.map((id) => doc.trees.find((t) => t.id === id)).filter(Boolean);

  return html`
    <div class="cat-group">
      ${group.title
        ? html`<div class="cat-group-head">
            <span class="cat-group-name">${group.title}</span>
            <span class="cat-group-count">${trees.length}</span>
            ${editing
              ? html`<span class="ed-tools">
                  <button class="ed-tool" data-act="add-tree" data-id="${section.id}"
                          data-group="${group.id}" title="New tree here">${icon("plus")}</button>
                </span>`
              : ""}
          </div>`
        : ""}
      ${group.blurb ? html`<p class="hint cat-group-blurb">${group.blurb}</p>` : ""}

      ${trees.length
        ? html`<div class="tree-rows">
            ${trees.map((t) => treeRow(doc, t, editing, section.id))}
          </div>`
        : html`<p class="hint cat-group-empty">No trees here yet.</p>`}
    </div>
  `;
}

function treeRow(doc, tree, editing, currentSectionId = null) {
  const p = treeProgress(tree);
  const done = p.pct === 100;

  /*
   * A tree can sit in several sections at once, which is worth saying so the
   * same title turning up twice reads as deliberate rather than as a duplicate.
   *
   * It used to be a bare copy glyph, which said nothing and, being a sixth child
   * of a five-column grid, wrapped onto a second row and made every shared row
   * taller than its neighbours. It is a phrase on the subtitle line now: no
   * extra row, and no guessing what the icon meant.
   */
  const elsewhere = sectionsForTree(doc, tree.id)
    .filter((s) => s.id !== currentSectionId)
    .map((s) => s.title);
  const alsoIn = elsewhere.length
    ? `${currentSectionId ? "also in" : "in"} ${
        elsewhere.length > 2 ? `${elsewhere[0]} and ${elsewhere.length - 1} others` : elsewhere.join(", ")
      }`
    : "";
  const sub = [tree.subtitle, alsoIn].filter(Boolean).join(" · ");

  return html`
    <div class="tree-row ${done ? "is-done" : ""}">
      <a class="tree-row-link" href="${routes.tree(tree.id)}"
         title="${[tree.title, sub].filter(Boolean).join(" · ")}">
        <span class="tr-mark">${done ? icon("check") : icon("book")}</span>
        <span class="tr-body">
          <span class="tr-name">${tree.title}</span>
          ${sub ? html`<span class="tr-sub">${sub}</span>` : ""}
        </span>
        <span class="tr-shape">${tree.columns.length} × ${TIERS}</span>
        <span class="tr-bar"><i style="width:${p.pct}%"></i></span>
        <span class="tr-count">${p.completed}/${p.total}</span>
        ${POINTS_ENABLED ? html`<span class="tr-pts">${p.points}/${p.totalPoints}</span>` : ""}
      </a>
      ${editing
        ? html`<span class="ed-tools tr-tools">
            <button class="ed-tool" data-act="edit-tree" data-id="${tree.id}" title="Tree settings">${icon("pencil")}</button>
            <button class="ed-tool" data-act="dup-tree" data-id="${tree.id}" title="Duplicate">${icon("copy")}</button>
            <button class="ed-tool danger" data-act="del-tree" data-id="${tree.id}" title="Delete tree">${icon("trash")}</button>
          </span>`
        : ""}
    </div>
  `;
}

function emptyState(editing) {
  return html`
    <div class="empty">
      <h3>No content installed</h3>
      <p>
        Drop a pack JSON into <code>content/packs/</code> and list it in
        <code>content/manifest.json</code>, or import one from the Content menu.
      </p>
      ${editing
        ? html`<button class="btn btn-primary" data-act="add-section">${icon("plus")} Create a section</button>`
        : html`<p style="margin-top:1rem">Turn on edit mode in the top bar to build one here.</p>`}
    </div>
  `;
}

function loadErrorBanner(errors) {
  return html`
    <div class="banner warn">
      ${icon("callout")}
      <div>
        <strong>${errors.length} shipped ${errors.length === 1 ? "pack" : "packs"} could not be loaded.</strong>
        ${errors.map((e) => html`<div>${e.file}: ${e.message}</div>`)}
      </div>
    </div>
  `;
}

/* ----------------------------------------------------------- all trees */

export function renderAllTrees(doc) {
  const editing = getPrefs().editMode;

  return html`
    <div class="wrap view">
      <div class="page-head">
        <div class="eyebrow">${icon("book")} Library</div>
        <h1>All trees</h1>
        <p>
          Every tree in the document, including any that no section lists yet. A tree is not owned
          by a section: the same one can appear in as many as you like.
        </p>
        <div class="row" style="margin-top:1.1rem">
          <a class="btn btn-ghost btn-sm" href="${routes.sections()}">${icon("grid")} Back to the catalogue</a>
          ${editing
            ? html`<button class="btn btn-ghost btn-sm" data-act="add-tree">${icon("plus")} New tree</button>`
            : ""}
        </div>
      </div>

      ${doc.trees.length
        ? html`<div class="tree-rows">${doc.trees.map((t) => treeRow(doc, t, editing))}</div>`
        : html`<div class="empty"><h3>No trees yet</h3><p>Import a pack or create one in edit mode.</p></div>`}
    </div>
  `;
}

/* ------------------------------------------------------------ handlers */

/*
 * Expanding toggles the class on the live DOM and saves the preference under a
 * reason the router ignores, so the panel animates instead of being replaced
 * mid-transition.
 */
function setOpen(id, open) {
  const map = { ...(getPrefs().openSections || {}) };
  if (open) map[id] = true;
  else delete map[id];
  setPrefs({ openSections: map }, "rail");
}

on(document, "click", '[data-act="toggle-sec"]', (event, btn) => {
  event.preventDefault();
  const sec = btn.closest(".cat-sec");
  if (!sec) return;
  const open = sec.classList.toggle("is-open");
  btn.setAttribute("aria-expanded", String(open));
  setOpen(btn.dataset.id, open);
});

on(document, "click", '[data-act="expand-all"]', (event) => {
  event.preventDefault();
  const map = {};
  document.querySelectorAll(".cat-sec").forEach((s) => {
    s.classList.add("is-open");
    s.querySelector(".cat-head")?.setAttribute("aria-expanded", "true");
    map[s.dataset.sec] = true;
  });
  setPrefs({ openSections: map }, "rail");
});

on(document, "click", '[data-act="collapse-all"]', (event) => {
  event.preventDefault();
  document.querySelectorAll(".cat-sec").forEach((s) => {
    s.classList.remove("is-open");
    s.querySelector(".cat-head")?.setAttribute("aria-expanded", "false");
  });
  setPrefs({ openSections: {} }, "rail");
});

on(document, "click", "[data-act]", (event, btn) => {
  const id = btn.dataset.id;
  switch (btn.dataset.act) {
    case "add-section":
      event.preventDefault();
      return createSection();
    case "edit-section":
      event.preventDefault();
      event.stopPropagation();
      return openSectionSettings(id);
    case "del-section":
      event.preventDefault();
      event.stopPropagation();
      return deleteSection(id);
    case "add-group":
      event.preventDefault();
      event.stopPropagation();
      return createGroup(id);
    case "add-tree":
      event.preventDefault();
      event.stopPropagation();
      return createTree(id, btn.dataset.group);
    case "edit-tree":
      event.preventDefault();
      event.stopPropagation();
      return openTreeSettings(id);
    case "dup-tree":
      event.preventDefault();
      event.stopPropagation();
      return duplicateTree(id);
    case "del-tree":
      event.preventDefault();
      event.stopPropagation();
      return deleteTree(id);
  }
});
