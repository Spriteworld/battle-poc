import { Menu } from '@Objects';

export default class BattleIdle {
  onEnter() {
    const menus = [
      this.BattleMenu,
      this.AttackMenu,
      this.BagMenu,
      this.PokemonTeamMenu,
      this.PokemonSwitchMenu,
    ];

    menus.forEach(menu => {
      if (menu instanceof Menu) {
        menu.deselect();
        menu.clear();
        menu.setVisible(false);
      }
    });
  }
}