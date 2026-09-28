# Click to Conquer — Alpha 0.9.0

Mobile-first AFK / incremental game. Vanilla HTML + JS, no build: open `index.html`. Full design in the project doc `design/v0.3-design.md`.

## Shape of the game

**P0 — the wild (played once).** The hero starts naked, punching rats. Quests teach the UI: gather by hand, research, forge gear, set an activity, fight up to stage 20. Everything fits under a **100-item pack** (150 with Leatherwork); when a harvest fills the pack the hero rests. P0 ends with the **tribute**: 100 gold + the Rat King's Tooth → Kingdom 1. Bot pace: ~28 min.

**The city (0.9).** One land grows Camp → Hamlet → Village → City. Every building has **one level** and one Upgrade button; at Lv 10 / 25 / 50 / 100 … it doubles its output and gets a new name. The chains stay (logs → planks → treated lumber, grain → flour → bread, ore → ingots → swords) with stock targets; the chain's slowest building is highlighted. Each settlement tier needs goods **and the hero**: the Toll Baron (Roads 20) for a Hamlet, the Bone Lord (Crypts 10) for a Village, the Cult Priest (Crypts 20) for a City. The city builds the hero **Halls**: Training Yard (XP), Smithy (cheaper gear), Apothecary (healing), Stables (attack speed); hero level adds +1% production (Lordship). A City with every building at Lv 10 is **proclaimed** (no reset).

**The Kingdom (0.9).** The **Barracks** trains soldiers from Food (bread) and Supplies (swords, treated lumber); soldiers eat every minute, so the army limit is set by the city (housing, food, supplies). Marching soldiers multiply the hero's hits (×(1 + √n / 5)) and HP. The hero leads the conquest from his own screen: **lands** of 50 (lands 1–3) or 100 stages, a Captain every 10 stages and a **Ruler** at the end who gives a crown. Every land held pays **taxes** (1,000 gold/h × 4^(land−1) × conquered % × garrison fill) into coffers you **Collect**, and a spoil (Heartwood, Silver, Relics) for Hardened/Mythril gear. **Rally** (tap, 1 Supplies) strikes at ½ hero damage. **Crowns** (formerly Crystals) come from rulers; **Pass the Crown** banks them, keeps the Capital (building levels back to 1), resets lands/army/hero level and gear, and gives a victory lap in lands conquered before. Crowns buy perks in four trees: Bloodline, Crown, War, Realm. Full design: project doc `design/v0.9-design.md`.

Bot pace (from the end of P0): Hamlet ~0.5 h, Village ~2.2 h, City ~5.9 h, proclaim ~6 h, lands 1–3 within ~1 h of proclaiming, land 4 (first 100-stage land) ~8 h. Dynasty 2: lands 1–3 in the first hour.

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

## Phase 3 — the Kingdom (0.8.0, milestone 1 of `design/phase3-march-v2.md`)

A complete City is **proclaimed** (Keep → Proclaim the Kingdom) instead of reset: +√(Renown/40) Crystals once, nothing lost. The header switches to the war chest: Gold · Supplies · Equipment · Soldiers · Officers. Accountants on the Baker / Forge / Carpenter become **Quartermasters** and send bread → Supplies, swords and treated lumber → Equipment (above the stock target). The **Barracks** (4th line, 200 lumber + 100 swords + 600 gold) musters soldiers: 1 Supplies + 2 gold each, Muster → Drill → March. Soldier cap 50 + 25 × settlement tier. Saves that used the old reset keep their land and wait at the Proclaim quest. Bot: Barracks ~10 min after proclaiming, soldier cap (125) in ~1 h.
