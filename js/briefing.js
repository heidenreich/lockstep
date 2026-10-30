// Lockstep page: the briefing before each fight. Every room opens with its orders of the day: who is on the field,
// what the ground holds, the bonus order and (for a boss) its twist. Pointing at a line lights those pieces or tiles
// up on the board. It folds away on your first move; the Briefing button in the top bar brings it back.

/* ---------- Briefing ---------- */
const BRIEF_PIECE = {
  drone: "Steps with you.",
  contra: "Steps the opposite way to you.",
  heavy: "Moves every other turn, so it falls out of line. Hits for 2.",
  rifle: "Holds its ground. Reloads for 2 turns, then fires along its row and column; walls stop the shot, anything else in the way takes it. Yields once the rest of its line is gone.",
  runner: "Elite. Moves 2 for each of your steps.",
  anchor: "Elite. Never moves and strikes anything beside it. Once the rest of its line is gone it falls into step.",
  colossus: "A giant heavy that hits for 2. A pit deals it 3 and it climbs back out. A drone joins every 6 turns.",
  mirror: "A giant contrarian. Every 5 turns it flips the cadence: for 5 turns everyone moves the other way. It seals any pit it climbs out of.",
  warden: "Hits for 2. It chases every other turn and marches in step on the turns between (the slate says which): step it into a pit then. Two drones join every 7 turns."
};
const WALL_NAME = ["Alphabet blocks", "Stacked books", "Toy-box crates"];
let briefOpen = false, briefHi = null;
// Auto-show before every fight is a per-browser preference.
const briefAuto = () => { try { return localStorage.getItem("lockstep-brief") !== "0"; } catch (e) { return true; } };
function setBriefAuto(on) { try { localStorage.setItem("lockstep-brief", on ? "1" : "0"); } catch (e) {} }

