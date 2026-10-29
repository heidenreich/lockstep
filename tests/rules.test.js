// Rule tests for rules.js. usage: node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const K = require("../rules.js");

// Each test plays in its own sim game.
let g = null;
function newRun(char, cad, seed) { g = K.makeGame(null, { sim: true }); return g.newRun(char, cad, seed); }

// Builds a fight in a hand-drawn room. Room symbols as in ROOMS, plus "@" for you and a letter per enemy:
// D drone, C contrarian, H heavy, N anchor, U runner, R rifleman (rifles start loaded).
const PIECES = { D: "drone", C: "contra", H: "heavy", N: "anchor", U: "runner", R: "rifle" };
function fight(rows, { char = "recruit", cad = 0, kind = "fight" } = {}) {
  newRun(char, cad, 1);
  g.startFight(kind);
  const placed = [];
  let p = null;
  const clean = rows.map((row, y) => [...row].map((ch, x) => {
    if (ch === "@") { p = { x, y }; return "."; }
    if (PIECES[ch]) { placed.push({ type: PIECES[ch], x, y }); return "."; }
    return ch;
  }).join(""));
  K.ROOMS.push(K.room("test", clean));
  const F = g.run.fight;
  F.room = K.ROOMS.length - 1;
  F.kegs = [...K.ROOMS[F.room].kegs];
  F.enemies = []; F.goal = null; F.log = []; F.p = p;
  g.setDims();
  for (const { type, x, y } of placed) put(type, x, y);
  return F;
}
function put(type, x, y) {
  const F = g.run.fight, d = K.FOES[type];
  const e = { id: F.nextId++, type, x, y, hp: d.hp, max: d.hp, blocked: 0, free: !!d.chaser, chased: 0, skip: false, dir: [0, 1] };
  if (d.rifle) e.load = 0;
  F.enemies.push(e);
  return e;
}
const at = (F, type) => F.enemies.filter(e => e.type === type).map(e => [e.x, e.y]);

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
  assert.match(K.CADENCE[2], /6 turns sooner/);
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

test("combining two profile copies keeps progress from both", () => {
  const local = { runs: 5, wins: 1, deaths: 4, bestAct: 3, beat: { colossus: true }, chars: { drummer: true }, cards: { brace: true }, cad: { recruit: 1 } };
  const account = { runs: 3, wins: 2, deaths: 1, bestAct: 2, beat: { mirror: true }, chars: { sapper: true }, cards: { quake: true }, cad: { recruit: 0, sapper: 2 } };
  const p = K.combineProfiles(local, account);
  assert.equal(p.runs, 5); assert.equal(p.wins, 2); assert.equal(p.deaths, 4); assert.equal(p.bestAct, 3);
  assert.deepEqual(p.beat, { colossus: true, mirror: true });
  assert.deepEqual(p.chars, { recruit: true, drummer: true, sapper: true });
  assert.deepEqual(p.cards, { brace: true, quake: true });
  assert.deepEqual(p.cad, { recruit: 1, sapper: 2 });
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
  K.ROOMS[F.room].pits.add("9,1");
  g.step(0, -1);  // a chase turn: it closes in
  assert.equal(w.skip, true);
  const before = [w.x, w.y];
  assert.notDeepEqual(before, [8, 1]);
  w.x = 8; w.y = 1;
  g.step(1, 0);  // a march turn: it copies your step, into the pit
  assert.equal(w.hp, K.FOES.warden.hp - 3);
});

test("bonus orders: Clean drill fails on the first block, Parade order has a turn limit", () => {
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
