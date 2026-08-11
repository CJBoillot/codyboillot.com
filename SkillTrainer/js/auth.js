/*
 * auth.js - the edit gate.
 *
 * A single static password, checked against a SHA-256 hash that ships in the
 * source. This is not security and is not pretending to be: see the note in
 * config.js. It exists so a visitor cannot casually rewrite the trees.
 */

import { html, icon } from "./dom.js";
import { EDIT_PASSWORD_SHA256 } from "./config.js";
import { openModal, toast } from "./ui.js";

const KEY = "skilltrainer:edit-unlocked:v1";

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function isUnlocked() {
  try {
    return localStorage.getItem(KEY) === EDIT_PASSWORD_SHA256;
  } catch {
    return false;
  }
}

export function lock() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* private mode; nothing to clear */
  }
}

/**
 * Ask for the password. Resolves true if editing is now unlocked, including the
 * case where it already was.
 */
export async function requestUnlock() {
  if (isUnlocked()) return true;
  if (!crypto?.subtle) {
    // Web Crypto needs a secure context: https, or localhost.
    toast("Editing needs a secure connection (https or localhost).", "err", 5000);
    return false;
  }

  let input;
  let error;

  const choice = await openModal({
    title: "Unlock editing",
    description: "Authors only. Visitors can read every tree without this.",
    body: html`
      <div class="field">
        <label for="edit-pw">Password</label>
        <input id="edit-pw" type="password" autocomplete="current-password" placeholder="Password">
        <span class="hint" id="edit-pw-err" style="color:var(--danger);display:none">
          That password is not right.
        </span>
      </div>
      <div class="banner" style="margin:0">
        ${icon("callout")}
        <div>
          This gate is a convenience, not a security boundary. The site is static, so the
          check runs in your browser and anyone determined can bypass it. It stops accidents,
          not attackers.
        </div>
      </div>
    `,
    footer: html`
      <button class="btn btn-ghost" data-close="cancel">Cancel</button>
      <button class="btn btn-primary" data-close="ok">${icon("lock")} Unlock</button>
    `,
    onMount: ({ root, close }) => {
      input = root.querySelector("#edit-pw");
      error = root.querySelector("#edit-pw-err");
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") close("ok");
      });
      input.addEventListener("input", () => {
        error.style.display = "none";
      });
    },
  });

  if (choice !== "ok") return false;

  const hash = await sha256Hex(input?.value ?? "");
  if (hash !== EDIT_PASSWORD_SHA256) {
    toast("That password is not right.", "err");
    return requestUnlock(); // let them try again rather than dumping them out
  }

  try {
    localStorage.setItem(KEY, hash);
  } catch {
    /* private mode: the unlock just will not persist */
  }
  return true;
}
