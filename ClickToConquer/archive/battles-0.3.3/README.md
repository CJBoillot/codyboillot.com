# Shelved: army-vs-army d20 battles (Beta 0.3.0–0.3.3)

This is the full build of Beta 0.3.3, kept here so the battle system can be revisited. It is **not loaded by the game**. `index.html` is renamed `index.html.off` so the page can't be opened by accident: it would write a schema-2 save over the live one.

To bring the system back, diff these files against the live ones. The battle code is in two places:
- **game.js:** the block `// ================= Beta 0.3.0: army battles =================`, the `SCHEMA = 2` land migration, and the hooks in `simulate`, `applyOffline` and the exports.
- **ui.js:** `renderBattle()` and `battleReport()`.

The tuned numbers are in `config.js`, under `kingdom.battles`. The dice art is still in `assets/dice/`.

The design and bot results are in the project doc `design/army-battles-v1.md`.

Beta 0.3.4 returned to the 0.2.0 stage battles. Saves with schema 2 are migrated back by the `d.schema === 2` block in `game.js`.
