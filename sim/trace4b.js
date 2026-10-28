// Trace stalled normal/elite fights with the 1-ply bot across a run.
const { loadGame } = require("./load.js");
const G = loadGame("/Users/todd/lockstep/index.html", ["R", "SIM", "newRun", "openNodes", "enterNode", "step", "play", "cardBlock", "fightReward", "takeCard", "leaveNode", "endRun", "CARDS", "FOES", "ROOMS", "enemyAt", "isWall", "isPit", "inB", "DIRS", "dist", "EVENTS"]);
G.SIM = true;
const clone = s => JSON.parse(JSON.stringify(s));
function actions() { const out = [{ kind: "step", dx: 0, dy: 0 }]; for (const [dx, dy] of G.DIRS) out.push({ kind: "step", dx, dy }); G.R.hand.forEach((c, slot) => { if (c.cd > 0) return; if (G.CARDS[c.id].dir) { for (const [dx, dy] of G.DIRS) if (!G.cardBlock(slot, dx, dy)) out.push({ kind: "card", slot, dx, dy }); } else if (!G.cardBlock(slot, 0, 0)) out.push({ kind: "card", slot, dx: 0, dy: 0 }); }); return out; }
const apply = a => (a.kind === "step" ? G.step(a.dx, a.dy) : G.play(a.slot, a.dx, a.dy));
function evalR(R) { const F = R.fight; if (F.over === "lose" || R.hp <= 0) return -300; let v = R.hp * 7 + F.gold * 1.5; if (F.over === "win") return v + 80; for (const e of F.enemies) { const d = G.FOES[e.type]; v -= e.hp * (d.boss ? 2.5 : 1.6); if (G.dist(e, F.p) === 1 && !d.fixed) v -= 2; if (e.free && !d.chaser) v -= 1.2; } if (F.kind === "boss") v -= F.turn * 0.4; return v; }
const ply1 = () => { const R0 = G.R; let best = null, bv = -1e9; for (const a of actions()) { G.R = clone(R0); G.SIM = true; apply(a); const v = evalR(G.R) + Math.random() * 0.01; if (v > bv) { bv = v; best = a; } } G.R = R0; return best; };
function board() { const F = G.R.fight, rows = []; for (let y = 0; y < 11; y++) { let r = ""; for (let x = 0; x < 11; x++) { const e = G.enemyAt(x, y); r += (F.p.x === x && F.p.y === y) ? "@" : e ? (G.FOES[e.type].boss ? "B" : e.free ? e.type[0].toUpperCase() : e.type[0]) : G.isWall(x, y) ? "#" : G.ROOMS[F.room].pits.has(x + "," + y) ? (G.isPit(x, y) ? "o" : "x") : "."; } rows.push(r); } return rows.join("\n"); }
let found = 0;
for (let i = 0; i < 80 && found < 2; i++) {
  G.newRun("recruit", 0); let guard = 0;
  while (G.R.screen !== "end" && guard++ < 200 && found < 2) {
    const R = G.R;
    if (R.screen === "map") { const open = G.openNodes(); const k = open.find(x => ["fight", "elite"].includes(R.map.nodes[x].t)) || open[0]; G.enterNode(k); continue; }
    if (R.screen === "fight") {
      const F = R.fight; let t = 0; while (!F.over && t < 200) { apply(ply1()); G.SIM = true; t++; }
      if (!F.over) { found++; console.log(`--- stall ${F.kind} act ${R.act} room ${G.ROOMS[F.room].name} turn ${t} hp ${R.hp} frenzy ${F.frenzy} hand ${R.hand.map(c => c.id).join(",")}`); console.log(board()); console.log(F.enemies.map(e => `${e.type}@${e.x},${e.y} free=${e.free} blocked=${e.blocked} chased=${e.chased} hp=${e.hp}`).join("\n")); console.log(F.log.map(l => l.t + " " + l.msg).join("\n")); F.over = "lose"; }
      if (F.over === "lose") { G.endRun(false); break; }
      G.fightReward(); const id = R.reward.cards[0]; if (id) { if (R.hand.length < R.slots) G.takeCard(id); else G.takeCard(id, 0); } G.leaveNode(); continue;
    }
    if (R.screen === "event") { G.EVENTS[R.event].opts[0].go(); G.leaveNode(); continue; }
    G.leaveNode();
  }
}
if (!found) console.log("no normal-fight stalls in 80 runs");
