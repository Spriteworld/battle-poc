import FullHeal from './FullHeal.js';
import { makeMon, makeAction, makeStatus } from './testHelpers.js';
import { STATUS } from '@spriteworld/pokemon-data';

describe('FullHeal', () => {
  test('getName returns "Full Heal"', () => {
    expect(new FullHeal().getName()).toBe('Full Heal');
  });

  test('clears any single status condition', () => {
    for (const key of Object.values(STATUS)) {
      const mon = makeMon({ status: makeStatus({ [key]: 1 }) });
      new FullHeal().onUse(mon, makeAction());
      expect(mon.status[key]).toBe(0);
    }
  });

  test('clears multiple simultaneous status conditions', () => {
    const mon = makeMon({
      status: makeStatus({ [STATUS.BURN]: 1, [STATUS.TOXIC]: 3 }),
      toxicCount: 3,
    });
    new FullHeal().onUse(mon, makeAction());
    expect(Object.values(mon.status).every(v => v === 0)).toBe(true);
    expect(mon.toxicCount).toBe(0);
  });

  test('returns success: false when no status condition', () => {
    const mon = makeMon();
    const result = new FullHeal().onUse(mon, makeAction());
    expect(result.success).toBe(false);
  });

  test('returns success: false on fainted pokemon', () => {
    const mon = makeMon({ currentHp: 0, status: makeStatus({ [STATUS.SLEEP]: 2 }) });
    const result = new FullHeal().onUse(mon, makeAction());
    expect(result.success).toBe(false);
    expect(mon.status[STATUS.SLEEP]).toBe(2);
  });

  test('does not alter HP', () => {
    const mon = makeMon({ currentHp: 40, maxHp: 100, status: makeStatus({ [STATUS.PARALYZE]: 1 }) });
    new FullHeal().onUse(mon, makeAction());
    expect(mon.currentHp).toBe(40);
  });

  test('message includes trainer and pokemon name', () => {
    const mon = makeMon({ status: makeStatus({ [STATUS.BURN]: 1 }) });
    const result = new FullHeal().onUse(mon, makeAction('Red'));
    expect(result.message).toContain('Red');
    expect(result.message).toContain('Bulbasaur');
  });
});
