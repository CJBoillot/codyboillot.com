// Battle Pass: The Game — all numbers live here (same split as Click to Conquer: config → game → ui).
// Every in-game ad, sale, whale and purchase is SIMULATED. No real money moves anywhere in this file.
const CONFIG = {
  version: 'Alpha 0.1.4',
  saveKey: 'bp_alpha_save_v4', // 0.1.0: the five eras, fresh saves
  tickMs: 100,
  startCash: 5000,      // startup money: your savings, your mom's savings, a credit card
  promote: { secs: 3, min: 1, floats: ['Hey, try this game I made!', 'You won\'t believe level 5!', 'Only 1% beat level 10!', '99% of players quit here', 'Free trial (it\'s not free)', 'Can YOU survive 3 minutes?', 'Gamers HATE this trick', 'This changed my life (it\'s a game)', 'Doctors don\'t want you to play this', 'Is this the best shooter of 2026?', 'My mom says it\'s really good', 'Tag a friend who\'d lose', 'Wait for the ending!', 'Not clickbait (it\'s clickbait)', 'Nobody can beat my score', 'The devs are crying', 'You need this game', 'Made by one guy in a garage', 'Better than the game you\'re playing', 'Download before it\'s banned', 'Streamers are obsessed', 'I can\'t stop playing this', '#1 game in my apartment', 'Level 7 broke me', 'Only geniuses get past level 3', 'Rated 5 stars (by me)', 'What happens at level 20??', 'Like if you\'d play this', 'Your friends are already playing', 'This game is illegal in 3 countries', 'Plays great on a toaster', 'No pay to win (yet)', 'Comment \'LOOT\' for a free skin', 'Wishlist it, it helps!', 'I quit my job for this', 'The trailer doesn\'t lie (much)', '100% real gameplay*', 'Just one more round', 'POV: you found a hidden gem', 'Swipe up to download', 'Did you see that headshot?', 'It\'s like Dark Souls but a shooter', 'Indie game of the year (nominated by me)', 'Wait, it\'s on sale?', 'This map is huge', 'My cousin beat it in a day', 'Can you find the secret room?', 'Gameplay so smooth you\'ll cry', 'Try it, you won\'t regret it', 'Bet you can\'t play just once'], // a random hook floats up on each Promote tap
    lines: [['Posted it on Reddit', '"Made this in my spare time, be nice."'], ['Asked your mom to download it', 'She bought two copies. One is for the fridge.'], ['DM\'d a streamer', 'Seen 3:14 AM.'], ['Made a TikTok', 'It\'s you, pointing at the game.'], ['Emailed every games journalist', 'One replied. It was an auto-reply.'], ['Put it on a forum signature', 'The forum is from 2009.'], ['Told your barber', 'He\'s "more of a Tetris guy".'], ['Handed out flyers at the bus stop', 'Three people. One dog.'], ['Asked your cousin to share it', 'He shared it to his 4 followers. One is you.'], ['Bought a $5 sponsored post', 'Reached 11 people, 9 of them bots.'], ['Posted the trailer', 'Gameplay may not be representative.'], ['Replied "this!" under a big streamer\'s tweet', 'With a link. Subtle.'], ['Submitted it to a game jam', 'It is not a jam game. Nobody checked.'], ['Called it "the Dark Souls of shooters"', 'It is not. People clicked anyway.'], ['Put a QR code on your car', 'Someone scanned it at a red light.'], ['Made a Discord server', '4 members, 3 are moderators.'], ['Got it on a "hidden gems" list', 'Number 47 of 50.'], ['Wore the merch to the gym', 'You made the merch. In Paint.'], ['Posted a devlog', '"Day 41: still the same bug."'], ['Begged nicely', 'It worked a little.']] },
  accountant: { cost: 800 },
  // ---------- Streamly Live (bursts) and ToobVOD (videos that stay up) — Alpha 0.0.14 ----------
  // Costs scale with the studio: max(floor, seconds of revenue or code). Every effect also scales with your rating.
  live: {
    subathon: { name: 'Subathon', icon: '⏱️', costFloor: 500, costSecs: 60, secs: 120, maxSecs: 360, perReply: 4, boost: 2.5, cooldown: 300,
      desc: 'A streamer stays live until the timer runs out. Installs ×2.5 while it runs. Every comment you respond to adds 4 seconds.' },
    drops: { name: 'Streamly Drops', icon: '🎁', costFloor: 200, costSecs: 30, codeCost: true, secs: 240, boost: 1.6, keep: 0.75, cooldown: 300, backlash: 3,
      prizes: ['a gray hat', 'a slightly different gun', 'a spray that says "gg"', 'a profile border (gray)', 'an emote of a thumbs up', 'a banner that says "I watched"'],
      desc: 'Watch 2 hours, get an in-game item. Installs ×1.6 and fewer players quit while it runs. When it ends, players see what the item was.' },
  },
  vod: {
    tau: 1200, // a video's views fade over ~20 minutes
    videos: [
      { id: 'devlog', era: 2, name: 'Post a Devlog', icon: '🎬', costFloor: 100, costSecs: 20, codeCost: true, reach: 0.4, cooldown: 60, titles: ['Devlog #{n}: we fixed the jump', 'Devlog #{n}: a new gun (it\'s the same gun)', 'Devlog #{n}: 400 bugs later', 'Devlog #{n}: why the servers were down'], desc: 'Cheap and honest. A few viewers, for a long time.' },
      { id: 'sponsor', era: 3, name: 'Sponsor a Review', icon: '💸', costFloor: 1000, costSecs: 90, reach: 1.5, cooldown: 180, titles: ['This game is ACTUALLY good (sponsored)', 'I was WRONG about {game}', '{game} in 2026: worth it?'], desc: 'A Toober reviews the game, honestly (mostly). Their verdict follows your rating on the day it goes up.' },
      { id: 'first', era: 3, name: 'Pay for "First Impressions"', icon: '🔥', costFloor: 5000, costSecs: 300, reach: 4, cooldown: 480, titles: ['First Impressions: {game}', '{game} — is it the next big thing?', 'I played {game} for 24 hours'], desc: 'The biggest Toober in gaming. Huge reach. If your rating is bad that day, so is the video, and it stays up.' },
    ],
    scamTitles: ['Is {game} a SCAM?', 'The {game} situation is BAD', '{game} lied to us (full breakdown)', 'Why everyone is quitting {game}'],
    scamReach: 0.6, penMax: 10, // a review bomb that lands spawns a bad video
    good: 3.5, bad: 2.5, // the rating on upload day: above 3.5★ the video brings players; under 2.5★ it costs rating
    repPerReach: 4, // a fully bad video at reach 1: −4 rating points while it's watched
  },
  paidAds: { ratingMult: 2 },
  paidChurn: 0.35,      // people who paid for the game keep playing it: churn ×0.5 until free-to-play // ads (and ad items) cost twice the rating in a game people paid for
  studio: { fallback: 'Untitled Game Studio', maxLen: 28,
    ideas: ['Pixel Goblin Games', 'Definitely Not EA', 'Crunch Time Interactive', 'Sunk Cost Studios', 'Loot Lagoon', 'Big Head Mode', 'Day One Patch Games', 'Mostly Harmless Software', 'Respawn Later Inc.', 'Two Guys and a Server'] },
  maxCatchupSeconds: 5,
  autosaveMs: 10000,
  // Offline follows the AFK-genre rule adopted in Click to Conquer Beta 0.1.16: 100% of live output, 12 h cap.
  offline: { capSeconds: 12 * 3600, efficiency: 1, minSecondsToShow: 60, steps: 1500 },
  cloud: { collection: 'battlepass_saves' }, // never 'users' — that is Click to Conquer's collection

  // ---------- core model ----------
  core: {
    startRep: 55,
    goodwillMax: [20, 30, 45, 60, 75], // 0.1.1: the most goodwill can add, by era (rating points; 20 = 1 star), so Quality still matters
    baseChurn: 1 / 600,          // a player stays ~10 min at Reputation 50
    engagementPerPlayer: 0.04,    // Engagement / s per active player
    womBase: 0.1,                // Word of Mouth: installs/s even with nothing bought
    womSqrt: 0.015,               // + this × √players (scaled by Reputation)
    repTau: 45,                  // seconds for Reputation to close ~63% of the gap to its target
    scandalDecay: 300,           // seconds for a scandal to fade
    tapBase: 1,                  // installs per tap
    tapShareOfInstalls: 0.25, // + this many seconds of installs per Executive Action
    dataPerPlayer: 0.0002,       // Data / s per player per Analytics level
    shares: { minnow: 0.03, dolphin: 0.006, whale: 0.0004 },
    milestones: [25, 50, 100, 200, 300, 400, 500, 750, 1000], milestoneMult: 1.3, // ×1.5 each (AdCap style, gentler: two bought axes multiply)
  },

  // Stages are reached by PLAYERS (the most you've had at once in this game). Money is the score.
  stages: [
    // company: {N} = the studio name the player picks, {S} = its initials (the full name if it is one word)
    { id: 1, name: 'Indie Developer',    company: '{N}',                       need: 0 },
    { id: 2, name: 'Cult Hit',           company: '{N}',                       need: 1e3 },
    { id: 3, name: 'Game Studio',        company: '{N} LLC',                   need: 1e4 },
    { id: 4, name: 'Publisher',          company: '{S} Publishing Group',      need: 1e5 },
    { id: 5, name: 'Gaming Corporation', company: '{S} Interactive Corp.',     need: 1e6 },
    { id: 6, name: 'MTX GLOBAL',         company: 'MTX GLOBAL INTERACTIVE ENTERTAINMENT HOLDINGS LLC', need: 1e7 },
  ],

  // ---------- the five eras (Alpha 0.1.0): the game you are making changes ----------
  // inst: install multiplier (each version reaches a bigger audience) · next: peak players that unlock the relaunch into the next era · market: everyone who will ever play this version
  eras: [
    { id: 1, name: 'Single-Player', sub: '',             icon: '📖', inst: 0.5, market: 1e5, next: 8e3, pitch: 'A story-heavy action RPG. One hero, one campaign, an ending.' },
    { id: 2, name: 'Co-op',         sub: 'Co-op',        icon: '🤝', inst: 1.1, market: 1e6, next: 1e5, pitch: 'The same game, with a friend. Drop-in co-op, shared loot, servers.' },
    { id: 3, name: 'Online',        sub: 'Online',       icon: '🌐', inst: 0.9, market: 1e7, next: 1e6, pitch: 'A hub town, raids, ranked. The story is now "lore".' },
    { id: 4, name: 'Free-to-Play',  sub: 'Free-to-Play', icon: '🆓', inst: 0.4, market: 1e8, next: 1e7, pitch: 'Everyone installs it. Nobody pays for it. The shop opens.' },
    { id: 5, name: 'Don\'t You Guys Have Phones?', sub: 'Mobile', icon: '📱', inst: 0.7, market: 1e9, next: 0, pitch: 'Auto-play, energy, an ad every 30 seconds.' },
  ],
  relaunchScandal: 6, // players who liked the old game

  // Acquisition channels: installs / s per level. Bought with Revenue.
  channels: [
    { id: 'store',   tab: 'finance', name: 'App Store Listing',       icon: '🏪', stage: 1, era: 1, desc: 'A screenshot, a title, and 400 keywords.' },
    { id: 'xpromo',  tab: 'community', name: 'Your Cousin on Streamly', icon: '🎮', stage: 1, era: 1, desc: 'He streams to 4 people. One of them is his mom. She is now also your player.' },
    { id: 'intern',  tab: 'community', name: 'Social Media Intern',     icon: '📱', stage: 2, era: 2, desc: 'Posts memes. Paid in exposure.' },
    { id: 'fakeads', tab: 'finance', name: 'Fake Ad Campaigns',       icon: '🌋', stage: 3, era: 3, pressure: 3, desc: '"99% of players can\'t beat level 3." Gameplay not representative.' },
    { id: 'influ',   tab: 'community', name: 'Sponsored Streamly Streamers', icon: '📺', stage: 3, era: 2, pressure: 1.5, desc: 'One hour, minimum. The contract requires "having a great time". (#ad, in 6pt font)' },
    { id: 'celeb',   tab: 'community', name: 'Streamly\'s Top Streamer',    icon: '👑', stage: 4, era: 3, desc: 'He plays it instead of the game he likes. For exactly as long as we pay him.' },
    { id: 'preinst', tab: 'finance', name: 'Pre-installed on Phones', icon: '📲', stage: 4, era: 5, pressure: 4, desc: 'Cannot be uninstalled. Can be disabled. (It cannot be disabled.)' },
    { id: 'osupd',   tab: 'finance', name: 'Mandatory OS Update',     icon: '🔄', stage: 5, era: 5, pressure: 5, desc: 'Your phone restarts. Now it has our game.' },
    { id: 'implant', tab: 'finance', name: 'Neural Ad Implant',       icon: '🧠', stage: 6, era: 5, pressure: 8, desc: 'You dream about the Starter Pack. It is $4.99.' },
  ],

  // Monetization, in three shelves. Each item is built once with Code (an epic), then levelled with Code.
  // $/s = level × rate × players × segment share. Shop and pay-to-win items also scale with your rating:
  // players buy more from a game they like. Pay-to-win items cost extra rating that grows with how many you stock.
  features: [
    { id: 'dlc',     shelf: 'dlc', launch: { share: 0.03, price: 9.99 },  name: 'Story DLC',            icon: '📖', seg: 'all',     pressure: 0.5, rate: 0.0005, cost: 10, stage: 1, era: 1, price: 9.99,
      desc: 'Chapter 4. It was cut from the game so it could be sold as Chapter 4. $9.99.' },
    { id: 'spass',   shelf: 'dlc', launch: { share: 0.03, price: 29.99 },  name: 'Season Pass',          icon: '🎟️', seg: 'all',     pressure: 1, rate: 0.0016, cost: 400, stage: 1, era: 2, retain: 0.9,
      desc: 'Every DLC this year, paid for today. The DLC has not been made yet. Season Pass holders stay longer (churn ×0.9).' },
    { id: 'deluxe',  shelf: 'dlc', launch: { share: 0.03, price: 39.99 },  name: 'Deluxe Edition',       icon: '📀', seg: 'dolphin', pressure: 1, rate: 0.007, cost: 20000, stage: 1, era: 3,
      desc: '$39.99. The same game, a gold box, and a digital artbook nobody opens.' },
    { id: 'mmo',     shelf: 'dlc', launch: { share: 0.03, price: 14.99 },  name: 'Monthly Subscription', icon: '🗓️', seg: 'all',     pressure: 1.5, rate: 0.006, cost: 1e5, stage: 1, era: 3, retain: 0.85,
      desc: '$14.99 a month to play the game you bought. Subscribers stay longer (churn ×0.85).' },
    { id: 'inter',   shelf: 'ads',  name: 'Interstitial Ads',      icon: '⏱️', seg: 'all',     pressure: 2, rate: 0.0009, cost: 12, stage: 1, era: 2, ad: true,
      adNames: ['Interstitial Ads', 'Sponsored Content Breaks', 'Partner Messaging Moments', 'Premium Brand Experiences', 'Mandatory Brand Meditations'],
      desc: 'A 30-second ad between rounds. The X appears after 31 seconds.' },
    { id: 'reward',  shelf: 'ads',  name: 'Rewarded Ads',          icon: '🎁', seg: 'all',     pressure: -1, rate: 0.0015, cost: 50, stage: 2, era: 2, ad: true,
      adNames: ['Rewarded Ads', 'Sponsored Rewards', 'Partner Gratitude Moments', 'Premium Brand Gifts', 'Voluntary Mandatory Rewards'],
      desc: 'Players choose to watch. They are almost happy about it.' },
    { id: 'banner',  shelf: 'ads',  name: 'Banner Under the Jump Button', icon: '🪧', seg: 'all', pressure: 2.5, rate: 0.0024, cost: 200, stage: 3, era: 3, ad: true,
      desc: '3% of jumps now open a browser. The other 97% are slightly anxious.' },
    { id: 'skins',   shelf: 'shop', name: 'Weapon Skins',          icon: '🎨', seg: 'all',     pressure: 0.5, rate: 0.0012, cost: 800, stage: 3, era: 4,
      desc: 'Your gun, but orange. $9.99. Harmless money, and players buy more of it when they like the game.' },
    { id: 'bpass',   shelf: 'shop', name: 'Battle Pass',           icon: '🎫', seg: 'all',     pressure: 1, rate: 0.002, cost: 3000, stage: 3, era: 4, unlocks: 'pass', retain: 0.8,
      desc: 'A sense of pride and accomplishment, in 30 tiers. Players stay longer while a season runs (churn ×0.8).' },
    { id: 'starter', shelf: 'shop', name: '$0.99 Starter Pack',    icon: '📦', seg: 'minnow',  pressure: 1, rate: 0.003, cost: 12000, stage: 3, era: 4,
      desc: '800% VALUE! (Value determined by us.)' },
    { id: 'gems',    shelf: 'shop', name: 'Premium Currency (Gems)', icon: '💎', seg: 'minnow', pressure: 1.5, rate: 0.0045, cost: 50000, stage: 3, era: 4,
      desc: 'Prices in Gems so nobody knows what anything costs. 80 Gems is $0.99. Everything costs 100 Gems.' },
    { id: 'lootbox', shelf: 'p2w',  name: 'Loot Boxes',            icon: '🎰', seg: 'dolphin', pressure: 2.5, rate: 0.01, cost: 800000, stage: 4, era: 4,
      desc: 'We prefer the term "surprise mechanics". 0.4% chance of the good gun.' },
    { id: 'boost',   shelf: 'p2w',  name: 'XP Boosters',           icon: '⏫', seg: 'dolphin', pressure: 2, rate: 0.015, cost: 3e+06, stage: 4, era: 4,
      desc: 'XP was halved yesterday. Double XP is $4.99.' },
    { id: 'p2wgun',  shelf: 'p2w',  name: 'The Better Gun ($19.99)', icon: '🔫', seg: 'whale', pressure: 3, rate: 0.022, cost: 1.3e+07, stage: 4, era: 4,
      desc: 'It\'s not pay-to-win. It\'s pay-to-have-won.' },
    { id: 'energy',  shelf: 'p2w',  name: 'Energy System',         icon: '⚡', seg: 'all',     pressure: 3, rate: 0.035, cost: 5e+07, stage: 5, era: 5,
      desc: 'You may play 5 times. Then you may pay.' },
    { id: 'founder', shelf: 'p2w',  name: 'Founder Packs',         icon: '🐉', seg: 'whale',   pressure: 2, rate: 0.05, cost: 2e+08, stage: 5, era: 5,
      desc: 'ULTIMATE CELESTIAL DRAGON FOUNDERS PACK — $99.99. Founders only. Everyone is a founder.' },
    { id: 'cosm',    shelf: 'p2w',  name: 'Gameplay-Affecting Cosmetics', icon: '👑', seg: 'minnow', pressure: 3, rate: 0.08, cost: 8e+08, stage: 6, era: 5,
      desc: 'It\'s only cosmetic. The cosmetic gives +40% damage.' },
    { id: 'subs',    shelf: 'p2w',  name: 'Subscription Tiers',    icon: '🔁', seg: 'whale',   pressure: 2, rate: 0.12, cost: 3e+09, stage: 6, era: 5,
      desc: 'MTX Pass Ultimate Plus Premium. Billed monthly, forever.' },
  ],
  shelves: {
    dlc:  { name: 'DLC & Editions', hint: 'Players who bought the game pay again. They buy more from a game they rate highly (×rating).' },
    ads:  { name: 'Ads', hint: 'Everyone sees them, nobody pays. Every ad item costs a little rating.' },
    shop: { name: 'Cash Shop', hint: 'Players pay you directly. They buy more from a game they rate highly (×rating).' },
    p2w:  { name: 'Pay to Win', hint: 'Whales pay enormous sums. Every item you stock costs more rating than the last, and players notice.' },
  },

  // Goodwill: things that raise the Reputation target. Revenue cost.
  goodwill: [
    { id: 'notes',  name: 'Roadmap Livestream',    icon: '🗺️', gain: 8,  cost: 1e5,   growth: 2.5,  stage: 2, desc: 'A 40-minute stream about content coming "soon". Chat is cautiously optimistic.' },
    { id: 'fixes',  name: 'Bug Bounty Program',    icon: '🐞', gain: 10,  cost: 1e10,   growth: 2.5,  stage: 3, desc: 'Players find the bugs for you. You pay them in a forum badge.' },
    { id: 'pr',     name: 'PR Department',         icon: '📣', gain: 14, cost: 1e15,  growth: 2.5,  stage: 4, desc: 'Cannot fix the game, can fix how you feel about the game.' },
    { id: 'spin',   name: 'Narrative Realignment', icon: '🌀', gain: 20, cost: 1e21,  growth: 2.5,  stage: 5, desc: 'The monetization was the fans\' idea all along.' },
  ],

  // One-time upgrades (the AdCap "Upgrades" shop). eff keys: rev, inst, eng, churn, data, bpxp, ad, ch:<id>, ft:<id>, seg:<seg>, rep, tap, coin, whale, offers, popups
  upgrades: [
    { id: 'u_tap1',    name: 'Ask Your Mom to Leave a Review', icon: '👩', cost: 25, stage: 1, eff: { reply: 2 }, desc: 'Replies ×2. Five stars: "proud of you, call more".' },
    { id: 'u_keyboard', name: 'Buy a Mechanical Keyboard', icon: '⌨️', cost: 1, stage: 1, eff: { codeTap: 2 }, desc: 'Code per tap ×2. Clack clack clack.' },
    { id: 'u_store1',  name: 'Add "Free" to the Title',   icon: '🆓', cost: 300,    stage: 1, eff: { 'ch:store': 3 }, desc: 'App Store Listing ×3. "Extraction Royale FREE (Season 0)"' },
    { id: 'u_crunch', name: '"Optional" Crunch',  icon: '🌙', cost: 1, stage: 2, eff: { code: 1.5, rep: -4 }, desc: 'Developers write ×1.5 code. Reputation −4 when the blog post leaks.' },
    { id: 'u_banner1', name: 'Bigger Banners',            icon: '🪧', cost: 2000,    stage: 2, eff: { adTap: 2 }, desc: 'Each ad pays ×2. Now covering the jump button.' },
    { id: 'u_xp1',     name: 'Drop Campaign',             icon: '🎁', cost: 5e5,  stage: 2, eff: { 'ch:xpromo': 3 }, desc: 'Cousin streams ×3. Watch 2 hours, get a gray hat.' },
    { id: 'u_scrum',   name: 'Hire a Scrum Master',       icon: '📋', cost: 1,      stage: 2, eff: { code: 1.5 }, desc: 'Developers write ×1.5 code. Every meeting now has a meeting before it.' },
    { id: 'u_inter1',  name: 'Unskippable Interstitials', icon: '⏱️', cost: 1e7,    stage: 3, eff: { 'ft:inter': 3, rep: -5 }, desc: 'Interstitial Ads ×3, Reputation target −5.' },
    { id: 'u_intern',  name: 'Pay the Intern',            icon: '💵', cost: 2e8,    stage: 3, eff: { 'ch:intern': 3 }, desc: 'Social Media Intern ×3. Paid in exposure AND money.' },
    { id: 'u_adstudio',name: 'In-House Ad Studio',        icon: '🎬', cost: 1e9,    stage: 3, eff: { 'ch:fakeads': 2 }, unlock: 'adstudio', desc: 'Fake Ad Campaigns ×2. Make your own misleading ads.' },
    { id: 'u_removeads', name: 'Sell "Remove Ads" ($2.99)', icon: '🚫', cost: 3e10, stage: 4, eff: { ad: 1.5 }, adChain: 1, desc: 'Players pay to remove ads. Ads become "Sponsored Content". Ad revenue ×1.5.' },
    { id: 'u_retention', name: 'Retention Manipulation',  icon: '🪝', cost: 2e11,    stage: 4, eff: { churn: 0.75 }, desc: 'Churn ×0.75. "Your crops will wither!"' },
    { id: 'u_partner', name: 'Rebrand as Partner Messaging', icon: '🤝', cost: 2e12, stage: 4, eff: { ad: 1.5 }, adChain: 2, desc: 'Sponsored Content becomes Partner Messaging. Ad revenue ×1.5.' },
    { id: 'u_synergy', name: 'Learn to Say "Synergy"',     icon: '🗣️', cost: 1,      stage: 4, eff: { adTap: 2 }, desc: 'Each ad pays ×2. You don\'t know what it means. Nobody does.' },
    { id: 'u_streamdeal', name: 'Exclusive Streamer Contracts', icon: '✍️', cost: 1, stage: 4, eff: { 'ch:influ': 3, 'ch:celeb': 3 }, desc: 'Streamers ×3. They may not play other games on stream. They may not play other games at all.' },
    { id: 'u_templates', name: 'Canned Responses',     icon: '📋', cost: 1, stage: 4, eff: { reply: 3 }, desc: 'Replies ×3. "Thanks for your feedback! We\'ve passed it on to the team."' },
    { id: 'u_psych',  name: 'Player Psychology Lab',     icon: '🧪', cost: 1e13,    stage: 4, eff: { 'seg:whale': 2 }, desc: 'Whale share ×2. We found the button that says "buy".' },
    { id: 'u_regional',name: 'Regional Pricing',          icon: '🌍', cost: 2e15,   stage: 5, eff: { rev: 1.5 }, desc: 'Revenue ×1.5. $4.99, or 4.99 of whatever you have.' },
    { id: 'u_premium', name: 'Premium Brand Experiences', icon: '✨', cost: 1e16,   stage: 5, eff: { ad: 2 }, adChain: 3, desc: 'Partner Messaging becomes Premium Brand Experiences. Ad revenue ×2.' },
    { id: 'u_dynamic', name: 'Dynamic Offers',            icon: '🎯', cost: 1e17,   stage: 5, eff: { 'seg:minnow': 2, offers: 2 }, desc: 'Minnow share ×2, Limited-Time Offers pay ×2. The price is whatever you\'d pay.' },
    { id: 'u_live',    name: 'Live-Service Department',   icon: '📡', cost: 1e18,   stage: 5, eff: { churn: 0.8 }, desc: 'Churn ×0.8. The game is never finished. That\'s the feature.' },
    { id: 'u_season',  name: 'Seasonal Content Team',     icon: '🍂', cost: 1e19,   stage: 5, eff: { bpxp: 2 }, desc: 'Battle Pass XP ×2. Same content, new season number.' },
    { id: 'u_exec',    name: 'Executive Bonuses',         icon: '🛥️', cost: 1e20,   stage: 5, eff: { rev: 2, rep: -8 }, desc: 'Revenue ×2, Reputation target −8. Morale has never been better (on the yacht).' },
    { id: 'u_rpg',     name: 'Buy a Beloved RPG Studio',  icon: '🏰', cost: 2e21,   stage: 6, eff: { inst: 3 }, desc: 'Installs ×3. Fans thrilled. For about a week.' },
    { id: 'u_rpgpass', name: 'Add a Battle Pass to the Single-Player RPG', icon: '🗡️', cost: 1e22, stage: 6, eff: { rev: 2, rep: -10 }, desc: 'Revenue ×2, Reputation −10. It\'s single-player. The pass is multiplayer.' },
    { id: 'u_pause',   name: 'Premium Currency in the Pause Menu', icon: '⏸️', cost: 1e23, stage: 6, eff: { rev: 2 }, desc: 'Revenue ×2. Pausing costs 1 Gem. Unpausing is free (for now).' },
    { id: 'u_saves',   name: 'Sell Save Slots',           icon: '💾', cost: 1e24,   stage: 6, eff: { 'seg:dolphin': 2, rep: -6 }, desc: 'Dolphin share ×2. Slot 1 is free. Slot 1 is also deleted on exit.' },
    { id: 'u_classic', name: 'Sell "Classic Graphics"',   icon: '🖼️', cost: 1e25,   stage: 6, eff: { rev: 2 }, desc: 'Revenue ×2. The old graphics, which we removed, are back. $9.99.' },
    { id: 'u_travel',  name: 'Charge for Fast Travel',    icon: '🐎', cost: 1e26,   stage: 6, eff: { rev: 3, rep: -8 }, desc: 'Revenue ×3. Walking is still free. Walking is 40 minutes.' },
    { id: 'u_settings',name: 'Monetize the Settings Menu', icon: '⚙️', cost: 1e27,  stage: 6, eff: { rev: 3, rep: -8 }, desc: 'Revenue ×3. Brightness slider: free. The other half of the slider: $1.99.' },
    { id: 'u_immersive', name: 'Immersive Native Brand Integration', icon: '🧃', cost: 1e28, stage: 6, eff: { ad: 2 }, adChain: 4, desc: 'The hero drinks a soda now. Ad revenue ×2.' },
    { id: 'u_bpbp',    name: 'Battle Pass for the Battle Pass', icon: '♾️', cost: 1e29, stage: 6, eff: { bpxp: 4, rev: 2 }, desc: 'Battle Pass XP ×4, Revenue ×2. We are not sure what it does either.' },
  ],

  // Research (paid with Data). One-time.
  research: [
    { id: 'r_ab',      name: 'A/B Test Button Colors',     icon: '🎨', cost: 500,     eff: { rev: 1.25 },        desc: 'Revenue ×1.25. Green "BUY" outperforms grey "no thanks" (now 6pt font).' },
    { id: 'r_churn',   name: 'Churn Prediction Model',     icon: '🔮', cost: 5e3,    eff: { churn: 0.85 },      desc: 'Churn ×0.85. We send "we miss you" exactly 1 hour before you leave.' },
    { id: 'r_session', name: 'Session Length Optimization', icon: '⏰', cost: 3e4,  eff: { eng: 1.5 },         desc: 'Engagement ×1.5. Removed the "you have been playing for 6 hours" reminder.' },
    { id: 'r_fomo',    name: 'FOMO Engineering',           icon: '😱', cost: 2e5,    eff: { offers: 2, 'seg:minnow': 1.5 }, desc: 'Offers ×2, minnow share ×1.5.' },
    { id: 'r_whale',   name: 'Whale Sonar',                icon: '🔊', cost: 1e6,    eff: { 'seg:whale': 1.5, whale: 1.5 }, desc: 'Whale share ×1.5, whale sightings ×1.5.' },
    { id: 'r_dark',    name: 'Dark Pattern Library',       icon: '🕳️', cost: 5e6,    eff: { rev: 1.5, rep: -6 }, desc: 'Revenue ×1.5, Reputation target −6. The "Cancel" button is now a maze.' },
    { id: 'r_pass',    name: 'Battle Pass Pacing Study',   icon: '📈', cost: 3e7,    eff: { bpxp: 2 },          desc: 'Battle Pass XP ×2. Level 99 is now exactly 4% too far.' },
    { id: 'r_engage',  name: 'Engagement Optimization',    icon: '🔁', cost: 2e8,    eff: { eng: 2 },           desc: 'Engagement ×2. Notifications at 3:07 AM perform best.' },
    { id: 'r_price',   name: 'Price Anchoring',            icon: '⚓', cost: 1e9,    eff: { rev: 2 },           desc: 'Revenue ×2. Every item now has a "was $199.99".' },
    { id: 'r_whale2',  name: 'Whale Husbandry',            icon: '🐳', cost: 5e9,   eff: { 'seg:whale': 2 },   desc: 'Whale share ×2.' },
  ],

  // Portfolio (Stage 3): your other fictional games. Each level: +bonus to one thing.
  games: [
    { id: 'kc',  name: 'Kingdom Clash',      icon: '🏰', cost: 5e10,   growth: 3, eff: 'inst',        per: 0.25, desc: 'Lots of players. Installs +25% per level.' },
    { id: 'zs',  name: 'Zombie Survivor 47', icon: '🧟', cost: 3e11,   growth: 3, eff: 'ad',          per: 0.30, desc: 'Ad impressions. Ad revenue +30% per level.' },
    { id: 'dh',  name: 'Dragon Heroes',      icon: '🐲', cost: 2e12,   growth: 3, eff: 'seg:whale',   per: 0.20, desc: 'Attracts whales. Whale share +20% per level.' },
    { id: 'fe',  name: 'Farm Empire',        icon: '🌾', cost: 1e13,   growth: 3, eff: 'churn',       per: 0.06, desc: 'Great retention. Churn −6% per level.' },
    { id: 'wc',  name: 'Waifu Commander',    icon: '💘', cost: 6e13, growth: 3, eff: 'eng',         per: 0.30, desc: 'Engagement +30% per level.' },
    { id: 'gl',  name: 'Galaxy Lords',       icon: '🚀', cost: 4e14,   growth: 3, eff: 'data',        per: 0.40, desc: 'Data +40% per level.' },
  ],

  // ---------- Battle Pass ----------
  pass: {
    levels: 30,
    xpBase: 60, xpGrowth: 1.09, seasonGrowth: 1.7,   // XP for level L of season s: xpBase × xpGrowth^L × seasonGrowth^(s−1)
    xpFromEngagement: 0.6, xpExp: 0.3,               // XP / s = xpFromEngagement × (Engagement/s)^xpExp
    seasonBonus: 0.10,                               // +10% revenue per completed season (this game)
    levelBonus: 0.01,                                // +1% revenue per premium-lane reward claimed (this game)
    lanes: [
      { id: 'free',    name: 'Free',          cost: 0,     color: '#8aa0b8' },
      { id: 'premium', name: 'Premium',       cost: 2e10, color: '#f2b631' },
      { id: 'plus',    name: 'Premium+',      cost: 5e11,  color: '#ff7a3c' },
      { id: 'deluxe',  name: 'Premium Deluxe', cost: 2e13,  color: '#e0469b' },
      { id: 'ultimate',name: 'Ultimate Premium', cost: 1e15, color: '#9b5cff' },
      { id: 'omega',   name: 'Ultimate Premium Founders Edition', cost: 1e17, color: '#2fd3c4' },
    ],
    laneRevMult: 1.5,     // each launched lane: Battle Pass feature revenue ×1.5 (more tiers to sell)
    bppCost: 3e12,         // Battle Pass Pass
    bppPlusCost: 1e16,    // Battle Pass Pass Plus
    managerCost: 1e14,    // Battle Pass Manager (auto-claims)
    bppPerLevel: 0.15,    // +15% Battle Pass XP per Battle Pass Pass level
  },

  // ---------- currencies (persist across sequels: they are "account" currencies) ----------
  currencies: {
    coins:    { name: 'Coins',            icon: '🪙' },
    gems:     { name: 'Gems',             icon: '💎' },
    crystals: { name: 'Crystals',         icon: '🔮' },
    platinum: { name: 'Platinum Tokens',  icon: '💿' },
    stars:    { name: 'Battle Stars',     icon: '⭐', joke: true },
    sstars:   { name: 'Super Battle Stars', icon: '🌟', joke: true },
    season:   { name: 'Season Tokens',    icon: '🎟️', joke: true },
    event:    { name: 'Event Tokens',     icon: '🎪', joke: true },
    founder:  { name: 'Founder Tokens',   icon: '🏅', joke: true },
  },
  // Exchange: deliberately terrible rates.
  exchange: [
    { from: 'coins',    give: 100, to: 'gems',     get: 1 },
    { from: 'gems',     give: 73,  to: 'crystals', get: 1 },
    { from: 'crystals', give: 8,   to: 'platinum', get: 3 },
    { from: 'stars',    give: 1000, to: 'sstars',  get: 1 },
    { from: 'sstars',   give: 3,   to: 'gems',     get: 2 },
    { from: 'season',   give: 17,  to: 'event',    get: 4 },
    { from: 'event',    give: 9,   to: 'founder',  get: 1 },
    { from: 'founder',  give: 2,   to: 'crystals', get: 1 },
    { from: 'gems',     give: 1,   to: 'coins',    get: 12, note: 'Buy back! (at 12% of what you paid)' },
  ],
  coinRate: 0.05, coinExp: 0.5, // Coins / s once Premium Currency exists = coinRate × (Engagement/s)^coinExp

  boosters: [
    { id: 'b_inst', name: 'Install Frenzy',       icon: '🚀', gems: 30,  secs: 300, eff: 'inst', mult: 3, desc: 'Installs ×3 for 5 min.' },
    { id: 'b_rev',  name: 'Revenue Rush',         icon: '💸', gems: 50,  secs: 300, eff: 'rev',  mult: 2, desc: 'Revenue ×2 for 5 min.' },
    { id: 'b_eng',  name: 'Engagement Overdrive', icon: '🔥', gems: 25,  secs: 300, eff: 'eng',  mult: 2, desc: 'Engagement ×2 for 5 min.' },
    { id: 'b_skip', name: 'Skip Timer (10 min)',  icon: '⏩', gems: 120, secs: 0,   skip: 600,        desc: 'Instantly earn 10 minutes of Revenue.' },
  ],

  lootbox: { cost: 1, costCur: 'crystals', inflation: 1.3 }, // price × 1.3 per cosmetic owned ("adjusted for inflation")
  cosmetics: [
    { id: 'c_hat',    name: 'Slightly Different Hat',   icon: '🎩', rar: 'Common',    eff: 'rev',   per: 0.03 },
    { id: 'c_icon',   name: 'Player Icon #4,417',       icon: '🙂', rar: 'Common',    eff: 'eng',   per: 0.03 },
    { id: 'c_border', name: 'Gold Profile Border',      icon: '🖼️', rar: 'Common',    eff: 'inst',  per: 0.03 },
    { id: 'c_emote',  name: 'Dab Emote',                icon: '🕺', rar: 'Common',    eff: 'bpxp',  per: 0.05 },
    { id: 'c_spray',  name: 'Spray: "gg ez"',           icon: '🖌️', rar: 'Common',    eff: 'rev',   per: 0.03 },
    { id: 'c_banner', name: 'Banner: Season 3 Veteran', icon: '🏳️', rar: 'Rare',      eff: 'inst',  per: 0.06 },
    { id: 'c_trail',  name: 'Sparkle Trail',            icon: '✨', rar: 'Rare',      eff: 'eng',   per: 0.06 },
    { id: 'c_pet',    name: 'Pet Rock (Animated)',      icon: '🪨', rar: 'Rare',      eff: 'rev',   per: 0.06 },
    { id: 'c_horse',  name: 'Horse Armor',              icon: '🐴', rar: 'Rare',      eff: 'whale', per: 0.10 },
    { id: 'c_skin',   name: 'Neon Dragon Skin',         icon: '🐉', rar: 'Epic',      eff: 'rev',   per: 0.12 },
    { id: 'c_wings',  name: 'Wings (Do Not Fly)',       icon: '🪽', rar: 'Epic',      eff: 'inst',  per: 0.12 },
    { id: 'c_aura',   name: 'Whale Aura',               icon: '🌊', rar: 'Epic',      eff: 'whale', per: 0.20 },
    { id: 'c_crown',  name: 'Crown of Microtransactions', icon: '👑', rar: 'Legendary', eff: 'rev', per: 0.25 },
    { id: 'c_gold',   name: 'Solid Gold Loading Screen', icon: '🏆', rar: 'Legendary', eff: 'eng', per: 0.25 },
    { id: 'c_myth',   name: 'Founder\'s Mythic Celestial Dragon Cape', icon: '🦄', rar: 'Mythic', eff: 'rev', per: 0.5 },
  ],
  rarity: { Common: 60, Rare: 25, Epic: 11, Legendary: 3.5, Mythic: 0.5 },

  vip: { costBase: 1, costGrowth: 1.8, rev: 0.10, whale: 0.05, autoWhaleAt: 3, bpxpAt: 5, autoPopupAt: 8 },

  // ---------- live ops ----------
  offers: {
    count: 3, minSecs: 120, maxSecs: 300, payMin: 45, payMax: 120, repHit: 1.5, gemChance: 0.5,
    names: ['Starter Bundle', 'Mega Starter Bundle', 'Ultimate Starter Bundle', 'Returning Player Bundle', 'New Player Bundle', 'Loyal Player Bundle', 'VIP Bundle', 'Weekend Bundle', '{DAY} Bundle', 'Welcome Back Bundle', 'We Miss You Bundle', 'Thank You Bundle', 'Apology Bundle', 'Anniversary Bundle', 'Pre-Anniversary Bundle', 'Last Chance Bundle', 'Last Chance Bundle (Again)'],
    suffixes: ['', ' II', ' Plus', ' Deluxe', ' (Final)', ' (Final Final)', ' Remastered', ' Reloaded'],
  },
  whale: { perWhaleChance: 0.00002, maxChance: 1 / 45, minGap: 40, value: 40, autoShare: 0.25, swimSecs: 9,
    kinds: [
      { id: 'whale', name: 'Whale', mult: 1, stage: 1, pack: 'ULTIMATE CELESTIAL DRAGON FOUNDERS PACK — $99.99' },
      { id: 'mega',  name: 'Mega Whale', mult: 8, stage: 5, chance: 0.15, pack: 'GALACTIC EMPEROR MEGA VAULT — $499.99' },
      { id: 'levi',  name: 'Leviathan', mult: 60, stage: 6, chance: 0.06, pack: 'EVERYTHING BUNDLE (INCLUDES FUTURE BUNDLES) — $9,999.99' },
    ] },
  events: {
    minGap: 120, maxGap: 240, firstAt: 90,
    list: [
      { id: 'influencer', name: 'Streamer Says "It\'s Actually Not That Bad"', icon: '📺', stage: 1, w: 3, secs: 60, inst: 4, text: '+300% installs for 60 seconds.' },
      { id: 'streamquit', name: 'Streamer Goes Back to the Game He Likes', icon: '😔', stage: 3, w: 1, secs: 60, inst: 0.6, text: 'Installs −40% for 60 seconds.' },
      { id: 'whale',      name: 'A Whale Appears!', icon: '🐋', stage: 4, w: 2, whale: true, text: 'Tap it before it swims away.' },
      { id: 'lawsuit',    name: 'Class-Action Lawsuit', icon: '⚖️', stage: 4, w: 2, secs: 90, rev: 0.7, text: 'Revenue −30% for 90 seconds.', choice: { label: 'Settle (no admission of wrongdoing)', costSecs: 60, text: 'Costs 60 s of Revenue. Ends it.' } },
      { id: 'viral',      name: 'Your Fake Ad Goes Viral', icon: '🌋', stage: 3, w: 2, needCh: 'fakeads', secs: 45, inst: 6, text: '+500% installs for 45 seconds. Nobody can beat level 3.' },
      { id: 'patch',      name: 'Patch Day Goes Well', icon: '🩹', stage: 1, w: 1, scandal: -10, text: 'Reputation +10. A rare and beautiful thing.' },
      { id: 'acq',        name: 'Major Publisher Offers Acquisition', icon: '🤝', stage: 4, era: 5, w: 1, offer: true, text: 'They promise nothing will change.',
        choices: [{ id: 'accept', label: 'Sell a division', text: 'Instant 5 min of Revenue. Reputation −10.' }, { id: 'decline', label: 'Decline politely', text: 'Reputation +5. Players respect it.' }] },
    ],
  },
  popups: {
    gap: 35, life: 14, max: 3,
    titles: ['WELCOME BACK!', 'DAILY REWARD!', 'NEW EVENT!', 'FLASH SALE!', 'BATTLE PASS LEVEL UP!', 'VIP REWARD!', 'LIMITED OFFER!', 'NEW COSMETIC!', 'CLAIM YOUR FREE CHEST!', 'YOU HAVE MAIL!', 'SPIN THE WHEEL!', 'DON\'T MISS OUT!', 'RATE US 5 STARS!', 'SEASON ENDING SOON!'],
  },
  daily: { rewards: [1, 2, 3, 4, 5, 6, 4], chestDay: 7, multPerUpgrade: 10 },

  // ---------- prestige: Launch a Sequel ----------
  sequel: {
    minRevenue: 0,        // (0.0.4: Shareholder Confidence comes from peak players, below)
    minPlayers: 1e7, minTarget: 3e7, beatBy: 1.5, maxTarget: 3e8, // the board approves a sequel at 1M players, then wants each sequel to beat the last one's peak by 50%
    k: 2, p: 0.5,        // Shareholder Confidence = floor(k × (peak players / minPlayers)^p): 2 at 1M, 4 at 4M, 8 at 16M
    perSC: 0.10,         // +10% Revenue and developer code per Shareholder Confidence ever earned
    perSCInst: 0.03,     // +3% installs per Shareholder Confidence
    titles: ['{T}', '{T} 2', '{T} 2.0', '{T}: Free-to-Play Relaunch', '{T} Mobile', '{T} Remastered (Servers Restored)', '{T} 3', '{T} 3: Season 0', '{T} Legends', '{T}: Reloaded', '{T} 4 (Live Service Edition)', '{T}: The Final Season', '{T}: The Final Season 2', '{T} Forever', '{T} Forever 2'],
    baseTitle: 'Extraction Royale',
    appIcon: '🪂',
  },
  board: [
    { id: 'synergy', name: 'Synergy',          icon: '🔗', cost: 1, growth: 2, per: 0.25,  eff: 'rev',  desc: 'Revenue +25% per rank.' },
    { id: 'brand',   name: 'Brand Recognition', icon: '™️', cost: 1, growth: 2, per: 0.25,  eff: 'inst', desc: 'Installs +25% per rank.' },
    { id: 'kpi',     name: 'Engagement KPIs',  icon: '📌', cost: 1, growth: 2, per: 0.25,  eff: 'eng',  desc: 'Engagement +25% per rank.' },
    { id: 'legacy',  name: 'Legacy Pass',      icon: '🎫', cost: 2, growth: 2, per: 0.25,  eff: 'bpxp', desc: 'Battle Pass XP +25% per rank.' },
    { id: 'crisis',  name: 'Crisis Comms',     icon: '🧯', cost: 2, growth: 2, per: 5,    eff: 'rep',  max: 6, desc: 'Reputation target +5 per rank.' },
    { id: 'sonar',   name: 'Whale Sonar Array', icon: '📡', cost: 3, growth: 2, per: 0.3, eff: 'seg:whale', desc: 'Whale share +30% per rank.' },
    { id: 'reuse',   name: 'Reuse the Same Map', icon: '♻️', cost: 3, growth: 3, per: 1,    eff: 'reuse', max: 6, desc: 'Each sequel starts with one more feature already shipped. (Don\'t reinvent systems you already have.)' },
    { id: 'rehire',  name: 'Rehire Contractors at 60%', icon: '📉', cost: 2, growth: 2, per: 3, eff: 'rehire', max: 10, desc: 'Each sequel starts with 3 more Middle Managers per rank. Same people, new badges.' },
    { id: 'parachute', name: 'Golden Parachute', icon: '🪂', cost: 2, growth: 3, per: 1,  eff: 'start', max: 8, desc: 'Each sequel starts with ×10 more starting cash per rank (from $5,000).' },
  ],

  achievements: [
    { id: 'a_first',   name: 'Hello World',                 desc: 'Get your first player.',               test: s => s.lifeInstalls >= 1 },
    { id: 'a_1k',      name: 'Thousand Club',               desc: 'Reach 1,000 active players.',          test: s => s.players >= 1000 },
    { id: 'a_studio',  name: 'We\'re a Studio Now',         desc: 'Become a Mobile Game Studio.',         test: s => s.stage >= 3 },
    { id: 'a_pass',    name: 'A Sense of Pride and Accomplishment', desc: 'Launch your first Battle Pass.', test: s => s.devd.bpass },
    { id: 'a_loot',    name: 'Surprise Mechanics',          desc: 'Unlock loot boxes.',                   test: s => s.devd.lootbox },
    { id: 'a_1m',      name: 'Think of the Shareholders',   desc: 'Reach $1M revenue.',                   test: s => s.life >= 1e6 },
    { id: 'a_phones',  name: 'Do You Guys Not Have Phones?', desc: 'Reach 1 million active players.',     test: s => s.players >= 1e6 },
    { id: 'a_cosm',    name: 'It\'s Only Cosmetic',         desc: 'Sell your first gameplay-affecting cosmetic.', test: s => s.devd.cosm },
    { id: 'a_free',    name: 'Free-to-Play',                desc: 'Make the game free.',                  test: s => s.f2p },
    { id: 'a_deluxe',  name: 'Deluxe Edition of a Free Game', desc: 'Sell a Deluxe Edition of a free game.', test: s => s.devd.deluxe },
    { id: 'a_bomb',    name: 'We Hear You',                 desc: 'Defuse 5 review bombs.',               test: s => s.bombsDefused >= 5 },
    { id: 'a_p2w',     name: 'Pay to Have Won',             desc: 'Stock 4 pay-to-win items at once.',    test: s => s.p2w >= 4 },
    { id: 'a_limited', name: 'Limited Forever',             desc: 'Run the same limited-time offer 10 times.', test: s => s.maxOfferRuns >= 10 },
    { id: 'a_whale',   name: 'Whale Watching',              desc: 'Acquire your first Whale.',            test: s => s.whales >= 1 },
    { id: 'a_blows',   name: 'There She Blows',             desc: 'Acquire 100 Whales.',                  test: s => s.whales >= 100 },

    { id: 'a_season3', name: 'Same Content, New Number',    desc: 'Complete 3 Battle Pass seasons in one game.', test: s => s.seasonsDone >= 3 },
    { id: 'a_rep0',    name: 'Overwhelmingly Negative',     desc: 'Let Reputation fall below 5.',         test: s => s.rep < 5 },
    { id: 'a_rep100',  name: 'Actually Beloved',            desc: 'Reach 95 Reputation with $1M+ revenue.', test: s => s.rep >= 95 && s.life >= 1e6 },
    { id: 'a_removeads', name: 'Ads Removed (Ads Remain)',  desc: 'Sell "Remove Ads".',                   test: s => s.adChain >= 1 },
    { id: 'a_seq',     name: 'Restructuring',               desc: 'Lay everyone off to make a sequel.',  test: s => s.sequel >= 2 },
    { id: 'a_seq5',    name: 'Live Service Relaunch',       desc: 'Launch 7 games.',                      test: s => s.sequel >= 8 },


    { id: 'a_mtx',     name: 'MTX GLOBAL',                  desc: 'Become MTX GLOBAL INTERACTIVE ENTERTAINMENT HOLDINGS LLC.', test: s => s.stage >= 6 },

    { id: 'a_tap',     name: 'Ten Thousand Lines',          desc: 'Tap Write Code 500 times.',          test: s => s.taps >= 500 },

    { id: 'a_phones2', name: 'We Listened to Feedback',     desc: 'Make 10 announcements on the Showcase stage.', test: s => s.panders >= 10 },
    { id: 'a_mgr',     name: 'Middle Management',           desc: 'Hire 10 Middle Managers.',             test: s => s.mgr >= 10 },
    { id: 'a_pizza',   name: 'There Are 3 Slices',          desc: 'Hold a pizza party.',                  test: s => s.pizzas >= 1 },
  ],
  achievementBonus: 0.03, // +3% Revenue per achievement (permanent)

  adConcepts: [
    { id: 'lava',   title: '99% OF PLAYERS CAN\'T BEAT LEVEL 3', a: '🌋 LAVA', b: '💰 TREASURE', hero: '🧍' },
    { id: 'army',   title: 'ONLY A GENIUS CAN SOLVE THIS',       a: '+5 ARMY', b: '×100 ARMY', hero: '🪖' },
    { id: 'pin',    title: 'PULL THE RIGHT PIN!',                a: 'PIN 1 🔥', b: 'PIN 2 💎', hero: '🤴' },
    { id: 'crook',  title: 'LEVEL 1 CROOK → LEVEL 100 BOSS',     a: '🦹 Lv 1', b: '🕴️ Lv 100', hero: '' },
    { id: 'cold',   title: 'HELP THEM SURVIVE THE WINTER',       a: '🪵 FIRE', b: '🧊 ICE', hero: '🥶' },
  ],

  // ---------- the triangle (Alpha 0.6.0): Development ⇄ Finance ⇄ Community ----------
  // ---------- players first (Alpha 0.0.4) ----------
  // Every player who installs a paid game pays its price. Higher prices sell fewer copies, and the steeper ones
  // depend more on your rating (demand × (stars/3)^(step+1)). Going free-to-play is a one-way trip that opens ads.
  price: {
    ladder: [
      // d: share of interested people who buy · keep: churn multiplier (people who paid more keep playing longer: sunk cost)
      { p: 4.99,  d: 0.30, keep: 1.0,  label: '$4.99',  note: 'Impulse buy · players drift off' },
      { p: 19.99, d: 0.12, keep: 0.55, label: '$19.99', note: 'Indie price · players stick around' },
      { p: 59.99, d: 0.04, keep: 0.3,  label: '$59.99', note: 'Full price · players stay for months' },
      { p: 69.99, d: 0.03, keep: 0.25, label: '$69.99', note: 'Deluxe (same game) · they will finish it' },
    ],
    sale: { options: [{ off: 0.25, secs: 180 }, { off: 0.5, secs: 120 }, { off: 0.75, secs: 60 }], elastic: 0.8, hype: 1.25, cooldown: 300, fatigue: 0.08, fatigueMax: 0.4, fatigueTau: 600 }, // installs × (1/(1−off))^elastic × hype on sale; each sale teaches players to wait (full-price demand −12%, fading)
    storeBase: 0.8,   // installs/s from people browsing the store, before price
    womSqrt: 0.03,     // word of mouth: + this × √players
    market: 3e7,       // everyone who will ever play a shooter: installs × (1 − players / market)
    goodPressMax: 15,  // good press can lift the rating by at most this much
    f2pAfterPlayers: 0, // shown once the quest asks for it
  },
  tapBurst: { codeSecs: 2, adSecs: 2, adFloor: 0.3 }, // a tap is worth this many seconds of the matching rate (taps stay a boost all game)
  ads: { perLoad: 0.0003 }, // ads already in the game: $/s per player per unit of Ad Load
  shop: { ratingPow: 1, p2wRep: 7.5, p2wExp: 1.3 }, // shop/P2W revenue × ((stars−1)/3)^ratingPow; P2W extra rating cost = 7.5 × items^1.3 (7.5 = 0.3★)
  // ---------- incidents (Alpha 0.1.0): one problem (or opportunity) at a time, on one tab at a time. Fixed by you, not a timer ----------
  // fix keys: code = Write Code taps, fin = Finance taps (Promote / Put Ad in Game), reply = Respond to Comment taps, patch = game feature patches.
  //   Tap counts scale with the company: ×tapScale[stage] (stage 4+ = full).
  // fx keys (while unfixed): inst, code (developers), churn, ad (ad income), rev (shop and ads), sales (copy sales), rep (rating points off)
  // reward (on fix): players = seconds of installs come back · codeSecs / cashSecs = seconds of output · press = good press (rating points) ·
  //   queued = the sales that were stuck · boost = { inst, secs } a burst
  // good: an opportunity (green card). It expires after oppSecs if you ignore it; nothing bad happens.
  // reasons: a string, or [text, minimum era]
  incidents: {
    gapEarly: [180, 300], gap: [120, 240], earlyUntil: 1800, firstAt: 20, fixBonus: 3, oppSecs: 90, oppShare: 0.3,
    tapScale: { 1: 0.4, 2: 0.4, 3: 0.7 },
    list: [
      { id: 'outage', tab: 'dev', name: 'Server Outage', icon: '🔥', w: 3, fx: { inst: 0.2 }, fix: { code: 100 }, reward: { players: 60 },
        effect: 'New players can\'t log in: installs −80%.', how: 'Write Code {code} times to push a hotfix.', rewardText: 'The players who couldn\'t log in come back.',
        reasons: ['The login server is on fire', 'Someone tripped over the server cable', ['The cloud is down. All of it', 2], 'An intern ran the database migration on the live servers', 'The servers were "temporarily" a laptop'] },
      { id: 'merge', tab: 'dev', name: 'Merge Conflict', icon: '🔀', w: 2, when: 'devs', fx: { code: 0 }, fix: { code: 60 }, reward: { codeSecs: 60 },
        effect: 'Your developers write no code until it is settled.', how: 'Write Code {code} times and settle it yourself.', rewardText: 'The merged code ships: a minute of your team\'s code at once.',
        reasons: ['Two developers edited the same file. Neither will back down', 'Someone renamed every variable to "x"', 'The tabs-vs-spaces argument is back', 'A 4,000-line pull request titled "small fix"'] },
      { id: 'exploit', tab: 'dev', name: 'Game-Breaking Bug', icon: '🐛', w: 2, when: 'patchable', fx: { churn: 2 }, fix: { patch: 1, code: 20 }, reward: { press: 6 },
        effect: 'Players quit twice as fast.', how: 'Write Code {code} times to find it, then ship any patch.', rewardText: 'The patch notes go viral: good press.',
        reasons: ['The final boss can be killed with a door', 'Jumping while reloading crashes the game', 'Saving the game deletes the game', ['Players found a way to fall through the map into the shop', 4]] },
      { id: 'payments', tab: 'fin', name: 'Payment Processor Down', icon: '💳', w: 3, when: 'paid', fx: { sales: 0 }, fix: { fin: 50 }, reward: { queued: true },
        effect: 'Players can install the game, but nobody can pay: sales earn $0.', how: '{fin} {fin#} times while on hold with the bank.', rewardText: 'Every sale that got stuck goes through at once.',
        reasons: ['The payment company is "experiencing high call volumes"', 'Your merchant account was flagged for "suspicious success"', 'The bank thinks Extraction Royale is a scam. Fair'] },
      { id: 'adnet', tab: 'fin', name: 'Ad Network Down', icon: '📉', w: 3, era: 2, when: 'ads', fx: { ad: 0 }, fix: { fin: 40 }, reward: { cashSecs: 45 },
        effect: 'Ads show a gray box and pay nothing.', how: 'Put Ad in Game {fin#} times: sell the ad slots by hand.', rewardText: 'The network pays a make-good: 45 seconds of revenue.',
        reasons: ['The ad network went down for "maintenance"', 'Every ad is now an ad for the ad network', 'The ad SDK updated itself and forgot how to show ads'] },
      { id: 'investors', tab: 'fin', name: 'Investor Call', icon: '📞', w: 2, era: 3, fx: { rev: 0.5, sales: 0.5 }, fix: { code: 25, fin: 25, reply: 25 }, reward: { cashSecs: 90 },
        effect: 'The board froze half the budget: revenue −50%.', how: 'They want "a story": Write Code {code}, {fin} {fin#} and Respond to Comment {reply} times.', rewardText: 'The board loves the story: 90 seconds of revenue.',
        reasons: ['An investor asked what the game is "about"', 'The board read an article about AI', 'An investor\'s kid said the game is "mid"'] },
      { id: 'lawsuit', tab: 'fin', name: 'Class-Action Lawsuit', icon: '⚖️', w: 2, era: 4, fx: { rev: 0.7 }, fix: { fin: 60 }, reward: { press: 4 },
        effect: 'Revenue −30% while the lawyers bill.', how: '{fin} {fin#} times to pay for the settlement (no admission of wrongdoing).', rewardText: 'Settled. Nobody admits anything.',
        reasons: ['Players sued over the loot box odds', 'A parent found 400 dollars of skins on their card', 'The "limited" offer has run for nine years'] },
      { id: 'bomb', tab: 'com', name: 'Review Bomb', icon: '💣', w: 3, bomb: true },
      { id: 'leak', tab: 'com', name: 'Roadmap Leak', icon: '📜', w: 2, era: 2, fx: { rep: 10, inst: 0.8 }, fix: { reply: 40 }, reward: { press: 8 },
        effect: 'Rating −0.5★ and installs −20% while it trends.', how: 'Respond to Comment {reply} times until it stops trending.', rewardText: 'You turned it into hype: good press.',
        reasons: ['A leaked slide says "Phase 3: monetize the menu"', ['Someone leaked the next season. It is this season', 4], ['Someone leaked the roadmap. It is the word "skins", 40 times', 4], 'The leaked roadmap has a mobile version on it'] },
      { id: 'drama', tab: 'com', name: 'Streamer Drama', icon: '🎙️', w: 2, era: 2, when: 'streamers', fx: { inst: 0.5 }, fix: { reply: 25, fin: 25 }, reward: { players: 45 },
        effect: 'Installs −50%: everyone is watching the clip instead.', how: 'Change the story: Respond to Comment {reply} times and {fin} {fin#} times.', rewardText: 'The apology stream does numbers: players come back.',
        reasons: ['Your cousin rage-quit live on Streamly', 'A streamer read the patch notes out loud. Slowly', ['A streamer found the "win more" button in the shop', 4]] },
      // opportunities (green): ignore them and nothing bad happens
      { id: 'shoutout', good: true, tab: 'fin', name: 'A Streamer Says "It\'s Actually Not That Bad"', icon: '📺', w: 3, fix: { fin: 30 }, reward: { boost: { inst: 3, secs: 60 } },
        effect: 'The clip is trending right now.', how: '{fin} {fin#} times while it trends.', rewardText: 'Installs ×3 for 60 seconds.',
        reasons: ['A big streamer tried it as a joke and kept playing', 'A streamer called it "a hidden gem" (it was not hidden)'] },
      { id: 'patchday', good: true, tab: 'dev', name: 'Patch Day Goes Well', icon: '🩹', w: 2, fix: { code: 30 }, reward: { press: 10 },
        effect: 'Everyone is watching the patch notes.', how: 'Write Code {code} times to ship a hotfix while they watch.', rewardText: 'Good press: the rating climbs for a few minutes.',
        reasons: ['The patch fixed more than it broke', 'The patch notes are funny for once'] },
      { id: 'fanart', good: true, tab: 'com', name: 'Fan Art Goes Viral', icon: '🎨', w: 2, fix: { reply: 25 }, reward: { press: 8, players: 20 },
        effect: 'Your hero is everywhere, drawn slightly wrong.', how: 'Respond to Comment {reply} times: thank everyone.', rewardText: 'Good press and new players.',
        reasons: ['Someone drew your hero as a cat', 'A fan animated the intro better than you did'] },
      { id: 'viral', good: true, tab: 'fin', era: 3, needCh: 'fakeads', name: 'Your Fake Ad Goes Viral', icon: '🌋', w: 2, fix: { fin: 30 }, reward: { boost: { inst: 5, secs: 45 } },
        effect: 'Nobody can beat level 3. Everybody wants to try.', how: '{fin} {fin#} times while it trends.', rewardText: 'Installs ×5 for 45 seconds.',
        reasons: ['"99% of players fail this level" hit 40 million views'] },
    ],
  },
  bomb: { minGap: 300, maxGap: 600, secs: 60, hit: 20, need: 13, defuseBonus: 3, p2wChance: 0.6,
    eraReasons: {
      1: ['A streamer said the ending is "in the DLC"', 'The final boss is a loading screen', 'The save file deleted itself at hour 30', 'Players found out the ending is a cliffhanger for the sequel'],
      2: ['Co-op needs an account, a launcher and a second launcher', 'Your friend can join, but cannot pick anything up', 'The co-op servers are in one city'],
      3: ['The raid needs 40 people and a spreadsheet', 'Players found the story moved to a wiki', 'Ranked matchmaking puts you against the developers'],
      5: ['The mobile version has an ad before the loading screen', 'The phone gets hot enough to cook on', 'Auto-play plays better than you'],
    },
    reasons: ['A streamer called the ads "actually insane"', 'Someone posted a 40-minute video about the shop', 'A patch broke the one map people liked', 'Players found out the "free" chest costs a video', 'A Reddit thread: "this game is a store with a game attached"', 'A clip of a player losing to a credit card went viral', 'The latest season is the last season with a new number', 'Someone did the maths on the Gems'] },
  triangle: {
    codePerTap: 1, epicSecsPerCommit: 0.15, gfGrowth: 1.15, repBase: 55,
    // Development staff tiers: code/s each, price (×growth per hire), salary per second (×salaryGrowth per hire in that tier)
    devTiers: [
      { id: 'jr',    name: 'Junior Developer',     icon: '🧑‍💻', code: 0.5, cost: 300, salary: 1.5, stage: 1, era: 1, desc: 'Eager. Writes code. Also writes bugs, which you can then fix.' },
      { id: 'sr',    name: 'Senior Developer',     icon: '🧔', code: 5, cost: 1500, salary: 8, stage: 1, era: 1, desc: 'Writes good code and long Slack messages about bad code.' },
      { id: 'studio',name: 'Contract Studio',      icon: '🏢', code: 50, cost: 200000, salary: 40,   stage: 1, era: 3, desc: 'Twelve people in another time zone. Standups at 6 AM.' },
      { id: 'out',   name: 'Outsourced Team',      icon: '🌏', code: 500, cost: 3e+07, salary: 500,  stage: 4, era: 4, desc: 'Ships fast. Ships exactly what the ticket says, word for word.' },
      { id: 'ai',    name: 'AI Code Assistant',    icon: '🤖', code: 5000, cost: 5e+09, salary: 6000, stage: 5, era: 5, desc: 'Writes 10,000 lines a minute. You now review 10,000 lines a minute.' },
      { id: 'acq',   name: 'An Acquired Studio',   icon: '🏰', code: 50000, cost: 5e+11, salary: 70000,  stage: 6, desc: 'They made a game you loved. Now they make your game.' },
    ],
    devGrowth: 1.13, salaryGrowth: 1.06,
    mgrDevBoost: 0.1,                                    // each Middle Manager: developers +20% code
    ad: { base: 0.3, perPlayer: 0.012, loadPerAd: 1, loadTau: 240, penalty: 6, penaltyScale: 12, passive: 0.005 }, // each ad in the game pays 0.5% of an ad tap per second while it lasts // Reputation −penalty × log2(1 + load / scale)
    adNetwork: { cost: 25, growth: 1.45, adsPerSec: 0.05 }, // 0.1.0: one network = ~12 Ad Load (was 48: a trap in the long paid eras)
    reply: { power: 1.5, trustLoss: 0.95, trustMin: 0.1, tau: 120, cap: 22 },      // each reply: +power × trust; trust ×0.95; a shipped patch sets trust back to 1
    cm: { cost: 60, growth: 1.55, repliesPerSec: 0.15 },
    qa: { name: 'QA Tester', icon: '🧪', cost: 400, growth: 1.25, salary: 2, salaryGrowth: 1.08, fix: 0.002, desc: 'Plays the game all day so players don\'t find the bugs first. Each one fixes 12% of your bugs a minute.' }, // Alpha 0.1.1
    bugs: { start: 1, perQ: 0.3, discover: 0.0004, earlyDiscover: 0.5, rep: 40, repMax: 30, churn: 1, minFix: 1 }, // bugs per Quality shipped · bugs found per Quality per second (scaled by players) · rating points per (bugs ÷ Quality) · churn × (1 + churn × ratio)
    quality: { start: 3, expectBase: 2.5, expectScale: 25, expectExp: 0.8, weight: 12, min: -45, max: 20 }, // Reputation + weight × log2(Quality / Expectations)
  },
  // Development: real game features. Each level is a patch: Quality +q, and players believe your replies again.
  // Bigger patches are a better deal per Quality (if you can afford them); every patch costs 15% more than the last, so the best deal moves. Each new stage's patches start at a higher price per Quality.
  // Two kinds of patch (Alpha 0.0.18). New Content raises Quality (more installs, a better rating) and adds bugs.
  // Bug Fixes remove a share of the bugs you have. Bugs, as a share of the game, make players quit and drag the rating down.
  // Bigger content is a better deal per Quality; every patch costs 15% more than the last, so the best deal moves.
  gameFeatures: [
    { id: 'bugs',   kind: 'fix', name: 'Fix Bugs',                icon: '🐛', fix: 0.15, cost: 6,     stage: 1, desc: 'Each fix makes the game better. Each fix also creates a new bug.' },
    { id: 'gun',    name: 'Add a Quest',              icon: '📜', q: 5,     cost: 27,    stage: 1, era: 1, quest: 'bug1', desc: 'Collect ten wolf pelts. The wolves have no pelts. Players are thrilled.' },
    { id: 'map',    name: 'Build a New Area',         icon: '🏞️', q: 25,    cost: 122,   stage: 1, era: 1, quest: 'p300', desc: 'A cave. Then a different cave.' },
    { id: 'net',    kind: 'fix', name: 'Rewrite the Netcode',     icon: '🌐', fix: 0.35, cost: 3e4, stage: 1, era: 2, desc: 'Fewer "I shot him first" clips. Not zero.' },
    { id: 'ranked', name: 'Ranked Mode',              icon: '🏆', q: 600,   cost: 1.8e5, stage: 3, era: 3, desc: 'Now players can be angry about their rank, too.' },
    { id: 'anti',   kind: 'fix', name: 'Anti-Cheat',              icon: '🛡️', fix: 0.6, cost: 8e6, stage: 1, era: 3, desc: 'Catches 40% of cheaters and 2% of honest players.' },
    { id: 'season', name: 'A Season of Real Content', icon: '🍂', q: 1.5e4, cost: 4.9e7, stage: 4, era: 4, desc: 'New maps, new modes, new things to do. Rare.' },
    { id: 'mode',   name: 'A Genuinely New Game Mode', icon: '🎲', q: 8e4,  cost: 3.3e9, stage: 5, era: 4, desc: 'Not a reskin. The team is suspicious.' },
    { id: 'engine', name: 'Move to a New Engine',     icon: '⚙️', q: 4e5,   cost: 1.5e10, stage: 5, era: 5, desc: 'Two years of work. Players notice the new menu font.' },
    { id: 'polish', kind: 'fix', name: 'Polish Everything',       icon: '✨', fix: 0.9, cost: 5e11, stage: 6, era: 5, desc: 'The thing players actually asked for, all along.' },
  ],
  // The three taps. The line under each changes every `lineEvery` taps so the joke can be read mid-tapping.
  taps: {
    lineEvery: 10,
    code: { label: 'Write Code', icon: '</>', floats: ['i++;', 'return true;', 'player.hp -= 10;', 'if (fun) ship();', '// TODO: fix later', 'x = x + 1;', 'jump();', 'gun.ammo--;', 'while (true) {}', 'console.log("here");', 'let score = 0;', 'fps = 60;', 'map.load("warehouse");', 'if (bug) ignore(bug);', 'enemy.die();', 'speed *= 1.1;', 'return null; // ?', 'loot.drop();', 'try { ship(); }', 'catch (e) {}', 'hitbox.grow(2);', 'reload();', 'player.respawn();', 'const fun = true;', 'save();', 'npc.say("hi");', 'sound.play("pew");', 'if (lag) blame();', 'menu.open();', 'pixels++;', 'door.open();', 'bullets.push(b);', 'rank.update();', 'delete bug;', 'quest.complete();', 'y -= gravity;', 'camera.shake();', 'chest.open();', 'level++;', '// it works, don\'t touch', 'ping = 12;', 'match.start();', 'xp += 50;', 'tree.render();', 'boss.hp = 9999;', 'grenade.throw();', 'skin.equip();', 'if (win) gg();', 'patch.notes = "";', 'deploy(friday);'], // a random line floats up on each tap
      lines: [
      ['Fixed a null reference', 'It was null. Now it is not.'], ['Added a gun', 'It is a slightly different gun.'], ['Rewrote the netcode', 'Again.'], ['Wrote a shader at 2 AM', 'Beautiful. Nobody will notice.'],
      ['Commented out a failing test', 'Green build!'], ['Tuned the jump arc', 'It feels great now. You know it does.'], ['Fixed the hitboxes', 'Players will still blame the hitboxes.'], ['Added a settings menu', 'It has a FOV slider. You are a hero.'],
      ['Refactored the inventory', 'It does the same thing, but cleaner.'], ['Fixed a memory leak', 'Found two more.'], ['Added controller support', 'The triggers are backwards.'], ['Optimized the loading screen', 'It now loads in 4 seconds. Marketing wants it longer.'],
      ['Wrote a TODO', '"// TODO: fix before launch" (2019)'], ['Merged on a Friday', 'Bold.'], ['Fixed the crash on startup', 'The crash on shutdown remains.'], ['Added a kill feed', 'Players now know exactly who to blame.'],
      ['Balanced the shotgun', 'Every forum is now about the shotgun.'], ['Wrote a unit test', 'Just the one.'], ['Fixed a typo in the main menu', '"Extration Royale". Since launch.'], ['Profiled the frame rate', 'It\'s the trees. It\'s always the trees.'],
      ['Added ragdoll physics', 'Bodies fly 400 meters. Keeping it.'], ['Rewrote the matchmaking', 'You now wait 4 minutes instead of 6.'], ['Fixed spawn camping', 'By moving the camp.'], ['Updated a dependency', 'Everything broke. Reverted.'],
    ] },
    ad: { label: 'Put Ad in Game', icon: '🪧', lines: [
      ['Added a banner under the jump button', '3% of jumps now open a browser.'], ['Put an ad on the loading screen', 'The loading screen is now longer.'], ['Added "watch an ad to revive"', 'Dying has never been so lucrative.'],
      ['Put an ad in the pause menu', 'Pausing now costs 30 seconds.'], ['Added a sponsored skybox', 'The sun is a soda can.'], ['Added an ad between rounds', 'The X appears after 31 seconds.'],
      ['Put a billboard on the map', 'Players shoot it. Impressions!'], ['Added an ad to the victory screen', 'You won! Here\'s a car insurance quote.'], ['Added a "free" chest', 'Free with one 30-second video.'],
      ['Put an ad in the kill cam', 'You died. Brought to you by Snacks.'], ['Added an ad to the settings menu', 'Volume slider sponsored by headphones.'], ['Added a pop-up on launch', 'It has another pop-up behind it.'],
      ['Added "double XP for one ad"', 'XP was halved yesterday.'], ['Sold the main menu music', 'It\'s a jingle now.'], ['Put an ad on a weapon skin', 'Your rifle sells mattresses.'], ['Added an ad to the friend list', 'Your best friend is an energy drink.'],
      ['Added a rewarded survey', 'Question 1: "Do you like ads?"'], ['Added an ad on the tutorial', 'Step 1: watch this ad.'], ['Added an interstitial after the interstitial', 'Ad-ception.'], ['Added an "ad-free" button', 'It plays an ad about the ad-free button.'],
    ] },
    reply: { label: 'Respond to Comment', icon: '💬', floats: ['We hear you.', 'Coming soon™', 'Thanks for the feedback!', 'We\'re looking into it.', 'That\'s coming in a future patch.', 'Working as intended.', 'We\'ve passed it on to the team.', 'Great question!', 'Stay tuned!', 'Have you tried restarting?', 'Your feedback is valuable to us.', 'Soon™', 'We can\'t share details yet.', 'This is a known issue.', 'Sorry for the inconvenience!', 'We love your passion!', 'Check out our roadmap!', 'Please file a support ticket.', 'Make sure your drivers are updated.', 'Glad you\'re enjoying it!', 'We\'re committed to the community.', 'Big things are coming.', 'We\'ll share more soon.', 'It\'s on our radar.', 'Thanks for your patience!', 'We appreciate you!', 'Noted!', 'We\'re listening.', 'Fix incoming.', 'Our team is on it.', 'Can you DM us?', 'That\'s not the experience we want.', 'Thanks for playing!', 'Love this energy!', 'We\'re aware.', 'More news this season.', 'Have you checked the FAQ?', 'Hotfix soon™', 'We\'re investigating.', 'Appreciate the report!', 'Can you send a clip?', 'Great catch!', 'Fair point!', 'We\'re taking this seriously.', 'Not a bug, a feature.', 'Keep the feedback coming!', 'We value every player.', 'Heard. Loud and clear.', 'Stay frosty, operator!', 'GG, and thanks!'], // a random PR reply floats up on each tap
      lines: [
      ['"We hear you."', 'Headphones were not on.'], ['"That\'s coming in a future patch."', 'Which patch? Yes.'], ['"We\'re looking into it."', 'Nobody is looking into it.'], ['"Thanks for the feedback!"', 'The feedback was a 4-page essay.'],
      ['"Please file a support ticket."', 'Ticket #48,113. Estimated reply: 2027.'], ['"Working as intended."', 'It is not working. It was not intended.'], ['"We\'ve passed it on to the team."', 'The team is one guy. He is on vacation.'], ['"Great question!"', 'No answer followed.'],
      ['"Stay tuned!"', 'Players have been tuned since launch.'], ['"Have you tried restarting?"', 'They have. Twice.'], ['"Your feedback is valuable to us."', 'Not valuable enough to read.'], ['"We\'re committed to the community."', 'Committed. Like a crime.'],
      ['"Soon™"', 'Trademark pending.'], ['"We can\'t share details yet."', 'There are no details.'], ['"This is a known issue."', 'Known since alpha.'], ['"Sorry for the inconvenience!"', 'The inconvenience was a 3-day outage.'],
      ['"We love your passion!"', 'The passion was in all caps.'], ['"Check out our roadmap!"', 'The roadmap says "TBD" six times.'], ['"Make sure your drivers are updated."', 'It\'s a server problem.'], ['"Glad you\'re enjoying it!"', 'It was a 1-star review.'],
    ] },
  },
  staff: {
    mgr: { name: 'Middle Manager', icon: '👔', cost: 120, growth: 1.75, speed: 0.25, desc: 'Each one makes the team ship 25% faster. Nobody knows how.' },
    teams: { name: 'Dev Team', icon: '👩‍💻', costs: [2e5, 5e9, 5e14, 5e19], max: 5, desc: 'Another team means another epic in progress at the same time.' },
    pizza: { name: 'Hold a Pizza Party', icon: '🍕', costSecs: 30, secs: 60, mult: 2, cooldown: 300, desc: 'Instead of raises. The team ships ×2 as fast for 60 seconds. There are 3 slices for 40 people.' },
  },
  // Timed work. Seconds at 1 manager-speed; each status line shows ~2.5 s.
  projects: {
    epicSecs: [8, 14, 22, 35, 50, 70, 95, 125, 160, 200, 240, 280, 320], // one per monetization feature, in order (Interstitial Ads first)
    decisionSecs: 4, laneSecs: 20,
    epicLines: ['Writing the epic…', 'Estimating story points…', 'Refinement meeting ran over', 'Arguing about the definition of done', 'Blocked by legal', 'Designer asked "but is it fun?"; moved on', 'Crunch (voluntary, mandatory)', 'QA found 400 bugs', 'Shipping anyway', 'Writing the patch notes: "improvements"'],
    decisionLines: ['Circulating for sign-off…', 'Legal is reviewing…', 'Waiting on a VP who is on vacation', 'Approved by someone'],
    laneLines: ['Designing the tier art…', 'Pricing it at $9.99, then $19.99', 'Adding "exclusive" to every item', 'Marketing named it'],
    retro: ['What went well: revenue. What didn\'t: everything else.', 'Action item: have fewer action items.', 'Team morale: "fine" (unanimous, anonymous).', 'Velocity up 4%. Nobody can explain velocity.', 'Shout-out to the QA team, who quit.'],
  },
  // Pandering: announcements on the Showcase stage. Some pay now and cost later.
  pander: [
    { id: 'listened', name: 'Say "We Listened to Feedback"', icon: '🙏', stage: 3, cd: 180, now: { scandal: -4 }, desc: 'Reputation +4. You did not read the feedback.' },
    { id: 'mobile',   name: 'Announce a Mobile Version at the PC Showcase', icon: '📱', stage: 3, cd: 240, now: { inst: 2, secs: 60, scandal: 15 }, desc: 'Installs ×2 for 60 s. Reputation −15. "Don\'t you guys have phones?"' },
    { id: 'nomtx',    name: 'Promise "No Microtransactions, Ever"', icon: '🤞', stage: 3, cd: 300, now: { scandal: -20 }, later: { after: 180, scandal: 35, text: 'Players found the microtransactions you promised wouldn\'t exist. Reputation −35.' }, desc: 'Reputation +20 now. In 3 minutes: Reputation −35.' },
    { id: 'roadmap',  name: 'Reveal a Year-One Roadmap', icon: '🗺️', stage: 3, cd: 300, now: { eng: 1.5, secs: 120 }, later: { after: 200, scandal: 15, text: 'Year one ended. The roadmap is still a roadmap. Reputation −15.' }, desc: 'Engagement ×1.5 for 2 min. Later: Reputation −15 when it doesn\'t ship.' },
    { id: 'fanfav',   name: 'Bring Back the Fan-Favorite Character', icon: '🦸', stage: 4, cd: 300, now: { scandal: -10, inst: 1.5, secs: 60 }, desc: 'Reputation +10, Installs ×1.5 for 60 s. She is now a $19.99 skin.' },
    { id: 'p2wmobile',name: 'Launch a Pay-to-Win Mobile Spin-off', icon: '💪', stage: 4, cd: 360, now: { rev: 2, secs: 60, scandal: 20 }, desc: 'Revenue ×2 for 60 s. Reputation −20. "It\'s not pay-to-win, it\'s pay-to-have-won."' },
    { id: 'dog',      name: 'Add a Dog You Can Pet', icon: '🐕', stage: 3, cd: 300, now: { scandal: -8, inst: 1.5, secs: 60 }, desc: 'Reputation +8, Installs ×1.5 for 60 s. Petting the dog costs nothing. Yet.' },
    { id: 'collab',   name: 'Announce a Fast-Food Collab', icon: '🍔', stage: 4, cd: 300, now: { inst: 2, secs: 60, scandal: 6 }, desc: 'Installs ×2 for 60 s. Reputation −6. Unlock a skin with every combo meal.' },
    { id: 'engine',   name: 'Say "Built From the Ground Up"', icon: '🏗️', stage: 4, cd: 360, now: { scandal: -12 }, later: { after: 150, scandal: 20, text: 'Dataminers found the old engine. And the old bugs. Reputation −20.' }, desc: 'Reputation +12 now. Dataminers exist.' },
    { id: 'crossplay',name: 'Announce Cross-Play With the Fridge', icon: '🧊', stage: 5, cd: 420, now: { inst: 2.5, secs: 60, scandal: 10 }, desc: 'Installs ×2.5 for 60 s. Reputation −10. Nobody asked. Everybody downloaded.' },
  ],

  // Player feed: what players post about Extraction Royale. Picked by situation; {name} = a handle.
  feed: {
    handles: ['xX_sweat_Xx', 'dadgamer1974', 'loot_goblin', 'NoLifeNick', 'casual_carla', 'Tryhard_Tim', 'ProbablyAFK', 'refund_pls', 'whale_watcher', 'm0m_of_3', 'grindset_gary', 'patchnotes_pam'],
    good: ['10/10 would grind again', 'honestly the best season so far', 'devs actually listen?? wild', 'my clan is back, LET\'S GO', 'ok the new map slaps', 'not gonna lie, I\'m hooked'],
    mid: ['it\'s fine. the battle pass is a lot', 'good game buried under 9 menus', 'why are there 4 currencies', 'played 3 hours, spent $0, felt watched', 'the gameplay is fun when it\'s not loading the store', 'can we get one (1) bug fix'],
    bad: ['1/5: I had to pay to open the settings', 'uninstalled. reinstalled. uninstalled.', 'this is a store with a game attached', 'the ads have ads now', 'refunded. oh wait, can\'t', 'I miss when this game was a game'],
    ship: ['new update just dropped: {feature}. here we go again', '{feature}?? in THIS economy??', 'patch notes say "improvements". it\'s {feature}.', 'nobody asked for {feature}. everybody is talking about it'],
    aggr: ['they made {feature} even worse overnight', 'was {feature} always this aggressive??', '{feature} now takes up half my screen'],
    pander: {
      listened: ['"we listened" ok then fix the servers', 'they listened! (they did not listen)'],
      mobile: ['DON\'T YOU GUYS HAVE PHONES', 'a mobile version. at a PC showcase. incredible', 'is this an out-of-season April Fools'],
      nomtx: ['NO MICROTRANSACTIONS?? preordering', 'screenshotting this promise for later'],
      roadmap: ['the roadmap looks huge actually', 'saving this roadmap. see you in a year'],
      fanfav: ['SHE\'S BACK 😭', 'wait why is she $19.99'],
      p2wmobile: ['a pay-to-win spin-off. of a pay-to-win game', 'my nephew beat me with his credit card'],
      crossplay: ['cross-play with... the fridge?', 'my fridge is now ranked higher than me'],
      dog: ['YOU CAN PET THE DOG', '10/10, dog is the best part of the game'],
      collab: ['why is there a burger in my battle royale', 'ate 9 combo meals for a hat'],
      engine: ['"built from the ground up" the ground is from 2014', 'ground up?? the bugs are the same bugs'],
    },
    backlash: ['called it. screenshot from 3 minutes ago:', 'they really thought we\'d forget', 'remember when they PROMISED'],
    code: ['the dev clearly loves this game', 'whoever fixed the hitboxes: thank you', 'patch notes were actually about the game?? wow', 'game feels so smooth now'],
    panderTap: ['they replied to my tweet!!', '"soon™" again', 'the devs are so active on social', 'is the social media guy ok'],
    sequel: ['they laid off the whole team and announced a sequel', 'new game, same game, new price', 'servers for the old one shut down tomorrow btw'],
    whale: ['someone just bought the $99.99 pack twice in a row', 'the whales are out today'],
    stream: ['watching my fav streamer pretend to like it', 'he said "it\'s actually not that bad" and I installed it, sue me'],
  },

  // ---------- quests: one on screen at a time, all the way to the first sequel (Alpha 0.0.4) ----------
  // Each quest opens the next system (has() keys off quest ids). Kept in meta, so sequels skip finished quests.
  // Quests (Alpha 0.1.0). The first 24 are the tutorial: the single-player era, one new thing each. After that, milestones grouped by era (ms).
  // A quest completes the moment you do it. One that is already done when it appears stays up for questMinSecs, so it isn't skipped unseen.
  // goal: 'taps' | 'gf:<id>' | 'priced' | 'sales' | 'devs' | 'players' | 'adTaps' | 'ft:<id>' (create the epic + first level) | 'stage' | 'replies'
  //       | 'stars' | 'ch:<id>' | 'bombs' | 'upg' | 'teams' | 'rps' | 'p2w' | 'whales' | 'offers' | 'seasons' | 'sequel' | 'named' | 'acct'
  //       | 'saleRuns' | 'dlcSold' | 'bugsUnder' (bugs < need % of the game) | 'incidents' | 'era' | 'cms' | 'videos' | 'subathons'
  questMinSecs: 2.5,
  tutorial: [
    { id: 'code', title: 'Write some code', goal: 'taps', need: 15, tab: 'dev', target: '#code-btn',
      text: 'You are making Extraction Royale, a story-heavy action RPG. You have $5,000 of startup money and an editor. Tap Write Code 15 times.', unlocks: 'Bug fixes' },
    { id: 'bug1', title: 'Fix your first bug', goal: 'gf:bugs', need: 1, tab: 'dev', target: '[data-act=gf][data-id=bugs]',
      text: 'The game already has a bug. Bugs make players quit and lower the rating. Spend your code on Fix Bugs.', unlocks: 'New content' },
    { id: 'quest1', title: 'Add a quest to the story', goal: 'gf:gun', need: 1, tab: 'dev', target: '[data-act=gf][data-id=gun]',
      text: 'New content raises Quality: more players, a better rating. It also adds a few bugs. That is game development.', unlocks: 'Hiring' },
    { id: 'hire', title: 'Hire a developer', goal: 'devs', need: 1, tab: 'dev', target: '[data-act=dev-hire]',
      text: 'Developers write code every second. Their salaries come out of your $5,000, every second, forever.', unlocks: 'A name for your studio' },
    { id: 'name', title: 'Name your studio', goal: 'named', need: 1, tab: 'dev', target: '#company', name: true,
      text: 'Untitled Game Studio has a game and an employee. It deserves a name. It goes on the box, the layoff memos and every sequel.', unlocks: 'The Finance tab' },
    { id: 'price', title: 'Put it on the store', goal: 'priced', need: 1, tab: 'fin', target: '#price-card',
      text: 'Pick a price. Cheaper sells more copies; pricier makes more per copy, and people who paid more play longer.', unlocks: 'Promote the Game' },
    { id: 'sell10', title: 'Sell 10 copies', goal: 'sales', need: 10, tab: 'fin', target: '#ad-btn',
      text: 'Nobody knows your game exists. Tap Promote the Game: every tap finds a few people, and some of them buy it.', unlocks: 'The App Store listing' },
    { id: 'p100', title: 'Reach 100 players', goal: 'players', need: 100, tab: 'fin', target: '[data-act=ch][data-id=store]',
      text: 'A store listing brings people every second, so you don\'t have to promote by hand forever.', unlocks: 'Sales' },
    { id: 'sale', title: 'Run a sale', goal: 'saleRuns', need: 1, tab: 'fin', target: '#sale-row',
      text: 'A lower price for a few minutes: more players now, less money per copy. Every sale teaches players to wait for the next one.', unlocks: 'Senior developers' },
    { id: 'p300', title: 'Reach 300 players', goal: 'players', need: 300, tab: 'fin', target: '#ad-btn',
      text: 'Promote, patch, run a sale. More players tell their friends.', unlocks: 'New areas' },
    { id: 'k1', title: 'Reach 600 players', goal: 'players', need: 600, tab: 'dev', target: '[data-act=gf][data-id=map]',
      text: 'Bigger content is the better deal per line of code. A new area makes the game worth telling people about.', unlocks: 'The Community tab' },
    { id: 'reply', title: 'Reply to 10 reviews', goal: 'replies', need: 10, tab: 'com', target: '#reply-btn',
      text: 'Replies raise your rating, but each one is believed a little less, until you ship a patch.', unlocks: 'Review bombs' },
    { id: 'cousin', title: 'Ask your cousin to stream it', goal: 'ch:xpromo', need: 1, tab: 'com', target: '[data-act=ch][data-id=xpromo]',
      text: 'Streamers bring players, and bring more of them when your rating is high. Your cousin has four viewers. One is his mom.', unlocks: '' },
    { id: 'bomb1', title: 'Survive a review bomb', goal: 'bombs', need: 1, tab: 'com', target: '#inc-card',
      text: 'Someone is angry about the ending. Reply fast, before the timer runs out.', unlocks: 'An accountant' },
    { id: 'acct', title: 'Hire an accountant', goal: 'acct', need: 1, tab: 'fin', target: '[data-act=acct]',
      text: 'Someone should look at the money. The accountant shows how long your cash will last, and has a suggestion.', unlocks: 'Story DLC' },
    { id: 'dlc', title: 'Build the story DLC', goal: 'ft:dlc', need: 1, tab: 'fin', target: '[data-act=dev][data-id=dlc], [data-act=ft][data-id=dlc]',
      text: 'Copy sales pay once. DLC pays again, from players who already own the game. Create the epic with code, wait for the team, then give it its first level.', unlocks: '' },
    { id: 'dlc100', title: 'Sell 100 copies of the DLC', goal: 'dlcSold', need: 100, tab: 'fin', target: '[data-act=ft][data-id=dlc]',
      text: 'Every DLC level launches with a burst of sales, then players keep buying a little every second. More players and a better rating: more DLC.', unlocks: 'QA testers' },
    { id: 'qa', title: 'Hire a QA tester', goal: 'qa', need: 1, tab: 'dev', target: '[data-act=qa]',
      text: 'Players keep finding bugs, and new content adds more. A QA tester fixes a few every second, so the game doesn\'t fall apart while you work on something else.', unlocks: '' },
    { id: 'fixes', title: 'Ship 4 bug fixes', goal: 'fixes', need: 4, tab: 'dev', target: '#fix-list',
      text: 'Bugs make players quit and drag the rating down. Fix Bugs removes 15% of them per patch. Keep the bug line green.', unlocks: '' },
    { id: 'area', title: 'Build 3 new areas', goal: 'gf:map', need: 3, tab: 'dev', target: '[data-act=gf][data-id=map]',
      text: 'Bigger content is the better deal per line of code. Somewhere around here, things start to break.', unlocks: 'Incidents' },
    { id: 'outage', title: 'Fix a server outage', goal: 'incidents', need: 1, tab: 'dev', target: '#inc-card',
      text: 'A single-player game has servers now, for some reason. They are down. The card says what to do.', unlocks: '' },
    { id: 'k10', title: 'Reach 8,000 players', goal: 'players', need: 8000, tab: 'fin', target: '#hub',
      text: 'Eight thousand people have finished your story. A single-player game can only grow so big. The board has an idea.', unlocks: 'The co-op relaunch (it unlocks at 8,000 players whatever the card says)' },
    { id: 'coop', title: 'Announce Extraction Royale: Co-op', goal: 'era', need: 2, tab: 'fin', target: '#era-btn',
      text: 'Same game, with a friend. Drop-in co-op needs servers, and servers need money.', unlocks: 'Co-op: ads, Season Pass, streamers' },
    { id: 'ads10', title: 'Put 10 ads in a game people paid for', goal: 'adTaps', need: 10, tab: 'fin', target: '#ad-btn',
      text: 'Co-op servers cost money every second. Ads earn from every player. Players who paid for the game hate them twice as much.', unlocks: 'Milestones' },

    // ----- milestones: Co-op -----
    { id: 'inter', ms: 2, title: 'Build Interstitial Ads', goal: 'ft:inter', need: 1, tab: 'fin', target: '[data-act=dev][data-id=inter], [data-act=ft][data-id=inter]', text: 'Ads that pay every second. The X appears after 31 seconds.' },
    { id: 'spass', ms: 2, title: 'Sell a Season Pass', goal: 'ft:spass', need: 1, tab: 'fin', target: '[data-act=dev][data-id=spass], [data-act=ft][data-id=spass]', text: 'Every DLC this year, paid for today. The DLC has not been made yet.' },
    { id: 'cm', ms: 2, title: 'Hire a Community Manager', goal: 'cms', need: 1, tab: 'com', target: '[data-act=cm]', text: 'Replies to reviews for you, all day. "We hear you."' },
    { id: 'devlog', ms: 2, title: 'Post a devlog on ToobVOD', goal: 'videos', need: 1, tab: 'com', target: '[data-act=video][data-id=devlog]', text: 'A video stays up. Its verdict is your rating on the day you post it.' },
    { id: 'rps', ms: 2, title: 'Make $500 a second', goal: 'rps', need: 500, tab: 'fin', target: '#k-rev', text: 'Ads, DLC, Season Pass. The board would like a number.' },
    { id: 'k100', ms: 2, title: 'Reach 100,000 players', goal: 'stage', need: 4, tab: 'fin', target: '#hub', text: 'Co-op tops out. Friends of friends of friends.' },
    { id: 'online', ms: 2, title: 'Announce Extraction Royale: Online', goal: 'era', need: 3, tab: 'fin', target: '#era-btn', text: 'A hub town, raids, ranked. The story is now "lore".' },
    // ----- milestones: Online -----
    { id: 'mmo', ms: 3, title: 'Launch a monthly subscription', goal: 'ft:mmo', need: 1, tab: 'fin', target: '[data-act=dev][data-id=mmo], [data-act=ft][data-id=mmo]', text: '$14.99 a month to play the game you bought.' },
    { id: 'ranked', ms: 3, title: 'Ship Ranked Mode', goal: 'gf:ranked', need: 1, tab: 'dev', target: '[data-act=gf][data-id=ranked]', text: 'Now players can be angry about their rank, too.' },
    { id: 'decide', ms: 3, title: 'Approve a corporate decision', goal: 'upg', need: 1, tab: 'fin', target: '#upg-list', text: 'Decisions take sign-off. Some make money and cost goodwill. Read the fine print.' },
    { id: 'team2', ms: 3, title: 'Hire a second dev team', goal: 'teams', need: 2, tab: 'dev', target: '[data-act=team]', text: 'Two epics at once. Twice the meetings.' },
    { id: 'subathon', ms: 3, title: 'Run a subathon on Streamly', goal: 'subathons', need: 1, tab: 'com', target: '[data-act=live][data-id=sub]', text: 'The stream runs until the timer does. Every reply keeps it going.' },
    { id: 'stars4', ms: 3, title: 'Get to 4 stars', goal: 'stars', need: 4, tab: 'com', target: '#rep-card', text: 'Ship content, fix bugs, pull an ad or two. The rating is a choice.' },
    { id: 'm1', ms: 3, title: 'Reach 1,000,000 players', goal: 'stage', need: 5, tab: 'fin', target: '#hub', text: 'Online tops out. The board has another idea.' },
    { id: 'f2p', ms: 3, title: 'Go free-to-play', goal: 'era', need: 4, tab: 'fin', target: '#era-btn', text: 'Everyone installs it. Nobody pays for it. The shop opens.' },
    // ----- milestones: Free-to-Play -----
    { id: 'skins', ms: 4, title: 'Stock your first skin', goal: 'ft:skins', need: 1, tab: 'fin', target: '[data-act=dev][data-id=skins], [data-act=ft][data-id=skins]', text: 'Your sword, but orange. $9.99.' },
    { id: 'bpass', ms: 4, title: 'Launch the Battle Pass', goal: 'ft:bpass', need: 1, tab: 'fin', target: '[data-act=dev][data-id=bpass], [data-act=ft][data-id=bpass]', text: 'Players pay, and stay: churn drops while a season runs.' },
    { id: 'season', ms: 4, title: 'Finish a Battle Pass season', goal: 'seasons', need: 1, tab: 'pass', target: '#bp-season', text: 'Season 2 is Season 1 with a new number.' },
    { id: 'whale', ms: 4, title: 'Catch a whale', goal: 'whales', need: 1, tab: 'fin', target: '#hub', text: 'Watch the water. Tap the whale before it swims away.' },
    { id: 'offer', ms: 4, title: 'Run a limited-time offer', goal: 'offers', need: 1, tab: 'fin', target: '#offer-list', text: 'Ends in 01:59:59. Has ended in 01:59:59 since launch.' },
    { id: 'p2w1', ms: 4, title: 'Stock a pay-to-win item', goal: 'p2w', need: 1, tab: 'fin', target: '#feature-list', text: 'Whales pay enormous sums. Every pay-to-win item costs more rating than the last.' },
    { id: 'm10', ms: 4, title: 'Reach 10,000,000 players', goal: 'stage', need: 6, tab: 'fin', target: '#hub', text: 'MTX GLOBAL. The board would like to talk about phones.' },
    { id: 'mobile', ms: 4, title: 'Port it to phones', goal: 'era', need: 5, tab: 'fin', target: '#era-btn', text: '"Don\'t you guys have phones?"' },
    // ----- milestones: Mobile -----
    { id: 'preinst', ms: 5, title: 'Get pre-installed on phones', goal: 'ch:preinst', need: 1, tab: 'fin', target: '[data-act=ch][data-id=preinst]', text: 'Cannot be uninstalled. Can be disabled. (It cannot be disabled.)' },
    { id: 'osupd', ms: 5, title: 'Ship a mandatory OS update', goal: 'ch:osupd', need: 1, tab: 'fin', target: '[data-act=ch][data-id=osupd]', text: 'Your phone restarts. Now it has our game.' },
    { id: 'sequel', ms: 5, title: 'Lay everyone off and make a sequel', goal: 'sequel', need: 2, tab: 'fin', target: '#seq-btn', text: 'Shareholder Confidence makes every future game earn more. The sequel starts as a single-player game, again.' },
    { id: 'm100', ms: 5, title: 'Reach 100,000,000 players', goal: 'players', need: 1e8, tab: 'fin', target: '#hub', text: 'Everyone with a phone. Please do not read the reviews.' },
  ],


  changelog: [
    ['Alpha 0.1.4', 'Cloud saves. On your first visit, sign in with Google to back up your studio and play on any device, or continue as a guest (saved on this device only). Sign in later from Settings or the avatar. Same system as Click to Conquer and Factory A.F.K.'],
    ['Alpha 0.1.3', 'Quests complete the moment you finish them (they used to wait up to 20 seconds). A quest that is already done when it appears shows a green Done! for a moment, then moves on.'],
    ['Alpha 0.1.2', 'New name and logo: Battle Pass: MTX (Maximum Transaction eXtraction™).'],
    ['Alpha 0.1.1', 'Fixes from the playthrough audit. The co-op relaunch unlocks at 8,000 players whatever quest you are on, and a lighter player gets there too: players who bought the story game stay longer, and Community opens at 600 players. New: QA Testers, who fix bugs every second. "Get bugs under 10%" is now "Ship 4 bug fixes". Milestones come in sets per era, in any order. The mobile ad channels cost what a mobile studio can pay. Goodwill can add at most +1.5 stars. "Players settle at" is smoothed. When the rating starts to fall, a message says why. Each DLC level launches with a burst of sales.'],
    ['Alpha 0.1.0', 'The five eras. Extraction Royale starts as a single-player story RPG and relaunches as Co-op, Online, Free-to-Play and finally Mobile ("Don\'t you guys have phones?"). Each relaunch is your call, on the players card: a bigger audience, new systems, and some upset fans. The tutorial is 24 quests, one new thing each, and each stays up long enough to read; after it, milestones by era. Story DLC replaces ads in the single-player game. Random events are now opportunities on the incident card, and fixing an incident pays off. Goodwill moved into ToobVOD and announcements into Streamly Live. New saves.'],
    ['Alpha 0.0.18', 'Bug Fixes and New Content are separate. New Content (guns, maps, modes) raises Quality and adds bugs. Bug Fixes remove a share of your bugs. Bugs, as a share of the game, make players quit faster and lower the rating, and players keep finding more. Put the game on sale: 25%, 50% or 75% off for a few minutes, with a burst of installs at a lower price. Each sale teaches players to wait for the next one.'],
    ['Alpha 0.0.17', 'Game feature patches make sense now: a bigger patch is a better deal per Quality, not a worse one. Each patch shows its price per Quality, and the cheapest one is tagged Best deal. Every patch still costs 15% more than the last, so the best deal moves around.'],
    ['Alpha 0.0.16', 'Incidents: every 2 to 4 minutes something goes wrong on one tab (Server Outage, Merge Conflict, Payment Processor Down, Ad Network Down, Investor Call, Review Bomb, Roadmap Leak, Streamer Drama). The card at the top of the tab says what happened, what it costs you, and how to fix it, usually by tapping. It lasts until you fix it. The tap button sits right under the tabs on every page. "Build" quests show both steps (create the epic, then give it its first level).'],
    ['Alpha 0.0.15', 'The players icon is electric blue so it is easy to read. Streamly has a red TV icon and ToobVOD a purple play button.'],
    ['Alpha 0.0.14', 'Community has Streamly Live and ToobVOD. Streamers are on Streamly now. Start a Subathon (installs ×2.5; every comment you reply to keeps it going) or run Streamly Drops (more installs and fewer players quit, until they see what the item is). On ToobVOD, post devlogs or pay for reviews: a video\'s verdict is your rating on upload day and it stays up. Review bombs that land now come with a "Is it a SCAM?" video.'],
    ['Alpha 0.0.13', 'Tap messages pop up above your finger instead of under it.'],
    ['Alpha 0.0.12', 'Promote floats a random clickbait hook ("Only 1% beat level 10!") and Respond to Comment floats a random PR reply ("Coming soon™"), 50 of each. The buttons still show what a tap gives.'],
    ['Alpha 0.0.11', 'Price buttons say what each number is (new players/min, sales/min, where players settle). Pricier copies keep players longer, so the cheapest price no longer wins on players by default. Hiring buttons show the hiring fee and the salary per second. The header is solid, so nothing shows through it.'],
    ['Alpha 0.0.10', 'A new opening. You start with $5,000 of startup money and a paid game. Promote the Game is the Finance tap until there are ads: every tap finds a few players. Developers draw real salaries, so the money burns. Around 1,000 players you hire an accountant, who shows your runway and suggests ads, which cost double the rating in a game people paid for. Players who paid stay twice as long. Free-to-play is the end of the tutorial, at 10,000 players, and opens the Cash Shop. 13 more quests fill the early game.'],
    ['Alpha 0.0.9', 'Buy buttons lead with what you get (big), with the cost underneath in a high-contrast chip.'],
    ['Alpha 0.0.8', 'Buy buttons say what they cost and what you get: a patch reads "−6 </> · +1 Quality", a hire "−$12 · +0.5 lines/s", a shop item "−50 </> · +$0.40/s", marketing "−$25 · +0.1 players/s".'],
    ['Alpha 0.0.7', 'Selling the game pays per copy: money arrives each time someone buys it, with a little "+$4.99 · sold!". Until you have ads or the shop, nothing pays you every second, so the money rate only shows payroll and real recurring revenue.'],
    ['Alpha 0.0.6', 'Write Code floats a random line of code (50 of them) on every tap. The button still says how many lines a tap gives.'],
    ['Alpha 0.0.5', 'Your studio starts as Untitled Game Studio. After your first hire, a quest asks you to name it; the name follows you through every stage (Name LLC, Initials Publishing Group…) and every sequel. Rename any time in Settings.'],
    ['Alpha 0.0.4', 'Players first. Stages are now player counts (1K, 10K, 100K, 1M, 10M) and a players card sits at the top of every tab. You set the price of the game, then go free-to-play for ads. New Cash Shop (skins, Battle Pass, Gems, a Deluxe Edition of a free game) and a Pay to Win shelf that costs more rating with every item. Taps are bursts of your whole operation, so they stay useful. Review bombs: reply fast enough and they blow over. A 39-quest chain replaces the tutorial and runs to the first sequel. Research, Portfolio, VIP, currencies and daily login are parked for now. New save.'],
    ['Alpha 0.6.1', 'Code now has a proper code icon (</>) and is counted in lines of code. Fixed: the first epic (Interstitial Ads) took 5 minutes to build instead of 8 seconds.'],
    ['Alpha 0.6.0', 'Rebuilt around three tabs and three taps. Development: Write Code to make the game better (Quality) and hire developers, who need salaries. Finance: Put Ad in Game for money, but every ad adds Ad Load and hurts your rating; monetization features earn every second. Community: Respond to Comment to raise your rating, but replies wear thin until you ship a patch. Players expect more the more of them there are. New save (0.5 saves do not carry over).'],
    ['Alpha 0.5.0', 'You are a game developer. Write Code is the honest tap: it raises Game Quality (Reputation), brings a few players and speeds up the epic in progress. Its name follows your role (Review Code, Approve a PR You Didn\'t Read…), and the joke under it changes every 10 taps. From Studio on, Pander to the Audience is a second tap: 4× the players, a little Reputation each time. Three new harmless Showcase announcements.'],
    ['Alpha 0.4.1', 'Tutorial "Show me" reliably scrolls to the button (clear of the header) and pulses it; if the button doesn\'t exist yet, it says why.'],
    ['Alpha 0.4.0', 'Slower game: less free income at the start ($10 starting cash, slower Word of Mouth, Engagement and ad revenue) and a later Mobile Publisher stage ($20T). Tutorial step 1 now explains Executive Action and asks for 15 taps. Reset no longer opens its confirmation behind Settings.'],
    ['Alpha 0.3.1', 'Buttons keep one size: a pending decision shows its status line where the description was.'],
    ['Alpha 0.3.0', 'You are the executive now. The game is Extraction Royale, a live-service shooter you never play. Taps are Executive Actions; epics and decisions take a few seconds (Middle Managers speed them up); pizza parties; streamers; the Showcase stage for pandering (some promises come back to bite); a player feed reacts to your choices; sequels start with layoffs.'],
    ['Alpha 0.2.0', 'A 10-step tutorial now opens the game one system at a time, with a sentence or two on each. Settings → Skip tutorial unlocks everything at once.'],
    ['Alpha 0.1.0', 'First playable. Players → Engagement → Revenue, Reputation, five corporate stages, the Battle Pass (and its Pass), currencies with honest exchange rates, offers, whales, events, popups, VIP, Launch a Sequel. Built on Click to Conquer\'s save, cloud and offline systems.'],
  ],
};
if (typeof window !== 'undefined') window.CONFIG = CONFIG;

