// Lockstep page: the current game and run, and the player profile and saved run (kept in browser storage).

/* ---------- The game ---------- */
// The page owns one game at a time (rules.js makeGame): set it with useRun() or startRun().
let P = mergeProfile({});
/** @type {ReturnType<typeof makeGame> | null} */
let game = null;
// R (the run) and W, H (the board size of its fight) are read-only views of the current game, so they can't drift.
Object.defineProperty(globalThis, "R", { get: () => game ? game.run : null });
Object.defineProperty(globalThis, "W", { get: () => game ? game.W : 9 });
Object.defineProperty(globalThis, "H", { get: () => game ? game.H : 9 });
const GAME_OPTS = { profile: () => P, hooks: { save: () => saveProfile(), toast: msg => toast(msg) } };
// The page's own notes about a fight (drill coach progress, briefing state) live under fight.ui; rules never read it.
const fightUi = F => F.ui || (F.ui = {});
function useRun(run) { game = run ? makeGame(run, GAME_OPTS) : null; return R; }
// Until a player has finished or skipped the training drill, their next run opens with it; the title screen can also start one.
function startRun(char, cad, drill) {
  const first = !P.drilled;
  game = makeGame(null, GAME_OPTS); game.newRun(char, cad);
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
function loadProfile() {
  try { const s = localStorage.getItem("lockstep-profile"); if (s) P = mergeProfile(JSON.parse(s)); } catch (e) {}
}
