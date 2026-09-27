// ============================================================
// GAME ENGINE — Character (attributes/gear/skills/talents) / Kingdom / Crafting
// ============================================================

const SAVE_KEY = 'afk_proto_save_v11';

// ---------- Formatting ----------
const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n);
  if (n < 1000) return n < 10 && n !== Math.floor(n) ? n.toFixed(1) : Math.floor(n).toString();
  const tier = Math.floor(Math.log10(n) / 3);
  if (tier < SUFFIXES.length) { const sc = n / Math.pow(10, tier * 3); return sc.toFixed(sc < 10 ? 2 : sc < 100 ? 1 : 0) + SUFFIXES[tier]; }
  return n.toExponential(2).replace('+', '');
}
function pct(x, d = 0) { return (x * 100).toFixed(d) + '%'; }
function fmtTime(sec) {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h) return `${h}h ${m}m`; if (m) return `${m}m ${s}s`; return `${s}s`;
}

// ---------- State ----------
const H = CONFIG.hero;
function freshState() {
  const res = {}; for (const k in CONFIG.resources) res[k] = 0;
  const attr = {}; for (const k in CONFIG.attributes) attr[k] = 0;
  const gear = {}; for (const k in CONFIG.slots) gear[k] = null; // {tier, level}
  const tools = {}; for (const k in CONFIG.toolSlots) tools[k] = null;
  const skillLv = {}; for (const s of CONFIG.skills) skillLv[s.id] = 0;
  return {
    res,
    kingdom: { plots: [], thralls: [] },
    tech: {},
    quests: { index: 0, done: {} }, stats: { jobs: 0, sold: 0, focused: 0 }, // plots: {type, level, progress, running, worker: null|'hero'|thrallIndex}; thralls: [{name}]
    hero: {
      level: 1, xp: 0, stage: 1, bestStage: 1, kills: 0, hp: H.baseHp, enemyHp: 0, resting: false, totalKills: 0, time: 0, carry: 0,
      attr, gear, tools, skillLv, loadout: [], cds: {}, buffs: {}, talents: {}, tree: {}, dxp: {}, bossesKilled: {}, activity: 'idle', harvestTimer: 0, mastery: {}, ground: 'wilds', grounds: {}, hand: {},
    },
    lifetime: {}, lastTick: Date.now(), createdAt: Date.now(), settings: { devSpeed: 1, showLog: false }, revealed: {}, log: [],
    legacy: freshLegacy(),
  };
}
function freshLegacy() {
  return { kingdomLevel: 1, knowledge: 0, perks: {}, heroPath: null, kingdomPath: null, foundings: 0, history: [], kills: {} }; // kills: bestiary counts per enemy type (persist — trophies)
}
function perkRank(id) { return (S.legacy.perks || {})[id] || 0; }
function heroPath() { return CONFIG.legacy.heroPaths.find(p => p.id === S.legacy.heroPath) || null; }
function kingdomPath() { return CONFIG.legacy.kingdomPaths.find(p => p.id === S.legacy.kingdomPath) || null; }

let S = freshState();

// ---------- Gear ----------
function tierName(slot, tier) { const t = CONFIG.tiers[tier]; return t.perSlot && t.perSlot[slot] ? t.perSlot[slot].name : t.name; }
function gearStats() {
  const g = {}; const add = (k, v) => g[k] = (g[k] || 0) + v;
  for (const slot in CONFIG.slots) {
    const it = S.hero.gear[slot]; if (!it) continue;
    const def = CONFIG.slots[slot], t = CONFIG.tiers[it.tier], grow = Math.pow(CONFIG.gearGrowth, it.level);
    add(def.primary, def.base * t.mult * grow);
    if (it.tier >= 1) add(def.secondary, def.secBase * t.mult * grow);
  }
  return g;
}
function itemStatPreview(slot, tier, level) {
  const def = CONFIG.slots[slot], t = CONFIG.tiers[tier], grow = Math.pow(CONFIG.gearGrowth, level);
  const o = { [def.primary]: def.base * t.mult * grow };
  if (tier >= 1) o[def.secondary] = def.secBase * t.mult * grow;
  return o;
}
function scaleCost(base, mult, level, extra = 1) { const c = {}; for (const k in base) c[k] = base[k] * Math.pow(mult, level) * extra; return c; }
function gearCraftCost(slot) { // cost to craft next tier (or first)
  const it = S.hero.gear[slot], next = it ? it.tier + 1 : 0;
  if (next >= CONFIG.tiers.length) return null;
  const t = CONFIG.tiers[next], ps = t.perSlot && t.perSlot[slot];
  return ps ? { ...ps.craftCost } : scaleCost(t.craftCost, 1, 0, CONFIG.slotCostMult[slot]);
}
function gearUpgradeCost(slot) {
  const it = S.hero.gear[slot]; if (!it) return null;
  const t = CONFIG.tiers[it.tier], ps = t.perSlot && t.perSlot[slot];
  return ps ? scaleCost(ps.upgradeCost, t.upgradeMult, it.level) : scaleCost(t.upgradeCost, t.upgradeMult, it.level, CONFIG.slotCostMult[slot]);
}
function canTierUp(slot) { const it = S.hero.gear[slot], next = it ? it.tier + 1 : 0; return next < CONFIG.tiers.length && gearTierUnlocked(next, slot) && (!it || it.level >= CONFIG.tierUpAt); }
function craftGear(slot) {
  if (!canTierUp(slot)) return false;
  const c = gearCraftCost(slot); if (!c || !canAfford(c)) return false;
  pay(c);
  const it = S.hero.gear[slot];
  S.hero.gear[slot] = { tier: it ? it.tier + 1 : 0, level: 0 };
  log(`Forged ${CONFIG.tiers[S.hero.gear[slot].tier].name} ${CONFIG.slots[slot].name}`);
  return true;
}
function upgradeGear(slot) {
  const c = gearUpgradeCost(slot); if (!c || !canAfford(c)) return false;
  pay(c); S.hero.gear[slot].level++; return true;
}

// ---------- By hand ----------
function handDef(id) { return CONFIG.hand.find(h => h.id === id); }
function handUnlocked(id) { const u = handDef(id).unlock; if (u.tech) return hasTech(u.tech); if (u.gear) return !!S.hero.gear[u.gear]; return true; }
function pinned(k) { return !(S.settings.unpinned && S.settings.unpinned[k]); }
function togglePin(k) { S.settings.unpinned = S.settings.unpinned || {}; if (S.settings.unpinned[k]) delete S.settings.unpinned[k]; else S.settings.unpinned[k] = true; return pinned(k); }
function grab(id) { if (!handUnlocked(id)) return false; const h = handDef(id); add(h.gives, 1); S.hero.hand[id] = (S.hero.hand[id] || 0) + 1; pushEvent({ who: 'hand', id, res: h.gives }); return true; }

