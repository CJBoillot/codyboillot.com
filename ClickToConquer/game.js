// ============================================================
// GAME ENGINE — Character (attributes/gear/skills/talents) / Kingdom / Crafting
// ============================================================

const SAVE_KEY = 'afk_proto_save_v12';
const OLD_SAVE_KEY = 'afk_proto_save_v11';

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
    kingdom: freshKingdom(),
    tech: {},
    quests: { index: 0, done: {} }, stats: { jobs: 0, sold: 0, focused: 0 }, // plots: {type, level, progress, running, worker: null|'hero'|thrallIndex}; thralls: [{name}]
    hero: {
      level: 1, xp: 0, stage: 1, bestStage: 1, kills: 0, hp: 10, enemyHp: 0, fistKills: 0, resting: false, totalKills: 0, time: 0, carry: 0,
      attr, gear, tools, skillLv, loadout: [], cds: {}, buffs: {}, talents: {}, tree: {}, dxp: {}, bossesKilled: {}, activity: 'idle', harvestTimer: 0, mastery: {}, ground: 'wilds', grounds: {}, hand: {},
    },
    lifetime: {}, lastTick: Date.now(), createdAt: Date.now(), settings: { devSpeed: 1, showLog: false }, revealed: {}, log: [],
    legacy: freshLegacy(),
  };
}
function freshKingdom() { return { steps: {}, thralls: [], offers: [], offerTimer: 0, storeLv: 0, renown: 0, orders: [], orderSeq: 0 }; }
function freshLegacy() {
  return { kingdomLevel: 1, knowledge: 0, perks: {}, heroPath: null, kingdomPath: null, foundings: 0, history: [], kills: {} }; // kills: bestiary counts per enemy type (persist — trophies)
}
function perkRank(id) { return (S.legacy.perks || {})[id] || 0; }
function heroPath() { return CONFIG.legacy.heroPaths.find(p => p.id === S.legacy.heroPath) || null; }
function kingdomPath() { return CONFIG.legacy.kingdomPaths.find(p => p.id === S.legacy.kingdomPath) || null; }

let S = freshState();

// ---------- Gear ----------
function tierName(slot, tier) { const t = CONFIG.tiers[tier]; return t.perSlot && t.perSlot[slot] ? t.perSlot[slot].name : t.name; }
// v0.3: slot value = tier + 0.1 × level; bare slot = 1 (+ fists levels for the weapon). Tier index 0 (Crude) = value 2.
function fistLevel() { return Math.min(9, Math.floor((S.hero.fistKills || 0) / CONFIG.fistKillsPerLevel)); }
function slotValue(slot, tier, level) {
  if (tier === -1) return 1 + (slot === 'weapon' ? 0.1 * fistLevel() : 0);
  if (tier === undefined) { const it = S.hero.gear[slot]; if (!it) return 1 + (slot === 'weapon' ? 0.1 * fistLevel() : 0); tier = it.tier; level = it.level; }
  return tier + 2 + 0.1 * (level || 0);
}
function slotStat(slot, v) { const d = CONFIG.slots[slot]; return d.primary === 'speed' ? d.per * v : d.per * v; }
function gearStats() { const g = {}; for (const slot in CONFIG.slots) { const d = CONFIG.slots[slot]; g[d.primary] = (g[d.primary] || 0) + slotStat(slot, slotValue(slot)); } return g; }
function itemStatPreview(slot, tier, level) { return { [CONFIG.slots[slot].primary]: slotStat(slot, slotValue(slot, tier, level)) }; }
function scaleCost(base, mult, level, extra = 1) { const c = {}; for (const k in base) c[k] = base[k] * Math.pow(mult, level) * extra; return c; }
function gearCraftCost(slot) { // cost to craft next tier (or first)
  const it = S.hero.gear[slot], next = it ? it.tier + 1 : 0;
  if (next >= CONFIG.tiers.length) return null;
  const t = CONFIG.tiers[next], ps = t.perSlot && t.perSlot[slot];
  return ps ? { ...ps.craftCost } : scaleCost(t.craftCost, 1, 0, CONFIG.slotCostMult[slot]);
}
function gearUpgradeCost(slot) {
  if (S.hero.gear[slot] && S.hero.gear[slot].level >= CONFIG.tierUpAt) return null;
  const it = S.hero.gear[slot]; if (!it) return null;
  const t = CONFIG.tiers[it.tier], ps = t.perSlot && t.perSlot[slot];
  return ps ? scaleCost(ps.upgradeCost, t.upgradeMult, it.level) : scaleCost(t.upgradeCost, t.upgradeMult, it.level, CONFIG.slotCostMult[slot]);
}
function canTierUp(slot) { const it = S.hero.gear[slot], next = it ? it.tier + 1 : 0; return next < CONFIG.tiers.length && gearTierUnlocked(next, slot) && (!it || it.level >= CONFIG.tierUpAt); }
// Forging takes CONFIG.craftSeconds; cost is paid up front, the item lands when the bar fills. One forge at a time.
function crafting() { return S.hero.crafting || null; }
function craftGear(slot) {
  if (crafting() || !canTierUp(slot)) return false;
  const c = gearCraftCost(slot); if (!c || !canAfford(c)) return false;
  pay(c);
  const it = S.hero.gear[slot];
  S.hero.crafting = { kind: 'gear', slot, t: 0, total: CONFIG.craftSeconds, name: `${tierName(slot, it ? it.tier + 1 : 0)} ${CONFIG.slots[slot].name}` };
  return true;
}
function finishCraft() {
  const cr = crafting(); if (!cr) return; S.hero.crafting = null;
  if (cr.kind === 'gear') { const it = S.hero.gear[cr.slot]; S.hero.gear[cr.slot] = { tier: it ? it.tier + 1 : 0, level: 0 }; log(`Forged ${cr.name}`); }
  else if (cr.kind === 'gearUp') { if (S.hero.gear[cr.slot]) S.hero.gear[cr.slot].level += cr.levels || 1; }
  else if (cr.kind === 'toolUp') { if (S.hero.tools[cr.slot]) S.hero.tools[cr.slot].level += cr.levels || 1; }
  else { const it = S.hero.tools[cr.slot]; S.hero.tools[cr.slot] = { tier: it ? it.tier + 1 : 0, level: 0 }; log(`Made a ${cr.name}`); }
  if (cr.kind === 'gear' || cr.kind === 'tool') pushEvent({ who: 'craft', name: cr.name });
}
function tickCraft(dt) { const cr = crafting(); if (!cr) return; cr.t += dt; if (cr.t >= cr.total) finishCraft(); }
function upgradeGear(slot) {
  if (crafting()) return false; const c = gearUpgradeCost(slot); if (!c || !canAfford(c)) return false;
  pay(c); const it = S.hero.gear[slot]; S.hero.crafting = { kind: 'gearUp', slot, t: 0, total: CONFIG.upgradeSeconds, name: `${tierName(slot, it.tier)} ${CONFIG.slots[slot].name} Lv${it.level + 1}` }; return true;
}

