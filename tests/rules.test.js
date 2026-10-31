// Rule tests for rules.js. usage: node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const K = require("../rules.js");

const H = require("./helpers.js");
const { put, at } = H;
// The game the current test plays: newRun and fight (tests/helpers.js) make it.
let g = null;
function newRun(...a) { const r = H.newRun(...a); g = H.T.g; return r; }
function fight(...a) { const F = H.fight(...a); g = H.T.g; return F; }

test("the line copies your step; contrarians mirror it", () => {
  const F = fight([
    ".........",
    ".D.....C.",
    ".........",
    "....@....",
    "........."
  ]);
  g.step(1, 0);
  assert.deepEqual(F.p, { x: 5, y: 3 });
  assert.deepEqual(at(F, "drone"), [[2, 1]]);
  assert.deepEqual(at(F, "contra"), [[6, 1]]);
  assert.equal(g.run.hp, 8);
});

test("an enemy stepped into a pit dies, pays 1 gold, and the pit fills after two", () => {
  const F = fight([
    "Do.....",
    ".......",
    ".......",
    "...@..."
  ]);
  g.step(1, 0);
  assert.equal(F.enemies.length, 0);
  assert.equal(F.gold, 1);
  assert.equal(F.over, "win");
  assert.equal(g.isPit(1, 0), true);
  g.fall(put("drone", 0, 0), 1, 0);
  assert.equal(g.isPit(1, 0), false, "two drops fill the pit");
});

test("three blocked turns in a row break an enemy free", () => {
  const F = fight([
    "D#.......",
    ".........",
    ".........",
    "@........"
  ]);
  const d = F.enemies[0];
  g.step(1, 0); g.step(1, 0);
  assert.equal(d.free, false);
  assert.equal(d.blocked, 2);
  g.step(1, 0);
  assert.equal(d.free, true);
});

test("a free enemy that can't reach you for four turns falls back into step", () => {
  const F = fight([
    "###......",
    "#D#......",
    "###......",
    ".........",
    "........@"
  ]);
  const d = F.enemies[0];
  d.free = true;
  for (const dx of [-1, 1, -1]) g.step(dx, 0);
  assert.equal(d.free, true);
  g.step(1, 0);
  assert.equal(d.free, false);
});

test("a crash into a powder keg chains to the next keg; two drops pay a combo", () => {
  const F = fight([
    "DKK....",
    "..D....",
    ".......",
    ".......",
    "...@..."
  ]);
  g.step(1, 0);
  assert.equal(F.enemies.length, 0);
  assert.deepEqual(F.kegs, []);
  assert.equal(F.gold, 2, "Double drop: n×(n−1)");
});

test("conveyor belts carry enemies at the end of the turn", () => {
  const F = fight([
    ".>>...",
    "......",
    "......",
    "......",
    "..@..."
  ]);
  put("drone", 1, 0);
  // Sidestep holds the room, so only the belt moves the drone.
  g.play(0, -1, 0);
  assert.deepEqual(at(F, "drone"), [[2, 0]]);
});

test("rifle shots: walls stop them, enemies in the way take them, a clear line hits you", () => {
  let F = fight([
    "R.#.@",
    ".....",
    "....."
  ]);
  g.riflesFire();
  assert.equal(g.run.hp, 8);
  assert.equal(F.enemies[0].load, 0, "a blocked rifle stays loaded");

  F = fight([
    "R.D.@",
    ".....",
    "....."
  ]);
  g.riflesFire();
  assert.deepEqual(at(F, "drone"), []);
  assert.equal(g.run.hp, 8);

  F = fight([
    "R...@",
    ".....",
    "....."
  ]);
  g.riflesFire();
  assert.equal(g.run.hp, 7);
  assert.equal(F.enemies[0].load, K.RELOAD);
});

test("with their line gone, riflemen yield and anchors fall into step", () => {
  const F = fight([
    "R.....N",
    ".......",
    "...@...",
    ".......",
    "......D"
  ], { kind: "elite" });
  g.kill(F.enemies.find(e => e.type === "drone"), "test");
  g.endTurn(null);
  assert.deepEqual(at(F, "rifle"), []);
  const a = F.enemies[0];
  assert.equal(a.type, "anchor");
  assert.equal(K.isLocked(a), true);
  assert.equal(F.over, null);
  g.step(0, 1);
  assert.deepEqual([a.x, a.y], [6, 1], "it now copies your step");
});

