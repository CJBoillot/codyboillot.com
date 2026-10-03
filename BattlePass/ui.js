// Battle Pass: The Game — rendering and input. Patterns from Click to Conquer's ui.js:
// DOM writes only when content changes (rewriting a button mid-click eats the click), in-game confirms, welcome-back, cloud panel.
const UI = (() => {
  const $ = id => document.getElementById(id);
  const G = Game, C = CONFIG, f = G.fmt, $$ = G.money;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const setHtml = (e, v) => { if (e && e.__h !== v) { e.innerHTML = v; e.__h = v; } };
  const setText = (e, v) => { if (e && e.__t !== v) { e.textContent = v; e.__t = v; } };
  const show = (e, on) => { if (e) e.classList.toggle('hidden', !on); };
  const PL = '<svg class="pl-ico" viewBox="0 0 24 24" aria-label="players"><circle cx="9" cy="7.5" r="3.6"/><path d="M2.5 19.5c.5-4 3.2-6.2 6.5-6.2s6 2.2 6.5 6.2z"/><circle cx="16.5" cy="8.5" r="3"/><path d="M15.2 13.6c3.3-.6 5.9 1.4 6.3 5.9h-4.6c-.2-2.4-.7-4.3-1.7-5.9z"/></svg>'; // players: electric blue (the 👥 emoji is dark gray and hard to read)
  const TV_ICO = '<svg class="brand-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2.5l4 3.5 4-3.5" fill="none" stroke="#ff3b4e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="2" y="6" width="20" height="15" rx="4" fill="#ff3b4e"/><rect x="5" y="9" width="14" height="9" rx="2" fill="#fff"/><circle cx="9.5" cy="13.5" r="1.3" fill="#ff3b4e"/><circle cx="14.5" cy="13.5" r="1.3" fill="#ff3b4e"/></svg>', PLAY_ICO = '<svg class="brand-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="5" fill="#8b3dff"/><path d="M10 8.5v7l6-3.5z" fill="#fff"/></svg>'; // Streamly (red TV), ToobVOD (purple play)
  const R = () => G.run, M = () => G.meta, S = () => G.S;

  // ---------- keyed rows: rebuilt only when the set of rows changes; fields updated in place ----------
  function sync(box, rows) {
    const key = rows.map(r => r.key).join('|');
    if (box.__k !== key) { box.innerHTML = rows.map(r => `<div class="row ${r.cls || ''}" data-key="${r.key}">${r.html}</div>`).join(''); box.__k = key; }
    const kids = box.children; rows.forEach((r, i) => { if (r.up && kids[i]) r.up(kids[i]); });
  }
  const fld = (row, name) => { row.__f = row.__f || {}; if (!(name in row.__f)) row.__f[name] = row.querySelector(`[data-f="${name}"]`); return row.__f[name]; };
  const T = (row, name, v) => setText(fld(row, name), v);
  const H = (row, name, v) => setHtml(fld(row, name), v);
  const D = (row, name, off) => { const b = fld(row, name); if (b && b.disabled !== !!off) b.disabled = !!off; };
  const K = (row, cls, on) => row.classList.toggle(cls, !!on);

  // ---------- sound (no sound in the other games; tiny WebAudio blips, toggle in Settings) ----------
  let ac = null;
  function beep(kind = 'buy') {
    if (!S().settings.sound) return;
    try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const t = ac.currentTime;
      const notes = { buy: [660], coin: [880, 1320], big: [523, 659, 784, 1047], bad: [220, 165] }[kind] || [660];
      notes.forEach((hz, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = kind === 'bad' ? 'sawtooth' : 'triangle'; o.frequency.value = hz; g.gain.setValueAtTime(0.0001, t + i * 0.07); g.gain.exponentialRampToValueAtTime(0.06, t + i * 0.07 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.07 + 0.16); o.connect(g).connect(ac.destination); o.start(t + i * 0.07); o.stop(t + i * 0.07 + 0.2); });
    } catch (e) {}
  }

  // ---------- toasts ----------
  function toast(html, cls = '') {
    const box = $('toasts'), d = document.createElement('div'); d.className = 'toast ' + cls; d.innerHTML = html; box.appendChild(d);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 400); }, 2800);
  }
  function burstAtHub() { const h = $('hub'); if (!h) return; const b = h.getBoundingClientRect(); burst(b.left + b.width / 2, b.top + 30, 10); }
  function burst(x, y, n = 14, chars = ['💸', '💰', '🪙', '💵']) {
    for (let i = 0; i < n; i++) { const p = document.createElement('div'); p.className = 'burst'; p.textContent = chars[i % chars.length];
      const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 120; p.style.left = x + 'px'; p.style.top = y + 'px';
      p.style.setProperty('--dx', Math.cos(a) * d + 'px'); p.style.setProperty('--dy', Math.sin(a) * d - 40 + 'px');
      document.body.appendChild(p); setTimeout(() => p.remove(), 1000); }
  }
  // Tap feedback starts ABOVE the finger (a thumb hides ~60px around where it lands), centred on the tap, kept on screen.
  const THUMB = 72;
  function tapPoint(e, r) { const has = e && e.clientX && e.clientY; return { x: has ? e.clientX : r.left + r.width / 2, y: has ? e.clientY : r.top + r.height / 2 }; }
  function floatAbove(e, r, txt, cls = '') {
    const p = tapPoint(e, r), w = Math.min(window.innerWidth - 16, txt.length * 7.5 + 10);
    const x = Math.max(8, Math.min(window.innerWidth - w - 8, p.x - w / 2 + (Math.random() - 0.5) * 40));
    floatText(x, Math.max(8, p.y - THUMB - Math.random() * 18), txt, cls); }
  function floatPhrase(e, r, txt, cls) { floatAbove(e, r, txt, cls); }
  function floatText(x, y, txt, cls = '') { const p = document.createElement('div'); p.className = 'float ' + cls; p.textContent = txt; p.style.left = x + 'px'; p.style.top = y + 'px'; document.body.appendChild(p); setTimeout(() => p.remove(), 900); }

  // ---------- modals ----------
  let confirmCb = null;
  function ask(title, html, yes, cb) { show($('settings'), false); /* never open behind the settings panel */ setText($('confirm-title'), title); $('confirm-text').innerHTML = html; setText($('confirm-yes'), yes || 'Yes'); confirmCb = cb; show($('confirm-modal'), true); }
  function closeAsk() { confirmCb = null; show($('confirm-modal'), false); }
  const storyQueue = [];
  function story(kicker, title, html, btn, logo) { storyQueue.push({ kicker, title, html, btn, logo }); if ($('story').classList.contains('hidden')) nextStory(); }
  function nextStory() { const s = storyQueue.shift(); if (!s) { show($('story'), false); return; } setText($('story-kicker'), s.kicker); setText($('story-title'), s.title); $('story-text').innerHTML = s.html; setText($('story-go'), s.btn || 'Continue'); show($('story-logo'), !!s.logo); show($('story'), true); }
  const ERA_STORY = {
    2: ['It is co-op now.', 'Same game, with a friend. Co-op needs an account, a launcher and servers, and servers cost money every second.<br><br>New: <b>ads</b> (in a game people paid for: they cost double the rating), a <b>Season Pass</b>, more streamers, <b>ToobVOD</b>, Community Managers, and more things to go wrong.', 'Put ads in ▶'],
    3: ['It is an online game now.', 'A hub town, raids and ranked. The story is now "lore", available on the wiki.<br><br>New: <b>subscriptions</b>, a Deluxe Edition, Ranked Mode, <b>corporate decisions</b>, managers and dev teams, and <b>Streamly Live</b> (subathons, drops, announcements).', 'Log in ▶'],
    4: ['Free-to-Play Relaunch', 'Everyone who sees it installs it. Nobody pays for it.<br><br>Ads stop costing double: nobody paid, so nobody feels robbed. The <b>Cash Shop</b> opens: skins, a Battle Pass, Gems, and soon <b>pay-to-win</b>. Watch the water for whales.', 'Open the shop ▶'],
    5: ['"Don\'t you guys have phones?"', 'The mobile port. Auto-play, energy, and an ad every 30 seconds. The players who bought the single-player game have questions.<br><br>New: pre-installs, the <b>Mandatory OS Update</b>, the Neural Ad Implant, and the <b>Board</b>, which has approved a sequel. And a restructuring.', 'Ship it ▶'],
  };
  const ERA_ASK = {
    2: 'Co-op means servers, and servers cost money. Ads open, and in a game people paid for they cost double the rating.',
    3: 'The story becomes "lore". Subscriptions, ranked play and corporate decisions open.',
    4: 'The game becomes free, forever. Everyone installs it; nobody pays for it. Copy sales and sales events end, and the Cash Shop opens. There is no going back.',
    5: 'The mobile port. The worst ad channels open, and so does the sequel.',
  };
  const STAGE_STORY = {
    2: ['A thousand people play your game.', 'You are a <b>Cult Hit</b>. Some of the thousand have opinions, and the opinions have a comments section.<br><br>New: the <b>Community</b> tab. Reply to reviews, and ask your cousin to stream it.', 'Read the reviews ▶'],
    3: ['Congratulations, you incorporated.', 'You are now <b>{CO}</b>. Ten thousand players. An office with a ping-pong table.<br><br>A single-player game can only get so big. Look at the players card: the board has an idea.', 'Hear the idea ▶'],
    4: ['You publish games now.', 'Welcome to <b>{CO}</b>. A hundred thousand players. The office has a slide.', 'Slide ▶'],
    5: ['The board would like a word.', '<b>{CO}</b>. One million players. The board has asked you to stop saying "players" and start saying "monthly active wallets".', 'Synergize ▶'],
    6: ['MTX GLOBAL', '<b>MTX GLOBAL INTERACTIVE ENTERTAINMENT HOLDINGS LLC</b>. Ten million players. Please do not read the reviews.', 'Monetize everything ▶'],
  };

  // ---------- header ----------
  function buildHeader() {
    const rb = $('res-bar');
    rb.innerHTML = [
      ['code', '<span class="code-ico">&lt;/&gt;</span>', 'Lines of code', 'Written by you and your developers. Spend it on game features (Development) and monetization epics (Finance).'],
      ['cash', '💵', 'Money', 'Revenue minus payroll. Pays developers, advertising, streamers and corporate decisions.'],
      ['rep', '⭐', 'Rating', 'Your store rating. Higher: more installs, fewer players quitting, and streamers bring more players.'],
      ['players', PL, 'Players', 'Active players right now. More players: ads pay more, but players expect a better game.'],
      ['data', '📊', 'Data', 'From the Analytics Department. Spend it on Research.'],
    ].map(([k, i, n, tip]) => `<div class="res res-${k}${k === 'data' ? ' hidden' : ''}" id="res-${k}" title="${tip}"><span class="ri">${i}</span><div class="rt"><b data-f="v">0</b><span class="rn">${n}</span></div><span class="rr" data-f="r"></span>${k === 'rep' ? '<span class="rep-mini"><i data-f="m"></i></span>' : ''}</div>`).join('');
    const cb = $('cur-bar');
    cb.innerHTML = Object.entries(C.currencies).map(([k, c]) => `<div class="cur hidden" id="cur-${k}" title="${c.name}">${c.icon} <b>0</b></div>`).join('')
      + `<div class="deco d2 hidden" aria-hidden="true">🔥 HOT</div><div class="deco d3 hidden" aria-hidden="true">⏳ <span id="fake-timer">01:59:59</span></div><div class="deco d4 hidden" aria-hidden="true">✨ VIP ×2 WEEKEND</div><div class="deco d5 hidden" aria-hidden="true">🎁 ×17</div>`;
  }
  let fakeT = 7199;
  const tinyMoney = v => v > 0 && v < 0.01 ? '$' + v.toPrecision(1) : $$(v); // a fraction of a cent still shows
  const sgn = v => (v >= 0 ? '+' : '−');
  const starStr = s => { const n = Math.round(s); return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n); };
  const repStars = v => { const s = Math.abs(v) * 0.04; return s.toFixed(s >= 0.095 || s === 0 ? 1 : 2) + '★'; }; // rating points → stars (100 points = 4★)
  function renderHeader() {
    const r = R(), m = M(), st = G.stageDef();
    setText($('company'), G.studioName()); setText($('stage-name'), st.name); setText($('game-title'), G.gameTitle());
    const cell = (k, v, rate) => { const e = $('res-' + k); setText(e.querySelector('[data-f=v]'), v); setText(e.querySelector('[data-f=r]'), rate); };
    const dc = G.devCodePerSec(); cell('code', f(r.code), dc > 0 ? '+' + f(dc) + '/s' : r.unpaid ? 'unpaid' : '');
    const net = G.recurringNetPerSec(); show($('res-cash'), G.has('finance') || r.cash > 10); cell('cash', $$(r.cash), (net || r.devs) ? sgn(net) + $$(Math.abs(net)) + '/s' : '');
    const dp = G.installsPerSec() - G.churnRate() * r.players; cell('players', f(r.players), sgn(dp) + f(Math.abs(dp)) + '/s');
    show($('res-rep'), G.has('reputation')); show($('res-players'), true);
    const tgt = G.repTarget(); cell('rep', G.stars().toFixed(1) + '★', tgt > r.rep + 0.5 ? '↑ ' + G.stars(tgt).toFixed(1) : tgt < r.rep - 0.5 ? '↓ ' + G.stars(tgt).toFixed(1) : '');
    const mm = $('res-rep').querySelector('[data-f=m]'); mm.style.width = r.rep + '%'; mm.className = r.rep < 30 ? 'bad' : r.rep < 60 ? 'mid' : 'good';
    $('res-cash').classList.toggle('neg', net < 0 || !!r.unpaid);
    show($('res-data'), false);
    const lvl = clutter();
    for (let i = 2; i <= 5; i++) document.querySelectorAll('.d' + i).forEach(e => show(e, lvl >= i));
    for (const k in C.currencies) { const c = C.currencies[k], e = $('cur-' + k), v = m.cur[k] || 0;
      const on = c.joke ? (v > 0 && (lvl >= 4 || v >= 1)) : (G.has('currencies') || v > 0);
      show(e, on); if (on) setText(e.querySelector('b'), f(v)); }
    show($('cur-bar'), G.has('currencies') || m.cur.coins > 0 || m.cur.gems > 0 || lvl >= 2);
    show($('ticker'), lvl >= 3);
    if (lvl >= 3 && !$('ticker-in').__set) { $('ticker-in').__set = 1; const items = ['🔥 SEASON ENDS SOON', '💎 GEMS 20% OFF (THE GEMS ARE 25% MORE)', '🎁 CLAIM YOUR FREE CHEST', '⭐ RATE US 5 STARS', '🐋 WHALE WATCHING WEEKEND', '⏳ LIMITED TIME: TIME', '👑 VIP DOUBLE VIP POINTS', '📣 NEW EVENT: THE EVENT']; $('ticker-in').textContent = (items.join('   •   ') + '   •   ').repeat(2); }
  }
  function clutter() { return S().settings.noClutter ? 1 : [1, 1, 2, 2, 4, 5][R().era || 1]; } // 0.1.0: the UI gets loud with the business model, not the player count

  // ---------- tabs ----------
  const TABS = { dev: () => true, fin: () => G.has('finance'), com: () => G.has('community'), pass: () => G.has('pass'), shop: () => false, stats: () => G.has('stats') }; // the Shop tab is parked in 0.0.4 (currencies, daily, VIP)
  let tab = 'dev';
  function setTab(t) { if (!TABS[t]) t = 'dev'; tab = t; document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === t)); document.querySelectorAll('.tab').forEach(s => show(s, s.id === 'tab-' + t)); render(true); window.scrollTo({ top: 0 }); }
  function renderTabs() {
    const seen = S().settings.seenTabs = S().settings.seenTabs || {};
    for (const t in TABS) { const b = document.querySelector(`[data-tab=${t}]`), on = TABS[t]() || (seen[t] && t !== 'shop'); if (on && !seen[t]) { seen[t] = true; if (t !== 'dev') toast(`New tab: <b>${b.childNodes[0].textContent.trim()}</b>`, 'good'); } show(b, on); }
    const badge = (t, n) => { const e = $('badge-' + t); show(e, !!n); if (n) setText(e, n === true ? '!' : n > 99 ? '99+' : String(n)); };
    const r = R(), nf = G.nextFeature();
    badge('dev', tab !== 'dev' && (r.unpaid || (G.has('gamefeatures') && G.qualityTerm() < -3)));
    badge('fin', tab !== 'fin' && ((nf && G.canDevelop(nf.id)) || (G.canSequel() && !S().settings.seqSeen)));
    badge('com', tab !== 'com' && G.has('community') && (G.repTarget() < r.rep - 8 || (r.bomb && !r.bomb.done)));
    badge('pass', G.unclaimedCount());
    const incTab = r.inc && !r.inc.done && G.incDef(r.inc.id) ? G.incDef(r.inc.id).tab : null; badge('fin', tab !== 'fin' && G.canRelaunch());
    badge('fin', tab !== 'fin' && ((nf && G.canDevelop(nf.id)) || (G.canSequel() && !S().settings.seqSeen) || (r.offers.some(o => !o.sold) && G.has('offers'))));
    if (incTab && incTab !== tab) badge(incTab, true);
    const newAch = Object.keys(M().achievements).length - (S().settings.achSeen || 0); badge('stats', tab !== 'stats' && newAch > 0 ? newAch : 0);
    if (tab === 'stats') S().settings.achSeen = Object.keys(M().achievements).length;
  }

  const amt = () => { const a = S().settings.buyAmt; return a === 'max' || a === 'next' ? a : +a || 1; };
  const amtLabel = n => (amt() === 'max' ? 'Max ' : '×') + n;
  const lockRow = (key, name, stage) => ({ key: 'lock-' + key, cls: 'locked', html: `<div class="ico">🔒</div><div class="main"><div class="name">${esc(name)}</div><div class="small dim">Unlocks when you become a ${C.stages[stage - 1].name}.</div></div>` });

  // ---------- dev board, feed, showcase ----------
  const KIND = { epic: ['🧩', 'Epic'], upg: ['📝', 'Decision'], lane: ['🎫', 'Pass tier'] };
  function projName(p) { return p.kind === 'epic' ? G.featureName(p.id) : p.kind === 'upg' ? C.upgrades.find(u => u.id === p.id).name : C.pass.lanes.find(l => l.id === p.id).name + ' Pass'; }
  function projLine(p) { const L = C.projects[{ epic: 'epicLines', upg: 'decisionLines', lane: 'laneLines' }[p.kind]], frac = p.t / p.total; return L[Math.min(L.length - 1, Math.floor(frac * L.length))]; }
  function renderDevBoard() {
    const r = R(), on = G.has('monetize') || r.projects.length > 0; show($('devboard'), on); if (!on) return;
    const busy = r.projects.filter(p => p.kind !== 'upg').length;
    setText($('dev-speed'), `${busy}/${r.staff.teams} team${r.staff.teams === 1 ? '' : 's'} busy · speed ×${G.teamSpeed().toFixed(2)}${r.pizzaUntil > G.S.time ? ' 🍕' : ''}`);
    sync($('proj-list'), r.projects.length ? r.projects.map(p => ({ key: p.kind + p.id, cls: 'proj', html: `<div class="ico">${KIND[p.kind][0]}</div><div class="main"><div class="name"><span class="tag">${KIND[p.kind][1]}</span> ${esc(projName(p))}</div><div class="small proj-line" data-f="l"></div><div class="bar"><i data-f="b"></i></div></div><span class="small proj-t" data-f="t"></span>`,
      up: row => { T(row, 'l', projLine(p)); fld(row, 'b').style.width = Math.min(100, 100 * p.t / p.total) + '%'; T(row, 't', G.fmtTime(Math.ceil(G.projectLeft(p)))); } }))
      : [{ key: 'idle', cls: 'locked', html: `<div class="main small dim">Nothing in progress. The team is "aligning". Create a monetization epic in Finance. Writing code moves an epic along, too.</div>` }]);
    const pz = G.has('staff'); show($('pizza-row'), pz);
    if (pz) { const w = G.pizzaReadyIn(), act = r.pizzaUntil > G.S.time; $('pizza-btn').disabled = w > 0 || r.cash < G.pizzaCost();
      setText($('pizza-btn'), act ? `🍕 ${Math.ceil(r.pizzaUntil - G.S.time)}s left` : w > 0 ? `🍕 Again in ${G.fmtTime(w)}` : `🍕 Pizza Party · ${$$(G.pizzaCost())}`); }
  }
  const FEED = [], FC = C.feed;
  let feedAt = 0;
  function post(text, kind = '') { const h = FC.handles[Math.floor(Math.random() * FC.handles.length)]; FEED.unshift({ h, text, kind, t: Date.now() }); if (FEED.length > 6) FEED.length = 6; feedAt = performance.now(); }
  const pickOf = a => a[Math.floor(Math.random() * a.length)];
  function renderFeed() {
    const r = R(), on = G.has('community'); show($('feed-card'), on); if (!on) return;
    if (performance.now() - feedAt > 9000) post(pickOf(r.rep >= 70 ? FC.good : r.rep >= 40 ? FC.mid : FC.bad), r.rep >= 70 ? 'good' : r.rep >= 40 ? '' : 'bad');
    setText($('feed-stars'), `${starStr(G.stars())} · ${f(r.players)} playing`);
    setText($('feed-live'), `Live now: ${G.gameTitle()}${G.has('pass') ? ` · Season ${r.bp.season}` : ''}`);
    setHtml($('feed'), FEED.map(p => `<div class="post ${p.kind}"><b>@${esc(p.h)}</b> ${esc(p.text)}</div>`).join(''));
  }
  function renderShowcase() {
    const on = G.has('pander'); show($('show-wrap'), on); if (!on) { sync($('show-list'), []); return; }
    sync($('show-list'), C.pander.filter(d => G.panderVisible(d.id)).map(d => ({ key: d.id, html: `<div class="ico">${d.icon}</div><div class="main"><div class="name">${esc(d.name)}</div><div class="small dim">${esc(d.desc)}</div></div><button class="buy accent" data-act="pander" data-id="${d.id}" data-f="b">Announce</button>`,
      up: row => { const w = G.panderReadyIn(d.id); T(row, 'b', w > 0 ? 'Again in ' + G.fmtTime(w) : 'Announce'); D(row, 'b', w > 0); } })));
  }
  function channelRows(tabName) {
    const r = R(), rows = []; let teaser = null;
    for (const c of C.channels) {
      if (c.tab !== tabName) continue;
      if (!G.channelVisible(c.id)) { if (!teaser && r.stage < c.stage) teaser = c; continue; }
      rows.push({ key: c.id, html: `<div class="ico">${c.icon}</div><div class="main"><div class="name">${esc(c.name)} <span class="lv" data-f="lv"></span>${c.pressure ? ' <span class="tag bad" data-f="p"></span>' : ''}</div><div class="small dim" data-f="i"></div><div class="mbar" title="Next milestone: output ×${C.core.milestoneMult}"><i data-f="mb"></i></div></div><button class="buy" data-act="ch" data-id="${c.id}" data-f="b"><span data-f="bn"></span><b data-f="bc"></b><i data-f="bg"></i></button>`,
        up: row => { const lv = r.ch[c.id] || 0, n = G.buyCount(c.cost, c.growth, lv, r.cash, amt()), cost = G.channelCost(c.id, n), ms = G.nextMilestone(lv);
          T(row, 'lv', lv ? 'Lv ' + lv : ''); T(row, 'i', lv ? `+${f(G.channelRate(c.id) * G.installMult())} installs/s · ${c.desc}` : c.desc);
          if (c.pressure) T(row, 'p', lv ? `−${repStars(G.channelPressure(c.id))}` : '');
          fld(row, 'mb').style.width = ms ? (100 * lv / ms) + '%' : '100%';
          T(row, 'bn', (tabName === 'community' ? 'Pay ' : 'Buy ') + amtLabel(n)); H(row, 'bc', `+${f(G.channelGain(c.id, n))} ${PL}/s`); T(row, 'bg', '−' + $$(cost)); D(row, 'b', r.cash < cost); } });
    }
    if (teaser) rows.push(lockRow(teaser.id, teaser.name, teaser.stage));
    return rows;
  }

  // ---------- DEVELOPMENT tab: make the game better ----------
  function renderDev() {
    const r = R(), TRI = C.triangle;
    renderDevBoard();
    setText($('code-n'), '+' + f(G.codePerTap())); setText($('code-unit'), G.codePerTap() === 1 ? 'line of code' : 'lines of code');
    setText($('k-code'), f(r.code)); setText($('k-devcode'), r.unpaid ? 'Unpaid!' : f(G.devCodePerSec()) + ' lines/s'); setText($('k-payroll'), $$(G.payrollPerSec()) + '/s');
    $('k-devcode').classList.toggle('bad', !!r.unpaid);
    // Quality vs Expectations
    const gfOn = G.has('gamefeatures'); show($('qbar-wrap'), gfOn);
    if (gfOn) { const q = G.quality(), e = G.expectations(), top = Math.max(q, e) * 1.25, qt = G.qualityTerm();
      setText($('q-n'), f(q)); setText($('e-n'), f(e));
      $('q-fill').style.width = (100 * q / top).toFixed(1) + '%'; $('q-fill').className = q >= e ? 'good' : 'bad'; $('e-mark').style.left = (100 * e / top).toFixed(1) + '%';
      setText($('q-note'), !G.has('reputation') ? 'Players expect more as more of them arrive. Keep the game ahead of them.' : qt >= 0 ? `Ahead of expectations: +${repStars(qt)} rating. More players will raise the bar.` : `Players expect more than you ship: −${repStars(qt)} rating. Patch the game.`); }
    // Game features (each level is a patch)
    show($('gf-wrap'), gfOn);
    if (gfOn) for (const kind of ['content', 'fix']) { // New Content and Bug Fixes (Alpha 0.0.18)
      const fix = kind === 'fix', list = C.gameFeatures.filter(g => (g.kind === 'fix') === fix), rows = []; let teaser = null;
      const per = id => G.gameFeatureCost(id, 1) / Math.max(1e-9, G.gfGain(id, 1)); let best = null, bestV = Infinity;
      if (!fix || r.bugs >= 0.5) for (const g of list) if (G.gameFeatureVisible(g.id)) { const v = per(g.id); if (v < bestV) { bestV = v; best = g.id; } }
      for (const g of list) {
        if (!G.gameFeatureVisible(g.id)) { if (!teaser && r.stage < (g.stage || 1)) teaser = g; else if (!teaser) teaser = { ...g, next: true }; continue; }
        rows.push({ key: g.id, html: `<div class="ico">${g.icon}</div><div class="main"><div class="name">${esc(g.name)} <span class="lv" data-f="lv"></span> <span class="tag good" data-f="best"></span></div><div class="small perq" data-f="pq"></div><div class="small dim" data-f="i"></div><div class="mbar"><i data-f="mb"></i></div></div><button class="buy code${fix ? ' fixbtn' : ''}" data-act="gf" data-id="${g.id}" data-f="b"><span data-f="bn"></span><b data-f="bc"></b><i data-f="bg"></i></button>`,
          up: row => { const lv = r.gf[g.id] || 0, n = G.buyCount(g.cost, TRI.gfGrowth, lv, r.code, amt()), cost = G.gameFeatureCost(g.id, n), ms = G.nextMilestone(lv), none = fix && r.bugs < 0.5;
            T(row, 'lv', lv ? 'Lv ' + lv : ''); T(row, 'best', g.id === best ? 'Best deal' : ''); K(row, 'best-deal', g.id === best);
            H(row, 'pq', none ? 'No known bugs right now.' : fix ? `<b>${f(per(g.id))}</b> lines of code per bug` : `<b>${f(per(g.id))}</b> lines of code per Quality · adds ${f(C.triangle.bugs.perQ * G.gfGain(g.id, 1))} bugs`);
            T(row, 'i', fix ? `Fixes ${Math.round(g.fix * 100)}% of your bugs · ${g.desc}` : `+${f(g.q * G.milestoneMult(lv))} Quality per patch · ${g.desc}`);
            fld(row, 'mb').style.width = ms ? (100 * lv / ms) + '%' : '100%';
            T(row, 'bn', none ? 'Nothing to fix' : 'Patch ' + amtLabel(n)); T(row, 'bc', fix ? `−${f(G.fixGain(g.id, n))} bugs` : `+${f(G.gfGain(g.id, n))} Quality`); T(row, 'bg', `−${f(cost)} </>`); D(row, 'b', r.code < cost || none); } });
      }
      if (teaser) rows.push(teaser.next ? { key: 'next-' + teaser.id, cls: 'locked', html: `<div class="ico">🔒</div><div class="main"><div class="name">${esc(teaser.name)}</div><div class="small dim">Ship one patch of the one above first.</div></div>` } : lockRow(teaser.id, teaser.name, teaser.stage));
      sync($(fix ? 'fix-list' : 'gf-list'), rows); }
    if (gfOn) { const br = G.bugRatio(), pen = G.bugPenalty(), el = $('bug-row'); el.className = 'bug-row small ' + (br > 0.15 ? 'bad' : br > 0.05 ? 'mid' : 'good');
      setHtml(el, `🐛 <b>${f(Math.round(r.bugs))}</b> bugs (${G.pct(br)} of the game)${br >= 0.005 ? ` · players quit <b>+${G.pct(G.bugChurn() - 1)}</b> · rating <b>−${repStars(pen)}</b>` : ' · nothing players have noticed'}`); }
    // Developers (salaried) and staff
    const hire = G.has('hiring'); show($('hire-wrap'), hire);
    if (hire) {
      setText($('dev-head'), r.unpaid ? '⚠️ Payroll missed: nobody is coding' : `${f(r.devs)} on payroll`);
      const rows = []; let teaser = null;
      for (const t of TRI.devTiers) {
        if (!G.devTierVisible(t.id)) { if (!teaser) teaser = t; continue; }
        rows.push({ key: t.id, html: `<div class="ico">${t.icon || '🧑‍💻'}</div><div class="main"><div class="name">${esc(t.name)} <span class="lv" data-f="lv"></span></div><div class="small dim" data-f="i"></div><div class="mbar"><i data-f="mb"></i></div></div><button class="buy" data-act="dev-hire" data-id="${t.id}" data-f="b"><span data-f="bn"></span><b data-f="bc"></b><i data-f="bg"></i><i data-f="bs" class="sal"></i></button>`,
          up: row => { const lv = r.dev[t.id] || 0, n = G.buyCount(t.cost, TRI.devGrowth, lv, r.cash, amt()), cost = G.devCost(t.id, n), ms = G.nextMilestone(lv), sal = t.salary * Math.pow(TRI.salaryGrowth, lv);
            T(row, 'lv', lv ? '×' + lv : ''); T(row, 'i', `+${f(t.code * G.milestoneMult(lv) * G.mults().code)} lines/s each · next salary ${$$(sal)}/s${lv ? ` · team: ${f(G.tierCode(t.id) * G.mults().code)} lines/s for ${$$(G.tierPayroll(t.id))}/s` : ''}`);
            fld(row, 'mb').style.width = ms ? (100 * lv / ms) + '%' : '100%';
            T(row, 'bn', 'Hire ' + amtLabel(n)); T(row, 'bc', `+${f(G.devGain(t.id, n))} lines/s`); T(row, 'bg', '−' + $$(cost) + ' fee'); T(row, 'bs', `−${$$(sal * (Math.pow(C.triangle.salaryGrowth, n) - 1) / (C.triangle.salaryGrowth - 1))}/s pay`); D(row, 'b', r.cash < cost); } });
      }
      if (teaser) rows.push(r.stage < teaser.stage ? lockRow(teaser.id, teaser.name, teaser.stage) : { key: 'next-' + teaser.id, cls: 'locked', html: `<div class="ico">🔒</div><div class="main"><div class="name">${esc(teaser.name)}</div><div class="small dim">Hire one of the tier above first.</div></div>` });
      if (G.has('qa')) { const Q = TRI.qa; rows.push({ key: 'qa', html: `<div class="ico">${Q.icon}</div><div class="main"><div class="name">${esc(Q.name)} <span class="lv" data-f="lv"></span></div><div class="small dim" data-f="i"></div></div><button class="buy" data-act="qa" data-f="b"><span data-f="bn">Hire ×1</span><b data-f="bc"></b><i data-f="bg"></i><i class="sal" data-f="bs"></i></button>`,
        up: row => { const n = r.qa || 0, sal = Q.salary * Math.pow(Q.salaryGrowth, n); T(row, 'lv', n ? '×' + n : ''); T(row, 'i', n ? `The team fixes ${G.pct(G.qaFixPerSec() * 60)} of your bugs a minute, for ${$$(G.qaPayroll())}/s.` : Q.desc); T(row, 'bc', `−${G.pct(Q.fix * 60)}/min`); T(row, 'bg', '−' + $$(G.qaCost()) + ' fee'); T(row, 'bs', `−${$$(sal)}/s pay`); D(row, 'b', r.cash < G.qaCost()); } }); }
      sync($('devtier-list'), rows);
      const sf = G.has('staff');
      sync($('staff-list'), !sf ? [] : [
        { key: 'mgr', html: `<div class="ico">${C.staff.mgr.icon}</div><div class="main"><div class="name">Middle Managers <span class="lv" data-f="lv"></span></div><div class="small dim">${esc(C.staff.mgr.desc)} Developers write ${G.pct(TRI.mgrDevBoost)} more per manager.</div></div><button class="buy" data-act="mgr" data-f="b">Hire<b data-f="bc"></b></button>`,
          up: row => { T(row, 'lv', r.staff.mgr ? '×' + r.staff.mgr : ''); T(row, 'bc', $$(G.mgrCost())); D(row, 'b', r.cash < G.mgrCost()); } },
        { key: 'team', html: `<div class="ico">${C.staff.teams.icon}</div><div class="main"><div class="name">Dev Teams <span class="lv" data-f="lv"></span></div><div class="small dim">${esc(C.staff.teams.desc)}</div></div><button class="buy" data-act="team" data-f="b"><span data-f="bn">Hire</span><b data-f="bc"></b></button>`,
          up: row => { const c = G.teamCost(); T(row, 'lv', '×' + r.staff.teams); T(row, 'bn', c == null ? 'Max' : 'Hire'); T(row, 'bc', c == null ? '' : $$(c)); D(row, 'b', c == null || r.cash < c); } },
      ]);
    }
    setHtml($('log'), S().log.slice(0, 25).map(l => `<div class="small"><span class="dim">${new Date(l.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> ${esc(l.msg)}</div>`).join('') || '<div class="small dim">Nothing yet. Write some code.</div>');
  }

  // ---------- sales (Alpha 0.0.18) ----------
  function renderSale() {
    const r = R(), on = G.has('sales') && !r.f2p && r.price >= 0; show($('sale-wrap'), on); if (!on) return;
    const live = G.saleOn(), wait = G.saleReadyIn(), box = $('sale-row');
    setText($('sale-st'), live ? `🔥 ${Math.round(r.sale.off * 100)}% off · ${G.fmtTime(G.saleLeft())} left` : wait ? `Next sale in ${G.fmtTime(wait)}` : r.saleFatigue > 0.02 ? `${G.pct(r.saleFatigue)} of buyers are waiting for a sale` : '');
    $('sale-wrap').classList.toggle('live', live);
    if (box.__k !== 'b') { box.__k = 'b'; box.innerHTML = C.price.sale.options.map((o, k) => `<button class="sale-btn" data-act="sale" data-k="${k}"><b>−${Math.round(o.off * 100)}%</b><span data-sp="${k}"></span><span class="pi-row"><span>${PL}</span><span data-si="${k}"></span></span><span class="pi-row"><span>💵</span><span data-sm="${k}"></span></span><span class="small dim">for ${G.fmtTime(o.secs)}</span></button>`).join(''); }
    C.price.sale.options.forEach((o, k) => { const b = box.querySelector(`[data-k="${k}"]`), pv = G.salePreview(k); b.disabled = !G.canSale(k); b.classList.toggle('active', live && r.sale.off === o.off);
      setText(b.querySelector(`[data-sp="${k}"]`), '$' + pv.price.toFixed(2)); setText(b.querySelector(`[data-si="${k}"]`), `${f(pv.inst * 60)}/min`); setText(b.querySelector(`[data-sm="${k}"]`), `${$$(pv.money * 60)}/min`); });
  }
  // ---------- FINANCE tab: make money from the game ----------
  // ---------- players hub: on every tab (Alpha 0.0.4) ----------
  let settleEma = null, settleT = 0;
  function renderHub() {
    const r = R(), I = G.installsPerSec(), c = G.churnRate(), d = I - c * r.players;
    setText($('hub-p'), f(r.players)); setText($('hub-rate'), (d >= 0 ? '+' : '−') + f(Math.abs(d)) + '/s'); $('hub-rate').className = 'hub-rate ' + (d >= 0 ? 'good' : 'bad');
    { const v = G.settlesAt(), now = performance.now(), dt = settleT ? (now - settleT) / 1000 : 99; settleT = now; settleEma = !isFinite(settleEma) || settleEma == null || dt > 5 ? v : settleEma + (v - settleEma) * Math.min(1, dt / 20); } // smoothed over ~20 s: sales and incidents make it jump
    setText($('hub-eq'), G.onStore() ? f(settleEma) : '—');
    setText($('hub-flow'), G.onStore() ? `${f(I)} in/s · ${f(c * r.players)} quit/s (${(c * 6000).toFixed(1)}%/min)` : 'Not on the store yet');
    const bc = G.bugChurn(); if (bc > 1.05 && G.has('gamefeatures')) setText($('hub-flow'), $('hub-flow').textContent + ` · bugs: +${G.pct(bc - 1)} quit`);
    { const e = G.eraDef(), nx = G.nextEraDef(), ready = G.canRelaunch(), er = $('era-row'); show(er, G.has('gamefeatures'));
      setHtml($('era-now'), `${e.icon} <b>${esc(e.name)}</b> era`);
      setText($('era-next'), !nx ? 'The final form.' : ready ? `Ready: ${nx.name}` : `${nx.icon} ${nx.name} at ${f(e.next)} players`);
      const b = $('era-btn'); show(b, !!nx && ready); if (nx) setText(b, `Announce ${C.sequel.baseTitle}: ${nx.sub} ▶`); er.classList.toggle('ready', ready); }
    const ns = G.nextStage();
    if (ns) { const p = Math.min(1, Math.log10(1 + r.peak) / Math.log10(1 + ns.need)); $('stage-bar').style.width = (p * 100).toFixed(1) + '%'; setText($('stage-next-name'), `Next: ${ns.name}`); setText($('stage-next-text'), `${f(r.peak)} / ${f(ns.need)} players`); }
    else { $('stage-bar').style.width = '100%'; setText($('stage-next-name'), G.stageDef().name); setText($('stage-next-text'), 'The top. For now.'); }
  }

  // ---------- FINANCE tab: make money from the game ----------
  function renderFin() {
    const r = R(), m = M();
    renderSale();
    // Price (era 1) and the free-to-play relaunch
    show($('price-card'), G.has('store'));
    if (G.has('store')) {
      const L = C.price.ladder;
      setText($('price-now'), r.f2p ? 'Free-to-play' : r.price < 0 ? 'Not on the store yet' : `${L[r.price].label} · ${f(r.sales)} sold · ${$$(r.salesMoney || 0)}`);
      const ph = $('price-row');
      if (!ph.__k || ph.__k !== (r.f2p ? 'f2p' : 'paid')) { ph.__k = r.f2p ? 'f2p' : 'paid';
        ph.innerHTML = r.f2p ? '<div class="small">The game is free. Money now comes from ads and the shop.</div>' : L.map((x, i) => `<button class="price-btn" data-act="price" data-i="${i}"><b>${x.label}</b><span class="pi-row"><span>${PL}</span><span data-pp="${i}"></span></span><span class="pi-row"><span>💵</span><span data-pm="${i}"></span></span><span class="pi-row"><span>📈</span><span data-ps="${i}"></span></span><span class="small dim">${esc(x.note)}</span></button>`).join(''); }
      if (!r.f2p) L.forEach((x, i) => { const b = ph.querySelector(`[data-act=price][data-i="${i}"]`); if (!b) return; b.classList.toggle('active', r.price === i);
        setText(b.querySelector(`[data-pp="${i}"]`), `${f(G.installsAt(i) * 60)} new players/min`); setText(b.querySelector(`[data-pm="${i}"]`), `${$$(G.installsAt(i) * x.p * (r.price === i ? G.saleMult() : 1) * 60)}/min in sales`); setText(b.querySelector(`[data-ps="${i}"]`), `settles at ${f(G.settlesAtPrice(i))} players`); });
      setHtml($('price-note'), r.f2p ? '' : r.price < 0 ? 'Pick a price to put the game on the store. Cheap brings players fast, but they drift off; pricey brings fewer, who stay. Pricier games also depend more on your rating.' : `Cheap brings players fast, but they drift off; pricey brings fewer, who stay for months. "Settles at" is where your player count ends up at each price, at your current rating (${G.stars().toFixed(1)}★) and marketing. Raising the price annoys the players you already have.`);
      show($('f2p-row'), false); // 0.1.0: free-to-play is an era relaunch (players card)
    }
    // The Finance tap: Promote the Game while there are no ads; Put Ad in Game once the accountant suggests them
    const ads = G.has('ads'); show($('ad-card'), G.has('promote') && G.onStore());
    if ($('ad-btn').__mode !== (ads ? 'ad' : 'promo')) { $('ad-btn').__mode = ads ? 'ad' : 'promo';
      setText($('ad-title'), ads ? 'Put Ad in Game' : 'Promote the Game'); setText($('ad-icon'), ads ? '🪧' : '📣'); $('ad-btn').setAttribute('aria-label', ads ? 'Put an ad in the game' : 'Promote the game');
      setHtml($('ad-line'), ads ? `<b>The game ${r.f2p ? 'is free' : 'costs ' + $$(G.priceNow())}.</b> <span class="dim">${r.f2p ? 'Ads pay the bills now.' : 'And now it has ads.'}</span>` : '<b>Nobody knows your game exists.</b> <span class="dim">Yet.</span>'); }
    setText($('ad-n'), ads ? '+' + $$(G.adTapValue()) : '+' + f(G.promoteGain()));
    show($('promo-btn'), ads && !r.f2p); if (ads && !r.f2p) setText($('promo-n'), '+' + f(G.promoteGain()) + ' players'); setText($('ad-unit'), ads ? (r.f2p ? 'per ad' : 'per ad · rating cost ×2 (paid game)') : 'players per tap');
    // Finance team: the accountant (shows runway, suggests ads)
    const ac = G.has('accountant') || r.acct; show($('acct-wrap'), ac);
    if (ac) { const rw = G.runway(); setText($('runway'), !r.acct ? '' : rw === Infinity ? 'Cash is growing' : `Out of money in ${G.fmtTime(rw)}`); $('runway').className = 'small ' + (r.acct && rw < 300 ? 'bad' : 'dim');
      sync($('acct-list'), [{ key: 'acct', html: `<div class="ico">🧮</div><div class="main"><div class="name">Accountant <span class="lv" data-f="lv"></span></div><div class="small dim" data-f="i"></div></div><button class="buy" data-act="acct" data-f="b"><span data-f="bn">Hire</span><b data-f="bc"></b><i data-f="bg"></i></button>`,
        up: row => { T(row, 'lv', r.acct ? 'on staff' : ''); T(row, 'i', r.acct ? 'Watches the runway. Has opinions about ads.' : 'Tells you how long your cash will last. Will suggest ads. Accountants always suggest ads.');
          T(row, 'bn', r.acct ? 'Hired' : 'Hire'); T(row, 'bc', r.acct ? '' : 'Runway + ads'); T(row, 'bg', r.acct ? '' : '−' + $$(C.accountant.cost)); D(row, 'b', r.acct || r.cash < C.accountant.cost); K(row, 'owned', r.acct); } }]); }
    setText($('k-rev'), $$(G.recurringPerSec()) + '/s'); const net = G.recurringNetPerSec(); setText($('k-net'), sgn(net) + $$(Math.abs(net)) + '/s'); $('k-net').classList.toggle('bad', net < 0);
    setText($('k-load'), `${f(r.adLoad)} ads · −${repStars(G.adPenalty())}`);
    // Monetization shelves: Ads, Cash Shop, Pay to Win (built with Code)
    const mon = C.features.some(ft => G.shelfOpen(ft.shelf) || r.devd[ft.id]); show($('mon-wrap'), mon);
    if (mon) { const rows = [];
      for (const sh of ['dlc', 'ads', 'shop', 'p2w']) {
        const items = C.features.filter(ft => ft.shelf === sh), open = G.shelfOpen(sh) || items.some(ft => r.devd[ft.id]);
        const SH = C.shelves[sh];
        if (!open) { const first = items[0]; rows.push({ key: 'shlock-' + sh, cls: 'locked', html: `<div class="ico">🔒</div><div class="main"><div class="name">${esc(SH.name)}</div><div class="small dim">${sh === 'shop' || sh === 'p2w' ? 'Opens when the game goes free-to-play.' : sh === 'ads' ? 'Opens with the co-op relaunch.' : 'The accountant has an idea.'}</div></div>` }); continue; }
        rows.push({ key: 'sh-' + sh, cls: 'shelf-head', html: `<div class="main"><div class="name">${esc(SH.name)} <span class="small dim" data-f="t"></span></div><div class="small dim">${esc(SH.hint)}</div></div>`,
          up: row => T(row, 't', `${$$(G.shelfRevenue(sh))}/s${sh === 'p2w' && G.p2wCount() ? ` · ${G.p2wCount()} stocked: −${repStars(G.p2wPenalty())} extra` : ''}`) });
        let locked = null;
        for (const ft of items) {
          if (r.devd[ft.id]) {
          rows.push({ key: ft.id, html: `<div class="ico">${ft.icon}</div><div class="main"><div class="name"><span data-f="nm"></span> <span class="lv" data-f="lv"></span> <span class="tag rep-tag ${ft.pressure < 0 ? 'good' : 'bad'}" data-f="p"></span></div><div class="small dim" data-f="i"></div><div class="mbar"><i data-f="mb"></i></div></div><div class="btn-col"><button class="buy code" data-act="ft" data-id="${ft.id}" data-f="b"><span data-f="bn"></span><b data-f="bc"></b><i data-f="bg"></i></button><button class="aggr" data-act="aggr" data-id="${ft.id}" data-f="ag" title="×2 money, ×3 rating cost">Aggressive</button></div>`,
            up: row => { const lv = r.ft[ft.id] || 0, n = G.buyCount(ft.cost, ft.growth, lv, r.code, amt()), cost = G.featureCost(ft.id, n), ms = G.nextMilestone(lv);
              T(row, 'nm', G.featureName(ft.id)); T(row, 'lv', lv ? 'Lv ' + lv : 'not stocked'); T(row, 'p', !lv ? '' : ft.pressure < 0 ? `+${repStars(G.featurePressure(ft.id))}` : `−${repStars(G.featurePressure(ft.id))}`);
              T(row, 'i', lv ? `${$$(G.featureRate(ft.id))}/s · ${ft.desc}` : `Give it level 1 to stock it.${ft.shelf === 'p2w' ? ` Stocking it raises the pay-to-win penalty to −${repStars(G.p2wPenalty(G.p2wCount() + 1))}.` : ''} ${ft.desc}`);
              fld(row, 'mb').style.width = ms ? (100 * lv / ms) + '%' : '100%';
              T(row, 'bn', (lv ? 'Sprint ' : 'Stock ') + amtLabel(n)); T(row, 'bc', `+${tinyMoney(G.featureGain(ft.id, n))}/s`); T(row, 'bg', `−${f(cost)} </>`); D(row, 'b', r.code < cost);
              const ag = fld(row, 'ag'); ag.classList.toggle('on', !!r.aggr[ft.id]); D(row, 'ag', !lv); K(row, 'is-aggr', r.aggr[ft.id]); } });
          } else if (G.featureVisible(ft.id)) {
          rows.push({ key: 'dev-' + ft.id, cls: 'develop', html: `<div class="ico">${ft.icon}</div><div class="main"><div class="name">${esc(ft.name)} <span class="tag new">NEW</span></div><div class="small dim">${esc(ft.desc)}</div><div class="small" data-f="eta"></div></div><button class="buy code primary" data-act="dev" data-id="${ft.id}" data-f="b"><span data-f="bn">Create Epic</span><b data-f="bc"></b></button>`,
            up: row => { const busy = G.inProgress('epic', ft.id), pj = busy && r.projects.find(p => p.kind === 'epic' && p.id === ft.id);
              T(row, 'bn', busy ? 'Building' : 'Create Epic'); T(row, 'bc', busy ? G.fmtTime(G.projectLeft(pj)) + ' left' : f(ft.dev) + ' </>'); D(row, 'b', busy || !G.canDevelop(ft.id));
              const need = ft.dev - r.code, cps = G.devCodePerSec();
              T(row, 'eta', busy ? 'The team is on it (Dev Board, Development tab). Writing code speeds it up.' : G.freeTeams() <= 0 ? 'Every dev team is busy. Wait, or hire another team in Development.' : need <= 0 ? `Ready. The team needs about ${G.fmtTime(G.epicSecsFor(ft.id) / G.teamSpeed())} to build it.` : cps > 0 ? `Save up: about ${G.fmtTime(need / cps)} of developer time (or write it yourself).` : 'Save up lines of code: write them yourself, or hire developers.'); } });
            break;
          } else { locked = ft; break; }
        }
        if (locked && R().stage < locked.stage) rows.push(lockRow(locked.id, locked.name, locked.stage));
      }
      sync($('feature-list'), rows); }
    // Advertising: ad networks + paid installs
    const adv = G.has('advertising'); show($('adv-wrap'), adv);
    if (adv) { const AN = C.triangle.adNetwork;
      sync($('adv-list'), (!G.has('adnetwork') ? [] : [{ key: 'adnet', html: `<div class="ico">📡</div><div class="main"><div class="name">Ad Networks <span class="lv" data-f="lv"></span></div><div class="small dim" data-f="i"></div></div><button class="buy" data-act="adnet" data-f="b">Sign<b data-f="bc"></b></button>`,
        up: row => { T(row, 'lv', r.adNet ? '×' + r.adNet : ''); T(row, 'i', `Each one puts ${f(AN.adsPerSec * 60)} ads a minute in the game for you. More Ad Load: more money from every player, and a lower rating.`); T(row, 'bc', $$(G.adNetCost())); D(row, 'b', r.cash < G.adNetCost()); } }]).concat(channelRows('finance'))); }
    // Live ops: limited-time offers (from 100K players)
    const off = G.has('offers'); show($('offers-head'), off); show($('offers-hint'), off);
    if (off) sync($('offer-list'), r.offers.map((o, i) => ({ key: o.name + ':' + i + ':' + Math.round(o.until), cls: 'offer', html: `<div class="o-ribbon">${o.value}% VALUE!</div><div class="o-name">${esc(o.name)}</div><div class="o-price"><s>$${o.was.toFixed(2)}</s> <b>$${o.now.toFixed(2)}</b></div><div class="o-stock">ONLY ${o.stock} REMAINING</div><div class="o-timer">ENDS IN <b data-f="t"></b></div><button class="buy primary" data-act="offer" data-i="${i}" data-f="b"><span data-f="bn"></span></button>`,
      up: row => { T(row, 't', G.clock(o.until - S().time)); const v = G.offerValue(o); T(row, 'bn', o.sold ? 'SOLD OUT' : `Run offer · +${$$(v)}`); D(row, 'b', o.sold); K(row, 'sold', o.sold); } })));
    else sync($('offer-list'), []);
    show($('adstudio'), G.has('adstudio')); if (G.has('adstudio')) renderFakeAd();
    // Corporate decisions, research, portfolio, board
    const dec = C.upgrades.some(u => G.upgradeVisible(u.id)); show($('upg-head'), dec);
    const vis = C.upgrades.filter(u => G.upgradeVisible(u.id) && !r.upg[u.id]).sort((a, b) => a.cost - b.cost).slice(0, 8);
    setText($('upg-owned'), `${Object.keys(r.upg).length} owned`);
    sync($('upg-list'), !dec ? [] : vis.map(u => ({ key: u.id, html: `<div class="ico">${u.icon}</div><div class="main"><div class="name">${esc(u.name)}</div><div class="desc-wrap"><div class="small dim desc">${esc(u.desc)}</div><div class="small row-status" data-f="st"></div></div></div><button class="buy" data-act="upg" data-id="${u.id}" data-f="b"><span data-f="bn">Approve</span><b data-f="bc">${$$(u.cost)}</b></button>`,
      up: row => { const busy = G.inProgress('upg', u.id), pj = busy && r.projects.find(p => p.kind === 'upg' && p.id === u.id); T(row, 'st', busy ? '📝 ' + projLine(pj) : ''); T(row, 'bn', busy ? 'Pending' : 'Approve'); T(row, 'bc', busy ? G.fmtTime(Math.ceil(G.projectLeft(pj))) : $$(u.cost)); D(row, 'b', busy || !G.canUpgrade(u.id)); K(row, 'pending', busy); } })).concat(vis.length ? [] : [{ key: 'none', cls: 'locked', html: '<div class="main small dim">Every decision for this stage is approved. More arrive with the next stage.</div>' }]));
    const d = G.has('data'); show($('res-head'), d); setText($('research-data'), d ? `${f(r.data)} Data · +${f(G.dataPerSec())}/s` : '');
    sync($('res-list'), d ? C.research.filter(x => !r.res[x.id]).slice(0, 5).map(x => ({ key: x.id, html: `<div class="ico">${x.icon}</div><div class="main"><div class="name">${esc(x.name)}</div><div class="small dim">${esc(x.desc)}</div></div><button class="buy data" data-act="res" data-id="${x.id}" data-f="b"><b>${f(x.cost)} 📊</b></button>`, up: row => D(row, 'b', !G.canResearch(x.id)) })) : []);
    const pf = G.has('portfolio'); show($('port-head'), pf); show($('port-hint'), pf);
    sync($('port-list'), pf ? C.games.map(g => ({ key: g.id, html: `<div class="ico">${g.icon}</div><div class="main"><div class="name">${esc(g.name)} <span class="lv" data-f="lv"></span></div><div class="small dim">${esc(g.desc)}</div></div><button class="buy" data-act="game" data-id="${g.id}" data-f="b"><span data-f="bn"></span><b data-f="bc"></b></button>`,
      up: row => { const lv = r.games[g.id] || 0, c = G.gameCost(g.id); T(row, 'lv', lv ? 'Lv ' + lv : ''); T(row, 'bn', lv ? 'Expand' : 'Acquire'); T(row, 'bc', $$(c)); D(row, 'b', r.cash < c); } })) : []);
    show($('board-card'), G.has('board'));
    if (G.has('board')) {
      const g = G.scGain(); setText($('sc-n'), f(m.sc)); setText($('sc-total'), `${f(m.scTotal)} earned · +${G.pct(C.sequel.perSC * m.scTotal)} money & code, +${G.pct(C.sequel.perSCInst * m.scTotal)} installs`);
      setText($('seq-re'), G.gameTitle(m.sequel + 1).toUpperCase());
      $('seq-btn').disabled = !G.canSequel(); setText($('seq-btn'), G.canSequel() ? `Lay everyone off & make ${G.gameTitle(m.sequel + 1)} · +${g} SC` : 'Lay Everyone Off & Make a Sequel');
      setHtml($('seq-text'), G.canSequel() ? `${esc(G.gameTitle())} is a success, which means it is time to lay off all ${f(G.headcount())} people who made it and announce <b>${esc(G.gameTitle(m.sequel + 1))}</b>. Players, Code, Money, features, developers, ads, streamers, decisions, research, Portfolio and the Battle Pass reset. Coins, Gems, VIP, cosmetics, achievements and Shareholder Confidence stay. Next +1 SC at ${f(G.nextScAt())} players.` : `The board will approve a sequel once ${esc(G.gameTitle())} reaches ${f(G.sequelTarget())} players${m.sequel > 1 ? ' (it has to beat the last game)' : ''} Now: ${f(r.peak)}.`);
      sync($('board-list'), C.board.map(b => ({ key: b.id, html: `<div class="ico">${b.icon}</div><div class="main"><div class="name">${esc(b.name)} <span class="lv" data-f="lv"></span></div><div class="small dim">${esc(b.desc)}</div></div><button class="buy sc" data-act="board" data-id="${b.id}" data-f="b"><b data-f="bc"></b></button>`,
        up: row => { const rk = G.boardRank(b.id), max = b.max && rk >= b.max; T(row, 'lv', rk ? `Rank ${rk}` : ''); T(row, 'bc', max ? 'Max' : G.boardCost(b.id) + ' SC'); D(row, 'b', !G.canBoard(b.id)); } })));
    }
  }
  let adIdx = 0, adAt = 0;
  function renderFakeAd() {
    const now = performance.now(); if (now - adAt < 7000 && $('fake-ad').__h) return; adAt = now;
    const a = C.adConcepts[adIdx++ % C.adConcepts.length];
    setHtml($('fake-ad'), `<div class="fa fa-${a.id}"><div class="fa-title">${esc(a.title)}</div><div class="fa-stage"><div class="fa-opt fa-a">${esc(a.a)}</div><div class="fa-hero">${a.hero || '🙋'}</div><div class="fa-opt fa-b">${esc(a.b)}</div></div><div class="fa-cap">😱 FAIL! &nbsp;·&nbsp; <span class="fa-dl">DOWNLOAD NOW</span></div></div>`);
  }

  // ---------- COMMUNITY tab: how the game is perceived ----------
  // 0.1.1: when the rating starts heading down, say why (whatever tab you are on)
  let rateBase = null, rateParts = null, rateToastAt = -1e9;
  const RATE_LABEL = { quality: 'the game is behind what players expect', ads: 'ads in the game', pressure: 'monetization', p2w: 'pay-to-win', videos: 'bad videos', incident: 'an incident', bugs: 'bugs', scandal: 'a scandal' };
  function watchRating() {
    if (!G.has('reputation')) return; const tgt = G.repTarget(), p = G.repParts(), now = performance.now();
    if (rateBase == null || tgt > rateBase) { rateBase = tgt; rateParts = p; return; }
    if (rateBase - tgt >= 6 && now - rateToastAt > 45000) {
      let worst = null, wv = 0; for (const k in RATE_LABEL) { const d = k === 'quality' ? (rateParts[k] - p[k]) : (p[k] - rateParts[k]); if (d > wv) { wv = d; worst = k; } }
      if (worst) { toast(`⭐ Rating heading down (−${repStars(rateBase - tgt)}): mostly <b>${RATE_LABEL[worst]}</b>.`, 'bad'); rateToastAt = now; }
      rateBase = tgt; rateParts = p; }
  }
  function renderCom() {
    const r = R(), p = G.repParts(), tgt = G.repTarget();
    setText($('reply-n'), '+' + repStars(G.replyPower()));
    setText($('trust-n'), G.pct(r.trust)); $('trust-fill').style.width = (100 * r.trust).toFixed(0) + '%'; $('trust-fill').className = r.trust < 0.35 ? 'bad' : r.trust < 0.7 ? 'mid' : 'good';
    setText($('trust-note'), r.trust < 0.35 ? 'Nobody believes you. Ship a game feature patch.' : r.trust < 0.7 ? 'Wearing thin. A patch would help.' : '');
    const st = G.stars(); setText($('stars'), `${starStr(st)} ${st.toFixed(1)}`);
    $('rep-fill').style.width = r.rep + '%'; $('rep-fill').className = r.rep < 30 ? 'bad' : r.rep < 60 ? 'mid' : 'good'; $('rep-target').style.left = tgt + '%';
    const part = (v, label, goodWhenPositive = true) => Math.abs(v) < 0.5 ? '' : ` <span class="${(v > 0) === goodWhenPositive ? 'good' : 'bad'}">${(v > 0) === goodWhenPositive ? '+' : '−'}${repStars(v)} ${label}</span>`;
    setHtml($('rep-parts'), `Heading to <b>${G.stars(tgt).toFixed(1)}★</b>: base ${G.stars(p.base).toFixed(1)}★`
      + part(p.quality, p.quality >= 0 ? 'game quality' : 'game behind expectations') + part(p.replies, 'replies') + part(p.good, 'goodwill') + part(p.bonus, 'decisions')
      + part(-p.ads, 'ads in the game') + part(-p.pressure, 'monetization') + part(-(p.videos || 0), 'bad videos') + part(-(p.incident || 0), 'roadmap leak') + part(-(p.bugs || 0), 'bugs') + part(-p.scandal, p.scandal > 0 ? 'scandal (fading)' : 'good press (fading)'));
    setText($('rep-effects'), `Installs ×${G.repInstallMult().toFixed(2)} · Quitting ×${G.repChurnMult().toFixed(2)} · Streamers ×${Math.pow(st / 3, 2).toFixed(2)}`);
    renderFeed(); renderShowcase();
    const cms = G.has('cms'); show($('cm-wrap'), cms);
    if (cms) { const CM = C.triangle.cm;
      sync($('cm-list'), [{ key: 'cm', html: `<div class="ico">🧑‍💼</div><div class="main"><div class="name">Community Managers <span class="lv" data-f="lv"></span></div><div class="small dim" data-f="i"></div></div><button class="buy" data-act="cm" data-f="b">Hire<b data-f="bc"></b></button>`,
        up: row => { T(row, 'lv', r.cms ? '×' + r.cms : ''); T(row, 'i', `Each one posts ${f(CM.repliesPerSec * 60)} replies a minute for you. Their replies wear thin too.`); T(row, 'bc', $$(G.cmCost())); D(row, 'b', r.cash < G.cmCost()); } }]);
      sync($('goodwill-list'), C.goodwill.filter(g => G.goodwillVisible(g.id)).map(g => ({ key: g.id, html: `<div class="ico">${g.icon}</div><div class="main"><div class="name">${esc(g.name)} <span class="lv" data-f="lv"></span> <span class="tag good" data-f="g"></span></div><div class="small dim">${esc(g.desc)}</div></div><button class="buy" data-act="gw" data-id="${g.id}" data-f="b">Fund<b data-f="bc"></b></button>`,
        up: row => { const lv = r.gw[g.id] || 0, c = G.goodwillCost(g.id); T(row, 'lv', lv ? 'Lv ' + lv : ''); T(row, 'g', lv ? `+${repStars(G.goodwillGain(g.id))}` : ''); T(row, 'bc', $$(c)); D(row, 'b', r.cash < c); } }))); }
    const strm = G.has('streamers'); show($('stream-wrap'), strm); sync($('stream-list'), strm ? channelRows('community') : []);
    renderLive(); renderVod();
    const showSeg = r.stage >= 2; show($('seg-card'), showSeg);
    if (showSeg) { const s = G.segments(); setHtml($('segs'), [['free', 'Free players', 'Watch ads, tell friends, spend nothing.'], ['minnow', 'Minnows', 'Spend $1–$10 now and then.'], ['dolphin', 'Dolphins', 'Spend regularly. Love a Battle Pass.'], ['whale', 'Whales', 'Rare. Buy the $99.99 pack. Twice.']].map(([k, n, d]) => `<div class="segc seg-${k}" title="${d}"><b>${f(s[k])}</b><span>${n}</span><span class="dim">${k === 'free' ? '' : G.pct(G.segShare(k), 2)}</span></div>`).join('')); }
  }
  // ---------- Streamly Live (subathons, drops) and ToobVOD (Alpha 0.0.14) ----------
  function renderLive() {
    const r = R(), on = G.has('live'); show($('live-list'), on);
    sync($('live-list'), !on ? [] : ['subathon', 'drops'].map(k => { const d = C.live[k], rk = k === 'subathon' ? 'sub' : 'drops';
      return { key: k, html: `<div class="ico">${d.icon}</div><div class="main"><div class="name">${esc(d.name)} <span class="tag good" data-f="t"></span></div><div class="small dim" data-f="i"></div><div class="mbar"><i data-f="mb"></i></div></div><button class="buy${d.codeCost ? ' code' : ''}" data-act="live" data-id="${rk}" data-f="b"><span data-f="bn"></span><b data-f="bc"></b><i data-f="bg"></i></button>`,
        up: row => { const live = G.liveOn(rk), left = Math.max(0, r.live[rk] - G.S.time), wait = G.liveReadyIn(rk), c = G.liveCost(rk);
          K(row, 'is-live', live); T(row, 't', live ? '🔴 LIVE ' + Math.ceil(left) + 's' : '');
          T(row, 'i', live ? (k === 'drops' ? `Drop: ${r.live.prize}. Viewers think it is going to be good.` : `Installs ×${(d.boost * Math.max(0.5, G.stars() / 3)).toFixed(1)} right now. Reply to comments: +${d.perReply}s each (up to ${d.maxSecs / 60} min).`) : d.desc);
          fld(row, 'mb').style.width = live ? Math.min(100, 100 * left / (k === 'subathon' ? d.maxSecs : d.secs)).toFixed(1) + '%' : '0%';
          T(row, 'bn', live ? 'Live now' : wait ? 'Again in' : k === 'subathon' ? 'Start' : 'Run drops'); H(row, 'bc', live ? Math.ceil(left) + 's' : wait ? G.fmtTime(wait) : `×${d.boost} ${PL}`);
          T(row, 'bg', live || wait ? '' : '−' + (d.codeCost ? f(c) + ' </>' : $$(c))); D(row, 'b', !G.canLive(rk)); } }; }));
  }
  function renderVod() {
    const r = R(), on = G.has('vod'); show($('vod-wrap'), on); if (!on) return;
    sync($('vod-btns'), C.vod.videos.filter(d => (r.era || 1) >= (d.era || 1)).map(d => ({ key: d.id, html: `<div class="ico">${d.icon}</div><div class="main"><div class="name">${esc(d.name)}</div><div class="small dim">${esc(d.desc)}</div></div><button class="buy${d.codeCost ? ' code' : ''}" data-act="video" data-id="${d.id}" data-f="b"><span data-f="bn"></span><b data-f="bc"></b><i data-f="bg"></i></button>`,
      up: row => { const w = G.videoReadyIn(d.id), c = G.videoCost(d.id), st = G.stars(), good = st >= C.vod.good, bad = st <= C.vod.bad;
        T(row, 'bn', w ? 'Again in' : 'Upload'); T(row, 'bc', w ? G.fmtTime(w) : good ? '👍 good' : bad ? '👎 bad' : '😐 meh'); T(row, 'bg', w ? '' : '−' + (d.codeCost ? f(c) + ' </>' : $$(c))); D(row, 'b', !G.canVideo(d.id)); } })));
    const box = $('vod-list'), vids = r.videos, raw = vids.reduce((a, v) => a + C.vod.repPerReach * v.reach * G.videoWeight(v) * Math.max(0, -G.videoSentiment(v)), 0), cut = raw > 0 ? G.videoRepPenalty() / raw : 1; // the rating hit is capped; split it across videos
    const html = vids.length ? vids.map(v => { const s = G.videoSentiment(v), w = G.videoWeight(v), views = Math.round(w * 100);
      const eff = s > 0.05 ? `<span class="good">+${f(v.base * w * s * G.repInstallMult() * G.installMult())} ${PL}/s</span>` : s < -0.05 ? `<span class="bad">−${repStars(C.vod.repPerReach * v.reach * w * -s * cut)} rating</span>` : '<span class="dim">no effect</span>';
      return `<div class="vid ${s > 0.05 ? 'up' : s < -0.05 ? 'down' : ''}"><div class="thumb">${v.id === 'scam' ? '🚨' : (C.vod.videos.find(x => x.id === v.id) || {}).icon || PLAY_ICO}</div><div class="main"><div class="name">${esc(v.title)}</div><div class="small dim">${s > 0.05 ? '👍' : s < -0.05 ? '👎' : '😐'} ${v.stars.toFixed(1)}★ on upload · ${eff}</div><div class="mbar"><i style="width:${views}%"></i></div></div></div>`; }).join('')
      : '<p class="hint">No videos yet. Post one while your rating is good.</p>';
    setHtml(box, html);
  }
  // ---------- incidents (Alpha 0.0.16): the problem card sits at the top of every tab; full on its own tab, one line on the others ----------
  const TABNAME = { dev: 'Development', fin: 'Finance', com: 'Community' };
  const finName = () => G.has('ads') ? 'Put Ad in Game' : 'Promote the Game';
  const fixLabel = k => ({ code: '<span class="code-ico">&lt;/&gt;</span> Write Code', fin: (G.has('ads') ? '🪧 ' : '📣 ') + finName(), reply: '💬 Respond to Comment', patch: '🩹 Ship a patch' }[k]);
  function placeTop() { // order under the tabs: incident, then the tab's tap button, then the quest and the players card
    const sec = $('tab-' + tab); if (!sec) return;
    const slot = sec.querySelector('.inc-slot'), card = $('inc-card'); if (card.parentNode !== slot) slot.appendChild(card);
    const anchor = sec.querySelector(':scope > .tap-card') || slot, tut = $('tut-card'), hub = $('hub');
    if (anchor.nextElementSibling !== tut) anchor.after(tut);
    if (tut.nextElementSibling !== hub) tut.after(hub);
  }
  function renderIncident() {
    const r = R(), i = r.inc, card = $('inc-card'); show(card, !!i); if (!i) return;
    const d = G.incDef(i.id), here = d.tab === tab, b = d.bomb ? r.bomb : null, need = i.need || d.fix; if (d.bomb && !b) return show(card, false); card.classList.toggle('good', !!d.good);
    card.classList.toggle('mini', !here); card.classList.toggle('fixed', i.done === 'fixed' || i.done === 'defused'); card.classList.toggle('missed', i.done === 'missed'); card.classList.toggle('live', !i.done);
    setText($('inc-ico'), d.icon); setText($('inc-name'), d.name); setText($('inc-kick'), (d.good ? 'Opportunity' : 'Problem') + (here ? ` · ${TABNAME[d.tab]}` : ` on ${TABNAME[d.tab]}`));
    setText($('inc-st'), i.done ? (i.done === 'landed' ? '💥 Landed' : i.done === 'missed' ? 'Missed' : d.good ? '✅ Done' : '✅ Fixed') : b ? `${Math.ceil(G.bombLeft())}s left` : d.good ? `${Math.ceil(Math.max(0, i.until - G.S.time))}s left` : 'Until fixed');
    setText($('inc-reason'), (b ? b.reason : i.reason) + '.');
    setText($('inc-effect'), i.done === 'landed' ? `Rating −${repStars(b.applied)}. It fades over a few minutes.` : i.done === 'missed' ? 'Nothing happened. Another one will come along.' : i.done ? (d.rewardText || 'Back to normal.') + (i.got && i.got.players ? ` +${f(i.got.players)} players.` : '') + (i.got && i.got.cash ? ` +${$$(i.got.cash)}.` : '') + (i.got && i.got.code ? ` +${f(i.got.code)} lines of code.` : '') : b ? 'Your rating falls while it builds, up to −1★ when the timer runs out.' : d.effect);
    setHtml($('inc-how'), i.done ? 'Nothing. Enjoy the quiet while it lasts.' : b ? `Respond to Comment, fast. Each reply counts <b>${G.pct(r.trust)}</b> right now (how much players believe you). A patch restores it.` : esc(d.how.replace('{fin#}', need.fin || '').replace('{fin}', finName()).replace('{code}', need.code || '').replace('{reply}', need.reply || '')) + (d.rewardText && !i.done ? ` <span class="inc-reward">Reward: ${esc(d.rewardText)}</span>` : ''));
    const bar = (lbl, v, cls, txt) => `<div class="inc-bar"><span>${lbl}</span><div class="bar"><i class="${cls}" style="width:${Math.min(100, 100 * v).toFixed(0)}%"></i></div><b>${txt}</b></div>`;
    setHtml($('inc-bars'), b ? bar('💣 Damage', b.applied / b.hit, 'bad', '') + bar('🛡️ Defused', b.def / b.need, 'good', '') : Object.keys(need).map(k => { const p = i.done === 'fixed' ? need[k] : i.prog[k] || 0; return bar(fixLabel(k), p / need[k], 'good', `${p}/${need[k]}`); }).join(''));
    const go = $('inc-go'); show(go, !here && !i.done); if (!here) { go.dataset.tab = d.tab; setText(go, `Go to ${TABNAME[d.tab]} ▶`); }
  }
  const segName = s => ({ all: 'everyone', minnow: 'minnows', dolphin: 'dolphins', whale: 'whales' }[s]);
  // ---------- PASS tab ----------
  function renderPass() {
    if (!G.has('pass')) return;
    const b = R().bp, P = C.pass, done = G.seasonDone();
    setText($('bp-title'), `Season ${b.season}${b.done ? ` · ${b.done} complete` : ''}`);
    setText($('bp-rate'), `+${f(G.bpXpPerSec())} XP/s from people playing`);
    setText($('bp-level'), `Level ${b.level} / ${P.levels}`); setText($('bp-xp'), done ? 'Season complete!' : `${f(b.xp)} / ${f(G.bpNeed())} XP`);
    $('bp-bar').style.width = done ? '100%' : (100 * b.xp / G.bpNeed()) + '%';
    const un = G.unclaimedCount(); $('bp-claim').disabled = !un; setText($('bp-claim'), un ? `Claim all (${un})` : 'Nothing to claim');
    show($('bp-season'), done);
    setText($('bp-bonus'), `Season trophies: +${G.pct(P.seasonBonus * b.done)} Revenue · Pass bonuses claimed: +${G.pct(P.levelBonus * b.claims)} Revenue (this game).${b.manager ? ' The Battle Pass Manager claims everything for you.' : ''}`);
    // track grid
    const lanes = P.lanes.filter(l => b.lanes[l.id]), key = b.season + ':' + lanes.map(l => l.id).join(',');
    const tr = $('bp-track');
    if (tr.__k !== key) { tr.__k = key;
      let h = `<div class="tr-row tr-head"><div class="tr-lane"></div>${Array.from({ length: P.levels }, (_, i) => `<div class="tr-lv" data-lv="${i + 1}">${i + 1}</div>`).join('')}</div>`;
      for (const l of lanes) { h += `<div class="tr-row"><div class="tr-lane" style="--lc:${l.color}">${esc(l.name)}</div>`;
        for (let L = 1; L <= P.levels; L++) { const rw = G.bpReward(b.season, l.id, L); h += `<button class="cell" style="--lc:${l.color}" data-act="claim" data-lane="${l.id}" data-l="${L}" title="${esc(rw.label)}"><span class="ci">${rw.icon}</span><span class="cl">${rw.n ? f(rw.n) + ' ' : ''}${esc(rw.kind === 'chest' ? 'Chest' : rw.label)}</span></button>`; }
        h += '</div>'; }
      tr.innerHTML = h; tr.__cells = tr.querySelectorAll('.cell'); tr.__lvs = tr.querySelectorAll('.tr-lv'); }
    tr.__lvs.forEach(e => e.classList.toggle('reached', +e.dataset.lv <= b.level));
    tr.__cells.forEach(c => { const L = +c.dataset.l, cl = G.bpClaimed(c.dataset.lane, L); c.classList.toggle('claimed', cl); c.classList.toggle('ready', !cl && L <= b.level); c.classList.toggle('future', L > b.level); });
    const lr = []; for (const l of P.lanes.slice(1)) { if (!G.laneVisible(l.id) && !b.lanes[l.id]) { lr.push({ key: 'lk-' + l.id, cls: 'locked', html: `<div class="ico">🔒</div><div class="main"><div class="name">${esc(l.name)}</div><div class="small dim">Launch the tier before it first.</div></div>` }); break; }
      lr.push({ key: l.id, html: `<div class="ico lane-dot" style="--lc:${l.color}">🎫</div><div class="main"><div class="name">${esc(l.name)} Pass</div><div class="small dim" data-f="i"></div></div><button class="buy" data-act="lane" data-id="${l.id}" data-f="b"><span data-f="bn">Launch</span><b data-f="bc"></b></button>`,
        up: row => { const on = !!b.lanes[l.id], busy = G.inProgress('lane', l.id), pj = busy && R().projects.find(p => p.kind === 'lane' && p.id === l.id); T(row, 'i', on ? 'Live. Your players are buying it as we speak.' : busy ? 'The team is designing it. See the Dev Board.' : 'Battle Pass revenue ×1.5 and a new reward lane. Takes a dev team a little while.'); T(row, 'bn', on ? 'Launched' : busy ? 'In design' : 'Launch'); T(row, 'bc', on ? '' : busy ? G.fmtTime(G.projectLeft(pj)) + ' left' : $$(G.laneCost(l.id))); D(row, 'b', on || busy || !G.canLaunchLane(l.id)); K(row, 'owned', on); } }); }
    sync($('lane-list'), lr);
    const x = [
      ['bpp', '🎟️', 'Battle Pass Pass', 'Earn Battle Pass Pass XP by claiming Battle Pass rewards. Each Battle Pass Pass level: +15% Battle Pass XP.', P.bppCost],
      ['bppPlus', '🎟️✨', 'Battle Pass Pass Plus', 'Double Battle Pass Pass XP. Needs the Battle Pass Pass.', P.bppPlusCost],
      ['manager', '🤵', 'Battle Pass Manager', 'Automatically completes your Battle Pass: claims every reward and starts every season.', P.managerCost],
    ].map(([k, i, n, d, cost]) => ({ key: k, html: `<div class="ico">${i}</div><div class="main"><div class="name">${n} <span class="lv" data-f="lv"></span></div><div class="small dim">${d}</div><div class="mbar" data-f="mbw"><i data-f="mb"></i></div></div><button class="buy" data-act="bpx" data-id="${k}" data-f="b"><span data-f="bn">Buy</span><b data-f="bc"></b></button>`,
      up: row => { const on = !!b[k]; T(row, 'bn', on ? 'Owned' : 'Buy'); T(row, 'bc', on ? '' : $$(cost)); D(row, 'b', on || R().cash < cost || (k === 'bppPlus' && !b.bpp)); K(row, 'owned', on);
        if (k === 'bpp') { const pg = G.bppProgress(); T(row, 'lv', on ? `Lv ${pg.level}` : ''); fld(row, 'mbw').style.display = on ? '' : 'none'; fld(row, 'mb').style.width = (100 * pg.have / pg.need) + '%'; } else fld(row, 'mbw').style.display = 'none'; } }));
    sync($('bpx-list'), x);
  }

  // ---------- SHOP tab ----------
  function renderShop() {
    const m = M(), r = R();
    show($('daily-card'), G.has('daily'));
    if (G.has('daily')) {
      const nd = G.dailyNextDay(), ready = G.dailyReady(), cur = ready ? nd.day : ((m.daily.streak - 1) % 7) + 1, mult = G.dailyMult();
      setHtml($('cal'), C.daily.rewards.map((n, i) => { const d = i + 1, chest = d === C.daily.chestDay, st = ready ? (d < cur ? 'got' : d === cur ? 'today' : '') : (d <= cur ? 'got' : '');
        return `<div class="day ${st} ${chest ? 'chestday' : ''}"><span class="dn">Day ${d}</span><span class="dr">${chest ? '🧰' : '🪙'}</span><span class="dv">${chest ? 'LEGEND­ARY' : f(n * mult) + ' Coin' + (n * mult === 1 ? '' : 's')}</span></div>`; }).join(''));
      setText($('daily-streak'), m.daily.streak ? `Streak: ${m.daily.streak} day${m.daily.streak === 1 ? '' : 's'}` : '');
      $('daily-claim').disabled = !ready; setText($('daily-claim'), ready ? `Claim Day ${nd.day}` : 'Come back tomorrow');
    }
    const off = G.has('offers'); show($('offers-head'), off); show($('offers-hint'), off);
    if (off) sync($('offer-list'), r.offers.map((o, i) => ({ key: o.name + ':' + i + ':' + Math.round(o.until), cls: 'offer', html: `<div class="o-ribbon">${o.value}% VALUE!</div><div class="o-name">${esc(o.name)}</div><div class="o-price"><s>$${o.was.toFixed(2)}</s> <b>$${o.now.toFixed(2)}</b></div><div class="o-stock">ONLY ${o.stock} REMAINING</div><div class="o-timer">ENDS IN <b data-f="t"></b></div><button class="buy primary" data-act="offer" data-i="${i}" data-f="b"><span data-f="bn"></span></button>`,
      up: row => { T(row, 't', G.clock(o.until - S().time)); const v = G.offerValue(o); T(row, 'bn', o.sold ? 'SOLD OUT' : `Run offer · +${$$(v)}${o.gems ? ` +${o.gems}💎` : ''}`); D(row, 'b', o.sold); K(row, 'sold', o.sold); } })));
    else sync($('offer-list'), []);
    const cur = G.has('currencies'); show($('boost-head'), cur); show($('xch-head'), cur); show($('xch-hint'), cur);
    sync($('boost-list'), cur ? C.boosters.map(b => ({ key: b.id, html: `<div class="ico">${b.icon}</div><div class="main"><div class="name">${esc(b.name)} <span class="tag good" data-f="a"></span></div><div class="small dim">${esc(b.desc)}</div></div><button class="buy gem" data-act="boost" data-id="${b.id}" data-f="b">${b.gems} 💎</button>`,
      up: row => { const a = G.boostActive(b.id); T(row, 'a', a > 0 ? 'active ' + G.fmtTime(a) : ''); D(row, 'b', m.cur.gems < b.gems); } })) : []);
    sync($('xch-list'), cur ? C.exchange.map((x, i) => { const a = C.currencies[x.from], b = C.currencies[x.to]; return { key: 'x' + i, cls: 'xrow' + (a.joke || b.joke ? ' joke' : ''), html: `<div class="main"><div class="name">${f(x.give)} ${a.icon} ${a.name} → ${f(x.get)} ${b.icon} ${b.name}</div>${x.note ? `<div class="small dim">${esc(x.note)}</div>` : ''}</div><div class="btn-col-h"><button class="buy sm" data-act="xch" data-i="${i}" data-n="1" data-f="b1">×1</button><button class="buy sm" data-act="xch" data-i="${i}" data-n="max" data-f="bm">Max</button></div>`,
      up: row => { const ok = (m.cur[x.from] || 0) >= x.give; D(row, 'b1', !ok); D(row, 'bm', !ok); K(row, 'hidden', a.joke && !(m.cur[x.from] > 0) && clutter() < 4); } }; }) : []);
    const lb = G.has('lootbox'); show($('loot-card'), lb);
    if (lb) { const c = G.boxCost(); setText($('loot-open'), `Open · ${c} 🔮`); $('loot-open').disabled = m.cur.crystals < c;
      setHtml($('coll'), C.cosmetics.map(c => { const own = !!m.cosmetics[c.id]; return `<div class="cos ${own ? 'own' : ''} rar-${c.rar}" title="${esc(c.name)} — ${c.rar} · +${G.pct(c.per)} ${effName(c.eff)}">${own ? c.icon : '❔'}</div>`; }).join('')); }
    const vip = G.has('vip'); show($('vip-card'), vip);
    if (vip) { setText($('vip-n'), m.vip); setText($('vip-buy'), `Buy VIP ${m.vip + 1} · ${f(G.vipCost())} 💿`); $('vip-buy').disabled = m.cur.platinum < G.vipCost();
      setText($('vip-next'), `VIP ${m.vip + 1}: ${G.vipPerk(m.vip + 1)}`); setText($('vip-now'), `Now: +${G.pct(C.vip.rev * m.vip)} Revenue, +${G.pct(C.vip.whale * m.vip)} whale sightings${m.vip >= C.vip.autoWhaleAt ? ', whales always pay in full' : ''}${m.vip >= C.vip.bpxpAt ? ', Battle Pass XP ×1.25' : ''}${m.vip >= C.vip.autoPopupAt ? ', popups claim themselves' : ''}. VIP survives sequels.`); }
  }
  const effName = k => ({ rev: 'Revenue', inst: 'Installs', eng: 'Engagement', bpxp: 'Battle Pass XP', whale: 'whale sightings', code: 'Developer Code', codeTap: 'Code per tap', adTap: 'ad money', reply: 'reply power', quality: 'Quality', ad: 'ad money' }[k] || k);

  // ---------- STATS tab ----------
  const DASH = [
    ['Players', () => f(R().players), 'Everyone playing right now. The number the whole company is built around.', () => true],
    ['Revenue', () => $$(G.revenuePerSec()) + '/s', 'Money coming in right now, from sales, ads and the shop.', () => true],
    ['ARPDAU', () => $$(G.revenuePerSec() * 86400 / Math.max(1, R().players)), 'Average Revenue Per Daily Active User: a day of revenue divided by players. How much one player is "worth" per day.', () => true],
    ['Rating', () => G.stars().toFixed(2) + ' ★', 'Your store rating. Sets how many people install and how many quit.', () => G.has('reputation')],
    ['Quality', () => f(G.quality()) + ' vs ' + f(G.expectations()), 'How good the game is, against what your players expect. Expectations rise with every player.', () => G.has('gamefeatures')],
    ['Churn', () => (G.churnRate() * 6000).toFixed(2) + '%/min', 'The share of players who quit each minute. Rating and the Battle Pass bring it down.', () => true],
    ['Whales landed', () => f(M().stats.whales), 'Whale purchases you have caught, ever.', () => G.has('whales')],
  ];
  function renderStats() {
    sync($('dash'), DASH.filter(d => d[3]()).map(([n, v, tip]) => ({ key: n, cls: 'tile', html: `<button class="tile-btn" data-act="tip" data-tip="${esc(tip)}" data-name="${esc(n)}"><span class="tn">${esc(n)}</span><b data-f="v"></b></button>`, up: row => T(row, 'v', v()) })));
    const got = M().achievements; setText($('ach-n'), `${Object.keys(got).length} / ${C.achievements.length} · +${G.pct(C.achievementBonus * Object.keys(got).length)} Revenue`);
    setHtml($('ach-list'), C.achievements.map(a => `<div class="ach ${got[a.id] ? 'got' : ''}"><b>${got[a.id] ? '🏆' : '🔒'} ${esc(a.name)}</b><span class="small dim">${esc(a.desc)}</span></div>`).join(''));
    const m = M(); setHtml($('lifetime'), `Lifetime revenue ${$$(m.lifetime)} · Games launched ${m.sequel} · Whales ${f(m.stats.whales)} · Offers run ${f(Object.values(m.stats.offerRuns).reduce((a, b) => a + b, 0))} · Loot boxes ${f(m.stats.boxes)} · Review bombs ${f(m.stats.bombs || 0)} · Lines of code ${f(m.stats.taps)} · Ads placed ${f(m.stats.adTaps || 0)} · Replies ${f(m.stats.replies || 0)} · Patches ${f(m.stats.patches || 0)} · Seasons ${f(m.stats.seasons)}`);
  }

  // ---------- overlays: event banner, popups, whale ----------
  function renderEvent() {
    const ev = R().event, box = $('event-banner'); show(box, !!ev); if (!ev) { box.__k = ''; return; }
    const e = G.eventDef(ev.id), k = ev.id + ':' + ev.at + ':' + ev.resolved;
    if (box.__k !== k) { box.__k = k;
      const btns = ev.resolved ? '<span class="small">Handled.</span>' : e.choices ? e.choices.map(c => `<button class="sm" data-act="evc" data-c="${c.id}" title="${esc(c.text)}">${esc(c.label)}</button>`).join('') : e.choice ? `<button class="sm" data-act="evc" title="${esc(e.choice.text)}">${esc(e.choice.label)}${e.choice.costSecs ? ' · <span data-f="ec"></span>' : ''}</button>` : '';
      box.className = 'event-banner ' + (/(reddit|outage|lawsuit)/.test(e.id) ? 'ev-bad' : 'ev-good');
      box.innerHTML = `<span class="ev-ico">${e.icon}</span><div class="ev-main"><b>${esc(e.name)}</b><span class="small">${esc(e.text)}${e.choice && !ev.resolved ? ' ' + esc(e.choice.text) : ''}</span></div><span class="ev-t small" data-f="t"></span><div class="ev-btns">${btns}</div>`; }
    setText(box.querySelector('[data-f=t]'), ev.until - S().time > 0 ? Math.ceil(ev.until - S().time) + 's' : '');
    const ec = box.querySelector('[data-f=ec]'); if (ec) setText(ec, $$(e.choice.costSecs * G.revenuePerSec()));
  }
  function renderPopups() {
    const tray = $('popup-tray'), ps = R().popups;
    sync(tray, ps.map(p => ({ key: 'p' + p.id, cls: 'popup', html: `<button class="pop-btn" data-act="popup" data-id="${p.id}"><b>${esc(p.title)}</b><span class="small">Tap to claim 🎁</span><span class="pop-life"><i data-f="l"></i></span></button>`, up: row => { fld(row, 'l').style.width = Math.max(0, 100 * (p.until - S().time) / C.popups.life) + '%'; } })));
  }
  function renderWhale() {
    const w = R().whale, layer = $('whale-layer');
    if (!w) { if (layer.__k) { layer.innerHTML = ''; layer.__k = ''; } return; }
    const k = w.kind + ':' + w.until; if (layer.__k === k) return; layer.__k = k;
    const kd = C.whale.kinds.find(x => x.id === w.kind), icon = { whale: '🐋', mega: '🐋', levi: '🐉' }[w.kind];
    layer.innerHTML = `<button class="whale whale-${w.kind}" data-act="whale" style="animation-duration:${C.whale.swimSecs}s" aria-label="Catch the ${kd.name}"><span class="w-ico">${icon}</span><span class="w-tag">${esc(kd.name)}! Tap it</span></button>`;
  }

  // "Show me": switch tab, wait for it to draw, scroll the target clear of the sticky header and pulse it.
  // When the target doesn't exist yet (e.g. the Battle Pass epic before earlier epics ship), explain why.
  const SHOW_FALLBACK = { dev: '#code-btn', fin: '#price-card', com: '#reply-btn', pass: '#bp-claim', shop: '#tab-fin' };
  function showMe(st = G.tutStep()) {
    if (!st) return false;
    setTab(st.tab);
    return new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => {
      render(true);
      let t = [...document.querySelectorAll(st.target)].find(e => e.offsetParent), missing = false;
      if (!t) { missing = true; t = document.querySelector(SHOW_FALLBACK[st.tab]); }
      if (t) {
        const head = document.querySelector('.sticky-head').getBoundingClientRect().height, r = t.getBoundingClientRect();
        const y = r.top + window.scrollY - head - Math.max(12, (window.innerHeight - head - r.height) / 2);
        window.scrollTo({ top: Math.max(0, y), behavior: 'auto' });
        t.classList.remove('tut-pulse'); void t.offsetWidth; t.classList.add('tut-pulse'); setTimeout(() => t.classList.remove('tut-pulse'), 1600);
      }
      if (missing) toast(st.goal === 'ft:bpass' ? 'The Battle Pass epic appears once the epics before it have shipped. Keep creating epics down this list.' : /^(gf:|ft:)/.test(st.goal) ? 'Not available yet: earlier steps unlock it. Keep playing.' : st.goal === 'devs' ? 'Developers unlock after a few ads. Put more ads in the game first.' : st.goal === 'stage' || st.goal === 'players' ? 'Keep growing: this quest finishes when your player count gets there.' : st.goal === 'bombs' ? 'No review bomb right now. One will come. They always do.' : st.goal === 'whales' ? 'No whale right now. Watch the water.' : 'That button isn\'t available yet. Keep playing; it will appear here.');
      res(!!t && !missing);
    })));
  }

  // ---------- tutorial card (Alpha 0.2.0) ----------
  let glowSel = '';
  function renderTutorial() {
    const st = G.tutStep(), card = $('tut-card'); show(card, !!st); show($('tut-skip-row'), !!st);
    if (!st) { if (glowSel) { document.querySelectorAll('.tut-glow').forEach(e => e.classList.remove('tut-glow')); glowSel = ''; } return; }
    const i = M().tut || 0, g = G.tutGoal(st);
    const nT = C.tutorial.filter(x => !x.ms).length, msAll = C.tutorial.filter(x => x.ms === st.ms).length; setText($('tut-kicker'), st.ms ? `Milestones · ${G.eraDef(st.ms).name} · ${msAll - G.msLeft(st.ms).length} of ${msAll} done` : `Quest ${i + 1} of ${nT}`); card.classList.toggle('ms', !!st.ms); setText($('tut-title'), st.title); setText($('tut-text'), st.text);
    $('tut-bar').style.width = (100 * g.have / g.need) + '%'; card.classList.toggle('done', !!g.done);
    if (g.done) setText($('tut-count'), '✓ Done!'); else setText($('tut-count'), st.goal === 'stage' ? `${f(R().peak)} / ${f(C.stages[st.need - 1].need)} players` : st.goal === 'stars' ? `${G.stars().toFixed(1)} / ${st.need}★` : st.goal === 'rps' ? `${$$(G.revenuePerSec())} / ${$$(st.need)} a second` : st.goal === 'bugsUnder' ? `Bugs: ${G.pct(G.bugRatio())} of the game (under ${st.need}%)` : st.goal === 'era' ? (G.canRelaunch() ? 'Ready: tap Announce on the players card' : `Unlocks at ${f(G.eraDef().next)} players`) : g.label ? g.label : `${f(g.have)} / ${f(g.need)}`);
    setText($('tut-unlocks'), st.unlocks ? `Unlocks: ${st.unlocks}` : '');
    setText($('tut-go'), st.name ? 'Name it' : 'Show me');
    show($('tut-go'), true);
    // glow on the thing to press (only on the tab it lives on)
    document.querySelectorAll('.tut-glow').forEach(e => { if (!e.matches(st.target)) e.classList.remove('tut-glow'); });
    if (st.tab === tab) document.querySelectorAll(st.target).forEach(e => { if (e.offsetParent) e.classList.add('tut-glow'); });
    glowSel = st.target;
  }

  // ---------- events from the engine ----------
  function drain() {
    for (const e of G.drainEvents()) {
      if (e.who === 'stage') { const s = STAGE_STORY[e.stage]; if (s && !S().settings.story['stage' + e.stage]) { S().settings.story['stage' + e.stage] = 1; story(`Stage ${e.stage} · ${G.stageDef(e.stage).name}`, s[0], s[1].replace('{CO}', esc(G.studioName(e.stage))), s[2]); } else toast(`You are now a <b>${G.stageDef(e.stage).name}</b>`, 'good'); beep('big'); }
      else if (e.who === 'develop') { toast(`🚀 Shipped <b>${esc(G.featureName(e.id))}</b>. Order a sprint to put it live.<br><span class="small dim">Retro: ${esc(pickOf(C.projects.retro))}</span>`, 'good'); post(pickOf(FC.ship).replace('{feature}', G.featureName(e.id))); beep('big'); }
      else if (e.who === 'patch') { if (Math.random() < 0.25) post(pickOf(FC.code), 'good'); }
      else if (e.who === 'price') { const L = C.price.ladder; if (e.was < 0) { toast(`🏷️ On the store at <b>${L[e.i].label}</b>. The first players are buying it.`, 'good'); post('just bought this. $' + L[e.i].p + ', let\'s see'); } else if (e.i > e.was) { toast(`Price raised to <b>${L[e.i].label}</b>. Players who paid less noticed.`, 'bad'); post(pickOf(['price went UP?? after I bought it', 'raised the price. in this economy', 'glad I bought it before the price hike']), 'bad'); } else toast(`Price cut to <b>${L[e.i].label}</b>.`); beep('buy'); }
      else if (e.who === 'f2p') { story('Free-to-Play Relaunch', 'Everyone can play now.', `<b>${esc(G.gameTitle())}</b> is free. Everyone who sees it installs it, and nobody pays for it.<br><br>Ads stop costing double: nobody paid, so nobody feels robbed. And the <b>Cash Shop</b> opens: skins, a Battle Pass, Gems. This is where the real money is. The tutorial is over; the board expects growth forever.`, 'Open the shop ▶'); post(pickOf(['IT\'S FREE NOW', 'free?? where\'s the catch', 'I paid $' + (C.price.ladder[0].p) + ' for this last week']), ''); beep('big'); }
      else if (e.who === 'bomb') { toast(`💣 <b>Review bomb!</b> ${esc(e.reason)}. Reply on the Community tab before it lands.`, 'bad'); post(pickOf(C.feed.bad), 'bad'); post(pickOf(C.feed.bad), 'bad'); beep('bad'); }
      else if (e.who === 'bombDone') { if (e.defused) { toast('✅ Review bomb defused. "We hear you" worked, this time.', 'good'); beep('coin'); } else { toast('💥 The review bomb landed. It will fade in a few minutes.', 'bad'); } }
      else if (e.who === 'p2w') { const ft = C.features.find(x => x.id === e.id); post(pickOf(['so it\'s pay to win now', `${ft.name}?? really??`, 'my 9 year old nephew is now better than me', 'uninstalling (I will reinstall)']), 'bad'); }
      else if (e.who === 'named') { toast(`🏢 Welcome to <b>${esc(e.name)}</b>.`, 'good'); post(pickOf(['who is ' + e.name + ' and why do they want $' + C.price.ladder[0].p, e.name + '? never heard of them. downloading', 'new studio, same bugs']), ''); beep('big'); }
      else if (e.who === 'sale') saleFx(e);
      else if (e.who === 'era') { const t = ERA_STORY[e.era]; if (t) story(`Era ${e.era} · ${G.eraDef(e.era).name}`, t[0], `<b>${esc(G.gameTitle())}</b>. ` + t[1], t[2]); post(pickOf(['I bought the single-player game. why does it need wifi', 'this is not the game I bought', 'finally, I can play with my friend (he quit)', 'they changed it, so now it sucks']), 'bad'); beep('big'); }
      else if (e.who === 'incMissed') { const d = G.incDef(e.id); toast(`${d.icon} The moment passed: <b>${esc(d.name)}</b>.`); }
      else if (e.who === 'sale0') { toast(`🏷️ <b>${Math.round(e.off * 100)}% off</b> for ${G.fmtTime(e.secs)}. The store put a red banner on it.`, 'gold'); if (G.has('community')) post(pickOf(['ON SALE, buying now', 'I paid full price last week. cool. cool cool cool', 'wishlisted it for exactly this', 'is it worth it at this price? (it is the same game)']), ''); }
      else if (e.who === 'saleEnd') { toast('🏷️ The sale is over. Back to full price.'); if (G.has('community')) post(pickOf(['missed the sale, I will wait for the next one', 'full price again? I can wait']), ''); }
      else if (e.who === 'inc') { const d = G.incDef(e.id); toast(`${d.icon} <b>${esc(d.name)}</b>${d.tab === tab ? '' : ' on ' + TABNAME[d.tab]}<br><span class="small">${esc(e.reason)}.</span>`, e.good ? 'good' : 'bad'); beep(e.good ? 'coin' : 'bad'); if (!e.good && G.has('community') && Math.random() < 0.6) post(pickOf(['is it just me or is the game broken', 'devs pls', 'day 1 of asking them to fix it', 'every time I log in something is on fire']), 'bad'); }
      else if (e.who === 'incDone') { const d = G.incDef(e.id); toast(`✅ ${d.good ? 'Made the most of it' : 'Fixed'}: <b>${esc(d.name)}</b>. ${esc(d.rewardText || '')}`, 'good'); beep('coin'); }
      else if (e.who === 'live') { if (e.k === 'sub') { toast('⏱️ <b>Subathon!</b> Reply to comments to keep the stream going.', 'good'); post(pickOf(['SUBATHON LETS GOOO', 'timer says 2 min, chat says forever', 'he has not slept. neither have I', 'gifting 5 subs if the dev replies']), 'good'); } else { toast(`🎁 <b>Streamly Drops</b> are live. Viewers are watching for… a mystery item.`, 'good'); post(pickOf(['watching 2 hours for the drop', 'what is the drop?? nobody knows', 'I have 4 tabs open for drops']), ''); } }
      else if (e.who === 'dropsEnd') { toast(`🎁 The drop was <b>${esc(e.prize)}</b>. Players are not thrilled.`, 'bad'); post(pickOf([`I watched 2 hours for ${e.prize}`, `${e.prize}. ${e.prize}!!`, 'never again (see you next drops)']), 'bad'); }
      else if (e.who === 'video') { const v = e.v, s = G.videoSentiment(v); if (v.id === 'scam') { toast(`${PLAY_ICO} New ToobVOD video: <b>${esc(v.title)}</b>`, 'bad'); post('did you see the video?? ' + v.title, 'bad'); beep('bad'); } else { toast(`${PLAY_ICO} Uploaded: <b>${esc(v.title)}</b><br><span class="small">${s > 0.05 ? '👍 The comments like it.' : s < -0.05 ? '👎 The comments are brutal. It stays up.' : '😐 Mixed comments.'}</span>`, s < -0.05 ? 'bad' : 'good'); beep(s < -0.05 ? 'bad' : 'coin'); } }
      else if (e.who === 'acct') { const rw = e.runway; story('Memo from Accounting', 'We need to talk about money.', `${rw === Infinity ? 'Good news: you are not losing money. Bad news: you are barely making any.' : `At this rate, ${esc(G.studioName())} is out of money in <b>${G.fmtTime(rw)}</b>.`}<br><br>Copy sales pay once. Salaries are forever. Every successful studio has the same answer: <b>DLC</b>. The players who already own the game pay again.<br><br>Cut the last chapter. Sell it as Chapter 4.`, 'Build the DLC ▶'); }
      else if (e.who === 'upgrade') toast(`✅ Approved: <b>${esc(C.upgrades.find(u => u.id === e.id).name)}</b>`);
      else if (e.who === 'whale') { beep('coin'); }
      else if (e.who === 'whaleCaught') { if (Math.random() < 0.5) post(pickOf(FC.whale)); const kd = C.whale.kinds.find(x => x.id === e.kind); toast(e.auto ? `A ${kd.name} bought something while you weren't looking: +${$$(e.gain)}` : `🐋 <b>${esc(kd.pack)}</b><br>+${$$(e.gain)}`, 'gold'); beep('big'); }
      else if (e.who === 'offer') { toast(`Ran <b>${esc(e.name)}</b>: +${$$(e.gain)}${e.gems ? ` +${e.gems} 💎` : ''}`, 'gold'); beep('coin'); }
      else if (e.who === 'ach') { const a = C.achievements.find(x => x.id === e.id); toast(`🏆 <b>${esc(a.name)}</b><br><span class="small">${esc(a.desc)} · +${G.pct(C.achievementBonus)} Revenue</span>`, 'gold'); beep('big'); }
      else if (e.who === 'claimAll' && !R().bp.manager) toast(`Claimed ${e.n} rewards`);
      else if (e.who === 'season' && !R().bp.manager) toast(`Season ${e.season} begins. It is the same as Season ${e.season - 1}, but with a new number.`, 'good');
      else if (e.who === 'vip') toast(`👑 VIP ${e.vip}! ${esc(G.vipPerk(e.vip))}`, 'gold');
      else if (e.who === 'lane') toast(`Launched the <b>${esc(C.pass.lanes.find(l => l.id === e.id).name)} Pass</b>`, 'good');
      else if (e.who === 'skip') toast(`Skipped 10 minutes: +${$$(e.gain)}`, 'gold');
      else if (e.who === 'event') { const d = G.eventDef(e.id); if (e.id === 'influencer') post(pickOf(FC.stream), 'good'); if (/(reddit|outage|lawsuit)/.test(e.id)) beep('bad'); else beep('coin'); if (e.id === 'acq' || d.choice) {} }
      else if (e.who === 'tut') {
        if (e.skipped) toast('Tutorial skipped. Everything that your company has reached is unlocked.', 'good');
        else toast(`✅ <b>${esc(e.step.title)}</b>${e.step.unlocks ? ` · Unlocked: ${esc(e.step.unlocks)}` : ''}${e.next ? `<br><span class="small">Next: ${esc(e.next.title)}</span>` : ''}`, 'good');
        beep('big'); }
      else if (e.who === 'ms') { toast(`🏁 Milestone: <b>${esc(e.step.title)}</b><br><span class="small">${e.left ? `${e.left} more in ${esc(G.eraDef(e.step.ms).name)}` : `Every ${esc(G.eraDef(e.step.ms).name)} milestone done`}</span>`, 'gold'); beep('big');
        if (!G.tutStep()) story('Every milestone done', 'You won the game.', 'A hundred million players, on phones. The game is free, the shop is full, and the reviews are a choice. The board expects growth anyway. Keep making sequels.', 'Back to work ▶'); }
      else if (e.who === 'launch') { const ft = C.features.find(x => x.id === e.id); toast(`📦 <b>${esc(ft.name)}</b> launched: ${f(e.copies)} sold on day one. +${$$(e.gain)}`, 'gold'); burstAtHub(); beep('coin'); }
      else if (e.who === 'sequel') { post(pickOf(FC.sequel), 'bad'); story('MEMO · All Staff', 'Some changes to our team', `We are incredibly proud of what this team accomplished. ${esc(G.gameTitle(M().sequel - 1))} exceeded every expectation. Effective today, all ${f(e.laidOff)} of you are let go.<br><br>Please return your badge, your laptop and your dreams to HR by 5 PM.<br><br>In unrelated news, we are thrilled to announce <b>${esc(G.gameTitle())}</b>. The board added <b>${e.gain} Shareholder Confidence</b> (+${G.pct(C.sequel.perSC * e.gain)} money and code, +${G.pct(C.sequel.perSCInst * e.gain)} installs, forever). Hiring starts Monday.`, 'Start hiring ▶'); }
      else if (e.who === 'project') { if (e.kind === 'epic') toast(`🧩 Epic created: <b>${esc(G.featureName(e.id))}</b>. The team is on it.`); else if (e.kind === 'lane') toast(`🎫 The team is designing the <b>${esc(C.pass.lanes.find(l => l.id === e.id).name)} Pass</b>.`); }
      else if (e.who === 'pizza') { toast('🍕 Pizza party! The team ships ×2 as fast for 60 seconds. Raises remain under review.', 'gold'); }
      else if (e.who === 'pander') { const d = C.pander.find(x => x.id === e.id); toast(`📣 Announced: <b>${esc(d.name)}</b>`, 'gold'); const L = FC.pander[e.id]; if (L) post(pickOf(L), /mobile|p2w|crossplay/.test(e.id) ? 'bad' : 'good'); beep('coin'); }
      else if (e.who === 'backlash') { toast(`💥 ${esc(e.text)}`, 'bad'); post(pickOf(FC.backlash) + ' ' + (e.id === 'nomtx' ? '"no microtransactions, ever"' : '"year-one roadmap"'), 'bad'); beep('bad'); }
    }
  }

  // ---------- copy sales (Alpha 0.0.7): each sale pops its price, batched so a busy store doesn't flood the screen ----------
  let saleBatch = null;
  function saleFx(e) {
    if (!saleBatch) { saleBatch = { n: 0, gain: 0 }; setTimeout(() => { const b = saleBatch; saleBatch = null; const h = $('hub').getBoundingClientRect();
      floatText(h.left + 24 + Math.random() * Math.max(10, h.width - 140), h.top + 10, b.n > 1 ? `+${$$(b.gain)} · ${b.n} sold` : `+${$$(b.gain)} · sold!`, 'salefloat'); if (b.n === 1 || Math.random() < 0.3) beep('coin'); }, 350); }
    saleBatch.n += e.n; saleBatch.gain += e.gain;
  }

  // ---------- studio name (Alpha 0.0.5) ----------
  function namePreview() { const v = $('studio-input').value.trim() || C.studio.fallback; setHtml($('name-preview'), `At 10,000 players: <b>${esc(v)} LLC</b>`); }
  function openName() {
    show($('settings'), false); $('studio-input').value = M().studio || '';
    const ideas = [...C.studio.ideas].sort(() => Math.random() - 0.5).slice(0, 4);
    $('name-ideas').innerHTML = ideas.map(x => `<button type="button" class="idea">${esc(x)}</button>`).join('');
    $('name-ideas').querySelectorAll('.idea').forEach(b => b.addEventListener('click', () => { $('studio-input').value = b.textContent; namePreview(); }));
    namePreview(); show($('name-modal'), true); setTimeout(() => $('studio-input').focus(), 50);
  }

  // ---------- welcome back ----------
  function showWelcomeBack(d) {
    setText($('wb-title'), `You were away for ${G.fmtTime(d.awaySeconds)}.`);
    setText($('wb-joke'), ['Your players were not.', 'The monetization never sleeps.', 'Your Battle Pass kept passing.', 'The whales kept swimming.'][Math.floor(Math.random() * 4)]);
    const items = [[PL, 'Players gained', (d.players >= 0 ? '+' : '') + f(d.players)], ['💵', 'Revenue earned', '+' + $$(d.revenue)], ['<span class="code-ico">&lt;/&gt;</span>', 'Lines of code written by your developers', '+' + f(d.code || 0)], ['📺', 'Ads watched', f(d.ads)], ['🐋', 'Whales acquired', f(d.whales)]];
    if (d.coins > 0) items.push(['🪙', 'Coins', '+' + f(d.coins)]); if (d.bpLevels > 0) items.push(['🎫', 'Battle Pass levels', '+' + d.bpLevels]); if (d.data > 0) items.push(['📊', 'Data', '+' + f(d.data)]);
    $('wb-gains').innerHTML = items.map(([i, n, v]) => `<div class="wb-row"><span>${i} ${n}</span><b>${v}</b></div>`).join('');
    setText($('wb-note'), `Away time earns 100% of your live rate, up to ${G.fmtTime(G.afkCap())}.${d.counted < d.awaySeconds ? ` Capped at ${G.fmtTime(d.counted)}.` : ''} Already in your account.`);
    show($('welcome'), true); beep('coin');
  }

  // ---------- daily chest ----------
  function openChest(res) {
    show($('chest-modal'), true); show($('chest-out'), false); show($('chest-ok'), false); setText($('chest-kicker'), `DAY ${res.day} · LOGIN STREAK REWARD`);
    const ch = $('chest'); ch.className = 'chest shaking'; beep('big');
    setTimeout(() => { ch.className = 'chest open'; beep('big'); burst(window.innerWidth / 2, window.innerHeight / 2, 20, ['✨', '⭐', '💫', '🌟']); }, 2400);
    setTimeout(() => { setHtml($('chest-out'), `<div class="chest-got">${f(res.coins)} Coin${res.coins === 1 ? '' : 's'}</div><div class="small dim">${res.coins <= 4 ? 'Legendary.' : 'Legendary. (Now with the Login Incentive Team.)'}</div>`); show($('chest-out'), true); show($('chest-ok'), true); }, 3200);
  }

  // ---------- actions ----------
  const ACT = {
    ch: d => G.buyChannel(d.id, amt()) && beep('buy'),
    ft: d => G.buyFeature(d.id, amt()) && beep('buy'),
    acct: () => G.hireAccountant() && beep('buy'),
    price: d => G.setPrice(+d.i),
    gf: (d, ev) => { const n = G.buyGameFeature(d.id, amt()); if (n) { beep('buy'); const r = ev.target.getBoundingClientRect(); floatText(r.left + 10, r.top, `Patch shipped! Trust 100%`); } },
    'dev-hire': d => { if (G.hireDev(d.id, amt())) beep('buy'); },
    adnet: () => G.buyAdNet() && beep('buy'),
    cm: () => G.hireCM() && beep('buy'),
    mgr: () => { if (G.hireManager()) { beep('buy'); toast(`👔 Hired a Middle Manager. Team speed ×${G.teamSpeed().toFixed(2)}.`); } },
    team: () => { if (G.hireTeam()) { beep('big'); toast(`👩‍💻 Hired a new dev team. ${R().staff.teams} epics can be in progress at once.`, 'good'); } },
    goto: d => setTab(d.tab),
    qa: () => G.hireQA() && beep('buy'),
    relaunch: () => { const nx = G.nextEraDef(); if (!nx || !G.canRelaunch()) return; ask(`Announce ${C.sequel.baseTitle}: ${nx.sub}?`, `${esc(nx.pitch)}<br><br>${ERA_ASK[nx.id] || ''}<br><br>The players who liked the old game will be upset for a while. Up to <b>${f(nx.market)}</b> people could play the new version.`, 'Announce it', () => { G.relaunch(); G.save(); render(true); }); },
    sale: d => { if (G.startSale(+d.k)) beep('coin'); },
    pander: d => G.pander(d.id),
    live: (d, ev) => { if (G.startLive(d.id)) { beep('big'); const r = ev.target.getBoundingClientRect(); floatText(r.left + 10, r.top, d.id === 'sub' ? '🔴 Subathon is live!' : '🎁 Drops enabled!'); } },
    video: d => G.postVideo(d.id) && beep('buy'),
    dev: d => G.develop(d.id),
    aggr: d => { const on = G.toggleAggr(d.id); if (on) post(pickOf(FC.aggr).replace('{feature}', G.featureName(d.id)), 'bad'); toast(on ? `<b>${esc(G.featureName(d.id))}</b> set to Aggressive. ×2 Revenue. Players have noticed.` : `<b>${esc(G.featureName(d.id))}</b> back to normal.`, on ? 'bad' : ''); },
    gw: d => G.buyGoodwill(d.id) && beep('buy'),
    upg: d => { if (G.buyUpgrade(d.id)) { beep('buy'); toast(`📝 Sent for sign-off: <b>${esc(C.upgrades.find(u => u.id === d.id).name)}</b>`); } },
    res: d => G.research(d.id) && beep('buy'),
    game: d => G.buyGame(d.id) && beep('buy'),
    lane: d => G.launchLane(d.id) && beep('big'),
    bpx: d => G.buyBpExtra(d.id) && beep('big'),
    claim: (d, ev) => { const rw = G.claim(d.lane, +d.l, true); if (rw) { beep('coin'); const r = ev.target.getBoundingClientRect(); floatText(r.left + r.width / 2, r.top, rw.kind === 'nothing' ? 'Nothing!' : rw.kind === 'icon' ? rw.label : '+' + (rw.n ? f(rw.n) + ' ' : '') + rw.label); } },
    offer: (d, ev) => { if (G.runOffer(+d.i)) { const r = ev.target.getBoundingClientRect(); burst(r.left + r.width / 2, r.top, 10); } },
    boost: d => G.buyBooster(d.id) && beep('coin'),
    xch: d => { const n = G.trade(+d.i, d.n === 'max' ? 'max' : 1); if (n) beep('coin'); },
    board: d => G.buyBoard(d.id) && beep('big'),
    popup: (d, ev) => { const rw = G.claimPopup(+d.id); if (rw) { beep('coin'); const r = ev.target.getBoundingClientRect(); floatText(r.left + 40, r.top, rw.coins ? `+${f(rw.coins)} 🪙` : `+${f(rw.code)} </>`); } },
    whale: (d, ev) => { const x = ev.clientX, y = ev.clientY; if (G.catchWhale(false)) burst(x, y, 24); renderWhale(); },
    evc: d => { if (!G.resolveEvent(d.c)) toast('Not enough Revenue for that.', 'bad'); },
    tip: d => toast(`<b>${esc(d.name)}</b><br><span class="small">${esc(d.tip)}</span>`),
  };
  function onClick(e) {
    const t = e.target.closest('[data-act]'); if (!t || t.disabled) return;
    const fn = ACT[t.dataset.act]; if (!fn) return; fn(t.dataset, e); render(true);
  }

  // ---------- cloud UI (Click to Conquer's renderCloud) ----------
  function renderCloud() {
    const Cl = window.Cloud; if (!Cl) return;
    const u = Cl.user, pic = u && u.photoURL ? `<img src="${u.photoURL}" alt="" referrerpolicy="no-referrer">` : null;
    const sil = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><circle cx="12" cy="8.5" r="4"/><path d="M4 20.5c.8-4 4.2-6 8-6s7.2 2 8 6z"/></svg>';
    setHtml($('avatar-img'), pic || sil);
    const dot = $('avatar-dot'); dot.className = 'avatar-dot ' + (u ? ({ ok: 'ok', syncing: 'busy', error: 'bad', offline: 'off', idle: 'off' }[Cl.status] || 'off') : 'hidden');
    show($('cloud-out'), !u); show($('cloud-in'), !!u);
    const sb = $('cloud-signin'); sb.disabled = !Cl.ready; sb.querySelector('span').textContent = !Cl.available ? 'Cloud saves — coming soon' : Cl.ready ? 'Sign in with Google' : Cl.status === 'error' ? 'Cloud unavailable right now' : 'Connecting…';
    if (u) { setHtml($('cloud-pic'), pic || sil); setHtml($('cloud-name'), `<b>${esc(u.displayName || 'Signed in')}</b>`);
      setText($('cloud-sync'), Cl.status === 'syncing' ? 'Syncing…' : Cl.status === 'offline' ? 'Offline — saved on this device' : Cl.lastSync ? `Synced ${Cl.ago(Cl.lastSync)}` : 'Signed in'); }
    const er = $('cloud-err'); show(er, !!Cl.error); setText(er, Cl.error || '');
    const b = Cl.backupInfo && Cl.backupInfo(), rb = $('cloud-restore'); show(rb, !!b);
    if (b && b.meta) setText(rb, `Restore previous save (${b.meta.title}, ${b.meta.stage}, set aside ${Cl.ago(b.at)})`);
  }

  // ---------- init ----------
  function init() {
    buildHeader();
    setText($('version'), C.version);
    document.addEventListener('click', onClick);
    document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
    document.querySelectorAll('[data-buyseg] [data-buy]').forEach(b => b.addEventListener('click', () => { S().settings.buyAmt = b.dataset.buy; document.querySelectorAll('[data-buy]').forEach(x => x.classList.toggle('active', x.dataset.buy === b.dataset.buy)); render(true); }));
    document.querySelectorAll('[data-buy]').forEach(x => x.classList.toggle('active', x.dataset.buy === String(S().settings.buyAmt)));
    // The three taps. The joke line under each changes every C.taps.lineEvery taps so it can be read mid-tapping.
    const newLine = (box, list) => { let a = pickOf(list); for (let k = 0; k < 6 && box.__last === a[0]; k++) a = pickOf(list); box.__last = a[0]; setHtml(box, `<b>${esc(a[0])}</b> <span class="dim">${esc(a[1])}</span>`); };
    const tapBtn = (kind, btn, icon, line, act, label, every, onEvery) => { let n = 0;
      $(btn).addEventListener('click', e => { const g = act(); if (!g) return; const r = $(btn).getBoundingClientRect();
        const words = kind === 'code' ? C.taps.code.floats : kind === 'reply' ? C.taps.reply.floats : kind === 'ad' && !G.has('ads') ? C.promote.floats : null; // the button itself says how much a tap gives
        if (words) floatPhrase(e, r, pickOf(words), kind === 'code' ? 'codefloat' : kind === 'reply' ? 'replyfloat' : 'promofloat');
        else floatAbove(e, r, label(g));
        if (n++ % C.taps.lineEvery === 0) newLine($(line), kind === 'ad' && !G.has('ads') ? C.promote.lines : C.taps[kind].lines);
        if (n % every === 0) onEvery();
        $(icon).classList.remove('bump'); void $(icon).offsetWidth; $(icon).classList.add('bump'); }); };
    $('promo-btn').addEventListener('click', e => { const g = G.promote(); if (g) floatPhrase(e, $('promo-btn').getBoundingClientRect(), pickOf(C.promote.floats), 'promofloat'); });
    tapBtn('code', 'code-btn', 'code-icon', 'code-line', () => G.tap(), g => '+' + f(g) + ' </>', 40, () => { if (G.has('community')) post(pickOf(FC.code), 'good'); });
    tapBtn('ad', 'ad-btn', 'ad-icon', 'ad-line', () => G.has('ads') ? G.placeAd() : G.promote(), g => G.has('ads') ? '+' + $$(g) : '+' + f(g) + ' 👥', 25, () => { if (G.has('community') && G.has('ads')) post(pickOf(FC.bad), 'bad'); });
    tapBtn('reply', 'reply-btn', 'reply-icon', 'reply-line', () => G.reply(), g => '+' + repStars(g), 1e9, () => {});
    $('f2p-btn').addEventListener('click', () => ask('Go free-to-play?', `<b>${esc(G.gameTitle())}</b> becomes free, forever. Everyone who sees it installs it; nobody pays for it. Ads stop costing double, and the Cash Shop opens.<br><br>You'll stop earning ${$$(G.salesPerSec())}/s from sales.`, 'Make it free', () => { G.goF2P(); render(true); }));
    $('pizza-btn').addEventListener('click', () => { if (G.holdPizza()) { beep('big'); burst(window.innerWidth / 2, window.innerHeight / 2, 12, ['🍕', '🍕', '🎉']); } render(true); });
    $('confirm-no').addEventListener('click', closeAsk); $('confirm-yes').addEventListener('click', () => { const cb = confirmCb; closeAsk(); if (cb) cb(); });
    $('confirm-modal').addEventListener('click', e => { if (e.target === $('confirm-modal')) closeAsk(); });
    $('story-go').addEventListener('click', () => { nextStory(); G.save(); });
    $('wb-ok').addEventListener('click', () => { show($('welcome'), false); G.save(); });
    $('bp-claim').addEventListener('click', () => { if (G.claimAll()) beep('coin'); render(true); });
    $('bp-season').addEventListener('click', () => { G.newSeason(); beep('big'); render(true); });
    $('daily-claim').addEventListener('click', () => { const res = G.claimDaily(); if (!res) return; if (res.chest) openChest(res); else { toast(`Day ${res.day}: +${f(res.coins)} Coin${res.coins === 1 ? '' : 's'}. ${res.day === 1 ? 'Come back tomorrow for 2.' : ''}`, 'gold'); beep('coin'); } G.save(); render(true); });
    $('chest-ok').addEventListener('click', () => show($('chest-modal'), false));
    $('loot-open').addEventListener('click', () => { const res = G.openBox(); if (!res) return; const c = res.item; setHtml($('loot-result'), `<div class="loot-pop rar-${c.rar}"><span class="lp-ico">${c.icon}</span><div><b>${esc(c.name)}</b><div class="small">${c.rar}${res.dup ? ' · Duplicate! Refunded ¼ Crystal (a 75% loss).' : ` · +${G.pct(c.per)} ${effName(c.eff)}, forever`}</div></div></div>`); beep(res.dup ? 'buy' : 'big'); render(true); });
    $('vip-buy').addEventListener('click', () => { G.buyVip(); render(true); });
    $('seq-btn').addEventListener('click', () => { S().settings.seqSeen = true; const g = G.scGain(); ask(`Lay everyone off and make ${G.gameTitle(M().sequel + 1)}?`, `${esc(G.gameTitle())} is a hit, so the board has approved a sequel and a "restructuring". You gain <b>${g} Shareholder Confidence</b> (+${G.pct(C.sequel.perSC * g)} money and code, +${G.pct(C.sequel.perSCInst * g)} installs, forever).<br><br><b>Laid off:</b> all ${f(G.headcount())} employees, plus players, Code, Money, Data, game and monetization features, developers, ad networks, streamers, staff, decisions, research, Portfolio and the Battle Pass.<br><b>Kept:</b> Coins, Gems, Crystals, Platinum, VIP, cosmetics, achievements, Shareholder Confidence and board perks.`, 'Send the memo', () => { G.launchSequel(); G.save(); render(true); }); });
    // settings (Click to Conquer's panel)
    const st = S().settings;
    $('settings-btn').addEventListener('click', () => { show($('settings'), true); renderCloud(); });
    $('avatar-btn').addEventListener('click', () => { show($('settings'), true); renderCloud(); });
    $('settings-close').addEventListener('click', () => show($('settings'), false));
    $('settings').addEventListener('click', e => { if (e.target === $('settings')) show($('settings'), false); });
    $('set-sound').checked = !!st.sound; $('set-sound').addEventListener('change', e => { S().settings.sound = e.target.checked; if (e.target.checked) beep('coin'); });
    $('set-calm').checked = !!st.calm; $('set-calm').addEventListener('change', e => { S().settings.calm = e.target.checked; if (e.target.checked) R().popups = []; });
    $('set-clutter').checked = !!st.noClutter; $('set-clutter').addEventListener('change', e => { S().settings.noClutter = e.target.checked; });
    document.querySelectorAll('[data-speed]').forEach(b => { b.classList.toggle('active', +b.dataset.speed === (st.devSpeed || 1)); b.addEventListener('click', () => { S().settings.devSpeed = +b.dataset.speed; document.querySelectorAll('[data-speed]').forEach(x => x.classList.toggle('active', x === b)); }); });
    $('set-export').addEventListener('click', () => { $('set-io').value = G.exportSave(); $('set-io').select(); try { navigator.clipboard.writeText($('set-io').value); toast('Save copied to clipboard.'); } catch (e) {} });
    $('set-import').addEventListener('click', () => { const v = $('set-io').value; if (!v.trim()) { toast('Paste a save string first.', 'bad'); return; } ask('Import save?', 'This replaces your current progress. Your current save is kept as a backup on this device.', 'Import', () => { if (G.importSave(v)) { toast('Save imported.', 'good'); rebuild(); } else toast('That is not a valid save. Nothing changed.', 'bad'); }); });
    $('set-reload').addEventListener('click', () => { G.save(); location.reload(); });
    $('tut-go').addEventListener('click', () => { const st = G.tutStep(); if (st && st.name) openName(); else showMe(); });
    $('set-rename').addEventListener('click', () => openName());
    $('name-cancel').addEventListener('click', () => show($('name-modal'), false));
    $('studio-input').addEventListener('input', namePreview);
    $('name-form').addEventListener('submit', e => { e.preventDefault(); if (G.setStudioName($('studio-input').value)) { show($('name-modal'), false); render(true); } else $('studio-input').focus(); });
    $('set-tut-skip').addEventListener('click', () => ask('Skip the tutorial?', 'Every system your company has reached unlocks at once. You can still play exactly the same game.', 'Skip it', () => { G.skipTutorial(); show($('settings'), false); render(true); }));
    $('set-reset').addEventListener('click', () => ask('Reset everything?', 'Every game, sequel, currency, VIP level, cosmetic and achievement on this device will be deleted. This cannot be undone.', 'Reset all', () => { G.hardReset(); G.save(); location.reload(); }));
    $('whatsnew').innerHTML = C.changelog.map(([v, t]) => `<div class="small"><b>${v}</b> <span class="dim">${esc(t)}</span></div>`).join('');
    const DEV = { cash: () => G.debug.cash(Math.max(1000, R().cash * 999)), eng: () => G.debug.code(Math.max(1000, R().code * 999)), code: () => G.debug.code(Math.max(1000, R().code * 999)), players: () => G.debug.players(Math.max(100, R().players * 10)), bomb: () => G.debug.bomb(), gems: () => G.debug.cur('gems', 500), crystals: () => G.debug.cur('crystals', 20), afk: () => showWelcomeBack(G.debug.offline(4)), whale: () => { if (R().stage < 3) R().stage = 3; G.debug.whale(); }, event: () => G.debug.event(), sc: () => G.debug.sc(10), bp: () => G.debug.bpLevels(5) };
    document.querySelectorAll('[data-dev]').forEach(b => b.addEventListener('click', () => { DEV[b.dataset.dev](); render(true); }));
    // cloud buttons (handlers live in cloud.js)
    $('cloud-signin').addEventListener('click', () => window.Cloud && Cloud.signIn());
    $('cloud-signout').addEventListener('click', () => window.Cloud && Cloud.signOut());
    $('cloud-now').addEventListener('click', () => window.Cloud && Cloud.push(true));
    $('cloud-delete').addEventListener('click', () => ask('Delete cloud save?', 'Removes your cloud save and signs you out. Progress on this device is kept.', 'Delete', () => Cloud.deleteCloud()));
    $('cloud-restore').addEventListener('click', () => ask('Restore previous save?', 'Swaps your current save with the one set aside on this device.', 'Restore', () => { if (Cloud.restoreBackup()) toast('Restored.', 'good'); }));
    // fake timer chip in the cluttered header
    setInterval(() => { fakeT = fakeT <= 0 ? 7199 : fakeT - 1; setText($('fake-timer'), G.clock(fakeT)); }, 1000);
    if (!st.story.intro) { st.story.intro = 1; story('Day one', 'You made a game.', `It is called <b>${G.gameTitle()}</b>, and you want it to be good. You write the code yourself.<br><br>The goal is <b>players</b>: a thousand, then a million. You'll price the game, then give it away, then sell everything inside it. Every way of making money costs a little of what players think of you. The quest card walks you through it, one step at a time.<br><br><span class="small dim">Everything here is simulated. No real money, no real ads, no real layoffs.</span>`, 'Open the editor ▶', true); }
    render(true);
  }
  let last = 0;
  function render(force) {
    const now = performance.now(); if (!force && now - last < 120) return; last = now;
    drain();
    document.body.className = 'clutter-' + clutter() + (R().whale ? ' whale-on' : '') + (G.has('reputation') ? ' rep-on' : '');
    placeTop(); watchRating(); renderHeader(); renderTabs(); renderTutorial(); renderHub(); renderEvent(); renderIncident(); renderPopups(); renderWhale();
    if (!TABS[tab]() && !(S().settings.seenTabs || {})[tab]) { setTab('dev'); return; }
    if (tab === 'dev') renderDev(); else if (tab === 'fin') renderFin(); else if (tab === 'com') renderCom(); else if (tab === 'pass') renderPass(); else if (tab === 'shop') renderShop(); else if (tab === 'stats') renderStats();
  }
  function rebuild() { document.querySelectorAll('.list, .offers, #dash, #popup-tray').forEach(e => { e.__k = null; }); $('bp-track').__k = null; render(true); }
  setInterval(renderCloud, 15000);
  return { init, render, rebuild, showWelcomeBack, renderCloud, toast, showMe };
})();
