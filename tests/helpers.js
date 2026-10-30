// Shared test fixture: a sim game per test, and fights in hand-drawn rooms.
const K = require("../rules.js");

// The game the current test plays (newRun and fight replace it).
const T = { g: null };
function newRun(char, cad, seed) { T.g = K.makeGame(null, { sim: true }); return T.g.newRun(char, cad, seed); }

// Builds a fight in a hand-drawn room. Room symbols as in ROOMS, plus "@" for you and a letter per enemy:
// D drone, C contrarian, H heavy, N anchor, U runner, R rifleman (rifles start loaded).
let testRooms = 0;
const PIECES = { D: "drone", C: "contra", H: "heavy", N: "anchor", U: "runner", R: "rifle" };
// orders: perks the run holds from the start of the fight.
function fight(rows, { char = "recruit", cad = 0, kind = "fight", orders = [] } = {}) {
  newRun(char, cad, 1);
  const g = T.g;
  g.run.orders = [...orders];
  g.startFight(kind);
  const placed = [];
  let p = null;
  const clean = rows.map((row, y) => [...row].map((ch, x) => {
    if (ch === "@") { p = { x, y }; return "."; }
    if (PIECES[ch]) { placed.push({ type: PIECES[ch], x, y }); return "."; }
    return ch;
  }).join(""));
  // Each test gets a room of its own, registered by a fresh id (nothing is added to the game's room list).
  const rm = K.addRoom(K.room(`test-${++testRooms}`, "test", clean));
  const F = g.run.fight;
  F.room = rm.id; F.orient = 0;
  F.kegs = [...rm.kegs];
  F.enemies = []; F.goal = null; F.log = []; F.p = p;
  g.setDims();
  for (const { type, x, y } of placed) put(type, x, y);
  return F;
}
function put(type, x, y) {
  const F = T.g.run.fight, d = K.FOES[type];
  const e = { id: F.nextId++, type, x, y, hp: d.hp, max: d.hp, blocked: 0, free: !!d.chaser, chased: 0, skip: false, dir: [0, 1] };
  if (d.rifle) e.load = 0;
  F.enemies.push(e);
  return e;
}
const at = (F, type) => F.enemies.filter(e => e.type === type).map(e => [e.x, e.y]);
module.exports = { K, T, newRun, fight, put, at };
