export default class BattleLost {
  onEnter() {
    const finish = () => {
      this.logger.addItem('You blacked out!');
      this.logger.flush(() => {
        const team = this.config.player.team.pokemon.map(p => ({
          pid: p.pid,
          currentHp: p.currentHp,
          moves: p.moves.map(m => ({ name: m.name, pp: { max: m.pp.max, current: m.pp.current } })),
        }));
        this.game.events.emit('battle-complete', { result: 'lost', team });
        this.stateMachine.setState(this.stateDef.BATTLE_IDLE);
      });
    };

    // Trainer victory taunt: if a trainer beat the player and they have a
    // `wonFightText`, slide their portrait in, show the line, slide out,
    // then fall through to the blackout sequence.
    const wonText   = this.config.enemy?.wonFightText;
    const isTrainer = this.config.enemy?.isTrainer;
    if (wonText && isTrainer && typeof this._spawnTrainerSprite === 'function') {
      this._spawnTrainerSprite(() => {
        this.logger.addItem(wonText);
        this.logger.flush(() => {
          this._dismissTrainerSprite(finish);
        });
      });
      return;
    }

    finish();
  }

}