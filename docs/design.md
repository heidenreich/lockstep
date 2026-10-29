# Lockstep design

How the game works today. Change the numbers here in the same commit as a balance change; the reasons behind them live in [history.md](history.md).

Decisions (Todd, 2026-10-28): build layer = **move cards**; run = **branching 3-act map**; meta = **unlocks only** (no permanent stat power).

## Core rules

- One hand-made room per fight (12 rooms, 7×7 to 11×9: 3 per act plus a boss room each). Each turn: Step (WASD/arrows), wait, or play a card.
- **Lockstep:** when you Step, every locked drone and heavy tries to move the same way; contrarians move the opposite way. Leaders move first.
- An enemy that moves into your tile hits you; a locked enemy that ends its move beside you strikes too.
- Enemies that step into a **pit** die (+gold). Each pit holds 2 per fight, then fills.
- Blocked 3 turns in a row (wall, edge, enemy) → the enemy **breaks free** and chases. A chaser 4+ tiles away for 4 turns falls back into step.
- Waiting: every enemy chases one step and a new enemy arrives.
- Arrivals: one every 8 turns while 2+ enemies remain, at most 2 per fight.
- **Frenzy:** a normal fight that runs 30 turns frees every enemy, and anything that arrives after that comes in free. Every third frenzy turn the broken line runs two steps (not bosses; the slate warns).
- **Hazards:** ice (slide until blocked), spikes (1 damage on entering; bosses immune), powder kegs (block like walls; blow when crashed into, shoved or bumped: 1 to everything adjacent, chaining), conveyor belts (carry what stands on them at end of turn).
- **Combos:** 2+ enemies down from one action: +n×(n−1) gold and every card's cooldown −1.

## Move cards

Step is always available. Cards are extra actions with **cooldowns** (no draw pile). Most decouple your movement from the room's.

| Card | Effect | CD | Upgraded |
|---|---|---|---|
| Sidestep | You move 1; the room holds | 3 | CD 2 |
| Stomp | You stay; the room moves 1 your way | 2 | CD 1 |
| Double Time | You move 1; the room moves 2 | 3 | CD 2 |
| About Face | You move 1; the room moves the opposite way | 3 | CD 2 |
| Lunge | Move up to 2 in a line; first enemy hit takes 2; spikes crossed hurt. Room moves 1 | 3 | 3 damage |
| Shove | Hit an adjacent enemy for 1, knock it back 2 (pits count). Room holds | 2 | Knock back 3 |
| Quake | You stay; the room moves 1; enemies pinned last turn take 1 | 5 | CD 4 |
| Magnet | You stay; every locked enemy steps 1 toward you | 4 | CD 3 |
| Recall | Every free enemy falls back into step (in a frenzy, for 4 turns). Room holds | 6 | CD 4 |
| Trapdoor | Hidden pit on an adjacent tile for 4 turns; chasers walk into it | 6 | CD 4 |
| Brace | You stay; no damage until your next turn. Room holds | 4 | CD 3 |

Hand: 3 slots (Drummer 4). After a fight, draft 1 of 3 cards or take gold; a full hand replaces a card.

## Enemies

- **Drone** 1 HP. **Contrarian** 1 HP, moves opposite. **Heavy** 2 HP, hits 2, moves every other turn.
- **Rifleman** 1 HP, holds its ground, reloads 2 turns, then fires along its row or column when you're in line. Walls stop the shot; an enemy or keg in the way takes it. Marked by red dashed lanes and "aim!".
- Elites: **Runner** moves 2 per shift. **Anchor** never moves, 3 HP, strikes adjacent; once the rest of its line is gone it falls into step.
- Riflemen yield when the rest of their line is gone.

Bosses (a pit deals 3 and the boss climbs back out at an edge):
1. **Colossus**: locked heavy, 8 HP, hits 2; a drone arrives every 6 turns.
2. **Mirror**: locked contrarian, 9 HP; every 5 turns the cadence flips for 5 turns (telegraphed). A pit it climbs out of is sealed.
3. **Warden**: 12 HP, hits 2; chases every other turn and marches in step on the turns between. Two drones arrive every 7 turns.

## Run

- 3 acts, each a 6-row branching map plus a boss; row 6 is always Rest. Each act has its own rooms, roster and light.
- Nodes: **Fight**, **Elite** (from row 3), **Rest** (heal 3, upgrade a card, or March on), **Shop**, **Event**, **Boss**.
- Gold: fights ~15–25, elites ~40, +1 per pit kill.
- Shop: cards 30–45, upgrade 40, Field dressing (heal 3) 25, Rations (+1 max HP) 45 rising 25 each, one drill order 75–90, Restock 15 rising 10 each. The campfire before each boss has a supply wagon (Rations, Field dressing).
- **Bonus orders:** every non-boss room has one, shown on the slate: Take the colours (reach a far flag first, before the room is clear) 20, Pit drill (3 pit drops) 20, Clean drill (no enemy ever blocked) 15, Parade order (no damage by turn 14) 20, Quick march (clear by turn 10) 15.
- **Drill orders** (run-long passives): bosses offer 1 of 3, shops sell one. Sappers' pride, Fixed bayonets, Iron ranks, Steady drum, Deep pits, Short fuses, Hobnail boots, Field surgeon, Crossfire, Rally, Quartermaster's friend, Reserve slot (texts in `ORDERS`).
- Winning a fight on the turn you'd fall leaves you on 1.