// ---------- Tools & activities ----------
function toolTierUnlocked(t) { return CONFIG.techs.some(x => x.unlocks.toolTier === t && hasTech(x.id)); }
function toolPower(slot) { const it = S.hero.tools[slot]; if (!it) return 0; return CONFIG.toolSlots[slot].base * CONFIG.toolTiers[it.tier].mult * Math.pow(CONFIG.gearGrowth, it.level); }
function toolCraftCost(slot) { const it = S.hero.tools[slot], next = it ? it.tier + 1 : 0; if (next >= CONFIG.toolTiers.length) return null; return { ...CONFIG.toolTiers[next].craftCost }; }
function toolUpgradeCost(slot) { const it = S.hero.tools[slot]; if (!it) return null; const t = CONFIG.toolTiers[it.tier]; return scaleCost(t.upgradeCost, t.upgradeMult, it.level); }
function toolSlotUnlocked(slot) { return !CONFIG.techs.some(t => t.unlocks.tool === slot) || CONFIG.techs.some(t => t.unlocks.tool === slot && hasTech(t.id)); }
function canToolTierUp(slot) { const it = S.hero.tools[slot], next = it ? it.tier + 1 : 0; return toolSlotUnlocked(slot) && next < CONFIG.toolTiers.length && toolTierUnlocked(next) && (!it || it.level >= CONFIG.tierUpAt); }
function craftTool(slot) { if (!canToolTierUp(slot)) return false; const c = toolCraftCost(slot); if (!c || !canAfford(c)) return false; pay(c); const it = S.hero.tools[slot]; S.hero.tools[slot] = { tier: it ? it.tier + 1 : 0, level: 0 }; log(`Made a ${CONFIG.toolTiers[S.hero.tools[slot].tier].name} ${CONFIG.toolSlots[slot].name}`); return true; }
function upgradeTool(slot) { const c = toolUpgradeCost(slot); if (!c || !canAfford(c)) return false; pay(c); S.hero.tools[slot].level++; return true; }
function activityDef(id) { return CONFIG.activities[id]; }
function activityAvailable(id) { const a = activityDef(id); return !!a && (!a.tool || !!S.hero.tools[a.tool]) && (!a.gear || !!S.hero.gear[a.gear]); }
function setActivity(id) { if (!activityAvailable(id)) return false; S.hero.activity = id; S.hero.harvestTimer = 0; if (id !== 'fight') { S.hero.resting = false; S.hero.enemyHp = 0; } return true; }
function heroFighting() { return S.hero.activity === 'fight' && activityAvailable('fight'); }
function masteryLevel(id) { return Math.floor(Math.sqrt((S.hero.mastery[id] || 0) / 10)); } // swings → level; +2% speed each
function harvestTime(id) { const a = activityDef(id), p = toolPower(a.tool), tm = treeMods(id); return a.time / (Math.pow(p, 0.5)) / (1 + (tm.harvestSpeed || 0)) / (1 + 0.02 * masteryLevel(id)); }
function outputGated(k) { const g = CONFIG.harvestGate && CONFIG.harvestGate[k]; return !!g && !hasTech(g); }
function harvestYield(id) { const a = activityDef(id), p = toolPower(a.tool), tm = treeMods(id), o = {}; for (const k in a.outputs) { if (outputGated(k)) continue; o[k] = a.outputs[k] * Math.pow(p, 0.5) * (1 + (tm.harvestYield || 0)) * (1 + (tm.harvestDouble || 0)); } const side = treeSide(id); for (const k in side) o[k] = (o[k] || 0) + side[k]; return o; }
function harvestRates(id = S.hero.activity) { if (id === 'fight' || id === 'idle' || !activityAvailable(id)) return {}; const y = harvestYield(id), t = harvestTime(id), r = {}; for (const k in y) r[k] = y[k] / t; return r; }
function tickHarvest(dt) {
  const id = S.hero.activity; if (id === 'fight' || id === 'idle') return;
  if (!activityAvailable(id)) { S.hero.activity = 'idle'; return; }
  S.hero.harvestTimer += dt; const t = harvestTime(id);
  while (S.hero.harvestTimer >= t) { S.hero.harvestTimer -= t; const y = harvestYield(id), got = {}; for (const k in y) { const n = Math.floor(y[k]) + (Math.random() < y[k] - Math.floor(y[k]) ? 1 : 0); if (n > 0) { add(k, n); got[k] = n; } } S.hero.mastery[id] = (S.hero.mastery[id] || 0) + 1; gainDiscXp(id, CONFIG.discXpPerSwing); pushEvent({ who: 'harvest', yield: got }); }
}

// ---------- Disciplines & skill trees ----------
function discXp(d) { return (S.hero.dxp && S.hero.dxp[d]) || 0; }
function discLevel(d) { let lvl = 1, x = discXp(d); while (x >= CONFIG.discXpToLevel(lvl) && lvl < 200) { x -= CONFIG.discXpToLevel(lvl); lvl++; } return lvl; }
function discProgress(d) { let lvl = 1, x = discXp(d); while (x >= CONFIG.discXpToLevel(lvl) && lvl < 200) { x -= CONFIG.discXpToLevel(lvl); lvl++; } return { level: lvl, have: x, need: CONFIG.discXpToLevel(lvl) }; }
function gainDiscXp(d, n) { if (!CONFIG.disciplines[d]) return; S.hero.dxp = S.hero.dxp || {}; const before = discLevel(d); S.hero.dxp[d] = (S.hero.dxp[d] || 0) + n; const after = discLevel(d); if (after > before) log(`${CONFIG.disciplines[d].name} level ${after}!`); }
function treeNode(d, id) { return (CONFIG.trees[d] || []).find(n => n.id === id); }
function nodeRank(d, id) { return (S.hero.tree && S.hero.tree[d] && S.hero.tree[d][id]) || 0; }
function nodeMax(n) { return n.capstone ? 1 : CONFIG.treeRanks; }
function nodeOpen(d, id) { const n = treeNode(d, id); if (!n) return false; if (!n.parent) return true; const p = treeNode(d, n.parent); return nodeRank(d, n.parent) >= nodeMax(p); }
function treePointsTotal(d) { return discLevel(d) - 1 + (d === 'combat' ? perkRank('veteran') * 3 : 0); }
function treePointsSpent(d) { let n = 0; for (const node of CONFIG.trees[d] || []) if (!node.capstone) n += nodeRank(d, node.id); return n; }
function treePointsFree(d) { return treePointsTotal(d) - treePointsSpent(d); }
function talentPointsTotal() { return Object.keys(S.hero.bossesKilled).length * H.talentPointsPerBoss + (S.hero.bonusTalent || 0); }
function talentPointsSpent() { let n = 0; for (const d in CONFIG.trees) for (const node of CONFIG.trees[d]) if (node.capstone) n += nodeRank(d, node.id); return n; }
function talentPointsFree() { return talentPointsTotal() - talentPointsSpent(); }
function canRankNode(d, id) { const n = treeNode(d, id); if (!n || !nodeOpen(d, id) || nodeRank(d, id) >= nodeMax(n)) return false; return n.capstone ? talentPointsFree() > 0 : treePointsFree(d) > 0; }
function rankNode(d, id) {
  if (!canRankNode(d, id)) return false;
  S.hero.tree = S.hero.tree || {}; S.hero.tree[d] = S.hero.tree[d] || {}; S.hero.tree[d][id] = nodeRank(d, id) + 1;
  const n = treeNode(d, id); if (n.tech) { S.hero.skillLv[n.tech] = S.hero.tree[d][id] - 1; if (!S.hero.loadout.includes(n.tech)) S.hero.loadout.push(n.tech); if (S.hero.tree[d][id] === 1) log(`Technique learned: ${n.name}`); }
  return true;
}
function treeMods(d) { const m = {}; for (const n of CONFIG.trees[d] || []) { const r = nodeRank(d, n.id); if (!r || !n.per) continue; for (const k in n.per) m[k] = (m[k] || 0) + n.per[k] * r; } return m; }
function treeSide(d) { const o = {}; for (const n of CONFIG.trees[d] || []) { if (!n.side || !nodeRank(d, n.id)) continue; for (const k in n.side) o[k] = (o[k] || 0) + n.side[k]; } return o; }
function respecCost() { const kp = kingdomPath(); return kp && kp.freeRespec ? 0 : H.respecCost(S.hero.level); }
function respec() {
  const c = respecCost(); if (S.res.gold < c) return false;
  S.res.gold -= c; for (const d in CONFIG.trees) for (const n of CONFIG.trees[d]) if (!n.capstone && S.hero.tree && S.hero.tree[d]) { delete S.hero.tree[d][n.id]; if (n.tech) { S.hero.skillLv[n.tech] = 0; S.hero.loadout = S.hero.loadout.filter(x => x !== n.tech); } }
  log('Respecced all tree points (capstones kept).'); return true;
}
// Legacy shims so old code paths keep working
function attrPointsFree() { return 0; } function spendAttr() { return false; } function spendTalent() { return false; } function talentAvailable() { return false; }

