// Lockstep page: keyboard, pointer and button handlers, then boot.

/* ---------- Input ---------- */
function act(fn) {
  // Your first move folds the briefing away.
  if (briefOpen) closeBrief();
  const before = R && R.fight;
  visBefore = {}; for (const k of Object.keys(vis)) visBefore[k] = { x: vis[k].x, y: vis[k].y };
  const prevPos = before ? new Map(before.enemies.map(e => [e.id, e.x + "," + e.y])) : new Map();
  const ok = fn();
  // Ripple: enemies that moved start in order from the front of the line, a few ms apart.
  const F = R && R.fight;
  if (F && ok) {
    const [dx, dy] = F.pdir || [0, 0], t0 = performance.now();
    const movers = F.enemies.filter(e => prevPos.has(e.id) && prevPos.get(e.id) !== e.x + "," + e.y).sort((a, b) => (b.x * dx + b.y * dy) - (a.x * dx + a.y * dy));
    movers.forEach((e, i) => { if (vis[e.id]) vis[e.id].delay = t0 + i * 35; });
    if (!reduced()) { nudge.x = dx * 4; nudge.y = dy * 4; }
  }
  pvKey = "";
  flushSounds();
  if (before && before.over == null && R.fight && R.fight.over) setTimeout(() => SOUNDS[R.fight && R.fight.over === "win" ? "win" : "lose"](), 120);
  render();
  return ok;
}
function doDir(dx, dy) {
  if (!R || R.screen !== "fight" || R.fight.over) return;
  if (armed != null) {
    const slot = armed, d = CARDS[R.hand[slot].id];
    if (!dx && !dy && d.dir) { armed = null; render(); return; }
    const msg = game.cardBlock(slot, dx, dy);
    if (msg) { toast(msg); return; }
    armed = null;
    act(() => game.play(slot, dx, dy));
  } else act(() => game.step(dx, dy));
}
function arm(slot) {
  if (!R || R.screen !== "fight" || R.fight.over) return;
  const c = R.hand[slot]; if (!c) return;
  if (c.cd > 0) { toast(`${CARDS[c.id].name} is ready in ${c.cd} turn${c.cd === 1 ? "" : "s"}.`); return; }
  if (!CARDS[c.id].dir) {
    const msg = game.cardBlock(slot, 0, 0); if (msg) { toast(msg); return; }
    armed = null; act(() => game.play(slot, 0, 0)); return;
  }
  armed = armed === slot ? null : slot; pvKey = ""; render();
}
const KEYS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], " ": [0, 0], ".": [0, 0] };
window.addEventListener("keydown", e => {
  if (["INPUT", "BUTTON", "SELECT", "TEXTAREA"].includes(e.target.tagName) && (e.key === " " || e.key === "Enter")) return;
  // Space or Enter on a focused briefing line lights it up on the board (Space would otherwise be Wait).
  const line = e.target.closest && e.target.closest("#brief li[data-hi]");
  if (line && (e.key === " " || e.key === "Enter")) { e.preventDefault(); setBriefHi(line.dataset.hi); return; }
  if (e.metaKey || e.ctrlKey || e.altKey || $("help").open) return;
  if (!R || R.screen !== "fight") return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k === "Escape") { const was = briefOpen; if (was) closeBrief(); armed = null; pvKey = ""; render(); if (was) $("briefBtn").focus({ preventScroll: true }); return; }
  if (["1", "2", "3", "4"].includes(k)) { e.preventDefault(); arm(+k - 1); return; }
  const d = KEYS[k]; if (!d) return;
  e.preventDefault(); doDir(d[0], d[1]);
});
function boardDir(ev) {
  const r = cv.getBoundingClientRect(), F = R.fight;
  const [gx, gy] = unproj((ev.clientX - r.left) / r.width * CW, (ev.clientY - r.top) / r.height * CH);
  const dx = gx - 0.5 - F.p.x, dy = gy - 0.5 - F.p.y;
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return [0, 0];
  return Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
}
cv.addEventListener("mousemove", ev => { if (R && R.fight && !R.fight.over) { const d = boardDir(ev); if (!hoverDir || d[0] !== hoverDir[0] || d[1] !== hoverDir[1]) { hoverDir = d; } } });
cv.addEventListener("mouseleave", () => { hoverDir = null; });
cv.addEventListener("click", ev => { if (R && R.fight && !R.fight.over) { const d = boardDir(ev); doDir(d[0], d[1]); } });
$("pad").addEventListener("click", ev => { const b = ev.target.closest("button"); if (!b) return; const [dx, dy] = b.dataset.d.split(",").map(Number); doDir(dx, dy); b.blur(); });
$("pad").addEventListener("mouseover", ev => { const b = ev.target.closest("button"); if (b) hoverDir = b.dataset.d.split(",").map(Number); });
$("pad").addEventListener("mouseleave", () => { hoverDir = null; });
$("hand").addEventListener("click", ev => { const b = ev.target.closest("button[data-slot]"); if (b) { arm(+b.dataset.slot); b.blur(); } });

