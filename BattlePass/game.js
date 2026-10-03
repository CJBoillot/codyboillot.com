// Battle Pass: The Game — engine. No DOM in here (the Node test harness runs it, as in AFK Factory).
// Save / load / offline / main loop follow Click to Conquer Beta 0.5.x.
const SAVE_KEY = CONFIG.saveKey;
const SCHEMA = 1;

// ---------- Formatting (shared with Click to Conquer) ----------
const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n);
  if (n < 1000) return n < 10 && n !== Math.floor(n) ? n.toFixed(1) : Math.floor(n).toString();
  const tier = Math.floor(Math.log10(n) / 3);
  if (tier < SUFFIXES.length) { const sc = n / Math.pow(10, tier * 3); return sc.toFixed(sc < 10 ? 2 : sc < 100 ? 1 : 0) + SUFFIXES[tier]; }
  return n.toExponential(2).replace('+', '');
}
function money(n) { return '$' + (n < 100 && n !== Math.floor(n) ? n.toFixed(2) : fmt(n)); }
function pct(x, d = 0) { return (x * 100).toFixed(d) + '%'; }
function fmtTime(sec) {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h) return `${h}h ${m}m`; if (m) return `${m}m ${s}s`; return `${s}s`;
}
function clock(sec) { sec = Math.max(0, Math.ceil(sec)); const p = n => String(n).padStart(2, '0'); return `${p(Math.floor(sec / 3600))}:${p(Math.floor(sec % 3600 / 60))}:${p(sec % 60)}`; }

// ---------- lookups ----------
const byId = list => Object.fromEntries(list.map(x => [x.id, x]));
const CH = byId(CONFIG.channels), FT = byId(CONFIG.features), GW = byId(CONFIG.goodwill), UP = byId(CONFIG.upgrades),
  RS = byId(CONFIG.research), GM = byId(CONFIG.games), BD = byId(CONFIG.board), BO = byId(CONFIG.boosters), CO = byId(CONFIG.cosmetics);
const C0 = CONFIG.core, PS = CONFIG.pass;

