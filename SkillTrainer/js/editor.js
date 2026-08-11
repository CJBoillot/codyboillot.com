/*
 * editor.js - authoring.
 *
 * Every editor works on a deep-cloned draft and commits through store.mutate()
 * on save, so cancelling costs nothing and a half-finished edit never reaches
 * localStorage.
 *
 * There is no undo stack. Destructive actions confirm first, trees can be
 * duplicated before risky edits, and export is the real safety net. That trade
 * buys most of undo's value for a fraction of the machinery.
 *
 * Reordering is up/down buttons rather than drag: drag-and-drop on touch is
 * unreliable, and the editor has to be genuinely usable on a phone.
 */

import {
  FILE_KINDS,
  LIMITS,
  MAX_COLUMN_TITLE,
  MAX_MODULE_TITLE,
  MODULE_SECTIONS,
  QUESTION_TYPES,
  TIERS,
  TIER_LEVELS,
  TIER_NUMERALS,
  VIDEO_KINDS,
  clamp,
  deepClone,
  findGroup,
  findModule,
  findSection,
  findTree,
  makeColumn,
  makeGroup,
  makeItem,
  makeModule,
  makeQuestion,
  makeQuiz,
  makeSection,
  makeTree,
  moduleDisplayName,
  reidTree,
  sectionTreeIds,
  slugId,
  uid,
} from "./schema.js";
import { formatBytes, html, icon, mount, moveItem, on, raw, toNode, youtubeId } from "./dom.js";
import { htmlToText, mountEditor } from "./richtext.js";
import { getDoc, getPrefs, mutate, setPrefs, storageUsage } from "./store.js";
import { confirmDialog, pickBinaryFile, promptDialog, toast } from "./ui.js";
import { assetId, assetRef, hydrate, isAssetRef, putAsset, usage as assetUsage } from "./assets.js";
import { UPLOAD_SOFT_LIMIT } from "./config.js";
import { go, routes } from "./main.js";

let sheet = null; // the open sheet element, if any
let closeHook = null;

export function closeEditor() {
  sheet?.remove();
  sheet = null;
  const hook = closeHook;
  closeHook = null;
  hook?.();
}

function openSheet({ title, badge, body, onSave, onClose, saveLabel = "Save" }) {
  closeEditor();
  closeHook = onClose || null;

  const node = toNode(html`
    <div class="sheet" role="dialog" aria-modal="true" aria-label="${title}">
      <div class="sheet-head">
        <button class="icon-btn" data-ed="close" title="Close without saving">${icon("close")}</button>
        <h2>${title}</h2>
        ${badge ? html`<span class="chip">${badge}</span>` : ""}
      </div>
      <div class="sheet-body"><div class="sheet-inner"></div></div>
      <div class="sheet-foot">
        <button class="btn btn-ghost" data-ed="close">Cancel</button>
        <button class="btn btn-primary" data-ed="save">${icon("check")} ${saveLabel}</button>
      </div>
    </div>
  `).firstElementChild;

  const inner = node.querySelector(".sheet-inner");
  mount(inner, body(inner));

  node.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-ed]");
    if (!btn || !node.contains(btn)) return;
    if (btn.dataset.ed === "close") closeEditor();
    if (btn.dataset.ed === "save") {
      const ok = onSave();
      if (ok !== false) closeEditor();
    }
  });

  document.body.appendChild(node);
  sheet = node;
  return { node, inner };
}

/* ================================================== module editor ====== */

export function openModuleEditor(treeId, moduleId, onClose) {
  const tree = findTree(getDoc(), treeId);
  const entry = tree && findModule(tree, moduleId);
  if (!entry) return;

  const draft = deepClone(entry.module);
  const open = new Set(); // which accordion cards are expanded
  let inner;

  const paint = () => {
    mount(inner, moduleForm(draft, open, entry));
    hydrate(inner); // resolve asset: previews once they are in the DOM
    refreshUsage(inner);
  };

  const ctx = openSheet({
    title: "Edit module",
    badge: `${tree.title} · ${moduleDisplayName(entry)}`,
    saveLabel: "Save module",
    onClose,
    body: (el) => {
      inner = el;
      queueMicrotask(() => {
        hydrate(el);
        refreshUsage(el);
      });
      return moduleForm(draft, open, entry);
    },
    onSave: () => {
      // Only Novice and Master need a title: a tier module is named by its
      // column, and its own title is an optional topic.
      if (entry.role !== "tier" && !draft.title.trim()) {
        toast("Novice and Master modules need a title.", "err");
        return false;
      }
      const written = mutate((doc) => {
        const t = findTree(doc, treeId);
        const e = findModule(t, moduleId);
        Object.assign(e.module, draft);
      });
      if (!written.ok) {
        toast("Could not save: browser storage is full. Remove an uploaded image.", "err", 6000);
        return false;
      }
      toast("Module saved.");
      return true;
    },
  });

  wireModuleEvents(ctx.node, draft, open, paint);
}

/*
 * The editor mirrors the reader: the same seven sections, in the same order,
 * each collapsible. Authoring a module and reading one should feel like the same
 * document seen from two sides.
 */
function moduleForm(draft, open, entry) {
  const usage = storageUsage();
  const isTier = entry.role === "tier";

  return html`
    <div class="ed-section">
      <h3>Module</h3>

      ${isTier
        ? html`
            <div class="field">
              <label>Name on the lattice</label>
              <div class="ed-derived">
                <b>${moduleDisplayName(entry)}</b>
                <span>from the ${entry.column.title} category</span>
              </div>
              <span class="hint">
                A category names every tier in it: ${entry.column.title} I, ${entry.column.title} II,
                and so on. Rename the category in tree settings and the whole stack follows.
              </span>
            </div>
            <div class="field">
              <label for="ed-title">Topic (optional)</label>
              <input id="ed-title" type="text" value="${draft.title}" data-mod="title"
                     placeholder="What this particular tier covers">
              <span class="hint">Shown on the module page, never on a lattice box.</span>
            </div>
          `
        : html`
            <div class="field">
              <label for="ed-title">Title</label>
              <input id="ed-title" type="text" value="${draft.title}" data-mod="title"
                     maxlength="${MAX_MODULE_TITLE}">
              <span class="hint">
                <b id="ed-title-count">${draft.title.length}</b> / ${MAX_MODULE_TITLE} characters.
              </span>
            </div>
          `}

      <div class="field">
        <label for="ed-blurb">Short description</label>
        <textarea id="ed-blurb" data-mod="blurb" style="min-height:64px"
                  placeholder="One or two lines under the title">${draft.blurb}</textarea>
      </div>
    </div>

    ${MODULE_SECTIONS.map((section) => editorSection(draft, section, open))}

    <div class="quota ${usage.pct > 70 ? "is-high" : ""}">
      <span>Text</span>
      <span class="meter"><i style="width:${usage.pct}%"></i></span>
      <span>${formatBytes(usage.bytes)} of ~5 MB</span>
      <span data-asset-usage>· files: counting…</span>
    </div>
  `;
}