// ---------- Skills ----------
function skillDef(id) { return CONFIG.skills.find(s => s.id === id); }
function skillUnlocked(id) { return CONFIG.trees.combat.some(n => n.tech === id && nodeRank('combat', n.id) >= 1); }
function skillPower(id) { const d = skillDef(id); return d.power + d.powerPerLevel * (S.hero.skillLv[id] || 0); }
function skillCd(id) { return skillDef(id).cd * (1 - stats().cdr); }
function skillReady(id) { return (S.hero.cds[id] || 0) <= 0; }
function castSkill(id, manual = false) {
  if (!S.hero.loadout.includes(id) || !skillReady(id) || S.hero.resting) return false;
  const d = skillDef(id), st = stats(), h = S.hero;
  const bonus = manual ? H.manualCastBonus : 1, p = skillPower(id) * st.skillPower * bonus;
  const bossMult = isBoss() ? st.bossDmg : 1;
  switch (d.type) {
    case 'damage': hitEnemy(st.attack * p * bossMult); pushEvent({ who: 'hero', dmg: st.attack * p * bossMult, skill: d.name }); break;
    case 'execute': { const dm = st.attack * p * bossMult * (isBoss() ? 3 : 1); hitEnemy(dm); pushEvent({ who: 'hero', dmg: dm, skill: d.name }); break; }
    case 'cleave': hitEnemy(st.attack * p * bossMult); h.carry += st.attack * p; pushEvent({ who: 'hero', dmg: st.attack * p * bossMult, skill: d.name }); break;
    case 'heal': h.hp = Math.min(st.maxHp, h.hp + st.maxHp * p); pushEvent({ who: 'heal', dmg: st.maxHp * p, skill: d.name }); break;
    case 'buff': h.buffs[d.stat] = { value: p, until: h.time + d.dur }; break;
  }
  h.cds[id] = skillCd(id);
  S.stats.casts = S.stats.casts || {}; S.stats.casts[id] = (S.stats.casts[id] || 0) + 1;
  if (manual) { S.stats.focused = (S.stats.focused || 0) + 1; log(`Focused ${d.name}!`); }
  return true;
}
function activeBuffs() { const o = {}; for (const k in S.hero.buffs) if (S.hero.buffs[k].until > S.hero.time) o[k] = S.hero.buffs[k].value; return o; }
// Sustained (average) buff values from the loadout, for offline/rate estimates
function sustainedSkillMods() {
  const o = {}, w = CONFIG.offlineSkillWeight, sp = 1; // skillPower applied later in stats; keep simple
  for (const id of S.hero.loadout) {
    const d = skillDef(id); if (d.type !== 'buff') continue;
    const cd = d.cd * (1 - Math.min(CONFIG.cdrCap, rawMods().cdr || 0));
    o[d.stat] = (o[d.stat] || 0) + skillPower(id) * Math.min(1, d.dur / cd) * w;
  }
  return o;
}
function sustainedSkillDps(st) { // extra dps from damage skills + heal as regen
  let dps = 0, heal = 0; const w = CONFIG.offlineSkillWeight;
  for (const id of S.hero.loadout) {
    const d = skillDef(id), cd = d.cd * (1 - st.cdr), p = skillPower(id) * st.skillPower;
    if (d.type === 'damage' || d.type === 'execute') dps += st.attack * p / cd * w;
    if (d.type === 'cleave') dps += st.attack * p * 2 / cd * w;
    if (d.type === 'heal') heal += st.maxHp * p / cd * w;
  }
  return { dps, heal };
}

// ---------- Stat pipeline ----------
function rawMods() { // attributes + talents only
  const m = {}; const add = (k, v) => m[k] = (m[k] || 0) + v;
  const hp = heroPath(), kp = kingdomPath();
  const tm = treeMods('combat'); for (const e in tm) add(e, tm[e]);
  if (hp) for (const e in hp.mods) add(e, hp.mods[e]);
  if (kp && kp.mods) for (const e in kp.mods) add(e, kp.mods[e]);
  const bl = perkRank('bloodline') * 0.05; if (bl) { add('attackPct', bl); add('hpPct', bl); add('regenPct', bl); }
  const tr = trophyCount() * CONFIG.trophies.lootPerTrophy; if (tr) { add('dropPct', tr); add('xpPct', tr); }
  return m;
}
function stats(mode = 'live') {
  const m = rawMods(); const add = (k, v) => m[k] = (m[k] || 0) + v;
  const buffs = mode === 'live' ? activeBuffs() : sustainedSkillMods();
  for (const k in buffs) add(k, buffs[k]);
  const g = gearStats(), lvl = S.hero.level - 1;
  const st = {};
  st.skillPower = 1 + (m.skillPct || 0);
  st.cdr = Math.min(CONFIG.cdrCap, m.cdr || 0);
  st.attack = (H.baseAttack + H.attackPerLevel * lvl + (g.attack || 0)) * (1 + (m.attackPct || 0));
  st.speed = H.baseAttackSpeed * (1 + (g.speed || 0) + (m.speedPct || 0));
  st.crit = Math.min(1, H.baseCrit + (g.crit || 0) + (m.crit || 0));
  st.critDmg = H.baseCritDmg + (m.critDmg || 0);
  st.dps = st.attack * st.speed * (1 + st.crit * (st.critDmg - 1));
  st.maxHp = (H.baseHp + H.hpPerLevel * lvl + (g.hp || 0)) * (1 + (m.hpPct || 0));
  st.regen = (H.baseRegen + H.regenPerLevel * lvl + (g.regen || 0)) * (1 + (m.regenPct || 0));
  st.armor = H.baseArmor + (g.armor || 0) + (m.armor || 0);
  st.dr = Math.min(0.7, m.dr || 0);
  st.dodge = Math.min(0.5, g.dodge || 0);
  st.drop = 1 + (g.drop || 0) + (m.dropPct || 0);
  st.gold = st.drop * (1 + (m.goldPct || 0));
  st.xp = 1 + (g.xp || 0) + (m.xpPct || 0);
  st.bossDmg = 1 + (m.bossDmg || 0);
  st.restSpeed = 1 + (m.restSpeed || 0);
  if (mode === 'sustained') { const s = sustainedSkillDps(st); st.dps += s.dps; st.regen += s.heal; }
  return st;
}
function effectiveEnemyDps(st, stage = S.hero.stage) {
  const raw = enemyDps(stage) * (1 - bestiaryBonus(typeKey(stage)));
  return Math.max(raw * 0.2, raw - st.armor) * (1 - st.dr) * (1 - st.dodge);
}

