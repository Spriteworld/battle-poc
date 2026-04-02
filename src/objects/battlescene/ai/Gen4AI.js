/**
 * Generation IV AI — DPPt/HGSS trainer intelligence.
 *
 * Gen 4 overhauled the AI with a score-based system: every move starts at a
 * base score of 100 and then gains or loses points from a stack of behaviour
 * flags (evaluate-attack, expert, weather-synergy, etc.).  The highest scorer
 * wins.  Standard trainers receive two or three flags; elite trainers receive
 * all of them.
 *
 * Our model captures the net improvement with a 20 % random deviation —
 * trainers are noticeably more consistent than Gen 3 counterparts while still
 * making occasional unexpected choices.
 */
export default class Gen4AI {
  /**
   * @param {object} attacker  - The active BattlePokemon using the move.
   * @param {object} target    - The opposing BattlePokemon.
   * @param {import('@spriteworld/pokemon-data').GenerationConfig} generation
   * @param {{ lightScreen: number, reflect: number }|null} fieldState
   * @param {{ type: string|null, turnsLeft: number }|null} weather
   * @return {object} Attack result info object.
   */
  selectMove(attacker, target, generation, fieldState = null, weather = null) {
    return attacker.attackWithAI(target, generation, fieldState, weather, 0.2);
  }
}
