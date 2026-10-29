# Lockstep

A turn-based tactical roguelite where **the room copies your every move**. Step, and the enemy line steps with you; steer it into walls, pits and powder kegs instead of fighting it head-on. Three acts, a branching map, move cards with cooldowns, unlocks only.

## Run it

Open `index.html` through any local web server (it loads `rules.js` next to it):

```bash
python3 -m http.server 8000
```

## Develop

```bash
npm test                     # rule tests (Node 18+)
node sim/run4.js check 30    # quick bot balance read, one line per character
```

CI runs both on every PR and push to `main`.

| Path | What |
|---|---|
| `rules.js` | All game rules, no DOM |
| `index.html` | The page: drawing, sound, input, saved profile |
| `tests/` | Rule tests |
| `sim/` | Bot harness and stall traces |
| `design/` | Visual mockups |
| `archive/` | Earlier prototypes, kept for reference |

## Docs

- [docs/design.md](docs/design.md): how the game works today (rules, cards, enemies, run, meta, code layout). Keep it in step with the code.
- [docs/history.md](docs/history.md): the dated design and balance passes, with bot numbers and why things changed.
