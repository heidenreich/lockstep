// Lockstep page: the current game and run, and the player profile (kept in browser storage).
// Classic scripts sharing one global scope, loaded in order after rules.js: store, audio, screens, onboarding, board, mapboard, briefing, input.

/* ---------- The game ---------- */
// The page owns one game at a time (rules.js makeGame). R is its run, kept here for the many places that read it;
// set both through useRun() or a newRun on the game.
let P = mergeProfile({}), game = null, R = null;
// Board size of the current fight, for drawing.
let W = 9, H = 9;
const GAME_OPTS = { profile: () => P, hooks: { save: () => saveProfile(), toast: msg => toast(msg) } };
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
// Runs saved before the seeded RNG have no RNG state; give them one.
function adoptRun(r) {
  if (r && r.rng == null) { r.seed = newSeed(); r.rng = r.seed | 0; }
  return r;
}
function loadProfile() {
  try { const s = localStorage.getItem("lockstep-profile"); if (s) P = mergeProfile(JSON.parse(s)); } catch (e) {}
}
