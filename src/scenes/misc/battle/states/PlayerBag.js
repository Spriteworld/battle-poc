export default class PlayerBag {
  onEnter() {
    console.log('[PlayerBag] onEnter');

    // open the bag scene
    // items that can have a useful effect in battle must be selected
    // pokeballs can only be used on wild pokemon
    // if player selects an item, go to PLAYER_ACTION state
    // this.stateMachine.setState(this.stateDef.PLAYER_ACTION);
  }
  
  // onUpdate() {
  //   console.log('[PlayerBag] onUpdate');
  // }
  
  // onExit() {
  //   console.log('[PlayerBag] onExit');
  // }
}