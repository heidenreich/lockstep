// Headless harness for echo-chamber.html: loads the extracted game logic (sim/logic.js, lines 166-342 of the page)
// with DOM stubs, then runs bot strategies many times and prints distributions.
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "logic.js"), "utf8");

function makeGame() {
  const body = `
    let best = 0; function render(){} function flash(){}
    ${src}
    return {
      get state(){ return state; }, set state(s){ state = s; },
      newGame, step, settings, enemyAt, dist, isWall, inB, DOOR, W, H, pathField, MAXHP, DIRS
    };`;
  return new Function(body)();
}

const clone = s => JSON.parse(JSON.stringify(s));

// ---------- bots: each returns [dx,dy] ----------
function bfsFrom(G, sx, sy, blocked) {
  const f = new Map([[sx + "," + sy, 0]]), q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift(), d = f.get(x + "," + y);
    for (const [dx, dy] of G.DIRS) {
      const nx = x + dx, ny = y + dy, k = nx + "," + ny;
      if (G.inB(nx, ny) && !G.isWall(nx, ny) && !f.has(k) && !blocked(nx, ny)) { f.set(k, d + 1); q.push([nx, ny]); }
    }
  }
  return f;
}

// (a) naive: walk toward nearest enemy by walking distance, bump when adjacent
function naive(G) {
  const S = G.state, P = S.player;
  for (const [dx, dy] of G.DIRS) if (G.enemyAt(P.x + dx, P.y + dy)) return [dx, dy];
  const E = S.echo;
  const f = bfsFrom(G, P.x, P.y, (x, y) => (E && E.x === x && E.y === y));
  let bestE = null, bd = 1e9;
  for (const e of S.enemies) { const d = f.get(e.x + "," + e.y); if (d != null && d < bd) { bd = d; bestE = e; } }
  if (!bestE) return [0, 0];
  const g = bfsFrom(G, bestE.x, bestE.y, (x, y) => (E && E.x === x && E.y === y));
  let bestD = null, bv = 1e9;
  for (const [dx, dy] of G.DIRS) {
    const nx = P.x + dx, ny = P.y + dy;
    if (!G.inB(nx, ny) || G.isWall(nx, ny) || G.enemyAt(nx, ny) || (E && E.x === nx && E.y === ny)) continue;
    const v = g.get(nx + "," + ny); if (v != null && v < bv) { bv = v; bestD = [dx, dy]; }
  }
  return bestD || [0, 0];
}

// (b) kite: never attack; pick the free tile maximising min walking distance to any enemy (tie: keep moving)
function kite(G) {
  const S = G.state, P = S.player, E = S.echo;
  const fields = S.enemies.map(e => bfsFrom(G, e.x, e.y, () => false));
  const score = (x, y) => Math.min(...fields.map(f => f.get(x + "," + y) ?? 99), 99);
  let bestD = [0, 0], bv = score(P.x, P.y) - 0.5;
  for (const [dx, dy] of G.DIRS) {
    const nx = P.x + dx, ny = P.y + dy;
    if (!G.inB(nx, ny) || G.isWall(nx, ny) || G.enemyAt(nx, ny)) continue;
    if (E && E.x === nx && E.y === ny && G.settings.hurt) continue;
    const v = score(nx, ny) + Math.random() * 0.1;
    if (v > bv) { bv = v; bestD = [dx, dy]; }
  }
  return bestD;
}

// (c) fixed loops. Script is a list of [dx,dy] repeated forever.
const R = [1, 0], L = [-1, 0], U = [0, -1], D = [0, 1], Wt = [0, 0];
const loops = {
  // pace through the door: (2,5)->(5,5) and back, period 8 (offset vs delay 6 = 2)
  pace8: [R, R, R, Wt, L, L, L, Wt],
  // out-and-back with a bump on the far side: push right from the door then come back; period 10
  doorPush10: [R, R, R, R, Wt, L, L, L, L, Wt],
  // small square in the left room next to the door: (3,4)(4,4)(4,6)(3,6)
  square8: [U, R, D, D, L, U, Wt, Wt],
  // stand next to door, step in, step out: period 4 (door-camp)
  camp4: [R, Wt, L, Wt],
};
function loopBot(name) {
  return (G, t) => {
    const s = loops[name]; const mv = s[t % s.length];
    // if the scripted move is into an enemy, that's a bump (fine). If blocked by wall/echo, it's wasted (also fine: the echo copies it).
    return mv;
  };
}

