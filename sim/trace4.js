// Trace a stalled Colossus fight with the 1-ply bot.
const { loadGame } = require("./load.js");
const G = loadGame("/Users/todd/lockstep/index.html", ["R", "SIM", "newRun", "enterNode", "step", "play", "cardBlock", "CARDS", "FOES", "ROOMS", "BOSSES", "enemyAt", "isWall", "isPit", "inB", "DIRS", "dist"]);
G.SIM = true;
const clone = s => JSON.parse(JSON.stringify(s));
function actions() { const out = [{ kind: "step", dx: 0, dy: 0 }]; for (const [dx, dy] of G.DIRS) out.push({ kind: "step", dx, dy }); G.R.hand.forEach((c, slot) => { if (c.cd > 0) return; if (G.CARDS[c.id].dir) { for (const [dx, dy] of G.DIRS) if (!G.cardBlock(slot, dx, dy)) out.push({ kind: "card", slot, dx, dy }); } else if (!G.cardBlock(slot, 0, 0)) out.push({ kind: "card", slot, dx: 0, dy: 0 }); }); return out; }
const apply = a => (a.kind === "step" ? G.step(a.dx, a.dy) : G.play(a.slot, a.dx, a.dy));
function evalR(R) { const F = R.fight; if (F.over === "lose" || R.hp <= 0) return -300; let v = R.hp * 7 + F.gold * 1.5; if (F.over === "win") return v + 80; for (const e of F.enemies) { const d = G.FOES[e.type]; v -= e.hp * (d.boss ? 2.5 : 1.6); if (G.dist(e, F.p) === 1 && !d.fixed) v -= 2; if (e.free && !d.chaser) v -= 1.2; } if (F.kind === "boss") v -= F.turn * 0.4; return v; }
const ply1 = () => { const R0 = G.R; let best = null, bv = -1e9; for (const a of actions()) { G.R = clone(R0); G.SIM = true; apply(a); const v = evalR(G.R) + Math.random() * 0.01; if (v > bv) { bv = v; best = a; } } G.R = R0; return best; };
function board() { const F = G.R.fight, rows = []; for (let y = 0; y < 11; y++) { let r = ""; for (let x = 0; x < 11; x++) { const e = G.enemyAt(x, y); r += (F.p.x === x && F.p.y === y) ? "@" : e ? (G.FOES[e.type].boss ? "B" : e.free ? e.type[0].toUpperCase() : e.type[0]) : G.isWall(x, y) ? "#" : G.ROOMS[F.room].pits.has(x + "," + y) ? (G.isPit(x, y) ? "o" : "x") : "."; } rows.push(r); } return rows.join("\n"); }
for (let i = 0, found = 0; i < 60 && found < 2; i++) {
  G.newRun("recruit", 0); G.R.map.nodes = { "0:0": { r: 0, c: 0, t: "boss" } }; G.R.map.edges = []; G.R.pos = null; G.enterNode("0:0");
  const F = G.R.fight; let t = 0; const hist = [];
  while (!F.over && t < 200) { const a = ply1(); hist.push(a.kind === "card" ? G.R.hand[a.slot].id + (a.dx || a.dy ? `(${a.dx},${a.dy})` : "") : `s(${a.dx},${a.dy})`); apply(a); G.SIM = true; t++; }
  if (!F.over) { found++; const b = F.enemies.find(e => G.FOES[e.type].boss); console.log(`--- stall run ${i}: turn ${t} hp ${G.R.hp} boss hp ${b && b.hp} boss free ${b && b.free} blocked ${b && b.blocked} enemies ${F.enemies.length} room ${G.ROOMS[F.room].name}`); console.log(board()); console.log(F.log.map(l => l.t + " " + l.msg).join("\n")); console.log("last 16:", hist.slice(-16).join(" ")); }
}
