// Per-stage degenerate checks: does waiting / jump-spam alone clear a stage, and how fast?
const { loadGame } = require("./load.js");
const G = loadGame("/Users/todd/lockstep/prototype/side-view.html", ["state", "SIM", "newGame", "step", "loadStage", "STAGES"]);
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
for (let st = 0; st < 3; st++) for (const [name, seq] of [["wait", ["W"]], ["jump", ["J"]], ["R-spam", ["R"]], ["L-spam", ["L"]], ["jump+wait", ["J", "W"]], ["R,J", ["R", "J"]]]) {
  const res = [];
  for (let i = 0; i < 30; i++) {
    G.SIM = true; G.newGame(); G.loadStage(st); let t = 0, clearedAt = -1; const hp0 = G.state.p.hp;
    while (!G.state.over && t < 150) { G.step(seq[t % seq.length]); t++; if (clearedAt < 0 && !G.state.enemies.length) clearedAt = t; }
    res.push({ clearedAt, hp: G.state.p.hp, dead: G.state.over && !G.state.won, score: G.state.score, frenzy: G.state.frenzy });
  }
  const cl = res.filter(r => r.clearedAt >= 0);
  console.log(`stage ${st + 1} ${name.padEnd(9)} cleared ${cl.length}/30 (at turn ${cl.length ? mean(cl.map(r => r.clearedAt)).toFixed(0) : "-"}) | hp left ${mean(res.map(r => r.hp)).toFixed(1)} dead ${res.filter(r => r.dead).length} | score@150 ${mean(res.map(r => r.score)).toFixed(0)} | frenzy ${res.filter(r => r.frenzy).length}`);
}
