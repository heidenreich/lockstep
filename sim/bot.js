// Fight bots shared by the harness (run4.js) and the stall traces. Each bot takes the game it plays and returns an
// action: { kind: "step", dx, dy } or { kind: "card", slot, dx, dy }. They look ahead on game.fork()s.
const K = require("../rules.js");

// The moves open to you: wait, the four steps, and every ready card in every direction it allows.
function actions(g) {
  const out = [{ kind: "step", dx: 0, dy: 0 }];
  for (const [dx, dy] of K.DIRS) out.push({ kind: "step", dx, dy });
  g.run.hand.forEach((c, slot) => {
    if (c.cd > 0) return;
    if (K.CARDS[c.id].dir) { for (const [dx, dy] of K.DIRS) if (!g.cardBlock(slot, dx, dy)) out.push({ kind: "card", slot, dx, dy }); }
    else if (!g.cardBlock(slot, 0, 0)) out.push({ kind: "card", slot, dx: 0, dy: 0 });
  });
  return out;
}
const apply = (g, a) => (a.kind === "step" ? g.step(a.dx, a.dy) : g.play(a.slot, a.dx, a.dy));
// Plays a on a fork of g and returns the fork.
const tryOn = (g, a) => { const f = g.fork(); apply(f, a); return f; };

// How good a position is: health and gold, minus what's left standing, with a nudge toward bonuses.
function evalR(R) {
  const F = R.fight; if (!F) return 0;
  if (F.over === "lose" || R.hp <= 0) return -300;
  let v = R.hp * 7 + F.gold * 1.5;
  if (F.over === "win") return v + 80;
  for (const e of F.enemies) {
    const d = K.FOES[e.type];
    v -= e.hp * (d.boss ? 2.5 : 1.6);
    if (K.dist(e, F.p) === 1 && !K.fixed(e)) v -= 2;
    if (e.free && !d.chaser) v -= 1.2;
  }
  if (F.kind === "boss") v -= F.turn * 0.4;
  if (F.goal && !F.goal.ok) v -= 6;
  if (F.goal && F.goal.ok && F.goal.flag && !F.goal.took) v -= 0.6 * K.dist(F.p, F.goal.flag);
  return v;
}

// Naive: hit anything beside you, else walk toward the nearest enemy.
function naive(g) {
  const F = g.run.fight, P = F.p;
  const pass = (x, y) => g.inB(x, y) && !g.isWall(x, y) && !g.isPit(x, y);
  const bfs = (sx, sy) => {
    const f = new Map([[sx + "," + sy, 0]]), q = [[sx, sy]];
    while (q.length) {
      const [x, y] = q.shift(), d = f.get(x + "," + y);
      for (const [dx, dy] of K.DIRS) { const nx = x + dx, ny = y + dy, k = nx + "," + ny; if (pass(nx, ny) && !f.has(k)) { f.set(k, d + 1); q.push([nx, ny]); } }
    }
    return f;
  };
  for (const [dx, dy] of K.DIRS) if (g.enemyAt(P.x + dx, P.y + dy)) return { kind: "step", dx, dy };
  const f = bfs(P.x, P.y);
  let t = null, bd = 1e9;
  for (const e of F.enemies) { const d = f.get(e.x + "," + e.y); if (d != null && d < bd) { bd = d; t = e; } }
  if (!t) return { kind: "step", dx: 0, dy: 0 };
  const toT = bfs(t.x, t.y);
  let best = null, bv = 1e9;
  for (const [dx, dy] of K.DIRS) {
    const nx = P.x + dx, ny = P.y + dy;
    if (!pass(nx, ny) || g.enemyAt(nx, ny)) continue;
    const v = toT.get(nx + "," + ny);
    if (v != null && v < bv) { bv = v; best = { kind: "step", dx, dy }; }
  }
  return best || { kind: "step", dx: 0, dy: 0 };
}
// 1-ply: the move whose result scores best (ties broken at random).
function ply1(g) {
  let best = null, bv = -1e9;
  for (const a of actions(g)) { const v = evalR(tryOn(g, a).run) + Math.random() * 0.01; if (v > bv) { bv = v; best = a; } }
  return best;
}
// 2-ply: the four best moves, each averaged with the best reply after it.
function ply2(g) {
  const scored = [];
  for (const a of actions(g)) { const s = tryOn(g, a); scored.push({ a, v: evalR(s.run), s }); }
  scored.sort((x, y) => y.v - x.v);
  let best = scored[0].a, bv = -1e9;
  for (const { a, v, s } of scored.slice(0, 4)) {
    let v2 = v;
    if (!s.run.fight.over) { let b2 = -1e9; for (const a2 of actions(s)) b2 = Math.max(b2, evalR(tryOn(s, a2).run)); v2 = 0.5 * v + 0.5 * b2; }
    v2 += Math.random() * 0.01; if (v2 > bv) { bv = v2; best = a; }
  }
  return best;
}
// The board as text, for traces: @ you, B a boss, letters for enemies (capitals when broken free), # walls, o pits (x filled).
function board(g) {
  const F = g.run.fight, rm = K.fightRoom(F), rows = [];
  for (let y = 0; y < g.H; y++) {
    let r = "";
    for (let x = 0; x < g.W; x++) {
      const e = g.enemyAt(x, y);
      r += F.p.x === x && F.p.y === y ? "@" : e ? (K.FOES[e.type].boss ? "B" : e.free ? e.type[0].toUpperCase() : e.type[0])
        : g.isWall(x, y) ? "#" : rm.pits.has(x + "," + y) ? (g.isPit(x, y) ? "o" : "x") : ".";
    }
    rows.push(r);
  }
  return rows.join("\n");
}
module.exports = { actions, apply, tryOn, evalR, naive, ply1, ply2, board };
