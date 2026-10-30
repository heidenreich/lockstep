# Lockstep

A turn-based tactical roguelite where **the room copies your every move**. Step, and the enemy line steps with you; steer it into walls, pits and powder kegs instead of fighting it head-on. Three acts, a branching map, move cards with cooldowns, unlocks only.

## Run it

Open `index.html` through any local web server (it loads `rules.js`, `styles.css` and `js/` next to it):

```bash
python3 -m http.server 8000
```

## Play it online

GitHub Pages serves `main` at https://heidenreich.github.io/lockstep/ (`.github/workflows/pages.yml` publishes only the files the page loads: `index.html`, `rules.js`, `styles.css`, `js/`). Saves there stay in the player's browser; as a claude.ai Artifact they follow the player's account.

## Develop

```bash
npm test                     # rule tests (Node 18+)
node sim/run4.js check 30    # quick bot balance read, one line per character
```

CI runs both on every PR and push to `main`.

| Path | What |
|---|---|
| `rules.js` | All game rules, no DOM |
| `index.html` | The page markup; loads `rules.js`, `styles.css` and `js/` |
| `js/` | Page scripts, loaded in order: `store` (run, profile, play tally), `audio`, `screens`, `onboarding`, `board` (canvas and pieces), `mapboard` (the map as a toy board), `briefing` (the briefing before each fight), `input` (handlers, boot) |
| `styles.css` | All page styles: theme colours, layout, cards, slate, phone layout |
| `tests/` | Rule tests |
| `sim/` | Bot harness and stall traces |
| `design/` | Visual mockups |
| `archive/` | Earlier prototypes, kept for reference |

## Docs

- [docs/design.md](docs/design.md): how the game works today (rules, cards, enemies, run, meta, code layout). Keep it in step with the code.
- [docs/history.md](docs/history.md): the dated design and balance passes, with bot numbers and why things changed.
