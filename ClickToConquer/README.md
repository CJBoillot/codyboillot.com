# AFK Prototype v11 — First Steps (by hand)

Three systems on one resource pool, plus a prestige layer: Found a New Kingdom. Design docs live in the project.

## Run it

Double-click `index.html`. No build, no server. Dev panel is the ⚙ bottom-right (10×/100× speed, test welcome-back, +1K of everything, export/import, wipe).

## The loop

```
Character ──gold, hide, bone──▶ Kingdom (buildings cost gold + materials)
Kingdom ──wood, stone, iron, food──▶ Crafting (gear + tools)
Crafting ──gear──▶ Character (push further → better drops)
Crafting ──tools──▶ Kingdom (+% output)
```

**By hand.** Four boxes at the top of the center panel — Plants (fiber), Trees (wood), Stones, Rats (hide) — one unit per click, instant, always manual. They unlock in order (Trees once you're clothed, Stones with Woodcraft, Rats with Skinning). The hero starts **idle and naked**; Fight needs a weapon, harvesting needs the matching tool.

**Quests** open with **First Steps**: pull fiber → research Fiber Clothing → make a tunic → snap branches → research Wooden Sword → make it → set him to Fight. Then **Settling In** (the previous chain). Gear tier 0 is Crude (Fiber clothing / Wooden sword); Leather is tier 1.

**Character.** The hero does **one thing at a time**: Fight, Chop Wood, Mine, or Forage (Activity screen). Harvesting needs a tool (axe / pickaxe / sickle); tool tier and level, Strength, and practice (mastery) speed it up. Whatever he's doing continues while AFK.
- *Activity / Fight*: choose a **hunting ground** — The Wilds (beasts → hide, ×0.6 gold), The Roads (bandits → ×1.5 gold, fiber), The Crypts (undead → bone). Each ground is a line of enemy types (Rat → Boar → Wolf → Bear → Sabercat…), 10 stages per type, stage 10 = that type's boss (first kill: +1 talent point + a unique trophy). Each type has a loot pool whose chances rise with stage; earlier loot carries over. HP ×1.18 per stage, ×2 per type. Loot has Common/Uncommon/Rare rarity and lives in the **Loot** tab: Inventory (pin/unpin resources to the header), Bestiary (kill counts per type → +2/5/10/15% vs that type at 10/50/200/1000 kills), Trophies (Wood/Stone/Bronze/Silver/Gold heads at 1k/2k/5k/10k/25k kills, +1% loot & XP each, persist). Each ground keeps its own stage; founding uses the best stage across grounds. Hide needs Skinning and scales with the **Skinning Knife** tool; bone needs Bonecraft. Hero auto-fights. 10 kills unlocks **Advance**; every 10th stage is a boss (×6 HP, ×2 dmg). Knockout = retreat one stage and rest. Skill bar: equipped skills auto-cast on cooldown; **tap a ready one** to cast it Focused (×1.5).
- *Gear*: paper doll with 5 gear slots + 3 tool slots. Tools have their own tiers (Stone / Iron / Steel, gated by tech). Gear: 5 slots (Weapon/Helm/Chest/Boots/Trinket). Forge Tier 1, upgrade to Lv15, forge next tier (Wooden → Iron → Steel → Bone-forged → Mythril). Tier 2+ adds a secondary stat. Costs are kingdom materials + hero drops.
- *Skills*: one tree per discipline — Combat, Logging, Mining, Foraging — drawn top-down. Kills give Combat XP, swings give gathering XP; each discipline level = 1 point. Nodes have 10 ranks; the node below opens when the one above is maxed. Techniques (Power Strike, Cleave, War Cry, Execute, Focus, Second Wind) are Combat nodes: rank 1 learns them, they auto-cast. Gold capstones cost a talent point (first kill of each boss). Trees reset on founding — only Legacy carries over.
- Stat pipeline: `base + gear` → `× tree mods` → `× active buffs`. Combat is deterministic (crit is averaged in).

**Layout.** ≥1024px wide: three panels — paper doll left, activity center, Kingdom / Skills / Talents / Market tabs right. Narrower: the mobile tabbed layout.

**Kingdom.** Opens after the first founding. A thrall IS a plot: one building per thrall, and it runs only because a thrall works it (awake or AFK). +1 thrall per founding (thrall count carries over; the thralls themselves start fresh). Thralls gain 1 XP per job and +5% speed per level. Chains: Forest/Mine/Farm/Husbandry (raw) → Blacksmith/Tannery/Weaver (refined) → Sawmill/Kiln (artisan).

**Quests.** A 23-step chain (multi-step quests show one bar per step; the current quest glows its tab, sub-tab and exact control). When the chain is done, the card becomes an auto-generated **Goal**: the tech you're closest to and what it still needs. pinned at the top of the center panel doubles as the tutorial: each step names an objective, tracks it from game state, points to the screen ("Kingdom → Tech"), and pays a reward on Claim. Survives founding (it's the player's progress, not the kingdom's). Debug has Skip quest.

