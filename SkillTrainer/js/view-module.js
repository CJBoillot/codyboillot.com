/*
 * view-module.js - the module reader.
 *
 * Opening a module takes the lattice away and replaces it with the module's own
 * column as a rail, so the learner keeps their place without the whole tree
 * competing for attention. On narrow screens the rail becomes a horizontal
 * strip above the content.
 *
 * Block rendering is a registry: adding a new content type later means one
 * entry here and one form in the editor.
 */

import { html, icon, mount, on, raw, safeUrl, youtubeId } from "./dom.js";
import { renderRichText } from "./richtext.js";
import { assetId, isAssetRef } from "./assets.js";
import { POINTS_ENABLED, YOUTUBE_FACADE } from "./config.js";
import {
  MODULE_SECTIONS,
  TIER_NUMERALS,
  allModules,
  moduleDisplayName,
  modulePoints,
  moduleRungParts,
  moduleTierLabel,
  sectionHasContent,
  tierLevel,
} from "./schema.js";
import {
  blockingModule,
  canComplete,
  getPrefs,
  isComplete,
  moduleProgress,
  moduleState,
  setComplete,
  setPrefs,
} from "./store.js";
import { go, routes } from "./main.js";
import { openLightbox, toast } from "./ui.js";

export function renderModule(tree, entry, columnId = null) {
  const { module } = entry;
  const done = isComplete(module.id);
  const editing = getPrefs().editMode;
  const progress = moduleProgress(module.id);
  // A tier module is its own context; the caps borrow it from the route.
  const context = entry.role === "tier" ? entry.column.id : columnId;

  return html`
    <div class="view-module ${getPrefs().railOpen === false ? "rail-closed" : ""}">
      <div class="mod-rail-wrap">${rail(tree, entry, columnId)}</div>

      <div class="mod-main">
        <div class="mod-head">
          <div class="mod-kicker">
            <!-- Labelled on purpose: a bare glyph here competes with the
                 breadcrumbs and the Tree button for the meaning "go back". -->
            <button class="rail-toggle" data-act="toggle-rail"
                    aria-expanded="${String(getPrefs().railOpen !== false)}"
                    title="${getPrefs().railOpen === false ? "Show the menu" : "Hide the menu"}">
              <span class="rail-toggle-ico">${icon(getPrefs().railOpen === false ? "sidebarOff" : "sidebarOn")}</span>
              <span class="rail-toggle-label">Menu</span>
            </button>
            <span class="pill ${done ? "ok" : "ghost"}">
              ${done ? icon("check") : ""} ${moduleTierLabel(entry)}
            </span>
            ${entry.role === "tier"
              ? html`<span class="chip chip-level">${tierLevel(entry.tier)}</span>`
              : ""}
            ${entry.column ? html`<span class="chip">${entry.column.title}</span>` : ""}
            ${POINTS_ENABLED && modulePoints(entry)
              ? html`<span class="chip">${modulePoints(entry)} skill points</span>`
              : ""}
            ${module.quiz?.questions?.length
              ? html`<span class="chip">${icon("callout")} ${module.quiz.questions.length} question quiz</span>`
              : ""}
            ${editing
              ? html`<button class="btn btn-ghost btn-sm" data-act="edit-module"
                             data-tree="${tree.id}" data-module="${module.id}">
                  ${icon("pencil")} Edit
                </button>`
              : ""}
          </div>

          <h1>${moduleDisplayName(entry)}</h1>
          ${module.title && entry.role === "tier"
            ? html`<p class="mod-topic">${module.title}</p>`
            : ""}
          ${module.blurb ? html`<p class="mod-blurb">${module.blurb}</p>` : ""}
        </div>

        ${body(tree, entry, done, progress, context)}
      </div>
    </div>
  `;
}

/*
 * The content is always here. Only the quiz is ordered, so the footer is where
 * the prerequisite shows up, never the body.
 */
