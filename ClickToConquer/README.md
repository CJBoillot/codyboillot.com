# Click to Conquer — Alpha 0.4.0

Mobile-first AFK / incremental game. Vanilla HTML + JS, no build: open `index.html`. Full design in the project doc `design/v0.3-design.md`.

## Shape of the game

**P0 — the wild (played once).** The hero starts naked, punching rats. Quests teach the UI: gather by hand, research, forge gear, set an activity, fight up to stage 20. Everything fits under a **100-item pack** (150 with Leatherwork); when a harvest fills the pack the hero rests. P0 ends with the **tribute**: 100 gold + the Rat King's Tooth → Kingdom 1. Bot pace: ~28 min.

**P1+ — the kingdom (the idle game).** Three production lines, each its own screen:

| Line | Step 1 | Step 2 | Step 3 |
|---|---|---|---|
| Forest | Logging (K1) wood | Sawmill (K4) planks | Carpenter (K7) treated lumber |
| Farm | Fields (K2) grain | Mill (K5) flour | Baker (K8) bread |
| Mine | Shaft (K3) ore | Smelter (K6) ingots | Forge (K9) iron swords |

Each step runs one **cycle** shown as a single three-part bar: **Work** (make a batch) → **Cart** (load it) → **Haul** (deliver it). Each part has its own upgrade track, bought with gold; every level shortens that part by 12% of base (hyperbolic, so it never ends). Cycle time = the sum, output = batch ÷ cycle. A step runs only with a thrall on it; unstaffed later steps are skipped. An **Overseer** flags the slowest part and speeds up one part by role (Foreman → Work, Packer → Cart, Carter → Haul).

**Thralls** are hired in **Market → Tavern** (pick 1 of 3). They level up as they haul (Lv = 1 + ⌊√(loads / 4)⌋, +10% Str/Spd per level) and **ride with you** to new lands. Thrall cap = 2 + kingdom number. Dismiss from the roster.

**Keep:** Imperial Orders (speed bonus in the first 10 min, ⇄ swap every 2 min), Renown ranks, Storehouse. Goods that don't fit are **auto-sold at ¼ price**. Gold caps at 10× the Storehouse cap.

**Settle New Lands (prestige):** needs 500 Renown × kingdom number. The hero and thralls go with you; lands, stores, gold, orders and renown stay behind. Pays √(renown / 40) Crystals, one new step and +1 thrall slot. Bot pace: 55–80 min per land through K9.

## Combat (number squish)

Damage starts at 1. Gear stat = tier value + 0.1 × level (levels 0–9); fists level 1.0 → 1.9 by kills. Slots: weapon damage, gloves speed, helm armor, chest HP, boots dodge, trinket crit. Normal enemies take 2–3 hits at the expected gear, bosses ~8.

## Files

| File | |
|---|---|
| `config.js` | All numbers: resources, stages, gear, quests, `kingdom` block. |
| `game.js` | Engine: combat, harvest, kingdom lines, orders, founding, save/offline. Save key `afk_proto_save_v12` (0.2 saves migrate Crystals/perks/bestiary only). |
| `ui.js` | Rendering and input. |
| `index.html`, `style.css` | Layout (≥1024px three columns, otherwise mobile tabs). |

Offline: 8h cap at 10% efficiency (+Long Memory), closed-form rates for the hero and kingdom lines.
