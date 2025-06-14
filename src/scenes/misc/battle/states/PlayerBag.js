import { BagMenu, PokemonTeamMenu, Action, ActionTypes } from '@Objects';

export default class PlayerBag {
  onEnter() {
    // console.log('[PlayerBag] onEnter');
    
    this.BagMenu = new BagMenu(this, 10, 200);
    this.PokemonTeamMenu = new PokemonTeamMenu(this, 10, 200);

    if (typeof this.selectedItem === 'undefined') { this.selectedItem = null; }

    let playerTeam = this.config.player.team;
    // console.log('[PlayerBag] Player team:', playerTeam);
    let alivePokemon = Object.values(playerTeam.pokemon).filter((pokemon, idx) => {
      return pokemon.isAlive()
    });

    let selectItem = (itemIndex, item) => {
      // console.log('[PlayerBag] selectItem', itemIndex, item);
      this.BagMenu.deselect();
      this.BagMenu.clear();

      this.selectedItem = itemIndex;

      this.PokemonTeamMenu.clear();
      Object.values(alivePokemon).forEach((pokemon, idx) => {
        this.PokemonTeamMenu.addMenuItem(`${pokemon.getName()} (${pokemon.currentHp}/${pokemon.maxHp})`);
        this.events.once('pokemonteammenu-select-option-' + idx, () => selectPokemon(pokemon));
      });

      // add a cancel option to pokemon team menu
      this.PokemonTeamMenu.addMenuItem('Cancel');
      this.events.once('pokemonteammenu-select-option-' + (alivePokemon.length), () => {
        this.PokemonTeamMenu.deselect();
        this.PokemonTeamMenu.clear();
        // console.log('[PlayerBag] Cancel selected');
        this.stateMachine.setState(this.stateDef.PLAYER_ACTION);
      });

      this.PokemonTeamMenu.select(0);
      this.activateMenu(this.PokemonTeamMenu);
    };

    let selectPokemon = (pokemon) => {
      // console.log('[PlayerBag] Selected Pokemon:', pokemon);
      this.BagMenu.clear();
      this.PokemonTeamMenu.deselect();
      this.PokemonTeamMenu.clear();

      this.actions.player = new Action({
        type: ActionTypes.USE_ITEM,
        player: this.config.player,
        target: pokemon,
        config: {
          item: this.data.player.inventory.items[this.selectedItem],
        },
      });

      this.stateMachine.setState(this.stateDef.ENEMY_ACTION);
    };

    // Add items to the bag menu
    let bagItems = this.data.player.inventory.items;
    this.BagMenu.clear();
    Object.values(bagItems).forEach((item, idx) => {
      this.BagMenu.addMenuItem(`${item.item.getName()} x ${item.quantity}`);
      this.events.once('bagmenu-select-option-' + idx, (idx) => selectItem(idx, item));
    });

    // add a cancel option to bag menu
    this.BagMenu.addMenuItem('Cancel');
    this.events.once('bagmenu-select-option-' + (bagItems.length), () => {
      this.BagMenu.deselect();
      this.BagMenu.clear();
      // console.log('[PlayerBag] Cancel selected');
      this.stateMachine.setState(this.stateDef.PLAYER_ACTION);
    });

    this.activateMenu(this.BagMenu);
    this.BagMenu.select(0);
  }

}