// ---------- Enemies ----------
// Stage → enemy type + sub-stage (1..10). Past the end of a line the last type repeats as "Elder …".
function stageType(stage = S.hero.stage) { const per = CONFIG.stages.perType; return { t: Math.floor((stage - 1) / per), k: (stage - 1) % per + 1 }; }
function enemyType(stage = S.hero.stage, gid = S.hero.ground) { const L = CONFIG.grounds[gid].line, { t } = stageType(stage); return L[Math.min(t, L.length - 1)]; }
function enemyTypeLoops(stage = S.hero.stage, gid = S.hero.ground) { const L = CONFIG.grounds[gid].line, { t } = stageType(stage); return Math.max(0, t - (L.length - 1)); }
function isBoss(stage = S.hero.stage) { return stageType(stage).k === CONFIG.stages.perType; }
function enemyMaxHp(stage = S.hero.stage) { return CONFIG.stages.enemyHp(stage) * (isBoss(stage) ? H.bossHpMult : 1); }
function enemyDps(stage = S.hero.stage)   { return CONFIG.stages.enemyDps(stage) * (isBoss(stage) ? H.bossDmgMult : 1); }
function ground() { return CONFIG.grounds[S.hero.ground] || CONFIG.grounds.wilds; }
function groundUnlocked(id) { const G = CONFIG.grounds[id]; if (!G || !G.req) return true; if (G.req.tech) return hasTech(G.req.tech); if (G.req.stage) return (S.hero.ground === 'wilds' ? S.hero.bestStage : (S.hero.grounds.wilds || {}).bestStage || 1) >= G.req.stage; return true; }
function setGround(id) {
  if (!CONFIG.grounds[id] || id === S.hero.ground || !groundUnlocked(id)) return false;
  const h = S.hero; h.grounds[h.ground] = { stage: h.stage, bestStage: h.bestStage, kills: h.kills };
  const g = h.grounds[id] || { stage: 1, bestStage: 1, kills: 0 };
  h.ground = id; h.stage = g.stage; h.bestStage = g.bestStage; h.kills = g.kills; h.enemyHp = 0; h.carry = 0; h.resting = false;
  log(`Now hunting ${CONFIG.grounds[id].name}`); return true;
}
function bestStageAll() { let b = S.hero.bestStage; for (const k in S.hero.grounds) b = Math.max(b, S.hero.grounds[k].bestStage || 1); return b; }
function enemyName(stage = S.hero.stage) {
  const T = enemyType(stage), loops = enemyTypeLoops(stage), pre = loops ? 'Elder '.repeat(Math.min(loops, 2)) : '';
  return pre + (isBoss(stage) ? T.boss : T.name);
}
function stageLabel(stage = S.hero.stage, gid = S.hero.ground) { const { k } = stageType(stage), T = enemyType(stage, gid); return `${enemyTypeLoops(stage, gid) ? 'Elder ' : ''}${T.name} ${k}/${CONFIG.stages.perType}`; }
function nextTypeName(stage = S.hero.stage) { const T = enemyType(stage + 1); return (enemyTypeLoops(stage + 1) ? 'Elder ' : '') + T.plural; }
// Drop table for a stage: current type's pool at its stage chance, earlier types' pools at their stage-10 chance. Gated by tech / tool. Values are expected units per kill.
function stagePool(stage = S.hero.stage, gid = S.hero.ground) {
  const G = CONFIG.grounds[gid], L = G.line, { t, k } = stageType(stage), per = CONFIG.stages.perType, cap = CONFIG.stages.dropCap, o = {};
  const upto = Math.min(t, L.length - 1);
  for (let i = 0; i <= upto; i++) for (const d of L[i].pool) {
    const kk = i === upto && i === t ? k : per; // current type uses its sub-stage; earlier (or looped) types are maxed
    let v = Math.min(cap, d.base + d.growth * (kk - 1)) * (i < upto ? CONFIG.stages.carryOverFloor : 1);
    if (v > (o[d.k] || 0)) o[d.k] = v;
  }
  return o;
}
function dropToolMult(slot) { const p = toolPower(slot); return p > 0 ? 1 + 0.6 * p : 0; } // Wooden Lv0 ×1.6, Iron ×2.8, Steel ×6.4
function groundDrops(stage = S.hero.stage) { // per kill, gated by tech, boosted by tool
  const G = ground(), pool = stagePool(stage), o = {};
  for (const k in pool) { if (!dropUnlocked(k)) continue; let v = pool[k]; const t = G.dropTool && G.dropTool[k]; if (t) { if (!S.hero.tools[t]) continue; v *= dropToolMult(t); } o[k] = v; }
  return o;
}
function lootRarity(k) { return (CONFIG.resources[k] && CONFIG.resources[k].rarity) || 'common'; }
function killsNeeded(stage = S.hero.stage) { return isBoss(stage) ? H.bossKillsToAdvance : H.killsToAdvance; }

// Closed-form farm rate (kills/sec) using sustained stats; 0 if the hero can't survive a fight.
function farmRate(stage = S.hero.stage) {
  const st = stats('sustained');
  const dps = st.dps * (isBoss(stage) ? st.bossDmg : 1);
  const ttk = enemyMaxHp(stage) / dps;
  const net = (effectiveEnemyDps(st, stage) - st.regen) * ttk;
  if (net >= st.maxHp) return 0;
  const recovery = net > 0 ? net / (st.regen * st.restSpeed) : 0;
  return 1 / (ttk + recovery);
}
function stageDanger(stage = S.hero.stage) {
  const st = stats('sustained');
  const dps = st.dps * (isBoss(stage) ? st.bossDmg : 1);
  const ttk = enemyMaxHp(stage) / dps;
  return Math.max(0, (effectiveEnemyDps(st, stage) - st.regen) * ttk) / st.maxHp;
}

// ---------- Resources ----------
function add(resId, amt) { if (!amt) return; S.res[resId] = (S.res[resId] || 0) + amt; if (amt > 0) S.lifetime[resId] = (S.lifetime[resId] || 0) + amt; }
function canAfford(cost) { for (const k in cost) if ((S.res[k] || 0) < cost[k]) return false; return true; }
function pay(cost) { for (const k in cost) S.res[k] -= cost[k]; }

// ---------- Kingdom: plots, buildings, timed jobs, thralls ----------
const THRALL_NAMES = ['Brann', 'Ysolde', 'Kettil', 'Marra', 'Osric', 'Thyra', 'Gundar', 'Liv', 'Halvar', 'Sigrun', 'Rurik', 'Eydis'];
function btype(id) { return CONFIG.buildingTypes.find(b => b.id === id); }
function plotCap() { return thrallCount(); } // one plot per thrall — a thrall IS a plot
function plotCost() { return { gold: CONFIG.plots.cost(S.kingdom.plots.length) }; }
function canBuyPlot() { return false; } // plots come with thralls now
function buyPlot() { if (!canBuyPlot()) return false; pay(plotCost()); S.kingdom.plots.push({ type: null, level: 0, progress: 0, running: false, worker: null }); return true; }
function buildingCostMult() { const kp = kingdomPath(); return kp ? kp.costMult : 1; }
function buildCost(typeId) { return scaleCost(btype(typeId).buildCost, 1, 0, buildingCostMult()); }
function build(idx, typeId) {
  const p = S.kingdom.plots[idx]; if (!p || p.type || !buildingUnlocked(typeId) || idx >= thrallCount()) return false;
  const c = buildCost(typeId); if (!canAfford(c)) return false;
  pay(c); p.type = typeId; p.level = 1; p.progress = 0; p.running = false; p.worker = idx; log(`${thrallName(idx)} built a ${btype(typeId).name}`); return true;
}
function demolish(idx) { const p = S.kingdom.plots[idx]; if (!p || !p.type) return false; log(`Tore down the ${btype(p.type).name}`); p.type = null; p.level = 0; p.progress = 0; p.running = false; return true; }
function upgradeCost(idx) { const p = S.kingdom.plots[idx]; return scaleCost(CONFIG.buildingUpgrade.base, CONFIG.buildingUpgrade.mult, p.level - 1, buildingCostMult()); }
function upgradePlot(idx) { const p = S.kingdom.plots[idx]; if (!p || !p.type) return false; const c = upgradeCost(idx); if (!canAfford(c)) return false; pay(c); p.level++; return true; }
function jobTime(p) { const kp = kingdomPath(), w = typeof p.worker === 'number' ? thrallSpeed(p.worker) : 1; return btype(p.type).job.time / ((1 + CONFIG.buildingUpgrade.speedPerLevel * (p.level - 1)) * (kp && kp.jobSpeed ? kp.jobSpeed : 1) * techJobSpeed() * w); }
function jobOutputs(p) {
  const t = btype(p.type), o = {}, bonus = Math.floor((p.level - 1) / CONFIG.buildingUpgrade.batchEvery), kp = kingdomPath();
  const om = kp && kp.outputMult && kp.outputMult[p.type] ? kp.outputMult[p.type] : 1;
  for (const k in t.job.outputs) { if (outputGated(k)) continue; o[k] = (t.job.outputs[k] + bonus) * om; }
  return o;
}
function jobInputs(p) { return btype(p.type).job.inputs; }
function canStartJob(idx) { const p = S.kingdom.plots[idx]; return !!(p && p.type && !p.running && canAfford(jobInputs(p))); }
function startJob(idx) { if (!canStartJob(idx)) return false; const p = S.kingdom.plots[idx]; pay(jobInputs(p)); p.running = true; p.progress = 0; return true; }
function plotWorker(idx) { return S.kingdom.plots[idx].worker; } // null | 'hero' | thrall index
function thrallCount() { return CONFIG.thralls(S.legacy.kingdomLevel); }
function ensureThralls() {
  while (S.kingdom.thralls.length < thrallCount()) S.kingdom.thralls.push({ name: THRALL_NAMES[S.kingdom.thralls.length % THRALL_NAMES.length], xp: 0 });
  while (S.kingdom.plots.length < thrallCount()) S.kingdom.plots.push({ type: null, level: 0, progress: 0, running: false, worker: S.kingdom.plots.length });
  S.kingdom.plots.forEach((p, i) => { if (p.type) p.worker = i; });
}
function thrallName(i) { const t = S.kingdom.thralls[i]; return t ? t.name : 'Thrall'; }
function thrallLevel(i) { const t = S.kingdom.thralls[i]; if (!t) return 1; let lvl = 1 + perkRank('headstart') * CONFIG.thrallXp.headStartLevels, x = t.xp || 0; while (x >= CONFIG.thrallXp.toLevel(lvl) && lvl < 99) { x -= CONFIG.thrallXp.toLevel(lvl); lvl++; } return lvl; }
function thrallProgress(i) { const t = S.kingdom.thralls[i]; let lvl = 1 + perkRank('headstart') * CONFIG.thrallXp.headStartLevels, x = (t && t.xp) || 0; while (x >= CONFIG.thrallXp.toLevel(lvl) && lvl < 99) { x -= CONFIG.thrallXp.toLevel(lvl); lvl++; } return { level: lvl, have: x, need: CONFIG.thrallXp.toLevel(lvl) }; }
function thrallSpeed(i) { return 1 + CONFIG.thrallXp.speedPerLevel * (thrallLevel(i) - 1); }
function assign(idx, who) { return false; }
function assignOld(idx, who) { // who: null | thrall index
  const plots = S.kingdom.plots; if (!plots[idx] || !plots[idx].type) return false;
  for (const p of plots) if (p.worker === who && who !== null) p.worker = null; // one job per thrall
  plots[idx].worker = who; return true;
}
function tickKingdom(dt) {
  S.kingdom.plots.forEach((p, idx) => {
    if (!p.type) return;
    if (!p.running) { if (canStartJob(idx)) startJob(idx); else return; } // every built plot runs itself
    p.progress += dt;
    const t = jobTime(p);
    if (p.progress >= t) {
      const o = jobOutputs(p); for (const k in o) add(k, o[k]);
      S.stats.jobs++; if (typeof p.worker === 'number' && S.kingdom.thralls[p.worker]) { const t = S.kingdom.thralls[p.worker], b = thrallLevel(p.worker); t.xp = (t.xp || 0) + 1; if (thrallLevel(p.worker) > b) log(`${t.name} is now level ${thrallLevel(p.worker)}`); }
      p.running = false; p.progress = 0;
      if (canStartJob(idx)) startJob(idx);
    }
  });
}
// Rates (per second) for display and AFK: every built plot produces continuously (thralls multiply output).
function plotRate(p) { const o = jobOutputs(p), t = jobTime(p), r = {}; for (const k in o) r[k] = o[k] / t; return r; }
function kingdomRates() { const r = {}; for (const p of S.kingdom.plots) { if (!p.type) continue; const pr = plotRate(p); for (const k in pr) r[k] = (r[k] || 0) + pr[k]; } return r; }

