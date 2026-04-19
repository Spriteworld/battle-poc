import {
  calcLevel, GROWTH, EXPERIENCE_TABLES,
  GEN_1_EVOLUTIONS, GEN_2_EVOLUTIONS, GEN_3_EVOLUTIONS,
  EVOLUTION_METHOD,
  FRLG_LEARNSETS,
  Moves, GAMES,
  Pokedex,
  getSpeciesDisplayName,
} from '@spriteworld/pokemon-data';

let _movePpCache = null;
function getMoveByName(name) {
  if (!_movePpCache) {
    _movePpCache = {};
    for (const m of Moves.getMovesByGameId(GAMES.POKEMON_FIRE_RED)) {
      _movePpCache[m.name] = m;
    }
  }
  return _movePpCache[name];
}

const ALL_EVOLUTIONS = {};
for (const src of [GEN_1_EVOLUTIONS, GEN_2_EVOLUTIONS, GEN_3_EVOLUTIONS]) {
  for (const [id, evos] of Object.entries(src)) {
    const key = Number(id);
    ALL_EVOLUTIONS[key] = ALL_EVOLUTIONS[key] ? [...ALL_EVOLUTIONS[key], ...evos] : [...evos];
  }
}

/**
 * Awards experience to the enemy's active Pokémon when the player's active
 * Pokémon faints, using the Gen 3 trainer-battle formula (×1.5 bonus).
 * No log messages are added — EXP gain is completely silent.
 *
 * On a level-up:
 *   - Applies any learnset move learned at the new level.  When the move
 *     list is full (4 moves) the new move overwrites slot 0 (the oldest).
 *   - Checks for a level-based evolution and, if triggered, returns an object
 *     describing the evolution so the caller can show a message and apply it.
 *
 * Only runs for trainer battles; wild Pokémon never gain experience.
 *
 * Must be called with Scene2 as `this`.
 *
 * @returns {{ targetId: number, fromName: string, toName: string }|null}
 *   Evolution info, or null if no evolution was triggered.
 */
export default function applyEnemyExperienceGains() {
  if (!this.config.enemy.isTrainer) return null;

  const playerMon = this.config.player.team.getActivePokemon();
  if (!playerMon || playerMon.isAlive?.()) return null;

  const enemyMon = this.config.enemy.team.getActivePokemon();
  if (!enemyMon || !enemyMon.isAlive?.()) return null;

  // Gen 3 trainer formula applied from the enemy's perspective.
  const base    = playerMon.pokemon?.base_exp_yield ?? 64;
  const level   = playerMon.level ?? 5;
  const expRate = this.data?.expRate ?? 1;
  const expGain = Math.floor(Math.floor(Math.floor(base * level / 7) * 1.5) * expRate);

  const growth     = enemyMon.pokemon?.growth ?? GROWTH.MEDIUM_FAST;
  const table      = EXPERIENCE_TABLES[growth] ?? EXPERIENCE_TABLES[GROWTH.MEDIUM_FAST];
  const prevLevel  = enemyMon.level ?? 1;
  const levelFloor = table[prevLevel - 1] ?? 0;

  enemyMon.exp = (enemyMon.exp ?? levelFloor) + expGain;

  const newLevel = Math.min(100, calcLevel(growth, enemyMon.exp));
  if (newLevel <= prevLevel) return null;

  enemyMon.level = newLevel;

  // Apply learnset moves learned at the new level.
  // When at capacity, the new move overwrites slot 0.
  const speciesKey = (enemyMon.pokemon?.species ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const learnset   = speciesKey ? (FRLG_LEARNSETS[speciesKey] ?? []) : [];
  const movesAtLvl = learnset.filter(([lvl]) => lvl === newLevel);

  for (const [, moveName] of movesAtLvl) {
    if (enemyMon.moves.some(m => m.name === moveName)) continue;
    const moveData = getMoveByName(moveName);
    const pp       = moveData?.pp ?? 20;
    const newMove  = { name: moveName, pp: { max: pp, current: pp } };
    if (enemyMon.moves.length < 4) {
      enemyMon.moves.push(newMove);
    } else {
      enemyMon.moves[0] = newMove;
    }
  }

  // Check for a level-based evolution.
  const dexId = enemyMon.pokemon?.nat_dex_id;
  const evos  = dexId != null ? (ALL_EVOLUTIONS[dexId] ?? []) : [];
  const evo   = evos.find(e =>
    (e.method === EVOLUTION_METHOD.LEVEL ||
     e.method === EVOLUTION_METHOD.LEVEL_MALE ||
     e.method === EVOLUTION_METHOD.LEVEL_FEMALE) &&
    e.value <= newLevel
  );

  if (!evo || enemyMon.heldItem?.preventsEvolution) return null;

  const fromName = enemyMon.getName?.() ?? String(enemyMon.species);
  let toName;
  try {
    const entry = new Pokedex(enemyMon.game ?? GAMES.POKEMON_FIRE_RED).getPokemonById(evo.target);
    toName = getSpeciesDisplayName(entry) || `#${evo.target}`;
  } catch {
    toName = `#${evo.target}`;
  }

  return { targetId: evo.target, fromName, toName };
}
