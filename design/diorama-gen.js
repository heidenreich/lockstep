// Generates the toy-soldier diorama artboards for the Lockstep mockup canvas.
const fs = require('fs');
const OUT = process.argv[2];
const F = n => +(+n).toFixed(1);

const N = 7;
const LAYOUT = {
  blocks: [[1, 1, 'A'], [0, 5, 'B'], [6, 6, 'C']],
  pits: [[6, 3], [6, 4]],
  kegs: [[4, 6]],
  units: [
    { kind: 'player', c: 3, r: 3, to: [4, 3] },
    { kind: 'drone', c: 5, r: 3, to: [6, 3], drop: true },
    { kind: 'drone', c: 5, r: 4, to: [6, 4], drop: true },
    { kind: 'drone', c: 5, r: 2, to: [6, 2] },
    { kind: 'drone', c: 2, r: 1, to: [3, 1] },
    { kind: 'contra', c: 2, r: 2, to: [1, 2] },
    { kind: 'contra', c: 3, r: 0, to: [2, 0] },
    { kind: 'heavy', c: 2, r: 5, to: [3, 5] },
    { kind: 'broken', c: 0, r: 3, to: [1, 3] },
  ],
};

const COL = {
  player: { coat: '#2457a6', dark: '#1b4380', legs: '#f2eee4', plume: '#e0ac45' },
  drone: { coat: '#b8322b', dark: '#8a2520', legs: '#f2eee4', plume: '#f2c14e' },
  broken: { coat: '#b8322b', dark: '#8a2520', legs: '#f2eee4', plume: '#f2c14e' },
  contra: { coat: '#5d3fa6', dark: '#46307e', legs: '#2b2b3a', plume: '#c9b8ff' },
  heavy: { coat: '#c4651f', dark: '#934a14', legs: '#f2eee4', plume: '#e8e2d2' },
};

