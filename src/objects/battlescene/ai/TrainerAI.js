/**
 * Standard trainer AI — uses type-effective move scoring with a 30 % random
 * deviation, matching the Gen 3 base trainer behaviour.
 *
 * The random deviation means trainers occasionally make suboptimal choices,
 * keeping battles from feeling deterministic.
 */
export default class TrainerAI {
  /**
   * Select and execute a move for the trainer's Pokémon.
   *
   * @param {object} attacker  - The active BattlePokemon using the move.
   * @param {object} target    - The opposing BattlePokemon.
   * @param {import('@spriteworld/pokemon-data').GenerationConfig} generation
   * @param {{ lightScreen: number, reflect: number }|null} fieldState
   * @param {{ type: string|null, turnsLeft: number }|null} weather
   * @return {object} Attack result info object.
   */
  selectMove(attacker, target, generation, fieldState = null, weather = null) {
    return attacker.attackWithAI(target, generation, fieldState, weather, 0.3);
  }
}
