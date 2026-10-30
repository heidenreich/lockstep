// Content tests: every card, perk and event does what its text says. usage: npm test
const test = require("node:test");
const assert = require("node:assert/strict");
const { K, T, newRun, fight, put, at } = require("./helpers.js");
const g = () => T.g;

// The standard board for cards: you at (4,3), a drone at (2,1), open ground around.
const BOARD = [
  ".........",
  "..D......",
  ".........",
  "....@....",
  "........."
];
// Starts a fight with only `id` in hand, plays it toward (dx, dy) and returns the fight.
function playCard(id, dx, dy, setup, rows = BOARD, opts) {
  const F = fight(rows, opts);
  g().run.hand = [{ id, cd: 0, up: false }];
  if (setup) setup(F);
  assert.equal(g().cardBlock(0, dx, dy), "", `${id} can be played`);
  assert.ok(g().play(0, dx, dy));
  assert.equal(g().run.hand[0].cd, K.CARDS[id].cd, `${id} goes on cooldown`);
  return F;
}
const me = F => [F.p.x, F.p.y];

test("every card has its rule: a play(), an optional check(), name, cooldowns and text", () => {
  for (const [id, c] of Object.entries(K.CARDS)) {
    assert.equal(typeof c.play, "function", id);
    if (c.check) assert.equal(typeof c.check, "function", id);
    assert.ok(c.name && c.text && c.cd > 0 && c.cdUp > 0, id);
  }
  for (const id of K.START_POOL) assert.ok(K.CARDS[id], id);
  for (const c of Object.values(K.CHARS)) for (const id of c.hand) assert.ok(K.CARDS[id], id);
});

test("cards: each moves you and the room the way its text says", () => {
  const cases = [
    ["sidestep", "you move 1, the room holds", [5, 3], [2, 1]],
    ["stomp", "you stay, the room moves 1", [4, 3], [3, 1]],
    ["doubletime", "you move 1, the room moves 2", [5, 3], [4, 1]],
    ["aboutface", "you move 1, the room moves the other way", [5, 3], [1, 1]],
    ["lunge", "you dash 2, the room moves 1", [6, 3], [3, 1]]
  ];
  for (const [id, what, you, drone] of cases) {
    const F = playCard(id, 1, 0);
    assert.deepEqual(me(F), you, `${id}: ${what} (you)`);
    assert.deepEqual(at(F, "drone"), [drone], `${id}: ${what} (drone)`);
  }
});

test("Shove hits an adjacent enemy for 1 and knocks it back 2; the room holds", () => {
  const F = playCard("shove", 1, 0, () => put("heavy", 5, 3));
  const h = F.enemies.find(e => e.type === "heavy");
  assert.deepEqual([h.x, h.y, h.hp], [7, 3, 1]);
  assert.deepEqual(at(F, "drone"), [[2, 1]]);
  fight(BOARD); g().run.hand = [{ id: "shove", cd: 0, up: false }];
  assert.match(g().cardBlock(0, 1, 0), /needs an enemy/);
});

test("Quake hurts enemies already pinned when the room moves", () => {
  const F = playCard("quake", -1, 0, () => { const h = put("heavy", 0, 0); h.blocked = 1; });
  assert.equal(F.enemies.find(e => e.type === "heavy").hp, 1);
  assert.deepEqual(me(F), [4, 3]);
});

test("Magnet pulls each locked enemy 1 toward you", () => {
  const F = playCard("magnet", 0, 0);
  assert.deepEqual(at(F, "drone"), [[3, 1]]);
});

test("Recall puts enemies that broke free back in step (and can't be played when none have)", () => {
  fight(BOARD); g().run.hand = [{ id: "recall", cd: 0, up: false }];
  assert.match(g().cardBlock(0, 0, 0), /Nothing has broken free/);
  const F = playCard("recall", 0, 0, F => { F.enemies[0].free = true; });
  assert.equal(F.enemies[0].free, false);
});

test("Trapdoor opens a pit beside you for a few turns", () => {
  const F = playCard("trapdoor", 1, 0);
  assert.deepEqual(F.traps.map(t => [t.x, t.y]), [[5, 3]]);
  assert.ok(g().isPit(5, 3));
});

test("Brace: no damage this turn", () => {
  const F = playCard("brace", 0, 0, F => { const d = put("drone", 5, 3); d.free = true; });
  assert.equal(g().run.hp, 8);
  assert.equal(F.brace, false, "it lasts the one turn");
});

test("perks: bump harder, first hit blocked, slower breaks, deeper pits, bigger blasts, spike boots", () => {
  // Fixed bayonets: a bump deals 2.
  let F = fight([".....", "..@H.", "....."], { orders: ["bayonet"] });
  g().step(1, 0);
  assert.deepEqual(at(F, "heavy"), [], "bayonet");
  // Iron ranks: the first hit each fight does nothing.
  F = fight([".....", "..@D.", "....."], { orders: ["iron"] });
  F.enemies[0].free = true;
  g().step(0, 0);
  assert.equal(g().run.hp, 8, "iron blocks the first hit");
  g().step(0, 0);
  assert.equal(g().run.hp, 7, "iron: the second hit lands");
  // Steady drum: 4 blocked turns to break step, not 3.
  F = fight(["D#.......", ".........", "@........"], { orders: ["steady"] });
  for (let i = 0; i < 3; i++) g().step(1, 0);
  assert.equal(F.enemies[0].free, false, "steady: still in step after 3");
  g().step(1, 0);
  assert.equal(F.enemies[0].free, true, "steady: breaks at 4");
  // Short fuses: kegs deal 2.
  F = fight(["HK.....", ".......", "...@..."], { orders: ["fuse"] });
  g().explode(1, 0);
  assert.deepEqual(at(F, "heavy"), [], "fuse");
  // Hobnail boots: spikes don't hurt you.
  fight([".......", "...@^..", "......D"], { orders: ["boots"] });
  g().step(1, 0);
  assert.equal(g().run.hp, 8, "boots");
});

