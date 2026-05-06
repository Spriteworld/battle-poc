/**
 * Generation I AI — replicates the notoriously poor RBY trainer intelligence.
 *
 * Two authentic behaviours are modelled:
 *
 * 1. **Type-check bug** — The original code read the *attacker's* primary type
 *    slot when looking up type effectiveness instead of the move's own type.
 *    This means a Water-type Pokémon scores every move as if it were Water,
 *    completely ignoring Fire Blast's Fire typing, for example.
 *
 * 2. **High randomness** — A 50 % chance of ignoring the (already broken)
 *    scoring and picking any available move at random.
 *
 * Result: Gen I trainers are very erratic and often pick terrible moves.
 */
export default class Gen1AI {
  /**
   * @param {object} attacker  - The active BattlePokemon using the move.
   * @param {object} target    - The opposing BattlePokemon.
   * @param {import('@spriteworld/pokemon-data').GenerationConfig} generation
   * @param {{ lightScreen: number, reflect: number }|null} fieldState
   * @param {{ type: string|null, turnsLeft: number }|null} weather
   * @return {object} Attack result info object.
   */
  selectMove(attacker, target, generation, fieldState = null, weather = null) {
    return attacker.attackWithAI(target, generation, fieldState, weather, 0.5, { useAttackerType: true });
  }

  // Gen 1 trainers never switch mid-battle; the in-battle switch AI didn't exist yet.
  shouldSwitch() {
    return null;
  }
}
