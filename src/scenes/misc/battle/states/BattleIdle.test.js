jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

import { makeContext } from './stateTestHelpers.js';
import BattleIdle from './BattleIdle.js';

describe('BattleIdle', () => {
  test('clears, deselects, and hides every known menu', () => {
    const Menu = require('@Objects/menus/Menu.js').default;
    const scene = { add: { existing: jest.fn() } };
    const makeRealMenu = () => {
      const m = new Menu(scene, 0, 0);
      jest.spyOn(m, 'clear');
      jest.spyOn(m, 'deselect');
      jest.spyOn(m, 'setVisible');
      return m;
    };

    const ctx = makeContext({
      BattleMenu:        makeRealMenu(),
      AttackMenu:        makeRealMenu(),
      BagMenu:           makeRealMenu(),
      PokemonTeamMenu:   makeRealMenu(),
      PokemonSwitchMenu: makeRealMenu(),
    });

    new BattleIdle().onEnter.call(ctx);

    [ctx.BattleMenu, ctx.AttackMenu, ctx.BagMenu, ctx.PokemonTeamMenu, ctx.PokemonSwitchMenu]
      .forEach(menu => {
        expect(menu.clear).toHaveBeenCalled();
        expect(menu.deselect).toHaveBeenCalled();
        expect(menu.setVisible).toHaveBeenCalledWith(false);
      });
  });
});
