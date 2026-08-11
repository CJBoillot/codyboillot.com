/*
 * dom.js - the few primitives every view uses.
 *
 * Views build HTML strings with the `html` tagged template, which escapes every
 * interpolated value by default. Anything already-safe (a nested render, an
 * icon) is wrapped in raw(). That default matters: module content comes from
 * imported JSON packs, and a pack should never be able to inject script.
 */

const RAW = Symbol("raw");

export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Mark a string as pre-escaped so `html` passes it through untouched. */
export function raw(str) {
  return { [RAW]: String(str ?? "") };
}

/** The string back out of a raw()/html`` value. */
export function unraw(value) {
  if (value == null) return "";
  if (typeof value === "object" && RAW in value) return value[RAW];
  return String(value);
}

function resolve(value) {
  if (value == null || value === false) return "";
  if (Array.isArray(value)) return value.map(resolve).join("");
  if (typeof value === "object" && RAW in value) return value[RAW];
  return esc(value);
}

export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i += 1) out += resolve(values[i]) + strings[i + 1];
  return raw(out);
}

/** Render an html`` result (or plain string) into a real element. */
export function toNode(value) {
  const markup = typeof value === "object" && RAW in value ? value[RAW] : String(value);
  const tpl = document.createElement("template");
  tpl.innerHTML = markup.trim();
  return tpl.content;
}

export function mount(container, value) {
  container.replaceChildren(toNode(value));
  return container;
}

/* Event delegation. Views re-render wholesale, so binding to a stable root and
   matching on a selector avoids re-attaching handlers on every paint. */
export function on(root, type, selector, handler) {
  const listener = (event) => {
    const target = event.target.closest(selector);
    if (target && root.contains(target)) handler(event, target);
  };
  root.addEventListener(type, listener);
  return () => root.removeEventListener(type, listener);
}

export function $(selector, root = document) {
  return root.querySelector(selector);
}

export function $$(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

/* ----------------------------------------------------------------- icons */

const ICONS = {
  back: '<path d="M19 12H5m7-7l-7 7 7 7"/>',
  chevron: '<path d="M9 18l6-6-6-6"/>',
  chevronDown: '<path d="M6 9l6 6 6-6"/>',
  pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  play: '<path d="M5 3l14 9-14 9z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  up: '<path d="M12 19V5m-7 7l7-7 7 7"/>',
  down: '<path d="M12 5v14m7-7l-7 7-7-7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  /* The conventional sidebar-toggle glyph. Deliberately NOT an arrow: a left
     arrow in a header reads as "back", which this is not. */
  sidebarOn:
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>' +
    '<path d="M5 4h4v16H5a2 2 0 01-2-2V6a2 2 0 012-2z" fill="currentColor" stroke="none" opacity=".45"/>',
  sidebarOff: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16" opacity=".45"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>',
  link: '<path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7"/>',
  file: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
  video: '<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
  youtube: '<path d="M22 8.6a3 3 0 00-2.1-2.1C18 6 12 6 12 6s-6 0-7.9.5A3 3 0 002 8.6 31 31 0 001.5 12 31 31 0 002 15.4a3 3 0 002.1 2.1C6 18 12 18 12 18s6 0 7.9-.5a3 3 0 002.1-2.1 31 31 0 00.5-3.4 31 31 0 00-.5-3.4z"/><path d="M10 15l5-3-5-3z"/>',
  article: '<path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  callout: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
  download: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/>',
  reset: '<path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8"/><path d="M3 3v5h5"/>',
  close: '<path d="M18 6L6 18M6 6l12 12"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  star: '<path d="M12 2l3 6.6 7 .9-5 4.9 1.2 7L12 18l-6.2 3.4L7 14.4 2 9.5l7-.9z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1A1.7 1.7 0 006.9 19a1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H1a2 2 0 110-4h.1A1.7 1.7 0 002.6 8.3a1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H7a1.7 1.7 0 001-1.5V2a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
};

export function icon(name, cls = "") {
  const path = ICONS[name] || ICONS.chevron;
  return raw(
    `<svg class="ico ${esc(cls)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
      `stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`
  );
}

/* ----------------------------------------------------------------- misc */

/** Only http(s), mailto, in-page anchors and relative paths survive. */
export function safeUrl(url) {
  const value = String(url ?? "").trim();
  if (!value) return "";
  if (/^(https?:|mailto:|#|\/|\.\/|\.\.\/)/i.test(value)) return value;
  if (/^[\w.-]+\//.test(value) || /^[\w.-]+\.[a-z]{2,}$/i.test(value)) return value;
  return ""; // javascript:, data: and anything else exotic
}

/** Accepts a bare id, a watch URL, a youtu.be link or an embed URL. */
export function youtubeId(input) {
  const value = String(input ?? "").trim();
  if (!value) return "";
  if (/^[\w-]{11}$/.test(value)) return value;
  const m = value.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : "";
}

export function formatBytes(bytes) {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${units[i]}`;
}

export function debounce(fn, ms = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/** Move an item within an array, in place. Returns whether anything moved. */
export function moveItem(list, from, to) {
  if (to < 0 || to >= list.length || from === to) return false;
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item);
  return true;
}