function soldier(x, y, k, kind) {
  const c = COL[kind];
  if (kind === 'heavy') k *= 1.16;
  const back = kind === 'contra';
  const L = y - 6 * k;
  let g = '';
  if (kind === 'player') {
    g += `<ellipse cx="${F(x)}" cy="${F(y)}" rx="${F(30 * k)}" ry="${F(12 * k)}" fill="#f4c25a" opacity="0.35"/>`;
  }
  g += `<ellipse cx="${F(x + 6 * k)}" cy="${F(y + 3 * k)}" rx="${F(21 * k)}" ry="${F(8 * k)}" fill="#000" opacity="0.3"/>`;
  g += `<ellipse cx="${F(x)}" cy="${F(y)}" rx="${F(17 * k)}" ry="${F(7 * k)}" fill="#2f4229"/>`;
  g += `<rect x="${F(x - 17 * k)}" y="${F(y - 4 * k)}" width="${F(34 * k)}" height="${F(4 * k)}" fill="#2f4229"/>`;
  g += `<ellipse cx="${F(x)}" cy="${F(y - 4 * k)}" rx="${F(17 * k)}" ry="${F(7 * k)}" fill="#55704a"/>`;
  if (kind === 'player') {
    g += `<ellipse cx="${F(x)}" cy="${F(y - 2 * k)}" rx="${F(21 * k)}" ry="${F(8.6 * k)}" fill="none" stroke="#e0ac45" stroke-width="${F(2.6 * k)}"/>`;
  }
  // legs and boots
  g += `<rect x="${F(x - 7 * k)}" y="${F(L - 26 * k)}" width="${F(6 * k)}" height="${F(26 * k)}" fill="${c.legs}"/>`;
  g += `<rect x="${F(x + 1 * k)}" y="${F(L - 26 * k)}" width="${F(6 * k)}" height="${F(26 * k)}" fill="${c.legs}"/>`;
  g += `<rect x="${F(x - 7.5 * k)}" y="${F(L - 8 * k)}" width="${F(7 * k)}" height="${F(8 * k)}" rx="${F(1.5 * k)}" fill="#15120f"/>`;
  g += `<rect x="${F(x + 0.5 * k)}" y="${F(L - 8 * k)}" width="${F(7 * k)}" height="${F(8 * k)}" rx="${F(1.5 * k)}" fill="#15120f"/>`;
  // arms and tunic
  g += `<rect x="${F(x - 14 * k)}" y="${F(L - 50 * k)}" width="${F(5 * k)}" height="${F(22 * k)}" rx="${F(2.5 * k)}" fill="${c.dark}"/>`;
  g += `<rect x="${F(x + 9 * k)}" y="${F(L - 50 * k)}" width="${F(5 * k)}" height="${F(22 * k)}" rx="${F(2.5 * k)}" fill="${c.dark}"/>`;
  g += `<rect x="${F(x - 10 * k)}" y="${F(L - 52 * k)}" width="${F(20 * k)}" height="${F(27 * k)}" rx="${F(5 * k)}" fill="${c.coat}"/>`;
  g += `<circle cx="${F(x - 11.5 * k)}" cy="${F(L - 27 * k)}" r="${F(2.6 * k)}" fill="#f0c7a0"/>`;
  g += `<circle cx="${F(x + 11.5 * k)}" cy="${F(L - 27 * k)}" r="${F(2.6 * k)}" fill="#f0c7a0"/>`;
  if (back) {
    g += `<rect x="${F(x - 8 * k)}" y="${F(L - 50 * k)}" width="${F(16 * k)}" height="${F(17 * k)}" rx="${F(2.5 * k)}" fill="#6b4a2b"/>`;
    g += `<ellipse cx="${F(x)}" cy="${F(L - 51 * k)}" rx="${F(9 * k)}" ry="${F(3 * k)}" fill="#a39780"/>`;
  } else {
    g += `<path d="M${F(x - 9 * k)} ${F(L - 50 * k)}L${F(x + 9 * k)} ${F(L - 31 * k)}M${F(x + 9 * k)} ${F(L - 50 * k)}L${F(x - 9 * k)} ${F(L - 31 * k)}" stroke="#f4f0e6" stroke-width="${F(2.2 * k)}"/>`;
    g += `<rect x="${F(x - 10 * k)}" y="${F(L - 31 * k)}" width="${F(20 * k)}" height="${F(3 * k)}" fill="#f4f0e6"/>`;
  }
  g += `<rect x="${F(x - 8 * k)}" y="${F(L - 49 * k)}" width="${F(2 * k)}" height="${F(18 * k)}" rx="${F(1 * k)}" fill="#fff" opacity="0.3"/>`;
  if (kind === 'player') {
    g += `<rect x="${F(x - 10 * k)}" y="${F(L - 36 * k)}" width="${F(20 * k)}" height="${F(12 * k)}" fill="#efe2bf"/>`;
    g += `<path d="M${F(x - 10 * k)} ${F(L - 36 * k)}l${F(5 * k)} ${F(12 * k)}l${F(5 * k)} ${F(-12 * k)}l${F(5 * k)} ${F(12 * k)}l${F(5 * k)} ${F(-12 * k)}" fill="none" stroke="#b8322b" stroke-width="${F(1.4 * k)}"/>`;
    g += `<rect x="${F(x - 10.5 * k)}" y="${F(L - 37 * k)}" width="${F(21 * k)}" height="${F(2.4 * k)}" fill="#e0ac45"/>`;
    g += `<rect x="${F(x - 10.5 * k)}" y="${F(L - 25.5 * k)}" width="${F(21 * k)}" height="${F(2.4 * k)}" fill="#e0ac45"/>`;
  } else {
    g += `<rect x="${F(x + 12 * k)}" y="${F(L - 76 * k)}" width="${F(2.6 * k)}" height="${F(48 * k)}" fill="#6a4524"/>`;
    g += `<path d="M${F(x + 13.3 * k)} ${F(L - 76 * k)}V${F(L - 88 * k)}" stroke="#c9ced6" stroke-width="${F(1.5 * k)}"/>`;
  }
  // head
  g += `<circle cx="${F(x)}" cy="${F(L - 58 * k)}" r="${F(7.5 * k)}" fill="#f0c7a0"/>`;
  if (back) {
    g += `<ellipse cx="${F(x)}" cy="${F(L - 57 * k)}" rx="${F(7.6 * k)}" ry="${F(6 * k)}" fill="#3b2a1d"/>`;
  } else {
    g += `<circle cx="${F(x - 2.6 * k)}" cy="${F(L - 58.5 * k)}" r="${F(1.1 * k)}" fill="#1b1b1b"/>`;
    g += `<circle cx="${F(x + 2.6 * k)}" cy="${F(L - 58.5 * k)}" r="${F(1.1 * k)}" fill="#1b1b1b"/>`;
    g += `<circle cx="${F(x - 4.3 * k)}" cy="${F(L - 55.5 * k)}" r="${F(1.8 * k)}" fill="#e2806f" opacity="0.6"/>`;
    g += `<circle cx="${F(x + 4.3 * k)}" cy="${F(L - 55.5 * k)}" r="${F(1.8 * k)}" fill="#e2806f" opacity="0.6"/>`;
    if (kind === 'heavy') g += `<path d="M${F(x - 4 * k)} ${F(L - 54 * k)}q${F(4 * k)} ${F(-2.4 * k)} ${F(8 * k)} 0" fill="none" stroke="#3b2a1d" stroke-width="${F(1.6 * k)}"/>`;
  }
  // hat
  if (kind === 'heavy') {
    g += `<ellipse cx="${F(x)}" cy="${F(L - 73 * k)}" rx="${F(10 * k)}" ry="${F(13 * k)}" fill="#1b1714"/>`;
    g += `<ellipse cx="${F(x - 3 * k)}" cy="${F(L - 79 * k)}" rx="${F(3 * k)}" ry="${F(5 * k)}" fill="#3a332d"/>`;
    g += `<ellipse cx="${F(x + 8 * k)}" cy="${F(L - 76 * k)}" rx="${F(2.6 * k)}" ry="${F(5 * k)}" fill="${c.plume}"/>`;
  } else {
    g += `<rect x="${F(x - 7.5 * k)}" y="${F(L - 80 * k)}" width="${F(15 * k)}" height="${F(17 * k)}" rx="${F(1.5 * k)}" fill="#18181b"/>`;
    g += `<ellipse cx="${F(x)}" cy="${F(L - 80 * k)}" rx="${F(7.5 * k)}" ry="${F(2.5 * k)}" fill="#2c2c33"/>`;
    g += `<ellipse cx="${F(x)}" cy="${F(L - 84.5 * k)}" rx="${F(3 * k)}" ry="${F(4.5 * k)}" fill="${c.plume}"/>`;
    if (!back) {
      g += `<ellipse cx="${F(x)}" cy="${F(L - 63 * k)}" rx="${F(9 * k)}" ry="${F(2.4 * k)}" fill="#0e0e10"/>`;
      g += `<circle cx="${F(x)}" cy="${F(L - 71 * k)}" r="${F(2.6 * k)}" fill="#e0ac45"/>`;
    }
  }
  if (kind === 'broken') {
    g = `<g transform="rotate(-24 ${F(x)} ${F(y)})">${g}</g>`;
    g += `<path d="M${F(x - 26 * k)} ${F(y - 30 * k)}c${F(-8 * k)} ${F(-40 * k)} ${F(44 * k)} ${F(-62 * k)} ${F(50 * k)} ${F(-22 * k)}c${F(6 * k)} ${F(34 * k)} ${F(-46 * k)} ${F(44 * k)} ${F(-50 * k)} ${F(16 * k)}c${F(-3 * k)} ${F(-24 * k)} ${F(38 * k)} ${F(-40 * k)} ${F(46 * k)} ${F(-14 * k)}" fill="none" stroke="#e2483d" stroke-width="${F(2.4 * k)}" stroke-linecap="round" opacity="0.9"/>`;
  }
  return g;
}

