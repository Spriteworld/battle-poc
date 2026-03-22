import HyperPotion from './HyperPotion.js';
import { makeMon, makeAction } from './testHelpers.js';

describe('HyperPotion', () => {
  test('getName returns "Hyper Potion"', () => {
    expect(new HyperPotion().getName()).toBe('Hyper Potion');
  });

  test('restores up to 200 HP', () => {
    const mon = makeMon({ currentHp: 50, maxHp: 300 });
    new HyperPotion().onUse(mon, makeAction());
    expect(mon.currentHp).toBe(250);
  });

  test('caps at maxHp when deficit is less than 200', () => {
    const mon = makeMon({ currentHp: 90, maxHp: 100 });
    new HyperPotion().onUse(mon, makeAction());
    expect(mon.currentHp).toBe(100);
  });

  test('does not heal a fainted pokemon', () => {
    const mon = makeMon({ currentHp: 0, maxHp: 100 });
    new HyperPotion().onUse(mon, makeAction());
    expect(mon.currentHp).toBe(0);
  });

  test('message indicates full HP when already full', () => {
    const mon = makeMon({ currentHp: 100, maxHp: 100 });
    const result = new HyperPotion().onUse(mon, makeAction());
    expect(result.message).toContain('full');
  });
});