test("perks: Deep pits holds one more; Reserve slot adds a card slot; Quartermaster's friend cuts prices", () => {
  newRun("recruit", 0, 1);
  const hold = g().run.pitHold, slots = g().run.slots;
  g().takeOrder("deep"); g().takeOrder("reserve");
  assert.equal(g().run.pitHold, hold + 1);
  assert.equal(g().run.slots, slots + 1);
  const full = g().makeShop().upPrice;
  g().takeOrder("quarter");
  assert.equal(g().makeShop().upPrice, Math.round(full * 0.75 / 5) * 5);
});

test("perks: Sappers' pride cools cards on a pit drop; Crossfire's shots deal 3; Rally heals on a combo; Field surgeon heals after a fight", () => {
  let F = fight(["Do.....", ".......", "...@..."], { orders: ["sappers"] });
  g().run.hand = [{ id: "lunge", cd: 3, up: false }];
  g().step(1, 0);
  assert.equal(F.pitKills, 1);
  assert.equal(g().run.hand[0].cd, 1, "sappers: one turn closer, plus the turn passing");
  F = fight(["R.H.@", ".....", "....."], { orders: ["crossfire"] });  // a rifleman fires along its row when you're in it
  F.enemies[0].load = 0;
  g().riflesFire();
  assert.deepEqual(at(F, "heavy"), [], "crossfire");
  F = fight(["DKK....", "..D....", ".......", ".......", "...@..."], { orders: ["rally"] });
  g().run.hp = 5;
  g().step(1, 0);
  assert.equal(g().run.hp, 6, "rally");
  F = fight([".....", "..@..", "....D"], { orders: ["medic"] });
  g().run.hp = 5;
  g().kill(F.enemies[0], "test"); g().endTurn(null); g().fightReward();
  assert.equal(g().run.hp, 6, "medic");
});

test("every perk has a name and text, and is offered", () => {
  for (const [id, o] of Object.entries(K.ORDERS)) assert.ok(o.name && o.text, id);
  for (const s of Object.values(K.SYNERGIES)) { assert.ok(K.CARDS[s.card], s.name); assert.ok(K.ORDERS[s.order], s.name); }
});

test("events: every choice does what it says", () => {
  const cases = {
    "The sergeant major": [r => r.hp === 6 && r.hand.some(c => c.up), r => r.hp === 8 && !r.hand.some(c => c.up)],
    "An abandoned kit": [r => r.gold === 35, r => r.hand.length === 3],
    "The field medic": [r => r.hp === 8, r => r.maxhp === 9 && r.hp === 9],
    "A cracked drum": [r => r.gold === 60 && r.maxhp === 7, r => r.gold === 0 && r.maxhp === 8]
  };
  assert.deepEqual(K.EVENTS.map(e => e.title).sort(), Object.keys(cases).sort());
  for (const [title, checks] of Object.entries(cases)) checks.forEach((ok, i) => {
    newRun("recruit", 0, 4);
    g().run.screen = "event"; g().run.event = K.EVENTS.findIndex(e => e.title === title);
    assert.ok(g().chooseEvent(i));
    assert.ok(ok(g().run), `${title}: choice ${i + 1}`);
    assert.equal(g().run.screen, "map");
  });
});

test("acts, bosses and the Cadence ladder are consistent", () => {
  for (const A of K.ACTS) {
    for (const id of [...A.rooms, A.bossRoom]) assert.ok(K.roomById(id), id);
    assert.ok(K.FOES[A.boss].boss && K.FOES[K.FOES[A.boss].adds], A.boss);
    for (const t of A.roster) assert.ok(K.FOES[t], t);
  }
  assert.deepEqual(K.cadenceFx(0), { enemies: 0, frenzy: 0, eliteHp: 0, restHeal: 0, bossHp: 0, hp: 0 });
  assert.deepEqual(K.cadenceFx(5), { enemies: 1, frenzy: -6, eliteHp: 1, restHeal: -1, bossHp: 4, hp: -2 });
  newRun("recruit", 5, 1);
  assert.equal(g().run.hp, K.CHARS.recruit.hp - 2);
});

test("unlocks: each is earned by its run event", () => {
  const cases = [["drummer", { beat: "colossus" }], ["quake", { beat: "colossus" }], ["recall", { beat: "mirror" }], ["magnet", { act: 2 }], ["sapper", { won: true }], ["brace", { deaths: 3 }]];
  for (const u of K.UNLOCKS) assert.ok(cases.some(([id, e]) => id === u.id && u.when(e)), u.what);
  for (const u of K.UNLOCKS) assert.ok(!u.when({ deaths: 2 }) && !u.when({ act: 3 }), u.what);
});

test("the Mirror flips direction every 5 turns, for 5 turns: the line steps the opposite way", () => {
  const F = fight([
    ".........",
    "..D......",
    ".........",
    "....@....",
    "........."
  ], { kind: "boss" });
  put("mirror", 8, 4);
  for (let i = 0; i < 5; i++) g().endTurn(null);
  assert.equal(F.flip, 5);
  g().step(1, 0);
  assert.deepEqual(at(F, "drone"), [[1, 1]], "while flipped, a drone steps the opposite way to you");
});
