import { Action, ActionTypes } from '@Objects';

export default class PlayerAttack {
  onEnter() {
    const activeMon = this.config.player.team.getActivePokemon();

    const attack = (move) => {
      this.AttackMenu.deselect();
      this.AttackMenu.clear();
      this.AttackMenu.setVisible(false);

      this.actions.player = new Action({
        type: ActionTypes.ATTACK,
        player: this.config.player,
        target: this.config.enemy.team.getActivePokemon(),
        config: { move },
      });

      if (!move) {
        this.logger.addItem(
          `${this.config.player.getName()} has no moves left! It must use Struggle!`
        );
      }

      this.stateMachine.setState(this.stateDef.ENEMY_ACTION);
    };

    // When all PP is depleted, skip the menu and queue Struggle immediately.
    if (activeMon.mustStruggle()) {
      attack(null);
      return;
    }

    // Populate the pre-created AttackMenu and show it
    const moves = activeMon.getMoves();
    this.AttackMenu.clear();

    Object.values(moves).forEach((move, idx) => {
      const prefix = move.implemented === false ? '[N] ' : move.implemented === 'partial' ? '[P] ' : '';

      this.AttackMenu.addMenuItem(
        `${prefix}${move.name} (${move.pp.current}/${move.pp.max}pp)`
      );
      this.events.once('attackmenu-select-option-' + idx, () => {
        this._lastMoveIndex = idx;
        this._lastMovePokemon = activeMon.id;
        attack(move);
      });
    });

    this.AttackMenu.addMenuItem('Cancel');
    this.events.once('attackmenu-select-option-' + moves.length, () => {
      this.AttackMenu.deselect();
      this.AttackMenu.clear();
      this.AttackMenu.setVisible(false);
      this.stateMachine.setState(this.stateDef.PLAYER_ACTION);
    });

    this.activateMenu(this.AttackMenu);
    // Re-select the last used move, but reset to 0 if the active Pokémon changed.
    const sameMon = this._lastMovePokemon === activeMon.id;
    const lastIdx = sameMon ? Math.min(this._lastMoveIndex ?? 0, moves.length - 1) : 0;
    this.AttackMenu.select(lastIdx);
  }

  onExit() {
    this.events.eventNames().forEach(name => {
      if (name.startsWith('attackmenu-')) this.events.off(name);
    });
  }
}
