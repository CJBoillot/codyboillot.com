// ============================================================
// ECONOMY CONFIG — three systems, one resource pool.
//   Character: attributes, 5 gear slots, skills, talents; fights stages
//   Kingdom:   buildings → wood, stone, iron, food (+ a little gold)
//   Crafting:  gear tiers/upgrades (hero), tools (kingdom)
// Everything tunable lives here. Placeholder names throughout.
// ============================================================

const CONFIG = {
  version: 'Beta 0.1.0',
  tickMs: 100,
  maxCatchupSeconds: 5,
  autosaveMs: 10000,

  offline: {
    capSeconds: 8 * 3600,
    efficiency: 0.5,
    minSecondsToShow: 60,
    adDoubleMultiplier: 2,
  },

  // Icons are [row, col] on assets/icons.png (Shikashi's Fantasy Icons, 32px grid, CC-BY).
  iconSheet: { file: 'assets/icons.png', cell: 32 },

  // ---------- Resources ----------
  // Icons are [row, col] on assets/icons.png (Shikashi's Fantasy Icons, 32px grid, CC-BY).
  iconSheet: { file: 'assets/icons.png', cell: 32 },

  // ---------- Goods ----------
  // Everything on the bar is a good: raw (tier 0) → refined (tier 1) → artisan (tier 2). Sell value climbs down the chain.
  resourceGroups: { hero: 'Spoils', raw: 'Raw', refined: 'Refined', artisan: 'Artisan' },
  resources: {
    gold:    { name: 'Gold',     icon: [12,7],  source: 'hero',    tier: 0, sell: 0,  desc: 'Coin. Buys plots, founds kingdoms, levels skills. Earned by selling and from enemies.' },
    bone:    { name: 'Bone',     icon: [16,11], source: 'hero',    tier: 0, sell: 2,  desc: 'Dropped from stage 5. Skill levels and high-tier gear.' },
    hide:    { name: 'Hide',     icon: [17,8],  source: 'raw',     tier: 0, sell: 2,  desc: 'From Husbandry and beasts. Tannery turns 3 into Leather.' },
    wool:    { name: 'Wool',     icon: [17,5],  source: 'raw',     tier: 0, sell: 2,  desc: 'From Husbandry. Weaver turns 3 into Cloth.' },
    wood:    { name: 'Wood',     icon: [17,0],  source: 'raw',     tier: 0, sell: 1,  desc: 'From the Forest. Buildings and blades.' },
    stone:   { name: 'Stone',    icon: [17,1],  source: 'raw',     tier: 0, sell: 1,  desc: 'From the Mine. Buildings.' },
    ore:     { name: 'Iron Ore', icon: [17,2],  source: 'raw',     tier: 0, sell: 1,  desc: 'From the Mine. Blacksmith turns 5 into an Ingot.' },
    grain:   { name: 'Grain',    icon: [14,13], source: 'raw',     tier: 0, sell: 1,  desc: 'From the Farm. Feeds Husbandry and the Tavern.' },
    fiber:   { name: 'Plant Fiber', icon: [11,15], source: 'raw',  tier: 0, sell: 1,  desc: 'Foraged. Rope, cloth, and the Tailor.' },
    berries: { name: 'Berries',  icon: [14,4],  source: 'raw',     tier: 0, sell: 1,  desc: 'Foraged. Food and, later, potions.' },
    ingot:   { name: 'Ingot',    icon: [17,3],  source: 'refined', tier: 1, sell: 10, desc: 'Blacksmith. Iron gear, blades, plates.' },
    leather: { name: 'Leather',  icon: [8,2],   source: 'refined', tier: 1, sell: 8,  desc: 'Tannery. Leather gear and garments.' },
    cloth:   { name: 'Cloth',    icon: [17,7],  source: 'refined', tier: 1, sell: 8,  desc: 'Weaver. Garments.' },
    blade:   { name: 'Blade',    icon: [5,2],   source: 'artisan', tier: 2, sell: 60, desc: 'Weaponsmith. Weapon tiers, or sell.' },
    plate:   { name: 'Armor Plate', icon: [7,7], source: 'artisan', tier: 2, sell: 75, desc: 'Armorsmith. Armor tiers, or sell.' },
    garment: { name: 'Garment',  icon: [7,14],  source: 'artisan', tier: 2, sell: 50, desc: 'Tailor. Helm/boots/trinket tiers, or sell.' },
  },

  // ---------- By hand: instant grabs, one per click, always manual ----------
  hand: [
    { id: 'plants', name: 'Plants', icon: [11,15], gives: 'fiber', unlock: {},                        desc: 'Pull plant fiber by hand.' },
    { id: 'trees',  name: 'Trees',  icon: [17,0],  gives: 'wood',  unlock: { gear: 'chest' },        desc: 'Snap dead branches. An axe does this for you.' },
    { id: 'stones', name: 'Stones', icon: [17,1],  gives: 'stone', unlock: { tech: 'stonetools' },   desc: 'Pick up loose stone.' },
    { id: 'rats',   name: 'Rats',   icon: [17,8],  gives: 'hide',  unlock: { tech: 'skinning' },     desc: 'Catch and skin a rat. A knife and a sword do this for you.' },
  ],

  // ---------- Character: base ----------
  hero: {
    baseAttack: 5,
    baseHp: 100,
    baseRegen: 2,
    baseAttackSpeed: 1,     // hits per second
    baseCrit: 0.05,         // crit chance
    baseCritDmg: 1.5,       // crit multiplier
    baseArmor: 0,           // flat damage reduction per enemy hit-second
    xpPerKill: 1,
    xpToLevel: lvl => Math.floor(20 * Math.pow(1.25, lvl - 1)),
    attackPerLevel: 1.5,
    hpPerLevel: 12,
    regenPerLevel: 0.15,
    attrPointsPerLevel: 3,
    talentPointsFromLevel: 5,   // 1 talent point per level from this level
    talentPointsPerBoss: 1,     // first kill of each boss stage
    respecCost: lvl => 500 * Math.pow(1.2, lvl), // gold, scales with hero level
    restThreshold: 0.4,         // rest below this HP fraction
    restUntil: 0.95,
    killsToAdvance: 10,
    bossEvery: 10,
    bossHpMult: 6,
    bossDmgMult: 2,
    bossKillsToAdvance: 1,
    manualCastBonus: 1.5,       // tapping a ready skill = ×1.5 power
    enemyAttackInterval: 1.0,   // seconds between enemy swings
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
  tierUpAt: 15,
  slots: {
    weapon:  { name: 'Weapon', icon: [5,1],  primary: 'attack', base: 3,   secondary: 'crit',    secBase: 0.02 },
    helm:    { name: 'Helm',   icon: [7,1],  primary: 'hp',     base: 25,  secondary: 'regen',   secBase: 0.8 },
    chest:   { name: 'Chest',  icon: [7,7],  primary: 'armor',  base: 0.5, secondary: 'hp',      secBase: 20 },
    boots:   { name: 'Boots',  icon: [8,3],  primary: 'speed',  base: 0.03, secondary: 'dodge',  secBase: 0.01 },
    trinket: { name: 'Trinket', icon: [8,6], primary: 'drop',   base: 0.05, secondary: 'xp',     secBase: 0.03 },
  },
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
    { name: 'Steel', mult: 9,  craftCost: { plate: 2, ingot: 6, wood: 40 },  upgradeCost: { ingot: 3, wood: 20 },     upgradeMult: 1.3 },
  ],
  // What the hero can spend his time on. Harvest: one swing per `time` s (÷ tool speed), yields outputs × tool power.
  activities: {
    idle:   { name: 'Rest',      icon: [4,2],  desc: 'Doing nothing but healing. Make a weapon to fight.' },
    fight:  { name: 'Fight',     icon: [5,1],  gear: 'weapon', desc: 'Slay enemies for gold, XP and spoils.' },
    wood:   { name: 'Chop Wood', icon: [4,6],  tool: 'axe',    time: 5, outputs: { wood: 1 },              desc: 'Fell trees in the wild. Needs an axe.' },
    mine:   { name: 'Mine',      icon: [4,5],  tool: 'pick',   time: 6, outputs: { ore: 1, stone: 1 },     desc: 'Work a rockface. Needs a pickaxe.' },
    forage: { name: 'Forage',    icon: [11,15], tool: 'sickle', time: 4, outputs: { fiber: 1, berries: 1 }, desc: 'Gather fiber and berries. Needs a sickle.' },
  },
  harvestStrPct: 0.01, // +1% harvest speed per Strength point

  tiers: [
    { name: 'Crude', mult: 0.5, perSlot: { weapon: { name: 'Wooden', craftCost: { wood: 10 }, upgradeCost: { wood: 4 } }, chest: { name: 'Fiber', craftCost: { fiber: 10 }, upgradeCost: { fiber: 4 } }, helm: { name: 'Fiber', craftCost: { fiber: 6 }, upgradeCost: { fiber: 3 } }, boots: { name: 'Fiber', craftCost: { fiber: 6 }, upgradeCost: { fiber: 3 } }, trinket: { name: 'Fiber', craftCost: { fiber: 4 }, upgradeCost: { fiber: 2 } } }, craftCost: { fiber: 10 }, upgradeCost: { fiber: 4 }, upgradeMult: 1.25 },
    { name: 'Leather',     mult: 1,   perSlot: { weapon: { name: 'Stone', craftCost: { stone: 12, wood: 6 }, upgradeCost: { stone: 4, wood: 2 } } }, craftCost: { leather: 3, gold: 50 }, upgradeCost: { leather: 1, gold: 20 }, upgradeMult: 1.25 },
    { name: 'Iron',        mult: 3,   craftCost: { ingot: 5, leather: 3, gold: 300 },            upgradeCost: { ingot: 2, leather: 1 },           upgradeMult: 1.25 },
    { name: 'Steel',       mult: 9,   craftCost: { plate: 2, ingot: 10, gold: 2000 },            upgradeCost: { ingot: 5, plate: 1 },             upgradeMult: 1.25 },
    { name: 'Bone-forged', mult: 27,  craftCost: { plate: 6, blade: 2, garment: 2, bone: 300 },  upgradeCost: { plate: 2, garment: 1, bone: 50 }, upgradeMult: 1.25 },
    { name: 'Mythril',     mult: 81,  craftCost: { plate: 15, blade: 5, garment: 5, gold: 20000 }, upgradeCost: { plate: 4, blade: 1, gold: 500 }, upgradeMult: 1.25 },
  ],
  // Per-slot cost scaling so armor pieces cost a bit different amounts
  slotCostMult: { weapon: 1, helm: 0.8, chest: 1.1, boots: 0.7, trinket: 0.9 },

  // ---------- Skills: auto-cast on cooldown; tap when ready for bonus ----------
  // Levels cost gold + bone: cost × levelMult^level. power grows +powerPerLevel per level.
  skillSlots: 4,
  skillLevelCost: { gold: 200, bone: 10 },
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
  // Where the hero fights. Each ground has its own stage, enemies, bosses and loot. Drops need their tech (Skinning, Bonecraft).
  grounds: {
    wilds:  { name: 'The Wilds',  icon: [17,8],  desc: 'Beasts. Hide for leather; little gold.',         goldMult: 0.6, drops: { hide: 0.15 },  dropTool: { hide: 'knife' },
              enemies: ['Rat', 'Wolf', 'Boar', 'Hyena', 'Bear', 'Stag', 'Panther', 'Dire Wolf', 'Sabercat', 'Mammoth'], bosses: ['Alpha Wolf', 'Great Boar', 'Cave Bear', 'Elder Stag', 'Beast King'] },
    roads:  { name: 'The Roads',  icon: [5,7],   desc: 'Bandits. Gold, and the rope they carry.',        goldMult: 1.5, drops: { fiber: 0.1 }, req: { stage: 10 }, reqText: 'Reach stage 10 in the Wilds',
              enemies: ['Cutpurse', 'Bandit', 'Poacher', 'Highwayman', 'Mercenary', 'Deserter', 'Marauder', 'Raider', 'Warlord', 'Assassin'], bosses: ['Bandit Chief', 'Toll Baron', 'Mercenary Captain', 'Raider Lord', 'The Black Prince'] },
    crypts: { name: 'The Crypts', icon: [0,0],   desc: 'Undead. Bone, if you know Bonecraft.',           goldMult: 0.8, drops: { bone: 0.15 }, req: { tech: 'bonecraft' }, reqText: 'Research Bonecraft',
              enemies: ['Skeleton', 'Ghoul', 'Cultist', 'Wraith', 'Revenant', 'Bone Knight', 'Lich Acolyte', 'Barrow Wight', 'Death Knight', 'Shade'], bosses: ['Bone Lord', 'Cult Priest', 'Crypt Wight', 'Lich', 'The Sleeper'] },
  },

  // ---------- Enemies ----------
  stages: {
    enemyHp:    s => 30 * Math.pow(1.15, s - 1),
    enemyDps:   s => 2 * Math.pow(1.10, s - 1),
    goldPerKill: s => 1 * Math.pow(1.14, s - 1),
    xpMult:     s => Math.pow(1.08, s - 1),
    dropGrowth: s => Math.pow(1.10, s - 1), // multiplies a ground's base drops per kill
  },

  // ---------- Kingdom: plots, buildings, jobs ----------
  plots: {
    cap: lvl => 2 + (lvl - 1) * 2,          // plots you may own at this Kingdom Level (balance later)
    cost: n => Math.round(300 * Math.pow(2.2, n)), // gold for the (n+1)th plot
  },
  thralls: lvl => lvl - 1,                  // one per founding
  // A job: consumes inputs, runs `time` seconds, yields outputs. Level: +8% speed and +1 output every 5 levels.
  buildingTypes: [
    // Gathering
    { id: 'forest',    cat: 'gather',  name: 'Forest',      icon: [4,6],  buildCost: { gold: 50 },                         job: { time: 10, inputs: {},                     outputs: { wood: 1 } } },
    { id: 'mine',      cat: 'gather',  name: 'Mine',        icon: [4,5],  buildCost: { gold: 80, wood: 20 },               job: { time: 10, inputs: {},                     outputs: { ore: 1, stone: 1 } } },
    { id: 'farm',      cat: 'gather',  name: 'Farm',        icon: [12,5], buildCost: { gold: 60, wood: 15 },               job: { time: 10, inputs: {},                     outputs: { grain: 1 } } },
    { id: 'husbandry', cat: 'gather',  name: 'Husbandry',   icon: [19,10], buildCost: { gold: 120, wood: 30 },             job: { time: 10, inputs: { grain: 1 },           outputs: { hide: 1, wool: 1 } } },
    // Crafting (refining)
    { id: 'smith',     cat: 'craft',   name: 'Blacksmith',  icon: [4,4],  buildCost: { gold: 200, stone: 40, wood: 40 },   job: { time: 10, inputs: { ore: 5 },             outputs: { ingot: 1 } } },
    { id: 'tannery',   cat: 'craft',   name: 'Tannery',     icon: [8,2],  buildCost: { gold: 150, wood: 40 },              job: { time: 10, inputs: { hide: 3 },            outputs: { leather: 1 } } },
    { id: 'weaver',    cat: 'craft',   name: 'Weaver',      icon: [17,6], buildCost: { gold: 150, wood: 40 },              job: { time: 10, inputs: { wool: 3 },            outputs: { cloth: 1 } } },
    // Artisan
    { id: 'weaponsmith', cat: 'artisan', name: 'Weaponsmith', icon: [5,1], buildCost: { gold: 600, stone: 80, ingot: 5 },  job: { time: 20, inputs: { ingot: 3, wood: 2 },  outputs: { blade: 1 } } },
    { id: 'armorsmith',  cat: 'artisan', name: 'Armorsmith',  icon: [7,7], buildCost: { gold: 600, stone: 80, ingot: 5 },  job: { time: 20, inputs: { ingot: 5 },           outputs: { plate: 1 } } },
    { id: 'tailor',      cat: 'artisan', name: 'Tailor',      icon: [7,13], buildCost: { gold: 450, wood: 60, cloth: 5 },  job: { time: 20, inputs: { cloth: 3, leather: 1, fiber: 2 }, outputs: { garment: 1 } } },
  ],
  buildingCats: { gather: 'Gathering', craft: 'Crafting', artisan: 'Artisan' },

  // ---------- Quests ----------
  // A linear chain that doubles as the tutorial. `check` types: counter (lifetime goods/kills/etc), tech, tool, gear, plots, building,
  // jobs (jobs completed by hand or thrall), sold (gold earned at market), stage, boss, founded, thrall (assigned), activity (swings).
  quests: [
    // ===== First Steps: everything by hand =====
    { id: 'f01', chain: 'First Steps', name: 'Naked in the Wild', text: 'You have nothing. Plants have fiber, and fiber can be twisted into cloth. Pull some by hand — one handful per click.',
      steps: [ { label: 'Click Plants ten times', check: { counter: 'fiber', need: 10 } } ],
      reward: { fiber: 5 }, focus: { tab: 'hero', sub: 'fight', el: 'hand:plants' } },
    { id: 'f02', chain: 'First Steps', name: 'Twist and Knot', text: 'Knowing how is half of it. Research Fiber Clothing — it costs a little of the fiber you just pulled.',
      steps: [ { label: 'Kingdom → Tech → Research Fiber Clothing', check: { tech: 'fiberclothing' } } ],
      reward: { fiber: 5 }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:fiberclothing' } },
    { id: 'f03', chain: 'First Steps', name: 'Clothed', text: 'Make a fiber tunic. Your Equipment panel shows what you wear — click the Chest slot.',
      steps: [ { label: 'Click the Chest slot → Forge (Fiber, 10 fiber)', check: { gear: 'chest' } } ],
      reward: { fiber: 4 }, focus: { tab: 'hero', sub: 'gear', el: 'gear:chest' } },
    { id: 'f04', chain: 'First Steps', name: 'A Sharpened Branch', text: 'Trees are open to you now. Snap branches by hand, then research the Wooden Sword.',
      steps: [ { label: 'Click Trees ten times', check: { counter: 'wood', need: 10 } }, { label: 'Kingdom → Tech → Research Wooden Sword', check: { tech: 'woodensword' } } ],
      reward: { wood: 5 }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:woodensword', el2: 'hand:trees' } },
    { id: 'f05', chain: 'First Steps', name: 'Armed', text: 'Make the sword. Click the Weapon slot.',
      steps: [ { label: 'Click the Weapon slot → Forge (Wooden, 10 wood)', check: { gear: 'weapon' } } ],
      reward: { gold: 5 }, focus: { tab: 'hero', sub: 'gear', el: 'gear:weapon' } },
    { id: 'f06', chain: 'First Steps', name: 'Let Him Fight', text: 'With a weapon your hero can fight without you. Set him to Fight in the Wilds — he keeps at it even when the game is closed.',
      steps: [ { label: 'Activity → Fight', check: { activity: 'fight' } }, { label: 'Slay 5 enemies', check: { counter: 'kills', need: 5 } } ],
      reward: { gold: 10 }, focus: { tab: 'hero', sub: 'fight', el: 'act:fight' } },
    // ===== Settling In =====
    // Each quest is a checklist of steps. Step checks: activity, ground, tool, gear, tech, counter, plots, building, jobs, sold, stage, boss, founded, thrall.
    { id: 'q01', chain: 'Settling In', name: 'Onward', text: 'Your hero fights by himself. Deeper stages have tougher enemies but drop more gold and loot — pushing is how you earn.',
      steps: [
        { label: 'Fight in The Wilds', check: { activity: 'fight', ground: 'wilds' } },
        { label: 'Fill the bar (10 kills)', check: { counter: 'kills', need: 10 } },
        { label: 'Press Advance when it says the next stage looks fine', check: { stage: 2 } },
      ], reward: { gold: 20 }, focus: { tab: 'hero', sub: 'fight', el: 'id:advance-btn' } },
    { id: 'q02', name: 'Woodcraft', text: 'Tools open up the wild. Woodcraft is the first thing you can research: crude tools carved from wood.',
      steps: [
        { label: 'Slay 25 enemies', check: { counter: 'kills', need: 25 } },
        { label: 'Have 25 gold', check: { have: 'gold', need: 25 } },
        { label: 'Kingdom → Tech → Research Woodcraft', check: { tech: 'stonetools' } },
      ], reward: { wood: 40 }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:stonetools' } },
    { id: 'q02b', name: 'Growing Stronger', text: 'Kills give experience. Every hero level grants 3 attribute points — Strength for harder hits, Vitality for more health. Unspent points show as a dot on the Attributes tab.',
      steps: [
        { label: 'Reach hero level 2', check: { heroLevel: 2 } },
        { label: 'Attributes → spend 3 points', check: { attrSpent: 3 } },
      ], reward: { gold: 15 }, focus: { tab: 'hero', sub: 'attr', rtab: 'attr', el: 'id:attr-list' } },
    { id: 'q03', name: 'An Axe of Your Own', text: 'You have wood enough for an axe, and the axe will cut the rest. Tools are the row under your armor on the Equipment panel — click a slot to make or upgrade it.',
      steps: [
        { label: 'Click the Axe slot on your Equipment → Make (Wooden)', check: { tool: 'axe' } },
      ], reward: { gold: 10 }, focus: { tab: 'hero', sub: 'gear', el: 'tool:axe' } },
    { id: 'q04', name: 'Timber', text: 'A hero does one thing at a time — fight, or work. He keeps working even when the game is closed.',
      steps: [
        { label: 'Activity → Chop Wood', check: { activity: 'wood' } },
        { label: 'Gather 50 wood', check: { counter: 'wood', need: 50 } },
        { label: 'Click the Axe slot → Upgrade once (faster swings, more wood)', check: { toolLevel: 'axe', need: 1 } },
      ], reward: { gold: 30 }, focus: { tab: 'hero', sub: 'fight', el: 'act:wood', el2: 'tool:axe' } },
    { id: 'q05', name: 'Skinner', text: 'Beasts have hides, if you know how to take them.',
      steps: [
        { label: 'Activity → Fight', check: { activity: 'fight' } },
        { label: 'Slay 75 enemies', check: { counter: 'kills', need: 75 } },
        { label: 'Kingdom → Tech → Research Skinning (40 gold)', check: { tech: 'skinning' } },
      ], reward: { gold: 10 }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:skinning', el2: 'act:fight' } },
    { id: 'q06', name: 'Hunter', text: 'Only beasts have hides, and beasts live in the Wilds. A better knife takes more hide per kill.',
      steps: [
        { label: 'Click the Skinning Knife slot → Make (10 wood)', check: { tool: 'knife' } },
        { label: 'Fight in The Wilds', check: { activity: 'fight', ground: 'wilds' } },
        { label: 'Take 40 hide', check: { counter: 'hide', need: 40 } },
      ], reward: { hide: 10, gold: 30 }, focus: { tab: 'hero', sub: 'gear', el: 'tool:knife', el2: 'ground:wilds' } },
    { id: 'q06b', name: 'Leatherworking', text: 'Hide becomes armor once you know how.',
      steps: [
        { label: 'Kingdom → Tech → Research Leatherworking', check: { tech: 'leatherwork' } },
      ], reward: { gold: 20, talent: 1 }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:leatherwork' } },
    { id: 'q06c', name: 'Talent', text: 'Talents are permanent bonuses in three branches — Warrior for damage, Survivor for staying alive, Ranger for speed and loot. You earn a point every level from level 5, and one more the first time you slay each boss. Nothing beats hitting harder early: put your first point in Brawn.',
      steps: [
        { label: 'Reach hero level 5', check: { heroLevel: 5 } },
        { label: 'Talents → Warrior → Brawn (+4% attack)', check: { talent: 'w1' } },
      ], reward: { gold: 30 }, focus: { tab: 'hero', sub: 'talents', rtab: 'talents', el: 'talent:w1' }, onlyTalent: 'w1' },
    { id: 'q07', name: 'Stone Blade', text: 'Better gear means faster kills, just as better tools mean faster gathering. Gather stone by hand, learn Stone Weapons, upgrade the wooden sword to Lv15, then forge the Stone tier.',
      steps: [
        { label: 'Kingdom → Tech → Research Stone Weapons', check: { tech: 'stoneweapons' }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:stoneweapons' } },
        { label: 'Click the Weapon slot → Forge Stone', check: { gearTier: 'weapon', need: 1 }, focus: { tab: 'hero', sub: 'gear', el: 'gear:weapon' } },
      ], reward: { gold: 30 }, focus: { tab: 'hero', sub: 'gear', el: 'gear:weapon' } },
    { id: 'q08', name: 'Stake a Claim', text: 'Your kingdom starts with land. Plots are bought with gold.',
      steps: [
        { label: 'Have 300 gold', check: { have: 'gold', need: 300 } },
        { label: 'Kingdom → Buildings → Buy plot', check: { plots: 1 } },
      ], reward: { wood: 20 }, focus: { tab: 'kingdom', ksub: 'build', rtab: 'kingdom', el: 'id:buy-plot' } },
    { id: 'q09', name: 'Forester', text: 'An empty plot needs a building. A Forest gathers wood without your hero.',
      steps: [
        { label: 'Gather 150 wood in total', check: { counter: 'wood', need: 150 } },
        { label: 'Kingdom → Tech → Research Forestry', check: { tech: 'forestry' } },
        { label: 'Kingdom → Buildings → tap the empty plot → Forest', check: { building: 'forest' } },
      ], reward: { gold: 25 }, focus: { tab: 'kingdom', ksub: 'build', rtab: 'kingdom', el: 'tech:forestry', el2: 'build' } },
    { id: 'q10', name: 'Field Hand', text: 'Buildings only produce when someone works them. For now that is you.',
      steps: [
        { label: 'On the Forest plot, press Work — 10 times', check: { jobs: 10 } },
      ], reward: { gold: 40 }, focus: { tab: 'kingdom', ksub: 'build', rtab: 'kingdom', el: 'work' } },
    { id: 'q11', name: 'Pickaxe', text: 'Iron starts with you. A wooden pick is a poor thing, but it will find ore and stone — and stone is what better buildings need.',
      steps: [
        { label: 'Click the Pickaxe slot → Make (10 wood)', check: { tool: 'pick' } },
        { label: 'Activity → Mine', check: { activity: 'mine' } },
        { label: 'Dig 250 ore', check: { counter: 'ore', need: 250 } },
      ], reward: { gold: 60 }, focus: { tab: 'hero', sub: 'gear', el: 'tool:pick', el2: 'act:mine' } },
    { id: 'q12', name: 'Quarrying', text: 'You know where the ore is now. Later a thrall can work the mine for you.',
      steps: [
        { label: 'Kingdom → Tech → Research Quarrying', check: { tech: 'quarrying' } },
        { label: 'Buildings → build a Mine on a plot', check: { building: 'mine' } },
      ], reward: { gold: 50 }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:quarrying', el2: 'build' } },
    { id: 'q13', name: 'The First Boss', text: 'Every tenth stage is a boss. Beat one and new roads open.',
      steps: [
        { label: 'Activity → Fight', check: { activity: 'fight' } },
        { label: 'Advance to stage 10', check: { stage: 10 } },
        { label: 'Slay the boss', check: { boss: 1 } },
      ], reward: { gold: 60 }, focus: { tab: 'hero', sub: 'fight', el: 'act:fight', el2: 'id:advance-btn' } },
    { id: 'q13b', name: 'Grave Robber', text: 'The undead carry bone, useful for skills and high gear.',
      steps: [
        { label: 'Kingdom → Tech → Research Bonecraft', check: { tech: 'bonecraft' } },
        { label: 'Fight in The Crypts', check: { activity: 'fight', ground: 'crypts' } },
        { label: 'Take 10 bone', check: { counter: 'bone', need: 10 } },
      ], reward: { gold: 60 }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:bonecraft', el2: 'ground:crypts' } },
    { id: 'q13c', name: 'A Second Blow', text: 'Abilities come with experience. Power Strike is your first: it fires on its own, and tapping it when it glows makes it hit harder.',
      steps: [
        { label: 'Reach hero level 12', check: { heroLevel: 12 } },
        { label: 'Skills → Equip Power Strike', check: { skillEquipped: 'strike' } },
        { label: 'Tap Power Strike when it says TAP', check: { focused: 1 } },
      ], reward: { gold: 80 }, focus: { tab: 'hero', sub: 'skills', rtab: 'skills', el: 'skill:strike' } },
    { id: 'q14', name: 'To Market', text: 'Everything you gather can be sold. Refined goods are worth far more than raw.',
      steps: [
        { label: 'Market → Sell 500 gold worth of anything', check: { sold: 500 } },
      ], reward: { gold: 100 }, focus: { tab: 'market', rtab: 'market', el: 'market' } },
    { id: 'q15', name: 'Farmer', text: 'Grain feeds Husbandry, which gives hide and wool without fighting.',
      steps: [
        { label: 'Kingdom → Tech → Research Farming', check: { tech: 'farming' } },
        { label: 'Buildings → build a Farm', check: { building: 'farm' } },
      ], reward: { gold: 60 }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:farming', el2: 'build' } },
    { id: 'q16', name: 'Stage 20', text: 'Upgrade your weapon when fights get slow — that is what the hide and gold are for.',
      steps: [
        { label: 'Reach stage 20 in any ground', check: { stage: 20 } },
      ], reward: { gold: 200 }, focus: { tab: 'hero', sub: 'fight', el: 'act:fight', el2: 'id:advance-btn' } },
    { id: 'q17', name: 'A New Kingdom', text: 'Found a new kingdom: you lose buildings and gear, keep Knowledge, gain land, and a thrall joins you.',
      steps: [
        { label: 'Have 5,000 gold', check: { have: 'gold', need: 5000 } },
        { label: 'Kingdom → Throne → Found a New Kingdom', check: { founded: 1 } },
      ], reward: { gold: 100 }, focus: { tab: 'kingdom', ksub: 'throne', rtab: 'kingdom', el: 'id:found-btn' } },
    { id: 'q18', name: 'Put Them to Work', text: 'Thralls work a plot for you, awake or away.',
      steps: [
        { label: 'Buildings → build anything', check: { plotsBuilt: 1 } },
        { label: 'On that plot, choose your thrall in the dropdown', check: { thrall: 1 } },
      ], reward: { gold: 100 }, focus: { tab: 'kingdom', ksub: 'build', rtab: 'kingdom', el: 'assign' } },
    { id: 'q19', name: 'Ironworking', text: 'Smelting needs a thousand ore. Put a thrall on a Mine and mine yourself.',
      steps: [
        { label: 'Mine 1,000 ore in total', check: { counter: 'ore', need: 1000 } },
        { label: 'Kingdom → Tech → Research Smelting', check: { tech: 'smelting' } },
        { label: 'Buildings → build a Blacksmith', check: { building: 'smith' } },
      ], reward: { gold: 300 }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:smelting', el2: 'act:mine' } },
    { id: 'q20', name: 'Ingots', text: 'Ore becomes ingots at the Blacksmith. Fifty of them unlock Iron Gear.',
      steps: [
        { label: 'Forge 50 ingots', check: { counter: 'ingot', need: 50 } },
        { label: 'Kingdom → Tech → Research Iron Gear', check: { tech: 'irongear' } },
      ], reward: { ingot: 5, gold: 300 }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:irongear', el2: 'work' } },
    { id: 'q21', name: 'Armorsmith', text: 'Ingots become armor plates worth 75 gold each — or Steel gear.',
      steps: [
        { label: 'Forge 150 ingots in total', check: { counter: 'ingot', need: 150 } },
        { label: 'Kingdom → Tech → Research Armorsmithing', check: { tech: 'armorsmithing' } },
        { label: 'Buildings → build an Armorsmith', check: { building: 'armorsmith' } },
      ], reward: { gold: 800 }, focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:armorsmithing', el2: 'build' } },
  ],

  // ---------- Tech tree ----------
  // No research currency. Gate: `req` is a lifetime counter ({res: amount} from goods ever gained, or kills/bossKills/stage).
  // Cost: paid once. Unlocks: buildings, gear tiers, drops, or a bonus. Resets on founding (Blueprints perk pre-researches tiers).
  techTiers: ['Camp', 'Settlement', 'Ironworking', 'Artisan', 'Advanced'],
  techs: [
    // Tier 0 — Camp
    { id: 'skinning',   tier: 0, name: 'Skinning',         icon: [17,8],  req: { kills: 75 },            cost: { gold: 40 },                    unlocks: { drop: 'hide', tool: 'knife' }, desc: 'Lets you make a Skinning Knife. With one, beasts in the Wilds drop Hide — better knife, better chance.' },
    { id: 'fiberclothing', tier: 0, name: 'Fiber Clothing', icon: [7,9], req: { fiber: 10 }, cost: { fiber: 5 }, unlocks: { gearTier: 0, slots: ['chest', 'helm', 'boots', 'trinket'] }, desc: 'Twist plant fiber into clothes. Something between you and the wind.' },
    { id: 'woodensword',   tier: 0, name: 'Wooden Sword',   icon: [5,0], req: { wood: 10 },  cost: { wood: 5 },  unlocks: { gearTier: 0, slots: ['weapon'] },                  desc: 'A sharpened branch. With it, your hero can fight on his own.' },
    { id: 'stonetools', tier: 0, name: 'Woodcraft',        icon: [10,1],  req: { kills: 25 },            cost: { gold: 25 },                     unlocks: { toolTier: 0 },           desc: 'Carve wooden axes, picks, sickles and knives.' },
    { id: 'forestry',   tier: 0, name: 'Forestry',         icon: [4,6],   req: { wood: 150 },            cost: { gold: 60, wood: 30 },                    unlocks: { building: 'forest' },    desc: 'Build a Forest for a thrall to work.' },
    { id: 'farming',    tier: 0, name: 'Farming',          icon: [12,5],  req: { wood: 150 },            cost: { gold: 80, wood: 40 },          unlocks: { building: 'farm' },      desc: 'Build a Farm.' },
    { id: 'leatherwork',tier: 0, name: 'Leatherworking',   icon: [7,6],   req: { hide: 40 },             cost: { gold: 60, hide: 15 },           unlocks: { gearTier: 1, slots: ['chest', 'helm', 'boots', 'trinket'] }, desc: 'Forge Leather armor.' },
    { id: 'stoneweapons',tier: 0, name: 'Stone Weapons',    icon: [17,1],  req: { stone: 30 },            cost: { stone: 10, wood: 5 },           unlocks: { gearTier: 1, slots: ['weapon'] }, desc: 'Knap a stone edge onto a wooden haft. Weapons go Wood → Stone → Iron → Steel.' },
    // Tier 1 — Settlement
    { id: 'quarrying',  tier: 1, name: 'Quarrying',        icon: [4,5],   req: { ore: 250, stone: 250 }, cost: { gold: 200, wood: 100 },         unlocks: { building: 'mine' },      desc: 'Build a Mine for a thrall: stone and iron ore.' },
    { id: 'husbandry',  tier: 1, name: 'Animal Husbandry', icon: [19,10], req: { grain: 150 },           cost: { gold: 120, grain: 50 },        unlocks: { building: 'husbandry' }, desc: 'Build Husbandry: hide and wool.' },
    { id: 'tanning',    tier: 1, name: 'Tanning',          icon: [8,2],   req: { hide: 60 },             cost: { gold: 150, wood: 40 },         unlocks: { building: 'tannery' },   desc: 'Build a Tannery: hide → leather.' },
    { id: 'bonecraft',  tier: 1, name: 'Bonecraft',        icon: [16,11], req: { bossKills: 1 },         cost: { gold: 100 },                   unlocks: { drop: 'bone' },          desc: 'The undead in the Crypts drop Bone.' },
    // Tier 2 — Ironworking
    { id: 'smelting',   tier: 2, name: 'Smelting',         icon: [4,4],   req: { ore: 1000 },             cost: { gold: 300, stone: 100, wood: 50 }, unlocks: { building: 'smith' }, desc: 'Build a Blacksmith: ore → ingots.' },
    { id: 'irongear',   tier: 2, name: 'Iron Gear',        icon: [5,1],   req: { ingot: 50 },            cost: { gold: 400, ingot: 10 },        unlocks: { gearTier: 2 },           desc: 'Forge Iron gear.' },
    { id: 'irontools',  tier: 2, name: 'Iron Tools',       icon: [10,2],  req: { ingot: 20 },            cost: { gold: 200, ingot: 4 },         unlocks: { toolTier: 1 },           desc: 'Forge Iron axes, picks and sickles.' },
    { id: 'weaving',    tier: 2, name: 'Weaving',          icon: [17,6],  req: { wool: 200 },            cost: { gold: 200, wood: 40 },         unlocks: { building: 'weaver' },    desc: 'Build a Weaver: wool → cloth.' },
    { id: 'labor1',     tier: 2, name: 'Efficient Labor',  icon: [1,4],   req: { wood: 1000 },           cost: { gold: 500 },                   unlocks: { jobSpeed: 0.15 },        desc: 'All jobs 15% faster.' },
    // Tier 3 — Artisan
    { id: 'armorsmithing', tier: 3, name: 'Armorsmithing', icon: [7,7],   req: { ingot: 150 },           cost: { gold: 800, ingot: 20, stone: 100 }, unlocks: { building: 'armorsmith' }, desc: 'Build an Armorsmith: plates.' },
    { id: 'weaponsmithing',tier: 3, name: 'Weaponsmithing',icon: [5,2],   req: { ingot: 150, wood: 500 },cost: { gold: 800, ingot: 20, wood: 100 }, unlocks: { building: 'weaponsmith' }, desc: 'Build a Weaponsmith: blades.' },
    { id: 'tailoring',  tier: 3, name: 'Tailoring',        icon: [7,13],  req: { cloth: 100, leather: 50 }, cost: { gold: 600, cloth: 10, leather: 5 }, unlocks: { building: 'tailor' }, desc: 'Build a Tailor: garments.' },
    { id: 'steelgear',  tier: 3, name: 'Steel Gear',       icon: [7,7],   req: { plate: 20 },            cost: { gold: 2000, plate: 5 },        unlocks: { gearTier: 3 },           desc: 'Forge Steel gear.' },
    { id: 'steeltools', tier: 3, name: 'Steel Tools',      icon: [10,1],  req: { plate: 10 },            cost: { gold: 1500, plate: 2 },        unlocks: { toolTier: 2 },           desc: 'Forge Steel tools.' },
    // Tier 4 — Advanced
    { id: 'boneforging',tier: 4, name: 'Bone-forging',     icon: [0,0],   req: { bossKills: 20 },        cost: { gold: 5000, bone: 200 },       unlocks: { gearTier: 4 },           desc: 'Forge Bone-forged gear.' },
    { id: 'mythril',    tier: 4, name: 'Mythril Secrets',  icon: [12,15], req: { foundings: 5 },         cost: { gold: 20000, plate: 20 },      unlocks: { gearTier: 5 },           desc: 'Forge Mythril gear.' },
    { id: 'labor2',     tier: 4, name: 'Master Laborers',  icon: [1,4],   req: { ingot: 1000 },          cost: { gold: 3000 },                  unlocks: { jobSpeed: 0.25 },        desc: 'All jobs 25% faster.' },
  ],

  buildingUpgrade: { base: { gold: 100 }, mult: 1.5, speedPerLevel: 0.08, batchEvery: 5 },

  automation: { autoAdvance: false, autoBuild: false, autoCraft: false },

  // ---------- Legacy: founding (prestige), paths, knowledge, thralls ----------
  legacy: {
    foundRequiresStage: 20,
    foundCostGold: lvl => Math.round(5000 * Math.pow(2, lvl - 1)),   // gold only; scales per kingdom level
    knowledge: s => Math.floor(s.bestStage / 4) + Object.keys(s.bossesKilled).length * 2 + s.maxTier * 3 + Math.max(0, Math.floor(Math.log10((s.lifetimeGold || 0) + 1)) - 2),

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

    // Permanent perks bought with Knowledge. cost = base × costMult^rank.
    perks: [
      { id: 'headstart', name: 'Head Start',      icon: [4,6],  max: 3, cost: 5,  costMult: 1.6, desc: 'Begin each kingdom with 1 free plot per rank' },
      { id: 'blueprints', name: 'Blueprints',     icon: [13,12], max: 4, cost: 12, costMult: 1.8, desc: 'Begin each kingdom with one more tech tier already researched' },
      { id: 'cellar', name: 'Deep Cellar',        icon: [19,9], max: 4, cost: 8,  costMult: 1.7, desc: 'AFK cap +2h per rank' },
      { id: 'memory', name: 'Long Memory',        icon: [13,8], max: 3, cost: 10, costMult: 1.8, desc: 'AFK efficiency +10% per rank' },
      { id: 'cache', name: "Founder's Cache",     icon: [11,11], max: 5, cost: 6,  costMult: 1.6, desc: 'Begin with 1,000 gold and 50 wood per rank' },
      { id: 'veteran', name: 'Veteran',           icon: [1,4],  max: 3, cost: 12, costMult: 2,   desc: '+1 attribute point per level per rank' },
      { id: 'bloodline', name: 'Bloodline',       icon: [1,0],  max: 5, cost: 10, costMult: 1.8, desc: '+5% attack, HP, regen per rank' },
      { id: 'oldblade', name: 'Old Blade',        icon: [5,1],  max: 1, cost: 25, costMult: 1,   desc: 'Keep your weapon through a founding' },
      { id: 'haggler', name: 'Haggler',           icon: [12,10], max: 5, cost: 8,  costMult: 1.7, desc: 'Sell prices +10% per rank' },
    ],
  },
};
