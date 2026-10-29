// Lockstep roguelite (index.html) bot harness.
// usage: node sim/run4.js <section> [N]   sections: base | cards | bosses | new
const G = require("../rules.js");
const SECTION = process.argv[2] || "base", N = +process.argv[3] || 40;
const clone = s => JSON.parse(JSON.stringify(s));
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const pct = (a, f) => (100 * a.filter(f).length / a.length).toFixed(0) + "%";
const q = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
G.SIM = true;

/* ---------- fight bots ---------- */
const pass = (x, y) => G.inB(x, y) && !G.isWall(x, y) && !G.isPit(x, y);
function bfs(sx, sy) { const f = new Map([[sx + "," + sy, 0]]), qq = [[sx, sy]]; while (qq.length) { const [x, y] = qq.shift(), d = f.get(x + "," + y); for (const [dx, dy] of G.DIRS) { const nx = x + dx, ny = y + dy, k = nx + "," + ny; if (pass(nx, ny) && !f.has(k)) { f.set(k, d + 1); qq.push([nx, ny]); } } } return f; }
const naive = () => {
  const F = G.R.fight, P = F.p;
  for (const [dx, dy] of G.DIRS) if (G.enemyAt(P.x + dx, P.y + dy)) return { kind: "step", dx, dy };
  const f = bfs(P.x, P.y); let t = null, bd = 1e9; for (const e of F.enemies) { const d = f.get(e.x + "," + e.y); if (d != null && d < bd) { bd = d; t = e; } }
  if (!t) return { kind: "step", dx: 0, dy: 0 };
  const g = bfs(t.x, t.y); let best = null, bv = 1e9; for (const [dx, dy] of G.DIRS) { const nx = P.x + dx, ny = P.y + dy; if (!pass(nx, ny) || G.enemyAt(nx, ny)) continue; const v = g.get(nx + "," + ny); if (v != null && v < bv) { bv = v; best = { kind: "step", dx, dy }; } }
  return best || { kind: "step", dx: 0, dy: 0 };
};
function actions() {
  const out = [{ kind: "step", dx: 0, dy: 0 }];
  for (const [dx, dy] of G.DIRS) out.push({ kind: "step", dx, dy });
  G.R.hand.forEach((c, slot) => {
    if (c.cd > 0) return;
    if (G.CARDS[c.id].dir) { for (const [dx, dy] of G.DIRS) if (!G.cardBlock(slot, dx, dy)) out.push({ kind: "card", slot, dx, dy }); }
    else if (!G.cardBlock(slot, 0, 0)) out.push({ kind: "card", slot, dx: 0, dy: 0 });
  });
  return out;
}
const apply = a => (a.kind === "step" ? G.step(a.dx, a.dy) : G.play(a.slot, a.dx, a.dy));
function evalR(R) {
  const F = R.fight; if (!F) return 0;
  if (F.over === "lose" || R.hp <= 0) return -300;
  let v = R.hp * 7 + F.gold * 1.5;
  if (F.over === "win") return v + 80;
  for (const e of F.enemies) { const d = G.FOES[e.type]; v -= e.hp * (d.boss ? 2.5 : 1.6); if (G.dist(e, F.p) === 1 && !G.fixed(e)) v -= 2; if (e.free && !d.chaser) v -= 1.2; }
  if (F.kind === "boss") v -= F.turn * 0.4;
  if (F.goal && !F.goal.ok) v -= 6;
  if (F.goal && F.goal.ok && F.goal.flag && !F.goal.took) v -= 0.6 * G.dist(F.p, F.goal.flag);
  return v;
}
const ply1 = () => {
  const R0 = G.R; let best = null, bv = -1e9;
  for (const a of actions()) { G.R = clone(R0); G.SIM = true; apply(a); const v = evalR(G.R) + Math.random() * 0.01; if (v > bv) { bv = v; best = a; } }
  G.R = R0; return best;
};
const ply2 = () => {
  const R0 = G.R; const scored = [];
  for (const a of actions()) { G.R = clone(R0); G.SIM = true; apply(a); scored.push({ a, v: evalR(G.R), s: G.R }); }
  scored.sort((x, y) => y.v - x.v);
  let best = scored[0].a, bv = -1e9;
  for (const { a, v, s } of scored.slice(0, 4)) {
    let v2 = v;
    if (!s.fight.over) { G.R = s; let b2 = -1e9; for (const a2 of actions()) { G.R = clone(s); G.SIM = true; apply(a2); b2 = Math.max(b2, evalR(G.R)); } v2 = 0.5 * v + 0.5 * b2; }
    v2 += Math.random() * 0.01; if (v2 > bv) { bv = v2; best = a; }
  }
  G.R = R0; return best;
};