/** Asset totals come from IndexedDB, so they land after the form is painted. */
async function refreshUsage(root) {
  const el = root?.querySelector("[data-asset-usage]");
  if (!el) return;
  try {
    const a = await assetUsage();
    el.textContent = `· ${a.count} ${a.count === 1 ? "file" : "files"}, ${a.label}`;
  } catch {
    el.textContent = "· files unavailable";
  }
}

/* ------------------------------------------------------ editor sections */

function editorSection(draft, section, open) {
  const collapsed = !open.has(`sec:${section.key}`);
  const count =
    section.kind === "richtext" || section.kind === "quiz" ? null : (draft[section.key] || []).length;

  return html`
    <div class="ed-section ed-collapsible ${collapsed ? "is-collapsed" : ""}" data-ed-section="${section.key}">
      <button type="button" class="ed-sec-head" data-toggle-sec="${section.key}"
              aria-expanded="${String(!collapsed)}">
        <span class="sec-chevron">${icon("chevronDown")}</span>
        <span class="sec-ico">${icon(section.icon)}</span>
        <span class="sec-title">${section.label}</span>
        ${count != null ? html`<span class="sec-count">${count}</span>` : ""}
      </button>
      <div class="ed-sec-body">
        <p class="hint" style="margin-bottom:.8rem">${section.hint}</p>
        ${SECTION_EDITORS[section.kind](draft, open)}
      </div>
    </div>
  `;
}

const SECTION_EDITORS = {
  /* The rich text surface is mounted imperatively after paint, because
     contenteditable cannot be driven from a string template. */
  richtext: (draft) => html`<div data-richtext="body"></div>`,

  articles: (draft) => listEditor(draft, "articles", (a, i, total) => html`
    <div class="field">
      <label>Heading</label>
      <input type="text" value="${a.title}" data-item="articles" data-id="${a.id}" data-field="title">
    </div>
    <div class="field">
      <label>Body</label>
      <div data-richtext="articles:${a.id}"></div>
    </div>
  `),

  links: (draft) => listEditor(draft, "links", (l) => html`
    <div class="field">
      <label>Label</label>
      <input type="text" value="${l.title}" data-item="links" data-id="${l.id}" data-field="title">
    </div>
    <div class="field">
      <label>URL</label>
      <input type="url" value="${l.url}" data-item="links" data-id="${l.id}" data-field="url"
             placeholder="https://…">
    </div>
    <div class="field">
      <label>Note (optional)</label>
      <input type="text" value="${l.note}" data-item="links" data-id="${l.id}" data-field="note">
    </div>
  `),

  videos: (draft) => listEditor(draft, "videos", (v) => html`
    <div class="field">
      <label>Source</label>
      <select data-item="videos" data-id="${v.id}" data-field="kind">
        ${VIDEO_KINDS.map(
          (k) => html`<option value="${k.kind}" ${v.kind === k.kind ? "selected" : ""}>${k.label}</option>`
        )}
      </select>
    </div>
    <div class="field">
      <label>Title</label>
      <input type="text" value="${v.title}" data-item="videos" data-id="${v.id}" data-field="title">
    </div>

    ${v.kind === "youtube"
      ? html`
          <div class="field">
            <label>YouTube video</label>
            <input type="text" value="${v.videoId}" data-item="videos" data-id="${v.id}" data-field="videoId"
                   placeholder="dQw4w9WgXcQ or any youtube.com URL">
            <span class="hint">Paste the id or the whole URL; the id is pulled out for you.</span>
          </div>
          ${youtubeId(v.videoId)
            ? html`<div class="field">
                <img src="https://i.ytimg.com/vi/${youtubeId(v.videoId)}/hqdefault.jpg" alt=""
                     style="max-width:200px;border-radius:8px;border:1px solid var(--line-2)">
              </div>`
            : ""}
          <div class="field">
            <label>Start at (seconds)</label>
            <input type="number" min="0" value="${v.start}" data-item="videos" data-id="${v.id}" data-field="start">
          </div>
          <div class="field">
            <label>How it appears</label>
            <select data-item="videos" data-id="${v.id}" data-field="mode">
              <option value="facade" ${v.mode !== "link" ? "selected" : ""}>Thumbnail, player loads on click</option>
              <option value="link" ${v.mode === "link" ? "selected" : ""}>Thumbnail that links to YouTube</option>
            </select>
            <span class="hint">Either way YouTube serves the video, so it costs you no bandwidth.</span>
          </div>
        `
      : html`
          ${uploadRow(v, "videos", "src", "video/*", "Upload a video")}
          <div class="field">
            <label>${v.kind === "embed" ? "Embed URL" : "Video URL or path"}</label>
            <input type="text" value="${v.src}" data-item="videos" data-id="${v.id}" data-field="src"
                   placeholder="assets/demo.mp4 or an embed URL">
          </div>
        `}

    <div class="field">
      <label>Caption (optional)</label>
      <input type="text" value="${v.caption}" data-item="videos" data-id="${v.id}" data-field="caption">
    </div>
  `),

  images: (draft) => listEditor(draft, "images", (im) => html`
    ${uploadRow(im, "images", "src", "image/*", "Upload an image")}
    <div class="field">
      <label>Heading (optional)</label>
      <input type="text" value="${im.title}" data-item="images" data-id="${im.id}" data-field="title">
    </div>
    <div class="field">
      <label>Or an image URL / repo path</label>
      <input type="text" value="${im.src}" data-item="images" data-id="${im.id}" data-field="src"
             placeholder="assets/diagram.png or https://…">
    </div>
    <div class="field">
      <label>Alt text</label>
      <input type="text" value="${im.alt}" data-item="images" data-id="${im.id}" data-field="alt">
      <span class="hint">Describe the image for screen readers.</span>
    </div>
    <div class="field">
      <label>Caption (optional)</label>
      <input type="text" value="${im.caption}" data-item="images" data-id="${im.id}" data-field="caption">
    </div>
  `),

  docs: (draft) => listEditor(draft, "docs", (d) => html`
    ${uploadRow(d, "docs", "src", ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.csv,.txt,.md", "Upload a document")}
    <div class="field">
      <label>Label</label>
      <input type="text" value="${d.title}" data-item="docs" data-id="${d.id}" data-field="title">
    </div>
    <div class="field">
      <label>Or a file URL / repo path</label>
      <input type="text" value="${d.src}" data-item="docs" data-id="${d.id}" data-field="src"
             placeholder="assets/handbook.pdf or https://…">
    </div>
    <div class="field">
      <label>Download filename</label>
      <input type="text" value="${d.filename}" data-item="docs" data-id="${d.id}" data-field="filename">
    </div>
    <div class="row">
      <div class="field grow">
        <label>Kind</label>
        <select data-item="docs" data-id="${d.id}" data-field="kind">
          ${FILE_KINDS.map((k) => html`<option value="${k}" ${d.kind === k ? "selected" : ""}>${k}</option>`)}
        </select>
      </div>
      <div class="field grow">
        <label>Size label</label>
        <input type="text" value="${d.size}" data-item="docs" data-id="${d.id}" data-field="size" placeholder="2.4 MB">
      </div>
    </div>
  `),

  quiz: (draft, open) => (draft.quiz ? quizForm(draft.quiz, open) : noQuiz()),
};

