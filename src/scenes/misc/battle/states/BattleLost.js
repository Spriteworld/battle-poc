export default class BattleLost {
  onEnter() {
    // console.log('[BattleLost] onEnter');
    
    // show defeat message
    // reset player to last pokemon center
    // take players money
    this.logger.addItem('You blacked out!');

    // go back to overworld
    const team = this.config.player.team.pokemon.map(p => ({
      pid: p.pid,
      currentHp: p.currentHp,
      moves: p.moves.map(m => ({ name: m.name, pp: { max: m.pp.max, current: m.pp.current } })),
    }));
    this.game.events.emit('battle-complete', { result: 'lost', team });
    this.stateMachine.setState(this.stateDef.BATTLE_IDLE);
  }

}