// What the room holds, as briefing rows: [key, swatch, title, text]. Keys name what to light up on the board.
function briefRows(F) {
  const rm = ROOMS[F.room], tiles = Object.values(rm.tiles), boss = F.kind === "boss", rows = { field: [], ground: [] };
  const byType = new Map();
  for (const e of F.enemies) { const b = byType.get(e.type) || { n: 0, hp: e.max }; b.n++; byType.set(e.type, b); }
  for (const [type, b] of byType) {
    const d = FOES[type], hits = d.dmg > 1 && !/[Hh]its for/.test(BRIEF_PIECE[type]) ? ` Hits for ${d.dmg}.` : "";
    rows.field.push([`e:${type}`, `tin:${type}`, `${d.boss ? d.name : cap(d.name)}${b.n > 1 ? ` ×${b.n}` : ""}`, `${b.hp} health. ${BRIEF_PIECE[type] || ""}${hits}`]);
  }
  if (rm.pits.size) rows.ground.push(["t:pit", "pit", `Pits ×${rm.pits.size}`, boss ? `The boss takes 3 and climbs back out at an edge; anything else is gone. ${F.enemies.some(e => foe(e).seals) ? "Any pit the Mirror climbs out of is sealed." : "Pits never fill in a boss fight."}` : `Anything that steps in is gone. Each pit takes ${R.pitHold} this fight, then fills in.`]);
  if (rm.walls.size) rows.ground.push(["t:wall", "wall", WALL_NAME[R.act - 1], "Walls stop everything. An enemy blocked 3 turns running breaks free and chases you."]);
  if (F.kegs.length) rows.ground.push(["t:keg", "keg", `Powder kegs ×${F.kegs.length}`, NOTES.keg[1]]);
  if (tiles.includes("ice")) rows.ground.push(["t:ice", "ice", "Ice", NOTES.ice[1]]);
  if (tiles.includes("spike")) rows.ground.push(["t:spike", "spike", "Spikes", NOTES.spike[1]]);
  if (tiles.some(t => BELT[t])) rows.ground.push(["t:belt", "belt", "Conveyor belts", NOTES.belt[1]]);
  if (F.goal && F.goal.flag) rows.ground.push(["t:flag", "flag", "The colours", "Step onto the flag before the room is clear, and before an enemy tramples it."]);
  return rows;
}
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
function renderBrief() {
  const box = $("brief"), F = R.fight;
  const show = !!(F && !F.over && F.kind !== "drill" && (briefOpen || (F.turn === 0 && !F.briefed && briefAuto())));
  $("briefBtn").hidden = !(F && !F.over && F.kind !== "drill" && !show);
  box.hidden = !show;
  if (!show) { briefHi = null; if (!F || F.over) briefOpen = false; return false; }
  briefOpen = true;
  // The briefing explains every piece and tile here, so their one-off "New" notes would only repeat it.
  for (const k of [...F.enemies.map(e => e.type), "keg", "ice", "spike", "belt", "goal"]) if (NOTES[k]) P.seen[k] = true;
  const rows = briefRows(F), boss = F.enemies.find(e => foe(e).boss), G = F.goal && GOALS[F.goal.id];
  const row = ([key, sw, title, text]) => `<li data-hi="${key}" tabindex="0"><canvas data-sw="${sw}" width="88" height="96"></canvas><span><b>${esc(title)}</b> ${esc(text)}</span></li>`;
  const clock = boss ? `At turn 30 the ${esc(foe(boss).name)} enrages: its line breaks free and help arrives every 3 turns.`
    : `At turn ${F.frenzyAt} a frenzy frees every enemy. Until then, up to ${MAX_ARRIVALS} more join every ${ARRIVE_EVERY} turns while 2 or more are left. Waiting brings one at once.`;
  box.innerHTML = `<div class="briefhead"><div><span class="eyebrow">Orders of the day${boss ? " · boss" : F.kind === "elite" ? " · elite" : ""}</span><h3>${esc(ROOMS[F.room].name)}</h3></div><button class="btn" data-act="briefClose">To the field</button></div>
    <div class="eyebrow">On the field</div><ul class="brieflist">${rows.field.map(row).join("")}</ul>
    ${rows.ground.length ? `<div class="eyebrow">The ground</div><ul class="brieflist">${rows.ground.map(row).join("")}</ul>` : ""}
    ${G ? `<p class="briefbonus"><span class="eyebrow">Bonus order · +${G.gold} gold</span><b>${esc(G.name)}.</b> ${esc(G.text)}</p>` : ""}
    <p class="briefclock">${clock}</p>
    <label class="briefauto"><input type="checkbox" id="briefAuto"${briefAuto() ? " checked" : ""}> Brief me before every fight</label>`;
  for (const c of box.querySelectorAll("canvas[data-sw]")) paintSwatch(c, c.dataset.sw);
  return true;
}
function closeBrief() {
  const F = R && R.fight;
  if (F) F.briefed = true;
  briefOpen = false; briefHi = null;
}
// Small portraits for the briefing: tin soldiers for pieces, a painted tile for each kind of ground.
function paintSwatch(c, sw) {
  const g = c.getContext("2d"), S = SETTING[R.act - 1];
  g.setTransform(2, 0, 0, 2, 0, 0);
  const tile = (inset, fill) => { g.fillStyle = fill; rrect(g, 4 + inset, 22 + inset, 36 - inset * 2, 22 - inset * 2, 3); g.fill(); };
  // A tile seen from the front: the board's two-tone paint under whatever stands or lies on it.
  tile(0, S.g1); g.strokeStyle = hexRgba(S.chalk, 0.35); g.lineWidth = 0.8; rrect(g, 4, 22, 36, 22, 3); g.stroke();
  if (sw.startsWith("tin:")) {
    const t = sw.slice(4), d = FOES[t];
    tin(g, 22, 40, d.boss ? 0.26 : t === "heavy" || t === "anchor" ? 0.33 : 0.38, TIN[t], { elite: d.elite, ring: d.boss ? "#b8322b" : null, mirror: t === "contra" });
  } else if (sw === "pit") {
    tile(2, S.pitRim); const h = g.createLinearGradient(0, 26, 0, 40); h.addColorStop(0, "#000"); h.addColorStop(1, "#1d140d"); g.fillStyle = h; rrect(g, 9, 26, 26, 14, 2); g.fill();
  } else if (sw === "wall") {
    const cols = [["#b8433a", "#f3e3c0"], ["#2f4a6b", "#efe6cf"], ["#5d4027", "#7d5a3a"]][R.act - 1];
    g.fillStyle = "rgba(0,0,0,0.28)"; g.fillRect(12, 38, 26, 5);
    g.fillStyle = cols[0]; g.fillRect(9, 18, 26, 22); g.fillStyle = cols[1]; g.fillRect(9, 13, 26, 6);
    if (R.act === 1) { g.fillStyle = "#f3e3c0"; g.font = `900 15px ${css("--f-display")}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("A", 22, 30); }
    if (R.act === 2) { g.fillStyle = "#7a2a2a"; g.fillRect(9, 26, 26, 7); g.fillStyle = "rgba(240,194,94,0.6)"; for (const y of [22, 29, 36]) g.fillRect(13, y, 18, 1.4); }
    if (R.act === 3) { g.strokeStyle = "#3a2716"; g.lineWidth = 2; g.beginPath(); g.moveTo(11, 38); g.lineTo(33, 20); g.stroke(); }
  } else if (sw === "keg") drawKeg(g, 21, 40, 0.68, 0);
  else if (sw === "ice") {
    tile(1, "rgba(190,228,255,0.95)"); g.strokeStyle = "#fff"; g.lineWidth = 1.4; g.beginPath(); g.moveTo(10, 38); g.lineTo(18, 27); g.moveTo(20, 41); g.lineTo(31, 28); g.stroke();
  } else if (sw === "spike") {
    tile(3, "rgba(60,50,40,0.35)");
    for (const [x, y] of [[14, 31], [28, 31], [14, 40], [28, 40]]) { g.fillStyle = "#cfd5df"; g.beginPath(); g.moveTo(x, y - 8); g.lineTo(x + 4, y); g.lineTo(x - 4, y); g.closePath(); g.fill(); }
  } else if (sw === "belt") {
    tile(1, "#3a3530"); g.strokeStyle = "rgba(240,194,94,0.9)"; g.lineWidth = 2; g.lineCap = "round"; g.lineJoin = "round";
    for (const x of [13, 22, 31]) { g.beginPath(); g.moveTo(x - 3, 28); g.lineTo(x + 2, 33); g.lineTo(x - 3, 38); g.stroke(); }
  } else if (sw === "flag") drawFlag(g, 16, 41, 0.34, 0, true);
}
// Lights up what a briefing line is about, on the board (called from draw, before the pieces stand on it).
function drawBriefHi(g, F, now) {
  if (!briefHi || !briefOpen) return;
  const [kind, what] = briefHi.split(":"), rm = ROOMS[F.room], a = reduced() ? 0.9 : 0.65 + Math.sin(now * 5) * 0.3;
  const mark = (x, y, round) => {
    g.save(); tileSpace(g, x, y); g.strokeStyle = `rgba(255,214,110,${a})`; g.lineWidth = 0.09; g.setLineDash([0.16, 0.08]);
    if (round) { g.beginPath(); g.ellipse(0, 0.05, 0.47, 0.47, 0, 0, Math.PI * 2); } else rr(-0.47, -0.47, 0.94, 0.94, 0.12);
    g.stroke(); g.fillStyle = `rgba(255,214,110,${a * 0.22})`; g.fill(); g.restore();
  };
  const keys = [];
  if (kind === "e") for (const e of F.enemies) { if (e.type === what) { const v = vis[e.id] || e; mark(v.x, v.y, true); } }
  else if (what === "pit") keys.push(...rm.pits);
  else if (what === "wall") keys.push(...rm.walls);
  else if (what === "keg") keys.push(...F.kegs);
  else if (what === "flag" && F.goal && F.goal.flag) keys.push(F.goal.flag.x + "," + F.goal.flag.y);
  else for (const [k, t] of Object.entries(rm.tiles)) if (t === what || (what === "belt" && BELT[t])) keys.push(k);
  for (const k of keys) { const [x, y] = k.split(",").map(Number); mark(x, y, false); }
}
