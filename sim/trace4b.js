// Trace stalled normal/elite fights with the 1-ply bot across a run.
const K = require("../rules.js");
let game = null;
const newGame = () => (game = K.makeGame(null, { sim: true }));
function actions(g) { const out = [{ kind: "step", dx: 0, dy: 0 }]; for (const [dx, dy] of K.DIRS) out.push({ kind: "step", dx, dy }); g.run.hand.forEach((c, slot) => { if (c.cd > 0) return; if (K.CARDS[c.id].dir) { for (const [dx, dy] of K.DIRS) if (!g.cardBlock(slot, dx, dy)) out.push({ kind: "card", slot, dx, dy }); } else if (!g.cardBlock(slot, 0, 0)) out.push({ kind: "card", slot, dx: 0, dy: 0 }); }); return out; }
const apply = (g, a) => (a.kind === "step" ? g.step(a.dx, a.dy) : g.play(a.slot, a.dx, a.dy));
function evalR(R) { const F = R.fight; if (F.over === "lose" || R.hp <= 0) return -300; let v = R.hp * 7 + F.gold * 1.5; if (F.over === "win") return v + 80; for (const e of F.enemies) { const d = K.FOES[e.type]; v -= e.hp * (d.boss ? 2.5 : 1.6); if (K.dist(e, F.p) === 1 && !K.fixed(e)) v -= 2; if (e.free && !d.chaser) v -= 1.2; } if (F.kind === "boss") v -= F.turn * 0.4; return v; }
const ply1 = () => { let best = null, bv = -1e9; for (const a of actions(game)) { const f = game.fork(); apply(f, a); const v = evalR(f.run) + Math.random() * 0.01; if (v > bv) { bv = v; best = a; } } return best; };
function board() { const F = game.run.fight, rows = []; for (let y = 0; y < game.H; y++) { let r = ""; for (let x = 0; x < game.W; x++) { const e = game.enemyAt(x, y); r += (F.p.x === x && F.p.y === y) ? "@" : e ? (K.FOES[e.type].boss ? "B" : e.free ? e.type[0].toUpperCase() : e.type[0]) : game.isWall(x, y) ? "#" : K.fightRoom(F).pits.has(x + "," + y) ? (game.isPit(x, y) ? "o" : "x") : "."; } rows.push(r); } return rows.join("\n"); }
let found = 0;
for (let i = 0; i < 80 && found < 2; i++) {
  newGame(); game.newRun("recruit", 0); let guard = 0;
  while (game.run.screen !== "end" && guard++ < 200 && found < 2) {
    const R = game.run;
    if (R.screen === "map") { const open = game.openNodes(); const k = open.find(x => ["fight", "elite"].includes(R.map.nodes[x].t)) || open[0]; game.enterNode(k); continue; }
    if (R.screen === "fight") {
      const F = R.fight; let t = 0; while (!F.over && t < 200) { apply(game, ply1()); t++; }
      if (!F.over) { found++; console.log(`--- stall ${F.kind} act ${R.act} room ${K.fightRoom(F).name} turn ${t} hp ${R.hp} frenzy ${F.frenzy} hand ${R.hand.map(c => c.id).join(",")}`); console.log(board()); console.log(F.enemies.map(e => `${e.type}@${e.x},${e.y} free=${e.free} blocked=${e.blocked} chased=${e.chased} hp=${e.hp}`).join("\n")); console.log(F.log.map(l => l.t + " " + l.msg).join("\n")); F.over = "lose"; }
      if (F.over === "lose") { game.endRun(false); break; }
      game.fightReward(); const id = R.reward.cards[0]; if (id) { if (R.hand.length < R.slots) game.takeCard(id); else game.takeCard(id, 0); } game.leaveNode(); continue;
    }
    if (R.screen === "event") { K.EVENTS[R.event].opts[0].go(game); game.leaveNode(); continue; }
    game.leaveNode();
  }
}
if (!found) console.log("no normal-fight stalls in 80 runs");
