export default class BattleWon {
  onEnter() {
    // console.log('[BattleWon] onEnter');

    const prizeMoney = (this.config.enemy.isTrainer
      ? (this.config.enemy.prizeMoney ?? 0)
      : 0) + (this.payDayCoins ?? 0);

    if (this.config.enemy.isTrainer) {
      this.logger.addItem([
        this.config.player.getName(),
        'defeated',
        this.config.enemy.getName(),
        'and won the battle!',
      ].join(' '));

      if (prizeMoney > 0) {
        this.logger.addItem([
          this.config.player.getName(),
          'received',
          `$${prizeMoney}`,
          'from',
          this.config.enemy.getName() + '!',
        ].join(' '));
      }
    }

    // Drain all queued messages, animate the EXP bar, then return to the overworld.
    this.logger.flush(() => {

      const continueToExp = () => {
        // Trigger the EXP bar to animate to the new value.
        this.remapActivePokemon();

        // Wait for the bar animation before emitting battle-complete.
        this.ActivePokemonMenu.waitForExpAnimation(() => {
          const team = this.config.player.team.pokemon.map(p => ({
            pid:                 p.pid,
            currentHp:           p.currentHp,
            exp:                 p.exp ?? null,
            level:               p.level,
            readyToEvolve:       p.readyToEvolve       ?? null,
            pendingMovesToLearn: p.pendingMovesToLearn  ?? [],
            moves:               p.moves.map(m => ({ name: m.name, pp: { max: m.pp.max, current: m.pp.current } })),
          }));
          this.game.events.emit('battle-complete', { result: 'won', team, prizeMoney });
          this.stateMachine.setState(this.stateDef.BATTLE_IDLE);
        });
      };

      // Show defeated trainer sprite briefly before the EXP sequence.
      if (this.config.enemy.isTrainer && this.config.enemy.trainerSpriteUrl) {
        this._spawnTrainerSprite(() => {
          this.time.delayedCall(1200, () => {
            this._dismissTrainerSprite(continueToExp);
          });
        });
      } else {
        continueToExp();
      }
    });
  }

}