function scene(o) {
  const { ox, oy, tw, pal } = o;
  const th = tw / 2;
  const k = tw / 104 * (o.k || 1);
  const P = (c, r) => [ox + (c - r) * tw / 2, oy + (c + r) * th / 2];
  const C = (c, r) => P(c + 0.5, r + 0.5);
  const poly = pts => pts.map(p => `${F(p[0])},${F(p[1])}`).join(' ');
  const tile = (c, r, m = 0) => poly([P(c + m, r + m), P(c + 1 - m, r + m), P(c + 1 - m, r + 1 - m), P(c + m, r + 1 - m)]);
  let s = '';
  // plinth
  const e = 0.28, D = tw * 0.5;
  const T = P(-e, -e), R = P(N + e, -e), B = P(N + e, N + e), Lv = P(-e, N + e);
  s += `<ellipse cx="${F(ox + tw * 0.3)}" cy="${F((T[1] + B[1]) / 2 + D * 0.9)}" rx="${F((R[0] - Lv[0]) * 0.5)}" ry="${F((B[1] - T[1]) * 0.5)}" fill="#000" opacity="0.22"/>`;
  s += `<polygon points="${poly([Lv, B, [B[0], B[1] + D], [Lv[0], Lv[1] + D]])}" fill="${pal.plinthL}"/>`;
  s += `<polygon points="${poly([B, R, [R[0], R[1] + D], [B[0], B[1] + D]])}" fill="${pal.plinthR}"/>`;
  s += `<polygon points="${poly([T, R, B, Lv])}" fill="${pal.rim}"/>`;
  s += `<path d="M${F(Lv[0])} ${F(Lv[1] + 1)}L${F(B[0])} ${F(B[1] + 1)}L${F(R[0])} ${F(R[1] + 1)}" fill="none" stroke="#fff" stroke-opacity="0.18" stroke-width="1.5"/>`;
  if (o.plate) {
    const a = 0.3, b = 0.7;
    const p1 = [B[0] + (R[0] - B[0]) * a, B[1] + (R[1] - B[1]) * a];
    const p2 = [B[0] + (R[0] - B[0]) * b, B[1] + (R[1] - B[1]) * b];
    s += `<polygon points="${poly([[p1[0], p1[1] + D * 0.22], [p2[0], p2[1] + D * 0.22], [p2[0], p2[1] + D * 0.74], [p1[0], p1[1] + D * 0.74]])}" fill="#d9a441" stroke="#8a6420" stroke-width="1.2"/>`;
    const mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2 + D * 0.48;
    s += `<text transform="matrix(1,-0.5,0,1,${F(mx)},${F(my)})" text-anchor="middle" dominant-baseline="middle" font-family="IBM Plex Mono, monospace" font-weight="600" font-size="${F(tw * 0.1)}" letter-spacing="1.5" fill="#4a3510">${o.plate}</text>`;
  }
  // ground tiles + chalk grid
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    s += `<polygon points="${tile(c, r)}" fill="${(c + r) % 2 ? pal.g1 : pal.g2}"/>`;
  }
  let grid = '';
  for (let i = 0; i <= N; i++) {
    const a = P(i, 0), b = P(i, N), c2 = P(0, i), d = P(N, i);
    grid += `M${F(a[0])} ${F(a[1])}L${F(b[0])} ${F(b[1])}M${F(c2[0])} ${F(c2[1])}L${F(d[0])} ${F(d[1])}`;
  }
  s += `<path d="${grid}" stroke="${pal.chalk}" stroke-opacity="0.32" stroke-width="1.1" fill="none"/>`;
  const bi = 0.12;
  s += `<polygon points="${poly([P(bi, bi), P(N - bi, bi), P(N - bi, N - bi), P(bi, N - bi)])}" fill="none" stroke="${pal.chalk}" stroke-opacity="0.55" stroke-width="2.2"/>`;
  if (o.light) s += o.light(P);
  // pits
  for (const [c, r] of LAYOUT.pits) {
    s += `<polygon points="${tile(c, r, 0.06)}" fill="#5a4330"/>`;
    s += `<polygon points="${tile(c, r, 0.12)}" fill="#120c08"/>`;
    const q = P(c + 0.12, r + 0.12), q2 = P(c + 0.88, r + 0.12);
    s += `<path d="M${F(q[0])} ${F(q[1] + 2)}L${F(q2[0])} ${F(q2[1] + 2)}" stroke="#3a2a1d" stroke-width="${F(tw * 0.06)}" opacity="0.8"/>`;
  }
  // arrows (on the ground, under the pieces)
  if (o.arrows) {
    for (const u of LAYOUT.units) {
      const p0 = C(u.c, u.r), p1 = C(u.to[0], u.to[1]);
      s += arrow(p0, p1, u, k);
    }
    const a = C(6, 3), b = C(6, 4);
    s += `<ellipse cx="${F((a[0] + b[0]) / 2)}" cy="${F((a[1] + b[1]) / 2)}" rx="${F(tw * 0.82)}" ry="${F(tw * 0.42)}" transform="rotate(-24 ${F((a[0] + b[0]) / 2)} ${F((a[1] + b[1]) / 2)})" fill="none" stroke="#f2c14e" stroke-width="${F(3 * k)}" stroke-dasharray="${F(14 * k)} ${F(6 * k)}" opacity="0.95"/>`;
  }
  // pieces, back to front
  const items = [];
  for (const [c, r, ch] of LAYOUT.blocks) items.push({ c, r, draw: () => block(c, r, ch) });
  for (const [c, r] of LAYOUT.kegs) items.push({ c, r, draw: () => keg(...C(c, r), k) });
  for (const u of LAYOUT.units) items.push({ c: u.c, r: u.r, draw: () => soldier(...C(u.c, u.r), k, u.kind) });
  items.sort((p, q) => (p.c + p.r) - (q.c + q.r) || p.c - q.c);
  for (const it of items) s += it.draw();
  return s;

  function block(c, r, ch) {
    const m = 0.1, h = tw * 0.42;
    const t0 = P(c + m, r + m), t1 = P(c + 1 - m, r + m), t2 = P(c + 1 - m, r + 1 - m), t3 = P(c + m, r + 1 - m);
    const up = p => [p[0], p[1] - h];
    let g = `<polygon points="${poly([t3, t2, up(t2), up(t3)])}" fill="#b8433a"/>`;
    g += `<polygon points="${poly([t2, t1, up(t1), up(t2)])}" fill="#2f6aa8"/>`;
    g += `<polygon points="${poly([up(t0), up(t1), up(t2), up(t3)])}" fill="#f3e3c0"/>`;
    const tc = C(c, r);
    g += `<text transform="translate(${F(tc[0])} ${F(tc[1] - h)}) scale(1 0.5) rotate(45)" text-anchor="middle" dominant-baseline="central" font-family="Big Shoulders Display, sans-serif" font-weight="900" font-size="${F(tw * 0.42)}" fill="#2f6aa8">${ch}</text>`;
    const mR = [(t1[0] + t2[0]) / 2, (t1[1] + t2[1]) / 2 - h / 2];
    g += `<text transform="matrix(1,-0.5,0,1,${F(mR[0])},${F(mR[1])})" text-anchor="middle" dominant-baseline="central" font-family="Big Shoulders Display, sans-serif" font-weight="900" font-size="${F(tw * 0.3)}" fill="#f3e3c0">${String.fromCharCode(ch.charCodeAt(0) + 3)}</text>`;
    g += `<path d="M${F(up(t3)[0])} ${F(up(t3)[1])}L${F(up(t2)[0])} ${F(up(t2)[1])}L${F(up(t1)[0])} ${F(up(t1)[1])}" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="1.2"/>`;
    return g;
  }
}

