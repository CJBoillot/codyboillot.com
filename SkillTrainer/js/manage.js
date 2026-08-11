/*
 * manage.js - installing and extracting content.
 *
 * This is the part the whole engine exists to serve. Content lives in one JSON
 * shape, so authoring in the browser and shipping with the site are the same
 * operation: export a file, drop it in content/packs/, add a line to the
 * manifest, commit.
 */

import { formatBytes, html, icon, on } from "./dom.js";
import { findSection, findTree } from "./schema.js";
import { bundleAssets, collectAssetIds, pruneOrphans, restoreAssets, usage as assetUsage } from "./assets.js";
import { isUnlocked, lock } from "./auth.js";
import {
  exportDoc,
  exportSection,
  exportTree,
  getDoc,
  getLoadErrors,
  hasLocalEdits,
  importDoc,
  resetAllProgress,
  resetToShipped,
  setPrefs,
  storageUsage,
} from "./store.js";
import {
  confirmDialog,
  downloadJSON,
  openModal,
  pickFile,
  reportMarkup,
  toast,
} from "./ui.js";

const slug = (s) =>
  String(s || "pack")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "pack";

/** What the current route is looking at, so export offers the obvious thing. */
function context() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const doc = getDoc();
  if (parts[0] === "t" && parts[1]) return { kind: "tree", item: findTree(doc, parts[1]) };
  if (parts[0] === "s" && parts[1]) return { kind: "section", item: findSection(doc, parts[1]) };
  if (parts[0] === "edit" && parts[2]) return { kind: "tree", item: findTree(doc, parts[2]) };
  return { kind: "doc", item: null };
}

export function openManageMenu() {
  const doc = getDoc();
  const usage = storageUsage();
  const ctx = context();
  const errors = getLoadErrors();

  const modules = doc.trees.reduce(
    (n, t) => n + t.columns.reduce((m, c) => m + c.modules.length, 0) + 2,
    0
  );

  openModal({
    title: "Content",
    description: "Everything here is JSON. Export it, edit it, commit it, import it back.",
    body: html`
      <div class="banner" style="margin-bottom:1rem">
        ${icon("book")}
        <div>
          <strong>${doc.sections.length} sections · ${doc.trees.length} trees · ${modules} modules</strong>
          <div>Browser storage ${formatBytes(usage.bytes)} of about 5 MB.
            ${hasLocalEdits() ? "You have local edits." : "No local edits; this is the shipped content."}</div>
        </div>
      </div>

      ${errors.length
        ? html`<div class="banner danger">
            ${icon("callout")}
            <div>
              <strong>${errors.length} shipped ${errors.length === 1 ? "pack" : "packs"} failed to load</strong>
              ${errors.map((e) => html`<div>${e.file}: ${e.message}</div>`)}
            </div>
          </div>`
        : ""}

      <div class="ed-section">
        <h3>Export</h3>
        <div class="row">
          <button class="btn btn-ghost btn-sm" data-m="export-doc">${icon("download")} Everything</button>
          ${ctx.kind === "tree" && ctx.item
            ? html`<button class="btn btn-ghost btn-sm" data-m="export-tree" data-id="${ctx.item.id}">
                ${icon("download")} This tree
              </button>`
            : ""}
          ${ctx.kind === "section" && ctx.item
            ? html`<button class="btn btn-ghost btn-sm" data-m="export-section" data-id="${ctx.item.id}">
                ${icon("download")} This section
              </button>`
            : ""}
        </div>
        <p class="hint" style="margin-top:.7rem">
          An export is a valid pack. Put it in <code>content/packs/</code>, list it in
          <code>content/manifest.json</code>, and it ships with the site.
        </p>
      </div>

      <div class="ed-section">
        <h3>Import</h3>
        <div class="row">
          <button class="btn btn-ghost btn-sm" data-m="import-file">${icon("upload")} From a file</button>
          <button class="btn btn-ghost btn-sm" data-m="import-paste">${icon("article")} Paste JSON</button>
        </div>
        <p class="hint" style="margin-top:.7rem">
          Importing merges by default: a tree whose id already exists is replaced, everything else
          is added.
        </p>
      </div>

      <div class="ed-section">
        <h3>Files</h3>
        <p class="hint" style="margin-bottom:.7rem" data-asset-usage>Counting saved files…</p>
        <div class="row">
          <button class="btn btn-ghost btn-sm" data-m="prune">${icon("trash")} Remove unused files</button>
        </div>
        <p class="hint" style="margin-top:.7rem">
          Uploaded images and documents are stored in this browser, not in the page, so they
          survive a reload and are not limited to the 5 MB text budget. Exports bundle them.
        </p>
      </div>

      <div class="ed-section">
        <h3>Reset</h3>
        <div class="row">
          <button class="btn btn-ghost btn-sm" data-m="reset-progress">${icon("reset")} Clear progress</button>
          ${isUnlocked()
            ? html`<button class="btn btn-ghost btn-sm" data-m="lock-editing">
                ${icon("lock")} Lock editing
              </button>`
            : ""}
          <button class="btn btn-ghost btn-sm" data-m="reset-doc" style="color:var(--danger)"
                  ${hasLocalEdits() ? "" : "disabled"}>
            ${icon("trash")} Discard local edits
          </button>
        </div>
        <p class="hint" style="margin-top:.7rem">
          Discarding returns to the packs committed with the site. Export first if you want to keep
          your edits.
        </p>
      </div>
    `,
    footer: html`<button class="btn btn-ghost" data-close="done">Close</button>`,
    onMount: ({ root, close }) => {
      wire(root, close);
      showAssetUsage(root);
    },
  });
}

