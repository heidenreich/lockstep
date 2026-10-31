# Working on Lockstep

How to run, test and change the code. What the game is lives in the [README](../README.md); how it works in full is in [design.md](design.md).

## Commands

```bash
npm ci                       # once: installs Playwright for the browser tests
npm test                     # rule tests (Node 18+)
npm run typecheck            # TypeScript checks the plain JS (jsconfig.json); no build step
npm run test:e2e             # browser smoke tests (first time: npx playwright install chromium)
node sim/run4.js check 30    # quick bot balance read, one line per character (SEED=n to repeat a run)
```

CI runs all four on every PR and push to `main`. Its bot check is shorter (`SEED=1 node sim/run4.js check 10`) and fails if stalls stop being rare; run `check 30` yourself when you change the rules.

| Path | What |
|---|---|
| `rules.js` | All game rules, no DOM |
| `index.html` | The page markup; loads `rules.js`, `styles.css` and `js/` |
| `js/` | Page scripts, loaded in order: `kit` (helpers, page state `ui`), `art` (act looks, tin soldiers), `store` (run and profile), `audio`, `screens` (render, stage screens), `onboarding`, `briefing` (the briefing before each fight), `board` (fight canvas and pieces), `mapboard` (the map as a toy board), `input` (handlers, `ACTIONS`, boot) |
| `styles.css` | All page styles: theme colours, layout, cards, slate, phone layout |
| `tests/` | Rule tests |
| `types/`, `jsconfig.json` | Type checking: the shape of a saved run (`game.d.ts`: `Run`, `Fight`, `Enemy`, `HandCard` and the rest) and the few globals the scripts can't declare themselves |
| `e2e/` | Browser smoke tests (Playwright) |
| `sim/` | Bot harness (`run4.js`), the bots (`bot.js`) and stall traces |
| `design/` | Visual mockups |
| `archive/` | Earlier prototypes, kept for reference |

## Making changes

- **Before you push:** `npm test`, `npm run typecheck`, `npm run test:e2e`, and `node sim/run4.js check 30` if you touched the rules. Keep [design.md](design.md) in step with what you changed.
- **Saved runs:** players' runs are saved in their browser. Their shape is written down in `types/game.d.ts`, and `npm run typecheck` flags any field the code uses that isn't there. If you change the shape of the run (fields on the run, fight, enemies, hand), update `game.d.ts`, bump `RUN_V` in `rules.js` and add the step to `migrateRun`, with a test that loads an old save. Renaming or removing a card, perk, enemy or room id makes old saves unplayable: `migrateRun` then refuses them and the page clears them, so prefer keeping ids.
- **Rules vs page:** anything that decides what happens in the game belongs in `rules.js` (with a test); `js/` only draws and passes input on.

### Adding content

Each kind of content lives in one table in `rules.js`; the page reads its text from there.

| To add | Where | Also |
|---|---|---|
| A card | `CARDS`: name, cooldowns, text, `check()` and `play()` | an icon in `ICONS` (`js/screens.js`); its place in the bots' order (`worst` in `sim/run4.js`); a case in `tests/content.test.js` |
| An enemy | `FOES`: stats, flags, `rule` (briefing and first-time note), `look` (How to play) | its tin soldier in `TIN` (`js/art.js`); add it to an act's `roster` or `elites` |
| A boss | `FOES` with `boss`, `adds`, `addEvery`, `addN` and any twist flags; an act's `boss` and `bossRoom` in `ACTS` | its tin soldier in `TIN` (`js/art.js`); unlocks it earns in `UNLOCKS` |
| A room | `ROOMS`: `room(id, name, rows)`, then list its id in an act's `rooms` | nothing else: walls, pits and hazards are drawn from the text |
| An act | `ACTS`: name, rooms, boss, roster, elites | its look: one entry in `ACT_ART` (`js/art.js`): board colours, map table, wall name and page theme |
| A perk | `ORDERS` (name, text), then its effect where it applies (`hasO("id")`) | a case in `tests/content.test.js` |
| A bonus | `GOALS`, then its check in `endTurn` | |
| An unlock | `UNLOCKS`: what it unlocks and `when(e)` it's earned | |
| A Cadence level | `CADENCE`: text and effect fields (see `cadenceFx`) | |

## Hosting

GitHub Pages serves `main` at https://heidenreich.github.io/lockstep/ (`.github/workflows/pages.yml` publishes only the files the page loads: `index.html`, `rules.js`, `styles.css`, `js/`). Saves stay in the player's browser.
