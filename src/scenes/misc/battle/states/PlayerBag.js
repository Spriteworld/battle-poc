import { Action, ActionTypes } from '@Objects';
import { BAG_TABS } from '@Objects/menus/BagMenu.js';

/** Visible-beat timings for tutorial autopilot (ms). */
const AUTOPILOT_PRE_SELECT_MS = 500;
const AUTOPILOT_TAB_HOLD_MS   = 350;
const AUTOPILOT_HOLD_MS       = 400;

export default class PlayerBag {
  onEnter() {
    // Persist the active tab across re-entries (e.g. back from PokemonTeamMenu).
    if (typeof this._bagTabIndex === 'undefined') this._bagTabIndex = 0;
    this.BagMenu.setActiveTab(this._bagTabIndex);

    const alivePokemon = Object.values(this.config.player.team.pokemon)
      .filter(p => p.isAlive());

    // ── Item selected → show pokemon chooser (or target enemy for balls) ──────

    const selectItem = (slot) => {
      this.BagMenu.deselect();
      this.BagMenu.clear();
      this.BagMenu.setVisible(false);

      if (slot.item.getCategory?.() === 'balls') {
        selectBall(slot);
        return;
      }

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

    // ── Ball selected → target enemy active Pokémon directly ─────────────────

    const selectBall = (slot) => {
      this.actions.player = new Action({
        type:   ActionTypes.USE_ITEM,
        player: this.config.player,
        target: this.config.enemy.team.getActivePokemon(),
        config: { item: slot, isWild: this.config.enemy.isWild },
      });
      this.stateMachine.setState(this.stateDef.ENEMY_ACTION);
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
        s => (s.item.getCategory?.() ?? 'other') === category &&
             s.quantity > 0 &&
             s.item.canUseInBattle !== false
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

    // ── Tutorial autopilot ──────────────────────────────────────────────────
    // If a scripted use_item entry is queued, switch to the matching tab,
    // move the cursor to the slot whose item name matches, and auto-confirm.
    const scripted = this.scriptedActions?.[0];
    if (scripted?.type === 'use_item') {
      const wantedName = (scripted.itemName ?? '').toLowerCase();
      const targetSlot = this.data.player.inventory.items.find(
        s => s.item.getName?.()?.toLowerCase() === wantedName && s.quantity > 0
      );
      if (!targetSlot) {
        console.warn(`[PlayerBag] scripted item "${scripted.itemName}" not in tutor inventory — autopilot aborting`);
      } else {
        const category = targetSlot.item.getCategory?.() ?? 'other';
        const tabIdx = BAG_TABS.findIndex(t => t.category === category);
        this.autopilotLocked = true;

        const selectAndConfirmItem = () => {
          const { category: cat } = BAG_TABS[this._bagTabIndex];
          const filtered = this.data.player.inventory.items.filter(
            s => (s.item.getCategory?.() ?? 'other') === cat &&
                 s.quantity > 0 &&
                 s.item.canUseInBattle !== false
          );
          const itemIdx = filtered.findIndex(s => s === targetSlot);
          if (itemIdx < 0) {
            console.warn('[PlayerBag] autopilot: item vanished after tab switch');
            this.autopilotLocked = false;
            return;
          }
          this.time.delayedCall(AUTOPILOT_PRE_SELECT_MS, () => {
            this.BagMenu.select(itemIdx);
            this.time.delayedCall(AUTOPILOT_HOLD_MS, () => {
              // Scripted action consumed; confirm emits bagmenu-select-option-N
              // which routes through selectBall() → ENEMY_ACTION.
              this.scriptedActions.shift();
              this.autopilotLocked = false;
              this.BagMenu.confirm();
            });
          });
        };

        if (tabIdx >= 0 && tabIdx !== this._bagTabIndex) {
          // Switch tab visibly, then after a short hold, locate and confirm.
          this.time.delayedCall(AUTOPILOT_PRE_SELECT_MS, () => {
            this.BagMenu.setActiveTab(tabIdx);
            this.events.emit('bagmenu-tab-change', tabIdx);
            this.time.delayedCall(AUTOPILOT_TAB_HOLD_MS, selectAndConfirmItem);
          });
        } else {
          selectAndConfirmItem();
        }
      }
    }
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
