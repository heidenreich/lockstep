# Lockstep design

How the game works today. Change the numbers here in the same commit as a balance change; the reasons behind them live in [history.md](history.md).

Decisions (Todd, 2026-10-28): build layer = **move cards**; run = **branching 3-act map**; meta = **unlocks only** (no permanent stat power).

## Core rules

- One hand-made room per fight (12 rooms, 7×7 to 11×9: 3 per act plus a boss room each). Each fight turns its room at random: mirrored left-right and/or top-bottom, and square rooms also rotated (`F.orient`; belts turn with the room). Only turns that change the layout count, so symmetric rooms always play as drawn: Belt room has 8, Gatehouse 4, six rooms 2, and Drill square, Spike lanes, Colossus court, Powder store and Warden's yard 1. Each turn: Step (WASD/arrows), wait, or play a card.
- **Lockstep:** when you Step, every locked drone and heavy tries to move the same way; contrarians move the opposite way. Leaders move first.
- An enemy that moves into your tile hits you; a locked enemy that ends its move beside you strikes too.
- Enemies that step into a **pit** die (+gold); you can't fall in (you stop at the edge). Each pit holds 2 per fight (Sapper 3, Deep pits +1), then fills. On the board a pit carries one mark per place, a solid brass dot while open and a hollow ring once used (shape as well as colour, high in the hole so a piece in front doesn't hide them); the move preview writes "into the pit" on the pit a piece would drop into (bosses included), never on you.
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
| Brace | You stay; no damage until your next move (a wait or a card counts). Room holds | 4 | CD 3 |

Cooldowns don't carry between fights: every fight starts with the whole hand ready. Brace lasts until your next action, so it also covers the end of the turn (rifle shots, belt rides onto spikes).

Hand: 3 slots (Drummer 4). After a fight, draft 1 of 3 cards or take gold; a full hand replaces a card.

**Synergies** (`SYNERGIES`): holding a card and its paired perk turns on a bonus. The first time a pair comes together in a run it's announced; held pairs are marked on the card and the perk outside fights, and an offer says which of your pieces it would pair with.

| Synergy | Card + perk | Bonus |
|---|---|---|
| Bayonet charge | Lunge + Fixed bayonets | Lunge hits 1 harder |
| Powder quake | Quake + Short fuses | Quake deals 2 to pinned enemies |
| Hobnail stomp | Stomp + Hobnail boots | Stomp first hits every enemy beside you for 1 |

## Enemies

- **Drone** 1 HP. **Contrarian** 1 HP, moves opposite. **Heavy** 2 HP, hits 2, moves every other turn.
- **Rifleman** 1 HP, holds its ground, reloads 2 turns, then fires along its row or column when you're in line. Walls stop the shot; an enemy or keg in the way takes it. Marked by red dashed lanes and "aim!".
- Elites: **Runner** moves 2 per shift. **Anchor** never moves, 3 HP, strikes adjacent; once the rest of its line is gone it falls into step.
- Riflemen yield when the rest of their line is gone.

Bosses (a pit deals 3 and the boss climbs back out at an edge):
1. **Colossus**: locked heavy, 8 HP, hits 2; a drone arrives every 6 turns.
2. **Mirror**: locked contrarian, 9 HP; every 5 turns it flips direction for 5 turns (telegraphed). A pit it climbs out of is sealed.
3. **Warden**: 12 HP, hits 2; chases every other turn and marches in step on the turns between. Two drones arrive every 7 turns. The Warden is meant as a draft check (decided 2026-10-31): three cards answer it, Trapdoor (2-ply bot 98%), Recall (95%, slowly, mostly after enrage; unlocked by beating the Mirror) and Double Time (80%); with any other card it's 28–65%, 43% with none.

## Run

