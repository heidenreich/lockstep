// Lockstep page: the training-drill coach, first-time notes and the How to play dialog.

/* ---------- Onboarding ---------- */
// Training drill steps. Progress lives on the fight (so it survives a reload) and each step stays done once done.
const DRILL_STEPS = [
  { id: "step", text: () => "You're the blue cadet on the brass tile. Take a step: the line copies you.", how: "Arrow keys or WASD, or tap a tile beside you." },
  { id: "pit", text: () => "Step left twice: the drone above you marches into the pit.", how: "Each pit holds 2 per fight, then fills." },
  { id: "free", text: () => "Step right until a drone is pinned on the edge. At 3 red marks it breaks free and chases you.", how: "A free enemy tilts inside a red scribble." },
  { id: "card", text: () => `Press 1 (or tap ${CARDS[R.hand[0].id].name}), then a direction. ${cardText(R.hand[0])}`, how: "Cards go on cooldown. Step is always free." },
  { id: "clear", text: () => "Now clear the room. Bump an enemy to hit it for 1.", how: `Real fights turn into a frenzy at turn ${FRENZY}.` }
];
function coachTrack(F) {
  const ui = fightUi(F), c = ui.coach = ui.coach || /** @type {any} */ ({});
  if (F.turn >= 1) c.step = true;
  if (F.pitKills >= 1) c.pit = true;
  if (F.enemies.some(e => e.free)) c.free = true;
  if (R.hand.some(h => h.cd > 0)) c.card = true;
  return c;
}
// First-time notes: the first time something turns up, the sergeant explains it once (remembered in the profile).
// Enemies explain themselves from their rule in FOES (rules.js); drones are left out, the drill teaches them.
const NOTES = {
  keg: ["Powder keg", "Blocks like a wall. Crash, shove or bump anything into it and it blows: 1 to everything beside it, and nearby kegs go too."],
  ice: ["Ice", "Anything that steps onto ice slides until something stops it, you included."],
  spike: ["Spikes", "Stepping onto spikes costs 1 health, for you and enemies alike. Bosses don't feel them."],
  belt: ["Conveyor belt", "At the end of each turn a belt carries whatever stands on it one tile, into pits too."],
  goal: ["Bonus", "Every room has a bonus on the slate. Carry it out for extra gold."],
  free: ["Broken free", "Blocked 3 turns running, it now chases you instead of copying you. Stay 4 tiles away for 4 turns and it falls back into step."],
  frenzy: ["Frenzy", `Turn ${FRENZY}: every enemy breaks free, and every third turn they run two steps. Finish rooms before this.`],
  combo: ["Combo", "Two or more down from one move pays extra gold and brings every card a turn closer."],
  pitfull: ["Pit full", "That pit has filled in. Each pit takes 2 per fight (3 for the Sapper)."],
  card: ["Cooldown", "A card you play goes on cooldown for a few turns. Step and wait are always free."]
};
// A note's [title, text]: from NOTES, or for an enemy (not drones) its name and rule.
function noteText(k) {
  if (NOTES[k]) return NOTES[k];
  const d = FOES[k];
  return d && k !== "drone" ? [d.boss ? "The " + d.name : cap(d.name), d.rule] : null;
}
function noteCheck(F) {
  const tiles = Object.values(fightRoom(F).tiles);
  const keys = [...F.enemies.map(e => e.type), F.kegs.length && "keg", tiles.includes("ice") && "ice", tiles.includes("spike") && "spike",
    tiles.some(t => BELT[t]) && "belt", F.goal && "goal", !F.frenzy && F.enemies.some(e => e.free && !foe(e).chaser) && "free",
    F.frenzy && F.kind !== "boss" && "frenzy", F.bestChain >= 2 && "combo", Object.values(F.pitFill).some(n => n >= R.pitHold) && "pitfull",
    R.hand.some(c => c.cd > 0) && "card"];
  let added = false;
  for (const k of keys) if (k && noteText(k) && !P.seen[k]) { ui.notes.push(k); P.seen[k] = true; added = true; }
  return added;
}
function renderCoach() {
  const box = $("coach"), F = R.fight;
  if (F.over) { box.hidden = true; ui.notes = []; return; }
  if (F.kind === "drill") {
    const c = coachTrack(F), i = DRILL_STEPS.findIndex(st => !c[st.id]), st = DRILL_STEPS[i];
    box.hidden = !st;
    if (st) box.innerHTML = `<div class="row"><span class="eyebrow">Training drill · ${i + 1} of ${DRILL_STEPS.length}</span><span class="steps">${DRILL_STEPS.map((_, j) => `<i class="${j <= i ? "on" : ""}"></i>`).join("")}</span></div>
      <p>${esc(st.text())}</p><div class="row"><span class="note hint">${esc(st.how)}</span><button class="btn ghost" data-act="skipDrill">Skip drill</button></div>`;
    return;
  }
  const k = ui.notes[0];
  box.hidden = !k;
  if (k) box.innerHTML = `<div class="row"><span class="eyebrow">New · ${esc(noteText(k)[0])}</span>${ui.notes.length > 1 ? `<span class="note hint">${ui.notes.length - 1} more</span>` : ""}</div>
    <p>${esc(noteText(k)[1])}</p><div class="row"><button class="btn ghost" data-act="helpOpen">How to play</button><button class="btn" data-act="noteOk">Got it</button></div>`;
}
// How to play: the rules in six lines and the line drawn as tin soldiers.
// The legend: you, then every enemy that isn't a boss, with how to spot it (FOES look).
const LEGEND = [["cadet", "You", "Blue coat, on the brass tile under the brass arrow."]]
  .concat(Object.entries(FOES).filter(([, d]) => !d.boss).map(([t, d]) => [t, cap(d.name), d.look]));
function openHelp() {
  const lg = $("helpLegend");
  if (!lg.childElementCount) {
    lg.innerHTML = LEGEND.map(([t, n, d]) => `<div><canvas data-tin="${t}" width="88" height="112"></canvas><span><b>${n}</b>${d}</span></div>`).join("");
    for (const c of lg.querySelectorAll("canvas")) {
      const g = c.getContext("2d"), t = c.dataset.tin, el = FOES[t] && FOES[t].elite;
      g.scale(2, 2); tin(g, 22, 50, t === "heavy" || t === "anchor" ? 0.42 : 0.5, TIN[t], { ring: t === "cadet" ? "#e0ac45" : null, elite: el, mirror: t === "contra", reloading: t === "rifle" });
    }
  }
  $("helpDrill").hidden = !!(R && R.screen !== "end");
  $("help").showModal();
}
