/*
 * view-tree.js - the lattice.
 *
 * Master on top, tiers descending, Novice at the bottom, columns side by side,
 * exactly like the SWG skill window.
 *
 * The no-scroll promise comes from layout math rather than tuned pixels: the
 * band takes whatever height is left over and divides it into `--tiers` equal
 * rows, so a 2x1 tree and a 6x6 tree both fit. Every box clamps its own text.
 *
 * Connectors are a per-column spine plus two horizontal rails. The spine runs
 * the full band height, which is what lets columns of unequal depth still join
 * cleanly at both ends.
 */

import { html, icon, on } from "./dom.js";
import { POINTS_ENABLED } from "./config.js";
import {
  TIERS,
  TIER_LEVELS,
  TIER_NUMERALS,
  allModules,
  findTree,
  moduleDisplayName,
  modulePoints,
  moduleTierLabel,
  tierLevel,
  tierShort,
} from "./schema.js";
import {
  getDoc,
  getPrefs,
  isComplete,
  moduleState,
  nextModule,
  resetTreeProgress,
  setComplete,
  treeProgress,
} from "./store.js";
import { markFor, tierSlug } from "./view-module.js";
import { toast } from "./ui.js";
import { go, routes } from "./main.js";

export function renderTree(tree) {
  const cols = tree.columns.length;
  const tiers = TIERS; // fixed ladder, same in every column of every tree
  const progress = treeProgress(tree);
  const next = nextModule(tree);
  const editing = getPrefs().editMode;

  return html`
    <div class="view-tree">
      <div class="tree-head">
        <h1>
          ${tree.title}
          ${tree.subtitle ? html`<span class="tree-sub">${tree.subtitle}</span>` : ""}
        </h1>

        <div class="tree-head-right">
          <!-- The tier ladder, stated once instead of repeated on sixteen boxes. -->
          <ol class="tier-legend" aria-label="Tier levels">
            ${TIER_NUMERALS.map(
              (n, i) => html`<li><b>${n}</b> ${TIER_LEVELS[i]}</li>`
            )}
          </ol>

          ${POINTS_ENABLED
            ? html`<div class="points-bar grow">
                <span>Skill&nbsp;points</span>
                <span class="points-track">
                  <span class="points-fill" style="width:${
                    progress.totalPoints ? (progress.points / progress.totalPoints) * 100 : 0
                  }%"></span>
                </span>
                <b>${progress.points}&thinsp;/&thinsp;${progress.totalPoints}</b>
              </div>`
            : html`<div class="tree-progress grow">
                <span class="meter"><i style="width:${progress.pct}%"></i></span>
                <b>${progress.completed}&thinsp;/&thinsp;${progress.total}</b>
              </div>`}

          ${editing
            ? html`<span class="row" style="gap:.4rem">
                <button class="btn btn-ghost btn-sm" data-act="fill-tree" data-tree="${tree.id}"
                        title="Mark every module complete, to preview the finished state">
                  ${icon("check")} Fill
                </button>
                <button class="btn btn-ghost btn-sm" data-act="clear-tree" data-tree="${tree.id}"
                        title="Clear all progress on this tree">
                  ${icon("reset")} Clear
                </button>
              </span>`
            : ""}

          ${next
            ? html`<a class="btn btn-primary btn-sm" href="${routes.module(tree.id, next.module.id)}"
                      title="${moduleDisplayName(next)}">
                ${icon("play")} ${progress.completed ? "Continue" : "Start"}
              </a>`
            : html`<span class="pill ok">${icon("star")} Mastered</span>`}
        </div>
      </div>

      <div class="lattice" style="--cols:${cols};--tiers:${tiers || 1}">
        <div class="lattice-cap is-master">
          ${moduleBox(tree, entryFor(tree, "master"), { cap: true, editing })}
        </div>

        <div class="lattice-band">
          ${tree.columns.map((column) => columnStack(tree, column, tiers, editing))}
        </div>

        <div class="lattice-cap is-novice">
          ${moduleBox(tree, entryFor(tree, "novice"), { cap: true, editing })}
        </div>
      </div>
    </div>
  `;
}

function entryFor(tree, role) {
  return allModules(tree).find((e) => e.role === role);
}

/*
 * Boxes are placed at explicit grid rows so a short column stays bottom-aligned
 * against Novice. Tier I always sits next to Novice, whatever the depth.
 */
function columnStack(tree, column, maxTiers, editing) {
  const entries = allModules(tree).filter((e) => e.column === column);

  return html`
    <div class="lattice-col" title="${column.title}">
      <span class="col-label">${column.title}</span>
      <div class="col-boxes">
        ${entries
          .slice()
          .reverse()
          .map((entry) => moduleBox(tree, entry, { row: maxTiers - entry.tier + 1, editing }))}
      </div>
    </div>
  `;
}

