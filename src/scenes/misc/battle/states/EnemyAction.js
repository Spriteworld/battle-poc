import { Action, ActionTypes } from '@Objects';

export default class EnemyAction {
  onEnter() {
    const activeMon = this.config.enemy.team.getActivePokemon();

    this.ActivePokemonMenu.select(1);

    // Locked into a charge move — skip AI selection and auto-continue.
    if (activeMon.lockedMove) {
      this.actions.enemy = new Action({
        type: ActionTypes.ATTACK,
        player: this.config.enemy,
        target: this.config.player.team.getActivePokemon(),
        config: { move: activeMon.lockedMove.move },
      });
      this.logger.flush(() => this.stateMachine.setState(this.stateDef.BEFORE_ACTION));
      return;
    }

    this.logger.addItem([
      '[Enemy]',
      this.config.enemy.getName() + '\'s turn!',
      'What will ' + activeMon.getName() + ' do?',
    ].join(' '));

    this.actions.enemy = new Action({
      type: ActionTypes.NPC_ATTACK,
      player: this.config.enemy,
      target: this.config.player.team.getActivePokemon(),
    });
    this.logger.addItem([
      '[Enemy]',
      this.config.enemy.getName(),
      'is preparing to attack!',
    ].join(' '));

    this.logger.flush(() => this.stateMachine.setState(this.stateDef.BEFORE_ACTION));
  }

}