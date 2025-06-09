import { PokemonTeamMenu } from '@Objects';

export default class PlayerPokemon {
  onEnter() {
    this.logger.addItem('[PlayerPokemon] Select a Pokemon to switch to');
    console.log(this.config.player.team.pokemon);

    this.battleMenu.select(2);

    this.PokemonTeamMenu = new PokemonTeamMenu(this, 10, 200);

    let playerTeam = this.config.player.team;
    console.log('[PlayerPokemon] Player team:', playerTeam);
    let alivePokemon = Object.values(playerTeam.pokemon).filter((pokemon, idx) => {
      console.log(typeof pokemon, pokemon);
      console.log(`[PlayerPokemon] Checking if ${pokemon.getName()} is alive: ${pokemon.isAlive()}; `);
      return pokemon.isAlive()
    });

    this.PokemonTeamMenu.remap(
      alivePokemon.map(pokemon => {
        return `${pokemon.getName()} (${pokemon.currentHp}/${pokemon.maxHp})`;
      }))
    ;

    this.PokemonTeamMenu.select(0);
    this.activateMenu(this.PokemonTeamMenu);

    let menuAction = (pokemon) => {
      console.log(`[PlayerPokemon] PokemonTeamMenu option selected`);
      console.log('[PlayerPokemon] Selected Pokemon:', pokemon);
      this.PokemonTeamMenu.deselect();
      this.PokemonTeamMenu.clear();

      let selectedPokemonIdx = Object.values(playerTeam.pokemon).findIndex(pkmn => pkmn.species === pokemon.species);
      console.log(`[PlayerPokemon] selectedPokemonIdx: ${selectedPokemonIdx}`);

      // if player selects a pokemon, switch to that pokemon
      this.config.player.team.setActivePokemon(selectedPokemonIdx);
      this.remapActivePokemon();
      this.logger.addItem([
        '[PlayerPokemon]',
        this.config.player.getName(),
        'switched to',
        pokemon.getName()
      ].join(' '));

      // go back to ENEMY_ACTION state
      this.stateMachine.setState(this.stateDef.ENEMY_ACTION);
    };


    alivePokemon.forEach((pokemon, idx) => {
      this.events.once('pokemonteammenu-select-option-' + idx, () => menuAction(pokemon));
    });


    // player can select a pokemon
    // if a player selects switch, go to ENEMY_ACTION state
    // this.stateMachine.setState(this.stateDef.ENEMY_ACTION);

    // if a player selects details, show pokemon details scene    
    // this.stateMachine.setState(this.stateDef.ENEMY_ACTION);

    // if a player selects cancel, go back to PLAYER_ACTION state
    // this.stateMachine.setState(this.stateDef.PLAYER_ACTION);
  }
  
  // onUpdate() {
  //   console.log('[PlayerPokemon] onUpdate');
  // }
  
  // onExit() {
  //   console.log('[PlayerPokemon] onExit');
  // }
}