export default class BattleEnd {
  onEnter() {
    // console.log('[BattleEnd] onEnter');

    const team = this.config.player.team.pokemon.map(p => ({
      pid: p.pid,
      currentHp: p.currentHp,
      moves: p.moves.map(m => ({ name: m.name, pp: { max: m.pp.max, current: m.pp.current } })),
    }));
    this.game.events.emit('battle-complete', { result: 'run', team });
    this.stateMachine.setState(this.stateDef.BATTLE_IDLE);
  }
}
  