// Lockstep game rules. No DOM. The data tables and pure helpers are plain globals; everything that reads or changes a
// run belongs to a game from makeGame(). The page loads this as a classic script; Node loads it with require().

/* ---------- Data ---------- */
const BREAK = 3, RELOCK = 4, FRENZY = 30, ARRIVE_EVERY = 8, MAX_ARRIVALS = 2;
// In a frenzy the broken line runs every RUN_EVERY turns; a Recall during a frenzy holds for RECALL_HOLD turns.
const RUN_EVERY = 3, RECALL_HOLD = 4;
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
// Rooms are drawn as text: # wall, o pit, ~ ice, ^ spikes, K powder keg, > < v A conveyor belts.
const BELT = { ">": [1, 0], "<": [-1, 0], "v": [0, 1], "A": [0, -1] };
// Rooms are known by a text id (saved runs store it), so the list can be reordered or grown freely.
function room(id, name, rows) {
  const r = { id, name, w: rows[0].length, h: rows.length, walls: new Set(), pits: new Set(), kegs: [], tiles: {} };
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const k = x + "," + y;
    if (ch === "#") r.walls.add(k);
    else if (ch === "o") r.pits.add(k);
    else if (ch === "K") r.kegs.push(k);
    else if (ch === "~") r.tiles[k] = "ice";
    else if (ch === "^") r.tiles[k] = "spike";
    else if (BELT[ch]) r.tiles[k] = ch;
  }));
  return r;
}
const ROOMS = [
  room("drill-square", "Drill square", [".......", ".o...o.", ".......", "...#...", ".......", ".o...o.", "......."]),
  room("ice-yard", "Ice yard", [".........", "..~~~~~..", ".o.....o.", "..~~~~~..", ".........", "....#....", "........."]),
  room("spike-lanes", "Spike lanes", [".........", ".^^^.^^^.", "....o....", ".#.....#.", "....o....", ".^^^.^^^.", "........."]),
  room("colossus-court", "Colossus court", [".........", ".o.....o.", ".........", "...#.#...", ".........", "...#.#...", ".........", ".o.....o.", "........."]),
  room("powder-store", "Powder store", [".........", ".K..o..K.", ".........", "..#...#..", ".........", ".K..o..K.", "........."]),
  room("belt-room", "Belt room", [".........", ".>>>>>>v.", ".A.....v.", ".A..o..v.", ".A.....v.", ".A<<<<<<.", ".........", ".o.....o.", "........."]),
  room("mess-hall", "Mess hall", [".......", ".K.^.K.", "...o...", ".^.#.^.", "...o...", ".K.^.K.", "......."]),
  room("hall-of-mirrors", "Hall of mirrors", [".........", ".o..^..o.", ".........", "..#...#..", ".^.....^.", "..#...#..", ".........", ".o..^..o.", "........."]),
  room("gatehouse", "Gatehouse", [".........", ".o.~~~.o.", "...~~~...", ".#.....#.", "..K...K..", ".#.....#.", "...^^^...", ".o.^^^.o.", "........."]),
  room("battlements", "Battlements", ["...........", ".o..>>>..o.", "..#.....#..", "...........", "..#.....#..", ".o..<<<..o.", "..........."]),
  room("the-keep", "The keep", [".........", ".~~...~~.", ".~o...o~.", "...#K#...", ".........", "...#K#...", ".~o...o~.", ".~~...~~.", "........."]),
  room("wardens-yard", "Warden's yard", ["...........", ".o.......o.", "...~~~~~...", "..#.....#..", ".....^.....", "..#.....#..", "...~~~~~...", ".o.......o.", "..........."]),
  room("training-ground", "Training ground", [".......", ".......", ".o.....", ".......", "......#", "......."])
];
const ROOM_BY_ID = new Map(ROOMS.map(r => [r.id, r]));
const roomById = id => ROOM_BY_ID.get(id);
// Tests and tools can add rooms of their own.
const addRoom = rm => { ROOM_BY_ID.set(rm.id, rm); return rm; };
const ACT_ROOMS = [["drill-square", "ice-yard", "spike-lanes"], ["powder-store", "belt-room", "mess-hall"], ["gatehouse", "battlements", "the-keep"]];
const BOSS_ROOMS = ["colossus-court", "hall-of-mirrors", "wardens-yard"];
// Each fight turns its room: mirrored either way, and square rooms rotated too. Only turns that change the layout count.
// F.orient bits: 1 flips x, 2 flips y, 4 swaps x and y (square rooms only). 0 is the room as drawn.
const ORIENTS = new Map();
function roomOrients(rm) {
  if (!ORIENTS.has(rm)) {
    const seen = new Set(), sig = t => JSON.stringify([[...t.walls].sort(), [...t.pits].sort(), [...t.kegs].sort(), Object.entries(t.tiles).sort()]);
    ORIENTS.set(rm, (rm.w === rm.h ? [0, 1, 2, 3, 4, 5, 6, 7] : [0, 1, 2, 3]).filter(o => { const k = sig(turnRoom(rm, o)); return !seen.has(k) && seen.add(k); }));
  }
  return ORIENTS.get(rm);
}
function turnRoom(rm, o) {
  const sw = o & 4, flip = (x, y) => [o & 1 ? rm.w - 1 - x : x, o & 2 ? rm.h - 1 - y : y];
  const pt = (x, y) => { const [a, b] = flip(x, y); return sw ? [b, a] : [a, b]; };
  const vec = ([dx, dy]) => { const a = o & 1 ? -dx : dx, b = o & 2 ? -dy : dy; return sw ? [b, a] : [a, b]; };
  const key = k => pt(...k.split(",").map(Number)).join(",");
  const beltCh = v => Object.keys(BELT).find(ch => BELT[ch][0] === v[0] && BELT[ch][1] === v[1]);
  const out = { id: rm.id, name: rm.name, w: sw ? rm.h : rm.w, h: sw ? rm.w : rm.h, walls: new Set([...rm.walls].map(key)), pits: new Set([...rm.pits].map(key)), kegs: rm.kegs.map(key), tiles: {} };
  for (const [k, t] of Object.entries(rm.tiles)) out.tiles[key(k)] = BELT[t] ? beltCh(vec(BELT[t])) : t;
  return out;
}
const TURNED = new Map();
function fightRoom(F) {
  const rm = roomById(F.room);
  if (!F.orient) return rm;
  if (!TURNED.has(rm)) TURNED.set(rm, new Map());
  const turned = TURNED.get(rm);
  if (!turned.has(F.orient)) turned.set(F.orient, turnRoom(rm, F.orient));
  return turned.get(F.orient);
}
// The training drill: a first-run lesson room with a fixed line, no bonus, arrivals or frenzy. The page coaches it.
const DRILL_ROOM = "training-ground", DRILL_LINE = [["drone", 3, 2], ["drone", 5, 0], ["drone", 4, 5]], DRILL_START = { x: 3, y: 4 };
const CHAIN = ["", "", "Double drop", "Triple drop", "Quad drop", "Rout"];
const FOES = {
  drone: { name: "drone", hp: 1, dmg: 1 },
  contra: { name: "contrarian", hp: 1, dmg: 1, contra: true },
  heavy: { name: "heavy", hp: 2, dmg: 2, slow: true },
  runner: { name: "runner", hp: 2, dmg: 1, elite: true, fast: true },
  anchor: { name: "anchor", hp: 3, dmg: 1, elite: true, fixed: true },
  rifle: { name: "rifleman", hp: 1, dmg: 1, rifle: true, fixed: true },
  colossus: { name: "Colossus", hp: 8, dmg: 2, boss: true, slow: true },
  mirror: { name: "Mirror", hp: 9, dmg: 1, boss: true, contra: true, seals: true },
  warden: { name: "Warden", hp: 12, dmg: 2, boss: true, slow: true, chaser: true, march: true }
};
const BOSSES = ["colossus", "mirror", "warden"];
// Riflemen stand their ground and fire along their row and column once loaded; the first thing in the way takes the shot.
const RELOAD = 2;
// Every non-boss room comes with a bonus order (Into the Breach style).
const GOALS = {
  colours: { name: "Take the colours", text: "Step onto the flag before the room is clear, and before an enemy does.", gold: 20 },
  pits: { name: "Into the pits", text: "Put 3 enemies into pits.", gold: 20, need: 3 },
  line: { name: "Clean march", text: "Win without any enemy ever being blocked (by a wall, the edge or another piece).", gold: 15 },
  unhurt: { name: "Parade order", text: "Win without taking any damage, by turn 14.", gold: 20, by: 14 },
  quick: { name: "Quick march", text: "Clear the room by turn 10.", gold: 15, by: 10 }
};
// Perks (internally "orders"): passives for the run, from bosses and the shop.
const ORDERS = {
  sappers: { name: "Sappers' pride", text: "Every pit drop brings each card 1 turn closer." },
  bayonet: { name: "Fixed bayonets", text: "Your bump attacks deal 2." },
  iron: { name: "Iron ranks", text: "The first hit you take in each fight does nothing." },
  steady: { name: "Steady drum", text: "Enemies need 4 blocked turns to break step, not 3." },
  deep: { name: "Deep pits", text: "Pits hold one more enemy." },
  fuse: { name: "Short fuses", text: "Powder kegs deal 2 to enemies." },
  boots: { name: "Hobnail boots", text: "Spikes don't hurt you." },
  medic: { name: "Field surgeon", text: "Heal 1 after every fight." },
  crossfire: { name: "Crossfire", text: "Rifle shots that hit an enemy deal 3." },
  rally: { name: "Rally", text: "Every combo heals 1." },
  quarter: { name: "Quartermaster's friend", text: "Shop prices are a quarter lower." },
  reserve: { name: "Reserve slot", text: "One more card slot." }
};
// Synergies: a card and a perk that work better together. Holding both turns the bonus on.
const SYNERGIES = {
  charge: { name: "Bayonet charge", card: "lunge", order: "bayonet", text: "Lunge hits 1 harder." },
  powder: { name: "Powder quake", card: "quake", order: "fuse", text: "Quake deals 2 to pinned enemies." },
  hobnail: { name: "Hobnail stomp", card: "stomp", order: "boots", text: "Stomp first hits every enemy beside you for 1." }
};
const CARDS = {
  sidestep: { name: "Sidestep", cd: 3, cdUp: 2, dir: true, text: "You move 1. The room holds still." },
  stomp: { name: "Stomp", cd: 2, cdUp: 1, dir: true, text: "You stay. The room moves 1 your way." },
  doubletime: { name: "Double Time", cd: 3, cdUp: 2, dir: true, text: "You move 1. The room moves 2." },
  aboutface: { name: "About Face", cd: 3, cdUp: 2, dir: true, text: "You move 1. The room moves the opposite way." },
  lunge: { name: "Lunge", cd: 3, cdUp: 3, dir: true, text: "Dash up to 2; the first enemy hit takes 2. Room moves 1.", textUp: "Dash up to 2; the first enemy hit takes 3. Room moves 1." },
  shove: { name: "Shove", cd: 2, cdUp: 2, dir: true, text: "Hit an adjacent enemy for 1 and knock it back 2. Room holds.", textUp: "Hit an adjacent enemy for 1 and knock it back 3. Room holds." },
  quake: { name: "Quake", cd: 5, cdUp: 4, dir: true, text: "You stay. The room moves 1; every enemy already pinned against something takes 1." },
  magnet: { name: "Magnet", cd: 4, cdUp: 3, dir: false, text: "You stay. Every locked enemy steps 1 toward you." },
  recall: { name: "Recall", cd: 6, cdUp: 4, dir: false, text: "Every enemy that broke free falls back into step (in a frenzy, for 4 turns). Room holds." },
  trapdoor: { name: "Trapdoor", cd: 6, cdUp: 4, dir: true, text: "Open a hidden pit beside you for 4 turns. Chasers don't see it coming. Room holds." },
  brace: { name: "Brace", cd: 4, cdUp: 3, dir: false, text: "You stay and take no damage this turn. Room holds." }
};
const START_POOL = ["sidestep", "stomp", "doubletime", "aboutface", "lunge", "shove", "trapdoor"];
const CHARS = {
  recruit: { name: "Recruit", hp: 8, slots: 3, hand: ["sidestep", "stomp"], blurb: "Steady footing. Starts with Sidestep and Stomp.", unlock: "" },
  drummer: { name: "Drummer", hp: 7, slots: 4, hand: ["doubletime", "aboutface"], blurb: "Sets the tempo. Four card slots; starts with Double Time and About Face.", unlock: "Beat the Colossus" },
  sapper: { name: "Sapper", hp: 9, slots: 3, hand: ["quake", "shove"], pitHold: 3, blurb: "Digs in. Pits hold 3 instead of 2; starts with Quake and Shove.", unlock: "Win a run" }
};
const CADENCE = [
  "Standard rules.",
  "C1: one more enemy in every fight.",
  "C2: frenzy starts 6 turns sooner.",
  "C3: elites have +1 health, and rest heals 2 instead of 3.",
  "C4: bosses have +4 health.",
  "C5: start with 2 less health."
];
const NODE = {
  fight: { label: "Fight", text: "A fight. Clear the room for gold and a card." },
  elite: { label: "Elite", text: "A harder room with an elite. Better gold, a card and a free upgrade." },
  rest: { label: "Rest", text: "Heal, or upgrade a card." },
  shop: { label: "Shop", text: "Spend gold on cards, upgrades and healing." },
  event: { label: "?", text: "Something happens. You choose how it goes." },
  boss: { label: "Boss", text: "The act's boss. Beat it to move on." }
};
const EVENTS = [
  { title: "The sergeant major", text: "A sergeant offers to run you through your paces. It will hurt.",
    opts: [{ label: "Train hard", text: "Lose 2 health. Upgrade a random card.", go: g => { g.run.hp = Math.max(1, g.run.hp - 2); g.upgradeRandom(); } },
           { label: "Decline", text: "Nothing happens.", go: () => {} }] },
  { title: "An abandoned kit", text: "Someone left their pack by the barracks door.",
    opts: [{ label: "Take the coin", text: "Gain 35 gold.", go: g => { g.run.gold += 35; } },
           { label: "Take the orders", text: "Gain a random card.", go: g => g.gainRandomCard() }] },
  { title: "The field medic", text: "A medic waves you over to the tent.",
    opts: [{ label: "Get patched up", text: "Heal 4.", go: g => { g.run.hp = Math.min(g.run.maxhp, g.run.hp + 4); } },
           { label: "Get conditioned", text: "+1 maximum health.", go: g => { g.run.maxhp += 1; g.run.hp += 1; } }] },
  { title: "A cracked drum", text: "The regiment's old drum. Selling it would fetch a price, and a curse.",
    opts: [{ label: "Sell it", text: "Gain 60 gold, lose 1 maximum health.", go: g => { const R = g.run; R.gold += 60; R.maxhp = Math.max(1, R.maxhp - 1); R.hp = Math.min(R.hp, R.maxhp); } },
           { label: "Leave it", text: "Nothing happens.", go: () => {} }] }
];