## Onboarding

- **Training drill:** until a player has finished or skipped it, their next run opens with a fixed lesson room (the title shows a "New here?" line meanwhile) (Training ground, 7×6: one pit, one wall, three drones). A sergeant's note walks five steps: step and watch the line, step left twice to drop a drone into the pit, pin one on the edge until it breaks free, play your first card, clear the room. Each step lights once done, in any order. No bonus, arrivals, frenzy or wait spawns; it can't take you below 1 health, it ends at full health on the act 1 map with no reward, and it doesn't count as a fight. Skippable; replayable from the title screen.
- **First-time notes:** the first time something turns up (each enemy type and boss, kegs, ice, spikes, belts, the bonus order, breaking free, frenzy, a combo, a full pit, a card cooldown) the same note box explains it in one line. Seen notes are kept in the profile (`seen`) and merged like unlocks.
- **How to play:** a dialog from the top bar (and from any note): the rules in six lines, the line drawn as tin soldiers, how to read the board and the keys.

## Play counter

Anonymous: each page open, run start, drill finish or skip, and run end writes one small shared document to `tally/` (event, day, character, Cadence, act reached; no player id, the owner's own flagged `owner: true`). Read it with the artifact database (`tally` collection). Players below Contributor (Viewer, Commenter) can't write, so they aren't counted and don't save progress to their account either.

## Meta (unlocks only)

Saved per player in the artifact's per-user storage (`db`, `data/users/<id>/profile`), merged with browser storage for signed-out play.

- **Characters:** Recruit (Sidestep, Stomp; 8 HP). Drummer, beat the Colossus (Double Time, About Face; 7 HP; 4 slots). Sapper, win a run (Quake, Shove; 9 HP; pits hold 3).
- **Cards:** start pool Sidestep, Stomp, Double Time, About Face, Lunge, Shove, Trapdoor. Quake (beat the Colossus), Magnet (reach act 2), Recall (beat the Mirror), Brace (die three times).
- **Cadence 1–5** (win at N to unlock N+1): C1 +1 enemy per fight; C2 frenzy 6 turns sooner; C3 elites +1 HP, rest heals 2; C4 bosses +4 HP; C5 start with 2 less HP.

## Presentation

- A toy diorama: a painted parade ground on a wooden plinth, front view with mild perspective; tin soldiers on green bases (one hat per role: shako for you and drones, bearskin for heavies and the Colossus, a bicorne worn sideways for contrarians and the Mirror, a feathered Jäger hat for riflemen, a busby for runners, a crested steel helmet for anchors, a spiked helmet for the Warden; brass is the player's alone; elites stand in a dashed silver ring, bosses in a dark-and-bone double ring with a prop each: the Colossus a mace, the Mirror a looking-glass, the Warden a lantern and white facings. Riflemen kneel with black belts, rifle upright while reloading and level when ready; runners are magenta hussars mid-stride; contrarians turn their backs with a cream pack and musket reversed; anchors stand on a stone block with sandbags. The Warden wears the red scribble only on turns it chases. Health is a brass bar over the head; blocked turns fill red slots beside it up to the break-free limit). Act settings: nursery windowsill (alphabet-block walls), lamplit study (books), toy box at night (crates). Mockups in `design/`.
- **You:** the blue cadet stands on a pulsing brass tile with a brass chevron bobbing overhead; for the first 3 turns of each fight (and the whole drill) the chevron carries a handwritten "you" tag.
- Hovering a move draws chalk arrows for every piece that will move, plus damage and combo notes. Cards are paper drill cards, health is tin medals, fight status is a chalk slate.
- Between fights, everything you can take or buy is a paper card (supplies and drill orders too, orders with a wax seal); upgrade pickers show what drilling changes, and a disabled offer says why. Each screen has a setting: reward and run-over on a chalk slate, the shop at a plank counter, rest by a campfire, events as a letter. The run-over screen lists this run's unlocks and the next one.
- Phones: the board runs edge to edge and the fight fits one screen (cards in a compact row, the pad beside the slate; the armed card's text shows above the hand).
- Feel: tweens, hit-stop, particles, light shake (off under reduced motion); synth snare and tom steps over a drum cadence that picks up when the line breaks.

## Code

- `rules.js`: data tables and pure helpers as globals; a run lives in a game from `makeGame(run, { profile, hooks, sim })`. `game.fork()` is a sim copy for bot lookahead; `game.preview(g => g.step(dx, dy))` reports a move without touching the run. Randomness is seeded (`game.newRun(char, cad, seed)`), with RNG state in the run.
- `index.html`: holds one game (`useRun`, `startRun`) and the profile `P`. `styles.css`: every page style (theme tokens on `:root`, act moods, cards, slate, phone layout). Publish all three together.
- `sim/run4.js check|base|cards|bosses|econ|new [N]`; `BOT=2ply`, `CAD=n`. `sim/trace4*.js` trace stalled fights.

## Open questions only playtests answer

- Is the room's vector legible enough that people find two-push pit setups?
- Do cooldown cards feel like a build, or a menu?
- Is 3 acts (~25 minutes) the right length?
- What difficulty target? The 2-ply bot now wins 82–88% at C0; the Mirror is the softest boss.
