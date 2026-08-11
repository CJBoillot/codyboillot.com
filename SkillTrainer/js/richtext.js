/*
 * richtext.js - the writing surface, and the sanitiser that makes it safe.
 *
 * Two halves that must be read together:
 *
 *   sanitizeHtml()  runs on EVERY path that renders authored HTML. Content can
 *                   arrive from an imported pack written by anyone, so the
 *                   renderer treats stored HTML as hostile and rebuilds it from
 *                   a whitelist rather than trusting it.
 *
 *   mountEditor()   a contenteditable surface with a toolbar.
 *
 * On execCommand: it is deprecated and has no replacement for basic inline
 * formatting. Every browser still implements it, and the alternative is writing
 * a selection-model editor from scratch. It is used for the commands it handles
 * well and hand-rolled Range work for the rest.
 */

import { esc, html, icon, mount, on, raw, safeUrl, toNode } from "./dom.js";

/* ============================================================ sanitiser == */

const ALLOWED = {
  p: [],
  br: [],
  h2: [], h3: [], h4: [],
  strong: [], b: [], em: [], i: [], u: [], s: [], strike: [], del: [], mark: [],
  ul: [], ol: [], li: [],
  blockquote: [],
  hr: [],
  code: [], pre: [],
  sub: [], sup: [],
  a: ["href", "target", "rel"],
  span: ["class"],
  div: ["class", "data-tone"],
};

/* Only classes this editor itself produces survive a round trip. */
const ALLOWED_CLASSES = new Set([
  "rt-note", "rt-serif", "rt-mono", "rt-sans",
  "rt-sm", "rt-lg", "rt-xl",
  "rt-hl",
]);

const NOTE_TONES = new Set(["note", "tip", "warning", "danger"]);

export function sanitizeHtml(input) {
  if (!input) return "";
  const doc = new DOMParser().parseFromString(`<body>${input}</body>`, "text/html");
  clean(doc.body);
  return doc.body.innerHTML;
}

function clean(root) {
  // Walk a static list: the tree is mutated as we go.
  [...root.childNodes].forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) return;

    if (node.nodeType !== Node.ELEMENT_NODE) {
      node.remove(); // comments, CDATA, processing instructions
      return;
    }

    const tag = node.tagName.toLowerCase();
    const allowedAttrs = ALLOWED[tag];

    if (!allowedAttrs) {
      // Unknown tag: keep the words, drop the element. <script> has no text
      // worth keeping, so it goes entirely.
      if (tag === "script" || tag === "style" || tag === "iframe" || tag === "object") {
        node.remove();
        return;
      }
      const parent = node.parentNode;
      while (node.firstChild) parent.insertBefore(node.firstChild, node);
      node.remove();
      // The unwrapped children are now siblings; re-clean the parent's list.
      clean(parent);
      return;
    }

    [...node.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (!allowedAttrs.includes(name)) return node.removeAttribute(attr.name);

      if (name === "href") {
        const url = safeUrl(attr.value);
        if (!url) return node.removeAttribute("href");
        node.setAttribute("href", url);
        if (/^https?:/i.test(url)) {
          node.setAttribute("target", "_blank");
          node.setAttribute("rel", "noopener noreferrer");
        }
      }

      if (name === "class") {
        const kept = attr.value.split(/\s+/).filter((c) => ALLOWED_CLASSES.has(c));
        if (kept.length) node.setAttribute("class", kept.join(" "));
        else node.removeAttribute("class");
      }

      if (name === "data-tone" && !NOTE_TONES.has(attr.value)) {
        node.setAttribute("data-tone", "note");
      }
    });

    clean(node);
  });
}