/* ---------- Profile (unlocks only) ---------- */
const BLANK_PROFILE = { v: 1, runs: 0, wins: 0, deaths: 0, bestAct: 0, beat: {}, chars: { recruit: true }, cards: {}, cad: { recruit: 0 }, drilled: false, seen: {} };
const newSeed = () => (Math.random() * 4294967296) >>> 0;
const UNLOCKS = [
  { what: "Drummer (cadet)", how: "Beat the Colossus", has: p => p.chars.drummer },
  { what: "Sapper (cadet)", how: "Win a run", has: p => p.chars.sapper },
  { what: "Quake (card)", how: "Beat the Colossus", has: p => p.cards.quake },
  { what: "Magnet (card)", how: "Reach act 2", has: p => p.cards.magnet },
  { what: "Recall (card)", how: "Beat the Mirror", has: p => p.cards.recall },
  { what: "Brace (card)", how: "Fall three times", has: p => p.cards.brace }
];
const mergeProfile = d => Object.assign(JSON.parse(JSON.stringify(BLANK_PROFILE)), d, {
  chars: Object.assign({ recruit: true }, d.chars), cards: Object.assign({}, d.cards), cad: Object.assign({ recruit: 0 }, d.cad), beat: Object.assign({}, d.beat), seen: Object.assign({}, d.seen)
});

