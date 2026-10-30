// Trace a stalled boss fight with the 1-ply bot: prints the board, the log and the last moves of up to 2 stalls.
// usage: node sim/trace4.js [act]   (act 1-3, default 1)
const K = require("../rules.js"), B = require("./bot.js");
const act = +process.argv[2] || 1;
const label = (g, a) => a.kind === "card" ? g.run.hand[a.slot].id + (a.dx || a.dy ? `(${a.dx},${a.dy})` : "") : `s(${a.dx},${a.dy})`;
let found = 0;
for (let i = 0; i < 60 && found < 2; i++) {
  const g = K.makeGame(null, { sim: true });
  g.newRun("recruit", 0); g.run.act = act;
  g.run.map.nodes = { "0:0": { r: 0, c: 0, t: "boss" } }; g.run.map.edges = []; g.run.pos = null; g.enterNode("0:0");
  const F = g.run.fight, hist = [];
  let t = 0;
  while (!F.over && t < 200) { const a = B.ply1(g); hist.push(label(g, a)); B.apply(g, a); t++; }
  if (F.over) continue;
  found++;
  const b = F.enemies.find(e => K.FOES[e.type].boss);
  console.log(`--- stall run ${i}: turn ${t} hp ${g.run.hp} boss hp ${b && b.hp} boss free ${b && b.free} enemies ${F.enemies.length} room ${K.fightRoom(F).name}`);
  console.log(B.board(g));
  console.log(F.log.map(l => l.t + " " + l.msg).join("\n"));
  console.log("last 16:", hist.slice(-16).join(" "));
}
if (!found) console.log(`no boss stalls in 60 act ${act} fights`);
