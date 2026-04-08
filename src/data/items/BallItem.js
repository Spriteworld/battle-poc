import BaseItem from './BaseItem.js';
import { STATUS } from '@spriteworld/pokemon-data';

/**
 * Applies the Gen 3 catch formula to determine if a wild Pokémon is caught.
 * @param {object} target - The BattlePokemon being thrown at.
 * @param {number} ballMultiplier - The ball's catch rate modifier.
 * @returns {boolean} True if all four shake checks pass.
 */
function calcCatch(target, ballMultiplier) {
  const captureRate = target.pokemon?.capture_rate ?? 45;
  const { maxHp, currentHp } = target;

  let a = Math.floor((3 * maxHp - 2 * currentHp) * captureRate * ballMultiplier / (3 * maxHp));

  const status = target.status ?? {};
  if (status[STATUS.SLEEP] > 0 || status[STATUS.FROZEN] > 0) {
    a = Math.floor(a * 2);
  } else if (
    status[STATUS.PARALYZE] > 0 ||
    status[STATUS.BURN] > 0 ||
    status[STATUS.POISON] > 0 ||
    status[STATUS.TOXIC] > 0
  ) {
    a = Math.floor(a * 1.5);
  }

  a = Math.max(1, Math.min(255, a));
  const b = Math.floor(65536 / Math.pow(255 / a, 0.1875));
  return [0, 1, 2, 3].every(() => Math.floor(Math.random() * 65536) < b);
}

/**
 * Base class for all Poké Ball items.
 * Subclasses supply name, description, multiplier, and optional guaranteed flag.
 */
export default class BallItem extends BaseItem {
  /**
   * @param {string} name - Display name of the ball.
   * @param {string} description - Item description.
   * @param {number} multiplier - Catch rate multiplier applied to the formula.
   * @param {boolean} [guaranteed=false] - If true the catch always succeeds.
   */
  constructor({ name, description, multiplier, guaranteed = false }) {
    super({
      name,
      description,
      category: 'balls',
      onUse: (target, action) => {
        if (!action.config.isWild) {
          return { success: false, message: 'You can\'t catch another trainer\'s Pokémon!' };
        }
        if (target.currentHp <= 0) {
          return { success: false, message: 'You can\'t throw a Poké Ball at a fainted Pokémon!' };
        }

        const caught = guaranteed || calcCatch(target, multiplier);
        if (caught) {
          return { caught: true, message: `${target.getName()} was caught!` };
        }
        return { caught: false, message: `${target.getName()} broke free!` };
      },
    });
  }
}
