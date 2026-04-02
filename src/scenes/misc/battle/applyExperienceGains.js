import {
  calcLevel, GROWTH, EXPERIENCE_TABLES,
  GEN_1_EVOLUTIONS, GEN_2_EVOLUTIONS, GEN_3_EVOLUTIONS,
  EVOLUTION_METHOD,
  FRLG_LEARNSETS,
  Moves, GAMES,
} from '@spriteworld/pokemon-data';

// Cache the FRLG move pool for PP lookups (keyed by name)
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

// Merge evolution arrays across all three gens, concatenating per key so that
// Pokémon with cross-gen additions (e.g. Slowpoke: level→Slowbro in Gen 1 +
// trade→Slowking in Gen 2) keep all their evolution options.
const ALL_EVOLUTIONS = {};
for (const src of [GEN_1_EVOLUTIONS, GEN_2_EVOLUTIONS, GEN_3_EVOLUTIONS]) {
  for (const [id, evos] of Object.entries(src)) {
    const key = Number(id);
    ALL_EVOLUTIONS[key] = ALL_EVOLUTIONS[key] ? [...ALL_EVOLUTIONS[key], ...evos] : [...evos];
  }
}

/**
 * Gen 3 base EXP formula.
 *   Wild:    floor(base_exp_yield × level / 7)
 *   Trainer: floor(base_exp_yield × level / 7 × 1.5)
 */
function calcExpGain(enemyMon, isTrainer) {
  const base  = enemyMon.pokemon?.base_exp_yield ?? 64;
  const level = enemyMon.level ?? 5;
  const raw   = Math.floor(base * level / 7);
  return isTrainer ? Math.floor(raw * 1.5) : raw;
}

function monName(p) {
  return p.nickname
    ? p.nickname
    : (p.species ?? 'Pokémon').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Awards experience to the player's active Pokémon, checks for a level-up,
 * and flags any pending level-based evolution.
 *
 * Must be called with Scene2 as `this`.
 */
export default function applyExperienceGains() {
  const isTrainer = this.config.enemy.isTrainer;
  // getActivePokemon() returns undefined after switchToNextLivingPokemon sets active=-1.
  // Find the defeated pokemon directly from the team array instead.
  const enemyMon  = this.config.enemy.team.pokemon.find(p => !p.isAlive())
                 ?? this.config.enemy.team.pokemon[0];
  if (!enemyMon) return;
  const expGain   = calcExpGain(enemyMon, isTrainer);

  // Gen 3 (no EXP Share): only the active frontline Pokémon gains EXP.
  const p = this.config.player.team.getActivePokemon();
  if (!p?.isAlive()) return;

  const name      = monName(p);
  const prevLevel = p.level ?? 1;

  // Default to the exp threshold for the current level so the EXP bar
  // shows progress within the level rather than starting from 0 total.
  const growth   = p.pokemon?.growth ?? GROWTH.MEDIUM_FAST;
  const table    = EXPERIENCE_TABLES[growth] ?? EXPERIENCE_TABLES[GROWTH.MEDIUM_FAST];
  const levelFloor = table[prevLevel - 1] ?? 0;
  p.exp = (p.exp ?? levelFloor) + expGain;
  this.logger.addItem(`${name} gained ${expGain} Exp. Points!`);

  const newLevel = Math.min(100, calcLevel(growth, p.exp));

  if (newLevel > prevLevel) {
    p.level = newLevel;
    this.logger.addItem(`${name} grew to level ${newLevel}!`);

    // Check for a level-based evolution.
    const dexId = p.pokemon?.nat_dex_id;
    const evos  = dexId != null ? (ALL_EVOLUTIONS[dexId] ?? []) : [];
    const evo   = evos.find(e =>
      (e.method === EVOLUTION_METHOD.LEVEL ||
       e.method === EVOLUTION_METHOD.LEVEL_MALE ||
       e.method === EVOLUTION_METHOD.LEVEL_FEMALE) &&
      e.value <= newLevel
    );
    if (evo) {
      if (!p.heldItem?.preventsEvolution) {
        p.readyToEvolve = evo.target; // nat_dex_id of the evolved form — handled by the EVOLVE state
      }
    }

    // Check for level-up moves.
    const speciesKey = (p.pokemon?.species ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const learnset   = speciesKey ? (FRLG_LEARNSETS[speciesKey] ?? []) : [];
    const movesAtLvl = learnset.filter(([lvl]) => lvl === newLevel);

    for (const [, moveName] of movesAtLvl) {
      if (p.moves.some(m => m.name === moveName)) continue; // already known

      const moveData = getMoveByName(moveName);
      const pp       = moveData?.pp ?? 20;

      if (p.moves.length < 4) {
        p.moves.push({ name: moveName, pp: { max: pp, current: pp } });
        this.logger.addItem(`${name} learned ${moveName}!`);
      } else {
        // Mark for post-battle move selection (store name + pp so the UI doesn't need another DB lookup)
        p.pendingMovesToLearn = p.pendingMovesToLearn ?? [];
        if (!p.pendingMovesToLearn.some(m => m.name === moveName)) {
          p.pendingMovesToLearn.push({ name: moveName, pp });
        }
      }
    }
  }
}
