// Side-view Lockstep prototype bots. usage: node side.js [N]
const { loadGame } = require("./load.js");
const G = loadGame("/Users/todd/lockstep/prototype/side-view.html", ["state", "SIM", "newGame", "step", "STAGES", "enemyAt", "solid", "grounded", "W", "H"]);
const N = +process.argv[2] || 100;
const clone = s => JSON.parse(JSON.stringify(s));
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const pct = (a, f) => (100 * a.filter(f).length / a.length).toFixed(0) + "%";
const ACTS = ["L", "R", "J", "W"];

function evalS(s) {
  if (s.over && !s.won) return -400;
  let v = s.p.hp * 8 + s.score * 2 + s.stage * 40;
  if (s.won) return v + 200;
  for (const e of s.enemies) { v -= e.hp * 2; if (e.free) v -= 1.5; if (Math.abs(e.x - s.p.x) <= 1 && Math.abs(e.y - s.p.y) <= 1) v -= 1.5; }
  if (!s.enemies.length) v -= 0.8 * (Math.abs(s.exit.x - s.p.x) + Math.abs(s.exit.y - s.p.y));
  else { // mild pressure to engage: distance to nearest enemy
    let md = 99; for (const e of s.enemies) md = Math.min(md, Math.abs(e.x - s.p.x)); v -= 0.3 * md;
  }
  return v;
}
function search(s, depth) {
  let best = -1e9;
  for (const c of ACTS) {
    G.state = clone(s); G.SIM = true; G.step(c);
    let v = evalS(G.state);
    if (depth > 1 && !G.state.over) v = 0.6 * v + 0.4 * search(G.state, depth - 1);
    if (v > best) best = v;
  }
  return best;
}
const planner = ply => () => {
  const s0 = G.state; let bc = "W", bv = -1e9;
  for (const c of ACTS) {
    G.state = clone(s0); G.SIM = true; G.step(c);
    let v = evalS(G.state);
    if (ply > 1 && !G.state.over) v = 0.6 * v + 0.4 * search(G.state, ply - 1);
    v += Math.random() * 0.01; if (v > bv) { bv = v; bc = c; }
  }
  G.state = s0; G.SIM = false; return bc;
};
const naive = () => {
  const s = G.state, P = s.p;
  const target = s.enemies.length ? s.enemies.reduce((a, e) => (Math.abs(e.x - P.x) < Math.abs(a.x - P.x) ? e : a)) : s.exit;
  const dx = Math.sign(target.x - P.x);
  if (!dx) return s.enemies.length ? "J" : "W";
  const c = dx < 0 ? "L" : "R";
  if (G.enemyAt(P.x + dx, P.y)) return c;
  if (G.solid(P.x + dx, P.y) || G.solid(P.x + dx, P.y + 1) && !G.solid(P.x + dx, P.y + 1)) return G.grounded(P) ? "J" : c;
  if (G.solid(P.x + dx, P.y)) return "J";
  return c;
};
const waiter = () => "W";
const jumper = () => "J";
const random = () => ACTS[Math.floor(Math.random() * 4)];
// hider: climb to the highest platform reachable (stage 2/3 have one) and wait there
const hider = () => { const s = G.state, P = s.p; let top = null; for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) if (G.solid(x, y) && !G.solid(x, y - 1) && (!top || y < top.y)) top = { x, y: y - 1 }; if (!top || (P.y === top.y && Math.abs(P.x - top.x) <= 2)) return "W"; const dx = Math.sign(top.x - P.x); if (P.y > top.y && G.grounded(P) && Math.abs(P.x - top.x) <= 3) return "J"; return dx < 0 ? "L" : dx > 0 ? "R" : "J"; };

function run(bot, cap = 300) {
  G.SIM = false; G.newGame();
  const c = { bump: 0, stomp: 0, abyss: 0, head: 0, dmgWalk: 0, dmgChase: 0, dmgLand: 0, dmgAbyss: 0, frenzy: 0, breaks: 0, waits: 0, jumps: 0, stageTurns: [] };
  let t = 0, last = "", stStart = 0, stage = 0;
  while (!G.state.over && t < cap) {
    const a = bot(); G.SIM = false; G.state.log = [];
    if (a === "W") c.waits++; if (a === "J") c.jumps++;
    G.step(a); t++;
    for (const m of G.state.log) {
      if (m.includes("You land on") && m.includes("down")) c.stomp++; else if (m.startsWith("You hit") && m.includes("down")) c.bump++; else if (m.includes("headbutt") && m.includes("down")) c.head++;
      else if (m.includes("drops into the abyss")) c.abyss++;
      else if (m.includes("walks into you") || m.includes("jumps into you")) { c.dmgWalk += +m.slice(-1); last = "lockstep walk"; }
      else if (m.includes("hits you")) { c.dmgChase += +m.slice(-1); last = "chaser"; }
      else if (m.includes("lands on you")) { c.dmgLand += +m.slice(-1); last = "landed on"; }
      else if (m.includes("abyss and climb")) { c.dmgAbyss += 2; last = "fell"; }
      else if (m.startsWith("Frenzy")) c.frenzy++; else if (m.includes("breaks step")) c.breaks++;
    }
    if (G.state.stage !== stage) { c.stageTurns.push(t - stStart); stStart = t; stage = G.state.stage; }
  }
  const s = G.state;
  return { won: s.won, stage: s.stage + (s.won ? 1 : 0), score: s.score, turns: t, stall: !s.over, cause: s.over && !s.won ? last : s.won ? "won" : "stall", ...c };
}
function line(name, rs) {
  const st = {}; for (const r of rs) st[r.stage] = (st[r.stage] || 0) + 1;
  const ca = {}; for (const r of rs) ca[r.cause] = (ca[r.cause] || 0) + 1;
  const k = f => mean(rs.map(f)).toFixed(1);
  return `  ${name.padEnd(8)} n=${rs.length} won ${pct(rs, r => r.won)} | stages cleared ${JSON.stringify(st)} | score mean ${k(r => r.score)} max ${Math.max(...rs.map(r => r.score))} | turns ${k(r => r.turns)} | ends ${JSON.stringify(ca)} | kills bump/stomp/head/abyss ${k(r => r.bump)}/${k(r => r.stomp)}/${k(r => r.head)}/${k(r => r.abyss)} | dmg walk/chase/land/fell ${k(r => r.dmgWalk)}/${k(r => r.dmgChase)}/${k(r => r.dmgLand)}/${k(r => r.dmgAbyss)} | breaks ${k(r => r.breaks)} frenzy ${k(r => r.frenzy)} | W/J ${k(r => r.waits)}/${k(r => r.jumps)} | stage turns ${rs.filter(r => r.stageTurns.length).length ? rs.flatMap(r => r.stageTurns).reduce((a, b) => a + b, 0) / Math.max(1, rs.flatMap(r => r.stageTurns).length) : 0}`;
}
const bots = [["naive", naive, N], ["random", random, N], ["waiter", waiter, N], ["jumper", jumper, N], ["hider", hider, N], ["1ply", planner(1), N], ["2ply", planner(2), N], ["3ply", planner(3), Math.max(20, N >> 1)], ["4ply", planner(4), Math.max(12, N >> 2)], ["5ply", planner(5), Math.max(8, N >> 3)]];
console.log("== side-view");
for (const [name, bot, n] of bots) { const rs = []; for (let i = 0; i < n; i++) rs.push(run(bot)); console.log(line(name, rs)); }