// Max: buy as many levels as you can afford (up to the tier-up point) in one timed upgrade.
function maxUpgradePlan(kind, slot) {
  const it = kind === 'gear' ? S.hero.gear[slot] : S.hero.tools[slot]; if (!it) return null;
  const costFn = kind === 'gear' ? gearUpgradeCost : toolUpgradeCost, pool = { ...S.res }, total = {}; let n = 0;
  const cap = Math.max(0, CONFIG.tierUpAt - it.level);
  const save = it.level;
  while (n < cap) { const c = costFn(slot); let ok = true; for (const k in c) if ((pool[k] || 0) < c[k]) { ok = false; break; } if (!ok) break; for (const k in c) { pool[k] -= c[k]; total[k] = (total[k] || 0) + c[k]; } it.level++; n++; }
  it.level = save;
  return n > 0 ? { levels: n, cost: total } : null;
}
function upgradeMax(kind, slot) {
  if (crafting()) return false; const plan = maxUpgradePlan(kind, slot); if (!plan) return false;
  pay(plan.cost); const it = kind === 'gear' ? S.hero.gear[slot] : S.hero.tools[slot];
  const name = kind === 'gear' ? `${tierName(slot, it.tier)} ${CONFIG.slots[slot].name}` : `${CONFIG.toolTiers[it.tier].name} ${CONFIG.toolSlots[slot].name}`;
  S.hero.crafting = { kind: kind === 'gear' ? 'gearUp' : 'toolUp', slot, t: 0, total: CONFIG.upgradeSeconds, levels: plan.levels, name: `${name} +${plan.levels}` }; return true;
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
function toolUpgradeCost(slot) { const it = S.hero.tools[slot]; if (!it || it.level >= CONFIG.tierUpAt) return null; const t = CONFIG.toolTiers[it.tier]; return scaleCost(t.upgradeCost, t.upgradeMult, it.level); }
function toolSlotUnlocked(slot) { return !CONFIG.techs.some(t => t.unlocks.tool === slot) || CONFIG.techs.some(t => t.unlocks.tool === slot && hasTech(t.id)); }
function canToolTierUp(slot) { const it = S.hero.tools[slot], next = it ? it.tier + 1 : 0; return toolSlotUnlocked(slot) && next < CONFIG.toolTiers.length && toolTierUnlocked(next) && (!it || it.level >= CONFIG.tierUpAt); }
function craftTool(slot) { if (crafting() || !canToolTierUp(slot)) return false; const c = toolCraftCost(slot); if (!c || !canAfford(c)) return false; pay(c); const it = S.hero.tools[slot]; S.hero.crafting = { kind: 'tool', slot, t: 0, total: CONFIG.craftSeconds, name: `${CONFIG.toolTiers[it ? it.tier + 1 : 0].name} ${CONFIG.toolSlots[slot].name}` }; return true; }
function upgradeTool(slot) { if (crafting()) return false; const c = toolUpgradeCost(slot); if (!c || !canAfford(c)) return false; pay(c); const it = S.hero.tools[slot]; S.hero.crafting = { kind: 'toolUp', slot, t: 0, total: CONFIG.upgradeSeconds, name: `${CONFIG.toolTiers[it.tier].name} ${CONFIG.toolSlots[slot].name} Lv${it.level + 1}` }; return true; }
function activityDef(id) { return CONFIG.activities[id]; }
function activityAvailable(id) { const a = activityDef(id); return !!a && (!a.tool || !!S.hero.tools[a.tool]) && (!a.gear || !!S.hero.gear[a.gear]); }
function setActivity(id) { if (!activityAvailable(id)) return false; S.hero.activity = id; S.hero.harvestTimer = 0; S.hero.chose = S.hero.chose || {}; S.hero.chose[id] = true; if (id !== 'fight') { S.hero.resting = false; S.hero.enemyHp = 0; } return true; }
function heroFighting() { return S.hero.activity === 'fight' && activityAvailable('fight'); }
function masteryLevel(id) { return Math.floor(Math.sqrt((S.hero.mastery[id] || 0) / 10)); } // swings → level; +2% speed each
function harvestTime(id) { const a = activityDef(id), p = toolPower(a.tool), tm = treeMods(id); return a.time / (Math.pow(p, 0.5)) / (1 + (tm.harvestSpeed || 0)) / (1 + 0.02 * masteryLevel(id)); }
function outputGated(k) { const g = CONFIG.harvestGate && CONFIG.harvestGate[k]; return !!g && !hasTech(g); }
function harvestYield(id) { const a = activityDef(id), p = toolPower(a.tool), tm = treeMods(id), o = {}; for (const k in a.outputs) { if (outputGated(k)) continue; o[k] = a.outputs[k] * Math.pow(p, 0.5) * (1 + (tm.harvestYield || 0)) * (1 + (tm.harvestDouble || 0)); } const side = treeSide(id); for (const k in side) o[k] = (o[k] || 0) + side[k]; return o; }
function harvestRates(id = S.hero.activity) { if (id === 'fight' || id === 'idle' || !activityAvailable(id)) return {}; const y = harvestYield(id), t = harvestTime(id), r = {}; for (const k in y) r[k] = y[k] / t; return r; }
function questWantsHarvest(k) { const q = questCurrent(); if (!q) return false; return q.steps.some(st => st.check.harvested === k && ((S.stats.harvested || {})[k] || 0) < st.check.need); }
function tickHarvest(dt) {
  const id = S.hero.activity; if (id === 'fight' || id === 'idle') return;
  if (!activityAvailable(id)) { S.hero.activity = 'idle'; return; }
  { const outs = Object.keys(harvestYield(id)); if (outs.length && outs.every(atCap) && !outs.some(questWantsHarvest)) { S.hero.activity = 'idle'; S.hero.harvestTimer = 0; log(`Pack full: ${outs.map(k => CONFIG.resources[k].name.toLowerCase()).join(', ')}. Resting.`); pushEvent({ who: 'packfull' }); return; } }
  S.hero.harvestTimer += dt; const t = harvestTime(id);
  while (S.hero.harvestTimer >= t) { S.hero.harvestTimer -= t; const y = harvestYield(id), got = {}; for (const k in y) { const n = Math.floor(y[k]) + (Math.random() < y[k] - Math.floor(y[k]) ? 1 : 0); if (n > 0) { add(k, n); got[k] = n; S.stats.harvested = S.stats.harvested || {}; S.stats.harvested[k] = (S.stats.harvested[k] || 0) + n; } } S.hero.mastery[id] = (S.hero.mastery[id] || 0) + 1; gainDiscXp(id, CONFIG.discXpPerSwing); pushEvent({ who: 'harvest', yield: got }); }
}

// ---------- Disciplines & skill trees ----------
function discXp(d) { return (S.hero.dxp && S.hero.dxp[d]) || 0; }
function discLevel(d) { let lvl = 1, x = discXp(d); while (x >= CONFIG.discXpToLevel(lvl) && lvl < 200) { x -= CONFIG.discXpToLevel(lvl); lvl++; } return lvl; }
function discProgress(d) { let lvl = 1, x = discXp(d); while (x >= CONFIG.discXpToLevel(lvl) && lvl < 200) { x -= CONFIG.discXpToLevel(lvl); lvl++; } return { level: lvl, have: x, need: CONFIG.discXpToLevel(lvl) }; }
function gainDiscXp(d, n) { if (!CONFIG.disciplines[d]) return; S.hero.dxp = S.hero.dxp || {}; const before = discLevel(d); S.hero.dxp[d] = (S.hero.dxp[d] || 0) + n; const after = discLevel(d); if (after > before) log(`${CONFIG.disciplines[d].name} level ${after}!`); }
function treeNode(d, id) { return (CONFIG.trees[d] || []).find(n => n.id === id); }
function nodeRank(d, id) { return (S.hero.tree && S.hero.tree[d] && S.hero.tree[d][id]) || 0; }
function nodeMax(n) { return n.capstone ? 1 : CONFIG.treeRanks; }
function nodeQuestLocked(d, id) { const n = treeNode(d, id); if (!n || !n.quest || S.legacy.foundings > 0 || nodeRank(d, id) > 0) return false; const qi = CONFIG.quests.findIndex(q => q.id === n.quest); return qi >= 0 && S.quests.index < qi; }
function nodeOpen(d, id) { const n = treeNode(d, id); if (!n) return false; if (nodeQuestLocked(d, id)) return false; if (!n.parent || n.capstone) return true; const p = treeNode(d, n.parent); return nodeRank(d, n.parent) >= nodeMax(p); }
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
  st.attack = (g.attack || 1) * (1 + (m.attackPct || 0));
  st.speed = (1 + (g.speed || 0)) * (1 + (m.speedPct || 0));
  st.crit = Math.min(1, (g.crit || 0) + (m.crit || 0));
  st.critDmg = H.baseCritDmg + (m.critDmg || 0);
  st.dps = st.attack * st.speed * (1 + st.crit * (st.critDmg - 1));
  st.maxHp = (g.hp || 10) * (1 + (m.hpPct || 0));
  st.regen = st.maxHp * H.regenPctOfMax * (1 + (m.regenPct || 0));
  st.armor = H.baseArmor + (g.armor || 0) + (m.armor || 0);
  st.dr = Math.min(0.7, m.dr || 0);
  st.dodge = Math.min(0.5, g.dodge || 0);
  st.drop = 1 + (m.dropPct || 0);
  st.gold = st.drop * (1 + (m.goldPct || 0));
  st.xp = 1 + (m.xpPct || 0);
  st.bossDmg = 1 + (m.bossDmg || 0);
  st.restSpeed = H.restMult * (1 + (m.restSpeed || 0));
  if (mode === 'sustained') { const s = sustainedSkillDps(st); st.dps += s.dps; st.regen += s.heal; }
  return st;
}
function effectiveEnemyDps(st, stage = S.hero.stage) {
  const hit = enemyHit(stage) * (1 - bestiaryBonus(typeKey(stage)));
  return Math.max(hit * 0.2, hit - st.armor) * (1 - st.dr) * (1 - st.dodge) / H.enemyAttackInterval;
}

