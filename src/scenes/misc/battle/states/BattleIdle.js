import { Menu } from '@Objects';

export default class BattleIdle {
  onEnter() {
    // if (this.ActivePokemonMenu instanceof Menu) {
    //   this.ActivePokemonMenu.deselect();
    //   this.ActivePokemonMenu.clear();
    // }

    if (this.BattleMenu instanceof Menu) {
      this.BattleMenu.deselect();
      this.BattleMenu.clear();
    }

    if (this.AttackMenu instanceof Menu) {
      this.AttackMenu.deselect();
      this.AttackMenu.clear();
    }

    if (this.BagMenu instanceof Menu) {
      this.BagMenu.deselect();
      this.BagMenu.clear();
    }

    if (this.PokemonTeamMenu instanceof Menu) {
      this.PokemonTeamMenu.deselect();
      this.PokemonTeamMenu.clear();
    }

    if (this.PokemonSwitchMenu instanceof Menu) {
      this.PokemonSwitchMenu.deselect();
      this.PokemonSwitchMenu.clear();
    }

  }
}