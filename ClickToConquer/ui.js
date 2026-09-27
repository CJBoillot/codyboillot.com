// ============================================================
// UI — Character (Fight/Gear/Attributes/Skills/Talents), Kingdom, Crafting
// ============================================================

const UI = (() => {
  const $ = id => document.getElementById(id);
  const R = CONFIG.resources;
  const STAT_LABEL = { attack: 'Attack', hp: 'Max HP', armor: 'Armor', speed: 'Atk speed', drop: 'Drops', crit: 'Crit', regen: 'Regen', dodge: 'Dodge', xp: 'XP' };
  const isPct = k => ['speed', 'drop', 'crit', 'dodge', 'xp'].includes(k);
  const fs = (k, v) => isPct(k) ? '+' + Game.pct(v, 1) : '+' + Game.fmt(v);
  let welcomeData = null;
  // Sprite icon: [row,col] on the icon sheet. size in px (16/24/32).
  const ico = (rc, size = 16, cls = '') => { if (!rc) return ''; const sc = size / CONFIG.iconSheet.cell; return `<span class="ico ${cls}" style="width:${size}px;height:${size}px;background-position:-${rc[1] * size}px -${rc[0] * size}px;background-size:${512 * sc}px auto"></span>`; };

  const costHtml = cost => Object.entries(cost).map(([k, v]) => `<span class="costitem ${(Game.S.res[k] || 0) >= v ? '' : 'lack'}" title="${Game.fmt(v)} ${R[k].name} (have ${Game.fmt(Game.S.res[k] || 0)})">${ico(R[k].icon, 16)}${Game.fmt(v)}<span class="cost-name">${R[k].name}</span></span>`).join(' ');
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  // DOM writes only when content changes — rewriting a button's children mid-click eats the click.
  const setHtml = (e, v) => { if (e.__h !== v) { e.innerHTML = v; e.__h = v; } };
  const setText = (e, v) => { if (e.__t !== v) { e.textContent = v; e.__t = v; } };
  const flash = row => { row.classList.remove('flash'); void row.offsetWidth; row.classList.add('flash'); };

  function init() {
    $('version').textContent = CONFIG.version;
    // Resource chips: icon · amount · name · rate, in config order; a good appears once first gained.
    const rb = $('res-bar'); rb.innerHTML = '';
    for (const k in R) {
      const d = el('div', 'res hidden'); d.id = 'res-' + k; d.title = `${R[k].name} — ${R[k].desc || ''}`;
      d.innerHTML = `${ico(R[k].icon, 22)}<div class="res-txt"><b data-f="amt">0</b><span class="res-name">${R[k].name}</span></div><span class="rrate" data-f="rate"></span>`;
      rb.appendChild(d);
    }
    document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('active', x === b));
      if (desktop) return;
      document.querySelectorAll('.tab').forEach(t => t.classList.toggle('hidden', t.id !== 'tab-' + b.dataset.tab));
    }));
    document.querySelectorAll('[data-sub]').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('[data-sub]').forEach(x => x.classList.toggle('active', x === b));
      const subs = desktop ? document.querySelectorAll('#tab-hero > .sub') : document.querySelectorAll('.sub');
      subs.forEach(t => t.classList.toggle('hidden', t.id !== 'sub-' + b.dataset.sub));
    }));
    $('advance-btn').addEventListener('click', () => Game.advance());
    $('mini-advance').addEventListener('click', () => Game.advance());
    $('retreat-btn').addEventListener('click', () => Game.retreat());
    $('respec-btn').addEventListener('click', () => { if (confirm('Reset all attribute and talent points?')) Game.respec(); });
    $('wb-claim').addEventListener('click', () => claimWelcome(1));
    $('wb-ad').addEventListener('click', () => claimWelcome(CONFIG.offline.adDoubleMultiplier));
    $('dev-toggle').addEventListener('click', () => $('dev-panel').classList.toggle('hidden'));
    $('dev-close').addEventListener('click', () => $('dev-panel').classList.add('hidden'));
    $('item-close').addEventListener('click', closeItem); $('item-modal').addEventListener('click', e => { if (e.target === $('item-modal')) closeItem(); });
    $('item-s1').addEventListener('click', () => invItem && Game.sell(invItem, 1)); $('item-s10').addEventListener('click', () => invItem && Game.sell(invItem, 10)); $('item-sall').addEventListener('click', () => invItem && Game.sell(invItem, 'all'));
    document.querySelectorAll('[data-speed]').forEach(b => b.addEventListener('click', () => { Game.S.settings.devSpeed = +b.dataset.speed; document.querySelectorAll('[data-speed]').forEach(x => x.classList.toggle('active', x === b)); }));
    $('dev-offline').addEventListener('click', () => showWelcomeBack(Game.applyOffline(4 * 3600)));
    const devN = () => +$('dev-n').value || 0;
    for (const k in R) { const o = document.createElement('option'); o.value = k; o.textContent = R[k].name; $('dev-res').appendChild(o); }
    $('dev-give-all').addEventListener('click', () => Game.debug.giveAll(devN()));
    $('dev-give-one').addEventListener('click', () => Game.debug.give($('dev-res').value, devN()));
    $('dev-lvl').addEventListener('click', () => Game.debug.levels(5));
    $('dev-stage10').addEventListener('click', () => Game.debug.setStage(Game.S.hero.stage + 10));
    $('dev-know').addEventListener('click', () => Game.debug.knowledge(50));
    $('dev-klvl').addEventListener('click', () => { Game.debug.kingdomLevel(1); buildLists(); });
    $('dev-tech').addEventListener('click', () => Game.debug.techAll());
    $('dev-qskip').addEventListener('click', () => Game.debug.questSkip());
    $('set-log').addEventListener('change', e => { Game.S.settings.showLog = e.target.checked; });
    $('quest-claim').addEventListener('click', () => { if (Game.questClaim()) flash($('quest-card')); });
    $('dev-export').addEventListener('click', () => { $('dev-io').value = Game.exportSave(); $('dev-io').select(); });
    $('dev-import').addEventListener('click', () => { if (Game.importSave($('dev-io').value)) { buildLists(); alert('Imported.'); } else alert('Bad save string.'); });
    $('dev-reset-run').addEventListener('click', () => { if (confirm('Reset this run? Kingdom level, Knowledge, perks and workers are kept.')) { Game.debug.resetRun(); buildLists(); } });
    $('dev-reset').addEventListener('click', () => { if (confirm('RESET ALL progress? This wipes everything, including Knowledge and Kingdom level.')) Game.debug.resetAll(); });
    // Kingdom sub-tabs
    document.querySelectorAll('[data-ksub]').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('[data-ksub]').forEach(x => x.classList.toggle('active', x === b));
      document.querySelectorAll('.ksub').forEach(t => t.classList.toggle('hidden', t.id !== 'ksub-' + b.dataset.ksub));
    }));
    // Founding
    $('found-btn').addEventListener('click', openFound);
    $('buy-plot').addEventListener('click', () => { if (Game.buyPlot()) buildPlots(); });
    $('build-cancel').addEventListener('click', () => $('build-modal').classList.add('hidden'));
    $('slot-close').addEventListener('click', closeSlot);
    $('doll').addEventListener('click', e => { const s = e.target.closest('.doll-slot'); if (s && s.dataset.slot) openSlot(s.dataset.kind, s.dataset.slot); });
    $('hand-toggle').addEventListener('click', () => { const S = Game.S; S.settings.handCollapsed = !handCollapsed(); });
    // By hand
    const hb = $('hand-bar'); hb.innerHTML = ''; rows.hand = {};
    for (const hd of CONFIG.hand) {
      const b = el('button', 'hand-btn', `${ico(hd.icon, 26)}<span>${hd.name}</span><span class="hand-sub" data-f="sub"></span>`);
      b.title = hd.desc;
      b.addEventListener('click', e => { if (Game.grab(hd.id)) { const r = b.getBoundingClientRect(); const p = el('div', 'pop loot', `${ico(R[hd.gives].icon, 16)} +1`); p.style.left = (r.left + r.width / 2) + 'px'; p.style.top = (r.top + 8) + 'px'; document.body.appendChild(p); setTimeout(() => p.remove(), 900); } });
      rows.hand[hd.id] = b; hb.appendChild(b);
    }
    // Activities
    const ab = $('activity-bar'); ab.innerHTML = ''; rows.act = {};
    for (const id in CONFIG.activities) {
      const a = CONFIG.activities[id], b = el('button', 'act-btn', `${ico(a.icon, 24)}<span>${a.name}</span><span class="act-sub" data-f="sub"></span>`);
      b.addEventListener('click', () => { if (Game.setActivity(id)) flash(b); });
      rows.act[id] = b; ab.appendChild(b);
    }
    const gb = $('ground-bar'); gb.innerHTML = ''; rows.ground = {};
    for (const id in CONFIG.grounds) {
      const G = CONFIG.grounds[id], b = el('button', 'ground-btn', `${ico(G.icon, 18)}<span>${G.name}</span><span class="g-stage" data-f="st"></span>`);
      b.addEventListener('click', () => { Game.setGround(id); });
      rows.ground[id] = b; gb.appendChild(b);
    }
    // Desktop right-panel tabs
    document.querySelectorAll('[data-rtab]').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('[data-rtab]').forEach(x => x.classList.toggle('active', x === b));
      rightShow(b.dataset.rtab);
    }));
    const mq = window.matchMedia('(min-width: 1024px)'); mq.addEventListener('change', applyLayout); applyLayout();
    $('fm-cancel').addEventListener('click', () => $('found-modal').classList.add('hidden'));
    $('fm-confirm').addEventListener('click', () => {
      const gain = Game.found(fmPick.hero, fmPick.kingdom);
      if (gain === false) return;
      $('found-modal').classList.add('hidden'); buildLists(); buildPlots();
      document.querySelector('[data-tab=hero]').click();
    });
    buildLists();
  }

  // ---- Static lists ----
  const rows = { gear: {}, attr: {}, skill: {}, talent: {}, sbar: {}, market: {}, plot: [], tool: {}, act: {} };
  function buildLists() {
    const sb = $('skill-bar'); sb.innerHTML = ''; rows.sbar = {};
    rows.basic = el('button', 'skill-btn basic', `<span class="sk-ico">${ico([5, 0], 24)}</span><span class="sk-name">Attack</span><span class="sk-cd" data-f="dps"></span>`);
    rows.basic.disabled = true; sb.appendChild(rows.basic);
    for (let i = 0; i < CONFIG.skillSlots; i++) {
      const b = el('button', 'skill-btn empty', '<span class="sk-ico"></span><span class="sk-name">—</span><span class="sk-cd"></span>');
      b.addEventListener('click', () => { const id = b.dataset.id; if (id) Game.castSkill(id, true); });
      rows.sbar[i] = b; sb.appendChild(b);
    }
    const gl = $('gear-list'); gl.innerHTML = '';
    for (const slot in CONFIG.slots) {
      const row = el('div', 'row gear-row');
      row.innerHTML = `
        ${ico(CONFIG.slots[slot].icon, 32, 'rowico')}
        <div class="row-main">
          <div class="row-title" data-f="title"></div>
          <div class="row-sub" data-f="stats"></div>
          <div class="row-sub dim small" data-f="next"></div>
        </div>
        <div class="btn-col">
          <button class="buy" data-f="up"><span class="small">Upgrade</span><br><span class="cost" data-f="upcost"></span></button>
          <button class="buy shard" data-f="forge"><span class="small" data-f="forgelbl">Forge</span><br><span class="cost" data-f="forgecost"></span></button>
        </div>`;
      row.querySelector('[data-f=up]').addEventListener('click', () => { if (Game.upgradeGear(slot)) flash(row); });
      row.querySelector('[data-f=forge]').addEventListener('click', () => { if (Game.craftGear(slot)) flash(row); });
      rows.gear[slot] = row; gl.appendChild(row);
    }
    const tl = $('tool-list'); tl.innerHTML = ''; rows.tool = {};
    for (const slot in CONFIG.toolSlots) {
      const row = el('div', 'row gear-row');
      row.innerHTML = `${ico(CONFIG.toolSlots[slot].icon, 32, 'rowico')}<div class="row-main"><div class="row-title" data-f="title"></div><div class="row-sub" data-f="stats"></div></div>
        <div class="btn-col"><button class="buy" data-f="up"><span class="small">Upgrade</span><br><span class="cost" data-f="upcost"></span></button><button class="buy shard" data-f="forge"><span class="small" data-f="forgelbl">Make</span><br><span class="cost" data-f="forgecost"></span></button></div>`;
      row.querySelector('[data-f=up]').addEventListener('click', () => { if (Game.upgradeTool(slot)) flash(row); });
      row.querySelector('[data-f=forge]').addEventListener('click', () => { if (Game.craftTool(slot)) flash(row); });
      rows.tool[slot] = row; tl.appendChild(row);
    }
    const al = $('attr-list'); al.innerHTML = '';
    for (const k in CONFIG.attributes) {
      const a = CONFIG.attributes[k];
      const row = el('div', 'row');
      row.innerHTML = `${ico(a.icon, 32, 'rowico')}<div class="row-main"><div class="row-title">${a.name} <span class="owned" data-f="pts">0</span></div><div class="row-sub">${a.desc}</div></div>
        <div class="btn-col-h"><button class="buy" data-f="p1">+1</button><button class="buy" data-f="p5">+5</button></div>`;
      row.querySelector('[data-f=p1]').addEventListener('click', () => Game.spendAttr(k, 1));
      row.querySelector('[data-f=p5]').addEventListener('click', () => Game.spendAttr(k, 5));
      rows.attr[k] = row; al.appendChild(row);
    }
    const sl = $('skill-list'); sl.innerHTML = '';
    for (const s of CONFIG.skills) {
      const row = el('div', 'row');
      row.innerHTML = `${ico(s.icon, 32, 'rowico')}<div class="row-main"><div class="row-title">${s.name} <span class="owned">Lv<b data-f="lvl">0</b></span> <span class="dim small" data-f="lock"></span></div><div class="row-sub" data-f="desc"></div><div class="row-sub dim small" data-f="cd"></div></div>
        <div class="btn-col"><button class="buy" data-f="equip">Equip</button><button class="buy" data-f="lvlup"><span class="small">Level</span><br><span class="cost" data-f="cost"></span></button></div>`;
      row.querySelector('[data-f=equip]').addEventListener('click', () => Game.toggleSkill(s.id));
      row.querySelector('[data-f=lvlup]').addEventListener('click', () => { if (Game.levelSkill(s.id)) flash(row); });
      rows.skill[s.id] = row; sl.appendChild(row);
    }
    const tt = $('talent-tree'); tt.innerHTML = '';
    for (const b in CONFIG.talents) {
      const br = CONFIG.talents[b];
      tt.appendChild(el('div', 'card-title', br.name));
      const list = el('div', 'list talent-branch');
      for (const n of br.nodes) {
        const row = el('div', 'row');
        row.innerHTML = `<div class="row-main"><div class="row-title">${n.name} <span class="owned"><b data-f="rank">0</b>/${n.max}</span></div><div class="row-sub">${n.desc}</div></div><button class="buy" data-f="btn">+1</button>`;
        row.querySelector('[data-f=btn]').addEventListener('click', () => { if (Game.spendTalent(n.id)) flash(row); });
        rows.talent[n.id] = row; list.appendChild(row);
      }
      tt.appendChild(list);
    }
    const pl = $('perk-list'); pl.innerHTML = ''; rows.perk = {};
    for (const p of CONFIG.legacy.perks) {
      const row = el('div', 'row');
      row.innerHTML = `${ico(p.icon, 32, 'rowico')}<div class="row-main"><div class="row-title">${p.name} <span class="owned"><b data-f="rank">0</b>/${p.max}</span></div><div class="row-sub">${p.desc}</div></div><button class="buy shard" data-f="btn"><span class="small">Learn</span><br><span class="cost" data-f="cost"></span></button>`;
      row.querySelector('[data-f=btn]').addEventListener('click', () => { if (Game.buyPerk(p.id)) flash(row); });
      rows.perk[p.id] = row; pl.appendChild(row);
    }
    const tx = $('tech-tree'); tx.innerHTML = ''; rows.tech = {};
    CONFIG.techTiers.forEach((name, tier) => {
      const wrap = el('div', 'tech-tier'); wrap.appendChild(el('div', 'cat-title', `Tier ${tier} — ${name}`));
      const list = el('div', 'list');
      for (const t of CONFIG.techs.filter(t => t.tier === tier)) {
        const row = el('div', 'row tech');
        row.innerHTML = `${ico(t.icon, 32, 'rowico')}<div class="row-main"><div class="row-title">${t.name}</div><div class="row-sub">${t.desc}</div><div class="req" data-f="req"></div></div>
          <button class="buy shard" data-f="btn"><span class="small">Research</span><br><span class="cost" data-f="cost"></span></button>`;
        row.querySelector('[data-f=btn]').addEventListener('click', () => { if (Game.research(t.id)) { flash(row); buildPlots(); } });
        rows.tech[t.id] = row; list.appendChild(row);
      }
      wrap.appendChild(list); tx.appendChild(wrap);
    });
    buildPlots();
    const ml = $('market-list'); ml.innerHTML = ''; rows.market = {};
    for (const k in R) {
      if (!R[k].sell) continue;
      const row = el('div', 'row market-row hidden');
      row.innerHTML = `${ico(R[k].icon, 32, 'rowico')}<div class="row-main"><div class="row-title">${R[k].name} <span class="owned">×<b data-f="have">0</b></span></div><div class="row-sub"><span class="sellprice" data-f="price"></span> gold each · ${R[k].desc}</div></div>
        <div class="btn-col-h"><button class="buy" data-f="s1">1</button><button class="buy" data-f="s10">10</button><button class="buy" data-f="sall">All</button></div>`;
      row.querySelector('[data-f=s1]').addEventListener('click', () => { if (Game.sell(k, 1)) flash(row); });
      row.querySelector('[data-f=s10]').addEventListener('click', () => { if (Game.sell(k, 10)) flash(row); });
      row.querySelector('[data-f=sall]').addEventListener('click', () => { if (Game.sell(k, 'all')) flash(row); });
      rows.market[k] = row; ml.appendChild(row);
    }
  }

  // ---- Ordering: actionable rows first, then pending, then done. Only touches the DOM when the order changes. ----
  function orderRows(container, items) { // items: [{el, rank}] lower rank first; rows moved elsewhere (e.g. into a popup) are left alone
    const want = items.filter(i => i.el && i.el.parentNode === container).sort((a, b) => a.rank - b.rank || 0).map(i => i.el);
    const cur = [...container.children].filter(e => want.includes(e));
    if (cur.length === want.length && cur.every((e, i) => e === want[i])) return;
    want.forEach(e => container.appendChild(e));
  }

  // By-hand row: auto-collapses once the hero can do anything on his own; the player can override either way.
  function handCollapsed() {
    const S = Game.S; if (typeof S.settings.handCollapsed === 'boolean') return S.settings.handCollapsed;
    if (questWantsHand()) return false; // a quest is pointing at a hand box: keep it open
    return !!S.hero.gear.weapon || Object.values(S.hero.tools).some(Boolean);
  }
  function questWantsHand() {
    const q = Game.questCurrent(); if (!q || !q.steps) return false;
    const pr = Game.questProgress(q); if (pr.done) return false;
    const i = pr.parts.findIndex(st => !st.done), F = (i >= 0 && q.steps[i].focus) || q.focus;
    return !!(F && ((F.el || '').startsWith('hand:') || (F.el2 || '').startsWith('hand:')));
  }

  // ---- Tab unlocks: screens appear when the quests / game state first need them ----
  const qIdx = id => CONFIG.quests.findIndex(q => q.id === id);
  const reached = id => Game.S.quests.index >= qIdx(id);
  function tabUnlocked(key) {
    const S = Game.S;
    switch (key) {
      case 'kingdom': return reached('f02');
      case 'tech': return reached('f02');
      case 'build': return reached('q08') || S.kingdom.plots.length > 0;
      case 'throne': return reached('q17') || Game.bestStageAll() >= 15 || S.legacy.foundings > 0;
      case 'legacy': return S.legacy.foundings > 0 || S.legacy.knowledge > 0;
      case 'attr': return S.hero.level >= 2;
      case 'skills': return reached('q13c') || CONFIG.skills.some(s => Game.skillUnlocked(s.id));
      case 'talents': return S.hero.level >= CONFIG.hero.talentPointsFromLevel || reached('q06c');
      case 'market': return reached('q14');
      case 'inventory': return Object.keys(R).some(k => S.lifetime[k] > 0);
      default: return true;
    }
  }
  const TABKEY = b => b.dataset.tab || b.dataset.sub || b.dataset.ksub || b.dataset.rtab;
  function applyTabLocks() {
    document.querySelectorAll('[data-tab],[data-sub],[data-ksub],[data-rtab]').forEach(b => {
      const key = TABKEY(b), ok = tabUnlocked(key);
      b.disabled = !ok; b.classList.toggle('locked-tab', !ok);
    });
    // hide content behind a locked active tab
    const ra = document.querySelector('[data-rtab].active'), rlocked = desktop && ra && !tabUnlocked(ra.dataset.rtab);
    $('right-locked').classList.toggle('hidden', !rlocked);
    if (desktop) for (const k in RIGHT) $(RIGHT[k]).classList.toggle('hidden', rlocked || (ra && k !== ra.dataset.rtab));
    const ka = document.querySelector('[data-ksub].active'), klocked = ka && !tabUnlocked(ka.dataset.ksub);
    $('ksub-locked').classList.toggle('hidden', !klocked);
    document.querySelectorAll('.ksub').forEach(t => t.classList.toggle('hidden', klocked || (ka && t.id !== 'ksub-' + ka.dataset.ksub)));
    if (!desktop) { const ma = document.querySelector('[data-tab].active'); if (ma && !tabUnlocked(ma.dataset.tab)) document.querySelector('[data-tab=hero]').click(); }
  }

  // ---- Quest glow: highlight navigation + the exact control the current quest needs ----
  let glowKey = '';
  function applyQuestGlow(q) {
    const isQuest = q && q.id, pr = isQuest ? Game.questProgress(q) : null;
    // a step may carry its own focus; the first unfinished step wins
    let stepF = null, stepIdx = -1;
    if (isQuest && q.steps && pr && pr.parts) { stepIdx = pr.parts.findIndex(st => !st.done); if (stepIdx >= 0 && q.steps[stepIdx].focus) stepF = q.steps[stepIdx].focus; }
    const key = q ? (isQuest ? q.id + ':' + stepIdx + (pr.done ? ':done' : '') : 'goal:' + q.name) : '';
    if (key === glowKey) return; glowKey = key;
    document.querySelectorAll('.quest-glow').forEach(e => e.classList.remove('quest-glow'));
    if (!q || !(q.focus || stepF) || (isQuest && pr.done)) { if (isQuest && q && pr.done) $('quest-claim').classList.add('quest-glow'); return; }
    const F = stepF || q.focus, add = e => e && e.classList.add('quest-glow');
    if (F.tab && !desktop) add(document.querySelector(`[data-tab=${F.tab}]`));
    if (F.sub) add(document.querySelector(`[data-sub=${F.sub}]`));
    if (F.ksub) add(document.querySelector(`[data-ksub=${F.ksub}]`));
    if (F.rtab && desktop) add(document.querySelector(`[data-rtab=${F.rtab}]`));
    for (const sel of [F.el, F.el2]) {
      if (!sel) continue; const [kind, id] = sel.split(':');
      if (kind === 'tech') add(rows.tech[id]); else if (kind === 'tool') { add(rows.tool[id]); add(document.querySelector(`.doll-slot[data-slot=${id}]`)); } else if (kind === 'gear') { add(rows.gear[id]); add(document.querySelector(`.doll-slot[data-slot=${id}]`)); }
      else if (kind === 'act') add(rows.act[id]); else if (kind === 'id') add($(id));
      else if (kind === 'build') rows.plot.forEach(d => { if (d.classList.contains('empty')) add(d); });
      else if (kind === 'work') rows.plot.forEach(d => { if (!d.classList.contains('empty')) add(d); });
      else if (kind === 'assign') rows.plot.forEach(d => add(d.querySelector('[data-f=assign]')));
      else if (kind === 'market') add($('market-list'));
      else if (kind === 'ground') { add(rows.ground[id]); add(rows.act.fight); }
      else if (kind === 'skill') add(rows.skill[id]);
      else if (kind === 'talent') add(rows.talent[id]);
      else if (kind === 'hand') add(rows.hand[id]);
    }
  }
  // plots are rebuilt often; re-apply glow after rebuild

  // ---- Desktop layout: dock panels left/right; mobile: everything back under tabs ----
  const HOME = {}; // id -> {parent, next}
  function remember(id) { const e = $(id); if (!HOME[id]) HOME[id] = { parent: e.parentNode, next: e.nextSibling }; }
  function dock(id, dockId) { remember(id); $(dockId).appendChild($(id)); }
  function undock(id) { const h = HOME[id]; if (!h) return; h.parent.insertBefore($(id), h.next); }
  const RIGHT = { kingdom: 'tab-kingdom', attr: 'sub-attr', skills: 'sub-skills', talents: 'sub-talents', inventory: 'tab-inventory', market: 'tab-market' };
  let desktop = false;
  function applyLayout() {
    glowKey = '';
    document.documentElement.style.setProperty('--headh', document.querySelector('.sticky-head').offsetHeight + 'px');
    desktop = window.matchMedia('(min-width: 1024px)').matches;
    document.body.classList.toggle('desktop', desktop);
    if (desktop) {
      dock('sub-gear', 'dock-left'); $('sub-gear').classList.remove('hidden');
      $('gear-lists').classList.add('hidden'); dock('quest-card', 'dock-left'); dock('quest-done', 'dock-left');
      for (const k in RIGHT) dock(RIGHT[k], 'dock-right');
      // center shows only the hero's activity panel
      document.querySelectorAll('.tab').forEach(t => t.classList.toggle('hidden', t.id !== 'tab-hero'));
      $('sub-fight').classList.remove('hidden');
      $('hero-subtabs').classList.add('hidden');
      const cur = document.querySelector('[data-rtab].active'); rightShow(cur ? cur.dataset.rtab : 'kingdom');
    } else {
      $('gear-lists').classList.remove('hidden'); undock('quest-card'); undock('quest-done'); undock('sub-gear'); for (const k in RIGHT) undock(RIGHT[k]);
      $('hero-subtabs').classList.remove('hidden');
      const t = document.querySelector('[data-tab].active') || document.querySelector('[data-tab]');
      document.querySelectorAll('.tab').forEach(x => x.classList.toggle('hidden', x.id !== 'tab-' + t.dataset.tab));
      const s = document.querySelector('[data-sub].active') || document.querySelector('[data-sub]');
      document.querySelectorAll('.sub').forEach(x => x.classList.toggle('hidden', x.id !== 'sub-' + s.dataset.sub));
    }
  }
  function rightShow(key) { for (const k in RIGHT) $(RIGHT[k]).classList.toggle('hidden', k !== key); }

  // ---- Paper doll ----
  const DOLL = [['', 'helm', ''], ['weapon', 'chest', 'trinket'], ['', 'boots', '']];
  function renderDoll() {
    const S = Game.S, d = $('doll'), IS = desktop ? 22 : 28;
    let html = '<div class="doll-tools">';
    for (const s in CONFIG.toolSlots) { const def = CONFIG.toolSlots[s], it = S.hero.tools[s];
      html += `<div class="doll-wrap"><div class="doll-slot tool ${it ? 'filled' : 'empty'}" data-kind="tool" data-slot="${s}" title="${it ? CONFIG.toolTiers[it.tier].name + ' ' : ''}${def.name}">${ico(def.icon, IS, it ? '' : 'ghost')}<div class="doll-name">${def.name === 'Skinning Knife' ? 'Knife' : def.name}</div>${it ? `<div class="doll-tier">${CONFIG.toolTiers[it.tier].name}</div>` : ''}</div><div class="doll-lvl">${it ? 'Lv' + it.level : ''}</div></div>`; }
    html += '</div><div class="doll-gear">';
    for (const rowSlots of DOLL) { html += '<div class="doll-row">'; for (const s of rowSlots) {
      if (!s) { html += '<div class="doll-wrap"><div class="doll-slot blank"></div></div>'; continue; }
      const def = CONFIG.slots[s], it = S.hero.gear[s];
      html += `<div class="doll-wrap"><div class="doll-slot ${it ? 'filled' : 'empty'}" data-kind="gear" data-slot="${s}" title="${it ? Game.tierName(s, it.tier) + ' ' : ''}${def.name}">${ico(def.icon, IS, it ? '' : 'ghost')}<div class="doll-name">${def.name}</div>${it ? `<div class="doll-tier">${Game.tierName(s, it.tier)}</div>` : ''}</div><div class="doll-lvl">${it ? 'Lv' + it.level : ''}</div></div>`;
    } html += '</div>'; }
    html += '</div>';
    if (d.__h !== html) { setHtml(d, html); glowKey = ''; }
  }
  let slotOpen = null; // {row, home, next}
  function openSlot(kind, slot) {
    closeSlot();
    const row = kind === 'gear' ? rows.gear[slot] : rows.tool[slot]; if (!row) return;
    slotOpen = { row, home: row.parentNode, next: row.nextSibling };
    setText($('slot-title'), (kind === 'gear' ? CONFIG.slots[slot].name : CONFIG.toolSlots[slot].name));
    $('slot-holder').appendChild(row); $('slot-modal').classList.remove('hidden');
  }
  function closeSlot() { if (!slotOpen) return; slotOpen.home.insertBefore(slotOpen.row, slotOpen.next); slotOpen = null; $('slot-modal').classList.add('hidden'); }

  // ---- Plots (rebuilt when the plot list changes shape) ----
  rows.plot = [];
  function workerOptions(idx) {
    const S = Game.S, opts = [['', 'Unmanned · 1× output']];
    S.kingdom.thralls.forEach((t, i) => opts.push([String(i), t.name]));
    const cur = S.kingdom.plots[idx].worker; const curVal = cur === null ? '' : String(cur);
    return opts.map(([v, n]) => `<option value="${v}" ${v === curVal ? 'selected' : ''}>${n}</option>`).join('');
  }
  function buildPlots() {
    glowKey = '';
    const S = Game.S, grid = $('plot-grid'); grid.innerHTML = ''; rows.plot = [];
    S.kingdom.plots.forEach((p, idx) => {
      const d = el('div', 'plot');
      if (!p.type) {
        d.classList.add('empty'); d.innerHTML = `<div class="plus">+</div><div class="small">Build</div>`;
        d.addEventListener('click', () => openBuild(idx));
      } else {
        const t = Game.btype(p.type);
        d.innerHTML = `
          <div class="plot-title">${ico(t.icon, 20)} ${t.name} <span class="owned">Lv<b data-f="lvl">${p.level}</b></span></div>
          <div class="plot-job" data-f="job"></div>
          <div class="bar"><div data-f="prog"></div></div>
          <div class="worker-tag" data-f="worker"></div>
          <select data-f="assign" class="${S.kingdom.thralls.length ? '' : 'hidden'}">${workerOptions(idx)}</select>
          <div class="plot-actions"><button class="buy" data-f="up"><span class="small">Upgrade</span><br><span class="cost" data-f="upcost"></span></button></div>`;
        d.querySelector('[data-f=up]').addEventListener('click', () => { if (Game.upgradePlot(idx)) flash(d); });
        d.querySelector('[data-f=assign]').addEventListener('change', e => { const v = e.target.value; Game.assign(idx, v === '' ? null : +v); buildPlots(); });
      }
      rows.plot[idx] = d; grid.appendChild(d);
    });
    const cap = Game.plotCap();
    for (let i = S.kingdom.plots.length; i < cap; i++) { const d = el('div', 'plot locked', `<div class="small">Plot for sale</div>`); grid.appendChild(d); }
    if (cap < 12) { const d = el('div', 'plot locked', `<div class="small">More land at<br>Kingdom Lv${S.legacy.kingdomLevel + 1}</div>`); grid.appendChild(d); }
  }
  let buildTarget = null;
  function openBuild(idx) {
    buildTarget = idx; const list = $('build-list'); list.innerHTML = '';
    for (const cat in CONFIG.buildingCats) {
      list.appendChild(el('div', 'cat-title', CONFIG.buildingCats[cat]));
      const avail = CONFIG.buildingTypes.filter(t => t.cat === cat && Game.buildingUnlocked(t.id));
      if (!avail.length) { list.appendChild(el('div', 'dim small', 'Nothing researched yet.')); }
      for (const t of avail) {
        const cost = Game.buildCost(t.id), j = t.job;
        const b = el('button', 'build-opt');
        b.innerHTML = `${ico(t.icon, 28)}<div class="bo-main"><div class="bo-name">${t.name}</div><div class="bo-desc">${jobHtml(j.inputs, j.outputs)} · ${j.time}s</div></div><div class="cost">${costHtml(cost)}</div>`;
        b.disabled = !Game.canAfford(cost);
        b.addEventListener('click', () => { if (Game.build(idx, t.id)) { $('build-modal').classList.add('hidden'); buildPlots(); } });
        list.appendChild(b);
      }
    }
    $('build-modal').classList.remove('hidden');
  }
  function jobHtml(inputs, outputs) {
    const inp = Object.entries(inputs).map(([k, v]) => `<span class="costitem">${ico(R[k].icon, 14)}${Game.fmt(v)}</span>`).join(' ');
    const out = Object.entries(outputs).map(([k, v]) => `<span class="costitem">${ico(R[k].icon, 14)}${Game.fmt(v)}</span>`).join(' ');
    return (inp ? inp + ' <span class="arrow">→</span> ' : '') + out;
  }
  function renderPlots() {
    const S = Game.S, f = Game.fmt;
    if (rows.plot.length !== S.kingdom.plots.length) buildPlots();
    setText($('plots-count'), `${S.kingdom.plots.length} / ${Game.plotCap()}`);
    const busy = S.kingdom.plots.filter(p => typeof p.worker === 'number').length;
    setText($('thrall-summary'), S.kingdom.thralls.length ? `${S.kingdom.thralls.length} (${S.kingdom.thralls.length - busy} idle)` : 'none yet — found a kingdom to gain one');
    const pc = Game.plotCost(); setHtml($('buy-plot').querySelector('[data-f=cost]'), S.kingdom.plots.length >= Game.plotCap() ? '<span class="dim">no land</span>' : costHtml(pc));
    $('buy-plot').disabled = !Game.canBuyPlot();
    S.kingdom.plots.forEach((p, idx) => {
      const d = rows.plot[idx]; if (!p.type || !d) return;
      setHtml(d.querySelector('[data-f=job]'), jobHtml(Game.jobInputs(p), Game.jobOutputs(p)) + ` <span class="dim">· ${Game.jobTime(p).toFixed(1)}s</span>`);
      d.querySelector('[data-f=prog]').style.width = (p.running ? 100 * p.progress / Game.jobTime(p) : 0) + '%';
      setText(d.querySelector('[data-f=lvl]'), p.level);
      const w = p.worker; setText(d.querySelector('[data-f=worker]'), w === null ? (S.kingdom.thralls.length ? 'Unmanned · 1×' : 'Runs on its own · 1× (a thrall would give ' + CONFIG.thrallOutputMult + '×)') : `${S.kingdom.thralls[w] ? S.kingdom.thralls[w].name : 'Thrall'} works here · ${CONFIG.thrallOutputMult}×`);
      d.classList.toggle('working', p.running);
      const uc = Game.upgradeCost(idx); setHtml(d.querySelector('[data-f=upcost]'), costHtml(uc)); d.querySelector('[data-f=up]').disabled = !Game.canAfford(uc);
    });
  }

  // ---- Inventory ----
  let invKey = '', invItem = null;
  const rarityOf = k => Game.lootRarity(k);
  function renderInventory() {
    const S = Game.S, f = Game.fmt, keys = Object.keys(R).filter(k => S.lifetime[k] > 0);
    const key = keys.join(',');
    if (key !== invKey) {
      invKey = key; const g = $('inv-grid'); g.innerHTML = ''; rows.inv = {};
      for (const k of keys) {
        const d = el('div', 'inv-item loot-' + rarityOf(k)); d.title = R[k].name;
        d.innerHTML = `${ico(R[k].icon, 28)}<span class="inv-n" data-f="n">0</span><span class="inv-name">${R[k].name}</span>`;
        d.addEventListener('click', () => openItem(k)); rows.inv[k] = d; g.appendChild(d);
      }
      $('inv-empty').classList.toggle('hidden', keys.length > 0);
      renderBestiary();
    }
    const bKey = S.hero.ground + ':' + S.hero.bestStage + ':' + Object.keys(S.hero.bossesKilled).length + ':' + Object.values(S.hero.grounds).map(g => g.bestStage).join('/');
    if (bKey !== renderBestiary.key) { renderBestiary.key = bKey; renderBestiary(); }
    for (const k of keys) setText(rows.inv[k].querySelector('[data-f=n]'), f(Math.floor(S.res[k] || 0)));
    if (invItem) { setText($('item-have'), f(Math.floor(S.res[invItem] || 0))); const have = Math.floor(S.res[invItem] || 0); $('item-s1').disabled = have < 1; $('item-s10').disabled = have < 10; $('item-sall').disabled = have < 1; }
  }
  // Where does an item come from / what uses it — scanned from config so it stays true as the game changes.
  function itemSources(k) {
    const out = [];
    for (const hb of CONFIG.hand) if (hb.gives === k) out.push(`By hand: ${hb.name}`);
    for (const a in CONFIG.activities) { const A = CONFIG.activities[a]; if (A.outputs && A.outputs[k]) out.push(`Activity: ${A.name}`); }
    for (const b of CONFIG.buildingTypes) if (b.job.outputs[k]) out.push(`Building: ${b.name}`);
    for (const gid in CONFIG.grounds) { const G = CONFIG.grounds[gid], names = []; for (const T of G.line) { if (T.pool.some(p => p.k === k)) names.push(T.plural); if (T.unique === k) names.push(T.boss + ' (first kill)'); } if (names.length) out.push(`${G.name}: ${names.join(', ')}`); }
    if (k === 'gold') out.push('Market: selling anything', 'Bandits on the Roads, the dead in the Crypts');
    const gate = CONFIG.techs.find(t => t.unlocks.drop === k); if (gate) out.push(`Needs the ${gate.name} tech`);
    return out;
  }
  function itemUses(k) {
    const out = [];
    for (const t of CONFIG.techs) if (t.cost[k]) out.push(`Tech: ${t.name}`);
    CONFIG.tiers.forEach((t, i) => { const names = new Set(); if (t.craftCost[k] || t.upgradeCost[k]) names.add(t.name); if (t.perSlot) for (const sl in t.perSlot) { const ps = t.perSlot[sl]; if ((ps.craftCost && ps.craftCost[k]) || (ps.upgradeCost && ps.upgradeCost[k])) names.add(ps.name + ' ' + CONFIG.slots[sl].name.toLowerCase()); } if (names.size) out.push(`Gear: ${[...names].join(', ')}`); });
    for (const t of CONFIG.toolTiers) if (t.craftCost[k] || t.upgradeCost[k]) out.push(`Tools: ${t.name}`);
    for (const b of CONFIG.buildingTypes) { if (b.buildCost[k]) out.push(`Build: ${b.name}`); if (b.job.inputs[k]) out.push(`${b.name} turns it into ${Object.keys(b.job.outputs).map(o => R[o].name).join(', ')}`); }
    if (CONFIG.skillLevelCost[k]) out.push('Skill levels');
    if (k === 'gold') out.push('Plots, founding a kingdom, skill levels, later techs');
    return out;
  }
  function openItem(k) {
    invItem = k; const S = Game.S, f = Game.fmt, rar = rarityOf(k);
    setHtml($('item-icon'), ico(R[k].icon, 40)); setText($('item-name'), R[k].name);
    setText($('item-rarity'), R[k].kind === 'loot' ? CONFIG.rarities[rar].name + ' loot' : `Tier ${R[k].tier} resource`); $('item-rarity').style.color = CONFIG.rarities[rar].color;
    setText($('item-desc'), R[k].desc || '');
    setHtml($('item-from'), itemSources(k).map(x => `<div>· ${x}</div>`).join('') || '<span class="dim">—</span>');
    setHtml($('item-uses'), itemUses(k).map(x => `<div>· ${x}</div>`).join('') || '<span class="dim">Sell it, or keep it as a trophy.</span>');
    $('item-sell').classList.toggle('hidden', !R[k].sell); if (R[k].sell) setText($('item-price'), f(Game.sellPrice(k)));
    renderInventory(); $('item-modal').classList.remove('hidden');
  }
  function closeItem() { invItem = null; $('item-modal').classList.add('hidden'); }
  function renderBestiary() {
    const S = Game.S, box = $('bestiary'); let html = '';
    for (const gid in CONFIG.grounds) {
      const G = CONFIG.grounds[gid], gs = gid === S.hero.ground ? { bestStage: S.hero.bestStage } : (S.hero.grounds[gid] || { bestStage: 0 });
      const best = gs.bestStage || 0; if (!best) continue;
      html += `<div class="dim small" style="margin-top:8px">${G.name}</div>`;
      G.line.forEach((T, i) => {
        const first = i * CONFIG.stages.perType + 1; if (best < first) return;
        const bossStage = first + CONFIG.stages.perType - 1, bossDone = !!S.hero.bossesKilled[gid + ':' + bossStage];
        const pool = Game.stagePool(Math.min(best, bossStage), gid);
        html += `<div class="bestiary-row"><div><div class="b-name">${T.name}</div><div class="b-sub">${best >= bossStage ? 'Boss: ' + T.boss + (bossDone ? ' ✓' : '') : 'Reached ' + Math.min(best, bossStage) - first + 1 + '/' + CONFIG.stages.perType}</div></div><div class="b-pool">${Object.keys(pool).map(k => `<span class="costitem loot-${rarityOf(k)}" title="${R[k].name} ${Math.round(pool[k] * 100)}%">${ico(R[k].icon, 12)}</span>`).join('')}${T.unique && bossDone ? `<span class="costitem loot-rare" title="${R[T.unique].name}">${ico(R[T.unique].icon, 12)}</span>` : ''}</div></div>`;
      });
    }
    setHtml(box, html || '<span class="dim small">Fight something first.</span>');
  }

  // ---- Render ----
  let lastRender = 0;
  function render(force) {
    const now = performance.now(); if (!force && now - lastRender < 100) return; lastRender = now;
    const S = Game.S, f = Game.fmt, h = S.hero, st = Game.stats();

    const kr = Game.kingdomRates(), hr = Game.heroFighting() ? Game.heroRates() : {}, hrv = Game.heroFighting() ? {} : Game.harvestRates();
    for (const k in R) {
      const e = $('res-' + k), open = R[k].kind !== 'loot' && S.lifetime[k] > 0;
      e.classList.toggle('hidden', !open); if (!open) continue;
      setText(e.querySelector('[data-f=amt]'), f(S.res[k]));
      const rate = (kr[k] || 0) + (hr[k] || 0) + (hrv[k] || 0);
      const re = e.querySelector('[data-f=rate]'); setText(re, (rate > 0 ? '+' + f(rate) : '0') + '/s'); re.classList.toggle('zero', !(rate > 0));
    }
    if (desktop) { const hh = document.querySelector('.sticky-head').offsetHeight + 'px'; if (document.documentElement.style.getPropertyValue('--headh') !== hh) document.documentElement.style.setProperty('--headh', hh); }

    // Fight
    const eMax = Game.enemyMaxHp();
    setText($('stage'), Game.stageLabel()); setText($('best-stage'), Game.stageLabel(h.bestStage));
    for (const id in CONFIG.grounds) { const b = rows.ground[id], G = CONFIG.grounds[id], un = Game.groundUnlocked(id), gs = id === h.ground ? { stage: h.stage } : (h.grounds[id] || { stage: 1 }); b.classList.toggle('active', id === h.ground); b.disabled = !un; b.classList.toggle('locked', !un); setText(b.querySelector('[data-f=st]'), un ? Game.stageLabel(gs.stage, id) : G.reqText); }
    { const G = Game.ground(), drops = Game.groundDrops(), pool = Game.stagePool();
      const why = k => k === 'hide' ? (Game.dropUnlocked('hide') ? 'needs a Skinning Knife' : 'needs Skinning') : !Game.dropUnlocked(k) ? 'needs ' + (CONFIG.techs.find(t => t.unlocks.drop === k) || {}).name : '';
      const pills = Object.keys(pool).map(k => drops[k] !== undefined
        ? `<span class="costitem loot-${Game.lootRarity(k)}" title="${R[k].name} (${CONFIG.rarities[Game.lootRarity(k)].name})">${ico(R[k].icon, 14)}${drops[k] < 1 ? Math.round(drops[k] * 100) + '%' : f(drops[k])}</span>`
        : `<span class="costitem lack" title="${R[k].name}: ${why(k)}">${ico(R[k].icon, 14, 'ghost')}<span class="dim">${why(k)}</span></span>`).join(' ');
      setHtml($('ground-desc'), `${G.desc} <span class="dim">Loot per kill:</span> ${pills}` + (G.dropTool && S.hero.tools.knife && Game.dropUnlocked('hide') ? ` <span class="dim">· knife ×${Game.dropToolMult('knife').toFixed(1)}</span>` : '')); }
    $('boss-tag').classList.toggle('hidden', !Game.isBoss());
    setText($('hero-lvl'), h.level);
    $('hero-hpbar').style.width = (100 * h.hp / st.maxHp) + '%';
    setText($('hero-hptext'), `${f(h.hp)} / ${f(st.maxHp)}`);
    $('hero-xpbar').style.width = (100 * h.xp / CONFIG.hero.xpToLevel(h.level)) + '%';
    const buffs = Object.keys(Game.activeBuffs());
    setText($('hero-status'), (h.resting ? 'Resting…' : 'Fighting') + (buffs.length ? ' · ' + buffs.map(b => ({ attackPct: '⚔+', crit: '🎯+', dropPct: '💰+', dr: '🛡+' }[b] || b)).join(' ') : ''));
    setText($('enemy-name'), Game.enemyName());
    const eHp = h.enemyHp > 0 ? h.enemyHp : eMax;
    $('enemy-hpbar').style.width = (100 * eHp / eMax) + '%';
    setText($('enemy-hptext'), `${f(eHp)} / ${f(eMax)}`);
    setText($('enemy-dps'), f(Game.effectiveEnemyDps(st)));
    const need = Game.killsNeeded();
    $('kills-bar').style.width = Math.min(100, 100 * h.kills / need) + '%';
    setText($('kills-text'), `${Math.min(h.kills, need)} / ${need} kills`);
    $('advance-btn').disabled = !Game.canAdvance();
    setText($('advance-btn'), Game.isBoss() ? `Hunt ${Game.nextTypeName()} ▶` : Game.isBoss(h.stage + 1) ? `Face the ${Game.enemyName(h.stage + 1)} ▶` : 'Advance ▶');
    $('retreat-btn').disabled = h.stage <= 1;
    const dNext = Game.stageDanger(h.stage + 1), dHere = Game.stageDanger();
    setText($('danger'), dHere >= 1 ? '⚠ You cannot survive here. Retreat or gear up.'
      : Game.canAdvance() ? (dNext >= 1 ? '⚠ Next stage would kill you. Gear up first.' : dNext > 0.6 ? 'Next stage looks dangerous.' : 'Next stage looks fine.')
      : `Lose ${Math.round(dHere * 100)}% HP per fight here.`);
    setText(rows.basic.querySelector('[data-f=dps]'), `${f(st.attack)}/hit · ${f(st.dps)} DPS`);
    rows.basic.style.setProperty('--cd', h.resting ? 0 : Math.min(1, (h.atkTimer || 0) * st.speed));
    for (let i = 0; i < CONFIG.skillSlots; i++) {
      const b = rows.sbar[i], id = h.loadout[i];
      if (!id) { b.className = 'skill-btn empty'; b.dataset.id = ''; b.dataset.icon = ''; setHtml(b.querySelector('.sk-ico'), ''); setText(b.querySelector('.sk-name'), '—'); setText(b.querySelector('.sk-cd'), ''); b.disabled = true; continue; }
      const d = Game.skillDef(id), cd = Math.max(0, h.cds[id] || 0), ready = cd <= 0 && !h.resting;
      b.dataset.id = id; b.disabled = !ready;
      b.className = 'skill-btn' + (ready ? ' ready' : '');
      setText(b.querySelector('.sk-name'), d.name);
      if (b.dataset.icon !== id) { setHtml(b.querySelector('.sk-ico'), ico(d.icon, 24)); b.dataset.icon = id; }
      setText(b.querySelector('.sk-cd'), ready ? 'TAP' : cd.toFixed(1) + 's');
      b.style.setProperty('--cd', ready ? 0 : (cd / Game.skillCd(id)));
    }
    setHtml($('stat-grid'), [
      ['Attack', f(st.attack)], ['DPS', f(st.dps)], ['Atk speed', st.speed.toFixed(2) + '/s'],
      ['Crit', Game.pct(st.crit) + ' ×' + st.critDmg.toFixed(1)], ['Max HP', f(st.maxHp)], ['Regen', f(st.regen) + '/s'],
      ['Armor', f(st.armor) + (st.dr ? ' −' + Game.pct(st.dr) : '')], ['Drops', '×' + st.drop.toFixed(2)], ['Kills/s', Game.farmRate().toFixed(2)],
    ].map(([k, v]) => `<div><span class="dim">${k}</span><b>${v}</b></div>`).join(''));
    const showLog = S.settings.showLog !== false; $('log-card').classList.toggle('hidden', !showLog); if ($('set-log').checked !== showLog) $('set-log').checked = showLog;
    if (showLog) setHtml($('log'), S.log.slice(0, 8).map(l => `<div>${l}</div>`).join(''));
    for (const ev of Game.drainEvents()) hitPop(ev);
    const eff = Game.afkEfficiency(), afkHr = Object.entries(hr).filter(([, v]) => v > 0), afkKr = Object.entries(kr).filter(([, v]) => v > 0);
    setHtml($('afk-info'), `AFK mode: ${Game.pct(eff)} of this rate while closed (max ${Game.fmtTime(Game.afkCap())})` + (afkHr.length ? ` → ${afkHr.map(([k, v]) => `${ico(R[k].icon, 14)}${f(v * eff * 3600)}/h`).join(' ')}` : ' → XP only here') + (afkKr.length ? `, kingdom ${afkKr.map(([k, v]) => `${ico(R[k].icon, 14)}${f(v * eff * 3600)}/h`).join(' ')}` : ''));

    // Gear
    let anyGear = false;
    for (const slot in CONFIG.slots) {
      const row = rows.gear[slot], def = CONFIG.slots[slot], it = h.gear[slot];
      const up = row.querySelector('[data-f=up]'), forge = row.querySelector('[data-f=forge]');
      if (!it) {
        setHtml(row.querySelector('[data-f=title]'), `${def.name} <span class="owned">empty</span>`);
        setText(row.querySelector('[data-f=stats]'), `${STAT_LABEL[def.primary]}, ${STAT_LABEL[def.secondary]} from Tier 2`);
        setText(row.querySelector('[data-f=next]'), '');
        up.classList.add('hidden');
      } else {
        const cur = Game.itemStatPreview(slot, it.tier, it.level), nxt = Game.itemStatPreview(slot, it.tier, it.level + 1);
        setHtml(row.querySelector('[data-f=title]'), `${Game.tierName(slot, it.tier)} ${def.name} <span class="owned">Lv${it.level}</span>`);
        setText(row.querySelector('[data-f=stats]'), Object.entries(cur).map(([k, v]) => `${STAT_LABEL[k]} ${fs(k, v)}`).join(' · '));
        setText(row.querySelector('[data-f=next]'), 'Next: ' + Object.entries(nxt).map(([k, v]) => fs(k, v)).join(' · '));
        up.classList.remove('hidden');
        const uc = Game.gearUpgradeCost(slot); setHtml(up.querySelector('[data-f=upcost]'), costHtml(uc)); up.disabled = !Game.canAfford(uc); if (!up.disabled) anyGear = true;
      }
      const fc = Game.gearCraftCost(slot), can = Game.canTierUp(slot);
      if (!fc) forge.classList.add('hidden');
      else {
        forge.classList.remove('hidden');
        const nt0 = it ? it.tier + 1 : 0;
        setText(row.querySelector('[data-f=forgelbl]'), it ? `Forge ${Game.tierName(slot, nt0)}` : `Forge ${Game.tierName(slot, 0)}`);
        const nt = it ? it.tier + 1 : 0, techOk = Game.gearTierUnlocked(nt, slot);
        setHtml(forge.querySelector('[data-f=forgecost]'), can ? costHtml(fc) : techOk ? `<span class="dim">needs Lv${CONFIG.tierUpAt}</span>` : `<span class="dim">needs tech</span>`);
        forge.disabled = !can || !Game.canAfford(fc); if (!forge.disabled) anyGear = true;
      }
    }

    orderRows($('gear-list'), Object.keys(CONFIG.slots).map(s => ({ el: rows.gear[s], rank: (!rows.gear[s].querySelector('[data-f=up]').disabled || !rows.gear[s].querySelector('[data-f=forge]').disabled) ? 0 : 1 })));
    // Attributes
    const free = Game.attrPointsFree();
    setText($('attr-free'), free); $('badge-attr').classList.toggle('hidden', free <= 0);
    for (const k in CONFIG.attributes) { const row = rows.attr[k]; setText(row.querySelector('[data-f=pts]'), h.attr[k]); row.querySelector('[data-f=p1]').disabled = free < 1; row.querySelector('[data-f=p5]').disabled = free < 1; }
    setText($('respec-cost'), f(Game.respecCost())); $('respec-btn').disabled = S.res.gold < Game.respecCost();

    // Skills
    let anySkill = false;
    for (const s of CONFIG.skills) {
      const row = rows.skill[s.id], unlocked = Game.skillUnlocked(s.id), equipped = h.loadout.includes(s.id);
      row.classList.toggle('owned-row', !unlocked);
      setText(row.querySelector('[data-f=lock]'), unlocked ? '' : `(unlocks Lv${s.unlock})`);
      setText(row.querySelector('[data-f=lvl]'), h.skillLv[s.id]);
      const p = Game.skillPower(s.id) * st.skillPower;
      setText(row.querySelector('[data-f=desc]'), s.desc.replace('{p%}', Game.pct(p)).replace('{p}', p.toFixed(1)).replace('{d}', s.dur || ''));
      setText(row.querySelector('[data-f=cd]'), `Cooldown ${Game.skillCd(s.id).toFixed(1)}s`);
      const eq = row.querySelector('[data-f=equip]'); setText(eq, equipped ? 'Unequip' : 'Equip'); eq.classList.toggle('active', equipped);
      eq.disabled = !unlocked || (!equipped && h.loadout.length >= CONFIG.skillSlots);
      const lc = Game.skillLevelCost(s.id), lb = row.querySelector('[data-f=lvlup]'); setHtml(lb.querySelector('[data-f=cost]'), costHtml(lc)); lb.disabled = !unlocked || !Game.canAfford(lc); if (!lb.disabled) anySkill = true;
    }

    orderRows($('skill-list'), CONFIG.skills.map(s => ({ el: rows.skill[s.id], rank: !Game.skillUnlocked(s.id) ? 2 : (h.loadout.includes(s.id) ? 0 : (h.loadout.length < CONFIG.skillSlots ? 0 : 1)) })));
    // Talents
    const tfree = Game.talentPointsFree();
    setText($('talent-free'), tfree); $('badge-talents').classList.toggle('hidden', tfree <= 0);
    for (const b in CONFIG.talents) { const nodes = CONFIG.talents[b].nodes, list = rows.talent[nodes[0].id].parentNode; orderRows(list, nodes.map(n => ({ el: rows.talent[n.id], rank: (tfree > 0 && Game.talentAvailable(n.id)) ? 0 : (h.talents[n.id] || 0) >= n.max ? 2 : 1 }))); }
    for (const id in rows.talent) { const row = rows.talent[id]; setText(row.querySelector('[data-f=rank]'), h.talents[id] || 0); const av = Game.talentAvailable(id); row.classList.toggle('owned-row', !av && !(h.talents[id] > 0)); row.querySelector('[data-f=btn]').disabled = tfree <= 0 || !av; }
    $('badge-gear').classList.toggle('hidden', !anyGear);
    $('badge-hero').classList.toggle('hidden', !(free > 0 || tfree > 0 || anyGear || anySkill));

    // Kingdom
    renderPlots();
    const anyBuild = Game.canBuyPlot() || S.kingdom.plots.some((p, i) => !p.type ? CONFIG.buildingTypes.some(t => Game.buildingUnlocked(t.id) && Game.canAfford(Game.buildCost(t.id))) : false);
    $('badge-build').classList.toggle('hidden', !anyBuild);
    renderThrone();

    // Tech
    let anyTech = false;
    const CNAME = { kills: 'Enemies slain', bossKills: 'Bosses slain', stage: 'Best stage', foundings: 'Foundings' };
    for (const t of CONFIG.techs) {
      const row = rows.tech[t.id], done = Game.hasTech(t.id), pr = Game.techProgress(t);
      row.classList.toggle('done', done); row.classList.toggle('gated', !done && !pr.ok);
      setHtml(row.querySelector('[data-f=req]'), done ? '' : pr.parts.map(p => `<div class="req-line"><span>${CNAME[p.k] || (R[p.k] ? R[p.k].name + ' gathered' : p.k)}</span><span>${f(Math.min(p.have, p.need))} / ${f(p.need)}</span></div><div class="bar"><div style="width:${Math.min(100, 100 * p.have / p.need)}%"></div></div>`).join(''));
      const btn = row.querySelector('[data-f=btn]');
      setHtml(btn.querySelector('[data-f=cost]'), done ? 'Known' : costHtml(t.cost));
      btn.disabled = !Game.canResearch(t.id); if (!btn.disabled) anyTech = true;
    }
    CONFIG.techTiers.forEach((name, tier) => {
      const list = rows.tech[CONFIG.techs.find(t => t.tier === tier).id].parentNode;
      orderRows(list, CONFIG.techs.filter(t => t.tier === tier).map(t => ({ el: rows.tech[t.id], rank: Game.hasTech(t.id) ? 2 : Game.canResearch(t.id) ? 0 : 1 })));
    });
    $('badge-tech').classList.toggle('hidden', !anyTech);
    $('badge-kingdom').classList.toggle('hidden', !(anyBuild || anyTech || Game.canFound()));

    // Inventory (grid rebuilt only when the set of owned items changes; counts updated in place)
    renderInventory();
    // Market
    let anySell = false;
    for (const k in rows.market) {
      const row = rows.market[k], have = Math.floor(S.res[k] || 0);
      if (!(S.lifetime[k] > 0)) { row.classList.add('hidden'); continue; }
      row.classList.remove('hidden');
      setText(row.querySelector('[data-f=have]'), f(have)); setText(row.querySelector('[data-f=price]'), f(Game.sellPrice(k)));
      row.querySelector('[data-f=s1]').disabled = have < 1; row.querySelector('[data-f=s10]').disabled = have < 10; row.querySelector('[data-f=sall]').disabled = have < 1;
      if (have >= 1 && R[k].tier >= 2 && k !== 'gold') anySell = true;
    }
    orderRows($('market-list'), Object.keys(rows.market).map(k => ({ el: rows.market[k], rank: (S.res[k] || 0) >= 1 ? (R[k].tier >= 2 ? 0 : 1) : 2 })));
    $('badge-market').classList.toggle('hidden', !anySell);

    applyTabLocks();
    // Quest
    let q = Game.questCurrent(), goal = null;
    if (!q) goal = Game.suggestGoal();
    const showQ = q || goal;
    $('quest-card').classList.toggle('hidden', !showQ); $('quest-done').classList.toggle('hidden', !!showQ);
    $('quest-card').classList.toggle('goal', !q && !!goal);
    const CN = { kills: 'Enemies slain', bossKills: 'Bosses slain', stage: 'Best stage', foundings: 'Foundings' };
    const partHtml = (p, i, arr) => { const lab = p.label || (CN[p.k] || (R[p.k] ? R[p.k].name + ' gathered' : '')); const single = p.need === 1 || p.simple; const current = !p.done && arr.slice(0, i).every(x => x.done);
      return `<div class="qstep ${p.done ? 'done' : ''} ${current ? 'current' : ''}"><span class="qbox">${p.done ? '✓' : ''}</span><span class="qtext">${lab}</span>${single ? '' : `<span class="qcount">${f(Math.min(p.have, p.need))} / ${f(p.need)}</span>`}${single ? '' : `<div class="bar"><div style="width:${Math.min(100, 100 * p.have / p.need)}%"></div></div>`}</div>`; };
    if (q) {
      const pr = Game.questProgress(q);
      { const chain = q.chain || (CONFIG.quests.slice(0, S.quests.index).reverse().find(x => x.chain) || {}).chain || ''; const inChain = CONFIG.quests.filter((x, i) => (x.chain || (CONFIG.quests.slice(0, i).reverse().find(y => y.chain) || {}).chain) === chain); setText($('quest-n'), `${chain} · ${inChain.indexOf(q) + 1} / ${inChain.length}`); }
      setText($('quest-name'), q.name); setText($('quest-text'), q.text); setText($('quest-hint'), q.hint || ''); $('quest-hint').classList.toggle('hidden', !q.hint);
      setHtml($('quest-obj'), pr.parts.map(partHtml).join(''));
      setHtml($('quest-reward'), 'Reward: ' + Object.entries(q.reward).map(([k, v]) => k === 'talent' ? `<span class="costitem">★ ${v} talent point</span>` : `<span class="costitem">${ico(R[k].icon, 14)}${f(v)}</span>`).join(' '));
      $('quest-claim').classList.remove('hidden'); $('quest-claim').disabled = !pr.done; $('quest-card').classList.toggle('ready', pr.done);
    } else if (goal) {
      setText($('quest-n'), ''); setText($('quest-name'), goal.name); setText($('quest-text'), goal.text); setText($('quest-hint'), goal.hint); $('quest-hint').classList.remove('hidden');
      setHtml($('quest-obj'), goal.parts.map(partHtml).join('')); setHtml($('quest-reward'), ''); $('quest-claim').classList.add('hidden'); $('quest-card').classList.remove('ready');
    }
    applyQuestGlow(q || goal);

    { const col = handCollapsed(); $('hand-card').classList.toggle('collapsed', col); $('hand-toggle').setAttribute('aria-expanded', String(!col)); }
    // By hand
    for (const hd of CONFIG.hand) { const b = rows.hand[hd.id], ok = Game.handUnlocked(hd.id); b.disabled = !ok; b.classList.toggle('locked', !ok); setText(b.querySelector('[data-f=sub]'), ok ? `+1 ${R[hd.gives].name}` : (hd.unlock.tech ? 'needs ' + Game.techDef(hd.unlock.tech).name : hd.unlock.gear ? 'needs clothing' : 'locked')); }
    // Activity
    const act = h.activity;
    for (const id in CONFIG.activities) {
      const b = rows.act[id], a = CONFIG.activities[id], ok = Game.activityAvailable(id);
      b.classList.toggle('active', act === id); b.disabled = !ok;
      setText(b.querySelector('[data-f=sub]'), id === 'idle' ? 'heals' : id === 'fight' ? (ok ? (Object.entries(hr).filter(([, v]) => v > 0).slice(0, 2).map(([k, v]) => `${f(v)} ${R[k].name}/s`).join(', ') || 'XP & loot') : 'needs a weapon') : ok ? Object.entries(Game.harvestRates(id)).map(([k, v]) => `${f(v)} ${R[k].name}/s`).join(', ') : `needs ${CONFIG.toolSlots[a.tool].name.toLowerCase()}`);
    }
    setText($('activity-hint'), act === 'fight' || act === 'idle' ? CONFIG.activities[act].desc : CONFIG.activities[act].desc + ' Better tools, more Strength, and practice all speed this up.');
    const fighting = act === 'fight', idle = act === 'idle';
    $('fight-card').classList.toggle('hidden', !fighting); $('harvest-card').classList.toggle('hidden', fighting || idle);
    if (!fighting && !idle) {
      const a = CONFIG.activities[act], t = Game.harvestTime(act), y = Game.harvestYield(act), tool = h.tools[a.tool];
      setText($('harvest-title'), a.name);
      setHtml($('harvest-icon'), ico(a.icon, 48));
      setHtml($('harvest-yield'), 'Each swing: ' + Object.entries(y).map(([k, v]) => `<span class="costitem">${ico(R[k].icon, 16)}${f(v)}</span>`).join(' '));
      $('harvest-bar').style.width = Math.min(100, 100 * h.harvestTimer / t) + '%';
      setText($('harvest-time'), t.toFixed(1) + 's per swing');
      setText($('harvest-tool'), `${CONFIG.toolTiers[tool.tier].name} ${CONFIG.toolSlots[a.tool].name} Lv${tool.level} · power ×${Game.toolPower(a.tool).toFixed(2)}`);
      setText($('harvest-mastery'), `Mastery ${Game.masteryLevel(act)} (${h.mastery[act] || 0} swings)`);
      const hrv = Game.harvestRates(act);
      setHtml($('harvest-afk'), `AFK: ${Game.pct(Game.afkEff())} of this while closed (max ${Game.fmtTime(Game.afkCap())}) → ` + Object.entries(hrv).map(([k, v]) => `<span class="costitem">${ico(R[k].icon, 14)}${f(v * Game.afkEff() * 3600)}/h</span>`).join(' '));
    }
    renderMini(fighting, idle, act, st, eMax);
    // Tools
    for (const slot in CONFIG.toolSlots) {
      const row = rows.tool[slot], def = CONFIG.toolSlots[slot], it = h.tools[slot];
      const up = row.querySelector('[data-f=up]'), forge = row.querySelector('[data-f=forge]');
      if (!it) { setHtml(row.querySelector('[data-f=title]'), `${def.name} <span class="owned">none</span>`); setText(row.querySelector('[data-f=stats]'), def.activity ? `Needed to ${CONFIG.activities[def.activity].name.toLowerCase()}.` : `Needed to take ${R[def.boosts].name} in the Wilds. Better knife, better chance.`); up.classList.add('hidden'); }
      else {
        setHtml(row.querySelector('[data-f=title]'), `${CONFIG.toolTiers[it.tier].name} ${def.name} <span class="owned">Lv${it.level}</span>`);
        setText(row.querySelector('[data-f=stats]'), def.activity ? `Power ×${Game.toolPower(slot).toFixed(2)} → ${CONFIG.activities[def.activity].name}: ${Object.entries(Game.harvestRates(def.activity)).map(([k, v]) => `${f(v)} ${R[k].name}/s`).join(', ')}` : `Power ×${Game.toolPower(slot).toFixed(2)} → ${R[def.boosts].name} chance ×${Game.dropToolMult(slot).toFixed(2)}`);
        up.classList.remove('hidden'); const uc = Game.toolUpgradeCost(slot); setHtml(up.querySelector('[data-f=upcost]'), costHtml(uc)); up.disabled = !Game.canAfford(uc);
      }
      const fc = Game.toolCraftCost(slot), can = Game.canToolTierUp(slot), nt = it ? it.tier + 1 : 0;
      if (!fc) forge.classList.add('hidden');
      else { forge.classList.remove('hidden'); setText(row.querySelector('[data-f=forgelbl]'), it ? `Make ${CONFIG.toolTiers[nt].name}` : 'Make'); setHtml(forge.querySelector('[data-f=forgecost]'), can ? costHtml(fc) : (Game.toolTierUnlocked(nt) && Game.toolSlotUnlocked(slot)) ? `<span class="dim">needs Lv${CONFIG.tierUpAt}</span>` : `<span class="dim">needs tech</span>`); forge.disabled = !can || !Game.canAfford(fc); }
    }
    renderDoll();
  }

  const fmPick = { hero: null, kingdom: null };
  function openFound() {
    if (!Game.canFound()) return;
    const L = Game.S.legacy;
    fmPick.hero = L.heroPath || 'warrior'; fmPick.kingdom = L.kingdomPath || 'benevolent';
    setText($('fm-gain'), Game.knowledgeGain());
    setText($('fm-worker'), 'a new thrall');
    const build = (holder, list, key) => {
      holder.innerHTML = '';
      for (const p of list) {
        const b = el('button', 'path' + (fmPick[key] === p.id ? ' active' : ''));
        const ok = Game.pathUnlocked(p);
        b.innerHTML = `${ico(p.icon, 28)}<div><div class="path-name">${p.name}${ok ? '' : ` <span class="dim">(Kingdom Lv${p.unlock})</span>`}</div><div class="path-desc">${p.desc}</div></div>`;
        b.disabled = !ok;
        b.addEventListener('click', () => { fmPick[key] = p.id; holder.querySelectorAll('.path').forEach(x => x.classList.toggle('active', x === b)); $('fm-confirm').disabled = !(fmPick.hero && fmPick.kingdom); });
        holder.appendChild(b);
      }
    };
    build($('fm-hero'), CONFIG.legacy.heroPaths, 'hero'); build($('fm-kingdom'), CONFIG.legacy.kingdomPaths, 'kingdom');
    $('fm-confirm').disabled = false;
    $('found-modal').classList.remove('hidden');
  }
  function renderThrone() {
    const S = Game.S, L = S.legacy, f = Game.fmt;
    setText($('kingdom-level'), `Level ${L.kingdomLevel}`);
    const hp = Game.heroPath(), kp = Game.kingdomPath();
    setHtml($('paths-now'), hp || kp ? `${hp ? ico(hp.icon, 16) + ' ' + hp.name : ''} ${hp && kp ? '·' : ''} ${kp ? ico(kp.icon, 16) + ' ' + kp.name : ''}` : 'No path chosen yet — your first founding decides who you become.');
    setText($('knowledge'), L.knowledge); setText($('knowledge2'), L.knowledge); setText($('foundings'), L.foundings); setText($('throne-best'), S.hero.bestStage);
    setText($('found-gain'), '+' + Game.knowledgeGain());
    const cost = Game.foundCost(); setHtml($('found-cost'), costHtml(cost));
    const reqStage = CONFIG.legacy.foundRequiresStage, okStage = S.hero.bestStage >= reqStage;
    setText($('found-req'), okStage ? (Game.canAfford(cost) ? 'Ready.' : 'Sell goods to raise the gold.') : `Reach stage ${reqStage} to found (best: ${S.hero.bestStage}).`);
    $('found-btn').disabled = !Game.canFound();
    $('badge-throne').classList.toggle('hidden', !Game.canFound());
    let anyPerk = false;
    for (const p of CONFIG.legacy.perks) {
      const row = rows.perk[p.id], r = Game.perkRank(p.id), maxed = r >= p.max, c = Game.perkCost(p);
      setText(row.querySelector('[data-f=rank]'), r);
      setHtml(row.querySelector('[data-f=cost]'), maxed ? 'Max' : `${c} ◆`);
      const btn = row.querySelector('[data-f=btn]'); btn.disabled = maxed || L.knowledge < c; if (!btn.disabled) anyPerk = true;
    }
    orderRows($('perk-list'), CONFIG.legacy.perks.map(p => ({ el: rows.perk[p.id], rank: Game.perkRank(p.id) >= p.max ? 2 : (L.knowledge >= Game.perkCost(p) ? 0 : 1) })));
    $('badge-legacy').classList.toggle('hidden', !anyPerk);
    setHtml($('thrall-list'), S.kingdom.thralls.length ? S.kingdom.thralls.map((t, i) => { const p = S.kingdom.plots.findIndex(p => p.worker === i); return `<div class="row"><div class="row-main"><div class="row-title">${t.name}</div><div class="row-sub">${p >= 0 ? 'Working the ' + Game.btype(S.kingdom.plots[p].type).name : 'Idle — assign on the Buildings screen'}</div></div></div>`; }).join('') : '<div class="row"><div class="row-main dim">No thralls yet. Your first founding brings one.</div></div>');
    setHtml($('history'), L.history.length ? L.history.slice().reverse().map(h => `<div>Kingdom ${h.level}: stage ${h.bestStage}, hero Lv${h.heroLevel} → +${h.knowledge} Knowledge</div>`).join('') : '<div class="dim">No foundings yet.</div>');
  }
  // ---- Mini hero strip: mirrors the fight/harvest screen when that screen is off-tab ----
  const lootTally = {}; let lootFresh = {};
  // "visible" = the full card's bars are actually inside the viewport, not just on the current tab
  function heroScreenVisible() {
    const c = $('fight-card').offsetParent ? $('fight-card') : $('harvest-card').offsetParent ? $('harvest-card') : null; if (!c) return false;
    const r = c.getBoundingClientRect(), top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--headh')) || 0;
    return r.bottom - 40 > top && r.top + 120 < window.innerHeight;
  }
  function renderMini(fighting, idle, act, st, eMax) {
    const S = Game.S, h = S.hero, f = Game.fmt, show = !idle && !heroScreenVisible();
    $('mini-hero').classList.toggle('hidden', !show); document.body.classList.toggle('has-dock', show); if (!show) return;
    const m = $('mini-hero');
    if (desktop) { const cr = document.querySelector('.panel-center').getBoundingClientRect(); m.style.left = cr.left + 'px'; m.style.right = (window.innerWidth - cr.right) + 'px'; }
    else { m.style.left = ''; m.style.right = ''; }
    $('mini-advance').classList.toggle('hidden', !(fighting && Game.canAdvance()));
    if (fighting && Game.canAdvance()) setText($('mini-advance'), Game.isBoss() ? `Hunt ${Game.nextTypeName()} ▶` : 'Advance ▶');
    $('mini-hero-hp').style.width = (100 * h.hp / st.maxHp) + '%'; setText($('mini-hero-hptext'), `${f(h.hp)} / ${f(st.maxHp)}`);
    if (fighting) {
      setText($('mini-title'), `${h.resting ? 'Resting' : 'Fighting'} · ${Game.stageLabel()}`); setText($('mini-sub'), `${Game.enemyName()} · ${Game.ground().name}`);
      const eHp = h.enemyHp > 0 ? h.enemyHp : eMax; $('mini-target').classList.add('enemy');
      $('mini-target-bar').style.width = (100 * eHp / eMax) + '%'; setText($('mini-target-text'), `${f(eHp)} / ${f(eMax)}`);
      const need = Game.killsNeeded(); $('mini-action-bar').style.width = Math.min(100, 100 * h.kills / need) + '%'; setText($('mini-action-text'), `${Math.min(h.kills, need)} / ${need} kills${Game.canAdvance() ? ' · Advance ready' : ''}`);
    } else {
      const a = CONFIG.activities[act], t = Game.harvestTime(act), rates = Game.harvestRates(act);
      setText($('mini-title'), a.name); setText($('mini-sub'), Object.entries(rates).map(([k, v]) => `${f(v)} ${R[k].name}/s`).join(', '));
      $('mini-target').classList.remove('enemy'); const p = Math.min(1, h.harvestTimer / t);
      $('mini-target-bar').style.width = (100 * (1 - p)) + '%'; setText($('mini-target-text'), `${a.name} · ${Math.max(0, t - h.harvestTimer).toFixed(1)}s`);
      $('mini-action-bar').style.width = (100 * p) + '%'; setText($('mini-action-text'), `Mastery ${Game.masteryLevel(act)}`);
    }
    const keys = Object.keys(lootTally).filter(k => lootTally[k] > 0);
    setHtml($('mini-loot'), '<span class="dim small mini-loot-label">Gained</span>' + (keys.length ? keys.map(k => `<span class="costitem${lootFresh[k] ? ' fresh' : ''}" title="${R[k].name} gained since you opened the game">${ico(R[k].icon, 14)} ${f(lootTally[k])} ${R[k].name}</span>`).join('') : '<span class="dim small">nothing yet</span>'));
    lootFresh = {};
  }
  function tallyLoot(obj) { for (const k in obj) if (obj[k] > 0) { lootTally[k] = (lootTally[k] || 0) + obj[k]; lootFresh[k] = true; } }
  function hitPop(ev) {
    if (ev.who === 'loot') { tallyLoot(ev.loot); for (const b of [$('enemy-hpbar').parentElement, $('mini-target')]) { b.classList.remove('killed'); void b.offsetWidth; b.classList.add('killed'); setTimeout(() => b.classList.remove('killed'), 450); } }
    else if (ev.who === 'harvest') tallyLoot(ev.yield);
    if (!heroScreenVisible() && !$('mini-hero').classList.contains('hidden')) {
      // mini strip is what's on screen: float pops over it
      const a = ev.who === 'enemy' || ev.who === 'heal' ? $('mini-hero-hp').parentElement : $('mini-target'); const r = a.getBoundingClientRect(); if (!r.width) return;
      const txt = ev.who === 'loot' ? Object.entries(ev.loot).filter(([, v]) => v > 0).map(([k, v]) => `${ico(R[k].icon, 14)}+${Game.fmt(v)}`).join(' ')
        : ev.who === 'harvest' ? Object.entries(ev.yield).map(([k, v]) => `${ico(R[k].icon, 14)}+${Game.fmt(v)}`).join(' ')
        : (ev.who === 'heal' ? '+' : ev.who === 'enemy' ? '−' : '') + Game.fmt(ev.dmg) + (ev.crit ? '!' : '');
      if (!txt) return;
      const p = el('div', 'pop ' + (ev.who === 'loot' ? 'loot' : ev.who === 'hero' ? (ev.crit ? 'crit' : '') : ev.who === 'enemy' ? 'taken' : 'heal'), txt);
      p.style.left = (r.left + r.width * (0.3 + Math.random() * 0.4)) + 'px'; p.style.top = (r.top - 16) + 'px';
      document.body.appendChild(p); setTimeout(() => p.remove(), ev.who === 'loot' ? 1100 : 700); return;
    }
    if (ev.who === 'loot') {
      const a = $('enemy-hpbar').parentElement; if (!a.offsetParent) return; const r = a.getBoundingClientRect();
      let i = 0;
      for (const k in ev.loot) { const v = ev.loot[k]; if (!(v > 0)) continue;
        const p = el('div', 'pop loot loot-' + Game.lootRarity(k) + (ev.unique ? ' unique' : ''), `${ico(R[k].icon, 18)} +${Game.fmt(v)}${ev.unique ? ' ' + R[k].name : ''}`);
        p.style.left = (r.left + r.width * (0.35 + Math.random() * 0.3)) + 'px'; p.style.top = (r.top + 14 + i * 18) + 'px';
        document.body.appendChild(p); setTimeout(() => p.remove(), 1100); i++; }
      return;
    }
    if (ev.who === 'harvest') { const a = $('harvest-bar').parentElement; if (!a.offsetParent) return; const r = a.getBoundingClientRect(); const p = el('div', 'pop heal', Object.entries(ev.yield).map(([k, v]) => '+' + Game.fmt(v) + ' ' + R[k].name).join(' ')); p.style.left = (r.left + r.width * 0.5) + 'px'; p.style.top = (r.top - 4) + 'px'; document.body.appendChild(p); setTimeout(() => p.remove(), 700); return; }
    const anchor = ev.who === 'hero' ? $('enemy-hpbar').parentElement : $('hero-hpbar').parentElement;
    if (!anchor.offsetParent) return; const r = anchor.getBoundingClientRect(); if (!r.width) return;
    const p = el('div', 'pop ' + (ev.who === 'hero' ? (ev.crit ? 'crit' : ev.skill ? 'skill' : '') : ev.who === 'heal' ? 'heal' : 'taken'),
      (ev.who === 'heal' ? '+' : ev.who === 'enemy' ? '−' : '') + Game.fmt(ev.dmg) + (ev.crit ? '!' : '') + (ev.skill ? ' ' + ev.skill : ''));
    p.style.left = (r.left + r.width * (0.3 + Math.random() * 0.4)) + 'px'; p.style.top = (r.top - 4) + 'px';
    document.body.appendChild(p); setTimeout(() => p.remove(), 700);
  }
  function showWelcomeBack(data) {
    welcomeData = data;
    $('wb-time').textContent = Game.fmtTime(data.awaySeconds) + (data.counted < data.awaySeconds ? ` (capped ${Game.fmtTime(data.counted)})` : '');
    $('wb-kills').textContent = data.kills > 0 ? `Hero slew ${Game.fmt(data.kills)} enemies.` : 'Your hero kept working.';
    $('wb-eff').textContent = Game.pct(Game.afkEfficiency()); $('wb-cap').textContent = Game.fmtTime(Game.afkCap());
    $('wb-gains').innerHTML = Object.entries(data.gains).filter(([, v]) => v > 0).map(([k, v]) => `<div class="costitem">${ico(R[k].icon, 24)} +${Game.fmt(v)}</div>`).join('');
    $('welcome').classList.remove('hidden');
  }
  function claimWelcome(mult) { if (welcomeData) Game.claimOffline(welcomeData, mult); welcomeData = null; $('welcome').classList.add('hidden'); Game.save(); }

  return { init, render, showWelcomeBack };
})();

window.addEventListener('DOMContentLoaded', boot);
