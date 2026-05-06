import { Action, ActionTypes } from '@Objects';

export default class EnemyAction {
  onEnter() {
    const activeMon   = this.config.enemy.team.getActivePokemon();
    const playerMon   = this.config.player.team.getActivePokemon();

    this.ActivePokemonMenu.select(1);

    // Locked into a charge move — skip AI selection and auto-continue.
    if (activeMon.lockedMove) {
      this.actions.enemy = new Action({
        type: ActionTypes.ATTACK,
        player: this.config.enemy,
        target: playerMon,
        config: { move: activeMon.lockedMove.move },
      });
      this.logger.flush(() => this.stateMachine.setState(this.stateDef.BEFORE_ACTION));
      return;
    }

    const ai         = this.config.enemy.ai;
    const benched    = this.config.enemy.team.pokemon ?? [];
    const switchTo   = ai?.shouldSwitch?.(activeMon, playerMon, benched, this.generation);

    if (switchTo) {
      this.actions.enemy = new Action({
        type:   ActionTypes.SWITCH_POKEMON,
        player: this.config.enemy,
        target: playerMon,
        config: { pokemon: switchTo },
      });
      this.logger.flush(() => this.stateMachine.setState(this.stateDef.BEFORE_ACTION));
      return;
    }

    this.actions.enemy = new Action({
      type: ActionTypes.NPC_ATTACK,
      player: this.config.enemy,
      target: playerMon,
    });

    this.logger.flush(() => this.stateMachine.setState(this.stateDef.BEFORE_ACTION));
  }

}