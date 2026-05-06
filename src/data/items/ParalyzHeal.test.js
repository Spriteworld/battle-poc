import ParalyzHeal from './ParalyzHeal.js';
import { makeMon, makeAction, makeStatus } from './testHelpers.js';
import { STATUS } from '@spriteworld/pokemon-data';

describe('ParalyzHeal', () => {
  test('getName returns "Paralyz Heal"', () => {
    expect(new ParalyzHeal().getName()).toBe('Paralyz Heal');
  });

  test('cures paralysis', () => {
    const mon = makeMon({ status: makeStatus({ [STATUS.PARALYZE]: 1 }) });
    new ParalyzHeal().onUse(mon, makeAction());
    expect(mon.status[STATUS.PARALYZE]).toBe(0);
  });

  test('returns success: false when not paralyzed', () => {
    const mon = makeMon();
    const result = new ParalyzHeal().onUse(mon, makeAction());
    expect(result.success).toBe(false);
  });

  test('returns success: false on fainted pokemon', () => {
    const mon = makeMon({ currentHp: 0, status: makeStatus({ [STATUS.PARALYZE]: 1 }) });
    const result = new ParalyzHeal().onUse(mon, makeAction());
    expect(result.success).toBe(false);
    expect(mon.status[STATUS.PARALYZE]).toBe(1);
  });

  test('message includes trainer and pokemon name', () => {
    const mon = makeMon({ status: makeStatus({ [STATUS.PARALYZE]: 1 }) });
    const result = new ParalyzHeal().onUse(mon, makeAction('Red'));
    expect(result.message).toContain('Red');
    expect(result.message).toContain('Bulbasaur');
  });
});