$("chars").addEventListener("click", ev => { const b = ev.target.closest("[data-char]"); if (b && !b.disabled) { pickChar = b.dataset.char; renderTitle(); } });
$("cads").addEventListener("click", ev => { const b = ev.target.closest("[data-cad]"); if (b && !b.disabled) { pickCad = +b.dataset.cad; renderTitle(); } });
$("startBtn").addEventListener("click", () => { startRun(pickChar, pickCad); tone(330, 0.08, "triangle", 0.04); render(); });
$("resumeBtn").addEventListener("click", () => { try { useRun(adoptRun(JSON.parse(localStorage.getItem("lockstep-run")))); } catch (e) { useRun(null); } vis = {}; render(); });
$("quitBtn").addEventListener("click", () => { if (!R) return; if (R.screen === "fight" && R.fight) R.fight.over = "lose"; R.hp = Math.min(R.hp, 0); game.endRun(false); render(); });
$("drillBtn").addEventListener("click", () => { startRun(pickChar, pickCad, true); tone(330, 0.08, "triangle", 0.04); render(); });
$("helpBtn").addEventListener("click", openHelp);
$("briefBtn").addEventListener("click", () => { briefOpen = true; render(); });
// Pointing at (or focusing, or tapping) a briefing line lights up those pieces or tiles on the board.
const briefLine = ev => ev.target.closest && ev.target.closest("#brief li[data-hi]");
$("brief").addEventListener("mouseover", ev => { const li = briefLine(ev); if (li) setBriefHi(li.dataset.hi); });
// Only a real mouse leaving clears it: after a tap the browser fires a leave too, which would undo the tap.
$("brief").addEventListener("pointerleave", ev => { if (ev.pointerType === "mouse") setBriefHi(null); });
$("brief").addEventListener("focusin", ev => { const li = briefLine(ev); if (li) setBriefHi(li.dataset.hi); });
$("brief").addEventListener("click", ev => { const li = briefLine(ev); if (li) setBriefHi(li.dataset.hi); });
$("brief").addEventListener("change", ev => { if (ev.target.id === "briefAuto") setBriefAuto(ev.target.checked); });
for (const id of ["helpClose", "helpOk"]) $(id).addEventListener("click", () => $("help").close());
// A click on the dimmed backdrop (outside the dialog box) closes it too; Esc already does.
$("help").addEventListener("click", ev => { const r = $("help").getBoundingClientRect(); if (ev.target === $("help") && (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom)) $("help").close(); });
$("helpDrill").addEventListener("click", () => { $("help").close(); startRun(pickChar, pickCad, true); render(); });
$("muteBtn").addEventListener("click", () => { muted = !muted; try { localStorage.setItem("lockstep-muted", muted ? "1" : "0"); } catch (e) {} renderBar(); });

