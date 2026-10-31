// Globals the type checker can't see declared in the scripts themselves.
// rules.js exports itself for Node when `module` exists.
declare var module: any;
// R, W and H need no declaration: js/store.js defines them with Object.defineProperty(globalThis, ...), and the type
// checker reads their types from those getters (R is a Run, from types/game.d.ts, through the typed `game`).
