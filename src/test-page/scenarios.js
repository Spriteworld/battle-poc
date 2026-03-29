import Items from '@Data/items/';
import * as staticPokemon from '@Data/pokemon/';
import { Pokedex, GAMES, NATURES, STATS, GENDERS, Moves, Abilities, EXPERIENCE_TABLES, GROWTH, FRLG_LEARNSETS } from '@spriteworld/pokemon-data';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NATURE_LIST = Object.values(NATURES);
const STAT_KEYS   = [
  STATS.HP, STATS.ATTACK, STATS.DEFENSE,
  STATS.SPECIAL_ATTACK, STATS.SPECIAL_DEFENSE, STATS.SPEED,
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickUnique(arr, n) {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length));
}

function buildMovePool() {
  return Moves.getMovesByGameId(GAMES.POKEMON_FIRE_RED).filter(
    m => m.pp > 0 && (m.power !== null || m.category === Moves.MOVE_CATEGORIES.STATUS)
  );
}

let _cachedDex = null;
let _cachedMovePool = null;
function getDexAndMoves() {
  if (!_cachedDex) {
    const dex = new Pokedex(GAMES.POKEMON_FIRE_RED);
    _cachedDex = Object.values(dex.pokedex);
    _cachedMovePool = buildMovePool();
  }
  return { allSpecies: _cachedDex, movePool: _cachedMovePool };
}

/** Looks up a move by name from the FR pool. Returns a move-slot object or null. */
function namedMove(name) {
  const { movePool } = getDexAndMoves();
  const m = movePool.find(m => m.name.toLowerCase() === name.toLowerCase());
  return m ? { name: m.name, pp: { max: m.pp, current: m.pp } } : null;
}

/**
 * Builds a Pokémon config where the first N slots are specific named moves
 * and the remainder are filled randomly. Accepts an optional forced ability.
 */
function monWithMoves(level, pid, moveNames, ability = null) {
  const { allSpecies, movePool } = getDexAndMoves();
  const entry   = pick(allSpecies);
  const named   = moveNames.map(namedMove).filter(Boolean);
  const usedSet = new Set(named.map(m => m.name.toLowerCase()));
  const filler  = pickUnique(
    movePool.filter(m => !usedSet.has(m.name.toLowerCase())),
    4 - named.length,
  );
  const moves = [
    ...named,
    ...filler.map(m => ({ name: m.name, pp: { max: m.pp, current: m.pp } })),
  ];
  const ivs = Object.fromEntries(STAT_KEYS.map(s => [s, 31]));
  const evs = Object.fromEntries(STAT_KEYS.map(s => [s, 0]));
  return {
    game: GAMES.POKEMON_FIRE_RED,
    pid,
    species: entry.nat_dex_id,
    level,
    nature:  pick(NATURE_LIST),
    gender:  pick([GENDERS.MALE, GENDERS.FEMALE]),
    ability: { name: ability ?? 'none' },
    moves, ivs, evs,
  };
}

function randomPokemon(allSpecies, movePool, level, pid, ability = null) {
  const entry = pick(allSpecies);
  const moves = pickUnique(movePool, 4).map(m => ({
    name: m.name,
    pp:   { max: m.pp, current: m.pp },
  }));
  const ivs = Object.fromEntries(STAT_KEYS.map(s => [s, 31]));
  const evs = Object.fromEntries(STAT_KEYS.map(s => [s, 0]));
  return {
    game: GAMES.POKEMON_FIRE_RED,
    pid,
    species: entry.nat_dex_id,
    level,
    nature:  pick(NATURE_LIST),
    gender:  pick([GENDERS.MALE, GENDERS.FEMALE]),
    ability: { name: ability ?? 'none' },
    moves, ivs, evs,
  };
}

function randomTeam(size = 3, level = 50) {
  const { allSpecies, movePool } = getDexAndMoves();
  return Array.from({ length: size }, (_, i) =>
    randomPokemon(allSpecies, movePool, level, i + 1)
  );
}

/**
 * Builds a random Pokémon whose exp is set to exactly 1 below the threshold
 * for `level + 1`, using the species' own growth rate.  Killing any enemy
 * (even a level 1 mon) will push it over the edge and trigger a level-up.
 */
function monNearLevelUp(level, pid) {
  const { allSpecies, movePool } = getDexAndMoves();
  const entry  = pick(allSpecies);
  const moves  = pickUnique(movePool, 4).map(m => ({
    name: m.name,
    pp:   { max: m.pp, current: m.pp },
  }));
  const ivs = Object.fromEntries(STAT_KEYS.map(s => [s, 31]));
  const evs = Object.fromEntries(STAT_KEYS.map(s => [s, 0]));

  const growth    = entry.growth ?? GROWTH.MEDIUM_FAST;
  const table     = EXPERIENCE_TABLES[growth] ?? EXPERIENCE_TABLES[GROWTH.MEDIUM_FAST];
  const nextLvlXp = table[level] ?? (table[level - 1] + 1000);
  const exp       = nextLvlXp - 1;

  return {
    game: GAMES.POKEMON_FIRE_RED,
    pid,
    species: entry.nat_dex_id,
    level,
    nature:  pick(NATURE_LIST),
    gender:  pick([GENDERS.MALE, GENDERS.FEMALE]),
    ability: { name: 'none' },
    moves, ivs, evs,
    exp,
  };
}

/**
 * Builds a Pokémon guaranteed to learn a new move on their next level-up AND
 * already carrying a full 4-move set so the "replace a move?" dialog fires.
 *
 * Scans random species until it finds one whose FRLG learnset has an entry at
 * a level between 10 and 50.  The Pokémon is placed at (targetLevel − 1) with
 * exp 1 below the threshold.  Killing any enemy triggers the level-up and the
 * move-learn flow.
 */
