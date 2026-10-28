// Lockstep v3 (rooms + upgrade draft) bot harness. usage: node lockstep3.js [N] [section]
const { loadGame } = require("./load.js");
const DIR = require("path").join(__dirname, "../prototype/");
const N = +process.argv[2] || 200, SECTION = process.argv[3] || "all";
const clone = s => JSON.parse(JSON.stringify(s));
const q = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const hist = arr => { const d = {}; for (const v of arr) d[v] = (d[v] || 0) + 1; return JSON.stringify(d); };
const G = loadGame(DIR + "lockstep-v4.html", ["state", "settings", "newGame", "step", "preview", "pick", "settle", "enemyAt", "isWall", "isPit", "inB", "DIRS", "W", "H", "dist", "ROOMS", "UPGRADES"]);
const pass = (x, y) => G.inB(x, y) && !G.isWall(x, y) && !G.isPit(x, y);
function bfs(sx, sy) { const f = new Map([[sx + "," + sy, 0]]), qq = [[sx, sy]]; while (qq.length) { const [x, y] = qq.shift(), d = f.get(x + "," + y); for (const [dx, dy] of G.DIRS) { const nx = x + dx, ny = y + dy, k = nx + "," + ny; if (pass(nx, ny) && !f.has(k)) { f.set(k, d + 1); qq.push([nx, ny]); } } } return f; }
const ACTS = [[0, 0], ...G.DIRS];
const toward = (tx, ty) => { const P = G.state.player, g = bfs(tx, ty); let best = null, bv = 1e9; for (const [dx, dy] of G.DIRS) { const nx = P.x + dx, ny = P.y + dy; if (!pass(nx, ny) || G.enemyAt(nx, ny)) continue; const v = g.get(nx + "," + ny); if (v != null && v < bv) { bv = v; best = [dx, dy]; } } return best; };
const naive = () => { const S = G.state, P = S.player; for (const [dx, dy] of G.DIRS) if (G.enemyAt(P.x + dx, P.y + dy)) return [dx, dy]; const f = bfs(P.x, P.y); let t = null, bd = 1e9; for (const e of S.enemies) { const d = f.get(e.x + "," + e.y); if (d != null && d < bd) { bd = d; t = e; } } return (t && toward(t.x, t.y)) || [0, 0]; };
const corner = t => { const P = G.state.player; for (const [dx, dy] of G.DIRS) if (G.enemyAt(P.x + dx, P.y + dy)) return [dx, dy]; const m = toward(0, 0); if (m && !(P.x === 0 && P.y === 0)) return m; return t % 2 ? [-1, 0] : [0, -1]; };
// edge pump: stand under the top-middle pit (5,1) and push Up; bump adjacent first
const edgePump = () => { const P = G.state.player; for (const [dx, dy] of G.DIRS) if (G.enemyAt(P.x + dx, P.y + dy)) return [dx, dy]; if (P.x === 5 && P.y === 1) return [0, -1]; return toward(5, 1) || [0, -1]; };
const prev1 = () => { let best = null, bk = null; for (const a of ACTS) { const p = G.preview(a[0], a[1]); const key = [p.dead ? 1 : 0, p.dmg, -p.pts, (a[0] || a[1]) ? 0 : 1, Math.random()]; let better = !bk; if (bk) for (let i = 0; i < key.length; i++) if (key[i] !== bk[i]) { better = key[i] < bk[i]; break; } if (better) { bk = key; best = a; } } return best; };
const evalS = s => { if (s.over) return s.score - 60; let v = s.score + s.player.hp * 5 + s.wave * 3; let adj = 0; for (const e of s.enemies) { if (G.dist(e, s.player) === 1) adj++; if (e.free) v -= 1.5; } return v - adj * 1.5 - s.enemies.length * 0.3; };
const greedy = (ply, policy) => () => {
  const S0 = G.state, stepC = (s, a) => { G.state = clone(s); G.step(a[0], a[1]); if (G.state.choice) G.pick(policy(G.state.choice)); };
  const search = (s, depth) => { let b = -1e9; for (const a of ACTS) { stepC(s, a); let v = evalS(G.state); if (depth > 1 && !G.state.over) v = 0.5 * v + 0.5 * search(G.state, depth - 1); if (v > b) b = v; } return b; };
  let bA = [0, 0], bV = -1e9;
  for (const a of ACTS) { let v = 0; for (let i = 0; i < 2; i++) { stepC(S0, a); let vv = evalS(G.state); if (ply > 1 && !G.state.over) vv = 0.5 * vv + 0.5 * search(G.state, ply - 1); v += vv; } v += Math.random() * 0.01; if (v > bV) { bV = v; bA = a; } }
  G.state = S0; return bA;
};
// pick policies
const randomPick = ch => Math.floor(Math.random() * ch.length);
const prefer = (...ids) => ch => { for (const id of ids) { const i = ch.indexOf(id); if (i >= 0) return i; } return randomPick(ch); };
const avoid = id => ch => { const o = ch.map((c, i) => i).filter(i => ch[i] !== id); return o.length ? o[Math.floor(Math.random() * o.length)] : 0; };
function run(bot, policy, opts = {}, cap = 600) {
  G.newGame();
  if (opts.room != null) { G.state.room = opts.room; G.settle(); G.state.enemies = G.state.enemies.filter(e => !G.isWall(e.x, e.y) && !G.ROOMS[opts.room].pits.has(e.x + "," + e.y)); }
  let t = 0; const c = { pit: 0, bump: 0, slam: 0, breaks: 0, crash: 0, chase: 0, beside: 0, frenzy: 0, picks: [], rooms: [] }; const seen = new Set();
  let curRoom = G.state.room, roomStart = 0;
  while (!G.state.over && t < cap) {
    if (G.state.choice) { const i = policy(G.state.choice); c.picks.push(G.state.choice[i]); G.pick(i); c.rooms.push({ room: curRoom, wave: G.state.wave - 1, turns: t - roomStart, died: false }); curRoom = G.state.room; roomStart = t; continue; }
    const a = bot(t); G.step(a[0], a[1]); t++;
    for (const l of G.state.log) { const k = l.t + l.msg; if (seen.has(k)) continue; seen.add(k); const m = l.msg;
      if (m.includes("fell into a pit")) c.pit++; else if (m.startsWith("You killed")) c.bump++; else if (m.includes("crushed against")) c.slam++; else if (m.includes("breaks lockstep")) c.breaks++; else if (m.includes("crashes into you")) c.crash++; else if (m.includes("hits you")) c.chase++; else if (m.includes("strikes")) c.beside++; else if (m.includes("loses patience")) c.frenzy++; }
  }
  const S = G.state; c.rooms.push({ room: curRoom, wave: S.wave, turns: t - roomStart, died: S.over });
  return { wave: S.wave, score: S.score, turns: t, alive: !S.over, ...c };
}
function line(name, rs) {
  const w = rs.map(r => r.wave), s = rs.map(r => r.score), k = f => mean(rs.map(f)).toFixed(1);
  return `  ${name.padEnd(22)} n=${rs.length} wave med ${q(w, .5)} p90 ${q(w, .9)} max ${Math.max(...w)} | score med ${q(s, .5)} p90 ${q(s, .9)} max ${Math.max(...s)} | alive ${rs.filter(r => r.alive).length} | turns ${k(r => r.turns)} | kills pit/bump/slam ${k(r => r.pit)}/${k(r => r.bump)}/${k(r => r.slam)} | breaks ${k(r => r.breaks)} frenzy ${k(r => r.frenzy)} | dmg crash/beside/chase ${k(r => r.crash)}/${k(r => r.beside)}/${k(r => r.chase)} | waves ${hist(w)}`;
}
const many = (bot, policy, n, opts) => { const rs = []; for (let i = 0; i < n; i++) rs.push(run(bot, policy, opts)); return rs; };

