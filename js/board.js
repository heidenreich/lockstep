// Lockstep page: the fight screen and the diorama canvas (settings, plinth, walls, tin soldiers, marks, draw loop, title strip).

/* ---------- Fight screen & canvas ---------- */
let cell = 52, armed = null, hoverDir = null, vis = {}, parts = [], floats = [], shake = 0, lastFrame = 0;
let visBefore = {}, fallers = [], banners = [], shots = [], hitStop = 0, nudge = { x: 0, y: 0 };
const cv = $("cv"), ctx = cv.getContext("2d");
function renderFight() {
  show("sFight");
  const F = R.fight;
  renderCoach();
  $("handPanel").classList.toggle("drilling", F.kind === "drill");
  $("hand").innerHTML = R.hand.map((c, i) => cardHTML(c, i, { inFight: true, armed: armed === i })).join("") + (R.hand.length < R.slots ? `<div class="card empty">Empty slot</div>` : "");
  $("armNote").innerHTML = armed != null ? `${esc(CARDS[R.hand[armed].id].name)}: pick a direction<span class="armtx">. ${esc(cardText(R.hand[armed]))}</span>` : "";
  const boss = F.enemies.find(e => foe(e).boss);
  const lines = [`<span>${esc(ROOMS[F.room].name)} · turn <b>${F.turn}</b></span>`];
  if (boss) lines.push(`<span>${esc(foe(boss).name)} <b>${boss.hp}/${boss.max}</b> · ${F.turn >= 30 ? '<b style="color:var(--danger)">enraged</b>' : `enrages in <b>${30 - F.turn}</b>`}</span>`);
  if (boss && foe(boss).march) lines.push(`<span>${boss.skip ? "This turn it <b>marches in step</b>" : "This turn it <b>chases</b>"}</span>`);
  else {
    // In a frenzy the line runs (two steps) every RUN_EVERY turns; warn when.
    const runIn = F.frenzy && F.frenzySince != null ? (RUN_EVERY - 1 - (F.turn - F.frenzySince) % RUN_EVERY) : null;
    const tail = F.kind === "drill" ? "" : !F.frenzy ? ` · frenzy in <b>${Math.max(0, F.frenzyAt - F.turn)}</b>` : runIn == null ? "" : runIn === 0 ? ` · <span class="warn">they run this turn</span>` : ` · they run in <b>${runIn}</b>`;
    lines.push(`<span>Enemies <b>${F.enemies.length}</b>${tail}</span>`);
  }
  const loose = F.enemies.filter(e => e.free && !foe(e).chaser).length;
  if (loose) lines.push(`<span class="warn"><b>${loose}</b> broken free</span>`);
  if (F.goal) lines.push(goalLine(F));
  if ((R.orders || []).length) lines.push(`<span class="ords">Orders: ${R.orders.map(id => `<b title="${esc(ORDERS[id].text)}">${esc(ORDERS[id].name)}</b>`).join(", ")}</span>`);
  if (boss && boss.type === "mirror") lines.push(`<span${F.flip ? ' class="warn"' : ""}>${F.flip ? `Cadence flipped: <b>${F.flip}</b> turns left` : `Cadence flips in <b>${F.flipIn}</b>`}</span>`);
  $("fstatus").innerHTML = lines.join("");
  $("log").innerHTML = F.log.map(l => `<li>${esc(l.msg)}</li>`).join("");
  const ban = $("banner");
  ban.textContent = F.frenzy ? "Frenzy: everything is chasing you" : F.flip ? "Cadence flipped" : "";
  ban.className = F.frenzy || F.flip ? "warn" : "";
  ban.parentElement.hidden = !ban.textContent;
  const cover = $("fightCover");
  if (F.over) {
    cover.hidden = false;
    cover.innerHTML = F.over === "win" && F.kind === "drill"
      ? `<h2>Drill complete</h2><p class="note">That's the whole rule. The rest of the run teaches itself as you meet it.</p><div><button class="btn" data-act="claim">To the map</button></div>`
      : F.over === "win"
      ? `<h2>${F.kind === "boss" ? "Boss down" : "Room cleared"}</h2><div><button class="btn" data-act="claim">Collect</button></div>`
      : `<h2>You fell</h2><p class="note">Act ${R.act}, turn ${F.turn}.</p><div><button class="btn" data-act="fallen">See the run</button></div>`;
  } else cover.hidden = true;
  syncVis();
  resize();
  draw(0);
}

function syncVis() {
  const F = R.fight; if (!F) return;
  const ids = new Set(F.enemies.map(e => e.id));
  for (const k of Object.keys(vis)) if (k !== "p" && !ids.has(+k)) delete vis[k];
  if (!vis.p) vis.p = { x: F.p.x, y: F.p.y };
  for (const e of F.enemies) if (!vis[e.id]) vis[e.id] = { x: e.x, y: e.y };
}
// The board is a toy diorama: a tabletop seen from the front, back rows a little smaller and higher.
const PERSP = 0.74, TILT = 0.7, PIECE = 1.4;
let tw = 60, ox = 0, oy = 0, CW = 600, CH = 500;
const rowScale = gy => PERSP + (1 - PERSP) * gy / H;
const rowY = gy => oy + tw * TILT * (PERSP * gy + (1 - PERSP) * gy * gy / (2 * H));
const proj = (gx, gy) => [ox + (gx - W / 2) * tw * rowScale(gy), rowY(gy)];
const at = (x, y) => proj(x + 0.5, y + 0.5);
function unproj(sx, sy) {
  const a = (1 - PERSP) / (2 * H), b = PERSP, c = -(sy - oy) / (tw * TILT);
  const gy = (-b + Math.sqrt(Math.max(0, b * b - 4 * a * c))) / (2 * a);
  return [(sx - ox) / (tw * rowScale(gy)) + W / 2, gy];
}
// Maps a unit square centred on 0 onto tile (x, y), for things painted flat on the board.
function tileSpace(g, x, y) { const [cx, cy] = at(x, y), sc = rowScale(y + 0.5); g.translate(cx, cy); g.scale(tw * sc, tw * TILT * sc); }
function tilePath(g, x, y, m) {
  m = m || 0;
  const pts = [proj(x + m, y + m), proj(x + 1 - m, y + m), proj(x + 1 - m, y + 1 - m), proj(x + m, y + 1 - m)];
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < 4; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath();
}
function resize() {
  const w = Math.min($("boardbox").clientWidth || 600, 820);
  tw = Math.max(22, Math.min(84, Math.floor(w / (W + (w < 600 ? 0.7 : 1.6)))));
  cell = tw;
  CW = w; ox = CW / 2; oy = Math.round(tw * 1.55);
  CH = Math.round(rowY(H) + tw * 1.05);
  const dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(CW * dpr); cv.height = Math.round(CH * dpr);
  cv.style.width = CW + "px"; cv.style.height = CH + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
// Chest height of a soldier standing on tile (x, y): where hits and numbers appear.
const chest = (x, y) => { const [cx, cy] = at(x, y); return [cx, cy - tw * 0.6 * rowScale(y + 0.5)]; };
function consumeFX() {
  for (const f of game ? game.drainFx() : []) {
    const [cx, cy] = chest(f.x, f.y), [bx, by] = at(f.x, f.y);
    if (f.kind === "hit") { floats.push({ x: cx, y: cy - 6, text: `−${f.n}`, color: "#fffaf0", life: 1 }); burst(cx, cy, "#fffaf0", 6); }
    if (f.kind === "hurt") { floats.push({ x: cx, y: cy - 10, text: `−${f.n}`, color: C.danger, life: 1.2 }); burst(cx, cy, C.danger, 10); shake = reduced() ? 0 : 6; hitStop = performance.now() + 70; }
    if (f.kind === "die") { hitStop = performance.now() + 50; burst(cx, cy, (TIN[f.color] || TIN.drone).coat, 14); burst(cx, cy, "#d6dbe3", 6); }
    if (f.kind === "fall") {
      burst(bx, by, "#7a6248", 16, true);
      const from = (f.id != null && visBefore[f.id]) || { x: f.x, y: f.y };
      if (f.type) fallers.push({ type: f.type, id: f.id, fx: from.x, fy: from.y, tx: f.x, ty: f.y, life: 0.6 });
      floats.push({ x: bx, y: by - tw * 0.2, text: "pit!", color: C.brass, life: 1 });
      hitStop = performance.now() + 60;
    }
    if (f.kind === "boom") { burst(cx, cy, "#ff9a3c", 26); burst(cx, cy, "#ffd27a", 14); shake = reduced() ? 0 : 9; hitStop = performance.now() + 90; }
    if (f.kind === "combo") { banners.push({ n: f.n, life: 1.6 }); shake = reduced() ? 0 : Math.max(shake, 5); hitStop = performance.now() + 110; }
    if (f.kind === "block") floats.push({ x: cx, y: cy - 10, text: "braced", color: C.good, life: 1 });
    if (f.kind === "quake") shake = reduced() ? 0 : 4;
    if (f.kind === "spawn") burst(bx, by, "#fffaf0", 8);
    if (f.kind === "trap") burst(bx, by, C.brass, 10, true);
    if (f.kind === "shot") { const b = chest(f.tx, f.ty); shots.push({ a: [cx, cy], b, life: 0.35 }); burst(cx, cy, "#ffd27a", 8); burst(b[0], b[1], "#fffaf0", 8); shake = reduced() ? 0 : Math.max(shake, 3); }
  }
}
function burst(x, y, color, n, inward) {
  if (reduced()) return;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = (inward ? -0.6 : 1) * (40 + Math.random() * 90);
    parts.push({ x: inward ? x + Math.cos(a) * cell * 0.45 : x, y: inward ? y + Math.sin(a) * cell * 0.3 : y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, life: 0.5 + Math.random() * 0.3, color });
  }
}