function keg(x, y, k) {
  const w = 15 * k, h = 30 * k;
  let g = `<ellipse cx="${F(x + 5 * k)}" cy="${F(y + 3 * k)}" rx="${F(19 * k)}" ry="${F(7 * k)}" fill="#000" opacity="0.3"/>`;
  g += `<rect x="${F(x - w)}" y="${F(y - h)}" width="${F(w * 2)}" height="${F(h)}" fill="#7a4a26"/>`;
  g += `<ellipse cx="${F(x)}" cy="${F(y)}" rx="${F(w)}" ry="${F(5 * k)}" fill="#7a4a26"/>`;
  for (const f of [0.22, 0.78]) g += `<rect x="${F(x - w)}" y="${F(y - h * f - 1.5 * k)}" width="${F(w * 2)}" height="${F(3 * k)}" fill="#3b3b40"/>`;
  g += `<rect x="${F(x - w * 0.62)}" y="${F(y - h * 0.62)}" width="${F(w * 1.24)}" height="${F(h * 0.26)}" fill="#e9dcb8"/>`;
  g += `<text x="${F(x)}" y="${F(y - h * 0.49)}" text-anchor="middle" dominant-baseline="middle" font-family="IBM Plex Mono, monospace" font-weight="600" font-size="${F(5.4 * k)}" fill="#a3261f">POWDER</text>`;
  g += `<ellipse cx="${F(x)}" cy="${F(y - h)}" rx="${F(w)}" ry="${F(5 * k)}" fill="#946038"/>`;
  g += `<path d="M${F(x + 3 * k)} ${F(y - h)}q${F(4 * k)} ${F(-8 * k)} ${F(9 * k)} ${F(-9 * k)}" fill="none" stroke="#2a2018" stroke-width="${F(1.6 * k)}"/>`;
  g += `<circle cx="${F(x + 12 * k)}" cy="${F(y - h - 9 * k)}" r="${F(3.4 * k)}" fill="#ffd36b"/><circle cx="${F(x + 12 * k)}" cy="${F(y - h - 9 * k)}" r="${F(7 * k)}" fill="#ffb347" opacity="0.35"/>`;
  return g;
}

