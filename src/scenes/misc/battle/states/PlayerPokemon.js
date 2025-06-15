import { PokemonTeamMenu, PokemonSwitchMenu, ActionTypes, Action } from '@Objects';

export default class PlayerPokemon {
  onEnter() {
    this.logger.addItem('[PlayerPokemon] Select a Pokemon to switch to');
    // console.log(this.config.player.team.pokemon);

    // select pokemon option in battle menu
    this.BattleMenu.select(2);

    // set new menus up
    this.PokemonTeamMenu = new PokemonTeamMenu(this, 10, 200);
    this.PokemonSwitchMenu = new PokemonSwitchMenu(this, 100, 100);

    // map current players team into the PokemonTeamMenu
    let playerTeam = this.config.player.team;
    Object.values(playerTeam.pokemon).forEach((pokemon, idx) => {
      this.PokemonTeamMenu.addMenuItem(pokemon.nameWithHP());
      this.events.once('pokemonteammenu-select-option-' + idx, () => {
        this.selectedPokemon = pokemon;

        this.PokemonSwitchMenu.clear();
        this.PokemonSwitchMenu.addMenuItem('Switch to ' + pokemon.getName());
        this.PokemonSwitchMenu.addMenuItem('Details');
        this.PokemonSwitchMenu.addMenuItem('Cancel');
        this.PokemonSwitchMenu.select(0);
        this.activateMenu(this.PokemonSwitchMenu);

        this.events.once('pokemonswitchmenu-select-option-0', () => {
          this.actions.player = new Action({
            type: ActionTypes.SWITCH_POKEMON,
            player: this.config.player,
            target: this.config.enemy.team.getActivePokemon(),
            config: {
              pokemon: pokemon,
            },
          });

          // if player selects switch, go to ENEMY_ACTION state
          this.stateMachine.setState(this.stateDef.ENEMY_ACTION);
        });

        this.events.once('pokemonswitchmenu-select-option-1', () => {
          // if player selects details, show pokemon details scene
          this.logger.addItem('[PlayerPokemon] Pokemon details not implemented yet');
          // this.stateMachine.setState(this.stateDef.POKEMON_DETAILS);
        });

        this.events.once('pokemonswitchmenu-select-option-2', () => {
          // if player selects cancel, go back to PLAYER_ACTION state
          this.stateMachine.setState(this.stateDef.PLAYER_ACTION);
        });
      });
    });

    this.PokemonTeamMenu.addMenuItem('Cancel');
    this.events.once('pokemonteammenu-select-option-' + (Object.keys(playerTeam.pokemon).length), () => {
      this.activateMenu(this.PokemonTeamMenu);
      this.stateMachine.setState(this.stateDef.PLAYER_ACTION);
    });

    this.PokemonTeamMenu.select(0);
    this.activateMenu(this.PokemonTeamMenu);
  }
  
  onExit() {
    // console.log('[PlayerPokemon] onExit');
    this.PokemonTeamMenu.clear();
    this.PokemonSwitchMenu.clear();
    this.PokemonTeamMenu.deselect();
    this.PokemonSwitchMenu.deselect();

    this.events.eventNames().forEach(eventName => {
      if (eventName.startsWith('pokemonteammenu-') 
        || eventName.startsWith('pokemonswitchmenu-')) {
        this.events.off(eventName);
      }
    });
  }
}