test("anything that arrives during a frenzy is already free", () => {
  const F = fight([
    ".........",
    ".........",
    "....@....",
    ".........",
    "........."
  ]);
  F.frenzy = true;
  assert.equal(g.spawn("drone").free, true);
  assert.equal(g.spawn("rifle").free, false);
});

test("Cadence 2 brings the frenzy 6 turns sooner, as its text says", () => {
  newRun("recruit", 2, 1);
  g.startFight("fight");
  assert.equal(g.run.fight.frenzyAt, K.FRENZY - 6);
  assert.match(K.CADENCE[2].text, /6 turns sooner/);
});

test("the same seed gives the same run", () => {
  const map = seed => { newRun("recruit", 0, seed); return JSON.stringify(g.run.map); };
  assert.equal(map(7), map(7));
  assert.notEqual(map(7), map(8));
});

test("the preview of a wait shows the enemy that will really arrive", () => {
  fight([
    ".........",
    ".........",
    "....@....",
    ".........",
    "........D"
  ]);
  const pv = g.preview(f => f.step(0, 0));
  g.step(0, 0);
  assert.deepEqual(pv.enemies, g.run.fight.enemies.map(e => ({ id: e.id, x: e.x, y: e.y, free: e.free })));
});

test("shop: a full hand asks which card to replace; no gold, no sale", () => {
  newRun("recruit", 0, 1);
  g.run.hand.push({ id: "lunge", cd: 0, up: false });
  g.run.shop = g.makeShop(); g.run.screen = "shop";
  const o = g.run.shop.cards[0];
  g.run.gold = o.price - 1;
  assert.equal(g.buyCard(0), false);
  assert.equal(g.run.shop.pending, null);
  g.run.gold = o.price;
  assert.equal(g.buyCard(0), false);
  assert.deepEqual(g.run.shop.pending, { id: o.id, idx: 0 });
  assert.equal(g.buyCard(0, 2), true);
  assert.equal(g.run.hand[2].id, o.id);
  assert.equal(g.run.gold, 0);
  assert.equal(o.sold, true);
  g.run.hp = g.run.maxhp - 3;
  assert.equal(g.buyHeal(), false);
});

test("in a frenzy the broken line runs two steps every third turn", () => {
  const F = fight([
    ".........",
    ".........",
    "@.....D..",
    "........."
  ]);
  const d = F.enemies[0];
  d.free = true; F.frenzy = true; F.frenzySince = F.turn - 1;
  g.play(0, 0, -1);  // Sidestep: the room holds, only chasers move
  assert.equal(K.dist(d, F.p), 6, "an ordinary frenzy turn: one step");
  assert.equal(g.runTurn(), true);
  g.run.hand[0].cd = 0;
  g.play(0, 0, 1);
  assert.equal(K.dist(d, F.p), 3, "a run turn: two steps");
});

test("a recall during a frenzy only holds the line for a few turns", () => {
  const F = fight([
    "D........",
    ".........",
    "....@....",
    "........."
  ]);
  const d = F.enemies[0];
  d.free = true; F.frenzy = true; F.frenzySince = F.turn;
  g.run.hand[0] = { id: "recall", cd: 0, up: false };
  g.play(0, 0, 0);
  assert.equal(d.free, false);
  for (let i = 1; i < K.RECALL_HOLD; i++) { g.step(i % 2 ? 1 : -1, 0); assert.equal(d.free, false); }
  g.step(1, 0);
  assert.equal(d.free, true);
});

test("the Mirror seals a pit it climbs out of", () => {
  const F = fight([
    "o........",
    ".........",
    "....@....",
    ".........",
    "........."
  ], { kind: "boss" });
  const m = put("mirror", 1, 0);
  g.fall(m, 0, 0);
  assert.equal(m.hp, K.FOES.mirror.hp - 3);
  assert.equal(g.isPit(0, 0), false);
});

test("the Warden marches in step on the turns it doesn't chase, so it can be stepped into a pit", () => {
  const F = fight([
    "...........",
    "...........",
    "...........",
    "...........",
    "@.........."
  ], { kind: "boss" });
  const w = put("warden", 8, 1);
  K.roomById(F.room).pits.add("9,1");
  g.step(0, -1);  // a chase turn: it closes in
  assert.equal(w.skip, true);
  const before = [w.x, w.y];
  assert.notDeepEqual(before, [8, 1]);
  w.x = 8; w.y = 1;
  g.step(1, 0);  // a march turn: it copies your step, into the pit
  assert.equal(w.hp, K.FOES.warden.hp - 3);
});