function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
function hexRgba(hex, a) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || "");
  return m ? `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})` : `rgba(0,0,0,${a})`;
}

// Tin soldiers. Contrarians are cast facing backwards; bosses are the big display pieces.
const TIN = {
  drone: { coat: "#b8322b", dark: "#8a2520", legs: "#f2eee4", plume: "#f2c14e" },
  contra: { coat: "#5d3fa6", dark: "#46307e", legs: "#2b2b3a", plume: "#c9b8ff", back: true, hat: "bicorne" },
  heavy: { coat: "#c4651f", dark: "#934a14", legs: "#f2eee4", plume: "#e8e2d2", bear: true, big: 1.15 },
  runner: { coat: "#a8326a", dark: "#7c234d", legs: "#e8e2d2", plume: "#f4f0e6", elite: true, stride: true, hat: "busby" },
  anchor: { coat: "#5b6577", dark: "#434b59", legs: "#3a3f4a", plume: "#f0c050", bear: true, big: 1.2, elite: true, block: true, hat: "helmet" },
  rifle: { coat: "#2b5a3a", dark: "#1d3d27", legs: "#1c2420", plume: "#a8e070", kneel: true, belts: "#141a16", hat: "jager" },
  colossus: { coat: "#c4651f", dark: "#934a14", legs: "#f2eee4", plume: "#f0c050", bear: true, big: 1.55, prop: "mace" },
  mirror: { coat: "#5d3fa6", dark: "#46307e", legs: "#2b2b3a", plume: "#e6e9f0", back: true, big: 1.5, prop: "glass", hat: "bicorne", hatBig: 1.35 },
  warden: { coat: "#24262d", dark: "#16171c", legs: "#3a3d46", plume: "#e2483d", bear: true, big: 1.5, prop: "lantern", facings: "#e9e4d8", hat: "spike" },
  cadet: { coat: "#2457a6", dark: "#1b4380", legs: "#f2eee4", plume: "#e0ac45" }
};
function tin(g, x, y, k, look, o) {
  o = o || {};
  k *= look.big || 1;
  // A kneeling rifleman sits 12 lower; a running hussar's legs swing apart.
  const LL = y - (look.block ? 13 : 6) * k, L = LL + (look.kneel ? 12 * k : 0), back = look.back;
  const R_ = (x0, y0, w, h, r, fill) => { g.fillStyle = fill; g.beginPath(); if (g.roundRect && r) g.roundRect(x0, y0, w, h, r); else g.rect(x0, y0, w, h); g.fill(); };
  const E_ = (cx, cy, rx, ry, fill) => { g.fillStyle = fill; g.beginPath(); g.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2); g.fill(); };
  g.save();
  // Rings: solid brass is yours alone; elites get a dashed silver ring, bosses a double ring (dark outside, bone inside).
  const ring = (rx, ry, color, w, dash) => { g.save(); g.strokeStyle = color; g.lineWidth = w; if (dash) g.setLineDash(dash); g.beginPath(); g.ellipse(x, y - 2 * k, rx, ry, 0, 0, Math.PI * 2); g.stroke(); g.restore(); };
  if (o.ring) { E_(x, y, 30 * k, 12 * k, hexRgba(o.ring, 0.3)); }
  E_(x + 6 * k, y + 3 * k, 21 * k, 8 * k, "rgba(0,0,0,0.3)");
  if (o.tilt) { g.translate(x, y); g.rotate(o.tilt); g.translate(-x, -y); }
  if (look.block) {
    // Rooted: a stone block with sandbags instead of a green base.
    R_(x - 19 * k, y - 8 * k, 38 * k, 11 * k, 1.5 * k, "#4b4f57"); R_(x - 19 * k, y - 14 * k, 38 * k, 7 * k, 1.5 * k, "#8a8f99");
    g.strokeStyle = "rgba(0,0,0,0.35)"; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 6 * k, y - 7 * k); g.lineTo(x - 6 * k, y + 3 * k); g.moveTo(x + 8 * k, y - 7 * k); g.lineTo(x + 8 * k, y + 3 * k); g.stroke();
    E_(x - 9 * k, y + 2 * k, 8 * k, 4 * k, "#c9b48a"); E_(x + 7 * k, y + 2.5 * k, 8 * k, 4 * k, "#bba67c");
  } else {
    E_(x, y, 17 * k, 7 * k, "#2f4229");
    R_(x - 17 * k, y - 4 * k, 34 * k, 4 * k, 0, "#2f4229");
    E_(x, y - 4 * k, 17 * k, 7 * k, "#55704a");
  }
  if (o.boss) { ring(24 * k, 10 * k, "#1d140e", 3.6 * k); ring(20.5 * k, 8.2 * k, "#efe6d2", 2 * k); }
  else if (o.elite) ring(22 * k, 9 * k, "#e4e8ef", 2.4 * k, [4 * k, 3 * k]);
  else if (o.ring) ring(21 * k, 8.6 * k, o.ring, 2.6 * k);
  if (o.mirror) { g.translate(x, 0); g.scale(-1, 1); g.translate(-x, 0); }
  if (look.kneel) {
    R_(x - 1 * k, LL - 17 * k, 12 * k, 6 * k, 2 * k, look.legs); R_(x + 6 * k, LL - 16 * k, 6 * k, 16 * k, 0, look.legs);
    R_(x + 5.5 * k, LL - 6 * k, 8 * k, 6 * k, 1.5 * k, "#15120f");
    R_(x - 7 * k, LL - 17 * k, 6 * k, 12 * k, 0, look.legs); R_(x - 18 * k, LL - 6 * k, 14 * k, 5 * k, 1.5 * k, look.legs);
    R_(x - 21 * k, LL - 7 * k, 5 * k, 6 * k, 1.5 * k, "#15120f");
  } else if (look.stride) {
    for (const [hx, a] of [[-4, 0.45], [4, -0.45]]) {
      g.save(); g.translate(x + hx * k, L - 26 * k); g.rotate(a);
      R_(-3 * k, 0, 6 * k, 26 * k, 0, look.legs); R_(-3.5 * k, 19 * k, 8 * k, 7 * k, 1.5 * k, "#15120f");
      g.restore();
    }
  } else {
    R_(x - 7 * k, L - 26 * k, 6 * k, 26 * k, 0, look.legs); R_(x + 1 * k, L - 26 * k, 6 * k, 26 * k, 0, look.legs);
    R_(x - 7.5 * k, L - 8 * k, 7 * k, 8 * k, 1.5 * k, "#15120f"); R_(x + 0.5 * k, L - 8 * k, 7 * k, 8 * k, 1.5 * k, "#15120f");
  }
  R_(x - 14 * k, L - 50 * k, 5 * k, 22 * k, 2.5 * k, look.dark); R_(x + 9 * k, L - 50 * k, 5 * k, 22 * k, 2.5 * k, look.dark);
  R_(x - 10 * k, L - 52 * k, 20 * k, 27 * k, 5 * k, look.coat);
  E_(x - 11.5 * k, L - 27 * k, 2.6 * k, 2.6 * k, "#f0c7a0"); E_(x + 11.5 * k, L - 27 * k, 2.6 * k, 2.6 * k, "#f0c7a0");
  if (back) {
    R_(x - 8 * k, L - 50 * k, 16 * k, 17 * k, 2.5 * k, "#efe2bf");
    R_(x - 8 * k, L - 44 * k, 16 * k, 2.4 * k, 0, "#8a6a46");
    E_(x, L - 51 * k, 9 * k, 3 * k, "#c9b48a");
  } else {
    g.strokeStyle = look.belts || "#f4f0e6"; g.lineWidth = 2.2 * k; g.beginPath();
    g.moveTo(x - 9 * k, L - 50 * k); g.lineTo(x + 9 * k, L - 31 * k); g.moveTo(x + 9 * k, L - 50 * k); g.lineTo(x - 9 * k, L - 31 * k); g.stroke();
    R_(x - 10 * k, L - 31 * k, 20 * k, 3 * k, 0, look.belts || "#f4f0e6");
    if (look.facings) { R_(x - 10 * k, L - 52 * k, 4 * k, 21 * k, 1 * k, look.facings); R_(x + 6 * k, L - 52 * k, 4 * k, 21 * k, 1 * k, look.facings); R_(x - 10 * k, L - 53 * k, 20 * k, 3 * k, 1 * k, look.facings); }
  }
  R_(x - 8 * k, L - 49 * k, 2 * k, 18 * k, 1 * k, "rgba(255,255,255,0.3)");
  if (o.drum) {
    R_(x - 10 * k, L - 36 * k, 20 * k, 12 * k, 0, "#efe2bf");
    g.strokeStyle = "#b8322b"; g.lineWidth = 1.4 * k; g.beginPath(); g.moveTo(x - 10 * k, L - 36 * k);
    for (let i = 1; i <= 4; i++) g.lineTo(x - 10 * k + i * 5 * k, L - (i % 2 ? 24 : 36) * k); g.stroke();
    R_(x - 10.5 * k, L - 37 * k, 21 * k, 2.4 * k, 0, "#e0ac45"); R_(x - 10.5 * k, L - 25.5 * k, 21 * k, 2.4 * k, 0, "#e0ac45");
  } else if (o.spade) {
    R_(x + 12 * k, L - 70 * k, 2.6 * k, 42 * k, 0, "#6a4524");
    g.fillStyle = "#c9ced6"; g.beginPath(); g.moveTo(x + 9 * k, L - 70 * k); g.lineTo(x + 17.6 * k, L - 70 * k); g.lineTo(x + 13.3 * k, L - 82 * k); g.closePath(); g.fill();
  } else if (look.prop === "mace") {
    R_(x + 12 * k, L - 84 * k, 2.6 * k, 58 * k, 0, "#3a2414");
    E_(x + 13.3 * k, L - 86 * k, 5 * k, 5 * k, "#e0ac45"); E_(x + 12 * k, L - 87.5 * k, 1.8 * k, 1.8 * k, "#fff3c4");
    g.strokeStyle = "#e0ac45"; g.lineWidth = 1.2 * k; g.beginPath(); for (let i = 0; i < 4; i++) { g.moveTo(x + 12 * k, L - (78 - i * 12) * k); g.lineTo(x + 14.6 * k, L - (72 - i * 12) * k); } g.stroke();
  } else if (look.prop === "glass") {
    R_(x + 12.5 * k, L - 52 * k, 2.4 * k, 22 * k, 1 * k, "#8a6a46");
    E_(x + 13.7 * k, L - 62 * k, 8 * k, 10 * k, "#e0ac45"); E_(x + 13.7 * k, L - 62 * k, 6 * k, 8 * k, "#d9e6f2");
    g.strokeStyle = "rgba(255,255,255,0.85)"; g.lineWidth = 1.4 * k; g.beginPath(); g.moveTo(x + 10 * k, L - 64 * k); g.lineTo(x + 14 * k, L - 68 * k); g.stroke();
  } else if (look.prop === "lantern") {
    R_(x + 13 * k, L - 50 * k, 1.6 * k, 10 * k, 0, "#2b2b2b");
    E_(x + 13.8 * k, L - 34 * k, 9 * k, 9 * k, "rgba(255,200,90,0.35)");
    R_(x + 9 * k, L - 41 * k, 9.6 * k, 12 * k, 1.5 * k, "#2b2b2b"); R_(x + 10.4 * k, L - 39.5 * k, 6.8 * k, 9 * k, 1 * k, "#ffd36a");
  } else if (look.kneel) {
    if (o.reloading) {
      // Reloading: rifle upright, butt on the knee, ramrod in the barrel.
      R_(x + 11 * k, L - 74 * k, 3 * k, 52 * k, 1 * k, "#6a4524"); R_(x + 10 * k, L - 26 * k, 5 * k, 7 * k, 1.5 * k, "#4e321a");
      g.strokeStyle = "#c9ced6"; g.lineWidth = 1.2 * k; g.beginPath(); g.moveTo(x + 15.5 * k, L - 84 * k); g.lineTo(x + 15.5 * k, L - 66 * k); g.stroke();
    } else {
      R_(x - 6 * k, L - 46 * k, 40 * k, 3.2 * k, 1 * k, "#6a4524"); R_(x - 9 * k, L - 47 * k, 7 * k, 6 * k, 1.5 * k, "#4e321a");
      R_(x + 34 * k, L - 45.5 * k, 9 * k, 2 * k, 0, "#c9ced6");
    }
  } else if (back) {
    // Arms reversed: the musket is carried muzzle down.
    R_(x + 12 * k, L - 52 * k, 2.6 * k, 48 * k, 0, "#6a4524"); R_(x + 11 * k, L - 54 * k, 4.6 * k, 7 * k, 1.5 * k, "#4e321a");
    g.strokeStyle = "#c9ced6"; g.lineWidth = 1.5 * k; g.beginPath(); g.moveTo(x + 13.3 * k, L - 4 * k); g.lineTo(x + 13.3 * k, L + 6 * k); g.stroke();
  } else {
    R_(x + 12 * k, L - 76 * k, 2.6 * k, 48 * k, 0, "#6a4524");
    g.strokeStyle = "#c9ced6"; g.lineWidth = 1.5 * k; g.beginPath(); g.moveTo(x + 13.3 * k, L - 76 * k); g.lineTo(x + 13.3 * k, L - 88 * k); g.stroke();
  }
  E_(x, L - 58 * k, 7.5 * k, 7.5 * k, "#f0c7a0");
  if (back) E_(x, L - 57 * k, 7.6 * k, 6 * k, "#3b2a1d");
  else {
    E_(x - 2.6 * k, L - 58.5 * k, 1.1 * k, 1.1 * k, "#1b1b1b"); E_(x + 2.6 * k, L - 58.5 * k, 1.1 * k, 1.1 * k, "#1b1b1b");
    E_(x - 4.3 * k, L - 55.5 * k, 1.8 * k, 1.8 * k, "rgba(226,128,111,0.6)"); E_(x + 4.3 * k, L - 55.5 * k, 1.8 * k, 1.8 * k, "rgba(226,128,111,0.6)");
  }
  // Hats: shako (the line and you), bearskin (heavies), bicorne worn sideways (contrarians), Jäger hat with a feather
  // (riflemen), busby with a hanging bag (hussars), crested helmet (anchors), spiked helmet (the Warden).
  const P_ = (pts, fill) => { g.fillStyle = fill; g.beginPath(); pts.forEach(([px, py], i) => i ? g.lineTo(x + px * k, L - py * k) : g.moveTo(x + px * k, L - py * k)); g.closePath(); g.fill(); };
  const hat = look.hat || (look.bear ? "bear" : "shako");
  if (hat === "bear") {
    E_(x, L - 73 * k, 10 * k, 13 * k, "#1b1714"); E_(x - 3 * k, L - 79 * k, 3 * k, 5 * k, "#3a332d");
    E_(x + 8 * k, L - 76 * k, 2.6 * k, 5 * k, look.plume);
  } else if (hat === "bicorne") {
    // Worn side to side: a wide black crescent with a white cockade, the outline nobody else has.
    const hb = look.hatBig || 1;
    P_([[-17, 63], [-12, 70], [-4, 74], [4, 74], [12, 70], [17, 63], [8, 66], [-8, 66]].map(([px, py]) => [px * hb, 63 + (py - 63) * hb]), "#18181b");
    E_(x, L - 69 * k, 2.6 * k, 2.6 * k, "#f4f0e6"); E_(x, L - 69 * k, 1.2 * k, 1.2 * k, look.coat);
    g.strokeStyle = "#e0ac45"; g.lineWidth = 1 * k; g.beginPath(); g.moveTo(x - 15 * k, L - 64 * k); g.quadraticCurveTo(x, L - 69 * k, x + 15 * k, L - 64 * k); g.stroke();
  } else if (hat === "jager") {
    // Low round hat with a brim and a long feather sweeping back.
    E_(x, L - 64 * k, 12 * k, 3 * k, "#141a16");
    R_(x - 6.5 * k, L - 75 * k, 13 * k, 11 * k, 4 * k, "#1d2a20");
    R_(x - 6.5 * k, L - 68 * k, 13 * k, 2 * k, 0, "#3b4a2a");
    g.strokeStyle = look.plume; g.lineWidth = 2.4 * k; g.lineCap = "round"; g.beginPath(); g.moveTo(x + 4 * k, L - 70 * k); g.quadraticCurveTo(x + 14 * k, L - 80 * k, x + 7 * k, L - 92 * k); g.stroke();
  } else if (hat === "busby") {
    // Fur busby, the coloured bag hanging off one side, a tall white plume.
    R_(x - 7.5 * k, L - 79 * k, 15 * k, 16 * k, 4 * k, "#3a2a1e");
    P_([[-7, 78], [-14, 74], [-15, 64], [-11, 64], [-9, 72]], look.coat);
    R_(x - 7.5 * k, L - 66 * k, 15 * k, 2.4 * k, 0, "#e0ac45");
    E_(x + 2 * k, L - 87 * k, 2.6 * k, 8 * k, look.plume);
  } else if (hat === "helmet") {
    // Steel helmet with a brass band and a black horsehair crest down the back.
    E_(x, L - 68 * k, 9 * k, 8.5 * k, "#9aa1ab"); E_(x - 3 * k, L - 71 * k, 3 * k, 3 * k, "#c9ced6");
    R_(x - 9 * k, L - 65 * k, 18 * k, 3 * k, 1 * k, "#e0ac45");
    g.strokeStyle = "#141414"; g.lineWidth = 4 * k; g.lineCap = "round"; g.beginPath(); g.moveTo(x + 2 * k, L - 78 * k); g.quadraticCurveTo(x - 8 * k, L - 80 * k, x - 12 * k, L - 62 * k); g.stroke();
  } else if (hat === "spike") {
    // Black spiked helmet with a brass plate; the plume stays as its red hackle.
    E_(x, L - 68 * k, 9.5 * k, 9 * k, "#141416");
    P_([[-1.6, 76], [1.6, 76], [0, 88]], "#c9ced6"); E_(x, L - 76.5 * k, 2.6 * k, 1.4 * k, "#c9ced6");
    if (!back) E_(x, L - 69 * k, 3.4 * k, 3.4 * k, "#e0ac45");
    E_(x + 8 * k, L - 72 * k, 2.4 * k, 4.5 * k, look.plume);
    R_(x - 9.5 * k, L - 63.5 * k, 19 * k, 2 * k, 1 * k, "#0e0e10");
  } else {
    R_(x - 7.5 * k, L - 80 * k, 15 * k, 17 * k, 1.5 * k, "#18181b");
    E_(x, L - 80 * k, 7.5 * k, 2.5 * k, "#2c2c33");
    E_(x, L - 84.5 * k, 3 * k, 4.5 * k, look.plume);
    if (!back) { E_(x, L - 63 * k, 9 * k, 2.4 * k, "#0e0e10"); E_(x, L - 71 * k, 2.6 * k, 2.6 * k, "#e0ac45"); }
  }
  g.restore();
  return L - 90 * k;
}
// Marks above a piece: health as a brass bar, blocked turns as red tally strokes beside the head, sleeping heavies.
function tinMarks(g, e, x, top, k) {
  const d = FOES[e.type], box = (x0, y0, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x0, y0, w, h, r); else g.rect(x0, y0, w, h); };
  if (e.max > 1) {
    const n = e.max, gap = 1.5 * k, w = Math.min(9 * k, 46 * k / n) - gap, h = Math.max(3, 4.5 * k), x0 = x - (n * (w + gap) - gap) / 2;
    g.fillStyle = "rgba(40,30,20,0.7)"; box(x0 - 1.5, top - 6 * k - 1.5, n * (w + gap) - gap + 3, h + 3, 2); g.fill();
    for (let i = 0; i < n; i++) { g.fillStyle = i < e.hp ? "#e0ac45" : "rgba(120,100,70,0.5)"; box(x0 + i * (w + gap), top - 6 * k, w, h, 1); g.fill(); }
  }
  if (e.blocked > 0 && !fixed(e) && !e.free && !d.chaser) {
    // One slot per blocked turn it takes to break free; the filled ones are red, so "one more" is plain.
    const n = game && game.hasO("steady") ? BREAK + 1 : BREAK;
    g.save(); g.lineWidth = Math.max(2, 3 * k); g.lineCap = "round";
    for (let i = 0; i < n; i++) {
      const tx = x - 20 * k - (n - 1 - i) * 6 * k;
      g.strokeStyle = i < e.blocked ? "#d63a2f" : "rgba(60,40,30,0.3)";
      g.beginPath(); g.moveTo(tx + 1.5 * k, top + 12 * k); g.lineTo(tx - 1.5 * k, top + 26 * k); g.stroke();
    }
    g.restore();
  }
  if (d.rifle) {
    const ready = e.load <= 0;
    g.font = `700 ${Math.round(17 * k)}px ${HAND}`; g.textAlign = "center"; g.textBaseline = "middle";
    g.lineWidth = 3; g.strokeStyle = "rgba(255,250,240,0.9)"; const tx = ready ? "aim!" : String(e.load);
    g.strokeText(tx, x + 20 * k, top + 6 * k); g.fillStyle = ready ? "#c0392b" : "#3a3a3a"; g.fillText(tx, x + 20 * k, top + 6 * k);
  }
  if (e.skip && d.slow && !d.march) { g.fillStyle = "#fffaf0"; g.font = `700 ${Math.round(16 * k)}px ${HAND}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("zz", x + 16 * k, top + 4 * k); }
}
const HAND = '"Caveat", "Segoe Print", cursive';
// Broken step: the piece tips off true and gets a red grease-pencil scribble.
function scribble(g, x, y, k, t) {
  g.save(); g.strokeStyle = "rgba(226,72,61,0.9)"; g.lineWidth = 2.2 * k; g.lineCap = "round";
  g.beginPath();
  for (let i = 0; i <= 28; i++) { const a = i / 28 * Math.PI * 4.2 + t * 2, r = 22 * k + Math.sin(i * 1.7) * 3 * k; const px = x + Math.cos(a) * r, py = y - 3 * k + Math.sin(a) * r * 0.4; i ? g.lineTo(px, py) : g.moveTo(px, py); }
  g.stroke(); g.restore();
}
function drawUnit(g, e, x, y, k, t) {
  const d = FOES[e.type], look = TIN[e.type] || TIN.drone;
  const free = e.free && !d.chaser;
  const tilt = free ? (reduced() ? -0.3 : -0.3 + Math.sin(t * 6 + e.id) * 0.06) : 0;
  // A chaser (the Warden) gets the scribble only on the turns it chases; on its march turns it looks like the line.
  if (free) scribble(g, x, y, k, t);
  const top = tin(g, x, y, k, look, { tilt, mirror: e.dir && e.dir[0] < 0, boss: d.boss, elite: d.elite, reloading: d.rifle && e.load > 0 });
  if (d.chaser && !(d.march && e.skip)) scribble(g, x, y, k * (look.big || 1) * 1.25, t);
  tinMarks(g, e, x, top, k);
}
// A brass chevron bobbing over your cadet; early in a fight (and all through the drill) it carries a "you" tag.
function drawYouMarker(g, x, top, k, t, label) {
  const bob = reduced() ? 0 : Math.sin(t * 4) * 3 * k * 4, s = Math.max(7, 26 * k), y = top - s * 0.9 + bob;
  g.save();
  g.fillStyle = "#f0c25e"; g.strokeStyle = "#5a3f12"; g.lineWidth = Math.max(1.5, s * 0.14); g.lineJoin = "round";
  g.beginPath(); g.moveTo(x - s * 0.6, y - s * 0.55); g.lineTo(x + s * 0.6, y - s * 0.55); g.lineTo(x, y + s * 0.2); g.closePath(); g.stroke(); g.fill();
  if (label) {
    g.font = `700 ${Math.round(Math.max(13, s * 0.95))}px ${HAND}`; g.textAlign = "center"; g.textBaseline = "alphabetic";
    g.lineWidth = Math.max(3, s * 0.22); g.strokeStyle = "#2b1d12"; g.strokeText("you", x, y - s * 0.75); g.fillStyle = "#ffe7a8"; g.fillText("you", x, y - s * 0.75);
  }
  g.restore();
}
function drawCadetTin(g, x, y, k, dir, braced) {
  return tin(g, x, y, k, TIN.cadet, { ring: braced ? C.good : "#e0ac45", mirror: dir && dir[0] < 0, drum: R.char === "drummer", spade: R.char === "sapper" });
}

// Each act's setting around the diorama, and the plinth's paint.
const SETTING = [
  { g1: "#d8c193", g2: "#d1b987", chalk: "#ffffff", rim: "#8a5a36", front: "#6b4428", shade: "#55351f", pitRim: "#5a4330" },
  { g1: "#b59b72", g2: "#ad936a", chalk: "#fff4dc", rim: "#4b2f1c", front: "#3b2416", shade: "#2c1a10", pitRim: "#3e2a1a" },
  { g1: "#7d8aa0", g2: "#76839a", chalk: "#eaf2ff", rim: "#3e3a48", front: "#2c2a36", shade: "#211f2a", pitRim: "#2f3340" }
];
function drawSetting(g, act, t) {
  const wallH = Math.max(oy * 0.95, CH * 0.16);
  if (act === 1) {
    g.fillStyle = "#e8d6b4"; g.fillRect(0, 0, CW, wallH);
    g.fillStyle = "rgba(224,202,161,0.75)"; for (let x = 0; x < CW; x += 44) g.fillRect(x, 0, 17, wallH);
    const wx = CW * 0.06, ww = Math.min(CW * 0.26, 200), wh = wallH * 0.78;
    g.fillStyle = "#f6efe2"; g.fillRect(wx - 8, 0, ww + 16, wh + 8);
    g.fillStyle = "#a9d3ee"; g.fillRect(wx, 0, ww, wh);
    g.fillStyle = "rgba(255,255,255,0.8)"; g.beginPath(); g.ellipse(wx + ww * 0.68, wh * 0.4, ww * 0.2, wh * 0.08, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#f6efe2"; g.fillRect(wx + ww / 2 - 4, 0, 8, wh); g.fillRect(wx, wh / 2 - 4, ww, 8);
    g.fillStyle = "#c9ad80"; g.fillRect(0, wallH - 12, CW, 12);
    g.fillStyle = "#b07a4c"; g.fillRect(0, wallH, CW, CH - wallH);
    g.strokeStyle = "rgba(148,100,60,0.6)"; g.lineWidth = 2;
    for (let i = 0; i < 8; i++) { const y = wallH + 10 + i * i * 6; if (y > CH) break; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(CW * 0.3, y - 5, CW * 0.6, y + 7, CW, y - 2); g.stroke(); }
  } else if (act === 2) {
    g.fillStyle = "#241a12"; g.fillRect(0, 0, CW, wallH);
    g.fillStyle = "#2e2218"; for (let x = 0; x < CW; x += 70) g.fillRect(x, 0, 3, wallH);
    g.fillStyle = "#2c4433"; g.fillRect(0, wallH, CW, CH - wallH);
    g.strokeStyle = "rgba(217,164,65,0.35)"; g.lineWidth = 1.5; g.strokeRect(10, wallH + 10, CW - 20, CH - wallH - 20);
    const lx = CW * 0.88, ly = wallH * 0.95;
    g.fillStyle = "#2f5a3a"; g.beginPath(); g.moveTo(lx - 46, ly); g.lineTo(lx - 24, ly - 40); g.lineTo(lx + 24, ly - 40); g.lineTo(lx + 46, ly); g.closePath(); g.fill();
    g.fillStyle = "#ffe2a0"; g.beginPath(); g.ellipse(lx, ly, 46, 7, 0, 0, Math.PI * 2); g.fill();
  } else {
    g.fillStyle = "#0d1322"; g.fillRect(0, 0, CW, wallH);
    g.fillStyle = "rgba(223,232,255,0.85)"; g.beginPath(); g.arc(CW * 0.84, wallH * 0.45, Math.min(26, wallH * 0.3), 0, Math.PI * 2); g.fill();
    g.fillStyle = "#3d2a1e"; g.fillRect(0, wallH, CW, CH - wallH);
    g.fillStyle = "#2a1c13"; for (let x = 0; x < CW; x += CW / 7) g.fillRect(x, wallH, 2, CH - wallH);
  }
}
function drawLight(g, act, t) {
  g.save();
  if (act === 1) {
    g.fillStyle = "rgba(255,243,200,0.16)"; g.beginPath();
    g.moveTo(CW * 0.06, 0); g.lineTo(CW * 0.32, 0); g.lineTo(CW * 0.95, CH); g.lineTo(CW * 0.3, CH); g.closePath(); g.fill();
  } else if (act === 2) {
    const fl = reduced() ? 0 : Math.sin(t * 7) * 0.01;
    const lg = g.createRadialGradient(CW * 0.8, oy, 0, CW * 0.8, oy, CW * 0.75);
    lg.addColorStop(0, `rgba(255,207,122,${0.3 + fl})`); lg.addColorStop(1, "rgba(255,207,122,0)");
    g.fillStyle = lg; g.fillRect(0, 0, CW, CH);
  } else {
    g.fillStyle = "rgba(43,74,138,0.16)"; g.fillRect(0, 0, CW, CH);
    const cx = CW * 0.92, cy = CH * 0.86, fl = reduced() ? 0 : Math.sin(t * 9) * 0.03 + Math.sin(t * 23) * 0.02;
    g.fillStyle = "#efe6d2"; g.fillRect(cx - 6, cy - 34, 12, 34);
    g.fillStyle = "#ffd36b"; g.beginPath(); g.ellipse(cx, cy - 44, 4.5, 10, 0, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = "lighter";
    const cg = g.createRadialGradient(cx, cy - 40, 0, cx, cy - 40, CW * 0.7);
    cg.addColorStop(0, `rgba(255,170,80,${0.26 + fl})`); cg.addColorStop(1, "rgba(255,170,80,0)");
    g.fillStyle = cg; g.fillRect(0, 0, CW, CH);
  }
  g.restore();
  const vg = g.createRadialGradient(CW / 2, CH / 2, Math.min(CW, CH) * 0.35, CW / 2, CH / 2, Math.max(CW, CH) * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, `rgba(${act === 1 ? "58,34,16" : "0,0,0"},${act === 1 ? 0.45 : act === 2 ? 0.6 : 0.7})`);
  g.fillStyle = vg; g.fillRect(0, 0, CW, CH);
}
function drawPlinth(g, S) {
  const e = 0.22, pd = tw * 0.42;
  const T0 = proj(-e, -e), T1 = proj(W + e, -e), B1 = proj(W + e, H + e), B0 = proj(-e, H + e);
  g.fillStyle = "rgba(0,0,0,0.3)"; g.beginPath(); g.ellipse(ox, B0[1] + pd * 0.9, (B1[0] - B0[0]) * 0.56, pd * 0.9, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = S.front; g.fillRect(B0[0], B0[1], B1[0] - B0[0], pd);
  g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(B0[0], B0[1] + pd - 4, B1[0] - B0[0], 4);
  g.fillStyle = S.rim; g.beginPath(); g.moveTo(T0[0], T0[1]); g.lineTo(T1[0], T1[1]); g.lineTo(B1[0], B1[1]); g.lineTo(B0[0], B0[1]); g.closePath(); g.fill();
  g.strokeStyle = "rgba(255,255,255,0.2)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(B0[0], B0[1] + 0.5); g.lineTo(B1[0], B1[1] + 0.5); g.stroke();
  // Brass name plate on the front.
  const name = ROOMS[R.fight.room].name.toUpperCase();
  g.font = `600 ${Math.max(9, Math.round(tw * 0.17))}px ${css("--f-mono")}`;
  const pw = g.measureText(name).width + tw * 0.5, ph = pd * 0.56;
  const grd = g.createLinearGradient(0, B0[1] + pd * 0.22, 0, B0[1] + pd * 0.22 + ph);
  grd.addColorStop(0, "#f0c25e"); grd.addColorStop(1, "#b7862a");
  g.fillStyle = grd; rr(ox - pw / 2, B0[1] + pd * 0.22, pw, ph, 3); g.fill();
  g.fillStyle = "#4a3510"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(name, ox, B0[1] + pd * 0.22 + ph / 2 + 1);
}
// Walls are toys from the act's room: alphabet blocks, stacked books, toy-box crates.
function drawWall(g, x, y, act, fade) {
  const m = 0.07, sc = rowScale(y + 1), h = tw * 0.62 * sc;
  const a = proj(x + m, y + m), b = proj(x + 1 - m, y + m), c = proj(x + 1 - m, y + 1 - m), d = proj(x + m, y + 1 - m);
  const n = tileNoise(x, y);
  g.save(); g.globalAlpha = fade ? 0.5 : 1;
  g.fillStyle = "rgba(0,0,0,0.28)"; g.beginPath(); g.moveTo(d[0] + 4, d[1] + 3); g.lineTo(c[0] + 8, c[1] + 3); g.lineTo(b[0] + 8, b[1]); g.lineTo(c[0], c[1]); g.closePath(); g.fill();
  const quad = (p, q, r, s, fill) => { g.fillStyle = fill; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.lineTo(r[0], r[1]); g.lineTo(s[0], s[1]); g.closePath(); g.fill(); };
  const up = p => [p[0], p[1] - h];
  const fw = c[0] - d[0];
  if (act === 1) {
    const cols = ["#b8433a", "#2f6aa8", "#3f8a4f", "#d9a441"], col = cols[n % 4];
    quad(d, c, up(c), up(d), col);
    quad(up(a), up(b), up(c), up(d), "#f3e3c0");
    const letter = "ABCDEFGHJKLMNOPRSTUVWXYZ"[(x * 7 + y * 13) % 24];
    g.fillStyle = "#f3e3c0"; g.font = `900 ${Math.round(h * 0.7)}px ${css("--f-display")}`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(letter, (d[0] + c[0]) / 2, d[1] - h / 2 + 1);
    g.save(); g.translate((a[0] + c[0]) / 2, (a[1] + c[1]) / 2 - h); g.scale(1, TILT);
    g.fillStyle = col; g.font = `900 ${Math.round(tw * 0.42 * sc)}px ${css("--f-display")}`; g.fillText("ABCDEFGHJKLMNOPRSTUVWXYZ"[(x * 5 + y * 3 + 4) % 24], 0, 2); g.restore();
  } else if (act === 2) {
    const spines = [["#7a2a2a", "#2f4a6b", "#5a6b2f"], ["#2f4a6b", "#8a6420", "#6b2f4a"], ["#3b5a3a", "#7a2a2a", "#2f4a6b"]][n % 3];
    for (let i = 0; i < 3; i++) {
      const y0 = d[1] - h * i / 3, y1 = d[1] - h * (i + 1) / 3, inset = (i % 2 ? 0.03 : -0.01) * fw;
      g.fillStyle = spines[i]; g.fillRect(d[0] + inset, y1, fw - inset * 2, y0 - y1);
      g.fillStyle = "rgba(240,194,94,0.6)"; g.fillRect(d[0] + inset + fw * 0.15, y1 + (y0 - y1) * 0.4, fw * 0.7 - inset * 2, Math.max(1, (y0 - y1) * 0.12));
    }
    quad(up(a), up(b), up(c), up(d), spines[2]);
    quad([up(a)[0] + fw * 0.05, up(a)[1] + 2], [up(b)[0] - fw * 0.05, up(b)[1] + 2], [up(c)[0] - fw * 0.05, up(c)[1] - 1], [up(d)[0] + fw * 0.05, up(d)[1] - 1], "#efe6cf");
  } else {
    quad(d, c, up(c), up(d), "#5d4027");
    quad(up(a), up(b), up(c), up(d), "#7d5a3a");
    g.strokeStyle = "rgba(0,0,0,0.35)"; g.lineWidth = 1.5;
    for (let i = 1; i < 3; i++) { g.beginPath(); g.moveTo(d[0], d[1] - h * i / 3); g.lineTo(c[0], c[1] - h * i / 3); g.stroke(); }
    g.strokeStyle = "#3a2716"; g.lineWidth = Math.max(2, tw * 0.05); g.beginPath(); g.moveTo(d[0] + 3, d[1] - 3); g.lineTo(c[0] - 3, c[1] - h + 3); g.stroke();
  }
  g.strokeStyle = "rgba(255,255,255,0.4)"; g.lineWidth = 1.2; g.beginPath(); const ud = up(d), uc = up(c); g.moveTo(ud[0], ud[1]); g.lineTo(uc[0], uc[1]); g.stroke();
  g.restore();
}
function drawKeg(g, x, y, k, t) {
  const w = 15 * k, h = 30 * k;
  g.fillStyle = "rgba(0,0,0,0.3)"; g.beginPath(); g.ellipse(x + 5 * k, y + 3 * k, 19 * k, 7 * k, 0, 0, Math.PI * 2); g.fill();
  const bg = g.createLinearGradient(x - w, 0, x + w, 0); bg.addColorStop(0, "#5a3416"); bg.addColorStop(0.45, "#a2652c"); bg.addColorStop(1, "#4a2a12");
  g.fillStyle = bg; g.fillRect(x - w, y - h, w * 2, h); g.beginPath(); g.ellipse(x, y, w, 5 * k, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#3b3b40"; for (const f of [0.22, 0.78]) g.fillRect(x - w, y - h * f - 1.5 * k, w * 2, 3 * k);
  g.fillStyle = "#e9dcb8"; g.fillRect(x - w * 0.62, y - h * 0.62, w * 1.24, h * 0.26);
  g.fillStyle = "#a3261f"; g.font = `600 ${Math.max(5, Math.round(5.4 * k))}px ${css("--f-mono")}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("POWDER", x, y - h * 0.49);
  g.fillStyle = "#946038"; g.beginPath(); g.ellipse(x, y - h, w, 5 * k, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "#2a2018"; g.lineWidth = 1.6 * k; g.beginPath(); g.moveTo(x + 3 * k, y - h); g.quadraticCurveTo(x + 7 * k, y - h - 8 * k, x + 12 * k, y - h - 9 * k); g.stroke();
  const flick = reduced() ? 1 : 0.7 + Math.sin(t * 17 + x) * 0.3;
  g.fillStyle = `rgba(255,211,107,${flick})`; g.beginPath(); g.arc(x + 12 * k, y - h - 9 * k, 3.4 * k, 0, Math.PI * 2); g.fill();
  g.fillStyle = `rgba(255,179,71,${0.35 * flick})`; g.beginPath(); g.arc(x + 12 * k, y - h - 9 * k, 7 * k, 0, Math.PI * 2); g.fill();
}
// Chalk arrows: what everyone will do if you make this move.
// The colours: a regimental flag on a brass pole; trampled, it lies in the dirt.
function drawFlag(g, x, y, k, t, up) {
  g.save();
  g.fillStyle = "rgba(0,0,0,0.25)"; g.beginPath(); g.ellipse(x + 4 * k, y + 2 * k, 14 * k, 5 * k, 0, 0, Math.PI * 2); g.fill();
  if (!up) { g.translate(x, y); g.rotate(1.25); g.translate(-x, -y); g.globalAlpha = 0.75; }
  g.fillStyle = "#c9a14a"; g.fillRect(x - 1.6 * k, y - 96 * k, 3.2 * k, 96 * k);
  g.beginPath(); g.arc(x, y - 98 * k, 4 * k, 0, Math.PI * 2); g.fill();
  const wave = up && !reduced() ? Math.sin(t * 3) * 3 * k : 0;
  const fy = y - 92 * k, fw = 40 * k, fh = 26 * k;
  g.fillStyle = "#b8322b"; g.beginPath(); g.moveTo(x + 1.6 * k, fy); g.quadraticCurveTo(x + fw / 2, fy + wave, x + fw, fy + wave * 0.5);
  g.lineTo(x + fw, fy + fh + wave * 0.5); g.quadraticCurveTo(x + fw / 2, fy + fh + wave, x + 1.6 * k, fy + fh); g.closePath(); g.fill();
  g.fillStyle = "#f4f0e6"; g.fillRect(x + 1.6 * k, fy + fh * 0.4, fw - 1.6 * k, fh * 0.2); g.fillRect(x + fw * 0.42, fy + wave * 0.7, fw * 0.16, fh);
  g.restore();
}
function chalkArrow(g, p0, p1, color, w, opts) {
  opts = opts || {};
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], len = Math.hypot(dx, dy); if (len < 2) return;
  const ux = dx / len, uy = dy / len;
  const s = [p0[0] + dx * 0.28, p0[1] + dy * 0.28], e = [p0[0] + dx * (opts.full ? 0.98 : 0.86), p0[1] + dy * (opts.full ? 0.98 : 0.86)];
  const ang = Math.atan2(e[1] - s[1], e[0] - s[0]), hl = Math.max(7, w * 3.2);
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  const path = () => {
    g.beginPath(); g.moveTo(s[0], s[1]);
    if (opts.wobble) { for (let i = 1; i <= 6; i++) { const t = i / 6, o = (i % 2 ? 1 : -1) * w * 1.6 * (i < 6 ? 1 : 0); g.lineTo(s[0] + (e[0] - s[0]) * t - uy * o, s[1] + (e[1] - s[1]) * t + ux * o); } }
    else g.quadraticCurveTo((s[0] + e[0]) / 2 - uy * w, (s[1] + e[1]) / 2 + ux * w, e[0], e[1]);
    g.moveTo(e[0] - hl * Math.cos(ang - 0.5), e[1] - hl * Math.sin(ang - 0.5)); g.lineTo(e[0], e[1]); g.lineTo(e[0] - hl * Math.cos(ang + 0.5), e[1] - hl * Math.sin(ang + 0.5));
  };
  path(); g.strokeStyle = "rgba(0,0,0,0.14)"; g.lineWidth = w + 3; g.stroke();
  if (opts.dash) g.setLineDash([w * 2.6, w * 1.6]);
  path(); g.strokeStyle = color; g.lineWidth = w; g.stroke();
  g.restore();
}
const tileNoise = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 7;

