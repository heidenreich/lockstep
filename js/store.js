// Lockstep page: the current game and run, the player profile (account or browser storage), the anonymous play tally.
// Classic scripts sharing one global scope, loaded in order after rules.js: store, audio, screens, onboarding, board, input.

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
  tally("run", { char, cad, drill: !!(drill || first) });
  return R;
}

/* ---------- Profile storage ---------- */
let store = { kind: "local" };
let saving = Promise.resolve();
function saveProfile() {
  const body = JSON.parse(JSON.stringify(P));
  saving = saving.then(async () => {
    try { if (store.kind === "db") { await store.ref.set(body); return; } } catch (e) {}
    try { localStorage.setItem("lockstep-profile", JSON.stringify(body)); } catch (e) {}
  });
}
// Runs saved before the seeded RNG have no RNG state; give them one.
function adoptRun(r) {
  if (r && r.rng == null) { r.seed = newSeed(); r.rng = r.seed | 0; }
  return r;
}
async function initStore() {
  try { const s = localStorage.getItem("lockstep-profile"); if (s) P = mergeProfile(JSON.parse(s)); } catch (e) {}
  try {
    const user = window.claude?.use ? await window.claude.use("user") : null;
    const id = user ? await user.id() : null;
    const db = id ? await window.claude.use("db") : null;
    if (db) {
      const ref = db.doc("data/users/" + id + "/profile");
      store = { kind: "db", ref, db, owner: !!(await user.isOwner().catch(() => false)) };
      // Keep progress from both copies: this browser's (and anything earned while the account loaded) and the account's.
      const snap = await ref.get();
      if (snap.exists) P = combineProfiles(P, snap.data());
      saveProfile();
      tally("open");
    }
  } catch (e) { store = { kind: "local" }; }
  if (R == null) renderTitle();
}
// Anonymous play counter: one small shared document per event, with no player id (the owner's own plays are
// flagged so they can be left out). Read it back with the artifact's database; nothing on the page shows it.
function tally(k, extra) {
  if (store.kind !== "db") return;
  const id = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  store.db.doc("tally/" + id).set(Object.assign({ k, day: new Date().toISOString().slice(0, 10), owner: store.owner }, extra || {})).catch(() => {});
}