/** Plain text of authored HTML, for previews and summaries. */
export function htmlToText(input, limit = 160) {
  const doc = new DOMParser().parseFromString(`<body>${input || ""}</body>`, "text/html");
  const text = (doc.body.textContent || "").replace(/\s+/g, " ").trim();
  return limit && text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

export const isEmptyHtml = (input) => htmlToText(input, 0).length === 0;

/* =============================================================== editor == */

const BLOCK_FORMATS = [
  { cmd: "p", label: "Body" },
  { cmd: "h2", label: "Heading" },
  { cmd: "h3", label: "Subheading" },
  { cmd: "h4", label: "Small heading" },
  { cmd: "blockquote", label: "Quote" },
  { cmd: "pre", label: "Code block" },
];

const FONTS = [
  { cls: "rt-sans", label: "Sans" },
  { cls: "rt-serif", label: "Serif" },
  { cls: "rt-mono", label: "Mono" },
];

const SIZES = [
  { cls: "rt-sm", label: "Small" },
  { cls: "", label: "Normal" },
  { cls: "rt-lg", label: "Large" },
  { cls: "rt-xl", label: "Extra large" },
];

const INLINE = [
  { cmd: "bold", label: "Bold", key: "B", style: "font-weight:800" },
  { cmd: "italic", label: "Italic", key: "I", style: "font-style:italic" },
  { cmd: "underline", label: "Underline", key: "U", style: "text-decoration:underline" },
  { cmd: "strikeThrough", label: "Strikethrough", key: "S", style: "text-decoration:line-through" },
];

let editorSeq = 0;

/**
 * Build a rich text editor into `container`.
 * Returns { getValue, setValue, focus, destroy }.
 */
export function mountEditor(container, { value = "", onChange, minHeight = "220px" } = {}) {
  const id = `rt-${(editorSeq += 1)}`;

  mount(
    container,
    html`
      <div class="rt" data-rt="${id}">
        <div class="rt-toolbar" role="toolbar" aria-label="Formatting">
          <select class="rt-select" data-rt-block title="Paragraph style">
            ${BLOCK_FORMATS.map((f) => html`<option value="${f.cmd}">${f.label}</option>`)}
          </select>

          <span class="rt-group">
            ${INLINE.map(
              (b) => html`<button type="button" class="rt-btn" data-rt-cmd="${b.cmd}"
                                  title="${b.label}" style="${b.style}">${b.key}</button>`
            )}
          </span>

          <span class="rt-group">
            <button type="button" class="rt-btn" data-rt-cmd="insertUnorderedList" title="Bulleted list">•—</button>
            <button type="button" class="rt-btn" data-rt-cmd="insertOrderedList" title="Numbered list">1—</button>
          </span>

          <select class="rt-select" data-rt-font title="Font">
            ${FONTS.map((f) => html`<option value="${f.cls}">${f.label}</option>`)}
          </select>

          <select class="rt-select" data-rt-size title="Size">
            ${SIZES.map((s) => html`<option value="${s.cls}" ${s.cls === "" ? "selected" : ""}>${s.label}</option>`)}
          </select>

          <span class="rt-group">
            <button type="button" class="rt-btn" data-rt-link title="Insert a link">${icon("link")}</button>
            <button type="button" class="rt-btn" data-rt-unlink title="Remove the link">${icon("close")}</button>
          </span>

          <span class="rt-group">
            <button type="button" class="rt-btn rt-note-btn" data-rt-note="note" title="Insert a note">Note</button>
            <button type="button" class="rt-btn rt-note-btn" data-rt-note="tip" title="Insert a tip">Tip</button>
            <button type="button" class="rt-btn rt-note-btn" data-rt-note="warning" title="Insert a warning">Warn</button>
          </span>

          <button type="button" class="rt-btn rt-clear" data-rt-cmd="removeFormat" title="Clear formatting">Clear</button>
        </div>

        <div class="rt-surface prose" contenteditable="true" role="textbox" aria-multiline="true"
             style="min-height:${minHeight}"></div>
      </div>
    `
  );

  const root = container.querySelector(".rt");
  const surface = root.querySelector(".rt-surface");
  surface.innerHTML = sanitizeHtml(value) || "<p><br></p>";

  const emit = () => onChange?.(getValue());
  const getValue = () => sanitizeHtml(surface.innerHTML);

  /* Selections are lost when a toolbar control takes focus, so every command
     re-focuses the surface first. */
  const run = (cmd, arg = null) => {
    surface.focus();
    document.execCommand(cmd, false, arg);
    emit();
  };

  on(root, "mousedown", "[data-rt-cmd], [data-rt-link], [data-rt-unlink], [data-rt-note]", (e) => {
    e.preventDefault(); // keep the caret where it is
  });

  on(root, "click", "[data-rt-cmd]", (_, btn) => run(btn.dataset.rtCmd));

  on(root, "change", "[data-rt-block]", (_, sel) => {
    run("formatBlock", `<${sel.value}>`);
    sel.selectedIndex = 0;
  });

  on(root, "change", "[data-rt-font]", (_, sel) => {
    wrapSelection(surface, sel.value, FONTS.map((f) => f.cls));
    emit();
  });

  on(root, "change", "[data-rt-size]", (_, sel) => {
    wrapSelection(surface, sel.value, SIZES.map((s) => s.cls).filter(Boolean));
    emit();
  });

  on(root, "click", "[data-rt-link]", async () => {
    const selected = String(document.getSelection() || "");
    const url = window.prompt("Link address", "https://");
    if (!url) return;
    const safe = safeUrl(url);
    if (!safe) return;
    surface.focus();
    if (selected) document.execCommand("createLink", false, safe);
    else document.execCommand("insertHTML", false, `<a href="${esc(safe)}">${esc(safe)}</a>`);
    emit();
  });

  on(root, "click", "[data-rt-unlink]", () => run("unlink"));

  on(root, "click", "[data-rt-note]", (_, btn) => {
    insertNote(surface, btn.dataset.rtNote);
    emit();
  });

  surface.addEventListener("input", emit);
  surface.addEventListener("blur", emit);

  // Paste as plain text: pasting from Word or a web page otherwise drags in a
  // wall of markup that the sanitiser strips anyway, leaving odd spacing.
  surface.addEventListener("paste", (e) => {
    e.preventDefault();
    const text = e.clipboardData?.getData("text/plain") ?? "";
    document.execCommand("insertText", false, text);
  });

  surface.addEventListener("keydown", (e) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    const map = { b: "bold", i: "italic", u: "underline" };
    const cmd = map[e.key.toLowerCase()];
    if (cmd) {
      e.preventDefault();
      run(cmd);
    }
  });

  return {
    getValue,
    setValue: (next) => {
      surface.innerHTML = sanitizeHtml(next) || "<p><br></p>";
    },
    focus: () => surface.focus(),
  };
}

