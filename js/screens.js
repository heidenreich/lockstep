// Lockstep page: shared HTML helpers (cards, offers, glyphs) and the title, map, reward, shop, rest, event and end screens.

/* ---------- Rendering: shared ---------- */

function cardText(c) { const d = CARDS[c.id]; return c.up && d.textUp ? d.textUp : d.text; }
function cardCd(c) { const d = CARDS[c.id]; return c.up ? d.cdUp : d.cd; }

// Each card's icon is a tiny diagram: you (cream) on top, the enemy line (red) below, arrows for who moves.
const sv = {
  dot: (x, y, c, r) => `<circle cx="${x}" cy="${y}" r="${r || 4}" style="fill:var(--${c})"/>`,
  ring: (x, y, c, r, dash) => `<circle cx="${x}" cy="${y}" r="${r}" style="fill:none;stroke:var(--${c});stroke-width:1.6${dash ? ";stroke-dasharray:2 2" : ""}"/>`,
  arrow: (x1, y1, x2, y2, c) => {
    const a = Math.atan2(y2 - y1, x2 - x1), h = 4.5;
    const p = s => `${(x2 - h * Math.cos(a + s)).toFixed(1)} ${(y2 - h * Math.sin(a + s)).toFixed(1)}`;
    return `<path d="M${x1} ${y1}L${x2} ${y2}M${p(-0.55)}L${x2} ${y2}L${p(0.55)}" style="fill:none;stroke:var(--${c});stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round"/>`;
  },
  hold: (x, y) => `<path d="M${x} ${y - 4}V${y + 4}M${x + 4} ${y - 4}V${y + 4}" style="stroke:var(--muted);stroke-width:2;stroke-linecap:round"/>`,
  line: (d, c, w) => `<path d="${d}" style="fill:none;stroke:var(--${c});stroke-width:${w || 2};stroke-linecap:round;stroke-linejoin:round"/>`
};
const ICONS = {
  sidestep: () => sv.dot(9, 12, "cadet") + sv.arrow(14, 12, 30, 12, "cadet") + sv.dot(10, 29, "drone") + sv.dot(22, 29, "drone") + sv.hold(30, 29),
  stomp: () => sv.dot(20, 11, "cadet") + sv.ring(20, 11, "cadet", 7, true) + sv.dot(7, 29, "drone") + sv.dot(17, 29, "drone") + sv.arrow(21, 29, 34, 29, "drone"),
  doubletime: () => sv.dot(8, 11, "cadet") + sv.arrow(13, 11, 24, 11, "cadet") + sv.dot(7, 29, "drone") + sv.arrow(12, 29, 24, 29, "drone") + sv.arrow(21, 29, 34, 29, "drone"),
  aboutface: () => sv.dot(8, 11, "cadet") + sv.arrow(13, 11, 27, 11, "cadet") + sv.dot(33, 29, "drone") + sv.arrow(28, 29, 13, 29, "drone"),
  lunge: () => sv.dot(6, 20, "cadet") + sv.arrow(11, 20, 25, 20, "cadet") + sv.dot(31, 20, "drone", 4.5) + sv.line("M31 11V14M38 13L35 16M38 27L35 24M31 29V26", "brass", 1.8),
  shove: () => sv.dot(7, 20, "cadet") + sv.dot(16, 20, "drone") + sv.arrow(21, 20, 34, 20, "brass") + sv.line("M11 15L12 17M11 25L12 23", "brass", 1.6),
  quake: () => `<rect x="32" y="5" width="5" height="30" rx="1.5" style="fill:var(--wall-top)"/>` + sv.dot(8, 20, "cadet") + sv.dot(26, 12, "drone") + sv.dot(26, 28, "drone") + sv.line("M19 6L22 10L18 14L22 18L18 22L22 26L18 30L21 34", "brass", 1.8),
  magnet: () => sv.dot(20, 20, "cadet") + sv.ring(20, 20, "cadet", 7, true) + [[5, 5], [35, 5], [5, 35], [35, 35]].map(([x, y]) => sv.dot(x, y, "drone", 3.2) + sv.arrow(x + (20 - x) * 0.25, y + (20 - y) * 0.25, x + (20 - x) * 0.58, y + (20 - y) * 0.58, "drone")).join(""),
  recall: () => sv.dot(9, 20, "drone") + sv.ring(9, 20, "danger", 7) + sv.arrow(17, 20, 26, 20, "muted") + sv.dot(32, 20, "drone"),
  trapdoor: () => sv.dot(9, 20, "cadet") + `<ellipse cx="27" cy="21" rx="9" ry="6" style="fill:var(--pit);stroke:var(--brass);stroke-width:1.6;stroke-dasharray:3 2"/>` + sv.arrow(27, 4, 27, 14, "drone"),
  brace: () => `<path d="M20 5L32 9V19C32 27 26 32 20 35C14 32 8 27 8 19V9Z" style="fill:none;stroke:var(--good);stroke-width:2;stroke-linejoin:round"/>` + sv.dot(20, 19, "cadet") + sv.line("M3 19H6M34 19H37", "drone", 2)
};
const cardIcon = id => `<svg viewBox="0 0 40 40" aria-hidden="true">${ICONS[id] ? ICONS[id]() : ""}</svg>`;
function cardHTML(c, i, opts) {
  const o = opts || {}, d = CARDS[c.id];
  const cls = ["card", o.cls || "", c.cd > 0 && o.inFight ? "cooling" : "", o.armed ? "ui.armed" : ""].join(" ");
  const cd = o.inFight ? (c.cd > 0 ? `${c.cd} turn${c.cd === 1 ? "" : "s"}` : "ready") : `cd ${cardCd(c)}`;
  const key = o.inFight ? `<span class="k">${i + 1}</span>` : "";
  // Upgrade pickers show what drilling the card changes; a disabled pick says why.
  const note = o.upgrade ? `<span class="upn">${c.up ? "Already drilled" : esc(upNote(c))}</span>` : "";
  return `<button class="${cls}" data-slot="${i}"${o.disabled ? " disabled" : ""}><span class="ico">${cardIcon(c.id)}${key}</span><span class="nm">${esc(d.name)}${c.up ? '<span class="up">+</span>' : ""}</span><span class="tx">${esc(cardText(c))}</span><span class="cd">${cd}</span>${note}${o.inFight ? "" : synNote("card", c.id)}${tagHTML(o.price, o.why)}</button>`;
}
const UP_GAIN = { lunge: "first hit deals 3", shove: "knocks back 3" };
const upNote = c => { const d = CARDS[c.id]; return d.cdUp < d.cd ? `Drilled: cooldown ${d.cd} → ${d.cdUp}` : `Drilled: ${UP_GAIN[c.id] || "stronger"}`; };
const tagHTML = (price, why) => price || why ? `<span class="tag${why ? " why" : ""}">${esc(why || price)}</span>` : "";
const needGold = price => R.gold < price ? `Need ${price - R.gold} more gold` : "";
// Everything you can take or buy is a paper card: move cards, supplies and perks alike.
function offerHTML(id, attrs, price, why) {
  const d = CARDS[id];
  return `<button class="card pick offer" ${attrs}${why ? " disabled" : ""}><span class="ico">${cardIcon(id)}</span><span class="nm">${esc(d.name)}</span><span class="tx">${esc(d.text)}</span><span class="cd">cd ${d.cd}</span>${synNote("card", id, true)}${tagHTML(price, why)}</button>`;
}
// Synergies: a held pair is marked on its card and perk; an offer says which of your pieces it would pair with.
function synNote(kind, id, offer) {
  if (!R) return "";
  const orders = R.orders || [], has = s => R.hand.some(c => c.id === s.card) && orders.includes(s.order);
  const s = Object.values(SYNERGIES).find(s => s[kind] === id && (offer ? (kind === "card" ? orders.includes(s.order) : R.hand.some(c => c.id === s.card)) : has(s)));
  if (!s) return "";
  const partner = kind === "card" ? ORDERS[s.order].name : CARDS[s.card].name;
  return `<span class="syn">★ ${esc(s.name)}${offer ? ` with your ${esc(partner)}` : ""}: ${esc(s.text)}</span>`;
}
const ITEM_ICONS = {
  heal: `<rect x="15" y="7" width="10" height="26" rx="2" style="fill:var(--drone)"/><rect x="7" y="15" width="26" height="10" rx="2" style="fill:var(--drone)"/>`,
  hp: `<circle cx="20" cy="22" r="10" style="fill:#e0ac45;stroke:#8a6420;stroke-width:2"/><path d="M20 4V12M14 6L20 12L26 6" style="fill:none;stroke:var(--drone);stroke-width:3;stroke-linecap:round"/><path d="M20 17V27M15 22H25" style="stroke:#8a6420;stroke-width:2.4;stroke-linecap:round"/>`,
  seal: `<circle cx="20" cy="20" r="13" style="fill:#9b2a22"/><circle cx="20" cy="20" r="9" style="fill:none;stroke:#c9473c;stroke-width:1.5"/><path d="M20 13L22 18H27L23 21L24.5 26L20 23L15.5 26L17 21L13 18H18Z" style="fill:#e8b0a0"/>`,
  rest: () => `<g transform="translate(5 5) scale(1.5)"><path d="${GLYPHS.rest}" style="fill:none;stroke:var(--heavy);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round"/></g>`,
  event: () => `<g transform="translate(5 5) scale(1.5)"><path d="${GLYPHS.event}" style="fill:none;stroke:var(--ink);stroke-width:2;stroke-linecap:round"/></g>`
};
const itemIcon = k => typeof ITEM_ICONS[k] === "function" ? ITEM_ICONS[k]() : ITEM_ICONS[k];
const itemHTML = o => `<button class="card pick offer${o.cls ? " " + o.cls : ""}" ${o.attrs}${o.why ? " disabled" : ""}><span class="ico"><svg viewBox="0 0 40 40" aria-hidden="true">${itemIcon(o.ico)}</svg></span><span class="nm">${esc(o.name)}</span><span class="tx">${esc(o.text)}</span>${o.extra || ""}${tagHTML(o.price, o.why)}</button>`;
const orderChip = id => `<span class="ribbon" title="${esc(ORDERS[id].text)}"><b>${esc(ORDERS[id].name)}</b> <span>${esc(ORDERS[id].text)}</span>${synNote("order", id)}</span>`;
const orderOfferHTML = (id, attrs, price, why) => itemHTML({ cls: "order", attrs, ico: "seal", name: ORDERS[id].name, text: ORDERS[id].text, extra: synNote("order", id, true), price, why });
function goalLine(F) {
  const g = F.goal; if (!g) return "";
  const G = GOALS[g.id];
  const state = !g.ok ? "lost" : g.id === "unhurt" ? "unhurt" : g.id === "pits" ? `${Math.min(F.pitKills, G.need)}/${G.need}` : g.id === "quick" ? `${Math.max(0, G.by - F.turn)} turns left` : g.id === "colours" ? (g.took ? "taken" : "flag flying") : "holding";
  return `<span${g.ok ? "" : ' class="warn"'}>Bonus · <b>${esc(G.name)}</b> (+${G.gold}): ${state}</span>`;
}
const GLYPHS = {
  fight: "M4 16L16 4M12 4H16V8M4 4L16 16M4 12V16H8",
  elite: "M10 2.5L12.3 7.6L17.8 8.1L13.6 11.8L14.9 17.2L10 14.4L5.1 17.2L6.4 11.8L2.2 8.1L7.7 7.6Z",
  rest: "M10 2.5C13.5 7 15.5 10 13.8 14A4.2 4.2 0 0 1 6.2 14C4.8 10.8 7 8.6 8 6.5C8.8 8.5 10 9 10.5 9.5C11 7.2 10.8 5 10 2.5ZM5 17.5H15",
  shop: "M10 3A7 7 0 1 0 10.01 3ZM10 6.5V13.5M7.8 8.3C8.2 7 11.8 7 12.2 8.3C12.6 10 7.4 10 7.8 11.7C8.2 13 11.8 13 12.2 11.7",
  event: "M7 7.2A3 3 0 1 1 11.2 9.9C10.3 10.5 10 11.2 10 12.5M10 15.8V16",
  boss: "M3 15.5L4 6L8 10L10 4L12 10L16 6L17 15.5ZM3 17.5H17"
};

