/**
 * Generation II AI — GSC trainer intelligence.
 *
 * Gen 2 corrects the Gen 1 type-check bug: the AI now scores moves using
 * the actual move type rather than the attacker's primary type.  It also
 * gains access to held-item usage (not modelled here — item decisions are
 * handled elsewhere in the battle system).
 *
 * Random deviation is 40 %, still quite unpredictable but noticeably smarter
 * than Gen 1 on average.
 */
export default class Gen2AI {
  /**
   * @param {object} attacker  - The active BattlePokemon using the move.
   * @param {object} target    - The opposing BattlePokemon.
   * @param {import('@spriteworld/pokemon-data').GenerationConfig} generation
   * @param {{ lightScreen: number, reflect: number }|null} fieldState
   * @param {{ type: string|null, turnsLeft: number }|null} weather
   * @return {object} Attack result info object.
   */
  selectMove(attacker, target, generation, fieldState = null, weather = null) {
    return attacker.attackWithAI(target, generation, fieldState, weather, 0.4);
  }
}
