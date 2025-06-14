import { AttackMenu, Action, ActionTypes } from '@Objects';

export default class PlayerAttack {
  onEnter() {
    let activeMon = this.config.player.team.getActivePokemon();
    
    this.AttackMenu = new AttackMenu(this, 10, 200);

    let attack = (move) => {
      this.AttackMenu.deselect();
      this.AttackMenu.clear();
      console.log('[PlayerAttack] attack selected:', move);
      this.actions.player = new Action({
        type: ActionTypes.ATTACK,
        player: this.config.player,
        target: this.config.enemy.team.getActivePokemon(),
        config: {
          move: move,
        },
      });
      this.logger.addItem([
        '[PlayerAttack]',
        this.config.player.getName(),
        'selected attack',
        '(' + move.name + ')',
      ].join(' '));
      this.stateMachine.setState(this.stateDef.ENEMY_ACTION);
    };

    let moves = activeMon.getMoves();
    this.AttackMenu.clear();
    Object.values(moves).forEach((move, idx) => {
      this.AttackMenu.addMenuItem(`${move.name} (${move.pp.current}pp / ${move.pp.max}pp)`);
      this.events.once('attackmenu-select-option-' + idx, () => attack(move));
    });

    this.AttackMenu.addMenuItem('Cancel');
    this.events.once('attackmenu-select-option-' + (moves.length), () => {
      this.AttackMenu.deselect();
      this.AttackMenu.clear();
      this.stateMachine.setState(this.stateDef.PLAYER_ACTION);
    });

    this.activateMenu(this.AttackMenu);
    this.AttackMenu.select(0);
  }

}