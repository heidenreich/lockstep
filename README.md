# Lockstep

A turn-based tactical roguelite where **the room copies your every move**. Step, and the enemy line steps with you; steer it into walls, pits and powder kegs instead of fighting it head-on. Three acts, a branching map, move cards with cooldowns, unlocks only.

## Run it

Open `index.html` through any local web server (it loads `rules.js`, `styles.css` and `js/` next to it):

```bash
python3 -m http.server 8000
```

## Play it online

GitHub Pages serves `main` at https://heidenreich.github.io/lockstep/ (`.github/workflows/pages.yml` publishes only the files the page loads: `index.html`, `rules.js`, `styles.css`, `js/`). Saves stay in the player's browser.

## Develop

```bash
npm ci                       # once: installs Playwright for the browser tests
npm test                     # rule tests (Node 18+)
npm run test:e2e             # browser smoke tests (first time: npx playwright install chromium)
node sim/run4.js check 30    # quick bot balance read, one line per character (SEED=n to repeat a run)
```

CI runs all three on every PR and push to `main` (the bot check with `SEED=1`; it fails if stalls stop being rare).

| Path | What |
|---|---|
| `rules.js` | All game rules, no DOM |
| `index.html` | The page markup; loads `rules.js`, `styles.css` and `js/` |
| `js/` | Page scripts, loaded in order: `store` (run and profile), `audio`, `screens`, `onboarding`, `board` (canvas and pieces), `mapboard` (the map as a toy board), `briefing` (the briefing before each fight), `input` (handlers, boot) |
| `styles.css` | All page styles: theme colours, layout, cards, slate, phone layout |
| `tests/` | Rule tests |
| `e2e/` | Browser smoke tests (Playwright) |
| `sim/` | Bot harness (`run4.js`), the bots (`bot.js`) and stall traces |
| `design/` | Visual mockups |
| `archive/` | Earlier prototypes, kept for reference |

## Making changes

- **Before you push:** `npm test`, `npm run test:e2e`, and `node sim/run4.js check 30` if you touched the rules. Keep [docs/design.md](docs/design.md) in step with what you changed.
- **Saved runs:** players' runs are saved in their browser. If you change the shape of the run (fields on the run, fight, enemies, hand), bump `RUN_V` in `rules.js` and add the step to `migrateRun`, with a test that loads an old save. Renaming or removing a card, perk, enemy or room id makes old saves unplayable: `migrateRun` then refuses them and the page clears them, so prefer keeping ids.
- **Rules vs page:** anything that decides what happens in the game belongs in `rules.js` (with a test); `js/` only draws and passes input on.

## Docs

- [docs/design.md](docs/design.md): how the game works today (rules, cards, enemies, run, meta, code layout). Keep it in step with the code.
- [docs/history.md](docs/history.md): the dated design and balance passes, with bot numbers and why things changed.