**Tech** (Kingdom → Tech). No research currency: each tech has a mastery gate (a lifetime counter — ore mined, enemies slain, bosses, foundings) plus a one-time cost in goods/gold. Techs unlock buildings, gear tiers, hero drops (Skinning → hide, Bonecraft → bone) and job-speed bonuses. Five tiers: Camp, Settlement, Ironworking, Artisan, Advanced. Resets on founding; the Blueprints perk pre-researches one tier per rank.

**Resources.** 15 goods in three tiers of five, shown as chips in the header once first gained: T1 Fiber, Wood, Hide, Stone, Berries · T2 Gold, Iron Ore, Leather, Ingot, Meat · T3 Grain, Wool, Cloth, Planks, Bricks. Beasts drop no gold — gold comes from the Market, bandits on the Roads (Wilds stage 10) and the Crypts.

**Market.** Unlocks right before Stake a Claim. Sell any good for gold. Prices climb down the chain (ore 1 → ingot 10 → planks/bricks 12). Gear tiers cost refined goods, so the chain feeds both gold and power.

**Founding (prestige).** Kingdom → Throne. Available at best stage 20; costs gold only (5K, doubling per kingdom level). You gain **Knowledge** from accomplishments (best stage, bosses, gear tier, gold magnitude), pick a **hero path** (Warrior King / Archmage / Ranger Lord at Lv4) and a **kingdom path** (Benevolent / Iron Empire / Merchant Republic at Lv4), and the run resets. Kingdom Level +1, one new **thrall**, more land.

**Founding** costs 1,000 gold the first time (×2.5 each after) at best stage 20 and gives 1 Crystal the first time (formula after). Kingdom quests (A Kingdom chain) start after P1: unlock Bestiary → build on your thrall's plot → …

**Legacy** (Kingdom → Legacy): **Crystals** (from founding and milestone quests) buy permanent perks — the only thing that survives founding, besides Bestiary kill counts/trophies. Info perks gate UI readouts (Ledger = AFK forecast, Bestiary, Danger Sense, Chronicler = Stats card, Surveyor, Almanac = header rates). Also — Head Start (free plots), Blueprints, Deep Cellar, Long Memory, Founder's Cache, Veteran, Bloodline, Old Blade, Haggler (sell prices).

**Debug** (⚙): speed, AFK test, give N of all/one resource, +levels, +stages, +Knowledge, +Kingdom level, export/import, reset run (keeps legacy), RESET ALL.

**Offline.** Both loops run while away: cap 8h, 10% efficiency (+10%/rank Long Memory). Uses a closed-form rate model (no purchases, no advancing), so 8h resolves instantly.

## Files

| File | |
|---|---|
| `config.js` | **All numbers.** Resources, hero/enemy curves, buildings, recipes, offline rules, automation flags (off). |
| `game.js` | Engine: combat tick, farm-rate model, kingdom production, crafting, save/load, offline. |
| `ui.js` | Renders the three tabs and resource bar. |
| `index.html`, `style.css` | Layout. |

## Current tuning (bot: spends points, forges, upgrades, equips skills)

| Time | Stage | Hero Lv | Gear tier |
|---|---|---|---|
| 10 min | 23 | 11 | T1 |
| 30 min | 41 | 18 | T3 |
| 1 h | 69 | 33 | T4–5 |
| 2 h | 99 | 52 | T5 |
| 4 h | 109 | 64 | T5 maxed tiers, leveling |

Faster than v2 because everything stacks. By 4h the kingdom (iron) is the bottleneck for gear upgrades — that's the coupling working.

## Known gaps

- **Gold piles up late** (billions by 4h) once drops scale. Needs a sink: skill levels help; consider gold in high-tier building costs or a "hire workers" boost.
- **Top gear tier hit around 1h.** Either add tiers or slow tier-ups further (`tierUpAt`).
- Offline models skills as sustained averages (`offlineSkillWeight`), not a real cooldown sim.
- No RNG in drops. Add a little variance later for feel.
- Doubles only; breaks past 1e308. Fine for now.
- Automation flags exist in `config.automation` but nothing unlocks them yet.

## Knobs most likely to need turning

- `stages.enemyHp` growth (1.15) vs `gearGrowth` (1.15) and `tiers[].mult` (×3): if the hero stalls everywhere, raise gear; if he never stalls, lower it.
- `attributes.*.effects` and `talents` per-rank values: the attribute/talent layer is a big multiplier now.
- `hero.manualCastBonus` (1.5): how much active play is worth.
- `hero.killsToAdvance` (10): pacing of manual check-ins.
- `hero.bossHpMult` (6): how hard the walls are.
- Recipe `costMult` values: how fast crafting gets expensive.