function body(tree, entry, done, progress, context) {
  const { module } = entry;
  const hasQuiz = !!module.quiz?.questions?.length;
  const ready = canComplete(tree, entry);
  const blocker = ready ? null : blockingModule(tree, entry);
  const next = nextInTree(tree, entry);
  // Keep the category in the URL as you move around, so the rail stays put.
  const link = (e) => routes.module(tree.id, e.module.id, e.column?.id || context);

  const filled = MODULE_SECTIONS.filter((s) => sectionHasContent(module, s.key));

  return html`
    ${filled.length
      ? html`<div class="mod-sections">${filled.map((s) => renderSection(tree, entry, s, ready))}</div>`
      : html`<div class="empty" style="padding:2rem">
          <h3>No content yet</h3>
          <p>This module is a placeholder. Turn on edit mode to fill it in.</p>
        </div>`}

    ${!ready && blocker
      ? html`<div class="banner prereq">
          ${icon("callout")}
          <div>
            <strong>Read as much as you like.</strong>
            To mark this one complete you need
            <a class="md-link" href="${link(blocker)}">${moduleDisplayName(blocker)}</a>
            finished first.
          </div>
        </div>`
      : ""}

    <div class="mod-foot">
      ${hasQuiz
        ? ready
          ? html`<a class="btn btn-primary" href="${routes.quiz(tree.id, module.id)}">
              ${icon("play")} ${done ? "Retake the quiz" : "Take the quiz"}
            </a>`
          : html`<button class="btn btn-ghost" disabled
                         title="Complete ${blocker ? moduleDisplayName(blocker) : "the tier below"} first">
              ${icon("play")} Quiz locked
            </button>`
        : done
          ? html`<button class="btn btn-ghost" data-act="uncomplete" data-module="${module.id}">
              ${icon("reset")} Mark as not done
            </button>`
          : ready
            ? html`<button class="btn btn-primary" data-act="complete" data-module="${module.id}">
                ${icon("check")} Mark complete
              </button>`
            : html`<button class="btn btn-ghost" disabled>${icon("check")} Complete the tier below first</button>`}

      ${next
        ? html`<a class="btn btn-ghost" href="${link(next)}">
            Next: ${moduleDisplayName(next)} ${icon("chevron")}
          </a>`
        : ""}

      <a class="btn btn-quiet" href="${routes.tree(tree.id)}">${icon("back")} Tree</a>

      ${progress.attempts
        ? html`<span style="margin-left:auto;font-size:.8rem;color:var(--muted-2)">
            Best ${progress.bestPct}% over ${progress.attempts}
            ${progress.attempts === 1 ? "attempt" : "attempts"}
          </span>`
        : ""}
    </div>
  `;
}

/** The next module a learner would reasonably take after this one. */
function nextInTree(tree, entry) {
  const entries = allModules(tree);
  const at = entries.findIndex((e) => e.module.id === entry.module.id);
  if (entry.role === "tier" && entry.column.modules[entry.tier]) {
    const id = entry.column.modules[entry.tier].id;
    return entries.find((e) => e.module.id === id);
  }
  return entries.slice(at + 1).find((e) => !isComplete(e.module.id)) || null;
}

/* ------------------------------------------------------------------ rail */

/*
 * The rail mirrors the lattice, top to bottom: Master, tier IV down to tier I,
 * Novice, then a way back out.
 *
 * Novice and Master belong to no category, so on their own they have no tier
 * stack to show. But stepping out to Novice FROM a category should not throw
 * away where you were, so every rail link carries the category forward in the
 * URL and the rail keeps showing it. Only a cold link to Novice or Master, with
 * no category in the route, falls back to listing the categories.
 */
function rail(tree, entry, columnId) {
  const byRole = (role) => allModules(tree).find((e) => e.role === role);
  const master = byRole("master");
  const novice = byRole("novice");

  const column =
    entry.role === "tier"
      ? entry.column
      : tree.columns.find((c) => c.id === columnId) || null;

  const tiers = column
    ? allModules(tree)
        .filter((e) => e.column === column)
        .slice()
        .reverse() // IV at the top, matching the lattice
    : [];

  const heading = column ? column.title : tree.title;

  return html`
    <nav class="mod-rail" aria-label="${heading}">
      <div class="rail-head">${heading}</div>

      ${railItem(tree, master, entry, column)}
      ${tiers.map((e) => railItem(tree, e, entry, column))}
      ${column ? "" : tree.columns.map((col) => categoryItem(tree, col))}
      ${railItem(tree, novice, entry, column)}

      <a class="rail-item is-exit" href="${routes.tree(tree.id)}">
        <span class="rail-n">${icon("grid")}</span><span class="rail-t"><span class="rail-lines"><span class="rail-title">Whole tree</span></span></span>
      </a>
    </nav>
  `;
}

/*
 * The rank of a rung, as a slug. One attribute drives the whole decorative
 * system: the number of diagonal cuts, the wash, the edge light and the ink.
 * The progression N -> I -> II -> III -> IV -> M adds complexity a step at a
 * time rather than giving each tier its own unrelated look.
 */
export const TIER_SLUGS = ["basic", "foundational", "skilled", "advanced"];