// ---------- Tech ----------
function techDef(id) { return CONFIG.techs.find(t => t.id === id); }
function hasTech(id) { return !!S.tech[id]; }
function counter(k) { // lifetime counters used as mastery gates
  if (k === 'kills') return S.hero.totalKills; if (k === 'bossKills') return Object.keys(S.hero.bossesKilled).length;
  if (k === 'stage') return bestStageAll(); if (k === 'foundings') return S.legacy.foundings;
  return S.lifetime[k] || 0;
}
function techProgress(t) { // {ok, parts:[{k, have, need}]}
  const parts = Object.entries(t.req).map(([k, need]) => ({ k, have: counter(k), need }));
  return { ok: parts.every(p => p.have >= p.need), parts };
}
function canResearch(id) { const t = techDef(id); return t && !hasTech(id) && techProgress(t).ok && canAfford(t.cost); }
function research(id) { if (!canResearch(id)) return false; pay(techDef(id).cost); S.tech[id] = true; log(`Researched ${techDef(id).name}`); return true; }
function buildingUnlocked(typeId) { return CONFIG.techs.some(t => t.unlocks.building === typeId && hasTech(t.id)); }
function gearTierUnlocked(tier, slot) { return CONFIG.techs.some(t => t.unlocks.gearTier === tier && hasTech(t.id) && (!t.unlocks.slots || !slot || t.unlocks.slots.includes(slot))); }
function dropGated(res) { return CONFIG.techs.some(t => t.unlocks.drop === res); }
function dropUnlocked(res) { return !dropGated(res) || CONFIG.techs.some(t => t.unlocks.drop === res && hasTech(t.id)); }
function techJobSpeed() { let s = 1; for (const t of CONFIG.techs) if (hasTech(t.id) && t.unlocks.jobSpeed) s *= 1 + t.unlocks.jobSpeed; return s; }
function grantTechTiers(n) { for (const t of CONFIG.techs) if (t.tier < n) S.tech[t.id] = true; }

