/**
 * Generation III AI — RSE/FRLG trainer intelligence.
 *
 * Gen 3 introduced a proper flag-based AI system.  Standard trainers carry a
 * single "basic" flag: they score moves by type effectiveness and power but
 * deviate to a random move 30 % of the time.  This class replicates that
 * base behaviour; Gym Leaders and Elite Four members used additional flags
 * (modelled by GymLeaderAI and EliteFourAI respectively).
 *
 * This is identical to TrainerAI and is provided as a named alias so code
 * can be explicit about which generation's behaviour it targets.
 */
import { shouldSwitch } from './switchStrategy.js';

export default class Gen3AI {
  /**
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

  shouldSwitch(active, opponent, benched, generation) {
    return shouldSwitch(active, opponent, benched, generation, 0.3);
  }
}