// ---------- RNG (Math.random by default; tests can seed it) ----------
let rand = Math.random;
function seedRandom(seed) { let s = seed >>> 0; rand = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hashRand(n) { let t = (n * 2654435761) >>> 0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const pick = arr => arr[Math.floor(rand() * arr.length)];

// ---------- State ----------
function freshMeta() {
  return {
    sequel: 1, sc: 0, scTotal: 0, board: {}, tut: 0, studio: '', vip: 0, cosmetics: {}, achievements: {},
    cur: { coins: 0, gems: 0, crystals: 0, platinum: 0, stars: 0, sstars: 0, season: 0, event: 0, founder: 0 },
    daily: { streak: 0, last: '' }, lifetime: 0, bestStage: 1,
    stats: { whales: 0, offerRuns: {}, taps: 0, adTaps: 0, replies: 0, patches: 0, bombs: 0, trades: 0, chests: 0, boxes: 0, popups: 0, seasons: 0, claims: 0, panders: 0, pizzas: 0, layoffs: 0, saleRuns: 0, subathons: 0, incidents: 0, fixes: 0 },
  };
}
const TR0 = () => CONFIG.triangle;
function freshRun(meta) {
  const m = meta || freshMeta(), r = {
    // the three resources of the triangle (plus players, who are the point of all three)
    code: 0, bugs: TR0().bugs.start, sale: { off: 0, until: 0, cd: 0, ended: true }, saleFatigue: 0, cash: CONFIG.startCash * Math.pow(10, boardRankOf(m, 'parachute')), acct: false, rep: C0.startRep, players: 0,
    adLoad: 0, trust: 1, replyBuf: 0, unpaid: false, autoAdAcc: 0, autoReplyAcc: 0,
    era: 1, dlcSold: 0, qa: 0, price: -1, f2p: false, peak: 0, sales: 0, bomb: null, nextBomb: 0, inc: null, nextInc: 0, incTab: '',
    live: { sub: 0, subCd: 0, drops: 0, dropsCd: 0, prize: '' }, videos: [], vodCd: {}, vodN: 0, // Streamly Live / ToobVOD // price = index into CONFIG.price.ladder; -1 = not on the store yet
    data: 0, life: 0, lifeCode: 0, lifeInstalls: 0, adImpressions: 0, stage: 1, scandal: 0,
    gf: {}, dev: {}, devs: 0, adNet: 0, cms: 0,
    ch: {}, ft: {}, devd: {}, aggr: {}, gw: {}, upg: {}, res: {}, games: {}, adChain: 0,
    boosts: {}, effects: [], event: null, nextEvent: CONFIG.events.firstAt, offers: [], popups: [], nextPopup: CONFIG.popups.gap, whale: null, nextWhaleCheck: 0, whaleCarry: 0,
    bp: { season: 1, level: 0, xp: 0, lanes: { free: true }, claimed: {}, done: 0, bppXp: 0, bpp: false, bppPlus: false, manager: false, claims: 0 },
    projects: [], staff: { mgr: 0, teams: 1 }, pizzaUntil: 0, pizzaReady: 0, pander: {}, delayed: [],
    t: 0,
  };
  r.staff.mgr = 3 * boardRankOf(m, 'rehire');
  const reuse = boardRankOf(m, 'reuse'); // "Reuse the Same Map": monetization features already shipped
  for (let i = 0; i < reuse && i < CONFIG.features.length; i++) { const f = CONFIG.features[i]; r.devd[f.id] = true; r.ft[f.id] = r.ft[f.id] || 0; }
  return r;
}
function freshState() {
  const meta = freshMeta();
  return { schema: SCHEMA, createdAt: Date.now(), lastTick: Date.now(), time: 0, meta, run: freshRun(meta),
    settings: { devSpeed: 1, sound: true, calm: false, buyAmt: 1, story: {} }, log: [] };
}
let S = freshState();
const R = () => S.run, MT = () => S.meta;
function boardRankOf(meta, id) { return (meta.board && meta.board[id]) || 0; }
function boardRank(id) { return boardRankOf(S.meta, id); }

// ---------- events for the UI ----------
const EVENTS = [];
function pushEvent(e) { EVENTS.push(e); if (EVENTS.length > 200) EVENTS.shift(); }
function log(msg) { S.log.unshift({ t: Date.now(), msg }); if (S.log.length > 60) S.log.length = 60; }

// ---------- stages ----------
function stageDef(n = R().stage) { return CONFIG.stages[Math.min(n, CONFIG.stages.length) - 1]; }
function nextStage() { return CONFIG.stages[R().stage] || null; }
function checkStage() {
  let up = false;
  while (nextStage() && R().peak >= nextStage().need) { R().stage++; up = true; S.meta.bestStage = Math.max(S.meta.bestStage, R().stage); log(`You are now a ${stageDef().name}!`); pushEvent({ who: 'stage', stage: R().stage }); }
  return up;
}
// the player's studio name (Alpha 0.0.5): 'Untitled Game Studio' until the naming quest
function studioBase() { return (S.meta.studio || '').trim() || CONFIG.studio.fallback; }
function studioInitials(name = studioBase()) { const w = name.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean); return w.length > 1 ? w.map(x => x[0].toUpperCase()).join('') : name; }
function studioName(n = R().stage) { return stageDef(n).company.replace('{N}', studioBase()).replace('{S}', studioInitials()); }
function setStudioName(raw) { const s = String(raw || '').replace(/[<>"&]/g, '').replace(/\s+/g, ' ').trim().slice(0, CONFIG.studio.maxLen); if (!s) return false; S.meta.studio = s; dirty(); log(`The studio is now called ${s}.`); pushEvent({ who: 'named', name: s }); return true; }
// previews for buy buttons (Alpha 0.0.8): what n more levels would add
function gfGain(id, n) { const g = GF[id], lv = R().gf[id] || 0; if (g.kind === 'fix') return fixGain(id, n); return g.q * ((lv + n) * milestoneMult(lv + n) - lv * milestoneMult(lv)) * mults().quality; }
function featureGain(id, n) { const lv = R().ft[id] || 0; return featureRate(id, lv + n) - featureRate(id, lv); }
function devGain(id, n) { const t = CONFIG.triangle.devTiers.find(x => x.id === id), lv = R().dev[id] || 0; return t.code * ((lv + n) * milestoneMult(lv + n) - lv * milestoneMult(lv)) * mults().code; }
function channelGain(id, n) { const lv = R().ch[id] || 0; return (channelRate(id, lv + n) - channelRate(id, lv)) * repInstallMult() * installMult() * (onStore() ? demand() : demand(0)); }
function gameTitle(n = S.meta.sequel) { const T = CONFIG.sequel.titles, t = T[Math.min(n - 1, T.length - 1)] + (n > T.length ? ` ${n - T.length + 1}` : ''), sub = n === S.meta.sequel && S.run ? eraDef().sub : ''; return t.replace('{T}', CONFIG.sequel.baseTitle) + (sub ? ': ' + sub : ''); }

// ---------- quests (Alpha 0.0.4): one at a time, to the first sequel; tut = quests completed. Kept in meta ----------
const TUT = CONFIG.tutorial, QI = Object.fromEntries(TUT.map((q, i) => [q.id, i]));
function tutDone(n) { return (S.meta.tut || 0) >= n; }
const NTUT = TUT.filter(q => !q.ms).length; // the tutorial; after it, milestones in sets per era (any order)
function questDone(id) { const q = TUT[QI[id]]; if (q && q.ms) return !!(S.meta.ms && S.meta.ms[id]); return (S.meta.tut || 0) > QI[id]; }
function msLeft(g) { return TUT.filter(q => q.ms === g && !(S.meta.ms || {})[q.id]); }
function msGroup() { if ((S.meta.tut || 0) < NTUT) return null; for (let g = 2; g <= 5; g++) if (msLeft(g).length) return g; return null; }
function tutStep() { if ((S.meta.tut || 0) < NTUT) return TUT[S.meta.tut || 0]; const g = msGroup(); if (!g) return null; const left = msLeft(g); return left.find(q => tutGoal(q).done) || left[0]; }
function tutGoal(st = tutStep()) {
  if (!st) return null; const r = R(), m = S.meta.stats, [g, id] = st.goal.split(':');
  const v = {
    taps: () => m.taps || 0, adTaps: () => m.adTaps || 0, replies: () => m.replies || 0, patches: () => m.patches || 0,
    gf: () => r.gf[id] || 0, devs: () => r.devs, dev: () => r.dev[id] || 0, players: () => r.peak, priced: () => (r.price >= 0 || r.f2p) ? 1 : 0,
    sales: () => r.sales, f2p: () => r.f2p ? 1 : 0, ft: () => (r.devd[id] ? r.ft[id] || 0 : 0) ? 2 : (r.devd[id] || r.projects.some(p => p.kind === 'epic' && p.id === id)) ? 1 : 0, ch: () => r.ch[id] || 0,
    stage: () => Math.max(r.stage, S.meta.bestStage || 1), stars: () => stars(), bombs: () => m.bombs || 0, upg: () => Object.keys(r.upg).length,
    mgr: () => r.staff.mgr, panders: () => m.panders || 0, teams: () => r.staff.teams, claims: () => m.claims || 0, rps: () => revenuePerSec(),
    p2w: () => p2wCount(), whales: () => m.whales || 0, offers: () => Object.values(m.offerRuns).reduce((a, b) => a + b, 0), seasons: () => m.seasons || 0,
    pizzas: () => m.pizzas || 0, sequel: () => S.meta.sequel, saleRuns: () => m.saleRuns || 0, dlcSold: () => Math.floor(r.dlcSold || 0), bugsUnder: () => (has('gamefeatures') && bugRatio() * 100 < st.need ? st.need : 0), incidents: () => m.incidents || 0, fixes: () => m.fixes || 0, qa: () => r.qa || 0, era: () => r.era || 1, videos: () => r.vodN || 0, subathons: () => m.subathons || 0, named: () => S.meta.studio ? 1 : 0, gw: () => r.gw[id] || 0, promos: () => m.promos || 0, acct: () => r.acct ? 1 : 0, cms: () => r.cms,
  }[g];
  const have = v ? v() : 0;
  if (g === 'ft') { const shipped = !!r.devd[id], label = have >= 2 ? 'Done' : have === 1 ? (shipped ? 'Step 2 of 2: shipped! Give it its first level' : 'Step 2 of 2: the team is building it, then give it its first level') : 'Step 1 of 2: create the epic (costs code)'; return { have: Math.min(have, 2), need: 2, done: have >= 2, label }; }
  return { have: Math.min(have, st.need), need: st.need, done: have >= st.need };
}
function tutCheck() { // one quest at a time, and only after it has been on screen long enough to read (CONFIG.questMinSecs)
  let n = 0; if (S.meta.tutAt == null) S.meta.tutAt = S.time;
  const t = S.meta.tut || 0;
  if (t < NTUT) { const st = TUT[t]; if (tutGoal(st).done && S.time - S.meta.tutAt >= (CONFIG.questMinSecs || 0)) { S.meta.tut = t + 1; S.meta.tutAt = S.time; dirty(); pushEvent({ who: 'tut', step: st, next: tutStep() }); return 1; } return 0; }
  S.meta.ms = S.meta.ms || {}; // milestones: any order within an era; one announced at a time
  if (S.time - S.meta.tutAt < 3) return 0;
  for (const q of TUT) if (q.ms && !S.meta.ms[q.id] && q.ms <= (R().era || 1) && tutGoal(q).done) { S.meta.ms[q.id] = true; S.meta.tutAt = S.time; dirty(); pushEvent({ who: 'ms', step: q, left: msLeft(q.ms).length, next: tutStep() }); return 1; }
  return 0;
  return n;
}
function skipTutorial() { S.meta.tut = NTUT; S.meta.ms = Object.fromEntries(TUT.filter(q => q.ms).map(q => [q.id, true])); dirty(); pushEvent({ who: 'tut', done: TUT.length, step: TUT[TUT.length - 1], skipped: true }); }

// ---------- unlocks ----------
function has(k) {
  const r = R(), q = questDone, e = r.era || 1;
  switch (k) {
    // the single-player era: the tutorial opens one thing per quest
    case 'gamefeatures': return q('code');
    case 'content': return q('bug1');
    case 'hiring': return q('quest1');
    case 'finance': case 'store': return q('name');
    case 'reputation': return q('bug1');
    case 'promote': return q('price');
    case 'advertising': return q('sell10');
    case 'sales': return q('p100');
    case 'senior': return q('sale');
    case 'community': case 'streamers': return q('k1');
    case 'bombs': return q('reply');
    case 'accountant': return q('bomb1');
    case 'dlc': return q('acct');
    case 'incidents': return q('area');
    case 'relaunch': return q('acct') || e > 1; // 0.1.1: not behind the quest card
    case 'qa': return q('dlc100');
    // co-op
    case 'ads': case 'monetize': case 'adnetwork': return e >= 2;
    case 'cms': case 'vod': case 'stats': return e >= 2;
    // online
    case 'live': case 'pander': case 'staff': case 'decisions': return e >= 3;
    // free-to-play
    case 'f2p': return e >= 4 || r.f2p;
    case 'shop': case 'p2w': return r.f2p;
    case 'whales': case 'offers': return e >= 4;
    case 'pass': return !!r.devd.bpass;
    case 'adstudio': return !!r.upg.u_adstudio;
    // mobile
    case 'board': return S.meta.scTotal > 0 || e >= 5;
    // folded into incidents (0.1.0): the old random events. Parked: currencies, loot box collection, VIP, daily, Data/Research, popups, Portfolio
    case 'events': case 'currencies': case 'lootbox': case 'vip': case 'daily': case 'data': case 'popups': case 'portfolio': return false;
  }
  return false;
}
// ---------- eras (Alpha 0.1.0): single-player → co-op → online → free-to-play → mobile ----------
const ERAS = CONFIG.eras;
function eraDef(n = R().era || 1) { return ERAS[Math.min(n, ERAS.length) - 1]; }
function nextEraDef() { return ERAS[R().era || 1] || null; }
function canRelaunch() { const r = R(); return has('relaunch') && !!nextEraDef() && r.peak >= eraDef().next; }
function relaunch() {
  if (!canRelaunch()) return false; const r = R(); r.era = (r.era || 1) + 1;
  r.scandal += CONFIG.relaunchScandal;
  if (r.era === 4 && !r.f2p) { r.f2p = true; r.price = -1; r.sale = { off: 0, until: 0, cd: 0, ended: true }; }
  dirty(); log(`Relaunched as ${gameTitle()}.`); pushEvent({ who: 'era', era: r.era }); return true;
}

// ---------- multipliers ----------
let MC = null, MCt = -1; // cached per tick
function addEff(M, eff, k = 1) {
  for (const key in eff) {
    const v = eff[key];
    if (key === 'rep') M.repBonus += v * k;
    else if (key.includes(':')) { const [a, b] = key.split(':'); M[a][b] = (M[a][b] || 1) * Math.pow(v, k); }
    else M[key] = (M[key] || 1) * Math.pow(v, k);
  }
}
function mults() {
  if (MC && MCt === S.time) return MC;
  const r = R(), m = S.meta;
  const M = { rev: 1, inst: 1, code: 1, codeTap: 1, adTap: 1, reply: 1, quality: 1, churn: 1, data: 1, bpxp: 1, ad: 1, coin: 1, whale: 1, offers: 1, popups: 1, daily: 1, ch: {}, ft: {}, seg: {}, repBonus: 0, eng: 1 };
  for (const id in r.upg) if (r.upg[id] && UP[id]) addEff(M, UP[id].eff);
  for (const id in r.res) if (r.res[id] && RS[id]) addEff(M, RS[id].eff);
  for (const id in r.games) { const g = GM[id], lv = r.games[id] || 0; if (!g || !lv) continue;
    if (g.eff === 'churn') M.churn *= Math.pow(1 - g.per, lv);
    else if (g.eff.includes(':')) { const [a, b] = g.eff.split(':'); M[a][b] = (M[a][b] || 1) * (1 + g.per * lv); }
    else M[g.eff] *= 1 + g.per * lv; }
  for (const id in m.board) { const b = BD[id], rk = m.board[id] || 0; if (!b || !rk) continue;
    if (b.eff === 'rep') M.repBonus += b.per * rk;
    else if (b.eff === 'reuse' || b.eff === 'start' || b.eff === 'rehire') continue;
    else if (b.eff.includes(':')) { const [a, c] = b.eff.split(':'); M[a][c] = (M[a][c] || 1) * (1 + b.per * rk); }
    else M[b.eff] *= 1 + b.per * rk; }
  const cos = {}; for (const id in m.cosmetics) { const c = CO[id]; if (c && m.cosmetics[id]) cos[c.eff] = (cos[c.eff] || 0) + c.per; }
  for (const k in cos) M[k] *= 1 + cos[k];
  M.rev *= 1 + CONFIG.achievementBonus * Object.keys(m.achievements).length;
  M.rev *= 1 + CONFIG.vip.rev * m.vip; M.whale *= 1 + CONFIG.vip.whale * m.vip;
  if (m.vip >= CONFIG.vip.bpxpAt) M.bpxp *= 1.25;
  const sc = 1 + CONFIG.sequel.perSC * m.scTotal; M.rev *= sc; M.code *= sc; M.inst *= 1 + CONFIG.sequel.perSCInst * m.scTotal;
  M.rev *= (1 + PS.seasonBonus * r.bp.done) * (1 + PS.levelBonus * r.bp.claims);
  M.bpxp *= 1 + PS.bppPerLevel * bppLevel();
  M.code *= 1 + TR.mgrDevBoost * r.staff.mgr;
  for (const id in r.boosts) if (r.boosts[id] > S.time) { const b = BO[id]; if (b && b.eff) M[b.eff] *= b.mult; }
  for (const e of r.effects) if (e.until > S.time) { if (e.inst) M.inst *= e.inst; if (e.eng) M.code *= e.eng; if (e.rev) M.rev *= e.rev; }
  const fx = incFx(); if (fx) { if (fx.inst != null) M.inst *= fx.inst; if (fx.code != null) M.code *= fx.code; if (fx.churn != null) M.churn *= fx.churn; if (fx.ad != null) M.ad *= fx.ad; if (fx.rev != null) M.rev *= fx.rev; }
  MC = M; MCt = S.time; return M;
}
function dirty() { MC = null; }

// ---------- leveled-purchase math (geometric) ----------
function costFor(base, growth, lv, n) { return base * Math.pow(growth, lv) * (Math.pow(growth, n) - 1) / (growth - 1); }
function maxAfford(base, growth, lv, cash) { if (cash < base * Math.pow(growth, lv)) return 0; return Math.max(1, Math.floor(Math.log(cash * (growth - 1) / (base * Math.pow(growth, lv)) + 1) / Math.log(growth))); }
function buyCount(base, growth, lv, cash, amt) { if (amt === 'max') return Math.max(1, maxAfford(base, growth, lv, cash)); if (amt === 'next') { const ms = C0.milestones.find(x => x > lv); return ms ? ms - lv : 1; } return amt; }
function milestoneMult(lv) { let k = 0; for (const x of C0.milestones) if (lv >= x) k++; return Math.pow(C0.milestoneMult, k); }
function nextMilestone(lv) { return C0.milestones.find(x => x > lv) || null; }

// ---------- the triangle (Alpha 0.6.0) ----------
// Development makes Quality (spending Code). Finance makes Revenue (ads cost Ad Load). Community makes Reputation
// (replies need trust, and trust comes back only when you ship a patch). Players expect more as there are more of them.
const TR = CONFIG.triangle, GF = byId(CONFIG.gameFeatures);
function quality() { const r = R(); let q = TR.quality.start; for (const g of CONFIG.gameFeatures) if (g.kind !== 'fix') q += g.q * (r.gf[g.id] || 0) * milestoneMult(r.gf[g.id] || 0); return q * mults().quality; }
function expectations(p = R().players) { const Q = TR.quality; return Q.expectBase * Math.pow(1 + p / Q.expectScale, Q.expectExp); }
// ---------- bugs (Alpha 0.0.18): content adds them, players find them, fixes remove a share ----------
const isFix = id => GF[id] && GF[id].kind === 'fix';
function fixGain(id, n = 1) { const g = GF[id], B = TR.bugs; let b = R().bugs; for (let k = 0; k < n; k++) b -= Math.min(b, Math.max(B.minFix, g.fix * b)); return R().bugs - b; } // bugs removed by n fixes
function bugRatio() { return R().bugs / Math.max(1, quality()); }
function bugPenalty() { const B = TR.bugs; return Math.min(B.repMax, B.rep * bugRatio()); }
function bugChurn() { return 1 + TR.bugs.churn * Math.min(1, bugRatio()); }
function qualityTerm() { const Q = TR.quality; return Math.max(Q.min, Math.min(Q.max, Q.weight * Math.log2(quality() / expectations()))); }
function paidAdMult() { return R().f2p ? 1 : CONFIG.paidAds.ratingMult; } // ads in a game people paid for: players are twice as angry
function adPenalty(load = R().adLoad) { const A = TR.ad; return A.penalty * Math.log2(1 + load / A.penaltyScale) * paidAdMult(); }
function replyTerm() { return Math.min(TR.reply.cap, R().replyBuf); }

// ---------- reputation (shown as a store rating, 1–5 ★) ----------
function stars(rep = R().rep) { return Math.max(1, Math.min(5, 1 + 4 * rep / 100)); }
function repInstallMult(rep = R().rep) { return 0.15 + 1.45 * rep / 100; } // 1★ ×0.15 · 3★ ×0.88 · 5★ ×1.6
function repChurnMult(rep = R().rep) { return 1.6 - 1.0 * rep / 100; }      // 1★ ×1.6 · 3★ ×1.1 · 5★ ×0.6
function featurePressure(id) { const f = FT[id], lv = R().ft[id] || 0; if (!R().devd[id] || !lv) return 0; return f.pressure * (1 + 0.15 * Math.log2(1 + lv)) * (R().aggr[id] ? 3 : 1) * (f.ad ? paidAdMult() : 1); } // stocking an item costs its pressure; levels add a little (×1.85 at level 50)
function channelPressure(id) { const c = CH[id], lv = R().ch[id] || 0; if (!c.pressure || !lv) return 0; return c.pressure * Math.log2(1 + lv); }
function goodwillCap() { const g = C0.goodwillMax; return Array.isArray(g) ? g[Math.min(g.length, R().era || 1) - 1] : (g || Infinity); }
function goodwillGain(id) { return GW[id].gain * Math.log2(1 + (R().gw[id] || 0)); }
function p2wCount() { const r = R(); return CONFIG.features.filter(f => f.shelf === 'p2w' && r.devd[f.id] && (r.ft[f.id] || 0) > 0).length; }
function p2wPenalty(n = p2wCount()) { const H = CONFIG.shop; return n ? H.p2wRep * Math.pow(n, H.p2wExp) : 0; }
function bombHit() { const b = R().bomb; return b ? b.applied : 0; }
function repParts() {
  let pressure = 0, good = 0;
  for (const f of CONFIG.features) pressure += featurePressure(f.id);
  for (const c of CONFIG.channels) pressure += channelPressure(c.id);
  for (const g of CONFIG.goodwill) good += goodwillGain(g.id);
  good = Math.min(goodwillCap(), good); // 0.1.1: capped by era
  return { base: TR.repBase, quality: qualityTerm(), replies: replyTerm(), good, bonus: mults().repBonus, ads: adPenalty(), pressure, p2w: p2wPenalty(), videos: videoRepPenalty(), incident: incFxKey('rep', 0), bugs: bugPenalty(), scandal: Math.max(-PR.goodPressMax, R().scandal) };
}
function repTarget() { const p = repParts(); return Math.max(0, Math.min(100, p.base + p.quality + p.replies + p.good + p.bonus - p.ads - p.pressure - p.p2w - p.videos - p.incident - p.bugs - p.scandal)); }

// ---------- rates ----------
function segShare(seg) { if (seg === 'all') return 1; return Math.min(0.25, C0.shares[seg] * (mults().seg[seg] || 1)); }
function segFactor(seg) { return seg === 'all' ? 1 : segShare(seg) / C0.shares[seg]; }
function segments() { const p = R().players, m = segShare('minnow'), d = segShare('dolphin'), w = segShare('whale'); return { free: p * (1 - m - d - w), minnow: p * m, dolphin: p * d, whale: p * w }; }
function channelRate(id, lvAt) { // installs/s before multipliers. Streamers care about your rating; paid ads don't. lvAt: rate at another level (for previews)
  const c = CH[id], lv = lvAt != null ? lvAt : R().ch[id] || 0; if (!lv) return 0;
  const base = lv * c.base * milestoneMult(lv) * (mults().ch[id] || 1);
  return c.tab === 'community' ? base * Math.pow(stars() / 3, 2) : base;
}
// ---------- players (Alpha 0.0.4): installs = (store browsers + word of mouth + marketing + streamers) × price demand × rating ----------
const PR = CONFIG.price;
function onStore() { const r = R(); return r.f2p || r.price >= 0; }
function priceNow() { const r = R(); return r.f2p || r.price < 0 ? 0 : PR.ladder[r.price].p * saleMult(); }
// ---------- sales (Alpha 0.0.18): a lower price for a few minutes, a burst of installs, and players learn to wait ----------
function saleOn() { const r = R(); return !r.f2p && r.price >= 0 && r.sale.until > S.time; }
function saleMult() { return saleOn() ? 1 - R().sale.off : 1; }
function saleBoost(off) { const L = PR.sale; return Math.pow(1 / (1 - off), L.elastic) * L.hype; }
function saleLeft() { return saleOn() ? R().sale.until - S.time : 0; }
function saleReadyIn() { return Math.max(0, R().sale.cd - S.time); }
function canSale(k) { const r = R(); return !!PR.sale.options[k] && has('store') && !r.f2p && r.price >= 0 && !saleOn() && !saleReadyIn(); }
function startSale(k) {
  if (!canSale(k)) return false; const r = R(), o = PR.sale.options[k], L = PR.sale;
  r.sale = { off: o.off, until: S.time + o.secs, cd: S.time + o.secs + L.cooldown, ended: false }; r.saleFatigue = Math.min(L.fatigueMax, r.saleFatigue + L.fatigue * o.off / 0.5); // deeper discounts teach players to wait more
  S.meta.stats.saleRuns = (S.meta.stats.saleRuns || 0) + 1; dirty(); log(`On sale: ${Math.round(o.off * 100)}% off.`); pushEvent({ who: 'sale0', off: o.off, secs: o.secs }); return true;
}
function salePreview(k) { const r = R(), o = PR.sale.options[k], base = PR.ladder[r.price], inst = interestPerSec() * base.d * Math.pow(stars() / 3, r.price + 1) * saleBoost(o.off) * marketLeft(); return { price: base.p * (1 - o.off), inst, money: inst * base.p * (1 - o.off) }; }
function demand(i = R().price) { // share of interested people who install at this price
  if (R().f2p) return 1; if (i < 0) return 0;
  const r = R(), base = PR.ladder[i].d * Math.pow(stars() / 3, i + 1);
  return i === r.price && saleOn() ? base * saleBoost(r.sale.off) : base * (1 - r.saleFatigue); // on sale: a burst · off sale: some players wait for the next one
}
function womRate() { const r = R(); return PR.womSqrt * Math.sqrt(r.players); }
function installMult() { return mults().inst; }
function baseInterest() { let s = PR.storeBase + womRate(); for (const c of CONFIG.channels) s += channelRate(c.id); return s; }
function interestPerSec() { return (baseInterest() + videoInstalls()) * repInstallMult() * installMult() * liveBoost() * (eraDef().inst || 1); } // each era reaches a bigger audience
// ---------- Streamly Live: subathons and drops (bursts) ----------
const LV = CONFIG.live, VD = CONFIG.vod; const LVD = k => LV[k === 'sub' ? 'subathon' : k]; // run keys: sub, drops
const liveOn = k => R().live[k] > S.time;
function liveBoost() { return (liveOn('sub') ? LV.subathon.boost * Math.max(0.5, stars() / 3) : 1) * (liveOn('drops') ? LV.drops.boost : 1); }
function liveCost(k) { const d = LVD(k); return Math.max(d.costFloor, d.costSecs * (d.codeCost ? devCodePerSec() : revenuePerSec())); }
function liveReadyIn(k) { return Math.max(0, R().live[k + 'Cd'] - S.time); }
function canLive(k) { const r = R(), d = LVD(k); return has('live') && !liveOn(k) && !liveReadyIn(k) && (d.codeCost ? r.code : r.cash) >= liveCost(k); }
function startLive(k) {
  if (!canLive(k)) return false; const r = R(), d = LVD(k), c = liveCost(k);
  if (d.codeCost) r.code -= c; else r.cash -= c;
  r.live[k] = S.time + d.secs; r.live[k + 'Cd'] = S.time + d.secs + d.cooldown;
  if (k === 'drops') r.live.prize = pick(d.prizes); else S.meta.stats.subathons = (S.meta.stats.subathons || 0) + 1;
  dirty(); log(`${d.name} started.`); pushEvent({ who: 'live', k, prize: r.live.prize }); return true;
}
function tickLive() { const r = R(); if (r.live.prize && r.live.drops <= S.time) { r.scandal += LV.drops.backlash; pushEvent({ who: 'dropsEnd', prize: r.live.prize }); r.live.prize = ''; } }
// ---------- ToobVOD: videos stay up; their verdict is your rating on upload day ----------
const VV = byId(VD.videos);
function videoSentiment(v) { return Math.max(-2, Math.min(2, (v.stars - 3) / ((VD.good - VD.bad) / 2))); } // +1 at 3.5★, −1 at 2.5★
function videoWeight(v) { return Math.exp(-(S.time - v.at) / VD.tau); }
function videoInstalls() { let s = 0; for (const v of R().videos) s += v.base * videoWeight(v) * Math.max(0, videoSentiment(v)); return s; }
function videoRepPenalty() { let s = 0; for (const v of R().videos) s += VD.repPerReach * v.reach * videoWeight(v) * Math.max(0, -videoSentiment(v)); return Math.min(VD.penMax || Infinity, s); } // capped: an AFK player's pile of scam videos can't sink the game
function videoCost(id) { const d = VV[id]; return Math.max(d.costFloor, d.costSecs * (d.codeCost ? devCodePerSec() : revenuePerSec())); }
function videoReadyIn(id) { return Math.max(0, (R().vodCd[id] || 0) - S.time); }
function canVideo(id) { const r = R(), d = VV[id]; return !!d && has('vod') && (r.era || 1) >= (d.era || 1) && !videoReadyIn(id) && (d.codeCost ? r.code : r.cash) >= videoCost(id); }
function addVideo(v) { const r = R(); r.videos.unshift(v); r.videos = r.videos.filter(x => videoWeight(x) > 0.03).slice(0, 10); dirty(); pushEvent({ who: 'video', v }); }
function postVideo(id) {
  if (!canVideo(id)) return false; const r = R(), d = VV[id], c = videoCost(id);
  if (d.codeCost) r.code -= c; else r.cash -= c;
  r.vodCd[id] = S.time + d.cooldown; r.vodN++;
  addVideo({ id, title: pick(d.titles).replace('{n}', r.vodN).replace('{game}', gameTitle()), at: S.time, stars: stars(), reach: d.reach, base: d.reach * baseInterest() });
  log(`Posted on ToobVOD: ${r.videos[0].title}`); return true;
}
function scamVideo() { addVideo({ id: 'scam', title: pick(VD.scamTitles).replace('{game}', gameTitle()), at: S.time, stars: 1.5, reach: VD.scamReach, base: 0 }); }
function marketLeft() { return Math.max(0, 1 - R().players / eraDef().market); } // each era has its own audience
function installsPerSec() { return onStore() ? interestPerSec() * demand() * marketLeft() : 0; }
function installsAt(i) { return onStore() || i >= 0 ? interestPerSec() * demand(i) : 0; }
function salesPerSec() { return installsPerSec() * priceNow() * incFxKey('sales', 1); }
function setPrice(i) { const r = R(); if (r.f2p || !has('store') || !PR.ladder[i]) return false; const was = r.price; r.price = i; dirty();
  if (was >= 0 && i > was) r.scandal += 4 * (i - was); // players remember the old price
  log(`Price set to ${PR.ladder[i].label}.`); pushEvent({ who: 'price', i, was }); return true; }
function goF2P() { const r = R(); if (r.f2p || (r.era || 1) !== 3) return false; return relaunch(); } // free-to-play is the era 4 relaunch
function retentionMult() { const r = R(); let m = 1; for (const f of CONFIG.features) if (f.retain && r.devd[f.id] && (r.ft[f.id] || 0) > 0 && (f.id !== 'bpass' || !seasonDone())) m *= f.retain; return m; }
function priceKeep(i = R().price) { return R().f2p || i < 0 ? 1 : PR.ladder[i].keep; } // pricier copies, longer stays
function churnRate(i = R().price) { return C0.baseChurn * mults().churn * repChurnMult() * retentionMult() * (R().f2p ? 1 : CONFIG.paidChurn * priceKeep(i)) * (liveOn('drops') ? LV.drops.keep : 1) * bugChurn(); }
function settlesAtPrice(i) { return installsAt(i) / churnRate(i); } // where players would settle at that price
function settlesAt() { return installsPerSec() / churnRate(); }
function laneCount() { return Object.keys(R().bp.lanes).filter(k => R().bp.lanes[k]).length; }
function shopFactor() { return Math.pow((stars() - 1) / 3, CONFIG.shop.ratingPow); } // 1 at 4★, 0.33 at 2★, 1.33 at 5★
function featureRate(id, lvAt) { // $/s from a monetization feature; lvAt: the rate at another level (for previews)
  const f = FT[id], r = R(), lv = lvAt != null ? lvAt : r.ft[id] || 0; if (!r.devd[id] || !lv) return 0;
  const M = mults();
  let v = lv * f.rate * r.players * segFactor(f.seg) * milestoneMult(lv) * (M.ft[id] || 1);
  if (f.ad) v *= M.ad; else v *= shopFactor();
  if (id === 'bpass') v *= Math.pow(PS.laneRevMult, laneCount() - 1);
  if (r.aggr[id]) v *= 2;
  return v * M.rev;
}
function shelfRevenue(shelf) { let s = 0; for (const f of CONFIG.features) if (f.shelf === shelf) s += featureRate(f.id); return s; }
function featureRevenuePerSec() { let s = 0; for (const f of CONFIG.features) s += featureRate(f.id); return s; }
function adsInGamePerSec() { const r = R(); return has('ads') ? r.adLoad * r.players * CONFIG.ads.perLoad * mults().ad * mults().rev : 0; } // ads already in the game pay while they last
function adIncomePerSec() { return adsInGamePerSec() + shelfRevenue('ads'); }
function adTapValue() { const T = CONFIG.tapBurst; return Math.max(T.adFloor, T.adSecs * adIncomePerSec()) * mults().adTap; } // a tap = 2 s of all your ad income
function autoAdsPerSec() { return R().adNet * TR.adNetwork.adsPerSec; }
function revenuePerSec() { return salesPerSec() + featureRevenuePerSec() + adsInGamePerSec(); }
const DT = byId(CONFIG.triangle.devTiers);
function tierPayroll(id, n = R().dev[id] || 0) { const g = TR.salaryGrowth; return DT[id].salary * (Math.pow(g, n) - 1) / (g - 1); }
function qaPayroll(n = R().qa || 0) { const Q = TR.qa; return Q.salary * (Math.pow(Q.salaryGrowth, n) - 1) / (Q.salaryGrowth - 1); }
function payrollPerSec() { let s = qaPayroll(); for (const t of TR.devTiers) s += tierPayroll(t.id); return s; }
function qaCost() { const Q = TR.qa; return Q.cost * Math.pow(Q.growth, R().qa || 0); }
function qaFixPerSec() { return R().unpaid ? 0 : (R().qa || 0) * TR.qa.fix; } // share of bugs fixed per second
function hireQA() { const r = R(); if (!has('qa') || r.cash < qaCost()) return false; r.cash -= qaCost(); r.qa = (r.qa || 0) + 1; dirty(); log('Hired a QA tester.'); return true; }
function tierCode(id) { const lv = R().dev[id] || 0; return lv * DT[id].code * milestoneMult(lv); }
function devCodePerSec() { if (R().unpaid) return 0; let s = 0; for (const t of TR.devTiers) s += tierCode(t.id); return s * mults().code; }
function codePerTap() { return Math.max(TR.codePerTap, CONFIG.tapBurst.codeSecs * devCodePerSec()) * mults().codeTap; } // a tap = 2 s of your developers
function replyPower() { return TR.reply.power * mults().reply * R().trust; }
function autoRepliesPerSec() { return R().cms * TR.cm.repliesPerSec; }
function netCashPerSec() { return revenuePerSec() - payrollPerSec(); } // expected, including sales (for planning)
function recurringPerSec() { return featureRevenuePerSec() + adsInGamePerSec(); } // money that arrives every second on its own: ads and the shop, never sales
function recurringNetPerSec() { return recurringPerSec() - payrollPerSec(); }
// "Engagement" now means players playing; Battle Pass XP, Coins and Data come from it.
function engagementPerSec() { return R().players * C0.engagementPerPlayer * mults().eng; }
function dataPerSec() { return has('data') ? R().players * C0.dataPerPlayer * mults().data : 0; }
function coinsPerSec() { return has('currencies') ? CONFIG.coinRate * Math.pow(engagementPerSec(), CONFIG.coinExp) * mults().coin : 0; }
function adImpressionsPerSec() { return R().players * 0.02 * Math.log2(1 + R().adLoad); }
function bpXpPerSec() { return has('pass') ? PS.xpFromEngagement * Math.pow(engagementPerSec(), PS.xpExp) * mults().bpxp : 0; }

// ---------- the three taps ----------
function tap() { // Write Code: Code to spend on the game, and the epic in progress moves along
  const r = R(), n = codePerTap(); r.code += n; r.lifeCode += n; S.meta.stats.taps++; incTap('code');
  const ep = r.projects.find(p => p.kind !== 'upg'); if (ep) { ep.t += TR.epicSecsPerCommit * teamSpeed(); if (ep.t >= ep.total) tickProjects(0); }
  dirty(); return n;
}
function promoteGain() { return Math.max(CONFIG.promote.min, CONFIG.promote.secs * interestPerSec()) * demand() * marketLeft(); } // installs from one Promote tap
function promote() { // Promote the Game: the manual way to find players while the game is paid
  if (!has('promote') || !onStore()) return 0; const r = R(), g = promoteGain();
  r.players += g; r.lifeInstalls += g; r.peak = Math.max(r.peak, r.players); S.meta.stats.promos = (S.meta.stats.promos || 0) + 1;
  if (!r.f2p && r.price >= 0) r.saleAcc = (r.saleAcc || 0) + g; // the copies they buy are paid out by the sales tick
  incTap('fin');
  dirty(); return g;
}
function hireAccountant() { const r = R(); if (!has('accountant') || r.acct || r.cash < CONFIG.accountant.cost) return false; r.cash -= CONFIG.accountant.cost; r.acct = true; dirty(); log('Hired an accountant.'); pushEvent({ who: 'acct', runway: runway() }); return true; }
function runway() { const net = netCashPerSec(); return net >= 0 ? Infinity : R().cash / -net; } // seconds until the money runs out
function placeAd(auto = false) { // Put Ad in Game: money now, Ad Load (players hate it) for a while
  if (!has('ads')) return 0; const r = R(), g = auto ? 0 : adTapValue(); if (g) earn(g); r.adLoad += TR.ad.loadPerAd; if (!auto) { S.meta.stats.adTaps++; incTap('fin'); } r.adImpressions += Math.max(1, r.players * 0.5); dirty(); return g;
}
function reply(auto = false) { // Respond to Online Comment: Reputation, less and less until you ship a patch
  if (!has('community')) return 0; const r = R(), g = replyPower(); r.replyBuf += g; r.trust = Math.max(TR.reply.trustMin, r.trust * TR.reply.trustLoss); if (!auto) { S.meta.stats.replies++; incTap('reply'); }
  if (r.bomb && !r.bomb.done) { r.bomb.def += g; if (r.bomb.def >= r.bomb.need) defuseBomb(); }
  if (!auto && liveOn('sub')) r.live.sub = Math.min(S.time + LV.subathon.maxSecs, r.live.sub + LV.subathon.perReply); // chat keeps the subathon going
  dirty(); return g;
}

// ---------- review bombs (Alpha 0.0.4): rating falls over a minute unless replies defuse it ----------
const BB = CONFIG.bomb;
function startBomb(reason) {
  const r = R(); if (r.bomb && !r.bomb.done) return false; if (incActive()) return false; // one problem at a time
  r.inc = { id: 'bomb', at: S.time, prog: {}, done: false, until: 0 };
  r.bomb = { reason: reason || pick((BB.eraReasons && BB.eraReasons[r.era || 1]) || BB.reasons), at: S.time, until: S.time + BB.secs, hit: BB.hit, applied: 0, def: 0, need: BB.need, done: false };
  r.nextBomb = S.time + BB.minGap + rand() * (BB.maxGap - BB.minGap); dirty(); pushEvent({ who: 'bomb', reason: r.bomb.reason }); log(`Review bomb: ${r.bomb.reason}.`); return true;
}
function defuseBomb() { const r = R(), b = r.bomb; if (!b || b.done) return; b.done = 'defused'; r.scandal -= BB.defuseBonus; S.meta.stats.bombs = (S.meta.stats.bombs || 0) + 1; b.until = S.time + 4; dirty(); pushEvent({ who: 'bombDone', defused: true }); }
function tickBomb(dt) {
  const r = R();
  if (r.bomb) {
    const b = r.bomb;
    if (!b.done) { const step = Math.min(b.hit - b.applied, b.hit * dt / BB.secs); b.applied += step; r.scandal += step;
      if (S.time >= b.until) { b.done = 'landed'; b.until = S.time + 4; S.meta.stats.bombs = (S.meta.stats.bombs || 0) + 1; pushEvent({ who: 'bombDone', defused: false }); if (has('vod')) scamVideo(); } }
    else if (S.time >= b.until) r.bomb = null;
    if (r.inc && r.inc.id === 'bomb') { if (b.done && !r.inc.done) { r.inc.done = b.done; r.inc.until = b.until; scheduleInc(); } if (!r.bomb) r.inc = null; }
  }
}
// ---------- incidents (Alpha 0.0.16): one problem at a time, on one tab, every 2–4 minutes; they last until you fix them ----------
const IN = CONFIG.incidents, INC = byId(IN.list);
function incDef(id) { return INC[id]; }
function incActive() { const i = R().inc; return !!(i && !i.done); }
function incFx() { const i = R().inc; return i && !i.done && INC[i.id] && INC[i.id].fx || null; }
function incFxKey(k, dflt) { const fx = incFx(); return fx && fx[k] != null ? fx[k] : dflt; }
function scheduleInc() { const r = R(), g = r.t < IN.earlyUntil ? IN.gapEarly : IN.gap; r.nextInc = S.time + g[0] + rand() * (g[1] - g[0]); }
function incTapScale() { return IN.tapScale[R().stage] || 1; } // early incidents ask for fewer taps
function incNeed(d) { const o = {}; for (const k in d.fix) o[k] = k === 'patch' ? d.fix[k] : Math.max(5, Math.round(d.fix[k] * incTapScale())); return o; }
function incReasons(d) { const e = R().era || 1; return (d.reasons || []).filter(x => !Array.isArray(x) || e >= x[1]).map(x => Array.isArray(x) ? x[0] : x); }
function incEligible(d) {
  const r = R(), e = r.era || 1;
  if (e < (d.era || 1) || (d.needCh && !(r.ch[d.needCh] > 0))) return false;
  if (d.bomb) return has('bombs');
  if (!incReasons(d).length) return false;
  switch (d.when) {
    case 'devs': return r.devs > 0;
    case 'patchable': return has('gamefeatures');
    case 'paid': return onStore() && !r.f2p;
    case 'ads': return has('ads') && (r.adLoad > 0.5 || adIncomePerSec() > 0);
    case 'streamers': return has('streamers');
  }
  return true;
}
function startIncident(id) {
  const r = R(); if (incActive() || (r.bomb && !r.bomb.done)) return false;
  let d = id ? INC[id] : null;
  if (!d) { const order = ['dev', 'fin', 'com'], start = (order.indexOf(r.incTab) + 1) % 3, good = rand() < IN.oppShare; let pool = []; // take turns: Development, Finance, Community
    for (const want of [good, !good]) { for (let j = 0; j < 3 && !pool.length; j++) { const t = order[(start + j) % 3]; pool = IN.list.filter(x => x.tab === t && !!x.good === want && incEligible(x)); } if (pool.length) break; }
    if (!pool.length) return false;
    let t = 0; for (const x of pool) t += x.w; let k = rand() * t; d = pool[pool.length - 1]; for (const x of pool) { k -= x.w; if (k <= 0) { d = x; break; } } }
  r.incTab = d.tab;
  if (d.bomb) return startBomb();
  r.inc = { id: d.id, reason: pick(incReasons(d)), at: S.time, prog: {}, need: incNeed(d), done: false, until: d.good ? S.time + IN.oppSecs : 0, queued: 0 };
  dirty(); log(`${d.name}: ${r.inc.reason}.`); pushEvent({ who: 'inc', id: d.id, reason: r.inc.reason, good: !!d.good }); return true;
}
function incTap(k, n = 1) {
  const r = R(), i = r.inc; if (!i || i.done) return; const d = INC[i.id], need = i.need || (d && d.fix); if (!d || !need || !need[k]) return;
  i.prog[k] = Math.min(need[k], (i.prog[k] || 0) + n);
  if (Object.keys(need).every(x => (i.prog[x] || 0) >= need[x])) fixIncident();
}
function incReward(d, i) { // what fixing it pays (Alpha 0.1.0): a fix is a win, not just a reset
  const r = R(), w = d.reward || {}; let got = {};
  if (w.players) { const p = installsPerSec() * w.players; r.players += p; r.lifeInstalls += p; r.peak = Math.max(r.peak, r.players); got.players = p; }
  if (w.codeSecs) { const c = Math.max(30, devCodePerSec() * w.codeSecs); r.code += c; r.lifeCode += c; got.code = c; }
  if (w.cashSecs) { const c = Math.max(50, revenuePerSec() * w.cashSecs); earn(c); got.cash = c; }
  if (w.queued && i.queued) { earn(i.queued); got.cash = (got.cash || 0) + i.queued; }
  if (w.press) r.scandal -= w.press;
  if (w.boost) r.effects.push({ id: d.id, until: S.time + w.boost.secs, inst: w.boost.inst });
  return got;
}
function fixIncident() {
  const r = R(), i = r.inc; if (!i || i.done) return false; const d = INC[i.id];
  if (d.bomb) return defuseBomb();
  i.done = 'fixed'; i.until = S.time + 5; if (!d.good) { r.scandal -= IN.fixBonus; S.meta.stats.incidents = (S.meta.stats.incidents || 0) + 1; }
  i.got = incReward(d, i); scheduleInc(); dirty(); log(`${d.good ? 'Made the most of' : 'Fixed'}: ${d.name}.`); pushEvent({ who: 'incDone', id: i.id, got: i.got, good: !!d.good }); return true;
}
function tickIncidents() {
  const r = R();
  r.effects = r.effects.filter(e => e.until > S.time);
  if (r.inc && r.inc.id !== 'bomb') {
    if (!r.inc.done && r.inc.until && S.time >= r.inc.until) { r.inc.done = 'missed'; r.inc.until = S.time + 4; scheduleInc(); pushEvent({ who: 'incMissed', id: r.inc.id }); } // an opportunity passes
    else if (r.inc.done && S.time >= r.inc.until) r.inc = null;
  }
  const st = tutStep();
  if (st && st.id === 'bomb1' && !r.inc && !(r.bomb && !r.bomb.done)) { if (!r.nextInc || r.nextInc > S.time + 40) r.nextInc = S.time + 20; if (S.time >= r.nextInc) { r.incTab = 'com'; startBomb(); return; } } // the quest asks for a review bomb
  if (!has('incidents')) return; // incidents start at 3,000 players (quest)
  if (st && st.id === 'outage' && !r.inc) { if (!r.nextInc || r.nextInc > S.time + 15) r.nextInc = S.time + 10; if (S.time >= r.nextInc) { startIncident('outage'); return; } } // the quest asks for an outage
  if (!r.nextInc) r.nextInc = S.time + IN.firstAt;
  if (!r.inc && S.time >= r.nextInc) { if (!startIncident()) scheduleInc(); }
}
function bombLeft() { const b = R().bomb; return b && !b.done ? Math.max(0, b.until - S.time) : 0; }

// ---------- Development: game features (each level is a patch) ----------
function gameFeatureVisible(id) { const g = GF[id], same = CONFIG.gameFeatures.filter(x => !!x.kind === !!g.kind), i = same.indexOf(g); if (!has('gamefeatures')) return false; if ((R().gf[id] || 0) > 0) return true; if (R().stage < (g.stage || 1) || (R().era || 1) < (g.era || 1) || (g.quest && !questDone(g.quest)) || (!g.kind && !has('content'))) return false; return i === 0 || (R().gf[same[i - 1].id] || 0) > 0; }
function gameFeatureCost(id, n = 1) { const g = GF[id]; return costFor(g.cost, TR.gfGrowth, R().gf[id] || 0, n); }
function buyGameFeature(id, amt = 1) {
  const g = GF[id]; if (!g || !gameFeatureVisible(id)) return 0; const r = R();
  const n = buyCount(g.cost, TR.gfGrowth, r.gf[id] || 0, r.code, amt), cost = gameFeatureCost(id, n);
  if (r.code < cost) return 0; if (g.kind === 'fix' && r.bugs < 0.5) return 0; // nothing to fix
  const gain = gfGain(id, n); r.code -= cost; r.gf[id] = (r.gf[id] || 0) + n;
  if (g.kind === 'fix') { r.bugs = Math.max(0, r.bugs - gain); S.meta.stats.fixes = (S.meta.stats.fixes || 0) + n; } else r.bugs += TR.bugs.perQ * gain;
  r.trust = 1; S.meta.stats.patches++; incTap('patch', n); dirty(); pushEvent({ who: 'patch', id, n }); return n; // shipping restores trust in your replies
}
// Hiring
function devTierVisible(id) { const i = TR.devTiers.findIndex(t => t.id === id), t = DT[id]; if (!has('hiring')) return false; if ((R().dev[id] || 0) > 0) return true; if (R().stage < t.stage || (R().era || 1) < (t.era || 1) || (id === 'sr' && !has('senior'))) return false; return i === 0 || (R().dev[TR.devTiers[i - 1].id] || 0) > 0; }
function devCost(id = 'jr', n = 1) { return costFor(DT[id].cost, TR.devGrowth, R().dev[id] || 0, n); }
function hireDev(id = 'jr', amt = 1) {
  if (!DT[id] || !devTierVisible(id)) return 0; const r = R();
  const n = buyCount(DT[id].cost, TR.devGrowth, r.dev[id] || 0, r.cash, amt), cost = devCost(id, n);
  if (r.cash < cost) return 0; r.cash -= cost; r.dev[id] = (r.dev[id] || 0) + n; r.devs += n; dirty(); return n;
}
function adNetCost() { return TR.adNetwork.cost * Math.pow(TR.adNetwork.growth, R().adNet); }
function buyAdNet() { if (!has('adnetwork') || R().cash < adNetCost()) return false; R().cash -= adNetCost(); R().adNet++; dirty(); return true; }
function cmCost() { return TR.cm.cost * Math.pow(TR.cm.growth, R().cms); }
function hireCM() { if (!has('cms') || R().cash < cmCost()) return false; R().cash -= cmCost(); R().cms++; dirty(); return true; }

// ---------- channels (Finance: paid advertising · Community: streamers & social) ----------
function channelVisible(id) { const c = CH[id]; return R().stage >= c.stage && (R().era || 1) >= (c.era || 1) && has(c.tab === 'community' ? 'streamers' : 'advertising'); }
function channelCost(id, n = 1) { const c = CH[id]; return costFor(c.cost, c.growth, R().ch[id] || 0, n); }
function buyChannel(id, amt = 1) {
  const c = CH[id]; if (!c || !channelVisible(id)) return 0;
  const n = buyCount(c.cost, c.growth, R().ch[id] || 0, R().cash, amt), cost = channelCost(id, n);
  if (R().cash < cost) return 0; R().cash -= cost; R().ch[id] = (R().ch[id] || 0) + n; dirty(); return n;
}
// ---------- Finance: monetization features (Code to build, Revenue every second, Reputation cost) ----------
function featureIndex(id) { return CONFIG.features.findIndex(f => f.id === id); }
const SHELF_OPEN = { dlc: 'dlc', ads: 'monetize', shop: 'shop', p2w: 'p2w' };
function shelfOpen(shelf) { return has(SHELF_OPEN[shelf]); }
function featureVisible(id) { const f = FT[id]; if (R().devd[id]) return true; if (!shelfOpen(f.shelf) || R().stage < f.stage || (R().era || 1) < (f.era || 1)) return false;
  const same = CONFIG.features.filter(x => x.shelf === f.shelf), i = same.indexOf(f); return i === 0 || !!R().devd[same[i - 1].id]; }
function nextFeature() { return CONFIG.features.find(f => !R().devd[f.id] && featureVisible(f.id)) || null; }
function canDevelop(id) { const f = FT[id]; return !!f && !R().devd[id] && !inProgress('epic', id) && freeTeams() > 0 && featureVisible(id) && R().code >= f.dev; }
function epicSecsFor(id) { const E = CONFIG.projects.epicSecs; return E[Math.min(featureIndex(id), E.length - 1)]; }
function develop(id) { if (!canDevelop(id)) return false; const f = FT[id]; R().code -= f.dev; startProject('epic', id, epicSecsFor(id)); log(`Created the ${f.name} epic.`); return true; }
function shipFeature(id) { R().devd[id] = true; R().ft[id] = R().ft[id] || 0; dirty(); log(`Shipped ${featureName(id)}.`); pushEvent({ who: 'develop', id }); if (id === 'gems') S.meta.cur.gems += 10; }
function featureCost(id, n = 1) { const f = FT[id]; return costFor(f.cost, f.growth, R().ft[id] || 0, n); }
function buyFeature(id, amt = 1) {
  const f = FT[id]; if (!f || !R().devd[id]) return 0; const before = R().ft[id] || 0;
  const n = buyCount(f.cost, f.growth, R().ft[id] || 0, R().code, amt), cost = featureCost(id, n);
  if (R().code < cost) return 0; R().code -= cost; R().ft[id] = (R().ft[id] || 0) + n; dirty();
  if (f.launch && R().players > 0) { const copies = Math.floor(R().players * f.launch.share * n * shopFactor()), g = copies * f.launch.price * mults().rev; if (g > 0) { earn(g); if (id === 'dlc') R().dlcSold = (R().dlcSold || 0) + copies; pushEvent({ who: 'launch', id, copies, gain: g }); } } // 0.1.1: a launch sells
  if (!before && f.shelf === 'p2w') { pushEvent({ who: 'p2w', id }); if (has('bombs') && rand() < CONFIG.bomb.p2wChance) startBomb(`Players found ${f.name} in the shop`); }
  return n;
}
function featureName(id) { const f = FT[id]; return f.adNames ? f.adNames[Math.min(R().adChain, f.adNames.length - 1)] : f.name; }
function toggleAggr(id) { if (!R().devd[id]) return false; R().aggr[id] = !R().aggr[id]; dirty(); return R().aggr[id]; }
// ---------- Community: goodwill programs ----------
function goodwillVisible(id) { return has('vod') && R().stage >= GW[id].stage; }
function goodwillCost(id) { const g = GW[id]; return g.cost * Math.pow(g.growth, R().gw[id] || 0); }
function buyGoodwill(id) { if (!goodwillVisible(id) || R().cash < goodwillCost(id)) return false; R().cash -= goodwillCost(id); R().gw[id] = (R().gw[id] || 0) + 1; return true; }

// ---------- upgrades / research / portfolio ----------
function upgradeVisible(id) { const u = UP[id]; return has('decisions') && R().stage >= u.stage && (!u.adChain || u.adChain <= R().adChain + 1); }
function canUpgrade(id) { const u = UP[id]; return !!u && !R().upg[id] && !inProgress('upg', id) && upgradeVisible(id) && R().cash >= u.cost; }
function buyUpgrade(id) { if (!canUpgrade(id)) return false; const u = UP[id]; R().cash -= u.cost; startProject('upg', id, CONFIG.projects.decisionSecs); return true; } // a corporate decision: paid now, signed off in a few seconds
function applyUpgrade(id) { const u = UP[id]; R().upg[id] = true; if (u.adChain) R().adChain = Math.max(R().adChain, u.adChain); dirty(); log(`Approved: ${u.name}.`); pushEvent({ who: 'upgrade', id }); }
function canResearch(id) { const x = RS[id]; return !!x && has('data') && !R().res[id] && R().data >= x.cost; }
function research(id) { if (!canResearch(id)) return false; R().data -= RS[id].cost; R().res[id] = true; dirty(); log(`Research done: ${RS[id].name}.`); return true; }
function gameCost(id) { const g = GM[id]; return g.cost * Math.pow(g.growth, R().games[id] || 0); }
function buyGame(id) { if (!has('portfolio') || R().cash < gameCost(id)) return false; R().cash -= gameCost(id); const was = R().games[id] || 0; R().games[id] = was + 1; dirty(); if (!was) log(`Acquired ${GM[id].name}.`); return true; }

// ---------- Battle Pass ----------
const BPL = PS.lanes;
function laneIndex(id) { return BPL.findIndex(l => l.id === id); }
function bpNeed(L = R().bp.level, s = R().bp.season) { return PS.xpBase * Math.pow(PS.xpGrowth, L) * Math.pow(PS.seasonGrowth, s - 1); }
function bpReward(season, lane, L) { // deterministic per (season, lane, level). Currencies are parked in 0.0.4: rewards are cash, bonuses or nothing
  const k = laneIndex(lane), x = hashRand(season * 7919 + k * 131 + L * 17);
  if (k === 0) {
    if (L % 5 === 0) return { kind: 'cash', secs: 60, label: 'Mystery Chest (60 s of revenue)', icon: '🧰' };
    if (x < 0.3) return { kind: 'nothing', label: 'Nothing', icon: '∅' };
    if (x < 0.45) return { kind: 'icon', label: 'Player Icon', icon: '🙂' };
    if (x < 0.55) return { kind: 'icon', label: 'Emote: Thumbs Up', icon: '👍' };
    return { kind: 'cash', secs: 10, label: '10 s of revenue', icon: '💵' };
  }
  if (L % 10 === 0 || x < 0.35) return { kind: 'bonus', label: '+1% Revenue', icon: '📈', bonus: true };
  if (x < 0.55) return { kind: 'icon', label: ['Gold Profile Border', 'Spray: "gg ez"', 'Banner: Season Veteran', 'Sparkle Trail'][Math.floor(x * 100) % 4], icon: '✨', bonus: true };
  return { kind: 'cash', secs: 20 * k, label: `${20 * k} s of revenue`, icon: '💰', bonus: true };
}
function bpClaimed(lane, L) { return !!(R().bp.claimed[lane] && R().bp.claimed[lane][L]); }
function canClaim(lane, L) { const b = R().bp; return has('pass') && !!b.lanes[lane] && L >= 1 && L <= b.level && !bpClaimed(lane, L); }
function claim(lane, L, quiet = false) {
  if (!canClaim(lane, L)) return null;
  const b = R().bp, rw = bpReward(b.season, lane, L);
  (b.claimed[lane] = b.claimed[lane] || {})[L] = true;
  if (rw.coins) S.meta.cur.coins += rw.coins;
  if (rw.gems) S.meta.cur.gems += rw.gems;
  if (rw.kind === 'cur') S.meta.cur[rw.cur] += rw.n;
  if (rw.kind === 'bonus') b.claims++;
  if (rw.kind === 'cash') { rw.gain = revenuePerSec() * rw.secs; earn(rw.gain); }
  S.meta.stats.claims = (S.meta.stats.claims || 0) + 1;
  if (b.bpp) b.bppXp += b.bppPlus ? 2 : 1;
  dirty(); if (!quiet) pushEvent({ who: 'claim', rw });
  return rw;
}
function claimAll() { const b = R().bp; let n = 0; for (const l of BPL) if (b.lanes[l.id]) for (let L = 1; L <= b.level; L++) if (claim(l.id, L, true)) n++; if (n) pushEvent({ who: 'claimAll', n }); return n; }
function unclaimedCount() { const b = R().bp; let n = 0; if (!has('pass')) return 0; for (const l of BPL) if (b.lanes[l.id]) for (let L = 1; L <= b.level; L++) if (!bpClaimed(l.id, L)) n++; return n; }
function laneCost(id) { return BPL[laneIndex(id)].cost; }
function laneVisible(id) { const i = laneIndex(id); return i === 0 || !!R().bp.lanes[BPL[i - 1].id]; }
function canLaunchLane(id) { return has('pass') && !R().bp.lanes[id] && !inProgress('lane', id) && freeTeams() > 0 && laneVisible(id) && R().cash >= laneCost(id); }
function launchLane(id) { if (!canLaunchLane(id)) return false; R().cash -= laneCost(id); startProject('lane', id, CONFIG.projects.laneSecs * laneIndex(id)); return true; }
function applyLane(id) { R().bp.lanes[id] = true; dirty(); log(`Launched the ${BPL[laneIndex(id)].name} Pass.`); pushEvent({ who: 'lane', id }); return true; }
function seasonDone() { return R().bp.level >= PS.levels; }
function newSeason() { const b = R().bp; if (!seasonDone()) return false; claimAll(); b.done++; S.meta.stats.seasons++; b.season++; b.level = 0; b.xp = 0; b.claimed = {}; dirty(); log(`Season ${b.season} begins. It is the same as Season ${b.season - 1}, but with a new number.`); pushEvent({ who: 'season', season: b.season }); return true; }
function bppNeed(n) { return 10 * Math.pow(1.35, n); }
function bppLevel() { const b = R().bp; if (!b.bpp) return 0; let x = b.bppXp, n = 0; while (x >= bppNeed(n) && n < 500) { x -= bppNeed(n); n++; } return n; }
function bppProgress() { const b = R().bp; let x = b.bppXp, n = 0; while (x >= bppNeed(n) && n < 500) { x -= bppNeed(n); n++; } return { level: n, have: x, need: bppNeed(n) }; }
function buyBpExtra(kind) {
  const b = R().bp, cost = { bpp: PS.bppCost, bppPlus: PS.bppPlusCost, manager: PS.managerCost }[kind];
  if (!has('pass') || b[kind] || R().cash < cost || (kind === 'bppPlus' && !b.bpp)) return false;
  R().cash -= cost; b[kind] = true; dirty(); log({ bpp: 'Unlocked the Battle Pass Pass.', bppPlus: 'Unlocked Battle Pass Pass Plus.', manager: 'Hired a Battle Pass Manager.' }[kind]); return true;
}
function tickPass(dt) {
  if (!has('pass')) return;
  const b = R().bp;
  if (!seasonDone()) {
    b.xp += bpXpPerSec() * dt; let guard = 0;
    while (b.xp >= bpNeed() && b.level < PS.levels && guard++ < 100) { b.xp -= bpNeed(); b.level++; pushEvent({ who: 'bplevel', level: b.level }); }
    if (seasonDone()) b.xp = 0;
  }
  if (b.manager) { claimAll(); if (seasonDone()) newSeason(); }
}

// ---------- currencies, boosters, loot, VIP, daily ----------
function trade(i, times = 1) {
  const x = CONFIG.exchange[i], c = S.meta.cur; if (!x) return 0;
  const n = times === 'max' ? Math.floor(c[x.from] / x.give) : Math.min(times, Math.floor(c[x.from] / x.give));
  if (n < 1) return 0; c[x.from] -= n * x.give; c[x.to] += n * x.get; S.meta.stats.trades++; return n;
}
function boostActive(id) { return Math.max(0, (R().boosts[id] || 0) - S.time); }
function buyBooster(id) {
  const b = BO[id]; if (!b || S.meta.cur.gems < b.gems) return false;
  S.meta.cur.gems -= b.gems;
  if (b.skip) { const g = revenuePerSec() * b.skip; earn(g); pushEvent({ who: 'skip', gain: g }); }
  else R().boosts[id] = Math.max(R().boosts[id] || 0, S.time) + b.secs;
  dirty(); return true;
}
let earnedAcc = 0; // revenue counter for reports (exact even when life is huge)
function earn(g) { R().cash += g; R().life += g; S.meta.lifetime += g; earnedAcc += g; }
function rollRarity() { const W = CONFIG.rarity; let tot = 0; for (const k in W) tot += W[k]; let x = rand() * tot; for (const k in W) { x -= W[k]; if (x <= 0) return k; } return 'Common'; }
function boxCost() { const L = CONFIG.lootbox; return Math.ceil(L.cost * Math.pow(L.inflation, Object.keys(S.meta.cosmetics).length)); }
function openBox() {
  const L = CONFIG.lootbox, cost = boxCost(); if (!has('lootbox') || S.meta.cur[L.costCur] < cost) return null;
  S.meta.cur[L.costCur] -= cost; S.meta.stats.boxes++;
  const rar = rollRarity(), pool = CONFIG.cosmetics.filter(c => c.rar === rar), c = pool[Math.floor(rand() * pool.length)];
  const dup = !!S.meta.cosmetics[c.id];
  if (dup) S.meta.cur.crystals += 0.25; else S.meta.cosmetics[c.id] = 1;
  dirty(); return { item: c, dup };
}
function vipCost(v = S.meta.vip) { return Math.max(1, Math.round(CONFIG.vip.costBase * Math.pow(CONFIG.vip.costGrowth, v))); }
function buyVip() { if (!has('vip') || S.meta.cur.platinum < vipCost()) return false; S.meta.cur.platinum -= vipCost(); S.meta.vip++; dirty(); log(`VIP ${S.meta.vip} reached.`); pushEvent({ who: 'vip', vip: S.meta.vip }); return true; }
function vipPerk(v) {
  const V = CONFIG.vip;
  if (v === V.autoWhaleAt) return 'Whales you miss still pay in full.';
  if (v === V.bpxpAt) return 'Battle Pass XP ×1.25.';
  if (v === V.autoPopupAt) return 'Popups claim themselves.';
  if (v >= 12) return `Unlocks the ability to purchase VIP ${v + 1}.`;
  return `+${pct(V.rev)} Revenue, +${pct(V.whale)} whale sightings.`;
}
function dayKey(t = Date.now()) { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function dailyReady() { return has('daily') && S.meta.daily.last !== dayKey(); }
function dailyNextDay() { const d = S.meta.daily, yest = dayKey(Date.now() - 864e5); const streak = d.last === yest ? d.streak + 1 : 1; return { streak, day: (streak - 1) % 7 + 1 }; }
function dailyMult() { return R().upg.u_login ? CONFIG.daily.multPerUpgrade : 1; }
function claimDaily() {
  if (!dailyReady()) return null;
  const { streak, day } = dailyNextDay(), coins = CONFIG.daily.rewards[day - 1] * dailyMult();
  S.meta.daily.streak = streak; S.meta.daily.last = dayKey(); S.meta.cur.coins += coins;
  if (day === CONFIG.daily.chestDay) S.meta.stats.chests++;
  return { day, coins, chest: day === CONFIG.daily.chestDay };
}

// ---------- live ops: offers ----------
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PRICES = [0.99, 1.99, 4.99, 9.99, 19.99, 49.99, 99.99];
function makeOffer(base) {
  const O = CONFIG.offers, b = base || pick(O.names).replace('{DAY}', DAYS[new Date().getDay()]);
  const runs = (S.meta.stats.offerRuns[b] || 0), suffix = O.suffixes[Math.min(runs, O.suffixes.length - 1)];
  const now = pick(PRICES), was = Math.round(now * (8 + rand() * 32)) + 0.99;
  return { base: b, name: b + suffix, now, was, value: 100 * (3 + Math.floor(rand() * 10)), stock: 1 + Math.floor(rand() * 3), secs: O.minSecs + rand() * (O.maxSecs - O.minSecs), until: S.time + O.minSecs + rand() * (O.maxSecs - O.minSecs), pay: O.payMin + rand() * (O.payMax - O.payMin), gems: rand() < O.gemChance ? 5 + Math.floor(rand() * 15) : 0, sold: false };
}
function tickOffers() {
  if (!has('offers')) return;
  const r = R();
  while (r.offers.length < CONFIG.offers.count) r.offers.push(makeOffer());
  r.offers = r.offers.map(o => o.until <= S.time ? makeOffer(rand() < 0.6 ? o.base : null) : o); // refreshes, usually under almost the same name
}
function offerValue(o) { return revenuePerSec() * o.pay * mults().offers; }
function runOffer(i) {
  const o = R().offers[i]; if (!o || o.sold) return null;
  const g = offerValue(o); earn(g); if (o.gems) S.meta.cur.gems += o.gems;
  o.sold = true; S.meta.stats.offerRuns[o.base] = (S.meta.stats.offerRuns[o.base] || 0) + 1;
  R().scandal += CONFIG.offers.repHit;
  pushEvent({ who: 'offer', name: o.name, gain: g, gems: o.gems }); return { gain: g, gems: o.gems };
}

// ---------- whales ----------
function whaleChancePerSec() { if (!has('whales')) return 0; const W = CONFIG.whale; return Math.min(W.maxChance, segments().whale * W.perWhaleChance * mults().whale); }
function whaleKind() { const st = R().stage; for (const k of [...CONFIG.whale.kinds].reverse()) if (st >= k.stage && (!k.chance || rand() < k.chance)) return k; return CONFIG.whale.kinds[0]; }
function whaleValue(k) { return revenuePerSec() * CONFIG.whale.value * k.mult; }
function spawnWhale() { if (R().whale) return false; const k = whaleKind(); R().whale = { kind: k.id, until: S.time + CONFIG.whale.swimSecs, value: whaleValue(k) }; pushEvent({ who: 'whale', kind: k.id }); return true; }
function catchWhale(auto = false) {
  const w = R().whale; if (!w) return null;
  const full = !auto || S.meta.vip >= CONFIG.vip.autoWhaleAt, g = w.value * (full ? 1 : CONFIG.whale.autoShare);
  earn(g); S.meta.stats.whales++; R().whale = null; R().nextWhaleCheck = S.time + CONFIG.whale.minGap;
  pushEvent({ who: 'whaleCaught', gain: g, auto, kind: w.kind }); return g;
}
function tickWhale(dt) {
  const r = R();
  if (r.whale) { if (r.whale.until <= S.time) catchWhale(true); return; }
  if (S.time < r.nextWhaleCheck) return;
  if (rand() < whaleChancePerSec() * dt) spawnWhale();
}

// ---------- random events ----------
function eventDef(id) { return CONFIG.events.list.find(e => e.id === id); }
function eventPool() { return CONFIG.events.list.filter(e => R().stage >= e.stage && (!e.needCh || (R().ch[e.needCh] || 0) > 0)); }
function fireEvent(id) {
  const r = R(), e = id ? eventDef(id) : (() => { const P = eventPool(); let t = 0; for (const x of P) t += x.w; let k = rand() * t; for (const x of P) { k -= x.w; if (k <= 0) return x; } return P[0]; })();
  if (!e) return null;
  if (e.whale) { r.whale = null; spawnWhale(); }
  if (e.secs) r.effects.push({ id: e.id, until: S.time + e.secs, inst: e.inst, eng: e.eng, rev: e.rev });
  if (e.scandal) r.scandal += e.scandal;
  r.event = { id: e.id, at: S.time, until: S.time + (e.secs || 20), choice: !!(e.choice || e.choices), resolved: false };
  dirty(); pushEvent({ who: 'event', id: e.id }); return e;
}
function resolveEvent(choiceId) {
  const r = R(), ev = r.event; if (!ev || ev.resolved) return false;
  const e = eventDef(ev.id), rps = revenuePerSec();
  if (e.choices) {
    if (choiceId === 'accept') { earn(rps * 300); r.scandal += 10; }
    else r.scandal -= 5;
  } else if (e.choice) {
    const cost = (e.choice.costSecs || 0) * rps; if (r.cash < cost) return false; r.cash -= cost;
    if (e.id === 'reddit') r.scandal -= e.scandal / 2;
    r.effects = r.effects.filter(x => x.id !== e.id);
  } else return false;
  ev.resolved = true; ev.until = Math.min(ev.until, S.time + 3); dirty(); return true;
}
function tickEvents() {
  const r = R(); if (!has('events')) return;
  if (r.event && r.event.until <= S.time) r.event = null;
  r.effects = r.effects.filter(e => e.until > S.time);
  if (S.time >= r.nextEvent && !r.event) { fireEvent(); const E = CONFIG.events; r.nextEvent = S.time + E.minGap + rand() * (E.maxGap - E.minGap); }
}

// ---------- simulated popups ----------
function tickPopups() {
  if (!has('popups')) return; const r = R(), P = CONFIG.popups;
  r.popups = r.popups.filter(p => p.until > S.time);
  if (S.meta.vip >= CONFIG.vip.autoPopupAt) while (r.popups.length) claimPopup(r.popups[0].id);
  if (S.time >= r.nextPopup) { r.nextPopup = S.time + P.gap / mults().popups * (0.6 + rand() * 0.8);
    if (r.popups.length < P.max && !S.settings.calm) r.popups.push({ id: Math.floor(rand() * 1e9), title: pick(P.titles), until: S.time + P.life }); }
}
function popupReward() { const M = mults(); return { coins: has('currencies') ? Math.max(3, Math.round(coinsPerSec() * 20 * M.popups)) : 0, code: Math.max(1, (devCodePerSec() + codePerTap()) * 15 * M.popups) }; }
function claimPopup(id) { const r = R(), i = r.popups.findIndex(p => p.id === id); if (i < 0) return null; r.popups.splice(i, 1); const rw = popupReward(); S.meta.cur.coins += rw.coins; r.code += rw.code; S.meta.stats.popups++; return rw; }

// ---------- achievements ----------
function achState() { const r = R(), m = S.meta; return { lifeInstalls: r.lifeInstalls, players: r.players, stage: r.stage, devd: r.devd, life: r.life, maxOfferRuns: Math.max(0, ...Object.values(m.stats.offerRuns)), whales: m.stats.whales, bpp: r.bp.bpp, seasonsDone: r.bp.done, rep: r.rep, adChain: r.adChain, sequel: m.sequel, vip: m.vip, chests: m.stats.chests, cosmetics: Object.keys(m.cosmetics).length, taps: m.stats.taps, trades: m.stats.trades, panders: m.stats.panders || 0, mgr: r.staff ? r.staff.mgr : 0, pizzas: m.stats.pizzas || 0, f2p: r.f2p, bombsDefused: m.stats.bombs || 0, p2w: p2wCount() }; }
function checkAchievements() { const st = achState(); for (const a of CONFIG.achievements) if (!S.meta.achievements[a.id] && a.test(st)) { S.meta.achievements[a.id] = Date.now(); dirty(); pushEvent({ who: 'ach', id: a.id }); log(`Achievement: ${a.name}`); } }

// ---------- prestige: Launch a Sequel ----------
// Shareholder Confidence grows with the number of digits of revenue (k × digits^p), so late sequels can't run away.
function scFor(peak) { const Q = CONFIG.sequel; if (!(peak >= Q.minPlayers)) return 0; return Math.floor(Q.k * Math.pow(peak / Q.minPlayers, Q.p)); } // from the most players this game had (the market caps it)
function scGain() { return scFor(R().peak); }
function nextScAt() { const Q = CONFIG.sequel, n = scGain() + 1; return Q.minPlayers * Math.pow(n / Q.k, 1 / Q.p); } // players
function sequelTarget() { const Q = CONFIG.sequel; return Math.min(Q.maxTarget, Math.max(Q.minTarget || Q.minPlayers, (S.meta.bestPeak || 0) * Q.beatBy)); } // the board wants each sequel to beat the last one's peak
function canSequel() { return (R().era || 1) >= 5 && scGain() >= 1 && R().peak >= sequelTarget(); }
function launchSequel() {
  if (!canSequel()) return false; const g = scGain(), m = S.meta;
  const laidOff = headcount(); m.stats.layoffs = (m.stats.layoffs || 0) + laidOff;
  m.bestPeak = Math.max(m.bestPeak || 0, R().peak); m.sc += g; m.scTotal += g; m.sequel++;
  S.run = freshRun(m); dirty(); log(`Launched ${gameTitle()}. +${g} Shareholder Confidence.`); pushEvent({ who: 'sequel', gain: g, laidOff });
  return g;
}
function boardCost(id) { const b = BD[id]; return Math.round(b.cost * Math.pow(b.growth, boardRank(id))); }
function canBoard(id) { const b = BD[id]; return !!b && (!b.max || boardRank(id) < b.max) && S.meta.sc >= boardCost(id); }
function buyBoard(id) { if (!canBoard(id)) return false; S.meta.sc -= boardCost(id); S.meta.board[id] = boardRank(id) + 1; dirty(); return true; }

// ---------- projects, staff, pizza (Alpha 0.3.0): orders take a little time to carry out ----------
function inProgress(kind, id) { return R().projects.some(p => p.kind === kind && p.id === id); }
function teamWork() { return R().projects.filter(p => p.kind !== 'upg').length; } // decisions go to legal, not to a dev team
function freeTeams() { return R().staff.teams - teamWork(); }
function teamSpeed() { const r = R(); return (1 + CONFIG.staff.mgr.speed * r.staff.mgr) * (r.pizzaUntil > S.time ? CONFIG.staff.pizza.mult : 1); }
function startProject(kind, id, secs) { R().projects.push({ kind, id, t: 0, total: Math.max(1, secs) }); dirty(); pushEvent({ who: 'project', kind, id }); }
function projectLeft(p) { return Math.max(0, (p.total - p.t) / teamSpeed()); }
function tickProjects(dt) {
  const r = R(); if (!r.projects.length) return; const sp = teamSpeed(), done = [];
  for (const p of r.projects) { p.t += dt * (p.kind === 'upg' ? Math.max(1, Math.sqrt(sp)) : sp); if (p.t >= p.total) done.push(p); }
  if (!done.length) return; r.projects = r.projects.filter(p => !done.includes(p));
  for (const p of done) { if (p.kind === 'epic') shipFeature(p.id); else if (p.kind === 'upg') applyUpgrade(p.id); else if (p.kind === 'lane') applyLane(p.id); }
}
function mgrCost(n = R().staff.mgr) { const M = CONFIG.staff.mgr; return M.cost * Math.pow(M.growth, n); }
function hireManager() { if (!has('staff') || R().cash < mgrCost()) return false; R().cash -= mgrCost(); R().staff.mgr++; dirty(); return true; }
function teamCost() { const T = CONFIG.staff.teams, n = R().staff.teams; return n >= T.max ? null : T.costs[n - 1]; }
function hireTeam() { const c = teamCost(); if (!has('staff') || c == null || R().cash < c) return false; R().cash -= c; R().staff.teams++; dirty(); return true; }
function pizzaCost() { return revenuePerSec() * CONFIG.staff.pizza.costSecs; }
function pizzaReadyIn() { return Math.max(0, R().pizzaReady - S.time); }
function holdPizza() { const r = R(), P = CONFIG.staff.pizza; if (!has('staff') || pizzaReadyIn() > 0 || r.cash < pizzaCost()) return false; r.cash -= pizzaCost(); r.pizzaUntil = S.time + P.secs; r.pizzaReady = S.time + P.cooldown; S.meta.stats.pizzas++; dirty(); pushEvent({ who: 'pizza' }); return true; }
function headcount() { const r = R(); return 1 + r.devs + r.staff.mgr + r.cms + 4 * (r.staff.teams - 1) + Math.ceil(r.adNet / 2); }

// ---------- pandering: the Showcase stage ----------
const PD = byId(CONFIG.pander);
function panderVisible(id) { return has('pander') && R().stage >= PD[id].stage; }
function panderReadyIn(id) { return Math.max(0, (R().pander[id] || 0) - S.time); }
function pander(id) {
  const d = PD[id], r = R(); if (!d || !panderVisible(id) || panderReadyIn(id) > 0) return false;
  const n = d.now; r.pander[id] = S.time + d.cd;
  if (n.scandal) r.scandal += n.scandal;
  if (n.secs) r.effects.push({ id: 'pander-' + id, until: S.time + n.secs, inst: n.inst, eng: n.eng, rev: n.rev });
  if (d.later) r.delayed.push({ at: S.time + d.later.after, scandal: d.later.scandal, text: d.later.text, id });
  S.meta.stats.panders++; dirty(); pushEvent({ who: 'pander', id }); return true;
}
function tickDelayed() { const r = R(); if (!r.delayed.length) return; const due = r.delayed.filter(x => x.at <= S.time); if (!due.length) return; r.delayed = r.delayed.filter(x => x.at > S.time); for (const x of due) { r.scandal += x.scandal; dirty(); pushEvent({ who: 'backlash', text: x.text, id: x.id }); log(x.text); } }

// ---------- simulation ----------
// Players follow dP/dt = I − cP; solved exactly per step so long offline steps stay stable.
function simulate(dt, offline = false) {
  if (!(dt > 0)) return;
  const r = R(); S.time += dt; r.t += dt; dirty();
  const I = installsPerSec(), c = churnRate(), Pstar = I / c, P0 = r.players;
  r.players = Pstar + (P0 - Pstar) * Math.exp(-c * dt);
  r.lifeInstalls += I * dt; r.peak = Math.max(r.peak, r.players);
  if (!r.f2p && r.price >= 0) { // a copy is sold when a whole player installs: money arrives per sale, never as a trickle
    r.saleAcc = (r.saleAcc || 0) + I * dt; const n = Math.floor(r.saleAcc);
    if (n > 0) { r.saleAcc -= n; const sm = incFxKey('sales', 1), g = n * priceNow() * sm; /* the sticker price, exactly (unless the payment processor is down) */ if (sm < 1 && r.inc) r.inc.queued = (r.inc.queued || 0) + n * priceNow() * (1 - sm); r.sales += n; r.salesMoney = (r.salesMoney || 0) + g; earn(g); if (!offline) pushEvent({ who: 'sale', n, gain: g }); } }
  // Development: developers write code if payroll is met. Finance: features + ad networks earn. Community: managers reply.
  const pay = payrollPerSec() * dt;
  earn((featureRevenuePerSec() + adsInGamePerSec()) * dt);
  r.autoAdAcc += autoAdsPerSec() * dt; while (r.autoAdAcc >= 1) { r.autoAdAcc -= 1; placeAd(true); }
  if (r.devs > 0 || r.qa > 0) { if (r.cash >= pay) { r.cash -= pay; r.unpaid = false; } else r.unpaid = true; } else r.unpaid = false;
  const cd = devCodePerSec() * dt; r.code += cd; r.lifeCode += cd;
  if (r.qa) r.bugs *= Math.exp(-qaFixPerSec() * dt); // QA testers
  r.bugs += TR.bugs.discover * ((r.era || 1) < 4 ? TR.bugs.earlyDiscover : 1) * quality() * (r.players / (r.players + 200)) * dt; // players find bugs (fewer before free-to-play)
  if (r.devd.dlc) r.dlcSold = (r.dlcSold || 0) + featureRate('dlc') * dt / FT.dlc.price;
  r.saleFatigue *= Math.exp(-dt / PR.sale.fatigueTau); if (!r.sale.ended && S.time >= r.sale.until) { r.sale.ended = true; if (!offline) pushEvent({ who: 'saleEnd' }); }
  r.autoReplyAcc += autoRepliesPerSec() * dt; while (r.autoReplyAcc >= 1) { r.autoReplyAcc -= 1; reply(true); }
  r.adLoad *= Math.exp(-dt / TR.ad.loadTau); r.replyBuf *= Math.exp(-dt / TR.reply.tau);
  r.adImpressions += adImpressionsPerSec() * dt;
  r.data += dataPerSec() * dt;
  S.meta.cur.coins += coinsPerSec() * dt;
  r.rep += (repTarget() - r.rep) * (1 - Math.exp(-dt / C0.repTau));
  r.scandal *= Math.exp(-dt / C0.scandalDecay); if (Math.abs(r.scandal) < 0.01) r.scandal = 0;
  tickPass(dt); tickProjects(dt); tickDelayed(); tickLive(); if (!offline) { tickBomb(dt); tickIncidents(); }
  if (offline) {
    const ch = whaleChancePerSec() * dt; r.whaleCarry += ch;
    while (r.whaleCarry >= 1) { r.whaleCarry -= 1; const k = whaleKind(), g = whaleValue(k) * (S.meta.vip >= CONFIG.vip.autoWhaleAt ? 1 : CONFIG.whale.autoShare); earn(g); S.meta.stats.whales++; }
    r.effects = r.effects.filter(e => e.until > S.time); r.event = null; r.whale = null; r.popups = []; if (r.bomb) { r.scandal += r.bomb.done ? 0 : r.bomb.hit - r.bomb.applied; r.bomb = null; } r.inc = null; // incidents wait for you to come back
  } else { tickWhale(dt); tickEvents(); tickPopups(); tickOffers(); }
  checkStage();
}
let achT = 0;
function step(dt) { simulate(dt); tutCheck(); achT += dt; if (achT >= 1) { achT = 0; checkAchievements(); } }

// ---------- offline (AFK) ----------
function afkCap() { return CONFIG.offline.capSeconds; }
function applyOffline(seconds) {
  const counted = Math.min(afkCap(), Math.max(0, seconds)) * CONFIG.offline.efficiency;
  earnedAcc = 0; const r = R(), m = S.meta, before = { players: r.players, cash: r.cash, life: r.life, code: r.lifeCode, whales: m.stats.whales, ads: r.adImpressions, coins: m.cur.coins, bpLevel: r.bp.level + r.bp.season * 1000, stage: r.stage, data: r.data };
  const n = Math.max(1, Math.min(CONFIG.offline.steps, Math.ceil(counted))), dt = counted / n;
  for (let i = 0; i < n; i++) simulate(dt, true);
  checkAchievements();
  return { awaySeconds: seconds, counted, players: r.players - before.players, playersNow: r.players, revenue: earnedAcc, code: r.lifeCode - before.code, whales: m.stats.whales - before.whales, ads: r.adImpressions - before.ads, coins: m.cur.coins - before.coins, bpLevels: (r.bp.level + r.bp.season * 1000) - before.bpLevel, stages: r.stage - before.stage, data: r.data - before.data };
}

// ---------- Save / Load (Click to Conquer pattern: merge onto a fresh state, validate imports, keep a backup) ----------
let saveHook = null;
function save() { S.lastTick = Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} if (saveHook) saveHook(); }
function saveString() { S.lastTick = Date.now(); return JSON.stringify(S); }
function saveMeta(str) { try { const d = typeof str === 'string' ? JSON.parse(str) : str; const r = d.run || {}, m = d.meta || {};
  return { lastTick: d.lastTick || 0, played: d.time || 0, stage: (CONFIG.stages[(r.stage || 1) - 1] || CONFIG.stages[0]).name, sequel: m.sequel || 1, title: gameTitle(m.sequel || 1), revenue: m.lifetime || 0, sc: m.scTotal || 0 }; } catch (e) { return null; } }
function isSave(d) { return !!d && typeof d === 'object' && !!d.run && !!d.meta && typeof d.run.players === 'number'; }
function merge(d) {
  const b = freshState(), rb = freshRun(d.meta), dr = d.run, dm = d.meta;
  const run = { ...rb, ...dr, bp: { ...rb.bp, ...(dr.bp || {}), lanes: { free: true, ...((dr.bp || {}).lanes || {}) }, claimed: { ...((dr.bp || {}).claimed || {}) } } };
  for (const k of ['ch', 'ft', 'devd', 'aggr', 'gw', 'upg', 'res', 'games', 'boosts', 'gf', 'dev']) run[k] = { ...(dr[k] || {}) };
  for (const k of ['effects', 'offers', 'popups', 'projects', 'delayed']) run[k] = Array.isArray(dr[k]) ? dr[k] : [];
  run.staff = { ...rb.staff, ...(dr.staff || {}) }; run.pander = { ...(dr.pander || {}) };
  run.devd.banner = true; if (!run.ft.banner) run.ft.banner = 1;
  for (const k of ['players', 'code', 'cash', 'data', 'life', 'rep', 'adLoad', 'trust', 'replyBuf']) if (!isFinite(run[k])) run[k] = rb[k];
  const meta = { ...b.meta, ...dm, cur: { ...b.meta.cur, ...(dm.cur || {}) }, board: { ...(dm.board || {}) }, cosmetics: { ...(dm.cosmetics || {}) }, achievements: { ...(dm.achievements || {}) }, daily: { ...b.meta.daily, ...(dm.daily || {}) }, stats: { ...b.meta.stats, ...(dm.stats || {}), offerRuns: { ...((dm.stats || {}).offerRuns || {}) } } };
  for (const k in meta.cur) if (!isFinite(meta.cur[k])) meta.cur[k] = 0;
  return { ...b, ...d, schema: SCHEMA, meta, run, settings: { ...b.settings, ...(d.settings || {}) }, log: Array.isArray(d.log) ? d.log.slice(0, 60) : [] };
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY); if (!raw) return null;
    const d = JSON.parse(raw); if (!isSave(d)) return null;
    S = merge(d); dirty(); return S;
  } catch (e) { return null; }
}
function restoreString(str) {
  const prev = localStorage.getItem(SAVE_KEY);
  try { if (!isSave(JSON.parse(str))) throw new Error('not a save'); localStorage.setItem(SAVE_KEY, str); if (!load()) throw new Error('bad save'); }
  catch (e) { if (prev) { localStorage.setItem(SAVE_KEY, prev); load(); } return false; }
  const away = Math.max(0, (Date.now() - (S.lastTick || Date.now())) / 1000);
  S.lastTick = Date.now(); lastFrame = now(); accumulator = 0;
  resumeFromAfk(away); save(); return true;
}
function exportSave() { return btoa(unescape(encodeURIComponent(JSON.stringify(S)))); }
function importSave(str) {
  let json; try { const d = JSON.parse(decodeURIComponent(escape(atob(String(str || '').trim())))); if (!isSave(d)) return false; json = JSON.stringify(d); } catch (e) { return false; }
  const prev = localStorage.getItem(SAVE_KEY);
  try { if (prev) localStorage.setItem(SAVE_KEY + '_backup', prev); localStorage.setItem(SAVE_KEY, json); if (!load()) throw new Error('bad save'); return true; }
  catch (e) { try { if (prev) localStorage.setItem(SAVE_KEY, prev); else localStorage.removeItem(SAVE_KEY); } catch (e2) {} load(); return false; }
}
function hardReset() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} S = freshState(); dirty(); }

