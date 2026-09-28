// ============================================================
// ECONOMY CONFIG — three systems, one resource pool.
//   Character: attributes, 5 gear slots, skills, talents; fights stages
//   Kingdom:   buildings → wood, stone, iron, food (+ a little gold)
//   Crafting:  gear tiers/upgrades (hero), tools (kingdom)
// Everything tunable lives here. Placeholder names throughout.
// ============================================================

const CONFIG = {
  version: 'Alpha 0.9.12',
  tickMs: 100,
  maxCatchupSeconds: 5,
  autosaveMs: 10000,

  caps: { pack: 100, leatherPack: 150, store: 200, goldMult: 10 },
  offline: {
    capSeconds: 8 * 3600,
    efficiency: 0.10,   // idle runs at 10% of active speed (Long Memory perk adds +10% per rank)
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
    fiber:   { name: 'Plant Fiber', icon: [11,15], tier: 1, sell: 1, buy: 2,  desc: 'Pulled from plants, or foraged with a sickle. Clothing and rope.' },
    wood:    { name: 'Wood',     icon: [17,0],  tier: 1, sell: 1, buy: 5,  desc: 'Snapped from trees, or chopped with an axe. Tools, buildings, weapon hafts.' },
    hide:    { name: 'Hide',     icon: [17,8],  tier: 1, sell: 2, buy: 7,  desc: 'From beasts in the Wilds (with a Skinning Knife). Tannery turns 3 into Leather.' },
    stone:   { name: 'Stone',    icon: [17,1],  tier: 1, sell: 1, buy: 5,  desc: 'Picked up, or quarried with a pickaxe. Stone weapons, buildings.' },
    berries: { name: 'Berries',  icon: [14,4],  tier: 1, sell: 1, buy: 3,  desc: 'Foraged with a sickle. Food, and later potions.' },
    // Tier 2 — spoils and the forge
    gold:    { name: 'Gold',     icon: [12,7],  tier: 2, sell: 0,  desc: 'Coin. Buys plots, founds kingdoms, levels skills. Earned at the Market and from bandits on the Roads.' },
    ore:     { name: 'Iron Ore', icon: [17,2],  tier: 2, sell: 1, buy: 10,  desc: 'Mined once you know Prospecting. Blacksmith turns 5 into an Ingot.' },
    leather: { name: 'Leather',  icon: [8,2],   tier: 2, sell: 8, buy: 25,  desc: 'Tannery. Leather armor.' },
    ingot:   { name: 'Ingot',    icon: [17,3],  tier: 2, sell: 10, buy: 40, desc: 'Blacksmith. Iron gear and tools.' },
    meat:    { name: 'Meat',     icon: [15,1],  tier: 2, sell: 5, buy: 15,  desc: 'From beasts once you know Butchery, and from Husbandry. Sells well; feeds thralls one day.' },
    // Tier 3 — the settled kingdom
    grain:   { name: 'Grain',    icon: [14,13], tier: 3, sell: 1, buy: 4,  desc: 'From the Farm. Feeds Husbandry.' },
    wool:    { name: 'Wool',     icon: [17,5],  tier: 3, sell: 2, buy: 6,  desc: 'From Husbandry. Weaver turns 3 into Cloth.' },
    cloth:   { name: 'Cloth',    icon: [17,7],  tier: 3, sell: 8, buy: 25,  desc: 'Weaver. Fine armor tiers.' },
    planks:  { name: 'Planks',   icon: [19,11], tier: 3, sell: 12, buy: 40, desc: 'Sawmill turns 5 wood into a plank. Steel tools and gear.' },
    lumber:  { name: 'Treated Lumber', icon: [19,11], tier: 3, sell: 30, buy: 100, desc: 'Carpenter: 2 planks into 1 treated beam. Wanted by the Empire for forts and ships.' },
    flour:   { name: 'Flour',    icon: [15,10], tier: 3, sell: 4, buy: 12,  desc: 'Mill: 2 grain into 1 flour.' },
    bread:   { name: 'Bread',    icon: [14,14], tier: 3, sell: 12, buy: 40, desc: 'Baker: 2 flour into 1 loaf. Armies march on it.' },
    swords:  { name: 'Iron Swords', icon: [5,1], tier: 3, sell: 45, buy: 150, desc: 'Forge: 2 ingots into 1 sword. The Legion always needs more.' },
    // ---- Spoils of conquest (0.9): from the taxes of conquered lands ----
    heartwood: { name: 'Heartwood', icon: 'assets/res/wood.webp',  tier: 4, sell: 40, desc: 'Ancient timber from conquered forests. Hardened and Mythril gear.' },
    silver:    { name: 'Silver',    icon: 'assets/res/ingot.webp', tier: 4, sell: 60, desc: 'From conquered hills. Hardened and Mythril gear.' },
    relic:     { name: 'Relic',     icon: 'assets/res/gold.webp',  tier: 4, sell: 200, desc: 'Holy relics from conquered shrines. Wonders, later.' },
    // ---- The war chest (Phase 3): shown in the header after the Kingdom is proclaimed ----
    food:      { name: 'Food',      icon: 'assets/res/bread.webp',      kind: 'war', tier: 4, sell: 0, desc: 'Bread sent to the army. Soldiers are trained on it and eat it every minute.' },
    supplies:  { name: 'Supplies',  icon: 'assets/gear/weapon_t2.webp', kind: 'war', tier: 4, sell: 0, desc: 'Iron swords and treated lumber sent to the army. Soldiers are trained on them and wear them out.' },
    soldiers:  { name: 'Soldiers',  icon: 'assets/gear/helm_t2.webp',   kind: 'war', tier: 4, sell: 0, desc: 'Trained at the Barracks. The army marches with the hero and multiplies his power.' },
    bricks:  { name: 'Bricks',   icon: [13,4],  tier: 3, sell: 12, buy: 40, desc: 'Kiln turns 5 stone into a brick. Hardened gear, grand buildings.' },
    // ---- Loot (kind: 'loot'): dropped by enemies, shown in the Inventory, not in the header bar ----
    rattail:   { name: 'Rat Tail',        icon: [16,2],  kind: 'loot', rarity: 'common',   sell: 3,   desc: 'Proof of a rat well killed. Sells for a little.' },
    ratkingtooth: { name: "Rat King's Tooth", icon: [17,9], kind: 'loot', rarity: 'rare', sell: 60,  desc: 'Trophy from the Rat King. A crafting material for fine trinkets.' },
    tusk:      { name: 'Boar Tusk',       icon: [17,9],  kind: 'loot', rarity: 'uncommon', sell: 12,  desc: 'Curved ivory. Weapon hilts and trinkets.' },
    greatboartusk: { name: 'Great Tusk',  icon: [17,9],  kind: 'loot', rarity: 'rare',     sell: 90,  desc: 'Trophy from the Great Boar.' },
    wolfpelt:  { name: 'Wolf Pelt',       icon: [17,8],  kind: 'loot', rarity: 'uncommon', sell: 15,  desc: 'Thick winter pelt. Warm armor linings.' },
    alphafang: { name: 'Alpha Fang',      icon: [17,9],  kind: 'loot', rarity: 'rare',     sell: 120, desc: 'Trophy from the Alpha Wolf. Needed for Beast Mastery.' },
    bearclaw:  { name: 'Bear Claw',       icon: [8,0],   kind: 'loot', rarity: 'uncommon', sell: 20,  desc: 'A claw as long as a finger. Weapon studs.' },
    cavebearhide: { name: 'Cave Bear Hide', icon: [17,8], kind: 'loot', rarity: 'rare',    sell: 150, desc: 'Trophy from the Cave Bear. Hardened armor.' },
    saberfang: { name: 'Saber Fang',      icon: [17,9],  kind: 'loot', rarity: 'uncommon', sell: 30,  desc: 'Long curved fang. Blades.' },
    beastkingcrown: { name: "Beast King's Crown", icon: [12,7], kind: 'loot', rarity: 'rare', sell: 300, desc: 'Trophy from the Beast King.' },
    rope:      { name: 'Rope',            icon: [11,15], kind: 'loot', rarity: 'common',   sell: 4,   desc: 'Bandit rope. Buildings and traps.' },
    lockbox:   { name: 'Lockbox',         icon: [16,14], kind: 'loot', rarity: 'uncommon', sell: 40,  desc: 'A bandit strongbox. Sells for a tidy sum.' },
    banditseal: { name: "Chief's Seal",   icon: [13,11], kind: 'loot', rarity: 'rare',     sell: 200, desc: 'Trophy from the Bandit Chief.' },
    tollbaronring: { name: "Toll Baron's Ring", icon: [8,4], kind: 'loot', rarity: 'rare', sell: 350, desc: 'Trophy from the Toll Baron.' },
    bonedust:  { name: 'Bone Dust',       icon: [15,10], kind: 'loot', rarity: 'common',   sell: 3,   desc: 'What is left of the dead. Potions, one day.' },
    graveiron: { name: 'Grave Iron',      icon: [17,2],  kind: 'loot', rarity: 'uncommon', sell: 25,  desc: 'Rusted armor plate. Melts down to ingots.' },
    bonelordskull: { name: "Bone Lord's Skull", icon: [0,0], kind: 'loot', rarity: 'rare', sell: 250, desc: 'Trophy from the Bone Lord.' },
    cultidol:  { name: 'Cult Idol',       icon: [6,9],   kind: 'loot', rarity: 'rare',     sell: 400, desc: 'Trophy from the Cult Priest.' },
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
    cleaver: { name: "Butcher's Cleaver", icon: [3,0], base: 1, boosts: 'meat' },
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
    forage: { name: 'Forage',    icon: [11,15], tool: 'sickle', time: 4, outputs: { fiber: 1, berries: 1 }, desc: 'Gather fiber and berries. Needs a sickle.' },
  },
  harvestStrPct: 0.01, // +1% harvest speed per Strength point

  tiers: [
    { name: 'Crude', mult: 0.5, perSlot: { weapon: { name: 'Wooden', craftCost: { wood: 10 }, upgradeCost: { wood: 2 } }, chest: { name: 'Fiber', craftCost: { fiber: 10 }, upgradeCost: { fiber: 2 } }, gloves: { name: 'Fiber', craftCost: { fiber: 6 }, upgradeCost: { fiber: 2 } }, helm: { name: 'Fiber', craftCost: { fiber: 6 }, upgradeCost: { fiber: 2 } }, boots: { name: 'Fiber', craftCost: { fiber: 6 }, upgradeCost: { fiber: 2 } }, trinket: { name: 'Fiber', craftCost: { fiber: 4 }, upgradeCost: { fiber: 1 } } }, craftCost: { fiber: 10 }, upgradeCost: { fiber: 2 }, upgradeMult: 1.18 },
    { name: 'Leather',     mult: 1,   perSlot: { weapon: { name: 'Stone', craftCost: { stone: 12, wood: 6 }, upgradeCost: { stone: 4, wood: 2 } } }, craftCost: { hide: 8, fiber: 4 }, upgradeCost: { hide: 2, fiber: 1 }, upgradeMult: 1.25 },
    { name: 'Iron',        mult: 3,   craftCost: { ingot: 5, hide: 6, gold: 300 },            upgradeCost: { ingot: 2, hide: 1 },           upgradeMult: 1.25 },
    { name: 'Steel',       mult: 9,   craftCost: { ingot: 10, lumber: 3, gold: 1500 },   upgradeCost: { ingot: 4, lumber: 1 },              upgradeMult: 1.25 },
    { name: 'Hardened',    mult: 27,  craftCost: { ingot: 20, silver: 8, heartwood: 4, gold: 5000 },    upgradeCost: { ingot: 8, silver: 2 },   upgradeMult: 1.25 },
    { name: 'Mythril',     mult: 81,  craftCost: { ingot: 40, silver: 20, heartwood: 10, gold: 20000 }, upgradeCost: { ingot: 15, silver: 4, gold: 500 }, upgradeMult: 1.25 },
  ],
  // Per-slot cost scaling so armor pieces cost a bit different amounts
  slotCostMult: { weapon: 1, helm: 0.8, chest: 1.1, gloves: 0.8, boots: 0.7, trinket: 0.9 },

  // ---------- Disciplines & skill trees ----------
  // Each discipline levels by doing (kills → Combat XP, swings → gathering XP). Each level = 1 point for that tree.
  // A tree is drawn top-down; a node has 10 ranks (+`per` of its stat per rank) and unlocks when its parent is maxed.
  // Capstones (bottom row, 1 rank) cost a TALENT point — earned on the first kill of each enemy-type boss. Trees persist through founding.
  disciplines: {
    combat: { name: 'Combat',   icon: [5,1],  desc: 'Every kill gives Combat XP.' },
    wood:   { name: 'Logging',  icon: [10,1], desc: 'Every swing of the axe gives Logging XP.' },
    mine:   { name: 'Mining',   icon: [10,2], desc: 'Every swing of the pick gives Mining XP.' },
    forage: { name: 'Foraging', icon: [5,5],  desc: 'Every swing of the sickle gives Foraging XP.' },
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
      { id: 'yield',   name: 'Full Basket', icon: [11,15],row: 0, per: { harvestYield: 0.05 },  desc: '+5% fiber & berries per swing per rank' },
      { id: 'edge',    name: 'Light Step',  icon: [0,7],  row: 1, parent: 'swing', per: { harvestSpeed: 0.03 }, desc: '+3% foraging speed per rank' },
      { id: 'double',  name: 'Bounty',      icon: [14,4], row: 1, parent: 'yield', per: { harvestDouble: 0.02 }, desc: '+2% chance of a double swing per rank' },
      { id: 'herbalist', name: 'Herbalist', icon: [11,13],row: 2, parent: 'double', capstone: true, side: { berries: 0.5 }, desc: 'Capstone: half of swings yield extra berries' },
    ],
  },

  // ---------- Paths of War (passive). 3 branches × 13 nodes, every node has 10 ranks. Never reset (kept through Pass the Crown). ----------
  // Points: 1 per Combat level. ★ tokens: 1 per boss ever slain (first kill of each boss stage) + quest rewards.
  // A node opens when a connected node one tier closer to the centre is maxed (10/10). Notables and keystones cost 1 point + 1 ★ per rank.
  paths: {
    ranks: 10,
    branches: [ { id: 'M', name: 'Might', desc: 'attack · crit · bosses', color: '#d9604c' }, { id: 'G', name: 'Guard', desc: 'HP · armor · healing', color: '#6fa3d9' }, { id: 'C', name: 'Command', desc: 'army · gold · loot', color: '#7fd28f' } ],
    plan: [[1],[0,2],[0,1,2],[1],[0,2],[0,1,2],[1]], // tier → column positions (0..2) in each branch
    nodes: {
      M: [ ['Sharpened Edge', { attackPct: 0.06 }], ['Quick Hands', { speedPct: 0.0225 }], ['Keen Eye', { crit: 0.006 }], ['Heavy Blows', { attackPct: 0.06 }], ['Brutality', { critDmg: 0.06 }], ['Giant Slayer', { bossDmg: 0.06 }],
           ['Headhunter', { bossDmg: 0.075, attackPct: 0.015 }, 'notable'], ['Fury', { speedPct: 0.0225 }], ['Deadly Aim', { crit: 0.006 }], ['Weapon Master', { attackPct: 0.06 }], ['Savagery', { critDmg: 0.06 }], ["Tyrant's Bane", { bossDmg: 0.06 }],
           ['Berserker', { attackPct: 0.075, hpPct: -0.03 }, 'key'] ],
      G: [ ['Thick Skin', { hpPct: 0.075 }], ['Second Breath', { regenPct: 0.075 }], ['Iron Hide', { dr: 0.0075 }], ['Stout Heart', { hpPct: 0.06 }], ['Field Rations', { restSpeed: 0.075 }], ['Hardened', { dr: 0.0075 }],
           ['Bulwark', { hpPct: 0.075, dr: 0.0075 }, 'notable'], ['Vigor', { regenPct: 0.075 }], ['Endurance', { hpPct: 0.06 }], ['Stone Skin', { dr: 0.0075 }], ['Troll Blood', { regenPct: 0.075 }], ['Colossus', { hpPct: 0.06 }],
           ['Unbreakable', { hpPct: 0.09, dr: 0.015, speedPct: -0.015 }, 'key'] ],
      C: [ ['Plunderer', { goldPct: 0.045 }], ['Scavenger', { dropPct: 0.045 }], ['Tactics', { skillPct: 0.045 }], ['Drillmaster', { armyPct: 0.045 }], ["Veteran's Lessons", { xpPct: 0.03 }], ['Quick Study', { cdr: 0.006 }],
           ['Warlord', { armyPct: 0.075 }, 'notable'], ['Tax Man', { goldPct: 0.045 }], ['Battle Rhythm', { skillPct: 0.045 }], ['Banners', { armyPct: 0.045 }], ['Treasure Hunter', { dropPct: 0.045 }], ['Tactician', { cdr: 0.006 }],
           ['Conqueror', { armyPct: 0.12, attackPct: -0.015 }, 'key'] ],
    },
  },

  // ---------- Bestiary & trophies (kill counts per enemy type; persist through founding) ----------
  // Bestiary: the more you kill a type, the better you fight it — bonus = ×damage dealt and −damage taken vs that type.
  bestiary: { tiers: [ { kills: 10, name: 'Familiar', bonus: 0.02 }, { kills: 50, name: 'Studied', bonus: 0.05 }, { kills: 200, name: 'Known', bonus: 0.10 }, { kills: 1000, name: 'Mastered', bonus: 0.15 } ] },
  // Trophies: mounted heads for kill milestones. Each trophy owned = +lootPerTrophy loot and XP, permanently.
  trophies: { lootPerTrophy: 0.01, tiers: [ { kills: 1000, name: 'Wood', color: '#8a6a3a' }, { kills: 2000, name: 'Stone', color: '#9a9a9a' }, { kills: 5000, name: 'Bronze', color: '#c08040' }, { kills: 10000, name: 'Silver', color: '#d8dce0' }, { kills: 25000, name: 'Gold', color: '#e8c06a' } ] },

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
    // Loot from earlier types carries over at its stage-10 chance. `unique` drops once, on the first boss kill (+1 ★).
    // dropTool: the drop needs that tool and scales with it. Tech gating (Skinning → hide, Butchery → meat, Grave Robbing → ingot) applies by resource.
    wilds:  { name: 'The Wilds',  icon: [17,8],  desc: 'Beasts. Hide and meat — no gold.',              goldMult: 0, dropTool: { hide: 'knife', meat: 'cleaver' }, line: [
      { id: 'rat',   name: 'Rat',      plural: 'Rats',      boss: 'Rat King',    unique: 'ratkingtooth', pool: [{ k: 'hide', base: 0.10, growth: 0.05 }, { k: 'rattail', base: 0.00, growth: 0.03 }] },
      { id: 'boar',  name: 'Boar',     plural: 'Boars',     boss: 'Great Boar',  unique: 'greatboartusk', pool: [{ k: 'hide', base: 0.35, growth: 0.04 }, { k: 'meat', base: 0.25, growth: 0.04 }, { k: 'tusk', base: 0.03, growth: 0.03 }] },
      { id: 'wolf',  name: 'Wolf',     plural: 'Wolves',    boss: 'Alpha Wolf',  unique: 'alphafang',    pool: [{ k: 'hide', base: 0.45, growth: 0.04 }, { k: 'meat', base: 0.30, growth: 0.04 }, { k: 'wolfpelt', base: 0.03, growth: 0.03 }] },
      { id: 'bear',  name: 'Bear',     plural: 'Bears',     boss: 'Cave Bear',   unique: 'cavebearhide', pool: [{ k: 'hide', base: 0.55, growth: 0.05 }, { k: 'meat', base: 0.40, growth: 0.05 }, { k: 'bearclaw', base: 0.03, growth: 0.03 }] },
      { id: 'saber', name: 'Sabercat', plural: 'Sabercats', boss: 'Beast King',  unique: 'beastkingcrown', pool: [{ k: 'hide', base: 0.65, growth: 0.05 }, { k: 'meat', base: 0.45, growth: 0.05 }, { k: 'saberfang', base: 0.04, growth: 0.03 }] },
    ] },
    roads:  { name: 'The Roads',  icon: [5,7],   desc: 'Bandits. The only enemies that carry gold.',     goldMult: 1, req: { stage: 10 }, reqText: 'Slay the Rat King in the Wilds', line: [
      { id: 'cutpurse', name: 'Cutpurse',   plural: 'Cutpurses',   boss: 'Bandit Chief',       unique: 'banditseal',    pool: [{ k: 'fiber', base: 0.20, growth: 0.04 }, { k: 'rope', base: 0.05, growth: 0.03 }] },
      { id: 'bandit',   name: 'Bandit',     plural: 'Bandits',     boss: 'Toll Baron',         unique: 'tollbaronring', pool: [{ k: 'fiber', base: 0.40, growth: 0.04 }, { k: 'rope', base: 0.15, growth: 0.03 }, { k: 'lockbox', base: 0.01, growth: 0.01 }] },
      { id: 'merc',     name: 'Mercenary',  plural: 'Mercenaries', boss: 'Mercenary Captain',  unique: 'lockbox',       pool: [{ k: 'rope', base: 0.30, growth: 0.03 }, { k: 'lockbox', base: 0.03, growth: 0.02 }, { k: 'ingot', base: 0.02, growth: 0.01 }] },
      { id: 'raider',   name: 'Raider',     plural: 'Raiders',     boss: 'Raider Lord',        unique: 'lockbox',       pool: [{ k: 'rope', base: 0.40, growth: 0.03 }, { k: 'lockbox', base: 0.06, growth: 0.02 }, { k: 'ingot', base: 0.05, growth: 0.02 }] },
      { id: 'assassin', name: 'Assassin',   plural: 'Assassins',   boss: 'The Black Prince',   unique: 'lockbox',       pool: [{ k: 'lockbox', base: 0.10, growth: 0.03 }, { k: 'ingot', base: 0.08, growth: 0.02 }] },
    ] },
    crypts: { name: 'The Crypts', icon: [0,0],   desc: 'Undead. Grave gold, and old iron.',              goldMult: 1.6, req: { tech: 'graverobbing' }, reqText: 'Research Grave Robbing', line: [
      { id: 'skeleton', name: 'Skeleton',   plural: 'Skeletons',   boss: 'Bone Lord',    unique: 'bonelordskull', pool: [{ k: 'bonedust', base: 0.20, growth: 0.04 }, { k: 'ingot', base: 0.02, growth: 0.01 }, { k: 'graveiron', base: 0.02, growth: 0.02 }] },
      { id: 'ghoul',    name: 'Ghoul',      plural: 'Ghouls',      boss: 'Cult Priest',  unique: 'cultidol',      pool: [{ k: 'bonedust', base: 0.40, growth: 0.04 }, { k: 'ingot', base: 0.04, growth: 0.01 }, { k: 'graveiron', base: 0.05, growth: 0.02 }] },
      { id: 'wraith',   name: 'Wraith',     plural: 'Wraiths',     boss: 'Crypt Wight',  unique: 'cultidol',      pool: [{ k: 'bonedust', base: 0.50, growth: 0.04 }, { k: 'ingot', base: 0.06, growth: 0.02 }, { k: 'graveiron', base: 0.08, growth: 0.02 }] },
      { id: 'knight',   name: 'Bone Knight',plural: 'Bone Knights',boss: 'Lich',         unique: 'cultidol',      pool: [{ k: 'ingot', base: 0.10, growth: 0.02 }, { k: 'graveiron', base: 0.12, growth: 0.03 }] },
      { id: 'shade',    name: 'Shade',      plural: 'Shades',      boss: 'The Sleeper',  unique: 'cultidol',      pool: [{ k: 'ingot', base: 0.15, growth: 0.02 }, { k: 'graveiron', base: 0.15, growth: 0.03 }] },
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
      forest: { name: 'Forest', icon: [4,6], steps: [
        { id: 'logging',   name: 'Logging',    icon: [17,0],  make: 'wood',   base: 0.5, batch: 6,  tier: 0, build: null, desc: 'Thralls fell trees.' },
        { id: 'sawmill',   name: 'Sawmill',    icon: [19,11], make: 'planks', from: 'wood',   ratio: 2, base: 0.3, batch: 4,  tier: 1, build: { wood: 100, ore: 40, gold: 200 }, desc: '2 logs → 1 plank.' },
        { id: 'carpenter', name: 'Carpenter',  icon: [10,4],  make: 'lumber', from: 'planks', ratio: 2, base: 0.15, batch: 3, tier: 2, build: { planks: 120, ingot: 30, gold: 500 }, desc: '2 planks → 1 treated lumber.' } ] },
      farm: { name: 'Grain Farm', icon: [12,5], steps: [
        { id: 'fields', name: 'Fields', icon: [14,13], make: 'grain', base: 0.5, batch: 6,  tier: 0, build: { wood: 40, gold: 40 }, desc: 'Thralls sow and reap.' },
        { id: 'mill',   name: 'Mill',   icon: [15,10], make: 'flour', from: 'grain', ratio: 2, base: 0.3, batch: 4,  tier: 1, build: { wood: 80, grain: 100, gold: 200 }, desc: '2 grain → 1 flour.' },
        { id: 'baker',  name: 'Bakery',  icon: [14,14], make: 'bread', from: 'flour', ratio: 2, base: 0.15, batch: 3, tier: 2, build: { flour: 120, planks: 60, gold: 500 }, desc: '2 flour → 1 bread.' } ] },
      mine: { name: 'Iron Mine', icon: [4,5], steps: [
        { id: 'shaft',   name: 'Mine Shaft', icon: [17,2], make: 'ore',    base: 0.5, batch: 6,  tier: 0, build: { wood: 60, grain: 30, gold: 80 }, desc: 'Thralls dig iron ore.' },
        { id: 'smelter', name: 'Smelter',    icon: [17,3], make: 'ingot',  from: 'ore',   ratio: 2, base: 0.3, batch: 4,  tier: 1, build: { ore: 100, wood: 80, gold: 200 }, desc: '2 ore → 1 ingot.' },
        { id: 'forge',   name: 'Forge',      icon: [5,1],  make: 'swords', from: 'ingot', ratio: 2, base: 0.15, batch: 3, tier: 2, build: { ingot: 120, planks: 60, gold: 500 }, desc: '2 ingots → 1 iron sword.' } ] },
    },
    startGold: 50, foundRenown: 500, swapCooldown: 120,
    war: { thrallBonus: 10, supplyCapMult: 2, soldierCapBase: 50, soldierCapPerTier: 25, soldierGold: 2, quartermaster: { bread: 'food', swords: 'supplies', lumber: 'supplies' } },
    // ---- 0.9: buildings are one level each ----
    milestones: [10, 25, 50, 100, 200, 300, 400, 500],   // ×2 output at each
    lordship: 0.01,                                      // +1% production per hero level
    minLv: 10,                                           // a complete City: every building at this level
    // The army (0.9): the Barracks trains soldiers from Food + Supplies; soldiers eat every minute.
    army: { build: { lumber: 150, swords: 60, gold: 600 }, trainPerMin: 2, housingBase: 40, housingPer: 20, cost: { food: 1, supplies: 1 },
      foodUpkeep: 0.05, supplyUpkeep: 0.02, bonusDiv: 5, hpDiv: 400, costBase: 60, costExp: 1.6, desertPerMin: 0.02 },
    // Hero buildings in the city (0.9)
    halls: [
      { id: 'yard',       name: 'Training Yard', icon: 'assets/gear/weapon_t1.webp', tier: 1, build: { gold: 300, planks: 30 },  per: 0.10, effect: 'xpPct',    desc: 'Hero XP +10% per level' },
      { id: 'smithy',     name: 'Smithy',        icon: 'assets/gear/weapon_t2.webp', tier: 1, build: { gold: 400, ingot: 20 },   per: 0.03, effect: 'gearCost', desc: 'Gear and tool costs −3% per level (up to −60%)' },
      { id: 'apothecary', name: 'Apothecary',    icon: 'assets/res/berries.webp',    tier: 2, build: { gold: 800, flour: 60 },   per: 0.10, effect: 'regenPct', desc: 'Hero healing +10% per level' },
      { id: 'stables',    name: 'Stables',       icon: 'assets/gear/boots_t2.webp',  tier: 2, build: { gold: 800, lumber: 20 },  per: 0.03, effect: 'speedPct', desc: 'Hero attack speed +3% per level' },
    ],
    hallCost: { base: 100, exp: 1.7 },
    // Lands (0.9): conquered from the hero screen; taxes grow ×4 per land
    lands: { taxBase: 1000, taxGrowth: 4, garrisonPer: 10, cofferHours: 8, shortStages: 50, longStages: 100, shortLands: 3, offsetStart: 6, offsetStep: 3, spoilPerHour: 6, victoryLap: 3 },
    // Settlement tiers inside one land. Raising a tier costs `cap` of every good made so far (pay in as you go) and loses nothing.
    tiers: [
      { name: 'Camp',    cap: 300, slots: 1, thralls: 6,  lvCap: 25,  threat: 'roads:20',  need: 'Build Logging, the Fields and the Mine Shaft.' },
      { name: 'Hamlet',  cap: 600, slots: 2, thralls: 12, lvCap: 50,  threat: 'crypts:10', need: 'Build the Sawmill, the Mill and the Smelter.' },
      { name: 'Village', cap: 1000, slots: 3, thralls: 30, lvCap: 100, threat: 'crypts:20', need: 'Build the Carpenter, the Bakery and the Forge.' },
      { name: 'City',    cap: 800, slots: 3, thralls: 42, lvCap: 1e9, need: 'Raise every building to Lv 10.' },
    ],
    statPct: 0.05,                  // each point of a worker's Speed / Strength: 5% faster Work / Cart
    tierOrders: true,               // goods delivered in Orders also count toward the next settlement
    heroOrderChance: 0.3,           // once the kingdom makes 3+ goods, one Order at a time may still ask for the hero's goods
    accountantShare: 0.5, accountantReserve: 0.25,   // accountants sell a line's final good above 25% of cap, at half the Market price
    // A cycle: Work (batch ÷ rate) → Cart (loadBase) → Haul (haulBase). Every track level shortens its phase by trackGrowth (hyperbolic: never zero, never ends).
    trackGrowth: 0.12, loadBase: 6, haulBase: 12, autoSell: 0.25,
    thrallCapBase: 2, thrallXpDiv: 4, thrallLvBonus: 0.1,
    costBase: 60, costExp: 1.7, haulCostMult: 0.8,
    bufferCap: 200,                          // most input a refiner can hold waiting
    workerMilestones: [10, 25, 50],          // +1 worker slot at these step levels (highest track)
    extraWorker: 0.25,                       // each worker after the first: +25% rate
    starMult: [1, 1.5, 2.0, 2.5, 3.0, 3.5],  // Overseer multiplier by stars (index = stars)
    abilitySeconds: 30, abilityCooldown: 600,
    hirePrice: [0, 40, 120, 350, 900, 2200], offerRefresh: 300, refreshCost: 25,
    ranks: [ { name: 'Reeve', renown: 0, perk: 'Start' }, { name: 'Baron', renown: 500, perk: 'Storehouse ×2' }, { name: 'Count', renown: 2000, perk: '4★ thralls in the Tavern · bigger Orders' }, { name: 'Duke', renown: 6000, perk: '5★ thralls · the biggest Orders' } ],
    orderFrom: ['The Northern Legion', 'The Merchant Guild', 'The Village of Ashford', 'The Imperial Court', 'The Border Garrison'],
    orderBase: { wood: 40, grain: 40, ore: 30, planks: 20, flour: 20, ingot: 15, lumber: 10, bread: 10, swords: 6, hide: 25, meat: 15, stone: 40, fiber: 40, berries: 30 },
    heroOrderGoods: ['hide', 'meat', 'stone', 'fiber', 'berries'],   // when the kingdom makes fewer than 3 goods, Orders ask for what the hero gathers
    renownPer: { wood: 0.5, grain: 0.5, ore: 0.7, planks: 1.5, flour: 1.5, ingot: 2, lumber: 4, bread: 4, swords: 6, hide: 0.8, meat: 1, stone: 0.4, fiber: 0.4, berries: 0.4 },
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
    ['0.9.12', 'Rally is gone — the army already fights at the hero\'s side on its own. If you bought the War Cry perk, its Crowns are back.'],
    ['0.9.11', 'A second bar under the kills bar shows the countdown to auto-advance — and when it is paused, it says why (boss next, or the next stage is too tough and what to upgrade). The Rally button now shows what it does: your army strikes for the damage shown, 1 Supply per tap.'],
    ['0.9.10', 'The hero pushes on by himself: after 50 kills on a stage he advances — but only into a stage he can hold, and never into a boss (you choose those fights). No more resting mid-fight: he catches his breath after every kill instead. If a fight goes badly he retreats a stage and tells you what to upgrade. You can turn auto-advance off under the kills bar.'],
    { id: 'smith',     cat: 'craft',   name: 'Blacksmith',  icon: [4,4],  buildCost: { gold: 200, stone: 40, wood: 40 },   job: { time: 10, inputs: { ore: 5 },             outputs: { ingot: 1 } } },
    { id: 'tannery',   cat: 'craft',   name: 'Tannery',     icon: [8,2],  buildCost: { wood: 40, stone: 20, hide: 10 },              job: { time: 10, inputs: { hide: 3 },            outputs: { leather: 1 } } },
    ['0.9.9', 'Every quest now has something new to do when you reach it — no more instant claims. Screens and Skills views (Paths, Gathering, Techniques) unlock when a quest sends you there. Combat levels come much slower, but each Path point is worth 50% more (if you had spent more points than you now have, your Paths were reset to re-spend). Boss threats are part of the Raise quests, and raising the settlement or proclaiming waits for its quest.'],
    { id: 'weaver',    cat: 'craft',   name: 'Weaver',      icon: [17,6], buildCost: { gold: 150, wood: 40 },              job: { time: 10, inputs: { wool: 3 },            outputs: { cloth: 1 } } },
    ['0.9.8', 'Screens open as the story reaches them, left to right. Loot, the Bestiary and Trophies each unlock with a short quest — no Crown needed (if you bought the Bestiary, your Crown is back). Kingdom tabs are now in unlock order: Tech, Keep, Legacy, Halls, Lands. Your first Crown goes on The Ledger.'],
    ['0.9.7', 'The first quests ask a little more, and kill goals now count from when the quest starts — so a quest is never already finished when you reach it.'],
    ['0.9.6', 'Fixed: tapping an item in the Inventory crashed (thanks Monica!). Item details now list the city buildings, Quartermaster and Barracks correctly. Gathering shows when an item is full and stops popping +1 for things that can\'t be stored. Fixed gathering mastery speed.'],
    ['0.9.5', 'New skills. Paths: a passive web of 39 nodes in three branches (Might, Guard, Command) — every node has 10 ranks, points come from Combat levels and ★ from bosses, and nothing ever resets. Techniques: ten active moves unlocked by milestones, levelled by using them, with a mod to choose at Lv 5 and Lv 10. Your old Combat tree points are refunded — spend them in Paths!'],
    // Artisan
    { id: 'sawmill',   cat: 'artisan', name: 'Sawmill',     icon: [19,11], buildCost: { gold: 400, wood: 100, ingot: 5 },  job: { time: 20, inputs: { wood: 5 },            outputs: { planks: 1 } } },
    ['0.8.3', 'After proclaiming: +10 thrall room for the Barracks crew, the quest card points at the army instead of the City checklist, and the City card reads Capital.'],
    ['0.8.2', 'Fix: thralls stuck on old or unbuilt buildings (counted as busy, invisible) are freed when the game loads.'],
    ['0.8.1', 'City checklist now names each building that is missing a worker, Overseer or Accountant, and counts idle thralls. The Tavern says when you are at the thrall cap.'],
    ['0.8.0', 'Phase 3 begins: a complete City is now proclaimed as your Capital instead of being reset. The header becomes your war chest (Gold, Supplies, Equipment, Soldiers, Officers), Accountants become Quartermasters, and the Barracks musters soldiers. The Road to new lands comes next.'],
    { id: 'kiln',      cat: 'artisan', name: 'Kiln',        icon: [13,4],  buildCost: { gold: 400, stone: 100, ingot: 5 }, job: { time: 20, inputs: { stone: 5 },           outputs: { bricks: 1 } } },
  ],
  buildingCats: { gather: 'Gathering', craft: 'Crafting', artisan: 'Artisan' },

  // ---------- Quests ----------
  // A linear chain that doubles as the tutorial. `check` types: counter (lifetime goods/kills/etc), tech, tool, gear, plots, building,
  // jobs (jobs completed by hand or thrall), sold (gold earned at market), stage, boss, founded, thrall (assigned), activity (swings).
  // Shown in Settings → What's new (newest first). Keep each line short.
  changelog: [
    ['0.9.4', 'Gear and tool pop-ups are tidy: item info on top, Upgrade and Max side by side, Forge underneath, and buttons that can\'t do anything are hidden.'],
    ['0.9.3', 'The skill XP bar is taller so you can read the numbers.'],
    ['0.9.2', 'The ! on the top tabs is a clean round badge again.'],
    ['0.9.1', 'New quests take the hero\'s gear to Iron: research Iron Gear and forge an Iron blade in the Hamlet, then Iron armor in the Village before the Cult Priest.'],
    ['0.9.0', 'The big one. Buildings run on one level each — no more thralls, workers or Overseers — and double their output at Lv 10, 25, 50, 100. The hero clears a threat before each settlement can grow, and the city builds him Halls (Training Yard, Smithy, Apothecary, Stables). After you proclaim, the Barracks trains an army that eats Food and Supplies and multiplies the hero\'s power, and the hero leads the conquest from his own screen: lands of 50–100 stages, a Ruler with a crown at the end, garrisons and taxes. Crystals are now Crowns: take them from rulers, spend them in four trees, and Pass the Crown to start a stronger dynasty.'],
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
    { id: 'q01', chain: 'Settling In', name: 'Onward', text: 'Deeper stages have tougher enemies but drop more loot and experience — pushing is how you grow. If he starts losing, Retreat a stage and upgrade.',
      steps: [
        { label: 'Fight in The Wilds', check: { activity: 'fight', ground: 'wilds' } },
        { label: 'Slay 30 more enemies', check: { counter: 'kills', need: 30, since: true } },
        { label: 'Fill the kills bar and press Advance — reach stage 4', check: { stage: 4 } },
      ], reward: { wood: 20 }, focus: { tab: 'hero', sub: 'fight', el: 'id:advance-btn' } },
    { id: 'q02', name: 'Woodcraft', text: 'Tools open up the wild. Woodcraft is the first thing you can research: crude tools carved from wood.',
      steps: [
        { label: 'Slay 50 enemies', check: { counter: 'kills', need: 50, since: true } },
        { label: 'Have 25 wood (Trees box)', check: { have: 'wood', need: 25 } },
        { label: 'Kingdom → Tech → Research Woodcraft', check: { tech: 'stonetools' } },
      ], reward: { wood: 40 }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:stonetools' } },
    { id: 'q02b', name: 'Growing Stronger', text: 'Kills give Combat XP. Every Combat level grants a point for your Paths — the passive web on the Skills tab. Start at the centre; a node opens when the one before it is maxed. Paths are never reset, so every point is forever.',
      steps: [
        { label: 'Reach Combat level 2', check: { disc: 'combat', need: 2 } },
        { label: 'Skills → Paths → put a point in Sharpened Edge', check: { path: 'M0', need: 1 } },
      ], reward: { fiber: 15 }, focus: { tab: 'hero', sub: 'skills', rtab: 'skills', el: 'path:M0' } },
    { id: 'q03', name: 'An Axe of Your Own', text: 'You have wood enough for an axe, and the axe will cut the rest. Tools are the row under your armor on the Equipment panel — click a slot to make or upgrade it.',
      steps: [
        { label: 'Click the Axe slot on your Equipment → Make (Wooden)', check: { tool: 'axe' } },
      ], reward: { wood: 10 }, focus: { tab: 'hero', sub: 'gear', el: 'tool:axe' } },
    { id: 'q04', name: 'Timber', text: 'A hero does one thing at a time — fight, or work. He keeps working even when the game is closed.',
      steps: [
        { label: 'Activity → Chop Wood', check: { activity: 'wood' } },
        { label: 'Chop 50 wood with the axe', check: { harvested: 'wood', need: 50, since: true } },
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
    { id: 'q06c', name: 'Every Swing Counts', text: 'Gathering has trees too: Logging levels with every swing of the axe. Speed first — a faster axe is more of everything.',
      steps: [
        { label: 'Reach Logging level 2', check: { disc: 'wood', need: 2 } },
        { label: 'Skills → Logging → put a point in Swift Axe', check: { node: 'wood:swing', need: 1 } },
      ], reward: { wood: 30 }, focus: { tab: 'hero', sub: 'skills', rtab: 'skills', el: 'node:wood:swing' } },
    { id: 'q07', name: 'Stone Blade', text: 'Better gear means faster kills, just as better tools mean faster gathering. Stone is picked up by hand — open the By hand row and click Stones. Then learn Stone Weapons, upgrade the wooden sword to Lv15, then forge the Stone tier.',
      steps: [
        { label: 'Character → By hand → Stones: pick up 30 stone', check: { counter: 'stone', need: 30 }, focus: { tab: 'hero', sub: 'fight', el: 'hand:stones' } },
        { label: 'Kingdom → Tech → Research Stone Weapons', check: { tech: 'stoneweapons' }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:stoneweapons' } },
        { label: 'Click the Weapon slot → Forge Stone', check: { gearTier: 'weapon', need: 1 }, focus: { tab: 'hero', sub: 'gear', el: 'gear:weapon' } },
      ], reward: { stone: 30 }, focus: { tab: 'hero', sub: 'gear', el: 'gear:weapon' } },
    { id: 'q13', name: 'Boss Hunter', text: 'Every tenth stage is a boss. The first time you beat one you get a ★ boss token — the big notables and keystones in your Paths cost them — plus a trophy. The Rat King guarded the Roads; now the Bandit Chief waits at Roads stage 10.',
      steps: [
        { label: 'Where to fight → The Roads', check: { activity: 'fight', ground: 'roads' } },
        { label: 'Slay a boss you have never beaten', check: { counter: 'bossKills', need: 1, since: true } },
      ], reward: { gold: 60 }, focus: { tab: 'hero', sub: 'fight', el: 'ground:roads', el2: 'id:advance-btn' } },
    { id: 'q13x', name: 'Know Your Enemy', text: 'Every kill teaches your hero something. The Bestiary counts them: 10 of a kind makes it Familiar, 50 Studied, 200 Known, 1,000 Mastered — and each step means you hit it harder and it hits you softer.',
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
        { label: 'Quarry 60 stone with the pick', check: { harvested: 'stone', need: 60, since: true } },
      ], reward: { stone: 40 }, focus: { tab: 'hero', sub: 'gear', el: 'tool:pick', el2: 'act:mine' } },
    { id: 'q12b', name: 'Prospecting', text: 'Some of that rock glitters. Learn to tell ore from stone and every swing of the pick — and every Mine — starts turning up iron too.',
      steps: [
        { label: 'Kingdom → Tech → Research Prospecting', check: { tech: 'prospecting' }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:prospecting' } },
        { label: 'Activity → Mine: dig 30 iron ore', check: { harvested: 'ore', need: 30, since: true }, focus: { tab: 'hero', sub: 'fight', el: 'act:mine' } },
      ], reward: { ore: 20 } },
    { id: 'q13c', name: 'A Second Blow', text: 'Paths are slow and permanent: max a node and the ones past it open. Techniques are your active moves — Power Strike is unlocked. Equip it and it fires by itself; tap it in a fight for a harder hit.',
      steps: [
        { label: 'Paths → Sharpened Edge 3/10', check: { path: 'M0', need: 3 }, focus: { tab: 'hero', sub: 'skills', rtab: 'skills', el: 'path:M0' } },
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
    { id: 'q14b', name: 'Butcher', text: 'Beasts are meat as well as hide, if you have the blade for it. A better cleaver takes more meat per kill. Meat sells well — and your skills feed on it.',
      steps: [
        { label: 'Kingdom → Tech → Research Butchery', check: { tech: 'butchery' } },
        { label: "Gear → click the Butcher's Cleaver slot → Make (10 wood)", check: { tool: 'cleaver' }, focus: { tab: 'hero', sub: 'gear', el: 'tool:cleaver' } },
        { label: 'Fight in The Wilds', check: { activity: 'fight', ground: 'wilds' } },
        { label: 'Take 20 meat from boars or bigger beasts (rats have none)', check: { looted: 'meat', need: 20, since: true } },
      ], reward: { meat: 10 }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:butchery', el2: 'ground:wilds' } },
    { id: 'q16', name: 'Deeper', text: 'Every stage deeper is more loot and more experience. When fights get slow, upgrade your weapon — that is what the hide and stone are for.',
      steps: [
        { label: 'Push 5 stages past your best', check: { counter: 'stage', need: 5, since: true } },
      ], reward: { gold: 200 }, focus: { tab: 'hero', sub: 'fight', el: 'act:fight', el2: 'id:advance-btn' } },
    { id: 'q16b', name: 'The Trophy Wall', text: 'Kill 1,000 of one kind and its head goes on your wall — Wood, then Stone, Bronze, Silver and Gold. Every head is +1% loot and XP, for good.',
      steps: [ { label: 'Loot → open Trophies', check: { viewed: 'trophies' } } ], reward: { gold: 100 }, focus: { tab: 'inventory', rtab: 'inventory', el: 'id:csub-troph-btn' } },
    { id: 'q17', name: 'A New Kingdom', text: 'You have survived the wild alone. Pay tribute to the Empire — 100 gold and the Rat King\'s Tooth — and it grants you land. Your hero keeps everything he has earned — levels, skills and gear — but the goods in your pack stay behind. This is where the kingdom begins.',
      steps: [
        { label: 'Kingdom → Throne → Pay tribute (100 gold + Rat King\'s Tooth)', check: { founded: 1 } },
      ], reward: { gold: 100 }, focus: { tab: 'kingdom', ksub: 'throne', rtab: 'kingdom', el: 'id:found-btn' } },
    // ===== A Kingdom: after the first founding =====
    { id: 'p01', chain: 'A Kingdom', name: 'What Survives', text: 'Crowns are forever: Legacy perks survive every new dynasty. Spend your first Crown on The Ledger, so you always know what your hero and your city earn while you are away.',
      steps: [ { label: 'Kingdom → Legacy → buy The Ledger (1 Crown)', check: { perk: 'ledger' } } ], reward: { gold: 50 }, focus: { tab: 'kingdom', ksub: 'legacy', rtab: 'kingdom', el: 'perk:ledger' } },
    { id: 'k01', chain: 'A Kingdom', name: 'The First Camp', text: 'Buildings work on their own. Each level makes one faster — and every 10 levels it doubles and gets a new name.',
      steps: [ { label: 'Kingdom → Forest → Logging → Upgrade to Lv 3', check: { bLv: 'logging', need: 3 } }, { label: 'Haul 60 wood to the Storehouse', check: { made: 'wood', need: 60, since: true } } ], reward: { gold: 60 }, focus: { tab: 'kingdom', ksub: 'forest', rtab: 'kingdom', el: 'step:logging' } },
    { id: 'k02', chain: 'A Kingdom', name: 'Imperial Orders', text: 'The Empire, the Guild and the villages post Orders at your Keep. They pay gold and Renown — no deadline, but a speed bonus.',
      steps: [ { label: 'Kingdom → Keep → Orders → Deliver one', check: { orders: 1, need: 1, since: true } } ], reward: { gold: 60 }, focus: { tab: 'kingdom', ksub: 'keep', rtab: 'kingdom', el: 'id:order-list' } },
    { id: 'c01', chain: 'A Kingdom', name: 'The Fields', text: 'A camp needs food as well as wood.',
      steps: [ { label: 'Kingdom → Farm → Fields → Build', check: { built: 'fields' } }, { label: 'Fields → Upgrade it 2 more levels', check: { bLv: 'fields', need: 2, since: true } } ], reward: { gold: 80 }, focus: { tab: 'kingdom', ksub: 'farm', rtab: 'kingdom', el: 'step:fields' } },
    { id: 'c02', chain: 'A Kingdom', name: 'Into the Hills', text: 'The hills hold iron. Build the Mine Shaft.',
      steps: [ { label: 'Kingdom → Mine → Mine Shaft → Build', check: { built: 'shaft' } }, { label: 'Mine Shaft → Upgrade to Lv 3', check: { bLv: 'shaft', need: 3 } } ], reward: { gold: 100 }, focus: { tab: 'kingdom', ksub: 'mine', rtab: 'kingdom', el: 'step:shaft' } },
    { id: 'c04', chain: 'A Kingdom', name: 'Raise a Hamlet', text: 'The Toll Baron taxes the road to your camp — only the hero can clear it. And a Hamlet costs 200 of every good you make — pay it in bit by bit, nothing is lost. It opens the refineries and the hero\'s halls.',
      steps: [ { label: 'Hero → The Roads → slay the Toll Baron (stage 20)', check: { bossKey: 'roads:20' }, focus: { tab: 'hero', sub: 'fight', el: 'ground:roads' } }, { label: 'Kingdom → Keep → Settlement → Contribute everything asked', check: { tierPaid: 1 } }, { label: 'Keep → Raise to Hamlet', check: { tier: 1 } } ], reward: { gold: 200 }, focus: { tab: 'kingdom', ksub: 'keep', rtab: 'kingdom', el: 'id:settle-card' } },
    { id: 'h01', chain: 'Hamlet', name: 'The Sawmill', text: 'Logging now feeds the Sawmill: 2 wood become 1 plank.',
      steps: [ { label: 'Kingdom → Forest → Sawmill → Build', check: { built: 'sawmill' } }, { label: 'Make 30 planks', check: { made: 'planks', need: 30, since: true } } ], reward: { gold: 200 }, focus: { tab: 'kingdom', ksub: 'forest', rtab: 'kingdom', el: 'step:sawmill' } },
    { id: 'h02', chain: 'Hamlet', name: 'The Mill', text: 'Grain feeds the Mill: 2 grain become 1 flour.',
      steps: [ { label: 'Kingdom → Farm → Mill → Build', check: { built: 'mill' } }, { label: 'Make 30 flour', check: { made: 'flour', need: 30, since: true } } ], reward: { gold: 200 }, focus: { tab: 'kingdom', ksub: 'farm', rtab: 'kingdom', el: 'step:mill' } },
    { id: 'h03', chain: 'Hamlet', name: 'The Smelter', text: 'Ore feeds the Smelter: 2 ore become 1 ingot.',
      steps: [ { label: 'Kingdom → Mine → Smelter → Build', check: { built: 'smelter' } }, { label: 'Make 20 ingots', check: { made: 'ingot', need: 20, since: true } } ], reward: { gold: 250 }, focus: { tab: 'kingdom', ksub: 'mine', rtab: 'kingdom', el: 'step:smelter' } },
    { id: 'h03b', chain: 'Hamlet', name: 'Iron Secrets', text: 'Your Smelter makes ingots — iron for the hero. Once the kingdom has made 50 ingots, the smiths can learn to forge Iron gear.',
      steps: [ { label: 'Make 30 more ingots', check: { made: 'ingot', need: 30, since: true } }, { label: 'Kingdom → Tech → Iron Gear → Research', check: { tech: 'irongear' } } ], reward: { gold: 300 }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:irongear' } },
    { id: 'h03c', chain: 'Hamlet', name: 'An Iron Blade', text: 'Stone has done its work. Max the Stone blade to Lv 9, then forge Iron: ingots from the Smelter, hide from the Wilds or the Market. The Bone Lord waits in the Crypts.',
      steps: [ { label: 'Gear → Weapon → max Stone to Lv 9, then forge Iron', check: { gearTier: 'weapon', need: 2 } }, { label: 'Slay 100 enemies with the new blade', check: { counter: 'kills', need: 100, since: true } } ], reward: { gold: 400, talent: 1 }, focus: { tab: 'hero', sub: 'gear', el: 'gear:weapon' } },
    { id: 'h04', chain: 'Hamlet', name: 'The Hero\'s Halls', text: 'The city can make the hero stronger. The Training Yard speeds his levels; the Smithy makes gear cheaper.',
      steps: [ { label: 'Kingdom → Halls → Training Yard → Build', check: { hall: 'yard' } }, { label: 'Halls → Smithy → Build', check: { hall: 'smithy' } } ], reward: { gold: 300 }, focus: { tab: 'kingdom', ksub: 'halls', rtab: 'kingdom', el: 'hall:yard' } },
    { id: 'h05', chain: 'Hamlet', name: 'Room to Store', text: 'Goods that do not fit the Storehouse are sold off cheap. A bigger Storehouse holds more goods — and more gold.',
      steps: [ { label: 'Kingdom → Keep → Storehouse → Expand it once', check: { storeLv: 1, need: 1, since: true } } ], reward: { gold: 200 }, focus: { tab: 'kingdom', ksub: 'keep', rtab: 'kingdom', el: 'id:store-up' } },
    { id: 'h07', chain: 'Hamlet', name: 'Raise a Village', text: 'The Bone Lord stirs in the Crypts beside your fields — no Village will rise until the hero puts him down. A Village costs 350 of every good you make. It opens the workshops and two more halls.',
      steps: [ { label: 'Hero → The Crypts → slay the Bone Lord (stage 10)', check: { bossKey: 'crypts:10' }, focus: { tab: 'hero', sub: 'fight', el: 'ground:crypts' } }, { label: 'Kingdom → Keep → Settlement → Contribute everything asked', check: { tierPaid: 2 } }, { label: 'Keep → Raise to Village', check: { tier: 2 } } ], reward: { gold: 400 }, focus: { tab: 'kingdom', ksub: 'keep', rtab: 'kingdom', el: 'id:settle-card' } },
    { id: 'v01', chain: 'Village', name: 'The Carpenter', text: 'Planks feed the Carpenter: 2 planks become 1 treated lumber.',
      steps: [ { label: 'Kingdom → Forest → Carpenter → Build', check: { built: 'carpenter' } }, { label: 'Make 15 treated lumber', check: { made: 'lumber', need: 15, since: true } } ], reward: { gold: 400 }, focus: { tab: 'kingdom', ksub: 'forest', rtab: 'kingdom', el: 'step:carpenter' } },
    { id: 'v02', chain: 'Village', name: 'The Bakery', text: 'Flour feeds the Bakery: armies march on bread.',
      steps: [ { label: 'Kingdom → Farm → Bakery → Build', check: { built: 'baker' } }, { label: 'Bake 15 bread', check: { made: 'bread', need: 15, since: true } } ], reward: { gold: 400 }, focus: { tab: 'kingdom', ksub: 'farm', rtab: 'kingdom', el: 'step:baker' } },
    { id: 'v03', chain: 'Village', name: 'The Forge', text: 'Ingots feed the Forge: the army will need swords.',
      steps: [ { label: 'Kingdom → Mine → Forge → Build', check: { built: 'forge' } }, { label: 'Forge 10 iron swords', check: { made: 'swords', need: 10, since: true } } ], reward: { gold: 400 }, focus: { tab: 'kingdom', ksub: 'mine', rtab: 'kingdom', el: 'step:forge' } },
    { id: 'v03b', chain: 'Village', name: 'Iron Armor', text: 'The Cult Priest hits hard. Clad the hero in iron: max each Leather piece to Lv 9, then forge Iron. Ingots come from the Smelter, hide from the Wilds or the Market — the Smithy in the Halls makes it all cheaper.',
      steps: [ { label: 'Gear → Helm → forge Iron', check: { gearTier: 'helm', need: 2 } }, { label: 'Gear → Chest → forge Iron', check: { gearTier: 'chest', need: 2 } }, { label: 'Gear → Gloves → forge Iron', check: { gearTier: 'gloves', need: 2 } },
        { label: 'Gear → Boots → forge Iron', check: { gearTier: 'boots', need: 2 } }, { label: 'Gear → Trinket → forge Iron', check: { gearTier: 'trinket', need: 2 } }, { label: 'Slay 150 enemies in your new armor', check: { counter: 'kills', need: 150, since: true } } ], reward: { gold: 800, talent: 1 }, focus: { tab: 'hero', sub: 'gear', el: 'gear:chest' } },
    { id: 'v04', chain: 'Village', name: 'Baron', text: 'Renown comes from Orders. At 500 Renown you become a Baron, and your Storehouse doubles.',
      steps: [ { label: 'Earn 500 Renown from Orders', check: { renown: 500 } }, { label: 'Deliver 3 more Orders', check: { orders: 1, need: 3, since: true } } ], reward: { gold: 300 }, focus: { tab: 'kingdom', ksub: 'keep', rtab: 'kingdom', el: 'id:order-list' } },
    { id: 'v05', chain: 'Village', name: 'Healers and Horses', text: 'The Apothecary heals the hero faster; the Stables make him strike faster.',
      steps: [ { label: 'Kingdom → Halls → Apothecary → Build', check: { hall: 'apothecary' } }, { label: 'Halls → Stables → Build', check: { hall: 'stables' } }, { label: 'Upgrade any of your Halls 3 times', check: { hallSum: 1, need: 3, since: true } } ], reward: { gold: 500 }, focus: { tab: 'kingdom', ksub: 'halls', rtab: 'kingdom', el: 'hall:apothecary' } },
    { id: 'v07', chain: 'Village', name: 'Raise a City', text: 'A cult gathers in the deep Crypts — a City will not rise under the Cult Priest\'s shadow. A City costs 500 of every good you make. The last stretch.',
      steps: [ { label: 'Hero → The Crypts → slay the Cult Priest (stage 20)', check: { bossKey: 'crypts:20' }, focus: { tab: 'hero', sub: 'fight', el: 'ground:crypts' } }, { label: 'Kingdom → Keep → Settlement → Contribute everything asked', check: { tierPaid: 3 } }, { label: 'Keep → Raise to City', check: { tier: 3 } } ], reward: { gold: 600 }, focus: { tab: 'kingdom', ksub: 'keep', rtab: 'kingdom', el: 'id:settle-card' } },
    { id: 'y01', chain: 'City', name: 'A Worthy Capital', text: 'A Capital needs strong foundations. Raise every building to Lv 10 — each doubles when it gets there.',
      steps: [ { label: 'Every building at Lv 10', check: { allLv: 10 } }, { label: 'Upgrade buildings 10 more times', check: { bLvSum: 1, need: 10, since: true } } ], reward: { gold: 1000 }, focus: { tab: 'kingdom', ksub: 'keep', rtab: 'kingdom', el: 'id:settle-card' } },
    { id: 'y04', chain: 'City', name: 'Proclaim the Kingdom', text: 'The City is complete. Proclaim the Kingdom: your City becomes the Capital — nothing is lost — and the conquest begins.',
      steps: [ { label: 'Kingdom → Keep → Proclaim the Kingdom', check: { proclaimed: 1 } } ], reward: { gold: 500 }, focus: { tab: 'kingdom', ksub: 'keep', rtab: 'kingdom', el: 'id:found-btn' } },
    { id: 'w01', chain: 'The Kingdom', name: 'The Barracks', text: 'An army is trained, not bought. The Barracks turns Food (bread) and Supplies (swords, treated lumber) into soldiers — and soldiers eat every minute.',
      steps: [ { label: 'Kingdom → Barracks → Build', check: { barracks: 1 } }, { label: 'Train 20 soldiers', check: { have: 'soldiers', need: 20 } } ], reward: { gold: 800 }, focus: { tab: 'kingdom', ksub: 'war', rtab: 'kingdom', el: 'id:army-card' } },
    { id: 'w02', chain: 'The Kingdom', name: 'March on Ashford', text: 'The hero leads the conquest. The army marches with him and multiplies every blow. Choose Ashford Vale on the hero screen.',
      steps: [ { label: 'Hero → Where to fight → Ashford Vale', check: { landPct: 1, need: 1 } }, { label: 'Conquer 10% more of Ashford Vale', check: { landPct: 1, need: 10, since: true } } ], reward: { gold: 1000 }, focus: { tab: 'hero', sub: 'fight', el: 'ground:land1' } },
    { id: 'w03', chain: 'The Kingdom', name: 'A Garrison', text: 'A conquered land pays taxes — but only as much as its garrison can hold. Soldiers in a garrison do not march with the hero.',
      steps: [ { label: 'Kingdom → Lands → Ashford Vale → station 10 soldiers', check: { garrison: 1, need: 10 } }, { label: 'Collect 100 gold of taxes', check: { taxed: 100 } } ], reward: { gold: 1000 }, focus: { tab: 'kingdom', ksub: 'lands', rtab: 'kingdom', el: 'id:lands-card' } },
    { id: 'w04', chain: 'The Kingdom', name: 'Baron Hollin', text: 'At the end of every land waits its Ruler. Beat him and take his crown — Crowns are the power of your dynasty.',
      steps: [ { label: 'Conquer Ashford Vale (defeat Baron Hollin, stage 50)', check: { landDone: 1 } }, { label: 'Collect 100 more gold in taxes', check: { taxed: 1, need: 100, since: true } } ], reward: { gold: 2000 }, focus: { tab: 'hero', sub: 'fight', el: 'ground:land1' } },
    { id: 'w05', chain: 'The Kingdom', name: 'Blackwood March', text: 'Every land is harder than the last — and pays about four times more.',
      steps: [ { label: 'Conquer Blackwood March', check: { landDone: 2 } } ], reward: { gold: 5000 }, focus: { tab: 'hero', sub: 'fight', el: 'ground:land2' } },
    { id: 'w06', chain: 'The Kingdom', name: 'The Iron Hills', text: 'The hills hold silver — the metal of Hardened gear.',
      steps: [ { label: 'Conquer the Iron Hills', check: { landDone: 3 } } ], reward: { gold: 20000 }, focus: { tab: 'hero', sub: 'fight', el: 'ground:land3' } },
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
    { id: 'butchery',   tier: 1, name: 'Butchery',         icon: [15,1],  req: { kills: 100 },           cost: { hide: 10, wood: 10 },          unlocks: { drop: 'meat', tool: 'cleaver' }, desc: "Lets you make a Butcher's Cleaver. With one, beasts in the Wilds drop Meat — better cleaver, better chance." },
    { id: 'graverobbing',tier: 1, name: 'Grave Robbing',    icon: [0,0],   req: { bossKills: 1 },         cost: { gold: 100 },                   unlocks: { drop: 'ingot' },         desc: 'Open the Crypts: the dead carry gold and rusted iron.' },
    // Tier 2 — Ironworking
    { id: 'irongear',   tier: 2, name: 'Iron Gear',        icon: [5,1],   req: { ingot: 50 },            cost: { gold: 400, ingot: 10 },        unlocks: { gearTier: 2 },           desc: 'Forge Iron gear.' },
    { id: 'irontools',  tier: 2, name: 'Iron Tools',       icon: [10,2],  req: { ingot: 20 },            cost: { gold: 200, ingot: 4 },         unlocks: { toolTier: 1 },           desc: 'Forge Iron axes, picks and sickles.' },
    // Tier 3 — Artisan
    { id: 'steelgear',  tier: 3, name: 'Steel Gear',       icon: [7,7],   req: { planks: 20 },           cost: { gold: 2000, planks: 5 },       unlocks: { gearTier: 3 },           desc: 'Forge Steel gear.' },
    { id: 'steeltools', tier: 3, name: 'Steel Tools',      icon: [10,1],  req: { planks: 10 },           cost: { gold: 1500, planks: 2 },       unlocks: { toolTier: 2 },           desc: 'Forge Steel tools.' },
    // Tier 4 — Advanced
    { id: 'hardening',  tier: 4, name: 'Hardening',        icon: [13,4],  req: { silver: 20 }, cost: { gold: 5000, silver: 10 },  unlocks: { gearTier: 4 },           desc: 'Forge Hardened gear from the silver of conquered hills.' },
    { id: 'mythril',    tier: 4, name: 'Mythril Secrets',  icon: [12,15], req: { silver: 100, heartwood: 50 }, cost: { gold: 20000, silver: 40 },     unlocks: { gearTier: 5 },           desc: 'Forge Mythril gear.' },
  ],

  buildingUpgrade: { base: { gold: 100 }, mult: 1.5, speedPerLevel: 0.08, batchEvery: 5 },

  automation: { autoAdvance: false, autoBuild: false, autoCraft: false },

  // ---------- Legacy: founding (prestige), paths, knowledge, thralls ----------
  legacy: {
    foundRequiresStage: 20,
    tribute: { gold: 100, ratkingtooth: 1 },   // the first founding: pay tribute to the Empire
    foundCostGold: lvl => Math.round(1000 * Math.pow(2.5, lvl - 1)),  // gold only; the first founding is cheap so the kingdom opens early
    knowledge: s => s.foundings === 0 ? 1 : Math.floor(s.bestStage / 4) + Object.keys(s.bossesKilled).length * 2 + s.maxTier * 3 + Math.max(0, Math.floor(Math.log10((s.lifetimeGold || 0) + 1)) - 2),

    heroPaths: [
      { id: 'warrior', name: 'Warrior King', icon: [7,1], unlock: 1, desc: '+30% attack, +20% HP, +25% boss damage. Skill power −20%.',
        mods: { attackPct: 0.30, hpPct: 0.20, bossDmg: 0.25, skillPct: -0.20 } },
      { id: 'archmage', name: 'Archmage', icon: [6,8], unlock: 1, desc: '+50% skill power, −20% cooldowns, Intellect ×2. Basic attack −25%.',
        mods: { skillPct: 0.50, cdr: 0.20, attackPct: -0.25 }, intMult: 2 },
      { id: 'ranger', name: 'Ranger Lord', icon: [6,3], unlock: 4, desc: '+25% attack speed, +20% crit, +25% drops. −15% HP.',
        mods: { speedPct: 0.25, crit: 0.20, dropPct: 0.25, hpPct: -0.15 } },
    ],
    kingdomPaths: [
      { id: 'benevolent', name: 'Benevolent Kingdom', icon: [1,0], unlock: 1, desc: 'Buildings −15% cost, jobs 20% faster. Hero drops −15%.',
        costMult: 0.85, jobSpeed: 1.2, sellMult: 1, mods: { dropPct: -0.15 } },
      { id: 'empire', name: 'Iron Empire', icon: [3,7], unlock: 1, desc: 'Hero drops +30%, mines yield +50%. Buildings +15% cost, sell prices −10%.',
        costMult: 1.15, jobSpeed: 1, sellMult: 0.9, outputMult: { mine: 1.5 }, mods: { dropPct: 0.30 } },
      { id: 'merchant', name: 'Merchant Republic', icon: [12,10], unlock: 4, desc: 'Sell prices +40%, respec free. Hero attack −10%.',
        costMult: 1, jobSpeed: 1, sellMult: 1.4, mods: { attackPct: -0.10 }, freeRespec: true },
    ],

    // Permanent perks bought with Crystals. cost = base × costMult^rank.
    // 0.9: Crowns (formerly Crystals) buy perks in four trees
    trees: [ { id: 'bloodline', name: 'Bloodline', desc: 'The hero' }, { id: 'crown', name: 'Crown', desc: 'The city' }, { id: 'war', name: 'War', desc: 'The army' }, { id: 'realm', name: 'Realm', desc: 'The conquest' } ],
    perks: [
      { id: 'bloodline', tree: 'bloodline', name: 'Bloodline',       icon: [1,0],  max: 10, cost: 3,  costMult: 1.5, desc: '+5% attack, HP and healing per rank' },
      { id: 'veteran',   tree: 'bloodline', name: 'Veteran',         icon: [1,4],  max: 3,  cost: 8,  costMult: 2,   desc: '+3 Path points per rank' },
      { id: 'heirloom',  tree: 'bloodline', name: 'Heirloom Arms',   icon: [5,1],  max: 3,  cost: 10, costMult: 2.2, desc: 'A new dynasty starts with gear one tier better per rank (Wooden → Stone → Iron)' },
      { id: 'oldblade',  tree: 'bloodline', name: 'Old Blade',       icon: [5,1],  max: 1,  cost: 20, costMult: 1,   desc: 'Keep your weapon when you pass the crown' },
      { id: 'cache',     tree: 'crown',     name: "Founder's Cache", icon: [11,11], max: 5, cost: 4,  costMult: 1.6, desc: 'Begin each dynasty with 1,000 gold per rank' },
      { id: 'blueprints',tree: 'crown',     name: 'Blueprints',      icon: [13,12], max: 3, cost: 6,  costMult: 1.8, desc: 'Every building starts 5 levels higher per rank' },
      { id: 'charter',   tree: 'war',       name: 'Full Granaries',  icon: [14,14], max: 3, cost: 6,  costMult: 2,   desc: 'Begin each dynasty with 500 Food and 500 Supplies per rank' },
      { id: 'cellar',    tree: 'crown',     name: 'Deep Cellar',     icon: [19,9], max: 4,  cost: 5,  costMult: 1.7, desc: 'AFK cap +2h per rank' },
      { id: 'memory',    tree: 'crown',     name: 'Long Memory',     icon: [13,8], max: 3,  cost: 6,  costMult: 1.8, desc: 'AFK efficiency +10% per rank' },
      { id: 'haggler',   tree: 'crown',     name: 'Haggler',         icon: [12,10], max: 5, cost: 4,  costMult: 1.7, desc: 'Sell prices +10% per rank' },
      { id: 'drill',     tree: 'war',       name: 'Drill Sergeants', icon: [1,4],  max: 5,  cost: 4,  costMult: 1.7, desc: 'Barracks train 20% faster per rank' },
      { id: 'rations',   tree: 'war',       name: 'Rations',         icon: [14,14], max: 5, cost: 5,  costMult: 1.7, desc: 'Soldiers eat 10% less per rank' },
      { id: 'standing',  tree: 'war',       name: 'Standing Army',   icon: [7,1],  max: 3,  cost: 8,  costMult: 2,   desc: 'Begin each dynasty with 25 soldiers per rank' },
      { id: 'tax',       tree: 'realm',     name: 'Tax Collectors',  icon: [12,7], max: 10, cost: 3,  costMult: 1.5, desc: '+25% taxes per rank' },
      { id: 'autocollect', tree: 'realm',   name: 'Stewards',        icon: [13,11], max: 1, cost: 15, costMult: 1,   desc: 'Taxes flow in by themselves — no need to Collect' },
      { id: 'spoils',    tree: 'realm',     name: 'Plunder',         icon: [12,15], max: 5, cost: 5,  costMult: 1.8, desc: '+25% spoils per rank' },
      { id: 'lap',       tree: 'realm',     name: 'Victory Lap',     icon: [5,7],  max: 3,  cost: 6,  costMult: 2,   desc: 'Lands you have conquered before: hero damage ×3 there, +×1 per rank' },
      { id: 'ledger',    tree: 'realm',     name: 'The Ledger',      icon: [13,11], max: 1, cost: 1,  costMult: 1,   desc: 'See your AFK forecast (gold and goods per hour while away)' },
      { id: 'danger',    tree: 'realm',     name: 'Danger Sense',    icon: [0,9],   max: 1, cost: 2,  costMult: 1,   desc: 'See how much HP each fight costs and whether the next stage is safe' },
      { id: 'chronicler',tree: 'realm',     name: 'Chronicler',      icon: [13,8],  max: 1, cost: 2,  costMult: 1,   desc: 'Unlock the Stats card: DPS, crit, kills per second, loot' },
      { id: 'surveyor',  tree: 'crown',     name: 'Surveyor',        icon: [10,7],  max: 1, cost: 2,  costMult: 1,   desc: 'See swing times and yield per swing on the harvest screen' },
      { id: 'almanac',   tree: 'crown',     name: 'Almanac',         icon: [13,3],  max: 1, cost: 2,  costMult: 1,   desc: 'See per-second rates next to every resource in the header' },
    ],
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
  const NAMES = ['Ashford Vale', 'Blackwood March', 'The Iron Hills', 'Kingdom of Varn', 'The Horse Plains', 'Stonemere', 'The Salt Coast', 'Greywater', 'The Twin Crowns', 'Empire of the Coast',
    'The Gilded Reach', 'Highspire', 'The Sunken Throne', 'Emberfall', 'The Bronze Empire', 'The Fen Queendom', 'The Bone Marches', 'Dragon Peaks', 'The Hollow Realm', 'The Last Throne'];
  const RULERS = ['Baron Hollin', 'the Mercenary Lord', 'Warlord Grask', 'the Iron King', 'the Horse Khan', 'Duke Aldric', 'the Salt Admiral', 'Count Morvane', 'the Twin Queens', 'the Emperor of the Coast',
    'the Gilded Prince', 'the Spire Lord', 'the Drowned King', 'the Ember Tyrant', 'the Bronze Emperor', 'the Witch-Queen', 'the Bone King', 'the Dragon of Varn', 'the Hollow King', 'the Last King'];
  const CROWNS = ['the Reed Circlet', 'the Sellsword Crown', 'the Iron Band', 'the Iron Crown', 'the Horse-Tail Crown', 'the Stone Diadem', 'the Salt Crown', 'the Grey Circlet', 'the Twin Crowns', 'the Crown of the Coast',
    'the Gilded Crown', 'the Spire Crown', 'the Drowned Crown', 'the Ember Crown', 'the Bronze Crown', 'the Thorn Circlet', 'the Bone Crown', 'the Dragon Crown', 'the Hollow Crown', 'the Last Crown'];
  const TERRAIN = [['heartwood', 'forest'], ['silver', 'hills'], ['heartwood', 'forest'], ['silver', 'hills'], ['relic', 'holy site']];
  const ART = ['roads_a', 'roads_b', 'wilds_night', 'crypts_b', 'wilds_dusk'];
  let offset = L.offsetStart;
  for (let n = 1; n <= 80; n++) {
    const stages = n <= L.shortLands ? L.shortStages : L.longStages, types = stages / 10, id = 'land' + n;
    const era = ERAS.filter(e => n >= e[0]).pop()[1], i0 = (n * 3) % era.length;
    const cycle = Math.floor((n - 1) / NAMES.length), sfx = cycle ? ' ' + ['II', 'III', 'IV', 'V'][Math.min(cycle - 1, 3)] : '';
    const [spoil, terrain] = TERRAIN[(n - 1) % TERRAIN.length];
    const line = [];
    for (let t = 0; t < types; t++) {
      const [tid, nm, pl, art] = era[(i0 + t) % era.length], last = t === types - 1;
      line.push({ id: `${id}_${tid}_${t}`, art, name: nm, plural: pl, boss: last ? RULERS[(n - 1) % RULERS.length].replace(/^the /, 'The ') + sfx : nm + ' Captain',
        pool: [{ k: spoil, base: 0.01, growth: 0.004 }] });
    }
    C.grounds[id] = { name: NAMES[(n - 1) % NAMES.length] + sfx, land: n, stages, terrain, spoil, crown: CROWNS[(n - 1) % CROWNS.length] + sfx, ruler: RULERS[(n - 1) % RULERS.length] + sfx,
      icon: [5, 7], desc: `Land ${n} · ${terrain} · pays ${C.resources[spoil].name.toLowerCase()}.`, goldMult: 1.5, req: { land: n }, reqText: n === 1 ? 'Proclaim the Kingdom' : `Conquer land ${n - 1}`, line };
    C.stages.groundOffset[id] = offset; offset += L.offsetStep;
    C.art.grounds[id] = `assets/enemies/${ART[(n - 1) % ART.length]}.webp`;
  }
})();