test("bonuses: Clean march fails on the first block, Parade order has a turn limit", () => {
  let F = fight([
    "D#.......",
    ".........",
    "@........"
  ]);
  g.setGoal("line");
  g.step(1, 0);
  assert.equal(F.goal.ok, false);

  F = fight([
    ".........",
    "....@....",
    "........D"
  ]);
  g.setGoal("unhurt");
  F.turn = K.GOALS.unhurt.by - 1;
  g.play(0, 0, -1);
  assert.equal(F.goal.ok, false);
});

test("shop restock and the pre-boss supply wagon", () => {
  newRun("recruit", 0, 3);
  g.run.shop = g.makeShop(); g.run.screen = "shop"; g.run.gold = 40;
  const before = JSON.stringify(g.run.shop.cards);
  assert.equal(g.restock(), true);
  assert.equal(g.run.gold, 25);
  assert.equal(g.run.shop.restockPrice, 25);
  assert.notEqual(JSON.stringify(g.run.shop.cards), before);
  g.leaveNode();
  const k = Object.keys(g.run.map.nodes).find(k => g.run.map.nodes[k].r === 5);
  g.run.map.nodes[k].t = "rest"; g.run.pos = null; g.run.map.edges.push("x>" + k); g.run.pos = "x";
  assert.equal(g.enterNode(k), true);
  assert.equal(g.run.screen, "rest");
  assert.equal(g.run.shop.wagon, true);
  g.run.gold = 100;
  assert.equal(g.buyHp(), true);
  assert.equal(g.run.shop.hpPrice, 70);
});

test("a lunge across spikes hurts", () => {
  fight([
    ".......",
    "@^.....",
    ".......",
    "......D"
  ]);
  g.run.hand[0] = { id: "lunge", cd: 0, up: false };
  g.play(0, 1, 0);
  assert.deepEqual(g.run.fight.p, { x: 2, y: 1 });
  assert.equal(g.run.hp, 7);
});

test("winning on the turn you'd fall leaves you on 1", () => {
  const F = fight([
    ".......",
    "...@...",
    "......D"
  ]);
  g.run.hp = 1;
  g.hurtSelf(1, "test");
  g.kill(F.enemies[0], "test");
  g.endTurn(null);
  assert.equal(F.over, "win");
  assert.equal(g.run.hp, 1);
});

test("previews and forks never touch the real run, even nested", () => {
  fight([
    ".........",
    ".D.......",
    "....@....",
    "........."
  ]);
  const before = JSON.stringify(g.run);
  const pv = g.preview(f => {
    const inner = f.preview(h => h.step(0, 0));  // a preview inside a preview
    assert.equal(inner.ok, true);
    return f.step(1, 0);
  });
  assert.equal(pv.ok, true);
  assert.equal(JSON.stringify(g.run), before);
  assert.deepEqual(g.drainFx(), [], "a sim game queues no effects");
});

test("two games run side by side without sharing state", () => {
  const a = K.makeGame(null, { sim: true }), b = K.makeGame(null, { sim: true });
  a.newRun("recruit", 0, 5); b.newRun("drummer", 0, 5);
  a.enterNode(a.openNodes()[0]);
  assert.equal(a.run.screen, "fight");
  assert.equal(b.run.screen, "map");
  assert.equal(b.run.char, "drummer");
  assert.notEqual(a.run.rng, b.run.rng);
});

test("a real game queues effects and saves through its hooks; its forks don't", () => {
  let saves = 0;
  const real = K.makeGame(null, { hooks: { save: () => saves++ } });
  real.newRun("recruit", 0, 9);
  assert.equal(saves, 1);
  real.enterNode(real.openNodes()[0]);
  real.step(1, 0);
  assert.ok(real.drainSfx().length > 0);
  const f = real.fork();
  f.step(-1, 0);
  assert.equal(saves, 1);
  assert.deepEqual(f.drainSfx(), []);
});

