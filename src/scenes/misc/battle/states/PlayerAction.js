import { BattleMenu } from '@Objects';

export default class PlayerAction {
  onEnter() {
    // console.log('[PlayerAction] onEnter');
    this.logger.addItem('[PlayerAction] ' + this.data.player.name + '\'s turn!');
    
    // show player action menu
    this.battleMenu = new BattleMenu(this, 10, 100);
    this.battleMenu
      .addMenuItem('Attack')
      .addMenuItem('Bag')
      .addMenuItem('Pokemon')
      .addMenuItem('Run')
    ;

    this.activateMenu(this.battleMenu);
    this.activePokemonMenu.select(0);

    this.events.once('battlemenu-select-option-0', () => {
      // console.log('[PlayerAction] battlemenu option selected');
      // if player selects attack, go to PLAYER_ATTACK state
      this.stateMachine.setState(this.stateDef.PLAYER_ATTACK);
    });
      
    this.events.once('battlemenu-select-option-1', () => {
      // if player selects bag, go to PLAYER_BAG state
      // this.logger.addItem('[PlayerAction] Bag selected...but not implemented yet!');
      this.stateMachine.setState(this.stateDef.PLAYER_BAG);
    });
      
    this.events.once('battlemenu-select-option-2', () => {
      // if player selects Pokémon, go to PLAYER_POKEMON state
      this.logger.addItem('[PlayerAction] Pokemon Bag selected...but not implemented yet!');
      // this.stateMachine.setState(this.stateDef.PLAYER_POKEMON);
    });
      
    this.events.once('battlemenu-select-option-3', () => {
      // if player selects run, go to BATTLE_END state
      this.stateMachine.setState(this.stateDef.BATTLE_END);
    });
  }

}