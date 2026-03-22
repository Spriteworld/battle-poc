import { Action, ActionTypes } from '@Objects';

export default class PlayerBag {
  onEnter() {
    if (typeof this.selectedItem === 'undefined') { this.selectedItem = null; }

    const playerTeam = this.config.player.team;
    const alivePokemon = Object.values(playerTeam.pokemon).filter(p => p.isAlive());

    const selectItem = (itemIndex, item) => {
      this.BagMenu.deselect();
      this.BagMenu.clear();
      this.BagMenu.setVisible(false);
      this.selectedItem = itemIndex;

      this.PokemonTeamMenu.clear();
      Object.values(alivePokemon).forEach((pokemon, idx) => {
        this.PokemonTeamMenu.addMenuItem(
          `${pokemon.getName()} (${pokemon.currentHp}/${pokemon.maxHp})`
        );
        this.events.once('pokemonteammenu-select-option-' + idx, () =>
          selectPokemon(pokemon)
        );
      });
      this.PokemonTeamMenu.addMenuItem('Cancel');
      this.events.once(
        'pokemonteammenu-select-option-' + alivePokemon.length,
        () => {
          this.PokemonTeamMenu.deselect();
          this.PokemonTeamMenu.clear();
          this.PokemonTeamMenu.setVisible(false);
          this.stateMachine.setState(this.stateDef.PLAYER_ACTION);
        }
      );
      this.activateMenu(this.PokemonTeamMenu);
    };

    const selectPokemon = (pokemon) => {
      this.PokemonTeamMenu.deselect();
      this.PokemonTeamMenu.clear();
      this.PokemonTeamMenu.setVisible(false);

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

    const bagItems = this.data.player.inventory.items;
    this.BagMenu.clear();
    Object.values(bagItems).forEach((item, idx) => {
      this.BagMenu.addMenuItem(`${item.item.getName()} x${item.quantity}`);
      this.events.once('bagmenu-select-option-' + idx, () =>
        selectItem(idx, item)
      );
    });
    this.BagMenu.addMenuItem('Cancel');
    this.events.once('bagmenu-select-option-' + bagItems.length, () => {
      this.BagMenu.deselect();
      this.BagMenu.clear();
      this.BagMenu.setVisible(false);
      this.stateMachine.setState(this.stateDef.PLAYER_ACTION);
    });

    this.activateMenu(this.BagMenu);
  }

  onExit() {
    this.events.eventNames().forEach(name => {
      if (name.startsWith('bagmenu-') || name.startsWith('pokemonteammenu-')) {
        this.events.off(name);
      }
    });
  }
}
