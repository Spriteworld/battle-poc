import IceHeal from './IceHeal.js';
import { makeMon, makeAction, makeStatus } from './testHelpers.js';
import { STATUS } from '@spriteworld/pokemon-data';

describe('IceHeal', () => {
  test('getName returns "Ice Heal"', () => {
    expect(new IceHeal().getName()).toBe('Ice Heal');
  });

  test('cures a freeze', () => {
    const mon = makeMon({ status: makeStatus({ [STATUS.FROZEN]: 1 }) });
    new IceHeal().onUse(mon, makeAction());
    expect(mon.status[STATUS.FROZEN]).toBe(0);
  });

  test('returns success: false when not frozen', () => {
    const mon = makeMon();
    const result = new IceHeal().onUse(mon, makeAction());
    expect(result.success).toBe(false);
  });

  test('returns success: false on fainted pokemon', () => {
    const mon = makeMon({ currentHp: 0, status: makeStatus({ [STATUS.FROZEN]: 1 }) });
    const result = new IceHeal().onUse(mon, makeAction());
    expect(result.success).toBe(false);
    expect(mon.status[STATUS.FROZEN]).toBe(1);
  });

  test('message includes trainer and pokemon name', () => {
    const mon = makeMon({ status: makeStatus({ [STATUS.FROZEN]: 1 }) });
    const result = new IceHeal().onUse(mon, makeAction('Red'));
    expect(result.message).toContain('Red');
    expect(result.message).toContain('Bulbasaur');
  });
});
