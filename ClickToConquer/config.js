// ============================================================
// ECONOMY CONFIG — three systems, one resource pool.
//   Character: attributes, 5 gear slots, skills, talents; fights stages
//   Kingdom:   buildings → wood, stone, iron, food (+ a little gold)
//   Crafting:  gear tiers/upgrades (hero), tools (kingdom)
// Everything tunable lives here. Placeholder names throughout.
// ============================================================

const CONFIG = {
  version: 'Beta 0.4.4',
  tickMs: 100,
  maxCatchupSeconds: 5,
  autosaveMs: 10000,

  caps: { pack: 100, leatherPack: 150, store: 200, goldMult: 10 },
  offline: {
    capSeconds: 12 * 3600, // Beta 0.1.16: the AFK standard — 100% of live output for up to 12 h (Deep Cellar and Long Memory add +2 h per rank)
    efficiency: 1.0,
    minSecondsToShow: 60,
    adDoubleMultiplier: 2,
  },

  // Icons are [row, col] on assets/icons.png (Shikashi's Fantasy Icons, 32px grid, CC-BY).
  iconSheet: { file: 'assets/icons.png', cell: 32 },

  // ---------- Resources ----------
  // Icons are [row, col] on assets/icons.png (Shikashi's Fantasy Icons, 32px grid, CC-BY).
  iconSheet: { file: 'assets/icons.png', cell: 32 },

  // ---------- Goods ----------
  // 15 resources in three tiers of five. The top bar is a fixed 5×3 grid in this order; a slot stays locked (padlock, no name) until you first gain the good.
  resourceTiers: 3,
  resources: {
    // Tier 1 — the wild
    fiber:   { name: 'Plant Fiber', icon: [11,15], tier: 1, sell: 1, buy: 2,  desc: 'Pulled from plants, or foraged with a sickle. Clothing and hide armour.' },
    wood:    { name: 'Wood',     icon: [17,0],  tier: 1, sell: 1, buy: 5,  desc: 'Snapped from trees, or chopped with an axe. Tools, buildings, weapon hafts.' },
    hide:    { name: 'Hide',     icon: [17,8],  tier: 1, sell: 2, buy: 7,  desc: 'From beasts in the Wilds (with a Skinning Knife). Tannery turns 3 into Leather.' },
    stone:   { name: 'Stone',    icon: [17,1],  tier: 1, sell: 1, buy: 5,  desc: 'Picked up, or quarried with a pickaxe. Stone weapons, buildings.' },
    // Tier 2 — spoils and the forge
    gold:    { name: 'Gold',     icon: [12,7],  tier: 2, sell: 0,  desc: 'Coin. Buys plots, founds kingdoms, levels skills. Earned at the Market and from bandits on the Roads.' },
    ore:     { name: 'Iron Ore', icon: [17,2],  tier: 2, sell: 1, buy: 10,  desc: 'Mined once you know Prospecting. Blacksmith turns 5 into an Ingot.' },
    leather: { name: 'Leather',  icon: [8,2],   tier: 2, sell: 8, buy: 25,  desc: 'Tannery. Leather armor.' },
    ingot:   { name: 'Ingot',    icon: [17,3],  tier: 2, sell: 10, buy: 40, desc: 'Blacksmith. Iron gear and tools.' },
    // Tier 3 — the settled kingdom
    grain:   { name: 'Grain',    icon: [14,13], tier: 3, sell: 1, buy: 4,  desc: 'From the Farm. Feeds Husbandry.' },
    wool:    { name: 'Wool',     icon: [17,5],  tier: 3, sell: 2, buy: 6,  desc: 'From Husbandry. Weaver turns 3 into Cloth.' },
    cloth:   { name: 'Cloth',    icon: [17,7],  tier: 3, sell: 8, buy: 25,  desc: 'Weaver. Fine armor tiers.' },
    planks:  { name: 'Planks',   icon: [19,11], tier: 3, sell: 12, buy: 40, desc: 'Sawmill turns 2 logs into a plank. Steel tools and gear.' },
    lumber:  { name: 'Lumber', icon: [19,11], tier: 3, sell: 30, buy: 100, desc: 'Carpenter: 2 planks into 1 treated lumber. It builds the Barracks and halls, pays for your City, and every soldier needs some.' },
    flour:   { name: 'Flour',    icon: [15,10], tier: 3, sell: 4, buy: 12,  desc: 'Mill: 2 grain into 1 flour.' },
    bread:   { name: 'Bread',    icon: [14,14], tier: 3, sell: 12, buy: 40, desc: 'Baker: 2 flour into 1 loaf. Armies march on it.' },
    swords:  { name: 'Arms', icon: [5,1], tier: 3, sell: 45, buy: 150, desc: 'Armory: 2 ingots into 1 set of arms. Every soldier needs arms.' },
    // ---- Spoils of conquest (0.9): from the taxes of conquered lands ----
    heartwood: { name: 'Heartwood', icon: 'assets/res/wood.webp',  tier: 4, sell: 40, desc: 'Ancient timber from conquered forests. Hardened gear.' },
    silver:    { name: 'Silver',    icon: 'assets/res/ingot.webp', tier: 4, sell: 60, desc: 'From conquered hills. Hardened gear.' },
    relic:     { name: 'Relic',     icon: [6,9],  tier: 4, sell: 200, desc: 'Holy relics from conquered shrines. Wonders, later.' },
    // ---- The war chest (Phase 3): shown in the header after the Kingdom is proclaimed ----
    food:      { name: 'Food',      icon: 'assets/res/bread.webp',      kind: 'war', tier: 4, sell: 0, desc: 'Bread sent to the army. Soldiers are trained on it and eat it every minute.' },
    supplies:  { name: 'Supplies',  icon: 'assets/gear/weapon_t2.webp', kind: 'war', tier: 4, sell: 0, desc: 'Iron swords and treated lumber sent to the army. Soldiers are trained on them and wear them out.' },
    soldiers:  { name: 'Soldiers',  icon: 'assets/gear/helm_t2.webp',   kind: 'war', tier: 4, sell: 0, desc: 'Trained at the Barracks from a person, arms and bread. The army marches with the hero and multiplies his power.' },
    bricks:  { name: 'Bricks',   icon: [13,4],  tier: 3, sell: 12, buy: 40, desc: 'Kiln turns 5 stone into a brick. Hardened gear, grand buildings.' },
    // ---- Loot (kind: 'loot'): dropped by enemies, shown in the Inventory, not in the header bar ----
  },
  rarities: { common: { name: 'Common', color: '#b9b0a3' }, uncommon: { name: 'Uncommon', color: '#5fbf7a' }, rare: { name: 'Rare', color: '#e8c06a' } },

  // ---------- By hand: instant grabs, one per click, always manual ----------
  hand: [
    { id: 'plants', name: 'Plants', icon: [11,15], gives: 'fiber', unlock: {},                        desc: 'Pull plant fiber by hand.' },
    { id: 'trees',  name: 'Trees',  icon: [17,0],  gives: 'wood',  unlock: { gear: 'chest' },        desc: 'Snap dead branches. An axe does this for you.' },
    { id: 'stones', name: 'Stones', icon: [17,1],  gives: 'stone', unlock: { tech: 'stonetools' },   desc: 'Pick up loose stone.' },
    { id: 'rats',   name: 'Rats',   icon: [17,8],  gives: 'hide',  unlock: { tech: 'skinning' },     desc: 'Catch and skin a rat. A knife and a sword do this for you.' },
  ],

  // ---------- Character: base ----------
  hero: {
    baseAttack: 0,          // v0.3: damage comes from the Weapon slot (fists = 1.0)
    baseHp: 0,              // HP comes from the Chest slot (10 × value)
    regenPctOfMax: 0.02,    // regen = 2% of max HP per second
    restMult: 5,            // resting heals 5× faster
    baseAttackSpeed: 1,     // hits per second
    baseCrit: 0.05,         // crit chance
    baseCritDmg: 2,       // crit multiplier
    baseArmor: 0,           // flat damage reduction per enemy hit-second
    xpPerKill: 1,
    xpToLevel: lvl => lvl <= 10 ? Math.floor(12 * Math.pow(1.22, lvl - 1)) : Math.floor(12 * Math.pow(1.22, 9) * Math.pow(1.35, lvl - 10)), // ~10 min to Lv10, then each level costs ×1.35 more
    attackPerLevel: 0,
    hpPerLevel: 0,
    regenPerLevel: 0,
    attrPointsPerLevel: 3,
    talentPointsFromLevel: 5,   // 1 talent point per level from this level
    talentPointsPerBoss: 1,     // first kill of each boss stage
    respecCost: lvl => 500 * Math.pow(1.2, lvl), // gold, scales with hero level
    restThreshold: 0.4,         // rest below this HP fraction
    restUntil: 0.95,
    killHeal: 0.20,             // after every kill the hero catches his breath: +20% max HP (more with healing bonuses). No more resting mid-fight.
    autoAdvanceKills: 50,       // after this many kills the hero pushes on by himself — only into stages he can sustain, never into a boss
    killsToAdvance: 10,
    bossEvery: 10,
    bossHpMult: 4,
    bossDmgMult: 2,
    bossKillsToAdvance: 1,
    manualCastBonus: 1.5,       // tapping a ready skill = ×1.5 power
    enemyAttackInterval: 1.5,   // seconds between enemy swings
  },

  // ---------- Attributes (per point) ----------
  attributes: {
    str: { name: 'Strength',  icon: [1,4], desc: '+2% attack',                       effects: { attackPct: 0.02 } },
    dex: { name: 'Dexterity', icon: [6,3], desc: '+1% attack speed, +0.3% crit',      effects: { speedPct: 0.01, crit: 0.003 } },
    vit: { name: 'Vitality',  icon: [1,0], desc: '+2% max HP, +1% regen',             effects: { hpPct: 0.02, regenPct: 0.01 } },
    int: { name: 'Intellect', icon: [1,3], desc: '+2% skill power, −0.5% cooldowns',  effects: { skillPct: 0.02, cdr: 0.005 } },
    luk: { name: 'Luck',      icon: [13,14], desc: '+1% drops & gold, +1% crit damage', effects: { dropPct: 0.01, critDmg: 0.01 } },
    spi: { name: 'Spirit',    icon: [21,0], desc: '+2% regen, +1% XP',                 effects: { regenPct: 0.02, xpPct: 0.01 } },
  },
  cdrCap: 0.4,

  // ---------- Gear: 5 slots, tiers, levels ----------
  // stat = base × tierMult × gearGrowth^level. Secondary stat opens at tier ≥ 2.
  // Craft next tier: previous tier level ≥ tierUpAt, pay tier's craftCost. Upgrade: upgradeCost × upgradeMult^level.
  gearGrowth: 1.15,
  // Hardened tiers go on forever. Weapon, chest and helm grow ×tierGrowth per tier (levels add +levelStep each); gloves, boots and trinket keep the gentle +1 per tier.
  hardened: { base: 6.5, tierGrowth: 1.6, levelStep: 0.05, costGrowth: 1.7, goldGrowth: 2.2, fastSlots: ['weapon', 'chest', 'helm'] },
  tierUpAt: 9,   // levels 0..9 (value x.0 → x.9); at Lv9 forge the next tier. Levels cap at 9.
  researchSeconds: 5, // researching a tech takes this long (one at a time)
  upgradeSeconds: 2, // each gear/tool upgrade level takes this long (shares the one-at-a-time forge)
  craftSeconds: 5, // forging a gear piece or tool takes this long (one at a time)
  // v0.3 squish: every slot value = tier + 0.1 × level (bare/fists = 1). One stat per slot; `per` turns the value into the stat.
  slots: {
    weapon:  { name: 'Weapon',  icon: [5,1],  primary: 'attack', per: 1,    bare: 'Fists' },   // damage per hit = value
    helm:    { name: 'Helm',    icon: [7,1],  primary: 'armor',  per: 0.1,  bare: 'Bare' },    // −0.1 × value per enemy hit
    chest:   { name: 'Chest',   icon: [7,7],  primary: 'hp',     per: 10,   bare: 'Rags' },    // max HP = 10 × value
    gloves:  { name: 'Gloves',  icon: [8,1],  primary: 'speed',  per: 0.1,  bare: 'Bare' },    // attack speed = 1 + 0.1 × value
    boots:   { name: 'Boots',   icon: [8,3],  primary: 'dodge',  per: 0.02, bare: 'Bare' },    // dodge = 2% × value
    trinket: { name: 'Trinket', icon: [8,6],  primary: 'crit',   per: 0.02, bare: 'None' },    // crit = 2% × value
  },
  fistKillsPerLevel: 10,
  // Tools: worn like gear, drive harvesting. stat = base × toolTiers[t].mult × gearGrowth^level.
  toolSlots: {
    axe:    { name: 'Axe',     icon: [10,1], activity: 'wood',   base: 1 },
    pick:   { name: 'Pickaxe', icon: [10,2], activity: 'mine',   base: 1 },
    sickle: { name: 'Sickle',  icon: [5,5], activity: 'forage', base: 1 },
    knife:  { name: 'Skinning Knife', icon: [5,6], base: 1, boosts: 'hide' },
  },
  toolTiers: [
    { name: 'Wooden', mult: 1, craftCost: { wood: 10 },                      upgradeCost: { wood: 6 },                upgradeMult: 1.3 },
    { name: 'Iron',  mult: 3,  craftCost: { ingot: 4, wood: 20 },            upgradeCost: { ingot: 1, wood: 10 },     upgradeMult: 1.3 },
    { name: 'Steel', mult: 9,  craftCost: { planks: 2, ingot: 6, wood: 40 }, upgradeCost: { ingot: 3, wood: 20 },     upgradeMult: 1.3 },
  ],
  // What the hero can spend his time on. Harvest: one swing per `time` s (÷ tool speed), yields outputs × tool power.
  activities: {
    idle:   { name: 'Rest',      icon: [4,2],  desc: 'Doing nothing but healing.' },
    fight:  { name: 'Fight',     icon: [5,1],  desc: 'Slay enemies for XP and loot. Bandits on the Roads carry gold.' },
    wood:   { name: 'Chop Wood', icon: [4,6],  tool: 'axe',    time: 5, outputs: { wood: 1 },              desc: 'Fell trees in the wild. Needs an axe.' },
    mine:   { name: 'Mine',      icon: [4,5],  tool: 'pick',   time: 6, outputs: { stone: 1, ore: 1 },     desc: 'Work a rockface for stone. Needs a pickaxe. Iron ore once you know Prospecting.' },
    forage: { name: 'Forage',    icon: [11,15], tool: 'sickle', time: 4, outputs: { fiber: 1 }, desc: 'Gather plant fiber. Needs a sickle.' },
  },
  gather: { bgBase: 0.35, bgExp: 0.5 }, // 0.10.12: owned tools gather in the background at bgBase × power^bgExp of the old full-attention rate — slow with a new tool, far faster once it is levelled
  harvestStrPct: 0.01, // +1% harvest speed per Strength point

  tiers: [
    { name: 'Crude', mult: 0.5, perSlot: { weapon: { name: 'Wooden', craftCost: { wood: 10 }, upgradeCost: { wood: 2 } }, chest: { name: 'Fiber', craftCost: { fiber: 10 }, upgradeCost: { fiber: 2 } }, gloves: { name: 'Fiber', craftCost: { fiber: 6 }, upgradeCost: { fiber: 2 } }, helm: { name: 'Fiber', craftCost: { fiber: 6 }, upgradeCost: { fiber: 2 } }, boots: { name: 'Fiber', craftCost: { fiber: 6 }, upgradeCost: { fiber: 2 } }, trinket: { name: 'Fiber', craftCost: { fiber: 4 }, upgradeCost: { fiber: 1 } } }, craftCost: { fiber: 10 }, upgradeCost: { fiber: 2 }, upgradeMult: 1.18 },
    { name: 'Leather',     mult: 1,   perSlot: { weapon: { name: 'Stone', craftCost: { stone: 12, wood: 6 }, upgradeCost: { stone: 4, wood: 2 } } }, craftCost: { hide: 8, fiber: 4 }, upgradeCost: { hide: 2, fiber: 1 }, upgradeMult: 1.25 },
    { name: 'Iron',        mult: 3,   craftCost: { ingot: 5, hide: 6, gold: 300 },            upgradeCost: { ingot: 2, hide: 1 },           upgradeMult: 1.25 },
    { name: 'Steel',       mult: 9,   craftCost: { ingot: 10, lumber: 3, gold: 1500 },   upgradeCost: { ingot: 4, lumber: 1 },              upgradeMult: 1.25 },
    { name: 'Hardened',    mult: 27,  craftCost: { ingot: 16, silver: 5, heartwood: 3, gold: 1500 },    upgradeCost: { ingot: 5, silver: 1 },   upgradeMult: 1.25 }, // endless: Hardened I, II, III… (see hardened below)
  ],
  // Per-slot cost scaling so armor pieces cost a bit different amounts
  slotCostMult: { weapon: 1, helm: 0.8, chest: 1.1, gloves: 0.8, boots: 0.7, trinket: 0.9 },

  // ---------- Disciplines & skill trees ----------
  // Each discipline levels by doing (kills → Combat XP, swings → gathering XP). Each level = 1 point for that tree.
  // A tree is drawn top-down; a node has 10 ranks (+`per` of its stat per rank) and unlocks when its parent is maxed.
  // Capstones (bottom row, 1 rank) cost a TALENT point — earned on the first kill of each enemy-type boss. Trees persist through founding.
  disciplines: {
    combat: { name: 'Combat',   icon: [5,1],  desc: 'Every kill gives Combat XP.' },
    wood:   { name: 'Logging',  icon: [4,6], desc: 'Every swing of the axe gives Logging XP.' },
    mine:   { name: 'Mining',   icon: [4,5], desc: 'Every swing of the pick gives Mining XP.' },
    forage: { name: 'Foraging', icon: [11,15],  desc: 'Every swing of the sickle gives Foraging XP.' },
  },
  discXpToLevel: lvl => Math.floor(12 * Math.pow(1.3, lvl - 1)),
  combatXpToLevel: lvl => Math.floor(60 * Math.pow(1.6, lvl - 1)), // Combat (Path points) levels slowly: ~10 at the end of the Wilds, ~32 after 16 h, ~7 per land after
  discXpPerSwing: 1,
  treeRanks: 10,
  trees: {
    wood: [
      { id: 'swing',   name: 'Swift Axe',   icon: [10,1], row: 0, per: { harvestSpeed: 0.05 },  desc: '+5% chop speed per rank' },
      { id: 'yield',   name: 'Heavy Hand',  icon: [17,0], row: 0, per: { harvestYield: 0.05 },  desc: '+5% wood per swing per rank' },
      { id: 'edge',    name: 'Keen Edge',   icon: [0,7],  row: 1, parent: 'swing', per: { harvestSpeed: 0.03 }, desc: '+3% chop speed per rank' },
      { id: 'double',  name: 'Windfall',    icon: [4,6],  row: 1, parent: 'yield', per: { harvestDouble: 0.02 }, desc: '+2% chance of a double swing per rank' },
      { id: 'sawyer',  name: 'Sawyer',      icon: [19,11],row: 2, parent: 'double', capstone: true, side: { planks: 0.05 }, desc: 'Capstone: 5% of swings also yield a plank' },
    ],
    mine: [
      { id: 'swing',   name: 'Swift Pick',  icon: [10,2], row: 0, per: { harvestSpeed: 0.05 },  desc: '+5% mining speed per rank' },
      { id: 'yield',   name: 'Deep Cut',    icon: [17,1], row: 0, per: { harvestYield: 0.05 },  desc: '+5% stone & ore per swing per rank' },
      { id: 'edge',    name: 'Hard Steel',  icon: [0,7],  row: 1, parent: 'swing', per: { harvestSpeed: 0.03 }, desc: '+3% mining speed per rank' },
      { id: 'double',  name: 'Rich Vein',   icon: [4,5],  row: 1, parent: 'yield', per: { harvestDouble: 0.02 }, desc: '+2% chance of a double swing per rank' },
      { id: 'prospector', name: 'Prospector', icon: [17,2], row: 2, parent: 'double', capstone: true, side: { ore: 0.25 }, desc: 'Capstone: 25% of swings yield extra iron ore' },
    ],
    forage: [
      { id: 'swing',   name: 'Quick Sickle',icon: [5,5],  row: 0, per: { harvestSpeed: 0.05 },  desc: '+5% foraging speed per rank' },
      { id: 'yield',   name: 'Full Basket', icon: [11,15],row: 0, per: { harvestYield: 0.05 },  desc: '+5% fiber per swing per rank' },
      { id: 'edge',    name: 'Light Step',  icon: [0,7],  row: 1, parent: 'swing', per: { harvestSpeed: 0.03 }, desc: '+3% foraging speed per rank' },
      { id: 'double',  name: 'Bounty',      icon: [14,4], row: 1, parent: 'yield', per: { harvestDouble: 0.02 }, desc: '+2% chance of a double swing per rank' },
      { id: 'herbalist', name: 'Herbalist', icon: [11,13],row: 2, parent: 'double', capstone: true, side: { fiber: 0.5 }, desc: 'Capstone: half of swings yield extra fiber' },
    ],
  },

  // ---------- Paths of War (passive). 3 branches × 13 nodes, every node has 10 ranks. Never reset (kept through Pass the Crown). ----------
  // Points: 1 per Combat level. ★ tokens: 1 per boss ever slain (first kill of each boss stage) + quest rewards.
  // A node opens when a connected node one tier closer to the centre is maxed (10/10). Notables and keystones cost 1 point + 1 ★ per rank.
  paths: { // 0.11.1: the Crown Tree — permanent, bought with Crowns; few ranks, big effects; an endless node at the bottom of each branch
    rowCost: [1, 3, 8, 30, 40, 80, 300], endlessBase: 40, endlessGrowth: 1.15, levelBonus: 0.03, ranks: 3,
    branches: [ { id: 'M', name: 'Might', desc: 'attack · crit · bosses', color: '#d9604c' }, { id: 'G', name: 'Guard', desc: 'HP · armor · healing', color: '#6fa3d9' }, { id: 'C', name: 'Command', desc: 'army · taxes · realm', color: '#7fd28f' } ],
    plan: [[1],[0,2],[0,1,2],[1],[0,2],[0,1,2],[1],[1]], // row → column positions; the last row is the endless node
    // [name, per-rank mods, kind, max ranks, perk id (effect handled by the engine)]
    nodes: {
      M: [ ['Sharpened Edge', { attackPct: 0.10 }, 'small', 3], ['Quick Hands', { speedPct: 0.05 }, 'small', 3], ['Keen Eye', { crit: 0.03 }, 'small', 3],
           ['Heavy Blows', { attackPct: 0.15 }, 'small', 3], ['Brutality', { critDmg: 0.25 }, 'small', 3], ['Giant Slayer', { bossDmg: 0.20 }, 'small', 3],
           ['Headhunter', { bossDmg: 0.5, attackPct: 0.1 }, 'notable', 1], ['Fury', { speedPct: 0.08 }, 'small', 2], ['Deadly Aim', { crit: 0.05 }, 'small', 2],
           ['Weapon Master', { attackPct: 0.25 }, 'small', 2], ['Savagery', { critDmg: 0.5 }, 'small', 2], ["Tyrant's Bane", { bossDmg: 0.4 }, 'small', 2],
           ['Berserker', { attackX: 1.5, hpPct: -0.1 }, 'key', 1], ['Bloodline of Kings', {}, 'endless', 0, 'bloodline'] ],
      G: [ ['Thick Skin', { hpPct: 0.10 }, 'small', 3], ['Second Breath', { regenPct: 0.15 }, 'small', 3], ['Iron Hide', { dr: 0.02 }, 'small', 3],
           ['Stout Heart', { hpPct: 0.15 }, 'small', 3], ['Field Rations', { restSpeed: 0.25 }, 'small', 3], ['Hardened', { dr: 0.03 }, 'small', 3],
           ['Bulwark', { hpPct: 0.30, dr: 0.05 }, 'notable', 1], ['Vigor', { regenPct: 0.25 }, 'small', 2], ['Endurance', { hpPct: 0.20 }, 'small', 2],
           ['Stone Skin', { dr: 0.05 }, 'small', 2], ['Troll Blood', { regenPct: 0.40 }, 'small', 2], ['Colossus', { hpPct: 0.30 }, 'small', 2],
           ['Unbreakable', { hpX: 1.5, dr: 0.10, speedPct: -0.05 }, 'key', 1], ['Iron Lineage', {}, 'endless', 0, 'lineage'] ],
      C: [ ['Master Builders', {}, 'small', 3, 'charter'], ['Lean Barracks', {}, 'small', 3, 'rations'], ['Plunderer', { goldPct: 0.2, dropPct: 0.2 }, 'small', 3],
           ['Deep Foundations', {}, 'small', 3, 'foundations'], ['Tax Collectors', {}, 'small', 3, 'tax'], ['Plunder', {}, 'small', 3, 'spoils'],
           ['Warlord', { armyPct: 0.5 }, 'notable', 1], ['Victory Lap', {}, 'small', 2, 'lap'], ['Deep Cellar', {}, 'small', 2, 'cellar'],
           ['Long Memory', {}, 'small', 3, 'memory'], ['War Banners', {}, 'small', 3, 'warcollege'], ["Founder's Cache", {}, 'small', 2, 'cache'],
           ['Conqueror', { armyX: 1.5, attackPct: -0.05 }, 'key', 1], ['Dynastic Treasury', {}, 'endless', 0, 'treasury'] ],
    },
    perkDesc: { charter: '+15% production in every building', rations: '−10% arms and bread per soldier', foundations: 'Each new Age, every building starts with one more level already built', tax: '+25% taxes', spoils: '+25% spoils', lap: '+1× damage in lands you know', cellar: 'AFK cap +2 h and Storehouse +25%',
      memory: '+2 h of time away counted', warcollege: 'Army boost to the hero +10%', cache: 'Start each dynasty with 15 min of your last taxes', bloodline: 'Attack ×1.08', lineage: 'HP and healing ×1.08', treasury: 'Taxes and production +10%' },
  },

  // ---------- 0.11.1: Ages — ten lands per Age; beating the Emperor (land 10) lets you crown your heir into the next Age ----------
  ages: { lands: 10, hp: 150, hit: 15, gold: 12, spoil: 2.5, names: ['Age of Iron', 'Age of Kings', 'Age of Storms', 'Age of Ash', 'Age of Crowns', 'Age of Dragons', 'Age of Legends'],
    crowns: { boss: 1, captain: 1, eraRuler: 10, emperor: 25 } },

  // ---------- 0.11: Eras — every 5 lands end in an Era Ruler; beating one unlocks a Wonder (kept forever) ----------
  eras: {
    size: 5, rulerHp: 12, rulerHit: 3,
    // enemy traits by era (era 1 is plain). Applied to every stage of that era's lands.
    traits: [
      null,
      { id: 'armoured', name: 'Armoured', icon: '🛡', desc: 'Thick plate: +50% HP. Your Techniques hit 50% harder here.', hp: 1.5, hit: 1, mods: { skillPct: 0.5 } },
      { id: 'swarm',    name: 'Swarm',    icon: '🐀', desc: 'Many and weak: −40% HP, +30% hits. They carry 50% more gold.', hp: 0.6, hit: 1.3, gold: 1.5 },
      { id: 'casters',  name: 'Casters',  icon: '🔮', desc: 'Spells pass through the ranks: your army adds only half its HP here.', hp: 1, hit: 1, armyHp: 0.5 },
      { id: 'beasts',   name: 'Beasts',   icon: '🐺', desc: 'Savage: +40% hits, −20% HP.', hp: 0.8, hit: 1.4 },
      { id: 'undead',   name: 'Undead',   icon: '💀', desc: 'The dead carry no coin, but their land yields double spoils when farmed.', hp: 1.1, hit: 1, gold: 0, spoil: 2 },
    ],
  },
  wonders: [ // cycle through these; era e builds wonders[(e-1)%5] at level floor((e-1)/5)+1. Effects stack across levels.
    { id: 'granary',   name: 'Great Granary',    icon: '🌾', desc: 'All production ×3', supply: 3, spoil: 'heartwood' },
    { id: 'armoury',   name: 'Royal Armoury',    icon: '⚔', desc: 'Hero attack ×3', attack: 3, spoil: 'silver' },
    { id: 'colosseum', name: 'Colosseum',        icon: '🏟', desc: 'Hero attack and HP ×2, Combat XP ×2', attack: 2, hp: 2, xp: 2, spoil: 'relic' },
    { id: 'college',   name: 'War College',      icon: '🎖', desc: 'Army boost to the hero +50%, training ×3', armyPct: 0.5, recruit: 3, spoil: 'silver' },
    { id: 'harbour',   name: 'Harbour of Kings', icon: '⚓', desc: 'Taxes and spoils ×3', tax: 3, spoil: 'relic' },
  ],
  // 0.12: story pop-ups — shown once, as each phase begins
  story: {
    beta: { kicker: 'A fresh start', title: 'Welcome to the Beta', go: 'Start fresh', text: "Click to Conquer has grown up. Your town now runs on three production chains, your army is trained from lumber, arms and bread, and every building grows new levels. Old saves don't fit this new world, so everyone starts again in the Beta — your Alpha save is left untouched on this device, but it can't be carried over. Thank you for playing the Alpha. The wilds are waiting." },
    wild: { title: 'The Wilds', go: 'Begin', text: 'You wake in the wet grass with nothing: no blade, no coin, no name anyone remembers. Rats rustle in the reeds, wolves call beyond the ridge, and somewhere past the forest lies an Empire that grants land to anyone who can pay its tribute. Take what the wild gives you. Twist grass into cloth and sharpen a branch into a sword. Every legend in the Chronicle began exactly here: small, cold and stubborn.' },
    charter: { title: 'A Charter in Red Wax', go: 'Raise the camp', text: "The Emperor's envoy weighs your purse, then looks longer at the scars you earned in the wild, and nods. You receive a charter, sealed in red wax: a stretch of river forest, yours to hold. It isn't much. There's a clearing, a handful of families who followed you out of the wild, and trees waiting for an axe. But land remembers who works it. Build a camp, then a hamlet, then a village. Your sword got you here; your town will carry you further." },
    capital: { title: 'The Bells of the Capital', go: 'To war', text: "Bells ring from the new stone towers. Your city no longer holds a charter from someone else's Empire. It's a Capital, and you are its sovereign. Beyond the hills lie lands held by barons and warlords who've never heard your name. They will. The sawyers work by lamplight, the Armory rings day and night, and the bakers are up before dawn. You still ride at the front, but now an army rides behind you." },
    fallow: { title: 'Fallow Fields', go: 'I understand', text: "Every farmer knows a field can't grow wheat forever. Work it too long and the soil tires; rotate the crop, let it rest, and it comes back richer. The old foresters burn tired woods so the young trees grow straighter. Your realm is tired, Sire. Pass the crown to your heir. The lands will be lost and the fields left fallow, but nothing you've learned is forgotten. Your Crowns stay with the bloodline, the gear stays in the armoury, and every generation rises faster than the last." },
  },
  wonderCost: { taxHours: 10, spoilBase: 150, spoilGrowth: 1.8 },

  // ---------- Bestiary & trophies (kill counts per enemy type; persist through founding) ----------
  // Bestiary: the more you kill a type, the better you fight it — bonus = ×damage dealt and −damage taken vs that type.
  bestiary: { tiers: [ { kills: 10, name: 'Familiar', bonus: 0.02 }, { kills: 50, name: 'Studied', bonus: 0.05 }, { kills: 200, name: 'Known', bonus: 0.10 }, { kills: 1000, name: 'Mastered', bonus: 0.15 } ] },
  // Trophies: mounted heads for kill milestones. Each trophy owned = +lootPerTrophy loot and XP, permanently.
  trophies: { lootPerTrophy: 0.02, tiers: [ { kills: 1000, name: 'Bronze', color: '#c08040' }, { kills: 3000, name: 'Silver', color: '#d8dce0' }, { kills: 10000, name: 'Gold', color: '#e8c06a' }, { kills: 30000, name: 'Platinum', color: '#9fd8e0' }, { kills: 100000, name: 'Diamond', color: '#b9a8ff' } ] },

  // ---------- Techniques (active). Unlocked by milestones, levelled by use (mastery), never reset. ----------
  // Mastery XP per cast = the technique's base cooldown (so every technique levels at about the same pace per minute of fighting).
  // Lv N → N+1 costs masteryBase × masteryGrowth^(N−1). Lv 5 and Lv 10 each offer a choice of two mods (switch any time).
  skillSlots: 6,
  masteryBase: 120, masteryGrowth: 1.45,
  techSlots: [ { combat: 1 }, { combat: 1 }, { combat: 9 }, { combat: 24 }, { land: 1 } ], // 2 to start, 3 at Combat 9, 4 at Combat 24, 5 once a land has been conquered
  skills: [
    { id: 'strike',  icon: [3,0],  emoji: '🗡', name: 'Power Strike', cd: 6,  type: 'damage',  power: 3,   powerPerLevel: 0.3,  desc: 'Hit for {p}× attack', unlock: { combat: 3 },
      mods: [ [ { id: 'rend', name: 'Rend', desc: '+30% power', power: 0.3 }, { id: 'stagger', name: 'Quick Hands', desc: '−20% cooldown', cd: -0.2 } ], [ { id: 'twin', name: 'Twin Strike', desc: 'hits twice (2nd at 50%)', twin: 0.5 }, { id: 'armorbreak', name: 'Armor Break', desc: '+60% vs bosses', boss: 0.6 } ] ] },
    { id: 'cleave',  icon: [3,2],  emoji: '🌪', name: 'Cleave',       cd: 12, type: 'cleave',  power: 1.5, powerPerLevel: 0.15, desc: '{p}× attack to this and the next enemy', unlock: { combat: 7 },
      mods: [ [ { id: 'wide', name: 'Wide Arc', desc: '+30% power', power: 0.3 }, { id: 'swift', name: 'Swift Arc', desc: '−20% cooldown', cd: -0.2 } ], [ { id: 'reap', name: 'Reaper', desc: 'heals 10% of damage dealt', leech: 0.1 }, { id: 'whirl', name: 'Whirlwind', desc: 'hits twice (2nd at 50%)', twin: 0.5 } ] ] },
    { id: 'warcry',  icon: [3,6],  emoji: '📣', name: 'War Cry',      cd: 20, type: 'buff', stat: 'attackPct', power: 0.3, powerPerLevel: 0.03, dur: 8, desc: '+{p%} attack for {d}s', unlock: { combat: 11 },
      mods: [ [ { id: 'hymn', name: 'Battle Hymn', desc: '+50% duration', dur: 0.5 }, { id: 'oath', name: 'Blood Oath', desc: '+40% power', power: 0.4 } ], [ { id: 'drums', name: 'War Drums', desc: '−25% cooldown', cd: -0.25 }, { id: 'rage', name: 'Rage', desc: '+50% power', power: 0.5 } ] ] },
    { id: 'wind',    icon: [3,5],  emoji: '💚', name: 'Second Wind',  cd: 25, type: 'heal', power: 0.3, powerPerLevel: 0.03, desc: 'Heal {p%} max HP', unlock: { combat: 15 },
      mods: [ [ { id: 'deep', name: 'Deep Breath', desc: '+30% healing', power: 0.3 }, { id: 'quick', name: 'Quick Recovery', desc: '−20% cooldown', cd: -0.2 } ], [ { id: 'renew', name: 'Renewal', desc: '−30% cooldown', cd: -0.3 }, { id: 'fortify', name: 'Fortify', desc: '+60% healing', power: 0.6 } ] ] },
    { id: 'focus',   icon: [3,10], emoji: '🎯', name: 'Focus',        cd: 20, type: 'buff', stat: 'crit', power: 0.25, powerPerLevel: 0.02, dur: 8, desc: '+{p%} crit for {d}s', unlock: { combat: 20 },
      mods: [ [ { id: 'steady', name: 'Steady Hand', desc: '+50% duration', dur: 0.5 }, { id: 'sharp', name: 'Sharp Eye', desc: '+30% power', power: 0.3 } ], [ { id: 'trance', name: 'Trance', desc: '−25% cooldown', cd: -0.25 }, { id: 'lethal', name: 'Lethal', desc: '+50% power', power: 0.5 } ] ] },
    { id: 'shieldwall', icon: [3,7], emoji: '🛡', name: 'Shield Wall', cd: 30, type: 'buff', stat: 'dr', power: 0.35, powerPerLevel: 0.01, dur: 6, desc: '−{p%} damage taken for {d}s', unlock: { boss: 'crypts:10', label: 'Defeat the Bone Lord (Crypts 10)' },
      mods: [ [ { id: 'hold', name: 'Hold the Line', desc: '+50% duration', dur: 0.5 }, { id: 'brace', name: 'Brace', desc: '−20% cooldown', cd: -0.2 } ], [ { id: 'phalanx', name: 'Phalanx', desc: '+100% duration', dur: 1 }, { id: 'tortoise', name: 'Tortoise', desc: '−30% cooldown', cd: -0.3 } ] ] },
    { id: 'execute', icon: [0,0],  emoji: '💀', name: 'Execute',      cd: 15, type: 'execute', power: 5, powerPerLevel: 0.5, desc: 'Hit {p}× attack; ×3 vs bosses', unlock: { boss: 'crypts:20', label: 'Defeat the Crypts 20 boss' },
      mods: [ [ { id: 'mercy', name: 'No Mercy', desc: '+30% power', power: 0.3 }, { id: 'swiftend', name: 'Swift End', desc: '−20% cooldown', cd: -0.2 } ], [ { id: 'kingslayer', name: 'Kingslayer', desc: '+100% vs bosses', boss: 1 }, { id: 'drain', name: 'Soul Drain', desc: 'heals 15% of damage dealt', leech: 0.15 } ] ] },
    { id: 'ironskin', icon: [3,7], emoji: '🪨', name: 'Iron Skin',    cd: 25, type: 'buff', stat: 'dr', power: 0.3, powerPerLevel: 0.02, dur: 8, desc: '−{p%} damage taken for {d}s', unlock: { combat: 24 },
      mods: [ [ { id: 'thick', name: 'Thick Hide', desc: '+50% duration', dur: 0.5 }, { id: 'hard', name: 'Hardened', desc: '+30% power', power: 0.3 } ], [ { id: 'stone', name: 'Living Stone', desc: '−25% cooldown', cd: -0.25 }, { id: 'granite', name: 'Granite', desc: '+100% duration', dur: 1 } ] ] },
    { id: 'plunder', icon: [11,11], emoji: '💰', name: 'Plunder',     cd: 30, type: 'buff', stat: 'dropPct', power: 0.5, powerPerLevel: 0.05, dur: 10, desc: '+{p%} loot and gold for {d}s', unlock: { combat: 29 },
      mods: [ [ { id: 'greed', name: 'Greed', desc: '+40% power', power: 0.4 }, { id: 'long', name: 'Long Haul', desc: '+50% duration', dur: 0.5 } ], [ { id: 'hoard', name: 'Hoarder', desc: '+60% power', power: 0.6 }, { id: 'raid', name: 'Raider', desc: '−30% cooldown', cd: -0.3 } ] ] },
    { id: 'charge',  icon: [7,1],  emoji: '⚡', name: 'Charge',       cd: 18, type: 'charge', power: 2, powerPerLevel: 0.2, desc: '{p}× attack, +1× for every 100 soldiers marching', unlock: { proclaim: true, label: 'Proclaim the Kingdom' },
      mods: [ [ { id: 'lances', name: 'Lances', desc: '+30% power', power: 0.3 }, { id: 'horns', name: 'Horns', desc: '−20% cooldown', cd: -0.2 } ], [ { id: 'trample', name: 'Trample', desc: 'hits twice (2nd at 50%)', twin: 0.5 }, { id: 'standard', name: 'Royal Standard', desc: '+60% vs bosses', boss: 0.6 } ] ] },
  ],
  // Offline: loadout modeled as flat multipliers (no cooldown sim). Fraction of uptime × average effect.
  offlineSkillWeight: 0.6,

  // ---------- Talents: 3 branches × 5 nodes, linear prerequisites ----------
  talents: {
    warrior:  { name: 'Warrior',  nodes: [
      { id: 'w1', name: 'Brawn',        max: 5, per: { attackPct: 0.04 },   desc: '+4% attack per rank' },
      { id: 'w2', name: 'Thick Hide',   max: 5, per: { armor: 1 },          desc: '+1 armor per rank' },
      { id: 'w3', name: 'Giant Slayer', max: 3, per: { bossDmg: 0.15 },     desc: '+15% boss damage per rank' },
      { id: 'w4', name: 'Brutality',    max: 5, per: { critDmg: 0.1 },      desc: '+10% crit damage per rank' },
      { id: 'w5', name: 'Warlord',      max: 1, per: { attackPct: 0.25, skillPct: 0.25 }, desc: '+25% attack, +25% skill power' },
    ]},
    survivor: { name: 'Survivor', nodes: [
      { id: 's1', name: 'Toughness',    max: 5, per: { hpPct: 0.05 },       desc: '+5% max HP per rank' },
      { id: 's2', name: 'Mending',      max: 5, per: { regenPct: 0.08 },    desc: '+8% regen per rank' },
      { id: 's3', name: 'Stoic',        max: 3, per: { dr: 0.05 },          desc: '−5% damage taken per rank' },
      { id: 's4', name: 'Quick Rest',   max: 3, per: { restSpeed: 0.5 },    desc: '+50% regen while resting per rank' },
      { id: 's5', name: 'Unbreakable',  max: 1, per: { hpPct: 0.3, dr: 0.1 }, desc: '+30% HP, −10% damage taken' },
    ]},
    ranger:   { name: 'Ranger',   nodes: [
      { id: 'r1', name: 'Keen Eye',     max: 5, per: { crit: 0.02 },        desc: '+2% crit per rank' },
      { id: 'r2', name: 'Swift',        max: 5, per: { speedPct: 0.05 },    desc: '+5% attack speed per rank' },
      { id: 'r3', name: 'Scavenger',    max: 5, per: { dropPct: 0.08 },     desc: '+8% drops per rank' },
      { id: 'r4', name: 'Greed',        max: 5, per: { goldPct: 0.1 },      desc: '+10% gold per rank' },
      { id: 'r5', name: 'Deadeye',      max: 1, per: { crit: 0.1, critDmg: 0.5 }, desc: '+10% crit, +50% crit damage' },
    ]},
  },

  // ---------- Hunting grounds ----------
  // Where the hero fights. Each ground has its own stage, enemies, bosses and loot. Drops need their tech (Skinning, Butchery, Grave Robbing). Beasts carry no gold.
  // Enemy art: image + face position (fraction of the image) so the face sits under the enemy's HP bar. Boss art: '<id>_boss'.
  // Painted icons for resources (128px webp); anything without one keeps its sprite from icons.png
  resImages: Object.fromEntries(['fiber','wood','hide','stone','berries','gold','ore','leather','ingot','meat','grain','planks','cloth','wool','flour','bread','swords','bricks'].map(k => [k, `assets/res/${k}.webp`])),
  art: {
    grounds: { wilds: 'assets/enemies/wilds_dusk.webp', roads: 'assets/enemies/roads_a.webp', crypts: 'assets/enemies/crypts_a.webp' },
    enemies: {
      rat: [0.87, 0.67], rat_boss: [0.86, 0.25], boar: [0.80, 0.65], boar_boss: [0.84, 0.62], wolf: [0.80, 0.57], wolf_boss: [0.83, 0.47],
      bear: [0.79, 0.42], bear_boss: [0.84, 0.40], saber: [0.88, 0.38], saber_boss: [0.86, 0.33],
      cutpurse: [0.72, 0.31], cutpurse_boss: [0.18, 0.16], bandit: [0.60, 0.24], bandit_boss: [0.62, 0.13], merc: [0.64, 0.17], merc_boss: [0.49, 0.14],
      raider: [0.62, 0.28], raider_boss: [0.55, 0.14], assassin: [0.76, 0.25], assassin_boss: [0.44, 0.17],
      skeleton: [0.72, 0.18], skeleton_boss: [0.51, 0.14], ghoul: [0.80, 0.33], ghoul_boss: [0.56, 0.26], wraith: [0.85, 0.21], wraith_boss: [0.74, 0.14],
      knight: [0.74, 0.19], knight_boss: [0.51, 0.13], shade: [0.85, 0.21], shade_boss: [0.78, 0.30],
    },
  },
  grounds: {
    // Each ground is a LINE of enemy types. A type has 10 stages; stage 10 is its boss. Pool: per-kill drop chance = base + growth × (stage−1), capped.
    // Loot from earlier types carries over at its stage-10 chance. `unique` drops once, on the first boss kill (none since Beta 0.1.21).
    // dropTool: the drop needs that tool and scales with it. Tech gating (Skinning → hide, Grave Robbing → ingot) applies by resource.
    wilds:  { name: 'The Wilds',  icon: [17,8],  desc: 'Beasts. Hide — no gold.',              goldMult: 0, dropTool: { hide: 'knife' }, line: [
      { id: 'rat',   name: 'Rat',      plural: 'Rats',      boss: 'Rat King',    pool: [{ k: 'hide', base: 0.10, growth: 0.05 }] },
      { id: 'boar',  name: 'Boar',     plural: 'Boars',     boss: 'Great Boar',   pool: [{ k: 'hide', base: 0.35, growth: 0.04 }] },
      { id: 'wolf',  name: 'Wolf',     plural: 'Wolves',    boss: 'Alpha Wolf',      pool: [{ k: 'hide', base: 0.45, growth: 0.04 }] },
      { id: 'bear',  name: 'Bear',     plural: 'Bears',     boss: 'Cave Bear',    pool: [{ k: 'hide', base: 0.55, growth: 0.05 }] },
      { id: 'saber', name: 'Sabercat', plural: 'Sabercats', boss: 'Beast King',   pool: [{ k: 'hide', base: 0.65, growth: 0.05 }] },
    ] },
    roads:  { name: 'The Roads',  icon: [5,7],   desc: 'Bandits. The only enemies that carry gold.',     goldMult: 1, req: { stage: 10 }, reqText: 'Slay the Rat King in the Wilds', line: [
      { id: 'cutpurse', name: 'Cutpurse',   plural: 'Cutpurses',   boss: 'Bandit Chief',           pool: [{ k: 'fiber', base: 0.20, growth: 0.04 }] },
      { id: 'bandit',   name: 'Bandit',     plural: 'Bandits',     boss: 'Toll Baron',          pool: [{ k: 'fiber', base: 0.40, growth: 0.04 }] },
      { id: 'merc',     name: 'Mercenary',  plural: 'Mercenaries', boss: 'Mercenary Captain',         pool: [{ k: 'ingot', base: 0.02, growth: 0.01 }] },
      { id: 'raider',   name: 'Raider',     plural: 'Raiders',     boss: 'Raider Lord',               pool: [{ k: 'ingot', base: 0.05, growth: 0.02 }] },
      { id: 'assassin', name: 'Assassin',   plural: 'Assassins',   boss: 'The Black Prince',          pool: [{ k: 'ingot', base: 0.08, growth: 0.02 }] },
    ] },
    crypts: { name: 'The Crypts', icon: [0,0],   desc: 'Undead. Grave gold, and old iron.',              goldMult: 1.6, req: { tech: 'graverobbing' }, reqText: 'Research Grave Robbing', line: [
      { id: 'skeleton', name: 'Skeleton',   plural: 'Skeletons',   boss: 'Bone Lord',     pool: [{ k: 'ingot', base: 0.02, growth: 0.01 }] },
      { id: 'ghoul',    name: 'Ghoul',      plural: 'Ghouls',      boss: 'Cult Priest',        pool: [{ k: 'ingot', base: 0.04, growth: 0.01 }] },
      { id: 'wraith',   name: 'Wraith',     plural: 'Wraiths',     boss: 'Crypt Wight',        pool: [{ k: 'ingot', base: 0.06, growth: 0.02 }] },
      { id: 'knight',   name: 'Bone Knight',plural: 'Bone Knights',boss: 'Lich',               pool: [{ k: 'ingot', base: 0.10, growth: 0.02 }] },
      { id: 'shade',    name: 'Shade',      plural: 'Shades',      boss: 'The Sleeper',        pool: [{ k: 'ingot', base: 0.15, growth: 0.02 }] },
    ] },
  },

  // ---------- Enemies ----------
  // Stage s → enemy type t = floor((s−1)/10), sub-stage k = 1..10. Inside a type: ×1.18 HP / ×1.12 dmg per sub-stage; each new type ×2 HP / ×1.6 dmg.
  stages: {
    perType: 10,
    // v0.3 battle model: each enemy type t is balanced against the weapon value you usually hold there (t+2: rats vs a wooden sword) at Lv0 × reference passives P(t).
    // Normal HP = RefHit × (2 + (k−1)/8) → 2 hits at stage 1, 3 at stage 9. Boss = RefHit × 8.
    refP: [1.00, 1.15, 1.30, 1.50, 1.75, 2.00, 2.30, 2.60, 3.00, 3.40],
    refHit: t => (t + 2) * (CONFIG.stages.refP[Math.min(t, CONFIG.stages.refP.length - 1)] * Math.pow(1.15, Math.max(0, t - CONFIG.stages.refP.length + 1))),
    refHeroHp: t => 10 * (t + 1.5),
    groundOffset: { wilds: 0, roads: 1, crypts: 3 },
    goldPerKill: s => s <= 20 ? Math.pow(1.14, s - 1) : Math.pow(1.14, 19) * (1 + 0.06 * (s - 20)), // exponential early, gentle after stage 20 (0.9)
    xpPerKill:  s => { const t = Math.floor((s - 1) / 10), k = (s - 1) % 10 + 1; return (k + 10 * t) * Math.pow(1.3, t); }, // Rat 1 → 1 XP, Rat 10 → 10, Boar 1 → 14
    dropCap: 0.95,
    carryOverFloor: 1.0,
  },


  // ---------- Kingdom v0.3: production lines ----------
  // Each line is a chain: gather → refine → craft. Kingdom N (the Nth founding) unlocks the steps with unlock ≤ N.
  // A step: Rate (units/s) = base × (1 + rateGrowth × (Lv−1)); RoundTrip = max(haulMin, haulBase − haulStep × (Lv−1)) s; Cart = cartBase + cartStep × Lv.
  // Output = min(Rate, Cart / RoundTrip). Carts deliver to the next step's input, or to the Storehouse for the last unlocked step.
  kingdom: {
    lines: {
      forest: { name: 'Wood', chain: 'lumber', icon: [4,6], steps: [
        { id: 'logging',   name: 'Logging',    icon: [17,0],  make: 'wood',   base: 0.5, batch: 6,  tier: 0, build: null, stepDesc: ['Young trees grow in the grove.', 'Woodcutters bring the trees down.', 'Carts the logs away.'], parts: ['Grow', 'Fell', 'Haul'], unit: ['Grove', 'groves'], dig: 'Clear a new grove', art: 'logging', desc: 'Woodcutters fell trees for logs.' },
        { id: 'sawmill',   name: 'Sawmill',    icon: [19,11], make: 'planks', from: 'wood',   ratio: 2, base: 0.3, batch: 4,  tier: 1, build: { wood: 100, ore: 40, gold: 200 }, stepDesc: ['Rolls logs onto the saw bench.', 'The blade cuts logs into planks.', 'Stacks the planks for the carpenter.'], parts: ['Load', 'Saw', 'Stack'], unit: ['Saw Pit', 'saw pits'], dig: 'Build a new saw pit', art: 'sawmill', desc: '2 logs → 1 plank.' },
        { id: 'carpenter', name: 'Carpenter',  icon: [10,4],  make: 'lumber', from: 'planks', ratio: 2, base: 0.15, batch: 3, tier: 2, build: { planks: 120, ingot: 30, gold: 500 }, stepDesc: ['Smooths the planks.', 'Treats the wood so it lasts.', 'Stacks the lumber for the Storehouse.'], parts: ['Plane', 'Treat', 'Stack'], unit: ['Workbench', 'workbenches'], dig: 'Set up a new workbench', art: 'carpenter', desc: '2 planks → 1 lumber.' } ] },
      farm: { name: 'Food', chain: 'bread', icon: [12,5], steps: [
        { id: 'fields', name: 'Farm', icon: [14,13], make: 'grain', base: 0.5, batch: 6,  tier: 0, build: { wood: 40, gold: 40 }, stepDesc: ['Sows seed into the field.', 'Grows planted crops into harvestable grain.', 'Collects the ripe crop for storage.'], parts: ['Plant', 'Grow', 'Harvest'], unit: ['Field', 'fields'], dig: 'Plow a new field', art: 'farm', desc: 'Farmers sow and reap grain.' },
        { id: 'mill',   name: 'Mill',   icon: [15,10], make: 'flour', from: 'grain', ratio: 2, base: 0.3, batch: 4,  tier: 1, build: { wood: 80, grain: 100, gold: 200 }, stepDesc: ['Pours grain into the hopper.', 'The millstone grinds it to flour.', 'Sacks the flour for the bakers.'], parts: ['Pour', 'Grind', 'Sack'], unit: ['Millstone', 'millstones'], dig: 'Set a new millstone', art: 'mill', desc: '2 grain → 1 flour.' },
        { id: 'baker',  name: 'Bakery',  icon: [14,14], make: 'bread', from: 'flour', ratio: 2, base: 0.15, batch: 3, tier: 2, build: { flour: 120, planks: 60, gold: 500 }, stepDesc: ['Kneads flour into dough.', 'Bakes the loaves in the oven.', 'Carries the bread to the stores.'], parts: ['Knead', 'Bake', 'Deliver'], unit: ['Oven', 'ovens'], dig: 'Build a new oven', art: 'bakery', desc: '2 flour → 1 bread.' } ] },
      mine: { name: 'Arms', chain: 'arms', icon: [4,5], steps: [
        { id: 'shaft',   name: 'Mine', icon: [17,2], make: 'ore',    base: 0.5, batch: 6,  tier: 0, build: { wood: 60, grain: 30, gold: 80 }, stepDesc: ['Miners break ore from the rock.', 'Sorts the ore from the stone.', 'Hauls the ore to the surface.'], parts: ['Dig', 'Extract', 'Haul'], unit: ['Depth', 'depths'], dig: 'Dig deeper', art: 'mine', desc: 'Miners dig iron ore.' },
        { id: 'smelter', name: 'Forge',    icon: [17,3], make: 'ingot',  from: 'ore',   ratio: 2, base: 0.3, batch: 4,  tier: 1, build: { ore: 100, wood: 80, gold: 200 }, stepDesc: ['Feeds ore and coal to the furnace.', 'Melts the ore into iron.', 'Pours the iron into ingots.'], parts: ['Stoke', 'Smelt', 'Cast'], unit: ['Furnace', 'furnaces'], dig: 'Build a new furnace', art: 'forge', desc: '2 ore → 1 ingot.' },
        { id: 'forge',   name: 'Armory',     icon: [5,1],  make: 'swords', from: 'ingot', ratio: 2, base: 0.15, batch: 3, tier: 2, build: { ingot: 120, planks: 60, gold: 500 }, stepDesc: ['Heats the ingots in the hearth.', 'Beats the iron into blades and plate.', 'Hardens the arms for battle.'], parts: ['Heat', 'Hammer', 'Temper'], unit: ['Anvil', 'anvils'], dig: 'Raise a new anvil', art: 'armory', desc: '2 ingots → 1 set of arms.' } ] },
    },
    startGold: 50, foundRenown: 500, swapCooldown: 120,
    war: { thrallBonus: 10, supplyCapMult: 2, soldierCapBase: 50, soldierCapPerTier: 25, soldierGold: 2, quartermaster: { bread: 'food', swords: 'supplies', lumber: 'supplies' } },
    // ---- 0.9: buildings are one level each ----
    milestones: [],   // Beta 0.4.1: no milestones — growth comes from levels 1–10 and depths
    // 0.12.1: every building grows new levels (a grove, a field, a furnace… only the Mine digs). Level d makes yield^(d−1) × the first; digging it costs gold × digGrowth each time; its parts cost partCost^(d−1) × more.
    depths: { yield: 10, partCost: 22, digMult: 2 },   // Beta 0.4.1: capacity = base × level × 10^(depth−1); a level at depth D costs 22^(D−1) more; opening the next depth costs 2 of its first levels
    lordship: 0.01,                                      // +1% production per hero level
    minLv: 10,                                           // a complete City: every part of every building at this level, and the Barracks built
    // The army (0.9): the Barracks trains soldiers from Food + Supplies; soldiers eat every minute.
    // 0.10 war economy (income, not stockpiles): Forest's treated lumber = Housing, Mine's swords = Arms, Farm's bread = Food.
    // Each soldier draws `upkeep` of each per minute (× (1 + demandPerLand × lands held)). The army fights at the strength of its weakest line.
    // 0.12 the army: the Barracks turns 1 person + arms + bread into a soldier. Beta 0.4.4: the price is flat per land (see costLand0).
    army: { build: { lumber: 150, swords: 60, gold: 600 }, trainPerMin: 2, soldierCost: { lumber: 1, swords: 1, bread: 1 }, costLand0: 3, costLandGrowth: 2.0, costAge: 0.5,   // Beta 0.4.4: a soldier costs 3 × 2^(land−1) of each good (× the Age), however big the army already is
      lines: { housing: { good: 'lumber', line: 'forest', name: 'Housing', verb: 'Houses the army' }, arms: { good: 'swords', line: 'mine', name: 'Arms', verb: 'Arms the army' }, food: { good: 'bread', line: 'farm', name: 'Food', verb: 'Feeds the army' } },
      // casualties: marching soldiers fall at lossRate × pressure per minute (pressure = share of the hero's HP one fight takes, 0..1)
      lossRate: 0.01, recruitArms: 1,
      bonusDiv: 7.9, hpDiv: 4.0, armyExp: 0.75, costBase: 60, costExp: 1.6,   // hero attack ×(1 + soldiers/25), HP ×(1 + soldiers/15): 700 soldiers fight like a 0.11 army of 20,000
      recBase: 80, recOffset: -20, garrisonShare: 0.02 },     // recommended army for land n (of an Age) = 80n − 20; a garrison needs 2% of that
    // 0.12 people: houses hold people; people become soldiers. Births fill the houses; conquered lands send settlers.
    people: { perHouse: 5, houseBase: 2.5, houseGrowth: 1.03, birthMin: 4, birthPct: 0.03, birthFill: 0.75,   // births fill houses to 75%; the rest is room for settlers
      headTax: 15, waveBase: 25, waveGrowth: 1.5, trickleBase: 8, trickleGrowth: 1.3 },
    // Hero buildings in the city (0.9)
    halls: [
      { id: 'yard',       name: 'Training Yard', icon: 'assets/gear/weapon_t1.webp', tier: 1, build: { gold: 300, planks: 30 },  per: 0.10, effect: 'xpPct',    desc: 'Hero XP +10% per level' },
      { id: 'smithy',     name: 'Smithy',        icon: 'assets/gear/weapon_t2.webp', tier: 1, build: { gold: 400, ingot: 20 },   per: 0.03, effect: 'gearCost', desc: 'Gear and tool costs −3% per level (up to −60%)' },
      { id: 'apothecary', name: 'Apothecary',    icon: 'assets/res/berries.webp',    tier: 2, build: { gold: 800, flour: 60 },   per: 0.10, effect: 'regenPct', desc: 'Hero healing +10% per level' },
      { id: 'stables',    name: 'Stables',       icon: 'assets/gear/boots_t2.webp',  tier: 2, build: { gold: 800, lumber: 20 },  per: 0.03, effect: 'speedPct', desc: 'Hero attack speed +3% per level' },
    ],
    hallCost: { base: 100, exp: 1.7 },
    // Lands (0.9): conquered from the hero screen; taxes grow ×4 per land
    lands: { taxBase: 1000, taxGrowth: 2.6, garrisonPer: 10, cofferHours: 8, shortStages: 50, longStages: 100, shortLands: 3, offsetStart: 6, offsetStep: 3, spoilPerHour: 30, victoryLap: 3, heroHereCap: 0.5, endlessDepth: { winsPer: 50, hp: 1.12, hit: 1.10, drop: 1.05, dropCap: 4, spoilBase: 0.03, perLand: 0.2 },
      // 0.10.1 land difficulty: smooth inside a land (×span from first stage to the Ruler's), a wall between lands (next land starts ×(land/span) above the last one's end)
      curve: { hp: 105, hit: 11.5, landHp: 2.8, landHit: 1.9, spanHp: 2.0, spanHit: 1.6, captainHp: 9, captainHit: 0.47, rulerHp: 12, rulerHit: 0.47, /* Beta 0.1.16: bosses take ~3× longer and hit ~3× softer — same total danger, a real fight */ endless: 1.15 },
      // Beta 0.4.0 The Front: soldiers are the fuel of conquest. A stage between forts is a siege of cost(n, s) soldier-minutes of worth;
      // the marching army fills it at (soldiers × worth) per minute and loses `attrition` of itself per minute while it does. Forts (every 10th stage) are the hero's duel.
      siege: { p0: 300, landG: 1.65, span: 4, attrition: 0.02, worthK: 2, worthExp: 0.35, worthMin: 0.25, worthMax: 40, refLog: 0.3, refSlope: 0.64, refAge: 0.3,
        goldPer: 1, sortie: 30, retry: 90, ageExp: 0.4 } },
    // Settlement tiers inside one land. Raising a tier costs `cap` of every good made so far (pay in as you go) and loses nothing.
    tiers: [
      { name: 'Camp',    cap: 300, slots: 1, thralls: 6,  lvCap: 10,  threat: 'roads:20',  need: 'Build Logging, the Farm and the Mine.' },
      { name: 'Hamlet',  cap: 600, slots: 2, thralls: 12, lvCap: 20,  threat: 'crypts:10', need: 'Build the Sawmill, the Mill and the Forge.' },
      { name: 'Village', cap: 1000, slots: 3, thralls: 30, lvCap: 30, threat: 'crypts:20', need: 'Build the Carpenter, the Bakery and the Armory.' },
      { name: 'City',    cap: 1000, slots: 3, thralls: 42, lvCap: 1e9, need: 'Build the Barracks, and raise every part of every building to Lv 10.' },
    ],
    statPct: 0.05,                  // each point of a worker's Speed / Strength: 5% faster Work / Cart
    tierOrders: true,               // goods delivered in Orders also count toward the next settlement
    heroOrderChance: 0.3,           // once the kingdom makes 3+ goods, one Order at a time may still ask for the hero's goods
    accountantShare: 0.5, accountantReserve: 0.25,   // accountants sell a line's final good above 25% of cap, at half the Market price
    // A cycle: Work (batch ÷ rate) → Cart (loadBase) → Haul (haulBase). Every track level shortens its phase by trackGrowth (hyperbolic: never zero, never ends).
    trackGrowth: 0.12, loadBase: 6, haulBase: 12, autoSell: 0.25,
    thrallCapBase: 2, thrallXpDiv: 4, thrallLvBonus: 0.1,
    costBase: 120, costExp: 1.5, haulCostMult: 0.8,   // 0.12: each of a building's three parts (Work, Cart, Haul) costs a third of the old building level
    bufferCap: 200,                          // most input a refiner can hold waiting
    workerMilestones: [10, 25, 50],          // +1 worker slot at these step levels (highest track)
    extraWorker: 0.25,                       // each worker after the first: +25% rate
    starMult: [1, 1.5, 2.0, 2.5, 3.0, 3.5],  // Overseer multiplier by stars (index = stars)
    abilitySeconds: 30, abilityCooldown: 600,
    hirePrice: [0, 40, 120, 350, 900, 2200], offerRefresh: 300, refreshCost: 25,
    ranks: [ { name: 'Reeve', renown: 0, perk: 'Start' }, { name: 'Baron', renown: 200, perk: 'Storehouse ×2 · Orders pay 50% more' }, { name: 'Count', renown: 1000, perk: 'Orders pay double' }, { name: 'Duke', renown: 3000, perk: 'Orders pay ×2.5' } ],
    orderFrom: ['The Northern Legion', 'The Merchant Guild', 'The Village of Ashford', 'The Imperial Court', 'The Border Garrison'],
    orderBase: { wood: 40, grain: 40, ore: 30, planks: 20, flour: 20, ingot: 15, lumber: 10, bread: 10, swords: 6, hide: 25, stone: 40, fiber: 40 },
    heroOrderGoods: ['hide', 'stone', 'fiber'],   // when the kingdom makes fewer than 3 goods, Orders ask for what the hero gathers
    renownPer: { wood: 0.5, grain: 0.5, ore: 0.7, planks: 1.5, flour: 1.5, ingot: 2, lumber: 4, bread: 4, swords: 6, hide: 0.8, stone: 0.4, fiber: 0.4 },
    orderGoldMult: 2.5, orderBonusSeconds: 600, speedBonus: 0.2,
  },

  // ---------- Kingdom (pre-0.3, unused): plots, buildings, jobs ----------
  plots: {
    cap: lvl => 2 + (lvl - 1) * 2,          // plots you may own at this Kingdom Level (balance later)
    cost: n => Math.round(300 * Math.pow(2.2, n)), // gold for the (n+1)th plot
  },
  thralls: lvl => lvl - 1,                  // one per founding
  // Some harvest / building outputs only appear once a tech is known (resource → tech id)
  harvestGate: { ore: 'prospecting' },
  // A thrall IS a plot: you can build one building per thrall, and it only runs because a thrall works it. Thralls level by finishing jobs.
  thrallXp: { toLevel: lvl => Math.floor(10 * Math.pow(1.35, lvl - 1)), speedPerLevel: 0.05, headStartLevels: 3 },
  // A job: consumes inputs, runs `time` seconds, yields outputs. Level: +8% speed and +1 output every 5 levels.
  buildingTypes: [
    // Gathering
    { id: 'forest',    cat: 'gather',  name: 'Forest',      icon: [4,6],  buildCost: { wood: 40, stone: 10 },                         job: { time: 10, inputs: {},                     outputs: { wood: 1 } } },
    { id: 'mine',      cat: 'gather',  name: 'Mine',        icon: [4,5],  buildCost: { wood: 40, stone: 30 },               job: { time: 10, inputs: {},                     outputs: { stone: 1, ore: 1 } } },
    { id: 'farm',      cat: 'gather',  name: 'Farm',        icon: [12,5], buildCost: { wood: 30, stone: 10, fiber: 10 },               job: { time: 10, inputs: {},                     outputs: { grain: 1 } } },
    // Crafting (refining)
    { id: 'smith',     cat: 'craft',   name: 'Blacksmith',  icon: [4,4],  buildCost: { gold: 200, stone: 40, wood: 40 },   job: { time: 10, inputs: { ore: 5 },             outputs: { ingot: 1 } } },
    { id: 'tannery',   cat: 'craft',   name: 'Tannery',     icon: [8,2],  buildCost: { wood: 40, stone: 20, hide: 10 },              job: { time: 10, inputs: { hide: 3 },            outputs: { leather: 1 } } },
    { id: 'weaver',    cat: 'craft',   name: 'Weaver',      icon: [17,6], buildCost: { gold: 150, wood: 40 },              job: { time: 10, inputs: { wool: 3 },            outputs: { cloth: 1 } } },
    // Artisan
    { id: 'sawmill',   cat: 'artisan', name: 'Sawmill',     icon: [19,11], buildCost: { gold: 400, wood: 100, ingot: 5 },  job: { time: 20, inputs: { wood: 5 },            outputs: { planks: 1 } } },
    { id: 'kiln',      cat: 'artisan', name: 'Kiln',        icon: [13,4],  buildCost: { gold: 400, stone: 100, ingot: 5 }, job: { time: 20, inputs: { stone: 5 },           outputs: { bricks: 1 } } },
  ],
  buildingCats: { gather: 'Gathering', craft: 'Crafting', artisan: 'Artisan' },

  // ---------- Quests ----------
  // A linear chain that doubles as the tutorial. `check` types: counter (lifetime goods/kills/etc), tech, tool, gear, plots, building,
  // jobs (jobs completed by hand or thrall), sold (gold earned at market), stage, boss, founded, thrall (assigned), activity (swings).
  // Shown in Settings → What's new (newest first). Keep each line short.
  changelog: [
    ['Beta 0.4.4', 'Army economy audit. A soldier now costs the same however big your army is — the old price rose 1% with every soldier you had, so doubling your goods barely grew the army and invasions never caught up. The price is now set per land (3 of each good in the first land, doubling each land after, more in later Ages), and the army boost to your hero is a little softer to match. The Front now tells you how long the land will take at your current pace, how big your army will settle, what is holding it back and how much faster fixing it would make you, with a button straight to that building. The Barracks says what it is training as fast as, instead of "paused". Bottleneck alarms on the belts now update the moment you upgrade. Going deeper costs half as much.'],
    ['Beta 0.4.3', 'The whole chain on one screen. Inside any building, the small Chain | One switch beside Output shows every building of that chain as one snaking belt — the middle building runs the other way so the belt flows straight on, and colours step from red to violet along the whole chain. Every phase has its upgrade button beside its row (glowing red when it is the bottleneck), and a gold button appears beside a building\'s name when it can go deeper. Tap a building\'s name to open it on its own. Also: slots start working as a cart is sent to them, and row labels sit clear of the bottleneck glow.'],
    ['Beta 0.4.2', 'When the Barracks is paused for lack of lumber, arms or bread, every building in that chain now says so at the top: the slowest building tells you which part to upgrade, the others take you to it. The Output box now shows the building\'s steady output instead of a jumpy average.'],
    ['Beta 0.4.1', 'Buildings are belts. Every building now works one depth at a time, and each of its three parts has levels 1 to 10 — one big slot per level. Inside a building you watch mine carts ride a snaking belt through the three parts: they change colour as they are worked, wait on the belt for a free slot, and leave for the next building. If a part can\'t keep up, its belt fills and the goods are sold cheap on the spot: that part pulses red and its upgrade button glows until you fix it. With all three parts at Lv 10 a gold button opens the next depth (a new grove, furnace, oven…): the old one folds away and the new one starts at Lv 1 making what the old one made at Lv 10. A Camp builds up to Lv 10, a Hamlet to depth 2, a Village to depth 3, a City without limit. The Output box shows what the building really turns out per second. Old saves are converted to the same output. In a conquered land the Front box now says the Front is resting and what opens the next land (for the first land: the quest The Iron Hills), so it is clear why no siege is running.'],
    ['Beta 0.4.0', 'The Front. Conquest is now a siege fed by soldiers. In a land, every stage between forts is besieged by your army: the siege bar fills at (soldiers × their worth) and the ground never falls back. Your hero sets that worth — the stronger he is against this land\'s soldiers, the more each soldier counts ("worth ×1.4 each"). Soldiers fall only while the siege gains ground (2% of the army a minute), and each takes foes and their gold with him. Every 10th stage is a fort: the hero duels its captain himself; if he can\'t win yet, the army holds the breached walls, no one falls, and he tries again once stronger (or tap Advance). The pace of conquest is now the pace of your Barracks — lumber, arms and bread. It all runs while you are away, and the welcome-back report says how far the front moved. No more recommended army: after a land falls the hero marches on straight away.'],
    ['Beta 0.3.4', 'Back to the old battles. The army-vs-army dice campaign (0.3.0–0.3.3) was a misfire and is shelved for now: lands are fought stage by stage again with the hero leading the army, as in 0.2.0, with the Endless Battle and auto-march back. Saves from 0.3.x get their land progress, captains and quest back.'],
    ['Beta 0.3.3', 'AFK battles are safe. Replaying a battle you have already won, in Defend, costs no soldiers — the fallen are only wounded — so the army can farm all night and still be there in the morning. Soldiers are only lost when you push forward. Your hero\'s bonus is recalibrated: a new kingdom starts near 0 ("hero −1 on every die") and it grows as the hero does; enemy armies are larger to match. A crit while pushing now takes a prisoner, who joins you only if you win. On a conquered land, Advance becomes "March to (next land)". The welcome-back report says where the army fought, what it lost and why it stopped.'],
    ['Beta 0.3.2', 'Calmer battles. Each round now shows one duel with big, readable dice and the sum with bonuses ("16 + 3 = 19"), plus how many other duels were fought. Rounds last 1.6 s instead of 0.7 s; a long battle shows six of its rounds, always the first and last. The result stays up for 4 s.'],
    ['Beta 0.3.1', 'The enemy army box no longer shows the enemy picture, so its count sits centred like yours.'],
    ['Beta 0.3.0', 'Army battles. Every land is now a campaign of 50 battles fought army against army with d20 dice, Risk style: the bigger side rolls more dice and keeps its best, a natural 20 is a crit that converts an enemy soldier to your side while you push forward, and a 1 is a fumble. Battles fight themselves after a 10 s muster, or tap Strike to fight at once. Defend is the default and costs you the fewest men; Charge, Rally, Flank, Volley and Medics are orders with a 1-minute cooldown. While you are away (or idle) your army replays the last battle it won for gold and loot, and pauses if it drops below 75% of its peak. Only you advance to the next battle and start the next land. Battle 50 ends with a best-of-three duel against the ruler. Old lands keep your progress (a 100-stage land is now 50 battles).'],
    ['Beta 0.2.0', 'The endless loop. People and houses are gone: a soldier is now 1 lumber + 1 arms + 1 bread, one from each chain, and lumber is the Wood chain\'s finished good like arms and bread. The Barracks trains for as long as goods keep coming, and never uses goods kept for building. Once a land falls, the hero marches on to the next one by himself as soon as the army reaches its recommended size (untick it on the hero screen to stay and farm). The Carpenter\'s steps are now Plane, Treat and Stack, and quests about houses, settlers and head tax are rewritten.'],
    ['Beta 0.1.26', 'When the Storehouse is full, a building now shows what is being sold off: "Storehouse full — 0.24 arms/s sold off cheap at 11 gold each (+2.75 gold/s)". Overflow while you are away is sold the same way instead of being lost.'],
    ['Beta 0.1.25', 'The bottleneck step now shows what its next upgrade buys — "Upgrade → +0.12 wood/s, then Haul is the limit" — so you can see a big gain from a tiny one.'],
    ['Beta 0.1.24', 'Ties are shown as ties: when two or three steps run at the same speed they are all marked ("Tied", or "Balanced — raise all three"), since raising just one gains nothing. Piles between even steps say the next step keeps pace instead of blaming the first one.'],
    ['Beta 0.1.23', 'Once a chain has a later building, the goods before it leave the top bar (the Mill unpins grain; the Bakery unpins flour too). It happens once — re-pin anything from Loot and it stays. Also fixes the Rat King\'s Tooth not being sold for gold on load.'],
    ['Beta 0.1.22', 'Raising your settlement now asks only for your best goods: the Camp pays in wood, grain and ore; the Hamlet in planks, flour and ingots; the Village in lumber, bread and arms. Lower-tier goods are no longer needed.'],
    ['Beta 0.1.21', 'The Rat King\'s Tooth is gone: the Empire\'s tribute is simply 100 gold. Any tooth you were holding is sold for 60 gold.'],
    ['Beta 0.1.20', 'The town bar on Production now moves: it fills toward the next person born, and once the homes are full for births it shows progress toward the next house.'],
    ['Beta 0.1.19', 'A building that is short of input no longer flags its own bottleneck: when another building up the chain is the limit, the view says which one it is waiting on and nothing inside glows.'],
    ['Beta 0.1.18', 'The big Production button always takes you back to all the buildings, from anywhere — the small ‹ Production button inside a building is gone.'],
    ['Beta 0.1.17', 'The collapsed quest card no longer stretches and scatters on wide screens: title, current step and Claim stay together in one compact card.'],
    ['Beta 0.1.16', 'Time away now counts in full: 100% of your normal progress for up to 12 hours (Deep Cellar and Long Memory each add 2 hours per rank). Bosses are real fights — about three times the HP, hitting a third as hard per swing. Beating the Rat King is now its own quest, before you spend your first Crown. The little fight window on other screens is hidden by default once you found your Camp (Settings → Show fight preview on other screens brings it back). Ranger Lord and Merchant Republic are gone.'],
    ['Beta 0.1.15', 'Reliability fixes. Reloading a new save no longer re-runs old Alpha updates (which could reset building parts and refund Crown Tree ranks). Offline rewards are banked the moment you come back, so closing the game before tapping the button loses nothing. While away: gathering and loot count toward quests, captains you march past are recorded, the Barracks trains at full speed, production chains no longer count the same goods twice, and land gold and XP match live play. Two attack skills landing in the same instant no longer bring a slain enemy back. The cloud never uploads while you are choosing between saves or when the cloud save is from a newer version. Importing a bad save is refused and your save is kept. Crowning your heir saves once, after the town reset, and keeps its Deed reward. The Settlers quest counts the settlers your conquest brought. The City stores as much as the Village. The Roads open after the Rat King falls. Quest texts corrected (sword Lv 9, trophies at 1,000 kills, plank recipe, taxes per land, settlement costs).'],
    ['Beta 0.1.14', 'Tap any building in the chain strip to jump straight to it.'],
    ['Beta 0.1.13', 'Every building now shows its whole chain at the top: what each building really makes per second, how much input reaches it versus how much it could use, and which building to upgrade when it runs short.'],
    ['Beta 0.1.12', 'The Armory, Mill and Bakery get their art: every step and pile in all nine production chains is now painted.'],
    ['Beta 0.1.11', 'New art for the Carpenter and the Forge.'],
    ['Beta 0.1.10', 'New art for Logging and the Sawmill, and a fresh set for the Farm and the Mine.'],
    ['Beta 0.1.9', 'Refreshed art for every Farm and Mine step and pile.'],
    ['Beta 0.1.8', 'New art for the Farm and the Mine: every step and every pile now has its own painting.'],
    ['Beta 0.1.7', 'A new look inside every building: a flow overview shows each step\'s rate and where the bottleneck is; every step has its own card, and the piles between steps show what is waiting and whether it is building up. Step art is on the way.'],
    ['Beta 0.1.6', 'Every building has its own steps: the Farm Plants, Grows and Harvests; the Mine Digs, Extracts and Hauls; Logging Grows, Fells and Hauls; the Sawmill Loads, Saws and Stacks; the Carpenter Planes, Joins and Raises; the Forge Stokes, Smelts and Casts; the Armory Heats, Hammers and Tempers; the Mill Pours, Grinds and Sacks; the Bakery Kneads, Bakes and Delivers.'],
    ['Beta 0.1.5', 'Goods now move through a building one step at a time. Work makes a load, the Cart carries it, and Haul brings it to the Storehouse — each part has a capacity (how much per trip) and a speed (how long a trip takes). If a part can\'t keep up, goods pile up in front of it, so you can see the bottleneck: upgrade that part.'],
    ['Beta 0.1.4', 'Progress bars move again. Inside a building, each part fills once per load: faster parts finish early and wait (dimmed) for the slowest one. Every Production card has a small bar that fills with each load.'],
    ['Beta 0.1.3', 'Buildings now work like a real production line: Work, Cart and Haul run side by side, each with its own capacity per second, and the building makes as much as its slowest part. Upgrading the part with the gold bar raises output; the others wait until it catches up. Each part doubles its capacity at Lv 10, 25, 50, 100…'],
    ['Beta 0.1.2', 'The "your kingdom begins" guide is up to date: Production, Work / Cart / Haul and the Keep. It now appears after the Charter story instead of on top of it.'],
    ['Beta 0.1.1', 'The founding quest now points to the right place: Kingdom → Keep → Pay tribute.'],
    ['Beta 0.1.0', 'The Beta begins — everyone starts fresh. Old Alpha saves no longer load (yours stays on this device, untouched). Everything from the 0.12 updates is in: three production chains feed the Barracks, your army is made of people housed in your town, and every building grows new levels (groves, fields, furnaces… only the Mine digs). Balance: building a new level now costs ×12 more each time, matching its ×12 output, and the "grow your slowest building" Deed only asks for a level you can afford. If a level costs more than your Storehouse holds, the building tells you to expand it.'],
    ['0.12.1', 'Buildings grow. After you proclaim the Kingdom, every building can add new levels — Logging clears new groves, the Farm plows new fields, the Forge builds new furnaces, the Bakery new ovens, and the Mine digs deeper. Each one can grow far bigger than the last and has its own Work, Cart and Haul. The buttons on each Production card upgrade the newest one. Crowning your heir now starts a fresh town: levels, houses and people begin again, and the Age\'s gold makes the climb quick. Drillmasters became Deep Foundations: each rank starts every building with one more level built. New quest: Go Deeper.'],
    ['0.12.0', 'Kingdom Production. Your town is now three chains that feed the Barracks: People (Logging → Sawmill → Carpenter → houses), Arms (Mine → Forge → Armory) and Food (Farm → Mill → Bakery). Every building has three parts — Work, Cart and Haul — each with its own level; the slowest part glows gold. Tap Enter to go inside. Houses hold people, people pay a little tax, and the Barracks turns a person, arms and bread into a soldier; each soldier costs a little more gear than the last. There is no army limit or upkeep any more, and conquered lands send settlers — if you have houses for them. Armies are smaller and every soldier counts: old armies were rescaled at the same strength. Quartermasters and Rations became Master Builders and Lean Barracks; the Great Granary now triples all production. New art for every building, new quests for the city and the kingdom, and a few words from the Chronicle as each chapter begins.'],
    ['0.11.2', 'Loot cleanup. Drops that did nothing are gone: rat tails, tusks, pelts, claws, fangs, rope, lockboxes, bone dust, grave iron and the boss trinkets (the Rat King\'s Tooth stays: it pays the tribute). Meat, berries, the Butcher\'s Cleaver and Butchery are gone too. The Wilds drop hide, the Roads gold, the Crypts gold and ingots. Anything you were holding was sold for its old price. Trophies are kill milestones per enemy: Bronze at 1,000 kills, Silver 3,000, Gold 10,000, Platinum 30,000, Diamond 100,000 (+2% loot and XP each).'],
    ['0.11.1', 'Ages and the Crown Tree. Each Age is ten lands; beat the Emperor at land 10 and press Crown your heir in the Keep to begin the next Age — the same ten lands, far richer and far tougher, with the Age named on Where to fight. Eras and Wonders keep counting across Ages. Permanent power now comes from one place: the Crown Tree (Skills → Crown Tree), bought with Crowns — few ranks, big effects, and an endless node at the bottom of each branch. Every first boss kill gives a Crown (boss tokens are gone), Captains pay Crowns each Age, and rulers pay more in later Ages. Your old Path gold, boss tokens and Legacy perks were refunded, and saves past land 10 moved into the right Age.'],
    ['0.11.0', 'Eras and Wonders. Every fifth land now ends in an Era Ruler — far tougher than a normal ruler. Beat one and its Wonder opens in the Keep: Great Granary, Royal Armoury, Colosseum, War College, Harbour of Kings, then stronger versions of each. Wonders are huge, permanent boosts that survive every Pass the Crown; by default half your taxes flow into the one being built (change it in the Keep). From land 6 each era\'s enemies have a trait — Armoured, Swarm, Casters, Beasts, Undead. The economy is rebalanced so late lands no longer fall like dominoes: taxes grow ×2.6 per land, Path ranks get 20% dearer each, Crowns grow steadily with each land (and Bloodline has no rank cap, so every Crown has a use), recruits scale with your army, and there are now 200 lands.'],
    ['0.10.12', 'Tools now work for you. Once you own an axe, pickaxe or sickle, it gathers on its own — all the time, even while your hero fights and while you are away. A new tool is slow; every level makes it much faster, so upgrading tools matters more than ever. The Chop Wood, Mine and Forage boxes now just open that tool\'s screen (swing speed, yield, what you have in store); the fight carries on in the bar at the bottom.'],
    ['0.10.11', 'In Paths, the box for buying ranks now sits above the tree, so you can tap a node and buy without scrolling.'],
    ['0.10.10', 'The game has its own icon in the browser tab and on your home screen — the Click to Conquer crest.'],
    ['0.10.9', 'The Paths are rebuilt. Combat levels no longer give points — each one now makes your hero 3% stronger (attack and HP) on its own. Path ranks are bought with gold instead: tiny, permanent steps (+0.1% at the top), with no rank cap. The tree now grows downward; level a row evenly (every node 5+, average 10) and the next, deeper row opens — stronger, and 6× the price. The ★ nodes cost gold plus a boss token per rank, so every star has a use. Your ranks so far are kept. Veteran now adds +1% per Combat level per rank; the Merchant Republic makes Path ranks 15% cheaper.'],
    ['0.10.8', 'Logging, Mining and Foraging use the same icons as everywhere else. Tap the boss-token box in Paths to see every ★ node, whether it is open yet, and what it takes to open it.'],
    ['0.10.7', 'Tidier panels: the What\'s new list has proper margins, and the Where to fight buttons put each place\'s name above its progress so long names and lock reasons no longer crowd together.'],
    ['0.10.6', 'Go back and farm! Every conquered land has a Fight here button (Kingdom → Lands) that takes your hero to its Endless Battle, where the land\'s spoil (silver, heartwood, relics) drops on a share of kills. Every 50 wins it goes a depth deeper — tougher foes, better drops — and a knock-out only drops you one depth. A conquered land now pays its full taxes even while your hero fights there. The gathering and By hand panels are gone once you proclaim (By hand already at the City): the Capital gathers, the hero fights.'],
    ['0.10.5', 'Big moments get a banner: conquering a land, passing the crown, proclaiming, raising your settlement, buildings doubling, new trophies — and a pop on every level. After the story quests, Deeds of the Dynasty keep you going with new goals (take the next land, temper your gear, grow the host, hunt a trophy) that pay gold and ★. Stars past what your Paths can use now give +0.5% attack and HP each. Tech requirements say where a good comes from (tap for more). Land 2 is now the Iron Hills (it pays silver) and land 3 is Blackwood March. Raising your settlement asks less of new and in-between goods; Baron needs 200 Renown. Trophies come at 500 kills and give +2%. Lands ramp up more steadily inside, with a smaller jump at the border. The kingdom paths (Benevolent, Iron Empire) now really change your buildings, and the gold rate in the header counts taxes.'],
    ['0.10.4', 'Crowns reworked. Every ruler now pays a little more than the last (1, 1, 2, 2, 3, 4, 5, 7…) and proclaiming gives 5. Passing the Crown no longer takes your gear or building levels — only the lands, taxes, army and stores go, and the hero starts at level 1. Perks: Bloodline now multiplies (×1.08 per rank); War College replaces Drill Sergeants and Standing Army; Founder\'s Cache pays out from your last taxes; Heirloom Arms, Old Blade and Blueprints are gone (nothing to keep anymore); the Ledger, Danger Sense, Chronicler, Surveyor and Almanac now open through quests. Every retired perk\'s Crowns are refunded. New quests teach the army — supply lines, casualties, the Endless Battle and growing demand — and after Blackwood March a quest leads you to Pass the Crown for the first time (+20 Crowns). In your first dynasty, the third land opens once you have passed the crown.'],
    ['0.10.3', 'In the Kingdom phase the building tabs are named for what they supply — Housing, Arms, Food, Soldiers — in the same order as the header. Taxes now flow straight into your gold (no more Collect button; if you bought Stewards, its 15 Crowns are back). Lands are listed newest first.'],
    ['0.10.2', 'Battles cost soldiers. The harder the fight, the more fall — easy fights cost nothing, new lands and captains the most. The Barracks replaces them, but every recruit needs swords, so a strong Mine decides how hard you can push. The army settles where replacements keep up and never falls below half. Push to conquer, fall back to rebuild: the hero screen shows losses, recruits and where your army will hold.'],
    ['0.10.1', 'Every new land is a real step up. Enemies grow steadily through a land, and the next land starts well above where the last one ended — from the Iron Hills on, expect to need better gear and a bigger army. Hardened gear now goes on forever: Hardened I, II, III… each tier makes your weapon, chest and helm about 60% stronger (Mythril is folded into Hardened). Hardened I costs about what Steel did, and conquered lands send 5× more silver and heartwood.'],
    ['0.10.0', 'The war economy. Your army now runs on income, not stockpiles: the Forest houses it (treated lumber), the Mine arms it (swords) and the Farm feeds it (bread). Soldiers join free while all three lines have income to spare, and the army fights at the strength of its weakest line. Every land you conquer makes each soldier need 15% more — rebalance your lines to keep up. In a land the hero now auto-advances through captains and the Ruler; after the Ruler comes the Endless Battle, the richest fighting in that land, where he rests instead of retreating. Only you choose the next land — and a land pays at most 50% taxes while your hero is still in it. Old Food and Supplies go back to the Storehouse as bread, swords and lumber.'],
    ['0.9.12', 'Rally is gone — the army already fights at the hero\'s side on its own. If you bought the War Cry perk, its Crowns are back.'],
    ['0.9.11', 'A second bar under the kills bar shows the countdown to auto-advance — and when it is paused, it says why (boss next, or the next stage is too tough and what to upgrade). The Rally button now shows what it does: your army strikes for the damage shown, 1 Supply per tap.'],
    ['0.9.10', 'The hero pushes on by himself: after 50 kills on a stage he advances — but only into a stage he can hold, and never into a boss (you choose those fights). No more resting mid-fight: he catches his breath after every kill instead. If a fight goes badly he retreats a stage and tells you what to upgrade. You can turn auto-advance off under the kills bar.'],
    ['0.9.9', 'Every quest now has something new to do when you reach it — no more instant claims. Screens and Skills views (Paths, Gathering, Techniques) unlock when a quest sends you there. Combat levels come much slower, but each Path point is worth 50% more (if you had spent more points than you now have, your Paths were reset to re-spend). Boss threats are part of the Raise quests, and raising the settlement or proclaiming waits for its quest.'],
    ['0.9.8', 'Screens open as the story reaches them, left to right. Loot, the Bestiary and Trophies each unlock with a short quest — no Crown needed (if you bought the Bestiary, your Crown is back). Kingdom tabs are now in unlock order: Tech, Keep, Legacy, Halls, Lands. Your first Crown goes on The Ledger.'],
    ['0.9.7', 'The first quests ask a little more, and kill goals now count from when the quest starts — so a quest is never already finished when you reach it.'],
    ['0.9.6', 'Fixed: tapping an item in the Inventory crashed (thanks Monica!). Item details now list the city buildings, Quartermaster and Barracks correctly. Gathering shows when an item is full and stops popping +1 for things that can\'t be stored. Fixed gathering mastery speed.'],
    ['0.9.5', 'New skills. Paths: a passive web of 39 nodes in three branches (Might, Guard, Command) — every node has 10 ranks, points come from Combat levels and ★ from bosses, and nothing ever resets. Techniques: ten active moves unlocked by milestones, levelled by using them, with a mod to choose at Lv 5 and Lv 10. Your old Combat tree points are refunded — spend them in Paths!'],
    ['0.9.4', 'Gear and tool pop-ups are tidy: item info on top, Upgrade and Max side by side, Forge underneath, and buttons that can\'t do anything are hidden.'],
    ['0.9.3', 'The skill XP bar is taller so you can read the numbers.'],
    ['0.9.2', 'The ! on the top tabs is a clean round badge again.'],
    ['0.9.1', 'New quests take the hero\'s gear to Iron: research Iron Gear and forge an Iron blade in the Hamlet, then Iron armor in the Village before the Cult Priest.'],
    ['0.9.0', 'The big one. Buildings run on one level each — no more thralls, workers or Overseers — and double their output at Lv 10, 25, 50, 100. The hero clears a threat before each settlement can grow, and the city builds him Halls (Training Yard, Smithy, Apothecary, Stables). After you proclaim, the Barracks trains an army that eats Food and Supplies and multiplies the hero\'s power, and the hero leads the conquest from his own screen: lands of 50–100 stages, a Ruler with a crown at the end, garrisons and taxes. Crystals are now Crowns: take them from rulers, spend them in four trees, and Pass the Crown to start a stronger dynasty.'],
    ['0.8.3', 'After proclaiming: +10 thrall room for the Barracks crew, the quest card points at the army instead of the City checklist, and the City card reads Capital.'],
    ['0.8.2', 'Fix: thralls stuck on old or unbuilt buildings (counted as busy, invisible) are freed when the game loads.'],
    ['0.8.1', 'City checklist now names each building that is missing a worker, Overseer or Accountant, and counts idle thralls. The Tavern says when you are at the thrall cap.'],
    ['0.8.0', 'Phase 3 begins: a complete City is now proclaimed as your Capital instead of being reset. The header becomes your war chest (Gold, Supplies, Equipment, Soldiers, Officers), Accountants become Quartermasters, and the Barracks musters soldiers. The Road to new lands comes next.'],
    ['0.7.2', 'Settle New Lands is now Conquer New Lands.'],
    ['0.7.1', 'New Your Stats card on the Gear screen: every combat stat, which piece drives it, and what to do next — the weakest piece is marked Best next. Tap a row to open that piece.'],
    ['0.7.0', 'Stock settings: buildings that feed another building now keep goods in the Storehouse for what you need (new buildings, the next settlement, orders). Auto splits half and half; or pick 0, ¼, ½ or Full.'],
    ['0.6.9', 'Building crews redesigned: a tile for each worker slot (empty slots show + Add worker), with Overseer and Accountant rows that say what they do. Clearer sword and quest wording.'],
    ['0.6.8', 'The Back button now returns to the tab you were on (and closes an open popup first) instead of leaving the game.'],
    ['0.6.7', 'Fix: on desktop the first quest could be pushed off the bottom of the screen and hidden.'],
    ['0.6.6', 'Painted icons for every gear piece and tool, changing with each tier.'],
    ['0.6.5', 'New painted icons for every resource.'],
    ['0.6.4', 'The Roads and the Crypts get their art: every bandit, undead and boss, with painted backdrops.'],
    ['0.6.3', 'Art! Every beast in the Wilds and its boss now appears in the fight, over a painted Wilds backdrop.'],
    ['0.6.2', 'Orders now count toward your next settlement. Overseers and thrall stats matter much more. Iron and Steel gear use kingdom goods. Orders sometimes ask for what your hero gathers.'],
    ['0.6.1', 'Cloud saves with Google sign-in (or play as a guest). Cheaper buildings, better-paying Orders.'],
    ['0.6.0', 'Camp → Hamlet → Village → City. Buildings are built with goods; raising the settlement costs goods, never progress.'],
    ['0.5.x', 'Work → Cart → Haul cycle bar. The Tavern. Thralls level up and ride with you to new lands.'],
  ],
  quests: [
    // ===== First Steps: everything by hand =====
    { id: 'f01', chain: 'First Steps', name: 'Naked in the Wild', text: 'You have nothing. Plants have fiber, and fiber can be twisted into cloth. Pull some by hand — one handful per click.',
      steps: [ { label: 'Character → Activity → By hand → tap Plants ×15', check: { counter: 'fiber', need: 15 } } ],
      reward: { fiber: 5 }, focus: { tab: 'hero', sub: 'fight', el: 'hand:plants' } },
    { id: 'f01b', chain: 'First Steps', name: 'Bare Knuckles', text: 'Rats are bold here. You have no weapon, but you have fists — and fists harden with every kill. Punch a few rats.',
      steps: [ { label: 'Character → Activity → Your hero is… → Fight', check: { activity: 'fight' } }, { label: 'Slay 20 rats with your fists', check: { counter: 'kills', need: 20, since: true } } ],
      reward: { fiber: 5 }, focus: { tab: 'hero', sub: 'fight', el: 'act:fight' } },
    { id: 'f02', chain: 'First Steps', name: 'Twist and Knot', text: 'Knowing how is half of it. Research Fiber Clothing — it costs a little of the fiber you just pulled.',
      steps: [ { label: 'Kingdom → Tech → Fiber Clothing → Research', check: { tech: 'fiberclothing' } } ],
      reward: { fiber: 5 }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:fiberclothing' } },
    { id: 'f03', chain: 'First Steps', name: 'Clothed', text: 'Make a fiber tunic. Your Equipment panel shows what you wear — click the Chest slot.',
      steps: [ { label: 'Character → Gear → tap the Chest slot → Forge (10 fiber, 5s)', check: { gear: 'chest' } } ],
      reward: { fiber: 4 }, focus: { tab: 'hero', sub: 'gear', el: 'gear:chest' } },
    { id: 'f04', chain: 'First Steps', name: 'A Sharpened Branch', text: 'Trees are open to you now. Snap branches by hand, then research the Wooden Sword.',
      steps: [ { label: 'Character → Activity → By hand → tap Trees ×15', check: { counter: 'wood', need: 15 }, focus: { tab: 'hero', sub: 'fight', el: 'hand:trees' } }, { label: 'Kingdom → Tech → Wooden Sword → Research', check: { tech: 'woodensword' }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:woodensword' } } ],
      reward: { wood: 5 }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:woodensword', el2: 'hand:trees' } },
    { id: 'f05', chain: 'First Steps', name: 'Armed', text: 'Make the sword. Click the Weapon slot.',
      steps: [ { label: 'Character → Gear → tap the Weapon slot → Forge (10 wood, 5s)', check: { gear: 'weapon' } } ],
      reward: { wood: 10 }, focus: { tab: 'hero', sub: 'gear', el: 'gear:weapon' } },
    { id: 'f06', chain: 'First Steps', name: 'Sharper Fights', text: 'Crafting a sword makes fighting much more efficient: a sharpened branch hits twice as hard as a fist, so every fight ends sooner. Set him back to Fight — he keeps at it even when the game is closed.',
      steps: [ { label: 'Character → Activity → Your hero is… → Fight', check: { activity: 'fight' } }, { label: 'Slay 40 enemies with the sword', check: { counter: 'kills', need: 40, since: true } } ],
      reward: { fiber: 10 }, focus: { tab: 'hero', sub: 'fight', el: 'act:fight' } },
    // ===== Settling In =====
    // Each quest is a checklist of steps. Step checks: activity, ground, tool, gear, tech, counter, plots, building, jobs, sold, stage, boss, founded, thrall.
    { id: 'f07', chain: 'First Steps', name: 'Keep Your Progress', text: 'Your hero keeps fighting even while the game is closed, and the game saves itself on this device. Sign in with Google to back your progress up and play on any device — or carry on as a guest.',
      steps: [ { label: 'Settings (⚙) → Sign in with Google, or Continue as guest', check: { account: 1 } } ], reward: { fiber: 10 }, focus: { el: 'id:dev-toggle', el2: 'id:cloud-box' } },
    { id: 'q01b', chain: 'Settling In', name: 'The Rat King', text: 'Every tenth stage a boss waits — far tougher than the foes before it, and a long fight. Fill the kills bar and press Advance to push deeper; the hero never walks into a boss on his own, so you choose when he is ready. The first time you beat a boss you win a Crown 👑 — the power of your bloodline, never lost.',
      steps: [
        { label: 'Fight in The Wilds', check: { activity: 'fight', ground: 'wilds' } },
        { label: 'Press Advance until you reach the Rat King (stage 10)', check: { stage: 10 } },
        { label: 'Defeat the Rat King', check: { bossKey: 'wilds:10' } },
      ], reward: { gold: 25 }, focus: { tab: 'hero', sub: 'fight', el: 'id:advance-btn' } },
    { id: 'q01', name: 'Onward', text: 'Past the Rat King the Wilds grow meaner: boars, wolves and worse. Deeper stages drop more loot and experience — pushing is how you grow. If he starts losing, Retreat a stage and upgrade.',
      steps: [
        { label: 'Slay 30 more enemies', check: { counter: 'kills', need: 30, since: true } },
        { label: 'Push on to stage 12', check: { stage: 12 } },
      ], reward: { wood: 20 }, focus: { tab: 'hero', sub: 'fight', el: 'id:advance-btn' } },
    { id: 'q02', name: 'Woodcraft', text: 'Tools open up the wild. Woodcraft is the first thing you can research: crude tools carved from wood.',
      steps: [
        { label: 'Slay 50 enemies', check: { counter: 'kills', need: 50, since: true } },
        { label: 'Have 25 wood (Trees box)', check: { have: 'wood', need: 25 } },
        { label: 'Kingdom → Tech → Research Woodcraft', check: { tech: 'stonetools' } },
      ], reward: { wood: 40, gold: 25 }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:stonetools' } },
    { id: 'q02b', name: 'Growing Stronger', text: 'Kills give Combat XP, and every Combat level makes your hero 3% stronger. Your Crown from the Rat King buys a node in the Crown Tree on the Skills tab — permanent, and never reset.',
      steps: [
        { label: 'Reach Combat level 2', check: { disc: 'combat', need: 2 } },
        { label: 'Skills → Crown Tree → buy Sharpened Edge (1 👑)', check: { path: 'M0', need: 1 } },
      ], reward: { fiber: 15 }, focus: { tab: 'hero', sub: 'skills', rtab: 'skills', el: 'path:M0' } },
    { id: 'q03', name: 'An Axe of Your Own', text: 'You have wood enough for an axe, and the axe will cut the rest. Tools are the row under your armor on the Equipment panel — click a slot to make or upgrade it.',
      steps: [
        { label: 'Click the Axe slot on your Equipment → Make (Wooden)', check: { tool: 'axe' } },
      ], reward: { wood: 10 }, focus: { tab: 'hero', sub: 'gear', el: 'tool:axe' } },
    { id: 'q04', name: 'Timber', text: 'Tools work for you. Once you own an axe it chops on its own — while you fight, and even while the game is closed. It starts slow; every level of the axe makes it much faster. The hero screen now shows what you earn while away.',
      steps: [
        { label: 'Activity → Chop Wood', check: { activity: 'wood' } },
        { label: 'Upgrade the axe to Lv 2 (Gear → Tools)', check: { toolLevel: 'axe', need: 2 } },
        { label: 'Chop 30 wood with the axe', check: { harvested: 'wood', need: 30, since: true } },
        { label: 'Click the Axe slot → Upgrade once (faster swings, more wood)', check: { toolLevel: 'axe', need: 1 } },
      ], reward: { stone: 10 }, focus: { tab: 'hero', sub: 'fight', el: 'act:wood', el2: 'tool:axe' } },
    { id: 'q05', name: 'Skinner', text: 'Beasts have hides, if you know how to take them.',
      steps: [
        { label: 'Activity → Fight', check: { activity: 'fight' } },
        { label: 'Slay 70 enemies', check: { counter: 'kills', need: 70, since: true } },
        { label: 'Kingdom → Tech → Research Skinning', check: { tech: 'skinning' } },
      ], reward: { hide: 5 }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:skinning', el2: 'act:fight' } },
    { id: 'q05b', name: 'Spoils', text: 'Everything you kill leaves something behind — tails, tusks, pelts. The Loot tab keeps it all. Tap an item there to see where it comes from and what it is for.',
      steps: [ { label: 'Open the Loot tab', check: { viewed: 'inventory' } } ], reward: { gold: 20 }, focus: { tab: 'inventory', rtab: 'inventory' } },
    { id: 'q06', name: 'Hunter', text: 'Only beasts have hides, and beasts live in the Wilds. A better knife takes more hide per kill.',
      steps: [
        { label: 'Click the Skinning Knife slot → Make (10 wood)', check: { tool: 'knife' } },
        { label: 'Fight in The Wilds', check: { activity: 'fight', ground: 'wilds' } },
        { label: 'Take 30 hide from beasts', check: { looted: 'hide', need: 30, since: true } },
      ], reward: { hide: 15 }, focus: { tab: 'hero', sub: 'gear', el: 'tool:knife', el2: 'ground:wilds' } },
    { id: 'q06b', name: 'Leatherworking', text: 'Hide becomes armor once you know how.',
      steps: [
        { label: 'Kingdom → Tech → Research Leatherworking', check: { tech: 'leatherwork' } },
      ], reward: { hide: 10, talent: 1 }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:leatherwork' } },
    { id: 'q06c', name: 'Every Swing Counts', text: 'Gathering has trees too: Logging levels with every swing of the axe. Speed first — a faster axe is more of everything. The harvest screen now shows your swing time and yield per swing.',
      steps: [
        { label: 'Reach Logging level 2', check: { disc: 'wood', need: 2 } },
        { label: 'Skills → Logging → put a point in Swift Axe', check: { node: 'wood:swing', need: 1 } },
      ], reward: { wood: 30 }, focus: { tab: 'hero', sub: 'skills', rtab: 'skills', el: 'node:wood:swing' } },
    { id: 'q07', name: 'Stone Blade', text: 'Better gear means faster kills, just as better tools mean faster gathering. Stone is picked up by hand — open the By hand row and click Stones. Then learn Stone Weapons, upgrade the wooden sword to Lv 9, then forge the Stone tier.',
      steps: [
        { label: 'Character → By hand → Stones: pick up 30 stone', check: { counter: 'stone', need: 30 }, focus: { tab: 'hero', sub: 'fight', el: 'hand:stones' } },
        { label: 'Kingdom → Tech → Research Stone Weapons', check: { tech: 'stoneweapons' }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:stoneweapons' } },
        { label: 'Click the Weapon slot → Forge Stone', check: { gearTier: 'weapon', need: 1 }, focus: { tab: 'hero', sub: 'gear', el: 'gear:weapon' } },
      ], reward: { stone: 30 }, focus: { tab: 'hero', sub: 'gear', el: 'gear:weapon' } },
    { id: 'q13', name: 'Boss Hunter', text: 'Every tenth stage is a boss. The first time you beat one you get a Crown 👑 — Crowns buy the Crown Tree on the Skills tab, and they are forever. The Rat King guarded the Roads; now the Bandit Chief waits at Roads stage 10. From now on the hero screen warns you how much HP each fight costs.',
      steps: [
        { label: 'Where to fight → The Roads', check: { activity: 'fight', ground: 'roads' } },
        { label: 'Slay a boss you have never beaten', check: { counter: 'bossKills', need: 1, since: true } },
      ], reward: { gold: 60 }, focus: { tab: 'hero', sub: 'fight', el: 'ground:roads', el2: 'id:advance-btn' } },
    { id: 'q13x', name: 'Know Your Enemy', text: 'Every kill teaches your hero something. The Bestiary counts them: 10 of a kind makes it Familiar, 50 Studied, 200 Known, 1,000 Mastered — and each step means you hit it harder and it hits you softer. Your Stats card (DPS, crit, kills per second) is open now too.',
      steps: [ { label: 'Loot → open the Bestiary', check: { viewed: 'bestiary' } } ], reward: { gold: 40 }, focus: { tab: 'inventory', rtab: 'inventory', el: 'id:csub-best-btn' } },
    { id: 'q13a', name: 'Highwayman', text: 'Bandits carry the gold they stole. The Roads pay better the deeper you go.',
      steps: [
        { label: 'Fight on The Roads', check: { activity: 'fight', ground: 'roads' } },
        { label: 'Loot 250 gold from bandits', check: { looted: 'gold', need: 250, since: true } },
      ], reward: { gold: 60 }, focus: { tab: 'hero', sub: 'fight', el: 'ground:roads' } },
    { id: 'q14', name: 'To Market', text: 'Bandits carry coin — and so does everything you gather, once sold. Gold levels skills, buys buildings, and founds kingdoms. Refined goods are worth far more than raw — an ingot sells for ten times its ore.',
      steps: [
        { label: 'Market → sell anything for 50 gold in total', check: { sold: 50 } },
      ], reward: { gold: 50 }, focus: { tab: 'market', rtab: 'market', el: 'market' } },
    { id: 'q11', name: 'Pickaxe', text: 'A wooden pick is a poor thing, but it beats picking up pebbles — and stone is what better buildings need. Iron comes later, once you know what to look for.',
      steps: [
        { label: 'Click the Pickaxe slot → Make (10 wood)', check: { tool: 'pick' } },
        { label: 'Activity → Mine', check: { activity: 'mine' } },
        { label: 'Upgrade the pick to Lv 2 (Gear → Tools)', check: { toolLevel: 'pick', need: 2 } },
        { label: 'Quarry 30 stone with the pick', check: { harvested: 'stone', need: 30, since: true } },
      ], reward: { stone: 40 }, focus: { tab: 'hero', sub: 'gear', el: 'tool:pick', el2: 'act:mine' } },
    { id: 'q12b', name: 'Prospecting', text: 'Some of that rock glitters. Learn to tell ore from stone and every swing of the pick — and every Mine — starts turning up iron too.',
      steps: [
        { label: 'Kingdom → Tech → Research Prospecting', check: { tech: 'prospecting' }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:prospecting' } },
        { label: 'Activity → Mine: dig 15 iron ore', check: { harvested: 'ore', need: 15, since: true }, focus: { tab: 'hero', sub: 'fight', el: 'act:mine' } },
      ], reward: { ore: 20 } },
    { id: 'q13c', name: 'A Second Blow', text: 'Every boss gives a Crown, and every rank in the Crown Tree opens the nodes below it — deeper nodes cost more and hit harder. Techniques are your active moves — Power Strike is unlocked. Equip it and it fires by itself; tap it in a fight for a harder hit.',
      steps: [
        { label: 'Crown Tree → Sharpened Edge 3/3', check: { path: 'M0', need: 3 }, focus: { tab: 'hero', sub: 'skills', rtab: 'skills', el: 'path:M0' } },
        { label: 'Techniques → equip Power Strike', check: { skillEquipped: 'strike' }, focus: { tab: 'hero', sub: 'skills', rtab: 'skills', el: 'technique:strike' } },
        { label: 'Use Power Strike 5 times', check: { casts: 'strike', need: 5, since: true } },
      ], reward: { gold: 80 }, focus: { tab: 'hero', sub: 'skills', rtab: 'skills', el: 'technique:strike' } },
    { id: 'q13d', name: 'Armor Up', text: 'The dead hit harder than rats. Nobody walks into the Crypts in rags: take every piece of armor to Leather. Max a Fiber piece to Lv 9 and the Forge button turns it into Leather.',
      steps: [
        { label: 'Gear → Helm → make it, max Fiber to Lv 9, forge Leather', check: { gearTier: 'helm', need: 1 }, focus: { tab: 'hero', sub: 'gear', el: 'gear:helm' } },
        { label: 'Gear → Chest → make it, max Fiber to Lv 9, forge Leather', check: { gearTier: 'chest', need: 1 }, focus: { tab: 'hero', sub: 'gear', el: 'gear:chest' } },
        { label: 'Gear → Gloves → make it, max Fiber to Lv 9, forge Leather', check: { gearTier: 'gloves', need: 1 }, focus: { tab: 'hero', sub: 'gear', el: 'gear:gloves' } },
        { label: 'Gear → Boots → make it, max Fiber to Lv 9, forge Leather', check: { gearTier: 'boots', need: 1 }, focus: { tab: 'hero', sub: 'gear', el: 'gear:boots' } },
      ], reward: { hide: 20 }, focus: { tab: 'hero', sub: 'gear', el: 'gear:helm' } },
    { id: 'q13b', name: 'Grave Robber', text: 'The dead were buried with their coin — and their armor. Rusted iron can be melted down.',
      steps: [
        { label: 'Kingdom → Tech → Research Grave Robbing', check: { tech: 'graverobbing' } },
        { label: 'Fight in The Crypts', check: { activity: 'fight', ground: 'crypts' } },
        { label: 'Take 3 ingots from the dead', check: { looted: 'ingot', need: 3, since: true } },
      ], reward: { gold: 100 }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:graverobbing', el2: 'ground:crypts' } },
    { id: 'q16', name: 'Deeper', text: 'Back to the Wilds: the beasts grow fiercer the deeper you go, and every stage deeper is more hide and more experience. When fights get slow, upgrade your weapon — that is what the hide and stone are for.',
      steps: [
        { label: 'Where to fight → The Wilds', check: { activity: 'fight', ground: 'wilds' } },
        { label: 'Push 5 stages past your best', check: { counter: 'stage', need: 5, since: true } },
      ], reward: { gold: 200 }, focus: { tab: 'hero', sub: 'fight', el: 'act:fight', el2: 'id:advance-btn' } },
    { id: 'q16b', name: 'The Trophy Wall', text: 'Kill 1,000 of one kind and its head goes on your wall — Bronze first, then Silver, Gold, Platinum and Diamond. Every head is +2% loot and XP, for good.',
      steps: [ { label: 'Loot → open Trophies', check: { viewed: 'trophies' } } ], reward: { gold: 100 }, focus: { tab: 'inventory', rtab: 'inventory', el: 'id:csub-troph-btn' } },
    { id: 'q17', name: 'A New Kingdom', text: 'You have survived the wild alone. Pay the Empire its tribute of 100 gold and it grants you land. Your hero keeps everything he has earned — levels, skills and gear — but the goods in your pack stay behind. This is where the kingdom begins.',
      steps: [
        { label: 'Kingdom → Keep → Pay tribute (100 gold)', check: { founded: 1 } },
      ], reward: { gold: 100 }, focus: { tab: 'kingdom', ksub: 'throne', rtab: 'kingdom', el: 'id:found-btn' } },
    // ===== A Kingdom: after the first founding =====
    { id: 'k01', chain: 'A Kingdom', name: 'The First Camp', text: 'Kingdom → Production is your town: every building feeds the next, and they all work on their own. Open one to see how it runs.',
      steps: [ { label: 'Production → Logging → Enter', check: { viewed: 'bld:logging' } }, { label: 'Inside Logging → upgrade Grow to Lv 3', check: { partLv: 'logging:W', need: 3 } }, { label: 'Haul 60 wood to the Storehouse', check: { made: 'wood', need: 60, since: true } } ], reward: { gold: 60 }, focus: { tab: 'kingdom', ksub: 'prod', rtab: 'kingdom', el: 'step:logging' } },
    { id: 'k01b', chain: 'A Kingdom', name: 'Inside the Building', text: 'Every building works in three steps — at Logging they Grow, Fell and Haul. Goods pass through them one after another, and each step has its own level. The slowest step sets the pace: its bar turns gold and goods pile up in front of it. Upgrade that one.',
      steps: [ { label: 'Logging → upgrade the part with the gold bar, twice', check: { stat: 'limitUps:logging', need: 2, since: true } } ], reward: { gold: 80 }, focus: { tab: 'kingdom', ksub: 'prod', rtab: 'kingdom', el: 'step:logging' } },
    { id: 'k02', chain: 'A Kingdom', name: 'Imperial Orders', text: 'The Empire, the Guild and the villages post Orders at your Keep. They pay gold and Renown — no deadline, but a speed bonus.',
      steps: [ { label: 'Kingdom → Keep → Orders → Deliver one', check: { orders: 1, need: 1, since: true } } ], reward: { gold: 60 }, focus: { tab: 'kingdom', ksub: 'keep', rtab: 'kingdom', el: 'id:order-list' } },
    { id: 'c01', chain: 'A Kingdom', name: 'The Fields', text: 'A camp needs food as well as wood. Build the Farm.',
      steps: [ { label: 'Production → Farm → Build', check: { built: 'fields' } }, { label: 'Farm → upgrade its slowest part (the gold bar) 2 times', check: { stat: 'limitUps:fields', need: 2, since: true } } ], reward: { gold: 80 }, focus: { tab: 'kingdom', ksub: 'prod', rtab: 'kingdom', el: 'step:fields' } },
    { id: 'c02', chain: 'A Kingdom', name: 'Into the Hills', text: 'The hills hold iron. Build the Mine.',
      steps: [ { label: 'Production → Mine → Build', check: { built: 'shaft' } }, { label: 'Mine → upgrade its slowest part (the gold bar) 2 times', check: { stat: 'limitUps:shaft', need: 2, since: true } } ], reward: { gold: 100 }, focus: { tab: 'kingdom', ksub: 'prod', rtab: 'kingdom', el: 'step:shaft' } },
    { id: 'c04', chain: 'A Kingdom', name: 'Raise a Hamlet', text: 'The Toll Baron taxes the road to your camp — only the hero can clear it. And a Hamlet costs a payment in wood, grain and iron ore — the Keep shows exactly how much. Pay it in bit by bit; nothing is lost. It opens the refineries and the hero\'s halls.',
      steps: [ { label: 'Hero → The Roads → slay the Toll Baron (stage 20)', check: { bossKey: 'roads:20' }, focus: { tab: 'hero', sub: 'fight', el: 'ground:roads' } }, { label: 'Kingdom → Keep → Settlement → Contribute everything asked', check: { tierPaid: 1 } }, { label: 'Keep → Raise to Hamlet', check: { tier: 1 } } ], reward: { gold: 200 }, focus: { tab: 'kingdom', ksub: 'keep', rtab: 'kingdom', el: 'id:settle-card' } },
    { id: 'h01', chain: 'Hamlet', name: 'The Sawmill', text: 'Logging now feeds the Sawmill: 2 logs become 1 plank. Planks go on to the Carpenter, to become lumber.',
      steps: [ { label: 'Production → Sawmill → Build', check: { built: 'sawmill' } }, { label: 'Make 30 planks', check: { made: 'planks', need: 30, since: true } } ], reward: { gold: 200 }, focus: { tab: 'kingdom', ksub: 'prod', rtab: 'kingdom', el: 'step:sawmill' } },
    { id: 'h02', chain: 'Hamlet', name: 'The Mill', text: 'The Farm feeds the Mill: 2 grain become 1 flour.',
      steps: [ { label: 'Production → Mill → Build', check: { built: 'mill' } }, { label: 'Make 30 flour', check: { made: 'flour', need: 30, since: true } } ], reward: { gold: 200 }, focus: { tab: 'kingdom', ksub: 'prod', rtab: 'kingdom', el: 'step:mill' } },
    { id: 'h03', chain: 'Hamlet', name: 'The Forge', text: 'The Mine feeds the Forge: 2 ore become 1 ingot.',
      steps: [ { label: 'Production → Forge → Build', check: { built: 'smelter' } }, { label: 'Make 20 ingots', check: { made: 'ingot', need: 20, since: true } } ], reward: { gold: 250 }, focus: { tab: 'kingdom', ksub: 'prod', rtab: 'kingdom', el: 'step:smelter' } },
    { id: 'h03b', chain: 'Hamlet', name: 'Iron Secrets', text: 'Your Forge makes ingots — iron for the hero. Once the kingdom has made 50 ingots, the smiths can learn to forge Iron gear.',
      steps: [ { label: 'Make 30 more ingots', check: { made: 'ingot', need: 30, since: true } }, { label: 'Kingdom → Tech → Iron Gear → Research', check: { tech: 'irongear' } } ], reward: { gold: 300 }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:irongear' } },
    { id: 'h03c', chain: 'Hamlet', name: 'An Iron Blade', text: 'Stone has done its work. Max the Stone blade to Lv 9, then forge Iron: ingots from the Forge, hide from the Wilds or the Market. The Bone Lord waits in the Crypts.',
      steps: [ { label: 'Gear → Weapon → max Stone to Lv 9, then forge Iron', check: { gearTier: 'weapon', need: 2 } }, { label: 'Slay 100 enemies with the new blade', check: { counter: 'kills', need: 100, since: true } } ], reward: { gold: 400, talent: 1 }, focus: { tab: 'hero', sub: 'gear', el: 'gear:weapon' } },
    { id: 'h04', chain: 'Hamlet', name: 'The Hero\'s Halls', text: 'The city can make the hero stronger. The Training Yard speeds his levels; the Smithy makes gear cheaper.',
      steps: [ { label: 'Kingdom → Halls → Training Yard → Build', check: { hall: 'yard' } }, { label: 'Halls → Smithy → Build', check: { hall: 'smithy' } } ], reward: { gold: 300 }, focus: { tab: 'kingdom', ksub: 'halls', rtab: 'kingdom', el: 'hall:yard' } },
    { id: 'h05', chain: 'Hamlet', name: 'Room to Store', text: 'Goods that do not fit the Storehouse are sold off cheap. A bigger Storehouse holds more goods — and more gold.',
      steps: [ { label: 'Kingdom → Keep → Storehouse → Expand it once', check: { storeLv: 1, need: 1, since: true } } ], reward: { gold: 200 }, focus: { tab: 'kingdom', ksub: 'keep', rtab: 'kingdom', el: 'id:store-up' } },
    { id: 'h06', chain: 'Hamlet', name: 'The Slowest Link', text: 'Production shows your three chains side by side. In every chain one building is the slowest — it glows gold and holds back everything after it. Fix it.',
      steps: [ { label: 'Production → upgrade any part of a building marked "slowest"', check: { stat: 'slowUps', need: 1, since: true } } ], reward: { gold: 250 }, focus: { tab: 'kingdom', ksub: 'prod', rtab: 'kingdom', el: 'id:prod-grid' } },
    { id: 'h07', chain: 'Hamlet', name: 'Raise a Village', text: 'The Bone Lord stirs in the Crypts beside your fields — no Village will rise until the hero puts him down. A Village is paid in your best goods: planks, flour and ingots (the Keep shows how much). It opens the workshops and two more halls.',
      steps: [ { label: 'Hero → The Crypts → slay the Bone Lord (stage 10)', check: { bossKey: 'crypts:10' }, focus: { tab: 'hero', sub: 'fight', el: 'ground:crypts' } }, { label: 'Kingdom → Keep → Settlement → Contribute everything asked', check: { tierPaid: 2 } }, { label: 'Keep → Raise to Village', check: { tier: 2 } } ], reward: { gold: 400 }, focus: { tab: 'kingdom', ksub: 'keep', rtab: 'kingdom', el: 'id:settle-card' } },
    { id: 'v01', chain: 'Village', name: 'The Carpenter', text: 'Planks feed the Carpenter, which treats them into lumber — the builder\'s timber. Lumber raises your settlement, the Barracks and your halls, and one day it will be a third of every soldier.',
      steps: [ { label: 'Production → Carpenter → Build', check: { built: 'carpenter' } }, { label: 'Make 10 lumber', check: { made: 'lumber', need: 10 } } ], reward: { gold: 400 }, focus: { tab: 'kingdom', ksub: 'prod', rtab: 'kingdom', el: 'step:carpenter' } },
    { id: 'v01b', chain: 'Village', name: 'Seasoned Timber', text: 'The Carpenter is the slowest link in the Wood chain for now. Inside it, the step marked as the bottleneck holds the whole building back — raise it and more lumber flows.',
      steps: [ { label: 'Production → Carpenter → Enter', check: { viewed: 'bld:carpenter' } }, { label: 'Upgrade the Carpenter\'s bottleneck 3 times', check: { stat: 'limitUps:carpenter', need: 3, since: true } } ], reward: { gold: 400 }, focus: { tab: 'kingdom', ksub: 'prod', rtab: 'kingdom', el: 'step:carpenter' } },
    { id: 'v02', chain: 'Village', name: 'The Bakery', text: 'The Mill feeds the Bakery: armies march on bread.',
      steps: [ { label: 'Production → Bakery → Build', check: { built: 'baker' } }, { label: 'Bake 15 bread', check: { made: 'bread', need: 15, since: true } } ], reward: { gold: 400 }, focus: { tab: 'kingdom', ksub: 'prod', rtab: 'kingdom', el: 'step:baker' } },
    { id: 'v03', chain: 'Village', name: 'The Armory', text: 'The Forge feeds the Armory: ingots become arms for your future soldiers.',
      steps: [ { label: 'Production → Armory → Build', check: { built: 'forge' } }, { label: 'Make 10 arms', check: { made: 'swords', need: 10, since: true } } ], reward: { gold: 400 }, focus: { tab: 'kingdom', ksub: 'prod', rtab: 'kingdom', el: 'step:forge' } },
    { id: 'v03b', chain: 'Village', name: 'Iron Armor', text: 'The Cult Priest hits hard. Clad the hero in iron: max each Leather piece to Lv 9, then forge Iron. Ingots come from the Forge, hide from the Wilds or the Market — the Smithy in the Halls makes it all cheaper.',
      steps: [ { label: 'Gear → Helm → forge Iron', check: { gearTier: 'helm', need: 2 } }, { label: 'Gear → Chest → forge Iron', check: { gearTier: 'chest', need: 2 } }, { label: 'Gear → Gloves → forge Iron', check: { gearTier: 'gloves', need: 2 } },
        { label: 'Gear → Boots → forge Iron', check: { gearTier: 'boots', need: 2 } }, { label: 'Gear → Trinket → forge Iron', check: { gearTier: 'trinket', need: 2 } }, { label: 'Slay 150 enemies in your new armor', check: { counter: 'kills', need: 150, since: true } } ], reward: { gold: 800, talent: 1 }, focus: { tab: 'hero', sub: 'gear', el: 'gear:chest' } },
    { id: 'v04', chain: 'Village', name: 'Baron', text: 'Renown comes from Orders. At 200 Renown you become a Baron, and your Storehouse doubles.',
      steps: [ { label: 'Earn 200 Renown from Orders', check: { renown: 200 } }, { label: 'Deliver 3 more Orders', check: { orders: 1, need: 3, since: true } } ], reward: { gold: 300 }, focus: { tab: 'kingdom', ksub: 'keep', rtab: 'kingdom', el: 'id:order-list' } },
    { id: 'v05', chain: 'Village', name: 'Healers and Horses', text: 'The Apothecary heals the hero faster; the Stables make him strike faster.',
      steps: [ { label: 'Kingdom → Halls → Apothecary → Build', check: { hall: 'apothecary' } }, { label: 'Halls → Stables → Build', check: { hall: 'stables' } }, { label: 'Upgrade any of your Halls 3 times', check: { hallSum: 1, need: 3, since: true } } ], reward: { gold: 500 }, focus: { tab: 'kingdom', ksub: 'halls', rtab: 'kingdom', el: 'hall:apothecary' } },
    { id: 'v07', chain: 'Village', name: 'Raise a City', text: 'A cult gathers in the deep Crypts — a City will not rise under the Cult Priest\'s shadow. A City is paid in your finest goods: lumber, bread and arms (the Keep shows how much). The last stretch.',
      steps: [ { label: 'Hero → The Crypts → slay the Cult Priest (stage 20)', check: { bossKey: 'crypts:20' }, focus: { tab: 'hero', sub: 'fight', el: 'ground:crypts' } }, { label: 'Kingdom → Keep → Settlement → Contribute everything asked', check: { tierPaid: 3 } }, { label: 'Keep → Raise to City', check: { tier: 3 } } ], reward: { gold: 600 }, focus: { tab: 'kingdom', ksub: 'keep', rtab: 'kingdom', el: 'id:settle-card' } },
    { id: 'y00', chain: 'City', name: 'The Barracks', text: 'A soldier is 1 lumber, 1 arms and 1 bread — one from each chain. Build the Barracks, the tenth building, and your army begins before the kingdom does.',
      steps: [ { label: 'Production → Barracks → Build', check: { barracks: 1 } }, { label: 'Train 10 soldiers', check: { stat: 'trained', need: 10, since: true } } ], reward: { gold: 800 }, focus: { tab: 'kingdom', ksub: 'prod', rtab: 'kingdom', el: 'id:barracks-card' } },
    { id: 'y02', chain: 'City', name: 'An Army in Waiting', text: 'The Barracks trains on its own for as long as lumber, arms and bread keep coming. A bigger Barracks trains faster — build up the army so the first march has men behind it.',
      steps: [ { label: 'Have 40 soldiers', check: { have: 'soldiers', need: 40 } }, { label: 'Upgrade the Barracks to Lv 3', check: { barracks: 3 } } ], reward: { gold: 1000 }, focus: { tab: 'kingdom', ksub: 'prod', rtab: 'kingdom', el: 'id:barracks-card' } },
    { id: 'y01', chain: 'City', name: 'A Worthy Capital', text: 'A Capital needs strong foundations. Raise every part of every building to Lv 10. From there each building can open its next depth, which starts where the last one ended.',
      steps: [ { label: 'Every part of every building at Lv 10', check: { allLv: 10 } }, { label: 'Upgrade parts 10 more times', check: { bLvSum: 1, need: 10, since: true } } ], reward: { gold: 1000 }, focus: { tab: 'kingdom', ksub: 'prod', rtab: 'kingdom', el: 'id:prod-grid' } },
    { id: 'y04', chain: 'City', name: 'Proclaim the Kingdom', text: 'The City is complete. Proclaim the Kingdom: your City becomes the Capital — nothing is lost — and the conquest begins.',
      steps: [ { label: 'Kingdom → Keep → Proclaim the Kingdom', check: { proclaimed: 1 } } ], reward: { gold: 500 }, focus: { tab: 'kingdom', ksub: 'keep', rtab: 'kingdom', el: 'id:found-btn' } },
    { id: 'w02', chain: 'The Kingdom', name: 'March on Ashford', text: 'Conquest is a siege, and soldiers are its fuel. The army besieges each stage of a land and the ground falls as fast as your soldiers arrive — the stronger your hero, the more each soldier is worth. Every 10th stage is a fort: there the hero duels its captain himself. Choose Ashford Vale on the hero screen.',
      steps: [ { label: 'Hero → Where to fight → Ashford Vale', check: { landPct: 1, need: 1 } }, { label: 'Conquer 10% more of Ashford Vale', check: { landPct: 1, need: 10, since: true, orDone: true } } ], reward: { gold: 1000 }, focus: { tab: 'hero', sub: 'fight', el: 'ground:land1' } },
    { id: 'w03', chain: 'The Kingdom', name: 'A Garrison', text: 'A conquered land pays taxes — but only as much as its garrison can hold. Soldiers in a garrison do not march with the hero.',
      steps: [ { label: 'Kingdom → Lands → Ashford Vale → station 2 soldiers', check: { garrison: 1, need: 2 } }, { label: 'Earn 100 gold in taxes', check: { taxed: 100 } } ], reward: { gold: 1000 }, focus: { tab: 'kingdom', ksub: 'lands', rtab: 'kingdom', el: 'id:lands-card' } },
    { id: 'w01', chain: 'The Kingdom', name: 'Go Deeper', text: 'Taxes are flowing, and every building can keep growing. When all three of a building\'s parts reach Lv 10, it opens its next depth — the Mine digs deeper, the Farm plows a new field, the Forge builds a new furnace. The old one folds away and the new one starts where it ended, with ten more levels to fill.',
      steps: [ { label: 'Open a new depth in any building (all three parts at Lv 10)', check: { stat: 'digs', need: 1, since: true } }, { label: 'Upgrade parts 5 more times', check: { stat: 'partUps', need: 5, since: true } } ], reward: { gold: 5000 }, focus: { tab: 'kingdom', ksub: 'prod', rtab: 'kingdom', el: 'step:shaft' } },
    { id: 'w03b', chain: 'The Kingdom', name: 'The Fallen', text: 'Soldiers fall only while the siege is gaining ground, and each one takes foes (and their gold) with him. Every new soldier needs lumber, arms and bread — keep all three chains flowing and the front never stops.',
      steps: [ { label: 'Train 25 more soldiers', check: { stat: 'trained', need: 25, since: true } } ], reward: { gold: 1500 }, focus: { tab: 'kingdom', ksub: 'prod', rtab: 'kingdom', el: 'id:barracks-card' } },
    { id: 'w04', chain: 'The Kingdom', name: 'Baron Hollin', text: 'At the end of every land waits its Ruler. Beat him and take his crown — Crowns are the power of your dynasty.',
      steps: [ { label: 'Conquer Ashford Vale (defeat Baron Hollin, stage 50)', check: { landDone: 1 } }, { label: 'Earn 100 more gold in taxes', check: { taxed: 1, need: 100, since: true } } ], reward: { gold: 2000 }, focus: { tab: 'hero', sub: 'fight', el: 'ground:land1' } },
    { id: 'w04d', chain: 'The Kingdom', name: 'Timber for the Army', text: 'Every soldier takes a length of lumber — for shields, spears and camp. When the army grows, the Wood chain must grow with it.',
      steps: [ { label: 'Upgrade the Carpenter\'s bottleneck 3 more times', check: { stat: 'limitUps:carpenter', need: 3, since: true } }, { label: 'Train 25 more soldiers', check: { stat: 'trained', need: 25, since: true } } ], reward: { gold: 2000 }, focus: { tab: 'kingdom', ksub: 'prod', rtab: 'kingdom', el: 'step:carpenter' } },
    { id: 'w04c', chain: 'The Kingdom', name: 'The Endless Battle', text: 'Past the Ruler the fighting never ends. The Endless Battle never runs out of foes, and it is the one place the hero rests instead of retreating. Once a land is conquered, the hero marches on to the next by himself (untick it on the hero screen to stay and farm). While he is still conquering a land it pays at most half its taxes; once it is conquered it pays in full.',
      steps: [ { label: 'Win 50 fights in the Endless Battle', check: { stat: 'endlessKills', need: 50, since: true } } ], reward: { gold: 2500 }, focus: { tab: 'hero', sub: 'fight', el: 'ground:land1' } },
    { id: 'w04b', chain: 'The Kingdom', name: 'The Price of an Army', text: 'Soldiers fall at the Front, so the army is only as big as the Barracks can keep refilling it. Every soldier takes lumber, arms and bread — and each new land asks more of each. A bigger army needs a bigger Carpenter, Armory and Bakery.',
      steps: [ { label: 'Upgrade the Carpenter, Armory or Bakery 5 times', check: { stat: 'armsFoodUps', need: 5, since: true } }, { label: 'Train 50 more soldiers', check: { stat: 'trained', need: 50, since: true } } ], reward: { gold: 3000 }, focus: { tab: 'kingdom', ksub: 'prod', rtab: 'kingdom', el: 'id:barracks-card' } },
    { id: 'w05', chain: 'The Kingdom', name: 'The Iron Hills', text: 'Every land is harder than the last — and pays more than twice as much in taxes. The hills hold silver, the metal of Hardened gear: garrison them and it flows in every hour.',
      steps: [ { label: 'Conquer the Iron Hills', check: { landDone: 2 } } ], reward: { gold: 5000 }, focus: { tab: 'hero', sub: 'fight', el: 'ground:land2' } },
    { id: 'w05b', chain: 'The Kingdom', name: 'Pass the Crown', text: 'Two lands are yours, and the next ones only get harder. Time to think in dynasties. When you Pass the Crown your heir takes the throne: the lands, their taxes, the army and your stores are gone, and the hero starts again at level 1. Everything else stays: his gear, Paths and Techniques, the Capital and every building level, Wonders, the Crown Tree and trophies. Lands you have conquered before fall three times faster for the heir, and the Crowns you took from their rulers become yours to spend. Then spend your new Crowns in the Crown Tree (Skills → Crown Tree) — it lasts forever. After this, each Age runs to land 10, where the Emperor waits.',
      steps: [ { label: 'Kingdom → Keep → Pass the Crown', check: { stat: 'passed', need: 1 }, focus: { tab: 'kingdom', ksub: 'keep', rtab: 'kingdom', el: 'id:found-btn' } }, { label: 'Skills → Crown Tree → spend your new Crowns', check: { stat: 'perksBought', need: 1, since: true }, focus: { tab: 'hero', sub: 'skills', rtab: 'skills', el: 'path:M0' } } ], reward: { crystal: 20 }, focus: { tab: 'kingdom', ksub: 'keep', rtab: 'kingdom', el: 'id:found-btn' } },
    { id: 'w06', chain: 'The Kingdom', name: 'Blackwood March', text: 'Past the hills lies the old forest: heartwood for Hardened gear, and the first land your heir has never seen.',
      steps: [ { label: 'Conquer Blackwood March', check: { landDone: 3 } } ], reward: { gold: 20000 }, focus: { tab: 'hero', sub: 'fight', el: 'ground:land3' } },
  ],

  // ---------- Tech tree ----------
  // No research currency. Gate: `req` is a lifetime counter ({res: amount} from goods ever gained, or kills/bossKills/stage).
  // Cost: paid once. Unlocks: buildings, gear tiers, drops, or a bonus. Resets on founding (Blueprints perk pre-researches tiers).
  techTiers: ['Camp', 'Settlement', 'Ironworking', 'Artisan', 'Advanced'],
  techs: [
    // Tier 0 — Camp
    { id: 'skinning',   tier: 0, name: 'Skinning',         icon: [17,8],  req: { kills: 50 },            cost: { wood: 20, fiber: 15 },         unlocks: { drop: 'hide', tool: 'knife' }, desc: 'Lets you make a Skinning Knife. With one, beasts in the Wilds drop Hide — better knife, better chance.' },
    { id: 'fiberclothing', tier: 0, name: 'Fiber Clothing', icon: [7,9], req: { fiber: 10 }, cost: { fiber: 5 }, unlocks: { gearTier: 0, slots: ['chest', 'helm', 'gloves', 'boots', 'trinket'] }, desc: 'Twist plant fiber into clothes. Something between you and the wind.' },
    { id: 'woodensword',   tier: 0, name: 'Wooden Sword',   icon: [5,0], req: { wood: 10 },  cost: { wood: 5 },  unlocks: { gearTier: 0, slots: ['weapon'] },                  desc: 'A sharpened branch. Crafting a sword makes fighting much more efficient: it hits twice as hard as your fists.' },
    { id: 'stonetools', tier: 0, name: 'Woodcraft',        icon: [10,1],  req: { kills: 25 },            cost: { wood: 25 },                     unlocks: { toolTier: 0 },           desc: 'Carve wooden axes, picks, sickles and knives.' },
    { id: 'leatherwork',tier: 0, name: 'Leatherworking',   icon: [7,6],   req: { hide: 20 },             cost: { hide: 10, wood: 10 },           unlocks: { gearTier: 1, slots: ['chest', 'helm', 'gloves', 'boots', 'trinket'] }, desc: 'Forge Leather armor.' },
    { id: 'stoneweapons',tier: 0, name: 'Stone Weapons',    icon: [17,1],  req: { stone: 30 },            cost: { stone: 10, wood: 5 },           unlocks: { gearTier: 1, slots: ['weapon'] }, desc: 'Knap a stone edge onto a wooden haft. Weapons go Wood → Stone → Iron → Steel.' },
    // Tier 1 — Settlement
    { id: 'prospecting',tier: 1, name: 'Prospecting',      icon: [17,2],  req: { stone: 120 },           cost: { stone: 40, wood: 20 },          unlocks: { drop: 'ore' },           desc: 'Tell ore from rock. Mining — by pick or by Mine — now yields Iron Ore as well as stone.' },
    { id: 'graverobbing',tier: 1, name: 'Grave Robbing',    icon: [0,0],   req: { bossKills: 1 },         cost: { gold: 100 },                   unlocks: { drop: 'ingot' },         desc: 'Open the Crypts: the dead carry gold and rusted iron.' },
    // Tier 2 — Ironworking
    { id: 'irongear',   tier: 2, name: 'Iron Gear',        icon: [5,1],   req: { ingot: 50 },            cost: { gold: 400, ingot: 10 },        unlocks: { gearTier: 2 },           desc: 'Forge Iron gear.' },
    { id: 'irontools',  tier: 2, name: 'Iron Tools',       icon: [10,2],  req: { ingot: 20 },            cost: { gold: 200, ingot: 4 },         unlocks: { toolTier: 1 },           desc: 'Forge Iron axes, picks and sickles.' },
    // Tier 3 — Artisan
    { id: 'steelgear',  tier: 3, name: 'Steel Gear',       icon: [7,7],   req: { planks: 20 },           cost: { gold: 2000, planks: 5 },       unlocks: { gearTier: 3 },           desc: 'Forge Steel gear.' },
    { id: 'steeltools', tier: 3, name: 'Steel Tools',      icon: [10,1],  req: { planks: 10 },           cost: { gold: 1500, planks: 2 },       unlocks: { toolTier: 2 },           desc: 'Forge Steel tools.' },
    // Tier 4 — Advanced
    { id: 'hardening',  tier: 4, name: 'Hardening',        icon: [13,4],  req: { silver: 10 }, cost: { gold: 3000, silver: 5 },  unlocks: { gearTier: 4 },           desc: 'Forge Hardened gear from the silver of conquered hills — Hardened I, II, III… each tier far stronger than the last.' },
  ],

  buildingUpgrade: { base: { gold: 100 }, mult: 1.5, speedPerLevel: 0.08, batchEvery: 5 },

  automation: { autoAdvance: false, autoBuild: false, autoCraft: false },

  // ---------- Legacy: founding (prestige), paths, knowledge, thralls ----------
  legacy: {
    foundRequiresStage: 20,
    tribute: { gold: 100 },
    proclaimCrowns: 5,
    passKeep: 1,                               // 0.10.4: share of building, hall and Barracks levels kept when the crown passes (all of them)                         // 0.10.4: a flat gift when the Kingdom is proclaimed
    infoUnlock: { ledger: 'q04', surveyor: 'q06c', danger: 'q13', chronicler: 'q13x', almanac: 'k01' }, // 0.10.4: info that used to be Crown perks opens with these quests   // the first founding: pay tribute to the Empire
    foundCostGold: lvl => Math.round(1000 * Math.pow(2.5, lvl - 1)),  // gold only; the first founding is cheap so the kingdom opens early
    knowledge: s => s.foundings === 0 ? 1 : Math.floor(s.bestStage / 4) + Object.keys(s.bossesKilled).length * 2 + s.maxTier * 3 + Math.max(0, Math.floor(Math.log10((s.lifetimeGold || 0) + 1)) - 2),

    heroPaths: [
      { id: 'warrior', name: 'Warrior King', icon: [7,1], unlock: 1, desc: '+30% attack, +20% HP, +25% boss damage. Skill power −20%.',
        mods: { attackPct: 0.30, hpPct: 0.20, bossDmg: 0.25, skillPct: -0.20 } },
      { id: 'archmage', name: 'Archmage', icon: [6,8], unlock: 1, desc: '+50% skill power, −20% cooldowns, Intellect ×2. Basic attack −25%.',
        mods: { skillPct: 0.50, cdr: 0.20, attackPct: -0.25 }, intMult: 2 },
    ],
    kingdomPaths: [
      { id: 'benevolent', name: 'Benevolent Kingdom', icon: [1,0], unlock: 1, desc: 'Building upgrades −15% cost, buildings work 20% faster. Hero drops −15%.',
        costMult: 0.85, jobSpeed: 1.2, sellMult: 1, mods: { dropPct: -0.15 } },
      { id: 'empire', name: 'Iron Empire', icon: [3,7], unlock: 1, desc: 'Hero drops +30%, the Mine works 50% faster. Building upgrades +15% cost, sell prices −10%.',
        costMult: 1.15, jobSpeed: 1, sellMult: 0.9, outputMult: { mine: 1.5 }, mods: { dropPct: 0.30 } },
    ],

    // Permanent perks bought with Crystals. cost = base × costMult^rank.
    // 0.9: Crowns (formerly Crystals) buy perks in four trees
    trees: [ { id: 'bloodline', name: 'Bloodline', desc: 'The hero' }, { id: 'crown', name: 'Crown', desc: 'The city' }, { id: 'war', name: 'War', desc: 'The army' }, { id: 'realm', name: 'Realm', desc: 'The conquest' } ],
    perks: [], // 0.11.1: the Legacy perks now live in the Crown Tree (Skills → Crowns)
  },
};

// ---------- 0.9: lands of conquest, generated ----------
// Each land is a ground of 50 (lands 1–3) or 100 stages. Every 10th stage is a Captain; the last is the land's Ruler, who wears a crown.
(function () {
  const C = CONFIG, L = C.kingdom.lands;
  const ERAS = [ // enemy ladder: [from land, types]  ·  art = existing portraits
    [1,  [['militia', 'Militia', 'Militia', 'bandit'], ['guard', 'Border Guard', 'Border Guards', 'merc'], ['sellsword', 'Sellsword', 'Sellswords', 'raider'], ['spear', 'Spearman', 'Spearmen', 'merc'], ['raider2', 'Hill Raider', 'Hill Raiders', 'raider']]],
    [4,  [['knight2', 'Knight', 'Knights', 'knight'], ['lancer', 'Lancer', 'Lancers', 'merc'], ['archer', 'Archer', 'Archers', 'assassin'], ['menatarms', 'Man-at-Arms', 'Men-at-Arms', 'raider'], ['crossbow', 'Crossbowman', 'Crossbowmen', 'assassin'], ['warbeast', 'War Beast', 'War Beasts', 'bear'], ['templar', 'Templar', 'Templars', 'knight'], ['hussar', 'Hussar', 'Hussars', 'merc'], ['shield', 'Shieldwall', 'Shieldwalls', 'raider'], ['champion', 'Champion', 'Champions', 'knight']]],
    [9,  [['royal', 'Royal Guard', 'Royal Guards', 'knight'], ['siege', 'Siege Crew', 'Siege Crews', 'merc'], ['battlemage', 'Battle-Mage', 'Battle-Mages', 'shade'], ['paladin', 'Paladin', 'Paladins', 'knight'], ['duelist', 'Duelist', 'Duelists', 'assassin'], ['cataphract', 'Cataphract', 'Cataphracts', 'merc'], ['warlock', 'Warlock', 'Warlocks', 'shade'], ['sentinel', 'Sentinel', 'Sentinels', 'knight'], ['reaver', 'Reaver', 'Reavers', 'raider'], ['highguard', 'High Guard', 'High Guards', 'knight']]],
    [16, [['sorcerer', 'Sorcerer', 'Sorcerers', 'shade'], ['necro', 'Necromancer', 'Necromancers', 'shade'], ['revenant', 'Revenant', 'Revenants', 'skeleton'], ['ghast', 'Ghast', 'Ghasts', 'ghoul'], ['wraithlord', 'Wraith', 'Wraiths', 'wraith'], ['drake', 'Drake', 'Drakes', 'saber'], ['demon', 'Demon', 'Demons', 'shade'], ['lich2', 'Lich', 'Liches', 'skeleton'], ['wyrm', 'Wyrm', 'Wyrms', 'saber'], ['horror', 'Horror', 'Horrors', 'wraith']]],
  ];
  const NAMES = ['Ashford Vale', 'The Iron Hills', 'Blackwood March', 'Kingdom of Varn', 'The Horse Plains', 'Stonemere', 'The Salt Coast', 'Greywater', 'The Twin Crowns', 'Empire of the Coast',
    'The Gilded Reach', 'Highspire', 'The Sunken Throne', 'Emberfall', 'The Bronze Empire', 'The Fen Queendom', 'The Bone Marches', 'Dragon Peaks', 'The Hollow Realm', 'The Last Throne'];
  const RULERS = ['Baron Hollin', 'Warlord Grask', 'the Mercenary Lord', 'the Iron King', 'the Horse Khan', 'Duke Aldric', 'the Salt Admiral', 'Count Morvane', 'the Twin Queens', 'the Emperor of the Coast',
    'the Gilded Prince', 'the Spire Lord', 'the Drowned King', 'the Ember Tyrant', 'the Bronze Emperor', 'the Witch-Queen', 'the Bone King', 'the Dragon of Varn', 'the Hollow King', 'the Last King'];
  const CROWNS = ['the Reed Circlet', 'the Iron Band', 'the Sellsword Crown', 'the Iron Crown', 'the Horse-Tail Crown', 'the Stone Diadem', 'the Salt Crown', 'the Grey Circlet', 'the Twin Crowns', 'the Crown of the Coast',
    'the Gilded Crown', 'the Spire Crown', 'the Drowned Crown', 'the Ember Crown', 'the Bronze Crown', 'the Thorn Circlet', 'the Bone Crown', 'the Dragon Crown', 'the Hollow Crown', 'the Last Crown'];
  const TERRAIN = [['heartwood', 'forest'], ['silver', 'hills'], ['heartwood', 'forest'], ['silver', 'hills'], ['relic', 'holy site']];
  const ART = ['roads_a', 'roads_b', 'wilds_night', 'crypts_b', 'wilds_dusk'];
  let offset = L.offsetStart;
  for (let n = 1; n <= 10; n++) { // 0.11.1: ten lands per Age
    const stages = n <= L.shortLands ? L.shortStages : L.longStages, types = stages / 10, id = 'land' + n;
    const era = ERAS.filter(e => n >= e[0]).pop()[1], i0 = (n * 3) % era.length;
    const cycle = Math.floor((n - 1) / NAMES.length), sfx = cycle ? ' ' + (['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][cycle - 1] || (cycle + 1)) : '';
    const [spoil, terrain] = TERRAIN[(n - 1) % TERRAIN.length];
    const line = [];
    for (let t = 0; t < types; t++) {
      const [tid, nm, pl, art] = era[(i0 + t) % era.length], last = t === types - 1;
      line.push({ id: `${id}_${tid}_${t}`, art, name: nm, plural: pl, boss: last ? RULERS[(n - 1) % RULERS.length].replace(/^the /, 'The ') + sfx : nm + ' Captain',
        pool: [{ k: spoil, base: 0.01, growth: 0.004 }] });
    }
    C.grounds[id] = { name: NAMES[(n - 1) % NAMES.length] + sfx, land: n, stages, terrain, spoil, crown: CROWNS[(n - 1) % CROWNS.length] + sfx, ruler: RULERS[(n - 1) % RULERS.length] + sfx,
      icon: [5, 7], desc: `Land ${n} · ${terrain} · pays ${C.resources[spoil].name.toLowerCase()}.` + (() => { const e = Math.ceil(n / C.eras.size), T = C.eras.traits, tr = e <= 1 ? null : T[1 + (e - 2) % (T.length - 1)]; return (tr ? ` ${tr.icon} ${tr.name}: ${tr.desc}` : '') + (n % C.eras.size === 0 ? ' 👑 Its ruler is an Era Ruler — beat him to unlock a Wonder.' : ''); })(), goldMult: 1.5, req: { land: n }, reqText: n === 1 ? 'Proclaim the Kingdom' : `Conquer land ${n - 1}`, line };
    C.stages.groundOffset[id] = offset; offset += L.offsetStep;
    C.art.grounds[id] = `assets/enemies/${ART[(n - 1) % ART.length]}.webp`;
  }
})();