/* ---------- run driver ---------- */
const worst = (policy) => { // slot to replace: lowest-preference card; never the policy's preferred card
  const order = ["brace", "recall", "trapdoor", "sidestep", "aboutface", "magnet", "doubletime", "stomp", "quake", "lunge", "shove"];
  let bi = 0, bv = 1e9; G.R.hand.forEach((c, i) => { const v = order.indexOf(c.id) + (c.up ? 3 : 0) + (policy && policy.prefer === c.id ? 100 : 0); if (v < bv) { bv = v; bi = i; } }); return bi;
};
function draft(cards, policy) {
  if (!cards.length || policy.draft === "none") return null;
  if (policy.prefer && cards.includes(policy.prefer)) return policy.prefer;
  if (policy.draft === "random") return cards[Math.floor(Math.random() * cards.length)];
  return cards[0];
}
function runOne(bot, { char = "recruit", cad = 0, policy = { draft: "random" }, start = [] } = {}) {
  G.SIM = true; G.newRun(char, cad);
  for (const id of start) if (!G.R.hand.some(c => c.id === id) && G.R.hand.length < G.R.slots) G.R.hand.push({ id, cd: 0, up: false });
  const st = { won: false, act: 1, fights: 0, stalls: 0, plays: {}, bossTurns: {}, bossWon: {}, enrage: 0, deathBy: "", hpAtBoss: {}, nodes: {}, goldSpent: 0, heals: 0, turns: 0, goals: {}, orders: 0 };
  let guard = 0;
  while (G.R.screen !== "end" && guard++ < 400) {
    const R = G.R;
    if (R.screen === "map") {
      const open = G.openNodes(), types = open.map(k => R.map.nodes[k].t);
      const want = R.hp <= R.maxhp * 0.45 ? ["rest", "shop", "event", "fight", "elite", "boss"] : R.gold >= 45 ? ["shop", "elite", "fight", "event", "rest", "boss"] : ["elite", "fight", "event", "rest", "shop", "boss"];
      let pick = open[0]; for (const w of want) { const i = types.indexOf(w); if (i >= 0) { pick = open[i]; break; } }
      st.nodes[R.map.nodes[pick].t] = (st.nodes[R.map.nodes[pick].t] || 0) + 1;
      G.enterNode(pick); continue;
    }
    if (R.screen === "fight") {
      const F = R.fight; st.fights++; const kind = F.kind, bossType = kind === "boss" ? G.BOSSES[R.act - 1] : null, hp0 = R.hp;
      let t = 0;
      while (!F.over && t < 200) { const a = bot(); if (a.kind === "card") st.plays[R.hand[a.slot].id] = (st.plays[R.hand[a.slot].id] || 0) + 1; apply(a); G.SIM = true; t++; }
      st.turns += t;
      if (!F.over) { st.stalls++; F.over = "lose"; st.deathBy = "stall:" + (bossType || kind); }
      if (bossType) { st.bossTurns[bossType] = t; st.bossWon[bossType] = F.over === "win"; st.hpAtBoss[bossType] = hp0; if (t >= 30) st.enrage++; }
      if (F.over === "lose") { if (!st.deathBy) st.deathBy = bossType || kind; G.endRun(false); break; }
      G.fightReward();
      const rw = R.reward, id = draft(rw.cards, policy);
      if (rw.goal) { const g = st.goals[rw.goal.id] = st.goals[rw.goal.id] || [0, 0]; g[0]++; if (rw.goal.ok) g[1]++; }
      if (rw.orders && rw.orders.length && policy.orders !== "none" && G.takeOrder(rw.orders[0])) st.orders++;
      if (id) { if (R.hand.length < R.slots) G.takeCard(id); else G.takeCard(id, worst(policy)); }
      if (rw.upgrade) { const i = R.hand.findIndex(c => !c.up); if (i >= 0) G.upgradeCard(i); }
      G.leaveNode(); st.act = R.act; continue;
    }
    if (R.screen === "rest") {
      if (R.shop && R.shop.wagon) {  // pre-boss supply wagon: patch up, then spend the rest on Rations
        if (R.hp <= R.maxhp - 3 && G.buyHeal()) { st.goldSpent += R.shop.healPrice; st.heals++; }
        for (let p = R.shop.hpPrice; R.gold >= p && G.buyHp(); p = R.shop.hpPrice) st.goldSpent += p;
      }
      if ((R.hp <= R.maxhp - 3 || R.hand.every(c => c.up)) && G.restHeal()) st.heals++;
      else if (!G.restUpgrade(R.hand.findIndex(c => !c.up))) G.leaveNode();
      continue;
    }
    if (R.screen === "shop") {
      const sh = R.shop;
      if (R.hp <= R.maxhp - 3 && G.buyHeal()) { st.goldSpent += sh.healPrice; st.heals++; }
      if (policy.orders !== "none" && sh.order && !sh.order.sold && R.gold >= sh.order.price) { st.goldSpent += sh.order.price; if (G.buyOrder()) st.orders++; }
      sh.cards.forEach((o, i) => { if (o.sold || R.gold < o.price || R.hand.length >= R.slots || !draft([o.id], policy)) return; if (G.buyCard(i)) st.goldSpent += o.price; });
      const ui = R.hand.findIndex(c => !c.up); if (ui >= 0 && G.buyUpgrade(ui)) st.goldSpent += sh.upPrice;
      // A rich bot whose order is gone restocks once for another shot at one.
      if (sh.order && sh.order.sold && R.gold >= sh.restockPrice + 80 && G.restock()) {
        st.goldSpent += sh.restockPrice - 10; st.restocks = (st.restocks || 0) + 1;
        if (sh.order && R.gold >= sh.order.price) { st.goldSpent += sh.order.price; if (G.buyOrder()) st.orders++; }
      }
      // Spare gold (keeping a reserve for the next shop's order) goes on Rations, as a person would.
      for (let p = sh.hpPrice; R.gold >= p + 40 && G.buyHp(); p = sh.hpPrice) st.goldSpent += p;
      G.leaveNode(); continue;
    }
    if (R.screen === "event") {
      const ev = G.EVENTS[R.event]; let i = 0;
      if (ev.title.includes("medic")) i = R.hp <= R.maxhp - 3 ? 0 : 1;
      else if (ev.title.includes("kit")) i = R.hand.length < R.slots ? 1 : 0;
      else if (ev.title.includes("instructor")) i = R.hp >= 5 && R.hand.some(c => !c.up) ? 0 : 1;
      else if (ev.title.includes("drum")) i = R.maxhp >= 8 ? 0 : 1;
      ev.opts[i].go(); G.leaveNode(); continue;
    }
    if (R.screen === "reward") { G.leaveNode(); continue; }
    break;
  }
  const R = G.R; st.shotsTaken = R.stats.shotsTaken || 0; st.shotsStray = R.stats.shotsStray || 0; st.won = !!(R.end && R.end.won); st.act = R.end ? R.end.act : R.act; st.gold = R.gold; st.hp = R.hp; st.hand = R.hand.map(c => c.id + (c.up ? "+" : ""));
  return st;
}
function summary(name, rs) {
  const acts = rs.map(r => r.act); const byAct = {}; for (const a of acts) byAct[a] = (byAct[a] || 0) + 1;
  const deaths = {}; for (const r of rs) if (!r.won) deaths[r.deathBy] = (deaths[r.deathBy] || 0) + 1;
  const bt = {}; for (const b of G.BOSSES) { const t = rs.filter(r => r.bossTurns[b] != null); if (t.length) bt[b] = `${t.length} fought, ${pct(t, r => r.bossWon[b])} won, ${mean(t.map(r => r.bossTurns[b])).toFixed(0)}t`; }
  return `  ${name.padEnd(24)} n=${rs.length} win ${pct(rs, r => r.won)} | act reached ${JSON.stringify(byAct)} | stalls ${rs.reduce((a, r) => a + r.stalls, 0)} | deaths ${JSON.stringify(deaths)} | bosses ${JSON.stringify(bt)}`;
}
const many = (bot, n, opts) => { const rs = []; for (let i = 0; i < n; i++) rs.push(runOne(bot, opts)); return rs; };

