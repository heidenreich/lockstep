// The shape of a run, as saved in the player's browser (`lockstep-run`). rules.js builds these in newRun, newFight,
// spawn, setGoal, makeShop, fightReward and endRun; the page reads them through R (js/store.js).
// If you add, rename or remove a field here, the save's shape has changed: bump RUN_V in rules.js and add the step to
// migrateRun, with a test that loads an old save (docs/development.md, "Saved runs").

interface Pos { x: number; y: number }

interface HandCard {
  id: string;          // a key of CARDS
  cd: number;          // turns until it can be played again
  up: boolean;         // upgraded (cdUp, textUp)
}

interface Enemy extends Pos {
  id: number;
  type: string;        // a key of FOES
  hp: number;
  max: number;
  blocked: number;     // turns blocked in a row; at BREAK it breaks free
  free: boolean;       // broken step: chases instead of copying you
  chased: number;      // turns spent chasing far from you, toward RELOCK
  skip: boolean;       // resting this turn (heavies, the Warden)
  dir: [number, number];
  load?: number;       // riflemen: turns until loaded
  loose?: boolean;     // an anchor or rifleman whose line is gone, now in step
  heldUntil?: number;  // recalled in a frenzy: held in step until this turn
}

interface Goal {
  id: string;          // a key of GOALS
  ok: boolean;         // still achievable
  flag?: Pos;          // "colours": where the flag stands
  took?: boolean;      // "colours": you reached the flag
  paid?: boolean;      // done and paid out
}

interface Fight {
  kind: "fight" | "elite" | "boss" | "drill";
  room: string;        // a room id (roomById)
  orient: number;      // how the room is turned (roomOrients)
  turn: number;
  arrivals: number;
  pitFill: Record<string, number>;  // "x,y" -> drops into that pit
  traps: (Pos & { t: number })[];   // open trapdoors and turns left
  kegs: string[];      // "x,y" of kegs still standing
  frenzy: boolean;
  frenzyAt: number;
  frenzySince?: number;
  flip: number;        // the Mirror: turns of flipped direction left
  flipIn: number;      // the Mirror: turns until it flips
  sealed?: string[];   // "x,y" of pits the Mirror sealed
  brace: boolean;
  iron: boolean;       // Iron ranks: the first hit this fight is blocked
  enemies: Enemy[];
  nextId: number;
  p: Pos;              // you
  pdir?: [number, number];
  log: { t: number; msg: string }[];
  over: null | "win" | "lose";
  gold: number;
  lastHurt: number;
  actKills: number;
  bestChain: number;
  pitKills: number;
  goal: Goal | null;
  ui?: any;            // the page's own notes (coach progress, briefing state); the rules never read it
}

interface MapNode { r: number; c: number; t?: string }
interface RunMap { act: number; nodes: Record<string, MapNode>; edges: string[] }

interface Offer { id: string; price: number; sold: boolean }
interface Shop {
  cards: Offer[];
  order: Offer | null;
  upPrice: number;
  healPrice: number;
  hpPrice: number;
  restockPrice: number;
  pending: { id: string; idx: number } | null;  // a card bought with a full hand, waiting for a slot
  wagon?: boolean;     // the pre-boss supply wagon
}

interface Reward {
  gold: number;
  cards: string[];
  upgrade: boolean;
  pending: string | null;
  took: boolean;
  orders: string[];
  tookOrder: boolean;
  goal: { id: string; ok: boolean } | null;
}

interface RunStats {
  kills: number;
  pitKills: number;
  fights: number;
  turns: number;
  unlocked?: string[];
  shotsTaken?: number;
  shotsStray?: number;
}

interface RunEnd { won: boolean; act: number; stats: RunStats; gold: number; char: string; cad: number }

interface Run {
  v: number;           // RUN_V when saved
  seed: number;
  rng: number;
  char: string;        // a key of CHARS
  cad: number;         // Cadence level
  hp: number;
  maxhp: number;
  gold: number;
  act: number;
  slots: number;
  pitHold: number;
  hand: HandCard[];
  orders: string[];    // perks held (keys of ORDERS)
  map: RunMap | null;
  pos: string | null;  // the map node you stand on
  walked: string[];
  screen: "map" | "fight" | "reward" | "shop" | "rest" | "event" | "end";
  fight: Fight | null;
  reward: Reward | null;
  shop: Shop | null;
  event: number | null;  // index into EVENTS
  end: RunEnd | null;
  stats: RunStats;
  synSeen?: string[];  // synergies already announced
}
