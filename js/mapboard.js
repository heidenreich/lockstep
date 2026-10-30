// Lockstep page: the run map drawn as a toy board game: a painted parade ground in a wooden frame, marching tracks
// between painted spaces, your tin cadet on the space you're on and the act's boss waiting at the top.
// The SVG over it (screens.js renderMap) carries the clicks, keyboard focus and labels; this canvas only paints.

/* ---------- Map board ---------- */
const MAP_W = 420, MAP_H = 660;
// Space centres in the map's 420×660 board units: four columns, rows 0-5 bottom to top, the boss at the top
// and your starting square below row 0.
const mapX = c => 60 + c * 100, mapY = r => r === 6 ? 72 : 562 - r * 80;
const MAP_START = { x: 210, y: 618 };
const SPACE = {
  fight: { fill: "#b8433a", rim: "#7c2a24", ink: "#fff4e0" },
  elite: { fill: "#d9a441", rim: "#8f6519", ink: "#3a2608" },
  rest: { fill: "#3f8a4f", rim: "#245533", ink: "#f2f7e8" },
  shop: { fill: "#2f6aa8", rim: "#1c4370", ink: "#eef4ff" },
  event: { fill: "#efe6cf", rim: "#a8987a", ink: "#3a2a18" },
  boss: { fill: "#2a2730", rim: "#b8322b", ink: "#f0c25e" }
};
const TABLE = ["#b07a4c", "#2c4433", "#3d2a1e"];
const mapCv = $("mapCv"), mctx = mapCv.getContext("2d");
const glyphPath = {};
const gp = t => glyphPath[t] || (glyphPath[t] = new Path2D(GLYPHS[t]));
// Where the board sits inside the SVG's box (the SVG keeps its aspect ratio, centred).
function mapFit() {
  const svg = $("mapSvg"), w = svg.clientWidth, h = svg.clientHeight, s = Math.min(w / MAP_W, h / MAP_H);
  return { w, h, s, ox: (w - MAP_W * s) / 2, oy: (h - MAP_H * s) / 2 };
}
function drawMap(t) {
  if (!R || !R.map) return;
  const f = mapFit(); if (!f.w || !f.h) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1), cw = Math.round(f.w * dpr), ch = Math.round(f.h * dpr);
  if (mapCv.width !== cw || mapCv.height !== ch) { mapCv.width = cw; mapCv.height = ch; mapCv.style.width = f.w + "px"; mapCv.style.height = f.h + "px"; }
  const g = mctx, act = R.act, S = SETTING[act - 1], m = R.map, open = new Set(game.openNodes());
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = TABLE[act - 1]; g.fillRect(0, 0, cw, ch);
  // The tabletop under the board: floorboards in the nursery and the toy box, a felt desk blotter in the study.
  g.strokeStyle = act === 2 ? "rgba(217,164,65,0.25)" : "rgba(0,0,0,0.16)"; g.lineWidth = dpr;
  if (act === 2) { const m = 12 * dpr; g.strokeRect(m, m, cw - m * 2, ch - m * 2); }
  else for (let y = 34 * dpr; y < ch; y += 34 * dpr) { g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(cw * 0.3, y - 4 * dpr, cw * 0.6, y + 5 * dpr, cw, y - dpr); g.stroke(); }
  g.setTransform(dpr * f.s, 0, 0, dpr * f.s, dpr * f.ox, dpr * f.oy);
  drawMapBoard(g, act, S);
  // Marching tracks: chalk dashes ahead, brass boot prints where you've been, and the ways open to you march.
  const walked = new Set(R.walked), fromHere = new Set(m.edges.filter(e => open.has(e.split(">")[1]) && (R.pos ? e.startsWith(R.pos + ">") : false)));
  for (const e of m.edges) {
    const [a, b] = e.split(">"), na = m.nodes[a], nb = m.nodes[b];
    drawTrack(g, [mapX(na.c), mapY(na.r)], [mapX(nb.c), mapY(nb.r)], walked.has(e) ? "walked" : fromHere.has(e) ? "open" : "ahead", t, S);
  }
  if (!R.pos) for (const k of open) { const n = m.nodes[k]; drawTrack(g, [MAP_START.x, MAP_START.y], [mapX(n.c), mapY(n.r)], "open", t, S); }
  if (R.walked.length || R.pos) { const first = R.walked.length ? R.walked[0].split(">")[0] : R.pos, n = m.nodes[first]; if (n) drawTrack(g, [MAP_START.x, MAP_START.y], [mapX(n.c), mapY(n.r)], "walked", t, S); }
  // The starting square: a brass-edged tile with "Fall in" chalked on it.
  g.save(); g.translate(MAP_START.x, MAP_START.y);
  g.fillStyle = "rgba(0,0,0,0.25)"; rrect(g, -30, -12, 60, 28, 5); g.fill();
  g.fillStyle = "#e0ac45"; rrect(g, -30, -15, 60, 28, 5); g.fill();
  g.fillStyle = hexRgba(S.g2, 1); rrect(g, -26, -11, 52, 20, 3); g.fill();
  g.fillStyle = hexRgba("#3a2a18", 0.7); g.font = `700 13px ${HAND}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("fall in", 0, -1);
  g.restore();
  // Spaces, back (top) to front, so pieces standing on nearer spaces overlap the ones behind.
  const nodes = Object.entries(m.nodes).sort((a, b) => b[1].r - a[1].r);
  const visited = new Set(R.walked.map(e => e.split(">")[0]).concat(R.pos ? [R.pos] : []));
  for (const [k, n] of nodes) {
    const x = mapX(n.c), y = mapY(n.r), boss = n.t === "boss";
    const passed = !visited.has(k) && !open.has(k) && R.pos && m.nodes[R.pos] && n.r <= m.nodes[R.pos].r;
    drawSpace(g, x, y, n.t, { open: open.has(k), done: visited.has(k) && k !== R.pos, passed, boss }, t);
  }
  // The act's boss stands on its space; your cadet stands on yours (or on the starting square).
  const bk = Object.keys(m.nodes).find(k => m.nodes[k].t === "boss"), bn = m.nodes[bk], bt = BOSSES[act - 1];
  tin(g, mapX(bn.c), mapY(bn.r) + 8, 0.46, TIN[bt], { ring: "#b8322b" });
  const here = R.pos ? m.nodes[R.pos] : null, hx = here ? mapX(here.c) : MAP_START.x, hy = here ? mapY(here.r) : MAP_START.y - 4;
  const bob = reduced() ? 0 : Math.abs(Math.sin(t * 2.4)) * 2.5;
  tin(g, hx, hy + 4 - bob, 0.34, TIN.cadet, { ring: "#e0ac45", drum: R.char === "drummer", spade: R.char === "sapper" });
  // A chalked "you" beside the cadet, like on the board.
  const left = hx > 300, label = left ? "you ▶" : "◀ you", lx = left ? hx - 16 : hx + 16;
  g.save(); g.font = `700 15px ${HAND}`; g.textAlign = left ? "right" : "left"; g.textBaseline = "middle"; g.lineWidth = 3.5; g.strokeStyle = "#2b1d12";
  g.strokeText(label, lx, hy - 18); g.fillStyle = "#ffe7a8"; g.fillText(label, lx, hy - 18); g.restore();
}
function rrect(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
// The board: a wooden frame round a painted parade ground (two-tone squares, faint chalk grid, a chalk border),
// with the act's name on a brass plate.
function drawMapBoard(g, act, S) {
  const x0 = 14, y0 = 14, x1 = MAP_W - 14, y1 = MAP_H - 14, fr = 13;
  g.fillStyle = "rgba(0,0,0,0.35)"; rrect(g, x0 + 5, y0 + 9, x1 - x0, y1 - y0, 10); g.fill();
  g.fillStyle = S.front; rrect(g, x0, y0 + 5, x1 - x0, y1 - y0, 10); g.fill();
  g.fillStyle = S.rim; rrect(g, x0, y0, x1 - x0, y1 - y0, 10); g.fill();
  g.strokeStyle = "rgba(255,255,255,0.14)"; g.lineWidth = 1.5; rrect(g, x0 + 2, y0 + 2, x1 - x0 - 4, y1 - y0 - 4, 9); g.stroke();
  const ix = x0 + fr, iy = y0 + fr, iw = x1 - x0 - fr * 2, ih = y1 - y0 - fr * 2, sq = 26;
  g.save(); rrect(g, ix, iy, iw, ih, 4); g.clip();
  for (let y = 0; y * sq < ih; y++) for (let x = 0; x * sq < iw; x++) { g.fillStyle = (x + y) % 2 ? S.g1 : S.g2; g.fillRect(ix + x * sq, iy + y * sq, sq, sq); }
  g.strokeStyle = hexRgba(S.chalk, 0.18); g.lineWidth = 0.8; g.beginPath();
  for (let x = ix; x <= ix + iw; x += sq) { g.moveTo(x, iy); g.lineTo(x, iy + ih); }
  for (let y = iy; y <= iy + ih; y += sq) { g.moveTo(ix, y); g.lineTo(ix + iw, y); }
  g.stroke();
  const shade = g.createLinearGradient(0, iy, 0, iy + ih); shade.addColorStop(0, "rgba(0,0,0,0.12)"); shade.addColorStop(0.5, "rgba(0,0,0,0)"); shade.addColorStop(1, "rgba(0,0,0,0.1)");
  g.fillStyle = shade; g.fillRect(ix, iy, iw, ih);
  g.restore();
  g.strokeStyle = hexRgba(S.chalk, 0.5); g.lineWidth = 2; rrect(g, ix + 6, iy + 6, iw - 12, ih - 12, 3); g.stroke();
  const name = `ACT ${act} · ${["THE PARADE GROUND", "THE BARRACKS", "THE CITADEL"][act - 1]}`;
  g.font = `600 10px ${css("--f-mono")}`;
  const pw = g.measureText(name).width + 22, ph = 15, px = MAP_W / 2 - pw / 2, py = y1 - fr + (fr - ph) / 2 + 1;
  const grd = g.createLinearGradient(0, py, 0, py + ph); grd.addColorStop(0, "#f0c25e"); grd.addColorStop(1, "#b7862a");
  g.fillStyle = grd; rrect(g, px, py, pw, ph, 3); g.fill();
  g.fillStyle = "#4a3510"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(name, MAP_W / 2, py + ph / 2 + 0.5);
}
// A marching track between two spaces. "ahead": chalk dashes; "open": brass dashes marching toward the space;
// "walked": a painted brass line with boot prints along it.
function drawTrack(g, a, b, kind, t, S) {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, cut = 24;
  const p0 = [a[0] + ux * cut, a[1] + uy * cut], p1 = [b[0] - ux * cut, b[1] - uy * cut];
  g.save(); g.lineCap = "round";
  if (kind === "walked") {
    g.strokeStyle = "rgba(176,122,40,0.55)"; g.lineWidth = 7; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
    g.fillStyle = "rgba(74,48,14,0.75)";
    for (let d = 6, i = 0; d < len - cut * 2; d += 11, i++) {
      const x = p0[0] + ux * d + (i % 2 ? 1 : -1) * -uy * 2.4, y = p0[1] + uy * d + (i % 2 ? 1 : -1) * ux * 2.4;
      g.beginPath(); g.ellipse(x, y, 1.9, 3, Math.atan2(uy, ux) + Math.PI / 2, 0, Math.PI * 2); g.fill();
    }
  } else {
    const open = kind === "open", off = open && !reduced() ? (t * 18) % 12 : 0;
    g.strokeStyle = open ? "#e0ac45" : hexRgba(S.chalk, 0.6); g.lineWidth = open ? 3.6 : 2.4;
    g.setLineDash(open ? [7, 5] : [2, 7]); g.lineDashOffset = -off;
    g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
  }
  g.restore();
}
// A board-game space: a painted disc on a thick rim, the room's mark painted on top. Open spaces lift and glow,
// spaces behind you are dulled, and the ones you've stood on carry a chalk tick.
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
  if (type !== "boss") {
    const sc = r / 13;
    g.save(); g.translate(x - 10 * sc, y - lift - 10 * sc); g.scale(sc, sc);
    g.strokeStyle = st.ink; g.lineWidth = 2; g.lineCap = "round"; g.lineJoin = "round"; g.stroke(gp(type)); g.restore();
  }
  if (o.done || o.passed) { g.fillStyle = "rgba(40,28,16,0.5)"; g.beginPath(); g.ellipse(x, y - lift, r, r * 0.92, 0, 0, Math.PI * 2); g.fill(); }
  if (o.done) {
    g.strokeStyle = "rgba(255,250,235,0.9)"; g.lineWidth = 3; g.lineCap = "round"; g.lineJoin = "round";
    g.beginPath(); g.moveTo(x - 7, y - 1); g.lineTo(x - 2, y + 5); g.lineTo(x + 9, y - 8); g.stroke();
  }
  g.restore();
}
