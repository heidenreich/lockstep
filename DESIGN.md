# Lockstep — design doc

Turn-based tactical roguelite. **The room copies your every move.** You steer enemies into walls, pits and each other instead of fighting them head-on. This doc is the source of truth and the handoff for anyone picking the project up.

Decisions (Todd, 2026-10-28): build layer = **move cards**; run = **branching 3-act map**; meta = **unlocks only** (no permanent stat power); repo = `~/lockstep`.

## Core rules (bot-tested, carried over from prototype v4)

- 11×11 grid, one room per fight. Each turn: Step (WASD/arrows), wait, or play a card.
- **Lockstep:** when you Step in a direction, every locked drone and heavy tries to move that way; contrarians move the opposite way. Leaders move first.
- An enemy that moves into your tile hits you; a locked enemy that ends its move beside you strikes too.
- Enemies that step into a **pit** die (+gold). Each pit holds 2 per fight, then fills.
- Blocked 3 turns in a row (wall, edge, enemy) → the enemy **breaks free** and chases (BFS, ties broken by straight-line distance). A chaser 4+ tiles away for 4 turns falls back into step.
- Waiting: every enemy chases one step and a new enemy arrives.
- Arrivals: one every 8 turns while 2+ enemies remain, at most 2 per fight.
- **Frenzy:** a normal fight that runs 40 turns makes every enemy break free.

Why these numbers: see the bot findings at the end.

## Move cards (the build)

Step is always available. Cards are extra actions with **cooldowns** (Shogun Showdown / Into the Breach style, no draw pile): play a ready card, it goes on cooldown, it comes back. Most cards **decouple your movement from the room's**, which is where the depth comes from.

| Card | Effect | CD | Upgraded (+) |
|---|---|---|---|
| Sidestep | You move 1; the room holds still | 3 | CD 2 |
| Stomp | You stay; the room moves 1 your way | 2 | CD 1 |
| Double Time | You move 1; the room moves 2 | 3 | CD 2 |
| About Face | You move 1; the room moves the opposite way | 3 | CD 2 |
| Lunge | Move up to 2 in a line; first enemy hit takes 2. Room moves 1 | 3 | 3 damage |
| Shove | Hit an adjacent enemy for 1, knock it back 2 (pits count). Room holds | 2 | Knock back 3 |
| Quake | You stay; the room moves 1; every enemy already pinned (blocked last turn) takes 1 | 5 | CD 4 |
| Magnet | You stay; every locked enemy steps 1 toward you | 4 | CD 3 |
| Recall | Every free enemy falls back into step. Room holds | 6 | CD 4 |
| Trapdoor | Open a hidden pit on an adjacent tile for 4 turns; chasers walk into it | 6 | CD 4 |
| Brace | You stay; you take no damage until your next turn. Room holds | 4 | CD 3 |

Hand: 3 slots (Drummer 4). After a fight, draft 1 of 3 cards or take gold; a full hand replaces a card.

## Run structure

- 3 acts. Each act is a map of 6 rows (3–4 nodes wide) plus a boss; paths branch and merge. Row 6 is always Rest.
- Node types: **Fight**, **Elite** (from row 3; harder roster + an elite, better reward), **Rest** (heal 3 or upgrade a card), **Shop** (cards, upgrades, healing), **Event** (a small choice), **Boss**.
- Gold: fights ~15–25, elites ~40, +1 per pit kill.
- Each act uses its own room pool (Crossroads, Gallery, Moat, Lanes, Funnel) and a stronger roster.

Enemies: Drone (1 HP), Contrarian (1 HP, moves opposite), Heavy (2 HP, hits 2, moves every other turn). Elites: **Runner** (moves 2 per shift), **Anchor** (never moves, 3 HP, strikes adjacent).

Bosses (one twist each; a pit deals 3 damage and the boss climbs back out at an edge):
1. **Colossus**: locked heavy, 8 HP, hits 2; a drone arrives every 6 turns.
2. **Mirror**: locked contrarian, 8 HP; every 5 turns the cadence flips (everyone reverses) for 5 turns, telegraphed.
3. **Warden**: never locked, 12 HP, hits 2, chases every other turn; two drones arrive every 7 turns. Only cards can put it in a pit.

## Meta (unlocks only)

Saved per player through the artifact's private per-user storage (`db`, `data/users/<id>/profile`), falling back to browser storage when signed out.