test("the training drill: two steps left drop a drone, pinning breaks one free, it can't kill you, and it ends on the map", () => {
  newRun("recruit", 0, 1);
  g.startDrill();
  const F = g.run.fight;
  assert.equal(F.kind, "drill");
  g.step(-1, 0); g.step(-1, 0);
  assert.equal(F.pitKills, 1);
  for (let i = 0; i < 6 && !F.enemies.some(e => e.free); i++) g.step(1, 0);
  assert.ok(F.enemies.some(e => e.free));
  g.run.hp = 1; g.hurtPlayer(F.enemies[0], "hits you");
  assert.equal(g.run.hp, 1);
  const n = F.enemies.length;
  for (let t = 0; t < 40 && !F.over; t++) g.step(0, 0);
  assert.ok(F.enemies.length <= n);
  assert.equal(F.frenzy, false);
  g.fightReward();
  assert.equal(g.run.screen, "map");
  assert.equal(g.run.hp, g.run.maxhp);
  assert.equal(g.run.stats.fights, 0);
  assert.equal(g.profile.drilled, true);
});

test("nothing joins the line after the boss falls", () => {
  newRun("recruit", 0, 4);
  g.run.map.nodes = { "0:0": { r: 0, c: 0, t: "boss" } }; g.run.map.edges = []; g.run.pos = null;
  g.enterNode("0:0");
  const F = g.run.fight, n = F.enemies.length;
  F.turn = K.ARRIVE_EVERY - 1;  // the next turn would be an arrival turn in a normal fight
  g.kill(F.enemies.find(e => K.FOES[e.type].boss), "test");
  g.endTurn(null);
  assert.equal(F.over, "win");
  assert.equal(F.arrivals, 0);
  assert.equal(F.enemies.length, n - 1);
});

test("turned rooms keep every wall, pit, keg and tile in bounds; belts turn with the room", () => {
  const sig = t => JSON.stringify([[...t.walls].sort(), [...t.pits].sort(), [...t.kegs].sort(), Object.entries(t.tiles).sort()]);
  K.ROOMS.filter(rm => rm.id !== "training-ground").forEach(rm => {
    const i = rm.id;
    const os = K.roomOrients(rm);
    assert.equal(os[0], 0);
    assert.equal(new Set(os.map(o => sig(K.fightRoom({ room: i, orient: o })))).size, os.length, `${rm.name} repeats a layout`);
    for (const o of os) {
      const t = K.fightRoom({ room: i, orient: o });
      const keys = [...t.walls, ...t.pits, ...t.kegs, ...Object.keys(t.tiles)];
      assert.equal(t.walls.size + t.pits.size + t.kegs.length + Object.keys(t.tiles).length, rm.walls.size + rm.pits.size + rm.kegs.length + Object.keys(rm.tiles).length);
      for (const k of keys) { const [x, y] = k.split(",").map(Number); assert.ok(x >= 0 && y >= 0 && x < t.w && y < t.h, `${rm.name} ${o} ${k}`); }
    }
  });
  const belt = K.turnRoom(K.room("b", "b", [">.", ".."]), 1), swap = K.turnRoom(K.room("b", "b", [">.", ".."]), 4);
  assert.deepEqual(belt.tiles, { "1,0": "<" });
  assert.deepEqual(swap.tiles, { "0,0": "v" });
  assert.equal(K.fightRoom({ room: "drill-square", orient: 0 }), K.roomById("drill-square"));
  assert.deepEqual(K.roomOrients(K.room("sym", "sym", ["...", ".o.", "..."])), [0]);
});

test("every turn of the Belt room keeps each belt pointing at the same neighbour", () => {
  const i = "belt-room", rm = K.roomById(i);
  assert.equal(K.roomOrients(rm).length, 8);
  for (const o of K.roomOrients(rm)) {
    const T = (x, y) => { const a = o & 1 ? rm.w - 1 - x : x, b = o & 2 ? rm.h - 1 - y : y; return o & 4 ? [b, a] : [a, b]; };
    const t = K.fightRoom({ room: i, orient: o });
    for (const [k, ch] of Object.entries(rm.tiles)) {
      if (!K.BELT[ch]) continue;
      const [x, y] = k.split(",").map(Number), [dx, dy] = K.BELT[ch];
      const [tx, ty] = T(x, y), [nx, ny] = T(x + dx, y + dy), v = K.BELT[t.tiles[tx + "," + ty]];
      assert.deepEqual([tx + v[0], ty + v[1]], [nx, ny], `orient ${o} at ${k}`);
    }
  }
});