function moduleBox(tree, entry, { row = null, cap = false, editing = false } = {}) {
  if (!entry) return "";

  const { module } = entry;
  const state = moduleState(tree, entry);
  const points = modulePoints(entry);

  /*
   * The box says what the rung MEANS; the numeral behind it says where the rung
   * sits. "Design / Advanced" with a faded IV watermark beats "Design / IV",
   * which made you consult the legend every time.
   */
  const tierLabel = entry.role === "tier" ? tierShort(entry.tier) : moduleTierLabel(entry);
  const mark = markFor(entry);

  /* A tier box shows its column's name; the numeral underneath is what tells the
     four apart. Novice and Master carry their own. Points are deliberately
     absent: they are on the tree header and the module page, and repeating them
     on eighteen boxes was noise. */
  const name = cap ? module.title : entry.column.title;

  const classes = ["mbox", "tier-pill", `state-${state}`, cap ? "is-cap" : ""]
    .filter(Boolean)
    .join(" ");
  const style = row ? `grid-row:${row}` : "";

  const inner = html`
    ${editing
      ? html`<span class="mbox-edit" role="button" tabindex="0"
                   data-act="edit-module" data-tree="${tree.id}" data-module="${module.id}"
                   title="Edit ${moduleDisplayName(entry)}">${icon("pencil")}</span>
             <span class="mbox-toggle" role="button" tabindex="0"
                   data-act="toggle-complete" data-module="${module.id}"
                   title="${state === "complete" ? "Clear" : "Mark"} complete, ignoring prerequisites">
               ${icon(state === "complete" ? "reset" : "check")}</span>`
      : ""}
    ${state === "complete" ? html`<span class="mbox-mark">${icon("check")}</span>` : ""}
    <span class="mbox-title">${name}</span>
    <span class="mbox-tier">${tierLabel}</span>
  `;

  const status = {
    complete: "complete",
    available: "quiz available",
    pending: "readable now, complete the tier below it to take the quiz",
  }[state];

  const hint = [
    moduleDisplayName(entry),
    entry.role === "tier" ? tierLevel(entry.tier) : "",
    module.title,
    status,
    POINTS_ENABLED && points ? `${points} skill points` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  // Every module is a link. Nothing on the lattice is ever closed off.
  return html`<a class="${classes}" style="${style}"
                 data-mark="${mark}" data-tier="${tierSlug(entry)}"
                 href="${routes.module(tree.id, module.id)}"
                 title="${hint}">${inner}</a>`;
}

/*
 * Where the branch turns.
 *
 * The rails should sit halfway between a cap and the boxes, but that distance
 * is not expressible in CSS: the band stretches to fill the viewport while the
 * boxes are capped and centred inside it, so the gap changes with the window
 * and with the tree's shape. Measuring after layout and publishing the result
 * as two custom properties keeps the stylesheet declarative and the geometry
 * exact, rather than approximating it with a magic number that is wrong at
 * every size but one.
 */
export function syncConnectors(root = document) {
  const lattice = root.querySelector(".lattice");
  const boxes = root.querySelector(".col-boxes");
  const master = root.querySelector(".lattice-cap.is-master .mbox");
  const novice = root.querySelector(".lattice-cap.is-novice .mbox");
  if (!lattice || !boxes || !master || !novice) return;

  const b = boxes.getBoundingClientRect();
  const top = Math.max(0, b.top - master.getBoundingClientRect().bottom);
  const bottom = Math.max(0, novice.getBoundingClientRect().top - b.bottom);

  lattice.style.setProperty("--gap-top", `${top}px`);
  lattice.style.setProperty("--gap-bottom", `${bottom}px`);

  watch(lattice, boxes);
}

/*
 * Re-measure whenever the lattice changes shape. The observer has to watch the
 * lattice and the box stack themselves, not the document: the band absorbs the
 * spare height, so it can resize without the page doing so. The elements are
 * replaced on every render, hence the re-observe.
 */
let connectorObserver = null;
let observed = [];

function watch(...elements) {
  if (typeof ResizeObserver === "undefined") return;
  const next = elements.filter(Boolean);

  /*
   * Only re-observe when the targets have actually changed. Disconnecting and
   * re-observing on every callback looks harmless but is a feedback loop:
   * observe() fires an immediate callback, which syncs, which re-observes. The
   * browser detects the loop and quietly stops delivering, so the connectors
   * freeze at whatever they measured first.
   */
  if (next.length === observed.length && next.every((el, i) => el === observed[i])) return;

  if (!connectorObserver) connectorObserver = new ResizeObserver(() => syncConnectors());
  connectorObserver.disconnect();
  next.forEach((el) => connectorObserver.observe(el));
  observed = next;
}

window.addEventListener("resize", () => syncConnectors());

/*
 * The pencil sits inside the box, which is itself a link, so both the click and
 * the Enter key have to be stopped from following the link underneath.
 */
function openEditor(event, el) {
  event.preventDefault();
  event.stopPropagation();
  go(routes.editModule(el.dataset.tree, el.dataset.module));
}

on(document, "click", '[data-act="edit-module"]', openEditor);
on(document, "keydown", '[data-act="edit-module"]', (event, el) => {
  if (event.key === "Enter" || event.key === " ") openEditor(event, el);
});

/*
 * Authoring aids. Progression is what a learner earns; an author needs to see
 * the finished thing without sitting eighteen quizzes, so edit mode can set
 * completion directly and ignore the prerequisite chain entirely.
 */
function forceToggle(event, el) {
  event.preventDefault();
  event.stopPropagation();
  const id = el.dataset.module;
  setComplete(id, !isComplete(id));
}

on(document, "click", '[data-act="toggle-complete"]', forceToggle);
on(document, "keydown", '[data-act="toggle-complete"]', (event, el) => {
  if (event.key === "Enter" || event.key === " ") forceToggle(event, el);
});

on(document, "click", '[data-act="fill-tree"]', (event, btn) => {
  event.preventDefault();
  const tree = findTree(getDoc(), btn.dataset.tree);
  if (!tree) return;
  allModules(tree).forEach((e) => setComplete(e.module.id, true));
  toast("Every module marked complete. This is a preview, not progress.");
});

on(document, "click", '[data-act="clear-tree"]', (event, btn) => {
  event.preventDefault();
  resetTreeProgress(btn.dataset.tree);
  toast("Progress cleared on this tree.");
});
