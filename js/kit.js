// Lockstep page: small helpers every page script uses, the page's shared UI state, and the screen registry.
// The page's classic scripts share one global scope and load in this order (index.html): rules.js, then kit, art,
// store, audio, screens, onboarding, briefing, board, mapboard, input. Code that runs at load may only use earlier
// files; later files' functions may be called once the page is running (from handlers, render and the frame loop).

/* ---------- Helpers ---------- */
/** @type {(id: string) => any} The page's elements by id (loosely typed: they are canvases, dialogs and inputs as much as plain elements). */
const $ = id => document.getElementById(id);
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const C = {};
function readColors() {
  for (const k of ["bg", "bg2", "floor", "floor2", "chalk", "wall", "pit", "ink", "muted", "brass", "cadet", "drone", "contra", "heavy", "elite", "boss", "good", "danger"]) C[k] = css("--" + k);
  C.wallTop = css("--wall-top"); C.wallSide = css("--wall-side");
}
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
let toastT;
function toast(msg) { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3200); }

/* ---------- Shared UI state ---------- */
// What the page remembers between redraws that isn't part of the run. Files read and write it as ui.x.
const ui = {
  armed: null,        // the card slot armed for a direction, or null
  hover: null,        // [dx, dy] under the pointer on the board or the pad, for the move preview
  previewKey: "",     // the preview cache key (board.js currentPreview)
  vis: {},            // where each piece is drawn (tweened toward the run's positions), by enemy id and "p"
  briefOpen: false,   // the briefing is open
  briefHi: null,      // the briefing line lit on the board ("e:drone", "t:pit", ...)
  notes: [],          // first-time notes waiting to show
  pickChar: "recruit", pickCad: 0  // the title screen's choices
};

/* ---------- Screens ---------- */
// render() draws the screen the run is on: SCREENS[R.screen], registered by the file that draws it (board.js for the
// fight, mapboard.js for the map), or the shared stage (screens.js) for reward, rest, shop, event and the run's end.
const SCREENS = {};
