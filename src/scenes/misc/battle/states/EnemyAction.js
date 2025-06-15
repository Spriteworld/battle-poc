import { Action, ActionTypes } from '@Objects';

export default class EnemyAction {
  onEnter() {
    let activeMon = this.config.enemy.team.getActivePokemon();
    this.logger.addItem([
      '[Enemy]',
      this.config.enemy.getName() + '\'s turn!',
      'What will ' + this.config.enemy.team.getActivePokemon().getName() +' do?' 
    ].join(' '));

    this.ActivePokemonMenu.select(1);

    // do checks to see if we have items we can use
      // if we have items
      // does it make sense to use em?

    
    // grab the moves
    let moves = activeMon.getMoves();

    // select a random move
    let moveIndex = Phaser.Math.Between(0, moves.length - 1);
    let move = moves[moveIndex];

    // for now we'll just attack
    this.actions.enemy = new Action({
      type: ActionTypes.ATTACK,
      player: this.config.enemy,
      target: this.config.player.team.getActivePokemon(),
      config: {
        move: move,
      },
    });
    this.logger.addItem([
      '[Enemy]',
      this.config.enemy.getName(),
      'selected attack',
      '('+ move.name + ')',
    ].join(' '));

    // if enemy selects attack, go to APPLY_ACTIONS state
    this.time.addEvent({ 
      delay: 1000, 
      callback: () => this.stateMachine.setState(this.stateDef.BEFORE_ACTION), 
      callbackScope: this,
    });
  }

}