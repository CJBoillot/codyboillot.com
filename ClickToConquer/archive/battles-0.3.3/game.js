// ============================================================
// GAME ENGINE — Character (attributes/gear/skills/talents) / Kingdom / Crafting
// ============================================================

const SAVE_KEY = 'ctc_beta_save_v1'; // Beta 0.1.0: a hard restart — Alpha saves are not loaded
const ALPHA_KEYS = ['afk_proto_save_v12', 'afk_proto_save_v11'];
const SCHEMA = 2; // 2: Beta 0.3.0 — lands are 50 battles // Beta 0.1.15: save schema. Every save under SAVE_KEY was born in the Beta, so the Alpha migrations below never apply to it.
function markAlphaMigrated(st) { const L = st.legacy = st.legacy || {}, K = st.kingdom = st.kingdom || {}; L.v111 = L.v112 = L.v120 = L.v121 = true; K.cr104 = true; K.v09 = true; st.schema = 1; }
let hadAlpha = false;

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
      attr, gear, tools, skillLv, loadout: [], cds: {}, buffs: {}, talents: {}, tree: {}, dxp: {}, bossesKilled: {}, paths: {}, techs: {}, stars: {}, activity: 'idle', harvestTimer: 0, mastery: {}, ground: 'wilds', grounds: {}, hand: {},
    },
    lifetime: {}, lastTick: Date.now(), createdAt: Date.now(), settings: { devSpeed: 1, showLog: false }, revealed: {}, log: [],
    legacy: freshLegacy(), schema: SCHEMA,
  };
}
function freshKingdom() { return { steps: {}, thralls: [], offers: [], offerTimer: 0, storeLv: 0, renown: 0, orders: [], orderSeq: 0, v09: true, cr104: true }; }
function freshLegacy() {
  return { kingdomLevel: 1, knowledge: 0, perks: {}, heroPath: null, kingdomPath: null, foundings: 0, history: [], kills: {}, v111: true, v112: true, v120: true, v121: true }; // kills: bestiary counts per enemy type (persist — trophies)
}
function perkRank(id) { let r = (S.legacy.perks || {})[id] || 0; if (S.hero && S.hero.paths) for (const n of pathNodes()) if (n.perk === id) r += pathRank(n.id); return r; } // 0.11.1: Legacy effects are Crown Tree nodes now
function heroPath() { return CONFIG.legacy.heroPaths.find(p => p.id === S.legacy.heroPath) || null; }
function kingdomPath() { return CONFIG.legacy.kingdomPaths.find(p => p.id === S.legacy.kingdomPath) || null; }

let S = freshState();

// ---------- Gear ----------
const HARD_T = 4; // first Hardened tier index
function roman(n) { const m = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']]; let s = ''; for (const [v, r] of m) while (n >= v) { s += r; n -= v; } return s; }
function tierDefAt(tier) { const T = CONFIG.tiers[Math.min(tier, HARD_T)]; if (tier <= HARD_T) return T; const H = CONFIG.hardened, k = tier - HARD_T, sc = (o, g2) => { const r = {}; for (const x in o) r[x] = Math.round(o[x] * Math.pow(x === 'gold' ? H.goldGrowth : H.costGrowth, k)); return r; }; return { ...T, craftCost: sc(T.craftCost), upgradeCost: sc(T.upgradeCost) }; }
function tierName(slot, tier) { if (tier >= HARD_T) return 'Hardened ' + roman(tier - HARD_T + 1); const t = CONFIG.tiers[tier]; return t.perSlot && t.perSlot[slot] ? t.perSlot[slot].name : t.name; }
// v0.3: slot value = tier + 0.1 × level; bare slot = 1 (+ fists levels for the weapon). Tier index 0 (Crude) = value 2.
function fistLevel() { return Math.min(9, Math.floor((S.hero.fistKills || 0) / CONFIG.fistKillsPerLevel)); }
function slotValue(slot, tier, level) {
  if (tier === -1) return 1 + (slot === 'weapon' ? 0.1 * fistLevel() : 0);
  if (tier === undefined) { const it = S.hero.gear[slot]; if (!it) return 1 + (slot === 'weapon' ? 0.1 * fistLevel() : 0); tier = it.tier; level = it.level; }
  const H = CONFIG.hardened;
  if (tier >= HARD_T && H.fastSlots.includes(slot)) return H.base * Math.pow(H.tierGrowth, tier - HARD_T) * (1 + H.levelStep * (level || 0));
  return tier + 2 + 0.1 * (level || 0);
}
function slotStat(slot, v) { const d = CONFIG.slots[slot]; return d.primary === 'speed' ? d.per * v : d.per * v; }
function gearStats() { const g = {}; for (const slot in CONFIG.slots) { const d = CONFIG.slots[slot]; g[d.primary] = (g[d.primary] || 0) + slotStat(slot, slotValue(slot)); } return g; }
function itemStatPreview(slot, tier, level) { return { [CONFIG.slots[slot].primary]: slotStat(slot, slotValue(slot, tier, level)) }; }
function scaleCost(base, mult, level, extra = 1) { const c = {}; for (const k in base) c[k] = base[k] * Math.pow(mult, level) * extra; return c; }
function gearCraftCost(slot) { return smithyCost(gearCraftCost0(slot)); }
function gearCraftCost0(slot) { // cost to craft next tier (or first)
  const it = S.hero.gear[slot], next = it ? it.tier + 1 : 0;
  const t = tierDefAt(next), ps = t.perSlot && t.perSlot[slot];
  return ps ? { ...ps.craftCost } : scaleCost(t.craftCost, 1, 0, CONFIG.slotCostMult[slot]);
}
function gearUpgradeCost(slot) { return smithyCost(gearUpgradeCost0(slot)); }
function gearUpgradeCost0(slot) {
  if (S.hero.gear[slot] && S.hero.gear[slot].level >= CONFIG.tierUpAt) return null;
  const it = S.hero.gear[slot]; if (!it) return null;
  const t = tierDefAt(it.tier), ps = t.perSlot && t.perSlot[slot];
  return ps ? scaleCost(ps.upgradeCost, t.upgradeMult, it.level) : scaleCost(t.upgradeCost, t.upgradeMult, it.level, CONFIG.slotCostMult[slot]);
}
function canTierUp(slot) { const it = S.hero.gear[slot], next = it ? it.tier + 1 : 0; return gearTierUnlocked(next, slot) && (!it || it.level >= CONFIG.tierUpAt); }
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
// Beta 0.1.23: once a later building in a chain is built, the goods before it leave the header — once. Re-pin in Loot and it stays.
function autoUnpin() { if (!S.kingdom || kingdomNo() < 1) return; const s = S.settings, done = s.autoUnpinned = s.autoUnpinned || {};
  for (const lid in KC().lines) { const steps = lineSteps(lid).filter(st => !st.pull); for (let i = 1; i < steps.length; i++) for (let j = 0; j < i; j++) { const k = steps[j].make; if (done[k]) continue; done[k] = true; s.unpinned = s.unpinned || {}; s.unpinned[k] = true; } } }
function togglePin(k) { S.settings.unpinned = S.settings.unpinned || {}; if (S.settings.unpinned[k]) delete S.settings.unpinned[k]; else S.settings.unpinned[k] = true; return pinned(k); }
function grab(id) { if (!handUnlocked(id)) return false; const h = handDef(id); add(h.gives, 1); S.hero.hand[id] = (S.hero.hand[id] || 0) + 1; pushEvent({ who: 'hand', id, res: h.gives }); return true; }

// ---------- Tools & activities ----------
function toolTierUnlocked(t) { return CONFIG.techs.some(x => x.unlocks.toolTier === t && hasTech(x.id)); }
function toolPower(slot) { const it = S.hero.tools[slot]; if (!it) return 0; return CONFIG.toolSlots[slot].base * CONFIG.toolTiers[it.tier].mult * Math.pow(CONFIG.gearGrowth, it.level); }
function toolCraftCost(slot) { return smithyCost(toolCraftCost0(slot)); }
function toolCraftCost0(slot) { const it = S.hero.tools[slot], next = it ? it.tier + 1 : 0; if (next >= CONFIG.toolTiers.length) return null; return { ...CONFIG.toolTiers[next].craftCost }; }
function toolUpgradeCost(slot) { return smithyCost(toolUpgradeCost0(slot)); }
function toolUpgradeCost0(slot) { const it = S.hero.tools[slot]; if (!it || it.level >= CONFIG.tierUpAt) return null; const t = CONFIG.toolTiers[it.tier]; return scaleCost(t.upgradeCost, t.upgradeMult, it.level); }
function toolSlotUnlocked(slot) { return !CONFIG.techs.some(t => t.unlocks.tool === slot) || CONFIG.techs.some(t => t.unlocks.tool === slot && hasTech(t.id)); }
function canToolTierUp(slot) { const it = S.hero.tools[slot], next = it ? it.tier + 1 : 0; return toolSlotUnlocked(slot) && next < CONFIG.toolTiers.length && toolTierUnlocked(next) && (!it || it.level >= CONFIG.tierUpAt); }
function craftTool(slot) { if (crafting() || !canToolTierUp(slot)) return false; const c = toolCraftCost(slot); if (!c || !canAfford(c)) return false; pay(c); const it = S.hero.tools[slot]; S.hero.crafting = { kind: 'tool', slot, t: 0, total: CONFIG.craftSeconds, name: `${CONFIG.toolTiers[it ? it.tier + 1 : 0].name} ${CONFIG.toolSlots[slot].name}` }; return true; }
function upgradeTool(slot) { if (crafting()) return false; const c = toolUpgradeCost(slot); if (!c || !canAfford(c)) return false; pay(c); const it = S.hero.tools[slot]; S.hero.crafting = { kind: 'toolUp', slot, t: 0, total: CONFIG.upgradeSeconds, name: `${CONFIG.toolTiers[it.tier].name} ${CONFIG.toolSlots[slot].name} Lv${it.level + 1}` }; return true; }
function activityDef(id) { return CONFIG.activities[id]; }
function activityAvailable(id) { const a = activityDef(id); if (phase() === 3 && id !== 'fight') return false; /* 0.10.6: a King's hero only fights — the Capital gathers */ return !!a && (!a.tool || !!S.hero.tools[a.tool]) && (!a.gear || !!S.hero.gear[a.gear]); }
function setActivity(id) { if (!activityAvailable(id)) return false; S.hero.activity = id; S.hero.chose = S.hero.chose || {}; S.hero.chose[id] = true; if (id === 'fight') S.hero.fightOn = true; return true; } // 0.10.12: this only picks what the hero screen shows — fighting and gathering both run all the time
function heroFighting() { return !!S.hero.fightOn && activityAvailable('fight'); }
const GATHER = ['wood', 'mine', 'forage'];
function gatherOn(id) { const a = activityDef(id); return !!a && !!a.tool && !!S.hero.tools[a.tool] && (phase() < 3 || true); }
function bgFactor(id) { const G = CONFIG.gather, a = activityDef(id); return G.bgBase * Math.pow(Math.max(1e-9, toolPower(a.tool)), G.bgExp); }
function masteryLevel(id) { return Math.floor(Math.sqrt((S.hero.mastery[id] || 0) / 10)); } // swings → level; +2% speed each
function harvestTime(id) { const a = activityDef(id), p = toolPower(a.tool), tm = treeMods(id); return a.time / (Math.pow(p, 0.5)) / (1 + (tm.harvestSpeed || 0)) / (1 + 0.02 * masteryLevel(id)) / bgFactor(id); }
function outputGated(k) { const g = CONFIG.harvestGate && CONFIG.harvestGate[k]; return !!g && !hasTech(g); }
function harvestYield(id) { const a = activityDef(id), p = toolPower(a.tool), tm = treeMods(id), o = {}; for (const k in a.outputs) { if (outputGated(k)) continue; o[k] = a.outputs[k] * Math.pow(p, 0.5) * (1 + (tm.harvestYield || 0)) * (1 + (tm.harvestDouble || 0)); } const side = treeSide(id); for (const k in side) o[k] = (o[k] || 0) + side[k]; return o; }
function harvestRates(id = null) { if (id === null) { const o = {}; for (const g of GATHER) if (gatherOn(g)) { const r = harvestRates(g); for (const k in r) o[k] = (o[k] || 0) + r[k]; } return o; } if (id === 'fight' || id === 'idle' || !gatherOn(id)) return {}; const y = harvestYield(id), t = harvestTime(id), r = {}; for (const k in y) r[k] = y[k] / t; return r; }
function questWantsHarvest(k) { const q = questCurrent(); if (!q) return false; return q.steps.some(st => st.check.harvested === k && ((S.stats.harvested || {})[k] || 0) < st.check.need); }
function tickHarvest(dt) { // 0.10.12: every owned tool works in the background, all the time
  S.hero.gTimers = S.hero.gTimers || {};
  for (const id of GATHER) { if (!gatherOn(id)) continue;
    const outs = Object.keys(harvestYield(id)); if (outs.length && outs.every(atCap) && !outs.some(questWantsHarvest)) continue; // storage full: the tool rests (unless a quest is counting)
    const T = S.hero.gTimers; T[id] = (T[id] || 0) + dt; const t = harvestTime(id);
    while (T[id] >= t) { T[id] -= t; const y = harvestYield(id), got = {}; for (const k in y) { const n = Math.floor(y[k]) + (Math.random() < y[k] - Math.floor(y[k]) ? 1 : 0); if (n > 0) { const kept = add(k, n); if (kept > 0) got[k] = kept; S.stats.harvested = S.stats.harvested || {}; S.stats.harvested[k] = (S.stats.harvested[k] || 0) + n; } } S.hero.mastery[id] = (S.hero.mastery[id] || 0) + 1; gainDiscXp(id, CONFIG.discXpPerSwing); if (S.hero.activity === id) pushEvent({ who: 'harvest', yield: got }); } }
}

// ---------- Disciplines & skill trees ----------
function discXp(d) { return (S.hero.dxp && S.hero.dxp[d]) || 0; }
function discCurve(d) { return d === 'combat' ? CONFIG.combatXpToLevel : CONFIG.discXpToLevel; }
function discLevel(d) { const C = discCurve(d); let lvl = 1, x = discXp(d); while (x >= C(lvl) && lvl < 5000) { x -= C(lvl); lvl++; } return lvl; }
function discProgress(d) { const C = discCurve(d); let lvl = 1, x = discXp(d); while (x >= C(lvl) && lvl < 5000) { x -= C(lvl); lvl++; } return { level: lvl, have: x, need: C(lvl) }; }
function gainDiscXp(d, n) { if (!CONFIG.disciplines[d]) return; S.hero.dxp = S.hero.dxp || {}; const before = discLevel(d); S.hero.dxp[d] = (S.hero.dxp[d] || 0) + n; const after = discLevel(d); if (after > before) log(`${CONFIG.disciplines[d].name} level ${after}!`); }
function treeNode(d, id) { return (CONFIG.trees[d] || []).find(n => n.id === id); }
function nodeRank(d, id) { return (S.hero.tree && S.hero.tree[d] && S.hero.tree[d][id]) || 0; }
function nodeMax(n) { return n.capstone ? 1 : CONFIG.treeRanks; }
function nodeQuestLocked(d, id) { const n = treeNode(d, id); if (!n || !n.quest || S.legacy.foundings > 0 || nodeRank(d, id) > 0) return false; const qi = CONFIG.quests.findIndex(q => q.id === n.quest); return qi >= 0 && S.quests.index < qi; }
function nodeOpen(d, id) { const n = treeNode(d, id); if (!n) return false; if (nodeQuestLocked(d, id)) return false; if (!n.parent || n.capstone) return true; const p = treeNode(d, n.parent); return nodeRank(d, n.parent) >= nodeMax(p); }
function treePointsTotal(d) { return discLevel(d) - 1 + (d === 'combat' ? perkRank('veteran') * 3 : 0); }
function treePointsSpent(d) { let n = 0; for (const node of CONFIG.trees[d] || []) if (!node.capstone) n += nodeRank(d, node.id); return n; }
function treePointsFree(d) { return treePointsTotal(d) - treePointsSpent(d); }
function talentPointsTotal() { return starsTotal(); }
function talentPointsSpent() { return starsSpent(); }
function talentPointsFree() { return crowns(); }
function canRankNode(d, id) { const n = treeNode(d, id); if (!n || !nodeOpen(d, id) || nodeRank(d, id) >= nodeMax(n)) return false; return n.capstone ? crowns() >= 1 : treePointsFree(d) > 0; }
function rankNode(d, id) {
  if (!canRankNode(d, id)) return false;
  if (treeNode(d, id).capstone) S.legacy.knowledge -= 1; // capstones cost a Crown
  S.hero.tree = S.hero.tree || {}; S.hero.tree[d] = S.hero.tree[d] || {}; S.hero.tree[d][id] = nodeRank(d, id) + 1;
  return true;
}
function treeMods(d) { const m = {}; for (const n of CONFIG.trees[d] || []) { const r = nodeRank(d, n.id); if (!r || !n.per) continue; for (const k in n.per) m[k] = (m[k] || 0) + n.per[k] * r; } return m; }
function treeSide(d) { const o = {}; for (const n of CONFIG.trees[d] || []) { if (!n.side || !nodeRank(d, n.id)) continue; for (const k in n.side) o[k] = (o[k] || 0) + n.side[k]; } return o; }
function respecCost() { const kp = kingdomPath(); return kp && kp.freeRespec ? 0 : H.respecCost(S.hero.level); }
function respec() {
  const c = respecCost(); if (S.res.gold < c) return false;
  S.res.gold -= c; for (const d in CONFIG.trees) for (const n of CONFIG.trees[d]) if (!n.capstone && S.hero.tree && S.hero.tree[d]) delete S.hero.tree[d][n.id];
  log('Respecced the gathering trees (capstones kept).'); return true;
}
// ---------- 0.11.1: the Crown Tree (Paths of War, bought with Crowns; permanent) ----------
let _pathNodes = null;
function pathNodes() {
  if (_pathNodes) return _pathNodes; const P = CONFIG.paths, out = [];
  for (const b of P.branches) { let k = 0; P.plan.forEach((cols, t) => cols.forEach(c => { const d = P.nodes[b.id][k]; out.push({ id: b.id + k, b: b.id, t, c, name: d[0], per: d[1] || {}, kind: d[2] || 'small', max: d[3] || 0, perk: d[4] || null }); k++; })); }
  for (const n of out) n.parents = n.t === 0 ? [] : out.filter(p => p.b === n.b && p.t === n.t - 1 && Math.abs(p.c - n.c) <= 1).map(p => p.id);
  return (_pathNodes = out);
}
function pathNode(id) { return pathNodes().find(n => n.id === id) || null; }
function pathRank(id) { return (S.hero.paths && S.hero.paths[id]) || 0; }
function pathRow(t) { return pathNodes().filter(n => n.t === t); }
function rowOpen(t) { return true; }
function rowProgress(t) { return { have: 0, need: 0, low: 0 }; }
function pathOpen(id) { const n = pathNode(id); return !!n && (!n.parents.length || n.parents.some(p => pathRank(p) >= 1)); } // a node opens once a node above it has a rank
function pathMaxed(id) { const n = pathNode(id); return !!n && n.kind !== 'endless' && pathRank(id) >= n.max; }
function pathCost(id, r = pathRank(id)) { const P = CONFIG.paths, n = pathNode(id); if (n.kind === 'endless') return Math.ceil(P.endlessBase * Math.pow(P.endlessGrowth, r)); return P.rowCost[Math.min(n.t, P.rowCost.length - 1)]; }
function combatLevelBonus() { return (discLevel('combat') - 1) * CONFIG.paths.levelBonus; }
function pathNeedsStar(id) { return false; }
function pathPointsTotal() { return Infinity; }
function pathPointsSpent() { let s = 0; for (const k in (S.hero.paths || {})) s += S.hero.paths[k]; return s; }
function pathPointsFree() { return Infinity; }
function pathPointsMax() { return Infinity; }
function starsTotal() { return 0; } // 0.11.1: boss ★ became Crowns
function starsSpent() { return 0; }
function starDemand() { return Infinity; }
function starsSpare() { return 0; }
function starsFree() { return 0; }
function crowns() { return S.legacy.knowledge || 0; }
function canRankPath(id) { const n = pathNode(id); return !!n && pathOpen(id) && !pathMaxed(id) && crowns() >= pathCost(id); }
function rankPath(id, times = 1) { let k = 0; S.hero.paths = S.hero.paths || {}; while (k < times && canRankPath(id)) { S.legacy.knowledge -= pathCost(id); S.hero.paths[id] = pathRank(id) + 1; S.stats.crownSpent = (S.stats.crownSpent || 0) + 1; k++; } return k; }
function pathMods() { const m = {}; for (const n of pathNodes()) { const r = pathRank(n.id); if (!r) continue; for (const k in n.per) { if (k.endsWith('X')) continue; m[k] = (m[k] || 0) + n.per[k] * r; } } return m; }
function pathX(key) { let x = 1; for (const n of pathNodes()) { const r = pathRank(n.id); if (r && n.per[key]) x *= Math.pow(n.per[key], r); } return x; }
function resetPaths() { return false; }

// ---------- Techniques (active, permanent: unlocked by milestones, levelled by use) ----------
function techState(id) { S.hero.techs = S.hero.techs || {}; return S.hero.techs[id] || (S.hero.techs[id] = { xp: 0, mods: [] }); }
function techUnlocked(id) { return !!(S.hero.techs && S.hero.techs[id] && S.hero.techs[id].open); }
function techUnlockMet(d, cl = discLevel('combat')) { const u = d.unlock || {}; if (u.combat) return cl >= u.combat; if (u.boss) return !!(S.hero.stars || {})[u.boss] || !!S.hero.bossesKilled[u.boss]; if (u.proclaim) return phase() === 3 || (S.legacy.dynasty || 1) > 1; return true; }
function techUnlockLabel(d) { const u = d.unlock || {}; return u.label || (u.combat ? `Reach Combat Lv ${u.combat}` : ''); }
function checkTechUnlocks() {
  const cl = discLevel('combat');
  for (const d of CONFIG.skills) if (!techUnlocked(d.id) && techUnlockMet(d, cl)) { techState(d.id).open = true; log(`New technique: ${d.name}!`); if (questReached('q13c')) pushEvent({ who: 'technique', name: d.name }); }
  if (!S.hero.landSlot && S.kingdom && landsHeld() >= 1) S.hero.landSlot = true;
}
function masteryNeed(lv) { return CONFIG.masteryBase * Math.pow(CONFIG.masteryGrowth, lv - 1); }
function questReached(id) { const i = CONFIG.quests.findIndex(q => q.id === id); return i >= 0 && S.quests.index >= i; }
function techMastery(id) { let lv = 1, x = (S.hero.techs && S.hero.techs[id] && S.hero.techs[id].xp) || 0; while (x >= masteryNeed(lv) && lv < 5000) { x -= masteryNeed(lv); lv++; } return { level: lv, have: x, need: masteryNeed(lv) }; }
function techLevelOf(id) { return techMastery(id).level; }
function gainMastery(id, x, quiet = false) { const st = techState(id), before = techLevelOf(id); st.xp += x; const after = techLevelOf(id); if (after > before && !quiet) { log(`${skillDef(id).name} mastery Lv ${after}!`); if (after === 5 || after === 10) pushEvent({ who: 'technique', name: skillDef(id).name + ' — choose a mod' }); } }
const MOD_LV = [5, 10];
function techMod(id, tier) { const d = skillDef(id), st = S.hero.techs && S.hero.techs[id]; if (!st || !d.mods || techLevelOf(id) < MOD_LV[tier]) return null; return d.mods[tier].find(m => m.id === (st.mods || [])[tier]) || null; }
function techMods(id) { const o = { power: 0, cd: 0, dur: 0, boss: 0, leech: 0, twin: 0 }; for (const t of [0, 1]) { const m = techMod(id, t); if (m) for (const k in o) if (m[k]) o[k] += m[k]; } return o; }
function chooseMod(id, tier, modId) { const d = skillDef(id); if (!techUnlocked(id) || !d.mods || techLevelOf(id) < MOD_LV[tier] || !d.mods[tier].some(m => m.id === modId)) return false; const st = techState(id); st.mods = st.mods || []; st.mods[tier] = modId; return true; }
function modPending(id) { if (!techUnlocked(id)) return false; const st = techState(id), lv = techLevelOf(id); return [0, 1].some(t => lv >= MOD_LV[t] && !(st.mods || [])[t]); }
function techSlots() { const c = discLevel('combat'); let n = 0; for (const s of CONFIG.techSlots) if ((s.combat && c >= s.combat) || (s.land && S.hero.landSlot)) n++; return n; }
function equipTech(id) { if (!techUnlocked(id) || S.hero.loadout.includes(id) || S.hero.loadout.length >= techSlots()) return false; S.hero.loadout.push(id); return true; }
function unequipTech(id) { if (!S.hero.loadout.includes(id)) return false; S.hero.loadout = S.hero.loadout.filter(x => x !== id); delete S.hero.cds[id]; return true; }
function markViewed(k) { S.stats.viewed = S.stats.viewed || {}; if (!S.stats.viewed[k]) { S.stats.viewed[k] = true; return true; } return false; }
function migrateSkills() { // 0.9.5: the old Combat tree → Paths (points refunded) + Techniques (tree rank → mastery level)
  const h = S.hero; h.paths = h.paths || {}; h.techs = h.techs || {}; h.stars = h.stars || {};
  for (const k in (h.bossesKilled || {})) h.stars[k] = true;
  const old = h.tree && h.tree.combat;
  if (old) {
    const map = { strike: 'strike', cleave: 'cleave', warcry: 'warcry', execute: 'execute', focus: 'focus', wind: 'wind' };
    for (const nid in map) { const r = old[nid] || 0; if (r >= 1) { const st = techState(map[nid]); st.open = true; let x = 0; for (let l = 1; l < r; l++) x += masteryNeed(l); st.xp = Math.max(st.xp || 0, x); } }
    delete h.tree.combat;
  }
  const slots = techSlots(); h.loadout = (h.loadout || []).filter((id, i, a) => skillDef(id) && techUnlocked(id) && a.indexOf(id) === i).slice(0, slots);
  checkTechUnlocks();
}
// Legacy shims so old code paths keep working
function attrPointsFree() { return 0; } function spendAttr() { return false; } function spendTalent() { return false; } function talentAvailable() { return false; }

// ---------- Skills ----------
function skillDef(id) { return CONFIG.skills.find(s => s.id === id); }
function skillUnlocked(id) { return techUnlocked(id); }
function skillPower(id) { const d = skillDef(id); return (d.power + d.powerPerLevel * (techLevelOf(id) - 1)) * (1 + techMods(id).power); }
function skillCdBase(id) { return skillDef(id).cd * (1 + techMods(id).cd); }
function skillCd(id) { return skillCdBase(id) * (1 - stats().cdr); }
function skillDur(id) { const d = skillDef(id); return (d.dur || 0) * (1 + techMods(id).dur); }
function skillReady(id) { return (S.hero.cds[id] || 0) <= 0; }
function castSkill(id, manual = false) {
  if (!S.hero.loadout.includes(id) || !skillReady(id) || S.hero.resting) return false;
  const d = skillDef(id), st = stats(), h = S.hero, md = techMods(id);
  const bonus = manual ? H.manualCastBonus : 1, p = skillPower(id) * st.skillPower * bonus;
  const bossMult = isBoss() ? st.bossDmg * (1 + md.boss) : 1;
  const strike = dm => { hitEnemy(dm); pushEvent({ who: 'hero', dmg: dm, skill: d.name }); if (md.leech) h.hp = Math.min(st.maxHp, h.hp + dm * md.leech); if (md.twin) { const d2 = dm * md.twin; hitEnemy(d2); pushEvent({ who: 'hero', dmg: d2, skill: d.name }); } };
  switch (d.type) {
    case 'damage': strike(st.attack * p * bossMult); break;
    case 'execute': strike(st.attack * p * bossMult * (isBoss() ? 3 : 1)); break;
    case 'cleave': strike(st.attack * p * bossMult); h.carry += st.attack * p; break;
    case 'charge': strike(st.attack * p * bossMult * (1 + (S.kingdom ? marching() : 0) / 100)); break;
    case 'heal': h.hp = Math.min(st.maxHp, h.hp + st.maxHp * p); pushEvent({ who: 'heal', dmg: st.maxHp * p, skill: d.name }); break;
    case 'buff': h.buffs[d.stat] = { value: p, until: h.time + skillDur(id) }; break;
  }
  h.cds[id] = skillCd(id);
  gainMastery(id, d.cd);
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
    const cd = skillCdBase(id) * (1 - Math.min(CONFIG.cdrCap, rawMods().cdr || 0));
    o[d.stat] = (o[d.stat] || 0) + skillPower(id) * Math.min(1, skillDur(id) / cd) * w;
  }
  return o;
}
function sustainedSkillDps(st) { // extra dps from damage skills + heal as regen
  let dps = 0, heal = 0; const w = CONFIG.offlineSkillWeight;
  for (const id of S.hero.loadout) {
    const d = skillDef(id), cd = skillCdBase(id) * (1 - st.cdr), md = techMods(id), p = skillPower(id) * st.skillPower * (1 + md.twin);
    if (d.type === 'damage' || d.type === 'execute') dps += st.attack * p / cd * w;
    if (d.type === 'charge') dps += st.attack * p * (1 + (S.kingdom ? marching() : 0) / 100) / cd * w;
    if (d.type === 'cleave') dps += st.attack * p * 2 / cd * w;
    if (d.type === 'heal') heal += st.maxHp * p / cd * w;
  }
  return { dps, heal };
}