- 3 acts, each a 6-row branching map plus a boss; row 6 is always Rest. Each act has its own rooms, roster and light.
- Nodes: **Fight**, **Elite** (from row 3), **Rest** (heal 3, upgrade a card, or March on), **Shop**, **Event**, **Boss**.
- Gold: fights ~15–25, elites ~40, +1 per pit kill.
- Shop: cards 30–45, upgrade 40, Field dressing (heal 3) 25, Rations (+1 max HP) 45 rising 25 each, one perk 75–90, Restock 15 rising 10 each. The campfire before each boss has a supply wagon (Rations, Field dressing).
- **Bonuses** (`GOALS`): every non-boss room has one, shown on the slate: Take the colours (reach a far flag first, before the room is clear) 20, Into the pits (3 pit drops) 20, Clean march (no enemy ever blocked) 15, Parade order (no damage by turn 14) 20, Quick march (clear by turn 10) 15.
- **Perks** (run-long passives, `ORDERS` in code): bosses offer 1 of 3, shops sell one. Sappers' pride, Fixed bayonets, Iron ranks, Steady drum, Deep pits, Short fuses, Hobnail boots, Field surgeon, Crossfire, Rally, Quartermaster's friend, Reserve slot (texts in `ORDERS`).
- Winning a fight on the turn you'd fall leaves you on 1.

## Words

One word per idea, in everything the player reads: **Briefing** (the card before a fight), **Bonus** (a room's extra-gold goal), **Perks** (run-long passives; `ORDERS` in code), **Upgrade** (improve a card), **Cadence** (the difficulty ladder only; the Mirror "flips direction"), **training drill** (the lesson room only; the Fight space is "A fight").

## Onboarding

- **Training drill:** until a player has finished or skipped it, their next run opens with a fixed lesson room (the title shows a "New here?" line meanwhile) (Training ground, 7×6: one pit, one wall, three drones). A sergeant's note walks five steps: step and watch the line, step left twice to drop a drone into the pit, pin one on the edge until it breaks free, play your first card, clear the room. Each step lights once done, in any order. No bonus, arrivals, frenzy or wait spawns; it can't take you below 1 health, it ends at full health on the act 1 map with no reward, and it doesn't count as a fight. Skippable; replayable from the title screen.
- **First-time notes:** the first time something turns up (each enemy type and boss, kegs, ice, spikes, belts, the bonus order, breaking free, frenzy, a combo, a full pit, a card cooldown) the same note box explains it in one line. Seen notes are kept in the profile (`seen`) and merged like unlocks.
- **How to play:** a dialog from the top bar (and from any note): the rules in six lines, the line drawn as tin soldiers, how to read the board and the keys.

- **Briefing:** every fight but the drill opens with a briefing above the move cards, drawn as an order sheet (ruled lines, a red margin, a strip of tape; elites a dashed silver edge, bosses a dark double ring and a red wax seal): a **Win** line (clear the room; for a boss, beat it, since the fight ends the moment it falls), then what's here. Pieces and ground the player hasn't met yet (and, before the drill is done, drones, pits and walls) are listed in full with a **New** tag: tin portrait or painted tile, count, health, the rule. Everything already met is a compact chip that shows its rule when pointed at, focused or tapped. Then the bonus order and the clock (frenzy and arrivals, or the boss's enrage) in plain lines. Elite and boss rooms carry a tag by the name. Pointing at any line lights those pieces or tiles on the board. It folds away on the first move, "To the field" or Esc (focus moves to the top bar's Briefing button, which reopens it; opening puts focus on the room name). "Brief me before every fight" (on by default) is remembered per browser. It caps its height and scrolls inside itself (46% of the screen on phones). What counts as new is fixed when the room's briefing first opens; everything there is then marked met (`seen`), so the one-off "New" notes don't repeat it. Those notes still explain mechanics as they happen (breaking free, frenzy, combos, full pits, cooldowns). It is rebuilt only when its content changes, so keyboard focus survives the game's redraws.

## Meta (unlocks only)

Saved in the player's browser (`localStorage`, `lockstep-profile`; the current run is saved as `lockstep-run`). A saved run carries its shape's version (`RUN_V`); `migrateRun` brings older saves up to date (v1 stored fights' rooms by list position, v2 by room id, v3 moved the page's per-fight notes under `fight.ui`) and refuses saves it can't play (unknown version, or a card, perk, enemy, room or character this version doesn't have), which the page then clears instead of offering Continue. The game is hosted on GitHub Pages; it no longer runs as a claude.ai Artifact, so there are no account saves or play counter.