// ---------- Quests ----------
function questCurrent() { return CONFIG.quests[S.quests.index] || null; }
function questProgress(q) { // {done, parts:[{label, done, have, need}]}
  const parts = q.steps.map(s => ({ ...questCheck(s.check), label: s.label }));
  return { done: parts.every(p => p.done), have: parts.filter(p => p.done).length, need: parts.length, parts };
}
function questCheck(c) {
  if (c.gearTier) { const it = S.hero.gear[c.gearTier]; const t = it ? it.tier : -1; return { done: t >= c.need, have: t + 1, need: c.need + 1, simple: true }; }
  if (c.talent) { const r = S.hero.talents[c.talent] || 0; return { done: r >= 1, have: r, need: 1 }; }
  if (c.talentSpent) return { done: talentPointsSpent() >= c.talentSpent, have: talentPointsSpent(), need: c.talentSpent };
  if (c.heroLevel) return { done: S.hero.level >= c.heroLevel, have: S.hero.level, need: c.heroLevel };
  if (c.skillEquipped) { const ok = S.hero.loadout.includes(c.skillEquipped); return { done: ok, have: ok ? 1 : 0, need: 1 }; }
  if (c.perk) return { done: perkRank(c.perk) >= (c.need || 1), have: perkRank(c.perk), need: c.need || 1 };
  if (c.disc) return { done: discLevel(c.disc) >= c.need, have: discLevel(c.disc), need: c.need };
  if (c.node) { const [d, id] = c.node.split(':'), r = nodeRank(d, id); return { done: r >= c.need, have: r, need: c.need }; }
  if (c.casts) { const n = (S.stats.casts && S.stats.casts[c.casts]) || 0; return { done: n >= c.need, have: n, need: c.need }; }
  if (c.focused) return { done: (S.stats.focused || 0) >= c.focused, have: S.stats.focused || 0, need: c.focused };
  if (c.activity) { const ok = S.hero.activity === c.activity && (!c.ground || S.hero.ground === c.ground); return { done: ok, have: ok ? 1 : 0, need: 1 }; }
  if (c.have) return { done: (S.res[c.have] || 0) >= c.need, have: Math.floor(S.res[c.have] || 0), need: c.need };
  if (c.toolLevel) { const t = S.hero.tools[c.toolLevel]; const lv = t ? t.level : 0; return { done: lv >= c.need, have: lv, need: c.need }; }
  if (c.plotsBuilt) { const n = S.kingdom.plots.filter(p => p.type).length; return { done: n >= c.plotsBuilt, have: n, need: c.plotsBuilt }; }
  if (c.counter) return { done: counter(c.counter) >= c.need, have: counter(c.counter), need: c.need };
  if (c.tech) return { done: hasTech(c.tech), have: hasTech(c.tech) ? 1 : 0, need: 1 };
  if (c.tool) return { done: !!S.hero.tools[c.tool], have: S.hero.tools[c.tool] ? 1 : 0, need: 1 };
  if (c.gear) return { done: !!S.hero.gear[c.gear], have: S.hero.gear[c.gear] ? 1 : 0, need: 1 };
  if (c.plots) return { done: S.kingdom.plots.length >= c.plots, have: S.kingdom.plots.length, need: c.plots };
  if (c.building) { const n = S.kingdom.plots.filter(p => p.type === c.building).length; return { done: n >= 1, have: n, need: 1 }; }
  if (c.jobs) return { done: S.stats.jobs >= c.jobs, have: S.stats.jobs, need: c.jobs };
  if (c.sold) return { done: S.stats.sold >= c.sold, have: Math.floor(S.stats.sold), need: c.sold };
  if (c.stage) return { done: bestStageAll() >= c.stage, have: bestStageAll(), need: c.stage, simple: c.stage <= 2 };
  if (c.boss) { const n = Object.keys(S.hero.bossesKilled).length; return { done: n >= c.boss, have: n, need: c.boss }; }
  if (c.founded) return { done: S.legacy.foundings >= c.founded, have: S.legacy.foundings, need: c.founded };
  if (c.thrall) { const n = S.kingdom.plots.filter(p => typeof p.worker === 'number').length; return { done: n >= c.thrall, have: n, need: c.thrall }; }
  return { done: false, have: 0, need: 1 };
}
// Auto-generated goal when the chain is exhausted: the tech you're closest to, with what it still needs.
function suggestGoal() {
  let best = null;
  for (const t of CONFIG.techs) {
    if (hasTech(t.id)) continue;
    const pr = techProgress(t);
    const frac = pr.parts.length ? pr.parts.reduce((a, p) => a + Math.min(1, p.have / p.need), 0) / pr.parts.length : 1;
    const score = frac + (pr.ok && canAfford(t.cost) ? 2 : pr.ok ? 1 : 0) - t.tier * 0.05;
    if (!best || score > best.score) best = { t, pr, score };
  }
  if (!best) return null;
  const { t, pr } = best;
  return { name: t.name, text: pr.ok ? (canAfford(t.cost) ? `You can research ${t.name} now.` : `Gather the cost to research ${t.name}.`) : `Work toward ${t.name}: ${t.desc}`, hint: 'Kingdom → Tech', parts: pr.parts.map(p => ({ done: p.have >= p.need, have: p.have, need: p.need, label: p.k })), focus: { tab: 'kingdom', ksub: 'tech', rtab: 'kingdom', el: 'tech:' + t.id } };
}
function questClaim() {
  const q = questCurrent(); if (!q || !questProgress(q).done) return false;
  for (const k in q.reward) { if (k === 'talent') S.hero.bonusTalent = (S.hero.bonusTalent || 0) + q.reward[k]; else if (k === 'crystal') {} else add(k, q.reward[k]); }
  if (q.reward && q.reward.crystal) { S.legacy.knowledge += q.reward.crystal; log(`+${q.reward.crystal} Crystal`); }
  S.quests.done[q.id] = true; S.quests.index++; log(`Quest complete: ${q.name}`); return true;
}

// ---------- Market ----------
function sellPrice(k) { const kp = kingdomPath(); return CONFIG.resources[k].sell * (1 + 0.10 * perkRank('haggler')) * (kp && kp.sellMult ? kp.sellMult : 1); }
function sell(k, n) {
  const have = Math.floor(S.res[k] || 0); n = n === 'all' ? have : Math.min(n, have); if (n <= 0 || !sellPrice(k)) return 0;
  S.res[k] -= n; add('gold', n * sellPrice(k)); S.stats.sold += n * sellPrice(k); return n;
}

// ---------- Hero actions ----------
function heroRates(stage = S.hero.stage) {
  const st = stats('sustained'), kps = farmRate(stage);
  const r = { gold: CONFIG.stages.goldPerKill(stage) * ground().goldMult * kps * st.gold };
  const d = groundDrops(stage); for (const k in d) r[k] = d[k] * kps * st.drop;
  return r;
}
// ---------- Bestiary & trophies (persist through founding) ----------
function typeKey(stage = S.hero.stage, gid = S.hero.ground) { return gid + ':' + enemyType(stage, gid).id; }
function typeKills(key) { return (S.legacy.kills && S.legacy.kills[key]) || 0; }
function bestiaryTier(key) { const k = typeKills(key), T = CONFIG.bestiary.tiers; let t = -1; for (let i = 0; i < T.length; i++) if (k >= T[i].kills) t = i; return t; }
function bestiaryBonus(key) { const t = bestiaryTier(key); return t < 0 ? 0 : CONFIG.bestiary.tiers[t].bonus; } // ×dmg dealt, −dmg taken vs this type
function trophyTier(key) { const k = typeKills(key), T = CONFIG.trophies.tiers; let t = -1; for (let i = 0; i < T.length; i++) if (k >= T[i].kills) t = i; return t; }
function trophyCount() { let n = 0; for (const key in (S.legacy.kills || {})) n += trophyTier(key) + 1; return n; }
function hitEnemy(dmg) { if (S.hero.enemyHp <= 0) S.hero.enemyHp = enemyMaxHp(); S.hero.enemyHp -= dmg * (1 + bestiaryBonus(typeKey())); }
function onKill(st) {
  const s = S.hero.stage;
  // Whole-unit loot: expected value v → floor(v) plus a (v − floor) chance of one more. Averages match the AFK rate model.
  const roll = v => Math.floor(v) + (Math.random() < v - Math.floor(v) ? 1 : 0);
  const exp = { gold: CONFIG.stages.goldPerKill(s) * ground().goldMult * st.gold };
  const d = groundDrops(s); for (const k in d) exp[k] = d[k] * st.drop;
  const loot = {}; for (const k in exp) { const n = roll(exp[k]); if (n > 0) { add(k, n); loot[k] = n; } }
  if (Object.keys(loot).length) pushEvent({ who: 'loot', loot });
  gainXp(H.xpPerKill * CONFIG.stages.xpPerKill(s) * (isBoss(s) ? 3 : 1) * st.xp);
  S.hero.kills++; S.hero.totalKills++;
  { const key = typeKey(s); S.legacy.kills = S.legacy.kills || {}; const before = trophyTier(key), bt = bestiaryTier(key); S.legacy.kills[key] = (S.legacy.kills[key] || 0) + 1; const after = trophyTier(key); if (after > before) { log(`Trophy earned: ${CONFIG.trophies.tiers[after].name} ${enemyType(s).name} head!`); pushEvent({ who: 'trophy', key, tier: after }); } if (bestiaryTier(key) > bt) log(`Bestiary: ${enemyType(s).plural} — ${CONFIG.bestiary.tiers[bestiaryTier(key)].name}`); }
  if (isBoss(s)) { const bk = S.hero.ground + ':' + s; if (!S.hero.bossesKilled[bk]) { S.hero.bossesKilled[bk] = true; const u = enemyType(s).unique; if (u && CONFIG.resources[u]) { add(u, 1); pushEvent({ who: 'loot', loot: { [u]: 1 }, unique: true }); } log(`Defeated ${enemyName(s)}! +1 talent point${u ? ', ' + CONFIG.resources[u].name : ''}`); } else log(`Defeated ${enemyName(s)}!`); }
  if (CONFIG.automation.autoAdvance && canAdvance()) advance();
}
function gainXp(x) {
  S.hero.xp += x; gainDiscXp('combat', x);
  while (S.hero.xp >= H.xpToLevel(S.hero.level)) {
    S.hero.xp -= H.xpToLevel(S.hero.level); S.hero.level++; S.hero.hp = stats().maxHp;
    log(`Level up! Now level ${S.hero.level}`);
  }
}
function canAdvance() { return S.hero.kills >= killsNeeded(); }
function advance() { if (!canAdvance()) return false; S.hero.stage++; S.hero.kills = 0; S.hero.enemyHp = 0; S.hero.carry = 0; S.hero.bestStage = Math.max(S.hero.bestStage, S.hero.stage); log(isBoss() ? `The ${enemyName()} awaits — BOSS` : stageType().k === 1 ? `Now hunting ${enemyType().plural}` : `Advanced: ${stageLabel()}`); return true; }
function retreat() { if (S.hero.stage <= 1) return false; S.hero.stage--; S.hero.kills = 0; S.hero.enemyHp = 0; S.hero.carry = 0; log(`Retreated to stage ${S.hero.stage}`); return true; }
function log(msg) { S.log.unshift(msg); if (S.log.length > 30) S.log.length = 30; }

