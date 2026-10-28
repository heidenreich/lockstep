// Head-to-head bot harness for echo-chamber.html (v4), the-heir.html and lantern-budget.html.
// usage: node compare.js echo|heir|lantern [N]
const { loadGame } = require("./load.js");
const DIR = "/private/tmp/claude-501/-Users-todd-ClaudeStuff/e5c38a7a-9fa2-4f41-8417-cb3f2f17ddbd/scratchpad/";
const clone = s => JSON.parse(JSON.stringify(s));
const which = process.argv[2], N = +process.argv[3] || 200, NG = Math.max(20, Math.floor(N / 5));

function bfs(G, sx, sy, passable) {
  const f = new Map([[sx + "," + sy, 0]]), q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift(), d = f.get(x + "," + y);
    for (const [dx, dy] of G.DIRS) {
      const nx = x + dx, ny = y + dy, k = nx + "," + ny;
      if (G.inB(nx, ny) && !f.has(k) && passable(nx, ny)) { f.set(k, d + 1); q.push([nx, ny]); }
    }
  }
  return f;
}
// first step from (sx,sy) toward the nearest target among `targets`, through `passable`
function stepToward(G, sx, sy, targets, passable) {
  if (!targets.length) return null;
  const f = bfs(G, sx, sy, passable);
  let bt = null, bd = 1e9;
  for (const t of targets) { const d = f.get(t.x + "," + t.y); if (d != null && d < bd) { bd = d; bt = t; } }
  if (!bt) return null;
  const g = bfs(G, bt.x, bt.y, passable);
  let best = null, bv = 1e9;
  for (const [dx, dy] of G.DIRS) {
    const nx = sx + dx, ny = sy + dy;
    if (!G.inB(nx, ny) || !passable(nx, ny)) continue;
    const v = g.get(nx + "," + ny); if (v != null && v < bv) { bv = v; best = [dx, dy]; }
  }
  return best;
}
const q = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
function hist(arr) { const d = {}; for (const v of arr) d[v] = (d[v] || 0) + 1; return JSON.stringify(d); }