// Switching screens starts the new one at the top (a scrolled map would otherwise open the fight half off-screen).
function show(id) {
  if (!$(id).hidden) return;
  for (const s of ["sTitle", "sMap", "sFight", "sStage"]) $(s).hidden = s !== id;
  window.scrollTo(0, 0);
}
function renderBar() {
  $("quitBtn").hidden = !R || R.screen === "end";
  $("muteBtn").textContent = muted ? "Sound off" : "Sound on";
  $("muteBtn").setAttribute("aria-pressed", String(muted));
  if (!R) { $("runStats").innerHTML = ""; return; }
  $("runStats").innerHTML = `<span>${esc(CHARS[R.char].name)}${R.cad ? ` · C${R.cad}` : ""}</span><span class="hpv" title="Health ${R.hp}/${R.maxhp}">Health <span class="medals" aria-label="${R.hp} of ${R.maxhp}">${Array.from({ length: R.maxhp }, (_, i) => `<i class="medal${i < R.hp ? "" : " lost"}"></i>`).join("")}</span></span><span class="gold">Gold <b>${R.gold}</b></span><span>Act <b>${R.act}</b></span>`;
}
function saveRun() { try { if (R && R.screen !== "end") localStorage.setItem("lockstep-run", JSON.stringify(R)); else localStorage.removeItem("lockstep-run"); } catch (e) {} }