// ---------- Live simulation ----------
// Discrete combat: hero swings every 1/speed sec (rolls crit), enemy swings every enemyAttackInterval sec.
const EVENTS = []; // transient hit events for the UI: {who:'hero'|'enemy', dmg, crit, skill}
function pushEvent(e) { EVENTS.push(e); if (EVENTS.length > 20) EVENTS.shift(); }
function heroStrike(st) {
  const crit = Math.random() < st.crit;
  const dmg = st.attack * (crit ? st.critDmg : 1) * (isBoss() ? st.bossDmg : 1);
  hitEnemy(dmg); pushEvent({ who: 'hero', dmg, crit });
}
function simulate(dt) {
  tickKingdom(dt);
  const h = S.hero; h.time += dt;
  if (!heroFighting()) { const st0 = stats(); h.hp = Math.min(st0.maxHp, h.hp + st0.regen * dt); tickHarvest(dt); return; }
  for (const id in h.cds) if (h.cds[id] > 0) h.cds[id] -= dt;
  const st = stats();
  if (h.resting) { h.hp = Math.min(st.maxHp, h.hp + st.regen * st.restSpeed * dt); if (h.hp >= st.maxHp * H.restUntil) { h.resting = false; h.atkTimer = 0; h.eTimer = 0; } else return; }
  h.hp = Math.min(st.maxHp, h.hp + st.regen * dt);
  if (h.enemyHp <= 0) { h.enemyHp = enemyMaxHp(); if (h.carry > 0) { h.enemyHp -= h.carry; h.carry = 0; } }
  for (const id of h.loadout) if (skillReady(id)) castSkill(id, false);
  // hero auto-attack
  h.atkTimer = (h.atkTimer || 0) + dt;
  const interval = 1 / st.speed;
  while (h.atkTimer >= interval && h.enemyHp > 0) { h.atkTimer -= interval; heroStrike(st); }
  // enemy attack
  h.eTimer = (h.eTimer || 0) + dt;
  while (h.eTimer >= H.enemyAttackInterval) {
    h.eTimer -= H.enemyAttackInterval;
    const dmg = effectiveEnemyDps(st) * H.enemyAttackInterval;
    h.hp -= dmg; pushEvent({ who: 'enemy', dmg });
  }
  if (h.hp <= 0) { h.hp = 1; h.resting = true; h.enemyHp = 0; h.carry = 0; h.atkTimer = 0; log(`Knocked out by ${enemyName()}. Retreating.`); retreat(); return; }
  if (h.enemyHp <= 0) { onKill(st); h.enemyHp = 0; h.atkTimer = Math.min(h.atkTimer, interval * 0.5); if (h.hp < st.maxHp * H.restThreshold) h.resting = true; }
}

// ---------- Offline ----------
function afkCap() { return CONFIG.offline.capSeconds + perkRank('cellar') * 2 * 3600; }
function afkEff() { return Math.min(1, CONFIG.offline.efficiency + perkRank('memory') * 0.10); }
// AFK: worked plots run their jobs (in chain order so raw → refined → artisan feed each other); the hero farms only if fighting.
function applyOffline(awaySeconds) {
  const counted = Math.min(awaySeconds, afkCap()), eff = afkEff(), gains = {};
  const order = ['gather', 'craft', 'artisan'], pool = { ...S.res };
  for (const cat of order) for (const p of S.kingdom.plots) {
    if (!p.type || btype(p.type).cat !== cat) continue;
    const t = jobTime(p), cycles = Math.floor(counted * eff / t), inp = jobInputs(p), out = jobOutputs(p);
    let n = cycles; for (const k in inp) n = Math.min(n, Math.floor((pool[k] || 0) / inp[k]));
    if (n <= 0) continue;
    for (const k in inp) { pool[k] -= inp[k] * n; gains[k] = (gains[k] || 0) - inp[k] * n; }
    for (const k in out) { pool[k] = (pool[k] || 0) + out[k] * n; gains[k] = (gains[k] || 0) + out[k] * n; }
  }
  let kills = 0;
  if (heroFighting()) { const hr = heroRates(); for (const k in hr) gains[k] = (gains[k] || 0) + hr[k] * counted * eff; kills = farmRate() * counted * eff; }
  else { const hr = harvestRates(); for (const k in hr) gains[k] = (gains[k] || 0) + hr[k] * counted * eff; }
  return { awaySeconds, counted, gains, kills, startStage: S.hero.stage, endStage: S.hero.stage };
}
function claimOffline(data, mult = 1) {
  for (const k in data.gains) add(k, data.gains[k] > 0 ? data.gains[k] * mult : data.gains[k]); // inputs consumed aren't doubled
  gainXp(data.kills * H.xpPerKill * CONFIG.stages.xpPerKill(S.hero.stage) * stats('sustained').xp * mult);
  S.hero.totalKills += data.kills * mult;
}

// ---------- Founding (prestige) ----------
function maxGearTier() { let t = 0; for (const s in S.hero.gear) if (S.hero.gear[s]) t = Math.max(t, S.hero.gear[s].tier + 1); return t; }
function knowledgeGain() { return CONFIG.legacy.knowledge({ foundings: S.legacy.foundings, bestStage: bestStageAll(), bossesKilled: S.hero.bossesKilled, maxTier: maxGearTier(), lifetimeGold: S.lifetime.gold || 0 }); }
function foundCost() { return { gold: CONFIG.legacy.foundCostGold(S.legacy.kingdomLevel) }; }
function canFound() { return bestStageAll() >= CONFIG.legacy.foundRequiresStage && canAfford(foundCost()); }
function pathUnlocked(p) { return S.legacy.kingdomLevel >= (p.unlock || 1); }
function found(heroPathId, kingdomPathId) {
  if (!canFound()) return false;
  const hp = CONFIG.legacy.heroPaths.find(p => p.id === heroPathId), kp = CONFIG.legacy.kingdomPaths.find(p => p.id === kingdomPathId);
  if (!hp || !kp || !pathUnlocked(hp) || !pathUnlocked(kp)) return false;
  const gain = knowledgeGain(), leg = S.legacy;
  leg.history.push({ level: leg.kingdomLevel, bestStage: S.hero.bestStage, heroLevel: S.hero.level, knowledge: gain, heroPath: leg.heroPath, kingdomPath: leg.kingdomPath });
  leg.knowledge += gain; leg.kingdomLevel++; leg.foundings++;
  leg.heroPath = hp.id; leg.kingdomPath = kp.id;
  const keptWeapon = perkRank('oldblade') ? S.hero.gear.weapon : null;
  // Only Legacy carries over: Crystals, perks, paths, history and the Bestiary kill counts (trophies). Trees, talents, gear, stage, tech, plots all reset.
  const fresh = freshState(); fresh.legacy = leg; fresh.settings = S.settings; fresh.quests = S.quests;
  S = fresh;
  if (keptWeapon) S.hero.gear.weapon = keptWeapon;
  ensureThralls();
  grantTechTiers(perkRank('blueprints'));
  const ca = perkRank('cache'); if (ca) { add('gold', 1000 * ca); add('wood', 50 * ca); }
  log(`Founded Kingdom ${leg.kingdomLevel} as ${hp.name} of a ${kp.name}. +${gain} Knowledge`);
  log(`A new thrall joins you: ${S.kingdom.thralls[S.kingdom.thralls.length - 1].name}`);
  save();
  return gain;
}
function perkCost(p) { return Math.ceil(p.cost * Math.pow(p.costMult, perkRank(p.id))); }
function buyPerk(id) {
  const p = CONFIG.legacy.perks.find(p => p.id === id); if (!p || perkRank(id) >= p.max) return false;
  const c = perkCost(p); if (S.legacy.knowledge < c) return false;
  S.legacy.knowledge -= c; S.legacy.perks[id] = perkRank(id) + 1; return true;
}