- **Characters:** Recruit (start: Sidestep, Stomp; 8 HP). Drummer, unlocked by beating the Colossus (Double Time, About Face; 7 HP; 4 slots). Sapper, unlocked by winning a run (Quake, Shove; 9 HP; pits hold 3).
- **Cards:** start pool is Sidestep, Stomp, Double Time, About Face, Lunge, Shove and Trapdoor; Quake (beat the Colossus), Magnet (reach act 2), Recall (beat the Mirror), Brace (die three times).
- **Cadence ladder (difficulty):** win at Cadence N to unlock N+1, up to 5. Each level bundles changes, Slay the Spire 2 style: C1 +1 enemy per fight; C2 frenzy 10 turns sooner; C3 elites +1 HP and rest heals 2; C4 bosses +4 HP; C5 start with 2 less HP.

## Presentation

- Look: a parade ground. Slate-navy floor with chalk grid lines, brass accent, crimson/violet/rust enemies, a cream cadet with a brass ring. Big Shoulders Display, Barlow, IBM Plex Mono.
- Feel: tweened movement, hit flashes, particles on pit falls, floating damage, light screen shake (off under reduced motion), small synth sounds with a mute toggle.
- **Intent preview:** hovering the board or a direction shows ghost markers where every enemy will end up, and damage you'd take. This replaces the old per-button numbers, which taught naive play.

## Bot findings that shaped this (prototype v1–v4, Fable's harness in `sim/`)

- Waves that refilled forever → arrivals capped; frenzy timer stops corner camping (30 turns too short, 80 started stalls, 60 in the arena prototype → 40 here because fights are single-roster).
- Pits filling at 2 per wave stopped planners farming them.
- "Spiked walls" as a passive was a 110-kill engine → anything that damages blocked enemies must be limited (Quake has a 4-turn cooldown).
- Chase tie-break bug let a chaser mirror you forever → fixed with straight-line tie-break.
- Skill gap in v2: corner 4 / naive 8 / pad-numbers 17 / 2-ply planner 32.

## Balance pass 1 (2026-10-28, Fable's `sim/run4.js`)

Found: Quake dominant (Sapper 2-ply 67–75% vs Recruit 0–17%); boss enrage didn't end fights (reinforcements relocked, drone pit kills filled the pits); Warden 0% without Shove; normal-fight stall from a lone slow chaser after frenzy; ~375 unspent gold at the end of runs.

Changed: enrage sets frenzy and frees the boss's line (cap 14); boss-fight pits never fill; heavies stop resting in a frenzy; Quake only hurts already-pinned enemies, CD 5; Warden 12 → 9 HP; chasers can't see trapdoors (Trapdoor now in the start pool as the Warden answer); a locked enemy only strikes on landing if it actually moved; waiting can't push a fight past 10 enemies; shop cheaper (cards 30–45, upgrade 40, heal 25) plus Rations (+1 max HP, 45 rising by 15); shops twice as common.

Result (2-ply, C0): Recruit 17%, Drummer 58%, Sapper 33% (was 0 / 8 / 67); stalls 0 everywhere (was up to 8 of 12). Still open: Warden is a draft check (only Trapdoor reliably beats it), Magnet/Recall/Brace/Sidestep are weak picks, gold still under-spent (~50 of ~350).

## Pace, feel and variety pass (2026-10-28)

Borrowed from Hoplite / Shogun Showdown (small dense boards, actions that feed the next), Balatro / Slay the Spire (loud payoffs), Into the Breach (board as puzzle), Crypt of the NecroDancer (moves on a beat) and Vlambeer-style game feel.

- **Rooms:** 12 hand-made rooms, 7×7 to 11×9 (3 per act + a boss room each), drawn as text in `ROOMS`. Fights now take a median 12 turns (was 40+). Frenzy at 30.
- **Hazards:** ice (slide until blocked), spikes (1 damage on entering; bosses immune), powder kegs (block like walls; blow when crashed into, shoved into or bumped: 1 to everything adjacent, chain to neighbouring kegs), conveyor belts (carry whatever stands on them at end of turn).
- **Combos:** 2+ enemies down from one action = "Double/Triple/Quad drop / Rout": +n×(n−1) gold and every card's cooldown −1. The preview labels combo moves.
- **Acts have their own light:** act 1 daylight sandstone, act 2 lamplit barracks, act 3 torchlit night citadel; the page around the board follows.
- **Juice:** the line ripples leader-first, squash and stretch, hit-stop on kills/hits/blasts, enemies slide and spin into pits, camera nudge, combo banners.
- **Sound:** your step is a snare, the line's step a tom; a quiet drum cadence plays under fights, adds hi-hats when anything breaks step and doubles in a frenzy.

Quick bot check (1-ply, 12 runs): 3 wins, no errors or stalls, combos ~1 per 7 fights (max triple). Not yet re-run through Fable's harness.

