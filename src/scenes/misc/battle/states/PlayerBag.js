import { Action, ActionTypes } from '@Objects';
import { BAG_TABS } from '@Objects/menus/BagMenu.js';

export default class PlayerBag {
  onEnter() {
    // Persist the active tab across re-entries (e.g. back from PokemonTeamMenu).
    if (typeof this._bagTabIndex === 'undefined') this._bagTabIndex = 0;
    this.BagMenu.setActiveTab(this._bagTabIndex);

    const alivePokemon = Object.values(this.config.player.team.pokemon)
      .filter(p => p.isAlive());

    // ── Item selected → show pokemon chooser ─────────────────────────────────

    const selectItem = (slot) => {
      this.BagMenu.deselect();
      this.BagMenu.clear();
      this.BagMenu.setVisible(false);

      alivePokemon.forEach((pokemon, idx) => {
        this.events.once('pokemonteammenu-select-option-' + idx, () =>
          selectPokemon(pokemon, slot)
        );
      });
      this.events.once('pokemonteammenu-select-option-' + alivePokemon.length, () => {
        this.PokemonTeamMenu.deselect();
        this.PokemonTeamMenu.clear();
        this.PokemonTeamMenu.setVisible(false);
        this.stateMachine.setState(this.stateDef.PLAYER_ACTION);
      });
      this.PokemonTeamMenu.populate(alivePokemon, { actionItems: ['Use', 'Cancel'] });
      this.activateMenu(this.PokemonTeamMenu);
    };

    // ── Pokemon selected → queue action ──────────────────────────────────────

    const selectPokemon = (pokemon, slot) => {
      this.PokemonTeamMenu.deselect();
      this.PokemonTeamMenu.clear();
      this.PokemonTeamMenu.setVisible(false);

      this.actions.player = new Action({
        type:   ActionTypes.USE_ITEM,
        player: this.config.player,
        target: pokemon,
        config: { item: slot },
      });
      this.stateMachine.setState(this.stateDef.ENEMY_ACTION);
    };

    // ── Populate item list for the current tab ────────────────────────────────

    const populate = () => {
      // Clear only the per-item listeners so the tab-change listener survives.
      this.events.eventNames()
        .filter(n => n.startsWith('bagmenu-select-option-'))
        .forEach(n => this.events.off(n));

      const { category } = BAG_TABS[this._bagTabIndex];
      const filtered = this.data.player.inventory.items.filter(
        s => (s.item.getCategory?.() ?? 'other') === category && s.quantity > 0
      );

      this.BagMenu.clear();
      filtered.forEach((slot, idx) => {
        this.BagMenu.addMenuItem(`${slot.item.getName()} x${slot.quantity}`);
        this.events.once('bagmenu-select-option-' + idx, () => selectItem(slot));
      });
      this.BagMenu.addMenuItem('Cancel');
      this.events.once('bagmenu-select-option-' + filtered.length, () => {
        this.BagMenu.deselect();
        this.BagMenu.clear();
        this.BagMenu.setVisible(false);
        this.stateMachine.setState(this.stateDef.PLAYER_ACTION);
      });

      this.BagMenu.select(0);
    };

    // Listen persistently for tab changes (triggered by BagMenu left/right).
    this.events.on('bagmenu-tab-change', (idx) => {
      this._bagTabIndex = idx;
      populate();
    });

    populate();
    this.activateMenu(this.BagMenu);
  }

  onExit() {
    this.events.eventNames().forEach(name => {
      if (
        name.startsWith('bagmenu-select-option-') ||
        name.startsWith('pokemonteammenu-') ||
        name === 'bagmenu-tab-change'
      ) {
        this.events.off(name);
      }
    });
  }
}
