# Lockstep history

The dated design and balance passes, newest last, with the bot numbers behind each change. The current rules are in [design.md](design.md); this file is a record and isn't updated when rules change later.

## Prototype bot findings (v1–v4, Fable's harness, now in `archive/sim/`)

- Waves that refilled forever → arrivals capped; frenzy timer stops corner camping (30 turns too short, 80 started stalls, 60 in the arena prototype → 40 here because fights are single-roster).
- Pits filling at 2 per wave stopped planners farming them.
- "Spiked walls" as a passive was a 110-kill engine → anything that damages blocked enemies must be limited (Quake has a 5-turn cooldown and only hurts enemies already pinned).
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
- **Bonus orders** (Into the Breach). Every non-boss room has one, worth 10–20 gold: *Take the colours* (step on a far flag before the room is clear and before an enemy does), *Pit drill* (3 pit drops), *Clean drill* (no enemy is ever blocked; was *Hold the line*, nobody breaks step), *Parade order* (take no damage by turn 14; was no turn limit), *Quick march* (clear by turn 10). They're shown on the slate.
- **Drill orders** (relics). Twelve run-long passives, such as Fixed bayonets (bump for 2), Iron ranks (first hit each fight is blocked), Steady drum (break at 4), Deep pits, Sappers' pride (pit drops cool cards) and Reserve slot. Bosses offer 1 of 3; each shop sells one for 75–90 gold. That gives about 3.5 per run and a use for the gold.

Bot check (1-ply, C0, 60 runs each, `node sim/run4.js new 60`):

| | Win, with orders | Win, without | Gold spent |
|---|---|---|---|
| Recruit | 33% | 23% | 143 vs 60 |
| Drummer | 38% | 40% | 199 vs 76 |
| Sapper | 37% | 28% | 181 vs 60 |

v9 was about 28% on the same bot. Bonus success: Hold the line 85–95% and Parade order 85–96% (too easy for a bot), Quick march about 65%, Take the colours about 50%, Pit drill about 38%. Riflemen land about 0.3 shots per run on the bot, which reads the preview and sidesteps them. Humans will feel them more, but if playtests agree, shorten the reload or add more riflemen. Stalls (about 10 in 60) were already there in v9 and are not fixed. The 2-ply bot was not re-run.

## Side-view experiment (2026-10-28, `archive/prototype/side-view.html`, Fable's `archive/sim/side.js`)

Same rule on a side-on stage with gravity (walk, jump, wait; the line copies walks and jumps). Verdict: **weaker as the core**. No bot won; 1–2-ply bots died to gap jumps (a 4-input plan), stages 1–2 could be cleared by pressing Wait because chasers walk off ledges, frenzy drops could be farmed from a safe platform, and jump-spam beat a 3-ply planner. Lockstep itself rarely mattered (enemies died before ever breaking step). Possible future: one side-view act inside the roguelite, if chasers become ledge-aware, frenzy drops stop scoring, and jumps become 2-input arcs.

## Engineering pass (2026-10-28)

- Rules moved out of `index.html` into `rules.js`; the harness requires it directly instead of cutting the script out of the page, and every `sim/` script now finds its page relative to the repo.
- Seeded RNG. The hover preview of a wait now shows the enemy that will really arrive (it used to roll a different one).
- Rule tests (`tests/rules.test.js`): lockstep and contrarians, pit drops and fill, breaking free and falling back into step, keg chains and combos, belts, rifle line of sight, rifleman yield, frenzy arrivals, Cadence 2, seeding, preview, profile merge, shop.
- Fixed: enemies that arrived during a frenzy came in locked, which could leave a fight with a drone that copies you forever (a source of bot stalls).
- Fixed: the account profile overwrote this browser's on load, so unlocks earned while signed out were lost. The two are now combined (unlocks from both, highest counts).
- Fixed: the Cadence 2 text said frenzy comes 10 turns sooner; the code does 6 (kept, text changed).
- Rest and shop actions are rule functions now (`restHeal`, `buyCard`, ...), so the page and the bots share them.

Bot check (1-ply, C0, 30 runs per row): about the same as v10, 17–57% wins by row against 13–37% on the old code; 30 runs per row is noisy.

Anchors (decided in the next pass): they used to yield with the rest of their line gone, which made an anchor elite "clear the normal enemies". Making them fight on dropped the 1-ply win rate from about 33% to about 12%. They now leave their post and fall into step instead, so the core rule finishes them (no change in win rate).

## Balance pass 2 (2026-10-29)

Changes, each its own commit with bot numbers in the message:
- **Stalls:** in a frenzy the broken line runs (two steps) every third turn; a Recall during a frenzy holds for 4 turns. Nearly every stall was one chaser the player could outpace forever, or a frenzy Recall that relocked enemies for good.
- **Mirror** seals any pit it climbs out of; 9 HP. **Warden** marches in step on the turns it doesn't chase (so it can be stepped into a pit; it was a draft check); back to 12 HP.
- **Anchors** fall into step when their line is gone (they used to yield).
- **Bonus orders:** Parade order now needs no damage *by turn 14*; Hold the line became *Clean drill* (no enemy ever blocked). All bonuses now land 36–70% for the 1-ply bot.
- **Gold:** supply wagon at the pre-boss campfire, shop Restock, Rations +25 each. Unspent gold ~220 → ~75.
- Lunge hurts on spikes it dashes across; winning on the turn you'd fall leaves you on 1; rests can be skipped (a full-health, fully upgraded hand used to soft-lock the rest screen).