// ======================= ECHO CHAMBER v4 =======================
function echo() {
  const G = loadGame(DIR + "echo-chamber.html", ["state", "settings", "newGame", "step", "enemyAt", "isWall", "inB", "DIRS", "W", "H", "dist"]);
  const free = (x, y) => !G.isWall(x, y) && !G.enemyAt(x, y) && !(G.state.echo && G.state.echo.x === x && G.state.echo.y === y);
  const naive = () => {
    const S = G.state, P = S.player;
    for (const [dx, dy] of G.DIRS) if (G.enemyAt(P.x + dx, P.y + dy)) return [dx, dy];
    return stepToward(G, P.x, P.y, S.enemies, (x, y) => free(x, y) || !!G.enemyAt(x, y)) || [0, 0];
  };
  const kite = () => {
    const S = G.state, P = S.player, E = S.echo;
    const fields = S.enemies.map(e => bfs(G, e.x, e.y, (x, y) => !G.isWall(x, y)));
    const sc = (x, y) => Math.min(...fields.map(f => f.get(x + "," + y) ?? 99), 99);
    let bd = [0, 0], bv = sc(P.x, P.y) - 0.5;
    for (const [dx, dy] of G.DIRS) {
      const nx = P.x + dx, ny = P.y + dy;
      if (!G.inB(nx, ny) || G.isWall(nx, ny) || G.enemyAt(nx, ny)) continue;
      if (E && E.x === nx && E.y === ny && G.settings.hurt) continue;
      const v = sc(nx, ny) + Math.random() * 0.1; if (v > bv) { bv = v; bd = [dx, dy]; }
    }
    return bd;
  };
  const R = [1, 0], L = [-1, 0], Wt = [0, 0];
  const loops = { camp4: [R, Wt, L, Wt], camp2: [R, L], door4: [R, R, R, L, L, L, Wt, Wt], pin: [R, R, R, R, ...Array(16).fill(Wt)] };
  const loopBot = n => (t) => loops[n][t % loops[n].length];
  const evalS = s => {
    if (s.over) return -1000;
    let v = s.score + s.player.hp * 6 + s.wave * 5 + (s.echo ? s.echo.hp * 1.5 : 0);
    for (const e of s.enemies) if (G.dist(e, s.player) === 1 && !(e.type === "brute" && e.rest)) v -= 2;
    return v;
  };
  const greedy = ply => () => {
    const S0 = G.state, acts = [[0, 0], ...G.DIRS];
    const search = (s, depth) => { let b = -1e9; for (const a of acts) { G.state = clone(s); G.step(a[0], a[1]); let v = evalS(G.state); if (depth > 1 && !G.state.over) v = 0.5 * v + 0.5 * search(G.state, depth - 1); if (v > b) b = v; } return b; };
    let bA = [0, 0], bV = -1e9;
    for (const a of acts) {
      let v = 0; for (let i = 0; i < 2; i++) { G.state = clone(S0); G.step(a[0], a[1]); let vv = evalS(G.state); if (ply > 1 && !G.state.over) vv = 0.5 * vv + 0.5 * search(G.state, ply - 1); v += vv; }
      v += Math.random() * 0.01; if (v > bV) { bV = v; bA = a; }
    }
    G.state = S0; return bA;
  };
  function run(bot, delay, hurt, cap = 600) {
    G.settings.delay = delay; G.settings.hurt = hurt; G.newGame();
    let t = 0, echoDeaths = 0; const seen = new Set();
    while (!G.state.over && t < cap) {
      const m = bot(t); G.step(m[0], m[1]); t++;
      for (const l of G.state.log) { const k = l.t + l.msg; if (!seen.has(k)) { seen.add(k); if (l.msg.includes("destroyed your echo")) echoDeaths++; } }
    }
    return { wave: G.state.wave, score: G.state.score, turns: t, alive: !G.state.over, echoDeaths };
  }
  const bots = [["naive", naive, N], ["kite", kite, N], ["loop camp4", loopBot("camp4"), N], ["loop camp2", loopBot("camp2"), N], ["loop door4", loopBot("door4"), N], ["loop pin", loopBot("pin"), N], ["greedy1", greedy(1), NG], ["greedy2", greedy(2), Math.max(20, NG >> 1)]];
  for (const [cfg, d, h] of [["d6 hurt", 6, true], ["d6 nohurt", 6, false], ["d10 hurt", 10, true]]) {
    console.log("== echo v4 " + cfg);
    for (const [name, bot, n] of bots) {
      const rs = []; for (let i = 0; i < n; i++) rs.push(run(bot, d, h));
      const w = rs.map(r => r.wave), s = rs.map(r => r.score);
      console.log(`  ${name.padEnd(12)} n=${n} wave med ${q(w, .5)} p90 ${q(w, .9)} max ${Math.max(...w)} | score med ${q(s, .5)} p90 ${q(s, .9)} max ${Math.max(...s)} | alive@600 ${rs.filter(r => r.alive).length} | echoDeaths/run ${mean(rs.map(r => r.echoDeaths)).toFixed(1)} | turns ${mean(rs.map(r => r.turns)).toFixed(0)} | waves ${hist(w)}`);
    }
  }
}

