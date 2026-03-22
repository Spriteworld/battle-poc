import Revive from './Revive.js';
import { makeMon, makeAction } from './testHelpers.js';

describe('Revive', () => {
  test('getName returns "Revive"', () => {
    expect(new Revive().getName()).toBe('Revive');
  });

  test('revives a fainted pokemon to half maxHp', () => {
    const mon = makeMon({ currentHp: 0, maxHp: 100 });
    new Revive().onUse(mon, makeAction());
    expect(mon.currentHp).toBe(50);
  });

  test('floors the half-HP value', () => {
    const mon = makeMon({ currentHp: 0, maxHp: 101 });
    new Revive().onUse(mon, makeAction());
    expect(mon.currentHp).toBe(50);
  });

  test('does not revive a non-fainted pokemon', () => {
    const mon = makeMon({ currentHp: 30, maxHp: 100 });
    new Revive().onUse(mon, makeAction());
    expect(mon.currentHp).toBe(30);
  });

  test('returns a message when pokemon is not fainted', () => {
    const mon = makeMon({ currentHp: 30 });
    const result = new Revive().onUse(mon, makeAction());
    expect(result.message).toBeDefined();
  });
});
