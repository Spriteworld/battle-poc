export default class PlayerNewActivePokemon {
  onEnter() {
    this.logger.addItem('Choose a Pokémon.');
    this.BattleMenu.select(2);

    const playerTeam = this.config.player.team;
    const batonPasser = this.batonPassData?.outgoing ?? null;
    const alivePokemon = Object.values(playerTeam.pokemon).filter(
      pokemon => pokemon.isAlive() && pokemon !== batonPasser
    );

    this.PokemonTeamMenu.clear();
    alivePokemon.forEach((pokemon, idx) => {
      this.PokemonTeamMenu.addMenuItem(pokemon.nameWithHP());
      this.events.once('pokemonteammenu-select-option-' + idx, () => {
        this.PokemonTeamMenu.deselect();
        this.PokemonTeamMenu.clear();
        this.PokemonTeamMenu.setVisible(false);

        // Baton Pass: transfer stat stages and leech seed to the incoming Pokémon.
        if (this.batonPassData) {
          const outgoing = this.batonPassData.outgoing;
          for (const [stat, stage] of Object.entries(outgoing.stages ?? {})) {
            if (stage !== 0 && typeof pokemon.applyStageChange === 'function') {
              pokemon.applyStageChange(stat, stage);
            }
          }
          if (outgoing.volatileStatus?.leechSeed) {
            if (pokemon.volatileStatus) pokemon.volatileStatus.leechSeed = true;
            outgoing.volatileStatus.leechSeed = false;
          }
          // Clear outgoing volatile statuses that don't pass.
          if (outgoing.volatileStatus) {
            outgoing.volatileStatus.infatuated      = false;
            outgoing.volatileStatus.encored         = null;
            outgoing.volatileStatus.furyCutterCount = 0;
          }
          this.batonPassData = null;
        }

        this.config.player.team.setActivePokemon(pokemon);
        this.remapActivePokemon();
        delete this.actions.player;

        this.logger.addItem(
          this.config.player.getName() + ' sent out ' + pokemon.getName() + '!'
        );

        this.stateMachine.setState(this.stateDef.BEFORE_ACTION);
      });
    });

    this.activateMenu(this.PokemonTeamMenu);
  }

  onExit() {
    this.PokemonTeamMenu.deselect();
    this.PokemonTeamMenu.clear();
    this.PokemonTeamMenu.setVisible(false);

    this.events.eventNames().forEach(name => {
      if (name.startsWith('pokemonteammenu-')) {
        this.events.off(name);
      }
    });
  }
}