// ---------- Stat pipeline ----------
function rawMods() { // attributes + talents only
  const m = {}; const add = (k, v) => m[k] = (m[k] || 0) + v;
  const hp = heroPath(), kp = kingdomPath();
  const tm = pathMods(); for (const e in tm) add(e, tm[e]);
  { const lb = combatLevelBonus(); if (lb) { add('attackPct', lb); add('hpPct', lb); } }
  if (hp) for (const e in hp.mods) add(e, hp.mods[e]);
  if (kp && kp.mods) for (const e in kp.mods) add(e, kp.mods[e]);
  if (perkRank('warcollege')) add('armyPct', 0.10 * perkRank('warcollege'));
  { const wa = wonderAdd('armyPct'); if (wa) add('armyPct', wa); const wx = wonderMult('xp'); if (wx > 1) add('xpPct', wx - 1); const tr = landTrait(landN()); if (tr && tr.mods) for (const k in tr.mods) add(k, tr.mods[k]); }
  if (S.kingdom) { const hm = hallMods(); for (const e in hm) add(e, hm[e]); }
  const vc = vaultCount() * 0.02; if (vc) add('attackPct', vc);
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
  { const am = S.kingdom ? 1 + (armyMult() - 1) * (1 + (m.armyPct || 0)) * pathX('armyX') : 1, lap = S.kingdom && lapActive() ? LC().victoryLap + perkRank('lap') : 1, hm = S.kingdom ? 1 + (armyHpMult() - 1) * ((landTrait(landN()) || {}).armyHp ?? 1) : 1; st.army = am; st.lap = lap; st.gearAttack = st.attack; st.attack *= am * lap; st.dps *= am * lap; st.maxHp *= hm; st.regen *= hm;
    const bm = Math.pow(1.08, perkRank('bloodline')) * pathX('attackX'), lm = Math.pow(1.08, perkRank('lineage')) * pathX('hpX'); st.bloodline = bm; st.attack *= bm; st.dps *= bm; st.maxHp *= lm; st.regen *= lm;
    const wa = wonderMult('attack'), wh = wonderMult('hp'); st.wonder = wa; st.attack *= wa; st.dps *= wa; st.maxHp *= wh; st.regen *= wh; }
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
function endlessDepth(n) { return ((S.kingdom && S.kingdom.lands && S.kingdom.lands[n]) || {}).depth || 0; }
function farming(gid = S.hero.ground, stage = S.hero.stage) { const n = landN(gid); return n > 0 && isEndless(stage, gid) && landDone(n); }
function endlessWin(k = 1) { // 0.10.6: every 50 wins in a conquered land's Endless Battle go one level deeper — tougher foes, richer spoils
  const n = landN(), L = landState(n), ED = LC().endlessDepth; L.wins = (L.wins || 0) + k;
  while (L.wins >= ED.winsPer) { L.wins -= ED.winsPer; L.depth = (L.depth || 0) + 1; S.legacy.depthBest = S.legacy.depthBest || {}; const first = L.depth > (S.legacy.depthBest[n] || 0); if (first) S.legacy.depthBest[n] = L.depth;
    log(`${landDef(n).name}: the Endless Battle grows fiercer — depth ${L.depth}.`); pushEvent({ who: 'depth', n, depth: L.depth, first }); }
}
function farmLand(n) { const G = landDef(n); if (!G || !landDone(n)) return false; if (S.hero.ground !== landId(n) && !setGround(landId(n))) return false; const h = S.hero; h.stage = G.stages + 1; h.kills = 0; h.enemyHp = 0; h.carry = 0; return true; }
function landCurve(stage, gid) { // 0.10.1: {hp, hit} for a land stage, or null outside lands
  const G = CONFIG.grounds[gid]; if (!G || !G.land) return null; const C = LC().curve, n = G.land, S_ = G.stages, end = stage > S_;
  const f = Math.min(1, Math.max(0, (stage - 1) / Math.max(1, S_ - 1))), boss = !end && isBoss(stage), ruler = stage === S_;
  let hp = C.hp * Math.pow(C.landHp, n - 1) * Math.pow(C.spanHp, f), hit = C.hit * Math.pow(C.landHit, n - 1) * Math.pow(C.spanHit, f);
  { const tr = landTrait(n); if (tr) { hp *= tr.hp || 1; hit *= tr.hit || 1; } hp *= ageMult('hp'); hit *= ageMult('hit'); }
  if (ruler && isEraRuler(n)) { hp *= CONFIG.eras.rulerHp; hit *= CONFIG.eras.rulerHit; }
  if (ruler) { hp *= C.rulerHp; hit *= C.rulerHit; } else if (boss) { hp *= C.captainHp; hit *= C.captainHit; } else if (end) { const ED = LC().endlessDepth, dp = endlessDepth(n); hp *= C.endless * Math.pow(ED.hp, dp); hit *= C.endless * Math.pow(ED.hit, dp); }
  return { hp: Math.max(1, Math.round(hp)), hit: Math.round(hit * 10) / 10 };
}
function enemyMaxHp(stage = S.hero.stage, gid = S.hero.ground) { const lc = landCurve(stage, gid); if (lc) return lc.hp; const t = effType(stage, gid), { k } = stageType(stage), R = CONFIG.stages.refHit(t); return Math.max(1, Math.round(isBoss(stage) ? R * 24 : R * (2 + (k - 1) / 8))); } // Beta 0.1.16: bosses ×3 HP (was R × 8)
function enemyHit(stage = S.hero.stage, gid = S.hero.ground) { const lc = landCurve(stage, gid); if (lc) return lc.hit; const t = effType(stage, gid), { k } = stageType(stage), hp = CONFIG.stages.refHeroHp(t); return Math.round((isBoss(stage) ? hp * 0.05 : hp * (0.05 + 0.10 * (k - 1) / 8)) * 10) / 10; } // Beta 0.1.16: bosses hit ×1/3 as hard (was 0.15)
function enemyDps(stage = S.hero.stage) { return enemyHit(stage) / H.enemyAttackInterval; }
function ground() { return CONFIG.grounds[S.hero.ground] || CONFIG.grounds.wilds; }
function groundUnlocked(id) { const G = CONFIG.grounds[id]; if (!G || !G.req) return true; if (G.req.land) return landOpen(G.req.land) || landPct(G.req.land) > 0; if (G.req.tech) return hasTech(G.req.tech); if (G.req.stage) return (S.hero.ground === 'wilds' ? S.hero.bestStage : (S.hero.grounds.wilds || {}).bestStage || 1) > G.req.stage || !!S.hero.bossesKilled['wilds:' + G.req.stage]; /* Beta 0.1.15: the boss on that stage must fall, not just be reached */ return true; }
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
function stageLabel(stage = S.hero.stage, gid = S.hero.ground) { const { k } = stageType(stage), T = enemyType(stage, gid); if (landN(gid)) return `Battle ${stage} · ${isBoss(stage) ? T.boss : T.plural}`; /* Beta 0.3.0 */ return `${enemyTypeLoops(stage, gid) ? 'Elder ' : ''}${T.name} ${k}/${CONFIG.stages.perType}`; }
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
  if (G.land && G.spoil && farming(S.hero.ground, stage)) { const ED = LC().endlessDepth; o[G.spoil] = Math.max(o[G.spoil] || 0, ED.spoilBase * (1 + ED.perLand * (G.land - 1)) * Math.min(ED.dropCap, Math.pow(ED.drop, endlessDepth(G.land))) * (1 + 0.25 * perkRank('spoils')) * wonderMult('tax') * ageMult('spoil') * ((landTrait(G.land) || {}).spoil || 1)); } // farming a conquered land pays its spoil
  return o;
}
function lootRarity(k) { return (CONFIG.resources[k] && CONFIG.resources[k].rarity) || 'common'; }
function killsNeeded(stage = S.hero.stage) { return isBoss(stage) ? H.bossKillsToAdvance : H.killsToAdvance; }

