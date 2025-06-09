export default class BattleEnd {
  onEnter() {
    console.log('[BattleEnd] onEnter');
    // check if battle is over
    // do we have living pokemon on the players team?
    // do we have living pokemon on the enemies team?

    // if battle is over
      // if player won, show victory scene
      // this.stateMachine.setState(this.stateDef.BATTLE_WON);
      // if player lost, show defeat scene
      // this.stateMachine.setState(this.stateDef.BATTLE_LOST);

    // if battle is not over, go back to BEFORE_ACTION state
    // this.stateMachine.setState(this.stateDef.BEFORE_ACTION);
  }
  
  // onUpdate() {
  //   console.log('[BattleEnd] onUpdate');
  // }
  
  // onExit() {
  //   console.log('[BattleEnd] onExit');
  // }
}