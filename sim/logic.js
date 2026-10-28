const W = 11, H = 11, MAXHP = 5;
const DOOR = { x: 5, y: 5 };
const WALLS = new Set(Array.from({ length: H }, (_, y) => `${DOOR.x},${y}`).filter(k => k !== `${DOOR.x},${DOOR.y}`));
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const settings = { hurt: true, delay: 6 };
const inB = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
const isWall = (x, y) => WALLS.has(x + "," + y);
const enemyAt = (x, y) => state.enemies.find(e => e.x === x && e.y === y);
const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

function log(msg) {
  state.log.unshift({ t: state.history.length, msg });
  state.log.length = Math.min(state.log.length, 7);
}

function newGame() {
  state = {
    delay: settings.delay, player: { x: 2, y: 5, hp: MAXHP }, echo: null, history: [],
    enemies: [], wave: 0, score: 0, over: false, log: []
  };
  nextWave();
  log(`Your echo will start replaying after ${state.delay} turns.`);
  render();
}

function nextWave() {
  state.wave++;
  const n = state.wave;
  const types = [];
  for (let i = 0; i < n + 1; i++) types.push("shade");
  for (let i = 0; i < Math.floor(n / 2); i++) types.push("brute");
  const P = state.player;
  // Enemies arrive in the room you're not in, so they have to come through the door.
  const farSide = P.x < DOOR.x ? 1 : -1;
  let cand = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1;
    if (!edge || isWall(x, y) || Math.sign(x - DOOR.x) !== farSide) continue;
    if (dist({ x, y }, P) < 5) continue;
    if (state.echo && state.echo.x === x && state.echo.y === y) continue;
    cand.push({ x, y });
  }
  cand.sort(() => Math.random() - 0.5);
  for (const t of types) {
    const c = cand.pop(); if (!c) break;
    state.enemies.push(t === "brute"
      ? { x: c.x, y: c.y, type: t, hp: 2, dmg: 2, rest: true }
      : { x: c.x, y: c.y, type: t, hp: 1, dmg: 1, rest: false });
  }
  if (state.wave > 1) log(`Wave ${state.wave}: ${types.length} enemies.`);
}

function hitEnemy(e, who) {
  e.hp--;
  if (e.hp > 0) { log(`${who === "echo" ? "Echo" : "You"} hit a brute.`); return false; }
  state.enemies.splice(state.enemies.indexOf(e), 1);
  if (who === "echo") {
    state.score += 3;
    state.player.hp = Math.min(MAXHP, state.player.hp + 1);
    log(`Echo killed a ${e.type}. +3, +1 health.`);
  } else {
    state.score += 1;
    log(`You killed a ${e.type}. +1`);
  }
  return true;
}

function act(who, dx, dy) {
  const a = who === "player" ? state.player : state.echo, P = state.player;
  if (!dx && !dy) return;
  const tx = a.x + dx, ty = a.y + dy;
  if (!inB(tx, ty) || isWall(tx, ty)) return;
  const e = enemyAt(tx, ty);
  if (e) {
    if (hitEnemy(e, who) && who === "echo") { a.x = tx; a.y = ty; }
    return;
  }
  if (who === "echo" && tx === P.x && ty === P.y && settings.hurt) {
    P.hp--; flash();
    log("Your echo walked into you. −1 health.");
    return;
  }
  a.x = tx; a.y = ty;
}

function enemyFree(x, y) {
  const P = state.player, E = state.echo;
  if (!inB(x, y) || isWall(x, y) || enemyAt(x, y)) return false;
  if (P.x === x && P.y === y) return false;
  if (E && E.x === x && E.y === y) return false;
  return true;
}

// Walking distance to the player around walls (enemies and the echo ignored).
function pathField() {
  const P = state.player, f = new Map([[P.x + "," + P.y, 0]]), q = [[P.x, P.y]];
  while (q.length) {
    const [x, y] = q.shift(), d = f.get(x + "," + y);
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy, k = nx + "," + ny;
      if (inB(nx, ny) && !isWall(nx, ny) && !f.has(k)) { f.set(k, d + 1); q.push([nx, ny]); }
    }
  }
  return f;
}

function enemiesAct() {
  const P = state.player, field = pathField();
  const steps = c => field.get(c.x + "," + c.y) ?? 999;
  for (const e of [...state.enemies]) {
    if (!state.enemies.includes(e)) continue;
    if (e.type === "brute") {
      if (e.rest) { e.rest = false; continue; }
      e.rest = true;
    }
    const d = steps(e);
    if (d > 1) {
      const opts = DIRS.map(([dx, dy]) => ({ x: e.x + dx, y: e.y + dy }))
        .filter(c => enemyFree(c.x, c.y))
        .map(c => ({ ...c, d: steps(c), r: Math.random() }))
        .sort((a, b) => a.d - b.d || a.r - b.r);
      if (opts.length && (opts[0].d < d || (opts[0].d === d && Math.random() < 0.5))) {
        e.x = opts[0].x; e.y = opts[0].y;
      }
    }
    if (dist(e, P) === 1) {
      P.hp -= e.dmg; flash();
      log(`A ${e.type} hit you. −${e.dmg} health.`);
    }
  }
}

function step(dx, dy) {
  if (!state || state.over) return;
  const P = state.player;
  state.history.push({ x: P.x, y: P.y, dx, dy });
  act("player", dx, dy);

  const idx = state.history.length - 1 - state.delay;
  if (idx >= 0) {
    const h = state.history[idx];
    if (!state.echo) {
      state.echo = { x: h.x, y: h.y };
      log("Your echo has arrived.");
      let e;
      while ((e = enemyAt(h.x, h.y))) hitEnemy(e, "echo");
      if (P.x === h.x && P.y === h.y && settings.hurt) {
        P.hp--; flash();
        log("Your echo appeared on top of you. −1 health.");
      }
    }
    act("echo", h.dx, h.dy);
  }

  if (P.hp > 0) enemiesAct();

  if (P.hp <= 0) {
    P.hp = 0; state.over = true;
    if (state.score > best) { best = state.score; try { localStorage.setItem("echo-best", best); } catch (e) {} }
    log("You fell.");
  } else if (!state.enemies.length) {
    state.score += state.wave * 2;
    log(`Wave ${state.wave} cleared. +${state.wave * 2}`);
    nextWave();
  }
  render();
}