/** Add / reorder / delete, shared by every list-shaped section. */
function listEditor(draft, key, fields) {
  const items = draft[key] || [];
  const singular = { links: "link", videos: "video", images: "image", docs: "document", articles: "article" }[key];

  return html`
    ${items.map(
      (item, i) => html`
        <div class="ed-item is-open" data-row="${item.id}">
          <div class="ed-item-head" style="cursor:default">
            <span class="ed-kind">${i + 1}</span>
            <span class="ed-name">${itemLabel(key, item) || `Untitled ${singular}`}</span>
            <span class="ed-tools">
              <button class="ed-tool" data-move-item="${key}" data-index="${i}" data-dir="-1"
                      ${i === 0 ? "disabled" : ""} title="Move up">${icon("up")}</button>
              <button class="ed-tool" data-move-item="${key}" data-index="${i}" data-dir="1"
                      ${i === items.length - 1 ? "disabled" : ""} title="Move down">${icon("down")}</button>
              <button class="ed-tool danger" data-del-item="${key}" data-id="${item.id}"
                      title="Delete">${icon("trash")}</button>
            </span>
          </div>
          <div class="ed-item-body">${fields(item, i, items.length)}</div>
        </div>
      `
    )}
    <button class="btn btn-ghost btn-sm" type="button" data-add-item="${key}">
      ${icon("plus")} Add a ${singular}
    </button>
  `;
}

function itemLabel(key, item) {
  if (key === "links") return item.title || item.url;
  if (key === "videos") return item.title || item.videoId || item.src;
  if (key === "docs") return item.title || item.filename || item.src;
  if (key === "images") return item.title || item.alt || item.src;
  if (key === "articles") return item.title || htmlToText(item.body, 40);
  return item.title;
}

/*
 * The upload control, plus a preview of whatever is attached. The preview uses
 * data-asset rather than src because object URLs resolve asynchronously;
 * hydrate() fills them in after the form is mounted.
 */
function uploadRow(item, key, field, accept, label) {
  const value = item[field];
  const stored = isAssetRef(value);
  const isImage = accept.startsWith("image/");

  return html`
    <div class="upload-row">
      <button class="btn btn-ghost btn-sm" type="button"
              data-upload="${item.id}" data-key="${key}" data-field="${field}" data-accept="${accept}">
        ${icon("upload")} ${label}
      </button>
      ${stored
        ? html`
            ${isImage
              ? html`<img class="upload-thumb" data-asset="${assetId(value)}" alt="">`
              : html`<span class="chip">${icon("file")} Saved in this browser</span>`}
            <button class="btn btn-quiet btn-sm" type="button"
                    data-clear-upload="${item.id}" data-key="${key}" data-field="${field}">Remove</button>
          `
        : value
          ? html`<span class="hint">Currently a link or path</span>`
          : ""}
    </div>
  `;
}

/* ----------------------------------------------------------- quiz form */

function noQuiz() {
  return html`
    <p class="hint" style="margin-bottom:.9rem">
      Without a quiz the learner marks this module complete themselves. With one, passing it is
      what unlocks the tier above.
    </p>
    <button class="btn btn-ghost" type="button" data-quiz="add">${icon("plus")} Add a quiz</button>
  `;
}

function quizForm(quiz, open) {
  return html`
    <div class="field">
      <label>Quiz title</label>
      <input type="text" value="${quiz.title}" data-quiz-field="title">
    </div>
    <div class="field">
      <label>Intro (optional)</label>
      <textarea data-quiz-field="intro" style="min-height:64px">${quiz.intro}</textarea>
    </div>
    <div class="row" style="margin-bottom:1rem">
      <div class="field grow" style="margin:0">
        <label>Pass mark (%)</label>
        <input type="number" min="1" max="100" value="${quiz.passPct}" data-quiz-field="passPct">
      </div>
    </div>
    <div class="row" style="margin-bottom:1.1rem">
      <label class="switch">
        <input type="checkbox" ${quiz.allowRetry ? "checked" : ""} data-quiz-field="allowRetry"> Allow retries
      </label>
      <label class="switch">
        <input type="checkbox" ${quiz.shuffleQuestions ? "checked" : ""} data-quiz-field="shuffleQuestions"> Shuffle questions
      </label>
      <label class="switch">
        <input type="checkbox" ${quiz.shuffleChoices ? "checked" : ""} data-quiz-field="shuffleChoices"> Shuffle choices
      </label>
    </div>

    ${quiz.questions.map((q, i) => questionCard(q, i, quiz.questions.length, open))}

    <div class="type-picker">
      ${QUESTION_TYPES.map(
        (t) => html`<button type="button" data-add-q="${t.type}" title="${t.hint}">
          ${icon("plus")} ${t.label}
        </button>`
      )}
    </div>

    <button class="btn btn-ghost btn-sm" type="button" data-quiz="remove" style="color:var(--danger)">
      ${icon("trash")} Remove the quiz
    </button>
  `;
}

function questionCard(q, index, total, open) {
  const meta = QUESTION_TYPES.find((t) => t.type === q.type);

  return html`
    <div class="ed-item ${open.has(q.id) ? "is-open" : ""}">
      <div class="ed-item-head" data-toggle="${q.id}">
        <span class="ed-kind">${meta?.label || q.type}</span>
        <span class="ed-name">${q.prompt || `Question ${index + 1}`}</span>
        <span class="ed-tools">
          <button class="ed-tool" data-move-q="${index}" data-dir="-1"
                  ${index === 0 ? "disabled" : ""} title="Move up">${icon("up")}</button>
          <button class="ed-tool" data-move-q="${index}" data-dir="1"
                  ${index === total - 1 ? "disabled" : ""} title="Move down">${icon("down")}</button>
          <button class="ed-tool danger" data-del-q="${q.id}" title="Delete question">${icon("trash")}</button>
        </span>
      </div>
      <div class="ed-item-body">
        <div class="field">
          <label>Question</label>
          <textarea data-q="${q.id}" data-field="prompt" style="min-height:64px">${q.prompt}</textarea>
        </div>

        <div class="field">
          <label>Image (optional)</label>
          <input type="text" data-q="${q.id}" data-field="image" value="${q.image}"
                 placeholder="assets/diagram.png or https://…">
        </div>
        <div class="row" style="margin:-.4rem 0 .9rem">
          <button class="btn btn-ghost btn-sm" type="button" data-upload-q="${q.id}" data-field="image">
            ${icon("upload")} Upload
          </button>
          ${q.image ? html`<span class="hint">Image attached</span>` : ""}
        </div>
        ${q.image
          ? html`<div class="field">
              <label>Image alt text</label>
              <input type="text" data-q="${q.id}" data-field="imageAlt" value="${q.imageAlt}">
            </div>`
          : ""}

        ${answerFields(q)}

        <div class="row">
          <div class="field grow">
            <label>Points</label>
            <input type="number" min="1" max="100" value="${q.points}" data-q="${q.id}" data-field="points">
          </div>
        </div>

        <div class="field">
          <label>Explanation shown after grading (optional)</label>
          <textarea data-q="${q.id}" data-field="explanation" style="min-height:56px">${q.explanation}</textarea>
        </div>
      </div>
    </div>
  `;
}

