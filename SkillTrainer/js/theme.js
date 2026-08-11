/*
 * theme.js - light and dark, persisted.
 *
 * Dark is the default because the parent site is dark, but an unset preference
 * follows the system rather than forcing one. The <html data-theme> attribute is
 * the single switch; every colour token in tokens.css hangs off it.
 */

import { getPrefs, setPrefs, subscribe } from "./store.js";

const media = window.matchMedia("(prefers-color-scheme: light)");

export function resolvedTheme() {
  const pref = getPrefs().theme;
  if (pref === "light" || pref === "dark") return pref;
  return media.matches ? "light" : "dark";
}

export function applyTheme() {
  const theme = resolvedTheme();
  document.documentElement.setAttribute("data-theme", theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "light" ? "#fbf7f2" : "#0b0f17");
  return theme;
}

export function toggleTheme() {
  setPrefs({ theme: resolvedTheme() === "light" ? "dark" : "light" }, "theme");
}

export function initTheme() {
  applyTheme();
  // Only react to the system when the user has not made a choice.
  media.addEventListener("change", () => {
    if (getPrefs().theme == null) applyTheme();
  });
  subscribe((_, reason) => {
    if (reason === "theme" || reason === "boot" || reason === "prefs") applyTheme();
  });
}
