import { STATS, Moves } from '@spriteworld/pokemon-data';
import { ActionTypes } from '../../../../objects';

const { getActionPriority } = Moves;

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

    const ATTACK_TYPES = [ActionTypes.ATTACK, ActionTypes.NPC_ATTACK];

    // Speed order as a tiebreaker (higher speed goes first; equal speed is random).
    let playerSpeed = this.config.player.team.getActivePokemon().stats[STATS.SPEED];
    let enemySpeed  = this.config.enemy.team.getActivePokemon().stats[STATS.SPEED];
    let speedOrder;
    if (playerSpeed > enemySpeed)       { speedOrder = ['player', 'enemy']; }
    else if (playerSpeed < enemySpeed)  { speedOrder = ['enemy',  'player']; }
    else { speedOrder = Math.random() < 0.5 ? ['player', 'enemy'] : ['enemy', 'player']; }

    let actionCount = Object.keys(this.actions).length;

    if (actionCount === 0) {
      console.warn('[Before] No actions found, returning to PLAYER_ACTION state');
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
      const playerPriority = getActionPriority(this.actions.player, ATTACK_TYPES);
      const enemyPriority  = getActionPriority(this.actions.enemy,  ATTACK_TYPES);

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