function arrow(p0, p1, u, k) {
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
  const len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
  const s = [p0[0] + dx * 0.3, p0[1] + dy * 0.3 + 4 * k];
  const e = [p0[0] + dx * (u.drop ? 0.98 : 0.86), p0[1] + dy * (u.drop ? 0.98 : 0.86) + 4 * k];
  const ang = Math.atan2(e[1] - s[1], e[0] - s[0]);
  const hl = 12 * k;
  const h1 = [e[0] - hl * Math.cos(ang - 0.5), e[1] - hl * Math.sin(ang - 0.5)];
  const h2 = [e[0] - hl * Math.cos(ang + 0.5), e[1] - hl * Math.sin(ang + 0.5)];
  if (u.kind === 'broken') {
    let d = `M${F(s[0])} ${F(s[1])}`;
    const n = 6;
    for (let i = 1; i <= n; i++) {
      const t = i / n, w = (i % 2 ? 1 : -1) * 6 * k * (i < n ? 1 : 0);
      d += `L${F(s[0] + (e[0] - s[0]) * t - uy * w)} ${F(s[1] + (e[1] - s[1]) * t + ux * w)}`;
    }
    return `<path d="${d}M${F(h1[0])} ${F(h1[1])}L${F(e[0])} ${F(e[1])}L${F(h2[0])} ${F(h2[1])}" fill="none" stroke="#e2483d" stroke-width="${F(3 * k)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  const col = u.kind === 'player' ? '#f4c25a' : '#fffaf0';
  const w = u.kind === 'player' ? 5 : 3.8;
  const mx = (s[0] + e[0]) / 2 - uy * 3 * k, my = (s[1] + e[1]) / 2 + ux * 3 * k;
  const d = `M${F(s[0])} ${F(s[1])}Q${F(mx)} ${F(my)} ${F(e[0])} ${F(e[1])}M${F(h1[0])} ${F(h1[1])}L${F(e[0])} ${F(e[1])}L${F(h2[0])} ${F(h2[1])}`;
  return `<path d="${d}" fill="none" stroke="#000" stroke-opacity="0.12" stroke-width="${F((w + 3) * k)}" stroke-linecap="round" stroke-linejoin="round"/>`
    + `<path d="${d}" fill="none" stroke="${col}" stroke-opacity="0.92" stroke-width="${F(w * k)}" stroke-linecap="round" stroke-linejoin="round"${u.drop ? ` stroke-dasharray="${F(9 * k)} ${F(5 * k)}"` : ''}/>`;
}

const PAL = {
  nursery: { g1: '#d8c193', g2: '#d1b987', chalk: '#ffffff', rim: '#8a5a36', plinthL: '#6b4428', plinthR: '#55351f' },
  study: { g1: '#b59b72', g2: '#ad936a', chalk: '#fff4dc', rim: '#4b2f1c', plinthL: '#3b2416', plinthR: '#2c1a10' },
  toybox: { g1: '#7d8aa0', g2: '#76839a', chalk: '#eaf2ff', rim: '#3e3a48', plinthL: '#2c2a36', plinthR: '#211f2a' },
};

// ---------- backgrounds ----------
function nurseryBg(W, H, sillY, win) {
  let s = `<rect width="${W}" height="${H}" fill="#e8d6b4"/>`;
  for (let x = 0; x < W; x += 56) s += `<rect x="${x}" y="0" width="22" height="${sillY}" fill="#e0caa1" opacity="0.7"/>`;
  s += `<rect x="0" y="${F(sillY - 26)}" width="${W}" height="18" fill="#c9ad80"/>`;
  if (win) {
    const [wx, wy, ww, wh] = win;
    s += `<rect x="${wx - 12}" y="${wy - 12}" width="${ww + 24}" height="${wh + 12}" fill="#f6efe2"/>`;
    s += `<rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" fill="#a9d3ee"/>`;
    s += `<ellipse cx="${wx + ww * 0.7}" cy="${wy + wh * 0.35}" rx="${ww * 0.22}" ry="${wh * 0.08}" fill="#fff" opacity="0.8"/>`;
    s += `<rect x="${wx + ww / 2 - 5}" y="${wy}" width="10" height="${wh}" fill="#f6efe2"/><rect x="${wx}" y="${wy + wh / 2 - 5}" width="${ww}" height="10" fill="#f6efe2"/>`;
  }
  s += `<rect x="0" y="${sillY}" width="${W}" height="${H - sillY}" fill="#b07a4c"/>`;
  for (let i = 0; i < 9; i++) {
    const y = sillY + 14 + i * i * 7;
    if (y < H) s += `<path d="M0 ${y}C${W * 0.3} ${y - 6} ${W * 0.6} ${y + 8} ${W} ${y - 2}" stroke="#94643c" stroke-width="2" fill="none" opacity="0.6"/>`;
  }
  return s;
}
function nurseryLight(W, H, win) {
  let s = '';
  if (win) {
    const [wx, wy, ww, wh] = win;
    s += `<polygon points="${wx},${wy} ${wx + ww},${wy} ${W * 0.86},${H * 0.95} ${W * 0.28},${H * 0.95}" fill="#fff3c8" opacity="0.2"/>`;
  }
  return s + vignette(W, H, '#3a2210', 0.55);
}
function studyBg(W, H, sillY) {
  let s = `<rect width="${W}" height="${H}" fill="#1c1510"/>`;
  for (let x = 0; x < W; x += 90) s += `<rect x="${x}" y="0" width="3" height="${sillY}" fill="#2a2018"/>`;
  s += `<rect x="0" y="${sillY}" width="${W}" height="${H - sillY}" fill="#2c4433"/>`;
  s += `<rect x="${W * 0.06}" y="${sillY + 12}" width="${W * 0.88}" height="${H - sillY - 12}" fill="#355440" rx="6"/>`;
  return s;
}
function studyLight(W, H, cx, cy) {
  return `<radialGradient id="lampG" cx="${cx / W}" cy="${cy / H}" r="0.6"><stop offset="0" stop-color="#ffcf7a" stop-opacity="0.35"/><stop offset="1" stop-color="#ffcf7a" stop-opacity="0"/></radialGradient><rect width="${W}" height="${H}" fill="url(#lampG)"/>` + vignette(W, H, '#000', 0.7, 'v2');
}
function toyboxBg(W, H, sillY) {
  let s = `<rect width="${W}" height="${H}" fill="#0d1322"/>`;
  s += `<circle cx="${W * 0.82}" cy="${sillY * 0.4}" r="${W * 0.05}" fill="#dfe8ff" opacity="0.85"/>`;
  s += `<rect x="0" y="${sillY}" width="${W}" height="${H - sillY}" fill="#3d2a1e"/>`;
  for (let x = 0; x < W; x += W / 6) s += `<rect x="${x}" y="${sillY}" width="2" height="${H - sillY}" fill="#2a1c13"/>`;
  return s;
}
function toyboxLight(W, H, cx, cy) {
  return `<radialGradient id="candleG" cx="${cx / W}" cy="${cy / H}" r="0.55"><stop offset="0" stop-color="#ffb35c" stop-opacity="0.3"/><stop offset="1" stop-color="#ffb35c" stop-opacity="0"/></radialGradient><rect width="${W}" height="${H}" fill="url(#candleG)"/><rect width="${W}" height="${H}" fill="#2b4a8a" opacity="0.12"/>` + vignette(W, H, '#02040a', 0.75, 'v3');
}
function vignette(W, H, col, op, id = 'v1') {
  return `<radialGradient id="${id}" cx="0.5" cy="0.5" r="0.75"><stop offset="0.55" stop-color="${col}" stop-opacity="0"/><stop offset="1" stop-color="${col}" stop-opacity="${op}"/></radialGradient><rect width="${W}" height="${H}" fill="url(#${id})"/>`;
}
function candle(x, y, s) {
  return `<rect x="${x - 7 * s}" y="${y - 40 * s}" width="${14 * s}" height="${40 * s}" fill="#efe6d2"/><ellipse cx="${x}" cy="${y - 52 * s}" rx="${5 * s}" ry="${11 * s}" fill="#ffd36b"/><ellipse cx="${x}" cy="${y - 50 * s}" rx="${22 * s}" ry="${26 * s}" fill="#ffb347" opacity="0.25"/>`;
}
function lamp(x, y, s) {
  return `<path d="M${x - 46 * s} ${y}L${x - 24 * s} ${y - 44 * s}H${x + 24 * s}L${x + 46 * s} ${y}Z" fill="#2f5a3a"/><ellipse cx="${x}" cy="${y}" rx="${46 * s}" ry="${8 * s}" fill="#ffe2a0" opacity="0.9"/>`;
}

