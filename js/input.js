// Lockstep page: keyboard, pointer and button handlers, then boot.

/* ---------- Input ---------- */
// After anything that changes a fight: fix what's new for its briefing and queue first-time notes, then save the
// profile once if either learned something. (Drawing only reads this; it never records or saves.)
function observeFight() {
  const F = R && R.fight;
  if (!F || F.over || F.kind === "drill") return;
  const a = briefAutoShows(F) && prepareBrief(F), b = noteCheck(F);
  if (a || b) saveProfile();
}
function act(fn) {
  // Your first move folds the briefing away.
  if (ui.briefOpen) closeBrief();
  const before = R && R.fight;
  visBefore = {}; for (const k of Object.keys(ui.vis)) visBefore[k] = { x: ui.vis[k].x, y: ui.vis[k].y };
  const prevPos = before ? new Map(before.enemies.map(e => [e.id, e.x + "," + e.y])) : new Map();
  const ok = fn();
  // Ripple: enemies that moved start in order from the front of the line, a few ms apart.
  const F = R && R.fight;
  if (F && ok) {
    const [dx, dy] = F.pdir || [0, 0], t0 = performance.now();
    const movers = F.enemies.filter(e => prevPos.has(e.id) && prevPos.get(e.id) !== e.x + "," + e.y).sort((a, b) => (b.x * dx + b.y * dy) - (a.x * dx + a.y * dy));
    movers.forEach((e, i) => { if (ui.vis[e.id]) ui.vis[e.id].delay = t0 + i * 35; });
    if (!reduced()) { nudge.x = dx * 4; nudge.y = dy * 4; }
  }
  ui.previewKey = "";
  flushSounds();
  if (before && before.over == null && R.fight && R.fight.over) setTimeout(() => SOUNDS[R.fight && R.fight.over === "win" ? "win" : "lose"](), 120);
  observeFight();
  render();
  return ok;
}
function doDir(dx, dy) {
  if (!R || R.screen !== "fight" || R.fight.over) return;
  if (ui.armed != null) {
    const slot = ui.armed, d = CARDS[R.hand[slot].id];
    if (!dx && !dy && d.dir) { ui.armed = null; render(); return; }
    const msg = game.cardBlock(slot, dx, dy);
    if (msg) { toast(msg); return; }
    ui.armed = null;
    act(() => game.play(slot, dx, dy));
  } else act(() => game.step(dx, dy));
}
function arm(slot) {
  if (!R || R.screen !== "fight" || R.fight.over) return;
  const c = R.hand[slot]; if (!c) return;
  if (c.cd > 0) { toast(`${CARDS[c.id].name} is ready in ${c.cd} turn${c.cd === 1 ? "" : "s"}.`); return; }
  if (!CARDS[c.id].dir) {
    const msg = game.cardBlock(slot, 0, 0); if (msg) { toast(msg); return; }
    ui.armed = null; act(() => game.play(slot, 0, 0)); return;
  }
  ui.armed = ui.armed === slot ? null : slot; ui.previewKey = ""; render();
}
const KEYS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], " ": [0, 0], ".": [0, 0] };
window.addEventListener("keydown", e => {
  const t = /** @type {HTMLElement} */ (e.target);
  if (["INPUT", "BUTTON", "SELECT", "TEXTAREA"].includes(t.tagName) && (e.key === " " || e.key === "Enter")) return;
  // Space or Enter on a focused briefing line lights it up on the board (Space would otherwise be Wait).
  const line = /** @type {HTMLElement} */ (t.closest && t.closest("#brief li[data-hi]"));
  if (line && (e.key === " " || e.key === "Enter")) { e.preventDefault(); setBriefHi(line.dataset.hi); return; }
  if (e.metaKey || e.ctrlKey || e.altKey || $("help").open) return;
  if (!R || R.screen !== "fight") return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k === "Escape") { const was = ui.briefOpen; if (was) closeBrief(); ui.armed = null; ui.previewKey = ""; render(); if (was) $("briefBtn").focus({ preventScroll: true }); return; }
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
cv.addEventListener("mousemove", ev => { if (R && R.fight && !R.fight.over) { const d = boardDir(ev); if (!ui.hover || d[0] !== ui.hover[0] || d[1] !== ui.hover[1]) { ui.hover = d; } } });
cv.addEventListener("mouseleave", () => { ui.hover = null; });
cv.addEventListener("click", ev => { if (R && R.fight && !R.fight.over) { const d = boardDir(ev); doDir(d[0], d[1]); } });
$("pad").addEventListener("click", ev => { const b = ev.target.closest("button"); if (!b) return; const [dx, dy] = b.dataset.d.split(",").map(Number); doDir(dx, dy); b.blur(); });
$("pad").addEventListener("mouseover", ev => { const b = ev.target.closest("button"); if (b) ui.hover = b.dataset.d.split(",").map(Number); });
$("pad").addEventListener("mouseleave", () => { ui.hover = null; });
$("hand").addEventListener("click", ev => { const b = ev.target.closest("button[data-slot]"); if (b) { arm(+b.dataset.slot); b.blur(); } });

$("chars").addEventListener("click", ev => { const b = ev.target.closest("[data-char]"); if (b && !b.disabled) { ui.pickChar = b.dataset.char; renderTitle(); } });
$("cads").addEventListener("click", ev => { const b = ev.target.closest("[data-cad]"); if (b && !b.disabled) { ui.pickCad = +b.dataset.cad; renderTitle(); } });
$("startBtn").addEventListener("click", () => { startRun(ui.pickChar, ui.pickCad); tone(330, 0.08, "triangle", 0.04); render(); });
$("resumeBtn").addEventListener("click", resumeRun);
$("quitBtn").addEventListener("click", () => { if (!R) return; game.quit(); render(); });
$("drillBtn").addEventListener("click", () => { startRun(ui.pickChar, ui.pickCad, true); tone(330, 0.08, "triangle", 0.04); render(); });
$("helpBtn").addEventListener("click", openHelp);
$("briefBtn").addEventListener("click", () => { ui.briefOpen = true; if (R && R.fight && prepareBrief(R.fight)) saveProfile(); render(); });
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
$("helpDrill").addEventListener("click", () => { $("help").close(); startRun(ui.pickChar, ui.pickCad, true); render(); });
$("muteBtn").addEventListener("click", () => { muted = !muted; try { localStorage.setItem("lockstep-muted", muted ? "1" : "0"); } catch (e) {} renderBar(); });

// A perk that completes a synergy leaves the "Synergy!" toast showing instead of covering it.
const synCount = () => (R.synSeen || []).length;
const perkToast = (id, n) => { if (synCount() === n) toast(`${ORDERS[id].name}: in effect for the rest of the run.`); };
function mapPick(k) { ui.briefOpen = false; if (game.enterNode(k)) { ui.vis = {}; ui.armed = null; ui.previewKey = ""; observeFight(); render(); } }
$("mapSvg").addEventListener("click", ev => { const g = ev.target.closest("[data-node]"); if (g) mapPick(g.dataset.node); });
$("mapSvg").addEventListener("keydown", ev => { if (ev.key !== "Enter" && ev.key !== " ") return; const g = ev.target.closest("[data-node]"); if (g) { ev.preventDefault(); mapPick(g.dataset.node); } });

// What the buttons on the page do. A button names its action with data-act="name", or carries its argument in
// one of the data attributes below (data-take="lunge", data-buy="2", ...). Each action changes the game; the page
// redraws afterwards, and an action may return a function to run after the redraw (to place focus, say).
const upgraded = slot => toast(`${CARDS[R.hand[slot].id].name} upgraded.`);
const ACTIONS = {
  claim: () => game.fightReward(),
  skipDrill: () => { game.fightReward(); toast("Drill skipped. Run it again any time from the title screen."); },
  noteOk: () => { ui.notes.shift(); },
  briefClose: () => { closeBrief(); return () => $("briefBtn").focus({ preventScroll: true }); },
  fallen: () => game.endRun(false),
  title: () => useRun(null),
  leave: () => game.leaveNode(),
  cancelReplace: () => game.cancelPending(),
  cancelShop: () => game.cancelPending(),
  heal: () => game.restHeal(),
  buyHeal: () => game.buyHeal(),
  buyHp: () => game.buyHp(),
  restock: () => { if (game.restock()) toast("The quartermaster brings out new stock."); },
  buyOrder: () => { const n = synCount(); if (game.buyOrder()) perkToast(R.shop.order.id, n); },
  // Actions with an argument, by data attribute.
  order: id => { const n = synCount(); if (game.takeRewardOrder(id)) perkToast(id, n); },
  take: id => game.takeCard(id),
  replace: slot => game.takeCard(R.reward.pending, +slot),
  up: slot => { if (game.claimUpgrade(+slot)) upgraded(+slot); },
  restup: slot => { const id = R.hand[+slot]?.id; if (game.restUpgrade(+slot)) toast(`${CARDS[id].name} upgraded.`); },
  buy: i => game.buyCard(+i),
  shopreplace: slot => game.buyCard(R.shop.pending.idx, +slot),
  buyup: slot => { if (game.buyUpgrade(+slot)) upgraded(+slot); },
  ev: i => game.chooseEvent(+i)
};
const ARG_ACTIONS = ["order", "take", "replace", "up", "restup", "buy", "shopreplace", "buyup", "ev"];
const ACTION_SELECTOR = ["[data-act]", ...ARG_ACTIONS.map(k => `[data-${k}]`)].join(",");
document.addEventListener("click", ev => {
  const t = /** @type {HTMLElement} */ (ev.target);
  if (t.closest('[data-act="helpOpen"]')) { openHelp(); return; }
  const b = /** @type {HTMLButtonElement} */ (t.closest(ACTION_SELECTOR));
  if (!b || b.disabled || !R) return;
  const d = b.dataset, arg = ARG_ACTIONS.find(k => d[k] != null);
  const fn = d.act ? ACTIONS[d.act] : ACTIONS[arg];
  if (!fn) return;
  const after = d.act ? fn() : fn(d[arg]);
  render();
  if (typeof after === "function") after();
});

// Continue: if anything about the save goes wrong while loading it, drop it and say so rather than break the page.
function resumeRun() {
  const run = savedRun();
  try {
    if (!run) throw new Error("unplayable save");
    useRun(run); ui.vis = {}; observeFight(); render();
  } catch (e) {
    clearSavedRun(); useRun(null); render();
    toast("That saved run can't be continued with this version of the game, so it was cleared.");
  }
}

/* ---------- Frame loop and boot ---------- */
function frame(t) {
  const dt = Math.min(0.05, (t - lastFrame) / 1000 || 0.016); lastFrame = t;
  if (!R && !$("sTitle").hidden && !document.hidden) drawTitle(t / 1000);
  if (R && R.screen === "fight" && !document.hidden) draw(dt);
  if (R && R.screen === "map" && !document.hidden) drawMap(t / 1000);
  requestAnimationFrame(frame);
}
function boot() {
  readColors();
  loadProfile();
  render();
  requestAnimationFrame(frame);
}
new ResizeObserver(() => { if (R && R.screen === "fight" && R.fight) { resize(); draw(0); } }).observe($("boardbox"));
document.fonts?.ready?.then(() => readColors());
boot();
