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
  const ico = (rc, size = 16, cls = '') => { if (!rc) return ''; if (typeof rc === 'string') return `<span class="ico ico-img ${cls}" style="width:${size}px;height:${size}px"><img src="${rc}" alt="" loading="lazy" decoding="async"></span>`; const sc = size / CONFIG.iconSheet.cell; return `<span class="ico ${cls}" style="width:${size}px;height:${size}px;background-position:-${rc[1] * size}px -${rc[0] * size}px;background-size:${512 * sc}px auto"></span>`; };
  // Painted gear / tool icons by tier (gear: bare, t0..t5; tools: t0..t2)
  const gearIcon = (kind, slot, it) => kind === 'gear' ? `assets/gear/${slot}_${it ? 't' + Math.min(it.tier, 5) : 'bare'}.webp` : `assets/gear/${slot}_t${it ? Math.min(it.tier, 2) : 0}.webp`;
  // Painted resource icons: resources, the hand boxes and kingdom buildings use them (drawn a little larger than their box)
  (() => { const RS = CONFIG.resources, IM = CONFIG.resImages || {}; for (const k in IM) if (RS[k]) RS[k].icon = IM[k];
    for (const h of CONFIG.hand) if (IM[h.gives]) h.icon = IM[h.gives];
    for (const lid in CONFIG.kingdom.lines) for (const st of CONFIG.kingdom.lines[lid].steps) if (IM[st.make]) st.icon = IM[st.make]; })();

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
    $('celebrate').addEventListener('click', () => cbDone());
    document.querySelectorAll('[data-tithe]').forEach(b => b.addEventListener('click', () => { Game.S.legacy.tithe = +b.dataset.tithe; render(true); }));
    $('path-stars-box').addEventListener('click', showStarInfo);
    document.addEventListener('click', e => { const t = e.target.closest && e.target.closest('.req-src[data-item]'); if (t) { e.stopPropagation(); openItem(t.dataset.item); } }, true);
    $('confirm-no').addEventListener('click', closeAsk); $('confirm-modal').addEventListener('click', e => { if (e.target === $('confirm-modal')) closeAsk(); });
    $('confirm-yes').addEventListener('click', () => { const cb = confirmCb; closeAsk(); if (cb) cb(); });
    $('story-go').addEventListener('click', () => { const st = Game.S.settings.story = Game.S.settings.story || {}; if (storyOpen) st[storyOpen] = true; const was = storyOpen; storyOpen = null; $('story').classList.add('hidden'); Game.save(); if (was === 'charter' && guidePending) showGuide(); });
    $('version').textContent = CONFIG.version;
    // Resource chips: icon · amount · name · rate, in config order; a good appears once first gained.
    const rb = $('res-bar'); rb.innerHTML = '';
    for (const k in R) {
      const d = el('div', 'res hidden'); d.id = 'res-' + k; d.title = `${R[k].name} — ${R[k].desc || ''}`;
      d.innerHTML = `${ico(R[k].icon, 22)}<div class="res-txt"><b data-f="amt">0</b><span class="res-name">${R[k].name}</span></div><span class="rrate" data-f="rate"></span>`;
      d.addEventListener('click', () => { if (Game.phase() !== 3 && k !== 'people' && k !== 'soldiers') return; const go = { soldiers: 'prod', people: 'prod', gold: 'lands' }[k]; if (!go) return; const t = document.querySelector('[data-tab=kingdom]'); if (t && !t.disabled) t.click(); const b = document.querySelector(`[data-ksub=${go}]`); if (b && !b.disabled) b.click(); const r = document.querySelector('[data-rtab=kingdom]'); if (r && desktop) r.click(); });
      rb.appendChild(d);
    }
    for (const wk of Game.WAR_KEYS) { const W = CONFIG.kingdom.army.lines[wk], d = el('div', 'res inc-chip hidden'); d.id = 'inc-' + wk; d.title = `${W.name} income per minute vs what the army uses`;
      d.innerHTML = `${ico(R[W.good].icon, 18)}<div class="inc-txt"><span class="res-name">${W.name}</span><span class="inc-nums"><b data-f="in"></b><span data-f="out"></span></span><span class="inc-meter"><i data-f="m"></i></span></div>`;
      d.addEventListener('click', () => { const t = document.querySelector('[data-tab=kingdom]'); if (t && !t.disabled) t.click(); const b = document.querySelector(`[data-ksub=${W.line}]`); if (b && !b.disabled) b.click(); });
      rb.appendChild(d); }
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
    $('auto-adv').addEventListener('change', e => { Game.S.settings.autoAdvance = e.target.checked; });
    $('retreat-x').addEventListener('click', () => { if (Game.S.hero.retreatNote) Game.S.hero.retreatNote.seen = true; });
    $('retreat-btn').addEventListener('click', () => Game.retreat());
    $('respec-btn').addEventListener('click', () => ask('Respec', 'Reset the points in Logging, Mining and Foraging? Capstones are kept. Costs ' + Game.fmt(Game.respecCost()) + ' gold.', 'Respec', () => Game.respec()));
    $('path-reset').addEventListener('click', () => ask('Reset Paths', 'Take every point back out of your Paths so you can spend them again? Costs ' + Game.fmt(Game.respecCost()) + ' gold.', 'Reset', () => Game.resetPaths()));
    document.querySelectorAll('#skill-seg [data-sk]').forEach(b => b.addEventListener('click', () => setSkillView(b.dataset.sk)));
    $('wb-claim').addEventListener('click', () => claimWelcome(1));
    $('wb-ad').disabled = true; $('wb-ad').innerHTML = '▶ Watch ad ×2 <span class="small dim">· coming soon</span>';
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
    $('dev-reset-run').addEventListener('click', () => ask('Reset this run', 'Reset this run? Kingdom level, Crowns, perks and workers are kept.', 'Reset run', () => { { Game.debug.resetRun(); buildLists(); } }));
    $('dev-reset').addEventListener('click', () => ask('RESET ALL', 'RESET ALL progress? This wipes everything, including Crowns and Kingdom level.', 'Wipe everything', () => { Game.debug.resetAll(); }));
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
      document.querySelectorAll('[data-csub]').forEach(x => x.classList.toggle('active', x === b));
      document.querySelectorAll('.csub').forEach(t => t.classList.toggle('hidden', t.id !== 'csub-' + b.dataset.csub));
    }));
    $('set-reload').addEventListener('click', async () => { Game.save(); try { if (window.caches) { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } } catch (e) {} location.replace(location.pathname + '?v=' + Date.now()); });
    $('set-reset').addEventListener('click', () => ask('Reset all progress?', 'This wipes everything — hero, kingdom, Crowns, Legacy perks, trophies. There is no undo.', 'Wipe everything', () => Game.debug.resetAll()));
    $('tech-hide-known').addEventListener('change', e => { Game.S.settings.techHideKnown = e.target.checked; render(true); });
    $('avatar-btn').addEventListener('click', () => $('dev-toggle').click());
    $('cloud-guest').addEventListener('click', () => { Game.S.settings.guest = true; Game.save(); render(true); });
    $('cloud-signin').addEventListener('click', () => window.Cloud && Cloud.signIn());
    $('cloud-signout').addEventListener('click', () => window.Cloud && Cloud.signOut());
    $('cloud-now').addEventListener('click', () => window.Cloud && Cloud.push());
    $('cloud-delete').addEventListener('click', () => ask('Delete cloud save?', 'Your progress stays on this device. The copy in the cloud is deleted and you are signed out.', 'Delete cloud save', () => Cloud.deleteCloud()));
    $('cloud-restore').addEventListener('click', () => ask('Restore previous save?', 'The save that was set aside comes back, and the one you are playing now is set aside instead.', 'Restore', () => Cloud.restoreBackup()));
    $('settle-pay').addEventListener('click', () => { if (Game.contribute()) render(true); });
    $('settle-raise').addEventListener('click', () => { const nx = CONFIG.kingdom.tiers[Game.kTier() + 1]; ask(`Raise to ${nx.name}?`, `Your settlement becomes a ${nx.name}. Nothing is lost: new buildings unlock, the Storehouse holds ${nx.cap} of each good and each building takes ${nx.slots} worker${nx.slots > 1 ? 's' : ''}.`, `Raise to ${nx.name}`, () => { if (Game.raiseTier()) { for (const l in lineKey) lineKey[l] = ''; render(true); } }); });
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
      const G = CONFIG.grounds[id], b = el('button', 'ground-btn', `${ico(G.icon, 18)}<span class="g-txt"><span class="g-name">${G.name}</span><span class="g-stage" data-f="st"></span></span>`);
      b.addEventListener('click', () => { Game.setGround(id); });
      rows.ground[id] = b; gb.appendChild(b);
    }
    // Desktop right-panel tabs
    document.querySelectorAll('[data-rtab]').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('[data-rtab]').forEach(x => x.classList.toggle('active', x === b));
      rightShow(b.dataset.rtab);
    }));
    const mq = window.matchMedia('(min-width: 1024px)'); mq.addEventListener('change', applyLayout); applyLayout();
    initBackButton();
    $('fm-cancel').addEventListener('click', () => $('found-modal').classList.add('hidden'));
    $('fm-confirm').addEventListener('click', () => {
      const gain = Game.found(fmPick.hero, fmPick.kingdom);
      if (gain === false) return;
      $('found-modal').classList.add('hidden'); buildLists(); for (const l in lineKey) lineKey[l] = '';
      document.querySelector('[data-tab=hero]').click();
      if (Game.S.legacy.foundings === 1 && !Game.S.settings.demoSeen) guidePending = true; // shown after the Charter story
    });
    $('demo-continue').addEventListener('click', () => { if (infoFlag) Game.S.settings[infoFlag] = true; Game.save(); $('demo-modal').classList.add('hidden'); });
    if (Game.S.migrated03 && !Game.S.settings.migSeen) showInfo('Alpha 0.3', 'The kingdom has been rebuilt.', '<p class="small">Combat, gear and the whole kingdom were redesigned for 0.3, so your old run could not carry over. Your <b>Crowns, Legacy perks and Bestiary kills</b> are kept.</p><p class="small">The wild now starts with bare fists, a 100-item pack and a tribute to the Empire. Past it lies a new idle kingdom of production lines, thralls and Imperial Orders.</p>', 'migSeen');
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
        <span data-f="ico">${ico(gearIcon('gear', slot, null), 32, 'rowico')}</span>
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
      row.innerHTML = `<span data-f="ico">${ico(gearIcon('tool', slot, null), 32, 'rowico')}</span><div class="row-main"><div class="row-title" data-f="title"></div><div class="row-sub" data-f="stats"></div></div>
        <div class="btn-col"><button class="buy" data-f="up"><span class="small">Upgrade</span><br><span class="cost" data-f="upcost"></span></button><button class="buy maxbtn" data-f="max"><span class="small">Max</span><br><span class="cost" data-f="maxn"></span></button><button class="buy shard" data-f="forge"><span class="small" data-f="forgelbl">Make</span><br><span class="cost" data-f="forgecost"></span></button></div>`;
      row.querySelector('[data-f=up]').addEventListener('click', () => { if (Game.upgradeTool(slot)) flash(row); });
      row.querySelector('[data-f=max]').addEventListener('click', () => { if (Game.upgradeMax('tool', slot)) flash(row); });
      row.querySelector('[data-f=forge]').addEventListener('click', () => { if (Game.craftTool(slot)) flash(row); });
      rows.tool[slot] = row; tl.appendChild(row);
    }
    buildDiscBar(); buildPaths(); buildTechs(); setSkillView(skView);
    const pl = $('perk-list'); pl.innerHTML = ''; rows.perk = {};
    const treeBox = {}; for (const t of CONFIG.legacy.trees) { const hd = el('div', 'perk-tree-head', `<b>${t.name}</b> <span class="dim small">· ${t.desc}</span>`); pl.appendChild(hd); treeBox[t.id] = el('div', 'list perk-tree'); pl.appendChild(treeBox[t.id]); }
    for (const p of CONFIG.legacy.perks) {
      const row = el('div', 'row');
      row.innerHTML = `${ico(p.icon, 32, 'rowico')}<div class="row-main"><div class="row-title">${p.name} <span class="owned"><b data-f="rank">0</b>/${p.max}</span></div><div class="row-sub">${p.desc}</div></div><button class="buy shard" data-f="btn"><span class="small">Learn</span><br><span class="cost" data-f="cost"></span></button>`;
      row.querySelector('[data-f=btn]').addEventListener('click', () => { if (Game.buyPerk(p.id)) flash(row); });
      rows.perk[p.id] = row; (treeBox[p.tree] || pl).appendChild(row);
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
      case 'prod': return Game.kingdomNo() > 0;
      case 'war': case 'lands': return Game.phase() === 3;
      case 'halls': return reached('h04') || (Game.kingdomNo() > 0 && Game.kTier() >= 2);
      case 'tavern': return false;
      case 'keep': return reached('q17') || S.legacy.foundings > 0;
      case 'legacy': return false; // 0.11.1: Legacy lives in the Crown Tree now
      case 'gear': return reached('f03');
      case 'skills': return reached('q02b');
      case 'market': return reached('q14') || S.legacy.foundings > 0;
      case 'trade': return true;
      case 'tavern': return Game.kingdomNo() > 0;
      case 'inventory': case 'inv': return reached('q05b');
      case 'best': return reached('q13x');
      case 'troph': return reached('q16b');
      case 'sk-paths': return reached('q02b');
      case 'sk-gather': return reached('q06c');
      case 'sk-tech': return reached('q13c');
      default: return true;
    }
  }
  const TABKEY = b => b.dataset.tab || b.dataset.sub || b.dataset.ksub || b.dataset.msub || b.dataset.rtab || b.dataset.csub;
  function applyTabLocks() {
    document.querySelectorAll('[data-tab],[data-sub],[data-ksub],[data-msub],[data-rtab],[data-csub]').forEach(b => {
      const key = TABKEY(b), ok = tabUnlocked(key);
      b.disabled = !ok; b.classList.toggle('locked-tab', !ok);
    });
    $('kline-row').classList.toggle('hidden', Game.kingdomNo() < 1);
    { const ma = document.querySelector('[data-msub].active'); if (ma && !tabUnlocked(ma.dataset.msub)) document.querySelector('[data-msub=trade]').click(); }
    document.querySelectorAll('#skill-seg [data-sk]').forEach(b => { const ok = tabUnlocked('sk-' + b.dataset.sk); b.disabled = !ok; b.classList.toggle('locked-tab', !ok); });
    if (!tabUnlocked('sk-' + skView)) { const first = ['paths', 'gather', 'tech'].find(k => tabUnlocked('sk-' + k)); if (first && first !== skView) setSkillView(first); }
    { const ca = document.querySelector('[data-csub].active'); if (ca && !tabUnlocked(ca.dataset.csub)) document.querySelector('[data-csub=inv]').click(); }
    { // screens a quest asks you to look at: count them as seen once they are on screen
      const inv = $('tab-inventory'); if (inv && inv.offsetParent) { const ca = document.querySelector('[data-csub].active'), k = ca ? { inv: 'inventory', best: 'bestiary', troph: 'trophies' }[ca.dataset.csub] : null; if (k) Game.markViewed(k); if (k !== 'inventory') Game.markViewed('inventory'); } }
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
      else if (kind === 'step') { add(document.querySelector(`#prod-grid [data-card="${id}"]`)); if (bldOpen === id) add($('bld-view').querySelector('.depth-card')); }
      else if (kind === 'market') add($('market-list'));
      else if (kind === 'ground') { add(rows.ground[id]); add(rows.act.fight); }
      else if (kind === 'perk') add(rows.perk[id]);
      else if (kind === 'path') { if (skView !== 'paths') setSkillView('paths'); add(pathEls[id] && pathEls[id].g); add(document.querySelector('#skill-seg [data-sk=paths]')); }
      else if (kind === 'technique') { if (skView !== 'tech') setSkillView('tech'); add(techEls[id] && techEls[id].card); add(document.querySelector('#skill-seg [data-sk=tech]')); }
      else if (kind === 'node') { if (skView !== 'gather') setSkillView('gather'); const [d, nid] = id.split(':'); if (curDisc !== d) { curDisc = d; buildTree(); } add(rows.node[nid]); add(rows.disc[d]); }
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
      dock('sub-gear', 'dock-left'); $('sub-gear').classList.remove('hidden'); dock('stat-card', 'sub-fight');
      $('gear-lists').classList.add('hidden'); dock('quest-card', 'dock-left'); dock('quest-done', 'dock-left');
      for (const k in RIGHT) dock(RIGHT[k], 'dock-right');
      // center shows only the hero's activity panel
      document.querySelectorAll('.tab').forEach(t => t.classList.toggle('hidden', t.id !== 'tab-hero'));
      $('sub-fight').classList.remove('hidden');
      $('hero-subtabs').classList.add('hidden');
      const cur = document.querySelector('[data-rtab].active'); rightShow(cur ? cur.dataset.rtab : 'kingdom');
    } else {
      $('gear-lists').classList.remove('hidden'); undock('stat-card'); undock('quest-card'); undock('quest-done'); undock('sub-gear'); for (const k in RIGHT) undock(RIGHT[k]);
      $('hero-subtabs').classList.remove('hidden');
      const t = document.querySelector('[data-tab].active') || document.querySelector('[data-tab]');
      document.querySelectorAll('.tab').forEach(x => x.classList.toggle('hidden', x.id !== 'tab-' + t.dataset.tab));
      const s = document.querySelector('[data-sub].active') || document.querySelector('[data-sub]');
      document.querySelectorAll('.sub').forEach(x => x.classList.toggle('hidden', x.id !== 'sub-' + s.dataset.sub));
    }
    placeSubtabs();
  }
  // ---------- Back button: returns to the previous in-game tab; closes an open popup first ----------
  const NAV_KEYS = ['tab', 'sub', 'rtab', 'ksub', 'msub', 'csub'];
  function navSnap() { const s = {}; for (const k of NAV_KEYS) { const b = document.querySelector(`[data-${k}].active`); if (b) s[k] = b.dataset[k]; } return s; }
  const navSame = (a, b) => NAV_KEYS.every(k => (a || {})[k] === (b || {})[k]);
  // popups the Back button may close (Welcome Back and cloud choice must be answered, so they stay)
  const BACK_CLOSE = [
    ['confirm-modal', () => closeAsk()], ['item-modal', () => closeItem()], ['slot-modal', () => closeSlot()],
    ['pick-modal', () => $('pick-cancel').click()], ['build-modal', () => $('build-cancel').click()],
    ['found-modal', () => $('fm-cancel').click()], ['demo-modal', () => $('demo-continue').click()],
    ['dev-panel', () => $('dev-panel').classList.add('hidden')],
  ];
  function initBackButton() {
    if (!window.history || !history.pushState) return;
    try { history.replaceState({ ctcNav: navSnap() }, ''); } catch (e) { return; }
    // after any real tap on a tab button, record the new place
    document.addEventListener('click', e => {
      if (!e.isTrusted || !e.target.closest(NAV_KEYS.map(k => `[data-${k}]`).join(','))) return;
      setTimeout(() => { const s = navSnap(), cur = (history.state || {}).ctcNav; if (!navSame(s, cur)) try { history.pushState({ ctcNav: s }, ''); } catch (x) {} }, 0);
    });
    window.addEventListener('popstate', e => {
      const open = BACK_CLOSE.find(([id]) => $(id) && !$(id).classList.contains('hidden'));
      const blocking = ['welcome', 'cloud-modal'].some(id => $(id) && !$(id).classList.contains('hidden'));
      const here = navSnap();
      if (open || blocking) { if (open) open[1](); try { history.pushState({ ctcNav: here }, ''); } catch (x) {} return; }
      const st = e.state && e.state.ctcNav;
      if (!st) return;
      for (const k of NAV_KEYS) { if (!st[k] || st[k] === here[k]) continue; const b = document.querySelector(`[data-${k}="${st[k]}"]`); if (b && !b.disabled && !b.classList.contains('locked')) b.click(); }
    });
  }
  function rightShow(key) { for (const k in RIGHT) $(RIGHT[k]).classList.toggle('hidden', k !== key); }

  // ---- Paper doll ----
  const DOLL = [['', 'helm', ''], ['weapon', 'chest', 'gloves'], ['trinket', 'boots', '']];
  function renderDoll() {
    const S = Game.S, d = $('doll'), IS = desktop ? 22 : 28;
    let html = '<div class="doll-tools">';
    for (const s in CONFIG.toolSlots) { const def = CONFIG.toolSlots[s], it = S.hero.tools[s];
      html += `<div class="doll-wrap"><div class="doll-slot tool ${it ? 'filled' : 'empty'}" data-kind="tool" data-slot="${s}" title="${it ? CONFIG.toolTiers[it.tier].name + ' ' : ''}${def.name}">${ico(gearIcon('tool', s, it), IS, it ? '' : 'ghost')}<div class="doll-name">${def.name === 'Skinning Knife' ? 'Knife' : def.name}</div>${it ? `<div class="doll-tier">${CONFIG.toolTiers[it.tier].name}</div>` : ''}</div><div class="doll-lvl">${it ? 'Lv' + it.level : ''}</div></div>`; }
    html += '</div><div class="doll-gear">';
    for (const rowSlots of DOLL) { html += '<div class="doll-row">'; for (const s of rowSlots) {
      if (!s) { html += '<div class="doll-wrap"><div class="doll-slot blank"></div></div>'; continue; }
      const def = CONFIG.slots[s], it = S.hero.gear[s];
      html += `<div class="doll-wrap"><div class="doll-slot ${it ? 'filled' : 'empty'}" data-kind="gear" data-slot="${s}" title="${it ? Game.tierName(s, it.tier) + ' ' : ''}${def.name}">${ico(gearIcon('gear', s, it), IS, it ? '' : 'bare')}<div class="doll-name">${def.name}</div>${it ? `<div class="doll-tier">${Game.tierName(s, it.tier)}</div>` : ''}</div><div class="doll-lvl">${it ? 'Lv' + it.level : ''}</div></div>`;
    } html += '</div>'; }
    html += '</div>';
    if (d.__h !== html) { setHtml(d, html); glowKey = ''; }
  }
  // Stats summary: each combat stat, which gear drives it, and the next thing to do for it
  const STAT_ROWS = [
    { slot: 'weapon',  label: 'Attack power', val: st => Game.fmt(st.attack) + ' per hit' },
    { slot: 'gloves',  label: 'Attack speed', val: st => st.speed.toFixed(2) + ' hits/s' },
    { slot: 'trinket', label: 'Crit chance',  val: st => Math.round(st.crit * 100) + '%' },
    { slot: 'chest',   label: 'Max HP',       val: st => Game.fmt(st.maxHp) },
    { slot: 'helm',    label: 'Armor',        val: st => '−' + st.armor.toFixed(1) + ' per hit taken' },
    { slot: 'boots',   label: 'Dodge',        val: st => Math.round(st.dodge * 100) + '%' },
  ];
  function gearAdvice(s) {
    const S = Game.S, it = S.hero.gear[s], nm = s === 'weapon' ? 'Sword' : CONFIG.slots[s].name;
    if (Game.crafting() && Game.crafting().slot === s) return { txt: 'Forging now…', ready: false };
    if (!it) return Game.canTierUp(s) ? { txt: `Forge ${Game.tierName(s, 0)} ${nm}`, ready: Game.canAfford(Game.gearCraftCost(s)) } : { txt: `Research a ${nm.toLowerCase()} in Tech`, ready: false, locked: true };
    if (it.level < CONFIG.tierUpAt) return { txt: `Upgrade ${nm} (Lv ${it.level} → ${CONFIG.tierUpAt})`, ready: Game.canAfford(Game.gearUpgradeCost(s)) };
    if (Game.canTierUp(s)) return { txt: `Forge ${Game.tierName(s, it.tier + 1)} ${nm}`, ready: Game.canAfford(Game.gearCraftCost(s)) };
    return { txt: `Maxed for now — research the next tier`, ready: false, locked: true };
  }
  function renderStats() {
    const box = $('stat-list'); if (!box) return;
    $('stat-card').classList.toggle('hidden', !tabUnlocked('gear'));
    const S = Game.S, st = Game.stats();
    // the weakest piece (lowest gear value) is the best next upgrade
    const cand = STAT_ROWS.map(r => r.slot).filter(s => !gearAdvice(s).locked);
    const best = cand.sort((a, b) => Game.slotValue(a) - Game.slotValue(b) || (a === 'weapon' ? -1 : b === 'weapon' ? 1 : 0))[0];
    let h = `<div class="stat-top"><div><span class="dim small">Damage per second</span><b>${Game.fmt(st.dps)}</b></div><div><span class="dim small">Heal per second</span><b>${st.regen.toFixed(1)}</b></div></div>`;
    for (const r of STAT_ROWS) {
      const it = S.hero.gear[r.slot], a = gearAdvice(r.slot);
      const sn = r.slot === 'weapon' ? 'Sword' : CONFIG.slots[r.slot].name, src = it ? `${Game.tierName(r.slot, it.tier)} ${sn} Lv ${it.level}` : (r.slot === 'weapon' ? 'Fists' : `No ${sn.toLowerCase()}`);
      h += `<button class="stat-row ${r.slot === best ? 'best' : ''}" data-stat="${r.slot}">
        <span class="stat-ic">${ico(gearIcon('gear', r.slot, it), 22, it ? '' : 'bare')}</span>
        <span class="stat-main"><span class="stat-k">${r.label}</span><span class="stat-src">${src}</span></span>
        <span class="stat-v">${r.val(st)}</span>
        <span class="stat-tip ${a.locked ? 'dim' : ''}">${r.slot === best ? '<b class="stat-best">Best next</b> ' : ''}${a.txt}${a.ready ? ' <span class="stat-ready">ready</span>' : ''}</span>
      </button>`;
    }
    if (box.__h !== h) { box.__h = h; box.innerHTML = h; box.querySelectorAll('[data-stat]').forEach(b => b.onclick = () => openSlot('gear', b.dataset.stat)); }
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
  const TRACK = { rate: 'Work', cart: 'Cart', haul: 'Haul' };
  const PH = ['Work', 'Cart', 'Haul'];
  const ROLE = { foreman: 'Foreman · speeds up Work', carter: 'Carter · speeds up Haul', packer: 'Packer · speeds up Cart' };
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
      if (!open) {
        const avail = Game.stepAvailable(st.id);
        if (!avail) { h += `<div class="card kstep locked-step"><div class="kstep-head">${ico(st.icon, 24)}<div><div class="kstep-name">${st.name}</div><div class="tiny dim">Makes ${R[st.make].name}${st.from ? ' from ' + R[st.from].name : ''}</div></div><div class="kout dim small">Unlocks at<br><b>${CONFIG.kingdom.tiers[st.tier].name}</b></div></div></div>`; return; }
        h += `<div class="card kstep kbuild" data-build="${st.id}"><div class="kstep-head">${ico(st.icon, 24)}<div><div class="kstep-name">${st.name}</div><div class="tiny dim">Makes ${R[st.make].name}${st.from ? ' from ' + R[st.from].name : ''}</div></div></div><button class="buy wide" data-f="build"><span class="small">Build the ${st.name}</span><br><span class="cost" data-f="bcost"></span></button></div>`; return;
      }
      h += `<div class="card kstep" data-step="${st.id}">
        <div class="kstep-head">${ico(st.icon, 24)}<div><div class="kstep-name" data-f="name">${st.name}</div><div class="tiny dim">${st.from ? `${st.ratio} ${R[st.from].name} → 1 ${R[st.make].name}` : 'Gathers ' + R[st.make].name}</div></div><div class="kout"><b data-f="out"></b> <span class="small dim">/s</span><div class="tiny" data-f="lim"></div></div></div>
        ${st.from ? `<div class="kin"><span class="small dim">${R[st.from].name} in</span><div class="bar green-bar"><div data-f="inbar"></div><span data-f="inlab"></span></div></div>` : ''}
        <div class="klevel"><div class="klv"><div class="klv-top"><b>Lv <span data-f="lv"></span></b><span class="small dim" data-f="ms"></span></div><div class="bar gold-bar klv-bar"><div data-f="msbar"></div></div></div>
          <button class="buy" data-f="up"><span class="small" data-f="uplab">Upgrade</span><br><span class="cost" data-f="cost"></span></button></div>
        <div class="kcycle">${[0, 1, 2].map(i => `<div class="kseg kseg${i}" data-seg="${i}"><div class="kfill"></div><span>${i === 0 && st.from ? "Craft" : PH[i]}</span></div>`).join("")}</div><div class="tiny dim kcyc-lab" data-f="cartlab"></div>
        <div class="kslow hidden" data-f="slow">▲ Slowest in this chain — upgrading it speeds up everything after it</div>
        ${L.steps[i + 1] && Game.stepBuilt(L.steps[i + 1].id) ? `<div class="kstock"><div class="kstock-head"><span>Keep ${R[st.make].name.toLowerCase()} in stock</span><span class="kstock-n" data-f="stn"></span></div><div class="seg kstock-seg">${Game.STOCK_MODES.map(m => `<button data-stock="${m}">${m === 'auto' ? 'Auto' : m === 0 ? '0' : m === 1 ? 'Full' : m === 0.5 ? '½' : '¼'}</button>`).join('')}</div><div class="tiny kstock-why" data-f="stwhy"></div></div>` : ''}
      </div>`;
    });
    const steps = Game.lineSteps(lid), last = steps[steps.length - 1];
    if (last) h += `<div class="kflow">▼ ${R[last.make].name} to the ${Game.phase() === 3 && CONFIG.kingdom.war.quartermaster[last.make] ? 'army (' + R[CONFIG.kingdom.war.quartermaster[last.make]].name + ')' : 'Storehouse'}</div>`;
    box.innerHTML = h; rows.step[lid] = {};
    box.querySelectorAll('[data-build]').forEach(card => { const id = card.dataset.build; rows.step[lid][id] = card; card.querySelector('[data-f=build]').addEventListener('click', () => { if (Game.buildStep(id)) { lineKey[lid] = ''; render(true); } }); });
    box.querySelectorAll('[data-step]').forEach(card => {
      const id = card.dataset.step; rows.step[lid][id] = card;
      card.querySelector('[data-f=up]').addEventListener('click', () => { if (Game.upgradeStep(id, null, kBuy)) { flash(card.querySelector('.klevel')); render(true); } });
      card.querySelectorAll('[data-stock]').forEach(b => b.addEventListener('click', () => { const v = b.dataset.stock; if (Game.setStockMode(Game.stepDef(id).make, v === 'auto' ? 'auto' : +v)) { Game.save(); render(true); } }));
    });
    box.closest('.ksub').querySelector('[data-kbar]').innerHTML = kbarHtml();
    box.closest('.ksub').querySelectorAll('[data-kbuy]').forEach(b => b.addEventListener('click', () => { kBuy = b.dataset.kbuy === 'max' ? 'max' : +b.dataset.kbuy; for (const l in lineKey) lineKey[l] = ''; render(true); }));
    glowKey = '';
  }
  // the chain's slowest building: its output in final-good terms is the lowest
  function slowestInLine(lid) {
    const steps = Game.lineSteps(lid); if (steps.length < 2) return null; let best = null, min = Infinity;
    steps.forEach((st, i) => { let cap = Game.stepOutput(st.id); for (let j = i + 1; j < steps.length; j++) cap /= steps[j].ratio; if (cap < min - 1e-9) { min = cap; best = st.id; } });
    return best;
  }
  function renderLine(lid) {
    const S = Game.S, f = Game.fmt;
    const key = Game.kingdomNo() + '|' + Game.kTier() + '|' + Game.phase() + '|' + JSON.stringify(S.kingdom.built || {}) + '|' + kBuy;
    if (lineKey[lid] !== key) { lineKey[lid] = key; buildLine(lid); }
    let anyUp = false;
    for (const st of CONFIG.kingdom.lines[lid].steps) { const bc = rows.step[lid] && rows.step[lid][st.id]; if (!bc || !bc.dataset.build) continue; setHtml(bc.querySelector('[data-f=bcost]'), costHtml(st.build)); const cb = Game.canBuild(st.id); bc.querySelector('[data-f=build]').disabled = !cb; if (cb) anyUp = true; }
    const slow = slowestInLine(lid);
    for (const st of Game.lineSteps(lid)) {
      const card = rows.step[lid] && rows.step[lid][st.id]; if (!card) continue;
      const s = Game.stepState(st.id), lim = Game.stepLimit(st.id), lv = Game.stepLv(st.id), nm = Game.nextMilestone(lv), prev = [0, ...CONFIG.kingdom.milestones].filter(m => m <= lv).pop();
      setText(card.querySelector('[data-f=name]'), Game.stepName(st.id));
      setText(card.querySelector('[data-f=out]'), Game.stepOutput(st.id).toFixed(2));
      setHtml(card.querySelector('[data-f=lim]'), lim === 'starved' ? `<span class="warn">Waiting for ${R[st.from].name.toLowerCase()}</span>` : '');
      setText(card.querySelector('[data-f=lv]'), lv);
      const cap = Game.levelCap();
      setText(card.querySelector('[data-f=ms]'), lv >= cap ? `max for a ${Game.tierDef().name}` : nm ? `×2 output at Lv ${nm}` : '');
      card.querySelector('[data-f=msbar]').style.width = (nm ? 100 * (lv - prev) / (nm - prev) : 100) + '%';
      const p = Game.stepUpPlan(st.id, null, kBuy), btn = card.querySelector('[data-f=up]');
      setText(card.querySelector('[data-f=uplab]'), lv >= cap ? 'Max level' : p.n > 1 ? `Upgrade +${p.n}` : 'Upgrade');
      setHtml(card.querySelector('[data-f=cost]'), lv >= cap ? `<span class="dim small">raise the settlement</span>` : costHtml(p.n ? p.cost : Game.stepUpCost(st.id)));
      btn.disabled = !p.n; if (p.n) anyUp = true;
      card.querySelector('[data-f=slow]').classList.toggle('hidden', st.id !== slow); card.classList.toggle('slowest', st.id === slow);
      { const PHS = Game.stepPhases(st.id), cyc = PHS[0] + PHS[1] + PHS[2];
        card.querySelectorAll('[data-seg]').forEach(seg => { const i = +seg.dataset.seg; seg.style.flexGrow = (PHS[i] / cyc).toFixed(4); const fill = i < s.phase ? 100 : i > s.phase ? 0 : 100 * Math.min(1, s.t / PHS[i]); seg.firstChild.style.width = fill + '%'; seg.classList.toggle('on', i === s.phase); });
        setText(card.querySelector('[data-f=cartlab]'), `${Game.stepBatch(st.id)} ${R[st.make].name.toLowerCase()} every ${cyc.toFixed(1)}s · now: ${[st.from ? 'crafting' : 'working', 'loading the cart', 'hauling'][s.phase]}${s.phase === 0 && lim === 'starved' ? ' (waiting for ' + R[st.from].name.toLowerCase() + ')' : ''}`); }
      if (card.querySelector('[data-f=stn]')) { const k = st.make, T = Game.stockTarget(k), have = Math.floor(S.res[k] || 0), nx = Game.nextStep(st.id), nxn = nx ? nx.name : 'next building';
        card.querySelectorAll('[data-stock]').forEach(b => b.classList.toggle('active', String(T.mode) === b.dataset.stock));
        setText(card.querySelector('[data-f=stn]'), `${f(Math.min(have, T.target))} / ${f(T.target)}`);
        const why = card.querySelector('[data-f=stwhy]');
        if (T.target <= 0) { setHtml(why, `<span class="dim">Nothing needed — every ${R[k].name.toLowerCase()} feeds the ${nxn}.</span>`); }
        else if (have < T.target) setHtml(why, `<span class="kstock-fill">${T.share < 1 ? 'Half to the Storehouse' : 'Storehouse first'}${T.why.length ? ' for the ' + T.why.join(', the ').replace(/the orders$/, 'Keep orders') : ''}${T.share < 1 ? ', half to the ' + nxn : ', then the ' + nxn}.</span>`);
        else setHtml(why, `<span class="dim">Stock is full${T.why.length ? ' (' + T.why.join(', ') + ')' : ''} — the rest feeds the ${nxn}.</span>`); }
      if (st.from) { card.querySelector('[data-f=inbar]').style.width = Math.min(100, 100 * s.inBuf / (st.ratio * Game.stepBatch(st.id) * 2)) + '%'; setText(card.querySelector('[data-f=inlab]'), `${Math.floor(s.inBuf)} waiting`); }
    }
    return anyUp;
  }

  // ---- 0.12: Kingdom → Production — three chains feed the Barracks ----
  const PROD_COLS = ['forest', 'mine', 'farm'], PROD_HEAD = { forest: 'People', mine: 'Arms', farm: 'Food' };
  const artOf = st => `assets/buildings/${st.art || st.id}.webp`;
  let prodKey = '', bldOpen = null, bldKey = '';
  function openBld(id) { bldOpen = id; bldKey = ''; Game.markViewed('bld:' + id); $('prod-view').classList.add('hidden'); $('bld-view').classList.remove('hidden'); render(true); window.scrollTo(0, 0); }
  function closeBld() { bldOpen = null; $('bld-view').classList.add('hidden'); $('prod-view').classList.remove('hidden'); render(true); }
  function partBtn(id, p, small, d = 1) { return `<button class="buy pbtn" data-part="${p}" data-id="${id}" data-d="${d}"><span class="${small ? 'tiny' : 'small'}" data-f="pl${p}">${Game.partName(id, p)}</span>${small ? '' : ' <span class="small dim" data-f="plv' + p + '"></span>'}<br><span class="cost" data-f="pc${p}"></span></button>`; }
  function wirePartBtns(root) { root.querySelectorAll('[data-part]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); if (Game.upgradeStep(b.dataset.id, b.dataset.part, kBuy, +b.dataset.d || 1)) { flash(b); render(true); } })); }
  function fillPartBtn(root, id, p, small, d = 1) {
    const b = root.querySelector(`[data-part="${p}"][data-id="${id}"][data-d="${d}"]`); if (!b) return false;
    const cap = Game.levelCap(), lv = Game.partLv(id, p, d), plan = Game.stepUpPlan(id, p, kBuy, d), lim = Game.limitPart(id, d) === p;
    b.classList.toggle('hot', lim); b.disabled = !plan.n;
    if (!small) setText(b.querySelector(`[data-f=plv${p}]`), `Lv ${lv}${plan.n > 1 ? ' → ' + (lv + plan.n) : ''}`);
    else setText(b.querySelector(`[data-f=pl${p}]`), `${Game.partName(id, p)} ${lv}`);
    setHtml(b.querySelector(`[data-f=pc${p}]`), lv >= cap ? '<span class="dim tiny">max</span>' : costHtml(plan.n ? plan.cost : Game.stepUpCost(id, p, null, d)).replace(/<span class="cost-name">[^<]*<\/span>/g, ''));
    return !!plan.n;
  }
  function buildProd() {
    const S = Game.S, T = CONFIG.kingdom.tiers; let h = '';
    for (let r = 0; r < 3; r++) {
      if (r) h += `<div class="prod-arrows">${PROD_COLS.map(() => '<span>▼</span>').join('')}</div>`;
      h += '<div class="prod-row">';
      for (const lid of PROD_COLS) { const st = CONFIG.kingdom.lines[lid].steps[r], built = Game.stepBuilt(st.id), avail = Game.stepAvailable(st.id);
        if (built) h += `<div class="pcard" data-card="${st.id}" data-glow="step:${st.id}"><img class="part-art" src="${artOf(st)}" alt=""><span class="ptag" data-f="lv"></span><span class="pslow hidden" data-f="slow">slowest</span><div class="pname">${st.name}</div><div class="prate" data-f="rate"></div><div class="pload"><i data-f="load"></i></div><div class="pparts">${Game.PARTS.map(p => partBtn(st.id, p, true, Game.depthCount(st.id))).join('')}</div><button class="penter" data-enter="${st.id}">Enter ›</button></div>`;
        else if (avail) h += `<div class="pcard pbuild" data-card="${st.id}" data-glow="step:${st.id}"><img class="part-art dimart" src="${artOf(st)}" alt=""><div class="pname">${st.name}</div><div class="pdesc">${st.from ? `${R[st.from].name} → ${R[st.make].name}` : 'Makes ' + R[st.make].name.toLowerCase()}</div><button class="buy wide" data-build="${st.id}"><span class="small">Build</span><br><span class="cost" data-f="bcost"></span></button></div>`;
        else h += `<div class="pcard plock"><img class="part-art lockart" src="${artOf(st)}" alt=""><div class="pname">${st.name}</div><div class="pdesc">🔒 ${T[st.tier].name}</div></div>`; }
      h += '</div>';
    }
    setHtml($('prod-grid'), h);
    $('prod-grid').querySelectorAll('[data-build]').forEach(b => b.addEventListener('click', () => { if (Game.buildStep(b.dataset.build)) { prodKey = ''; render(true); } }));
    $('prod-grid').querySelectorAll('[data-enter]').forEach(b => b.addEventListener('click', () => openBld(b.dataset.enter)));
    $('prod-grid').querySelectorAll('.pcard[data-card] .part-art').forEach(im => im.addEventListener('click', () => { const id = im.closest('[data-card]').dataset.card; if (Game.stepBuilt(id)) openBld(id); }));
    wirePartBtns($('prod-grid'));
    $('prod-kbar').innerHTML = kbarHtml(); $('prod-kbar').querySelectorAll('[data-kbuy]').forEach(b => b.addEventListener('click', () => { kBuy = b.dataset.kbuy === 'max' ? 'max' : +b.dataset.kbuy; prodKey = ''; bldKey = ''; render(true); }));
    glowKey = '';
  }
  function rateTxt(st) { const out = Game.stepOutput(st.id); if (st.id === 'carpenter' && Game.housesOn()) { const sec = out > 0 ? Game.houseCost() / out : 0; return sec ? `1 house / ${sec < 90 ? Math.round(sec) + 's' : Math.round(sec / 60) + 'm'}` : '—'; } return `${out < 10 ? out.toFixed(2) : Game.fmt(out)}<small>/s ${R[st.make].name.toLowerCase()}</small>`; }
  function renderProd() {
    const S = Game.S, f = Game.fmt; if (Game.kingdomNo() < 1) return false;
    const key = Game.kTier() + '|' + Game.phase() + '|' + JSON.stringify(S.kingdom.built || {}) + '|' + kBuy + '|' + Game.allSteps().map(x => Game.depthCount(x.id)).join();
    if (prodKey !== key) { prodKey = key; buildProd(); }
    let any = false; const slow = {}; for (const lid of PROD_COLS) slow[Game.slowestInLine(lid)] = true;
    for (const lid of PROD_COLS) for (const st of CONFIG.kingdom.lines[lid].steps) { const card = $('prod-grid').querySelector(`[data-card="${st.id}"]`); if (!card) continue;
      if (card.classList.contains('pbuild')) { setHtml(card.querySelector('[data-f=bcost]'), costHtml(st.build)); const cb = Game.canBuild(st.id); card.querySelector('[data-build]').disabled = !cb; if (cb) any = true; continue; }
      { const P = Game.pipe(st.id, 1), T = Game.tripTime(st.id, 'H', 1); card.querySelector('[data-f=load]').style.width = (P.h > 1e-9 ? 100 * Math.min(1, P.th / T) : 0) + '%'; }
      { const dc = Game.depthCount(st.id); setText(card.querySelector('[data-f=lv]'), dc > 1 ? `${dc} ${Game.unitName(st.id, true)}` : 'Lv ' + Game.stepLv(st.id)); } setHtml(card.querySelector('[data-f=rate]'), rateTxt(st));
      const sl = !!slow[st.id]; card.classList.toggle('slowest', sl); card.querySelector('[data-f=slow]').classList.toggle('hidden', !sl);
      for (const p of Game.PARTS) if (fillPartBtn(card, st.id, p, true, Game.depthCount(st.id))) any = true; }
    renderTown(); renderBarracks(); renderProdTip();
    if (bldOpen) renderBld();
    return any;
  }
  function renderTown() {
    const S = Game.S, f = Game.fmt, box = $('prod-town'), hs = Game.houses(), built = Game.stepBuilt('carpenter');
    box.classList.toggle('hidden', !built && hs < 1); if (!built && hs < 1) return;
    const cap = Game.houseCap(), pop = Game.people(), sol = Game.soldiers(), room = Game.houseRoom(), prog = (S.kingdom.houseProg || 0) / Game.houseCost(), tr = Game.turnedRecent(), sph = Game.settlersPerHour();
    setHtml(box, `<div class="town-row"><img src="assets/buildings/carpenter.webp" alt=""><div class="town-main"><div class="town-n"><b>${f(pop)}</b> people${sol ? ` · <b>${f(sol)}</b> soldiers` : ''} <span class="dim">/ ${f(cap)} room in ${f(hs)} house${hs === 1 ? '' : 's'}</span></div>
      <div class="bar town-bar"><div style="width:${cap ? Math.min(100, 100 * (pop + sol) / cap) : 0}%"></div><span>${Game.birthRoom() > 0 ? `+1 person every ${Math.round(60 / Math.max(0.01, Game.birthsPerMin()))}s` : room > 0 ? `${f(room)} homes kept for settlers` : 'Full — build houses'}</span></div>
      <div class="tiny dim">Next house ${Math.round(prog * 100)}% · head tax ${f(Game.headTaxPerHour())} gold/h${sph > 0 ? ` · settlers ${sph.toFixed(1)}/h from your lands` : ''}</div>
      ${tr > 0 ? `<div class="tiny warn">${f(tr)} settlers found no home in the last hour — build houses.</div>` : ''}</div></div>`);
  }
  function renderBarracks() {
    const S = Game.S, f = Game.fmt, card = $('barracks-card'), av = Game.barracksAvailable(), built = Game.barracksBuilt();
    const c = Game.nextSoldierCost(), bl = Game.trainBlocker(), rate = Game.trainPerMin(), p3 = Game.phase() === 3, held = Game.landsHeld(), nx = Math.min(held + 1, CONFIG.ages.lands), rec = Game.recArmy(nx), sol = Game.soldiers();
    const why = { houses: 'no houses yet — build the Carpenter', people: 'no free people — houses fill with people', swords: 'short of arms — grow the Mine chain', bread: 'short of bread — grow the Farm chain' }[bl];
    const k = [av, built, Game.barracksLv(), bl, sol, Math.ceil(c.swords), Math.ceil(c.bread), rate.toFixed(1), p3, held, S.res.gold > 0 && Game.canUpBarracks()].join('|');
    if (card.__k !== k) { card.__k = k;
      setHtml(card, `<div class="bk-top"><img src="assets/buildings/barracks.webp" alt=""><div><div class="pname pname-lg">Barracks ${built ? '<span class="dim small">Lv ' + Game.barracksLv() + '</span>' : ''}</div><div class="tiny dim">1 person + arms + bread → 1 soldier</div></div><div class="bk-sol"><b>${f(sol)}</b><span class="tiny dim">soldiers</span></div></div>
        ${!av ? `<div class="small dim">🔒 The Barracks is built in a City.</div>` : `
        ${built ? `<div class="bk-row"><span>Next soldier</span><span>${costHtml({ people: 1, swords: Math.ceil(c.swords), bread: Math.ceil(c.bread) }).replace(/<span class="cost-name">[^<]*<\/span>/g, '')}</span></div>
        <div class="bk-row"><span>Training</span><span class="${bl ? 'warn' : 'good'}">${bl ? 'paused: ' + why : `+${rate.toFixed(1)} / min`}</span></div>
        <div class="tiny dim">Each soldier costs a little more than the last; losses in battle bring the price back down.</div>` : ''}
        ${p3 ? `<div class="bk-rec"><div class="row-between small"><span>Next land${Game.landDef(nx) ? ' · <b>' + Game.landDef(nx).name + '</b>' : ''}</span><span class="dim">recommended ${f(rec)}</span></div><div class="bar gold-bar"><div style="width:${Math.min(100, 100 * Game.marching() / rec)}%"></div><span>${f(Game.marching())} marching</span></div></div>` : ''}
        <button class="buy wide" id="barracks-up"><span class="small">${built ? 'Upgrade the Barracks (faster training)' : 'Build the Barracks'}</span><br><span class="cost">${costHtml(Game.barracksCost())}</span></button>`}`);
      const b = $('barracks-up'); if (b) { b.disabled = !Game.canUpBarracks(); b.addEventListener('click', () => { if (Game.upgradeBarracks()) { card.__k = ''; render(true); } }); } }
    else { const b = $('barracks-up'); if (b) b.disabled = !Game.canUpBarracks(); }
    return av && !built && Game.canUpBarracks();
  }
  function renderProdTip() {
    const tip = $('prod-tip'); let t = '';
    if (Game.barracksBuilt()) { const bl = Game.trainBlocker();
      if (bl === 'people' || bl === 'houses') t = `<b>The Barracks is waiting for people.</b> Every soldier is a person — houses fill with people, so build houses: grow the People chain (the Carpenter raises them).`;
      else if (bl === 'swords') t = `<b>Arms are holding the army back.</b> Grow the Arms chain — start with its slowest building.`;
      else if (bl === 'bread') t = `<b>Bread is holding the army back.</b> Grow the Food chain — start with its slowest building.`; }
    if (!t) { const sl = PROD_COLS.map(l => Game.slowestInLine(l)).filter(Boolean); if (sl.length) t = `Each chain's <b>slowest</b> building is marked — upgrading it speeds up everything after it. Inside a building, the part with the <b>gold</b> bar is the one holding it back.`; }
    setHtml(tip, t); tip.classList.toggle('hidden', !t);
  }
  function renderBld() {
    const S = Game.S, f = Game.fmt, id = bldOpen, st = Game.stepDef(id), box = $('bld-view'); if (!st || !Game.stepBuilt(id)) { closeBld(); return; }
    const L = CONFIG.kingdom.lines[st.line], nx = Game.nextStep(id), key = id + '|' + kBuy + '|' + (nx ? nx.id : '') + '|' + Game.housesOn() + '|' + Game.depthCount(id);
    if (bldKey !== key) { bldKey = key;
      const stock = nx ? `<div class="kstock"><div class="kstock-head"><span>Keep ${R[st.make].name.toLowerCase()} in stock</span><span class="kstock-n" data-f="stn"></span></div><div class="seg kstock-seg">${Game.STOCK_MODES.map(m => `<button data-stock="${m}">${m === 'auto' ? 'Auto' : m === 0 ? '0' : m === 1 ? 'Full' : m === 0.5 ? '½' : '¼'}</button>`).join('')}</div><div class="tiny kstock-why" data-f="stwhy"></div></div>` : '';
      const houseBox = id === 'carpenter' ? `<div class="card"><div class="row-between"><b>Houses</b><span class="seg"><button data-houses="1" class="${Game.housesOn() ? 'active' : ''}">Build houses</button><button data-houses="0" class="${Game.housesOn() ? '' : 'active'}">Store lumber</button></span></div><div data-f="houses" class="small" style="margin-top:6px"></div></div>` : '';
      setHtml(box, `<button class="back-btn" data-back>‹ Production</button>
        <div class="bld-hero"><img src="${artOf(st)}" srcset="${artOf(st)} 1x, assets/buildings/${st.art || st.id}@2x.webp 2x" alt=""><div class="bld-title">${st.name}<small>${st.desc || ''}</small></div><div class="bld-out" data-f="out"></div></div>
        <div class="kbar" id="bld-kbar"></div>
        ${Array.from({ length: Game.depthCount(id) }, (_, i) => i + 1).map(d => `<div class="card depth-card" data-depth="${d}"><div class="depth-l"><small>${Game.unitName(id).toUpperCase()}</small><b>${d}</b><em>×${Game.depthYield(d) < 10 ? Game.depthYield(d).toFixed(1) : Game.fmt(Game.depthYield(d))}</em></div><div class="depth-r">
          <div class="row-between small"><b>${R[st.make].name}</b><span data-f="drate"></span></div>
          ${Game.PARTS.map(p => `<div class="part-row" data-prow="${p}"><div class="pr-name"><b>${Game.partName(id, p)}</b> <span class="dim small" data-f="lv${p}"></span><div class="bar part-bar"><div data-f="bar${p}"></div><span data-f="load${p}"></span></div><span class="tiny dim" data-f="d${p}"></span></div>${partBtn(id, p, false, d)}</div>${p !== 'H' ? `<div class="pile" data-f="pile${p}"></div>` : ''}`).join('')}
        </div></div>`).join('')}
        ${st.from ? `<div class="card kin"><span class="small dim">${R[st.from].name} in</span><div class="bar green-bar"><div data-f="inbar"></div><span data-f="inlab"></span></div></div>` : ''}
        <div class="card dig-card"><div class="dig-t">${st.dig} · ${Game.unitName(id)} ${Game.depthCount(id) + 1}</div><div class="tiny dim" data-f="digwhy"></div><button class="buy wide" data-dig><span class="small">${st.dig}</span><br><span class="cost" data-f="digcost"></span></button></div>
        ${houseBox}${stock}`);
      box.querySelector('[data-back]').addEventListener('click', closeBld);
      wirePartBtns(box); box.querySelector('[data-dig]').addEventListener('click', () => { if (Game.dig(id)) { bldKey = ''; prodKey = ''; render(true); } });
      box.querySelectorAll('[data-stock]').forEach(b => b.addEventListener('click', () => { const v = b.dataset.stock; if (Game.setStockMode(st.make, v === 'auto' ? 'auto' : +v)) { Game.save(); render(true); } }));
      box.querySelectorAll('[data-houses]').forEach(b => b.addEventListener('click', () => { Game.setHousesOn(b.dataset.houses === '1'); bldKey = ''; render(true); }));
      $('bld-kbar').innerHTML = kbarHtml(); $('bld-kbar').querySelectorAll('[data-kbuy]').forEach(b => b.addEventListener('click', () => { kBuy = b.dataset.kbuy === 'max' ? 'max' : +b.dataset.kbuy; prodKey = ''; bldKey = ''; render(true); }));
      glowKey = ''; }
    const s = Game.stepState(id), out = Game.stepOutput(id), fo = v => v < 10 ? v.toFixed(2) : f(v);
    const dest = id === 'carpenter' && Game.housesOn() ? 'To houses' : nx ? `To the ${nx.name}` : 'To the Storehouse', use = nx ? Game.stepOutput(nx.id) * nx.ratio : 0;
    setHtml(box.querySelector('[data-f=out]'), `${dest}<b>${fo(out)}/s</b>${nx ? `${nx.name} uses ${fo(use)}/s` : ''}`);

    for (let d = 1; d <= Game.depthCount(id); d++) { const dc = box.querySelector(`[data-depth="${d}"]`); if (!dc) continue; const caps = Game.PARTS.map(p => Game.partCap(id, p, d)), mx = Math.max(...caps), lim = Game.limitPart(id, d), dout = Game.depthOutput(id, d);
      setHtml(dc.querySelector('[data-f=drate]'), `<b>${fo(dout)}</b> <span class="dim">/s</span>`);
      const P = Game.pipe(id, d), prog = { W: [P.w, P.tw], C: [P.c, P.tc], H: [P.h, P.th] }, next = { W: Game.partName(id, 'C'), C: Game.partName(id, 'H'), H: dest.replace('To ', '') };
      Game.PARTS.forEach((p, i) => { const lv = Game.partLv(id, p, d), nm = Game.nextMilestone(lv), T = Game.tripTime(id, p, d), L = Game.tripLoad(id, p, d), [carry, t] = prog[p], moving = carry > 1e-9;
        setText(dc.querySelector(`[data-f=lv${p}]`), 'Lv ' + lv);
        const bar = dc.querySelector(`[data-f=bar${p}]`); bar.style.width = (moving ? 100 * Math.min(1, t / T) : 0) + '%'; bar.parentElement.classList.toggle('lim', p === lim);
        setText(dc.querySelector(`[data-f=load${p}]`), moving ? `${fo(carry)} ${R[st.make].name.toLowerCase()}` : (p === 'W' ? (st.from ? `waiting for ${R[st.from].name.toLowerCase()}` : 'resting') : 'waiting'));
        setText(dc.querySelector(`[data-f=d${p}]`), `${fo(L)} per trip · ${T.toFixed(1)}s · ${fo(caps[i])}/s${p === lim ? ' — slowest' : nm ? ' · ×2 at Lv ' + nm : ''}`);
        if (p !== 'H') { const pile = p === 'W' ? P.a : P.b, pe = dc.querySelector(`[data-f=pile${p}]`), big = pile > Game.tripLoad(id, p === 'W' ? 'C' : 'H', d) * 1.5;
          setHtml(pe, `▼ <b>${fo(pile)}</b> waiting to ${next[p].toLowerCase()}${big ? ' — <span class="warn">piling up: ' + next[p] + ' can\'t keep up</span>' : ''}`); pe.classList.toggle('jam', big); }
        fillPartBtn(dc, id, p, false, d); }); }
    { const db = box.querySelector('[data-dig]'), open = Game.digOpen(), nd = Game.depthCount(id) + 1; db.disabled = !Game.canDig(id); setHtml(box.querySelector('[data-f=digcost]'), open ? costHtml(Game.digCost(id)) + (Game.digCost(id).gold > Game.resCap('gold') ? '<br><span class="tiny warn">more than your Storehouse holds — expand it in the Keep</span>' : '') : '<span class="dim">after Proclaim</span>');
      setText(box.querySelector('[data-f=digwhy]'), open ? `Starts at Lv 1 but makes ×${f(Game.depthYield(nd))} what the first ${Game.unitName(id).toLowerCase()} makes at the same level. Its own Work, Cart and Haul.` : 'Your town grows new levels once the Kingdom is proclaimed.'); }
    if (st.from) { box.querySelector('[data-f=inbar]').style.width = Math.min(100, 100 * s.inBuf / Math.max(1, st.ratio * (Game.stepOutput(id) * 30 + 10))) + '%'; setText(box.querySelector('[data-f=inlab]'), `${Math.floor(s.inBuf)} waiting`); }
    { const hb = box.querySelector('[data-f=houses]'); if (hb) setHtml(hb, `${f(Game.houses())} houses · room for ${f(Game.houseCap())} · next house needs ${Game.houseCost().toFixed(1)} lumber (${Math.round(100 * (S.kingdom.houseProg || 0) / Game.houseCost())}%). ${Game.housesOn() ? 'All new lumber goes to houses (after what the Storehouse needs).' : 'Lumber goes to the Storehouse; no houses are being built.'}`); }
    if (box.querySelector('[data-f=stn]')) { const k = st.make, T = Game.stockTarget(k), have = Math.floor(S.res[k] || 0), nxn = nx ? nx.name : 'next building';
      box.querySelectorAll('[data-stock]').forEach(b => b.classList.toggle('active', String(T.mode) === b.dataset.stock));
      setText(box.querySelector('[data-f=stn]'), `${f(Math.min(have, T.target))} / ${f(T.target)}`);
      const why = box.querySelector('[data-f=stwhy]');
      if (T.target <= 0) setHtml(why, `<span class="dim">Nothing needed — every ${R[k].name.toLowerCase()} feeds the ${nxn}.</span>`);
      else if (have < T.target) setHtml(why, `<span class="kstock-fill">${T.share < 1 ? 'Half to the Storehouse' : 'Storehouse first'}${T.why.length ? ' for the ' + T.why.join(', the ').replace(/the orders$/, 'Keep orders') : ''}${T.share < 1 ? ', half to the ' + nxn : ', then the ' + nxn}.</span>`);
      else setHtml(why, `<span class="dim">Stock is full${T.why.length ? ' (' + T.why.join(', ') + ')' : ''} — the rest feeds the ${nxn}.</span>`); }
  }

  // ---- 0.9: the army (Barracks tab) ----
  function renderArmy() {
    const S = Game.S, f = Game.fmt, p3 = Game.phase() === 3; if (!p3) return false;
    const sol = Game.soldiers(), lim = Game.armyLimit(), built = Game.barracksBuilt(), by = Game.armyLimitBy(), eff = Game.armyEff(), A = CONFIG.kingdom.army;
    const lname = W => CONFIG.kingdom.lines[W.line].name.replace('Grain ', '').replace('Iron ', '');
    if (!$('army-ico').__d) { setHtml($('army-ico'), ico(R.soldiers.icon, 20)); $('army-ico').__d = 1; }
    setText($('army-n'), f(sol)); setText($('army-lim'), built ? `/ ${f(lim)} soldiers` : 'soldiers');
    setText($('army-eff'), Math.round(eff * 100) + '%'); $('army-eff').className = 'army-eff ' + (eff < 1 ? 'bad' : 'good');
    setText($('army-status'), !built ? '· build the Barracks' : eff < 1 ? '· recruiting paused' : sol < lim ? `· +${Game.trainPerMin().toFixed(1)} joining / min` : '· at full strength');
    const lines = Game.WAR_KEYS.map(k => ({ k, W: A.lines[k], inc: Game.warIncome(k), dem: Game.warDemand(k), sup: Game.lineSupports(k), cov: Game.warCover(k) }));
    const pk = lines.map(L => [L.inc.toFixed(1), L.dem.toFixed(1), L.sup].join()).join('|') + by + sol;
    if ($('war-pipe').__k !== pk) { $('war-pipe').__k = pk;
      setHtml($('war-pipe'), lines.map((L, i) => { const stall = sol > 0 && L.cov < 1, diff = L.inc - L.dem;
        return `${i ? '<div class="pj">+</div>' : ''}<div class="pst${stall ? ' stall' : L.k === by ? ' lim' : ''}">${ico(R[L.W.good].icon, 26)}<div class="pn">${L.W.name}</div><div class="ps">${lname(L.W)}</div><div class="pp">${sol > 0 ? Math.round(Math.min(L.cov, 9.99) * 100) + '%' : f(L.sup)}</div><div class="ps">${sol > 0 ? (diff >= 0 ? '+' + diff.toFixed(1) + ' spare' : diff.toFixed(1) + ' short') : 'soldiers'}</div></div>`; }).join(''));
      setHtml($('war-flows'), lines.map(L => { const mx = Math.max(L.inc, L.dem, 1e-9) * 1.25, stall = sol > 0 && L.cov < 1;
        return `<div class="wf"><div class="row-between small"><span>${L.W.name} <span class="dim">· ${lname(L.W)} › ${R[L.W.good].name.toLowerCase()}</span></span><span class="tiny"><b class="${stall ? 'bad' : 'good'}">+${L.inc.toFixed(1)}</b> <span class="dim">/ uses ${L.dem.toFixed(1)}</span></span></div>
          <div class="wbar"><i class="w-${L.k}${stall ? ' stall' : ''}" style="width:${Math.min(100, 100 * L.inc / mx)}%"></i><b class="wdem" style="left:${Math.min(99, 100 * L.dem / mx)}%"></b></div></div>`; }).join('')); }
    { const L = lines.find(x => x.k === by), W = L && L.W, ln = W && CONFIG.kingdom.lines[W.line], last = ln && ln.steps[ln.steps.length - 1];
      setHtml($('war-tip'), !built ? 'Build the Barracks to start recruiting.' : !W ? '' : eff < 1 ? `<b>${W.name} is short by ${(L.dem - L.inc).toFixed(1)} / min.</b> Upgrade the ${lname(W)} line — start with its slowest building — to get back to 100% and recruit again.`
        : sol >= lim ? `<b>${W.name} sets your army size (${f(L.sup)}).</b> Grow the ${lname(W)} line (${last ? last.name : ''} first) to recruit more.` : `Soldiers are joining. <b>${W.name}</b> runs out first, at ${f(L.sup)} soldiers.`);
      $('war-tip').classList.toggle('stall', eff < 1); }
    setText($('army-split'), `${f(Game.marching())} march with the hero (hero damage ×${Game.armyMult().toFixed(2)}) · ${f(Game.garrisoned())} in garrisons`);
    setText($('barracks-lv'), built ? 'Lv ' + Game.barracksLv() : '');
    setText($('barracks-rate'), built ? `${Game.trainPerMin().toFixed(1)} soldiers join / min` : '');
    setHtml($('barracks-desc'), built ? `Soldiers join while the army has room. Each recruit needs <b>${Game.recruitCost().toFixed(1)} swords</b> to arm him, and every soldier needs Housing, Arms and Food each minute. A higher Barracks level means they join faster.` : `The Barracks recruits soldiers. Each recruit needs swords to arm him, and every soldier needs Housing, Arms and Food each minute.`);
    const B = S.kingdom.barracks || {}; $('train-bar').style.width = (built && sol < lim && eff >= 1 ? Math.min(100, 100 * (B.train || 0)) : built ? 100 : 0) + '%';
    setText($('train-txt'), !built ? '' : eff < 1 ? 'Paused — a line is short' : sol >= lim ? 'At full strength' : 'Recruiting…');
    const c = Game.barracksCost(); setText($('barracks-uplab'), built ? 'Upgrade the Barracks' : 'Build the Barracks'); setHtml($('barracks-cost'), costHtml(c)); $('barracks-up').disabled = !Game.canUpBarracks();
    { const loss = Game.lossPerMin(), c = Game.recruitCost(), spare = Game.spareArms(), sw = Math.floor(S.res.swords || 0), eta = Game.swordsLeftMin(), p = Game.battlePressure(), hold = Game.armyHold();
      const row = (l, v, cls, d) => `<div class="lrow"><span>${l}</span><span class="v ${cls}">${v}</span>${d ? `<span class="d">${d}</span>` : ''}</div>`;
      setHtml($('loss-rows'), row(`Fallen in battle <span class="dim">· ${p >= 0.5 ? 'brutal' : p >= 0.15 ? 'heavy' : p > 0.05 ? 'light' : 'no'} fighting</span>`, '−' + loss.toFixed(1), 'bad', `${(A.lossRate * p * 100).toFixed(1)}% of marching soldiers a minute here. Easy fights cost nothing; captains and rulers the most.`)
        + row(`Recruits <span class="dim">· Barracks can train ${Game.trainPerMin().toFixed(0)}</span>`, '+' + Game.recruitPerMin().toFixed(1), 'good', `Each recruit needs <b>${c.toFixed(1)} swords</b> to arm him.`)
        + row(`Spare swords <span class="dim">· Mine makes ${Game.warIncome('arms').toFixed(1)}, upkeep uses ${Game.warDemand('arms').toFixed(1)}</span>`, '+' + spare.toFixed(1), '', 'Only swords the army isn\'t already using can arm new recruits.')
        + row('Swords in store', sw < c ? 'empty' : f(sw) + (isFinite(eta) ? ` · lasts ${Math.max(1, Math.round(eta))} min` : ''), sw < c ? 'bad' : '', sw < c ? 'New recruits wait for spare swords from the Mine.' : '')
        + (p > 0.05 ? row('Your army holds here at', `${f(hold)} / ${f(lim)}`, hold < lim ? 'bad' : 'good', `Never below ${f(Game.armyFloor())} (half the limit).`) : '')); }
    setHtml($('need-row'), lines.map(L => `<span class="need${L.k === by ? ' lim' : ''}">${ico(R[L.W.good].icon, 16)} ${L.W.name} ${Game.perSoldier(L.k).toFixed(3)}</span>`).join(''));
    { const held = Game.landsHeld(), pct = Math.round(held * A.demandPerLand * 100), nx = Game.landDef(held + 1);
      setHtml($('demand-txt'), `${held} land${held === 1 ? '' : 's'} held: <b>+${pct}%</b>.${nx ? ` Conquering <b>${nx.name}</b> raises it to <b class="warn">+${pct + Math.round(A.demandPerLand * 100)}%</b> — every line will need a push.` : ''}`); }
    return !built && Game.canUpBarracks();
  }
  function renderFeeds() { // line tabs: what each line feeds, and whether it holds the army back
    const p3 = Game.phase() === 3 && Game.barracksBuilt(), A = CONFIG.kingdom.army, by = Game.armyLimitBy(), sol = Game.soldiers(), f = Game.fmt;
    { const ws = $('klsub-war'); if (ws) { ws.classList.toggle('hidden', !p3); if (p3) { setText(ws, `${f(sol)} / ${f(Game.armyLimit())}`); ws.className = 'kl-sub' + (Game.armyEff() < 1 ? ' bad' : ''); } } }
    for (const k of Game.WAR_KEYS) { const W = A.lines[k], ban = $('feed-' + W.line), sub = $('klsub-' + W.line); if (!ban) continue;
      ban.classList.toggle('hidden', !p3); if (sub) sub.classList.toggle('hidden', !p3); if (!p3) continue;
      const cov = Game.warCover(k), stall = sol > 0 && cov < 1, lim = k === by, sup = Game.lineSupports(k);
      ban.className = 'feed-banner' + (stall ? ' stall' : lim ? ' lim' : '');
      const key = [k, stall, lim, sup, Math.round(cov * 100)].join(); if (ban.__k !== key) { ban.__k = key;
        setHtml(ban, `${ico(R[W.good].icon, 28)}<div><b class="fh">${W.verb}</b><div class="small">${R[W.good].name} becomes <b>${W.name}</b> · ${f(Game.warIncome(k))} / min — ${stall ? `<b class="bad">short: the army fights at ${Math.round(cov * 100)}%</b>` : lim ? `<b class="bad">this sets your army size (${f(sup)})</b>` : `enough for ${f(sup)} soldiers`}</div></div>`); }
      if (sub) { const src = CONFIG.kingdom.lines[W.line].name.replace('Grain ', '').replace('Iron ', ''); setText(sub, sol > 0 ? `${src} ${Math.round(Math.min(cov, 9.99) * 100)}%` : `${src} · ${f(sup)}`); sub.className = 'kl-sub' + (stall || lim ? ' bad' : ''); } }
  }
  // ---- 0.9: lands, garrisons, taxes ----
  let landKey = '';
  let wonderKey = '';
  function renderWonders() { // 0.11: the Keep's Wonders
    const S = Game.S, f = Game.fmt, p3 = Game.phase() === 3; $('wonder-card').classList.toggle('hidden', !p3); if (!p3) return false;
    const best = S.legacy.eraBest || 0, show = []; for (let e = 1; e <= best; e++) show.push(e); show.push(best + 1);
    const k = show.join(','); if (wonderKey !== k) { wonderKey = k;
      $('wonder-list').innerHTML = show.map(e => `<div class="wonder-row" data-era="${e}"><div class="row-between"><b data-f="nm"></b><span class="small dim" data-f="tag"></span></div><div class="small" data-f="desc"></div><div data-f="cost" class="small"></div><div class="bar wbar-w"><div data-f="bar"></div></div><button class="buy" data-f="go">Contribute</button></div>`).join('');
      $('wonder-list').querySelectorAll('[data-era]').forEach(r => r.querySelector('[data-f=go]').onclick = () => { if (Game.contributeWonder(+r.dataset.era)) { flash(r); render(true); } }); }
    let built = 0, any = false;
    for (const e of show) { const r = $('wonder-list').querySelector(`[data-era="${e}"]`); if (!r) continue; const W = Game.wonderFor(e), un = Game.wonderUnlocked(e), done = Game.wonderBuilt(e), c = Game.wonderCost(e), st = Game.wonderState(e);
      if (done) built++;
      setText(r.querySelector('[data-f=nm]'), `${W.def.icon} ${W.name}`); setText(r.querySelector('[data-f=tag]'), done ? 'Built' : un ? `Era ${e}` : `Beat the Era Ruler of land ${e * CONFIG.eras.size}`);
      setText(r.querySelector('[data-f=desc]'), W.def.desc + (done ? ' — active.' : ''));
      setHtml(r.querySelector('[data-f=cost]'), done ? '' : Object.keys(c).map(k2 => { const have = st.paid[k2] || 0; return `<span class="costitem ${have >= c[k2] ? 'good' : ''}">${ico(R[k2].icon, 14)}${f(have)} / ${f(c[k2])}</span>`; }).join(' '));
      r.querySelector('[data-f=bar]').style.width = (done ? 100 : 100 * Game.wonderProgress(e)) + '%';
      const btn = r.querySelector('[data-f=go]'), can = un && !done && Object.keys(c).some(k2 => (st.paid[k2] || 0) < c[k2] && (S.res[k2] || 0) >= 1);
      btn.classList.toggle('hidden', done || !un); btn.disabled = !can; if (can) any = true;
      r.classList.toggle('locked', !un); r.classList.toggle('done', done); }
    setText($('wonder-n'), `${built} built`);
    document.querySelectorAll('[data-tithe]').forEach(b => b.classList.toggle('active', Math.abs(+b.dataset.tithe - Game.titheShare()) < 1e-9));
    return any;
  }
  function renderLands() {
    const S = Game.S, f = Game.fmt; if (Game.phase() !== 3) return false;
    const auto = true;
    setText($('tax-rate'), 'All lands · paid straight into your gold'); setHtml($('tax-total'), `${ico(R.gold.icon, 16)} +${f(Game.taxTotalPerHour())} / h`);
    const ns = Game.landsTouched().slice().reverse(); const k = ns.join(',') + '|' + Game.soldiers(); // newest land first
    if (landKey !== k) { landKey = k;
      $('land-list').innerHTML = ns.map(n => `<div class="land-row" data-land="${n}"><div class="lr-main"><div class="lr-name" data-f="nm"></div><div class="small dim" data-f="meta"></div></div><div class="lr-coffer"><b data-f="cof"></b><span class="small dim" data-f="rate"></span></div>
        <div class="lr-gar"><span data-f="gar"></span><span class="lr-btns"><button class="buy" data-g="-10">−10</button><button class="buy" data-g="10">+10</button><button class="buy" data-g="fill">Fill</button></span></div>
        <div class="lr-farm hidden" data-f="farm"><span data-f="farmtxt"></span><button class="buy" data-farm="1">Fight here</button></div></div>`).join('') || '<div class="dim small">Conquer your first land from the hero screen.</div>';
      $('land-list').querySelectorAll('[data-land]').forEach(row => { const n = +row.dataset.land; { const fb = row.querySelector('[data-farm]'); if (fb) fb.onclick = () => { if (Game.farmLand(n)) { landKey = ''; document.querySelector('[data-tab=hero]').click(); render(true); } }; }
        row.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { const L = Game.landState(n), v = b.dataset.g; Game.setGarrison(n, v === 'fill' ? Game.garrisonNeed(n) : (L.garrison || 0) + +v); landKey = ''; render(true); }); });
    }
    let any = false;
    for (const n of ns) { const row = $('land-list').querySelector(`[data-land="${n}"]`); if (!row) continue; const G = Game.landDef(n), L = Game.landState(n), pct = Game.landPct(n), done = Game.landDone(n), need = Game.garrisonNeed(n), g = L.garrison || 0;
      row.classList.toggle('full', done); row.classList.toggle('front', !done && pct > 0 || (!done && Game.landOpen(n)));
      setHtml(row.querySelector('[data-f=nm]'), `${n} · ${G.name}`);
      const here = Game.heroInLand(n);
      setHtml(row.querySelector('[data-f=meta]'), (done ? `100% conquered · 👑 ${G.ruler}` : pct > 0 ? `${pct}% conquered · ${G.ruler} waits at stage ${G.stages}` : `Not yet attacked · ${G.terrain}`) + (here && pct > 50 ? ` <span class="warn">· pays 50% while your hero is here — move on to collect it all</span>` : ''));
      setHtml(row.querySelector('[data-f=cof]'), pct > 0 ? `${ico(R.gold.icon, 14)} ${f(Game.taxPerHour(n))}` : '');
      setText(row.querySelector('[data-f=rate]'), pct > 0 ? `/ hour${Game.garrisonFill(n) < 1 ? ` (full garrison: ${f(Game.taxFull(n) * Game.landShare(n))})` : ''}` : `~${f(Game.taxFull(n))} / h when conquered`);
      setHtml(row.querySelector('[data-f=gar]'), pct > 0 ? `🛡 Garrison <b class="${g >= need ? 'good' : 'warn'}">${g} / ${need}</b> <span class="${g >= need ? 'good' : 'warn'}">· ${Math.round(100 * Math.min(1, g / need))}% taxes</span>` : '<span class="dim">Garrison once you hold part of it</span>');
      row.querySelectorAll('[data-g]').forEach(b => b.disabled = pct <= 0);
      { const fr = row.querySelector('[data-f=farm]'); fr.classList.toggle('hidden', !done); if (done) { const dp = Game.endlessDepth(n), best = (S.legacy.depthBest || {})[n] || 0, farmingHere = Game.farming() && Game.landN() === n, L2 = Game.landState(n);
        setHtml(row.querySelector('[data-f=farmtxt]'), `∞ Endless Battle · depth <b>${dp}</b>${best > dp ? ` <span class="dim">(best ${best})</span>` : ''} · drops ${ico(R[G.spoil].icon, 14)} ${R[G.spoil].name}${farmingHere ? ` <span class="good">· fighting here · ${L2.wins || 0}/50 to the next depth</span>` : ''}`);
        const fb = row.querySelector('[data-farm]'); fb.disabled = farmingHere; fb.textContent = farmingHere ? 'Here' : 'Fight here'; } }
      if (pct > 0 && g < need && Game.marching() > 0) any = true; }
    return any;
  }
  // ---- 0.9: the hero's halls ----
  let hallKey = '';
  function renderHalls() {
    const S = Game.S, f = Game.fmt; if (Game.kingdomNo() < 1) return false;
    const hs = CONFIG.kingdom.halls, k = hs.map(h => Game.hallAvailable(h.id)).join(',');
    if (hallKey !== k) { hallKey = k; $('hall-list').innerHTML = hs.map(h => `<div class="card kstep hall" data-hall="${h.id}"><div class="kstep-head">${ico(h.icon, 24)}<div><div class="kstep-name">${h.name} <span class="dim small" data-f="lv"></span></div><div class="tiny dim">${h.desc}</div></div><div class="kout"><b data-f="eff"></b></div></div><button class="buy wide" data-f="up"><span class="small" data-f="lab"></span><br><span class="cost" data-f="cost"></span></button></div>`).join('');
      $('hall-list').querySelectorAll('[data-hall]').forEach(c => c.querySelector('[data-f=up]').onclick = () => { if (Game.upgradeHall(c.dataset.hall)) { flash(c); render(true); } }); }
    let any = false;
    for (const h of hs) { const c = $('hall-list').querySelector(`[data-hall="${h.id}"]`); if (!c) continue; const lv = Game.hallLv(h.id), av = Game.hallAvailable(h.id);
      setText(c.querySelector('[data-f=lv]'), lv ? 'Lv ' + lv : '');
      setText(c.querySelector('[data-f=eff]'), lv ? (h.effect === 'gearCost' ? '−' + Math.round(100 * Math.min(0.6, h.per * lv)) + '%' : '+' + Math.round(100 * h.per * lv) + '%') : '');
      setText(c.querySelector('[data-f=lab]'), !av ? `Unlocks at ${CONFIG.kingdom.tiers[h.tier].name}` : lv ? 'Upgrade' : `Build the ${h.name}`);
      setHtml(c.querySelector('[data-f=cost]'), av ? costHtml(Game.hallCost(h.id)) : '');
      const ok = Game.canHall(h.id); c.querySelector('[data-f=up]').disabled = !ok; c.classList.toggle('locked-step', !av); if (ok && !lv) any = true; }
    return any;
  }
  function buildKeepLists() {}
  // In-game picker for staffing a step (replaces native dropdowns)
  function openPicker(stepId, as, lid) {
    const S = Game.S, K = S.kingdom, st = Game.stepDef(stepId), ss = Game.stepState(stepId), list = $('pick-list');
    setText($('pick-title'), as === 'worker' ? `Worker for the ${st.name}` : as === 'accountant' ? `Accountant for the ${st.name}` : `Overseer for the ${st.name}`);
    setText($('pick-sub'), as === 'accountant' ? `An Accountant sells ${R[st.make].name.toLowerCase()} the Storehouse does not need (above a quarter of its cap), at half the Market price.` : as === 'worker' ? 'Workers run the step. Each worker speeds up Work and Cart by their stats. Thralls level up as they work.' : 'An Overseer reports the bottleneck and speeds up one part of the bar by role: Foreman → Work, Packer → Cart, Carter → Haul.');
    const close = () => { $('pick-modal').classList.add('hidden'); lineKey[lid] = ''; render(true); };
    let h = '';
    if (as === 'accountant' && ss.accountant != null) h += `<button class="pick-row danger-btn" data-pick="remove"><div class="row-main"><b>Remove ${K.thralls[ss.accountant].name}</b></div></button>`;
    if (as === 'overseer' && ss.overseer !== null) h += `<button class="pick-row danger-btn" data-pick="remove"><div class="row-main"><b>Remove ${K.thralls[ss.overseer].name}</b><div class="small dim">Leave the Overseer slot empty</div></div></button>`;
    const cand = K.thralls.map((t, i) => ({ t, i, p: Game.thrallPost(i) })).filter(c => as === 'worker' ? !ss.workers.includes(c.i) : as === 'accountant' ? c.i !== ss.accountant : c.i !== ss.overseer)
      .sort((a, b) => (!!a.p - !!b.p) || (b.t.stars - a.t.stars));
    for (const c of cand) {
      const where = c.p ? `${c.p.as === 'overseer' ? 'Overseer' : c.p.as === 'accountant' ? 'Accountant' : 'Worker'} at the ${Game.stepDef(c.p.id).name}` : 'Idle';
      const lm = 1 + CONFIG.kingdom.thrallLvBonus * (Game.thrallLevel(c.t) - 1), sp = CONFIG.kingdom.statPct;
      const perk = `Lv ${Game.thrallLevel(c.t)} · ` + (as === 'worker' ? `Work +${Math.round(100 * sp * c.t.spd * lm)}% · Cart +${Math.round(100 * sp * c.t.str * lm)}%` : as === 'accountant' ? `sells at ${Math.round(100 * CONFIG.kingdom.accountantShare * (1 + 0.02 * (Game.thrallLevel(c.t) - 1)))}% of Market price` : `${ROLE[c.t.role]} ×${CONFIG.kingdom.starMult[c.t.stars]}`);
      h += `<button class="pick-row" data-pick="${c.i}"><div class="row-main"><b>${c.t.name}</b> <span class="stars">${stars(c.t.stars)}</span> <span class="owned">${roleShort(c.t.role)}</span><div class="small dim">${perk}</div></div><span class="tag ${c.p ? '' : 'idle'}">${c.p ? 'Move from ' + Game.stepDef(c.p.id).name : 'Idle'}</span></button>`;
    }
    if (!cand.length) h += `<div class="dim small center" style="padding:8px 0">${K.thralls.length ? 'Every thrall is already here.' : 'You have no thralls yet.'}</div><button class="pick-row" data-pick="tavern"><div class="row-main"><b>Go to the Tavern</b><div class="small dim">Market → Tavern: hire a thrall</div></div><span class="tag">▶</span></button>`;
    list.innerHTML = h;
    list.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => {
      const v = b.dataset.pick;
      if (v === 'tavern') { $('pick-modal').classList.add('hidden'); goTavern(); return; }
      if (v === 'remove') { if (as === 'accountant') ss.accountant = null; else ss.overseer = null; }
      else if (as === 'worker') Game.assignWorker(stepId, +v); else if (as === 'accountant') Game.assignAccountant(stepId, +v); else Game.assignOverseer(stepId, +v);
      close();
    });
    $('pick-modal').classList.remove('hidden');
  }
  function goTavern() {
    if (desktop) { const r = document.querySelector('[data-rtab=market]'); if (r) r.click(); } else document.querySelector('[data-tab=market]').click();
    document.querySelector('[data-msub=tavern]').click();
  }
  let keepHint = false;
  function renderKeep() {
    keepHint = false;
    const S = Game.S, f = Game.fmt, K = S.kingdom, inK = Game.kingdomNo() > 0;
    $('keep-kingdom').classList.toggle('hidden', !inK); if (!inK) return false;
    { // settlement
      const T = CONFIG.kingdom.tiers, t = Game.kTier(), td = T[t], nx = T[t + 1], need = Game.tierNeed(), paid = Game.tierPaid();
      setText($('settle-name'), Game.phase() === 3 ? 'Capital' : td.name); setText($('settle-tier'), `${t + 1} of ${T.length}${nx ? ' · next: ' + nx.name : ''}`);
      let lh = '';
      if (nx) {
        const th = Game.tierThreat();
        setText($('settle-need'), `To become a ${nx.name}: ${td.need}${th ? ` The hero must defeat the ${th.name}.` : ''} Then pay in ${td.cap} of every good you make — a little at a time; goods delivered in Orders count too. Nothing is lost.`);
        const stepsHere = Game.allSteps().filter(st => st.tier === t && !st.phase);
        lh += stepsHere.map(st => { const ok = Game.stepBuilt(st.id); return `<div class="row-between small"><span>${ok ? '✓' : '○'} ${st.name}</span><span class="${ok ? 'good' : 'dim'}">${ok ? 'built' : 'not built'}</span></div>`; }).join('');
        if (th) lh += `<div class="row-between small threat ${th.done ? '' : 'todo'}"><span>${th.done ? '✓' : '⚔'} Threat: <b>${th.name}</b></span><span class="${th.done ? 'good' : 'warn'}">${th.done ? 'defeated' : `Hero → ${th.where}, stage ${th.stage}`}</span></div>`;
        lh += Object.keys(need).map(k => { const g = Math.min(need[k], paid[k] || 0); return `<div class="bar kob"><div style="width:${100 * g / need[k]}%"></div><span>${R[k].name} ${f(g)} / ${f(need[k])}${g < need[k] ? ` · have ${f(Math.floor(S.res[k] || 0))}` : ' ✓'}</span></div>`; }).join('');
        const canPay = Object.keys(need).some(k => (paid[k] || 0) < need[k] && (S.res[k] || 0) >= 1);
        $('settle-pay').disabled = !canPay; $('settle-pay').classList.toggle('hidden', Game.tierPaidDone());
        const cr = Game.canRaise(); $('settle-raise').disabled = !cr; setText($('settle-raise'), `Raise to ${nx.name}`); $('settle-raise').classList.remove('hidden');
        if (cr) keepHint = true;
      } else {
        const p3 = Game.phase() === 3, need = CONFIG.kingdom.minLv;
        setText($('settle-need'), p3 ? 'Your City is the Capital. Keep upgrading: every part feeds the army and the conquest.' : `Build the Barracks and raise every part (Work, Cart, Haul) of every building to Lv ${need}, then proclaim the Kingdom.`);
        if (!p3) { const rowsL = Game.allSteps().filter(x => !x.phase).map(st => { const b = Game.stepBuilt(st.id), lv = b ? Game.stepLv(st.id) : 0, ok = lv >= need; return `<div class="row-between small"><span>${ok ? '✓' : '○'} ${st.name}</span><span class="${ok ? 'good' : 'dim'}">${b ? 'lowest part Lv ' + lv + ' / ' + need : 'not built'}</span></div>`; }); rowsL.push(`<div class="row-between small"><span>${Game.barracksBuilt() ? '✓' : '○'} Barracks</span><span class="${Game.barracksBuilt() ? 'good' : 'dim'}">${Game.barracksBuilt() ? 'built' : 'not built'}</span></div>`); lh += rowsL.join(''); }
        $('settle-pay').classList.add('hidden'); $('settle-raise').classList.add('hidden');
      }
      setHtml($('settle-list'), lh);
    }
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
      ${Object.keys(o.wants).some(k => (S.res[k] || 0) >= o.wants[k] && (S.res[k] || 0) - o.wants[k] < Game.orderReserve(k)) ? `<div class="tiny dim">Waiting: ${Object.keys(o.wants).filter(k => (S.res[k] || 0) - o.wants[k] < Game.orderReserve(k)).map(k => `${f(Game.orderReserve(k))} ${R[k].name.toLowerCase()}`).join(', ')} kept for building.</div>` : ''}
      <div class="row-between"><span class="small">Pays <b class="accent-inline">${f(o.gold)} gold · ${o.renown} Renown</b></span><span style="display:flex;gap:6px"><button class="buy kswap" data-swap="${i}" ${Game.swapReady() ? '' : 'disabled'} title="Swap for a different order (every 2 min)">⇄</button><button class="buy" data-deliver="${i}" ${can ? '' : 'disabled'}><span class="small">Deliver</span></button></span></div></div>`; }).join('');
    const ol = $('order-list'); if (ol.__h !== oh) { ol.innerHTML = oh || '<div class="dim small">No orders yet — produce something first.</div>'; ol.__h = oh; ol.querySelectorAll('[data-deliver]').forEach(b => b.onclick = () => { if (Game.deliver(+b.dataset.deliver)) { ol.__h = ''; render(true); } }); ol.querySelectorAll('[data-swap]').forEach(b => b.onclick = () => { if (Game.swapOrder(+b.dataset.swap)) { ol.__h = ''; render(true); } }); }
    // hiring
    setText($('offer-timer'), Game.fmtTime(Math.max(0, K.offerTimer || 0))); setText($('refresh-cost'), CONFIG.kingdom.refreshCost); $('offer-refresh').disabled = (S.res.gold || 0) < CONFIG.kingdom.refreshCost;
    const hh = (K.offers || []).map((o, i) => `<div class="row koffer"><div class="row-main"><div class="row-title">${o.name} <span class="stars">${stars(o.stars)}</span></div><div class="row-sub">${ROLE[o.role]} ×${CONFIG.kingdom.starMult[o.stars]}</div><div class="row-sub dim">Work +${Math.round(100 * CONFIG.kingdom.statPct * o.spd)}% · Cart +${Math.round(100 * CONFIG.kingdom.statPct * o.str)}%</div></div><button class="buy" data-hire="${i}" ${(S.res.gold || 0) >= o.price && K.thralls.length < Game.thrallCap() ? '' : 'disabled'}><span class="small">${K.thralls.length >= Game.thrallCap() ? 'Full' : 'Hire'}</span><br><span class="cost">${costHtml({ gold: o.price })}</span></button></div>`).join('');
    const hl = $('hire-list'); if (hl.__h !== hh) { hl.innerHTML = hh; hl.__h = hh; hl.querySelectorAll('[data-hire]').forEach(b => b.onclick = () => { if (Game.hire(+b.dataset.hire)) { hl.__h = ''; for (const l in lineKey) lineKey[l] = ''; render(true); } }); }
    // roster
    { const idle = K.thralls.filter((t, i) => !Game.thrallPost(i)).length, full = K.thralls.length >= Game.thrallCap();
      setText($('roster-count'), `${K.thralls.length} / ${Game.thrallCap()} · ${idle ? idle + ' idle' : 'all at work'}`);
      $('hire-full').classList.toggle('hidden', !full);
      if (full) setText($('hire-full'), `Your ${Game.tierDef().name} is full: ${K.thralls.length} / ${Game.thrallCap()} thralls.${idle ? ` ${idle} of them ${idle > 1 ? 'are' : 'is'} idle — put them to work first.` : ' Dismiss one below to hire someone better.'}`); }
    const rh = K.thralls.map((t, i) => { const p = Game.thrallPost(i); return `<div class="row"><div class="row-main"><div class="row-title">${t.name} <span class="stars">${stars(t.stars)}</span> <span class="owned">${roleShort(t.role)} · Lv ${Game.thrallLevel(t)}</span></div><div class="row-sub">${p ? (p.as === 'overseer' ? 'Overseer' : p.as === 'accountant' ? 'Accountant' : 'Worker') + ' at the ' + Game.stepDef(p.id).name : '<span class="warn">Idle — Kingdom → a line → + Add worker</span>'} · Str ${t.str} · Spd ${t.spd} · ${f(t.xp || 0)} loads hauled</div></div><button class="kx big-x" data-dis="${i}" aria-label="Dismiss">×</button></div>`; }).join('');
    const rl = $('roster'); if (rl.__h !== rh) { rl.innerHTML = rh || '<div class="dim small">Nobody yet. Hire someone above.</div>'; rl.__h = rh; rl.querySelectorAll('[data-dis]').forEach(b => b.onclick = () => { const t = K.thralls[+b.dataset.dis]; ask('Dismiss ' + t.name + '?', `${t.name} (Lv ${Game.thrallLevel(t)}) leaves for good. This frees a place for someone new.`, 'Dismiss', () => { Game.dismiss(+b.dataset.dis); rl.__h = ''; for (const l in lineKey) lineKey[l] = ''; render(true); }); }); }
    // storehouse
    setText($('store-lv'), K.storeLv || 0); setText($('store-cap'), f(Game.storeCap('wood')));
    const goods = Game.allSteps().filter(st => Game.stepUnlocked(st.id) && R[st.make].kind !== 'war').map(st => st.make);
    setHtml($('store-list'), goods.map(k => `<div class="row-between small"><span>${ico(R[k].icon, 14)} ${R[k].name}</span><span class="${Game.atCap(k) ? 'warn' : ''}">${f(S.res[k] || 0)} / ${f(Game.resCap(k))}</span></div>`).join(''));
    setHtml($('store-auto'), `Surplus that won't fit is sold to passing merchants at ¼ price${K.autoSold ? ` · <b>${f(K.autoSold)}</b> gold so far` : ''}. Gold holds up to ${f(Game.resCap('gold'))}.`);
    const sc = Game.storeUpCost(); setHtml($('store-cost'), costHtml(sc)); $('store-up').disabled = !Game.canAfford(sc);
    const canHire = (K.offers || []).some(o => (S.res.gold || 0) >= o.price) && K.thralls.length < Math.min(2, Game.thrallCap());
    $('badge-tavern').classList.toggle('hidden', !canHire);
    return anyOrder || keepHint;
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


  // ---- Skills: Techniques (active) · Paths (passive) · Gathering ----
  let skView = 'paths', pathSel = null; const pathEls = {}, techEls = {};
  function setSkillView(v) { skView = v; document.querySelectorAll('#skill-seg [data-sk]').forEach(b => b.classList.toggle('active', b.dataset.sk === v)); for (const k of ['tech', 'paths', 'gather']) $('sk-' + k).classList.toggle('hidden', k !== v); try { glowKey = ''; } catch (e) {} if (typeof render === 'function') try { render(true); } catch (e) {} }
  const MOD_LABEL = { attackPct: 'attack', speedPct: 'attack speed', crit: 'crit chance', critDmg: 'crit damage', bossDmg: 'damage to bosses', hpPct: 'max HP', regenPct: 'HP regen', dr: 'damage taken', restSpeed: 'resting speed', goldPct: 'gold', dropPct: 'loot', skillPct: 'technique power', armyPct: 'army bonus', xpPct: 'XP', cdr: 'cooldowns' };
  const LESS_IS_GOOD = { dr: 1, cdr: 1 };
  function fmtMod(k, v) { const a = Math.abs(v) * 100, n = a >= 10 ? Math.round(a * 10) / 10 : a >= 1 ? Math.round(a * 100) / 100 : Math.round(a * 1000) / 1000, good = v >= 0; const sign = LESS_IS_GOOD[k] ? (good ? '−' : '+') : (good ? '+' : '−'); return `${sign}${n}% ${MOD_LABEL[k] || k}`; }
  function fmtMods(m) { return Object.entries(m).filter(([, v]) => v).map(([k, v]) => fmtMod(k, v)).join(' · '); }
  const PCOL = { M: [20, 61, 102], G: [143, 184, 225], C: [266, 307, 348] }, PY = t => 50 + t * 72, ROOT = { x: 184, y: 16 }, NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  function buildPaths() {
    const svg = $('path-web'); svg.innerHTML = ''; const nodes = Game.pathNodes(), col = {}; for (const b of CONFIG.paths.branches) col[b.id] = b.color;
    setHtml($('path-heads'), CONFIG.paths.branches.map(b => `<div><b style="color:${b.color}">${b.name}</b><span>${b.desc}</span></div>`).join(''));
    const defs = svgEl('defs', {}, svg); const rg = svgEl('radialGradient', { id: 'pglow' }, defs); svgEl('stop', { offset: '0', 'stop-color': '#e8c06a', 'stop-opacity': '.55' }, rg); svgEl('stop', { offset: '1', 'stop-color': '#e8c06a', 'stop-opacity': '0' }, rg);
    const edgeG = svgEl('g', {}, svg), nodeG = svgEl('g', {}, svg);
    const pos = n => ({ x: PCOL[n.b][n.c], y: PY(n.t) });
    for (const n of nodes) { pathEls[n.id] = { n, edges: [] }; const p = pos(n);
      const froms = n.parents.length ? n.parents.map(id => ({ id, ...pos(Game.pathNode(id)) })) : [{ id: null, ...ROOT }];
      for (const f of froms) pathEls[n.id].edges.push({ from: f.id, line: svgEl('line', { x1: f.x, y1: f.y, x2: p.x, y2: p.y, 'stroke-width': 2 }, edgeG) }); }
    svgEl('circle', { cx: ROOT.x, cy: ROOT.y, r: 12, fill: '#1f1810', stroke: '#e8c06a', 'stroke-width': 2 }, nodeG); const rt = svgEl('text', { x: ROOT.x, y: ROOT.y + 4, 'text-anchor': 'middle', 'font-size': 11, fill: '#e8c06a' }, nodeG); rt.textContent = '⚔';
    for (const n of nodes) {
      const p = pos(n), R = n.kind === 'small' ? 11 : 14, g = svgEl('g', { class: 'pnode', tabindex: 0, role: 'button' }, nodeG), E = pathEls[n.id];
      E.glow = svgEl('circle', { cx: p.x, cy: p.y, r: R + 9, fill: 'url(#pglow)' }, g);
      E.arc = svgEl('circle', { cx: p.x, cy: p.y, r: R + 3.5, fill: 'none', stroke: col[n.b], 'stroke-width': 2.5, transform: `rotate(-90 ${p.x} ${p.y})` }, g); E.circ = 2 * Math.PI * (R + 3.5);
      E.shape = n.kind === 'key' ? svgEl('rect', { x: p.x - R + 1, y: p.y - R + 1, width: 2 * R - 2, height: 2 * R - 2, rx: 3, transform: `rotate(45 ${p.x} ${p.y})` }, g) : svgEl('circle', { cx: p.x, cy: p.y, r: R }, g);
      E.txt = svgEl('text', { x: p.x, y: p.y + 3.5, 'text-anchor': 'middle', 'font-size': n.kind === 'small' ? 10 : 11, 'font-weight': 700 }, g);
      E.sel = svgEl('circle', { cx: p.x, cy: p.y, r: R + 7, fill: 'none', stroke: '#e8c06a', 'stroke-width': 1.5, 'stroke-dasharray': '3 3' }, g);
      if (n.kind !== 'small') { const lb = svgEl('text', { x: p.x, y: p.y + R + (n.kind === 'key' ? 16 : 14), 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 600, fill: '#ede4d3', stroke: '#120e0b', 'stroke-width': 3, 'paint-order': 'stroke' }, g); lb.textContent = n.name; }
      svgEl('circle', { cx: p.x, cy: p.y, r: 20, fill: 'transparent' }, g);
      const pick = () => { pathSel = n.id; render(true); }; g.addEventListener('click', pick); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      E.g = g;
    }
    const pop = $('path-pop'); pop.innerHTML = `<div class="row-between"><b class="pp-name" data-f="name"></b><span class="pp-tag" data-f="tag"></span></div>
      <div class="small" data-f="now"></div><div class="small dim" data-f="each"></div>
      <div class="bar pp-bar"><div data-f="bar"></div><span data-f="rank"></span></div>
      <div class="small dim" data-f="cost"></div>
      <div class="pp-btns"><button class="buy" data-f="one">+1 rank</button><button class="buy maxbtn" data-f="max">+10 ranks</button></div>`;
    pop.querySelector('[data-f=one]').addEventListener('click', () => { if (pathSel && Game.rankPath(pathSel, 1)) { flash(pop); render(true); } });
    pop.querySelector('[data-f=max]').addEventListener('click', () => { if (pathSel && Game.rankPath(pathSel, 999)) { flash(pop); render(true); } });
  }
  function renderPaths() {
    const S = Game.S, f = Game.fmt, nodes = Game.pathNodes(), RK = CONFIG.paths.ranks, col = {}; for (const b of CONFIG.paths.branches) col[b.id] = b.color;
    const pr = Game.discProgress('combat'), cr = Game.crowns(), PD = CONFIG.paths.perkDesc;
    setText($('path-lv'), `Combat Lv ${pr.level}`); setText($('path-free'), `+${Math.round(Game.combatLevelBonus() * 100)}%`); setText($('path-free-lab'), 'attack & HP from Combat levels');
    setText($('path-spent'), f(Game.pathPointsSpent())); setText($('path-spent-of'), 'ranks bought');
    setText($('path-stars'), `${f(cr)} 👑`); $('path-xpbar').style.width = (100 * pr.have / pr.need) + '%'; setText($('path-xptext'), `${f(pr.have)} / ${f(pr.need)} XP to Combat Lv ${pr.level + 1}`);
    let anyCan = false; if (!pathSel || !Game.pathNode(pathSel)) pathSel = nodes[0].id;
    const nodeDesc = n => n.perk ? PD[n.perk] : fmtMods(Object.fromEntries(Object.entries(n.per).filter(([k]) => !k.endsWith('X')))) + Object.entries(n.per).filter(([k]) => k.endsWith('X')).map(([k, v]) => ` ${k === 'attackX' ? 'attack' : k === 'hpX' ? 'HP' : 'army boost'} ×${v}`).join('');
    for (const n of nodes) {
      const E = pathEls[n.id]; if (!E) continue; const r = Game.pathRank(n.id), open = Game.pathOpen(n.id), can = Game.canRankPath(n.id), maxed = Game.pathMaxed(n.id); if (can && r === 0) anyCan = true;
      const full = n.kind === 'endless' ? r > 0 : maxed;
      E.shape.setAttribute('fill', full ? col[n.b] : r > 0 ? '#2a1f16' : '#15110e');
      E.shape.setAttribute('stroke', can ? '#e8c06a' : open ? '#8a6a33' : '#4a3a2a'); E.shape.setAttribute('stroke-width', n.kind === 'small' ? 2 : 3);
      E.arc.setAttribute('stroke-dasharray', `${E.circ * (n.max ? Math.min(1, r / n.max) : 0)} ${E.circ}`); E.arc.style.display = r > 0 && !full ? '' : 'none';
      E.txt.textContent = n.kind === 'endless' ? (r ? r : '∞') : r > 0 ? `${r}/${n.max}` : n.kind === 'small' ? '' : '★'; E.txt.setAttribute('fill', full ? '#120e0b' : r > 0 ? col[n.b] : open ? '#e8c06a' : '#5d5245');
      E.glow.style.display = can && r === 0 ? '' : 'none'; E.sel.style.display = pathSel === n.id ? '' : 'none'; E.g.classList.toggle('locked', !open);
      for (const ed of E.edges) { const on = r > 0; ed.line.setAttribute('stroke', on ? '#c9973f' : '#3a2e24'); ed.line.setAttribute('stroke-width', on ? 3 : 2); }
    }
    const n = Game.pathNode(pathSel), pop = $('path-pop'), r = Game.pathRank(n.id), open = Game.pathOpen(n.id), br = CONFIG.paths.branches.find(b => b.id === n.b), maxed = Game.pathMaxed(n.id);
    setText(pop.querySelector('[data-f=name]'), n.name); pop.querySelector('[data-f=name]').style.color = br.color;
    setText(pop.querySelector('[data-f=tag]'), `${n.kind === 'key' ? 'Keystone' : n.kind === 'notable' ? 'Notable' : n.kind === 'endless' ? 'Endless' : 'Node'} · ${br.name}`);
    setText(pop.querySelector('[data-f=now]'), r ? `Rank ${r}${n.max ? ' / ' + n.max : ''}` : 'Not taken yet'); setText(pop.querySelector('[data-f=each]'), 'Each rank: ' + nodeDesc(n));
    pop.querySelector('[data-f=bar]').style.width = (n.max ? 100 * Math.min(1, r / n.max) : (r ? 100 : 0)) + '%'; setText(pop.querySelector('[data-f=rank]'), n.max ? `Rank ${r} / ${n.max}` : `Rank ${r}`);
    const c = Game.pathCost(n.id), par = n.parents.map(id => Game.pathNode(id).name);
    setHtml(pop.querySelector('[data-f=cost]'), maxed ? 'Maxed.' : !open ? `🔒 Opens once ${par.join(' or ')} has a rank.` : `Next rank: <b class="${cr >= c ? 'good' : 'warn'}">${f(c)} 👑</b> · you have ${f(cr)}${n.kind === 'endless' ? ' · each rank costs 15% more' : ''}`);
    const can = Game.canRankPath(n.id); pop.querySelector('[data-f=one]').disabled = !can; pop.querySelector('[data-f=max]').disabled = !can; pop.querySelector('[data-f=max]').textContent = 'Buy max';
    { const m = Game.pathMods(), t = fmtMods(m); setText($('path-sum'), t || 'Nothing yet — beat a boss for a Crown and spend it on Sharpened Edge.'); }
    $('path-reset').classList.add('hidden');
    $('dot-sk-paths').classList.toggle('hidden', !anyCan); return anyCan;
  }
  function techDesc(id) { const d = Game.skillDef(id), p = Game.skillPower(id), dur = Game.skillDur(id); return d.desc.replace('{p%}', Math.round(p * 100) + '%').replace('{p}', p.toFixed(1)).replace('{d}', dur.toFixed(dur % 1 ? 1 : 0)) + ` · every ${Game.skillCdBase(id).toFixed(1)}s`; }
  function buildTechs() {
    const box = $('tech-cards'); box.innerHTML = '';
    for (const d of CONFIG.skills) {
      const c = el('div', 'tcard'); c.innerHTML = `<div class="tc-top"><span class="tc-ic">${ico(d.icon, 26)}</span><div class="tc-main"><div class="tc-row"><b>${d.name}</b><span class="tc-tag" data-f="tag"></span></div><div class="small dim" data-f="desc"></div></div><b class="tc-lv" data-f="lv"></b></div>
        <div data-f="unl" class="small tc-unl"></div>
        <div data-f="body"><div class="row-between small dim tc-mrow"><span>Mastery — levels by using it</span><span data-f="mx"></span></div><div class="bar tc-bar"><div data-f="mbar"></div></div>
        <div class="tc-mods" data-f="mods"></div>
        <div class="tc-act"><button class="buy" data-f="eq">Equip</button></div></div>`;
      c.querySelector('[data-f=eq]').addEventListener('click', () => { const on = Game.S.hero.loadout.includes(d.id); if (on ? Game.unequipTech(d.id) : Game.equipTech(d.id)) { flash(c); render(true); } });
      const mods = c.querySelector('[data-f=mods]'), chips = [];
      d.mods.forEach((tier, t) => { const row = el('div', 'tc-tier'); row.appendChild(el('span', 'tc-tlv', `Lv ${[5, 10][t]}`)); tier.forEach(m => { const b = el('button', 'mod', `<b>${m.name}</b> <span>${m.desc}</span>`); b.addEventListener('click', () => { if (Game.chooseMod(d.id, t, m.id)) { flash(b); render(true); } }); row.appendChild(b); chips.push({ b, t, m }); }); mods.appendChild(row); });
      techEls[d.id] = { card: c, chips }; box.appendChild(c);
    }
    const lo = $('loadout'); lo.innerHTML = ''; techEls._slots = [];
    for (let i = 0; i < CONFIG.techSlots.length; i++) { const s = el('div', 'lslot', `<span class="ls-ic"></span><span class="ls-n"></span><span class="ls-l small dim"></span><i class="ls-cd"></i>`); lo.appendChild(s); techEls._slots.push(s); }
  }
  function renderTechs() {
    const S = Game.S, h = S.hero, f = Game.fmt, slots = Game.techSlots(); let any = false;
    const stored = CONFIG.skills.some(d => Game.techUnlocked(d.id) && !h.loadout.includes(d.id));
    for (const d of CONFIG.skills) {
      const E = techEls[d.id], c = E.card, un = Game.techUnlocked(d.id), eq = h.loadout.includes(d.id), mp = Game.techMastery(d.id), pend = Game.modPending(d.id);
      c.classList.toggle('locked', !un); c.classList.toggle('eq', eq); if (pend) any = true;
      setText(c.querySelector('[data-f=tag]'), !un ? 'locked' : eq ? 'equipped' : 'stored'); c.querySelector('[data-f=tag]').className = 'tc-tag' + (eq ? ' on' : '');
      setText(c.querySelector('[data-f=desc]'), techDesc(d.id)); setText(c.querySelector('[data-f=lv]'), un ? `Lv ${mp.level}` : '—');
      setText(c.querySelector('[data-f=unl]'), un ? '' : 'Unlock: ' + Game.techUnlockLabel(d)); c.querySelector('[data-f=body]').classList.toggle('hidden', !un);
      if (!un) continue;
      c.querySelector('[data-f=mbar]').style.width = (100 * mp.have / mp.need) + '%'; setText(c.querySelector('[data-f=mx]'), `${f(mp.have)} / ${f(mp.need)}`);
      const st = (h.techs || {})[d.id] || {};
      for (const ch of E.chips) { const reached = mp.level >= [5, 10][ch.t], picked = (st.mods || [])[ch.t] === ch.m.id, none = !(st.mods || [])[ch.t]; ch.b.disabled = !reached; ch.b.classList.toggle('pick', reached && picked); ch.b.classList.toggle('choose', reached && none); }
      const b = c.querySelector('[data-f=eq]'); setText(b, eq ? 'Unequip' : h.loadout.length >= slots ? 'Slots full' : 'Equip'); b.disabled = !eq && h.loadout.length >= slots;
    }
    let nextShown = false;
    techEls._slots.forEach((s, i) => {
      const id = h.loadout[i], cdE = s.querySelector('.ls-cd');
      if (i < slots && id) { const d = Game.skillDef(id), cd = Math.max(0, (h.cds || {})[id] || 0); s.className = 'lslot on'; if (s.dataset.id !== id) { setHtml(s.querySelector('.ls-ic'), ico(d.icon, 24)); s.dataset.id = id; } setText(s.querySelector('.ls-n'), d.name); setText(s.querySelector('.ls-l'), `Lv ${Game.techLevelOf(id)}`); cdE.style.setProperty('--p', (cd > 0 ? 100 * cd / Game.skillCd(id) : 0) + '%'); }
      else if (i < slots) { s.className = 'lslot empty'; s.dataset.id = ''; setHtml(s.querySelector('.ls-ic'), ''); setText(s.querySelector('.ls-n'), 'empty'); setText(s.querySelector('.ls-l'), ''); cdE.style.setProperty('--p', '0%'); if (stored) any = true; }
      else if (!nextShown) { nextShown = true; const req = CONFIG.techSlots[i]; s.className = 'lslot lock'; s.dataset.id = ''; setHtml(s.querySelector('.ls-ic'), '🔒'); setText(s.querySelector('.ls-n'), `Slot ${i + 1}`); setText(s.querySelector('.ls-l'), req.combat ? `Combat Lv ${req.combat}` : 'Conquer a land'); cdE.style.setProperty('--p', '0%'); }
      else s.className = 'lslot hidden';
    });
    setText($('slot-note'), `${h.loadout.length} of ${slots} slots used. Swap any time — mastery is kept.`);
    $('dot-sk-tech').classList.toggle('hidden', !any); return any;
  }

  // ---- Skill trees (gathering) ----
  let curDisc = 'wood'; rows.disc = {}; rows.node = {}; let treeKey = '';
  function buildDiscBar() {
    const bar = $('disc-bar'); bar.innerHTML = ''; rows.disc = {};
    for (const d in CONFIG.disciplines) {
      if (d === 'combat') continue;
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
        d.innerHTML = `${ico(n.icon, 24)}<div class="n-name">${n.name}</div><div class="n-rank" data-f="rank"></div><div class="n-desc">${n.desc}</div><div class="n-bar"><div data-f="bar"></div></div><div class="n-act" data-f="btn">+1</div>`;
        d.title = n.parent ? `Opens when ${(nodes.find(x => x.id === n.parent) || {}).name} is maxed` : '';
        d.setAttribute('role', 'button'); d.tabIndex = 0; const tap = () => { if (Game.rankNode(curDisc, n.id)) { flash(d); render(true); } }; d.addEventListener('click', tap); d.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(); } });
        rows.node[n.id] = d; row.appendChild(d);
      }
      box.appendChild(row);
    });
    glowKey = '';
  }
  function renderTrees() {
    const S = Game.S, f = Game.fmt; let any = false;
    for (const d in CONFIG.disciplines) { const b = rows.disc[d]; if (!b) continue; const pr = Game.discProgress(d), fr = Game.treePointsFree(d); setText(b.querySelector('[data-f=lvl]'), `Lv${pr.level}`); b.querySelector('[data-f=dot]').classList.toggle('hidden', fr <= 0); if (fr > 0) any = true; }
    const tfree = Game.talentPointsFree(); let capOpen = false; for (const d in CONFIG.trees) for (const n of CONFIG.trees[d]) if (n.capstone && Game.canRankNode(d, n.id)) capOpen = true; if (capOpen) any = true;
    const D = CONFIG.disciplines[curDisc], pr = Game.discProgress(curDisc);
    setText($('disc-name'), `${D.name} Lv${pr.level}`); setText($('disc-desc'), D.desc); setText($('disc-how'), `You get 1 every time ${D.name} levels up. XP comes from every swing of the tool.`);
    setText($('disc-pts'), Game.treePointsFree(curDisc)); setText($('talent-free'), tfree);
    $('disc-xpbar').style.width = (100 * pr.have / pr.need) + '%'; setText($('disc-xptext'), `${f(pr.have)} / ${f(pr.need)} XP`);
    for (const n of CONFIG.trees[curDisc] || []) {
      const d = rows.node[n.id]; if (!d) continue; const r = Game.nodeRank(curDisc, n.id), max = Game.nodeMax(n), open = Game.nodeOpen(curDisc, n.id), can = Game.canRankNode(curDisc, n.id);
      d.classList.toggle('locked', !open); d.classList.toggle('maxed', r >= max); d.classList.toggle('can', can);
      setText(d.querySelector('[data-f=rank]'), Game.nodeQuestLocked(curDisc, n.id) ? '🔒 Quest' : n.capstone ? (r ? 'Learned' : '1 ★') : `${r} / ${max}`);
      d.querySelector('[data-f=bar]').style.width = (100 * r / max) + '%';
      const b = d.querySelector('[data-f=btn]'); setText(b, r >= max ? '✓ Maxed' : !open ? '' : n.capstone ? (can ? '★ Learn' : 'needs a ★') : (can ? '+1' : 'no points'));
      const link = $('tree').querySelector(`[data-link="${n.id}"]`); if (link) link.classList.toggle('on', open);
    }
    $('dot-sk-gather').classList.toggle('hidden', !any);
    const pa = renderPaths(), te = renderTechs(); any = any || pa || te;
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
    const bKey = S.hero.ground + ':' + S.hero.bestStage + ':' + Object.keys(S.hero.bossesKilled).length + ':' + Object.values(S.hero.grounds).map(g => g.bestStage).join('/') + ':' + Math.floor(S.hero.totalKills / 10);
    if (bKey !== renderBestiary.key) { renderBestiary.key = bKey; renderBestiary(); }
    for (const k of keys) setText(rows.inv[k].querySelector('[data-f=n]'), f(Math.floor(S.res[k] || 0)));
    if (invItem) { setText($('item-have'), f(Math.floor(S.res[invItem] || 0))); const have = Math.floor(S.res[invItem] || 0); $('item-s1').disabled = have < 1; $('item-s10').disabled = have < 10; $('item-sall').disabled = have < 1; }
  }
  // Where does an item come from / what uses it — scanned from config so it stays true as the game changes.
  function sourceHint(k) { // 0.10.5: one short line of where a good comes from, shown next to requirements
    const L = Object.values(CONFIG.grounds).find(G => G.land && G.spoil === k); if (L) return `from ${L.name} (land ${L.land})`;
    const s = itemSources(k)[0]; return s ? s.replace(/^(By hand|Activity|City): /, 'from ').replace(/ \(.*\)$/, '') : 'see where it comes from';
  }
  function itemSources(k) {
    const out = [];
    for (const hb of CONFIG.hand) if (hb.gives === k) out.push(`By hand: ${hb.name}`);
    for (const a in CONFIG.activities) { const A = CONFIG.activities[a]; if (A.outputs && A.outputs[k]) out.push(`Activity: ${A.name}`); }
    const KC = CONFIG.kingdom, QM = (KC.war && KC.war.quartermaster) || {};
    for (const lid in KC.lines) for (const st of KC.lines[lid].steps) if (st.make === k) out.push(`City: ${st.name} (${KC.lines[lid].name})`);
    { const from = Object.keys(QM).filter(g => QM[g] === k); if (from.length) out.push(`Quartermaster: turns ${from.map(g => R[g].name).join(', ')} into ${R[k].name}`); }
    if (k === 'soldiers') out.push('Barracks: recruits them while Housing, Arms and Food income has room');
    { const ls = Object.values(CONFIG.grounds).filter(G => G.land && G.spoil === k).slice(0, 3); if (ls.length) out.push(`Lands: ${ls.map(G => `${G.name} (land ${G.land})`).join(', ')}… — enemies there drop it, and a garrisoned land sends it every hour`); }
    for (const gid in CONFIG.grounds) { const G = CONFIG.grounds[gid], names = []; if (G.land) continue; for (const T of G.line) { if (T.pool.some(p => p.k === k)) names.push(T.plural); if (T.unique === k) names.push(T.boss + ' (first kill)'); } if (names.length) out.push(`${G.name}: ${names.join(', ')}`); }
    if (k === 'gold') out.push('Market: selling anything', 'Bandits on the Roads, the dead in the Crypts');
    const gate = CONFIG.techs.find(t => t.unlocks.drop === k); if (gate) out.push(`Needs the ${gate.name} tech`);
    return out;
  }
  function itemUses(k) {
    const out = [];
    for (const t of CONFIG.techs) if (t.cost[k]) out.push(`Tech: ${t.name}`);
    CONFIG.tiers.forEach((t, i) => { const names = new Set(); if (t.craftCost[k] || t.upgradeCost[k]) names.add(t.name); if (t.perSlot) for (const sl in t.perSlot) { const ps = t.perSlot[sl]; if ((ps.craftCost && ps.craftCost[k]) || (ps.upgradeCost && ps.upgradeCost[k])) names.add(ps.name + ' ' + CONFIG.slots[sl].name.toLowerCase()); } if (names.size) out.push(`Gear: ${[...names].join(', ')}`); });
    for (const t of CONFIG.toolTiers) if (t.craftCost[k] || t.upgradeCost[k]) out.push(`Tools: ${t.name}`);
    const KC = CONFIG.kingdom, QM = (KC.war && KC.war.quartermaster) || {};
    for (const lid in KC.lines) for (const st of KC.lines[lid].steps) { if (st.build && st.build[k]) out.push(`Build: ${st.name}`); if (st.from === k) out.push(`${st.name} turns it into ${R[st.make].name}`); }
    for (const h of KC.halls || []) if (h.build && h.build[k]) out.push(`Build: ${h.name}`);
    if (KC.army && KC.army.build && KC.army.build[k]) out.push('Build: Barracks');
    if (KC.army && KC.army.cost && KC.army.cost[k]) out.push('Barracks: training soldiers (and feeding them)');
    if (QM[k]) out.push(`Quartermaster: turned into ${R[QM[k]].name} for the army`);
    if (Object.values(KC.lines).some(L => L.steps.some(st => st.make === k))) out.push('Raising your settlement to its next tier');
    if (k === 'gold') out.push('Upgrading buildings, halls, gear and tools; the Market');
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
    const S = Game.S, box = $('bestiary'), has = true; let html = '';
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
  const WAR_CHIPS = ['gold', 'people', 'soldiers']; // Phase 3 header: gold, the army — and the three war incomes (built below)
  let lastRender = 0;
  // 0.12: story pop-ups, once per phase
  let storyOpen = null, guidePending = false;
  function showGuide() { guidePending = false; showInfo('Camp', 'Your kingdom begins.', '<p class="small">The wild is behind you. From here on your town works while you are away.</p><p class="small"><b>Kingdom → Production</b> — your buildings. Each works in three steps (the Farm Plants, Grows and Harvests); upgrade the slowest one — its bar turns gold and goods pile up in front of it. Tap <b>Enter</b> to look inside.</p><p class="small"><b>Keep</b> — fill Imperial Orders for gold and Renown, and grow your settlement: <b>Camp → Hamlet → Village → City</b>. Each step up costs goods, never your progress.</p><p class="small">Your hero keeps fighting — the bosses he beats open each new step.</p>' + (Game.S.settings.guest && window.Cloud && Cloud.available && !Cloud.user ? '<p class="small"><b>Your kingdom lives on this device.</b> Settings (⚙) → Sign in with Google to back it up and play anywhere.</p>' : ''), 'demoSeen'); }
  function checkStory() {
    if (storyOpen || !$('welcome').classList.contains('hidden')) return; const S = Game.S, st = S.settings.story = S.settings.story || {}, q = Game.questCurrent();
    const due = !st.beta && Game.hadAlpha && S.hero.totalKills === 0 ? 'beta' : !st.wild && S.hero.totalKills === 0 && q && q.id === 'f01' ? 'wild' : !st.charter && S.legacy.foundings > 0 ? 'charter' : !st.capital && Game.phase() === 3 ? 'capital' : !st.fallow && q && q.id === 'w05b' ? 'fallow' : null;
    if (!due) return; const T = CONFIG.story[due]; storyOpen = due;
    setText($('story-kicker'), T.kicker || 'From the Chronicle'); setText($('story-title'), T.title); setText($('story-text'), T.text); setText($('story-go'), T.go); $('story').classList.remove('hidden');
  }
  function render(force) {
    const now = performance.now(); if (!force && now - lastRender < 100) return; lastRender = now;
    const S = Game.S, f = Game.fmt, h = S.hero, st = Game.stats();

    const kr = Game.kingdomRates(true), hr = Game.heroFighting() ? Game.heroRates() : {}, hrv = Game.harvestRates();
    for (const k in R) {
      const e = $('res-' + k), wi = WAR_CHIPS.indexOf(k), p3 = Game.phase() === 3;
      const open = p3 ? wi >= 0 : (R[k].kind !== 'loot' && R[k].kind !== 'war' && S.lifetime[k] > 0 && Game.pinned(k)) || (k === 'people' && Game.houses() > 0) || (k === 'soldiers' && Game.barracksBuilt());
      e.style.order = p3 ? String(wi) : ''; e.classList.toggle('war-chip', p3 && wi >= 0);
      e.classList.toggle('hidden', !open); if (!open) continue;
      e.querySelector('.rrate').classList.toggle('hidden', !Game.infoOn('almanac'));
      { const war = k === 'soldiers' || k === 'people', cap = k === 'people' ? Game.houseCap() - Game.soldiers() : Game.resCap(k), full = k === 'people' ? Game.houseRoom() < 1 : k !== 'soldiers' && (S.res[k] || 0) >= cap - 1e-9; setHtml(e.querySelector('[data-f=amt]'), `${f(Math.floor((S.res[k] || 0) + 1e-6))}${k === 'soldiers' ? '' : `<span class="capn">/${f(cap)}</span>`}`); e.classList.toggle('full', full && !war); }
      let rate = (kr[k] || 0) + (hr[k] || 0) + (hrv[k] || 0);
      if (k === 'gold') rate += (Game.phase() === 3 ? Game.taxTotalPerHour() / 3600 : 0) + Game.headTaxPerHour() / 3600; else if (k === 'soldiers') rate = (Game.recruitPerMin() - Game.lossPerMin()) / 60; else if (k === 'people') rate = Game.birthRoom() > 0 ? Game.birthsPerMin() / 60 : 0; // taxes, births and recruits count too
      const re = e.querySelector('[data-f=rate]'); if (k === 'soldiers' || k === 'people') { const pm = rate * 60; setText(re, (pm > 0 ? '+' : '') + (Math.abs(pm) < 10 ? pm.toFixed(1) : f(pm)) + '/m'); } else setText(re, (rate > 0 ? '+' + f(rate) : '0') + '/s'); re.classList.toggle('zero', !(rate > 0));
    }
    { const p3 = Game.phase() === 3 && Game.barracksBuilt(); Game.WAR_KEYS.forEach((wk, i) => { const e = $('inc-' + wk); e.classList.toggle('hidden', !p3); if (!p3) return; e.style.order = String(1 + i);
        const inc = Game.warIncome(wk), dem = Game.warDemand(wk), cov = Game.warCover(wk), stall = cov < 1 && Game.soldiers() > 0;
        setText(e.querySelector('[data-f=in]'), '+' + f(inc)); setText(e.querySelector('[data-f=out]'), '−' + f(dem)); e.classList.toggle('stall', stall);
        e.querySelector('[data-f=m]').style.width = Math.min(100, dem > 0 ? 100 * dem / Math.max(inc, 1e-9) : 0) + '%'; }); }
    if (desktop) { const hh = document.querySelector('.sticky-head').offsetHeight + 'px'; if (document.documentElement.style.getPropertyValue('--headh') !== hh) document.documentElement.style.setProperty('--headh', hh); }

    // Fight
    const eMax = Game.enemyMaxHp();
    setText($('stage'), Game.stageLabel()); setText($('best-stage'), Game.stageLabel(h.bestStage));
    setText($('age-tag'), Game.phase() === 3 ? `· ${Game.ageName()}` : '');
    for (const id in CONFIG.grounds) { const b = rows.ground[id], G = CONFIG.grounds[id], un = Game.groundUnlocked(id), gs = id === h.ground ? { stage: h.stage } : (h.grounds[id] || { stage: 1 });
      if (G.land) { const show = Game.phase() === 3 && G.land <= Game.landsHeld() + 2; b.classList.toggle('hidden', !show); if (!show) continue; b.classList.toggle('land-done', Game.landDone(G.land)); }
      b.classList.toggle('active', id === h.ground); b.disabled = !un; b.classList.toggle('locked', !un);
      setText(b.querySelector('[data-f=st]'), G.land ? (Game.landDone(G.land) ? '👑 100%' : un ? `${Game.landPct(G.land)}% · stage ${gs.stage}` : Game.landReqText(G.land)) : un ? Game.stageLabel(gs.stage, id) : G.reqText); }
    { const p3 = Game.phase() === 3, LN = Game.landN(), G = Game.ground();
      $('army-line').classList.toggle('hidden', !p3 || !Game.heroFighting()); if (!p3) { $('army-flow').classList.add('hidden'); $('strain-card').classList.add('hidden'); }
      if (p3) { const st2 = Game.stats(), rec = LN ? Game.recArmy(LN) : 0, mar = Game.marching();
        setHtml($('army-line'), `${ico(R.soldiers.icon, 18)} <b>${f(mar)}</b>&nbsp;soldiers march with you${rec ? ` <span class="dim">(recommended ${f(rec)})</span>` : ''} · hits <b>${f(st2.attack)}</b>&nbsp;<span class="dim">(${f(st2.gearAttack)} × army ×${st2.army.toFixed(2)}${st2.lap > 1 ? ' × victory lap ×' + st2.lap : ''})</span>`); $('army-line').classList.toggle('stall', rec > 0 && mar < rec * 0.5);
        { const loss = Game.lossPerMin(), rec2 = Game.recruitPerMin(), bl = Game.trainBlocker(), fshow = Game.heroFighting() && (loss > 0.05 || (bl && bl !== 'barracks')); $('army-flow').classList.toggle('hidden', !fshow);
          if (fshow) setHtml($('army-flow'), `<div class="fchip loss"><b>−${loss.toFixed(1)} / min</b>fallen in battle</div><div class="fchip rec"><b>+${rec2.toFixed(1)} / min</b>${bl ? { people: 'no free people', houses: 'no houses', swords: 'short of arms', bread: 'short of bread' }[bl] || 'trained' : 'trained'}</div><div class="fchip stock"><b>${f(Game.people())}</b>people ready</div>`);
          $('strain-card').classList.add('hidden'); }
        { const sn = S.kingdom.settleNote, show = !!sn && !sn.seen && h.time - sn.t < 1800; $('demand-note').classList.toggle('hidden', !show);
          if (show) { setHtml($('demand-note'), `<b class="dh">${sn.name} conquered 👑</b><br>${f(sn.moved)} settlers moved to your Capital${sn.turned ? ` — <b class="bad">${f(sn.turned)} found no home</b> and turned back. Build houses (People chain) so the next wave stays.` : '.'} Every land you hold keeps sending more.<button class="retreat-x" aria-label="Dismiss" data-dn>×</button>`); const x = $('demand-note').querySelector('[data-dn]'); if (x) x.onclick = () => { sn.seen = true; }; } } }
      $('conquest-box').classList.toggle('hidden', !LN);
      if (LN) { const pct = Game.landPct(LN); setText($('cq-name'), `Conquest of ${G.name}`); setText($('cq-pct'), pct + '%'); $('cq-bar').style.width = pct + '%'; setText($('cq-text'), Game.isEndless() ? `∞ Endless Battle · 👑 ${G.crown}` : Game.landDone(LN) ? `Conquered · 👑 ${G.crown}` : `Stage ${h.stage} / ${G.stages}`);
        const ck = LN + '|' + G.stages; if ($('cq-ticks').__k !== ck) { $('cq-ticks').__k = ck; setHtml($('cq-ticks'), `<span>Captains every 10 stages</span><span>👑 ${G.ruler} · stage ${G.stages}</span>`); } }
      }
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
    setText($('enemy-name'), Game.enemyName()); renderArt();
    const eHp = h.enemyHp > 0 ? h.enemyHp : eMax;
    $('enemy-hpbar').style.width = (100 * eHp / eMax) + '%';
    setText($('enemy-hptext'), `${f(eHp)} / ${f(eMax)}`);
    setText($('enemy-dps'), f(Game.effectiveEnemyDps(st)));
    const need = Game.killsNeeded(), kt = killsLine(), at = autoLine();
    $('kills-bar').style.width = kt.pct + '%'; setText($('kills-text'), kt.text);
    $('auto-bar').style.width = at.pct + '%'; setText($('auto-text'), at.text); $('auto-barbox').className = 'bar autoadv ' + at.cls;
    $('auto-why').classList.toggle('hidden', !at.why); if (at.why) setText($('auto-why'), at.why);
    $('auto-adv').checked = S.settings.autoAdvance !== false;
    { const rn = h.retreatNote, show = !!rn && !rn.seen && h.time - rn.t < 600; $('retreat-note').classList.toggle('hidden', !show);
      if (show) setText($('retreat-text'), rn.boss ? `The ${rn.foe} was too strong — your hero had to retreat to stage ${rn.to}. Upgrade your gear or raise his healing, then face it again.` : `${rn.away ? 'While you were away, your' : 'Your'} hero had to retreat to stage ${rn.to} — stage ${rn.from} hits harder than he can heal. Upgrade your armor or weapon (Gear), or raise his healing, to push deeper.`); }
    $('advance-btn').disabled = !Game.canAdvance();
    setText($('advance-btn'), Game.isBoss() ? `Hunt ${Game.nextTypeName()} ▶` : Game.isBoss(h.stage + 1) ? `Face the ${Game.enemyName(h.stage + 1)} ▶` : 'Advance ▶');
    $('retreat-btn').disabled = h.stage <= 1;
    const dNext = Game.stageDanger(h.stage + 1), dHere = Game.stageDanger();
    setText($('danger'), !Game.infoOn('danger') ? (dHere >= 1 ? '⚠ You cannot survive here.' : '') : dHere >= 1 ? '⚠ You cannot survive here. Retreat or gear up.'
      : Game.canAdvance() ? (dNext >= 1 ? '⚠ Next stage would kill you. Gear up first.' : dNext > 0.6 ? 'Next stage looks dangerous.' : 'Next stage looks fine.')
      : dHere > 0 ? `He loses ground here — about ${Math.round(dHere * 100)}% HP per fight after healing.` : 'He heals faster than he is hurt here.');
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
    $('stat-grid').parentElement.classList.toggle('hidden', !Game.infoOn('chronicler'));
    if (Game.infoOn('chronicler')) setHtml($('stat-grid'), [
      ['Attack', f(st.attack)], ['DPS', f(st.dps)], ['Atk speed', st.speed.toFixed(2) + '/s'],
      ['Crit', Game.pct(st.crit) + ' ×' + st.critDmg.toFixed(1)], ['Max HP', f(st.maxHp)], ['Regen', f(st.regen) + '/s'],
      ['Armor', f(st.armor) + (st.dr ? ' −' + Game.pct(st.dr) : '')], ['Drops', '×' + st.drop.toFixed(2)], ['Kills/s', Game.farmRate().toFixed(2)],
    ].map(([k, v]) => `<div><span class="dim">${k}</span><b>${v}</b></div>`).join(''));
    const showLog = S.settings.showLog !== false; $('log-card').classList.toggle('hidden', !showLog); if ($('set-log').checked !== showLog) $('set-log').checked = showLog;
    if (showLog) setHtml($('log'), S.log.slice(0, 8).map(l => `<div>${l}</div>`).join(''));
    checkStory();
    for (const ev of Game.drainEvents()) hitPop(ev);
    { const bg = Game.drainBig(); if (bg.length) celebrate(bg); }
    const eff = Game.afkEfficiency(), afkHr = Object.entries(hr).filter(([, v]) => v > 0), afkKr = Object.entries(kr).filter(([, v]) => v > 0);
    setHtml($('afk-info'), !Game.infoOn('ledger') ? '' : `AFK mode: ${Game.pct(eff)} of this rate while closed (max ${Game.fmtTime(Game.afkCap())})` + (afkHr.length ? ` → ${afkHr.map(([k, v]) => `${ico(R[k].icon, 14)}${f(v * eff * 3600)}/h`).join(' ')}` : ' → XP only here') + (afkKr.length ? `, kingdom ${afkKr.map(([k, v]) => `${ico(R[k].icon, 14)}${f(v * eff * 3600)}/h`).join(' ')}` : ''));

    // Gear
    let anyGear = false;
    for (const slot in CONFIG.slots) {
      const row = rows.gear[slot], def = CONFIG.slots[slot], it = h.gear[slot];
      setHtml(row.querySelector('[data-f=ico]'), ico(gearIcon('gear', slot, it), 32, 'rowico'));
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
        setText(row.querySelector('[data-f=next]'), it.level < CONFIG.tierUpAt ? 'Next: ' + Object.entries(nxt).map(([k, v]) => fs(k, v)).join(' · ') : `Lv${it.level} — forge the next tier to go higher`);
        up.classList.remove('hidden');
        if (!forgeState(up, 'gearUp', slot, 'Upgrade')) { const uc = Game.gearUpgradeCost(slot); up.classList.toggle('hidden', !uc); setHtml(up.querySelector('[data-f=upcost]'), costHtml(uc)); up.disabled = !uc || !Game.canAfford(uc) || !!Game.crafting(); if (!up.disabled) anyGear = true; }
        { const mx = row.querySelector('[data-f=max]'), plan = Game.maxUpgradePlan('gear', slot); mx.classList.toggle('hidden', !it || !plan || plan.levels < 2); setText(mx.querySelector('[data-f=maxn]'), plan ? `+${plan.levels} → Lv${it.level + plan.levels}` : '—'); mx.disabled = !plan || plan.levels < 2 || !!Game.crafting(); }
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
    { const anyP = renderProd(); $('badge-prod').classList.toggle('hidden', !anyP); setText($('klsub-prod'), Game.barracksBuilt() ? `${Game.fmt(Game.soldiers())} ⚔` : Game.houses() ? `${Game.fmt(Game.people())} 👥` : ''); } $('badge-lands').classList.toggle('hidden', !renderLands()); renderWonders(); $('badge-halls').classList.toggle('hidden', !renderHalls());
    const keepAct = renderKeep();
    renderThrone();

    // Tech
    let anyTech = false;
    const CNAME = { kills: 'Enemies slain', bossKills: 'Bosses slain', stage: 'Best stage', foundings: 'Foundings' };
    for (const t of CONFIG.techs) {
      const row = rows.tech[t.id], done = Game.hasTech(t.id), pr = Game.techProgress(t);
      row.classList.toggle('done', done); row.classList.toggle('gated', !done && !pr.ok); row.classList.toggle('hidden', done && techHideKnown());
      setHtml(row.querySelector('[data-f=req]'), done ? '' : pr.parts.map(p => `<div class="req-line"><span>${CNAME[p.k] || (R[p.k] ? R[p.k].name + ' gathered' : p.k)}${!CNAME[p.k] && R[p.k] && p.have < p.need ? `<small class="req-src" data-item="${p.k}"> · ${sourceHint(p.k)} ⓘ</small>` : ''}</span><span>${f(Math.min(p.have, p.need))} / ${f(p.need)}</span></div><div class="bar"><div style="width:${Math.min(100, 100 * p.have / p.need)}%"></div></div>`).join(''));
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
      if (q.dyn) setText($('quest-n'), `Deeds of the Dynasty · ${q.dyn}`); else { const chain = q.chain || (CONFIG.quests.slice(0, S.quests.index).reverse().find(x => x.chain) || {}).chain || ''; const inChain = CONFIG.quests.filter((x, i) => (x.chain || (CONFIG.quests.slice(0, i).reverse().find(y => y.chain) || {}).chain) === chain); setText($('quest-n'), `${chain} · ${inChain.indexOf(q) + 1} / ${inChain.length}`); }
      setText($('quest-name'), q.name); setText($('quest-text'), q.text); setText($('quest-hint'), q.hint || ''); $('quest-hint').classList.toggle('hidden', !q.hint);
      setHtml($('quest-obj'), pr.parts.map(partHtml).join(''));
      setHtml($('quest-reward'), 'Reward: ' + Object.entries(q.reward).map(([k, v]) => k === 'crystal' ? `<span class="costitem">👑 ${v} Crown${v === 1 ? '' : 's'}</span>` : k === 'talent' ? `<span class="costitem">👑 ${v} Crown${v === 1 ? '' : 's'}</span>` : `<span class="costitem">${ico(R[k].icon, 14)}${f(v)}</span>`).join(' '));
      $('quest-claim').classList.remove('hidden'); $('quest-claim').disabled = !pr.done; $('quest-card').classList.toggle('ready', pr.done);
    } else if (goal) {
      setText($('quest-n'), ''); setText($('quest-name'), goal.name); setText($('quest-text'), goal.text); setText($('quest-hint'), goal.hint); $('quest-hint').classList.remove('hidden');
      setHtml($('quest-obj'), goal.parts.map(partHtml).join('')); setHtml($('quest-reward'), ''); $('quest-claim').classList.add('hidden'); $('quest-card').classList.remove('ready');
    }
    applyQuestGlow(q || goal);

    { const col = handCollapsed(); $('hand-card').classList.toggle('collapsed', col); $('hand-toggle').setAttribute('aria-expanded', String(!col)); }
    { const p3 = Game.phase() === 3; $('hand-card').classList.toggle('hidden', p3 || Game.kTier() >= 3); $('activity-card').classList.toggle('hidden', p3); } // 0.10.6: by hand ends at the City, gathering at the Kingdom
    // By hand
    for (const hd of CONFIG.hand) { const b = rows.hand[hd.id], ok = Game.handUnlocked(hd.id); b.disabled = !ok; b.classList.toggle('locked', !ok); setText(b.querySelector('[data-f=sub]'), ok ? `+1 ${R[hd.gives].name}` : (hd.unlock.tech ? 'needs ' + Game.techDef(hd.unlock.tech).name : hd.unlock.gear ? 'needs clothing' : 'locked')); }
    // Activity
    const act = h.activity;
    for (const id in CONFIG.activities) {
      const b = rows.act[id], a = CONFIG.activities[id], ok = Game.activityAvailable(id);
      b.classList.toggle('active', act === id); b.disabled = !ok; if (id === 'idle') b.classList.toggle('hidden', !!S.hero.fightOn);
      setText(b.querySelector('[data-f=sub]'), id === 'idle' ? 'heals' : id === 'fight' ? (ok ? (Object.entries(hr).filter(([, v]) => v > 0).slice(0, 2).map(([k, v]) => `${f(v)} ${R[k].name}/s`).join(', ') || 'XP & loot') : 'needs a weapon') : ok ? Object.entries(Game.harvestRates(id)).map(([k, v]) => `${f(v)} ${R[k].name}/s`).join(', ') : `needs ${CONFIG.toolSlots[a.tool].name.toLowerCase()}`);
    }
    setText($('activity-hint'), act === 'fight' || act === 'idle' ? CONFIG.activities[act].desc + (Object.keys(Game.harvestRates()).length ? ' Your tools keep gathering in the background.' : '') : `Your ${CONFIG.toolSlots[CONFIG.activities[act].tool].name.toLowerCase()} works on its own — while you fight, and while you're away. Every level of it makes it much faster.`);
    const fighting = act === 'fight', idle = act === 'idle';
    $('fight-card').classList.toggle('hidden', !fighting); $('harvest-card').classList.toggle('hidden', fighting || idle);
    $('ground-card').classList.toggle('hidden', !S.hero.gear.weapon);
    if (!fighting && !idle) {
      const a = CONFIG.activities[act], t = Game.harvestTime(act), y = Game.harvestYield(act), tool = h.tools[a.tool];
      setText($('harvest-title'), a.name);
      setHtml($('harvest-icon'), ico(a.icon, 48));
      setHtml($('harvest-yield'), 'Each swing: ' + Object.entries(y).map(([k, v]) => `<span class="costitem">${ico(R[k].icon, 16)}${f(v)}</span>`).join(' '));
      $('harvest-bar').style.width = Math.min(100, 100 * ((h.gTimers || {})[act] || 0) / t) + '%';
      setText($('harvest-time'), Game.infoOn('surveyor') ? t.toFixed(1) + 's per swing' : '');
      $('harvest-yield').classList.toggle('hidden', !Game.infoOn('surveyor'));
      setText($('harvest-tool'), `${CONFIG.toolTiers[tool.tier].name} ${CONFIG.toolSlots[a.tool].name} Lv${tool.level} · gathering ${Math.round(Game.bgFactor(act) * 100)}% speed · in store: ${Object.keys(y).map(k => `${R[k].name} ${f(Math.floor(S.res[k] || 0))} / ${f(Game.resCap(k))}`).join(', ')}`);
      setText($('harvest-mastery'), `Mastery ${Game.masteryLevel(act)} (${h.mastery[act] || 0} swings)`);
      { const outs = Object.keys(y), full = outs.filter(k => Game.atCap(k)), open = outs.filter(k => !Game.atCap(k));
        $('harvest-full').classList.toggle('hidden', !full.length);
        if (full.length) setText($('harvest-full'), `${full.map(k => R[k].name).join(' and ')} ${full.length > 1 ? 'are' : 'is'} full (${f(Game.resCap(full[0]))}) — ${open.length ? 'only ' + open.map(k => R[k].name).join(' and ') + ' ' + (open.length > 1 ? 'are' : 'is') + ' being gathered' : 'nothing more can be gathered'}. Spend it on gear or sell it at the Market to make room.`); }
      const hrv = Game.harvestRates(act);
      setHtml($('harvest-afk'), !Game.infoOn('ledger') ? '' : `AFK: ${Game.pct(Game.afkEff())} of this while closed (max ${Game.fmtTime(Game.afkCap())}) → ` + Object.entries(hrv).map(([k, v]) => `<span class="costitem">${ico(R[k].icon, 14)}${f(v * Game.afkEff() * 3600)}/h</span>`).join(' '));
    }
    renderMini(Game.heroFighting(), idle && !Game.heroFighting(), act, st, eMax);
    // Tools
    for (const slot in CONFIG.toolSlots) {
      const row = rows.tool[slot], def = CONFIG.toolSlots[slot], it = h.tools[slot];
      setHtml(row.querySelector('[data-f=ico]'), ico(gearIcon('tool', slot, it), 32, it ? 'rowico' : 'rowico ghost'));
      const up = row.querySelector('[data-f=up]'), forge = row.querySelector('[data-f=forge]');
      if (!it) { setHtml(row.querySelector('[data-f=title]'), `${def.name} <span class="owned">none</span>`); setText(row.querySelector('[data-f=stats]'), def.activity ? `Needed to ${CONFIG.activities[def.activity].name.toLowerCase()}.` : `Needed to take ${R[def.boosts].name} in the Wilds. Better tool, better chance.`); up.classList.add('hidden'); row.querySelector('[data-f=max]').classList.add('hidden'); }
      else {
        setHtml(row.querySelector('[data-f=title]'), `${CONFIG.toolTiers[it.tier].name} ${def.name} <span class="owned">Lv${it.level}</span>`);
        setText(row.querySelector('[data-f=stats]'), def.activity ? `Power ×${Game.toolPower(slot).toFixed(2)} → ${CONFIG.activities[def.activity].name}: ${Object.entries(Game.harvestRates(def.activity)).map(([k, v]) => `${f(v)} ${R[k].name}/s`).join(', ')}` : `Power ×${Game.toolPower(slot).toFixed(2)} → ${R[def.boosts].name} chance ×${Game.dropToolMult(slot).toFixed(2)}`);
        up.classList.remove('hidden'); if (!forgeState(up, 'toolUp', slot, 'Upgrade')) { const uc = Game.toolUpgradeCost(slot); up.classList.toggle('hidden', !uc); setHtml(up.querySelector('[data-f=upcost]'), costHtml(uc)); up.disabled = !uc || !Game.canAfford(uc) || !!Game.crafting(); }
        { const mx = row.querySelector('[data-f=max]'), plan = Game.maxUpgradePlan('tool', slot); mx.classList.toggle('hidden', !plan || plan.levels < 2); setText(mx.querySelector('[data-f=maxn]'), plan ? `+${plan.levels} → Lv${it.level + plan.levels}` : '—'); mx.disabled = !plan || plan.levels < 2 || !!Game.crafting(); }
      }
      const fc = Game.toolCraftCost(slot), can = Game.canToolTierUp(slot), nt = it ? it.tier + 1 : 0;
      if (!fc) forge.classList.add('hidden');
      else if (forgeState(forge, 'tool', slot, 'Make')) { forge.classList.remove('hidden'); }
      else { forge.classList.remove('hidden'); setText(row.querySelector('[data-f=forgelbl]'), it ? `Make ${CONFIG.toolTiers[nt].name}` : 'Make'); setHtml(forge.querySelector('[data-f=forgecost]'), can ? costHtml(fc) : (Game.toolTierUnlocked(nt) && Game.toolSlotUnlocked(slot)) ? `<span class="dim">needs Lv${CONFIG.tierUpAt}</span>` : `<span class="dim">needs tech</span>`); forge.disabled = !can || !Game.canAfford(fc) || !!Game.crafting(); }
    }
    renderDoll(); renderStats();
  }

  const fmPick = { hero: null, kingdom: null };
  function openFound() {
    if (Game.phase() === 3) { if (!Game.canPassCrown()) return; const g = Game.crownsIfPass(), S = Game.S;
      if (S.kingdom.ageDone) { ask('Crown your heir?', `The Emperor has fallen. Your heir begins the ${Game.ageName(Game.ageNo() + 1)} with ${g} new Crown${g === 1 ? '' : 's'}: the same ten lands, far richer and far tougher. Lands, taxes, the army and your stores start over and the hero starts at level 1; his gear, Paths, Techniques, the Capital, Wonders and every Crown stay. Lands you know fall ${3 + Game.perkRank('lap')}× faster.`, 'Crown your heir', () => { if (Game.crownHeir()) { rebuild(); render(true); } }); return; }
      ask('Pass the Crown early?', `Your heir takes the throne with ${g} new Crown${g === 1 ? '' : 's'} and starts the ${Game.ageName()} again from land 1. Lands, taxes, the army and your stores start over and the hero starts at level 1; his gear, Paths, Techniques, the Capital, Wonders and Crowns stay. Lands you know fall ${3 + Game.perkRank('lap')}× faster. (Beat the Emperor at land ${CONFIG.ages.lands} to move on to the next Age instead.)`, 'Pass the Crown', () => { if (Game.passCrown()) { rebuild(); render(true); } }); return; }
    if (Game.S.legacy.foundings > 0) { if (!Game.canProclaim()) return;
      ask('Proclaim the Kingdom', `Your City becomes the Capital. Nothing is lost. You gain ${CONFIG.legacy.proclaimCrowns} Crowns, the Barracks opens, and the header becomes your war chest.`, 'Proclaim', () => { if (Game.proclaim()) { rebuild(); flash($('found-btn')); } }); return; }
    if (!Game.canFound()) return;
    const L = Game.S.legacy;
    fmPick.hero = L.heroPath || 'warrior'; fmPick.kingdom = L.kingdomPath || 'benevolent';
    { const g = Game.knowledgeGain(); setText($('fm-gain'), `${g} Crown${g === 1 ? '' : 's'}`); }
    { const first = Game.S.legacy.foundings === 0; setText($('fm-title'), first ? 'Found Your Kingdom' : 'Conquer New Lands'); setText($('fm-confirm'), first ? 'Found' : 'Ride out'); }
    setText($('fm-worker'), Game.S.legacy.foundings === 0 ? 'your first Camp' : 'a new Camp in new lands');
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
    setText($('knowledge'), L.knowledge); setText($('knowledge2'), L.knowledge); setText($('foundings'), L.dynasty || 1); setText($('throne-best'), S.hero.bestStage);
    setText($('found-gain'), '+' + Game.knowledgeGain());
    const cost = Game.foundCost(); setHtml($('found-cost'), Object.keys(cost).length ? costHtml(cost) : '<span class="dim">free — Renown is the price</span>');
    const first = S.legacy.foundings === 0, p3 = Game.phase() === 3;
    const aDone = p3 && S.kingdom.ageDone; setText($('found-title'), first ? 'Pay Tribute to the Empire' : aDone ? `Crown Your Heir — the ${Game.ageName(Game.ageNo() + 1)}` : p3 ? `${Game.ageName()} · Pass the Crown` : 'Proclaim the Kingdom');
    setText($('found-text'), first ? 'Pay tribute and the Empire grants you land: your first kingdom, where you raise a Camp and grow it into a City. Your hero keeps everything.' : p3 ? (aDone ? `The Emperor has fallen. Crown your heir to begin the ${Game.ageName(Game.ageNo() + 1)}: the same ten lands, far richer and far tougher. Everything permanent stays.` : `Each Age is ${CONFIG.ages.lands} lands; beat the Emperor at land ${CONFIG.ages.lands} to crown your heir into the next Age. Stuck before then? Pass the Crown early: the heir starts this Age again, lands you know fall faster, and the Crowns from its rulers are yours to spend.`) : 'Once your City is complete, proclaim the Kingdom. Nothing is lost: your City becomes the Capital, and the war for new lands begins.');
    $('found-btn').textContent = first ? 'Pay Tribute' : aDone ? `👑 Crown your heir (+${Game.crownsIfPass()} 👑)` : p3 ? `Pass the Crown early (+${Game.crownsIfPass()} 👑)` : 'Proclaim the Kingdom'; $('found-btn').classList.toggle('quest-glow', !!aDone);
    if (first) { const reqStage = CONFIG.legacy.foundRequiresStage, okStage = Game.bestStageAll() >= reqStage; setText($('found-req'), okStage ? (Game.canAfford(cost) ? 'Ready.' : 'Gather the tribute: 100 gold and the Rat King\'s Tooth.') : `Reach stage ${reqStage} to pay tribute (best: ${Game.bestStageAll()}).`); }
    else { setText($('found-req'), p3 ? (Game.canPassCrown() ? `Crowns this dynasty: ${Game.crownsIfPass()} · lands held: ${Game.landsHeld()}` : (Game.landsHeld() < 1 ? 'Conquer your first land to pass the crown.' : 'The quests will show you when to pass the crown.')) : Game.canProclaim() ? 'Ready. The City is complete.' : `Complete your City first (now: ${Game.tierDef().name}).`); }
    const can = first ? Game.canFound() : p3 ? Game.canPassCrown() : Game.canProclaim();
    setText($('found-gain-lab'), first ? 'Crowns on founding:' : 'Crowns when proclaimed:'); $('found-gain-row').classList.toggle('hidden', p3); $('found-cost-row').classList.toggle('hidden', !first);
    $('found-btn').disabled = !can;
    $('badge-throne').classList.toggle('hidden', !can || p3);
    let anyPerk = false;
    for (const p of CONFIG.legacy.perks) {
      const row = rows.perk[p.id], r = Game.perkRank(p.id), maxed = r >= p.max, c = Game.perkCost(p);
      setText(row.querySelector('[data-f=rank]'), r);
      setHtml(row.querySelector('[data-f=cost]'), maxed ? 'Max' : `${c} 👑`);
      const btn = row.querySelector('[data-f=btn]'); btn.disabled = maxed || L.knowledge < c; if (!btn.disabled) anyPerk = true;
    }
    $('badge-legacy').classList.toggle('hidden', !anyPerk);
    setHtml($('history'), L.history.length ? L.history.slice().reverse().map(h => h.dynasty ? `<div>Dynasty ${h.dynasty}: ${h.lands} land${h.lands === 1 ? '' : 's'} conquered, hero Lv ${h.heroLevel} → +${h.crowns} 👑</div>` : `<div>Kingdom ${h.level}: stage ${h.bestStage}, hero Lv${h.heroLevel} → +${h.knowledge} 👑</div>`).join('') : '<div class="dim">No dynasties yet.</div>');
    { const V = L.vault || {}, ks = Object.keys(V).sort((a, b) => a - b); setText($('vault-n'), `${ks.length} crown${ks.length === 1 ? '' : 's'}`); setHtml($('vault-list'), ks.length ? ks.map(n => `<span class="vault-crown" title="Land ${n}">👑 ${V[n]}</span>`).join('') : '<span class="dim small">Empty — defeat a land\'s ruler.</span>'); }
  }
  // ---- Mini hero strip: mirrors the fight/harvest screen when that screen is off-tab ----
  const lootTally = {}; let lootFresh = {};
  // "visible" = the full card's bars are actually inside the viewport, not just on the current tab
  function heroScreenVisible() {
    const c = $('fight-card').offsetParent ? $('fight-card') : (!Game.heroFighting() && $('harvest-card').offsetParent) ? $('harvest-card') : null; if (!c) return false; // 0.10.12: on a gathering screen the fight shows in the dock
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
      const kt = killsLine(), at = autoLine(), ready = Game.canAdvance(); $('mini-action-bar').style.width = (ready ? at.pct : kt.pct) + '%'; setText($('mini-action-text'), ready ? at.text : kt.text);
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
  // 0.10.5: the big moments get a banner (tap to dismiss); small ones a short one
  const CBQ = []; let cbBusy = false, cbTimer = null;
  function celebrate(evs) {
    const lv = evs.filter(e => e.who === 'levelup').pop();
    if (lv) { const a = $('mini-hero') && $('mini-hero').offsetParent ? $('mini-hero') : document.querySelector('.top'); if (a) { const r = a.getBoundingClientRect(); const p = el('div', 'pop lvl', `▲ Level ${lv.lv}`); p.style.left = (r.left + r.width / 2) + 'px'; p.style.top = (r.top + 10) + 'px'; document.body.appendChild(p); setTimeout(() => p.remove(), 900); } }
    const ms = evs.filter(e => e.who === 'milestone');
    if (ms.length === 1) CBQ.push({ small: 1, ico: '⚒', kicker: 'Output doubled', title: `${ms[0].name} · Lv ${ms[0].lv}`, sub: 'Every 10, 25, 50 and 100 levels it doubles.' });
    else if (ms.length > 1) CBQ.push({ small: 1, ico: '⚒', kicker: 'Output doubled', title: `${ms.length} buildings doubled`, sub: ms.map(m => m.name).slice(0, 3).join(' · ') });
    for (const e of evs) {
      if (e.who === 'crown') { const G = Game.landDef(e.n); CBQ.push({ ico: '👑', kicker: 'Land conquered', title: G ? G.name : 'Conquered', sub: `You take ${G ? G.crown : 'a crown'} · +${e.v} Crown${e.v === 1 ? '' : 's'} when the crown passes${e.first ? ' · new in the Vault' : ''}` }); }
      else if (e.who === 'crownpass') CBQ.push({ ico: '👑', kicker: 'Long live the heir', title: `Dynasty ${Game.S.legacy.dynasty}`, sub: `+${e.gain} Crowns to spend in Legacy · lands you know fall ${3 + Game.perkRank('lap')}× faster` });
      else if (e.who === 'dig') CBQ.push({ small: 1, ico: '⛏', kicker: 'Your town grows', title: `${e.name} · ${e.unit} ${e.d}`, sub: 'It starts small but can grow far bigger than the last — upgrade its three steps inside.' });
      else if (e.who === 'depth' && e.first && e.depth % 5 === 0) { const G = Game.landDef(e.n); CBQ.push({ small: 1, ico: '∞', kicker: 'Deeper than ever', title: `${G ? G.name : ''} · depth ${e.depth}`, sub: `Tougher foes, +10% ${G && R[G.spoil] ? R[G.spoil].name.toLowerCase() : 'spoils'}` }); }
      else if (e.who === 'pathrow') CBQ.push({ small: 1, ico: '✦', kicker: 'Paths', title: `Row ${e.t + 1} opens`, sub: 'Deeper ranks: stronger, and costlier.' });
      else if (e.who === 'emperor') CBQ.push({ ico: '👑', kicker: `The ${Game.ageName(e.a)} is won`, title: 'The Emperor has fallen', sub: 'Crown your heir in the Keep to begin the next Age.' });
      else if (e.who === 'newage') CBQ.push({ ico: '🏰', kicker: 'A new Age', title: Game.ageName(e.a), sub: `+${e.gain} Crowns · the ten lands, far richer and far tougher` });
      else if (e.who === 'era') { const W = Game.wonderFor(e.e); CBQ.push({ ico: '🏛', kicker: 'Era Ruler defeated', title: `Era ${e.e} complete`, sub: `The ${W.name} can now be built — Kingdom → Keep → Wonders` }); }
      else if (e.who === 'wonder') { const W = Game.wonderFor(e.e); CBQ.push({ ico: W.def.icon, kicker: 'Wonder complete', title: W.name, sub: W.def.desc }); }
      else if (e.who === 'proclaim') CBQ.push({ ico: '🏰', kicker: 'A kingdom is born', title: 'The Kingdom is proclaimed', sub: 'Build the Barracks and march on your first land.' });
      else if (e.who === 'tier') CBQ.push({ ico: '🏘', kicker: 'Your settlement grows', title: `A ${e.name}!`, sub: 'New buildings and a bigger Storehouse.' });
      else if (e.who === 'trophy') { const T = CONFIG.trophies.tiers[e.tier]; CBQ.push({ small: 1, ico: '🏆', kicker: 'Trophy', title: `${T ? T.name : ''} ${e.name || ''} head`, sub: `+${Math.round(CONFIG.trophies.lootPerTrophy * 100)}% loot and XP, for good` }); }
    }
    while (CBQ.length > 6) CBQ.splice(CBQ.findIndex(c => c.small) >= 0 ? CBQ.findIndex(c => c.small) : 0, 1);
    cbNext();
  }
  function cbNext() {
    if (cbBusy || !CBQ.length) return; cbBusy = true;
    const c = CBQ.shift(), b = $('celebrate');
    setText($('cb-ico'), c.ico); setText($('cb-kicker'), c.kicker); setText($('cb-title'), c.title); setText($('cb-sub'), c.sub || '');
    b.className = 'celebrate show' + (c.small ? ' small' : '');
    cbTimer = setTimeout(cbDone, c.small ? 2200 : 3800);
  }
  function cbDone() { clearTimeout(cbTimer); const b = $('celebrate'); if (!cbBusy) return; b.classList.add('out'); setTimeout(() => { b.className = 'celebrate hidden'; cbBusy = false; cbNext(); }, 330); }
  function showStarInfo() { // 0.11.1: where Crowns come from
    const C = CONFIG.ages.crowns, A = Game.ageNo();
    showInfo('Crowns', `You have ${Game.fmt(Game.crowns())} 👑`, `<p class="small">Crowns are forever: spend them in the Crown Tree (and on Gathering capstones, 1 each). You earn them by:</p>
      <div class="star-row"><b>Every boss in the Wild, the Roads and the Crypts</b><div class="small dim">+${C.boss} the first time</div></div>
      <div class="star-row"><b>Every land Captain</b><div class="small dim">+${C.captain * A} the first time each Age (× the Age number)</div></div>
      <div class="star-row"><b>Every land Ruler</b><div class="small dim">paid when the crown passes — more for later lands, × the Age</div></div>
      <div class="star-row"><b>Era Rulers (land 5) and the Emperor (land ${CONFIG.ages.lands})</b><div class="small dim">+${C.eraRuler * A} and +${C.emperor * A} more, when the crown passes</div></div>
      <p class="small dim" style="margin-top:8px">You are in the ${Game.ageName()}. Beat the Emperor, then crown your heir in the Keep to begin the next Age.</p>`);
  }
  function hitPop(ev) {
    if (ev.who === 'rest') { const a = $('hero-hpbar') && $('hero-hpbar').offsetParent ? $('hero-hpbar').parentElement : document.querySelector('.top'); const r = a.getBoundingClientRect(); const p = el('div', 'pop heal', '☾ Resting'); p.style.left = (r.left + r.width * 0.5) + 'px'; p.style.top = (r.top + 4) + 'px'; document.body.appendChild(p); setTimeout(() => p.remove(), 1600); return; }
    if (ev.who === 'retreat') { const a = $('hero-hpbar') && $('hero-hpbar').offsetParent ? $('hero-hpbar').parentElement : document.querySelector('.top'); const r = a.getBoundingClientRect(); const p = el('div', 'pop taken', `◀ Retreat to stage ${ev.to}`); p.style.left = (r.left + r.width * 0.5) + 'px'; p.style.top = (r.top + 4) + 'px'; document.body.appendChild(p); setTimeout(() => p.remove(), 1800); return; }
    if (ev.who === 'technique') { const a = document.querySelector('.top') || document.body; const r = a.getBoundingClientRect(); const p = el('div', 'pop craft', `⚔ ${ev.name}`); p.style.left = (r.left + r.width * 0.5) + 'px'; p.style.top = (Math.max(r.top, 80) + 20) + 'px'; document.body.appendChild(p); setTimeout(() => p.remove(), 1800); return; }
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

  // ---- Enemy art: place the image so the enemy's face sits just under its HP bar ----
  let artLast = 0;
  function enemyArtKey() { const S = Game.S; if (S.hero.activity !== 'fight') return null; const T = Game.enemyType ? Game.enemyType() : null; if (!T) return null; const k = Game.isBoss() ? T.id + '_boss' : T.id; return CONFIG.art.enemies[k] ? k : null; }
  function placeArt(card, wrap, img, bar, key, size, gap) {
    const g = card.querySelector('.ground-art'), gsrc = CONFIG.art.grounds[Game.S.hero.ground];
    if (g.__src !== gsrc) { g.__src = gsrc; g.style.backgroundImage = gsrc ? `url(${gsrc})` : 'none'; }
    g.classList.toggle('on', !!gsrc && Game.S.hero.activity === 'fight');
    if (!key) { img.classList.remove('on'); return; }
    const src = `assets/enemies/${key}.webp`; if (img.__src !== src) { img.__src = src; img.src = src; }
    const cr = card.getBoundingClientRect(), br = bar.getBoundingClientRect(); if (!cr.width || !br.width) return;
    const [fx, fy] = CONFIG.art.enemies[key];
    const tx = br.left + br.width / 2 - cr.left, ty = br.bottom + gap - cr.top;
    img.style.width = size + 'px'; img.style.height = size + 'px';
    img.style.left = Math.round(tx - fx * size) + 'px'; img.style.top = Math.round(ty - fy * size) + 'px';
    img.classList.add('on');
  }
  function renderArt(force) {
    const now = performance.now(); if (!force && now - artLast < 250) return; artLast = now;
    const key = enemyArtKey();
    placeArt($('fight-card'), $('enemy-art'), $('enemy-art-img'), $('enemy-hpbar').parentElement, key, 250, 26);
    const mh = $('mini-hero'); if (!mh.classList.contains('hidden')) placeArt(mh, $('mini-enemy-art'), $('mini-enemy-art-img'), $('mini-target'), key, 170, 22);
  }
  window.addEventListener('resize', () => renderArt(true));

  // ---- Cloud save UI ----
  function renderCloud() {
    const C = window.Cloud; if (!C) return;
    const u = C.user, pic = u && u.photoURL ? `<img src="${u.photoURL}" alt="" referrerpolicy="no-referrer">` : null;
    const sil = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><circle cx="12" cy="8.5" r="4"/><path d="M4 20.5c.8-4 4.2-6 8-6s7.2 2 8 6z"/></svg>';
    const ai = $('avatar-img'); const want = pic || sil; if (ai.__h !== want) { ai.innerHTML = want; ai.__h = want; }
    const dot = $('avatar-dot'); dot.classList.toggle('hidden', !u); dot.className = 'avatar-dot ' + (u ? ({ ok: 'ok', syncing: 'busy', error: 'bad', offline: 'off', idle: 'off' }[C.status] || 'off') : 'hidden');
    $('cloud-out').classList.toggle('hidden', !!u); $('cloud-in').classList.toggle('hidden', !u);
    $('cloud-guest').classList.toggle('hidden', !!Game.S.settings.guest || !C.available);
    const sb = $('cloud-signin'); sb.disabled = !C.ready; sb.querySelector('span').textContent = !C.available ? 'Cloud saves — coming soon' : C.ready ? 'Sign in with Google' : C.status === 'error' ? 'Cloud unavailable right now' : 'Connecting…';
    if (u) { $('cloud-pic').innerHTML = pic || sil; setHtml($('cloud-name'), `<b>${(u.displayName || 'Signed in').replace(/</g, '&lt;')}</b>`);
      setText($('cloud-sync'), C.status === 'syncing' ? 'Syncing…' : C.status === 'offline' ? 'Offline — saved on this device' : C.lastSync ? `Synced ${C.ago(C.lastSync)}` : 'Signed in'); }
    const e = $('cloud-err'); e.classList.toggle('hidden', !C.error); setText(e, C.error || '');
    const b = C.backupInfo && C.backupInfo(), rb = $('cloud-restore'); rb.classList.toggle('hidden', !b);
    if (b && b.meta) setText(rb, `Restore previous save (${b.meta.place}, Hero Lv ${b.meta.heroLv}, set aside ${C.ago(b.at)})`);
  }
  // Kills bar = kills to unlock Advance. Auto bar = kills toward auto-advance, or why it is paused.
  function killsLine() {
    const h = Game.S.hero, need = Game.killsNeeded(), k = h.kills;
    if (Game.isEndless()) return { pct: 100, text: h.resting ? 'Resting — back at full health' : `∞ Endless Battle · ${Game.fmt(k)} kills` };
    return { pct: Math.min(100, 100 * k / need), text: `${Math.min(k, need)} / ${need} kills${Game.canAdvance() ? ' · Advance ready' : ''}` };
  }
  function autoLine() {
    const S = Game.S, h = S.hero, k = h.kills, an = Game.autoKillsNeeded(), block = Game.autoAdvanceBlock(), f = Game.fmt;
    const pct = Math.min(100, 100 * k / an), next = h.stage + 1;
    if (block === 'off') return { pct: 0, cls: 'off', text: 'Auto-advance is off', why: 'Tick “Auto-advance” below to let him push on by himself.' };
    if (block === 'endless') return { pct: 100, cls: 'endless', text: 'The land is yours · Endless Battle', why: `The richest fighting in ${Game.ground().name}. He fights here until you send him on — if he falls, he rests and returns. While he stays, this land pays only 50% taxes: choose the next land (Where to fight) to collect it all.` };
    if (block === 'end') return { pct: 100, cls: 'paused', text: 'Last stage of this ground', why: Game.isBoss() ? `Defeat the ${Game.enemyName()} to finish it.` : '' };
    if (Game.isBoss()) return { pct: 0, cls: '', text: 'Auto-advance: beat the boss', why: Game.ground().land && h.stage >= Game.ground().stages ? `Beat ${Game.enemyName()} to take the land — then the Endless Battle begins.` : `Once the ${Game.enemyName()} falls he moves on by himself.` };
    if (block === 'boss') return { pct, cls: 'paused', text: `Auto-advance paused · boss next`, why: `The ${Game.enemyName(next)} waits at stage ${next}. He won't face a boss on his own — tap Advance when you're ready.` };
    if (block === 'tough') { const d = Game.stageDanger(next);
      return { pct, cls: 'paused', text: 'Auto-advance paused · too tough ahead', why: d >= 1 ? `One fight at stage ${next} would beat him. Upgrade your armor or weapon (Gear) first.` : `At stage ${next} he would lose about ${Math.max(1, Math.round(d * 100))}% HP per fight after healing — he'd end up retreating. Upgrade your armor or weapon (Gear), or raise his healing.` }; }
    return { pct, cls: '', text: `Auto-advance · ${Math.min(k, an)} / ${an} kills`, why: '' };
  }
  function renderChangelog() { const el = $('whatsnew'); if (!el || el.__done) return; el.innerHTML = CONFIG.changelog.map(([v, t]) => `<div class="small"><b>${v}</b> <span class="dim">${t}</span></div>`).join(''); el.__done = true; }
  setTimeout(renderChangelog, 0);
  function rebuild() { buildLists(); for (const l in lineKey) lineKey[l] = ''; glowKey = ''; render(true); }
  setInterval(renderCloud, 15000);
  return { init, render, showWelcomeBack, renderCloud, rebuild };
})();

window.addEventListener('DOMContentLoaded', boot);
