export default class BattleEnd {
  onEnter() {
    // console.log('[BattleEnd] onEnter');

    // if battle is not over, go back to BATTLE_IDLE state
    this.stateMachine.setState(this.stateDef.BATTLE_IDLE);
  }
}
  