/* ---------- Saved runs ---------- */
// A saved run carries its shape's version. Bump RUN_V whenever the run's shape changes, and teach migrateRun the step.
//   v1: fights stored their room as a position in ROOMS (in the order below); v2 stores the room's id.
const RUN_V = 2;
const V1_ROOMS = ["drill-square", "ice-yard", "spike-lanes", "colossus-court", "powder-store", "belt-room", "mess-hall", "hall-of-mirrors", "gatehouse", "battlements", "the-keep", "wardens-yard", "training-ground"];
// Brings a saved run up to date, or returns null if it can't be played any more (unknown version, or it names a card,
// perk, enemy, room or character this version of the game doesn't have).
function migrateRun(r) {
  if (!r || typeof r !== "object" || !Number.isInteger(r.v)) return null;
  if (r.v === 1) { if (r.fight) r.fight.room = V1_ROOMS[r.fight.room]; r.v = 2; }
  if (r.v !== RUN_V) return null;
  // Runs saved before the seeded RNG have no RNG state; give them one.
  if (r.rng == null) { r.seed = newSeed(); r.rng = r.seed | 0; }
  const ok = !!CHARS[r.char] && Array.isArray(r.hand) && r.hand.every(c => c && CARDS[c.id]) && (r.orders || []).every(id => ORDERS[id])
    && !!(r.map && r.map.nodes) && (!r.fight || (!!roomById(r.fight.room) && r.fight.enemies.every(e => FOES[e.type]) && (!r.fight.goal || !!GOALS[r.fight.goal.id])))
    && (!r.reward || ((r.reward.cards || []).every(id => CARDS[id]) && (r.reward.orders || []).every(id => ORDERS[id])))
    && (!r.shop || ((r.shop.cards || []).every(o => CARDS[o.id]) && (!r.shop.order || !!ORDERS[r.shop.order.id])));
  return ok ? r : null;
}

/* ---------- Pure helpers ---------- */
const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const foe = e => FOES[e.type];
// Anchors and riflemen hold their ground (fixed) until an anchor's line is gone and it falls into step (e.loose).
const fixed = e => !!foe(e).fixed && !e.loose;
const isLocked = e => !e.free && !fixed(e) && !foe(e).chaser;