Bot check, win % per character (recruit / drummer / sapper), 150 runs (1-ply) or 60 (2-ply) each:

| | v10 1-ply | now 1-ply | v10 2-ply | now 2-ply |
|---|---|---|---|---|
| C0 | 26 / 46 / 31 | 48 / 59 / 49 | 58 / 73 / 48 | 82 / 88 / 83 |
| C3 | 17 / 32 / 25 | 34 / 43 / 45 | 48 / 72 / 63 | 72 / 83 / 80 |
| C5 | 9 / 11 / 11 | 7 / 20 / 13 | 20 / 55 / 32 | 52 / 77 / 53 |

Stalls per 150 1-ply runs went from 12–36 to 1–6. The game is clearly **easier** now, mostly because the Warden is no longer a draft check and spare gold turns into max health. No difficulty target is written down yet; set one from playtests, then tune with the obvious levers (Rations price, wagon contents, Warden HP, Cadence steps). The 2-ply bot still beats the Mirror 100% of the time (13–22 turns), so it remains the softest boss.

## Variety pass: turned rooms and synergies (2026-10-30)

From a comparison with Enter the Gungeon: its run wrapper (room variety, item synergies, a codex, boss pools) is where Lockstep was thinnest. The two cheapest were built.
- **Turned rooms.** Every fight mirrors its room at random, and square rooms also rotate, so the 12 layouts play up to 8 ways each. Non-square rooms only mirror, so a wide room never becomes a tall board.
- **Synergies.** Six card + perk pairs with a small bonus each, announced when they come together (Gungeon's "!" pop).
- Bots, `check 100` at C0, before → after: Recruit 43% → 48%, Drummer 65% → 55%, Sapper 55% → 44%, stalls 1–2 either way. The swings go both ways, so they read as noise from the reshuffled rooms; the bot drafts at random and rarely completes a synergy.
- Not built: a codex of discovered pieces, boss pools per act, a limited panic button.

Review round the same day (three code reviews, a browser playtest, a design read, a balance run of ~23k bot runs plus 18k single fights):
- Turning added little: most rooms are symmetric, so only turns that change the layout are kept (5 rooms never turn). No room played harder or easier in any turn.
- Synergy bonuses measured on their own (pair held, bonus on vs off): Hobnail stomp +5.5 pts, Bayonet charge +4 (Recruit +12), Powder quake +3.6 (borderline). Bottomless, Drum roll and Mined ground did nothing and were dropped; Bottomless also failed when the shoved enemy slid into the pit on ice. Pairs complete in only ~20–30% of runs because perks come from bosses and shops only.
- Bots after the trim, `check 100` at C0: Recruit 48%, Drummer 56%, Sapper 51%, stalls 0–2.
- Fixed: taking a perk that completed a pair covered the "Synergy!" toast with the perk's own, and the pair was never announced again.
- Open from the reviews: hard to read which row a figure is on (the playtest's biggest complaint); act-3 Warden causes 20–31% of deaths; Recruit trails (42% vs 51–58%); Spike lanes never kills; the act-3 boss perk offer is wasted; cadets differ only by hand; 4 events, one boss per act; no enemy twists the copy rule. Small bugs: last room's pit mark shows on the next board, "Take the orders" replaces a card without asking, the pre-boss wagon resets Rations' price, "Into the pits" offered with 2 enemies, Abandon run has no confirm, Briefing button on the title screen.


## Trapdoor check, 2-ply (2026-10-31)

Run on top of the card fixes (cooldowns reset each fight; Brace covers the end of the turn). `SEED=1 BOT=2ply CAD=0|3 node sim/run4.js cards 60` (the cards section now takes `BOT`, `CAD` and `ONLY`) and `SEED=1 node sim/run4.js bosses 40`.

- Whole runs, Recruit, card in the starting hand and preferred in drafts (C0 / C3): Trapdoor 98 / 98%, Recall 97 / 88% (7 elite stalls at C3), Lunge 93 / 95%, Double Time 88 / 87%, Brace 78 / 82%, Quake 77 / 73%, Shove 80 / 65%, About Face 73 / 58%, Magnet 67 / 62%. No drafting: 27%. These rows start with three cards; the "random" row (83 / 80%) starts with two, so compare cards with each other, not with it. The top cards are at the ceiling, so whole-run win rate can't show a nerf.
- Boss fights alone, 2-ply, 40 each, the card added to the Recruit's hand (Warden): Trapdoor 98% (24 turns, 7.7 health left), Recall 95% (48 turns, enrage in 90%), Double Time 80%, Lunge 65%, Shove 35–48%, About Face 40%, Sidestep 38%, Magnet 35%, Quake 28%, nothing 43%. Colossus and Mirror are 63–100% with any card. Trapdoor's edge: a chaser walks straight into a pit it can't see, every time, for 3. (The first pass only tried Shove, Lunge, Quake and Brace; the review of this PR caught that, and `bosses` now tries every card.)
- Tried (not kept): cooldown 7, open 3 turns, both: no change (95–100%). Closing after one catch: Warden still 95% (one drop per trapdoor, 4 trapdoors), Colossus 98 → 78%.
- So it is a Warden problem as much as a Trapdoor one: hard without it, free with it. Options were: bosses see trapdoors, or take less from them, together with an easier Warden.
- **Decision (Todd):** keep it, no rule change. The Warden is a draft check; Trapdoor, Recall and Double Time answer it.