export function tierSlug(entry) {
  if (!entry) return "";
  if (entry.role === "novice") return "novice";
  if (entry.role === "master") return "master";
  return TIER_SLUGS[entry.tier - 1] || "basic";
}

/** The oversized character behind a pill: the numeral, or M and N for the caps. */
export function markFor(entry) {
  if (!entry) return "";
  if (entry.role === "novice") return "N";
  if (entry.role === "master") return "M";
  return TIER_NUMERALS[entry.tier - 1] || "";
}

/** Badges: the full numeral for tiers, N and M for the caps, a tick when done. */
function railBadge(entry, done) {
  if (done) return icon("check");
  if (entry.role === "novice") return "N";
  if (entry.role === "master") return "M";
  return TIER_NUMERALS[entry.tier - 1] || String(entry.tier);
}

function railItem(tree, e, current, column) {
  if (!e) return "";
  const state = moduleState(tree, e);
  const isCurrent = e.module.id === current.module.id;
  const cls = ["rail-item", "tier-pill", `is-${state}`, isCurrent ? "is-current" : ""]
    .filter(Boolean)
    .join(" ");

  /*
   * The rung stacks: category on top, level beneath. A hyphenated single line
   * made the two read as one phrase and truncated at the worst possible place;
   * stacked, each part gets its own line and its own weight.
   *
   * The numeral survives twice over: small and sharp in the badge, and huge and
   * faded behind the pill as `data-mark`, which the stylesheet draws as a skewed
   * gradient watermark.
   */
  const mark = markFor(e);
  const { title, level } = moduleRungParts(e);


  return html`
    <a class="${cls}" href="${routes.module(tree.id, e.module.id, column?.id)}"
       title="${moduleDisplayName(e)}" data-mark="${mark}" data-tier="${tierSlug(e)}">
      <span class="rail-n">${railBadge(e, state === "complete")}</span>
      <span class="rail-t"><span class="rail-lines">
        <span class="rail-title">${title}</span>
        ${level ? html`<span class="rail-level">${level}</span>` : ""}
      </span></span>
    </a>
  `;
}

/*
 * Novice and Master sit outside every category, so their rail lists the
 * categories instead of a tier stack. The badge shows how far that category has
 * got, which is the thing you actually want to know from here.
 */
function categoryItem(tree, column) {
  const done = column.modules.filter((m) => isComplete(m.id)).length;
  const target = column.modules.find((m) => !isComplete(m.id)) || column.modules[0];
  const complete = done === column.modules.length;

  return html`
    <a class="rail-item rail-cat ${complete ? "is-complete" : ""}"
       href="${routes.module(tree.id, target.id, column.id)}" title="${column.title}">
      <span class="rail-n">${complete ? icon("check") : `${done}/${column.modules.length}`}</span>
      <span class="rail-t"><span class="rail-lines"><span class="rail-title">${column.title}</span></span></span>
    </a>
  `;
}

/* ---------------------------------------------------------------- blocks */
/* -------------------------------------------------------------- sections */

/*
 * Sections render in a fixed order and each is collapsible. Open/closed state
 * lives per section key in prefs, so a reader who always skips straight past the
 * main article keeps that preference across modules.
 *
 * Only sections with something in them are rendered at all; an empty Videos
 * heading is noise.
 */
function renderSection(tree, entry, section, ready) {
  const { module } = entry;
  const collapsed = isSectionCollapsed(section.key);
  const count = section.kind === "richtext" || section.kind === "quiz"
    ? null
    : (module[section.key] || []).length;

  return html`
    <section class="mod-section ${collapsed ? "is-collapsed" : ""}" data-section="${section.key}">
      <button class="sec-toggle" type="button" data-act="toggle-section" data-key="${section.key}"
              aria-expanded="${String(!collapsed)}">
        <span class="sec-chevron">${icon("chevronDown")}</span>
        <span class="sec-ico">${icon(section.icon)}</span>
        <span class="sec-title">${section.label}</span>
        ${count != null ? html`<span class="sec-count">${count}</span>` : ""}
      </button>
      <div class="sec-body">${SECTION_RENDERERS[section.kind](tree, entry, ready)}</div>
    </section>
  `;
}

