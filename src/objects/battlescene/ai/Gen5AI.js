/**
 * Generation V AI — BW/B2W2 trainer intelligence.
 *
 * Gen 5 is widely regarded as the first generation where standard trainers
 * feel genuinely competitive.  The AI retains the Gen 4 scoring system and
 * adds smarter switching logic and better situational awareness for status
 * moves.
 *
 * A 10 % random deviation is used — trainers almost always pick the best
 * available move but very occasionally surprise the player.
 */
import { shouldSwitch } from './switchStrategy.js';

export default class Gen5AI {
  /**
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

  shouldSwitch(active, opponent, benched, generation) {
    return shouldSwitch(active, opponent, benched, generation, 0.6);
  }
}
