import { AttackMenu } from '@Objects';

export default class PlayerAttack {
  onEnter() {
    let activeMon = this.config.player.team.getActivePokemon();
    
    // player selects an attack
    this.AttackMenu = new AttackMenu(this, 10, 200);
    this.AttackMenu.deselect();

    let moves = activeMon.getMoves();
    this.AttackMenu.remap(moves.map(move => {
      return `${move.name} (${move.pp.current}pp / ${move.pp.max}pp)`;
    }));

    this.activateMenu(this.AttackMenu);

    let attack = (move) => {
      this.AttackMenu.deselect();
      this.AttackMenu.clear();

      this.actions.player = {
        type: 'attack',
        player: this.config.player,
        target: this.config.enemy.team.getActivePokemon(),
        move: move
      };
      this.logger.addItem([
        '[PlayerAttack]',
        this.config.player.getName(),
        'selected attack',
        '(' + move.name + ')',
      ].join(' '));
      this.stateMachine.setState(this.stateDef.ENEMY_ACTION);
    };

    this.events.once('attackmenu-select-option-0', (idx) => attack(moves[idx]));
    this.events.once('attackmenu-select-option-1', (idx) => attack(moves[idx]));
    this.events.once('attackmenu-select-option-2', (idx) => attack(moves[idx]));
    this.events.once('attackmenu-select-option-3', (idx) => attack(moves[idx]));
  }
  
  // onUpdate() {
  //   console.log('[PlayerAttack] onUpdate');
  // }
  
  // onExit() {
  //   console.log('[PlayerAttack] onExit');
  // }
}