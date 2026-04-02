/**
 * Gym Leader AI — type-effective move scoring with only a 10 % random
 * deviation.
 *
 * Gym Leaders are seasoned trainers with a speciality type.  They make
 * near-optimal decisions most of the time but still have a small chance
 * of an unexpected choice, preventing completely predictable play.
 */
export default class GymLeaderAI {
  /**
   * Select and execute a move for the Gym Leader's Pokémon.
   *
   * @param {object} attacker  - The active BattlePokemon using the move.
   * @param {object} target    - The opposing BattlePokemon.
   * @param {import('@spriteworld/pokemon-data').GenerationConfig} generation
   * @param {{ lightScreen: number, reflect: number }|null} fieldState
   * @param {{ type: string|null, turnsLeft: number }|null} weather
   * @return {object} Attack result info object.
   */
  selectMove(attacker, target, generation, fieldState = null, weather = null) {
    return attacker.attackWithAI(target, generation, fieldState, weather, 0.1);
  }
}
