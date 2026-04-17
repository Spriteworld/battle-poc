import { Action, ActionTypes } from '@Objects';

/** Visible-beat timings for tutorial autopilot (ms). */
const AUTOPILOT_PRE_SELECT_MS = 500;
const AUTOPILOT_HOLD_MS       = 300;

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
      const hpType = move.name?.toLowerCase() === 'hidden power' && activeMon.hiddenPowerType
        ? activeMon.hiddenPowerType[0] + activeMon.hiddenPowerType.slice(1).toLowerCase()
        : null;
      const moveName = hpType ? `Hidden Power [${hpType}]` : move.name;

      this.AttackMenu.addMenuItem(
        `${prefix}${moveName} (${move.pp.current}/${move.pp.max}pp)`
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

    // ── Tutorial autopilot ──────────────────────────────────────────────────
    // If a scripted attack entry is queued, find the matching move slot and
    // auto-drive the AttackMenu cursor to it before confirming. Fall back to
    // slot 0 with a console warning if the named move isn't in this lead's
    // moveset, so a mistyped script doesn't silently hang.
    const scripted = this.scriptedActions?.[0];
    if (scripted?.type === 'attack') {
      const moveList = Object.values(moves);
      const wanted = (scripted.move ?? '').toLowerCase();
      let targetIdx = moveList.findIndex(m => m.name?.toLowerCase() === wanted);
      if (targetIdx < 0) {
        if (wanted) {
          console.warn(`[PlayerAttack] scripted move "${scripted.move}" not found on ${activeMon.getName()} — falling back to slot 0`);
        }
        targetIdx = 0;
      }
      this.autopilotLocked = true;
      this.time.delayedCall(AUTOPILOT_PRE_SELECT_MS, () => {
        this.AttackMenu.select(targetIdx);
        this.time.delayedCall(AUTOPILOT_HOLD_MS, () => {
          // Scripted action consumed; confirm emits attackmenu-select-option-N
          // which triggers the attack() handler and transitions to ENEMY_ACTION.
          this.scriptedActions.shift();
          this.autopilotLocked = false;
          this.AttackMenu.confirm();
        });
      });
    }
  }

  onExit() {
    this.events.eventNames().forEach(name => {
      if (name.startsWith('attackmenu-')) this.events.off(name);
    });
  }
}
