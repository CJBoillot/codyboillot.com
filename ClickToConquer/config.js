// ============================================================
// ECONOMY CONFIG — three systems, one resource pool.
//   Character: attributes, 5 gear slots, skills, talents; fights stages
//   Kingdom:   buildings → wood, stone, iron, food (+ a little gold)
//   Crafting:  gear tiers/upgrades (hero), tools (kingdom)
// Everything tunable lives here. Placeholder names throughout.
// ============================================================

const CONFIG = {
  version: 'Alpha 0.3.1',
  tickMs: 100,
  maxCatchupSeconds: 5,
  autosaveMs: 10000,

  caps: { pack: 100, leatherPack: 150, store: 200 },
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
    fiber:   { name: 'Plant Fiber', icon: [11,15], tier: 1, sell: 1,  desc: 'Pulled from plants, or foraged with a sickle. Clothing and rope.' },
    wood:    { name: 'Wood',     icon: [17,0],  tier: 1, sell: 1,  desc: 'Snapped from trees, or chopped with an axe. Tools, buildings, weapon hafts.' },
    hide:    { name: 'Hide',     icon: [17,8],  tier: 1, sell: 2,  desc: 'From beasts in the Wilds (with a Skinning Knife). Tannery turns 3 into Leather.' },
    stone:   { name: 'Stone',    icon: [17,1],  tier: 1, sell: 1,  desc: 'Picked up, or quarried with a pickaxe. Stone weapons, buildings.' },
    berries: { name: 'Berries',  icon: [14,4],  tier: 1, sell: 1,  desc: 'Foraged with a sickle. Food, and later potions.' },
    // Tier 2 — spoils and the forge
    gold:    { name: 'Gold',     icon: [12,7],  tier: 2, sell: 0,  desc: 'Coin. Buys plots, founds kingdoms, levels skills. Earned at the Market and from bandits on the Roads.' },
    ore:     { name: 'Iron Ore', icon: [17,2],  tier: 2, sell: 1,  desc: 'Mined once you know Prospecting. Blacksmith turns 5 into an Ingot.' },
    leather: { name: 'Leather',  icon: [8,2],   tier: 2, sell: 8,  desc: 'Tannery. Leather armor.' },
    ingot:   { name: 'Ingot',    icon: [17,3],  tier: 2, sell: 10, desc: 'Blacksmith. Iron gear and tools.' },
    meat:    { name: 'Meat',     icon: [15,1],  tier: 2, sell: 5,  desc: 'From beasts once you know Butchery, and from Husbandry. Sells well; feeds thralls one day.' },
    // Tier 3 — the settled kingdom
    grain:   { name: 'Grain',    icon: [14,13], tier: 3, sell: 1,  desc: 'From the Farm. Feeds Husbandry.' },
    wool:    { name: 'Wool',     icon: [17,5],  tier: 3, sell: 2,  desc: 'From Husbandry. Weaver turns 3 into Cloth.' },
    cloth:   { name: 'Cloth',    icon: [17,7],  tier: 3, sell: 8,  desc: 'Weaver. Fine armor tiers.' },
    planks:  { name: 'Planks',   icon: [19,11], tier: 3, sell: 12, desc: 'Sawmill turns 5 wood into a plank. Steel tools and gear.' },
    lumber:  { name: 'Treated Lumber', icon: [19,11], tier: 3, sell: 30, desc: 'Carpenter: 2 planks into 1 treated beam. Wanted by the Empire for forts and ships.' },
    flour:   { name: 'Flour',    icon: [15,10], tier: 3, sell: 4,  desc: 'Mill: 2 grain into 1 flour.' },
    bread:   { name: 'Bread',    icon: [14,14], tier: 3, sell: 12, desc: 'Baker: 2 flour into 1 loaf. Armies march on it.' },
    swords:  { name: 'Iron Swords', icon: [5,1], tier: 3, sell: 45, desc: 'Forge: 2 ingots into 1 sword. The Legion always needs more.' },
    bricks:  { name: 'Bricks',   icon: [13,4],  tier: 3, sell: 12, desc: 'Kiln turns 5 stone into a brick. Hardened gear, grand buildings.' },
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
  },
  toolTiers: [
    { name: 'Wooden', mult: 1, craftCost: { wood: 10 },                      upgradeCost: { wood: 6 },                upgradeMult: 1.3 },
    { name: 'Iron',  mult: 3,  craftCost: { ingot: 4, wood: 20 },            upgradeCost: { ingot: 1, wood: 10 },     upgradeMult: 1.3 },
    { name: 'Steel', mult: 9,  craftCost: { planks: 2, ingot: 6, wood: 40 }, upgradeCost: { ingot: 3, wood: 20 },     upgradeMult: 1.3 },
  ],
  // What the hero can spend his time on. Harvest: one swing per `time` s (÷ tool speed), yields outputs × tool power.
  activities: {
    idle:   { name: 'Rest',      icon: [4,2],  desc: 'Doing nothing but healing. Make a weapon to fight.' },
    fight:  { name: 'Fight',     icon: [5,1],  desc: 'Slay enemies for XP and loot. Bandits on the Roads carry gold.' },
    wood:   { name: 'Chop Wood', icon: [4,6],  tool: 'axe',    time: 5, outputs: { wood: 1 },              desc: 'Fell trees in the wild. Needs an axe.' },
    mine:   { name: 'Mine',      icon: [4,5],  tool: 'pick',   time: 6, outputs: { stone: 1, ore: 1 },     desc: 'Work a rockface for stone. Needs a pickaxe. Iron ore once you know Prospecting.' },
    forage: { name: 'Forage',    icon: [11,15], tool: 'sickle', time: 4, outputs: { fiber: 1, berries: 1 }, desc: 'Gather fiber and berries. Needs a sickle.' },
  },
  harvestStrPct: 0.01, // +1% harvest speed per Strength point

  tiers: [
    { name: 'Crude', mult: 0.5, perSlot: { weapon: { name: 'Wooden', craftCost: { wood: 10 }, upgradeCost: { wood: 2 } }, chest: { name: 'Fiber', craftCost: { fiber: 10 }, upgradeCost: { fiber: 2 } }, gloves: { name: 'Fiber', craftCost: { fiber: 6 }, upgradeCost: { fiber: 2 } }, helm: { name: 'Fiber', craftCost: { fiber: 6 }, upgradeCost: { fiber: 2 } }, boots: { name: 'Fiber', craftCost: { fiber: 6 }, upgradeCost: { fiber: 2 } }, trinket: { name: 'Fiber', craftCost: { fiber: 4 }, upgradeCost: { fiber: 1 } } }, craftCost: { fiber: 10 }, upgradeCost: { fiber: 2 }, upgradeMult: 1.18 },
    { name: 'Leather',     mult: 1,   perSlot: { weapon: { name: 'Stone', craftCost: { stone: 12, wood: 6 }, upgradeCost: { stone: 4, wood: 2 } } }, craftCost: { leather: 3, hide: 5 }, upgradeCost: { leather: 1, hide: 2 }, upgradeMult: 1.25 },
    { name: 'Iron',        mult: 3,   craftCost: { ingot: 5, leather: 3, gold: 300 },            upgradeCost: { ingot: 2, leather: 1 },           upgradeMult: 1.25 },
    { name: 'Steel',       mult: 9,   craftCost: { ingot: 10, planks: 3, leather: 3, gold: 2000 },   upgradeCost: { ingot: 5, planks: 1 },              upgradeMult: 1.25 },
    { name: 'Hardened',    mult: 27,  craftCost: { ingot: 20, bricks: 10, cloth: 6, gold: 5000 },    upgradeCost: { ingot: 8, bricks: 2, cloth: 1 },   upgradeMult: 1.25 },
    { name: 'Mythril',     mult: 81,  craftCost: { ingot: 40, planks: 10, bricks: 10, cloth: 10, gold: 20000 }, upgradeCost: { ingot: 15, bricks: 4, gold: 500 }, upgradeMult: 1.25 },
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
  discXpPerSwing: 1,
  treeRanks: 10,
  trees: {
    combat: [
      { id: 'power',     name: 'Power',       icon: [1,4],  row: 0, per: { attackPct: 0.05 },  desc: '+5% attack per rank' },
      { id: 'haste',     name: 'Haste',       icon: [2,6],  row: 0, per: { speedPct: 0.03 },   desc: '+3% attack speed per rank' },
      { id: 'precision', name: 'Precision',   icon: [0,8],  row: 0, per: { crit: 0.01 },       desc: '+1% crit chance per rank' },
      { id: 'toughness', name: 'Toughness',   icon: [1,0],  row: 0, per: { hpPct: 0.05 },      desc: '+5% max HP per rank' },
      { id: 'strike',    name: 'Power Strike',icon: [3,0],  row: 1, parent: 'power',     tech: 'strike', quest: 'q13c',  desc: 'Technique. Rank 1 unlocks it; each rank hits harder' },
      { id: 'cleave',    name: 'Cleave',      icon: [3,2],  row: 1, parent: 'haste',     tech: 'cleave',  desc: 'Technique. Damage carries to the next enemy' },
      { id: 'plunderer', name: 'Plunderer',   icon: [11,11],row: 1, parent: 'precision', per: { dropPct: 0.03 }, desc: '+3% loot per rank' },
      { id: 'vigor',     name: 'Vigor',       icon: [1,1],  row: 1, parent: 'toughness', per: { regenPct: 0.08 }, desc: '+8% HP regen per rank' },
      { id: 'warcry',    name: 'War Cry',     icon: [3,6],  row: 2, parent: 'strike',    tech: 'warcry',  desc: 'Technique. Burst of attack' },
      { id: 'execute',   name: 'Execute',     icon: [0,0],  row: 2, parent: 'cleave',    tech: 'execute', desc: 'Technique. Huge hit, ×3 vs bosses' },
      { id: 'focus',     name: 'Focus',       icon: [3,10], row: 2, parent: 'plunderer', tech: 'focus',   desc: 'Technique. Burst of crit' },
      { id: 'wind',      name: 'Second Wind', icon: [3,5],  row: 2, parent: 'vigor',     tech: 'wind',    desc: 'Technique. Heals in a fight' },
      { id: 'berserker', name: 'Berserker',   icon: [3,12], row: 3, parent: 'warcry',    capstone: true, per: { attackPct: 0.30, speedPct: 0.15 }, desc: 'Capstone: +30% attack, +15% attack speed' },
      { id: 'slayer',    name: 'Slayer',      icon: [5,9],  row: 3, parent: 'execute',   capstone: true, per: { bossDmg: 0.50 }, desc: 'Capstone: +50% damage to bosses' },
      { id: 'hunter',    name: 'Hunter',      icon: [6,3],  row: 3, parent: 'focus',     capstone: true, per: { dropPct: 0.30, xpPct: 0.20 }, desc: 'Capstone: +30% loot, +20% XP' },
      { id: 'juggernaut',name: 'Juggernaut',  icon: [6,1],  row: 3, parent: 'wind',      capstone: true, per: { dr: 0.15, hpPct: 0.25 }, desc: 'Capstone: −15% damage taken, +25% HP' },
    ],
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

  // ---------- Bestiary & trophies (kill counts per enemy type; persist through founding) ----------
  // Bestiary: the more you kill a type, the better you fight it — bonus = ×damage dealt and −damage taken vs that type.
  bestiary: { tiers: [ { kills: 10, name: 'Familiar', bonus: 0.02 }, { kills: 50, name: 'Studied', bonus: 0.05 }, { kills: 200, name: 'Known', bonus: 0.10 }, { kills: 1000, name: 'Mastered', bonus: 0.15 } ] },
  // Trophies: mounted heads for kill milestones. Each trophy owned = +lootPerTrophy loot and XP, permanently.
  trophies: { lootPerTrophy: 0.01, tiers: [ { kills: 1000, name: 'Wood', color: '#8a6a3a' }, { kills: 2000, name: 'Stone', color: '#9a9a9a' }, { kills: 5000, name: 'Bronze', color: '#c08040' }, { kills: 10000, name: 'Silver', color: '#d8dce0' }, { kills: 25000, name: 'Gold', color: '#e8c06a' } ] },

  // ---------- Techniques (auto-cast on cooldown). Unlocked and ranked through the Combat tree; rank r → level r−1 ----------
  // Levels cost gold + meat: cost × levelMult^level. power grows +powerPerLevel per level.
  skillSlots: 6,
  skillLevelCost: { gold: 200, meat: 5 },
  skillLevelMult: 1.4,
  skills: [
    { id: 'strike', unlock: 12, icon: [3,0],  name: 'Power Strike', cd: 6,  type: 'damage', power: 3,    powerPerLevel: 0.3,  desc: 'Hit for {p}× attack' },
    { id: 'cleave', unlock: 15, icon: [3,2],  name: 'Cleave',       cd: 12, type: 'cleave', power: 1.5,  powerPerLevel: 0.15, desc: 'Damage {p}× attack to this and next enemy' },
    { id: 'warcry', unlock: 18, icon: [3,6],  name: 'War Cry',      cd: 20, type: 'buff', stat: 'attackPct', power: 0.3, powerPerLevel: 0.03, dur: 8, desc: '+{p%} attack for {d}s' },
    { id: 'wind', unlock: 20, icon: [3,5],    name: 'Second Wind',  cd: 25, type: 'heal', power: 0.3,  powerPerLevel: 0.03, desc: 'Heal {p%} max HP' },
    { id: 'focus', unlock: 24, icon: [3,10],   name: 'Focus',        cd: 20, type: 'buff', stat: 'crit', power: 0.25, powerPerLevel: 0.02, dur: 8, desc: '+{p%} crit for {d}s' },
    { id: 'execute', unlock: 28, icon: [0,0], name: 'Execute',      cd: 15, type: 'execute', power: 5, powerPerLevel: 0.5, desc: 'Hit {p}× attack; ×3 vs bosses' },
    { id: 'plunder', unlock: 32, icon: [11,11], name: 'Plunder',      cd: 30, type: 'buff', stat: 'dropPct', power: 0.5, powerPerLevel: 0.05, dur: 10, desc: '+{p%} drops for {d}s' },
    { id: 'ironskin', unlock: 36, icon: [3,7],name: 'Iron Skin',    cd: 25, type: 'buff', stat: 'dr', power: 0.3, powerPerLevel: 0.02, dur: 8, desc: '−{p%} damage taken for {d}s' },
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
  grounds: {
    // Each ground is a LINE of enemy types. A type has 10 stages; stage 10 is its boss. Pool: per-kill drop chance = base + growth × (stage−1), capped.
    // Loot from earlier types carries over at its stage-10 chance. `unique` drops once, on the first boss kill (+1 talent point).
    // dropTool: the drop needs that tool and scales with it. Tech gating (Skinning → hide, Butchery → meat, Grave Robbing → ingot) applies by resource.
    wilds:  { name: 'The Wilds',  icon: [17,8],  desc: 'Beasts. Hide and meat — no gold.',              goldMult: 0, dropTool: { hide: 'knife' }, line: [
      { id: 'rat',   name: 'Rat',      plural: 'Rats',      boss: 'Rat King',    unique: 'ratkingtooth', pool: [{ k: 'hide', base: 0.10, growth: 0.05 }, { k: 'meat', base: 0.10, growth: 0.03 }, { k: 'rattail', base: 0.00, growth: 0.03 }] },
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
    groundOffset: { wilds: 0, roads: 1, crypts: 2 },
    goldPerKill: s => 1 * Math.pow(1.14, s - 1),
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
        { id: 'logging',   name: 'Logging',    icon: [17,0],  make: 'wood',   base: 0.5,  unlock: 1, desc: 'Thralls fell trees.' },
        { id: 'sawmill',   name: 'Sawmill',    icon: [19,11], make: 'planks', from: 'wood',   ratio: 2, base: 0.3,  unlock: 4, desc: '2 logs → 1 plank.' },
        { id: 'carpenter', name: 'Carpenter',  icon: [10,4],  make: 'lumber', from: 'planks', ratio: 2, base: 0.15, unlock: 7, desc: '2 planks → 1 treated lumber.' } ] },
      farm: { name: 'Grain Farm', icon: [12,5], steps: [
        { id: 'fields', name: 'Fields', icon: [14,13], make: 'grain', base: 0.5,  unlock: 2, desc: 'Thralls sow and reap.' },
        { id: 'mill',   name: 'Mill',   icon: [15,10], make: 'flour', from: 'grain', ratio: 2, base: 0.3,  unlock: 5, desc: '2 grain → 1 flour.' },
        { id: 'baker',  name: 'Baker',  icon: [14,14], make: 'bread', from: 'flour', ratio: 2, base: 0.15, unlock: 8, desc: '2 flour → 1 bread.' } ] },
      mine: { name: 'Iron Mine', icon: [4,5], steps: [
        { id: 'shaft',   name: 'Mine Shaft', icon: [17,2], make: 'ore',    base: 0.5,  unlock: 3, desc: 'Thralls dig iron ore.' },
        { id: 'smelter', name: 'Smelter',    icon: [17,3], make: 'ingot',  from: 'ore',   ratio: 2, base: 0.3,  unlock: 6, desc: '2 ore → 1 ingot.' },
        { id: 'forge',   name: 'Forge',      icon: [5,1],  make: 'swords', from: 'ingot', ratio: 2, base: 0.15, unlock: 9, desc: '2 ingots → 1 iron sword.' } ] },
    },
    startGold: 50, foundRenown: 500, swapCooldown: 120, rateGrowth: 0.15, haulBase: 24, haulStep: 1.6, haulMin: 4, cartBase: 4, cartStep: 2,
    costBase: 40, costExp: 1.6, haulCostMult: 0.8,
    bufferCap: 200,                          // most input a refiner can hold waiting
    workerMilestones: [10, 25, 50],          // +1 worker slot at these step levels (highest track)
    extraWorker: 0.25,                       // each worker after the first: +25% rate
    starMult: [1, 1.2, 1.5, 1.8, 2.0, 2.5],  // Overseer multiplier by stars (index = stars)
    abilitySeconds: 30, abilityCooldown: 600,
    hirePrice: [0, 40, 120, 350, 900, 2200], offerRefresh: 300, refreshCost: 25,
    ranks: [ { name: 'Reeve', renown: 0, perk: 'Start' }, { name: 'Baron', renown: 500, perk: '+1 worker slot everywhere · Storehouse ×2 · can found a new fief' }, { name: 'Count', renown: 2000, perk: '4★ thralls in the Hiring Hall · bigger Orders' }, { name: 'Duke', renown: 6000, perk: '5★ thralls · the biggest Orders' } ],
    orderFrom: ['The Northern Legion', 'The Merchant Guild', 'The Village of Ashford', 'The Imperial Court', 'The Border Garrison'],
    orderBase: { wood: 40, grain: 40, ore: 30, planks: 20, flour: 20, ingot: 15, lumber: 10, bread: 10, swords: 6 },
    renownPer: { wood: 0.5, grain: 0.5, ore: 0.7, planks: 1.5, flour: 1.5, ingot: 2, lumber: 4, bread: 4, swords: 6 },
    orderGoldMult: 1.5, orderBonusSeconds: 600, speedBonus: 0.2,
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
  quests: [
    // ===== First Steps: everything by hand =====
    { id: 'f01', chain: 'First Steps', name: 'Naked in the Wild', text: 'You have nothing. Plants have fiber, and fiber can be twisted into cloth. Pull some by hand — one handful per click.',
      steps: [ { label: 'Character → Activity → By hand → tap Plants ×10', check: { counter: 'fiber', need: 10 } } ],
      reward: { fiber: 5 }, focus: { tab: 'hero', sub: 'fight', el: 'hand:plants' } },
    { id: 'f01b', chain: 'First Steps', name: 'Bare Knuckles', text: 'Rats are bold here. You have no weapon, but you have fists — and fists harden with every kill. Punch a few rats.',
      steps: [ { label: 'Character → Activity → Your hero is… → Fight', check: { activity: 'fight' } }, { label: 'Slay 10 rats with your fists', check: { counter: 'kills', need: 10 } } ],
      reward: { fiber: 5 }, focus: { tab: 'hero', sub: 'fight', el: 'act:fight' } },
    { id: 'f02', chain: 'First Steps', name: 'Twist and Knot', text: 'Knowing how is half of it. Research Fiber Clothing — it costs a little of the fiber you just pulled.',
      steps: [ { label: 'Kingdom → Tech → Fiber Clothing → Research', check: { tech: 'fiberclothing' } } ],
      reward: { fiber: 5 }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:fiberclothing' } },
    { id: 'f03', chain: 'First Steps', name: 'Clothed', text: 'Make a fiber tunic. Your Equipment panel shows what you wear — click the Chest slot.',
      steps: [ { label: 'Character → Gear → tap the Chest slot → Forge (10 fiber, 5s)', check: { gear: 'chest' } } ],
      reward: { fiber: 4 }, focus: { tab: 'hero', sub: 'gear', el: 'gear:chest' } },
    { id: 'f04', chain: 'First Steps', name: 'A Sharpened Branch', text: 'Trees are open to you now. Snap branches by hand, then research the Wooden Sword.',
      steps: [ { label: 'Character → Activity → By hand → tap Trees ×10', check: { counter: 'wood', need: 10 }, focus: { tab: 'hero', sub: 'fight', el: 'hand:trees' } }, { label: 'Kingdom → Tech → Wooden Sword → Research', check: { tech: 'woodensword' }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:woodensword' } } ],
      reward: { wood: 5 }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:woodensword', el2: 'hand:trees' } },
    { id: 'f05', chain: 'First Steps', name: 'Armed', text: 'Make the sword. Click the Weapon slot.',
      steps: [ { label: 'Character → Gear → tap the Weapon slot → Forge (10 wood, 5s)', check: { gear: 'weapon' } } ],
      reward: { wood: 10 }, focus: { tab: 'hero', sub: 'gear', el: 'gear:weapon' } },
    { id: 'f06', chain: 'First Steps', name: 'Let Him Fight', text: 'A sharpened branch hits twice as hard as a fist. Set him back to Fight — he keeps at it even when the game is closed.',
      steps: [ { label: 'Character → Activity → Your hero is… → Fight', check: { activity: 'fight' } }, { label: 'Slay 20 enemies in total (he does this on his own)', check: { counter: 'kills', need: 20 } } ],
      reward: { fiber: 10 }, focus: { tab: 'hero', sub: 'fight', el: 'act:fight' } },
    // ===== Settling In =====
    // Each quest is a checklist of steps. Step checks: activity, ground, tool, gear, tech, counter, plots, building, jobs, sold, stage, boss, founded, thrall.
    { id: 'q01', chain: 'Settling In', name: 'Onward', text: 'Your hero fights by himself. Deeper stages have tougher enemies but drop more loot and experience — pushing is how you grow. If he starts losing, Retreat a stage and upgrade.',
      steps: [
        { label: 'Fight in The Wilds', check: { activity: 'fight', ground: 'wilds' } },
        { label: 'Fill the bar (10 kills)', check: { counter: 'kills', need: 10 } },
        { label: 'Press Advance once the kills bar is full', check: { stage: 2 } },
      ], reward: { wood: 20 }, focus: { tab: 'hero', sub: 'fight', el: 'id:advance-btn' } },
    { id: 'q02', name: 'Woodcraft', text: 'Tools open up the wild. Woodcraft is the first thing you can research: crude tools carved from wood.',
      steps: [
        { label: 'Slay 25 enemies', check: { counter: 'kills', need: 25 } },
        { label: 'Have 25 wood (Trees box)', check: { have: 'wood', need: 25 } },
        { label: 'Kingdom → Tech → Research Woodcraft', check: { tech: 'stonetools' } },
      ], reward: { wood: 40 }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:stonetools' } },
    { id: 'q02b', name: 'Growing Stronger', text: 'Kills give Combat XP. Every Combat level grants a point for the Combat tree — the top row is open now; deeper nodes open when the one above is maxed. Unspent points show as a dot on the Skills tab.',
      steps: [
        { label: 'Reach Combat level 2', check: { disc: 'combat', need: 2 } },
        { label: 'Skills → Combat → put a point in Power', check: { node: 'combat:power', need: 1 } },
      ], reward: { fiber: 15 }, focus: { tab: 'hero', sub: 'skills', rtab: 'skills', el: 'node:combat:power' } },
    { id: 'q03', name: 'An Axe of Your Own', text: 'You have wood enough for an axe, and the axe will cut the rest. Tools are the row under your armor on the Equipment panel — click a slot to make or upgrade it.',
      steps: [
        { label: 'Click the Axe slot on your Equipment → Make (Wooden)', check: { tool: 'axe' } },
      ], reward: { wood: 10 }, focus: { tab: 'hero', sub: 'gear', el: 'tool:axe' } },
    { id: 'q04', name: 'Timber', text: 'A hero does one thing at a time — fight, or work. He keeps working even when the game is closed.',
      steps: [
        { label: 'Activity → Chop Wood', check: { activity: 'wood' } },
        { label: 'Chop 30 wood with the axe', check: { harvested: 'wood', need: 30 } },
        { label: 'Click the Axe slot → Upgrade once (faster swings, more wood)', check: { toolLevel: 'axe', need: 1 } },
      ], reward: { stone: 10 }, focus: { tab: 'hero', sub: 'fight', el: 'act:wood', el2: 'tool:axe' } },
    { id: 'q05', name: 'Skinner', text: 'Beasts have hides, if you know how to take them.',
      steps: [
        { label: 'Activity → Fight', check: { activity: 'fight' } },
        { label: 'Slay 50 enemies', check: { counter: 'kills', need: 50 } },
        { label: 'Kingdom → Tech → Research Skinning', check: { tech: 'skinning' } },
      ], reward: { hide: 5 }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:skinning', el2: 'act:fight' } },
    { id: 'q06', name: 'Hunter', text: 'Only beasts have hides, and beasts live in the Wilds. A better knife takes more hide per kill.',
      steps: [
        { label: 'Click the Skinning Knife slot → Make (10 wood)', check: { tool: 'knife' } },
        { label: 'Fight in The Wilds', check: { activity: 'fight', ground: 'wilds' } },
        { label: 'Take 20 hide from beasts', check: { looted: 'hide', need: 20 } },
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
    { id: 'q13', name: 'The First Boss', text: 'The tenth stage of every enemy is its boss. The first kill gives a talent point — spent on the gold capstone at the bottom of a tree — plus a trophy, and beating the Rat King opens the Roads, where bandits carry gold.',
      steps: [
        { label: 'Activity → Fight', check: { activity: 'fight' } },
        { label: 'Advance to stage 10', check: { stage: 10 } },
        { label: 'Slay the boss', check: { boss: 1 } },
      ], reward: { gold: 60 }, focus: { tab: 'hero', sub: 'fight', el: 'act:fight', el2: 'id:advance-btn' } },
    { id: 'q13a', name: 'Highwayman', text: 'Bandits carry the gold they stole. The Roads pay better the deeper you go.',
      steps: [
        { label: 'Fight on The Roads', check: { activity: 'fight', ground: 'roads' } },
        { label: 'Loot 100 gold from bandits', check: { looted: 'gold', need: 100 } },
      ], reward: { gold: 60 }, focus: { tab: 'hero', sub: 'fight', el: 'ground:roads' } },
    { id: 'q14', name: 'To Market', text: 'Bandits carry coin — and so does everything you gather, once sold. Gold levels skills, buys buildings, and founds kingdoms. Refined goods are worth far more than raw — an ingot sells for ten times its ore.',
      steps: [
        { label: 'Market → sell anything for 50 gold in total', check: { sold: 50 } },
      ], reward: { gold: 50 }, focus: { tab: 'market', rtab: 'market', el: 'market' } },
    { id: 'q11', name: 'Pickaxe', text: 'A wooden pick is a poor thing, but it beats picking up pebbles — and stone is what better buildings need. Iron comes later, once you know what to look for.',
      steps: [
        { label: 'Click the Pickaxe slot → Make (10 wood)', check: { tool: 'pick' } },
        { label: 'Activity → Mine', check: { activity: 'mine' } },
        { label: 'Quarry 60 stone with the pick', check: { harvested: 'stone', need: 60 } },
      ], reward: { stone: 40 }, focus: { tab: 'hero', sub: 'gear', el: 'tool:pick', el2: 'act:mine' } },
    { id: 'q12b', name: 'Prospecting', text: 'Some of that rock glitters. Learn to tell ore from stone and every swing of the pick — and every Mine — starts turning up iron too.',
      steps: [
        { label: 'Kingdom → Tech → Research Prospecting', check: { tech: 'prospecting' }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:prospecting' } },
        { label: 'Activity → Mine: dig 30 iron ore', check: { harvested: 'ore', need: 30 }, focus: { tab: 'hero', sub: 'fight', el: 'act:mine' } },
      ], reward: { ore: 20 } },
    { id: 'q13c', name: 'A Second Blow', text: 'Max a top-row node and the one below it opens. Power Strike is a technique: rank 1 unlocks it and it fires on its own whenever it is off cooldown.',
      steps: [
        { label: 'Combat tree → Power 10/10', check: { node: 'combat:power', need: 10 } },
        { label: 'Combat tree → Power Strike rank 1', check: { node: 'combat:strike', need: 1 } },
        { label: 'Use Power Strike 5 times', check: { casts: 'strike', need: 5 } },
      ], reward: { gold: 80 }, focus: { tab: 'hero', sub: 'skills', rtab: 'skills', el: 'node:combat:strike' } },
    { id: 'q13b', name: 'Grave Robber', text: 'The dead were buried with their coin — and their armor. Rusted iron can be melted down.',
      steps: [
        { label: 'Kingdom → Tech → Research Grave Robbing', check: { tech: 'graverobbing' } },
        { label: 'Fight in The Crypts', check: { activity: 'fight', ground: 'crypts' } },
        { label: 'Take 3 ingots from the dead', check: { looted: 'ingot', need: 3 } },
      ], reward: { gold: 100 }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:graverobbing', el2: 'ground:crypts' } },
    { id: 'q14b', name: 'Butcher', text: 'Beasts are meat as well as hide. Meat sells well — and your skills feed on it.',
      steps: [
        { label: 'Kingdom → Tech → Research Butchery', check: { tech: 'butchery' } },
        { label: 'Fight in The Wilds', check: { activity: 'fight', ground: 'wilds' } },
        { label: 'Take 10 meat from beasts', check: { looted: 'meat', need: 10 } },
      ], reward: { meat: 10 }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:butchery', el2: 'ground:wilds' } },
    { id: 'q16', name: 'Stage 20', text: 'Upgrade your weapon when fights get slow — that is what the hide and stone are for.',
      steps: [
        { label: 'Reach stage 20 in any ground', check: { stage: 20 } },
      ], reward: { gold: 200 }, focus: { tab: 'hero', sub: 'fight', el: 'act:fight', el2: 'id:advance-btn' } },
    { id: 'q17', name: 'A New Kingdom', text: 'You have survived the wild alone. Pay tribute to the Empire — 100 gold and the Rat King\'s Tooth — and it grants you land. Your hero keeps everything he has earned — levels, skills and gear — but the goods in your pack stay behind. This is where the kingdom begins.',
      steps: [
        { label: 'Kingdom → Throne → Pay tribute (100 gold + Rat King\'s Tooth)', check: { founded: 1 } },
      ], reward: { gold: 100 }, focus: { tab: 'kingdom', ksub: 'throne', rtab: 'kingdom', el: 'id:found-btn' } },
    // ===== A Kingdom: after the first founding =====
    { id: 'p01', chain: 'A Kingdom', name: 'What Survives', text: 'Everything reset — except your Crystals. Legacy perks are permanent: they survive every founding. Spend your first Crystal on the Bestiary, so every creature you have ever killed keeps teaching you how to fight it.',
      steps: [
        { label: 'Kingdom → Legacy → unlock Bestiary (1 Crystal)', check: { perk: 'bestiary' } },
      ], reward: { gold: 100 }, focus: { tab: 'kingdom', ksub: 'legacy', rtab: 'kingdom', el: 'perk:bestiary' } },
    { id: 'k01', chain: 'A Kingdom', name: 'Hands for Hire', text: 'A kingdom needs hands. The Hiring Hall always has three thralls on offer — each has a role (Foreman, Carter, Packer), stars and stats. Hire one.',
      steps: [ { label: 'Kingdom → Keep → Hiring Hall → Hire', check: { hired: 1 } } ], reward: { gold: 40 }, focus: { tab: 'kingdom', ksub: 'keep', rtab: 'kingdom', el: 'id:hire-list' } },
    { id: 'k02', chain: 'A Kingdom', name: 'Fell the Forest', text: 'A step only runs while a thrall works it. Put your thrall to work at Logging: the logs fill a cart, the cart hauls them to the Storehouse.',
      steps: [ { label: 'Kingdom → Forest → Logging → Assign a worker', check: { working: 'logging' } }, { label: 'Haul 40 wood to the Storehouse', check: { made: 'wood', need: 40 } } ], reward: { gold: 60 }, focus: { tab: 'kingdom', ksub: 'forest', rtab: 'kingdom', el: 'step:logging' } },
    { id: 'k03', chain: 'A Kingdom', name: 'Faster Hands', text: 'Each step has three upgrades: Work rate (how fast it makes), Haul speed (how fast the cart comes back) and Cart size. Output is whichever is slower. Without an overseer, you have to work out which one that is.',
      steps: [ { label: 'Logging → Work rate to Lv 3', check: { stepLv: 'logging:rate', need: 3 } }, { label: 'Logging → Haul speed to Lv 3', check: { stepLv: 'logging:haul', need: 3 } } ], reward: { gold: 80 }, focus: { tab: 'kingdom', ksub: 'forest', rtab: 'kingdom', el: 'step:logging' } },
    { id: 'k04', chain: 'A Kingdom', name: 'Imperial Orders', text: 'The Empire, the Guild and the villages post Orders at your Keep. There is no deadline — but finishing inside the speed window pays 20% more. Orders pay gold and Renown.',
      steps: [ { label: 'Kingdom → Keep → Orders → Deliver one', check: { orders: 1 } } ], reward: { gold: 100 }, focus: { tab: 'kingdom', ksub: 'keep', rtab: 'kingdom', el: 'id:order-list' } },
    { id: 'k05', chain: 'A Kingdom', name: 'An Overseer', text: 'Only an overseer tells you what holds a step back. Put your best thrall in the Overseer slot: their role boosts one upgrade track, and they can call a Double Shift.',
      steps: [ { label: 'Hire a second thrall', check: { hired: 2 } }, { label: 'Logging → Overseer → assign a thrall', check: { overseer: 1 } } ], reward: { gold: 150 }, focus: { tab: 'kingdom', ksub: 'forest', rtab: 'kingdom', el: 'step:logging' } },
    { id: 'k06', chain: 'A Kingdom', name: 'Baron', text: 'Renown only comes from Orders. At 500 Renown you become a Baron: more workers, a bigger Storehouse — and you may found a new fief, which brings the next step of a production line.',
      steps: [ { label: 'Earn 500 Renown from Orders', check: { renown: 500 } } ], reward: { gold: 200 }, focus: { tab: 'kingdom', ksub: 'keep', rtab: 'kingdom', el: 'id:order-list' } },
    { id: 'k07', chain: 'A Kingdom', name: 'A New Fief', text: 'Found a new fief. The kingdom starts over — your hero, his gear and skills, and your Legacy stay — and you gain Crystals and the next step: Fields for grain.',
      steps: [ { label: 'Kingdom → Keep → Found a new fief', check: { founded: 2 } } ], reward: { gold: 100 }, focus: { tab: 'kingdom', ksub: 'keep', rtab: 'kingdom', el: 'id:found-btn' } },
  ],

  // ---------- Tech tree ----------
  // No research currency. Gate: `req` is a lifetime counter ({res: amount} from goods ever gained, or kills/bossKills/stage).
  // Cost: paid once. Unlocks: buildings, gear tiers, drops, or a bonus. Resets on founding (Blueprints perk pre-researches tiers).
  techTiers: ['Camp', 'Settlement', 'Ironworking', 'Artisan', 'Advanced'],
  techs: [
    // Tier 0 — Camp
    { id: 'skinning',   tier: 0, name: 'Skinning',         icon: [17,8],  req: { kills: 50 },            cost: { wood: 20, fiber: 15 },         unlocks: { drop: 'hide', tool: 'knife' }, desc: 'Lets you make a Skinning Knife. With one, beasts in the Wilds drop Hide — better knife, better chance.' },
    { id: 'fiberclothing', tier: 0, name: 'Fiber Clothing', icon: [7,9], req: { fiber: 10 }, cost: { fiber: 5 }, unlocks: { gearTier: 0, slots: ['chest', 'helm', 'gloves', 'boots', 'trinket'] }, desc: 'Twist plant fiber into clothes. Something between you and the wind.' },
    { id: 'woodensword',   tier: 0, name: 'Wooden Sword',   icon: [5,0], req: { wood: 10 },  cost: { wood: 5 },  unlocks: { gearTier: 0, slots: ['weapon'] },                  desc: 'A sharpened branch. With it, your hero can fight on his own.' },
    { id: 'stonetools', tier: 0, name: 'Woodcraft',        icon: [10,1],  req: { kills: 25 },            cost: { wood: 25 },                     unlocks: { toolTier: 0 },           desc: 'Carve wooden axes, picks, sickles and knives.' },
    { id: 'leatherwork',tier: 0, name: 'Leatherworking',   icon: [7,6],   req: { hide: 20 },             cost: { hide: 10, wood: 10 },           unlocks: { gearTier: 1, slots: ['chest', 'helm', 'gloves', 'boots', 'trinket'] }, desc: 'Forge Leather armor.' },
    { id: 'stoneweapons',tier: 0, name: 'Stone Weapons',    icon: [17,1],  req: { stone: 30 },            cost: { stone: 10, wood: 5 },           unlocks: { gearTier: 1, slots: ['weapon'] }, desc: 'Knap a stone edge onto a wooden haft. Weapons go Wood → Stone → Iron → Steel.' },
    // Tier 1 — Settlement
    { id: 'prospecting',tier: 1, name: 'Prospecting',      icon: [17,2],  req: { stone: 120 },           cost: { stone: 40, wood: 20 },          unlocks: { drop: 'ore' },           desc: 'Tell ore from rock. Mining — by pick or by Mine — now yields Iron Ore as well as stone.' },
    { id: 'butchery',   tier: 1, name: 'Butchery',         icon: [15,1],  req: { kills: 100 },           cost: { hide: 10, wood: 10 },          unlocks: { drop: 'meat' },          desc: 'Beasts in the Wilds drop Meat. Sells well; levels skills.' },
    { id: 'graverobbing',tier: 1, name: 'Grave Robbing',    icon: [0,0],   req: { bossKills: 1 },         cost: { gold: 100 },                   unlocks: { drop: 'ingot' },         desc: 'Open the Crypts: the dead carry gold and rusted iron.' },
    // Tier 2 — Ironworking
    { id: 'irongear',   tier: 2, name: 'Iron Gear',        icon: [5,1],   req: { ingot: 50 },            cost: { gold: 400, ingot: 10 },        unlocks: { gearTier: 2 },           desc: 'Forge Iron gear.' },
    { id: 'irontools',  tier: 2, name: 'Iron Tools',       icon: [10,2],  req: { ingot: 20 },            cost: { gold: 200, ingot: 4 },         unlocks: { toolTier: 1 },           desc: 'Forge Iron axes, picks and sickles.' },
    // Tier 3 — Artisan
    { id: 'steelgear',  tier: 3, name: 'Steel Gear',       icon: [7,7],   req: { planks: 20 },           cost: { gold: 2000, planks: 5 },       unlocks: { gearTier: 3 },           desc: 'Forge Steel gear.' },
    { id: 'steeltools', tier: 3, name: 'Steel Tools',      icon: [10,1],  req: { planks: 10 },           cost: { gold: 1500, planks: 2 },       unlocks: { toolTier: 2 },           desc: 'Forge Steel tools.' },
    // Tier 4 — Advanced
    { id: 'hardening',  tier: 4, name: 'Hardening',        icon: [13,4],  req: { bricks: 50, bossKills: 20 }, cost: { gold: 5000, bricks: 20 },  unlocks: { gearTier: 4 },           desc: 'Forge Hardened gear.' },
    { id: 'mythril',    tier: 4, name: 'Mythril Secrets',  icon: [12,15], req: { foundings: 5 },         cost: { gold: 20000, bricks: 20 },     unlocks: { gearTier: 5 },           desc: 'Forge Mythril gear.' },
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
    perks: [
      { id: 'headstart', name: 'Head Start',      icon: [4,6],  max: 3, cost: 5,  costMult: 1.6, desc: 'Thralls begin each kingdom 3 levels higher per rank' },
      { id: 'blueprints', name: 'Blueprints',     icon: [13,12], max: 4, cost: 12, costMult: 1.8, desc: 'Begin each kingdom with one more tech tier already researched' },
      { id: 'cellar', name: 'Deep Cellar',        icon: [19,9], max: 4, cost: 8,  costMult: 1.7, desc: 'AFK cap +2h per rank' },
      { id: 'memory', name: 'Long Memory',        icon: [13,8], max: 3, cost: 10, costMult: 1.8, desc: 'AFK efficiency +10% per rank' },
      { id: 'cache', name: "Founder's Cache",     icon: [11,11], max: 5, cost: 6,  costMult: 1.6, desc: 'Begin with 1,000 gold and 50 wood per rank' },
      { id: 'veteran', name: 'Veteran',           icon: [1,4],  max: 3, cost: 12, costMult: 2,   desc: '+3 Combat tree points per rank' },
      { id: 'bloodline', name: 'Bloodline',       icon: [1,0],  max: 5, cost: 10, costMult: 1.8, desc: '+5% attack, HP, regen per rank' },
      { id: 'oldblade', name: 'Old Blade',        icon: [5,1],  max: 1, cost: 25, costMult: 1,   desc: 'Keep your weapon through a founding' },
      { id: 'haggler', name: 'Haggler',           icon: [12,10], max: 5, cost: 8,  costMult: 1.7, desc: 'Sell prices +10% per rank' },
      { id: 'ledger', name: 'The Ledger',        icon: [13,11], max: 1, cost: 3,  costMult: 1,   desc: 'See your AFK forecast (gold and goods per hour while away) on the fight and harvest screens' },
      { id: 'bestiary', name: 'Bestiary',        icon: [13,6],  max: 1, cost: 1,  costMult: 1,   desc: 'Unlock the Bestiary: kill counts, what each enemy drops and at what odds, and how well you know it' },
      { id: 'danger', name: 'Danger Sense',      icon: [0,9],   max: 1, cost: 2,  costMult: 1,   desc: 'See how much HP each fight costs and whether the next stage is safe' },
      { id: 'chronicler', name: 'Chronicler',    icon: [13,8],  max: 1, cost: 2,  costMult: 1,   desc: 'Unlock the Stats card: DPS, crit, kills per second, loot multiplier' },
      { id: 'surveyor', name: 'Surveyor',        icon: [10,7],  max: 1, cost: 2,  costMult: 1,   desc: 'See swing times and yield per swing on the harvest screen' },
      { id: 'almanac', name: 'Almanac',          icon: [13,3],  max: 1, cost: 2,  costMult: 1,   desc: 'See per-second rates next to every resource in the header' },
    ],
  },
};