// ---------- Enemies ----------
// Stage → enemy type + sub-stage (1..10). Past the end of a line the last type repeats as "Elder …".
function stageType(stage = S.hero.stage) { const per = CONFIG.stages.perType; return { t: Math.floor((stage - 1) / per), k: (stage - 1) % per + 1 }; }
function enemyType(stage = S.hero.stage, gid = S.hero.ground) { const L = CONFIG.grounds[gid].line, { t } = stageType(stage); return L[Math.min(t, L.length - 1)]; }
function enemyTypeLoops(stage = S.hero.stage, gid = S.hero.ground) { const L = CONFIG.grounds[gid].line, { t } = stageType(stage); return Math.max(0, t - (L.length - 1)); }
function isBoss(stage = S.hero.stage) { return stageType(stage).k === CONFIG.stages.perType; }
function effType(stage = S.hero.stage, gid = S.hero.ground) { return stageType(stage).t + (CONFIG.stages.groundOffset[gid] || 0); }
function enemyMaxHp(stage = S.hero.stage, gid = S.hero.ground) { const t = effType(stage, gid), { k } = stageType(stage), R = CONFIG.stages.refHit(t); return Math.max(1, Math.round(isBoss(stage) ? R * 8 : R * (2 + (k - 1) / 8))); }
function enemyHit(stage = S.hero.stage, gid = S.hero.ground) { const t = effType(stage, gid), { k } = stageType(stage), hp = CONFIG.stages.refHeroHp(t); return Math.round((isBoss(stage) ? hp * 0.15 : hp * (0.05 + 0.10 * (k - 1) / 8)) * 10) / 10; }
function enemyDps(stage = S.hero.stage) { return enemyHit(stage) / H.enemyAttackInterval; }
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
// Caps: P0 = the Pack (100, Leather Pack 150). P1+ = the Storehouse (§7.6 of the v0.3 design).
function resId(k) { return k; }
function resCap(k) {
  if (S.legacy.foundings === 0) { const pk = hasTech('leatherwork') ? CONFIG.caps.leatherPack : CONFIG.caps.pack; return resId(k) === 'gold' ? pk * CONFIG.caps.goldMult : pk; }
  return storeCap(k);
}
function atCap(k) { return (S.res[k] || 0) >= resCap(k) - 1e-9; }
function add(resId, amt) {
  if (!amt) return 0;
  const cap = resCap(resId), before = S.res[resId] || 0;
  let v = before + amt; if (amt > 0) v = Math.min(v, Math.max(cap, before));
  const got = v - before; S.res[resId] = v;
  if (got > 0) S.lifetime[resId] = (S.lifetime[resId] || 0) + got;
  return got;
}
function storeCap(k) { const c = Math.round((S.legacy.foundings > 0 ? tierDef().cap : CONFIG.caps.store) * (1 + (S.kingdom.storeLv || 0) * 0.5) * (rankIndex() >= 1 ? 2 : 1) * (1 + 0.25 * perkRank('cellar'))); return k === 'gold' ? c * CONFIG.caps.goldMult : c; }
// Storehouse delivery: whatever does not fit is sold to passing merchants, cheaply.
function storeDeliver(k, n) { const got = add(k, n), extra = n - got; if (extra > 0 && CONFIG.resources[k].sell) { const g = extra * CONFIG.resources[k].sell * KC().autoSell; add('gold', g); S.kingdom.autoSold = (S.kingdom.autoSold || 0) + g; } S.stats.made = S.stats.made || {}; S.stats.made[k] = (S.stats.made[k] || 0) + n; return got; }
function canAfford(cost) { if (!cost) return false; for (const k in cost) if ((S.res[k] || 0) < cost[k]) return false; return true; }
function pay(cost) { for (const k in cost) S.res[k] -= cost[k]; }

