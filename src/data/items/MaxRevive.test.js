import MaxRevive from './MaxRevive.js';
import { makeMon, makeAction } from './testHelpers.js';

describe('MaxRevive', () => {
  test('getName returns "Max Revive"', () => {
    expect(new MaxRevive().getName()).toBe('Max Revive');
  });

  test('revives a fainted pokemon to full HP', () => {
    const mon = makeMon({ currentHp: 0, maxHp: 100 });
    new MaxRevive().onUse(mon, makeAction());
    expect(mon.currentHp).toBe(100);
  });

  test('restores to exactly maxHp', () => {
    const mon = makeMon({ currentHp: 0, maxHp: 157 });
    new MaxRevive().onUse(mon, makeAction());
    expect(mon.currentHp).toBe(157);
  });

  test('returns success: false when pokemon is not fainted', () => {
    const mon = makeMon({ currentHp: 30, maxHp: 100 });
    const result = new MaxRevive().onUse(mon, makeAction());
    expect(result.success).toBe(false);
    expect(mon.currentHp).toBe(30);
  });

  test('message includes trainer name', () => {
    const mon = makeMon({ currentHp: 0, maxHp: 100 });
    const result = new MaxRevive().onUse(mon, makeAction('Blue'));
    expect(result.message).toContain('Blue');
    expect(result.message).toContain('Bulbasaur');
  });
});
