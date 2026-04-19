import {
  calcLevel, GROWTH, EXPERIENCE_TABLES,
  GEN_1_EVOLUTIONS, GEN_2_EVOLUTIONS, GEN_3_EVOLUTIONS,
  EVOLUTION_METHOD,
  FRLG_LEARNSETS,
  Moves, GAMES,
  getSpeciesDisplayName,
} from '@spriteworld/pokemon-data';
import Move from '../../../objects/battlescene/Move.js';

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
    : (getSpeciesDisplayName(p.pokemon) || p.species || 'Pokémon');
}

/**
 * Returns true if the Pokémon is holding a Lucky Egg.
 * @param {object} p - BattlePokemon
 * @returns {boolean}
 */
function hasLuckyEgg(p) {
  return p.heldItem?.name?.toLowerCase() === 'lucky egg';
}

/**
 * Returns true if the Pokémon is holding an Exp. Share.
 * @param {object} p - BattlePokemon
 * @returns {boolean}
 */
function hasExpShare(p) {
  const n = p.heldItem?.name?.toLowerCase();
  return n === 'exp. share' || n === 'exp share';
}

/**
 * Awards a fixed amount of experience to one Pokémon, checks for a level-up,
 * and flags any pending level-based evolution or move learning.
 * @param {object} p       - BattlePokemon instance.
 * @param {number} expGain - Experience points to award (already multiplied by any bonus).
 * @param {object} logger  - Logger with addItem method.
 * @param {string} [gainMsg] - Override the "gained EXP" log message suffix.
 */
function awardExpToPokemon(p, expGain, logger, gainMsg) {
  const name      = monName(p);
  const prevLevel = p.level ?? 1;
  const growth    = p.pokemon?.growth ?? GROWTH.MEDIUM_FAST;
  const table     = EXPERIENCE_TABLES[growth] ?? EXPERIENCE_TABLES[GROWTH.MEDIUM_FAST];
  const levelFloor = table[prevLevel - 1] ?? 0;

  p.exp = (p.exp ?? levelFloor) + expGain;
  logger.addItem(gainMsg ?? `${name} gained ${expGain} Exp. Points!`);

  const newLevel = Math.min(100, calcLevel(growth, p.exp));

  if (newLevel > prevLevel) {
    p.level = newLevel;
    logger.addItem(`${name} grew to level ${newLevel}!`);

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
        p.readyToEvolve = evo.target;
      }
    }

    // Check for level-up moves.
    const speciesKey = (p.pokemon?.species ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const learnset   = speciesKey ? (FRLG_LEARNSETS[speciesKey] ?? []) : [];
    const movesAtLvl = learnset.filter(([lvl]) => lvl === newLevel);

    for (const [, moveName] of movesAtLvl) {
      if (p.moves.some(m => m.name === moveName)) continue;

      const moveData = getMoveByName(moveName);
      const pp       = moveData?.pp ?? 20;

      if (p.moves.length < 4) {
        // Wrap with Move so type/category/power/etc are populated — a raw
        // `{ name, pp }` would fail validation in the very next attack tick.
        p.moves.push(new Move({ name: moveName, pp: { max: pp, current: pp } }, p));
        logger.addItem(`${name} learned ${moveName}!`);
      } else {
        p.pendingMovesToLearn = p.pendingMovesToLearn ?? [];
        if (!p.pendingMovesToLearn.some(m => m.name === moveName)) {
          p.pendingMovesToLearn.push({ name: moveName, pp });
        }
      }
    }
  }
}

/**
 * Awards experience to the player's active Pokémon and any party members
 * holding an Exp. Share.  Applies the Lucky Egg ×1.5 bonus where held.
 *
 * Distribution (Gen 3 rules):
 *   - If at least one non-battling party member holds Exp. Share:
 *       • Battler receives floor(baseExp / 2)
 *       • Each Exp. Share holder receives floor(baseExp / 2)
 *   - Otherwise the battler receives the full baseExp.
 *   - Lucky Egg multiplies the recipient's final share by 1.5.
 *
 * Must be called with Scene2 as `this`.
 */
export default function applyExperienceGains() {
  const isTrainer = this.config.enemy.isTrainer;
  const enemyMon  = this.config.enemy.team.pokemon.find(p => !p.isAlive())
                 ?? this.config.enemy.team.pokemon[0];
  if (!enemyMon) return;

  const baseExp = calcExpGain(enemyMon, isTrainer);

  const battler = this.config.player.team.getActivePokemon();
  if (!battler?.isAlive()) return;

  const party = this.config.player.team.pokemon ?? [];

  // Exp Share holders: alive, not the battler.
  const expShareHolders = party.filter(
    p => p !== battler && p.isAlive?.() && hasExpShare(p)
  );
  const anyExpShare = expShareHolders.length > 0;

  // Battler share: half if Exp Share is in play, full otherwise.
  const expRate    = this.data?.expRate ?? 1;

  const battlerBase = anyExpShare ? Math.floor(baseExp / 2) : baseExp;
  const battlerGain = Math.floor(
    (hasLuckyEgg(battler) ? Math.floor(battlerBase * 1.5) : battlerBase) * expRate
  );
  awardExpToPokemon(battler, battlerGain, this.logger);

  // Exp Share holders.
  const sharedBase = Math.floor(baseExp / 2);
  for (const p of expShareHolders) {
    const gain = Math.floor(
      (hasLuckyEgg(p) ? Math.floor(sharedBase * 1.5) : sharedBase) * expRate
    );
    const name = monName(p);
    awardExpToPokemon(
      p, gain, this.logger,
      `${name} received ${gain} Exp. Points from Exp. Share!`
    );
  }
}
