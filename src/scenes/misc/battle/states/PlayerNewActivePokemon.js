export default class PlayerNewActivePokemon {
  onEnter() {
    this.logger.addItem('Choose a Pokémon.');
    this.BattleMenu.select(2);

    const playerTeam = this.config.player.team;
    const alivePokemon = Object.values(playerTeam.pokemon).filter(pokemon => pokemon.isAlive());

    this.PokemonTeamMenu.clear();
    alivePokemon.forEach((pokemon, idx) => {
      this.PokemonTeamMenu.addMenuItem(pokemon.nameWithHP());
      this.events.once('pokemonteammenu-select-option-' + idx, () => {
        this.PokemonTeamMenu.deselect();
        this.PokemonTeamMenu.clear();
        this.PokemonTeamMenu.setVisible(false);

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