if (SECTION === "all" || SECTION === "base") {
  console.log("== v3 baseline (random picks)");
  const NG = Math.max(20, Math.floor(N / 5));
  for (const [name, bot, n] of [["naive", naive, N], ["corner", corner, N], ["edge-pump", edgePump, N], ["preview-1ply", prev1, N], ["greedy1", greedy(1, randomPick), NG], ["greedy2", greedy(2, randomPick), Math.max(20, NG >> 1)]]) {
    const rs = many(bot, randomPick, n); console.log(line(name, rs));
    if (name === "preview-1ply" || name === "greedy2") { // room stats
      const per = {}; for (const r of rs) for (const x of r.rooms) { const k = G.ROOMS[x.room].name; per[k] = per[k] || { n: 0, died: 0, turns: 0 }; per[k].n++; per[k].died += x.died ? 1 : 0; per[k].turns += x.turns; }
      console.log("     rooms (waves played / death rate / avg turns in room): " + Object.entries(per).map(([k, v]) => `${k} ${v.n}/${(100 * v.died / v.n).toFixed(0)}%/${(v.turns / v.n).toFixed(0)}`).join("  "));
      const pk = {}; for (const r of rs) for (const p of r.picks) pk[p] = (pk[p] || 0) + 1; console.log("     picks taken: " + JSON.stringify(pk));
    }
  }
}
if (SECTION === "all" || SECTION === "ups") {
  console.log("== upgrade impact, preview-1ply, prefer X when offered (vs random) and never X");
  const base = many(prev1, randomPick, N); console.log(line("random", base));
  for (const id of Object.keys(G.UPGRADES)) { console.log(line("prefer " + id, many(prev1, prefer(id), N))); console.log(line("never " + id, many(prev1, avoid(id), N))); }
  console.log("== combos (preview-1ply)");
  for (const [n, ids] of [["spikes+pileup", ["spikes", "pileup"]], ["deep+shove", ["deep", "shove"]], ["steady+patience", ["steady", "patience"]], ["mend+stillness", ["mend", "stillness"]]]) console.log(line(n, many(prev1, prefer(...ids), N)));
  console.log("== upgrade impact, greedy1 (n=40) for the top candidates");
  for (const id of ["mend", "shove", "spikes", "pileup", "deep", "stillness"]) console.log(line("greedy1 prefer " + id, many(greedy(1, prefer(id)), prefer(id), 40)));
}
if (SECTION === "all" || SECTION === "rooms") {
  console.log("== rooms in isolation: wave 1 forced into each room (preview-1ply / naive / edge-pump), random picks after");
  for (let r = 0; r < G.ROOMS.length; r++) {
    for (const [name, bot] of [["1ply", prev1], ["naive", naive], ["edge-pump", edgePump]]) {
      const rs = many(bot, randomPick, N, { room: r });
      const first = rs.map(x => x.rooms[0]); const w1died = first.filter(x => x.died).length;
      console.log(`  ${G.ROOMS[r].name.padEnd(10)} ${name.padEnd(9)} wave-1 death ${(100 * w1died / N).toFixed(0)}% turns-in-wave1 ${mean(first.map(x => x.turns)).toFixed(0)} | overall score med ${q(rs.map(x => x.score), .5)} wave med ${q(rs.map(x => x.wave), .5)} | pit kills ${mean(rs.map(x => x.pit)).toFixed(1)}`);
    }
  }
}
if (SECTION === "nospikes") {
  console.log("== upgrade impact with spikes never taken (preview-1ply): prefer X vs never-spikes baseline");
  const ns = ch => { const o = ch.map((c, i) => i).filter(i => ch[i] !== "spikes"); return o.length ? o[Math.floor(Math.random() * o.length)] : 0; };
  const pref = id => ch => { const i = ch.indexOf(id); if (i >= 0) return i; return ns(ch); };
  console.log(line("baseline never-spikes", many(prev1, ns, N)));
  for (const id of Object.keys(G.UPGRADES)) if (id !== "spikes") console.log(line("prefer " + id, many(prev1, pref(id), N)));
  console.log(line("spikes offered→taken", many(prev1, pref("spikes"), N)));
}
