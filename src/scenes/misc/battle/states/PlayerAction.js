import { Action, ActionTypes } from '@Objects';

/** Visible-beat timings for tutorial autopilot (ms). */
const AUTOPILOT_PRE_SELECT_MS = 500;
const AUTOPILOT_HOLD_MS       = 250;

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

    this.logger.showText(`What will ${activeMon.getName()} do?`);

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
        this.logger.addItem('You can\'t run from a trainer battle!');
        this.logger.flush(() => this.stateMachine.setState(this.stateDef.PLAYER_ACTION));
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

    // ── Tutorial autopilot ──────────────────────────────────────────────────
    // When a scripted action is queued on the scene, visibly drive the menu
    // cursor to the matching option and auto-confirm. The player sees the
    // same menu flow they'd see playing normally, just hands-off.
    const scripted = this.scriptedActions?.[0];
    console.log('[PlayerAction] scriptedActions=', this.scriptedActions, '→ scripted=', scripted);
    if (scripted) {
      const targetIdx = scripted.type === 'use_item' ? 1 : 0; // attack → 0, use_item → 1
      this.autopilotLocked = true;
      this.time.delayedCall(AUTOPILOT_PRE_SELECT_MS, () => {
        this.BattleMenu.select(targetIdx);
        this.time.delayedCall(AUTOPILOT_HOLD_MS, () => {
          this.BattleMenu.confirm();
        });
      });
    }
  }

  onExit() {
    for (let i = 0; i < 4; i++) {
      this.events.off('battlemenu-select-option-' + i);
    }
  }
}
