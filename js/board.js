// Lockstep page: the fight screen and the diorama canvas (settings, plinth, walls, tin soldiers, marks, draw loop, title strip).

/* ---------- Fight screen & canvas ---------- */
let cell = 52, parts = [], floats = [], shake = 0, lastFrame = 0;
let visBefore = {}, fallers = [], banners = [], shots = [], hitStop = 0, nudge = { x: 0, y: 0 };
const cv = $("cv"), ctx = cv.getContext("2d");
function renderFight() {
  show("sFight");
  const F = R.fight;
  // The briefing and the coach share the top of the side column; the briefing goes first.
  if (renderBrief()) $("coach").hidden = true; else renderCoach();
  $("handPanel").classList.toggle("drilling", F.kind === "drill");
  $("hand").innerHTML = R.hand.map((c, i) => cardHTML(c, i, { inFight: true, armed: ui.armed === i })).join("") + (R.hand.length < R.slots ? `<div class="card empty">Empty slot</div>` : "");
  $("armNote").innerHTML = ui.armed != null ? `${esc(CARDS[R.hand[ui.armed].id].name)}: pick a direction<span class="armtx">. ${esc(cardText(R.hand[ui.armed]))}</span>` : "";
  const boss = F.enemies.find(e => foe(e).boss);
  const lines = [`<span>${esc(fightRoom(F).name)} · turn <b>${F.turn}</b></span>`];
  if (boss) lines.push(`<span>${esc(foe(boss).name)} <b>${boss.hp}/${boss.max}</b> · ${F.turn >= ENRAGE ? '<b style="color:var(--danger)">enraged</b>' : `enrages in <b>${ENRAGE - F.turn}</b>`}</span>`);
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
  if ((R.orders || []).length) lines.push(`<span class="ords">Perks: ${R.orders.map(id => `<b title="${esc(ORDERS[id].text)}">${esc(ORDERS[id].name)}</b>`).join(", ")}</span>`);
  if (boss && foe(boss).flips) lines.push(`<span${F.flip ? ' class="warn"' : ""}>${F.flip ? `Direction flipped: <b>${F.flip}</b> turns left` : `Direction flips in <b>${F.flipIn}</b>`}</span>`);
  $("fstatus").innerHTML = lines.join("");
  $("log").innerHTML = F.log.map(l => `<li>${esc(l.msg)}</li>`).join("");
  const ban = $("banner");
  ban.textContent = F.frenzy ? "Frenzy: everything is chasing you" : F.flip ? "Direction flipped" : "";
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
  for (const k of Object.keys(ui.vis)) if (k !== "p" && !ids.has(+k)) delete ui.vis[k];
  if (!ui.vis.p) ui.vis.p = { x: F.p.x, y: F.p.y };
  for (const e of F.enemies) if (!ui.vis[e.id]) ui.vis[e.id] = { x: e.x, y: e.y };
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
function drawCadetTin(g, x, y, k, dir, braced) {
  return tin(g, x, y, k, TIN.cadet, { ring: braced ? C.good : "#e0ac45", mirror: dir && dir[0] < 0, drum: R.char === "drummer", spade: R.char === "sapper" });
}

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
  const name = fightRoom(R.fight).name.toUpperCase();
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
  if (ms >= hitStop) for (const id of Object.keys(ui.vis)) {
    const t = target(id), v = ui.vis[id]; if (!t || (v.delay && ms < v.delay)) continue;
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
  const R0 = fightRoom(F);
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
  drawBriefHi(ctx, F, now);
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
  const vp = ui.vis.p || F.p;
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
  for (const e of F.enemies) { const v = ui.vis[e.id] || e; items.push({ y: v.y, x: v.x, e, v }); }
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
    if (it.p) youAt = [x, drawCadetTin(ctx, x, y, kk, F.pdir, F.brace), y, tw * sc]; else drawUnit(ctx, it.e, x, y, kk, now);
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
  if (youAt) drawYouBeside(ctx, youAt[0], youAt[1], youAt[2], youAt[3], now, F.turn < 3 || F.kind === "drill", F.p.x >= W - 2);
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
// Title art: the Recruit steps back and forth and the line copies it; the contrarian mirrors, the heavy moves every
// other beat, and the end drone marches into a pit, then fades back into its place as the loop restarts.
const tcv = $("titleCv"), tctx = tcv.getContext("2d");
const MARCH = [0, 1, 2, 1, 0, -1, -2, -1];
// The heavy only takes the steps on even beats, so it drifts out of line and back: 1, 1, 0, 0, -1, -1, 0, 0.
const MARCH_SLOW = [0, 1, 1, 0, 0, -1, -1, 0];
const TITLE_PIT = [10, 0];
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
  const slow = MARCH_SLOW[i % 8] + (MARCH_SLOW[(i + 1) % 8] - MARCH_SLOW[i % 8]) * e, b8 = i % 8;
  // The pit: a hole in the top row that the end drone reaches on the beat the cadet is furthest right.
  { const [px, py] = TITLE_PIT, x0 = px * s, y0 = top + py * rowH;
    tctx.fillStyle = S.pitRim; tctx.fillRect(x0 + s * 0.08, y0 + rowH * 0.1, s * 0.84, rowH * 0.8);
    tctx.fillStyle = "#0b0805"; tctx.fillRect(x0 + s * 0.16, y0 + rowH * 0.2, s * 0.68, rowH * 0.6); }
  // Your tile under the cadet, as in fights.
  { const cx = (3 + off) * s, cy = top + rowH; tctx.fillStyle = "rgba(214,148,30,0.55)"; tctx.fillRect(cx + 2, cy + 2, s - 4, rowH - 4);
    tctx.strokeStyle = "rgba(90,55,10,0.8)"; tctx.lineWidth = 2; tctx.strokeRect(cx + 2, cy + 2, s - 4, rowH - 4); }
  /** @type {[number, number, string, number, string?][]} x, y, type, beat offset, role */
  const list = [[4, 0, "drone", off], [6, 0, "drone", off], [8, 0, "drone", off, "faller"], [3, 1, "cadet", off], [13, 1, "contra", -off], [6, 2, "heavy", slow], [10, 2, "drone", off]];
  let youTop = null;
  for (const [x, y, type, o, role] of list) {
    let kk = k, dy = 0, alpha = 1;
    if (role === "faller") {
      // Beat 1 carries it onto the pit and it drops; it stays down until it climbs back in on the last beat.
      if (b8 === 1 && f > 0.5) { const d = (f - 0.5) / 0.5; kk = k * (1 - d * 0.7); dy = d * rowH * 0.35; alpha = 1 - d; }
      else if (b8 >= 2 && b8 <= 6) continue;
      else if (b8 === 7) alpha = f;
    }
    const look = TIN[type], mirror = (type === "contra" ? -dir[0] : dir[0]) < 0;
    const bob = type === "heavy" && Math.abs(MARCH_SLOW[(i + 1) % 8] - MARCH_SLOW[i % 8]) === 0 ? 0 : hop;
    tctx.save(); tctx.globalAlpha = alpha;
    const tp = tin(tctx, (x + o + 0.5) * s, top + (y + 0.62) * rowH - bob + dy, kk, look, { mirror, ring: type === "cadet" ? "#e0ac45" : null });
    tctx.restore();
    if (type === "cadet") youTop = [(x + o + 0.5) * s, tp];
    if (type === "heavy" && !bob && !reduced()) { tctx.fillStyle = "#fffaf0"; tctx.font = `700 ${Math.round(s * 0.28)}px ${HAND}`; tctx.textAlign = "center"; tctx.fillText("zz", (x + o + 0.85) * s, tp + s * 0.1); }
  }
  if (youTop) drawYouMarker(tctx, youTop[0], youTop[1], k, t, false);
  const vg = tctx.createLinearGradient(0, 0, w, 0);
  vg.addColorStop(0, hexRgba(C.bg, 0.9)); vg.addColorStop(0.12, hexRgba(C.bg, 0)); vg.addColorStop(0.88, hexRgba(C.bg, 0)); vg.addColorStop(1, hexRgba(C.bg, 0.9));
  tctx.fillStyle = vg; tctx.fillRect(0, 0, w, h);
}

/* ---------- Preview cache ---------- */
let pvVal = null;
function currentPreview() {
  const F = R && R.fight;
  if (!F || F.over || ui.hover == null) return null;
  const [dx, dy] = ui.hover, key = `${F.turn}|${ui.armed}|${dx},${dy}|${R.hp}|${F.enemies.length}`;
  if (key === ui.previewKey) return pvVal;
  ui.previewKey = key;
  if (ui.armed != null) {
    const slot = ui.armed;
    if (game.cardBlock(slot, dx, dy)) { pvVal = null; return null; }
    pvVal = game.preview(g => g.play(slot, dx, dy));
  } else pvVal = game.preview(g => g.step(dx, dy));
  return pvVal;
}

// Lights up what a briefing line is about, on the board (called from draw, before the pieces stand on it).
function drawBriefHi(g, F, now) {
  if (!ui.briefHi || !ui.briefOpen) return;
  const [kind, what] = ui.briefHi.split(":"), rm = fightRoom(F), a = reduced() ? 0.9 : 0.65 + Math.sin(now * 5) * 0.3;
  const mark = (x, y, round) => {
    g.save(); tileSpace(g, x, y); g.strokeStyle = `rgba(255,214,110,${a})`; g.lineWidth = 0.09; g.setLineDash([0.16, 0.08]);
    if (round) { g.beginPath(); g.ellipse(0, 0.05, 0.47, 0.47, 0, 0, Math.PI * 2); } else rr(-0.47, -0.47, 0.94, 0.94, 0.12);
    g.stroke(); g.fillStyle = `rgba(255,214,110,${a * 0.22})`; g.fill(); g.restore();
  };
  const keys = [];
  if (kind === "e") for (const e of F.enemies) { if (e.type === what) { const v = ui.vis[e.id] || e; mark(v.x, v.y, true); } }
  else if (what === "pit") keys.push(...rm.pits);
  else if (what === "wall") keys.push(...rm.walls);
  else if (what === "keg") keys.push(...F.kegs);
  else if (what === "flag" && F.goal && F.goal.flag) keys.push(F.goal.flag.x + "," + F.goal.flag.y);
  else for (const [k, t] of Object.entries(rm.tiles)) if (t === what || (what === "belt" && BELT[t])) keys.push(k);
  for (const k of keys) { const [x, y] = k.split(",").map(Number); mark(x, y, false); }
}
SCREENS.fight = renderFight;
