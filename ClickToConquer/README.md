# Click to Conquer — Alpha 0.6.1

Mobile-first AFK / incremental game. Vanilla HTML + JS, no build: open `index.html`. Full design in the project doc `design/v0.3-design.md`.

## Shape of the game

**P0 — the wild (played once).** The hero starts naked, punching rats. Quests teach the UI: gather by hand, research, forge gear, set an activity, fight up to stage 20. Everything fits under a **100-item pack** (150 with Leatherwork); when a harvest fills the pack the hero rests. P0 ends with the **tribute**: 100 gold + the Rat King's Tooth → Kingdom 1. Bot pace: ~28 min.

**The kingdom (the idle game).** One land grows through four settlements, and nothing is lost along the way:

| Settlement | Buildings unlocked (built with goods you already make) | Workers per building | Thrall cap | Storehouse |
|---|---|---|---|---|
| Camp | Logging (free) · Fields (40 wood, 60 gold) · Mine Shaft (60 wood, 30 grain, 100 gold) | 1 | 5 | 200 |
| Hamlet | Sawmill · Mill · Smelter (T1 goods + 300 gold) | 2 | 12 | 350 |
| Village | Carpenter · Baker · Forge (T2 goods + 800 gold) | 3 | 30 | 500 |
| City | — | 3 | 42 | 800 |

To raise the settlement: every building of the current tier built and staffed, then pay in the tier's cap (200 / 350 / 500) of **every good made so far** — contribute a bit at a time. The City is complete when all 9 buildings have 3 workers and an Overseer and each final good (lumber, bread, swords) has an **Accountant** (sells stock above 25% of cap at ½ price). Only then can you **Settle New Lands** (the real prestige): hero and thralls ride with you, a new Camp begins, Crystals = √(Renown / 40).

Each building runs one **cycle** shown as a single bar: **Work → Cart → Haul**; each part has its own upgrade track (every level shortens that part; endless). A building feeds the next one only what it can use (a buffer of 2 cycles of input); the rest goes to the Storehouse. Goods that don't fit the Storehouse are auto-sold at ¼ price. Thralls are hired in **Market → Tavern** and level up as they work.

Bot pace (fresh Camp → City complete): Camp ~1.5 h, Hamlet ~2 h, Village ~4–5 h, ~8 h total. Orders pay 2.5× Market price; builds cost 40–80 gold (Camp), 200 (Hamlet), 500 (Village).

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
