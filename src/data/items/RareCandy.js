import BaseItem from './BaseItem.js';
import {
  GEN_1_EVOLUTIONS, GEN_2_EVOLUTIONS, GEN_3_EVOLUTIONS,
  EVOLUTION_METHOD, EXPERIENCE_TABLES, GROWTH,
  FRLG_LEARNSETS, Moves, GAMES,
} from '@spriteworld/pokemon-data';
import Move from '../../objects/battlescene/Move.js';

// Merged evolution table keyed by nat_dex_id.
const ALL_EVOLUTIONS = {};
for (const src of [GEN_1_EVOLUTIONS, GEN_2_EVOLUTIONS, GEN_3_EVOLUTIONS]) {
  for (const [id, evos] of Object.entries(src)) {
    const key = Number(id);
    ALL_EVOLUTIONS[key] = ALL_EVOLUTIONS[key] ? [...ALL_EVOLUTIONS[key], ...evos] : [...evos];
  }
}

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

export default class RareCandy extends BaseItem {
  constructor() {
    super({
      name:        'Rare Candy',
      description: 'A candy packed with energy. It raises the level of a single Pokémon by one.',
      category:    'items',
      onUse(target) {
        const currentLevel = target.level ?? 1;
        const targetName   = target.getName?.() ?? 'Pokémon';

        if (currentLevel >= 100) {
          return { success: false, message: `${targetName} is already at level 100!` };
        }

        const newLevel = currentLevel + 1;
        target.level   = newLevel;

        // Set exp to the floor for the new level so the exp bar is correct.
        const growth = target.pokemon?.growth ?? GROWTH.MEDIUM_FAST;
        const table  = EXPERIENCE_TABLES[growth] ?? EXPERIENCE_TABLES[GROWTH.MEDIUM_FAST];
        target.exp   = table[newLevel - 1] ?? 0;

        // Check for a level-based evolution.
        // Support both BattlePokemon (nat_dex_id via .pokemon) and plain party objects (.species).
        const dexId = target.pokemon?.nat_dex_id ?? target.species;
        const evos  = dexId != null ? (ALL_EVOLUTIONS[dexId] ?? []) : [];
        const evo   = evos.find(e =>
          (e.method === EVOLUTION_METHOD.LEVEL ||
           e.method === EVOLUTION_METHOD.LEVEL_MALE ||
           e.method === EVOLUTION_METHOD.LEVEL_FEMALE) &&
          e.value <= newLevel
        );
        if (evo && !target.heldItem?.preventsEvolution) {
          target.readyToEvolve = evo.target;
        }

        // Check for level-up moves.
        const speciesStr = target.pokemon?.species ?? '';
        const speciesKey = speciesStr.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        const learnset   = speciesKey ? (FRLG_LEARNSETS[speciesKey] ?? []) : [];
        const movesAtLvl = learnset.filter(([lvl]) => lvl === newLevel);
        for (const [, moveName] of movesAtLvl) {
          if (target.moves?.some(m => m.name === moveName)) continue;
          const moveData = getMoveByName(moveName);
          const pp       = moveData?.pp ?? 20;
          if ((target.moves?.length ?? 0) < 4) {
            if (!target.moves) target.moves = [];
            // Wrap with Move so type/category/power/etc are populated — a raw
            // `{ name, pp }` would fail validation in the very next attack tick.
            target.moves.push(new Move({ name: moveName, pp: { max: pp, current: pp } }, target));
          } else {
            target.pendingMovesToLearn = target.pendingMovesToLearn ?? [];
            if (!target.pendingMovesToLearn.some(m => m.name === moveName)) {
              target.pendingMovesToLearn.push({ name: moveName, pp });
            }
          }
        }

        return {
          success:       true,
          readyToEvolve: !!target.readyToEvolve,
          message:       `${targetName} grew to level ${newLevel}!`,
        };
      },
    });

    /** Rare Candy cannot be used during battle. */
    this.canUseInBattle = false;
  }
}