// ---------- HUD bits ----------
function card(x, y, rot, title, line, cd, lift, diag) {
  const w = 128, h = 176;
  let s = `<g transform="translate(${x} ${y - (lift ? 18 : 0)}) rotate(${rot})">`;
  s += `<rect x="${-w / 2 + 4}" y="${-h / 2 + 8}" width="${w}" height="${h}" rx="8" fill="#000" opacity="0.28"/>`;
  s += `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="8" fill="#f4ecd8" stroke="${lift ? '#e0ac45' : '#cdbf9e'}" stroke-width="${lift ? 3 : 1.5}"/>`;
  s += `<text x="0" y="${-h / 2 + 26}" text-anchor="middle" font-family="Big Shoulders Display, sans-serif" font-weight="900" font-size="22" letter-spacing="1" fill="#2b1d12">${title}</text>`;
  s += `<rect x="${-w / 2 + 14}" y="${-h / 2 + 38}" width="${w - 28}" height="74" fill="#efe3c6" stroke="#d6c59f"/>`;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) s += `<circle cx="${-30 + i * 30}" cy="${-h / 2 + 52 + j * 23}" r="2" fill="#bba67c"/>`;
  s += diag;
  s += `<text x="0" y="${h / 2 - 44}" text-anchor="middle" font-family="Barlow, sans-serif" font-weight="600" font-size="12" fill="#4a3a28">${line}</text>`;
  if (cd === 0) {
    s += `<text x="0" y="${h / 2 - 16}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-weight="600" font-size="12" letter-spacing="2" fill="#2f7a3e">READY</text>`;
  } else {
    for (let i = 0; i < 3; i++) s += `<circle cx="${-14 + i * 14}" cy="${h / 2 - 20}" r="4.5" fill="${i < cd ? '#3a2a1d' : 'none'}" stroke="#8b7656" stroke-width="1.4"/>`;
  }
  return s + '</g>';
}
const DIAG = {
  side: `<circle cx="0" cy="-28" r="7" fill="#2457a6"/><path d="M8 -28H26M20 -33L26 -28L20 -23" stroke="#2457a6" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="-30" cy="-51" r="5" fill="#b8322b"/><circle cx="30" cy="-5" r="5" fill="#b8322b"/>`,
  stomp: `<circle cx="0" cy="-28" r="7" fill="#2457a6"/><circle cx="-30" cy="-51" r="5" fill="#b8322b"/><path d="M-24 -51H-8M-14 -56L-8 -51L-14 -46" stroke="#b8322b" stroke-width="2.2" fill="none" stroke-linecap="round"/><circle cx="30" cy="-5" r="5" fill="#b8322b"/><path d="M36 -5H48" stroke="#b8322b" stroke-width="2.2" stroke-linecap="round"/>`,
  lunge: `<circle cx="-30" cy="-28" r="7" fill="#2457a6"/><path d="M-22 -28H18M12 -33L18 -28L12 -23" stroke="#2457a6" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="30" cy="-28" r="6" fill="#b8322b"/><path d="M25 -38L35 -18M35 -38L25 -18" stroke="#f2c14e" stroke-width="2"/>`,
};
function medals(x, y, n, of) {
  let s = '';
  for (let i = 0; i < of; i++) {
    const cx = x + i * 30;
    s += `<path d="M${cx - 5} ${y - 16}L${cx} ${y - 4}L${cx + 5} ${y - 16}Z" fill="${i < n ? '#b8322b' : '#7d6e5c'}"/>`;
    s += `<circle cx="${cx}" cy="${y + 4}" r="10" fill="${i < n ? '#e0ac45' : '#9b8f7f'}" stroke="${i < n ? '#8a6420' : '#6b6255'}" stroke-width="1.5"/>`;
    if (i < n) s += `<circle cx="${cx - 3}" cy="${y + 1}" r="3" fill="#fff" opacity="0.4"/>`;
  }
  return s;
}

