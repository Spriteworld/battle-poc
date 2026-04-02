/**
 * Generation VII AI — SM/USUM trainer intelligence.
 *
 * Gen 7 tightened the AI further and fixed edge-cases in the Mega Evolution
 * turn-order logic introduced in Gen 6.  Z-Move decisions (not modelled here)
 * also added a new dimension to the scoring system.
 *
 * A 2 % random deviation is used — these trainers are near-perfect and will
 * almost always find the best move.
 */
export default class Gen7AI {
  /**
   * @param {object} attacker  - The active BattlePokemon using the move.
   * @param {object} target    - The opposing BattlePokemon.
   * @param {import('@spriteworld/pokemon-data').GenerationConfig} generation
   * @param {{ lightScreen: number, reflect: number }|null} fieldState
   * @param {{ type: string|null, turnsLeft: number }|null} weather
   * @return {object} Attack result info object.
   */
  selectMove(attacker, target, generation, fieldState = null, weather = null) {
    return attacker.attackWithAI(target, generation, fieldState, weather, 0.02);
  }
}
