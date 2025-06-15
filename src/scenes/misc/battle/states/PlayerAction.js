import { BattleMenu, ActionTypes, Action } from '@Objects';

export default class PlayerAction {
  onEnter() {
    // console.log('[Player] onEnter');
    this.logger.addItem([
      '[Player]',
      this.config.player.getName() + '\'s turn!',
      'What will ' + this.config.player.team.getActivePokemon().getName() +' do?' 
    ].join(' '));
    
    // show player action menu
    this.BattleMenu = new BattleMenu(this, 10, 100);
    this.BattleMenu.clear();
    this.BattleMenu
      .addMenuItem('Attack')
      .addMenuItem('Bag')
      .addMenuItem('Pokemon')
      .addMenuItem('Run')
    ;

    this.activateMenu(this.BattleMenu);
    this.ActivePokemonMenu.select(0);

    this.events.once('battlemenu-select-option-0', () => {
      // if player selects attack, go to PLAYER_ATTACK state
      this.stateMachine.setState(this.stateDef.PLAYER_ATTACK);
    });
      
    this.events.once('battlemenu-select-option-1', () => {
      // if player selects bag, go to PLAYER_BAG state
      this.stateMachine.setState(this.stateDef.PLAYER_BAG);
    });
      
    this.events.once('battlemenu-select-option-2', () => {
      // if player selects Pokémon, go to PLAYER_POKEMON state
      this.stateMachine.setState(this.stateDef.PLAYER_POKEMON);
    });
      
    this.events.once('battlemenu-select-option-3', () => {
      if (!this.config.enemy.isWild) {
        this.logger.addItem('[Player] You can\'t run from a trainer battle!');
        this.stateMachine.setState(this.stateDef.PLAYER_ACTION);
        return;
      }
      this.logger.addItem('[Player] You chose to run away!');

      // if player selects run, go to BATTLE_END state
      this.actions.player = new Action({
        type: ActionTypes.RUN,
        player: this.config.player,
        target: this.config.enemy,
      });
      
      this.stateMachine.setState(this.stateDef.ENEMY_ACTION);
    });
  }

}