import MaxPotion from './MaxPotion.js';
import { makeMon, makeAction } from './testHelpers.js';

describe('MaxPotion', () => {
  test('getName returns "Max Potion"', () => {
    expect(new MaxPotion().getName()).toBe('Max Potion');
  });

  test('fully restores HP', () => {
    const mon = makeMon({ currentHp: 1, maxHp: 100 });
    new MaxPotion().onUse(mon, makeAction());
    expect(mon.currentHp).toBe(100);
  });

  test('does not heal a fainted pokemon', () => {
    const mon = makeMon({ currentHp: 0, maxHp: 100 });
    new MaxPotion().onUse(mon, makeAction());
    expect(mon.currentHp).toBe(0);
  });

  test('message indicates full HP when already full', () => {
    const mon = makeMon({ currentHp: 100, maxHp: 100 });
    const result = new MaxPotion().onUse(mon, makeAction());
    expect(result.message).toContain('full');
  });
});