// ---------- Main loop (fixed 100 ms tick, as in Click to Conquer) ----------
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
let accumulator = 0, lastFrame = now();
function frame(t) {
  let dt = (t - lastFrame) / 1000; lastFrame = t;
  dt = Math.min(dt, CONFIG.maxCatchupSeconds) * (S.settings.devSpeed || 1);
  accumulator += dt; const stepS = CONFIG.tickMs / 1000; let guard = 0;
  while (accumulator >= stepS && guard++ < 5000) { step(stepS); accumulator -= stepS; }
  UI.render(); requestAnimationFrame(frame);
}
// The game never runs in the background. On launch or when the tab returns it measures the gap
// and pays out AFK gains (banked at once — reloading before tapping Continue can't lose them).
let hiddenAt = null;
function resumeFromAfk(awaySeconds) {
  if (!(awaySeconds >= CONFIG.offline.minSecondsToShow)) return false;
  const d = applyOffline(awaySeconds); save();
  if (d.revenue > 0 || d.players > 0) { UI.showWelcomeBack(d); return true; }
  return false;
}
function boot() {
  const loaded = load(); UI.init();
  if (loaded) { const away = Math.max(0, (Date.now() - (S.lastTick || Date.now())) / 1000); resumeFromAfk(away); } // clock set backwards → 0
  S.lastTick = Date.now(); lastFrame = now();
  setInterval(save, CONFIG.autosaveMs);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = Date.now(); save(); }
    else { const away = hiddenAt ? (Date.now() - hiddenAt) / 1000 : 0; hiddenAt = null; lastFrame = now(); accumulator = 0; resumeFromAfk(away); S.lastTick = Date.now(); }
  });
  window.addEventListener('pagehide', save);
  requestAnimationFrame(frame);
}

