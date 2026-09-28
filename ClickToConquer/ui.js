// ============================================================
// UI — Character (Fight/Gear/Attributes/Skills/Talents), Kingdom, Crafting
// ============================================================

const UI = (() => {
  const $ = id => document.getElementById(id);
  const R = CONFIG.resources;
  const STAT_LABEL = { attack: 'Damage', hp: 'Max HP', armor: 'Armor', speed: 'Atk speed', drop: 'Drops', crit: 'Crit', regen: 'Regen', dodge: 'Dodge', xp: 'XP' };
  const isPct = k => ['drop', 'crit', 'dodge', 'xp'].includes(k);
  // v0.3 gear readout: slot value (tier.level) and what it gives
  const fs = (k, v) => k === 'attack' ? v.toFixed(1) : k === 'speed' ? (1 + v).toFixed(2) + '/s' : k === 'hp' ? Math.round(v) + '' : k === 'armor' ? '−' + v.toFixed(2) + '/hit' : isPct(k) ? Game.pct(v, 0) : Game.fmt(v);
  let welcomeData = null;
  // Sprite icon: [row,col] on the icon sheet. size in px (16/24/32).
  const ico = (rc, size = 16, cls = '') => { if (!rc) return ''; const sc = size / CONFIG.iconSheet.cell; return `<span class="ico ${cls}" style="width:${size}px;height:${size}px;background-position:-${rc[1] * size}px -${rc[0] * size}px;background-size:${512 * sc}px auto"></span>`; };

  const costHtml = cost => !cost ? '<span class="dim">max level</span>' : Object.entries(cost).map(([k, v]) => `<span class="costitem ${(Game.S.res[k] || 0) >= v ? '' : 'lack'}" title="${Game.fmt(v)} ${R[k].name} (have ${Game.fmt(Game.S.res[k] || 0)})">${ico(R[k].icon, 16)}${Game.fmt(v)}<span class="cost-name">${R[k].name}</span></span>`).join(' ');
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  // DOM writes only when content changes — rewriting a button's children mid-click eats the click.
  const setHtml = (e, v) => { if (e.__h !== v) { e.innerHTML = v; e.__h = v; } };
  const setText = (e, v) => { if (e.__t !== v) { e.textContent = v; e.__t = v; } };
  const flash = row => { row.classList.remove('flash'); void row.offsetWidth; row.classList.add('flash'); };

  // In-game confirmation (no browser popups)
  let confirmCb = null;
  let infoFlag = null, marketMode = 'sell';
  function showInfo(label, title, html, flag) { infoFlag = flag; setText($('demo-label'), label); setText($('demo-title'), title); $('demo-text').innerHTML = html; $('demo-modal').classList.remove('hidden'); }
  function ask(title, text, yesLabel, cb) { setText($('confirm-title'), title); setText($('confirm-text'), text); setText($('confirm-yes'), yesLabel || 'Yes'); confirmCb = cb; $('confirm-modal').classList.remove('hidden'); }
  function closeAsk() { confirmCb = null; $('confirm-modal').classList.add('hidden'); }
  function init() {
    try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('portrait').catch(() => {}); } catch (e) {}
    $('confirm-no').addEventListener('click', closeAsk); $('confirm-modal').addEventListener('click', e => { if (e.target === $('confirm-modal')) closeAsk(); });
    $('confirm-yes').addEventListener('click', () => { const cb = confirmCb; closeAsk(); if (cb) cb(); });
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
      placeSubtabs();
    }));
    document.querySelectorAll('[data-sub]').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('[data-sub]').forEach(x => x.classList.toggle('active', x === b));
      const subs = desktop ? document.querySelectorAll('#tab-hero > .sub') : document.querySelectorAll('.sub');
      subs.forEach(t => t.classList.toggle('hidden', t.id !== 'sub-' + b.dataset.sub));
    }));
    $('advance-btn').addEventListener('click', () => Game.advance());
    $('mini-advance').addEventListener('click', () => Game.advance());
    $('retreat-btn').addEventListener('click', () => Game.retreat());
    $('respec-btn').addEventListener('click', () => ask('Respec', 'Reset all tree points across every discipline? Capstones are kept. Costs ' + Game.fmt(Game.respecCost()) + ' gold.', 'Respec', () => Game.respec()));
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
    $('quest-toggle').addEventListener('click', () => { const S = Game.S; S.settings.questCollapsed = !S.settings.questCollapsed; applyQuestCollapse(); });
    $('quest-claim').addEventListener('click', () => { if (Game.questClaim()) flash($('quest-card')); });
    $('dev-export').addEventListener('click', () => { $('dev-io').value = Game.exportSave(); $('dev-io').select(); });
    $('dev-import').addEventListener('click', () => { if (Game.importSave($('dev-io').value)) { buildLists(); alert('Imported.'); } else alert('Bad save string.'); });
    $('dev-reset-run').addEventListener('click', () => ask('Reset this run', 'Reset this run? Kingdom level, Crystals, perks and workers are kept.', 'Reset run', () => { { Game.debug.resetRun(); buildLists(); } }));
    $('dev-reset').addEventListener('click', () => ask('RESET ALL', 'RESET ALL progress? This wipes everything, including Crystals and Kingdom level.', 'Wipe everything', () => { Game.debug.resetAll(); }));
    // Kingdom sub-tabs
    document.querySelectorAll('[data-ksub]').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('[data-ksub]').forEach(x => x.classList.toggle('active', x === b));
      document.querySelectorAll('.ksub').forEach(t => t.classList.toggle('hidden', t.id !== 'ksub-' + b.dataset.ksub));
    }));
    document.querySelectorAll('[data-msub]').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('[data-msub]').forEach(x => x.classList.toggle('active', x === b));
      document.querySelectorAll('.msub').forEach(t => t.classList.toggle('hidden', t.id !== 'msub-' + b.dataset.msub));
    }));
    $('pick-cancel').addEventListener('click', () => $('pick-modal').classList.add('hidden'));
    $('pick-modal').addEventListener('click', e => { if (e.target.id === 'pick-modal') $('pick-modal').classList.add('hidden'); });
    document.querySelectorAll('[data-csub]').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.csub === 'best' && !Game.perkRank('bestiary')) { /* still show the locked card */ }
      document.querySelectorAll('[data-csub]').forEach(x => x.classList.toggle('active', x === b));
      document.querySelectorAll('.csub').forEach(t => t.classList.toggle('hidden', t.id !== 'csub-' + b.dataset.csub));
    }));
    $('set-reload').addEventListener('click', async () => { Game.save(); try { if (window.caches) { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } } catch (e) {} location.replace(location.pathname + '?v=' + Date.now()); });
    $('set-reset').addEventListener('click', () => ask('Reset all progress?', 'This wipes everything — hero, kingdom, Crystals, Legacy perks, trophies. There is no undo.', 'Wipe everything', () => Game.debug.resetAll()));
    $('tech-hide-known').addEventListener('change', e => { Game.S.settings.techHideKnown = e.target.checked; render(true); });
    $('offer-refresh').addEventListener('click', () => { if (Game.refreshOffers(true)) { $('hire-list').__h = ''; render(true); } });
    $('store-up').addEventListener('click', () => { if (Game.upgradeStore()) render(true); });
    $('item-pin').addEventListener('click', () => { if (invItem) { Game.togglePin(invItem); openItem(invItem); } });
    // Founding
    $('found-btn').addEventListener('click', openFound);
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
      $('found-modal').classList.add('hidden'); buildLists(); for (const l in lineKey) lineKey[l] = '';
      document.querySelector('[data-tab=hero]').click();
      if (Game.S.legacy.foundings === 1 && !Game.S.settings.demoSeen) showInfo('Kingdom 1', 'You founded a kingdom.', '<p class="small">The wild is behind you. From here on your land works while you are away.</p><p class="small"><b>Forest</b> — hire thralls in the Keep and put them to work at the Logging camp. Upgrade Work rate, Haul speed and Cart size with gold.</p><p class="small"><b>Keep</b> — fill Imperial Orders for gold and Renown. Earn <b>500 Renown</b> to found a new fief: each fief unlocks one new step, and pays out Crystals.</p><p class="small dim">Alpha 0.3 — numbers are rough and will change.</p>', 'demoSeen');
    });
    $('demo-continue').addEventListener('click', () => { if (infoFlag) Game.S.settings[infoFlag] = true; Game.save(); $('demo-modal').classList.add('hidden'); });
    if (Game.S.migrated03 && !Game.S.settings.migSeen) showInfo('Alpha 0.3', 'The kingdom has been rebuilt.', '<p class="small">Combat, gear and the whole kingdom were redesigned for 0.3, so your old run could not carry over. Your <b>Crystals, Legacy perks and Bestiary kills</b> are kept.</p><p class="small">The wild now starts with bare fists, a 100-item pack and a tribute to the Empire. Past it lies a new idle kingdom of production lines, thralls and Imperial Orders.</p>', 'migSeen');
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
          <button class="buy maxbtn" data-f="max"><span class="small">Max</span><br><span class="cost" data-f="maxn"></span></button>
          <button class="buy shard" data-f="forge"><span class="small" data-f="forgelbl">Forge</span><br><span class="cost" data-f="forgecost"></span></button>
        </div>`;
      row.querySelector('[data-f=up]').addEventListener('click', () => { if (Game.upgradeGear(slot)) flash(row); });
      row.querySelector('[data-f=max]').addEventListener('click', () => { if (Game.upgradeMax('gear', slot)) flash(row); });
      row.querySelector('[data-f=forge]').addEventListener('click', () => { if (Game.craftGear(slot)) flash(row); });
      rows.gear[slot] = row; gl.appendChild(row);
    }
    const tl = $('tool-list'); tl.innerHTML = ''; rows.tool = {};
    for (const slot in CONFIG.toolSlots) {
      const row = el('div', 'row gear-row');
      row.innerHTML = `${ico(CONFIG.toolSlots[slot].icon, 32, 'rowico')}<div class="row-main"><div class="row-title" data-f="title"></div><div class="row-sub" data-f="stats"></div></div>
        <div class="btn-col"><button class="buy" data-f="up"><span class="small">Upgrade</span><br><span class="cost" data-f="upcost"></span></button><button class="buy maxbtn" data-f="max"><span class="small">Max</span><br><span class="cost" data-f="maxn"></span></button><button class="buy shard" data-f="forge"><span class="small" data-f="forgelbl">Make</span><br><span class="cost" data-f="forgecost"></span></button></div>`;
      row.querySelector('[data-f=up]').addEventListener('click', () => { if (Game.upgradeTool(slot)) flash(row); });
      row.querySelector('[data-f=max]').addEventListener('click', () => { if (Game.upgradeMax('tool', slot)) flash(row); });
      row.querySelector('[data-f=forge]').addEventListener('click', () => { if (Game.craftTool(slot)) flash(row); });
      rows.tool[slot] = row; tl.appendChild(row);
    }
    buildDiscBar();
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
        row.querySelector('[data-f=btn]').addEventListener('click', () => { if (Game.research(t.id)) { flash(row); } });
        rows.tech[t.id] = row; list.appendChild(row);
      }
      wrap.appendChild(list); tx.appendChild(wrap);
    });
    document.querySelectorAll('#market-mode [data-mm]').forEach(b => b.onclick = () => { marketMode = b.dataset.mm; document.querySelectorAll('#market-mode [data-mm]').forEach(x => x.classList.toggle('active', x === b)); render(true); });
    const ml = $('market-list'); ml.innerHTML = ''; rows.market = {};
    for (const k in R) {
      if (!R[k].sell) continue;
      const row = el('div', 'row market-row hidden');
      row.innerHTML = `${ico(R[k].icon, 32, 'rowico')}<div class="row-main"><div class="row-title">${R[k].name} <span class="owned">×<b data-f="have">0</b></span></div><div class="row-sub"><span data-f="verb">Sells for</span> <span class="sellprice" data-f="price"></span> gold each · ${R[k].desc}</div></div>
        <div class="btn-col-h mm-sell"><button class="buy" data-f="s1">1</button><button class="buy" data-f="s10">10</button><button class="buy" data-f="sall">All</button></div>
        <div class="btn-col-h mm-buy hidden"><button class="buy" data-f="b1">+1</button><button class="buy" data-f="b10">+10</button><button class="buy" data-f="bmax">Max</button></div>`;
      row.querySelector('[data-f=b1]').addEventListener('click', () => { if (Game.buyRes(k, 1)) flash(row); });
      row.querySelector('[data-f=b10]').addEventListener('click', () => { if (Game.buyRes(k, 10)) flash(row); });
      row.querySelector('[data-f=bmax]').addEventListener('click', () => { if (Game.buyRes(k, 'max')) flash(row); });
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
      case 'kingdom': return reached('f02') || S.legacy.foundings > 0;
      case 'tech': return reached('f02');
      case 'forest': case 'farm': case 'mine': return Game.lineUnlocked(key);
      case 'keep': return reached('q17') || Game.bestStageAll() >= 20 || S.legacy.foundings > 0;
      case 'legacy': return S.legacy.foundings > 0 || S.legacy.knowledge > 0;
      case 'gear': return reached('f03');
      case 'skills': return S.hero.level >= 2 || reached('q02b') || Object.values(S.hero.dxp || {}).some(x => x > 0);
      case 'market': return reached('q14') || S.legacy.foundings > 0;
      case 'trade': return true;
      case 'tavern': return Game.kingdomNo() > 0;
      case 'inventory': return reached('q05') || Object.keys(R).some(k => R[k].kind === 'loot' && S.lifetime[k] > 0);
      default: return true;
    }
  }
  const TABKEY = b => b.dataset.tab || b.dataset.sub || b.dataset.ksub || b.dataset.msub || b.dataset.rtab;
  function applyTabLocks() {
    document.querySelectorAll('[data-tab],[data-sub],[data-ksub],[data-msub],[data-rtab]').forEach(b => {
      const key = TABKEY(b), ok = tabUnlocked(key);
      b.disabled = !ok; b.classList.toggle('locked-tab', !ok);
    });
    $('kline-row').classList.toggle('hidden', Game.kingdomNo() < 1);
    { const ma = document.querySelector('[data-msub].active'); if (ma && !tabUnlocked(ma.dataset.msub)) document.querySelector('[data-msub=trade]').click(); }
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
    if (F.msub) add(document.querySelector(`[data-msub=${F.msub}]`));
    if (F.rtab && desktop) add(document.querySelector(`[data-rtab=${F.rtab}]`));
    for (const sel of [F.el, F.el2]) {
      if (!sel) continue; const ci = sel.indexOf(':'), kind = sel.slice(0, ci), id = sel.slice(ci + 1);
      if (kind === 'tech') add(rows.tech[id]); else if (kind === 'tool') { add(rows.tool[id]); add(document.querySelector(`.doll-slot[data-slot=${id}]`)); } else if (kind === 'gear') { add(rows.gear[id]); add(document.querySelector(`.doll-slot[data-slot=${id}]`)); }
      else if (kind === 'act') add(rows.act[id]); else if (kind === 'id') add($(id));
      else if (kind === 'step') { const d = Game.stepDef(id); if (d && rows.step[d.line]) add(rows.step[d.line][id]); }
      else if (kind === 'market') add($('market-list'));
      else if (kind === 'ground') { add(rows.ground[id]); add(rows.act.fight); }
      else if (kind === 'perk') add(rows.perk[id]);
      else if (kind === 'node') { const [d, nid] = id.split(':'); if (curDisc !== d) { curDisc = d; buildTree(); } add(rows.node[nid]); add(rows.disc[d]); }
      else if (kind === 'hand') add(rows.hand[id]);
    }
  }
  // plots are rebuilt often; re-apply glow after rebuild

  // ---- Desktop layout: dock panels left/right; mobile: everything back under tabs ----
  const HOME = {}; // id -> {parent, next}
  function remember(id) { const e = $(id); if (!HOME[id]) HOME[id] = { parent: e.parentNode, next: e.nextSibling }; }
  function dock(id, dockId) { remember(id); $(dockId).appendChild($(id)); }
  function undock(id) { const h = HOME[id]; if (!h) return; h.parent.insertBefore($(id), h.next); }
  const RIGHT = { kingdom: 'tab-kingdom', skills: 'sub-skills', inventory: 'tab-inventory', market: 'tab-market' };
  let desktop = false;
  // Mobile: the active tab's sub-tab strip sits directly under the main tabs (in the sticky header)
  const SUBNAV = { hero: 'hero-subtabs', kingdom: 'kingdom-subtabs', inventory: 'csub-tabs', market: 'market-subtabs' };
  function placeSubtabs() {
    for (const k in SUBNAV) undock(SUBNAV[k]);
    if (desktop) return;
    const t = document.querySelector('[data-tab].active'); const id = t && SUBNAV[t.dataset.tab];
    if (id) { $(id).classList.remove('hidden'); dock(id, 'subtab-dock'); }
    document.documentElement.style.setProperty('--headh', document.querySelector('.sticky-head').offsetHeight + 'px');
  }
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
    placeSubtabs();
  }
  function rightShow(key) { for (const k in RIGHT) $(RIGHT[k]).classList.toggle('hidden', k !== key); }

  // ---- Paper doll ----
  const DOLL = [['', 'helm', ''], ['weapon', 'chest', 'gloves'], ['trinket', 'boots', '']];
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

  // ---- Kingdom v0.3: production line screens + Keep ----
  let kBuy = 1; const lineKey = {}; rows.step = {};
  const TRACK = { rate: 'Work rate', haul: 'Haul speed', cart: 'Cart size' };
  const ROLE = { foreman: 'Foreman · boosts Work rate', carter: 'Carter · boosts Haul speed', packer: 'Packer · boosts Cart size' };
  const roleShort = r => r[0].toUpperCase() + r.slice(1);
  const stars = n => '★'.repeat(n);
  function kbarHtml() { return `<div class="row-between"><span class="small dim">Upgrade by</span><span class="seg kbuy">${[1, 10, 'max'].map(v => `<button data-kbuy="${v}" class="${String(v) === String(kBuy) ? 'active' : ''}">${v === 'max' ? 'Max' : '×' + v}</button>`).join('')}</span></div>`; }
  function thrallOptions(sel, filterPost) {
    const S = Game.S; let o = `<option value="">— choose —</option>`;
    S.kingdom.thralls.forEach((t, i) => { const p = Game.thrallPost(i); o += `<option value="${i}" ${sel === i ? 'selected' : ''}>${t.name} ${stars(t.stars)} ${roleShort(t.role)}${p ? ' (at ' + Game.stepDef(p.id).name + ')' : ''}</option>`; });
    return o;
  }
  function buildLine(lid) {
    const S = Game.S, L = CONFIG.kingdom.lines[lid], box = $('line-' + lid); if (!box) return;
    let h = '';
    L.steps.forEach((st, i) => {
      const open = Game.stepUnlocked(st.id);
      if (i > 0) h += `<div class="kflow">▼ ${R[L.steps[i - 1].make].name}${open ? ' feed the ' + st.name : ''}</div>`;
      if (!open) { h += `<div class="card kstep locked-step"><div class="kstep-head">${ico(st.icon, 24)}<div><div class="kstep-name">${st.name}</div><div class="tiny dim">Makes ${R[st.make].name}${st.from ? ' from ' + R[st.from].name : ''}</div></div><div class="kout dim small">Unlocks with<br><b>Kingdom ${st.unlock}</b></div></div></div>`; return; }
      const ss = Game.stepState(st.id);
      h += `<div class="card kstep" data-step="${st.id}">
        <div class="kstep-head">${ico(st.icon, 24)}<div><div class="kstep-name">${st.name}</div><div class="tiny dim">${st.from ? `${st.ratio} ${R[st.from].name} → 1 ${R[st.make].name}` : 'Gathers ' + R[st.make].name}</div></div><div class="kout"><b data-f="out"></b> <span class="small dim">/s</span><div class="tiny" data-f="lim"></div></div></div>
        ${st.from ? `<div class="kin"><span class="small dim">${R[st.from].name} in</span><div class="bar green-bar"><div data-f="inbar"></div><span data-f="inlab"></span></div></div>` : ''}
        <div class="ktracks">${['rate', 'haul', 'cart'].map(t => `<div class="ktrack" data-t="${t}"><div><div class="ktl">${t === 'rate' && st.from ? 'Craft rate' : TRACK[t]} <span class="dim small">Lv <b data-f="lv"></b></span></div><div class="small dim" data-f="v"></div><div class="kflag hidden">Bottleneck</div></div><button class="buy" data-f="up"><span class="small" data-f="uplab">Upgrade</span><br><span class="cost" data-f="cost"></span></button></div>`).join('')}</div>
        <div class="bar kcart"><div data-f="cartbar"></div><span data-f="cartlab"></span></div>
        <div class="kstaff">
          <div class="kslot"><span class="small dim">Workers <b data-f="wn"></b></span><span data-f="wlist" class="small"></span><button data-f="wadd" class="buy kpick">+ Add worker</button></div>
          <div class="kslot"><span class="small dim">Overseer</span><span data-f="ov" class="small"></span><button data-f="ovsel" class="buy kpick">Choose</button><button data-f="ab" class="buy small-btn">Double shift</button></div>
        </div>
      </div>`;
    });
    const steps = Game.lineSteps(lid), last = steps[steps.length - 1];
    if (last) h += `<div class="kflow">▼ ${R[last.make].name} to the Storehouse</div>`;
    box.innerHTML = h; rows.step[lid] = {};
    box.querySelectorAll('[data-step]').forEach(card => {
      const id = card.dataset.step; rows.step[lid][id] = card;
      card.querySelectorAll('[data-t]').forEach(tr => tr.querySelector('[data-f=up]').addEventListener('click', () => { if (Game.upgradeStep(id, tr.dataset.t, kBuy)) { flash(tr); render(true); } }));
      card.querySelector('[data-f=wadd]').addEventListener('click', () => openPicker(id, 'worker', lid));
      card.querySelector('[data-f=ovsel]').addEventListener('click', () => openPicker(id, 'overseer', lid));
      card.querySelector('[data-f=ab]').addEventListener('click', () => { if (Game.useAbility(id)) flash(card); });
    });
    box.closest('.ksub').querySelector('[data-kbar]').innerHTML = kbarHtml();
    box.closest('.ksub').querySelectorAll('[data-kbuy]').forEach(b => b.addEventListener('click', () => { kBuy = b.dataset.kbuy === 'max' ? 'max' : +b.dataset.kbuy; for (const l in lineKey) lineKey[l] = ''; render(true); }));
    glowKey = '';
  }
  function renderLine(lid) {
    const S = Game.S, f = Game.fmt;
    const key = Game.kingdomNo() + '|' + S.kingdom.thralls.length + '|' + kBuy + '|' + Game.lineSteps(lid).map(st => { const s = Game.stepState(st.id); return s.workers.join(',') + '/' + s.overseer + '/' + Game.stepWorkerSlots(st.id); }).join(';');
    if (lineKey[lid] !== key) { lineKey[lid] = key; buildLine(lid); }
    let anyUp = false;
    for (const st of Game.lineSteps(lid)) {
      const card = rows.step[lid] && rows.step[lid][st.id]; if (!card) continue;
      const s = Game.stepState(st.id), m = Game.stepMods(st.id), hasOv = s.overseer !== null, lim = Game.stepLimit(st.id);
      setText(card.querySelector('[data-f=out]'), m.working ? Game.stepOutput(st.id).toFixed(2) : '0');
      const limTxt = !m.working ? '<span class="warn">No workers</span>' : !hasOv ? '<span class="dim">no overseer to report</span>'
        : lim === 'starved' ? `<span class="warn">Waiting for ${R[st.from].name.toLowerCase()}</span>` : lim === 'full' ? '<span class="warn">Storehouse full</span>' : `<span class="dim">limited by ${lim === 'rate' ? (st.from ? 'craft rate' : 'work rate') : 'haul'}</span>`;
      setHtml(card.querySelector('[data-f=lim]'), limTxt);
      for (const t of ['rate', 'haul', 'cart']) {
        const tr = card.querySelector(`[data-t=${t}]`); setText(tr.querySelector('[data-f=lv]'), s[t]);
        setText(tr.querySelector('[data-f=v]'), t === 'rate' ? `${Game.stepRate(st.id).toFixed(2)} made /s` : t === 'haul' ? `${Game.stepRoundTrip(st.id).toFixed(1)}s round trip` : `${Game.stepCart(st.id)} per cart`);
        const bn = hasOv && m.working && ((lim === 'rate' && t === 'rate') || (lim === 'haul' && t !== 'rate'));
        tr.classList.toggle('bottleneck', bn); tr.querySelector('.kflag').classList.toggle('hidden', !bn);
        const p = Game.stepUpPlan(st.id, t, kBuy), btn = tr.querySelector('[data-f=up]');
        setText(tr.querySelector('[data-f=uplab]'), p.n > 1 ? `Upgrade +${p.n}` : 'Upgrade');
        setHtml(tr.querySelector('[data-f=cost]'), costHtml(p.n ? p.cost : Game.stepUpCost(st.id, t)));
        btn.disabled = !p.n; if (p.n) anyUp = true;
      }
      const cap = Game.stepCart(st.id), T = Game.stepRoundTrip(st.id);
      card.querySelector('[data-f=cartbar]').style.width = (s.trip > 0 ? 100 * (1 - s.trip / T) : 100 * s.load / cap) + '%';
      setText(card.querySelector('[data-f=cartlab]'), !m.working ? 'Idle — no workers' : s.trip > 0 ? `Cart on the road · ${Math.max(0, s.trip).toFixed(1)}s` : `Cart loading · ${Math.floor(s.load)} / ${cap} ${R[st.make].name.toLowerCase()}`);
      if (st.from) { card.querySelector('[data-f=inbar]').style.width = Math.min(100, 100 * s.inBuf / Math.max(8, cap * 2)) + '%'; setText(card.querySelector('[data-f=inlab]'), `${Math.floor(s.inBuf)} waiting`); }
      setText(card.querySelector('[data-f=wn]'), `${s.workers.length}/${Game.stepWorkerSlots(st.id)}`);
      setHtml(card.querySelector('[data-f=wlist]'), s.workers.map(i => `<span class="kchip">${S.kingdom.thralls[i].name} <button class="kx" data-rm="${i}" aria-label="Remove">×</button></span>`).join(' ') || '<span class="warn">none</span>');
      card.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { Game.unassign(+b.dataset.rm); lineKey[lid] = ''; render(true); });
      const wsel = card.querySelector('[data-f=wadd]'); wsel.classList.toggle('hidden', s.workers.length >= Game.stepWorkerSlots(st.id));
      const ov = s.overseer !== null ? S.kingdom.thralls[s.overseer] : null;
      setHtml(card.querySelector('[data-f=ov]'), ov ? `<b>${ov.name}</b> <span class="stars">${stars(ov.stars)}</span> <span class="dim">${roleShort(ov.role)} ×${CONFIG.kingdom.starMult[ov.stars]}</span>` : '<span class="dim">empty</span>');
      setText(card.querySelector('[data-f=ovsel]'), ov ? 'Change' : 'Choose');
      const ab = card.querySelector('[data-f=ab]'), now = S.hero.time; ab.classList.toggle('hidden', !ov);
      if (ov) { ab.disabled = s.abilityReady > now; setText(ab, s.abilityUntil > now ? `Active ${Math.ceil(s.abilityUntil - now)}s` : s.abilityReady > now ? `Ready in ${Game.fmtTime(s.abilityReady - now)}` : 'Double shift'); }
    }
    return anyUp;
  }
  function buildKeepLists() {}
  // In-game picker for staffing a step (replaces native dropdowns)
  function openPicker(stepId, as, lid) {
    const S = Game.S, K = S.kingdom, st = Game.stepDef(stepId), ss = Game.stepState(stepId), list = $('pick-list');
    setText($('pick-title'), as === 'worker' ? `Worker for the ${st.name}` : `Overseer for the ${st.name}`);
    setText($('pick-sub'), as === 'worker' ? 'Workers run the step. Strength adds to cart size, Speed to work rate.' : 'An Overseer reports the bottleneck and boosts one track by role: Foreman → work rate, Carter → haul speed, Packer → cart size.');
    const close = () => { $('pick-modal').classList.add('hidden'); lineKey[lid] = ''; render(true); };
    let h = '';
    if (as === 'overseer' && ss.overseer !== null) h += `<button class="pick-row danger-btn" data-pick="remove"><div class="row-main"><b>Remove ${K.thralls[ss.overseer].name}</b><div class="small dim">Leave the Overseer slot empty</div></div></button>`;
    const cand = K.thralls.map((t, i) => ({ t, i, p: Game.thrallPost(i) })).filter(c => as === 'worker' ? !ss.workers.includes(c.i) : c.i !== ss.overseer)
      .sort((a, b) => (!!a.p - !!b.p) || (b.t.stars - a.t.stars));
    for (const c of cand) {
      const where = c.p ? `${c.p.as === 'overseer' ? 'Overseer' : 'Worker'} at the ${Game.stepDef(c.p.id).name}` : 'Idle';
      const perk = as === 'worker' ? `Str ${c.t.str} · Spd ${c.t.spd}` : `${ROLE[c.t.role]} ×${CONFIG.kingdom.starMult[c.t.stars]}`;
      h += `<button class="pick-row" data-pick="${c.i}"><div class="row-main"><b>${c.t.name}</b> <span class="stars">${stars(c.t.stars)}</span> <span class="owned">${roleShort(c.t.role)}</span><div class="small dim">${perk}</div></div><span class="tag ${c.p ? '' : 'idle'}">${c.p ? 'Move from ' + Game.stepDef(c.p.id).name : 'Idle'}</span></button>`;
    }
    if (!cand.length) h += `<div class="dim small center" style="padding:8px 0">${K.thralls.length ? 'Every thrall is already here.' : 'You have no thralls yet.'}</div><button class="pick-row" data-pick="tavern"><div class="row-main"><b>Go to the Tavern</b><div class="small dim">Market → Tavern: hire a thrall</div></div><span class="tag">▶</span></button>`;
    list.innerHTML = h;
    list.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => {
      const v = b.dataset.pick;
      if (v === 'tavern') { $('pick-modal').classList.add('hidden'); goTavern(); return; }
      if (v === 'remove') { ss.overseer = null; }
      else if (as === 'worker') Game.assignWorker(stepId, +v); else Game.assignOverseer(stepId, +v);
      close();
    });
    $('pick-modal').classList.remove('hidden');
  }
  function goTavern() {
    if (desktop) { const r = document.querySelector('[data-rtab=market]'); if (r) r.click(); } else document.querySelector('[data-tab=market]').click();
    document.querySelector('[data-msub=tavern]').click();
  }
  function renderKeep() {
    const S = Game.S, f = Game.fmt, K = S.kingdom, inK = Game.kingdomNo() > 0;
    $('keep-kingdom').classList.toggle('hidden', !inK); if (!inK) return false;
    const ri = Game.rankInfo();
    setText($('rank-now'), `${ri.cur.name}${ri.next ? '' : ' (highest)'}`);
    $('rank-bar').style.width = (ri.next ? 100 * (ri.renown - ri.cur.renown) / (ri.next.renown - ri.cur.renown) : 100) + '%';
    setText($('rank-text'), ri.next ? `${f(ri.renown)} / ${f(ri.next.renown)} to ${ri.next.name}` : f(ri.renown));
    setText($('rank-next'), ri.next ? `${ri.next.name}: ${ri.next.perk}` : ri.cur.perk);
    // orders
    let anyOrder = false;
    const oh = (K.orders || []).map((o, i) => { const can = Game.canDeliver(i); if (can) anyOrder = true; const left = o.bonusBy - S.hero.time;
      return `<div class="korder"><div class="row-between"><b>${o.from}</b><span class="small ${left > 0 ? 'good' : 'dim'}">${left > 0 ? 'Speed bonus ' + Game.fmtTime(left) : 'No bonus'}</span></div>
      ${Object.entries(o.wants).map(([k, n]) => `<div class="bar kob"><div style="width:${Math.min(100, 100 * (S.res[k] || 0) / n)}%"></div><span>${R[k].name} ${f(Math.min(S.res[k] || 0, n))} / ${n}</span></div>`).join('')}
      <div class="row-between"><span class="small">Pays <b class="accent-inline">${f(o.gold)} gold · ${o.renown} Renown</b></span><span style="display:flex;gap:6px"><button class="buy kswap" data-swap="${i}" ${Game.swapReady() ? '' : 'disabled'} title="Swap for a different order (every 2 min)">⇄</button><button class="buy" data-deliver="${i}" ${can ? '' : 'disabled'}><span class="small">Deliver</span></button></span></div></div>`; }).join('');
    const ol = $('order-list'); if (ol.__h !== oh) { ol.innerHTML = oh || '<div class="dim small">No orders yet — produce something first.</div>'; ol.__h = oh; ol.querySelectorAll('[data-deliver]').forEach(b => b.onclick = () => { if (Game.deliver(+b.dataset.deliver)) { ol.__h = ''; render(true); } }); ol.querySelectorAll('[data-swap]').forEach(b => b.onclick = () => { if (Game.swapOrder(+b.dataset.swap)) { ol.__h = ''; render(true); } }); }
    // hiring
    setText($('offer-timer'), Game.fmtTime(Math.max(0, K.offerTimer || 0))); setText($('refresh-cost'), CONFIG.kingdom.refreshCost); $('offer-refresh').disabled = (S.res.gold || 0) < CONFIG.kingdom.refreshCost;
    const hh = (K.offers || []).map((o, i) => `<div class="row koffer"><div class="row-main"><div class="row-title">${o.name} <span class="stars">${stars(o.stars)}</span></div><div class="row-sub">${ROLE[o.role]} ×${CONFIG.kingdom.starMult[o.stars]}</div><div class="row-sub dim">Strength ${o.str} (cart) · Speed ${o.spd} (rate)</div></div><button class="buy" data-hire="${i}" ${(S.res.gold || 0) >= o.price ? '' : 'disabled'}><span class="small">Hire</span><br><span class="cost">${costHtml({ gold: o.price })}</span></button></div>`).join('');
    const hl = $('hire-list'); if (hl.__h !== hh) { hl.innerHTML = hh; hl.__h = hh; hl.querySelectorAll('[data-hire]').forEach(b => b.onclick = () => { if (Game.hire(+b.dataset.hire)) { hl.__h = ''; for (const l in lineKey) lineKey[l] = ''; render(true); } }); }
    // roster
    setText($('roster-count'), `${K.thralls.length} hired`);
    const rh = K.thralls.map((t, i) => { const p = Game.thrallPost(i); return `<div class="row"><div class="row-main"><div class="row-title">${t.name} <span class="stars">${stars(t.stars)}</span> <span class="owned">${roleShort(t.role)}</span></div><div class="row-sub">${p ? (p.as === 'overseer' ? 'Overseer' : 'Worker') + ' at the ' + Game.stepDef(p.id).name : '<span class="warn">Idle — Kingdom → a line → + Add worker</span>'} · Str ${t.str} · Spd ${t.spd} · ${f(t.xp || 0)} jobs</div></div></div>`; }).join('');
    const rl = $('roster'); if (rl.__h !== rh) { rl.innerHTML = rh || '<div class="dim small">Nobody yet. Hire someone above.</div>'; rl.__h = rh; }
    // storehouse
    setText($('store-lv'), K.storeLv || 0); setText($('store-cap'), f(Game.storeCap('wood')));
    const goods = Game.allSteps().filter(st => Game.stepUnlocked(st.id)).map(st => st.make);
    setHtml($('store-list'), goods.map(k => `<div class="row-between small"><span>${ico(R[k].icon, 14)} ${R[k].name}</span><span class="${Game.atCap(k) ? 'warn' : ''}">${f(S.res[k] || 0)} / ${f(Game.resCap(k))}</span></div>`).join(''));
    const sc = Game.storeUpCost(); setHtml($('store-cost'), costHtml(sc)); $('store-up').disabled = !Game.canAfford(sc);
    const canHire = (K.offers || []).some(o => (S.res.gold || 0) >= o.price) && K.thralls.length < 2;
    $('badge-tavern').classList.toggle('hidden', !canHire);
    return anyOrder;
  }


  const techHideKnown = () => Game.S.settings.techHideKnown !== false; // default on
  // ---- Quest card collapse: header, name, next step and Claim only ----
  function applyQuestCollapse() { const col = !!Game.S.settings.questCollapsed; $('quest-card').classList.toggle('collapsed', col); $('quest-toggle').setAttribute('aria-expanded', String(!col)); $('quest-toggle').title = col ? 'Expand' : 'Collapse'; }

  // ---- Forging progress: the forge button becomes a filling bar while the item is being made ----
  function forgeState(forge, kind, slot, label) {
    const cr = Game.crafting(), mine = cr && cr.kind === kind && cr.slot === slot;
    forge.classList.toggle('forging', !!mine); forge.classList.toggle('busy', !!cr && !mine);
    if (mine) { forge.style.setProperty('--p', (100 * cr.t / cr.total) + '%'); setHtml(forge, `<span class="small">${kind.endsWith('Up') ? 'Upgrading…' : 'Forging…'}</span><br><span class="cost">${(cr.total - cr.t).toFixed(1)}s</span>`); forge.disabled = true; return true; }
    const costF = kind.endsWith('Up') ? 'upcost' : 'forgecost';
    if (!forge.querySelector('[data-f=' + costF + ']')) { forge.innerHTML = kind.endsWith('Up') ? `<span class="small">${label}</span><br><span class="cost" data-f="upcost"></span>` : `<span class="small" data-f="forgelbl">${label}</span><br><span class="cost" data-f="forgecost"></span>`; }
    forge.style.removeProperty('--p'); return false;
  }

  // ---- Skill trees ----
  let curDisc = 'combat'; rows.disc = {}; rows.node = {}; let treeKey = '';
  function buildDiscBar() {
    const bar = $('disc-bar'); bar.innerHTML = ''; rows.disc = {};
    for (const d in CONFIG.disciplines) {
      const D = CONFIG.disciplines[d], b = el('button', 'disc-btn' + (d === curDisc ? ' active' : ''));
      b.innerHTML = `${ico(D.icon, 22)}<span>${D.name}<span class="dot hidden" data-f="dot"></span></span><span class="d-lvl" data-f="lvl">Lv1</span>`;
      b.addEventListener('click', () => { curDisc = d; buildDiscBar(); buildTree(); render(true); });
      rows.disc[d] = b; bar.appendChild(b);
    }
    buildTree();
  }
  function buildTree() {
    const nodes = CONFIG.trees[curDisc] || [], box = $('tree'); box.innerHTML = ''; rows.node = {}; treeKey = '';
    const rowsN = {}; for (const n of nodes) (rowsN[n.row] = rowsN[n.row] || []).push(n);
    const rowIdx = Object.keys(rowsN).map(Number).sort((a, b) => a - b);
    rowIdx.forEach((r, i) => {
      const list = rowsN[r];
      if (i > 0) { const link = el('div', 'tree-link'); link.style.gridTemplateColumns = `repeat(${list.length}, 1fr)`; link.innerHTML = list.map(n => `<i data-link="${n.id}"></i>`).join(''); box.appendChild(link); }
      const row = el('div', 'tree-row'); row.style.gridTemplateColumns = `repeat(${list.length}, 1fr)`;
      for (const n of list) {
        const d = el('div', 'node' + (n.capstone ? ' capstone' : '') + (n.tech ? ' tech' : ''));
        d.innerHTML = `${ico(n.icon, 24)}<div class="n-name">${n.name}</div><div class="n-rank" data-f="rank"></div><div class="n-desc">${n.desc}</div><div class="n-bar"><div data-f="bar"></div></div><button class="buy" data-f="btn">+</button>`;
        d.title = n.parent ? `Opens when ${(nodes.find(x => x.id === n.parent) || {}).name} is maxed` : '';
        d.querySelector('[data-f=btn]').addEventListener('click', () => { if (Game.rankNode(curDisc, n.id)) { flash(d); render(true); } });
        rows.node[n.id] = d; row.appendChild(d);
      }
      box.appendChild(row);
    });
    glowKey = '';
  }
  function renderTrees() {
    const S = Game.S, f = Game.fmt; let any = false;
    for (const d in CONFIG.disciplines) { const b = rows.disc[d]; if (!b) continue; const pr = Game.discProgress(d), fr = Game.treePointsFree(d); setText(b.querySelector('[data-f=lvl]'), `Lv${pr.level}`); b.querySelector('[data-f=dot]').classList.toggle('hidden', fr <= 0); if (fr > 0) any = true; }
    const tfree = Game.talentPointsFree(); if (tfree > 0) any = true;
    const D = CONFIG.disciplines[curDisc], pr = Game.discProgress(curDisc);
    setText($('disc-name'), `${D.name} Lv${pr.level}`); setText($('disc-desc'), D.desc); setText($('disc-how'), curDisc === 'combat' ? 'You get 1 every time Combat levels up. Combat XP comes from kills.' : `You get 1 every time ${D.name} levels up. XP comes from every swing of the tool.`);
    setText($('disc-pts'), Game.treePointsFree(curDisc)); setText($('talent-free'), tfree);
    $('disc-xpbar').style.width = (100 * pr.have / pr.need) + '%'; setText($('disc-xptext'), `${f(pr.have)} / ${f(pr.need)} XP`);
    for (const n of CONFIG.trees[curDisc] || []) {
      const d = rows.node[n.id]; if (!d) continue; const r = Game.nodeRank(curDisc, n.id), max = Game.nodeMax(n), open = Game.nodeOpen(curDisc, n.id), can = Game.canRankNode(curDisc, n.id);
      d.classList.toggle('locked', !open); d.classList.toggle('maxed', r >= max); d.classList.toggle('can', can);
      setText(d.querySelector('[data-f=rank]'), Game.nodeQuestLocked(curDisc, n.id) ? '🔒 Quest' : n.capstone ? (r ? 'Learned' : '1 talent') : `${r} / ${max}`);
      d.querySelector('[data-f=bar]').style.width = (100 * r / max) + '%';
      const b = d.querySelector('[data-f=btn]'); b.disabled = !can; setText(b, r >= max ? '✓' : n.capstone ? '★ Learn' : '+1');
      const link = $('tree').querySelector(`[data-link="${n.id}"]`); if (link) link.classList.toggle('on', open);
    }
    $('badge-skills').classList.toggle('hidden', !any);
    return any;
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
    const bKey = S.hero.ground + ':' + S.hero.bestStage + ':' + Object.keys(S.hero.bossesKilled).length + ':' + Object.values(S.hero.grounds).map(g => g.bestStage).join('/') + ':' + Game.perkRank('bestiary') + ':' + Math.floor(S.hero.totalKills / 10);
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
    const pinnable = R[k].kind !== 'loot'; $('item-pin').classList.toggle('hidden', !pinnable); if (pinnable) setText($('item-pin'), Game.pinned(k) ? 'Unpin from top bar' : 'Pin to top bar');
    renderInventory(); $('item-modal').classList.remove('hidden');
  }
  function closeItem() { invItem = null; $('item-modal').classList.add('hidden'); }
  function renderBestiary() {
    const S = Game.S, box = $('bestiary'), has = !!Game.perkRank('bestiary'); let html = '';
    $('bestiary-locked').classList.toggle('hidden', has); box.classList.toggle('hidden', !has);
    document.querySelector('[data-csub=best] .lock-ico').textContent = has ? '' : '🔒';
    if (has) for (const gid in CONFIG.grounds) {
      const G = CONFIG.grounds[gid], gs = gid === S.hero.ground ? { bestStage: S.hero.bestStage } : (S.hero.grounds[gid] || { bestStage: 0 });
      const best = gs.bestStage || 0; const seen = G.line.filter((T, i) => best >= i * CONFIG.stages.perType + 1 || Game.typeKills(gid + ':' + T.id) > 0);
      if (!seen.length) continue;
      html += `<div class="dim small" style="margin-top:8px">${G.name}</div>`;
      G.line.forEach((T, i) => {
        const key = gid + ':' + T.id, kills = Game.typeKills(key), first = i * CONFIG.stages.perType + 1; if (best < first && !kills) return;
        const bossStage = first + CONFIG.stages.perType - 1, bossDone = !!S.hero.bossesKilled[gid + ':' + bossStage];
        const pool = Game.stagePool(Math.max(first, Math.min(best, bossStage)), gid), bt = Game.bestiaryTier(key), tiers = CONFIG.bestiary.tiers, next = tiers[bt + 1];
        html += `<div class="bestiary-row"><div><div class="b-name">${T.name} <span class="dim small">× ${Game.fmt(kills)}</span></div><div class="b-sub">${bt >= 0 ? tiers[bt].name : 'Unknown'}${next ? ` · ${next.name} at ${Game.fmt(next.kills)}` : ''}${best >= bossStage ? ' · Boss: ' + T.boss + (bossDone ? ' ✓' : '') : ''}</div>${bt >= 0 ? `<div class="b-bonus">+${Math.round(tiers[bt].bonus * 100)}% damage dealt, −${Math.round(tiers[bt].bonus * 100)}% taken</div>` : ''}</div><div class="b-pool">${Object.keys(pool).map(k => `<span class="costitem loot-${rarityOf(k)}" title="${R[k].name} ${Math.round(pool[k] * 100)}%">${ico(R[k].icon, 12)}<span class="small">${Math.round(pool[k] * 100)}%</span></span>`).join('')}${T.unique ? `<span class="costitem loot-rare" title="${R[T.unique].name} — first boss kill">${ico(R[T.unique].icon, 12)}★</span>` : ''}</div></div>`;
      });
    }
    setHtml(box, html || '<span class="dim small">Fight something first.</span>');
    // Trophies
    const tg = $('trophy-grid'); let th = '', anyT = false;
    for (const gid in CONFIG.grounds) for (const T of CONFIG.grounds[gid].line) {
      const key = gid + ':' + T.id, kills = Game.typeKills(key); if (!kills) continue;
      const tt = Game.trophyTier(key), tiers = CONFIG.trophies.tiers, cur = tiers[tt], next = tiers[tt + 1]; if (tt >= 0) anyT = true;
      th += `<div class="trophy ${tt < 0 ? 'none' : ''}" title="${T.name}: ${Game.fmt(kills)} kills"><div class="t-head" style="border-color:${cur ? cur.color : 'var(--line2)'}">${ico([0,0], 24, tt < 0 ? 'ghost' : '')}</div><div class="t-name">${T.name}</div><div class="t-tier" style="color:${cur ? cur.color : 'var(--dim)'}">${cur ? cur.name + ' head' : 'No trophy'}</div><div class="t-sub">${next ? `${Game.fmt(kills)} / ${Game.fmt(next.kills)} for ${next.name}` : 'All trophies earned'}</div></div>`;
    }
    setHtml(tg, th); $('trophy-empty').classList.toggle('hidden', anyT || th.length > 0);
  }

  // ---- Render ----
  let lastRender = 0;
  function render(force) {
    const now = performance.now(); if (!force && now - lastRender < 100) return; lastRender = now;
    const S = Game.S, f = Game.fmt, h = S.hero, st = Game.stats();

    const kr = Game.kingdomRates(), hr = Game.heroFighting() ? Game.heroRates() : {}, hrv = Game.heroFighting() ? {} : Game.harvestRates();
    for (const k in R) {
      const e = $('res-' + k), open = R[k].kind !== 'loot' && S.lifetime[k] > 0 && Game.pinned(k);
      e.classList.toggle('hidden', !open); if (!open) continue;
      e.querySelector('.rrate').classList.toggle('hidden', !Game.perkRank('almanac'));
      { const cap = Game.resCap(k), full = (S.res[k] || 0) >= cap - 1e-9; setHtml(e.querySelector('[data-f=amt]'), `${f(S.res[k])}<span class="capn">/${f(cap)}</span>`); e.classList.toggle('full', full); }
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
      setHtml($('ground-desc'), `${G.desc} <span class="dim">Loot per kill:</span> ${pills}` + (G.dropTool ? Object.entries(G.dropTool).filter(([k, t]) => S.hero.tools[t] && Game.dropUnlocked(k)).map(([k, t]) => ` <span class="dim">· ${t} ×${Game.dropToolMult(t).toFixed(1)}</span>`).join('') : '')); }
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
    setText($('danger'), !Game.perkRank('danger') ? (dHere >= 1 ? '⚠ You cannot survive here.' : '') : dHere >= 1 ? '⚠ You cannot survive here. Retreat or gear up.'
      : Game.canAdvance() ? (dNext >= 1 ? '⚠ Next stage would kill you. Gear up first.' : dNext > 0.6 ? 'Next stage looks dangerous.' : 'Next stage looks fine.')
      : `Lose ${Math.round(dHere * 100)}% HP per fight here.`);
    setText(rows.basic.querySelector('[data-f=dps]'), `${f(st.attack)}/hit · ${f(st.dps)} DPS`);
    rows.basic.style.setProperty('--cd', h.resting ? 0 : Math.min(1, (h.atkTimer || 0) * st.speed));
    for (let i = 0; i < CONFIG.skillSlots; i++) {
      const b = rows.sbar[i], id = h.loadout[i];
      if (!id) { b.className = 'skill-btn empty hidden'; b.dataset.id = ''; b.dataset.icon = ''; setHtml(b.querySelector('.sk-ico'), ''); setText(b.querySelector('.sk-name'), '—'); setText(b.querySelector('.sk-cd'), ''); b.disabled = true; continue; }
      const d = Game.skillDef(id), cd = Math.max(0, h.cds[id] || 0), ready = cd <= 0 && !h.resting;
      b.dataset.id = id; b.disabled = !ready;
      b.className = 'skill-btn' + (ready ? ' ready' : '');
      setText(b.querySelector('.sk-name'), d.name);
      if (b.dataset.icon !== id) { setHtml(b.querySelector('.sk-ico'), ico(d.icon, 24)); b.dataset.icon = id; }
      setText(b.querySelector('.sk-cd'), ready ? 'TAP' : cd.toFixed(1) + 's');
      b.style.setProperty('--cd', ready ? 0 : (cd / Game.skillCd(id)));
    }
    $('stat-grid').parentElement.classList.toggle('hidden', !Game.perkRank('chronicler'));
    if (Game.perkRank('chronicler')) setHtml($('stat-grid'), [
      ['Attack', f(st.attack)], ['DPS', f(st.dps)], ['Atk speed', st.speed.toFixed(2) + '/s'],
      ['Crit', Game.pct(st.crit) + ' ×' + st.critDmg.toFixed(1)], ['Max HP', f(st.maxHp)], ['Regen', f(st.regen) + '/s'],
      ['Armor', f(st.armor) + (st.dr ? ' −' + Game.pct(st.dr) : '')], ['Drops', '×' + st.drop.toFixed(2)], ['Kills/s', Game.farmRate().toFixed(2)],
    ].map(([k, v]) => `<div><span class="dim">${k}</span><b>${v}</b></div>`).join(''));
    const showLog = S.settings.showLog !== false; $('log-card').classList.toggle('hidden', !showLog); if ($('set-log').checked !== showLog) $('set-log').checked = showLog;
    if (showLog) setHtml($('log'), S.log.slice(0, 8).map(l => `<div>${l}</div>`).join(''));
    for (const ev of Game.drainEvents()) hitPop(ev);
    const eff = Game.afkEfficiency(), afkHr = Object.entries(hr).filter(([, v]) => v > 0), afkKr = Object.entries(kr).filter(([, v]) => v > 0);
    setHtml($('afk-info'), !Game.perkRank('ledger') ? `<span class="dim">AFK forecast — unlock <b>The Ledger</b> in Kingdom → Legacy to see what he earns while you're away.</span>` : `AFK mode: ${Game.pct(eff)} of this rate while closed (max ${Game.fmtTime(Game.afkCap())})` + (afkHr.length ? ` → ${afkHr.map(([k, v]) => `${ico(R[k].icon, 14)}${f(v * eff * 3600)}/h`).join(' ')}` : ' → XP only here') + (afkKr.length ? `, kingdom ${afkKr.map(([k, v]) => `${ico(R[k].icon, 14)}${f(v * eff * 3600)}/h`).join(' ')}` : ''));

    // Gear
    let anyGear = false;
    for (const slot in CONFIG.slots) {
      const row = rows.gear[slot], def = CONFIG.slots[slot], it = h.gear[slot];
      const up = row.querySelector('[data-f=up]'), forge = row.querySelector('[data-f=forge]');
      if (!it) {
        const bv = Game.slotValue(slot), bst = Game.itemStatPreview(slot, -1, 0); bst[def.primary] = CONFIG.slots[slot].per * bv;
        setHtml(row.querySelector('[data-f=title]'), `${def.bare} <span class="owned">${bv.toFixed(1)}</span>`);
        setText(row.querySelector('[data-f=stats]'), `${STAT_LABEL[def.primary]} ${fs(def.primary, bst[def.primary])}`);
        setText(row.querySelector('[data-f=next]'), slot === 'weapon' && bv < 1.9 ? `Fists grow +0.1 every ${CONFIG.fistKillsPerLevel} kills (${(Game.S.hero.fistKills || 0) % CONFIG.fistKillsPerLevel}/${CONFIG.fistKillsPerLevel})` : '');
        up.classList.add('hidden'); row.querySelector('[data-f=max]').classList.add('hidden');
      } else {
        const cur = Game.itemStatPreview(slot, it.tier, it.level), nxt = Game.itemStatPreview(slot, it.tier, it.level + 1);
        setHtml(row.querySelector('[data-f=title]'), `${Game.tierName(slot, it.tier)} ${def.name} <span class="owned">${Game.slotValue(slot).toFixed(1)} · Lv${it.level}</span>`);
        setText(row.querySelector('[data-f=stats]'), Object.entries(cur).map(([k, v]) => `${STAT_LABEL[k]} ${fs(k, v)}`).join(' · '));
        setText(row.querySelector('[data-f=next]'), it.level < CONFIG.tierUpAt - 1 ? 'Next: ' + Object.entries(nxt).map(([k, v]) => fs(k, v)).join(' · ') : `Lv${it.level} — forge the next tier to go higher`);
        up.classList.remove('hidden');
        if (!forgeState(up, 'gearUp', slot, 'Upgrade')) { const uc = Game.gearUpgradeCost(slot); setHtml(up.querySelector('[data-f=upcost]'), costHtml(uc)); up.disabled = !uc || !Game.canAfford(uc) || !!Game.crafting(); if (!up.disabled) anyGear = true; }
        { const mx = row.querySelector('[data-f=max]'), plan = Game.maxUpgradePlan('gear', slot); mx.classList.toggle('hidden', !it); setText(mx.querySelector('[data-f=maxn]'), plan ? `+${plan.levels} → Lv${it.level + plan.levels}` : '—'); mx.disabled = !plan || plan.levels < 2 || !!Game.crafting(); }
      }
      const fc = Game.gearCraftCost(slot), can = Game.canTierUp(slot);
      if (!fc) forge.classList.add('hidden');
      else if (forgeState(forge, 'gear', slot, 'Forge')) { forge.classList.remove('hidden'); }
      else {
        forge.classList.remove('hidden');
        const nt0 = it ? it.tier + 1 : 0;
        setText(row.querySelector('[data-f=forgelbl]'), it ? `Forge ${Game.tierName(slot, nt0)}` : `Forge ${Game.tierName(slot, 0)}`);
        const nt = it ? it.tier + 1 : 0, techOk = Game.gearTierUnlocked(nt, slot);
        setHtml(forge.querySelector('[data-f=forgecost]'), can ? costHtml(fc) : techOk ? `<span class="dim">needs Lv${CONFIG.tierUpAt}</span>` : `<span class="dim">needs tech</span>`);
        forge.disabled = !can || !Game.canAfford(fc) || !!Game.crafting(); if (!forge.disabled) anyGear = true;
      }
    }

    orderRows($('gear-list'), Object.keys(CONFIG.slots).map(s => ({ el: rows.gear[s], rank: (!rows.gear[s].querySelector('[data-f=up]').disabled || !rows.gear[s].querySelector('[data-f=forge]').disabled) ? 0 : 1 })));
    // Skill trees
    setText($('respec-cost'), f(Game.respecCost())); $('respec-btn').disabled = S.res.gold < Game.respecCost();
    const anySkill = renderTrees(), free = 0, tfree = Game.talentPointsFree();
    $('badge-gear').classList.toggle('hidden', !anyGear);
    $('badge-hero').classList.toggle('hidden', !(anyGear || anySkill));

    // Kingdom
    for (const lid in CONFIG.kingdom.lines) { const any = Game.lineUnlocked(lid) ? renderLine(lid) : false; $('badge-' + lid).classList.toggle('hidden', !any); }
    const keepAct = renderKeep();
    renderThrone();

    // Tech
    let anyTech = false;
    const CNAME = { kills: 'Enemies slain', bossKills: 'Bosses slain', stage: 'Best stage', foundings: 'Foundings' };
    for (const t of CONFIG.techs) {
      const row = rows.tech[t.id], done = Game.hasTech(t.id), pr = Game.techProgress(t);
      row.classList.toggle('done', done); row.classList.toggle('gated', !done && !pr.ok); row.classList.toggle('hidden', done && techHideKnown());
      setHtml(row.querySelector('[data-f=req]'), done ? '' : pr.parts.map(p => `<div class="req-line"><span>${CNAME[p.k] || (R[p.k] ? R[p.k].name + ' gathered' : p.k)}</span><span>${f(Math.min(p.have, p.need))} / ${f(p.need)}</span></div><div class="bar"><div style="width:${Math.min(100, 100 * p.have / p.need)}%"></div></div>`).join(''));
      const btn = row.querySelector('[data-f=btn]'), rs = Game.researching(), mine = rs && rs.id === t.id;
      btn.classList.toggle('forging', !!mine); btn.classList.toggle('busy', !!rs && !mine);
      if (mine) { btn.style.setProperty('--p', (100 * rs.t / rs.total) + '%'); setHtml(btn, `<span class="small">Researching…</span><br><span class="cost">${(rs.total - rs.t).toFixed(1)}s</span>`); btn.disabled = true; }
      else { if (!btn.querySelector('[data-f=cost]')) btn.innerHTML = `<span class="small">Research</span><br><span class="cost" data-f="cost"></span>`; btn.style.removeProperty('--p'); setHtml(btn.querySelector('[data-f=cost]'), done ? 'Known' : costHtml(t.cost)); btn.disabled = !Game.canResearch(t.id) || !!rs; if (!btn.disabled) anyTech = true; }
    }
    CONFIG.techTiers.forEach((name, tier) => {
      const list = rows.tech[CONFIG.techs.find(t => t.tier === tier).id].parentNode;
      orderRows(list, CONFIG.techs.filter(t => t.tier === tier).map(t => ({ el: rows.tech[t.id], rank: Game.hasTech(t.id) ? 2 : Game.canResearch(t.id) ? 0 : 1 })));
    });
    $('badge-tech').classList.toggle('hidden', !anyTech); if ($('tech-hide-known').checked !== techHideKnown()) $('tech-hide-known').checked = techHideKnown();
    $('badge-kingdom').classList.toggle('hidden', !(keepAct || anyTech || Game.canFound()));

    // Inventory (grid rebuilt only when the set of owned items changes; counts updated in place)
    renderInventory();
    // Market
    let anySell = false;
    for (const k in rows.market) {
      const row = rows.market[k], have = Math.floor(S.res[k] || 0);
      const buying = marketMode === 'buy';
      if (!(S.lifetime[k] > 0) || (buying && !Game.canBuyRes(k))) { row.classList.add('hidden'); continue; }
      row.classList.remove('hidden');
      row.querySelector('.mm-sell').classList.toggle('hidden', buying); row.querySelector('.mm-buy').classList.toggle('hidden', !buying);
      setText(row.querySelector('[data-f=verb]'), buying ? 'Costs' : 'Sells for');
      setText(row.querySelector('[data-f=have]'), f(have)); setText(row.querySelector('[data-f=price]'), f(buying ? Game.buyPrice(k) : Game.sellPrice(k)));
      if (buying) { const m = Game.buyMax(k); row.querySelector('[data-f=b1]').disabled = m < 1; row.querySelector('[data-f=b10]').disabled = m < 10; row.querySelector('[data-f=bmax]').disabled = m < 1; }
      row.querySelector('[data-f=s1]').disabled = have < 1; row.querySelector('[data-f=s10]').disabled = have < 10; row.querySelector('[data-f=sall]').disabled = have < 1;
      if (have >= 1 && R[k].tier >= 2 && k !== 'gold') anySell = true;
    }
    orderRows($('market-list'), Object.keys(rows.market).map(k => ({ el: rows.market[k], rank: (S.res[k] || 0) >= 1 ? (R[k].tier >= 2 ? 0 : 1) : 2 })));
    $('badge-market').classList.toggle('hidden', !anySell && $('badge-tavern').classList.contains('hidden'));

    applyTabLocks();
    // Quest
    let q = Game.questCurrent(), goal = null;
    if (!q) goal = Game.suggestGoal();
    const showQ = q || goal;
    $('quest-card').classList.toggle('hidden', !showQ); $('quest-done').classList.toggle('hidden', !!showQ);
    $('quest-card').classList.toggle('goal', !q && !!goal); applyQuestCollapse();
    const CN = { kills: 'Enemies slain', bossKills: 'Bosses slain', stage: 'Best stage', foundings: 'Foundings' };
    const partHtml = (p, i, arr) => { const lab = p.label || (CN[p.k] || (R[p.k] ? R[p.k].name + ' gathered' : '')); const single = p.need === 1 || p.simple; const current = !p.done && arr.slice(0, i).every(x => x.done);
      return `<div class="qstep ${p.done ? 'done' : ''} ${current ? 'current' : ''}"><span class="qbox">${p.done ? '✓' : ''}</span><span class="qtext">${lab}</span>${single ? '' : `<span class="qcount">${f(Math.min(p.have, p.need))} / ${f(p.need)}</span>`}${single ? '' : `<div class="bar"><div style="width:${Math.min(100, 100 * p.have / p.need)}%"></div></div>`}</div>`; };
    if (q) {
      const pr = Game.questProgress(q);
      { const chain = q.chain || (CONFIG.quests.slice(0, S.quests.index).reverse().find(x => x.chain) || {}).chain || ''; const inChain = CONFIG.quests.filter((x, i) => (x.chain || (CONFIG.quests.slice(0, i).reverse().find(y => y.chain) || {}).chain) === chain); setText($('quest-n'), `${chain} · ${inChain.indexOf(q) + 1} / ${inChain.length}`); }
      setText($('quest-name'), q.name); setText($('quest-text'), q.text); setText($('quest-hint'), q.hint || ''); $('quest-hint').classList.toggle('hidden', !q.hint);
      setHtml($('quest-obj'), pr.parts.map(partHtml).join(''));
      setHtml($('quest-reward'), 'Reward: ' + Object.entries(q.reward).map(([k, v]) => k === 'crystal' ? `<span class="costitem">💎 ${v} Crystal</span>` : k === 'talent' ? `<span class="costitem">★ ${v} talent point</span>` : `<span class="costitem">${ico(R[k].icon, 14)}${f(v)}</span>`).join(' '));
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
    $('ground-card').classList.toggle('hidden', !S.hero.gear.weapon);
    if (!fighting && !idle) {
      const a = CONFIG.activities[act], t = Game.harvestTime(act), y = Game.harvestYield(act), tool = h.tools[a.tool];
      setText($('harvest-title'), a.name);
      setHtml($('harvest-icon'), ico(a.icon, 48));
      setHtml($('harvest-yield'), 'Each swing: ' + Object.entries(y).map(([k, v]) => `<span class="costitem">${ico(R[k].icon, 16)}${f(v)}</span>`).join(' '));
      $('harvest-bar').style.width = Math.min(100, 100 * h.harvestTimer / t) + '%';
      setText($('harvest-time'), Game.perkRank('surveyor') ? t.toFixed(1) + 's per swing' : '');
      $('harvest-yield').classList.toggle('hidden', !Game.perkRank('surveyor'));
      setText($('harvest-tool'), `${CONFIG.toolTiers[tool.tier].name} ${CONFIG.toolSlots[a.tool].name} Lv${tool.level} · power ×${Game.toolPower(a.tool).toFixed(2)}`);
      setText($('harvest-mastery'), `Mastery ${Game.masteryLevel(act)} (${h.mastery[act] || 0} swings)`);
      const hrv = Game.harvestRates(act);
      setHtml($('harvest-afk'), !Game.perkRank('ledger') ? `<span class="dim">AFK forecast — unlock <b>The Ledger</b> in Kingdom → Legacy.</span>` : `AFK: ${Game.pct(Game.afkEff())} of this while closed (max ${Game.fmtTime(Game.afkCap())}) → ` + Object.entries(hrv).map(([k, v]) => `<span class="costitem">${ico(R[k].icon, 14)}${f(v * Game.afkEff() * 3600)}/h</span>`).join(' '));
    }
    renderMini(fighting, idle, act, st, eMax);
    // Tools
    for (const slot in CONFIG.toolSlots) {
      const row = rows.tool[slot], def = CONFIG.toolSlots[slot], it = h.tools[slot];
      const up = row.querySelector('[data-f=up]'), forge = row.querySelector('[data-f=forge]');
      if (!it) { setHtml(row.querySelector('[data-f=title]'), `${def.name} <span class="owned">none</span>`); setText(row.querySelector('[data-f=stats]'), def.activity ? `Needed to ${CONFIG.activities[def.activity].name.toLowerCase()}.` : `Needed to take ${R[def.boosts].name} in the Wilds. Better tool, better chance.`); up.classList.add('hidden'); row.querySelector('[data-f=max]').classList.add('hidden'); }
      else {
        setHtml(row.querySelector('[data-f=title]'), `${CONFIG.toolTiers[it.tier].name} ${def.name} <span class="owned">Lv${it.level}</span>`);
        setText(row.querySelector('[data-f=stats]'), def.activity ? `Power ×${Game.toolPower(slot).toFixed(2)} → ${CONFIG.activities[def.activity].name}: ${Object.entries(Game.harvestRates(def.activity)).map(([k, v]) => `${f(v)} ${R[k].name}/s`).join(', ')}` : `Power ×${Game.toolPower(slot).toFixed(2)} → ${R[def.boosts].name} chance ×${Game.dropToolMult(slot).toFixed(2)}`);
        up.classList.remove('hidden'); if (!forgeState(up, 'toolUp', slot, 'Upgrade')) { const uc = Game.toolUpgradeCost(slot); setHtml(up.querySelector('[data-f=upcost]'), costHtml(uc)); up.disabled = !uc || !Game.canAfford(uc) || !!Game.crafting(); }
        { const mx = row.querySelector('[data-f=max]'), plan = Game.maxUpgradePlan('tool', slot); mx.classList.remove('hidden'); setText(mx.querySelector('[data-f=maxn]'), plan ? `+${plan.levels} → Lv${it.level + plan.levels}` : '—'); mx.disabled = !plan || plan.levels < 2 || !!Game.crafting(); }
      }
      const fc = Game.toolCraftCost(slot), can = Game.canToolTierUp(slot), nt = it ? it.tier + 1 : 0;
      if (!fc) forge.classList.add('hidden');
      else if (forgeState(forge, 'tool', slot, 'Make')) { forge.classList.remove('hidden'); }
      else { forge.classList.remove('hidden'); setText(row.querySelector('[data-f=forgelbl]'), it ? `Make ${CONFIG.toolTiers[nt].name}` : 'Make'); setHtml(forge.querySelector('[data-f=forgecost]'), can ? costHtml(fc) : (Game.toolTierUnlocked(nt) && Game.toolSlotUnlocked(slot)) ? `<span class="dim">needs Lv${CONFIG.tierUpAt}</span>` : `<span class="dim">needs tech</span>`); forge.disabled = !can || !Game.canAfford(fc) || !!Game.crafting(); }
    }
    renderDoll();
  }

  const fmPick = { hero: null, kingdom: null };
  function openFound() {
    if (!Game.canFound()) return;
    const L = Game.S.legacy;
    fmPick.hero = L.heroPath || 'warrior'; fmPick.kingdom = L.kingdomPath || 'benevolent';
    setText($('fm-gain'), Game.knowledgeGain());
    setText($('fm-worker'), (() => { const n = Game.allSteps().find(st => st.unlock === Game.S.legacy.foundings + 1); return n ? 'a new step: ' + n.name : 'a fresh kingdom'; })());
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
    $('crystal-chip').classList.toggle('hidden', !(L.knowledge > 0 || L.foundings > 0)); setText($('crystal-n'), L.knowledge);
    setText($('knowledge'), L.knowledge); setText($('knowledge2'), L.knowledge); setText($('foundings'), L.foundings); setText($('throne-best'), S.hero.bestStage);
    setText($('found-gain'), '+' + Game.knowledgeGain());
    const cost = Game.foundCost(); setHtml($('found-cost'), Object.keys(cost).length ? costHtml(cost) : '<span class="dim">free — Renown is the price</span>');
    const first = S.legacy.foundings === 0, nextStep = Game.allSteps().find(st => st.unlock === S.legacy.foundings + 1);
    setText($('found-title'), first ? 'Pay Tribute to the Empire' : 'Found a New Fief');
    setText($('found-text'), first ? 'Pay tribute and the Empire grants you land: your first kingdom, with a Forest to work. Your hero keeps everything.' : `Start a new fief. The kingdom starts over; your hero, Legacy and trophies stay. New here: ${nextStep ? nextStep.name + ' (' + CONFIG.kingdom.lines[nextStep.line].name + ')' : 'nothing new yet'}.`);
    $('found-btn').textContent = first ? 'Pay Tribute' : 'Found a New Fief';
    if (first) { const reqStage = CONFIG.legacy.foundRequiresStage, okStage = Game.bestStageAll() >= reqStage; setText($('found-req'), okStage ? (Game.canAfford(cost) ? 'Ready.' : 'Gather the tribute: 100 gold and the Rat King\'s Tooth.') : `Reach stage ${reqStage} to pay tribute (best: ${Game.bestStageAll()}).`); }
    else { const need = Game.foundRenownNeed(), have = S.kingdom.renown || 0; setText($('found-req'), have >= need ? 'Ready.' : `Earn ${Game.fmt(need)} Renown in this kingdom to found a new fief — you have ${Game.fmt(have)}.`); }
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
    setHtml($('history'), L.history.length ? L.history.slice().reverse().map(h => `<div>Kingdom ${h.level}: stage ${h.bestStage}, hero Lv${h.heroLevel} → +${h.knowledge} Crystals</div>`).join('') : '<div class="dim">No foundings yet.</div>');
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
    if (ev.who === 'research') { const a = $('tech-tree').offsetParent ? $('tech-tree') : document.querySelector('.top'); const r = a.getBoundingClientRect(); const p = el('div', 'pop craft', `✦ ${ev.name} researched!`); p.style.left = (r.left + r.width * 0.5) + 'px'; p.style.top = (Math.max(r.top, 80) + 20) + 'px'; document.body.appendChild(p); setTimeout(() => p.remove(), 1400); return; }
    if (ev.who === 'craft') { const a = $('doll').offsetParent ? $('doll') : $('mini-hero').offsetParent ? $('mini-hero') : document.querySelector('.top'); const r = a.getBoundingClientRect(); const p = el('div', 'pop craft', `⚒ ${ev.name} forged!`); p.style.left = (r.left + r.width * 0.5) + 'px'; p.style.top = (r.top + Math.min(40, r.height * 0.3)) + 'px'; document.body.appendChild(p); setTimeout(() => p.remove(), 1400); return; }
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