// ======================= THE HEIR =======================
function heir() {
  const G = loadGame(DIR + "the-heir.html", ["state", "settings", "newGame", "step", "useSkill", "inherit", "enemyAt", "isWall", "inB", "DIRS", "W", "H", "BODIES", "SKILLS", "firstEnemy", "dist", "MAX_GEN"]);
  G.settings.choose = true;
  const pass = (x, y) => !G.isWall(x, y) && !G.enemyAt(x, y);
  const adj = P => G.DIRS.map(([dx, dy]) => G.enemyAt(P.x + dx, P.y + dy)).filter(Boolean);
  const inLine = (P, range) => G.DIRS.map(([dx, dy]) => ({ dx, dy, t: G.firstEnemy(P, dx, dy, range) })).filter(o => o.t);
  // an action is {kind:'step'|'skill'|'inherit', slot, dx, dy, i}
  const apply = a => { if (a.kind === "step") G.step(a.dx, a.dy); else if (a.kind === "skill") G.useSkill(a.slot, a.dx, a.dy); else G.inherit(a.i); };
  const ready = P => P.skills.map((s, i) => ({ ...s, slot: i })).filter(s => s.cd === 0);
  const fightMove = (useSkills) => {
    const S = G.state, P = S.player;
    if (S.dying) return { kind: "inherit", i: 0 };
    const near = adj(P), lines = inLine(P, G.W);
    if (useSkills) for (const s of ready(P)) {
      if (s.id === "cleave" && near.length >= 2) return { kind: "skill", slot: s.slot, dx: 0, dy: 0 };
      if (s.id === "regrow" && P.hp <= P.maxhp - 2 && S.enemies.some(e => G.dist(e, P) <= 3)) return { kind: "skill", slot: s.slot, dx: 0, dy: 0 };
      if (s.id === "bolt" && lines.length) { const l = lines.sort((a, b) => a.t.d - b.t.d)[0]; return { kind: "skill", slot: s.slot, dx: l.dx, dy: l.dy }; }
      if (s.id === "charge" && lines.length) { const l = lines.find(o => o.t.d >= 2) || lines[0]; return { kind: "skill", slot: s.slot, dx: l.dx, dy: l.dy }; }
      if (s.id === "dash" && P.hp <= 2 && near.length) { // flee along the freest line
        let bd = null, bn = 0; for (const [dx, dy] of G.DIRS) { let n = 0; while (n < 3 && G.inB(P.x + dx * (n + 1), P.y + dy * (n + 1)) && pass(P.x + dx * (n + 1), P.y + dy * (n + 1))) n++; if (n > bn) { bn = n; bd = [dx, dy]; } }
        if (bd) return { kind: "skill", slot: s.slot, dx: bd[0], dy: bd[1] };
      }
    }
    if (G.BODIES[P.type].trait === "ranged" && inLine(P, 4).length) return { kind: "step", dx: 0, dy: 0 };
    if (near.length) { const e = near[0]; return { kind: "step", dx: e.x - P.x, dy: e.y - P.y }; }
    const m = stepToward(G, P.x, P.y, S.enemies, (x, y) => pass(x, y) || !!G.enemyAt(x, y));
    return m ? { kind: "step", dx: m[0], dy: m[1] } : { kind: "step", dx: 0, dy: 0 };
  };
  const naive = () => fightMove(false), skilled = () => fightMove(true);
  const coward = () => {
    const S = G.state, P = S.player;
    if (S.dying) return { kind: "inherit", i: Math.floor(Math.random() * 2) };
    const fields = S.enemies.map(e => bfs(G, e.x, e.y, (x, y) => !G.isWall(x, y)));
    const sc = (x, y) => Math.min(...fields.map(f => f.get(x + "," + y) ?? 99), 99);
    let bd = [0, 0], bv = sc(P.x, P.y) - 0.5;
    for (const [dx, dy] of G.DIRS) { const nx = P.x + dx, ny = P.y + dy; if (G.inB(nx, ny) && pass(nx, ny)) { const v = sc(nx, ny) + Math.random() * 0.1; if (v > bv) { bv = v; bd = [dx, dy]; } } }
    return { kind: "step", dx: bd[0], dy: bd[1] };
  };
  // death-farm: until we're an orc, walk up to an orc (if any) and wait beside it to be killed by it; otherwise fight skilled
  const farm = () => {
    const S = G.state, P = S.player;
    if (S.dying) return { kind: "inherit", i: 0 };
    const orcs = S.enemies.filter(e => e.type === "orc");
    if (P.type !== "orc" && orcs.length && S.gen < G.MAX_GEN) {
      if (orcs.some(o => G.dist(o, P) === 1)) return { kind: "step", dx: 0, dy: 0 };
      const m = stepToward(G, P.x, P.y, orcs, (x, y) => pass(x, y) || !!G.enemyAt(x, y));
      if (m) return { kind: "step", dx: m[0], dy: m[1] };
    }
    return fightMove(true);
  };
  const evalS = s => {
    if (s.over) return s.score * 3 - 50;
    const P = s.player; let v = s.score * 3 + P.hp * 1.2 + (G.MAX_GEN - s.gen) * 8;
    if (s.dying) v -= 6;
    let md = 99; for (const e of s.enemies) { md = Math.min(md, G.dist(e, P)); if (G.dist(e, P) === 1) v -= 1; }
    return v - 0.6 * md;
  };
  const actions = () => {
    const S = G.state, P = S.player, out = [];
    if (S.dying) { for (let i = 0; i < Math.max(1, S.dying.choices.length); i++) out.push({ kind: "inherit", i }); return out; }
    out.push({ kind: "step", dx: 0, dy: 0 }); for (const [dx, dy] of G.DIRS) out.push({ kind: "step", dx, dy });
    for (const s of ready(P)) { if (G.SKILLS[s.id].aimed) for (const [dx, dy] of G.DIRS) out.push({ kind: "skill", slot: s.slot, dx, dy }); else out.push({ kind: "skill", slot: s.slot, dx: 0, dy: 0 }); }
    return out;
  };
  const tryAct = (s, a) => { G.state = clone(s); const t0 = G.state.turn, g0 = G.state.gen; apply(a); return (G.state.turn !== t0 || G.state.gen !== g0 || G.state.over); };
  const greedy = ply => () => {
    const S0 = G.state;
    const search = (s, depth) => { let b = -1e9; for (const a of actions.call(null)) { if (!tryAct(s, a)) continue; let v = evalS(G.state); if (depth > 1 && !G.state.over) { const st = G.state; v = 0.5 * v + 0.5 * search(st, depth - 1); } if (v > b) b = v; } return b; };
    G.state = S0; const acts = actions(); let bA = acts[0], bV = -1e9;
    for (const a of acts) {
      let v = 0, ok = true; for (let i = 0; i < 2; i++) { if (!tryAct(S0, a)) { ok = false; break; } let vv = evalS(G.state); if (ply > 1 && !G.state.over) { const st = G.state; G.state = st; vv = 0.5 * vv + 0.5 * search(st, ply - 1); } v += vv; }
      if (!ok) continue; v += Math.random() * 0.01; if (v > bV) { bV = v; bA = a; }
    }
    G.state = S0; return bA;
  };
  function run(bot, cap = 400) {
    G.newGame(); let t = 0, stuck = 0;
    while (!G.state.over && t < cap) {
      const t0 = G.state.turn, g0 = G.state.gen, a = bot(); apply(a);
      if (G.state.turn === t0 && G.state.gen === g0 && !G.state.over) { if (++stuck > 3) G.step(0, 0); } else stuck = 0;
      t++;
    }
    const S = G.state;
    return { score: S.score, waves: S.wavesCleared, kills: S.kills, gen: S.gen, alive: !S.over, bodies: S.lineage.map(l => l.type[0]).join(""), turns: t };
  }
  const bots = [["naive", naive, N], ["skilled", skilled, N], ["coward", coward, N], ["death-farm", farm, N], ["greedy1", greedy(1), NG], ["greedy2", greedy(2), Math.max(20, NG >> 1)]];
  console.log("== the heir");
  for (const [name, bot, n] of bots) {
    const rs = []; for (let i = 0; i < n; i++) rs.push(run(bot));
    const s = rs.map(r => r.score), w = rs.map(r => r.waves);
    const bodyCount = {}; for (const r of rs) for (const c of r.bodies) bodyCount[c] = (bodyCount[c] || 0) + 1;
    console.log(`  ${name.padEnd(11)} n=${n} score med ${q(s, .5)} p90 ${q(s, .9)} max ${Math.max(...s)} | waves med ${q(w, .5)} p90 ${q(w, .9)} max ${Math.max(...w)} | kills ${mean(rs.map(r => r.kills)).toFixed(1)} | gens used ${mean(rs.map(r => r.gen)).toFixed(1)} | alive@600 ${rs.filter(r => r.alive).length} | turns ${mean(rs.map(r => r.turns)).toFixed(0)} | bodies ${JSON.stringify(bodyCount)}`);
  }
}

