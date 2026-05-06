import { STATS, STATUS } from '@spriteworld/pokemon-data';
import { ActionTypes } from '../../../../objects';
import { getAbilitySpeedModifier } from '../applyAbilityEffects.js';

const ATTACK_ACTION_TYPES = [ActionTypes.ATTACK, ActionTypes.NPC_ATTACK];
const actionPriority = (action, opponentAction = null) => {
  if (ATTACK_ACTION_TYPES.includes(action.type)) {
    // Pursuit intercepts a switching opponent: +8 (above switch priority 7).
    if (action.config?.move?.name?.toLowerCase() === 'pursuit' &&
        opponentAction?.type === ActionTypes.SWITCH_POKEMON) {
      return 8;
    }
    return action.config?.move?.priority ?? 0;
  }
  if (action.type === ActionTypes.USE_ITEM)       return 6;
  if (action.type === ActionTypes.SWITCH_POKEMON) return 7;
  return Infinity; // run
};

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
      this.logger.flush(() => { this.remapActivePokemon(); this.stateMachine.setState(check); });
      return;
    }

    // If the dead-check queued messages (enemy fainted, battle continues with next pokemon),
    // flush them and update the sprite before processing any remaining actions.
    // flush() fires immediately when the queue is empty, so this is a no-op otherwise.
    this.logger.flush(() => {
      this.remapActivePokemon();

      // Speed order as a tiebreaker (higher speed goes first; equal speed is random).
      // Paralysis halves effective speed for turn-order purposes (Gen 3).
      const playerActiveMon = this.config.player.team.getActivePokemon();
      const enemyActiveMon  = this.config.enemy.team.getActivePokemon();
      const paralyzed = mon => (mon.status?.[STATUS.PARALYZE] ?? 0) > 0;
      let playerSpeed = playerActiveMon.stats[STATS.SPEED] *
        (paralyzed(playerActiveMon) ? 0.5 : 1) *
        getAbilitySpeedModifier(playerActiveMon, this.weather, enemyActiveMon);
      let enemySpeed  = enemyActiveMon.stats[STATS.SPEED] *
        (paralyzed(enemyActiveMon)  ? 0.5 : 1) *
        getAbilitySpeedModifier(enemyActiveMon,  this.weather, playerActiveMon);
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
          this.logger.flush(() => { this.remapActivePokemon(); this.stateMachine.setState(eotCheck); });
          return;
        }
        this.logger.flush(() => {
          this.remapActivePokemon();
          this.stateMachine.setState(this.stateDef.PLAYER_ACTION);
        });
        return;
      }

      if (actionCount === 1) {
        let keys = Object.keys(this.actions);
        this.currentAction = this.actions[keys[0]];
        delete this.actions[keys[0]];
      }

      if (actionCount > 1) {
        // Priority tier: higher number goes first; non-attack actions get Infinity.
        const playerPriority = actionPriority(this.actions.player, this.actions.enemy);
        const enemyPriority  = actionPriority(this.actions.enemy,  this.actions.player);

        let first;
        if (playerPriority > enemyPriority)      { first = 'player'; }
        else if (enemyPriority > playerPriority) { first = 'enemy';  }
        else                                     { first = speedOrder[0]; }

        this.currentAction = this.actions[first];
        delete this.actions[first];
      }

      // console.log('[Before] currentAction', this.currentAction);
      this.stateMachine.setState(this.stateDef.APPLY_ACTIONS);
    });
  }

}