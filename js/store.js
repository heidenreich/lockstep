// Lockstep page: the current game and run, and the player profile (kept in browser storage).
// Classic scripts sharing one global scope, loaded in order after rules.js: store, audio, screens, onboarding, board, mapboard, briefing, input.

/* ---------- The game ---------- */
// The page owns one game at a time (rules.js makeGame). R is its run, kept here for the many places that read it;
// set both through useRun() or a newRun on the game.
let P = mergeProfile({}), game = null, R = null;
// Board size of the current fight, for drawing.
let W = 9, H = 9;
const GAME_OPTS = { profile: () => P, hooks: { save: () => saveProfile(), toast: msg => toast(msg) } };
// The page's own notes about a fight (drill coach progress, briefing state) live under fight.ui; rules never read it.
const fightUi = F => F.ui || (F.ui = {});
function useRun(run) { game = run ? makeGame(run, GAME_OPTS) : null; R = run; return R; }
// Until a player has finished or skipped the training drill, their next run opens with it; the title screen can also start one.
function startRun(char, cad, drill) {
  const first = !P.drilled;
  game = makeGame(null, GAME_OPTS); R = game.newRun(char, cad);
  if (drill || first) game.startDrill();
  return R;
}

/* ---------- Profile storage ---------- */
// The profile lives in this browser's storage.
function saveProfile() {
  try { localStorage.setItem("lockstep-profile", JSON.stringify(P)); } catch (e) {}
}
// The saved run, brought up to date (rules.js migrateRun). A save the game can no longer play is cleared.
function savedRun() {
  let r = null;
  try { r = JSON.parse(localStorage.getItem("lockstep-run") || "null"); } catch (e) {}
  if (r == null) return null;
  const run = migrateRun(r);
  if (!run) clearSavedRun();
  return run;
}
function clearSavedRun() { try { localStorage.removeItem("lockstep-run"); } catch (e) {} }
// Continue: if anything about the save goes wrong while loading it, drop it and say so rather than break the page.
function resumeRun() {
  const run = savedRun();
  try {
    if (!run) throw new Error("unplayable save");
    useRun(run); vis = {}; observeFight(); render();
  } catch (e) {
    clearSavedRun(); useRun(null); render();
    toast("That saved run can't be continued with this version of the game, so it was cleared.");
  }
}
function loadProfile() {
  try { const s = localStorage.getItem("lockstep-profile"); if (s) P = mergeProfile(JSON.parse(s)); } catch (e) {}
}
