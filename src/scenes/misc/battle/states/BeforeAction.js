import { STATS, STATUS } from '@spriteworld/pokemon-data';
import { ActionTypes } from '../../../../objects';
import { getAbilitySpeedModifier } from '../applyAbilityEffects.js';

const ATTACK_ACTION_TYPES = [ActionTypes.ATTACK, ActionTypes.NPC_ATTACK];
const actionPriority = action =>
  ATTACK_ACTION_TYPES.includes(action.type) ? (action.config?.move?.priority ?? 0) : Infinity;

export default class BeforeAction {
  onEnter() {
    // console.log('[Before] onEnter');
    // apply any weather 

    if (this.config.field.weather) {
      // console.log('[Before] Weather is set to', this.config.field.weather);
    }

    let check = this.checkForDeadActivePokemon();
    if (check !== null) {
      console.warn('[Before] Check for dead active pokemon returned', check);
      this.stateMachine.setState(check);
      return;
    }

    // Speed order as a tiebreaker (higher speed goes first; equal speed is random).
    // Paralysis halves effective speed for turn-order purposes (Gen 3).
    const playerActiveMon = this.config.player.team.getActivePokemon();
    const enemyActiveMon  = this.config.enemy.team.getActivePokemon();
    const paralyzed = mon => (mon.status?.[STATUS.PARALYZE] ?? 0) > 0;
    let playerSpeed = playerActiveMon.stats[STATS.SPEED] *
      (paralyzed(playerActiveMon) ? 0.5 : 1) *
      getAbilitySpeedModifier(playerActiveMon, this.weather);
    let enemySpeed  = enemyActiveMon.stats[STATS.SPEED] *
      (paralyzed(enemyActiveMon)  ? 0.5 : 1) *
      getAbilitySpeedModifier(enemyActiveMon,  this.weather);
    let speedOrder;
    if (playerSpeed > enemySpeed)       { speedOrder = ['player', 'enemy']; }
    else if (playerSpeed < enemySpeed)  { speedOrder = ['enemy',  'player']; }
    else { speedOrder = Math.random() < 0.5 ? ['player', 'enemy'] : ['enemy', 'player']; }

    let actionCount = Object.keys(this.actions).length;

    if (actionCount === 0) {
      // End of round — apply burn/poison/toxic damage then start next round.
      this.applyEndOfTurnStatus();
      let eotCheck = this.checkForDeadActivePokemon();
      if (eotCheck !== null) {
        this.stateMachine.setState(eotCheck);
        return;
      }
      this.stateMachine.setState(this.stateDef.PLAYER_ACTION);
      return;
    }

    if (actionCount === 1) {
      let keys = Object.keys(this.actions);
      this.currentAction = this.actions[keys[0]];
      delete this.actions[keys[0]];
    }

    if (actionCount > 1) {
      // Priority tier: higher number goes first; non-attack actions get Infinity.
      const playerPriority = actionPriority(this.actions.player);
      const enemyPriority  = actionPriority(this.actions.enemy);

      let first;
      if (playerPriority > enemyPriority)      { first = 'player'; }
      else if (enemyPriority > playerPriority) { first = 'enemy';  }
      else                                     { first = speedOrder[0]; }

      this.currentAction = this.actions[first];
      delete this.actions[first];
    }

    // console.log('[Before] currentAction', this.currentAction);
    this.stateMachine.setState(this.stateDef.APPLY_ACTIONS);
  }

}