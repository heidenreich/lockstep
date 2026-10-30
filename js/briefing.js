// Lockstep page: the briefing before each fight. Every room opens with a briefing: who is on the field,
// what the ground holds, the bonus and (for a boss) its twist. Pointing at a line lights those pieces or tiles
// up on the board. It folds away on your first move; the Briefing button in the top bar brings it back.

/* ---------- Briefing ---------- */
const WALL_NAME = ["Alphabet blocks", "Stacked books", "Toy-box crates"];
let briefOpen = false, briefHi = null, briefHtml = "";
// Auto-show before every fight is a per-browser preference.
const briefAuto = () => { try { return localStorage.getItem("lockstep-brief") !== "0"; } catch (e) { return true; } };
function setBriefAuto(on) { try { localStorage.setItem("lockstep-brief", on ? "1" : "0"); } catch (e) {} }

// What the room holds, as briefing rows: { key, id, sw, title, text }. key names what to light up on the board;
// id is what the profile remembers as met (enemy type or kind of ground).
function briefRows(F) {
  const rm = fightRoom(F), tiles = Object.values(rm.tiles), boss = F.kind === "boss", rows = [];
  const add = (key, sw, title, text) => rows.push({ key, id: key.slice(2), sw, title, text });
  const byType = new Map();
  for (const e of F.enemies) { const b = byType.get(e.type) || { n: 0, hp: e.max }; b.n++; byType.set(e.type, b); }
  for (const [type, b] of byType) {
    const d = FOES[type], hits = d.dmg > 1 && !/[Hh]its for/.test(d.rule) ? ` Hits for ${d.dmg}.` : "";
    add(`e:${type}`, `tin:${type}`, `${d.boss ? d.name : cap(d.name)}${b.n > 1 ? ` ×${b.n}` : ""}`, `${b.hp} health. ${d.rule}${hits}`);
  }
  if (rm.pits.size) add("t:pit", "pit", `Pits ×${rm.pits.size}`, boss ? `The boss takes 3 and climbs back out at an edge; anything else is gone. ${F.enemies.some(e => foe(e).seals) ? "Any pit the Mirror climbs out of is sealed." : "Pits never fill in a boss fight."}` : `Anything that steps in is gone. Each pit takes ${R.pitHold} this fight, then fills in.`);
  if (rm.walls.size) add("t:wall", "wall", WALL_NAME[R.act - 1], "Walls stop everything. An enemy blocked 3 turns running breaks free and chases you.");
  if (F.kegs.length) add("t:keg", "keg", `Powder kegs ×${F.kegs.length}`, NOTES.keg[1]);
  if (tiles.includes("ice")) add("t:ice", "ice", "Ice", NOTES.ice[1]);
  if (tiles.includes("spike")) add("t:spike", "spike", "Spikes", NOTES.spike[1]);
  if (tiles.some(t => BELT[t])) add("t:belt", "belt", "Conveyor belts", NOTES.belt[1]);
  if (F.goal && F.goal.flag) add("t:flag", "flag", "The colours", "Step onto the flag before the room is clear, and before an enemy tramples it.");
  return rows;
}
// The training drill teaches drones, pits and walls.
const briefKnown = id => !!P.seen[id] || (P.drilled && ["drone", "pit", "wall"].includes(id));
function renderBrief() {
  const box = $("brief"), F = R.fight, was = !box.hidden;
  const show = !!(F && !F.over && F.kind !== "drill" && (briefOpen || briefAutoShows(F)));
  $("briefBtn").hidden = !(F && !F.over && F.kind !== "drill" && !show);
  box.hidden = !show;
  if (!show) { briefHi = null; briefHtml = ""; if (!F || F.over) briefOpen = false; return false; }
  briefOpen = true;
  const rows = briefRows(F), isNew = fightUi(F).briefNew || [];
  const fresh = rows.filter(r => isNew.includes(r.id)), known = rows.filter(r => !isNew.includes(r.id));
  const boss = F.enemies.find(e => foe(e).boss), G = F.goal && GOALS[F.goal.id];
  box.className = "brief" + (boss ? " boss" : F.kind === "elite" ? " elite" : "");
  const sw = (r, w, h) => `<canvas data-sw="${r.sw}" width="${w * 2}" height="${h * 2}" style="width:${w}px;height:${h}px" aria-hidden="true"></canvas>`;
  const win = boss ? `Beat the ${esc(foe(boss).name)}. The fight ends the moment it falls; its helpers don't matter.` : "Clear the room: every enemy down, into a pit or out of the fight.";
  const clock = boss ? [`Turn ${ENRAGE}: the ${esc(foe(boss).name)} enrages. Its helpers break free and more arrive every ${ENRAGE_EVERY} turns.`]
    : [`Turn ${F.frenzyAt}: frenzy. Every enemy breaks free and chases you.`, `Every ${ARRIVE_EVERY} turns one more joins (${MAX_ARRIVALS} at most) while 2 or more are left. Waiting brings one at once.`];
  const html = `<div class="briefhead"><div><span class="eyebrow">Briefing</span><h3 id="briefTitle" tabindex="-1">${esc(fightRoom(F).name)}${boss ? ' <span class="brieftag boss">Boss</span>' : F.kind === "elite" ? ' <span class="brieftag">Elite</span>' : ""}</h3></div><button class="btn" data-act="briefClose">To the field</button></div>
    <p class="briefwin"><b>Win:</b> ${win}</p>
    ${fresh.length ? `<div class="eyebrow">New here</div><ul class="brieflist">${fresh.map(r => `<li data-hi="${r.key}" tabindex="0"${r.sw === "tin:" + (boss && boss.type) ? ' class="big"' : ""}>${r.sw === "tin:" + (boss && boss.type) ? sw(r, 64, 70) : sw(r, 52, 57)}<span><span class="newtag">New</span> <b>${esc(r.title)}</b> ${esc(r.text)}</span></li>`).join("")}</ul>` : ""}
    ${known.length ? `<div class="eyebrow">${fresh.length ? "Also here" : "Here"}</div><ul class="briefchips">${known.map(r => `<li data-hi="${r.key}" tabindex="0" title="${esc(r.text)}" aria-label="${esc(r.title + ": " + r.text)}">${sw(r, 32, 35)}<b>${esc(r.title)}</b></li>`).join("")}</ul><p class="briefdetail" id="briefDetail" aria-live="polite">Point at one to see its rule and where it is.</p>` : ""}
    ${G ? `<p class="briefbonus"><span class="eyebrow">Bonus · +${G.gold} gold</span><b>${esc(G.name)}.</b> ${esc(G.text)}</p>` : ""}
    <ul class="briefclock">${clock.map(c => `<li>${c}</li>`).join("")}</ul>
    <label class="briefauto"><input type="checkbox" id="briefAuto"${briefAuto() ? " checked" : ""}> Brief me before every fight</label>`;
  // Rebuild only when something changed, so keyboard focus and the lit line survive the game's frequent redraws.
  if (html !== briefHtml) {
    const focused = document.activeElement && box.contains(document.activeElement) ? document.activeElement.dataset.hi || document.activeElement.id : null;
    box.innerHTML = html; briefHtml = html;
    for (const c of box.querySelectorAll("canvas[data-sw]")) paintSwatch(c, c.dataset.sw);
    if (focused) { const el = box.querySelector(`[data-hi="${focused}"]`) || $(focused); if (el) el.focus({ preventScroll: true }); }
  }
  setBriefHi(briefHi);
  // Opening (a new room, or the Briefing button) takes keyboard focus to the briefing's title.
  if (!was) $("briefTitle").focus({ preventScroll: true });
  return true;
}
// Lights a line: the board marks those pieces or tiles (drawBriefHi), and a familiar one shows its rule.
function setBriefHi(key) {
  briefHi = key || null;
  const box = $("brief");
  for (const li of box.querySelectorAll("li[data-hi]")) li.classList.toggle("on", li.dataset.hi === briefHi);
  const d = $("briefDetail"), li = briefHi && box.querySelector(`.briefchips li[data-hi="${briefHi}"]`);
  if (d) d.textContent = li ? `${li.querySelector("b").textContent}: ${li.title}` : "Point at one to see its rule and where it is.";
}
// Whether the briefing opens by itself for this fight (at its start, unless switched off or already read).
const briefAutoShows = F => F.kind !== "drill" && F.turn === 0 && !fightUi(F).briefed && briefAuto();
// What's new in this room is fixed when its briefing first opens (at the start of the fight, or from the Briefing
// button); after that everything here counts as met, so the one-off "New" notes don't repeat the briefing. With the
// briefing off and unopened, the notes explain things as they turn up instead.
function prepareBrief(F) {
  const ui = fightUi(F);
  if (ui.briefNew || F.kind === "drill") return false;
  const rows = briefRows(F);
  ui.briefNew = rows.filter(r => !briefKnown(r.id)).map(r => r.id);
  for (const r of rows) P.seen[r.id] = true;
  if (F.goal) P.seen.goal = true;
  return true;
}
function closeBrief() {
  const F = R && R.fight;
  if (F) fightUi(F).briefed = true;
  briefOpen = false; briefHi = null;
}
// Small portraits for the briefing: tin soldiers for pieces, a painted tile for each kind of ground.
function paintSwatch(c, sw) {
  // Painted in a 44×48 box, scaled to the canvas (full rows are 44 wide at 2x, chips 28).
  const g = c.getContext("2d"), S = SETTING[R.act - 1], sc = c.width / 44;
  g.setTransform(sc, 0, 0, sc, 0, 0);
  const tile = (inset, fill) => { g.fillStyle = fill; rrect(g, 4 + inset, 22 + inset, 36 - inset * 2, 22 - inset * 2, 3); g.fill(); };
  // A tile seen from the front: the board's two-tone paint under whatever stands or lies on it.
  tile(0, S.g1); g.strokeStyle = hexRgba(S.chalk, 0.35); g.lineWidth = 0.8; rrect(g, 4, 22, 36, 22, 3); g.stroke();
  if (sw.startsWith("tin:")) {
    const t = sw.slice(4), d = FOES[t];
    tin(g, 22, 42, d.boss ? 0.28 : t === "heavy" || t === "anchor" ? 0.37 : 0.42, TIN[t], { elite: d.elite, ring: d.boss ? "#b8322b" : null, mirror: t === "contra" });
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
  const [kind, what] = briefHi.split(":"), rm = fightRoom(F), a = reduced() ? 0.9 : 0.65 + Math.sin(now * 5) * 0.3;
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