// (d) greedy lookahead planner: tries each of 5 actions on a cloned game, scores the result, k-ply.
function greedy(ply) {
  return function plan(G) {
    const S0 = G.state;
    const evalState = s => {
      if (s.over) return -1000;
      const P = s.player, E = s.echo;
      let v = s.score * 1 + P.hp * 6 + s.wave * 5;
      // adjacency danger
      for (const e of s.enemies) if (G.dist(e, P) === 1 && !(e.type === "brute" && e.rest)) v -= 2;
      // prefer being near the door region but not in it when the echo is there
      return v;
    };
    const actions = [[0, 0], ...G.DIRS];
    function search(s, depth) {
      let bestV = -1e9;
      for (const a of actions) {
        G.state = clone(s); G.step(a[0], a[1]);
        let v = evalState(G.state);
        if (depth > 1 && !G.state.over) v = 0.5 * v + 0.5 * search(G.state, depth - 1);
        if (v > bestV) bestV = v;
      }
      return bestV;
    }
    let bestA = [0, 0], bestV = -1e9;
    for (const a of actions) {
      // average over 3 samples to smooth enemy randomness
      let v = 0;
      for (let i = 0; i < 3; i++) {
        G.state = clone(S0); G.step(a[0], a[1]);
        let vv = evalState(G.state);
        if (ply > 1 && !G.state.over) vv = 0.5 * vv + 0.5 * search(G.state, ply - 1);
        v += vv;
      }
      v += Math.random() * 0.01;
      if (v > bestV) { bestV = v; bestA = a; }
    }
    G.state = S0;
    return bestA;
  };
}

// ---------- runner ----------
function runOne(botFn, { delay = 6, hurt = true, maxTurns = 400 } = {}) {
  const G = makeGame();
  G.settings.delay = delay; G.settings.hurt = hurt;
  G.newGame();
  let t = 0, echoKills = 0, ownKills = 0, hpLostEcho = 0, lastWaveTurn = 0, longestWave = 0;
  const seenLog = new Set();
  while (!G.state.over && t < maxTurns) {
    const wBefore = G.state.wave;
    const [dx, dy] = botFn(G, t);
    G.step(dx, dy); t++;
    for (const l of G.state.log) {
      const key = l.t + "|" + l.msg; if (seenLog.has(key)) continue; seenLog.add(key);
      if (l.msg.startsWith("Echo killed")) echoKills++;
      else if (l.msg.startsWith("You killed")) ownKills++;
      else if (l.msg.includes("Your echo")) hpLostEcho++;
    }
    if (G.state.wave !== wBefore) { longestWave = Math.max(longestWave, t - lastWaveTurn); lastWaveTurn = t; }
  }
  const S = G.state;
  return { wave: S.wave, score: S.score, turns: t, echoKills, ownKills, hpLostEcho, timedOut: !S.over, enemiesLeft: S.enemies.length, longestWave, hp: S.player.hp };
}

function summarize(name, results) {
  const n = results.length;
  const q = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(n - 1, Math.floor(p * n))]; };
  const waves = results.map(r => r.wave), scores = results.map(r => r.score);
  const mean = a => (a.reduce((x, y) => x + y, 0) / n);
  const dist = {}; for (const w of waves) dist[w] = (dist[w] || 0) + 1;
  const to = results.filter(r => r.timedOut).length;
  console.log(
    `${name.padEnd(26)} wave med ${q(waves, .5)} p90 ${q(waves, .9)} max ${Math.max(...waves)} | score med ${q(scores, .5)} p90 ${q(scores, .9)} max ${Math.max(...scores)}` +
    ` | echoK ${mean(results.map(r => r.echoKills)).toFixed(1)} ownK ${mean(results.map(r => r.ownKills)).toFixed(1)} selfHit ${mean(results.map(r => r.hpLostEcho)).toFixed(2)}` +
    ` | turns ${mean(results.map(r => r.turns)).toFixed(0)} timeout ${to}/${n} | waves ${JSON.stringify(dist)}`
  );
}

const N = +process.argv[2] || 200;
const configs = [
  ["delay6 hurt", { delay: 6, hurt: true }],
  ["delay6 nohurt", { delay: 6, hurt: false }],
  ["delay4 hurt", { delay: 4, hurt: true }],
  ["delay10 hurt", { delay: 10, hurt: true }],
];
const bots = [
  ["naive", naive], ["kite", kite],
  ["loop pace8", loopBot("pace8")], ["loop doorPush10", loopBot("doorPush10")], ["loop square8", loopBot("square8")], ["loop camp4", loopBot("camp4")],
  ["greedy1", greedy(1)], ["greedy2", greedy(2)],
];
for (const [cn, cfg] of configs) {
  console.log("\n== " + cn + " ==");
  for (const [bn, fn] of bots) {
    const n = bn.startsWith("greedy") ? Math.max(20, Math.floor(N / 5)) : N;
    const res = []; for (let i = 0; i < n; i++) res.push(runOne(fn, cfg));
    summarize(bn, res);
  }
}