function answerFields(q) {
  if (q.type === "tf") {
    return html`
      <div class="field">
        <label>Correct answer</label>
        <select data-q="${q.id}" data-field="answer">
          <option value="true" ${q.answer ? "selected" : ""}>True</option>
          <option value="false" ${!q.answer ? "selected" : ""}>False</option>
        </select>
      </div>
    `;
  }

  if (q.type === "exact") {
    return html`
      <div class="field">
        <label>Accepted answers</label>
        ${q.answers.map(
          (a, i) => html`
            <div class="ed-choice">
              <input type="text" value="${a}" data-answer="${q.id}" data-index="${i}"
                     placeholder="An answer that counts as correct">
              <button class="ed-tool danger" type="button" data-del-answer="${q.id}" data-index="${i}"
                      ${q.answers.length === 1 ? "disabled" : ""}>${icon("trash")}</button>
            </div>
          `
        )}
        <div class="row" style="margin-top:.4rem">
          <button class="btn btn-ghost btn-sm" type="button" data-add-answer="${q.id}">
            ${icon("plus")} Add an accepted answer
          </button>
        </div>
        <span class="hint">
          List every spelling that should count. Whitespace is trimmed either way.
        </span>
      </div>
      <label class="switch" style="margin-bottom:.9rem">
        <input type="checkbox" ${q.caseSensitive ? "checked" : ""} data-q="${q.id}" data-field="caseSensitive">
        Capitalisation must match
      </label>
    `;
  }

  const multi = q.type === "multi";
  return html`
    <div class="field">
      <label>Choices</label>
      ${q.choices.map(
        (c) => html`
          <div class="ed-choice">
            <input type="text" value="${c.text}" data-choice="${c.id}" data-q="${q.id}"
                   placeholder="Choice text">
            <label class="ed-correct" title="Mark as correct">
              <input type="${multi ? "checkbox" : "radio"}" name="correct-${q.id}"
                     ${c.correct ? "checked" : ""} data-correct="${c.id}" data-q="${q.id}">
              correct
            </label>
            <button class="ed-tool danger" type="button" data-del-choice="${c.id}" data-q="${q.id}"
                    ${q.choices.length <= 2 ? "disabled" : ""}>${icon("trash")}</button>
          </div>
        `
      )}
      <div class="row" style="margin-top:.4rem">
        <button class="btn btn-ghost btn-sm" type="button" data-add-choice="${q.id}">
          ${icon("plus")} Add a choice
        </button>
      </div>
      ${multi ? html`<span class="hint">Every correct choice must be selected to score the point.</span>` : ""}
    </div>
  `;
}

/* ------------------------------------------------------- module events */

/*
 * Text inputs write straight into the draft without repainting, so typing never
 * loses focus. Only structural changes (add, move, delete, toggle) repaint.
 */
/*
 * Text inputs write straight into the draft without repainting, so typing never
 * loses focus. Only structural changes (add, move, delete, collapse) repaint.
 *
 * The rich text surfaces are the exception: contenteditable cannot be rebuilt
 * from a string, so they are mounted after every paint and torn down with it.
 */
