import Move from '../../../../objects/battlescene/Move.js';

/**
 * Handles the post-level-up "do you want to learn this move?" flow.
 *
 * Works through every entry in `pokemon.pendingMovesToLearn` across the whole
 * player team.  For each pending move the player is shown the Pokémon's
 * current 4 moves plus a "Don't learn" option and picks a slot to replace.
 *
 * When all pending moves have been resolved routes to BEFORE_ACTION or BATTLE_WON.
 */
export default class LearnMove {
  onEnter() {
    // Local recursive function — avoids calling setState(LEARN_MOVE) while already
    // in LEARN_MOVE, which the state machine's same-state guard would silently drop.
    const processNext = () => {
      const p = this.config.player.team.pokemon.find(
        mon => mon.pendingMovesToLearn?.length > 0
      );

      if (!p) {
        const enemyAlive = this.config.enemy.team.pokemon.some(
          mon => mon.isAlive?.() ?? mon.currentHp > 0
        );
        this.stateMachine.setState(
          enemyAlive ? this.stateDef.BEFORE_ACTION : this.stateDef.BATTLE_WON
        );
        return;
      }

      const pending = p.pendingMovesToLearn[0];
      const monName = p.getName ? p.getName() : String(p.species);

      this.logger.addItem(`${monName} wants to learn ${pending.name}!`);
      this.logger.addItem(`But ${monName} already knows 4 moves.`);
      this.logger.addItem(`Choose a move to replace, or cancel.`);

      this.logger.flush(() => {
        const items = [
          ...p.moves.map(m => `${m.name}  (${m.pp.current}/${m.pp.max} PP)`),
          `Don't learn ${pending.name}`,
        ];
        this.AttackMenu.useListMode();
        this.AttackMenu.remap(items);
        this.activateMenu(this.AttackMenu);

        for (let i = 0; i < items.length; i++) {
          this.events.once(`attackmenu-select-option-${i}`, () => {
            // Clean up remaining listeners for this round before processing.
            for (let j = 0; j < items.length; j++) {
              this.events.off(`attackmenu-select-option-${j}`);
            }
            this.AttackMenu.setVisible(false);

            if (i < p.moves.length) {
              const forgotten = p.moves[i].name;
              // Build via `new Move(...)` so the runtime sees a fully-formed
              // Move with type/category/power/etc — without it the very next
              // `attack()` call would fail validation and print "But it failed!".
              p.moves[i] = new Move(
                { name: pending.name, pp: { max: pending.pp, current: pending.pp } },
                p,
              );
              this.logger.addItem(`${monName} forgot ${forgotten}!`);
              this.logger.addItem(`${monName} learned ${pending.name}!`);
            } else {
              this.logger.addItem(`${monName} did not learn ${pending.name}.`);
            }

            p.pendingMovesToLearn.shift();
            this.logger.flush(() => processNext());
          });
        }
      });
    };

    processNext();
  }

  onExit() {
    for (let i = 0; i < 5; i++) {
      this.events.off(`attackmenu-select-option-${i}`);
    }
    this.AttackMenu.setVisible(false);
  }
}
