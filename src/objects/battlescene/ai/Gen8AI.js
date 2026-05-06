/**
 * Generation VIII AI — SwSh/BDSP trainer intelligence.
 *
 * Gen 8 represents the fully-optimised end of the score-based system.
 * Trainers always select the highest-scoring move with zero random deviation;
 * the only remaining non-determinism is random tie-breaking when two moves
 * share the top score.
 *
 * Note: the mainline SwSh campaign AI is actually considered relatively easy
 * compared to earlier generations despite this theoretically perfect scoring —
 * this mostly reflects team-building and level curve rather than in-battle
 * decision-making.
 */
import { shouldSwitch } from './switchStrategy.js';

export default class Gen8AI {
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
    return shouldSwitch(active, opponent, benched, generation, 0.85);
  }
}