// ---------- Save / Load ----------
function save() { S.lastTick = Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY); if (!raw) return null;
    const d = JSON.parse(raw), b = freshState();
    S = { ...b, ...d, res: { ...b.res, ...d.res }, kingdom: { ...b.kingdom, ...(d.kingdom || {}) }, tech: { ...(d.tech || {}) }, quests: { ...b.quests, ...(d.quests || {}) }, stats: { ...b.stats, ...(d.stats || {}) }, settings: { ...b.settings, ...d.settings },
      hero: { ...b.hero, ...d.hero, attr: { ...b.hero.attr, ...(d.hero || {}).attr }, gear: { ...b.hero.gear, ...(d.hero || {}).gear }, tools: { ...b.hero.tools, ...((d.hero || {}).tools || {}) }, grounds: { ...((d.hero || {}).grounds || {}) }, skillLv: { ...b.hero.skillLv, ...(d.hero || {}).skillLv } },
      legacy: { ...b.legacy, ...(d.legacy || {}), perks: { ...((d.legacy || {}).perks || {}) }, kills: { ...((d.legacy || {}).kills || {}) } } };
    ensureThralls();
    // Techniques come from the Combat tree now: rebuild loadout / levels from ranks (migrates old Skills-tab saves)
    S.hero.tree = S.hero.tree || {}; S.hero.dxp = S.hero.dxp || {}; S.hero.loadout = []; for (const s of CONFIG.skills) S.hero.skillLv[s.id] = 0;
    for (const n of CONFIG.trees.combat) if (n.tech && nodeRank('combat', n.id) >= 1) { S.hero.skillLv[n.tech] = nodeRank('combat', n.id) - 1; S.hero.loadout.push(n.tech); }
    if (!S.hero.dxp.combat && S.hero.level > 1) { let x = 0; for (let l = 1; l < S.hero.level; l++) x += CONFIG.discXpToLevel(l); S.hero.dxp.combat = x; } // old save: seed Combat from hero level
    return S;
  } catch (e) { return null; }
}
function exportSave() { return btoa(unescape(encodeURIComponent(JSON.stringify(S)))); }
function importSave(str) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(JSON.parse(decodeURIComponent(escape(atob(str.trim())))))); load(); return true; } catch (e) { return false; } }
function hardReset() { localStorage.removeItem(SAVE_KEY); S = freshState(); }

// ---------- Main loop ----------
let accumulator = 0, lastFrame = performance.now();
function frame(now) {
  let dt = (now - lastFrame) / 1000; lastFrame = now;
  dt = Math.min(dt, CONFIG.maxCatchupSeconds) * (S.settings.devSpeed || 1);
  accumulator += dt; const step = CONFIG.tickMs / 1000; let guard = 0;
  while (accumulator >= step && guard++ < 5000) { simulate(step); accumulator -= step; }
  UI.render(); requestAnimationFrame(frame);
}
// AFK handling: the game never runs in the background. Whenever it resumes (launch, or tab
// becomes visible again) it measures the gap since the last save and pays out AFK gains at
// CONFIG.offline.efficiency of the live rate, capped at CONFIG.offline.capSeconds.
let hiddenAt = null;
function resumeFromAfk(awaySeconds) {
  if (!(awaySeconds >= CONFIG.offline.minSecondsToShow)) return false;
  const d = applyOffline(awaySeconds);
  if (Object.values(d.gains).some(v => v > 0) || d.kills > 0) { UI.showWelcomeBack(d); return true; }
  return false;
}
function boot() {
  const loaded = load(); UI.init();
  if (loaded) {
    const away = Math.max(0, (Date.now() - (S.lastTick || Date.now())) / 1000); // clock set backwards → 0
    resumeFromAfk(away);
  }
  S.lastTick = Date.now(); lastFrame = performance.now();
  setInterval(save, CONFIG.autosaveMs);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = Date.now(); save(); }
    else {
      const away = hiddenAt ? (Date.now() - hiddenAt) / 1000 : 0; hiddenAt = null;
      lastFrame = performance.now(); accumulator = 0; // don't try to "catch up" live; AFK covers it
      resumeFromAfk(away); S.lastTick = Date.now();
    }
  });
  window.addEventListener('pagehide', save);
  requestAnimationFrame(frame);
}

window.Game = {
  get S() { return S; }, fmt, pct, fmtTime, drainEvents: () => EVENTS.splice(0), afkEfficiency: () => afkEff(),
  discXp, discLevel, discProgress, treeNode, nodeRank, nodeMax, nodeOpen, treePointsTotal, treePointsSpent, treePointsFree, canRankNode, rankNode, treeMods,
  stats, gearStats, itemStatPreview, gearCraftCost, gearUpgradeCost, canTierUp, craftGear, upgradeGear,
  talentPointsFree, talentPointsTotal, talentPointsSpent, respec, respecCost,
  skillDef, skillUnlocked, skillPower, skillCd, skillReady, castSkill, activeBuffs,
  enemyMaxHp, enemyDps, effectiveEnemyDps, enemyName, isBoss, stageType, enemyType, stageLabel, nextTypeName, stagePool, lootRarity, dropGated, killsNeeded, farmRate, stageDanger, heroRates,
  handDef, handUnlocked, grab, tierName,
  toolTierUnlocked, toolPower, toolCraftCost, toolUpgradeCost, canToolTierUp, craftTool, upgradeTool, activityDef, activityAvailable, setActivity, masteryLevel, harvestTime, harvestYield, harvestRates,
  questCurrent, questProgress, questClaim, suggestGoal, ground, setGround, groundUnlocked, dropToolMult, bestStageAll, groundDrops, toolSlotUnlocked,
  techDef, hasTech, techProgress, canResearch, research, buildingUnlocked, gearTierUnlocked, dropUnlocked, counter,
  kingdomRates, btype, plotCap, plotCost, canBuyPlot, buyPlot, buildCost, build, demolish, upgradeCost, upgradePlot, jobTime, jobOutputs, jobInputs, canStartJob, startJob, assign, heroFighting, thrallCount, sellPrice, sell,
  canAdvance, advance, retreat, canAfford, add, simulate, applyOffline, claimOffline,
  save, load, exportSave, importSave, hardReset,
  thrallName, thrallLevel, thrallProgress, thrallSpeed, typeKey, typeKills, bestiaryTier, bestiaryBonus, trophyTier, trophyCount, pinned, togglePin,
  afkCap, afkEff, perkRank, perkCost, buyPerk, heroPath, kingdomPath,
  knowledgeGain, foundCost, canFound, pathUnlocked, found, maxGearTier,
  // debug helpers
  debug: {
    giveAll(n) { for (const k in CONFIG.resources) add(k, n); },
    give(k, n) { add(k, n); },
    levels(n) { for (let i = 0; i < n; i++) { const cl = discLevel('combat'); gainDiscXp('combat', CONFIG.discXpToLevel(cl) - discProgress('combat').have); S.hero.level++; } S.hero.hp = stats().maxHp; },
    setStage(n) { S.hero.stage = Math.max(1, n | 0); S.hero.bestStage = Math.max(S.hero.bestStage, S.hero.stage); S.hero.kills = 0; S.hero.enemyHp = 0; },
    knowledge(n) { S.legacy.knowledge += n; },
    kingdomLevel(n) { S.legacy.kingdomLevel = Math.max(1, S.legacy.kingdomLevel + n); ensureThralls(); },
    questSkip() { S.quests.index = Math.min(CONFIG.quests.length, S.quests.index + 1); },
    techAll() { for (const t of CONFIG.techs) S.tech[t.id] = true; },
    resetRun() { const leg = S.legacy, st = S.settings; S = freshState(); S.legacy = leg; S.settings = st; save(); },
    resetAll() { hardReset(); save(); location.reload(); },
  },
};