if (SECTION === "base") {
  for (const cad of [0, 3]) for (const char of ["recruit", "drummer", "sapper"]) {
    console.log(`== C${cad} ${char}`);
    for (const [name, bot, n] of [["naive", naive, N], ["1ply", ply1, Math.max(20, N >> 1)], ["2ply", ply2, Math.max(12, N >> 2)]]) {
      const rs = many(bot, n, { char, cad }); console.log(summary(name, rs));
      if (name !== "naive") { const pl = {}; for (const r of rs) for (const [k, v] of Object.entries(r.plays)) pl[k] = (pl[k] || 0) + v; console.log("     card plays/run: " + Object.entries(pl).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(v / rs.length).toFixed(1)}`).join(", ") + ` | gold spent ${mean(rs.map(r => r.goldSpent)).toFixed(0)} heals ${mean(rs.map(r => r.heals)).toFixed(1)} | hp into bosses ${JSON.stringify(Object.fromEntries(G.BOSSES.map(b => [b, mean(rs.filter(r => r.hpAtBoss[b] != null).map(r => r.hpAtBoss[b])).toFixed(1)])))}`); }
    }
  }
}
if (SECTION === "cards") {
  console.log("== card impact, recruit C0, 1ply: card forced into the starting hand + preferred in drafts, vs random");
  console.log(summary("random", many(ply1, N, {})));
  console.log(summary("no drafting at all", many(ply1, N, { policy: { draft: "none" } })));
  for (const id of Object.keys(G.CARDS)) console.log(summary("start+prefer " + id, many(ply1, N, { start: [id], policy: { draft: "random", prefer: id } })));
  console.log("== combos (start with both)");
  for (const [n, ids] of [["stomp+ only (upgraded stomp)", ["stomp"]], ["quake+magnet", ["quake", "magnet"]], ["shove+trapdoor", ["shove", "trapdoor"]], ["brace+recall", ["brace", "recall"]], ["lunge+shove", ["lunge", "shove"]]]) {
    const rs = []; for (let i = 0; i < N; i++) { const st = runOne(ply1, { start: ids.filter(x => x !== "stomp"), policy: { draft: "random", prefer: ids[0] } }); rs.push(st); } console.log(summary(n, rs));
  }
  console.log("== stomp+ at cooldown 1 (upgrade stomp at start)");
  const rsU = []; for (let i = 0; i < N; i++) { const bot = () => { if (G.R.hand[1] && G.R.hand[1].id === "stomp" && !G.R.hand[1].up) G.R.hand[1].up = true; return ply1(); }; rsU.push(runOne(bot, {})); } console.log(summary("recruit stomp+ from turn 1", rsU));
}
if (SECTION === "bosses") {
  console.log("== boss fights in isolation (recruit C0, full hp 8, hand = sidestep/stomp + extra), 1ply vs 2ply");
  const fightBoss = (act, bot, extra) => {
    G.SIM = true; G.newRun("recruit", 0); G.R.act = act; G.R.map = { act, nodes: { b: { r: 6, c: 0, t: "boss" } }, edges: [] }; G.R.pos = null;
    for (const id of extra) G.R.hand.push({ id, cd: 0, up: false });
    G.R.pos = "b"; G.R.walked = []; const t0 = G.R.map.nodes.b.t; // start the boss fight directly
    G.R.map.nodes.b.t = t0; G.R.screen = "map"; G.R.pos = null; G.R.map.edges = [];
    // enterNode requires openNodes: row 0 nodes
    G.R.map.nodes = { "0:0": { r: 0, c: 0, t: "boss" } };
    G.enterNode("0:0");
    const F = G.R.fight; let t = 0; while (!F.over && t < 200) { apply(bot()); G.SIM = true; t++; }
    return { won: F.over === "win", turns: t, hp: G.R.hp, stall: !F.over, enr: t >= 30 };
  };
  for (const [bn, bot] of [["1ply", ply1], ["2ply", ply2]]) for (const extra of [[], ["shove"], ["lunge"], ["quake"], ["trapdoor"], ["brace"]]) {
    const row = [];
    for (let act = 1; act <= 3; act++) { const rs = []; for (let i = 0; i < N; i++) rs.push(fightBoss(act, bot, extra)); row.push(`${G.BOSSES[act - 1]}: win ${pct(rs, r => r.won)} turns ${mean(rs.map(r => r.turns)).toFixed(0)} hpLeft ${mean(rs.map(r => r.hp)).toFixed(1)} enrage ${pct(rs, r => r.enr)} stall ${rs.filter(r => r.stall).length}`); }
    console.log(`  ${bn} +${extra.join(",") || "nothing"}`.padEnd(22) + row.join(" | "));
  }
}
if (SECTION === "econ") {
  console.log("== economy, 1ply, random drafts");
  for (const char of ["recruit", "sapper"]) {
    const rs = many(ply1, N, { char });
    const far = rs.filter(r => r.act >= 3);
    console.log(`  ${char}: n=${N} reached act3 ${far.length} | gold left at end ${mean(rs.map(r => r.gold)).toFixed(0)} (act3 runs ${mean(far.map(r => r.gold)).toFixed(0)}) | spent ${mean(rs.map(r => r.goldSpent)).toFixed(0)} | heals ${mean(rs.map(r => r.heals)).toFixed(1)} | hp end ${mean(rs.map(r => r.hp)).toFixed(1)} | nodes ${JSON.stringify(Object.fromEntries(Object.entries(rs.reduce((a, r) => { for (const [k, v] of Object.entries(r.nodes)) a[k] = (a[k] || 0) + v; return a; }, {})).map(([k, v]) => [k, (v / N).toFixed(1)])))} | final hands e.g. ${rs.slice(0, 4).map(r => r.hand.join("/")).join(" ; ")}`);
  }
}

if (SECTION === "new") {
  console.log("== rifleman + bonus orders + drill orders, 1ply, C0");
  for (const char of ["recruit", "drummer", "sapper"]) for (const [name, policy] of [["orders", { draft: "random" }], ["no orders", { draft: "random", orders: "none" }]]) {
    const rs = many(ply1, N, { char, policy });
    const goals = {}; for (const r of rs) for (const [k, [t, ok]] of Object.entries(r.goals)) { goals[k] = goals[k] || [0, 0]; goals[k][0] += t; goals[k][1] += ok; }
    console.log(summary(`${char} ${name}`, rs));
    console.log(`     bonus done: ${Object.entries(goals).map(([k, [t, ok]]) => `${k} ${ok}/${t} (${(100 * ok / t).toFixed(0)}%)`).join(", ")} | orders/run ${mean(rs.map(r => r.orders)).toFixed(1)} | gold spent ${mean(rs.map(r => r.goldSpent)).toFixed(0)}, left ${mean(rs.map(r => r.gold)).toFixed(0)} | rifle shots/run at you ${mean(rs.map(r => r.shotsTaken)).toFixed(1)}, stray ${mean(rs.map(r => r.shotsStray)).toFixed(1)}`);
  }
}
if (SECTION === "check") {
  // Quick balance check: normal play (random drafts, orders on), one line per character.
  // node sim/run4.js check [N] [char]; BOT=2ply for the 2-ply bot, CAD=n for a cadence level.
  const bot = process.env.BOT === "2ply" ? ply2 : ply1, cad = +process.env.CAD || 0;
  for (const char of process.argv[4] ? [process.argv[4]] : ["recruit", "drummer", "sapper"]) {
    const rs = many(bot, N, { char, cad, policy: { draft: "random" } });
    const goals = {}; for (const r of rs) for (const [k, [t, ok]] of Object.entries(r.goals)) { goals[k] = goals[k] || [0, 0]; goals[k][0] += t; goals[k][1] += ok; }
    console.log(summary(char, rs));
    console.log(`     bonus done: ${Object.entries(goals).map(([k, [t, ok]]) => `${k} ${(100 * ok / t).toFixed(0)}%`).join(", ")} | gold spent ${mean(rs.map(r => r.goldSpent)).toFixed(0)}, left ${mean(rs.map(r => r.gold)).toFixed(0)} (winners ${mean(rs.filter(r => r.won).map(r => r.gold)).toFixed(0)}, incl. 60 from the last boss) | restocks/run ${mean(rs.map(r => r.restocks || 0)).toFixed(1)}`);
  }
}