// ---------- tier scaling (Alpha 0.0.4: players-first) ----------
// Stages are player counts; prices of one-time things follow `moneyAt`, the revenue a balanced player has
// earned when each stage opens (measured with tests/bot.js). Retune moneyAt and every price moves with it.
(function tierScale() {
  const T = CONFIG.tiers = { chBase: 0.3, chStep: 4, chCost: 25, chCostStep: 400, chGrowth: 1.35, ftRate: 0.0006, ftStep: 2.6, ftCost: 12, ftCostStep: 5, devMult: 1.5, growth: 1.3,
    moneyAt: [0, 5e3, 5e5, 2e7, 5e9, 5e11] };
  CONFIG.channels.forEach((c, i) => { c.base = T.chBase * Math.pow(T.chStep, i); c.cost = T.chCost * Math.pow(T.chCostStep, i); c.growth = T.chGrowth; });
  CONFIG.channels.find(c => c.id === 'store').cost = 150; // your first marketing buy comes out of the $5,000
  CONFIG.channels.find(c => c.id === 'xpromo').cost = 300; // it's your cousin
  CONFIG.channels.find(c => c.id === 'intern').cost = 2e4;
  Object.entries({ influ: 2e5, fakeads: 3e6, celeb: 3e7, preinst: 2e11, osupd: 1e12, implant: 6e12 }).forEach(([id, c]) => { CONFIG.channels.find(x => x.id === id).cost = c; }); // 0.1.1: priced for the era that opens them // affordable while the game is still paid // your cousin is cheap: the quest asks for him at ~1,000 players
  CONFIG.features.forEach(f => { f.growth = T.growth; f.dev = +(f.cost * T.devMult).toPrecision(2); }); // rate ($/s per player per level) and cost (code) are set per item above
  const M = T.moneyAt, lg = Math.log, ex = Math.exp, at = st => M[st - 1] || 25;
  const span = st => [Math.max(25, at(st) * 0.3), M[st] ? M[st] * 0.5 : at(st) * 300];
  for (let st = 1; st <= CONFIG.stages.length; st++) {
    const list = CONFIG.upgrades.filter(u => u.stage === st), [lo, hi] = span(st);
    list.forEach((u, k) => { u.cost = +ex(lg(lo) + (lg(hi) - lg(lo)) * (list.length === 1 ? 0 : k / (list.length - 1))).toPrecision(2); });
  }
  CONFIG.goodwill.forEach((g, k) => { g.cost = +(Math.max(200, at(g.stage) * 0.2)).toPrecision(2); g.growth = 2.2; });
  const P = CONFIG.pass, lane = [0, at(3) * 2, at(4) * 0.5, at(4) * 5, at(5) * 1, at(6) * 0.5];
  P.lanes.forEach((l, k) => { l.cost = +lane[k].toPrecision(2); });
  P.bppCost = +(at(4) * 2).toPrecision(2); P.managerCost = +(at(5) * 0.5).toPrecision(2); P.bppPlusCost = +(at(5) * 5).toPrecision(2);
  CONFIG.staff.teams.costs = [at(3) * 3, at(4) * 2, at(5) * 2, at(6) * 2].map(x => +x.toPrecision(2));
  CONFIG.games.forEach((g, k) => { g.cost = 1e30; });
})();
