/**
 * Generation VI AI — XY/ORAS trainer intelligence.
 *
 * Gen 6 kept the same underlying score system as Gen 4/5 but introduced
 * Mega Evolution decision-making (not yet modelled here).  Type effectiveness
 * was also made visible to the player on first encounter, reflecting that
 * battles were designed with a more transparent meta in mind.
 *
 * A 5 % random deviation is used — these trainers are highly consistent and
 * almost always pick the optimal move.
 */
export default class Gen6AI {
  /**
   * @param {object} attacker  - The active BattlePokemon using the move.
   * @param {object} target    - The opposing BattlePokemon.
   * @param {import('@spriteworld/pokemon-data').GenerationConfig} generation
   * @param {{ lightScreen: number, reflect: number }|null} fieldState
   * @param {{ type: string|null, turnsLeft: number }|null} weather
   * @return {object} Attack result info object.
   */
  selectMove(attacker, target, generation, fieldState = null, weather = null) {
    return attacker.attackWithAI(target, generation, fieldState, weather, 0.05);
  }
}