function applyTheme() {
  if (R) document.body.dataset.act = String(R.act); else delete document.body.dataset.act;
  readColors();
  if (R) Object.assign(C, ACT_THEME[R.act - 1]);
}
function render() {
  applyTheme();
  renderBar();
  if (!R) { renderTitle(); return; }
  saveRun();
  (SCREENS[R.screen] || renderStage)();
}

/* ---------- Title ---------- */
function renderTitle() {
  show("sTitle"); renderBar();
  if (!P.chars[ui.pickChar]) ui.pickChar = "recruit";
  $("chars").innerHTML = Object.entries(CHARS).map(([id, c]) => {
    const has = P.chars[id];
    return `<button class="char ${ui.pickChar === id ? "on" : ""} ${has ? "" : "locked"}" data-char="${id}"${has ? "" : " disabled"}><span class="nm">${esc(c.name)}</span><span class="meta">${c.hp} health · ${c.slots} card slots</span><span class="muted">${esc(has ? c.blurb : "Locked. " + c.unlock + ".")}</span></button>`;
  }).join("");
  const maxCad = P.cad[ui.pickChar] || 0;
  ui.pickCad = Math.min(ui.pickCad, maxCad);
  $("cads").innerHTML = CADENCE.map((_, i) => `<button data-cad="${i}" class="${i === ui.pickCad ? "on" : ""}"${i > maxCad ? " disabled" : ""}>${i === 0 ? "Off" : "C" + i}</button>`).join("");
  $("cadNote").textContent = ui.pickCad ? CADENCE.slice(1, ui.pickCad + 1).map(c => c.text.slice(4)).join(" ") : (maxCad ? "Win runs to climb the ladder." : "Win a run to unlock Cadence 1.");
  $("resumeBtn").hidden = !savedRun();
  $("newHere").hidden = !!P.drilled;
  $("saveNote").textContent = "Unlocks are saved in this browser.";
  $("record").innerHTML = [
    `<span>Runs <b>${P.runs}</b> · wins <b>${P.wins}</b> · falls <b>${P.deaths}</b></span>`,
    `<span>Furthest act <b>${P.bestAct || "–"}</b></span>`,
    `<span>Bosses beaten <b>${BOSSES.filter(b => P.beat[b]).map(b => FOES[b].name).join(", ") || "none yet"}</b></span>`
  ].join("");
  $("unlocks").innerHTML = UNLOCKS.map(u => `<li class="${u.has(P) ? "" : "no"}"><span class="tick">${u.has(P) ? "✓" : "·"}</span><span><b>${esc(u.what)}</b> <span class="muted">${esc(u.how)}</span></span></li>`).join("");
}