// Closed-form farm rate (kills/sec) using sustained stats; 0 if the hero can't survive a fight.
function killHeal(st) { return st.regen / H.regenPctOfMax * H.killHeal; } // scales with max HP and every healing bonus
function fightNet(stage = S.hero.stage, st = stats('sustained')) {
  const dps = st.dps * (isBoss(stage) ? st.bossDmg : 1), ttk = enemyMaxHp(stage) / dps;
  const taken = Math.max(0, (effectiveEnemyDps(st, stage) - st.regen) * ttk);
  return { ttk, taken, net: taken - killHeal(st), maxHp: st.maxHp };
}
// Sustainable = he survives one fight from full HP and heals back at least what each fight costs him.
function stageSustainable(stage = S.hero.stage) { const f = fightNet(stage); return f.taken < f.maxHp * 0.9 && f.net <= 0; }
function farmRate(stage = S.hero.stage) { const f = fightNet(stage); if (isEndless(stage)) { if (f.taken >= f.maxHp) return 0; const st = stats('sustained'), rest = f.net > 0 ? f.net / (st.regen * st.restSpeed) : 0; return 1 / (f.ttk + rest); } return f.taken >= f.maxHp ? 0 : 1 / f.ttk; } // the Endless Battle: he rests when beaten, never retreats
// Danger = share of max HP lost per fight after healing (≥1: one fight would beat him).
function stageDanger(stage = S.hero.stage) { const f = fightNet(stage); return f.taken >= f.maxHp ? f.taken / f.maxHp : Math.max(0, f.net) / f.maxHp; }
function isEndless(stage = S.hero.stage, gid = S.hero.ground) { const G = CONFIG.grounds[gid]; return !!(G && G.land && G.stages && stage > G.stages); }
function autoKillsNeeded(stage = S.hero.stage) { return isBoss(stage) ? H.bossKillsToAdvance : H.autoAdvanceKills; }
function autoAdvanceBlock(stage = S.hero.stage) { // why the hero won't push on by himself (null = he will)
  const G = ground();
  if (isEndless(stage)) return 'endless';
  if (G.stages && stage >= G.stages && !(G.land && landDone(G.land))) return 'end';
  if (S.settings.autoAdvance === false) return 'off';
  if (G.land && G.stages && stage >= G.stages) return null; // the Ruler is beaten: on into the Endless Battle
  if (isBoss(stage + 1) && !G.land) return 'boss'; // in a land he marches on through captains and the Ruler
  if (!stageSustainable(stage + 1)) return 'tough';
  return null;
}
function heroRetreat(st) {
  const h = S.hero, from = h.stage, boss = isBoss(from), foe = enemyName(from);
  retreat(); h.hp = st.maxHp; h.enemyHp = 0; h.carry = 0; h.atkTimer = 0; h.eTimer = 0;
  h.retreatNote = { from, to: h.stage, boss, foe, t: h.time };
  log(boss ? `The ${foe} was too strong — your hero had to retreat to stage ${h.stage}.` : `Your hero had to retreat to stage ${h.stage} — stage ${from} hits harder than he can heal.`);
  pushEvent({ who: 'retreat', from, to: h.stage, boss });
}
function offlineStages(kills) { // AFK: retreat to a stage he can hold, then push on every 50 kills while it is safe
  const h = S.hero, from = h.stage;
  if (!isEndless() && !stageSustainable(h.stage) && h.stage > 1) { while (h.stage > 1 && !stageSustainable(h.stage)) h.stage--; h.kills = 0; h.enemyHp = 0; h.retreatNote = { from, to: h.stage, boss: false, foe: enemyName(from), t: h.time, away: true }; log(`While you were away your hero had to retreat to stage ${h.stage}.`); }
  let rem = Math.floor(kills), guard = 0;
  while (guard++ < 500) {
    const need = Math.max(0, autoKillsNeeded() - h.kills); if (rem < need || autoAdvanceBlock()) break;
    rem -= need; h.kills += need; if (isBoss(h.stage)) bossSlain(h.stage); if (!advance()) break;
  }
  h.kills += rem; if (isEndless()) S.stats.endlessKills = (S.stats.endlessKills || 0) + Math.floor(kills);
  if (farming()) { const L = landState(landN()), ED = LC().endlessDepth; let w = Math.floor(kills); // AFK: go deeper only while the next depth is safe
    while (w > 0) { const step = Math.min(w, ED.winsPer - (L.wins || 0)); if ((L.wins || 0) + step >= ED.winsPer) { L.depth = (L.depth || 0) + 1; if (!stageSustainable(h.stage)) { L.depth--; L.wins = ED.winsPer - 1; break; } L.depth--; endlessWin(step); } else L.wins = (L.wins || 0) + step; w -= step; } }
}
// ---------- Resources ----------
// Caps: P0 = the Pack (100, Leather Pack 150). P1+ = the Storehouse (§7.6 of the v0.3 design).
function resId(k) { return k; }
function resCap(k) {
  const R_ = CONFIG.resources[k]; if (R_ && R_.kind === 'war') { if (k === 'soldiers') return 1e12; return storeCap(k) * KC().war.supplyCapMult; }
  if (k === 'gold' && S.kingdom && phase() === 3) return storeCap('gold') * taxGrowthTo(landsHeld() + 2);
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
// Beta 0.1.26: overflow is measured so the building view can show what's being sold off
const OFLOW = { acc: {}, rate: {}, t: 0 };
function overflowTick(dt) { OFLOW.t += dt; if (OFLOW.t < 5) return; for (const k in OFLOW.rate) if (!OFLOW.acc[k]) delete OFLOW.rate[k]; for (const k in OFLOW.acc) OFLOW.rate[k] = { u: OFLOW.acc[k].u / OFLOW.t, g: OFLOW.acc[k].g / OFLOW.t }; OFLOW.acc = {}; OFLOW.t = 0; }
function overflowRate(k) { return OFLOW.rate[k] || { u: 0, g: 0 }; }
function overflowSell(k, extra) { if (!(extra > 0) || !CONFIG.resources[k] || !CONFIG.resources[k].sell) return 0; const g = extra * CONFIG.resources[k].sell * KC().autoSell; add('gold', g); S.kingdom.autoSold = (S.kingdom.autoSold || 0) + g; const a = OFLOW.acc[k] = OFLOW.acc[k] || { u: 0, g: 0 }; a.u += extra; a.g += g; return g; }
function storeDeliver(k, n) { const got = add(k, n), extra = n - got; overflowSell(k, extra); S.stats.made = S.stats.made || {}; S.stats.made[k] = (S.stats.made[k] || 0) + n; return got; }
function canAfford(cost) { if (!cost) return false; for (const k in cost) if ((S.res[k] || 0) < cost[k]) return false; return true; }
function pay(cost) { for (const k in cost) S.res[k] -= cost[k]; }

// ---------- Kingdom (v0.3): production lines, steps, carts, thralls, overseers, orders, renown ----------
const THRALL_NAMES = ['Brann', 'Ysolde', 'Kettil', 'Marra', 'Osric', 'Thyra', 'Gundar', 'Liv', 'Halvar', 'Sigrun', 'Rurik', 'Eydis', 'Torvald', 'Asta', 'Bjorn', 'Freya', 'Ulf', 'Helga', 'Ragna', 'Sten'];
const KC = () => CONFIG.kingdom;
function kingdomNo() { return S.legacy.foundings; } // Kingdom N = the Nth founding; 0 = still in the wild
const _lineOf = {}; function lineOf(id) { if (!(id in _lineOf)) { const d = stepDef(id); _lineOf[id] = d ? d.line : null; } return _lineOf[id]; }
function allSteps() { const o = []; for (const lid in KC().lines) KC().lines[lid].steps.forEach((st, i) => o.push({ ...st, line: lid, index: i })); return o; }
function stepDef(id) { return allSteps().find(s => s.id === id); }
// Settlement tier (Camp 0 → Hamlet 1 → Village 2 → City 3). A step is available at its tier, and runs once built.
function kTier() { return S.kingdom.tier || 0; }
function tierDef(t = kTier()) { return KC().tiers[Math.min(t, KC().tiers.length - 1)]; }
// Phase 3 (the Kingdom) begins when the finished City is proclaimed. Steps with `phase: 3` (the Barracks) only exist after that.
function phase() { return S.kingdom && S.kingdom.phase === 3 ? 3 : kingdomNo() > 0 ? 2 : 1; }
function canProclaim() { return kingdomNo() > 0 && phase() < 3 && cityComplete() && questReached('y04'); }
function proclaim() {
  if (!canProclaim()) return false;
  const gain = CONFIG.legacy.proclaimCrowns; S.legacy.knowledge += gain; S.kingdom.phase = 3; if (S.hero.activity !== 'fight') { S.hero.activity = 'fight'; S.hero.harvestTimer = 0; } S.kingdom.proclaimedAt = S.hero.time;
  for (const k of ['food', 'supplies', 'soldiers']) S.res[k] = S.res[k] || 0;
  log(`The Kingdom is proclaimed! Your City is now the Capital. +${gain} Crowns.`); pushEvent({ who: 'proclaim' }); save(); return gain;
}
function stepAvailable(id) { const d = stepDef(id); return !!d && kingdomNo() > 0 && d.tier <= kTier() && (!d.phase || phase() >= d.phase); }
function stepBuilt(id) { const d = stepDef(id); return !!d && stepAvailable(id) && (!d.build || !!(S.kingdom.built || {})[id]); }
function stepUnlocked(id) { return stepBuilt(id); }
function canBuild(id) { const d = stepDef(id); return stepAvailable(id) && !stepBuilt(id) && canAfford(d.build); }
function buildStep(id) { if (!canBuild(id)) return false; pay(stepDef(id).build); S.kingdom.built = S.kingdom.built || {}; S.kingdom.built[id] = true; const s = stepState(id); s.lv = 1; s.lvW = 1; s.lvC = 1; s.lvH = 1; log(`Built the ${stepDef(id).name}.`); autoUnpin(); return true; }
function lineUnlocked(lid) { return kingdomNo() > 0 && KC().lines[lid].steps.some(s => stepAvailable(s.id)); }
function lineSteps(lid) { return KC().lines[lid].steps.map((s, i) => ({ ...s, line: lid, index: i })).filter(s => stepBuilt(s.id)); }
// Raising the settlement: every current-tier step built and staffed, and `cap` of every good made so far paid in.
function tierGoods() { return allSteps().filter(st => st.tier <= kTier() && !st.phase).map(st => st.make); }
function tierNeed() { const t = kTier(); if (t >= KC().tiers.length - 1) return null; const n = tierDef(t).cap, o = {}; for (const st of allSteps()) if (st.tier === t && !st.phase) o[st.make] = Math.round(n * (t > 0 ? 0.4 : 1)); return o; } // Beta 0.1.22: only the highest-tier good of each chain — earlier goods are no longer asked for
function tierPaid() { return S.kingdom.tierPaid || {}; }
function tierPaidDone() { const need = tierNeed(); if (!need) return true; for (const k in need) if ((tierPaid()[k] || 0) < need[k]) return false; return true; }
function tierStepsReady() { return allSteps().filter(st => st.tier === kTier() && !st.phase).every(st => stepBuilt(st.id)); }
function tierThreat(t = kTier()) { const k = tierDef(t).threat; if (!k) return null; const [g, st] = k.split(':'), G = CONFIG.grounds[g], ty = G.line[Math.min(Math.floor((+st - 1) / 10), G.line.length - 1)]; return { key: k, ground: g, stage: +st, name: ty.boss, where: G.name, done: !!S.hero.bossesKilled[k] }; }
function contribute() { const need = tierNeed(); if (!need) return 0; S.kingdom.tierPaid = S.kingdom.tierPaid || {}; let n = 0; for (const k in need) { const m = Math.min(Math.floor(S.res[k] || 0), need[k] - (S.kingdom.tierPaid[k] || 0)); if (m > 0) { S.res[k] -= m; S.kingdom.tierPaid[k] = (S.kingdom.tierPaid[k] || 0) + m; n += m; } } return n; }
const RAISE_QUEST = ['c04', 'h07', 'v07']; // raising the settlement is a quest moment
function canRaise() { const th = tierThreat(), rq = RAISE_QUEST[kTier()]; return !!tierNeed() && tierPaidDone() && tierStepsReady() && (!th || th.done) && (!rq || questReached(rq) || S.legacy.dynasty > 1); }
function raiseTier() { if (!canRaise()) return false; S.kingdom.tier = kTier() + 1; S.kingdom.tierPaid = {}; log(`Your settlement is now a ${tierDef().name}!`); pushEvent({ who: 'tier', name: tierDef().name }); return true; }
function accountantSteps() { return allSteps().filter(st => st.tier === 2); }
function cityChecks() {
  const all = allSteps().filter(st => !st.phase);
  return { city: kTier() >= 3, built: all.filter(st => stepBuilt(st.id)).length, crews: all.filter(st => stepBuilt(st.id) && stepState(st.id).workers.length >= 3).length,
    overseers: all.filter(st => stepBuilt(st.id) && stepState(st.id).overseer !== null).length, accountants: accountantSteps().filter(st => stepBuilt(st.id) && stepState(st.id).accountant != null).length, steps: all.length, finals: accountantSteps().length };
}
function cityComplete() { return kTier() >= 3 && barracksBuilt() && allSteps().filter(st => !st.phase).every(st => stepBuilt(st.id) && stepLv(st.id) >= KC().minLv); }
function minBuildingLv() { return Math.min(...allSteps().filter(st => !st.phase).map(st => stepBuilt(st.id) ? stepLv(st.id) : 0)); }
function stepState(id) { const K = S.kingdom; K.steps = K.steps || {}; if (!K.steps[id]) K.steps[id] = { lv: 1, lvW: 1, lvC: 1, lvH: 1, rate: 1, haul: 1, cart: 1, inBuf: 0, phase: 0, t: 0, workers: [], overseer: null, abilityUntil: 0, abilityReady: 0 }; const st = K.steps[id]; if (st.phase === undefined) { st.phase = 0; st.t = 0; } if (!st.lv) st.lv = 1; if (!st.lvW) { st.lvW = st.lv; st.lvC = st.lv; st.lvH = st.lv; } return st; }
// 0.12: every building has three parts — Work makes the goods, Cart loads them, Haul brings them home. Each has its own level.
const PARTS = ['W', 'C', 'H'], PART_NAME = { W: 'Work', C: 'Cart', H: 'Haul' };
function partName(id, p) { const d = stepDef(id), n = d && d.parts; return n ? n[PARTS.indexOf(p)] : PART_NAME[p]; } // each building names its own steps
function partLv(id, p, d = 1) { const s = stepState(id); if (d <= 1) return s['lv' + p] || 1; return (((s.deep || [])[d - 2]) || {})[p] || 1; }
// 0.12.1: every building grows levels (groves, fields, furnaces… the Mine's depths). Level 1 keeps the animated cycle; deeper levels produce steadily.
const DC = () => KC().depths;
function depthCount(id) { return 1 + ((stepState(id).deep || []).length); }
function depthYield(d) { return Math.pow(DC().yield, d - 1); }
function unitName(id, plural) { const u = (stepDef(id) || {}).unit || ['Level', 'levels']; return plural ? u[1] : u[0]; }
// Beta 0.1.3: Work, Cart and Haul run side by side like a conveyor — each has a capacity per second, and the slowest one sets the output (Idle Miner rules).
function baseOut(id) { const d = stepDef(id); return d.batch / (d.batch / d.base + KC().loadBase + KC().haulBase); } // at equal levels this matches the old cycle
function partCap(id, p, d = 1, lvAt) { const L = lvAt || partLv(id, p, d); /* lvAt: the cap this part would have at another level */ return baseOut(id) * trackGrow(L) * Math.pow(2, milestoneCount(L)) * depthYield(d) * stepMods(id).rate; }
function depthOutput(id, d) { return Math.min(...PARTS.map(p => partCap(id, p, d))); }
// Beta 0.1.5: goods move through the parts one after another. Each part makes trips: a trip takes tripTime and carries up to tripLoad.
// Work → pile → Cart → pile → Haul → Storehouse. A slow part leaves the pile before it growing: that's the bottleneck you can see.
const TRIP = { W: 6, C: 5, H: 8 };
function tripTime(id, p, d = 1) { return TRIP[p] / (1 + 0.02 * (partLv(id, p, d) - 1)); }
function tripLoad(id, p, d = 1) { return partCap(id, p, d) * tripTime(id, p, d); }
function pipe(id, d = 1) { const s = stepState(id); s.pipes = s.pipes || []; while (s.pipes.length < d) s.pipes.push({ a: 0, b: 0, w: 0, c: 0, h: 0, tw: 0, tc: 0, th: 0 }); return s.pipes[d - 1]; }
function runStage(P, carry, t, T, left, take, done) { // one trip at a time: pick up (take), travel T seconds, then done(load)
  let guard = 0; while (left > 1e-9 && guard++ < 50) { if (P[carry] <= 1e-9) { const x = take(); if (x <= 1e-9) { P[t] = 0; return; } P[carry] = x; P[t] = 0; }
    const need = T - P[t]; if (left >= need) { left -= need; const x = P[carry]; P[carry] = 0; P[t] = 0; done(x); } else { P[t] += left; left = 0; } } }
function tickPipe(st, s, d, nx, dt) {
  const id = st.id, P = pipe(id, d), Lw = tripLoad(id, 'W', d), Lc = tripLoad(id, 'C', d), Lh = tripLoad(id, 'H', d);
  runStage(P, 'w', 'tw', tripTime(id, 'W', d), dt, () => { if (P.a > Lw * 40) return 0; let x = Lw; if (st.from) { x = Math.min(x, s.inBuf / st.ratio); s.inBuf -= x * st.ratio; } return x; }, x => { P.a += x; });
  runStage(P, 'c', 'tc', tripTime(id, 'C', d), dt, () => { const x = Math.min(P.a, Lc); P.a -= x; return x; }, x => { P.b += x; });
  runStage(P, 'h', 'th', tripTime(id, 'H', d), dt, () => { const x = Math.min(P.b, Lh); P.b -= x; return x; }, x => routeOut(st, nx, x));
}
function deepOutput(id) { let o = 0; for (let d = 2; d <= depthCount(id); d++) o += depthOutput(id, d); return o; }
function digOpen() { return phase() === 3; }
function digCost(id) { return { gold: Math.round(DC().digBase * Math.pow(DC().digGrowth, depthCount(id) - 1) * ageMult('gold')) }; }
function canDig(id) { return digOpen() && stepBuilt(id) && canAfford(digCost(id)); }
function dig(id) { if (!canDig(id)) return false; pay(digCost(id)); const s = stepState(id); s.deep = s.deep || []; s.deep.push({ W: 1, C: 1, H: 1 }); const d = depthCount(id); S.stats.digs = (S.stats.digs || 0) + 1;
  log(`${stepDef(id).name}: ${unitName(id)} ${d} is ready — it can grow ×${fmt(depthYield(d))} bigger than the first.`); pushEvent({ who: 'dig', id, d, name: stepDef(id).name, unit: unitName(id) }); return d; }
// Beta 0.1.24: parts within 0.5% of the slowest are tied — all of them hold the level back, and raising just one gains nothing
function limitParts(id, d = 1) { const c = PARTS.map(p => partCap(id, p, d)), mn = Math.min(...c); return PARTS.filter((p, i) => c[i] <= mn * 1.005); }
function limitPart(id, d = 1) { const t = limitParts(id, d); return t[t.length - 1]; } // with a tie, the furthest one along (goods wait in front of it)
function nextStep(id) { const d = stepDef(id); const n = KC().lines[d.line].steps[d.index + 1]; return n && stepUnlocked(n.id) ? n : null; }
function thrall(i) { return S.kingdom.thralls[i]; }
function thrallName(i) { const t = thrall(i); return t ? t.name : 'Thrall'; }
function thrallLevel(t) { return t ? 1 + Math.floor(Math.sqrt((t.xp || 0) / KC().thrallXpDiv)) : 1; }
function thrallLvMult(t) { return 1 + KC().thrallLvBonus * (thrallLevel(t) - 1); }
function thrallCap() { return tierDef().thralls + (phase() === 3 ? KC().war.thrallBonus : 0); } // the Kingdom adds room for the Barracks crew and officers
function roleMult(t, role) { if (!t || t.role !== role) return 1; return (KC().starMult[t.stars] || 1) * (1 + 0.02 * (thrallLevel(t) - 1)); }
function stepWorkerSlots(id) { return tierDef().slots; }
// 0.9: a building runs once built. Its speed comes from its level (all three parts of the cycle), milestones and the hero's Lordship.
function stepMods(id) {
  const lord = 1 + KC().lordship * (S.hero.level - 1), kp = kingdomPath(), km = kp ? (kp.jobSpeed || 1) * (((kp.outputMult || {})[lineOf(id)]) || 1) : 1; // 0.10.5: the kingdom's path really changes its buildings
  return { rate: lord * km * (1 + 0.15 * perkRank('charter')) * (1 + 0.1 * perkRank('treasury')) * wonderMult('supply'), haul: 1, cart: 1, working: stepBuilt(id) }; // 0.12: Master Builders, Dynastic Treasury and the Great Granary raise production
}
function stepLv(id) { const s = stepState(id); return Math.min(s.lvW, s.lvC, s.lvH) || 1; } // 0.12: a building's level is its lowest part
function milestoneCount(lv) { return KC().milestones.filter(m => lv >= m).length; }
function nextMilestone(lv) { return KC().milestones.find(m => m > lv) || null; }
function levelCap() { return tierDef().lvCap || 1e9; }
// One production cycle = Work (make a batch) → Cart (load it) → Haul (deliver it). Each track shortens its own phase, forever.
const trackGrow = lv => 1 + KC().trackGrowth * (lv - 1);
// Stock targets: an intermediate good (planks, flour, ingots) fills the Storehouse up to its target before it feeds the next building.
// Auto = what the kingdom currently needs: unbuilt buildings, the settlement payment, open orders.
const STOCK_MODES = ['auto', 0, 0.25, 0.5, 1];
function stockMode(k) { const m = (S.kingdom.stock || {})[k]; return m === undefined ? 'auto' : m; }
function setStockMode(k, m) { if (!STOCK_MODES.includes(m)) return false; (S.kingdom.stock = S.kingdom.stock || {})[k] = m; return true; }
function stockDemand(k, noOrders) {
  const why = []; let n = 0;
  for (const lid in KC().lines) for (const d of KC().lines[lid].steps) { if (!d.build || !d.build[k] || !stepAvailable(d.id) || stepBuilt(d.id)) continue; n += d.build[k]; why.push(d.name); }
  if (barracksAvailable() && !barracksBuilt() && KC().army.build[k]) { n += KC().army.build[k]; why.push('Barracks'); }
  for (const h of KC().halls) if (hallAvailable(h.id) && !hallLv(h.id) && h.build[k]) { n += h.build[k]; why.push(h.name); }
  let allBuilt = true; for (const lid in KC().lines) for (const d of KC().lines[lid].steps) if (stepAvailable(d.id) && !stepBuilt(d.id)) allBuilt = false;
  const need = allBuilt ? tierNeed() : null; if (need && need[k]) { const left = Math.max(0, need[k] - (tierPaid()[k] || 0)); if (left > 0) { n += left; why.push(tierDef(kTier() + 1).name); } }
  let o = 0; if (!noOrders) for (const ord of (S.kingdom.orders || [])) o += (ord.wants || {})[k] || 0; if (o) { n += o; why.push('orders'); }
  return { n, why };
}
function stockTarget(k) { const m = stockMode(k), cap = resCap(k); if (m === 'auto') { const d = stockDemand(k); return { target: Math.min(cap, d.n), why: d.why, mode: m, share: 0.5 }; } return { target: Math.floor(cap * m), why: [], mode: m, share: 1 }; }
function nextBufCap(nx) { let l = 0; for (let d = 1; d <= depthCount(nx.id); d++) l += tripLoad(nx.id, 'W', d); return nx.ratio * (l * 3 + stepOutput(nx.id) * 20 + 10); }
function stepBatch(id, d = 1) { return stepDef(id).batch * Math.pow(2, milestoneCount(partLv(id, 'W', d))) * depthYield(d); }
function stepRate(id, dd = 1) { const d = stepDef(id), w = partLv(id, 'W', dd); return d.base * Math.pow(2, milestoneCount(w)) * trackGrow(w) * stepMods(id).rate * depthYield(dd); }
function stepPhases(id, d = 1) { return PARTS.map(p => 1 / Math.max(1e-12, partCap(id, p, d))); } // seconds per unit, per part
function stepCycle(id, d = 1) { return 1 / Math.max(1e-12, depthOutput(id, d)); }
function stepOutput(id) { if (!stepMods(id).working) return 0; return depthOutput(id, 1) + deepOutput(id); }
function stepLimit(id) { // what holds the step back — shown only when an Overseer is present
  const s = stepState(id), d = stepDef(id);
  if (!stepMods(id).working) return 'idle';
  if (d.from && s.phase === 0 && s.inBuf < d.ratio * 0.5) return 'starved';
  const p = stepPhases(id), mx = Math.max(...p); return ['rate', 'cart', 'haul'][p.indexOf(mx)];
}
function stepUpCost(id, part, level, d = 1) { const l = level || partLv(id, part || limitPart(id, d), d), kp = kingdomPath(); return { gold: Math.round(KC().costBase * Math.pow(l, KC().costExp) * ((kp && kp.costMult) || 1) * Math.pow(DC().partCost, d - 1)) }; }
function stepUpPlan(id, part, n, d = 1) { d = Math.max(1, Math.min(d, depthCount(id))); part = PARTS.includes(part) ? part : limitPart(id, d); let g = 0, k = 0; const l = partLv(id, part, d), room = Math.max(0, levelCap() - l), lim = Math.min(room, n === 'max' ? 999 : n); while (k < lim) { const c = stepUpCost(id, part, l + k, d).gold; if ((S.res.gold || 0) < g + c) break; g += c; k++; } return { n: k, cost: { gold: g }, part, d }; }
function upgradeStep(id, part, n = 1, d = 1) {
  if (!stepUnlocked(id)) return false; const p = stepUpPlan(id, part, n, d); if (!p.n) return false; part = p.part; d = p.d;
  const lims = limitParts(id, d), slow = slowestInLine(stepDef(id).line) === id, s = stepState(id), before = partLv(id, part, d);
  pay(p.cost); if (d <= 1) s['lv' + part] += p.n; else s.deep[d - 2][part] += p.n; s.lv = stepLv(id);
  const St = S.stats; St.partUps = (St.partUps || 0) + p.n; if (lims.includes(part)) { St.limitUps = St.limitUps || {}; St.limitUps[id] = (St.limitUps[id] || 0) + p.n; } if (slow) St.slowUps = (St.slowUps || 0) + p.n;
  if (id === 'forge' || id === 'baker' || id === 'carpenter') St.armsFoodUps = (St.armsFoodUps || 0) + p.n;
  { const now = partLv(id, part, d); if (milestoneCount(now) > milestoneCount(before)) { log(`${stepDef(id).name}${d > 1 ? ' ' + unitName(id) + ' ' + d : ''}: ${partName(id, part)} reached Lv ${now} — its capacity doubled!`); pushEvent({ who: 'milestone', id, name: stepName(id), lv: now }); } }
  return p.n;
}
// the chain's slowest building: its output in final-good terms is the lowest
function slowestInLine(lid) {
  const steps = lineSteps(lid); if (steps.length < 2) return null; let best = null, min = Infinity;
  steps.forEach((st, i) => { let cap = stepOutput(st.id); for (let j = i + 1; j < steps.length; j++) cap /= steps[j].ratio; if (cap < min - 1e-9) { min = cap; best = st.id; } });
  return best;
}
function stepName(id) { const d = stepDef(id), m = milestoneCount(partLv(id, 'W')), names = d.names || []; return m && names[m - 1] ? names[m - 1] : d.name; }
function assignWorker(id, i) { if (!stepUnlocked(id) || !thrall(i)) return false; unassign(i); const s = stepState(id); if (s.workers.length >= stepWorkerSlots(id)) return false; s.workers.push(i); return true; }
function assignOverseer(id, i) { if (!stepUnlocked(id) || !thrall(i)) return false; unassign(i); const s = stepState(id); if (s.overseer !== null) s.overseer = null; s.overseer = i; return true; }
function unassign(i) { for (const id in (S.kingdom.steps || {})) { const s = S.kingdom.steps[id]; s.workers = s.workers.filter(x => x !== i); if (s.overseer === i) s.overseer = null; if (s.accountant === i) s.accountant = null; } }
function assignAccountant(id, i) { if (!stepUnlocked(id) || stepDef(id).tier !== 2 || !thrall(i)) return false; unassign(i); stepState(id).accountant = i; return true; }
function thrallPost(i) { for (const id in (S.kingdom.steps || {})) { const s = S.kingdom.steps[id]; if (!stepDef(id)) continue; if (s.overseer === i) return { id, as: 'overseer' }; if (s.accountant === i) return { id, as: 'accountant' }; if (s.workers.includes(i)) return { id, as: 'worker' }; } return null; }
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
  const kq = CONFIG.quests.findIndex(q => q.id === 'k05'); if (kq >= 0 && S.quests.index > kq) { S.quests.index = kq + 1; S.quests.cur = (CONFIG.quests[S.quests.index] || {}).id || null; }
  S.legacy.foundings = 1; // everything so far was one land growing
}
// 0.8: saves that already used the old "Conquer New Lands" reset keep their land; the quest log waits at Proclaim the Kingdom.
function migrate08() { if (S.legacy.foundings < 2 || phase() === 3) return; const y = CONFIG.quests.findIndex(q => q.id === 'y04'); if (y >= 0 && S.quests.index > y) { S.quests.index = y; S.quests.cur = 'y04'; } }
// Repair: free thralls stuck on buildings that no longer exist or are not built, drop bad indices, and keep each thrall in one post only.
function repairPosts() {
  const K = S.kingdom; if (!K || !K.steps || !K.thralls) return 0; const n = K.thralls.length, seen = new Set(); let fixed = 0;
  const ok = i => { if (i === null || i === undefined || i < 0 || i >= n || seen.has(i)) { fixed++; return false; } seen.add(i); return true; };
  for (const id in K.steps) { const s = K.steps[id];
    if (!stepDef(id) || !stepBuilt(id)) { const had = (s.workers || []).length + (s.overseer != null ? 1 : 0) + (s.accountant != null ? 1 : 0); if (had) { fixed += had; s.workers = []; s.overseer = null; s.accountant = null; } if (!stepDef(id)) delete K.steps[id]; continue; }
    s.workers = (s.workers || []).filter(ok).slice(0, stepWorkerSlots(id));
    if (s.overseer != null && !ok(s.overseer)) s.overseer = null;
    if (s.accountant != null && (stepDef(id).tier !== 2 || !ok(s.accountant))) s.accountant = null; }
  if (fixed) log(`${fixed} thrall post${fixed > 1 ? 's were' : ' was'} stuck on old buildings — they are free again.`);
  return fixed;
}
// Quest list changes: find the save's quest by id (0.9.0 saves: by their position in the 0.9.0 list)
const QUESTS_090 = ['f01','f01b','f02','f03','f04','f05','f06','f07','q01','q02','q02b','q03','q04','q05','q06','q06b','q06c','q07','q13','q13a','q14','q11','q12b','q13c','q13d','q13b','q14b','q16','q17','p01','k01','k02','c01','c02','c03','c04','h01','h02','h03','h04','h05','h06','h07','v01','v02','v03','v04','v05','v06','v07','y01','y04','w01','w02','w03','w04','w05','w06'];
function fixQuestIndex() {
  const Q = S.quests; if (!Q) return; const at = id => CONFIG.quests.findIndex(x => x.id === id);
  let id = Q.cur !== undefined ? Q.cur : (Q.index < QUESTS_090.length ? QUESTS_090[Q.index] : null);
  const MERGED = { c03: 'c04', v06: 'v07', p01: 'k01', w01: 'w02', w01b: 'w02' }; if (id && MERGED[id]) id = MERGED[id]; // 0.9.9: boss-threat quests folded into the Raise quests
  if (Q.cur === undefined && Q.index >= QUESTS_090.length) id = null;
  if (id && at(id) >= 0) Q.index = at(id); else if (id === null || Q.dq || /^deed/.test(id)) Q.index = CONFIG.quests.length; // a Deed in progress means the story is done // past the end of the chain stays past the end
  Q.cur = (CONFIG.quests[Q.index] || {}).id || null; if (Q.index >= CONFIG.quests.length && Q.dq) Q.cur = Q.dq.id; // a Deed in progress keeps its place
}
function ensureThralls() { const K = S.kingdom; migrate05(); migrate08(); migrate09(); fixQuestIndex(); repairPosts(); K.steps = K.steps || {}; K.thralls = K.thralls || []; if (!K.offers || !K.offers.length) refreshOffers(); K.orders = K.orders || []; while (kingdomNo() > 0 && K.orders.length < 3 && orderGoods(true).length) K.orders.push(makeOrder()); }
// Storehouse level
function storeUpCost() { return { gold: Math.round(150 * Math.pow((S.kingdom.storeLv || 0) + 1, 1.8)) }; }
function upgradeStore() { const c = storeUpCost(); if (!canAfford(c)) return false; pay(c); S.kingdom.storeLv = (S.kingdom.storeLv || 0) + 1; return true; }
// Where a building's goods go: houses (Carpenter), the Storehouse's stock target, the next building, then the Storehouse.
function routeOut(st, nx, rest) {
  // Beta 0.1.27: lumber is a final good like arms and bread — houses are built from spare Storehouse lumber (tickHouses)
  if (nx && stepMods(nx.id).working) { const T = stockTarget(st.make), short = Math.max(0, T.target - (S.res[st.make] || 0)), keep = Math.min(rest * T.share, short); if (keep > 0) { storeDeliver(st.make, keep); rest -= keep; } }
  if (rest > 0 && nx && stepMods(nx.id).working) { const b = stepState(nx.id), room = Math.max(0, nextBufCap(nx) - b.inBuf), take = Math.min(room, rest); b.inBuf += take; rest -= take; } // the next building takes what it can use
  if (rest > 0) storeDeliver(st.make, rest);
}
// Live tick: each step fills its cart; the cart delivers to the next step's input, or to the Storehouse.
function tickKingdom(dt) {
  if (kingdomNo() < 1) return; overflowTick(dt);
  const K = S.kingdom;
  K.offerTimer = (K.offerTimer || KC().offerRefresh) - dt; if (K.offerTimer <= 0) refreshOffers();
  K.ordCheck = (K.ordCheck || 0) - dt; if (K.ordCheck <= 0) { K.ordCheck = 20; const g = orderGoods(); (K.orders || []).forEach((o, i) => { if (Object.keys(o.wants).some(k => !g.includes(k) && (S.res[k] || 0) < o.wants[k])) K.orders.splice(i, 1, makeOrder(i)); }); // an Order for a good you no longer have spare is replaced
    const seen = []; K.orders.forEach((o, i) => { const k = Object.keys(o.wants)[0]; if (seen.includes(k) && orderGoods().filter(g => !K.orders.some(x => Object.keys(x.wants)[0] === g)).length) K.orders.splice(i, 1, makeOrder(i)); else seen.push(k); }); }
  for (const lid in KC().lines) {
    for (const st of lineSteps(lid)) {
      const s = stepState(st.id), m = stepMods(st.id); if (!m.working) continue;
      if (st.pull) { const g = KC().war.soldierGold, room = Math.max(0, nextBufCap(st) - s.inBuf), take = Math.floor(Math.min(room, S.res[st.from] || 0, (S.res.gold || 0) / g));
        if (take > 0) { S.res[st.from] -= take; S.res.gold -= take * g; s.inBuf += take; } }
      const nx = nextStep(st.id); // every level produces steadily at the pace of its slowest part
      for (let d = 1; d <= depthCount(st.id); d++) tickPipe(st, s, d, nx, dt);
      s.t = (s.t || 0) + dt;
    }
  }
  if (false) for (const st of accountantSteps()) { // 0.10: no more Quartermaster stockpiles — the army draws income directly (tickArmy)
    if (!stepBuilt(st.id)) continue; const to = KC().war.quartermaster[st.make]; if (!to) continue;
    const keep = stockTarget(st.make).target, room = Math.max(0, resCap(to) - (S.res[to] || 0)), n = Math.floor(Math.min((S.res[st.make] || 0) - keep, room));
    if (n > 0) { S.res[st.make] -= n; add(to, n); }
  }
}
// Rates (per second, steady state) for display and offline: each line's final unlocked step feeds the Storehouse.
function kingdomRates(display = false) {
  const r = {}; if (kingdomNo() < 1) return r;
  for (const lid in KC().lines) {
    const steps = lineSteps(lid); let supply = 0;
    if (steps[0] && steps[0].pull) { if (display && (S.res[steps[0].from] || 0) >= 1) { const o = stepOutput(steps[0].id); if (o > 0) r[steps[0].make] = (r[steps[0].make] || 0) + o; } continue; }
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
// Beta 0.1.13: steady-state flow of a whole chain, for the building view's supply card.
// Each entry: cap = what the building can make, supply = input it gets per second, use = input it could take, out = what it really makes, spare = output the next building can't take (to the Storehouse).
function chainFlow(lid) {
  const res = []; let supply = 0;
  const steps = lineSteps(lid);
  for (let i = 0; i < steps.length; i++) {
    const st = steps[i]; if (!stepMods(st.id).working || st.pull) break;
    const cap = stepOutput(st.id), use = st.from ? cap * st.ratio : 0, out = i === 0 ? cap : Math.min(cap, supply / st.ratio);
    const nx = steps[i + 1] && stepMods(steps[i + 1].id).working && !steps[i + 1].pull ? steps[i + 1] : null;
    const used = nx ? Math.min(out, stepOutput(nx.id) * nx.ratio) : 0;
    res.push({ id: st.id, name: st.name, make: st.make, from: st.from || null, cap, supply: i === 0 ? 0 : supply, use, out, spare: nx ? out - used : out });
    supply = used;
  }
  return res;
}
// Orders
// Goods an Order may ask for: what the kingdom delivers to the Storehouse, best goods first; then goods the hero gathers.
function orderGoods(all = false) {
  const kg = []; // 0.12: Orders only ask for spare goods — what reaches the Storehouse after the next building has taken its share — so they never starve a chain
  const kr = kingdomRates(); for (const k in kr) if (kr[k] > 1e-9 && CONFIG.resources[k] && CONFIG.resources[k].kind !== 'war') kg.push(k);
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
function orderReserve(k) { const d = stockDemand(k, true); return d.n; } // 0.12: goods kept for buildings, halls, the Barracks and the next settlement
function canDeliver(i) { const o = (S.kingdom.orders || [])[i]; if (!o || !canAfford(o.wants)) return false; for (const k in o.wants) if ((S.res[k] || 0) - o.wants[k] < orderReserve(k)) return false; return true; }
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
function gearTierUnlocked(tier, slot) { if (tier > HARD_T) tier = HARD_T; return CONFIG.techs.some(t => t.unlocks.gearTier === tier && hasTech(t.id) && (!t.unlocks.slots || !slot || t.unlocks.slots.includes(slot))); }
function dropGated(res) { return CONFIG.techs.some(t => t.unlocks.drop === res); }
function dropUnlocked(res) { return !dropGated(res) || CONFIG.techs.some(t => t.unlocks.drop === res && hasTech(t.id)); }
function techJobSpeed() { let s = 1; for (const t of CONFIG.techs) if (hasTech(t.id) && t.unlocks.jobSpeed) s *= 1 + t.unlocks.jobSpeed; return s; }
function grantTechTiers(n) { for (const t of CONFIG.techs) if (t.tier < n) S.tech[t.id] = true; }

// ---------- Quests ----------
function questCurrent() { return CONFIG.quests[S.quests.index] || deedCurrent(); }
// ---- 0.10.5: Deeds — endless goals once the story quests run out (Kingdom phase) ----
const DEED_ORDER = ['land', 'depth', 'gear', 'army', 'land', 'houses', 'trophy']; // passing the crown stays the player's call: the land Deed mentions it when it would pay well
function deedOk(type) {
  const held = landsHeld();
  if (type === 'land') { const L = held + 1; return !!landDef(L) && landQuestOk(L) && (L === 1 || landDone(L - 1)); }
  if (type === 'heir') return !!(S.kingdom && S.kingdom.ageDone);
  if (type === 'wonder') { const e = nextWonderEra(); return wonderUnlocked(e) && !wonderBuilt(e); }
  if (type === 'gear') return phase() === 3;
  if (type === 'army') return barracksBuilt();
  if (type === 'houses') return false; // Beta 0.2.0: no houses
  if (type === 'depth') return digOpen() && allSteps().some(st => stepBuilt(st.id) && digCost(st.id).gold <= 0.5 * resCap('gold'));
  if (type === 'trophy') { const t = trophyNear(); return !!t && t.left <= 300; } // only when a head is within reach
  if (type === 'pass') { const best = Math.max(0, ...(S.legacy.history || []).map(h => h.crowns || 0)); return canPassCrown() && crownsIfPass() > best && crownsIfPass() >= 3; }
  return false;
}
function trophyNear() { let best = null; const T = CONFIG.trophies.tiers, here = S.hero.ground + ':'; for (const key in (S.legacy.kills || {})) { if (!key.startsWith(here)) continue; /* only foes the hero is fighting now */ const k = S.legacy.kills[key], nx = T.find(t => k < t.kills); if (!nx) continue; const left = nx.kills - k; if (!best || left < best.left) best = { key, left, tier: nx.name }; } return best; }
function deedGen() {
  const Q = S.quests, n = Q.dn || 0, order = S.kingdom && S.kingdom.ageDone ? ['heir'] : deedOk('wonder') ? ['wonder'] : [];
  for (let i = 0; i < DEED_ORDER.length; i++) order.push(DEED_ORDER[(n + i) % DEED_ORDER.length]);
  for (const type of order) { if (!deedOk(type)) continue;
    const d = { id: 'deed' + n, n: n + 1, type };
    if (type === 'land') d.a = landsHeld() + 1;
    if (type === 'gear') d.a = Math.min(...['weapon', 'chest', 'helm'].map(k => (S.hero.gear[k] || { tier: 0 }).tier)) + 1;
    if (type === 'army') d.a = Math.max(10, Math.ceil(recArmy(Math.min(landsHeld() + 1, CONFIG.ages.lands)) * 0.15));
    if (type === 'houses') { d.a = Math.max(5, Math.ceil(turnedRecent() / PC().perHouse)); d.m = turnedRecent(); }
    if (type === 'depth') { let best = null; const ok = id => digCost(id).gold <= 0.5 * resCap('gold'); for (const lid in KC().lines) { const sl = slowestInLine(lid); if (sl && ok(sl) && (!best || stepOutput(sl) < stepOutput(best))) best = sl; } if (!best) best = allSteps().filter(st => stepBuilt(st.id) && ok(st.id)).sort((a, b) => digCost(a.id).gold - digCost(b.id).gold)[0].id; d.b = best; d.a = depthCount(d.b) + 1; }
    if (type === 'pass') d.a = crownsIfPass();
    if (type === 'wonder') d.a = nextWonderEra();
    if (type === 'heir') d.a = ageNo();
    if (type === 'trophy') { const t = trophyNear(); if (t) { const [gid, ...rest] = t.key.split(':'); const nm = (CONFIG.grounds[gid] && (CONFIG.grounds[gid].line || []).find(x => x.id === rest.join(':'))) || null; d.hint = `${t.tier}${nm ? ' ' + nm.name : ''} head, ${t.left} kills to go`; } }
    d.gold = Math.round(Math.max(1000, taxTotalPerHour()));
    return d; }
  return null;
}
function deedCurrent() {
  const Q = S.quests; if (Q.index < CONFIG.quests.length || phase() !== 3) return null;
  if (Q.dq && Q.dq.type === 'trophy' && !deedOk('trophy') && trophyCount() <= ((Q.base || {})[Q.dq.id] || {})['{"stat":"trophies","need":1,"since":true}']) { Q.dn = (Q.dn || 0) + 1; Q.dq = null; } // the hero moved on: hunt something else
  if (Q.dq && Q.dq.type === 'land' && !landDef(Q.dq.a)) Q.dq = null; // 0.11.1: lands past 10 are gone
  if (!Q.dq) { Q.dq = deedGen(); if (!Q.dq) return null; Q.cur = Q.dq.id; if (Q.base) delete Q.base[Q.dq.id]; }
  const d = Q.dq, tail = { id: d.id, dyn: d.n, chain: 'Deeds', focus: null };
  if (d.type === 'land') { const G = landDef(d.a), rn = G.ruler.charAt(0).toUpperCase() + G.ruler.slice(1);
    return { ...tail, name: `Take ${G.name}`, text: `${G.name} is held by ${G.ruler}${d.a === CONFIG.ages.lands ? ', the Emperor — the last and hardest ruler of the Age; his fall lets you crown your heir into the ' + ageName(ageNo() + 1) + ' and unlocks the ' + wonderFor(gEra(d.a)).name : isEraRuler(d.a) ? ', an Era Ruler — far tougher, and his fall unlocks the ' + wonderFor(gEra(d.a)).name : ''} — land ${d.a}, a campaign of ${G.stages} battles, harder than anything behind you. Its crown is worth ${rulerCrowns(d.a)} Crown${rulerCrowns(d.a) === 1 ? '' : 's'} when the crown passes.${deedOk('pass') ? ` Or, if the wall is too high: this dynasty would pass ${crownsIfPass()} Crowns, more than any before it (Keep → Pass the Crown).` : ''}`,
      steps: [{ label: `Conquer ${G.name}`, check: { landDone: d.a } }], reward: { gold: d.gold, talent: 2 }, focus: { tab: 'hero', sub: 'fight', el: 'ground:' + landId(d.a) } }; }
  if (d.type === 'heir') return { ...tail, name: 'Crown Your Heir', text: `The Emperor has fallen and the ${ageName()} is won. In the Keep, crown your heir: the ${ageName(ageNo() + 1)} begins with the same ten lands — far richer and far tougher — and every Crown you took this Age.`, steps: [{ label: 'Kingdom → Keep → Crown your heir', check: { stat: 'age', need: 1, since: true } }], reward: { talent: 5 * ageNo() }, focus: { tab: 'kingdom', ksub: 'keep', rtab: 'kingdom', el: 'id:found-btn' } };
  if (d.type === 'wonder') { const W = wonderFor(d.a);
    return { ...tail, name: `Raise the ${W.name}`, text: `The Era Ruler has fallen. Pour gold and ${CONFIG.resources[W.def.spoil].name.toLowerCase()} into the ${W.name} in the Keep — farm an old land's Endless Battle if you run short. When it stands: ${W.def.desc}.`,
      steps: [{ label: `Kingdom → Keep → build the ${W.name}`, check: { stat: 'wondersBuilt', need: 1, since: true } }], reward: { talent: 3 }, focus: { tab: 'kingdom', ksub: 'keep', rtab: 'kingdom', el: 'id:wonder-card' } }; }
  if (d.type === 'gear') { const nm = tierName('weapon', d.a);
    return { ...tail, name: 'Temper the Arms', text: `Weapon, chest and helm carry the fight. Forge all three up to ${nm}${d.a >= HARD_T ? ' — every Hardened tier is far stronger than the last' : ''}.`,
      steps: ['weapon', 'chest', 'helm'].map(k => ({ label: `${k.charAt(0).toUpperCase() + k.slice(1)}: ${tierName(k, d.a)}`, check: { gearTier: k, need: d.a } })), reward: { gold: d.gold * 2, talent: 1 }, focus: { tab: 'hero', sub: 'gear' } }; }
  if (d.type === 'army') return { ...tail, name: 'A Greater Host', text: 'A bigger army hits harder and holds more land. Every soldier needs a person, arms and bread — the Barracks shows which one is short.',
      steps: [{ label: `Train ${d.a} more soldiers`, check: { stat: 'trained', need: d.a, since: true } }], reward: { gold: d.gold, talent: 1 }, focus: { tab: 'kingdom', ksub: 'prod', rtab: 'kingdom', el: 'id:barracks-card' } };
  if (d.type === 'depth') { const st = stepDef(d.b) || stepDef('shaft'); return { ...tail, name: st.id === 'shaft' ? 'Deeper Still' : 'Room to Grow', text: `The ${st.name} holds its chain back. ${st.dig} — each new one can grow far bigger than the last.`,
      steps: [{ label: `${st.name} → ${st.dig} (${unitName(st.id)} ${d.a})`, check: { stat: 'levels:' + st.id, need: d.a } }], reward: { gold: d.gold, talent: 1 }, focus: { tab: 'kingdom', ksub: 'prod', rtab: 'kingdom', el: 'step:' + st.id } }; }
  if (d.type === 'houses') return { ...tail, name: 'No Room at the Inn', text: `${d.m} settlers found no home and turned back. Every land you hold sends more — build houses so they stay.`,
      steps: [{ label: `Build ${d.a} more houses`, check: { stat: 'houses', need: d.a, since: true } }], reward: { gold: d.gold, talent: 1 }, focus: { tab: 'kingdom', ksub: 'prod', rtab: 'kingdom', el: 'step:carpenter' } };
  if (d.type === 'trophy') return { ...tail, name: 'Trophy Hunter', text: 'Mount another head on your wall. The Endless Battle past each Ruler is the place to hunt — every head is loot and XP for good.',
      steps: [{ label: d.hint ? `Earn a new trophy (closest: ${d.hint})` : 'Earn a new trophy', check: { stat: 'trophies', need: 1, since: true } }], reward: { gold: d.gold, talent: 1 }, focus: { tab: 'inventory', rtab: 'inventory', el: 'id:csub-troph-btn' } };
  if (d.type === 'pass') return { ...tail, name: 'A Greater Legacy', text: `This dynasty has taken ${d.a} Crowns — more than any before it. Pass the Crown and spend them: the heir takes back every land you know ${3 + perkRank('lap')}× faster.`,
      steps: [{ label: 'Kingdom → Keep → Pass the Crown', check: { stat: 'dynasty', need: 1, since: true } }], reward: { crystal: 3 }, focus: { tab: 'kingdom', ksub: 'keep', rtab: 'kingdom', el: 'id:found-btn' } };
  return null;
}
function questProgress(q) { // {done, parts:[{label, done, have, need}]}
  _qid = q.id; const parts = q.steps.map(s => ({ ...questCheck(s.check), label: s.label })); _qid = null;
  return { done: parts.every(p => p.done), have: parts.filter(p => p.done).length, need: parts.length, parts };
}
let _qid = null; // quest being checked — steps marked `since` count only what happened after the quest started
function questBase(key, now, low) { if (!_qid || _qid !== S.quests.cur) return now; S.quests.base = S.quests.base || {}; const B = S.quests.base[_qid] || (S.quests.base[_qid] = {}); if (B[key] == null || (low && now < B[key])) B[key] = now; return B[key]; } // low: count growth from the lowest point (a limit that dips after a conquest)
function sinceVal(key, now, c) { return c.since ? Math.max(0, now - questBase(key, now, c.low)) : now; }
function questCheck(c) { // steps marked `since` count only what happened after the quest started (need = how much more)
  if (!c.since) return questCheckRaw(c);
  if (c.orDone && c.landPct && landDone(c.landPct)) return { done: true, have: c.need, need: c.need }; // already conquered: nothing left to take
  const r = questCheckRaw({ ...c, since: false }), now = +r.have || 0, n = Math.max(0, now - questBase(JSON.stringify(c), now, c.low));
  return { done: n >= c.need, have: n, need: c.need };
}
function gearUps(slot) { const sc = it => it ? (it.tier + 1) * 10 + it.level : 0; if (slot === 'armor') { let s = 0; for (const k in S.hero.gear) if (k !== 'weapon') s += sc(S.hero.gear[k]); return s; } return sc(S.hero.gear[slot]); }
function questStat(k) {
  switch (k) {
    case 'armyLimit': return phase() === 3 ? armyLimit() : 0;
    case 'armyEffPct': return 100;
    case 'houses': return houses();
    case 'people': return people();
    case 'townsfolk': return townsfolk();
    case 'headTax': return Math.floor(S.stats.headTax || 0);
    case 'settled': return S.stats.settled || 0;
    case 'slowUps': return S.stats.slowUps || 0;
    case 'armsFoodUps': return S.stats.armsFoodUps || 0;
    case 'partUps': return S.stats.partUps || 0;
    case 'trained': return S.stats.trained || 0;
    case 'endlessKills': return S.stats.endlessKills || 0;
    case 'orders': return S.stats.orders || 0;
    case 'replays': return S.stats.replays || 0;
    case 'battlesWon': return S.stats.battlesWon || 0;
    case 'perksBought': return S.stats.crownSpent || 0;
    case 'age': return ageNo();
    case 'passed': return (S.legacy.dynasty || 1) > 1 ? 1 : 0;
    case 'dynasty': return S.legacy.dynasty || 1;
    case 'trophies': return trophyCount();
    case 'wondersBuilt': { let n = 0; for (const e in (S.legacy.wonders || {})) if (S.legacy.wonders[e].built) n++; return n; }
  }
  if (k.startsWith('limitUps:')) return (S.stats.limitUps || {})[k.slice(9)] || 0;
  if (k.startsWith('levels:')) return stepBuilt(k.slice(7)) ? depthCount(k.slice(7)) : 0;
  if (k === 'digs') return S.stats.digs || 0;
  return 0;
}
function questCheckRaw(c) {
  if (c.gearTier) { const it = S.hero.gear[c.gearTier]; const t = it ? it.tier : -1; return { done: t >= c.need, have: t + 1, need: c.need + 1, simple: true }; }
  if (c.talent) { const r = S.hero.talents[c.talent] || 0; return { done: r >= 1, have: r, need: 1 }; }
  if (c.talentSpent) return { done: talentPointsSpent() >= c.talentSpent, have: talentPointsSpent(), need: c.talentSpent };
  if (c.heroLevel) return { done: S.hero.level >= c.heroLevel, have: S.hero.level, need: c.heroLevel };
  if (c.skillEquipped) { const ok = S.hero.loadout.includes(c.skillEquipped); return { done: ok, have: ok ? 1 : 0, need: 1 }; }
  if (c.looted) { const n = sinceVal('l:' + c.looted, (S.stats.looted && S.stats.looted[c.looted]) || 0, c); return { done: n >= c.need, have: n, need: c.need }; }
  if (c.harvested) { const n = sinceVal('h:' + c.harvested, (S.stats.harvested && S.stats.harvested[c.harvested]) || 0, c); return { done: n >= c.need, have: n, need: c.need }; }
  if (c.perk) return { done: perkRank(c.perk) >= (c.need || 1), have: perkRank(c.perk), need: c.need || 1 };
  if (c.disc) return { done: discLevel(c.disc) >= c.need, have: discLevel(c.disc), need: c.need };
  if (c.viewed) { const v = !!(S.stats.viewed && S.stats.viewed[c.viewed]); return { done: v, have: v ? 1 : 0, need: 1, simple: true }; }
  if (c.path) { const r = pathRank(c.path); return { done: r >= c.need, have: r, need: c.need }; }
  if (c.node) { const [d, id] = c.node.split(':'), r = nodeRank(d, id); return { done: r >= c.need, have: r, need: c.need }; }
  if (c.casts && c.since) { const n = sinceVal('k:' + c.casts, (S.stats.casts || {})[c.casts] || 0, c); return { done: n >= c.need, have: n, need: c.need }; }
  if (c.casts) { const n = (S.stats.casts && S.stats.casts[c.casts]) || 0; return { done: n >= c.need, have: n, need: c.need }; }
  if (c.focused) return { done: (S.stats.focused || 0) >= c.focused, have: S.stats.focused || 0, need: c.focused };
  if (c.activity) { const ok = (S.hero.activity === c.activity || (!c.ground && (S.hero.chose || {})[c.activity])) && (!c.ground || S.hero.ground === c.ground); return { done: ok, have: ok ? 1 : 0, need: 1 }; }
  if (c.have) return { done: (S.res[c.have] || 0) >= c.need, have: Math.floor(S.res[c.have] || 0), need: c.need };
  if (c.toolLevel) { const t = S.hero.tools[c.toolLevel]; const lv = t ? t.level : 0; return { done: lv >= c.need, have: lv, need: c.need }; }
  if (c.counter) { const n = sinceVal('c:' + c.counter, counter(c.counter), c); return { done: n >= c.need, have: n, need: c.need }; }
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
  if (c.bLv) { const n = stepBuilt(c.bLv) ? stepLv(c.bLv) : 0; return { done: n >= c.need, have: n, need: c.need }; }
  if (c.bossKey) { const ok = !!S.hero.bossesKilled[c.bossKey]; return { done: ok, have: ok ? 1 : 0, need: 1 }; }
  if (c.hallLv) { const n = hallLv(c.hallLv); return { done: n >= c.need, have: n, need: c.need }; }
  if (c.gearUps) { const n = gearUps(c.gearUps); return { done: n >= c.need, have: n, need: c.need }; }
  if (c.bLvSum) { let n = 0; for (const st of allSteps()) if (stepBuilt(st.id)) { const s = stepState(st.id); n += s.lvW + s.lvC + s.lvH; } return { done: n >= c.need, have: n, need: c.need }; }
  if (c.partLv) { const [id, pt, dd] = c.partLv.split(':'), d = +dd || 1, n = stepBuilt(id) && depthCount(id) >= d ? partLv(id, pt, d) : 0; return { done: n >= c.need, have: n, need: c.need }; }
  if (c.hallSum) { let n = 0; for (const h of KC().halls) n += hallLv(h.id); return { done: n >= c.need, have: n, need: c.need }; }
  if (c.hall) { const n = hallLv(c.hall); return { done: n >= 1, have: Math.min(1, n), need: 1 }; }
  if (c.allLv) { const n = Math.max(0, minBuildingLv()); return { done: n >= c.allLv, have: n, need: c.allLv }; }
  if (c.barracks) { const n = barracksLv(); return { done: n >= c.barracks, have: n, need: c.barracks }; }
  if (c.stat) { const now = questStat(c.stat), n = sinceVal('s:' + c.stat, now, c); return { done: n >= c.need, have: Math.floor(n), need: c.need }; }
  if (c.landPct) { const n = landPct(c.landPct); return { done: n >= c.need, have: n, need: c.need }; }
  if (c.landDone) { const ok = landDone(c.landDone); return { done: ok, have: ok ? 1 : 0, need: 1 }; }
  if (c.garrison) { const n = (S.kingdom.lands && S.kingdom.lands[c.garrison] && S.kingdom.lands[c.garrison].garrison) || 0; return { done: n >= c.need, have: n, need: c.need }; }
  if (c.taxed) { const n = Math.floor(S.stats.taxed || 0); return { done: n >= c.taxed, have: n, need: c.taxed }; }
  if (c.staffed) { const n = stepBuilt(c.staffed) && stepState(c.staffed).workers.length > 0 ? 1 : 0; return { done: !!n, have: n, need: 1 }; }
  if (c.proclaimed) { const n = phase() === 3 ? 1 : 0; return { done: !!n, have: n, need: 1 }; }
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
  if (phase() === 3) { // the Kingdom: the next land
    const n = landsHeld() + 1, G = landDef(n);
    if (G) return { name: `Conquer ${G.name}`, text: `Lead the army through ${G.stages} battles to ${G.ruler}. ${canPassCrown() ? 'When the lands get too hard, Pass the Crown (Keep) for Crowns that make the next dynasty stronger.' : ''}`, hint: 'Hero → ' + G.name,
      parts: [{ done: landDone(n), have: landPct(n), need: 100, label: G.name + ' conquered %' }], focus: { tab: 'hero', sub: 'fight', el: 'ground:' + landId(n) } };
  }

  if (kingdomNo() > 0) { // the kingdom: grow the settlement, then proclaim
    const ok = canProclaim();
    return { name: ok ? 'Proclaim the Kingdom' : `Grow the ${tierDef().name}`, text: ok ? 'The City is complete. Proclaim the Kingdom — nothing is lost.' : tierDef().need, hint: 'Kingdom → Keep', parts: [{ done: ok, have: ok ? 1 : 0, need: 1, label: 'Settlement' }], focus: { tab: 'kingdom', ksub: 'keep', rtab: 'kingdom', el: 'id:settle-card' } };
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
  for (const k in q.reward) { if (k === 'talent') S.legacy.knowledge = (S.legacy.knowledge || 0) + q.reward[k]; /* 0.11.1: ★ rewards pay Crowns */ else if (k === 'crystal') {} else add(k, q.reward[k]); }
  if (q.reward && q.reward.crystal) { S.legacy.knowledge += q.reward.crystal; log(`+${q.reward.crystal} Crystal`); }
  if (q.dyn) { const Q = S.quests; if (Q.base) delete Q.base[q.id]; Q.dn = (Q.dn || 0) + 1; Q.dq = null; Q.cur = null; log(`Deed done: ${q.name}`); return true; }
  S.quests.done[q.id] = true; if (S.quests.base) delete S.quests.base[q.id]; S.quests.index++; S.quests.cur = (CONFIG.quests[S.quests.index] || {}).id || null; log(`Quest complete: ${q.name}`); return true;
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
// Beta 0.1.15: one rule for a kill's gold and XP, live and while away
function killGold(s) { const LN = landN(), TR = landTrait(LN); return LN ? 6 * Math.pow(2, LN - 1) * (1 + s / 25) * ageMult('gold') * (TR && TR.gold !== undefined ? TR.gold : 1) : CONFIG.stages.goldPerKill(s) * ground().goldMult; }
function killXp(s) { const LN = landN(); return H.xpPerKill * CONFIG.stages.xpPerKill(LN ? s + 10 * (CONFIG.stages.groundOffset[S.hero.ground] || 0) : s) * (isBoss(s) ? 3 : 1); }
function heroRates(stage = S.hero.stage) {
  const st = stats('sustained'), kps = farmRate(stage);
  const r = { gold: killGold(stage) * kps * st.gold };
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
let inCombatTick = false; // Beta 0.1.15: during a tick a dead enemy stays dead until the kill is processed
function hitEnemy(dmg) { if (S.hero.enemyHp <= 0) { if (inCombatTick) return; S.hero.enemyHp = enemyMaxHp(); } S.hero.enemyHp -= dmg * (1 + bestiaryBonus(typeKey())); }
function onKill(st) {
  const s = S.hero.stage;
  // Whole-unit loot: expected value v → floor(v) plus a (v − floor) chance of one more. Averages match the AFK rate model.
  const roll = v => Math.floor(v) + (Math.random() < v - Math.floor(v) ? 1 : 0);
  const LN = landN(), exp = { gold: killGold(s) * st.gold };
  const d = groundDrops(s); for (const k in d) exp[k] = d[k] * st.drop;
  const loot = {}; for (const k in exp) { const n = roll(exp[k]); if (n > 0) { add(k, n); loot[k] = n; S.stats.looted = S.stats.looted || {}; S.stats.looted[k] = (S.stats.looted[k] || 0) + n; } }
  if (Object.keys(loot).length) pushEvent({ who: 'loot', loot });
  gainXp(killXp(s) * st.xp);
  S.hero.kills++; S.hero.totalKills++; if (isEndless()) { S.stats.endlessKills = (S.stats.endlessKills || 0) + 1; if (farming()) endlessWin(1); }
  if (!S.hero.gear.weapon) { const b = fistLevel(); S.hero.fistKills = (S.hero.fistKills || 0) + 1; if (fistLevel() > b) { log(`Your fists harden: ${slotValue('weapon').toFixed(1)} damage`); pushEvent({ who: 'craft', name: 'Fists ' + slotValue('weapon').toFixed(1) }); } }
  { const key = typeKey(s); S.legacy.kills = S.legacy.kills || {}; const before = trophyTier(key), bt = bestiaryTier(key); S.legacy.kills[key] = (S.legacy.kills[key] || 0) + 1; const after = trophyTier(key); if (after > before) { log(`Trophy earned: ${CONFIG.trophies.tiers[after].name} ${enemyType(s).name} head!`); pushEvent({ who: 'trophy', key, tier: after, name: enemyType(s).name }); } if (bestiaryTier(key) > bt) log(`Bestiary: ${enemyType(s).plural} — ${CONFIG.bestiary.tiers[bestiaryTier(key)].name}`); }
  if (isBoss(s)) bossSlain(s, LN);
  if (S.hero.kills >= autoKillsNeeded() && canAdvance() && !autoAdvanceBlock()) { advance(); S.hero.autoAdvanced = (S.hero.autoAdvanced || 0) + 1; }
}
function bossSlain(s, LN = landN()) { const bk = S.hero.ground + ':' + s; if (!S.hero.bossesKilled[bk]) { S.hero.bossesKilled[bk] = true; S.hero.stars = S.hero.stars || {}; const newStar = !S.hero.stars[bk]; S.hero.stars[bk] = true; let gotC = 0; if (!LN && newStar) { gotC = CONFIG.ages.crowns.boss; S.legacy.knowledge = (S.legacy.knowledge || 0) + gotC; } if (LN && s !== ground().stages) { S.legacy.capAge = S.legacy.capAge || {}; if ((S.legacy.capAge[bk] || 0) < ageNo()) { S.legacy.capAge[bk] = ageNo(); gotC = CONFIG.ages.crowns.captain * ageNo(); S.legacy.knowledge = (S.legacy.knowledge || 0) + gotC; } } if (LN && s === ground().stages) onRulerSlain(LN); const u = enemyType(s).unique; if (u && CONFIG.resources[u]) { add(u, 1); pushEvent({ who: 'loot', loot: { [u]: 1 }, unique: true }); } log(`Defeated ${enemyName(s)}!${gotC ? ` +${gotC} 👑` : ''}${u ? ' +' + CONFIG.resources[u].name : ''}`); } else { const u = enemyType(s).unique; if (u && S.legacy.foundings === 0 && CONFIG.legacy.tribute[u] && !(S.res[u] >= 1)) { add(u, 1); pushEvent({ who: 'loot', loot: { [u]: 1 }, unique: true }); } log(`Defeated ${enemyName(s)}!`); } }
function gainXp(x) {
  S.hero.xp += x; gainDiscXp('combat', x);
  while (S.hero.xp >= H.xpToLevel(S.hero.level)) {
    S.hero.xp -= H.xpToLevel(S.hero.level); S.hero.level++; S.hero.hp = stats().maxHp;
    log(`Level up! Now level ${S.hero.level}`); pushEvent({ who: 'levelup', lv: S.hero.level });
  }
}
function canAdvance() { const G = ground(); if (isEndless()) return false; if (G.stages && S.hero.stage >= G.stages && !(G.land && landDone(G.land))) return false; return S.hero.kills >= killsNeeded(); }
function advance() { if (!canAdvance()) return false; S.hero.stage++; S.hero.kills = 0; S.hero.enemyHp = 0; S.hero.carry = 0; S.hero.bestStage = Math.max(S.hero.bestStage, S.hero.stage); if (isEndless()) { log(`${ground().name} is yours. The Endless Battle begins — the richest fighting in this land. Move on to the next land whenever you choose.`); return true; } log(isBoss() ? `The ${enemyName()} awaits — BOSS` : stageType().k === 1 ? `Now hunting ${enemyType().plural}` : `Advanced: ${stageLabel()}`); return true; }
function retreat() { if (S.hero.stage <= 1) return false; S.hero.stage--; S.hero.kills = 0; S.hero.enemyHp = 0; S.hero.carry = 0; log(`Retreated to stage ${S.hero.stage}`); return true; }
function log(msg) { S.log.unshift(msg); if (S.log.length > 30) S.log.length = 30; }

// ---------- Live simulation ----------
// Discrete combat: hero swings every 1/speed sec (rolls crit), enemy swings every enemyAttackInterval sec.
const EVENTS = []; // transient hit events for the UI: {who:'hero'|'enemy', dmg, crit, skill}
const BIG_EV = { dig: 1, newage: 1, emperor: 1, era: 1, wonder: 1, pathrow: 1, depth: 1, crown: 1, crownpass: 1, proclaim: 1, tier: 1, milestone: 1, trophy: 1, levelup: 1 }, BIGS = []; // 0.10.5: moments worth a banner, kept apart so hit numbers can't push them out
function pushEvent(e) { if (BIG_EV[e.who]) { BIGS.push(e); if (BIGS.length > 12) BIGS.shift(); return; } EVENTS.push(e); if (EVENTS.length > 20) EVENTS.shift(); }
function heroStrike(st) {
  const crit = Math.random() < st.crit;
  const dmg = st.attack * (crit ? st.critDmg : 1) * (isBoss() ? st.bossDmg : 1);
  hitEnemy(dmg); pushEvent({ who: 'hero', dmg, crit });
}
function simulate(dt) {
  tickKingdom(dt); tickPeople(dt); tickArmy(dt); tickTaxes(dt); tickCraft(dt); tickResearch(dt);
  const h = S.hero; h.time += dt;
  if ((h._tu = (h._tu || 0) + dt) >= 1) { h._tu = 0; checkTechUnlocks(); }
  tickHarvest(dt);
  if (!heroFighting()) { const st0 = stats(); h.hp = Math.min(st0.maxHp, h.hp + st0.regen * dt); return; }
  if (inBattle()) { const st0 = stats(); h.hp = Math.min(st0.maxHp, h.hp + st0.regen * dt); tickBattle(dt); return; } // Beta 0.3.0: in a land the army fights
  for (const id in h.cds) if (h.cds[id] > 0) h.cds[id] -= dt;
  const st = stats();
  if (h.resting) { h.hp = Math.min(st.maxHp, h.hp + st.regen * st.restSpeed * dt); if (h.hp >= st.maxHp) { h.resting = false; h.atkTimer = 0; h.eTimer = 0; } else return; }
  h.hp = Math.min(st.maxHp, h.hp + st.regen * dt);
  if (h.enemyHp <= 0) { h.enemyHp = enemyMaxHp(); if (h.carry > 0) { h.enemyHp -= h.carry; h.carry = 0; } }
  inCombatTick = true;
  for (const id of h.loadout) if (skillReady(id) && (h.enemyHp > 0 || !skillDef(id) || !['damage', 'execute', 'cleave', 'charge'].includes(skillDef(id).type))) castSkill(id, false); // an attack skill waits for the next foe instead of striking a dead one
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
  inCombatTick = false;
  if (h.hp <= 0) { if (isEndless()) { h.hp = 0; h.resting = true; h.enemyHp = 0; h.carry = 0; h.atkTimer = 0; h.eTimer = 0; { const L = farming() ? landState(landN()) : null; if (L && (L.depth || 0) > 0) { L.depth--; L.wins = 0; log(`Your hero falls back to rest — and back to depth ${L.depth}. He returns at full health.`); } else log('Your hero falls back to rest. He returns to the Endless Battle at full health.'); } pushEvent({ who: 'rest' }); return; } heroRetreat(st); return; }
  if (h.enemyHp <= 0) { h.hp = Math.min(st.maxHp, h.hp + killHeal(st)); onKill(st); h.enemyHp = 0; h.atkTimer = Math.min(h.atkTimer, interval * 0.5); }
}

// ================= Beta 0.3.0: army battles =================
// Every land is a campaign of 50 battles. Each soldier rolls a d20 every round; both sides sort their dice and pair them off,
// highest against highest. Beat the die in front of you and that enemy falls; tie or lose and one of yours falls (ties go to the defender).
// A natural 20 is a critical: on a new battle the beaten enemy joins you, on a replay he falls twice. A natural 1 costs you an extra man.
const BC = () => KC().battles;
const ORDERS = [
  { id: 'defend', name: 'Defend', icon: '🛡', tech: null, desc: 'Hold the line: an enemy must beat you by 2 to kill, and you must beat him by 2' },
  { id: 'charge', name: 'Charge', icon: '⚔️', tech: 'strike', desc: 'Every soldier rolls two dice and keeps the higher' },
  { id: 'rally', name: 'Rally', icon: '📯', tech: 'warcry', desc: '+3 on every one of your dice' },
  { id: 'flank', name: 'Flank', icon: '🗡', tech: 'cleave', desc: 'Your unpaired soldiers join in: every 4 who roll 16+ kill one more' },
  { id: 'volley', name: 'Volley', icon: '🏹', tech: 'execute', desc: 'Before the first round, every 2 of your soldiers who roll 18+ kill one' },
  { id: 'medics', name: 'Medics', icon: '✚', tech: 'wind', desc: 'Half of this battle\'s fallen come back' },
];
function orderDef(id) { return ORDERS.find(o => o.id === id) || null; }
function orderOpen(id) { const o = orderDef(id); return !!o && (!o.tech || techUnlocked(o.tech)); }
function orderCd(id) { return id === 'defend' ? 0 : Math.max(0, ((S.hero.ocd || {})[id]) || 0); }
function orderReady(id) { return orderOpen(id) && orderCd(id) <= 0; }
function inBattle() { return phase() === 3 && landN() > 0 && heroFighting(); }
function battleNo() { return Math.max(1, Math.min(BC().count, S.hero.stage || 1)); }
function battleKind(b) { return b >= BC().count ? 'host' : b % 10 === 0 ? 'captain' : 'line'; }
function enemyArmy(n = landN(), b = battleNo(), replay = false) { const B = BC(), k = battleKind(b); return Math.max(1, Math.round((replay ? B.replayArmy : 1) * B.base * Math.pow(B.landGrowth, n - 1) * Math.pow(B.span, (b - 1) / (B.count - 1)) * (k === 'host' ? B.host : k === 'captain' ? B.captain : 1))); }
function enemyPip(b = battleNo()) { const k = battleKind(b); return k === 'host' ? BC().hostPip : k === 'captain' ? BC().captainPip : 0; }
// Hero as general: how well he would fare alone against one soldier of this battle, on a log scale → a bonus on every one of your dice
function heroEdge(n = landN(), b = battleNo()) {
  const st = stats('sustained'), sb = b % 10 === 0 ? b - 1 : b, lc = landCurve(sb, landId(n)) || { hp: 1, hit: 1 }; // a line soldier of this battle (captains and the host add their own bonus)
  const heroTtk = lc.hp / Math.max(1e-9, st.dps), sd = Math.max(lc.hit * 0.2, lc.hit - st.armor) * (1 - st.dr) * (1 - st.dodge) / H.enemyAttackInterval;
  const soldierTtk = st.maxHp / Math.max(1e-9, sd - st.regen * 0.5);
  return Math.max(1e-6, soldierTtk / heroTtk);
}
// The general's bonus is measured against the hero a player normally has when he reaches this land (bots: the frontier edge falls ~0.64 decades per land);
// later Ages make enemy soldiers far tougher, and the hero is expected to keep up only partly — the rest is the Age wall (tuned in the Age balance pass).
function edgeRef(n) { const B = BC(); return Math.pow(10, B.refLog - B.refSlope * (n - 1)) / Math.pow(ageMult('hp') * ageMult('hit'), B.refAge); }
function yourPip(n = landN(), b = battleNo()) { const B = BC(), e = heroEdge(n, b); return Math.max(-B.pipCap, Math.min(B.pipCap, Math.round(B.pipPerDecade * Math.log10(e / edgeRef(n))))); }
const d20 = () => 1 + Math.floor(Math.random() * 20);
// One battle, fully resolved. Returns the round-by-round log (top five dice per side) and the totals.
function rollBattle(Y, E, o) {
  const B = BC(), order = o.order || 'defend', pushing = !!o.pushing, pip = (o.pip || 0) + (order === 'rally' ? B.rally : 0), epip = (o.epip || 0) - (pushing ? 0 : B.replayPip), def = order === 'defend'; // a battle you have already won: its enemy is demoralized
  const y0 = Y, e0 = E, rounds = [], convCap = Math.max(1, Math.floor(e0 * B.convCap)); let kills = 0, lost = 0, conv = 0; // Beta 0.3.3: a crit while pushing takes a prisoner (capped per battle); prisoners join you only if the battle is won
  if (order === 'volley') { let h = 0; for (let i = 0; i < Y; i++) if (d20() >= B.volleyAt) h++; const k = Math.min(E, Math.floor(h / 2)); E -= k; kills += k; rounds.push({ volley: k }); }
  let fled = false;
  for (let r = 0; r < B.maxRounds && Y > 0 && E > 0; r++) {
    if (Y <= y0 * 0.5 && r > 0) { fled = true; break; } // half the army has fallen: the survivors fall back
    // Risk-style: a quarter of the smaller army clashes this round in one-on-one duels. The side that outnumbers rolls up to 3 dice and keeps the best.
    const P0 = Math.max(1, Math.ceil(Math.min(Y, E) / 4), Math.min(Y, E, 5)), P = P0 + (order === 'flank' ? Math.ceil(Math.min(Y, E) / 8) : 0); // Flank: extra fights that can only land blows
    const ya = Math.max(1, Math.min(3, Math.floor(Y / E))) + (order === 'charge' ? 1 : 0), ea = Math.max(1, Math.min(3, Math.floor(E / Y)));
    let k = 0, l = 0, c = 0, dn = 0; const show = [];
    for (let i = 0; i < P && E - k - c > 0 && Y - l > 0; i++) {
      let yn = 0, en = 0; for (let a = 0; a < ya; a++) yn = Math.max(yn, d20()); for (let a = 0; a < ea; a++) en = Math.max(en, d20());
      const yv = yn + pip, ev = en + epip, need = def ? 2 : 1; let res = 0;
      if (yv - ev >= need) { res = 1; if (yn === 20 && pushing && conv + c < convCap) c++; else if (yn === 20) k += 2; else k++; }
      else if (i < P0 && ev - yv >= (def ? 2 : 0)) { res = -1; l++; if (en === 20) l++; if (yn === 1) l++; }
      dn++; if (show.length < 5) show.push([yn, en, res]);
    }
    c = Math.min(c, E); k = Math.min(k, E - c); l = Math.min(l, Y);
    E -= k + c; Y = Y - l; kills += k; lost += l; conv += c;
    rounds.push({ show, k, l, c, y: Y, e: E, ya, ea, dn });
  }
  const back = lost > 0 ? Math.round(lost * (def && !pushing ? B.replayWound : order === 'medics' ? B.medics : def ? B.defendWound : B.orderWound)) : 0; /* Beta 0.3.3: holding a won field in Defend costs no one */ Y += back; // many of the fallen were only wounded — most in Defend, nearly all with Medics
  if (E <= 0) Y += conv; else { kills += conv; conv = 0; } // no victory: the prisoners are simply out of the fight
  return { rounds, won: E <= 0, fled, y0, e0, y: Y, e: E, kills, lost, conv, back, order, pushing };
}
function battleReward(n, b, won) {
  const B = BC(), st = stats('sustained'), k = battleKind(b), m = k === 'host' ? B.hostGold : k === 'captain' ? B.captainGold : 1;
  if (!won) return { gold: 0, xp: 0, drops: {} };
  const gold = killGold(b) * st.gold * B.goldKills * m, xp = killXp(b) * st.xp * B.xpKills * m, d = groundDrops(b), drops = {};
  for (const r in d) { const v = d[r] * st.drop * B.dropKills * m, w = Math.floor(v) + (Math.random() < v - Math.floor(v) ? 1 : 0); if (w > 0) drops[r] = w; }
  const G = landDef(n); if (G && G.spoil) { const v = 0.02 * m * (1 + 0.25 * perkRank('spoils')) * wonderMult('tax') * ageMult('spoil') * ((landTrait(n) || {}).spoil || 1) * (1 + b / 25), w = Math.floor(v) + (Math.random() < v - Math.floor(v) ? 1 : 0); if (w > 0) drops[G.spoil] = (drops[G.spoil] || 0) + w; }
  return { gold, xp, drops };
}
// Live: a 10-second preparation bar, then the battle (Strike fights at once). Only the player advances.
function battleState() { const h = S.hero; if (!h.bt || h.bt.n !== landN() || h.bt.b !== battleNo()) h.bt = { ph: 'prep', t: 0, n: landN(), b: battleNo(), res: h.bt && h.bt.n === landN() ? h.bt.res : null }; return h.bt; }
function battleShowTime(res) { const B = BC(); return Math.min(Math.max(1, Math.round(B.showMax / B.roundT)), res ? res.rounds.length : 1) * B.roundT + B.resultT; }
function tickBattle(dt) {
  const h = S.hero, B = BC(); h.ocd = h.ocd || {}; for (const k in h.ocd) if (h.ocd[k] > 0) h.ocd[k] -= dt;
  const bt = battleState(); bt.t += dt;
  if (bt.ph === 'show' && bt.t >= battleShowTime(bt.res)) { bt.ph = 'prep'; bt.t = 0; }
  h.bPeak = Math.max(h.bPeak || 0, marching()); // the army's recent peak — AFK battles never grind it below 75% of this
  if (bt.ph === 'prep' && bt.t >= B.prep) { if (marching() < (h.bPeak || 0) * B.holdAt) { bt.t = B.prep; bt.hold = true; return; } bt.hold = false; strikeBattle(null); }
}
function battleWon(n, b) { const h = S.hero; return landDone(n) || b < (h.bestStage || 1); }
function strikeBattle(orderId) {
  const h = S.hero, n = landN(), b = battleNo(), bt = battleState(); if (!inBattle() || bt.ph !== 'prep') return false;
  const Y = marching(); if (Y <= 0) { bt.t = 0; bt.note = 'No soldiers are marching — the Barracks trains more.'; return false; }
  if (orderId) h.bPeak = Y; // the player chose to fight: the army's reference resets to what he has now
  let order = orderId && orderReady(orderId) ? orderId : 'defend';
  if (order !== 'defend') { h.ocd = h.ocd || {}; h.ocd[order] = BC().orderCd; S.stats.orders = (S.stats.orders || 0) + 1; }
  const pushing = !battleWon(n, b), res = rollBattle(Y, enemyArmy(n, b, !pushing), { order, pushing, pip: yourPip(n, b), epip: enemyPip(b) });
  S.res.soldiers = Math.max(0, soldiers() + (res.y - res.y0)); S.stats.fallen = (S.stats.fallen || 0) + res.lost - res.back; S.stats.converted = (S.stats.converted || 0) + res.conv;
  res.pip = yourPip(n, b); res.epip = enemyPip(b); res.b = b; res.n = n; res.manual = !!orderId;
  if (res.won) applyBattleWin(n, b, res);
  bt.res = res; bt.ph = 'show'; bt.t = 0; bt.note = null; return res;
}
function applyBattleWin(n, b, res, quiet) {
  const h = S.hero, rw = battleReward(n, b, true); res.gold = rw.gold; res.drops = rw.drops;
  add('gold', rw.gold); for (const k in rw.drops) add(k, rw.drops[k]); gainXp(rw.xp);
  S.stats.battlesWon = (S.stats.battlesWon || 0) + 1; if (!res.pushing) S.stats.replays = (S.stats.replays || 0) + 1;
  S.hero.totalKills += res.kills + res.conv;
  { const key = landId(n) + ':' + enemyType(b).id; S.legacy.kills = S.legacy.kills || {}; S.legacy.kills[key] = (S.legacy.kills[key] || 0) + res.kills + res.conv; }
  if (res.pushing) {
    if (b % 10 === 0 && b < BC().count) bossSlain(b, n);
    if (b >= BC().count) { res.duel = duelRuler(n); if (res.duel) { bossSlain(b, n); h.bestStage = BC().count; } }
    else h.bestStage = Math.max(h.bestStage || 1, b + 1);
  }
  if (!quiet) log(res.pushing ? `Battle ${b} won${res.conv ? ` — ${res.conv} enemies joined you` : ''}.${res.duel === false ? ' The ruler escaped the duel.' : ''}` : `Battle ${b} won again.`);
}
// Battle 50: the host is routed and the hero duels the ruler — he wins if he can survive the ruler's blows long enough to fell him
// Battle 50: the host is routed and the hero duels the ruler — best of three d20 rolls, the hero's general bonus against the ruler's
function duelRuler(n) { const B = BC(), hp = yourPip(n, B.count) + B.duelBonus, rp = B.rulerPip, rolls = []; let w = 0, l = 0;
  while (w < 2 && l < 2) { const a = d20(), b = d20(); rolls.push([a, b]); if (a + hp > b + rp) w++; else l++; }
  const ok = w >= 2; S.hero.lastDuel = { n, rolls, ok, hp, rp }; pushEvent({ who: 'duel', n, ok }); return ok; }
function battleAdvance() { const h = S.hero; if (!inBattle() || battleNo() >= (h.bestStage || 1) || battleNo() >= BC().count) return false; h.stage = battleNo() + 1; h.bt = null; h.bPeak = marching(); return true; }
function battleRetreat() { const h = S.hero; if (!inBattle() || battleNo() <= 1) return false; h.stage = battleNo() - 1; h.bt = null; return true; }
function canBattleAdvance() { return inBattle() && battleNo() < Math.min(BC().count, S.hero.bestStage || 1); }
// Away: the army replays the current battle every 10 s in Defend. A sample of real battles is fought and the rest extrapolated.
function offlineBattles(secs) {
  const n = landN(), b = battleNo(), N = Math.floor(secs / (BC().prep + BC().resultT + BC().showMax / 2)); if (!inBattle() || N < 1) return null;
  let Y = marching(), gold = 0, xp = 0, drops = {}, wins = 0, lost = 0, conv = 0, kills = 0, fought = 0, pushing = !battleWon(n, b), unlocked = false;
  const K = Math.min(N, 120), floor = marching() * BC().holdAt; let held = false, why = 'time';
  for (let i = 0; i < K && Y > 0; i++) {
    if (Y < floor) { held = true; why = 'hold'; break; } // the army holds its ground once it is down a quarter
    const r = rollBattle(Y, enemyArmy(n, b, !pushing), { order: 'defend', pushing, pip: yourPip(n, b), epip: enemyPip(b) }); fought++;
    Y = r.y; lost += r.lost - r.back; conv += r.conv; kills += r.kills;
    if (!r.won) { if (fought === 1) return { battles: 0, wins: 0, gold: 0, xp: 0, drops: {}, lost: 0, conv: 0, kills: 0, unlocked: false, b, n, stalled: true, why: 'stalled' }; why = 'lost'; break; } // an unwinnable battle is not fought while you are away
    wins++; const rw = battleReward(n, b, true); gold += rw.gold; xp += rw.xp; for (const k in rw.drops) drops[k] = (drops[k] || 0) + rw.drops[k];
    if (pushing) { unlocked = true; pushing = false; }
  }
  const scale = !held && fought === K && wins === K && N > K ? Math.min(N / K, lost > 0 ? Math.max(1, (marching() - floor) / Math.max(1, lost)) : N / K) : 1; // extrapolate, never past the quarter-army floor // a clean sample repeats for the rest of the time away
  return { battles: Math.round(fought * scale), wins: Math.round(wins * scale), gold: gold * scale, xp: xp * scale, drops: Object.fromEntries(Object.entries(drops).map(([k, v]) => [k, Math.round(v * scale)])),
    lost: Math.min(marching() + Math.round(conv * scale), Math.round(lost * scale)), conv: Math.round(conv * Math.min(scale, 1)), kills: Math.round(kills * scale), unlocked, b, n, why, secs: Math.round(fought * scale) * (BC().prep + BC().resultT + BC().showMax / 2) };
}

// ---------- Offline ----------
function afkCap() { return CONFIG.offline.capSeconds + (perkRank('cellar') + perkRank('memory')) * 2 * 3600; }
function afkEff() { return Math.min(1, CONFIG.offline.efficiency); }
// AFK: worked plots run their jobs (in chain order so raw → refined → artisan feed each other); the hero farms only if fighting.
function applyOffline(awaySeconds) {
  if (crafting() && awaySeconds >= (crafting().total - crafting().t)) finishCraft();
  if (researching() && awaySeconds >= (researching().total - researching().t)) finishResearch();
  const counted = Math.min(awaySeconds, afkCap()), eff = afkEff(), gains = {};
  offlineChains(counted * eff, gains);
  const tax = {};
  { const mins = counted / 60, hrs = counted / 3600; // 0.12 while away: houses rise, people are born and settle, the Barracks trains, lands pay taxes
    const hl = 0; // Beta 0.2.0: no houses
    const sim = offlinePeople(mins, hl, gains); Object.assign(gains, sim.gains); var peopleSim = sim;
    if (phase() === 3) for (const ln of landsTouched()) { const t = taxPerHour(ln) * hrs; if (t > 0) tax[ln] = t; const sp = spoilPerHour(ln) * hrs * eff; if (sp > 0) gains[landDef(ln).spoil] = (gains[landDef(ln).spoil] || 0) + sp; }
  }
  let kills = 0;
  const looted = {}, harvested = {};
  let battles = null;
  if (inBattle()) { battles = offlineBattles(counted * eff); if (battles) { gains.gold = (gains.gold || 0) + battles.gold; for (const k in battles.drops) gains[k] = (gains[k] || 0) + battles.drops[k]; } } // Beta 0.3.0: the army replays its battle
  else if (heroFighting()) { const hr = heroRates(); for (const k in hr) { const v = hr[k] * counted * eff; gains[k] = (gains[k] || 0) + v; looted[k] = v; } kills = farmRate() * counted * eff; }
  { const hr = harvestRates(); for (const k in hr) { const v = hr[k] * counted * eff; gains[k] = (gains[k] || 0) + v; harvested[k] = v; } } // tools gather while away too
  return { awaySeconds, counted, gains, kills, tax, looted, harvested, battles, people: peopleSim, startStage: S.hero.stage, endStage: S.hero.stage };
}
// Minute steps: houses from lumber, births, settlers, head tax, training and (if fighting) casualties. Returns the net change.
// Beta 0.1.15: the chains while away, routed like routeOut — the Storehouse's stock-target share first, then what the next building can take, the rest to the Storehouse.
// Every good is counted once: what the next building takes is its input, not also Storehouse stock.
function offlineChains(secs, gains) {
  if (kingdomNo() < 1 || secs <= 0) return gains;
  for (const lid in KC().lines) {
    const steps = lineSteps(lid); if (!steps.length || steps[0].pull) continue; let supply = 0;
    for (let i = 0; i < steps.length; i++) {
      const st = steps[i]; if (!stepMods(st.id).working) break;
      const out = i === 0 ? stepOutput(st.id) * secs : Math.min(stepOutput(st.id) * secs, supply / st.ratio);
      const nx = steps[i + 1] && stepMods(steps[i + 1].id).working && !steps[i + 1].pull ? steps[i + 1] : null;
      if (!nx) { if (out > 0) gains[st.make] = (gains[st.make] || 0) + out; break; }
      const T = stockTarget(st.make), short = Math.max(0, T.target - (S.res[st.make] || 0) - (gains[st.make] || 0)), keep = Math.min(out * T.share, short);
      const take = Math.min(out - keep, stepOutput(nx.id) * nx.ratio * secs);
      const toStore = out - take; if (toStore > 0) gains[st.make] = (gains[st.make] || 0) + toStore;
      supply = take;
    }
  }
  return gains;
}
// Beta 0.2.0: while away the Barracks trains (lumber + arms + bread per soldier) and hard fights cost soldiers. No people, no houses.
function offlinePeople(mins, houseLumber, gainsIn) {
  const K = S.kingdom, g = {}; if (kingdomNo() < 1) return { gains: g, sol: 0, trained: 0, fallen: 0, lAcc: K.lossAcc || 0 };
  const G3 = ['lumber', 'swords', 'bread'], have = {}, inc = {}, res = {};
  const steps = Math.min(1440, Math.ceil(mins)), dm = mins / Math.max(1, steps);
  for (const k of G3) { have[k] = S.res[k] || 0; inc[k] = Math.max(0, gainsIn[k] || 0) / Math.max(1, steps); res[k] = orderReserve(k); }
  let sol = soldiers(), trained = 0, fallen = 0, tAcc = 0, lAcc = K.lossAcc || 0;
  const train = trainPerMin(), p = heroFighting() ? battlePressure() : 0, lossR = AC().lossRate * p, c = AC().soldierCost;
  for (let i = 0; i < steps; i++) {
    for (const k of G3) have[k] += inc[k];
    if (barracksBuilt()) { tAcc = Math.min(train * dm + 1, tAcc + train * dm); while (tAcc >= 1) { const m = soldierCostMult(sol); if (G3.some(k => have[k] - c[k] * m < res[k])) break; for (const k of G3) have[k] -= c[k] * m; sol++; trained++; tAcc--; } }
    if (lossR > 0 && sol > garrisoned()) { lAcc += (sol - garrisoned()) * lossR * dm; const d = Math.min(Math.floor(lAcc), sol - garrisoned()); sol -= d; fallen += d; lAcc -= d; }
  }
  for (const k of G3) g[k] = have[k] - (S.res[k] || 0);
  return { gains: g, sol: sol - soldiers(), trained, fallen, lAcc };
}
function claimOffline(data, mult = 1) {
  const P = data.people; if (P) { S.kingdom.lossAcc = P.lAcc; S.res.soldiers = Math.max(0, soldiers() + (P.sol || 0)); S.stats.trained = (S.stats.trained || 0) + (P.trained || 0); S.stats.fallen = (S.stats.fallen || 0) + (P.fallen || 0); }
  const kept = {}; for (const k in data.gains) kept[k] = add(k, data.gains[k] > 0 ? data.gains[k] * mult : data.gains[k]); // inputs consumed aren't doubled
  { const made = new Set(allSteps().filter(st => stepBuilt(st.id)).map(st => st.make)); for (const k in data.gains) if (made.has(k) && data.gains[k] > 0) { const over = data.gains[k] * mult - (kept[k] || 0); if (over > 0) { const g = over * CONFIG.resources[k].sell * KC().autoSell; if (g > 0) { add('gold', g); S.kingdom.autoSold = (S.kingdom.autoSold || 0) + g; data.sold = (data.sold || 0) + g; } } } } // Beta 0.1.26: overflow while away is sold too, like live play
  for (const [src, key] of [[data.harvested, 'harvested'], [data.looted, 'looted']]) for (const k in (src || {})) { const share = data.gains[k] > 0 ? Math.min(1, src[k] / data.gains[k]) : 0, n = Math.floor(Math.max(0, kept[k] || 0) * share); if (n > 0) { S.stats[key] = S.stats[key] || {}; S.stats[key][k] = (S.stats[key][k] || 0) + n; } } // quests that count gathering and loot count it while away too
  for (const k of ['food', 'supplies', 'soldiers', 'bread', 'swords', 'lumber']) if ((S.res[k] || 0) < 0) S.res[k] = 0;
  for (const n in (data.tax || {})) { const t = data.tax[n] * mult; add('gold', t - titheTo(t)); S.stats.taxed = (S.stats.taxed || 0) + t; if (false) { const L = landState(+n); L.coffer = Math.min(cofferCap(+n), (L.coffer || 0) + t); } }
  if (data.battles) { const B = data.battles; S.res.soldiers = Math.max(0, soldiers() - B.lost + B.conv); S.stats.fallen = (S.stats.fallen || 0) + B.lost; S.stats.battlesWon = (S.stats.battlesWon || 0) + B.wins; S.stats.replays = (S.stats.replays || 0) + Math.max(0, B.wins - (B.unlocked ? 1 : 0)); S.hero.totalKills += B.kills; gainXp(B.xp * mult);
    if (B.unlocked && B.n === landN() && B.b === battleNo()) { if (B.b % 10 === 0 && B.b < KC().battles.count) bossSlain(B.b, B.n); if (B.b < KC().battles.count) S.hero.bestStage = Math.max(S.hero.bestStage || 1, B.b + 1); } }
  if (heroFighting() && data.kills > 0 && !data.battles) offlineStages(data.kills * mult);
  gainXp(data.kills * killXp(S.hero.stage) * stats('sustained').xp * mult);
  S.hero.totalKills += data.kills * mult;
  if (data.kills > 0) for (const id of S.hero.loadout) gainMastery(id, data.counted * CONFIG.offlineSkillWeight * mult, true);
}

// ---------- Founding (prestige) ----------
function maxGearTier() { let t = 0; for (const s in S.hero.gear) if (S.hero.gear[s]) t = Math.max(t, S.hero.gear[s].tier + 1); return t; }
function knowledgeGain() { return S.legacy.foundings === 0 ? 1 : Math.max(1, Math.floor(Math.sqrt((S.kingdom.renown || 0) / 40))); } // P0 tribute = 1 Crystal; after that Crystals = √(Renown / 40)
function foundCost() { return S.legacy.foundings === 0 ? { ...CONFIG.legacy.tribute } : {}; }
function canFound() { if (S.legacy.foundings === 0) return bestStageAll() >= CONFIG.legacy.foundRequiresStage && canAfford(foundCost()); return false; } // after the first founding the Capital is never reset: Proclaim the Kingdom instead
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
  S = fresh; S.hero.activity = 'fight'; S.hero.fightOn = true; S.kingdom.built = {}; S.kingdom.tier = 0; S.kingdom.tierPaid = {}; S.kingdom.v09 = true;
  if (leg.foundings > 1) add('gold', KC().startGold || 50);
  const ca = perkRank('cache'); if (ca) { add('gold', 1000 * ca); }
  ensureThralls();
  log(`${leg.foundings === 1 ? 'Founded your kingdom' : 'Conquered new lands'} as ${hp.name} of a ${kp.name}. A Camp is pitched. +${gain} Crystal${gain === 1 ? '' : 's'}`);
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


// ======================= 0.9: hero halls, the army, lands, taxes, crowns =======================
// ---- Hero halls: city buildings that make the hero stronger ----
function hallDef(id) { return KC().halls.find(h => h.id === id); }
function hallLv(id) { return ((S.kingdom && S.kingdom.halls) || {})[id] || 0; }
function hallAvailable(id) { const h = hallDef(id); return !!h && kingdomNo() > 0 && kTier() >= h.tier; }
function hallCost(id) { const l = hallLv(id); if (l === 0) return { ...hallDef(id).build }; return { gold: Math.round(KC().hallCost.base * Math.pow(l, KC().hallCost.exp)) }; }
function canHall(id) { return hallAvailable(id) && hallLv(id) < levelCap() && canAfford(hallCost(id)); }
function upgradeHall(id) { if (!canHall(id)) return false; pay(hallCost(id)); S.kingdom.halls = S.kingdom.halls || {}; S.kingdom.halls[id] = hallLv(id) + 1; if (hallLv(id) === 1) log(`Built the ${hallDef(id).name}.`); return true; }
function hallMods() { const m = {}; for (const h of KC().halls) { const l = hallLv(h.id); if (!l || h.effect === 'gearCost') continue; m[h.effect] = (m[h.effect] || 0) + h.per * l; } return m; }
function smithyCost(c) { if (!c) return c; const f = 1 - Math.min(0.6, 0.03 * hallLv('smithy')); if (f >= 1) return c; const o = {}; for (const k in c) o[k] = Math.max(1, Math.ceil(c[k] * f)); return o; }

// ---- 0.12 People: houses hold people; births fill them; conquered lands send settlers ----
const PC = () => KC().people;
function housesOn() { return S.kingdom.buildHouses !== false; }
function setHousesOn(v) { S.kingdom.buildHouses = !!v; return true; }
function houses() { return (S.kingdom && S.kingdom.houses) || 0; }
function houseCap() { return houses() * PC().perHouse; }
function people() { return Math.floor((S.res.people || 0) + 1e-9); }
function townsfolk() { return people() + soldiers(); } // soldiers live in houses too
function houseRoom() { return Math.max(0, houseCap() - townsfolk()); }
function birthRoom() { return Math.max(0, Math.floor(houseCap() * PC().birthFill) - townsfolk()); } // births stop at 75% full: the rest is for settlers
function houseCost(n = houses()) { return PC().houseBase * Math.pow(PC().houseGrowth, Math.max(0, n - ((S.kingdom && S.kingdom.houseFree) || 0))); } // houseFree: houses a 0.11 town already had count as paid for // lumber for the next house
function addHouseLumber(x) { const K = S.kingdom; K.houseProg = (K.houseProg || 0) + x; let built = 0; while (K.houseProg >= houseCost()) { K.houseProg -= houseCost(); K.houses = houses() + 1; built++; } if (built) { S.stats.housesBuilt = (S.stats.housesBuilt || 0) + built; if (houses() === built) { log('The first house stands. People will move in.'); } } return built; }
function birthsPerMin() { return houses() > 0 ? Math.max(PC().birthMin, PC().birthPct * houseCap()) : 0; }
function headTaxPerHour() { return people() * PC().headTax * ageMult('gold'); }
function settlerWave(n) { return Math.round(PC().waveBase * Math.pow(PC().waveGrowth, n - 1)); }
function settlersPerHour() { if (phase() < 3) return 0; let t = 0; for (let n = 1; n <= landsHeld(); n++) t += PC().trickleBase * Math.pow(PC().trickleGrowth, n - 1); return t; }
function settle(n) { const moved = Math.min(n, houseRoom()), turned = n - moved; if (moved > 0) { S.res.people = (S.res.people || 0) + moved; S.stats.settled = (S.stats.settled || 0) + moved; } if (turned > 0) { const K = S.kingdom; K.turned = (K.turned || 0) + turned; K.turnedAt = S.hero.time; } return { moved, turned }; }
function turnedRecent() { const K = S.kingdom; return K.turnedAt && S.hero.time - K.turnedAt < 3600 ? K.turned || 0 : 0; }
function tickPeople(dt) { return; // Beta 0.2.0: people and houses are gone
  if (kingdomNo() < 1 || houses() < 1) return; const K = S.kingdom;
  K.birthAcc = (K.birthAcc || 0) + birthsPerMin() / 60 * dt;
  while (K.birthAcc >= 1) { if (birthRoom() < 1) { K.birthAcc = Math.min(K.birthAcc, 1); break; } K.birthAcc -= 1; S.res.people = (S.res.people || 0) + 1; }
  const sph = settlersPerHour(); if (sph > 0) { K.settleAcc = (K.settleAcc || 0) + sph / 3600 * dt; if (K.settleAcc >= 1) { const n = Math.floor(K.settleAcc); K.settleAcc -= n; settle(n); } }
  const tax = headTaxPerHour() / 3600 * dt; if (tax > 0) { add('gold', tax); S.stats.headTax = (S.stats.headTax || 0) + tax; }
}

// ---- The army (0.12): the Barracks turns a person + arms + bread into a soldier ----
const AC = () => KC().army;
function barracksLv() { return (S.kingdom.barracks && S.kingdom.barracks.lv) || 0; }
function barracksBuilt() { return barracksLv() > 0; }
function barracksAvailable() { return kingdomNo() > 0 && kTier() >= 3; } // built in the City tier
function barracksCost() { const l = barracksLv(); if (!l) return { ...AC().build }; return { gold: Math.round(AC().costBase * Math.pow(l, AC().costExp)) }; }
function canUpBarracks() { return barracksAvailable() && barracksLv() < levelCap() && canAfford(barracksCost()); }
function upgradeBarracks() { if (!canUpBarracks()) return false; pay(barracksCost()); S.kingdom.barracks = S.kingdom.barracks || { lv: 0, train: 0 }; S.kingdom.barracks.lv++; if (S.kingdom.barracks.lv === 1) log('Built the Barracks.'); return true; }
function trainPerMin() { return barracksBuilt() ? AC().trainPerMin * barracksLv() * wonderMult('recruit') : 0; }
function upkeepMult() { return Math.max(0.5, 1 - 0.1 * perkRank('rations')); } // Lean Barracks: less gear per soldier
function soldierCostMult(n = soldiers()) { return Math.pow(AC().costGrowth, Math.max(0, n - ((S.kingdom && S.kingdom.solFree) || 0))) * upkeepMult(); } // solFree: veterans from a 0.11 army
function nextSoldierCost() { const m = soldierCostMult(), c = AC().soldierCost; return { lumber: c.lumber * m, swords: c.swords * m, bread: c.bread * m }; }
const SOLDIER_GOODS = ['lumber', 'swords', 'bread']; // Beta 0.2.0: a soldier is 1 lumber + 1 arms + 1 bread (×1.01 per soldier you have)
function recruitCost() { return nextSoldierCost().swords; }
function trainBlocker() { if (!barracksBuilt()) return 'barracks'; const c = nextSoldierCost(); for (const k of SOLDIER_GOODS) if ((S.res[k] || 0) - c[k] < orderReserve(k)) return k; return null; } // goods kept for building are never trained away
function recruitPerMin() { return trainBlocker() ? 0 : trainPerMin(); }
// retired 0.10 supply-line API (kept so old callers read something sane)
const WAR_KEYS = [];
function warIncome() { return 0; } function warDemand() { return 0; } function warCover() { return Infinity; } function lineSupports() { return 0; } function perSoldier() { return 0; } function demandMult() { return 1; }
function armyEff() { return 1; } function armyLimitBy() { return null; } function upkeepPerMin() { return {}; } function spareArms() { return 0; } function swordsLeftMin() { return Infinity; }
function foodPerMin() { return 0; } function suppliesPerMin() { return 0; }
function armyLimit() { return recArmy(Math.min(landsHeld() + 1, CONFIG.ages.lands)); } // 0.12: no limit — the recommended army for the next land
function housing() { return houseCap(); }
function armyFloor() { return 0; } function armyHold() { return soldiers(); }
function recArmy(n) { return Math.max(10, AC().recBase * n + AC().recOffset); } // same in every Age
function soldiers() { return Math.floor(S.res.soldiers || 0); }
function garrisoned() { let n = 0; for (const k in (S.kingdom.lands || {})) n += S.kingdom.lands[k].garrison || 0; return n; }
function marching() { return Math.max(0, soldiers() - garrisoned()); }
function armyMult() { return 1; } // Beta 0.3.0: soldiers fight as soldiers now
function armyHpMult() { return 1; }
let _press = null, _pressAt = -1;
function battlePressure() { // share of the hero's HP one fight takes before healing, 0..1 — how hard the army is fighting
  if (phase() < 3 || !heroFighting() || S.hero.resting || marching() <= 0) return 0;
  const t = S.hero.time; if (_pressAt === t && _press !== null) return _press; _pressAt = t;
  const f = fightNet(); return (_press = Math.max(0, Math.min(1, f.taken / Math.max(1, f.maxHp))));
}
function lossPerMin() { return 0; } // Beta 0.3.0: soldiers fall in battles, not over time
function trainOne() { if (trainBlocker()) return false; const c = nextSoldierCost(); for (const k of SOLDIER_GOODS) S.res[k] -= c[k]; S.res.soldiers = (S.res.soldiers || 0) + 1; S.stats.trained = (S.stats.trained || 0) + 1; S.lifetime.soldiers = (S.lifetime.soldiers || 0) + 1; return true; }
// Beta 0.2.0: the endless loop — once a land is conquered, the hero marches on to the next one by himself as soon as the army reaches its recommended size
function marchReady() { const n = landN(), nx = n + 1; if (phase() < 3 || !n || !landDone(n) || !landDef(nx) || !landOpen(nx)) return null; return { n: nx, ready: marching() >= recArmy(nx), need: recArmy(nx) }; }
function autoMarch() { if (S.settings.autoMarch === false || !heroFighting()) return false; const m = marchReady(); if (!m || !m.ready) return false; if (!setGround(landId(m.n))) return false; log(`The army is ready — the hero marches on to ${landDef(m.n).name}.`); pushEvent({ who: 'march', n: m.n }); return true; }
function tickArmy(dt) {
  if (kingdomNo() < 1) return; const K = S.kingdom;

  const loss = lossPerMin() / 60 * dt; // casualties: hard fighting costs soldiers — people gone for good
  if (loss > 0) { K.lossAcc = (K.lossAcc || 0) + loss; while (K.lossAcc >= 1 && marching() > 0) { K.lossAcc -= 1; S.res.soldiers -= 1; S.stats.fallen = (S.stats.fallen || 0) + 1; } }
  const B = K.barracks;
  if (B && B.lv > 0) { B.train = Math.min(3, (B.train || 0) + trainPerMin() / 60 * dt); while (B.train >= 1 && trainOne()) B.train -= 1; if (trainBlocker()) B.train = Math.min(B.train, 1); }
  K.deserting = false;
  let over = garrisoned() - soldiers(); if (over > 0) for (const k of Object.keys(K.lands || {}).sort((a, b) => b - a)) { const L = K.lands[k], t = Math.min(over, L.garrison || 0); L.garrison -= t; over -= t; if (over <= 0) break; }
}

// ---- Lands, garrisons, taxes ----
const LC = () => KC().lands;
function landId(n) { return 'land' + n; }
function landN(gid = S.hero.ground) { const G = CONFIG.grounds[gid]; return (G && G.land) || 0; }
function landDef(n) { return CONFIG.grounds[landId(n)] || null; }
function landState(n) { S.kingdom.lands = S.kingdom.lands || {}; return S.kingdom.lands[n] || (S.kingdom.lands[n] = { garrison: 0, coffer: 0 }); }
function landDone(n) { const G = landDef(n); return !!G && !!S.hero.bossesKilled[landId(n) + ':' + G.stages]; }
function landBest(n) { const id = landId(n); if (S.hero.ground === id) return S.hero.bestStage; return (S.hero.grounds[id] || {}).bestStage || 0; }
function landPct(n) { const G = landDef(n); if (!G) return 0; if (landDone(n)) return 100; const b = landBest(n); return b > 1 ? Math.min(99, Math.floor(100 * (b - 1) / G.stages)) : 0; }
function landsHeld() { let n = 0; while (landDone(n + 1)) n++; return n; }
const LAND_QUEST = { 1: 'w02', 2: 'w05', 3: 'w06' }; // 0.10.4: the first dynasty marches as the quests lead — the third land waits until the crown has passed once
function landQuestOk(n) { return (S.legacy.dynasty || 1) > 1 || questReached(LAND_QUEST[Math.min(n, 3)]); }
function landOpen(n) { return phase() === 3 && !!landDef(n) && (n === 1 || landDone(n - 1)) && landQuestOk(n); }
function landReqText(n) { const G = landDef(n); if (!G) return ''; if (n > 1 && !landDone(n - 1)) return G.reqText; if (!landQuestOk(n)) return n >= 3 ? 'Pass the Crown first' : 'Follow the quests'; return G.reqText; }
function landsTouched() { const o = []; for (let n = 1; landDef(n) && (landPct(n) > 0 || landOpen(n)); n++) o.push(n); return o; }
function garrisonNeed(n) { return Math.max(1, Math.ceil(AC().garrisonShare * recArmy(n))); } // 0.12: a small share of the land's recommended army
function garrisonFill(n) { return Math.min(1, (landState(n).garrison || 0) / garrisonNeed(n)); }
function vaultCount() { return Object.keys(S.legacy.vault || {}).length; }
function taxGrowthTo(n) { const L = LC(), k = L.taxSlowAfter || 10; return Math.pow(L.taxGrowth, Math.min(n, k) - 1) * Math.pow(L.taxGrowthLate || L.taxGrowth, Math.max(0, n - k)); } // 0.10.13: taxes climb fast to land 10, then more slowly than the lands get harder
function taxFull(n) { return LC().taxBase * taxGrowthTo(n) * ageMult('gold') * wonderMult('tax') * (1 + 0.1 * perkRank('treasury')) * (1 + 0.25 * perkRank('tax')) * (1 + 0.02 * vaultCount()); }
function landShare(n) { const pct = landPct(n) / 100; return heroInLand(n) ? Math.min(pct, LC().heroHereCap) : pct; } // while the hero still fights in a land, it pays at most half
function heroInLand(n) { return phase() === 3 && landN() === n && !landDone(n); } // 0.10.6: a conquered land pays in full even while the hero farms its Endless Battle
function taxPerHour(n) { const pct = landShare(n); return pct > 0 ? taxFull(n) * pct * garrisonFill(n) : 0; }
function spoilPerHour(n) { return LC().spoilPerHour * ageMult('spoil') * landShare(n) * garrisonFill(n) * (1 + 0.25 * perkRank('spoils')) * wonderMult('tax'); }
function cofferCap(n) { return taxFull(n) * LC().cofferHours; }
function cofferTotal() { let g = 0; for (const k in (S.kingdom.lands || {})) g += S.kingdom.lands[k].coffer || 0; return g; }
function taxTotalPerHour() { let g = 0; for (const n of landsTouched()) g += taxPerHour(n); return g; }
function tickTaxes(dt) {
  if (phase() < 3) return;
  for (const n of landsTouched()) {
    const G = landDef(n), L = landState(n), t = taxPerHour(n) / 3600 * dt;
    if (t > 0) { const w = titheTo(t); if (t - w > 0) add('gold', t - w); S.stats.taxed = (S.stats.taxed || 0) + t; } // 0.10.3: taxes go straight into your gold (0.11: part of them to the Wonder)
    const sp = spoilPerHour(n) / 3600 * dt; if (sp > 0) add(G.spoil, sp);
  }
}
function collectTaxes() { const g = cofferTotal(); if (g < 1) return 0; for (const k in S.kingdom.lands) S.kingdom.lands[k].coffer = 0; add('gold', g); S.stats.taxed = (S.stats.taxed || 0) + g; pushEvent({ who: 'loot', loot: { gold: Math.floor(g) } }); log(`Collected ${fmt(g)} gold in taxes.`); return g; }
function setGarrison(n, v) { if (landPct(n) <= 0) return false; const L = landState(n), others = garrisoned() - (L.garrison || 0); L.garrison = Math.max(0, Math.min(Math.floor(v), soldiers() - others)); return true; }

// ---- Crowns ----
function rulerCrowns(n) { return Math.max(1, Math.round(1 + 0.8 * n)); } // 0.10.13: grows steadily (2, 3, 3, 4, 5 … 9 at land 10, 21 at land 25) so no single pass buys every perk
// ======================= 0.11: Eras, Era Rulers, traits, Wonders =======================
function eraOf(n) { return Math.ceil(n / CONFIG.eras.size); }
function isEraRuler(n) { return n > 0 && n % CONFIG.eras.size === 0; }
function ageNo() { return (S.legacy && S.legacy.age) || 1; }
function ageName(a = ageNo()) { const N = CONFIG.ages.names; return N[a - 1] || `Age ${roman(a)}`; }
function gEra(n) { return (ageNo() - 1) * (CONFIG.ages.lands / CONFIG.eras.size) + eraOf(n); } // eras keep counting across Ages
function ageMult(k) { return Math.pow(CONFIG.ages[k], ageNo() - 1); }
function landTrait(n) { if (!n) return null; const e = gEra(n), T = CONFIG.eras.traits; return e <= 1 ? null : T[1 + (e - 2) % (T.length - 1)]; }
function wonderFor(e) { const W = CONFIG.wonders, def = W[(e - 1) % W.length], lv = Math.floor((e - 1) / W.length) + 1; return { e, def, lv, name: def.name + (lv > 1 ? ' ' + roman(lv) : '') }; }
function wonderState(e) { S.legacy.wonders = S.legacy.wonders || {}; return S.legacy.wonders[e] || (S.legacy.wonders[e] = { paid: {}, built: false }); }
function wonderUnlocked(e) { return (S.legacy.eraBest || 0) >= e; }
function wonderBuilt(e) { return !!(S.legacy.wonders && S.legacy.wonders[e] && S.legacy.wonders[e].built); }
function wonderCost(e) { const W = wonderFor(e), C = CONFIG.wonderCost, L = LC(), per = CONFIG.ages.lands / CONFIG.eras.size, a = Math.ceil(e / per), land = ((e - 1) % per + 1) * CONFIG.eras.size; return { gold: Math.round(L.taxBase * taxGrowthTo(land) * Math.pow(CONFIG.ages.gold, a - 1) * C.taxHours), [W.def.spoil]: Math.round(C.spoilBase * Math.pow(C.spoilGrowth, e - 1)) }; }
function wonderProgress(e) { const c = wonderCost(e), p = wonderState(e).paid; let have = 0, need = 0; for (const k in c) { need += 1; have += Math.min(1, (p[k] || 0) / c[k]); } return have / need; }
function contributeWonder(e) {
  if (!wonderUnlocked(e) || wonderBuilt(e)) return false; const c = wonderCost(e), st = wonderState(e); let any = false;
  for (const k in c) { const left = c[k] - (st.paid[k] || 0); if (left <= 0) continue; const give = Math.min(left, Math.floor(S.res[k] || 0)); if (give > 0) { S.res[k] -= give; st.paid[k] = (st.paid[k] || 0) + give; any = true; } }
  if (Object.keys(c).every(k => (st.paid[k] || 0) >= c[k])) { st.built = true; const W = wonderFor(e); log(`The ${W.name} is complete! ${W.def.desc}.`); pushEvent({ who: 'wonder', e }); }
  return any;
}
function titheShare() { return S.legacy.tithe === undefined ? 0.5 : S.legacy.tithe; } // 0.11: share of taxes sent to the Wonder being built
function titheTo(g) { // pays gold (and the Wonder's spoil from store) into the next Wonder; returns the gold used
  const sh = titheShare(); if (!sh || g <= 0) return 0; const e = nextWonderEra(); if (!wonderUnlocked(e) || wonderBuilt(e)) return 0;
  const c = wonderCost(e), st = wonderState(e), left = c.gold - (st.paid.gold || 0), give = Math.max(0, Math.min(left, g * sh)); st.paid.gold = (st.paid.gold || 0) + give;
  for (const k in c) if (k !== 'gold') { const need = c[k] - (st.paid[k] || 0), has = Math.floor(S.res[k] || 0); if (need > 0 && has > 0) { const x = Math.min(need, has); S.res[k] -= x; st.paid[k] = (st.paid[k] || 0) + x; } }
  if (Object.keys(c).every(k => (st.paid[k] || 0) >= c[k])) { st.built = true; const W = wonderFor(e); log(`The ${W.name} is complete! ${W.def.desc}.`); pushEvent({ who: 'wonder', e }); }
  return give;
}
function wonderMult(key) { let m = 1; for (const e in (S.legacy.wonders || {})) { if (!S.legacy.wonders[e].built) continue; const d = wonderFor(+e).def; if (d[key]) m *= d[key]; } return m; }
function wonderAdd(key) { let a = 0; for (const e in (S.legacy.wonders || {})) { if (!S.legacy.wonders[e].built) continue; const d = wonderFor(+e).def; if (d[key]) a += d[key]; } return a; }
function nextWonderEra() { const b = S.legacy.eraBest || 0; for (let e = 1; e <= b; e++) if (!wonderBuilt(e)) return e; return b + 1; }
function onRulerSlain(n) {
  if (isEraRuler(n)) { const e = gEra(n); if (e > (S.legacy.eraBest || 0)) { S.legacy.eraBest = e; const W = wonderFor(e); log(`An Era Ruler falls! The ${W.name} can now be built in the Keep.`); pushEvent({ who: 'era', e }); } }
  const A = ageNo(), CR = CONFIG.ages.crowns; S.legacy.rulerAge = S.legacy.rulerAge || {}; const firstThisAge = (S.legacy.rulerAge[n] || 0) < A; if (firstThisAge) S.legacy.rulerAge[n] = A;
  const G = landDef(n), v = firstThisAge ? (rulerCrowns(n) + (isEraRuler(n) ? CR.eraRuler : 0) + (n === CONFIG.ages.lands ? CR.emperor : 0)) * A : 0; S.kingdom.crownsRun = (S.kingdom.crownsRun || 0) + v;
  if (n === CONFIG.ages.lands) { S.kingdom.ageDone = true; log(`The Emperor has fallen — the ${ageName()} is won. Crown your heir in the Keep to begin the ${ageName(A + 1)}.`); pushEvent({ who: 'emperor', a: A }); }
  S.legacy.vault = S.legacy.vault || {}; const first = !S.legacy.vault[n]; if (first) S.legacy.vault[n] = G.crown;
  log(`${G.name} is conquered! You take ${G.crown} (+${v} 👑)${first ? ' — a new crown for the Vault' : ''}.`); pushEvent({ who: 'crown', n, v, first });
  // Beta 0.2.0: no settlers
}
function canPassCrown() { return phase() === 3 && landsHeld() >= 1 && (questReached('w05b') || (S.legacy.dynasty || 1) > 1); }
function infoOn(id) { const q = CONFIG.legacy.infoUnlock[id]; return !q || questReached(q) || S.legacy.foundings > 0; }
function passKeep() { return CONFIG.legacy.passKeep; }
function crownsIfPass() { return S.kingdom.crownsRun || 0; }
// 0.12.1: a new Age begins with a fresh town — building levels, parts, houses and people start again; Deep Foundations gives a head start
function newAgeTown() {
  const K = S.kingdom, f = perkRank('foundations');
  for (const id in (K.steps || {})) { const st = K.steps[id]; st.lv = st.lvW = st.lvC = st.lvH = 1; st.deep = []; for (let i = 0; i < f; i++) st.deep.push({ W: 1, C: 1, H: 1 }); st.pipes = []; st.inBuf = 0; st.phase = 0; st.t = 0; }
  K.houses = 0; K.houseProg = 0; K.houseFree = 0; K.solFree = 0; K.birthAcc = 0; K.settleAcc = 0; if (K.barracks) { K.barracks.lv = 1; K.barracks.train = 0; }
}
function crownHeir() { // 0.11.1: after the Emperor falls — the heir begins the next Age
  if (!S.kingdom.ageDone || !canPassCrown()) return false; const from = ageNo(); S.legacy.age = from + 1; const g = passCrown(true); newAgeTown(); log(`The ${ageName()} begins.`); pushEvent({ who: 'newage', a: ageNo(), gain: g }); save(); return g; // Beta 0.1.15: one save, after the town reset
}
function passCrown(noSave) {
  if (!canPassCrown()) return false;
  const leg = S.legacy, gain = crownsIfPass(), held = landsHeld(); leg.lastTaxH = taxTotalPerHour();
  leg.knowledge += gain; leg.crownsEarned = (leg.crownsEarned || 0) + gain; leg.lapLand = Math.max(leg.lapLand || 0, held); leg.dynasty = (leg.dynasty || 1) + 1;
  leg.history.push({ dynasty: leg.dynasty - 1, lands: held, crowns: gain, heroLevel: S.hero.level, age: ageNo() });
  const h = S.hero;
  // 0.10.4: the heir inherits the hero's gear and the Capital as they stand — passing the crown is a victory lap, not a loss
  h.level = 1; h.xp = 0; h.crafting = null;
  for (const id in h.grounds) if (landN(id)) delete h.grounds[id];
  for (const k in h.bossesKilled) if (landN(k.split(':')[0])) delete h.bossesKilled[k];
  if (landN(h.ground)) { h.ground = 'land1'; h.stage = 1; h.bestStage = 1; h.kills = 0; }
  h.enemyHp = 0; h.hp = 10; h.resting = false;
  // The Capital stands: settlement, buildings, halls and Barracks are kept — their levels start over. Lands, taxes, the army and stores reset.
  const K = S.kingdom;
  const keep = passKeep(); // 0.10.4: the Capital keeps half its levels (Blueprints: more)
  for (const id in (K.steps || {})) { const st = K.steps[id]; for (const pt of ['lvW', 'lvC', 'lvH']) st[pt] = Math.max(1, Math.floor((st[pt] || st.lv) * keep)); st.lv = Math.min(st.lvW, st.lvC, st.lvH); st.pipes = []; st.inBuf = 0; st.phase = 0; st.t = 0; }
  for (const id in (K.halls || {})) if (K.halls[id] > 0) K.halls[id] = Math.max(1, Math.floor(K.halls[id] * keep));
  if (K.barracks) { K.barracks.lv = Math.max(1, Math.floor(K.barracks.lv * keep)); K.barracks.train = 0; }
  K.lands = {}; K.crownsRun = 0; K.ageDone = false; K.orders = []; K.deserting = false; K.tierPaid = {};
  for (const k in S.res) S.res[k] = 0; K.solFree = 0; // 0.12 / 0.2.0: the army is gone
  add('gold', 500 + perkRank('cache') * Math.max(1000, 0.25 * (leg.lastTaxH || 0)));
  if (S.quests.dq && (S.quests.dq.type === 'pass' || S.quests.dq.type === 'heir')) { /* the Deed completes on this pass */ } else if (S.quests.cur !== 'w05b') { S.quests.dq = null; const w = CONFIG.quests.findIndex(q => q.id === 'w06'); if (w >= 0) { S.quests.index = w; S.quests.cur = 'w06'; if (S.quests.base) delete S.quests.base.w06; } } // the heir picks up at Blackwood March
  ensureThralls();
  log(`The crown passes to your heir. Dynasty ${leg.dynasty} begins with ${gain} new Crown${gain === 1 ? '' : 's'}.`); pushEvent({ who: 'crownpass', gain });
  if (!noSave) save(); return gain;
}
function lapActive(gid = S.hero.ground) { const n = landN(gid); return n > 0 && n <= (S.legacy.lapLand || 0); }

// ---- 0.9 migration: thralls → building levels; war chest renamed ----
function migrate09() {
  const K = S.kingdom; if (!K || K.v09) return; K.v09 = true;
  if (kingdomNo() < 1) return;
  const cap = levelCap();
  for (const id in (K.steps || {})) { const st = K.steps[id]; if (!stepDef(id)) continue; st.lv = Math.min(cap, Math.max(1, Math.max(st.rate || 1, st.cart || 1, st.haul || 1) + 2 * (st.workers || []).length + (st.overseer != null ? 3 : 0))); st.workers = []; st.overseer = null; st.accountant = null; }
  let refund = 0; for (const t of (K.thralls || [])) refund += KC().hirePrice[t.stars] || 0; if (refund) { S.res.gold = (S.res.gold || 0) + refund; log(`Thralls are gone: your buildings run on levels now. +${fmt(refund)} gold refunded.`); }
  K.thralls = []; K.offers = [];
  if ((K.built || {}).barracks || (K.steps || {}).barracks) { const b = (K.steps || {}).barracks; K.barracks = { lv: Math.max(1, b ? Math.max(b.rate || 1, b.cart || 1, b.haul || 1) : 1), train: 0 }; delete (K.built || {}).barracks; delete (K.steps || {}).barracks; }
  if (S.res.equipment !== undefined || S.res.officers !== undefined) { S.res.food = S.res.supplies || 0; S.res.supplies = S.res.equipment || 0; delete S.res.equipment; delete S.res.officers; }
  for (const id in (S.legacy.perks || {})) { const p = CONFIG.legacy.perks.find(x => x.id === id); if (!p) { const r = S.legacy.perks[id]; let c = 0; const old = { headstart: [5, 1.6] }[id] || [5, 1.6]; for (let i = 0; i < r; i++) c += Math.ceil(old[0] * Math.pow(old[1], i)); S.legacy.knowledge += c; delete S.legacy.perks[id]; } }
  const q = questCurrent(); if (!q || q.id !== 'p01') { const at = id => CONFIG.quests.findIndex(x => x.id === id); S.quests.index = phase() === 3 ? at('w01') : [at('k01'), at('h01'), at('v01'), at('y01')][Math.min(3, kTier())]; S.quests.cur = CONFIG.quests[S.quests.index].id; }
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
    if (!raw) { hadAlpha = ALPHA_KEYS.some(k => { try { return !!localStorage.getItem(k); } catch (e) { return false; } }); return null; } // a fresh Beta save; an Alpha save on this device is left alone
    const d = JSON.parse(raw), b = freshState();
    if (!d || typeof d !== 'object' || !d.hero || !d.res) return null; // not a save
    if (!(d.schema >= 1)) markAlphaMigrated(d); // a Beta save from before the schema number: its Alpha migrations must not run
    const oldSchema = d.schema || 1;
    S = { ...b, ...d, res: { ...b.res, ...d.res }, kingdom: { ...b.kingdom, ...(d.kingdom || {}), steps: { ...((d.kingdom || {}).steps || {}) } }, tech: { ...(d.tech || {}) }, quests: { ...b.quests, ...(d.quests || {}) }, stats: { ...b.stats, ...(d.stats || {}) }, settings: { ...b.settings, ...d.settings },
      hero: { ...b.hero, ...d.hero, attr: { ...b.hero.attr, ...(d.hero || {}).attr }, gear: { ...b.hero.gear, ...(d.hero || {}).gear }, tools: { ...b.hero.tools, ...((d.hero || {}).tools || {}) }, grounds: { ...((d.hero || {}).grounds || {}) }, skillLv: { ...b.hero.skillLv, ...(d.hero || {}).skillLv } },
      legacy: { ...b.legacy, ...(d.legacy || {}), perks: { ...((d.legacy || {}).perks || {}) }, kills: { ...((d.legacy || {}).kills || {}) } } };
    // Migration: saves that reached the kingdom quests before the kingdom moved behind the first founding get that founding for free
    ensureThralls();
    // Techniques come from the Combat tree now: rebuild loadout / levels from ranks (migrates old Skills-tab saves)
    S.hero.tree = S.hero.tree || {}; S.hero.dxp = S.hero.dxp || {};
    if (!S.hero.dxp.combat && S.hero.level > 1) { let x = 0; for (let l = 1; l < S.hero.level; l++) x += CONFIG.discXpToLevel(l); S.hero.dxp.combat = x; } // old save: seed Combat from hero level
    migrateSkills();
    if (S.kingdom && S.kingdom.lands) { const g0 = cofferTotal(); if (g0 > 0) { add('gold', g0); S.stats.taxed = (S.stats.taxed || 0) + g0; } for (const k in S.kingdom.lands) S.kingdom.lands[k].coffer = 0; } // 0.10.3: coffers emptied into gold
    if (S.legacy.perks && S.legacy.perks.autocollect) { delete S.legacy.perks.autocollect; S.legacy.knowledge = (S.legacy.knowledge || 0) + 15; } // Stewards refunded: taxes flow in for everyone now
    if ((S.res.food || 0) > 0 || (S.res.supplies || 0) > 0) { S.res.bread = (S.res.bread || 0) + (S.res.food || 0); S.res.swords = (S.res.swords || 0) + (S.res.supplies || 0) / 2; S.res.lumber = (S.res.lumber || 0) + (S.res.supplies || 0) / 2; S.res.food = 0; S.res.supplies = 0; } // 0.10: stockpiles go back to the Storehouse
    if (S.legacy.perks && S.legacy.perks.warcry) { const r = S.legacy.perks.warcry; let back = 0; for (let i = 0; i < r; i++) back += Math.ceil(5 * Math.pow(1.8, i)); S.legacy.knowledge = (S.legacy.knowledge || 0) + back; delete S.legacy.perks.warcry; } // 0.9.12: Rally removed — its War Cry perk is refunded
    if (S.legacy.perks && S.legacy.perks.bestiary) { delete S.legacy.perks.bestiary; S.legacy.knowledge = (S.legacy.knowledge || 0) + 1; } // 0.9.8: the Bestiary unlocks by playing — its Crown comes back
    { const P = S.legacy.perks || {}, OLD = { heirloom: [10, 2.2], oldblade: [20, 1], blueprints: [6, 1.8], drill: [4, 1.7], standing: [8, 2], ledger: [1, 1], danger: [2, 1], chronicler: [2, 1], surveyor: [2, 1], almanac: [2, 1] }; // 0.10.4: retired perks refunded
      for (const id in OLD) if (P[id]) { let c = 0; for (let i = 0; i < P[id]; i++) c += Math.ceil(OLD[id][0] * Math.pow(OLD[id][1], i)); S.legacy.knowledge = (S.legacy.knowledge || 0) + c; delete P[id]; } }
    if (S.kingdom && !S.kingdom.cr104) { S.kingdom.cr104 = true; if (phase() === 3) { let c = 0; for (let n = 1; landDef(n) && landDone(n); n++) c += rulerCrowns(n); S.kingdom.crownsRun = c; } } // 0.10.4: the new Crown curve counts for this dynasty too
    if (phase() === 3 && S.hero.activity !== 'fight') { S.hero.activity = 'fight'; S.hero.harvestTimer = 0; } // 0.10.6: no gathering in the Kingdom phase
    if (!S.legacy.v121) { S.legacy.v121 = true; for (const id in ((S.kingdom || {}).steps || {})) { const st = S.kingdom.steps[id]; st.deep = st.deep || []; } }
    if (!S.legacy.v120) { S.legacy.v120 = true; const K = S.kingdom || {}; // 0.12.0: production chains, people and a smaller, stronger army
      for (const id in (K.steps || {})) { const st = K.steps[id], l = st.lv || 1; st.lvW = l; st.lvC = l; st.lvH = l; }
      const s0 = Math.floor(S.res.soldiers || 0); if (s0 > 0) S.res.soldiers = Math.floor(Math.sqrt(s0) * 5); // same army boost as before, far fewer men
      for (const k in (K.lands || {})) K.lands[k].garrison = Math.min(K.lands[k].garrison || 0, garrisonNeed(+k));
      if (kingdomNo() > 0 && stepBuilt('carpenter')) { K.houses = Math.max(Math.ceil(soldiers() * 1.5 / PC().perHouse), 20 + 2 * Math.min(100, stepState('carpenter').lv || 1)); S.res.people = Math.max(0, houseCap() - soldiers()); K.houseFree = Math.max(0, K.houses - 150); }
      K.solFree = Math.max(0, soldiers() - 400); // a big old army keeps its veterans without making every new recruit cost a fortune
      const P = S.legacy.perks || {}; // Quartermasters / Rations now mean Master Builders / Lean Barracks — same ranks, new effects
      const st = S.settings.story = S.settings.story || {}; const Q = S.quests || {}; st.wild = true; if (S.legacy.foundings > 0) st.charter = true; if (phase() === 3) st.capital = true; if ((S.legacy.dynasty || 1) > 1 || questReached('w06')) st.fallow = true;
      if (kingdomNo() > 0 && kTier() >= 3 && !barracksBuilt() && ['y01', 'y02', 'y04', 'w02', 'w03', 'w03b'].includes(Q.cur)) { const i = CONFIG.quests.findIndex(q => q.id === 'y00'); if (i >= 0) { Q.index = i; Q.cur = 'y00'; } } // the Barracks now comes before the Capital
    }
    if (!S.legacy.v112) { S.legacy.v112 = true; // 0.11.2 loot cleanup: items that did nothing are sold for their old price; meat, berries and the cleaver are gone
      const OLD = { berries: 1, meat: 5, rattail: 3, tusk: 12, greatboartusk: 90, wolfpelt: 15, alphafang: 120, bearclaw: 20, cavebearhide: 150, saberfang: 30, beastkingcrown: 300, rope: 4, lockbox: 40, banditseal: 200, tollbaronring: 350, bonedust: 3, graveiron: 25, bonelordskull: 250, cultidol: 400 };
      let g = 0; for (const k in OLD) { g += Math.floor((S.res[k] || 0) * OLD[k]); delete S.res[k]; if (S.lifetime) delete S.lifetime[k]; if (S.settings.unpinned) delete S.settings.unpinned[k]; }
      if (g > 0) { S.res.gold = (S.res.gold || 0) + g; log(`Old trinkets sold for ${fmt(g)} gold.`); }
      if (S.hero.tools) delete S.hero.tools.cleaver; if (S.hero.crafting && S.hero.crafting.slot === 'cleaver') S.hero.crafting = null; if (S.tech) delete S.tech.butchery; if (S.researching && S.researching.id === 'butchery') S.researching = null;
    if (S.kingdom && S.kingdom.orders) S.kingdom.orders = S.kingdom.orders.filter(o => !Object.keys(o.wants || {}).some(k => OLD[k])); }
    if (!S.legacy.v111) { S.legacy.v111 = true; const L = S.legacy, h = S.hero; // 0.11.1: the Crown Tree and Ages
      let capsLearned = 0; for (const d in CONFIG.trees) for (const node of CONFIG.trees[d]) if (node.capstone && nodeRank(d, node.id)) capsLearned++;
      const starsOld = Object.keys(h.stars || {}).length + (h.bonusTalent || 0), starBack = Math.max(0, starsOld - capsLearned); h.bonusTalent = 0;
      const goldBack = h.pathGold || 0; if (goldBack > 0) S.res.gold = (S.res.gold || 0) + goldBack; h.pathGold = 0; h.paths = {};
      const OLD = { bloodline: [3, 1.12], veteran: [8, 2], charter: [6, 2], cellar: [5, 1.7], memory: [6, 1.8], haggler: [4, 1.7], rations: [5, 1.7], warcollege: [5, 1.8], tax: [3, 1.5], spoils: [5, 1.8], lap: [6, 2], cache: [4, 1.6], heirloom: [10, 2.2], oldblade: [20, 1], blueprints: [6, 1.8], drill: [4, 1.7], standing: [8, 2] };
      let perkBack = 0; for (const id in (L.perks || {})) { const o = OLD[id] || [5, 1.6]; for (let i = 0; i < L.perks[id]; i++) perkBack += Math.ceil(o[0] * Math.pow(o[1], i)); } L.perks = {};
      L.knowledge = (L.knowledge || 0) + starBack + perkBack;
      let maxLand = 0; for (const k in (h.bossesKilled || {})) { const m = /^land(\d+):/.exec(k); if (m) maxLand = Math.max(maxLand, +m[1]); } for (const n in (L.vault || {})) maxLand = Math.max(maxLand, +n);
      L.age = maxLand > CONFIG.ages.lands ? Math.floor(maxLand / CONFIG.ages.lands) + 1 : 1; L.lapLand = Math.min(L.lapLand || 0, CONFIG.ages.lands);
      if (!CONFIG.grounds[h.ground]) { h.ground = 'land1'; h.stage = 1; h.bestStage = 1; h.kills = 0; h.enemyHp = 0; }
      for (const id in (h.grounds || {})) if (!CONFIG.grounds[id]) delete h.grounds[id];
      if (maxLand > CONFIG.ages.lands && phase() === 3) { const run = S.kingdom.crownsRun || 0; L.knowledge += run; S.kingdom.crownsRun = 0; for (const k in h.bossesKilled) if (/^land\d+:/.test(k)) delete h.bossesKilled[k]; S.kingdom.lands = {}; L.lapLand = CONFIG.ages.lands; L.dynasty = (L.dynasty || 1) + 1; h.ground = 'land1'; h.stage = 1; h.bestStage = 1; }
      else if (phase() === 3 && landDone(CONFIG.ages.lands)) S.kingdom.ageDone = true;
      S.legacy.migrate111 = { starBack, goldBack, perkBack, age: L.age };
      log(`The Crown Tree replaces Paths and Legacy perks: +${starBack + perkBack} Crowns refunded${goldBack ? `, +${fmt(goldBack)} gold back from Paths` : ''}. You are in the ${ageName()}.`);
    }
    if (S.legacy.eraBest === undefined) { let b = 0; for (const n in (S.legacy.vault || {})) if (isEraRuler(+n)) b = Math.max(b, eraOf(+n)); S.legacy.eraBest = b; } // 0.11: Era Rulers you have already beaten unlock their Wonders
    if (S.hero.fightOn === undefined) S.hero.fightOn = S.hero.activity === 'fight' || !!(S.hero.chose || {}).fight || (S.hero.totalKills || 0) > 0 || phase() === 3; // 0.10.12
    if (S.hero.fightOn && S.hero.activity === 'idle') S.hero.activity = 'fight';
    if ((S.res.ratkingtooth || 0) > 0) S.res.gold = (S.res.gold || 0) + 60 * Math.floor(S.res.ratkingtooth); delete S.res.ratkingtooth; if (S.lifetime) delete S.lifetime.ratkingtooth; // Beta 0.1.21: the Rat King's Tooth is gone — sold for its old price
    for (const k in S.res) if (!CONFIG.resources[k]) delete S.res[k]; // never keep a good that no longer exists
    if (S.quests.dq && S.quests.dq.type === 'houses') { S.quests.dq = null; if (/^deed/.test(S.quests.cur || '')) S.quests.cur = null; } // Beta 0.2.0: the houses Deed is gone
    if (oldSchema < 2) { // Beta 0.3.0: lands 4–10 had 100 stages, every land is now 50 battles; the Endless Battle is gone
      const h = S.hero, half = (gid, s) => { const G = CONFIG.grounds[gid]; if (!G || !G.land) return s; const old = G.land <= LC().shortLands ? 50 : 100; return Math.max(1, Math.min(50, Math.ceil((s || 1) * 50 / old))); };
      for (const gid in (h.grounds || {})) { const g2 = h.grounds[gid]; if (CONFIG.grounds[gid] && CONFIG.grounds[gid].land) { g2.stage = half(gid, g2.stage); g2.bestStage = half(gid, g2.bestStage); g2.kills = 0; } }
      if (landN() > 0) { h.stage = half(h.ground, h.stage); h.bestStage = half(h.ground, h.bestStage); h.kills = 0; h.enemyHp = 0; }
      const bk = {}; for (const k in (h.bossesKilled || {})) { const m = /^land(\d+):(\d+)$/.exec(k); if (!m) { bk[k] = h.bossesKilled[k]; continue; } const n = +m[1], s = +m[2], ns = n <= LC().shortLands ? s : s / 2; if (ns === Math.floor(ns) && ns % 10 === 0 && ns <= 50) bk['land' + n + ':' + ns] = true; } h.bossesKilled = bk;
      for (const n in ((S.kingdom || {}).lands || {})) { if (landDone(+n)) { const id = landId(+n); if (h.ground === id) h.bestStage = 50; else if (h.grounds[id]) h.grounds[id].bestStage = 50; } S.kingdom.lands[n].depth = 0; }
      S.settings.autoMarch = false; }
    S.schema = SCHEMA;
    autoUnpin();
    if (S.kingdom && S.kingdom.orders) S.kingdom.orders = S.kingdom.orders.filter(o => o && o.wants && Object.keys(o.wants).every(k => CONFIG.resources[k])); // never keep an Order for a good that no longer exists
    return S;
  } catch (e) { return null; }
}
function exportSave() { return btoa(unescape(encodeURIComponent(JSON.stringify(S)))); }
function importSave(str) { // Beta 0.1.15: validate before replacing; the old save comes back if the new one doesn't load
  let json; try { const d = JSON.parse(decodeURIComponent(escape(atob(String(str || '').trim())))); if (!d || typeof d !== 'object' || !d.hero || !d.res) return false; json = JSON.stringify(d); } catch (e) { return false; }
  const prev = localStorage.getItem(SAVE_KEY);
  try { if (prev) localStorage.setItem(SAVE_KEY + '_backup', prev); localStorage.setItem(SAVE_KEY, json); if (!load()) throw new Error('bad save'); return true; }
  catch (e) { try { if (prev) localStorage.setItem(SAVE_KEY, prev); else localStorage.removeItem(SAVE_KEY); } catch (e2) {} load(); return false; } }
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
  claimOffline(d, 1); save(); // Beta 0.1.15: banked at once — closing or reloading before tapping Claim can't lose it
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
  stepLv, stepName, milestoneCount, nextMilestone, levelCap, cityComplete, minBuildingLv, tierThreat,
  hallDef, hallLv, hallAvailable, hallCost, canHall, upgradeHall,
  PARTS, PART_NAME, partName, partLv, limitPart, partCap, tripTime, tripLoad, pipe, depthCount, depthYield, depthOutput, deepOutput, unitName, digOpen, digCost, canDig, dig, newAgeTown, slowestInLine, housesOn, houses, houseCap, people, townsfolk, houseRoom, birthRoom, houseCost, birthsPerMin, headTaxPerHour, settlersPerHour, settlerWave, turnedRecent, setHousesOn, barracksAvailable, nextSoldierCost, trainBlocker, recArmy, soldierCostMult, garrisonNeed,
  barracksLv, barracksBuilt, barracksCost, canUpBarracks, upgradeBarracks, trainPerMin, housing, foodPerMin, suppliesPerMin, upkeepPerMin, armyLimit, armyLimitBy, soldiers, garrisoned, marching, armyMult, armyHpMult,
  landId, landN, landDef, landState, landDone, landPct, landsHeld, landOpen, landsTouched, garrisonNeed, garrisonFill, taxFull, taxPerHour, spoilPerHour, cofferCap, cofferTotal, taxTotalPerHour, collectTaxes, setGarrison,
  rulerCrowns, ageNo, ageName, gEra, crowns, pathMaxed, crownHeir, titheShare, eraOf, isEraRuler, landTrait, wonderFor, wonderState, wonderUnlocked, wonderBuilt, wonderCost, wonderProgress, contributeWonder, wonderMult, nextWonderEra, gatherOn, bgFactor, pathCost, rowOpen, rowProgress, pathRow, combatLevelBonus, endlessDepth, farming, farmLand, starsSpare, starDemand, vaultCount, canPassCrown, landReqText, landQuestOk, passKeep, infoOn, questStat, crownsIfPass, passCrown, lapActive,
  repairPosts,
  phase, canProclaim, proclaim,
  stockMode, setStockMode, stockTarget, stockDemand, STOCK_MODES,
  get S() { return S; }, get hadAlpha() { return hadAlpha; }, saveString, saveMeta, restoreString, setSaveHook: f => { saveHook = f; }, SAVE_KEY, fmt, pct, fmtTime, drainEvents: () => EVENTS.splice(0), drainBig: () => BIGS.splice(0), afkEfficiency: () => afkEff(),
  orderReserve, markViewed, questReached, battlePressure, recruitCost, armyFloor, lossPerMin, spareArms, recruitPerMin, armyHold, swordsLeftMin, tierDefAt, landCurve, fightNet, isEndless, landShare, heroInLand, warIncome, warDemand, warCover, perSoldier, lineSupports, armyEff, demandMult, WAR_KEYS, discXp, discLevel, discProgress, pathNodes, pathNode, pathRank, pathOpen, pathNeedsStar, pathPointsTotal, pathPointsSpent, pathPointsFree, pathPointsMax, starsTotal, starsSpent, starsFree, canRankPath, rankPath, pathMods, resetPaths, techUnlocked, techUnlockMet, techUnlockLabel, techMastery, techLevelOf, techMod, techMods, chooseMod, modPending, techSlots, equipTech, unequipTech, skillDur, skillCdBase, checkTechUnlocks, treeNode, nodeRank, nodeMax, nodeOpen, treePointsTotal, treePointsSpent, treePointsFree, canRankNode, rankNode, nodeQuestLocked, treeMods,
  fistLevel, slotValue, enemyHit, crafting, maxUpgradePlan, upgradeMax, stats, gearStats, itemStatPreview, gearCraftCost, gearUpgradeCost, canTierUp, craftGear, upgradeGear,
  talentPointsFree, talentPointsTotal, talentPointsSpent, respec, respecCost,
  skillDef, skillUnlocked, skillPower, skillCd, skillReady, castSkill, activeBuffs,
  enemyMaxHp, enemyDps, effectiveEnemyDps, enemyName, isBoss, stageType, enemyType, stageLabel, nextTypeName, stagePool, lootRarity, dropGated, killsNeeded, farmRate, stageDanger, heroRates,
  handDef, handUnlocked, grab, tierName,
  toolTierUnlocked, toolPower, toolCraftCost, toolUpgradeCost, canToolTierUp, craftTool, upgradeTool, activityDef, activityAvailable, setActivity, masteryLevel, harvestTime, harvestYield, harvestRates,
  questCurrent, questProgress, questClaim, suggestGoal, ground, setGround, groundUnlocked, dropToolMult, bestStageAll, groundDrops, toolSlotUnlocked,
  techDef, hasTech, techProgress, canResearch, research, researching, buildingUnlocked, gearTierUnlocked, dropUnlocked, counter,
  kingdomRates, chainFlow, marchReady, autoMarch, ORDERS, orderDef, orderOpen, orderCd, orderReady, inBattle, battleNo, battleKind, enemyArmy, enemyPip, heroEdge, yourPip, rollBattle, battleState, strikeBattle, battleAdvance, battleRetreat, canBattleAdvance, battleWon, battleShowTime, offlineBattles, limitParts, overflowRate, kingdomNo, allSteps, stepDef, stepUnlocked, lineUnlocked, lineSteps, stepState, nextStep, stepMods, kTier, tierDef, stepAvailable, stepBuilt, canBuild, buildStep, tierGoods, tierNeed, tierPaid, tierPaidDone, tierStepsReady, contribute, canRaise, raiseTier, accountantSteps, assignAccountant, cityChecks, cityComplete, stepRate, stepPhases, stepCycle, stepBatch, stepOutput, thrallLevel, thrallCap, dismiss, stepLimit, stepUpCost, stepUpPlan, upgradeStep, stepWorkerSlots,
  assignWorker, assignOverseer, unassign, thrallPost, useAbility, refreshOffers, hire, maxStars, storeUpCost, upgradeStore, orderGoods, foundRenownNeed, canDeliver, deliver, swapOrder, swapReady, rankIndex, rankInfo, heroFighting, thrallCount, sellPrice, sell, buyPrice, buyRes, buyMax, canBuyRes,
  canAdvance, advance, stageSustainable, autoAdvanceBlock, autoKillsNeeded, killHeal, retreat, canAfford, add, simulate, applyOffline, claimOffline, offlineStages,
  save, load, exportSave, importSave, hardReset,
  thrallName, resCap, atCap, storeCap, typeKey, typeKills, bestiaryTier, bestiaryBonus, trophyTier, trophyCount, pinned, togglePin,
  afkCap, afkEff, perkRank, perkCost, buyPerk, heroPath, kingdomPath,
  knowledgeGain, foundCost, canFound, pathUnlocked, found, maxGearTier,
  // debug helpers
  debug: {
    giveAll(n) { for (const k in CONFIG.resources) add(k, n); },
    event(e) { pushEvent(e); },
    give(k, n) { add(k, n); },
    levels(n) { for (let i = 0; i < n; i++) { const cl = discLevel('combat'); gainDiscXp('combat', CONFIG.combatXpToLevel(cl) - discProgress('combat').have); S.hero.level++; } S.hero.hp = stats().maxHp; },
    setStage(n) { S.hero.stage = Math.max(1, n | 0); S.hero.bestStage = Math.max(S.hero.bestStage, S.hero.stage); S.hero.kills = 0; S.hero.enemyHp = 0; },
    knowledge(n) { S.legacy.knowledge += n; },
    kingdomLevel(n) { S.legacy.kingdomLevel = Math.max(1, S.legacy.kingdomLevel + n); ensureThralls(); },
    questSkip() { S.quests.index = Math.min(CONFIG.quests.length, S.quests.index + 1); S.quests.cur = (CONFIG.quests[S.quests.index] || {}).id || null; },
    techAll() { for (const t of CONFIG.techs) S.tech[t.id] = true; },
    resetRun() { const leg = S.legacy, st = S.settings; S = freshState(); S.legacy = leg; S.settings = st; save(); },
    resetAll() { hardReset(); save(); location.reload(); },
  },
};
