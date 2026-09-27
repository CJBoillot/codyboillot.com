# Click to Conquer — Alpha 0.3.0

Mobile-first AFK / incremental game. Vanilla HTML + JS, no build: open `index.html`. Full design in the project doc `design/v0.3-design.md`.

## Shape of the game

**P0 — the wild (played once).** The hero starts naked, punching rats. Quests teach the UI: gather by hand, research, forge gear, set an activity, fight up to stage 20. Everything fits under a **100-item pack** (150 with Leatherwork); when a harvest fills the pack the hero rests. P0 ends with the **tribute**: 100 gold + the Rat King's Tooth → Kingdom 1. Bot pace: ~28 min.

**P1+ — the kingdom (the idle game).** Three production lines, each its own screen:

| Line | Step 1 | Step 2 | Step 3 |
|---|---|---|---|
| Forest | Logging (K1) wood | Sawmill (K4) planks | Carpenter (K7) treated lumber |
| Farm | Fields (K2) grain | Mill (K5) flour | Baker (K8) bread |
| Mine | Shaft (K3) ore | Smelter (K6) ingots | Forge (K9) iron swords |

Each step has three tracks bought with gold — **Work rate**, **Haul speed**, **Cart size** — and runs only with a thrall on it. Unstaffed later steps are skipped: goods go to the Storehouse instead. Only an **Overseer** reveals which track is the bottleneck; overseers also boost one track by role and star count and have a 30s "Double shift".

**Keep:** Imperial Orders (open-ended, speed bonus in the first 10 min, ⇄ swap every 2 min; orders follow what you actually produce), Hiring Hall (pick 1 of 3, refresh every 5 min), roster, Storehouse cap. **Renown** ranks: Reeve → Baron (500) → Count → Duke.

**Found a new fief:** needs 500 Renown × kingdom number. Resets the kingdom (lines, thralls, gold, orders, renown); keeps the hero, Legacy, Crystals, trophies, Bestiary. Pays √(renown / 40) Crystals and unlocks one new step. Kingdom bot pace: 50–80 min per fief through K9.

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
