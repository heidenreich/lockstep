// Lockstep bots. usage: node lockstep.js [N]
const { loadGame } = require("./load.js");
const DIR = "/private/tmp/claude-501/-Users-todd-ClaudeStuff/e5c38a7a-9fa2-4f41-8417-cb3f2f17ddbd/scratchpad/";
const N = +process.argv[2] || 200, NG = Math.max(20, Math.floor(N / 5));
const clone = s => JSON.parse(JSON.stringify(s));
const q = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const hist = arr => { const d = {}; for (const v of arr) d[v] = (d[v] || 0) + 1; return JSON.stringify(d); };
const G = loadGame(DIR + "lockstep.html", ["state", "settings", "newGame", "step", "preview", "enemyAt", "isWall", "isPit", "inB", "DIRS", "W", "H", "dist"]);
const pass = (x, y) => G.inB(x, y) && !G.isWall(x, y) && !G.isPit(x, y);
function bfs(sx, sy, passable) {
  const f = new Map([[sx + "," + sy, 0]]), qq = [[sx, sy]];
  while (qq.length) { const [x, y] = qq.shift(), d = f.get(x + "," + y); for (const [dx, dy] of G.DIRS) { const nx = x + dx, ny = y + dy, k = nx + "," + ny; if (passable(nx, ny) && !f.has(k)) { f.set(k, d + 1); qq.push([nx, ny]); } } }
  return f;
}
const ACTS = [[0, 0], ...G.DIRS];
const naive = () => {
  const S = G.state, P = S.player;
  for (const [dx, dy] of G.DIRS) if (G.enemyAt(P.x + dx, P.y + dy)) return [dx, dy];
  const f = bfs(P.x, P.y, (x, y) => pass(x, y));
  let t = null, bd = 1e9; for (const e of S.enemies) { const d = f.get(e.x + "," + e.y); if (d != null && d < bd) { bd = d; t = e; } }
  if (!t) return [0, 0];
  const g = bfs(t.x, t.y, (x, y) => pass(x, y));
  let best = null, bv = 1e9; for (const [dx, dy] of G.DIRS) { const nx = P.x + dx, ny = P.y + dy; if (!pass(nx, ny) || G.enemyAt(nx, ny)) continue; const v = g.get(nx + "," + ny); if (v != null && v < bv) { bv = v; best = [dx, dy]; } }
  return best || [0, 0];
};
const random = () => ACTS[Math.floor(Math.random() * 5)];
const waiter = () => [0, 0];
const osc = t => (t % 2 ? [-1, 0] : [1, 0]);
// pit pump: get to (5,4) then press Up forever (player is blocked by the pit, the room keeps sliding up)
const pump = () => { const P = G.state.player; if (P.x === 5 && P.y === 4) return [0, -1]; const g = bfs(5, 4, (x, y) => pass(x, y)); let best = [0, -1], bv = 1e9; for (const [dx, dy] of G.DIRS) { const nx = P.x + dx, ny = P.y + dy; if (!pass(nx, ny)) continue; const v = g.get(nx + "," + ny); if (v != null && v < bv) { bv = v; best = [dx, dy]; } } return best; };
// pump but bump adjacent attackers first
const pumpFight = () => { const P = G.state.player; for (const [dx, dy] of G.DIRS) if (G.enemyAt(P.x + dx, P.y + dy)) return [dx, dy]; return pump(); };
// corner: go to (0,0) region and keep pushing up-left alternately
const corner = t => { const P = G.state.player; for (const [dx, dy] of G.DIRS) if (G.enemyAt(P.x + dx, P.y + dy)) return [dx, dy]; if (P.x > 0) return [-1, 0]; if (P.y > 0) return [0, -1]; return t % 2 ? [-1, 0] : [0, -1]; };
// 1-ply preview bot: min damage, then max points, then prefer not waiting
const prev1 = () => {
  let best = null, bk = null;
  for (const a of ACTS) {
    const p = G.preview(a[0], a[1]);
    const key = [p.dead ? 1 : 0, p.dmg, -p.pts, (a[0] || a[1]) ? 0 : 1, Math.random()];
    let better = !bk; if (bk) for (let i = 0; i < key.length; i++) { if (key[i] !== bk[i]) { better = key[i] < bk[i]; break; } }
    if (better) { bk = key; best = a; }
  }
  return best;
};
const evalS = s => { if (s.over) return s.score - 60; let v = s.score + s.player.hp * 5 + s.wave * 3; let adj = 0; for (const e of s.enemies) { if (G.dist(e, s.player) === 1) adj++; if (e.free) v -= 1.5; } return v - adj * 1.5 - s.enemies.length * 0.3; };
const greedy = ply => () => {
  const S0 = G.state;
  const search = (s, depth) => { let b = -1e9; for (const a of ACTS) { G.state = clone(s); G.step(a[0], a[1]); let v = evalS(G.state); if (depth > 1 && !G.state.over) v = 0.5 * v + 0.5 * search(G.state, depth - 1); if (v > b) b = v; } return b; };
  let bA = [0, 0], bV = -1e9;
  for (const a of ACTS) { let v = 0; for (let i = 0; i < 2; i++) { G.state = clone(S0); G.step(a[0], a[1]); let vv = evalS(G.state); if (ply > 1 && !G.state.over) vv = 0.5 * vv + 0.5 * search(G.state, ply - 1); v += vv; } v += Math.random() * 0.01; if (v > bV) { bV = v; bA = a; } }
  G.state = S0; return bA;
};
function run(bot, cap = 600) {
  G.newGame(); let t = 0; const c = { pit: 0, bump: 0, breaks: 0, crash: 0, chaseHit: 0, waits: 0, freeShare: 0, firstBreak: -1 }; const seen = new Set();
  while (!G.state.over && t < cap) {
    const a = bot(t); if (!a[0] && !a[1]) c.waits++; G.step(a[0], a[1]); t++;
    { const E = G.state.enemies; if (E.length) c.freeShare += E.filter(e => e.free).length / E.length; if (c.firstBreak < 0 && E.some(e => e.free)) c.firstBreak = t; }
    for (const l of G.state.log) { const k = l.t + l.msg; if (seen.has(k)) continue; seen.add(k); if (l.msg.includes("fell into a pit")) c.pit++; else if (l.msg.startsWith("You killed")) c.bump++; else if (l.msg.includes("breaks lockstep")) c.breaks++; else if (l.msg.includes("crashes into you")) c.crash++; else if (l.msg.includes("hits you")) c.chaseHit++; }
  }
  const S = G.state; c.freeShare = c.freeShare / Math.max(1, t); return { wave: S.wave, score: S.score, turns: t, alive: !S.over, ...c };
}
const bots = [["naive", naive, N], ["random", random, N], ["waiter", waiter, N], ["oscillate L/R", osc, N], ["pit-pump", pump, N], ["pump+fight", pumpFight, N], ["corner", corner, N], ["preview-1ply", prev1, N], ["greedy1", greedy(1), NG], ["greedy2", greedy(2), Math.max(20, NG >> 1)]];
console.log("== lockstep");
for (const [name, bot, n] of bots) {
  const rs = []; for (let i = 0; i < n; i++) rs.push(run(bot));
  const w = rs.map(r => r.wave), s = rs.map(r => r.score);
  const k = (f) => mean(rs.map(f)).toFixed(1);
  console.log(`  ${name.padEnd(13)} n=${n} wave med ${q(w, .5)} p90 ${q(w, .9)} max ${Math.max(...w)} | score med ${q(s, .5)} p90 ${q(s, .9)} max ${Math.max(...s)} | alive@600 ${rs.filter(r => r.alive).length} | turns ${k(r => r.turns)} | kills pit/bump ${k(r => r.pit)}/${k(r => r.bump)} | breaks ${k(r => r.breaks)} | dmg crash/chase ${k(r => r.crash)}/${k(r => r.chaseHit)} | waits ${k(r => r.waits)} | free-share ${(mean(rs.map(r => r.freeShare)) * 100).toFixed(0)}% firstBreak@${k(r => r.firstBreak)} | waves ${hist(w)}`);
}
