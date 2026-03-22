import { ActionTypes, Action } from '@Objects';

export default class PlayerPokemon {
  onEnter() {
    this.logger.addItem('Choose a Pokémon.');
    this.BattleMenu.select(2);

    const playerTeam = this.config.player.team;
    this.PokemonTeamMenu.clear();

    Object.values(playerTeam.pokemon).forEach((pokemon, idx) => {
      this.PokemonTeamMenu.addMenuItem(pokemon.nameWithHP());
      this.events.once('pokemonteammenu-select-option-' + idx, () => {
        this.selectedPokemon = pokemon;

        this.PokemonSwitchMenu.clear();
        this.PokemonSwitchMenu.addMenuItem('Switch to ' + pokemon.getName());
        this.PokemonSwitchMenu.addMenuItem('Details');
        this.PokemonSwitchMenu.addMenuItem('Cancel');
        this.activateMenu(this.PokemonSwitchMenu);

        this.events.once('pokemonswitchmenu-select-option-0', () => {
          this.actions.player = new Action({
            type: ActionTypes.SWITCH_POKEMON,
            player: this.config.player,
            target: this.config.enemy.team.getActivePokemon(),
            config: { pokemon },
          });
          this.stateMachine.setState(this.stateDef.ENEMY_ACTION);
        });

        this.events.once('pokemonswitchmenu-select-option-1', () => {
          this.logger.addItem('Pokémon details not implemented yet.');
        });

        this.events.once('pokemonswitchmenu-select-option-2', () => {
          this.stateMachine.setState(this.stateDef.PLAYER_ACTION);
        });
      });
    });

    this.PokemonTeamMenu.addMenuItem('Cancel');
    this.events.once(
      'pokemonteammenu-select-option-' + Object.keys(playerTeam.pokemon).length,
      () => {
        this.stateMachine.setState(this.stateDef.PLAYER_ACTION);
      }
    );

    this.activateMenu(this.PokemonTeamMenu);
  }

  onExit() {
    this.PokemonTeamMenu.clear();
    this.PokemonSwitchMenu.clear();
    this.PokemonTeamMenu.deselect();
    this.PokemonSwitchMenu.deselect();
    this.PokemonTeamMenu.setVisible(false);
    this.PokemonSwitchMenu.setVisible(false);

    this.events.eventNames().forEach(name => {
      if (
        name.startsWith('pokemonteammenu-') ||
        name.startsWith('pokemonswitchmenu-')
      ) {
        this.events.off(name);
      }
    });
  }
}