function noteSeed(tone) {
  return { note: "Note: ", tip: "Tip: ", warning: "Careful: ", danger: "Warning: " }[tone] || "";
}

/*
 * A note is a block element, and execCommand("insertHTML") flattens a <div>
 * dropped inside a <p>: the browser keeps the text and throws the wrapper away.
 * So the node is built and placed after the caret's own block instead.
 */
function insertNote(surface, tone) {
  surface.focus();
  const sel = document.getSelection();

  let block = null;
  if (sel?.rangeCount) {
    let node = sel.getRangeAt(0).startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    // Walk up to the direct child of the surface: that is the block to sit after.
    while (node && node !== surface && node.parentNode !== surface) node = node.parentNode;
    if (node && node !== surface && surface.contains(node)) block = node;
  }

  const note = document.createElement("div");
  note.className = "rt-note";
  note.setAttribute("data-tone", tone);
  const inner = document.createElement("p");
  inner.textContent = noteSeed(tone);
  note.appendChild(inner);

  const after = document.createElement("p");
  after.appendChild(document.createElement("br"));

  if (block) {
    block.after(note);
    note.after(after);
  } else {
    surface.append(note, after);
  }

  // Leave the caret inside the note, ready to type.
  const range = document.createRange();
  range.selectNodeContents(inner);
  range.collapse(false);
  sel?.removeAllRanges();
  sel?.addRange(range);
}

/*
 * Font and size are classes rather than <font> tags, so the sanitiser can keep
 * them on a whitelist. Wrapping a range that crosses block boundaries is not
 * something Range.surroundContents will do, so that case falls back to
 * extract-and-insert.
 */
function wrapSelection(surface, className, siblings) {
  const sel = document.getSelection();
  if (!sel || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  if (!surface.contains(range.commonAncestorContainer)) return;

  const contents = range.extractContents();
  // Strip any competing class from the same family before applying the new one.
  contents.querySelectorAll?.("span").forEach((span) => {
    siblings.forEach((c) => c && span.classList.remove(c));
    if (!span.classList.length) span.replaceWith(...span.childNodes);
  });

  if (!className) {
    range.insertNode(contents);
  } else {
    const span = document.createElement("span");
    span.className = className;
    span.appendChild(contents);
    range.insertNode(span);
  }
  sel.removeAllRanges();
}

/* ------------------------------------------------------------ rendering */

/** Authored HTML, cleaned, ready to drop into the reader. */
export function renderRichText(value) {
  return raw(sanitizeHtml(value));
}