const SECTION_RENDERERS = {
  richtext: (tree, entry) => html`<div class="prose">${renderRichText(entry.module.body)}</div>`,

  articles: (tree, entry) => html`
    <div class="sec-stack">
      ${entry.module.articles.map(
        (a) => html`
          <article class="sub-article">
            ${a.title ? html`<h3>${a.title}</h3>` : ""}
            <div class="prose">${renderRichText(a.body)}</div>
          </article>
        `
      )}
    </div>
  `,

  links: (tree, entry) => html`
    <div class="sec-stack">
      ${entry.module.links.map((l) => {
        const url = safeUrl(l.url);
        if (!url) return "";
        return html`
          <a class="resource" href="${url}" target="_blank" rel="noopener noreferrer">
            <span class="res-ico">${icon("link")}</span>
            <span class="res-body">
              <span class="res-title">${l.title || url}</span>
              <span class="res-sub">${l.note || hostOf(url)}</span>
            </span>
            ${icon("chevron", "ico-go")}
          </a>
        `;
      })}
    </div>
  `,

  docs: (tree, entry) => html`
    <div class="sec-stack">
      ${entry.module.docs.map((d) => {
        const stored = isAssetRef(d.src);
        const url = stored ? "" : safeUrl(d.src);
        if (!stored && !url) return "";
        const meta = [d.kind ? d.kind.toUpperCase() : "", d.size || "", d.filename || ""]
          .filter(Boolean)
          .join(" · ");
        return html`
          <a class="resource" ${stored ? raw(`data-asset="${assetId(d.src)}"`) : raw(`href="${url}"`)}
             download="${d.filename || ""}" target="_blank" rel="noopener noreferrer">
            <span class="res-ico">${icon("file")}</span>
            <span class="res-body">
              <span class="res-title">${d.title || d.filename || "Download"}</span>
              <span class="res-sub">${meta || (url ? hostOf(url) : "Saved in this browser")}</span>
            </span>
            ${icon("download", "ico-go")}
          </a>
        `;
      })}
    </div>
  `,

  images: (tree, entry) => html`
    <div class="sec-grid">
      ${entry.module.images.map((im) => {
        const stored = isAssetRef(im.src);
        const src = stored ? "" : safeUrl(im.src);
        if (!stored && !src) return "";
        return html`
          <figure class="block-image">
            ${im.title ? html`<h3>${im.title}</h3>` : ""}
            <img ${stored ? raw(`data-asset="${assetId(im.src)}"`) : raw(`src="${src}"`)}
                 alt="${im.alt || im.title || ""}" loading="lazy" data-act="zoom">
            ${im.caption ? html`<figcaption>${im.caption}</figcaption>` : ""}
          </figure>
        `;
      })}
    </div>
  `,

  videos: (tree, entry) => html`
    <div class="sec-stack">${entry.module.videos.map(renderVideo)}</div>
  `,

  quiz: (tree, entry, ready) => {
    const { module } = entry;
    const blocker = ready ? null : blockingModule(tree, entry);
    const done = isComplete(module.id);
    const q = module.quiz;
    return html`
      <div class="quiz-teaser">
        <div>
          <strong>${q.title || "Module check"}</strong>
          <div class="hint">
            ${q.questions.length} ${q.questions.length === 1 ? "question" : "questions"} ·
            ${q.passPct}% to pass${q.allowRetry ? " · retries allowed" : ""}
          </div>
        </div>
        ${ready
          ? html`<a class="btn btn-primary btn-sm" href="${routes.quiz(tree.id, module.id)}">
              ${icon("play")} ${done ? "Retake" : "Take the quiz"}
            </a>`
          : html`<button class="btn btn-ghost btn-sm" disabled
                         title="Complete ${blocker ? moduleDisplayName(blocker) : "the tier below"} first">
              ${icon("lock")} Locked
            </button>`}
      </div>
    `;
  },
};

/*
 * A click-to-play facade rather than a live iframe.
 *
 * YouTube hosts both the thumbnail and the video, so neither costs the site any
 * bandwidth, but an embedded player pulls hundreds of kilobytes of script on
 * page load whether or not anyone watches. The facade is one image until someone
 * actually presses play.
 */