## Toy diorama look (2026-10-28)

From a look at Into the Breach, Hitman GO, Inscryption, Patapon, Frozen Synapse and Mini Metro: the immersive ones make the board a lit physical object, commit to one material, and draw plans onto the world. Mockups: the design canvas (`design/Diorama*.dc.html`).

- **Board:** a painted parade ground on a wooden plinth, seen from the front with mild perspective (back rows smaller). Straight-on rather than isometric so "right" on the keyboard is still right on screen. Brass name plate with the room name.
- **Pieces:** tin toy soldiers on green bases. Drones red, contrarians violet and cast facing backwards, heavies orange grenadiers, runners green, anchors grey; bosses are big display pieces with a red base ring, elites a gold one. Your cadet is blue with a brass ring (drum for the Drummer, spade for the Sapper). Broken-step enemies tip off true inside a red grease-pencil scribble; red dots over a head count blocked turns; tin pips show hit points.
- **Walls by act:** alphabet blocks (nursery), stacked books (study), toy-box crates (night). A wall fades when a piece stands behind it.
- **Planning:** hovering a move draws chalk arrows on every piece that will move (yours in brass, broken ones as red zigzags, pit drops as dashed yellow rings); combo and damage previews are grease-pencil notes.
- **Settings:** act 1 a sunny nursery windowsill, act 2 a lamplit study desk, act 3 a toy box at night with a candle.
- **HUD:** move cards are paper drill cards, health is tin medals, the fight status is a chalk slate.

## Rifleman, bonus orders, drill orders (2026-10-28)

From a comparison with the genre's favourites: the core rule held up, but build depth, enemy variety and room asks were thin. Three borrowings:

- **Rifleman** (Hoplite's archer). It stands its ground, reloads for 2 turns, then fires along its row or column as soon as you're in line. Walls stop the shot; anything else in the way (an enemy, a keg) takes it instead, so you can steer your own line in front of it. Red dashed lanes and an "aim!" note mark a loaded one; the preview counts the shot. It appears in all three acts and yields with the rest of the line. A first version that marched in lockstep almost never fired: a locked piece keeps its offset from you, so it stayed out of line about 93% of the time.
- **Bonus orders** (Into the Breach). Every non-boss room has one, worth 10–20 gold: *Take the colours* (step on a far flag before the room is clear and before an enemy does), *Pit drill* (3 pit drops), *Hold the line* (nobody breaks step), *Parade order* (take no damage), *Quick march* (clear by turn 10). They're shown on the slate.
- **Drill orders** (relics). Twelve run-long passives, such as Fixed bayonets (bump for 2), Iron ranks (first hit each fight is blocked), Steady drum (break at 4), Deep pits, Sappers' pride (pit drops cool cards) and Reserve slot. Bosses offer 1 of 3; each shop sells one for 75–90 gold. That gives about 3.5 per run and a use for the gold.

Bot check (1-ply, C0, 60 runs each, `node sim/run4.js new 60`):

| | Win, with orders | Win, without | Gold spent |
|---|---|---|---|
| Recruit | 33% | 23% | 143 vs 60 |
| Drummer | 38% | 40% | 199 vs 76 |
| Sapper | 37% | 28% | 181 vs 60 |

v9 was about 28% on the same bot. Bonus success: Hold the line 85–95% and Parade order 85–96% (too easy for a bot), Quick march about 65%, Take the colours about 50%, Pit drill about 38%. Riflemen land about 0.3 shots per run on the bot, which reads the preview and sidesteps them. Humans will feel them more, but if playtests agree, shorten the reload or add more riflemen. Stalls (about 10 in 60) were already there in v9 and are not fixed. The 2-ply bot was not re-run.

## Side-view experiment (2026-10-28, `prototype/side-view.html`, Fable's `sim/side.js`)

Same rule on a side-on stage with gravity (walk, jump, wait; the line copies walks and jumps). Verdict: **weaker as the core**. No bot won; 1–2-ply bots died to gap jumps (a 4-input plan), stages 1–2 could be cleared by pressing Wait because chasers walk off ledges, frenzy drops could be farmed from a safe platform, and jump-spam beat a 3-ply planner. Lockstep itself rarely mattered (enemies died before ever breaking step). Possible future: one side-view act inside the roguelite, if chasers become ledge-aware, frenzy drops stop scoring, and jumps become 2-input arcs.

## Open questions only playtests answer

- Is reading the room's vector legible enough that people find two-push pit setups?
- Do cooldown cards feel like a build, or like a menu?
- Is 3 acts the right length (~25 minutes)?
