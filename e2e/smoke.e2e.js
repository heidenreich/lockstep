// Browser smoke tests: the page loads and a run plays through its screens with no page errors.
// usage: npm run test:e2e   (needs Playwright's Chromium: npx playwright install chromium)
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright");

const URL = "file://" + path.join(__dirname, "..", "index.html");
let browser;
test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser.close(); });

// A fresh page (empty storage) that fails the test on any page error or console error.
async function open(t, opts = {}) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage(), errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  t.after(async () => { await ctx.close(); assert.deepEqual(errors, [], "page errors"); });
  await page.goto(URL);
  await page.waitForFunction(() => typeof game !== "undefined" && !document.getElementById("sTitle").hidden);
  return page;
}
const state = page => page.evaluate(() => ({ screen: R && R.screen, kind: R && R.fight && R.fight.kind, turn: R && R.fight && R.fight.turn }));

test("a first run opens with the drill, which can be skipped to the map", async t => {
  const page = await open(t);
  await page.click("#startBtn");
  assert.deepEqual(await state(page), { screen: "fight", kind: "drill", turn: 0 });
  assert.ok(await page.isVisible("#coach"));
  await page.keyboard.press("ArrowLeft");
  assert.equal((await state(page)).turn, 1);
  await page.click('[data-act="skipDrill"]');
  assert.equal((await state(page)).screen, "map");
});

test("map by keyboard, briefing, moves, a won fight and back to the map", async t => {
  const page = await open(t);
  await page.click("#startBtn");
  await page.click('[data-act="skipDrill"]');
  // Pick the first open space with the keyboard.
  await page.focus("#mapSvg .node");
  await page.keyboard.press("Enter");
  let s = await state(page);
  assert.equal(s.screen, "fight");
  if (s.kind !== "drill") assert.ok(await page.isVisible("#brief"), "briefing shows before the first move");
  // Hover the board for previews, then move; the first move folds the briefing.
  const box = await page.locator("#cv").boundingBox();
  for (const k of ["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"]) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 3);
    await page.keyboard.press(k);
  }
  s = await state(page);
  assert.ok(s.turn >= 1);
  assert.ok(await page.isHidden("#brief"));
  // Win it outright, collect, and leave the reward screen.
  await page.evaluate(() => { for (const e of [...R.fight.enemies]) game.kill(e, "test"); game.endTurn(null); render(); });
  await page.click('[data-act="claim"]');
  assert.equal((await state(page)).screen, "reward");
  await page.click('#stage [data-act="leave"]');
  assert.equal((await state(page)).screen, "map");
});

test("a saved run resumes after a reload; a save the game can't play is cleared, not offered", async t => {
  const page = await open(t);
  await page.click("#startBtn");
  await page.click('[data-act="skipDrill"]');
  await page.evaluate(() => mapPick(game.openNodes()[0]));
  await page.reload();
  await page.waitForFunction(() => !document.getElementById("sTitle").hidden);
  assert.ok(await page.isVisible("#resumeBtn"));
  await page.click("#resumeBtn");
  assert.equal((await state(page)).screen, "fight");
  // Spoil the save (a card this version doesn't have) and reload.
  await page.evaluate(() => { const r = JSON.parse(localStorage.getItem("lockstep-run")); r.hand[0].id = "no-such-card"; localStorage.setItem("lockstep-run", JSON.stringify(r)); });
  await page.reload();
  await page.waitForFunction(() => !document.getElementById("sTitle").hidden);
  assert.ok(await page.isHidden("#resumeBtn"));
  assert.equal(await page.evaluate(() => localStorage.getItem("lockstep-run")), null);
});

test("on a phone the map and a fight fit the width", async t => {
  const page = await open(t, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await page.tap("#startBtn");
  await page.tap('[data-act="skipDrill"]');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  await page.locator("#mapSvg .node").first().tap();
  assert.equal((await state(page)).screen, "fight");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  // Tapping a briefing line lights it on the board.
  const line = page.locator("#brief li[data-hi]").first();
  if (await line.count()) { await line.tap(); assert.ok(await page.evaluate(() => !!ui.briefHi)); }
});

test("with the briefing switched off, a new enemy gets its first-time note instead", async t => {
  const page = await open(t);
  await page.evaluate(() => localStorage.setItem("lockstep-brief", "0"));
  await page.click("#startBtn");
  await page.click('[data-act="skipDrill"]');
  // A room whose line has a contrarian, which the drill doesn't teach.
  await page.evaluate(() => mapPick(game.openNodes()[0]));
  assert.ok(await page.isHidden("#brief"));
  assert.match(await page.textContent("#coach .eyebrow"), /New · Contrarian/);
});

test("How to play shows this run's numbers: perks and Cadence change them", async t => {
  const page = await open(t);
  await page.click("#startBtn");
  await page.click('[data-act="skipDrill"]');
  const nums = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll("#help [data-rule]")].map(el => [el.dataset.rule, el.textContent])));
  await page.evaluate(() => openHelp());
  assert.deepEqual(await nums(), { bumpDamage: "1", breakAt: "3", relock: "4", frenzyAt: "30" });
  await page.click("#helpClose");
  // Steady drum, Fixed bayonets and Cadence 2.
  await page.evaluate(() => { R.orders.push("steady", "bayonet"); R.cad = 2; openHelp(); });
  assert.deepEqual(await nums(), { bumpDamage: "2", breakAt: "4", relock: "4", frenzyAt: "24" });
});