const Game = {
  get S() { return S; }, get run() { return S.run; }, get meta() { return S.meta; }, CONFIG, SAVE_KEY,
  fmt, money, pct, fmtTime, clock, seedRandom,
  gfGain, featureGain, devGain, channelGain, stageDef, nextStage, gameTitle, studioName, studioBase, setStudioName, has, tutDone, tutStep, tutGoal, tutCheck, skipTutorial, mults, segments, segShare, milestoneMult, nextMilestone, costFor, buyCount,
  repTarget, repParts, repInstallMult, repChurnMult, featurePressure, channelPressure, goodwillGain,
  channelRate, womRate, installMult, installsPerSec, churnRate, featureRate, revenuePerSec, featureRevenuePerSec, engagementPerSec, dataPerSec, coinsPerSec, adImpressionsPerSec, bpXpPerSec,
  liveOn, liveBoost, liveCost, liveReadyIn, canLive, startLive, videoSentiment, videoWeight, videoInstalls, videoRepPenalty, videoCost, videoReadyIn, canVideo, postVideo, scamVideo, baseInterest, priceKeep, settlesAtPrice, promote, promoteGain, hireAccountant, runway, paidAdMult, recurringPerSec, recurringNetPerSec, onStore, priceNow, demand, installsAt, salesPerSec, setPrice, goF2P, settlesAt, retentionMult, interestPerSec, shopFactor, shelfRevenue, shelfOpen, adIncomePerSec, p2wCount, p2wPenalty,
  startBomb, defuseBomb, bombLeft, questDone, goodwillCap, msLeft, msGroup, qaCost, hireQA, qaFixPerSec, qaPayroll, eraDef, nextEraDef, canRelaunch, relaunch, incNeed, incReasons, fixGain, bugRatio, bugPenalty, bugChurn, isFix, saleOn, saleMult, saleBoost, saleLeft, saleReadyIn, canSale, startSale, salePreview, incDef, incActive, incFx, startIncident, fixIncident, incTap,
  quality, expectations, qualityTerm, adPenalty, adsInGamePerSec, tierPayroll, tierCode, devTierVisible, replyTerm, stars, adTapValue, autoAdsPerSec, payrollPerSec, devCodePerSec, codePerTap, replyPower, autoRepliesPerSec, netCashPerSec,
  tap, placeAd, reply, gameFeatureVisible, gameFeatureCost, buyGameFeature, devCost, hireDev, adNetCost, buyAdNet, cmCost, hireCM, channelVisible, channelCost, buyChannel, featureVisible, nextFeature, canDevelop, develop, featureCost, buyFeature, featureName, toggleAggr,
  goodwillVisible, goodwillCost, buyGoodwill, upgradeVisible, canUpgrade, buyUpgrade, canResearch, research, gameCost, buyGame,
  bpNeed, bpReward, bpClaimed, canClaim, claim, claimAll, unclaimedCount, laneCost, laneVisible, canLaunchLane, launchLane, seasonDone, newSeason, bppLevel, bppProgress, buyBpExtra, laneCount,
  trade, boostActive, buyBooster, openBox, boxCost, vipCost, buyVip, vipPerk, dailyReady, dailyNextDay, claimDaily, dailyMult,
  offerValue, runOffer, whaleChancePerSec, catchWhale, spawnWhale, fireEvent, resolveEvent, eventDef, claimPopup, popupReward, checkAchievements,
  inProgress, epicSecsFor, freeTeams, teamSpeed, projectLeft, mgrCost, hireManager, teamCost, hireTeam, pizzaCost, pizzaReadyIn, holdPizza, headcount, panderVisible, panderReadyIn, pander,
  scGain, nextScAt, canSequel, sequelTarget, launchSequel, boardCost, canBoard, buyBoard, boardRank,
  simulate, step, applyOffline, afkCap,
  save, load, saveString, saveMeta, restoreString, exportSave, importSave, hardReset, setSaveHook: f => { saveHook = f; },
  drainEvents: () => EVENTS.splice(0),
  debug: {
    players(n) { R().players = n; R().peak = Math.max(R().peak, n); checkStage(); }, bomb() { return startBomb(); }, era(n) { const r = R(); r.era = n; if (n >= 4) { r.f2p = true; r.price = -1; } dirty(); }, incident(id) { return startIncident(id); },
    cash(n) { earn(n); }, code(n) { R().code += n; }, eng(n) { R().code += n; }, cur(k, n) { S.meta.cur[k] += n; }, data(n) { R().data += n; },
    sc(n) { S.meta.sc += n; S.meta.scTotal += n; }, finish() { for (const p of R().projects) p.t = p.total; tickProjects(0); }, event(id) { return fireEvent(id); }, whale() { R().whale = null; return spawnWhale(); },
    bpLevels(n) { R().bp.level = Math.min(PS.levels, R().bp.level + n); }, offline(h) { return applyOffline(h * 3600); },
  },
};
if (typeof window !== 'undefined') { window.Game = Game; if (typeof document !== 'undefined') window.addEventListener('DOMContentLoaded', boot); }
