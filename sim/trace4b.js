// Trace stalled normal and elite fights with the 1-ply bot across whole runs: prints up to 2 stalls.
const K = require("../rules.js"), B = require("./bot.js");
let found = 0;
for (let i = 0; i < 80 && found < 2; i++) {
  const g = K.makeGame(null, { sim: true });
  g.newRun("recruit", 0);
  for (let guard = 0; g.run.screen !== "end" && guard < 200 && found < 2; guard++) {
    const R = g.run;
    if (R.screen === "map") { const open = g.openNodes(); g.enterNode(open.find(k => ["fight", "elite"].includes(R.map.nodes[k].t)) || open[0]); continue; }
    if (R.screen === "event") { K.EVENTS[R.event].opts[0].go(g); g.leaveNode(); continue; }
    if (R.screen !== "fight") { g.leaveNode(); continue; }
    const F = R.fight;
    for (let t = 0; !F.over && t < 200; t++) B.apply(g, B.ply1(g));
    if (!F.over) {
      found++;
      console.log(`--- stall ${F.kind} act ${R.act} room ${K.fightRoom(F).name} turn ${F.turn} hp ${R.hp} frenzy ${F.frenzy} hand ${R.hand.map(c => c.id).join(",")}`);
      console.log(B.board(g));
      console.log(F.enemies.map(e => `${e.type}@${e.x},${e.y} free=${e.free} blocked=${e.blocked} chased=${e.chased} hp=${e.hp}`).join("\n"));
      console.log(F.log.map(l => l.t + " " + l.msg).join("\n"));
      F.over = "lose";
    }
    if (F.over === "lose") { g.endRun(false); break; }
    g.fightReward();
    const id = R.reward.cards[0];
    if (id) g.takeCard(id, R.hand.length < R.slots ? undefined : 0);
    g.leaveNode();
  }
}
if (!found) console.log("no normal-fight stalls in 80 runs");
