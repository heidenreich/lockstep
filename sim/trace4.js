// Trace a stalled Colossus fight with the 1-ply bot.
const K = require("../rules.js");
let game = null;
const newGame = () => (game = K.makeGame(null, { sim: true }));
function actions(g) { const out = [{ kind: "step", dx: 0, dy: 0 }]; for (const [dx, dy] of K.DIRS) out.push({ kind: "step", dx, dy }); g.run.hand.forEach((c, slot) => { if (c.cd > 0) return; if (K.CARDS[c.id].dir) { for (const [dx, dy] of K.DIRS) if (!g.cardBlock(slot, dx, dy)) out.push({ kind: "card", slot, dx, dy }); } else if (!g.cardBlock(slot, 0, 0)) out.push({ kind: "card", slot, dx: 0, dy: 0 }); }); return out; }
const apply = (g, a) => (a.kind === "step" ? g.step(a.dx, a.dy) : g.play(a.slot, a.dx, a.dy));
function evalR(R) { const F = R.fight; if (F.over === "lose" || R.hp <= 0) return -300; let v = R.hp * 7 + F.gold * 1.5; if (F.over === "win") return v + 80; for (const e of F.enemies) { const d = K.FOES[e.type]; v -= e.hp * (d.boss ? 2.5 : 1.6); if (K.dist(e, F.p) === 1 && !K.fixed(e)) v -= 2; if (e.free && !d.chaser) v -= 1.2; } if (F.kind === "boss") v -= F.turn * 0.4; return v; }
const ply1 = () => { let best = null, bv = -1e9; for (const a of actions(game)) { const f = game.fork(); apply(f, a); const v = evalR(f.run) + Math.random() * 0.01; if (v > bv) { bv = v; best = a; } } return best; };
function board() { const F = game.run.fight, rows = []; for (let y = 0; y < game.H; y++) { let r = ""; for (let x = 0; x < game.W; x++) { const e = game.enemyAt(x, y); r += (F.p.x === x && F.p.y === y) ? "@" : e ? (K.FOES[e.type].boss ? "B" : e.free ? e.type[0].toUpperCase() : e.type[0]) : game.isWall(x, y) ? "#" : K.ROOMS[F.room].pits.has(x + "," + y) ? (game.isPit(x, y) ? "o" : "x") : "."; } rows.push(r); } return rows.join("\n"); }
for (let i = 0, found = 0; i < 60 && found < 2; i++) {
  newGame(); game.newRun("recruit", 0); game.run.map.nodes = { "0:0": { r: 0, c: 0, t: "boss" } }; game.run.map.edges = []; game.run.pos = null; game.enterNode("0:0");
  const F = game.run.fight; let t = 0; const hist = [];
  while (!F.over && t < 200) { const a = ply1(); hist.push(a.kind === "card" ? game.run.hand[a.slot].id + (a.dx || a.dy ? `(${a.dx},${a.dy})` : "") : `s(${a.dx},${a.dy})`); apply(game, a); t++; }
  if (!F.over) { found++; const b = F.enemies.find(e => K.FOES[e.type].boss); console.log(`--- stall run ${i}: turn ${t} hp ${game.run.hp} boss hp ${b && b.hp} boss free ${b && b.free} blocked ${b && b.blocked} enemies ${F.enemies.length} room ${K.ROOMS[F.room].name}`); console.log(board()); console.log(F.log.map(l => l.t + " " + l.msg).join("\n")); console.log("last 16:", hist.slice(-16).join(" ")); }
}
