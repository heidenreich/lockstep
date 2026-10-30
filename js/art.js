// Lockstep page: the drawing kit shared by the fight board, the map board, the briefing and the title: tin soldiers,
// each act's look, kegs, flags, the "you" marker and small canvas helpers.

/* ---------- Each act's look ---------- */
// One entry per act (ACTS in rules.js): board paint (fight and map boards), the tabletop under the map board, what its
// walls are called in the briefing, and the page theme colours.
const ACT_ART = [
  { board: { g1: "#d8c193", g2: "#d1b987", chalk: "#ffffff", rim: "#8a5a36", front: "#6b4428", shade: "#55351f", pitRim: "#5a4330" },
    table: "#b07a4c", wallName: "Alphabet blocks",
    theme: { floor: "#3b3328", floor2: "#433a2d", chalk: "#5c503d", wall: "#6e5f49", wallTop: "#a38d68", wallSide: "#4a3e30", pit: "#0b0806", light: "day" } },
  { board: { g1: "#b59b72", g2: "#ad936a", chalk: "#fff4dc", rim: "#4b2f1c", front: "#3b2416", shade: "#2c1a10", pitRim: "#3e2a1a" },
    table: "#2c4433", wallName: "Stacked books",
    theme: { floor: "#2b2219", floor2: "#33291e", chalk: "#4b3c2b", wall: "#574735", wallTop: "#86694b", wallSide: "#382c20", pit: "#050302", light: "lamp" } },
  { board: { g1: "#7d8aa0", g2: "#76839a", chalk: "#eaf2ff", rim: "#3e3a48", front: "#2c2a36", shade: "#211f2a", pitRim: "#2f3340" },
    table: "#1b1726", wallName: "Toy-box crates",
    theme: { floor: "#121a2a", floor2: "#162036", chalk: "#26334f", wall: "#33425e", wallTop: "#58709a", wallSide: "#222d45", pit: "#03050a", light: "torch" } }
];
const SETTING = ACT_ART.map(a => a.board), TABLE = ACT_ART.map(a => a.table), WALL_NAME = ACT_ART.map(a => a.wallName), ACT_THEME = ACT_ART.map(a => a.theme);

/* ---------- Canvas helpers ---------- */
function hexRgba(hex, a) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || "");
  return m ? `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})` : `rgba(0,0,0,${a})`;
}
function rrect(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
const HAND = '"Caveat", "Segoe Print", cursive';

/* ---------- Tin soldiers ---------- */
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

/* ---------- Markers and props ---------- */
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
// On the board the piece one row back stands right where an overhead marker would go, so the board's marker points
// at your cadet's chest from beside it instead (from the left near the right edge).
function drawYouBeside(g, x, top, base, tileW, t, label, fromLeft) {
  const side = fromLeft ? -1 : 1, bob = reduced() ? 0 : Math.sin(t * 4) * tileW * 0.03;
  const s = Math.max(8, tileW * 0.2), cy = top + (base - top) * 0.32, tip = x + side * (tileW * 0.2 + bob);
  g.save();
  g.fillStyle = "#f0c25e"; g.strokeStyle = "#5a3f12"; g.lineWidth = Math.max(1.5, s * 0.14); g.lineJoin = "round";
  g.beginPath(); g.moveTo(tip, cy); g.lineTo(tip + side * s * 0.75, cy - s * 0.6); g.lineTo(tip + side * s * 0.75, cy + s * 0.6); g.closePath(); g.stroke(); g.fill();
  if (label) {
    g.font = `700 ${Math.round(Math.max(14, s * 1.15))}px ${HAND}`; g.textAlign = fromLeft ? "right" : "left"; g.textBaseline = "middle";
    const lx = tip + side * s * 0.95;
    g.lineWidth = Math.max(3, s * 0.24); g.strokeStyle = "#2b1d12"; g.strokeText("you", lx, cy); g.fillStyle = "#ffe7a8"; g.fillText("you", lx, cy);
  }
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
