const { loadGame } = require("./load.js");
const DIR = require("path").join(__dirname, "../prototype/");
const G = loadGame(DIR + "lockstep-v4.html", ["state", "newGame", "step", "preview", "pick", "enemyAt", "isWall", "isPit", "inB", "DIRS", "W", "H", "ROOMS"]);
const pass = (x, y) => G.inB(x, y) && !G.isWall(x, y) && !G.isPit(x, y);
function bfs(sx, sy) { const f = new Map([[sx + "," + sy, 0]]), qq = [[sx, sy]]; while (qq.length) { const [x, y] = qq.shift(), d = f.get(x + "," + y); for (const [dx, dy] of G.DIRS) { const nx = x + dx, ny = y + dy, k = nx + "," + ny; if (pass(nx, ny) && !f.has(k)) { f.set(k, d + 1); qq.push([nx, ny]); } } } return f; }
const toward = (tx, ty) => { const P = G.state.player, g = bfs(tx, ty); let best = null, bv = 1e9; for (const [dx, dy] of G.DIRS) { const nx = P.x + dx, ny = P.y + dy; if (!pass(nx, ny) || G.enemyAt(nx, ny)) continue; const v = g.get(nx + "," + ny); if (v != null && v < bv) { bv = v; best = [dx, dy]; } } return best; };
const edgePump = () => { const P = G.state.player; for (const [dx, dy] of G.DIRS) if (G.enemyAt(P.x + dx, P.y + dy)) return [dx, dy]; if (P.x === 5 && P.y === 1) return [0, -1]; return toward(5, 1) || [0, -1]; };
const ACTS = [[0, 0], ...G.DIRS];
const prev1 = () => { let best = null, bk = null; for (const a of ACTS) { const p = G.preview(a[0], a[1]); const key = [p.dead ? 1 : 0, p.dmg, -p.pts, (a[0] || a[1]) ? 0 : 1, Math.random()]; let better = !bk; if (bk) for (let i = 0; i < key.length; i++) if (key[i] !== bk[i]) { better = key[i] < bk[i]; break; } if (better) { bk = key; best = a; } } return best; };
const avoidSpikes = ch => { const o = ch.map((c, i) => i).filter(i => ch[i] !== "spikes"); return o.length ? o[Math.floor(Math.random() * o.length)] : 0; };
function board() { const S = G.state, rows = []; for (let y = 0; y < G.H; y++) { let r = ""; for (let x = 0; x < G.W; x++) { const e = G.enemyAt(x, y); r += (S.player.x === x && S.player.y === y) ? "@" : e ? (e.free ? (e.type[0].toUpperCase()) : e.type[0]) : G.isWall(x, y) ? "#" : G.ROOMS[S.room].pits.has(x + "," + y) ? (G.isPit(x, y) ? "o" : "x") : "."; } rows.push(r); } return rows.join("\n"); }
const which = process.argv[2] || "pump";
for (let i = 0, found = 0; i < 300 && found < 2; i++) {
  G.newGame(); let t = 0; const moves = [];
  while (!G.state.over && t < 600) { if (G.state.choice) { G.pick(avoidSpikes(G.state.choice)); continue; } const a = which === "pump" ? edgePump() : prev1(); moves.push(a.join("")); G.step(a[0], a[1]); t++; }
  if (!G.state.over) {
    found++; const S = G.state;
    console.log(`--- ${which} run ${i}: alive at 600, wave ${S.wave} room ${G.ROOMS[S.room].name} hp ${S.player.hp} score ${S.score} ups ${Object.keys(S.ups)} frenzy ${S.frenzy} waveTurn ${S.waveTurn} extras ${S.extras}`);
    console.log(board()); console.log(S.enemies.map(e => `${e.type}@${e.x},${e.y} free=${e.free} blocked=${e.blocked} chased=${e.chased} hp=${e.hp}`).join("\n"));
    console.log(S.log.map(l => l.t + " " + l.msg).join("\n")); console.log("last moves:", moves.slice(-12).join(" "));
  }
}
