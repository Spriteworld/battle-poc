import { PokemonTeamMenu } from '@Objects';

export default class PlayerNewActivePokemon {
  onEnter() {
    this.logger.addItem('[PlayerNewActivePokemon] Select a Pokemon to switch to');
    // console.log(this.config.player.team.pokemon);

    this.BattleMenu.select(2);

    this.PokemonTeamMenu = new PokemonTeamMenu(this, 10, 200);

    let playerTeam = this.config.player.team;
    // console.log('[PlayerNewActivePokemon] Player team:', playerTeam);
    let alivePokemon = Object.values(playerTeam.pokemon).filter((pokemon, idx) => {
      return pokemon.isAlive()
    });

    this.PokemonTeamMenu.remap(
      alivePokemon.map(pokemon => pokemon.nameWithHP())
    );

    this.PokemonTeamMenu.select(0);
    this.activateMenu(this.PokemonTeamMenu);

    let menuAction = (pokemon) => {
      // console.log('[PlayerNewActivePokemon] PokemonTeamMenu option selected');
      // console.log('[PlayerNewActivePokemon] Selected Pokemon:', pokemon);
      this.PokemonTeamMenu.deselect();
      this.PokemonTeamMenu.clear();

      // if player selects a pokemon, switch to that pokemon
      this.config.player.team.setActivePokemon(pokemon);
      this.remapActivePokemon();

      // player action needs to be cleared
      delete this.actions.player;

      this.logger.addItem([
        '[PlayerNewActivePokemon]',
        this.config.player.getName(),
        'switched to',
        pokemon.getName()
      ].join(' '));

      // go back to BEFORE_ACTION state
      this.stateMachine.setState(this.stateDef.BEFORE_ACTION);
    };


    alivePokemon.forEach((pokemon, idx) => {
      this.events.once('pokemonteammenu-select-option-' + idx, () => menuAction(pokemon));
    });
  }
  
}