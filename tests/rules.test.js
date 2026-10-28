// Rule tests for rules.js. usage: node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const G = require("../rules.js");
G.SIM = true;

// Builds a fight in a hand-drawn room. Room symbols as in ROOMS, plus "@" for you and a letter per enemy:
// D drone, C contrarian, H heavy, N anchor, U runner, R rifleman (rifles start loaded).
const PIECES = { D: "drone", C: "contra", H: "heavy", N: "anchor", U: "runner", R: "rifle" };
function fight(rows, { char = "recruit", cad = 0, kind = "fight" } = {}) {
  G.newRun(char, cad, 1);
  G.startFight(kind);
  const placed = [];
  let p = null;
  const clean = rows.map((row, y) => [...row].map((ch, x) => {
    if (ch === "@") { p = { x, y }; return "."; }
    if (PIECES[ch]) { placed.push({ type: PIECES[ch], x, y }); return "."; }
    return ch;
  }).join(""));
  G.ROOMS.push(G.room("test", clean));
  const F = G.R.fight;
  F.room = G.ROOMS.length - 1;
  F.kegs = [...G.ROOMS[F.room].kegs];
  F.enemies = []; F.goal = null; F.log = []; F.p = p;
  G.setDims();
  for (const { type, x, y } of placed) put(type, x, y);
  return F;
}
function put(type, x, y) {
  const F = G.R.fight, d = G.FOES[type];
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
  G.step(1, 0);
  assert.deepEqual(F.p, { x: 5, y: 3 });
  assert.deepEqual(at(F, "drone"), [[2, 1]]);
  assert.deepEqual(at(F, "contra"), [[6, 1]]);
  assert.equal(G.R.hp, 8);
});

test("an enemy stepped into a pit dies, pays 1 gold, and the pit fills after two", () => {
  const F = fight([
    "Do.....",
    ".......",
    ".......",
    "...@..."
  ]);
  G.step(1, 0);
  assert.equal(F.enemies.length, 0);
  assert.equal(F.gold, 1);
  assert.equal(F.over, "win");
  assert.equal(G.isPit(1, 0), true);
  G.fall(put("drone", 0, 0), 1, 0);
  assert.equal(G.isPit(1, 0), false, "two drops fill the pit");
});

test("three blocked turns in a row break an enemy free", () => {
  const F = fight([
    "D#.......",
    ".........",
    ".........",
    "@........"
  ]);
  const d = F.enemies[0];
  G.step(1, 0); G.step(1, 0);
  assert.equal(d.free, false);
  assert.equal(d.blocked, 2);
  G.step(1, 0);
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
  for (const dx of [-1, 1, -1]) G.step(dx, 0);
  assert.equal(d.free, true);
  G.step(1, 0);
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
  G.step(1, 0);
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
  G.play(0, -1, 0);
  assert.deepEqual(at(F, "drone"), [[2, 0]]);
});

test("rifle shots: walls stop them, enemies in the way take them, a clear line hits you", () => {
  let F = fight([
    "R.#.@",
    ".....",
    "....."
  ]);
  G.riflesFire();
  assert.equal(G.R.hp, 8);
  assert.equal(F.enemies[0].load, 0, "a blocked rifle stays loaded");

  F = fight([
    "R.D.@",
    ".....",
    "....."
  ]);
  G.riflesFire();
  assert.deepEqual(at(F, "drone"), []);
  assert.equal(G.R.hp, 8);

  F = fight([
    "R...@",
    ".....",
    "....."
  ]);
  G.riflesFire();
  assert.equal(G.R.hp, 7);
  assert.equal(F.enemies[0].load, G.RELOAD);
});

test("riflemen yield once the rest of their line is gone", () => {
  const F = fight([
    "R......",
    ".......",
    "...@...",
    ".......",
    "......D"
  ]);
  G.kill(F.enemies[1], "test");
  G.endTurn(null);
  assert.equal(F.enemies.length, 0);
  assert.equal(F.over, "win");
});

test("the same seed gives the same run", () => {
  const map = seed => { G.newRun("recruit", 0, seed); return JSON.stringify(G.R.map); };
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
  const pv = G.preview(() => G.step(0, 0));
  G.step(0, 0);
  assert.deepEqual(pv.enemies, G.R.fight.enemies.map(e => ({ id: e.id, x: e.x, y: e.y, free: e.free })));
});

test("shop: a full hand asks which card to replace; no gold, no sale", () => {
  G.newRun("recruit", 0, 1);
  G.R.hand.push({ id: "lunge", cd: 0, up: false });
  G.R.shop = G.makeShop(); G.R.screen = "shop";
  const o = G.R.shop.cards[0];
  G.R.gold = o.price - 1;
  assert.equal(G.buyCard(0), false);
  assert.equal(G.R.shop.pending, null);
  G.R.gold = o.price;
  assert.equal(G.buyCard(0), false);
  assert.deepEqual(G.R.shop.pending, { id: o.id, idx: 0 });
  assert.equal(G.buyCard(0, 2), true);
  assert.equal(G.R.hand[2].id, o.id);
  assert.equal(G.R.gold, 0);
  assert.equal(o.sold, true);
  G.R.hp = G.R.maxhp - 3;
  assert.equal(G.buyHeal(), false);
});
