// Lockstep page: synth sounds and the drum cadence under fights.

/* ---------- Audio ---------- */
let actx = null, muted = false;
try { muted = localStorage.getItem("lockstep-muted") === "1"; } catch (e) {}
function audio() { try { actx = actx || new (window.AudioContext || /** @type {any} */ (window).webkitAudioContext)(); } catch (e) {} return actx; }
function tone(freq, dur, type, vol, slide, at) {
  if (muted || !audio()) return;
  try {
    const t = at || actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
    o.type = type || "square"; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(vol || 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
  } catch (e) {}
}
let noiseBuf = null;
// Field drums: noise through a filter for snares and hats, a falling sine for kicks and toms.
function drum(kind, at, vol) {
  if (muted || !audio()) return;
  try {
    const t = at || actx.currentTime;
    if (kind === "kick" || kind === "tom") { tone(kind === "kick" ? 120 : 170, kind === "kick" ? 0.16 : 0.12, "sine", vol, kind === "kick" ? 42 : 90, t); return; }
    if (!noiseBuf) { noiseBuf = actx.createBuffer(1, actx.sampleRate * 0.4, actx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const src = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain(), dur = kind === "hat" ? 0.035 : kind === "boom" ? 0.45 : 0.1;
    src.buffer = noiseBuf;
    f.type = kind === "hat" ? "highpass" : kind === "boom" ? "lowpass" : "bandpass";
    f.frequency.value = kind === "hat" ? 7000 : kind === "boom" ? 600 : 1800;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(actx.destination); src.start(t); src.stop(t + dur + 0.02);
    if (kind === "snare") tone(190, 0.06, "triangle", vol * 0.6, 150, t);
  } catch (e) {}
}
const SOUNDS = {
  step: () => drum("snare", 0, 0.05),
  march: () => drum("tom", 0, 0.07),
  thunk: () => { tone(210, 0.07, "triangle", 0.06, 120); drum("kick", 0, 0.05); },
  hit: () => tone(320, 0.08, "square", 0.04, 160),
  hurt: () => tone(110, 0.18, "sawtooth", 0.05, 60),
  fall: () => tone(520, 0.32, "triangle", 0.05, 90),
  spike: () => tone(900, 0.05, "square", 0.025, 600),
  shot: () => { drum("snare", 0, 0.12); tone(1400, 0.06, "square", 0.03, 300); },
  boom: () => { drum("boom", 0, 0.14); drum("kick", 0, 0.12); },
  card: () => { tone(440, 0.05, "triangle", 0.04); setTimeout(() => tone(660, 0.06, "triangle", 0.04), 50); },
  combo: () => [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => tone(f, 0.1, "square", 0.03), i * 55)),
  quake: () => { tone(70, 0.25, "sawtooth", 0.06, 40); drum("kick", 0, 0.1); },
  frenzy: () => tone(240, 0.3, "square", 0.04, 480),
  win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.12, "triangle", 0.05), i * 90)),
  lose: () => [392, 311, 233].forEach((f, i) => setTimeout(() => tone(f, 0.2, "triangle", 0.05), i * 140))
};
function flushSounds() { if (!game) return; const seen = new Set(); for (const s of game.drainSfx()) if (!seen.has(s)) { seen.add(s); SOUNDS[s] && SOUNDS[s](); } }
// A quiet marching cadence under every fight: it picks up hi-hats when anything breaks step, and doubles in a frenzy.
let musicNext = 0, musicBeat = 0;
function musicTick() {
  if (!actx || muted || !R || R.screen !== "fight" || !R.fight || R.fight.over || document.hidden) { musicNext = 0; return; }
  const F = R.fight, hot = F.frenzy, beat = hot ? 0.15 : 0.24, loose = F.enemies.some(e => e.free);
  if (musicNext < actx.currentTime) musicNext = actx.currentTime + 0.05;
  while (musicNext < actx.currentTime + 0.2) {
    const b = musicBeat % 8;
    if (b === 0 || b === 4) drum("kick", musicNext, 0.045);
    if (b === 2 || b === 6) drum("snare", musicNext, 0.02);
    if ((loose || hot) && b % 2 === 1) drum("hat", musicNext, 0.012);
    if (hot && b === 7) drum("snare", musicNext, 0.016);
    musicNext += beat; musicBeat++;
  }
}
setInterval(musicTick, 60);
