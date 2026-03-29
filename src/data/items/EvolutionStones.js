import BaseItem from './BaseItem.js';
import { GEN_1_EVOLUTIONS, GEN_2_EVOLUTIONS, GEN_3_EVOLUTIONS, EVOLUTION_METHOD } from '@spriteworld/pokemon-data';

// Merged evolution table keyed by nat_dex_id (same merge as applyExperienceGains).
const ALL_EVOLUTIONS = {};
for (const src of [GEN_1_EVOLUTIONS, GEN_2_EVOLUTIONS, GEN_3_EVOLUTIONS]) {
  for (const [id, evos] of Object.entries(src)) {
    const key = Number(id);
    ALL_EVOLUTIONS[key] = ALL_EVOLUTIONS[key]
      ? [...ALL_EVOLUTIONS[key], ...evos]
      : [...evos];
  }
}

/** Evolution methods that are triggered by using an item. */
const ITEM_METHODS = new Set([
  EVOLUTION_METHOD.ITEM,
  EVOLUTION_METHOD.ITEM_MALE,
  EVOLUTION_METHOD.ITEM_FEMALE,
  EVOLUTION_METHOD.ITEM_DAY,
  EVOLUTION_METHOD.ITEM_NIGHT,
]);

/**
 * A held item that prevents the holder from evolving, by any means.
 * Set `pokemon.heldItem = new Everstone()` in the Pokémon config to equip it.
 */
export class Everstone extends BaseItem {
  constructor() {
    super({
      name:        'Everstone',
      description: 'A held item that prevents the holder from evolving.',
      category:    'items',
      onUse() {
        return {
          success: false,
          message: 'The Everstone is a held item — equip it to a Pokémon to prevent evolution.',
        };
      },
    });
    /** Checked by evolution logic to block level-up and stone-triggered evolutions. */
    this.preventsEvolution = true;
  }
}

/**
 * Factory that produces a stone item class for a given stone name.
 * On use, checks whether the target Pokémon has a matching item-triggered
 * evolution in the merged evolution tables.  If so, sets `readyToEvolve`
 * on the target and returns a success result; otherwise returns a
 * no-effect message without consuming the item.
 * Blocked entirely if the target holds an Everstone.
 */
function makeStone(stoneName) {
  return class extends BaseItem {
    constructor() {
      super({
        name:        stoneName,
        description: `A peculiar stone that causes certain Pokémon to evolve.`,
        category:    'items',
        onUse(target) {
          if (target.heldItem?.preventsEvolution) {
            return {
              success: false,
              message: `${target.getName()} is holding an Everstone and can't evolve!`,
            };
          }

          const dexId = target.pokemon?.nat_dex_id;
          const evos  = dexId != null ? (ALL_EVOLUTIONS[dexId] ?? []) : [];
          const evo   = evos.find(
            e => ITEM_METHODS.has(e.method) &&
                 e.value.toLowerCase() === stoneName.toLowerCase()
          );

          if (!evo) {
            return {
              success: false,
              message: `The ${stoneName} had no effect on ${target.getName()}.`,
            };
          }

          target.readyToEvolve = evo.target;
          return {
            success:       true,
            readyToEvolve: true,
            message:       `${target.getName()} reacted to the ${stoneName}!`,
          };
        },
      });
    }
  };
}

export const FireStone    = makeStone('Fire Stone');
export const WaterStone   = makeStone('Water Stone');
export const ThunderStone = makeStone('Thunder Stone');
export const LeafStone    = makeStone('Leaf Stone');
export const MoonStone    = makeStone('Moon Stone');
export const SunStone     = makeStone('Sun Stone');
