/**
 * Wild Pokémon AI — picks a completely random available move.
 *
 * Wild Pokémon have no tactical awareness; they simply thrash about.
 * This mirrors Gen 3 behaviour where wild encounters use pure-random
 * move selection.
 */
export default class WildAI {
  /**
   * Select and execute a move for the wild Pokémon.
   *
   * @param {object} attacker  - The active BattlePokemon using the move.
   * @param {object} target    - The opposing BattlePokemon.
   * @param {import('@spriteworld/pokemon-data').GenerationConfig} generation
   * @param {{ lightScreen: number, reflect: number }|null} fieldState
   * @param {{ type: string|null, turnsLeft: number }|null} weather
   * @return {object} Attack result info object.
   */
  selectMove(attacker, target, generation, fieldState = null, weather = null) {
    return attacker.attackRandomMove(target, generation, fieldState, weather);
  }
}
