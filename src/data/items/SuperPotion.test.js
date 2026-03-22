import SuperPotion from './SuperPotion.js';
import { makeMon, makeAction } from './testHelpers.js';

describe('SuperPotion', () => {
  test('getName returns "Super Potion"', () => {
    expect(new SuperPotion().getName()).toBe('Super Potion');
  });

  test('restores up to 50 HP', () => {
    const mon = makeMon({ currentHp: 10, maxHp: 100 });
    new SuperPotion().onUse(mon, makeAction());
    expect(mon.currentHp).toBe(60);
  });

  test('does not exceed maxHp', () => {
    const mon = makeMon({ currentHp: 80, maxHp: 100 });
    new SuperPotion().onUse(mon, makeAction());
    expect(mon.currentHp).toBe(100);
  });

  test('does not heal a fainted pokemon', () => {
    const mon = makeMon({ currentHp: 0, maxHp: 100 });
    new SuperPotion().onUse(mon, makeAction());
    expect(mon.currentHp).toBe(0);
  });

  test('message indicates full HP when already full', () => {
    const mon = makeMon({ currentHp: 100, maxHp: 100 });
    const result = new SuperPotion().onUse(mon, makeAction());
    expect(result.message).toContain('full');
  });
});
