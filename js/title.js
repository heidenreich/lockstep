// Lockstep page: the title screen's animated strip (drawTitle), drawn each frame while the title is showing.

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