/* ---------- A game ---------- */
// Everything that reads or changes a run lives in a game made by makeGame(run, opts). Each game owns its run, its
// effect queues and its sim flag, so previews and bot lookahead work on forks instead of swapping a shared global.
//   opts.sim      true for forks: no effects, no sounds, no saving or toasts.
//   opts.profile  the player's profile, or a function returning it (the page swaps its profile object on load).
//   opts.hooks    { save(), toast(msg) } from the page.
function makeGame(run, opts = {}) {
  const SIM = !!opts.sim;
  const hooks = Object.assign({ save() {}, toast() {} }, opts.hooks);
  const ownProfile = opts.profile && typeof opts.profile === "object" ? opts.profile : mergeProfile({});
  const prof = typeof opts.profile === "function" ? opts.profile : () => ownProfile;
  const save = () => { if (!SIM) hooks.save(); };
  let R = run || null, W = 9, H = 9, FX = [], SFX = [];
  // Board size follows the current room.
  function setDims() { if (R && R.fight) { const rm = fightRoom(R.fight); W = rm.w; H = rm.h; } }
  const hasO = id => !!(R && R.orders && R.orders.includes(id));
  const syn = id => hasO(SYNERGIES[id].order) && R.hand.some(c => c.id === SYNERGIES[id].card);
  const synergies = () => R ? Object.keys(SYNERGIES).filter(syn) : [];
  // Announces each synergy the first time it comes together in a run.
  function noteSynergies() {
    const seen = R.synSeen = R.synSeen || [];
    for (const id of synergies()) if (!seen.includes(id)) { seen.push(id); if (!SIM) hooks.toast(`Synergy! ${SYNERGIES[id].name}: ${SYNERGIES[id].text}`); }
  }
  // Seeded RNG (mulberry32). Its state lives in the run (R.rng), so a saved run, a preview and a bot replay all see the
  // same rolls as the real game. Outside a run (nothing rolls there today) it falls back to Math.random.
  function rng() {
    if (!R) return Math.random();
    let t = (R.rng = (R.rng + 0x6D2B79F5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const rand = n => Math.floor(rng() * n);
  const pickOne = a => a[rand(a.length)];
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const cardPool = () => Object.keys(CARDS).filter(id => START_POOL.includes(id) || prof().cards[id]);
  function unlock(kind, id, label) {
    const P = prof(), bag = kind === "char" ? P.chars : P.cards;
    if (bag[id]) return;
    bag[id] = true;
    if (kind === "char" && P.cad[id] == null) P.cad[id] = 0;
    if (R) (R.stats.unlocked = R.stats.unlocked || []).push(label);
    if (!SIM) hooks.toast(`Unlocked: ${label}`);
  }
  function fx(kind, x, y, extra) { if (!SIM) FX.push(Object.assign({ kind, x, y }, extra || {})); }
  function sfx(name) { if (!SIM) SFX.push(name); }
  const drainFx = () => { const out = FX; FX = []; return out; };
  const drainSfx = () => { const out = SFX; SFX = []; return out; };
  // A sim copy of this game: same run (deep-copied, RNG state included), a copy of the profile, no effects or saving.
  const fork = () => makeGame(JSON.parse(JSON.stringify(R)), { sim: true, profile: JSON.parse(JSON.stringify(prof())) });

  function log(msg) { if (!R || !R.fight) return; R.fight.log.unshift({ t: R.fight.turn, msg }); R.fight.log.length = Math.min(R.fight.log.length, 8); }

  function newRun(char, cad, seed) {
    const c = CHARS[char];
    if (seed == null) seed = newSeed();
    R = {
      v: RUN_V, seed, rng: seed | 0, char, cad, hp: c.hp - (cad >= 5 ? 2 : 0), maxhp: c.hp - (cad >= 5 ? 2 : 0), gold: 0, act: 1,
      slots: c.slots, pitHold: c.pitHold || 2,
      hand: c.hand.map(id => ({ id, cd: 0, up: false })), orders: [],
      map: null, pos: null, walked: [], screen: "map", fight: null, reward: null, shop: null, event: null, end: null,
      stats: { kills: 0, pitKills: 0, fights: 0, turns: 0 }
    };
    R.map = genMap(1);
    prof().runs++; save();
    return R;
  }

  /* ---------- Map ---------- */
  function genMap(act) {
    const ROWS = 6, COLS = 4, nodes = {}, edges = new Set();
    const key = (r, c) => r + ":" + c;
    const starts = shuffle([0, 1, 2, 3]).slice(0, 3);
    for (const s of starts) {
      let c = s;
      for (let r = 0; r < ROWS; r++) {
        nodes[key(r, c)] = { r, c };
        if (r < ROWS - 1) { const nc = Math.max(0, Math.min(COLS - 1, c + rand(3) - 1)); edges.add(key(r, c) + ">" + key(r + 1, nc)); c = nc; }
      }
    }
    for (const k in nodes) {
      const n = nodes[k], r = n.r;
      if (r === 0) n.t = "fight";
      else if (r === ROWS - 1) n.t = "rest";
      else {
        const bag = ["fight", "fight", "fight", "event", "shop", "shop"];
        if (r >= 2) bag.push("elite", "elite", "rest");
        n.t = pickOne(bag);
      }
    }
    nodes["6:boss"] = { r: 6, c: 1.5, t: "boss" };
    for (const k in nodes) if (nodes[k].r === ROWS - 1) edges.add(k + ">6:boss");
    return { act, nodes, edges: [...edges] };
  }
  function openNodes() {
    const m = R.map;
    if (R.pos == null) return Object.keys(m.nodes).filter(k => m.nodes[k].r === 0);
    return m.edges.filter(e => e.split(">")[0] === R.pos).map(e => e.split(">")[1]);
  }
  function enterNode(k) {
    if (!openNodes().includes(k)) return false;
    if (R.pos) R.walked.push(R.pos + ">" + k);
    R.pos = k;
    const t = R.map.nodes[k].t;
    if (t === "fight" || t === "elite" || t === "boss") startFight(t);
    else if (t === "rest") {
      R.screen = "rest";
      // The campfire before the boss has a supply wagon: rations and dressings at shop prices.
      if (R.map.nodes[k].r === 5) R.shop = Object.assign(makeShop(), { wagon: true, cards: [], order: null });
    }
    else if (t === "shop") { R.shop = makeShop(); R.screen = "shop"; }
    else if (t === "event") { R.event = rand(EVENTS.length); R.screen = "event"; }
    return true;
  }

  /* ---------- Fight setup ---------- */
  function newFight(kind, roomId, orient) {
    const rm = fightRoom({ room: roomId, orient });
    R.fight = {
      kind, room: roomId, orient: orient || 0, turn: 0, arrivals: 0, pitFill: {}, traps: [], kegs: [...rm.kegs], frenzy: false,
      frenzyAt: FRENZY - (R.cad >= 2 ? 6 : 0), flip: 0, flipIn: 5, brace: false, enemies: [], nextId: 1,
      p: { x: rm.w >> 1, y: rm.h >> 1 }, log: [], over: null, gold: 0, lastHurt: 0, actKills: 0, bestChain: 0,
      iron: hasO("iron"), goal: null, pitKills: 0
    };
    setDims();
    settlePlayer();
    R.screen = "fight";
    return R.fight;
  }
  function startFight(kind) {
    const act = R.act, id = kind === "boss" ? BOSS_ROOMS[act - 1] : pickOne(ACT_ROOMS[act - 1]);
    const F = newFight(kind, id, pickOne(roomOrients(roomById(id)))), rm = fightRoom(F);
    const weights = act === 1 ? ["drone", "drone", "drone", "contra", "contra", "heavy", "rifle"]
      : act === 2 ? ["drone", "drone", "contra", "contra", "heavy", "heavy", "rifle", "rifle"] : ["drone", "drone", "contra", "contra", "heavy", "heavy", "heavy", "rifle", "rifle"];
    if (kind !== "boss") setGoal(pickOne(Object.keys(GOALS)));
    const open = rm.w * rm.h - rm.walls.size - rm.pits.size - rm.kegs.length;
    let n = Math.min(1 + act + (R.cad >= 1 ? 1 : 0) + rand(2), Math.floor(open / 9));
    if (kind === "boss") {
      const b = BOSSES[act - 1];
      spawn(b, true);
      for (let i = 0; i < 2; i++) spawn(b === "mirror" ? "contra" : "drone");
      log(`The ${FOES[b].name} takes the field.`);
    } else {
      if (kind === "elite") { spawn(act === 3 ? pickOne(["runner", "anchor"]) : act === 1 ? "runner" : "anchor"); if (act === 3) spawn(pickOne(["runner", "anchor"])); n = Math.max(3, n - 1); }
      spawn("contra");
      for (let i = 1; i < n; i++) spawn(pickOne(weights));
      log(`${rm.name}. ${F.enemies.length} enemies.`);
    }
    R.stats.fights++;
  }
  // The drill can't hurt you below 1 health, and you leave it at full health with no reward.
  function startDrill() {
    const F = newFight("drill", DRILL_ROOM);
    F.p = { ...DRILL_START }; F.frenzyAt = 999;
    for (const [type, x, y] of DRILL_LINE) F.enemies.push({ id: F.nextId++, type, x, y, hp: 1, max: 1, blocked: 0, free: false, chased: 0, skip: false, dir: [0, 1] });
    log("Training ground. The line copies your every step.");
  }
  function settlePlayer() {
    const F = R.fight, open = (x, y) => inB(x, y) && !isWall(x, y) && !isPit(x, y);
    if (open(F.p.x, F.p.y)) return;
    let best = null;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (open(x, y) && (!best || dist({ x, y }, F.p) < dist(best, F.p))) best = { x, y };
    F.p.x = best.x; F.p.y = best.y;
  }
  function setGoal(id) {
    const F = R.fight, g = F.goal = { id, ok: true };
    if (id !== "colours") return;
    // The flag stands well away from you, so fetching it drags the whole line along.
    for (let md = 4; md >= 2 && !g.flag; md--) {
      const cand = [];
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (!isWall(x, y) && !isPit(x, y) && !hazard(x, y) && dist({ x, y }, F.p) >= md) cand.push({ x, y });
      if (cand.length) g.flag = pickOne(cand);
    }
    if (!g.flag) F.goal = { id: "line", ok: true };
  }
  function goalFail(id, msg) {
    const g = R.fight.goal;
    if (!g || !g.ok || g.id !== id) return;
    g.ok = false; log(`${msg} The ${GOALS[g.id].name.toLowerCase()} bonus is lost.`);
  }
  function edgeTile(minDist = 4) {
    const F = R.fight;
    for (let md = minDist; md >= 2; md--) {
      const cand = [];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!(x === 0 || y === 0 || x === W - 1 || y === H - 1)) continue;
        if (isWall(x, y) || isPit(x, y) || enemyAt(x, y) || hazard(x, y) || dist({ x, y }, F.p) < md) continue;
        cand.push({ x, y });
      }
      if (cand.length) return pickOne(cand);
    }
    return null;
  }
  function spawn(type, boss) {
    const F = R.fight, c = edgeTile(boss ? 5 : 4); if (!c) return null;
    const d = FOES[type];
    let hp = d.hp;
    if (d.elite && R.cad >= 3) hp += 1;
    if (d.boss && R.cad >= 4) hp += 4;
    // Anything that turns up during a frenzy arrives already broken free.
    const e = { id: F.nextId++, type, x: c.x, y: c.y, hp, max: hp, blocked: 0, free: !!d.chaser || (F.frenzy && !d.fixed && !d.boss), chased: 0, skip: false, dir: [0, 1] };
    if (d.rifle) e.load = RELOAD;
    F.enemies.push(e);
    fx("spawn", e.x, e.y);
    return e;
  }

  /* ---------- Board queries ---------- */
  const inB = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const kegAt = (x, y) => R.fight.kegs.includes(x + "," + y);
  // Kegs block like walls until they blow.
  const isWall = (x, y) => fightRoom(R.fight).walls.has(x + "," + y) || kegAt(x, y);
  const hazard = (x, y) => fightRoom(R.fight).tiles[x + "," + y] || null;
  const beltAt = (x, y) => BELT[hazard(x, y)] || null;
  // Boss fights never fill their pits: they're the boss's main weakness.
  // The Mirror shatters any pit it climbs out of (F.sealed).
  const roomPit = (x, y) => fightRoom(R.fight).pits.has(x + "," + y) && !(R.fight.sealed || []).includes(x + "," + y) && (R.fight.kind === "boss" || (R.fight.pitFill[x + "," + y] || 0) < R.pitHold);
  const trapAt = (x, y) => R.fight.traps.some(t => t.x === x && t.y === y);
  const isPit = (x, y) => roomPit(x, y) || trapAt(x, y);
  const enemyAt = (x, y) => R.fight.enemies.find(e => e.x === x && e.y === y);
  const alive = e => R.fight.enemies.includes(e);
  const floorFree = (x, y) => inB(x, y) && !isWall(x, y) && !isPit(x, y) && !enemyAt(x, y) && !(x === R.fight.p.x && y === R.fight.p.y);

  /* ---------- Damage ---------- */
  function hurtPlayer(e, how) {
    const F = R.fight, d = foe(e).dmg;
    if (F.brace) { log(`A ${foe(e).name} ${how}, but you're braced.`); fx("block", F.p.x, F.p.y); return; }
    if (F.iron) { F.iron = false; log(`A ${foe(e).name} ${how}, but your iron ranks hold.`); fx("block", F.p.x, F.p.y); return; }
    R.hp = F.kind === "drill" ? Math.max(1, R.hp - d) : R.hp - d; F.lastHurt += d; goalFail("unhurt", "You're hit.");
    log(`A ${foe(e).name} ${how}. −${d}`);
    fx("hurt", F.p.x, F.p.y, { n: d }); sfx("hurt");
  }
  function damage(e, n, how) {
    const F = R.fight;
    e.hp -= n;
    fx("hit", e.x, e.y, { n }); sfx("hit");
    if (e.hp > 0) { log(`${how} the ${foe(e).name}.`); return true; }
    kill(e, `${how} the ${foe(e).name} down.`);
    return false;
  }
  function kill(e, msg) {
    const F = R.fight;
    F.enemies.splice(F.enemies.indexOf(e), 1);
    R.stats.kills++; F.actKills++;
    fx("die", e.x, e.y, { color: e.type, id: e.id });
    log(msg);
    if (foe(e).boss) { F.over = "win"; log(`The ${foe(e).name} is beaten.`); }
  }
  function hurtSelf(n, msg) {
    const F = R.fight;
    if (F.brace) { log(`${msg}, but you're braced.`); fx("block", F.p.x, F.p.y); return; }
    if (F.iron) { F.iron = false; log(`${msg}, but your iron ranks hold.`); fx("block", F.p.x, F.p.y); return; }
    R.hp -= n; F.lastHurt += n; goalFail("unhurt", "You're hit.");
    log(`${msg}. −${n}`);
    fx("hurt", F.p.x, F.p.y, { n }); sfx("hurt");
  }
  // A powder keg blows: 1 damage to everything around it, and neighbouring kegs go too.
  function explode(x, y) {
    const F = R.fight, k = x + "," + y;
    if (!F.kegs.includes(k)) return;
    F.kegs.splice(F.kegs.indexOf(k), 1);
    fx("boom", x, y); sfx("boom");
    log("A powder keg blows.");
    for (const e of [...F.enemies]) if (alive(e) && Math.max(Math.abs(e.x - x), Math.abs(e.y - y)) === 1) damage(e, hasO("fuse") ? 2 : 1, "The blast catches");
    if (Math.max(Math.abs(F.p.x - x), Math.abs(F.p.y - y)) === 1) hurtSelf(1, "The blast catches you");
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) if (kegAt(x + dx, y + dy)) explode(x + dx, y + dy);
  }
  // After a unit moves one tile in (vx, vy): spikes bite, ice keeps it sliding.
  function arrive(u, vx, vy) {
    const F = R.fight, me = u === F.p;
    for (let guard = 0; guard < W + H; guard++) {
      const t = hazard(u.x, u.y);
      // Bosses wear boots: spikes only bite the cadet and the rank and file.
      if (t === "spike" && (me ? !hasO("boots") : !foe(u).boss)) { if (me) hurtSelf(1, "Spikes"); else if (!damage(u, 1, "Spikes catch")) return; sfx("spike"); }
      if (t !== "ice" || (!vx && !vy)) return;
      const nx = u.x + vx, ny = u.y + vy;
      if (!me && inB(nx, ny) && isPit(nx, ny)) { fall(u, nx, ny); return; }
      if (!inB(nx, ny) || isWall(nx, ny) || isPit(nx, ny) || enemyAt(nx, ny) || (nx === F.p.x && ny === F.p.y)) {
        if (!me && kegAt(nx, ny)) explode(nx, ny);
        return;
      }
      u.x = nx; u.y = ny;
    }
  }
  function fall(e, x, y) {
    const F = R.fight;
    fx("fall", x, y, { type: e.type, id: e.id }); sfx("fall");
    if (hasO("sappers")) for (const c of R.hand) if (c.cd > 0) c.cd--;
    if (foe(e).boss) {
      e.hp -= 3;
      log(`The ${foe(e).name} plunges into a pit. −3`);
      if (e.hp <= 0) { kill(e, `The ${foe(e).name} doesn't climb out.`); return; }
      if (foe(e).seals && roomPit(x, y)) { (F.sealed = F.sealed || []).push(x + "," + y); log(`The ${foe(e).name} shatters the pit on its way out.`); }
      const c = edgeTile(3); if (c) { e.x = c.x; e.y = c.y; } e.blocked = 0;
      fx("spawn", e.x, e.y);
      return;
    }
    if (roomPit(x, y)) F.pitFill[x + "," + y] = (F.pitFill[x + "," + y] || 0) + 1;
    F.enemies.splice(F.enemies.indexOf(e), 1);
    R.stats.kills++; R.stats.pitKills++; F.actKills++; F.pitKills++;
    F.gold += 1;
    log(`A ${foe(e).name} falls into a pit. +1 gold`);
  }

  /* ---------- Enemy movement ---------- */
  // Heavies and slow bosses act every other time they're asked to; in a frenzy, heavies stop resting.
  function resting(e) {
    if (!foe(e).slow || (R.fight.frenzy && !foe(e).boss)) return false;
    const s = e.skip; e.skip = !e.skip; return s;
  }

  function roomShift(dx, dy, opts) {
    const F = R.fight, P = F.p, o = opts || {};
    const flip = F.flip > 0 ? -1 : 1;
    const vec = e => { const s = (foe(e).contra ? -1 : 1) * flip; return [dx * s, dy * s]; };
    const lead = e => { const [vx, vy] = vec(e); return e.x * vx + e.y * vy; };
    // The Warden chases every other turn; on the turns between (e.skip set: its chase step will rest) it marches in step.
    const marching = e => foe(e).march && e.skip;
    const lock = F.enemies.filter(e => isLocked(e) || marching(e)).sort((a, b) => lead(b) - lead(a));
    const acted = [];
    let moved = false;
    for (const e of lock) {
      if (!alive(e) || (!marching(e) && resting(e))) continue;
      const passes = foe(e).fast ? 2 : 1;
      for (let i = 0; i < passes && alive(e); i++) {
        const [vx, vy] = vec(e), tx = e.x + vx, ty = e.y + vy;
        if (tx === P.x && ty === P.y) { e.blocked = 0; hurtPlayer(e, "crashes into you"); break; }
        if (inB(tx, ty) && isPit(tx, ty)) { fall(e, tx, ty); break; }
        if (!inB(tx, ty) || isWall(tx, ty) || enemyAt(tx, ty)) {
          if (kegAt(tx, ty)) { explode(tx, ty); if (!alive(e)) break; }
          // Quake only hurts enemies that were already pinned before this turn.
          if (o.quake && e.blocked >= 1 && !o.hitSet.has(e)) { o.hitSet.add(e); if (!damage(e, o.quake, "The quake slams")) break; }
          if (!marching(e) && ++e.blocked >= 1) goalFail("line", `A ${foe(e).name} is blocked.`);
          if (!marching(e) && e.blocked >= BREAK + (hasO("steady") ? 1 : 0)) { e.free = true; e.chased = 0; log(`A ${foe(e).name} breaks step and comes for you.`); goalFail("line", "The line breaks."); }
          break;
        }
        e.x = tx; e.y = ty; e.blocked = 0; e.dir = [vx, vy];
        moved = true;
        arrive(e, vx, vy);
        if (alive(e) && !acted.includes(e)) acted.push(e);
      }
    }
    if (moved) sfx("march");
    for (const e of acted) if (alive(e) && isLocked(e) && dist(e, P) === 1) hurtPlayer(e, "lands beside you and strikes");
  }

  function pathField() {
    const P = R.fight.p, f = new Map([[P.x + "," + P.y, 0]]), q = [[P.x, P.y]];
    while (q.length) {
      const [x, y] = q.shift(), d = f.get(x + "," + y);
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy, k = nx + "," + ny;
        // Chasers see room pits but not trapdoors.
        if (inB(nx, ny) && !isWall(nx, ny) && !roomPit(nx, ny) && !f.has(k)) { f.set(k, d + 1); q.push([nx, ny]); }
      }
    }
    return f;
  }
  function chaseStep(e, field) {
    const P = R.fight.p;
    if (dist(e, P) > 1) {
      const here = field.get(e.x + "," + e.y) ?? 999;
      let best = null;
      for (const [dx, dy] of DIRS) {
        const x = e.x + dx, y = e.y + dy, trap = inB(x, y) && trapAt(x, y) && !enemyAt(x, y);
        if (!floorFree(x, y) && !trap) continue;
        const d = field.get(x + "," + y) ?? 999, eu = (x - P.x) ** 2 + (y - P.y) ** 2;
        if (d < here && (!best || d < best.d || (d === best.d && eu < best.eu))) best = { x, y, d, eu, dx, dy, trap };
      }
      if (best && best.trap) { fall(e, best.x, best.y); return false; }
      if (best) { e.x = best.x; e.y = best.y; e.dir = [best.dx, best.dy]; arrive(e, best.dx, best.dy); if (!alive(e)) return false; }
    }
    if (dist(e, P) !== 1) return false;
    hurtPlayer(e, "hits you");
    return true;
  }
  // True on the turns a frenzied line runs (takes two steps). Counted from the start of the frenzy.
  const runTurn = () => { const F = R.fight; return F.frenzy && F.frenzySince != null && (F.turn - F.frenzySince) % RUN_EVERY === RUN_EVERY - 1; };
  function chasersAct(everyone) {
    const F = R.fight, field = pathField();
    for (const e of [...F.enemies]) {
      if (!alive(e) || fixed(e)) continue;
      if (!everyone && isLocked(e)) continue;
      if (resting(e)) continue;
      let hit = chaseStep(e, field);
      // In a frenzy the broken line breaks into a run every third turn, so nobody can be outpaced forever.
      if (!hit && alive(e) && e.free && runTurn() && !foe(e).boss) hit = chaseStep(e, field);
      if (!alive(e)) continue;
      if (!e.free || foe(e).chaser) continue;
      if (hit || dist(e, F.p) < RELOCK || F.frenzy) e.chased = 0;
      else if (++e.chased >= RELOCK) { e.free = false; e.blocked = 0; log(`A ${foe(e).name} loses you and falls back into step.`); }
    }
    for (const e of F.enemies) if (fixed(e) && !foe(e).rifle && dist(e, F.p) === 1) hurtPlayer(e, "strikes");
  }

  /* ---------- Turn flow ---------- */
  function endTurn(played) {
    const F = R.fight;
    F.turn++; R.stats.turns++;
    F.brace = false;
    for (const c of R.hand) if (c !== played && c.cd > 0) c.cd--;
    F.traps = F.traps.filter(t => --t.t > 0);
    // Conveyor belts carry whatever stands on them, front of the belt first.
    const riders = [F.p, ...F.enemies.filter(e => !fixed(e))].filter(u => beltAt(u.x, u.y));
    riders.sort((a, b) => { const [ax, ay] = beltAt(a.x, a.y), [bx, by] = beltAt(b.x, b.y); return (b.x * bx + b.y * by) - (a.x * ax + a.y * ay); });
    for (const u of riders) {
      if (u !== F.p && !alive(u)) continue;
      const [bx, by] = beltAt(u.x, u.y), nx = u.x + bx, ny = u.y + by;
      if (u !== F.p && inB(nx, ny) && isPit(nx, ny)) { fall(u, nx, ny); continue; }
      if (!inB(nx, ny) || isWall(nx, ny) || isPit(nx, ny) || enemyAt(nx, ny) || (nx === F.p.x && ny === F.p.y)) continue;
      u.x = nx; u.y = ny; if (u !== F.p) u.dir = [bx, by];
      arrive(u, bx, by);
    }
    riflesFire();
    // Combo: two or more enemies down from one action pays out and speeds up every card.
    if (F.actKills >= 2) {
      const n = F.actKills, bonus = n * (n - 1);
      F.gold += bonus; F.bestChain = Math.max(F.bestChain || 0, n);
      for (const c of R.hand) if (c.cd > 0) c.cd--;
      if (hasO("rally") && R.hp < R.maxhp) R.hp++;
      log(`${CHAIN[Math.min(n, 5)]}! +${bonus} gold, and every card is a turn closer.`);
      fx("combo", F.p.x, F.p.y, { n }); sfx("combo");
    }
    for (const e of F.enemies) if (e.heldUntil != null && F.turn >= e.heldUntil) {
      delete e.heldUntil;
      if (F.frenzy && isLocked(e)) { e.free = true; e.chased = 0; log(`The frenzy takes the ${foe(e).name} again.`); }
    }
    const boss = F.enemies.find(e => foe(e).boss);
    if (boss && boss.type === "mirror") {
      if (F.flip > 0) { if (--F.flip === 0) log("The Mirror settles. Everyone moves the usual way again."); }
      else if (--F.flipIn <= 0) { F.flip = 5; F.flipIn = 5; log("The Mirror flips direction: for 5 turns, everyone moves the opposite way."); }
    }
    if (F.kind === "boss" && boss) {
      // After turn 30 the boss enrages and calls help every 3 turns, so a boss fight can't be stalled.
      const enraged = F.turn >= 30, every = enraged ? 3 : boss.type === "colossus" ? 6 : 7;
      if (F.turn === 30) {
        F.frenzy = true; F.frenzySince = F.turn;
        for (const e of F.enemies) if (!foe(e).boss && !fixed(e)) e.free = true;
        log(`The ${foe(boss).name} enrages. Its line breaks step, and help arrives every 3 turns.`); sfx("frenzy");
      }
      if (F.turn % every === 0 && F.enemies.length < 14) {
        const n = boss.type === "warden" ? 2 : 1;
        for (let i = 0; i < n; i++) { const e = spawn(boss.type === "mirror" ? "contra" : "drone"); if (e && enraged) e.free = true; }
        log(`The ${foe(boss).name} calls in reinforcements.`);
      }
    } else if (F.kind !== "boss" && F.kind !== "drill") {
      if (!F.frenzy && F.enemies.length >= 2 && F.arrivals < MAX_ARRIVALS && F.turn % ARRIVE_EVERY === 0) {
        const e = spawn(pickOne(["drone", "drone", "contra", "heavy"])); if (e) { F.arrivals++; log(`A ${foe(e).name} joins the line.`); }
      }
      if (!F.frenzy && F.enemies.length && F.turn >= F.frenzyAt) {
        F.frenzy = true; F.frenzySince = F.turn;
        for (const e of F.enemies) if (!fixed(e)) e.free = true;
        log("Frenzy: every enemy breaks step.");
        goalFail("line", "Frenzy.");
        sfx("frenzy");
      }
    }
    // With the rest of the line gone, riflemen yield and anchors leave their post and fall into step.
    if (F.kind !== "boss" && F.enemies.length && F.enemies.every(fixed)) {
      for (const e of [...F.enemies]) {
        if (foe(e).rifle) kill(e, `With its line gone, the ${foe(e).name} yields.`);
        else { e.loose = true; e.blocked = 0; e.free = F.frenzy; log(`With its line gone, the ${foe(e).name} leaves its post and falls into step.`); }
      }
    }
    if (!F.over && F.kind !== "boss" && !F.enemies.length) F.over = "win";
    // Winning the fight on the turn you'd fall leaves you standing on 1.
    if (R.hp <= 0 && F.over === "win") { R.hp = 1; log("You stagger off the field, but the day is yours."); }
    else if (R.hp <= 0) { R.hp = 0; F.over = "lose"; }
    const g = F.goal, G = g && GOALS[g.id];
    if (!g || !g.ok) return;
    if (g.id === "colours" && !g.took && F.p.x === g.flag.x && F.p.y === g.flag.y) { g.took = true; log("You take the colours."); }
    if (g.id === "colours" && !g.took && enemyAt(g.flag.x, g.flag.y)) goalFail("colours", "An enemy tramples the colours.");
    else if ((g.id === "quick" || g.id === "unhurt") && !F.over && F.turn >= G.by) goalFail(g.id, "Too slow.");
    else if (F.over === "win" && (g.id !== "pits" || F.pitKills >= G.need) && (g.id !== "colours" || g.took)) { g.paid = true; F.gold += G.gold; log(`${G.name}: done. +${G.gold} gold`); }
  }

  // Loaded riflemen shoot along their row or column when you're in line; walls stop them, anything else in the way is hit.
  function sightLine(e) {
    const P = R.fight.p;
    if (e.x !== P.x && e.y !== P.y) return null;
    const sx = Math.sign(P.x - e.x), sy = Math.sign(P.y - e.y);
    for (let x = e.x + sx, y = e.y + sy; inB(x, y); x += sx, y += sy) {
      if (x === P.x && y === P.y) return { x, y, me: true };
      if (kegAt(x, y)) return { x, y, keg: true };
      if (isWall(x, y)) return null;
      const o = enemyAt(x, y); if (o) return { x, y, e: o };
    }
    return null;
  }
  function riflesFire() {
    const F = R.fight;
    for (const e of [...F.enemies]) {
      if (!alive(e) || !foe(e).rifle) continue;
      if (e.load > 0) { e.load--; continue; }
      const s = sightLine(e); if (!s) continue;
      e.load = RELOAD;
      fx("shot", e.x, e.y, { tx: s.x, ty: s.y }); sfx("shot");
      R.stats[s.me ? "shotsTaken" : "shotsStray"] = (R.stats[s.me ? "shotsTaken" : "shotsStray"] || 0) + 1;
      if (s.me) hurtPlayer(e, "shoots you");
      else if (s.keg) explode(s.x, s.y);
      else damage(s.e, hasO("crossfire") ? 3 : 1, "A rifleman's shot hits");
    }
  }

  // Moves the player one tile or bump-attacks; returns false if blocked by a wall or pit.
  function stepPlayer(dx, dy, dmg) {
    const F = R.fight, tx = F.p.x + dx, ty = F.p.y + dy;
    const e = inB(tx, ty) && enemyAt(tx, ty);
    if (e) { damage(e, dmg || (hasO("bayonet") ? 2 : 1), "You hit"); return true; }
    if (inB(tx, ty) && kegAt(tx, ty)) { explode(tx, ty); return true; }
    if (inB(tx, ty) && !isWall(tx, ty) && !isPit(tx, ty)) { F.p.x = tx; F.p.y = ty; sfx("step"); arrive(F.p, dx, dy); return true; }
    return false;
  }

  function step(dx, dy) {
    if (!R || !R.fight || R.fight.over) return false;
    const F = R.fight;
    F.lastHurt = 0; F.actKills = 0;
    if (dx || dy) F.pdir = [dx, dy];
    if (!dx && !dy) {
      chasersAct(true);
      if (F.kind !== "boss" && F.kind !== "drill" && F.enemies.length < 10) { const e = spawn(pickOne(["drone", "contra"])); log(e ? `You wait. The line catches up, and a ${foe(e).name} arrives.` : "You wait. The line catches up."); }
      else log("You wait. The line catches up.");
      endTurn(null);
      return true;
    }
    if (!stepPlayer(dx, dy)) log(isPit(F.p.x + dx, F.p.y + dy) ? "You stop at the pit's edge. The room doesn't." : "You hit the wall. The room keeps going.");
    roomShift(dx, dy);
    chasersAct(false);
    endTurn(null);
    return true;
  }

  // Returns an error message if the card can't be played that way, or "" if it can.
  function cardBlock(slot, dx, dy) {
    const F = R.fight, c = R.hand[slot];
    if (!c) return "No card in that slot.";
    if (c.cd > 0) return `${CARDS[c.id].name} is ready in ${c.cd}.`;
    const def = CARDS[c.id];
    if (def.dir && !dx && !dy) return "Pick a direction.";
    const tx = F.p.x + dx, ty = F.p.y + dy;
    if (c.id === "sidestep" && !floorFree(tx, ty)) return "Nowhere to sidestep there.";
    if (c.id === "shove") { const e = inB(tx, ty) && enemyAt(tx, ty); if (!e) return "Shove needs an enemy right next to you."; }
    if (c.id === "trapdoor" && !floorFree(tx, ty)) return "The trapdoor needs an empty tile beside you.";
    if (c.id === "recall" && !F.enemies.some(e => e.free && !foe(e).chaser)) return "Nothing has broken free.";
    return "";
  }

  function play(slot, dx, dy) {
    if (!R || !R.fight || R.fight.over) return false;
    dx = dx || 0; dy = dy || 0;
    if (cardBlock(slot, dx, dy)) return false;
    const F = R.fight, c = R.hand[slot], def = CARDS[c.id];
    F.lastHurt = 0; F.actKills = 0;
    if (dx || dy) F.pdir = [dx, dy];
    sfx("card");
    log(`${def.name}${c.up ? "+" : ""}.`);
    const P = F.p;
    switch (c.id) {
      case "sidestep": P.x += dx; P.y += dy; arrive(P, dx, dy); break;
      case "stomp":
        if (syn("hobnail")) for (const e of [...F.enemies]) if (alive(e) && dist(e, P) === 1) damage(e, 1, "Your stomp catches");
        roomShift(dx, dy); break;
      case "doubletime": stepPlayer(dx, dy); roomShift(dx, dy); roomShift(dx, dy); break;
      case "aboutface": stepPlayer(dx, dy); roomShift(-dx, -dy); break;
      case "lunge": {
        let dashed = false;
        for (let i = 0; i < 2; i++) {
          const tx = P.x + dx, ty = P.y + dy, e = inB(tx, ty) && enemyAt(tx, ty);
          if (e) { damage(e, (c.up ? 3 : 2) + (syn("charge") ? 1 : 0), "Your lunge hits"); break; }
          if (inB(tx, ty) && kegAt(tx, ty)) { explode(tx, ty); break; }
          if (!inB(tx, ty) || isWall(tx, ty) || isPit(tx, ty)) break;
          // Dashing on past a spike tile still hurts (the tile you stop on is handled by arrive).
          if (dashed && hazard(P.x, P.y) === "spike" && !hasO("boots")) hurtSelf(1, "Spikes");
          P.x = tx; P.y = ty; dashed = true;
        }
        if (dashed) arrive(P, dx, dy);
        roomShift(dx, dy);
        break;
      }
      case "shove": {
        const e = enemyAt(P.x + dx, P.y + dy);
        if (damage(e, 1, "You shove") && !fixed(e)) {
          let knocked = false;
          for (let i = 0; i < (c.up ? 3 : 2) && alive(e); i++) {
            const bx = e.x + dx, by = e.y + dy;
            if (inB(bx, by) && isPit(bx, by)) { fall(e, bx, by); break; }
            if (inB(bx, by) && kegAt(bx, by)) { explode(bx, by); break; }
            if (!floorFree(bx, by)) break;
            e.x = bx; e.y = by; knocked = true;
          }
          if (knocked && alive(e)) arrive(e, dx, dy);
        }
        break;
      }
      case "quake": roomShift(dx, dy, { quake: syn("powder") ? 2 : 1, hitSet: new Set() }); sfx("quake"); fx("quake", P.x, P.y); break;
      case "magnet": {
        const list = F.enemies.filter(e => isLocked(e) && !foe(e).boss).sort((a, b) => dist(a, P) - dist(b, P));
        for (const e of list) {
          if (!alive(e) || dist(e, P) <= 1) continue;
          const ax = Math.sign(P.x - e.x), ay = Math.sign(P.y - e.y);
          const tries = Math.abs(P.x - e.x) >= Math.abs(P.y - e.y) ? [[ax, 0], [0, ay]] : [[0, ay], [ax, 0]];
          for (const [mx, my] of tries) {
            if (!mx && !my) continue;
            const tx = e.x + mx, ty = e.y + my;
            if (inB(tx, ty) && isPit(tx, ty)) { fall(e, tx, ty); break; }
            if (floorFree(tx, ty)) { e.x = tx; e.y = ty; e.dir = [mx, my]; arrive(e, mx, my); break; }
          }
        }
        break;
      }
      case "recall":
        // In a frenzy the recall only holds for a few turns (see endTurn), so it can't freeze a fight for good.
        for (const e of F.enemies) if (e.free && !foe(e).chaser) { e.free = false; e.blocked = 0; e.chased = 0; if (F.frenzy) e.heldUntil = F.turn + 1 + RECALL_HOLD; }
        log(F.frenzy ? `The line snaps back into step, for ${RECALL_HOLD} turns.` : "The line snaps back into step.");
        break;
      case "trapdoor": F.traps.push({ x: P.x + dx, y: P.y + dy, t: 5 }); fx("trap", P.x + dx, P.y + dy); break;
      case "brace": F.brace = true; fx("block", P.x, P.y); break;
    }
    c.cd = c.up ? def.cdUp : def.cd;
    if (!F.over) chasersAct(false);
    endTurn(c);
    return true;
  }

  // Plays act(g) on a sim fork of this game and reports where everything ends up. The real run is never touched.
  function preview(act) {
    const g = fork(), ok = act(g), F = g.run.fight;
    return { ok, dmg: F.lastHurt, hp: g.run.hp, p: { ...F.p }, enemies: F.enemies.map(e => ({ id: e.id, x: e.x, y: e.y, free: e.free })), over: F.over, chain: F.actKills };
  }

  /* ---------- After the fight ---------- */
  function fightReward() {
    const F = R.fight, kind = F.kind;
    if (kind === "drill") { prof().drilled = true; save(); R.hp = R.maxhp; R.fight = null; R.screen = "map"; return; }
    const gold = F.gold + (kind === "elite" ? 35 + rand(11) : kind === "boss" ? 60 : 12 + rand(9));
    R.gold += gold;
    const owned = new Set(R.hand.map(c => c.id));
    const offer = shuffle(cardPool().filter(id => !owned.has(id))).slice(0, 3);
    const orders = kind === "boss" ? orderOffer(3) : [];
    const goal = F.goal ? { id: F.goal.id, ok: !!F.goal.paid } : null;
    R.reward = { gold, cards: offer, upgrade: kind === "elite" || kind === "boss", pending: null, took: false, orders, tookOrder: false, goal };
    if (hasO("medic")) R.hp = Math.min(R.maxhp, R.hp + 1);
    if (kind === "boss") {
      const b = BOSSES[R.act - 1];
      prof().beat[b] = true;
      if (b === "colossus") { unlock("char", "drummer", "the Drummer"); unlock("card", "quake", "Quake"); }
      if (b === "mirror") unlock("card", "recall", "Recall");
      save();
      R.hp = Math.min(R.maxhp, R.hp + Math.ceil((R.maxhp - R.hp) / 2));
    }
    R.fight = null;
    R.screen = "reward";
  }
  function takeCard(id, replaceSlot) {
    if (!R.reward || R.reward.took) return;
    if (R.hand.length < R.slots) R.hand.push({ id, cd: 0, up: false });
    else if (replaceSlot != null) R.hand[replaceSlot] = { id, cd: 0, up: false };
    else { R.reward.pending = id; return; }
    R.reward.took = true; R.reward.pending = null;
    noteSynergies();
  }
  const orderOffer = n => shuffle(Object.keys(ORDERS).filter(id => !hasO(id))).slice(0, n);
  function takeOrder(id) {
    if (!ORDERS[id] || hasO(id)) return false;
    R.orders.push(id);
    if (id === "deep") R.pitHold++;
    if (id === "reserve") R.slots++;
    noteSynergies();
    return true;
  }
  function buyOrder() {
    const sh = R.shop;
    if (!sh.order || sh.order.sold || R.gold < sh.order.price) return false;
    R.gold -= sh.order.price; sh.order.sold = true; takeOrder(sh.order.id);
    return true;
  }
  function upgradeCard(slot) { const c = R.hand[slot]; if (c && !c.up) { c.up = true; return true; } return false; }
  function upgradeRandom() { const c = shuffle(R.hand.filter(c => !c.up))[0]; if (c) c.up = true; }
  function gainRandomCard() {
    const owned = new Set(R.hand.map(c => c.id)), id = pickOne(cardPool().filter(i => !owned.has(i)));
    if (!id) return;
    if (R.hand.length < R.slots) R.hand.push({ id, cd: 0, up: false }); else R.hand[rand(R.hand.length)] = { id, cd: 0, up: false };
    noteSynergies();
  }
  function leaveNode() {
    // After the boss: next act or victory.
    if (R.map.nodes[R.pos] && R.map.nodes[R.pos].t === "boss") {
      if (R.act >= 3) return endRun(true);
      R.act++; R.map = genMap(R.act); R.pos = null; R.walked = [];
      if (R.act === 2) { unlock("card", "magnet", "Magnet"); save(); }
    }
    R.reward = null; R.shop = null; R.event = null;
    R.screen = "map";
  }
  const shopPrice = n => Math.round(n * (hasO("quarter") ? 0.75 : 1) / 5) * 5;
  // Fresh card and perk offers (used when the shop opens and when it restocks).
  function shopStock() {
    const owned = new Set(R.hand.map(c => c.id)), oid = orderOffer(1)[0];
    return {
      cards: shuffle(cardPool().filter(id => !owned.has(id))).slice(0, 3).map(id => ({ id, price: shopPrice(30 + rand(4) * 5), sold: false })),
      order: oid ? { id: oid, price: shopPrice(75 + rand(4) * 5), sold: false } : null
    };
  }
  function makeShop() {
    return Object.assign(shopStock(), { upPrice: shopPrice(40), healPrice: shopPrice(25), hpPrice: shopPrice(45), restockPrice: shopPrice(15), pending: null });
  }
  // Restock: new cards and a new perk, for a price that rises each time in this shop.
  function restock() {
    const sh = R.shop;
    if (R.gold < sh.restockPrice) return false;
    R.gold -= sh.restockPrice; sh.restockPrice += 10;
    Object.assign(sh, shopStock(), { pending: null });
    return true;
  }
  const restHealAmount = () => (R.cad >= 3 ? 2 : 3);
  function restHeal() {
    if (R.screen !== "rest" || R.hp >= R.maxhp) return false;
    R.hp = Math.min(R.maxhp, R.hp + restHealAmount()); leaveNode();
    return true;
  }
  function restUpgrade(slot) {
    if (R.screen !== "rest" || !upgradeCard(slot)) return false;
    leaveNode();
    return true;
  }
  function buyHeal() {
    const sh = R.shop;
    if (R.gold < sh.healPrice || R.hp >= R.maxhp) return false;
    R.gold -= sh.healPrice; R.hp = Math.min(R.maxhp, R.hp + 3);
    return true;
  }
  function buyHp() {
    const sh = R.shop;
    if (R.gold < sh.hpPrice) return false;
    R.gold -= sh.hpPrice; R.maxhp += 1; R.hp += 1; sh.hpPrice += 25;
    return true;
  }
  // Buys shop card idx. With a full hand it needs a slot to replace: without one it marks the card pending and returns false.
  function buyCard(idx, replaceSlot) {
    const sh = R.shop, o = sh.cards[idx];
    if (!o || o.sold || R.gold < o.price) return false;
    if (R.hand.length < R.slots) R.hand.push({ id: o.id, cd: 0, up: false });
    else if (replaceSlot != null && R.hand[replaceSlot]) R.hand[replaceSlot] = { id: o.id, cd: 0, up: false };
    else { sh.pending = { id: o.id, idx }; return false; }
    R.gold -= o.price; o.sold = true; sh.pending = null;
    noteSynergies();
    return true;
  }
  function buyUpgrade(slot) {
    if (R.gold < R.shop.upPrice || !upgradeCard(slot)) return false;
    R.gold -= R.shop.upPrice;
    return true;
  }
  function endRun(won) {
    prof().bestAct = Math.max(prof().bestAct, R.act);
    if (won) {
      prof().wins++;
      prof().beat.warden = true;
      unlock("char", "sapper", "the Sapper");
      prof().cad[R.char] = Math.max(prof().cad[R.char] || 0, Math.min(5, R.cad + 1));
    } else {
      prof().deaths++;
      if (prof().deaths >= 3) unlock("card", "brace", "Brace");
    }
    save();
    R.end = { won, act: R.act, stats: { ...R.stats }, gold: R.gold, char: R.char, cad: R.cad };
    R.screen = "end";
  }

  setDims();
  return {
    get run() { return R; }, get W() { return W; }, get H() { return H; }, get sim() { return SIM; },
    get profile() { return prof(); },
    newRun, genMap, openNodes, enterNode, startFight, startDrill, setGoal, spawn, setDims, inB, kegAt, isWall, hazard, beltAt, roomPit,
    trapAt, isPit, enemyAt, alive, floorFree, hasO, syn, synergies, cardPool, unlock, hurtPlayer, hurtSelf, damage, kill, explode, arrive, fall, roomShift, pathField, chaseStep, runTurn, chasersAct, endTurn, sightLine, riflesFire, stepPlayer, step, cardBlock,
    play, preview, fork, drainFx, drainSfx, fightReward, takeCard, takeOrder, buyOrder, orderOffer, upgradeCard, upgradeRandom, gainRandomCard, leaveNode, shopPrice, shopStock, makeShop, restock, restHealAmount, restHeal, restUpgrade, buyHeal, buyHp, buyCard, buyUpgrade, endRun, rng, rand, pickOne, shuffle
  };
}

/* ---------- Node ---------- */
if (typeof module === "object" && module.exports) {
  module.exports = {
    makeGame, BREAK, RELOCK, FRENZY, ARRIVE_EVERY, MAX_ARRIVALS, RELOAD, RUN_EVERY, RECALL_HOLD, DIRS, BELT, ROOMS, roomById, addRoom, ACT_ROOMS, BOSS_ROOMS, RUN_V, migrateRun,
    roomOrients, turnRoom, fightRoom, SYNERGIES, CHAIN, FOES, BOSSES, GOALS, ORDERS, CARDS, START_POOL, CHARS, CADENCE, NODE, EVENTS, BLANK_PROFILE, UNLOCKS,
    room, newSeed, mergeProfile, dist, foe, fixed, isLocked
  };
}