async function showAssetUsage(root) {
  const el = root.querySelector("[data-asset-usage]");
  if (!el) return;
  try {
    const a = await assetUsage();
    el.textContent = a.count
      ? `${a.count} saved ${a.count === 1 ? "file" : "files"}, ${a.label}.`
      : "No uploaded files yet.";
  } catch {
    el.textContent = "Saved files are unavailable in this browser.";
  }
}

function wire(root, close) {
  const doc = getDoc();
  const name = slug(doc.meta?.title);

  on(root, "click", "[data-m]", async (_, btn) => {
    switch (btn.dataset.m) {
      case "export-doc":
        return exportWithAssets(`${name}.json`, exportDoc(), "the whole document");

      case "export-tree": {
        const tree = findTree(doc, btn.dataset.id);
        return exportWithAssets(`${slug(tree.title)}.json`, exportTree(btn.dataset.id), `"${tree.title}"`);
      }

      case "export-section": {
        const section = findSection(doc, btn.dataset.id);
        return exportWithAssets(
          `${slug(section.title)}.json`,
          exportSection(btn.dataset.id),
          `"${section.title}" and its trees`
        );
      }

      case "lock-editing": {
        lock();
        setPrefs({ editMode: false });
        close();
        return toast("Editing locked. The password is needed again.");
      }

      case "prune": {
        const removed = await pruneOrphans(getDoc());
        return toast(
          removed.length
            ? `Removed ${removed.length} unused ${removed.length === 1 ? "file" : "files"}.`
            : "No unused files to remove."
        );
      }

      case "import-file": {
        const file = await pickFile();
        if (!file) return;
        close();
        return runImport(file.text, file.name);
      }

      case "import-paste":
        close();
        return pasteImport();

      case "reset-progress": {
        const ok = await confirmDialog({
          title: "Clear all progress?",
          message: "Every module goes back to locked. The content itself is untouched.",
          confirmLabel: "Clear progress",
          danger: true,
        });
        if (!ok) return;
        resetAllProgress();
        close();
        return toast("Progress cleared.");
      }

      case "reset-doc": {
        const ok = await confirmDialog({
          title: "Discard local edits?",
          message: "Everything authored in this browser is replaced by the packs shipped with the site. Export first if you want to keep it.",
          confirmLabel: "Discard edits",
          danger: true,
        });
        if (!ok) return;
        resetToShipped();
        close();
        return toast("Back to the shipped content.");
      }
    }
  });
}

/*
 * An export bundles every file the content refers to, as base64, so a pack is
 * self-contained: drop it in content/packs/ and the images and documents come
 * with it. That does make packs large, which is the honest cost of "saved".
 */
async function exportWithAssets(filename, doc, label) {
  const ids = collectAssetIds(doc);
  if (!ids.length) {
    downloadJSON(filename, doc);
    return toast(`Exported ${label}.`);
  }

  toast(`Bundling ${ids.length} ${ids.length === 1 ? "file" : "files"}…`);
  try {
    const assets = await bundleAssets(ids);
    const withAssets = { ...doc, assets };
    downloadJSON(filename, withAssets);
    const bytes = Object.values(assets).reduce((n, a) => n + (a.size || 0), 0);
    toast(`Exported ${label} with ${ids.length} ${ids.length === 1 ? "file" : "files"} (${formatBytes(bytes)}).`);
  } catch (e) {
    console.error("[manage] bundling failed", e);
    downloadJSON(filename, doc);
    toast("Exported, but the attached files could not be bundled.", "err", 6000);
  }
}

/* -------------------------------------------------------------- import */

function pasteImport() {
  let textarea;
  openModal({
    title: "Paste a content pack",
    description: "Any JSON in the SkillTrainer pack shape.",
    body: html`
      <div class="field">
        <textarea class="mono" style="min-height:220px" placeholder='{ "schemaVersion": 1, "sections": [], "trees": [] }'></textarea>
      </div>
      <label class="switch"><input type="checkbox" id="import-replace"> Replace everything instead of merging</label>
    `,
    footer: html`
      <button class="btn btn-ghost" data-close="cancel">Cancel</button>
      <button class="btn btn-primary" data-close="ok">Import</button>
    `,
    onMount: ({ root }) => {
      textarea = root.querySelector("textarea");
    },
  }).then((choice) => {
    if (choice !== "ok") return;
    const replace = document.getElementById("import-replace")?.checked;
    runImport(textarea.value, "pasted JSON", replace ? "replace" : "merge");
  });
}

async function runImport(text, label, mode = "merge") {
  // Restore any bundled files first, so asset references resolve immediately.
  let restored = 0;
  try {
    const parsed = typeof text === "string" ? JSON.parse(text) : text;
    if (parsed?.assets) restored = await restoreAssets(parsed.assets);
  } catch {
    /* importDoc reports the parse failure properly below */
  }

  const report = importDoc(text, { mode });

  if (!report.ok) {
    return openModal({
      title: "That pack could not be imported",
      description: `${report.errors.length} problem${report.errors.length === 1 ? "" : "s"} in ${label}. Nothing was changed.`,
      body: reportMarkup(report),
      footer: html`<button class="btn btn-primary" data-close="done">Close</button>`,
    });
  }

  if (report.quotaError) {
    return toast("Imported, but too large to save. It will be gone on reload.", "err", 6000);
  }

  toast(
    restored
      ? `Imported ${label} with ${restored} ${restored === 1 ? "file" : "files"}.`
      : `Imported ${label}.`
  );

  if (report.warnings.length) {
    openModal({
      title: "Imported with warnings",
      description: "The content loaded. These are worth a look.",
      body: reportMarkup(report),
      footer: html`<button class="btn btn-primary" data-close="done">Got it</button>`,
    });
  }
}
