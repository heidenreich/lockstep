// Find stalemate runs and print the board at the end.
const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "logic.js"), "utf8");
function makeGame() {
  return new Function(`let best=0; function render(){} function flash(){}
    ${src}
    return { get state(){return state;}, set state(s){state=s;}, newGame, step, settings, enemyAt, dist, isWall, inB, DOOR, W, H, DIRS };`)();
}
function board(G) {
  const S = G.state, rows = [];
  for (let y = 0; y < G.H; y++) {
    let r = "";
    for (let x = 0; x < G.W; x++) {
      const e = G.enemyAt(x, y);
      if (S.player.x === x && S.player.y === y) r += "@";
      else if (S.echo && S.echo.x === x && S.echo.y === y) r += "E";
      else if (e) r += e.type === "brute" ? "B" : "s";
      else if (G.isWall(x, y)) r += "#";
      else r += ".";
    }
    rows.push(r);
  }
  return rows.join("\n");
}
const R = [1, 0], L = [-1, 0], Wt = [0, 0];
const scripts = { camp4: [R, Wt, L, Wt] };
function naive(G) {
  const S = G.state, P = S.player;
  for (const [dx, dy] of G.DIRS) if (G.enemyAt(P.x + dx, P.y + dy)) return [dx, dy];
  // bfs to nearest enemy avoiding echo
  const E = S.echo;
  const f = new Map([[P.x + "," + P.y, null]]), q = [[P.x, P.y]];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of G.DIRS) {
      const nx = x + dx, ny = y + dy, k = nx + "," + ny;
      if (!G.inB(nx, ny) || G.isWall(nx, ny) || f.has(k) || (E && E.x === nx && E.y === ny)) continue;
      f.set(k, [x, y]);
      if (G.enemyAt(nx, ny)) { // walk back
        let cur = [nx, ny], prev = f.get(k);
        while (prev && !(prev[0] === P.x && prev[1] === P.y)) { cur = prev; prev = f.get(cur[0] + "," + cur[1]); }
        return [cur[0] - P.x, cur[1] - P.y];
      }
      q.push([nx, ny]);
    }
  }
  return [0, 0];
}
const which = process.argv[2] || "naive", delay = +process.argv[3] || 6;
let found = 0;
for (let i = 0; i < 400 && found < 2; i++) {
  const G = makeGame(); G.settings.delay = delay; G.settings.hurt = true; G.newGame();
  let t = 0;
  while (!G.state.over && t < 400) {
    const mv = which === "naive" ? naive(G) : scripts[which][t % 4];
    G.step(mv[0], mv[1]); t++;
  }
  if (!G.state.over) {
    found++;
    console.log(`--- ${which} delay ${delay} run ${i}: stalled at wave ${G.state.wave}, hp ${G.state.player.hp}, score ${G.state.score}`);
    console.log(board(G));
    console.log(G.state.log.map(l => l.t + " " + l.msg).join("\n"));
    console.log("last 8 inputs:", G.state.history.slice(-8).map(h => `${h.dx},${h.dy}`).join(" "));
  }
}
if (!found) console.log("no stalls found");
