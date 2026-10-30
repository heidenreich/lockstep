// Lockstep page: the run map drawn as a toy board game: a painted parade ground in a wooden frame, marching tracks
// between painted spaces, your tin cadet on the space you're on and the act's boss waiting at the top.
// The SVG over it (screens.js renderMap) carries the clicks, keyboard focus and labels; this canvas only paints.

/* ---------- Map board ---------- */
const MAP_W = 420, MAP_H = 680;
// Space centres in the map's 420×680 board units: up to four columns (the ones in use are centred), rows 0-5
// bottom to top, the boss at the top centre and your starting square below row 0.
const mapShifts = new WeakMap();
function mapShift(m) {
  if (!m) return 0;
  if (!mapShifts.has(m)) {
    const cols = Object.values(m.nodes).filter(n => n.t !== "boss").map(n => n.c);
    mapShifts.set(m, 1.5 - (Math.min(...cols) + Math.max(...cols)) / 2);
  }
  return mapShifts.get(m);
}
const mapX = c => c === 1.5 ? MAP_W / 2 : 60 + (c + mapShift(R && R.map)) * 100, mapY = r => r === 6 ? 78 : 566 - r * 80;
const MAP_START = { x: 210, y: 622 };
const SPACE = {
  fight: { fill: "#b8433a", rim: "#7c2a24", ink: "#fff4e0" },
  elite: { fill: "#d9a441", rim: "#8f6519", ink: "#3a2608" },
  rest: { fill: "#3f8a4f", rim: "#245533", ink: "#f2f7e8" },
  shop: { fill: "#2f6aa8", rim: "#1c4370", ink: "#eef4ff" },
  event: { fill: "#efe6cf", rim: "#a8987a", ink: "#3a2a18" },
  boss: { fill: "#2a2730", rim: "#b8322b", ink: "#f0c25e" }
};
const mapCv = $("mapCv"), mctx = mapCv.getContext("2d");
const glyphPath = {};
const gp = t => glyphPath[t] || (glyphPath[t] = new Path2D(GLYPHS[t]));
// Where the board sits inside the SVG's box (the SVG keeps its aspect ratio, centred).
function mapFit() {
  const svg = $("mapSvg"), w = svg.clientWidth, h = svg.clientHeight, s = Math.min(w / MAP_W, h / MAP_H);
  return { w, h, s, ox: (w - MAP_W * s) / 2, oy: (h - MAP_H * s) / 2 };
}
// Spaces you can still reach from where you stand (all of them before the first room).
function mapReachable(m) {
  if (!R.pos) return new Set(Object.keys(m.nodes));
  const seen = new Set([R.pos]), q = [R.pos];
  while (q.length) { const k = q.shift(); for (const e of m.edges) { const [a, b] = e.split(">"); if (a === k && !seen.has(b)) { seen.add(b); q.push(b); } } }
  return seen;
}
const spaceName = t => NODE[t].label === "?" ? "Event" : NODE[t].label;
function drawMap(t) {
  if (!R || !R.map) return;
  const f = mapFit(); if (!f.w || !f.h) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1), cw = Math.round(f.w * dpr), ch = Math.round(f.h * dpr);
  if (mapCv.width !== cw || mapCv.height !== ch) { mapCv.width = cw; mapCv.height = ch; mapCv.style.width = f.w + "px"; mapCv.style.height = f.h + "px"; }
  const g = mctx, act = R.act, S = SETTING[act - 1], m = R.map, open = new Set(game.openNodes()), reach = mapReachable(m);
  g.setTransform(1, 0, 0, 1, 0, 0);
  drawMapTable(g, act, cw, ch, dpr);
  g.setTransform(dpr * f.s, 0, 0, dpr * f.s, dpr * f.ox, dpr * f.oy);
  // Toys from the act's room stand round the board when there's table to spare (wide screens).
  if (f.ox > 50 * f.s) drawMapProps(g, act, t);
  drawMapBoard(g, act, S);
  // Marching tracks: chalk dashes ahead (faint where you can't go any more), brass boot prints where you've been,
  // and the ways open to you march.
  const walked = new Set(R.walked), fromHere = new Set(m.edges.filter(e => R.pos && e.startsWith(R.pos + ">") && open.has(e.split(">")[1])));
  for (const e of m.edges) {
    const [a, b] = e.split(">"), na = m.nodes[a], nb = m.nodes[b];
    const kind = walked.has(e) ? "walked" : fromHere.has(e) ? "open" : reach.has(a) && reach.has(b) ? "ahead" : "dead";
    drawTrack(g, [mapX(na.c), mapY(na.r)], [mapX(nb.c), mapY(nb.r)], kind, t, S);
  }
  if (!R.pos) for (const k of open) { const n = m.nodes[k]; drawTrack(g, [MAP_START.x, MAP_START.y], [mapX(n.c), mapY(n.r)], "open", t, S); }
  if (R.walked.length || R.pos) { const first = R.walked.length ? R.walked[0].split(">")[0] : R.pos, n = m.nodes[first]; if (n) drawTrack(g, [MAP_START.x, MAP_START.y], [mapX(n.c), mapY(n.r)], "walked", t, S); }
  // The starting square: a brass-edged tile with "fall in" chalked along its front edge.
  g.save(); g.translate(MAP_START.x, MAP_START.y);
  g.fillStyle = "rgba(0,0,0,0.25)"; rrect(g, -32, -15, 64, 38, 5); g.fill();
  g.fillStyle = "#e0ac45"; rrect(g, -32, -18, 64, 38, 5); g.fill();
  g.fillStyle = S.g2; rrect(g, -28, -14, 56, 30, 3); g.fill();
  g.fillStyle = hexRgba("#3a2a18", 0.75); g.font = `700 12px ${HAND}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("fall in", 0, 9);
  g.restore();
  // Spaces, back (top) to front, so pieces standing on nearer spaces overlap the ones behind.
  const nodes = Object.entries(m.nodes).sort((a, b) => b[1].r - a[1].r);
  const visited = new Set(R.walked.map(e => e.split(">")[0]).concat(R.pos ? [R.pos] : []));
  for (const [k, n] of nodes) {
    const x = mapX(n.c), y = mapY(n.r), boss = n.t === "boss";
    drawSpace(g, x, y, n.t, { open: open.has(k), done: visited.has(k) && k !== R.pos, here: k === R.pos, dead: !reach.has(k) && !visited.has(k), boss }, t);
  }
  // The act's boss stands on its space with its name below; open spaces carry their name too.
  const bk = Object.keys(m.nodes).find(k => m.nodes[k].t === "boss"), bn = m.nodes[bk], bt = BOSSES[act - 1];
  tin(g, mapX(bn.c), mapY(bn.r) + 4, 0.5, TIN[bt], { ring: "#b8322b" });
  mapTag(g, mapX(bn.c), mapY(bn.r) + 42, "The " + FOES[bt].name, true);
  for (const k of open) { const n = m.nodes[k]; if (n.t !== "boss") mapTag(g, mapX(n.c), mapY(n.r) + 31, spaceName(n.t)); }
  // Your cadet stands at the back of your space (or on the starting square), with the board's brass "you".
  const here = R.pos ? m.nodes[R.pos] : null, hx = here ? mapX(here.c) : MAP_START.x, hy = here ? mapY(here.r) - 7 : MAP_START.y - 5;
  const bob = reduced() ? 0 : Math.abs(Math.sin(t * 2.4)) * 2.5;
  const top = tin(g, hx, hy - bob, 0.42, TIN.cadet, { ring: "#e0ac45", drum: R.char === "drummer", spade: R.char === "sapper" });
  drawYouBeside(g, hx, top, hy, 52, t, true, hx > 300);
}
// A small painted name tag under a space.
function mapTag(g, x, y, text, boss) {
  g.save(); g.font = `600 ${boss ? 10 : 9}px ${css("--f-mono")}`;
  const w = g.measureText(text.toUpperCase()).width + 12, h = boss ? 15 : 13;
  g.fillStyle = boss ? "#b8322b" : "rgba(43,29,18,0.82)"; rrect(g, x - w / 2, y - h / 2, w, h, 3); g.fill();
  g.fillStyle = boss ? "#fff4e0" : "#ffe7a8"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text.toUpperCase(), x, y + 0.5);
  g.restore();
}
// The tabletop the board sits on, in canvas pixels: nursery floorboards, the study's desk under a lamp, the toy box at night.
function drawMapTable(g, act, cw, ch, dpr) {
  g.fillStyle = TABLE[act - 1]; g.fillRect(0, 0, cw, ch);
  g.lineWidth = dpr;
  if (act === 1) {
    g.strokeStyle = "rgba(0,0,0,0.16)";
    for (let y = 34 * dpr; y < ch; y += 34 * dpr) { g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(cw * 0.3, y - 4 * dpr, cw * 0.6, y + 5 * dpr, cw, y - dpr); g.stroke(); }
  } else if (act === 2) {
    g.strokeStyle = "rgba(217,164,65,0.25)"; const m = 12 * dpr; g.strokeRect(m, m, cw - m * 2, ch - m * 2);
    const lg = g.createRadialGradient(cw * 0.92, ch * 0.05, 0, cw * 0.92, ch * 0.05, Math.max(cw, ch) * 0.8);
    lg.addColorStop(0, "rgba(255,200,120,0.28)"); lg.addColorStop(1, "rgba(255,200,120,0)"); g.fillStyle = lg; g.fillRect(0, 0, cw, ch);
  } else {
    g.strokeStyle = "rgba(0,0,0,0.3)";
    for (let x = cw / 7; x < cw; x += cw / 7) g.fillRect(x, 0, dpr * 1.5, ch);
  }
  const vg = g.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.3, cw / 2, ch / 2, Math.max(cw, ch) * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, `rgba(0,0,0,${act === 3 ? 0.55 : 0.3})`); g.fillStyle = vg; g.fillRect(0, 0, cw, ch);
}
// Toys from each act's room, standing on the table to either side of the board (board units, outside 0..420).
function drawMapProps(g, act, t) {
  const block = (x, y, s, col, letter) => {
    g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(x + 4, y + s * 0.2, s, s);
    g.fillStyle = col; g.fillRect(x, y, s, s); g.fillStyle = "#f3e3c0"; g.fillRect(x, y - s * 0.28, s, s * 0.28);
    g.font = `900 ${Math.round(s * 0.7)}px ${css("--f-display")}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(letter, x + s / 2, y + s / 2 + 1);
  };
  const books = (x, y) => {
    for (const [i, col] of ["#7a2a2a", "#2f4a6b", "#5a6b2f", "#8a6420"].entries()) {
      const w = 62 - i * 6, h = 13, yy = y - i * h;
      g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(x + 4, yy + 3, w, h);
      g.fillStyle = col; g.fillRect(x + (i % 2) * 4, yy, w, h); g.fillStyle = "#efe6cf"; g.fillRect(x + (i % 2) * 4 + w - 4, yy + 2, 3, h - 4);
      g.fillStyle = "rgba(240,194,94,0.6)"; g.fillRect(x + (i % 2) * 4 + 8, yy + h * 0.4, w * 0.5, 1.5);
    }
  };
  const crate = (x, y, s) => {
    g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(x + 5, y + 5, s, s);
    g.fillStyle = "#5d4027"; g.fillRect(x, y, s, s); g.strokeStyle = "#3a2716"; g.lineWidth = 3;
    g.strokeRect(x + 2, y + 2, s - 4, s - 4); g.beginPath(); g.moveTo(x + 4, y + s - 4); g.lineTo(x + s - 4, y + 4); g.stroke();
  };
  g.save();
  if (act === 1) { block(-70, 540, 40, "#b8433a", "A"); block(-58, 500, 30, "#2f6aa8", "B"); block(440, 90, 38, "#3f8a4f", "C"); }
  else if (act === 2) { books(442, 360); books(-82, 600); }
  else {
    crate(-78, 520, 56); crate(446, 70, 50);
    // A candle on the table, its flame flickering.
    const fl = reduced() ? 0 : Math.sin(t * 9) * 0.6 + Math.sin(t * 23) * 0.4;
    g.fillStyle = "#efe6d2"; g.fillRect(452, 560, 12, 40);
    g.fillStyle = "#ffd36b"; g.beginPath(); g.ellipse(458, 548 + fl, 5, 11, 0, 0, Math.PI * 2); g.fill();
    const cg = g.createRadialGradient(458, 550, 0, 458, 550, 120); cg.addColorStop(0, "rgba(255,170,80,0.3)"); cg.addColorStop(1, "rgba(255,170,80,0)");
    g.fillStyle = cg; g.fillRect(338, 430, 240, 240);
  }
  g.restore();
}
// The board: a wooden frame round a painted parade ground (two-tone squares, faint chalk grid, a chalk border) in the
// act's light, on a front face that carries the act's name on a brass plate, like the fight board's plinth.
function drawMapBoard(g, act, S) {
  const x0 = 14, y0 = 14, x1 = MAP_W - 14, y1 = MAP_H - 34, fr = 13, face = 18;
  g.fillStyle = "rgba(0,0,0,0.35)"; rrect(g, x0 + 6, y0 + 12, x1 - x0, y1 - y0 + face, 10); g.fill();
  g.fillStyle = S.front; rrect(g, x0, y1 - 10, x1 - x0, face + 10, 8); g.fill();
  g.fillStyle = "rgba(0,0,0,0.22)"; g.fillRect(x0 + 4, y1 + face - 4, x1 - x0 - 8, 3);
  g.fillStyle = S.rim; rrect(g, x0, y0, x1 - x0, y1 - y0, 10); g.fill();
  g.strokeStyle = "rgba(255,255,255,0.14)"; g.lineWidth = 1.5; rrect(g, x0 + 2, y0 + 2, x1 - x0 - 4, y1 - y0 - 4, 9); g.stroke();
  const ix = x0 + fr, iy = y0 + fr, iw = x1 - x0 - fr * 2, ih = y1 - y0 - fr * 2, sq = 26;
  g.save(); rrect(g, ix, iy, iw, ih, 4); g.clip();
  for (let y = 0; y * sq < ih; y++) for (let x = 0; x * sq < iw; x++) { g.fillStyle = (x + y) % 2 ? S.g1 : S.g2; g.fillRect(ix + x * sq, iy + y * sq, sq, sq); }
  g.strokeStyle = hexRgba(S.chalk, 0.18); g.lineWidth = 0.8; g.beginPath();
  for (let x = ix; x <= ix + iw; x += sq) { g.moveTo(x, iy); g.lineTo(x, iy + ih); }
  for (let y = iy; y <= iy + ih; y += sq) { g.moveTo(ix, y); g.lineTo(ix + iw, y); }
  g.stroke();
  // The act's light: a sunbeam across the nursery board, lamplight from the study's corner, night with moonlight on the boss.
  if (act === 1) {
    g.fillStyle = "rgba(255,243,200,0.18)"; g.beginPath(); g.moveTo(ix, iy); g.lineTo(ix + iw * 0.45, iy); g.lineTo(ix + iw, iy + ih * 0.75); g.lineTo(ix + iw, iy + ih); g.lineTo(ix + iw * 0.55, iy + ih); g.closePath(); g.fill();
  } else if (act === 2) {
    const lg = g.createRadialGradient(ix + iw, iy, 0, ix + iw, iy, ih * 0.9); lg.addColorStop(0, "rgba(255,200,120,0.3)"); lg.addColorStop(1, "rgba(255,200,120,0)");
    g.fillStyle = lg; g.fillRect(ix, iy, iw, ih);
    g.fillStyle = "rgba(20,12,6,0.14)"; g.fillRect(ix, iy, iw, ih);
  } else {
    g.fillStyle = "rgba(20,24,48,0.42)"; g.fillRect(ix, iy, iw, ih);
    const mg = g.createRadialGradient(MAP_W / 2, mapY(6), 0, MAP_W / 2, mapY(6), 170); mg.addColorStop(0, "rgba(210,225,255,0.28)"); mg.addColorStop(1, "rgba(210,225,255,0)");
    g.fillStyle = mg; g.fillRect(ix, iy, iw, ih);
  }
  const shade = g.createLinearGradient(0, iy, 0, iy + ih); shade.addColorStop(0, "rgba(0,0,0,0.12)"); shade.addColorStop(0.5, "rgba(0,0,0,0)"); shade.addColorStop(1, "rgba(0,0,0,0.1)");
  g.fillStyle = shade; g.fillRect(ix, iy, iw, ih);
  g.restore();
  g.strokeStyle = hexRgba(S.chalk, act === 3 ? 0.35 : 0.5); g.lineWidth = 2; rrect(g, ix + 6, iy + 6, iw - 12, ih - 12, 3); g.stroke();
  const name = `ACT ${act} · ${ACTS[act - 1].name.toUpperCase()}`;
  g.font = `600 10px ${css("--f-mono")}`;
  const pw = g.measureText(name).width + 22, ph = 13, px = MAP_W / 2 - pw / 2, py = y1 + (face - ph) / 2;
  const grd = g.createLinearGradient(0, py, 0, py + ph); grd.addColorStop(0, "#f0c25e"); grd.addColorStop(1, "#b7862a");
  g.fillStyle = grd; rrect(g, px, py, pw, ph, 3); g.fill();
  g.fillStyle = "#4a3510"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(name, MAP_W / 2, py + ph / 2 + 0.5);
}
// A marching track between two spaces. "ahead": chalk dashes; "dead": the same, faint (you can't get there any
// more); "open": brass dashes marching toward the space; "walked": a painted brass path with boot prints.
function drawTrack(g, a, b, kind, t, S) {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, cut = 24;
  const p0 = [a[0] + ux * cut, a[1] + uy * cut], p1 = [b[0] - ux * cut, b[1] - uy * cut];
  g.save(); g.lineCap = "round";
  if (kind === "walked") {
    g.strokeStyle = "rgba(201,154,60,0.85)"; g.lineWidth = 4; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
    g.fillStyle = "#5a3a12";
    for (let d = 7, i = 0; d < len - cut * 2; d += 13, i++) {
      const side = i % 2 ? 1 : -1, x = p0[0] + ux * d - uy * 4 * side, y = p0[1] + uy * d + ux * 4 * side;
      g.beginPath(); g.ellipse(x, y, 2.4, 3.6, Math.atan2(uy, ux) + Math.PI / 2, 0, Math.PI * 2); g.fill();
    }
  } else {
    const open = kind === "open", off = open && !reduced() ? (t * 18) % 12 : 0;
    g.strokeStyle = open ? "#e0ac45" : hexRgba(S.chalk, kind === "dead" ? 0.22 : 0.6); g.lineWidth = open ? 3.6 : 2.4;
    g.setLineDash(open ? [7, 5] : [2, 7]); g.lineDashOffset = -off;
    g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
  }
  g.restore();
}
// A board-game space: a painted disc on a thick rim, the room's mark painted on top. Open spaces lift and glow,
// spaces you can't reach any more are dulled, the ones you've stood on carry a chalk tick, and your own space
// leaves its mark under your cadet.
function drawSpace(g, x, y, type, o, t) {
  const st = SPACE[type], r = o.boss ? 28 : 19, lift = o.open && !reduced() ? 2 + Math.sin(t * 3.2 + x) * 1.2 : o.open ? 2 : 0;
  g.save();
  if (o.open) {
    const glow = reduced() ? 0.5 : 0.5 + Math.sin(t * 3.2) * 0.25;
    // A dark ring under the brass glow, so open spaces stand out on the pale act 1 board too.
    g.strokeStyle = "rgba(43,29,18,0.55)"; g.lineWidth = 6; g.beginPath(); g.arc(x, y, r + 7, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = `rgba(240,194,94,${0.55 + glow * 0.45})`; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r + 7, 0, Math.PI * 2); g.stroke();
  }
  g.fillStyle = "rgba(0,0,0,0.3)"; g.beginPath(); g.ellipse(x + 2, y + 6, r + 1, r * 0.85, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = st.rim; g.beginPath(); g.ellipse(x, y + 4 - lift, r, r * 0.92, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = st.fill; g.beginPath(); g.ellipse(x, y - lift, r, r * 0.92, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 1.2; g.beginPath(); g.ellipse(x, y - lift, r - 3, (r - 3) * 0.92, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
  if (type !== "boss" && !o.here) {
    const sc = r / 13;
    g.save(); g.translate(x - 10 * sc, y - lift - 10 * sc); g.scale(sc, sc);
    g.strokeStyle = st.ink; g.lineWidth = 2; g.lineCap = "round"; g.lineJoin = "round"; g.stroke(gp(type)); g.restore();
  }
  if (o.done || o.dead) { g.fillStyle = "rgba(40,28,16,0.55)"; g.beginPath(); g.ellipse(x, y - lift, r, r * 0.92, 0, 0, Math.PI * 2); g.fill(); }
  if (o.done) {
    g.strokeStyle = "rgba(255,250,235,0.9)"; g.lineWidth = 3; g.lineCap = "round"; g.lineJoin = "round";
    g.beginPath(); g.moveTo(x - 7, y - 1); g.lineTo(x - 2, y + 5); g.lineTo(x + 9, y - 8); g.stroke();
  }
  g.restore();
}

/* ---------- Map screen ---------- */
function renderMap() {
  show("sMap");
  const m = R.map, open = new Set(game.openNodes());
  $("mapTitle").textContent = `Act ${R.act} · ${ACTS[R.act - 1].name}`;
  // The board itself is painted on the canvas underneath (mapboard.js); the SVG carries clicks, focus and names.
  let svg = "";
  for (const [k, n] of Object.entries(m.nodes)) {
    if (!open.has(k)) continue;
    // The route only exists on the canvas, so the name says where each space leads.
    const r = n.t === "boss" ? 34 : 25, label = spaceName(n.t);
    const next = [...new Set(m.edges.filter(e => e.startsWith(k + ">")).map(e => spaceName(m.nodes[e.split(">")[1]].t)))];
    const name = n.t === "boss" ? `Boss: the ${FOES[BOSSES[R.act - 1]].name}` : `${label}${next.length ? `, then ${next.join(" or ")}` : ""}`;
    svg += `<g class="node open" data-node="${k}" tabindex="0" role="button" aria-label="${esc(name)}"><title>${label}: ${esc(NODE[n.t].text)}</title><circle cx="${mapX(n.c)}" cy="${mapY(n.r)}" r="${r}"/><circle class="ring" cx="${mapX(n.c)}" cy="${mapY(n.r)}" r="${r + 5}"/></g>`;
  }
  $("mapSvg").innerHTML = svg;
  drawMap(performance.now() / 1000);
  $("mapHand").innerHTML = R.hand.map((c, i) => cardHTML(c, i, { cls: "pick" })).join("") + (R.hand.length < R.slots ? `<div class="card empty">${R.slots - R.hand.length} empty slot${R.slots - R.hand.length === 1 ? "" : "s"}</div>` : "");
  $("mapOrders").innerHTML = (R.orders || []).length ? R.orders.map(orderChip).join("") : `<p class="note">None yet. Bosses and the shop hand them out.</p>`;
  $("legend").innerHTML = Object.entries(NODE).map(([t, n]) => `<div><svg viewBox="0 0 20 20" aria-hidden="true"><path class="glyph" d="${GLYPHS[t]}"/></svg><span><b>${n.label === "?" ? "Event" : n.label}</b> <span class="muted">${esc(n.text)}</span></span></div>`).join("");
}
SCREENS.map = renderMap;