function renderVideo(v) {
  if (v.kind === "youtube") {
    const id = youtubeId(v.videoId);
    if (!id) return "";
    const start = Math.max(0, Math.floor(Number(v.start) || 0));
    const watch = `https://www.youtube.com/watch?v=${id}${start ? `&t=${start}` : ""}`;
    const linkOnly = v.mode === "link" || !YOUTUBE_FACADE;

    const thumb = html`
      <img class="yt-thumb" src="https://i.ytimg.com/vi/${id}/maxresdefault.jpg"
           alt="" loading="lazy"
           onerror="this.onerror=null;this.src='https://i.ytimg.com/vi/${id}/hqdefault.jpg'">
      <span class="yt-play" aria-hidden="true">${icon("play")}</span>
    `;

    return html`
      <figure>
        ${v.title ? html`<h3>${v.title}</h3>` : ""}
        <div class="media-frame yt-facade">
          ${linkOnly
            ? html`<a class="yt-cover" href="${watch}" target="_blank" rel="noopener noreferrer"
                      aria-label="Watch ${v.title || "on YouTube"} on YouTube">${thumb}</a>`
            : html`<button class="yt-cover" type="button" data-act="yt-play"
                           data-id="${id}" data-start="${String(start)}"
                           aria-label="Play ${v.title || "video"}">${thumb}</button>`}
        </div>
        <figcaption>
          ${v.caption ? html`${v.caption} · ` : ""}
          <a class="md-link" href="${watch}" target="_blank" rel="noopener noreferrer">Watch on YouTube</a>
        </figcaption>
      </figure>
    `;
  }

  const stored = isAssetRef(v.src);
  const src = stored ? "" : safeUrl(v.src);
  if (!stored && !src) return "";

  return html`
    <figure>
      ${v.title ? html`<h3>${v.title}</h3>` : ""}
      <div class="media-frame">
        ${v.kind === "embed" && !stored
          ? html`<iframe src="${src}" title="${v.title || "Video"}" loading="lazy" allowfullscreen></iframe>`
          : html`<video controls preload="metadata"
                        ${v.poster && !isAssetRef(v.poster) ? raw(`poster="${safeUrl(v.poster)}"`) : ""}
                        ${stored ? raw(`data-asset="${assetId(v.src)}"`) : raw(`src="${src}"`)}></video>`}
      </div>
      ${v.caption ? html`<figcaption>${v.caption}</figcaption>` : ""}
    </figure>
  `;
}

/* Collapse state is a preference, not view state, so it survives navigation. */
function isSectionCollapsed(key) {
  const map = getPrefs().collapsedSections || {};
  return !!map[key];
}

function hostOf(url) {
  try {
    return new URL(url, location.href).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/* -------------------------------------------------------------- handlers */

on(document, "click", '[data-act="zoom"]', (_, img) => {
  openLightbox(img.currentSrc || img.src, img.alt);
});

/* Swap the facade for the real player, only once someone asks for it. */
on(document, "click", '[data-act="yt-play"]', (_, btn) => {
  const id = btn.dataset.id;
  const start = Number(btn.dataset.start) || 0;
  const params = new URLSearchParams({ autoplay: "1", rel: "0" });
  if (start) params.set("start", String(start));

  const frame = document.createElement("iframe");
  frame.src = `https://www.youtube-nocookie.com/embed/${id}?${params}`;
  frame.title = btn.getAttribute("aria-label") || "Video";
  frame.allow = "autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
  frame.allowFullscreen = true;
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  btn.replaceWith(frame);
});

on(document, "click", '[data-act="complete"]', (_, btn) => {
  setComplete(btn.dataset.module, true);
  toast("Module complete. The next tier is open.");
});

on(document, "click", '[data-act="uncomplete"]', (_, btn) => {
  setComplete(btn.dataset.module, false);
  toast("Marked as not done.");
});

/*
 * Section collapse toggles the class in place for the same reason as the rail:
 * a repaint would replace the element and kill the height transition.
 */
on(document, "click", '[data-act="toggle-section"]', (_, btn) => {
  const section = btn.closest(".mod-section");
  if (!section) return;
  const collapsed = section.classList.toggle("is-collapsed");
  btn.setAttribute("aria-expanded", String(!collapsed));

  const map = { ...(getPrefs().collapsedSections || {}) };
  if (collapsed) map[btn.dataset.key] = true;
  else delete map[btn.dataset.key];
  setPrefs({ collapsedSections: map }, "rail");
});

/*
 * The rail toggle flips a class on the live DOM rather than re-rendering: a
 * repaint would swap the elements mid-transition and the slide would never play.
 * The preference is saved under its own reason so the router leaves the view
 * alone (see the subscribe filter in main.js).
 */
on(document, "click", '[data-act="toggle-rail"]', (_, btn) => {
  const view = btn.closest(".view-module");
  if (!view) return;
  const open = view.classList.toggle("rail-closed") === false;

  btn.setAttribute("aria-expanded", String(open));
  btn.title = open ? "Hide the menu" : "Show the menu";
  // Swapped by hand because this deliberately does not re-render, so the slide
  // is not interrupted. The glyph fills its left column when the menu is open.
  const slot = btn.querySelector(".rail-toggle-ico");
  if (slot) mount(slot, icon(open ? "sidebarOn" : "sidebarOff"));

  setPrefs({ railOpen: open }, "rail");
});
