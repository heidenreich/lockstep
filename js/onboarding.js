// Lockstep page: the training-drill coach, first-time notes and the How to play dialog.

/* ---------- Onboarding ---------- */
// Training drill steps. Progress lives on the fight (so it survives a reload) and each step stays done once done.
const DRILL_STEPS = [
  { id: "step", text: () => "You're the blue cadet on the brass tile. Take a step: the line copies you.", how: "Arrow keys or WASD, or tap a tile beside you." },
  { id: "pit", text: () => "Step left twice: the drone above you marches into the pit.", how: "Each pit holds 2 per fight, then fills." },
  { id: "free", text: () => "Step right until a drone is pinned on the edge. At 3 red marks it breaks free and chases you.", how: "A free enemy tilts inside a red scribble." },
  { id: "card", text: () => `Press 1 (or tap ${CARDS[R.hand[0].id].name}), then a direction. ${cardText(R.hand[0])}`, how: "Cards go on cooldown. Step is always free." },
  { id: "clear", text: () => "Now clear the room. Bump an enemy to hit it for 1.", how: "Real fights turn into a frenzy at turn 30." }
];
function coachTrack(F) {
  const c = F.coach = F.coach || {};
  if (F.turn >= 1) c.step = true;
  if (F.pitKills >= 1) c.pit = true;
  if (F.enemies.some(e => e.free)) c.free = true;
  if (R.hand.some(h => h.cd > 0)) c.card = true;
  return c;
}
// First-time notes: the first time something turns up, the sergeant explains it once (remembered in the profile).
const NOTES = {
  contra: ["Contrarian", "Violet coats step the opposite way to you. Step toward a pit to send them away from it."],
  heavy: ["Heavy", "Orange grenadiers hit for 2, take 2 hits, and only move every other turn, so they fall out of line."],
  rifle: ["Rifleman", "Riflemen hold their ground, reload for 2 turns, then fire along their row or column. Walls stop the shot; anything else in the way takes it."],
  runner: ["Runner", "An elite that moves 2 for each of your steps."],
  anchor: ["Anchor", "An elite that never moves and strikes anything beside it. Once its line is gone it falls into step."],
  colossus: ["The Colossus", "A giant heavy: 8 health, hits for 2. A pit deals it 3 and it climbs back out. A drone joins every 6 turns."],
  mirror: ["The Mirror", "A giant contrarian. Every 5 turns it flips the cadence: for 5 turns everyone moves the other way. It seals any pit it climbs out of."],
  warden: ["The Warden", "It chases every other turn and marches in step on the turns between (the slate says which). Step it into a pit then."],
  keg: ["Powder keg", "Blocks like a wall. Crash, shove or bump anything into it and it blows: 1 to everything beside it, and nearby kegs go too."],
  ice: ["Ice", "Anything that steps onto ice slides until something stops it, you included."],
  spike: ["Spikes", "Stepping onto spikes costs 1 health, for you and the line alike. Bosses don't feel them."],
  belt: ["Conveyor belt", "At the end of each turn a belt carries whatever stands on it one tile, into pits too."],
  goal: ["Bonus order", "Every room has a bonus order on the slate. Carry it out for extra gold."],
  free: ["Broken free", "Blocked 3 turns running, it now chases you instead of copying you. Stay 4 tiles away for 4 turns and it falls back into step."],
  frenzy: ["Frenzy", "Turn 30: every enemy breaks free, and every third turn they run two steps. Finish rooms before this."],
  combo: ["Combo", "Two or more down from one move pays extra gold and brings every card a turn closer."],
  pitfull: ["Pit full", "That pit has filled in. Each pit takes 2 per fight (3 for the Sapper)."],
  card: ["Cooldown", "A card you play goes on cooldown for a few turns. Step and wait are always free."]
};
let noteQueue = [];
function noteCheck(F) {
  const tiles = Object.values(ROOMS[F.room].tiles);
  const keys = [...F.enemies.map(e => e.type), F.kegs.length && "keg", tiles.includes("ice") && "ice", tiles.includes("spike") && "spike",
    tiles.some(t => BELT[t]) && "belt", F.goal && "goal", !F.frenzy && F.enemies.some(e => e.free && !foe(e).chaser) && "free",
    F.frenzy && F.kind !== "boss" && "frenzy", F.bestChain >= 2 && "combo", Object.values(F.pitFill).some(n => n >= R.pitHold) && "pitfull",
    R.hand.some(c => c.cd > 0) && "card"];
  let added = false;
  for (const k of keys) if (k && NOTES[k] && !P.seen[k]) { noteQueue.push(k); P.seen[k] = true; added = true; }
  if (added) saveProfile();
}
function renderCoach() {
  const box = $("coach"), F = R.fight;
  if (F.over) { box.hidden = true; noteQueue = []; return; }
  if (F.kind === "drill") {
    const c = coachTrack(F), i = DRILL_STEPS.findIndex(st => !c[st.id]), st = DRILL_STEPS[i];
    box.hidden = !st;
    if (st) box.innerHTML = `<div class="row"><span class="eyebrow">Training drill · ${i + 1} of ${DRILL_STEPS.length}</span><span class="steps">${DRILL_STEPS.map((_, j) => `<i class="${j <= i ? "on" : ""}"></i>`).join("")}</span></div>
      <p>${esc(st.text())}</p><div class="row"><span class="note hint">${esc(st.how)}</span><button class="btn ghost" data-act="skipDrill">Skip drill</button></div>`;
    return;
  }
  noteCheck(F);
  const k = noteQueue[0];
  box.hidden = !k;
  if (k) box.innerHTML = `<div class="row"><span class="eyebrow">New · ${esc(NOTES[k][0])}</span>${noteQueue.length > 1 ? `<span class="note hint">${noteQueue.length - 1} more</span>` : ""}</div>
    <p>${esc(NOTES[k][1])}</p><div class="row"><button class="btn ghost" data-act="helpOpen">How to play</button><button class="btn" data-act="noteOk">Got it</button></div>`;
}
// How to play: the rules in six lines and the line drawn as tin soldiers.
const LEGEND = [["cadet", "You", "Blue coat, on the brass tile under the brass arrow."], ["drone", "Drone", "Steps with you. 1 health."], ["contra", "Contrarian", "Sideways bicorne, back turned: steps the opposite way."],
  ["heavy", "Heavy", "Hits for 2, moves every other turn. 2 health."], ["rifle", "Rifleman", "Feathered hat, kneeling. Rifle up: reloading. Level: fires its row and column."],
  ["runner", "Runner", "Elite hussar in a busby, mid-stride. Moves 2 per step."], ["anchor", "Anchor", "Elite in a crested helmet on a stone block. Never moves; strikes beside it."]];
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