// ======================= LANTERN BUDGET =======================
function lantern() {
  const G = loadGame(DIR + "lantern-budget.html", ["state", "settings", "newGame", "step", "cast", "snuff", "enemyAt", "isWall", "inB", "DIRS", "W", "H", "radius", "inLight", "awake", "visible", "idx", "dist", "FLARE_R", "COST"]);
  // fair knowledge: seen walls block, unseen tiles assumed open; enemies block
  const seenWall = (x, y) => G.state.seen[G.idx(x, y)] && G.isWall(x, y);
  const pass = (x, y) => !seenWall(x, y) && !G.enemyAt(x, y);
  const targets = () => {
    const S = G.state, st = S.stair;
    if (S.seen[G.idx(st.x, st.y)]) return [st];
    const out = []; for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) if (!S.seen[G.idx(x, y)]) out.push({ x, y });
    return out;
  };
  const oilSeen = () => G.state.oil.filter(o => G.state.seen[G.idx(o.x, o.y)]);
  const apply = a => { if (a.kind === "step") G.step(a.dx, a.dy); else if (a.kind === "snuff") G.snuff(); else G.cast(a.spell, a.dx, a.dy); };
  const runner = (opts) => () => {
    const S = G.state, P = S.player;
    if (opts.dark && S.lit) return { kind: "snuff" };
    if (opts.scout) { // dark until the stairs are seen and no awake shade is near, then relight and go
      const stairSeen = S.seen[G.idx(S.stair.x, S.stair.y)];
      const shadeNear = S.enemies.some(e => e.type === "shade" && G.dist(e, P) <= 2);
      if (S.lit && !stairSeen && !shadeNear && S.enemies.some(e => e.type === "shade")) return { kind: "snuff" };
      if (!S.lit && stairSeen && S.L > 1) return { kind: "snuff" };
    }
    if (opts.flare && S.L > G.COST.flare + 1 && S.lit && S.enemies.some(e => G.awake(e) && G.dist(e, P) <= 2)) return { kind: "cast", spell: "flare", dx: 0, dy: 0 };
    const awakeAdj = G.DIRS.map(([dx, dy]) => G.enemyAt(P.x + dx, P.y + dy)).filter(e => e && G.awake(e));
    if (awakeAdj.length) { const e = awakeAdj[0]; return { kind: "step", dx: e.x - P.x, dy: e.y - P.y }; }
    if (opts.bolt && S.lit && S.L > 2) for (const [dx, dy] of G.DIRS) for (let k = 2; k <= G.radius(); k++) { const x = P.x + dx * k, y = P.y + dy * k; if (!G.inB(x, y) || G.isWall(x, y)) break; const e = G.enemyAt(x, y); if (e) { if (G.awake(e)) return { kind: "cast", spell: "bolt", dx, dy }; break; } }
    let tg = targets();
    if (opts.oil && S.L <= 8) { const o = oilSeen(); if (o.length) tg = o; }
    const m = stepToward(G, P.x, P.y, tg, pass);
    return m ? { kind: "step", dx: m[0], dy: m[1] } : { kind: "step", dx: 0, dy: 0 };
  };
  const evalS = s => {
    if (s.over) return (s.floor - 1) * 10 + s.kills - 40;
    G.state = s; const P = s.player;
    let v = s.L * 1.5 + (s.floor - 1) * 12 + s.kills * 1.5 + (s.lit ? 0.5 : 0);
    const tg = targets(); const f = bfs(G, P.x, P.y, pass); let md = 99; for (const t of tg) md = Math.min(md, f.get(t.x + "," + t.y) ?? 99);
    v -= 1.0 * md;
    for (const e of s.enemies) if (G.awake(e) && G.dist(e, P) === 1) v -= 2.5;
    return v;
  };
  const actions = () => {
    const S = G.state, out = [{ kind: "step", dx: 0, dy: 0 }, { kind: "snuff" }];
    for (const [dx, dy] of G.DIRS) out.push({ kind: "step", dx, dy });
    if (S.lit && S.L > G.COST.flare) out.push({ kind: "cast", spell: "flare", dx: 0, dy: 0 });
    if (S.lit && S.L > G.COST.bolt) for (const [dx, dy] of G.DIRS) out.push({ kind: "cast", spell: "bolt", dx, dy });
    return out;
  };
  const tryAct = (s, a) => { G.state = clone(s); const t0 = G.state.turn; apply(a); return G.state.turn !== t0 || G.state.over; };
  const greedy = ply => () => {
    const S0 = G.state;
    const search = (s, depth) => { G.state = s; let b = -1e9; for (const a of actions()) { if (!tryAct(s, a)) continue; const st = G.state; let v = evalS(st); if (depth > 1 && !st.over) v = 0.5 * v + 0.5 * search(st, depth - 1); if (v > b) b = v; } return b; };
    G.state = S0; const acts = actions(); let bA = acts[0], bV = -1e9;
    for (const a of acts) {
      let v = 0, ok = true; for (let i = 0; i < 2; i++) { if (!tryAct(S0, a)) { ok = false; break; } const st = G.state; let vv = evalS(st); if (ply > 1 && !st.over) vv = 0.5 * vv + 0.5 * search(st, ply - 1); v += vv; }
      if (!ok) continue; v += Math.random() * 0.01; if (v > bV) { bV = v; bA = a; }
    }
    G.state = S0; return bA;
  };
  function run(bot, bite, cap = 600) {
    G.settings.bite = bite; G.newGame(); let t = 0, stuck = 0, snuffs = 0, flares = 0, bolts = 0;
    while (!G.state.over && t < cap) {
      const t0 = G.state.turn, a = bot(); apply(a);
      if (a.kind === "snuff" && G.state.turn !== t0) snuffs++; if (a.kind === "cast" && G.state.turn !== t0) { if (a.spell === "flare") flares++; else bolts++; }
      if (G.state.turn === t0 && !G.state.over) { if (++stuck > 3) G.step(0, 0); } else stuck = 0;
      t++;
    }
    const S = G.state; return { floor: S.floor, score: S.score, kills: S.kills, alive: !S.over, turns: t, snuffs, flares, bolts, cause: S.cause || "" };
  }
  const bots = (process.env.ONLY ? [["dark-scout", runner({ scout: true, oil: true }), N], ["lit+oil", runner({ oil: true }), N]] : [["lit-runner", runner({}), N], ["lit+oil", runner({ oil: true }), N], ["dark-runner", runner({ dark: true }), N], ["flare-spam", runner({ flare: true, oil: true }), N], ["bolt-user", runner({ bolt: true, oil: true }), N], ["dark-scout", runner({ scout: true, oil: true }), N], ["greedy1", greedy(1), NG], ["greedy2", greedy(2), Math.max(20, NG >> 1)]]);
  for (const bite of [true, false]) {
    console.log("== lantern bite=" + bite);
    for (const [name, bot, n] of bots) {
      const rs = []; for (let i = 0; i < n; i++) rs.push(run(bot, bite));
      const f = rs.map(r => r.floor), s = rs.map(r => r.score);
      const causes = {}; for (const r of rs) { const c = r.alive ? "alive" : r.cause.replace(/^a /, ""); causes[c] = (causes[c] || 0) + 1; }
      console.log(`  ${name.padEnd(11)} n=${n} floor med ${q(f, .5)} p90 ${q(f, .9)} max ${Math.max(...f)} | score med ${q(s, .5)} p90 ${q(s, .9)} max ${Math.max(...s)} | kills ${mean(rs.map(r => r.kills)).toFixed(1)} | turns ${mean(rs.map(r => r.turns)).toFixed(0)} | snuff/flare/bolt ${mean(rs.map(r => r.snuffs)).toFixed(1)}/${mean(rs.map(r => r.flares)).toFixed(1)}/${mean(rs.map(r => r.bolts)).toFixed(1)} | ends ${JSON.stringify(causes)}`);
    }
  }
}

({ echo, heir, lantern })[which]();