// ---------- Kingdom (v0.3): production lines, steps, carts, thralls, overseers, orders, renown ----------
const THRALL_NAMES = ['Brann', 'Ysolde', 'Kettil', 'Marra', 'Osric', 'Thyra', 'Gundar', 'Liv', 'Halvar', 'Sigrun', 'Rurik', 'Eydis', 'Torvald', 'Asta', 'Bjorn', 'Freya', 'Ulf', 'Helga', 'Ragna', 'Sten'];
const KC = () => CONFIG.kingdom;
function kingdomNo() { return S.legacy.foundings; } // Kingdom N = the Nth founding; 0 = still in the wild
function allSteps() { const o = []; for (const lid in KC().lines) KC().lines[lid].steps.forEach((st, i) => o.push({ ...st, line: lid, index: i })); return o; }
function stepDef(id) { return allSteps().find(s => s.id === id); }
// Settlement tier (Camp 0 → Hamlet 1 → Village 2 → City 3). A step is available at its tier, and runs once built.
function kTier() { return S.kingdom.tier || 0; }
function tierDef(t = kTier()) { return KC().tiers[Math.min(t, KC().tiers.length - 1)]; }
function stepAvailable(id) { const d = stepDef(id); return !!d && kingdomNo() > 0 && d.tier <= kTier(); }
function stepBuilt(id) { const d = stepDef(id); return !!d && stepAvailable(id) && (!d.build || !!(S.kingdom.built || {})[id]); }
function stepUnlocked(id) { return stepBuilt(id); }
function canBuild(id) { const d = stepDef(id); return stepAvailable(id) && !stepBuilt(id) && canAfford(d.build); }
function buildStep(id) { if (!canBuild(id)) return false; pay(stepDef(id).build); S.kingdom.built = S.kingdom.built || {}; S.kingdom.built[id] = true; log(`Built the ${stepDef(id).name}.`); return true; }
function lineUnlocked(lid) { return kingdomNo() > 0 && KC().lines[lid].steps.some(s => s.tier <= kTier()); }
function lineSteps(lid) { return KC().lines[lid].steps.map((s, i) => ({ ...s, line: lid, index: i })).filter(s => stepBuilt(s.id)); }
// Raising the settlement: every current-tier step built and staffed, and `cap` of every good made so far paid in.
function tierGoods() { return allSteps().filter(st => st.tier <= kTier()).map(st => st.make); }
function tierNeed() { const t = kTier(); if (t >= KC().tiers.length - 1) return null; const n = tierDef(t).cap, o = {}; for (const k of tierGoods()) o[k] = n; return o; }
function tierPaid() { return S.kingdom.tierPaid || {}; }
function tierPaidDone() { const need = tierNeed(); if (!need) return true; for (const k in need) if ((tierPaid()[k] || 0) < need[k]) return false; return true; }
function tierStepsReady() { return allSteps().filter(st => st.tier === kTier()).every(st => stepBuilt(st.id) && stepState(st.id).workers.length > 0); }
function contribute() { const need = tierNeed(); if (!need) return 0; S.kingdom.tierPaid = S.kingdom.tierPaid || {}; let n = 0; for (const k in need) { const m = Math.min(Math.floor(S.res[k] || 0), need[k] - (S.kingdom.tierPaid[k] || 0)); if (m > 0) { S.res[k] -= m; S.kingdom.tierPaid[k] = (S.kingdom.tierPaid[k] || 0) + m; n += m; } } return n; }
function canRaise() { return !!tierNeed() && tierPaidDone() && tierStepsReady(); }
function raiseTier() { if (!canRaise()) return false; S.kingdom.tier = kTier() + 1; S.kingdom.tierPaid = {}; log(`Your settlement is now a ${tierDef().name}!`); return true; }
function accountantSteps() { return allSteps().filter(st => st.tier === 2); }
function cityChecks() {
  const all = allSteps();
  return { city: kTier() >= 3, built: all.filter(st => stepBuilt(st.id)).length, crews: all.filter(st => stepBuilt(st.id) && stepState(st.id).workers.length >= 3).length,
    overseers: all.filter(st => stepBuilt(st.id) && stepState(st.id).overseer !== null).length, accountants: accountantSteps().filter(st => stepBuilt(st.id) && stepState(st.id).accountant != null).length, steps: all.length, finals: accountantSteps().length };
}
function cityComplete() { const c = cityChecks(); return c.city && c.crews >= c.steps && c.overseers >= c.steps && c.accountants >= c.finals; }
function stepState(id) { const K = S.kingdom; K.steps = K.steps || {}; if (!K.steps[id]) K.steps[id] = { rate: 1, haul: 1, cart: 1, inBuf: 0, phase: 0, t: 0, workers: [], overseer: null, abilityUntil: 0, abilityReady: 0 }; const st = K.steps[id]; if (st.phase === undefined) { st.phase = 0; st.t = 0; } return st; }
function nextStep(id) { const d = stepDef(id); const n = KC().lines[d.line].steps[d.index + 1]; return n && stepUnlocked(n.id) ? n : null; }
function thrall(i) { return S.kingdom.thralls[i]; }
function thrallName(i) { const t = thrall(i); return t ? t.name : 'Thrall'; }
function thrallLevel(t) { return t ? 1 + Math.floor(Math.sqrt((t.xp || 0) / KC().thrallXpDiv)) : 1; }
function thrallLvMult(t) { return 1 + KC().thrallLvBonus * (thrallLevel(t) - 1); }
function thrallCap() { return tierDef().thralls; }
function roleMult(t, role) { if (!t || t.role !== role) return 1; return (KC().starMult[t.stars] || 1) * (1 + 0.02 * (thrallLevel(t) - 1)); }
function stepWorkerSlots(id) { return tierDef().slots; }
function stepMods(id) {
  const s = stepState(id), ov = s.overseer !== null ? thrall(s.overseer) : null, now = S.hero.time;
  const ws = s.workers.map(thrall).filter(Boolean);
  const boost = s.abilityUntil > now ? 2 : 1;
  const spd = ws.reduce((a, t) => a + t.spd * thrallLvMult(t), 0), str = ws.reduce((a, t) => a + t.str * thrallLvMult(t), 0);
  return {
    rate: (1 + KC().extraWorker * Math.max(0, ws.length - 1) + KC().statPct * spd) * roleMult(ov, 'foreman') * boost,
    haul: roleMult(ov, 'carter') * boost,
    cart: (1 + KC().statPct * str) * roleMult(ov, 'packer') * boost,
    working: ws.length > 0,
  };
}
// One production cycle = Work (make a batch) → Cart (load it) → Haul (deliver it). Each track shortens its own phase, forever.
const trackGrow = lv => 1 + KC().trackGrowth * (lv - 1);
function nextBufCap(nx) { return nx.ratio * nx.batch * 2; }
function stepBatch(id) { return stepDef(id).batch; }
function stepRate(id) { const d = stepDef(id), s = stepState(id); return d.base * trackGrow(s.rate) * stepMods(id).rate; }
function stepPhases(id) { const s = stepState(id), m = stepMods(id); return [stepBatch(id) / stepRate(id), KC().loadBase / trackGrow(s.cart) / m.cart, KC().haulBase / trackGrow(s.haul) / m.haul]; }
function stepCycle(id) { return stepPhases(id).reduce((a, b) => a + b, 0); }
function stepOutput(id) { if (!stepMods(id).working) return 0; return stepBatch(id) / stepCycle(id); }
function stepLimit(id) { // what holds the step back — shown only when an Overseer is present
  const s = stepState(id), d = stepDef(id);
  if (!stepMods(id).working) return 'idle';
  if (d.from && s.phase === 0 && s.inBuf < d.ratio * 0.5) return 'starved';
  const p = stepPhases(id), mx = Math.max(...p); return ['rate', 'cart', 'haul'][p.indexOf(mx)];
}
function stepUpCost(id, track, level) { const l = level || stepState(id)[track]; return { gold: Math.round(KC().costBase * Math.pow(l, KC().costExp) * (track === 'rate' ? 1 : KC().haulCostMult)) }; }
function stepUpPlan(id, track, n) { let g = 0, k = 0, l = stepState(id)[track]; const lim = n === 'max' ? 999 : n; while (k < lim) { const c = stepUpCost(id, track, l + k).gold; if ((S.res.gold || 0) < g + c) break; g += c; k++; } return { n: k, cost: { gold: g } }; }
function upgradeStep(id, track, n = 1) { if (!stepUnlocked(id)) return false; const p = stepUpPlan(id, track, n); if (!p.n) return false; pay(p.cost); stepState(id)[track] += p.n; return p.n; }
function assignWorker(id, i) { if (!stepUnlocked(id) || !thrall(i)) return false; unassign(i); const s = stepState(id); if (s.workers.length >= stepWorkerSlots(id)) return false; s.workers.push(i); return true; }
function assignOverseer(id, i) { if (!stepUnlocked(id) || !thrall(i)) return false; unassign(i); const s = stepState(id); if (s.overseer !== null) s.overseer = null; s.overseer = i; return true; }
function unassign(i) { for (const id in (S.kingdom.steps || {})) { const s = S.kingdom.steps[id]; s.workers = s.workers.filter(x => x !== i); if (s.overseer === i) s.overseer = null; if (s.accountant === i) s.accountant = null; } }
function assignAccountant(id, i) { if (!stepUnlocked(id) || stepDef(id).tier !== 2 || !thrall(i)) return false; unassign(i); stepState(id).accountant = i; return true; }
function thrallPost(i) { for (const id in (S.kingdom.steps || {})) { const s = S.kingdom.steps[id]; if (s.overseer === i) return { id, as: 'overseer' }; if (s.accountant === i) return { id, as: 'accountant' }; if (s.workers.includes(i)) return { id, as: 'worker' }; } return null; }
function useAbility(id) { const s = stepState(id), now = S.hero.time; if (s.overseer === null || s.abilityReady > now) return false; s.abilityUntil = now + KC().abilitySeconds; s.abilityReady = now + KC().abilityCooldown; S.stats.shifts = (S.stats.shifts || 0) + 1; log(`${thrallName(s.overseer)}: Double shift at the ${stepDef(id).name}!`); return true; }
// Tavern: 3 offers, refresh on a timer or for gold
function maxStars() { return 3 + (rankIndex() >= 2 ? 1 : 0) + (rankIndex() >= 3 ? 1 : 0); }
function rollThrall() {
  const roles = ['foreman', 'carter', 'packer'], r = Math.random(), top = maxStars();
  let stars = r < 0.5 ? 1 : r < 0.8 ? 2 : r < 0.93 ? 3 : r < 0.985 ? 4 : 5; stars = Math.min(stars, top);
  const used = new Set(S.kingdom.thralls.map(t => t.name));
  const free = THRALL_NAMES.filter(n => !used.has(n) && !(S.kingdom.offers || []).some(o => o.name === n)); const name = free.length ? free[Math.floor(Math.random() * free.length)] : 'Thrall ' + (S.kingdom.thralls.length + 1);
  const st = () => stars + Math.floor(Math.random() * (stars + 2));
  return { name, role: roles[Math.floor(Math.random() * 3)], stars, str: st(), spd: st(), price: KC().hirePrice[stars], xp: 0 };
}
function refreshOffers(pay_ = false) { if (pay_) { const c = { gold: KC().refreshCost }; if (!canAfford(c)) return false; pay(c); } S.kingdom.offers = []; for (let k = 0; k < 3; k++) S.kingdom.offers.push(rollThrall()); if (!S.kingdom.thralls.length) { const o = S.kingdom.offers[0]; o.stars = 1; o.str = 1 + Math.floor(Math.random() * 3); o.spd = 1 + Math.floor(Math.random() * 3); o.price = KC().hirePrice[1]; } S.kingdom.offerTimer = KC().offerRefresh; return true; }
function hire(i) { const o = (S.kingdom.offers || [])[i]; if (!o || S.kingdom.thralls.length >= thrallCap()) return false; const c = { gold: o.price }; if (!canAfford(c)) return false; pay(c); S.kingdom.thralls.push({ ...o, price: undefined }); S.kingdom.offers.splice(i, 1); S.kingdom.offers.splice(i, 0, rollThrall()); log(`Hired ${o.name}, ${'★'.repeat(o.stars)} ${o.role}`); return true; }
function thrallCount() { return S.kingdom.thralls.length; }
function dismiss(i) { const t = thrall(i); if (!t) return false; unassign(i); S.kingdom.thralls.splice(i, 1);
  for (const id in S.kingdom.steps) { const s = S.kingdom.steps[id]; s.workers = s.workers.map(x => x > i ? x - 1 : x); if (s.overseer !== null && s.overseer > i) s.overseer--; if (s.accountant != null && s.accountant > i) s.accountant--; }
  log(`${t.name} was sent on his way.`); return true; }
