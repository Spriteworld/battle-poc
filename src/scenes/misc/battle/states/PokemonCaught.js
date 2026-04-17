export default class PokemonCaught {
  onEnter() {
    const caught = this.caughtPokemon;

    if (!caught) {
      console.error('[PokemonCaught] No caught Pokémon set on scene');
      this.stateMachine.setState(this.stateDef.BATTLE_IDLE);
      return;
    }

    this.logger.flush(() => {
      const caughtData = {
        pid:                caught.pid,
        species:            caught.species,
        level:              caught.level,
        nature:             caught.nature,
        gender:             caught.gender,
        ability:            caught.ability,
        ivs:                caught.ivs,
        evs:                caught.evs,
        moves:              caught.moves.map(m => ({ name: m.name, pp: { max: m.pp.max, current: m.pp.current } })),
        currentHp:          caught.currentHp,
        exp:                caught.exp ?? 0,
        status:             caught.status,
        pokerus:            caught.pokerus ?? 0,
        isShiny:            caught.isShiny ?? false,
      };

      const team = this.config.player.team.pokemon.map(p => ({
        pid:                p.pid,
        currentHp:          p.currentHp,
        exp:                p.exp ?? 0,
        level:              p.level,
        readyToEvolve:      p.readyToEvolve      ?? null,
        pendingMovesToLearn: p.pendingMovesToLearn ?? [],
        moves:              p.moves.map(m => ({ name: m.name, pp: { max: m.pp.max, current: m.pp.current } })),
      }));

      this.game.events.emit('battle-complete', {
        result: 'caught',
        caughtPokemon: caughtData,
        team,
        tutorial: this.tutorial === true,
      });
      this.stateMachine.setState(this.stateDef.BATTLE_IDLE);
    });
  }

  onExit() {
    this.caughtPokemon = null;
  }
}
