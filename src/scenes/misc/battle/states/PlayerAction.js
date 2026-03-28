import { Action, ActionTypes } from '@Objects';

export default class PlayerAction {
  onEnter() {
    const activeMon = this.config.player.team.getActivePokemon();

    // Locked into a charge move — skip the menu and auto-continue.
    if (activeMon.lockedMove) {
      this.actions.player = new Action({
        type: ActionTypes.ATTACK,
        player: this.config.player,
        target: this.config.enemy.team.getActivePokemon(),
        config: { move: activeMon.lockedMove.move },
      });
      this.stateMachine.setState(this.stateDef.ENEMY_ACTION);
      return;
    }

    this.logger.addItem(`What will ${activeMon.getName()} do?`);

    // Populate the pre-created BattleMenu and show it
    this.BattleMenu.remap(['Attack', 'Items', 'Pokemon', 'Run']);
    this.activateMenu(this.BattleMenu);
    this.ActivePokemonMenu.select(0);

    this.events.once('battlemenu-select-option-0', () => {
      this.stateMachine.setState(this.stateDef.PLAYER_ATTACK);
    });

    this.events.once('battlemenu-select-option-1', () => {
      this.stateMachine.setState(this.stateDef.PLAYER_BAG);
    });

    this.events.once('battlemenu-select-option-2', () => {
      this.stateMachine.setState(this.stateDef.PLAYER_POKEMON);
    });

    this.events.once('battlemenu-select-option-3', () => {
      if (!this.config.enemy.isWild) {
        this.logger.addItem("You can't run from a trainer battle!");
        this.stateMachine.setState(this.stateDef.PLAYER_ACTION);
        return;
      }
      this.logger.addItem('You chose to run away!');
      this.actions.player = new Action({
        type: ActionTypes.RUN,
        player: this.config.player,
        target: this.config.enemy,
      });
      this.stateMachine.setState(this.stateDef.ENEMY_ACTION);
    });
  }

  onExit() {
    for (let i = 0; i < 4; i++) {
      this.events.off('battlemenu-select-option-' + i);
    }
  }
}