function draw(dt) {
  const F = R && R.fight; if (!F) return;
  consumeFX();
  const k = reduced() ? 1 : 1 - Math.pow(0.0005, dt);
  const target = id => id === "p" ? F.p : F.enemies.find(e => e.id === +id);
  const ms = performance.now(), now = ms / 1000, act = R.act, S = SETTING[act - 1];
  // Hit-stop freezes movement for a beat; the line ripples, leaders first.
  if (ms >= hitStop) for (const id of Object.keys(vis)) {
    const t = target(id), v = vis[id]; if (!t || (v.delay && ms < v.delay)) continue;
    v.x += (t.x - v.x) * k; v.y += (t.y - v.y) * k;
  }
  ctx.save();
  ctx.clearRect(0, 0, CW, CH);
  drawSetting(ctx, act, now);
  if (shake > 0.2) { ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake); shake *= Math.pow(0.002, dt); } else shake = 0;
  ctx.translate(nudge.x, nudge.y); nudge.x *= Math.pow(0.0005, dt); nudge.y *= Math.pow(0.0005, dt);
  drawPlinth(ctx, S);
  // The painted parade ground: two-tone squares, chalk grid, a chalk border.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { tilePath(ctx, x, y); ctx.fillStyle = (x + y) % 2 ? S.g1 : S.g2; ctx.fill(); }
  ctx.strokeStyle = hexRgba(S.chalk, 0.32); ctx.lineWidth = 1.1; ctx.beginPath();
  for (let i = 0; i <= W; i++) { const a = proj(i, 0), b = proj(i, H); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
  for (let i = 0; i <= H; i++) { const a = proj(0, i), b = proj(W, i); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
  ctx.stroke();
  { const bi = 0.12, q = [proj(bi, bi), proj(W - bi, bi), proj(W - bi, H - bi), proj(bi, H - bi)];
    ctx.strokeStyle = hexRgba(S.chalk, 0.55); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); for (let i = 1; i < 4; i++) ctx.lineTo(q[i][0], q[i][1]); ctx.closePath(); ctx.stroke(); }
  const R0 = ROOMS[F.room];
  // Hazards painted on the board: ice, spikes, conveyor belts.
  for (const [key, t] of Object.entries(R0.tiles)) {
    const [x, y] = key.split(",").map(Number);
    if (t === "ice") {
      tilePath(ctx, x, y, 0.03); ctx.fillStyle = "rgba(190,228,255,0.75)"; ctx.fill();
      ctx.save(); tileSpace(ctx, x, y); ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 0.04;
      ctx.beginPath(); ctx.moveTo(-0.32, 0.05); ctx.lineTo(-0.05, -0.25); ctx.moveTo(-0.1, 0.32); ctx.lineTo(0.3, -0.08); ctx.stroke(); ctx.restore();
    } else if (t === "spike") {
      tilePath(ctx, x, y, 0.08); ctx.fillStyle = "rgba(60,50,40,0.35)"; ctx.fill();
      for (const [ix, iy] of [[0.3, 0.3], [0.7, 0.3], [0.3, 0.72], [0.7, 0.72]]) {
        const [cx, cy] = proj(x + ix, y + iy), z = tw * 0.13 * rowScale(y + iy);
        ctx.fillStyle = "#cfd5df"; ctx.beginPath(); ctx.moveTo(cx, cy - z * 1.4); ctx.lineTo(cx + z * 0.6, cy); ctx.lineTo(cx - z * 0.6, cy); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.moveTo(cx, cy - z * 1.4); ctx.lineTo(cx + z * 0.6, cy); ctx.lineTo(cx, cy); ctx.closePath(); ctx.fill();
      }
    } else if (BELT[t]) {
      const [dx, dy] = BELT[t];
      tilePath(ctx, x, y, 0.02); ctx.fillStyle = "#3a3530"; ctx.fill();
      ctx.save(); tilePath(ctx, x, y, 0.02); ctx.clip(); tileSpace(ctx, x, y); ctx.rotate(Math.atan2(dy, dx));
      const off = reduced() ? 0 : (now * 0.8 % 1) * 0.4;
      ctx.strokeStyle = "rgba(240,194,94,0.8)"; ctx.lineWidth = 0.07; ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (let i = -2; i <= 2; i++) { const x0 = i * 0.4 + off; ctx.beginPath(); ctx.moveTo(x0 - 0.1, -0.18); ctx.lineTo(x0 + 0.06, 0); ctx.lineTo(x0 - 0.1, 0.18); ctx.stroke(); }
      ctx.restore();
    }
  }
  // Pits are holes cut in the board; trapdoors have a brass rim and a countdown.
  const pits = [...R0.pits].map(k2 => k2.split(",").map(Number)).concat(F.traps.map(t => [t.x, t.y, t.t]));
  for (const [x, y, tt] of pits) {
    const filled = tt == null && !game.roomPit(x, y);
    ctx.save(); tileSpace(ctx, x, y);
    if (filled) {
      ctx.fillStyle = "rgba(90,67,48,0.55)"; rr(-0.4, -0.4, 0.8, 0.8, 0.12); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 0.03; ctx.setLineDash([0.08, 0.08]); rr(-0.4, -0.4, 0.8, 0.8, 0.12); ctx.stroke();
      ctx.restore(); continue;
    }
    ctx.fillStyle = tt != null ? "#b7862a" : S.pitRim; rr(-0.45, -0.45, 0.9, 0.9, 0.12); ctx.fill();
    const hole = ctx.createLinearGradient(0, -0.4, 0, 0.4); hole.addColorStop(0, "#000"); hole.addColorStop(1, "#1d140d");
    ctx.fillStyle = hole; rr(-0.37, -0.37, 0.74, 0.74, 0.08); ctx.fill();
    const fill = tt == null && F.kind !== "boss" ? (F.pitFill[x + "," + y] || 0) : 0;
    for (let i = 0; i < fill; i++) { ctx.fillStyle = "#7a6248"; ctx.beginPath(); ctx.arc(-0.1 + i * 0.2, 0.1, 0.08, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    if (tt != null) { const [cx, cy] = at(x, y); ctx.fillStyle = "#f0c25e"; ctx.font = `700 ${Math.round(tw * 0.34)}px ${HAND}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(tt, cx, cy); }
  }
  // Chalk arrows for the move under the cursor: the room's step, yours in brass, broken ones in red.
  const pv = currentPreview();
  if (pv && pv.ok) {
    const after = new Map(pv.enemies.map(e => [e.id, e]));
    const aw = Math.max(2.2, tw * 0.055);
    for (const e of F.enemies) {
      const a = after.get(e.id);
      if (!a) {
        ctx.save(); tileSpace(ctx, e.x, e.y); ctx.strokeStyle = "#f2c14e"; ctx.lineWidth = 0.07; ctx.setLineDash([0.12, 0.06]);
        ctx.beginPath(); ctx.ellipse(0, 0, 0.46, 0.46, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        continue;
      }
      if (a.x === e.x && a.y === e.y) continue;
      chalkArrow(ctx, at(e.x, e.y), at(a.x, a.y), a.free ? "#e2483d" : hexRgba(S.chalk, 0.92), aw, { wobble: a.free });
    }
    if (pv.p.x !== F.p.x || pv.p.y !== F.p.y) chalkArrow(ctx, at(F.p.x, F.p.y), at(pv.p.x, pv.p.y), "#f4c25a", aw * 1.35);
    if (pv.dmg) { ctx.save(); tileSpace(ctx, pv.p.x, pv.p.y); ctx.strokeStyle = "#e2483d"; ctx.lineWidth = 0.07; ctx.beginPath(); ctx.ellipse(0, 0, 0.44, 0.44, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
  }
  // A loaded rifleman's lines of fire: red dashes along its row and column, up to the first wall.
  for (const e of F.enemies) {
    if (!foe(e).rifle || e.load > 0) continue;
    ctx.save(); ctx.strokeStyle = `rgba(226,72,61,${reduced() ? 0.75 : 0.62 + Math.sin(now * 6) * 0.18})`; ctx.lineWidth = Math.max(2, tw * 0.045); ctx.setLineDash([tw * 0.12, tw * 0.1]);
    for (const [sx, sy] of DIRS) {
      let x = e.x, y = e.y;
      for (;;) { const nx = x + sx, ny = y + sy; if (!game.inB(nx, ny) || (game.isWall(nx, ny) && !game.kegAt(nx, ny))) break; x = nx; y = ny; if (game.kegAt(x, y)) break; }
      if (x === e.x && y === e.y) continue;
      const a = at(e.x, e.y), b = at(x, y); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    ctx.restore();
  }
  // Your tile: a brass square with a slow pulse, so you can find yourself at a glance.
  const vp = vis.p || F.p;
  { const pulse = reduced() ? 0.5 : 0.5 + Math.sin(now * 3) * 0.5;
    ctx.save(); tileSpace(ctx, vp.x, vp.y);
    ctx.fillStyle = `rgba(214,148,30,${0.42 + pulse * 0.16})`; rr(-0.46, -0.46, 0.92, 0.92, 0.1); ctx.fill();
    ctx.strokeStyle = "rgba(90,55,10,0.8)"; ctx.lineWidth = 0.09; rr(-0.46, -0.46, 0.92, 0.92, 0.1); ctx.stroke();
    ctx.strokeStyle = `rgba(255,222,140,${0.75 + pulse * 0.25})`; ctx.lineWidth = 0.04; rr(-0.4, -0.4, 0.8, 0.8, 0.08); ctx.stroke();
    ctx.restore(); }
  // Pieces, back to front, so nearer rows stand in front of further ones.
  let youAt = null;
  const occupied = new Set(F.enemies.map(e => e.x + "," + e.y).concat([F.p.x + "," + F.p.y]));
  const items = [];
  for (const key of R0.walls) { const [x, y] = key.split(",").map(Number); items.push({ y, x, wall: true }); }
  for (const key of F.kegs) { const [x, y] = key.split(",").map(Number); items.push({ y, x, keg: true }); }
  for (const e of F.enemies) { const v = vis[e.id] || e; items.push({ y: v.y, x: v.x, e, v }); }
  items.push({ y: vp.y, x: vp.x, p: true, v: vp });
  if (F.goal && F.goal.flag && !F.goal.took) items.push({ y: F.goal.flag.y - 0.01, x: F.goal.flag.x, flag: true });
  items.sort((a, b) => a.y - b.y || a.x - b.x);
  for (const it of items) {
    if (it.wall) { drawWall(ctx, it.x, it.y, act, occupied.has(it.x + "," + (it.y - 1))); continue; }
    const sc = rowScale(it.y + 0.5), kk = tw / 104 * sc * PIECE;
    if (it.flag) { const [x, y] = at(it.x, it.y + 0.01); drawFlag(ctx, x, y, kk, now, F.goal.ok); continue; }
    if (it.keg) { const [x, y] = at(it.x, it.y); drawKeg(ctx, x, y, kk, now); continue; }
    let [x, y] = at(it.v.x, it.v.y);
    const tgt = it.p ? F.p : it.e, md = Math.hypot(tgt.x - it.v.x, tgt.y - it.v.y);
    ctx.save();
    // A little hop and squash as each piece marches.
    if (md > 0.03 && !reduced()) {
      const hop = Math.sin(Math.min(1, md) * Math.PI) * tw * 0.14 * sc, sq = Math.min(0.16, md * 0.3);
      ctx.translate(x, y); ctx.scale(1 - sq * 0.5, 1 + sq); ctx.translate(-x, -y); y -= hop;
    }
    if (it.p) youAt = [x, drawCadetTin(ctx, x, y, kk, F.pdir, F.brace), kk]; else drawUnit(ctx, it.e, x, y, kk, now);
    ctx.restore();
  }
  // Enemies toppling into pits: slide to the hole, then tip over and drop out of sight.
  for (const fl of fallers) {
    fl.life -= dt;
    const t = 1 - Math.max(0, fl.life) / 0.6, slide = Math.min(1, t * 3), sink = Math.max(0, (t - 0.3) / 0.7);
    const gx = fl.fx + (fl.tx - fl.fx) * slide, gy = fl.fy + (fl.ty - fl.fy) * slide;
    const [x, y] = at(gx, gy), kk = tw / 104 * rowScale(gy + 0.5) * PIECE;
    ctx.save(); ctx.globalAlpha = 1 - sink * 0.7;
    ctx.beginPath(); ctx.rect(0, 0, CW, y + 2 * kk); ctx.clip();
    tin(ctx, x, y + sink * tw * 0.9, kk * (1 - sink * 0.3), TIN[fl.type] || TIN.drone, { tilt: sink * 1.2 });
    ctx.restore();
  }
  fallers = fallers.filter(f => f.life > 0);
  ctx.restore();
  drawLight(ctx, act, now);
  if (youAt) drawYouMarker(ctx, youAt[0], youAt[1], youAt[2], now, F.turn < 3 || F.kind === "drill");
  // The preview's grease-pencil note, combo banners, particles and numbers sit above the light.
  if (pv && pv.ok) {
    const label = pv.dmg ? `−${pv.dmg}` : pv.chain >= 2 ? `${CHAIN[Math.min(pv.chain, 5)]}!` : pv.over === "win" ? "clears it" : "";
    if (label) {
      const [px, py] = chest(pv.p.x, pv.p.y);
      ctx.save(); ctx.translate(px, py - tw * 0.75); ctx.rotate(-0.06);
      ctx.font = `700 ${Math.round(tw * 0.42)}px ${HAND}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 4; ctx.strokeStyle = "rgba(255,250,240,0.85)"; ctx.strokeText(label, 0, 0);
      ctx.fillStyle = pv.dmg ? "#c0392b" : pv.chain >= 2 ? "#a3261f" : "#2f7a3e"; ctx.fillText(label, 0, 0);
      ctx.restore();
    }
  }
  for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.9; p.vy *= 0.9; p.life -= dt; ctx.globalAlpha = Math.max(0, p.life * 1.6); ctx.fillStyle = p.color; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); }
  parts = parts.filter(p => p.life > 0);
  for (const s of shots) {
    s.life -= dt; ctx.globalAlpha = Math.max(0, s.life / 0.35);
    ctx.strokeStyle = "#fff3c4"; ctx.lineWidth = Math.max(2, tw * 0.05); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(s.a[0], s.a[1]); ctx.lineTo(s.b[0], s.b[1]); ctx.stroke();
  }
  shots = shots.filter(s => s.life > 0);
  ctx.globalAlpha = 1;
  for (const f of floats) {
    f.y -= 28 * dt; f.life -= dt; ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
    ctx.font = `700 ${Math.round(tw * 0.4)}px ${HAND}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,0.55)"; ctx.strokeText(f.text, f.x, f.y); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
  }
  floats = floats.filter(f => f.life > 0);
  ctx.globalAlpha = 1;
  for (const b of banners) {
    b.life -= dt;
    const age = 1.6 - b.life, pop = reduced() ? 1 : age < 0.12 ? 0.5 + age / 0.12 * 0.75 : Math.max(1, 1.25 - (age - 0.12) * 1.5);
    const size = Math.min(tw * 1.1, CW / 7);
    ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, b.life * 2)); ctx.translate(CW / 2, CH * 0.4); ctx.rotate(-0.07); ctx.scale(pop, pop);
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    ctx.font = `700 ${Math.round(size)}px ${HAND}`;
    const text = CHAIN[Math.min(b.n, 5)] + "!";
    ctx.lineWidth = size * 0.16; ctx.strokeStyle = "rgba(255,250,240,0.92)"; ctx.strokeText(text, 0, 0);
    ctx.fillStyle = "#a3261f"; ctx.fillText(text, 0, 0);
    ctx.font = `700 ${Math.round(size * 0.42)}px ${HAND}`;
    const sub = `+${b.n * (b.n - 1)} gold · every card −1`;
    ctx.lineWidth = 5; ctx.strokeText(sub, 0, size * 0.7); ctx.fillStyle = "#4a2a12"; ctx.fillText(sub, 0, size * 0.7);
    ctx.restore();
  }
  banners = banners.filter(b => b.life > 0);
}
// Title art: a cadet steps back and forth and the line copies it; the contrarian mirrors.
const tcv = $("titleCv"), tctx = tcv.getContext("2d");
const MARCH = [0, 1, 2, 1, 0, -1, -2, -1];
function drawTitle(t) {
  const w = tcv.clientWidth; if (!w) return;
  const cols = 16, rows = 3, s = w / cols, top = s * 0.7, h = top + s * rows * 0.7 + s * 0.2, dpr = window.devicePixelRatio || 1;
  if (tcv.width !== Math.round(w * dpr)) { tcv.width = Math.round(w * dpr); tcv.height = Math.round(h * dpr); tcv.style.height = h + "px"; }
  tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  tctx.clearRect(0, 0, w, h);
  const S = SETTING[0], rowH = s * 0.7;
  tctx.fillStyle = S.rim; tctx.fillRect(0, top - 4, w, rowH * rows + 8);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { tctx.fillStyle = (x + y) % 2 ? S.g1 : S.g2; tctx.fillRect(x * s, top + y * rowH, s, rowH); }
  tctx.strokeStyle = "rgba(255,255,255,0.32)"; tctx.lineWidth = 1;
  for (let x = 1; x < cols; x++) { tctx.beginPath(); tctx.moveTo(x * s + 0.5, top); tctx.lineTo(x * s + 0.5, top + rowH * rows); tctx.stroke(); }
  for (let y = 1; y < rows; y++) { tctx.beginPath(); tctx.moveTo(0, top + y * rowH + 0.5); tctx.lineTo(w, top + y * rowH + 0.5); tctx.stroke(); }
  const beat = t / 0.8, i = Math.floor(beat), raw = beat - i, f = reduced() ? 0 : Math.min(1, raw * 3);
  const o0 = MARCH[i % 8], o1 = MARCH[(i + 1) % 8], e = f * f * (3 - 2 * f), off = o0 + (o1 - o0) * e, dir = [Math.sign(o1 - o0) || 1, 0];
  const hop = reduced() ? 0 : Math.sin(f * Math.PI) * s * 0.1, k = s / 104 * 0.95;
  const list = [[5, 0, "drone", off], [7, 0, "drone", off], [9, 0, "drone", off], [12, 1, "contra", -off], [3, 1, "cadet", off], [8, 2, "heavy", off], [10, 2, "drone", off]];
  for (const [x, y, type, o] of list) {
    const look = TIN[type], mirror = (type === "contra" ? -dir[0] : dir[0]) < 0;
    tin(tctx, (x + o + 0.5) * s, top + (y + 0.62) * rowH - hop, k, look, { mirror, ring: type === "cadet" ? "#e0ac45" : null, drum: type === "cadet" });
  }
  const vg = tctx.createLinearGradient(0, 0, w, 0);
  vg.addColorStop(0, hexRgba(C.bg, 0.9)); vg.addColorStop(0.12, hexRgba(C.bg, 0)); vg.addColorStop(0.88, hexRgba(C.bg, 0)); vg.addColorStop(1, hexRgba(C.bg, 0.9));
  tctx.fillStyle = vg; tctx.fillRect(0, 0, w, h);
}
function frame(t) {
  const dt = Math.min(0.05, (t - lastFrame) / 1000 || 0.016); lastFrame = t;
  if (!R && !$("sTitle").hidden && !document.hidden) drawTitle(t / 1000);
  if (R && R.screen === "fight" && !document.hidden) draw(dt);
  requestAnimationFrame(frame);
}

/* ---------- Preview cache ---------- */
let pvKey = "", pvVal = null;
function currentPreview() {
  const F = R && R.fight;
  if (!F || F.over || hoverDir == null) return null;
  const [dx, dy] = hoverDir, key = `${F.turn}|${armed}|${dx},${dy}|${R.hp}|${F.enemies.length}`;
  if (key === pvKey) return pvVal;
  pvKey = key;
  if (armed != null) {
    const slot = armed;
    if (game.cardBlock(slot, dx, dy)) { pvVal = null; return null; }
    pvVal = game.preview(g => g.play(slot, dx, dy));
  } else pvVal = game.preview(g => g.step(dx, dy));
  return pvVal;
}
