export default class BattleWon {
  onEnter() {
    // console.log('[BattleWon] onEnter');

    // if wild pokemon
    if (!this.config.enemy.isTrainer) {
      // show victory message
      this.logger.addItem([
        '[BattleWon]',
        this.config.player.getName(),
        'defeated',
        this.config.enemy.getName(),
        'and won the battle!'
      ].join(' '));
    }

    // if trainer battle
    if (this.config.enemy.isTrainer) {
      // show victory message
      this.logger.addItem([
        '[BattleWon]',
        this.config.player.getName(),
        'defeated',
        this.config.enemy.getName(),
        'and won the battle!'
      ].join(' '));

      // give player money
      this.logger.addItem([
        '[BattleWon]',
        this.config.player.getName(),
        'received',
        200,
        'coins from',
        this.config.enemy.getName()
      ].join(' '));
    }

    // if gym battle
      // show victory message
      // give player money
      // give player badge
      // give player TM

    // go back to overworld
    const team = this.config.player.team.pokemon.map(p => ({
      pid:                 p.pid,
      currentHp:           p.currentHp,
      exp:                 p.exp ?? 0,
      level:               p.level,
      readyToEvolve:       p.readyToEvolve       ?? null,
      pendingMovesToLearn: p.pendingMovesToLearn  ?? [],
      moves:               p.moves.map(m => ({ name: m.name, pp: { max: m.pp.max, current: m.pp.current } })),
    }));
    this.game.events.emit('battle-complete', { result: 'won', team });
    this.stateMachine.setState(this.stateDef.BATTLE_IDLE);
  }

}