/* ---------- Map screen ---------- */

/* ---------- Stage screens ---------- */
// Each screen between fights gets its own setting: a chalk slate, the quartermaster's counter, a campfire, a letter.
const sceneHead = (scene, eyebrow, title, body) => `<header class="scenehead ${scene}"><div class="eyebrow">${eyebrow}</div><h2>${title}</h2>${body || ""}</header>`;
const box = (label, inner, cls) => `<div class="panel pickbox"><div class="eyebrow">${label}</div><div class="${cls || "offers"}">${inner}</div></div>`;
const handPick = (attr, opts) => R.hand.map((c, i) => cardHTML(c, i, Object.assign({ cls: "pick" }, typeof opts === "function" ? opts(c) : opts)).replace('class="card', `data-${attr}="${i}" class="card`)).join("");
const soldHTML = `<div class="card pick offer sold"><span class="nm">Sold</span></div>`;
function supplies(sh) {
  const full = R.hp >= R.maxhp ? "Full health" : "";
  return itemHTML({ attrs: 'data-act="buyHeal"', ico: "heal", name: "Field dressing", text: "Heal 3.", price: `${sh.healPrice} gold`, why: full || needGold(sh.healPrice) })
    + itemHTML({ attrs: 'data-act="buyHp"', ico: "hp", name: "Rations", text: "+1 maximum health, and heal 1. Each one costs 25 more.", price: `${sh.hpPrice} gold`, why: needGold(sh.hpPrice) });
}
function renderStage() {
  show("sStage");
  const s = $("stage");
  s.dataset.scene = R.screen;
  STAGES[R.screen](s);
}
// The screens between fights, each drawn into the shared stage element s.
const STAGES = {
  reward(s) {
    const rw = R.reward;
    const pend = rw.pending ? box(`Your hand is full. Replace a card with ${esc(CARDS[rw.pending].name)}, or cancel.`, handPick("replace", {}), "hand") + `<div><button class="btn ghost" data-act="cancelReplace">Cancel</button></div>` : "";
    const ups = rw.upgrade ? box("Free upgrade: pick a card", handPick("up", c => ({ disabled: c.up, upgrade: true })), "hand") : "";
    const gl = rw.goal ? `<p>${rw.goal.ok ? "Bonus carried out" : "Bonus missed"}: <b>${esc(GOALS[rw.goal.id].name)}</b>${rw.goal.ok ? ` (+${GOALS[rw.goal.id].gold} gold, included)` : ""}.</p>` : "";
    const ord = rw.orders && rw.orders.length && !rw.tookOrder ? box("Take a perk (lasts the run)", rw.orders.map(id => orderOfferHTML(id, `data-order="${id}"`)).join("")) : "";
    const cards = rw.took ? "" : box("Take a card, or skip", rw.cards.map(id => offerHTML(id, `data-take="${id}"`)).join("") || '<p class="note">No new cards to offer.</p>');
    s.innerHTML = sceneHead("slatehead", R.fight && R.fight.kind === "boss" ? "Boss down" : "Room cleared", `+${rw.gold} gold`, gl) + ord + cards + pend + ups
      + `<div class="row"><button class="btn" data-act="leave">${rw.took || !rw.cards.length ? "Continue" : "Skip and continue"}</button></div>`;
  },
  rest(s) {
    const heal = game.restHealAmount();
    s.innerHTML = sceneHead("fire", "Campfire", "Rest", `<p>Do one thing before you march on. Health ${R.hp}/${R.maxhp}.</p>`)
      + box("Rest", itemHTML({ attrs: 'data-act="heal"', ico: "rest", name: "Rest by the fire", text: `Heal ${heal} health.`, why: R.hp >= R.maxhp ? "Full health" : "" }))
      + box("Or upgrade a card", handPick("restup", c => ({ disabled: c.up, upgrade: true })), "hand")
      + (R.shop && R.shop.wagon ? box(`Supply wagon · you have ${R.gold} gold`, supplies(R.shop)) : "")
      + `<div class="row"><button class="btn" data-act="leave">March on</button></div>`;
  },
  shop(s) {
    const sh = R.shop;
    const pend = sh.pending ? box(`Hand full: replace a card with ${esc(CARDS[sh.pending.id].name)}`, handPick("shopreplace", {}), "hand") + `<div><button class="btn ghost" data-act="cancelShop">Cancel</button></div>` : "";
    const order = sh.order ? (sh.order.sold ? soldHTML : orderOfferHTML(sh.order.id, 'data-act="buyOrder"', `${sh.order.price} gold`, needGold(sh.order.price))) : "";
    s.innerHTML = sceneHead("counter", "Quartermaster", "Shop", `<p>You have <b>${R.gold}</b> gold.</p>`)
      + box("Move cards", sh.cards.map((o, i) => o.sold ? soldHTML : offerHTML(o.id, `data-buy="${i}"`, `${o.price} gold`, needGold(o.price))).join(""))
      + pend
      + box("Supplies and perks", supplies(sh) + order)
      + box(`Upgrade a card · ${sh.upPrice} gold`, handPick("buyup", c => ({ disabled: c.up || R.gold < sh.upPrice, upgrade: true, why: c.up ? "" : needGold(sh.upPrice) })), "hand")
      + `<div class="row"><button class="btn ghost" data-act="restock"${R.gold < (sh.restockPrice ?? Infinity) ? " disabled" : ""}>Restock cards and perk · ${sh.restockPrice ?? "–"} gold</button><button class="btn" data-act="leave">Leave</button></div>`;
  },
  event(s) {
    const ev = EVENTS[R.event];
    s.innerHTML = sceneHead("letter", "Along the way", esc(ev.title), `<p>${esc(ev.text)}</p>`)
      + `<div class="offers">${ev.opts.map((o, i) => itemHTML({ attrs: `data-ev="${i}"`, ico: "event", name: o.label, text: o.text })).join("")}</div>`;
  },
  end(s) {
    const e = R.end, got = e.stats.unlocked || [], next = UNLOCKS.find(u => !u.has(P));
    const unl = got.length ? `<p class="got">Unlocked this run: <b>${got.map(esc).join(", ")}</b></p>` : "";
    const nx = next ? `<p>Next unlock: <b>${esc(next.what)}</b> · ${esc(next.how)}</p>` : `<p>Everything is unlocked.</p>`;
    s.innerHTML = sceneHead("slatehead", e.won ? "Victory" : "Run over", e.won ? "The citadel falls" : `Fell in act ${e.act}`, unl + nx)
      + `<div class="panel status"><span>Cadet <b>${esc(CHARS[e.char].name)}</b>${e.cad ? ` · Cadence <b>C${e.cad}</b>` : ""}</span><span>Rooms fought <b>${e.stats.fights}</b> · turns <b>${e.stats.turns}</b></span><span>Enemies beaten <b>${e.stats.kills}</b>, <b>${e.stats.pitKills}</b> of them into pits</span><span>Gold collected <b>${e.gold}</b></span></div>
      <div class="row"><button class="btn" data-act="title">Back to the barracks</button></div>`;
  }
};