function migrate05() {
  const K = S.kingdom; if (S.legacy.foundings < 1 || K.tier !== undefined) return;
  const old = { logging: 1, fields: 2, shaft: 3, sawmill: 4, mill: 5, smelter: 6, carpenter: 7, baker: 8, forge: 9 }, f = S.legacy.foundings;
  K.built = {}; for (const id in old) if (f >= old[id]) K.built[id] = true;
  K.tier = f >= 7 ? 2 : f >= 4 ? 1 : 0; K.tierPaid = {};
  const kq = CONFIG.quests.findIndex(q => q.id === 'k05'); if (kq >= 0 && S.quests.index > kq) S.quests.index = kq + 1;
  S.legacy.foundings = 1; // everything so far was one land growing
}
function ensureThralls() { const K = S.kingdom; migrate05(); K.steps = K.steps || {}; K.thralls = K.thralls || []; if (!K.offers || !K.offers.length) refreshOffers(); K.orders = K.orders || []; while (kingdomNo() > 0 && K.orders.length < 3 && orderGoods(true).length) K.orders.push(makeOrder()); }
// Storehouse level
function storeUpCost() { return { gold: Math.round(150 * Math.pow((S.kingdom.storeLv || 0) + 1, 1.8)) }; }
function upgradeStore() { const c = storeUpCost(); if (!canAfford(c)) return false; pay(c); S.kingdom.storeLv = (S.kingdom.storeLv || 0) + 1; return true; }
// Live tick: each step fills its cart; the cart delivers to the next step's input, or to the Storehouse.
function tickKingdom(dt) {
  if (kingdomNo() < 1) return;
  const K = S.kingdom;
  K.offerTimer = (K.offerTimer || KC().offerRefresh) - dt; if (K.offerTimer <= 0) refreshOffers();
  { const g = orderGoods(); (K.orders || []).forEach((o, i) => { if (Object.keys(o.wants).some(k => !g.includes(k) && !((S.lifetime[k] || 0) > 0 && KC().heroOrderGoods.includes(k)) && (S.res[k] || 0) < o.wants[k])) K.orders.splice(i, 1, makeOrder(i)); });
    const seen = []; K.orders.forEach((o, i) => { const k = Object.keys(o.wants)[0]; if (seen.includes(k) && orderGoods().filter(g => !K.orders.some(x => Object.keys(x.wants)[0] === g)).length) K.orders.splice(i, 1, makeOrder(i)); else seen.push(k); }); }
  for (const lid in KC().lines) {
    for (const st of lineSteps(lid)) {
      const s = stepState(st.id), m = stepMods(st.id); if (!m.working) continue;
      const P = stepPhases(st.id), nx = nextStep(st.id), batch = stepBatch(st.id);
      let left = dt, guard = 0;
      while (left > 1e-9 && guard++ < 200) {
        const dur = P[s.phase];
        if (s.t >= dur) {} // an upgrade can shorten a phase below the time already spent: finish it now
        else if (s.phase === 0 && st.from) { // crafting eats its input as it goes
          const perSec = st.ratio * batch / dur, can = s.inBuf / perSec, adv = Math.min(left, dur - s.t, can);
          if (adv <= 1e-9) break; s.inBuf -= adv * perSec; s.t += adv; left -= adv;
        } else { const adv = Math.min(left, dur - s.t); s.t += adv; left -= adv; }
        if (s.t >= dur - 1e-9) {
          if (s.phase === 2) { // delivered
            let rest = batch; if (nx && stepMods(nx.id).working) { const b = stepState(nx.id), room = Math.max(0, nextBufCap(nx) - b.inBuf), take = Math.min(room, rest); b.inBuf += take; rest -= take; } // the next building takes what it can use
            if (rest > 0) storeDeliver(st.make, rest);
            for (const w of s.workers) { const t = thrall(w); if (t) t.xp = (t.xp || 0) + 1; }
            if (s.overseer !== null && thrall(s.overseer)) thrall(s.overseer).xp = (thrall(s.overseer).xp || 0) + 1;
          }
          s.phase = (s.phase + 1) % 3; s.t = 0;
        }
      }
    }
  }
  for (const st of accountantSteps()) { // accountants sell a final good above the reserve
    const s = stepState(st.id); if (!stepBuilt(st.id) || s.accountant == null || !thrall(s.accountant)) continue;
    const keep = Math.floor(resCap(st.make) * KC().accountantReserve), extra = Math.floor((S.res[st.make] || 0) - keep); if (extra <= 0) continue;
    const g = extra * CONFIG.resources[st.make].sell * KC().accountantShare * (1 + 0.02 * (thrallLevel(thrall(s.accountant)) - 1));
    S.res[st.make] -= extra; add('gold', g); S.kingdom.acctSold = (S.kingdom.acctSold || 0) + g; thrall(s.accountant).xp = (thrall(s.accountant).xp || 0) + extra / 10;
  }
}
// Rates (per second, steady state) for display and offline: each line's final unlocked step feeds the Storehouse.
function kingdomRates() {
  const r = {}; if (kingdomNo() < 1) return r;
  for (const lid in KC().lines) {
    const steps = lineSteps(lid); let supply = 0;
    for (let i = 0; i < steps.length; i++) {
      const st = steps[i]; if (!stepMods(st.id).working) break;
      const out = i === 0 ? stepOutput(st.id) : Math.min(stepOutput(st.id), supply / st.ratio);
      const nx = steps[i + 1] && stepMods(steps[i + 1].id).working ? steps[i + 1] : null;
      if (!nx) { if (out > 0) r[st.make] = (r[st.make] || 0) + out; break; }
      const used = Math.min(out, stepOutput(nx.id) * nx.ratio); if (out - used > 1e-9) r[st.make] = (r[st.make] || 0) + (out - used); supply = used;
    }
  }
  return r;
}
// Orders
// Goods an Order may ask for: what the kingdom delivers to the Storehouse, best goods first; then goods the hero gathers.
function orderGoods(all = false) {
  const kg = [];
  for (const lid in KC().lines) { const steps = lineSteps(lid); for (let k = steps.length - 1; k >= 0; k--) { const st = steps[k]; if (stepMods(st.id).working && !kg.includes(st.make)) kg.push(st.make); } }
  for (const k in kingdomRates()) if (!kg.includes(k)) kg.push(k);
  if (!kg.length) { const f = lineSteps(Object.keys(KC().lines)[0]); if (f.length) kg.push(f[0].make); }
  const hero = KC().heroOrderGoods.filter(k => (S.lifetime[k] || 0) > 0 && !kg.includes(k));
  return kg.length >= 3 ? kg : kg.concat(hero.slice(0, 3 - kg.length));
}
function swapReady() { return S.hero.time >= (S.kingdom.swapAt || 0); }
function swapOrder(i) { if (!S.kingdom.orders[i] || !swapReady()) return false; S.kingdom.orders.splice(i, 1, makeOrder(i)); S.kingdom.swapAt = S.hero.time + KC().swapCooldown; return true; }
function makeOrder(slot = -1) {
  const pool = orderGoods(), taken = (S.kingdom.orders || []).filter((o, i) => o && i !== slot).map(o => Object.keys(o.wants)[0]);
  const fresh = pool.filter(k => !taken.includes(k)), pickFrom = fresh.length ? fresh : pool;
  const from = KC().orderFrom[Math.floor(Math.random() * KC().orderFrom.length)], mult = 1 + 0.5 * rankIndex();
  const heroAvail = KC().heroOrderGoods.filter(k => (S.lifetime[k] || 0) > 0 && !taken.includes(k)), heroOpen = !(S.kingdom.orders || []).some((o, i) => i !== slot && o && KC().heroOrderGoods.includes(Object.keys(o.wants)[0]));
  const kFirst = pickFrom.filter(k => !KC().heroOrderGoods.includes(k));
  const src = heroAvail.length && heroOpen && kFirst.length && Math.random() < KC().heroOrderChance ? heroAvail : kFirst.length ? kFirst : pickFrom;
  const main = src[Math.floor(Math.random() * Math.min(src.length, 4))];
  const pick = [main]; const others = pool.filter(k => k !== main && !taken.includes(k)); if (pool.length >= 5 && others.length && Math.random() < 0.3) pick.push(others[Math.floor(Math.random() * others.length)]);
  const wants = {}; for (const k of pick) wants[k] = Math.max(5, Math.round((KC().orderBase[k] || 20) * mult));
  let gold = 0, renown = 0; for (const k in wants) { gold += wants[k] * CONFIG.resources[k].sell * KC().orderGoldMult; renown += wants[k] * (KC().renownPer[k] || 1); }
  S.kingdom.orderSeq = (S.kingdom.orderSeq || 0) + 1;
  return { id: S.kingdom.orderSeq, from, wants, gold: Math.round(gold), renown: Math.round(renown), bonusBy: S.hero.time + KC().orderBonusSeconds };
}
function canDeliver(i) { const o = (S.kingdom.orders || [])[i]; return !!o && canAfford(o.wants); }
function deliver(i) {
  const o = S.kingdom.orders[i]; if (!o || !canAfford(o.wants)) return false;
  pay(o.wants);
  if (KC().tierOrders) { const need = tierNeed(); if (need) { S.kingdom.tierPaid = S.kingdom.tierPaid || {}; for (const k in o.wants) if (need[k]) S.kingdom.tierPaid[k] = Math.min(need[k], (S.kingdom.tierPaid[k] || 0) + o.wants[k]); } }
  const fast = S.hero.time <= o.bonusBy, m = fast ? 1 + KC().speedBonus : 1;
  S.res.gold = (S.res.gold || 0) + Math.round(o.gold * m); S.lifetime.gold = (S.lifetime.gold || 0) + Math.round(o.gold * m);
  const rb = rankIndex(); S.kingdom.renown = (S.kingdom.renown || 0) + Math.round(o.renown * m); S.stats.orders = (S.stats.orders || 0) + 1;
  log(`Order delivered to ${o.from}: +${Math.round(o.gold * m)} gold, +${Math.round(o.renown * m)} Renown${fast ? ' (speed bonus)' : ''}`);
  if (rankIndex() > rb) log(`You are now a ${KC().ranks[rankIndex()].name}!`);
  S.kingdom.orders.splice(i, 1, makeOrder(i)); return true;
}
function rankIndex() { const r = S.kingdom.renown || 0; let i = 0; KC().ranks.forEach((x, j) => { if (r >= x.renown) i = j; }); return i; }
function rankInfo() { const i = rankIndex(), R = KC().ranks; return { i, cur: R[i], next: R[i + 1] || null, renown: S.kingdom.renown || 0 }; }

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
// Research takes CONFIG.researchSeconds; cost paid up front, tech lands when the bar fills. One at a time.
function researching() { return S.researching || null; }
function research(id) { if (researching() || !canResearch(id)) return false; pay(techDef(id).cost); S.researching = { id, t: 0, total: CONFIG.researchSeconds }; return true; }
function finishResearch() { const r = researching(); if (!r) return; S.researching = null; S.tech[r.id] = true; log(`Researched ${techDef(r.id).name}`); pushEvent({ who: 'research', name: techDef(r.id).name }); }
function tickResearch(dt) { const r = researching(); if (!r) return; r.t += dt; if (r.t >= r.total) finishResearch(); }
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
  if (c.looted) { const n = (S.stats.looted && S.stats.looted[c.looted]) || 0; return { done: n >= c.need, have: n, need: c.need }; }
  if (c.harvested) { const n = (S.stats.harvested && S.stats.harvested[c.harvested]) || 0; return { done: n >= c.need, have: n, need: c.need }; }
  if (c.perk) return { done: perkRank(c.perk) >= (c.need || 1), have: perkRank(c.perk), need: c.need || 1 };
  if (c.disc) return { done: discLevel(c.disc) >= c.need, have: discLevel(c.disc), need: c.need };
  if (c.node) { const [d, id] = c.node.split(':'), r = nodeRank(d, id); return { done: r >= c.need, have: r, need: c.need }; }
  if (c.casts) { const n = (S.stats.casts && S.stats.casts[c.casts]) || 0; return { done: n >= c.need, have: n, need: c.need }; }
  if (c.focused) return { done: (S.stats.focused || 0) >= c.focused, have: S.stats.focused || 0, need: c.focused };
  if (c.activity) { const ok = (S.hero.activity === c.activity || (!c.ground && (S.hero.chose || {})[c.activity])) && (!c.ground || S.hero.ground === c.ground); return { done: ok, have: ok ? 1 : 0, need: 1 }; }
  if (c.have) return { done: (S.res[c.have] || 0) >= c.need, have: Math.floor(S.res[c.have] || 0), need: c.need };
  if (c.toolLevel) { const t = S.hero.tools[c.toolLevel]; const lv = t ? t.level : 0; return { done: lv >= c.need, have: lv, need: c.need }; }
  if (c.counter) return { done: counter(c.counter) >= c.need, have: counter(c.counter), need: c.need };
  if (c.tech) return { done: hasTech(c.tech), have: hasTech(c.tech) ? 1 : 0, need: 1 };
  if (c.tool) return { done: !!S.hero.tools[c.tool], have: S.hero.tools[c.tool] ? 1 : 0, need: 1 };
  if (c.gear) return { done: !!S.hero.gear[c.gear], have: S.hero.gear[c.gear] ? 1 : 0, need: 1 };
  if (c.jobs) return { done: S.stats.jobs >= c.jobs, have: S.stats.jobs, need: c.jobs };
  if (c.sold) return { done: S.stats.sold >= c.sold, have: Math.floor(S.stats.sold), need: c.sold };
  if (c.stage) return { done: bestStageAll() >= c.stage, have: bestStageAll(), need: c.stage, simple: c.stage <= 2 };
  if (c.boss) { const n = Object.keys(S.hero.bossesKilled).length; return { done: n >= c.boss, have: n, need: c.boss }; }
  if (c.account) { const ok = !!(S.settings.guest || (window.Cloud && (Cloud.user || !Cloud.available))); return { done: ok, have: ok ? 1 : 0, need: 1 }; }
  if (c.built) { const n = stepBuilt(c.built) ? 1 : 0; return { done: !!n, have: n, need: 1 }; }
  if (c.tierPaid !== undefined) { const ok = kTier() >= c.tierPaid || (kTier() === c.tierPaid - 1 && tierPaidDone()); const need = tierNeed() || {}, tot = Object.values(need).reduce((a, b) => a + b, 0), got = Object.keys(need).reduce((a, k) => a + Math.min(need[k], tierPaid()[k] || 0), 0); return { done: ok, have: ok ? 1 : (tot ? got / tot : 0), need: 1, simple: true }; }
  if (c.tier !== undefined) { const ok = kTier() >= c.tier; return { done: ok, have: ok ? 1 : 0, need: 1 }; }
  if (c.crews) { const n = cityChecks().crews; return { done: n >= c.crews, have: n, need: c.crews }; }
  if (c.accountants) { const n = cityChecks().accountants; return { done: n >= c.accountants, have: n, need: c.accountants }; }
  if (c.storeLv) { const n = S.kingdom.storeLv || 0; return { done: n >= c.storeLv, have: n, need: c.storeLv }; }
  if (c.thrallLv) { const n = Math.max(0, ...S.kingdom.thralls.map(thrallLevel)); return { done: n >= c.thrallLv, have: n, need: c.thrallLv }; }
  if (c.shifts) { const n = S.stats.shifts || 0; return { done: n >= c.shifts, have: n, need: c.shifts }; }
  if (c.rank) { const n = rankIndex(); return { done: n >= c.rank, have: n, need: c.rank, simple: true }; }
  if (c.founded) return { done: S.legacy.foundings >= c.founded, have: S.legacy.foundings, need: c.founded };
  if (c.hired) { const n = S.kingdom.thralls.length; return { done: n >= c.hired, have: n, need: c.hired }; }
  if (c.working) { const n = stepState(c.working).workers.length; return { done: n >= 1, have: n, need: 1 }; }
  if (c.overseer) { const n = Object.values(S.kingdom.steps || {}).filter(x => x.overseer !== null).length; return { done: n >= c.overseer, have: n, need: c.overseer }; }
  if (c.stepLv) { const [id, tr] = c.stepLv.split(':'), n = stepState(id)[tr]; return { done: n >= c.need, have: n, need: c.need }; }
  if (c.orders) { const n = S.stats.orders || 0; return { done: n >= c.orders, have: n, need: c.orders }; }
  if (c.renown) { const n = S.kingdom.renown || 0, past = c.orFounded && S.legacy.foundings >= c.orFounded; return { done: past || n >= c.renown, have: past ? c.renown : Math.floor(n), need: c.renown }; }
  if (c.made) { const n = (S.stats.made && S.stats.made[c.made]) || 0; return { done: n >= c.need, have: n, need: c.need }; }
  return { done: false, have: 0, need: 1 };
}
// Auto-generated goal when the chain is exhausted: the tech you're closest to, with what it still needs.
function suggestGoal() {
  if (kingdomNo() > 0) { // the kingdom: the endless loop — Renown toward the next lands
    const ok = canFound();
    return { name: ok ? 'Settle New Lands' : `Grow the ${tierDef().name}`, text: ok ? 'This land is conquered. Settle new lands when you are ready — or keep upgrading here.' : tierDef().need, hint: 'Kingdom → Keep', parts: [{ done: ok, have: ok ? 1 : 0, need: 1, label: 'Settlement' }], focus: { tab: 'kingdom', ksub: 'keep', rtab: 'kingdom', el: 'id:settle-card' } };
  }
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
function buyPrice(k) { return (CONFIG.resources[k] && CONFIG.resources[k].buy) || 0; }
function canBuyRes(k) { return buyPrice(k) > 0 && (S.lifetime[k] || 0) > 0; }
function buyRoom(k) { const c = resCap(k); return Math.max(0, Math.floor((c === Infinity ? 1e9 : c) - (S.res[k] || 0))); }
function buyMax(k) { if (!canBuyRes(k)) return 0; return Math.min(buyRoom(k), Math.floor((S.res.gold || 0) / buyPrice(k))); }
function buyRes(k, n) { if (!canBuyRes(k)) return 0; n = Math.min(n === 'max' ? Infinity : n, buyMax(k)); if (n <= 0) return 0; S.res.gold -= n * buyPrice(k); add(k, n); S.stats.bought = (S.stats.bought || 0) + n; return n; }
function sell(k, n) {
  const keep = S.legacy.foundings === 0 ? (CONFIG.legacy.tribute[k] && k !== 'gold' ? CONFIG.legacy.tribute[k] : 0) : 0;
  const have = Math.max(0, Math.floor(S.res[k] || 0) - keep); n = n === 'all' ? have : Math.min(n, have); if (n <= 0 || !sellPrice(k)) return 0;
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
  const loot = {}; for (const k in exp) { const n = roll(exp[k]); if (n > 0) { add(k, n); loot[k] = n; S.stats.looted = S.stats.looted || {}; S.stats.looted[k] = (S.stats.looted[k] || 0) + n; } }
  if (Object.keys(loot).length) pushEvent({ who: 'loot', loot });
  gainXp(H.xpPerKill * CONFIG.stages.xpPerKill(s) * (isBoss(s) ? 3 : 1) * st.xp);
  S.hero.kills++; S.hero.totalKills++;
  if (!S.hero.gear.weapon) { const b = fistLevel(); S.hero.fistKills = (S.hero.fistKills || 0) + 1; if (fistLevel() > b) { log(`Your fists harden: ${slotValue('weapon').toFixed(1)} damage`); pushEvent({ who: 'craft', name: 'Fists ' + slotValue('weapon').toFixed(1) }); } }
  { const key = typeKey(s); S.legacy.kills = S.legacy.kills || {}; const before = trophyTier(key), bt = bestiaryTier(key); S.legacy.kills[key] = (S.legacy.kills[key] || 0) + 1; const after = trophyTier(key); if (after > before) { log(`Trophy earned: ${CONFIG.trophies.tiers[after].name} ${enemyType(s).name} head!`); pushEvent({ who: 'trophy', key, tier: after }); } if (bestiaryTier(key) > bt) log(`Bestiary: ${enemyType(s).plural} — ${CONFIG.bestiary.tiers[bestiaryTier(key)].name}`); }
  if (isBoss(s)) { const bk = S.hero.ground + ':' + s; if (!S.hero.bossesKilled[bk]) { S.hero.bossesKilled[bk] = true; const u = enemyType(s).unique; if (u && CONFIG.resources[u]) { add(u, 1); pushEvent({ who: 'loot', loot: { [u]: 1 }, unique: true }); } log(`Defeated ${enemyName(s)}! +1 talent point${u ? ', ' + CONFIG.resources[u].name : ''}`); } else { const u = enemyType(s).unique; if (u && S.legacy.foundings === 0 && CONFIG.legacy.tribute[u] && !(S.res[u] >= 1)) { add(u, 1); pushEvent({ who: 'loot', loot: { [u]: 1 }, unique: true }); } log(`Defeated ${enemyName(s)}!`); } }
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
  tickKingdom(dt); tickCraft(dt); tickResearch(dt);
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
  if (crafting() && awaySeconds >= (crafting().total - crafting().t)) finishCraft();
  if (researching() && awaySeconds >= (researching().total - researching().t)) finishResearch();
  const counted = Math.min(awaySeconds, afkCap()), eff = afkEff(), gains = {};
  const kr = kingdomRates(); for (const k in kr) gains[k] = (gains[k] || 0) + kr[k] * counted * eff;
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
function knowledgeGain() { return S.legacy.foundings === 0 ? 1 : Math.max(1, Math.floor(Math.sqrt((S.kingdom.renown || 0) / 40))); } // P0 tribute = 1 Crystal; after that Crystals = √(Renown / 40)
function foundCost() { return S.legacy.foundings === 0 ? { ...CONFIG.legacy.tribute } : {}; }
function canFound() { if (S.legacy.foundings === 0) return bestStageAll() >= CONFIG.legacy.foundRequiresStage && canAfford(foundCost()); return cityComplete(); }
function foundRenownNeed() { return KC().foundRenown * Math.max(1, kingdomNo()); }
function pathUnlocked(p) { return S.legacy.kingdomLevel >= (p.unlock || 1); }
function found(heroPathId, kingdomPathId) {
  if (!canFound()) return false;
  const hp = CONFIG.legacy.heroPaths.find(p => p.id === heroPathId), kp = CONFIG.legacy.kingdomPaths.find(p => p.id === kingdomPathId);
  if (!hp || !kp || !pathUnlocked(hp) || !pathUnlocked(kp)) return false;
  const gain = knowledgeGain(), leg = S.legacy;
  leg.history.push({ level: leg.kingdomLevel, bestStage: S.hero.bestStage, heroLevel: S.hero.level, knowledge: gain, renown: S.kingdom.renown || 0, heroPath: leg.heroPath, kingdomPath: leg.kingdomPath });
  pay(foundCost());
  leg.knowledge += gain; leg.kingdomLevel++; leg.foundings++;
  leg.heroPath = hp.id; leg.kingdomPath = kp.id;
  // v0.3: the hero, his tech and the quest log carry on. The kingdom (lines, thralls, orders, renown, storehouse) and resources start over.
  const keep = { hero: S.hero, tech: S.tech, quests: S.quests, settings: S.settings, stats: S.stats, lifetime: S.lifetime, log: S.log };
  const band = (S.kingdom && S.kingdom.thralls) || [];
  const fresh = freshState(); Object.assign(fresh, keep); fresh.legacy = leg; fresh.kingdom.thralls = band;
  S = fresh; S.hero.activity = 'fight'; S.kingdom.built = {}; S.kingdom.tier = 0; S.kingdom.tierPaid = {};
  if (leg.foundings > 1) add('gold', KC().startGold || 50);
  const ca = perkRank('cache'); if (ca) { add('gold', 100 * ca); }
  ensureThralls();
  log(`${leg.foundings === 1 ? 'Founded your kingdom' : 'Settled new lands'} as ${hp.name} of a ${kp.name}. A Camp is pitched. +${gain} Crystal${gain === 1 ? '' : 's'}`);
  if (S.kingdom.thralls.length) log(`${S.kingdom.thralls.length} thrall${S.kingdom.thralls.length > 1 ? 's' : ''} followed you to the new lands. Put them to work.`);
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
let saveHook = null;
function save() { S.lastTick = Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} if (saveHook) saveHook(); }
// Cloud: the whole save as a string, and restoring one (runs migrations, then pays out AFK gains since that save)
function saveString() { S.lastTick = Date.now(); return JSON.stringify(S); }
function saveMeta(str) { try { const d = typeof str === 'string' ? JSON.parse(str) : str; const k = d.kingdom || {}, L = d.legacy || {}; const tiers = CONFIG.kingdom.tiers;
  return { lastTick: d.lastTick || 0, heroLv: (d.hero || {}).level || 1, crystals: L.knowledge || 0, place: (L.foundings || 0) > 0 ? (tiers[Math.min(k.tier || 0, tiers.length - 1)].name) : 'The Wild', best: (d.hero || {}).bestStage || 1, played: (d.hero || {}).time || 0 }; } catch (e) { return null; } }
function restoreString(str) {
  const prev = localStorage.getItem(SAVE_KEY);
  try { JSON.parse(str); localStorage.setItem(SAVE_KEY, str); if (!load()) throw new Error('bad save'); }
  catch (e) { if (prev) { localStorage.setItem(SAVE_KEY, prev); load(); } return false; }
  const away = Math.max(0, (Date.now() - (S.lastTick || Date.now())) / 1000);
  S.lastTick = Date.now(); lastFrame = performance.now(); accumulator = 0;
  resumeFromAfk(away); save(); return true;
}
function load() {
  try {
    let raw = localStorage.getItem(SAVE_KEY);
    if (!raw) { // pre-0.3 save: keep Legacy only (Crystals, perks, trophies, bestiary kills), start fresh
      const old = localStorage.getItem(OLD_SAVE_KEY); if (!old) return null;
      const d = JSON.parse(old), b = freshState(); b.legacy = { ...b.legacy, knowledge: (d.legacy || {}).knowledge || 0, perks: { ...((d.legacy || {}).perks || {}) }, kills: { ...((d.legacy || {}).kills || {}) } };
      b.settings = { ...b.settings, ...(d.settings || {}) }; b.migrated03 = true; S = b; save(); try { localStorage.removeItem(OLD_SAVE_KEY); } catch (e) {} return S;
    }
    const d = JSON.parse(raw), b = freshState();
    S = { ...b, ...d, res: { ...b.res, ...d.res }, kingdom: { ...b.kingdom, ...(d.kingdom || {}), steps: { ...((d.kingdom || {}).steps || {}) } }, tech: { ...(d.tech || {}) }, quests: { ...b.quests, ...(d.quests || {}) }, stats: { ...b.stats, ...(d.stats || {}) }, settings: { ...b.settings, ...d.settings },
      hero: { ...b.hero, ...d.hero, attr: { ...b.hero.attr, ...(d.hero || {}).attr }, gear: { ...b.hero.gear, ...(d.hero || {}).gear }, tools: { ...b.hero.tools, ...((d.hero || {}).tools || {}) }, grounds: { ...((d.hero || {}).grounds || {}) }, skillLv: { ...b.hero.skillLv, ...(d.hero || {}).skillLv } },
      legacy: { ...b.legacy, ...(d.legacy || {}), perks: { ...((d.legacy || {}).perks || {}) }, kills: { ...((d.legacy || {}).kills || {}) } } };
    // Migration: saves that reached the kingdom quests before the kingdom moved behind the first founding get that founding for free
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
  get S() { return S; }, saveString, saveMeta, restoreString, setSaveHook: f => { saveHook = f; }, SAVE_KEY, fmt, pct, fmtTime, drainEvents: () => EVENTS.splice(0), afkEfficiency: () => afkEff(),
  discXp, discLevel, discProgress, treeNode, nodeRank, nodeMax, nodeOpen, treePointsTotal, treePointsSpent, treePointsFree, canRankNode, rankNode, nodeQuestLocked, treeMods,
  fistLevel, slotValue, enemyHit, crafting, maxUpgradePlan, upgradeMax, stats, gearStats, itemStatPreview, gearCraftCost, gearUpgradeCost, canTierUp, craftGear, upgradeGear,
  talentPointsFree, talentPointsTotal, talentPointsSpent, respec, respecCost,
  skillDef, skillUnlocked, skillPower, skillCd, skillReady, castSkill, activeBuffs,
  enemyMaxHp, enemyDps, effectiveEnemyDps, enemyName, isBoss, stageType, enemyType, stageLabel, nextTypeName, stagePool, lootRarity, dropGated, killsNeeded, farmRate, stageDanger, heroRates,
  handDef, handUnlocked, grab, tierName,
  toolTierUnlocked, toolPower, toolCraftCost, toolUpgradeCost, canToolTierUp, craftTool, upgradeTool, activityDef, activityAvailable, setActivity, masteryLevel, harvestTime, harvestYield, harvestRates,
  questCurrent, questProgress, questClaim, suggestGoal, ground, setGround, groundUnlocked, dropToolMult, bestStageAll, groundDrops, toolSlotUnlocked,
  techDef, hasTech, techProgress, canResearch, research, researching, buildingUnlocked, gearTierUnlocked, dropUnlocked, counter,
  kingdomRates, kingdomNo, allSteps, stepDef, stepUnlocked, lineUnlocked, lineSteps, stepState, nextStep, stepMods, kTier, tierDef, stepAvailable, stepBuilt, canBuild, buildStep, tierGoods, tierNeed, tierPaid, tierPaidDone, tierStepsReady, contribute, canRaise, raiseTier, accountantSteps, assignAccountant, cityChecks, cityComplete, stepRate, stepPhases, stepCycle, stepBatch, stepOutput, thrallLevel, thrallCap, dismiss, stepLimit, stepUpCost, stepUpPlan, upgradeStep, stepWorkerSlots,
  assignWorker, assignOverseer, unassign, thrallPost, useAbility, refreshOffers, hire, maxStars, storeUpCost, upgradeStore, orderGoods, foundRenownNeed, canDeliver, deliver, swapOrder, swapReady, rankIndex, rankInfo, heroFighting, thrallCount, sellPrice, sell, buyPrice, buyRes, buyMax, canBuyRes,
  canAdvance, advance, retreat, canAfford, add, simulate, applyOffline, claimOffline,
  save, load, exportSave, importSave, hardReset,
  thrallName, resCap, atCap, storeCap, typeKey, typeKills, bestiaryTier, bestiaryBonus, trophyTier, trophyCount, pinned, togglePin,
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
