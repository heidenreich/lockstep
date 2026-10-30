// Globals the type checker can't see declared in the scripts themselves.
// rules.js exports itself for Node when `module` exists.
declare var module: any;
// js/store.js defines these as read-only views of the current game (Object.defineProperty on globalThis).
declare const R: any;
declare const W: number;
declare const H: number;
