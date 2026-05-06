import Potion from './Potion.js';
import { makeMon, makeAction } from './testHelpers.js';

describe('Potion', () => {
  test('getName returns "Potion"', () => {
    expect(new Potion().getName()).toBe('Potion');
  });

  test('restores up to 20 HP', () => {
    const mon = makeMon({ currentHp: 50, maxHp: 100 });
    new Potion().onUse(mon, makeAction());
    expect(mon.currentHp).toBe(70);
  });

  test('does not exceed maxHp', () => {
    const mon = makeMon({ currentHp: 95, maxHp: 100 });
    new Potion().onUse(mon, makeAction());
    expect(mon.currentHp).toBe(100);
  });

  test('returns null on a fainted pokemon', () => {
    const mon = makeMon({ currentHp: 0 });
    const result = new Potion().onUse(mon, makeAction());
    expect(result).toBeNull();
  });

  test('message includes the restored HP amount', () => {
    const mon = makeMon({ currentHp: 50, maxHp: 100 });
    const result = new Potion().onUse(mon, makeAction('Red'));
    expect(result.message).toContain('20');
    expect(result.message).toContain('Bulbasaur');
  });
});