test("boss fights set up cleanly on every turn of their rooms", () => {
  for (const act of [1, 2, 3]) {
    for (let seed = 1; seed <= 30; seed++) {
      newRun("recruit", 0, seed); g.run.act = act; g.startFight("boss");
      const F = g.run.fight, rm = K.fightRoom(F), bad = (x, y) => rm.walls.has(x + "," + y) || rm.pits.has(x + "," + y) || x < 0 || y < 0 || x >= rm.w || y >= rm.h;
      assert.ok(!bad(F.p.x, F.p.y));
      assert.ok(F.enemies.some(e => K.FOES[e.type].boss));
      for (const e of F.enemies) assert.ok(!bad(e.x, e.y), `act ${act} seed ${seed} ${e.type} at ${e.x},${e.y}`);
    }
  }
});

test("a fight picks a turn of its room and the board takes its size", () => {
  const seen = new Set();
  for (let seed = 1; seed <= 40; seed++) {
    newRun("recruit", 0, seed); g.startFight("fight");
    const F = g.run.fight, rm = K.fightRoom(F);
    assert.ok(K.roomOrients(K.roomById(F.room)).includes(F.orient));
    assert.equal(g.W, rm.w); assert.equal(g.H, rm.h);
    assert.ok(!rm.walls.has(F.p.x + "," + F.p.y) && !rm.pits.has(F.p.x + "," + F.p.y));
    seen.add(F.orient);
  }
  assert.ok(seen.size >= 2);
});

test("synergies: Bayonet charge lunges harder, Powder quake and Hobnail stomp hit harder", () => {
  let F = fight(["@N....", "......"]);
  g.run.hand = [{ id: "lunge", cd: 0, up: false }]; g.run.orders = [];
  g.play(0, 1, 0);
  assert.equal(F.enemies[0].hp, 1);
  F = fight(["@N....", "......"]);
  g.run.hand = [{ id: "lunge", cd: 0, up: false }]; g.run.orders = ["bayonet"];
  assert.deepEqual(g.synergies(), ["charge"]);
  g.play(0, 1, 0);
  assert.equal(F.enemies.length, 0);
  for (const [orders, hp] of [[[], 2], [["fuse"], 1]]) {
    F = fight(["@....D"]);
    g.run.hand = [{ id: "quake", cd: 0, up: false }]; g.run.orders = orders;
    F.enemies[0].hp = F.enemies[0].max = 3; F.enemies[0].blocked = 1;
    g.play(0, 1, 0);
    assert.equal(F.enemies[0].hp, hp, `quake with ${orders}`);
  }
  for (const [orders, hp] of [[[], 3], [["boots"], 2]]) {
    F = fight([".....", "..D..", ".D@D.", "..D..", "....."]);
    g.run.hand = [{ id: "stomp", cd: 0, up: false }]; g.run.orders = orders;
    for (const e of F.enemies) e.hp = e.max = 3;
    g.play(0, 0, -1);
    assert.equal(Math.min(...F.enemies.map(e => e.hp)), hp, `stomp with ${orders}`);
  }
});

test("a synergy is announced once, when its pair comes together", () => {
  const msgs = [], game = K.makeGame(null, { hooks: { toast: m => msgs.push(m) } });
  game.newRun("recruit", 0, 1);
  game.takeOrder("boots");
  assert.deepEqual(msgs, ["Synergy! Hobnail stomp: Stomp first hits every enemy beside you for 1."]);
  game.takeOrder("fuse");
  assert.equal(msgs.length, 1);
});

test("saved runs: a v1 save moves its fight's room from a list position to the room's id", () => {
  newRun("recruit", 0, 3); g.startFight("fight");
  const v1 = JSON.parse(JSON.stringify(g.run));
  v1.v = 1; v1.fight.room = 5; delete v1.rng;  // as saved by the old game: Belt room was 6th, and no RNG state yet
  const r = K.migrateRun(v1);
  assert.equal(r.v, K.RUN_V);
  assert.equal(r.fight.room, "belt-room");
  assert.equal(typeof r.rng, "number");
  // and it plays on
  const back = K.makeGame(r, { sim: true });
  assert.ok(back.step(0, 0));
});

test("saved runs the game can't play any more are refused, not loaded", () => {
  newRun("recruit", 0, 3);
  const good = () => JSON.parse(JSON.stringify(g.run));
  assert.ok(K.migrateRun(good()));
  for (const [what, spoil] of [
    ["an unknown card", r => { r.hand[0].id = "renamed"; }],
    ["an unknown perk", r => { r.orders = ["gone"]; }],
    ["an unknown character", r => { r.char = "ghost"; }],
    ["a newer version", r => { r.v = K.RUN_V + 1; }],
    ["no version", r => { delete r.v; }],
    ["no map", r => { delete r.map; }]
  ]) { const r = good(); spoil(r); assert.equal(K.migrateRun(r), null, what); }
  assert.equal(K.migrateRun(null), null);
  assert.equal(K.migrateRun("junk"), null);
});