function monForMoveLearn(pid) {
  const { allSpecies, movePool } = getDexAndMoves();

  let entry, targetLevel, learnMoveName;
  for (let attempt = 0; attempt < 100; attempt++) {
    const candidate = pick(allSpecies);
    const learnset  = FRLG_LEARNSETS[candidate.nat_dex_id] ?? [];
    // Find a level-up move in a range where the mon plausibly has 4 moves already.
    const match = learnset.find(([lvl]) => lvl >= 10 && lvl <= 50);
    if (match) {
      entry         = candidate;
      [targetLevel, learnMoveName] = match;
      break;
    }
  }

  // Fallback — should never trigger given how many FR mons have learnsets.
  if (!entry) return monNearLevelUp(9, pid);

  const level = targetLevel - 1;

  // Fill all 4 slots with moves other than the one about to be learned, so
  // the player is forced to choose which move to replace.
  const excluded = new Set([learnMoveName.toLowerCase()]);
  const moves = pickUnique(
    movePool.filter(m => !excluded.has(m.name.toLowerCase())),
    4,
  ).map(m => ({ name: m.name, pp: { max: m.pp, current: m.pp } }));

  const growth    = entry.growth ?? GROWTH.MEDIUM_FAST;
  const table     = EXPERIENCE_TABLES[growth] ?? EXPERIENCE_TABLES[GROWTH.MEDIUM_FAST];
  const nextLvlXp = table[level] ?? (table[level - 1] + 1000);
  const exp       = nextLvlXp - 1;

  const ivs = Object.fromEntries(STAT_KEYS.map(s => [s, 31]));
  const evs = Object.fromEntries(STAT_KEYS.map(s => [s, 0]));

  return {
    game: GAMES.POKEMON_FIRE_RED,
    pid,
    species: entry.nat_dex_id,
    level,
    nature:  pick(NATURE_LIST),
    gender:  pick([GENDERS.MALE, GENDERS.FEMALE]),
    ability: { name: 'none' },
    moves, ivs, evs,
    exp,
  };
}

/**
 * Team where the lead has specific moves/ability, rest are random.
 */
function teamWithLead(size, level, leadMoves, leadAbility = null) {
  const { allSpecies, movePool } = getDexAndMoves();
  return [
    monWithMoves(level, 1, leadMoves, leadAbility),
    ...Array.from({ length: size - 1 }, (_, i) =>
      randomPokemon(allSpecies, movePool, level, i + 2)
    ),
  ];
}

function defaultInventory() {
  return {
    items: [
      { item: new Items.Potion(),       quantity: 5 },
      { item: new Items.SuperPotion(),  quantity: 3 },
      { item: new Items.HyperPotion(),  quantity: 2 },
      { item: new Items.MaxPotion(),    quantity: 1 },
      { item: new Items.FullRestore(),  quantity: 1 },
      { item: new Items.Ether(),        quantity: 2 },
      { item: new Items.Revive(),       quantity: 2 },
    ],
    pokeballs: [],
    tms: [],
  };
}

// ─── Categories ───────────────────────────────────────────────────────────────

export const CATEGORIES = [
  { id: 'basics',    label: 'Basics'    },
  { id: 'weather',   label: 'Weather'   },
  { id: 'status',    label: 'Status'    },
  { id: 'field',     label: 'Field'     },
  { id: 'abilities', label: 'Abilities' },
  { id: 'endgame',   label: 'Endgame'   },
];

// ─── Scenarios ────────────────────────────────────────────────────────────────