- **Characters:** Recruit (Sidestep, Stomp; 8 HP). Drummer, beat the Colossus (Double Time, About Face; 7 HP; 4 slots). Sapper, win a run (Quake, Shove; 9 HP; pits hold 3).
- **Cards:** start pool Sidestep, Stomp, Double Time, About Face, Lunge, Shove, Trapdoor. Quake (beat the Colossus), Magnet (reach act 2), Recall (beat the Mirror), Brace (die three times).
- **Cadence 1–5** (win at N to unlock N+1): C1 +1 enemy per fight; C2 frenzy 6 turns sooner; C3 elites +1 HP, rest heals 2; C4 bosses +4 HP; C5 start with 2 less HP.

## Presentation

- A toy diorama: a painted parade ground on a wooden plinth, front view with mild perspective; tin soldiers on green bases (one hat per role: shako for you and drones, bearskin for heavies and the Colossus, a bicorne worn sideways for contrarians and the Mirror, a feathered Jäger hat for riflemen, a busby for runners, a crested steel helmet for anchors, a spiked helmet for the Warden; brass is the player's alone; elites stand in a dashed silver ring, bosses in a dark-and-bone double ring with a prop each: the Colossus a mace, the Mirror a looking-glass, the Warden a lantern and white facings. Riflemen kneel with black belts, rifle upright while reloading and level when ready; runners are magenta hussars mid-stride; contrarians turn their backs with a cream pack and musket reversed; anchors stand on a stone block with sandbags. The Warden wears the red scribble only on turns it chases. Health is a brass bar over the head; blocked turns fill red slots beside it up to the break-free limit). Act settings: nursery windowsill, lamplit study, toy box at night. Walls share one shape and one mark in every act: half a tile tall, filling the square, lower than a soldier, with a castle tower on top. Act 1: framed wooden tower blocks (honey wood, one teal frame per face, a colour no piece uses). Act 2: two books in navy and brown cloth with a cream tower stamped on the cover. Act 3: a low slatted crate with a stencilled tower on the lid. No wall uses an enemy colour or carries letters, so nothing on the board reads as a key or a label. Mockups in `design/`.
- **You:** the blue cadet stands on a pulsing brass tile with a brass chevron pointing at it from beside the piece (from the left near the right edge; overhead it would land on the piece behind); for the first 3 turns of each fight (and the whole drill) the chevron carries a handwritten "you" tag.
- **The map is a toy board game:** a wooden-framed board with the parade ground painted on it, standing on a front face that carries the act's name on a brass plate (like the fight board's plinth), on the act's tabletop with the act's light: a sunbeam and alphabet blocks in the nursery, lamplight and book stacks in the study, a dark night wash with moonlight over the boss, crates and a candle in the toy box (the toys show where the screen leaves table either side). Rooms are painted board-game spaces (red fight, gold elite, green rest, blue shop, cream event) with their mark on top; a colour key sits under the map title. Open spaces lift and glow (a dark ring under the brass) and carry a name tag; the boss space carries the boss's piece and name. Tracks are chalk dashes ahead (faint where you can no longer go), marching brass dashes for the ways open to you and a brass path with boot prints where you've been. Spaces you can no longer reach are dulled, visited ones carry a chalk tick. Your tin cadet stands at the back of your space (or on the "fall in" square) with the board's brass "you" chevron. The columns in use are centred. The canvas only paints; an SVG over it holds the clickable, focusable spaces, each named with where it leads ("Fight, then Elite or Rest").
- Hovering a move draws chalk arrows for every piece that will move, plus damage and combo notes. An enemy the move would block gets a short chalk stub ending in a bar on the edge of its square, toward whatever stops it (red in the rare case that block breaks it free but it can't move). When something actually bumps a wall (an enemy in the line, or you), the wall rocks side to side for a third of a second with a wooden thunk (no rocking under reduced motion). Cards are paper drill cards, health is tin medals, fight status is a chalk slate.
- Between fights, everything you can take or buy is a paper card (supplies and perks too, perks with a wax seal); upgrade pickers show what drilling changes, and a disabled offer says why. Each screen has a setting: reward and run-over on a chalk slate, the shop at a plank counter, rest by a campfire, events as a letter. The run-over screen lists this run's unlocks and the next one.
- Phones: the board runs edge to edge and the fight fits one screen (cards in a compact row, the pad beside the slate; the armed card's text shows above the hand).
- Feel: tweens, hit-stop, particles, light shake (off under reduced motion); synth snare and tom steps over a drum cadence that picks up when the line breaks.

## Code

- `rules.js`: data tables and pure helpers as globals. Content lives in one table each: `CARDS` (each card's `check` and `play`), `FOES` (stats, flags, `rule` and `look` text, boss quirks as data), `ACTS` (rooms, boss, roster, elites), `ORDERS`, `GOALS`, `UNLOCKS` (each with `when`), `CADENCE` (effects summed by `cadenceFx`); `ENRAGE`, `FRENZY` and friends are named constants. The README lists what to touch to add each kind. a run lives in a game from `makeGame(run, { profile, hooks, sim })`. `game.fork()` is a sim copy for bot lookahead; `game.preview(g => g.step(dx, dy))` reports a move without touching the run. Randomness is seeded (`game.newRun(char, cad, seed)`), with RNG state in the run.
- `index.html`: the page markup. `js/store.js` holds the one game (`useRun`, `startRun`), the profile `P` and saving (`savedRun`); `R`, `W` and `H` are read-only views of that game. The page decides no rules: every change to the run goes through a game function (rewards, perks, upgrades, events and quitting included: `takeRewardOrder`, `claimUpgrade`, `cancelPending`, `chooseEvent`, `quit`). Its own notes about a fight (drill coach progress, briefing state) live under `fight.ui`, which the rules never read. After each action, `observeFight()` (js/input.js) fixes what's new for the briefing, queues first-time notes and saves the profile once; drawing only reads. `styles.css`: every page style (theme tokens on `:root`, act moods, cards, slate, phone layout). The page script lives in `js/` as plain scripts sharing one global scope, loaded in order: `kit.js` (helpers, the page's UI state `ui`, the `SCREENS` registry), `art.js` (each act's look in `ACT_ART`, the tin soldiers and shared drawing), `store.js` (game and profile), `audio.js`, `screens.js` (`render()`, HTML helpers and the stage screens in `STAGES`), `onboarding.js`, `briefing.js` (the briefing before each fight), `board.js` (fight screen and canvas: pieces, marks), `mapboard.js` (the map painted as a toy board), `input.js` (handlers, the `ACTIONS` registry for `data-act` buttons, the frame loop and boot). Page-only state (armed card, hover, briefing open and lit line, queued notes, title picks) lives in `ui`, not in loose globals. `render()` draws `SCREENS[R.screen]` (fight, map) or the stage. A file may only run code at load that uses earlier files; later files' functions may be called once the page runs. `npm run typecheck` checks every script with TypeScript (`jsconfig.json`, globals declared in `types/globals.d.ts`); no build step, nothing ships but the scripts. Publish the page with `rules.js`, `styles.css` and every `js/` file.
- Frame cost (2026-10-29, busy act 3 fight, 11 enemies, on the Mac): about 0.3 ms per frame to draw on desktop and at phone size (2× pixels), 0.1 ms per move preview, 0.6 ms to rebuild the fight panel. No optimisation needed; measure again before optimising.
- `sim/run4.js check|base|cards|bosses|econ|new [N]`; `SEED=n` (repeatable); `BOT=2ply` and `CAD=n` for `check` and `cards`; `ONLY=a,b` limits `cards` to those rows. `bosses` tries every card the Recruit doesn't start with. The bots live in `sim/bot.js`; `sim/trace4*.js` trace stalled fights with them. Rooms are known by text id (`roomById`); tests add their own with `addRoom`.
- `e2e/smoke.e2e.js`: browser smoke tests (Playwright, `npm run test:e2e`), run in CI.

## Open questions only playtests answer

- Is the room's vector legible enough that people find two-push pit setups?
- Do cooldown cards feel like a build, or a menu?
- Is 3 acts (~25 minutes) the right length?
- What difficulty target? The 2-ply bot now wins 82–88% at C0; the Mirror is the softest boss.