const HEAD = (title, W, H) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800;900&amp;family=Barlow:wght@400;500;600&amp;family=IBM+Plex+Mono:wght@500;600&amp;family=Caveat:wght@600;700&amp;display=swap">
<style>
body{margin:0}
a{color:#d9a441}a:hover{color:#f0c050}
</style>
</helmet>
`;
const TAIL = (W, H) => `
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":${W},"height":${H}}}'>
class Component extends DCLogic {
renderVals() {
return {};
}
}
</script>
</body>
</html>
`;

// ---------- Artboard 1: hero ----------
function hero() {
  const W = 1440, H = 900, sillY = 220, win = [70, 30, 300, 150];
  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Lockstep as a toy-soldier diorama: tin soldiers on a painted parade-ground plinth on a nursery windowsill, with chalk arrows showing every soldier stepping right in step with the player">`;
  s += nurseryBg(W, H, sillY, win);
  // props on the sill
  s += `<g transform="translate(130 560)"><ellipse cx="0" cy="40" rx="70" ry="16" fill="#000" opacity="0.25"/><rect x="-60" y="-30" width="120" height="70" fill="#b8322b"/><path d="M-60 -30l20 70l20 -70l20 70l20 -70l20 70l20 -70" fill="none" stroke="#f4ecd8" stroke-width="3"/><ellipse cx="0" cy="40" rx="60" ry="14" fill="#8a2520"/><ellipse cx="0" cy="-30" rx="60" ry="14" fill="#efe2bf" stroke="#e0ac45" stroke-width="4"/><path d="M-30 -60L20 -34M40 -64L-6 -36" stroke="#7a4a26" stroke-width="5" stroke-linecap="round"/></g>`;
  s += scene({ ox: 700, oy: 246, tw: 124, pal: PAL.nursery, arrows: true, plate: 'DRILL SQUARE' });
  s += nurseryLight(W, H, win);
  // grease-pencil preview note
  s += `<g transform="translate(1168 470) rotate(-6)"><text font-family="Caveat, cursive" font-weight="700" font-size="40" fill="#c0392b">Double drop!</text><text y="34" font-family="Caveat, cursive" font-weight="600" font-size="26" fill="#7a2a20">+2 gold · cards −1</text></g>`;
  s += `<path d="M1162 470C1080 470 1000 520 958 556" stroke="#c0392b" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  // title + status, top right on the wall
  s += `<text x="${W - 56}" y="78" text-anchor="end" font-family="Big Shoulders Display, sans-serif" font-weight="900" font-size="48" letter-spacing="2" fill="#2b1d12">LOCKSTEP</text>`;
  s += `<text x="${W - 56}" y="104" text-anchor="end" font-family="IBM Plex Mono, monospace" font-weight="600" font-size="13" letter-spacing="2" fill="#6b5640">ACT I · THE NURSERY · SET 7 OF 12</text>`;
  s += medals(W - 296, 150, 6, 8);
  s += `<circle cx="${W - 72}" cy="208" r="15" fill="#e0ac45" stroke="#8a6420" stroke-width="2"/><text x="${W - 72}" y="213" text-anchor="middle" font-family="Big Shoulders Display, sans-serif" font-weight="900" font-size="14" fill="#5a3f10">G</text><text x="${W - 96}" y="216" text-anchor="end" font-family="Big Shoulders Display, sans-serif" font-weight="800" font-size="26" fill="#2b1d12">48</text>`;
  // chalk slate
  s += `<g transform="translate(70 690) rotate(-4)"><rect x="0" y="0" width="250" height="160" rx="8" fill="#8a5a36"/><rect x="12" y="12" width="226" height="136" rx="4" fill="#2d3431"/>`;
  s += `<text x="28" y="54" font-family="Caveat, cursive" font-weight="700" font-size="30" fill="#eef0e8" opacity="0.9">Count</text><text x="118" y="70" font-family="Caveat, cursive" font-weight="700" font-size="64" fill="#fffaf0">5</text>`;
  let tally = '';
  for (let i = 0; i < 5; i++) tally += `M${30 + i * 9} 100v26`;
  s += `<path d="${tally}M26 122L72 104" stroke="#eef0e8" stroke-width="2.6" stroke-linecap="round" opacity="0.85"/>`;
  s += `<text x="96" y="124" font-family="Caveat, cursive" font-weight="600" font-size="22" fill="#eef0e8" opacity="0.7">frenzy at 30</text></g>`;
  // key hint
  s += `<g transform="translate(380 826)"><rect x="0" y="0" width="44" height="44" rx="8" fill="#f4ecd8" stroke="#8a6a46" stroke-width="2"/><rect x="0" y="40" width="44" height="6" rx="3" fill="#8a6a46"/><text x="22" y="30" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-weight="600" font-size="20" fill="#2b1d12">D</text>`;
  s += `<text x="60" y="30" font-family="Caveat, cursive" font-weight="700" font-size="32" fill="#2b1d12">step right — the whole room steps with you</text></g>`;
  // cards
  s += card(1110, 750, -9, 'SIDESTEP', 'You move, room holds', 0, false, DIAG.side);
  s += card(1238, 736, 0, 'LUNGE', 'Charge 2, hit for 2', 0, true, DIAG.lunge);
  s += card(1366, 754, 9, 'STOMP', 'Room moves, you hold', 1, false, DIAG.stomp);
  s += '</svg>';
  return HEAD('Lockstep diorama', W, H) + s + TAIL(W, H);
}

// ---------- Artboard 2: now vs diorama ----------
function flatNow(x0, y0, size) {
  const n = N, cs = size / n;
  let s = `<rect x="${x0}" y="${y0}" width="${size}" height="${size}" rx="10" fill="#16202e"/>`;
  let g = '';
  for (let i = 1; i < n; i++) g += `M${x0 + i * cs} ${y0}v${size}M${x0} ${y0 + i * cs}h${size}`;
  s += `<path d="${g}" stroke="#2a3850" stroke-width="1"/>`;
  const at = (c, r) => [x0 + (c + 0.5) * cs, y0 + (r + 0.5) * cs];
  for (const [c, r] of LAYOUT.pits) s += `<rect x="${x0 + c * cs + 6}" y="${y0 + r * cs + 6}" width="${cs - 12}" height="${cs - 12}" rx="6" fill="#06090f" stroke="#2a3850"/>`;
  for (const [c, r] of LAYOUT.blocks) s += `<rect x="${x0 + c * cs + 4}" y="${y0 + r * cs + 4}" width="${cs - 8}" height="${cs - 8}" rx="6" fill="#33435c"/>`;
  for (const [c, r] of LAYOUT.kegs) { const [x, y] = at(c, r); s += `<circle cx="${x}" cy="${y}" r="${cs * 0.3}" fill="#8a5a36"/>`; }
  const col = { drone: '#ff5656', broken: '#ff5656', contra: '#b585ff', heavy: '#ff8f45' };
  for (const u of LAYOUT.units) {
    const [x, y] = at(u.c, u.r);
    if (u.kind === 'player') s += `<circle cx="${x}" cy="${y}" r="${cs * 0.34}" fill="#d9a441"/><circle cx="${x}" cy="${y}" r="${cs * 0.27}" fill="#f2ece0"/>`;
    else if (u.kind === 'heavy') s += `<rect x="${x - cs * 0.3}" y="${y - cs * 0.3}" width="${cs * 0.6}" height="${cs * 0.6}" rx="8" fill="${col.heavy}"/>`;
    else s += `<circle cx="${x}" cy="${y}" r="${cs * 0.28}" fill="${col[u.kind]}"${u.kind === 'broken' ? ' stroke="#fff" stroke-width="2" stroke-dasharray="4 3"' : ''}/>`;
  }
  return s;
}
function compare() {
  const W = 1440, H = 760;
  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The same position drawn in the current flat style and as the toy-soldier diorama">`;
  s += `<rect width="${W}" height="${H}" fill="#0d121b"/>`;
  s += `<text x="64" y="84" font-family="Big Shoulders Display, sans-serif" font-weight="900" font-size="44" letter-spacing="1" fill="#eef0f3">SAME TURN, TWO LOOKS</text>`;
  s += `<text x="64" y="134" font-family="IBM Plex Mono, monospace" font-weight="600" font-size="13" letter-spacing="2" fill="#8c9ab0">NOW · FLAT GRID</text>`;
  s += flatNow(64, 156, 540);
  s += `<text x="700" y="134" font-family="IBM Plex Mono, monospace" font-weight="600" font-size="13" letter-spacing="2" fill="#d9a441">PROPOSED · TOY DIORAMA</text>`;
  s += `<clipPath id="cmpClip"><rect x="700" y="156" width="676" height="540" rx="10"/></clipPath><g clip-path="url(#cmpClip)"><g transform="translate(700 156)">`;
  s += nurseryBg(676, 540, 150, [40, 20, 170, 110]);
  s += scene({ ox: 338, oy: 128, tw: 76, pal: PAL.nursery, arrows: true });
  s += nurseryLight(676, 540, [40, 20, 170, 110]);
  s += `</g></g></svg>`;
  return HEAD('Now vs diorama', W, H) + s + TAIL(W, H);
}