function mapPick(k) { briefOpen = false; if (game.enterNode(k)) { vis = {}; armed = null; pvKey = ""; render(); } }
$("mapSvg").addEventListener("click", ev => { const g = ev.target.closest("[data-node]"); if (g) mapPick(g.dataset.node); });
$("mapSvg").addEventListener("keydown", ev => { if (ev.key !== "Enter" && ev.key !== " ") return; const g = ev.target.closest("[data-node]"); if (g) { ev.preventDefault(); mapPick(g.dataset.node); } });

document.addEventListener("click", ev => {
  if (ev.target.closest('[data-act="helpOpen"]')) { openHelp(); return; }
  const b = ev.target.closest("[data-act],[data-take],[data-replace],[data-up],[data-restup],[data-buy],[data-buyup],[data-shopreplace],[data-ev],[data-order]");
  if (!b || b.disabled || !R) return;
  const a = b.dataset;
  if (a.act === "claim") { game.fightReward(); render(); return; }
  if (a.act === "skipDrill") { game.fightReward(); toast("Drill skipped. Run it again any time from the title screen."); render(); return; }
  if (a.act === "noteOk") { noteQueue.shift(); render(); return; }
  if (a.act === "briefClose") { closeBrief(); render(); $("briefBtn").focus({ preventScroll: true }); return; }
  if (a.act === "fallen") { game.endRun(false); render(); return; }
  if (a.act === "title") { useRun(null); render(); return; }
  if (a.act === "leave") { game.leaveNode(); render(); return; }
  if (a.act === "cancelReplace") { R.reward.pending = null; render(); return; }
  if (a.act === "heal") { game.restHeal(); render(); return; }
  if (a.act === "buyHeal") { game.buyHeal(); render(); return; }
  if (a.act === "buyHp") { game.buyHp(); render(); return; }
  if (a.act === "cancelShop") { R.shop.pending = null; render(); return; }
  if (a.act === "restock") { if (game.restock()) toast("The quartermaster brings out new stock."); render(); return; }
  if (a.act === "buyOrder") { if (game.buyOrder()) toast(`${ORDERS[R.shop.order.id].name}: in effect for the rest of the run.`); render(); return; }
  if (a.order) { if (!R.reward.tookOrder && game.takeOrder(a.order)) { R.reward.tookOrder = true; toast(`${ORDERS[a.order].name}: in effect for the rest of the run.`); } render(); return; }
  if (a.take) { game.takeCard(a.take); render(); return; }
  if (a.replace != null) { game.takeCard(R.reward.pending, +a.replace); render(); return; }
  if (a.up != null) { if (game.upgradeCard(+a.up)) { R.reward.upgrade = false; toast(`${CARDS[R.hand[+a.up].id].name} upgraded.`); } render(); return; }
  if (a.restup != null) { const id = R.hand[+a.restup]?.id; if (game.restUpgrade(+a.restup)) toast(`${CARDS[id].name} upgraded.`); render(); return; }
  if (a.buy != null) { game.buyCard(+a.buy); render(); return; }
  if (a.shopreplace != null) { game.buyCard(R.shop.pending.idx, +a.shopreplace); render(); return; }
  if (a.buyup != null) { if (game.buyUpgrade(+a.buyup)) toast(`${CARDS[R.hand[+a.buyup].id].name} upgraded.`); render(); return; }
  if (a.ev != null) { EVENTS[R.event].opts[+a.ev].go(game); game.leaveNode(); render(); return; }
});

/* ---------- Boot ---------- */
function boot() {
  readColors();
  loadProfile();
  render();
  requestAnimationFrame(frame);
}
new ResizeObserver(() => { if (R && R.screen === "fight" && R.fight) { resize(); draw(0); } }).observe($("boardbox"));
document.fonts?.ready?.then(() => readColors());
boot();
