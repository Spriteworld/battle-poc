/**
 * Champions AI — cross-generational elite trainer intelligence.
 *
 * Champions draw from the full national dex and every available move,
 * and play with perfect optimisation: always choosing the highest-scoring
 * move with zero random deviation.  Only ties introduce non-determinism.
 */
import { shouldSwitch } from './switchStrategy.js';

export default class ChampionsAI {
  /**
   * @param {object} attacker  - The active BattlePokemon using the move.
   * @param {object} target    - The opposing BattlePokemon.
   * @param {import('@spriteworld/pokemon-data').GenerationConfig} generation
   * @param {{ lightScreen: number, reflect: number }|null} fieldState
   * @param {{ type: string|null, turnsLeft: number }|null} weather
   * @return {object} Attack result info object.
   */
  selectMove(attacker, target, generation, fieldState = null, weather = null) {
    return attacker.attackWithAI(target, generation, fieldState, weather, 0);
  }

  shouldSwitch(active, opponent, benched, generation) {
    return shouldSwitch(active, opponent, benched, generation, 1.0);
  }
}
