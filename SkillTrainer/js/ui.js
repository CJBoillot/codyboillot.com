/*
 * ui.js - toasts, modals and confirmations.
 *
 * There is no undo. Export is the safety net, and every destructive action goes
 * through confirmDialog() first, which is the trade the plan settled on: a
 * confirm plus "duplicate before you edit" covers nearly all of undo's value
 * for a fraction of the machinery.
 */

import { esc, html, icon, mount, raw, toNode } from "./dom.js";

/* ---------------------------------------------------------------- toast */

let toastTimer = new WeakMap();

export function toast(message, kind = "ok", ms = 3200) {
  const host = document.getElementById("toasts");
  if (!host) return;
  const node = toNode(
    html`<div class="toast ${kind}">${icon(kind === "err" ? "callout" : "check")}<span>${message}</span></div>`
  ).firstElementChild;
  host.appendChild(node);
  const t = setTimeout(() => node.remove(), ms);
  toastTimer.set(node, t);
}

/* ---------------------------------------------------------------- modal */

/**
 * Opens a scrim + modal. `render` receives the body element so callers can wire
 * their own controls. Resolves with whatever close() is called with.
 */
export function openModal({ title, description = "", body, footer, size, onMount }) {
  return new Promise((resolve) => {
    const scrim = toNode(html`
      <div class="scrim" role="dialog" aria-modal="true" aria-label="${title}">
        <div class="modal" ${size ? raw(`style="width:min(100%, ${esc(size)})"`) : ""}>
          <div class="modal-head">
            <h2>${title}</h2>
            ${description ? html`<p>${description}</p>` : ""}
          </div>
          <div class="modal-body"></div>
          <div class="modal-foot"></div>
        </div>
      </div>
    `).firstElementChild;

    const bodyEl = scrim.querySelector(".modal-body");
    const footEl = scrim.querySelector(".modal-foot");
    if (body) mount(bodyEl, body);
    if (footer) mount(footEl, footer);

    let settled = false;
    const close = (value) => {
      if (settled) return;
      settled = true;
      document.removeEventListener("keydown", onKey);
      scrim.remove();
      resolve(value);
    };

    const onKey = (e) => {
      if (e.key === "Escape") close(undefined);
    };
    document.addEventListener("keydown", onKey);
    scrim.addEventListener("mousedown", (e) => {
      if (e.target === scrim) close(undefined);
    });
    scrim.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-close]");
      if (btn) close(btn.dataset.close === "" ? true : btn.dataset.close);
    });

    document.body.appendChild(scrim);
    onMount?.({ root: scrim, body: bodyEl, footer: footEl, close });

    const focusable = scrim.querySelector("input, select, textarea, button");
    focusable?.focus();
  });
}

export function confirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
}) {
  return openModal({
    title,
    description: message,
    footer: html`
      <button class="btn btn-ghost" data-close="cancel">${cancelLabel}</button>
      <button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-close="ok">${confirmLabel}</button>
    `,
  }).then((v) => v === "ok");
}

/** A single-field prompt, used for renaming and for "name your new tree". */
export function promptDialog({ title, label, value = "", placeholder = "", confirmLabel = "Save" }) {
  let input;
  return openModal({
    title,
    body: html`
      <div class="field">
        <label for="prompt-field">${label}</label>
        <input id="prompt-field" type="text" value="${value}" placeholder="${placeholder}">
      </div>
    `,
    footer: html`
      <button class="btn btn-ghost" data-close="cancel">Cancel</button>
      <button class="btn btn-primary" data-close="ok">${confirmLabel}</button>
    `,
    onMount: ({ root, close }) => {
      input = root.querySelector("#prompt-field");
      input.select();
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") close("ok");
      });
    },
  }).then((v) => (v === "ok" ? input.value.trim() : null));
}

/* ------------------------------------------------------------- lightbox */

export function openLightbox(src, alt = "") {
  const node = toNode(html`<div class="lightbox"><img src="${src}" alt="${alt}"></div>`).firstElementChild;
  const close = () => {
    node.remove();
    document.removeEventListener("keydown", onKey);
  };
  const onKey = (e) => e.key === "Escape" && close();
  node.addEventListener("click", close);
  document.addEventListener("keydown", onKey);
  document.body.appendChild(node);
}

/* -------------------------------------------------------------- download */

export function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Ask for a file and hand back its text. Resolves null if the user cancels. */
export function pickFile(accept = "application/json,.json") {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, text: String(reader.result) });
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    });
    input.click();
  });
}

/** Ask for a file and hand back the File itself, for the asset store. */
export function pickBinaryFile(accept = "image/*") {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.addEventListener("change", () => resolve(input.files?.[0] ?? null));
    input.click();
  });
}

/** A validation report rendered for a modal body. */
export function reportMarkup(report) {
  const rows = [
    ...report.errors.map((e) => ({ ...e, kind: "err" })),
    ...report.warnings.map((w) => ({ ...w, kind: "warn" })),
  ];
  if (!rows.length) return html`<p>Everything checks out.</p>`;
  return html`
    <div class="report">
      ${rows.map(
        (r) => html`
          <div class="r-row ${r.kind}">
            <span class="r-path">${r.path}</span>
            <span>${r.message}</span>
          </div>
        `
      )}
    </div>
  `;
}