// Reaches a boss reward (perks on offer, a free upgrade) on a fresh run.
function bossReward(seed = 2) {
  newRun("recruit", 0, seed);
  g.run.map.nodes = { "0:0": { r: 0, c: 0, t: "boss" } }; g.run.map.edges = []; g.run.pos = null;
  g.enterNode("0:0");
  const F = g.run.fight;
  g.kill(F.enemies.find(e => K.FOES[e.type].boss), "test");
  g.endTurn(null);
  g.fightReward();
  return g.run.reward;
}

test("a boss reward's perks: take one, and only one", () => {
  const rw = bossReward();
  assert.equal(rw.orders.length, 3);
  assert.equal(g.takeRewardOrder("no-such-perk"), false);
  assert.equal(g.takeRewardOrder(rw.orders[0]), true);
  assert.deepEqual(g.run.orders, [rw.orders[0]]);
  assert.equal(g.takeRewardOrder(rw.orders[1]), false, "a second perk");
  assert.deepEqual(g.run.orders, [rw.orders[0]]);
});

test("a reward's free upgrade can be claimed once", () => {
  const rw = bossReward();
  assert.equal(rw.upgrade, true);
  assert.equal(g.claimUpgrade(0), true);
  assert.equal(g.run.hand[0].up, true);
  assert.equal(g.claimUpgrade(1), false, "a second free upgrade");
  assert.equal(g.run.hand[1].up, false);
});

test("backing out of a hand-full swap clears it on the reward and in the shop", () => {
  bossReward();
  g.run.reward.pending = "lunge";
  g.run.shop = { pending: { id: "lunge", idx: 0 } };
  g.cancelPending();
  assert.equal(g.run.reward.pending, null);
  assert.equal(g.run.shop.pending, null);
});

test("an event's choice is played, then the run moves on to the map", () => {
  newRun("recruit", 0, 5);
  const i = K.EVENTS.findIndex(e => e.title === "An abandoned kit");
  g.run.screen = "event"; g.run.event = i;
  const gold = g.run.gold;
  assert.equal(g.chooseEvent(0), true);  // Take the coin
  assert.equal(g.run.gold, gold + 35);
  assert.equal(g.run.screen, "map");
  assert.equal(g.chooseEvent(0), false, "not on an event any more");
});

test("quitting mid-fight ends the run as a fall", () => {
  fight(["D....", "..@..", "....."]);
  g.quit();
  assert.equal(g.run.fight.over, "lose");
  assert.equal(g.run.hp, 0);
  assert.equal(g.run.screen, "end");
  assert.equal(g.run.end.won, false);
});

test("saved runs: a v2 save's page notes move under fight.ui", () => {
  newRun("recruit", 0, 3); g.startFight("fight");
  const v2 = JSON.parse(JSON.stringify(g.run));
  v2.v = 2; Object.assign(v2.fight, { coach: { step: true }, briefed: true, briefNew: ["contra"] });
  const r = K.migrateRun(v2);
  assert.equal(r.v, K.RUN_V);
  assert.deepEqual(r.fight.ui, { coach: { step: true }, briefed: true, briefNew: ["contra"] });
  for (const k of ["coach", "briefed", "briefNew"]) assert.ok(!(k in r.fight));
});

test("the move preview says where a piece would drop: an enemy, and a boss that climbs back out", () => {
  let F = fight([
    "Do.....",
    ".......",
    "...@..."
  ]);
  assert.deepEqual(g.preview(g2 => g2.step(1, 0)).drops, [{ x: 1, y: 0 }]);
  assert.deepEqual(g.preview(g2 => g2.step(0, 1)).drops, [], "a step with no drop");
  assert.equal(F.enemies.length, 1, "the preview leaves the real fight alone");
  F = fight([
    ".........",
    "....o....",
    ".........",
    "@........",
    "........."
  ], { kind: "boss" });
  put("colossus", 3, 1);
  const pv = g.preview(g2 => g2.step(1, 0));
  assert.deepEqual(pv.drops, [{ x: 4, y: 1 }], "the Colossus steps in");
  assert.equal(pv.dmg, 0);
});
