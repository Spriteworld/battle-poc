/**
 * Elite Four AI — always selects the highest-scoring move with zero random
 * deviation.
 *
 * Elite Four members are the most skilled trainers in the game.  They
 * play optimally every turn: always choosing the move that deals the most
 * effective damage or applies the most useful status condition.  When
 * multiple moves share the top score one is chosen at random among them —
 * that is the only remaining non-determinism.
 */
export default class EliteFourAI {
  /**
   * Select and execute a move for the Elite Four member's Pokémon.
   *
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
}