// ---------- Artboard 3: three acts ----------
function acts() {
  const W = 1440, H = 560, pw = 424, ph = 400;
  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The same diorama in the three act settings: a sunny nursery windowsill, a lamplit study desk and a toy box at night">`;
  s += `<rect width="${W}" height="${H}" fill="#0d121b"/>`;
  const panels = [
    { name: 'ACT I · THE NURSERY', sub: 'Sunny windowsill, alphabet blocks', bg: () => nurseryBg(pw, ph, 120, [30, 16, 140, 90]), light: () => nurseryLight(pw, ph, [30, 16, 140, 90]), pal: PAL.nursery },
    { name: 'ACT II · THE STUDY', sub: 'Lamplit desk, green leather, ink', bg: () => studyBg(pw, ph, 120) + lamp(330, 112, 1.1), light: () => studyLight(pw, ph, 330, 130), pal: PAL.study },
    { name: 'ACT III · THE TOY BOX', sub: 'Night, moonlight and one candle', bg: () => toyboxBg(pw, ph, 120) + candle(370, 330, 1), light: () => toyboxLight(pw, ph, 370, 280), pal: PAL.toybox },
  ];
  panels.forEach((p, i) => {
    const x = 64 + i * (pw + 40), y = 48;
    s += `<clipPath id="actClip${i}"><rect x="${x}" y="${y}" width="${pw}" height="${ph}" rx="10"/></clipPath><g clip-path="url(#actClip${i})"><g transform="translate(${x} ${y})">`;
    s += p.bg();
    s += scene({ ox: pw / 2 - 10, oy: 110, tw: 54, pal: p.pal, arrows: false });
    s += p.light();
    s += `</g></g>`;
    s += `<text x="${x}" y="${y + ph + 38}" font-family="Big Shoulders Display, sans-serif" font-weight="900" font-size="26" letter-spacing="1" fill="#eef0f3">${p.name}</text>`;
    s += `<text x="${x}" y="${y + ph + 62}" font-family="Barlow, sans-serif" font-size="15" fill="#8c9ab0">${p.sub}</text>`;
  });
  s += '</svg>';
  return HEAD('Diorama acts', W, H) + s + TAIL(W, H);
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(OUT + '/Diorama.dc.html', hero());
fs.writeFileSync(OUT + '/DioramaCompare.dc.html', compare());
fs.writeFileSync(OUT + '/DioramaActs.dc.html', acts());
// plain preview pages for a local look
for (const f of ['Diorama', 'DioramaCompare', 'DioramaActs']) {
  const src = fs.readFileSync(OUT + '/' + f + '.dc.html', 'utf8');
  const svg = src.slice(src.indexOf('<svg'), src.lastIndexOf('</svg>') + 6);
  fs.writeFileSync(OUT + '/../preview-' + f + '.html', `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800;900&family=Barlow:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&family=Caveat:wght@600;700&display=swap"><body style="margin:0;background:#000">${svg}</body>`);
}
console.log('ok');
