import { STATS } from '@spriteworld/pokemon-data';

export default class BeforeAction {
  onEnter() {
    console.log('[BeforeAction] onEnter');
    // apply any weather 

    if (this.config.field.weather) {
      console.log('[BeforeAction] Weather is set to', this.config.field.weather);
    }

    let check = this.checkForDeadActivePokemon();
    if (check !== null) {
      console.warn('[BeforeAction] Check for dead active pokemon returned', check);
      this.stateMachine.setState(check);
      return;
    }

    let playerSpeed = this.config.player.team.getActivePokemon().stats[STATS.SPEED];
    let enemySpeed = this.config.enemy.team.getActivePokemon().stats[STATS.SPEED];

    let order = [];
    // figure out the attack order
    if (playerSpeed > enemySpeed) { order = ['player', 'enemy']; }
    if (playerSpeed < enemySpeed) { order = ['enemy', 'player']; }
    if (playerSpeed == enemySpeed) {
      order = Phaser.Math.Between(1, 2) === 1
        ? ['player', 'enemy']
        : ['enemy', 'player']
      ;
    }

    let actionCount = Object.keys(this.actions).length;

    if (actionCount === 0) {
      console.warn('[BeforeAction] No actions found, returning to PLAYER_ACTION state');
      this.stateMachine.setState(this.stateDef.PLAYER_ACTION);
      return;
    }

    // console.log('[BeforeAction] actions', this.actions, actionCount);
    // if theres only one action, use that
    if (actionCount === 1) {
      let keys = Object.keys(this.actions);
      this.currentAction = this.actions[keys[0]];
      delete this.actions[keys[0]]; 
    }

    // if there are multiple actions, grab the first one according to the order
    if (actionCount > 1) {
      this.currentAction = this.actions[order[0]];
      delete this.actions[order[0]]; 
    }

    console.log('[BeforeAction] currentAction', this.currentAction);
    this.stateMachine.setState(this.stateDef.APPLY_ACTIONS);
  }
  
  // onUpdate() {
  //   console.log('[BeforeAction] onUpdate');
  // }
  
  // onExit() {
  //   console.log('[BeforeAction] onExit');
  // }
}