const SCENARIOS = [

  // ── Basics ──────────────────────────────────────────────────────────────────

  {
    id: 'wild-easy',
    category: 'basics',
    title: 'Wild — Easy',
    description: 'Starter trio (Bulbasaur, Charmander, Squirtle) vs a single wild Rattata. Good for basics: combat, switching, and items.',
    color: 'bg-green-800',
    tags: ['wild', '3v1', 'lv5'],
    buildData() {
      return {
        field: { weather: null, terrain: 'normal' },
        player: {
          name: 'Player',
          team: [
            staticPokemon.player_bulbasaur,
            staticPokemon.player_charmander,
            staticPokemon.player_squirtle,
          ],
          inventory: defaultInventory(),
        },
        enemy: { isTrainer: false, name: null, team: [staticPokemon.wild_rattata] },
      };
    },
  },

  {
    id: 'wild-scary',
    category: 'basics',
    title: 'Wild — Scary',
    description: 'Starter trio vs a wild Gyarados. Tests high-pressure combat, KOs, and Pokémon fainting.',
    color: 'bg-blue-900',
    tags: ['wild', '3v1', 'lv20'],
    buildData() {
      return {
        field: { weather: null, terrain: 'normal' },
        player: {
          name: 'Player',
          team: [
            staticPokemon.player_bulbasaur,
            staticPokemon.player_charmander,
            staticPokemon.player_squirtle,
          ],
          inventory: defaultInventory(),
        },
        enemy: { isTrainer: false, name: null, team: [staticPokemon.wild_gyarados] },
      };
    },
  },

  {
    id: 'trainer-1v1',
    category: 'basics',
    title: 'Trainer — 1v1',
    description: 'Trainer battle with a single Pokémon each. Quick smoke-test for trainer AI, win/lose state, and end-of-battle dialogue.',
    color: 'bg-yellow-700',
    tags: ['trainer', '1v1'],
    buildData() {
      const { allSpecies, movePool } = getDexAndMoves();
      return {
        field: { weather: null, terrain: 'normal' },
        player: {
          name: 'Player',
          team: [randomPokemon(allSpecies, movePool, 30, 1)],
          inventory: defaultInventory(),
        },
        enemy: { isTrainer: true, name: 'Rival', team: [staticPokemon.trainer_pikachu] },
      };
    },
  },

  {
    id: 'trainer-3v3',
    category: 'basics',
    title: 'Trainer — 3v3',
    description: 'Full 3-on-3 trainer battle with random species at lv50. Tests switching, multi-KO recovery, and trainer AI over a longer fight.',
    color: 'bg-purple-800',
    tags: ['trainer', '3v3', 'random', 'lv50'],
    buildData() {
      return {
        field: { weather: null, terrain: 'normal' },
        player: {
          name: 'Player',
          team: randomTeam(3, 50),
          inventory: defaultInventory(),
        },
        enemy: { isTrainer: true, name: 'Trainer', team: randomTeam(3, 50) },
      };
    },
  },

  // ── Weather ──────────────────────────────────────────────────────────────────

  {
    id: 'weather-rain',
    category: 'weather',
    title: 'Rain',
    description: '3v3 trainer battle under heavy rain. Water boosted, fire halved, Thunder never misses.',
    color: 'bg-sky-800',
    tags: ['trainer', '3v3', 'rain'],
    buildData() {
      return {
        field: { weather: 'rain', terrain: 'normal' },
        player: { name: 'Player', team: randomTeam(3, 50), inventory: defaultInventory() },
        enemy:  { isTrainer: true, name: 'Trainer', team: randomTeam(3, 50) },
      };
    },
  },

  {
    id: 'weather-sun',
    category: 'weather',
    title: 'Harsh Sun',
    description: '3v3 under harsh sunlight. Fire boosted, water halved, SolarBeam skips charge.',
    color: 'bg-orange-700',
    tags: ['trainer', '3v3', 'sun'],
    buildData() {
      return {
        field: { weather: 'sun', terrain: 'normal' },
        player: { name: 'Player', team: randomTeam(3, 50), inventory: defaultInventory() },
        enemy:  { isTrainer: true, name: 'Trainer', team: randomTeam(3, 50) },
      };
    },
  },

  {
    id: 'weather-sandstorm',
    category: 'weather',
    title: 'Sandstorm',
    description: '3v3 in a sandstorm. Rock-types gain SpDef. Non-immune types take end-of-turn chip.',
    color: 'bg-amber-800',
    tags: ['trainer', '3v3', 'sandstorm'],
    buildData() {
      return {
        field: { weather: 'sandstorm', terrain: 'normal' },
        player: { name: 'Player', team: randomTeam(3, 50), inventory: defaultInventory() },
        enemy:  { isTrainer: true, name: 'Trainer', team: randomTeam(3, 50) },
      };
    },
  },

  {
    id: 'weather-hail',
    category: 'weather',
    title: 'Hail',
    description: '3v3 in hail. Non-Ice types take chip each turn. Blizzard never misses.',
    color: 'bg-cyan-800',
    tags: ['trainer', '3v3', 'hail'],
    buildData() {
      return {
        field: { weather: 'hail', terrain: 'normal' },
        player: { name: 'Player', team: randomTeam(3, 50), inventory: defaultInventory() },
        enemy:  { isTrainer: true, name: 'Trainer', team: randomTeam(3, 50) },
      };
    },
  },

  {
    id: 'weather-setters-clash',
    category: 'weather',
    title: 'Weather Clash',
    description: 'Player leads with a Drizzle user, enemy leads with a Drought user. Tests weather-setter overwrite, display update, and which side wins.',
    color: 'bg-violet-700',
    tags: ['trainer', '3v3', 'drizzle', 'drought'],
    buildData() {
      return {
        field: { weather: null, terrain: 'normal' },
        player: {
          name: 'Player',
          team: teamWithLead(3, 50, ['Surf', 'Ice Beam', 'Thunderbolt', 'Rain Dance'], Abilities.DRIZZLE),
          inventory: defaultInventory(),
        },
        enemy: {
          isTrainer: true,
          name: 'Trainer',
          team: teamWithLead(3, 50, ['Flamethrower', 'Solar Beam', 'Fire Blast', 'Sunny Day'], Abilities.DROUGHT),
        },
      };
    },
  },

  // ── Status ───────────────────────────────────────────────────────────────────

  {
    id: 'status-burn-toxic',
    category: 'status',
    title: 'Burn & Toxic',
    description: 'Player lead has Will-O-Wisp and Toxic. Enemy has bulky lv50 mons that survive long enough to show burn/toxic chip and badge updates.',
    color: 'bg-red-800',
    tags: ['status', 'burn', 'toxic', 'lv50'],
    buildData() {
      return {
        field: { weather: null, terrain: 'normal' },
        player: {
          name: 'Player',
          team: teamWithLead(3, 50, ['Will-O-Wisp', 'Toxic', 'Shadow Ball', 'Protect']),
          inventory: defaultInventory(),
        },
        enemy: {
          isTrainer: true,
          name: 'Trainer',
          team: randomTeam(3, 50),
        },
      };
    },
  },

  {
    id: 'status-paralysis',
    category: 'status',
    title: 'Paralysis',
    description: 'Player lead has Thunder Wave and Body Slam. Enemy also has Thunder Wave. Tests speed reduction, full-paralysis turns, and PAR badge.',
    color: 'bg-yellow-600',
    tags: ['status', 'paralysis', 'lv50'],
    buildData() {
      return {
        field: { weather: null, terrain: 'normal' },
        player: {
          name: 'Player',
          team: teamWithLead(3, 50, ['Thunder Wave', 'Body Slam', 'Thunderbolt', 'Protect']),
          inventory: defaultInventory(),
        },
        enemy: {
          isTrainer: true,
          name: 'Trainer',
          team: teamWithLead(3, 50, ['Thunder Wave', 'Body Slam', 'Tackle', 'Protect']),
        },
      };
    },
  },

  {
    id: 'status-sleep',
    category: 'status',
    title: 'Sleep',
    description: 'Player lead has Spore (100% sleep). Enemy lead has Hypnosis. Tests sleep counter, wake-up mechanics, and SLP badge.',
    color: 'bg-indigo-700',
    tags: ['status', 'sleep', 'lv50'],
    buildData() {
      return {
        field: { weather: null, terrain: 'normal' },
        player: {
          name: 'Player',
          team: teamWithLead(3, 50, ['Spore', 'Leech Seed', 'Giga Drain', 'Synthesis']),
          inventory: defaultInventory(),
        },
        enemy: {
          isTrainer: true,
          name: 'Trainer',
          team: teamWithLead(3, 50, ['Hypnosis', 'Dream Eater', 'Psychic', 'Calm Mind']),
        },
      };
    },
  },

  {
    id: 'status-multi',
    category: 'status',
    title: 'All Status',
    description: 'Player has every major status infliction move across the team. Enemy is a lv60 tanky 3-mon to endure long enough for all conditions to appear.',
    color: 'bg-rose-900',
    tags: ['status', 'all', 'lv50'],
    buildData() {
      const { allSpecies, movePool } = getDexAndMoves();
      return {
        field: { weather: null, terrain: 'normal' },
        player: {
          name: 'Player',
          team: [
            monWithMoves(50, 1, ['Thunder Wave', 'Will-O-Wisp', 'Thunderbolt', 'Flamethrower']),
            monWithMoves(50, 2, ['Toxic', 'Spore', 'Leech Seed', 'Protect']),
            monWithMoves(50, 3, ['Hypnosis', 'Confuse Ray', 'Encore', 'Yawn']),
          ],
          inventory: defaultInventory(),
        },
        enemy: {
          isTrainer: true,
          name: 'Trainer',
          team: Array.from({ length: 3 }, (_, i) =>
            randomPokemon(allSpecies, movePool, 60, i + 1)
          ),
        },
      };
    },
  },

  {
    id: 'volatile-confusion',
    category: 'status',
    title: 'Confusion',
    description: 'Both leads enter already confused (3 turns remaining). Tests self-hit damage, confusion messages, and snap-out mechanics. Player also has Confuse Ray to re-apply.',
    color: 'bg-fuchsia-800',
    tags: ['volatile', 'confusion', 'lv50'],
    buildData() {
      const confused = { confusedTurns: 3 };
      return {
        field: { weather: null, terrain: 'normal' },
        player: {
          name: 'Player',
          team: [
            { ...monWithMoves(50, 1, ['Confuse Ray', 'Psybeam', 'Swift', 'Protect']), volatileStatus: confused },
            monWithMoves(50, 2, ['Confuse Ray', 'Supersonic', 'Thunderbolt', 'Protect']),
            monWithMoves(50, 3, ['Confuse Ray', 'Flatter', 'Shadow Ball', 'Protect']),
          ],
          inventory: defaultInventory(),
        },
        enemy: {
          isTrainer: true,
          name: 'Trainer',
          team: [
            { ...monWithMoves(50, 1, ['Confuse Ray', 'Supersonic', 'Tackle', 'Flatter']), volatileStatus: confused },
            monWithMoves(50, 2, ['Confuse Ray', 'Psybeam', 'Flail', 'Protect']),
            monWithMoves(50, 3, ['Confuse Ray', 'Supersonic', 'Quick Attack', 'Protect']),
          ],
        },
      };
    },
  },

  {
    id: 'volatile-nightmare',
    category: 'status',
    title: 'Nightmare',
    description: 'Player lead starts asleep and suffering Nightmare — loses 1/4 HP per turn while sleeping. Enemy has Dream Eater and Nightmare to deepen the drain. Wake up or faint.',
    color: 'bg-indigo-900',
    tags: ['volatile', 'nightmare', 'sleep', 'lv50'],
    buildData() {
      return {
        field: { weather: null, terrain: 'normal' },
        player: {
          name: 'Player',
          team: [
            {
              ...monWithMoves(50, 1, ['Spore', 'Nightmare', 'Dream Eater', 'Psychic']),
              status:         { SLEEP: 3 },
              volatileStatus: { nightmare: true },
            },
            monWithMoves(50, 2, ['Spore', 'Nightmare', 'Giga Drain', 'Protect']),
            monWithMoves(50, 3, ['Hypnosis', 'Dream Eater', 'Psychic', 'Calm Mind']),
          ],
          inventory: defaultInventory(),
        },
        enemy: {
          isTrainer: true,
          name: 'Trainer',
          team: teamWithLead(3, 50, ['Nightmare', 'Dream Eater', 'Hypnosis', 'Psychic']),
        },
      };
    },
  },

  {
    id: 'volatile-leech-seed',
    category: 'status',
    title: 'Leech Seed',
    description: 'Player lead enters already seeded — takes 1/8 HP drain each turn. Enemy has Wrap to stack trapping damage on top. Player has Rapid Spin to clear both.',
    color: 'bg-lime-900',
    tags: ['volatile', 'leech-seed', 'trap', 'lv50'],
    buildData() {
      return {
        field: { weather: null, terrain: 'normal' },
        player: {
          name: 'Player',
          team: [
            {
              ...monWithMoves(50, 1, ['Rapid Spin', 'Leech Seed', 'Giga Drain', 'Synthesis']),
              volatileStatus: { leechSeed: true },
            },
            monWithMoves(50, 2, ['Leech Seed', 'Ingrain', 'Giga Drain', 'Protect']),
            monWithMoves(50, 3, ['Leech Seed', 'Synthesis', 'Razor Leaf', 'Protect']),
          ],
          inventory: defaultInventory(),
        },
        enemy: {
          isTrainer: true,
          name: 'Trainer',
          team: teamWithLead(3, 50, ['Wrap', 'Bind', 'Leech Seed', 'Earthquake']),
        },
      };
    },
  },

  // ── Field ────────────────────────────────────────────────────────────────────

  {
    id: 'field-spikes',
    category: 'field',
    title: 'Spikes',
    description: 'Both leads can lay Spikes. Player also has Rapid Spin to clear them. Switch Pokémon in after hazards are up to see chip damage and badge display.',
    color: 'bg-yellow-900',
    tags: ['field', 'spikes', 'rapid-spin', 'lv50'],
    buildData() {
      return {
        field: { weather: null, terrain: 'normal' },
        player: {
          name: 'Player',
          team: teamWithLead(3, 50, ['Spikes', 'Rapid Spin', 'Earthquake', 'Rock Slide']),
          inventory: defaultInventory(),
        },
        enemy: {
          isTrainer: true,
          name: 'Trainer',
          team: teamWithLead(3, 50, ['Spikes', 'Toxic Spikes', 'Stealth Rock', 'Earthquake']),
        },
      };
    },
  },

  {
    id: 'field-screens',
    category: 'field',
    title: 'Screens',
    description: 'Both sides can set up Reflect and Light Screen. Enemy has high Attack and Sp. Atk to stress-test the damage reduction. Watch the barrier visuals.',
    color: 'bg-blue-700',
    tags: ['field', 'screens', 'reflect', 'light-screen', 'lv50'],
    buildData() {
      return {
        field: { weather: null, terrain: 'normal' },
        player: {
          name: 'Player',
          team: teamWithLead(3, 50, ['Reflect', 'Light Screen', 'Psychic', 'Thunderbolt']),
          inventory: defaultInventory(),
        },
        enemy: {
          isTrainer: true,
          name: 'Trainer',
          team: teamWithLead(3, 50, ['Reflect', 'Light Screen', 'Earthquake', 'Fire Blast']),
        },
      };
    },
  },

  {
    id: 'field-full-setup',
    category: 'field',
    title: 'Full Field Setup',
    description: 'Player has hazards + screens; enemy has all hazard moves too. Switch mons repeatedly to layer up hazards and test simultaneous field-condition display.',
    color: 'bg-teal-800',
    tags: ['field', 'all', 'lv50'],
    buildData() {
      const { allSpecies, movePool } = getDexAndMoves();
      return {
        field: { weather: null, terrain: 'normal' },
        player: {
          name: 'Player',
          team: [
            monWithMoves(50, 1, ['Spikes', 'Reflect', 'Light Screen', 'Rapid Spin']),
            monWithMoves(50, 2, ['Toxic Spikes', 'Stealth Rock', 'Protect', 'Toxic']),
            randomPokemon(allSpecies, movePool, 50, 3),
          ],
          inventory: defaultInventory(),
        },
        enemy: {
          isTrainer: true,
          name: 'Trainer',
          team: [
            monWithMoves(50, 1, ['Spikes', 'Stealth Rock', 'Toxic Spikes', 'Protect']),
            monWithMoves(50, 2, ['Reflect', 'Light Screen', 'Earthquake', 'Ice Beam']),
            randomPokemon(allSpecies, movePool, 50, 3),
          ],
        },
      };
    },
  },

  {
    id: 'volatile-substitute',
    category: 'field',
    title: 'Substitute',
    description: 'Player lead enters with a Substitute already active (30 HP). Enemy has weak moves to chip through the sub and strong moves to test sub-break. Tests sub absorption, break message, and behind-sub status immunity.',
    color: 'bg-slate-700',
    tags: ['volatile', 'substitute', 'lv50'],
    buildData() {
      return {
        field: { weather: null, terrain: 'normal' },
        player: {
          name: 'Player',
          team: [
            {
              ...monWithMoves(50, 1, ['Substitute', 'Baton Pass', 'Calm Mind', 'Psychic']),
              volatileStatus: { substitute: { hp: 30 } },
            },
            monWithMoves(50, 2, ['Substitute', 'Focus Punch', 'Earthquake', 'Rock Slide']),
            monWithMoves(50, 3, ['Substitute', 'Swords Dance', 'Slash', 'Aerial Ace']),
          ],
          inventory: defaultInventory(),
        },
        enemy: {
          isTrainer: true,
          name: 'Trainer',
          team: teamWithLead(3, 50, ['Tackle', 'Earthquake', 'Thunder Wave', 'Fire Blast']),
        },
      };
    },
  },

  // ── Abilities ────────────────────────────────────────────────────────────────

  {
    id: 'ability-intimidate',
    category: 'abilities',
    title: 'Intimidate',
    description: 'Both leads have Intimidate. Every switch lowers the opponent\'s Attack. Tests ATK drop stacking, Clear Body blocking, and the badge/stage display.',
    color: 'bg-orange-800',
    tags: ['ability', 'intimidate', 'lv50'],
    buildData() {
      return {
        field: { weather: null, terrain: 'normal' },
        player: {
          name: 'Player',
          team: teamWithLead(3, 50, ['Earthquake', 'Crunch', 'Ice Fang', 'Thunder Fang'], Abilities.INTIMIDATE),
          inventory: defaultInventory(),
        },
        enemy: {
          isTrainer: true,
          name: 'Trainer',
          team: teamWithLead(3, 50, ['Earthquake', 'Iron Head', 'Crunch', 'Roar'], Abilities.INTIMIDATE),
        },
      };
    },
  },

  {
    id: 'ability-type-absorb',
    category: 'abilities',
    title: 'Type Absorb',
    description: 'Player team has Water Absorb, Flash Fire, and Volt Absorb leads. Enemy has Water, Fire, and Electric moves. Tests immunity triggering and HP restoration.',
    color: 'bg-cyan-700',
    tags: ['ability', 'water-absorb', 'flash-fire', 'volt-absorb', 'lv50'],
    buildData() {
      const { allSpecies, movePool } = getDexAndMoves();
      return {
        field: { weather: null, terrain: 'normal' },
        player: {
          name: 'Player',
          team: [
            monWithMoves(50, 1, ['Surf', 'Ice Beam', 'Earthquake', 'Recover'], Abilities.WATER_ABSORB),
            monWithMoves(50, 2, ['Flamethrower', 'Fire Blast', 'Will-O-Wisp', 'Protect'], Abilities.FLASH_FIRE),
            monWithMoves(50, 3, ['Thunderbolt', 'Thunder', 'Volt Switch', 'Protect'], Abilities.VOLT_ABSORB),
          ],
          inventory: defaultInventory(),
        },
        enemy: {
          isTrainer: true,
          name: 'Trainer',
          team: [
            monWithMoves(50, 1, ['Surf', 'Hydro Pump', 'Waterfall', 'Rain Dance']),
            monWithMoves(50, 2, ['Flamethrower', 'Fire Blast', 'Heat Wave', 'Sunny Day']),
            monWithMoves(50, 3, ['Thunderbolt', 'Thunder', 'Discharge', 'Thunder Wave']),
          ],
        },
      };
    },
  },

  {
    id: 'ability-levitate',
    category: 'abilities',
    title: 'Levitate',
    description: 'Player team all have Levitate. Enemy leads with heavy Ground coverage (Earthquake, Dig). Tests Ground immunity, immunity messages, and no-damage results.',
    color: 'bg-purple-700',
    tags: ['ability', 'levitate', 'lv50'],
    buildData() {
      return {
        field: { weather: null, terrain: 'normal' },
        player: {
          name: 'Player',
          team: [
            monWithMoves(50, 1, ['Psychic', 'Thunderbolt', 'Ice Beam', 'Shadow Ball'], Abilities.LEVITATE),
            monWithMoves(50, 2, ['Dragon Claw', 'Flamethrower', 'Fly', 'Protect'],     Abilities.LEVITATE),
            monWithMoves(50, 3, ['Sludge Bomb', 'Giga Drain', 'Toxic', 'Recover'],     Abilities.LEVITATE),
          ],
          inventory: defaultInventory(),
        },
        enemy: {
          isTrainer: true,
          name: 'Trainer',
          team: [
            monWithMoves(50, 1, ['Earthquake', 'Dig', 'Rock Slide', 'Iron Tail']),
            monWithMoves(50, 2, ['Earthquake', 'Stone Edge', 'Crunch', 'Bulldoze']),
            monWithMoves(50, 3, ['Earthquake', 'Dig', 'Magnitude', 'Sandstorm']),
          ],
        },
      };
    },
  },

  {
    id: 'ability-contact',
    category: 'abilities',
    title: 'Contact Abilities',
    description: 'Enemy team has Static, Flame Body, and Poison Point. Player uses physical attackers. Tests PAR/BRN/PSN procs on contact, and badge updates.',
    color: 'bg-amber-700',
    tags: ['ability', 'static', 'flame-body', 'poison-point', 'lv50'],
    buildData() {
      return {
        field: { weather: null, terrain: 'normal' },
        player: {
          name: 'Player',
          team: [
            monWithMoves(50, 1, ['Tackle', 'Quick Attack', 'Double-Edge', 'Body Slam']),
            monWithMoves(50, 2, ['Scratch', 'Slash', 'Fury Swipes', 'Aerial Ace']),
            monWithMoves(50, 3, ['Headbutt', 'Iron Tail', 'Rock Slide', 'Earthquake']),
          ],
          inventory: defaultInventory(),
        },
        enemy: {
          isTrainer: true,
          name: 'Trainer',
          team: [
            monWithMoves(50, 1, ['Thunder Wave', 'Thunderbolt', 'Quick Attack', 'Protect'], Abilities.STATIC),
            monWithMoves(50, 2, ['Ember', 'Will-O-Wisp', 'Fire Spin', 'Protect'],          Abilities.FLAME_BODY),
            monWithMoves(50, 3, ['Poison Sting', 'Toxic', 'Sludge Bomb', 'Protect'],       Abilities.POISON_POINT),
          ],
        },
      };
    },
  },

  {
    id: 'ability-speed-boost',
    category: 'abilities',
    title: 'Speed Boost',
    description: 'Player lead has Speed Boost — SPE rises every turn. Enemy has Thunder Wave to try to shut it down. Observe SPE stage badge climbing each round.',
    color: 'bg-green-700',
    tags: ['ability', 'speed-boost', 'lv50'],
    buildData() {
      return {
        field: { weather: null, terrain: 'normal' },
        player: {
          name: 'Player',
          team: teamWithLead(3, 50, ['Flamethrower', 'Agility', 'Protect', 'Quick Attack'], Abilities.SPEED_BOOST),
          inventory: defaultInventory(),
        },
        enemy: {
          isTrainer: true,
          name: 'Trainer',
          team: teamWithLead(3, 50, ['Thunder Wave', 'Icy Wind', 'Psychic', 'Thunderbolt']),
        },
      };
    },
  },

  {
    id: 'ability-trace',
    category: 'abilities',
    title: 'Trace',
    description: 'Player leads with Trace — it copies the enemy\'s ability on switch-in. Pair against Intimidate, Flash Fire, or Drizzle leads to see what gets copied.',
    color: 'bg-pink-700',
    tags: ['ability', 'trace', 'lv50'],
    buildData() {
      return {
        field: { weather: null, terrain: 'normal' },
        player: {
          name: 'Player',
          team: teamWithLead(3, 50, ['Psychic', 'Ice Beam', 'Shadow Ball', 'Recover'], Abilities.TRACE),
          inventory: defaultInventory(),
        },
        enemy: {
          isTrainer: true,
          name: 'Trainer',
          team: [
            monWithMoves(50, 1, ['Earthquake', 'Crunch', 'Ice Fang', 'Roar'],           Abilities.INTIMIDATE),
            monWithMoves(50, 2, ['Flamethrower', 'Fire Blast', 'Will-O-Wisp', 'Sunny Day'], Abilities.FLASH_FIRE),
            monWithMoves(50, 3, ['Surf', 'Hydro Pump', 'Ice Beam', 'Rain Dance'],       Abilities.DRIZZLE),
          ],
        },
      };
    },
  },

  // ── Endgame ──────────────────────────────────────────────────────────────────

  {
    id: 'evo-stone',
    category: 'endgame',
    title: 'Evolution Stone',
    description: 'Player leads with an Eevee and has Fire Stone, Water Stone, and Thunder Stone in the bag. Use a stone mid-battle to evolve into Flareon, Vaporeon, or Jolteon.',
    color: 'bg-amber-600',
    tags: ['evolution', 'item', 'eevee', 'stone'],
    buildData() {
      const { allSpecies, movePool } = getDexAndMoves();
      const ivs = Object.fromEntries(STAT_KEYS.map(s => [s, 31]));
      const evs = Object.fromEntries(STAT_KEYS.map(s => [s, 0]));
      return {
        field: { weather: null, terrain: 'normal' },
        player: {
          name: 'Player',
          team: [
            {
              game: GAMES.POKEMON_FIRE_RED, pid: 1, species: 133, level: 25,
              nature: pick(NATURE_LIST), gender: GENDERS.MALE,
              ability: { name: 'none' }, ivs, evs,
              moves: [
                namedMove('Quick Attack'), namedMove('Bite'),
                namedMove('Sand Attack'),  namedMove('Growl'),
              ].filter(Boolean),
            },
            randomPokemon(allSpecies, movePool, 25, 2),
            randomPokemon(allSpecies, movePool, 25, 3),
          ],
          inventory: {
            items: [
              { item: new Items.FireStone(),    quantity: 1 },
              { item: new Items.WaterStone(),   quantity: 1 },
              { item: new Items.ThunderStone(), quantity: 1 },
              { item: new Items.Potion(),       quantity: 5 },
              { item: new Items.Revive(),       quantity: 2 },
            ],
            pokeballs: [],
            tms: [],
          },
        },
        enemy: { isTrainer: true, name: 'Trainer', team: randomTeam(3, 25) },
      };
    },
  },

  {
    id: 'everstone',
    category: 'endgame',
    title: 'Everstone',
    description: 'Two Metapod are 1 EXP below level 10 (when they evolve to Butterfree). The lead holds an Everstone — its evolution is blocked. The second evolves normally. KO any enemy to trigger both level-ups.',
    color: 'bg-stone-600',
    tags: ['evolution', 'everstone', 'held-item', 'lv9→10'],
    buildData() {
      const { allSpecies, movePool } = getDexAndMoves();
      // Metapod (nat_dex_id 11) → Butterfree (12) at level 10, Medium Fast growth.
      const table = EXPERIENCE_TABLES[GROWTH.MEDIUM_FAST];
      const exp   = table[9] - 1;
      const ivs   = Object.fromEntries(STAT_KEYS.map(s => [s, 31]));
      const evs   = Object.fromEntries(STAT_KEYS.map(s => [s, 0]));
      const makeMeta = (pid, heldItem = null) => ({
        game: GAMES.POKEMON_FIRE_RED, pid, species: 11, level: 9,
        nature: pick(NATURE_LIST), gender: GENDERS.MALE,
        ability: { name: 'none' }, ivs, evs, exp,
        moves: pickUnique(movePool, 4).map(m => ({ name: m.name, pp: { max: m.pp, current: m.pp } })),
        ...(heldItem && { heldItem }),
      });
      return {
        field: { weather: null, terrain: 'normal' },
        player: {
          name: 'Player',
          team: [
            makeMeta(1, new Items.Everstone()),
            makeMeta(2),
            randomPokemon(allSpecies, movePool, 9, 3),
          ],
          inventory: defaultInventory(),
        },
        enemy: {
          isTrainer: false,
          name: null,
          team: Array.from({ length: 3 }, (_, i) =>
            randomPokemon(allSpecies, movePool, 5, i + 1)
          ),
        },
      };
    },
  },

  {
    id: 'evolution',
    category: 'endgame',
    title: 'Evolution',
    description: 'Charmeleon is 1 EXP below level 36 (evolves into Charizard). KO an enemy to trigger the level-up and watch the full evolution sequence — stat recalculation, species swap, and HP adjustment.',
    color: 'bg-orange-700',
    tags: ['evolution', 'lv35→36', 'level-up'],
    buildData() {
      const { allSpecies, movePool } = getDexAndMoves();
      // Charmeleon (nat_dex_id 5) → Charizard (6) at level 36, Medium Slow growth.
      const table = EXPERIENCE_TABLES[GROWTH.MEDIUM_SLOW];
      const exp   = table[35] - 1;
      const ivs   = Object.fromEntries(STAT_KEYS.map(s => [s, 31]));
      const evs   = Object.fromEntries(STAT_KEYS.map(s => [s, 0]));
      return {
        field: { weather: null, terrain: 'normal' },
        player: {
          name: 'Player',
          team: [
            {
              game:    GAMES.POKEMON_FIRE_RED,
              pid:     1,
              species: 5,
              level:   35,
              nature:  pick(NATURE_LIST),
              gender:  GENDERS.MALE,
              ability: { name: 'Blaze' },
              ivs, evs, exp,
              moves: pickUnique(movePool, 4).map(m => ({ name: m.name, pp: { max: m.pp, current: m.pp } })),
            },
            randomPokemon(allSpecies, movePool, 35, 2),
            randomPokemon(allSpecies, movePool, 35, 3),
          ],
          inventory: defaultInventory(),
        },
        enemy: {
          isTrainer: false,
          name: null,
          team: Array.from({ length: 3 }, (_, i) =>
            randomPokemon(allSpecies, movePool, 5, i + 1)
          ),
        },
      };
    },
  },

  {
    id: 'level-up',
    category: 'endgame',
    title: 'Level Up',
    description: 'All three player Pokémon are set to 1 EXP below their personal level-up threshold. Defeating any enemy triggers a level-up. Tests EXP bar, level-up message, move-learning, and potential evolution prompts.',
    color: 'bg-emerald-700',
    tags: ['level-up', 'exp', 'lv9→10'],
    buildData() {
      const { allSpecies, movePool } = getDexAndMoves();
      return {
        field: { weather: null, terrain: 'normal' },
        player: {
          name: 'Player',
          team: [
            monNearLevelUp(9, 1),
            monNearLevelUp(9, 2),
            monNearLevelUp(9, 3),
          ],
          inventory: defaultInventory(),
        },
        enemy: {
          isTrainer: false,
          name: null,
          // Low-level wild mons — easy to KO, guaranteed to award EXP.
          team: Array.from({ length: 3 }, (_, i) =>
            randomPokemon(allSpecies, movePool, 5, i + 1)
          ),
        },
      };
    },
  },

  {
    id: 'learn-move',
    category: 'endgame',
    title: 'Learn Move',
    description: 'All three player Pokémon have a full 4-move set and are 1 EXP below a level where their learnset grants a new move. Defeating any enemy forces the "which move to replace?" dialog for every slot.',
    color: 'bg-teal-700',
    tags: ['level-up', 'learn-move', 'exp'],
    buildData() {
      const { allSpecies, movePool } = getDexAndMoves();
      return {
        field: { weather: null, terrain: 'normal' },
        player: {
          name: 'Player',
          team: [
            monForMoveLearn(1),
            monForMoveLearn(2),
            monForMoveLearn(3),
          ],
          inventory: defaultInventory(),
        },
        enemy: {
          isTrainer: false,
          name: null,
          team: Array.from({ length: 3 }, (_, i) =>
            randomPokemon(allSpecies, movePool, 5, i + 1)
          ),
        },
      };
    },
  },

  {
    id: 'volatile-perish-song',
    category: 'endgame',
    title: 'Perish Song',
    description: 'Both leads enter with Perish Song already counting down from 3 — they faint after 3 turns unless switched out. Player has Baton Pass to preserve the boost and escape the countdown.',
    color: 'bg-purple-900',
    tags: ['volatile', 'perish-song', 'lv50'],
    buildData() {
      return {
        field: { weather: null, terrain: 'normal' },
        player: {
          name: 'Player',
          team: [
            {
              ...monWithMoves(50, 1, ['Perish Song', 'Baton Pass', 'Calm Mind', 'Protect']),
              volatileStatus: { perishSongCount: 3 },
            },
            monWithMoves(50, 2, ['Perish Song', 'Mean Look', 'Psychic', 'Protect']),
            monWithMoves(50, 3, ['Protect', 'Baton Pass', 'Swords Dance', 'Aerial Ace']),
          ],
          inventory: defaultInventory(),
        },
        enemy: {
          isTrainer: true,
          name: 'Trainer',
          team: [
            {
              ...monWithMoves(50, 1, ['Perish Song', 'Mean Look', 'Protect', 'Toxic']),
              volatileStatus: { perishSongCount: 3 },
            },
            monWithMoves(50, 2, ['Perish Song', 'Protect', 'Earthquake', 'Ice Beam']),
            monWithMoves(50, 3, ['Protect', 'Earthquake', 'Fire Blast', 'Ice Beam']),
          ],
        },
      };
    },
  },

  {
    id: 'lv100-6v6',
    category: 'endgame',
    title: 'Lv.100 — 6v6',
    description: 'Full 6-on-6 at level 100 with random species. Max HP and damage. Tests team-wipe sequence and high-damage edge cases.',
    color: 'bg-red-900',
    tags: ['trainer', '6v6', 'random', 'lv100'],
    buildData() {
      return {
        field: { weather: null, terrain: 'normal' },
        player: {
          name: 'Player',
          team: randomTeam(6, 100),
          inventory: defaultInventory(),
        },
        enemy: { isTrainer: true, name: 'Champion', team: randomTeam(6, 100) },
      };
    },
  },

];

export default SCENARIOS;
