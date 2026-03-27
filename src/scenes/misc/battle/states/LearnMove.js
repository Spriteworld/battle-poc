/**
 * Handles the post-level-up "do you want to learn this move?" flow.
 *
 * Works through every entry in `pokemon.pendingMovesToLearn` across the whole
 * player team.  For each pending move the player is shown the Pokémon's
 * current 4 moves plus a "Don't learn" option and picks a slot to replace.
 *
 * When all pending moves have been resolved the state emits `battle-complete`
 * and transitions to BATTLE_IDLE, exactly as BattleWon would have done.
 */
export default class LearnMove {
  onEnter() {
    // Find the first pokemon that still has moves queued up
    const p = this.config.player.team.pokemon.find(
      mon => mon.pendingMovesToLearn?.length > 0
    );

    if (!p) {
      this._finish();
      return;
    }

    const pending  = p.pendingMovesToLearn[0];
    const monName  = p.getName ? p.getName() : String(p.species);

    this.logger.addItem(`${monName} wants to learn ${pending.name}!`);
    this.logger.addItem(`But ${monName} already knows 4 moves.`);
    this.logger.addItem(`Choose a move to replace, or cancel.`);

    // Build the 5-item list: current 4 moves + cancel
    const items = [
      ...p.moves.map(m => `${m.name}  (${m.pp.current}/${m.pp.max} PP)`),
      `Don't learn ${pending.name}`,
    ];
    this.AttackMenu.remap(items);
    this.activateMenu(this.AttackMenu);

    const n = items.length; // 5
    for (let i = 0; i < n; i++) {
      this.events.once(`attackmenu-select-option-${i}`, () => {
        this._handleChoice(p, pending, i);
      });
    }
  }

  _handleChoice(p, pending, slotIndex) {
    const monName = p.getName ? p.getName() : String(p.species);

    if (slotIndex < p.moves.length) {
      const forgotten = p.moves[slotIndex].name;
      p.moves[slotIndex] = { name: pending.name, pp: { max: pending.pp, current: pending.pp } };
      this.logger.addItem(`${monName} forgot ${forgotten}!`);
      this.logger.addItem(`${monName} learned ${pending.name}!`);
    } else {
      this.logger.addItem(`${monName} did not learn ${pending.name}.`);
    }

    p.pendingMovesToLearn.shift();
    // Re-enter to process the next pending move (or finish)
    this.stateMachine.setState(this.stateDef.LEARN_MOVE);
  }

  _finish() {
    const enemyAlive = this.config.enemy.team.pokemon.some(p => p.isAlive?.() ?? p.currentHp > 0);
    if (enemyAlive) {
      this.stateMachine.setState(this.stateDef.BEFORE_ACTION);
    } else {
      this.stateMachine.setState(this.stateDef.BATTLE_WON);
    }
  }

  onExit() {
    // Remove any unresolved listeners from this round
    for (let i = 0; i < 5; i++) {
      this.events.off(`attackmenu-select-option-${i}`);
    }
    this.AttackMenu.setVisible(false);
  }
}