function wireModuleEvents(node, draft, open, paint) {
  const editors = new Map(); // data-richtext target -> editor handle

  const findIn = (key, id) => (draft[key] || []).find((x) => x.id === id);
  const findQ = (id) => draft.quiz?.questions.find((q) => q.id === id);

  /* ---- rich text ---- */

  const mountRichText = () => {
    editors.clear();
    node.querySelectorAll("[data-richtext]").forEach((host) => {
      const target = host.dataset.richtext;
      const [key, id] = target.split(":");
      const value = id ? findIn(key, id)?.body || "" : draft[key] || "";

      const handle = mountEditor(host, {
        value,
        minHeight: id ? "160px" : "260px",
        onChange: (htmlValue) => {
          if (id) {
            const item = findIn(key, id);
            if (item) item.body = htmlValue;
          } else {
            draft[key] = htmlValue;
          }
        },
      });
      editors.set(target, handle);
    });
  };

  // Paint is wrapped so every repaint re-mounts the editors that came with it.
  const repaint = () => {
    paint();
    mountRichText();
  };
  mountRichText();

  /* ---- plain fields ---- */

  on(node, "input", "[data-mod]", (_, el) => {
    const field = el.dataset.mod;
    draft[field] = field === "points" ? (el.value === "" ? null : clamp(el.value, 0, 100)) : el.value;
    if (field === "title") {
      const count = node.querySelector("#ed-title-count");
      if (count) count.textContent = el.value.length;
    }
  });

  const writeItem = (el) => {
    const item = findIn(el.dataset.item, el.dataset.id);
    if (!item) return;
    const field = el.dataset.field;
    item[field] = field === "start" ? Number(el.value) || 0 : el.value;
    const name = el.closest(".ed-item")?.querySelector(".ed-name");
    if (name) name.textContent = itemLabel(el.dataset.item, item) || "Untitled";
  };

  on(node, "input", "[data-item][data-field]", (_, el) => writeItem(el));
  on(node, "change", "[data-item][data-field]", (_, el) => {
    writeItem(el);
    // Switching a video's source kind changes which fields apply.
    if (el.dataset.field === "kind" && el.dataset.item === "videos") repaint();
  });

  on(node, "input", "[data-quiz-field]", (_, el) => {
    const f = el.dataset.quizField;
    if (!draft.quiz) return;
    draft.quiz[f] = f === "passPct" ? clamp(el.value, 1, 100) : el.value;
  });
  on(node, "change", "[data-quiz-field]", (_, el) => {
    if (draft.quiz && el.type === "checkbox") draft.quiz[el.dataset.quizField] = el.checked;
  });

  on(node, "input", "[data-q][data-field]", (_, el) => {
    const q = findQ(el.dataset.q);
    if (!q) return;
    const f = el.dataset.field;
    q[f] = f === "points" ? clamp(el.value, 1, 100) : el.value;
    if (f === "prompt") syncName(el, el.value);
  });
  on(node, "change", "[data-q][data-field]", (_, el) => {
    const q = findQ(el.dataset.q);
    if (!q) return;
    const f = el.dataset.field;
    if (f === "answer") q.answer = el.value === "true";
    else if (el.type === "checkbox") q[f] = el.checked;
  });

  on(node, "input", "[data-choice]", (_, el) => {
    const c = findQ(el.dataset.q)?.choices.find((x) => x.id === el.dataset.choice);
    if (c) c.text = el.value;
  });

  on(node, "change", "[data-correct]", (_, el) => {
    const q = findQ(el.dataset.q);
    if (!q) return;
    if (q.type === "mc") q.choices.forEach((c) => (c.correct = c.id === el.dataset.correct));
    else {
      const c = q.choices.find((x) => x.id === el.dataset.correct);
      if (c) c.correct = el.checked;
    }
  });

  on(node, "input", "[data-answer]", (_, el) => {
    const q = findQ(el.dataset.answer);
    if (q) q.answers[Number(el.dataset.index)] = el.value;
  });

  /* ---- sections ---- */

  on(node, "click", "[data-toggle-sec]", (_, btn) => {
    const key = `sec:${btn.dataset.toggleSec}`;
    if (open.has(key)) open.delete(key);
    else open.add(key);
    const wrap = btn.closest(".ed-collapsible");
    wrap.classList.toggle("is-collapsed", !open.has(key));
    btn.setAttribute("aria-expanded", String(open.has(key)));
    // Opening a section reveals a rich text host that has never been mounted.
    if (open.has(key) && wrap.querySelector("[data-richtext]")) mountRichText();
  });

  /* ---- list rows ---- */

  on(node, "click", "[data-add-item]", (_, btn) => {
    const key = btn.dataset.addItem;
    draft[key] = draft[key] || [];
    draft[key].push(makeItem(key));
    open.add(`sec:${key}`);
    repaint();
  });

  on(node, "click", "[data-move-item]", (_, btn) => {
    const key = btn.dataset.moveItem;
    const from = Number(btn.dataset.index);
    if (moveItem(draft[key], from, from + Number(btn.dataset.dir))) repaint();
  });

  on(node, "click", "[data-del-item]", async (_, btn) => {
    const key = btn.dataset.delItem;
    const ok = await confirmDialog({
      title: "Delete this entry?",
      message: "It is removed from the module. Export first if you might want it back.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    draft[key] = draft[key].filter((x) => x.id !== btn.dataset.id);
    repaint();
  });

  /* ---- uploads ---- */

  on(node, "click", "[data-upload]", async (_, btn) => {
    const file = await pickBinaryFile(btn.dataset.accept || "image/*");
    if (!file) return;
    const record = await storeUpload(file);
    if (!record) return;
    const item = findIn(btn.dataset.key, btn.dataset.upload);
    if (item) {
      item[btn.dataset.field || "src"] = assetRef(record.id);
      if ("filename" in item && !item.filename) item.filename = record.name;
      if ("size" in item && !item.size) item.size = formatBytes(record.size);
      if ("title" in item && !item.title) item.title = stripExt(record.name);
    }
    repaint();
  });

  on(node, "click", "[data-clear-upload]", (_, btn) => {
    const item = findIn(btn.dataset.key, btn.dataset.clearUpload);
    // The asset itself is kept; pruning happens on demand from the Content menu.
    if (item) item[btn.dataset.field] = "";
    repaint();
  });

  on(node, "click", "[data-upload-q]", async (_, btn) => {
    const file = await pickBinaryFile("image/*");
    if (!file) return;
    const record = await storeUpload(file);
    if (!record) return;
    const q = findQ(btn.dataset.uploadQ);
    if (q) q.image = assetRef(record.id);
    repaint();
  });

  /* ---- quiz ---- */

  on(node, "click", ".ed-item-head[data-toggle]", (event, head) => {
    if (event.target.closest(".ed-tools")) return;
    const id = head.dataset.toggle;
    if (open.has(id)) open.delete(id);
    else open.add(id);
    head.parentElement.classList.toggle("is-open", open.has(id));
  });

  on(node, "click", "[data-quiz]", async (_, btn) => {
    if (btn.dataset.quiz === "add") {
      draft.quiz = makeQuiz({ questions: [makeQuestion("mc")] });
      open.add("sec:quiz");
      open.add(draft.quiz.questions[0].id);
      return repaint();
    }
    const ok = await confirmDialog({
      title: "Remove the quiz?",
      message: "Every question is deleted. Learners will mark this module complete themselves instead.",
      confirmLabel: "Remove quiz",
      danger: true,
    });
    if (!ok) return;
    draft.quiz = null;
    repaint();
  });

  on(node, "click", "[data-add-q]", (_, btn) => {
    const q = makeQuestion(btn.dataset.addQ);
    draft.quiz.questions.push(q);
    open.add(q.id);
    repaint();
  });

  on(node, "click", "[data-move-q]", (_, btn) => {
    const from = Number(btn.dataset.moveQ);
    if (moveItem(draft.quiz.questions, from, from + Number(btn.dataset.dir))) repaint();
  });

  on(node, "click", "[data-del-q]", async (_, btn) => {
    const ok = await confirmDialog({ title: "Delete this question?", confirmLabel: "Delete", danger: true });
    if (!ok) return;
    draft.quiz.questions = draft.quiz.questions.filter((q) => q.id !== btn.dataset.delQ);
    repaint();
  });

  on(node, "click", "[data-add-choice]", (_, btn) => {
    findQ(btn.dataset.addChoice)?.choices.push({ id: uid("c"), text: "", correct: false });
    repaint();
  });

  on(node, "click", "[data-del-choice]", (_, btn) => {
    const q = findQ(btn.dataset.q);
    if (!q || q.choices.length <= 2) return;
    q.choices = q.choices.filter((c) => c.id !== btn.dataset.delChoice);
    if (q.type === "mc" && !q.choices.some((c) => c.correct)) q.choices[0].correct = true;
    repaint();
  });

  on(node, "click", "[data-add-answer]", (_, btn) => {
    findQ(btn.dataset.addAnswer)?.answers.push("");
    repaint();
  });

  on(node, "click", "[data-del-answer]", (_, btn) => {
    const q = findQ(btn.dataset.delAnswer);
    if (!q || q.answers.length <= 1) return;
    q.answers.splice(Number(btn.dataset.index), 1);
    repaint();
  });
}

/** Keep the collapsed card's summary line in step while typing. */
function syncName(el, value) {
  const card = el.closest(".ed-item");
  const name = card?.querySelector(".ed-name");
  if (name && value) name.textContent = value;
}

/** Put an upload in the asset store, reporting rather than swallowing failure. */
async function storeUpload(file) {
  try {
    const record = await putAsset(file);
    toast(`Saved ${record.name} (${formatBytes(record.size)}).`);
    if (record.size > UPLOAD_SOFT_LIMIT) {
      toast(
        `That is ${formatBytes(record.size)}. It will make exported packs large.`,
        "err",
        6000
      );
    }
    return record;
  } catch (e) {
    console.error("[editor] upload failed", e);
    toast("Could not save that file. Browser storage may be full or blocked.", "err", 6000);
    return null;
  }
}

const stripExt = (name) => String(name || "").replace(/\.[^.]+$/, "");

/* ================================================== tree settings ====== */

export function openTreeSettings(treeId) {
  const doc = getDoc();
  const tree = findTree(doc, treeId);
  if (!tree) return;

  const draft = deepClone(tree);
  const assigned = new Set(
    doc.sections.filter((s) => sectionTreeIds(s).includes(treeId)).map((s) => s.id)
  );
  let inner;

  const paint = () => mount(inner, treeForm(draft, doc, assigned));

  const ctx = openSheet({
    title: "Tree settings",
    badge: tree.title,
    saveLabel: "Save tree",
    body: (el) => {
      inner = el;
      return treeForm(draft, doc, assigned);
    },
    onSave: () => {
      if (!draft.title.trim()) {
        toast("A tree needs a title.", "err");
        return false;
      }
      mutate((d) => {
        const at = d.trees.findIndex((t) => t.id === treeId);
        if (at !== -1) d.trees[at] = draft;
        /* Ticking a section here places the tree in its first sub-section, or
           creates an untitled one if the section has none. Which sub-section it
           lands in is refined from the section's own settings. */
        d.sections.forEach((s) => {
          const has = sectionTreeIds(s).includes(treeId);
          if (assigned.has(s.id) && !has) {
            if (!s.groups.length) s.groups.push(makeGroup(""));
            s.groups[0].treeIds.push(treeId);
          }
          if (!assigned.has(s.id) && has) {
            s.groups.forEach((g) => (g.treeIds = g.treeIds.filter((id) => id !== treeId)));
          }
        });
      });
      toast("Tree saved.");
      return true;
    },
  });

  wireTreeEvents(ctx.node, draft, assigned, paint);
}

function treeForm(draft, doc, assigned) {
  return html`
    <div class="ed-section">
      <h3>Tree</h3>
      <div class="field">
        <label>Title</label>
        <input type="text" value="${draft.title}" data-tree="title">
      </div>
      <div class="field">
        <label>Subtitle</label>
        <input type="text" value="${draft.subtitle}" data-tree="subtitle"
               placeholder="e.g. Master Engineer">
      </div>
      <div class="field">
        <label>Description</label>
        <textarea data-tree="blurb" style="min-height:70px">${draft.blurb}</textarea>
      </div>
    </div>

    <div class="ed-section">
      <h3>Columns (${draft.columns.length} of ${LIMITS.maxColumns})</h3>
      ${draft.columns.map((col, i) => columnRow(col, i, draft.columns.length))}
      <button class="btn btn-ghost btn-sm" type="button" data-add-col
              ${draft.columns.length >= LIMITS.maxColumns ? "disabled" : ""}>
        ${icon("plus")} Add a column
      </button>
      <p class="hint" style="margin-top:.7rem">
        Every category has the same four tiers, so a level means the same thing in every column
        and every tree. Master unlocks once tier IV of every column is done.
      </p>
    </div>

    <div class="ed-section">
      <h3>Novice and Master</h3>
      <div class="field">
        <label>Novice module title</label>
        <input type="text" value="${draft.novice.title}" data-cap="novice">
      </div>
      <div class="field">
        <label>Master module title</label>
        <input type="text" value="${draft.master.title}" data-cap="master">
      </div>
      <p class="hint">Their content and quizzes are edited from the tree, like any other module.</p>
    </div>

    <div class="ed-section">
      <h3>Sections</h3>
      ${doc.sections.length
        ? doc.sections.map(
            (s) => html`
              <label class="switch" style="display:flex;padding:.45rem 0">
                <input type="checkbox" data-assign="${s.id}" ${assigned.has(s.id) ? "checked" : ""}>
                ${s.title}
              </label>
            `
          )
        : html`<p class="hint">No sections exist yet.</p>`}
      <p class="hint" style="margin-top:.6rem">A tree can live in as many sections as you like.</p>
    </div>
  `;
}

function columnRow(col, index, total) {
  return html`
    <div class="ed-item is-open" style="margin-bottom:.6rem">
      <div class="ed-item-head" style="cursor:default">
        <span class="ed-kind">Col ${index + 1}</span>
        <span class="ed-name">${col.title}</span>
        <span class="ed-tools">
          <button class="ed-tool" data-move-col="${index}" data-dir="-1"
                  ${index === 0 ? "disabled" : ""} title="Move left">${icon("up")}</button>
          <button class="ed-tool" data-move-col="${index}" data-dir="1"
                  ${index === total - 1 ? "disabled" : ""} title="Move right">${icon("down")}</button>
          <button class="ed-tool danger" data-del-col="${col.id}"
                  ${total <= LIMITS.minColumns ? "disabled" : ""} title="Delete column">${icon("trash")}</button>
        </span>
      </div>
      <div class="ed-item-body">
        <div class="field">
          <label>Column name</label>
          <input type="text" value="${col.title}" data-col="${col.id}" data-field="title"
                 maxlength="${MAX_COLUMN_TITLE}">
          <span class="hint">
            Names every tier in this column: ${col.title || "Column"} I, ${col.title || "Column"} II,
            and so on. Capped at ${MAX_COLUMN_TITLE} characters so the numeral still fits on a box.
          </span>
        </div>
        <div class="tier-ladder">
          ${TIER_NUMERALS.map(
            (n, i) => html`<span><b>${n}</b> ${TIER_LEVELS[i]}</span>`
          )}
        </div>
      </div>
    </div>
  `;
}

function wireTreeEvents(node, draft, assigned, paint) {
  on(node, "input", "[data-tree]", (_, el) => {
    draft[el.dataset.tree] = el.value;
  });

  on(node, "input", "[data-cap]", (_, el) => {
    draft[el.dataset.cap].title = el.value;
  });

  on(node, "input", "[data-col][data-field]", (_, el) => {
    const col = draft.columns.find((c) => c.id === el.dataset.col);
    if (!col) return;
    col[el.dataset.field] = el.value;
    const name = el.closest(".ed-item")?.querySelector(".ed-name");
    if (name) name.textContent = el.value;
  });

  on(node, "change", "[data-assign]", (_, el) => {
    if (el.checked) assigned.add(el.dataset.assign);
    else assigned.delete(el.dataset.assign);
  });

  on(node, "click", "[data-add-col]", () => {
    if (draft.columns.length >= LIMITS.maxColumns) return;
    draft.columns.push(makeColumn(`Column ${draft.columns.length + 1}`));
    paint();
  });

  on(node, "click", "[data-move-col]", (_, btn) => {
    const from = Number(btn.dataset.moveCol);
    if (moveItem(draft.columns, from, from + Number(btn.dataset.dir))) paint();
  });

  on(node, "click", "[data-del-col]", async (_, btn) => {
    if (draft.columns.length <= LIMITS.minColumns) return;
    const col = draft.columns.find((c) => c.id === btn.dataset.delCol);
    const ok = await confirmDialog({
      title: `Delete the ${col.title} column?`,
      message: `Its ${col.modules.length} modules and everything in them are removed. This cannot be undone; export the tree first if you might want it back.`,
      confirmLabel: "Delete column",
      danger: true,
    });
    if (!ok) return;
    draft.columns = draft.columns.filter((c) => c.id !== btn.dataset.delCol);
    paint();
  });

  // Tier depth is fixed at four, so there is nothing here to add or remove.
}

/* =============================================== section settings ====== */

export function openSectionSettings(sectionId) {
  const doc = getDoc();
  const section = findSection(doc, sectionId);
  if (!section) return;

  const draft = deepClone(section);
  let inner;
  const paint = () => mount(inner, sectionForm(draft, doc));

  const ctx = openSheet({
    title: "Section settings",
    badge: section.title,
    saveLabel: "Save section",
    body: (el) => {
      inner = el;
      return sectionForm(draft, doc);
    },
    onSave: () => {
      if (!draft.title.trim()) {
        toast("A section needs a title.", "err");
        return false;
      }
      mutate((d) => {
        const at = d.sections.findIndex((s) => s.id === sectionId);
        if (at !== -1) d.sections[at] = draft;
      });
      toast("Section saved.");
      return true;
    },
  });


  /* ---- section fields ---- */

  on(ctx.node, "input", "[data-sec]", (_, el) => {
    draft[el.dataset.sec] = el.value;
  });

  /* ---- sub-sections ---- */

  const group = (id) => draft.groups.find((g) => g.id === id);

  on(ctx.node, "input", "[data-grp][data-field]", (_, el) => {
    const g = group(el.dataset.grp);
    if (!g) return;
    g[el.dataset.field] = el.value;
    const name = el.closest(".ed-item")?.querySelector(".ed-name");
    if (name) name.textContent = el.value || "Untitled sub-section";
  });

  on(ctx.node, "click", "[data-add-grp]", () => {
    draft.groups.push(makeGroup(""));
    paint();
  });

  on(ctx.node, "click", "[data-move-grp]", (_, btn) => {
    const from = Number(btn.dataset.moveGrp);
    if (moveItem(draft.groups, from, from + Number(btn.dataset.dir))) paint();
  });

  on(ctx.node, "click", "[data-del-grp]", async (_, btn) => {
    const g = group(btn.dataset.delGrp);
    if (!g) return;
    const ok = await confirmDialog({
      title: g.title ? `Delete the ${g.title} sub-section?` : "Delete this sub-section?",
      message: `The sub-section is removed. Its ${g.treeIds.length} ${
        g.treeIds.length === 1 ? "tree is" : "trees are"
      } kept and stay available under All trees.`,
      confirmLabel: "Delete sub-section",
      danger: true,
    });
    if (!ok) return;
    draft.groups = draft.groups.filter((x) => x.id !== btn.dataset.delGrp);
    paint();
  });

  /* ---- trees within a sub-section ---- */

  on(ctx.node, "click", "[data-move-grp-tree]", (_, btn) => {
    const g = group(btn.dataset.grp);
    const from = Number(btn.dataset.moveGrpTree);
    if (g && moveItem(g.treeIds, from, from + Number(btn.dataset.dir))) paint();
  });

  on(ctx.node, "click", "[data-remove-grp-tree]", (_, btn) => {
    const g = group(btn.dataset.grp);
    if (!g) return;
    g.treeIds = g.treeIds.filter((id) => id !== btn.dataset.removeGrpTree);
    paint();
  });

  /* Moving a tree between sub-sections is the common edit, so it is a select
     rather than a remove-then-add. */
  on(ctx.node, "change", "[data-move-to]", (_, el) => {
    const treeId = el.dataset.moveTo;
    const target = el.value;
    draft.groups.forEach((g) => (g.treeIds = g.treeIds.filter((id) => id !== treeId)));
    if (target !== "__none__") group(target)?.treeIds.push(treeId);
    paint();
  });

  on(ctx.node, "change", "[data-add-tree-to]", (_, el) => {
    const g = group(el.dataset.addTreeTo);
    if (g && el.value && !g.treeIds.includes(el.value)) g.treeIds.push(el.value);
    paint();
  });
}

function sectionForm(draft, doc) {
  const placed = new Set(draft.groups.flatMap((g) => g.treeIds));
  const unplaced = doc.trees.filter((t) => !placed.has(t.id));

  return html`
    <div class="ed-section">
      <h3>Section</h3>
      <div class="field">
        <label>Title</label>
        <input type="text" value="${draft.title}" data-sec="title">
      </div>
      <div class="field">
        <label>Description</label>
        <textarea data-sec="blurb" style="min-height:70px">${draft.blurb}</textarea>
      </div>
    </div>

    <div class="ed-section">
      <h3>Sub-sections (${draft.groups.length})</h3>
      <p class="hint" style="margin-bottom:.9rem">
        A sub-section groups trees inside this section: Software Engineering, then AWS, then the
        Lambdas tree. Leave the name blank and its trees sit directly under the section with no
        heading, which is what a section with no sub-divisions looks like.
      </p>

      ${draft.groups.map((g, i) => groupEditor(draft, g, i, doc, unplaced))}

      <button class="btn btn-ghost btn-sm" type="button" data-add-grp>
        ${icon("plus")} Add a sub-section
      </button>
    </div>

    ${unplaced.length
      ? html`<div class="ed-section">
          <h3>Not in this section</h3>
          <p class="hint" style="margin-bottom:.7rem">
            Add any of these to a sub-section above. Adding a tree here does not remove it from
            anywhere else: the same tree can live in several sections at once.
          </p>
          <div class="chips">
            ${unplaced.slice(0, 24).map((t) => html`<span class="chip">${t.title}</span>`)}
            ${unplaced.length > 24 ? html`<span class="chip">and ${unplaced.length - 24} more</span>` : ""}
          </div>
        </div>`
      : ""}
  `;
}

function groupEditor(draft, group, index, doc, unplaced) {
  const trees = group.treeIds.map((id) => findTree(doc, id)).filter(Boolean);

  return html`
    <div class="ed-item is-open" data-grp-row="${group.id}">
      <div class="ed-item-head" style="cursor:default">
        <span class="ed-kind">${index + 1}</span>
        <span class="ed-name">${group.title || "Untitled sub-section"}</span>
        <span class="ed-tools">
          <button class="ed-tool" data-move-grp="${index}" data-dir="-1"
                  ${index === 0 ? "disabled" : ""} title="Move up">${icon("up")}</button>
          <button class="ed-tool" data-move-grp="${index}" data-dir="1"
                  ${index === draft.groups.length - 1 ? "disabled" : ""} title="Move down">${icon("down")}</button>
          <button class="ed-tool danger" data-del-grp="${group.id}" title="Delete sub-section">${icon("trash")}</button>
        </span>
      </div>

      <div class="ed-item-body">
        <div class="field">
          <label>Name</label>
          <input type="text" value="${group.title}" data-grp="${group.id}" data-field="title"
                 placeholder="AWS, Testing, Leadership…">
          <span class="hint">Leave blank for trees that sit directly under the section.</span>
        </div>
        <div class="field">
          <label>Description (optional)</label>
          <input type="text" value="${group.blurb}" data-grp="${group.id}" data-field="blurb">
        </div>

        <div class="field">
          <label>Trees (${trees.length})</label>
          ${trees.length
            ? trees.map(
                (t, i) => html`
                  <div class="ed-choice">
                    <span class="grow" style="font-size:.86rem">${t.title}</span>
                    <select data-move-to="${t.id}" title="Move to another sub-section">
                      ${draft.groups.map(
                        (g) => html`<option value="${g.id}" ${g.id === group.id ? "selected" : ""}>
                          ${g.title || "(no sub-section)"}
                        </option>`
                      )}
                      <option value="__none__">Remove from this section</option>
                    </select>
                    <button class="ed-tool" data-move-grp-tree="${i}" data-grp="${group.id}" data-dir="-1"
                            ${i === 0 ? "disabled" : ""}>${icon("up")}</button>
                    <button class="ed-tool" data-move-grp-tree="${i}" data-grp="${group.id}" data-dir="1"
                            ${i === trees.length - 1 ? "disabled" : ""}>${icon("down")}</button>
                  </div>
                `
              )
            : html`<p class="hint">No trees in this sub-section yet.</p>`}

          ${unplaced.length
            ? html`<select data-add-tree-to="${group.id}" style="margin-top:.5rem">
                <option value="">Add an existing tree…</option>
                ${unplaced.map((t) => html`<option value="${t.id}">${t.title}</option>`)}
              </select>`
            : ""}
        </div>
      </div>
    </div>
  `;
}

/* ================================================ create and delete ==== */

export async function createSection() {
  const title = await promptDialog({
    title: "New section",
    label: "Section name",
    placeholder: "Software Engineering",
    confirmLabel: "Create",
  });
  if (!title) return;

  const section = makeSection(title);
  mutate((doc) => {
    doc.sections.push(section);
  });
  // The catalogue is one page now, so open the new section in place rather than
  // navigating to a page that no longer exists.
  setPrefs({ openSections: { ...(getPrefs().openSections || {}), [section.id]: true } }, "rail");
  toast(`Section "${title}" created.`);
  go(routes.sections());
}

/** A sub-section: the rung between a section and its trees. */
export async function createGroup(sectionId) {
  const title = await promptDialog({
    title: "New sub-section",
    label: "Sub-section name",
    placeholder: "AWS, Testing, Leadership…",
    confirmLabel: "Create",
  });
  if (title === null) return;

  mutate((doc) => {
    findSection(doc, sectionId)?.groups.push(makeGroup(title));
  });
  setPrefs({ openSections: { ...(getPrefs().openSections || {}), [sectionId]: true } }, "rail");
  toast(title ? `Sub-section "${title}" added.` : "Untitled sub-section added.");
}

export async function createTree(sectionId, groupId = null) {
  const title = await promptDialog({
    title: "New tree",
    label: "Tree name",
    placeholder: "Engineering Fundamentals",
    confirmLabel: "Create",
  });
  if (!title) return;

  const tree = makeTree(title, { subtitle: `Master ${title}` });
  mutate((doc) => {
    doc.trees.push(tree);
    if (sectionId) {
      const s = findSection(doc, sectionId);
      if (s) {
        const target =
          (groupId && findGroup(s, groupId)) || s.groups[0] || (s.groups.push(makeGroup("")), s.groups[0]);
        target.treeIds.push(tree.id);
      }
    }
  });
  toast(`"${title}" created with ${LIMITS.defaultColumns} categories of ${TIERS} tiers.`);
  go(routes.tree(tree.id));
}

export function duplicateTree(treeId) {
  const doc = getDoc();
  const tree = findTree(doc, treeId);
  if (!tree) return;

  const copy = reidTree(tree);
  copy.title = `${tree.title} (copy)`;
  copy.id = slugId(copy.title, "t");

  mutate((d) => {
    d.trees.push(copy);
    d.sections.forEach((s) => {
      // Land the copy right beside the original, in the same sub-section.
      s.groups.forEach((g) => {
        if (g.treeIds.includes(treeId)) g.treeIds.push(copy.id);
      });
    });
  });
  toast("Tree duplicated. Edit the copy safely.");
}

export async function deleteTree(treeId) {
  const doc = getDoc();
  const tree = findTree(doc, treeId);
  if (!tree) return;

  const count = tree.columns.reduce((n, c) => n + c.modules.length, 0) + 2;
  const ok = await confirmDialog({
    title: `Delete "${tree.title}"?`,
    message: `All ${count} modules and their content go with it. There is no undo, so export the tree first if you might want it back.`,
    confirmLabel: "Delete tree",
    danger: true,
  });
  if (!ok) return;

  mutate((d) => {
    d.trees = d.trees.filter((t) => t.id !== treeId);
    d.sections.forEach((s) =>
      s.groups.forEach((g) => (g.treeIds = g.treeIds.filter((id) => id !== treeId)))
    );
  });
  toast("Tree deleted.");
  if (location.hash.includes(treeId)) go(routes.sections());
}

export async function deleteSection(sectionId) {
  const doc = getDoc();
  const section = findSection(doc, sectionId);
  if (!section) return;

  const ok = await confirmDialog({
    title: `Delete "${section.title}"?`,
    message: `The section is removed. Its ${sectionTreeIds(section).length} trees are kept and stay available under All trees.`,
    confirmLabel: "Delete section",
    danger: true,
  });
  if (!ok) return;

  mutate((d) => {
    d.sections = d.sections.filter((s) => s.id !== sectionId);
  });
  toast("Section deleted. Its trees were kept.");
  if (location.hash.includes(sectionId)) go(routes.sections());
}
